---
tags: [gardenburger, negocio, arqueo, estadisticas]
aliases: [Arqueo, F4, Resumen guardado, Metricas, Estadisticas]
actualizado: 2026-10-22
---

# Arqueo y estadísticas

↑ [[Reglas de negocio]]

El **arqueo** es el cierre de caja de una noche: cuánta plata entró, separada en efectivo y Mercado
Pago. **Se calcula sumando los pedidos entregados de la jornada; no se acumula.** Las Métricas y las
Estadísticas son el mismo cálculo, guardado por noche.

## El arqueo se calcula desde los pedidos

**Qué**: `calcularArqueo(pedidos)` (`pos_hooks/useResumenDiario.js`) es una función pura sobre los
pedidos de la jornada. `resumenDiario` dejó de ser un contador mantenido con `increment()` y pasó
a ser el **resumen guardado** de ese cálculo (26-09-2026). Hasta el 15-10-2026 se le decía "foto";
se renombró porque se confundía con las fotos de producto.

**Por qué**: `increment()` es atómico pero **no idempotente**, y obligaba a que cada camino que
tocaba un pedido —guardar, rechazar MP, eliminar, cerrar un delivery— moviera el arqueo con el
signo correcto y exactamente una vez. Si el número se desincronizaba no había forma de detectarlo
ni de arreglarlo: era un acumulado, no la verdad. Un valor **calculado** da lo mismo corra una vez
o tres. **Si un número está mal, es porque hay un pedido mal**, y eso se ve mirando los pedidos.
Con esto, eliminar un pedido volvió a ser cambiar un campo, y la carrera entre dos cajeros
descontando el mismo pedido desapareció por construcción.

**Verificado antes de reemplazar**: se comparó `calcularArqueo` contra una simulación del contador
viejo en 8 casos (mostrador y delivery en efectivo, MP, dividido, MP rechazado, eliminado, solicitud
nunca cobrada y solicitud rechazada): los 6 campos coincidieron. Se hizo antes de producción:
`resumenDiario` tenía 0 documentos reales, no hubo nada que migrar.

### Suman solo los pedidos entregados (15-10-2026)

Un pedido entra cuando tiene `cajeroID` (lo cobró un cajero) **y** está `ENTREGADO`
(`entraAlArqueo`). Hasta entonces alcanzaba con cobrado y no anulado, así que sumaban también los
que seguían en la cocina, esperando la transferencia o de vuelta sin entregar.

**Por qué**: el F4 tiene que decir la plata que ya está; un pedido cobrado que todavía no salió
puede terminar anulado. Lo cobrado sin entregar no se pierde: el F4 lo muestra **aparte**
("Cobrados todavía sin entregar: N pedidos, $X", `cobradosSinEntregar`). De paso, un viaje que
volvió sin entregar ya no infla la caja.

### Cómo se separa la plata

- **Efectivo local** (`efectivoLocal`): lo que se cobra en el mostrador, zonas de `ENVIOS_LOCALES`.
- **Efectivo envío** (`efectivoEnvio`): lo que vuelve con los repartidores. Son dos cajas distintas
  porque se cuentan por separado. Siempre `efectivoLocal + efectivoEnvio = totalEfectivo`.
- **Mercado Pago** (`mp`). En el pago dividido, `repartirPago` pone `montoEfectivo` en efectivo y
  `total − montoEfectivo` en MP (el recargo queda adentro de la parte de MP).
- **Combos**: unidades, con la regla de *Catálogo › Combos*.

Los anulados (`ELIMINADO`, `CANCELADO`) cobrados por un cajero se **cuentan** aparte, sin plata.

## El resumen guardado

El documento `sucursales/{id}/resumenDiario/{DD-MM-YYYY}` guarda el arqueo de una noche **cerrada**
para no releer sus pedidos. Sus campos: *Modelo de datos Firestore › sucursales/{id}/resumenDiario/{DD-MM-YYYY}*.
Las cuatro reglas (también en la cabecera de `useResumenDiario.js`):

| Situación | Qué hace `obtenerArqueo()` |
|---|---|
| Jornada **abierta** | calcula siempre y no guarda: todavía se mueve |
| Jornada **cerrada** sin resumen | calcula una vez y lo guarda, también si da cero |
| Jornada **cerrada** con resumen | usa ese. **Nunca** recalcula solo, salvo que cambie `VERSION_RESUMEN_DIARIO` |
| Alguien corrige **los hechos** | `actualizarPedidoYResumen()` escribe el pedido y borra el resumen de **su** noche en la misma escritura; el siguiente que la mire lo reconstruye |

La última va en un `writeBatch` desde el 15-10-2026: antes eran dos escrituras, y un corte entre
las dos dejaba el pedido corregido con el resumen viejo, sin aviso. La usan todos los caminos que
cambian lo que cuenta el arqueo: entregar (ATP, Deliverys), anular (F3, Historial), rechazar un MP,
cerrar un viaje y restaurar. `guardarBD` no la necesita: un pedido nuevo nace en la jornada en
curso. **Nunca `updateDoc` sobre `resumenDiario`**: falla si el documento no existe; se escribe con
`setDoc`.

### Lo que se congela en el pedido

**Cambiar código no regenera nada.** Si se agrega una categoría a `CATEGORIAS_COMBOS`, los
resúmenes viejos siguen como están: agosto tiene que seguir diciendo lo que era cierto en agosto
(regla del dueño: *"modificar registros históricos NO"*). Y para que un resumen dé lo mismo lo arme
quien lo arme y cuando sea, lo que depende de reglas que cambian **se congela en el pedido al
cobrarlo**: `combos`, `esLocal` y el costo del envío. Es el mismo criterio que el `valorHora` en
asistencias.

### Versionado

Si las estadísticas necesitan un campo nuevo, se agrega en `calcularArqueo` y se sube
`VERSION_RESUMEN_DIARIO`: los resúmenes viejos se reconstruyen solos la próxima vez que alguien los
mira. Si cambia el **significado** de un campo, también se sube. Pasó en la **v2 (15-10-2026)**,
cuando pasaron a sumar solo los entregados: cada noche guardada se recalcula **una vez** al mirarla
(~60-100 lecturas por noche y sucursal; abrir "Mes pasado" de las dos sucursales la primera vez son
~3.600-6.000). Después vuelve a ser 1 lectura por noche.

### Por qué guardarlo, con números

Con los volúmenes estimados (davinci ~60 pedidos por noche, pico de 101; 2 arqueos por noche y ~5
vistas de dashboard por día):

| Modalidad | Lecturas/día | 90 días de histórico |
|---|---|---|
| Contador con `increment()` | ~314 (+125 escrituras) | 1 lectura por día y sucursal |
| Calcular siempre, sin guardar | ~12.560 (25% de la cuota) | ~36.560 (73%) — **descartada** |
| **Resumen guardado (elegida)** | ~940 (1,9%) | 1 lectura por día y sucursal |

La cuota gratuita es de 50.000 lecturas por día; las tres entraban. Decidió que "calcular siempre"
hacía inviable mirar el histórico de varias sucursales.

## Quién mira el arqueo, y cuándo

**El F4 de la Caja es del encargado y de la madrugada**: solo se le muestra a quien tenga rol
encargado, y solo se habilita de **`HORA_HABILITA_STATS` (00:00) a `horaCierre` (02:00)**, igual en
todas las sucursales. Antes, el turno sigue vendiendo; después, la jornada ya es otra.

No es solo una regla de negocio: el arqueo de la noche abierta cuesta **leer sus pedidos** (~60-100
lecturas) más la asistencia (1), y la ventana evita pagarlo por curiosidad a las 21. La hora es una
constante y no el cierre de cada sucursal por decisión del dueño (28-09-2026): atarla al horario de
la sucursal obligaba a la Caja a leerlo.

- La condición es `esHoraDeArqueo()`; el botón la mira con `useHoraDeArqueo` y **el guard real
  está en `verResumen`**, que relee la hora al momento (el atajo F4 llama la función directo).
- **El botón se resincroniza cada 60 s**, no con un timeout: cuando la Caja monta, `ahoraServidor()`
  puede no estar sincronizado todavía, y un timeout calculado con el reloj torcido dispararía a
  la hora equivocada. El tick no usa red; medido en un turno de 20 h: 1.200 ticks, 2 repintados.
- Lo que muestra el F4, además del arqueo: *Encargado › El cierre de la noche: el F4*.

## Métricas y Estadísticas

Las pantallas de varios días **leen el resumen guardado de cada noche** (`obtenerResumenes`), no los
pedidos. Las noches sin resumen se calculan una vez —una consulta por tanda de noches seguidas— y
se guardan. La noche en curso no tiene resumen: si el período llega a hoy, se calcula en el momento
sin guardarla (lo mismo que un F4). Un mes de 2 sucursales son ~44 lecturas con resúmenes contra
~2.000-2.400 con pedidos; un año, ~520 contra ~25.000.

- **Métricas** (`/metricas`, admin): el vistazo rápido, pensado para el celular. Botones de
  sucursal (Todas o una) y de período (Hoy, Ayer, semana actual y pasada, mes actual y pasado);
  con los dos elegidos busca sola. Combos, ventas, pedidos, delivery vs mostrador y top 3 de combos.
  Al entrar no lee nada.
- **Estadísticas Actuales** (`/estadisticas`, el componente `EstadisticasGenerales`): lo completo
  del sistema nuevo, con filtros Mes / Año / Rango y la evolución anual. Las cuentas están en
  `Estadisticas/Generales/calculos.js` (puro, con tests): las noches se cuentan distintas (con
  "Todas" viene una por sucursal) y "bebidas" es solo la categoría `BEBIDAS`. En el menú figuran
  como "Actuales"; hasta el 22-10-2026 se llamaban "Generales".

### Estadísticas Históricas: los TSV del sistema viejo

`/estadisticas-viejas` (componente `Estadisticas`, en el menú "Históricas") **no lee Firestore**: lee
`ventas.tsv` y `pagos.tsv`, exportados **a mano** del sistema viejo y subidos por el admin a
`privado/estadisticas/` de Storage. Se queda: el sistema nuevo no lo reemplaza. **No se toca**
(decisión del dueño, auditoría 11-10-2026).

- **Un export incompleto falsea Combos y Stock sin dar ningún error.** Si los números no cierran,
  la primera pregunta es cuándo se exportó.
- Su `fmtN` **no tiene guarda `|| 0` a propósito**: un dato faltante se ve como `NaN` en vez de
  pasar por un 0 legítimo. No unificarlo con `fmtPesos`.
- Tiene su propia etiqueta de pago ("Mixto"): lee datos del sistema viejo.
- Por qué los TSV están en Storage y no en `public/`: *Storage › Los TSV de Estadísticas, en una carpeta privada*.

---
tags: [gardenburger, deuda, auditoria]
aliases: [Pendientes, Que falta]
actualizado: 2026-09-26
---

# Deuda técnica

← [[GardenBurger]]

Estado al **26-09-2026**. Las dos auditorías integrales están procesadas: la
[[Auditoria 2026-09|del 09-09]] (11 hallazgos) y la [[Auditoria 2026-09-15|del 15-09]] (23). Lo que
sigue es lo que queda abierto **por decisión**, con el motivo, para que nadie lo "arregle" sin
saberlo.

> [!info] Cómo leer esta nota
> Si un hallazgo no figura acá, está corregido. El detalle de cada uno —evidencia, impacto, cómo se
> cerró— está en la auditoría que lo encontró.

## Cerrado por decisión, no por código

Cosas que las auditorías marcaron y el dueño decidió dejar como están. **No son olvidos.**

- **`horaServidor` sin App Check.** Es una callable pública: cualquiera la invoca y cada invocación
  se factura. Se descartó cerrarla porque devuelve solo `Date.now()` —no expone nada— y esa llamada
  tiene que ser lo más rápida posible. El dato técnico, por si se reconsidera: no agregaría latencia
  real, porque cuando corre el token de App Check ya está emitido por la lectura de Firestore del
  login.

- **Cocina marca todos los pedidos juntos** (hallazgo 8). "Cocinados TODOS" es el único botón, a
  propósito: en la práctica los pedidos de un cocinero salen juntos. Cada cocinero ve solo los suyos
  (`where cocineroID`), así que "todos" nunca pisa el trabajo de otro.
- **El horario especial ofrece 20–23**, aunque el local abre a las 19. Nadie encarga para las
  19:xx. Las opciones están hardcodeadas en `Caja.jsx`; si algún día cambia, generarlas desde
  `HORARIO.horaAbre`.
- **Re-precificar en silencio** al Revisar una solicitud web, sin avisar al cajero. El cliente ve
  el total definitivo en `/ver-pedido` y en el ticket.
- **El fijo de los repartidores y el recargo de MP son constantes del `.env`**
  (`REACT_APP_fijoDeliverys`, `REACT_APP_recargoMP`). Cambiarlos es un build y un deploy, y el dueño
  lo prefiere así antes que editarlos desde el admin (26-09-2026).
- **`usuarios` es legible por todo el staff**, con `valorHora` y DNI incluidos. Los usuarios
  internos no son la preocupación, y el externo no puede leerla (la regla exige sesión). Separar
  esos campos costaría lecturas extra al cargar asistencias (26-09-2026).
- **Un repartidor que cobra fijo más envíos va con `valorHora` en 0.** La carga de asistencias lo
  incluye igual —sirve para registrar quién vino—, y con valor hora 0 la liquidación de asistencias
  no le paga horas encima. Es configuración del alta, no código (26-09-2026).
- **La creación pública de solicitudes usa lista negra, no blanca.** Una lista blanca (`hasOnly`)
  obliga a tocar la regla cada vez que la web agrega un campo, y el dueño no quiere mantenerla.
  Queda el riesgo de que alguien arme a mano una solicitud con `cajeroRevisaID` y nazca trabada:
  se rechaza desde F1 (26-09-2026).
- **El horario de la web se controla solo en el front.** Cerrarlo en las reglas obligaría a
  repetir días y horas en `firestore.rules`, en UTC. Una solicitud armada a mano fuera de horario
  aparece pendiente la noche siguiente y se rechaza (26-09-2026).

- **Sin vuelto en la Caja.** Los vueltos son cosa del Jefe de Deliverys, que ve "Paga con" y "Vuelto
  a llevar" en cada pedido (26-09-2026).

## Abierto por decisión

### `asistencias` abierta en reglas, cerrada solo por front

Cae bajo el wildcard `match /{coleccion}/{documento}` de `sucursales`, así que **cualquier staff
autenticado puede leer y escribir los sueldos** desde la consola del navegador. La barrera real es
el front: la ruta `/asistencias` solo la ve el encargado y `/liquidacion` solo el admin.

**Es una decisión, no un olvido.** Se evaluó cerrarla con un claim `encargado` —ahora que los
custom claims hacen gratis una regla por rol— y el dueño la descartó.

Si algún día se reconsidera: hace falta el claim `encargado` repartido por `sincronizarClaims`, y
**excluir `asistencias` del wildcard** como se hace con `pedidos` — las reglas se combinan con OR,
así que agregar una regla más específica no restringe nada.

### El pipeline no valida transiciones de estado

Ninguna escritura verifica el `estado` de origen, y la regla de `update` solo valida la asignación
(`asignacionValida()`), no el estado. Los dos casos concretos que esto habilitaba —eliminar un
`CANCELADO` y cocinar un `ELIMINADO`— se cerraron por front el 14-09-2026, pero la causa estructural
sigue: un pedido `ENTREGADO` se puede eliminar y dos pantallas pueden pisarse. Cerrarlo por reglas
es gratis en lecturas pero toca todas las escrituras del pedido. Ver
[[Modelo de estados#Transiciones que el sistema permite y no debería]].

**Eliminar un `ENTREGADO` sale del arqueo, y es correcto**: es la anulación de una venta. El
pedido queda en `ELIMINADO` y `calcularArqueo` lo saltea, en su jornada y no en la de hoy.

> [!success] La carrera entre dos cajeros sobre el arqueo dejó de existir (26-09-2026)
> Era el riesgo más citado de esta nota: dos cajeros descontando el mismo pedido con ~200 ms de
> diferencia duplicaban el movimiento, porque `increment()` no es idempotente. Ya no hay
> contador que duplicar —el arqueo se calcula desde los pedidos— así que la carrera se cerró por
> construcción, no por un guard. Ver
> [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].
>
> Queda en pie lo estructural de arriba: dos pantallas todavía pueden pisarse el `estado` de un
> pedido. Lo que cambió es que eso ya no descuadra la plata, solo el estado.

### Sobre CRA

`react-scripts` está discontinuado y origina la mayoría de las 83 vulnerabilidades de `npm audit`
—todas de herramientas de build, ninguna llega al navegador—. Migrar a Vite es un proyecto en sí
mismo y **no se recomienda ahora**: no hay riesgo real en producción. El code splitting por ruta ya
se hizo sobre CRA (14-09-2026) sin necesitar la migración.

## Riesgos latentes (no son bugs hoy)

- **Divergencia de combos.** `contarCombos` compara la descripción del producto **textual** contra
  `CATEGORIAS_COMBOS.excludes`, mientras `esComboConta` en Estadísticas normaliza la categoría
  porque los TSV vienen sucios. Si la descripción difiere entre Firestore y el export, la
  exclusión aplica de un lado y del otro no, y los dos conteos se separan sin avisar.
- **Estadísticas depende de TSV exportados a mano**, que el admin sube a `privado/estadisticas/` de
  Storage desde la Consola. Un export incompleto de Ventas falsea Combos y Stock. Su `fmtN` **no**
  tiene guarda `|| 0` a propósito, para que un dato faltante se vea como `NaN` en pantalla en vez
  de pasar por un `0` legítimo — no "arreglarlo" unificándolo con
  [[Convenciones y preferencias|fmtPesos]].

## Deuda de mantenibilidad (sin urgencia)

- **`Caja.jsx` (779 líneas)** — ya extrajo nueve hooks, que era lo importante. Lo que queda por
  separar es el **render**: el panel de productos y el ticket son dos componentes conviviendo en un
  archivo.
- **`CartContext.jsx` (582 líneas)** — 20 `useState`, once de los cuales son en realidad una máquina
  de estados de modales. Caso de manual para un `useReducer`: hoy no se puede razonar sobre qué
  combinaciones de esos once estados son válidas.

## Funcionalidad pendiente

### Estadísticas Generales (sistema nuevo) — especificada, sin implementar

Las estadísticas **completas** del sistema nuevo, al estilo de `/estadisticas-viejas` (el Histórico),
pero leyendo las **fotos** de cada noche en vez de los TSV. Métricas (`/metricas`) es solo el vistazo
rápido; esto es lo detallado. Se especificó el 26-09-2026 y quedó para la próxima sesión.

- **Ruta** `/estadisticas`, solo admin (`RequireAdmin`), lazy. En el menú, el grupo Estadísticas
  pasa a tener dos opciones: **Generales** (esta) e **Histórico** (la de los TSV).
- **Datos:** `obtenerResumenes(desde, hasta, sucursal)` y `sumarResumenes()` de
  `useResumenDiario.js`, que **ya existen** y están verificados. La foto v1 ya guarda todo lo que
  hace falta (ver [[Modelo de datos Firestore]]). No hay que agregar campos.
- **Filtros:** sucursal (Todas o una) y modo **Mes / Año / Rango** de días. Sin filtro de horas
  (casi no se usa); si algún día hace falta, `porHora` ya tiene las cifras principales por hora.
  Botón **Ver**: al entrar no se lee nada.
- **Tarjetas** (las del Histórico): Total tickets (válidos, eliminados, cancelados), Efectivo en
  caja (mostrador / delivery), MercadoPago (% de pedidos), Total facturado (ticket promedio),
  Stock vendido (`unidades`, ítems por ticket), Combos, Delivery % (`porCanal`), Con observaciones.
- **Secciones:** Delivery vs Mostrador · Métodos de pago (`porMetodo`, etiqueta con
  `METODOS_PAGO[k].label`) · Ventas por categoría (sumar `productos` por `categoria`) · Zonas
  (`porZona`, % por resto mayor como el Histórico) · Top 10 productos (`productos` sin
  `BEBIDAS`) · Top 10 clientes (`porCliente`: **solo nombre y pedidos**, nunca el teléfono) · Top 10
  bebidas · Día de la semana (el día de cada foto × su `totalPedidos`) · Franja horaria
  (`porHora`, ordenada desde `horaAbre`) · Stock de artículos y de bebidas (lista completa, de a 25).
- **Evolución histórica anual:** con **botón propio**, para no leer todo cada vez que cambia un
  filtro. Rango: de `primeraJornadaConPedidos(sucursal)` hasta ayer. Series por año, por mes, con
  pestañas Combos / Tickets / Monto, igual que el Histórico. Cuesta 1 lectura por noche y sucursal
  (~520 por año con 2 sucursales).
- **Reusar lo visual del Histórico:** mover `KpiCard`, `BarChart` y `Section` de
  `Historico/Estadisticas.jsx` a un `Estadisticas/componentes.jsx` compartido, e importar
  `Historico/Estadisticas.css`. El Histórico no cambia de comportamiento. Montos con `fmtPesos`
  (la excepción `fmt$`/`fmtN` sin guarda es solo del Histórico).

### Eliminar pedidos desde el Historial (solo admin)

El admin puede **eliminar** —no editar— cualquier pedido de cualquier fecha desde el Historial. El
encargado ya lo hace desde F3, pero solo en la jornada. Botón en la columna de acciones, solo si
el pedido no está `ELIMINADO` ni `CANCELADO`; `Swal` de confirmación; `updateDoc` con
`docDeSucursal(sucursal, "pedidos", id)` (el admin no tiene sucursal propia) marcando `ELIMINADO` y
`cajeroElimina*`; después `invalidarFotoDePedido(pedido, sucursal)`, para que Métricas y
Estadísticas recalculen esa noche. Con `useAccionUnica`. Decidido el 26-09-2026.

### CRM de clientes

El módulo Clientes (ya solo del admin) tendrá su propio CRM. Sin diseñar.

### Solicitudes web trabadas

Pasa cuando un cajero toma una solicitud ("Revisar") y no la termina: se le reinicia la PC, se
va o cierra el navegador. Las otras cajas la ven "Asignada a …" y no pueden tomarla. **Propuesta**
(26-09-2026): guardar `cajeroRevisaTimestamp` al tomarla y que la regla `asignacionValida()` deje
tomarla a cualquiera pasados ~15 minutos. No depende del rol —las reglas no saben quién es el
encargado— y no cuesta lecturas. Sin implementar.

### Por confirmar: ¿se paga el envío de una entrega anulada?

Dos casos que hoy se comportan distinto: anulada **después** de que el repartidor volvió, se paga;
anulada **mientras está en la calle**, no se paga (sale del listener del jefe y nunca llega a
`VOLVIO`). El dueño va a averiguar qué corresponde; si cambia, es una línea en `liquidarDeliverys()`.

### Para el final

El menú público (`/menu`) y el ticket impreso.

## Sin tests

**No hay un solo test automatizado**, y la verificación del proyecto es manual por decisión del
dueño. La lógica pura se verifica a mano con casos cada vez que se toca:

- `calcularHoras` — el cruce de medianoche (19:00 → 02:00 = 7 h, no −17).
- `agregarLiquidacion` — el bruto acumulado día por día, no `horasTotales × unValorHora`.
- **`calcularArqueo`** — es la función más cara de equivocar del sistema. Al reemplazar el contador
  (26-09-2026) se comparó contra una simulación de la secuencia de `increment()` vieja en 8 casos:
  los 6 campos coinciden en los 8. Si se le agrega un campo, se repite el ejercicio.
- `contarCombos`, `getCurrentStepIndex`, `getItemsCocina`, `getJornadaDeFecha` /
  `getRangoDeJornada` / `getFechaComercial`, `validarPedido`.

Vale una anotación de la auditoría: los hallazgos 3, 4 y 5 son de la clase que **un test detecta y
una prueba manual no**, porque dependen de secuencias improbables o de dos usuarios simultáneos. Si
alguna vez se agrega una sola batería, el mejor retorno está en `useCarrito`, `validarPedido` y
`calcularHoras`: son puras, no necesitan Firebase, y son donde un error cuesta plata.

## Lo que se revisó y está bien

Para no re-auditar al pedo: los `onSnapshot` devuelven **todos** su `unsubscribe`; los `useRef` de
queries evitan recrear referencias; la numeración de tickets es atómica con el pedido y el arqueo;
`fetchMenuPublico` cachea la promesa; **no existe ningún patrón N+1**; no hay código muerto; no
sobra ninguna dependencia; y `menu.json` con `max-age=60` está bien calibrado (se verificó que
revalida con 304 y cuerpo vacío).

El modelo de asignación de `PendientesSolicitudes` **ahora sí está cerrado**: la auditoría de
septiembre encontró una ventana de carrera (el chequeo iba contra el snapshot local y la escritura
no tenía condición) y desde el 14-09-2026 la regla `asignacionValida()` la rechaza del lado del
servidor, sin lecturas.

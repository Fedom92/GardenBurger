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

- **Dashboard cross-sucursal del sistema nuevo**, sobre los datos de Firestore: `resumenDiario` de
  todas las sucursales, para el admin. Es lo único que falta del lado de estadísticas.

  > [!important] No reemplaza a `/estadisticas-viejas`
  > Esa pantalla es el **histórico del sistema anterior** y se queda como está, permanentemente:
  > lee los TSV exportados a mano de `privado/estadisticas` en Storage. Son dos cosas separadas y
  > ninguna sustituye a la otra.
- **Por confirmar: ¿se paga el envío de una entrega anulada?** Son dos casos y hoy se comportan
  distinto: si se anula **después** de que el repartidor volvió, se paga (la liquidación cuenta
  toda entrega cerrada); si se anula **mientras está en la calle**, no se paga (el pedido sale del
  listener del jefe y nunca llega a `VOLVIO`). En los dos el viaje se hizo. El dueño va a
  averiguar qué corresponde; si cambia, es una línea en `liquidarDeliverys()`.
- **Mostrar el vuelto en la Caja.** Se exige `pagaCon >= total` pero nunca se muestra la resta; el
  cajero la hace de cabeza. Sale de datos que ya están en memoria, sin lecturas. Quedó propuesto
  en el rediseño de la Caja y sin decidir: [[Decisiones tecnicas#Pendiente]].
- **Gestionar pedidos y arqueos de otras jornadas (encargado y admin).** F3 es la herramienta del
  cajero y se queda acotada a la jornada en curso, a propósito; F4 además solo se habilita entre
  las 00:00 y `horaCierre`. Eliminar o corregir un pedido de otra fecha —y **mirar el arqueo de una
  noche que no se cerró a tiempo**— va en una pantalla propia, todavía sin desarrollar. Casi todo
  el trabajo ya está hecho: `obtenerArqueo(jornada, sucursal)` acepta cualquier jornada y cualquier
  sucursal, y una jornada cerrada con foto cuesta **1 lectura**.
- **Liberar solicitudes trabadas desde `HistorialPedidos` (solo admin).** Una solicitud web
  asignada a un cajero que terminó el turno queda sin dueño activo y nadie puede tomarla. Decidido
  el 14-09-2026: lo destraba el admin, no el encargado. Para implementarlo, dos cosas que no son
  obvias: (1) las `PENDIENTE` **no tienen `timestamp`** hasta que la Caja las guarda, así que no
  aparecen en la consulta por rango del Historial — hace falta una consulta aparte por
  `estado == PENDIENTE` filtrando `cajeroRevisaID` en el cliente; (2) la regla
  `asignacionValida()` rechaza que alguien que no es el dueño borre `cajeroRevisaID`: necesita
  `|| esAdmin()`.

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

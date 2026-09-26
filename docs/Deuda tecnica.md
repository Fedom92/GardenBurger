---
tags: [gardenburger, deuda, auditoria]
aliases: [Pendientes, Que falta]
actualizado: 2026-09-23
---

# Deuda técnica

← [[GardenBurger]]

Estado al **24-09-2026**. Las dos auditorías integrales están procesadas: la
[[Auditoria 2026-09|del 09-09]] (11 hallazgos) y la [[Auditoria 2026-09-15|del 15-09]] (23). Lo que
sigue es lo que queda abierto **por decisión**, con el motivo, para que nadie lo "arregle" sin
saberlo.

> [!info] Cómo leer esta nota
> Si un hallazgo no figura acá, está corregido. El detalle de cada uno —evidencia, impacto, cómo se
> cerró— está en la auditoría que lo encontró.

## Postergado: dos componentes que se rehacen

- **Métricas de delivery** (`ModalMetricasDelivery.jsx`). Hoy `totalMonto` acumula el total del
  pedido sin mirar el método de pago, así que un delivery cobrado por MP aparece como un faltante
  en rojo: el repartidor nunca tuvo que traer esa plata. **El componente se rehará de cero**, así
  que no se parchea —ni siquiera con `fmtPesos`—. Ver
  [[Auditoria 2026-09-15#3 · P2 · Las métricas de delivery mienten para MP y pago dividido]].

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
  `REACT_APP_horaAbre`.
- **Sin marca `arqueoAplicado` en el pedido.** Se evaluó un booleano que hiciera idempotentes los
  caminos que revierten el arqueo. Se descartó por simplicidad: el caso real (eliminar un
  `CANCELADO`) se cerró ocultando el botón, y los otros dos hallazgos de dinero tenían causas
  distintas — uno era validación, el otro se cerró por regla. Si aparece un camino nuevo que
  revierta dos veces, la marca sigue siendo la opción.
- **Re-precificar en silencio** al Revisar una solicitud web, sin avisar al cajero. El cliente ve
  el total definitivo en `/ver-pedido` y en el ticket.

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

**Eliminar un `ENTREGADO` sí descuenta, y es correcto**: es la anulación de una venta. Desde el
24-09-2026 el descuento además va a la jornada del pedido y no a la de hoy.

### Concurrencia entre dos cajeros sobre el arqueo

`useAccionUnica` cubre el doble click de **una** persona. Dos cajeros distintos descontando el
mismo pedido con ~200 ms de diferencia siguen pudiendo duplicar el movimiento.
Ver [[Decisiones tecnicas#Sin `runTransaction` para el arqueo]].

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

- **`Caja.jsx` (752 líneas)** — ya extrajo nueve hooks, que era lo importante. Lo que queda por
  separar es el **render**: el panel de productos y el ticket son dos componentes conviviendo en un
  archivo.
- **`CartContext.jsx` (608 líneas)** — 20 `useState`, once de los cuales son en realidad una máquina
  de estados de modales. Caso de manual para un `useReducer`: hoy no se puede razonar sobre qué
  combinaciones de esos once estados son válidas.

## Funcionalidad pendiente

- **Dashboard cross-sucursal del sistema nuevo**, sobre los datos de Firestore: `resumenDiario` de
  todas las sucursales, para el admin. Es lo único que falta del lado de estadísticas.

  > [!important] No reemplaza a `/estadisticas-viejas`
  > Esa pantalla es el **histórico del sistema anterior** y se queda como está, permanentemente:
  > lee los TSV exportados a mano de `privado/estadisticas` en Storage. Son dos cosas separadas y
  > ninguna sustituye a la otra.
- **Mostrar el vuelto en la Caja.** Se exige `pagaCon >= total` pero nunca se muestra la resta; el
  cajero la hace de cabeza. Sale de datos que ya están en memoria, sin lecturas. Quedó propuesto
  en el rediseño de la Caja y sin decidir: [[Decisiones tecnicas#Pendiente]].
- **Gestionar pedidos de otras jornadas (encargado y admin).** F3 es la herramienta del cajero y se
  queda acotada a la jornada en curso, a propósito. Eliminar o corregir un pedido de otra fecha va
  en una pantalla propia, todavía sin desarrollar. La mitad del trabajo ya está hecha: el arqueo
  descuenta de la jornada del pedido, así que esa pantalla no tiene que acordarse de nada.
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
- `contarCombos`, `getResumenOperation`, `getCurrentStepIndex`, `getItemsCocina`,
  `getJornadaDeFecha` / `getRangoJornada` / `getFechaComercial`, `validarPedido`.

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

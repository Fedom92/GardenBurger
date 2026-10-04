---
tags: [gardenburger, deuda, auditoria]
aliases: [Pendientes, Que falta]
actualizado: 2026-10-03
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
- **El recargo de MP es una constante del `.env`** (`REACT_APP_recargoMP`). Cambiarlo es un build
  y un deploy, y el dueño lo prefiere así antes que editarlo desde el admin (26-09-2026). El fijo
  de los repartidores, que iba igual, dejó de existir el 28-09-2026.
- **`usuarios` es legible por todo el staff**, con `valorHora` y DNI incluidos. Los usuarios
  internos no son la preocupación, y el externo no puede leerla (la regla exige sesión). Separar
  esos campos costaría lecturas extra al cargar asistencias (26-09-2026).
- **El repartidor cobra como cualquier empleado, más sus envíos** (28-09-2026): `horas ×
  valorHora − descuentos` de su asistencia, más el envío de cada viaje. No hay fijo: llegar tarde
  es un descuento. Le paga el encargado cada noche, con el F4. Ver
  [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].
- **Un viaje se paga siempre, se haya entregado o no** (28-09-2026): si el cliente canceló o no
  se encontró la dirección, el viaje se hizo. Cerró el "Por confirmar" que había quedado abierto.
- **El F4 se habilita a la misma hora en todas las sucursales** (`HORA_HABILITA_STATS`, 00:00),
  no una hora antes del cierre de cada una: eso obligaba a la Caja a leer su sucursal (28-09-2026).
- **La creación pública de solicitudes usa lista negra, no blanca.** Una lista blanca (`hasOnly`)
  obliga a tocar la regla cada vez que la web agrega un campo, y el dueño no quiere mantenerla.
  Una solicitud armada a mano con `cajeroRevisaID` ya no nace trabada: sin hora de toma cuenta
  como vencida y cualquier cajero la toma (03-10-2026).
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

`react-scripts` está discontinuado y origina la mayoría de las ~80 vulnerabilidades de `npm audit`
—todas de herramientas de build, ninguna llega al navegador—. Migrar a Vite es un proyecto en sí
mismo y **no se recomienda ahora**: no hay riesgo real en producción. El code splitting por ruta ya
se hizo sobre CRA (14-09-2026) sin necesitar la migración.

> [!danger] No correr `npm update` a secas
> Actualiza **todo el árbol**, incluidas las dependencias internas de CRA, y CRA ya no se mantiene.
> El 04-10-2026 subió TypeScript de 4.9 a 7, que no tiene la API que usa el ESLint de CRA: el lint
> (y con él `npm start` y el build) dejó de funcionar. Se actualiza **paquete por paquete**,
> cambiando la versión en `package.json` y corriendo `npm install`, que deja el resto del árbol como
> está en `package-lock.json`.

#### Todo a la última versión, antes de producción (04-10-2026)

Se actualizó todo el front sobre CRA 5, revisando el changelog de cada paquete contra lo que la
app usa:

| Paquete | De → a | Qué hubo que tocar |
|---|---|---|
| `firebase` | 9.23 → 12.19 | Nada por la versión. Aparte, Auth pasó a `initializeAuth` (ver [[Decisiones tecnicas#Auth con initializeAuth, sin iframe]]) |
| `react` / `react-dom` | 18.2 → 19.3 | Nada: la app ya usaba `createRoot` y ninguna API que la 19 quitó (`findDOMNode`, `defaultProps` en funciones, refs de texto). react-bootstrap 2.10 pasa `nodeRef` a sus transiciones y lee los refs según la versión de React, así que tampoco depende de lo quitado |
| `react-router-dom` | 6.14 → 7.18 | Nada: la app usa `BrowserRouter` (no las APIs de datos) y no tiene rutas comodín ni links relativos, que son lo único que cambia de comportamiento |
| `@tanstack/react-table` | 8 → 9 | `TablaGenerica` —el único archivo que la importa— migró a `useTable` + `tableFeatures`. Las columnas de las pantallas no cambian |
| `react-icons` | 4 → 5 | Nada: los 20 íconos de `react-icons/fa` que se usan siguen existiendo |
| `html2pdf.js` | 0.12 → 0.14 | Nada. Trae jspdf 4, que **cierra el advisory crítico** de jspdf |
| resto | — | Última versión de su mayor: react-hook-form, recharts, sweetalert2, moment, react-toastify |
| `functions/`: `firebase-admin` | 13 → 14 | La 14 quitó `import * as admin`: cada servicio sale de su entrada (`firebase-admin/app`, `/auth`, `/firestore`). Unas 13 líneas, la lógica igual. Los códigos de error que se chequean (`auth/user-not-found`, `auth/email-already-exists`) no cambiaron. Pide Node 22+, y las funciones corren en 24 |
| `functions/`: `firebase-functions` / `typescript` | 7.2 → 7.4 / 6 → 7 | Nada: compila igual con TypeScript 7. Se sacó `firebase-functions-test`, que venía de la plantilla de `firebase init`, no tenía tests y no acepta admin 14 |

> [!warning] react-table v9 registra solo lo que se le pide
> Una API "que no existe" casi siempre es una feature sin registrar en `FEATURES` de
> `TablaGenerica`, no algo que la v9 sacó: `row.getVisibleCells()`, por ejemplo, es de
> `columnVisibilityFeature` (por eso se usa `getAllCells()`). Y los `sortFns` del orden automático
> también se registran: sin ellos toda columna ordena con el criterio básico.

CRA (`react-scripts` 5.0.1) sigue siendo el techo: no hay versión nueva. Lo verificable sin build
se verificó (imports contra los paquetes instalados, resolución de los paquetes solo-ESM como la
hace webpack, `TablaGenerica` renderizada con React 19), y el dueño lo probó en pantalla con
`npm start` y `npm run build`: tablas, navegación, modales, login y exportar a PDF, todo OK.

## Riesgos latentes (no son bugs hoy)

- **Un viaje "sin entregar" suma al arqueo hasta que el encargado lo anula.** La jefa cierra el
  viaje, pero anular es del encargado (F3). El F4 lo avisa y la jefa lo sigue viendo en rojo en su
  lista, así que no pasa desapercibido; si nadie lo anula, la caja muestra de más.
- **Divergencia de combos.** `contarCombos` compara la descripción del producto **textual** contra
  `CATEGORIAS_COMBOS.excludes`, mientras `esComboConta` en Estadísticas normaliza la categoría
  porque los TSV vienen sucios. Si la descripción difiere entre Firestore y el export, la
  exclusión aplica de un lado y del otro no, y los dos conteos se separan sin avisar.
- **Estadísticas depende de TSV exportados a mano**, que el admin sube a `privado/estadisticas/` de
  Storage desde la Consola. Un export incompleto de Ventas falsea Combos y Stock. Su `fmtN` **no**
  tiene guarda `|| 0` a propósito, para que un dato faltante se vea como `NaN` en pantalla en vez
  de pasar por un `0` legítimo — no "arreglarlo" unificándolo con
  [[Convenciones y preferencias|fmtPesos]].

- **El modo "Link URL" de las fotos acepta cualquier dirección.** Un link de Google Drive anda un
  rato y después Google responde **429** y la foto no carga, en la Caja y en la web. Se decidió
  no rechazarlos (28-09-2026): la salida es "Subir archivo". Ver
  [[Decisiones tecnicas#Las fotos de producto se achican en el navegador]].

## Deuda de mantenibilidad (sin urgencia)

- **`Caja.jsx` (779 líneas)** — ya extrajo nueve hooks, que era lo importante. Lo que queda por
  separar es el **render**: el panel de productos y el ticket son dos componentes conviviendo en un
  archivo.
- **La web pública entera** (`Solicitudes/` + `CartContext.jsx`) — código heredado: `CartContext`
  tiene 16 `useState`, nueve de los cuales son una máquina de estados de modales, y expone 49 cosas
  de las que 13 nadie usa. Está anotada para rehacer al 100% (abajo, en **A futuro**). El análisis
  completo, con los bugs conocidos, está en [[Web publica]].

## Funcionalidad pendiente

### A futuro

- **Rehacer la web pública al 100%.** `Solicitudes/` y `CartContext.jsx` los escribió otro
  desarrollador (`PaginaDetalle` lo mejoramos un poco; `SeleccionSucursal` y `WebCerrada` los
  hicimos nosotros sobre sus ejemplos). Funciona, pero la lógica no convence, está poco
  modularizada, el front es pobre y de ahí salen los 6 avisos del lint del proyecto. Decisión del
  dueño (04-10-2026): algún día se rehace entera; hasta entonces, arreglos puntuales. El mapa para
  ese día —qué hace cada pieza, el contrato con la Caja, los bugs conocidos (los dos que afectaban
  a la cocina ya se arreglaron, el 04-10-2026) y una propuesta de orden— está en [[Web publica]].
- **CRM de clientes.** El módulo Clientes (ya solo del admin) tendrá su propio CRM. Sin diseñar.
- **Menú público** (`/menu`). Su fondo ya quedó optimizado (03-10-2026).
- **Ticket impreso.**

Lo que estaba acá y ya se hizo: Estadísticas Generales, eliminar pedidos desde el Historial y la
liberación de solicitudes web trabadas (03-10-2026). Ver [[Mapa de archivos]] y
[[Flujo del pedido#Asignación de solicitudes web — un solo dueño]].

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

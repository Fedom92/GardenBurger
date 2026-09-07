---
tags: [gardenburger, decisiones, adr]
---

# Decisiones técnicas

← [[GardenBurger]]

El *por qué* de las decisiones que parecen raras. **Antes de "arreglar" algo de esta lista, leer
el motivo**: casi todas salieron de un bug real que costó tiempo encontrar.

## Persistencia en IndexedDB, modo una sola pestaña

**Qué**: `persistentLocalCache({ tabManager: persistentSingleTabManager({}) })`.

**Historia**: durante meses fue `memoryLocalCache()` porque el modo **multi-pestaña** rompía la
sesión. Ese modo elige una pestaña "primaria" que abre los streams de red **por todas las demás**;
con `browserSessionPersistence` (sesión de Auth por pestaña), si la primaria era una pública
anónima en `/ver-pedido` conviviendo con la de Caja, las lecturas del staff salían con esa
credencial y volvían `permission-denied`, de forma aleatoria y dificilísima de diagnosticar.

**Por qué ahora sí se puede**, verificado en el SDK instalado (`@firebase/firestore` 3.13.0):

- En **single-tab no hay pestaña primaria ni delegación**: cada pestaña usa su propia conexión y
  sus propias credenciales, así que ese bug no puede repetirse.
- Si IndexedDB no se puede tomar, el SDK **cae solo a caché de memoria con un warning**; no rompe.
  La segunda pestaña queda como estaba antes de este cambio.
- `persistenceKey = app.name`, o sea que la persistencia es por app, no por origen.

**Qué gana**: los `onSnapshot` persisten su `resumeToken`, así que al recargar el servidor manda
solo los cambios en lugar de la query entera. Con Cocina o ATP abiertas toda la noche, cada F5
deja de costar la jornada completa.

> [!warning] Lo que NO gana
> `getDocs` **siempre** consulta al servidor y se factura igual. Para leer de caché hay que pedir
> `getDocsFromCache()` explícitamente, y hoy nadie lo hace. Por eso `useTraerDatos` sigue siendo el
> mayor costo recurrente: ver [[Deuda tecnica#Caché del catálogo de Caja — el mayor costo recurrente]].

**Síntoma esperado, no es un error**: abrir una segunda pestaña imprime un warning de IndexedDB en
consola. Es el fallback del SDK funcionando.


## Las páginas públicas no tocan AuthContext

**Qué**: las rutas públicas están fuera del `<AuthContextProvider>` en `App.js`.

**Por qué**: abrir `/ver-pedido` en otra pestaña rompía la sesión de la pestaña de Caja. Montar
el provider en una página pública inicializaba estado de sesión que no correspondía.

**Consecuencia**: `useAuth()` **solo funciona bajo la rama de staff**. Un componente público que
lo llame revienta.

## App Check está "Aplicada"

**Qué**: reCAPTCHA Enterprise, enforcement activo para Cloud Firestore y Authentication.

**Consecuencia práctica**: sin token válido, Firestore y Auth rechazan con `permission-denied`,
**indistinguible de un problema de reglas**.

> [!tip] Cómo diagnosticar un permission-denied
> Mirar la columna **"no verificadas"** en Consola → App Check. Si Cloud Firestore muestra 100%
> verificadas / 0% sin verificar, **el problema no es App Check**: es `request.auth == null`.
> Ese fue el caso real, y se arregló con una línea: `await user.getIdToken()` antes de leer el
> doc del usuario en `AuthContext`, para que la lectura no salga sin credencial.

**Desarrollo en localhost**: la clave de reCAPTCHA solo vale para dominios registrados, así que
desde localhost hace falta el debug token. Se imprime en consola en **cada** `initializeAppCheck()`
mientras el modo debug esté activo (verificado en el SDK instalado) — que aparezca no significa
que se esté regenerando. Guardado en `REACT_APP_appCheckDebug` deja de cambiar.

## Nada de configuración de infraestructura en el repo

**Qué**: no hay `firebase.json`, `.firebaserc`, `storage.rules`, `firestore.rules` ni `functions/`
versionados.

**Por qué**: decisión explícita del dueño. Las reglas se pegan a mano en la Consola.

**Consecuencia**: [[Reglas de seguridad]] documenta la **intención**, no necesariamente lo
desplegado. Al diagnosticar un permission-denied, pedir las reglas reales antes de suponer.

## `menu.json` depende de tres capas

Para que el menú público funcione tienen que estar bien **las tres**:

1. Las **reglas de Storage** (`publico/menu.json` con lectura pública).
2. El **CORS del bucket** — capa aparte de las reglas, se configura con `gsutil cors set`.
3. El **archivo publicado** — el botón "Publicar Menú" de Productos.

> [!caution] El fallback tapa la falla
> Si algo de eso está mal, `CartContext` y `Menu` caen al fallback de Firestore y **la pantalla
> sigue andando**: la falla solo se ve como un warning en consola, mientras se pagan lecturas
> que se suponía ahorradas.

## Sin `runTransaction` para el arqueo

**Qué**: `getResumenOperation` usa `increment()` dentro de un `writeBatch`, no transacciones.

**Por qué**: decisión explícita — se prefiere evitar la complejidad de las transacciones. Dos
clicks simultáneos sobre el mismo pedido se consideran suficientemente raros.

**Consecuencia**: queda una ventana de ~200 ms en la que dos cajeros pueden descontar dos veces
el mismo pedido. Riesgo aceptado y documentado. La protección elegida es `useAccionUnica`, que
cubre el doble click de **una** persona pero no la carrera entre dos.

`getNextSequence` sí usa transacción, y esa no se toca.

## Una solicitud web, un solo cajero

Ver [[Flujo del pedido#Asignación de solicitudes web — un solo dueño]]. Se descartaron el
timeout de 5 minutos, `runTransaction` y los campos extra por over-engineering. La solución
final no agrega **ninguna** lectura ni escritura.

## `BuscarPedido` absorbió a `EliminarTickets`

Eran casi el mismo archivo. Buscar y después eliminar costaba **dos `getDocs` de la jornada
entera**; unificado es uno. Ese modal no filtra por estado a propósito: el cajero tiene que poder
ver y eliminar el ticket en cualquier instancia, incluso ya eliminado.

## Caja con alto fijo de 100vh

Dos zonas scrolleables independientes. La `.row` de Bootstrap necesita `flex-wrap: nowrap` o los
paneles se estiran al contenido y rompen el layout.

> [!tip] Depurar CSS acá
> Al segundo intento fallido, parar de editar a ciegas y poner un `outline` rojo de testigo para
> ver qué caja se está estirando realmente.


## Todos los empleados viven en `usuarios`

**Qué**: los repartidores dejaron de tener su propia subcolección `sucursales/{id}/deliverys` y son
documentos de `usuarios` como cualquier otro empleado, con `rol` de delivery y `sinAcceso: true`.

**Por qué**: cobran, tienen valor hora y tienen que aparecer en la liquidación. Mantener dos
colecciones de personas obligaba a duplicar el alta, la baja y la búsqueda.

**Consecuencia que muerde**: el campo de nombre pasó a ser **`nombreCompleto`**, no `nombre`. La
referencia vieja quedó colgada en `JefeDeliverys` y reventaba la pantalla entera con dos o más
repartidores, porque `a.nombre.localeCompare(...)` sobre `undefined` tira. Con uno solo no se
notaba: el comparador de `sort` nunca se llama.

`sinAcceso: true` significa **sin cuenta de Auth**: no se loguean, así que su alta no pasa por la
Cloud Function sino por un `addDoc` directo desde PanelAdmin.

## El alta de empleados compensa en vez de transaccionar

**Qué**: si el `set` de Firestore falla después de crear la cuenta de Auth, la Cloud Function
**borra la cuenta recién creada**.

**Por qué**: no existe transacción posible entre Firebase Auth y Firestore. Sin compensación queda
una cuenta huérfana que puede loguearse y no tiene documento, lo que rompe `AuthContext`.

## Congelar `valorHora` en cada registro de asistencia

Ver [[Asistencias y liquidacion#2. `nombre` y `valorHora` van congelados en el registro]]. Es a la vez
un ahorro de lecturas y una regla de negocio: una liquidación pasada no puede cambiar porque hoy
se le suba el sueldo a alguien.

## `MiPerfil` es de solo lectura

**Qué**: el empleado no edita sus propios datos. Lo único que cambia por su cuenta es la
contraseña, y eso va por Auth, no por Firestore.

**Por qué**: con `write` abierto sobre `usuarios/{uid}` propio, un cajero podía ponerse rol admin
editando su documento desde la consola del navegador. La regla quedó `read` para todo staff y
`write` solo para el admin.

**Consecuencia**: si un dato está mal, lo corrige el administrador desde PanelAdmin.

## El rediseño de la Caja vino de Claude Design

**Qué**: la pantalla de Caja se rehízo en ago-2026 a partir del artboard **2a — Densidad y teclado
v2** del proyecto *"Diseño alternativo para POS"* de Claude Design. El archivo fuente es un
`.dc.html` con estilos inline y un script de clase: es una especificación visual, no código.

> [!tip] Si volvés a iterar el diseño
> `support.js` de ese proyecto es `dc-runtime`, el motor del canvas que interpreta `<sc-for>` y
> `<sc-if>`. Está marcado como generado y **no sirve para nada en la app**: se descarta.
> Leer el proyecto requiere `/design-login` y la herramienta `DesignSync`.

### Divergencias deliberadas — no "arreglarlas" de vuelta

| El diseño decía | Qué se hizo | Por qué |
|---|---|---|
| Selector de envío por kilómetros, con 4 rangos y precios fijos | Se mantiene el selector de zonas de la colección `envios` | Hardcodear los precios rompe el ABM de envíos y ata todas las sucursales a los mismos valores |
| Control `− 2 +` en cada línea del ticket | Cantidad como número + la ✕ de siempre | El `+` no se puede enchufar a `handleAgregarAlCarrito`: esa función solo acumula si el producto es **el último del carrito**, así que en una fila del medio agregaría un renglón duplicado |
| Badge numérico "3" en el chip F2 | Punto indicador y titileo | `usePendientes` usa `limit(1)` a propósito; contar exigiría traerse todos los pendientes |
| Sin campo "Paga con" | Se agregó igual | `validarPedido` exige `pagaCon >= total`: sin el campo no se puede guardar un pedido en efectivo |
| Topbar de 46px en `#14161a` | 50px en `var(--color-menu)` | Es el alto exacto del handle del sidebar colapsado, que flota **encima** de la barra. Más baja o de otro negro, el logo se lee como una pieza aparte |

### Pendiente

La fila de **"Vuelto"** en el bloque de cobro quedó propuesta y sin decidir. Hoy la Caja guarda
`pagaCon` pero nunca muestra el vuelto: el cajero lo calcula de cabeza. Sale de una resta con
datos que ya están en memoria, sin lecturas ni campos nuevos.

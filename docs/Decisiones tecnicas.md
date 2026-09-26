---
tags: [gardenburger, decisiones, adr]
aliases: [ADR, Por que esta asi]
actualizado: 2026-09-26
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
> `getDocsFromCache()` explícitamente, y hoy nadie lo hace. Por eso el catálogo de Caja, que era el
> mayor costo recurrente mientras iba por `getDocs`, pasó a listener:
> [[Decisiones tecnicas#El catálogo de Caja va por listener|el catálogo por listener]].

**Síntoma esperado, no es un error**: abrir una segunda pestaña imprime un warning de IndexedDB en
consola. Es el fallback del SDK funcionando.


## Las páginas públicas no tocan AuthContext

**Qué**: las rutas públicas están fuera del `<AuthContextProvider>` en `App.js`.

**Por qué**: abrir `/ver-pedido` en otra pestaña rompía la sesión de la pestaña de Caja. Montar
el provider en una página pública inicializaba estado de sesión que no correspondía.

**Consecuencia**: `useAuth()` **solo funciona bajo la rama de staff**. Un componente público que
lo llame revienta.

## Code splitting por ruta

**Qué**: en `App.js` las 15 pantallas van por `React.lazy(() => import(...))`. Solo `Login` queda
importado de forma estática.

**Por qué**: el bundle único pesaba **3,2 MB**. Un cliente que abría `/menu` en el celular
descargaba Caja, Cocina, Delivery, PanelAdmin y Estadísticas con Recharts, sin sesión y sin usarlas
nunca. CRA hace el split solo con `import()`: no hace falta configurar nada.

**Las dos fronteras de `Suspense`, y por qué son dos:**

- Una alrededor de `<Routes>`, para las públicas y el Login.
- Otra **dentro de `RequireAuth`**, alrededor de `{children}`. `RequireAuth` renderiza
  `<Navigation />` y después la página: con la frontera ahí, la barra queda en pantalla mientras
  baja el chunk, en vez de parpadear a un loader entero. Los guards `RequireAdmin` /
  `RequireSucursal` / `RequireRole` caen dentro sin tocarlos.

El fallback es `Cargando` (en `RutasProtegidas.jsx`), con el mismo `.loader` de `Main.css` que
usan las pantallas. El CSS llega con `Login` y `Navigation`, que siguen en el chunk principal.

> [!note] `PaginaDetalle` es export nombrado
> `lazy()` necesita un default, así que se envuelve:
> `import('./…/PaginaDetalle.jsx').then(m => ({ default: m.PaginaDetalle }))`. Si se agrega otra
> pantalla con export nombrado, mismo truco.

**Consecuencia**: la primera visita a cada pantalla muestra el loader un instante mientras baja su
chunk; las siguientes no (queda cacheado). `Login` sigue eager a propósito: es la landing del staff
y no tiene sentido diferirla.

## Los TSV de Estadísticas viven en una carpeta privada de Storage

**Qué**: `ventas.tsv` y `pagos.tsv` están en `privado/estadisticas/` de Storage, con
`allow read, write: if esAdmin()`. Los sube el admin a mano desde la Consola de Firebase, y
`Estadisticas` los baja al montar. Antes vivían en `public/CSV/` y se leían con `fetch`.

**Por qué**: todo lo que está en `public/` **se copia al build y el hosting lo sirve sin sesión**.
`pagos.tsv` tiene 43.039 filas con nombre, dirección, entre calles y teléfono de cada pedido, y
respondía 200 a cualquiera que supiera la URL. No era una regla mal escrita: era un link.

**Por qué no un selector de archivos**: se probó con un `<input type="file">` —cero
infraestructura, los archivos nunca salían de la PC— y se descartó porque obligaba al admin a
elegir los dos archivos cada vez que abría la pantalla.

**Y los 10,5 MB no se pagan en cada apertura**: Storage manda un ETag, así que el navegador
revalida con `If-None-Match` y recibe un **304 sin cuerpo** (verificado el 26-09-2026). Se
descartaron el gzip y un `Cache-Control` propio por eso: no hacían falta. Cuando se re-exportan los
TSV el ETag cambia y el navegador baja los nuevos solo, sin riesgo de datos viejos.

> [!important] `getBytes()`, nunca la URL de descarga
> Las URL con token de descarga que devuelve `getDownloadURL()` **saltean las reglas**: es lo que
> hace que las fotos de producto se vean en el menú público sin sesión. Para un archivo privado eso
> sería el mismo agujero de antes con otra forma. `getBytes()` va por el SDK con el token del
> usuario y sí pasa por `allow read: if esAdmin()`.

> [!danger] La regla general, que vale para cualquier archivo
> **`public/` es público.** No hay reglas ahí, no hay sesión, no hay App Check: es un servidor de
> archivos. Nada con datos de nadie va en esa carpeta.

**Consecuencia**: si los archivos no están en Storage, o si el admin tiene el rol pero todavía no
el claim en su token, la pantalla dice exactamente eso y qué hacer.

## `moment-timezone` con la tabla de zonas recortada

**Qué**: `index.js` importa `moment-timezone/builds/moment-timezone-with-data-10-year-range` en
vez de `moment-timezone` a secas.

**Por qué se queda `moment-timezone`**: `moment.tz.setDefault('America/Argentina/Buenos_Aires')`
hace que **todos** los `moment()` de la app —los que formatean horas en las tarjetas y los que
calculan la jornada en `fechaComercial.js`— usen hora argentina aunque la PC tenga otra zona
configurada. Es complementario a `ahoraServidor()`: ese corrige el **reloj** (desfase de
minutos), `setDefault` corrige la **zona** (una PC en UTC mostraría las 23:00 como 02:00 y mandaría
el pedido a otra jornada). No está discontinuado: lo usa implícitamente cada `moment()`.

**Por qué el build recortado**: la entrada por defecto trae la tabla de reglas horarias de todas
las zonas del mundo desde 1800 — **703 KB, el 38 % de `main`**. El build de 10 años trae solo los
últimos y próximos 5 años (44 KB). Argentina está fija en `-03` desde 2009, así que los dos dan la
misma hora para cualquier fecha, incluidas las Estadísticas históricas (verificado con 2010, 2019
y hoy). En ese build Buenos Aires es un alias de São Paulo porque comparten reglas en el rango; a
moment le da igual.

**Consecuencia**: si algún día Argentina vuelve a cambiar el horario, alcanza con actualizar el
paquete: el build de 10 años se regenera con cada versión.

## El aviso de menú sin publicar es una bandera en `localStorage`

**Qué**: en Productos, el botón "Publicar Menú" **parpadea** mientras haya cambios en el catálogo
que la web pública todavía no ve. La bandera (`menuSinPublicar`) vive en `localStorage`: la
prenden `agregarProducto`, `editarProducto`, `actualizarVisibilidad`, `confirmeDelete` y los tres
handlers del modal `Categorias` (vía `onCambio`); la apaga `handlePublicarMenu` en el camino feliz.
Helpers en `menuPublico.js`.

**Por qué así y no de otra forma**:

- **No un campo en `productos`** (`publicadoEl`, `modificadoEl`…): el dueño no quiere campos
  nuevos en la colección, y cada escritura de producto tendría que tocarlo.
- **No comparar el catálogo en memoria contra `menu.json`**: es exacto y funciona desde cualquier
  PC, pero se descartó por complejidad — hay que canonizar y ordenar dos estructuras para que la
  comparación no dé falsos positivos.
- Una bandera es una línea por punto de edición y cero lecturas.

**Consecuencia, aceptada**: es por navegador. Si se edita en una PC y se publica desde otra, la
primera sigue parpadeando hasta que publique desde ahí. Inofensivo: publicar dos veces no rompe
nada.

## `html2pdf` se carga al tocar "Exportar a PDF"

**Qué**: `Menu.jsx` hace `await import('html2pdf.js')` dentro de `exportarPDF`, no arriba.

**Por qué**: `html2pdf` arrastra `jspdf` con un advisory crítico y pesa varios cientos de KB, y
solo sirve para ese botón. Con el import dinámico queda en su propio chunk y el menú público no lo
descarga hasta que alguien exporta. Se mantiene la dependencia porque la exportación **se usa**.

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

## La configuración de Firebase se versiona

**Qué**: `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` y `functions/src` están
en el repo. Las reglas se despliegan con `firebase deploy`, no se pegan a mano.

**Antes era al revés**, y con motivo: mientras las reglas se escribían a mano en la Consola, tener
un archivo en el repo solo agregaba una copia que se desincronizaba. Cambió cuando aparecieron dos
problemas concretos:

- `Esquema_firestore.md` documentaba la *intención*, no lo desplegado, y ya había divergido.
- El código TypeScript de las Cloud Functions vivía **solo en un disco**. Sin respaldo ni historial.

**Consecuencia**: lo del repo es lo que se despliega. Si alguien ajusta una regla en la Consola, el
próximo deploy se la lleva puesta — comparar antes de desplegar.

**Lo que sigue afuera**: el `.env` de la raíz y `functions/.env` (tiene `ADMIN_ROL`), y los
**índices**, que no se declaran en `firebase.json` a propósito para que ningún deploy pueda
borrarlos. Ver [[Reglas de seguridad]].

## Ser admin es un custom claim, no una lectura

**Qué**: la regla es `request.auth.token.admin == true`. El claim lo reparte la Cloud Function
`sincronizarClaims`.

**Por qué**: `esAdmin()` era un `get()` a `usuarios` **facturado en cada evaluación**, y además
obligaba a escribir el valor crudo del rol dentro de la regla. Con el claim desaparecen las dos
cosas: no se lee nada y no hay ningún valor de rol en los archivos.

**El efecto secundario es el importante**: una regla por rol pasó a costar cero. `asistencias`
quedó abierta a cualquier staff cuando cerrarla costaba un `get()`; con los claims ese argumento
desapareció, se volvió a evaluar y **el dueño decidió dejarla como está**. Ver
[[Deuda tecnica#`asistencias` abierta en reglas, cerrada solo por front|Deuda tecnica]].

**Los admins se crean solo desde la Consola de Firebase.** La app no ofrece ese rol y
`crearUsuario` lo rechaza server-side. Después de crear uno hay que entrar al PanelAdmin y tocar
"Sincronizar permisos", y esa persona tiene que **volver a iniciar sesión**: el claim viaja en el
token. Desde el 26-09-2026 ese botón **solo lo ve el dueño** (`EMAIL_SUPERADMIN` en
`Constantes.jsx`). Es visual: la Cloud Function exige ser admin igual, y el dueño decidió que no
importa que su correo quede en el JavaScript público del sitio.

> [!important] Por qué las Functions conservan el respaldo contra Firestore
> Las reglas miran solo el claim, pero las Functions aceptan *claim o rol en Firestore*. No es
> inconsistencia: es el camino de recuperación. Un admin recién creado en la Consola tiene el rol
> en `usuarios` pero **todavía no tiene claim**, y sin ese respaldo no podría ni invocar
> `sincronizarClaims` para otorgárselo. El `||` cortocircuita, así que normalmente no se lee nada.


## `menu.json` depende de tres capas

Para que el menú público funcione tienen que estar bien **las tres**:

1. Las **reglas de Storage** (`publico/menu.json` con lectura pública).
2. El **CORS del bucket** — capa aparte de las reglas, se configura con `gsutil cors set`.
3. El **archivo publicado** — el botón "Publicar Menú" de Productos.

> [!caution] El fallback tapa la falla
> Si algo de eso está mal, `CartContext` y `Menu` caen al fallback de Firestore y **la pantalla
> sigue andando**: la falla solo se ve como un warning en consola, mientras se pagan lecturas
> que se suponía ahorradas.

> [!tip] Y una copia en memoria, al probar
> `fetchMenuPublico` guarda la descarga mientras la pestaña esté abierta (y en desarrollo el
> recargado en caliente la conserva). Si un dato recién publicado no aparece pero los productos sí,
> el primer paso es **Ctrl+F5**. Desde el 26-09-2026 `publicarMenu` descarta esa copia, así la misma
> pestaña ve el menú nuevo.

## El arqueo se calcula desde los pedidos

**Qué**: `resumenDiario` dejó de ser un contador mantenido con `increment()` y pasó a ser el
resultado de `calcularArqueo(pedidos)`, una función pura sobre los pedidos de la jornada. El
documento sigue existiendo, pero como **foto** de ese cálculo. 26-09-2026.

**Por qué**: `increment()` es atómico pero **no idempotente**, y eso obligaba a que los cinco
caminos que tocaban un pedido —guardar, rechazar MP, eliminar ticket, cerrar delivery— se acordaran
de mover el arqueo, con el signo correcto y exactamente una vez. Cada camino nuevo era una
oportunidad de olvidarlo, y si el número se desincronizaba no había forma de detectarlo ni de
arreglarlo: era un acumulado, no la verdad. Un `set()` de un valor **calculado** es idempotente por
construcción: correrlo dos veces da lo mismo.

Con esto, eliminar un pedido volvió a ser cambiar un campo. La carrera entre dos cajeros
descontando el mismo pedido **desapareció** en vez de quedar documentada como riesgo aceptado.

**Las cuatro reglas de la foto** (están también en la cabecera de `useResumenDiario.js`):

| Situación | Qué hace `obtenerArqueo()` |
|---|---|
| Jornada **abierta** | calcula siempre, no guarda nada — todavía se está moviendo |
| Jornada **cerrada** sin foto | calcula una vez y la guarda. Queda definitiva |
| Jornada **cerrada** con foto | usa la foto. **Nunca** recalcula sola |
| Alguien corrige **los hechos** | `invalidarFotoDePedido(pedido)` la borra; el siguiente que la mire la reconstruye |

**Cambiar código no regenera nada.** Si se agrega una categoría a `CATEGORIAS_COMBOS`, las fotos
viejas se quedan como están: agosto tiene que seguir diciendo lo que era cierto en agosto, o los
meses dejan de ser comparables. Regla del dueño, y es la correcta: *"modificar registros históricos
NO"*.

**Y para que valga sin importar cuándo se saca la foto**, lo que depende de reglas que cambian se
**congela en el pedido** al escribirlo: `combos` y `esLocal` al cobrar, `fijoDelivery` al cerrar
la entrega. Es el mismo criterio que el `valorHora` en asistencias. Sin eso, la foto de una noche
vieja se calculaba con el menú y el fijo del día en que alguien la abría por primera vez (26-09-2026,
ver [[Auditoria 2026-09-26#A · P2 · La foto promete una historia exacta, pero hoy nadie la saca]]).

**El costo**, con los volúmenes reales (davinci ~60 pedidos/noche, pico de 101; 2 arqueos por
noche y ~5 vistas de dashboard por día):

| Modalidad | Lecturas/día | Escrituras/día | 90 días de histórico |
|---|---|---|---|
| Contador con `increment()` | ~314 | ~125 extra | 1 lectura por día-sucursal |
| Calcular siempre, sin foto | ~12.560 (25% de la cuota) | 0 | ~36.560 (73%) — **descartada** |
| **Foto (elegida)** | ~940 (1,9%) | 2 | 1 lectura por día-sucursal |

La cuota gratuita de Firestore son **50.000 lecturas por día** y aplica también en Blaze, así que
el costo no fue el criterio: las tres entraban. Lo que decidió fue que "calcular siempre" hacía
inviable el dashboard cross-sucursal sobre histórico, y la foto lo deja igual de barato que el
contador sin heredar su fragilidad.

Esas ~2 vistas por noche no son un supuesto optimista: **F4 se restringió** para que sea así. Solo
lo ve el encargado y solo entre las 00:00 y `horaCierre`, que es cuando el arqueo significa algo.
Ver [[Reglas de negocio#Quién mira el arqueo, y cuándo]].

**Verificado antes de reemplazar**: se comparó `calcularArqueo` contra una simulación de la
secuencia de `increment()` del contador viejo en 8 casos —mostrador en efectivo, delivery en
efectivo, MP puro, pago dividido, MP rechazado, eliminado desde F3, solicitud web nunca cobrada y
solicitud web rechazada sin `cajeroID`—. **Los 6 campos coinciden en los 8 casos.**

`getNextSequence` sí usa transacción, y esa no se toca. `Caja.guardarBD` sigue en
`runTransaction`, ahora con solo dos cosas adentro: el contador y el pedido.

> [!note] Momento ideal, y por qué no hubo migración
> Se hizo cuando el sistema nuevo **todavía no estaba productivo**: `resumenDiario` tenía 0
> documentos reales (lo único en producción es el sistema viejo de App Script + Google Sheets). No
> hubo nada que migrar ni nada que romper.

## Métricas y Estadísticas leen fotos, no pedidos

**Qué**: las pantallas de varios días leen la foto de cada noche (`obtenerResumenes`), no los
pedidos. Las noches sin foto se calculan una vez —en tandas de noches seguidas, una consulta por
tanda— y se guardan, incluidas las que dan cero. La noche en curso no entra en los rangos.

**Por qué**: un mes de 2 sucursales son ~44 lecturas con fotos contra ~2.000-2.400 con pedidos; un
año, ~520 contra ~25.000 (media cuota diaria). La foto se diseñó desde el inventario del Histórico,
para servir a las dos pantallas sin agregar campos después.

**Nombres**: **Métricas** (`/metricas`) es el vistazo rápido, pensado para el celular: combos,
ventas (efectivo/MP), pedidos (eliminados), delivery vs mostrador y top 3 combos. **Estadísticas**
es lo completo: las Generales (pendientes, ver [[Deuda tecnica#Funcionalidad pendiente]]) y el
Histórico de los TSV.

## El teléfono de la sucursal viaja en la solicitud web

**Qué**: cada sucursal tiene su teléfono de atención (`sucursales/{id}.telefono`), y la solicitud
web lo copia al crearse (`telefonoSucursal`). Reemplaza a `REACT_APP_celular`, que era uno solo
para todas las sucursales.

**Por qué así**: al confirmar, la web **ya lee** el documento de la sucursal para validarla, así
que el teléfono sale sin lecturas extra. Copiarlo en la solicitud hace que `/ver-pedido` arme su
botón de WhatsApp sin leer la sucursal: 0 lecturas por visita. Si la sucursal cambia de teléfono,
los pedidos viejos conservan el de entonces, que es irrelevante: el link vence a las 48 h.

## El horario vive en código, no en el `.env`

**Qué**: los días de apertura y las horas de apertura y cierre están en `HORARIO`, en
`Utils/Constantes.jsx`. Hasta el 26-09-2026 las horas eran `REACT_APP_horaAbre` y
`REACT_APP_horaCierre`.

**Por qué**: no son secretos, y las variables `REACT_APP_` se meten en el bundle al hacer el
build, así que el `.env` no daba ninguna flexibilidad: cambiar cualquiera de las dos cosas es un
build y un deploy. En código quedan versionadas, juntas y en un solo lugar. El `.env`, que git
ignora, queda para la configuración de Firebase y para lo que el dueño decidió dejar ahí: el fijo
de los repartidores y el recargo de MP.

## Una solicitud web, un solo cajero

Ver [[Flujo del pedido#Asignación de solicitudes web — un solo dueño]]. Se descartaron el
timeout de 5 minutos, `runTransaction` y los campos extra por over-engineering. La solución
final no agrega **ninguna** lectura ni escritura.

La atomicidad la garantiza la regla `asignacionValida()` desde el 14-09-2026, no el front: el
chequeo del modal contra el snapshot local tenía una ventana de carrera. Ver
[[Reglas de seguridad#`update`: valida la asignación, no el estado]].

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


## El catálogo de Caja va por listener

**Qué**: `useTraerDatos` escucha productos, categorías y envíos con `onSnapshot`, no con `getDocs`.

**Por qué**: releía las tres colecciones enteras en **cada montaje de Caja** —cada F5 y cada vuelta
desde otra pantalla— y era el mayor costo recurrente del sistema. Con `persistentLocalCache` el
`resumeToken` de cada listener queda en IndexedDB, así que al re-montar el servidor manda **solo
los cambios**. De regalo el catálogo queda en vivo: un precio que cambia el admin llega a la Caja
abierta sin recargar.

**Lo que se descartó:**

| Alternativa | Por qué no |
|---|---|
| Caché propia con marca de jornada en `localStorage` | Código propio —marca, botón "Actualizar catálogo" y camino de respaldo— y un precio cambiado a mitad de turno no llegaba hasta refrescar a mano |
| Provider por encima de las rutas | Evita la relectura al navegar, pero el F5 sigue costando todo |
| Reusar `menu.json` | Cero lecturas, pero el JSON solo se actualiza al "Publicar Menú": riesgo real de **cobrar un precio viejo** |

> [!note] La incertidumbre honesta
> Cuánto tiempo el servidor honra un resume token es política suya, no algo verificable desde el
> SDK. Tras una noche cerrado, la primera carga probablemente sea completa igual — que es
> exactamente el objetivo: una lectura del catálogo por PC por noche en vez de una por montaje.

## Numeración de tickets dentro de la transacción del pedido

**Qué**: `guardarBD` usa `runTransaction` con contador + pedido + arqueo adentro. `avanzarContador`
participa de esa transacción; `getNextSequence` sigue existiendo para quien no tiene una propia.

**Por qué**: el contador corría en su propia transacción **antes** del `writeBatch`. Si el batch
fallaba, el número ya estaba consumido y la numeración saltaba (42, 43, 45), que en un negocio de
efectivo parece un ticket faltante al cuadrar la caja.

**No cuesta nada**: antes era 1 lectura del contador + 3 escrituras; ahora también.

> [!caution] Dos cosas que rompen sutilmente si se tocan
> El `doc(pedidosRef)` se genera **fuera** del callback: adentro, cada reintento de la transacción
> crearía un id distinto. Y todas las lecturas van antes que cualquier escritura, que es lo que
> exige `runTransaction` — se cumple solo porque la única lectura es el contador.

## Todos los empleados viven en `usuarios`

**Qué**: los repartidores dejaron de tener su propia subcolección `sucursales/{id}/deliverys` y son
documentos de `usuarios` como cualquier otro empleado, con `rol` de delivery y `sinAcceso: true`.

**Por qué**: cobran, tienen valor hora y tienen que aparecer en la liquidación. Mantener dos
colecciones de personas obligaba a duplicar el alta, la baja y la búsqueda.

**Consecuencia que muerde**: el campo de nombre pasó a ser **`nombreCompleto`**, no `nombre`. La
referencia vieja quedó colgada en `JefeDeliverys` y reventaba la pantalla entera con dos o más
repartidores, porque `a.nombre.localeCompare(...)` sobre `undefined` tira. Con uno solo no se
notaba: el comparador de `sort` nunca se llama.

Lo decide el rol: `ROLES` del delivery trae `sinAcceso: true` (hasta el 26-09-2026 era un check en el alta, que solo servía para ellos). `sinAcceso: true` significa **sin cuenta de Auth**: no se loguean, así que su alta no pasa por la
Cloud Function sino por un `addDoc` directo desde PanelAdmin.

**Al editar, el rol no cruza esa frontera.** El selector de PanelAdmin solo ofrece roles de la
misma clase que el empleado —con o sin cuenta de Auth, según su `sinAcceso` guardado—, y
`handleEditEmpleado` lo vuelve a validar. Un repartidor pasado a cajero no podría loguearse, y un
cajero pasado a repartidor conservaría usuario y clave sin ver ningún módulo. Si de verdad cambia
de puesto, se lo da de baja y se lo crea de nuevo (26-09-2026).

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
contraseña, y eso va por Auth, no por Firestore. La leyenda "avisale al administrador" no se le
muestra al admin, que se corrige a sí mismo desde el PanelAdmin.

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

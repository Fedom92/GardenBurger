---
tags: [gardenburger, decisiones, adr]
aliases: [ADR, Por que esta asi]
actualizado: 2026-10-12
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

**Por qué ahora sí se puede**, verificado en el SDK instalado (`@firebase/firestore` 3.13.0, y de
nuevo en 4.17.2 al pasar a firebase 12, 04-10-2026):

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

> [!note] `lazy()` necesita un export por defecto
> Todas las pantallas lo tienen. Si alguna vez una exporta con nombre, se envuelve:
> `import('./…/Pantalla').then(m => ({ default: m.Pantalla }))` (así estuvo `PaginaDetalle` hasta
> el 16-10-2026).

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
prenden `onGuardado` de Crear/Editar producto, `confirmeDelete` y los tres
handlers del modal `Categorias` (vía `onCambio`); la apaga `handlePublicarMenu` en el camino feliz.
Helpers en `menuPublico.js`.

También la prenden los productos privados (o de una categoría privada), aunque no estén en
`menu.json`: se probó filtrarlos y el dueño prefirió lo simple (28-09-2026). Publicar de más no
rompe nada.

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

**Las sucursales ya no la prenden** (12-10-2026): se publican solas al guardarlas, y solo la
prenden si esa publicación falla. Ver
[[Decisiones tecnicas#Las excepciones de horario viven en dos lugares]].

## Las fotos de producto se achican en el navegador

**Qué**: al elegir "Subir archivo" en Crear/Editar producto, `subirImagenProducto()`
(`Utils/imagenes.js`) achica la foto a **1200 px de lado** y la pasa a **WebP** (calidad 0,85) en el
Chrome del admin, y recién ahí la sube a `productos/` de Storage. A Storage llega solo la versión
liviana; el original queda en la PC. No hay tope de peso al elegir el archivo.

**Por qué**: la foto de una cámara pesa 4-6 MB y tiene ~4000 px, pero se ve a 86 px en la Caja y
a 128 px en la web (384 px en un celular ×3). Subirla entera solo hace lenta la web con datos
móviles. Medido en Chrome con una foto sintética de 4000×3000: **5 MB → 200 KB** a 1200 px; en
WebP pero sin achicar quedaba en **2,6 MB**, o sea que lo que baja el peso es la resolución, no el
formato. Cero lecturas de Firestore, y menos descarga de Storage que antes.

**Alternativas descartadas**:

| Opción | Por qué no |
|---|---|
| `browser-image-compression` | Ahorra ~10 líneas, pero sin versiones desde marzo de 2023, y por defecto baja su propio código de `cdn.jsdelivr.net` en cada uso. Lo que suma (peso máximo garantizado, navegadores viejos, límites de iPhone) sirve cuando suben fotos los clientes, no un admin en Chrome |
| Extensión "Resize Images" de Firebase | Sube el original y lo achica una Cloud Function: hay que subir el tope de 5 MB en las reglas, la URL achicada no vuelve al navegador, se paga cada ejecución y se guarda todo dos veces |
| CDN de imágenes (Cloudinary, ImageKit) | Otra cuenta y otro servicio de terceros para algo que resuelve el navegador |

**Consecuencias, aceptadas**:

- Las **HEIC** del iPhone no se abren en Chrome de Windows: el admin ve `IMAGEN_ILEGIBLE` y tiene
  que exportarla a JPG.
- **Safari no genera WebP desde un canvas** (sí los muestra, desde la versión 14): devuelve PNG. Si
  alguien sube desde Safari, pesa más pero funciona, y la extensión sale del tipo real.
- Si la original ya pesaba menos que el WebP (una imagen chica y optimizada), se sube la original.
- Las fotos que ya estaban en Storage no se convierten solas: se vuelven a subir desde Editar.
- El tope de 5 MB de `storage.rules` sigue igual, pero el admin ya no llega a él: queda como red
  para lo que no pase por `imagenes.js`. Ver [[Reglas de seguridad]].

> [!warning] Links de Google Drive: **429 Too Many Requests**
> El modo "Link URL" acepta cualquier dirección, y algunas fotos apuntaban a
> `drive.google.com/thumbnail?id=…`. Drive no es un servidor de imágenes: redirige a
> `lh3.googleusercontent.com`, que limita los pedidos por IP. Las PCs del local comparten IP y la
> Caja pide todas las fotos de golpe, así que corta enseguida. Ninguna otra URL de Drive lo evita.
> La salida es "Subir archivo" y después **Publicar Menú**. Por decisión del dueño (28-09-2026) el
> campo **no** rechaza links de Drive.

## Las páginas de /menu se arman con html2canvas

**Qué**: "Descargar imagen" y "Descargar PDF" de `/menu` (`exportarMenu.js`) copian la carta, la
reparten en páginas de 450 × 800 fuera de la vista y sacan cada una con `html2canvas` al 2,4x:
**1080 × 1920**, el tamaño de un estado de WhatsApp. El PDF (`jsPDF`) lleva las mismas páginas.

**Por qué páginas y no una imagen larga**: la dueña sube la carta a sus estados, y un estado es
una pantalla vertical; una imagen de 4.000 px de alto se ve diminuta. El PDF sirve para mandar
por chat (los estados no aceptan PDF).

**Cómo reparte**: agrega los ítems de a uno y, si el cuerpo de la página desborda, pasa el ítem a
una página nueva. Mide con el layout real del navegador, así no hay alturas estimadas. La cabecera
y el pie van en todas las páginas (cada estado se ve solo); un título nunca queda solo al pie, y
una sección partida repite su título.

**Lo que html2canvas no sabe dibujar**, y por eso:
- **`font-stretch`**: los títulos son Archivo al 62% de ancho. Con la fuente variable de Google
  se veían bien en pantalla, pero en la imagen salían anchos y encimados. Se usa "GB Display", un
  recorte estático de Archivo (wdth 62, wght 900) en `src/fonts/`, con su licencia OFL al lado.
- **Los gradientes cónicos**: el damero del CSS es un `repeating-conic-gradient`; en las páginas
  se reemplaza por un mosaico dibujado en un canvas.
- **`object-fit`**: no usarlo dentro de la carta.

**Carga diferida**: `Menu.jsx` importa `exportarMenu.js` recién al tocar un botón, así
`html2canvas` y `jspdf` quedan en su propio chunk y la página no los baja. Están declarados como
dependencias propias desde el 16-10-2026; antes llegaban dentro de `html2pdf.js`, que se sacó
porque solo armaba un PDF de la carta entera. `jspdf` 4 es la versión que cierra el advisory
crítico de jspdf.

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

> [!note] Ruido de consola que no es un error
> El script de reCAPTCHA deja dos avisos en cada arranque: `Unrecognized feature: 'private-token'` y
> un `POST .../recaptcha/enterprise/pat 401`. Son intentos de Google de usar funciones del navegador
> que Chrome no tiene o no reconoce; sigue por el camino normal y el token de App Check sale igual.
> No se pueden silenciar desde la app.

> [!warning] La API key tiene que admitir `gardenburger.firebaseapp.com`
> La key del navegador está restringida por referrer en Google Cloud (Credenciales). Además de los
> dominios de la app, tiene que figurar **`https://gardenburger.firebaseapp.com/*`**: desde ahí se
> abre la página del link de **"Olvidé mi contraseña"**. Sin ese dominio la consola muestra
> `getProjectConfig 403 ... API_KEY_HTTP_REFERRER_BLOCKED` y el restablecimiento de contraseña no
> funciona (28-09-2026). Hasta el 04-10-2026 Auth cargaba además un iframe desde ahí (ver abajo).

## Auth con initializeAuth, sin iframe

**Qué**: `firebase.js` arranca Auth con `initializeAuth(app, { persistence: browserSessionPersistence })`
y no con `getAuth()` (04-10-2026).

**Por qué**: `getAuth()` suma un `popupRedirectResolver`, y con él Auth carga al arrancar un iframe
de `gardenburger.firebaseapp.com/__/auth/iframe`. Ese iframe solo sirve para entrar con Google,
Facebook u otro proveedor en ventana emergente o redirección. Acá se entra con correo y contraseña,
y **no se prevé otro proveedor**: es una descarga menos en cada carga, también en la web pública.

**De paso**, la sesión por pestaña se declara ahí, una vez, en lugar de con `setPersistence` en cada
login. Un login por nombre de usuario tampoco necesitaría el iframe: se resuelve convirtiendo el
usuario en un correo interno.

**Si algún día** se suma un proveedor, va `popupRedirectResolver: browserPopupRedirectResolver` en
el mismo `initializeAuth`.

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
> Si algo de eso está mal, la web y `/menu` caen al fallback de Firestore y **la pantalla
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
documento sigue existiendo, pero como **resumen guardado** de ese cálculo. 26-09-2026. (Hasta el
15-10-2026 se le decía "foto", en el código y acá: se renombró porque se confundía con las fotos de
producto.)

**Por qué**: `increment()` es atómico pero **no idempotente**, y eso obligaba a que los cinco
caminos que tocaban un pedido —guardar, rechazar MP, eliminar ticket, cerrar delivery— se acordaran
de mover el arqueo, con el signo correcto y exactamente una vez. Cada camino nuevo era una
oportunidad de olvidarlo, y si el número se desincronizaba no había forma de detectarlo ni de
arreglarlo: era un acumulado, no la verdad. Un `set()` de un valor **calculado** es idempotente por
construcción: correrlo dos veces da lo mismo.

Con esto, eliminar un pedido volvió a ser cambiar un campo. La carrera entre dos cajeros
descontando el mismo pedido **desapareció** en vez de quedar documentada como riesgo aceptado.

**Las cuatro reglas del resumen guardado** (están también en la cabecera de `useResumenDiario.js`):

| Situación | Qué hace `obtenerArqueo()` |
|---|---|
| Jornada **abierta** | calcula siempre, no guarda nada — todavía se está moviendo |
| Jornada **cerrada** sin resumen guardado | calcula una vez y lo guarda. Queda definitivo |
| Jornada **cerrada** con resumen guardado | usa ese. **Nunca** recalcula solo, salvo que cambie `VERSION_RESUMEN_DIARIO` |
| Alguien corrige **los hechos** | `actualizarPedidoYResumen()` escribe el pedido y borra el resumen de **su** noche **en la misma escritura**; el siguiente que la mire lo reconstruye |

La última regla va en una sola escritura (`writeBatch`) desde el 15-10-2026: antes eran dos —el
pedido y después el borrado—, y un corte entre las dos dejaba el pedido corregido con el resumen
viejo, sin que nadie se enterara (el error del borrado solo iba a la consola). La usan todos los
caminos que cambian lo que cuenta el arqueo: entregar (ATP, Deliverys), anular (F3, Historial),
rechazar un MP, cerrar un viaje y restaurar. Si la noche del pedido sigue abierta, es una escritura
común: todavía no hay resumen que borrar.

**Cambiar código no regenera nada.** Si se agrega una categoría a `CATEGORIAS_COMBOS`, los
resúmenes viejos se quedan como están: agosto tiene que seguir diciendo lo que era cierto en
agosto, o los meses dejan de ser comparables. Regla del dueño, y es la correcta: *"modificar
registros históricos NO"*.

**Y para que valga sin importar cuándo se arma el resumen**, lo que depende de reglas que cambian
se **congela en el pedido** al escribirlo: `combos`, `esLocal` y el costo del envío al cobrar. Es
el mismo criterio que el `valorHora` en asistencias. Sin eso, el resumen de una noche vieja se
calculaba con el menú del día en que alguien la abría por primera vez (26-09-2026,
ver [[Auditoria 2026-09-26#A · P2 · La foto promete una historia exacta, pero hoy nadie la saca]]).

### Suman solo los pedidos entregados (15-10-2026)

**Qué**: un pedido entra al arqueo cuando está **ENTREGADO** (`entraAlArqueo`). Hasta entonces
alcanzaba con que lo hubiera cobrado un cajero y no estuviera anulado, así que sumaban también los
que seguían en la cocina, esperando la transferencia (PENDIENTEMP) o de vuelta sin entregar. Es la
misma cuenta en el F4, Métricas y Estadísticas, porque las tres salen de `calcularArqueo`.

**Por qué**: el F4 tiene que decir la plata que ya está; un pedido cobrado que todavía no salió
puede terminar anulado. Lo cobrado que falta entregar no se pierde de vista: el F4 lo muestra
**aparte** ("Cobrados todavía sin entregar: N pedidos, $X", `cobradosSinEntregar`). De paso se
cerró el riesgo de que un viaje "volvió sin entregar" inflara la caja hasta que alguien lo anulara:
ya no suma.

**El costo**: cambiar qué suma es cambiar el significado de los campos, así que
`VERSION_RESUMEN_DIARIO` pasó de 1 a 2. Cada noche guardada con la regla vieja se recalcula **una
vez**, la próxima vez que alguien la mira: ~60-100 lecturas por noche y sucursal (abrir "Mes
pasado" en Métricas para las dos sucursales la primera vez son ~3.600-6.000). Después vuelve a ser
1 lectura por noche.

**El costo**, con los volúmenes reales (davinci ~60 pedidos/noche, pico de 101; 2 arqueos por
noche y ~5 vistas de dashboard por día):

| Modalidad | Lecturas/día | Escrituras/día | 90 días de histórico |
|---|---|---|---|
| Contador con `increment()` | ~314 | ~125 extra | 1 lectura por día-sucursal |
| Calcular siempre, sin guardar | ~12.560 (25% de la cuota) | 0 | ~36.560 (73%) — **descartada** |
| **Resumen guardado (elegida)** | ~940 (1,9%) | 2 | 1 lectura por día-sucursal |

La cuota gratuita de Firestore son **50.000 lecturas por día** y aplica también en Blaze, así que
el costo no fue el criterio: las tres entraban. Lo que decidió fue que "calcular siempre" hacía
inviable el dashboard cross-sucursal sobre histórico, y el resumen guardado lo deja igual de barato
que el contador sin heredar su fragilidad.

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

## Métricas y Estadísticas leen resúmenes guardados, no pedidos

**Qué**: las pantallas de varios días leen el resumen guardado de cada noche
(`obtenerResumenes`), no los pedidos. Las noches sin resumen se calculan una vez —en tandas de
noches seguidas, una consulta por tanda— y se guardan, incluidas las que dan cero. La noche en
curso no tiene resumen guardado (todavía se mueve): Métricas la calcula en el momento desde sus
pedidos cuando el período llega a hoy —"Hoy", "Semana actual", "Mes actual"—, sin guardarla.
Cuesta lo mismo que un F4 (~60-100 por sucursal).

**Por qué**: un mes de 2 sucursales son ~44 lecturas con resúmenes contra ~2.000-2.400 con
pedidos; un año, ~520 contra ~25.000 (media cuota diaria). El resumen se diseñó desde el
inventario del Histórico, para servir a las dos pantallas sin agregar campos después.

**Nombres**: **Métricas** (`/metricas`) es el vistazo rápido, pensado para el celular: combos,
ventas (efectivo/MP), pedidos (eliminados), delivery vs mostrador y top 3 combos. Se maneja con
botones, como una app (28-09-2026): primero la sucursal, después un período fijo, y busca sola;
sin fechas a mano ni botón "Ver". Al entrar no lee nada. **Estadísticas**
es lo completo: las Generales (`/estadisticas`, 03-10-2026, desde los resúmenes guardados) y el
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

**Qué**: la **jornada comercial** —de 19 a 02, lo que significa "hoy" para todo el sistema— está
en `HORARIO`, en `Utils/Constantes.jsx`, junto con `HORA_HABILITA_STATS` (desde qué hora se ve el
F4). Hasta el 26-09-2026 las horas eran `REACT_APP_horaAbre` y `REACT_APP_horaCierre`.

**Por qué**: no son secretos, y las variables `REACT_APP_` se meten en el bundle al hacer el
build, así que el `.env` no daba ninguna flexibilidad: cambiar cualquiera de las dos cosas es un
build y un deploy. En código quedan versionadas, juntas y en un solo lugar. El `.env`, que git
ignora, queda para la configuración de Firebase y para lo que el dueño decidió dejar ahí: el
recargo de MP.

**El horario de atención, en cambio, es de cada sucursal** (28-09-2026): días, apertura, cierre y
corte de la web, en su documento, editables desde el ABM. Las sucursales tienen horarios distintos
(Davinci cierra a las 00, Luro a la 01), y cambiarlos no tiene que ser un deploy. Viaja en
`menu.json`, así que la web lo mira sin leer Firestore.

**Y el F4 no mira el horario de la sucursal**: se habilita a `HORA_HABILITA_STATS` en todas.
Atarlo al cierre de cada una obligaba a la Caja a leer su sucursal (2-3 lecturas por sesión), y el
dueño prefirió la constante.

## Las excepciones de horario viven en dos lugares

**Qué** (12-10-2026): una excepción —un feriado que se abre, una noche que se cierra— se escribe
en un batch en dos lugares:

| | `sucursales/{id}.excepcionesWeb` | `sucursales/{id}/excepcionesHorario` |
|---|---|---|
| Para qué | lo que mira la web | el historial |
| Qué tiene | solo hoy y lo que viene; el motivo **solo si es público** | todo, con el motivo interno y quién la cargó |
| Quién lo lee | la web, desde `menu.json` y del `getDoc` que ya hace al confirmar | el admin, al tocar "Ver historial" (de a 20) |

**Por qué no uno solo**:

- **Solo en el documento de la sucursal**: es de lectura pública (`allow read: if true`) y viaja en
  `menu.json`. El motivo interno y los nombres de quién cargó cada una quedarían a la vista de
  cualquiera; "no mostrar en la web" sería cosmético. Y crecería para siempre dentro de un JSON que
  baja cada visitante.
- **Solo en la subcolección**: la web pagaría una lectura más por cada pedido confirmado, para
  mirar la excepción de esa noche.

Las dos escrituras van juntas en un `writeBatch`, así que no pueden quedar distintas. El mapa se
limpia de jornadas vencidas en cada escritura; el registro nunca se borra.

**Valen por jornada, no por un rango con "desde" y "hasta"**: una noche es la unidad en que el
negocio decide abrir o no, y así no queda nada que deshacer.

**Se republica solo `sucursales` en `menu.json`** (`publicarSucursales()`), partiendo del JSON ya
publicado. Llamar a `publicarMenu()` leería el catálogo entero y publicaría de rebote cambios de
productos a medio hacer. Sin publicar, abrir un día por excepción no servía: la web cree lo que dice el JSON y
muestra la pantalla de cerrado sin llegar a confirmar.

## Las Métricas de la jefa van por listener

**Qué**: las Métricas del módulo de deliverys salen de un `onSnapshot` sobre los viajes cerrados
de la noche —`where("deliveryFinTimestamp", ">=", inicioDeLaJornada)`—, además del listener de
siempre sobre los pedidos en `DELIVERY`. Los totales se calculan con `liquidarDeliverys()` sobre
esos documentos, filtrados a los pedidos de la jornada, igual que en el F4.

**Por qué**: la jefa tiene que poder ir viendo pedidos, envíos y totales durante la noche. Antes
el botón leía la noche entera al abrirse (~60-100 lecturas), y por eso tenía ventana horaria. El
listener cuesta ~1 lectura por viaje cerrado, más los cambios: en una noche de 60 deliverys son
~60 en vez de ~100, y abrir las Métricas no cuesta nada. Al recargar dentro de los 30 minutos,
Firestore manda solo los cambios.

**Detalle**: es un rango sobre **un solo campo**, así que alcanza el índice automático. Filtrar
por `estadoDelivery` y por fecha a la vez habría pedido un índice compuesto.

## Al repartidor le paga el encargado, desde el F4

**Qué**: el F4 lee, además de los pedidos, el documento de asistencia de la noche (1 lectura), y
muestra a cada repartidor su **base** (`horas × valorHora − descuento` de su registro) más sus
**envíos**. Ya no hay fijo: `REACT_APP_fijoDeliverys` se eliminó el 28-09-2026.

**Por qué**: a los repartidores se les paga cada noche, y quien cierra la noche es el encargado.
Antes la jefa anotaba los envíos a mano y se los pasaba; ahora salen de los pedidos. La base sale
de la asistencia porque el repartidor es un empleado más: llegar tarde o devolver un préstamo son
descuentos, como para cualquiera. Un registro sin salida todavía no tiene base, y el F4 lo avisa.

**Consecuencia**: la Liquidación de Asistencias del admin también les suma los envíos, del
resumen guardado de cada noche. Es un registro del trabajo hecho —una noche da lo de esa noche; un período,
la suma—, no de a quién se le pagó.

## Una solicitud web, un solo cajero

Ver [[Flujo del pedido#Asignación de solicitudes web — un solo dueño]]. Se descartaron el
timeout de 5 minutos, `runTransaction` y los campos extra por over-engineering. La solución
final no agrega **ninguna** lectura ni escritura.

El 03-10-2026 se sumó la liberación a los **15 minutos**, porque una solicitud trabada no tenía
salida: la hora de la toma (`cajeroRevisaTimestamp`) va en la misma escritura de la toma, y la
regla compara contra ella. Sigue sin lecturas.

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

**Productos (el ABM del admin) va igual desde el 28-09-2026.** Con `getDocs`, cada visita
releía todos los productos y las categorías; con listener, volver a entrar trae solo lo que
cambió. Firebase cobra como consulta nueva un listener que estuvo desconectado más de 30 minutos.
Además **se borró código**: la tabla ya no se actualiza a mano después de cada alta, edición,
ocultamiento o borrado (ni la de productos ni la del modal Categorías). El listener muestra cada
escritura al instante y la vuelve atrás si falla. Crear y Editar solo avisan con `onGuardado`, para
que titile "Publicar Menú". Detalles:

- Las consultas de productos y de categorías son **idénticas** a las de `useTraerDatos`: en una
  PC que abre las dos pantallas, se comparte la caché. (La de productos no lo era hasta el
  16-10-2026: la Caja filtraba `visible`.)
- Se fue el `orderBy("descripcion", "desc")`: la lista se ordena igual con `localeCompare`.

## El pedido de Caja tiene id fijo, y solo el reintento lee

**Qué**: `Caja.guardarBD` genera el id del pedido en el primer intento (`pedidoEnCurso`, un
`useRef`) y lo reusa hasta `limpiar()`. Si un intento falla, el siguiente lee ese pedido dentro de
la transacción: si ya existe, el anterior llegó a guardarse, y se muestra "el pedido ya se había
guardado" sin escribir nada (14-10-2026).

**Por qué**: si internet se corta justo después de que Firebase guardó el pedido, la Caja ve un
error. Con un id nuevo por click, el reintento creaba un **segundo** pedido con otro número. El
guardado normal no cuesta nada extra: la lectura es solo del reintento después de un error.

## Sin conexión, las acciones avisan antes de escribir

**Qué**: `sinConexion()` en `Utils/avisos.js` mira `navigator.onLine` al tocar un botón que escribe
con `updateDoc`/`writeBatch` (Cocina, ATP, F1, F2, F3, Deliverys, Historial). Sin conexión, cartel y
no se escribe (14-10-2026).

**Por qué**: con la caché persistente, esas escrituras sin conexión **no fallan**: quedan en cola,
el botón se queda en "Cargando…" y el `catch` nunca corre. "Crear Pedido" no lo necesita: es una
transacción, y sin conexión falla y avisa. `navigator.onLine` es instantáneo y sin red; no detecta un
proveedor caído con el wifi andando, y el dueño decidió no cubrir ese caso con una espera.

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

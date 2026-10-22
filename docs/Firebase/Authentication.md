---
tags: [gardenburger, firebase, auth, seguridad]
aliases: [Auth, Login, Sesion, Usuarios y roles, Claims]
actualizado: 2026-10-22
---

# Authentication

↑ [[Firebase]]

El staff entra con **correo y contraseña**. El cliente de la web no tiene cuenta. Los repartidores
tampoco: existen en `usuarios` sin cuenta de Auth.

## La sesión

- **`AuthContext`** (`src/context/AuthContext.js`): `useAuth() → { userData, login, logout }`. Al
  loguear lee `usuarios/{uid}` (**1 lectura por login**: `login()` y `onAuthStateChanged` comparten
  la promesa en vuelo), fija la sucursal del staff para `colSucursal`/`docSucursal` y calcula las
  `iniciales` (las del código de ticket).
- **Antes de leer, `await user.getIdToken()`**: sin eso la lectura salía sin credencial y la regla
  la rechazaba con `permission-denied`, al azar.
- **Desloguea a quien tenga `activo: false`**, como respaldo mientras siga vigente un token ya
  emitido. Si el perfil no existe, `login()` cierra la sesión de Auth para no dejarla a medias.
- **La sesión es por pestaña** (`browserSessionPersistence`). Es la razón de que la caché de
  Firestore vaya en modo una sola pestaña: *Firestore › Persistencia en IndexedDB, modo una sola pestaña*.
- `AuthContext` solo existe bajo la rama del staff: *Frontend › Árbol de providers*.

### `initializeAuth`, sin iframe

`firebase.js` arranca Auth con `initializeAuth(app, { persistence: browserSessionPersistence })` y no
con `getAuth()` (04-10-2026). `getAuth()` suma un `popupRedirectResolver` que carga al arrancar un
iframe de `gardenburger.firebaseapp.com`, que solo sirve para entrar con Google o Facebook. Acá no se
prevé otro proveedor: es una descarga menos en cada carga, también en la web pública. Si algún día
se suma uno, va `popupRedirectResolver: browserPopupRedirectResolver` en el mismo
`initializeAuth`.

## Roles

Los valores de rol viven en el `.env` (`REACT_APP_admin`, `_encargado`, `_cajero`, `_cocina`,
`_jefeDeliverys`, `_delivery`, `_atp`): son ilegibles a propósito y **nunca se escriben a mano**.

`ROLES` (`Constantes.jsx`) reúne todo lo de cada rol: la clave es el valor crudo y el valor trae
`nombre`, `nroOrden` (el orden en selects y tablas: Admin, Encargado, Cajero, Cocina, ATP, Jefe de
Deliverys, Delivery), `rutaInicial` (dónde aterriza), `editable` (si el admin lo puede asignar: solo
Admin dice que no), `llevaMoto` y `sinAcceso`. De ahí salen `ROLES_EDITABLES` (los selects de alta y
edición) y `ordenDeRol()`. Qué hace cada uno en el negocio: *Sectores*.

## Todos los empleados viven en `usuarios`

Los repartidores dejaron de tener su colección `sucursales/{id}/deliverys` y son documentos de
`usuarios` con el rol delivery y `sinAcceso: true`: cobran, tienen valor hora y aparecen en la
liquidación, y dos colecciones de personas obligaban a duplicar alta, baja y búsqueda.

- **El nombre es `nombreCompleto`**, no `nombre`. La referencia vieja reventaba `JefeDeliverys` con
  dos o más repartidores (con uno solo el `sort` nunca compara).
- **`sinAcceso` lo decide el rol** (`ROLES[rol].sinAcceso`), no un check: significa **sin cuenta de
  Auth**, así que su alta es un `addDoc` desde el Panel Admin y no pasa por la Cloud Function.
- **Al editar, el rol no cruza esa frontera**: el selector solo ofrece roles de la misma clase que
  el `sinAcceso` guardado del empleado, y `handleEditEmpleado` lo vuelve a validar. Un repartidor
  pasado a cajero no podría loguearse, y un cajero pasado a repartidor conservaría usuario y clave
  sin ver ningún módulo; si de
  verdad cambia de puesto, se lo da de baja y se crea de nuevo (26-09-2026).

## Alta y baja de empleados

El cliente **nunca** crea ni borra cuentas de Auth: lo hacen las *Cloud Functions*, que validan
que quien llama sea admin.

- **Alta con acceso**: `crearUsuario` → cuenta de Auth + `usuarios/{uid}` con `activo: true`. Acepta
  cualquier correo válido. Si el documento falla, borra la cuenta recién creada.
- **Alta sin acceso** (repartidores): `addDoc` directo; el formulario pide la moto en vez de correo y
  clave.
- **Baja**: `darDeBajaUsuario` → borra la cuenta de Auth y deja el documento con `activo: false` +
  `bajaTimestamp`. **No se reactiva**: si la persona vuelve, se crea de cero. No se puede dar de baja
  a un admin ni a uno mismo.

## Ser admin es un claim en el token

La regla es `request.auth.token.admin == true`, y el claim lo reparte la función
`sincronizarClaims`. Antes `esAdmin()` era un `get()` a `usuarios` facturado en cada evaluación, y
obligaba a escribir el valor del rol dentro de la regla; con el claim no se lee nada.

- **Los admins se crean solo desde la Consola de Firebase.** La app no ofrece el rol y `crearUsuario`
  lo rechaza del lado del servidor. Después hay que tocar **"Sincronizar permisos"** en el Panel
  Admin, y esa persona tiene que **volver a iniciar sesión**: el claim viaja en el token.
- **"Sincronizar permisos" solo lo ve el dueño** (`EMAIL_SUPERADMIN`). Es visual: la función exige
  ser admin igual, y al dueño no le importa que su correo quede en el JavaScript público.
- **Las Functions aceptan claim *o* rol en Firestore**; las reglas, solo el claim. No es una
  inconsistencia: un admin recién creado en la Consola todavía no tiene claim, y sin ese respaldo no
  podría ni invocar `sincronizarClaims`.
- El efecto secundario: una regla por rol pasó a costar cero. Con ese dato se volvió a evaluar
  cerrar `asistencias` y el dueño decidió dejarla abierta.

## Mi Perfil es de solo lectura

El empleado no edita sus datos: con `write` abierto sobre su propio documento, un cajero podía
ponerse rol admin desde la consola del navegador. La regla de `usuarios` es lectura para el staff y
escritura solo para el admin; lo único que el empleado cambia es su contraseña, por Auth. Si un dato
está mal, lo corrige el admin desde el Panel Admin.

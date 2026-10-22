---
tags: [gardenburger, firebase, hub]
aliases: [Backend, Infraestructura]
actualizado: 2026-10-22
---

# Firebase

↑ [[GardenBurger]]

Todo el backend es Firebase, en un solo proyecto (`gardenburger`, plan Blaze), con el SDK 12
modular. Se inicializa en `src/firebaseConfig/firebase.js`.

| Servicio | Para qué | Nota | Su seguridad |
|---|---|---|---|
| **Firestore** | Todos los datos: pedidos, catálogo, personal, sucursales, resúmenes, asistencias | [[Firestore]] | `firestore.rules`: *Reglas de Firestore* |
| **Authentication** | El login del staff, con correo y contraseña; la sesión es por pestaña | [[Authentication]] | el claim `admin` en el token |
| **Storage** | `menu.json` (la web pública), las fotos de producto, los TSV del sistema viejo | [[Storage]] | `storage.rules` |
| **Cloud Functions** | La hora oficial y lo que necesita Admin SDK: alta y baja de cuentas, permisos de admin | [[Cloud Functions]] | cada función exige ser admin |
| **App Check** | Que solo la app propia hable con Firestore y Auth | abajo | reCAPTCHA Enterprise |

**Las lecturas de Firestore son un requisito de primer orden.** La cuota gratuita es de 50.000
lecturas por día, y aplica también en Blaze. Antes de agregar una consulta, preguntarse si el dato ya
está en memoria. El costo de cada operación: *Mapa de operaciones Firestore*.

## App Check

Se usa por seguridad: **reCAPTCHA Enterprise**, en modo **Aplicada** para Firestore y
Authentication. Sin un token válido, rechazan con `permission-denied`, **igual que un problema de
reglas**.

> [!tip] Un permission-denied aleatorio casi nunca es App Check
> Mirar la columna **"no verificadas"** en Consola → App Check: si Firestore va 100 % verificado, el
> problema es la credencial (`request.auth == null`). El caso real que costó tiempo era una lectura
> que salía antes de que el ID token estuviera listo; se arregló con `await user.getIdToken()` en
> `AuthContext`.

- **En localhost** la clave de reCAPTCHA no vale: hace falta el **debug token**, que se imprime en
  consola en cada arranque y se guarda en `REACT_APP_appCheckDebug` para que deje de cambiar.
- **Ruido de consola que no es error**: `Unrecognized feature: 'private-token'` y un `POST
  .../recaptcha/enterprise/pat 401` en cada arranque, del script de Google. No se pueden silenciar.
- **La API key del navegador está restringida por referrer**, y tiene que admitir
  `https://gardenburger.firebaseapp.com/*`: desde ahí se abre "Olvidé mi contraseña" (sin eso,
  `API_KEY_HTTP_REFERRER_BLOCKED`, 28-09-2026).

## La configuración se versiona

`firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` y `functions/src` están en el
repo desde el 07-09-2026, y se despliegan con `firebase deploy`. Antes las reglas se pegaban a mano
en la Consola; cambió por dos problemas: la documentación había divergido de lo desplegado, y el
código de las Functions vivía solo en un disco, sin respaldo.

- **Lo que queda afuera**: el `.env` de la raíz y `functions/.env` (tiene `ADMIN_ROL`), y **los
  índices**: `firebase.json` no declara la clave `indexes` a propósito, para que ningún deploy pueda
  borrarlos por omisión. Se crean desde la Consola, con el link que devuelve Firestore cuando falta
  uno (*"los índices no me interesa tenerlos en código"*, el dueño).
- **Las reglas las despliega el dueño.** Un asistente edita `firestore.rules` / `storage.rules` y
  no despliega sin pedido.

```bash
npx firebase deploy --only firestore:rules,storage   # las dos reglas
npx firebase deploy --only functions                 # compila con tsc antes (predeploy)
```

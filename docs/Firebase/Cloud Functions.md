---
tags: [gardenburger, firebase, functions]
aliases: [Functions, Callables, functions/src/index.ts]
actualizado: 2026-10-22
---

# Cloud Functions

↑ [[Firebase]]

Cuatro funciones *callable*, en TypeScript, en `functions/src/index.ts` (versionado). Corren en
Node 24 con `firebase-admin` 14 y `firebase-functions` 7, y `maxInstances: 10` como tope de costo.
El deploy compila con `tsc` antes (`predeploy`).

| Función | Quién la llama | Qué hace |
|---|---|---|
| `horaServidor` | `LayoutStaff`, al entrar el staff | devuelve `Date.now()`: la hora oficial contra la que cada PC calcula su desfase (*Jornada y horarios › La hora sale del servidor*) |
| `crearUsuario` | Panel Admin, alta con acceso | crea la cuenta de Auth y el documento en `usuarios` |
| `darDeBajaUsuario` | Panel Admin, baja | borra la cuenta de Auth y deja el documento con `activo: false` |
| `sincronizarClaims` | Panel Admin, "Sincronizar permisos" (solo el dueño la ve) | reparte el claim `admin` según el rol guardado; sin `uid`, a todos |

Qué significan para el negocio: *Authentication › Alta y baja de empleados* y
*Authentication › Ser admin es un claim en el token*.

## Cómo validan que sea admin

`exigirAdmin()`: primero mira el claim del token (sin lecturas); si no está, lee `usuarios/{uid}` y
compara el rol con `ADMIN_ROL`. **Ese respaldo se queda para siempre, a propósito**: un admin recién
creado en la Consola tiene el rol en `usuarios` pero todavía no el claim, y sin el respaldo no podría
invocar `sincronizarClaims` para otorgárselo. El `||` cortocircuita: en operación normal no se lee
nada. En las reglas no hay respaldo: ahí es claim y punto.

**`ADMIN_ROL`** está en `functions/.env` (no versionado) y **es igual a `REACT_APP_admin`** del
`.env` de la raíz. Si cambia uno, cambiar el otro.

## Lo que cuida cada una

- **`crearUsuario`** no confía en el cliente para `correo`, `activo`, `sinAcceso` ni `timestamp`
  (los fuerza), no guarda la contraseña, exige 6 caracteres y **rechaza el rol admin**: sacarlo del
  select no alcanza, se repone con las devtools. El resto del perfil se escribe tal cual, así un
  campo nuevo del alta no obliga a redeployar.
- **El alta compensa en vez de transaccionar**: no hay transacción posible entre Auth y Firestore. Si
  el documento falla después de crear la cuenta, la borra; sin eso quedaría una cuenta huérfana con el
  correo tomado, que rompe `AuthContext`.
- **`darDeBajaUsuario`** no deja dar de baja a un admin ni a uno mismo. Si la cuenta ya no estaba,
  igual marca el documento. Reintentar corrige un fallo a mitad de camino: no necesita cambios
  (dueño, auditoría 11-10-2026).
- **`sincronizarClaims`** saltea a los `sinAcceso` (no tienen cuenta) y no corta el backfill si un
  documento no tiene usuario.

## `horaServidor` sin App Check, por decisión

Es pública: cualquiera la invoca y cada invocación se factura. Se decidió no cerrarla porque solo
devuelve la hora —no expone nada— y tiene que ser lo más rápida posible. Por si se reconsidera: no
agregaría latencia real, porque cuando corre el token de App Check ya está emitido por la lectura del
login.

## firebase-admin 14

La versión 14 quitó el `import * as admin`: cada servicio sale de su entrada (`firebase-admin/app`,
`/auth`, `/firestore`). Se migró el 04-10-2026 (unas 13 líneas, la lógica igual); los códigos de error
que se chequean (`auth/user-not-found`, `auth/email-already-exists`) no cambiaron.

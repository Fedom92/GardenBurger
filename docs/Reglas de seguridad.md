---
tags: [gardenburger, firestore, seguridad]
---

# Reglas de seguridad

← [[GardenBurger]] · resumen y contexto en [[Modelo de datos Firestore#Reglas de seguridad]]

> [!important] El texto vive en el repo, no acá
> Las reglas son **`firestore.rules`** y **`storage.rules`** en la raíz, declaradas en
> `firebase.json` y versionadas. Esta nota explica el *porqué*; el *qué* está en esos archivos.
>
> Antes se pegaban a mano en la Consola y esta nota era la copia de referencia. Ya no:
> [[Decisiones tecnicas#La configuración de Firebase se versiona]].

## Desplegar

```bash
npx firebase deploy --only firestore:rules
npx firebase deploy --only storage
```

> [!warning] Los índices NO se manejan desde el repo
> `firebase.json` **no declara** la clave `indexes`, a propósito: así ningún deploy puede tocarlos
> ni borrarlos por omisión. Se crean desde la Consola, con el link que Firestore devuelve cuando
> falta uno.

## Las cuatro cosas que hay que entender

### `read` es `get` **y** `list`

`allow read` otorga las dos cosas: leer un documento por id (`get`) y **consultar la colección**
(`list`). No son lo mismo desde el punto de vista de una fuga: una condición que se evalúa
documento por documento —como `resource.data.origen == "WEB"`— la satisface una query que filtre
por ese campo, así que **la query está permitida y devuelve todo lo que matchea**.

> [!danger] Así se expusieron los datos de los clientes web, hasta el 14-09-2026
> `pedidos` tenía `allow read: if estaAutenticado() || esOrigenWeb()`: cualquiera, sin sesión, podía
> correr `where("origen","==","WEB")` y llevarse nombre, teléfono y dirección de toda la clientela.
> El slug de la sucursal es público y App Check no protege desde el sitio real.
>
> Hoy está separado: `allow get` (público solo para origen WEB) y `allow list: if estaAutenticado()`.
> No rompió nada porque `PaginaDetalle` lee con `getDoc` por id — la app nunca necesitó `list`
> público. Ver [[Auditoria 2026-09#1 · P0 · Cualquier visitante puede listar los datos de todos los clientes web]].

**Regla práctica:** cada vez que se escriba `allow read` sobre datos con información personal,
preguntarse si la app realmente necesita `list`. Casi nunca lo necesita.

### Las reglas se combinan con OR

Una regla más específica **no restringe** lo que un wildcard ya otorgó. Por eso, para cerrar una
subcolección hay que **excluirla del wildcard** — que es lo que se hace con `pedidos`:

```js
match /{coleccion}/{documento} {
  allow read, write: if estaAutenticado() && coleccion != 'pedidos';
}
```

Es el motivo por el que hoy `asistencias` es escribible por cualquier staff: cae bajo ese wildcard.
Ver [[Asistencias y liquidacion#Seguridad]].

### Los `get()` adentro de una regla se facturan

Evaluar una regla no cuesta nada, pero cada `get()`/`exists()` es una lectura facturada. Como `||`
cortocircuita, las condiciones baratas van primero.

**Hoy no queda ninguno.** `esAdmin()` era un `get()` a `usuarios`; ahora es
`request.auth.token.admin == true`, que sale del token y es gratis. Eso significa que **cerrar
`asistencias` por rol ya no tiene costo**, que era la única razón por la que estaba abierta.

### Ser admin va en el token

El claim lo reparte la Cloud Function `sincronizarClaims`. Los admins se crean **a mano desde la
Consola de Firebase** —la app no puede asignar ese rol, y `crearUsuario` lo rechaza server-side—,
así que después de crear uno hay que entrar al PanelAdmin y tocar **"Sincronizar permisos"**.

> [!caution] Toma efecto al re-loguearse
> Los claims viajan en el token. Quien ya tenía la sesión abierta sigue con el token viejo hasta
> que vuelve a iniciar sesión.

**Asimetría deliberada**: las reglas miran **solo el claim**, pero las Cloud Functions aceptan
*claim o rol en Firestore*. El respaldo de Firestore en las Functions es el camino de recuperación:
un admin recién creado en la Consola todavía no tiene claim, y sin ese respaldo no podría ni
invocar `sincronizarClaims` para otorgárselo. En operación normal el `||` corta antes y no se lee
nada.

## Qué valida `esCreacionPublicaValida()` y qué no

Es la única puerta por la que un visitante sin sesión escribe en Firestore, así que conviene tener
escrito exactamente hasta dónde llega.

**Valida** (forma del documento):

- `origen == "WEB"` y `estado == "PENDIENTE"` — no se puede crear un pedido ya confirmado.
- Presencia de `cliente`, `carrito`, `total`, `estado`, `origen`, `clienteTimestamp`.
- **Ausencia** de `cajeroID`, `cocineroID` y `deliveryID` — nadie se auto-adjudica el pedido.
- `carrito` es una lista de 1 a 50 ítems.
- `total` es un número entre 0 y 1.000.000.

**No valida** (contenido):

- Que los **precios** coincidan con el catálogo.
- Que `total` sea la suma del carrito. Un pedido de 50 hamburguesas con `total: 1` pasa.
- La forma de cada ítem: se cuenta la lista, no se mira adentro.
- Que el teléfono, el nombre o la dirección sean plausibles.
- **Cuántas** solicitudes crea un mismo visitante — no hay rate limiting. App Check encarece el
  abuso automatizado, pero no lo impide desde el sitio real.

Está bien que sea una validación de forma: validar precios exigiría un `get()` facturado por ítem.
El lugar correcto para el contenido es **el cajero al Revisar**, con el catálogo que la Caja ya
tiene en memoria. Ver [[Auditoria 2026-09#2 · P1 · Los precios de una solicitud web los pone el cliente]].

## `update`: valida la asignación, no el estado

```js
allow update: if estaAutenticado() && asignacionValida();

function asignacionValida() {
  let antes = resource.data.get('cajeroRevisaID', null);
  let despues = request.resource.data.get('cajeroRevisaID', null);
  return despues == antes || antes == null || antes == request.auth.uid;
}
```

`asignacionValida()` es lo que hace atómica la toma de una solicitud web: `cajeroRevisaID` solo se
puede escribir si estaba libre o ya era de quien escribe. Compara `resource.data` (lo que hay)
contra `request.resource.data` (lo que se quiere escribir) — **sin cobrar lecturas**. Toda
escritura que no toque ese campo (cocina, MP, ATP, delivery, eliminar) pasa por `despues == antes`.

| Escritura | `antes` | `despues` | Resultado |
|---|---|---|---|
| Tomar libre | null | yo | ✅ |
| Tomar ajena (la carrera entre dos cajeros) | otro | yo | ❌ `permission-denied` |
| Retomar la propia (PC reiniciada) | yo | yo | ✅ |
| Liberar o guardar (`deleteField`) | yo | null | ✅ |
| Cualquier update que no toque el campo | x | x | ✅ |

Del lado del front, `useRevisarSolicitud` distingue el `permission-denied` y avisa "Otro cajero ya
tomó esta solicitud"; el listener del modal actualiza el badge solo.

**Lo que sigue sin validarse es el `estado`**: cualquier staff puede llevar un pedido de cualquier
estado a cualquier otro. Ver [[Modelo de estados#Transiciones que el sistema permite y no debería]].

## Storage: `publico/`

La carpeta `publico/` aloja `menu.json`, que genera el botón "Publicar Menú" de Productos.
Necesita **lectura pública** para que `/menu` lo consuma sin autenticación y sin lecturas de
Firestore. **La escritura es solo del admin**, con el mismo claim que Firestore.

> [!note] La lectura del resto del bucket queda en "autenticado", a propósito
> Las imágenes de producto se sirven por URL con token de descarga, que **saltea las reglas**: por
> eso el menú público las muestra sin sesión aunque la regla pida autenticación.

## Storage: el resto del bucket solo acepta imágenes de hasta 5 MB

```
match /{allPaths=**} {
  allow read: if request.auth != null;
  allow create, update: if esAdmin() && esImagenValida();
  allow delete: if esAdmin();
}

function esImagenValida() {
  return request.resource.size <= 5 * 1024 * 1024
      && request.resource.contentType.matches('image/.*');
}
```

Es el mismo tope de 5 MB que ya valida el front en `CrearProducto` y `EditProducto`, pero del lado
del servidor, que es lo único que no se saltea con las devtools. Es lo único que se sube por esta
vía (`productos/…`); `menu.json` entra por la regla de `/publico`, que se combina con OR y ya lo
permite aunque no sea imagen.

Dos detalles que rompen si se tocan:

- **`create, update` van separados de `delete`** porque en un borrado `request.resource` es null y
  `esImagenValida()` tiraría. La app no borra archivos, pero la regla queda correcta.
- **`uploadBytes` sin `contentType` en metadata** usa el `type` del `File` (`image/png`,
  `image/webp`…). Si alguna vez se pasa metadata con `contentType` explícito, tiene que seguir
  siendo `image/*` o la regla lo rechaza.

Ver
[[Decisiones tecnicas#`menu.json` depende de tres capas]].

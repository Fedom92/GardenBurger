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

## Las tres cosas que hay que entender

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

## Storage: `publico/`

La carpeta `publico/` aloja `menu.json`, que genera el botón "Publicar Menú" de Productos.
Necesita **lectura pública** para que `/menu` lo consuma sin autenticación y sin lecturas de
Firestore. **La escritura es solo del admin**, con el mismo claim que Firestore.

> [!note] La lectura del resto del bucket queda en "autenticado", a propósito
> Las imágenes de producto se sirven por URL con token de descarga, que **saltea las reglas**: por
> eso el menú público las muestra sin sesión aunque la regla pida autenticación.

Ver
[[Decisiones tecnicas#`menu.json` depende de tres capas]].

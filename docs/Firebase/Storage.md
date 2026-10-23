---
tags: [gardenburger, firebase, storage, seguridad]
aliases: [Cloud Storage, storage.rules, menu.json]
actualizado: 2026-10-23
---

# Storage

↑ [[Firebase]]

| Carpeta | Qué tiene | Lectura | Escritura |
|---|---|---|---|
| `publico/` | **`menu.json`**: la copia del catálogo, las sucursales y las zonas de envío que lee la web | pública | admin, y solo ese archivo |
| `productos/` | las fotos de producto, en WebP | staff (el público las ve por URL con token) | admin, solo imágenes de hasta 5 MB |
| `privado/estadisticas/` | `ventas.tsv` y `pagos.tsv` del sistema viejo | **solo admin** | solo admin |

## `menu.json`

La web pública no lee el catálogo de Firestore: lee **`publico/menu.json`**, que genera "Publicar
Menú" (`publicarMenu()` en `Utils/menuPublico.js`) con los productos y categorías **no privados**,
las sucursales activas y las zonas de envío. Ahorra todas las lecturas del tráfico público, que es el de más volumen. A
cambio, **puede estar desactualizado** respecto de Firestore hasta que alguien publique. Las
sucursales se republican solas al guardarlas (`publicarSucursales()`, que parte del JSON ya
publicado: llamar a `publicarMenu()` publicaría de rebote cambios de productos a medio hacer). Las
zonas de envío, igual, al guardarlas en Envíos (`publicarEnvios()`, con la lista que el ABM ya
tiene en memoria: 0 lecturas).

Para que funcione tienen que estar bien **las tres capas**:

1. Las **reglas** (`publico/` con lectura pública).
2. El **CORS del bucket**, que es una capa aparte de las reglas y se configura con `gsutil cors set`.
3. El **archivo publicado**.

> [!caution] El respaldo tapa la falla
> Si algo de eso falla, la web y `/menu` caen al respaldo de Firestore (`fetchCatalogoPublico`) y
> **siguen andando**: solo se ve un warning en consola mientras se pagan las lecturas que se
> suponían ahorradas.

- **Caché**: se sube con `max-age=60`. Durante ese minuto el navegador ni pregunta (un precio recién
  publicado se ve con Ctrl+F5); después revalida y Storage responde 304 sin cuerpo.
- **Copia en memoria**: `fetchMenuPublico` guarda la descarga mientras la pestaña esté abierta (y en
  desarrollo el recargado en caliente la conserva). Si un dato recién publicado no aparece pero los
  productos sí, el primer paso es **Ctrl+F5**. `publicarMenu` descarta esa copia.
- Cuándo titila el botón y por qué una bandera: *Catálogo › Publicar el menú*.

## Fotos de producto

"Subir archivo" en Crear/Editar producto pasa por `subirImagenProducto()` (`Utils/imagenes.js`):
achica la foto a **1200 px de lado** y la pasa a **WebP** (calidad 0,85) en el navegador del admin, y
recién ahí la sube a `productos/`. La foto de una cámara pesa 4-6 MB y se ve a 86 px en la Caja y a
128 px en la web; medido: **5 MB → 200 KB**. Lo que baja el peso es la resolución (en WebP sin
achicar quedaba en 2,6 MB). Se guardan con caché de un año.

| Alternativa descartada | Por qué no |
|---|---|
| `browser-image-compression` | Sin versiones desde 2023 y baja su propio código de un CDN; lo que suma sirve cuando suben fotos los clientes |
| Extensión "Resize Images" de Firebase | Sube el original, se paga cada ejecución y se guarda todo dos veces |
| Un CDN de imágenes | Otra cuenta y otro servicio para algo que resuelve el navegador |

- **Las HEIC del iPhone no abren en Chrome de Windows**: el admin ve `IMAGEN_ILEGIBLE` y la exporta
  a JPG. Safari no genera WebP desde un canvas: sube PNG, pesa más y funciona.
- Si la original pesaba menos que el WebP, se sube la original. Las fotos viejas no se convierten
  solas: se vuelven a subir desde Editar.
- **El modo "Link URL" acepta cualquier dirección, y los links de Google Drive fallan**: Drive no es
  un servidor de imágenes, redirige a un host que limita por IP (**429 Too Many Requests**), y las
  PCs del local comparten IP y la Caja pide todas las fotos juntas. Además cada link es un viaje de
  más sin caché y la foto llega de 220 px. La salida es "Subir archivo" y después Publicar Menú. Por
  decisión del dueño el campo **no** rechaza links de Drive (28-09-2026).

## Los TSV de Estadísticas, en una carpeta privada

`ventas.tsv` y `pagos.tsv` los sube el admin a mano desde la Consola a `privado/estadisticas/`, y las
Estadísticas Históricas los bajan al montar. **Antes vivían en `public/CSV/`**, y todo lo que está en
`public/` **se copia al build y el hosting lo sirve sin sesión**: `pagos.tsv`, con 43.039 filas con
nombre, dirección y teléfono de cada pedido, respondía a cualquiera que supiera la URL (el P0 de la
auditoría del 15-09).

- **Se leen con `getBytes()`, nunca con la URL de descarga** (`getDownloadURL()`): la URL con token
  **saltea las reglas** —es lo que hace que las fotos se vean sin sesión—, y para un archivo privado sería el
  mismo agujero con otra forma. `getBytes()` va con el token del usuario y pasa por la regla.
- Se descartó un `<input type="file">` (obligaba a elegir los dos archivos cada vez).
- Los 10,5 MB no se pagan en cada apertura: Storage manda un ETag, el navegador revalida y recibe
  304 (verificado el 26-09-2026). Por eso se descartaron el gzip y un `Cache-Control` propio. Si se
  re-exportan, el ETag cambia y baja los nuevos solo.
- Si los archivos no están, o el admin tiene el rol pero todavía no el claim, la pantalla dice
  exactamente eso.

> [!danger] `public/` es público
> La carpeta `public/` del repo no es Firebase: no tiene reglas, sesión ni App Check, es un
> servidor de archivos. **Nada con datos de nadie va ahí.**

## `storage.rules`

```
match /publico/{archivo} {
  allow read: if true;
  allow write: if esAdmin() && archivo == "menu.json";
}
match /privado/{ruta=**} {
  allow read, write: if esAdmin();
}
match /{carpeta}/{ruta=**} {
  allow read: if request.auth != null && carpeta != 'privado';
  allow create, update: if esAdmin() && esImagenValida();   // imagen de hasta 5 MB
  allow delete: if esAdmin();
}
```

Detalles que rompen si se tocan:

- **`{ruta=**}` y no `{archivo}` en `privado`**: la ruta real tiene dos segmentos.
- **El comodín de abajo excluye `privado`**, porque las reglas se combinan con OR y su lectura para
  cualquier staff le ganaría a la de admin. La exclusión usa un comodín de **un** segmento
  (`{carpeta}`) para que sea un string: con `{todo=**}` es un Path, y `.matches()` sobre un Path es
  un error que **deniega** en silencio.
- **`create, update` separados de `delete`**: en un borrado `request.resource` es null y
  `esImagenValida()` fallaría.
- **`uploadBytes` sin `contentType`** usa el tipo del archivo (`image/webp`). Si alguna vez se pasa
  uno explícito, tiene que seguir siendo `image/*`.
- El tope de 5 MB es la red para lo que no pase por `imagenes.js` (las devtools): el admin no llega.
- **La lectura del resto queda en "con sesión", a propósito**: las imágenes se sirven por URL con
  token, que saltea las reglas, y así el menú público las muestra igual.

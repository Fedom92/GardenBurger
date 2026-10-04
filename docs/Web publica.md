---
tags: [gardenburger, web-publica, deuda]
aliases: [Web pública, Menú online, Carrito web, Solicitudes web]
actualizado: 2026-10-04
---

# Web pública

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Arquitectura y rutas]], [[Reglas de seguridad]], [[Deuda tecnica]] · vocabulario en [[Glosario]]

Lo que ve el cliente: elegir sucursal, armar el pedido, seguirlo y mirar la carta. Vive en
`src/components/Solicitudes/`, en `src/context/CartContext.jsx` y en la sección "Wally css" de
`src/style/Main.css`.

> [!warning] Código heredado, para rehacer
> Lo escribió **otro desarrollador**. Funciona, pero la lógica cuesta seguirla, está poco
> modularizada y el front es pobre. **Decisión del dueño (04-10-2026): algún día se rehace al
> 100%.** Hasta entonces, arreglos puntuales sin reescribir. Esta nota es el mapa para ese día: qué
> hace cada pieza, qué contrato hay que respetar con la Caja, los bugs ya identificados y un plan.

| Quién lo escribió | Archivos |
|---|---|
| El otro desarrollador | `CartContext.jsx`, `Crearsolicitud.jsx`, `Card.jsx`, los tres modales, `Menu.jsx` + `menu.css`, `Footer.jsx` y la sección "Wally css" de `Main.css` |
| Él, y lo mejoramos un poco | `PaginaDetalle.jsx` |
| Nosotros, a partir de sus ejemplos | `SeleccionSucursal.jsx`, `WebCerrada.jsx` |

## Mapa rápido

| Ruta | Componente (líneas) | Qué hace | Firestore |
|---|---|---|---|
| `/crear-solicitud` | `SeleccionSucursal` (81) | Lista las sucursales; la cerrada, deshabilitada y con su horario | 0: sale de `menu.json` |
| `/crear-solicitud/:sucursal` | `Crearsolicitud` (504) | Catálogo en acordeones + carrito + formulario + crea la solicitud | 0 al navegar; 1 lectura + 1 escritura al comprar |
| ↳ fuera de horario | `WebCerrada` (41) | Cartel con el horario y un link al selector | — |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` (183) | Seguimiento del pedido en 5 pasos; el link vence a las 48 h | 1 por visita |
| `/menu` | `Menu` (172) | La carta, exportable a PDF | 0: sale de `menu.json` |

Piezas compartidas: `CartContext` (577 líneas: el carrito y el flujo de modales), `Card` (54, la
tarjeta de producto), `ModalHamburguesa` (108), `ModalExtras` (181), `ModalExtrasGenericos` (188)
y `Footer` (92). Los datos: `Utils/menuPublico.js` (publica y descarga `menu.json`) y
`Utils/sucursales.js`. Líneas al 04-10-2026.

> [!important] `CartProvider` envuelve **toda** la app
> Está en `App.js`, por fuera del router: lo montan también la Caja, Cocina y el resto del staff,
> aunque solo lo usan los componentes de `Solicitudes/`. No lee nada al montar, pero viaja en el
> bundle principal con el CSS de los toasts.

## Cómo fluye un pedido web

1. **`SeleccionSucursal`** lee las sucursales de `menu.json` (`fetchMenuPublico`) y decide con
   `webRecibePedidos()` cuáles están abiertas. Si el JSON falla, `fetchSucursales()` las lee de
   Firestore (2-3 lecturas).
2. **`Crearsolicitud`, al montar**, busca la sucursal de la URL en `menu.json`; si no está (una
   sucursal nueva sin publicar) lee su documento: 1 lectura. Cerrada → `WebCerrada`, **sin cargar
   el menú**. Abierta → `obtenerCategorias()` y `obtenerProductos()` del contexto, los dos de
   `menu.json`.
3. **El catálogo** son acordeones de Bootstrap: OFERTAS (los productos con `oferta`), HAMBURGUESAS
   (agrupadas por nombre, más las de POLLO CRISPY) y uno por cada categoría restante, sin las de
   hamburguesa, EXTRA ni POLLO CRISPY.
4. **"Agregar al pedido"** en una `Card` entra por una de cinco ramas (ver
   [[Web publica#La rama de cada tarjeta]]).
5. **Los modales** agregan al carrito con `agregarAlCarrito`: una línea por producto y una por
   extra. El carrito se guarda en `localStorage` en cada cambio.
6. **"Comprar"** (`comprar`, con `useAccionUnica` contra el doble toque):
   1. vuelve a mirar el horario con lo que tiene en memoria: la página pudo quedar abierta;
   2. lee la sucursal (1 lectura) y comprueba que exista, que esté activa y que siga en horario,
      con el dato fresco;
   3. hace el `setDoc` de la solicitud (ver [[Web publica#El documento que escribe]]);
   4. vacía el carrito, abre WhatsApp hacia la sucursal con un resumen y navega a `/ver-pedido`.
7. **`PaginaDetalle`** hace un `getDoc` del pedido y dibuja la barra de pasos. **No es en vivo**: el
   cliente ve el avance recargando.
8. **En la Caja**, la solicitud aparece en F1 (`PendientesSolicitudes`) y al tocar "Revisar"
   `useRevisarSolicitud` la carga en el ticket. Ver [[Flujo del pedido]].

## La rama de cada tarjeta

`Card.handleAgregar` decide por la categoría, **por su nombre** (ver
[[Web publica#Categorías con comportamiento propio]]):

| Producto | `grupo` | Qué se abre | Qué queda en el carrito |
|---|---|---|---|
| Hamburguesa agrupada (tiene `variantes`) | +1 | `ModalHamburguesa` (variante y observaciones) → `ModalExtras` (extras de hamburguesa) | la variante elegida con sus `observaciones`, y una línea por extra con `tipoExtra: "HAMBURGUESA"` |
| `BEBIDAS` | — | nada | una línea; si ya estaba, le suma 1 a `cantidad` |
| `POLLO CRISPY`, si hay extras de hamburguesa | +1 | `ModalExtras` directo, sin variantes | el producto y sus extras, igual que una hamburguesa |
| Cualquier otro, si existe algún extra `GENERAL` | +1 | `ModalExtrasGenericos` | el producto, y una línea por extra con `tipoExtra: "GENERAL"` y `productoAsociado` |
| Cualquier otro, sin extras `GENERAL` | +1 | nada | el producto |

Cancelar cualquier modal le resta 1 a `grupo`. El modal de extras genéricos se abre para **todo**
producto que no sea hamburguesa ni bebida, apenas existe un solo extra `GENERAL` en el catálogo.

### El campo `grupo`

Es un **contador global**, guardado en `localStorage` junto al carrito, que se estampa en cada
línea al agregarla: cada "Agregar al pedido" abre un grupo nuevo, y el producto y sus extras salen
con el mismo número. La identidad de una línea es el par **(`id`, `grupo`)**: lo usan `aumentar`,
`disminuir`, `eliminar` y la `key` de React del carrito.

- **Hasta el 04-10-2026 se llamaba `combo`**, y se confundía con los combos del arqueo
  (`CATEGORIAS_COMBOS`, el campo `combos` del pedido), que no tienen nada que ver. Se renombró por
  eso (ver [[Glosario]]). Las solicitudes y pedidos anteriores llevan `combo` en las líneas del
  carrito; nadie lo lee, así que da igual.
- **La Caja no lo usa**: viaja a Firestore y se ignora. La Caja y Cocina agrupan los extras **por
  posición**: cada extra pertenece al producto que tiene arriba. Cocina llama `grupos` a esa
  agrupación (`VerPedidoModal`): es la misma idea, calculada sin este campo.
- **El carrito web elimina con esa misma regla de posición** (04-10-2026): una línea se lleva los
  extras que tiene inmediatamente debajo. El `grupo` no sirve para eso: ver el bug 2 en
  [[Web publica#Bugs conocidos]].
- En los productos que se agregan sin modal, la línea sale estampada con el valor **anterior** al
  incremento: `aumentarGrupo()` y `agregarAlCarrito()` corren en el mismo click, y el
  `useCallback` todavía ve el `grupo` viejo. Hoy no rompe nada, pero el número no es confiable.

### Las hamburguesas se agrupan por el nombre

Cada variante es un producto propio (`categoria: "DOBLE"`, `descripcion: "Garden DOBLE"`). La web
las junta en una sola tarjeta **quitándole al nombre el sufijo** SIMPLE/DOBLE/TRIPLE
(`CATEGORIAS_HAMBURGUESA`). Esa regla está escrita **tres veces**, y no son iguales:

| Dónde | Cómo |
|---|---|
| `CartContext.limpiarNombreHamburguesa` | regex `\s+(SIMPLE\|DOBLE\|TRIPLE)$`, sin distinguir mayúsculas |
| `Menu.jsx` | regex ` (SIMPLE\|DOBLE\|TRIPLE)$`: un solo espacio y mayúsculas exactas. El precio de cada variante sale de su `categoria` |
| `ModalHamburguesa` | el rótulo de cada botón: `includes("DOBLE")` o `includes("TRIPLE")`; si no, "SIMPLE" |

Un producto cargado sin el sufijo, o con el sufijo en minúscula, queda como hamburguesa suelta o
mal agrupada, **sin aviso**. Y el sufijo del nombre tiene que coincidir con la categoría.

### Categorías con comportamiento propio

Están escritas **por su nombre** en el código de la web: renombrar una desde el ABM de Categorías
le cambia el comportamiento sin aviso.

| Nombre | Qué cambia |
|---|---|
| `SIMPLE`, `DOBLE`, `TRIPLE` | se agrupan en variantes (`CATEGORIAS_HAMBURGUESA`) |
| `BEBIDAS` | se suman en la misma línea; es el único producto con `−` y `+` en el carrito |
| `POLLO CRISPY` | usa los extras de hamburguesa y se muestra dentro del acordeón HAMBURGUESAS |
| `EXTRA` (con `tipoExtra` `HAMBURGUESA` o `GENERAL`) | no tiene acordeón: aparece en los modales |
| `COMBO GARDEN`, `GARDEN SIN PAPAS` | no se publican (`CATEGORIAS_SOLO_CAJA`) |

## El documento que escribe

`sucursales/{sucursal}/pedidos/{id nuevo}`, con `setDoc`:

```js
{
  cliente: {                        // el formulario tal cual (react-hook-form)
    nombre, telefono,               // telefono: 10 dígitos, sin 0 ni 15
    opcion: "Retira" | "delivery",  // ENVIOS_LOCALES[0], o el string "delivery"
    direccion?, entreCalles?,       // obligatorios solo con delivery
    metodoPago: "EFECTIVO" | "MP",
  },
  carrito: [{                       // cada línea es el producto de menu.json entero, más:
    ...producto,                    // id, descripcion, precio, categoria, imagen, ingredientes…
    grupo, cantidad, subtotal,      // grupo: hasta el 04-10-2026, combo
    observaciones?,                 // hamburguesa o pollo
    tipoExtra?, productoAsociado?,  // extras. productoAsociado no lo lee nadie desde el 04-10-2026
  }],
  total,                            // con el recargo de MP si corresponde (REACT_APP_recargoMP)
  estado: "PENDIENTE",              // ESTADOS.WEB_PENDIENTE
  origen: "WEB",
  clienteTimestamp: serverTimestamp(),
  mensajeWsp,                       // el resumen para WhatsApp, ya codificado para URL
  telefonoSucursal,                 // de la sucursal leída al comprar
}
```

**Qué hace la Caja con esto** (`useRevisarSolicitud`): pasa nombre, teléfono, dirección, entre
calles y método al formulario; junta las `observaciones` de cada línea en el campo general; con
`opcion` decide el modo (con delivery, la zona queda sin elegir); y copia el carrito **línea por
línea, en el mismo orden**, cambiando cada precio por el del catálogo en vivo. Lo demás
(`grupo`, `productoAsociado`, `subtotal`, `imagen`, `total`) no lo usa. Ver
[[Reglas de negocio#Validación del pedido web: forma, no contenido]].

> [!danger] Lo que un rehecho no puede romper
> - **El orden de las líneas**: cada extra de hamburguesa va inmediatamente después de su
>   hamburguesa. La Caja y Cocina agrupan por posición.
> - **Los valores de `cliente.opcion`** (`"Retira"` / `"delivery"`) y de `metodoPago`: los leen
>   `useRevisarSolicitud`, `PendientesSolicitudes` y `PaginaDetalle`.
> - **Lo que exige la regla** `esCreacionPublicaValida()`: `cliente`, `carrito`, `total`, `estado`,
>   `origen` y `clienteTimestamp`; un carrito de 1 a 50 líneas; un total de hasta 1.000.000; ningún
>   campo del staff. Ver [[Reglas de seguridad]].
> - **`telefonoSucursal` y `mensajeWsp`**: con ellos arma `PaginaDetalle` su botón de WhatsApp sin
>   leer la sucursal.
> - **Los carritos guardados en los navegadores**: viven en `localStorage` (`carritoWeb` y
>   `carritoWebGrupo`). Si cambia la forma de una línea, hay que descartarlos o migrarlos al
>   leerlos; si no, un cliente que vuelve carga un carrito con la forma vieja. Lo más simple es
>   cambiar la clave, como se hizo al renombrar `combo` (04-10-2026: eran `carrito` y `combo`): el
>   carrito viejo simplemente no se carga.

## Costo en lecturas

| Pantalla | Normal | Si `menu.json` falla |
|---|---|---|
| `SeleccionSucursal` | 0 | 2-3 (las sucursales) |
| `Crearsolicitud`, al navegar | 0 | 1 (la sucursal) + **todos los productos visibles y todas las categorías**, en cada visita |
| `Crearsolicitud`, al comprar | 1 lectura + 1 escritura | ídem |
| `PaginaDetalle` | 1 por visita, y 1 por cada recarga | — |
| `Menu` | 0 | todos los productos y las categorías |

El respaldo contra Firestore **tapa la falla en silencio**: la web anda igual, y lo único que se
nota es la factura. Ver [[Decisiones tecnicas#`menu.json` depende de tres capas]].

## Bugs conocidos

Verificados leyendo el código el 04-10-2026. Los dos que cambiaban lo que recibe la cocina (1 y 2)
se arreglaron ese mismo día, y el 3 se fue con el 1. El resto queda para el rehecho, o para un
arreglo puntual si alguno muerde antes.

Los arreglos se verificaron con una prueba que renderiza el contexto con React 19 sobre un DOM
simulado y repite los pasos de la web (tarjeta → modal → finalizar → ❌): con el código anterior
fallaban 6 de 18 casos; con el arreglo, ninguno.

| # | Qué pasa | Dónde | Gravedad |
|---|---|---|---|
| 1 | **Un producto repetido le borraba los extras al anterior.** Caja Papas con cheddar, y después otra Caja Papas, con o sin extras: el cheddar de la primera desaparecía. `eliminarExtrasGenericosAnteriores` borraba todos los extras `GENERAL` de ese **producto**, no de esa línea. **Arreglo:** cada producto es una línea nueva con sus propios extras, como una hamburguesa; se borró el "reemplazo" | `CartContext.finalizarProductoConExtras` | ✅ Arreglado (04-10-2026) |
| 2 | **Eliminar una hamburguesa dejaba sus extras** sueltos y, como la Caja agrupa por posición, se le pegaban al producto de arriba. **Arreglo:** `eliminar` se lleva los extras que la línea tiene inmediatamente debajo, la misma regla de la Caja y Cocina. Mirar el `grupo` no alcanzaba: una bebida, o un producto que entra sin modal, lleva el mismo número que la hamburguesa de arriba | `CartContext.eliminar` | ✅ Arreglado (04-10-2026) |
| 3 | El "si ya está en el carrito, eliminarlo primero" no hacía nada: comparaba contra el producto del menú, que no tiene `grupo`. Se borró con el arreglo del 1, junto con `hamburguesaYaEnCarrito`, que solo lo usaba él | `finalizarProductoConExtras` | ✅ Borrado (04-10-2026) |
| 4 | Una bebida agregada otra vez desde la tarjeta suma `cantidad` pero **no actualiza `subtotal`**. El arreglo que pidió la auditoría del 15-09 cubrió `+` y `−`, no este camino. La Caja lo recalcula igual | `agregarAlCarrito` | Baja |
| 5 | Las observaciones de una hamburguesa **cancelada** aparecen en la siguiente: el estado del modal solo se limpia al elegir una variante | `ModalHamburguesa` | Baja |
| 6 | Una hamburguesa marcada como **oferta** y agregada desde OFERTAS se trata como un producto común: sin variante ni observaciones, con extras genéricos, y la tarjeta le saca el DOBLE/TRIPLE del nombre | `Card` + el acordeón OFERTAS | Baja, si se usa |
| 7 | Un toast "Producto agregado!" **por línea**: una hamburguesa con tres extras son cuatro | `agregarAlCarrito` | Cosmético |
| 8 | El botón de `ModalExtras` dice **"Siguiente"** y en realidad termina. No hay paso siguiente: `bebidasDisponibles` se calcula y nadie lo usa, resto de un paso de bebidas | `ModalExtras` | Cosmético |
| 9 | **Enlaces rotos**: los "Enlaces rápidos" del pie (`#HAMBURGUESAS`, `#CAJA PAPAS`…) e "Ir a inicio" apuntan a ids que no existen, y las redes sociales son `href="#"` | `Footer`, `Crearsolicitud` | Cosmético |
| 10 | Si el cliente escribe una dirección y después elige "Lo retiro", la dirección **viaja igual**: react-hook-form conserva los campos que se ocultan | `Crearsolicitud` | Baja |
| 11 | El mensaje de WhatsApp sale con **sangría**: el template literal está indentado y `trim()` solo limpia los extremos | `comprar` | Cosmético |
| 12 | El `window.open` de WhatsApp corre **después de un `await`**, y Safari en iPhone lo bloquea como pop-up. El pedido igual queda guardado, y `PaginaDetalle` tiene su botón de respaldo | `comprar` | Asumido |
| 13 | El seguimiento **no es en vivo**, muestra datos crudos (`delivery`, `Retira`, `MP`) y un pedido cancelado lleva un ✓ rojo. Si alguien del staff, con la sesión abierta en esa pestaña, abre el `/ver-pedido` de un pedido de **Caja**, la página se rompe: no tiene `cliente` | `PaginaDetalle` | Baja |
| 14 | Sin ninguna hamburguesa visible tampoco se ve POLLO CRISPY: vive dentro del acordeón HAMBURGUESAS | `Crearsolicitud` | Baja |

## Por qué cuesta tocarlo

**`CartContext` hace cinco trabajos**: el carrito, la descarga del menú con su respaldo, el estado
de tres modales, el flujo para elegir hamburguesa y extras, y efectos sobre la página (el scroll
del `body` y los toasts).

- Tiene **16 `useState`**: 2 del carrito (`carrito`, `grupo`), 2 del menú, 3 **derivados** que se
  recalculan con un efecto (extras de hamburguesa, extras genéricos y bebidas, que son un
  `useMemo`) y **9 que forman una máquina de estados de modales** sin nombre. No se puede razonar
  qué combinaciones son válidas.
- Expone **49 cosas** en el contexto, setters crudos incluidos, y **13 no las usa ningún
  componente**: `setCarrito`, `disminuirGrupo`, `bebidasDisponibles`, los seis setters de modales
  y selecciones, `iniciarSeleccionExtrasGenericos`, `iniciarSeleccionPolloExtrasHamburguesa`,
  `cerrarModales` y `cargarExtrasYBebidas`.
- `document.body.style.overflow` se toca **ocho veces**: en cuatro funciones, en un efecto con su
  limpieza y en una línea comentada.

**La lógica de negocio está repetida**: la agrupación de hamburguesas, tres veces (arriba); la carga
del menú con su respaldo, dos (`CartContext` y `Menu`). Y `Crearsolicitud` vuelve a hacer
`setCategorias` y `setProductos` con lo que el contexto ya guardó.

**Los modales están hechos a mano** con el markup de Bootstrap, sin su JavaScript ni react-bootstrap:
no atrapan el foco, no se cierran con Esc y lo de atrás sigue accesible para un lector de pantalla.
Son tres copias de la misma estructura: fondo, cabecera, cuerpo con scroll, resumen con total y
botones. Varios estilos en línea **no hacen nada**, porque `bg-dark`, `bg-secondary` y
`border-top-0` de Bootstrap llevan `!important` y les ganan. En `ModalExtrasGenericos` cada opción
es un `div` clickeable, sin acceso por teclado.

**`Crearsolicitud` mezcla todo** en 504 líneas: la carga de la sucursal y del menú, el catálogo (el
mismo acordeón escrito tres veces), el carrito y el formulario de compra.

**El acordeón usa el JavaScript de Bootstrap** (`data-bs-toggle`), y por eso `index.js` importa
`bootstrap.bundle.min.js` (79 KB, 23 KB comprimido) **para toda la app**. Es su único uso: el staff
trabaja con react-bootstrap.

**Los estilos**: unas 420 líneas en el `Main.css` global (desde "empieza Wally css", líneas
907-1330), mezcladas con las del staff y cargadas en todas las pantallas. Los nombres son
inconsistentes (sufijos `CS` y `VP`, `itemsConteiner`), la cabecera con los dos logos está copiada
en tres componentes y cada pantalla tiene su `<p>Cargando...</p>` sin estilo. `menu.css` importa
la fuente con `@import`, que demora el primer dibujo, y tiene clases que nada usa (`.extras`).

**Hay dos sistemas de íconos**: Font Awesome 6 por CDN (en `index.html`, para toda la app) y
react-icons.

### Los avisos del lint son todos de acá

Los 6 avisos que muestra la terminal con `npm start` (04-10-2026) salen de este código:

| Archivo | Aviso |
|---|---|
| `Crearsolicitud.jsx:199` | el `useEffect` no lista `obtenerCategorias`, `obtenerProductos`, `setCategorias` ni `setProductos` entre sus dependencias |
| `Footer.jsx:69`, `:72` y `:75` | `href="#"` en los links de redes (`jsx-a11y/anchor-is-valid`) |
| `CartContext.jsx:397` | `cancelar` no lista `cerrarModales` ni `disminuirGrupo` entre sus dependencias |
| `CartContext.jsx:522` | `limpiarNombreHamburguesa` sobra entre las dependencias del `useMemo`: es de afuera del componente |

Ninguno es un bug hoy: el efecto corre una vez por sucursal y las funciones que faltan no cambian
entre renders. Se van solos con el rehecho.

## Lo que ya tocamos

Para distinguir lo original de lo nuestro (según los comentarios del código y las auditorías):

- `SeleccionSucursal` y `WebCerrada`, el horario por sucursal (`webRecibePedidos`) y las sucursales
  dentro de `menu.json`.
- `menu.json` en lugar de leer Firestore en cada visita, y el filtro `CATEGORIAS_SOLO_CAJA`.
- En `comprar`: `useAccionUnica` contra el doble toque, la sucursal validada y el horario controlado
  al confirmar, `telefonoSucursal` y el error visible si el `setDoc` falla.
- En `PaginaDetalle`: el aviso del link vencido, cómo decide si un pedido es retiro (el paso
  "LISTO"), el ícono de WhatsApp y el pie con los datos de la sucursal.
- `fmtPesos` en todos los montos, el teléfono de 10 dígitos, el `subtotal` en `+` y `−`, el
  acordeón que ya no se cierra al agregar un producto, y el código muerto que se borró (la edición
  de una hamburguesa ya cargada y un `Link` a una ruta que no existía).

## Cómo encararlo el día que se rehaga

Una propuesta, no un plan cerrado. El orden importa: primero lo que no cambia el contrato con la
Caja.

1. **Separar los datos.** Un hook tipo `useMenuPublico()` que descargue `menu.json` con su
   respaldo, para `Crearsolicitud` y `Menu`, y una sola función pura `agruparHamburguesas()` en
   `Utils`. No suma lecturas.
2. **El carrito, solo y con `useReducer`**, con un id propio por línea (`crypto.randomUUID()`, como
   el `carritoItemId` de la Caja) en lugar del par (`id`, `grupo`). Con eso desaparecen `grupo` y las
   `key` frágiles.
3. **Los extras dentro de su línea** mientras se arma el pedido (`{ ...producto, extras: [...] }`),
   y **aplanados en orden al guardar**, para que la Caja reciba exactamente lo de hoy. Así no
   quedan extras huérfanos y no hay que tocar la Caja.
4. **El flujo de elección como estado local** del componente que lo abre, con el `Modal` de
   react-bootstrap (ya está instalado) y un solo armazón compartido para los tres pasos.
5. **`CartProvider` solo sobre `/crear-solicitud/:sucursal`**, no sobre toda la app. Y el acordeón
   con el `Accordion` de react-bootstrap, para **sacar `bootstrap.bundle.min.js` de `index.js`**:
   79 KB menos en todas las pantallas, y hoy no lo usa nadie más.
6. **Las categorías especiales en un solo lugar** de `Constantes.jsx`: hoy `BEBIDAS`,
   `POLLO CRISPY` y `EXTRA` están escritas a mano en varios archivos.
7. **El front**: los estilos de la web fuera del `Main.css` global y pensados primero para el
   celular; cabecera, cargando y pie como componentes; el carrito como panel fijo en el celular, en
   vez de un formulario al final de la página.
8. **`PaginaDetalle` en vivo**, con `onSnapshot` sobre su documento: 1 lectura al entrar y 1 por
   cada escritura del staff sobre ese pedido mientras el cliente lo mira (la toma, el cobro,
   cocina, el reparto: entre 5 y 10), en lugar de las recargas, que hoy cuestan 1 cada una. Hay que
   decidirlo con números.

Antes de cambiar nada, releer [[Web publica#El documento que escribe]]: el recuadro "Lo que un rehecho no
puede romper".

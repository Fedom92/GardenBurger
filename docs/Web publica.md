---
tags: [gardenburger, web-publica]
aliases: [Web pública, Menú online, Carrito web, Solicitudes web]
actualizado: 2026-10-16
---

# Web pública

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Arquitectura y rutas]], [[Reglas de seguridad]], [[Decisiones tecnicas]] · vocabulario en [[Glosario]]

Lo que ve el cliente: elegir sucursal, armar el pedido, seguirlo y mirar la carta. Vive entera en
`src/components/Solicitudes/`, con su propio CSS (`webPublica.css`).

Se **rehizo completa entre el 14 y el 16-10-2026**, lógica y diseño ("Opción B · Carbón" de Claude
Design): lo que había escrito otro desarrollador (`CartContext`, `Card`, los tres modales, `Footer`,
`menu.css` y la sección "Wally css" de `Main.css`) ya no existe. Lo que hacía y los bugs que tenía
están en el historial de git de esta nota, antes del 16-10-2026.

## Mapa rápido

| Ruta | Componente | Qué hace | Firestore |
|---|---|---|---|
| `/crear-solicitud` | `SeleccionSucursal` | Las sucursales; la cerrada, apagada y con su horario | 0: sale de `menu.json` |
| `/crear-solicitud/:sucursal` | `Crearsolicitud` | Catálogo filtrado por categoría, ficha de producto y "Tu pedido" | 0 al navegar; 1 lectura + 1 escritura al confirmar |
| ↳ fuera de horario | `WebCerrada` | El horario (y la excepción de hoy) y un link al selector; no carga el catálogo | — |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` | El seguimiento; el link vence a las 48 h | 1 por visita |
| `/menu` | `Menu` | La carta siempre al día, con "Descargar imagen" y "Descargar PDF" | 0: sale de `menu.json` |

| Archivo | Qué tiene |
|---|---|
| `catalogo.js` | Las reglas del catálogo, **puras** (con tests): agrupar hamburguesas, las secciones del filtro, qué extras ofrece cada producto, la carta de `/menu` |
| `carritoWeb.js` | El carrito, **puro** (con tests) más el hook `useCarritoWeb`: agregar, sumar, aplanar para la Caja, armar la solicitud y el mensaje de WhatsApp |
| `FichaProducto.jsx` | La ficha (tamaño, extras, nota, cantidad): un `Modal` de react-bootstrap, hoja desde abajo en el celular |
| `TuPedido.jsx` | Las líneas del pedido, el formulario y `comprar` |
| `ProductoCard.jsx`, `piezasWeb.jsx` | La tarjeta y la foto de producto; íconos, `− N +`, el botón del carrito, los subtítulos `//.01` |
| `HeaderWeb`, `PieWeb`, `CargandoWeb` | Cabecera fija, pie con damero y esqueleto de carga, compartidos por todas las pantallas |
| `exportarMenu.js` | Las páginas de `/menu` para los estados de WhatsApp y el PDF |
| `contenidoWeb.js` | Lo que completa la dueña: las fotos propias y las redes del pie |
| `ilustraciones.js` | Las ilustraciones de categoría (WebP, en `src/img/marca/ilustraciones/`) |

Los datos salen de `Utils/menuPublico.js`: `fetchMenuPublico` (el JSON entero) y
`fetchCatalogoPublico` (productos, categorías y sucursales, con respaldo en Firestore).

## Cómo fluye un pedido web

1. **`SeleccionSucursal`** lee las sucursales de `menu.json` y decide con `webRecibePedidos()`
   cuáles están abiertas.
2. **`Crearsolicitud`** busca la sucursal de la URL en `menu.json` (si no está, lee su documento: 1
   lectura). Cerrada → `WebCerrada`, sin bajar el catálogo. Abierta → `fetchCatalogoPublico()`.
3. **El catálogo** es un filtro por tarjetas: se ve **una categoría a la vez**. Ofertas (si hay
   productos con `oferta`), Hamburguesas y el resto en su `nroOrden`, sin EXTRA. Pollo crispy es
   una categoría más (antes vivía dentro de Hamburguesas y desaparecía si no había ninguna).
4. **"Agregar"** abre la ficha si hay algo para elegir —un tamaño o algún extra—; si no (una
   bebida, un producto sin extras), agrega directo.
5. **"Tu pedido"** está en la misma página, debajo; el botón del carrito de la cabecera baja hasta
   ahí. Cada línea dice "1 × producto", el precio y ⋮; tocando ⋮ o la línea aparece su contador.
   En 1, el "−" del contador es una ✕ (gris, como el "−" y el "+") que saca la línea (con confirmación); abajo, "+ Agregar algo
   más" y "Vaciar pedido". El mismo contador usan las bebidas ya agregadas. (Antes hubo un modo
   "Editar", que no se entendía, y después la ✕ y el contador siempre a la vista, que agrandaban
   cada línea al doble.)
6. **"Confirmar pedido"** (`comprar`, con `useAccionUnica` contra el doble toque):
   1. vuelve a mirar el horario con lo que tiene en memoria: la página pudo quedar abierta;
   2. lee la sucursal (1 lectura): que exista, que esté activa y que siga en horario;
   3. hace el `setDoc` de la solicitud (ver [[Web publica#El documento que escribe]]);
   4. vacía el carrito, abre WhatsApp hacia la sucursal y navega a `/ver-pedido`.
7. **En la Caja**, la solicitud aparece en F1 y "Revisar" la carga en el ticket. Ver
   [[Flujo del pedido]].

## Qué extras ofrece cada producto

`extrasDe()` en `catalogo.js`, por la categoría del producto (por su **nombre**: renombrar una
categoría desde el ABM le cambia el comportamiento):

| Producto | Grupos de extras en la ficha |
|---|---|
| Hamburguesa (`SIMPLE`/`DOBLE`/`TRIPLE`) y `POLLO CRISPY` | "Extras" (`tipoExtra: "HAMBURGUESA"`) y "Para las papas del combo" (`PAPAS`) |
| `CAJA PAPAS` | "Extras": los de `PAPAS` y los `GENERAL` |
| Cualquier otro (nuggets…) | Los `GENERAL`. Los nuggets **no** llevan los de papas: decisión del dueño |
| `BEBIDAS`, `EXTRA` | Ninguno |

Los extras de **$0 se muestran** ("sin cargo"): ocultar un producto es cosa del admin desde
Productos, con la casilla "¿Privado?", no de la web (decisión del dueño, 15/16-10-2026). Lo
privado no llega a `menu.json`.

Las hamburguesas se agrupan **por el nombre**: cada variante es un producto propio
(`"BLT DOBLE"`, categoría `DOBLE`), y `quitarVariante()` le saca el sufijo. Es la única regla,
compartida por el pedido web y `/menu` (antes estaba escrita tres veces, distinta en cada una). Un
producto cargado sin el sufijo queda como hamburguesa suelta.

**La foto y los ingredientes de una hamburguesa son los del DOBLE**, en todos lados: la tarjeta
del catálogo, la ficha (elegir el tamaño cambia el precio, no lo que se ve) y la fila de `/menu`
(decisión del dueño, 16-10-2026). Si el DOBLE no los tiene, los del primer tamaño que sí. Lo
cargado en el SIMPLE y el TRIPLE no se muestra en la web.

## El carrito

Mientras se arma, **cada línea lleva sus extras adentro**:

```js
{ lineaId, producto, extras: [producto], observaciones, cantidad }
```

Quitar una hamburguesa se lleva sus extras sin deducir nada por la posición. Dos líneas iguales
(mismo producto, mismos extras, misma nota) se juntan sumando `cantidad`. Al cargar el catálogo,
`actualizarPrecios()` le pone los precios vigentes y saca lo que ya no está en el menú (con un
aviso).

**Un carrito por sucursal**, en `localStorage` con la clave `pedidoWeb:<sucursal>`: el cliente que
vuelve al selector y entra a otra sucursal arranca vacío, y si vuelve a la primera encuentra lo
que había elegido. Hasta el 16-10-2026 había un solo carrito para todas (como en la web vieja) y
se pasaba de una sucursal a otra.

**Al confirmar se aplana** (`aplanarCarrito`) a la lista que espera la Caja: cada producto seguido
de sus extras. Una línea con extras y cantidad 2 sale como dos productos, cada uno con sus extras
abajo; una sin extras sale como una sola línea con `cantidad`.

> [!danger] El contrato con la Caja
> - **El orden de las líneas**: cada extra va inmediatamente después de su producto. La Caja y
>   Cocina agrupan por posición (`agruparExtras`).
> - **Los valores de `cliente.opcion`** (`"Retira"` / `"delivery"`) y de `metodoPago`: los leen
>   `useRevisarSolicitud`, `PendientesSolicitudes` y `PaginaDetalle`.
> - **Lo que exige `esCreacionPublicaValida()`**: `cliente`, `carrito` (1 a 50 líneas), `total`
>   (hasta 1.000.000), `estado`, `origen` y `clienteTimestamp`. Ver [[Reglas de seguridad]].
> - **`telefonoSucursal` y `mensajeWsp`**: con ellos `PaginaDetalle` arma su botón de WhatsApp sin
>   leer la sucursal.
> - **Si cambia la forma de la línea guardada**, cambiar la clave de `localStorage`: un carrito con
>   la forma vieja simplemente no se carga. Ya pasó tres veces (`carrito`/`combo` →
>   `carritoWeb`/`carritoWebGrupo` → `pedidoWeb` → `pedidoWeb:<sucursal>`).

## El documento que escribe

`sucursales/{sucursal}/pedidos/{id nuevo}`, con `setDoc` (`armarSolicitud` en `carritoWeb.js`):

```js
{
  cliente: {
    nombre, telefono,               // nombre sin espacios de más; teléfono: 10 dígitos, sin 0 ni 15
    opcion: "Retira" | "delivery",  // ENVIOS_LOCALES[0], o "delivery"
    direccion?, entreCalles?,       // solo con delivery (shouldUnregister: al volver a Retiro se olvidan)
    metodoPago: "EFECTIVO" | "MP",
  },
  carrito: [{                       // aplanado: el producto de menu.json entero, más
    ...producto,
    cantidad, subtotal,             // subtotal = precio × cantidad
    observaciones?,                 // en el producto, no en sus extras
  }],
  total,                            // con el recargo de MP redondeado (REACT_APP_recargoMP)
  estado: "PENDIENTE",              // ESTADOS.WEB_PENDIENTE
  origen: "WEB",
  clienteTimestamp: serverTimestamp(),
  mensajeWsp,                       // el resumen para WhatsApp, ya codificado para URL
  telefonoSucursal,                 // de la sucursal leída al confirmar
}
```

Las líneas ya no llevan `grupo` (ni `combo`): no lo leía nadie. Las solicitudes viejas pueden
traerlo y da igual.

**El envío no se calcula en la web**: el costo depende de la zona, que elige el cajero. Con
Delivery, el resumen dice "Envío: lo suma la sucursal según tu zona" (decisión del dueño).

**El recargo de MercadoPago se muestra como porcentaje** ("Recargo MercadoPago +10%", de
`REACT_APP_recargoMP`), no en pesos, en "Tu pedido" y en el seguimiento: el monto ya está sumado en
el total (decisión del dueño, 16-10-2026).

**Qué hace la Caja con esto** (`useRevisarSolicitud`): pasa los datos del cliente al formulario,
junta las `observaciones` en el campo general y copia el carrito **línea por línea, en el mismo
orden**, con el precio del catálogo en vivo. Al guardar escribe sobre el mismo documento con
`merge: true`: el pedido conserva `cliente` y suma `codigo`, `envio`, `metodoPago` y el `total`
final. Ver [[Reglas de negocio#Validación del pedido web: forma, no contenido]].

## El seguimiento (`/ver-pedido`)

Un `getDoc` por visita. **No es en vivo**: para ver un cambio de estado se recarga (un
`onSnapshot` cobraría cada cambio a cada cliente con la página abierta). Los datos de la sucursal
—nombre, dirección, teléfono cuando no hay pedido— salen de `menu.json`, sin lecturas.

- **Lo que cargó la Caja manda** sobre lo que escribió el cliente: nombre, dirección, forma de
  pago, `envio.zona_envio` para saber si es retiro (como Cocina) y el `total`, que **no se
  recalcula**. La fila del recargo de MP aparece si queda algo entre el total y productos +
  envío, y dice el porcentaje.
- **La cabecera** dice "Pedido en {sucursal}" y el `codigo` de la Caja (`#23-FD`) desde que el
  cajero lo confirma; antes, "Seguimiento de pedido".
- **Los pasos**: Recibido · Confirmado · En cocina · Listo o En camino · Retirado o Entregado
  (`FLUJO_PUB_ESTADOS`; `PENDIENTEMP` cuenta como Recibido y `ATP` como Listo).
- **Esperando la transferencia** (`PENDIENTEMP`, o `PENDIENTE` con MP): el monto a transferir. Con
  un delivery todavía sin confirmar no se da, porque falta el envío.
- **Los datos se muestran legibles**: "Retiro en el local", "Te esperamos afuera", "Delivery",
  `etiquetaPago()`. Nunca `Retira`, `delivery` ni `MP` crudos.
- **Casos especiales**: cancelado o eliminado (sin pasos, lo pedido tachado); link vencido o
  inexistente (las reglas los niegan con el mismo `permission-denied`); un pedido de Caja sin
  `cliente`, que solo puede abrir alguien del staff ("no se puede seguir desde acá"); un error de
  red, con "Reintentar" (1 lectura más, solo si el cliente toca).
- **El botón flotante de WhatsApp** manda el `mensajeWsp` del pedido: si el navegador bloqueó el
  WhatsApp al confirmar (Safari lo hace después de un `await`), se manda desde acá.

## WhatsApp, en todas las pantallas

`BotonWhatsApp` (`piezasWeb.jsx`) flota abajo a la derecha en todas las pantallas públicas, para
consultas. Con una sucursal a mano (el catálogo, "Cerrada", el seguimiento) abre su chat; sin
sucursal elegida (el selector, `/menu`) despliega la lista de las que tienen teléfono para elegir a
cuál escribir, y con una sola abre esa directo. Sin ningún teléfono cargado no aparece. El
teléfono sale de `menu.json` (o del pedido, en el seguimiento): 0 lecturas.

El pie lleva Instagram (de `contenidoWeb.js`) y el WhatsApp de la sucursal, cuando hay una; abajo
de todo, "Todos los derechos reservados". Facebook se sacó (16-10-2026).

## `/menu`: la carta y sus descargas

La URL que la dueña comparte como "el menú siempre al día". Hamburguesas con un precio por
variante —en columnas cuando la carta es ancha, debajo del nombre en el celular (lo decide una
consulta de contenedor en el CSS)—, después el resto en su `nroOrden`, **con los extras** y sin
Ofertas aparte. Abajo, "Todos los combos incluyen papas", las sucursales y la dirección del pedido
online.

- **"Descargar imagen"**: una imagen de **1080 × 1920** (el tamaño de un estado de WhatsApp) por
  página. Con el menú de octubre-2026 son 5. Varias imágenes → el navegador pregunta una vez si
  deja bajar varios archivos.
- **"Descargar PDF"**: las mismas páginas en un PDF, para mandar por chat (los estados no aceptan
  PDF).

Cómo se arman, en [[Decisiones tecnicas#Las páginas de /menu se arman con html2canvas]].

## Costo en lecturas

| Pantalla | Normal | Si `menu.json` falla |
|---|---|---|
| `SeleccionSucursal` | 0 | 2-3 (las sucursales) |
| `Crearsolicitud`, al navegar | 0 | 1 (la sucursal) + **todos los productos y todas las categorías**, en cada visita |
| `Crearsolicitud`, al confirmar | 1 lectura + 1 escritura | ídem |
| `PaginaDetalle` | 1 por visita, y 1 por cada recarga o "Reintentar" | — |
| `Menu` | 0 | todos los productos y las categorías |

El respaldo contra Firestore **tapa la falla en silencio**: la web anda igual y lo único que se
nota es la factura. Ver [[Decisiones tecnicas#`menu.json` depende de tres capas]].

## Lo que completa la dueña

- **Fotos** (`contenidoWeb.js`): el selector y la banda "en la cocina" usan la pieza "Hay
  razones para venir" (`hamburguesa-razones.webp`); el catálogo, vasos, caja y hamburguesa de la marca (`elementos-garden.webp`, 16:9,
la misma proporción del banner: se ve entera). Para cambiar una, copiarla a
  `src/img/marca/fotos/` (WebP, ~1080 px) e importarla ahí.
- **Redes del pie** (`REDES` en `contenidoWeb.js`): Instagram (`@garden_burger_`). Una red sin
  URL se ve apagada, como lugar a completar. El WhatsApp no va ahí: sale del teléfono de cada
  sucursal.
- **Lo que no tiene que ver el cliente** (un extra que solo usan los cajeros, como "Cheddar y
  bacon en papas S/cargo"): la casilla "¿Privado?" de Productos; una categoría entera (las de
  empleados, como COMBO GARDEN): la casilla "¿Privada?" de Categorías. Después, **Publicar Menú**. Ver
  [[Reglas de negocio#Qué producto se ve dónde]].
- **Datos del panel** que se ven raros en la web: la BLT tiene los ingredientes repetidos; Luro no
  tiene dirección.

## El estilo

Los colores, las letras, las medidas y la voz de la marca, con su porqué: [[Marca web]].

`webPublica.css`, importado solo por las pantallas públicas. Bootstrap se usa como en el resto de
la app —grilla, utilidades, `Modal`, botones e inputs— y acá solo se le dan los colores y la
tipografía de la marca a través de sus variables (la raíz lleva `data-bs-theme="dark"`). Todo va
bajo `.gb-web` (la página) o `.gb-modal` (los modales, que react-bootstrap dibuja fuera de ella).

- **Tipografías**: Archivo y Unna desde Google Fonts; los títulos, con "GB Display", un recorte
  propio de Archivo en `src/fonts/` (ver [[Decisiones tecnicas#Las páginas de /menu se arman con html2canvas]]).
- **El rojo es solo fondo**: como texto sobre el carbón no se lee (2,8:1). Los errores van en
  ámbar.
- **Main.css pinta de negro** párrafos, títulos e inputs (con `!important` en inputs y `h3`):
  `webPublica.css` los devuelve al color de la marca con selectores `:where()`, que pesan como una
  clase sola para que cualquier clase de la web les gane sin `!important`.

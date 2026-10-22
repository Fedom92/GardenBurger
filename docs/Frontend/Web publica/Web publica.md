---
tags: [gardenburger, frontend, web-publica, hub]
aliases: [Web pública, Menú online, Carrito web, Solicitudes web]
actualizado: 2026-10-22
---

# Web pública

↑ [[Frontend]]

Lo que ve el *Cliente*: elegir sucursal, armar el pedido, seguirlo y mirar la carta. Vive entera
en `src/components/Solicitudes/`, con su CSS (`webPublica.css`). El estilo y la marca:
[[Marca web]].

Se **rehizo completa entre el 14 y el 16-10-2026**, lógica y diseño ("Opción B · Carbón" de Claude
Design): lo que había escrito otro desarrollador (`CartContext`, `Card`, tres modales, `Footer`,
`menu.css` y la sección "Wally css" de `Main.css`) ya no existe. El código heredado le parecía al
dueño "enmarañado e incorrecto": eligió rehacer la lógica, no un reskin. Lo que hacía y sus bugs
están en el historial de git de esta nota, antes del 16-10-2026.

## Mapa rápido

| Ruta | Componente | Qué hace | Firestore |
|---|---|---|---|
| `/crear-solicitud` | `SeleccionSucursal` | Las sucursales; la cerrada, apagada y con su horario | 0: sale de `menu.json` |
| `/crear-solicitud/:sucursal` | `Crearsolicitud` | Catálogo filtrado por categoría, ficha de producto y "Tu pedido" | 0 al navegar; 1 lectura + 1 escritura al confirmar |
| ↳ fuera de horario | `WebCerrada` | El horario (y la excepción de hoy) y un link al selector; no baja el catálogo | — |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` | El seguimiento; el link vence a las 48 h | 1 por visita |
| `/menu` | `Menu` | La carta siempre al día, con "Descargar imagen" y "Descargar PDF" | 0: sale de `menu.json` |

| Archivo | Qué tiene |
|---|---|
| `catalogo.js` | Las reglas del catálogo, **puras** (con tests): agrupar hamburguesas, las secciones del filtro, qué extras ofrece cada producto, la carta de `/menu` |
| `carritoWeb.js` | El carrito, **puro** (con tests), y el hook `useCarritoWeb`: agregar, sumar, aplanar para la Caja, armar la solicitud y el mensaje de WhatsApp |
| `FichaProducto.jsx` | La ficha (tamaño, extras, nota, cantidad): un `Modal` de react-bootstrap, hoja desde abajo en el celular |
| `TuPedido.jsx` | Las líneas del pedido, el formulario y `comprar` |
| `ProductoCard.jsx`, `piezasWeb.jsx` | La tarjeta y la foto; íconos, `− N +`, el botón del carrito, `BotonWhatsApp`, los subtítulos `//.01` |
| `HeaderWeb`, `PieWeb`, `CargandoWeb` | Cabecera fija, pie con damero y esqueleto de carga |
| `exportarMenu.js` | Las páginas de `/menu` para los estados de WhatsApp y el PDF |
| `contenidoWeb.js` | Lo que completa la dueña: las fotos propias y las redes del pie |
| `ilustraciones.js` | Las ilustraciones de categoría (WebP, en `src/img/marca/ilustraciones/`) |

Los datos salen de `Utils/menuPublico.js`: `fetchMenuPublico` (el JSON entero) y
`fetchCatalogoPublico` (productos, categorías y sucursales, con respaldo en Firestore). Ver
*Storage › menu.json*.

## Cómo fluye un pedido web

1. **`SeleccionSucursal`** lee las sucursales de `menu.json` y decide con `webRecibePedidos()`
   cuáles están abiertas (*Jornada y horarios › Horario de la web de cada sucursal*).
2. **`Crearsolicitud`** busca la sucursal de la URL en `menu.json` (si no está, lee su documento: 1
   lectura). Cerrada → `WebCerrada`, sin bajar el catálogo. Abierta → `fetchCatalogoPublico()`.
3. **El catálogo** es un filtro por tarjetas: **una categoría a la vez**. Ofertas (si hay productos
   con `oferta`), Hamburguesas y el resto en su `nroOrden`, sin EXTRA. Pollo crispy es una
   categoría más.
4. **"Agregar"** abre la ficha si hay algo para elegir —un tamaño o algún extra—; si no, agrega
   directo.
5. **"Tu pedido"** está en la misma página, debajo; el botón del carrito baja hasta ahí. Cada línea
   dice "1 × producto", el precio y ⋮; tocando ⋮ aparece su contador. En 1, el "−" es una ✕ que saca
   la línea (con confirmación). Abajo, "+ Agregar algo más" y "Vaciar pedido".
6. **"Confirmar pedido"** (`comprar`, con `useAccionUnica` contra el doble toque):
   1. vuelve a mirar el horario con lo que tiene en memoria: la página pudo quedar abierta;
   2. lee la sucursal (1 lectura): que exista, que esté activa y que siga en horario;
   3. hace el `setDoc` de la solicitud (abajo);
   4. vacía el carrito, abre WhatsApp hacia la sucursal y navega a `/ver-pedido`.
7. **En la Caja**, la solicitud aparece en F1. Ver *Cajero › Tomar una solicitud web*.

## Qué extras ofrece cada producto

`extrasDe()` en `catalogo.js`, por la categoría del producto —por su **nombre**: renombrar una
categoría le cambia el comportamiento—:

| Producto | Grupos de extras en la ficha |
|---|---|
| Hamburguesa (`SIMPLE`/`DOBLE`/`TRIPLE`) y `POLLO CRISPY` | "Extras" (`tipoExtra: "HAMBURGUESA"`) y "Para las papas del combo" (`PAPAS`) |
| `CAJA PAPAS` | "Extras": los de `PAPAS` y los `GENERAL` |
| Cualquier otro (nuggets…) | Los `GENERAL`. Los nuggets **no** llevan los de papas ("son solo nuggets", decisión del dueño) |
| `BEBIDAS`, `EXTRA` | Ninguno |

Los extras de $0 se muestran "sin cargo"; lo privado no llega a `menu.json`
(*Catálogo › Qué producto se ve dónde*).

Las hamburguesas se agrupan **por el nombre**: `quitarVariante()` le saca el sufijo ("BLT DOBLE" →
"BLT"). Es la única regla, compartida por el pedido web y `/menu` (antes estaba escrita tres veces).
Un producto cargado sin sufijo queda como hamburguesa suelta. **La foto y los ingredientes son los
del DOBLE** en la tarjeta, la ficha y `/menu` (elegir el tamaño cambia el precio, no lo que se ve);
si el DOBLE no los tiene, los del primer tamaño que sí.

## El carrito

Mientras se arma, **cada línea lleva sus extras adentro**:

```js
{ lineaId, producto, extras: [producto], observaciones, cantidad }
```

Quitar una hamburguesa se lleva sus extras sin deducir nada por la posición. Dos líneas iguales
(mismo producto, extras y nota) se juntan sumando `cantidad`. Al cargar el catálogo,
`actualizarPrecios()` pone los precios vigentes y saca lo que ya no está (con un aviso).

**Un carrito por sucursal**, en `localStorage` con la clave `pedidoWeb:<sucursal>` (16-10-2026):
antes había uno solo y se pasaba de una sucursal a otra.

**Al confirmar se aplana** (`aplanarCarrito`) a la lista que espera la Caja: cada producto seguido
de sus extras. Una línea con extras y cantidad 2 sale como dos productos, cada uno con sus extras;
una sin extras sale como una línea con `cantidad`.

> [!danger] El contrato con la Caja
> - **El orden de las líneas**: cada extra va inmediatamente después de su producto. La Caja y la
>   Cocina agrupan por posición (`agruparExtras`).
> - **Los valores de `cliente.opcion`** (`"Retira"` / `"delivery"`) y de `metodoPago`: los leen
>   `useRevisarSolicitud`, `PendientesSolicitudes` y `PaginaDetalle`.
> - **Lo que exige `esCreacionPublicaValida()`**: `cliente`, `carrito` (1 a 50 líneas), `total`
>   (mayor que 0 y hasta 1.000.000), `estado`, `origen` y `clienteTimestamp`. Ver
>   *Reglas de Firestore › Qué valida la creación pública y qué no*.
> - **`telefonoSucursal` y `mensajeWsp`**: con ellos `PaginaDetalle` arma su WhatsApp sin leer la
>   sucursal.
> - **Si cambia la forma de la línea guardada, cambiar la clave de `localStorage`**: un carrito con
>   la forma vieja simplemente no se carga. Ya pasó tres veces (`carrito`/`combo` →
>   `carritoWeb`/`carritoWebGrupo` → `pedidoWeb` → `pedidoWeb:<sucursal>`); las claves viejas se
>   borran al cargar.

## El documento que escribe

`sucursales/{sucursal}/pedidos/{id nuevo}`, con `setDoc` (`armarSolicitud` en `carritoWeb.js`):

```js
{
  cliente: {
    nombre, telefono,               // nombre sin espacios de más; teléfono: 10 dígitos, sin 0 ni 15
    opcion: "Retira" | "delivery",  // ENVIOS_LOCALES[0], o "delivery"
    direccion?, entreCalles?,       // solo con delivery
    metodoPago: "EFECTIVO" | "MP",
  },
  carrito: [{ ...producto, cantidad, subtotal, observaciones? }],   // aplanado
  total,                            // con el recargo de MP redondeado (REACT_APP_recargoMP)
  estado: "PENDIENTE",              // ESTADOS.WEB_PENDIENTE
  origen: "WEB",
  clienteTimestamp: serverTimestamp(),   // ⚠ no `timestamp`: ese lo escribe la Caja al cobrar
  mensajeWsp,                       // el resumen para WhatsApp, ya codificado
  telefonoSucursal,                 // de la sucursal leída al confirmar
}
```

- **El envío no se calcula en la web**: depende de la zona, que elige el cajero ("Envío: lo suma
  la sucursal según tu zona"). Calcularlo con Google Maps está pendiente: *Deuda tecnica › A futuro*.
- **El recargo de MercadoPago se muestra como porcentaje** ("+10%"), no en pesos: el monto ya está
  en el total (dueño, 16-10-2026).
- **El teléfono de la sucursal viaja en la solicitud.** Al confirmar, la web ya lee el documento de
  la sucursal para validarla, así que el teléfono sale sin lecturas extra; copiarlo en la solicitud
  hace que `/ver-pedido` arme su WhatsApp sin leer la sucursal. Si la sucursal cambia de teléfono,
  da igual: el link vence a las 48 h. Reemplazó a `REACT_APP_celular`, que era uno para todas.
  Sin teléfono cargado, el pedido se registra igual y no se abre WhatsApp.
- **Qué hace la Caja con esto** (`useRevisarSolicitud`): pasa los datos del cliente al formulario,
  junta las `observaciones` en el campo general y copia el carrito **línea por línea, en el mismo
  orden**, con el precio del catálogo en vivo y un `carritoItemId` por línea. Al guardar escribe
  sobre el mismo documento con `merge: true`: el pedido conserva `cliente` y suma `codigo`,
  `envio`, `metodoPago` y el `total` final. Las solicitudes viejas pueden traer `grupo`, `combo` o
  `productoAsociado`: no los lee nadie.

## El seguimiento (`/ver-pedido`)

Un `getDoc` por visita. **No es en vivo**: para ver un cambio de estado se recarga (un `onSnapshot`
cobraría cada cambio a cada cliente con la página abierta). Los datos de la sucursal salen de
`menu.json`, sin lecturas.

- **El link vence a las 48 horas** de hecho el pedido: la regla deja de mostrárselo al público
  (`sigueVisibleParaElPublico()`) y el staff lo sigue viendo. El cliente ve "Este pedido ya no está
  disponible". El admin que quiere ver uno vencido pega el link en su pestaña con sesión.
- **Lo que cargó la Caja manda** sobre lo que escribió el cliente: nombre, dirección, forma de pago,
  `envio.zona_envio` para saber si es retiro y el `total`, que **no se recalcula**. La fila del
  recargo aparece si queda algo entre el total y productos + envío.
- **La cabecera** dice "Pedido en {sucursal}" y el `codigo` de la Caja (`#23-FD`) desde que el
  cajero lo confirma.
- **Los pasos** (`FLUJO_PUB_ESTADOS`: `PENDIENTE → CONFIRMADO → COCINA → DELIVERY → ENTREGADO`) se
  leen **Recibido · Confirmado · En cocina · Listo / En camino · Retirado / Entregado**.
  `PENDIENTEMP` y `ATP` no tienen paso propio: `getCurrentStepIndex()` los ubica en `PENDIENTE` (falta
  verificar la transferencia) y `DELIVERY` ("listo", mismo avance que un delivery en camino); sin
  eso `indexOf` devuelve −1 y la barra queda gris. Retiro o delivery lo decide `envio.zona_envio`,
  y mientras el cajero no lo cargó, `cliente.opcion`.
- **Esperando la transferencia** (`PENDIENTEMP`, o `PENDIENTE` con MP): el monto a transferir. Con
  un delivery sin confirmar no se da, porque falta el envío.
- **Legible**: "Retiro en el local", "Te esperamos afuera", "Delivery", `etiquetaPago()`. Nunca
  `Retira`, `delivery` ni `MP` crudos.
- **Casos especiales**: cancelado o eliminado (sin pasos, lo pedido tachado); link vencido o
  inexistente (las reglas los niegan con el mismo `permission-denied`); un pedido de Caja sin
  `cliente`, que solo abre alguien del staff ("no se puede seguir desde acá"; los pedidos de Caja
  no se miran por acá); un error de red, con "Reintentar" (1 lectura más).
- **El botón flotante de WhatsApp** manda el `mensajeWsp`: si el navegador bloqueó el WhatsApp al
  confirmar (Safari lo hace después de un `await`), se manda desde acá.

## WhatsApp, en todas las pantallas

`BotonWhatsApp` (`piezasWeb.jsx`) flota abajo a la derecha. Con una sucursal a mano abre su chat;
sin sucursal elegida (el selector, `/menu`) despliega las que tienen teléfono, y con una sola abre
esa. Sin ningún teléfono no aparece. 0 lecturas. El pie muestra la dirección, el teléfono y el
horario de la sucursal elegida (de `menu.json`; en el selector, cada botón muestra el suyo), Instagram
(de `contenidoWeb.js`), el WhatsApp de la sucursal y "Todos los derechos reservados" (sin Facebook,
16-10-2026).

## `/menu`: la carta y sus descargas

La URL que la dueña comparte como "el menú siempre al día". Hamburguesas con un precio por variante
—en columnas si la carta es ancha, debajo del nombre en el celular (una consulta de contenedor)—,
después el resto en su `nroOrden`, **con los extras**. Abajo, "Todos los combos incluyen papas", las
sucursales y la dirección del pedido online.

- **"Descargar imagen"**: una imagen de **1080 × 1920** (un estado de WhatsApp) por página; con el
  menú de octubre-2026 son 5.
- **"Descargar PDF"**: las mismas páginas, para mandar por chat.

**Cómo se arman** (`exportarMenu.js`): copia la carta, la reparte en páginas de 450 × 800 fuera de
la vista y saca cada una con `html2canvas` al 2,4x; el PDF (`jsPDF`) lleva las mismas. **Páginas y no
una imagen larga** porque la dueña sube la carta a sus estados, que son una pantalla vertical. Agrega
los ítems de a uno y, si el cuerpo desborda, pasa el ítem a otra página: mide con el layout real. La
cabecera y el pie van en todas; un título nunca queda solo al pie y una sección partida repite su
título.

**Lo que html2canvas no sabe dibujar**: `font-stretch` (por eso los títulos usan "GB Display", un
recorte estático de Archivo al 62% en `src/fonts/`, con su licencia OFL), los gradientes cónicos (el
damero se reemplaza por un mosaico en un canvas) y `object-fit` (no usarlo dentro de la carta).

**Carga diferida**: `Menu.jsx` importa `exportarMenu.js` al tocar un botón, así `html2canvas` y
`jspdf` quedan en su propio chunk. Son dependencias propias desde el 16-10-2026 (antes llegaban con
`html2pdf.js`); `jspdf` 4 cierra el advisory crítico de jspdf. Pendiente: compartir con
`navigator.share` desde el celular.

## Costo en lecturas

| Pantalla | Normal | Si `menu.json` falla |
|---|---|---|
| `SeleccionSucursal` | 0 | 2-3 (las sucursales) |
| `Crearsolicitud`, al navegar | 0 | 1 (la sucursal) + **todos los productos y categorías**, en cada visita |
| `Crearsolicitud`, al confirmar | 1 lectura + 1 escritura | ídem |
| `PaginaDetalle` | 1 por visita, y 1 por recarga o "Reintentar" | — |
| `Menu` | 0 | todos los productos y categorías |

El respaldo contra Firestore **tapa la falla en silencio**: la web anda y solo se nota en la
factura. Ver *Storage › menu.json*.

## Lo que completa la dueña

- **Fotos** (`contenidoWeb.js`): el selector y la banda "en la cocina" usan
  `hamburguesa-razones.webp`; el catálogo, `elementos-garden.webp` (16:9, la proporción del
  banner). Para cambiar una, copiarla a `src/img/marca/fotos/` (WebP, ~1080 px) e importarla ahí. Las
  fotos del fotógrafo vienen en ProPhoto RGB: al convertirlas hay que pasarlas a sRGB o salen
  apagadas.
- **Redes del pie** (`REDES`): Instagram (`@garden_burger_`). Una red sin URL se ve apagada.
- **Lo que no tiene que ver el cliente**: la casilla "¿Privado?" o "¿Privada?", y después
  **Publicar Menú**.
- **Datos que se ven raros**: la BLT tiene los ingredientes repetidos; Luro no tiene dirección.

## El estilo en el código

`webPublica.css`, importado solo por las pantallas públicas. Bootstrap se usa como en el resto
—grilla, utilidades, `Modal`, botones e inputs— y acá solo se le dan los colores y la tipografía de
la marca con sus variables (la raíz lleva `data-bs-theme="dark"`). **Todo va bajo `.gb-web`** (la
página) **o `.gb-modal`** (los modales, que react-bootstrap dibuja fuera): ningún estilo de la web
llega al staff. El dueño prefiere utilidades de Bootstrap a CSS propio.

- **Tipografías**: Archivo y Unna desde Google Fonts; los títulos con "GB Display".
- **El rojo es solo fondo**: como texto sobre el carbón no se lee (2,8:1); los errores van en ámbar.
- **`Main.css` pinta de negro** párrafos, títulos e inputs (con `!important` en inputs y `h3`):
  `webPublica.css` los devuelve con selectores `:where()`, que pesan como una clase sola para que
  cualquier clase de la web les gane sin `!important`.

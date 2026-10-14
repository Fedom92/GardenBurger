# Rediseño de la web pública (`/crear-solicitud`) — Opción B "Carbón"

> Documento de traspaso para implementar el rediseño elegido por Fede.
> Leelo entero antes de tocar código. Respetá `CLAUDE.md` y `docs/` del repo: siguen siendo la fuente de verdad del proyecto.

---

## 0. Contexto

- **Repo:** `Fedom92/GardenBurger` (React 19 con CRA, Firebase, Bootstrap 5.3 y react-bootstrap).
- **Alcance:** solo la web pública de pedidos.
  - `/crear-solicitud`: `SeleccionSucursal`.
  - `/crear-solicitud/:sucursal`: `Crearsolicitud`, `Card`, los tres modales, `Footer` y `WebCerrada`.
  - Quedan **fuera**: `/menu` y `/ver-pedido` (se rehacen después) y todas las pantallas del staff.
- **Por qué:** el front actual es Bootstrap genérico (verde, gris y negro, con Bebas Neue), no usa nada del manual de marca nuevo (Plena Estudio, 2026) y tiene problemas de usabilidad:
  - dos modales encadenados para una hamburguesa, con un botón "Siguiente" que en realidad termina;
  - acordeones cerrados que esconden el catálogo;
  - radios diminutos en el formulario;
  - el recargo de MercadoPago se muestra en rojo, como si fuera un error.
- **Contexto previo obligatorio:** `docs/Web publica.md`, en especial las secciones "La rama de cada tarjeta", "El campo grupo", "Bugs conocidos", "Por qué cuesta tocarlo" y "Cómo encararlo el día que se rehaga". Este rediseño **sigue ese plan**.
- **Diseño de referencia:** el lienzo "Garden Burger · Pedidos web", fila **B · Carbón** (B1 Sucursal, B2 Catálogo, B3 Producto, B4 Pedido). Fede lo tiene abierto en claude.ai y puede mandarte capturas.

### Reglas del dueño (de `docs/Convenciones y preferencias.md`) que aplican acá

1. **Nada de over-engineering.** Código explícito antes que abstracciones.
2. **Minimizar lecturas y escrituras de Firebase.** El rediseño **no suma ninguna lectura**: todo sale de `menu.json`, igual que hoy.
3. **No correr builds ni tests salvo que Fede lo pida.** Las verificaciones las hace él.
4. **Preguntar antes de suponer una regla de negocio.**
5. Confirmaciones destructivas con `Swal.fire`, avisos con `toast`, formularios con react-hook-form, montos **siempre** con `fmtPesos`.
6. Pantallas nuevas por `React.lazy` en `App.js`.
7. Lo que escribe un pedido va envuelto en `useAccionUnica` (ya lo está; no lo rompas).

---

## 1. El contrato que NO puede cambiar

La Caja (F1, `PendientesSolicitudes` y `useRevisarSolicitud`) y Cocina leen el documento que escribe `comprar` en `sucursales/{sucursal}/pedidos`. **El rediseño es solo de presentación y del flujo de elección.** El documento guardado tiene que salir idéntico al de hoy:

- `cliente`: los datos del form (`nombre`, `telefono`, `opcion`, `direccion`, `entreCalles`, `metodoPago`), con las mismas claves y los mismos valores (`ENVIOS_LOCALES[0]` o `"delivery"`, y `METODOS_PAGO.*.key`).
- `carrito`: un array **plano**. Cada producto es una línea y **sus extras van inmediatamente debajo**, cada uno como una línea propia con `categoria: "EXTRA"` y su `tipoExtra` (`"HAMBURGUESA"` o `"GENERAL"`). La Caja y Cocina agrupan los extras **por posición**: cada extra pertenece al producto que tiene arriba.
- Las hamburguesas se guardan como **la variante elegida** (el producto real, por ejemplo `BLT DOBLE`), con `observaciones`.
- Las bebidas se consolidan en una línea con `cantidad`.
- `total`, `estado: ESTADOS.WEB_PENDIENTE`, `origen: "WEB"`, `clienteTimestamp`, `mensajeWsp` y `telefonoSucursal`: sin cambios.

**Regla práctica:** reutilizá `agregarAlCarrito`, `eliminar`, `aumentar`, `disminuir`, `vaciarCarrito` y `totalCarrito` de `CartContext`, y **no toques `comprar`**: la validación de sucursal y horario, `useAccionUnica`, el `setDoc` y WhatsApp quedan como están. Si en algún paso necesitás cambiar la forma del carrito, frená y preguntale a Fede.

---

## 2. Identidad visual (Opción B)

### 2.1 Paleta

Los cinco colores salen del manual. Tres tonos (`carbon-2`, `linea`, `borde`) y el `muted` son derivados del carbón para dar capas en modo oscuro.

| Token | Valor | Uso |
|---|---|---|
| `--gb-carbon` | `#262423` | Fondo de página (Negro Carbón del manual) |
| `--gb-carbon-2` | `#322f2d` | Tarjetas, superficies elevadas, inputs |
| `--gb-carbon-3` | `#3a3634` | Fondo del hueco de imagen cuando el producto no tiene foto |
| `--gb-carbon-hondo` | `#1c1b1a` | Pie de la ficha de producto |
| `--gb-linea` | `#45413e` | Divisores finos entre filas |
| `--gb-borde` | `#5c5752` | Bordes de chips, inputs y opciones no elegidas |
| `--gb-lino` | `#fcf5ed` | Texto principal; fondo del botón de carrito y del resumen (Blanco Lino) |
| `--gb-muted` | `#b5aca2` | Texto secundario sobre carbón (6,9:1) |
| `--gb-ambar` | `#f8a21b` | Precios, epígrafes, chip y opción activos, numeración `//.01` (Ámbar) |
| `--gb-rojo` | `#c62b12` | **Solo fondos** de botones de acción (Rojo Terracota), con texto lino |
| `--gb-muted-claro` | `#5e5753` | Texto secundario **sobre lino** (en el resumen claro) |

**Contrastes medidos (WCAG):**

| Combinación | Contraste | ¿Se puede usar? |
|---|---|---|
| Lino sobre carbón | 14:1 | Sí |
| Muted sobre carbón | 6,9:1 | Sí |
| Ámbar sobre carbón | 7,5:1 | Sí |
| Carbón sobre ámbar | 7,5:1 | Sí |
| Lino sobre rojo | 5,2:1 | Sí |
| **Rojo sobre carbón** | **2,8:1** | **No, como texto.** Nunca uses rojo para texto ni íconos chicos sobre carbón. |

### 2.2 Tipografía

Las dos familias se cargan desde Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Unna:ital,wght@0,400;0,700;1,400;1,700&display=swap">
```

Agregalo en `public/index.html`, al lado del link de Barlow / IBM Plex Mono que ya existe (ese lo usa la Caja: no lo saques). El `@import` de Bebas Neue de `menu.css` queda como está porque `/menu` todavía lo usa.

| Estilo | Fuente | Tamaño / peso | Dónde |
|---|---|---|---|
| Título display | Archivo, `font-stretch: 62%`, 900, MAYÚSCULAS, `letter-spacing: .01em` | 46px / 0,95 (pantalla), 34–40px (secciones), 28px (sucursal en tarjeta) | Títulos ("¿Desde dónde pedís?", "//. Hamburguesas", nombre del producto en la ficha) |
| Epígrafe | Unna Italic 400 | 19–20px, color ámbar | Frases de marca encima de los títulos |
| Nombre de producto (tarjeta) | Archivo 800, MAYÚSCULAS | 16px | Grilla del catálogo |
| Cuerpo | Archivo 400–600 | 15–16px / 1,4 | Textos, inputs |
| Secundario | Archivo 400–700 | 13–14px, color muted | Direcciones, ayudas, sub-líneas de extras |
| Etiqueta de paso | Archivo 700, `letter-spacing: .08em`, MAYÚSCULAS | 13px, muted | "01 · TAMAÑO" en la ficha |
| Numeración | Unna Italic | 20px, ámbar | `//.01`, `//.02`… en el checkout |

Frases de marca que se pueden usar (todas salen del manual): *"Un clásico, pero bien hecho."* y *"Garden Burger, sabemos lo que hacemos."* El tono es voseo rioplatense, cordial y directo ("Elegí", "Pedí", "Te avisamos").

### 2.3 Recursos gráficos

Están en `garden-burger-assets-opcion-B.zip`, que Fede tiene que descomprimir en `src/img/marca/`:

```
src/img/marca/logos/isotipo-lino.svg       ← encabezado (46×44 en el catálogo, 56×54 en la sucursal)
src/img/marca/logos/isotipo-carbon.svg     ← reserva, para fondo claro
src/img/marca/logos/logotipo-lino.svg
src/img/marca/logos/imagotipo-lino.svg     ← si se quiere el bloque completo (mínimo 197px de ancho, según el manual)
src/img/marca/ilustraciones/hamburguesa-fuego.png   ← reemplazo cuando una hamburguesa no tiene foto
src/img/marca/ilustraciones/aderezo.png             ← reemplazo para nuggets
src/img/marca/ilustraciones/papas.png | vaso.png | bolsa.png | llama.png | hamburguesa.png
```

- Los SVG salieron recortados del PDF del manual y pesan unos 46 KB porque arrastran trazos de la página. Funcionan, pero si aparecen los originales de Plena Estudio, reemplazalos.
- Las ilustraciones son PNG de trazo lino sobre fondo transparente, con un ancho máximo de 640px.
- Reglas del manual para el logo: no deformarlo, no cambiarle los colores, no agregarle sombras y no encerrarlo en formas.
- **Damero** (patrón del manual): se hace con CSS, no con una imagen.
- **Íconos:** SVG inline de trazo, de 2 a 2,6px (flecha, pin, más, cruz). **Nada de emoji** en la UI nueva: hoy hay 🏷️ en OFERTAS y 📍📞🕒 en el pie, y se sacan.

### 2.4 Medidas y formas

- Radios: tarjetas 18px, inputs y botones 12–16px, chips 99px, hoja de producto 24px arriba.
- Márgenes laterales: 16px en el catálogo y en el checkout, 20px en la sucursal. Separación entre tarjetas: 12px.
- Áreas táctiles: **44px como mínimo** (botones, chips, `+` y `−`, cerrar).
- Mobile first: el diseño es a 390px. En escritorio, centrá una columna con `max-width: 560px` en el catálogo y en el checkout. La grilla de productos puede pasar a 3 columnas desde 768px.

---

## 3. Pantallas: especificación

### B1 · Selector de sucursal (`SeleccionSucursal`)

1. **Foto superior** a sangre, de 300px de alto, `object-fit: cover`. En el diseño se usa la foto de cocina del manual: pedile a Fede una foto propia (cocinero o producto). Encima, arriba a la izquierda, el isotipo lino de 56×54.
2. **Franja de damero** de 16px, lino/carbón.
3. **Epígrafe** ámbar *"Garden Burger, sabemos lo que hacemos."* y título display 46px **"¿Desde dónde pedís?"**.
4. **Tarjeta de sucursal abierta:** es un `<Link>` a `/crear-solicitud/:id`, entera clickeable. Fondo `carbon-2`, borde 1,5px `linea`, radio 18px, padding 18px. Adentro:
   - el nombre en display de 28px;
   - la dirección en 15px;
   - "Abierta · pedidos hasta la 01:00" en ámbar 700 de 14px. Sale de `textoHorarioWeb` y `webRecibePedidos`, que ya existen;
   - una flecha → a la derecha.
5. **Tarjeta de sucursal cerrada:** no es un link. Borde 1,5px **punteado** `#5c5752`, sin fondo, todo el texto en muted: "Cerrada · abre el miércoles a las 19:00", con el horario real que da `textoHorarioWeb`.
6. **Pie:** "Miércoles a domingo · 19:00 a 01:00 · @garden_burger_" en muted de 13px.

La lógica de hoy no cambia: `fetchMenuPublico` con respaldo en `fetchSucursales`.

### B2 · Catálogo (`Crearsolicitud`, parte superior)

1. **Encabezado fijo** (`position: sticky; top: 0`, fondo carbón, borde inferior 1px `linea`, padding de 12px 16px). Lleva tres cosas:
   - el isotipo de 42×40;
   - la sucursal: "DaVinci" en 800 de 16px y, debajo, "Abierta hasta la 01:00" en ámbar 600 de 12px. Es un link a `/crear-solicitud` para cambiar de sucursal;
   - a la derecha, el **botón de carrito**.

   El encabezado se saca a un `HeaderWeb.jsx` (hoy la cabecera está copiada en `Crearsolicitud`, `SeleccionSucursal` y `WebCerrada`), con el carrito como prop opcional, porque solo lo muestra el catálogo. Reemplaza los dos `<img className='desktop-img|mobile-img logoCS'>`.
1b. **Botón de carrito** (reemplaza la barra flotante de abajo y el link actual con la flecha que rebota). Es una píldora de 44px de alto, fondo lino, texto carbón y radio 99px. Lleva:
   - un ícono de bolsa en SVG de trazo de 24px con un **badge** rojo arriba a la derecha (mínimo 18px, texto lino 800 de 11px): la cantidad de ítems, contando productos sin los extras;
   - el total con `fmtPesos` en 800 de 15px;
   - `aria-label="Ver pedido: N productos, $X"`.

   Con el carrito vacío se muestra igual, apagado (borde `borde`, fondo transparente, texto muted, sin badge), para que el cliente sepa dónde está.

   **Al tocarlo: scroll suave hasta la sección `#tu-pedido`** (B4), como hace la web hoy; lo confirmó Fede. Usá `scrollIntoView({ behavior: 'smooth', block: 'start' })` con un `scroll-margin-top` igual al alto del encabezado, para que el título no quede tapado.
2. **Hero:** foto de 180px de alto con radio 20px y margen de 16px. Debajo, el epígrafe *"Un clásico, pero bien hecho."* y el título display de 40px "¿Qué vas a comer hoy?". El hero va como una foto propia (configurable); si no hay, se omite.
2b. **Tarjetas de categoría = FILTRO** (`<section aria-label="Categorías">`). **Se muestran solo los productos de la categoría elegida**, no todo el catálogo uno debajo del otro.
   - El estado `categoriaActiva` se guarda en `useState` en `Crearsolicitud`. Arranca en la primera categoría (Hamburguesas, o Ofertas si hay).
   - Cada tarjeta es un `<button aria-pressed={activa}>` que hace `setCategoriaActiva(id)`. No hace scroll ni cambia la URL.
   - Grilla de `repeat(3, minmax(0,1fr))` con `gap: 8px` y margen de 16px. **Hamburguesas** ocupa 2 columnas (`grid-column: span 2`), con el título display de 28px partido en dos líneas ("Hambur-/guesas") y la ilustración `hamburguesa-fuego.png` de 80px a la derecha. El resto de las categorías, una por celda: la ilustración lino de 52px arriba y el nombre en 800 de 14px abajo. Las tarjetas miden 108px de alto como mínimo, con fondo `carbon-2` y radio 16px.
   - **Activa:** borde de **2px ámbar** y título ámbar. **Inactiva:** borde 1,5px `linea` y título lino.
   - Ilustraciones: Pollo crispy → `llama.png`, Nuggets → `aderezo.png`, Papas → `papas.png`, Bebidas → `vaso.png`. Una categoría sin ilustración asignada usa `bolsa.png`.
   - Orden: Hamburguesas, Pollo crispy (**ahora es una categoría propia en el filtro**, aunque hoy viva dentro del acordeón de hamburguesas; sus productos siguen abriendo la ficha con extras de hamburguesa) y después las categorías de `categorias` sin `CATEGORIAS_HAMBURGUESA`, EXTRA ni POLLO CRISPY, en su `nroOrden`. Si hay productos con `oferta`, se suma una tarjeta "Ofertas" (`bolsa.png`) al principio, y Hamburguesas deja de ocupar 2 columnas si así cierra mejor la grilla.
   - De paso se arregla el bug 14: POLLO CRISPY ya no depende de que haya hamburguesas visibles.
3. **No hay chips de categoría**: las tarjetas los reemplazan.
4. **Una sola sección visible**, la de la categoría activa: título display de 34px **"//. {nombre}"** y, a la derecha, "N opciones" en muted de 13px. Al cambiar de categoría, si la sección quedó fuera de la vista, hacé `scrollIntoView` hasta el título; si ya se ve, no muevas nada.
5. **Grilla de productos:** `grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px`. Cada tarjeta (`ProductoCard.jsx`) lleva:
   - fondo `carbon-2`, radio 18px, `overflow: hidden`;
   - imagen cuadrada (`aspect-ratio: 1/1; object-fit: cover`). **Sin foto:** fondo `carbon-3` con la ilustración lino de su categoría centrada al 58%;
   - el nombre en MAYÚSCULAS, 800, 16px. En las hamburguesas, el nombre sin el sufijo (`limpiarNombreHamburguesa`);
   - el precio en ámbar 700 de 14px, **"desde $X"** en las hamburguesas agrupadas (el menor entre sus variantes) y "$X" en el resto;
   - el botón "Agregar": fondo rojo, texto lino 700 de 15px, 44px de alto, radio 12px, a lo ancho de la tarjeta con margen de 12px.
6. **Bebidas:** cuando la categoría activa es BEBIDAS, los productos van en **lista**, no en grilla. Cada fila tiene el nombre (16px), el precio en ámbar y un botón cuadrado rojo de 44px con `+` (`aria-label="Agregar <nombre>"`), con divisores `linea`. Si la bebida ya está en el carrito, conviene mostrar `− cantidad +` en su lugar. Agregar sigue llamando a `agregarAlCarrito`, que ya consolida las bebidas.
7. **Tu pedido** (B4) sigue en la misma página, debajo del catálogo, en `<section id="tu-pedido">`, y se ve siempre, sea cual sea la categoría activa. El botón de carrito del encabezado lleva hasta ahí.
8. **Pie** (`Footer.jsx`): fondo carbón con un damero arriba. Datos de la sucursal en muted, sin emoji. Los enlaces rápidos apuntan a los `id` reales de las secciones (arregla el bug 9 del doc). Las redes van con su URL real o se quitan: hoy son `href="#"`. **Preguntale a Fede las URLs.**
9. **Estados:**
   - El "Cargando..." pelado pasa a un esqueleto simple: tarjetas `carbon-2` con un leve pulso de opacidad, respetando `prefers-reduced-motion`.
   - El error de carga se muestra con el texto actual, en lino.

### B3 · Ficha de producto (reemplaza `ModalHamburguesa`, `ModalExtras` y `ModalExtrasGenericos`)

Es un componente nuevo, `FichaProducto.jsx`, con el **`Modal` de react-bootstrap** (ya instalado). Así se resuelven el foco, la tecla Esc y el fondo inaccesible, que hoy son modales hechos a mano. En el celular se comporta como **hoja desde abajo**:

```css
@media (max-width: 575.98px) {
  .gb-ficha .modal-dialog { margin: 0; position: fixed; bottom: 0; left: 0; right: 0; max-width: none; }
  .gb-ficha .modal-content { border-radius: 24px 24px 0 0; max-height: 92vh; }
}
```

Le pasás `dialogClassName`/`className` y `contentClassName` para estilarlo. Fondo carbón, sin bordes de Bootstrap. Contenido, de arriba a abajo:

1. **Tirador** decorativo: 44×5px, color `borde`, centrado.
2. **Imagen** de 190px de alto, radio 18px, margen de 16px. Si no hay foto, la ilustración sobre `carbon-2`. Botón **cerrar** de 44px arriba a la derecha (`aria-label="Cerrar"`).
3. **Nombre** en display de 46px y los **ingredientes** en muted de 15px, si existen.
4. **`01 · TAMAÑO`**, solo en las hamburguesas agrupadas. Es un control segmentado (`role="radiogroup"`) con fondo `carbon-2`, radio 16px, padding 4px y 3 columnas. Cada opción mide 60px y muestra **SIMPLE / DOBLE / TRIPLE** (800, 15px) con su precio debajo (700, 14px). La elegida va con **fondo ámbar y texto carbón**; las demás, transparentes con texto lino.
   - **Por defecto: ninguna elegida**, y el botón "Agregar" queda deshabilitado con el texto "Elegí un tamaño". Es más seguro que preelegir una. (En el diseño aparece Doble elegida solo para mostrar el estado.)
   - Las variantes salen de `variantesHamburguesa`, que ya calcula `CartContext`.
5. **`02 · EXTRAS (opcional)`** con chips que se prenden y apagan (`aria-pressed`), en `flex-wrap` con `gap: 8px`. Cada chip mide 44px de alto, radio 99px y dice **"Feta de cheddar +$400"**. Apagado: borde `borde` con texto lino. Prendido: **fondo lino y texto carbón**.
   - Qué extras se muestran depende de la rama que hoy decide `Card.handleAgregar`: hamburguesas y POLLO CRISPY muestran los extras `tipoExtra: "HAMBURGUESA"`; el resto de los productos (salvo bebidas), los extras `"GENERAL"`.
   - Si no hay extras, la sección no aparece.
6. **`03 · NOTA PARA LA COCINA`** con un `<input>` de 52px de alto, fondo `carbon-2`, borde `borde` y placeholder "Ej: sin tomate". Va en `observaciones` del producto, como hoy.
7. **Pie fijo** de la hoja: una franja de damero de 14px y, debajo, una barra `carbon-hondo` con:
   - un selector `− N +` con borde `borde` (**ver decisión pendiente D1**);
   - el botón **"Agregar · $total"**: rojo, 56px, radio 14px, 800 de 17px.

   El total es `(variante.precio + Σ extras.precio) × cantidad` y se recalcula en vivo.

**Lógica.** El estado es local del componente (`useState`): `variante`, `extrasIds` (un `Set`), `nota` y `cantidad`. Se resetea cada vez que se abre con otro producto: así desaparece el bug 5, la nota que pasaba a la siguiente hamburguesa.

Al confirmar:
```js
// 1 línea de producto + sus extras debajo, en ese orden: contrato con la Caja (ver §1)
aumentarGrupo();
agregarAlCarrito({ ...productoFinal, observaciones: nota });
extrasElegidos.forEach(e => agregarAlCarrito({ ...e, tipoExtra: e.tipoExtra /* HAMBURGUESA | GENERAL */ }));
toast(`${nombre} agregado`); // UNO solo (bug 7)
```
Antes de escribir esto, **leé `finalizarHamburguesa`, `finalizarProductoConExtras` y `agregarProductoNormal` en `CartContext.jsx`** y replicá exactamente qué campos le ponen a cada línea: `grupo`, `tipoExtra`, `productoAsociado` en los genéricos, `subtotal`, `cantidad`. Lo más simple y seguro es extraer esas funciones para que reciban la selección como parámetro, en lugar de duplicarlas.

**Ramas** (las mismas que hoy):

| Producto | ¿Abre la ficha? | Secciones |
|---|---|---|
| Hamburguesa agrupada | Sí | Tamaño + extras HAMBURGUESA + nota |
| POLLO CRISPY | Sí | Extras HAMBURGUESA + nota |
| Otro producto, si existe algún extra GENERAL | Sí | Extras GENERAL + nota |
| Otro producto, sin extras GENERAL | No: se agrega directo con toast | — |
| BEBIDAS | No: se agrega directo, se consolida | — |

Si la ficha queda sin ninguna sección que elegir, no tiene sentido abrirla.

**Limpieza en `CartContext`:** una vez que la ficha funcione, se pueden borrar los estados de los 3 modales (`showModalVariante`, `showModalExtras`, `showModalExtrasGenericos`, `hamburguesaSeleccionada`, `varianteElegida`, `extrasSeleccionados`, etc.), `volverAVariante`, `cancelar`, los `document.body.style.overflow` (react-bootstrap ya bloquea el scroll) y el `bebidasDisponibles` muerto. Hacelo en un commit aparte y **solo si nada más los usa** (buscá con grep).

### B4 · Tu pedido (sección inferior de `Crearsolicitud`, hoy "Finalizar Compra")

Puede seguir en la misma página, en la sección `id="tu-pedido"` a la que lleva el botón de carrito del encabezado, o ser una vista aparte. **Recomendación: misma página**, para no tocar rutas ni sumar estado.

1. **Encabezado:** un botón "volver" de 44px (`borde`, radio 12px) que hace scroll al catálogo, y el título display de 34px **"Tu pedido"**.
2. **`//.01 Lo que pediste`**: tarjeta `carbon-2` con radio 18px y padding de 4px 16px.
   - Una fila por **producto**: "1 × BLT Doble" a la izquierda en 800 y el precio en ámbar 800 a la derecha.
   - Debajo, en muted de 14px, sus extras unidos con " · " ("+ Feta de cheddar · + Salsa alioli") y la nota en Unna Italic muted entre comillas (“Sin tomate”).
   - El precio de la fila es producto + extras.
   - Divisores `linea`.
   - Las bebidas muestran `− cantidad +` (con `aumentar` y `disminuir`).
   - Acciones de cada fila, como links subrayados: **"Quitar"** usa `eliminar`, que ya se lleva los extras de debajo, y conviene confirmar con `Swal.fire`. "Editar" es opcional para una segunda etapa.
   - Debajo de la tarjeta: "+ Agregar algo más" (vuelve al catálogo) y "Vaciar carrito" (`Swal` de confirmación + `vaciarCarrito`).
   - **Agrupar para mostrar:** recorré `carrito` y juntá cada línea `categoria === "EXTRA"` con la línea no-extra anterior. Es la misma regla de posición de la Caja. El array guardado **no cambia**.
3. **`//.02 Entrega`**: dos botones grandes de 64px en grilla de 2 columnas.
   - "**Retiro** / en DaVinci" y "**Delivery** / te lo llevamos".
   - El elegido va con borde 2px ámbar y fondo `carbon-2`, con el subtexto en ámbar. El otro, con borde 1,5px `borde` y fondo transparente.
   - Se hacen con `<label>` que envuelve un `<input type="radio" {...register("opcion", …)}>` visualmente oculto (clase `visually-hidden` de Bootstrap). **No cambies los `value`**: `ENVIOS_LOCALES[0]` y `"delivery"`.
   - Con Delivery aparecen "Dirección" y "Entre calles", obligatorios como hoy.
   - **Bug 10:** al volver a Retiro hay que limpiar esos campos (`setValue('direccion','')` y `setValue('entreCalles','')`, o `useForm({ shouldUnregister: true })`).
4. **`//.03 Tus datos`**: labels visibles, 14px 700, encima de cada input. El placeholder no reemplaza al label.
   - "Nombre" (requerido).
   - "Celular": `inputmode="numeric"`, la misma limpieza `replace(/\D/g,'')`, `maxLength={10}` y `minLength: 10`, con la ayuda "Con código de área, sin 0 ni 15." en muted de 13px.
   - Inputs de 52px, fondo `carbon-2`, borde 1,5px `borde`, radio 14px y texto lino.
   - Los errores de react-hook-form van debajo de cada campo en **ámbar**, no en rojo (por contraste), con texto claro: "Necesitamos tu nombre", "El celular tiene que tener 10 números".
5. **`//.04 Pago`**: los mismos botones grandes de 56px, "Efectivo" y "MercadoPago", con `register("metodoPago")` y los `value` de `METODOS_PAGO.EFECTIVO.key` y `METODOS_PAGO.MP.key`.
   - Con MP elegido aparece un aviso de borde 1,5px ámbar y texto lino: **"MercadoPago tiene un recargo del {REACT_APP_recargoMP}%. Tomamos el pedido cuando recibimos la transferencia."** Reemplaza los dos `<p className="text-danger">`: el recargo **no es un error**.
6. **Resumen:** tarjeta **lino con texto carbón**, radio 18px, padding 16px.
   - Filas: "Productos" con el `total`; "Recargo MercadoPago" con `totalConRecargo - total`, solo si eligió MP; y "Envío", **solo si hay un dato real**. Hoy la web no calcula el envío: no lo inventes y preguntale a Fede (decisión D2).
   - Abajo, separado por una línea carbón de 1,5px: **"Total"** en display de 26px y el monto en display de 30px.
   - Botón **"Confirmar pedido"**: rojo, 58px, texto lino 800 de 18px, con `disabled={procesando}` y el texto "Enviando…" mientras procesa. Debajo, en `#5e5753` de 13px: "Al confirmar te abrimos WhatsApp con el detalle."
   - El error de `errorEnvio` se muestra arriba del botón, en una caja con borde ámbar: **"Tu pedido no se registró."** + el mensaje.
7. Una franja de damero de 16px al final.

**`comprar` no se toca.** Solo cambia el markup que lo llama (`handleSubmit(comprar)`).

### WebCerrada

Usa el mismo `HeaderWeb`, el título display "Ahora estamos cerrados", "Tomamos pedidos {horario}." en lino, y un botón lino con texto carbón que lleva a "Ver otras sucursales". Va con la ilustración `bolsa.png` o `llama.png` en lino.

---

## 4. Archivos: qué crear y qué tocar

```
public/index.html                           ← sumar Archivo + Unna (§2.2)
src/img/marca/**                            ← assets del zip (§2.3)
src/components/Solicitudes/webPublica.css   ← NUEVO: tokens y estilos, todo scopeado bajo .gb-web
src/components/Solicitudes/HeaderWeb.jsx    ← NUEVO: reemplaza la cabecera copiada 3 veces; incluye el botón de carrito
src/components/Solicitudes/ProductoCard.jsx ← NUEVO: reemplaza Card.jsx
src/components/Solicitudes/FichaProducto.jsx← NUEVO: reemplaza los 3 modales
src/components/Solicitudes/TuPedido.jsx     ← NUEVO (opcional): carrito + formulario, sacados de Crearsolicitud
src/components/Solicitudes/Crearsolicitud.jsx ← catálogo con tarjetas de categoría y secciones; usa lo de arriba
src/components/Solicitudes/SeleccionSucursal.jsx, WebCerrada.jsx, Footer.jsx ← reestilo
src/context/CartContext.jsx                 ← solo extraer/limpiar (§3 B3); sin cambiar la forma del carrito
src/index.js                                ← sacar bootstrap.bundle.min.js (§5, paso 3)
src/style/Main.css                          ← borrar la sección "Wally css" que quede sin uso (§5, paso 6)
docs/Web publica.md                         ← actualizar al final
```

Punto de partida de `webPublica.css`:

```css
/* Web pública (Solicitudes) — rediseño opción B "Carbón", manual de marca 2026.
   Todo scopeado bajo .gb-web para no pisar al staff: el mismo criterio que #caja en Caja.css. */
.gb-web {
  --gb-carbon:#262423; --gb-carbon-2:#322f2d; --gb-carbon-3:#3a3634; --gb-carbon-hondo:#1c1b1a;
  --gb-linea:#45413e; --gb-borde:#5c5752; --gb-lino:#fcf5ed; --gb-muted:#b5aca2;
  --gb-ambar:#f8a21b; --gb-rojo:#c62b12; --gb-muted-claro:#5e5753;
  --gb-sans:'Archivo', system-ui, sans-serif;
  --gb-unna:'Unna', Georgia, serif;
  min-height:100vh; background:var(--gb-carbon); color:var(--gb-lino);
  font-family:var(--gb-sans); text-align:left; /* corta el .App {text-align:center} de CRA */
}
.gb-web .gb-display{font-stretch:62%;font-weight:900;text-transform:uppercase;letter-spacing:.01em;line-height:.95}
.gb-web .gb-epigrafe{font-family:var(--gb-unna);font-style:italic;color:var(--gb-ambar)}
.gb-web .gb-damero{height:16px;background:repeating-conic-gradient(var(--gb-lino) 0 25%,var(--gb-carbon) 0 50%) 0 0/16px 16px}
.gb-web .gb-btn-accion{background:var(--gb-rojo);color:var(--gb-lino);border:0;border-radius:14px;min-height:44px;font-weight:800}
.gb-web :focus-visible{outline:2px solid var(--gb-ambar);outline-offset:2px}
@media (prefers-reduced-motion: reduce){.gb-web *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
```

Envolvé la raíz de `SeleccionSucursal`, `Crearsolicitud`, `WebCerrada` y el `Modal` de la ficha en `className="gb-web"`. El `Modal` se monta en un portal fuera del árbol: dale la clase con `className`/`contentClassName`. Los componentes de Bootstrap que se sigan usando (`.btn`, `.form-control`) chocan con el diseño, así que en esta parte **no los uses**, igual que en la Caja.

---

## 5. Pasos (un commit o PR por paso, en este orden)

Cada paso tiene que dejar la web funcionando. Al terminar cada uno, avisale a Fede para que lo pruebe; no corras el build.

1. **Base visual.** Fuentes en `index.html`, assets en `src/img/marca/`, `webPublica.css` y `HeaderWeb.jsx`. Todavía sin cambiar comportamiento.
2. **Sucursal y Cerrada.** Rehacé `SeleccionSucursal` y `WebCerrada` con B1. Son las de menor riesgo: no tocan el carrito.
3. **Catálogo.** Tarjetas de categoría como filtro, `ProductoCard` en grilla, bebidas en lista, botón de carrito en el encabezado y `Footer` reestilado. Con esto el acordeón desaparece y **`bootstrap.bundle.min.js` deja de tener usos**: el único `data-bs-toggle` del código es el del acordeón de `Crearsolicitud`. Sacá su import de `src/index.js` (79 KB menos en toda la app). Antes de sacarlo, hacé grep de `data-bs-` (salvo `data-bs-theme`), `bootstrap.bundle` y `window.bootstrap`.
   - En este paso las tarjetas todavía pueden abrir los modales viejos: el contexto no cambió.
4. **Ficha de producto.** `FichaProducto` reemplaza los 3 modales y `ProductoCard` la abre. Después, en un commit aparte, la limpieza de `CartContext`.
5. **Tu pedido.** Las 4 secciones, los botones grandes con react-hook-form, el resumen claro, el arreglo del bug 10 y la confirmación con `Swal` para quitar y vaciar.
6. **Limpieza de CSS.** Borrá de `Main.css` ("empieza Wally css", aproximadamente las líneas 907 a 1330) lo que ya no use nadie. **No borres** `.mainpageVP`, `.itemDetalle`, `.fraccionDetalle`, `.logoCS`, `.tituloCategoria` ni `.mobile-img`/`.desktop-img` mientras `PaginaDetalle.jsx` y `Menu.jsx` los usen: hacé grep de cada clase antes de borrarla. `Card.jsx` y los modales viejos se borran cuando no quede ningún import.
7. **Docs.** Actualizá `docs/Web publica.md` (mapa rápido, la rama de cada tarjeta, la tabla de bugs con los que se cerraron y lo que ya tocamos) y `docs/Mapa de archivos.md`.

---

## 6. Pruebas que Fede tiene que hacer (checklist para pasarle)

Para cada caso: armar el pedido, confirmarlo y mirar en la **Caja (F1)** que el pedido llegue igual que antes.

- [ ] Hamburguesa con tamaño, 2 extras y nota: en la Caja se ve la variante correcta, los extras debajo y la nota.
- [ ] POLLO CRISPY con un extra (usa los extras de hamburguesa).
- [ ] Nuggets o caja de papas con un extra GENERAL.
- [ ] Un producto sin extras: se agrega directo y sale un solo toast.
- [ ] Una bebida agregada 2 veces: una sola línea con cantidad 2, y `+`/`−` en el carrito.
- [ ] Quitar una hamburguesa con extras: se van también sus extras.
- [ ] La misma hamburguesa 2 veces con extras distintos: cada una conserva los suyos.
- [ ] Retiro y Delivery; elegir Delivery, escribir una dirección y volver a Retiro: la dirección no viaja.
- [ ] MercadoPago: el recargo aparece en el resumen y el total coincide con `totalConRecargo`.
- [ ] Doble toque en "Confirmar pedido": sale un solo pedido.
- [ ] Sucursal cerrada: muestra WebCerrada, y en el selector se ve como tarjeta punteada.
- [ ] Tocar cada tarjeta de categoría: solo se ven sus productos, la activa queda marcada en ámbar y Pollo crispy aparece aunque no haya hamburguesas.
- [ ] El botón de carrito muestra bien la cantidad y el total, y al tocarlo baja hasta "Tu pedido" sin que el encabezado tape el título.
- [ ] Teclado: Tab llega a las tarjetas de categoría, las de producto, la ficha y el formulario. Esc cierra la ficha y el foco vuelve a la tarjeta.
- [ ] Celular real (iPhone Safari y Android Chrome): la hoja desde abajo, el encabezado fijo con el carrito, el filtro por categoría y WhatsApp.
- [ ] Las pantallas del staff (Caja, Cocina, Admin) se ven igual que antes, sin estilos pisados.

---

## 7. Decisiones pendientes (preguntar a Fede antes de implementar esa parte)

- **D1 · Cantidad en la ficha.** ¿El selector `− N +` agrega N grupos iguales (producto y extras repetidos N veces, lo más seguro para la Caja) o se saca de la ficha? No guardes `cantidad > 1` en una hamburguesa sin confirmarlo: la Caja podría no esperarlo.
- **D2 · Envío.** ¿La web muestra un costo de envío? Hoy no lo calcula: existe `Admin/Parametros/Envios.jsx`. Si no hay dato, la fila "Envío" no se muestra.
- **D3 · Foto del hero y de la sucursal.** ¿Qué fotos propias usar? Las del diseño son del manual. Si no hay, el hero se omite.
- **D4 · Redes del pie.** URLs reales de Instagram y demás, o se quitan.
- **D6 · Seguimiento en vivo.** Fede sacó el botón "Actualizar": por defecto el estado se lee una vez al entrar y el cliente recarga, como hoy (1 lectura por recarga). Con `onSnapshot`, en cambio, cuesta 1 lectura al entrar más 1 por cada escritura del staff mientras el cliente mira (entre 5 y 10 por pedido, según `docs/Web publica.md`). No lo implementes sin su aprobación.
- **D7 · Recargo de MercadoPago.** En una captura de un pedido real, productos por $21.000 dieron un total de $23.100, o sea **10%**. Igual, leelo siempre de `REACT_APP_recargoMP` y no lo escribas fijo.
- **D5 · Extras de papas.** Ya existen extras con `tipoExtra: "PAPAS"` (cheddar o cheddar y bacon en papas) que la web no ofrece. ¿Se muestran en la ficha de las cajas de papas? Es una regla de negocio nueva: solo si Fede lo pide.

## 8. Datos a corregir en el panel (no son código; avisarle a Fede)

- `menu.json`: la dirección de DaVinci figura como "RUFINO 123", pero el manual dice **L. Davinci 4225, G. Laferrere**.
- Luro no tiene dirección, teléfono ni horario: así la tarjeta no puede decir cuándo abre.
- Las imágenes de los productos se cargan desde otras webs y desde miniaturas de Google Drive: son frágiles y de estilo dispar. Conviene subir fotos propias a Storage. Mientras tanto, la ilustración tapa el hueco.
- Casi ninguna hamburguesa tiene `ingredientes`: solo BLT y F-Onion.
- Después de corregir: **Publicar Menú**.

## 8b. Seguimiento del pedido (`/ver-pedido/:sucursal/:id`, `PaginaDetalle.jsx`)

Diseño de referencia: lienzo, sección **"B · Seguimiento (/ver-pedido)"**, a la derecha de la fila B. Son 4 artboards: B5 *esperando transferencia*, B6 *en la cocina*, B7 *cancelado* y B8 *link vencido*. Va con el mismo `HeaderWeb`, los mismos tokens y el mismo `webPublica.css`, y la raíz lleva `className="gb-web"`. **Hacelo como paso 5b**, después de "Tu pedido", porque libera las clases `.mainpageVP`, `.itemDetalle`, `.tituloVP` y `.precioVP` de `Main.css`.

### Qué no cambia
- **Una lectura por visita:** el `getDoc` del pedido, como hoy, con el mismo manejo de `permission-denied` (link vencido o inexistente).
- **Reglas:** `firestore.rules` no se toca (el link vence a las 48 h).
- **Estados:** `FLUJO_PUB_ESTADOS` y `getCurrentStepIndex` de `Constantes.jsx` siguen definiendo los pasos. `PENDIENTEMP` se muestra en el paso 1 y `ATP` en el 4.
- **Retiro o delivery:** se decide con la misma regla de `esRetiro` de hoy (`pedido.envio.zona_envio` si existe; si no, `cliente.opcion`).

### Estructura (B5 / B6)
1. **Encabezado:** isotipo de 46×44, "Pedido en {sucursal}" en muted y **"Código #XXXXX"**. El código son los últimos 5 caracteres del `id` en mayúsculas, en ámbar, y sirve para hablar con la sucursal. Es solo visual: no se guarda nada.
2. **Bloque de estado:** epígrafe Unna ámbar "¡Gracias, {cliente.nombre}!" (sin mayúsculas forzadas), un título display de 46px según el estado y una línea de texto muted:

   | Estado (`getCurrentStepIndex`) | Título | Texto |
   |---|---|---|
   | `PENDIENTE` (web, efectivo) | Recibimos tu pedido | La sucursal lo va a confirmar en unos minutos. |
   | `PENDIENTEMP` o `PENDIENTE` con `metodoPago === METODOS_PAGO.MP.key` | Esperando tu transferencia | Elegiste MercadoPago: en cuanto llegue la transferencia confirmamos el pedido y lo mandamos a la cocina. |
   | `CONFIRMADO` | Confirmamos tu pedido | Ya está en la fila de la cocina. |
   | `COCINA` | Lo estamos preparando | Tu pedido ya está en la plancha. |
   | `DELIVERY` / `ATP`, retiro | Listo para retirar | Ya podés pasar a buscarlo. |
   | `DELIVERY`, delivery | En camino | Salió para tu casa. |
   | `ENTREGADO` | ¡Que lo disfrutes! | Gracias por elegirnos. |

   Estos textos son propuestas: **mostráselos a Fede**, porque son copy de la marca.
3. **Pasos en HORIZONTAL** (`<section aria-label="Estado del pedido">` + `<ol>`), justo debajo del bloque de estado. Es una tarjeta `carbon-2` con radio 18px y padding de 18px 6px 16px.
   - Grilla de `repeat(5, minmax(0,1fr))`. Cada `<li>` va centrado en columna: un círculo de 28px y, debajo, su etiqueta en 12px.
   - La línea entre pasos es un `<span>` absoluto dentro de cada `<li>` (salvo el último): `top: 13px; left: 50%; width: 100%; height: 2px`, ámbar si el paso ya está hecho y `linea` si no. El círculo va con `position: relative; z-index: 1` y fondo `carbon-2`, para que la línea pase por detrás.
   - Hecho: círculo **ámbar** con ✓ carbón y etiqueta lino en 600.
   - Actual: aro ámbar de 3px con un halo `box-shadow: 0 0 0 5px rgba(248,162,27,.18)` y la etiqueta **ámbar en 800**.
   - Pendiente: aro `borde` de 2px y etiqueta muted.
   - Etiquetas cortas, que entran en 70px: **Recibido · Confirmado · En cocina · Listo** (retiro) o **En camino** (delivery) **· Retirado** o **Entregado**.
   - El texto largo de cada estado ya está en el bloque de estado (punto 2), así que debajo de los pasos no va texto.
   - **No hay botón "Actualizar" ni "Última actualización".** El estado se lee una vez al entrar, con el `getDoc` de hoy; para ver un cambio el cliente recarga, como hoy. Si se aprueba la decisión **D6**, se pasa a `onSnapshot`.
4. **Caja de pago**, debajo de los pasos:
   - **Si espera la transferencia (B5):** borde 1,5px ámbar, "Monto a transferir" con `fmtPesos(pedido.total)` en display ámbar de 32px y el texto "Te pasamos el alias por WhatsApp. Si ya transferiste, mandanos el comprobante por ahí." **No lleva botón**: el contacto es el botón flotante (punto 8).
   - **Si es efectivo:** no se muestra ninguna caja. Fede la sacó: el pago ya figura en "Tu pedido".
5. **Foto opcional** (B6): una banda de 170px con una foto de cocina, entre los pasos y la caja de pago, solo en el estado COCINA. Si no hay foto propia, se omite.
6. **`//.01 Tu pedido`: un solo bloque** que junta el detalle, el total y los datos de entrega y pago. Ya no hay una sección aparte "Entrega y pago". Es una tarjeta `carbon-2` con radio 18px y padding de 4px 16px 16px, con este contenido en orden:
   1. **Las líneas agrupadas por posición**, igual que en el checkout (§3 B4): cada extra se muestra debajo del producto que tiene arriba. Cada fila dice "1 × BLT Doble" con el precio en ámbar, "+ Huevo" en muted y la nota en Unna Italic. Las fotos chicas de hoy desaparecen, porque las URLs externas se rompen (ver §8). Divisores `linea`.
   2. **Totales:** "Productos" (la suma de las líneas) y, **solo si pagó con MP**, "Recargo MercadoPago" (`pedido.total − productos`), los dos en muted. Después, una línea de 1,5px `borde` y "Total" en display de 26px, con el monto en display de 30px. **No recalcules el total:** mostrá `pedido.total`, que es lo que se guardó. Sin MP, no hace falta la fila "Productos": va directo al Total.
   3. **Datos**, separados por un divisor `linea`: grilla de 2 columnas con `gap: 14px 12px`, etiquetas muted de 13px y valores en 700 de 15px. **Nunca muestres valores crudos** (es el bug 13):
      - Entrega: `"Retira"` → "Retiro en el local", `"Espera Afuera"` → "Te esperamos afuera", `"delivery"` → "Delivery".
      - Pago: `etiquetaPago(cliente.metodoPago)`, que ya existe en `Constantes.jsx`.
      - A lo ancho (2 columnas): "Dónde retirás" (la dirección de la sucursal, sacada de `menu.json`) o "Dirección" (`cliente.direccion` · "entre " + `cliente.entreCalles`).
      - "A nombre de" y "Celular", con el formato `11 2345 6789`.
7. **Botones:** "Hacer otro pedido" (rojo, `Link` a `/crear-solicitud/:sucursal`) y, debajo, "Este link funciona durante 48 horas." en muted de 13px. Después, el pie: damero y una línea con los datos de la sucursal.
8. **Botón flotante de WhatsApp** (reemplaza todos los "Escribir a la sucursal"): un `<button>` o `<a>` con `position: fixed; right: 16px; bottom: 24px`, de 60×60px y redondo.
   - Fondo **`#128c7e`** (el verde azulado de WhatsApp: el ícono blanco sobre él llega a 4,1:1, cuando sobre el verde claro `#25d366` no llega a 3:1). Sombra `0 6px 18px rgba(0,0,0,.45)`.
   - Ícono de WhatsApp blanco de 30px: `FaWhatsapp` de react-icons, como hoy, o un SVG.
   - `aria-label="Escribir a la sucursal por WhatsApp"`.
   - Usa el `enviarMensajeWSP` de hoy: el teléfono y el mensaje salen del pedido.
   - Solo se muestra si hay teléfono. Dejá un `padding-bottom` en la página para que no tape el pie.
   - Reemplaza la clase `.fab-whatsapp` de `Main.css`: el estilo nuevo va en `webPublica.css`.

### Estados especiales
- **B7 · Cancelado** (`CANCELADO` o `ELIMINADO`): **sin la barra de pasos y sin el ✓ rojo de hoy**.
  - Un círculo de 64px con aro lino y una ✕, el título "Tu pedido fue cancelado" y debajo, como única leyenda, "Si tenés dudas, escribinos por WhatsApp."
  - Un solo botón: "Armar un pedido nuevo" (rojo), más el **botón flotante de WhatsApp**.
  - Abajo, "Lo que habías pedido" con las líneas tachadas y la opacidad en 0,85.
- **B8 · Link vencido / no existe** (`aviso` por `permission-denied`): la ilustración `bolsa.png` de 120px, el epígrafe "¡Esperamos que lo hayas disfrutado!", el título "Este pedido ya no está disponible" y **ningún texto debajo**: Fede lo sacó.
  - Un solo botón: "Hacer un pedido" (rojo), más el **botón flotante de WhatsApp**.
  - Acá no hay pedido, así que el teléfono del botón flotante **sale de `menu.json`** (`fetchMenuPublico`, 0 lecturas de Firestore), buscando la sucursal de la URL, con un mensaje simple tipo "Hola, tengo una consulta por mi pedido". Si no hay teléfono, el botón no se muestra.
- **Error de carga** (otro error): el mismo armado que B8, con el texto "No pudimos cargar tu pedido. Probá recargar la página." y un botón "Reintentar".
- **Pedido sin `cliente`** (uno de la Caja abierto por alguien del staff): hoy la página se rompe (bug 13). Protegé todos los accesos con `pedido.cliente?.…` y, si no hay `cliente`, mostrá el armado de B8 con el texto "Este pedido no se puede seguir desde acá."
- **Cargando:** el esqueleto de §3 B2.9, no el texto "Cargando pedido...".

### Pruebas
- [ ] Un pedido web con efectivo y retiro en cada estado: PENDIENTE → CONFIRMADO → COCINA → ATP → ENTREGADO, cambiando el estado desde la Caja y Cocina y recargando la página. Los pasos se ven bien en horizontal a 360px de ancho.
- [ ] El botón flotante de WhatsApp abre el chat de la sucursal correcta, no tapa el pie y no aparece si no hay teléfono.
- [ ] Un pedido con MP en PENDIENTEMP: muestra "Esperando tu transferencia" y el monto, y el recargo coincide con el de la Caja.
- [ ] Un delivery en camino ("En camino" / "Entregado").
- [ ] Un pedido cancelado, un link de más de 48 h y un id inventado.
- [ ] Los datos legibles: nunca "Retira", "MP" ni "delivery" crudos.

## 9. Datos reales para probar (del `menu.json` publicado)

- **Hamburguesas** (simple / doble / triple):

  | Hamburguesa | Simple | Doble | Triple |
  |---|---|---|---|
  | Big Garden | 15.000 | 16.500 | 18.200 |
  | Tasty | 14.700 | 16.200 | 17.900 |
  | Cheese | 14.000 | 15.500 | 17.200 |
  | BLT, F-Onion, Caramel, Alioli, La Cuarto, Crispy, Burger Fan | 14.200 | 15.700 | 17.400 |

- **Extras HAMBURGUESA:** Carne extra 2.000 · Feta de cheddar 400 · Huevo 1.000 · Salsa tasty 1.500 · Salsa alioli 1.000.
- **Extras GENERAL:** Pileta de cheddar 2.000 · Pileta alioli 2.000.
- **Pollo crispy:** Cuarto 14.000 · Lechuga y tomate 14.000 · Cheddar y bacon 13.700.
- **Nuggets:** con papas 12.500 · sin papas 9.000.
- **Caja de papas:** simple 14.000 · con cheddar 16.000 · con cheddar y bacon 18.000 · porción individual 4.500.
- **Ejemplo de total:** BLT Doble + Feta + Alioli = 17.100; + Caja con cheddar 16.000; + 2 Coca-Cola 600 (2 × 2.200) = **37.500**.

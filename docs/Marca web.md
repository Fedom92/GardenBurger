---
tags: [gardenburger, web-publica, diseno]
aliases: [Marca, Diseño web, Opción B Carbón, Manual de marca]
actualizado: 2026-10-16
---

# Marca web

← [[GardenBurger]] · relacionado: [[Web publica]] · vocabulario en [[Glosario]]

El sistema visual de la web pública (el pedido, el seguimiento y `/menu`). Salió del rediseño
**"Opción B · Carbón"** que se armó en Claude Design sobre el **manual de marca de Plena Estudio
(2026)**, y se implementó entre el 14 y el 16-10-2026. El documento de traspaso y las capturas del
lienzo (B1 a B8) se borraron después: lo que sigue es lo que valía la pena conservar. Cómo está
hecho en el código: [[Web publica#El estilo]].

## Paleta

Los cinco colores del manual, más tonos derivados del carbón para dar capas en modo oscuro. Viven
como variables `--gb-*` en `webPublica.css`.

| Token | Valor | Uso |
|---|---|---|
| `--gb-carbon` | `#262423` | Fondo de página (Negro Carbón del manual) |
| `--gb-carbon-2` | `#322f2d` | Tarjetas, superficies elevadas, inputs |
| `--gb-carbon-3` | `#3a3634` | Fondo de la foto cuando el producto no tiene |
| `--gb-carbon-hondo` | `#1c1b1a` | Pie de la ficha de producto |
| `--gb-linea` | `#45413e` | Divisores finos |
| `--gb-borde` | `#5c5752` | Bordes de chips, inputs y opciones no elegidas |
| `--gb-lino` | `#fcf5ed` | Texto principal; fondo del botón del carrito y del resumen (Blanco Lino) |
| `--gb-muted` | `#b5aca2` | Texto secundario sobre carbón |
| `--gb-ambar` | `#f8a21b` | Precios, epígrafes, lo elegido, la numeración `//.01` (Ámbar) |
| `--gb-rojo` | `#c62b12` | **Solo fondos** de botones de acción (Rojo Terracota), con texto lino |
| `--gb-muted-claro` | `#5e5753` | Texto secundario **sobre lino** (el resumen) |

**Contrastes medidos (WCAG)** — de acá salen dos reglas del código:

| Combinación | Contraste | |
|---|---|---|
| Lino sobre carbón | 14:1 | sí |
| Muted sobre carbón | 6,9:1 | sí |
| Ámbar sobre carbón / carbón sobre ámbar | 7,5:1 | sí |
| Lino sobre rojo | 5,2:1 | sí |
| **Rojo sobre carbón** | **2,8:1** | **no como texto ni ícono chico**: por eso los errores van en ámbar y el rojo solo de fondo |

## Tipografía

| Estilo | Fuente | Tamaño | Dónde |
|---|---|---|---|
| Título display | "GB Display" (Archivo al 62% de ancho, 900), MAYÚSCULAS | 46px pantalla, 34–40px secciones, 28px sucursal | Títulos, nombre en la ficha |
| Epígrafe | Unna Italic | 19–20px, ámbar | Frases de marca arriba de los títulos |
| Nombre de producto | Archivo 800, MAYÚSCULAS | 16px | Tarjetas |
| Cuerpo | Archivo 400–600 | 15–16px | Textos, inputs |
| Secundario | Archivo | 13–14px, muted | Direcciones, ayudas, extras |
| Paso | Archivo 700, `letter-spacing .08em`, MAYÚSCULAS | 13px, muted | "01 · TAMAÑO" en la ficha |
| Numeración | Unna Italic | 20px, ámbar | `//.01`, `//.02` en "Tu pedido" |

"GB Display" es un archivo propio y no la fuente variable de Google: ver
[[Decisiones tecnicas#Las páginas de /menu se arman con html2canvas]].

## Formas y medidas

- **Radios**: tarjetas 18px, inputs y botones 12–16px, chips y píldoras 99px, la hoja de producto
  24px arriba.
- **Áreas táctiles de 44px como mínimo**: botones, chips, `−` y `+`, cerrar, ⋮.
- **Mobile first**: el diseño es a 390px; en la PC, una columna centrada de 560px.
- **Márgenes**: 16px a los costados; 12px entre tarjetas.

## Recursos gráficos

- **Logos** en `src/img/marca/logos/` (isotipo, logotipo e imagotipo, en lino y carbón). Reglas del
  manual: **no deformarlo, no cambiarle los colores, no agregarle sombras, no encerrarlo en
  formas**. El imagotipo, de 197px de ancho como mínimo.
- **Ilustraciones** de trazo lino en `src/img/marca/ilustraciones/` (WebP): reemplazan la foto
  que falta y marcan las categorías.
- **El damero** (lino y carbón) es CSS, no una imagen.
- **Íconos de trazo** (SVG en `piezasWeb.jsx`, o react-icons). **Nada de emojis en la interfaz**:
  el mensaje de WhatsApp sí los lleva.

## Voz

Voseo rioplatense, cordial y directo: "Elegí", "Pedí", "Te avisamos". Las frases de marca salen
del manual:

- *"Un clásico, pero bien hecho."* (catálogo)
- *"Garden Burger, sabemos lo que hacemos."* (selector)

## Cómo probar la web después de un cambio grande

Para cada caso, armar el pedido, confirmarlo y mirar en la **Caja (F1)** que llegue bien.

- Hamburguesa con tamaño, dos extras y nota: en la Caja, la variante correcta, los extras debajo y
  la nota.
- Pollo crispy con extra; caja de papas con extra; nuggets con un extra general.
- Un producto sin extras: entra directo, un solo aviso.
- Una bebida dos veces: una línea con cantidad 2.
- Quitar una hamburguesa con extras: se van también sus extras.
- La misma hamburguesa dos veces con extras distintos: cada una conserva los suyos.
- Delivery con dirección y volver a Retiro: la dirección no viaja.
- MercadoPago: el total coincide con el de la Caja.
- Doble toque en "Confirmar pedido": sale un solo pedido.
- Cambiar de sucursal: cada una con su carrito.
- Teclado: Tab llega a todo; Esc cierra la ficha y el foco vuelve a la tarjeta.
- Celular real (iPhone Safari y Android Chrome): la hoja desde abajo, la cabecera fija, WhatsApp.
- Las pantallas del staff se ven igual que antes.

---
tags: [gardenburger, integraciones, referencia]
aliases: [Servicios externos, Integraciones externas]
actualizado: 2026-10-22
---

# Integraciones

↑ [[GardenBurger]]

Los servicios de afuera del código. Firebase, que es todo el backend, tiene su área: *Firebase*.

| Servicio | Para qué | Dónde | Si falla | Costo |
|---|---|---|---|---|
| **WhatsApp** (links `api.whatsapp.com/send`) | Al confirmar un pedido web, el resumen hacia la sucursal; el botón flotante de la web; en ATP, "tu pedido está listo" | `TuPedido`, `piezasWeb.jsx` (`BotonWhatsApp`), `ATP.jsx` | Sin teléfono de la sucursal no se abre, y el pedido se registra igual. Safari bloquea abrirlo después de un `await`: el seguimiento lo vuelve a ofrecer | 0 |
| **Mercado Pago** | **No hay integración.** El cliente transfiere y el cajero coteja en su cuenta | F2 de la Caja | Si no se coteja, se entrega un pedido no pagado: lo verifica una persona | Recargo `REACT_APP_recargoMP` al cliente |
| **reCAPTCHA Enterprise** | El proveedor de App Check | `firebase.js` | Sin token, Firestore y Auth rechazan | Ver *Firebase › App Check* |
| **Google Fonts** | Archivo y Unna en la web pública | `webPublica.css` | Cae a la fuente de reserva. Los títulos usan "GB Display", un archivo propio en `src/fonts/` | 0 |
| **Sistema viejo** (App Script + Google Sheets) | Es el que se usa en los locales hoy; sus exports (`ventas.tsv`, `pagos.tsv`) alimentan las Estadísticas Históricas | Storage `privado/estadisticas/`, subidos a mano | Un export incompleto falsea los números sin avisar | 0 |
| **Google Drive** | Algunas fotos de producto estaban cargadas como link de Drive | campo "Link URL" de Productos | Drive limita por IP: **429** y la foto no carga | Ver *Storage › Fotos de producto* |
| **Claude Design** | De ahí salieron el rediseño de la Caja y el de la web pública | — | — | — |
| **Manual de marca de Plena Estudio** (2026) | Colores, letras, logos y voz de la web | *Marca web* | — | — |

**A futuro**: Google Maps para calcular el envío en la web (se factura por consulta) y un bot de
Telegram con los números del F4. Ver *Deuda tecnica › A futuro*.

---
tags: [gardenburger, decisiones, adr]
aliases: [Decisiones tecnicas, ADR, Cronologia, Por que esta asi]
actualizado: 2026-10-22
---

# Historial de decisiones

↑ [[Deuda tecnica]]

Las decisiones de diseño, **por fecha**, con el enlace a la nota que explica el qué y el porqué. El
texto de cada decisión vive en la nota de su tema, una sola vez: esta es solo la línea de tiempo.
**Antes de "arreglar" algo que parece raro, buscarlo acá**: casi todo salió de un problema real.

No es el historial de cambios (eso es git): entra solo lo que se eligió entre alternativas, o lo
que cambia cómo hay que pensar el sistema. Una decisión nueva va con su fecha al final de su mes.

| Fecha | Decisión | Dónde |
|---|---|---|
| ago-2026 | La Caja se rehace desde un diseño de Claude Design, con divergencias deliberadas | *Caja › El rediseño vino de Claude Design* |
| 07-09-2026 | La configuración de Firebase (reglas, `firebase.json`, Functions) se versiona; los índices y los `.env`, no | *Firebase › La configuración se versiona* |
| sep-2026 | Asistencias: un documento por jornada, con `nombre` y `valorHora` congelados en cada registro | *Asistencias y liquidacion › 2. nombre y valorHora van congelados en el registro* |
| sep-2026 | Todos los empleados, repartidores incluidos, viven en `usuarios` | *Authentication › Todos los empleados viven en usuarios* |
| sep-2026 | Ser admin es un custom claim, no una lectura; las Functions conservan el respaldo contra Firestore | *Authentication › Ser admin es un claim en el token* |
| sep-2026 | Caché de Firestore persistente en modo una sola pestaña (verificado de nuevo el 04-10 con firebase 12) | *Firestore › Persistencia en IndexedDB, modo una sola pestaña* |
| 14-09-2026 | En las reglas, `get` y `list` de pedidos van separados (cerró la fuga de datos de clientes) | *Reglas de Firestore › read es get y list* |
| 14-09-2026 | Una solicitud web, un solo cajero: lo garantiza la regla `asignacionValida()` | *Flujo del pedido › Una solicitud web tiene un solo dueño* |
| 14-09-2026 | Code splitting por ruta, sin migrar de CRA | *Frontend › Code splitting por ruta* |
| 14-09-2026 | "Cocinados TODOS" como único botón; el horario especial arranca a las 20 | *Cocinero › Qué hace*, *Jornada y horarios › Horario especial* |
| 14-09-2026 | La ficha del cliente se actualiza en cada cobro | *Cajero › La ficha del cliente* |
| 26-09-2026 | **El arqueo se calcula desde los pedidos**: `resumenDiario` pasa a ser el resumen guardado | *Arqueo y estadísticas › El arqueo se calcula desde los pedidos* |
| 26-09-2026 | La jornada comercial pasa del `.env` a `HORARIO` en el código | *Jornada y horarios › Por qué la jornada vive en código y no en el .env* |
| 26-09-2026 | El F4 solo para el encargado, de 00:00 a 02:00 | *Arqueo y estadísticas › Quién mira el arqueo, y cuándo* |
| 26-09-2026 | Los TSV de Estadísticas salen de `public/` a una carpeta privada de Storage | *Storage › Los TSV de Estadísticas, en una carpeta privada* |
| 26-09-2026 | La creación pública sigue con lista negra de campos | *Reglas de Firestore › Qué valida la creación pública y qué no* |
| 26-09-2026 | El teléfono de cada sucursal viaja en la solicitud web | *Web publica › El documento que escribe* |
| 26-09-2026 | Sin vuelto en la Caja; recargo de MP como constante del `.env` | *Cajero › Cobrar un pedido* |
| 28-09-2026 | Cada sucursal tiene su horario web, editable sin deploy; el F4 a la misma hora en todas | *Jornada y horarios › Horario de la web de cada sucursal* |
| 28-09-2026 | La moto no lleva cambio: vuelto o propina, obligatorio | *Logística de deliverys › La moto no lleva cambio: vuelto o propina* |
| 28-09-2026 | Sin fijo para el repartidor: horas + envíos; le paga el encargado desde el F4 | *Logística de deliverys › Cuánto se le paga a cada repartidor* |
| 28-09-2026 | Las Métricas de la jefa van por listener | *Logística de deliverys › Las Métricas de la jefa van por listener* |
| 28-09-2026 | El ABM de Productos va por listener, con las mismas consultas que la Caja | *Firestore › El catálogo de la Caja va por listener* |
| 28-09-2026 | Los links de Google Drive en las fotos no se rechazan | *Storage › Fotos de producto* |
| 03-10-2026 | La toma de una solicitud se libera sola a los 15 minutos | *Flujo del pedido › Una solicitud web tiene un solo dueño* |
| 03-10-2026 | Estadísticas del sistema nuevo desde los resúmenes guardados | *Arqueo y estadísticas › Métricas y Estadísticas* |
| 04-10-2026 | Todo a la última versión (firebase 12, React 19, Router 7, react-table 9, firebase-admin 14) | [[Deuda tecnica#Sobre CRA]] |
| 04-10-2026 | Auth con `initializeAuth`, sin el iframe de proveedores | *Authentication › initializeAuth, sin iframe* |
| 04-10-2026 | Un viaje en la calle no se anula, también en las reglas | *Logística de deliverys › Un viaje en la calle no se anula* |
| 08-10-2026 | Un pedido sin ítems de cocina saltea la cocina | *Cocinero › Qué ve* |
| 12-10-2026 | Excepciones de horario por jornada, en dos lugares; las sucursales se publican solas | *Jornada y horarios › Excepciones: feriados y noches puntuales* |
| 12-10-2026 | `REACT_APP_modoTest` para probar de día | *Jornada y horarios › Probar de día: REACT_APP_modoTest* |
| 12-10-2026 | Panel Admin en pestañas; pantallas de admin con tabla + botón + modal | *Gestion interna › Panel Admin: personal, sucursales y envíos* |
| 14-10-2026 | Un pedido anulado solo lo cambia el admin; restaurar desde el Historial | *Modelo de estados › Los estados* |
| 14-10-2026 | El pedido de la Caja tiene id fijo; solo el reintento lee | *Caja › Guardar un pedido* |
| 14-10-2026 | Sin conexión, las acciones avisan antes de escribir | *Frontend › Sin conexión, las acciones avisan antes de escribir* |
| 14-10-2026 | La fecha del horario especial va sobre la jornada | *Jornada y horarios › Horario especial* |
| 15-10-2026 | **Suman solo los pedidos entregados** (versión 2 del resumen guardado) | *Arqueo y estadísticas › Suman solo los pedidos entregados (15-10-2026)* |
| 15-10-2026 | Corregir un pedido y borrar el resumen de su noche, en una sola escritura | *Arqueo y estadísticas › El resumen guardado* |
| 15-10-2026 | Cada módulo, solo para su rol (`RequireRole`); el encargado entra a todos | *Frontend › Guards* |
| 15-10-2026 | Cerrar un viaje exige repartidor; "Entregado sin repartidor", solo la jefa | *Logística de deliverys › El viaje, paso a paso* |
| 15-10-2026 | Montos y fechas desde un solo lugar (`formato.js`) | *Convenciones y preferencias › Convenciones de código* |
| 16-10-2026 | La web pública se rehace entera; un carrito por sucursal | *Web publica* |
| 16-10-2026 | "¿Privado?" reemplaza a "pausar" (`visible`); lo de $0 se muestra | *Catálogo › Qué producto se ve dónde* |
| 16-10-2026 | `/menu` descarga páginas de 1080 × 1920 con html2canvas y jsPDF | *Web publica › /menu: la carta y sus descargas* |
| 22-10-2026 | En el menú, las Estadísticas se llaman "Actuales" e "Históricas" | *Arqueo y estadísticas › Métricas y Estadísticas* |

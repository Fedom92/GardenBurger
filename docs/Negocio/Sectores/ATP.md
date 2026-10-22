---
tags: [gardenburger, negocio, sectores]
aliases: [Atencion al publico, Mostrador]
actualizado: 2026-10-22
---

# ATP — Atención al Público

↑ [[Sectores]]

El mostrador. "ATP" es a la vez un rol, una pantalla (`/gestion-atp`) y un estado del pedido: el
pedido está listo y espera que el cliente lo retire. Llegan acá los de las zonas **"Retira"** y
**"Espera Afuera"** (`ENVIOS_LOCALES`).

## Qué hace

- **Entrega el pedido** → `ENTREGADO`. **Con eso el pedido suma al arqueo**: cobrar no alcanza.
  Si el pedido es de una noche ya cerrada, la misma escritura borra el resumen guardado de esa
  noche para que se recalcule (`actualizarPedidoYResumen`).
- **Avisa por WhatsApp** "tu pedido está listo", solo si el pedido tiene teléfono (en el local no
  es obligatorio).
- **Imprime el ticket** de los pedidos que no pasaron por la cocina (solo bebidas): el ticket se
  imprime en la cocina, y esos salían sin ninguno (15-10-2026). Solo acá: no hay deliverys de
  solo bebidas (dueño, 13-10-2026).

La lista se escucha en vivo por estado. Antes de entregar, la pantalla relee la lista vigente: un
pedido anulado mientras el cartel preguntaba no vuelve al circuito.

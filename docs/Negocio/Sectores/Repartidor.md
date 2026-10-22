---
tags: [gardenburger, negocio, sectores]
aliases: [Delivery (persona), Repartidores]
actualizado: 2026-10-22
---

# Repartidor

↑ [[Sectores]]

Lleva los pedidos. **No entra al sistema**: existe como empleado en `usuarios`, con el rol delivery
y `sinAcceso: true` (sin cuenta de Auth), porque trabaja, cobra y tiene que aparecer en la
asistencia y en la liquidación. Lo da de alta el admin, cargando los datos de la moto en vez de
correo y clave.

## Lo que hay que saber de su trabajo

- **No da cambio.** Si el cliente paga con un billete más grande, la diferencia la trae él y los
  admins se la transfieren al cliente, o se la queda de propina. Lo decide el cajero al tomar el
  pedido.
- **Cobra en la puerta solo lo que el sistema le dice**: el total en efectivo, la parte en
  efectivo de un pago dividido, o nada si fue Mercado Pago.
- **Un viaje se paga siempre**, se haya entregado o no: si el cliente canceló, el viaje se hizo.

## Cuánto cobra

**Sus horas como cualquier empleado, más el envío de cada viaje cerrado.** No hay fijo desde el
28-09-2026. Llegar tarde o devolver un préstamo son descuentos de su asistencia. Le paga el
*Encargado* cada noche, con los números del F4. El cálculo: *Logística de deliverys › Cuánto se le paga a cada repartidor*.

Cómo se lo asigna y se registra cada viaje: *Jefa de deliverys*.

---
tags: [gardenburger, negocio, sectores]
aliases: [Jefe de deliverys, Jefa de deliveries]
actualizado: 2026-10-22
---

# Jefa de deliverys

↑ [[Sectores]]

Maneja el reparto de la sucursal desde **Deliverys** (`/jefe-deliverys`). Rol propio
(`REACT_APP_jefeDeliverys`); el *Encargado* también entra al módulo. Las reglas del reparto
—qué se cobra en la puerta, vuelto o propina, cuánto cobra cada repartidor— están en
*Logística de deliverys*.

## Qué hace con cada pedido

1. **Asigna un repartidor** (de los empleados activos de su sucursal con rol delivery). Puede
   **reasignarlo** aunque el viaje esté en curso: es tema suyo (dueño, auditoría 11-10-2026).
2. **Marca la salida** (`estadoDelivery: SALIO`). Desde ahí nadie puede anular el pedido hasta que
   ella marque que volvió.
3. **Cierra el viaje**, con una de dos:
   - **"Confirmar entrega"**: carga con cuánto pagó al final el cliente (`pagaronCon`, a mano y
     sin precargar) y el pedido pasa a `ENTREGADO`: suma al arqueo.
   - **"Volvió sin entregar"**: el cliente canceló o no se encontró la dirección. El viaje se
     cierra y se paga el envío, pero el pedido sigue en `DELIVERY`, marcado en rojo, hasta que el
     encargado lo anule desde F3.

   Los dos **exigen un repartidor asignado**: el envío se le paga a quien hizo el viaje.
4. **"Entregado sin repartidor"**, **solo ella** (el encargado no ve el botón): un delivery que no
   salió y se entregó igual, porque el cliente lo vino a buscar o lo llevó alguien del local. Pasa
   a `ENTREGADO` sin viaje y se le saca el repartidor si tenía.

## Qué ve

- En la tabla, **lo que el repartidor tiene que cobrar**, no el total, y si la diferencia es
  vuelto o propina (no el alias: la transferencia no es suya).
- **Métricas** de la noche, en vivo: viajes, envíos y efectivo a rendir por repartidor, con el
  detalle de cada viaje. Es un control del sector: **no paga nada**. A los repartidores les paga
  el encargado desde el F4.

Hasta el 28-09-2026 las Métricas se llamaban "Liquidación" y sumaban un fijo por repartidor.

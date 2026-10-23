---
tags: [gardenburger, negocio, sectores]
aliases: [Cliente web]
actualizado: 2026-10-23
---

# Cliente

↑ [[Sectores]]

Quien pide desde la web. **No tiene cuenta**: entra sin sesión, elige sucursal, arma el pedido,
lo confirma y lo sigue por un link. Cómo está hecho: *Web publica*.

## Qué puede hacer

- **Pedir solo en horario** de la sucursal elegida, y hasta 1 h antes de su cierre. Fuera de
  horario ve la pantalla de cerrado con el horario y un link a las otras sucursales. Ver
  *Jornada y horarios › Horario de la web de cada sucursal*.
- **Elegir retiro o delivery** y **efectivo o Mercado Pago**. En Mercado Pago ve el recargo como
  porcentaje ("+10%") y, después, el monto a transferir.
- **Ve cuánto sale el envío** antes de confirmar: elige su dirección de las sugerencias de Google
  Maps y la web calcula la zona por distancia. Si está fuera del reparto, lee "No llegamos hasta tu
  dirección, podés retirarlo en el local" y no puede pedir delivery. Si Google no anda, escribe la
  dirección a mano y el envío lo suma la sucursal. Ver *Web publica › El envío por distancia*.
- **Tiene un carrito por sucursal**: si cambia de sucursal arranca vacío, y al volver encuentra lo
  que había elegido.
- **Escribirle a la sucursal por WhatsApp** desde cualquier pantalla. Al confirmar, la web le
  abre WhatsApp con el resumen del pedido hacia el teléfono de esa sucursal.

## Qué pasa con su pedido

- Queda como **solicitud** (`PENDIENTE`): sin número de ticket y sin cobrar. Aparece en el F1 de
  las Cajas de esa sucursal.
- **El precio que vale es el de la Caja.** El cliente vio los precios de una copia publicada del
  menú, que puede estar vieja; al tomarla, el cajero la carga con los precios vigentes. Ver
  *Cajero › Tomar una solicitud web*.
- **Lo sigue en `/ver-pedido`**, en pasos: Recibido · Confirmado · En cocina · Listo o En camino ·
  Retirado o Entregado. No se actualiza solo: recarga la página. **El link vence a las 48 h.**
- Si el cajero la rechaza, ve "Tu pedido fue cancelado".

## Lo que no puede

- Pagar online: Mercado Pago es una transferencia que el cajero verifica a mano.
- Ver productos **privados** (los que se venden solo en la Caja). Ver *Catálogo › Qué producto se ve dónde*.
- Crear un pedido ya confirmado o adjudicárselo a un empleado: las reglas solo aceptan una
  solicitud `PENDIENTE` sin ids del staff. Ver *Reglas de Firestore › Qué valida la creación pública y qué no*.

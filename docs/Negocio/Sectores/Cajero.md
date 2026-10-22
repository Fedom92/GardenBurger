---
tags: [gardenburger, negocio, sectores]
aliases: [Caja (negocio), Cobro, Metodos de pago]
actualizado: 2026-10-22
---

# Cajero

↑ [[Sectores]]

Cobra los pedidos del mostrador y del teléfono, toma las solicitudes de la web y coteja las
transferencias de Mercado Pago. Trabaja en la **Caja** (`/pedidos-caja`), con atajos de teclado:
**F1** solicitudes web, **F2** transferencias por cotejar, **F3** buscar un ticket y **F4** el
arqueo (este último solo lo ve el *Encargado*). Cómo está hecha la pantalla: *Caja*.

Puede haber **varios cajeros a la vez** en la misma sucursal.

## Cobrar un pedido

Al guardar, el pedido nace con su número de ticket y queda:

- **Cobrado** (`CONFIRMADO`) si es en efectivo: pasa a la cocina. Si no tiene nada que cocinar
  —solo bebidas— va directo al mostrador o al delivery.
- **Esperando el cotejo** (`PENDIENTEMP`) si es Mercado Pago o pago dividido.

La **zona de envío** que elige el cajero decide tres cosas: si el pedido va al mostrador o al
delivery, en qué caja se cuenta el efectivo, y qué pide la pantalla (con "Retira" o "Espera Afuera"
se ocultan y limpian dirección y entre calles).

Lo que exige antes de guardar (`validarPedido`):

- **Nombre siempre; dirección y entre calles en delivery** (14-10-2026). Un campo con solo espacios
  cuenta como vacío. Lo valida `validarPedido` porque la Caja no tiene `<form>` —guarda desde el
  botón—, y los `required` de los inputs no validaban nada.
- **Teléfono obligatorio solo en delivery.** En Retira y Espera Afuera puede quedar vacío —el
  cliente está en el local—; si se carga, tiene que tener 10 caracteres (no se verifica que sean
  dígitos).
- Carrito con algo y zona de envío elegida.
- En efectivo, **"Paga con"** mayor o igual al total. En un delivery que paga con más, elegir
  **Vuelto o Propina**: la moto no lleva cambio. Ver
  *Logística de deliverys › La moto no lleva cambio: vuelto o propina*.
- En pago dividido, que el efectivo siga siendo menor que el total (ver abajo).

**La Caja no muestra el vuelto**: el cajero lo calcula. Se decidió así el 26-09-2026; lo ven la
jefa de deliverys y, los vueltos a transferir, el encargado en el F4.

## Métodos de pago

Son las `key` de `METODOS_PAGO` (`Constantes.jsx`); para mostrarlos, `etiquetaPago()`. Nunca se
escriben a mano.

| Valor | Qué es | `pagaCon` |
|---|---|---|
| `EFECTIVO` | efectivo puro | lo que dice el cliente; se exige `>= total` |
| `MP` | Mercado Pago, con **recargo** `REACT_APP_recargoMP` (%) | 0 |
| `%` | **pago dividido**: una parte en efectivo (`montoEfectivo`), el resto por MP con recargo | igual a `montoEfectivo`, sin input |

El recargo se calcula en `useCarrito.getResumen` sobre `subtotal + costo_envio`: en `MP`,
`base × recargo / 100`; en `%`, `(base − montoEfectivo) × recargo / 100`, redondeado.

**Pago dividido: la validación corre dos veces.** `errorPagoDividido` exige `0 < montoEfectivo <
total`; corre al confirmar el modal y otra vez al guardar, porque el cajero puede seguir editando
el carrito: si el total baja del efectivo fijado, el recargo daría negativo y el pedido se
guardaría subcobrado.

## Cotejar una transferencia (F2)

Los pedidos en `PENDIENTEMP` esperan que el cajero vea en **su** Mercado Pago que la plata entró.
**El sistema no verifica nada**: si se aprueba sin mirar, se entrega un pedido no pagado.

- **Aprobar** lo pasa a la cocina (o directo a entrega si no hay nada que cocinar).
- **Rechazar** lo cancela (`CANCELADO`).

## Tomar una solicitud web

Desde el F1, **Revisar** carga la solicitud en el ticket y la deja **tomada por ese cajero**: las
otras Cajas ven de quién es y no pueden revisarla ni rechazarla. Al guardar se cobra como
cualquier pedido, sobre el mismo documento.

- **Los precios se reemplazan por los del catálogo en vivo**, en silencio: el cliente pudo ver un
  menú publicado viejo. Si un producto ya no existe, conserva el precio del cliente.
- **La toma dura 15 minutos.** Pasado ese tiempo la Caja limpia el ticket sola y cualquier otro
  cajero puede tomarla.
- **Cancelar** libera la solicitud. **Rechazar** la cancela.

Cómo se garantiza que dos cajeros no la cobren a la vez: *Flujo del pedido › Una solicitud web tiene un solo dueño*.

## Numeración de tickets

`codigo = "{número}-{iniciales del cajero}"`, por ejemplo `42-JD`. **El número es por
sucursal** y sale del contador `sucursales/{id}/contadores/pedidos`, que avanza **dentro de la
misma transacción** que guarda el pedido (`avanzarContador`): o se guardan los dos o ninguno, así
un guardado fallido no deja un número salteado —en un negocio de efectivo, un ticket que falta
parece plata que falta—.

`getNextSequence` abre su propia transacción para quien solo necesite el número; hoy no la usa
nadie. Ver *Caja › Guardar un pedido*.

## La ficha del cliente

Cada cobro con teléfono **crea o actualiza** la ficha en `clientes` (`registrarCliente`): si el
teléfono ya existe, pisa nombre, dirección y entre calles con lo recién cargado —la última
dirección es la más probable— y suma `cantidadPedidos` y `ultimoPedido`. Cuesta 1 lectura + 1
escritura por pedido; sin teléfono no hace nada. Los clientes son de todas las sucursales.

## Horario especial

Un pedido encargado para más tarde: el cajero elige la hora con el botón ⏱ y el pedido guarda
**esa hora como `timestamp`**. Las reglas del selector: *Jornada y horarios › Horario especial*.

## Buscar un ticket (F3)

Busca en la jornada en curso por teléfono, código o dirección. **Muestra también los eliminados y
cancelados**, a propósito: el cajero tiene que poder auditarlos. Eliminar es solo del
*Encargado*.

## Reglas del carrito de la Caja

Implementadas en `useCarrito` y sin otro lugar donde estén escritas:

1. **Un extra de hamburguesa solo se agrega justo después de una hamburguesa** (o de otro extra
   de hamburguesa). Con una bebida en el medio, se rechaza.
2. **La cantidad solo se acumula sobre el último ítem**: el mismo producto con algo en el medio
   abre un renglón nuevo. Por eso la Caja no tiene `− +` por línea.
3. Los extras van **debajo de su producto, por posición**; así los lee la Cocina.

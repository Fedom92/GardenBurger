---
tags: [gardenburger, negocio, deliverys]
aliases: [Logistica de deliverys, Deliverys, Reparto, Viajes]
actualizado: 2026-10-22
---

# Logística de deliverys

↑ [[Reglas de negocio]]

El reparto: cómo se registra cada viaje, qué se cobra en la puerta, qué pasa con el cambio y cuánto
cobra cada repartidor. Lo maneja la *Jefa de deliverys* desde `JefeDeliverys`; el
*Encargado* entra al módulo y les paga a los repartidores. Los repartidores (*Repartidor*) no
tienen módulo.

## El viaje, paso a paso

Mientras el pedido está en `DELIVERY`, el campo `estadoDelivery` lleva el viaje:

| `estadoDelivery` | Otros campos | Qué significa | ¿Suma al arqueo? |
|---|---|---|---|
| — (sin repartidor o asignado) | `deliveryID`, `deliveryAsignado`, `gestorDelivery*` | listo para salir | no |
| `SALIO` | `deliverySalidaTimestamp` | **en la calle**: no se puede anular | no |
| `VOLVIO` + `estado: ENTREGADO` | `deliveryFinTimestamp`, `pagaronCon` | entregado | **sí** |
| `VOLVIO` + `sinEntregar: true` | `deliveryFinTimestamp`; el estado sigue `DELIVERY` | **volvió sin entregar**: el viaje se paga; falta que el encargado lo anule | no |
| — + `estado: ENTREGADO` | `entregaSinRepartidor*` | **entregado sin repartidor**: no salió, se entregó igual | **sí**, sin envío para nadie |

- **Cerrar un viaje exige repartidor** (15-10-2026): "Confirmar entrega" y "Volvió sin entregar"
  no andan si el pedido se quedó sin `deliveryID` —pasa si lo desasignan con el viaje en curso—,
  porque el envío se le paga a quien hizo el viaje. Reasignarlo sigue permitido.
- **"Entregado sin repartidor" es solo de la jefa**, con confirmación, y relee la lista vigente:
  si mientras preguntaba el pedido salió o se cerró, avisa y no escribe.
- **La lista de la jefa no filtra por jornada**: un delivery que quedó sin rendir anoche aparece
  hoy y se cierra con la noche **del pedido** (por eso `marcarEstado` necesita el pedido entero,
  no solo su id).

### Un viaje en la calle no se anula

Si el cliente cancela o no se encuentra la dirección, **el viaje se hizo y se paga**. Para que quede
registrado, **nadie puede anular** un pedido con `estadoDelivery == SALIO` —ni el encargado desde
F3 ni el admin desde el Historial—: primero la jefa marca que volvió. Los dos releen el pedido
antes de anular (1 lectura). La regla está una vez en el front (`enLaCalle()`, en
`useResumenDiario.js`) y otra en Firestore (`anulaViajeEnLaCalle()`, 04-10-2026), así tampoco pasa
desde una Caja con código viejo.

Se evaluó dejar anularlo y avisarle a la jefa, y se descartó: un pedido anulado sale de su lista
—que escucha los `DELIVERY`—, así que no podría marcar que volvió y el viaje no se pagaría. El orden
que fuerza el bloqueo es el que se sigue en el local: el encargado le avisa a la jefa, ella cierra
el viaje y recién ahí se anula.

## Qué se cobra en la puerta

Lo que el repartidor tiene que **cobrar**, no el total. Sale de `repartirPago(p).efectivo`, la misma
función que arma el arqueo, así la calle y la caja no pueden discrepar:

| Método | A cobrar | Lo que ve la jefa |
|---|---|---|
| `EFECTIVO` | el total | "Paga con $12.500 · Vuelto: $2.500 (lo trae el repartidor)", o "Propina" |
| `%` (dividido) | **solo `montoEfectivo`** | "Paga con" igual a `montoEfectivo`: no hay diferencia |
| `MP` | nada — "No se cobra" | ni el total ni `pagaCon` |

### La moto no lleva cambio: vuelto o propina

Si el cliente paga en efectivo con más de lo que sale, el repartidor **no da cambio**. El cajero
se lo avisa al tomar el pedido y marca en la Caja qué pasa con la diferencia (`DESTINO_VUELTO`,
28-09-2026). Es **obligatorio** en un delivery en efectivo que paga con más.

- **Vuelto**: el repartidor trae la plata y los admins le transfieren el vuelto al cliente al
  cierre. El cajero puede anotar el **alias** (opcional).
- **Propina**: se la queda el repartidor.

En Retira y Espera Afuera no se pregunta: el cambio se da en mano. La jefa ve "Vuelto" o "Propina"
pero no el alias. Los vueltos **no** entran en lo que cobra el repartidor. El encargado ve en el F4
la lista de **vueltos a transferir** (`vueltosATransferir`), con un botón Copiar; el monto es el
real si el repartidor ya volvió (`pagaronCon` menos lo que había que cobrar), y si no el que anunció
el cliente, marcado "a confirmar".

### `pagaCon` y `pagaronCon`

- **`pagaCon`** lo carga el cajero: con cuánto **dijo** el cliente que iba a pagar. En el dividido
  no hay input: es la parte en efectivo.
- **`pagaronCon`** lo carga la jefa al volver el repartidor: con cuánto pagó **al final**. Va **a
  mano y sin precargar**: con `pagaCon` ya escrito, confirmar sin mirar sería un error que no se
  ve. Es libre: hoy no se compara con nada. En MP no se pide. Hasta sep-2026 se llamaba
  `pagoRepartidorCon`.

## Cuánto se le paga a cada repartidor

**Sueldo de la noche = base de su asistencia + envíos. No hay fijo** (28-09-2026; antes era
`REACT_APP_fijoDeliverys` más los envíos).

- **La base** es la de cualquier empleado: `horas × valorHora − descuentos`, de la asistencia que
  carga el encargado.
- **Los envíos** son el `envio.costo_envio` de cada viaje **cerrado** (`VOLVIO`), entregado o no.
  Se paga aunque el pedido haya sido por MP. El costo queda congelado en el pedido al cobrarlo.
- Un viaje sin entregar o un pedido anulado **no suma efectivo a rendir**: no hubo cobro.

Lo calcula `liquidarDeliverys()` (`useResumenDiario.js`), y lo usan tres pantallas con los mismos
números:

| Dónde | Quién | Qué muestra |
|---|---|---|
| **F4** de la Caja | encargado, al cierre | por repartidor: viajes, envíos, **base** (1 lectura de la asistencia de la noche) y **a pagar**. Con eso se le paga cada noche |
| **Métricas** de Deliverys | jefa, toda la noche | viajes, envíos y efectivo a rendir, con el detalle de cada viaje. No paga nada |
| **Liquidación** de Asistencias | admin, por período | a los repartidores les suma sus envíos, del resumen guardado de cada noche. Registra el trabajo hecho, no a quién se le pagó |

**Por qué paga el encargado, desde el F4**: a los repartidores se les paga cada noche, y quien
cierra la noche es el encargado. Antes la jefa anotaba los envíos a mano; ahora salen de los
pedidos.

### Las Métricas de la jefa van por listener

Salen de un `onSnapshot` sobre los viajes cerrados de la noche
(`where("deliveryFinTimestamp", ">=", inicioDeLaJornada)`), además del listener de los pedidos en
`DELIVERY`. Antes leían la noche entera al abrirse (~60-100 lecturas) y por eso tenían ventana
horaria; el listener cuesta ~1 lectura por viaje cerrado y abrirlas no cuesta nada. Es un rango
sobre **un solo campo**: alcanza el índice automático.

## Riesgo conocido

**"Entregado sin repartidor" cuenta en "Envíos" del F4**: el pedido conserva el `esLocal` con que
se cobró (un delivery), así que su efectivo cae en la fila del efectivo que vuelve con los
repartidores aunque haya entrado por el mostrador. El total no se descuadra, solo la separación. Si
molesta, la salida es escribir `esLocal: true` al marcarlo (15-10-2026).

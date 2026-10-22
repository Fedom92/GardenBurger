---
tags: [gardenburger, negocio, workflow]
aliases: [Estados, Transiciones, Maquina de estados]
actualizado: 2026-10-22
---

# Modelo de estados del pedido

↑ [[Reglas de negocio]]

*Flujo del pedido* cuenta el recorrido feliz. Esta nota mira lo mismo como **máquina de
estados**: qué transiciones existen, cuáles se permiten aunque no deberían y qué pedido entra al
arqueo. Es la nota para leer antes de tocar cualquier cosa que cambie `estado`. El pipeline
dibujado: [[Mapa del sistema.canvas|Mapa del sistema]].

## Los estados

Los valores están en `ESTADOS` de `Utils/Constantes.jsx`, y **se repiten en `firestore.rules`**
(las reglas no leen el código): si cambian en un lado, cambiar el otro.

| Estado | Qué significa | ¿Terminal? |
|---|---|---|
| `PENDIENTE` (`WEB_PENDIENTE`) | Solicitud web; nadie la cobró | No |
| `PENDIENTEMP` | Cobrado por MP o dividido; falta cotejar la transferencia | No |
| `CONFIRMADO` | Cobrado; espera que la cocina lo tome | No |
| `COCINA` | En producción | No |
| `ATP` | Listo, esperando en el mostrador | No |
| `DELIVERY` | Listo, en manos de la jefa de deliverys | No |
| `ENTREGADO` (`FINAL`) | Cerrado. **Es el único que suma al arqueo** | Sí |
| `CANCELADO` | Rechazo de solicitud web o de transferencia | Sí, salvo el admin |
| `ELIMINADO` | Anulado por el encargado (F3) o el admin (Historial) | Sí, salvo el admin ("Restaurar") |

**Los anulados son terminales por regla** desde el 14-10-2026: `saleDeAnuladoSoloAdmin()` no deja
cambiar el `estado` de un CANCELADO o ELIMINADO salvo al admin. Antes, tres pantallas que escribían
con una lista leída antes de su cartel de confirmación ("Cocinados TODOS", "Rechazar" en F2 y el
aviso de horarios especiales) podían devolver al circuito —y al arqueo— un pedido anulado mientras
el cartel preguntaba. Hoy además leen la lista vigente después de confirmar.

> [!info] Restaurar pedido (14-10-2026)
> Eliminar desde el **Historial** guarda `estadoAnterior`, y esos pedidos muestran un botón que
> los devuelve a ese estado, deja `restauradoPor*` y borra el resumen guardado de su noche. Lo
> anulado desde **F3** no guarda `estadoAnterior` y no se restaura: el cajero rehace el pedido.

**`estadoDelivery` es una sub-máquina dentro de `DELIVERY`** (`SUBESTADOS_MOTODELIVERY`: `SALIO`,
`VOLVIO`): el pedido no cambia de `estado` entre que sale y que vuelve. Las combinaciones
posibles —en la calle, volvió sin entregar, entregado sin repartidor— están en
*Logística de deliverys › El viaje, paso a paso*.

## Transiciones válidas

| Desde | Hacia | Quién · dónde |
|---|---|---|
| — | `PENDIENTE` | Cliente · la web |
| — o `PENDIENTE` | `CONFIRMADO` (efectivo) / `PENDIENTEMP` (MP, dividido) | Cajero · `Caja.guardarBD` |
| — o `PENDIENTE` | `ATP` / `DELIVERY` | Cajero, efectivo **sin ítems de cocina** · `estadoAlConfirmar` |
| `PENDIENTE` | `CANCELADO` | Cajero, al rechazar · F1 |
| `PENDIENTEMP` | `CONFIRMADO`, o `ATP` / `DELIVERY` sin ítems de cocina | Cajero, al cotejar · F2 |
| `PENDIENTEMP` | `CANCELADO` | Cajero, al rechazar · F2 |
| `CONFIRMADO` | `COCINA` | Cocinero · "Empezar a cocinar" |
| `COCINA` | `ATP` / `DELIVERY` | Cocinero · "Cocinados TODOS", según la zona |
| `ATP` | `ENTREGADO` | ATP · mostrador |
| `DELIVERY` | `ENTREGADO` | Jefa · "Confirmar entrega" (exige repartidor) o "Entregado sin repartidor" (si no salió) |
| casi cualquiera | `ELIMINADO` | Encargado (F3, la jornada en curso) o admin (Historial, cualquier fecha); nunca un delivery en la calle |
| `ELIMINADO` | `estadoAnterior` | Admin · "Restaurar pedido" |

## Qué pedido entra al arqueo

**Ninguna transición escribe el arqueo**: se calcula desde los pedidos de la jornada. Entra un
pedido que cumple las dos (`entraAlArqueo()`):

1. **Tiene `cajeroID`**: lo cobró un cajero. Una solicitud web que nadie atendió nunca movió plata.
2. **Está `ENTREGADO`** (desde el 15-10-2026). Lo cobrado y no entregado se muestra aparte en el F4.

**Cada pedido cuenta en SU jornada**, la de su `timestamp`: anular hoy un pedido de anoche corrige
la noche de anoche. Si esa noche ya tenía resumen guardado, `actualizarPedidoYResumen()` lo borra en
la misma escritura. El detalle: *Arqueo y estadísticas*.

## Transiciones que se permiten y no deberían

**El sistema no valida el estado de origen en general.** Las escrituras son `updateDoc` /
`batch.update` sobre el pedido, y las reglas de `update` solo exigen sesión y tres condiciones
puntuales: la asignación de la solicitud, no anular un viaje en la calle y que un anulado lo mueva
solo el admin. Lo demás puede saltar de cualquier estado a cualquier otro si alguien tiene la
pantalla abierta en el momento equivocado.

| Desde | Hacia | Cómo se llegaba | Estado |
|---|---|---|---|
| `CANCELADO` | `ELIMINADO` | F3 ofrecía Eliminar para todo | ✅ F3 ya no lo ofrece, y con el arqueo calculado no descuenta dos veces |
| `ELIMINADO` | `COCINA` | La cocina lo tenía tildado cuando se anuló | ✅ `PedidosEspera` poda la selección en cada cambio, y la regla de anulados lo rechaza |
| `ELIMINADO` / `CANCELADO` | cualquiera | Un botón que escribía con la lista vieja | ✅ 14-10-2026: listas vigentes + regla |
| `DELIVERY` en la calle | `ELIMINADO` / `CANCELADO` | F3 o el Historial | ✅ `enLaCalle()` en el front y `anulaViajeEnLaCalle()` en las reglas (04-10-2026) |
| `ENTREGADO` | `ELIMINADO` | F3 o el Historial | ✅ **Correcto por diseño**: es anular una venta, y sale del arqueo |
| cualquiera | cualquiera | Dos pantallas escribiendo a destiempo | **Abierto**: gana la última escritura, sin aviso |

Cerrarlo del todo exigiría validar el estado de origen en cada escritura del pedido; un servicio
único de transiciones se descartó (auditoría 11-10-2026). Ver *Deuda tecnica › El pipeline no valida transiciones de estado*.

> [!success] Ya no hace falta saber si el arqueo "fue aplicado"
> Se había evaluado una marca `arqueoAplicado` en el pedido para que un camino que revirtiera dos
> veces no descontara dos veces. Con el arqueo calculado la pregunta desapareció: el estado del
> pedido **es** la respuesta, y recalcular mil veces da el mismo número.

## Concurrencia: dónde se pisan

1. **Tomar una solicitud web.** ✅ La regla `asignacionValida()` rechaza la segunda toma.
2. **Cocina y Caja sobre el mismo pedido.** ✅ La cocina poda su selección en cada cambio.
3. **Dos pantallas cualesquiera.** Abierto: gana la última escritura.

`useAccionUnica` cubre el doble click de **una** persona, no a dos.

## Los campos de cada paso

Cada paso deja quién y cuándo (`<actor>ID`, `<actor>`, `<actor>Timestamp`), para auditar después.
La lista completa, con quién escribe cada uno: *Modelo de datos Firestore › Trazabilidad: quién tocó qué*.

---
tags: [gardenburger, workflow]
aliases: [Pipeline, Recorrido del pedido]
actualizado: 2026-10-08
---

# Flujo del pedido

← [[GardenBurger]] · relacionado: [[Modelo de estados]], [[Modelo de datos Firestore]], [[Reglas de negocio]] · vocabulario en [[Glosario]]

Los valores están en `ESTADOS` de `src/Utils/Constantes.jsx`. **Nunca hardcodear los strings.**

> [!tip] Esta nota cuenta el recorrido feliz
> Para las transiciones **que el sistema permite y no debería** —un `ELIMINADO` que vuelve a
> cocina, dos pantallas pisándose el estado— y para saber qué pedido entra al arqueo, la nota es
> [[Modelo de estados]].

## Pipeline

```
                  ┌─ web ─────────────┐
                  │  PENDIENTE        │  CrearSolicitud (público)
                  └────────┬──────────┘
                           │  el cajero la toma (F1 → PendientesSolicitudes)
                           ↓
Caja.guardarBD ──→  CONFIRMADO          (efectivo)
               └─→  PENDIENTEMP         (MP o pago dividido "%")
                           │
                           │  F2 → PendientesMP: el cajero coteja la transferencia
                           ↓
                     CONFIRMADO         (sin ítems de cocina —solo bebidas— no para acá:
                           ↓             saltea la cocina y va directo a ATP / DELIVERY)
                   COCINA               PedidosEspera → "Empezar a Cocinar"
                           ↓
                   PedidosCocinando → "Cocinados TODOS"
                           │
              ┌────────────┴────────────┐
   zona ∈ ENVIOS_LOCALES          resto de las zonas
              ↓                          ↓
            ATP                      DELIVERY
     (ATP.jsx, mostrador)      (JefeDeliverys.jsx)
              │                          │ asignar repartidor
              │                          │ estadoDelivery: SALIO → VOLVIO
              └────────────┬─────────────┘
                           ↓
                      ENTREGADO   (ESTADOS.FINAL)
```

Fuera del flujo feliz: **`CANCELADO`** (rechazo de solicitud web o de transferencia MP) y
**`ELIMINADO`** (el cajero borra el ticket desde `BuscarPedido`).

Ninguno de los dos escribe el arqueo, porque el arqueo se calcula desde los pedidos de la jornada.
Desde el 15-10-2026 **suman solo los pedidos ENTREGADOS**: cobrar no alcanza. Lo cobrado que
todavía no se entregó el F4 lo muestra aparte ("Cobrados todavía sin entregar").

- Rechazar una **solicitud web** (`PENDIENTE` → `CANCELADO`) no cambia el arqueo: sin `cajeroID`,
  nunca contó.
- Rechazar una **transferencia MP** (`PENDIENTEMP` → `CANCELADO`) tampoco: todavía no se había
  entregado. Deja de figurar entre lo cobrado sin entregar.
- Eliminar un ticket lo saca si ya estaba entregado, y lo hace **solo el encargado**, al
  fiscalizar el cierre.

> [!important] El ruteo de cocina define todo lo que sigue
> `destinoPedidoListo(envio)` (en `Utils/ruteoPedido.js`) decide entre `ATP` y `DELIVERY` mirando
> `pedido.envio.zona_envio` contra `ENVIOS_LOCALES`. Esa es la **fuente de verdad**, no lo que
> eligió el cliente en la web. Lo usan `PedidosCocinando` al terminar y, para los pedidos sin
> nada que cocinar, la Caja y `PendientesMP` al confirmar el cobro.

> [!note] Un pedido sin ítems de cocina no pasa por la cocina (08-10-2026)
> Si el carrito no tiene nada que cocinar —hoy, solo bebidas: lo define `getItemsCocina()`—, al
> quedar cobrado va **directo** a `ATP` o `DELIVERY` en vez de a `CONFIRMADO`. Lo decide
> `estadoAlConfirmar()` en los dos lugares donde un pedido queda cobrado: `Caja.guardarBD`
> (efectivo) y `PendientesMP.aprobarPedido` (MP / dividido, al cotejar). Un `PENDIENTEMP` sigue
> esperando el cotejo como cualquier otro. Antes caía en la espera de la cocina como "Sin items de
> cocina" y el cocinero tenía que mandarlo a cocinar y marcarlo cocinado para destrabarlo.
>
> Esos pedidos no tienen `cocinero*` ni `cocinaFinTimestamp`. Y como el ticket del cliente se
> imprime en la cocina, **ATP les muestra un botón Imprimir** (15-10-2026, el mismo
> `TicketImpresion`). Solo en ATP: no hay deliverys de solo bebidas.

## Quién escribe qué

| Paso | Componente | Escribe |
|---|---|---|
| Cliente arma pedido web | `Crearsolicitud` → `TuPedido.comprar` | doc nuevo `PENDIENTE`, `clienteTimestamp`, `mensajeWsp`, `cliente{}` |
| Cajero toma la solicitud | `useRevisarSolicitud` | `cajeroRevisaID`, `cajeroRevisa`, `cajeroRevisaTimestamp` |
| Cajero cancela el ticket | `Caja.cancelarTicket` | borra `cajeroRevisa*` (solo si es suyo) |
| Cajero guarda | `Caja.guardarBD` | todo el pedido + `codigo` + estado (`PENDIENTEMP`, `CONFIRMADO`, o `ATP`/`DELIVERY` si no hay nada que cocinar); **borra** `cajeroRevisa*`. El arqueo no se escribe: se calcula |
| Confirma MP | `PendientesMP.aprobarPedido` | `estado: CONFIRMADO` (o `ATP`/`DELIVERY` si no hay nada que cocinar) + `cajeroApruebaMP*` |
| Rechaza MP | `PendientesMP.rechazarPedido` | `estado: CANCELADO` |
| Manda a cocinar | `PedidosEspera.cocinar` | `estado: COCINA` + `cocinero*` |
| Marca cocinado | `PedidosCocinando` | `estado: ATP\|DELIVERY` + `cocinaFinTimestamp` |
| Entrega en mostrador | `ATP` | `estado: FINAL` + `atp*` — con eso **entra** al arqueo |
| Asigna repartidor | `JefeDeliverys` | `delivery*`, `gestorDelivery*` |
| Salida / regreso | `JefeDeliverys` | `estadoDelivery`, timestamps, `pagaronCon`, `estado: FINAL` (con eso entra al arqueo). Cerrar el viaje exige repartidor. Las métricas del repartidor se calculan desde acá |
| Entregado sin repartidor | `JefeDeliverys` (**solo la jefa**) | `estado: FINAL` sin viaje + `entregaSinRepartidor*`; le saca el repartidor si tenía. Entra al arqueo, no a la liquidación de repartidores |
| Elimina el ticket | `BuscarPedido` (**solo el encargado**) | `estado: ELIMINADO` + `cajeroElimina*` — con eso sale del arqueo, si estaba entregado |

Los que corrigen un pedido ya existente —entregar, anular, rechazar, cerrar un viaje— escriben con
`actualizarPedidoYResumen()`: si la noche del pedido ya cerró, borra su resumen guardado en la
misma escritura. Ver [[Mapa de operaciones Firestore#Escrituras que mueven plata]].

## Cómo el cliente arma el carrito (menú público)

El carrito web (`carritoWeb.js`) guarda **cada línea con sus extras adentro** mientras el cliente
arma el pedido, y al confirmar lo **aplana** a la lista que lee la Caja: cada producto seguido de
sus extras, en ese orden.

1. **Hamburguesas** (SIMPLE / DOBLE / TRIPLE agrupadas por nombre) y **Pollo crispy**: la ficha
   ofrece el tamaño (solo hamburguesas), los extras de hamburguesa y los de las papas del combo.
2. **Caja de papas**: los extras de papas y los generales. **Otros productos** (nuggets…): los
   generales. Sin extras, se agregan directo.
3. **Bebidas**: van directo, y una bebida repetida suma `cantidad` en su línea.
4. El carrito se persiste en `localStorage` (`pedidoWeb`).

El detalle —qué extras ofrece cada producto, el documento que escribe y lo que la Caja usa de
él— está en [[Web publica]].

> [!caution] `handleAgregarAlCarrito` solo acumula sobre el último ítem
> Por eso el rediseño de Caja descartó el control `− 2 +` por línea: en una fila del medio, el `+`
> agregaría un renglón duplicado en vez de sumar. Ver [[Decisiones tecnicas#El rediseño de la Caja vino de Claude Design]].

## Vista pública del cliente (`/ver-pedido/:sucursal/:id`)

`FLUJO_PUB_ESTADOS` define los 5 pasos que ve el cliente:

```
PENDIENTE → CONFIRMADO → COCINA → DELIVERY → ENTREGADO
```

`PENDIENTEMP` y `ATP` son **estados internos sin paso propio**. `getCurrentStepIndex()` los
mapea al paso equivalente, porque si no `indexOf` devuelve `-1` y la barra queda entera en gris:

- `PENDIENTEMP` → `PENDIENTE` (todavía falta verificar la transferencia, no está confirmado)
- `ATP` → `DELIVERY` ("listo y esperando al cliente", mismo avance que un delivery en camino)

Los pasos se leen **Recibido · Confirmado · En cocina · Listo · Retirado** en un retiro y
**… · En camino · Entregado** en un delivery. `PaginaDetalle` decide con `pedido.envio.zona_envio`
y, mientras el cajero no haya cargado el pedido (no existe `envio` todavía), cae a
`pedido.cliente.opcion`.

`CANCELADO` y `ELIMINADO` no muestran los pasos: "Tu pedido fue cancelado" y lo pedido, tachado.
El resto de los casos está en [[Web publica#El seguimiento (`/ver-pedido`)]].

## Asignación de solicitudes web — un solo dueño

Si dos cajeros cargaran la misma solicitud, los dos podrían guardarla: **dos pedidos distintos**
para el mismo cliente, dos números de ticket quemados y el arqueo contando las dos ventas. Por
eso:

- Tomar una solicitud escribe `cajeroRevisaID` + `cajeroRevisa` + `cajeroRevisaTimestamp` (la hora de la toma).
- `esDeOtroCajero()` deshabilita **Revisar y Rechazar** en las demás cajas. El badge dice de
  quién es. No hay reasignación forzada, salvo que la toma tenga más de 15 minutos (abajo).
- El mismo cajero **sí** puede retomarla: si se le reinicia la PC, vuelve a entrar, ve
  "Asignada a vos" y Revisar le recarga el ticket.
- El botón "Limpiar" de Caja pasa a decir **"Cancelar"** cuando el ticket vino de una solicitud,
  y libera la asignación. `liberarSolicitud` **no relee el doc**: intenta el `updateDoc` y trata
  `permission-denied` como "ya es de otro cajero", porque eso lo garantiza `asignacionValida()`
  en las reglas. Antes era una lectura facturada por cada Cancelar.
- Al guardar, `guardarBD` borra `cajeroRevisa*` con `deleteField()` dentro del mismo
  `batch.set(..., {merge:true})` — sin costo extra de operación.

> [!important] La atomicidad la garantizan las reglas, no el front
> `esDeOtroCajero()` se evalúa contra el **snapshot local**, así que dos cajeros cuyos listeners
> todavía no recibieron la asignación del otro pasan los dos el chequeo. Hasta el 14-09-2026 los
> dos escribían y los dos quedaban con el pedido cargado: dos tickets y dos ventas en el arqueo.
>
> Hoy la regla `asignacionValida()` rechaza la segunda escritura del lado del servidor —sin
> lecturas, sin transacción— y `useRevisarSolicitud` avisa "Otro cajero ya tomó esta solicitud".
> Ver [[Reglas de seguridad#`update`: valida la asignación, no el estado]].
>
> **Al Revisar, los precios del carrito se reemplazan por los del catálogo en vivo** (`productos`
> que la Caja ya tiene en memoria), en silencio. El precio que trae la solicitud lo puso el
> navegador del cliente desde un `menu.json` que puede estar viejo o editado.

> [!note] La solicitud trabada se libera sola a los 15 minutos (03-10-2026)
> Un cajero que toma una solicitud y no vuelve (se le reinició la PC, terminó el turno) ya no la
> deja trabada: pasados `MINUTOS_SOLICITUD_TOMADA` (15) desde la toma, las demás cajas la ven libre
> —sin cartel de asignada— y cualquiera puede tomarla o rechazarla. Lo hace cumplir
> `asignacionVencida()` en las reglas, con la hora de la toma: no cuesta lecturas. El que la toma
> de nuevo reescribe la hora, así que queda protegido otros 15 minutos, también del cajero
> original: si vuelve e intenta guardar, ve "La tomó otro cajero". Una toma sin hora (anterior al
> cambio, o armada a mano) cuenta como vencida. Ver
> [[Reglas de seguridad#`update`: valida la asignación, no el estado]].
>
> **Y el cajero original la pierde (14-10-2026):** al tocar "Revisar", la Caja arranca un
> temporizador de 15 minutos y al cumplirse limpia el ticket sola, sin cartel. Mide duración, no
> hora, así que el reloj de la PC no importa. Al guardar o cancelar, el temporizador se apaga y
> vuelve a arrancar recién con el próximo "Revisar". Si igual llega un guardado que las reglas
> rechazan (otro la tomó, o se rechazó mientras se cargaba), la Caja dice "La solicitud ya no está
> disponible" y limpia el ticket. No se agregó una regla de vencimiento para el dueño de la toma:
> el dueño del sistema decidió que alcanza con el temporizador.
>
> Una solicitud **rechazada** copia la hora del cliente en `timestamp` (`PendientesSolicitudes`):
> es lo que la hace aparecer en F3 y en el Historial, que buscan por `timestamp`. En una rechazada,
> `timestamp` es la hora en que pidió el cliente, no un cobro. Se prefirió así a una consulta extra.

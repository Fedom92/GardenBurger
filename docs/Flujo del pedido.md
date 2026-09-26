---
tags: [gardenburger, workflow]
aliases: [Pipeline, Recorrido del pedido]
actualizado: 2026-09-14
---

# Flujo del pedido

← [[GardenBurger]] · relacionado: [[Modelo de estados]], [[Modelo de datos Firestore]], [[Reglas de negocio]] · vocabulario en [[Glosario]]

Los valores están en `ESTADOS` de `src/Utils/Constantes.jsx`. **Nunca hardcodear los strings.**

> [!tip] Esta nota cuenta el recorrido feliz
> Para las transiciones **que el sistema permite y no debería** —un `CANCELADO` que se elimina y
> descuenta dos veces, un `ELIMINADO` que vuelve a cocina— y el efecto de cada paso sobre el arqueo,
> la nota es [[Modelo de estados]].

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
                     CONFIRMADO
                           ↓
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

El descuento del arqueo con `getResumenOperation({ descontar: true })` **no es automático por el
estado, depende de si el pedido llegó a cobrarse**:

- Rechazar una **solicitud web** (`PENDIENTE` → `CANCELADO`) no toca el arqueo: nunca sumó.
- Rechazar una **transferencia MP** (`PENDIENTEMP` → `CANCELADO`) **sí descuenta**: el pedido ya
  sumó al guardarse en Caja.
- Eliminar un ticket descuenta **solo si tiene `cajeroID`** — `BuscarPedido.jsx:86` lo verifica, así
  que una solicitud web que nadie cobró no descuenta nada al borrarse.

> [!important] El ruteo de cocina define todo lo que sigue
> `PedidosCocinando` decide entre `ATP` y `DELIVERY` mirando `pedido.envio.zona_envio` contra
> `ENVIOS_LOCALES`. Esa es la **fuente de verdad**, no lo que eligió el cliente en la web.

## Quién escribe qué

| Paso | Componente | Escribe |
|---|---|---|
| Cliente arma pedido web | `Crearsolicitud` | doc nuevo `PENDIENTE`, `clienteTimestamp`, `mensajeWsp`, `cliente{}` |
| Cajero toma la solicitud | `useRevisarSolicitud` | `cajeroRevisaID`, `cajeroRevisa` |
| Cajero cancela el ticket | `Caja.cancelarTicket` | borra `cajeroRevisa*` (solo si es suyo) |
| Cajero guarda | `Caja.guardarBD` | todo el pedido + `codigo` + estado; **borra** `cajeroRevisa*`; incrementa `resumenDiario` |
| Confirma MP | `PendientesMP.aprobarPedido` | `estado: CONFIRMADO` + `cajeroApruebaMP*` |
| Rechaza MP | `PendientesMP.rechazarPedido` | `estado: CANCELADO` + **descuenta** el arqueo |
| Manda a cocinar | `PedidosEspera.cocinar` | `estado: COCINA` + `cocinero*` |
| Marca cocinado | `PedidosCocinando` | `estado: ATP\|DELIVERY` + `cocinaFinTimestamp` |
| Entrega en mostrador | `ATP` | `estado: FINAL` + `atp*` |
| Asigna repartidor | `JefeDeliverys` | `delivery*`, `gestorDelivery*` |
| Salida / regreso | `JefeDeliverys` | `estadoDelivery`, timestamps, `pagoRepartidorCon`, `estado: FINAL`, métricas en `resumenDiario.deliverys` |
| Elimina el ticket | `BuscarPedido` | `estado: ELIMINADO` + `cajeroElimina*` + **descuenta** el arqueo |

## Cómo el cliente arma el carrito (menú público)

`CartContext` (608 líneas, de otro desarrollador) es el estado central del menú online. Las reglas
del flujo de modales, que no se deducen leyéndolo de corrido:

1. **Hamburguesas** tienen variantes (SIMPLE / DOBLE / TRIPLE). Al agregar una se abre
   `ModalHamburguesa` y después `ModalExtras`.
2. **Pollo Crispy** usa directamente el flujo de extras de hamburguesa.
3. **Otros productos**: si tienen `extrasGenericos`, se abre `ModalExtrasGenericos`.
4. **Bebidas**: se acumula la cantidad en el ítem existente en vez de crear un renglón nuevo.
5. El campo `combo` es un número que **agrupa los ítems relacionados** de un mismo combo.
6. El carrito se persiste en `localStorage`.

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

En los pedidos de retiro, el cuarto paso se muestra como **"LISTO"** en vez de "DELIVERY".
`PaginaDetalle` decide con `pedido.envio.zona_envio` y, mientras el cajero no haya cargado el
pedido (no existe `envio` todavía), cae a `pedido.cliente.opcion`.

`CANCELADO` y `ELIMINADO` no muestran la barra: muestran un cartel rojo.

## Asignación de solicitudes web — un solo dueño

Si dos cajeros cargaran la misma solicitud, los dos podrían guardarla y el arqueo sumaría el
pedido **dos veces** (`getResumenOperation` usa `increment()`), además de quemar dos números de
ticket. Por eso:

- Tomar una solicitud escribe `cajeroRevisaID` + `cajeroRevisa`.
- `esDeOtroCajero()` deshabilita **Revisar y Rechazar** en las demás cajas. El badge dice de
  quién es. No hay reasignación forzada.
- El mismo cajero **sí** puede retomarla: si se le reinicia la PC, vuelve a entrar, ve
  "Asignada a vos" y Revisar le recarga el ticket.
- El botón "Limpiar" de Caja pasa a decir **"Cancelar"** cuando el ticket vino de una solicitud,
  y libera la asignación. `liberarSolicitud` relee el doc y **solo libera si sigue siendo suya**,
  para no pisarle la asignación a otro.
- Al guardar, `guardarBD` borra `cajeroRevisa*` con `deleteField()` dentro del mismo
  `batch.set(..., {merge:true})` — sin costo extra de operación.

> [!important] La atomicidad la garantizan las reglas, no el front
> `esDeOtroCajero()` se evalúa contra el **snapshot local**, así que dos cajeros cuyos listeners
> todavía no recibieron la asignación del otro pasan los dos el chequeo. Hasta el 14-09-2026 los
> dos escribían y los dos quedaban con el pedido cargado: dos tickets y el arqueo sumando dos veces.
>
> Hoy la regla `asignacionValida()` rechaza la segunda escritura del lado del servidor —sin
> lecturas, sin transacción— y `useRevisarSolicitud` avisa "Otro cajero ya tomó esta solicitud".
> Ver [[Reglas de seguridad#`update`: valida la asignación, no el estado]].
>
> **Al Revisar, los precios del carrito se reemplazan por los del catálogo en vivo** (`productos`
> que la Caja ya tiene en memoria), en silencio. El precio que trae la solicitud lo puso el
> navegador del cliente desde un `menu.json` que puede estar viejo o editado.

> [!caution] Caso abierto: la solicitud trabada
> Un cajero que se asigna una solicitud y no vuelve (terminó el turno) la deja trabada: nadie
> más puede revisarla ni rechazarla. **El encargado no la destraba, por decisión** (14-09-2026).
> Lo va a poder hacer el admin desde `HistorialPedidos`, todavía sin desarrollar — ver
> [[Deuda tecnica#Funcionalidad pendiente]]. Ojo al implementarlo: la regla `asignacionValida()`
> hoy rechaza que alguien que no es el dueño borre `cajeroRevisaID`; necesita `|| esAdmin()`.

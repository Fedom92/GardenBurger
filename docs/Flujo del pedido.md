---
tags: [gardenburger, workflow]
aliases: [Pipeline, Recorrido del pedido]
actualizado: 2026-10-03
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

Ninguno de los dos escribe el arqueo: lo **saca del cálculo**, porque el arqueo se calcula desde
los pedidos de la jornada. Que un pedido cuente o no depende de si llegó a cobrarse, no de su
estado:

- Rechazar una **solicitud web** (`PENDIENTE` → `CANCELADO`) no cambia el arqueo: sin `cajeroID`,
  nunca contó.
- Rechazar una **transferencia MP** (`PENDIENTEMP` → `CANCELADO`) **sí lo baja**: ese pedido sí
  pasó por la Caja.
- Eliminar un ticket lo saca, y lo hace **solo el encargado**, al fiscalizar el cierre.

> [!important] El ruteo de cocina define todo lo que sigue
> `PedidosCocinando` decide entre `ATP` y `DELIVERY` mirando `pedido.envio.zona_envio` contra
> `ENVIOS_LOCALES`. Esa es la **fuente de verdad**, no lo que eligió el cliente en la web.

## Quién escribe qué

| Paso | Componente | Escribe |
|---|---|---|
| Cliente arma pedido web | `Crearsolicitud` | doc nuevo `PENDIENTE`, `clienteTimestamp`, `mensajeWsp`, `cliente{}` |
| Cajero toma la solicitud | `useRevisarSolicitud` | `cajeroRevisaID`, `cajeroRevisa`, `cajeroRevisaTimestamp` |
| Cajero cancela el ticket | `Caja.cancelarTicket` | borra `cajeroRevisa*` (solo si es suyo) |
| Cajero guarda | `Caja.guardarBD` | todo el pedido + `codigo` + estado; **borra** `cajeroRevisa*`. El arqueo no se escribe: se calcula |
| Confirma MP | `PendientesMP.aprobarPedido` | `estado: CONFIRMADO` + `cajeroApruebaMP*` |
| Rechaza MP | `PendientesMP.rechazarPedido` | `estado: CANCELADO` — con eso sale del arqueo |
| Manda a cocinar | `PedidosEspera.cocinar` | `estado: COCINA` + `cocinero*` |
| Marca cocinado | `PedidosCocinando` | `estado: ATP\|DELIVERY` + `cocinaFinTimestamp` |
| Entrega en mostrador | `ATP` | `estado: FINAL` + `atp*` |
| Asigna repartidor | `JefeDeliverys` | `delivery*`, `gestorDelivery*` |
| Salida / regreso | `JefeDeliverys` | `estadoDelivery`, timestamps, `pagaronCon`, `estado: FINAL`. Las métricas del repartidor se calculan desde acá |
| Elimina el ticket | `BuscarPedido` (**solo el encargado**) | `estado: ELIMINADO` + `cajeroElimina*` — con eso sale del arqueo |

## Cómo el cliente arma el carrito (menú público)

`CartContext` (577 líneas, de otro desarrollador) es el estado central del menú online. El resumen
del flujo de modales:

1. **Hamburguesas** tienen variantes (SIMPLE / DOBLE / TRIPLE). Al agregar una se abre
   `ModalHamburguesa` y después `ModalExtras`.
2. **Pollo Crispy** usa directamente el flujo de extras de hamburguesa.
3. **Otros productos**: si existe algún extra `GENERAL` en el catálogo, se abre
   `ModalExtrasGenericos`.
4. **Bebidas**: se acumula la cantidad en el ítem existente en vez de crear un renglón nuevo.
5. El campo `grupo` de cada línea es un contador que, junto con el `id`, identifica la línea.
   Hasta el 04-10-2026 se llamaba `combo`, y no tiene nada que ver con los combos del arqueo. La
   Caja no lo usa: agrupa los extras por posición.
6. El carrito se persiste en `localStorage`.

El detalle —el documento que escribe, lo que la Caja usa de él, los bugs conocidos y por qué está
anotado para rehacer— está en [[Web publica]].

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

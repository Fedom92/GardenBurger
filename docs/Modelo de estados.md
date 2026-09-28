---
tags: [gardenburger, workflow]
aliases: [Estados, Transiciones, Maquina de estados]
actualizado: 2026-09-28
---

# Modelo de estados del pedido

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Modelo de datos Firestore]], [[Auditoria 2026-09]] · vocabulario en [[Glosario]]

[[Flujo del pedido]] cuenta el **recorrido feliz**: quién toca qué pantalla y en qué orden. Esta
nota mira lo mismo como **máquina de estados**: qué transiciones existen, cuáles el sistema permite
aunque no debería, y qué le pasa al arqueo en cada una.

Es la nota para leer antes de tocar cualquier cosa que cambie `estado`, y la que hace falta para
razonar sobre los bugs de dinero.

> [!important] El sistema no valida transiciones
> **Ninguna** escritura verifica el estado de origen: todas son `updateDoc` / `batch.update`
> incondicionales, y las reglas dicen `allow update: if estaAutenticado()`. En la práctica,
> cualquier estado puede saltar a cualquier otro si alguien tiene la pantalla abierta en el momento
> equivocado. Todo lo raro de esta nota sale de ahí.

## Los estados

Los valores están en `ESTADOS` de `src/Utils/Constantes.jsx`. **Nunca hardcodear los strings.**

| Estado | Qué significa | ¿Terminal? |
|---|---|---|
| `PENDIENTE` | Solicitud web creada por el cliente, nadie la tomó | No |
| `PENDIENTEMP` | Cobrado por MP o pago dividido; falta cotejar la transferencia | No |
| `CONFIRMADO` | Cobrado y validado; espera que cocina lo tome | No |
| `COCINA` | En producción | No |
| `ATP` | Listo, esperando al cliente en el mostrador | No |
| `DELIVERY` | Listo, en manos del jefe de deliverys | No |
| `ENTREGADO` (`ESTADOS.FINAL`) | Cerrado | **Sí** |
| `CANCELADO` | Rechazo de solicitud web o de transferencia MP | **Sí**, de hecho no |
| `ELIMINADO` | El cajero borró el ticket desde F3 | **Sí**, de hecho no |

Los dos últimos son terminales **en la intención**, no en el código: nada impide salir de ellos.

## Transiciones válidas

| Desde | Hacia | Quién la dispara | Dónde | Efecto en el arqueo |
|---|---|---|---|---|
| — | `PENDIENTE` | Cliente web | `Crearsolicitud` | — |
| — | `CONFIRMADO` | Cajero (efectivo) | `Caja.guardarBD` | **Suma** |
| — | `PENDIENTEMP` | Cajero (MP o dividido) | `Caja.guardarBD` | **Suma** |
| `PENDIENTE` | `CONFIRMADO` / `PENDIENTEMP` | Cajero, al Revisar y Guardar | `useRevisarSolicitud` → `Caja.guardarBD` | **Suma** |
| `PENDIENTE` | `CANCELADO` | Cajero, al Rechazar | `PendientesSolicitudes` | — (nunca sumó) |
| `PENDIENTEMP` | `CONFIRMADO` | Cajero, al cotejar MP | `PendientesMP.aprobarPedido` | — (ya sumó al guardar) |
| `PENDIENTEMP` | `CANCELADO` | Cajero, al rechazar MP | `PendientesMP.rechazarPedido` | **Sale** del cálculo |
| `CONFIRMADO` | `COCINA` | Cocina, "Empezar a Cocinar" | `PedidosEspera.cocinar` | — |
| `COCINA` | `ATP` | Cocina, "Cocinados TODOS", zona ∈ `ENVIOS_LOCALES` | `PedidosCocinando` | — |
| `COCINA` | `DELIVERY` | Cocina, "Cocinados TODOS", resto de zonas | `PedidosCocinando` | — |
| `ATP` | `ENTREGADO` | ATP, al entregar en mostrador | `ATP.jsx` | — |
| `DELIVERY` | `ENTREGADO` | Jefe de deliverys, al registrar el regreso | `JefeDeliverys` | Métricas en `deliverys` |
| *(casi cualquiera)* | `ELIMINADO` | **Encargado**, desde F3 — no un delivery con el repartidor en la calle | `BuscarPedido` | **Sale** del cálculo |

**Ninguna transición escribe el arqueo.** Desde el 26-09-2026 el arqueo se calcula desde los
pedidos de la jornada: la columna de arriba dice si el pedido **entra** al cálculo, no qué se
suma o se resta. Ver [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

> [!important] Qué pedido entra al arqueo
> Dos condiciones, las dos en `entraAlArqueo()`:
>
> 1. **Tiene `cajeroID`** — lo cobró un cajero. Una solicitud web que nadie atendió nunca movió
>    plata, así que no aparece pase lo que pase con su estado.
> 2. **No está en `CANCELADO` ni en `ELIMINADO`** — las dos formas de anular.
>
> De ahí que rechazar una solicitud web no cambie nada (nunca entró) y que los únicos `CANCELADO`
> que mueven el número sean los que vienen de `PENDIENTEMP`: esos sí pasaron por la Caja.

> [!important] Cada pedido cuenta en SU jornada
> El cálculo lee los pedidos por rango de `timestamp`, así que un pedido pertenece a la jornada en
> que se cobró y no a la de hoy: eliminar hoy un pedido de ayer corrige el arqueo de ayer. Si esa
> jornada ya tenía foto, `invalidarFotoDePedido(pedido)` la borra para que se reconstruya.

> [!important] El ruteo de cocina define todo lo que sigue
> `PedidosCocinando` decide entre `ATP` y `DELIVERY` mirando `pedido.envio.zona_envio` contra
> `ENVIOS_LOCALES` con `.includes()` — **no** lo que el cliente eligió en la web. Es la transición
> más consecuente del pipeline. Hasta el 14-09-2026 comparaba contra `[0]` y `[1]` de la constante,
> y una tercera zona local habría roto el ruteo en silencio.

## Transiciones que el sistema permite y no debería

Ninguna capa valida el estado de origen. Las dos que rompían el arqueo se cerraron **por front** el
14-09-2026; las otras siguen abiertas.

| Desde | Hacia | Cómo se llega | Qué rompe | Estado |
|---|---|---|---|---|
| `CANCELADO` | `ELIMINADO` | F3 ofrecía Eliminar para todo lo que no fuera `ELIMINADO` | Descontaba el arqueo por segunda vez | ✅ `BuscarPedido` ya no ofrece Eliminar en `CANCELADO`, y desde el 26-09 el doble descuento es imposible |
| `ELIMINADO` | `COCINA` | Cocina lo tenía seleccionado cuando el cajero lo eliminó | Se cocinaba un pedido ya fuera del arqueo | ✅ `PedidosEspera` poda la selección en cada snapshot |
| `ENTREGADO` | `ELIMINADO` | F3 | Saca del arqueo un pedido ya cobrado y entregado | ✅ **Correcto por diseño** (14-09-2026): es la anulación de una venta y tiene que salir |
| Cualquiera | Cualquiera | Dos pantallas abiertas escribiendo a destiempo | Último en escribir gana, sin aviso | Abierto |

Los dos cierres son de **front**: la consola del navegador todavía puede hacer esas escrituras. Se
aceptó así porque el riesgo real era operativo (un cajero y un cocinero apurados), no malicioso.
Cerrarlo por reglas exigiría validar `estado` de origen en cada `update`.

> [!success] Ya no hace falta saber si el arqueo "fue aplicado"
> Se había evaluado una marca `arqueoAplicado` en el pedido, para que un camino que revirtiera dos
> veces no descontara dos veces, y se descartó por simplicidad (14-09-2026). Con el arqueo
> calculado la pregunta desapareció: el estado del pedido **es** la respuesta, y recalcular mil
> veces da el mismo número.

## Campos que acompañan cada transición

El pedido guarda **quién y cuándo** en cada paso. Sirve para auditar después:

```
cajeroRevisa / cajeroRevisaID      ← quién tiene tomada la solicitud web (se borra al guardar)
cajero / cajeroID / timestamp      ← quién cobró
cajeroApruebaMP*                   ← quién coteó la transferencia
cocinero* / cocinaFinTimestamp     ← quién cocinó y cuándo terminó
atp*                               ← quién entregó en mostrador
delivery* / gestorDelivery*        ← repartidor asignado y quién lo asignó
estadoDelivery                     ← SALIO → VOLVIO, dentro del estado DELIVERY
pagaronCon                         ← con cuánto pagó al final el cliente
cajeroElimina*                     ← quién borró el ticket
```

**`estadoDelivery` es una sub-máquina dentro de `DELIVERY`**: el pedido no cambia de `estado` entre
que sale y que vuelve, solo avanza este campo. Por eso un delivery en curso y uno listo para salir
se ven iguales si solo se mira `estado`.

**Desde el 28-09-2026 hay una combinación nueva: `DELIVERY` + `VOLVIO` + `sinEntregar`.** Es un
viaje que volvió sin entregar: el viaje está cerrado —se paga el envío— pero el pedido no pasa a
`ENTREGADO`, y espera en la lista de la jefa a que el encargado lo anule. Y con `SALIO`, F3 no deja
anular: primero la jefa marca que volvió. Ver
[[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].

## Qué ve el cliente

`FLUJO_PUB_ESTADOS` define los 5 pasos de `/ver-pedido/:sucursal/:id`:

```
PENDIENTE → CONFIRMADO → COCINA → DELIVERY → ENTREGADO
```

`PENDIENTEMP` y `ATP` son **estados internos sin paso propio**, y `getCurrentStepIndex()` los mapea
para que `indexOf` no devuelva `-1` y deje la barra en gris:

- `PENDIENTEMP` → se muestra como `PENDIENTE` (falta verificar la transferencia).
- `ATP` → se muestra como `DELIVERY` ("listo y esperando", mismo avance que uno en camino).

En pedidos de retiro el cuarto paso dice **"LISTO"** en vez de "DELIVERY". `CANCELADO` y `ELIMINADO`
no muestran barra: muestran un cartel rojo.

## Concurrencia: dónde se pisan

Tres puntos donde dos personas pueden chocar, en orden de gravedad:

1. **Tomar una solicitud web.** ✅ Cerrado por la regla `asignacionValida()`: el front sigue
   chequeando contra el snapshot local, pero la segunda escritura la rechaza el servidor. Ver
   [[Reglas de seguridad#`update`: valida la asignación, no el estado]].
2. **Cocina y Caja sobre el mismo pedido.** ✅ Cerrado por front: `PedidosEspera` poda la selección
   contra cada snapshot.
3. **Dos pantallas cualesquiera.** Abierto. Sin validación de estado de origen, la última escritura
   gana.

`useAccionUnica` cubre el doble click de **una** persona. No cubre a dos.

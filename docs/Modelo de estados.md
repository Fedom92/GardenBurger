---
tags: [gardenburger, workflow]
aliases: [Estados, Transiciones, Maquina de estados]
actualizado: 2026-09-14
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

| Desde | Hacia | Quién la dispara | Dónde | Efecto en `resumenDiario` |
|---|---|---|---|---|
| — | `PENDIENTE` | Cliente web | `Crearsolicitud` | — |
| — | `CONFIRMADO` | Cajero (efectivo) | `Caja.guardarBD` | **Suma** |
| — | `PENDIENTEMP` | Cajero (MP o dividido) | `Caja.guardarBD` | **Suma** |
| `PENDIENTE` | `CONFIRMADO` / `PENDIENTEMP` | Cajero, al Revisar y Guardar | `useRevisarSolicitud` → `Caja.guardarBD` | **Suma** |
| `PENDIENTE` | `CANCELADO` | Cajero, al Rechazar | `PendientesSolicitudes` | — (nunca sumó) |
| `PENDIENTEMP` | `CONFIRMADO` | Cajero, al cotejar MP | `PendientesMP.aprobarPedido` | — (ya sumó al guardar) |
| `PENDIENTEMP` | `CANCELADO` | Cajero, al rechazar MP | `PendientesMP.rechazarPedido` | **Descuenta** |
| `CONFIRMADO` | `COCINA` | Cocina, "Empezar a Cocinar" | `PedidosEspera.cocinar` | — |
| `COCINA` | `ATP` | Cocina, "Cocinados TODOS", zona ∈ `ENVIOS_LOCALES` | `PedidosCocinando` | — |
| `COCINA` | `DELIVERY` | Cocina, "Cocinados TODOS", resto de zonas | `PedidosCocinando` | — |
| `ATP` | `ENTREGADO` | ATP, al entregar en mostrador | `ATP.jsx` | — |
| `DELIVERY` | `ENTREGADO` | Jefe de deliverys, al registrar el regreso | `JefeDeliverys` | Métricas en `deliverys` |
| *(casi cualquiera)* | `ELIMINADO` | Cajero, desde F3 | `BuscarPedido` | **Descuenta**, solo si el pedido tiene `cajeroID` |

**El arqueo se mueve en cuatro lugares**, y solo cuatro: guardar en Caja (suma), rechazar MP
(descuenta), eliminar un ticket (descuenta) y cerrar un delivery (métricas). Todos pasan por
`getResumenOperation()`.

> [!important] El descuento va a la jornada DEL PEDIDO
> Los dos caminos que revierten pasan el `timestamp` del pedido a `getResumenOperation`, que
> deriva la jornada de ahí con `getFechaComercialDe()`. Antes usaba siempre la jornada actual:
> eliminar hoy un pedido de ayer habría descontado del día equivocado.

> [!note] El descuento depende de si el pedido llegó a cobrarse, no del estado
> `BuscarPedido.jsx:86` condiciona el descuento a `if (pedido.cajeroID)`, así que borrar una
> solicitud web que nadie cobró no toca el arqueo. Rechazar una solicitud web tampoco: nunca sumó.
> Los únicos `CANCELADO` que descuentan son los que vienen de `PENDIENTEMP`, porque esos ya pasaron
> por la Caja.

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
| `CANCELADO` | `ELIMINADO` | F3 ofrecía Eliminar para todo lo que no fuera `ELIMINADO` | Descontaba el arqueo por segunda vez | ✅ `BuscarPedido` ya no ofrece Eliminar en `CANCELADO` |
| `ELIMINADO` | `COCINA` | Cocina lo tenía seleccionado cuando el cajero lo eliminó | Se cocinaba con el arqueo ya descontado | ✅ `PedidosEspera` poda la selección en cada snapshot |
| `ENTREGADO` | `ELIMINADO` | F3 | Descuenta un pedido ya cobrado y entregado | ✅ **Correcto por diseño** (14-09-2026): es la anulación de una venta y tiene que descontar |
| Cualquiera | Cualquiera | Dos pantallas abiertas escribiendo a destiempo | Último en escribir gana, sin aviso | Abierto |

Los dos cierres son de **front**: la consola del navegador todavía puede hacer esas escrituras. Se
aceptó así porque el riesgo real era operativo (un cajero y un cocinero apurados), no malicioso.
Cerrarlo por reglas exigiría validar `estado` de origen en cada `update`.

> [!note] El arqueo sigue sin saber si ya fue aplicado
> Se evaluó una marca `arqueoAplicado` en el pedido y se descartó por simplicidad. Si aparece un
> camino nuevo que revierta dos veces, sigue siendo la opción.

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
pagoRepartidorCon                  ← con qué se le pagó al repartidor
cajeroElimina*                     ← quién borró el ticket
```

**`estadoDelivery` es una sub-máquina dentro de `DELIVERY`**: el pedido no cambia de `estado` entre
que sale y que vuelve, solo avanza este campo. Por eso un delivery en curso y uno listo para salir
se ven iguales si solo se mira `estado`.

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

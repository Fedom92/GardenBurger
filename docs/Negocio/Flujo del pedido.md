---
tags: [gardenburger, negocio, workflow]
aliases: [Pipeline, Recorrido del pedido]
actualizado: 2026-10-22
---

# Flujo del pedido

↑ [[Reglas de negocio]]

El **recorrido feliz**: quién toca qué y en qué orden. Las transiciones que el sistema permite y
no debería, y qué pedido entra al arqueo, están en *Modelo de estados*. Los valores son `ESTADOS`
de `src/Utils/Constantes.jsx`: **nunca se escriben a mano**.

## Pipeline

```
                  ┌─ web ─────────────┐
                  │  PENDIENTE        │  el cliente confirma en la web
                  └────────┬──────────┘
                           │  el cajero la toma (F1) y la guarda
                           ↓
Caja.guardarBD ──→  CONFIRMADO          (efectivo)
               └─→  PENDIENTEMP         (MP o pago dividido "%")
                           │  F2: el cajero coteja la transferencia
                           ↓
                     CONFIRMADO         sin ítems de cocina (solo bebidas) no para acá:
                           ↓            va directo a ATP / DELIVERY
                   COCINA               Cocina → "Empezar a cocinar"
                           ↓            Cocina → "Cocinados TODOS"
              ┌────────────┴────────────┐
   zona ∈ ENVIOS_LOCALES          resto de las zonas
              ↓                          ↓
            ATP                      DELIVERY   asignar repartidor;
     (mostrador)                         │      estadoDelivery: SALIO → VOLVIO
              └────────────┬─────────────┘
                           ↓
                      ENTREGADO   (ESTADOS.FINAL) ← recién acá suma al arqueo
```

Fuera del flujo feliz: **`CANCELADO`** (se rechaza una solicitud web o una transferencia) y
**`ELIMINADO`** (el encargado anula el ticket desde F3, o el admin desde el Historial). Ninguno
escribe el arqueo: el arqueo se calcula con los pedidos entregados, y un anulado simplemente deja
de estar entre ellos.

> [!important] El ruteo lo decide la zona, no lo que eligió el cliente
> `destinoPedidoListo(envio)` (`Utils/ruteoPedido.js`) manda a `ATP` si `envio.zona_envio` está
> en `ENVIOS_LOCALES` ("Retira", "Espera Afuera"), y a `DELIVERY` si no. La zona la carga el
> cajero. Lo usan la Cocina al terminar y, para los pedidos sin nada que cocinar,
> `estadoAlConfirmar()` al quedar cobrados (en `Caja.guardarBD` y al aprobar en F2). Hasta el
> 14-09-2026 comparaba contra `[0]` y `[1]` de la constante: una tercera zona local habría roto el
> ruteo en silencio.

Un pedido **sin ítems de cocina** (hoy, solo bebidas) va directo a `ATP` o `DELIVERY` al quedar
cobrado, sin pasar por `CONFIRMADO` ni `COCINA`, y se imprime desde el mostrador. Ver
*Cocinero › Qué ve*.

## Quién escribe qué

| Paso | Quién · dónde | Escribe |
|---|---|---|
| Arma el pedido web | *Cliente* · `TuPedido.comprar` | doc nuevo `PENDIENTE` con `cliente{}`, `clienteTimestamp`, `mensajeWsp`, `telefonoSucursal` |
| Toma la solicitud | *Cajero* · `useRevisarSolicitud` | `cajeroRevisaID`, `cajeroRevisa`, `cajeroRevisaTimestamp` |
| Cancela el ticket | Cajero · `Caja.cancelarTicket` | borra `cajeroRevisa*` (solo si es suya) |
| Rechaza la solicitud | Cajero · `PendientesSolicitudes` | `CANCELADO` + `cajeroCancelaSol*`, y copia `clienteTimestamp` en `timestamp` (abajo) |
| Cobra | Cajero · `Caja.guardarBD` | el pedido entero + `codigo` + `combos`/`esLocal` congelados + estado; **borra** `cajeroRevisa*` |
| Aprueba MP | Cajero · `PendientesMP.aprobarPedido` | `CONFIRMADO` (o `ATP`/`DELIVERY`) + `cajeroApruebaMP*` |
| Rechaza MP | Cajero · `PendientesMP.rechazarPedido` | `CANCELADO` + `cajeroCancelaMP*` |
| Manda a cocinar | *Cocinero* · `PedidosEspera` | `COCINA` + `cocinero*` |
| Termina | Cocinero · `PedidosCocinando` | `ATP` / `DELIVERY` + `cocinaFinTimestamp` |
| Entrega en mostrador | *ATP* | `ENTREGADO` + `atpCompletadoPor*`, `atpTimestamp` |
| Asigna, sale, vuelve | *Jefa de deliverys* · `JefeDeliverys` | `delivery*`, `gestorDelivery*`, `estadoDelivery`, `deliverySalidaTimestamp` / `deliveryFinTimestamp`, `pagaronCon`, `ENTREGADO` |
| Volvió sin entregar | Jefa | `estadoDelivery: VOLVIO` + `sinEntregar: true`; el estado sigue `DELIVERY` |
| Entregado sin repartidor | Jefa (**solo ella**) | `ENTREGADO` sin viaje + `entregaSinRepartidor*`; vacía el repartidor |
| Anula el ticket | *Encargado* · `BuscarPedido` / *Admin* · `HistorialPedidos` | `ELIMINADO` + `cajeroElimina*` (el admin guarda también `estadoAnterior`) |

**Todo lo que corrige un pedido ya existente** —entregar, anular, rechazar MP, cerrar un viaje,
restaurar— escribe con `actualizarPedidoYResumen()`: si la noche del pedido ya cerró, borra su
resumen guardado **en la misma escritura**. Ver *Arqueo y estadísticas › El resumen guardado*.

**Una solicitud rechazada copia la hora del cliente en `timestamp`**: es lo que la hace aparecer en
F3 y en el Historial, que buscan por `timestamp`. En una rechazada, `timestamp` es cuándo pidió el
cliente, no un cobro. Se prefirió a una consulta extra.

## Una solicitud web tiene un solo dueño

Si dos cajeros cargaran la misma solicitud, los dos podrían guardarla: **dos pedidos** para el
mismo cliente, dos números de ticket y el arqueo contando las dos ventas. Por eso:

- Tomarla escribe `cajeroRevisaID` + `cajeroRevisa` + `cajeroRevisaTimestamp` (la hora de la toma).
- En las otras Cajas, **Revisar y Rechazar quedan deshabilitados** (`esDeOtroCajero()`) y el badge
  dice de quién es.
- El mismo cajero **sí** puede retomarla (si se le reinició la PC, ve "Asignada a vos").
- "Limpiar" pasa a decir **"Cancelar"** y libera la toma. `liberarSolicitud` no relee el
  documento: intenta escribir y trata `permission-denied` como "ya es de otro".
- Al guardar, `guardarBD` borra `cajeroRevisa*` con `deleteField()` en la misma escritura.

> [!important] La atomicidad la garantizan las reglas, no el front
> El chequeo de la pantalla es contra lo que la Caja tiene en memoria, así que dos cajeros cuyos
> listeners todavía no se enteraron pasan los dos. Hasta el 14-09-2026 los dos escribían. Hoy la
> regla `asignacionValida()` rechaza la segunda escritura del lado del servidor —sin lecturas ni
> transacción— y la Caja avisa "Otro cajero ya tomó esta solicitud". Ver
> *Reglas de Firestore › update: valida la asignación de la solicitud*.

**La toma se libera sola a los 15 minutos** (`MINUTOS_SOLICITUD_TOMADA`, 03-10-2026). Pasado ese
tiempo, las demás Cajas la ven libre y cualquiera puede tomarla o rechazarla; lo hace cumplir
`asignacionVencida()` en las reglas, con la hora de la toma. El que la retoma queda protegido otros
15 minutos, también del cajero original. Una toma sin hora cuenta como vencida.

**Y el cajero original la pierde** (14-10-2026): al tocar Revisar, la Caja arranca un temporizador
de 15 minutos que limpia el ticket solo. Mide duración, no hora: el reloj de la PC no importa. Si
igual llega un guardado que las reglas rechazan, la Caja dice "La solicitud ya no está disponible"
y limpia el ticket. No hay regla de vencimiento para el dueño de la toma: el dueño del sistema
decidió que alcanza con el temporizador.

Se descartaron un timeout de 5 minutos, `runTransaction` y campos extra por over-engineering: la
solución no agrega ninguna lectura ni escritura.

## Lo que sigue en otras notas

- Cómo arma el carrito el cliente y el **contrato con la Caja**: *Web publica › El carrito*.
- Lo que ve el cliente en `/ver-pedido`: *Web publica › El seguimiento (/ver-pedido)*.
- El reparto, viaje por viaje: *Logística de deliverys*.

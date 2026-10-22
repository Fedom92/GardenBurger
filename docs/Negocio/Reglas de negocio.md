---
tags: [gardenburger, negocio, hub]
aliases: [Negocio, El negocio]
actualizado: 2026-10-22
---

# Reglas de negocio

↑ [[GardenBurger]]

Cómo funciona GardenBurger como negocio, en una página. El detalle de cada tema está en las notas
de abajo; esta sirve para entender el conjunto antes de tocar una parte.

## Qué problema resuelve

Coordinar **dentro de una misma noche** el cobro, la cocina, la entrega en el mostrador o por
delivery y el cierre de caja, con **varias personas trabajando a la vez sobre los mismos datos**
desde pantallas distintas, en más de una sucursal. Y después, con lo que quedó registrado, pagar
los sueldos y mirar los números.

El sistema reemplaza al viejo (App Script + Google Sheets), que es el que se usa todavía: el
nuevo **no está en producción** (22-10-2026).

## Las sucursales

Cada local es una **sucursal** (`davinci`, `luro`): su slug va en las URLs públicas y separa todos
los datos operativos. Comparten el catálogo, el personal, los clientes y las zonas de envío.

| | Atiende | Toma pedidos web |
|---|---|---|
| Davinci | de 19 a 00 | hasta 1 h antes del cierre |
| Luro | de 19 a 01 | hasta 1 h antes del cierre |

Los horarios son **datos de cada sucursal** en Firestore (los edita el admin), no código: los de
arriba los informó el dueño el 22-10-2026. Si hace falta cambiarlos para probar algo, pedírselo.
Ver [[Jornada y horarios]].

## Una noche en una sucursal

| Hora | Qué pasa |
|---|---|
| **19:00** | Empieza la **jornada comercial**: todo lo que pase hasta las 02:00 es "hoy" para el sistema. Abre la atención y la web empieza a tomar pedidos |
| Toda la noche | Los pedidos entran por el mostrador, por teléfono o por la web. El cajero cobra; la cocina cocina; el mostrador entrega lo que se retira; la jefa de deliverys asigna repartidores y registra cada viaje |
| **1 h antes del cierre** | La web deja de tomar pedidos: lo que entrara sobre el cierre ya no se llega a cocinar |
| **00:00** | Se habilita el **F4**: el encargado puede mirar el arqueo |
| Al cerrar | El encargado cuenta la caja contra el F4, les paga a los repartidores (sus horas más sus envíos), anula los viajes que volvieron sin entregar y pasa la lista de vueltos a transferir. Carga las horas de todos |
| **02:00** | Termina la jornada. Es margen: no se trabaja pasada la 1 |

Al día siguiente el admin puede mirar las Métricas, las Estadísticas y liquidar sueldos.

## Quién hace qué

Un **sector** por persona que interviene. Cada nota dice qué hace en la noche, en qué pantalla,
qué estados del pedido mueve y qué depende de ella: [[Sectores]].

## El ciclo de una venta

1. **Entra el pedido.** En el mostrador o por teléfono lo carga el cajero. Por la web lo arma el
   cliente y queda como **solicitud**: sin número ni cobro, hasta que un cajero la toma.
2. **Se cobra.** En efectivo queda cobrado en el acto. Por **Mercado Pago o pago dividido** espera
   a que el cajero vea la transferencia en su cuenta: el sistema no se conecta con Mercado Pago.
3. **Se cocina.** Todo menos las bebidas. Un pedido de solo bebidas no pasa por la cocina.
4. **Se entrega.** Lo que se retira (zonas "Retira" y "Espera Afuera") va al mostrador; el resto,
   al delivery. **Recién al entregarse suma a la caja.**
5. **Se cierra la noche.** El arqueo sale de sumar los pedidos entregados.

El recorrido completo: [[Flujo del pedido]]. Como máquina de estados: [[Modelo de estados]]. El
reparto: [[Logística de deliverys]].

## Qué es de cada sucursal y qué es de todas

| De cada sucursal | De todas | Público (sin sesión) |
|---|---|---|
| Pedidos, resúmenes del arqueo, asistencias, contadores de tickets, registro de excepciones de horario | Productos, categorías, zonas de envío, personal, clientes, sucursales | El catálogo publicado, los datos de cada sucursal (dirección, teléfono, horario) y **un** pedido web por su link, durante 48 h |

Los sueldos, el personal y los clientes son internos: solo con sesión. Ver
*Modelo de datos Firestore* y *Reglas de Firestore*.

## De dónde salen los números

- **Arqueo** (la caja de la noche): la suma de los pedidos **entregados** de la jornada, separada
  en efectivo del mostrador, efectivo que vuelve con los repartidores y Mercado Pago. Se calcula;
  no hay un contador que se mueva al cobrar.
- **Métricas y Estadísticas**: el mismo cálculo, guardado una vez por noche cerrada (el **resumen
  guardado**) para no releer los pedidos.
- **Sueldos**: horas × valor hora, día por día, menos descuentos; a los repartidores, más el envío
  de cada viaje.

Ver [[Arqueo y estadísticas]] y [[Asistencias y liquidacion]].

## Lo que el sistema deja en manos de las personas

No son bugs: son lugares donde el diseño confía en alguien, y donde nacen los problemas que
después parecen inexplicables.

| Depende de que… | Si no pasa |
|---|---|
| El cajero coteje en su Mercado Pago que la transferencia entró | Se cocina y entrega un pedido no pagado |
| El admin toque **Publicar Menú** después de cambiar precios o productos | La web sigue mostrando lo viejo (el botón titila para recordarlo; al cobrar, la Caja usa el precio vigente) |
| El encargado cargue las horas **esa noche** | Él ya no puede: solo edita la jornada en curso. La carga el admin desde la Liquidación |
| El encargado anule los viajes que volvieron sin entregar | Quedan abiertos en la lista de la jefa (el F4 los avisa) |
| Alguien recuerde que un pedido anulado ya se había cocinado | Producto perdido, sin registro |
| El admin re-exporte los TSV del sistema viejo | Las Estadísticas Históricas quedan incompletas sin avisar |

## Las notas de esta área

| Nota | Para |
|---|---|
| [[Sectores]] | Quién hace qué, sector por sector |
| [[Jornada y horarios]] | La jornada de 19 a 2, la hora del servidor, el horario web y sus excepciones, el horario especial |
| [[Flujo del pedido]] | El recorrido feliz y quién escribe qué; la toma de solicitudes web |
| [[Modelo de estados]] | Los estados, las transiciones permitidas y las que no deberían existir |
| [[Logística de deliverys]] | Viajes, lo que se cobra en la puerta, vuelto o propina, cuánto cobra el repartidor |
| [[Catálogo]] | Productos, categorías, lo privado, combos, extras y la publicación del menú |
| [[Arqueo y estadísticas]] | El arqueo, el F4, el resumen guardado, Métricas y Estadísticas |
| [[Asistencias y liquidacion]] | Horas trabajadas y sueldos |

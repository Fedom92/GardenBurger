---
tags: [gardenburger, negocio]
aliases: [Negocio]
actualizado: 2026-09-28
---

# Reglas de negocio

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Modelo de datos Firestore]] · vocabulario en [[Glosario]]

## Jornada comercial

**La jornada va de `HORARIO.horaAbre` (19) a `HORARIO.horaCierre` (2), SIEMPRE.** Es lo que
significa "hoy" en todo el sistema —arqueo, fotos, Métricas, buscadores, historial,
asistencias—, y vive en `HORARIO`, en `Utils/Constantes.jsx`, no en el `.env`. Un pedido de las
00:30 pertenece a la noche anterior.

**No es el horario de atención**: es el rango que agrupa los pedidos de una noche, con margen.
Los días y horas en que cada sucursal toma pedidos por la web están en su documento y se editan
desde el ABM (28-09-2026). Ver [[Reglas de negocio#La web pública solo toma pedidos en horario]] y
[[Decisiones tecnicas#El horario vive en código, no en el `.env`]].

`src/Utils/fechaComercial.js`:

| Función | Para qué |
|---|---|
| `getFechaComercial()` | la jornada de **ahora**, `DD-MM-YYYY`: el id de `resumenDiario` y de `asistencias` |
| `getFechaComercialDe(fecha)` | la jornada de **cualquier** fecha: un pedido de las 00:30 da la noche anterior |
| `getRangoDeJornada(jornada)` | `{inicio, fin}` de cualquier jornada, de 19 a 2. Lo usan F3 **y el arqueo** (ver la nota de abajo) |
| `getRangoJornada()` | lo mismo para la jornada en curso |
| `jornadaEstaAbierta(jornada)` | si es la jornada en curso: la abierta no tiene foto de arqueo |
| `esHoraDeArqueo()` | si ya es de `HORA_HABILITA_STATS` (00:00) a `horaCierre`: la ventana del F4 |
| `getJornadaDeFecha(date)` | versión pura para datos históricos (Estadísticas) |
| `ahoraServidor()` | `moment()` corregido por el offset del servidor |
| `sincronizarHoraServidor()` | llama a la Cloud Function `horaServidor` y calcula el offset |
| `HORA_CIERRE` | `HORARIO.horaCierre` |
| `horaEnJornada(hora)` | horas desde el inicio de la jornada (19 → 0, 00 → 5): compara horas de una noche que cruza la medianoche |
| `webRecibePedidos(sucursal)` | si esa sucursal toma pedidos por la web ahora: su día de atención y su horario |
| `horaCorteWeb(horario)` / `textoHorarioWeb(sucursal)` | la hora de corte de la web (`horasCorte` antes del cierre) y el texto del cartel |

> [!warning] El hueco de 18 horas es intencional
> Los buscadores de Caja (`BuscarPedido`) solo ven pedidos dentro de la jornada. Entre las 02:00
> y las 19:00 no hay jornada activa. **Eso no es un bug.** Si un pedido "no aparece", la primera
> pregunta es a qué hora se creó.
>
> **Ojo: desde el 26-09-2026 el arqueo usa el mismo rango**, así que un pedido cobrado antes de
> las 19 tampoco entra en la caja, aunque se cocine y se entregue normal. Para F3 el hueco es
> intencional; para la plata, nadie lo decidió. Ver
> [[Auditoria 2026-09-26#B · P2 · El arqueo heredó el hueco de los buscadores]].

> [!danger] Relojes desconfigurados en el local
> Hay PCs con la hora mal. Cualquier fecha armada a mano tiene que salir de `ahoraServidor()`,
> nunca de `new Date()`. `sincronizarHoraServidor()` se llama una sola vez, en `LayoutStaff`.

> [!note] El cierre a las 2 es margen, no horario real
> El rango laboral termina como mucho a la 01:00; las 02:00 se pusieron por las dudas. Por eso el
> "borde" de un repartidor que vuelve pasada la medianoche **no es alcanzable**.

## Envíos locales vs delivery

```js
ENVIOS_LOCALES = ["Retira", "Espera Afuera"]
```

Esta constante decide tres cosas distintas:

1. **Ruteo de cocina** — al salir de `COCINA`, si la zona está en la lista va a `ATP`; si no, a
   `DELIVERY`.
2. **Desglose del arqueo** — `efectivoLocal` (se cobra en el mostrador) vs `efectivoEnvio` (la
   plata vuelve con el repartidor). Son dos cajas distintas.
3. **UI de Caja** — con zona local se ocultan y limpian dirección y entre calles.

## Quién mira el arqueo, y cuándo

El **F4 de la Caja es del encargado y de la madrugada**: el botón solo se le muestra a quien
tenga rol `encargado`, y solo queda habilitado desde **`HORA_HABILITA_STATS` (00:00) hasta
`horaCierre`**, a la misma hora en todas las sucursales. Antes el turno sigue vendiendo y el
número no significa nada; pasada `horaCierre` la jornada ya es otra y F4 mostraría una noche vacía.

La hora es una constante y no el cierre de cada sucursal por decisión del dueño (28-09-2026):
atarla al horario de la sucursal obligaba a la Caja a leerlo. Las **Métricas** de la jefa de
deliverys **no tienen ventana**: salen de un listener y abrirlas no cuesta nada. Ver
[[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].

No es solo una regla de negocio: ver el arqueo cuesta **leer los pedidos de la jornada** (~60-100
lecturas), así que la ventana evita pagar ese barrido cada vez que alguien tiene curiosidad a las
21. La condición es `esHoraDeArqueo()` en `Utils/fechaComercial.js`.

Usa el hook `Utils/useHoraDeArqueo.js`. El guard está en `verResumen`, no solo en el
botón: el atajo F4 llama a la función directo, y ahí la
hora se **relee** en el momento. El `useState` de la Caja existe solo para el `disabled` del botón.

> [!note] Por qué el botón se sincroniza con un intervalo de 60 s y no con un timeout
> El turno cruza la medianoche con la Caja abierta desde las 19, así que el estado del botón tiene
> que cambiar solo. Un timeout al instante exacto parecía más barato, pero **`ahoraServidor()` puede
> estar sin sincronizar cuando la Caja monta** —el offset lo trae `LayoutStaff` y los efectos de los
> hijos corren primero—, y un timeout calculado con el reloj torcido dispara a la hora equivocada.
> Releyendo cada minuto se corrige solo.
>
> El tick no cuesta nada: `esHoraDeArqueo()` es `Date.now() + offset` y una comparación, **sin red y
> sin invocar la Cloud Function**. Y como se llama `setState` con el mismo booleano, React descarta
> el render. Medido sobre un turno de 20 h: **1200 ticks, 2 repintados** (00:00 y `horaCierre`).

> [!note] Consecuencia asumida
> Un turno que no cerró los números y los quiere controlar al día siguiente **no puede con F4**:
> a las 19 del día siguiente F4 está deshabilitado, y de todos modos mostraría la jornada nueva.
> Eso va en la pantalla de gestión por fecha, pendiente. Ver
> [[Deuda tecnica#Funcionalidad pendiente]].

## Métodos de pago

Son las `key` de `METODOS_PAGO` en `Constantes.jsx`; para mostrarlos, `etiquetaPago()`.

| Valor | Significado |
|---|---|
| `EFECTIVO` | efectivo puro. Se exige `pagaCon >= total` para calcular el vuelto. **Es el único método donde la Caja pide `pagaCon`** |
| `MP` | Mercado Pago. Aplica **recargo** `REACT_APP_recargoMP` (%) |
| `%` | pago dividido: una parte en efectivo (`montoEfectivo`), el resto por MP con recargo. `pagaCon` se guarda **igual a `montoEfectivo`**, sin input: el cliente paga justo esa parte |

Los pedidos `MP` y `%` nacen en **`PENDIENTEMP`**: el cajero tiene que cotejar en su Mercado
Pago que la transferencia entró, y recién ahí los pasa a `CONFIRMADO` desde F2.

El recargo se calcula en `useCarrito.getResumen`, siempre sobre `subtotal + costo_envio`:
- `MP` → `base * recargo/100`
- `%` → `(base - montoEfectivo) * recargo/100`

## La web pública solo toma pedidos en horario

**Cada sucursal tiene su horario** en su documento (`sucursales/{id}.horario`), editable desde el
ABM de Sucursales sin deploy (28-09-2026). Hasta entonces era uno solo para todas, y Davinci —que
cierra a las 00— recibía pedidos web hasta la 01.

| Campo | Qué es | Davinci | Luro |
|---|---|---|---|
| `dias` | días de atención (0 = domingo) | miércoles a domingo | miércoles a domingo |
| `abre` / `cierra` | horas enteras | 20 / 00 | 20 / 01 |
| `horasCorte` | cuántas horas antes del cierre la web deja de tomar pedidos | 1 → hasta las 23 | 1 → hasta las 00 |

Lo decide `webRecibePedidos(sucursal)`:

- **Los días van por jornada**, no por calendario: el lunes a las 00:30 todavía es la noche del
  domingo.
- **El corte es `horasCorte` antes del cierre**: una solicitud que entrara sobre el cierre ya no
  se llega a cocinar. El F4 no depende de esto: ver [[Reglas de negocio#Quién mira el arqueo, y cuándo]].
- **El horario tiene que caer dentro de la jornada comercial** (19 a 02): el ABM solo ofrece esas
  horas y valida que el corte quede entre la apertura y el cierre.
- **Sin horario cargado, la sucursal no toma pedidos**: mejor cerrada que abierta a cualquier hora.
- **Una sucursal desactivada no toma pedidos, ni por el link directo** (`/crear-solicitud/luro`):
  no está en `menu.json`, y el respaldo que lee su documento la trata como inexistente. Al
  confirmar se vuelve a controlar.
- **Viaja en `menu.json`**, así que la web lo mira sin leer Firestore. Por eso un cambio de horario
  llega a la web **al publicar el menú**: guardar una sucursal hace parpadear "Publicar Menú".
- **Se mira al entrar y otra vez al confirmar la compra**; la segunda, con el documento de la
  sucursal que la web ya lee para validarla (0 lecturas extra): si el admin cambió el horario y
  todavía no publicó, manda el documento.
- **El selector lista todas las sucursales**: la cerrada aparece deshabilitada, con su horario. La
  pantalla de cerrado de una sucursal ofrece volver al selector, porque capaz otra sigue abierta.
  Las sucursales salen de `menu.json`; solo si falla, de Firestore.
- `/ver-pedido` **sigue abierto**. `/menu` también entra por URL, pero **sin ningún link**: todavía
  no está terminado. La Caja no mira el horario: trabaja cualquier día.
- **El WhatsApp va al teléfono de la sucursal** (`sucursales/{id}.telefono`). Al confirmar, la web
  ya lee ese documento para validar la sucursal, así que el teléfono sale sin lecturas extra, y
  queda guardado en la solicitud (`telefonoSucursal`) para el botón de `/ver-pedido`. Si la
  sucursal no tiene teléfono cargado, el pedido se registra igual y no se abre WhatsApp.
- **El pie de la web** muestra la dirección, el teléfono y el horario de la sucursal elegida, de
  `menu.json`. En el selector todavía no hay sucursal: cada botón muestra su horario.
- **Solo en el front, por decisión.** Alguien que arme el pedido a mano podría crear una
  solicitud fuera de horario: aparecería pendiente y el cajero la rechaza. Cerrarlo en las reglas
  obligaría a repetir días y horas ahí, en UTC: dos fuentes para lo mismo.
- Usa el reloj del celular del cliente, en hora argentina aunque el teléfono tenga otra zona.

**El link de `/ver-pedido` vence a las 48 horas** de hecho el pedido. No se borra nada: la regla
deja de mostrárselo al público y el staff lo sigue viendo. El cliente ve "Este pedido ya no está
disponible". Es una línea en `firestore.rules`, sin lecturas.

## Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor

El módulo de deliverys es del **Jefe de Deliverys** (`REACT_APP_jefeDeliverys`) y del
**encargado**. Los repartidores (`REACT_APP_delivery`) no tienen módulo: existen en `usuarios`
para la asistencia y para que el jefe les asigne pedidos.

### Qué ve el jefe de cada pedido

Lo que el repartidor tiene que **cobrar**, no el total. Sale de `repartirPago(p).efectivo`, la
misma función que arma el arqueo, así que la calle y la caja no pueden discrepar:

| Método | A cobrar | `pagaCon` y diferencia |
|---|---|---|
| `EFECTIVO` | el total | "Paga con $12.500 · Vuelto: $2.500 (lo trae el repartidor)", o "Propina" |
| `%` (dividido) | **solo `montoEfectivo`** | "Paga con" igual a `montoEfectivo`: no hay diferencia |
| `MP` | nada — "No se cobra" | no se muestran ni el total ni `pagaCon` |

### La moto no lleva cambio: vuelto o propina

Si el cliente de un delivery paga en efectivo con más de lo que sale, el repartidor **no da
cambio**. El cajero se lo avisa al tomar el pedido y marca en la Caja qué pasa con la diferencia
(`DESTINO_VUELTO`, 28-09-2026). Es **obligatorio**: `validarPedido` no deja guardar sin elegir.

- **Vuelto**: el repartidor trae la plata, y los admins le transfieren el vuelto al cliente al
  cierre. El cajero puede anotar el **alias** (opcional; el cliente se lo pasa por WhatsApp).
- **Propina**: se la queda el repartidor.

En Retira y Espera Afuera no se pregunta: el cambio se da en mano. La jefa ve "Vuelto" o
"Propina" en su tabla y en el pedido, pero no el alias: la transferencia no es suya. Los vueltos
**no** entran en lo que cobra el repartidor. El encargado ve la lista de **vueltos a transferir**
en el F4 —ticket, cliente, monto y alias, con un botón **Copiar** para pasársela al admin—. El
monto es el real si el repartidor ya volvió (`pagaronCon` menos lo que había que cobrar), y si no
el que anunció el cliente, marcado como estimado.

### `pagaCon` y `pagaronCon`

- **`pagaCon`** lo carga el cajero: con cuánto **dijo** el cliente que iba a pagar. En el pago
  dividido no hay input: se guarda la parte en efectivo que ya se fijó en el modal del dividido.
- **`pagaronCon`** lo carga el jefe cuando vuelve el repartidor: con cuánto pagó **al final**.
  Va **a mano y sin precargar**: con `pagaCon` ya escrito, confirmar sin mirar sería un error
  humano que no se ve. Es obligatorio pero **libre**: por ahora no se compara con nada. En MP no
  se pide.

Hasta sep-2026 `pagaronCon` se llamaba `pagoRepartidorCon`. Se renombró cuando el sistema
todavía no tenía datos productivos, para que forme par con `pagaCon`.

### Un viaje en la calle no se anula

Si el cliente cancela o no se encuentra la dirección, **el viaje se hizo y se paga**. Para que
quede registrado, el encargado **no puede anular** desde F3 un pedido cuyo repartidor salió y no
volvió (`estadoDelivery == SALIO`): primero la jefa marca que volvió. F3 relee el pedido antes de
anular (1 lectura), porque trabaja con la jornada que leyó al abrirse. Si el pedido todavía no
salió, se anula como cualquier otro: no hubo viaje.

Cuando vuelve sin entregar, la jefa usa **"Volvió sin entregar"**: cierra el viaje
(`estadoDelivery: VOLVIO`, `sinEntregar: true`) sin pedir `pagaronCon`. El pedido **sigue en
`DELIVERY`** —en su lista, marcado en rojo, y el cliente no ve "Entregado"— hasta que el encargado
lo anula desde F3, donde aparece como "Volvió sin entregar: falta anularlo". Mientras tanto suma al
arqueo como cobrado, y el F4 lo avisa.

### Cuánto se le paga a cada repartidor

**Sueldo de la noche = base de Asistencias + envíos. No hay fijo** (28-09-2026; hasta entonces era
`REACT_APP_fijoDeliverys` más los envíos).

- **La base** es la de cualquier empleado: `horas × valorHora − descuentos`, de la asistencia que
  carga el encargado. Llegar tarde o devolver un préstamo son descuentos.
- **Los envíos** son el `envio.costo_envio` de cada viaje **cerrado** (`VOLVIO`), entregado o no:
  el viaje se hizo. Se paga aunque el pedido haya sido por MP. El costo queda congelado en el
  pedido al cobrarlo.
- Un viaje sin entregar o un pedido anulado **no suma efectivo a rendir**: no hubo cobro.

Lo calcula `liquidarDeliverys()` en `useResumenDiario.js`, y lo usan tres pantallas con los mismos
números:

| Dónde | Quién | Qué muestra |
|---|---|---|
| **F4** de la Caja | encargado, al cierre | por repartidor: viajes, envíos, **base** (de la asistencia de la noche, 1 lectura) y **a pagar**. Es con lo que se le paga cada noche |
| **Métricas** del módulo de deliverys | jefa, toda la noche | viajes, envíos y efectivo a rendir por repartidor, con el detalle de cada viaje. Es el control del sector: no paga nada |
| **Liquidación de Asistencias** | admin, por período | a los repartidores les suma sus envíos, de las fotos de cada noche. Registra el trabajo hecho, no a quién se le pagó |

Las **Métricas** van **en vivo**: salen de un listener sobre los viajes cerrados de la noche, así
que abrirlas no cuesta nada y no tienen ventana horaria. Ver
[[Decisiones tecnicas#Las Métricas de la jefa van por listener]].

## Qué producto se ve dónde

| Producto | Pantalla de Productos (admin) | Caja | Web pública |
|---|---|---|---|
| `visible: true` | sí | sí | sí |
| `visible: false` | sí | **no** | **no** |
| Categoría de `CATEGORIAS_SOLO_CAJA` (`COMBO GARDEN`, `GARDEN SIN PAPAS`) | sí | sí | **no** |

- **`visible: false` es "pausado"**: no se vende en ningún lado. Sirve para un producto sin stock o
  de temporada. Los pedidos viejos no cambian: cada uno guarda su copia del producto.
- **Los productos para empleados** van en las categorías de `CATEGORIAS_SOLO_CAJA`: se cobran en
  la Caja y la web no los muestra, ni en `menu.json` ni en sus respaldos contra Firestore. Como no
  son categorías de combo, **no cuentan como combos**. Hardcodeadas por decisión (26-09-2026).
- **El precio va entero** (`soloEnteros` + `step={1}`) y **la descripción se guarda sin espacios
  al principio ni al final**: "Hamburguesa " y "Hamburguesa" serían dos productos distintos, y la
  exclusión de combos (`excludes`) compara el nombre exacto.
## Combos

`CATEGORIAS_COMBOS` en `Constantes.jsx`. Cada categoría puede llevar un array **opcional**
`excludes` con los productos que comparten categoría pero **no** se venden como combo:

```js
{ key: "CAJA PAPAS", label: "Papas", excludes: ["(porcion individual)"] }
```

- La descripción del exclude va **textual**, tal cual el catálogo: la comparación es exacta, sin
  normalizar acentos ni mayúsculas.
- `contarCombos` (en `useResumenDiario.js`) cuenta **unidades, no renglones**: un ítem con
  `cantidad: 3` son 3 combos.
- `esComboConta` (en `Estadisticas.jsx`) aplica la misma regla sobre los TSV históricos, con la
  diferencia de que ahí la **categoría** sí pasa por `norm()` porque los exports vienen sucios.

> [!caution] Riesgo de divergencia
> Si la descripción del producto difiere entre el catálogo de Firestore y el TSV exportado
> (mayúsculas, acentos), la exclusión aplica de un lado y del otro no, y los dos conteos se
> separan sin avisar.

## Horario especial

Pedidos encargados para más tarde. `Caja` graba **la hora pedida directamente en `timestamp`**
(base `ahoraServidor()`) y marca `esHorarioEspecial: true`. O sea: **en un pedido con horario
especial, `timestamp` no es cuándo se cargó sino cuándo tiene que estar listo.**

Selector limitado a horas 20–23 y minutos 00/15/30/45. El horario especial no permite pedidos
después de las 00.

> [!note] Arranca a las 20 aunque el local abra a las 19, por decisión
> Nadie encarga para las 19:xx. Se evaluó generar las horas desde `HORARIO.horaAbre` y el dueño
> prefirió dejarlo (14-09-2026). Las opciones están hardcodeadas en `Caja.jsx`; si algún día
> cambia, ese es el lugar.

En `PedidosEspera`:
- La hora va en **rojo y negrita** cuando `esHorarioEspecial`.
- `TIEMPO_MIN_PEDIDOESP = 30` — si faltan más de 30 minutos, mandar a cocinar abre
  `ModalHorariosEspeciales` con la lista de adelantados. Arrancan **destildados**; los que
  queden sin marcar no se tocan y siguen en espera.
- El cálculo de "faltan N min" usa `ahoraServidor()`, no el reloj de la PC.

## Cocina: qué ve el cocinero

`getItemsCocina(carrito)` filtra `categoria !== "BEBIDAS"`: la cocina hace comida, las bebidas
las despacha la caja. Se aplica en las cards de `PedidosEspera`, `PedidosCocinando` y en
`VerPedidoModal`.

**No se aplica en `TicketImpresion`**: ese ticket lleva total, envío y método de pago — es el
que se le entrega al cliente y tiene que listar todo, si no los ítems no cierran con el importe.

`CANTIDAD_CARNES` mapea categorías a cantidad de medallones para el contador de "Carnes
Seleccionadas" (los `EXTRA` se cuentan por descripción, ej. "CARNE EXTRA").

**"Cocinados TODOS" es la única forma de marcar cocinado, a propósito.** Cada cocinero ve solo los
pedidos que él mandó a cocina (`where cocineroID`), y en la práctica salen juntos. Se evaluó un
botón por tarjeta y el dueño lo descartó (14-09-2026).

## Numeración de tickets

`codigo = "{secuencial}-{iniciales del cajero}"`. El secuencial sale de
`sucursales/{id}/contadores/pedidos`. **La numeración es por sucursal.**

Hay dos formas de pedirlo, y la diferencia importa:

- **`avanzarContador(transaction, coleccion, sucursal)`** — avanza el contador **dentro de una
  transacción que abre quien llama**. Es lo que hace `Caja.guardarBD`: el número y el pedido van
  juntos o no va ninguno, así que **un commit fallido ya no quema el número**.
- **`getNextSequence(coleccion, sucursal)`** — abre su propia transacción, para quien solo necesita
  el número y no tiene una propia. Hoy **no lo usa nadie**: queda para quien numere fuera del flujo de la Caja, como la gestión de
pedidos de otras jornadas que está pendiente.

El parámetro `sucursal` es un override opcional: sin él usa la del usuario logueado, que es lo que
hace la Caja. Lo pasa solo el admin, que opera sobre una sucursal ajena.

## Clientes

**La ficha se actualiza en cada cobro.** `registrarCliente` (en `useCliente`) busca por teléfono:
si no existe lo crea; si existe, **pisa nombre, dirección y entre calles** con lo que el cajero
acaba de cargar — la última dirección usada es la más probable como actual (decisión del
14-09-2026; antes solo se creaba y un cliente que se mudó quedaba con la dirección vieja).

En la misma escritura van los campos CRM: `ultimoPedido` (fecha del cobro, no la del pedido: un
horario especial tiene fecha futura), `cantidadPedidos` (contador; los clientes anteriores a
sep-2026 arrancan en 1 con su próximo pedido) y `creado` (solo al crear). Costo: 1 lectura + 1
escritura por pedido.

La pantalla `/clientes` **no lista nada al entrar**: es un buscador. Un término de solo dígitos se
busca como teléfono exacto; cualquier otra cosa, como prefijo de nombre —y ahí Firestore compara
byte a byte, o sea que **distingue mayúsculas y acentos**: hay que escribirlo como se cargó—. La
sucursal sola lista esa sucursal. Todo con tope.

## Reglas que solo vivían en el código

Salieron de la [[Auditoria 2026-09|auditoría de septiembre 2026]]. Ninguna es un bug: son
decisiones que estaban implementadas y sin escribir, y sorprenden a quien lee el código de corrido.

1. **Un extra de hamburguesa solo se agrega inmediatamente después de una hamburguesa**
   (`useCarrito.js:38`). Si el cajero mete una bebida en el medio, el extra se rechaza.
2. **El carrito solo acumula cantidad sobre el último ítem** (`useCarrito.js:60`). El mismo producto
   con algo en el medio abre un renglón nuevo — es el mismo motivo por el que el rediseño de Caja
   descartó el control `− +` por línea.
3. **El teléfono se valida por longitud, no por contenido** (`validarPedido.js:5`): pide 10
   caracteres, sin verificar que sean dígitos.
4. **La Caja no muestra el vuelto.** En efectivo se pide `pagaCon >= total`, y en un delivery que
   paga con más hay que elegir "Vuelto" o "Propina" (la moto no lleva cambio), pero el monto no se
   informa: lo ve la jefa de deliverys, y los vueltos a transferir, el encargado en el F4.
5. **Un pedido `ELIMINADO` o `CANCELADO` sigue apareciendo en los buscadores**, a propósito: el
   cajero tiene que poder auditarlo.

## Validación del pedido web: forma, no contenido

`esCreacionPublicaValida()` en `firestore.rules` valida la **forma** del documento —origen, estado,
campos obligatorios, ausencia de IDs de staff, carrito de 1 a 50 ítems, total entre 0 y 1.000.000—
pero **no** valida el contenido: ni que los precios coincidan con el catálogo, ni que `total` sea la
suma del carrito, ni la forma de cada ítem.

Está bien que sea así —validar precios en las reglas exigiría un `get()` facturado por ítem—. **El
precio definitivo lo pone la Caja al Revisar**: `useRevisarSolicitud` reemplaza el precio de cada
ítem por el del catálogo en vivo (`productos`, ya en memoria), en silencio. El cliente pudo haber
visto otro en un `menu.json` viejo; el total que vale es el del ticket. Un producto que ya no está
en el catálogo (`visible: false`) conserva el precio del cliente.

## Pago dividido: la validación corre dos veces

`errorPagoDividido(montoEfectivo, totalBase)` exige `0 < montoEfectivo < totalBase`. Corre al
confirmar el modal **y otra vez en `validarPedido` al guardar**, porque el cajero puede seguir
editando el carrito después de fijar el efectivo: si el total baja de ese monto, el recargo sale
negativo y el pedido se guardaría subcobrado con el arqueo corrido.

## Horas trabajadas y sueldos

Módulo aparte, con su propia nota: [[Asistencias y liquidacion]]. Las tres reglas que no se pueden
deducir del código de un vistazo:

1. **El turno cruza la medianoche**: `calcularHoras` suma 24 h cuando la salida es *anterior* a la
   entrada, así 19:00 → 02:00 son 7 horas. La comparación es estricta: entrada igual a salida son
   **0 horas**, no 24.
   **Sin horas no se liquida ni cuenta como día trabajado**: un presente al que nunca se le cargó
   la salida queda fuera de la liquidación, en vez de sumar un día con 0 horas.
2. **`valorHora` se congela** dentro de cada registro al cargar la jornada. Subirle el sueldo a
   alguien no reescribe sus liquidaciones pasadas.
3. **El bruto se acumula día por día**, no como `horasTotales × unValorHora`.
4. **A los repartidores se les suman sus envíos** (28-09-2026): el total de la liquidación es
   `neto + envíos`. Los envíos salen de las fotos de cada noche. Ver
   [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].

---
tags: [gardenburger, negocio]
aliases: [Negocio]
actualizado: 2026-09-26
---

# Reglas de negocio

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Modelo de datos Firestore]] · vocabulario en [[Glosario]]

## Jornada comercial

**La jornada va de `HORARIO.horaAbre` (19) a `HORARIO.horaCierre` (2), SIEMPRE.** Las dos
horas viven en `HORARIO`, en `Utils/Constantes.jsx`, junto con los días de apertura: no en el
`.env`. Ver [[Decisiones tecnicas#El horario vive en código, no en el `.env`]].
Un pedido de las 00:30 pertenece a la noche anterior.

`src/Utils/fechaComercial.js`:

| Función | Para qué |
|---|---|
| `getFechaComercial()` | la jornada de **ahora**, `DD-MM-YYYY`: el id de `resumenDiario` y de `asistencias` |
| `getFechaComercialDe(fecha)` | la jornada de **cualquier** fecha: un pedido de las 00:30 da la noche anterior |
| `getRangoDeJornada(jornada)` | `{inicio, fin}` de cualquier jornada, de 19 a 2. Lo usan F3 **y el arqueo** (ver la nota de abajo) |
| `getRangoJornada()` | lo mismo para la jornada en curso |
| `jornadaEstaAbierta(jornada)` | si es la jornada en curso: la abierta no tiene foto de arqueo |
| `esHoraDeArqueo()` | si ya es de 00:00 a `horaCierre`, la ventana del F4 y de la liquidación |
| `getJornadaDeFecha(date)` | versión pura para datos históricos (Estadísticas) |
| `ahoraServidor()` | `moment()` corregido por el offset del servidor |
| `sincronizarHoraServidor()` | llama a la Cloud Function `horaServidor` y calcula el offset |
| `HORA_CIERRE` | `HORARIO.horaCierre` |
| `webRecibePedidos()` | si la web pública puede tomar un pedido ahora: día de la jornada y hora |
| `HORA_CIERRE_WEB` / `textoHorarioWeb()` | el corte de la web (`horaCierre - 1`) y el texto del cartel de cerrado |

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

El **F4 de la Caja es del encargado y de la madrugada** —y la liquidación del módulo de
deliverys, en la misma ventana—: el botón solo se le muestra a quien
tenga rol `encargado`, y solo queda habilitado entre las **00:00 y `horaCierre`**. Antes de la
medianoche el turno sigue vendiendo y el número no significa nada; pasada `horaCierre` la jornada
ya es otra y F4 mostraría una noche vacía.

No es solo una regla de negocio: ver el arqueo cuesta **leer los pedidos de la jornada** (~60-100
lecturas), así que la ventana evita pagar ese barrido cada vez que alguien tiene curiosidad a las
21. La condición es `esHoraDeArqueo()` en `Utils/fechaComercial.js`, y es la **misma** que usa
`getFechaComercialDe` para decidir que "ahora" todavía pertenece a la noche anterior.

Los dos usan el hook `Utils/useHoraDeArqueo.js`. El guard está en `verResumen`, no solo en el
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

Elegir sucursal y armar el pedido (`/crear-solicitud`) funciona solo **los días de
`HORARIO.diasApertura` —miércoles a domingo—, desde `horaAbre` hasta una hora antes de
`horaCierre`**: de 19 a 1. Fuera de eso se ve "Ahora estamos cerrados", con el horario. Lo decide
`webRecibePedidos()`.

- **Los días van por jornada**, no por calendario: el lunes a las 00:30 todavía es la noche del
  domingo y está abierta; el miércoles a las 00:30 es la noche del martes y está cerrada.
- **El corte es una hora antes del cierre** (`HORA_CIERRE_WEB`): esa última hora no se trabaja,
  y una solicitud que entrara sobre el cierre se confirmaría pasado `horaCierre`, en el hueco de
  las 02 a las 19, fuera de todo arqueo.
- **Se mira al entrar y otra vez al confirmar la compra**, por si el cliente dejó la página
  abierta pasado el corte.
- **Cerrada no lee nada de Firestore**: ni sucursales ni menú.
- `/ver-pedido` **sigue abierto**. `/menu` también entra por URL, pero **sin ningún link**: todavía
  no está terminado. La Caja no mira los días: trabaja cualquier día.
- **El WhatsApp va al teléfono de la sucursal** (`sucursales/{id}.telefono`). Al confirmar, la web
  ya lee ese documento para validar la sucursal, así que el teléfono sale sin lecturas extra, y
  queda guardado en la solicitud (`telefonoSucursal`) para el botón de `/ver-pedido`. Si la
  sucursal no tiene teléfono cargado, el pedido se registra igual y no se abre WhatsApp.
- **El pie de la web** muestra la dirección y el teléfono de la sucursal elegida —salen de
  `menu.json`, sin lecturas— y el horario desde `HORARIO`. También en la pantalla de cerrado,
  si el link trae la sucursal (`/crear-solicitud/davinci`): es cuando el cliente más necesita el
  teléfono. En el selector todavía no hay sucursal elegida, así que muestra solo el horario. Los datos nuevos de una
  sucursal llegan al pie **después de republicar el menú**.
- **Solo en el front, por decisión.** Alguien que arme el pedido a mano podría crear una
  solicitud fuera de horario: aparecería pendiente la noche siguiente y el cajero la rechaza.
  Cerrarlo en las reglas obligaría a repetir días y horas ahí, en UTC: dos fuentes para lo mismo.
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

| Método | A cobrar | `pagaCon` y vuelto |
|---|---|---|
| `EFECTIVO` | el total | se muestran: "Paga con $10.000 · Vuelto a llevar $2.500" |
| `%` (dividido) | **solo `montoEfectivo`** | "Paga con" igual a `montoEfectivo`: no hay vuelto |
| `MP` | nada — "No se cobra" | no se muestran ni el total ni `pagaCon` |

### `pagaCon` y `pagaronCon`

- **`pagaCon`** lo carga el cajero: con cuánto **dijo** el cliente que iba a pagar. En el pago
  dividido no hay input: se guarda la parte en efectivo que ya se fijó en el modal del dividido.
- **`pagaronCon`** lo carga el jefe cuando vuelve el repartidor: con cuánto pagó **al final**.
  Va **a mano y sin precargar**: con `pagaCon` ya escrito, confirmar sin mirar sería un error
  humano que no se ve. Es obligatorio pero **libre**: por ahora no se compara con nada. En MP no
  se pide.

Hasta sep-2026 `pagaronCon` se llamaba `pagoRepartidorCon`. Se renombró cuando el sistema
todavía no tenía datos productivos, para que forme par con `pagaCon`.

### Cuánto se le paga a cada repartidor

**Un fijo por noche (`REACT_APP_fijoDeliverys`) más el costo de envío de cada entrega que
hizo.** El envío se paga aunque el pedido haya sido por MP: el viaje es el mismo. Es aparte de la
asistencia que cargan los encargados.

Lo calcula `liquidarDeliverys()` en `useResumenDiario.js`, con estas reglas:

- Cuentan solo las entregas **cerradas** (`estadoDelivery == VOLVIO`). La que sigue en la calle no
  se paga todavía, y el modal lo avisa arriba.
- El fijo va **una vez por repartidor y por noche**, no por entrega.
- Un repartidor sin entregas **no cobra el fijo**. Es regla del negocio, y en la práctica no pasa:
  todo repartidor que viene hace entregas.
- Una entrega que se anuló después **se paga igual**, porque el viaje se hizo. **Pendiente de
  confirmar** con el negocio: [[Deuda tecnica#Funcionalidad pendiente]].

Cada entrega guarda **el fijo de esa noche** (`fijoDelivery`) al cerrarse, y la liquidación usa
ese: si mañana cambia la constante, las noches viejas siguen diciendo cuánto se pagó, sin
importar cuándo se saque la foto del arqueo. El detalle con las direcciones no va en la foto,
porque ya está en los pedidos.

### La liquidación

El botón "Liquidación" del módulo se habilita **de 00:00 a `horaCierre`**, igual que el F4 de la
Caja y por la misma razón: cuesta un barrido de la jornada. Muestra arriba el total de la noche
—entregas, envíos, fijos, total a pagar y efectivo a rendir— y un acordeón con cada repartidor;
al desplegarlo, el detalle de sus entregas con dirección, zona, envío, método y `pagaronCon`.

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
4. **El vuelto se exige pero no se muestra.** En efectivo se pide `pagaCon >= total` para poder
   calcularlo, y después la pantalla no lo informa.
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

---
tags: [gardenburger, negocio]
---

# Reglas de negocio

← [[GardenBurger]] · relacionado: [[Flujo del pedido]], [[Modelo de datos Firestore]]

## Jornada comercial

**La jornada va de `REACT_APP_horaAbre` (19) a `REACT_APP_horaCierre` (2), SIEMPRE.**
Un pedido de las 00:30 pertenece a la noche anterior.

`src/Utils/fechaComercial.js`:

| Función | Para qué |
|---|---|
| `getFechaComercial()` | ID del doc de `resumenDiario`, formato `DD-MM-YYYY` |
| `getRangoJornada()` | `{inicio, fin}` en Date — lo usan los buscadores de la Caja |
| `getJornadaDeFecha(date)` | versión pura para datos históricos (Estadísticas) |
| `ahoraServidor()` | `moment()` corregido por el offset del servidor |
| `sincronizarHoraServidor()` | llama a la Cloud Function `horaServidor` y calcula el offset |

> [!warning] El hueco de 18 horas es intencional
> Los buscadores de Caja (`BuscarPedido`) solo ven pedidos dentro de la jornada. Entre las 02:00
> y las 19:00 no hay jornada activa. **Eso no es un bug.** Si un pedido "no aparece", la primera
> pregunta es a qué hora se creó.

> [!danger] Relojes desconfigurados en el local
> Hay PCs con la hora mal. Cualquier fecha armada a mano tiene que salir de `ahoraServidor()`,
> nunca de `new Date()`. `sincronizarHoraServidor()` se llama una sola vez, en `LayoutStaff`.

> [!note] El cierre a las 2 es margen, no horario real
> El rango laboral termina como mucho a la 01:00; las 02:00 se pusieron por las dudas. Por eso el
> "borde" de un repartidor que vuelve pasada la medianoche **no es alcanzable**: además, el
> documento de `resumenDiario` lo crea el primer pedido de la jornada con `set(merge)`, así que
> nunca falta.

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

## Métodos de pago

| Valor | Significado |
|---|---|
| `EFECTIVO` | efectivo puro. Se exige `pagaCon >= total` para calcular el vuelto |
| `MP` | Mercado Pago. Aplica **recargo** `REACT_APP_recargoMP` (%) |
| `%` | pago dividido: una parte en efectivo (`montoEfectivo`), el resto por MP con recargo |

Los pedidos `MP` y `%` nacen en **`PENDIENTEMP`**: el cajero tiene que cotejar en su Mercado
Pago que la transferencia entró, y recién ahí los pasa a `CONFIRMADO` desde F2.

El recargo se calcula en `useCarrito.getResumen`, siempre sobre `subtotal + costo_envio`:
- `MP` → `base * recargo/100`
- `%` → `(base - montoEfectivo) * recargo/100`

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
> Nadie encarga para las 19:xx. Se evaluó generar las horas desde `REACT_APP_horaAbre` y el dueño
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
  transacción que abre quien llama**. Es lo que hace `Caja.guardarBD`: el número, el pedido y el
  arqueo van juntos o no va ninguno, así que **un commit fallido ya no quema el número**.
- **`getNextSequence(coleccion, sucursal)`** — abre su propia transacción, para quien solo necesita
  el número y no tiene una propia. Hoy lo usa únicamente `InsertarRegistros`.

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

1. **El turno cruza la medianoche**: `calcularHoras` suma 24 h si `salida <= entrada`. 19:00 → 02:00
   son 7 horas.
2. **`valorHora` se congela** dentro de cada registro al cargar la jornada. Subirle el sueldo a
   alguien no reescribe sus liquidaciones pasadas.
3. **El bruto se acumula día por día**, no como `horasTotales × unValorHora`.

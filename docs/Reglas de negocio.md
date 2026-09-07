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

Selector limitado a horas 20–23 y minutos 00/15/30/45 (el selector no se movió cuando la
apertura pasó de 20 a 19: hoy no se puede pactar un pedido para las 19:xx). El horario especial no permite pedidos
después de las 00.

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

## Numeración de tickets

`codigo = "{secuencial}-{iniciales del cajero}"`. El secuencial sale de
`getNextSequence("pedidos")`, que usa `runTransaction` sobre
`sucursales/{id}/contadores/pedidos`. **La numeración es por sucursal.**

> [!caution] El número se puede quemar
> `getNextSequence` corre **antes** y **fuera** del `writeBatch`. Si el commit falla, el número
> ya se consumió y la numeración salta. Cerrarlo exige meter el contador en la misma
> transacción que el pedido.

## Clientes

Alta automática al cobrar en Caja: `guardarClienteSiNoExiste` busca por teléfono y, si no
existe, lo crea. **No actualiza** la dirección de un cliente ya existente que se mudó.

La pantalla `/clientes` **no lista nada al entrar**: es un buscador. Un término de solo dígitos se
busca como teléfono exacto; cualquier otra cosa, como prefijo de nombre —y ahí Firestore compara
byte a byte, o sea que **distingue mayúsculas y acentos**: hay que escribirlo como se cargó—. La
sucursal sola lista esa sucursal. Todo con tope.

## Horas trabajadas y sueldos

Módulo aparte, con su propia nota: [[Asistencias y liquidacion]]. Las tres reglas que no se pueden
deducir del código de un vistazo:

1. **El turno cruza la medianoche**: `calcularHoras` suma 24 h si `salida <= entrada`. 19:00 → 02:00
   son 7 horas.
2. **`valorHora` se congela** dentro de cada registro al cargar la jornada. Subirle el sueldo a
   alguien no reescribe sus liquidaciones pasadas.
3. **El bruto se acumula día por día**, no como `horasTotales × unValorHora`.

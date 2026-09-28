---
tags: [gardenburger, firestore, datos]
aliases: [Colecciones, Esquema Firestore, Campos]
actualizado: 2026-09-28
---

# Modelo de datos Firestore

← [[GardenBurger]] · relacionado: [[Mapa de operaciones Firestore]], [[Flujo del pedido]] · vocabulario en [[Glosario]]

## Reparto de colecciones

| Globales (raíz) | Por sucursal (`sucursales/{id}/...`) |
|---|---|
| `productos` | `pedidos` |
| `categorias` | `resumenDiario` |
| `usuarios` (**todos** los empleados) | `asistencias` |
| `clientes` | `contadores` |
| `sucursales` | |
| `envios` | |

Regla práctica: si un componente usa `pedidos`, `resumenDiario`, `asistencias` o `contadores`, va
con `colSucursal`/`docSucursal`. Las globales van directo con `collection(db, ...)`.

## `sucursales/{slug}`

Doc ID = slug usado en las URLs públicas, generado solo desde el nombre (el ABM no lo muestra). ABM en PanelAdmin → Sucursales.

```js
{ nombre: "Luro", direccion: "Av. Luro 3300", activa: true,
  telefono: "1134567890",    // de atención: 10 dígitos, sin 0 ni 15. La web le antepone el 549
  horario: {                 // el de la web pública (28-09-2026). Sin él, la web la muestra cerrada
    dias: [0, 3, 4, 5, 6],   // de atención, 0 = domingo, por JORNADA
    abre: 20, cierra: 1,     // horas enteras, dentro de la jornada comercial (19 a 02)
    horasCorte: 1,           // la web deja de tomar pedidos 1 h antes del cierre
  } }                        // todo viaja en menu.json: la web lo lee de ahí
```

Se desactiva en vez de borrarse, para conservar las subcolecciones.

El ABM guarda con `setDoc` **sin merge**, así que reemplaza el documento entero: todo campo nuevo
de la sucursal tiene que viajar en el objeto que arma `guardar`, o editarla lo borra.

## `sucursales/{id}/pedidos`

El documento más importante del sistema. Va acumulando campos a medida que avanza por el
[[Flujo del pedido]]; casi todos son opcionales según por dónde pasó.

### Identidad y cliente
```js
codigo: "42-JD"          // secuencial de la sucursal + iniciales del cajero
nombre, telefono, direccion, entreCalles, observaciones
sucursal: "davinci"      // slug, redundante pero útil en auditoría
origen: "WEB" | "CAJA"
```

### Dinero
```js
total: 1850
metodoPago: "EFECTIVO" | "MP" | "%"     // las `key` de METODOS_PAGO; "%" = pago dividido
montoEfectivo: 0                         // solo si metodoPago === "%"
pagaCon: 2000                            // lo que el cliente DIJO que paga. En "%" = montoEfectivo; en MP, 0
envio: { zona_envio: "0-1", costo_envio: 500 }   // copia de un doc de `envios`
carrito: [...]                           // ver más abajo
combos: 3                                // CONGELADO al cobrar: contarCombos(carrito) de ese día
esLocal: false                           // CONGELADO al cobrar: si la zona cobra en mostrador
destinoVuelto: "VUELTO" | "PROPINA"      // solo delivery en efectivo que paga con más del total
aliasVuelto: "juan.mp"                   // opcional, con "VUELTO": los admins le transfieren
```

### Estado y tiempos
```js
estado: "PENDIENTE" | "CONFIRMADO" | "PENDIENTEMP" | "COCINA"
      | "ATP" | "DELIVERY" | "ENTREGADO" | "CANCELADO" | "ELIMINADO"
timestamp: Timestamp        // serverTimestamp(), o la hora pedida si es horario especial
esHorarioEspecial: false    // si es true, `timestamp` ES la hora a la que debe estar listo
```

### Trazabilidad — quién tocó qué
Cada paso deja `<actor>ID`, `<actor>` (nombre) y `<actor>Timestamp`:

| Campo base | Lo escribe | Cuándo |
|---|---|---|
| `cajero*` | `Caja.guardarBD` | al crear el pedido |
| `cajeroRevisa*` | `useRevisarSolicitud` | al tomar una solicitud web (se **borra** al guardar) |
| `cajeroApruebaMP*` | `PendientesMP` | al confirmar la transferencia |
| `cajeroCancelaMP*` | `PendientesMP` | al rechazar la transferencia |
| `cajeroCancelaSol*` | `PendientesSolicitudes` | al rechazar una solicitud web |
| `cajeroElimina*` | `BuscarPedido` | al eliminar un ticket |
| `cocinero*` | `PedidosEspera` | al mandar a cocinar |
| `cocinaFinTimestamp` | `PedidosCocinando` | al marcar cocinado |
| `atpCompletadoPor*`, `atpTimestamp` | `ATP` | al entregar en mostrador |
| `gestorDelivery*` | `JefeDeliverys` | al asignar repartidor |
| `delivery*` (`ID`, `Asignado`) | `JefeDeliverys` | al asignar repartidor |
| `estadoDelivery` | `JefeDeliverys` | `"SALIO"` / `"VOLVIO"` |
| `deliverySalidaTimestamp`, `deliveryFinTimestamp` | `JefeDeliverys` | salida y regreso |
| `pagaronCon` | `JefeDeliverys` | con cuánto pagó **al final** el cliente (hasta sep-2026, `pagoRepartidorCon`). Hace par con `pagaCon` |
| `sinEntregar` | `JefeDeliverys` | `true` si el repartidor **volvió sin entregar**: cierra el viaje (`estadoDelivery: VOLVIO`, se paga el envío) y el pedido sigue en `DELIVERY` hasta que el encargado lo anule |
| ~~`fijoDelivery`~~ | — | **en desuso** desde el 28-09-2026: ya no hay fijo. Los pedidos viejos lo tienen y se ignora |

### Solo si `origen === "WEB"`
```js
clienteTimestamp: Timestamp   // ⚠ NO es `timestamp`
mensajeWsp: "..."             // mensaje ya encodeURIComponent
telefonoSucursal: "1134567890" // el de la sucursal al crear la solicitud: /ver-pedido arma su WhatsApp sin leer la sucursal
cliente: {
  nombre, telefono, direccion, entreCalles,
  metodoPago: "EFECTIVO" | "MP",
  opcion: "delivery" | "Retira"    // ⚠ minúscula / ENVIOS_LOCALES[0]
}
```

> [!warning] `timestamp` vs `clienteTimestamp`
> La solicitud web nace **solo con `clienteTimestamp`**. El campo `timestamp` recién lo escribe
> `Caja.guardarBD` cuando el cajero confirma. Consecuencia: cualquier query con
> `where("timestamp", ...)` **descarta las solicitudes web sin confirmar**, porque Firestore
> ignora los documentos que no tienen el campo del filtro de rango. Eso explica por qué no
> aparecen en `BuscarPedido` ni en `HistorialPedidos`.

### Ítem del carrito
```js
{
  id, descripcion, categoria, precio, cantidad, subtotal,
  carritoItemId,        // uuid — solo en carritos armados desde Caja
  combo: 0,             // agrupa ítems del mismo combo — solo desde la web
  tipoExtra: "HAMBURGUESA" | "GENERAL",   // solo categoria EXTRA
  productoAsociado: "id",                  // solo extras genéricos
  observaciones: "Sin pepino"
}
```

## `sucursales/{id}/resumenDiario/{DD-MM-YYYY}`

> [!important] La foto v1 (26-09-2026): todo lo que usan Métricas y Estadísticas
> Además de los campos del arqueo de abajo, cada foto guarda: `fecha` (Timestamp, inicio de la
> noche: permite pedir rangos), `version` (`VERSION_FOTO`), `eliminados`, `cancelados`, `unidades`,
> `conObservaciones`, `porCanal` (`delivery`/`mostrador`: `{pedidos, monto}`), `porMetodo`
> (`EFECTIVO`/`MP`/`DIVIDIDO`: `{pedidos, monto}`), `porZona` (`{zona: pedidos}`), `porHora`
> (`{"20": {pedidos, monto, efectivo, mp, combos, delivery, mostrador}}`), `productos`
> (`{descripcion: {categoria, unidades}}`) y `porCliente` (`{telefono: {nombre, pedidos}}`; en
> pantalla solo nombre y pedidos). Unos 5-10 KB por noche.
>
> **Es versionable.** Si Estadísticas necesita un campo nuevo, se agrega en `calcularArqueo`, se
> sube `VERSION_FOTO`, y las fotos viejas se reconstruyen solas la próxima vez que alguien las
> mira (una lectura por pedido, una vez). Lo que ya existía da igual, porque sale de los hechos
> congelados en cada pedido. Lo que no se hace es cambiar el significado de un campo existente.

Un doc por [[Reglas de negocio#Jornada comercial|jornada comercial]]. **No es un contador: es una
foto.** El arqueo se calcula desde los pedidos de la jornada (`calcularArqueo`), y el documento
guarda ese resultado para no tener que releerlos. Desde el 26-09-2026: antes se acumulaba con
`increment()` y cada camino que tocaba un pedido tenía que acordarse de moverlo. Ver
[[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

```js
{
  totalEfectivo: 40000,   // hasta ago-2026 este campo se llamaba `efectivo`
  efectivoLocal: 15000,   // zonas de ENVIOS_LOCALES: cobrado en el mostrador
  efectivoEnvio: 25000,   // el resto: la plata vuelve con el repartidor
  mp: 10000,
  totalPedidos: 12,
  totalCombos: 9,         // unidades, no renglones del carrito
  deliverys: {            // liquidarDeliverys(): viajes cerrados (estadoDelivery == FIN)
    "<deliveryID>": {
      nombre, cantidadPedidos,  // viajes, entregados o no
      totalEnvios,          // suma de envio.costo_envio, MP y "sin entregar" incluidos
      efectivoCobrado,      // lo que rinde: total, montoEfectivo, o 0 (MP, sin entregar, anulado)
    }                       // hasta el 28-09-2026 también `fijo` y `aPagar`: ya no hay fijo
  },
  generadoEl: Timestamp,  // serverTimestamp() del cálculo. Sin este campo no es una foto
}
// invariante: efectivoLocal + efectivoEnvio === totalEfectivo
```

**Cuándo existe el documento.** Solo para jornadas **cerradas**, y solo desde que alguien miró su
arqueo por primera vez. La jornada en curso no tiene foto: se calcula cada vez, porque congelarla
daría un número que enseguida es falso. Por eso una jornada sin actividad nunca genera documento.

**Cuándo se regenera.** Nunca sola. La borra `invalidarFotoDePedido(pedido)` cuando alguien cancela
un pedido, elimina un ticket o cierra un delivery **de una jornada ya cerrada** —cambiaron los
hechos— y el siguiente que la mire la reconstruye. Cambiar código no regenera nada: si mañana se
agrega una categoría a `CATEGORIAS_COMBOS`, agosto sigue diciendo lo que era cierto en agosto.

> [!note] El detalle de cada entrega no está en la foto
> Las Métricas de la jefa de deliverys muestran cada viaje con su dirección, pero la foto guarda
> solo el resumen por repartidor: el detalle ya está en los pedidos. Hasta sep-2026 este bloque
> tenía `totalMonto` y `totalCobrado`, que sumaban el total aunque fuera MP. Ver
> [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].

## `sucursales/{id}/contadores/{nombre}`

```js
{ value: 42 }
```

Lo avanza `avanzarContador(transaction, coleccion)` **dentro de la transacción del pedido** en
`Caja.guardarBD`, para que un guardado fallido no queme el número. `getNextSequence(coleccion)`
abre su propia transacción para quien no tiene una (hoy solo `InsertarRegistros`). **La numeración
es por sucursal.** No reemplazar por `getDocs` + incremento manual. Ver
[[Decisiones tecnicas#Numeración de tickets dentro de la transacción del pedido]].

## ~~`sucursales/{id}/deliverys`~~ — EN DESUSO

Los repartidores se unificaron en `usuarios` con `rol` de delivery y `sinAcceso: true`. Ya no se
lee ni se escribe. **Su campo de nombre pasó a ser `nombreCompleto`**, no `nombre`:
[[Decisiones tecnicas#Todos los empleados viven en `usuarios`]].

## Subcolección `asistencias`

`sucursales/{id}/asistencias/{DD-MM-YYYY}` — un documento por jornada. Ver
[[Asistencias y liquidacion]].

```js
{
  fecha: Timestamp,          // 00:00 de la jornada
  registros: {
    "<empleadoId>": {
      nombre: "Juan Díaz",   // CONGELADO al cargar
      valorHora: 5000,       // CONGELADO: lo que se le pagó ESA noche
      ausente: false,
      entrada: "19:00",      // "HH:mm"
      salida: "02:00",
      horas: 7,              // calculado por calcularHoras() al guardar
      descuento: 0,          // pesos
      observaciones: "",
    }
  },
  cargadoPor / cargadoPorID / cargadoTimestamp,          // solo en la carga original
  actualizadoPor / actualizadoPorID / actualizadoTimestamp,
}
```

**El id es la jornada Y además hay un campo `fecha`**: el id permite el `getDoc` directo del
encargado sin query, pero `"05-09-2026"` y `"12-08-2026"` no ordenan cronológicamente como texto,
así que el rango del admin necesita una fecha real. Es un rango sobre un solo campo, o sea que
**no requiere índice compuesto**.

Editar un solo renglón va con `updateDoc` y ruta punteada — `` {[`registros.${id}`]: {...}} `` —
que en `updateDoc` **sí** navega el mapa. En `setDoc` los puntos serían parte del nombre del campo.

## `productos` (global)

```js
{ descripcion, categoria, precio, visible, oferta,
  ingredientes,        // se muestra en el menú público
  imagen: "url",        // Storage (productos/…, WebP de 1200 px) o un link externo pegado a mano
  tipoExtra: "HAMBURGUESA" | "GENERAL"   // solo si categoria === "EXTRA"
}
```

## `categorias` (global)

```js
{ nombre: "SIMPLE", nroOrden: 1 }
```

## `usuarios` (global)

Doc ID = uid de Firebase Auth.

**Todos los empleados viven acá**, tengan o no acceso al sistema. Doc ID = uid de Auth para los
que tienen acceso; id automático para los que no.

```js
{ nombreCompleto, telefono, dni, domicilio,
  rol: "<valor de REACT_APP_*>",
  sucursal: "davinci",       // los admin pueden no tenerla
  valorHora: 5000,           // base de la liquidación
  activo: true,              // false = dado de baja (doc histórico)
  sinAcceso: false,          // true = SIN cuenta de Auth (repartidores)
  correo,                    // solo si sinAcceso === false
  bajaTimestamp, timestamp,
  // solo rol delivery
  marcaMoto, modeloMoto, colorMoto, patente }
```

> [!warning] El campo es `nombreCompleto`
> No `nombre`. La subcolección vieja `deliverys` usaba `nombre` y esa referencia colgada reventaba
> `JefeDeliverys` con dos o más repartidores.

## `clientes` (global)

Se comparten entre sucursales. La Caja **actualiza la ficha en cada cobro**
(`useCliente.registrarCliente`): crea si el teléfono no existe, y si existe pisa nombre, dirección
y entre calles con lo recién cargado. También se puede crear a mano desde `/clientes`.

```js
{ nombre, telefono, direccion, entreCalles,
  sucursal: "davinci",       // la del primer pedido; "" si lo creó un admin sin sucursal
  creado: Timestamp,         // primer pedido (solo los creados desde sep-2026)
  ultimoPedido: Timestamp,   // serverTimestamp() del último cobro
  cantidadPedidos: 12,       // increment(1) por cobro; los clientes viejos arrancan en 1
}
```

Los tres campos de abajo son para CRM y los llena solo la Caja. Un cliente anterior a sep-2026 no
los tiene hasta su próximo pedido.

> [!note] Colección de crecimiento indefinido, pero ya no se lee entera
> Se crea un doc por cada teléfono nuevo. `Clientes.jsx` es un **buscador con tope** desde sep-2026:
> no lee nada al entrar. Ver [[Reglas de negocio#Clientes]].

## `envios` (global)

Zonas iguales para todas las sucursales. ABM en Admin → Parámetros → Envíos.

```js
{ zona_envio: "0-1", costo_envio: 500 }   // distancias en km
{ zona_envio: "Retira", costo_envio: 0 }
{ zona_envio: "Espera Afuera", costo_envio: 0 }
```

Las dos últimas son `ENVIOS_LOCALES` en `Constantes.jsx` y definen el ruteo de cocina y el
desglose de efectivo. Ver [[Reglas de negocio#Envíos locales vs delivery]].

## Reglas de seguridad

Viven en **`firestore.rules`** y **`storage.rules`** en la raíz del repo, versionadas y desplegadas
con `firebase deploy`. El porqué de cada una está en [[Reglas de seguridad]]. Resumen de quién
puede qué, al 14-09-2026:

| Colección | Lectura | Escritura |
|---|---|---|
| `sucursales/{s}` | pública (el selector web la necesita) | admin |
| `sucursales/{s}/pedidos/{p}` | `get` público solo si `origen == "WEB"`, y por 48 h; `list` solo staff | crear: staff o `esCreacionPublicaValida()`; update: staff **y** `asignacionValida()`; **delete: nunca** — por eso "eliminar" es cambiar el estado a `ELIMINADO` |
| `sucursales/{s}/{otra}/{doc}` (`resumenDiario`, `contadores`, `asistencias`) | staff | staff — el wildcard excluye `pedidos` porque las reglas se combinan con OR |
| `productos`, `categorias`, `envios` | pública | admin |
| `usuarios` | staff (la Caja necesita nombres) | admin — con `write` abierto un cajero se ascendía editando su propio doc |
| `clientes` | staff | staff |

**Storage**: `publico/menu.json` lectura pública, escritura solo admin y solo ese archivo. El
resto del bucket: lectura staff, escritura admin **y solo imágenes de hasta 5 MB**. Además el
bucket tiene **CORS** configurado por `gsutil`, que es una capa aparte de las reglas — ver
[[Decisiones tecnicas#`menu.json` depende de tres capas]].

La sucursal de la URL pública **no se valida en las reglas** sino en el front: `Crearsolicitud`
lee el doc de `sucursales` antes de crear (1 lectura) y rechaza si no existe. Ver
[[Mapa de operaciones Firestore]].

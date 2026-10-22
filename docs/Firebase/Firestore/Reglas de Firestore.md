---
tags: [gardenburger, firebase, firestore, seguridad]
aliases: [Reglas de seguridad, firestore.rules, Seguridad de Firestore]
actualizado: 2026-10-22
---

# Reglas de Firestore

↑ [[Firestore]]

El texto vive en **`firestore.rules`**, en la raíz del repo; esta nota explica el porqué. Lo
despliega el dueño (*Firebase › La configuración se versiona*). Las de Storage están en
*Storage › storage.rules* y el claim de admin en *Authentication › Ser admin es un claim en el token*.

## Quién puede qué

| Colección | Lectura | Escritura |
|---|---|---|
| `sucursales/{s}` | pública (el selector web la necesita) | admin |
| `sucursales/{s}/pedidos/{p}` | `get` público solo si `origen == "WEB"` y por 48 h; `list` solo staff | crear: staff o `esCreacionPublicaValida()`; actualizar: staff **y** la asignación válida, sin anular un viaje en la calle, y un anulado solo lo cambia el admin; **borrar: nunca** — por eso "eliminar" es pasar a `ELIMINADO` |
| `sucursales/{s}/{otra}/{doc}` (`resumenDiario`, `contadores`, `asistencias`, `excepcionesHorario`) | staff | staff — el comodín excluye `pedidos` (abajo) |
| `productos`, `categorias`, `envios` | pública (el respaldo del menú público) | admin |
| `usuarios` | staff (la Caja necesita nombres) | admin — con `write` abierto, un cajero se ascendía editando su propio documento |
| `clientes` | staff | staff |

"Staff" es cualquiera con sesión: el alta pública de cuentas en Auth está deshabilitada, así que
toda sesión es de un empleado. **No hay claims de staff ni de sucursal**: el aislamiento entre
sucursales queda en el front (decisión del dueño, auditoría 11-10-2026).

**Ninguna regla hace un `get()`**: cada `get()`/`exists()` dentro de una regla es una lectura
facturada. `esAdmin()` era un `get()` a `usuarios`; hoy es `request.auth.token.admin == true`.

## Las tres cosas que hay que entender

### `read` es `get` y `list`

`allow read` otorga leer **un** documento por id (`get`) y **consultar** la colección (`list`).
Una condición evaluada documento por documento —`resource.data.origen == "WEB"`— la satisface una
query que filtre por ese campo, así que **la query devuelve todo lo que matchea**.

> [!danger] Así se expusieron los datos de los clientes web, hasta el 14-09-2026
> `pedidos` tenía `allow read: if estaAutenticado() || esOrigenWeb()`: cualquiera, sin sesión, podía
> correr `where("origen","==","WEB")` y llevarse nombre, teléfono y dirección de toda la clientela.
> Hoy `get` y `list` van separados. No rompió nada: `PaginaDetalle` lee con `getDoc` por id.

**Regla práctica:** cada `allow read` sobre datos personales, preguntarse si la app necesita
`list`. Casi nunca.

### Las reglas se combinan con OR

Una regla más específica **no restringe** lo que un comodín ya otorgó. Para cerrar una subcolección
hay que **excluirla del comodín**, como se hace con `pedidos`:

```js
match /{coleccion}/{documento} {
  allow read, write: if estaAutenticado() && coleccion != 'pedidos';
}
```

Por eso `asistencias` es escribible por cualquier staff: cae bajo ese comodín. Es una decisión:
*Deuda tecnica › asistencias abierta en reglas, cerrada solo por front*.

### Las reglas repiten valores del código

Las reglas no leen `Constantes.jsx`: **repiten** los valores de `ESTADOS` (`'DELIVERY'`,
`'ELIMINADO'`, `'CANCELADO'`), de `SUBESTADOS_MOTODELIVERY` (`'SALIO'`) y los 15 minutos de
`MINUTOS_SOLICITUD_TOMADA`. Si cambian allá, cambiar acá.

## `update`: valida la asignación de la solicitud

```js
allow update: if estaAutenticado() && asignacionValida()
  && !anulaViajeEnLaCalle() && saleDeAnuladoSoloAdmin();

function asignacionValida() {
  let antes = resource.data.get('cajeroRevisaID', null);
  let despues = request.resource.data.get('cajeroRevisaID', null);
  return despues == antes || antes == null || antes == request.auth.uid
    || asignacionVencida();
}
function asignacionVencida() {   // la toma abandonada se libera a los 15 minutos
  let tomada = resource.data.get('cajeroRevisaTimestamp', null);
  return tomada == null || request.time > tomada + duration.value(15, 'm');
}
```

`asignacionValida()` es lo que hace atómica la toma de una solicitud web: `cajeroRevisaID` solo se
escribe si estaba libre, ya era de quien escribe o la toma venció. Compara lo que hay con lo que se
quiere escribir, **sin lecturas**. Toda escritura que no toque el campo pasa por `despues == antes`.

| Escritura | `antes` | `despues` | Resultado |
|---|---|---|---|
| Tomar libre | null | yo | ✅ |
| Tomar ajena (la carrera entre dos cajeros) | otro | yo | ❌ `permission-denied` |
| Tomar ajena con más de 15 minutos | otro | yo | ✅ (03-10-2026) |
| El cajero original guarda después de que otro la retomó | otro | null | ❌ la toma nueva tiene hora fresca |
| Retomar la propia | yo | yo | ✅ |
| Liberar o guardar (`deleteField`) | yo | null | ✅ |
| Cualquier update que no toque el campo | x | x | ✅ |

### No anular un viaje en la calle (04-10-2026)

```js
function anulaViajeEnLaCalle() {
  return resource.data.get('estado', null) == 'DELIVERY'
    && resource.data.get('estadoDelivery', null) == 'SALIO'
    && request.resource.data.get('estado', null) in ['ELIMINADO', 'CANCELADO'];
}
```

La misma regla que `enLaCalle()` en el front, para lo que el front no ve: una Caja que no se recargó
o una escritura desde la consola. El porqué: *Logística de deliverys › Un viaje en la calle no se anula*.

### Un anulado solo lo saca el admin (14-10-2026)

```js
function saleDeAnuladoSoloAdmin() {
  let antes = resource.data.get('estado', null);
  return !(antes in ['ELIMINADO', 'CANCELADO'])
    || request.resource.data.get('estado', null) == antes
    || esAdmin();
}
```

Cierra que una pantalla con una lista vieja devuelva un anulado al circuito, y que una solicitud
rechazada mientras otro cajero la cargaba se guarde como venta. Las escrituras que no cambian el
estado siguen pasando. **Fuera de estas tres, el `estado` no se valida**: ver
*Modelo de estados › Transiciones que se permiten y no deberían*.

## Qué valida la creación pública y qué no

`esCreacionPublicaValida()` es la única puerta por la que un visitante sin sesión escribe.

**Valida** la forma:

- `origen == "WEB"` y `estado == "PENDIENTE"`: no se puede crear un pedido ya confirmado.
- Que estén `cliente`, `carrito`, `total`, `estado`, `origen` y `clienteTimestamp`.
- Que **no** estén `cajeroID`, `cocineroID` ni `deliveryID`: nadie se adjudica el pedido.
- `carrito`: una lista de 1 a 50 ítems. `total`: un número **mayor que 0** y hasta 1.000.000.

**No valida** el contenido:

- Que los **precios** coincidan con el catálogo, ni que `total` sea la suma del carrito (50
  hamburguesas con `total: 1` pasan), ni la forma de cada ítem.
- Que el teléfono, el nombre o la dirección sean plausibles.
- **Cuántas** solicitudes crea un mismo visitante: no hay límite. App Check encarece el abuso
  automatizado, pero no lo impide desde el sitio real.
- **Qué otros campos trae**: es una **lista negra**. Una lista blanca (`hasOnly()`) obligaría a
  tocar la regla cada vez que la web agrega un campo, y el dueño no quiere mantenerla (26-09-2026).
  Una solicitud armada a mano con `cajeroRevisaID` no queda trabada: sin hora de toma, cuenta como
  vencida.

Está bien que sea de forma: validar precios exigiría un `get()` facturado por ítem. **El contenido
lo pone la Caja al Revisar**, con el catálogo en memoria (*Cajero › Tomar una solicitud web*).

**La sucursal de la URL no se valida en las reglas** sino en el front: `comprar` lee el documento de
la sucursal antes de crear (1 lectura) y rechaza si no existe o está desactivada.

## El link público vence a las 48 h

`allow get` para el público exige `sigueVisibleParaElPublico()`: `request.time <
clienteTimestamp + 48 h`. No se borra nada: el staff lo sigue viendo y el cliente ve "Este pedido ya
no está disponible". No cuesta lecturas.

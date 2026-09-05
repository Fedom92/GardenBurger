# GardenBurger — Esquema de datos Firestore

> **Multi-sucursal**: las colecciones operativas (`pedidos`, `resumenDiario`, `deliverys`, `contadores`) son **subcolecciones** de `sucursales/{id}/...`. Las globales (`productos`, `categorias`, `usuarios`, `clientes`, `sucursales`, `envios`) viven en la raíz.

## Colección: `sucursales`
Doc ID = slug usado en URLs públicas y paths (ej: `luro`). ABM en PanelAdmin → Sucursales.

```js
{
  nombre: "Luro",
  direccion: "Av. Luro 3300",
  activa: true | false          // se desactiva en vez de borrar (conserva subcolecciones)
}
```

## Subcolección: `sucursales/{id}/pedidos`
Pedidos creados desde la Caja interna.

```js
{
  codigo: "42-JD",                    // string: número secuencial + iniciales cajero
  cajeroID: "uid_firebase",           // string, se agrega al aprobar el pedido
  cajero: "Juan Díaz",                // string, se agrega al aprobar el pedido
  carrito: [],                         // array: lista de productos
  cocineroID: "uid_firebase",           // string, se agrega al pasar el pedido a COCINA
  cocinero: "Juan Díaz",                // string, se agrega al pasar el pedido a COCINA
  deliveryID: "uid_firebase",          // string, se agrega al asignar una persona DELIVERY
  deliveryAsignado: "Nombre Delivery", // string, se agrega al asignar una persona DELIVERY
  pagoRepartidorCon: 1500,             // number: monto que entregó el cliente al repartidor (solo efectivo/mixto). Se graba al confirmar entrega.
  direccion: "Av. Corrientes 1234",   // string
  entreCalles: "Entre Callao y Pueyrredón", // string
  envio: {},                            // map de colección envios
  estado: "PENDIENTE" | "CONFIRMADO" | "PENDIENTEMP" | "COCINA" | "DELIVERY" | "ENTREGADO" | "CANCELADO" | "ELIMINADO",
  gestorDelivery: "Nombre Gestor Delivery",                 // string, agrega datos del delivery gestor del pedido
  gestorDeliveryID: "uid_firebase",               // string, agrega datos del delivery gestor del pedido
  metodoPago: "EFECTIVO" | "MP" | "%", // "%" = pago dividido
  montoEfectivo: 0                     // number: se completa con monto efectivo solo si metodoPago === "%"
  nombre: "Carlos López",             // string: nombre del cliente
  observaciones: "Sin cebolla",       // string
  origen: "WEB" | "CAJA",           // string: indica el origen del pedido
  pagaCon: 2000,                       // number: con cuánto paga (para vuelto)
  telefono: "1155556666",             // string
  timestamp: Timestamp,                // serverTimestamp()
  total: 1850,                         // number


  //Si el pedido tiene origen "WEB, contendrá el campo "cliente" con los datos completados por el usuario
  cliente: {
    nombre: "Juan Pérez",
    direccion: "Av. Corrientes 1234",
    entreCalles: "Entre Callao y Pueyrredón",
    metodoPago: "EFECTIVO" | "MP",
    opcion: "DELIVERY" | "RETIRO",
    telefono: "1112345678"
  },
}
```

## Estructura de un ítem del carrito

```js
{
  id: "firestore_doc_id",
  descripcion: "Hamburguesa Doble",
  categoria: "DOBLE" | "SIMPLE" | "TRIPLE" | "BEBIDAS" | "EXTRA" | "POLLO CRISPY" | "NUGGETS" | "CAJA PAPAS",
  precio: 1500,
  cantidad: 1,
  subtotal: 1500,
  combo: 0,                          // number: agrupa ítems del mismo combo
  // Solo para extras de hamburguesa:
  tipoExtra: "HAMBURGUESA" | "GENERAL",
  // Solo para extras genéricos:
  productoAsociado: "id_producto",
  // Solo para hamburguesas:
  observaciones: "Sin pepino",
  visible: true
}
```

## Colección: `productos`

```js
{
  categoria: "DOBLE" | "SIMPLE" | "TRIPLE" | "BEBIDAS" | "EXTRA" | "POLLO CRISPY" | "NUGGETS" | "CAJA PAPAS" | ...,
  descripcion: "Hamburguesa Doble",
  ingredientes: "",                   //importante para el menú público
  oferta: true | false,             //indica si está en oferta
  precio: 1500,
  visible: true | false,
  imagen: "url_storage" | "",        // opcional
  tipoExtra: "HAMBURGUESA" | "GENERAL", // Solo para categoría EXTRA, indica a que padre pertenece el extra
}
```

## Colección: `categorias`

```js
{
  nombre: "SIMPLE",
  nroOrden: 1                        // define el orden de aparición en el menú
},
{
  nombre: "DOBLE",
  nroOrden: 2                        // define el orden de aparición en el menú
},
{
  nombre: "TRIPLE",
  nroOrden: 3                        // define el orden de aparición en el menú
},
{
  nombre: "BEBIDAS",
  nroOrden: 4                        // define el orden de aparición en el menú
},
```

## Colección: `usuarios` (empleados)
**Todos los empleados viven acá**, tengan o no acceso al sistema. Se gestiona solo desde
PanelAdmin.

Doc ID = uid de Firebase Auth para los que tienen acceso; id automático para los que no.

```js
{
  // Todos
  nombreCompleto: "Juan Díaz",
  dni: "37123123",
  telefono: "1112345678",
  domicilio: "Av. Corrientes 1234",
  rol: "ADMIN_ROL_VALUE",            // valor del rol asignado según env. Ejemplo REACT_APP_admin, REACT_APP_cajero, etc.
  sucursal: "luro",                  // slug de la sucursal donde opera (doc id de `sucursales`). Los admin pueden no tenerla.
  valorHora: 5000,                   // number: lo usa la liquidación de sueldos
  activo: true | false,              // false = dado de baja; el doc queda como histórico
  sinAcceso: true | false,           // true = empleado SIN cuenta de Auth (repartidores). No se loguea.
  bajaTimestamp: serverTimestamp(),  // solo en los dados de baja
  timestamp: serverTimestamp(),

  correo: "juan@example.com",        // solo si sinAcceso === false

  // Solo rol delivery
  marcaMoto: "Yamaha",
  modeloMoto: "Fz",
  colorMoto: "rojo",
  patente: "AB123CD"
}
```

**Alta**: si tiene acceso, la Cloud Function `crearUsuario` crea la cuenta de Auth y devuelve el
uid; el documento lo escribe el cliente con `setDoc`. Si no tiene acceso, es solo un `addDoc` y la
Function no se llama.

**Baja**: con acceso va por `darDeBajaUsuario` (borra la cuenta de Auth); sin acceso es un
`updateDoc({ activo: false, bajaTimestamp })` — llamar a la Function con un uid inexistente falla.

## Colección: `clientes`
Global: los clientes se comparten entre sucursales. Se dan de alta solos al cobrar en Caja (`useCliente`) o a mano desde la pantalla Clientes.

```js
{
  nombre: "Carlos López",
  telefono: "1155556666",
  direccion: "Av. Corrientes 1234",
  entreCalles: "...",
  sucursal: "luro",       // sucursal desde la que se dio de alta. "" si lo creó un admin (no tiene sucursal)
}
```

## ~~Subcolección: `sucursales/{id}/deliverys`~~ — EN DESUSO

Los repartidores se unificaron en `usuarios`, con `rol: delivery` y `sinAcceso: true`. Ya no se
escribe ni se lee esta subcolección: `JefeDeliverys` consulta `usuarios` filtrando por sucursal,
rol y `activo`.

Si quedaran documentos viejos, se borran a mano desde la Consola. No hay migración automática.

## Subcolección: `sucursales/{id}/contadores`
Usada por `getNextSequence()` — la numeración de tickets es por sucursal.

```js
// Doc ID = nombre de la secuencia (ej: "pedidos")
{
  value: 42   // número actual, se incrementa con transacción
}
```

## Colección: `envios` (parámetros de envío)
Global — las zonas las centraliza el admin desde `Admin/Parametros/Envios.jsx` y son iguales para todas las sucursales.

```js
{
  zona_envio: "0-1",      //Definido distancias en KM (0-1, 2-4, 5-6)
  costo_envio: 500
},
{
  zona_envio: "Retira",
  costo_envio: 0
},
{
  zona_envio: "Espera Afuera",
  costo_envio: 0
}
```

## Subcolección: `sucursales/{id}/resumenDiario`
Usada por `useResumenDiario()`.

```js
//cada nuevo día se crea un nuevo documento con el id = fecha en formato dd-mm-aaaa
//se suman los totales del día al generarse el pedido (y se restan al anularlo)
{
  totalEfectivo: 40000,   // hasta ago-2026 este campo se llamaba `efectivo`
  efectivoLocal: 15000,   // zonas de ENVIOS_LOCALES: cobrado en el mostrador
  efectivoEnvio: 25000,   // el resto de las zonas: vuelve con el repartidor
  mp: 10000,
  totalPedidos: 12,
  totalCombos: 9,         // unidades, no renglones del carrito
  deliverys: { ... }      // metricas por repartidor, las escribe JefeDeliverys
}
// efectivoLocal + efectivoEnvio === totalEfectivo
```


## Reglas de Seguridad establecidas para el Cloud Firestore

rules_version = '2';

service cloud.firestore {

  match /databases/{database}/documents {
    // ── Sucursales ─────────────────────────────────────────────────────
    // Metadata pública (selector de la web); edición solo staff
    match /sucursales/{sucursal} {
      allow read: if true;
      allow write: if estaAutenticado();

      // Pedidos: la web pública crea solicitudes validadas y
      // solo lee pedidos de origen WEB (/ver-pedido)
      match /pedidos/{pedido} {
        allow read: if estaAutenticado() || esOrigenWeb();
        allow create: if estaAutenticado() || esCreacionPublicaValida();
        allow update: if estaAutenticado();
        allow delete: if false;
      }

      // Colecciones operativas (envios, resumenDiario, deliverys, contadores): solo staff.
      // Excluye pedidos: las reglas se combinan con OR y este wildcard
      // re-otorgaría el delete bloqueado arriba.
      match /{coleccion}/{documento} {
        allow read, write: if estaAutenticado() && coleccion != 'pedidos';
      }
    }


    // Colecciones Públicas
    match /productos/{producto} {
      allow read: if true;
      allow write: if estaAutenticado();
    }
    match /categorias/{categoria} {
      allow read: if true;
      allow write: if estaAutenticado();
    }
    match /envios/{envio} {
      allow read: if true;
      allow write: if estaAutenticado();
    }

    // Otras Colecciones
    // Empleados. Cualquier staff puede LEER (la Caja necesita nombres, el
    // encargado la lista de su sucursal), pero escribir es SOLO del admin: un
    // `write` abierto dejaba que un cajero se pusiera rol admin editando su
    // propio documento desde la consola del navegador.
    //
    // Nadie edita su propio perfil: Mi Perfil es de solo lectura y si un dato
    // está mal lo corrige el administrador. Lo único que el empleado cambia por
    // su cuenta es la contraseña, y eso va por Auth, no por Firestore.
    //
    // El alta CON acceso la hace la Cloud Function con Admin SDK, que se saltea
    // las reglas; este create cubre a los empleados sin acceso, que los escribe
    // el cliente desde PanelAdmin.
    match /usuarios/{usuario} {
      allow read: if estaAutenticado();
      allow write: if esAdmin();
    }
    match /clientes/{cliente} {
      allow read, write: if estaAutenticado();
    }


    // Funciones Aux
    function esCreacionPublicaValida() {
      let data = request.resource.data;
      return data.origen == "WEB"
        && data.estado == "PENDIENTE"
        && data.keys().hasAll(["cliente", "carrito", "total", "estado", "origen", "clienteTimestamp"])
        && !data.keys().hasAny(["cajeroID", "cocineroID", "deliveryID"])
        && data.carrito is list
        && data.carrito.size() > 0
        && data.carrito.size() <= 50
        && data.total is number
        && data.total > 0
        && data.total <= 1000000;
    }

    function esOrigenWeb() {
      return resource.data.origen == "WEB";
    }

    function estaAutenticado() {
      return request.auth != null;
    }

    // OJO: el valor va literal. Las reglas no leen variables de entorno, así que
    // esto tiene que coincidir a mano con REACT_APP_admin del cliente y con
    // ADMIN_ROL de functions/.env. Si los tres no dicen lo mismo, el alta y la
    // edición de empleados dejan de funcionar.
    // El get() se factura como lectura. Es la ÚNICA lectura que agregan estas
    // reglas: el resto de las funciones auxiliares solo miran request/resource,
    // que ya vienen en el pedido y no cuestan nada. Y solo corre en escrituras
    // sobre `usuarios`, que las hace el admin y son pocas por mes.
    function esAdmin() {
      return estaAutenticado()
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'PEGAR_ACA_EL_VALOR_DE_REACT_APP_admin';
    }
  }
}

## Reglas de Seguridad para Storage

> La carpeta `publico/` aloja `menu.json` (generado con el botón "Publicar Menú" de Productos).
> Necesita lectura pública para que /menu lo consuma sin autenticación y sin lecturas de Firestore.

rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /publico/{archivo} {
      allow read: if true;
      allow write: if request.auth != null && archivo == "menu.json";
    }

    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
# GardenBurger — Esquema de datos Firestore

## Colección: `pedidos`
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
  deliveryAsignado: "Nombre Delivery"  // string, se agrega al asignar una persona DELIVERY
  direccion: "Av. Corrientes 1234",   // string
  entreCalles: "Entre Callao y Pueyrredón", // string
  envio: {},                            // map de colección envios
  estado: "PENDIENTE" | "CONFIRMADO" | "PENDIENTEMP" | "COCINA" | "DELIVERY" | "ENTREGADO" | "CANCELADO" | "ELIMINADO",
  gestorDelivery: "Nombre Gestor Delivery",                 // string, agrega datos del delivery gestor del pedido
  gestorDeliveryID: "uid_firebase",               // string, agrega datos del delivery gestor del pedido
  latitud: "-34.6037",                // string
  longitud: "-58.3816",               // string
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

## Colección: `usuarios`

```js
{
  correo: "juan@example.com",
  foto: "",
  nombreCompleto: "Juan Díaz",
  rol: "ADMIN_ROL_VALUE"             // valor del rol asignado según env. Ejemplo REACT_APP_admin o REACT_APP_rolBloq, etc.
  telefono: "1112345678",
  timestamp: serverTimestamp()
}
```

## Colección: `clientes`

```js
{
  nombre: "Carlos López",
  telefono: "1155556666",
  direccion: "Av. Corrientes 1234",
  entreCalles: "...",
  latitud: -34.6037,
  longitud: -58.3816
}
```

## Colección: `deliverys`

```js
{
  nombre: "Pedro Rodríguez",
  telefono: "1166667777",
  activo: true | false,
  colorMoto: "rojo",
  direccion: "Av. Corrientes 1234",
  dni: "37123123",
  marcaMoto: "Yamaha",
  modeloMoto: "Fz",
  patente: "AB123CD"
}
```

## Colección: `contadores`
Usada por `getNextSequence()`.

```js
// Doc ID = nombre de la secuencia (ej: "pedidos")
{
  value: 42   // número actual, se incrementa con transacción
}
```

## Colección: `envios` (o parámetros de envío)
Configurada desde `Admin/Parametros/Envios.jsx`.

```js
{
  zona_envio: "Zona Centro",
  costo_envio: 500
},
{
  zona_envio: "Retira",
  costo_envio: 0
}
```


## Reglas de Seguridad estbalecidas para el Cloud Firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {    
    match /pedidos/{document=**} {
      allow create: if esCreacionPublicaValida();
      allow read: if estaAutenticado() || esOrigenWeb();
      allow update: if estaAutenticado() && !isBloqueado();
      allow delete: if false;
    }	
    
    match /productos/{document=**} {
      allow read: if true;
      allow write: if estaAutenticado() && !isBloqueado();
    }
    
    match /categorias/{document=**} {
      allow read: if true;
      allow write: if estaAutenticado() && !isBloqueado();
    }
        
    match /{document=**} {
      allow read, write: if estaAutenticado() && !isBloqueado();
    }
    
    function isBloqueado() {
      let userDoc = get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data;
      return userDoc != null && userDoc.rol == "Blo_JkR62qVmNz";
    }
    
    function esCreacionPublicaValida() {
      let data = request.resource.data;
      return data.origen == "WEB"
        && data.estado == "PENDIENTE"
        && data.keys().hasAll(["cliente", "carrito", "total", "estado", "origen", "timestamp"])
        && !data.keys().hasAny(["cajeroID", "cocineroID", "deliveryID"]);
    }
    
    function esOrigenWeb() {
      return resource.data.origen == "WEB";
    }
    
     function estaAutenticado() {
      return request.auth != null;
    }
  }
}
---
tags: [gardenburger, firestore, seguridad]
---

# Reglas de seguridad

← [[GardenBurger]] · resumen y contexto en [[Modelo de datos Firestore#Reglas de seguridad]]

> [!important] Esto es un artefacto, no documentación
> Es el texto que se **copia y pega a mano en la Consola de Firebase**. No hay `firestore.rules`
> ni `storage.rules` versionados, por decisión del dueño:
> [[Decisiones tecnicas#Nada de configuración de infraestructura en el repo]].
>
> Esta nota documenta la **intención**. Al diagnosticar un `permission-denied`, pedir las reglas
> realmente desplegadas antes de suponer que son estas.

> [!tip] Las reglas se combinan con OR
> Una regla más específica **no restringe** lo que un wildcard ya otorgó. Por eso, para cerrar una
> subcolección hay que **excluirla del wildcard**, como se hizo con `pedidos`. Es el motivo por el
> que hoy `asistencias` es escribible por cualquier staff: [[Asistencias y liquidacion#Seguridad]].

> [!warning] Los `get()` dentro de reglas se facturan
> Evaluar una regla no cuesta nada, pero cada `get()`/`exists()` adentro es una lectura facturada.
> Como `||` cortocircuita, las condiciones baratas van primero.

## Firestore

```js
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

      // Colecciones operativas (resumenDiario, contadores, asistencias): solo staff.
      // Excluye pedidos: las reglas se combinan con OR y este wildcard
      // re-otorgaría el delete bloqueado arriba.
      //
      // OJO: `asistencias` cae acá, así que cualquier staff autenticado puede leer
      // y escribir los sueldos. Es una decisión tomada a conciencia para no pagar
      // el get() de una regla por rol.
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
```

## Storage

```js
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
```

# GardenBurger — Arquitectura Multi-Sucursal

## Estructura de Firebase Projects

| Project           | Colecciones                                                                 | Quién escribe    | Quién lee                              |
|-------------------|-----------------------------------------------------------------------------|------------------|----------------------------------------|
| `gb-catalogo`     | `productos`, `categorias`                                                   | Super Admin      | Todas las sucursales + menú público    |
| `gb-sucursal-a`   | `pedidos`, `resumenDiario`, `clientes`, `deliverys`, `usuarios`, `envios`, `contadores` | Staff sucursal A | Staff A + super admin dashboard |
| `gb-sucursal-b`   | ídem                                                                        | Staff sucursal B | Staff B + super admin dashboard        |

---

## Reglas de Firestore — `gb-catalogo`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
      // Restringir writes a super admin cuando se implemente el rol
    }
  }
}
```

---

## Inicialización en `firebase.js` (app de cada sucursal)

```js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Configuración de la sucursal propia (datos operativos)
const configSucursal = {
    apiKey:            process.env.REACT_APP_apiKey,
    authDomain:        process.env.REACT_APP_authDomain,
    projectId:         process.env.REACT_APP_projectId,
    storageBucket:     process.env.REACT_APP_storageBucket,
    messagingSenderId: process.env.REACT_APP_messagingSenderId,
    appId:             process.env.REACT_APP_appId,
};

// Configuración del catálogo compartido (read-only)
const configCatalogo = {
    apiKey:            process.env.REACT_APP_CAT_apiKey,
    authDomain:        process.env.REACT_APP_CAT_authDomain,
    projectId:         process.env.REACT_APP_CAT_projectId,
    storageBucket:     process.env.REACT_APP_CAT_storageBucket,
    messagingSenderId: process.env.REACT_APP_CAT_messagingSenderId,
    appId:             process.env.REACT_APP_CAT_appId,
};

const cacheOpts = { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) };

const appSucursal = initializeApp(configSucursal);
const appCatalogo = initializeApp(configCatalogo, "catalogo");

export const db         = initializeFirestore(appSucursal, cacheOpts); // datos operativos
export const dbCatalogo = initializeFirestore(appCatalogo, cacheOpts); // catálogo compartido
export const auth       = getAuth(appSucursal);
export const storage    = getStorage(appSucursal);
```

---

## Variables de entorno por sucursal

```env
# DB operativa de esta sucursal (ya existen)
REACT_APP_apiKey=...
REACT_APP_authDomain=...
REACT_APP_projectId=...
REACT_APP_storageBucket=...
REACT_APP_messagingSenderId=...
REACT_APP_appId=...

# Catálogo compartido (nuevas — iguales en todas las sucursales)
REACT_APP_CAT_apiKey=...
REACT_APP_CAT_authDomain=...
REACT_APP_CAT_projectId=...
REACT_APP_CAT_storageBucket=...
REACT_APP_CAT_messagingSenderId=...
REACT_APP_CAT_appId=...

# Info de la sucursal (ya existe)
REACT_APP_sucursal=sucursal-a
```

---

## Cambios en el código al implementar

### Mínimos y localizados

| Archivo | Cambio |
|---------|--------|
| `useTraerDatos.js` | Cambiar `import { db }` por `import { dbCatalogo }` en las queries de `productos` y `categorias` |
| `CartContext.jsx` | Ídem para `obtenerProductos()` y `obtenerCategorias()` |
| Todo lo demás | Sin cambios — sigue usando `db` |

### Ningún hook ni componente operativo necesita modificación.

---

## Dashboard Super Admin

App separada (deploy propio) o ruta `/super-admin` en una build especial.

Inicializa una instancia de db por sucursal más el catálogo:

```js
// firebaseConfig/firebaseSuperAdmin.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const sucursalDbs = [
    {
        db: getFirestore(initializeApp({
            apiKey: process.env.REACT_APP_SUCA_apiKey,
            projectId: process.env.REACT_APP_SUCA_projectId,
            // ...
        }, "suc-a")),
        nombre: process.env.REACT_APP_SUCA_nombre ?? "Sucursal A",
    },
    {
        db: getFirestore(initializeApp({
            apiKey: process.env.REACT_APP_SUCB_apiKey,
            projectId: process.env.REACT_APP_SUCB_projectId,
            // ...
        }, "suc-b")),
        nombre: process.env.REACT_APP_SUCB_nombre ?? "Sucursal B",
    },
];
```

### Leer stats del día de todas las sucursales en paralelo

```js
import { doc, getDoc } from "firebase/firestore";
import { getFechaComercial } from "../Utils/fechaComercial";

const hoy = getFechaComercial();

const resultados = await Promise.all(
    sucursalDbs.map(({ db, nombre }) =>
        getDoc(doc(db, "resumenDiario", hoy)).then(snap => ({
            nombre,
            ...(snap.exists()
                ? snap.data()
                : { efectivo: 0, mp: 0, totalPedidos: 0 }
            ),
        }))
    )
);

// resultados = [
//   { nombre: "Sucursal A", efectivo: 40000, mp: 10000, totalPedidos: 25 },
//   { nombre: "Sucursal B", efectivo: 30000, mp: 5000,  totalPedidos: 18 },
// ]
```

Solo 1 read por sucursal para tener el resumen del día completo — costo mínimo de Firestore.

---

## Deployment

- **Una build por sucursal** con su `.env` correspondiente
- **El catálogo** (`gb-catalogo`) se administra desde una instancia con autenticación de super admin, o desde una app admin dedicada
- **El super admin dashboard** tiene su propio `.env` con las keys de TODAS las sucursales
- Mismo código fuente para todas las apps — solo cambia el `.env`

---

## Agregar una nueva sucursal

1. Crear nuevo Firebase project en la consola
2. Copiar las Firestore Security Rules del proyecto existente
3. Crear `.env` con las keys del nuevo proyecto + las keys del catálogo
4. Build y deploy
5. En el super admin dashboard: agregar el objeto de config en `sucursalDbs` y las vars de entorno correspondientes

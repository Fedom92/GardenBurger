# GardenBurger — Instrucciones de Proyecto para Claude

## ¿Qué es esto?
Sistema de gestión integral para una hamburguesería. Incluye punto de venta (POS), cocina, delivery, menú online para clientes y panel de administración. Es una SPA en React con Firebase como backend. Aún está pendiente el desarrollo de panel estadísticas, mapa interactivo de pedidos por direccion, cierre del día con los números de ventas/finanzas y un modulo de auditoría de movimientos por usuario según una orden realizada.

---

## Stack tecnológico

- **React** (CRA, no Vite) con JSX
- **Firebase**: Firestore (base de datos), Auth (autenticación), Storage (archivos)
- **React Router v6** (`BrowserRouter`, `Routes`, `Route`)
- **React Bootstrap** para modales y componentes UI
- **SweetAlert2 (Swal)** para confirmaciones y alertas
- **React Toastify** para notificaciones rápidas (éxito, error)
- **React Hook Form** para formularios en general. Ej: Caja y CrearSolicitud
- **Moment.js** para fechas y horas. DD/MM/YYYY
- **React Icons (FA)** para íconos en la navegación
- **Google Maps / Places API** (`AutocompleteGoogle.jsx`, `GoogleMapsContext.jsx`)
- **CSS variables** para colores del tema (definidas en `style/Main.css`)
- **Bootstrap 5** vía CDN o npm (clases `d-flex`, `col-md-6`, etc.)

---

## Variables de entorno (`.env`)

Todas las vars empiezan con `REACT_APP_`:

| Variable | Uso |
|---|---|
| `REACT_APP_apiKey` ... `REACT_APP_appId` | Config de Firebase |
| `REACT_APP_admin` | Valor del rol administrador |
| `REACT_APP_rolBloq` | Rol de usuario bloqueado |
| `REACT_APP_rolCaja` | Rol cajero (hay un ejemplo comentado en App.js) |
| `REACT_APP_recargoMP` | % de recargo para Mercado Pago (ej: `10`) |

**Nunca hardcodear estos valores.** Siempre usar `process.env.REACT_APP_*`.

---

## Estructura de carpetas actual

```
src/
├── App.js                          # Router principal + guards de autenticación
├── index.js                        # Entry point, envuelve con AuthContextProvider
├── firebaseConfig/
│   └── firebase.js                 # Init Firebase, exports: db, auth, storage, getNextSequence
├── context/
│   ├── AuthContext.js              # useAuth() → { userData, login, logout }
│   ├── CartContext.jsx             # CartProvider → todo el estado del carrito y modales
│   └── GoogleMapsContext.jsx       # GoogleMaps API key provider
├── Login_Navs/
│   ├── Login.jsx                   # Pantalla de login (pública)
│   ├── Navigation.jsx              # Sidebar con menú (solo admins autenticados)
│   └── Nav.jsx                     # Ítem individual del sidebar
├── components/
│   ├── Admin/                      # Gestión de usuarios, perfil, parámetros de envío
│   ├── Clientes/                   # ABM de clientes
│   ├── Cocina/                     # Vista cocina: pedidos en espera y cocinando
│   ├── Delivery/                   # Asignación de entregas + gestión de repartidores
│   ├── Estadisticas/Historico/     # Dashboard con Google Sheets + charts
│   ├── Pedidos/                    # Historial de pedidos
│   ├── POS/                        # Caja (punto de venta principal)
│   │   ├── Caja.jsx                # Componente principal del POS
│   │   ├── pos_hooks/              # Hooks extraídos de Caja: useCarrito, useCliente, etc.
│   │   └── Entrantes/              # Pedidos pendientes de MP y solicitudes web
│   ├── Productos/                  # ABM de productos y categorías
│   └── Solicitudes/                # Menú público online para clientes
├── Utils/
│   ├── Constantes.jsx              # CATEGORIAS_HAMBURGUESA, ESTADOS_SOLICITUDES, CANTIDAD_CARNES
│   ├── TablaGenerica.jsx           # Tabla reutilizable con búsqueda y ordenamiento
│   └── AutocompleteGoogle.jsx      # Input con autocompletado de direcciones Google
└── style/
    └── Main.css                    # Estilos globales + CSS variables del tema
```

---

## Autenticación y roles

- `AuthContext` usa Firebase Auth + Firestore (`colección: "usuarios"`)
- Al autenticarse, busca el doc del usuario en `/usuarios/{uid}` y carga su `rol`
- Si el rol es `REACT_APP_rolBloq`, se hace signOut automáticamente
- El `userData` disponible en toda la app tiene: `id`, `rol`, `nombreCompleto`, `iniciales`, y los demás campos del doc Firestore

### Guards en App.js:
- `RequireAuth`: redirige a `/` si no está autenticado
- `RequireAdmin`: redirige a `/miPerfil` si no tiene rol admin
- Hay ejemplos comentados para `RequireRole` (múltiples roles) y `RequireCocina` (rol específico)

---

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `usuarios` | Usuarios del sistema con campo `rol` |
| `pedidos` | Pedidos creados desde Caja |
| `solicitudes` | Pedidos creados desde el menú online público |
| `productos` | Catálogo de productos con `visible`, `categoria`, `precio` |
| `categorias` | Categorías ordenadas por `nroOrden` |
| `clientes` | Registro de clientes para autocompletado en Caja |
| `deliverys` | Repartidores con campo `activo` |
| `contadores` | Contadores para secuencias (ej: numeración de pedidos) |

### Función `getNextSequence(coleccion)`
Genera IDs secuenciales incrementales via transacción Firestore. Se usa para el código del pedido: `${nuevoCodigo}-${userData.iniciales}`.

---

## Flujo de un pedido (Caja → Cocina → Delivery)

```
Caja crea pedido
    estado: "APROBADO" (efectivo) o "PENDIENTEMP" (MP), cuando es MP los cajeros deben cotejar en MercadoPago si fue realmente abonado y luego lo aprueban actualizando su estado a "APROBADO"
        ↓
Cocina: PedidosEspera (estado: "APROBADO")
    → se seleccionan pedidos → se mandan a cocinar
        ↓
Cocina: PedidosCocinando (estado: "COCINA")
    → se marcan como listos
        ↓
Delivery: Deliverys.jsx (estado: "DELIVERY")
    → se asigna repartidor → se marca como entregado y pasaría a futuro al historial de pedidos para estadísticas
```

---

## Carrito y modales (CartContext) - Creado por otro desarrollador

El `CartContext` es el estado central del menú online y tiene lógica compleja:

1. **Hamburguesas**: tienen variantes (SIMPLE/DOBLE/TRIPLE). Al agregar una, se abre `ModalHamburguesa` → luego `ModalExtras` para extras de hamburguesa
2. **Pollo Crispy**: usa el flujo de extras de hamburguesa directamente
3. **Otros productos**: si existen `extrasGenericos`, abre `ModalExtrasGenericos`
4. **Bebidas**: se acumula la cantidad en lugar de crear ítem nuevo
5. Los combos tienen un número (`combo`) que agrupa ítems relacionados
6. El carrito se persiste en `localStorage`

### Categorías especiales en Constantes.jsx:
- `CATEGORIAS_HAMBURGUESA = ["SIMPLE", "DOBLE", "TRIPLE"]`
- `CANTIDAD_CARNES` → mapea categorías a cantidad de medallones (para el contador de cocina)
- `ESTADOS_SOLICITUDES` → pipeline de estados

---

## Componentes reutilizables clave

### `TablaGenerica`
Tabla con búsqueda y ordenamiento. Recibe: `data`, `columns`, y callbacks opcionales.

### `AutocompleteGoogle`
Input de dirección con Google Places. Escribe la dirección seleccionada en los campos `direccion`, `latitud`, `longitud` via `setValue` de react-hook-form.

### `useCarrito`, `useCliente`, `useTraerDatos`, `usePendientes`, `useHorarioEspecial`
Hooks extraídos de `Caja.jsx` para separar responsabilidades. Están en `components/POS/pos_hooks/`.

---

## Estilos y diseño (De prefrencia estilo Negro y Blanco, excepto botones)

- **Tema oscuro**: `--color-primario-normal: #272727`, `--color-primario-fuerte: #000000`
- **Sidebar**: colapsable en desktop, drawer en mobile (clase `mobile-open`)
- Animaciones definidas en `Main.css` (ej: `EntradaDerechaAIzquierda`)
- En mobile hay un topbar fijo con el ícono `FaUserCog` que abre el menú
- El layout usa Bootstrap grid (`col-md-*`) + flexbox custom

---

## Convenciones del código

- Componentes en PascalCase, archivos `.jsx` para componentes con JSX, `.js` para contextos y hooks
- Estado local con `useState`, efectos con `useEffect`, memoización con `useMemo`/`useCallback`
- Refs de Firestore queries dentro de `useRef` para evitar re-creación
- `onSnapshot` para real-time (Cocina), `getDocs` para one-time (Delivery, Admin)
- Confirmaciones destructivas siempre con `Swal.fire` (no `window.confirm`)
- Notificaciones rápidas con `toast` de react-toastify
- Manejo de errores con `console.error` + `Swal` de error para el usuario
- Formularios con `react-hook-form` en Caja y CrearSolicitud

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Login` | Público |
| `/menu` | `Menu` | Público |
| `/crear-solicitud` | `CrearSolicitud` | Público |
| `/ver-pedido/:id` | `PaginaDetalle` | Público |
| `/miPerfil` | `MiPerfil` | Auth |
| `/pedidos-caja` | `Caja` | Admin |
| `/gestion-cocina` | `Cocina` | Admin |
| `/delivery-pedidos` | `Deliverys` | Admin |
| `/gestion-deliverys` | `PersonalDeliverys` | Admin |
| `/productos` | `Productos` | Admin |
| `/clientes` | `Clientes` | Admin |
| `/historial-pedidos` | `HistorialPedidos` | Admin |
| `/admin` | `PanelAdmin` | Admin |
| `/estadisticas-viejas` | `Estadisticas` | Admin |

---

## Cosas a tener en cuenta al modificar

1. Al agregar una nueva ruta admin, seguir el patrón `<RequireAuth><RequireAdmin><Componente /></RequireAdmin></RequireAuth>`
2. Al crear un nuevo componente de ABM, usar `TablaGenerica` para la tabla
3. Los estados de pedido deben coincidir exactamente con los strings de `ESTADOS_SOLICITUDES` en Constantes.jsx
4. El `getNextSequence` usa transacciones — no reemplazar por `getDocs` + incremento manual
5. Firebase está configurado con `persistentLocalCache` para funcionar offline
6. La colección `solicitudes` es del menú público; `pedidos` es de la Caja interna
7. Cosas pendientes para realizar:
    - Dashboard con estadísticas
    - Cierre del día con los números de ventas/finanzas
    - Módulo de auditoría de movimientos por usuario según una orden realizada
    - Mapa interactivo de pedidos por dirección leaflet
8. Lo más importante de todo es tener en cuenta que Firebasee tiene grandes limitaciones de operaciones de lectura, por eso siempre trata de mantener una estructura o lógica que minimice la cantidad de consultas.
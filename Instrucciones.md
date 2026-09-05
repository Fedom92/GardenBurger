# GardenBurger — Instrucciones de Proyecto para Claude

## ¿Qué es esto?
Sistema de gestión integral para una hamburguesería. Incluye punto de venta (POS), cocina, delivery, menú online para clientes y panel de administración. Es una SPA en React con Firebase como backend.

---

## Stack tecnológico

- **React** (CRA, no Vite) con JSX
- **Firebase**: Firestore (base de datos), Auth (autenticación), Storage (archivos)
- **React Router v6** (`BrowserRouter`, `Routes`, `Route`)
- **React Bootstrap** para modales y componentes UI
- **SweetAlert2 (Swal)** para confirmaciones y alertas
- **React Toastify** para notificaciones rápidas (éxito, error)
- **React Hook Form** para formularios en general. Ej: Caja y CrearSolicitud
- **Moment.js** para fechas y horas. Formato Predeterminado DD/MM/YYYY
- **React Icons (FA)** para íconos en la navegación
- **CSS variables** definidas en `style/Main.css`
- **Bootstrap 5** vía CDN o npm (clases `d-flex`, `col-md-6`, etc.)

---

## Variables de entorno (`.env`)

Todas las vars empiezan con `REACT_APP_`:

| Variable | Uso |
|---|---|
| `REACT_APP_apiKey` ... `REACT_APP_appId` | Config de Firebase |
| `REACT_APP_admin` | Valor del rol administrador (debe coincidir con `ADMIN_ROL` de `functions/.env`) |
| `REACT_APP_rolCaja` | Rol cajero (aún no implementado y habrá otros) |
| `REACT_APP_recargoMP` | % de recargo para Mercado Pago (ej: `10`) |
| `REACT_APP_horaAbre, REACT_APP_horaCierre` | info de negocio |

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
├── Login_Navs/
│   ├── Login.jsx                   # Pantalla de login (pública)
│   ├── Navigation.jsx              # Sidebar con menú (solo admins autenticados)
│   └── Nav.jsx                     # Ítem individual del sidebar
├── components/
│   ├── Admin/                      # Gestión de usuarios, perfil, parámetros de envío
│   ├── Clientes/                   # ABM de clientes
│   ├── Cocina/                     # Vista cocina: pedidos en espera y cocinando
│   ├── Delivery/                   # Asignación de entregas + gestión de repartidores
│   ├── Estadisticas/Historico/     # Dashboard con Google Sheets + charts (Estadisticas sistema viejo)
│   ├── Pedidos/                    # Historial de pedidos
│   ├── POS/                        # Caja (punto de venta principal)
│   │   ├── Caja.jsx                # Componente principal del POS
│   │   ├── pos_hooks/              # Hooks extraídos de Caja: useCarrito, useCliente, etc.
│   │   └── Entrantes/              # Pedidos pendientes de MP y solicitudes web
│   ├── Productos/                  # ABM de productos y categorías
│   └── Solicitudes/                # Menú público online para clientes
├── Utils/
│   ├── Constantes.jsx              # CATEGORIAS_HAMBURGUESA, FLUJO_PUB_ESTADOS, CANTIDAD_CARNES, ESTADOS, SUBESTADOS_MOTODELIVERY
│   ├── TablaGenerica.jsx           # Tabla reutilizable con búsqueda y ordenamiento
└── style/
    └── Main.css                    # Estilos globales + CSS variables del tema
```

---

## Autenticación y roles

- `AuthContext` usa Firebase Auth + Firestore (`colección: "usuarios"`)
- Al autenticarse, busca el doc del usuario en `/usuarios/{uid}` y carga su `rol`
- El `userData` disponible en toda la app tiene: `id`, `rol`, `nombreCompleto`, `iniciales`, y los demás campos del doc Firestore

### Alta y baja de usuarios (Cloud Functions con Admin SDK)
El cliente nunca crea ni borra cuentas de Auth: lo hace el backend, que valida contra `ADMIN_ROL` que quien llama sea admin.
- **Alta**: callable `crearUsuario` — crea la cuenta de Auth y el doc `usuarios/{uid}` con `activo: true`.
- **Baja**: callable `darDeBajaUsuario` — **borra la cuenta de Auth** (bloqueo real) y deja el doc con `activo: false` + `bajaTimestamp` como registro histórico. No se reactiva: si la persona vuelve, se crea de cero con un uid y un doc nuevos. No se puede dar de baja a un admin ni a uno mismo.
- `AuthContext` desloguea a quien tenga `activo: false` como respaldo, mientras siga vigente un token ya emitido.

### Guards en App.js:
- `RequireAuth`: redirige a `/` si no está autenticado
- `RequireAdmin`: redirige a `/miPerfil` si no tiene rol admin
- `RequireSucursal`: bloquea con un mensaje si el usuario no tiene `sucursal` asignada (las pantallas operativas leen `sucursales/{id}/...`). Acepta `permitirAdmin` para las pantallas que el admin sí puede usar eligiendo sucursal, como Historial de Pedidos
- Hay ejemplos comentados para `RequireRole` (múltiples roles) y `RequireCocina` (rol específico)

### Menú lateral por rol
`MODULOS_POR_ROL` en `Login_Navs/Navigation.jsx` define qué items del sidebar ve cada rol; es el único lugar a tocar para cambiar la visibilidad. Es **cosmético**: evita ofrecer links que el usuario no puede usar, pero la barrera real siguen siendo los guards de arriba. Un rol que no figure en el mapa ve solo "Mi Perfil" y "Salir".

El admin no navega las pantallas operativas (no tiene sucursal): ve Productos, Historial, Estadísticas, Clientes y Configuración. Cuando necesita datos de una sucursal, la pantalla ofrece un selector local (patrón de `HistorialPedidos.jsx`), sin sucursal activa global.

---

## Colecciones Firestore — Multi-Sucursal

El sistema es multi-sucursal dentro de **un solo proyecto Firebase**. Las colecciones operativas viven en subcolecciones `sucursales/{id}/...`; el catálogo y los datos de empresa son globales.

| Globales (path raíz) | Por sucursal (`sucursales/{id}/...`) |
|---|---|
| `productos` (catálogo con `visible`, `categoria`, `precio`) | `pedidos` (web pública con campo `origen`, o cajeros) |
| `categorias` (ordenadas por `nroOrden`) | `resumenDiario` (cierre del turno: totalEfectivo/efectivoLocal/efectivoEnvio/mp/totalPedidos/totalCombos) |
| `usuarios` (**todos los empleados**, con `rol`, `sucursal`, `valorHora` y `sinAcceso`) | `contadores` (secuencias de esa sucursal) |
| `clientes` (compartidos entre sucursales) | |
| `sucursales` (metadata: `nombre`, `direccion`, `activa`) | |
| `envios` (zonas de reparto, iguales para todas las sucursales) | |

### Cómo se scopea la sucursal — IMPORTANTE
- **Staff**: helpers `colSucursal("pedidos")` / `docSucursal("pedidos", id)` de `firebaseConfig/firebase.js`. La sucursal (`userData.sucursal`, campo del doc de `usuarios`) la setea ÚNICAMENTE AuthContext al loguear con `setSucursalStaff()` y se limpia al desloguear. No interceptan los `collection`/`doc` estándar: son funciones con nombre propio.
- **Web pública**: la sucursal viene en la URL (`/crear-solicitud/:sucursal`, `/ver-pedido/:sucursal/:id`) vía `useParams()` y el path se arma explícito: `collection(db, "sucursales", sucursal, "pedidos")`. Nunca usa los helpers.
- **Guard**: las rutas operativas están envueltas en `RequireSucursal` (App.js) — un usuario sin `sucursal` ve un mensaje en vez de crashear. `/historial-pedidos` usa `permitirAdmin`: el admin entra sin sucursal y elige cuál consultar con un selector.

Regla práctica: si un componente usa `pedidos`, `resumenDiario`, `deliverys` o `contadores`, usa `colSucursal`/`docSucursal` (staff) o el path explícito con la sucursal de la URL (público); las colecciones globales (`productos`, `categorias`, `usuarios`, `clientes`, `sucursales`, `envios`) van directo a la raíz con `collection(db, ...)`.

### Función `getNextSequence(coleccion)`
Genera IDs secuenciales incrementales via transacción Firestore (sobre `sucursales/{sucursal}/contadores` de la sucursal logueada, por lo que la numeración es por sucursal). Se usa para el código del pedido: `${nuevoCodigo}-${userData.iniciales}`.

### Alta de una sucursal (sin tocar Firebase Console)
1. PanelAdmin → ⚙ → "Sucursales": crear con nombre (el identificador slug se genera solo).
2. Asignar usuarios a la sucursal (crear o editar desde PanelAdmin). Cada usuario opera SOLO su sucursal.
3. Los links públicos quedan `gardenburger.com.ar/crear-solicitud/{slug}`.

Nota: el super-admin gestiona sucursales, usuarios, productos y envíos (todo global); no navega las pantallas operativas. Puede consultar el Historial de Pedidos de cualquier sucursal con el selector. Un dashboard general cross-sucursal es tema futuro.

---

## Flujo de un pedido (Caja → Cocina → Delivery)

```
Caja crea pedido
    estado: "CONFIRMADO" (efectivo) o "PENDIENTEMP" (MP). Cuando es MP los cajeros deben cotejar en su MercadoPago si fue realmente abonado y luego lo aprueban actualizando su estado a "CONFIRMADO"
        ↓
Cocina: PedidosEspera (estado: "CONFIRMADO")
    → se seleccionan pedidos → se mandan a cocinar
        ↓
Cocina: PedidosCocinando (estado: "COCINA")
    → se marcan como listos
        ↓
ATP: ATP.jsx (estado: "ATP")
    → cuando sale de cocina solo si el pedido tenía como zona_envio "Espera Afuera" o "Retira" se lo deriva a Atención al Público
        ↓
Delivery: JefeDeliverys.jsx (estado: "DELIVERY")
    → si el pedido tenía dirección, se lo deriva a JefeDeliverys
    → se asigna repartidor → se marca cuando sale y cuando vuelve. Una vez regresa el delivery se lo marca con Estado FINAL.
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
- `FLUJO_PUB_ESTADOS` → orden de estados para el menú público
- `ESTADOS` → pipeline de estados
- `SUBESTADOS_MOTODELIVERY` → pipeline de subestados

---

## Componentes reutilizables clave

### `TablaGenerica`
Tabla Estándar con búsqueda y ordenamiento. Recibe: `data`, `columns`, y otros parametros/callbacks opcionales.

### `useCarrito`, `useCliente`, `useTraerDatos`, `usePendientes`, `useHorarioEspecial`
Hooks extraídos de `Caja.jsx` para separar responsabilidades. Están en `components/POS/pos_hooks/`.

---

## Estilos y diseño (De prefrencia estilo Negro y Blanco, excepto botones)

- **Tema oscuro**: `--color-primario-normal: #272727`, `--color-primario-fuerte: #000000` (aun no definido)
- **Sidebar**: colapsable en desktop, drawer en mobile (clase `mobile-open`)
- Estilos y Animaciones definidas en `Main.css`
- En mobile hay un topbar fijo con el ícono `FaUserCog` que abre el menú
- El layout usa Bootstrap grid (`col-md-*`) + flexbox custom

---

## Convenciones del código

- Componentes en PascalCase, archivos `.jsx` para componentes con JSX, `.js` para contextos y hooks
- Estado local con `useState`, efectos con `useEffect`, memoización con `useMemo`/`useCallback`. React
- Refs de Firestore queries dentro de `useRef` para evitar re-creación
- `onSnapshot` para real-time (solo donde se necesite ver flujo de pedidos), `getDocs` para one-time
- Confirmaciones destructivas siempre con `Swal.fire` (no `window.confirm`)
- Notificaciones rápidas con `toast` de react-toastify
- Manejo de errores con `console.error` + `Swal` de error para el usuario
- Formularios con `react-hook-form`

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Login` | Público |
| `/menu` | `Menu` | Público |
| `/crear-solicitud` | `SeleccionSucursal` | Público — el cliente elige sucursal |
| `/crear-solicitud/:sucursal` | `CrearSolicitud` | Público — sucursal precargada por URL |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` | Público |
| `/miPerfil` | `MiPerfil` | Auth |
| `/pedidos-caja` | `Caja` | Admin, Auth |
| `/gestion-cocina` | `Cocina` | Admin, Auth |
| `/delivery-pedidos` | `Deliverys` | Admin, Auth |
| `/gestion-deliverys` | `PersonalDeliverys` | Admin, Auth |
| `/productos` | `Productos` | Admin - Colección Pública |
| `/clientes` | `Clientes` | Admin - Colección Pública |
| `/historial-pedidos` | `HistorialPedidos` | Admin |
| `/admin` | `PanelAdmin` | Admin |
| `/estadisticas-viejas` | `Estadisticas` | Admin |
| `/gestion-atp` | `ATP` | Admin, Auth |

---

## Cosas a tener en cuenta al modificar
0. Nunca tomes en cuenta los archivos en la carpet 'public'
1. Al agregar una nueva ruta admin, seguir el patrón `<RequireAuth><RequireAdmin><Componente /></RequireAdmin></RequireAuth>` o recomendar el que se considere mejor
2. Al crear un nuevo componente de ABM, tratar de usar `TablaGenerica` para la tabla
3. Los estados de pedido y su flujo están definidos en workflow.pdf. Sus valores de `ESTADOS`, `SUBESTADOS_MOTODELIVERY` y el orden definido para su visualización pública `FLUJO_PUB_ESTADOS` están en Constantes.jsx. 
4. El `getNextSequence(sucursal, coleccion)` para el código de ticket usa transacciones — no reemplazar por `getDocs` + incremento manual
5. Firebase está configurado con `persistentLocalCache` para funcionar offline y para ahorrar operaciones de lectura
6. Lo más importante de todo es tener en cuenta que Firebase tiene grandes limitaciones de operaciones de lectura, por eso siempre trata de mantener una estructura o lógica que minimice la cantidad de consultas.
7. Multi-sucursal: al crear un componente nuevo que use `pedidos`/`resumenDiario`/`deliverys`/`contadores`, usar `colSucursal`/`docSucursal` de `firebaseConfig/firebase.js` (staff) o el path explícito con la sucursal de la URL (público). Ver sección Colecciones.
8. Las Security Rules están versionadas en `Esquema_firestore.md`.

---

## Pendientes

Cosas pendientes para realizar:
    - Panel o Dashboard con estadísticas (ya hay un componente modelo en Historicos/Estadisticas.jsx, el cual se usa para el Histórico)
    - Terminar y Testear - Cierre del día con los números de ventas/finanzas y total de Combos
    - Finalizar Menú Público
    - Hacer página "/" crearSolicitud? Luego revisar donde regidir para login.

    - ~~Definir manejo/lógica varias sucursales~~ (hecho: subcolecciones `sucursales/{id}/...` + rutas explícitas con `userData.sucursal`)
    - Dashboard general del super-admin con números de todas las sucursales (a futuro)

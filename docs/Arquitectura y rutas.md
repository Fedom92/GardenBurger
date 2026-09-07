---
tags: [gardenburger, arquitectura]
---

# Arquitectura y rutas

← [[GardenBurger]]

## Árbol de providers

La decisión clave: **`AuthContext` NO envuelve toda la app**. Vive únicamente sobre la rama de
rutas del staff. Las páginas públicas no montan nada de sesión. Ver
[[Decisiones tecnicas#Las páginas públicas no tocan AuthContext]].

```
<App>
 └── <CartProvider>              ← global: carrito del menú público (localStorage)
      └── <BrowserRouter>
           ├── rutas públicas    ← SIN AuthContext
           └── <Route element={<AuthContextProvider><LayoutStaff/></AuthContextProvider>}>
                └── rutas de staff
```

`LayoutStaff` ([[Mapa de archivos|RutasProtegidas.jsx]]) es el único lugar donde se llama a
`sincronizarHoraServidor()`: así los visitantes públicos no gastan invocaciones de la Cloud
Function.

## Rutas reales

| Ruta | Componente | Guard |
|---|---|---|
| `/crear-solicitud` | `SeleccionSucursal` | **pública** |
| `/crear-solicitud/:sucursal` | `CrearSolicitud` | **pública** |
| `/menu` | `Menu` | **pública** |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` | **pública** |
| `/` | `Login` | staff (sin guard) |
| `/admin` | `PanelAdmin` | `RequireAuth` + `RequireAdmin` |
| `/productos` | `Productos` | `RequireAuth` + `RequireAdmin` |
| `/clientes` | `Clientes` | `RequireAuth` + `RequireAdmin` |
| `/estadisticas-viejas` | `Estadisticas` | `RequireAuth` + `RequireAdmin` |
| `/pedidos-caja` | `Caja` | `RequireAuth` + `RequireSucursal` |
| `/gestion-cocina` | `Cocina` | `RequireAuth` + `RequireSucursal` |
| `/gestion-atp` | `ATP` | `RequireAuth` + `RequireSucursal` |
| `/jefe-deliverys` | `JefeDeliverys` | `RequireAuth` + `RequireSucursal` |
| `/asistencias` | `Asistencias` | `RequireAuth` + `RequireRole` (encargado) + `RequireSucursal` |
| `/liquidacion` | `LiquidacionAsistencias` | `RequireAuth` + `RequireAdmin` |
| `/historial-pedidos` | `HistorialPedidos` | `RequireAuth` + `RequireSucursal permitirAdmin` |
| `/miPerfil` | `MiPerfil` | `RequireAuth` |

## Guards (`src/Login_Navs/RutasProtegidas.jsx`)

- **`RequireAuth`** — sin `userData` redirige a `/` guardando `location.state.from`. Además
  renderiza el `<Navigation/>`, o sea que el sidebar sale de acá.
- **`RequireSucursal`** — las pantallas operativas leen `sucursales/{id}/...`; sin sucursal
  asignada las queries tiran error. Muestra un cartel en vez de crashear. Con `permitirAdmin`
  deja pasar al admin sin sucursal (para pantallas con selector propio).
- **`RequireAdmin`** — redirige a `/miPerfil` si el rol no es `REACT_APP_admin`.
- **`RequireRole roles={[...]}`** — para pantallas de un rol puntual, como `/asistencias`, que
  solo carga el encargado. Redirige a `/miPerfil` si el rol no está en la lista.

## Roles

Los valores de rol viven en `.env` (`REACT_APP_admin`, `_encargado`, `_cajero`, `_cocina`,
`_delivery`, `_atp`, `_contador`). **Nunca hardcodear el string del rol.**

`ROLES` en `Constantes.jsx` reúne **todo lo que se sabe de cada rol** en un solo objeto: la clave
es el valor crudo (el del `.env`, ilegible) y el valor trae `nombre` —cómo se muestra—,
`rutaInicial` —dónde aterriza al loguearse— y `llevaMoto`. Un rol que no figure cae en `/miPerfil`
y se muestra como `—`.

`MODULOS_POR_ROL` en `Navigation.jsx` decide qué ve cada rol en el sidebar. Es **cosmético**:
la barrera real son los guards.

| Rol | Módulos del sidebar | Aterriza en |
|---|---|---|
| admin | productos, historial, estadisticas, liquidacion, clientes, configuracion | `/productos` |
| encargado | caja, cocina, atp, deliverys, asistencias, historial, pruebas | `/pedidos-caja` |
| cajero | caja, historial | `/pedidos-caja` |
| cocina | cocina | `/gestion-cocina` |
| delivery | deliverys | `/jefe-deliverys` |
| atp | atp | `/gestion-atp` |


## Multi-sucursal

Un solo proyecto Firebase. Las colecciones operativas son **subcolecciones** de
`sucursales/{id}/...`; el catálogo y los datos de empresa son globales. Ver
[[Modelo de datos Firestore]].

**Cómo se scopea:**

- **Staff** → helpers `colSucursal("pedidos")` / `docSucursal("pedidos", id)` de
  `firebaseConfig/firebase.js`. La sucursal la setea **únicamente** `AuthContext` al loguear con
  `setSucursalStaff(data.sucursal)` y se limpia al desloguear. Si no hay sucursal, los helpers
  **tiran error a propósito** en vez de leer un path incorrecto.
- **Web pública** → la sucursal viene en la URL vía `useParams()` y el path se arma explícito:
  `collection(db, "sucursales", sucursal, "pedidos")`. Nunca usa los helpers.

El super-admin no navega las pantallas operativas (no tiene sucursal). Cuando necesita datos de
una sucursal, la pantalla ofrece un selector local — el patrón está en `HistorialPedidos.jsx`.

## Alta y baja de usuarios

El cliente **nunca** crea ni borra cuentas de Auth: lo hace el backend (Cloud Functions con
Admin SDK), que valida contra `ADMIN_ROL` que quien llama sea admin.

- **Alta con acceso**: callable `crearUsuario` → cuenta de Auth + doc `usuarios/{uid}` con
  `activo: true`. Si el `set` de Firestore falla, **borra la cuenta de Auth recién creada**:
  [[Decisiones tecnicas#El alta de empleados compensa en vez de transaccionar]].
- **Alta sin acceso** (`sinAcceso: true`, los repartidores): no se les crea cuenta de Auth. El
  front hace un `addDoc` directo desde `CrearEmpleado.jsx`.
- **Baja**: callable `darDeBajaUsuario` → **borra la cuenta de Auth** y deja el doc con
  `activo: false` + `bajaTimestamp` como registro histórico. No se reactiva: si la persona
  vuelve, se crea de cero. No se puede dar de baja a un admin ni a uno mismo.
- `AuthContext` desloguea a quien tenga `activo: false`, como respaldo mientras siga vigente un
  token ya emitido.

> [!note] El código de `functions/` no está versionado
> Ver [[Decisiones tecnicas#Nada de configuración de infraestructura en el repo]].

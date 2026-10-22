---
tags: [gardenburger, frontend, arquitectura, hub]
aliases: [Arquitectura y rutas, Rutas, Guards, Arquitectura]
actualizado: 2026-10-22
---

# Frontend

↑ [[GardenBurger]]

SPA en **React 19 con Create React App** (no Vite) y React Router 7. Dos mundos en la misma app:
la **gestión interna** del staff, con sesión, y la **web pública**, sin sesión.

| Nota | Para |
|---|---|
| [[Gestion interna]] | Las pantallas del staff y qué ve cada rol; la *Caja* tiene nota propia |
| [[Web publica]] | El pedido web, el seguimiento y `/menu`; el estilo en *Marca web* |
| [[Convenciones y preferencias]] | Cómo se escribe código acá, variables de entorno, comandos y tests |
| [[Mapa de archivos]] | Qué hace cada archivo, sin abrirlo |

## Árbol de providers

**`AuthContext` no envuelve toda la app**: vive solo sobre la rama de rutas del staff. Las páginas
públicas no montan nada de sesión.

```
<App>
 └── <BrowserRouter>
      ├── rutas públicas    ← sin AuthContext ni ningún otro contexto
      └── <Route element={<AuthContextProvider><LayoutStaff/></AuthContextProvider>}>
           └── rutas de staff
```

**Por qué**: abrir `/ver-pedido` en otra pestaña rompía la sesión de la pestaña de la Caja; montar
el provider en una página pública inicializaba estado de sesión que no correspondía.
**Consecuencia**: `useAuth()` solo funciona bajo la rama del staff; un componente público que lo
llame revienta.

El carrito de la web tampoco es un contexto: es un hook (`useCarritoWeb`) de la página del pedido
(hasta el 16-10-2026 había un `CartProvider` sobre toda la app). `LayoutStaff` es el único lugar que
sincroniza la hora con el servidor.

## Rutas

| Ruta | Componente | Guard |
|---|---|---|
| `/crear-solicitud` | `SeleccionSucursal` | **pública** |
| `/crear-solicitud/:sucursal` | `CrearSolicitud` | **pública**; cerrada fuera de horario |
| `/menu` | `Menu` | **pública**; ninguna pantalla la enlaza, a propósito: la URL la comparte la dueña |
| `/ver-pedido/:sucursal/:id` | `PaginaDetalle` | **pública**; el link vence a las 48 h |
| `/` | `Login` | staff, sin guard |
| `/admin` | `PanelAdmin` (`?tab=personal`, `sucursales`, `envios`) | admin |
| `/productos`, `/clientes`, `/metricas`, `/liquidacion`, `/historial-pedidos` | sus pantallas | admin |
| `/estadisticas` · `/estadisticas-viejas` | `EstadisticasGenerales` (Actuales) · `Estadisticas` (Históricas) | admin |
| `/pedidos-caja` | `Caja` | cajero o encargado, con sucursal |
| `/gestion-cocina` | `Cocina` | cocina o encargado, con sucursal |
| `/gestion-atp` | `ATP` | atp o encargado, con sucursal |
| `/jefe-deliverys` | `JefeDeliverys` | jefa de deliverys o encargado, con sucursal |
| `/asistencias` | `Asistencias` | encargado, con sucursal |
| `/miPerfil` | `MiPerfil` | cualquier staff |

## Guards

En `src/Login_Navs/RutasProtegidas.jsx`:

- **`RequireAuth`** — sin sesión, a `/` (guarda `location.state.from`). Además dibuja el menú
  lateral y la frontera de `Suspense` de la página.
- **`RequireAdmin`** — si el rol no es `REACT_APP_admin`, a `/miPerfil`.
- **`RequireRole roles={[...]}`** — cada módulo operativo solo para sus roles; **el encargado entra
  a todos** (15-10-2026). Son los mismos roles que muestra el menú: antes un cajero que escribía
  `/gestion-cocina` en la barra entraba.
- **`RequireSucursal`** — las pantallas operativas leen `sucursales/{id}/…`: sin sucursal asignada
  muestra un cartel en vez de romper.

Son barreras del navegador: la que no se saltea son las reglas de Firestore
(*Reglas de Firestore*). El menú (`MODULOS_POR_ROL`) es todavía más cosmético: ver
[[Gestion interna#Qué ve cada rol]].

## Multi-sucursal en el front

- **Staff** → `colSucursal("pedidos")` / `docSucursal("pedidos", id)` de
  `firebaseConfig/firebase.js`. La sucursal la fija **solo** `AuthContext` al loguear
  (`setSucursalStaff(data.sucursal)`) y se limpia al salir. Sin sucursal, los helpers **tiran error a propósito** en vez de leer un path
  equivocado. El admin, que no tiene sucursal, usa `colDeSucursal` / `docDeSucursal` con la que
  eligió en un selector de la pantalla (el patrón está en `HistorialPedidos`).
- **Web pública** → la sucursal sale de la URL (`useParams()`) y el path se arma explícito:
  `collection(db, "sucursales", sucursal, "pedidos")`. Nunca usa los helpers.

Nunca se arma a mano el path de una colección operativa desde el staff. Al dueño le gustan las rutas
explícitas: rechazó un wrapper que interceptaba `collection`/`doc` con estado global; aceptó estos
helpers porque tienen nombre propio y un solo lugar que los configura.

## Code splitting por ruta

Las **18 pantallas** van por `React.lazy(() => import(...))` en `App.js`; solo `Login` va en el
bundle principal (es la landing del staff). **Por qué**: el bundle único pesaba 3,2 MB, y un
cliente que abría `/menu` en el celular bajaba Caja, Cocina, PanelAdmin y Recharts sin usarlos.

- **Dos fronteras de `Suspense`**: una alrededor de `<Routes>` (públicas y Login) y otra dentro de
  `RequireAuth`, para que el menú quede en pantalla mientras baja el chunk. El fallback es
  `Cargando`.
- `lazy()` necesita un export por defecto; si una pantalla exporta con nombre, se envuelve con
  `.then(m => ({ default: m.Pantalla }))`.
- **Una pantalla nueva se agrega con `lazy`**, no con `import` estático.

## Sin conexión, las acciones avisan antes de escribir

`sinConexion()` (`Utils/avisos.js`) mira `navigator.onLine` al tocar un botón que escribe con
`updateDoc` o `writeBatch` (Cocina, ATP, F1, F2, F3, Deliverys, Historial) y, sin conexión, avisa y
no escribe (14-10-2026). **Por qué**: con la caché persistente esas escrituras **no fallan**: quedan
en cola, el botón se queda en "Cargando…" y el `catch` nunca corre. "Crear Pedido" no lo necesita:
es una transacción, y sin conexión falla y avisa. No detecta un proveedor caído con el wifi andando;
el dueño decidió no cubrirlo con una espera.

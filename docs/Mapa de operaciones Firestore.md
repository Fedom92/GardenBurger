---
tags: [gardenburger, firestore, costos]
---

# Mapa de operaciones Firestore

← [[GardenBurger]] · relacionado: [[Modelo de datos Firestore]], [[Deuda tecnica]]

> [!important] Prioridad de primer orden
> El proyecto vive con un límite de lecturas ajustado. Antes de agregar cualquier consulta,
> preguntarse si el dato ya está en memoria. **Sin auditoría previa, el default es no agregar
> lecturas.**

## Lo que hay que saber del SDK

- **`getDocs()` / `getDoc()` siempre van al servidor** y se facturan. El caché local no los
  evita. Compilan a `firestoreClientGetDocumentViaSnapshotListener`.
- **`getDocsFromCache()` / `getDocFromCache()`** no contactan al servidor: no hay documentos
  servidos que facturar. Existen en el SDK instalado (firebase **9.23.0**, verificado).
- **`onSnapshot`** factura cada documento del set inicial, y después solo los que cambian.
- El cliente usa **`persistentLocalCache` en modo una sola pestaña**. Eso hace que los
  `onSnapshot` persistan su `resumeToken`: al recargar, el servidor manda **solo los cambios** en
  vez de la query entera. **No ayuda a `getDocs`.** Ver
  [[Decisiones tecnicas#Persistencia en IndexedDB, modo una sola pestaña]].
- `deleteField()` dentro de un `batch.set(..., {merge:true})` **no cuesta operación extra**.
- `increment()` es atómico del lado del servidor, pero **no es idempotente**: si la misma
  operación se dispara dos veces, suma dos veces.

## Inventario de lecturas

| Dónde | Qué lee | Cuándo | Volumen | Nota |
|---|---|---|---|---|
| `useTraerDatos` | productos (`visible==true`) + categorías + envíos | **cada montaje de Caja** | N+M+Z | 🔴 **el mayor costo recurrente** |
| `Clientes.jsx` | teléfono exacto, prefijo de nombre o sucursal | **por búsqueda**, no al entrar | con tope | ✅ era la colección entera |
| `AuthContext.fetchUserData` | `usuarios/{uid}` | **1 por login** | 1 | ✅ `login()` y `onAuthStateChanged` comparten la promesa en vuelo |
| `MiPerfil` | — | — | **0** | ✅ consume `useAuth()` |
| `useCliente.buscarClientePorTelefono` | `clientes` con `where telefono` + `limit(1)` | por pedido guardado | 1 | necesaria: evita duplicar el cliente |
| `usePendientes` | 2 listeners con `limit(1)` | permanentes en Caja | 1 c/u | ✅ correcta y barata |
| `PendientesSolicitudes` | listener de `estado==PENDIENTE` | mientras el modal está abierto | pendientes | se solapa con `usePendientes`, pero son queries distintas |
| `PendientesMP` | listener de `estado==PENDIENTEMP` | ídem | pendientes | ídem |
| `BuscarPedido` | pedidos de la jornada | por búsqueda | jornada | ✅ se unificó con EliminarTickets y ahorró la mitad |
| `Caja.verResumen` (F4) | `resumenDiario/{jornada}` | al abrir el modal | 1 | ✅ con guard: mantener F4 no repite la lectura |
| `PedidosEspera` / `PedidosCocinando` / `ATP` / `JefeDeliverys` | listeners por `estado` | mientras la pantalla está abierta | los del estado | ✅ real-time justificado |
| `JefeDeliverys` | repartidores activos de la sucursal, desde `usuarios` | al montar | pocos | ✅ one-time |
| `HistorialPedidos` | pedidos por rango de fechas, **sin filtro de estado** | por búsqueda | según rango | ⚠ sin `limit`: un rango largo lee miles |
| `Productos` / `PanelAdmin` / `Categorias` / `Envios` | su colección entera | al montar | acotado | pantallas de admin, poco frecuentes |
| `sucursales.js` | `sucursales` | selector público y de admin | pocas | ✅ |
| `PaginaDetalle` | 1 pedido | por visita pública | 1 | ✅ |
| `Asistencias` | el doc de la jornada | al entrar | **1** | ✅ el mapa `registros` trae a todos |
| `ModalCargarJornada` | empleados de la sucursal | **solo al abrir el formulario** | N | ✅ editar un renglón cuesta 0 |
| `LiquidacionAsistencias` | rango de jornadas | por búsqueda | D días | ✅ un mes ≈ 30, y **no lee `usuarios`** |
| `Crearsolicitud` | 1 sucursal, para validarla | al confirmar el pedido | 1 | ✅ evita subcolecciones huérfanas |

**No hay ningún patrón N+1.** No existe ningún bucle que haga `getDoc` por cada ítem de una
lista. Verificado sobre los 42 puntos de acceso.

## Lo que ya está optimizado (no romper)

- **`menu.json` en Storage** — `Menu` y `CrearSolicitud` consumen un JSON estático publicado con
  el botón "Publicar Menú" de Productos: **cero lecturas de Firestore** para el público, que es
  el tráfico más volumen. `fetchMenuPublico()` cachea la promesa en módulo, así que productos y
  categorías comparten una sola descarga. Hay fallback a Firestore si el JSON no está.
- **`usePendientes` con `limit(1)`** — solo necesita saber *si hay* pendientes para prender el
  botón, no traerlos. Los trae el modal cuando se abre.
- **`writeBatch` en Caja** — pedido y resumen viajan juntos: atómico y una sola ida al servidor.
- **`liberarSolicitud`** — el `getDoc` previo es deliberado: sin él, un cajero le pisaría la
  asignación a otro.
- **Refs de queries en `useRef`** — evitan recrear la referencia en cada render y que el
  `useEffect` se redispare.

## Escrituras que mueven plata

Cinco puntos tocan `resumenDiario`. Como usan `increment()`, **cada ejecución de más corrompe el
arqueo del día** y no queda rastro:

| Operación | Efecto |
|---|---|
| `Caja.guardarBD` | suma efectivo/mp/pedidos/combos |
| `PendientesMP.rechazarPedido` | resta todo |
| `BuscarPedido.eliminarPedido` | resta todo |
| `JefeDeliverys.marcarEstado` (VOLVIO) | suma métricas del repartidor |
| `getResumenOperation({descontar:true})` | el helper que invierte los signos |

**Regla**: nunca `updateDoc` sobre `resumenDiario` — falla con `not-found` si el documento de la
jornada todavía no existe. Siempre `set(ref, stats, {merge:true})` dentro del mismo `writeBatch`
que el pedido, para que los dos se muevan juntos o no se muevan.

Fuera del arqueo, la escritura más eficiente del sistema es la de **asistencias**: una jornada
entera, con todos los empleados, es **una sola escritura**, porque van en un mapa dentro de un
único documento.

Las cuatro operaciones tienen guard (`useAccionUnica`). Lo que queda abierto es la carrera
entre **dos cajeros distintos**: [[Deuda tecnica#Concurrencia entre dos cajeros sobre el arqueo]].

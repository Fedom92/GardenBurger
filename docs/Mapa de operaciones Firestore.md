---
tags: [gardenburger, firestore, costos]
aliases: [Costos, Lecturas y escrituras]
actualizado: 2026-09-23
---

# Mapa de operaciones Firestore

← [[GardenBurger]] · relacionado: [[Modelo de datos Firestore]], [[Deuda tecnica]] · vocabulario en [[Glosario]]

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
- Corolario: para algo que se relee seguido, **un listener sale más barato que un `getDocs`**. Es
  lo que se hizo con el catálogo de Caja:
  [[Decisiones tecnicas#El catálogo de Caja va por listener]].
- `deleteField()` dentro de un `batch.set(..., {merge:true})` **no cuesta operación extra**.
- `increment()` es atómico del lado del servidor, pero **no es idempotente**: si la misma
  operación se dispara dos veces, suma dos veces.

## Inventario de lecturas

| Dónde | Qué lee | Cuándo | Volumen | Nota |
|---|---|---|---|---|
| `useTraerDatos` | 3 listeners: productos (`visible==true`), categorías y envíos | mientras Caja está abierta | solo los cambios al re-montar | ✅ era el mayor costo recurrente; ahora resume por token y queda en vivo |
| `Clientes.jsx` | teléfono exacto, prefijo de nombre o sucursal | **por búsqueda**, no al entrar | con tope | ✅ era la colección entera |
| `AuthContext.fetchUserData` | `usuarios/{uid}` | **1 por login** | 1 | ✅ `login()` y `onAuthStateChanged` comparten la promesa en vuelo |
| `MiPerfil` | — | — | **0** | ✅ consume `useAuth()` |
| `useCliente.registrarCliente` | `clientes` con `where telefono` + `limit(1)`, y después **1 escritura siempre** (crea o actualiza la ficha + campos CRM) | por pedido guardado | 1 read + 1 write | antes la escritura era solo para clientes nuevos |
| `usePendientes` | 2 listeners con `limit(1)` | permanentes en Caja | 1 c/u | ✅ correcta y barata |
| `PendientesSolicitudes` | listener de `estado==PENDIENTE` | mientras el modal está abierto | pendientes | se solapa con `usePendientes`, pero son queries distintas |
| `PendientesMP` | listener de `estado==PENDIENTEMP` | ídem | pendientes | ídem |
| `BuscarPedido` | por **código**: consulta directa. Por teléfono o dirección: la jornada, **una vez por apertura del modal** | al abrir F3, no en cada búsqueda | 1 doc, o la jornada | ✅ era el mayor costo recurrente: releía la jornada entera en cada búsqueda |
| `Caja.verResumen` (F4) | `resumenDiario/{jornada}` | al abrir el modal | 1 | ✅ con guard: mantener F4 no repite la lectura |
| `PedidosEspera` / `PedidosCocinando` / `ATP` / `JefeDeliverys` | listeners por `estado` | mientras la pantalla está abierta | los del estado | ✅ real-time justificado |
| `JefeDeliverys` | repartidores activos de la sucursal, desde `usuarios` | al montar | pocos | ✅ one-time |
| `HistorialPedidos` | pedidos por rango de fechas, **sin filtro de estado** | por búsqueda | según rango | ⚠ sin `limit`: un rango largo lee miles |
| `Productos` / `PanelAdmin` / `Envios` | su colección entera | al montar | acotado | pantallas de admin, poco frecuentes |
| `Parametros/Categorias` (modal) | — | — | **0** | ✅ recibe las categorías de `Productos` por props; antes releía la colección al montar |
| `sucursales.js` | `sucursales` | selector público y de admin | pocas | ✅ promesa cacheada: 1 vez por sesión |
| `PaginaDetalle` | 1 pedido | por visita pública | 1 | ✅ |
| `Asistencias` | el doc de la jornada | al entrar | **1** | ✅ el mapa `registros` trae a todos |
| `ModalCargarJornada` | empleados de la sucursal | **solo al abrir el formulario** | N | ✅ editar un renglón cuesta 0 |
| `LiquidacionAsistencias` | rango de jornadas | por búsqueda | D días | ✅ un mes ≈ 30, y **no lee `usuarios`** |
| `Crearsolicitud` | 1 sucursal, para validarla | al confirmar el pedido | 1 | ✅ evita subcolecciones huérfanas |
| `Estadisticas` | — | — | **0** | ✅ lee dos TSV de Storage (`getBytes`), no Firestore. 10,5 MB la primera vez; después el navegador revalida con `If-None-Match` y Storage responde **304 con cuerpo vacío** |

**No hay ningún patrón N+1.** No existe ningún bucle que haga `getDoc` por cada ítem de una
lista. Verificado sobre los 42 puntos de acceso.

## Lo que ya está optimizado (no romper)

- **`menu.json` en Storage** — `Menu` y `CrearSolicitud` consumen un JSON estático publicado con
  el botón "Publicar Menú" de Productos: **cero lecturas de Firestore** para el público, que es
  el tráfico más volumen. `fetchMenuPublico()` cachea la promesa en módulo, así que productos y
  categorías comparten una sola descarga. Hay fallback a Firestore si el JSON no está.
- **`usePendientes` con `limit(1)`** — solo necesita saber *si hay* pendientes para prender el
  botón, no traerlos. Los trae el modal cuando se abre.
- **`runTransaction` en Caja** — contador, pedido y resumen viajan juntos: atómico, y el número de
  ticket no se quema si el guardado falla. Los otros movimientos del arqueo van en `writeBatch`.
- **Refs de queries en `useRef`** — evitan recrear la referencia en cada render y que el
  `useEffect` se redispare.

- **`liberarSolicitud` sin lectura previa** — la regla `asignacionValida()` ya garantiza que un
  cajero no pise la asignación de otro, así que se intenta el `updateDoc` y se trata
  `permission-denied` como "no era mía". Antes hacía un `getDoc` por cada Cancelar.
- **`fetchSucursales` cachea la promesa** — PanelAdmin la disparaba dos veces al montar y cada
  pantalla con selector pagaba la suya. El ABM de Sucursales la invalida al guardar.
- **`menu.json` incluye las sucursales** — el pie del menú público muestra las direcciones sin
  pagar una lectura por visita. El costo es de 2-3 documentos, y solo cuando el admin publica.

## Escrituras que mueven plata

Cinco puntos tocan `resumenDiario`. Como usan `increment()`, **cada ejecución de más corrompe el
arqueo del día** y no queda rastro:

| Operación | Efecto |
|---|---|
| `Caja.guardarBD` | suma efectivo/mp/pedidos/combos. Va en la **misma transacción** que el contador y el pedido |
| `PendientesMP.rechazarPedido` | resta todo |
| `BuscarPedido.eliminarPedido` | resta todo, **solo si el pedido tiene `cajeroID`** (`BuscarPedido.jsx:86`) |
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

> [!success] Tres caminos que corrompían el arqueo, cerrados el 14-09-2026
> La [[Auditoria 2026-09|auditoría de septiembre]] encontró que la carrera entre cajeros no era el
> único agujero. Los tres, y cómo se cerró cada uno:
>
> - **Eliminar un pedido `CANCELADO`** que ya descontó al rechazarse por MP → `BuscarPedido` ya no
>   ofrece Eliminar en `CANCELADO`.
> - **Editar el carrito después de fijar el pago dividido** → `errorPagoDividido()` corre también
>   en `validarPedido`, al guardar.
> - **Dos cajeros tomando la misma solicitud web** → la regla `asignacionValida()` rechaza la
>   segunda toma, sin lecturas.
>
> Ninguno necesitó una operación nueva. Ver [[Auditoria 2026-09#9. Integridad del dinero]].

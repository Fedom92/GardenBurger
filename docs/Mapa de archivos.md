---
tags: [gardenburger, referencia]
---

# Mapa de archivos

← [[GardenBurger]]

Qué hace cada archivo, para no tener que abrirlo. Los tamaños son orientativos (ago-2026).

## Raíz de `src/`

| Archivo | Qué hace |
|---|---|
| `App.js` | Tabla de rutas. Públicas afuera de `AuthContext`, staff adentro. Ver [[Arquitectura y rutas]] |
| `index.js` | Entry point. `root.render(<App/>)` + `moment.tz.setDefault()`. **Ya no monta providers** |
| `firebaseConfig/firebase.js` | Init de Firebase, App Check, `db`/`auth`/`storage`, `colSucursal`/`docSucursal`, `setSucursalStaff`, `getNextSequence` |

## Contextos

| Archivo | Qué hace |
|---|---|
| `context/AuthContext.js` | `useAuth() → {userData, login, logout}`. Lee `usuarios/{uid}`, desloguea inactivos, setea la sucursal del staff |
| `context/CartContext.jsx` | (608 líneas, de otro dev) Todo el estado del menú público: carrito en localStorage, combos, y el flujo de modales hamburguesa → extras |

## `Login_Navs/`

| Archivo | Qué hace |
|---|---|
| `Login.jsx` | Pantalla de login + modal de reseteo de clave |
| `Navigation.jsx` | Sidebar. `MODULOS_POR_ROL` decide qué ve cada rol |
| `Nav.jsx` | Ítem individual del sidebar |
| `RutasProtegidas.jsx` | `RequireAuth`, `RequireSucursal`, `RequireAdmin`, `LayoutStaff` |

## `Utils/`

| Archivo | Qué hace |
|---|---|
| `Constantes.jsx` | `ESTADOS`, `ENVIOS_LOCALES`, `CATEGORIAS_COMBOS`, `CATEGORIAS_HAMBURGUESA`, `CANTIDAD_CARNES`, `FLUJO_PUB_ESTADOS`, `TIEMPO_MIN_PEDIDOESP`, `getCurrentStepIndex()` y **`ROLES`** (nombre + ruta inicial + `llevaMoto` de cada rol, en un solo objeto) |
| `fechaComercial.js` | Jornada comercial y hora del servidor. Ver [[Reglas de negocio#Jornada comercial]] |
| `menuPublico.js` | `publicarMenu()` (genera y sube `menu.json`) y `fetchMenuPublico()` (lo consume, con promesa cacheada) |
| `sucursales.js` | `fetchSucursales()` — lista ordenada de la colección global |
| `TablaGenerica.jsx` | Tabla reutilizable sobre `@tanstack/react-table`: búsqueda, filtros por columna, orden y paginación. Exporta `quitarAcentos` |
| `formato.js` | `fmtPesos` y `fmtPesosRedondeado`. **Único lugar** donde se formatean montos |
| `useAccionUnica.js` | Guard contra doble ejecución de todo lo que escribe plata. Ver [[Convenciones y preferencias#Acciones que escriben plata]] |
| `InsertarRegistros.jsx` | 🧪 **herramienta de dev**: botón que inserta 3 pedidos de Caja + 3 solicitudes WEB de prueba. Suma al arqueo igual que el flujo real. Marca todo con `esPrueba: true`. No montar en producción |

## `components/POS/` — la Caja

| Archivo | Qué hace |
|---|---|
| `Caja.jsx` | Pantalla principal del POS, redisenada con el artboard 2a de Claude Design. Topbar oscura con F1-F4, panel de productos con fotos, ticket movible y redimensionable. Atajos **F1**-**F4**, **/** y **Esc** |
| `Caja.css` | Estilos del rediseno, scopeados bajo `#caja`. Tokens, layout y componentes propios (`.pos-*`). Solo lo importa Caja.jsx |
| `pos_hooks/useTraerDatos.js` | Trae productos + categorías + envíos al montar. 🔴 El mayor costo del sistema |
| `pos_hooks/useCarrito.js` | Carrito de la Caja y `getResumen` (subtotal, recargo, total, split MP/efectivo) |
| `pos_hooks/useCliente.js` | Busca cliente por teléfono y lo da de alta si no existe |
| `pos_hooks/usePendientes.js` | Dos listeners `limit(1)`: prenden los botones F1 y F2 |
| `pos_hooks/useHorarioEspecial.js` | Estado del selector de hora especial |
| `pos_hooks/useRevisarSolicitud.js` | Toma una solicitud web y llena el formulario. Exporta `liberarSolicitud` |
| `pos_hooks/useTicketLayout.js` | Lado y ancho del ticket: arrastre de la manija para cambiarlo de lado y divisor redimensionable |
| `pos_hooks/useResumenDiario.js` | `getResumenOperation()` — arma ref + `increment()` del arqueo. Incluye `contarCombos` |
| `pos_hooks/validarPedido.js` | Validaciones previas al guardado, con Swal |
| `pos_modales/BuscarPedido.jsx` | **F3** — busca en la jornada por teléfono/código/dirección y permite **eliminar** el ticket |
| `pos_modales/ResumenDiario.jsx` | **F4** — muestra el arqueo del día (presentacional, los datos los trae Caja) |
| `pos_modales/PagoDividido.jsx` | Reparto efectivo / MP |
| `pos_modales/Alertas/PendientesSolicitudes.jsx` | **F1** — solicitudes web pendientes, con el modelo de asignación |
| `pos_modales/Alertas/PendientesMP.jsx` | **F2** — pedidos esperando confirmación de transferencia |

## `components/Cocina/`

| Archivo | Qué hace |
|---|---|
| `Cocina.jsx` | Contenedor con dos solapas y sus contadores |
| `PedidosEspera.jsx` | Estado `CONFIRMADO`. Selección múltiple, contador de carnes, aviso de horarios especiales |
| `PedidosCocinando.jsx` | Estado `COCINA`. Rutea a `ATP` o `DELIVERY` al terminar |
| `ModalHorariosEspeciales.jsx` | Aviso con checkboxes para los pedidos adelantados |
| `VerPedidoModal.jsx` | Card expandida: agrupa cada principal con sus extras en dos columnas |
| `TicketImpresion.jsx` + `.css` | Ticket del cliente. Abre ventana nueva e imprime |
| `cocina_hooks/useItemsCocina.js` | `getItemsCocina()` — saca las bebidas de la vista del cocinero |

## `components/Delivery/`

| Archivo | Qué hace |
|---|---|
| `JefeDeliverys.jsx` | Estado `DELIVERY`. Asigna repartidor, marca salida y regreso, escribe métricas. Los repartidores salen de `usuarios` (rol delivery), no de una colección propia |
| `delivery_modales/ModalPedidoDelivery.jsx` | Gestión de un pedido: asignar, "Marcar Salida", "Confirmar Entrega" |
| `delivery_modales/ModalMetricasDelivery.jsx` | Tabla por repartidor con la diferencia entre total y cobrado |

## `components/Solicitudes/` — la web pública

| Archivo | Qué hace |
|---|---|
| `SeleccionSucursal.jsx` | El cliente elige sucursal |
| `Crearsolicitud.jsx` | (410 líneas) Menú por acordeones + formulario + creación de la solicitud |
| `Card.jsx` | Tarjeta de producto; decide qué modal abrir |
| `ModalHamburguesa.jsx` / `ModalExtras.jsx` / `ModalExtrasGenericos.jsx` | Flujo de variantes y extras |
| `PaginaDetalle.jsx` | `/ver-pedido` — barra de progreso del pedido para el cliente |
| `Menu.jsx` | Carta pública, exportable a PDF |
| `Footer.jsx` | Pie con contacto |

## Resto

| Archivo | Qué hace |
|---|---|
| `ATP/ATP.jsx` | Estado `ATP` — entrega en mostrador |
| `Pedidos/HistorialPedidos.jsx` | Pedidos por rango de fechas, **sin filtro de estado**: también audita cancelados y eliminados. El admin elige sucursal |
| `Pedidos/AuditoriaPedido.jsx` | Traza completa de un pedido, agrupada por etapa |
| `Productos/Productos.jsx` | ABM de productos + botón **"Publicar Menú"** |
| `Productos/Parametros/Categorias.jsx` | ABM de categorías |
| `Clientes/Clientes.jsx` (+ Crear/Edit) | **Buscador**, no listado: no lee nada al entrar. Teléfono exacto, prefijo de nombre o sucursal, siempre con tope |
| `Admin/PanelAdmin.jsx` | Gestión de **todos los empleados**, repartidores incluidos: rol, sucursal, DNI, domicilio, valor hora, moto. Alta y baja ramificadas por `sinAcceso`. Usa `TablaGenerica` con las filas enriquecidas (`rolNombre`, `sucursalNombre`) para que los filtros muestren nombres y no el valor crudo del rol |
| `Admin/CrearEmpleado.jsx` / `EditClave.jsx` / `MiPerfil.jsx` | Alta de empleados (con o sin acceso), cambio de clave, perfil propio |
| `Admin/Parametros/Sucursales.jsx` / `Envios.jsx` | ABM de sucursales y zonas de envío |
| `Asistencias/Asistencias.jsx` | Pantalla del encargado: solo la jornada actual. Ver [[Asistencias y liquidacion]] |
| `Asistencias/LiquidacionAsistencias.jsx` | Panel del admin: liquida un período y corrige jornadas sueltas |
| `Asistencias/ModalCargarJornada.jsx` | La grilla de carga, compartida por las dos pantallas. `modoAdmin` habilita editar el valor hora y ver la auditoría |
| `Asistencias/asistencias_hooks/useAsistencias.js` | `calcularHoras`, `armarRegistro`, `agregarLiquidacion` — lógica pura |
| `Estadisticas/Historico/Estadisticas.jsx` | (753 líneas) Dashboard del **sistema viejo**: lee TSV exportados a mano, no Firestore |
| `Estadisticas/Historico/useGoogleSheets.js` | Parseo de los TSV |

> [!warning] Estadísticas lee TSV, no Firestore
> `public/CSV/ventas.tsv` y `pagos.tsv` se exportan **a mano**. Un export incompleto de Ventas
> falsea los combos y el stock sin dar ningún error.

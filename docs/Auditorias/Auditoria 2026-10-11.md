---
tags: [gardenburger, auditoria]
aliases: [Auditoria octubre 11, Cuarta auditoria]
fecha: 2026-10-11
---

# Auditoría integral — 11 de octubre 2026 · plan de corrección

↑ [[Auditorias]] · anterior: *Auditoria 2026-09-26*

> [!success] Estado al 15-10-2026: aplicada entera
> Auditoría hecha el 11-10, revisada con el dueño del 12 al 14-10. **Etapa 1 aplicada el 14-10**
> (puntos 1-9b) y **Etapas 2 y 3 el 15-10** (10, 12-17 y 19-23; el 18 ya estaba). Cambios sobre lo
> escrito abajo: el vencimiento de la toma es solo un temporizador en la Caja (sin lectura y sin
> tocar `asignacionValida()`); `rechazarSolicitud` no cambia; el punto 11 se descartó. La regla de
> anulados está desplegada. Cómo se cerró cada punto: ver
> [[Auditoria 2026-10-11#Cómo se cerró (15-10-2026)]].

## Pendiente de confirmar (antes de empezar)

1. **M1 · Pedido duplicado por reintento.** ✅ Decidido (13-10): id fijo **siempre** (generado al
   tocar "Crear Pedido", guardado en un `useRef`, reusado en los reintentos, borrado en
   `limpiar()`), y la lectura del pedido **solo en el reintento después de un error**: si ya existe,
   "ya se guardó"; si no, se guarda normal. Costo: 0 en el caso normal, 1 por reintento.
2. **M11 · Sin conexión.** ✅ Decidido (13-10): chequeo de `navigator.onLine` al tocar el botón, con
   cartel inmediato si no hay conexión. **Sin** el complemento de los ~10 s (el dueño lo descartó:
   no espera que el proveedor se caiga con el wifi andando).

### M1 · Qué pasa y qué recomiendo

El id del pedido se genera en cada click de "Crear Pedido" (`doc(pedidosRef)` en `Caja.guardarBD`),
no al armar el ticket. Si se corta internet justo después de que Firebase guardó el pedido, la
respuesta no llega, la Caja muestra error, el cajero toca de nuevo y sale **otro** pedido con otro
número. Las solicitudes web no tienen el problema: siempre escriben sobre su propio id.

**Recomendación:** generar el id cuando se empieza a armar el ticket (se resetea en `limpiar()`), y
dentro de la transacción leer ese pedido: si ya existe y es del mismo cajero, ya se guardó → éxito,
sin escribir nada. Costo: **+1 lectura por pedido** (~60-100 por noche y sucursal). En solicitudes
web es la misma lectura del punto 2 del plan, no suma.

**Variante propuesta el 13-10 (casi 0 lecturas):** leer el pedido **solo en un reintento**. El
primer intento guarda como hoy, sin lectura extra; si falla, el `useRef` marca que hubo un error con
ese id, y solo el intento siguiente agrega la lectura para saber si ya se había guardado. Costo: 1
lectura por reintento tras un error, es decir, casi nunca.

Alternativa sin lecturas: una regla que impida cambiar el `codigo` de un pedido ya numerado. El
reintento sería rechazado, pero la Caja no podría distinguir "ya estaba guardado" de otro error.

### M11 · Por qué el try/catch no alcanza, y la propuesta

- **"Crear Pedido"** es una transacción: sin conexión **falla** y el `catch` ya muestra error. Cubierto.
- **El resto de los botones** (Cocinados TODOS, Empezar a cocinar, Entregar en ATP, Aprobar/Rechazar
  MP, asignar/salida/volvió en Deliverys, eliminar) usan `updateDoc` / `batch`. Con la caché
  persistente, sin conexión **no fallan**: la escritura queda en cola, el botón queda en
  "Cargando…" sin fin, y se manda sola cuando vuelve internet (aunque se recargue la página). El
  `catch` nunca corre.

**Propuesta:** un hook `useConexion()` con los eventos `online`/`offline` del navegador. Esos botones
miran el estado antes de escribir: sin conexión, cartel "Sin conexión: revisá internet e intentá de
nuevo" y no se escribe nada. 0 lecturas. Límite: el navegador detecta la caída del wifi/cable; si
el router tiene señal pero el proveedor no da internet, puede no enterarse.

Chequear es instantáneo: `navigator.onLine` es un valor que el navegador ya tiene en memoria, sin
red. Para el caso del proveedor caído, complemento opcional: si la escritura no se confirma en ~10 s,
cartel "No se pudo confirmar: revisá internet" y el botón se libera (la escritura sigue en cola y
se aplica sola al volver la conexión).

Cómo se genera el id fijo de M1: `doc(colSucursal("pedidos"))` crea el id en la PC, sin red y sin
lecturas. Se guarda en un `useRef` al primer intento de guardar y se borra en `limpiar()`; un
reintento después de un error reusa el mismo id.

### Revisar el 14-10

- ✅ **Nombre:** la colección **sigue siendo `resumenDiario`**, y el código unifica en ese mismo
  término (decidido 13-10): `VERSION_RESUMEN_DIARIO`, `invalidarResumenDiarioDePedido`,
  `resumenDiarioVigente`, etc. Desaparece "foto" del código y del vault.
- ✅ **M6:** "Confirmar entrega" y "Volvió sin entregar" exigen un repartidor asignado (punto 22).
- ✅ **Entrega sin repartidor** (punto 23): solo la jefa de deliverys.
- ✅ **M5:** hay un solo encargado por sucursal, siempre. Queda descartado.

## Plan acordado

Las reglas (`firestore.rules`) se despliegan **solo cuando el dueño lo pida**. En cada etapa: tests
con Jest de lo tocado y vault actualizado.

### Etapa 1 · Solicitudes y estados

| # | Qué | Archivos | Lecturas |
|---|---|---|---|
| 1 | La ✕ de la Caja vaciaba el carrito de una solicitud web: asignar `carritoItemId` a cada línea al cargarla | `useRevisarSolicitud.js` | 0 |
| 2 | Guardar y rechazar una solicitud leen el pedido en la misma transacción: sigue solo si está PENDIENTE, es del cajero y la toma no venció (15 min). Si no: cartel ("se liberó: tomala de nuevo desde F1" / "ya la cargó otro cajero" / "fue rechazada") y se limpia el ticket | `Caja.jsx`, `PendientesSolicitudes.jsx` | +1 por solicitud |
| 3 | Toma vencida: a los 15 minutos de "Revisar", la Caja limpia sola el ticket con un cartel. En la regla `asignacionValida()`, el dueño de una toma vencida ya no puede escribir; una toma vencida solo se puede volver a tomar | `Caja.jsx`, `firestore.rules` | 0 |
| 4 | Regla: solo el admin cambia el `estado` de un pedido ELIMINADO o CANCELADO | `firestore.rules` | 0 |
| 5 | Listas actualizadas: "Rechazar" en F2, "Cocinados TODOS" y el modal de horarios especiales usan la lista vigente después de confirmar (hoy usan la del momento del click: un pedido anulado mientras el cartel preguntaba se resucitaba, o con la regla nueva rechazaría el lote entero). Avisos claros si la regla rechaza | `PendientesMP.jsx`, `PedidosCocinando.jsx`, `PedidosEspera.jsx`, `ATP.jsx` | 0 |
| 6 | Restaurar pedido: al eliminar desde el **Historial** (admin) se guarda `estadoAnterior`; esos pedidos muestran "Restaurar pedido" (ícono deshacer), que lo devuelve a ese estado, deja quién/cuándo y recalcula el resumen guardado de esa noche. Los eliminados desde F3 no se restauran (se rehace el pedido) | `HistorialPedidos.jsx` | 0 |
| 7 | Horario especial: solo horas posteriores a la actual, entre 20:00 y 23:45; pasadas las 23:45 el botón ⏱ desaparece hasta la noche siguiente. La fecha se arma sobre la noche en curso | `Caja.jsx`, `useHorarioEspecial.js` | 0 |
| 8 | Nombre obligatorio siempre; dirección y entre calles en delivery (hoy los `required` no hacen nada: la Caja no tiene `<form>`) | `validarPedido.js` | 0 |
| 9 | M1: id fijo por ticket + lectura solo al reintentar tras un error (ver arriba) | `Caja.jsx` | 0 normal, 1 por reintento |
| 9b | M11: chequeo de `navigator.onLine` al tocar los botones que escriben con `updateDoc`/`batch`; sin conexión, cartel inmediato y no se escribe | `Utils/` (hook nuevo), Cocina, ATP, F2, F3, Deliverys, Historial | 0 |

### Etapa 2 · Números

| # | Qué | Lecturas |
|---|---|---|
| 10 | Solo **ENTREGADOS** suman, en F4, Métricas y Estadísticas (es la misma cuenta). El F4 muestra aparte "cobrados todavía sin entregar: N pedidos, $X". "Entregar" en ATP recalcula el resumen guardado si la noche ya cerró. Se sube la versión del resumen guardado | 0 |
| 11 | La Liquidación de asistencias muestra solo noches cerradas; la de hoy se ve en el F4 | 0 |
| 12 | Cambio de estado del pedido + borrado de su resumen guardado en una sola escritura (`writeBatch`) al anular, rechazar MP y cerrar viaje | 0 |
| 13 | Historial y Liquidación descartan respuestas viejas al cambiar de sucursal (hoy se pueden ver sueldos de Luro con Davinci seleccionada) | 0 |
| 14 | Estadísticas Generales: "N noches" duplicado con "Todas"; bebidas solo con `BEBIDAS` | 0 |

### Etapa 3 · Accesos y limpieza

| # | Qué | Lecturas |
|---|---|---|
| 15 | Cada módulo y URL solo para su rol (`RequireRole`); el encargado entra a todos | 0 |
| 16 | Alta de empleados: aceptar cualquier correo válido (`.es`, `.net`…) | 0 |
| 17 | Renombrar "foto" → **resumenDiario** (el mismo nombre que la colección, que no cambia) en todo: `VERSION_FOTO`, `invalidarFotoDePedido`, `invalidarFoto`, `refFoto(s)`, `fotoVigente`, `armarFoto`, comentarios, vault y glosario. No se tocan las fotos de producto (son imágenes) ni las auditorías viejas | 0 |
| 18 | ✅ (14-10) Eliminar `productoAsociado` (`CartContext`); en el vault, `combo` → `grupo` (`grupo` se queda: la web lo usa para armar el carrito) | 0 |
| 19 | Una sola función para agrupar extras (hoy en `Caja.agruparCarrito` y `VerPedidoModal`) | 0 |
| 20 | Menores: avisos donde un error hoy no se ve (repartidores en JefeDeliverys, sucursales en Liquidación, `invalidarFoto`); "%" → "Dividido" y montos con `fmtPesos` (F2, F3, Historial); paginador de `TablaGenerica` que queda en página vacía; `onClose` de F1/F2 con `useCallback`; código sin uso (`updateProfile`/`updateEmail`, `src/logo.svg`, `permitirAdmin`); `signOut` si el login falla por perfil inexistente | 0 |

| 21 | **Imprimir ticket de los pedidos que saltean la cocina** (pedido del dueño, 13-10): los que no tienen nada que cocinar (hoy, solo `BEBIDAS`) van directo a ATP/Delivery y salen sin ticket, porque el ticket solo se imprime en Cocina. Botón "Imprimir" en ATP para esos pedidos (`getItemsCocina(carrito).length === 0`), reusando `TicketImpresion`. Solo en ATP: no hay deliverys de solo bebidas (dueño, 13-10). Cierra el punto "Ticket impreso" de *Deuda tecnica* | 0 |

| 22 | "Confirmar entrega" y "Volvió sin entregar" exigen repartidor asignado: sin eso el viaje no se le paga a nadie ni queda quién lo hizo. Reasignar con el viaje en curso sigue permitido | 0 |
| 23 | **Entrega sin repartidor:** botón "Entregado sin repartidor" en el modal de Deliverys, para un delivery que no salió (el cliente lo vino a buscar, lo llevó alguien del local). Pasa a ENTREGADO sin viaje: no cuenta en la liquidación de repartidores, sí en el arqueo. Con confirmación y quién/cuándo. **Solo la jefa de deliverys** (decidido 13-10): el encargado entra al módulo pero no ve el botón | 0 |

### Al final

- ✅ Pasar al vault las decisiones (abajo) y la deuda técnica: *Deuda tecnica › Cerrado por decisión, no por código*.
- ✅ Completar esta nota con lo hecho (abajo), y enlazarla desde *GardenBurger* y *Deuda tecnica*.

## Cómo se cerró (15-10-2026)

| # | Cómo |
|---|---|
| 10 | `entraAlArqueo` pide `ENTREGADO`. El F4 muestra aparte "Cobrados todavía sin entregar" (`cobradosSinEntregar`), y el aviso de viajes sin entregar ya no dice que suman. "Entregar" en ATP escribe con `actualizarPedidoYResumen` (ver 12). `VERSION_RESUMEN_DIARIO` = 2: cada noche guardada se recalcula **una vez** al mirarla (~60-100 lecturas por noche y sucursal) |
| 12 | Una sola función, **`actualizarPedidoYResumen(ref, pedido, cambios, sucursal)`**: `writeBatch` con el cambio del pedido y, si su noche ya cerró, el borrado del resumen. La usan ATP, Deliverys (confirmar, volvió sin entregar, entregado sin repartidor), F2 (rechazar), F3 (eliminar) y el Historial (eliminar y restaurar). `invalidarFoto` / `invalidarFotoDePedido` se borraron |
| 13 | Historial y Liquidación: un `vigente` en el efecto descarta la respuesta de la consulta anterior |
| 14 | Las noches se cuentan distintas (`new Set` de jornadas) y bebidas es solo `BEBIDAS` |
| 15 | `RequireRole` en Caja (cajero), Cocina (cocina) y ATP (atp), con el encargado en los tres: los mismos roles del menú |
| 16 | `CrearEmpleado` acepta cualquier correo con forma de correo. La Cloud Function no validaba el dominio |
| 17 | Renombrado en el código, el vault, el glosario y el `CLAUDE.md`: `VERSION_RESUMEN_DIARIO`, `refResumenDiario`, `resumenDiarioVigente`, `armarResumenDiario`. No se tocaron las fotos de producto ni las auditorías viejas |
| 19 | `Utils/agruparExtras.js`, usada por la Caja y `VerPedidoModal` |
| 20 | Avisos visibles al fallar la carga de repartidores (Deliverys) y de sucursales (Liquidación); el de `invalidarFoto` se fue con el batch, que ahora falla junto con la acción. `etiquetaPago` en F2, F3 y el Historial (también el filtro, con la prop nueva `etiquetasFiltros` de `TablaGenerica`) y el total con `fmtPesos`. `TablaGenerica` corre la página a la última que existe si la lista se achica. `onClose` de F1 y F2 con `useCallback` (se re-suscribían en cada render de la Caja). Borrados `src/logo.svg`, `updateProfile`/`updateEmail` y `permitirAdmin`. `login()` cierra la sesión de Auth si el perfil no existe |
| 21 | Botón **Imprimir** en ATP para los pedidos sin ítems de cocina, con `TicketImpresion` |
| 22 | "Confirmar entrega" y "Volvió sin entregar" deshabilitados sin repartidor, con un aviso, y la función lo vuelve a chequear |
| 23 | "Entregado sin repartidor" en el modal de Deliverys, **solo para la jefa**, si el viaje no empezó: `ENTREGADO` + `entregaSinRepartidor*`, y le saca el repartidor si tenía. Relee la lista vigente después del Swal. Su efectivo cae en "Envíos" del F4: ver *Deuda tecnica › Riesgos latentes (no son bugs hoy)* |

**Tests**: tres baterías nuevas —`useResumenDiario` (el arqueo), `calculos` (Estadísticas
Generales) y `agruparExtras`—; con las dos que había, 47 tests en verde. ESLint sin avisos en todo lo
tocado. **Reglas**: ninguno de los puntos 10-23 las toca.

## Deuda técnica a futuro

- **Qué hace el sistema fuera del horario laboral** (pedidos cobrados antes de las 19 o después del
  cierre no entran en ningún arqueo; ¿bloquear la Caja, avisar?). A definir.
- **Cloud Function al cierre (02:05)** que guarde el resumen de cada sucursal, y **bot de Telegram**
  con los números del F4. Requiere decidir cómo compartir el cálculo del arqueo entre la app y la
  función (propuesta: un solo archivo que el deploy de Functions copie).

## Decisiones del dueño (no re-proponer)

- Sin claims de staff/sucursal: el alta pública de Auth está deshabilitada, así que toda sesión es
  de un empleado; el aislamiento por sucursal queda en el front.
- El Histórico de Estadísticas (TSV) no se toca.
- Las categorías siguen relacionadas por nombre.
- La jefa de deliverys puede reasignar repartidores con el viaje en curso.
- Pedidos trabados en COCINA por un cocinero ausente: no se trata.
- Sin servicio único de transiciones, sin inventario de índices en el vault, sin visibilidad de
  productos por sucursal.
- Clientes: el teléfono no pasa a ser el id.
- El carrito sigue guardando la ficha entera del producto.
- Editar un producto no permite precio 0: correcto.
- Asistencias: las horas las carga el encargado, el admin solo `valorHora`; no se protege la carga
  simultánea.
- `darDeBaja`: no necesita cambios (reintentar ya corrige un fallo a mitad de camino).

## Términos

- **Resumen guardado** (antes "foto"): los números ya calculados de una noche cerrada, en un
  documento por noche y sucursal. Métricas y Estadísticas leen eso en vez de todos los pedidos.
- **Versión del resumen guardado** (`VERSION_RESUMEN_DIARIO`, antes `VERSION_FOTO`): número dentro
  de cada resumen; si cambia lo que se calcula, se sube y los viejos se recalculan solos al mirarlos.
- **Actualizar el pedido y su resumen** (`actualizarPedidoYResumen`, antes `invalidarFotoDePedido`
  por separado): si se corrige un pedido de una noche cerrada, se borra el resumen de esa noche en
  la misma escritura, para que se recalcule.

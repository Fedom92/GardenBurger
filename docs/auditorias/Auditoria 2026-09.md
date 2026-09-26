---
tags: [gardenburger, auditoria]
aliases: [Primera auditoria, Auditoria septiembre 9]
fecha: 2026-09-09
---

# Auditoría integral — septiembre 2026

← [[GardenBurger]]

> [!warning] Superada por [[Auditoria 2026-09-15]]
> Sus 11 hallazgos están cerrados, pero la auditoría posterior encontró **dos errores en esta**:
> no vio que la base de clientes está publicada como archivo estático (el P0 del 15-09), y afirmó
> que la convención de `fmtPesos` se cumplía cuando quedan 15 archivos sin migrar. Se conserva
> como registro de lo que se corrigió.

> [!info] Esto es una foto, no un documento vivo
> Refleja el estado del sistema al **09-09-2026**. Las notas del vault sí se mantienen al día; esta
> queda como registro. Cuando un hallazgo se corrige, se marca acá y se saca de [[Deuda tecnica]].
>
> **14-09-2026:** las Tandas 1 y 2 cerraron **los 11 hallazgos** — diez con código, uno (#8) por
> decisión. Cada uno lleva su callout de cierre en la sección 10. Lo que sigue abierto por decisión
> del dueño está en [[Deuda tecnica]].

**Alcance:** 12.750 líneas en 73 archivos de `src/`, `functions/src/index.ts`, `firestore.rules`,
`storage.rules`, `firebase.json`, las 16 dependencias y las 12 notas del vault. Todo lo que sigue
está **verificado contra el código**. La documentación existente se usó como pista, no como verdad:
donde el vault y el código se contradicen, gana el código y se anota en la sección 18.

---

## 1. Resumen ejecutivo

**El sistema es sólido en lo estructural y frágil en los bordes.** El modelo de datos multi-sucursal
es coherente, la jornada comercial está bien resuelta, el control de costos de Firestore es
inusualmente bueno para un proyecto de este tamaño, y las decisiones raras casi siempre tienen un
motivo documentado y correcto.

Los problemas serios están concentrados en tres lugares:

1. **Una regla de seguridad expone los datos personales de todos los clientes web.** Es el único
   hallazgo P0 y se arregla sin costo ni refactor.
2. **Tres caminos distintos pueden corromper el arqueo del día** —doble descuento, subcobro en pago
   dividido y doble suma por toma simultánea de una solicitud— y ninguno deja rastro de que pasó.
   El descuadre se descubre contando plata, no mirando el sistema.
3. **El pipeline de pedidos no valida transiciones.** Cualquier estado puede saltar a cualquier otro
   si alguien tiene la pantalla abierta en el momento equivocado.

Lo que **no** es un problema, y conviene decirlo para que no se re-audite: no hay patrones N+1, no
sobran dependencias, no hay listeners colgados, no encontré código muerto, y los comentarios del
código explican el *por qué* —que es lo caro de reconstruir después— en vez de repetir el *qué*.

**Veredicto.** Como producto en uso real, hoy está en un nivel aceptable con riesgos acotados y
ahora conocidos. Los cinco arreglos P0/P1 son de complejidad baja o trivial, son independientes
entre sí, y lo llevarían a un nivel claramente superior sin tocar la arquitectura.

| Prioridad | Cantidad | Esfuerzo total estimado |
|---|---|---|
| P0 | 1 | minutos |
| P1 | 4 | una tarde |
| P2 | 3 | una tarde |
| P3 | 3 | un día, antes de lanzar el menú público |

---

## 2. El negocio que el sistema modela

Hamburguesería **multi-sucursal** con cuatro canales de entrada y un circuito físico de producción.

**El problema que resuelve:** coordinar, dentro de una misma noche, el cobro en caja, la producción
en cocina, la entrega en mostrador o por delivery, y el arqueo del turno — con varias personas
operando en paralelo sobre los mismos datos, en pantallas distintas.

**La unidad de tiempo del negocio no es el día calendario sino la jornada comercial**, que va de las
19 a las 2 (`REACT_APP_horaAbre` / `REACT_APP_horaCierre`). Un pedido de las 00:30 pertenece a la
noche anterior. Esto atraviesa todo: el arqueo, los buscadores de Caja, el historial y la
liquidación de sueldos. Está centralizado en `Utils/fechaComercial.js` —`getFechaComercial()`,
`getRangoJornada()`, `ahoraServidor()`— y es una de las decisiones mejor resueltas del proyecto.

El cierre a las 2 es **margen**: en la práctica no se trabaja pasada la 1. Eso importa porque
invalida toda una familia de hipótesis sobre bugs de borde nocturno.

**Los cuatro canales:**

| Canal | Cómo entra | Quién lo atiende |
|---|---|---|
| Mostrador | El cajero carga en Caja | Cajero |
| Teléfono | Ídem, con dirección | Cajero |
| Web | El cliente arma el pedido en `/crear-solicitud/:sucursal` | Cajero, desde F2 |
| Mercado Pago | Como web, pero queda `PENDIENTEMP` hasta cotejar | Cajero, desde F2 |

**Responsabilidades que el sistema NO asume**, y que quedan en las personas:

- Verificar que una transferencia de Mercado Pago realmente entró — el cajero lo coteja a mano.
- Controlar que el pedido web coincide con lo que el cliente quiso pedir.
- Publicar el menú después de cambiar precios.
- Cargar las asistencias antes de que cambie la jornada.
- Recordar que un pedido eliminado ya había sido cocinado.

Cada una es un punto donde el sistema depende de que alguien se acuerde. Se analizan en la
sección 15.

---

## 3. Usuarios, roles y permisos

| Rol | Dónde trabaja | Qué puede hacer |
|---|---|---|
| **Admin** | `/admin`, `/productos`, `/clientes`, `/liquidacion`, `/estadisticas-viejas` | Catálogo, empleados, sucursales, zonas de envío, liquidación de sueldos, historial de cualquier sucursal |
| **Encargado** | Caja, Cocina, ATP, Deliverys, Asistencias, Historial | Todo lo operativo de **su** sucursal |
| **Cajero** | Caja, Historial | Cobrar, tomar solicitudes web, buscar y eliminar tickets |
| **Cocina** | Cocina | Mandar a cocinar y marcar cocinado |
| **Delivery** (jefe) | Deliverys | Asignar repartidores, registrar salida y regreso |
| **ATP** | Atención al público | Entregar en mostrador |
| **Cliente** | Web pública, sin sesión | Armar un pedido y seguir su estado |
| **Repartidor** | — | **No entra al sistema.** Existe como documento en `usuarios` con `sinAcceso: true` |

**Autenticación:** Firebase Auth con `browserSessionPersistence` — la sesión es **por pestaña**, lo
que es deliberado y tiene consecuencias documentadas en [[Decisiones tecnicas]] (entre ellas, la
razón por la que la caché de Firestore está en modo *single tab*).

**Autorización, tres capas:**

1. `MODULOS_POR_ROL` en `Navigation.jsx` — **cosmético**: solo decide qué links se ven.
2. Los guards de `RutasProtegidas.jsx` — `RequireAuth`, `RequireAdmin`, `RequireRole`,
   `RequireSucursal`. Barrera real, del lado del cliente.
3. Las reglas de Firestore — **la única barrera que un atacante no puede saltear**.

**Ser admin va en un custom claim del token**, no en una lectura de Firestore: evaluar `esAdmin()`
en las reglas no cuesta nada. Los administradores se crean a mano en la Consola de Firebase y la
app no puede asignar ese rol — `crearUsuario` rechaza explícitamente `ADMIN_ROL`.

> [!warning] La capa 3 es la única que cuenta
> Las capas 1 y 2 viven en el navegador y se saltean con las devtools. Todo lo que importe de verdad
> tiene que estar en las reglas. Hoy `asistencias` **no** lo está: cualquier staff autenticado puede
> leer y escribir los sueldos. Es una decisión explícita —el `firestore.rules` la documenta en un
> comentario— tomada cuando cerrarlo costaba un `get()` facturado. Con los claims ya no cuesta nada,
> así que la decisión merece revisarse (sección 19).

---

## 4. Arquitectura

SPA en React 18 (CRA) sobre Firebase, en capas, con separación razonable:

```
src/
├─ components/       pantallas por dominio (POS, Cocina, Delivery, ATP,
│  └─ */..._hooks/   Admin, Asistencias, Clientes, Menu público)
├─ context/          AuthContext (sesión + rol) · CartContext (carrito web)
├─ Utils/            fechaComercial · Constantes · formato · validarPedido · useAccionUnica
├─ firebaseConfig/   inicialización + refs por sucursal + contador transaccional
└─ routes/           RutasProtegidas
functions/src/       Cloud Functions: alta de usuarios y sincronización de claims
```

Para 12.750 líneas está **bien dimensionada. No recomiendo reescribir nada.** El acceso a Firestore
está centralizado (`colSucursal` / `docSucursal` / `colDeSucursal` / `docDeSucursal`), lo que
elimina de raíz la clase de bug "consulta que se olvida de filtrar por sucursal".

Los dos puntos donde se nota tensión:

- **`Caja.jsx` (752 líneas)** concentra formulario, carrito, atajos de teclado, cinco modales y el
  guardado. Ya extrajo nueve hooks, que es lo correcto. Lo que falta separar es el **render**: el
  panel de productos y el ticket son dos componentes que hoy conviven en un archivo.
- **`CartContext.jsx` (608 líneas)** tiene **20 `useState`**, once de los cuales son en realidad una
  máquina de estados de modales (`showModalVariante`, `hamburguesaEnProceso`, `varianteElegida`…).
  Es el caso de manual para un `useReducer`: hoy es imposible razonar sobre qué combinaciones de
  esos once estados son válidas.

Ninguna de las dos es urgente. Son deuda de mantenibilidad, no riesgo.

---

## 5. Modelo de datos

Detalle completo en [[Modelo de datos Firestore]]. Lo relevante para la auditoría:

```
sucursales/{sucursal}          ← metadata pública (la lee el selector web sin sesión)
├─ pedidos/{id}                ← el documento central del sistema
├─ resumenDiario/{fecha}       ← arqueo de la jornada
├─ contadores/{coleccion}      ← numeración de tickets
└─ asistencias/{id}            ← jornadas trabajadas

productos/  categorias/  envios/    ← catálogo, global a todas las sucursales
usuarios/                           ← staff y repartidores
clientes/                           ← alta automática al cobrar
```

**Tres observaciones estructurales:**

1. **El catálogo es global, los pedidos son por sucursal.** Coherente con el negocio (mismo menú en
   todos lados) y es lo que hace barato el listener del catálogo.
2. **El pedido es un documento denormalizado**: guarda el carrito con descripciones y precios
   copiados al momento de cobrar. Es la decisión correcta —un ticket histórico no debe cambiar
   porque cambió el catálogo— pero es exactamente lo que hace posible el hallazgo #2.
3. **`clientes` se escribe al cobrar y nunca se actualiza.** Quien se mudó conserva la dirección
   vieja para siempre. Ver sección 19.

---

## 6. El pipeline de pedidos

Máquina completa —transiciones, disparadores, escrituras y efecto sobre el arqueo— en
[[Modelo de estados]]. Resumen:

```
web PENDIENTE ──(cajero Revisa+Guarda)──┐
                                        ├─→ CONFIRMADO ─→ COCINA ─┬─→ ATP ──→ ENTREGADO
caja ──────────────────────────────────┘         ↑               └─→ DELIVERY ─→ ENTREGADO
        └─→ PENDIENTEMP ──(coteja MP)────────────┘

CANCELADO ← rechazo de solicitud web o de transferencia MP
ELIMINADO ← el cajero borra el ticket desde F3
```

**El hallazgo estructural: no hay validación de transiciones en ninguna capa.** Ninguna escritura
verifica el estado de origen — todas son `updateDoc` / `batch.update` incondicionales. Las reglas
tampoco: `allow update: if estaAutenticado()`. En la práctica:

- Un pedido `ELIMINADO` puede volver a `COCINA` (hallazgo #6).
- Un pedido `CANCELADO` puede eliminarse y descontar el arqueo de nuevo (hallazgo #3).
- Un pedido ya `ENTREGADO` puede eliminarse y descontar.
- Dos pantallas abiertas pueden pisarse mutuamente sin que ninguna se entere.

**Qué pasa cuando algo falla:**

| Escenario | Comportamiento hoy |
|---|---|
| Falla el guardado en Caja | ✅ Atómico desde sep-2026: contador, pedido y arqueo en una transacción |
| Se recarga la página | ✅ Los listeners resumen por `resumeToken`; el carrito en curso **se pierde** |
| Se corta la conexión | La escritura queda encolada por el SDK y se aplica al reconectar — puede aplicarse **tarde**, sobre un pedido que ya cambió de estado |
| Dos usuarios editan a la vez | Último en escribir gana, sin aviso |
| Una operación se dispara dos veces | `useAccionUnica` cubre el doble click de una persona; **no** cubre a dos personas |

---

## 7. Reglas de negocio implícitas

Las documentadas están en [[Reglas de negocio]]. Estas vivían **solo en el código** y ahora también
se incorporaron a esa nota:

1. **Un extra de hamburguesa solo se puede agregar inmediatamente después de una hamburguesa**
   (`useCarrito.js:38`). Si el cajero agrega una bebida en el medio, el extra se rechaza.
2. **El carrito solo acumula cantidad sobre el último ítem** (`useCarrito.js:60`). Agregar el mismo
   producto con algo en el medio crea un renglón nuevo. Es el motivo por el que el rediseño de Caja
   descartó el control `− +` por línea.
3. **El teléfono debe tener 10 dígitos** (`validarPedido.js:5`) — pero no se valida que sean dígitos.
4. **En efectivo se exige `pagaCon >= total`**, para calcular el vuelto. Que después no se muestra.
5. **El horario especial solo admite 20:00 a 23:45**, en tramos de 15 minutos — aunque el local
   ahora abre a las **19**, así que no se puede pactar un pedido para las 19:xx.
6. **La zona de envío decide el ruteo de cocina**, no lo que el cliente eligió en la web.
7. **Un pedido eliminado o cancelado sigue apareciendo en los buscadores**, a propósito: el cajero
   tiene que poder auditarlo.
8. **El cliente se da de alta solo al cobrar**, y nunca se actualiza.

---

## 8. Seguridad

### Superficie expuesta sin sesión

| Recurso | Regla | Correcto |
|---|---|---|
| `sucursales/{id}` metadata | `read: if true` | ✅ El selector web la necesita |
| `productos`, `categorias`, `envios` | `read: if true` | ✅ Fallback del menú público |
| `storage /publico/menu.json` | `read: if true` | ✅ Es el menú publicado |
| Crear pedido web | `esCreacionPublicaValida()` | ⚠️ Ver abajo |
| Leer pedido web | `esOrigenWeb()` | ❌ **Hallazgo #1** |

### Qué valida `esCreacionPublicaValida()` y qué no

Valida: `origen == "WEB"`, `estado == "PENDIENTE"`, presencia de los campos obligatorios, ausencia
de `cajeroID`/`cocineroID`/`deliveryID`, que `carrito` sea una lista de 1 a 50 ítems y que `total`
sea un número entre 0 y 1.000.000.

**No valida** —y conviene tenerlo escrito—:

- Que los **precios** del carrito coincidan con el catálogo (hallazgo #2).
- Que `total` sea la suma del carrito. Un pedido de 50 hamburguesas con `total: 1` pasa la regla.
- La **forma** de cada ítem del carrito: solo se cuenta la lista, no se mira adentro.
- Que el teléfono, la dirección o el nombre sean plausibles.
- **Cuántas** solicitudes crea un mismo visitante. No hay rate limiting; App Check sube el costo del
  abuso automatizado pero no lo impide desde el sitio real.

Es una validación de **forma**, no de **contenido**, y está bien que así sea: validar precios en las
reglas exigiría `get()` facturados por ítem. El lugar correcto para eso es el cajero al Revisar, con
el catálogo que ya tiene en memoria — que es exactamente lo que propone el arreglo de #2.

### Lo que está bien resuelto

- El wildcard `/{coleccion}/{documento}` **excluye `pedidos`** explícitamente, porque las reglas se
  combinan con OR y si no re-otorgaría el `delete: if false`. Es un detalle sutil y está bien hecho.
- `usuarios` tiene `write: if esAdmin()`: sin eso, un cajero se ascendería editando su propio
  documento desde la consola del navegador.
- El alta con acceso pasa por Cloud Function con Admin SDK, y `crearUsuario` rechaza el rol admin.
- `storage.rules` limita la escritura de `menu.json` al admin y solo a ese nombre de archivo.
- El valor del rol admin salió de las reglas y vive en un claim; CRA inlinea los `REACT_APP_*` en el
  bundle, así que ese valor **nunca fue secreto** y hoy ya no importa que no lo sea.

---

## 9. Integridad del dinero

> [!success] 26-09-2026: el `increment()` del arqueo ya no existe
> Esta sección diagnosticó bien la causa raíz. Se resolvió eliminándola: `resumenDiario` pasó de
> contador a foto de un cálculo sobre los pedidos de la jornada. Las tres grietas que quedaban
> —doble descuento, doble suma por toma simultánea, carrera entre dos cajeros— dependían de que
> sumar dos veces sumara dos veces. Ver
> [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

Es el área con más hallazgos, y no es casualidad: `resumenDiario` se mueve con `increment()`, que
**no es idempotente**. Cualquier camino que ejecute dos veces la misma suma o resta deja el arqueo
mal, en silencio y sin rastro.

Las defensas que existen hoy:

- `getResumenOperation()` centraliza el movimiento del arqueo — un solo lugar que tocar.
- El movimiento va en el mismo `writeBatch` / `runTransaction` que el pedido: o pasan los dos o
  ninguno.
- `useAccionUnica` bloquea el doble click sobre la misma acción.
- `set(..., {merge:true})` en vez de `updateDoc`, para que la primera operación de la jornada cree
  el documento en vez de fallar.

Las tres grietas que quedan son los hallazgos **#3** (doble descuento), **#4** (subcobro en pago
dividido) y **#5** (doble suma por toma simultánea). Las tres comparten la misma característica
peligrosa: **el descuadre se descubre contando plata al cierre, no mirando el sistema**. No hay
ninguna alerta, log ni campo que permita reconstruir qué pasó.

> [!success] Los tres cerrados el 14-09-2026 — y una corrección a lo que decía esta sección
> La versión original proponía una marca `arqueoAplicado` en el pedido como "mejora transversal que
> las cubre a las tres". **Era una sobreestimación**: la marca solo cubría #3. #4 es un problema de
> validación (el recargo negativo se calcula antes de tocar el arqueo) y #5 se cierra en las reglas
> (impedir la doble toma, no la doble suma). Se optó por lo simple: ocultar el botón (#3), revalidar
> al guardar (#4) y una regla sin lecturas (#5). La marca queda como opción si aparece un camino
> nuevo que revierta dos veces.

---

## 10. Hallazgos

Cada uno con qué pasa, dónde, impacto, arreglo, complejidad y prioridad.

### 1 · P0 · Cualquier visitante puede listar los datos de todos los clientes web

> [!success] Corregido el 14-09-2026
> Reglas: `allow get` / `allow list` separados.

**Dónde:** `firestore.rules:17` — `allow read: if estaAutenticado() || esOrigenWeb()`.

**Qué pasa:** en Firestore, `read` cubre `get` **y** `list`. Como la condición es
`resource.data.origen == "WEB"`, una consulta `where("origen","==","WEB")` la satisface documento
por documento, así que **está permitida** y devuelve todos los pedidos web de la sucursal: nombre,
teléfono, dirección y entre calles de cada cliente.

**Por qué es alcanzable:** el slug de la sucursal es público —está en la URL de
`/crear-solicitud/:sucursal`— y App Check no protege acá: quien abre la consola del navegador **en
el sitio real** ya tiene un token válido emitido para ese origen.

**Impacto:** fuga de datos personales de toda la clientela web. Riesgo legal bajo la Ley 25.326 de
protección de datos personales, además del daño reputacional.

**Arreglo:** `PaginaDetalle.jsx:20` lee con `getDoc` por id, así que la app **nunca necesita `list`**
público. Separar la regla:

```js
allow get:  if estaAutenticado() || esOrigenWeb();
allow list: if estaAutenticado();
```

**Complejidad:** trivial. **Costo:** cero. **Riesgo de regresión:** ninguno — ningún camino de la
app hace `list` sin sesión.

### 2 · P1 · Los precios de una solicitud web los pone el cliente

> [!success] Corregido el 14-09-2026
> `useRevisarSolicitud` re-precifica contra `productos` de la Caja, en silencio.

**Dónde:** `CartContext.jsx:476` guarda el carrito en `localStorage`; `Crearsolicitud.jsx` lo
escribe tal cual; `useRevisarSolicitud.js:70` lo reconstruye con
`subtotal: cantidad * producto.precio` — el precio **del documento**, no el del catálogo.

**Qué pasa:** el precio viaja desde el navegador del cliente hasta el ticket de la Caja sin que
nadie lo contraste. Editando `localStorage` se puede pedir a cualquier precio.

**Y hay un problema anterior, peor porque no necesita mala fe:** el cliente ve precios de
`menu.json` —una foto publicada con el botón "Publicar Menú"— y la Caja usa Firestore en vivo.
**Ya pueden diferir hoy**, con solo cambiar un precio y no publicar.

**Impacto:** subcobro silencioso. La única defensa actual es que el cajero mire el total.

**Arreglo:** al Revisar, re-precificar cada ítem contra el catálogo que la Caja **ya tiene en
memoria** (`useTraerDatos`) — cero lecturas nuevas. Y **avisar al cajero cuando el precio difiere**
del que vio el cliente, en vez de corregir en silencio: el cliente pidió a un precio y esa decisión
es de una persona, no del sistema.

**Complejidad:** baja. **Decisión de negocio pendiente:** sección 19.

### 3 · P1 · Doble descuento del arqueo

> [!success] Corregido el 14-09-2026
> `BuscarPedido` oculta Eliminar en `CANCELADO`. Sin marca en el pedido, por decisión.

**Dónde:** `BuscarPedido.jsx:251` muestra Eliminar para todo estado que no sea `ELIMINADO`,
**incluido `CANCELADO`**.

**Qué pasa:** un pedido MP rechazado desde F2 ya descontó el arqueo — `PendientesMP` llama a
`getResumenOperation({descontar:true})`. Eliminarlo después vuelve a descontar.

`BuscarPedido.jsx:86` condiciona el descuento a `if (pedido.cajeroID)`, lo que **sí** protege el
caso de borrar una solicitud web que nadie cobró. Pero un pedido MP rechazado pasó por la Caja y
tiene `cajeroID`, así que el guard lo deja pasar: **es exactamente el caso que el doble descuento
necesita.**

**Impacto:** el arqueo queda con el importe restado dos veces. **No queda ningún rastro**: hay que
sospecharlo y reconstruirlo a mano.

**Arreglo:** no ofrecer Eliminar sobre estados que ya revirtieron; o —más robusto— la marca de
"arqueo ya revertido" de la sección 9, que también cubre llegar a `ELIMINADO` por otro camino.

**Complejidad:** baja.

### 4 · P1 · Pago dividido: se puede subcobrar

> [!success] Corregido el 14-09-2026
> `errorPagoDividido()` corre también en `validarPedido`, al guardar.

**Dónde:** `PagoDividido.jsx:8` valida `0 < montoEfectivo < totalBase` **al confirmar el modal**;
`validarPedido.js` no lo vuelve a mirar al guardar.

**Qué pasa:** el cajero fija el monto en efectivo y después sigue editando el carrito. Si quita
ítems hasta que el total baje del monto en efectivo, `useCarrito.js:17` calcula un **recargo
negativo**.

Con base 8.000 y efectivo 10.000: recargo −200, total **7.800**, `montoMPConRecargo` **−2.200**. El
pedido se guarda subcobrado y el arqueo recibe `mp: increment(-2200)` junto con
`totalEfectivo: increment(10000)`.

**Impacto:** subcobro **y** arqueo corrupto, en una sola operación.

**Arreglo:** repetir la validación en `validarPedido`, que es el punto por el que pasa **todo**
guardado. Tres líneas.

**Complejidad:** trivial.

### 5 · P1 · Tomar una solicitud web no es atómico

> [!success] Corregido el 14-09-2026
> Regla `asignacionValida()`: `cajeroRevisaID` solo se escribe si estaba libre o era propio.

**Dónde:** `PendientesSolicitudes.jsx:72` consulta `esDeOtroCajero()` contra el **snapshot local**;
`useRevisarSolicitud.js:40` escribe `cajeroRevisaID` **sin condición**.

**Qué pasa:** dos cajeros cuyos listeners todavía no recibieron la asignación del otro pasan los dos
el chequeo y escriben los dos. Gana el último, pero **los dos tienen el pedido cargado**.

Al guardar, cada uno consume un número de ticket y cada uno llama a `getResumenOperation`: **el
arqueo suma el mismo pedido dos veces**. Es exactamente lo que el comentario del código dice
prevenir. Con dos cajeros trabajando en simultáneo de forma habitual, es alcanzable.

**Arreglo, sin costo y sin transacción:** una regla que solo permita escribir `cajeroRevisaID` si
está libre o ya es tuyo. Firestore compara `resource.data` (lo que hay) contra
`request.resource.data` (lo que se quiere escribir) sin cobrar lecturas.

**Complejidad:** baja. **Es el arreglo con mejor relación impacto/esfuerzo de la auditoría.**

### 6 · P2 · Cocina puede resucitar un pedido eliminado

> [!success] Corregido el 14-09-2026
> `PedidosEspera` poda `selectedPedidos` contra cada snapshot.

**Dónde:** `PedidosEspera.jsx:88` mantiene `selectedPedidos` y **nunca lo reconcilia** contra el
snapshot.

**Qué pasa:** el cocinero selecciona pedidos; el cajero elimina uno; el listener lo saca de la lista
**pero el id queda en la selección**. `cocinar()` le hace `batch.update` igual y lo pone en `COCINA`.

**Impacto:** un pedido eliminado —con el arqueo ya descontado— vuelve al circuito y se cocina.
Pérdida de producto y un ticket que nadie va a retirar.

**Arreglo:** filtrar `selectedPedidos` contra los ids del snapshot antes de armar el batch, y podar
la selección en cada snapshot.

**Complejidad:** baja.

### 7 · P2 · El ruteo de cocina no usa la constante como corresponde

> [!success] Corregido el 14-09-2026
> `ENVIOS_LOCALES.includes()`.

**Dónde:** `PedidosCocinando.jsx:95`.

```js
const nuevoEstado = (pedido.envio?.zona_envio === ENVIOS_LOCALES[0]
                  || pedido.envio?.zona_envio === ENVIOS_LOCALES[1]) ? ATP : DELIVERY;
```

Los otros nueve usos del proyecto usan `.includes()`. Agregar una tercera zona local a
`ENVIOS_LOCALES` rompería **el ruteo del pipeline**, en silencio, y es la decisión más consecuente
del flujo: manda el pedido a mostrador o a delivery.

**Arreglo:** `ENVIOS_LOCALES.includes(pedido.envio?.zona_envio)`. Una línea.

**Complejidad:** trivial.

### 8 · P2 · Cocina solo puede marcar todo junto

> [!success] Cerrado por decisión el 14-09-2026
> Es deliberado: en la práctica los pedidos de un cocinero salen juntos, y como cada cocinero ve
> solo los suyos (`where cocineroID`), "todos" nunca pisa el trabajo de otro. Sin cambios.

**Dónde:** `PedidosCocinando.jsx:75` — la única acción es `marcarTodosComoCocinado`.

**Qué pasa:** si un pedido se demora, el cocinero elige entre mandar todo antes de tiempo o retener
los que ya están. No es un bug: es un modelo que el sistema le impone al negocio.

**Arreglo:** un botón por tarjeta. **Requiere confirmación tuya** — puede ser deliberado si en la
práctica los pedidos salen todos juntos.

### 9 · P3 · Bundle de 3,2 MB sin code splitting

> [!success] Corregido el 14-09-2026
> Las 15 pantallas van por `React.lazy`; `Login` queda eager. Dos fronteras de `Suspense`: una
> alrededor de `<Routes>` (públicas y Login) y otra dentro de `RequireAuth`, para que la barra de
> navegación no parpadee mientras baja el chunk. Ver
> [[Decisiones tecnicas#Code splitting por ruta]].

**Dónde:** `App.js` importaba las 15 pantallas de forma estática. `build/static/js/main.*.js`
pesaba **3.201 KB**.

Un cliente que abre `/menu` en el celular descarga Caja, Cocina, Delivery, PanelAdmin, Estadísticas
con Recharts y `html2pdf`. Baja a P3 **solo porque el canal público todavía no está en uso real**.

**Arreglo:** `React.lazy()` + `Suspense` por ruta. Riesgo bajo, impacto grande.

> [!caution] Se abarata haciéndolo antes de lanzar
> Cuando el menú público entre en uso, esto pasa a P1 y compite con tareas más urgentes.

### 10 · P3 · `html2pdf.js` arrastra un advisory crítico al bundle público

> [!success] Corregido el 14-09-2026
> `import('html2pdf.js')` dinámico dentro de `exportarPDF`: baja recién al tocar el botón, en su
> propio chunk. Se mantiene la dependencia porque la exportación a PDF se usa.

Se importaba de forma estática en `Menu.jsx:11` y solo sirve para exportar el menú a PDF.

De las **83 vulnerabilidades** que reporta `npm audit`, la enorme mayoría son herramientas de build
de CRA que **no llegan al navegador** —`@babel/traverse`, `shell-quote`, `websocket-driver`,
`form-data`—. Esta sí llega: `html2pdf.js` → `jspdf`, en el bundle que descarga el cliente.

**Arreglo:** importarlo con `import()` dinámico dentro del handler del botón, o evaluar si la
exportación a PDF justifica la dependencia (sección 19).

### 11 · P3 · Subida de imágenes sin límite del lado del servidor

> [!success] Corregido el 14-09-2026 — y una corrección a lo que decía este hallazgo
> La versión original decía que `CrearProducto` "sube sin validar tamaño". **Era falso**:
> `CrearProducto.jsx:156` y `EditProducto.jsx:163` ya rechazan más de 5 MB en el front. Lo que
> faltaba era la regla del lado del servidor —lo único que no se saltea con las devtools— y eso es
> lo que se agregó: `esImagenValida()` en `storage.rules` exige imagen de hasta 5 MB en `create` y
> `update`; `delete` va aparte porque ahí `request.resource` es null.

El front valida los 5 MB pero el tipo solo por `accept="image/*"`, que es una sugerencia del
navegador; y ninguna de las dos validaciones sobrevive a la consola. **Mitigado** de origen porque
`storage.rules` limita la escritura al admin, así que el peor caso era un admin subiendo un archivo
raro por error.

---

## 11. Calidad de código

**Código muerto: no encontré.** Se limpió en las tandas de agosto y septiembre.

**Consistencia:** alta. Las convenciones de [[Convenciones y preferencias]] se cumplen en la
práctica — `TablaGenerica` para tablas, `fmtPesos` para montos, `Swal.fire` para confirmaciones
destructivas, constantes en vez de literales. El hallazgo #7 es la única desviación de constante que
encontré, sobre diez usos.

**Comentarios:** explican el *por qué* y el contexto histórico ("antes esto fallaba porque…"), que
es exactamente lo difícil de reconstruir. Es lo mejor del proyecto y conviene no perderlo en
refactors.

**Redundancias que quedan, y por qué dejarlas:**

- `Estadisticas.jsx` mantiene su propio `fmt$` y `fmtN` en vez de usar `Utils/formato.js`. **Es
  deliberado y está documentado**: `fmtN` no lleva guarda `|| 0`, para que un dato faltante del TSV
  se vea como `NaN` en pantalla en vez de pasar por un `0` legítimo. **No unificar.**
- `PedidosEspera` y `PedidosCocinando` comparten estructura (listener + selección + batch) con
  suficiente diferencia como para que abstraerlas complique más de lo que ahorra. **Dejarlas.**

**Manejo de errores:** la convención "un `console.error` sin aviso visible al usuario cuenta como
bug" se respeta en los caminos principales. `useTraerDatos` es un buen ejemplo del criterio: cada
listener tiene callback de error que además marca listo, para que la pantalla no quede girando.

---

## 12. Performance y costos de Firestore

El control de costos es **mejor que el promedio** para un proyecto de este tamaño, y mejoró mucho en
las últimas tandas. Detalle por operación en [[Mapa de operaciones Firestore]].

| Punto | Estado |
|---|---|
| Catálogo de Caja | ✅ Resuelto: pasó de `getDocs` en cada montaje a listener con `resumeToken` |
| `Clientes` | ✅ Resuelto: buscador con tope, no lee al entrar |
| Doble lectura por login | ✅ Resuelto: promesa compartida en `AuthContext` |
| `esAdmin()` en reglas | ✅ Resuelto: custom claim, cero lecturas |
| Numeración de tickets | ✅ Resuelto: transacción única con el pedido y el arqueo |
| `menu.json` como JSON estático | ✅ La decisión de costo más acertada del proyecto |
| `HistorialPedidos` sin `limit` | Aceptado: pantalla de admin, uso esporádico |
| Bundle de 3,2 MB | Abierto, P3 — hallazgo #9 |

**No hay ningún patrón N+1** en el proyecto: no encontré un solo bucle que dispare una lectura por
ítem. Todos los `onSnapshot` devuelven su `unsubscribe` y se limpian en el `return` del efecto.

**Un matiz que conviene tener presente:** `persistentLocalCache` reduce el tráfico de los
`onSnapshot` al re-montar, pero `getDocs` **siempre** va al servidor y se factura igual. Para
ahorrar ahí hay que pedir explícitamente `getDocsFromCache`. Está documentado en el propio
`firebase.js` y vale repetirlo porque es contraintuitivo.

---

## 13. Dependencias

16 dependencias declaradas, **todas en uso**. No sobra ninguna.

| Dependencia | Uso | Observación |
|---|---|---|
| `firebase` 9.23.0 | Todo el backend | Podría migrar a v10/v11, sin urgencia |
| `react` 18 + `react-dom` + `react-router-dom` | Base | — |
| `react-scripts` (CRA) | Build | **Sin mantenimiento upstream.** Ver abajo |
| `bootstrap` + `react-bootstrap` | UI | — |
| `@tanstack/react-table` | `TablaGenerica` | — |
| `react-hook-form` | Formularios | — |
| `sweetalert2` | Confirmaciones destructivas | Convención del proyecto |
| `react-toastify` | Avisos no bloqueantes | — |
| `react-icons` | Iconografía | — |
| `recharts` | Estadísticas | Pesado, y solo lo usa una pantalla de admin → argumento extra para #9 |
| `moment` + `moment-timezone` | Fechas | En modo mantenimiento upstream; funciona bien y migrar no aporta hoy. **Ver addendum abajo** |
| `html2pdf.js` | Exportar menú a PDF | **Advisory crítico en el bundle público** — hallazgo #10 |

**Sobre CRA:** `react-scripts` está discontinuado y es el origen de la mayoría de las 83
vulnerabilidades de `npm audit` — todas de build, ninguna llega al navegador. Migrar a Vite es un
proyecto en sí mismo. **No lo recomiendo ahora**: no hay riesgo real en producción y el costo de
oportunidad es alto frente a los hallazgos P0/P1. Sí conviene tenerlo anotado como decisión futura,
sobre todo si en algún momento se hace el code splitting de #9.

> [!success] Addendum 14-09-2026 — lo que la auditoría no vio: 703 KB de zonas horarias
> Al desarmar `main` después del code splitting apareció que `moment-timezone`, importado por su
> entrada por defecto, traía la tabla de reglas horarias de **todas las zonas del mundo desde
> 1800**: 703 KB, el 38 % de `main`, para una app que fija una sola zona (`-03` desde 2009). Se
> pasó al build recortado de 10 años (44 KB): mismo `setDefault`, misma hora para cualquier fecha.
> `main` bajó de 1.848 KB a ~1.150 KB, casi todo Firebase. Ver
> [[Decisiones tecnicas#`moment-timezone` con la tabla de zonas recortada]].

---

## 14. Testing

**No hay tests automatizados, y es una decisión explícita del proyecto:** la verificación es manual.
No lo cuento como hallazgo porque no es un descuido, es una elección informada para un sistema con
un solo desarrollador y un ciclo de feedback corto — el negocio usa el software esa misma noche.

Lo que sí vale la pena decir: **los tres hallazgos de dinero (#3, #4, #5) son de la clase que un
test detecta y una prueba manual no**, porque dependen de secuencias improbables o de dos usuarios
simultáneos. Si en algún momento se agrega una sola batería de tests, el mejor retorno está en las
funciones puras que calculan plata: `useCarrito` (recargos, totales), `validarPedido`, y
`calcularHoras` de asistencias. Son puras, no necesitan Firebase, y son donde un error cuesta plata.

No es una recomendación urgente. Es dónde empezar si alguna vez se empieza.

---

## 15. Puntos donde el sistema depende de que alguien se acuerde

No son bugs. Son lugares donde el diseño delega en una persona, y conviene tenerlos explícitos
porque son los que generan los problemas que después parecen inexplicables.

| Depende de que alguien… | Qué pasa si se olvida | ¿El sistema avisa? |
|---|---|---|
| Publique el menú tras cambiar precios | El cliente pide al precio viejo (#2) | ❌ No |
| Cotejee la transferencia de MP | Se entrega un pedido no pagado | ❌ No |
| Cargue las asistencias en la jornada | El encargado ya no puede: solo edita el día en curso | ❌ No |
| Recuerde que un pedido eliminado ya se cocinó | Producto perdido | ❌ No |
| Mire el total antes de cobrar | Subcobro (#2, #4) | ❌ No |
| Destrabe una solicitud de un cajero que se fue | El pedido queda sin atender | ❌ No |

Ninguno requiere código complejo — varios se resuelven con un aviso en pantalla, que es barato. El
de la publicación del menú es el que más veces va a morder.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Detectabilidad |
|---|---|---|---|
| Fuga de datos de clientes (#1) | **Alta** — solo requiere abrir la consola | Legal y reputacional | Nula |
| Arqueo corrupto sin rastro (#3, #4, #5) | Media — depende del volumen | Descuadre de caja | Solo contando plata |
| Precio manipulado o desactualizado (#2) | Media | Subcobro | Solo si el cajero mira |
| Pedido eliminado que se cocina (#6) | Baja | Pérdida de producto | Al no retirarlo nadie |
| Solicitud web trabada | Baja | Un pedido que nadie atiende | El cliente reclama |
| Pérdida del carrito por recarga en Caja | Media | Recargar el ticket a mano | Inmediata |

**El patrón que une a los tres primeros: detectabilidad nula o tardía.** Cuando el problema se
descubre, ya pasó varias veces y no hay forma de saber cuántas. Por eso la marca de idempotencia de
la sección 9 vale más que la suma de los parches individuales.

---

## 17. Priorización y roadmap

**Tanda 1 — seguridad y dinero.** Todo P0/P1, complejidad baja, sin refactors. Los cinco son
independientes y verificables por separado:

1. **#1** — `get`/`list` en las reglas. *Trivial.*
2. **#5** — regla que hace atómica la toma de solicitudes. *Baja.*
3. **#4** — revalidar el pago dividido en `validarPedido`. *Trivial.*
4. **#3** — no descontar dos veces al eliminar. *Baja.*
5. **#2** — re-precificar contra el catálogo, avisando al cajero. *Baja.* Requiere decidir la
   política (sección 19).

Antes de 3 y 4, evaluar la **marca de idempotencia** de la sección 9: si se hace, los dos arreglos
se vuelven casi triviales y quedan cubiertos casos que hoy no se ven.

**Tanda 2 — robustez del pipeline.** #6 y #7, más validar transiciones en las reglas de `update`.

**Tanda 3 — antes de lanzar el menú público.** #9 y #10.

**Tanda 4 — mantenibilidad, sin urgencia.** Separar el render de `Caja.jsx`; `useReducer` en
`CartContext`.

**Fuera del roadmap, ya anotado:** dashboard de estadísticas con datos reales y dashboard
cross-sucursal del resumen diario, ambos en [[Deuda tecnica]].

---

## 18. Contraste con la documentación existente

El vault se trató como evidencia a verificar, no como verdad. El resultado fue **bueno**: en 12
notas no encontré ninguna afirmación falsa. Lo que faltaba era profundidad, no exactitud.

| Nota | Estado | Acción |
|---|---|---|
| [[Flujo del pedido]] | Correcta, pero no documentaba transiciones ni caminos de falla | Ampliada |
| [[Reglas de seguridad]] | No mencionaba `get` vs `list` ni los límites de `esCreacionPublicaValida()` | Ampliada |
| [[Reglas de negocio]] | Le faltaban las 8 reglas implícitas de la sección 7 | Ampliada |
| [[Deuda tecnica]] | — | Hallazgos nuevos incorporados |
| [[Mapa de operaciones Firestore]] | Correcta | Repasada |
| [[Modelo de estados]] | No existía | **Nota nueva** |
| Resto | Correctas y al día | Sin cambios |

**El `firestore.rules` documenta en un comentario que `asistencias` quedó abierto y por qué.** Eso
es exactamente lo que hay que hacer con una decisión consciente que parece un descuido, y vale la
pena señalarlo como práctica a repetir.

---

## 19. Preguntas abiertas

Ninguna bloquea la Tanda 1. Son decisiones de negocio, no técnicas:

1. ~~**¿Qué hacer cuando el precio de catálogo difiere del que vio el cliente?**~~
   → **Respondida el 14-09-2026: re-precificar en silencio.** El total que vale es el del ticket.
2. ~~**¿Eliminar un pedido ya entregado debería descontar del arqueo?**~~
   → **Respondida el 14-09-2026: sí, por supuesto.** Es la anulación de una venta.
3. **¿`asistencias` debería cerrarse por reglas?** Hoy está cerrado solo por front. Con los claims
   ya no cuesta lecturas; requiere un claim `encargado` y excluirla del wildcard.
   → **Respondida antes de la auditoría: no.** Documentado en [[Deuda tecnica]].
4. ~~**¿Cocina debería poder marcar un pedido suelto como listo?** (#8)~~
   → **Respondida el 14-09-2026: no, es deliberado.**
5. ~~**¿El encargado debería poder destrabar una solicitud** asignada a un cajero que se fue?~~
   → **Respondida el 14-09-2026: el encargado no; el admin desde HistorialPedidos**, pendiente de
   desarrollar. Ver [[Deuda tecnica#Funcionalidad pendiente]].
6. ~~**¿El horario especial tiene que empezar a las 19**, ahora que el local abre a esa hora?~~
   → **Respondida el 14-09-2026: no, se queda 20–23.**
7. ~~**¿Se usa la exportación a PDF del menú?**~~
   → **Sí.** La dependencia se mantiene y se carga bajo demanda (#10).
8. ~~**¿Los datos del cliente deberían actualizarse al cobrar** si cambiaron respecto del alta?~~
   → **Respondida el 14-09-2026: sí.** `registrarCliente` actualiza la ficha en cada pedido y
   además lleva `ultimoPedido`, `cantidadPedidos` y `creado` para CRM.

---

## 20. Cómo verificar los hallazgos

Los principales son reproducibles con `InsertarRegistros`, sin tocar pedidos reales:

1. **#1, la enumeración:** abrir la consola en el sitio público, **sin sesión**, y correr una query
   sobre `sucursales/{slug}/pedidos` filtrando `origen == "WEB"`. Si devuelve documentos con
   teléfono y dirección, está confirmado.
2. **#3, el doble descuento:** rechazar un pedido MP de prueba desde F2, anotar el arqueo,
   eliminarlo desde F3 y comparar.
3. **#4, el subcobro:** cargar un pedido con pago dividido y después borrar ítems hasta que el total
   quede por debajo del monto en efectivo. Mirar el total resultante y el `montoMPConRecargo`.
4. **#5, la toma simultánea:** dos navegadores con cajeros distintos, ambos en F2, abriendo la misma
   solicitud sin recargar. Es el más difícil de forzar a mano — la ventana es de milisegundos.
5. **#7, el ruteo:** agregar temporalmente una tercera zona a `ENVIOS_LOCALES` y ver que un pedido
   de esa zona sale a DELIVERY en vez de a ATP.

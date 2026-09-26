---
tags: [gardenburger, auditoria]
aliases: [Ultima auditoria, Auditoria septiembre 15]
fecha: 2026-09-15
---

# Auditoría integral — 15 de septiembre 2026

← [[GardenBurger]] · anterior: [[Auditoria 2026-09]] · siguiente: [[Auditoria 2026-09-26]]

> [!success] Procesada el 24-09-2026
> De los 22 hallazgos, **20 se corrigieron con código** y 2 quedaron sin cambios por decisión: el
> 3 (métricas de delivery, el componente se rehace de cero) y el 2 (App Check en `horaServidor`).
> Cada uno lleva su callout de cierre abajo. Lo que sigue abierto está en [[Deuda tecnica]].
>
> **El P0 está cerrado del todo el 26-09-2026**: las reglas desplegadas, los TSV en Storage, y la
> carpeta `CSV/` borrada del hosting (verificado: la URL ya devuelve el `index.html` de la SPA).

> [!info] Foto al 15-09-2026
> Segunda auditoría integral, seis días después de la primera y con las tres tandas de correcciones
> ya aplicadas (17 archivos, todavía sin commitear). Foco pedido: **dinero y arqueo, rendimiento y
> costos, calidad y mantenibilidad**. Se releyó todo `src/`, `functions/`, reglas y el build — sin
> apoyarse en la auditoría anterior, y con rigor extra sobre el código escrito el 14-09.
>
> **Todavía no se tocó código ni ninguna otra nota del vault.** Este documento es para revisar
> primero; las acciones se deciden después. Con una excepción que no puede esperar: la sección 2.

**Alcance:** 13.084 líneas en 74 archivos. Todo lo que sigue está verificado contra el código; donde
hay un número de línea, es el del archivo tal como está hoy.

---

## 1. Resumen ejecutivo

**Las tres tandas dejaron el sistema mejor de lo que estaba, y esta auditoría encontró una cosa
grave que ninguna de las dos había visto.**

Lo grave: **la base completa de clientes está publicada en la web** como archivo estático. No es
una regla mal escrita ni una query: es un link. Sección 2.

Lo demás, ordenado por el foco que pediste:

- **Dinero:** cuatro hallazgos concretos. Las métricas de delivery mienten para MP y pago
  dividido; el ticket impreso nunca muestra "entre calles" por un typo; `guardarBD` es el único
  movimiento de arqueo sin `useAccionUnica`; asistencias acepta un presente sin horas y lo cuenta
  como día trabajado. Ninguno corrompe el arqueo por sí solo; dos de ellos (#3, #5) muerden todas
  las noches.
- **Costos:** `BuscarPedido` es hoy el mayor costo recurrente de la Caja —lee la jornada entera en
  cada búsqueda— y tiene arreglo barato. Cocina desmonta el listener de la solapa inactiva y el
  cocinero no ve llegar pedidos nuevos mientras está en "Cocinando".
- **Calidad:** el ABM de Envíos puede renombrar o borrar "Retira" y "Espera Afuera" con un click
  sin confirmación, y eso rompe el ruteo de cocina en silencio; `InsertarRegistros` está en
  producción sin confirmación; varios ABM tienen errores silenciosos; y la convención de `fmtPesos`
  **no se cumple** en 15 archivos — la auditoría anterior dijo que sí, y estaba mal.

**Lo que se verificó del código nuevo (14-09) y pasa:** la transacción de Caja, `asignacionValida()`
en sus cinco casos, `esImagenValida()`, la re-precificación, `registrarCliente`, el code splitting
(main de 1.179 KB, chunk por pantalla, zona horaria recortada), la bandera de menú pendiente. Una
sola mancha, mía: `.parpadeo` duplica un `.btn-blink` que ya existía.

| Prioridad | Cantidad |
|---|---|
| **P0** | 1 |
| P2 | 9 |
| P3 | 12 |

No hay P1: el P0 es el único hallazgo con impacto legal, y los P2 son operativos.

---

## 2. 🔴 P0 — La base de clientes está pública en la web

> [!success] Corregido el 24-09-2026
> Los TSV salieron de `public/` y viven en **`privado/estadisticas/` de Storage**, con
> `allow read, write: if esAdmin()`. Los sube el admin desde la Consola y la app los baja con
> `getBytes()`, que pasa por las reglas. Ver
> [[Decisiones tecnicas#Los TSV de Estadísticas viven en una carpeta privada de Storage]].
>
> Se probó primero con un `<input type="file">` y se descartó: obligaba a elegir los dos archivos
> en cada apertura.
>
> **Verificado el 26-09-2026**: los TSV en Storage dan 403 sin sesión, `publico/menu.json` sigue
> dando 200, y la pantalla carga bien como admin. Los archivos del hosting están borrados.
>
> **Falta lo que no es código**: borrar la carpeta `CSV/` del hosting de Hostinger. Los archivos
> que ya están publicados siguen ahí hasta que se los saque a mano.

**Qué:** `public/CSV/pagos.tsv` — 5 MB, **43.039 filas**, con nombre, dirección, entre calles,
teléfono y observaciones de cada pedido histórico — se copia a `build/CSV/` con cada build y el
hosting lo sirve tal cual. `ventas.tsv` (6 MB, ítems por ticket) también.

**Verificado el 15-09-2026:** `https://gardenburger.com.ar/CSV/pagos.tsv` responde **HTTP 200**
(`Content-Type: text/tab-separated-values`, servidor Hostinger) sin sesión, a cualquiera que tenga
o adivine la URL. Se comprobó con un `HEAD` y un rango de 300 bytes; la primera fila ya trae
nombre, dirección y teléfono.

**Por qué pasa:** `Estadisticas.jsx` lee los TSV con `fetch(`${PUBLIC_URL}/CSV/…`)`
(`useGoogleSheets.js:36`). Todo lo que está en `public/` **es público por definición**: CRA lo copia
al build sin tocarlo, y el hosting no tiene ni reglas ni sesión — no es Firebase, es un servidor
de archivos.

**Impacto:** fuga de datos personales de toda la clientela histórica, en un formato listo para
descargar. Es **más grave** que el P0 de la auditoría anterior: aquello exigía saber armar una
query; esto es un link. Riesgo bajo la Ley 25.326.

**Lo que la auditoría anterior no vio:** tenía el dato delante ("Estadísticas lee TSV exportados a
mano", sección 13 y `Deuda tecnica`) y solo lo trató como riesgo de calidad de datos. No preguntó
*dónde* estaban los archivos. Va dicho.

### Mitigación inmediata — tuya, sin código

1. Entrar al administrador de archivos de Hostinger (o FTP) y **borrar la carpeta `CSV/`** del
   sitio publicado. Eso corta la exposición ahora.
2. Verificar en incógnito que `https://gardenburger.com.ar/CSV/pagos.tsv` da **404**.
3. Si Hostinger tiene caché/CDN activo, purgarlo desde el panel.

Los archivos están gitignoreados (`**/*.tsv`), así que **no están en el repo** — bien. Pero
siguen en `public/`, y el próximo `npm run build` + subida los vuelve a publicar. Por eso:

### Arreglo definitivo — código, primera tarea de la próxima tanda

Sacar los TSV de `public/` y cargarlos de otra forma. Dos opciones, de más simple a más cómoda:

| Opción | Cómo | Costo | Exposición |
|---|---|---|---|
| `<input type="file">` | El admin elige `pagos.tsv` y `ventas.tsv` desde su PC al abrir Estadísticas; se parsean en memoria con el mismo `parseTSV` | Cero: sin hosting, sin Storage, sin lecturas | Ninguna: los archivos nunca salen de la PC |
| **Storage con regla de admin** ← la elegida | Subirlos a `privado/estadisticas/*.tsv` con `allow read: if esAdmin()`; `Estadisticas` los baja con `getBytes()` del SDK (pasa por reglas, a diferencia de la URL con token) | Bandwidth de ~10 MB por apertura | Ninguna, si la regla está bien |

Acá recomendé la primera por ser una tarde de trabajo menos. **El dueño eligió la segunda**: subir
los archivos una vez y olvidarse pesa más que el bandwidth, y elegir dos archivos en cada apertura
molesta todos los días.

---

## 3. Dinero y arqueo

> [!success] La causa estructural de esta sección se eliminó el 26-09-2026
> Todo lo que sigue razona sobre un `resumenDiario` mantenido con `increment()`. Ese contador ya no
> existe: el arqueo se **calcula** desde los pedidos de la jornada y `resumenDiario` guarda el
> resultado como foto. Los hallazgos quedan como registro de lo que se encontró; el mecanismo que
> los hacía posibles no está más. Ver
> [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

### 3 · P2 · Las métricas de delivery mienten para MP y pago dividido

> [!success] Cerrado el 26-09-2026, con el componente rehecho
> Las métricas pasaron a ser una **liquidación**: por repartidor, lo que rinde en efectivo
> (`repartirPago(p).efectivo`: total, `montoEfectivo` o 0 según el método) y lo que se le paga
> (fijo por noche + envíos). `totalMonto` y la columna "Diferencia" ya no existen. Ver
> [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]].


**Dónde:** `JefeDeliverys.jsx:131` — `totalMonto: increment(pedido.total || 0)`;
`ModalMetricasDelivery.jsx:31` — `diferencia = total - cobrado`.

**Qué pasa:** al cerrar un delivery, `totalMonto` acumula **el total del pedido** sin importar el
método de pago. Pero `totalCobrado` solo recibe lo que el repartidor trajo en efectivo — y para MP
el campo ni se pide (`ModalPedidoDelivery.jsx:89` lo muestra solo para EFECTIVO y `%`). Resultado:

- Pedido MP de $12.000: `totalMonto` +12.000, `totalCobrado` +0 → **"Diferencia: $12.000" en rojo**,
  como si el repartidor se hubiera quedado con la plata.
- Pago dividido $12.000 con $5.000 en efectivo: diferencia $7.000 en rojo por la parte de MP.

**Impacto:** la pantalla que existe para controlar cuánta plata tiene que rendir cada repartidor
muestra faltantes falsos. Quien la use para cuadrar va a desconfiar de repartidores honestos o va a
dejar de mirarla.

**Arreglo:** `totalMonto` tiene que acumular **lo que el repartidor debía traer**, no el total:
`EFECTIVO → total`, `% → montoEfectivo`, `MP → 0`. Es una expresión de tres ramas en
`marcarEstado`, y `getResumenOperation` ya tiene la misma lógica (`montoEfectivoFinal`) para
copiar. Renombrar la columna a "Debía traer" evita que se lea como facturación.

**Complejidad:** baja. **Ojo:** los `resumenDiario` ya escritos quedan con el valor viejo; no vale
la pena migrarlos, alcanza con que la nota lo diga.

### 4 · P2 · `Caja.guardarBD` es el único movimiento de arqueo sin `useAccionUnica`

> [!success] Corregido el 24-09-2026
> `guardarBD` va con `useAccionUnica`. El guard sigue puesto y sigue haciendo falta, pero desde el
> 26-09 protege de **dos pedidos**, no de un arqueo sumado dos veces.


**Dónde:** `Caja.jsx:72` — `const [procesando, setProcesando] = useState(false)`; `Caja.jsx:115`.

**Qué pasa:** `guardarBD` protege el doble click con un `useState`. Como explica el propio
`useAccionUnica.js:8`, entre dos clicks rápidos "el estado todavía no se aplicó y el botón sigue
habilitado": hace falta el `ref` que corta en el mismo tick. Los otros cuatro movimientos del arqueo
(rechazar MP, eliminar, cerrar delivery, guardar jornada) lo usan; el más frecuente y el que más
plata mueve, no.

**Impacto:** un doble click que entre antes del re-render dispara **dos transacciones**: dos
tickets consecutivos idénticos y el arqueo sumado dos veces. Improbable, pero es exactamente el
caso para el que existe el hook, y contradice la convención escrita en
[[Convenciones y preferencias#Acciones que no se pueden repetir]].

**Arreglo:** `const { procesando, ejecutar } = useAccionUnica();` y
`const guardarBD = (data) => ejecutar(async () => { … })`. Se van el `useState` y los dos
`setProcesando`. **Complejidad:** trivial.

### 5 · P2 · El ticket impreso nunca muestra "entre calles"

> [!success] Corregido el 24-09-2026
> `entreCalles` corregido y el ticket usa `fmtPesos`.


**Dónde:** `TicketImpresion.jsx:101` — `{p.entrecalles}`. El campo del pedido es `entreCalles`
(`Caja.jsx:161`).

**Qué pasa:** un typo de mayúscula. `p.entrecalles` es siempre `undefined`, así que **todos los
tickets de delivery salen sin la referencia de entre calles** desde que existe el componente.

**Impacto:** el repartidor sale con la dirección sola. Es el dato que la web y la Caja exigen como
obligatorio para delivery, y el único que no llega al papel.

**Arreglo:** `p.entreCalles`. **Complejidad:** trivial. Es el hallazgo más chico y el que más
noches lleva molestando.

### 6 · P3 · Asistencias acepta un presente sin horas y lo cuenta como día trabajado

> [!success] Corregido el 24-09-2026
> `calcularHoras` compara estricto (entrada == salida da 0) y un presente sin horas ya no cuenta como día trabajado.


**Dónde:** `useAsistencias.js:26` (`calcularHoras`) y `ModalCargarJornada.jsx:136` (`guardar`).

**Qué pasa:** dos huecos de validación al guardar una jornada:

- Un empleado marcado presente con entrada y salida en blanco se guarda con `horas: 0` y, en la
  liquidación, `agregarLiquidacion` le suma **un día** (`dias += 1`): trabajó 0 horas pero cuenta
  como jornada.
- `calcularHoras` suma 24 h cuando `salida <= entrada`. Es correcto para 19:00 → 02:00, pero
  **entrada == salida da 24 horas**, no 0.

**Impacto:** bajo — el admin lo ve en la tabla ("—" en las horas). Pero es plata y no cuesta nada
frenarlo.

**Arreglo:** en `guardar`, antes de escribir: un presente sin entrada o salida → error visible;
entrada == salida → error. Cuatro líneas. **Complejidad:** trivial.

### 7 · P3 · Descontar del arqueo usa la jornada actual, no la del pedido

> [!success] Corregido el 24-09-2026, y resuelto de raíz el 26-09
> Primero `getResumenOperation` pasó a derivar la jornada del `timestamp` del pedido. Después el
> contador desapareció: ahora el arqueo de una jornada se calcula leyendo **sus** pedidos, así que
> cada pedido cuenta en su jornada por construcción y no porque alguien se acuerde de pasar el
> `timestamp`. Lo único que hace falta recordar es invalidar la foto de una jornada cerrada, y de
> eso se encarga `invalidarFotoDePedido()`.


**Dónde:** `useResumenDiario.js:21` — `const hoy = getFechaComercial()`.

**Qué pasa:** rechazar un MP o eliminar un ticket descuenta del `resumenDiario` **de ahora**, no
del de la jornada en que el pedido sumó. Si se rechazara un `PENDIENTEMP` de anoche pasadas las 2
AM, se restaría del día equivocado.

**Impacto:** inalcanzable con el horario real (todo se resuelve la misma noche, el rango termina a
la 1). Queda anotado para que nadie lo descubra a las 2:30 un día raro.

**Arreglo, si alguna vez hace falta:** derivar la jornada del `timestamp` del pedido con
`getJornadaDeFecha` en vez de `getFechaComercial()`. **Complejidad:** baja. **No urge.**

### 8 · P3 · En la web, `aumentar` una bebida no actualiza `subtotal`

> [!success] Corregido el 24-09-2026
> `aumentar` y `disminuir` recalculan el `subtotal`.


**Dónde:** `CartContext.jsx:149-157`.

**Qué pasa:** `agregarAlCarrito` fija `subtotal: producto.precio`; `aumentar` incrementa
`cantidad` y deja `subtotal` como estaba. La solicitud se guarda con `subtotal` = precio unitario
para bebidas con cantidad > 1.

**Impacto:** ninguno en la Caja (`useRevisarSolicitud` recalcula) ni en el total (Crearsolicitud
usa `precio × cantidad`). `AuditoriaPedido.jsx:277` sí muestra `item.subtotal` y lo mostraría mal
para una solicitud PENDIENTE. Higiene de datos.

**Arreglo:** actualizar `subtotal` en `aumentar`/`disminuir`, o dejar de guardarlo desde la web.
**Complejidad:** trivial.

---

## 4. Rendimiento y costos

### 9 · P2 · `BuscarPedido` lee la jornada entera en cada búsqueda

> [!success] Corregido el 24-09-2026
> Por código, consulta directa. Por teléfono o dirección, un barrido por apertura del modal en vez de uno por búsqueda.


**Dónde:** `BuscarPedido.jsx:36-48`.

**Qué pasa:** cada búsqueda por F3 hace `getDocs` de **todos los pedidos de la jornada** (rango
sobre `timestamp`) y filtra en el cliente por teléfono, código o dirección. Con 100–150 pedidos por
noche y un cajero que busca 15–20 veces, son **2.000–3.000 lecturas por noche** solo en este
modal. Desde que el catálogo pasó a listener, es el mayor costo recurrente de la Caja.

**Arreglo:** decidir la consulta por la forma del término:

| Término | Consulta | Lecturas |
|---|---|---|
| Solo dígitos, ≥ 6 | `where("telefono", "==", t)` | los pedidos de ese teléfono (1–5) |
| `^\d+-` (código) | `where("codigo", "==", t)` | 1 |
| Cualquier otra cosa (dirección) | el barrido de hoy | N |

Las dos consultas directas no necesitan índice compuesto (un solo campo). Traen pedidos de
cualquier jornada, lo cual es **mejor**: hoy un pedido de anoche no se puede encontrar. Y de regalo
encuentran las solicitudes web `PENDIENTE`, que no tienen `timestamp` y hoy son invisibles en F3.

**Complejidad:** baja. **Ahorro estimado:** > 90 % de las lecturas del modal.

### 10 · P2 · Cocina desmonta el listener de la solapa inactiva

> [!success] Corregido el 24-09-2026
> Las dos solapas quedan montadas; la inactiva se oculta con `d-none`.


**Dónde:** `Cocina.jsx:44-60` — `{activeTab === 'espera' && <PedidosEspera …/>}`.

**Qué pasa:** cambiar de solapa desmonta un componente y monta el otro. Mientras el cocinero está
en "Cocinando", el listener de "En Espera" **no existe**: el contador `En Espera (N)` queda
congelado y **no ve llegar pedidos nuevos** hasta que vuelve. Además cada cambio de solapa
re-suscribe (con `resumeToken` baja solo el delta, pero es una ida al servidor cada vez).

**Impacto:** operativo. Un pedido que entra mientras la cocina está en la otra solapa espera hasta
que alguien mire.

**Arreglo:** montar las dos siempre y ocultar la inactiva con `d-none`. Cuesta lo mismo en
lecturas (los dos listeners hacen falta de todos modos) y los contadores quedan vivos.
**Complejidad:** trivial.

### 11 · P3 · `liberarSolicitud` hace una lectura que la regla ya garantiza

> [!success] Corregido el 24-09-2026
> Se intenta el `updateDoc` y se trata `permission-denied` como "no era mía".


**Dónde:** `useRevisarSolicitud.js:15-25`.

**Qué pasa:** antes de liberar hace un `getDoc` para comprobar que la asignación sigue siendo
propia. Desde el 14-09 la regla `asignacionValida()` rechaza exactamente ese caso del lado del
servidor. La lectura sobra.

**Arreglo:** intentar el `updateDoc` directamente y tratar `permission-denied` como "no era mía,
nada que liberar". **−1 lectura por Cancelar.** **Complejidad:** trivial.

### 12 · P3 · `fetchSucursales` no cachea: PanelAdmin la lee tres veces al montar

> [!success] Corregido el 24-09-2026
> `fetchSucursales` cachea la promesa; el ABM la invalida al guardar.


**Dónde:** `Utils/sucursales.js`; la llaman PanelAdmin, CrearEmpleado e InsertarRegistros, los
tres montados a la vez.

**Qué pasa:** cada `useEffect` hace su propio `getDocs`. Con 2–3 sucursales son ~9 lecturas por
visita a PanelAdmin, y una por cada pantalla que la use (Clientes, Historial, Liquidación,
SeleccionSucursal).

**Arreglo:** la misma promesa cacheada en módulo que ya usa `fetchMenuPublico`. Las sucursales
cambian una vez al año; una lectura por sesión alcanza. Sucursales.jsx (el ABM) puede invalidarla
al guardar. **Complejidad:** trivial.

---

## 5. Calidad y mantenibilidad

### 13 · P2 · `ENVIOS_LOCALES` está acoplado por nombre a documentos que el ABM puede editar

> [!success] Corregido el 24-09-2026
> Las zonas de `ENVIOS_LOCALES` no se pueden editar ni borrar desde el ABM.


**Dónde:** `Constantes.jsx:69` — `["Retira", "Espera Afuera"]`; `Envios.jsx:67-92`.

**Qué pasa:** el ruteo de cocina, el desglose `efectivoLocal`/`efectivoEnvio` del arqueo, los tabs
de la Caja y el Revisar de solicitudes web comparan **el texto** `zona_envio` contra esa constante.
El ABM de Envíos permite **renombrar o borrar** "Retira" y "Espera Afuera" como cualquier otra
zona — sin confirmación (`handleDelete` es un `deleteDoc` directo) y sin aviso.

**Impacto:** un admin que corrige "Retira" a "Retiro" rompe, en silencio y para siempre: todo
pedido de retiro va a DELIVERY, el efectivo del mostrador se arquea como envío, y
`useRevisarSolicitud.js:63` deja de encontrar la zona al Revisar.

**Arreglo:** en `Envios.jsx`, las zonas que estén en `ENVIOS_LOCALES` no se editan ni se borran
(botones deshabilitados con el motivo en el `title`). Es lo mínimo. **Complejidad:** baja.

### 14 · P2 · `InsertarRegistros` está en producción sin confirmación

> [!success] Corregido el 24-09-2026
> `InsertarRegistros.jsx` eliminado.


**Dónde:** `PanelAdmin.jsx:305`; `InsertarRegistros.jsx:173`.

**Qué pasa:** el botón "Insertar Registros" está en el panel de producción con un `TODO` de
sacarlo, y un solo click —sin `Swal`— inserta **3 pedidos reales que suman al arqueo** de la
sucursal elegida, más 2 solicitudes web. Llevan `esPrueba: true`, pero el Historial y el arqueo no
los distinguen.

**Impacto:** un click de más en una noche real suma ~$70.000 ficticios al arqueo y dos solicitudes
"pendientes" que un cajero puede tomar.

**Arreglo:** confirmación con `Swal` que diga la sucursal y el monto; y/o montarlo solo con
`process.env.NODE_ENV === "development"`. **Complejidad:** trivial.

### 15 · P2 · Errores silenciosos en los ABM de parámetros

> [!success] Corregido el 24-09-2026
> Confirmación y `try/catch` con aviso en los cuatro puntos.


Cuatro lugares donde la convención "un error sin aviso visible es un bug" no se cumple:

| Dónde | Qué |
|---|---|
| `Envios.jsx:87`, `Categorias.jsx:77` | `handleDelete` borra **sin confirmar** y sin `try/catch`: si falla, la fila desaparece igual |
| `Envios.jsx:80`, `Categorias.jsx:90` | `handleUpdate` actualiza el estado local **antes** del `setDoc` y sin `catch` |
| `Productos.jsx:118-124` | `toggleVisibilidad` muestra "Producto Desactivado" **sin esperar** `actualizarVisibilidad`: el éxito sale aunque la escritura falle |
| `PanelAdmin.jsx:103` | `handleEditEmpleado` hace `await updateDoc` sin `try/catch`: un fallo es una unhandled rejection y el modal se queda abierto sin explicación |

**Arreglo:** `Swal` de confirmación en los dos borrados (`Envios`, `Categorias`); `try/catch` con
aviso en los cuatro; `await` antes del éxito en `toggleVisibilidad`. **Complejidad:** baja, y es el
mismo patrón que ya tienen `Productos.confirmeDelete` y `Clientes.confirmeDelete`.

### 16 · P3 · `fmtPesos` no es la única fuente de formato de montos

> [!success] Corregido el 24-09-2026
> Trece archivos migrados. Quedan afuera `Estadisticas` (deliberado) y `ModalMetricasDelivery` (se rehace).


**Dónde:** `grep '\$\{'` — 15 archivos:

`BuscarPedido` (3), `PendientesMP` (3), `PendientesSolicitudes` (2), `ModalPedidoDelivery` (2),
`ModalMetricasDelivery` (3), `AuditoriaPedido` (4), `HistorialPedidos` (1), `Envios` (1),
`validarPedido` (2, en mensajes), `Card` (1), `Crearsolicitud` (1), `PaginaDetalle` (2),
`ModalHamburguesa` (1), `ModalExtras` (3), `ModalExtrasGenericos` (4). Y `TicketImpresion.jsx:12`
tiene su propio `Intl.NumberFormat` con decimales.

**Qué pasa:** [[Convenciones y preferencias]] dice "montos con `fmtPesos`, nunca `toLocaleString`
suelto", y el propio `formato.js` explica el motivo: "que $77.000 no se confunda con $7.700". En
esos 15 archivos los montos salen como `$77000`. La auditoría anterior afirmó que la convención se
cumplía; no verificó.

**Arreglo:** mecánico, un `import` y reemplazos por archivo. La web pública tal vez quiera su
propio estilo; decidir si `fmtPesos` aplica ahí también. **Complejidad:** baja, tediosa.

### 17 · P3 · Código muerto

> [!success] Corregido el 24-09-2026
> Eliminados los cinco, más tres imports muertos en `Menu.jsx`.


| Dónde | Qué |
|---|---|
| `CartContext.jsx:54,241-251,343-347` | El camino de "editar una hamburguesa ya cargada": `hamburguesaEnProceso` **nunca se setea a un valor** (`grep setHamburguesaEnProceso\(` solo encuentra `null`), así que `eliminarExtrasAnteriores` nunca borra nada y la rama de `finalizarHamburguesa` que elimina la anterior no corre |
| `Card.jsx:39` | `<Link to="/item/:id">` a una ruta que no existe, con `pe-none` para que no se pueda clickear |
| `Navigation.jsx:40` | `localStorage.setItem("rol", null)` — nadie lee `rol` de localStorage |
| `Navigation.jsx:26,64` | `isLoading` se pone en `true` y nunca en `false` |
| `PanelAdmin.jsx:139` | `nuevosEmpleados.sort((a, b) => a.rol - b.rol)` resta strings: siempre `NaN`, no ordena nada |

**Arreglo:** borrar. **Complejidad:** trivial. El primero es el que más confunde a quien lee
`CartContext`.

### 18 · P3 · `Menu.jsx` duplica constantes y hardcodea una sucursal

> [!success] Corregido el 24-09-2026
> Las sucursales viajan en `menu.json`: cero lecturas. El selector muestra solo el nombre.


**Dónde:** `Menu.jsx:76-87,153`.

- `categoriasEspeciales = ["SIMPLE","DOBLE","TRIPLE"]` duplica `CATEGORIAS_HAMBURGUESA`; el regex
  `/ (SIMPLE|DOBLE|TRIPLE)$/` duplica `limpiarNombreHamburguesa` de `CartContext`.
- Tiene su propio fallback a Firestore (`getData` con dos `getDocs`), copia del de `CartContext`.
- El pie dice **"📍 Leonardo Da Vinci 4225"** — la dirección de una sola sucursal, en el menú
  público que es global.

**Arreglo:** importar las constantes; el fallback puede consumir `obtenerProductos`/
`obtenerCategorias` del contexto (Menu está dentro de `CartProvider`); la dirección, o sale o lista
todas las sucursales (`fetchSucursales`, 1 lectura). **Complejidad:** baja.

### 19 · P3 · El rol "Contador" existe en el select pero no en el sistema

> [!success] Corregido el 24-09-2026
> Fuera de los dos selects.


**Dónde:** `PanelAdmin.jsx:374` ofrece `REACT_APP_contador`; `ROLES` (`Constantes.jsx:79`) y
`MODULOS_POR_ROL` (`Navigation.jsx:15`) no lo tienen.

**Qué pasa:** un empleado con ese rol se muestra como "—", aterriza en `/miPerfil` y no ve ningún
módulo. Es un rol fantasma.

**Arreglo:** o se define (nombre, ruta, módulos) o se saca del select. **Complejidad:** trivial.
Decisión tuya: ¿existe el contador?

### 20 · P3 · Tres asperezas en la web pública

> [!success] Corregido el 24-09-2026
> Acordeón sin `key`, teléfono con `minLength`, y el dominio sale de `window.location.origin`
> en vez de estar hardcodeado — sin variable de entorno nueva: el cliente ya está en el sitio.


| Dónde | Qué |
|---|---|
| `Crearsolicitud.jsx:179` | El acordeón lleva `key={`accordion-${cantidad}`}`: **cada producto agregado re-monta el acordeón entero y colapsa todas las categorías**. El cliente vuelve a abrir la sección en cada ítem |
| `Crearsolicitud.jsx:326` | El teléfono no valida largo: se puede enviar con 3 dígitos. Llega a la Caja y `validarPedido` no deja guardar hasta que el cajero lo corrija a mano |
| `Crearsolicitud.jsx:71` | El link del detalle en el WhatsApp hardcodea `https://gardenburger.com.ar`. Único dominio hardcodeado del proyecto; iría en `REACT_APP_urlPublica` |

**Arreglo:** sacar el `key` (o atarlo a algo que no cambie); `register("telefono", { minLength: 10 })`;
una variable de entorno. **Complejidad:** trivial las tres.

### 21 · P3 · Dos animaciones de parpadeo — error mío del 14-09

> [!success] Corregido el 24-09-2026
> Productos usa `btn-blink`; `.parpadeo` eliminado.


**Dónde:** `Main.css:451` (`.btn-blink`, existía) y `Main.css:375` (`.parpadeo`, agregada ayer).

**Qué pasa:** al hacer parpadear "Publicar Menú" agregué `.parpadeo` sin ver que `.btn-blink` ya
estaba en el mismo archivo, con sombra ámbar y todo, y es la que usan F1 y F2 de la Caja.

**Arreglo:** usar `btn-blink` en Productos y borrar `.parpadeo`. **Complejidad:** trivial.

### 22 · P3 · `getJornadaDeFecha` usa la zona horaria de la PC

> [!success] Corregido el 24-09-2026
> `getJornadaDeFecha` va por moment.


**Dónde:** `fechaComercial.js:33-38`.

**Qué pasa:** es la única función del módulo que usa `Date` nativo (`getHours()`, zona de la PC)
en vez de moment con `setDefault('America/Argentina/Buenos_Aires')`. Solo la usa Estadísticas,
en la PC del admin.

**Impacto:** ninguno hoy; inconsistencia latente si alguna vez corre en una PC con otra zona.
**Arreglo:** `moment(date)` en vez de `new Date(date)`. **Complejidad:** trivial.

### Seguridad menor

**2 · P3 · `horaServidor` es una callable pública sin App Check** (`functions/src/index.ts:15`).
Devuelve solo `Date.now()`, pero cualquiera puede invocarla y cada invocación se factura. Agregar
`enforceAppCheck: true` a las opciones de `onCall` la deja como Firestore. Trivial.

> [!abstract] Sin cambios, por decisión del 24-09-2026
> Se descartó: la función no expone nada y tiene que ser lo más rápida posible. El dato técnico,
> por si se reconsidera: **no agregaría latencia real**, porque cuando corre —en `LayoutStaff`,
> después de que `AuthContext` leyó `usuarios/{uid}`— el token de App Check ya está emitido para
> esa lectura de Firestore.

> [!bug] Este hallazgo estaba numerado dos veces
> Figura como **2** en la tabla de la sección 3 y como **23** acá. Es el mismo, y el total real de
> la auditoría es de **22 hallazgos**, no 23.

---

## 6. Verificación del código nuevo del 14-09

Lo que revisé con más desconfianza, por ser mío, y por qué pasa:

| Cambio | Qué se verificó |
|---|---|
| `runTransaction` en `guardarBD` | `pedidoRef` y `getResumenOperation` afuera del callback; la única lectura (`avanzarContador`) va antes de todas las escrituras |
| `asignacionValida()` | Los cinco casos de la tabla de [[Reglas de seguridad]]: tomar libre, tomar ajena (denegada), retomar propia, liberar/guardar con `deleteField`, cualquier update que no toque el campo. `userData.id === user.uid` (`AuthContext.js:74`) |
| `esImagenValida()` | `create, update` separados de `delete`; `uploadBytes` sin `contentType` hereda el del `File` |
| Re-precificación | `productos` de `useTraerDatos` ya está cargado cuando la Caja deja de mostrar el loader; cada variante y extra es un doc propio, el match por `id` cubre todo |
| `registrarCliente` | `increment(1)` sobre campo ausente → 1; `serverTimestamp()`; sigue sin `await` y con `catch` |
| `errorPagoDividido` en `validarPedido` | Recibe `montoEfectivo` (state, Number) y `totalBase` (de `getResumen`) |
| Poda de `selectedPedidos` | Corre en cada snapshot; `setSelectedPedidos` es estable, no cambia deps |
| Code splitting | `import/first` respetado; `Cargando` usa `.loader` que llega con `Login` y `Navigation`; main **1.179 KB**, 23 chunks, sin bloque de zonas horarias |
| Bandera `menuSinPublicar` | Se prende en los 4 puntos de Productos y los 3 del modal; se apaga en el camino feliz del publish |
| `moment-timezone` 10 años | Probado en runtime: `-03` para hoy, 2019 y 2010; Buenos Aires es alias de São Paulo en ese build |

**Lo único que salió mal:** #21 (`.parpadeo` duplicado).

---

## 7. Lo que está bien y no hace falta volver a mirar

- `getResumenOperation` cuadra en los tres métodos de pago. Verificado que al **descontar** (donde
  no se pasa `montoMPConRecargo`) el fallback `total − montoEfectivo` da exactamente lo que se sumó,
  porque `total` ya incluye el recargo.
- Cloud Functions: `exigirAdmin` con respaldo, compensación en `crearUsuario`, rechazo del rol
  admin, `darDeBajaUsuario` que no permite auto-baja ni baja de admin.
- Asistencias, en lo aritmético: `calcularHoras` cruza medianoche bien, `agregarLiquidacion`
  acumula día por día, `valorHora` congelado, `cargado*` no se pisa.
- Todos los `onSnapshot` devuelven su `unsubscribe`. No hay N+1. No sobran dependencias.
- Las reglas de Firestore y Storage desplegadas coinciden con el repo.

---

## 8. Priorización

**Tanda 4 — lo antes posible.** El P0 y los tres de dinero que muerden todas las noches:

1. **#1** — sacar los TSV de `public/`, a una carpeta privada de Storage. *Baja.* **Después de
   borrarlos del hosting a mano.**
2. **#5** — `entreCalles` en el ticket. *Trivial.*
3. **#4** — `useAccionUnica` en `guardarBD`. *Trivial.*
4. **#3** — métricas de delivery por lo que el repartidor debía traer. *Baja.*

**Tanda 5 — costos y operación:** #9 (BuscarPedido), #10 (solapas de Cocina), #13 (proteger las
zonas locales), #14 (confirmar InsertarRegistros), #15 (errores silenciosos).

**Tanda 6 — limpieza:** #16, #17, #18, #19, #20, #21, #22, #23, #11, #12, #6, #8. Todas triviales
o bajas; ninguna urge. #7 queda documentado y no se toca.

---

## 9. Preguntas para vos

1. **¿Existe el rol Contador?** (#19) Si sí, ¿qué ve y adónde aterriza? Si no, se saca del select.
2. **¿La web pública también va con `fmtPesos`** o tiene su propio estilo de precios? (#16)
3. **¿El pie del menú público** lista todas las sucursales, ninguna, o queda la de Da Vinci? (#18)
4. **¿`InsertarRegistros` se queda en producción** con confirmación, o solo en desarrollo? (#14)
5. **Métricas de delivery:** ¿la columna pasa a llamarse "Debía traer" o preferís otra cosa? (#3)

---

## 10. Cambios al vault que quedan pendientes de tu revisión

No se tocó ninguna nota. Cuando apruebes el documento, lo que cambiaría:

| Nota | Qué |
|---|---|
| `Deuda tecnica` | Los 23 hallazgos con prioridad; el P0 arriba de todo con la mitigación manual |
| `Auditoria 2026-09` | Callout al inicio: superada por esta; no vio el TSV público; sobrestimó `fmtPesos` |
| `Reglas de seguridad` | Sección nueva: **"Lo que va a `public/` es público"** — el hosting sirve todo, sin reglas ni sesión |
| `Mapa de operaciones Firestore` | `BuscarPedido` como mayor costo recurrente; `fetchSucursales` ×3; `liberarSolicitud` redundante |
| `Convenciones y preferencias` | `fmtPesos`: de "sin excepción" a "objetivo; quedan 15 archivos" |
| `Reglas de negocio` | Envíos locales: los dos nombres están acoplados a la constante y no se renombran desde el ABM |
| `Modelo de datos Firestore` | `resumenDiario.deliverys.totalMonto`: qué mide hoy y qué debería |
| `GardenBurger` | Enlazar esta auditoría |

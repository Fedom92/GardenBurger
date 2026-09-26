---
tags: [gardenburger, auditoria]
aliases: [Ultima auditoria, Auditoria septiembre 26, Tercera auditoria]
fecha: 2026-09-26
---

# Auditoría integral — 26 de septiembre 2026

← [[GardenBurger]] · anterior: [[Auditoria 2026-09-15]]

> [!info] Foto al 26-09-2026
> Tercera auditoría integral, el mismo día en que el arqueo pasó de contador a cálculo y se rehízo
> el módulo de deliverys. Pedido del dueño: **relevamiento general del repo**, **revisar si la
> decisión del arqueo fue la correcta o había alternativas**, y **controlar que el vault no haya
> quedado desactualizado**. Con una consigna: *nada está definido del todo, pero sin
> over-engineering*.
>
> **No se tocó código.** Del vault sí se corrigieron las afirmaciones que eran **falsas contra el
> código** (sección 7): el propio `CLAUDE.md` dice que ahí gana el código. Lo que depende de una
> decisión tuya quedó como pregunta.

> [!note] Respuestas del dueño — 26-09-2026
> - **Pedidos antes de las 19: no hay.** Además, la web pública **no debería dejar pedir fuera de
>   horario**, y hoy lo deja. Con eso, 2.3·B pasa a ser inalcanzable: el rango del arqueo se queda
>   como está, y lo que se agrega es **cerrar la web fuera de horario**.
> - **Repartidores y valor hora:** si cobran fijo más envíos, se les pone `valorHora` en 0 y listo.
>   Es configuración, no código.
> - **Fijo y recargo de MP:** se quedan como constantes del `.env`. Un cambio es un build y un
>   deploy, y está bien así (#12).
> - **`usuarios` legible por el staff:** los internos no preocupan. Lo que importa es el usuario
>   **externo**, y ese ya no puede leer `usuarios`, porque la regla exige sesión. Separar `valorHora`
>   y DNI costaría lecturas extra al cargar asistencias, así que no se hace (#7).
> - **Historial de pedidos: solo el admin.** Por eso no tiene tope de días. Hoy lo ven también el
>   cajero y el encargado, así que el cambio es sacárselo a ellos, no ponerle tope (#8).
> - **Editar un producto funciona.** El hallazgo #10 es sobre **cuando falla**. Corrección: el
>   ejemplo que di, una imagen de más de 5 MB, **ya tenía aviso**, porque se valida al elegir el
>   archivo. Lo que seguía silencioso eran los demás fallos al guardar: sesión, permisos, conexión.
>   El titileo de "Publicar menú" está bien: solo se activa si el guardado salió bien.
> - **Web fuera de horario:** toma pedidos hasta `horaCierre - 1`, y solo de miércoles a domingo.
> - **`/ver-pedido`:** que con el tiempo deje de verse, sin borrar nada. Resuelto con un vencimiento
>   de 48 h en la regla.
> - **Congelar los hechos en el pedido (2.3·A): sí.** **F4: queda de 00:00 a `horaCierre`.**
> - **`hasOnly`: no.** No quiere mantener una lista de campos permitidos: se mantiene la lista
>   negra y se acepta el riesgo (#5).
> - **Horario:** días y horas juntos en `HORARIO`, en `Constantes.jsx`, fuera del `.env`.

> [!success] Procesada el 26-09-2026
> Aplicado en código, verificado con lint (0 errores) y con pruebas contra el código real:
>
> | Hallazgo | Qué se hizo |
> |---|---|
> | 2.3·A | `combos` y `esLocal` se congelan al cobrar; `fijoDelivery` al cerrar la entrega |
> | 2.3·B | Inalcanzable: no hay pedidos antes de las 19, y la web cierra fuera de horario |
> | #1 | Aviso persistente cuando se cae un listener (`Utils/avisos.js`), en 6 lugares |
> | #2 | El F4 muestra un error y se cierra, en vez de "sin movimientos" |
> | #3 | Selector de repartidor por `deliveryID` |
> | #4 | Sigue por confirmar, ahora con los dos casos en [[Deuda tecnica#Funcionalidad pendiente]] |
> | #5 | **Sin cambios, por decisión**: se mantiene la lista negra |
> | #6, #7 | Sin cambios, por decisión |
> | #8 | El Historial pasa a ser **solo del admin** (menú y ruta); sin tope, a propósito |
> | #9 | Recargo de MP redondeado, igual que la web |
> | #10, #11 | Avisos en las escrituras y cargas del admin, en las páginas públicas y cuando no se sincroniza la hora |
> | #12 | Fijo y recargo quedan en el `.env`, por decisión |
> | #13 | `useAccionUnica` en las cinco altas del admin |
>
> **Además, fuera de la lista:** la web pública cierra fuera de horario (miércoles a domingo, de
> 19 a 1); `/ver-pedido` vence a las 48 h (falta desplegar la regla); el horario pasó a `HORARIO`
> en `Constantes.jsx`. Y un **hallazgo nuevo, encontrado durante la tanda**: si la carga de
> Asistencias fallaba, la pantalla quedaba con `{}`, el modal armaba las filas vacías y **guardar
> pisaba la asistencia real de todos**. Ahora queda en `null`: el modal relee por su cuenta y la
> pantalla muestra el error.

**Alcance:** 16.011 líneas en ~80 archivos de `src/`, `functions/src` y las dos reglas. Todo lo que
sigue está verificado contra el código de hoy; los números de línea son los actuales.

---

## 1. Resumen ejecutivo

**El sistema está en buen estado, y la decisión del arqueo fue la correcta.** De las seis
alternativas que había, el cálculo con foto es la única que no hereda la fragilidad del contador y
deja barato el dashboard. Pero la implementación de hoy tiene **dos huecos** que conviene cerrar
antes de que exista data productiva:

- **La foto promete una historia que hoy no entrega** (2.3·A). Ninguna pantalla la genera todavía:
  la primera va a ser el dashboard, y va a calcular todas las noches viejas con el código y el
  `.env` de ese día. El arreglo tiene precedente en el propio proyecto —`valorHora` congelado en
  asistencias— y cuesta cero lecturas.
- **El arqueo heredó el hueco de los buscadores** (2.3·B). Un pedido cobrado antes de las 19 se
  cocina y se entrega normal, pero no entra en la caja. Depende de una pregunta: ¿se cobra algo
  antes de las 19?

Fuera del arqueo, lo más importante:

- **Operación:** si un listener de Cocina, ATP o Deliverys da error, la pantalla queda **vacía y
  sin aviso** hasta recargar (#1). Y el F4, cuando falla la carga, dice "Todavía no hay
  movimientos" (#2).
- **Seguridad:** la creación pública de solicitudes usa una **lista negra** de campos y se le escapa
  `cajeroRevisaID` (#5). Pasar a lista blanca es una línea, cero lecturas.
- **Calidad:** cuatro escrituras del admin fallan en silencio —entre ellas **editar un producto**— y
  por tu propia convención eso es un bug (#10).
- **Costos:** el Historial sigue sin tope: un mes de davinci son 1.100–1.800 lecturas **por
  búsqueda**, y lo tiene el cajero (#8).

**Lo nuevo de hoy se verificó y pasa:** el cálculo del arqueo contra el contador viejo, la
liquidación de deliverys, los guards contra doble click, la ventana horaria del F4, los roles nuevos
y los 17 guards de rutas. Detalle en la sección 8.

---

## 2. La decisión del arqueo — ¿fue la correcta?

### 2.1 Qué se decidió

`resumenDiario` dejó de acumularse con `increment()` y pasó a ser el resultado de
`calcularArqueo(pedidos)`. La jornada abierta se calcula siempre; una cerrada se calcula una vez y
se guarda como **foto**, que solo se borra si alguien corrige un pedido de esa noche. Detalle en
[[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

### 2.2 Las alternativas, con números

Con tus volúmenes: davinci ~60 pedidos por noche (pico 101), ~2 vistas del arqueo por noche, y un
dashboard futuro de ~30 días por 2 sucursales. La cuota gratuita es de **50.000 lecturas por día**
y aplica también en Blaze.

| Alternativa | Lecturas por vista | Por qué sí / por qué no |
|---|---|---|
| **A. Contador con `increment()`** (la anterior) | 1 | Barato, pero **no idempotente**: cada camino que tocaba un pedido tenía que acordarse de moverlo, una sola vez y con el signo correcto. Si se desincronizaba no había cómo saberlo. |
| **B. Calcular siempre, sin foto** | ~100 | Simple y siempre exacto. **Descartada por el dashboard**: 30 días × 2 sucursales ≈ 4.800 lecturas por vista, y con 5 vistas por día es la mitad de la cuota. |
| **C. Cálculo + foto** (la elegida) | ~100 abierta, 1 cerrada | Exacto como B y barato como A para el histórico. Su única pieza frágil es la invalidación de la foto, y solo aplica a jornadas cerradas. |
| **D. Cloud Function que reacciona a cada pedido** | 100 por **escritura** | Peor en los dos ejes: si recalcula, son ~10.000 lecturas por noche. Si incrementa, vuelve el problema de A, agravado: los triggers se entregan **al menos una vez**, así que pueden correr dos. |
| **E. Consultas de agregación (`sum()`)** | ~8 | Existen desde el SDK 10.5; el proyecto usa **9.23.0**. Además exige índices compuestos, guardar campos derivados en cada pedido (los combos no se pueden sumar desde el carrito) y ~8 consultas. Ahorraría ~90 lecturas por vista, y eso no justifica el costo. |
| **F. `onSnapshot` en vez de `getDocs`** | ~100 la primera vez, después solo lo que cambia | Con la persistencia en IndexedDB, reabrir dentro de 30 minutos cobra solo lo que cambió. Para 2 vistas por noche el ahorro es despreciable. |

**Veredicto: C fue la correcta.** Es la única que cierra el problema de raíz —la carrera entre dos
cajeros no quedó mitigada, **desapareció**— sin encarecer el histórico. Si algún día las lecturas
importan de verdad, el camino es E, y eso implica actualizar el SDK: no es trabajo para ahora.

### 2.3 Lo que la implementación todavía no cumple

#### A · P2 · La foto promete una historia exacta, pero hoy nadie la saca

**Dónde:** `useResumenDiario.js:196` (`obtenerArqueo`) y `Caja.jsx:250`, su único llamador.

**Qué pasa:** la foto se escribe solo cuando alguien mira una jornada **cerrada**. Y hoy **ninguna
pantalla puede hacerlo**: el F4 siempre pide la jornada en curso, y desde hoy solo de 00:00 a
`horaCierre`, que sigue siendo la jornada abierta. Consecuencia:

- **No se genera ninguna foto.** `setDoc` nunca se ejecuta, y las tres llamadas a
  `invalidarFotoDePedido` no tienen nada que borrar.
- **La primera foto de cada noche la va a sacar el dashboard**, quizás meses después, **con el
  código y el `.env` de ese día**. Hay tres cosas del cálculo que no salen del pedido:

| Qué | De dónde sale hoy | Cuándo cambia |
|---|---|---|
| Qué cuenta como combo | `CATEGORIAS_COMBOS` y sus `excludes`, en código | cada vez que cambia el menú |
| Si una zona cobra en mostrador | `ENVIOS_LOCALES`, en código | casi nunca |
| El fijo del repartidor | `REACT_APP_fijoDeliverys`, en `.env` | con la inflación |

Entonces "agosto sigue diciendo lo que era cierto en agosto" hoy es falso. Lo va a decir con el
menú y el fijo del día en que alguien abra el dashboard.

**Arreglo propuesto — congelar en el pedido lo que puede cambiar.** Es el mismo criterio que ya
aplicaste en [[Decisiones tecnicas#Congelar `valorHora` en cada registro de asistencia]]:

- `guardarBD` escribe **`combos`** (el número, ya calculado con el carrito en memoria) y
  **`esLocal`**.
- `marcarEstado` escribe **`fijoDelivery`** al cerrar la entrega.
- `calcularArqueo` y `liquidarDeliverys` leen esos campos, con el cálculo actual como respaldo para
  pedidos que no los tengan (hoy no hay ninguno productivo).

**Costo: cero lecturas y cero escrituras extra**: son campos que viajan en escrituras que ya
existen. Así la historia es exacta **por construcción**, sin importar cuándo se saque la foto, y
la foto vuelve a ser lo que tiene que ser: un caché de lecturas, no la guardiana de la historia.

> [!question] Alternativa más chica
> Fotografiar la jornada anterior **al abrir la Caja** del día siguiente: 1 `getDoc` por apertura,
> y un barrido una vez por día. Es menos cambio, pero no resuelve una noche que nadie abrió al día
> siguiente, y deja la historia atada a que alguien use la Caja. Congelar en el pedido no depende
> de nadie.

#### B · P2 · El arqueo heredó el hueco de los buscadores

**Dónde:** `useResumenDiario.js:180` (`traerPedidosDeJornada`) usa `getRangoDeJornada`: de las
**19:00** a las 02:00.

**Qué pasa:** el hueco de 02:00 a 19:00 se diseñó para F3, y está bien documentado como intencional.
Pero el arqueo ahora usa el mismo rango, así que un pedido **cobrado** a las 18:50:

- se cocina, se despacha y se entrega normal, porque Cocina, ATP y Deliverys filtran por estado, no
  por rango;
- **no entra en el arqueo** ni en la liquidación de deliverys.

**Es un cambio de comportamiento que nadie decidió.** El contador viejo lo sumaba igual, porque a
las 18:50 `getFechaComercial()` ya daba la jornada de esa noche. La verificación de equivalencia de
hoy comparó montos, no horarios, así que no lo podía ver.

**Cómo se llega:** la web **no tiene horario**. Un cliente puede mandar una solicitud a las 18:30, y
si el cajero la confirma antes de las 19, el pedido cae en el hueco.

**Arreglo, si hace falta:** que el arqueo lea la jornada comercial **completa**, de `horaCierre` a
`horaCierre`, que es exactamente lo que ya dice `getFechaComercialDe`. F3 puede quedarse con su
rango de 19 a 2. Mismo costo, un rango aparte. Depende de la [[Auditoria 2026-09-26#10. Preguntas para vos|pregunta 1]].

#### C · Menor — una frontera de un milisegundo

El rango incluye las 02:00:00.000 (`<=`), pero `getFechaComercialDe` asigna ese instante a la
jornada siguiente. Nadie trabaja a las 2, así que no hace falta tocarlo. Si se corrige B, conviene
usar `<` en el `fin`.

### 2.4 La restricción del F4 (encargado, de 00:00 a `horaCierre`)

Fue tu propuesta y la implementé. Te debo una aclaración honesta: **el ahorro es chico**. Cada
vista son ~100 lecturas, el 0,2% de la cuota diaria. Lo que justifica la restricción es de negocio
—el arqueo recién significa algo al cierre—, no de costo.

Lo digo porque tiene una contracara: **si el encargado alguna vez necesita mirar la caja a mitad
de turno** (un retiro parcial de efectivo, un control a las 23), hoy no puede. Si eso pasa, relajar
la ventana no te cuesta nada que valga la pena cuidar. Es la [[Auditoria 2026-09-26#10. Preguntas para vos|pregunta 3]].

---

## 3. Operación

### 1 · P2 · Un listener que falla deja la pantalla vacía y sin aviso

**Dónde:** `PedidosEspera.jsx:31`, `PedidosCocinando.jsx:32`, `ATP.jsx:33`, `JefeDeliverys.jsx:65`,
`usePendientes.js:16,22` y `useTraerDatos.js:39`. Todos hacen solo `console.error` en el callback de
error.

**Qué pasa:** en Firestore, un error en `onSnapshot` **es terminal**: el listener se da de baja y no
se reintenta. La pantalla se queda con la última lista, o vacía, sin ningún aviso. El cocinero ve
"no hay pedidos" y el local sigue vendiendo.

**No es teórico:** ya tuviste `permission-denied` aleatorios (el caso del token que no estaba
resuelto, ver [[Decisiones tecnicas#App Check está "Aplicada"]]). El arreglo que se hizo ese día
resolvió la causa, pero no el síntoma: si vuelve a pasar, la cocina queda ciega.

**Arreglo:** un cartel visible en esas pantallas —"Se perdió la conexión con los pedidos. Recargá la
página."— cuando el listener da error. Es una línea de estado por pantalla, cero lecturas. No
propongo reintentos automáticos: complican y el cartel alcanza.

### 2 · P2 · F4 dice "Todavía no hay movimientos" cuando falla la carga

**Dónde:** `Caja.jsx:253` pone `resumenDiario` en `null` al fallar, y `ResumenDiario.jsx:32` muestra
el cartel de "sin movimientos" cuando es `null`.

**Qué pasa:** `calcularArqueo` **siempre** devuelve un objeto, aunque no haya pedidos (con todo en
cero). Así que ese cartel ya solo aparece cuando **falló la carga**. A las 00:30, con internet
cortado, el encargado lee "no hay movimientos" en vez de "no se pudo cargar".

**Arreglo:** en el `catch`, un `Swal` de error y cerrar el modal; el cartel de "sin movimientos" se
puede borrar. Cero lecturas.

### 3 · P3 · El modal de delivery busca al repartidor por nombre, no por id

**Dónde:** `ModalPedidoDelivery.jsx:26`, que hace `deliverys.find(d => d.nombreCompleto === p.deliveryAsignado)`.

**Qué pasa:** el pedido guarda `deliveryID`, pero el selector lo busca por nombre. Si el admin
corrige el nombre de un repartidor, sus pedidos asignados aparecen como "Sin asignar" en el
selector, y un cambio distraído los desasigna de verdad.

**Arreglo:** `value={p.deliveryID || ""}`. Una línea.

### 4 · Observación — cuándo se anula una entrega cambia si se paga el envío

Tu pendiente de "¿se paga el envío de una entrega que se anuló?" en realidad son **dos casos**, y
hoy se comportan distinto:

| Cuándo se anula | Qué pasa hoy |
|---|---|
| **Después** de que el repartidor volvió (`VOLVIO` → `ELIMINADO`) | **Se paga**: la liquidación cuenta toda entrega cerrada |
| **Mientras está en la calle** (`SALIO` → `ELIMINADO`) | **No se paga**: el pedido sale del listener del jefe, nunca llega a `VOLVIO` y la liquidación no lo ve |

En los dos el repartidor hizo el viaje. Conviene que la respuesta que averigües cubra los dos.

---

## 4. Seguridad

### 5 · P2 · La creación pública usa una lista negra de campos

**Dónde:** `firestore.rules:85`, que hace `!data.keys().hasAny(["cajeroID", "cocineroID", "deliveryID"])`.

**Qué pasa:** se bloquean tres campos y **se permite cualquier otro**. Dos consecuencias:

- **`cajeroRevisaID` no está bloqueado.** Una solicitud creada a mano con ese campo nace "tomada por
  otro cajero": `asignacionValida()` impide que nadie la revise. Se puede rechazar, pero no cargar.
  Es exactamente el caso de "solicitud trabada" que ya tenés pendiente en
  [[Deuda tecnica#Funcionalidad pendiente]], provocado desde afuera.
- **Los campos que la Caja no pisa sobreviven.** `guardarBD` escribe con `merge: true`, así que
  cualquier campo extra que traiga la solicitud (`estadoDelivery`, `pagaronCon`, lo que sea) queda
  en el pedido después de cobrarlo.

**Arreglo:** lista blanca, con los siete campos exactos que escribe `Crearsolicitud`, y forzar la
hora del servidor:

```
&& data.keys().hasOnly(["cliente", "carrito", "total", "estado", "origen", "clienteTimestamp", "mensajeWsp"])
&& data.clienteTimestamp == request.time
```

Cero lecturas y un `firebase deploy --only firestore:rules`. Reemplaza la línea de `hasAny`.

### 6 · Observación — "solo el encargado elimina" vive solo en el front

Igual que asistencias: la regla de `update` de pedidos no mira el rol, así que un cajero con
conocimientos técnicos puede marcar un pedido como `ELIMINADO` desde la consola. Ya decidiste
dejar asistencias así (ver [[Deuda tecnica#`asistencias` abierta en reglas, cerrada solo por front]]),
y esta es la misma decisión con la misma solución: un claim `encargado`. **No propongo hacerlo
ahora**, solo que sepas que esa regla de negocio nueva tiene la misma barrera que la vieja.

### 7 · Observación — `usuarios` es legible por todo el staff, con `valorHora` y DNI

La regla deja leer `usuarios` a cualquier staff porque la Caja necesita nombres. Pero el documento
trae también `valorHora`, `dni`, `domicilio` y `telefono` de **todos** los empleados de **todas**
las sucursales. Desde la consola del navegador, cualquier cajero puede ver lo que cobra cada uno.
Separarlo tiene costo —el encargado necesita el `valorHora` para cargar asistencias—, así que es
una pregunta, no una recomendación: [[Auditoria 2026-09-26#10. Preguntas para vos|pregunta 6]].

---

## 5. Costos

### 8 · P2 · `HistorialPedidos` sigue sin tope

**Dónde:** `HistorialPedidos.jsx:63`: un rango sobre `timestamp` sin `limit`.

**Qué pasa:** ya estaba marcado con ⚠ en el [[Mapa de operaciones Firestore]]. Con tus números, un
mes de davinci son **1.100–1.800 lecturas por búsqueda**, y el cajero tiene el módulo. Tres cajeros
curioseando el mes pasado es un 10% de la cuota del día.

**Arreglo mínimo:** tope de días en el rango según el rol —por ejemplo 7 para el staff y 31 para el
admin— y un aviso si se pide más. Sin índices ni consultas nuevas. El número es tuyo:
[[Auditoria 2026-09-26#10. Preguntas para vos|pregunta 7]].

---

## 6. Calidad

### 9 · P3 · El recargo de MP en la Caja puede dejar centavos; la web redondea

**Dónde:** `useCarrito.js:15-16` hace `base * (recargo / 100)` sin redondear;
`Crearsolicitud.jsx:49` hace `Math.round(total * recargo)`.

**Qué pasa:** con precios que no son múltiplos de 10, el total de la Caja sale con decimales
(`$13.579,5`) y la misma compra hecha por la web sale redondeada. El arqueo suma esos centavos. Con
tus precios actuales probablemente no pase, pero las dos puertas calculan distinto.

**Arreglo:** `Math.round` en el recargo de `useCarrito`, igual que la web.

### 10 · P2 · Cuatro escrituras del admin fallan en silencio

Tu convención dice que un `console.error` sin aviso visible es un bug. La auditoría del 15-09 cerró
el borrar y el editar de los ABM, pero quedaron estas cuatro, todas con solo `console.error` en el
`catch`:

| Dónde | Qué falla sin avisar |
|---|---|
| `EditProducto.jsx:69` | **Editar un producto**, precio incluido. El admin cree que el precio nuevo quedó |
| `Envios.jsx:65` | Agregar una zona de envío |
| `Categorias.jsx:46` | Agregar una categoría |
| `Sucursales.jsx:106` | Activar o desactivar una sucursal |

**Arreglo:** el mismo `Swal` de error que ya usan sus vecinos.

### 11 · P3 · El resto de los `console.error` sin aviso

Un barrido de todo `src/` encontró 33 `console.error` sin un aviso visible cerca. Descontando las
cuatro escrituras de arriba y los listeners del #1:

- **Cargas que dejan la pantalla vacía** sin decir por qué: `PanelAdmin`, `Envios`, `Sucursales`,
  `Productos`, `Asistencias`, `HistorialPedidos` (dos) y los cuatro `fetchSucursales().catch(console.error)`.
  También tres de la **web pública**: `Crearsolicitud:130` (el menú), `PaginaDetalle:30` y
  `SeleccionSucursal:18`. El cliente ve una página vacía.
- **Deliberados, y está bien que lo sean:** `liberarSolicitud` y `registrarCliente` (tareas de fondo
  que no deben frenar al cajero).
- **Uno que no debería ser silencioso:** `sincronizarHoraServidor` (`fechaComercial.js:17`). Si
  falla, la PC usa **su propio reloj**, que es justo el problema para el que existe esa función. Un
  `toast` de aviso en las PCs del staff alcanza.

### 12 · Observación — el fijo del repartidor y el recargo de MP están en el `.env`

Los dos se "hornean" en el build: **cambiar el fijo o el recargo exige un `npm run build` y un
deploy**. El `valorHora` de cada empleado y el costo de los envíos, en cambio, se editan desde el
admin. Con la inflación, el fijo probablemente cambie seguido. Moverlo al documento de la sucursal
también permitiría un fijo distinto por sucursal, por 0 o 1 lectura según dónde se lea. Es la
[[Auditoria 2026-09-26#10. Preguntas para vos|pregunta 4]], y si se congela el fijo en el pedido (2.3·A) la historia
queda a salvo igual.

### 13 · P3 · Las altas del admin no tienen guard contra doble click

Un `addDoc` genera un id nuevo en cada llamada, así que un doble click crea **dos** documentos. Hoy
no hay guard real en ninguna de estas altas:

| Dónde | Qué tiene | Qué se duplica |
|---|---|---|
| `CrearProducto.jsx:58` | `disabled` solo mientras sube la imagen | el producto, que aparece dos veces en la Caja y en el menú público |
| `Categorias.jsx:37` | nada | la categoría |
| `Envios.jsx:57` | nada | la zona de envío |
| `CrearCliente.jsx:25` | nada | el cliente |
| `CrearEmpleado.jsx:96` | un `useState`, el mismo patrón que no alcanzaba en la Caja | el repartidor (los empleados con acceso no: Auth rechaza el correo repetido) |

No mueve plata y el duplicado se ve y se borra, por eso es P3. El arreglo es el mismo de siempre:
envolver el alta en `useAccionUnica`.

---

## 7. El vault

Se cruzó el vault contra el código con un script (archivos, rutas, variables de entorno, funciones)
y a mano en las notas que tocan el arqueo y la seguridad.

**Bien:** las 17 rutas de `App.js` están documentadas; ningún archivo nombrado en el mapa dejó de
existir; con esta nota, 224 enlaces y 0 rotos.

**Corregido hoy**, porque contradecía al código:

| Nota | Qué decía | Qué es cierto |
|---|---|---|
| [[Reglas de negocio]] | La tabla de `fechaComercial.js` tenía 5 funciones | Tiene 10: faltaban `getFechaComercialDe`, `getRangoDeJornada`, `jornadaEstaAbierta`, `esHoraDeArqueo` y `HORA_CIERRE`. Y `getRangoJornada` ya no es "de los buscadores": el arqueo también usa ese rango |
| [[Mapa de operaciones Firestore]] | "El único caso hoy alcanzable es el del delivery" | **Ninguno** es alcanzable hoy: ninguna pantalla genera fotos (2.3·A) |
| [[Reglas de negocio]] y [[Modelo de datos Firestore]] | La foto guarda "el fijo de esa noche" | Guarda el fijo vigente **cuando se genera**, que puede ser mucho después (2.3·A) |
| [[Deuda tecnica]] | "Sin marca `arqueoAplicado`… la marca sigue siendo la opción" | Con el arqueo calculado, esa marca ya no significa nada: se sacó. También se actualizaron los tamaños de `Caja.jsx` (779) y `CartContext.jsx` (582) |
| [[Reglas de seguridad]] | La lista de lo que `esCreacionPublicaValida()` no valida | Faltaba lo del #5: los campos extra y `cajeroRevisaID` |
| [[Convenciones y preferencias]] y [[Glosario]] | Que `guardarBD` y `comprar` eran las **únicas** escrituras que crean un documento (lo escribí yo hoy) | También crean las cinco altas del admin, que no tienen guard (#13) |
| [[GardenBurger]] | "La última auditoría" apuntaba a la del 15-09 | Apunta a esta |

**Queda como está hasta que decidas:** todo lo que depende de las preguntas de la sección 10.

---

## 8. Lo que se verificó y está bien

- **Equivalencia del arqueo:** 23 casos contra una simulación del contador viejo y de la
  liquidación: mostrador, delivery, MP, dividido, MP rechazado, eliminado, solicitud web sin cobrar
  y rechazada, entregas en la calle y anuladas, y el fijo una vez por noche. Todos pasan.
- **Cobertura de la invalidación:** los tres cambios de estado que mueven plata —rechazar un MP,
  eliminar un ticket y cerrar una entrega— llaman a `invalidarFotoDePedido`. Aprobar un MP no la
  necesita: un `PENDIENTEMP` ya cuenta en el arqueo.
- **Doble click en lo que mueve plata:** las dos escrituras de dinero que crean un documento
  (`guardarBD` y `Crearsolicitud.comprar`) tienen `useAccionUnica`, y `registrarCliente` corre
  dentro de la primera. Las demás escrituras sobre pedidos son `updateDoc` a un valor fijo:
  repetirlas da el mismo resultado. Las altas del admin **no** están cubiertas: ver el #13.
- **Ventana del F4 y de la liquidación:** el intervalo de 60 s no llama a la Cloud Function, y el
  guard se relee dentro de la función que lee. Sobre un turno de 20 horas, simulado, da 1.200 ticks
  y 2 repintados.
- **Roles:** `jefeDeliverys` y encargado con `RequireRole`; los repartidores sin módulo; la Cloud
  Function de alta es lista negra (solo rechaza admin), así que el rol nuevo no necesitó deploy.
- **Firebase:** persistencia single-tab bien razonada, App Check aplicada con debug token para
  desarrollo, `privado/` de Storage solo para el admin.
- **Lint:** 0 errores; los mismos 6 warnings de siempre, en archivos que no se tocaron hoy.

---

## 9. Priorización

Ordenado por lo que evita y por lo que cuesta. Nada de esto necesita lecturas nuevas.

| # | Qué | Por qué primero | Esfuerzo |
|---|---|---|---|
| 5 | `hasOnly` en la creación pública | Seguridad, y se cierra con una línea de reglas | Muy bajo |
| 1, 2 | Cartel cuando falla un listener; error real en el F4 | Operación: que nadie trabaje a ciegas | Bajo |
| 10 | Avisos en las cuatro escrituras del admin | Un precio que no se guardó sin que nadie lo sepa | Bajo |
| 2.3·A | Congelar `combos`, `esLocal` y `fijoDelivery` en el pedido | Conviene **antes** de tener data productiva: después hay que convivir con pedidos viejos sin esos campos | Bajo-medio |
| 2.3·B | Arqueo de `horaCierre` a `horaCierre` | Solo si la respuesta a la pregunta 1 es "sí" | Bajo |
| 8 | Tope del Historial | Costos | Bajo |
| 3, 9, 11, 13 | Selector por id, redondeo, el resto de los avisos, guard en las altas del admin | Prolijidad | Bajo |

---

## 10. Preguntas para vos

1. **¿Se cobra algún pedido antes de las 19?** Por ejemplo, una solicitud web que llega a las
   18:30 y el cajero confirma apenas llega. Si la respuesta es sí, hoy ese pedido no entra en la
   caja (2.3·B).
2. **¿Los repartidores cobran por hora además del fijo y los envíos?** La carga de asistencias
   incluye a los repartidores a propósito, y todos los roles tienen `valorHora`. Si un repartidor
   tiene valor hora y lo marcan presente, la liquidación de asistencias le paga horas **y** la de
   deliverys le paga fijo más envíos. Si su `valorHora` es 0, está bien como está.
3. **¿El encargado necesita mirar la caja antes de las 00?** Retiros parciales de efectivo, un
   control a mitad de turno. Si pasa, la ventana del F4 se puede relajar sin costo real (2.4).
4. **¿Cada cuánto cambian el fijo de los repartidores y el recargo de MP?** Hoy cada cambio es un
   build y un deploy (#12).
5. **La entrega anulada, en sus dos casos** (#4): ¿se paga el envío si se anula mientras el
   repartidor está en la calle? ¿Y si se anula después de que volvió?
6. **¿Te importa que un cajero pueda ver el valor hora y el DNI de todos?** (#7) Solo se ve con
   conocimientos técnicos, desde la consola del navegador.
7. **¿Qué tope de días le ponemos al Historial del cajero?** (#8)

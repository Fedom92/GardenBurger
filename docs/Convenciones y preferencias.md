---
tags: [gardenburger, convenciones]
aliases: [Convenciones, Estilo de codigo]
actualizado: 2026-09-26
---

# Convenciones y preferencias

← [[GardenBurger]]

## Cómo trabaja el dueño del proyecto

Fede (`Fedom92`) es el único desarrollador. Preferencias que ya dejó claras más de una vez:

> [!important] Preferencias firmes — no reglas cerradas
> En sus palabras: *"no existen reglas que no se negocian; si hay mejores alternativas, propuestas
> o mejoras, son siempre bienvenidas"*. Lo que sigue es cómo decide **hoy**, y cada punto salió de
> un problema real. Una propuesta distinta se escucha si trae el motivo y el costo en lecturas.
>
> 1. **Nada de over-engineering.** Se rechazaron explícitamente: timeouts de 5 minutos,
>    `runTransaction` donde no era imprescindible, wrappers con singleton global, constantes
>    intermedias tipo `PASO_EQUIVALENTE`, campos extra "por las dudas", una marca `arqueoAplicado`
>    en el pedido y comparar el catálogo contra `menu.json` para detectar cambios (prefirió una
>    bandera).
> 2. **Minimizar lecturas y escrituras de Firebase** es un requisito de primer orden.
> 3. **Código explícito** por sobre abstracciones. Rutas de Firestore literales (`data.rol`),
>    no capas que las oculten.
> 4. **Las verificaciones las hace él.** No correr builds salvo que lo pida.
> 5. **La config de Firebase sí se versiona**, los secretos no. Ver
>    [[Decisiones tecnicas#La configuración de Firebase se versiona]].
> 6. Preguntar antes de suponer una regla de negocio — y cuando una decisión es de negocio, es
>    suya: se documenta con el motivo, no se "arregla".

Cuando hay que elegir entre dos soluciones equivalentes: **la que consuma menos lecturas y sea
más simple.**

## Convenciones de código

- Componentes en **PascalCase**. `.jsx` para componentes, `.js` para hooks y contextos.
- Estado con `useState`, efectos con `useEffect`, memoización con `useMemo`/`useCallback`.
- **Refs de queries de Firestore dentro de `useRef`** para que no se recreen en cada render y no
  redisparen el efecto.
- `onSnapshot` **solo** donde se necesita ver el flujo en vivo; `getDocs` para el resto.
- **Confirmaciones destructivas siempre con `Swal.fire`**, nunca `window.confirm`.
- Avisos rápidos con `toast` de react-toastify.
- Errores: `console.error` **más** un Swal visible para el usuario. Un `console.error` solo es un
  error silencioso — cuenta como bug. Para los que no son de una acción, `Utils/avisos.js`:
  `avisarSinConexion(que)` cuando se cae un listener (aviso que no se cierra solo: un error en
  `onSnapshot` es terminal) y `avisarErrorDeCarga(que)` cuando una carga deja la pantalla vacía.
- Formularios con **react-hook-form**.
- Tablas con **`TablaGenerica`**, sin excepción: ya resuelve búsqueda sin acentos, filtros,
  orden y paginación. Si una columna necesita mostrar un valor crudo (rol, slug de sucursal),
  **enriquecer la fila** con un campo legible en vez de escribir una tabla a mano.
- Montos con **`fmtPesos`** de `Utils/formato.js`, **sin excepciones en pantalla** salvo una,
  deliberada y documentada: `Estadisticas.jsx`, cuyo `fmtN` no lleva guarda `|| 0` para que un
  dato faltante del TSV se vea como `NaN`. (`ModalMetricasDelivery.jsx` fue la otra hasta que se
  rehizo, el 26-09-2026.)
- **Nunca hardcodear** los valores de rol, los estados ni los métodos de pago: van por
  `process.env.REACT_APP_*`, `ESTADOS` y `METODOS_PAGO` de `Constantes.jsx`. `METODOS_PAGO` trae
  `key` (lo que se guarda: `"EFECTIVO"`, `"MP"`, `"%"`) y `label`; para mostrar un valor guardado,
  `etiquetaPago(valor)`. La excepción es `Estadisticas`, que lee los TSV del sistema viejo y tiene
  su propia etiqueta ("Mixto").
- Al crear un componente que use `pedidos`/`resumenDiario`/`asistencias`/`contadores`: helpers
  `colSucursal`/`docSucursal` (staff) o path explícito con la sucursal de la URL (público).
- **Una pantalla nueva va por `React.lazy`** en `App.js`, no con `import` estático: cada pantalla
  es su propio chunk. Ver [[Decisiones tecnicas#Code splitting por ruta]].
- **Todo camino que edite el catálogo** (productos o categorías) llama a `marcarPendiente()` en
  `Productos.jsx`, para que "Publicar Menú" parpadee. Si se agrega un ABM nuevo que toque
  `productos`, va con la bandera.
- Al escribir una regla con `allow read`, preguntarse si hace falta `list` o alcanza con `get`.
  Ver [[Reglas de seguridad#`read` es `get` **y** `list`]].

## Acciones que no se pueden repetir

Todo lo que escribe un pedido cobrado o una jornada de `asistencias` va envuelto en
**`useAccionUnica`**:

```js
const { procesando, ejecutar } = useAccionUnica();
const aprobar = (id) => ejecutar(async () => { ... });
```

Usa **dos** mecanismos y los dos hacen falta: un `useRef` que corta en el mismo tick —entre dos
clicks rápidos el estado todavía no se aplicó y el botón sigue habilitado— y un `useState` para el
`disabled` y el texto del botón, que necesitan repintado. Dos acciones que comparten una instancia
del hook se bloquean mutuamente, que es lo que se quiere en `PendientesMP` (aprobar/rechazar) y en
`JefeDeliverys` (asignar/marcar estado).

> [!important] Lo que crea un documento no se puede repetir
> Casi todas las escrituras sobre pedidos son `updateDoc` de un campo a un valor fijo: repetirlas
> da el mismo resultado. Lo peligroso es lo que **crea** un documento, porque el id se genera en
> cada llamada: `Caja.guardarBD` y `Crearsolicitud.comprar` crean pedidos, y las altas del admin
> (`addDoc` de producto, categoría, envío, cliente y repartidor) crean el resto. Todas necesitan
> `useAccionUnica`; un `useState` con `disabled` no alcanza. Todas lo tienen: las altas del admin
> desde el 26-09-2026, por el [[Auditoria 2026-09-26#13 · P3 · Las altas del admin no tienen guard contra doble click|hallazgo #13]].

El guard ya no está para proteger el arqueo —ese se calcula desde los pedidos y recalcularlo mil
veces da lo mismo— sino para que un doble click no cree **dos pedidos** ni deje uno a medio camino
entre dos estados. Ver [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]].

Donde sigue habiendo `increment()` —`clientes.cantidadPedidos`— el guard es lo único que hay, y
alcanza: un conteo aproximado de pedidos por cliente no es plata.

## Estilo de comentarios

Los comentarios explican **por qué**, no qué. Cortos, en el punto exacto donde alguien se
tentaría de "arreglar" algo. Sin acentos en los comentarios de código nuevo (el código existente
los mezcla). Ejemplo del repo:

```js
// Base la hora del servidor, no la de la PC: si el reloj esta corrido
// el pedido se graba con otra fecha y desaparece de la jornada.
const fecha = ahoraServidor().set({ hour: h, minute: m, second: 0, millisecond: 0 });
```

## Diseño

- Preferencia por **blanco y negro**, salvo los botones.
- **Un botón deshabilitado se ve deshabilitado**: opacidad `.45` y sin la mano del cursor, y el
  `:hover` va con `:not(:disabled)`. Lo tienen `.pos-fkey` (Caja) y `.btn-contorno` (el resto). Sin
  eso el navegador ignora el click pero el botón parece habilitado: pasó con la Liquidación de
  deliverys. Una clase de botón nueva que se pueda deshabilitar necesita las dos reglas.
- Tema oscuro: `--color-primario-normal: #272727`, `--color-primario-fuerte: #000000`.
- Sidebar colapsable en desktop, drawer en mobile (`mobile-open`). Topbar fija en mobile con
  `FaUserCog`.
- Bootstrap grid + flexbox custom. Estilos y animaciones en `style/Main.css`.

## Variables de entorno

Todas con prefijo `REACT_APP_`. **Nunca hardcodear sus valores.**

| Variable | Uso |
|---|---|
| `REACT_APP_apiKey` … `appId` | config de Firebase |
| `REACT_APP_gardenAppCheck` | site key de reCAPTCHA Enterprise |
| `REACT_APP_appCheckDebug` | debug token para localhost |
| `REACT_APP_admin`, `_encargado`, `_cajero`, `_cocina`, `_jefeDeliverys`, `_delivery`, `_atp` | valores de rol |
| `REACT_APP_fijoDeliverys` | lo que cobra cada repartidor por noche, además del envío de cada entrega |
| `REACT_APP_recargoMP` | % de recargo de Mercado Pago |
| ~~`REACT_APP_horaAbre` / `_horaCierre`~~ | **ya no se usan** desde el 26-09-2026: el horario está en `HORARIO` de `Constantes.jsx`. Se pueden borrar del `.env` |
| ~~`REACT_APP_celular`~~ | **ya no se usa** desde el 26-09-2026: cada sucursal tiene su teléfono en `sucursales/{id}.telefono`. Se puede borrar del `.env` |
| `REACT_APP_storageBucket` | usado también para armar la URL de `menu.json` |

## Comandos

```bash
npm start                                          # dev en localhost:3000
npm run build                                      # build de producción, sin source maps (corre el lint de CRA)
npx firebase deploy --only firestore:rules,storage # reglas
```

No hay `.eslintrc`: la config `react-app` está dentro de `package.json` y el lint corre como
parte del build — un `import` después de un `const` (`import/first`) lo rompe. No hay tests
automatizados por decisión: [[Deuda tecnica#Sin tests]]. Los source maps van apagados
(`GENERATE_SOURCEMAP=false`) a propósito: en producción expondrían el código fuente en las devtools.

## Pendientes del proyecto

Lo que queda por hacer en el proyecto:

- Dashboard cross-sucursal para el admin, sobre `resumenDiario` de todas las sucursales — datos
  del sistema nuevo, desde Firestore. **No reemplaza a `/estadisticas-viejas`**, que es el
  histórico del sistema anterior y se queda.
- Lo que queda abierto en [[Deuda tecnica]].
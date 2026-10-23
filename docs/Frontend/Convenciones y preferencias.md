---
tags: [gardenburger, frontend, convenciones]
aliases: [Convenciones, Estilo de codigo, Comandos, Variables de entorno]
actualizado: 2026-10-23
---

# Convenciones y preferencias

↑ [[Frontend]]

## Cómo trabaja el dueño del proyecto

Fede (`Fedom92`) es el único desarrollador.

> [!important] Preferencias firmes — no reglas cerradas
> En sus palabras: *"no existen reglas que no se negocian; si hay mejores alternativas, propuestas
> o mejoras, son siempre bienvenidas"*. Lo que sigue es cómo decide **hoy**, y cada punto salió de
> un problema real. Una propuesta distinta se escucha si trae el motivo y el costo en lecturas.
>
> 1. **Nada de over-engineering.** Se rechazaron: timeouts de 5 minutos, `runTransaction` donde no
>    era imprescindible, wrappers con singleton global, constantes intermedias tipo
>    `PASO_EQUIVALENTE`, campos extra "por las dudas", una marca `arqueoAplicado` en el pedido y
>    comparar el catálogo contra `menu.json` (prefirió una bandera).
> 2. **Minimizar lecturas y escrituras de Firebase** es un requisito de primer orden.
> 3. **Código explícito** por sobre abstracciones: rutas de Firestore a la vista, como `data.rol`.
>    Acepta helpers con nombre propio; rechaza la magia invisible.
> 4. **No inventar campos en los datos para resolver la UI**: si un componente no puede mostrar
>    algo, el cambio va en el componente.
> 5. **Las verificaciones las hace él**: no correr builds salvo que lo pida.
> 6. **Preguntar antes de suponer una regla de negocio.** Una decisión de negocio es suya: se
>    documenta con el motivo, no se "arregla".

Entre dos soluciones equivalentes: **la que consuma menos lecturas y sea más simple.**

## Convenciones de código

- Componentes en **PascalCase**; `.jsx` para componentes, `.js` para hooks y lógica.
- **Refs de queries de Firestore dentro de `useRef`**, para que no se recreen en cada render y no
  redisparen el efecto.
- `onSnapshot` **solo** donde se necesita ver en vivo, o donde se relee seguido (ahí un listener
  sale más barato que un `getDocs`: *Firestore › Lo que hay que saber del SDK*).
- **Confirmaciones con `Swal.fire`**, nunca `window.confirm`. Avisos rápidos con `toast`.
- **Errores: `console.error` más un aviso visible.** Un `console.error` solo es un error silencioso
  y cuenta como bug. Fuera de una acción, `Utils/avisos.js`: `avisarSinConexion(que)` cuando se cae
  un listener (no se cierra solo: un error en `onSnapshot` es terminal) y `avisarErrorDeCarga(que)`
  cuando una carga deja la pantalla vacía. Antes de escribir con `updateDoc`/`writeBatch`,
  `sinConexion()` ([[Frontend#Sin conexión, las acciones avisan antes de escribir]]).
- Formularios con **react-hook-form**. **Un formulario en un modal va en su propio componente, con
  su propio `useForm`**, y quien lo abre le pasa los valores iniciales y una `key` que cambia en
  cada apertura: así arranca de cero. Con un `useForm` en la pantalla y `reset()`, en Sucursales los
  datos de una edición aparecían en el alta siguiente (12-10-2026).
- **Tablas con `TablaGenerica`**, sin excepción: búsqueda sin acentos, filtros por columna, orden y
  paginación. Si una columna muestra un valor crudo (rol, slug de sucursal), **enriquecer la fila**
  con un campo legible al armar la tabla. Para un valor que se guarda crudo y tiene etiqueta (`"%"`
  → "Dividido"), alcanza con el `cell` de la columna y `etiquetasFiltros={{ metodoPago:
  etiquetaPago }}`. `TablaGenerica` usa react-table 9, que **registra solo lo que se le pide**
  (`FEATURES`: orden y paginación): una API "que no existe" casi siempre es una feature sin
  registrar. `row.getVisibleCells()`, por ejemplo, es de `columnVisibilityFeature` (por eso se usa
  `getAllCells()`), y los `sortFns` del orden automático también se registran: sin ellos toda
  columna ordena con el criterio básico. Si la lista se achica, la página se corre a la última.
- **Montos con `fmtPesos`** (`Utils/formato.js`), sin excepciones en pantalla salvo la
  Estadística Histórica, cuyo `fmtN` deja ver `NaN` a propósito. Números sueltos con `fmtNumero`.
- **Fechas desde un solo lugar** (15-10-2026): en pantalla, `fmtFecha`, `fmtHora` y `fmtFechaHora`
  (reciben Timestamp, Date o moment; sin fecha, "—"); los nombres de días y meses, `NOMBRES_DIAS`,
  `DIAS_CORTOS` y `MESES_CORTOS`, que salen del locale `es` de moment, **nunca de una lista a mano**;
  los `<input type="date">`, `aInputFecha` y `FORMATO_INPUT_FECHA`. El id de una jornada se lee con `momentDeJornada` y se
  escribe con `jornadaQueEmpieza`; el "hoy" de los filtros es `momentDeHoy()`. Un formato que
  aparece una sola vez puede quedar escrito ahí.
- **Nunca hardcodear** roles, estados ni métodos de pago: `process.env.REACT_APP_*`, `ROLES`,
  `ESTADOS` y `METODOS_PAGO` (`key` es lo que se guarda, `label` lo que se muestra; para mostrar un
  valor guardado, `etiquetaPago()`).
- **Lo demás no tiene que ser constante por defecto.** Un valor simple —la categoría `"BEBIDAS"` en
  `getItemsCocina()`— puede quedar escrito: **antes de crear una constante se le pregunta al
  dueño** (11-10-2026).
- Colecciones de una sucursal: `colSucursal`/`docSucursal` (staff) o la sucursal de la URL
  (público). Ver [[Frontend#Multi-sucursal en el front]].
- **Una pantalla nueva va por `React.lazy`** en `App.js`.
- **Todo camino que edite el catálogo** llama a `marcarPendiente()` de `Productos.jsx`, para que
  "Publicar Menú" titile (*Catálogo › Publicar el menú*).
- Al escribir una regla con `allow read`, preguntarse si hace falta `list` o alcanza con `get`
  (*Reglas de Firestore › read es get y list*).

### Acciones que no se pueden repetir

Lo que **crea** un documento o mueve un pedido cobrado va envuelto en **`useAccionUnica`**:

```js
const { procesando, ejecutar } = useAccionUnica();
const aprobar = (id) => ejecutar(async () => { ... });
```

Usa **dos** mecanismos y los dos hacen falta: un `useRef` que corta en el mismo tick —entre dos
clicks rápidos el estado todavía no se aplicó— y un `useState` para el `disabled` y el texto del
botón. Dos acciones que comparten una instancia se bloquean entre sí, que es lo que se quiere en F2
(aprobar/rechazar) y en Deliverys (asignar/marcar).

Lo peligroso es lo que **crea**, porque el id se genera en cada llamada: `Caja.guardarBD` y
`comprar` de la web crean pedidos, y las altas del admin (`addDoc` de producto, categoría, envío,
cliente y repartidor) crean el resto. Todas lo tienen. El guard ya no protege el arqueo —que se
calcula—, sino que un doble click cree **dos pedidos** o deje uno a medio camino entre dos estados.
Donde sigue habiendo `increment()` (`clientes.cantidadPedidos`), el guard es lo único que hay, y
alcanza: es un conteo aproximado, no plata.

### Comentarios

Explican **por qué**, no qué. Cortos, en el punto exacto donde alguien se tentaría de "arreglar"
algo. Sin acentos en los comentarios de código nuevo (el existente los mezcla):

```js
// Base la hora del servidor, no la de la PC: si el reloj esta corrido
// el pedido se graba con otra fecha y desaparece de la jornada.
```

### Botones

**Un botón deshabilitado se ve deshabilitado**: opacidad `.45`, sin la mano del cursor, y el
`:hover` con `:not(:disabled)`. Lo tienen `.pos-fkey` (Caja) y `.btn-contorno` (el resto). Sin eso
el navegador ignora el click pero el botón parece habilitado. Una clase de botón nueva que se pueda
deshabilitar necesita las dos reglas. Cómo se ve el resto del staff:
*Gestion interna › Cómo se ve el staff*.

## Variables de entorno

Todas con prefijo `REACT_APP_`, en el `.env` de la raíz, que git ignora. **Se meten en el bundle al
hacer el build**: no son secretas, y cambiarlas es un build y un deploy.

| Variable | Uso |
|---|---|
| `REACT_APP_apiKey` … `appId` | config de Firebase; `storageBucket` arma también la URL de `menu.json` |
| `REACT_APP_gardenAppCheck` · `REACT_APP_appCheckDebug` | site key de reCAPTCHA Enterprise · debug token para localhost (*Firebase › App Check*) |
| `REACT_APP_admin`, `_encargado`, `_cajero`, `_cocina`, `_jefeDeliverys`, `_delivery`, `_atp` | valores de rol. `REACT_APP_admin` es igual a `ADMIN_ROL` de `functions/.env` |
| `REACT_APP_recargoMP` | % de recargo de Mercado Pago. Constante por decisión del dueño (26-09-2026) |
| `REACT_APP_googleMapsKey` | clave de Google Maps del buscador de direcciones de la web, restringida por dominio y por API en Google Cloud. Sin ella, la dirección es texto libre (*Web publica › El envío por distancia*) |
| `REACT_APP_modoTest` | **solo con `npm start`**: desarrollar sin límites de horario (*Jornada y horarios › Probar de día: REACT_APP_modoTest*) |
| `REACT_APP_saludo` | pensada para el saludo del ticket impreso del cliente. **Hoy ningún archivo la lee**: el ticket dice "Gracias por su compra!" escrito en `TicketImpresion.jsx` |

Ya no existen: `REACT_APP_horaAbre` / `_horaCierre` (el horario está en `HORARIO`, 26-09-2026),
`REACT_APP_celular` (cada sucursal tiene su teléfono) y `REACT_APP_fijoDeliverys` (no hay fijo,
28-09-2026).

## Comandos

```bash
npm start                                          # dev en localhost:3000
npm test                                           # las 9 baterías de tests (funciones puras)
npx eslint --ext .js,.jsx --max-warnings=0 src     # la verificación sin build
node docs/.herramientas/verificar-enlaces.mjs      # los enlaces del vault
npm run build                                      # build de producción: solo si el dueño lo pide
npx firebase deploy --only firestore:rules,storage # reglas: solo si el dueño lo pide
```

- **ESLint 8 sobre una carpeta revisa solo los `.js`** y saltea los `.jsx` sin avisar: siempre con
  `--ext .js,.jsx`. No hay `.eslintrc`: la config `react-app` está en `package.json`, y el lint
  también corre dentro del build (un `import` después de un `const` lo rompe: `import/first`).
- **No correr `npm update` a secas**: actualiza todo el árbol, incluidas las dependencias internas
  de CRA. Ver *Deuda tecnica › Sobre CRA*.
- Los source maps van apagados (`GENERATE_SOURCEMAP=false`) a propósito: expondrían el código.

## Tests

**Nueve baterías** con Jest (`npm test`), todas sobre funciones puras, sin Firebase:

| Batería | Qué cubre |
|---|---|
| `Utils/fechaComercial.test.js` | los bordes del horario web y las excepciones: el corte de las 23, el lunes a las 00:30, un feriado; el id de jornada |
| `Utils/formato.test.js` | montos, números y fechas; que días y meses salgan en castellano |
| `Utils/agruparExtras.test.js` | cada extra con su producto |
| `Utils/zonasEnvio.test.js` | el envío por distancia: leer las zonas, cada distancia en su zona, los bordes, fuera de zona, las coordenadas que pega el admin |
| `POS/pos_hooks/validarPedido.test.js` | lo que la Caja exige antes de guardar |
| `POS/pos_hooks/useResumenDiario.test.js` | **`calcularArqueo`**: suman solo los entregados, los anulados aparte, el viaje sin entregar, el entregado sin repartidor |
| `Estadisticas/Generales/calculos.test.js` | las noches con "Todas" y la categoría de bebidas |
| `Solicitudes/catalogo.test.js` | agrupar hamburguesas, secciones del filtro, extras de cada producto, la carta |
| `Solicitudes/carritoWeb.test.js` | juntar líneas, el aplanado que lee la Caja, el recargo, la solicitud con su envío |

Nacieron para los casos que solo se veían esperando la noche, o que un test detecta y una prueba
manual no. **Las pantallas se verifican a mano**, por decisión del dueño. Sin tests todavía, y donde
un error cuesta plata: `useCarrito`, `calcularHoras` y `agregarLiquidacion`; también
`getCurrentStepIndex` y `getItemsCocina`.

---
tags: [gardenburger, convenciones]
---

# Convenciones y preferencias

← [[GardenBurger]]

## Cómo trabaja el dueño del proyecto

Fede (`Fedom92`) es el único desarrollador. Preferencias que ya dejó claras más de una vez:

> [!important] Reglas duras
> 1. **Nada de over-engineering.** Se rechazaron explícitamente: timeouts de 5 minutos,
>    `runTransaction` donde no era imprescindible, wrappers con singleton global, constantes
>    intermedias tipo `PASO_EQUIVALENTE` y campos extra "por las dudas".
> 2. **Minimizar lecturas y escrituras de Firebase** es un requisito de primer orden.
> 3. **Código explícito** por sobre abstracciones. Rutas de Firestore literales (`data.rol`),
>    no capas que las oculten.
> 4. **Las verificaciones las hace él.** No correr builds salvo que lo pida.
> 5. **Nada de infraestructura en el repo.** Ver
>    [[Decisiones tecnicas#Nada de configuración de infraestructura en el repo]].
> 6. Preguntar antes de suponer una regla de negocio.

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
  error silencioso — cuenta como bug.
- Formularios con **react-hook-form**.
- Tablas con **`TablaGenerica`**, sin excepción: ya resuelve búsqueda sin acentos, filtros,
  orden y paginación. Si una columna necesita mostrar un valor crudo (rol, slug de sucursal),
  **enriquecer la fila** con un campo legible en vez de escribir una tabla a mano.
- Montos con **`fmtPesos`** de `Utils/formato.js`. Nunca `toLocaleString` suelto.
- **Nunca hardcodear** los valores de rol ni los estados: van por `process.env.REACT_APP_*` y por
  `ESTADOS` de `Constantes.jsx`.
- Al crear un componente que use `pedidos`/`resumenDiario`/`asistencias`/`contadores`: helpers
  `colSucursal`/`docSucursal` (staff) o path explícito con la sucursal de la URL (público).

## Acciones que escriben plata

Todo lo que toca `resumenDiario` o `asistencias` va envuelto en **`useAccionUnica`**:

```js
const { procesando, ejecutar } = useAccionUnica();
const aprobar = (id) => ejecutar(async () => { ... });
```

Usa **dos** mecanismos y los dos hacen falta: un `useRef` que corta en el mismo tick —entre dos
clicks rápidos el estado todavía no se aplicó y el botón sigue habilitado— y un `useState` para el
`disabled` y el texto del botón, que necesitan repintado. Dos acciones que comparten una instancia
del hook se bloquean mutuamente, que es lo que se quiere en `PendientesMP` (aprobar/rechazar) y en
`JefeDeliverys` (asignar/marcar estado).

`increment()` **no es idempotente**: cada ejecución de más corrompe el arqueo del día y no deja
rastro.

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
| `REACT_APP_admin`, `_encargado`, `_cajero`, `_cocina`, `_delivery`, `_atp`, `_contador` | valores de rol |
| `REACT_APP_recargoMP` | % de recargo de Mercado Pago |
| `REACT_APP_horaAbre` / `_horaCierre` | jornada comercial (**19** / 2). El cierre a las 2 es margen: no se trabaja pasada la 1 |
| `REACT_APP_celular` | teléfono del local para los links de WhatsApp |
| `REACT_APP_storageBucket` | usado también para armar la URL de `menu.json` |

## Comandos

```bash
npm start                      # dev en localhost:3000
npm run build                  # build de producción (corre el lint de CRA)
CI=true npx react-scripts test # tests una sola vez, sin watch
```

No hay `.eslintrc`: la config `react-app` está dentro de `package.json` y el lint corre como
parte del build.

## Pendientes del proyecto

Lo que queda por hacer en el proyecto:

- Panel/Dashboard de estadísticas sobre datos reales (el actual lee TSV del sistema viejo).
- Terminar y testear el cierre del día.
- Finalizar el menú público.
- Sacar `Utils/InsertarRegistros.jsx` y su entrada en `MODULOS_POR_ROL` cuando se implemente.
- La fila de **"Vuelto"** en el bloque de cobro de Caja: hoy se guarda `pagaCon` pero el vuelto lo
  calcula el cajero de cabeza. Sale de una resta con datos que ya están en memoria.
- El selector de horario especial ofrece 20–23, pero el local **abre a las 19**: no se puede
  pactar un pedido para las 19:xx.
- Dashboard general cross-sucursal para el super-admin (a futuro).
- Lo que queda abierto en [[Deuda tecnica]].

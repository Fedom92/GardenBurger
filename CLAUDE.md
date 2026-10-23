# GardenBurger

Sistema de gestión para una hamburguesería **multi-sucursal** (Davinci y Luro): POS (Caja),
Cocina, ATP (mostrador), Deliverys, asistencias y sueldos, menú online público y panel de
administración. **Todavía no está en producción**: en los locales se usa el sistema viejo (App
Script + Google Sheets), del que solo se toman exports para las estadísticas históricas.

**El negocio en cuatro líneas.** Cada noche, de 19 a 2, varias personas trabajan a la vez sobre los
mismos pedidos: el cajero cobra (o toma una solicitud que el cliente armó en la web), la cocina
cocina, el mostrador o el delivery entregan, y al cierre el encargado cuenta la caja (el F4) y les
paga a los repartidores. El admin maneja catálogo, personal, sucursales, números y sueldos.

**Stack.** React 19 con Create React App (no Vite), React Router 7, Firebase 12 modular
(Firestore, Auth, Storage, Functions, App Check), React Bootstrap + Bootstrap 5.3, SweetAlert2,
React Hook Form, Moment (+ timezone), `@tanstack/react-table` 9, Recharts. Cloud Functions en
TypeScript (`functions/src/index.ts`, Node 24). Sin backend propio: todo es Firebase.

**Arquitectura.** SPA con dos ramas de rutas en `src/App.js`: la pública (sin sesión, sin
`AuthContext`) y la del staff (con `AuthContext`, guards por rol). Cada pantalla es un chunk
(`React.lazy`). Lo operativo de cada sucursal vive en `sucursales/{id}/…`; catálogo, personal y
clientes son globales. La web pública lee una copia publicada del catálogo (`menu.json` en
Storage), no Firestore.

## El contexto vive en `docs/`

**`docs/` es la única fuente de documentación del proyecto**, y también es un vault de Obsidian
organizado en áreas: `Negocio/`, `Frontend/`, `Firebase/`, `Deuda tecnica/`, `Auditorias/`. Las
auditorías son fotos fechadas, no contexto vivo.

No hay documentación en ningún otro lado. Si algo falta, se actualiza la nota correspondiente; si
hace falta una nueva, va en su área, enlazada desde su hub.

El vault es la fuente rápida; el código es la fuente de verdad. Si se contradicen, **gana el
código** y hay que corregir la nota.

## Lo mínimo para no romper nada

Esto **no son reglas cerradas**: es el diseño actual, y cada punto salió de un problema real. Si
ves una alternativa mejor, proponela. El detalle está en `docs/Invariantes y dependencias.md`.

1. **La jornada comercial va de las 19 a las 2**, y es lo que significa "hoy" en todo el sistema:
   arqueo, buscadores, historial. Un pedido de las 00:30 pertenece a la noche anterior. Todo sale
   de `Utils/fechaComercial.js`. **Nunca `new Date()`** para algo que se graba: hay PCs en el
   local con el reloj mal, va por `ahoraServidor()`.
2. **Minimizar lecturas de Firestore es un requisito de primer orden**, no una optimización. Antes
   de agregar una consulta, preguntarse si el dato ya está en memoria. `getDocs` **siempre** va al
   servidor y se factura, aunque haya caché.
3. **El arqueo se calcula desde los pedidos**, no se acumula, y suman solo los **ENTREGADOS**:
   `resumenDiario` guarda el resultado de una jornada cerrada (el *resumen guardado*). Nadie lo
   escribe al cobrar ni al anular — se escribe el pedido y el número sale de ahí
   (`pos_hooks/useResumenDiario.js`); si el pedido es de una noche cerrada, va con
   `actualizarPedidoYResumen()`. `increment()` sigue sin ser idempotente, así que lo que quede
   usándolo va con guard (`Utils/useAccionUnica.js`).
4. **Multi-sucursal**: las colecciones operativas son subcolecciones de `sucursales/{id}/…`. El
   scope lo dan `colSucursal`/`docSucursal` (staff) o la sucursal de la URL (público).
5. **Roles, estados y métodos de pago no se hardcodean**: van por `process.env.REACT_APP_*`,
   `ROLES`, `ESTADOS` y `METODOS_PAGO` de `Utils/Constantes.jsx`. Para lo demás —una categoría
   como `"BEBIDAS"`, un valor simple— no todo tiene que ser constante: **preguntar al usuario** si
   se puede hardcodear antes de crear una.

## Cómo buscar contexto sin gastar de más

1. **Al empezar, alcanza con este archivo.** No leer el vault entero ni recorrer `src/`.
2. **Antes de una tarea, ubicar**: qué funcionalidad se toca, qué reglas de negocio la condicionan,
   qué módulos pueden verse afectados y qué notas lo cuentan (tabla de abajo). Leer **solo** esas.
3. **En una nota larga, leer solo la sección.** Primero los encabezados (grep de `^#` en la nota) y
   después el rango de esa sección. Para el código, `docs/Frontend/Mapa de archivos.md` dice qué
   archivo; después un grep del nombre de la función y leer ese tramo, no el archivo entero.
4. **Documentación primero, código para confirmar.** No re-analizar un módulo que la nota ya
   explica; sí verificar en el código todo comportamiento crítico antes de cambiarlo.
5. **Contexto proporcional**: un cambio de texto o de estilo no necesita el vault; un cambio
   de una pantalla, su nota y la del sector; un cambio transversal, además los invariantes.
6. **Sin falsas economías**: si el cambio toca plata, estados del pedido, reglas de seguridad,
   fechas o sucursales, leer `docs/Invariantes y dependencias.md` siempre.

| Vengo a… | Leer |
|---|---|
| Entender el negocio | `docs/Negocio/Reglas de negocio.md` |
| Qué hace una persona en la noche | `docs/Negocio/Sectores/Sectores.md` → la nota de su sector |
| La jornada, la hora, el horario web, el horario especial | `docs/Negocio/Jornada y horarios.md` |
| Cambiar el `estado` de un pedido | `docs/Negocio/Modelo de estados.md` + `docs/Negocio/Flujo del pedido.md` |
| Deliverys, viajes, vuelto, pago al repartidor | `docs/Negocio/Logística de deliverys.md` |
| Productos, categorías, combos, publicar el menú | `docs/Negocio/Catálogo.md` |
| El arqueo, el F4, Métricas, Estadísticas | `docs/Negocio/Arqueo y estadísticas.md` |
| Sueldos y horas | `docs/Negocio/Asistencias y liquidacion.md` |
| Rutas, guards, providers, una pantalla nueva | `docs/Frontend/Frontend.md` |
| La Caja (pantalla) | `docs/Frontend/Gestion interna/Caja.md` |
| Otra pantalla del staff | `docs/Frontend/Gestion interna/Gestion interna.md` |
| La web pública (pedido, seguimiento, `/menu`) | `docs/Frontend/Web publica/Web publica.md` (+ `Marca web.md` para el estilo) |
| Cómo escribir código acá, variables de entorno, tests | `docs/Frontend/Convenciones y preferencias.md` |
| Colecciones y campos | `docs/Firebase/Firestore/Modelo de datos Firestore.md` |
| Costo de una lectura o escritura | `docs/Firebase/Firestore/Mapa de operaciones Firestore.md` |
| Reglas de Firestore | `docs/Firebase/Firestore/Reglas de Firestore.md` |
| Login, roles, admin, alta y baja | `docs/Firebase/Authentication.md` y `docs/Firebase/Cloud Functions.md` |
| `menu.json`, fotos, TSV, `storage.rules` | `docs/Firebase/Storage.md` |
| App Check, deploy, config de Firebase | `docs/Firebase/Firebase.md` |
| Algo que parece raro o "mal" | `docs/Deuda tecnica/Historial de decisiones.md` → la nota del tema, **antes de "arreglarlo"** |
| Qué falta, qué se decidió no hacer | `docs/Deuda tecnica/Deuda tecnica.md` |
| Un término que no se entiende | grep del término en `docs/Glosario.md` |

## Cómo trabajar en este repo

- **Antes de un cambio de varias partes o varios archivos, presentar el plan** —qué cambia, dónde,
  las decisiones con sus alternativas— y esperar el OK. Un cambio puntual y explícito no lo necesita.
- Para verificaciones **No correr `npm run build`**, salvo pedido explícito. De necesitar un build
  pedir al usuario. La verificación es `npx eslint --ext .js,.jsx --max-warnings=0 src` (sin
  `--ext`, ESLint saltea los `.jsx` sin avisar) y `npm test`.
- **No hacer commits, push ni operaciones de git** salvo pedido explícito.
- **La config de Firebase se versiona, los secretos no.** `firebase.json`, `firestore.rules`,
  `storage.rules` y `functions/src` están en el repo y se despliegan con `firebase deploy`. Los
  `.env` (raíz y `functions/`) siguen ignorados. Los **índices no se declaran** en `firebase.json`,
  a propósito: se manejan desde la Consola. **Las reglas las despliega el dueño**: se editan en el
  repo y no se despliegan sin pedido.
- **El rol admin no se asigna desde la app.** Los administradores se crean a mano en la Consola de
  Firebase, y ser admin se resuelve con un custom claim en el token, no con una lectura.
- **Los horarios de cada sucursal son datos en Firestore**, no código: si hace falta cambiarlos
  para probar algo, pedírselo al usuario. Para probar de día, `REACT_APP_modoTest=true` (solo con
  `npm start`).
- Tablas con `TablaGenerica`, montos con `fmtPesos`, fechas con `fmtFecha`/`fmtHora`/`fmtFechaHora`
  (`Utils/formato.js`: los nombres de días y meses salen de moment, no de listas a mano), las
  confirmaciones con `Swal.fire`. Un `console.error` sin aviso visible al usuario cuenta como bug.
  En las pantallas del admin, tabla + botón "Agregar" + **modal**, nunca un panel debajo.
- **Los finales de línea están mezclados** en el working tree, y da igual: `core.autocrlf=true`
  normaliza todo a LF al commitear, así que el diff sale limpio igual. Pero un patrón multilínea
  tiene que tolerar los dos (`\r?\n`) o detectar el del archivo antes de reemplazar: asumir CRLF
  hace que el reemplazo falle en silencio.
- Las sugerencias, alternativas y mejoras son siempre bienvenidas. Solo se pide traer el motivo y
  el costo en lecturas de Firestore junto con la propuesta.

## Comandos

```bash
npm start                                          # dev en localhost:3000
npm test                                           # 9 baterías de tests, funciones puras
npx eslint --ext .js,.jsx --max-warnings=0 src     # verificación sin build
node docs/.herramientas/verificar-enlaces.mjs      # enlaces del vault y rutas de este archivo
```

## Cuándo actualizar el vault

Cuando cambia algo de fondo —una regla de negocio, una estructura de datos, una regla de
seguridad, cómo se calcula un número, una integración—:

1. Grep del nombre de la función o del campo en `docs/` para ver qué notas lo nombran, y
   actualizar **solo esas**. Cada tema vive en una nota; las demás lo enlazan.
2. Si se eligió entre alternativas, el porqué va en la nota del tema y una línea con la fecha en
   `docs/Deuda tecnica/Historial de decisiones.md`.
3. Si cambia algo que no se puede romper, actualizar `docs/Invariantes y dependencias.md`.
4. Fecha en `actualizado:` de cada nota tocada, y correr el verificador de enlaces.
5. Este archivo se toca solo si cambia una instrucción, una regla de arriba o la ubicación de una
   nota.

No se registran arreglos menores ni el diario de una sesión: el historial de cambios es git, y el
vault guarda **cómo funciona hoy y por qué**. **El vault es un árbol**: los únicos wikilinks son
nota → su hub (la línea `↑` del principio) y hub → sus hijas; cualquier otra referencia a una nota
va en cursiva, *Nota › Sección*. Una nota nueva va en la carpeta de su área, enlazada desde su hub
y agregada a `docs/Mapa del vault.canvas`. El verificador marca los enlaces fuera del árbol.

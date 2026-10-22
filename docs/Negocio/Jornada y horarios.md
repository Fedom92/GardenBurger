---
tags: [gardenburger, negocio]
aliases: [Jornada comercial, Horario web, Excepciones de horario, Horario especial]
actualizado: 2026-10-22
---

# Jornada y horarios

↑ [[Reglas de negocio]]

## Jornada comercial

**La jornada va de `HORARIO.horaAbre` (19) a `HORARIO.horaCierre` (2), siempre.** Es lo que
significa "hoy" en todo el sistema —arqueo, resúmenes guardados, Métricas, buscadores, historial,
asistencias—. Un pedido de las 00:30 pertenece a la noche anterior. El id de una jornada es el día
en que empieza, `DD-MM-YYYY`: el de los documentos de `resumenDiario` y `asistencias`.

**No es el horario de atención**: es el rango que agrupa los pedidos de una noche, con margen. El
horario de cada sucursal está en su documento (abajo) y tiene que caer adentro.

Todo sale de `src/Utils/fechaComercial.js`:

| Función | Para qué |
|---|---|
| `getFechaComercial()` | la jornada de **ahora** |
| `getFechaComercialDe(fecha)` | la jornada de **cualquier** fecha: un pedido de las 00:30 da la noche anterior |
| `getRangoDeJornada(jornada)` / `getRangoJornada()` | `{inicio, fin}` de una jornada (19 a 02), o de la en curso. Lo usan F3, el Historial y el arqueo |
| `jornadaEstaAbierta(jornada)` | si es la en curso: la abierta no tiene resumen guardado |
| `momentDeJornada` / `jornadaQueEmpieza` / `momentDeHoy()` | leer y escribir el id `DD-MM-YYYY`; el "hoy" de los filtros |
| `getJornadaDeFecha(date)` | versión pura para datos históricos (Estadísticas) |
| `esHoraDeArqueo()` | si es de `HORA_HABILITA_STATS` (00) a `horaCierre`: la ventana del F4 |
| `ahoraServidor()` / `sincronizarHoraServidor()` | la hora corregida por el servidor (abajo) |
| `horaEnJornada(hora)` | horas desde el inicio de la jornada (19 → 0, 00 → 5): compara horas de una noche que cruza la medianoche |
| `webRecibePedidos`, `horaCorteWeb`, `textoHorarioWeb`, `textoExcepcionWeb`, `errorDeHorario` | el horario web de cada sucursal (abajo) |
| `HORARIOS_ESPECIALES`, `opcionesHorarioEspecial` | el selector de horario especial (abajo) |

Tiene tests: `Utils/fechaComercial.test.js`.

> [!warning] El hueco de 02:00 a 19:00 es intencional
> Entre el cierre y la apertura no hay jornada: lo que se cargue ahí no aparece en F3 ni en el
> Historial, y **tampoco entra en ningún arqueo**. Si un pedido "no aparece", la primera pregunta
> es a qué hora se creó. El 04-10-2026 apareció uno a las 02:04: era una prueba del dueño. Se
> propuso correr el corte a las 06:00 y se rechazó. Qué hacer con lo que se cobre fuera de horario
> sigue abierto: *Deuda tecnica › A futuro*.

> [!note] El cierre a las 2 es margen, no horario real
> No se trabaja pasada la 1: las 02:00 se pusieron por las dudas. Por eso los "bordes de
> medianoche" que parecen bugs casi nunca son alcanzables. Confirmar el horario real antes de
> diseñar una corrección.

### La hora sale del servidor

**Hay PCs en el local con el reloj mal.** Cualquier fecha armada a mano sale de `ahoraServidor()`
—`moment()` corregido por el offset contra la Cloud Function `horaServidor`—, nunca de `new
Date()`. Lo que se graba con la hora del momento va con `serverTimestamp()`.
`sincronizarHoraServidor()` se llama una sola vez, en `LayoutStaff`: los visitantes públicos no
gastan invocaciones. Si falla, avisa y se usa la hora de la PC.

**La zona horaria también se fija.** `index.js` hace `moment.tz.setDefault('America/Argentina/Buenos_Aires')`:
`ahoraServidor()` corrige el **reloj** (minutos de desfase), esto corrige la **zona** (una PC en
UTC mandaría el pedido a otra jornada). Se importa el build de moment-timezone **de 10 años**
(44 KB en vez de 703 KB, el 38 % del bundle): Argentina está fija en −03 desde 2009, así que da la
misma hora para cualquier fecha. Si Argentina vuelve a cambiar el horario, alcanza con actualizar
el paquete.

### Por qué la jornada vive en código y no en el `.env`

Hasta el 26-09-2026 eran `REACT_APP_horaAbre` y `_horaCierre`. No son secretos, y las variables
`REACT_APP_` se meten en el bundle al hacer el build: el `.env` no daba flexibilidad, cambiarlas
era igual un build y un deploy. En `Constantes.jsx` quedan versionadas y en un solo lugar.

### Probar de día: `REACT_APP_modoTest`

Para desarrollar sin limitaciones de horario (12-10-2026). Con `REACT_APP_modoTest=true` en el
`.env`, `MODO_TEST` hace que:

| Qué | Normal, de día | Con la variable |
|---|---|---|
| La web (`webRecibePedidos`) | cerrada | abierta en todas las sucursales activas |
| El F4 (`esHoraDeArqueo`) | deshabilitado hasta las 00 | habilitado |
| La jornada **en curso** (`getRangoDeJornada`) | de 19 a 02 | de 02 a 02: F3, Historial, F4 y Deliverys ven lo cargado de día |
| El horario especial | solo lo que no pasó | todos los horarios |

- **Solo con `npm start`**: la condición incluye `NODE_ENV === "development"`; el build la ignora
  aunque quede en `true`.
- **Las jornadas pasadas no cambian de rango**: un resumen guardado grabado desde desarrollo sale
  igual que en producción.
- La barra del staff muestra "Modo test". Cambiarla pide reiniciar `npm start`.

## Horario de la web de cada sucursal

Desde el 28-09-2026 **cada sucursal tiene su horario** en su documento
(`sucursales/{id}.horario`), editable desde el Panel Admin sin deploy:

| Campo | Qué es |
|---|---|
| `dias` | días de atención, por **jornada** (0 = domingo) |
| `abre` / `cierra` | horas enteras, dentro de la jornada comercial |
| `horasCorte` | cuántas horas antes del cierre la web deja de tomar pedidos |

Los valores actuales (Davinci de 19 a 00, Luro de 19 a 01, según el dueño el 22-10-2026) son datos,
no código: ver [[Reglas de negocio#Las sucursales]].

Lo decide `webRecibePedidos(sucursal)`:

- Primero mira si esa noche tiene una **excepción** (abajo); si no, el horario de siempre.
- **Los días van por jornada**: el lunes a las 00:30 todavía es la noche del domingo.
- **El corte es `horasCorte` antes del cierre**: una solicitud que entrara sobre el cierre ya no se
  llega a cocinar.
- **Sin horario cargado, la sucursal no toma pedidos**: mejor cerrada que abierta a cualquier hora.
- **Una sucursal desactivada no toma pedidos, ni por el link directo**.
- **El ABM solo ofrece horas de la jornada** (`HORAS_JORNADA`) y valida que el corte quede entre la
  apertura y el cierre (`errorDeHorario`).
- **Viaja en `menu.json`**: la web lo mira sin leer Firestore. Cualquier cambio de una sucursal se
  publica solo (`publicarSucursales()`, 2-3 lecturas). Ver *Storage › menu.json*.
- **Se mira al entrar y otra vez al confirmar**, la segunda con el documento de la sucursal que la
  web ya lee para validarla (0 lecturas extra).
- **Solo en el front, por decisión.** Alguien que arme el pedido a mano podría crear una solicitud
  fuera de horario: aparece pendiente y el cajero la rechaza. Cerrarlo en las reglas obligaría a
  repetir días y horas en `firestore.rules`, en UTC: dos fuentes para lo mismo.
- Usa el reloj del celular del cliente, en hora argentina aunque el teléfono tenga otra zona.
- **La Caja no mira el horario**: trabaja cualquier día. `/ver-pedido` y `/menu` tampoco cierran.

### Excepciones: feriados y noches puntuales

Desde el 12-10-2026. Un lunes feriado que se abre, un sábado que se cierra por un corte de luz.
**Valen para una sola jornada**: al día siguiente la web vuelve sola a su horario, así nadie tiene
que acordarse de deshacerlas.

- **Las carga solo el admin**, desde el modal de excepciones de cada sucursal (pestaña Sucursales):
  una para cualquier día de hoy en adelante, las vigentes con una cruz para quitarlas y "Ver
  historial completo".
- **Abrir usa siempre el horario de la sucursal**; una sucursal sin horario no puede abrir por
  excepción.
- **Mandan sobre el horario de siempre**: la de cierre cierra aunque sea día de atención; la de
  apertura abre aunque ese día no se atienda.
- **Solo las de cierre llevan motivo**, obligatorio, y el admin elige si se ve en la web ("Hoy
  cerrado · Inventario"). El cambio de horario se muestra siempre.
- **Una por noche**: cargar otra para la misma fecha reemplaza a la anterior, que queda levantada.
- **Nada se borra**: quitar una la marca como levantada, con quién y cuándo.
- **0 lecturas para el público**.

**Por qué viven en dos lugares.** Un `writeBatch` escribe a la vez:

| | `sucursales/{id}.excepcionesWeb` | `sucursales/{id}/excepcionesHorario` |
|---|---|---|
| Para qué | lo que mira la web | el historial |
| Qué tiene | solo hoy y lo que viene; el motivo **solo si es público** | todo, con el motivo interno y quién la cargó |
| Quién lo lee | la web, desde `menu.json` y del documento que ya lee al confirmar | el admin, al tocar "Ver historial" (de a 20) |

Solo en el documento de la sucursal, el motivo interno quedaría a la vista de cualquiera (es de
lectura pública y viaja en `menu.json`) y crecería para siempre. Solo en la subcolección, la web
pagaría una lectura más por pedido. El mapa se limpia de jornadas vencidas en cada escritura. Lo
hace `Utils/excepcionesHorario.js`.

## Horario especial

Un pedido encargado para más tarde. La Caja graba **la hora pedida en `timestamp`**, sobre el día
de la **jornada en curso** (`momentDeHoy()`), y marca `esHorarioEspecial: true`. O sea: **en un
pedido con horario especial, `timestamp` no es cuándo se cargó sino cuándo tiene que estar
listo.** Con eso cae en la franja horaria correcta de las estadísticas.

- Un selector de **20:00 a 23:45, cada 15 minutos** (`HORARIOS_ESPECIALES`). Arranca a las 20
  aunque se abra a las 19, por decisión del dueño (14-09-2026): nadie encarga para las 19:xx.
- `opcionesHorarioEspecial()` deja solo los que todavía no pasaron; **pasadas las 23:45 el botón ⏱
  desaparece** hasta la noche siguiente. Del cierre a la apertura se ofrecen todos. Tiene tests.
- **Por qué sobre la jornada** (14-10-2026): con el día calendario, un pedido cargado a las 00:20
  para las 23:00 quedaba para **mañana**, y su plata en el arqueo de la noche siguiente.

Lo que hace la cocina con estos pedidos: *Cocinero › Pedidos con horario especial*.

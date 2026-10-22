---
tags: [gardenburger, deuda, hub]
aliases: [Pendientes, Que falta, Estado del proyecto]
actualizado: 2026-10-22
---

# Deuda técnica

↑ [[GardenBurger]]

Lo que queda abierto, lo que se cerró **por decisión** y no hay que "arreglar", y lo que viene. Las
cuatro auditorías están procesadas (*Auditorias*); si un hallazgo no figura acá, está corregido.
Cuándo y por qué se decidió cada cosa: [[Historial de decisiones]].

## Cerrado por decisión, no por código

Cosas que se marcaron y el dueño decidió dejar como están. **No son olvidos y no se re-proponen**
salvo que aparezca un dato nuevo.

- **`horaServidor` sin App Check**: solo devuelve la hora y tiene que ser rápida
  (*Cloud Functions › horaServidor sin App Check, por decisión*).
- **"Cocinados TODOS" es el único botón de la cocina**: cada cocinero ve solo los suyos.
- **El horario especial arranca a las 20:00**, aunque se abra a las 19: nadie encarga para las 19:xx.
- **Re-precificar en silencio** al revisar una solicitud web, sin avisar al cajero.
- **El recargo de MP es una constante del `.env`** (`REACT_APP_recargoMP`): cambiarlo es un build y
  un deploy, y el dueño lo prefiere a editarlo desde el admin (26-09-2026).
- **`usuarios` es legible por todo el staff**, con valor hora y DNI: los usuarios internos no son la
  preocupación, y separar esos campos costaría lecturas al cargar asistencias (26-09-2026).
- **Un viaje se paga siempre**, se haya entregado o no; **el repartidor cobra sus horas más los
  envíos**, sin fijo (28-09-2026).
- **El F4 se habilita a la misma hora en todas las sucursales** (00:00), no según el cierre de cada
  una: eso obligaba a la Caja a leer su sucursal (28-09-2026).
- **La creación pública usa lista negra de campos, no blanca** (26-09-2026).
- **El horario de la web se controla solo en el front**: en las reglas habría que repetirlo en UTC.
- **La Caja no muestra el vuelto** (26-09-2026): el monto lo ven la jefa y, los vueltos a
  transferir, el encargado en el F4.
- **Los links de Google Drive en las fotos no se rechazan** (28-09-2026).

**De la auditoría del 11-10-2026** (respuestas del dueño, 12 y 13-10):

- **Sin claims de staff ni de sucursal en las reglas**: toda sesión es de un empleado; el aislamiento
  por sucursal queda en el front.
- **El Histórico de Estadísticas (los TSV) no se toca.**
- **Las categorías siguen relacionadas por nombre**: renombrar una no se protege.
- **La jefa de deliverys puede reasignar con el viaje en curso.** Lo que sí se cerró es cerrar un
  viaje **sin** repartidor.
- **Los pedidos trabados en COCINA por un cocinero ausente no se tratan.**
- **Sin servicio único de transiciones del pedido**, sin inventario de índices en el vault y sin
  visibilidad de productos por sucursal.
- **El teléfono no pasa a ser el id de los clientes.**
- **El carrito sigue guardando la ficha entera del producto**, y editar un producto no permite
  precio 0.
- **Asistencias**: las horas las carga el encargado y el admin solo el valor hora; no se protege la
  carga simultánea.
- **`darDeBajaUsuario` no necesita cambios.**
- **La Liquidación no se limita a las noches cerradas**: la de hoy aparece sin envíos, que están en
  el F4.

## Abierto por decisión

### `asistencias` abierta en reglas, cerrada solo por front

Cae bajo el comodín de subcolecciones de `sucursales`, así que **cualquier staff con sesión puede
leer y escribir los sueldos** desde la consola del navegador. La barrera es el front: `/asistencias`
solo para el encargado y `/liquidacion` solo para el admin. Se evaluó cerrarla con un claim
`encargado` —con los claims, una regla por rol es gratis— y el dueño la descartó.

Si se reconsidera: hace falta el claim `encargado` repartido por `sincronizarClaims`, y **excluir
`asistencias` del comodín** como se hace con `pedidos`: agregar una regla más específica no
restringe nada (*Reglas de Firestore › Las reglas se combinan con OR*).

### El pipeline no valida transiciones de estado

Las reglas de `update` validan tres cosas puntuales —la toma de la solicitud, no anular un viaje en
la calle (04-10) y que un anulado lo mueva solo el admin (14-10)—, pero no el estado de origen en
general: **dos pantallas pueden pisarse el estado** y gana la última. Eso ya no descuadra la plata
(el arqueo se calcula y es idempotente), solo el estado. Cerrarlo del todo tocaría todas las
escrituras del pedido. Ver *Modelo de estados › Transiciones que se permiten y no deberían*.

### Sobre CRA

`react-scripts` está discontinuado y origina la mayoría de las vulnerabilidades de `npm audit`
—todas de herramientas de build, ninguna llega al navegador—. Migrar a Vite es un proyecto en sí
mismo y **no se recomienda ahora**. El code splitting se hizo sobre CRA sin necesitarlo.

> [!danger] No correr `npm update` a secas
> Actualiza **todo el árbol**, incluidas las dependencias internas de CRA. El 04-10-2026 subió
> TypeScript de 4.9 a 7, que no tiene la API que usa el ESLint de CRA: el lint (y con él `npm start`
> y el build) dejó de funcionar. Se actualiza **paquete por paquete**: la versión en `package.json` y
> `npm install`, que deja el resto como está en `package-lock.json`.

**Todo a la última versión, antes de producción (04-10-2026)**, revisando el changelog de cada
paquete contra lo que la app usa:

| Paquete | De → a | Qué hubo que tocar |
|---|---|---|
| `firebase` | 9.23 → 12.19 | Nada por la versión; aparte, Auth pasó a `initializeAuth` |
| `react` / `react-dom` | 18.2 → 19.3 | Nada: ya usaba `createRoot` y ninguna API que la 19 quitó |
| `react-router-dom` | 6.14 → 7.18 | Nada: `BrowserRouter`, sin rutas comodín ni links relativos |
| `@tanstack/react-table` | 8 → 9 | `TablaGenerica` migró a `useTable` + `tableFeatures` |
| `react-icons` | 4 → 5 | Nada |
| `html2pdf.js` | 0.12 → 0.14 | Trajo jspdf 4 (cierra el advisory crítico). Se sacó el 16-10: `/menu` usa `html2canvas` y `jspdf` directos |
| resto | — | Última versión de su mayor: react-hook-form, recharts, sweetalert2, moment, react-toastify |
| `functions/` | admin 13 → 14, functions 7.4, TS 7 | Los imports de admin 14 (*Cloud Functions › firebase-admin 14*); se sacó `firebase-functions-test` |

CRA (`react-scripts` 5.0.1) sigue siendo el techo. El dueño lo probó en pantalla con `npm start` y
`npm run build`: tablas, navegación, modales, login y PDF, todo OK.

## Riesgos latentes (no son bugs hoy)

- **"Entregado sin repartidor" cuenta en "Envíos" del F4**: separa mal, no descuadra el total
  (*Logística de deliverys › Riesgo conocido*).
- **Divergencia de combos** entre la jornada y el Histórico si una descripción difiere
  (*Catálogo › Combos*).
- **Las Estadísticas Históricas dependen de TSV exportados a mano**: un export incompleto falsea
  Combos y Stock sin avisar. Pendiente re-exportar julio 2026.
- **Un pedido web de total $0 daría error al confirmar**: la regla exige `total > 0`, y la web
  muestra los productos de $0 que no están marcados como privados. Solo pasaría con un pedido hecho
  únicamente de cosas sin cargo. Visto el 22-10-2026, sin decidir.

## Deuda de mantenibilidad (sin urgencia)

- **`Caja.jsx` (~900 líneas)**: ya extrajo sus hooks; falta separar el render del panel de productos
  y del ticket.
- **Tests**: lo puro que falta cubrir, en *Convenciones y preferencias › Tests*.

## A futuro

- **Calcular el envío en la web con Google Maps** (pedido del dueño, 16-10-2026). Hoy el cajero elige
  la zona. Lo que hay que decidir antes:
  - **Las zonas viajarían en `menu.json`**, como las sucursales: leerlas en cada visita costaría 1
    lectura por zona y por cliente.
  - **Cada sucursal necesita coordenadas** (hoy solo tiene dirección en texto).
  - **Distancia en línea recta o por calle**: en línea recta es gratis pero da menos; por calle
    necesita la API de rutas, que se factura por consulta, igual que el autocompletado de
    direcciones. Hace falta una clave de Maps restringida al dominio.
  - **El envío de la web sería una sugerencia**: el cajero lo confirma al revisar, como hoy el
    precio. Guardado en la solicitud, `useRevisarSolicitud` podría preseleccionar la zona.
- **Que el encargado pueda cerrar la web de su sucursal**: las excepciones son solo del admin; haría
  falta un claim `encargado` y una regla que le deje tocar solo `excepcionesWeb` de su sucursal.
- **CRM de clientes**, sin diseñar.
- **Compartir las páginas de `/menu` desde el celular** con `navigator.share`. No cuesta lecturas.
- **Qué hace el sistema fuera del horario laboral** (auditoría 11-10-2026): un pedido cobrado antes
  de las 19 o después del cierre no entra en ningún arqueo. ¿Bloquear la Caja, avisar?
- **Cloud Function al cierre (02:05)** que guarde el resumen de cada sucursal, y un **bot de
  Telegram** con los números del F4. Antes hay que decidir cómo comparten la app y la función el
  cálculo (propuesta: un solo archivo que el deploy de Functions copie).
- **Agrupar las hamburguesas por tamaño en la web** (foto e ingredientes por tamaño): hoy se muestran
  los del DOBLE.
- **Gestión de pedidos de otras jornadas** desde la Caja (por eso queda `getNextSequence`).

## Lo que se revisó y está bien

Para no re-auditar: todos los `onSnapshot` devuelven su `unsubscribe`; los `useRef` de queries
evitan recrear referencias; la numeración de tickets es atómica con el pedido; `fetchMenuPublico`
cachea la promesa; **no hay ningún patrón N+1** (ningún bucle hace un `getDoc` por ítem); no hay
código muerto ni dependencias de más; `menu.json` con `max-age=60` revalida con 304 y cuerpo vacío.

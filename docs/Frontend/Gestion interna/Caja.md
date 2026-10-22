---
tags: [gardenburger, frontend, staff, caja]
aliases: [POS, Caja (pantalla)]
actualizado: 2026-10-22
---

# Caja

↑ [[Gestion interna]]

La pantalla del POS (`components/POS/Caja.jsx`, ~900 líneas, con nueve hooks en `pos_hooks/`). Las
reglas de cobro están en *Cajero*; esta nota cuenta cómo está hecha y por qué.

## Atajos y modales

| Atajo | Modal | Qué hace |
|---|---|---|
| **F1** | `pos_modales/Alertas/PendientesSolicitudes` | Solicitudes web pendientes, con la toma de un solo dueño |
| **F2** | `pos_modales/Alertas/PendientesMP` | Pedidos que esperan el cotejo de la transferencia |
| **F3** | `pos_modales/BuscarPedido` | Buscar en la jornada y, si es el encargado, eliminar |
| **F4** | `pos_modales/ResumenDiario` | El arqueo y los pagos de la noche; presentacional, los datos los trae `verResumen` |
| **/** | — | Ir al buscador de productos (no si se está escribiendo en otro campo) |
| **Esc** | — | Cancelar el ticket: con carrito pide confirmación; con un modal o un cartel abierto, Esc es de ese modal |

F1 y F2 se prenden con `usePendientes`: dos listeners con `limit(1)`, porque solo necesitan saber
**si hay** pendientes. Los trae el modal al abrirse. Por eso el chip de F2 tiene un punto que titila
y no un número: contar exigiría traerlos todos.

## Guardar un pedido

`guardarBD` corre envuelto en `useAccionUnica` (doble click) y hace **una `runTransaction`** con dos
cosas: avanzar el contador y escribir el pedido. Cuesta **1 lectura + 2 escrituras**. Después
registra al cliente (`registrarCliente`), fuera de la transacción.

> [!caution] Dos cosas que rompen sutilmente si se tocan
> - **El id del pedido se genera fuera del callback**: adentro, cada reintento de la transacción
>   crearía un documento distinto.
> - **Todas las lecturas van antes que cualquier escritura**, como exige `runTransaction`.

**El pedido tiene id fijo hasta limpiar el ticket** (14-10-2026). `pedidoEnCurso` (un `useRef`)
guarda el id del primer intento y lo reusa hasta `limpiar()`. Si un intento falla, el siguiente lee
ese pedido dentro de la transacción: si ya existe, el anterior llegó a guardarse y se muestra "El
pedido ya se había guardado" sin escribir nada. **Por qué**: si internet se corta justo después de
que Firebase guardó, la Caja ve un error; con un id nuevo por click, el reintento creaba un segundo
pedido con otro número. El guardado normal no cuesta nada extra. Las solicitudes web no tienen el
problema: escriben sobre su propio id.

Si las reglas rechazan el guardado de una solicitud (la tomó otro o se rechazó mientras se cargaba),
avisa "La solicitud ya no está disponible" y limpia el ticket.

## F3 absorbió a `EliminarTickets`

Eran casi el mismo archivo, y buscar y después eliminar costaba **dos lecturas de la jornada
entera**. Unificado: buscar por **código** es una consulta directa; por teléfono o dirección lee la
jornada **una vez por apertura del modal**, no en cada búsqueda. No filtra por estado a propósito: el
cajero tiene que poder ver un ticket en cualquier instancia.

## Alto fijo de 100vh

La pantalla mide `100vh` y tiene **dos zonas que scrollean por separado** (productos y ticket). La
`.row` de Bootstrap necesita `flex-wrap: nowrap`, o los paneles se estiran al contenido y rompen el
layout. El ticket se puede cambiar de lado y redimensionar (`useTicketLayout`). Los estilos van en
`Caja.css`, bajo `#caja`.

> [!tip] Depurar CSS acá
> Al segundo intento fallido, parar de editar y poner un `outline: 4px solid red` de testigo para
> ver qué caja se está estirando de verdad.

## El rediseño vino de Claude Design

Se rehízo en ago-2026 a partir del artboard **2a — Densidad y teclado v2** del proyecto *"Diseño
alternativo para POS"* de Claude Design: un `.dc.html` que es una especificación visual, no código.
`support.js` de ese proyecto es el motor del canvas (`dc-runtime`) y no sirve en la app. Leerlo
requiere `/design-login` y la herramienta `DesignSync`.

**Divergencias deliberadas — no "arreglarlas" de vuelta:**

| El diseño decía | Qué se hizo | Por qué |
|---|---|---|
| Envío por kilómetros, 4 rangos con precio fijo | El selector de zonas de `envios` | Hardcodear precios rompe el ABM de envíos y ata todas las sucursales a los mismos valores |
| Control `− 2 +` en cada línea | Cantidad como número + ✕ | El `+` no puede usar `handleAgregarAlCarrito`: solo acumula sobre **el último** ítem, y en una fila del medio duplicaría el renglón |
| Badge numérico en F2 | Punto y titileo | `usePendientes` usa `limit(1)` a propósito |
| Sin "Paga con" | Se agregó | `validarPedido` exige `pagaCon >= total` en efectivo |
| Topbar de 46 px en `#14161a` | 50 px en `var(--color-menu)` | Es el alto del botón del menú colapsado, que flota encima; más baja o de otro negro, el logo se ve como una pieza aparte |

La fila "Vuelto" que proponía el diseño **no va**: decidido el 26-09-2026 (*Cajero › Cobrar un pedido*).

## Deuda

`Caja.jsx` ya extrajo sus hooks, que era lo importante. Lo que queda por separar es el **render**:
el panel de productos y el ticket son dos componentes en un archivo. Sin urgencia.

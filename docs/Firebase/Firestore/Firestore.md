---
tags: [gardenburger, firebase, firestore, hub]
aliases: [Cloud Firestore, Base de datos]
actualizado: 2026-10-22
---

# Firestore

↑ [[Firebase]]

| Nota | Para |
|---|---|
| [[Modelo de datos Firestore]] | Las colecciones y sus campos reales |
| [[Reglas de Firestore]] | Quién puede leer y escribir qué, y por qué |
| [[Mapa de operaciones Firestore]] | Cada lectura y escritura del sistema, con su costo |

## Lo que hay que saber del SDK

- **`getDocs()` / `getDoc()` siempre van al servidor y se facturan**, aunque haya caché. Para leer
  de la caché hay que pedir `getDocsFromCache()` explícitamente, y hoy nadie lo hace.
- **`onSnapshot`** factura cada documento del set inicial y después solo los que cambian. Con la
  caché persistente (abajo), **al re-montar el servidor manda solo los cambios**: para algo que se
  relee seguido, **un listener sale más barato que un `getDocs`**. Un listener desconectado más de
  30 minutos se cobra como consulta nueva.
- `deleteField()` dentro de un `set(..., {merge: true})` no cuesta operación extra.
- **`increment()` es atómico pero no idempotente**: si la misma operación corre dos veces, suma dos
  veces. Por eso el arqueo dejó de usarlo; sigue donde un conteo aproximado alcanza
  (`clientes.cantidadPedidos`).
- Un rango sobre **un solo campo** usa el índice automático; filtrar por dos campos con rango pide
  un índice compuesto (se crea desde la Consola).
- Firestore ignora los documentos que **no tienen** el campo de un filtro: por eso las solicitudes
  web sin cobrar no aparecen en las consultas por `timestamp`.

## Persistencia en IndexedDB, modo una sola pestaña

**Qué**: `persistentLocalCache({ tabManager: persistentSingleTabManager({}) })`.

**Historia**: durante meses fue `memoryLocalCache()`, porque el modo **multi-pestaña** rompía la
sesión. Ese modo elige una pestaña "primaria" que abre las conexiones por todas; como la sesión de
Auth es por pestaña, si la primaria era una pública en `/ver-pedido` las lecturas del staff salían
con esa credencial y volvían `permission-denied`, al azar.

**Por qué ahora sí** (verificado en el SDK, también al pasar a firebase 12): en **single-tab no hay
primaria ni delegación**, cada pestaña usa su propia conexión y credencial. Si IndexedDB no se puede
tomar (una segunda pestaña), el SDK cae solo a caché de memoria con un **warning en consola que no es
un error**. La persistencia es por app (`persistenceKey = app.name`), no por origen.

**Qué gana**: los `onSnapshot` guardan su `resumeToken`, así que un F5 en la Cocina o el ATP, abiertas
toda la noche, deja de costar la jornada entera. **No ayuda a `getDocs`.**

## El catálogo de la Caja va por listener

`useTraerDatos` escucha productos, categorías y envíos con `onSnapshot`. Con `getDocs` releía las
tres colecciones en **cada montaje de la Caja** —cada F5, cada vuelta desde otra pantalla— y era el
mayor costo recurrente del sistema. Con la caché persistente, al re-montar llegan solo los cambios, y
de regalo un precio que cambia el admin llega a la Caja abierta sin recargar.

| Alternativa descartada | Por qué no |
|---|---|
| Caché propia en `localStorage` con marca de jornada | Código propio, botón "Actualizar catálogo", y un precio cambiado a mitad de turno no llegaba |
| Provider por encima de las rutas | Evita releer al navegar, pero el F5 sigue costando todo |
| Reusar `menu.json` | Cero lecturas, pero se actualiza solo al publicar: riesgo real de **cobrar un precio viejo** |

Cuánto honra el servidor un resume token es política suya: tras una noche cerrado, la primera carga
probablemente sea completa. Es el objetivo: una lectura del catálogo por PC por noche.

**Productos (el ABM) va igual desde el 28-09-2026**, con las **mismas consultas** que la Caja, así
una PC que abre las dos pantallas comparte la caché. La tabla no se actualiza a mano después de
guardar: el listener muestra cada escritura al instante.

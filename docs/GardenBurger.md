---
tags: [moc, gardenburger]
aliases: [GardenBurger MOC, Indice GardenBurger, Inicio]
actualizado: 2026-10-22
---

# GardenBurger

Sistema de gestión para una hamburguesería **multi-sucursal** (hoy Davinci y Luro): la Caja, la
Cocina, el mostrador (ATP), los deliverys, las asistencias y sueldos, el menú online y el panel
de administración. SPA en React 19 con Firebase.

**Todavía no está en producción** (22-10-2026): en los locales se sigue usando el sistema viejo,
hecho con App Script y Google Sheets. Lo único que el sistema nuevo toma de él son los exports que
alimentan las Estadísticas Históricas (*Arqueo y estadísticas › Estadísticas Históricas: los TSV del sistema viejo*).

> [!info] Para qué sirve este vault
> Es el conocimiento del proyecto destilado: leer la nota justa evita releer `src/`. Si una nota
> contradice al código, **gana el código** y hay que corregir la nota. El `CLAUDE.md` de la raíz
> es la puerta de entrada para un asistente; este nodo es la de Obsidian.

## Las áreas

| Área | Qué hay |
|---|---|
| [[Reglas de negocio]] | El negocio en una página, los **sectores** (cliente, cajero, cocinero, ATP, jefa de deliverys, repartidor, encargado, admin), la jornada, el flujo y los estados del pedido, la logística de deliverys, el catálogo, el arqueo y los sueldos |
| [[Frontend]] | Rutas, guards y providers; las convenciones; el mapa de archivos; la **gestión interna** (las pantallas del staff) y la **web pública** |
| [[Firebase]] | App Check y la configuración; **Firestore** (datos, reglas, costo de cada operación), **Authentication**, **Storage** y **Cloud Functions**, cada uno con su seguridad |
| [[Deuda tecnica]] | Lo que queda abierto, lo cerrado por decisión y el historial de decisiones |
| [[Auditorias]] | Las cuatro auditorías integrales: fotos fechadas, no se actualizan |
| [[Glosario]] | Las palabras del negocio y del código, con la nota que desarrolla cada una |

Dos notas cruzan todas las áreas:

- [[Invariantes y dependencias]] — lo que no se puede romper, dónde se hace cumplir, y "si
  cambiás X, revisá Y". **Leerla antes de tocar plata, estados, reglas o sucursales.**
- [[Integraciones]] — los servicios de afuera: WhatsApp, Mercado Pago, Google Fonts, el sistema
  viejo.

## Lo principal, en cinco líneas

1. **"Hoy" es la jornada comercial, de 19 a 2**: un pedido de las 00:30 es de la noche anterior.
   Nada que se grabe usa `new Date()`, porque hay PCs con el reloj mal: va por `ahoraServidor()`.
2. **Las lecturas de Firestore se cuidan como requisito**, no como optimización.
3. **El arqueo se calcula desde los pedidos ENTREGADOS**; nadie lo acumula.
4. **Cada sucursal tiene sus pedidos, resúmenes, asistencias y contadores**; el catálogo, el
   personal y los clientes son de todas.
5. **Varios cajeros trabajan a la vez** sobre la misma sucursal: de ahí que una solicitud web
   tenga un solo dueño y que las acciones tengan guard contra doble click.

El detalle y el porqué, en [[Invariantes y dependencias]].

## Stack

React 19 (Create React App) · React Router 7 · Firebase 12 modular (Firestore, Auth, Storage,
Functions, App Check) · React Bootstrap y Bootstrap 5.3 · SweetAlert2 y React Toastify · React
Hook Form · Moment.js con moment-timezone · `@tanstack/react-table` 9 (debajo de `TablaGenerica`)
· Recharts · html2canvas y jsPDF (descargas de `/menu`). Cloud Functions en TypeScript, Node 24.

## Cómo se mantiene este vault

Cuando cambia algo de fondo —una regla de negocio, una estructura de datos, una regla de
seguridad, cómo se calcula un número, una integración—:

1. **Buscar qué notas lo nombran** (un grep del nombre de la función o del campo en `docs/`) y
   actualizar solo esas. Cada tema vive en **una** nota; las demás la nombran.
2. **Si es una decisión** —se eligió algo entre alternativas—, el porqué va en la nota del tema y
   una línea con la fecha en *Historial de decisiones*.
3. **Si cambia algo que no se puede romper**, actualizar [[Invariantes y dependencias]].
4. Poner la fecha en `actualizado:` de cada nota tocada.
5. **Verificar los enlaces**: `node docs/.herramientas/verificar-enlaces.mjs` desde la raíz del
   repo (también chequea las rutas del `CLAUDE.md`).
6. El `CLAUDE.md` se toca solo si cambia una instrucción, una regla crítica o la ubicación de
   una nota.

**No se registra:** un arreglo menor, un cambio de estilo, ni el diario de una sesión. El
historial de cambios es git; el vault guarda **cómo funciona hoy y por qué**. Las auditorías no se
editan: son fotos.

**El vault es un árbol, también en el grafo.** Los únicos enlaces internos son los del árbol:
cada nota abre con una línea `↑` hacia su hub, y cada hub enlaza a sus hijas. Cualquier otra
referencia va **en cursiva con el nombre de la nota**, *Nota › Sección*, y se abre con Ctrl+O. Una
nota nueva va en la carpeta de su área, con su `↑`, enlazada desde su hub y agregada al mapa. El
verificador marca como error cualquier enlace fuera del árbol.

## La vista organizada

[[Mapa del vault.canvas|Mapa del vault]]: el árbol dibujado, con un color por área y cada nota
clickeable. El grafo automático muestra el mismo árbol, con los mismos colores (el mapa está
oculto en el grafo con un filtro).

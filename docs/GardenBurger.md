---
tags: [moc, gardenburger]
aliases: [GardenBurger MOC, Indice GardenBurger]
actualizado: 2026-09-07
---

# GardenBurger — Mapa del proyecto

Sistema de gestión para una hamburguesería multi-sucursal: POS (Caja), Cocina, ATP (mostrador),
Delivery, asistencias y sueldos, menú online público y panel de administración. SPA en React 18
(CRA) con Firebase.

**Repo**: `d:\Escritorio\Proyectos\GardenBurger` · **Rama**: `main`

> [!info] Para qué sirve este vault
> Es el contexto destilado del proyecto: leer estas notas evita releer `src/` entero. Si una nota
> contradice al código, **gana el código** — y hay que corregir la nota.

> [!tip] Cómo llega acá un asistente
> El repo tiene un `CLAUDE.md` en la raíz que **se carga solo en cada sesión** y apunta a este
> vault, con las reglas que no se negocian. El vault no se carga solo: hay que abrirlo. Si el
> `CLAUDE.md` cambia de reglas, sincronizar con [[Convenciones y preferencias]].

## Por dónde empezar

Según qué vengas a hacer, con esto alcanza:

| Vengo a… | Leer |
|---|---|
| Entender el negocio | [[Reglas de negocio]] → [[Flujo del pedido]] |
| Tocar la Caja o Cocina | [[Flujo del pedido]] + [[Reglas de negocio]] + [[Mapa de operaciones Firestore]] |
| Agregar o cambiar una pantalla | [[Arquitectura y rutas]] + [[Mapa de archivos]] + [[Convenciones y preferencias]] |
| Tocar datos o reglas | [[Modelo de datos Firestore]] |
| Sueldos y horas | [[Asistencias y liquidacion]] |
| Entender por qué algo está "raro" | [[Decisiones tecnicas]] ← **leer antes de "arreglar" nada** |
| Saber qué falta | [[Deuda tecnica]] |

## Las cinco cosas que hay que saber sí o sí

1. **La jornada comercial va de las 19 a las 2**, y es lo que significa "hoy" en todo el sistema.
   Un pedido de las 00:30 pertenece a la noche anterior. Nunca `new Date()`: va por
   `ahoraServidor()`, porque **hay PCs en el local con el reloj mal**.
2. **Minimizar lecturas de Firestore es un requisito de primer orden**, no una optimización. El
   proyecto vive con un límite ajustado. Antes de agregar una consulta, preguntarse si el dato ya
   está en memoria.
3. **`increment()` no es idempotente.** Todo lo que mueve el arqueo va con guard
   (`useAccionUnica`) y dentro de un `writeBatch` junto al pedido.
4. **El sistema es multi-sucursal**: las colecciones operativas son subcolecciones de
   `sucursales/{id}/…`, y el scope lo dan `colSucursal`/`docSucursal` (staff) o la URL (público).
5. **Varios cajeros trabajan en paralelo** sobre la misma sucursal. De ahí el modelo de asignación
   de solicitudes web y los guards contra doble ejecución.

## Stack

- **React 18** (Create React App, no Vite) + **React Router v6**
- **Firebase 9.23.0** modular — Firestore, Auth, Storage, Functions, App Check
- **React Bootstrap** (modales) + **Bootstrap 5.3** (grid y utilidades)
- **SweetAlert2** para confirmaciones · **React Toastify** para avisos rápidos
- **React Hook Form** en Caja y CrearSolicitud
- **Moment.js** (+ moment-timezone) — formato `DD/MM/YYYY`
- **@tanstack/react-table** debajo de `TablaGenerica`
- **Recharts** en Estadísticas · **html2pdf.js** para exportar el menú

## Todas las notas

- [[Arquitectura y rutas]] — rutas, guards, roles, providers, multi-sucursal
- [[Modelo de datos Firestore]] — colecciones, campos reales, reglas de seguridad
- [[Flujo del pedido]] — estados, quién escribe qué en cada paso
- [[Reglas de negocio]] — jornada, combos, métodos de pago, horario especial
- [[Asistencias y liquidacion]] — horas trabajadas y sueldos
- [[Mapa de operaciones Firestore]] — cada lectura y escritura, con su costo
- [[Mapa de archivos]] — qué hace cada archivo, sin abrirlo
- [[Decisiones tecnicas]] — el porqué de lo que parece raro
- [[Deuda tecnica]] — lo que queda abierto, y por qué decisión
- [[Convenciones y preferencias]] — cómo escribir código en este repo

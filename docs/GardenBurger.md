---
tags: [moc, gardenburger]
aliases: [GardenBurger MOC, Indice GardenBurger, Inicio]
actualizado: 2026-09-26
---

# GardenBurger — Mapa del proyecto

Sistema de gestión para una hamburguesería multi-sucursal: POS (Caja), Cocina, ATP (mostrador),
Delivery, asistencias y sueldos, menú online público y panel de administración. SPA en React 19
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

> [!tip] Si es tu primera vez acá
> Leé **[[Glosario]]** y mirá **[[Mapa del sistema.canvas|el mapa del sistema]]**. Diez minutos, y
> el resto de las notas se entiende de corrido. El vault usa "arqueo", "solicitud" y "jornada
> comercial" como si fueran obvios, y no lo son.

Según qué vengas a hacer, con esto alcanza:

| Vengo a… | Leer |
|---|---|
| Entender las palabras que usa todo el mundo | [[Glosario]] |
| Ver el sistema de un vistazo | [[Mapa del sistema.canvas\|Mapa del sistema]] ← canvas: el pipeline y qué pantalla toca cada estado |
| Entender el negocio | [[Reglas de negocio]] → [[Flujo del pedido]] |
| Tocar la Caja o Cocina | [[Flujo del pedido]] + [[Reglas de negocio]] + [[Mapa de operaciones Firestore]] |
| Cambiar el `estado` de un pedido | [[Modelo de estados]] ← transiciones, quién las dispara, qué le hace al arqueo |
| Agregar o cambiar una pantalla | [[Arquitectura y rutas]] + [[Mapa de archivos]] + [[Convenciones y preferencias]] |
| Tocar datos o reglas | [[Modelo de datos Firestore]] + [[Reglas de seguridad]] |
| Sueldos y horas | [[Asistencias y liquidacion]] |
| Entender por qué algo está "raro" | [[Decisiones tecnicas]] ← **leer antes de "arreglar" nada** |
| Saber qué falta | [[Deuda tecnica]] |
| Ver el diagnóstico completo | [[Auditoria 2026-09-26]] ← la última, con la evidencia y las preguntas abiertas |

## Las cinco cosas que hay que saber sí o sí

1. **La jornada comercial va de las 19 a las 2**, y es lo que significa "hoy" en todo el sistema.
   Un pedido de las 00:30 pertenece a la noche anterior. Nunca `new Date()`: va por
   `ahoraServidor()`, porque **hay PCs en el local con el reloj mal**.
2. **Minimizar lecturas de Firestore es un requisito de primer orden**, no una optimización. El
   proyecto vive con un límite ajustado. Antes de agregar una consulta, preguntarse si el dato ya
   está en memoria.
3. **El arqueo se calcula desde los pedidos**, no se acumula con `increment()`. Ningún camino
   escribe `resumenDiario`: se escribe el pedido y el número sale de ahí. Ver
   [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]] para el porqué y el costo, y
   [[Modelo de estados]] para saber qué pedido entra al cálculo.
4. **El sistema es multi-sucursal**: las colecciones operativas son subcolecciones de
   `sucursales/{id}/…`, y el scope lo dan `colSucursal`/`docSucursal` (staff) o la URL (público).
5. **Varios cajeros trabajan en paralelo** sobre la misma sucursal. De ahí el modelo de asignación
   de solicitudes web y los guards contra doble ejecución.

## Stack

- **React 19** (Create React App, no Vite) + **React Router v7** (los dos desde el 04-10-2026)
- **Firebase 12** modular (12.19.0 desde el 04-10-2026; venía de la 9.23) — Firestore, Auth, Storage, Functions, App Check
- **React Bootstrap** (modales) + **Bootstrap 5.3** (grid y utilidades)
- **SweetAlert2** para confirmaciones · **React Toastify** para avisos rápidos
- **React Hook Form** en Caja y CrearSolicitud
- **Moment.js** (+ moment-timezone) — formato `DD/MM/YYYY`
- **@tanstack/react-table v9** debajo de `TablaGenerica`
- **Recharts** en Estadísticas · **html2pdf.js** para exportar el menú (se carga al tocar el botón)

## Todas las notas

**Entrada**

- [[Glosario]] — las palabras del negocio, con el enlace a la nota que desarrolla cada una
- [[Mapa del sistema.canvas|Mapa del sistema]] — el pipeline en un canvas, con los nodos enlazados

**El negocio y el pedido**

- [[Reglas de negocio]] — jornada, combos, métodos de pago, horario especial
- [[Flujo del pedido]] — el recorrido feliz: quién escribe qué en cada paso
- [[Modelo de estados]] — el pipeline como máquina de estados, y las transiciones que no deberían existir
- [[Asistencias y liquidacion]] — horas trabajadas y sueldos

**Los datos**

- [[Modelo de datos Firestore]] — colecciones y campos reales
- [[Reglas de seguridad]] — el porqué de `firestore.rules` y `storage.rules`
- [[Mapa de operaciones Firestore]] — cada lectura y escritura, con su costo

**El código**

- [[Arquitectura y rutas]] — rutas, guards, roles, providers, multi-sucursal
- [[Mapa de archivos]] — qué hace cada archivo, sin abrirlo
- [[Convenciones y preferencias]] — cómo escribir código en este repo
- [[Decisiones tecnicas]] — el porqué de lo que parece raro

**Estado del proyecto**

- [[Deuda tecnica]] — lo que queda abierto, y por qué decisión ← **el documento vivo**
- `auditorias/` — fotos fechadas, no se actualizan:
  [[Auditoria 2026-09-26]] (la última) · [[Auditoria 2026-09-15]] · [[Auditoria 2026-09]] (la primera)

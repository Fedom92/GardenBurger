---
tags: [gardenburger, negocio, sectores, hub]
aliases: [Roles, Quien hace que, Responsabilidades]
actualizado: 2026-10-22
---

# Sectores

↑ [[Reglas de negocio]]

Cada persona que interviene en una noche, con lo que hace, la pantalla que usa y los estados del
pedido que mueve. Los valores técnicos de cada rol (`ROLES`, las variables `REACT_APP_*`, a qué
pantalla entra) están en *Authentication › Roles*.

| Sector | Qué hace | Pantalla | Mueve el pedido |
|---|---|---|---|
| [[Cliente]] | Arma su pedido en la web y lo sigue | `/crear-solicitud`, `/ver-pedido` | crea la solicitud (`PENDIENTE`) |
| [[Cajero]] | Cobra, toma las solicitudes web, coteja las transferencias | Caja (`/pedidos-caja`) | → `CONFIRMADO` / `PENDIENTEMP` / `CANCELADO` |
| [[Cocinero]] | Cocina lo que mandó a cocinar | Cocina (`/gestion-cocina`) | `CONFIRMADO` → `COCINA` → `ATP` / `DELIVERY` |
| [[ATP]] | Entrega en el mostrador | ATP (`/gestion-atp`) | `ATP` → `ENTREGADO` |
| [[Jefa de deliverys]] | Asigna repartidores y registra cada viaje | Deliverys (`/jefe-deliverys`) | `DELIVERY` → `ENTREGADO` |
| [[Repartidor]] | Lleva el pedido. **No entra al sistema** | — | — |
| [[Encargado]] | Maneja la sucursal: entra a todos los módulos, cierra la caja, anula tickets, carga las horas | todas las operativas y Asistencias | → `ELIMINADO` |
| [[Admin]] | Catálogo, personal, sucursales, historial, números y sueldos de todas las sucursales | Panel Admin y pantallas propias | → `ELIMINADO` y lo restaura |

**Hay un solo encargado por sucursal**, siempre (dueño, 13-10-2026). El admin no tiene sucursal:
mira cualquiera con un selector en cada pantalla.

> [!info] Lo que ve cada uno es cosmético; lo que puede hacer, no
> El menú lateral muestra a cada rol sus módulos, y cada ruta exige el rol (el encargado entra a
> todas las operativas). Pero la única barrera que no se saltea desde el navegador son las reglas
> de Firestore. Ver *Frontend › Guards* y *Reglas de Firestore*.

---
tags: [gardenburger, negocio, sectores]
aliases: [Administrador, Dueño, Superadmin]
actualizado: 2026-10-22
---

# Admin

↑ [[Sectores]]

Administra el negocio entero, de todas las sucursales. **No tiene sucursal propia**: en cada
pantalla elige sobre cuál mirar. No opera la noche (no entra a Caja, Cocina, ATP ni Deliverys).

## Qué maneja

| Pantalla | Qué hace |
|---|---|
| **Productos** (`/productos`) | El catálogo y sus categorías, y el botón **Publicar Menú**, que titila mientras haya cambios que la web todavía no ve. Ver *Catálogo* |
| **Panel Admin** (`/admin`) | Tres pestañas: **Personal** (alta, edición y baja de empleados), **Sucursales** (datos, horario de la web, encenderla o apagarla, excepciones como feriados) y **Envíos** (las zonas y su costo) |
| **Historial** (`/historial-pedidos`) | Los pedidos de cualquier fecha, también los anulados. Puede **eliminar** cualquiera y **restaurar** los que eliminó desde acá |
| **Métricas** (`/metricas`) | El vistazo rápido desde el celular, de todas las sucursales o una |
| **Estadísticas** | **Actuales** (`/estadisticas`, del sistema nuevo) e **Históricas** (`/estadisticas-viejas`, del sistema viejo) |
| **Liquidación** (`/liquidacion`) | Los sueldos de un período, y corregir cualquier jornada de asistencia, valor hora incluido |
| **Clientes** (`/clientes`) | Un buscador de la ficha de clientes |

## Lo que tiene de especial

- **No se crea desde la app.** Los admins se dan de alta a mano en la Consola de Firebase, y la
  app no puede asignar ese rol. Después hay que repartirles el permiso con **"Sincronizar
  permisos"**, y ellos tienen que volver a iniciar sesión. Ver *Authentication › Ser admin es un claim en el token*.
- **El dueño** (`EMAIL_SUPERADMIN`) es el único que ve "Sincronizar permisos". Es solo visual: la
  función exige ser admin igual.
- **Transfiere los vueltos** a los clientes al cierre, con la lista que le pasa el encargado.
- **Sube los exports del sistema viejo** que leen las Estadísticas Históricas.
- **Ve un pedido web vencido** (más de 48 h) pegando el link en su pestaña con sesión.

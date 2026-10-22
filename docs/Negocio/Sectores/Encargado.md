---
tags: [gardenburger, negocio, sectores]
aliases: [Encargada]
actualizado: 2026-10-22
---

# Encargado

↑ [[Sectores]]

Maneja la sucursal en la noche. **Entra a todos los módulos operativos** —Caja, Cocina, ATP,
Deliverys— y a Asistencias, que es solo suya. Hay **uno por sucursal**, siempre.

## El cierre de la noche: el F4

El **F4 de la Caja es del encargado y de la madrugada**: solo él ve el botón, y solo se habilita de
**00:00 a 02:00**, igual en todas las sucursales. Antes, el turno sigue vendiendo y el número no
significa nada; después de las 02:00 la jornada ya es otra. Ver
*Arqueo y estadísticas › Quién mira el arqueo, y cuándo*.

Con el F4:

- **Cuenta la caja**: efectivo del mostrador, efectivo que vuelve con los repartidores y Mercado
  Pago, **solo de lo entregado**. Lo cobrado que todavía no se entregó aparece aparte ("Cobrados
  todavía sin entregar").
- **Les paga a los repartidores**: a cada uno, su base de la noche (horas × valor hora −
  descuentos, de la asistencia) más sus envíos. Un repartidor sin salida cargada todavía no tiene
  base, y el F4 lo avisa.
- **Ve los viajes que volvieron sin entregar** y todavía no anuló.
- **Pasa los vueltos a transferir**: ticket, cliente, monto y alias, con un botón **Copiar** para
  mandárselos al admin. El monto es el real si el repartidor ya volvió, o el que anunció el
  cliente, marcado "a confirmar".

**Consecuencia asumida:** un turno que quiera controlar los números al día siguiente no puede con
el F4: a las 19 está deshabilitado y mostraría la jornada nueva. Eso lo resuelve el admin desde
Métricas o el Historial.

## Anular tickets (F3)

**Solo el encargado elimina** un ticket, al fiscalizar el cierre (`ELIMINADO`, con su nombre). Si
estaba entregado, sale del arqueo **de su noche**. No puede anular un delivery con el repartidor en
la calle: primero la jefa marca que volvió. Lo anulado desde F3 no se restaura: se rehace el
pedido. Ver *Modelo de estados*.

## Las horas de todos

Carga en **Asistencias** la jornada **en curso**: entrada, salida, ausencias, descuentos y
observaciones, de todos los empleados de su sucursal —repartidores incluidos, y él mismo—. **No
toca el valor hora**: carga horas, no decide sueldos. Una noche olvidada la carga el admin. Ver
*Asistencias y liquidacion*.

## Lo que no puede

- Cerrar la web de su sucursal o cargar un feriado: las excepciones de horario son del admin
  (escribir en `sucursales` es solo del admin en las reglas). Queda como deuda: *Deuda tecnica › A futuro*.
- Mirar el arqueo de otra noche.

---
tags: [gardenburger, negocio, modulo]
---

# Asistencias y liquidación

← [[GardenBurger]] · relacionado: [[Modelo de datos Firestore]], [[Reglas de negocio#Jornada comercial]]

Registro de horas trabajadas y liquidación de sueldos. Implementado en **sep-2026**.

## Quién hace qué

| Rol | Ruta | Puede |
|---|---|---|
| Encargado | `/asistencias` | Cargar y editar **solo la jornada actual** de su sucursal. Horarios, ausencias, descuentos y observaciones. **No toca el valor hora.** |
| Admin | `/liquidacion` | Liquidar un período de cualquier sucursal, y cargar o corregir **cualquier jornada y cualquier campo**, valor hora incluido. |

El encargado no ve el valor hora como campo editable porque carga horas, no decide sueldos. Y como
solo ve el día en curso, **una noche olvidada la carga el admin** desde su panel: por eso su panel
no es de solo lectura.

## Modelo

`sucursales/{id}/asistencias/{DD-MM-YYYY}` — **un documento por jornada**, con los empleados en un
mapa `registros`. Ver los campos en [[Modelo de datos Firestore#Subcolección asistencias]].

Cargar la noche entera es **1 escritura** y leerla **1 lectura**, sin importar cuánta gente haya.

## Las tres reglas que hay que entender

### 1. El turno cruza la medianoche

`calcularHoras(entrada, salida)` suma 24 h cuando `salida <= entrada`. La jornada va de 19 a 2, así
que 19:00 → 02:00 son **7 horas**; restar de frente daría −17. Un turno diurno (12:00 → 18:00) cae
en el mismo cálculo sin caso especial.

### 2. `nombre` y `valorHora` van congelados en el registro

Se copian dentro de cada renglón al cargar la jornada. Dos consecuencias, las dos buscadas:

- El panel de liquidación **no lee `usuarios` nunca**: cero lecturas extra.
- Una liquidación pasada sigue diciendo lo que **realmente se pagó**, aunque después se le suba la
  tarifa a esa persona.

> [!warning] Trampa al reabrir una jornada
> `ModalCargarJornada` toma el valor hora del **registro congelado**, no de `usuarios`, y solo cae
> al de `usuarios` cuando la fila es nueva. Si tomara el actual, corregir un horario viejo le
> re-congelaría a todos la tarifa de hoy y reescribiría en silencio lo que se pagó. El único que
> puede cambiarlo es el admin, a mano, campo por campo.

### 3. El bruto se acumula día por día

`agregarLiquidacion` suma `horas × valorHora` **de cada día**, no `horasTotales × unValorHora`. Si
la tarifa cambió a mitad del período, multiplicar al final da un número que nunca existió.

Ejemplo real: 5 h a $1.000 más 5 h a $2.000 son **$15.000**. La cuenta ingenua daría $20.000.

Por lo mismo, la columna "Valor hora" muestra **"varios"** cuando cambió dentro del rango, con los
valores en el tooltip: poner uno solo sería mentir.

## Definiciones de la liquidación

| Concepto | Cuenta |
|---|---|
| Bruto | suma de `horas × valorHora` por día |
| Descuentos | suma de `descuento` (monto en pesos) |
| Neto | bruto − descuentos |
| **Total** | suma de los netos de todos los empleados del período y la sucursal |

Los registros con `ausente: true` no suman horas ni días ni bruto.

## Costo de lecturas

| Acción | Lecturas |
|---|---|
| Encargado entra a la pantalla | **1** (el doc de la jornada) |
| Encargado abre "Cargar horarios" | N empleados de la sucursal, **solo al abrir el formulario** |
| Encargado edita un renglón ya cargado | **0** — el dato ya está en memoria y el modal devuelve lo que escribió |
| Admin, reporte de un rango de D días | **D** — un mes ≈ 30 |
| Admin, corregir una jornada | 1 + N |

La lista de empleados sale de `where("sucursal","==",X)` filtrando `activo !== false` **del lado del
cliente**, igual que hace `PanelAdmin`: así alcanza el índice automático y no hace falta uno
compuesto. Incluye a los `sinAcceso` (los repartidores trabajan y cobran) y al propio encargado.

## Seguridad

`asistencias` **no tiene reglas propias**: cae bajo el wildcard de subcolecciones de `sucursales`,
así que cualquier staff autenticado puede leer y escribir los sueldos. Es una decisión explícita
para no pagar el `get()` que costaría una regla por rol. Ver [[Deuda tecnica#asistencias sin reglas propias]].

Para cerrarlo algún día hay que **excluir `asistencias` del wildcard**, como ya se hizo con
`pedidos`: las reglas se combinan con OR, así que agregar una regla más específica no restringe nada.

## Auditoría

Cada documento guarda quién lo cargó y quién lo modificó por última vez. El trío `cargado*` se
escribe **solo cuando el documento no existía** — si se pisara en cada guardado, apenas el admin
corrige una jornada quedaría idéntico a `actualizado*` y se perdería quién la cargó.

Se muestra **solo en la vista del admin**, en el encabezado del modal. No cuesta ninguna lectura:
esos campos ya vienen en el snapshot que el modal lee.

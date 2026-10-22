---
tags: [gardenburger, negocio, modulo]
aliases: [Sueldos, Horas trabajadas, Liquidacion]
actualizado: 2026-10-22
---

# Asistencias y liquidación

↑ [[Reglas de negocio]]

Registro de horas trabajadas y liquidación de sueldos (desde sep-2026).

## Quién hace qué

| Rol | Ruta | Puede |
|---|---|---|
| *Encargado* | `/asistencias` | Cargar y editar **solo la jornada en curso** de su sucursal: horarios, ausencias, descuentos y observaciones. **No toca el valor hora** |
| *Admin* | `/liquidacion` | Liquidar un período de cualquier sucursal, y cargar o corregir **cualquier jornada y cualquier campo**, valor hora incluido |

El encargado carga horas, no decide sueldos. Como solo ve el día en curso, **una noche olvidada la
carga el admin**: por eso su panel no es de solo lectura. No se protege la carga simultánea de la
misma jornada (decisión del dueño, auditoría 11-10-2026).

## Modelo

`sucursales/{id}/asistencias/{DD-MM-YYYY}` — **un documento por jornada**, con los empleados en un
mapa `registros`. Cargar la noche entera es **1 escritura** y leerla **1 lectura**, sin importar
cuánta gente haya. Los campos: *Modelo de datos Firestore › sucursales/{id}/asistencias/{DD-MM-YYYY}*.

La lista de empleados sale de `where("sucursal", "==", X)` filtrando `activo !== false` **del lado
del cliente**, así alcanza el índice automático. Incluye a los repartidores (sin acceso al sistema,
pero trabajan y cobran) y al propio encargado.

## Las cuatro reglas que hay que entender

### 1. El turno cruza la medianoche

`calcularHoras(entrada, salida)` suma 24 h cuando la salida es **anterior** a la entrada: 19:00 →
02:00 son **7 horas**, no −17. La comparación es **estricta**: entrada igual a salida son **0
horas**, no 24 (nadie trabaja un día entero de corrido). Un turno de día (12:00 → 18:00) cae en el
mismo cálculo sin caso especial.

### 2. `nombre` y `valorHora` van congelados en el registro

Se copian en cada renglón al cargar la jornada. Dos consecuencias, las dos buscadas:

- El panel de liquidación **no lee `usuarios` nunca**: cero lecturas extra.
- Una liquidación pasada sigue diciendo lo que **realmente se pagó**, aunque después se le suba la
  tarifa a esa persona.

> [!warning] Trampa al reabrir una jornada
> `ModalCargarJornada` toma el valor hora del **registro congelado**, no de `usuarios`, y solo cae
> al de `usuarios` cuando la fila es nueva. Si tomara el actual, corregir un horario viejo le
> re-congelaría a todos la tarifa de hoy y reescribiría en silencio lo que se pagó. Solo el admin
> lo cambia, a mano.

### 3. El bruto se acumula día por día

`agregarLiquidacion` suma `horas × valorHora` **de cada día**, no `horasTotales × unValorHora`. Si la
tarifa cambió a mitad del período, multiplicar al final da un número que nunca existió: 5 h a $1.000
más 5 h a $2.000 son **$15.000**, no $20.000. Por lo mismo, la columna "Valor hora" muestra
**"varios"** cuando cambió dentro del rango, con los valores en el tooltip.

**Sin horas no se liquida**: un presente al que nunca se le cargó la salida queda afuera, y no
cuenta como día trabajado. Los `ausente: true` tampoco suman.

### 4. A los repartidores se les suman sus envíos

Desde el 28-09-2026, de los resúmenes guardados de cada noche (`deliverys[id].totalEnvios`). Un
repartidor con viajes y sin asistencia aparece igual, con sus envíos. Si el rango llega a hoy, la
noche en curso aparece con sus horas pero sin los envíos, que todavía no tienen resumen: esos se
ven en el F4 (no limitarla a noches cerradas fue decisión del dueño, auditoría 11-10-2026). Ver
*Logística de deliverys › Cuánto se le paga a cada repartidor*.

## Definiciones de la liquidación

| Concepto | Cuenta |
|---|---|
| Bruto | suma de `horas × valorHora` por día |
| Descuentos | suma de `descuento` (pesos) |
| Neto | bruto − descuentos |
| Envíos | solo repartidores: sus envíos del período |
| Total por empleado | neto + envíos |
| **Total** | suma de todos los empleados del período y la sucursal |

Es un **registro del trabajo hecho**, no de a quién se le pagó: una noche da lo de esa noche, un
período suma las noches. A los repartidores se les paga cada noche desde el F4 con la misma cuenta.

## Costo de lecturas

| Acción | Lecturas |
|---|---|
| El encargado entra a la pantalla | **1** (el documento de la jornada) |
| Abre "Cargar horarios" | N empleados de la sucursal, solo al abrir el formulario |
| Edita un renglón ya cargado | **0** |
| El admin liquida D días | **2 × D**: las jornadas y los resúmenes guardados de esas noches (un mes ≈ 60). Una noche sin resumen se calcula una vez desde sus pedidos |
| El admin corrige una jornada | 1 + N |

## Auditoría y seguridad

Cada documento guarda quién lo cargó (`cargado*`, **solo** cuando el documento no existía: si se
pisara, quedaría igual a `actualizado*` apenas el admin corrige) y quién lo modificó por última vez
(`actualizado*`). Se muestra solo en la vista del admin, sin lecturas extra.

**`asistencias` no tiene reglas propias**: cualquier staff con sesión puede leer y escribir los
sueldos desde la consola del navegador. Es una decisión: *Deuda tecnica › asistencias abierta en reglas, cerrada solo por front*.

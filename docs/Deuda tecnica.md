---
tags: [gardenburger, deuda, auditoria]
---

# Deuda técnica

← [[GardenBurger]]

Estado al **05-09-2026**. La auditoría integral del 19-08-2026 **ya se ejecutó**: sus 24
hallazgos están cerrados. Lo que sigue es lo que **queda abierto**, y en cada caso está abierto
por una decisión, no por olvido.

> [!info] Cómo leer esta nota
> Si un hallazgo no figura acá, está corregido. No re-auditar Caja, Cocina, Delivery, Clientes,
> Crearsolicitud, CartContext ni AuthContext buscando los bugs viejos: ya no están.

## Abierto por decisión

### Caché del catálogo de Caja — el mayor costo recurrente

`useTraerDatos` relee productos + categorías + envíos **en cada montaje de Caja**. Volver a
`persistentLocalCache` (ver [[Decisiones tecnicas#Persistencia en IndexedDB, modo una sola pestaña]])
**no lo resuelve**: `getDocs` siempre va al servidor.

Camino acordado si se retoma: `getDocsFromCache()` con una marca de jornada en `localStorage`
—para saber si el catálogo se trajo completo esta noche— más un botón "Actualizar catálogo" para
el cambio de precio a mitad de turno. Resultado esperado: **1 lectura del catálogo por PC por
noche** en vez de una por montaje.

### Concurrencia entre dos cajeros sobre el arqueo

`useAccionUnica` cubre el doble click de **una** persona. Dos cajeros distintos descontando el
mismo pedido con ~200 ms de diferencia siguen pudiendo duplicar el movimiento, porque
`increment()` no es idempotente. Cerrarlo exige transacciones, y eso se descartó a propósito:
[[Decisiones tecnicas#Sin runTransaction para el arqueo]].

### `getNextSequence` fuera del batch

Corre antes y fuera del `writeBatch` del pedido. Si el commit falla, ese número de ticket queda
quemado y la numeración salta. Cerrarlo exige mover el contador a la misma transacción que el
pedido.

### `asistencias` sin reglas propias — **ya no está bloqueado por costo**

Cae bajo el wildcard `match /{coleccion}/{documento}` de `sucursales`, así que **cualquier staff
autenticado puede leer y escribir los sueldos**.

Se dejó así porque cerrarlo por rol costaba un `get()` facturado por request. **Ese argumento
desapareció**: con [[Decisiones tecnicas#Ser admin es un custom claim, no una lectura|custom claims]]
una regla por rol no cuesta nada.

Lo que falta para cerrarlo:

1. Un claim `encargado`, igual que el de admin: agregar `ENCARGADO_ROL` a `functions/.env` y que
   `sincronizarClaims` lo reparta.
2. **Excluir `asistencias` del wildcard**, como ya se hace con `pedidos` — las reglas se combinan
   con OR, así que agregar una regla más específica no restringe nada.
3. La regla: lectura para admin y encargado, escritura para el encargado de esa sucursal.


### Una solicitud web trabada

Un cajero que se asigna una solicitud y termina el turno sin volver la deja bloqueada: nadie más
puede revisarla ni rechazarla. Salida barata si llega a pasar: dejar pasar al rol `encargado` en
`esDeOtroCajero`.

### `HistorialPedidos` sin `limit`

Un rango de fechas largo lee todos los documentos del período. Es una pantalla de admin y de uso
esporádico, pero el costo crece con el historial.

## Riesgos latentes (no son bugs hoy)

- **Divergencia de combos.** `contarCombos` compara la descripción del producto **textual** contra
  `CATEGORIAS_COMBOS.excludes`, mientras `esComboConta` en Estadísticas normaliza la categoría
  porque los TSV vienen sucios. Si la descripción difiere entre Firestore y el export, la
  exclusión aplica de un lado y del otro no, y los dos conteos se separan sin avisar.
- **`guardarClienteSiNoExiste` no actualiza.** Un cliente que se mudó conserva la dirección vieja
  para siempre: la función solo crea si no existe.
- **Estadísticas depende de TSV exportados a mano.** Un export incompleto de Ventas falsea Combos
  y Stock. Su `fmtN` **no** tiene guarda `|| 0` a propósito, para que un dato faltante se vea
  como `NaN` en pantalla en vez de pasar por un `0` legítimo — no "arreglarlo" unificándolo con
  [[Convenciones y preferencias|fmtPesos]].

## Sin tests

**No hay un solo test automatizado**, y la verificación del proyecto es manual por decisión del
dueño. La lógica pura se verifica a mano con casos cada vez que se toca:

- `calcularHoras` — el cruce de medianoche (19:00 → 02:00 = 7 h, no −17).
- `agregarLiquidacion` — el bruto acumulado día por día, no `horasTotales × unValorHora`.
- `contarCombos`, `getResumenOperation`, `getCurrentStepIndex`, `getItemsCocina`,
  `getJornadaDeFecha` / `getRangoJornada` / `getFechaComercial`, `validarPedido`.

## Lo que se revisó y está bien

Para no re-auditar al pedo: `getNextSequence` usa transacción correctamente; **todos** los
`onSnapshot` devuelven su `unsubscribe`; los `useRef` de queries evitan recrear referencias; el
modelo de asignación de `PendientesSolicitudes` está bien cerrado; los `writeBatch` que mueven
plata son atómicos entre pedido y resumen; `fetchMenuPublico` cachea la promesa; y **no existe
ningún patrón N+1** en los puntos de acceso a Firestore.

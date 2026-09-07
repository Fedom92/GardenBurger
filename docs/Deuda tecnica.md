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

### Concurrencia entre dos cajeros sobre el arqueo

`useAccionUnica` cubre el doble click de **una** persona. Dos cajeros distintos descontando el
mismo pedido con ~200 ms de diferencia siguen pudiendo duplicar el movimiento, porque
`increment()` no es idempotente. Cerrarlo exige transacciones, y eso se descartó a propósito:
[[Decisiones tecnicas#Sin runTransaction para el arqueo]].

### `asistencias` abierta en reglas, cerrada solo por front

Cae bajo el wildcard `match /{coleccion}/{documento}` de `sucursales`, así que **cualquier staff
autenticado puede leer y escribir los sueldos** desde la consola del navegador. La barrera real es
el front: la ruta `/asistencias` solo la ve el encargado y `/liquidacion` solo el admin.

**Es una decisión, no un olvido.** Se evaluó cerrarla con un claim `encargado` —ahora que los
custom claims hacen gratis una regla por rol— y el dueño la descartó.

Si algún día se reconsidera: hace falta el claim `encargado` repartido por `sincronizarClaims`, y
**excluir `asistencias` del wildcard** como se hace con `pedidos` — las reglas se combinan con OR,
así que agregar una regla más específica no restringe nada.

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

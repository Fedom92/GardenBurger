---
tags: [gardenburger, negocio, catalogo]
aliases: [Catalogo, Productos, Categorias, Combos, Menu publicado]
actualizado: 2026-10-22
---

# Catálogo

↑ [[Reglas de negocio]]

Productos, categorías, lo que se vende solo en la Caja, los combos y cómo llega todo eso a la web.
**El catálogo es uno solo para todas las sucursales.** Lo maneja el *Admin* desde Productos.

## Cómo se relaciona

- **Un producto apunta a su categoría por el nombre** (`producto.categoria === categoria.nombre`),
  no por id. Renombrar una categoría desde el ABM no se protege (decisión del dueño, auditoría
  11-10-2026), y le cambia el comportamiento a sus productos: los extras que ofrece la web, si
  cuentan como combo, las carnes de la cocina, si es privada. Ver
  *Invariantes y dependencias › Si cambiás X, revisá Y*.
- **Las variantes de una hamburguesa** (SIMPLE / DOBLE / TRIPLE, `CATEGORIAS_HAMBURGUESA`) son
  productos propios, cada uno en su categoría ("BLT DOBLE" en `DOBLE`). La web las agrupa por el
  nombre sin el sufijo.
- **Los extras** son productos de categoría `EXTRA` con `tipoExtra`: `HAMBURGUESA`, `PAPAS` o
  `GENERAL`. En el pedido guardado van como una fila propia **debajo de su producto**.
- **El pedido guarda su copia del producto** (la ficha entera, en el carrito): editar o eliminar un
  producto no cambia los pedidos viejos. Correcto así (dueño, auditoría 11-10-2026).

## Qué producto se ve dónde

| Producto | Productos (admin) | Caja | Web pública |
|---|---|---|---|
| Común | sí | sí | sí |
| **Privado** (casilla "¿Privado?" del producto: `privado: true`) | sí, en amarillo | sí | **no** |
| De una **categoría privada** (casilla "¿Privada?" de la categoría) | sí | sí | **no** |

- **Privado = solo en la Caja**, en dos niveles: **la categoría**, para una familia entera (los
  productos para empleados, `COMBO GARDEN`, `GARDEN SIN PAPAS`), y **el producto**, para uno suelto
  de una categoría pública (el extra "Cheddar y bacon en papas S/cargo" de los cajeros).
- Lo filtra `filtrarPublico` (`Utils/menuPublico.js`) al publicar `menu.json` y en su respaldo
  contra Firestore: **después de marcar o desmarcar algo, hay que publicar el menú**. No es
  secreto: `productos` y `categorias` son de lectura pública en las reglas.
- **No hay "pausar".** Hasta el 16-10-2026 había un campo `visible` (activar / desactivar) que
  sacaba el producto de todos lados. Se reemplazó por `privado` (se migraron los 99 productos; el
  único pausado pasó a privado): un producto que no se vende **se elimina**, y si vuelve se crea de
  nuevo.
- **Un producto o extra de $0 se ve en la web**, como "sin cargo": la web no decide qué ocultar.
  Para que no se vea, la casilla "¿Privado?" o eliminarlo (decisión del dueño, 15/16-10-2026).
- Los productos para empleados, en sus categorías privadas, **no cuentan como combos**.

## Carga de productos

- **El precio va entero** (`soloEnteros`, `step={1}`); editar no permite precio 0.
- **La descripción se guarda sin espacios al principio ni al final**: "Hamburguesa " y
  "Hamburguesa" serían dos productos, y la exclusión de combos compara el nombre exacto.
- **La foto**: "Subir archivo" la achica en el navegador y la guarda en Storage, o "Link URL" con
  cualquier dirección. Ver *Storage › Fotos de producto*.
- **Los ingredientes y la foto de una hamburguesa que muestra la web son los del DOBLE**, en todos
  lados (dueño, 16-10-2026). Ver *Web publica › Qué extras ofrece cada producto*.

## Combos

Un **combo** es una unidad de conteo del arqueo y las estadísticas, no un producto. Qué cuenta
sale de `CATEGORIAS_COMBOS` (`Constantes.jsx`): SIMPLE, DOBLE, TRIPLE, CAJA PAPAS, POLLO CRISPY y
NUGGETS. Cada categoría puede llevar `excludes`, los productos que comparten categoría pero **no**
se venden como combo:

```js
{ key: "CAJA PAPAS", label: "Papas", excludes: ["(porcion individual)"] }
```

- La descripción del exclude va **textual**, como en el catálogo: la comparación es exacta.
- `contarCombos` (`useResumenDiario.js`) cuenta **unidades, no renglones**: cantidad 3 son 3
  combos.
- **Se congela en el pedido al cobrarlo** (`combos`): sumar una categoría mañana no cambia lo que
  contó agosto. Ver *Arqueo y estadísticas › Lo que se congela en el pedido*.
- `esComboConta` (Estadísticas Históricas) aplica la misma regla sobre los TSV, pero ahí la
  **categoría** pasa por `norm()` porque los exports vienen sucios.

> [!caution] Riesgo de divergencia
> Si la descripción de un producto difiere entre el catálogo y el TSV exportado (mayúsculas,
> acentos), la exclusión aplica de un lado y del otro no, y los dos conteos se separan sin avisar.

## Publicar el menú

La web no lee el catálogo de Firestore: lee **una copia publicada**, `menu.json`, que genera el
botón **"Publicar Menú"** de Productos. Hasta que se toca, el cliente ve lo viejo. Cómo funciona y
por qué así: *Storage › menu.json*.

**El botón titila mientras haya cambios sin publicar.** La bandera (`menuSinPublicar`) vive en
`localStorage`: la prenden las altas, ediciones y bajas de productos y categorías (`marcarPendiente`
en `Productos.jsx`, que llaman el `onGuardado` de Crear/Editar producto, `confirmeDelete` y el
`onCambio` del modal de Categorías), y la apaga `handlePublicarMenu` cuando publica bien. **Todo ABM nuevo que toque el catálogo tiene que
prenderla.** También la prenden los cambios en productos privados: se probó filtrarlos y el dueño
prefirió lo simple (28-09-2026); publicar de más no rompe nada.

Por qué una bandera y no otra cosa: un campo en `productos` exigía tocarlo en cada escritura y el
dueño no quiere campos nuevos ahí; comparar el catálogo en memoria contra `menu.json` era exacto
pero complejo (canonizar y ordenar dos estructuras). La bandera es una línea por punto de edición y
cero lecturas. **Consecuencia aceptada**: es por navegador; si se edita en una PC y se publica
desde otra, la primera sigue titilando hasta publicar ahí.

Las **sucursales** viajan en el mismo JSON pero se publican solas al guardarlas (12-10-2026): el
botón quedó para el catálogo.

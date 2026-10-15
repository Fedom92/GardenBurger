// Tests de agruparExtras: la regla con la que la Caja y Cocina cuelgan cada extra de
// su producto. Se corren con `npm test`.
import { agruparExtras } from "./agruparExtras";

const producto = (descripcion) => ({ descripcion, categoria: "DOBLE" });
const extra = (descripcion) => ({ descripcion, categoria: "EXTRA" });
const nombres = (grupos) => grupos.map((g) => [g.principal.descripcion, g.extras.map((e) => e.descripcion)]);

test("cada extra va con el producto que tiene arriba", () => {
    const grupos = agruparExtras([
        producto("BLT DOBLE"), extra("FETA DE CHEDDAR"), extra("HUEVO"),
        producto("CHEESE SIMPLE"),
        producto("TASTY TRIPLE"), extra("CARNE EXTRA"),
    ]);
    expect(nombres(grupos)).toEqual([
        ["BLT DOBLE", ["FETA DE CHEDDAR", "HUEVO"]],
        ["CHEESE SIMPLE", []],
        ["TASTY TRIPLE", ["CARNE EXTRA"]],
    ]);
});

test("un extra suelto al principio se muestra como línea propia", () => {
    expect(nombres(agruparExtras([extra("HUEVO"), producto("BLT DOBLE")]))).toEqual([
        ["HUEVO", []],
        ["BLT DOBLE", []],
    ]);
});

test("un carrito vacío no tiene grupos", () => {
    expect(agruparExtras([])).toEqual([]);
    expect(agruparExtras()).toEqual([]);
});

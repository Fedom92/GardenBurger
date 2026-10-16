// Tests de las reglas del catálogo de la web pública. Se corren con `npm test`.
import {
    quitarVariante, agruparHamburguesas, armarSecciones, armarCarta, extrasDe, abreFicha, capitalizar, ilustracionDe,
} from "./catalogo";

// Como en el menu.json real.
const p = (id, descripcion, categoria, precio, extra = {}) => ({ id, descripcion, categoria, precio, ...extra });
const BLT = [p("blt1", "BLT SIMPLE", "SIMPLE", 14200), p("blt3", "BLT TRIPLE", "TRIPLE", 17400), p("blt2", "BLT DOBLE", "DOBLE", 15700, { ingredientes: "Cheddar, bacon" })];
const BIG = [p("big2", "BIG GARDEN DOBLE", "DOBLE", 16500, { imagen: "big.jpg" }), p("big1", "BIG GARDEN SIMPLE", "SIMPLE", 15000)];
const POLLO = p("pc1", "pollo crispy cuarto", "POLLO CRISPY", 14000);
const NUGGETS = p("ng1", "NUGGETS CON PAPAS", "NUGGETS", 12500);
const CAJA = p("cp1", "Caja Papas Simple", "CAJA PAPAS", 14000);
const COCA = p("bb1", "Coca cola 600ml", "BEBIDAS", 2200);
const FETA = p("ex1", "FETA DE CHEDDAR", "EXTRA", 400, { tipoExtra: "HAMBURGUESA" });
const CHEDDAR_PAPAS = p("ex2", "CHEDDAR EN PAPAS", "EXTRA", 2000, { tipoExtra: "PAPAS" });
const SIN_CARGO = p("ex3", "CHEDDAR Y BACON EN PAPAS S/cargo", "EXTRA", 0, { tipoExtra: "PAPAS" });
const PILETA = p("ex4", "PILETA DE CHEDDAR", "EXTRA", 2000, { tipoExtra: "GENERAL" });
const PRODUCTOS = [...BLT, ...BIG, POLLO, NUGGETS, CAJA, COCA, FETA, CHEDDAR_PAPAS, SIN_CARGO, PILETA];
const CATEGORIAS = [
    { nombre: "BEBIDAS", nroOrden: 8 }, { nombre: "SIMPLE", nroOrden: 1 }, { nombre: "DOBLE", nroOrden: 2 },
    { nombre: "TRIPLE", nroOrden: 3 }, { nombre: "POLLO CRISPY", nroOrden: 4 }, { nombre: "NUGGETS", nroOrden: 5 },
    { nombre: "CAJA PAPAS", nroOrden: 6 }, { nombre: "EXTRA", nroOrden: 7 }, { nombre: "POSTRES", nroOrden: 9 },
];

describe("las hamburguesas se agrupan por el nombre", () => {
    test("quitarVariante saca el sufijo, en mayúscula o no", () => {
        expect(quitarVariante("BLT DOBLE")).toBe("BLT");
        expect(quitarVariante("Big Garden triple")).toBe("Big Garden");
        expect(quitarVariante("Caja Papas Simple")).toBe("Caja Papas");
        expect(quitarVariante("F-ONION")).toBe("F-ONION");
    });

    test("una tarjeta por hamburguesa, con sus variantes en orden y el precio más bajo", () => {
        const [blt, big] = agruparHamburguesas(PRODUCTOS);
        expect(blt.nombre).toBe("BLT");
        expect(blt.variantes.map((v) => v.categoria)).toEqual(["SIMPLE", "DOBLE", "TRIPLE"]);
        expect(blt.precioDesde).toBe(14200);
        expect(blt.ingredientes).toBe("Cheddar, bacon");
        expect(big.imagen).toBe("big.jpg");
        expect(agruparHamburguesas(PRODUCTOS)).toHaveLength(2);
    });

    test("la tarjeta usa la foto y los ingredientes del DOBLE, aunque el SIMPLE tenga otros", () => {
        const tasty = [
            p("t1", "TASTY SIMPLE", "SIMPLE", 14700, { imagen: "simple.webp", ingredientes: "Uno" }),
            p("t2", "TASTY DOBLE", "DOBLE", 16200, { imagen: "doble.webp", ingredientes: "Dos" }),
            p("t3", "TASTY TRIPLE", "TRIPLE", 17900, { imagen: "triple.webp", ingredientes: "Tres" }),
        ];
        const [grupo] = agruparHamburguesas(tasty);
        expect(grupo.imagen).toBe("doble.webp");
        expect(grupo.ingredientes).toBe("Dos");
    });

    test("si el DOBLE no tiene foto o ingredientes, los del primer tamaño que sí", () => {
        const [grupo] = agruparHamburguesas([
            p("c1", "CHEESE SIMPLE", "SIMPLE", 14000, { imagen: "simple.webp", ingredientes: "Uno" }),
            p("c2", "CHEESE DOBLE", "DOBLE", 15500),
        ]);
        expect(grupo.imagen).toBe("simple.webp");
        expect(grupo.ingredientes).toBe("Uno");
    });
});

describe("las secciones del filtro", () => {
    test("Hamburguesas primero, después el resto por nroOrden, sin EXTRA ni vacías", () => {
        const secciones = armarSecciones(CATEGORIAS, PRODUCTOS);
        expect(secciones.map((s) => s.nombre)).toEqual(["Hamburguesas", "Pollo crispy", "Nuggets", "Caja papas", "Bebidas"]);
        expect(secciones.find((s) => s.id === "bebidas").esBebidas).toBe(true);
    });

    test("Pollo crispy aparece aunque no haya hamburguesas", () => {
        const secciones = armarSecciones(CATEGORIAS, [POLLO, COCA]);
        expect(secciones.map((s) => s.nombre)).toEqual(["Pollo crispy", "Bebidas"]);
    });

    test("con productos en oferta, Ofertas va primera", () => {
        const secciones = armarSecciones(CATEGORIAS, [...PRODUCTOS, p("of1", "COMBO OFERTA", "NUGGETS", 9000, { oferta: true })]);
        expect(secciones[0].id).toBe("ofertas");
        expect(secciones[0].productos).toHaveLength(1);
    });

    test("cada categoría con su ilustración, y la bolsa para las que no tienen", () => {
        expect(ilustracionDe(BLT[0])).toBe("hamburguesa-fuego");
        expect(ilustracionDe(NUGGETS)).toBe("aderezo");
        expect(ilustracionDe({ categoria: "POSTRES" })).toBe("bolsa");
        expect(capitalizar("CAJA PAPAS")).toBe("Caja papas");
    });
});

describe("qué extras ofrece cada producto", () => {
    const ids = (grupos) => grupos.map((g) => [g.id, g.extras.map((e) => e.id)]);

    test("hamburguesa: los suyos y, aparte, los de las papas del combo", () => {
        const [blt] = agruparHamburguesas(PRODUCTOS);
        expect(ids(extrasDe(blt, PRODUCTOS))).toEqual([["hamburguesa", ["ex1"]], ["papas", ["ex2", "ex3"]]]);
    });

    test("pollo crispy: igual que una hamburguesa", () => {
        expect(ids(extrasDe(POLLO, PRODUCTOS))).toEqual([["hamburguesa", ["ex1"]], ["papas", ["ex2", "ex3"]]]);
    });

    test("caja de papas: los de papas y los generales", () => {
        expect(ids(extrasDe(CAJA, PRODUCTOS))).toEqual([["papas", ["ex2", "ex3", "ex4"]]]);
    });

    test("nuggets: solo los generales", () => {
        expect(ids(extrasDe(NUGGETS, PRODUCTOS))).toEqual([["general", ["ex4"]]]);
    });

    test("los de $0 también se ofrecen: ocultarlos es cosa del admin", () => {
        expect(extrasDe(CAJA, PRODUCTOS)[0].extras.map((e) => e.precio)).toContain(0);
    });

    test("una bebida no tiene extras y se agrega sin ficha", () => {
        expect(extrasDe(COCA, PRODUCTOS)).toEqual([]);
        expect(abreFicha(COCA, [])).toBe(false);
    });

    test("la ficha se abre si hay tamaño o extras para elegir", () => {
        const [blt] = agruparHamburguesas(PRODUCTOS);
        expect(abreFicha(blt, [])).toBe(true);
        expect(abreFicha(NUGGETS, extrasDe(NUGGETS, PRODUCTOS))).toBe(true);
        expect(abreFicha(NUGGETS, [])).toBe(false);
    });
});

describe("la carta de /menu", () => {
    test("las hamburguesas agrupadas y solo las variantes que existen", () => {
        const { hamburguesas, variantes } = armarCarta(CATEGORIAS, PRODUCTOS);
        expect(hamburguesas.map((h) => h.nombre)).toEqual(["BLT", "BIG GARDEN"]);
        expect(variantes).toEqual(["SIMPLE", "DOBLE", "TRIPLE"]);
        expect(armarCarta(CATEGORIAS, BIG).variantes).toEqual(["SIMPLE", "DOBLE"]);
    });

    test("el resto por nroOrden, con los extras y sin las vacías ni Ofertas", () => {
        const conOferta = [...PRODUCTOS, p("of1", "COMBO AMIGOS", "NUGGETS", 20000, { oferta: true })];
        const { secciones } = armarCarta(CATEGORIAS, conOferta);
        expect(secciones.map((s) => s.nombre)).toEqual(["Pollo crispy", "Nuggets", "Caja papas", "Extras", "Bebidas"]);
        expect(secciones.find((s) => s.nombre === "Extras").productos).toHaveLength(4);
    });

    test("sin catálogo, vacía", () => {
        expect(armarCarta()).toEqual({ hamburguesas: [], variantes: [], secciones: [] });
    });
});

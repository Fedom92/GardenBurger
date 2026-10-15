// Tests de las cuentas de Estadísticas Generales que tocó la auditoría del
// 11-10-2026: las noches con "Todas" y la categoría de bebidas. Se corren con
// `npm test`.
import { armarEstadisticas } from "./calculos";

// calculos importa fechaComercial y useResumenDiario, que importan Firebase: las
// cuentas de acá son puras y no lo necesitan.
jest.mock("../../../firebaseConfig/firebase", () => ({ app: {}, db: {} }));
jest.mock("firebase/functions", () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));

const noche = (jornada, cambios = {}) => ({ jornada, totalPedidos: 10, ...cambios });

describe("noches", () => {
    test("con Todas, la misma noche de dos sucursales cuenta una vez", () => {
        const e = armarEstadisticas([
            noche("10-10-2026"), noche("10-10-2026"),
            noche("11-10-2026"), noche("11-10-2026"),
        ]);
        expect(e.noches).toBe(2);
        // Los pedidos sí se suman: son de las dos sucursales.
        expect(e.porDia.find((d) => d.label === "Sáb").valor).toBe(20);
    });

    test("con una sola sucursal, una por noche", () => {
        expect(armarEstadisticas([noche("10-10-2026"), noche("11-10-2026"), noche("12-10-2026")]).noches).toBe(3);
    });
});

describe("bebidas", () => {
    const e = armarEstadisticas([noche("10-10-2026", {
        productos: {
            "Coca cola 600ml": { categoria: "BEBIDAS", unidades: 3 },
            "Agua suelta": { categoria: "BEBIDA", unidades: 2 },
            "BLT DOBLE": { categoria: "DOBLE", unidades: 4 },
        },
    })]);

    test("solo la categoría BEBIDAS es bebida", () => {
        expect(e.topBebidas).toEqual([{ label: "Coca cola 600ml", valor: 3 }]);
    });

    test("lo demás va a los artículos, aunque se llame parecido", () => {
        expect(e.topProductos.map((p) => p.label)).toEqual(["BLT DOBLE", "Agua suelta"]);
    });
});

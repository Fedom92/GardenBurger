// Tests de formato.js: montos, números y fechas. Se corren con `npm test`.
import {
    fmtPesos, fmtNumero, fmtFecha, fmtHora, fmtFechaHora, aInputFecha,
    NOMBRES_DIAS, DIAS_CORTOS, MESES_CORTOS,
} from "./formato";

// Un Timestamp de Firestore alcanza con su toDate().
const timestamp = (date) => ({ toDate: () => date });
const sabadoALas2105 = new Date(2026, 9, 10, 21, 5);

describe("nombres de días y meses, del locale es de moment", () => {
    // Si se pierde el import del locale, salen en inglés ("Sun", "Jan") sin aviso.
    test("días cortos, desde el domingo como moment().day()", () => {
        expect(DIAS_CORTOS).toEqual(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);
    });
    test("meses cortos", () => {
        expect(MESES_CORTOS).toEqual(["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]);
    });
    test("días completos, en minúscula", () => {
        expect(NOMBRES_DIAS[0]).toBe("domingo");
        expect(NOMBRES_DIAS[3]).toBe("miércoles");
    });
});

describe("fechas en pantalla", () => {
    test("desde un Timestamp, un Date o un YYYY-MM-DD", () => {
        expect(fmtFechaHora(timestamp(sabadoALas2105))).toBe("10/10/2026 21:05");
        expect(fmtHora(sabadoALas2105)).toBe("21:05");
        expect(fmtFecha("2026-10-10")).toBe("10/10/2026");
    });
    test("sin fecha muestran un guion, no la hora actual", () => {
        expect(fmtFecha(undefined)).toBe("—");
        expect(fmtHora(null)).toBe("—");
        expect(fmtFechaHora(undefined)).toBe("—");
    });
    test("el valor de un input de fecha", () => {
        expect(aInputFecha(sabadoALas2105)).toBe("2026-10-10");
    });
});

describe("montos y números", () => {
    test("con separador de miles", () => {
        expect(fmtPesos(77000)).toBe("$77.000");
        expect(fmtNumero(1234)).toBe("1.234");
    });
    test("un dato que falta es 0", () => {
        expect(fmtPesos(undefined)).toBe("$0");
        expect(fmtNumero(undefined)).toBe("0");
    });
});

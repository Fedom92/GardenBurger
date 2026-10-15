// Tests de la ventana de la web pública: los bordes que de otro modo solo se ven
// esperando la noche real. Se corren con `npm test`.
import moment from "moment-timezone/builds/moment-timezone-with-data-10-year-range";
import {
    webRecibePedidos, textoExcepcionWeb, errorDeHorario, getFechaComercialDe,
    momentDeJornada, jornadaQueEmpieza, textoCorteWeb,
    opcionesHorarioEspecial, HORARIOS_ESPECIALES,
} from "./fechaComercial";

// fechaComercial importa la app de Firebase para sincronizar la hora: acá no hace falta.
jest.mock("../firebaseConfig/firebase", () => ({ app: {} }));
jest.mock("firebase/functions", () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));

// Igual que index.js: toda la app trabaja en hora argentina.
moment.tz.setDefault("America/Argentina/Buenos_Aires");

const a = (texto) => moment(texto, "DD-MM-YYYY HH:mm");

// Como Davinci: miércoles a domingo, de 20 a 00, la web corta a las 23.
const davinci = { id: "davinci", horario: { dias: [0, 3, 4, 5, 6], abre: 20, cierra: 0, horasCorte: 1 } };
const conExcepciones = (excepcionesWeb) => ({ ...davinci, excepcionesWeb });

// Octubre 2026: el 11 es domingo, el 12 lunes, el 14 miércoles.
describe("webRecibePedidos, horario de siempre", () => {
    test("un día de atención, dentro del horario", () => {
        expect(webRecibePedidos(davinci, a("14-10-2026 21:00"))).toBe(true);
    });
    test("abre a la hora de apertura, no antes", () => {
        expect(webRecibePedidos(davinci, a("14-10-2026 19:59"))).toBe(false);
        expect(webRecibePedidos(davinci, a("14-10-2026 20:00"))).toBe(true);
    });
    test("deja de tomar pedidos en el corte, no en el cierre", () => {
        expect(webRecibePedidos(davinci, a("14-10-2026 22:59"))).toBe(true);
        expect(webRecibePedidos(davinci, a("14-10-2026 23:00"))).toBe(false);
    });
    test("un día que no se atiende", () => {
        expect(webRecibePedidos(davinci, a("12-10-2026 21:00"))).toBe(false);
    });
    test("pasada la medianoche cuenta la noche anterior", () => {
        const hastaLaUna = { ...davinci, horario: { ...davinci.horario, cierra: 2 } };
        // Lunes 00:30 es la noche del domingo, que se atiende.
        expect(webRecibePedidos(hastaLaUna, a("12-10-2026 00:30"))).toBe(true);
        // Martes 00:30 es la noche del lunes, que no.
        expect(webRecibePedidos(hastaLaUna, a("13-10-2026 00:30"))).toBe(false);
    });
    test("sin horario o sin sucursal, cerrada", () => {
        expect(webRecibePedidos({ id: "nueva" }, a("14-10-2026 21:00"))).toBe(false);
        expect(webRecibePedidos(null, a("14-10-2026 21:00"))).toBe(false);
    });
});

describe("webRecibePedidos, con excepciones", () => {
    const feriado = { abierta: true, abre: 20, cierra: 0, horasCorte: 1, registroId: "r1" };

    test("un lunes feriado abre con el horario de la excepción", () => {
        const s = conExcepciones({ "12-10-2026": feriado });
        expect(webRecibePedidos(s, a("12-10-2026 21:00"))).toBe(true);
        expect(webRecibePedidos(s, a("12-10-2026 23:00"))).toBe(false);
    });
    test("la excepción de apertura usa su propio horario", () => {
        const s = conExcepciones({ "12-10-2026": { ...feriado, abre: 19, cierra: 22 } });
        expect(webRecibePedidos(s, a("12-10-2026 19:30"))).toBe(true);
        expect(webRecibePedidos(s, a("12-10-2026 21:00"))).toBe(false);
    });
    test("la excepción vale por jornada: el martes 00:30 todavía es el lunes", () => {
        const s = conExcepciones({ "12-10-2026": { ...feriado, cierra: 2 } });
        expect(webRecibePedidos(s, a("13-10-2026 00:30"))).toBe(true);
    });
    test("una excepción de cierre cierra un día de atención", () => {
        const s = conExcepciones({ "14-10-2026": { abierta: false, registroId: "r2" } });
        expect(webRecibePedidos(s, a("14-10-2026 21:00"))).toBe(false);
    });
    test("una excepción de otra noche no cambia nada", () => {
        const s = conExcepciones({ "12-10-2026": feriado, "15-10-2026": { abierta: false } });
        expect(webRecibePedidos(s, a("14-10-2026 21:00"))).toBe(true);
        expect(webRecibePedidos(s, a("13-10-2026 21:00"))).toBe(false);
    });
    test("una sucursal sin horario puede abrir por excepción", () => {
        const s = { id: "nueva", excepcionesWeb: { "12-10-2026": feriado } };
        expect(webRecibePedidos(s, a("12-10-2026 21:00"))).toBe(true);
    });
});

describe("textoExcepcionWeb", () => {
    test("muestra el cambio de hoy, y el motivo del cierre si es público", () => {
        const s = conExcepciones({
            "12-10-2026": { abierta: true, abre: 20, cierra: 0, horasCorte: 1 },
            "14-10-2026": { abierta: false },
            "15-10-2026": { abierta: false, motivo: "Inventario" },
        });
        expect(textoExcepcionWeb(s, a("12-10-2026 15:00"))).toBe("Hoy de 20 a 23 hs");
        expect(textoExcepcionWeb(s, a("14-10-2026 15:00"))).toBe("Hoy cerrado");
        expect(textoExcepcionWeb(s, a("15-10-2026 15:00"))).toBe("Hoy cerrado · Inventario");
        expect(textoExcepcionWeb(s, a("13-10-2026 15:00"))).toBe("");
    });
});

describe("errorDeHorario", () => {
    test("acepta un horario normal y uno que cruza la medianoche", () => {
        expect(errorDeHorario({ abre: 20, cierra: 0, horasCorte: 1 })).toBe("");
        expect(errorDeHorario({ abre: 20, cierra: 2, horasCorte: 1 })).toBe("");
    });
    test("rechaza un cierre antes de la apertura y un corte fuera de rango", () => {
        expect(errorDeHorario({ abre: 22, cierra: 21, horasCorte: 0 })).not.toBe("");
        expect(errorDeHorario({ abre: 20, cierra: 21, horasCorte: 1 })).not.toBe("");
        expect(errorDeHorario({ abre: 20, cierra: 0, horasCorte: -1 })).not.toBe("");
    });
});

describe("getFechaComercialDe", () => {
    test("antes del cierre es la noche anterior", () => {
        expect(getFechaComercialDe(a("13-10-2026 01:59"))).toBe("12-10-2026");
        expect(getFechaComercialDe(a("13-10-2026 02:00"))).toBe("13-10-2026");
    });
});

describe("opcionesHorarioEspecial", () => {
    test("van de 20:00 a 23:45, cada 15 minutos", () => {
        expect(HORARIOS_ESPECIALES[0]).toBe("20:00");
        expect(HORARIOS_ESPECIALES[HORARIOS_ESPECIALES.length - 1]).toBe("23:45");
        expect(HORARIOS_ESPECIALES).toHaveLength(16);
    });
    test("fuera de la noche se ofrecen todos: el pedido es para esta noche", () => {
        expect(opcionesHorarioEspecial(a("14-10-2026 15:00"))).toEqual(HORARIOS_ESPECIALES);
        expect(opcionesHorarioEspecial(a("14-10-2026 02:00"))).toEqual(HORARIOS_ESPECIALES);
    });
    test("durante la noche, solo los que todavía no pasaron", () => {
        expect(opcionesHorarioEspecial(a("14-10-2026 19:30"))).toEqual(HORARIOS_ESPECIALES);
        expect(opcionesHorarioEspecial(a("14-10-2026 21:10"))[0]).toBe("21:15");
        expect(opcionesHorarioEspecial(a("14-10-2026 23:30"))).toEqual(["23:45"]);
    });
    test("pasadas las 23:45 y después de medianoche no queda ninguno", () => {
        expect(opcionesHorarioEspecial(a("14-10-2026 23:45"))).toEqual([]);
        expect(opcionesHorarioEspecial(a("15-10-2026 00:30"))).toEqual([]);
        expect(opcionesHorarioEspecial(a("15-10-2026 01:59"))).toEqual([]);
    });
});

describe("el id de una jornada", () => {
    test("se lee y se escribe en DD-MM-YYYY", () => {
        expect(momentDeJornada("10-10-2026").day()).toBe(6);   // sábado
        expect(jornadaQueEmpieza(moment("2026-10-10"))).toBe("10-10-2026");
    });
    test("jornadaQueEmpieza no corre el día: eso es getFechaComercialDe", () => {
        expect(jornadaQueEmpieza(a("11-10-2026 00:30"))).toBe("11-10-2026");
        expect(getFechaComercialDe(a("11-10-2026 00:30"))).toBe("10-10-2026");
    });
});

describe("textoCorteWeb: hasta cuándo toma pedidos hoy", () => {
    test("del horario de siempre: el corte es horasCorte antes del cierre", () => {
        expect(textoCorteWeb(davinci, a("14-10-2026 21:00"))).toBe("hasta las 23:00");
        const hastaLas3 = { horario: { dias: [0, 3, 4, 5, 6], abre: 19, cierra: 3, horasCorte: 2 } };
        expect(textoCorteWeb(hastaLas3, a("14-10-2026 21:00"))).toBe("hasta la 01:00");
    });
    test("la excepción de hoy manda", () => {
        const abreDistinto = conExcepciones({ "14-10-2026": { abierta: true, abre: 20, cierra: 23, horasCorte: 1 } });
        expect(textoCorteWeb(abreDistinto, a("14-10-2026 21:00"))).toBe("hasta las 22:00");
        const cerrada = conExcepciones({ "14-10-2026": { abierta: false, motivo: "Inventario" } });
        expect(textoCorteWeb(cerrada, a("14-10-2026 21:00"))).toBe("");
    });
    test("sin horario no dice nada", () => {
        expect(textoCorteWeb({ id: "luro" }, a("14-10-2026 21:00"))).toBe("");
        expect(textoCorteWeb(null, a("14-10-2026 21:00"))).toBe("");
    });
});

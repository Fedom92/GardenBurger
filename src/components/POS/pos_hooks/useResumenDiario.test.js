// Tests del arqueo: la función más cara de equivocar del sistema. Cubren la regla de
// la auditoría del 11-10-2026 —suman solo los pedidos ENTREGADOS— y lo que el F4
// muestra aparte. Se corren con `npm test`.
import { calcularArqueo, cobradosSinEntregar, sinEntregarPendientes, VERSION_RESUMEN_DIARIO } from "./useResumenDiario";
import { ESTADOS, METODOS_PAGO, SUBESTADOS_MOTODELIVERY } from "../../../Utils/Constantes";

// useResumenDiario importa Firestore y fechaComercial (que sincroniza la hora con una
// Cloud Function): las funciones de acá son puras y no los necesitan.
jest.mock("../../../firebaseConfig/firebase", () => ({ app: {}, db: {} }));
jest.mock("firebase/functions", () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn() }));

const RETIRA = { zona_envio: "Retira", costo_envio: 0 };
const ZONA_1 = { zona_envio: "0-1", costo_envio: 1500 };

// Un pedido cobrado por un cajero; cada caso cambia lo que le importa.
const pedido = (cambios = {}) => ({
    cajeroID: "cajero-1",
    estado: ESTADOS.FINAL,
    metodoPago: METODOS_PAGO.EFECTIVO.key,
    total: 10000,
    envio: RETIRA,
    carrito: [{ descripcion: "BLT DOBLE", categoria: "DOBLE", cantidad: 1 }],
    ...cambios,
});

describe("calcularArqueo: suman solo los ENTREGADOS", () => {
    test("un pedido entregado suma", () => {
        const r = calcularArqueo([pedido()]);
        expect(r.totalPedidos).toBe(1);
        expect(r.totalEfectivo).toBe(10000);
        expect(r.efectivoLocal).toBe(10000);
        expect(r.totalCombos).toBe(1);
    });

    test.each([
        ["en la cocina", ESTADOS.COCINA],
        ["confirmado", ESTADOS.CONFIRMADO],
        ["esperando en el mostrador", ESTADOS.ATP],
        ["en reparto", ESTADOS.DELIVERY],
        ["esperando la transferencia", ESTADOS.PENDIENTEMP],
    ])("uno cobrado y todavía %s no suma", (_, estado) => {
        const r = calcularArqueo([pedido({ estado })]);
        expect(r.totalPedidos).toBe(0);
        expect(r.totalEfectivo).toBe(0);
        expect(r.mp).toBe(0);
        expect(r.unidades).toBe(0);
    });

    test("los anulados se cuentan aparte y no mueven plata", () => {
        const r = calcularArqueo([
            pedido({ estado: ESTADOS.ELIMINADO }),
            pedido({ estado: ESTADOS.CANCELADO }),
        ]);
        expect(r.eliminados).toBe(1);
        expect(r.cancelados).toBe(1);
        expect(r.totalPedidos).toBe(0);
        expect(r.totalEfectivo).toBe(0);
    });

    test("una solicitud web que nadie cargó no existe para el arqueo", () => {
        const r = calcularArqueo([pedido({ cajeroID: undefined, estado: ESTADOS.WEB_PENDIENTE })]);
        expect(r.totalPedidos).toBe(0);
        expect(r.eliminados + r.cancelados).toBe(0);
    });

    test("efectivo, MP y dividido se reparten igual que antes", () => {
        const r = calcularArqueo([
            pedido({ total: 10000 }),
            pedido({ metodoPago: METODOS_PAGO.MP.key, total: 11000 }),
            pedido({ metodoPago: METODOS_PAGO.DIVIDIDO.key, total: 12000, montoEfectivo: 5000, envio: ZONA_1 }),
        ]);
        expect(r.totalEfectivo).toBe(15000);
        expect(r.efectivoLocal).toBe(10000);
        expect(r.efectivoEnvio).toBe(5000);
        expect(r.mp).toBe(11000 + 7000);
        expect(r.porCanal.delivery.pedidos).toBe(1);
        expect(r.porCanal.mostrador.pedidos).toBe(2);
    });

    test("un viaje que volvió sin entregar no suma, pero se le paga al repartidor", () => {
        const r = calcularArqueo([pedido({
            estado: ESTADOS.DELIVERY,
            envio: ZONA_1,
            deliveryID: "rep-1",
            deliveryAsignado: "Juan",
            estadoDelivery: SUBESTADOS_MOTODELIVERY.FIN,
            sinEntregar: true,
        })]);
        expect(r.totalPedidos).toBe(0);
        expect(r.totalEfectivo).toBe(0);
        expect(r.deliverys["rep-1"]).toEqual({ nombre: "Juan", cantidadPedidos: 1, totalEnvios: 1500, efectivoCobrado: 0 });
    });

    test("entregado sin repartidor: suma a la caja, no a ningún repartidor", () => {
        const r = calcularArqueo([pedido({ envio: ZONA_1, deliveryID: "", entregaSinRepartidor: "Jefa" })]);
        expect(r.totalPedidos).toBe(1);
        expect(r.totalEfectivo).toBe(10000);
        expect(r.deliverys).toEqual({});
    });
});

describe("lo que el F4 muestra aparte", () => {
    const noche = [
        pedido(),                                                          // entregado: ya suma
        pedido({ estado: ESTADOS.COCINA, total: 8000 }),                   // cobrado sin entregar
        pedido({ estado: ESTADOS.PENDIENTEMP, total: 9000 }),              // cobrado sin entregar
        pedido({ estado: ESTADOS.DELIVERY, total: 7000, sinEntregar: true, estadoDelivery: SUBESTADOS_MOTODELIVERY.FIN }),
        pedido({ estado: ESTADOS.ELIMINADO, total: 5000 }),                // anulado: no falta nada
        pedido({ cajeroID: undefined, estado: ESTADOS.WEB_PENDIENTE }),    // nunca se cobró
    ];

    test("cobradosSinEntregar suma lo cobrado que todavía no se entregó", () => {
        expect(cobradosSinEntregar(noche)).toEqual({ pedidos: 3, monto: 8000 + 9000 + 7000 });
    });

    test("sinEntregarPendientes son los viajes de vuelta sin anular", () => {
        expect(sinEntregarPendientes(noche)).toHaveLength(1);
        expect(sinEntregarPendientes([pedido({ estado: ESTADOS.ELIMINADO, sinEntregar: true })])).toHaveLength(0);
    });

    test("una noche sin pedidos no tiene nada pendiente", () => {
        expect(cobradosSinEntregar([])).toEqual({ pedidos: 0, monto: 0 });
    });
});

test("la regla nueva sube la versión del resumen guardado", () => {
    // Si vuelve a 1, las noches guardadas con la regla anterior no se recalculan.
    expect(VERSION_RESUMEN_DIARIO).toBe(2);
});

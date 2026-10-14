// Tests de validarPedido: lo que la Caja exige antes de guardar. Se corren con `npm test`.
import Swal from "sweetalert2";
import validarPedido from "./validarPedido";

jest.mock("sweetalert2", () => ({ fire: jest.fn() }));

const DELIVERY = { zona_envio: "0-1", costo_envio: 500 };
const RETIRA = { zona_envio: "Retira", costo_envio: 0 };

// Un pedido en efectivo que pasa todas las validaciones; cada test rompe una cosa.
const valido = (data = {}, envio = DELIVERY) => ({
    data: {
        telefono: "1134567890", nombre: "Juan Pérez", direccion: "Luro 3300", entreCalles: "Jara y Olazábal",
        envio: JSON.stringify(envio), metodoPago: "EFECTIVO", pagaCon: 20000, ...data,
    },
    carrito: [{ descripcion: "ALIOLI DOBLE", precio: 15700, cantidad: 1, subtotal: 15700 }],
    envioSeleccionado: envio,
    totalFinal: 16200,
    totalBase: 16200,
    montoEfectivo: 0,
});

beforeEach(() => Swal.fire.mockClear());

describe("validarPedido, campos obligatorios", () => {
    test("un pedido completo pasa", () => {
        expect(validarPedido(valido())).toBe(true);
        expect(Swal.fire).not.toHaveBeenCalled();
    });
    test("nombre y apellido con espacios en el medio pasa", () => {
        expect(validarPedido(valido({ nombre: "  María José Gómez " }))).toBe(true);
    });
    test("sin nombre, o solo con espacios, no pasa", () => {
        expect(validarPedido(valido({ nombre: "" }))).toBe(false);
        expect(validarPedido(valido({ nombre: "   " }))).toBe(false);
    });
    test("un delivery sin dirección o sin entre calles no pasa", () => {
        expect(validarPedido(valido({ direccion: "" }))).toBe(false);
        expect(validarPedido(valido({ entreCalles: " " }))).toBe(false);
    });
    test("en Retira no hacen falta dirección, entre calles ni teléfono", () => {
        expect(validarPedido(valido({ direccion: "", entreCalles: "", telefono: "" }, RETIRA))).toBe(true);
    });
});

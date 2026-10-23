// Tests del carrito de la web pública. Lo más importante es aplanarCarrito: es lo
// que recibe la Caja. Se corren con `npm test`.
import {
    nuevaLinea, agregar, quitar, cambiarCantidad, totalCarrito, cantidadProductos, precioLinea,
    lineaSimpleDe, actualizarConCatalogo, aplanarCarrito, armarSolicitud, totalConPago, mensajeWhatsApp,
} from "./carritoWeb";

const p = (id, descripcion, categoria, precio, extra = {}) => ({ id, descripcion, categoria, precio, ...extra });
const BLT_DOBLE = p("blt2", "BLT DOBLE", "DOBLE", 15700);
const FETA = p("ex1", "FETA DE CHEDDAR", "EXTRA", 400, { tipoExtra: "HAMBURGUESA" });
const ALIOLI = p("ex5", "SALSA ALIOLI HAMB.", "EXTRA", 1000, { tipoExtra: "HAMBURGUESA" });
const CAJA = p("cp2", "Caja Papas Con cheddar", "CAJA PAPAS", 16000);
const COCA = p("bb1", "Coca cola 600ml", "BEBIDAS", 2200);

describe("armar el carrito", () => {
    test("dos líneas iguales se juntan; con otros extras o nota, no", () => {
        let c = agregar([], nuevaLinea(COCA));
        c = agregar(c, nuevaLinea(COCA));
        expect(c).toHaveLength(1);
        expect(c[0].cantidad).toBe(2);

        c = agregar(c, nuevaLinea(BLT_DOBLE, [FETA]));
        c = agregar(c, nuevaLinea(BLT_DOBLE, [FETA, ALIOLI]));
        c = agregar(c, nuevaLinea(BLT_DOBLE, [FETA], "sin tomate"));
        expect(c).toHaveLength(4);
    });

    test("quitar una hamburguesa se lleva sus extras", () => {
        const linea = nuevaLinea(BLT_DOBLE, [FETA, ALIOLI]);
        const c = quitar(agregar([nuevaLinea(COCA)], linea), linea.lineaId);
        expect(c.map((l) => l.producto.id)).toEqual(["bb1"]);
    });

    test("la cantidad no baja de 1", () => {
        const linea = nuevaLinea(COCA);
        expect(cambiarCantidad([linea], linea.lineaId, -1)[0].cantidad).toBe(1);
        expect(cambiarCantidad([linea], linea.lineaId, 2)[0].cantidad).toBe(3);
    });

    test("precios: cada unidad con sus extras", () => {
        const c = [nuevaLinea(BLT_DOBLE, [FETA, ALIOLI], "", 2), nuevaLinea(COCA, [], "", 2), nuevaLinea(CAJA)];
        expect(precioLinea(c[0])).toBe(2 * (15700 + 400 + 1000));
        // El ejemplo del documento de diseño: BLT Doble + Feta + Alioli, Caja con cheddar y 2 Coca.
        expect(totalCarrito([nuevaLinea(BLT_DOBLE, [FETA, ALIOLI]), nuevaLinea(CAJA), nuevaLinea(COCA, [], "", 2)])).toBe(37500);
        expect(cantidadProductos(c)).toBe(5);
    });

    test("la línea sola de una bebida, para sus botones de la lista", () => {
        const c = [nuevaLinea(COCA, [], "sin hielo"), nuevaLinea(COCA)];
        expect(lineaSimpleDe(c, "bb1")).toBe(c[1]);
        expect(lineaSimpleDe(c, "otro")).toBeUndefined();
    });
});

describe("al entrar, el carrito guardado toma el menú vigente", () => {
    test("precios nuevos, y afuera lo que ya no se vende", () => {
        const guardado = [nuevaLinea({ ...BLT_DOBLE, precio: 10 }, [FETA, ALIOLI]), nuevaLinea(COCA)];
        const menu = [{ ...BLT_DOBLE, precio: 16000 }, FETA];
        const c = actualizarConCatalogo(guardado, menu);
        expect(c).toHaveLength(1);
        expect(c[0].producto.precio).toBe(16000);
        expect(c[0].extras.map((e) => e.id)).toEqual(["ex1"]);
    });
});

describe("lo que recibe la Caja", () => {
    test("cada hamburguesa seguida de sus extras, una por unidad", () => {
        const plano = aplanarCarrito([nuevaLinea(BLT_DOBLE, [FETA, ALIOLI], "sin tomate", 2)]);
        expect(plano.map((x) => x.id)).toEqual(["blt2", "ex1", "ex5", "blt2", "ex1", "ex5"]);
        expect(plano.every((x) => x.cantidad === 1)).toBe(true);
        expect(plano[0]).toMatchObject({ descripcion: "BLT DOBLE", categoria: "DOBLE", subtotal: 15700, observaciones: "sin tomate" });
        expect(plano[1]).toMatchObject({ categoria: "EXTRA", tipoExtra: "HAMBURGUESA", subtotal: 400 });
    });

    test("sin extras, una sola línea con su cantidad: las bebidas como siempre", () => {
        const plano = aplanarCarrito([nuevaLinea(COCA, [], "", 3)]);
        expect(plano).toEqual([{ ...COCA, cantidad: 3, subtotal: 6600 }]);
    });

    test("nada del armado del carrito llega a la Caja", () => {
        const plano = aplanarCarrito([nuevaLinea(BLT_DOBLE, [FETA]), nuevaLinea(COCA)]);
        plano.forEach((x) => {
            expect(x).not.toHaveProperty("lineaId");
            expect(x).not.toHaveProperty("extras");
            expect(x).not.toHaveProperty("grupo");
        });
        expect(plano[2]).not.toHaveProperty("observaciones");
    });
});

describe("la solicitud", () => {
    const carrito = [nuevaLinea(BLT_DOBLE, [FETA]), nuevaLinea(COCA, [], "", 2)];

    test("con retiro no viaja la dirección aunque se haya escrito", () => {
        const s = armarSolicitud({ nombre: " Martina ", telefono: "1123456789", opcion: "Retira", metodoPago: "EFECTIVO", direccion: "Calle 123", entreCalles: "A y B" }, carrito, 10);
        expect(s.cliente).toEqual({ nombre: "Martina", telefono: "1123456789", opcion: "Retira", metodoPago: "EFECTIVO" });
        expect(s).toMatchObject({ estado: "PENDIENTE", origen: "WEB", total: 15700 + 400 + 4400 });
        expect(s.carrito).toHaveLength(3);
    });

    test("con delivery viajan la dirección y las entre calles", () => {
        const s = armarSolicitud({ nombre: "Martina", telefono: "1123456789", opcion: "delivery", metodoPago: "EFECTIVO", direccion: "Calle 123", entreCalles: "A y B" }, carrito, 10);
        expect(s.cliente).toMatchObject({ direccion: "Calle 123", entreCalles: "A y B" });
    });

    test("con la dirección de Google Maps viajan sus coordenadas y el envío, sumado al total", () => {
        const entrega = {
            direccion: "Jara 1250, Localidad", ubicacion: { lat: -34.76, lng: -58.60 },
            distanciaKm: 3.4567, envio: { zona_envio: "3-4", costo_envio: 2300 },
        };
        const datos = { nombre: "Martina", telefono: "1123456789", opcion: "delivery", metodoPago: "MP", entreCalles: "A y B" };
        const s = armarSolicitud(datos, carrito, 10, entrega);
        expect(s.cliente).toMatchObject({ direccion: "Jara 1250, Localidad", entreCalles: "A y B", ubicacion: entrega.ubicacion });
        expect(s.envioWeb).toEqual({ zona_envio: "3-4", costo_envio: 2300, distanciaKm: 3.5 });
        // El recargo va sobre productos + envío, como en la Caja.
        expect(s.total).toBe(Math.round((15700 + 400 + 4400 + 2300) * 1.1));
        expect(s).not.toHaveProperty("envio");
    });

    test("con retiro no viaja el envío aunque se haya elegido una dirección", () => {
        const entrega = { direccion: "Jara 1250", ubicacion: { lat: 0, lng: 0 }, distanciaKm: 3, envio: { zona_envio: "2-3", costo_envio: 2100 } };
        const s = armarSolicitud({ nombre: "M", telefono: "1123456789", opcion: "Retira", metodoPago: "EFECTIVO" }, carrito, 10, entrega);
        expect(s).not.toHaveProperty("envioWeb");
        expect(s.cliente).not.toHaveProperty("ubicacion");
        expect(s.total).toBe(15700 + 400 + 4400);
    });

    test("Mercado Pago suma el recargo, redondeado como en la Caja", () => {
        expect(totalConPago(21000, "MP", 10)).toBe(23100);
        expect(totalConPago(21005, "MP", 10)).toBe(23106);
        expect(totalConPago(21000, "EFECTIVO", 10)).toBe(21000);
    });

    test("el mensaje de WhatsApp sale sin sangría y con el pago legible", () => {
        const texto = mensajeWhatsApp({ nombre: "Martina", telefono: "1123456789", opcion: "delivery", metodoPago: "MP", direccion: "Calle 123", entreCalles: "A y B" }, "https://x/ver-pedido/d/1");
        texto.split("\n").forEach((linea) => expect(linea).toBe(linea.trimStart()));
        expect(texto).toContain("Pago: Mercado Pago");
        expect(texto).toContain("Delivery: Calle 123 (entre A y B)");
        expect(texto.endsWith("https://x/ver-pedido/d/1")).toBe(true);
        expect(texto).not.toContain("Envío");
    });

    test("el mensaje lleva el envío si la web lo calculó", () => {
        const cliente = { nombre: "Martina", telefono: "1123456789", opcion: "delivery", metodoPago: "EFECTIVO", direccion: "Jara 1250" };
        const texto = mensajeWhatsApp(cliente, "https://x", { zona_envio: "3-4", costo_envio: 2300, distanciaKm: 3.5 });
        expect(texto).toMatch(/Envío: .*2\.300 \(3,5 km\)/);
    });
});

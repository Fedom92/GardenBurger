import { useCallback, useEffect, useRef, useState } from "react";
import { ESTADOS, METODOS_PAGO, etiquetaPago } from "../../Utils/Constantes";

// El carrito de la web pública. Cada línea lleva su producto y sus extras ADENTRO
// mientras se arma el pedido —quitar una hamburguesa se lleva sus extras sin
// deducirlos por la posición—, y al confirmar se aplana a la lista que espera la
// Caja (aplanarCarrito). Las funciones son puras y se prueban en carritoWeb.test.js;
// el hook de abajo solo las conecta con el estado y con localStorage.
//
// Línea: { lineaId, producto, extras: [producto], observaciones, cantidad }. El
// producto y los extras van enteros, como los publica menu.json (decisión del dueño:
// el carrito guarda la ficha entera del producto).

const precio = (p) => Number(p?.precio) || 0;

// crypto.randomUUID solo existe en contexto seguro y en navegadores de 2022 en
// adelante: el respaldo alcanza para distinguir líneas de un carrito.
const nuevoId = () =>
    window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const nuevaLinea = (producto, extras = [], observaciones = "", cantidad = 1) => ({
    lineaId: nuevoId(),
    producto,
    extras,
    observaciones: observaciones.trim(),
    cantidad,
});

// Dos líneas iguales —mismo producto, mismos extras, misma nota— son una sola con
// más cantidad: "2 × Coca-Cola", "2 × BLT Doble + Feta".
const firma = (l) => [l.producto.id, l.extras.map((e) => e.id).sort().join(","), l.observaciones].join("|");

export const agregar = (carrito, linea) => {
    const igual = carrito.find((l) => firma(l) === firma(linea));
    if (!igual) return [...carrito, linea];
    return carrito.map((l) => (l === igual ? { ...l, cantidad: l.cantidad + linea.cantidad } : l));
};

export const quitar = (carrito, lineaId) => carrito.filter((l) => l.lineaId !== lineaId);

// Nunca por debajo de 1: para sacar una línea está quitar().
export const cambiarCantidad = (carrito, lineaId, cambio) =>
    carrito.map((l) => (l.lineaId === lineaId ? { ...l, cantidad: Math.max(1, l.cantidad + cambio) } : l));

export const precioUnidad = (linea) => precio(linea.producto) + linea.extras.reduce((t, e) => t + precio(e), 0);
export const precioLinea = (linea) => precioUnidad(linea) * linea.cantidad;
export const totalCarrito = (carrito) => carrito.reduce((t, l) => t + precioLinea(l), 0);
export const cantidadProductos = (carrito) => carrito.reduce((t, l) => t + l.cantidad, 0);

// La línea "sola" de un producto —sin extras ni nota—: la que suman y restan los
// botones de la lista de bebidas.
export const lineaSimpleDe = (carrito, productoId) =>
    carrito.find((l) => l.producto.id === productoId && !l.extras.length && !l.observaciones);

// El carrito guardado en el navegador puede ser de otro día: al entrar toma los
// precios del menú vigente y se descarta lo que ya no se vende. Sin esto, un carrito
// armado antes de un aumento mostraba el precio viejo y la Caja cobraba el nuevo.
export const actualizarConCatalogo = (carrito, productos = []) => {
    const porId = new Map(productos.map((p) => [p.id, p]));
    return carrito
        .filter((l) => porId.has(l.producto?.id))
        .map((l) => ({
            ...l,
            producto: porId.get(l.producto.id),
            extras: l.extras.filter((e) => porId.has(e.id)).map((e) => porId.get(e.id)),
        }));
};

// Lo que se guarda en la solicitud: la lista plana que leen la Caja
// (useRevisarSolicitud) y Cocina, que agrupan los extras POR POSICIÓN —cada extra es
// del producto que tiene arriba—. Es el contrato con la Caja: ver "Lo que un rehecho
// no puede romper" en docs/Web publica.md antes de tocarlo.
//
// Una línea con extras se repite `cantidad` veces, cada producto con sus extras
// debajo: "2 × BLT Doble + Feta" son dos hamburguesas, cada una con su feta, igual
// que si el cliente la hubiera agregado dos veces. Sin extras, viaja en una sola
// línea con su cantidad, como las bebidas siempre.
export const aplanarCarrito = (carrito) =>
    carrito.flatMap((l) => {
        const nota = l.observaciones ? { observaciones: l.observaciones } : {};
        if (!l.extras.length) {
            return [{ ...l.producto, ...nota, cantidad: l.cantidad, subtotal: precio(l.producto) * l.cantidad }];
        }
        return Array.from({ length: l.cantidad }, () => [
            { ...l.producto, ...nota, cantidad: 1, subtotal: precio(l.producto) },
            ...l.extras.map((e) => ({ ...e, cantidad: 1, subtotal: precio(e) })),
        ]).flat();
    });

// El tope de líneas de una solicitud web: lo exige esCreacionPublicaValida() en
// firestore.rules. Un pedido más grande se pide por teléfono.
export const MAX_LINEAS_SOLICITUD = 50;

// Lo que paga el cliente: con Mercado Pago, más el recargo (REACT_APP_recargoMP),
// redondeado como lo redondea la Caja.
export const totalConPago = (total, metodoPago, recargoMP) =>
    metodoPago === METODOS_PAGO.MP.key ? Math.round(total * (1 + (Number(recargoMP) || 0) / 100)) : total;

// La solicitud, sin lo que pone Firestore (clienteTimestamp) ni lo que sale de la
// sucursal leída al confirmar (telefonoSucursal, mensajeWsp). Con "Retiro" no viajan
// dirección ni entre calles, aunque se hayan escrito antes de cambiar de opción.
export const armarSolicitud = (datos, carrito, recargoMP) => {
    const { nombre = "", telefono = "", opcion, metodoPago, direccion = "", entreCalles = "" } = datos;
    const cliente = { nombre: nombre.trim(), telefono, opcion, metodoPago };
    if (opcion === "delivery") {
        cliente.direccion = direccion.trim();
        cliente.entreCalles = entreCalles.trim();
    }
    return {
        cliente,
        carrito: aplanarCarrito(carrito),
        total: totalConPago(totalCarrito(carrito), metodoPago, recargoMP),
        estado: ESTADOS.WEB_PENDIENTE,
        origen: "WEB",
    };
};

// El resumen que se abre en WhatsApp al confirmar, y que /ver-pedido reusa con su
// botón. Línea por línea: el template indentado de antes lo mandaba con sangría.
export const mensajeWhatsApp = (cliente, urlDetalle) => [
    "🍔 *NUEVO PEDIDO WEB*",
    "",
    `👤 Nombre: ${cliente.nombre}`,
    `📞 Teléfono: ${cliente.telefono}`,
    `💳 Pago: ${etiquetaPago(cliente.metodoPago)}`,
    cliente.opcion === "delivery"
        ? `🛵 Delivery: ${cliente.direccion}${cliente.entreCalles ? ` (entre ${cliente.entreCalles})` : ""}`
        : "🏪 Retiro en el local",
    "",
    "🔎 *Ver detalle del pedido*",
    urlDetalle,
].join("\n");

// ── El hook ────────────────────────────────────────────────────────────────

// Un carrito por sucursal, cada uno con su clave: el cliente que vuelve al selector
// y entra a otra sucursal no arrastra lo que eligió en la primera, y si vuelve a la
// primera, lo encuentra. Las claves viejas (de antes de cambiar la forma de la
// línea, y la de un solo carrito para todas) se borran.
const clave = (sucursal) => `pedidoWeb:${sucursal}`;
const CLAVES_VIEJAS = ["pedidoWeb", "carritoWeb", "carritoWebGrupo", "carrito", "combo"];

const esLinea = (l) => Boolean(l?.lineaId && l.producto?.id && Array.isArray(l.extras) && l.cantidad > 0);

const leerGuardado = (sucursal) => {
    try {
        CLAVES_VIEJAS.forEach((c) => localStorage.removeItem(c));
        const guardado = JSON.parse(localStorage.getItem(clave(sucursal)));
        return Array.isArray(guardado) ? guardado.filter(esLinea) : [];
    } catch {
        return []; // modo privado o storage lleno: el carrito arranca vacío
    }
};

// El carrito de la página del pedido: solo esa página lo usa, así que no hace falta
// un contexto para toda la app (antes CartProvider envolvía también al staff).
export const useCarritoWeb = (sucursal) => {
    const [estado, setEstado] = useState(() => ({ sucursal, carrito: leerGuardado(sucursal) }));
    // De una sucursal a otra sin pasar por el selector (la misma ruta, otro parámetro)
    // la página no se vuelve a montar: el carrito se cambia acá, antes de dibujar.
    if (estado.sucursal !== sucursal) setEstado({ sucursal, carrito: leerGuardado(sucursal) });
    const { carrito } = estado;
    const actual = useRef(carrito);
    actual.current = carrito;

    useEffect(() => {
        try {
            localStorage.setItem(clave(estado.sucursal), JSON.stringify(estado.carrito));
        } catch {
            // sin storage: el carrito vive mientras la página esté abierta
        }
    }, [estado]);

    const cambiar = useCallback((f) => setEstado((e) => ({ ...e, carrito: f(e.carrito) })), []);
    const agregarLinea = useCallback((linea) => cambiar((c) => agregar(c, linea)), [cambiar]);
    const quitarLinea = useCallback((lineaId) => cambiar((c) => quitar(c, lineaId)), [cambiar]);
    const sumar = useCallback((lineaId) => cambiar((c) => cambiarCantidad(c, lineaId, 1)), [cambiar]);
    const restar = useCallback((lineaId) => cambiar((c) => cambiarCantidad(c, lineaId, -1)), [cambiar]);
    const vaciar = useCallback(() => cambiar(() => []), [cambiar]);
    // Devuelve cuántas líneas se sacaron por no estar más en el menú, para avisarlo.
    const actualizarPrecios = useCallback((productos) => {
        const nuevo = actualizarConCatalogo(actual.current, productos);
        const quitadas = actual.current.length - nuevo.length;
        cambiar(() => nuevo);
        return quitadas;
    }, [cambiar]);

    return { carrito, agregarLinea, quitarLinea, sumar, restar, vaciar, actualizarPrecios };
};

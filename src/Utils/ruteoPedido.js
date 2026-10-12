import { ENVIOS_LOCALES, ESTADOS } from "./Constantes";

// Lo que prepara la cocina: todo menos las bebidas, que despacha la caja.
export const getItemsCocina = (carrito = []) =>
    carrito.filter(item => item.categoria !== "BEBIDAS");

// ATP (mostrador) o DELIVERY (reparto), según la zona que cargó el cajero.
export const destinoPedidoListo = (envio) =>
    ENVIOS_LOCALES.includes(envio?.zona_envio) ? ESTADOS.ATP : ESTADOS.DELIVERY;

// Al quedar cobrado: a la cocina, o directo a entrega si no hay nada que cocinar.
export const estadoAlConfirmar = ({ carrito, envio }) =>
    getItemsCocina(carrito).length > 0 ? ESTADOS.CONFIRMADO : destinoPedidoListo(envio);

// Minutos antes de la hora pedida a partir de los cuales tiene sentido empezar a
// cocinar un pedido con horario especial.
export const TIEMPO_MIN_PEDIDOESP = 30;

export const CATEGORIAS_HAMBURGUESA = [
  "SIMPLE",
  "DOBLE",
  "TRIPLE",
];

// `excludes` (opcional): productos que están en la categoría pero no se venden como combo.
// Van con la descripción TEXTUAL del producto, tal cual figura en el catálogo — la
// comparación es exacta, sin normalizar acentos ni mayúsculas.
export const CATEGORIAS_COMBOS = [
  { key: "SIMPLE", label: "Simple" },
  { key: "DOBLE", label: "Doble" },
  { key: "TRIPLE", label: "Triple" },
  { key: "CAJA PAPAS", label: "Papas", excludes: ["(porcion individual)"] },
  { key: "POLLO CRISPY", label: "Pollo Crispy" },
  { key: "NUGGETS", label: "Nuggets" }
];

export const CANTIDAD_CARNES = {
  TRIPLE: 3,
  DOBLE: 2,
  SIMPLE: 1,
  "CARNE EXTRA": 1,
};

export const ESTADOS = {
  WEB_PENDIENTE: "PENDIENTE",
  CONFIRMADO: "CONFIRMADO",
  PENDIENTEMP: "PENDIENTEMP",
  COCINA: "COCINA",
  DELIVERY: "DELIVERY",
  ATP: "ATP",
  FINAL: "ENTREGADO",

  CANCELADO: "CANCELADO",
  ELIMINADO: "ELIMINADO",
};

export const SUBESTADOS_MOTODELIVERY = {
  SALIDA: "SALIO",
  FIN: "VOLVIO",
};

export const FLUJO_PUB_ESTADOS = [
  ESTADOS.WEB_PENDIENTE,
  ESTADOS.CONFIRMADO,
  ESTADOS.COCINA,
  ESTADOS.DELIVERY,
  ESTADOS.FINAL
];

// PENDIENTEMP y ATP son estados internos, sin paso propio en el seguimiento del
// cliente: se ubican en el paso equivalente, porque si no indexOf devuelve -1 y la
// barra queda entera en gris. PENDIENTEMP va a PENDIENTE y no a CONFIRMADO porque
// todavía falta verificar la transferencia; ATP es "listo y esperando al cliente",
// mismo avance que un delivery en camino.
export const getCurrentStepIndex = (estado) => {
  const paso = estado === ESTADOS.PENDIENTEMP ? ESTADOS.WEB_PENDIENTE
    : estado === ESTADOS.ATP ? ESTADOS.DELIVERY
      : estado;

  return FLUJO_PUB_ESTADOS.indexOf(paso);
};

export const ENVIOS_LOCALES = ["Retira", "Espera Afuera"];

// Todo lo que se sabe de cada rol, en un solo lugar. Las claves son el valor
// crudo de la variable de entorno, que es lo que se guarda en `usuarios.rol` y
// no es legible.
//
// - `nombre`: cómo se muestra en pantalla.
// - `rutaInicial`: dónde aterriza al iniciar sesión
// - `llevaMoto` (opcional): si el alta y la edición le piden datos de la moto

export const ROLES = {
  [process.env.REACT_APP_admin]: { nombre: "Admin", rutaInicial: "/productos" },
  [process.env.REACT_APP_encargado]: { nombre: "Encargado", rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cajero]: { nombre: "Cajero", rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cocina]: { nombre: "Cocina", rutaInicial: "/gestion-cocina" },
  [process.env.REACT_APP_delivery]: { nombre: "Delivery", rutaInicial: "/jefe-deliverys", llevaMoto: true },
  [process.env.REACT_APP_atp]: { nombre: "ATP", rutaInicial: "/gestion-atp" },
};
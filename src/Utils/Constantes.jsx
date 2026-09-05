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

// Roles a los que el alta de empleados les pide los datos de la moto. Se usa en
// el formulario de creación y en el de edición, para no repetir la condición.
export const ROLES_CON_MOTO = [process.env.REACT_APP_delivery];

// Los roles se guardan con el valor de su variable de entorno, que no es
// legible. Este mapa los traduce para mostrarlos en pantalla.
export const NOMBRES_ROL = {
  [process.env.REACT_APP_admin]: "Admin",
  [process.env.REACT_APP_encargado]: "Encargado",
  [process.env.REACT_APP_cajero]: "Cajero",
  [process.env.REACT_APP_cocina]: "Cocina",
  [process.env.REACT_APP_delivery]: "Delivery",
  [process.env.REACT_APP_contador]: "Contador",
  [process.env.REACT_APP_atp]: "ATP",
};
export const CATEGORIAS_HAMBURGUESA = [
  "SIMPLE",
  "DOBLE",
  "TRIPLE",
];

export const CATEGORIAS_COMBOS = [
  { key: "SIMPLE", label: "Simple" },
  { key: "DOBLE", label: "Doble" },
  { key: "TRIPLE", label: "Triple" },
  { key: "CAJA PAPAS", label: "Papas" },
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
  CONFIRMADO:          "CONFIRMADO",
  PENDIENTE_MP:        "PENDIENTEMP",
  SOLICITUD_PENDIENTE: "PENDIENTE",
  COCINA:              "COCINA",
  DELIVERY:            "DELIVERY",
  FINAL:               "ENTREGADO",
  
  CANCELADO:           "CANCELADO",
  ELIMINADO:           "ELIMINADO",
};

export const SUBESTADOS_MOTODELIVERY = {
  INICIA: "SALIO",
  FIN: "VOLVIO",
};

export const FLUJO_PUB_ESTADOS = [
  ESTADOS.SOLICITUD_PENDIENTE,
  ESTADOS.CONFIRMADO,
  ESTADOS.COCINA,
  ESTADOS.DELIVERY,
  ESTADOS.FINAL
];

export const getCurrentStepIndex = (estado) => {
  return FLUJO_PUB_ESTADOS.indexOf(estado);
};
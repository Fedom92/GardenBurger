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

// Cuándo abre el local. Define la jornada comercial de TODO el sistema —arqueo,
// buscadores, historial, asistencias— y el horario de la web pública.
//
// Vive en código y no en el .env: no es un secreto, y las REACT_APP_ se meten en
// el bundle al hacer el build igual, así que el .env no daba ninguna flexibilidad
// extra. Acá queda versionado y en un solo lugar. Cambiarlo es un build y un deploy.
export const HORARIO = {
  // Formato de moment: 0 = domingo ... 6 = sábado. Se cuentan por JORNADA: el
  // domingo a las 00:30 sigue siendo la noche del domingo aunque el reloj diga
  // lunes. Solo lo mira la web pública: la Caja trabaja cualquier día.
  diasApertura: [3, 4, 5, 6, 0],   // miércoles a domingo
  horaAbre: 19,
  // El cierre es margen: no se trabaja pasada la 1. La web deja de tomar pedidos
  // una hora antes (HORA_CIERRE_WEB en fechaComercial).
  horaCierre: 2,
};

// Los métodos de pago: `key` es el valor que se guarda en el pedido y `label` lo
// que se muestra. Igual que ESTADOS: nunca escribir "EFECTIVO", "MP" o "%" a
// mano. El "%" del pago dividido es el que más se presta a errores.
export const METODOS_PAGO = {
  EFECTIVO: { key: "EFECTIVO", label: "Efectivo" },
  MP: { key: "MP", label: "Mercado Pago" },
  DIVIDIDO: { key: "%", label: "Dividido" },
};

// La etiqueta de un valor guardado: "%" -> "Dividido". Si el valor no es uno de
// los conocidos, lo devuelve tal cual en vez de mostrar un vacío.
export const etiquetaPago = (valor) =>
  Object.values(METODOS_PAGO).find((m) => m.key === valor)?.label ?? valor;

// Quién ve el botón "Sincronizar permisos" del PanelAdmin. Es solo visual: la Cloud
// Function sincronizarClaims exige ser admin igual. Queda en el JavaScript público
// del sitio, y el dueño decidió que no importa (26-09-2026).
export const EMAIL_SUPERADMIN = "fede92dominguez@gmail.com";

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
  // Los repartidores no usan el sistema: existen como empleados para la asistencia
  // y para asignarles pedidos. Sin rutaInicial, porque no tienen modulo, y
  // `sinAcceso`: el alta no les crea cuenta de Auth (lo decide el rol, no un check).
  [process.env.REACT_APP_delivery]: { nombre: "Delivery", llevaMoto: true, sinAcceso: true },
  [process.env.REACT_APP_jefeDeliverys]: { nombre: "Jefe de Deliverys", rutaInicial: "/jefe-deliverys" },
  [process.env.REACT_APP_atp]: { nombre: "ATP", rutaInicial: "/gestion-atp" },
};
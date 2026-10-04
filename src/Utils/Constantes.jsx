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

// Categorías que se venden SOLO en la Caja —los productos para empleados—: la web
// pública no las muestra, ni en menu.json ni en sus respaldos contra Firestore.
// Hardcodeadas por decisión del dueño (26-09-2026). Si algún día son muchas, el
// camino es una casilla "solo en Caja" en el producto.
export const CATEGORIAS_SOLO_CAJA = ["COMBO GARDEN", "GARDEN SIN PAPAS"];


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

// La jornada comercial: de horaAbre de un día a horaCierre del siguiente. Es lo que
// significa "hoy" en TODO el sistema —arqueo, fotos, Métricas, Estadísticas,
// buscadores, historial, asistencias—: un pedido de las 00:30 es de la noche
// anterior, y a horaCierre el sistema pasa al día siguiente.
//
// NO es el horario de atención. Los días y horas en que cada sucursal toma pedidos
// por la web están en su documento (`sucursales/{id}.horario`), editables desde el
// ABM, y tienen que caer dentro de este rango: es el margen que agrupa los pedidos
// de una noche, abra la sucursal a la hora que abra.
//
// Vive en código y no en el .env: no es un secreto, y las REACT_APP_ se meten en
// el bundle al hacer el build igual, así que el .env no daba ninguna flexibilidad
// extra. Acá queda versionado y en un solo lugar. Cambiarlo es un build y un deploy.
export const HORARIO = {
  horaAbre: 19,
  horaCierre: 2,
};

// Desde qué hora se puede mirar el arqueo (F4), hasta horaCierre. El arqueo cuesta
// leer los pedidos de la noche: la ventana evita pagarlo por curiosidad a las 21.
// Igual para todas las sucursales, por decisión del dueño (28-09-2026): atarla al
// cierre de cada una obligaba a la Caja a leer el horario de su sucursal.
export const HORA_HABILITA_STATS = 0;

// A los cuántos minutos una solicitud web tomada ("Revisar") y no terminada se
// considera abandonada —al cajero se le reinició la PC, se fue, cerró el navegador—
// y cualquier otro cajero puede tomarla. El mismo valor está en asignacionValida()
// de firestore.rules, que es la que lo hace cumplir: si cambia, cambiar los dos.
export const MINUTOS_SOLICITUD_TOMADA = 15;

// Qué pasa con la diferencia cuando el cliente de un delivery paga en efectivo con
// un billete más grande. La moto no lleva cambio: o el repartidor trae esa plata y
// los admins le transfieren el vuelto al cliente, o queda de propina para él. Lo
// elige el cajero al tomar el pedido. Mismo formato que METODOS_PAGO.
export const DESTINO_VUELTO = {
  VUELTO:  { key: "VUELTO",  label: "Vuelto" },
  PROPINA: { key: "PROPINA", label: "Propina" },
};

// Los métodos de pago: `key` es el valor que se guarda en el pedido y `label` lo
// que se muestra. Igual que ESTADOS: nunca escribir "EFECTIVO", "MP" o "%" a
// mano. El "%" del pago dividido es el que más se presta a errores.
export const METODOS_PAGO = {
  EFECTIVO: { key: "EFECTIVO", label: "Efectivo" },
  MP:       { key: "MP",      label: "Mercado Pago" },
  DIVIDIDO: { key: "%",       label: "Dividido" },
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
  [process.env.REACT_APP_admin]:      { nombre: "Admin",      rutaInicial: "/productos" },
  [process.env.REACT_APP_encargado]:  { nombre: "Encargado",  rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cajero]:     { nombre: "Cajero",     rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cocina]:     { nombre: "Cocina",     rutaInicial: "/gestion-cocina" },
  [process.env.REACT_APP_atp]:        { nombre: "ATP",        rutaInicial: "/gestion-atp" },

  [process.env.REACT_APP_jefeDeliverys]: { nombre: "Jefe de Deliverys", rutaInicial: "/jefe-deliverys" },
  // Los repartidores no usan el sistema: existen como empleados para la asistencia
  // y para asignarles pedidos. Sin rutaInicial, porque no tienen modulo, y
  // `sinAcceso`: el alta no les crea cuenta de Auth (lo decide el rol, no un check).
  [process.env.REACT_APP_delivery]: { nombre: "Delivery", llevaMoto: true, sinAcceso: true },
};
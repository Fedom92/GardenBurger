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

// La jornada comercial: de horaAbre de un día a horaCierre del siguiente. Es lo que
// significa "hoy" en TODO el sistema —arqueo, resúmenes guardados, Métricas, Estadísticas,
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
// - `nroOrden`: el orden de los roles en las listas, los selects y las tablas.
// - `rutaInicial`: dónde aterriza al iniciar sesión
// - `editable` (opcional): si el admin lo puede asignar al dar de alta o editar un
//   empleado. Sin declarar, sí; solo Admin lo declara en false, porque se crea a
//   mano en la Consola de Firebase.
// - `llevaMoto` (opcional): si el alta y la edición le piden datos de la moto

export const ROLES = {
  [process.env.REACT_APP_admin]:      { nombre: "Admin",      nroOrden: 1, rutaInicial: "/productos", editable: false },
  [process.env.REACT_APP_encargado]:  { nombre: "Encargado",  nroOrden: 2, rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cajero]:     { nombre: "Cajero",     nroOrden: 3, rutaInicial: "/pedidos-caja" },
  [process.env.REACT_APP_cocina]:     { nombre: "Cocina",     nroOrden: 4, rutaInicial: "/gestion-cocina" },
  [process.env.REACT_APP_atp]:        { nombre: "ATP",        nroOrden: 5, rutaInicial: "/gestion-atp" },

  [process.env.REACT_APP_jefeDeliverys]: { nombre: "Jefe de Deliverys", nroOrden: 6, rutaInicial: "/jefe-deliverys" },
  // Los repartidores no usan el sistema: existen como empleados para la asistencia
  // y para asignarles pedidos. Sin rutaInicial, porque no tienen modulo, y
  // `sinAcceso`: el alta no les crea cuenta de Auth (lo decide el rol, no un check).
  [process.env.REACT_APP_delivery]: { nombre: "Delivery", nroOrden: 7, llevaMoto: true, sinAcceso: true },
};

// El nroOrden de un rol, para ordenar. Un rol que no está en ROLES va al final.
export const ordenDeRol = (rol) => ROLES[rol]?.nroOrden ?? Infinity;

// Los roles que el admin puede asignar, en su orden: todos menos los que declaran
// `editable: false`.
export const ROLES_EDITABLES = Object.keys(ROLES)
  .filter((rol) => ROLES[rol].editable !== false)
  .sort((a, b) => ordenDeRol(a) - ordenDeRol(b));
// Formateo de montos, números y fechas, en un solo lugar. Los montos estaban
// repetidos en ocho archivos; las fechas, en una veintena (15-10-2026).
import moment from "moment";
import "moment/locale/es";

// ── Montos ──────────────────────────────────────────────────────────────
// Los montos se leen de un vistazo y a las apuradas: van siempre con separador de
// miles, que $77.000 no se confunda con $7.700.

export const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

// Para los <input type="number"> de precios: los pesos van enteros. Un input
// numérico acepta ".", ",", "e", "+" y "-" al tipear; esto los frena. Lo pegado
// lo frena `step={1}`, que hace que el formulario no se envíe con decimales.
export const soloEnteros = (e) => {
    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

// Para lo que sale de una multiplicación y puede traer decimales, como
// `horas × valorHora` en la liquidación. Los pesos no se muestran partidos.
export const fmtPesosRedondeado = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;

// ── Números ─────────────────────────────────────────────────────────────
// Pedidos, unidades, noches: con separador de miles, y un dato que falta es 0. El
// Histórico y los componentes de Estadísticas tienen el suyo SIN esa guarda, a
// propósito: ahí un faltante tiene que verse como NaN (ver Deuda tecnica).
export const fmtNumero = (n) => (Number(n) || 0).toLocaleString("es-AR");

// ── Fechas ──────────────────────────────────────────────────────────────
// Los nombres de días y meses salen del locale "es" de moment, no de listas
// escritas a mano: estaban copiadas en Estadísticas Generales, el Histórico,
// fechaComercial y el formulario de sucursales.
const es = moment.localeData("es");
const abreviado = (nombre) => nombre.charAt(0).toUpperCase() + nombre.slice(1).replace(".", "");

export const NOMBRES_DIAS = [...es.weekdays()];               // "domingo" … "sábado": 0 = domingo, como moment().day()
export const DIAS_CORTOS = es.weekdaysShort().map(abreviado); // "Dom" … "Sáb"
export const MESES_CORTOS = es.monthsShort().map(abreviado);  // "Ene" … "Dic"

// Los valores de <input type="date"> y <input type="month">.
export const FORMATO_INPUT_FECHA = "YYYY-MM-DD";
export const FORMATO_INPUT_MES = "YYYY-MM";
export const aInputFecha = (fecha) => moment(fecha).format(FORMATO_INPUT_FECHA);

// Fechas en pantalla. Reciben un Timestamp de Firestore, un Date, un moment o un
// "YYYY-MM-DD"; sin fecha devuelven "—": moment(undefined) es AHORA, así que una
// celda sin hora mostraba la hora actual como si fuera la del pedido.
const aMoment = (fecha) => (fecha?.toDate ? moment(fecha.toDate()) : fecha ? moment(fecha) : null);
export const fmtFecha = (fecha) => aMoment(fecha)?.format("DD/MM/YYYY") ?? "—";
export const fmtHora = (fecha) => aMoment(fecha)?.format("HH:mm") ?? "—";
export const fmtFechaHora = (fecha) => aMoment(fecha)?.format("DD/MM/YYYY HH:mm") ?? "—";

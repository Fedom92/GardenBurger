// Utils/fechaComercial.js
import moment from "moment";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig/firebase";
import { HORARIO } from "./Constantes";

// Diferencia entre la hora del servidor (Cloud Function "horaServidor") y la de esta PC.
// Evita que un reloj desconfigurado impute ventas a la jornada equivocada.
// La timezone la fija moment.tz.setDefault() en index.js.
let offsetMs = 0;

export const sincronizarHoraServidor = async () => {
    try {
        const horaServidor = httpsCallable(getFunctions(app), "horaServidor");
        const { data } = await horaServidor();
        offsetMs = data.ahora - Date.now();
        return true;
    } catch (error) {
        console.error("No srv sincron", error);
        offsetMs = 0; // sin conexión: se usa la hora local
        // Devuelve false para que quien la llama avise: justo en las PCs con el
        // reloj corrido es donde esto importa.
        return false;
    }
};

// Hora corregida por el offset del servidor. Todo lo que se grabe con una fecha
// armada a mano tiene que salir de acá y no de new Date(): en el local hay PCs
// con el reloj corrido.
export const ahoraServidor = () => moment(Date.now() + offsetMs);

export const HORA_CIERRE = HORARIO.horaCierre;

// Jornada comercial a la que pertenece una fecha cualquiera, en DD-MM-YYYY: el
// mismo formato que usa el id de los documentos de resumenDiario y asistencias.
// Un pedido de las 00:30 es de la noche anterior.
//
// Existe aparte de getFechaComercial() porque el arqueo de un pedido tiene que
// ir a la jornada DEL PEDIDO y no a la de ahora: eliminar hoy un pedido de ayer
// descontaba del dia equivocado.
export const getFechaComercialDe = (fecha) => {
    const m = moment(fecha);
    if (m.hour() < HORA_CIERRE) m.subtract(1, 'day');
    return m.format("DD-MM-YYYY");
};

export const getFechaComercial = () => getFechaComercialDe(ahoraServidor());

// Lo mismo pero devolviendo un Date al inicio de la jornada, para agrupar datos
// historicos (Estadisticas). Va por moment y no por Date nativo: Date lee la
// zona horaria de la PC, y todo el resto del modulo trabaja en hora argentina
// porque index.js hace moment.tz.setDefault().
export const getJornadaDeFecha = (date) => {
    const m = moment(date);
    if (m.hour() < HORA_CIERRE) m.subtract(1, 'day');
    return m.startOf('day').toDate();
};

// Rango {inicio, fin} de CUALQUIER jornada, a partir de su id en DD-MM-YYYY.
// Hace falta para leer los pedidos de una jornada que ya cerró: el arqueo se
// calcula desde esos pedidos, no desde un contador acumulado.
export const getRangoDeJornada = (jornada) => {
    const startHour = HORARIO.horaAbre;
    const dia = moment(jornada, "DD-MM-YYYY");

    const inicio = dia.clone().set({ hour: startHour, minute: 0, second: 0, millisecond: 0 });
    const fin = dia.clone().add(1, 'day').set({ hour: HORA_CIERRE, minute: 0, second: 0, millisecond: 0 });

    return { inicio: inicio.toDate(), fin: fin.toDate() };
};

export const getRangoJornada = () => getRangoDeJornada(getFechaComercial());

// Si la jornada ya entro en su madrugada, que es cuando se cierra la caja. Es la
// MISMA condicion que usa getFechaComercialDe para decidir que "ahora" todavia
// pertenece a la noche anterior: antes de las 00 el turno sigue vendiendo y el
// arqueo no significa nada, y pasado horaCierre la jornada ya es otra.
//
// El arqueo cuesta un barrido de la jornada, asi que la ventana no es solo una
// regla de negocio: evita que se pague esa lectura cada vez que alguien tiene
// curiosidad a las 21.
export const esHoraDeArqueo = () => ahoraServidor().hour() < HORA_CIERRE;


// ── Horario de la web pública ──────────────────────────────────────────────
// La web toma pedidos desde horaAbre hasta UNA HORA ANTES de horaCierre. El
// cierre es margen —no se trabaja esa última hora—, y una solicitud que entrara
// sobre el cierre se confirmaría pasado horaCierre y caería en el hueco de las
// 02 a las 19, fuera de todo arqueo.
export const HORA_CIERRE_WEB = HORA_CIERRE - 1;

// Los días van por JORNADA, no por calendario (ver HORARIO.diasApertura).
export const webRecibePedidos = () => {
    const ahora = ahoraServidor();
    const hora = ahora.hour();
    const enHorario = hora >= HORARIO.horaAbre || hora < HORA_CIERRE_WEB;
    if (!enHorario) return false;
    const diaJornada = moment(getFechaComercialDe(ahora), "DD-MM-YYYY").day();
    return HORARIO.diasApertura.includes(diaJornada);
};

const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// "de miércoles a domingo, de 19 a 1 hs", armado con las mismas constantes que
// deciden si la web abre: si cambian, el cartel cambia solo.
export const textoHorarioWeb = () => {
    const dias = HORARIO.diasApertura.map((d) => NOMBRES_DIAS[d]);
    const seguidos = HORARIO.diasApertura.every((d, i) => i === 0 || d === (HORARIO.diasApertura[i - 1] + 1) % 7);
    const textoDias = seguidos && dias.length > 2
        ? `de ${dias[0]} a ${dias[dias.length - 1]}`
        : dias.length > 1 ? `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}` : dias[0];
    return `${textoDias}, de ${HORARIO.horaAbre} a ${HORA_CIERRE_WEB} hs`;
};

// La jornada en curso todavía se está moviendo: su arqueo no se puede congelar.
export const jornadaEstaAbierta = (jornada) => jornada === getFechaComercial();

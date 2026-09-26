// Utils/fechaComercial.js
import moment from "moment";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig/firebase";

// Diferencia entre la hora del servidor (Cloud Function "horaServidor") y la de esta PC.
// Evita que un reloj desconfigurado impute ventas a la jornada equivocada.
// La timezone la fija moment.tz.setDefault() en index.js.
let offsetMs = 0;

export const sincronizarHoraServidor = async () => {
    try {
        const horaServidor = httpsCallable(getFunctions(app), "horaServidor");
        const { data } = await horaServidor();
        offsetMs = data.ahora - Date.now();
    } catch (error) {
        console.error("No srv sincron", error);
        offsetMs = 0; // sin conexión: se usa la hora local
    }
    return offsetMs;
};

// Hora corregida por el offset del servidor. Todo lo que se grabe con una fecha
// armada a mano tiene que salir de acá y no de new Date(): en el local hay PCs
// con el reloj corrido.
export const ahoraServidor = () => moment(Date.now() + offsetMs);

export const HORA_CIERRE = Number(process.env.REACT_APP_horaCierre);

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

export const getRangoJornada = () => {
    const ahora = ahoraServidor();
    const startHour = Number(process.env.REACT_APP_horaAbre);
    const endHour = Number(process.env.REACT_APP_horaCierre);

    const esJornadaAnterior = ahora.hour() < endHour;

    const fechaJornada = esJornadaAnterior
        ? ahora.clone().subtract(1, 'day')
        : ahora.clone();

    const inicio = fechaJornada.set({ hour: startHour, minute: 0, second: 0, millisecond: 0 });
    const fin = fechaJornada.clone().add(1, 'day').set({ hour: endHour, minute: 0, second: 0, millisecond: 0 });

    return { inicio: inicio.toDate(), fin: fin.toDate() };
};

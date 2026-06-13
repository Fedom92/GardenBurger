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

const ahoraServidor = () => moment(Date.now() + offsetMs);

export const getFechaComercial = () => {
    const ahora = ahoraServidor();
    if (ahora.hour() < Number(process.env.REACT_APP_horaCierre)) {
        return ahora.subtract(1, 'day').format("DD-MM-YYYY");
    }
    return ahora.format("DD-MM-YYYY");
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

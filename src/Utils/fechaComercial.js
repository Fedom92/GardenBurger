// Utils/fechaComercial.js
import moment from "moment";

export const getFechaComercial = () => {
    const ahora = moment();
    if (ahora.hour() < Number(process.env.REACT_APP_horaCierre)) {
        return ahora.subtract(1, 'day').format("DD-MM-YYYY");
    }
    return ahora.format("DD-MM-YYYY");
};

export const getRangoJornada = () => {
    const ahora = moment();
    const startHour = Number(process.env.REACT_APP_horaAbre);
    const endHour = Number(process.env.REACT_APP_horaCierre);

    const esJornadaAnterior = ahora.hour() < endHour;

    const fechaJornada = esJornadaAnterior
        ? moment().subtract(1, 'day')
        : moment();

    const inicio = fechaJornada.set({ hour: startHour, minute: 0, second: 0, millisecond: 0 });
    const fin = moment(fechaJornada).add(1, 'day').set({ hour: endHour, minute: 0, second: 0, millisecond: 0 });

    return { inicio: inicio.toDate(), fin: fin.toDate() };
};
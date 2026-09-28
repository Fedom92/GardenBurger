// Utils/fechaComercial.js
import moment from "moment";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig/firebase";
import { HORARIO, HORA_HABILITA_STATS } from "./Constantes";

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

// Cuántas horas pasaron desde el inicio de la jornada (horaAbre): con horaAbre 19,
// 19 → 0, 20 → 1, 00 → 5, 02 → 7. Sirve para comparar horas de una noche que cruza
// la medianoche sin casos especiales. Las horas fuera de la jornada dan 7 o más.
export const horaEnJornada = (hora) => (hora - HORARIO.horaAbre + 24) % 24;

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

// Si ya se puede mirar el arqueo (F4): de HORA_HABILITA_STATS a horaCierre, igual
// para todas las sucursales. Pasado horaCierre la jornada ya es otra.
//
// El arqueo cuesta un barrido de la jornada, asi que la ventana no es solo una
// regla de negocio: evita que se pague esa lectura cada vez que alguien tiene
// curiosidad a las 21.
export const esHoraDeArqueo = () => {
    const hora = horaEnJornada(ahoraServidor().hour());
    return hora >= horaEnJornada(HORA_HABILITA_STATS) && hora < horaEnJornada(HORA_CIERRE);
};


// ── Horario de la web pública ──────────────────────────────────────────────
// Cada sucursal tiene el suyo en su documento, editable desde el ABM de
// Sucursales: `horario: { dias, abre, cierra, horasCorte }`. La web toma pedidos
// desde `abre` hasta `horasCorte` horas antes de `cierra`: una solicitud que entrara
// sobre el cierre ya no se llega a cocinar. Viaja en menu.json, así que la web lo
// mira sin leer Firestore.

// La hora en que la web deja de tomar pedidos.
export const horaCorteWeb = (horario) => (horario.cierra - (horario.horasCorte ?? 1) + 24) % 24;

// Los días van por JORNADA, no por calendario: el lunes a las 00:30 todavía es la
// noche del domingo. Sin horario cargado la sucursal no toma pedidos: mejor
// cerrada que abierta a cualquier hora.
export const webRecibePedidos = (sucursal) => {
    const horario = sucursal?.horario;
    if (!horario) return false;
    const ahora = ahoraServidor();
    const hora = horaEnJornada(ahora.hour());
    if (hora < horaEnJornada(horario.abre) || hora >= horaEnJornada(horaCorteWeb(horario))) return false;
    const diaJornada = moment(getFechaComercialDe(ahora), "DD-MM-YYYY").day();
    return (horario.dias || []).includes(diaJornada);
};

export const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dosDigitos = (hora) => String(hora).padStart(2, "0");

// "de miércoles a domingo, de 20 a 23 hs", armado con el mismo horario que decide
// si la web abre: si el admin lo cambia, el cartel cambia solo. Vacío si la
// sucursal no tiene horario.
export const textoHorarioWeb = (sucursal) => {
    const horario = sucursal?.horario;
    if (!horario?.dias?.length) return "";
    // Desde el lunes, que es como se leen: el domingo va al final.
    const orden = [...horario.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const dias = orden.map((d) => NOMBRES_DIAS[d]);
    const seguidos = orden.every((d, i) => i === 0 || d === (orden[i - 1] + 1) % 7);
    const textoDias = seguidos && dias.length > 2
        ? `de ${dias[0]} a ${dias[dias.length - 1]}`
        : dias.length > 1 ? `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}` : dias[0];
    return `${textoDias}, de ${dosDigitos(horario.abre)} a ${dosDigitos(horaCorteWeb(horario))} hs`;
};

// La jornada en curso todavía se está moviendo: su arqueo no se puede congelar.
export const jornadaEstaAbierta = (jornada) => jornada === getFechaComercial();

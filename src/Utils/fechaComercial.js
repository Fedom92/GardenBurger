// Utils/fechaComercial.js
import moment from "moment";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig/firebase";
import { HORARIO, HORA_HABILITA_STATS } from "./Constantes";

// Solo en desarrollo, para probar de día sin esperar la noche. Con
// REACT_APP_ignorarHorario=true en el .env:
//   - la web pública toma pedidos a cualquier hora, en todas las sucursales;
//   - el F4 se habilita aunque no sean las HORA_HABILITA_STATS;
//   - la jornada EN CURSO arranca a horaCierre y no a horaAbre, así que F3, el
//     Historial, el arqueo y el Jefe de Deliverys ven lo cargado de día.
// Las jornadas pasadas no cambian de rango: una foto de arqueo grabada desde
// desarrollo sale igual que en producción.
//
// En el build NODE_ENV vale "production", así que aunque la variable quede en el
// .env el sitio publicado no la toma. Cambiarla pide reiniciar `npm start`.
export const IGNORAR_HORARIO = process.env.NODE_ENV === "development"
    && process.env.REACT_APP_ignorarHorario === "true";

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
    // Con IGNORAR_HORARIO, solo la jornada en curso: ver arriba.
    const startHour = IGNORAR_HORARIO && jornada === getFechaComercial() ? HORA_CIERRE : HORARIO.horaAbre;
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
    if (IGNORAR_HORARIO) return true;
    const hora = horaEnJornada(ahoraServidor().hour());
    return hora >= horaEnJornada(HORA_HABILITA_STATS) && hora < horaEnJornada(HORA_CIERRE);
};


// ── Horario de la web pública ──────────────────────────────────────────────
// Cada sucursal tiene el suyo en su documento, editable desde el Panel Admin:
// `horario: { dias, abre, cierra, horasCorte }`. La web toma pedidos desde `abre`
// hasta `horasCorte` horas antes de `cierra`: una solicitud que entrara sobre el
// cierre ya no se llega a cocinar. Viaja en menu.json, así que la web lo mira sin
// leer Firestore.
//
// Las EXCEPCIONES (un feriado que se abre, una noche que se cierra) van en
// `excepcionesWeb`, un mapa por jornada en el mismo documento: valen solo esa
// noche, así que nadie tiene que acordarse de deshacerlas. El registro completo
// —motivo interno, quién la cargó— está en la subcolección excepcionesHorario.
// Ver Utils/excepcionesHorario.js.

// Las horas que se pueden elegir para un horario: las de la jornada comercial (19
// a 02). El horario de una sucursal tiene que caer adentro, o sus pedidos
// quedarían fuera de la noche.
export const HORAS_JORNADA = Array.from(
    { length: horaEnJornada(HORARIO.horaCierre) + 1 },
    (_, i) => (HORARIO.horaAbre + i) % 24
);

// La hora en que la web deja de tomar pedidos.
export const horaCorteWeb = (horario) => (horario.cierra - (horario.horasCorte ?? 1) + 24) % 24;

// Qué tiene de malo un horario { abre, cierra, horasCorte }, o "" si está bien. Lo
// usan el horario de la sucursal y las excepciones de apertura.
export const errorDeHorario = ({ abre, cierra, horasCorte }) => {
    if (horaEnJornada(cierra) <= horaEnJornada(abre)) {
        return "El cierre tiene que ser después de la apertura";
    }
    const corte = horaCorteWeb({ cierra, horasCorte });
    if (!Number.isInteger(horasCorte) || horasCorte < 0
        || horaEnJornada(corte) <= horaEnJornada(abre)
        || horaEnJornada(corte) > horaEnJornada(cierra)) {
        return "Con ese corte la web no tomaría pedidos: tiene que quedar entre la apertura y el cierre";
    }
    return "";
};

// La excepción de una jornada (DD-MM-YYYY), o null. `{ abierta, abre, cierra,
// horasCorte, motivo? }`: el horario solo si abre; el motivo solo si cierra y es
// público.
export const excepcionDeJornada = (sucursal, jornada) => sucursal?.excepcionesWeb?.[jornada] || null;

// Los días van por JORNADA, no por calendario: el lunes a las 00:30 todavía es la
// noche del domingo. Una excepción manda sobre el horario de siempre: la de cierre
// cierra, y la de apertura usa su propio horario aunque ese día no se atienda. Sin
// horario cargado la sucursal no toma pedidos: mejor cerrada que abierta a
// cualquier hora.
//
// `ahora` es un parámetro para que los tests prueben cualquier hora sin esperarla.
export const webRecibePedidos = (sucursal, ahora = ahoraServidor()) => {
    // Una sucursal que no existe sigue cerrada aunque se ignore el horario.
    if (!sucursal) return false;
    if (IGNORAR_HORARIO) return true;
    const jornada = getFechaComercialDe(ahora);
    const excepcion = excepcionDeJornada(sucursal, jornada);
    if (excepcion && !excepcion.abierta) return false;
    const horario = excepcion || sucursal.horario;
    if (!horario) return false;
    const hora = horaEnJornada(ahora.hour());
    if (hora < horaEnJornada(horario.abre) || hora >= horaEnJornada(horaCorteWeb(horario))) return false;
    if (excepcion) return true;
    const diaJornada = moment(jornada, "DD-MM-YYYY").day();
    return (horario.dias || []).includes(diaJornada);
};

export const NOMBRES_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dosDigitos = (hora) => String(hora).padStart(2, "0");

// "de 20 a 23 hs": de la apertura al corte, que es lo que le importa al cliente.
export const textoRangoWeb = (horario) => `de ${dosDigitos(horario.abre)} a ${dosDigitos(horaCorteWeb(horario))} hs`;

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
    return `${textoDias}, ${textoRangoWeb(horario)}`;
};

// La excepción de la jornada en curso contada para el cliente: "Hoy cerrado ·
// Inventario", "Hoy de 20 a 23 hs". El cambio de horario se muestra siempre; el
// motivo es solo de las de cierre, y se ve solo si el admin lo marcó como público
// (si no, ni siquiera viaja en la copia de la web). Vacío si hoy no hay excepción.
export const textoExcepcionWeb = (sucursal, ahora = ahoraServidor()) => {
    const excepcion = excepcionDeJornada(sucursal, getFechaComercialDe(ahora));
    if (!excepcion) return "";
    const base = excepcion.abierta ? `Hoy ${textoRangoWeb(excepcion)}` : "Hoy cerrado";
    return excepcion.motivo ? `${base} · ${excepcion.motivo}` : base;
};

// La jornada en curso todavía se está moviendo: su arqueo no se puede congelar.
export const jornadaEstaAbierta = (jornada) => jornada === getFechaComercial();

// Utils/excepcionesHorario.js
// Excepciones al horario de la web pública: un feriado que se abre, una noche que
// se cierra. Valen para UNA jornada, así que nadie tiene que acordarse de
// deshacerlas. Solo las de cierre llevan motivo: explica por qué esa noche no se
// atiende. Abrir un día que no se atiende no necesita explicación.
//
// Viven en dos lugares, y las escrituras van en un batch para que nunca queden
// distintos:
//
// - `sucursales/{id}/excepcionesHorario/{autoId}` es el REGISTRO: todo, con el
//   motivo interno y quién la cargó. Nada se borra: quitar una excepción la marca
//   como levantada, así el historial dice qué pasó cada noche. Solo staff.
//
// - `sucursales/{id}.excepcionesWeb` es la copia que mira la web, un mapa por
//   jornada (DD-MM-YYYY) con lo vigente: hoy y lo que viene. Viaja en menu.json y
//   en la lectura que la web ya hace al confirmar, así que decidir no cuesta
//   lecturas. El documento de la sucursal es público: el motivo entra en la copia
//   solo si el admin lo marcó para mostrar.
//
// La escritura en la sucursal es del admin (firestore.rules); la subcolección cae
// en el comodín de colecciones operativas.
import {
    collection, doc, writeBatch, serverTimestamp, deleteField, Timestamp,
    getDocs, query, orderBy, limit, startAfter,
} from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";
import { momentDeJornada, momentDeHoy } from "./fechaComercial";

export const EXCEPCIONES_POR_PAGINA = 20;

const colExcepciones = (sucursalId) => collection(db, "sucursales", sucursalId, "excepcionesHorario");

// Las jornadas que ya pasaron salen de la copia de la web: la web solo mira la de
// hoy, y el registro sigue en la subcolección. Se aprovecha cada escritura para
// limpiarlas, así que el mapa no crece.
const jornadasVencidas = (excepcionesWeb = {}) => {
    const hoy = momentDeHoy();
    return Object.keys(excepcionesWeb).filter((j) => momentDeJornada(j).isBefore(hoy, "day"));
};

const sinVencidas = (excepcionesWeb = {}) => {
    const vencidas = jornadasVencidas(excepcionesWeb);
    return Object.fromEntries(Object.entries(excepcionesWeb).filter(([j]) => !vencidas.includes(j)));
};

const marcaDeLevantada = (usuario) => ({
    levantadaPor: usuario.nombreCompleto,
    levantadaPorID: usuario.id,
    levantadaEl: serverTimestamp(),
});

// Guarda la excepción de una jornada. Si esa jornada ya tenía una, la anterior
// queda levantada en el registro y la nueva toma su lugar en la web.
//
// `sucursal` es la que está en memoria: de ahí sale la excepción anterior y las
// vencidas, sin leer. Devuelve el mapa nuevo y el registro creado, para que la
// pantalla se actualice sin volver a leer.
export const guardarExcepcion = async (sucursal, { jornada, abierta, abre, cierra, horasCorte, motivo, motivoPublico }, usuario) => {
    const refRegistro = doc(colExcepciones(sucursal.id));
    // La de apertura lleva su horario; la de cierre, el motivo.
    const horario = abierta ? { abre, cierra, horasCorte } : {};
    const motivoCierre = abierta ? {} : { motivo, motivoPublico };
    const registro = {
        jornada,
        // Para ordenar: el id DD-MM-YYYY no ordena por fecha.
        fecha: Timestamp.fromDate(momentDeJornada(jornada).toDate()),
        abierta,
        ...horario,
        ...motivoCierre,
        creadoPor: usuario.nombreCompleto,
        creadoPorID: usuario.id,
        creadoEl: serverTimestamp(),
    };
    const copia = { abierta, ...horario, ...(!abierta && motivoPublico ? { motivo } : {}), registroId: refRegistro.id };

    const anterior = sucursal.excepcionesWeb?.[jornada];
    const cambios = { [`excepcionesWeb.${jornada}`]: copia };
    jornadasVencidas(sucursal.excepcionesWeb).forEach((j) => { cambios[`excepcionesWeb.${j}`] = deleteField(); });

    const batch = writeBatch(db);
    batch.set(refRegistro, registro);
    if (anterior?.registroId) batch.update(doc(colExcepciones(sucursal.id), anterior.registroId), marcaDeLevantada(usuario));
    batch.update(doc(db, "sucursales", sucursal.id), cambios);
    await batch.commit();

    return {
        excepcionesWeb: { ...sinVencidas(sucursal.excepcionesWeb), [jornada]: copia },
        // creadoEl null: el serverTimestamp todavía no volvió. La pantalla muestra "recién".
        registro: { id: refRegistro.id, ...registro, creadoEl: null },
        levantadoId: anterior?.registroId || null,
    };
};

// Quita la excepción de una jornada: la web vuelve a su horario de siempre, y el
// registro queda marcado como levantado —no se borra—, con quién y cuándo.
export const levantarExcepcion = async (sucursal, jornada, usuario) => {
    const anterior = sucursal.excepcionesWeb?.[jornada];
    const cambios = { [`excepcionesWeb.${jornada}`]: deleteField() };
    jornadasVencidas(sucursal.excepcionesWeb).forEach((j) => { cambios[`excepcionesWeb.${j}`] = deleteField(); });

    const batch = writeBatch(db);
    if (anterior?.registroId) batch.update(doc(colExcepciones(sucursal.id), anterior.registroId), marcaDeLevantada(usuario));
    batch.update(doc(db, "sucursales", sucursal.id), cambios);
    await batch.commit();

    const { [jornada]: _quitada, ...resto } = sinVencidas(sucursal.excepcionesWeb);
    return { excepcionesWeb: resto, levantadoId: anterior?.registroId || null };
};

// El historial de una sucursal, de la fecha más nueva a la más vieja (las
// próximas primero), de a EXCEPCIONES_POR_PAGINA. `despuesDe` es el último
// documento de la página anterior. Cuesta una lectura por excepción traída.
export const leerExcepciones = async (sucursalId, despuesDe = null) => {
    const snap = await getDocs(query(
        colExcepciones(sucursalId),
        orderBy("fecha", "desc"),
        ...(despuesDe ? [startAfter(despuesDe)] : []),
        limit(EXCEPCIONES_POR_PAGINA)
    ));
    return {
        registros: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ultimo: snap.docs[snap.docs.length - 1] || null,
        hayMas: snap.docs.length === EXCEPCIONES_POR_PAGINA,
    };
};

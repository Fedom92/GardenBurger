import { Timestamp } from "firebase/firestore";
import moment from "moment";

// Lógica pura del módulo de asistencia. Sin estado ni Firestore: la comparten la
// pantalla del encargado y el panel de liquidación del admin, y así la fórmula de
// las horas y la del bruto viven en un solo lugar.

// Un turno arranca de noche y termina de madrugada: la jornada comercial va de
// REACT_APP_horaAbre (19) a REACT_APP_horaCierre (2). Restar de frente 02:00 -
// 19:00 da -17, así que cuando la salida no es posterior a la entrada se entiende
// que cruzó la medianoche y se le suma un día.
export const calcularHoras = (entrada, salida) => {
    if (!entrada || !salida) return 0;

    const aMinutos = (hhmm) => {
        const [h, m] = String(hhmm).split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
    };

    const desde = aMinutos(entrada);
    const hasta = aMinutos(salida);
    if (desde === null || hasta === null) return 0;

    let minutos = hasta - desde;
    if (minutos <= 0) minutos += 24 * 60;

    return Math.round((minutos / 60) * 100) / 100;
};

// El registro congela `nombre` y `valorHora`: el panel del admin no vuelve a leer
// `usuarios` para liquidar, y una liquidación vieja sigue diciendo lo que
// realmente se pagó esa noche aunque después se le cambie el valor a la persona.
//
// Recibe una fila del formulario tal cual la arma ModalCargarJornada.
export const armarRegistro = (fila = {}) => {
    const ausente = !!fila.ausente;

    return {
        nombre: fila.nombre || "",
        valorHora: Number(fila.valorHora) || 0,
        ausente,
        entrada: ausente ? "" : (fila.entrada || ""),
        salida: ausente ? "" : (fila.salida || ""),
        horas: ausente ? 0 : calcularHoras(fila.entrada, fila.salida),
        descuento: ausente ? 0 : (Number(fila.descuento) || 0),
        observaciones: fila.observaciones || "",
    };
};

// El id del documento es la jornada en DD-MM-YYYY, que es lo que devuelve
// getFechaComercial(). El campo `fecha` existe aparte porque ese id no ordena
// cronológicamente como texto y el rango del admin necesita una fecha real.
export const fechaJornadaATimestamp = (jornadaStr) =>
    Timestamp.fromDate(moment(jornadaStr, "DD-MM-YYYY").startOf("day").toDate());

// Acumula los documentos de un rango en una fila por empleado.
//
// El bruto se suma día por día (`horas * valorHora` de ESE día) y no como
// `horasTotales * unValorHora`: si a alguien le cambiaron el valor a mitad del
// período, multiplicar al final daría un número que nunca se pagó. Por lo mismo
// se guardan los valores distintos vistos, para que la columna pueda avisar en
// vez de mostrar uno solo y mentir.
export const agregarLiquidacion = (docsJornada = []) => {
    const porEmpleado = new Map();

    for (const jornada of docsJornada) {
        for (const [empleadoId, registro] of Object.entries(jornada.registros || {})) {
            if (registro.ausente) continue;

            const horas = Number(registro.horas) || 0;
            const valorHora = Number(registro.valorHora) || 0;
            const descuento = Number(registro.descuento) || 0;

            const fila = porEmpleado.get(empleadoId) || {
                empleadoId,
                nombre: registro.nombre || "—",
                dias: 0,
                horas: 0,
                bruto: 0,
                descuentos: 0,
                neto: 0,
                valoresHora: new Set(),
            };

            fila.nombre = registro.nombre || fila.nombre;
            fila.dias += 1;
            fila.horas += horas;
            fila.bruto += horas * valorHora;
            fila.descuentos += descuento;
            if (valorHora) fila.valoresHora.add(valorHora);

            porEmpleado.set(empleadoId, fila);
        }
    }

    const filas = [...porEmpleado.values()]
        .map((fila) => {
            const valores = [...fila.valoresHora];
            return {
                ...fila,
                horas: Math.round(fila.horas * 100) / 100,
                neto: fila.bruto - fila.descuentos,
                // null = cambió dentro del período; la columna lo muestra como "varios".
                valorHora: valores.length === 1 ? valores[0] : null,
                valoresHora: valores,
            };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const total = filas.reduce((acum, f) => ({
        horas: acum.horas + f.horas,
        bruto: acum.bruto + f.bruto,
        descuentos: acum.descuentos + f.descuentos,
        neto: acum.neto + f.neto,
    }), { horas: 0, bruto: 0, descuentos: 0, neto: 0 });

    total.horas = Math.round(total.horas * 100) / 100;

    return { filas, total };
};

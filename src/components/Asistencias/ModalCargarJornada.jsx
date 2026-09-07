import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from "moment";
import { calcularHoras, armarRegistro, fechaJornadaATimestamp } from "./asistencias_hooks/useAsistencias";
import { fmtPesos } from "../../Utils/formato";
import { useAccionUnica } from "../../Utils/useAccionUnica";

// Formulario en grilla de una jornada entera. Lo comparten la pantalla del
// encargado y el panel del admin, para que la forma de guardar sea una sola.
//
// Dos modos:
// - Completo: lista a todos los empleados activos de la sucursal y guarda la
//   jornada entera con UN solo setDoc.
// - `soloEmpleadoId`: edita un renglón ya cargado. No consulta `usuarios` —
//   el nombre y el valor hora salen del registro guardado, así editar un horario
//   no le cambia de callado la tarifa que se le pagó esa noche.
//
// `modoAdmin` lo prende solo el panel del admin, y habilita dos cosas que el
// encargado no tiene: editar el valor hora —él carga horas, no decide sueldos— y
// ver quién cargó y modificó la jornada.
const ModalCargarJornada = ({
    sucursal,
    fecha,                  // "DD-MM-YYYY"
    registrosIniciales,     // si el padre ya tiene el doc, no se relee
    soloEmpleadoId = null,
    modoAdmin = false,
    show,
    onHide,
    onGuardado,
}) => {
    const { userData } = useAuth();
    const [filas, setFilas] = useState([]);
    const [auditoria, setAuditoria] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const { procesando: guardando, ejecutar } = useAccionUnica();
    // El trío de `cargado*` es de la carga original y no se vuelve a pisar: si no,
    // apenas el admin corrige una jornada queda idéntico al de `actualizado*` y se
    // pierde quién la había cargado.
    const yaExistia = useRef(false);

    const jornadaRef = useCallback(
        () => doc(db, "sucursales", sucursal, "asistencias", fecha),
        [sucursal, fecha]
    );

    // Arma las filas del formulario. Los registros ya guardados se usan como
    // valores iniciales para que "Cargar horarios" sobre una jornada existente
    // abra con lo que había en vez de en blanco.
    //
    // El valor hora sale del registro congelado si ya existe, y solo cae al de
    // `usuarios` cuando la fila es nueva. Al revés —tomando siempre el actual—
    // corregir un horario de una jornada vieja le re-congelaba a todos la tarifa
    // de hoy y reescribía en silencio lo que realmente se había pagado.
    const filaDesde = (empleadoId, empleado, registro) => ({
        empleadoId,
        nombre: empleado.nombreCompleto || registro?.nombre || "—",
        valorHora: registro?.valorHora ?? (Number(empleado.valorHora) || 0),
        ausente: registro?.ausente ?? false,
        entrada: registro?.entrada || "",
        salida: registro?.salida || "",
        descuento: registro?.descuento ?? 0,
        observaciones: registro?.observaciones || "",
    });

    useEffect(() => {
        if (!show || !sucursal || !fecha) return;

        let vigente = true;
        setError("");
        setCargando(true);

        const preparar = async () => {
            try {
                // El padre puede no tener el documento (el admin corrigiendo una
                // jornada vieja): recién ahí se lee.
                let registros = registrosIniciales;
                if (registros == null) {
                    const snap = await getDoc(jornadaRef());
                    const datos = snap.exists() ? snap.data() : null;
                    registros = datos?.registros || {};
                    yaExistia.current = snap.exists();
                    // Los campos de auditoría ya vienen en este snapshot: mostrarlos
                    // no cuesta ninguna lectura extra.
                    if (vigente) setAuditoria(datos);
                } else {
                    // Si el padre trajo registros es porque el documento existe.
                    yaExistia.current = Object.keys(registros).length > 0;
                    if (vigente) setAuditoria(null);
                }

                if (soloEmpleadoId) {
                    const reg = registros[soloEmpleadoId];
                    if (!reg) throw new Error("El registro ya no existe en esta jornada");
                    // El valor hora sale del registro congelado, no de `usuarios`.
                    const empleadoCongelado = { nombreCompleto: reg.nombre, valorHora: reg.valorHora };
                    if (vigente) setFilas([filaDesde(soloEmpleadoId, empleadoCongelado, reg)]);
                    return;
                }

                // Filtro de `activo` del lado del cliente, igual que PanelAdmin:
                // así alcanza con el índice automático de `sucursal` y no hace
                // falta uno compuesto. Incluye a los sinAcceso (repartidores).
                const snapEmpleados = await getDocs(
                    query(collection(db, "usuarios"), where("sucursal", "==", sucursal))
                );

                const nuevas = snapEmpleados.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((e) => e.activo !== false)
                    .sort((a, b) => (a.nombreCompleto || "").localeCompare(b.nombreCompleto || ""))
                    .map((e) => filaDesde(e.id, e, registros[e.id]));

                if (vigente) setFilas(nuevas);
            } catch (e) {
                console.error("Error preparando la jornada:", e);
                if (vigente) setError("No se pudo cargar la lista de empleados. Revisá la conexión.");
            } finally {
                if (vigente) setCargando(false);
            }
        };

        preparar();
        return () => { vigente = false; };
    }, [show, sucursal, fecha, registrosIniciales, soloEmpleadoId, jornadaRef]);

    const setCampo = (empleadoId, campo) => (e) => {
        const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFilas((prev) => prev.map((f) => (f.empleadoId === empleadoId ? { ...f, [campo]: valor } : f)));
    };

    const guardar = () => ejecutar(async () => {
        setError("");
        try {
            const marcaModificacion = {
                actualizadoPor: userData.nombreCompleto,
                actualizadoPorID: userData.id,
                actualizadoTimestamp: serverTimestamp(),
            };

            if (soloEmpleadoId) {
                const fila = filas[0];
                const registro = armarRegistro(fila);
                // Ruta punteada: en updateDoc los puntos SÍ navegan el mapa, así
                // que esto toca un solo empleado sin pisar a los demás.
                await updateDoc(jornadaRef(), {
                    [`registros.${soloEmpleadoId}`]: registro,
                    ...marcaModificacion,
                });
                // Se devuelve lo escrito para que el padre refresque su tabla sin
                // pagar otra lectura.
                onGuardado?.({ [soloEmpleadoId]: registro });
                onHide();
                return;
            }

            const registros = filas.reduce((acum, fila) => {
                acum[fila.empleadoId] = armarRegistro(fila);
                return acum;
            }, {});

            // Una sola escritura para la jornada entera, sin importar cuánta
            // gente haya. `merge` conserva los registros de empleados que ya
            // no están en la lista (dados de baja después de trabajar).
            await setDoc(jornadaRef(), {
                fecha: fechaJornadaATimestamp(fecha),
                registros,
                ...(yaExistia.current ? {} : {
                    cargadoPor: userData.nombreCompleto,
                    cargadoPorID: userData.id,
                    cargadoTimestamp: serverTimestamp(),
                }),
                ...marcaModificacion,
            }, { merge: true });

            onGuardado?.(registros);
            onHide();
        } catch (e) {
            console.error("Error guardando la jornada:", e);
            Swal.fire({
                title: "Error",
                text: "No se pudo guardar la jornada",
                icon: "error",
                confirmButtonColor: "#dc3545",
            });
        }
    });

    const titulo = soloEmpleadoId ? "Editar registro" : "Cargar horarios";
    const fechaLegible = fecha ? moment(fecha, "DD-MM-YYYY").format("DD/MM/YYYY") : "";

    const fmtSello = (ts) => (ts?.toDate ? moment(ts.toDate()).format("DD/MM HH:mm") : null);
    const selloCarga = fmtSello(auditoria?.cargadoTimestamp);
    const selloEdicion = fmtSello(auditoria?.actualizadoTimestamp);

    return (
        <Modal show={show} onHide={onHide} size="xl" scrollable centered>
            <Modal.Header closeButton>
                <div>
                    <Modal.Title className="fs-5">
                        {titulo} — jornada del {fechaLegible}
                    </Modal.Title>
                    {/* Solo el admin ve el rastro de quién tocó los sueldos. */}
                    {modoAdmin && auditoria && (
                        <div className="small text-body-secondary mt-1">
                            {selloCarga && <>Cargada por <strong>{auditoria.cargadoPor}</strong> el {selloCarga}</>}
                            {selloCarga && selloEdicion && " · "}
                            {selloEdicion && <>Última modificación: <strong>{auditoria.actualizadoPor}</strong> el {selloEdicion}</>}
                        </div>
                    )}
                </div>
            </Modal.Header>

            <Modal.Body>
                {cargando ? (
                    <div className="text-center py-4">
                        <span className="loader"></span>
                        <p className="mt-2 mb-0">Cargando empleados...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="alert alert-danger py-2" role="alert">
                                <small>{error}</small>
                            </div>
                        )}

                        {filas.length === 0 ? (
                            <p className="text-body-secondary mb-0">
                                No hay empleados activos en esta sucursal.
                            </p>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table className="table align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>Empleado</th>
                                            {modoAdmin && <th>Valor hora</th>}
                                            <th className="text-center">Ausente</th>
                                            <th>Entrada</th>
                                            <th>Salida</th>
                                            <th className="text-end">Horas</th>
                                            <th>Descuento $</th>
                                            <th>Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filas.map((fila) => {
                                            const horas = fila.ausente ? 0 : calcularHoras(fila.entrada, fila.salida);
                                            return (
                                                <tr key={fila.empleadoId}>
                                                    <td className="fw-semibold" style={{ minWidth: "11rem" }}>
                                                        {fila.nombre}
                                                        {!modoAdmin && (
                                                            <div className="small text-body-secondary">
                                                                {fmtPesos(fila.valorHora)}/h
                                                            </div>
                                                        )}
                                                    </td>
                                                    {modoAdmin && (
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="form-control form-control-sm"
                                                                style={{ width: "7rem" }}
                                                                value={fila.valorHora}
                                                                onChange={setCampo(fila.empleadoId, "valorHora")}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={fila.ausente}
                                                            onChange={setCampo(fila.empleadoId, "ausente")}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-sm"
                                                            style={{ width: "8rem" }}
                                                            value={fila.entrada}
                                                            disabled={fila.ausente}
                                                            onChange={setCampo(fila.empleadoId, "entrada")}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-sm"
                                                            style={{ width: "8rem" }}
                                                            value={fila.salida}
                                                            disabled={fila.ausente}
                                                            onChange={setCampo(fila.empleadoId, "salida")}
                                                        />
                                                    </td>
                                                    <td className="text-end fw-bold" style={{ minWidth: "4rem" }}>
                                                        {fila.ausente ? "—" : horas}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="form-control form-control-sm"
                                                            style={{ width: "7rem" }}
                                                            value={fila.descuento}
                                                            disabled={fila.ausente}
                                                            onChange={setCampo(fila.empleadoId, "descuento")}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            style={{ minWidth: "12rem" }}
                                                            value={fila.observaciones}
                                                            onChange={setCampo(fila.empleadoId, "observaciones")}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={guardando}>
                    Cancelar
                </button>
                <button
                    className="btn btn-success"
                    onClick={guardar}
                    disabled={guardando || cargando || filas.length === 0}
                >
                    {guardando ? "Guardando..." : "Guardar jornada"}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalCargarJornada;

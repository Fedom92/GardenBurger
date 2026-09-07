import React, { useState, useEffect } from "react";
import { getDoc } from "firebase/firestore";
import { docSucursal } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { getFechaComercial } from "../../Utils/fechaComercial";
import TablaGenerica from "../../Utils/TablaGenerica";
import ModalCargarJornada from "./ModalCargarJornada";
import "../../style/Main.css";
import moment from "moment";
import { fmtPesos } from "../../Utils/formato";

// Pantalla del encargado. Solo la jornada actual: una lectura al entrar y nada
// más. Si una noche quedó sin cargar, la corrige el administrador desde su panel.
const Asistencias = () => {
    const { userData } = useAuth();
    const [jornada] = useState(getFechaComercial);
    const [registros, setRegistros] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modalCompleto, setModalCompleto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);

    useEffect(() => {
        let vigente = true;
        getDoc(docSucursal("asistencias", jornada))
            .then((snap) => {
                if (!vigente) return;
                setRegistros(snap.exists() ? (snap.data().registros || {}) : {});
            })
            .catch((e) => {
                console.error("Error cargando la jornada:", e);
                if (vigente) setRegistros({});
            })
            .finally(() => { if (vigente) setIsLoading(false); });

        return () => { vigente = false; };
    }, [jornada]);

    // Lo que el modal acaba de escribir se mezcla en memoria: refrescar la tabla
    // no cuesta una lectura nueva.
    const aplicarGuardado = (escritos) => {
        setRegistros((prev) => ({ ...(prev || {}), ...escritos }));
    };

    const filas = Object.entries(registros || {}).map(([empleadoId, r]) => ({ empleadoId, ...r }));

    const columnas = [
        { accessorKey: "nombre", header: "Empleado" },
        {
            accessorKey: "ausente",
            header: "Estado",
            cell: ({ getValue }) => getValue()
                ? <span className="badge bg-secondary">Ausente</span>
                : <span className="badge bg-success">Presente</span>,
        },
        {
            accessorKey: "entrada",
            header: "Entrada",
            cell: ({ getValue }) => getValue() || "—",
        },
        {
            accessorKey: "salida",
            header: "Salida",
            cell: ({ getValue }) => getValue() || "—",
        },
        {
            accessorKey: "horas",
            header: "Horas",
            cell: ({ getValue }) => Number(getValue() || 0),
        },
        {
            accessorKey: "descuento",
            header: "Descuento",
            cell: ({ getValue }) => {
                const v = Number(getValue() || 0);
                return v ? fmtPesos(v) : "—";
            },
        },
        {
            accessorKey: "observaciones",
            header: "Observaciones",
            cell: ({ getValue }) => getValue() || "—",
        },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => (
                <button
                    className="btn btn-success btn-sm"
                    title="Editar registro"
                    onClick={() => setEditandoId(row.original.empleadoId)}
                >
                    <i className="fa-solid fa-edit"></i>
                </button>
            ),
        },
    ];

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="container mw-100">
                        <div className="row">
                            <div className="col">
                                <br />
                                <div className="d-flex justify-content-between align-items-center mt-3 mb-3 flex-wrap gap-2">
                                    <div style={{ marginLeft: "10px" }}>
                                        <h1 className="mb-0">Asistencias</h1>
                                        <small className="text-body-secondary">
                                            Jornada del {moment(jornada, "DD-MM-YYYY").format("DD/MM/YYYY")}
                                            {" — "}{userData?.sucursal}
                                        </small>
                                    </div>
                                    <button className="btn btn-dark" onClick={() => setModalCompleto(true)}>
                                        <i className="fa-solid fa-clock me-2"></i>
                                        {filas.length === 0 ? "Cargar horarios" : "Editar jornada completa"}
                                    </button>
                                </div>

                                {filas.length === 0 ? (
                                    <div className="alert alert-secondary" role="alert">
                                        Todavía no se cargaron los horarios de esta jornada.
                                    </div>
                                ) : (
                                    <TablaGenerica
                                        data={filas}
                                        columnas={columnas}
                                        sortBy="nombre"
                                        ordenDescendente={false}
                                        camposBusqueda={["nombre"]}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Jornada completa: lista a todos los empleados de la sucursal */}
            <ModalCargarJornada
                show={modalCompleto}
                sucursal={userData?.sucursal}
                fecha={jornada}
                registrosIniciales={registros}
                onHide={() => setModalCompleto(false)}
                onGuardado={aplicarGuardado}
            />

            {/* Un solo renglón: no vuelve a consultar `usuarios` */}
            {editandoId && (
                <ModalCargarJornada
                    show={!!editandoId}
                    sucursal={userData?.sucursal}
                    fecha={jornada}
                    registrosIniciales={registros}
                    soloEmpleadoId={editandoId}
                    onHide={() => setEditandoId(null)}
                    onGuardado={aplicarGuardado}
                />
            )}
        </>
    );
};

export default Asistencias;

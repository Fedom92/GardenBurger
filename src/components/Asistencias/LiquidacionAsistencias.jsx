import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { fetchSucursales } from "../../Utils/sucursales";
import { getFechaComercial } from "../../Utils/fechaComercial";
import TablaGenerica from "../../Utils/TablaGenerica";
import ModalCargarJornada from "./ModalCargarJornada";
import { agregarLiquidacion, fechaJornadaATimestamp } from "./asistencias_hooks/useAsistencias";
// El bruto sale de horas × valorHora, así que puede traer decimales: se redondea.
import { fmtPesosRedondeado as pesos } from "../../Utils/formato";
import "../../style/Main.css";
import moment from "moment";

const toInputDate = (d) => moment(d).format("YYYY-MM-DD");

// Panel del administrador: liquida un período de una sucursal y, además, permite
// cargar o corregir una jornada suelta (el encargado solo ve la actual, así que
// una noche olvidada se arregla desde acá).
const LiquidacionAsistencias = () => {
    const [sucursales, setSucursales] = useState([]);
    const [sucursalSel, setSucursalSel] = useState("");

    const hoyJornada = moment(getFechaComercial(), "DD-MM-YYYY");
    const [desdeStr, setDesdeStr] = useState(toInputDate(hoyJornada.clone().startOf("month")));
    const [hastaStr, setHastaStr] = useState(toInputDate(hoyJornada));
    const [jornadaEditar, setJornadaEditar] = useState(toInputDate(hoyJornada));

    const [rango, setRango] = useState(null);
    const [jornadas, setJornadas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);

    useEffect(() => {
        fetchSucursales()
            .then((lista) => {
                setSucursales(lista);
                setSucursalSel((prev) => prev || lista[0]?.id || "");
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!sucursalSel || !rango) return;

        setIsLoading(true);
        setError("");

        // El campo `fecha` existe justamente para esto: el id del documento es
        // DD-MM-YYYY y no ordena cronológicamente como texto. Rango sobre un solo
        // campo, así que le alcanza el índice automático.
        const q = query(
            collection(db, "sucursales", sucursalSel, "asistencias"),
            where("fecha", ">=", rango.inicio),
            where("fecha", "<=", rango.fin),
            orderBy("fecha", "asc")
        );

        getDocs(q)
            .then((snap) => setJornadas(snap.docs.map((d) => d.data())))
            .catch((e) => {
                console.error("Error liquidando asistencias:", e);
                setError("No se pudo traer el período. Revisá la conexión.");
                setJornadas([]);
            })
            .finally(() => setIsLoading(false));
    }, [sucursalSel, rango]);

    const buscar = () => {
        setRango({
            inicio: fechaJornadaATimestamp(moment(desdeStr).format("DD-MM-YYYY")),
            fin: fechaJornadaATimestamp(moment(hastaStr).format("DD-MM-YYYY")),
        });
    };

    // Después de corregir una jornada hay que rehacer la consulta: el documento
    // puede haber entrado o salido del período que está en pantalla.
    const refrescar = () => setRango((prev) => (prev ? { ...prev } : prev));

    const { filas, total } = agregarLiquidacion(jornadas);

    const columnas = [
        { accessorKey: "nombre", header: "Empleado" },
        { accessorKey: "dias", header: "Días" },
        { accessorKey: "horas", header: "Horas" },
        {
            accessorKey: "valorHora",
            header: "Valor hora",
            // null = cambió dentro del período. Mostrar uno solo sería mentir
            // sobre lo que se pagó, así que se avisa.
            cell: ({ row }) => row.original.valorHora === null
                ? <span className="text-warning-emphasis fw-semibold" title={row.original.valoresHora.map(pesos).join(" · ")}>varios</span>
                : pesos(row.original.valorHora),
        },
        { accessorKey: "bruto", header: "Bruto", cell: ({ getValue }) => pesos(getValue()) },
        {
            accessorKey: "descuentos",
            header: "Descuentos",
            cell: ({ getValue }) => {
                const v = Number(getValue()) || 0;
                return v ? <span className="text-danger">−{pesos(v)}</span> : "—";
            },
        },
        {
            accessorKey: "neto",
            header: "Neto",
            cell: ({ getValue }) => <span className="fw-bold">{pesos(getValue())}</span>,
        },
    ];

    const tarjetas = [
        { label: "Horas trabajadas", valor: total.horas },
        { label: "Bruto", valor: pesos(total.bruto) },
        { label: "Descuentos", valor: pesos(total.descuentos) },
        { label: "Total neto", valor: pesos(total.neto), destacada: true },
    ];

    return (
        <>
            <div className="w-100">
                <div className="container mw-100">
                    <div className="row">
                        <div className="col">
                            <br />
                            <h1 style={{ marginLeft: "10px" }}>Liquidación de horas</h1>

                            {/* Reporte del período */}
                            <div className="d-flex align-items-end gap-2 flex-wrap mt-3 mb-2">
                                <div>
                                    <label className="form-label small mb-1">Sucursal</label>
                                    <select
                                        className="form-select form-select-sm text-center"
                                        style={{ width: "180px" }}
                                        value={sucursalSel}
                                        onChange={(e) => setSucursalSel(e.target.value)}
                                    >
                                        {sucursales.map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre || s.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label small mb-1">Desde</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm text-center"
                                        style={{ width: "160px" }}
                                        value={desdeStr}
                                        onChange={(e) => setDesdeStr(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label small mb-1">Hasta</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm text-center"
                                        style={{ width: "160px" }}
                                        value={hastaStr}
                                        onChange={(e) => setHastaStr(e.target.value)}
                                    />
                                </div>
                                <button className="btn btn-sm btn-dark" onClick={buscar} disabled={!sucursalSel || isLoading}>
                                    {isLoading ? "Buscando..." : "Buscar"}
                                </button>
                            </div>

                            {/* Carga o corrección de una jornada suelta */}
                            <div className="d-flex align-items-end gap-2 flex-wrap mb-3 pb-3 border-bottom">
                                <div>
                                    <label className="form-label small mb-1">Jornada a cargar o corregir</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm text-center"
                                        style={{ width: "160px" }}
                                        value={jornadaEditar}
                                        onChange={(e) => setJornadaEditar(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-dark"
                                    onClick={() => setModalAbierto(true)}
                                    disabled={!sucursalSel}
                                >
                                    <i className="fa-solid fa-pen-to-square me-1"></i> Cargar / editar jornada
                                </button>
                            </div>

                            {error && (
                                <div className="alert alert-danger py-2" role="alert">
                                    <small>{error}</small>
                                </div>
                            )}

                            {!rango ? (
                                <p className="text-body-secondary">
                                    Elegí una sucursal y un período, y tocá Buscar.
                                </p>
                            ) : isLoading ? (
                                <div className="text-center py-5">
                                    <span className="loader"></span>
                                </div>
                            ) : filas.length === 0 ? (
                                <div className="alert alert-secondary" role="alert">
                                    No hay asistencias cargadas en ese período.
                                </div>
                            ) : (
                                <>
                                    <div className="row g-2 mb-3">
                                        {tarjetas.map((t) => (
                                            <div className="col-6 col-md-3" key={t.label}>
                                                <div className={`card h-100 ${t.destacada ? "border-dark border-2" : ""}`}>
                                                    <div className="card-body py-2 px-3">
                                                        <div className="small text-body-secondary">{t.label}</div>
                                                        <div className={`fs-5 ${t.destacada ? "fw-bold" : "fw-semibold"}`}>
                                                            {t.valor}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <TablaGenerica
                                        data={filas}
                                        columnas={columnas}
                                        sortBy="nombre"
                                        ordenDescendente={false}
                                        camposBusqueda={["nombre"]}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {modalAbierto && (
                <ModalCargarJornada
                    show={modalAbierto}
                    sucursal={sucursalSel}
                    fecha={moment(jornadaEditar).format("DD-MM-YYYY")}
                    registrosIniciales={null}
                    modoAdmin
                    onHide={() => setModalAbierto(false)}
                    onGuardado={refrescar}
                />
            )}
        </>
    );
};

export default LiquidacionAsistencias;

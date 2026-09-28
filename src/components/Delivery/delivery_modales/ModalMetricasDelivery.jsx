import React from "react";
import { Modal, Accordion } from "react-bootstrap";
import moment from "moment";
import { METODOS_PAGO, etiquetaPago } from "../../../Utils/Constantes";
import { fmtPesos } from "../../../Utils/formato";

// Una cifra del resumen de la noche.
const Resumen = ({ titulo, valor, destacado = false }) => (
    <div className="col">
        <div className={`border rounded p-2 h-100 ${destacado ? "bg-dark text-white" : ""}`}>
            <div className="small text-uppercase opacity-75">{titulo}</div>
            <div className="fs-5 fw-bold">{valor}</div>
        </div>
    </div>
);

// Métricas de la noche: el control propio del sector de deliverys. Arriba el total
// general; en el acordeon, cada repartidor con el detalle de sus viajes —con las
// direcciones— desplegable. Se actualiza solo: sale de un listener de JefeDeliverys.
//
// Acá no se paga a nadie. Al repartidor le paga el encargado al cierre, desde su F4:
// la base de Asistencias (horas × valorHora − descuentos) más estos mismos envíos.
// Los números salen de liquidarDeliverys(), la misma funcion que usa el F4: la jefa
// y el encargado no pueden ver cifras distintas.
//
// El detalle va en tablas simples y no en TablaGenerica: son pocas filas por
// repartidor dentro de un acordeon, y un buscador y un paginador por cada uno
// estorban mas de lo que ayudan.
const ModalMetricasDelivery = ({ isOpen, onClose, liquidacion, jornada, enCurso = 0 }) => {
    const repartidores = Object.entries(liquidacion || {})
        .map(([id, r]) => ({ id, ...r }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const totales = repartidores.reduce((t, r) => ({
        viajes: t.viajes + r.cantidadPedidos,
        envios: t.envios + r.totalEnvios,
        efectivo: t.efectivo + r.efectivoCobrado,
    }), { viajes: 0, envios: 0, efectivo: 0 });

    return (
        <Modal show={isOpen} onHide={onClose} size="xl" scrollable centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Métricas de deliverys <small className="text-body-secondary fs-6 fw-normal">{jornada}</small>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Lo que sigue en la calle o esperando repartidor entra cuando vuelva.
                    Sale del listener de la tabla, sin lecturas. */}
                {enCurso > 0 && (
                    <div className="border border-dark rounded p-2 mb-3">
                        <i className="fa-solid fa-motorcycle me-1"></i>
                        Hay <strong>{enCurso}</strong> {enCurso === 1 ? "pedido" : "pedidos"} de delivery en curso:
                        {enCurso === 1 ? " entra" : " entran"} acá cuando vuelva el repartidor.
                    </div>
                )}

                {repartidores.length === 0 ? (
                    <p className="text-muted text-center py-4">Todavía no volvió ningún viaje esta noche.</p>
                ) : (
                    <>
                        {/* General */}
                        <div className="row g-2 mb-3 text-center">
                            <Resumen titulo="Viajes" valor={totales.viajes} />
                            <Resumen titulo="Repartidores" valor={repartidores.length} />
                            <Resumen titulo="Envíos" valor={fmtPesos(totales.envios)} destacado />
                            <Resumen titulo="Efectivo a rendir" valor={fmtPesos(totales.efectivo)} />
                        </div>

                        {/* Por repartidor, con el detalle desplegable */}
                        <Accordion alwaysOpen>
                            {repartidores.map((r) => (
                                <Accordion.Item eventKey={r.id} key={r.id}>
                                    <Accordion.Header>
                                        <div className="d-flex flex-wrap w-100 justify-content-between align-items-center pe-3 gap-2">
                                            <strong>{r.nombre}</strong>
                                            <span className="text-body-secondary small">
                                                {r.cantidadPedidos} {r.cantidadPedidos === 1 ? "viaje" : "viajes"}
                                                {" · "}rinde {fmtPesos(r.efectivoCobrado)}
                                            </span>
                                            <span>Envíos: <strong>{fmtPesos(r.totalEnvios)}</strong></span>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <div className="table-responsive">
                                            <table className="table table-sm mb-0 align-middle">
                                                <thead>
                                                    <tr>
                                                        <th>Ticket</th>
                                                        <th>Volvió</th>
                                                        <th>Dirección</th>
                                                        <th>Zona</th>
                                                        <th className="text-end">Envío</th>
                                                        <th>Pago</th>
                                                        <th className="text-end">Efectivo</th>
                                                        <th className="text-end">Pagaron con</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {r.entregas.map((e) => (
                                                        <tr key={e.id} className={e.sinEntregar || e.anulado ? "table-danger" : ""}>
                                                            <td>
                                                                {e.codigo}
                                                                {/* El envío se paga igual: el viaje se hizo. */}
                                                                {e.sinEntregar && <small className="d-block text-danger">Sin entregar</small>}
                                                                {!e.sinEntregar && e.anulado && <small className="d-block text-danger">Anulado</small>}
                                                            </td>
                                                            <td>{e.finTimestamp?.toDate ? moment(e.finTimestamp.toDate()).format("HH:mm") : "—"}</td>
                                                            <td>{e.direccion || "—"}</td>
                                                            <td>{e.zona}</td>
                                                            <td className="text-end">{fmtPesos(e.envio)}</td>
                                                            <td>{etiquetaPago(e.metodoPago)}</td>
                                                            <td className="text-end">{e.metodoPago === METODOS_PAGO.MP.key ? "—" : fmtPesos(e.efectivo)}</td>
                                                            <td className="text-end">{e.pagaronCon > 0 ? fmtPesos(e.pagaronCon) : "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Accordion.Body>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalMetricasDelivery;

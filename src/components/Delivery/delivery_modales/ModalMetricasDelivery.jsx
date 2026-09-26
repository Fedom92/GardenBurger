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

// Liquidacion de la noche: cuanto se le paga a cada repartidor y cuanto efectivo
// tiene que rendir. Arriba el total general; en el acordeon, cada repartidor con
// el detalle de sus entregas —con las direcciones— desplegable.
//
// A cada repartidor se le paga un fijo por noche mas el costo de envio de cada
// entrega. Los numeros salen de liquidarDeliverys(), la misma funcion que usa el
// arqueo de la Caja: el jefe y el encargado no pueden ver cifras distintas.
//
// El detalle va en tablas simples y no en TablaGenerica: son pocas filas por
// repartidor dentro de un acordeon, y un buscador y un paginador por cada uno
// estorban mas de lo que ayudan.
const ModalMetricasDelivery = ({ isOpen, onClose, liquidacion, jornada, sinCerrar = 0 }) => {
    const repartidores = Object.entries(liquidacion || {})
        .map(([id, r]) => ({ id, ...r }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const totales = repartidores.reduce((t, r) => ({
        entregas: t.entregas + r.cantidadPedidos,
        envios: t.envios + r.totalEnvios,
        fijos: t.fijos + r.fijo,
        aPagar: t.aPagar + r.aPagar,
        efectivo: t.efectivo + r.efectivoCobrado,
    }), { entregas: 0, envios: 0, fijos: 0, aPagar: 0, efectivo: 0 });

    return (
        <Modal show={isOpen} onHide={onClose} size="xl" scrollable centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Liquidación de deliverys <small className="text-body-secondary fs-6 fw-normal">{jornada}</small>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Lo que sigue en la calle no se paga todavía: que el jefe lo sepa
                    antes de pagar, no después. Sale del listener, sin lecturas. */}
                {sinCerrar > 0 && (
                    <div className="border border-dark rounded p-2 mb-3">
                        <i className="fa-solid fa-triangle-exclamation me-1"></i>
                        Hay <strong>{sinCerrar}</strong> {sinCerrar === 1 ? "pedido" : "pedidos"} de delivery
                        sin cerrar: no {sinCerrar === 1 ? "entra" : "entran"} en esta liquidación hasta que vuelva el repartidor.
                    </div>
                )}

                {repartidores.length === 0 ? (
                    <p className="text-muted text-center py-4">Sin entregas cerradas en esta jornada.</p>
                ) : (
                    <>
                        {/* General */}
                        <div className="row g-2 mb-3 text-center">
                            <Resumen titulo="Entregas" valor={totales.entregas} />
                            <Resumen titulo="Envíos" valor={fmtPesos(totales.envios)} />
                            <Resumen titulo={`Fijos (${repartidores.length})`} valor={fmtPesos(totales.fijos)} />
                            <Resumen titulo="Total a pagar" valor={fmtPesos(totales.aPagar)} destacado />
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
                                                {r.cantidadPedidos} {r.cantidadPedidos === 1 ? "entrega" : "entregas"}
                                                {" · "}rinde {fmtPesos(r.efectivoCobrado)}
                                            </span>
                                            <span>A pagar: <strong>{fmtPesos(r.aPagar)}</strong></span>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <p className="small mb-2">
                                            Fijo {fmtPesos(r.fijo)} + envíos {fmtPesos(r.totalEnvios)} = <strong>{fmtPesos(r.aPagar)}</strong>
                                        </p>
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
                                                        <tr key={e.id}>
                                                            <td>{e.codigo}</td>
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

import React from "react";
import { Modal } from "react-bootstrap";

const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

// Muestra el documento resumenDiario de la jornada en curso. Los datos los trae la Caja
// con un getDoc al abrir: es una sola lectura y no hace falta que se actualice solo,
// porque el arqueo se mira al cierre.
const ResumenDiario = ({ isOpen, onClose, resumen, fecha, isLoading }) => {
    const totalEfectivo = resumen?.totalEfectivo || 0;
    const efectivoLocal = resumen?.efectivoLocal || 0;
    const efectivoEnvio = resumen?.efectivoEnvio || 0;
    const mp = resumen?.mp || 0;

    const deliverys = Object.values(resumen?.deliverys || {})
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" scrollable centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-4 fw-bold text-dark">
                    Resumen del día <small className="text-body-secondary fs-6 fw-normal">{fecha}</small>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                {isLoading ? (
                    <div className="text-center py-5">
                        <span className="loader"></span>
                        <p className="mt-3">Cargando resumen...</p>
                    </div>
                ) : !resumen ? (
                    <div className="text-center text-body-secondary py-5">
                        <i className="fa fa-chart-simple fa-4x mb-3 opacity-25"></i>
                        <h5 className="fw-semibold text-secondary">Todavía no hay movimientos</h5>
                    </div>
                ) : (
                    <>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="card border-success h-100">
                                    <div className="card-header bg-success bg-opacity-10 fw-bold">
                                        <i className="fa fa-money-bill-wave me-1"></i> Efectivo
                                    </div>
                                    <div className="card-body">
                                        <p className="fs-3 fw-bolder mb-3">{fmtPesos(totalEfectivo)}</p>
                                        <div className="d-flex justify-content-between border-top pt-2">
                                            <span>Retira / Espera Afuera</span>
                                            <strong>{fmtPesos(efectivoLocal)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between border-top pt-2 mt-2">
                                            <span>Envíos</span>
                                            <strong>{fmtPesos(efectivoEnvio)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="card border-primary h-100">
                                    <div className="card-header bg-primary bg-opacity-10 fw-bold">
                                        <i className="fa fa-credit-card me-1"></i> Mercado Pago
                                    </div>
                                    <div className="card-body">
                                        <p className="fs-3 fw-bolder mb-3">{fmtPesos(mp)}</p>
                                        <div className="d-flex justify-content-between border-top pt-2">
                                            <span className="fw-bold">Total del día</span>
                                            <strong className="fw-bolder">{fmtPesos(totalEfectivo + mp)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="card border-dark text-center">
                                    <div className="card-body py-3">
                                        <p className="fs-2 fw-bolder mb-0">{resumen.totalPedidos || 0}</p>
                                        <span className="text-body-secondary text-uppercase small fw-bold">Pedidos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="card border-dark text-center">
                                    <div className="card-body py-3">
                                        <p className="fs-2 fw-bolder mb-0">{resumen.totalCombos || 0}</p>
                                        <span className="text-body-secondary text-uppercase small fw-bold">Combos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {deliverys.length > 0 && (
                            <div className="mt-4">
                                <h6 className="fw-bold border-bottom pb-2">Deliverys</h6>
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Repartidor</th>
                                            <th className="text-center">Pedidos</th>
                                            <th className="text-end">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliverys.map((d, idx) => (
                                            <tr key={idx}>
                                                <td>{d.nombre}</td>
                                                <td className="text-center">{d.cantidadPedidos || 0}</td>
                                                <td className="text-end">{fmtPesos(d.totalMonto)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ResumenDiario;

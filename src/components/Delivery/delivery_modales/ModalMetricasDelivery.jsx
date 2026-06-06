import React from "react";
import { Modal } from "react-bootstrap";

const ModalMetricasDelivery = ({ isOpen, onClose, metricasData }) => {
    const filas = metricasData
        ? Object.values(metricasData).sort((a, b) => a.nombre.localeCompare(b.nombre))
        : [];

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Métricas de Deliverys — Hoy</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {filas.length > 0 ? (
                    <>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Delivery</th>
                                        <th>Pedidos</th>
                                        <th>Total pedido</th>
                                        <th>Pagó con</th>
                                        <th>Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filas.map((m, idx) => {
                                        const total = m.totalMonto || 0;
                                        const cobrado = m.totalCobrado || 0;
                                        const diferencia = total - cobrado;
                                        return (
                                            <tr key={idx} className="text-center">
                                                <td>{m.nombre}</td>
                                                <td>{m.cantidadPedidos || 0}</td>
                                                <td>${total}</td>
                                                <td>{cobrado > 0 ? `$${cobrado}` : <span className="text-muted">—</span>}</td>
                                                <td className={` fw-semibold ${diferencia > 0 ? 'text-danger' : diferencia < 0 ? 'text-warning' : 'text-success'}`}>
                                                    ${diferencia}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                    </>
                ) : (
                    <p className="text-muted text-center">Sin entregas completadas hoy.</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalMetricasDelivery;

import React from "react";
import moment from "moment";
import { Modal } from "react-bootstrap";
import { getItemsCocina } from "./cocina_hooks/useItemsCocina";

const VerPedidoModal = ({ pedido, onClose }) => {
    if (!pedido) return null;

    // Agrupar elementos principales con sus adicionales (EXTRA) para que no se separen entre columnas
    const grupos = [];
    let grupoActual = null;

    // Es la card expandida del mismo cocinero: tiene que mostrar lo mismo que la card.
    getItemsCocina(pedido.carrito).forEach(item => {
        if (item.categoria !== 'EXTRA') {
            if (grupoActual) {
                grupos.push(grupoActual);
            }
            grupoActual = { principal: item, extras: [] };
        } else {
            if (grupoActual) {
                grupoActual.extras.push(item);
            } else {
                grupos.push({ principal: item, extras: [] });
            }
        }
    });
    if (grupoActual) {
        grupos.push(grupoActual);
    }

    const mitadGrupos = Math.ceil(grupos.length / 2);
    const gruposIzquierda = grupos.slice(0, mitadGrupos);
    const gruposDerecha = grupos.slice(mitadGrupos);

    return (
        <Modal
            show={!!pedido}
            onHide={onClose}
            size="lg"
            centered
            scrollable
        >
            <Modal.Header closeButton className="bg-warning bg-opacity-25 p-3">
                <div className="d-flex align-items-center gap-3 w-100 justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <Modal.Title className="mb-0 fw-bold text-dark fs-3">{pedido.nombre}</Modal.Title>
                        <span className="badge bg-dark fs-5 py-2 px-3">{pedido.codigo}</span>
                    </div>
                    <div className="d-flex align-items-center gap-3 fs-5 me-2">
                        <small className="text-secondary fw-semibold">
                            {moment(pedido.timestamp?.toDate()).format("DD/MM/YYYY HH:mm")}
                        </small>
                    </div>
                </div>
            </Modal.Header>
            <Modal.Body className="p-4 text-start">
                <h5 className="text-secondary mb-3 border-bottom pb-2 fw-bold">Detalle:</h5>
                
                <div className="row g-0 text-start align-items-stretch">
                    {/* Columna Izquierda */}
                    <div className="col-5">
                        <div className="d-flex flex-column gap-3">
                            {gruposIzquierda.map((grupo, i) => (
                                <div key={i} className="d-flex flex-column">
                                    <div className="fw-bold fs-5 text-dark">
                                        {grupo.principal.cantidad}x {grupo.principal.descripcion}
                                    </div>
                                    {grupo.extras.map((extra, j) => (
                                        <div key={j} className="ps-3 text-muted fst-italic fs-6">
                                            {extra.cantidad}x {extra.descripcion}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Línea divisoria vertical */}
                    <div className="col-2 d-flex justify-content-center">
                        <div className="vr bg-dark bg-opacity-25 h-100"></div>
                    </div>
                    
                    {/* Columna Derecha */}
                    <div className="col-5">
                        <div className="d-flex flex-column gap-3">
                            {gruposDerecha.map((grupo, i) => (
                                <div key={i} className="d-flex flex-column">
                                    <div className="fw-bold fs-5 text-dark">
                                        {grupo.principal.cantidad}x {grupo.principal.descripcion}
                                    </div>
                                    {grupo.extras.map((extra, j) => (
                                        <div key={j} className="ps-3 text-muted fst-italic fs-6">
                                            {extra.cantidad}x {extra.descripcion}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {pedido.observaciones && (
                    <div className="mt-4 p-3 bg-light rounded border">
                        <strong className="text-secondary small d-block mb-1">Observaciones de Cocina:</strong>
                        <p className="mb-0 fs-5 text-danger fw-bold" style={{ whiteSpace: 'pre-wrap' }}>
                            {pedido.observaciones}
                        </p>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default VerPedidoModal;

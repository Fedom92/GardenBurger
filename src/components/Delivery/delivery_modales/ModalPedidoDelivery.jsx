import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { SUBESTADOS_MOTODELIVERY } from "../../../Utils/Constantes";

const ModalPedidoDelivery = ({ isOpen, pedido, deliverys, onClose, onAsignarDelivery, onMarcarEstado }) => {
    const [pagoRepartidorInput, setPagoRepartidorInput] = useState(pedido?.pagoRepartidorCon || "");

    if (!pedido) return null;

    const p = pedido;
    const estadoDelivery = p.estadoDelivery || "";
    const salio = estadoDelivery === SUBESTADOS_MOTODELIVERY.SALIDA;
    const tieneAsignado = Boolean(p.deliveryAsignado);
    const selectedDeliveryId = deliverys.find(d => d.nombre === p.deliveryAsignado)?.id || "";

    const waClienteHref = p.telefono
        ? `https://api.whatsapp.com/send?phone=549${p.telefono}&text=${encodeURIComponent(`Tu pedido está en camino! 🛵`)}`
        : null;

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Pedido #{p.codigo} — {p.nombre}</Modal.Title>
            </Modal.Header>
            <Modal.Body>

                {/* Info del pedido */}
                <div className="row mb-3">
                    <div className="col-md-6">
                        <p className="mb-1">
                            <strong>Teléfono:</strong> {p.telefono || "—"}
                            {waClienteHref && (
                                <a
                                    href={waClienteHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-success btn-sm ms-2 py-0 px-1"
                                    title="WhatsApp Cliente"
                                >
                                    <i className="fa-brands fa-whatsapp"></i>
                                </a>
                            )}
                        </p>
                        <p className="mb-1">
                            <strong>Dirección:</strong> {p.direccion || "—"}
                        </p>
                        {p.entreCalles && (
                            <p className="mb-1"><strong>Entre calles:</strong> {p.entreCalles}</p>
                        )}
                        {p.observaciones && (
                            <p className="mb-1">
                                <strong>Observaciones:</strong>{" "}
                                <span className="text-warning fw-semibold">{p.observaciones}</span>
                            </p>
                        )}
                    </div>
                    <div className="col-md-6">
                        <p className="mb-1"><strong>Total:</strong> ${p.total}</p>
                        <p className="mb-1"><strong>Método de pago:</strong> {p.metodoPago}</p>
                        <p className="mb-1"><strong>Zona:</strong> {p.envio?.zona_envio}</p>
                        <p className="mb-1"><strong>Costo envío:</strong> ${p.envio?.costo_envio}</p>
                    </div>
                </div>

                <hr />

                {/* Gestión */}
                <div className="row">
                    <div className="col-md-6 mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <label className="form-label fw-semibold mb-0">Asignar repartidor</label>
                        </div>
                        <select
                            className="form-select"
                            value={selectedDeliveryId}
                            onChange={(e) => onAsignarDelivery(p.id, e.target.value)}
                        >
                            <option value="">Sin asignar</option>
                            {deliverys.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* "Pagó con $": solo cuando salió, para EFECTIVO o pago dividido */}
                    {salio && (p.metodoPago === "EFECTIVO" || p.metodoPago === "%") && (
                        <div className="col-md-6 mb-2">
                            <label className="form-label fw-semibold">Pagó con $</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Monto recibido por el repartidor"
                                value={pagoRepartidorInput}
                                onChange={(e) => setPagoRepartidorInput(e.target.value)}
                            />
                            {p.metodoPago === "%" && (
                                <small className="text-muted">Solo la parte en efectivo del pago dividido.</small>
                            )}
                        </div>
                    )}
                </div>

            </Modal.Body>
            <Modal.Footer>
                {tieneAsignado && !salio && (
                    <button
                        className="btn btn-warning"
                        onClick={() => onMarcarEstado(p.id, SUBESTADOS_MOTODELIVERY.SALIDA, "")}
                    >
                        <i className="fa-solid fa-motorcycle"></i> Marcar Salida
                    </button>
                )}
                {salio && (
                    <button
                        className="btn btn-success"
                        onClick={() => {
                            if (p.metodoPago === "EFECTIVO" && !pagoRepartidorInput) {
                                toast.error("Ingresá el monto que pagó el cliente antes de confirmar.");
                                return;
                            }
                            onMarcarEstado(p.id, SUBESTADOS_MOTODELIVERY.FIN, pagoRepartidorInput);
                        }}
                    >
                        <i className="fa-solid fa-check"></i> Confirmar Entrega
                    </button>
                )}
                <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalPedidoDelivery;

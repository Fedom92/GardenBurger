import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import moment from "moment";

// Avisa que entre los pedidos seleccionados hay algunos con horario especial que
// todavia estan lejos de su hora. Arrancan destildados: mandarlos igual tiene que ser
// una decision del cocinero, pedido por pedido. Los que queden sin tildar no se tocan
// y siguen en la solapa En Espera.
const ModalHorariosEspeciales = ({ pedidos, otrosSeleccionados, minutosParaLaHora, onConfirmar, onClose }) => {
    const [marcados, setMarcados] = useState([]);

    // Los otros seleccionados van a cocina si o si, por eso cuentan en el boton: sin
    // ellos parece que aceptar no manda nada.
    const totalACocinar = marcados.length + otrosSeleccionados;

    const toggle = (pedidoId) => {
        setMarcados(prev =>
            prev.includes(pedidoId)
                ? prev.filter(id => id !== pedidoId)
                : [...prev, pedidoId]
        );
    };

    const todosMarcados = marcados.length === pedidos.length;

    const toggleTodos = () => {
        setMarcados(todosMarcados ? [] : pedidos.map(p => p.id));
    };

    return (
        <Modal show onHide={onClose} centered scrollable>
            <Modal.Header closeButton className="bg-danger bg-opacity-10">
                <Modal.Title className="fs-5 fw-bold text-danger">
                    ⏰ Pedidos con horario especial
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p className="small text-body-secondary">
                    Estos pedidos son para más tarde. Marcá los que quieras cocinar igual;
                    los que dejes sin marcar quedan en espera.
                </p>

                {pedidos.length > 1 && (
                    <div className="form-check border-bottom pb-2 mb-2">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="marcarTodosEspeciales"
                            checked={todosMarcados}
                            onChange={toggleTodos}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="marcarTodosEspeciales">
                            Marcar todos
                        </label>
                    </div>
                )}

                <div className="d-flex flex-column gap-2">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className="form-check d-flex align-items-center gap-2 m-0">
                            <input
                                className="form-check-input m-0 flex-shrink-0"
                                type="checkbox"
                                id={`especial-${pedido.id}`}
                                checked={marcados.includes(pedido.id)}
                                onChange={() => toggle(pedido.id)}
                            />
                            <label
                                className="form-check-label d-flex align-items-center justify-content-between w-100"
                                htmlFor={`especial-${pedido.id}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>
                                    <span className="badge bg-dark me-2">{pedido.codigo}</span>
                                    {pedido.nombre}
                                </span>
                                <span className="text-end">
                                    <span className="fs-5 fw-bold text-danger">
                                        {moment(pedido.timestamp?.toDate()).format("HH:mm")}
                                    </span>
                                    <small className="d-block text-body-secondary">
                                        faltan {minutosParaLaHora(pedido)} min
                                    </small>
                                </span>
                            </label>
                        </div>
                    ))}
                </div>
            </Modal.Body>

            <Modal.Footer>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Volver
                </button>
                <button
                    type="button"
                    className="btn btn-success"
                    disabled={totalACocinar === 0}
                    onClick={() => onConfirmar(marcados)}
                >
                    Cocinar ({totalACocinar})
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalHorariosEspeciales;

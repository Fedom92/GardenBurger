import React from "react";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { errorPagoDividido } from "../pos_hooks/validarPedido";

const PagoDividido = ({ isOpen, onClose, onCancelar, montoEfectivo, setMontoEfectivo, totalBase }) => {

    // Misma validacion que corre validarPedido al guardar: aca se avisa temprano,
    // alla se garantiza aunque el carrito haya cambiado despues.
    const handleConfirmar = () => {
        const error = errorPagoDividido(montoEfectivo, totalBase);
        if (error) {
            Swal.fire({
                title: 'Advertencia',
                text: error,
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        onClose();
    };

    return (
        <Modal show={isOpen} onHide={onCancelar} centered>
            <Modal.Header closeButton>
                <Modal.Title>Pago Dividido</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <label className="form-label">Monto en efectivo:</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            value={montoEfectivo}
                            onChange={(e) => setMontoEfectivo(Number(e.target.value))}
                            min="0"
                            step="1000"
                            placeholder="Ingrese el monto en efectivo"
                        />
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-secondary" onClick={onCancelar}>
                    Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmar}>
                    Confirmar
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default PagoDividido;
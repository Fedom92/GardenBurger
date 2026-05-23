import React, { useState } from "react";
import { collection, query, getDocs, updateDoc, doc, where, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from 'sweetalert2';
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";
import { ESTADOS } from "../../../Utils/Constantes";

const EliminarTickets = ({ isOpen, onClose }) => {
    const [pedido, setPedido] = useState(null);
    const [numeroTicket, setNumeroTicket] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState("");
    const { userData } = useAuth();

    // Función para buscar un pedido por su código
    const buscarPedido = async () => {
        setIsLoading(true);
        setErrorBusqueda("");
        setPedido(null);

        try {
            const pedidosCollection = collection(db, "pedidos");
            const q = query(pedidosCollection,
                where("codigo", "==", numeroTicket.trim()),
                where("estado", "!=", ESTADOS.ELIMINADO),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setErrorBusqueda(`No se encontraron pedidos.`);
            } else {
                const doc = querySnapshot.docs[0];

                const pedidoEncontrado = {
                    id: doc.id,
                    ...doc.data()
                };
                setPedido(pedidoEncontrado);
            }
        } catch (error) {
            console.error('Error buscando pedido:', error);
            setErrorBusqueda('Error al buscar el pedido');
        } finally {
            setIsLoading(false);
        }
    };

    // Función para eliminar pedido (cambiar estado a ELIMINADO)
    const eliminarPedido = async (pedidoId, codigoPedido) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se marcará el pedido ${codigoPedido} como ELIMINADO`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const pedidoRef = doc(db, "pedidos", pedidoId);
                const updateData = {
                    estado: ESTADOS.ELIMINADO,
                    cajeroEliminaID: userData.id,
                    cajeroElimina: userData.nombreCompleto,
                    cajeroEliminaTimestamp: serverTimestamp(),
                };

                await updateDoc(pedidoRef, updateData);

                // Actualizar el pedido local
                setPedido(prev => prev ? { ...prev, estado: ESTADOS.ELIMINADO } : null);

                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El pedido ha sido marcado como ELIMINADO',
                    icon: 'success',
                    confirmButtonColor: '#198754',
                });
            } catch (error) {
                console.error('Error eliminando pedido:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al eliminar el pedido',
                    icon: 'error',
                    confirmButtonColor: '#dc3545',
                });
            }
        }
    };

    // Limpiar el estado cuando se cierra el modal
    const handleClose = () => {
        setPedido(null);
        setNumeroTicket("");
        setErrorBusqueda("");
        onClose();
    };

    return (
        <Modal
            show={isOpen}
            onHide={handleClose}
            size="lg"
            scrollable
            centered
        >
            <Modal.Header closeButton className="border-0 pb-0 pt-2 px-4">
                <div>
                    <Modal.Title className="fs-4 fw-bold text-dark">Eliminar Tickets</Modal.Title>
                </div>
            </Modal.Header>
            <Modal.Body className="p-4">
                <div className="mb-4">
                    <div className="input-group input-group-lg shadow-sm rounded-3 border border-secondary-subtle" style={{ overflow: 'hidden' }}>
                        <span className="input-group-text bg-white border-0 text-primary px-4">
                            <i className="fa fa-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control border-0 px-2"
                            placeholder="Ej: 123-ABC (sin espacios)"
                            value={numeroTicket}
                            onChange={(e) => setNumeroTicket(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && numeroTicket.trim() && numeroTicket.length >= 3) {
                                    buscarPedido();
                                }
                            }}
                            disabled={isLoading}
                            autoComplete="off"
                            maxLength={20}
                            style={{ boxShadow: 'none' }}
                        />
                        <button
                            className="btn btn-primary px-4 fw-bold"
                            type="button"
                            onClick={buscarPedido}
                            disabled={isLoading || !numeroTicket.trim() || numeroTicket.length < 3}
                            style={{ borderRadius: '0' }}
                        >
                            Buscar
                        </button>
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center py-5">
                        <span className="loader"></span>
                        <p className="mt-3">Buscando pedido...</p>
                    </div>
                ) : errorBusqueda ? (
                    <div className="text-center text-body-secondary py-5">
                        <i className="fa fa-exclamation-triangle fa-4x mb-3 text-warning"></i>
                        <h5>SIN RESULTADOS</h5>
                        <p>{errorBusqueda}</p>
                    </div>
                ) : pedido ? (
                    <div className="card bg-body shadow-sm border border-secondary-subtle">
                        <div className="card-header bg-body-secondary d-flex justify-content-between align-items-center border-bottom pb-2">
                            <h6 className="mb-0">
                                <strong>Pedido #{pedido.codigo}</strong>
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                                <small className="text-body-secondary">
                                    {moment(pedido.timestamp.toDate()).format("DD/MM/YYYY HH:mm")}
                                </small>
                            </div>
                        </div>
                        <div className="card-body h-auto">
                            <div className="row">
                                <div className="col-6">
                                    <p className="mb-2">
                                        <strong>Cliente:</strong> {pedido.nombre}
                                    </p>
                                    <p className="mb-2">
                                        <strong>Teléfono:</strong> {pedido.telefono}
                                    </p>
                                    <p className="mb-2">
                                        <strong>Dirección:</strong> {pedido.direccion}
                                    </p>
                                    {pedido.entreCalles && (
                                        <p className="mb-2">
                                            <strong>Entre calles:</strong> {pedido.entreCalles}
                                        </p>
                                    )}
                                </div>
                                <div className="col-6">
                                    <p className="mb-2">
                                        <strong>Estado:</strong>
                                        <span className={`rounded-3 p-1 px-2 mx-2 fw-bold border border-dark ${pedido.estado === ESTADOS.ELIMINADO ? "bg-danger text-white border-danger" : "bg-info text-dark"}`}>
                                            {pedido.estado}
                                        </span>
                                    </p>
                                    <p className="mb-2">
                                        <strong>Método:</strong> {pedido.metodoPago}
                                    </p>
                                    {pedido.metodoPago === "%" && (
                                        <p className="mb-2">
                                            <strong>Monto Efectivo:</strong> ${pedido.montoEfectivo || 0}
                                        </p>
                                    )}
                                    <p className="mb-2">
                                        <strong>Envío:</strong> {pedido.envio?.zona_envio} - ${pedido.envio?.costo_envio}
                                    </p>
                                    <p className="mb-2">
                                        <strong>Total:</strong> ${pedido.total}
                                    </p>

                                    <div className="mt-3 d-flex flex-column gap-2">
                                        {pedido.estado !== ESTADOS.ELIMINADO ? (
                                            <button
                                                className="btn btn-danger btn-sm w-75 fw-bold"
                                                onClick={() => eliminarPedido(pedido.id, pedido.codigo)}
                                            >
                                                <i className="fa fa-trash me-1"></i> Eliminar Pedido
                                            </button>
                                        ) : (
                                            <div className="alert alert-secondary mb-0 p-2 w-75" role="alert">
                                                <small className="fw-bold"><i className="fa fa-info-circle me-1"></i> Ya está eliminado</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-body-secondary py-5 my-3">
                        <i className="fa fa-search fa-4x mb-3 opacity-25"></i>
                        <h5 className="fw-semibold text-secondary">Buscador General</h5>
                        <p className="text-muted">Los resultados de la búsqueda aparecerán aquí</p>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default EliminarTickets;
import React, { useState } from "react";
import { collection, query, getDocs, updateDoc, doc, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";

const EliminarTickets = ({ isOpen, onClose }) => {
    const [pedido, setPedido] = useState(null);
    const [numeroTicket, setNumeroTicket] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState("");

    // Función para buscar un pedido por su código
    const buscarPedido = async () => {
        if (!numeroTicket.trim()) {
            Swal.fire({
                title: 'Atención',
                text: 'Por favor ingresa un número de ticket',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        setIsLoading(true);
        setErrorBusqueda("");
        setPedido(null);

        try {
            const pedidosCollection = collection(db, "pedidos");
            const q = query(pedidosCollection, where("codigo", "==", numeroTicket.trim()));
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setErrorBusqueda(`No se encontró ningún pedido con el código ${numeroTicket}`);
                Swal.fire({
                    title: 'No encontrado',
                    text: `No se encontró ningún pedido con el código ${numeroTicket}`,
                    icon: 'info',
                    confirmButtonColor: '#0dcaf0',
                });
            } else {
                const pedidoEncontrado = {
                    id: querySnapshot.docs[0].id,
                    ...querySnapshot.docs[0].data()
                };
                setPedido(pedidoEncontrado);
            }
        } catch (error) {
            console.error('Error buscando pedido:', error);
            setErrorBusqueda('Error al buscar el pedido');
            Swal.fire({
                title: 'Error',
                text: 'Error al buscar el pedido',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
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
                await updateDoc(pedidoRef, {
                    estado: "ELIMINADO"
                });

                // Actualizar el pedido local
                setPedido(prev => prev ? { ...prev, estado: "ELIMINADO" } : null);

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

    // Limpiar y preparar para otra búsqueda
    const limpiarBusqueda = () => {
        setPedido(null);
        setNumeroTicket("");
        setErrorBusqueda("");
    };

    return (
        <Modal 
            show={isOpen} 
            onHide={handleClose} 
            size="xl" 
            scrollable
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-center w-100">Eliminar Tickets</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row g-3">
                    {/* Columna Izquierda - Búsqueda y Acciones */}
                    <div className="col-md-4">
                        <div className="d-flex flex-column gap-3">
                            {/* Input y Botón de Búsqueda */}
                            <div>
                                <label className="form-label mb-2">Número de Ticket:</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ejemplo: 123-ABC (sin espacios)"
                                        value={numeroTicket}
                                        onChange={(e) => setNumeroTicket(e.target.value.toUpperCase())}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                buscarPedido();
                                            }
                                        }}
                                        disabled={isLoading}
                                        maxLength={20}
                                        style={{ maxWidth: '300px' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        type="button"
                                        onClick={buscarPedido}
                                        disabled={isLoading || !numeroTicket.trim()}
                                    >
                                        <i className="fa fa-search"></i> Buscar
                                    </button>
                                </div>
                                {errorBusqueda && (
                                    <div className="alert alert-warning mt-2 mb-0" role="alert" style={{ fontSize: '0.85rem' }}>
                                        {errorBusqueda}
                                    </div>
                                )}
                            </div>

                            {/* Botones de Acción */}
                            {pedido && (
                                <div className="d-flex flex-column gap-2 mt-3">
                                    {pedido.estado !== "ELIMINADO" ? (
                                        <button
                                            className="btn btn-danger w-100"
                                            onClick={() => eliminarPedido(pedido.id, pedido.codigo)}
                                        >
                                            <i className="fa fa-trash"></i> Eliminar
                                        </button>
                                    ) : (
                                        <div className="alert alert-secondary mb-0" role="alert">
                                            <small>Este pedido ya fue eliminado</small>
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-secondary w-100"
                                        onClick={limpiarBusqueda}
                                    >
                                        <i className="fa fa-times"></i> Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha - Resultados */}
                    <div className="col-md-8" style={{ borderLeft: '1px solid #dee2e6' }}>
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
                            <div className={`card bg-light"}`}>
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">
                                        <strong>Pedido #{pedido.codigo}</strong>
                                    </h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-body-secondary">
                                            {pedido.fecha} - {pedido.hora}
                                        </small>
                                    </div>
                                </div>
                                <div className="card-body">
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
                                                <strong>Estado:</strong> <span className={`rounded-3 p-1 ${pedido.estado === "ELIMINADO" ? "bg-danger fw-bold" : "bg-info"}`}>{pedido.estado}</span>
                                            </p>
                                            <p className="mb-2">
                                                <strong>Método:</strong> {pedido.metodoPago}
                                            </p>
                                            {pedido.metodoPago === "%" && (
                                                <p className="mb-2">
                                                    <strong>Monto Efectivo:</strong> ${pedido.montoEfectivo?.toFixed(2) || 0}
                                                </p>
                                            )}
                                            <p className="mb-2">
                                                <strong>Envío:</strong> {pedido.envio?.zona_envio} - ${pedido.envio?.costo_envio}
                                            </p>
                                            <p className="mb-2">
                                                <strong>Total:</strong> ${pedido.total?.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-body-secondary py-5">
                                <i className="fa fa-search fa-4x mb-3"></i>
                                <h5>Buscar Ticket</h5>
                                <p>Ingresa un número de ticket para buscar y eliminar un pedido</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClose}
                >
                    Cerrar
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default EliminarTickets;
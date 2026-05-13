import React, { useState, useEffect } from "react";
import { collection, query, where, updateDoc, doc, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";

const PendientesMP = ({ isOpen, onClose }) => {
    const { userData } = useAuth();
    const [pedidosPendientes, setPedidosPendientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        let initialLoad = true;

        const pedidosCollection = collection(db, "pedidos");
        const q = query(pedidosCollection, where("estado", "==", "PENDIENTEMP"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pedidos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setPedidosPendientes(pedidos);
            setIsLoading(false);

            if (!initialLoad && pedidos.length === 0) {
                onClose();
            }
            initialLoad = false;
        }, (error) => {
            console.error('Error escuchando pedidos pendientes:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al escuchar pedidos pendientes',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, onClose]);

    const aprobarPedido = async (pedidoId) => {
        try {
            const pedidoRef = doc(db, "pedidos", pedidoId);
            await updateDoc(pedidoRef, {
                estado: "APROBADO",
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
            });
        } catch (error) {
            console.error('Error aprobando pedido:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al aprobar el pedido',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    };

    const rechazarPedido = async (pedidoId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'El pedido será rechazado.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const pedidoRef = doc(db, "pedidos", pedidoId);
                await updateDoc(pedidoRef, {
                    estado: "CANCELADO",
                    cajeroID: userData.id,
                    cajero: userData.nombreCompleto,
                });
            } catch (error) {
                console.error('Error rechazando el pedido:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al rechazar el pedido',
                    icon: 'error',
                    confirmButtonColor: '#dc3545',
                });
            }
        }
    };

    return (
        <Modal
            show={isOpen}
            onHide={onClose}
            size="xl"
            scrollable
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-center w-100">MercadoPago Pendientes</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isLoading ? (
                    <div className="text-center">
                        <span className="loader"></span>
                        <p>Cargando pedidos...</p>
                    </div>
                ) : (
                    <div className="row">
                        {pedidosPendientes.map((pedido) => (
                            <div key={pedido.id} className="col-md-6">
                                <div className="card mb-1">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0">
                                            <strong>Pedido #{pedido.codigo}</strong>
                                        </h6>
                                        <small className="text-body-secondary">
                                            {moment(pedido.timestamp.toDate()).format("DD/MM/YYYY HH:mm")}
                                        </small>
                                    </div>
                                    <div className="card-body h-auto">
                                        <div className="row">
                                            <div className="col-6">
                                                <p className="mb-1">
                                                    <strong>Cliente:</strong> {pedido.nombre}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Teléfono:</strong> {pedido.telefono}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Dirección:</strong> {pedido.direccion}
                                                </p>
                                                {pedido.entreCalles && (
                                                    <p className="mb-1">
                                                        <strong>Entre calles:</strong> {pedido.entreCalles}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-6">
                                                <p className="mb-1">
                                                    <strong>Método:</strong> {pedido.metodoPago}
                                                </p>
                                                {pedido.metodoPago === "%" && (
                                                    <p className="mb-1">
                                                        <strong>Efectivo:</strong> ${pedido.montoEfectivo || 0}
                                                    </p>
                                                )}
                                                <p className="mb-1">
                                                    <strong>Envío:</strong> {pedido.envio?.zona_envio} - ${pedido.envio?.costo_envio}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Total:</strong> ${pedido.total}
                                                </p>
                                                <div className="mt-2">
                                                    <a
                                                        href={`https://api.whatsapp.com/send?phone=549${pedido.telefono}&text=Hola ${pedido.nombre}. `}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-success btn-sm w-75 fw-bold"
                                                    >
                                                        <i className="fa-brands fa-whatsapp fs-5 align-middle me-1"></i> Enviar WhatsApp
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-success btn-sm flex-fill"
                                                onClick={() => aprobarPedido(pedido.id)}
                                            >
                                                <i className="fa fa-check"></i> Aprobar
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm flex-fill"
                                                onClick={() => rechazarPedido(pedido.id)}
                                            >
                                                <i className="fa fa-times"></i> Rechazar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                >
                    Cerrar
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default PendientesMP;
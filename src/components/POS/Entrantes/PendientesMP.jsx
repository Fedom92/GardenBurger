import React, { useState, useEffect } from "react";
import { collection, query, where, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import 'moment/locale/es';
import { useAuth } from "../../../context/AuthContext";

const PendientesMP = ({ isOpen, onClose }) => {
    const { userData } = useAuth();
    const [pedidosPendientes, setPedidosPendientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);


    // Función para aprobar pedido
    const aprobarPedido = async (pedidoId) => {
        try {
            const pedidoRef = doc(db, "pedidos", pedidoId);
            await updateDoc(pedidoRef, {
                estado: "PENDIENTE",
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
            });

            Swal.fire({
                title: '¡Aprobado!',
                text: 'El pedido ha sido aprobado',
                icon: 'success',
                confirmButtonColor: '#198754',
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

    // Función para rechazar pedido
    const rechazarPedido = async (pedidoId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'El pedido será eliminado cancelado.',
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
                    estado: "ELIMINADO",
                    cajeroID: userData.id,
                    cajero: userData.nombreCompleto,
                });

                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El pedido ha sido eliminado',
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

    // Cargar pedidos cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        const pedidosCollection = collection(db, "pedidos");
        const q = query(pedidosCollection, where("estado", "==", "PENDIENTEMP"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pedidos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            pedidos.sort((a, b) => {
                const fechaA = moment(`${a.fecha} ${a.hora}`, "DD/MM/YYYY HH:mm");
                const fechaB = moment(`${b.fecha} ${b.hora}`, "DD/MM/YYYY HH:mm");
                return fechaB.diff(fechaA);
            });

            setPedidosPendientes(pedidos);
            setIsLoading(false);
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
    }, [isOpen]);

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
                ) : pedidosPendientes.length === 0 ? (
                    <div className="text-center text-body-secondary">
                        <i className="fa fa-check-circle fa-3x mb-3"></i>
                        <h4>No hay pedidos pendientes</h4>
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
                                            {pedido.fecha} - {pedido.hora}
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


import React, { useState, useEffect } from "react";
import { collection, query, where, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import 'moment/locale/es';
import { useAuth } from "../../../context/AuthContext";

const PendientesSolicitudes = ({ isOpen, onClose, onAprobarSolicitud }) => {
    const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { userData } = useAuth();

    // Función para aprobar solicitud
    const aprobarSolicitud = async (solicitudId) => {
        try {
            const solicitudRef = doc(db, "solicitudes", solicitudId);
            await updateDoc(solicitudRef, {
                estado: "APROBADO",
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
            });

            // Obtener los datos de la solicitud para pasarlos al formulario
            const solicitud = solicitudesPendientes.find(s => s.id === solicitudId);

            // Llamar a la función callback para llenar el formulario
            if (onAprobarSolicitud && solicitud) {
                onAprobarSolicitud(solicitud);
            }

            Swal.fire({
                title: '¡Aprobado!',
                text: 'Los datos se han cargado en el formulario',
                icon: 'success',
                confirmButtonColor: '#198754',
            });
        } catch (error) {
            console.error('Error aprobando solicitud:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al aprobar la solicitud',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    };

    // Función para rechazar solicitud
    const rechazarSolicitud = async (solicitudId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'La solicitud será rechazada.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const solicitudRef = doc(db, "solicitudes", solicitudId);
                await updateDoc(solicitudRef, {
                    estado: "CANCELADO",
                    cajeroID: userData.id,
                    cajero: userData.nombreCompleto,
                });

                Swal.fire({
                    title: '¡Rechazado!',
                    text: 'La solicitud ha sido rechazada',
                    icon: 'success',
                    confirmButtonColor: '#198754',
                });
            } catch (error) {
                console.error('Error rechazando solicitud:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al rechazar la solicitud',
                    icon: 'error',
                    confirmButtonColor: '#dc3545',
                });
            }
        }
    };

    // Cargar solicitudes cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        const solicitudesCollection = collection(db, "solicitudes");
        const q = query(solicitudesCollection, where("estado", "==", "PENDIENTE"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const solicitudes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSolicitudesPendientes(solicitudes);
            setIsLoading(false);
        }, (error) => {
            console.error('Error escuchando solicitudes pendientes:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al escuchar solicitudes pendientes',
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
                <Modal.Title className="text-center w-100">Solicitudes Pendientes</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isLoading ? (
                    <div className="text-center">
                        <span className="loader"></span>
                        <p>Cargando solicitudes...</p>
                    </div>
                ) : solicitudesPendientes.length === 0 ? (
                    <div className="text-center text-body-secondary">
                        <i className="fa fa-check-circle fa-3x mb-3"></i>
                        <h4>No hay solicitudes pendientes</h4>
                    </div>
                ) : (
                    <div className="row">
                        {solicitudesPendientes.map((solicitud) => (
                            <div key={solicitud.id} className="col-md-6">
                                <div className="card mb-1">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0">
                                            <strong>Solicitud #{solicitud.id.slice(-8)}</strong>
                                        </h6>
                                        <small className="text-body-secondary">
                                            {solicitud.timestamp ?
                                                moment(solicitud.timestamp.toDate()).format("DD/MM/YYYY HH:mm") :
                                                "Sin fecha"
                                            }
                                        </small>
                                    </div>
                                    <div className="card-body h-auto">
                                        <div className="row">
                                            <div className="col-6">
                                                <p className="mb-1">
                                                    <strong>Cliente:</strong> {solicitud.cliente?.nombre || "Sin nombre"}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Teléfono:</strong> {solicitud.cliente?.telefono || "Sin teléfono"}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Opción:</strong> {solicitud.cliente?.opcion === "delivery" ? "Delivery" : "Retiro"}
                                                </p>
                                                {solicitud.cliente?.opcion === "delivery" && solicitud.cliente?.direccion && (
                                                    <p className="mb-1">
                                                        <strong>Dirección:</strong> {solicitud.cliente.direccion}
                                                    </p>
                                                )}
                                                {solicitud.cliente?.entreCalles && (
                                                    <p className="mb-1">
                                                        <strong>Entre calles:</strong> {solicitud.cliente.entreCalles}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-6">
                                                <p className="mb-1">
                                                    <strong>Método de pago:</strong> {solicitud.cliente?.pago || "No especificado"}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Total:</strong> ${solicitud.total || 0}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Productos:</strong> {solicitud.productos?.length || 0} items
                                                </p>
                                            </div>
                                        </div>

                                        {/* Mostrar productos de la solicitud */}
                                        {solicitud.productos && solicitud.productos.length > 0 && (
                                            <div className="mt-2">
                                                <h6>Productos:</h6>
                                                <div className="row">
                                                    {solicitud.productos.map((producto, index) => (
                                                        <div key={index} className="col-12">
                                                            <small className="text-body-secondary">
                                                                {producto.cantidad}x {producto.descripcion} - ${producto.precio}
                                                            </small>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-footer">
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-success btn-sm flex-fill"
                                                onClick={() => aprobarSolicitud(solicitud.id)}
                                            >
                                                <i className="fa fa-check"></i> Aprobar
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm flex-fill"
                                                onClick={() => rechazarSolicitud(solicitud.id)}
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

export default PendientesSolicitudes;

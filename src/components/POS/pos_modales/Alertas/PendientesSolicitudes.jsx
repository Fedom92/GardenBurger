import React, { useState, useEffect } from "react";
import { collection, query, where, updateDoc, doc, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import 'moment/locale/es';
import { useAuth } from "../../../../context/AuthContext";
import { ESTADOS } from "../../../../Utils/Constantes";

const PendientesSolicitudes = ({ isOpen, onClose, onAprobarSolicitud }) => {
    const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { userData } = useAuth();

    // Cargar solicitudes cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        let initialLoad = true;

        const solicitudesCollection = collection(db, "solicitudes");
        const q = query(solicitudesCollection, where("estado", "==", ESTADOS.SOLICITUD_PENDIENTE), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const solicitudes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSolicitudesPendientes(solicitudes);
            setIsLoading(false);

            if (!initialLoad && solicitudes.length === 0) {
                onClose();
            }
            initialLoad = false;
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
    }, [isOpen, onClose]);


    const aprobarSolicitud = async (solicitudId) => {
        try {
            const solicitud = solicitudesPendientes.find(s => s.id === solicitudId);

            if (onAprobarSolicitud && solicitud) {
                onAprobarSolicitud(solicitud);
            }

            const solicitudRef = doc(db, "solicitudes", solicitudId);
            await updateDoc(solicitudRef, {
                estado: process.env.REACT_APP_ESTADOPUB_SOLICITUD,
                cajeroApruebaSolID: userData.id,
                cajerApruebaSolo: userData.nombreCompleto,
                cajerApruebaSolTimestamp: serverTimestamp(),
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
                    estado: process.env.REACT_APP_ESTADOPUB_CANCELADO,
                    cajeroCancelaSolID: userData.id,
                    cajeroCancelaSol: userData.nombreCompleto,
                    cajeroCancelaSolTimestamp: serverTimestamp(),
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
                ) : (
                    <div className="row">
                        {solicitudesPendientes.map((solicitud) => (
                            <div key={solicitud.id} className="col-md-6">
                                <div className="card mb-1">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <p className="mb-0">
                                            <strong>Cliente:</strong> {solicitud.cliente?.nombre}
                                        </p>
                                        <small className="text-body-secondary">
                                            {moment(solicitud.timestamp?.toDate()).format("DD/MM/YYYY HH:mm")}
                                        </small>
                                    </div>
                                    <div className="card-body h-auto">
                                        <div className="row">
                                            <div className="col-6">
                                                <p className="mb-1">
                                                    <strong>Teléfono:</strong> {solicitud.cliente?.telefono}
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
                                                    <strong>Método de pago:</strong> {solicitud.cliente?.metodoPago}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Total:</strong> <span className="text-success fw-bold">${solicitud.total || 0}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {solicitud.productos && solicitud.productos.length > 0 && (
                                            <div className="mt-2">
                                                <h6 className="fw-semibold">Productos: ({solicitud.productos?.length || 0})</h6>
                                                <div className="row">
                                                    {solicitud.productos.map((producto, index) => (
                                                        <div key={index} className="d-flex justify-content-between align-items-center border-bottom">
                                                            <small style={{ width: 35 }} className="text-muted small">
                                                                x{producto.cantidad}
                                                            </small>
                                                            <small className="flex-grow-1 small">
                                                                {producto.descripcion}
                                                            </small>
                                                            <small className="fw-semibold small">
                                                                ${producto.precio}
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

import React, { useState, useEffect } from "react";
import { query, where, updateDoc, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { colSucursal, docSucursal } from "../../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import 'moment/locale/es';
import { useAuth } from "../../../../context/AuthContext";
import { ESTADOS } from "../../../../Utils/Constantes";

// Busqueda de Google Maps por texto libre. Es una URL comun, no la API con key que se
// saco del proyecto: no necesita SDK ni se factura. Google resuelve el texto como puede,
// asi que una direccion mal escrita puede caer en otra ciudad sin avisar.
const mapsHref = (direccion) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

const PendientesSolicitudes = ({ isOpen, onClose, onRevisarSolicitud }) => {
    const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // Bloquea los botones mientras una accion esta en curso: sin esto se puede
    // clickear varias veces y disparar la misma escritura de mas.
    const [procesando, setProcesando] = useState(false);
    const { userData } = useAuth();

    // Cargar solicitudes cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        let initialLoad = true;

        const solicitudesCollection = colSucursal("pedidos");
        const q = query(solicitudesCollection, where("estado", "==", ESTADOS.WEB_PENDIENTE), orderBy("clienteTimestamp", "asc"));
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


    // Una solicitud tiene un solo dueño: si la tomaran dos cajeros, los dos podrian
    // guardar el pedido y el resumen del dia sumaria el mismo pedido dos veces.
    // Deshabilita los botones de la tarjeta; el badge ya dice de quien es. El
    // listener ya trae la asignacion, asi que no hace falta releer nada.
    const esDeOtroCajero = (solicitud) =>
        !!solicitud?.cajeroRevisaID && solicitud.cajeroRevisaID !== userData.id;

    const revisarSolicitud = async (solicitudId) => {
        const solicitud = solicitudesPendientes.find(s => s.id === solicitudId);
        if (!onRevisarSolicitud || !solicitud) return;
        if (esDeOtroCajero(solicitud)) return;

        setProcesando(true);
        try {
            // El modal lo cierra handleRevisarSolicitud, y solo si la asignacion se grabo.
            await onRevisarSolicitud(solicitud);
        } finally {
            setProcesando(false);
        }
    };

    const rechazarSolicitud = async (solicitudId) => {
        const solicitud = solicitudesPendientes.find(s => s.id === solicitudId);

        if (esDeOtroCajero(solicitud)) return;

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
            setProcesando(true);
            try {
                const solicitudRef = docSucursal("pedidos", solicitudId);
                await updateDoc(solicitudRef, {
                    estado: ESTADOS.CANCELADO,
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
            } finally {
                setProcesando(false);
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
                                        {/* Los accesos rapidos viven acá y no al lado de su dato: en el cuerpo
                                            entran en media columna y le parten el renglon a la direccion. */}
                                        <p className="mb-0 d-flex align-items-center gap-1">
                                            <span><strong>Cliente:</strong> {solicitud.cliente?.nombre}</span>
                                            <a
                                                href={`https://api.whatsapp.com/send?phone=549${solicitud.cliente?.telefono}&text=Hola ${solicitud.cliente?.nombre}. `}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-success btn-sm py-0 px-1 flex-shrink-0"
                                                title={`Enviar WhatsApp`}
                                            >
                                                <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
                                            </a>
                                            {solicitud.cliente?.opcion === "delivery" && solicitud.cliente?.direccion && (
                                                <a
                                                    href={mapsHref(solicitud.cliente.direccion)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-warning btn-sm py-0 px-1 flex-shrink-0"
                                                    title={`Buscar Google Maps`}
                                                >
                                                    <i className="fa-solid fa-map-location-dot" aria-hidden="true"></i>
                                                </a>
                                            )}
                                            {solicitud.cajeroRevisaID && (
                                                <span className="badge bg-warning text-dark ms-1">
                                                    {solicitud.cajeroRevisaID === userData.id
                                                        ? "Asignada a vos"
                                                        : `Asignada a ${solicitud.cajeroRevisa}`}
                                                </span>
                                            )}
                                        </p>
                                        <small className="text-body-secondary">
                                            {moment(solicitud.clienteTimestamp?.toDate()).format("DD/MM/YYYY HH:mm")}
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

                                        {solicitud.carrito && solicitud.carrito.length > 0 && (
                                            <div className="mt-2">
                                                <h6 className="fw-semibold">Productos: ({solicitud.carrito?.length || 0})</h6>
                                                <div className="row">
                                                    {solicitud.carrito.map((producto, index) => (
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
                                                disabled={procesando || esDeOtroCajero(solicitud)}
                                                onClick={() => revisarSolicitud(solicitud.id)}
                                            >
                                                <i className="fa fa-check"></i> Revisar
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm flex-fill"
                                                disabled={procesando || esDeOtroCajero(solicitud)}
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

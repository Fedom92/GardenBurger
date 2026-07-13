import React, { useState } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import moment from 'moment';
import { ESTADOS, ENVIOS_LOCALES } from "../../../Utils/Constantes";
import { quitarAcentos } from "../../../Utils/TablaGenerica";
import { getRangoJornada } from "../../../Utils/fechaComercial";

const CAMPOS_BUSQUEDA = ["telefono", "codigo", "direccion"];

const BuscarPedido = ({ isOpen, onClose }) => {
    const [pedidos, setPedidos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState("");

    // Función para buscar, entre los pedidos de hoy, por teléfono, código o dirección
    const buscarPedidos = async () => {
        setIsLoading(true);
        setErrorBusqueda("");
        setPedidos([]);

        try {
            const { inicio, fin } = getRangoJornada();
            const pedidosCollection = collection(db, "pedidos");
            const q = query(
                pedidosCollection,
                where("timestamp", ">=", inicio),
                where("timestamp", "<=", fin),
                orderBy("timestamp", "desc")
            );

            const querySnapshot = await getDocs(q);
            const termino = quitarAcentos(busqueda.trim());

            const pedidosEncontrados = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.estado !== ESTADOS.FINAL && p.estado !== ESTADOS.WEB_PENDIENTE)
                .filter(p => CAMPOS_BUSQUEDA.some(campo => quitarAcentos(String(p[campo] ?? "")).includes(termino)));

            if (pedidosEncontrados.length === 0) {
                setErrorBusqueda(`No se encontraron pedidos.`);
            } else {
                setPedidos(pedidosEncontrados);
            }
        } catch (error) {
            console.error('Error buscando pedido:', error);
            setErrorBusqueda('Error al buscar el pedido');
        } finally {
            setIsLoading(false);
        }
    };

    // Limpiar el estado cuando se cierra el modal
    const handleClose = () => {
        setPedidos([]);
        setBusqueda("");
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
                    <Modal.Title className="fs-4 fw-bold text-dark">Buscar Pedidos</Modal.Title>
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
                            placeholder="Teléfono, código o dirección..."
                            value={busqueda}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && busqueda.trim().length >= 3) {
                                    buscarPedidos();
                                }
                            }}
                            onChange={(e) => setBusqueda(e.target.value)}
                            disabled={isLoading}
                            autoComplete="off"
                            style={{ boxShadow: 'none' }}
                        />
                        <button
                            className="btn btn-primary px-4 fw-bold"
                            type="button"
                            onClick={buscarPedidos}
                            disabled={isLoading || busqueda.trim().length < 3}
                            style={{ borderRadius: '0' }}
                        >
                            Buscar
                        </button>
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center py-5">
                        <span className="loader"></span>
                        <p className="mt-3">Buscando pedidos...</p>
                    </div>
                ) : errorBusqueda ? (
                    <div className="text-center text-body-secondary py-5">
                        <i className="fa fa-exclamation-triangle fa-4x mb-3 text-warning"></i>
                        <h5>SIN RESULTADOS</h5>
                        <p>{errorBusqueda}</p>
                    </div>
                ) : pedidos.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                        {pedidos.map((pedido) => (
                            <div key={pedido.id} className="card bg-body shadow-sm border border-secondary-subtle">
                                <div className="card-header bg-body-secondary d-flex justify-content-between align-items-center border-bottom pb-2">
                                    <h6 className="mb-0">
                                        <strong>Cliente:</strong> {pedido.nombre}
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
                                                <strong>Teléfono:</strong> {pedido.telefono}
                                            </p>
                                            <p className="mb-2">
                                                <strong>Opción:</strong> {ENVIOS_LOCALES.includes(pedido.envio.zona_envio) ? pedido.envio.zona_envio : "Delivery"}
                                            </p>
                                            {!ENVIOS_LOCALES.includes(pedido.envio.zona_envio) && (
                                                <p className="mb-2">
                                                    <strong>Dirección:</strong> {pedido.direccion} {pedido.entreCalles}
                                                </p>
                                            )}
                                            <p className="mb-2">
                                                <strong>Método de pago:</strong> {pedido.metodoPago}
                                            </p>
                                        </div>
                                        <div className="col-6">
                                            <p className="mb-2">
                                                <strong>Estado:</strong>
                                                <span className={'rounded-3 p-1 px-2 mx-2 fw-bold text-dark border border-dark'}>
                                                    {pedido.estado}
                                                </span>
                                            </p>
                                            <p className="mb-2">
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
                            </div>
                        ))}
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

export default BuscarPedido;

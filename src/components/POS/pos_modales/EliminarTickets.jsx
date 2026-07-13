import React, { useState } from "react";
import { collection, query, getDocs, doc, where, orderBy, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from 'sweetalert2';
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";
import { ESTADOS } from "../../../Utils/Constantes";
import { getResumenOperation } from "../pos_hooks/useResumenDiario";
import { quitarAcentos } from "../../../Utils/TablaGenerica";
import { getRangoJornada } from "../../../Utils/fechaComercial";

const CAMPOS_BUSQUEDA = ["telefono", "codigo", "direccion"];

const EliminarTickets = ({ isOpen, onClose }) => {
    const [pedidos, setPedidos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState("");
    const { userData } = useAuth();

    // Función para buscar, entre los pedidos de hoy, por teléfono, código o dirección
    const buscarPedidos = async () => {
        setIsLoading(true);
        setErrorBusqueda("");
        setPedidos([]);

        try {
            const { inicio, fin } = getRangoJornada();
            const pedidosCollection = collection(db, "pedidos");
            const q = query(pedidosCollection,
                where("timestamp", ">=", inicio),
                where("timestamp", "<=", fin),
                orderBy("timestamp", "desc")
            );

            const querySnapshot = await getDocs(q);
            const termino = quitarAcentos(busqueda.trim());

            const pedidosEncontrados = querySnapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(p => p.estado !== ESTADOS.ELIMINADO)
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

    // Función para eliminar pedido (cambiar estado a ELIMINADO)
    const eliminarPedido = async (pedido) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se marcará el pedido ${pedido.codigo} como ELIMINADO`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const pedidoRef = doc(db, "pedidos", pedido.id);
                const updateData = {
                    estado: ESTADOS.ELIMINADO,
                    cajeroEliminaID: userData.id,
                    cajeroElimina: userData.nombreCompleto,
                    cajeroEliminaTimestamp: serverTimestamp(),
                };

                if (pedido.cajeroID) {
                    const { ref: resumenRef, stats } = getResumenOperation({
                        metodoPago: pedido.metodoPago,
                        total: pedido.total,
                        montoEfectivo: pedido.montoEfectivo,
                        descontar: true,
                    });
                    const batch = writeBatch(db);
                    batch.update(pedidoRef, updateData);
                    batch.set(resumenRef, stats, { merge: true });
                    await batch.commit();
                } else {
                    const batch = writeBatch(db);
                    batch.update(pedidoRef, updateData);
                    await batch.commit();
                }

                // Actualizar el pedido local
                setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, estado: ESTADOS.ELIMINADO } : p));

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
                            placeholder="Teléfono, código o dirección..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && busqueda.trim().length >= 3) {
                                    buscarPedidos();
                                }
                            }}
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
                        <p className="mt-3">Buscando pedido...</p>
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
                                        <strong>Pedido #{pedido.codigo}</strong>
                                    </h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <small className="text-body-secondary">
                                            {moment(pedido.timestamp?.toDate()).format("DD/MM/YYYY HH:mm")}
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
                                                        onClick={() => eliminarPedido(pedido)}
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

export default EliminarTickets;

import React, { useState, useRef } from "react";
import { query, getDocs, where, orderBy, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, colSucursal, docSucursal } from "../../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import { useAuth } from "../../../context/AuthContext";
import { ESTADOS, ENVIOS_LOCALES } from "../../../Utils/Constantes";
import { getResumenOperation } from "../pos_hooks/useResumenDiario";
import { quitarAcentos } from "../../../Utils/TablaGenerica";
import { getRangoJornada } from "../../../Utils/fechaComercial";
import { useAccionUnica } from "../../../Utils/useAccionUnica";
import { fmtPesos } from "../../../Utils/formato";

const CAMPOS_BUSQUEDA = ["telefono", "codigo", "direccion"];

// Un código de ticket es "42-JD": el secuencial de la sucursal y las iniciales
// del cajero. El contador nunca se reinicia, así que el código es único.
const ES_CODIGO = /^\d+-\w+$/;

const BuscarPedido = ({ isOpen, onClose }) => {
    const [pedidos, setPedidos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState("");
    // Eliminar descuenta del arqueo; `isLoading` es del buscador y no cubre esto.
    const { procesando: eliminando, ejecutar } = useAccionUnica();
    const { userData } = useAuth();
    // Eliminar un ticket descuenta del arqueo, y la regla del negocio es que lo
    // hace UNA sola persona por sucursal: el encargado, al fiscalizar el cierre.
    // Estaba abierto a cualquier cajero solo porque el modal vive dentro de Caja.
    const puedeEliminar = userData?.rol === process.env.REACT_APP_encargado;

    // La jornada se trae UNA vez por apertura del modal y las búsquedas siguientes
    // filtran sobre eso. Antes cada búsqueda releía la jornada entera: con ~130
    // pedidos por noche y 15-20 búsquedas, era el mayor costo recurrente de la
    // Caja. Cerrar y reabrir F3 vuelve a traer, así que un pedido recién cobrado
    // aparece.
    const jornadaEnMemoria = useRef(null);

    const traerJornada = async () => {
        if (jornadaEnMemoria.current) return jornadaEnMemoria.current;

        const { inicio, fin } = getRangoJornada();
        const q = query(
            colSucursal("pedidos"),
            where("timestamp", ">=", inicio),
            where("timestamp", "<=", fin),
            orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        jornadaEnMemoria.current = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return jornadaEnMemoria.current;
    };

    // Busca por teléfono, código o dirección dentro de la jornada. No filtra por
    // estado: el cajero tiene que poder ver el ticket en cualquier instancia
    // —incluso ya eliminado— y eliminarlo desde acá sin abrir otro modal.
    const buscarPedidos = async () => {
        setIsLoading(true);
        setErrorBusqueda("");
        setPedidos([]);

        try {
            const termino = busqueda.trim();
            let candidatos;

            if (ES_CODIGO.test(termino)) {
                // Consulta directa: 1 lectura en vez del barrido de la jornada.
                // Como no lleva el filtro de fecha, se acota acá: F3 es la
                // herramienta del cajero, que trabaja el día. Un ticket de otra
                // jornada lo gestionan encargado y admin desde su propia pantalla.
                const snap = await getDocs(query(colSucursal("pedidos"), where("codigo", "==", termino)));
                const { inicio, fin } = getRangoJornada();
                candidatos = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(p => {
                        const t = p.timestamp?.toDate?.();
                        return t && t >= inicio && t <= fin;
                    });
            } else {
                candidatos = await traerJornada();
            }

            const normalizado = quitarAcentos(termino);
            const pedidosEncontrados = candidatos.filter(
                p => CAMPOS_BUSQUEDA.some(campo => quitarAcentos(String(p[campo] ?? "")).includes(normalizado))
            );

            if (pedidosEncontrados.length === 0) {
                setErrorBusqueda("No se encontraron pedidos en la jornada de hoy.");
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
    const eliminarPedido = (pedido) => ejecutar(async () => {
        // El botón ya no se muestra a un cajero, pero la función es lo que
        // realmente escribe: sin esto alcanza con llamarla desde la consola.
        if (!puedeEliminar) return;

        try {
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
                const pedidoRef = docSucursal("pedidos", pedido.id);
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
                        envio: pedido.envio,
                        carrito: pedido.carrito,
                        descontar: true,
                        timestampPedido: pedido.timestamp,
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

                // Actualizar el pedido local, y también la jornada cacheada: si no,
                // la siguiente búsqueda dentro del mismo modal lo mostraría otra
                // vez con su estado anterior y volvería a ofrecer Eliminar.
                setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, estado: ESTADOS.ELIMINADO } : p));
                if (jornadaEnMemoria.current) {
                    jornadaEnMemoria.current = jornadaEnMemoria.current.map(
                        p => p.id === pedido.id ? { ...p, estado: ESTADOS.ELIMINADO } : p
                    );
                }

                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El pedido ha sido marcado como ELIMINADO',
                    icon: 'success',
                    confirmButtonColor: '#198754',
                });
            }
        } catch (error) {
            console.error('Error eliminando pedido:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al eliminar el pedido',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    });

    // Limpiar el estado cuando se cierra el modal
    const handleClose = () => {
        setPedidos([]);
        setBusqueda("");
        setErrorBusqueda("");
        // Se suelta la jornada cacheada: la próxima apertura la vuelve a traer y
        // así aparecen los pedidos cobrados mientras el modal estaba cerrado.
        jornadaEnMemoria.current = null;
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
                                        <strong>Pedido #{pedido.codigo}</strong> - {pedido.nombre}
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
                                                <strong>Teléfono:</strong> {pedido.telefono}
                                            </p>
                                            <p className="mb-2">
                                                <strong>Opción:</strong> {ENVIOS_LOCALES.includes(pedido.envio?.zona_envio) ? pedido.envio.zona_envio : "Delivery"}
                                            </p>
                                            {!ENVIOS_LOCALES.includes(pedido.envio?.zona_envio) && (
                                                <p className="mb-2">
                                                    <strong>Dirección:</strong> {pedido.direccion} {pedido.entreCalles}
                                                </p>
                                            )}
                                            <p className="mb-2">
                                                <strong>Método de pago:</strong> {pedido.metodoPago}
                                            </p>
                                            {pedido.metodoPago === "%" && (
                                                <p className="mb-2">
                                                    <strong>Monto Efectivo:</strong> {fmtPesos(pedido.montoEfectivo)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-6">
                                            <p className="mb-2">
                                                <strong>Estado:</strong>
                                                <span className={`rounded-3 p-1 px-2 mx-2 fw-bold border border-dark ${pedido.estado === ESTADOS.ELIMINADO ? "bg-danger text-white border-danger" : "text-dark"}`}>
                                                    {pedido.estado}
                                                </span>
                                            </p>
                                            <p className="mb-2">
                                                <strong>Envío:</strong> {pedido.envio?.zona_envio} - {fmtPesos(pedido.envio?.costo_envio)}
                                            </p>
                                            <p className="mb-2">
                                                <strong>Total:</strong> {fmtPesos(pedido.total)}
                                            </p>

                                            <div className="mt-3 d-flex flex-column gap-2">
                                                <a
                                                    href={`https://api.whatsapp.com/send?phone=549${pedido.telefono}&text=Hola ${pedido.nombre}. `}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-success btn-sm w-75 fw-bold"
                                                >
                                                    <i className="fa-brands fa-whatsapp fs-5 align-middle me-1"></i> Enviar WhatsApp
                                                </a>

                                                {/* Un CANCELADO que vino de rechazar un MP ya descontó el arqueo:
                                                    eliminarlo lo descontaría por segunda vez. */}
                                                {[ESTADOS.ELIMINADO, ESTADOS.CANCELADO].includes(pedido.estado) ? (
                                                    <div className="alert alert-secondary mb-0 p-2 w-75" role="alert">
                                                        <small className="fw-bold">
                                                            <i className="fa fa-info-circle me-1"></i>
                                                            Ya está {pedido.estado === ESTADOS.ELIMINADO ? "eliminado" : "cancelado"}
                                                        </small>
                                                    </div>
                                                ) : puedeEliminar ? (
                                                    <button
                                                        className="btn btn-danger btn-sm w-75 fw-bold"
                                                        onClick={() => eliminarPedido(pedido)}
                                                        disabled={eliminando}
                                                    >
                                                        <i className="fa fa-trash me-1"></i> Eliminar Pedido
                                                    </button>
                                                ) : (
                                                    <div className="alert alert-light border mb-0 p-2 w-75" role="alert">
                                                        <small className="text-body-secondary">
                                                            <i className="fa fa-lock me-1"></i>
                                                            Solo el encargado elimina tickets
                                                        </small>
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

export default BuscarPedido;

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import '../../style/Main.css';
import TicketImpresion from './TicketImpresion';
import moment from "moment";
import { ESTADOS } from "../../Utils/Constantes";

const PedidosCocinando = ({ onCountChange, onVolverAEspera }) => {
    const { userData } = useAuth();
    const [ticketVisible, setTicketVisible] = useState(false);
    const [pedidoParaImprimir, setPedidoParaImprimir] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [pedidosCocinando, setPedidosCocinando] = useState([]);

    const pedidosCollection = useRef(query(collection(db, "pedidos"),
        where("estado", "==", ESTADOS.COCINA),
        where("cocineroID", "==", userData.id)
    ));

    const actualizarContador = useCallback((cantidad) => {
        onCountChange?.(cantidad);
    }, [onCountChange]);

    const manejarError = useCallback((error) => {
        console.error('Error en listener de Pedidos Cocinando:', error);
        setPedidosCocinando([]);
        actualizarContador(0);
        setIsLoading(false);
    }, [actualizarContador]);

    const getPedidosCocinando = useCallback((snapshot) => {
        const pedidosArray = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
            .sort((a, b) => {
                const numA = parseInt(a.codigo?.split('-')[0], 10) || 0;
                const numB = parseInt(b.codigo?.split('-')[0], 10) || 0;
                return numA - numB;
            });
        setPedidosCocinando(pedidosArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            pedidosCollection.current,
            (snapshot) => {
                getPedidosCocinando(snapshot);
                actualizarContador(snapshot.size);
            },
            manejarError
        );

        return unsubscribe;
    }, [getPedidosCocinando, actualizarContador, manejarError]);

    const imprimirPedido = (pedido) => {
        setPedidoParaImprimir(pedido);
        setTicketVisible(true);
    };

    const marcarTodosComoCocinado = async () => {
        if (pedidosCocinando.length === 0) return;

        const result = await Swal.fire({
            title: '¿Estás seguro de marcar Todos como cocinados?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, marcar como cocinado',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            setProcesando(true);
            const batch = writeBatch(db);

            pedidosCocinando.forEach(pedido => {
                const pedidoRef = doc(db, "pedidos", pedido.id);
                batch.update(pedidoRef, { estado: ESTADOS.DELIVERY });

                if (pedido.solicitudID) {
                    const solicitudRef = doc(db, "solicitudes", pedido.solicitudID);
                    batch.update(solicitudRef, { estado: ESTADOS.DELIVERY });
                }
            });

            await batch.commit();

            Swal.fire({
                title: '¡Éxito!',
                icon: 'success',
                confirmButtonColor: '#198754',
            });

            // Actualizar contador a 0 y volver a la tab de espera
            if (onCountChange) {
                onCountChange(0);
            }

            if (onVolverAEspera) {
                onVolverAEspera();
            }

        } catch (error) {
            console.error("Error al marcar como cocinado:", error);
            Swal.fire({
                title: 'Error',
                text: 'Error al marcar pedidos como cocinado',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        } finally {
            setProcesando(false);
        }
    };

    const cerrarTicket = () => {
        setTicketVisible(false);
        setPedidoParaImprimir(null);
    };

    return (
        <>
            {ticketVisible && (
                <TicketImpresion
                    pedido={pedidoParaImprimir}
                    onClose={cerrarTicket}
                />
            )}
            <section className="card p-3" id="cocinando">
                {isLoading ? (
                    <div className="text-center">
                        <span className="loader"></span>
                    </div>
                ) : (
                    <>
                        <div className="d-flex justify-content-end align-items-center mb-3">

                            <div className="d-flex gap-2">
                                {<button
                                    className="btn btn-outline-primary"
                                    //onClick={imprimirTodos}
                                    disabled={pedidosCocinando.length === 0}
                                >
                                    Imprimir Todos
                                </button>}
                                <button
                                    className="btn btn-success"
                                    onClick={marcarTodosComoCocinado}
                                    disabled={pedidosCocinando.length === 0 || procesando}
                                >
                                    {procesando ? "Cargando..." : "Cocinados TODOS"}
                                </button>
                            </div>
                        </div>

                        <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
                            {pedidosCocinando.map(pedido => (
                                <div className="col" key={pedido.id}>
                                    <div className="card border border-warning">
                                        <div className="card-header bg-warning bg-opacity-25">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>{moment(pedido.timestamp.toDate()).format("HH:mm")}</strong>
                                                <span className="badge bg-dark">{pedido.codigo}</span>
                                            </div>
                                            <h6 className="mb-0">{pedido.nombre}</h6>
                                        </div>

                                        <div className="card-body d-flex flex-column">
                                            <div>
                                                {pedido.carrito.map((item, i) => (
                                                    <div key={i} className="d-flex justify-content-between small mt-2">
                                                        <span>{item.cantidad}x {item.descripcion}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <button
                                                className="btn btn-outline-primary btn-sm w-100"
                                                onClick={() => imprimirPedido(pedido)}
                                            >
                                                Imprimir Individual
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pedidosCocinando.length === 0 && (
                            <div className="text-center mt-5">
                                <div className="alert alert-warning">No hay pedidos en cocina</div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </>
    );
};

export default PedidosCocinando;
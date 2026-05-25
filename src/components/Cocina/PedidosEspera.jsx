import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, where, query, onSnapshot, orderBy, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import '../../style/Main.css';
import { CANTIDAD_CARNES, ESTADOS } from "../../Utils/Constantes";
import moment from "moment";

const PedidosEspera = ({ onMandarACocinar, onCountChange }) => {
    const { userData } = useAuth();
    const [selectedPedidos, setSelectedPedidos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [pedidosEspera, setPedidosEspera] = useState([]);

    const pedidosCollection = useRef(query(collection(db, "pedidos"),
        where("estado", "==", ESTADOS.CONFIRMADO),
        orderBy("timestamp", "asc")
    ));

    const actualizarContador = useCallback((cantidad) => {
        onCountChange?.(cantidad);
    }, [onCountChange]);

    const manejarError = useCallback((error) => {
        console.error('Error en listener de Pedidos Espera:', error);
        setPedidosEspera([]);
        actualizarContador(0);
        setIsLoading(false);
    }, [actualizarContador]);

    const getPedidosEspera = useCallback((snapshot) => {
        const pedidosEsperaArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        setPedidosEspera(pedidosEsperaArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            pedidosCollection.current,
            (snapshot) => {
                getPedidosEspera(snapshot);
                actualizarContador(snapshot.size);
            },
            manejarError
        );

        return unsubscribe;
    }, [getPedidosEspera, actualizarContador, manejarError]);

    const calcularCarnes = (pedidosIds) => {
        return pedidosEspera
            .filter(p => pedidosIds.includes(p.id))
            .flatMap(p => p.carrito)
            .reduce((total, { categoria, descripcion, cantidad = 1 }) => {

                const clave =
                    categoria === "EXTRA"
                        ? descripcion
                        : categoria;

                const factor = CANTIDAD_CARNES[clave] || 0;

                return total + factor * cantidad;

            }, 0);
    };

    const togglePedidoSelection = (pedidoId) => {
        setSelectedPedidos(prev =>
            prev.includes(pedidoId)
                ? prev.filter(id => id !== pedidoId)
                : [...prev, pedidoId]
        );
    };

    const mandarACocinar = async () => {
        if (selectedPedidos.length === 0) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay pedidos seleccionados',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        try {
            setProcesando(true);
            const batch = writeBatch(db);

            selectedPedidos.forEach(pedidoId => {
                const pedidoRef = doc(db, "pedidos", pedidoId);
                batch.update(pedidoRef, {
                    estado: ESTADOS.COCINA,
                    cocineroID: userData.id,
                    cocinero: userData.nombreCompleto,
                    cocineroTimestamp: serverTimestamp(),
                });
            });

            await batch.commit();

            Swal.fire({
                title: '¡Éxito!',
                text: `${selectedPedidos.length} pedido(s) enviado(s) a cocina`,
                icon: 'success',
                confirmButtonColor: '#198754',
            });

            setSelectedPedidos([]);
            onMandarACocinar();
        } catch (error) {
            console.error('Error al mandar pedidos a cocina:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al enviar pedidos a cocina',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        } finally {
            setProcesando(false);
        }
    };

    const carnesSeleccionadas = calcularCarnes(selectedPedidos);

    return (
        <section className="card p-3" id="pedidosEspera">
            {isLoading ? (
                <div className="text-center">
                    <span className="loader"></span>
                </div>
            ) : (
                <>
                    <div className="d-flex justify-content-end align-items-center mb-1 ">
                        {carnesSeleccionadas > 0 ? (
                            <span className="bg-danger text-white p-2 fs-6 rounded-3 fw-bold mx-2">
                                Carnes Seleccionadas: {carnesSeleccionadas}
                            </span>
                        ) : (null)}
                        <button
                            className="btn btn-success"
                            onClick={mandarACocinar}
                            disabled={selectedPedidos.length === 0 || procesando}
                        >
                            {procesando ? "Cargando..." : "Empezar a Cocinar"}
                        </button>
                    </div>

                    <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
                        {pedidosEspera.map((pedido) => {
                            const productosVisibles = pedido.carrito.slice(0, 6);
                            const hayMasProductos = pedido.carrito.length > 6;

                            return (
                                <div className="col" key={pedido.id}>
                                    <div
                                        className={`card h-100 border ${selectedPedidos.includes(pedido.id)
                                            ? 'border-danger bg-danger bg-opacity-10'
                                            : 'border-secondary'}`}
                                        onClick={() => togglePedidoSelection(pedido.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="card-body p-2 d-flex flex-column">
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <span className="badge bg-dark fs-5 m-0">{pedido.codigo}</span>
                                                <small className="text-body-secondary">{moment(pedido.timestamp?.toDate()).format("DD/MM/YYYY HH:mm")}</small>
                                            </div>
                                            <h6 className="mb-2 text-truncate">{pedido.nombre}</h6>
                                            <div className="small d-flex flex-column gap-1 text-start">
                                                {productosVisibles.map((item, i) => (
                                                    <div key={i} className={item.categoria === 'EXTRA' ? 'ps-3 text-muted' : ''}>
                                                        {item.cantidad}x {item.descripcion}
                                                    </div>
                                                ))}
                                            </div>
                                            {hayMasProductos && (
                                                <div className="text-muted small fst-italic mt-1">Mas...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {pedidosEspera.length === 0 && (
                        <div className="text-center mt-5">
                            <div className="alert alert-info">No hay pedidos en espera</div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};
export default PedidosEspera;
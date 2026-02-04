import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, where, query, onSnapshot, orderBy, doc, writeBatch } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import '../../style/Main.css';

const PedidosEspera = ({ onMandarACocinar, cocineroUid, onCountChange }) => {
    const [selectedPedidos, setSelectedPedidos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pedidos, setPedidos] = useState([]);

    const pedidosCollectiona = collection(db, "pedidos");
    const pedidosCollection = useRef(query(
        pedidosCollectiona,
        where("estado", "==", "PENDIENTE"),
        orderBy("timestamp", "asc")
    ));

    const notificarContador = useCallback((cantidad) => {
        if (onCountChange) {
            onCountChange(cantidad);
        }
    }, [onCountChange]);

    const getPedidos = useCallback((snapshot) => {
        const pedidosArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        setPedidos(pedidosArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribePedidosEspera = onSnapshot(pedidosCollection.current, (snapshot) => { getPedidos(snapshot); notificarContador(snapshot.size) });

        return () => { unsubscribePedidosEspera() };
    }, [getPedidos, notificarContador]);

    const calcularCarnes = (pedidosIds) => {
        const pedidosSeleccionados = pedidos.filter(p => pedidosIds.includes(p.id));
        const todosLosItems = pedidosSeleccionados.flatMap(pedido => pedido.carrito);

        return todosLosItems.reduce((total, item) => {
            if (!item.categoria) return total;
            const factor = item.categoria === 'TRIPLE' ? 3 :
                item.categoria === 'DOBLE' ? 2 :
                    item.categoria === 'SIMPLE' ? 1 : 0;
            return total + factor;
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
        if (selectedPedidos.length === 0 || !cocineroUid) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay pedidos seleccionados',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        try {
            const batch = writeBatch(db);

            selectedPedidos.forEach(pedidoId => {
                const pedidoRef = doc(db, "pedidos", pedidoId);
                batch.update(pedidoRef, {
                    estado: "COCINA",
                    cocinero: cocineroUid
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
        }
    };

    const carnesSeleccionadas = calcularCarnes(selectedPedidos);

    return (
        <section className="card p-3" id="pedidos">
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
                            disabled={selectedPedidos.length === 0 || !cocineroUid}
                        >
                            Empezar a Cocinar
                        </button>
                    </div>

                    <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
                        {pedidos.map(pedido => (
                            <div className="col" key={pedido.id}>
                                <div
                                    className={`card border ${selectedPedidos.includes(pedido.id)
                                        ? 'border-danger bg-danger bg-opacity-10'
                                        : 'border-secondary'}`}
                                    onClick={() => togglePedidoSelection(pedido.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="card-body p-2 d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <span className="badge bg-dark">N° {pedido.codigo}</span>
                                            <small className="text-muted">{pedido.fecha} - {pedido.hora}</small>
                                        </div>
                                        <h6 className="mb-2 text-truncate">{pedido.nombre}</h6>
                                        <div className="m-auto">
                                            {pedido.carrito.map((item, i) => (
                                                <div key={i} className="d-flex justify-content-between small">
                                                    <span>{item.cantidad}x {item.descripcion}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pedidos.length === 0 && (
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
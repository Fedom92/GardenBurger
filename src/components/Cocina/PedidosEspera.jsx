import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { where, query, onSnapshot, orderBy, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import '../../style/Main.css';
import { CANTIDAD_CARNES, ESTADOS, TIEMPO_MIN_PEDIDOESP } from "../../Utils/Constantes";
import { ahoraServidor } from "../../Utils/fechaComercial";
import { getItemsCocina } from "./cocina_hooks/useItemsCocina";
import ModalHorariosEspeciales from "./ModalHorariosEspeciales";
import moment from "moment";

const PedidosEspera = ({ onMandarACocinar, onCountChange }) => {
    const { userData } = useAuth();
    const [selectedPedidos, setSelectedPedidos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [pedidosEspera, setPedidosEspera] = useState([]);
    const [pedidosAdelantados, setPedidosAdelantados] = useState([]);

    const pedidosCollection = useRef(query(colSucursal("pedidos"),
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

    // El pedido con hora especial guarda esa hora en timestamp (asi lo arma la Caja),
    // asi que el timestamp ES la hora a la que tiene que estar listo. La comparacion sale
    // de ahoraServidor() y no de new Date(): en el local hay PCs con el reloj corrido.
    const minutosParaLaHora = (pedido) =>
        moment(pedido.timestamp?.toDate()).diff(ahoraServidor(), "minutes");

    const esAdelantado = (pedido) =>
        pedido.esHorarioEspecial && minutosParaLaHora(pedido) > TIEMPO_MIN_PEDIDOESP;

    const togglePedidoSelection = (pedidoId) => {
        setSelectedPedidos(prev =>
            prev.includes(pedidoId)
                ? prev.filter(id => id !== pedidoId)
                : [...prev, pedidoId]
        );
    };

    const cocinar = async (pedidosIds) => {
        try {
            setProcesando(true);
            const batch = writeBatch(db);

            pedidosIds.forEach(pedidoId => {
                const pedidoRef = docSucursal("pedidos", pedidoId);
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
                text: `${pedidosIds.length} pedido(s) enviado(s) a cocina`,
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

    const mandarACocinar = () => {
        if (selectedPedidos.length === 0) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay pedidos seleccionados',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        const adelantados = pedidosEspera.filter(p => selectedPedidos.includes(p.id) && esAdelantado(p));

        if (adelantados.length > 0) {
            setPedidosAdelantados(adelantados);
            return;
        }

        cocinar(selectedPedidos);
    };

    // Los adelantados que el cocinero no marco se quedan afuera del batch: no se les
    // toca el estado, asi que siguen apareciendo en esta misma solapa.
    const confirmarAdelantados = (idsMarcados) => {
        const idsAdelantados = pedidosAdelantados.map(p => p.id);
        const aCocinar = [
            ...selectedPedidos.filter(id => !idsAdelantados.includes(id)),
            ...idsMarcados,
        ];

        setPedidosAdelantados([]);
        cocinar(aCocinar);
    };

    const carnesSeleccionadas = calcularCarnes(selectedPedidos);

    return (
        <>
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
                                const itemsCocina = getItemsCocina(pedido.carrito);
                                const productosVisibles = itemsCocina.slice(0, 6);
                                const hayMasProductos = itemsCocina.length > 6;

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
                                                    <small className={pedido.esHorarioEspecial ? "text-danger fw-bold" : "text-body-secondary"}>
                                                        {moment(pedido.timestamp?.toDate()).format("HH:mm")}
                                                        {pedido.esHorarioEspecial && (
                                                            <span className="badge bg-warning text-dark ms-1">⏰</span>
                                                        )}
                                                    </small>
                                                </div>
                                                <h6 className="mb-2 text-truncate">{pedido.nombre}</h6>
                                                <div className="small d-flex flex-column gap-1 text-start">
                                                    {productosVisibles.map((item, i) => (
                                                        <div key={i} className={item.categoria === 'EXTRA' ? 'ps-3 text-muted' : ''}>
                                                            {item.cantidad}x {item.descripcion}
                                                        </div>
                                                    ))}
                                                </div>
                                                {itemsCocina.length === 0 && (
                                                    <div className="text-muted small fst-italic">Sin items de cocina</div>
                                                )}
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

            {pedidosAdelantados.length > 0 && (
                <ModalHorariosEspeciales
                    pedidos={pedidosAdelantados}
                    otrosSeleccionados={selectedPedidos.length - pedidosAdelantados.length}
                    minutosParaLaHora={minutosParaLaHora}
                    onConfirmar={confirmarAdelantados}
                    onClose={() => setPedidosAdelantados([])}
                />
            )}
        </>
    );
};
export default PedidosEspera;
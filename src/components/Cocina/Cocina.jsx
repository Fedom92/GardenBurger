

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, where, query, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import PedidosEspera from "./PedidosEspera";
import PedidosCocinando from "./PedidosCocinando";
import '../../style/Main.css';


const Cocina = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState([]);
    const [selectedPedidos, setSelectedPedidos] = useState([]);
    const [showPedidosEspera, setShowPedidosEspera] = useState(false);
    const [showCocinando, setShowCocinando] = useState(false);
    const [viewMode, setViewMode] = useState('espera');

    const toggleView = () => {
        setViewMode(prev => prev === 'espera' ? 'cocinando' : 'espera');
    };

    const pedidosCollectiona = collection(db, "pedidos");
    const pedidosCollection = useRef(query(pedidosCollectiona, where("estado", "==", "PENDIENTE")));

    const getPedidos = useCallback((snapshot) => {
        const pedidosArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));
        setPedidos(pedidosArray);

        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pedidosSnapshot = await getDocs(pedidosCollection.current);
                await getPedidos(pedidosSnapshot);

            } catch (error) {
                console.error('Error fetching data Cocina:', error);
            }
        };

        fetchData();

    }, [getPedidos]);

    // Filtrar pedidos según búsqueda
    const filteredPedidos = pedidos.filter(pedido =>
        pedido.codigo.toLowerCase().includes(search.toLowerCase()) ||
        pedido.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const carnesSeleccionadas = useMemo(() => {
        return selectedPedidos.reduce((total, pedidoId) => {
            const pedido = pedidos.find(p => p.id === pedidoId);
            if (!pedido) return total;
            return total + pedido.carrito.reduce((sum, item) => {
                if (!item.categoria) return sum;
                const factor = item.categoria === 'TRIPLE' ? 3 :
                    item.categoria === 'DOBLE' ? 2 :
                        item.categoria === 'SIMPLE' ? 1 : 0;
                return sum + factor;
            }, 0);
        }, 0);
    }, [selectedPedidos, pedidos]);

    /*
    PONER EN LA CAJA DEFINIR HORARIO ESPECIAL
    (vER TEMA HORARIOS DESPLEGABLES)
    ORDENAR LA COCINA PENDIENTES POR HORARIO
    
    EN PANTALLA 15 PEDIDOS

    EL IMPRIMIR TODOS SE HACE INTERNAMENTE AL PASAR A COCINA


    
    */

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="search-bar d-flex col-3 m-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar Pedido..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100 p-1 mt-4">
                        <div className="row">
                            <div className="col">
                                <br></br>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex justify-content-start">
                                        <h3>Pantalla Cocina</h3>
                                    </div>

                                    <div className="col d-flex justify-content-end">
                                        <div className="d-flex justify-content-between bg-light p-2 rounded">
                                            <span className="badge position-sticky bg-primary fs-5 me-3">Pedidos pendientes: {filteredPedidos.length}</span>
                                            <span className="badge position-sticky bg-danger fs-5">Carnes Seleccionadas: {carnesSeleccionadas}</span>
                                        </div>
                                    </div>
                                </div>

                                {viewMode === 'espera' && (
                                    <PedidosEspera
                                        pedidos={pedidos}
                                        search={search}
                                        selectedPedidos={selectedPedidos}
                                        setSelectedPedidos={setSelectedPedidos}
                                        onMandarACocinar={() => setViewMode('cocinando')}
                                    />
                                )}

                                {viewMode === 'cocinando' && (
                                    <PedidosCocinando
                                        selectedPedidos={selectedPedidos}
                                        pedidos={pedidos}
                                        onVolver={() => setViewMode('espera')}
                                    />
                                )}

                            </div>
                        </div>
                    </div>
                </div>

            )}
        </>
    );
}
export default Cocina;
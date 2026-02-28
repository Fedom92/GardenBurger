
import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, doc, query, getDocs, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import '../../style/Main.css';
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";

const Deliverys = () => {
    const [pedidos, setPedidos] = useState([]);
    const [deliverys, setDeliverys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [metricasDelivery, setMetricasDelivery] = useState({});
    const [showMetricas, setShowMetricas] = useState(false);

    const pedidosCollectiona = collection(db, "pedidos");
    const pedidosCollection = useRef(query(pedidosCollectiona, where("estado", "==", "DELIVERY")));

    const deliverysCollectiona = collection(db, "deliverys");
    const deliverysCollection = useRef(query(deliverysCollectiona, where("activo", "==", true)));

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

    const getDeliverys = useCallback((snapshot) => {
        const deliverysArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDeliverys(deliverysArray);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pedidosSnapshot = await getDocs(pedidosCollection.current);
                await getPedidos(pedidosSnapshot);

                const deliverysSnapshot = await getDocs(deliverysCollection.current);
                await getDeliverys(deliverysSnapshot);

            } catch (error) {
                console.error('Error fetching data Delivery:', error);
            }
        };

        fetchData();
    }, [getPedidos, getDeliverys]);


    // Calcular métricas por delivery
    useEffect(() => {
        const metricas = {};
        deliverys.forEach(delivery => {
            const pedidosDelivery = pedidos.filter(pedido => pedido.deliveryAsignado === delivery.nombre);
            const totalEfectivo = pedidosDelivery
                .filter(p => p.metodoPago === "EFECTIVO")
                .reduce((sum, p) => sum + p.total, 0);
            const totalEnvios = pedidosDelivery
                .reduce((sum, p) => sum + (p.envio?.costo_envio || 0), 0);

            metricas[delivery.id] = {
                nombre: delivery.nombre,
                totalEfectivo,
                totalEnvios,
                cantidadPedidos: pedidosDelivery.length
            };
        });
        setMetricasDelivery(metricas);
    }, [pedidos, deliverys]);

    const asignarDelivery = async (pedidoId, deliveryId) => {
        try {
            const pedidoDoc = doc(db, 'pedidos', pedidoId);
            const deliverySel = deliverys.find(d => d.id === deliveryId) || "";
            await updateDoc(pedidoDoc, { deliveryAsignado: deliverySel ? deliverySel.nombre : "" });

            setPedidos(prevPedidos =>
                prevPedidos.map(pedido =>
                    pedido.id === pedidoId
                        ? { ...pedido, deliveryAsignado: deliverySel ? deliverySel.nombre : "" }
                        : pedido
                )
            );
        } catch (error) {
            console.error('Error asignando delivery:', error);
            Swal.fire('Error', 'No se pudo asignar el delivery', 'error');
        }
    };

    const marcarEstado = async (pedidoId, nuevoEstado) => {
        try {
            const pedidoDoc = doc(db, 'pedidos', pedidoId);
            await updateDoc(pedidoDoc, { estadoDelivery: nuevoEstado });

            setPedidos(prevPedidos =>
                prevPedidos.map(pedido => pedido.id === pedidoId ? { ...pedido, estadoDelivery: nuevoEstado } : pedido)
            );
        } catch (error) {
            console.error('Error actualizando estado:', error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };


    const columnasPedidos = [
        { columnasBasicas: ["codigo", "direccion", "hora", "total"] },
        {
            accessorKey: "envio.zona_envio",
            header: "Zona Envío",
        },
        {
            accessorKey: "envio.costo_envio",
            header: "Costo Envío",
        },

        {
            accessorKey: "metodoPago",
            header: "Paga Con",
        },
        {
            accessorKey: "deliveryAsignado",
            header: "Delivery Asignado",
            cell: ({ getValue, row }) => {
                const nombreAsignado = getValue();
                const selectedId = deliverys.find(d => d.nombre === nombreAsignado)?.id || "";
                return (
                    <select
                        className="form-select form-select-sm"
                        value={selectedId}
                        onChange={(e) => asignarDelivery(row.original.id, e.target.value)}
                    >
                        <option value="">Sin asignar</option>
                        {deliverys.map(delivery => (
                            <option key={delivery.id} value={delivery.id}>
                                {delivery.nombre}
                            </option>
                        ))}
                    </select>
                );
            },
        },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const pedido = row.original;
                const estadoDelivery = pedido.estadoDelivery || "PENDIENTE";
                const tieneAsignado = Boolean(pedido.deliveryAsignado);

                return (
                    <>
                        <button
                            className={`btn mx-1 ${estadoDelivery === "SALIO" ? "btn-warning" : "btn-outline-warning"}`}
                            title="MARCAR COMO SALIDA"
                            onClick={() => marcarEstado(pedido.id, "SALIO")}
                            disabled={!tieneAsignado}
                        >
                            <i className="fa-solid fa-motorcycle"></i>
                        </button>
                        <button
                            className={`btn mx-1 ${estadoDelivery === "VOLVIO" ? "btn-success" : "btn-outline-success"}`}
                            title="MARCAR COMO VUELTA"
                            onClick={() => marcarEstado(pedido.id, "VOLVIO")}
                            disabled={!tieneAsignado}
                        >
                            <i className="fa-solid fa-check"></i>
                        </button>
                    </>
                );
            },
        },
    ];

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="container mw-100">
                        <div className="row">
                            <div className="col">
                                <br></br>
                                <div className="d-flex justify-content-between mt-3">
                                    <div
                                        className="d-flex justify-content-start align-items-center"
                                        style={{ maxHeight: "40px", marginLeft: "10px" }}
                                    >
                                        <h1>Delivery</h1>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowMetricas(true)}
                                        >
                                            Ver métricas
                                        </button>
                                    </div>
                                </div>


                                <TablaGenerica
                                    data={pedidos}
                                    columnas={columnasPedidos}
                                    sortBy="codigo"
                                    ordenDescendente={false}
                                    camposBusqueda={["codigo", "direccion", "nombre"]}
                                    camposFiltros={["deliveryAsignado"]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Métricas */}
            {showMetricas && (
                <div className="modal show" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Métricas de Deliverys</h5>
                                <button type="button" className="btn-close" onClick={() => setShowMetricas(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Delivery</th>
                                                <th className="text-end">Pedidos</th>
                                                <th className="text-end">Efectivo</th>
                                                <th className="text-end">Envíos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.values(metricasDelivery)
                                                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                                .map((m, idx) => (
                                                    <tr key={idx}>
                                                        <td>{m.nombre}</td>
                                                        <td className="text-end">{m.cantidadPedidos}</td>
                                                        <td className="text-end">${m.totalEfectivo}</td>
                                                        <td className="text-end">${m.totalEnvios}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowMetricas(false)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default Deliverys;
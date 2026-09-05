import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, query, getDocs, where, orderBy, serverTimestamp, onSnapshot, getDoc, increment } from "firebase/firestore";
import { db, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { getFechaComercial } from "../../Utils/fechaComercial";
import '../../style/Main.css';
import TablaGenerica from "../../Utils/TablaGenerica";
import ModalPedidoDelivery from "./delivery_modales/ModalPedidoDelivery";
import ModalMetricasDelivery from "./delivery_modales/ModalMetricasDelivery";
import Swal from "sweetalert2";
import moment from "moment";
import { ESTADOS, SUBESTADOS_MOTODELIVERY } from "../../Utils/Constantes";
import { useAuth } from "../../context/AuthContext";

const JefeDeliverys = () => {
    const { userData } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [deliverys, setDeliverys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMetricas, setShowMetricas] = useState(false);
    const [metricasData, setMetricasData] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const pedidosCollection = useRef(query(
        colSucursal("pedidos"),
        where("estado", "==", ESTADOS.DELIVERY),
        orderBy("timestamp", "asc")
    ));
    // Los repartidores viven en `usuarios` como cualquier otro empleado, con
    // rol delivery y sin cuenta de Auth. El alta la hace el admin desde el
    // PanelAdmin: acá solo se los lista para asignarlos a un pedido.
    const deliverysCollection = useRef(query(
        collection(db, "usuarios"),
        where("sucursal", "==", userData.sucursal),
        where("rol", "==", process.env.REACT_APP_delivery),
        where("activo", "==", true)
    ));

    const getDeliverys = useCallback((snapshot) => {
        const deliverysArray = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDeliverys(deliverysArray);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onSnapshot(pedidosCollection.current, (snap) => {
            setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error('Error listener deliverys:', error);
            setIsLoading(false);
        });

        getDocs(deliverysCollection.current).then(snap => getDeliverys(snap));

        return () => unsubscribe();
    }, [getDeliverys]);

    const asignarDelivery = async (pedidoId, deliveryId) => {
        try {
            const pedidoDoc = docSucursal("pedidos", pedidoId);
            const deliverySel = deliverys.find(d => d.id === deliveryId);
            const updates = deliverySel
                ? {
                    deliveryAsignado: deliverySel.nombre,
                    deliveryID: deliverySel.id,
                    gestorDelivery: userData.nombreCompleto,
                    gestorDeliveryID: userData.id,
                    gestorDeliveryTimestamp: serverTimestamp(),
                }
                : {
                    deliveryAsignado: "",
                    deliveryID: "",
                    gestorDelivery: "",
                    gestorDeliveryID: "",
                    gestorDeliveryTimestamp: null,
                };
            await updateDoc(pedidoDoc, updates);
            // onSnapshot actualiza pedidos; actualizamos el modal para reflejar el cambio inmediatamente
            setPedidoSeleccionado(prev => prev?.id === pedidoId ? { ...prev, ...updates } : prev);
        } catch (error) {
            console.error('Error asignando delivery:', error);
            Swal.fire('Error', 'No se pudo asignar el delivery', 'error');
        }
    };

    // pagoMonto viene del modal cuando el repartidor vuelve
    const marcarEstado = async (pedidoId, nuevoEstado, pagoMonto = "") => {
        try {
            const pedido = pedidos.find(p => p.id === pedidoId);
            if (!pedido) return;

            const pedidoDoc = docSucursal("pedidos", pedidoId);
            const updates = { estadoDelivery: nuevoEstado };

            if (nuevoEstado === SUBESTADOS_MOTODELIVERY.SALIDA) {
                updates.deliverySalidaTimestamp = serverTimestamp();
                await updateDoc(pedidoDoc, updates);
                Swal.fire({ title: '¡Listo!', text: 'Repartidor en camino.', icon: 'success', timer: 1500, showConfirmButton: false });

            } else if (nuevoEstado === SUBESTADOS_MOTODELIVERY.FIN) {
                updates.estado = ESTADOS.FINAL;
                updates.deliveryFinTimestamp = serverTimestamp();
                const monto = Number(pagoMonto);
                if (!isNaN(monto) && monto > 0) {
                    updates.pagoRepartidorCon = monto;
                }

                await updateDoc(pedidoDoc, updates);

                // Persistir métricas en resumenDiario (no-blocking, secundario al pedido)
                if (pedido.deliveryID) {
                    try {
                        const hoy = getFechaComercial();
                        await updateDoc(docSucursal("resumenDiario", hoy), {
                            [`deliverys.${pedido.deliveryID}.nombre`]: pedido.deliveryAsignado,
                            [`deliverys.${pedido.deliveryID}.cantidadPedidos`]: increment(1),
                            [`deliverys.${pedido.deliveryID}.totalMonto`]: increment(pedido.total || 0),
                            [`deliverys.${pedido.deliveryID}.totalCobrado`]: increment(monto > 0 ? monto : 0),
                        });
                    } catch (e) {
                        console.error('Error actualizando métricas delivery:', e);
                    }
                }

                Swal.fire('¡Éxito!', 'Pedido entregado y finalizado.', 'success');
            }

            // onSnapshot remueve/actualiza el pedido automáticamente
            setPedidoSeleccionado(null);
        } catch (error) {
            console.error('Error actualizando estado:', error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };

    const handleVerMetricas = async () => {
        setLoadingMetricas(true);
        try {
            const hoy = getFechaComercial();
            const snap = await getDoc(docSucursal("resumenDiario", hoy));
            setMetricasData(snap.exists() ? (snap.data().deliverys || {}) : {});
        } catch (e) {
            console.error('Error cargando métricas:', e);
            setMetricasData({});
        } finally {
            setLoadingMetricas(false);
            setShowMetricas(true);
        }
    };

    const columnasPedidos = [
        { columnasBasicas: ["codigo", "nombre", "total"] },
        {
            accessorKey: "timestamp",
            header: "Hora",
            cell: ({ getValue }) => moment(getValue()?.toDate()).format("HH:mm"),
        },
        {
            accessorKey: "envio.zona_envio",
            header: "Zona",
        },
        {
            accessorKey: "envio.costo_envio",
            header: "$ Envío",
        },
        {
            accessorKey: "metodoPago",
            header: "Pago",
        },
        {
            accessorKey: "deliveryAsignado",
            header: "Repartidor",
            cell: ({ getValue }) => getValue() || <span className="text-muted fst-italic">Sin asignar</span>,
        },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => (
                <button
                    className="btn btn-sm btn-outline-primary"
                    title="Ver / Gestionar"
                    onClick={() => setPedidoSeleccionado(row.original)}
                >
                    <i className="fa-solid fa-pen-to-square"></i>
                </button>
            ),
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
                                <br />
                                <div className="d-flex justify-content-between mt-3">
                                    <div
                                        className="d-flex justify-content-start align-items-center"
                                        style={{ maxHeight: "40px", marginLeft: "10px" }}
                                    >
                                        <h1>Delivery</h1>
                                        <button
                                        variant="primary"
                                            className="btn-contorno m-1"
                                            onClick={handleVerMetricas}
                                            disabled={loadingMetricas}
                                        >
                                            {loadingMetricas ? "Cargando..." : "Ver métricas"}
                                        </button>
                                    </div>

                                </div>

                                <TablaGenerica
                                    data={pedidos}
                                    columnas={columnasPedidos}
                                    sortBy="codigo"
                                    ordenDescendente={false}
                                    camposBusqueda={["codigo", "direccion", "nombre"]}
                                    camposFiltros={["deliveryAsignado", "metodoPago"]}
                                    rowClassName={(row) =>
                                        row.estadoDelivery === SUBESTADOS_MOTODELIVERY.SALIDA ? 'bg-warning' : ''
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de gestión del pedido — key por id para resetear estado local al cambiar pedido */}
            <ModalPedidoDelivery
                key={pedidoSeleccionado?.id}
                isOpen={Boolean(pedidoSeleccionado)}
                pedido={pedidoSeleccionado}
                deliverys={deliverys}
                onClose={() => setPedidoSeleccionado(null)}
                onAsignarDelivery={asignarDelivery}
                onMarcarEstado={marcarEstado}
            />

            <ModalMetricasDelivery
                isOpen={showMetricas}
                onClose={() => setShowMetricas(false)}
                metricasData={metricasData}
            />
        </>
    );
};

export default JefeDeliverys;

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, updateDoc, query, getDocs, where, orderBy, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { traerPedidosDeJornada, liquidarDeliverys, repartirPago, invalidarFotoDePedido, FIJO_DELIVERY } from "../POS/pos_hooks/useResumenDiario";
import { getFechaComercial, esHoraDeArqueo } from "../../Utils/fechaComercial";
import '../../style/Main.css';
import TablaGenerica from "../../Utils/TablaGenerica";
import ModalPedidoDelivery from "./delivery_modales/ModalPedidoDelivery";
import ModalMetricasDelivery from "./delivery_modales/ModalMetricasDelivery";
import Swal from "sweetalert2";
import moment from "moment";
import { ESTADOS, SUBESTADOS_MOTODELIVERY, METODOS_PAGO, etiquetaPago } from "../../Utils/Constantes";
import { useAuth } from "../../context/AuthContext";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { useHoraDeArqueo } from "../../Utils/useHoraDeArqueo";
import { fmtPesos } from "../../Utils/formato";
import { avisarSinConexion } from "../../Utils/avisos";

const JefeDeliverys = () => {
    const { userData } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [deliverys, setDeliverys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMetricas, setShowMetricas] = useState(false);
    const [liquidacion, setLiquidacion] = useState(null);
    const [jornadaMetricas, setJornadaMetricas] = useState("");
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    // Asignar y marcar estado comparten el guard: son la misma fila y dos clicks
    // rapidos dejarian el pedido a medio camino entre dos estados.
    const { procesando, ejecutar } = useAccionUnica();
    // La liquidacion va aparte: es una lectura, no tiene por que bloquear la gestion.
    const { procesando: cargandoLiquidacion, ejecutar: ejecutarLiquidacion } = useAccionUnica();
    // Solo para el disabled del boton; handleVerMetricas vuelve a preguntar la hora.
    const horaDeArqueo = useHoraDeArqueo();

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

    // Los documentos de `usuarios` traen `nombreCompleto`, no `nombre`: la
    // subcolección vieja `deliverys` usaba `nombre` y quedó la referencia colgada.
    const getDeliverys = useCallback((snapshot) => {
        const deliverysArray = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (a.nombreCompleto || "").localeCompare(b.nombreCompleto || ""));
        setDeliverys(deliverysArray);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onSnapshot(pedidosCollection.current, (snap) => {
            setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error('Error listener deliverys:', error);
            avisarSinConexion("los pedidos de delivery");
            setIsLoading(false);
        });

        getDocs(deliverysCollection.current).then(snap => getDeliverys(snap));

        return () => unsubscribe();
    }, [getDeliverys]);

    const asignarDelivery = (pedidoId, deliveryId) => ejecutar(async () => {
        try {
            const pedidoDoc = docSucursal("pedidos", pedidoId);
            const deliverySel = deliverys.find(d => d.id === deliveryId);
            const updates = deliverySel
                ? {
                    deliveryAsignado: deliverySel.nombreCompleto,
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
    });

    // `pagaronCon` viene del modal cuando el repartidor vuelve: con cuánto pagó al
    // final el cliente. Hace par con `pagaCon`, que es lo que dijo que iba a pagar
    // cuando pidió.
    const marcarEstado = (pedidoId, nuevoEstado, pagaronCon = "") => ejecutar(async () => {
        try {
            // Hace falta el pedido y no solo su id: el listener no filtra por jornada,
            // asi que aca puede aparecer un delivery que quedo abierto de anoche y su
            // arqueo es el de ESA jornada. Si ya no esta en la lista, otro lo cerro.
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
                // El fijo de esta noche queda en el pedido: si mañana cambia la
                // constante, la liquidación de hoy sigue diciendo lo que se pagó.
                updates.fijoDelivery = FIJO_DELIVERY;
                const monto = Number(pagaronCon);
                if (!isNaN(monto) && monto > 0) {
                    updates.pagaronCon = monto;
                }

                // Una sola escritura: el pedido. Las metricas del repartidor se
                // calculan desde los pedidos de la jornada (ver useResumenDiario), asi
                // que no hay contador que mantener en paralelo ni riesgo de que el
                // pedido quede finalizado y la metrica perdida.
                await updateDoc(pedidoDoc, updates);

                // Cerrar la entrega cambia las metricas de ese repartidor. Si el pedido
                // es de una jornada ya cerrada -un delivery de anoche que se rinde hoy-,
                // su foto quedo vieja y hay que borrarla.
                await invalidarFotoDePedido(pedido);

                Swal.fire('¡Éxito!', 'Pedido entregado y finalizado.', 'success');
            }

            // onSnapshot remueve/actualiza el pedido automáticamente
            setPedidoSeleccionado(null);
        } catch (error) {
            console.error('Error actualizando estado:', error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    });

    // La liquidacion se mira al cierre, igual que el arqueo de la Caja: cuesta un
    // barrido de la jornada (~60-100 lecturas) y a las 21 todavia no significa nada.
    // Se lee de los pedidos y no de la foto: el detalle necesita las direcciones, y
    // la jornada en curso no tiene foto de todos modos.
    const handleVerMetricas = () => ejecutarLiquidacion(async () => {
        // El boton se deshabilita fuera de hora, pero la verdad se relee aca.
        if (!esHoraDeArqueo()) return;
        const jornada = getFechaComercial();
        try {
            const pedidosJornada = await traerPedidosDeJornada(jornada);
            setLiquidacion(liquidarDeliverys(pedidosJornada));
            setJornadaMetricas(jornada);
            setShowMetricas(true);
        } catch (error) {
            console.error('Error cargando la liquidacion de deliverys:', error);
            Swal.fire('Error', 'No se pudo cargar la liquidación. Revisá la conexión e intentá de nuevo.', 'error');
        }
    });

    // La tabla muestra lo que el repartidor tiene que COBRAR, no el total del
    // pedido: en MP no cobra nada y en el pago dividido solo la parte en efectivo.
    // `pagoLegible` es para la columna y el filtro, que si no mostrarian "%".
    const filas = useMemo(() => pedidos.map(p => ({
        ...p,
        pagoLegible: etiquetaPago(p.metodoPago),
        aCobrar: repartirPago(p).efectivo,
    })), [pedidos]);

    const columnasPedidos = [
        { columnasBasicas: ["codigo", "nombre"] },
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
            cell: ({ getValue }) => fmtPesos(getValue()),
        },
        {
            accessorKey: "pagoLegible",
            header: "Pago",
        },
        {
            accessorKey: "aCobrar",
            header: "A cobrar",
            cell: ({ row }) => row.original.metodoPago === METODOS_PAGO.MP.key
                ? <span className="text-muted fst-italic">No se cobra</span>
                : <strong>{fmtPesos(row.original.aCobrar)}</strong>,
        },
        {
            // En MP no se muestra. En el dividido es la parte en efectivo.
            accessorKey: "pagaCon",
            header: "Paga con",
            cell: ({ row }) => row.original.metodoPago !== METODOS_PAGO.MP.key && row.original.pagaCon > 0
                ? fmtPesos(row.original.pagaCon)
                : <span className="text-muted">—</span>,
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
                                        {/* Pasada la medianoche, igual que el F4 de la Caja: cuesta
                                            leer los pedidos de la jornada. */}
                                        <button
                                            className="btn-contorno m-1"
                                            onClick={handleVerMetricas}
                                            disabled={!horaDeArqueo || cargandoLiquidacion}
                                            title={horaDeArqueo ? "Liquidación de la jornada" : "La liquidación se habilita a las 00:00"}
                                        >
                                            {cargandoLiquidacion ? "Cargando..." : "Liquidación"}
                                        </button>
                                    </div>

                                </div>

                                <TablaGenerica
                                    data={filas}
                                    columnas={columnasPedidos}
                                    sortBy="codigo"
                                    ordenDescendente={false}
                                    camposBusqueda={["codigo", "direccion", "nombre"]}
                                    camposFiltros={["deliveryAsignado", "pagoLegible"]}
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
                procesando={procesando}
            />

            <ModalMetricasDelivery
                isOpen={showMetricas}
                onClose={() => setShowMetricas(false)}
                liquidacion={liquidacion}
                jornada={jornadaMetricas}
                sinCerrar={pedidos.length}
            />
        </>
    );
};

export default JefeDeliverys;

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, updateDoc, query, getDocs, where, orderBy, serverTimestamp, onSnapshot, Timestamp } from "firebase/firestore";
import { db, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { liquidarDeliverys, repartirPago, invalidarFotoDePedido } from "../POS/pos_hooks/useResumenDiario";
import { getFechaComercial, getFechaComercialDe, getRangoDeJornada } from "../../Utils/fechaComercial";
import '../../style/Main.css';
import TablaGenerica from "../../Utils/TablaGenerica";
import ModalPedidoDelivery from "./delivery_modales/ModalPedidoDelivery";
import ModalMetricasDelivery from "./delivery_modales/ModalMetricasDelivery";
import Swal from "sweetalert2";
import moment from "moment";
import { ESTADOS, SUBESTADOS_MOTODELIVERY, METODOS_PAGO, DESTINO_VUELTO, etiquetaPago } from "../../Utils/Constantes";
import { useAuth } from "../../context/AuthContext";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { fmtPesos } from "../../Utils/formato";
import { avisarSinConexion } from "../../Utils/avisos";

// La columna "Vuelto": qué pasa con la diferencia cuando el cliente paga con un
// billete más grande. La moto no lleva cambio: o el repartidor trae esa plata (los
// admins le transfieren el vuelto al cliente) o se la queda de propina.
const textoVuelto = (p) => {
    if (p.metodoPago === METODOS_PAGO.MP.key) return "";
    const diferencia = (Number(p.pagaCon) || 0) - repartirPago(p).efectivo;
    if (diferencia <= 0) return "";
    if (p.destinoVuelto === DESTINO_VUELTO.VUELTO.key) return `Vuelto ${fmtPesos(diferencia)}`;
    if (p.destinoVuelto === DESTINO_VUELTO.PROPINA.key) return `Propina ${fmtPesos(diferencia)}`;
    return "";
};

const JefeDeliverys = () => {
    const { userData } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [cerrados, setCerrados] = useState([]);
    const [deliverys, setDeliverys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showMetricas, setShowMetricas] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    // Asignar y marcar estado comparten el guard: son la misma fila y dos clicks
    // rapidos dejarian el pedido a medio camino entre dos estados.
    const { procesando, ejecutar } = useAccionUnica();

    // La noche de las Métricas. Se fija al entrar: la pantalla se abre cada noche.
    const [jornada] = useState(getFechaComercial);

    const pedidosCollection = useRef(query(
        colSucursal("pedidos"),
        where("estado", "==", ESTADOS.DELIVERY),
        orderBy("timestamp", "asc")
    ));
    // Los viajes que volvieron desde que empezó la noche, para las Métricas en vivo.
    // Es un rango sobre UN campo, así que alcanza el índice automático. Cuesta ~1
    // lectura por viaje cerrado, en vez de leer la noche entera cada vez que se
    // abrían las Métricas; al recargar dentro de los 30 minutos, solo los cambios.
    const cerradosCollection = useRef(query(
        colSucursal("pedidos"),
        where("deliveryFinTimestamp", ">=", Timestamp.fromDate(getRangoDeJornada(jornada).inicio))
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

        const unsubCerrados = onSnapshot(cerradosCollection.current, (snap) => {
            setCerrados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error('Error listener viajes cerrados:', error);
            avisarSinConexion("las métricas de delivery");
        });

        getDocs(deliverysCollection.current).then(snap => getDeliverys(snap));

        return () => {
            unsubscribe();
            unsubCerrados();
        };
    }, [getDeliverys]);

    // Las Métricas: la misma cuenta que ve el encargado en su F4. Solo los pedidos de
    // ESTA noche: uno de anoche que se cerró hoy es de la foto de anoche, igual que
    // en el arqueo.
    const liquidacion = useMemo(() => liquidarDeliverys(
        cerrados.filter((p) => p.timestamp?.toDate && getFechaComercialDe(p.timestamp.toDate()) === jornada)
    ), [cerrados, jornada]);

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

    // El repartidor volvió con el pedido: el cliente canceló o no se encontró la
    // dirección. El viaje se cierra —se hizo, así que se paga el envío— pero el
    // pedido NO se anula acá: eso es del encargado, desde F3. Por eso el estado queda
    // en DELIVERY: sigue en esta lista, marcado, hasta que el encargado lo elimine, y
    // el cliente no ve "Entregado" en /ver-pedido.
    const volvioSinEntregar = async (pedidoId) => {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) return;

        const { isConfirmed } = await Swal.fire({
            title: '¿Volvió sin entregar?',
            text: `El viaje del pedido ${pedido.codigo} se cierra y el envío se le paga al repartidor. Después el encargado tiene que anular el pedido desde F3.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, volvió sin entregar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;

        await ejecutar(async () => {
            try {
                await updateDoc(docSucursal("pedidos", pedidoId), {
                    estadoDelivery: SUBESTADOS_MOTODELIVERY.FIN,
                    deliveryFinTimestamp: serverTimestamp(),
                    sinEntregar: true,
                });
                await invalidarFotoDePedido(pedido);
                setPedidoSeleccionado(null);
                Swal.fire('Viaje cerrado', 'Avisale al encargado para que anule el pedido desde F3.', 'success');
            } catch (error) {
                console.error('Error cerrando el viaje sin entregar:', error);
                Swal.fire('Error', 'No se pudo cerrar el viaje. Revisá la conexión e intentá de nuevo.', 'error');
            }
        });
    };

    // La tabla muestra lo que el repartidor tiene que COBRAR, no el total del
    // pedido: en MP no cobra nada y en el pago dividido solo la parte en efectivo.
    // `pagoLegible` es para la columna y el filtro, que si no mostrarian "%".
    const filas = useMemo(() => pedidos.map(p => ({
        ...p,
        pagoLegible: etiquetaPago(p.metodoPago),
        aCobrar: repartirPago(p).efectivo,
        vueltoLegible: textoVuelto(p),
    })), [pedidos]);

    // Los que siguen en la calle o esperando repartidor: no entran en las Métricas
    // hasta que vuelvan. Los que volvieron sin entregar ya están cerrados.
    const enCurso = pedidos.filter((p) => p.estadoDelivery !== SUBESTADOS_MOTODELIVERY.FIN).length;

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
            accessorKey: "vueltoLegible",
            header: "Vuelto",
            cell: ({ getValue }) => getValue() || <span className="text-muted">—</span>,
        },
        {
            accessorKey: "deliveryAsignado",
            header: "Repartidor",
            cell: ({ row }) => row.original.sinEntregar
                ? <span className="fw-semibold text-danger">Volvió sin entregar · falta anularlo (F3)</span>
                : row.original.deliveryAsignado || <span className="text-muted fst-italic">Sin asignar</span>,
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
                                        {/* Siempre habilitado: las Métricas salen de un listener,
                                            así que abrirlas no cuesta ninguna lectura. */}
                                        <button
                                            className="btn-contorno m-1"
                                            onClick={() => setShowMetricas(true)}
                                            title="Viajes, envíos y efectivo de la noche, por repartidor"
                                        >
                                            Métricas
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
                                        row.sinEntregar ? 'bg-danger-subtle'
                                            : row.estadoDelivery === SUBESTADOS_MOTODELIVERY.SALIDA ? 'bg-warning' : ''
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
                onVolvioSinEntregar={volvioSinEntregar}
                procesando={procesando}
            />

            <ModalMetricasDelivery
                isOpen={showMetricas}
                onClose={() => setShowMetricas(false)}
                liquidacion={liquidacion}
                jornada={jornada}
                enCurso={enCurso}
            />
        </>
    );
};

export default JefeDeliverys;

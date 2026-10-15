import React, { useState, useEffect, useRef, useCallback } from "react";
import { query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { ESTADOS, ENVIOS_LOCALES } from "../../Utils/Constantes";
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import { fmtHora } from "../../Utils/formato";
import "../../style/Main.css";
import { avisarSinConexion, sinConexion } from "../../Utils/avisos";
import { actualizarPedidoYResumen } from "../POS/pos_hooks/useResumenDiario";
import { getItemsCocina } from "../../Utils/ruteoPedido";
import TicketImpresion from "../Cocina/TicketImpresion";

const ATP = () => {
    const { userData } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    // Los ids del último snapshot, para mirarlos DESPUÉS del Swal: si mientras el
    // cartel pregunta el encargado anula el pedido, ya no hay que entregarlo.
    const idsVigentes = useRef(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [pedidoParaImprimir, setPedidoParaImprimir] = useState(null);

    const queryRef = useRef(
        query(colSucursal("pedidos"), where("estado", "==", ESTADOS.ATP))
    );

    const handleSnapshot = useCallback((snapshot) => {
        const arr = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
        idsVigentes.current = new Set(arr.map(p => p.id));
        setPedidos(arr);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(
            queryRef.current,
            handleSnapshot,
            (err) => {
                console.error("Error en listener ATP:", err);
                avisarSinConexion("los pedidos de ATP");
                setIsLoading(false);
            }
        );
        return unsub;
    }, [handleSnapshot]);

    const marcarCompletado = async (pedido) => {
        const result = await Swal.fire({
            title: `¿Entregar pedido ${pedido.codigo}?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#198754",
            confirmButtonText: "Sí, entregar",
            cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed || sinConexion()) return;
        if (!idsVigentes.current.has(pedido.id)) {
            Swal.fire({ title: "El pedido ya no está en la lista", text: "Lo anularon o lo entregó otra persona.", icon: "info", confirmButtonColor: "#0d6efd" });
            return;
        }

        try {
            // Entregar es lo que lo hace sumar al arqueo (solo suman los ENTREGADOS).
            // Si es de una noche que ya cerró, su resumen guardado se borra en la
            // misma escritura y se recalcula al mirarlo.
            await actualizarPedidoYResumen(docSucursal("pedidos", pedido.id), pedido, {
                estado: ESTADOS.FINAL,
                atpCompletadoPor: userData.nombreCompleto,
                atpCompletadoPorID: userData.id,
                atpTimestamp: serverTimestamp(),
            });
            Swal.fire({ title: "¡Entregado!", icon: "success", confirmButtonColor: "#198754" });
        } catch (err) {
            console.error("Error marcando ATP completado:", err);
            Swal.fire("Error", err.code === "permission-denied"
                ? "El pedido fue anulado."
                : "No se pudo completar el pedido", "error");
        }
    };

    const columnas = [
        { columnasBasicas: ["codigo", "nombre", "telefono"] },
        {
            accessorKey: "timestamp",
            header: "Hora",
            cell: ({ getValue }) => fmtHora(getValue()),
        },
        {
            accessorKey: "envio.zona_envio",
            header: "Zona",
        },
        {
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const pedido = row.original;
                // Retira y Espera Afuera por igual: el de afuera puede no estar a la
                // vista. Sin telefono no hay a quien escribirle —en los locales no
                // es obligatorio, ver validarPedido—.
                const whatsappUrl = `https://api.whatsapp.com/send?phone=549${pedido.telefono}&text=${encodeURIComponent(`Hola ${pedido.nombre}, tu pedido #${pedido.codigo} está listo para retirar.`)}`;

                // El ticket se imprime en la cocina. Un pedido sin nada que cocinar
                // (hoy, solo bebidas) la saltea y llegaba acá sin ticket.
                const salteoLaCocina = getItemsCocina(pedido.carrito).length === 0;

                return (
                    <div className="d-flex justify-content-center gap-1">
                        {salteoLaCocina && (
                            <button
                                className="btn btn-outline-dark"
                                onClick={() => setPedidoParaImprimir(pedido)}
                                title="Este pedido no pasó por la cocina: imprimí el ticket desde acá"
                            >
                                <i className="fa-solid fa-print me-1"></i> Imprimir
                            </button>
                        )}
                        {pedido.telefono && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-success"
                                title="Contactar por WhatsApp"
                            >
                                Enviar <i className="fa-brands fa-whatsapp"></i>
                            </a>
                        )}
                        <button
                            className="btn-contorno"
                            onClick={() => marcarCompletado(pedido)}
                            title="Marcar como entregado"
                        >
                            <i className="fa-solid fa-check me-1"></i> Entregar
                        </button>
                    </div>
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
                                <br />
                                <div className="d-flex justify-content-between mt-4">
                                    <div
                                        className="d-flex justify-content-start align-items-center"
                                        style={{ maxHeight: "40px", marginLeft: "10px" }}
                                    >
                                        <h1>Atención al Público</h1>
                                    </div>
                                </div>

                                <TablaGenerica
                                    data={pedidos}
                                    columnas={columnas}
                                    sortBy="timestamp"
                                    ordenDescendente={false}
                                    camposBusqueda={["codigo", "nombre", "telefono"]}
                                    camposFiltros={["envio.zona_envio"]}
                                    rowClassName={(row) =>
                                        row.envio?.zona_envio === ENVIOS_LOCALES[0] ? "table-primary" : "table-warning"
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pedidoParaImprimir && (
                <TicketImpresion
                    pedido={pedidoParaImprimir}
                    onClose={() => setPedidoParaImprimir(null)}
                />
            )}
        </>
    );
};

export default ATP;

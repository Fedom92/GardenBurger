import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { ESTADOS, ENVIOS_LOCALES } from "../../Utils/Constantes";
import TablaGenerica from "../../Utils/TablaGenerica";
import Swal from "sweetalert2";
import moment from "moment";
import "../../style/Main.css";

const ATP = () => {
    const { userData } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const queryRef = useRef(
        query(collection(db, "pedidos"), where("estado", "==", ESTADOS.ATP))
    );

    const handleSnapshot = useCallback((snapshot) => {
        const arr = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0));
        setPedidos(arr);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(
            queryRef.current,
            handleSnapshot,
            (err) => {
                console.error("Error en listener ATP:", err);
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
        if (!result.isConfirmed) return;

        try {
            await updateDoc(doc(db, "pedidos", pedido.id), {
                estado: ESTADOS.FINAL,
                atpCompletadoPor: userData.nombreCompleto,
                atpCompletadoPorID: userData.id,
                atpTimestamp: serverTimestamp(),
            });
            Swal.fire({ title: "¡Entregado!", icon: "success", confirmButtonColor: "#198754" });
        } catch (err) {
            console.error("Error marcando ATP completado:", err);
            Swal.fire("Error", "No se pudo completar el pedido", "error");
        }
    };

    const columnas = [
        { columnasBasicas: ["codigo", "nombre", "telefono"] },
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
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const pedido = row.original;
                const esRetira = pedido.envio?.zona_envio === ENVIOS_LOCALES[0];
                const whatsappUrl = `https://api.whatsapp.com/send?phone=549${pedido.telefono}&text=${encodeURIComponent(`Hola ${pedido.nombre}, tu pedido #${pedido.codigo} está listo para retirar.`)}`;

                return (
                    <div className="d-flex gap-1">
                        {esRetira && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-success btn-sm"
                                title="Contactar por WhatsApp"
                            >
                                <i className="fa-brands fa-whatsapp"></i>
                            </a>
                        )}
                        <button
                            className="btn btn-dark btn-sm"
                            onClick={() => marcarCompletado(pedido)}
                            title="Marcar como entregado"
                        >
                            <i className="fa-solid fa-check me-1"></i> Completado
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
                                <div className="d-flex justify-content-between mt-3">
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
        </>
    );
};

export default ATP;

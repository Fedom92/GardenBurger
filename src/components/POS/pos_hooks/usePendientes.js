import { useState, useEffect } from "react";
import { query, where, limit, onSnapshot } from "firebase/firestore";
import { colSucursal } from "../../../firebaseConfig/firebase";
import { ESTADOS } from "../../../Utils/Constantes";
import { avisarSinConexion } from "../../../Utils/avisos";

const usePendientes = () => {
    const [tieneSolicitudesPendientes, setTieneSolicitudesPendientes] = useState(false);
    const [tienePendientesMP, setTienePendientesMP] = useState(false);

    useEffect(() => {
        const pedidosRef = colSucursal("pedidos");

        const unsubSolicitudes = onSnapshot(
            query(pedidosRef, where("estado", "==", ESTADOS.WEB_PENDIENTE), limit(1)),
            (snap) => setTieneSolicitudesPendientes(!snap.empty),
            (err) => {
                console.error("Error solicitudes:", err);
                avisarSinConexion("las solicitudes web");
            }
        );

        const unsubPedidos = onSnapshot(
            query(pedidosRef, where("estado", "==", ESTADOS.PENDIENTEMP), limit(1)),
            (snap) => setTienePendientesMP(!snap.empty),
            (err) => {
                console.error("Error Pendientes MP:", err);
                avisarSinConexion("los pagos de Mercado Pago pendientes");
            }
        );

        return () => {
            unsubSolicitudes();
            unsubPedidos();
        };
    }, []);

    return { tieneSolicitudesPendientes, tienePendientesMP };
};

export default usePendientes;
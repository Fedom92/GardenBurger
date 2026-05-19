import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";

const usePendientes = () => {
    const [tieneSolicitudesPendientes, setTieneSolicitudesPendientes] = useState(false);
    const [tienePendientesMP, setTienePendientesMP] = useState(false);

    useEffect(() => {
        const unsubSolicitudes = onSnapshot(
            query(collection(db, "solicitudes"), where("estado", "==", process.env.REACT_APP_ESTADO_SOLICITUD), limit(1)),
            (snap) => setTieneSolicitudesPendientes(!snap.empty),
            (err) => console.error("Error solicitudes:", err)
        );

        const unsubPedidos = onSnapshot(
            query(collection(db, "pedidos"), where("estado", "==", process.env.REACT_APP_ESTADO_PENDIENTE_MP), limit(1)),
            (snap) => setTienePendientesMP(!snap.empty),
            (err) => console.error("Error Pendientes MP:", err)
        );

        return () => {
            unsubSolicitudes();
            unsubPedidos();
        };
    }, []);

    return { tieneSolicitudesPendientes, tienePendientesMP };
};

export default usePendientes;
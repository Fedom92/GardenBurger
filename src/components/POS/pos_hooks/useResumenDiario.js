import { doc, increment } from "firebase/firestore";
import { useCallback } from "react";
import { db } from "../../../firebaseConfig/firebase";
import moment from "moment";

const useResumenDiario = () => {

    const getResumenOperation = useCallback(({ metodoPago, total, montoEfectivo, montoMPConRecargo }) => {
        const hoy = getFechaComercial();
        const resumenRef = doc(db, "resumenDiario", hoy);

        const montoEfectivoFinal = metodoPago === "EFECTIVO" ? total
            : metodoPago === "%" ? montoEfectivo
            : 0;

        const montoMPFinal = metodoPago === "MP" ? total
            : metodoPago === "%" ? montoMPConRecargo
            : 0;

        return {
            ref: resumenRef,
            stats: {
                efectivo: increment(montoEfectivoFinal),
                mp: increment(montoMPFinal),
                totalPedidos: increment(1)
            }
        };
    }, []);

    return { getResumenOperation };
};

const getFechaComercial = () => {
    const ahora = moment();
    // Si es entre 00:00 y 02:00, pertenece al día anterior
    if (ahora.hour() < Number(process.env.REACT_APP_horaCierre)) {
        return ahora.subtract(1, 'day').format("DD-MM-YYYY");
    }
    return ahora.format("DD-MM-YYYY");
};

export default useResumenDiario;
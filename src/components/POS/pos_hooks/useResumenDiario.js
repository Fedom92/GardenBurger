import { doc, increment } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { getFechaComercial } from "../../../Utils/fechaComercial";

export const getResumenOperation = ({ metodoPago, total, montoEfectivo, montoMPConRecargo, descontar = false }) => {
    const hoy = getFechaComercial();
    const resumenRef = doc(db, "resumenDiario", hoy);
    const signo = descontar ? -1 : 1;

    const montoEfectivoFinal = metodoPago === "EFECTIVO" ? total
        : metodoPago === "%" ? (montoEfectivo || 0)
            : 0;

    const montoMPFinal = metodoPago === "MP" ? total
        : metodoPago === "%" ? (montoMPConRecargo || (total - (montoEfectivo || 0)))
            : 0;

    return {
        ref: resumenRef,
        stats: {
            efectivo: increment(montoEfectivoFinal * signo),
            mp: increment(montoMPFinal * signo),
            totalPedidos: increment(signo)
        }
    };
};
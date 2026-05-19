import { doc, increment } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { getFechaComercial } from "../../../Utils/fechaComercial";

export const getResumenOperation = ({ metodoPago, total, montoEfectivo, montoMPConRecargo }) => {
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
};
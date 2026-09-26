import { increment } from "firebase/firestore";
import { docSucursal, docDeSucursal } from "../../../firebaseConfig/firebase";
import { getFechaComercial, getFechaComercialDe } from "../../../Utils/fechaComercial";
import { CATEGORIAS_COMBOS, ENVIOS_LOCALES } from "../../../Utils/Constantes";

// Cuenta unidades y no renglones: un item con cantidad 3 son 3 combos. Los productos que
// comparten categoria con los combos pero se venden sueltos salen de la lista `excludes`
// de cada categoria. Misma regla que esComboConta en Estadisticas, asi la jornada y el
// historico dan el mismo numero.
const contarCombos = (carrito = []) =>
    carrito.reduce((total, item) => {
        const combo = CATEGORIAS_COMBOS.find(c => c.key === item.categoria);
        if (!combo || combo.excludes?.includes(item.descripcion)) return total;
        return total + (Number(item.cantidad) || 1);
    }, 0);

// `sucursal` es un override opcional: sin él usa la del usuario logueado, que es
// lo que hacen Caja, BuscarPedido y PendientesMP. Lo pasa solo el admin, que
// opera sobre una sucursal ajena.
//
// `timestampPedido` es el Timestamp del pedido. Lo pasan los que REVIERTEN
// —eliminar y rechazar MP—, para que el descuento vaya a la jornada en que ese
// pedido sumó y no a la de ahora: eliminar hoy un pedido de ayer descontaba del
// día equivocado. La Caja no lo pasa porque ahí el pedido nace en este momento.
export const getResumenOperation = ({ metodoPago, total, montoEfectivo, montoMPConRecargo, envio, carrito, descontar = false, sucursal, timestampPedido }) => {
    const jornada = timestampPedido?.toDate
        ? getFechaComercialDe(timestampPedido.toDate())
        : getFechaComercial();
    const resumenRef = sucursal
        ? docDeSucursal(sucursal, "resumenDiario", jornada)
        : docSucursal("resumenDiario", jornada);
    const signo = descontar ? -1 : 1;

    const montoEfectivoFinal = metodoPago === "EFECTIVO" ? total
        : metodoPago === "%" ? (montoEfectivo || 0)
            : 0;

    const montoMPFinal = metodoPago === "MP" ? total
        : metodoPago === "%" ? (montoMPConRecargo || (total - (montoEfectivo || 0)))
            : 0;

    // Retira y Espera Afuera cobran en el mostrador; el resto de las zonas vuelve con el
    // repartidor. Son dos cajas distintas y se arquean por separado.
    const esLocal = ENVIOS_LOCALES.includes(envio?.zona_envio);
    const combos = contarCombos(carrito);

    return {
        ref: resumenRef,
        stats: {
            totalEfectivo: increment(montoEfectivoFinal * signo),
            efectivoLocal: increment((esLocal ? montoEfectivoFinal : 0) * signo),
            efectivoEnvio: increment((esLocal ? 0 : montoEfectivoFinal) * signo),
            mp: increment(montoMPFinal * signo),
            totalPedidos: increment(signo),
            totalCombos: increment(combos * signo),
        }
    };
};

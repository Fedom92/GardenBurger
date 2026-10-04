import Swal from "sweetalert2";
import { METODOS_PAGO } from "../../../Utils/Constantes";

// Devuelve el mensaje de error o null. Lo usa el modal PagoDividido al confirmar
// y validarPedido al guardar: el cajero puede seguir editando el carrito despues
// de fijar el efectivo, y si el total baja de ese monto el recargo sale negativo
// y el pedido se guarda subcobrado con el arqueo corrido.
export const errorPagoDividido = (montoEfectivo, totalBase) => {
    if (montoEfectivo <= 0) return 'El monto en efectivo debe ser mayor a 0';
    if (montoEfectivo >= totalBase) return `El monto en efectivo ($${montoEfectivo}) no puede ser mayor o igual al total base ($${totalBase})`;
    return null;
};

// `pideVuelto` lo calcula la Caja: delivery en efectivo que paga con más del total.
const validarPedido = ({ data, carrito, envioSeleccionado, totalFinal, totalBase, montoEfectivo, pideVuelto = false }) => {
    if (data.telefono.length < 10) {
        Swal.fire({
            title: 'Advertencia',
            text: 'El teléfono debe poseer 10 dígitos',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (carrito.length === 0) {
        Swal.fire({
            title: 'Advertencia',
            text: 'No hay productos en el carrito',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (!data.envio) {
        Swal.fire({
            title: 'Advertencia',
            text: 'No hay envío seleccionado',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (!data.metodoPago) {
        Swal.fire({
            title: 'Advertencia',
            text: 'No hay método de pago seleccionado',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (data.metodoPago === METODOS_PAGO.EFECTIVO.key && (!data.pagaCon || data.pagaCon < totalFinal)) {
        Swal.fire({
            title: 'Advertencia',
            text: `El monto "Paga Con" debe ser igual o mayor al total`,
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    // La moto no lleva cambio: sin esto, la jefa no sabe si el repartidor tiene que
    // traer la diferencia o se la queda de propina.
    if (pideVuelto && !data.destinoVuelto) {
        Swal.fire({
            title: 'Advertencia',
            text: 'El cliente paga con más del total: marcá si quiere el vuelto o lo deja de propina.',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    const errorDividido = data.metodoPago === METODOS_PAGO.DIVIDIDO.key ? errorPagoDividido(montoEfectivo, totalBase) : null;
    if (errorDividido) {
        Swal.fire({
            title: 'Advertencia',
            text: errorDividido,
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    return true;
};

export default validarPedido;
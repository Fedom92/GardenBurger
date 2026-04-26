import Swal from "sweetalert2";

const validarPedido = ({ data, carrito, envioSeleccionado, totalFinal }) => {
    if (data.telefono.length < 10) {
        Swal.fire({
            title: 'Advertencia',
            text: 'El teléfono debe poseer 10 dígitos',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (envioSeleccionado?.zona_envio !== "Retira" && (!data.direccion || data.direccion.trim() === '')) {
        Swal.fire({
            title: 'Advertencia',
            text: 'Selecciona una dirección del listado desplegable',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    if (envioSeleccionado?.zona_envio !== "Retira" && (!data.latitud || !data.longitud)) {
        Swal.fire({
            title: 'Advertencia',
            text: 'Debes seleccionar la dirección del listado (no escribir a mano)',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    /*if (!data.telefono.startsWith('11') && !data.telefono.startsWith('23')) {
        Swal.fire({
            title: 'Advertencia',
            text: 'El teléfono debe comenzar con 11 o 23',
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }*/

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

    if (data.metodoPago === "EFECTIVO" && (!data.pagaCon || data.pagaCon < totalFinal)) {
        Swal.fire({
            title: 'Advertencia',
            text: `El monto "Paga Con" debe ser igual o mayor al total ($${totalFinal})`,
            icon: 'warning',
            confirmButtonColor: '#ffc107',
        });
        return false;
    }

    return true;
};

export default validarPedido;
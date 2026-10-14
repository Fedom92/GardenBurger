import { toast } from "react-toastify";
import Swal from "sweetalert2";

// Avisos de error que no pueden pasar desapercibidos. La convención del proyecto
// es que un console.error sin aviso visible es un bug: esto es el aviso.

// Un error en onSnapshot es TERMINAL: Firestore da de baja el listener y no
// reintenta. Sin este aviso la pantalla se queda con la última lista —o vacía— y
// nadie se entera: el cocinero ve "no hay pedidos" mientras el local sigue
// vendiendo. No se cierra solo, porque la única salida es recargar. El toastId
// evita apilar el mismo aviso.
export const avisarSinConexion = (que) =>
    toast.error(`Se perdió la conexión con ${que}. Recargá la página (F5) para volver a recibirlos.`, {
        toastId: `sin-conexion-${que}`,
        autoClose: false,
        closeOnClick: false,
    });

// Una carga que falló deja la pantalla vacía: que se sepa que no es que no haya
// datos.
// Para las acciones que escriben con updateDoc / writeBatch. Con la caché persistente,
// sin conexión esas escrituras no fallan: quedan en cola, el botón se queda en
// "Cargando…" y el catch nunca corre. Por eso se pregunta ANTES de escribir.
// navigator.onLine es un dato que el navegador ya tiene: no cuesta tiempo ni red.
// Devuelve true si no hay conexión (y ya avisó), para cortar con un return.
//
// "Crear Pedido" no lo necesita: es una transacción, y sin conexión falla y avisa.
export const sinConexion = () => {
    if (navigator.onLine) return false;
    Swal.fire({
        title: 'Sin conexión',
        text: 'Revisá internet e intentá de nuevo.',
        icon: 'warning',
        confirmButtonColor: '#ffc107',
    });
    return true;
};

export const avisarErrorDeCarga = (que) =>
    toast.error(`No se pudo cargar ${que}. Revisá la conexión y recargá la página.`, {
        toastId: `carga-${que}`,
    });

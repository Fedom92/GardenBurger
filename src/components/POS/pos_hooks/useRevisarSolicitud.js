// pos_hooks/useRevisarSolicitud.js
import { useCallback } from "react";
import { getDoc, updateDoc, deleteField } from "firebase/firestore";
import { docSucursal } from "../../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/AuthContext";
import { ENVIOS_LOCALES } from "../../../Utils/Constantes";

// Devuelve la solicitud al listado para que otro cajero pueda tomarla. La usa el
// boton Cancelar de la Caja.
//
// Libera solo si la asignacion sigue siendo de este cajero: si mientras tanto otro
// se la reasigno, cancelar tiene que limpiar el ticket local y nada mas, no pisarle
// la asignacion al que la tiene ahora.
export const liberarSolicitud = async (solicitudId, cajeroID) => {
    const solicitudRef = docSucursal("pedidos", solicitudId);
    const snap = await getDoc(solicitudRef);

    if (snap.data()?.cajeroRevisaID !== cajeroID) return;

    await updateDoc(solicitudRef, {
        cajeroRevisaID: deleteField(),
        cajeroRevisa: deleteField(),
    });
};

const useRevisarSolicitud = ({ setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios }) => {
    const { userData } = useAuth();

    const handleRevisarSolicitud = useCallback(async (solicitud) => {
        try {
            // Queda asignada a este cajero: es lo unico que ven las otras cajas para
            // saber que ya la esta cargando alguien.
            await updateDoc(docSucursal("pedidos", solicitud.id), {
                cajeroRevisaID: userData.id,
                cajeroRevisa: userData.nombreCompleto,
            });

            // Llenar los campos del formulario con los datos de la solicitud
            setValue("nombre", solicitud.cliente?.nombre || "");
            setValue("telefono", solicitud.cliente?.telefono || "");
            setValue("direccion", solicitud.cliente?.direccion || "");
            setValue("entreCalles", solicitud.cliente?.entreCalles || "");
            setValue("metodoPago", solicitud.cliente?.metodoPago || "");
            setValue("id", solicitud.id);


            // Juntar observaciones de cada producto del carrito
            const obsProductos = (solicitud.carrito || [])
                .filter(p => p.observaciones)
                .map(p => `${p.descripcion}: ${p.observaciones}`)
                .join("\n");
            setValue("observaciones", obsProductos);

            // Mapear opcion a zona_envio
            if (solicitud.cliente?.opcion === "delivery") {
                // La zona la elige el cajero, porque el costo depende de la distancia.
                // Acá solo se activa el modo para que se vean direccion y entre calles.
                setModoDelivery(true);
                setValue("envio", "");
            } else if (solicitud.cliente?.opcion === ENVIOS_LOCALES[0]) {
                setModoDelivery(false);
                const envioRetira = envios.find(e => e.zona_envio === ENVIOS_LOCALES[0]);
                if (envioRetira) {
                    setValue("envio", JSON.stringify({
                        zona_envio: envioRetira.zona_envio,
                        costo_envio: envioRetira.costo_envio
                    }));
                }
            }

            // Agregar productos al carrito
            if (solicitud.carrito?.length > 0) {
                setCarrito(solicitud.carrito.map(producto => ({
                    ...producto,
                    cantidad: producto.cantidad || 1,
                    subtotal: (producto.cantidad || 1) * producto.precio
                })));
            }

            // Cerrar el modal. Solo se llega aca si la asignacion se grabo bien.
            setShowPendientesSolicitudes(false);

        } catch (error) {
            console.error('Error cargando datos de solicitud:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos de la solicitud',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    }, [setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios, userData]);

    return { handleRevisarSolicitud };
};

export default useRevisarSolicitud;
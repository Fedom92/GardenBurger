// pos_hooks/useRevisarSolicitud.js
import { useCallback } from "react";
import { updateDoc, deleteField } from "firebase/firestore";
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
//
// Eso lo garantiza la regla asignacionValida() de firestore.rules, asi que se
// intenta y listo: el getDoc previo que hacia esta funcion era una lectura
// facturada por cada Cancelar para comprobar algo que el servidor ya rechaza.
export const liberarSolicitud = async (solicitudId, cajeroID) => {
    try {
        await updateDoc(docSucursal("pedidos", solicitudId), {
            cajeroRevisaID: deleteField(),
            cajeroRevisa: deleteField(),
        });
    } catch (error) {
        // permission-denied = la solicitud ya es de otro cajero. No hay nada que
        // liberar y no es un error para el usuario: su ticket local se limpia igual.
        if (error.code !== "permission-denied") {
            console.error("Error liberando la solicitud:", error);
        }
    }
};

const useRevisarSolicitud = ({ setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios, productos }) => {
    const { userData } = useAuth();

    const handleRevisarSolicitud = useCallback(async (solicitud) => {
        try {
            // Queda asignada a este cajero: es lo unico que ven las otras cajas para
            // saber que ya la esta cargando alguien. La regla asignacionValida() de
            // firestore.rules rechaza la escritura si otro cajero se la asigno antes
            // de que este listener se enterara: es lo que cierra la carrera.
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

            // Agregar productos al carrito. El precio que viaja en la solicitud lo
            // puso el navegador del cliente desde un menu.json que puede estar
            // desactualizado (o editado): manda el catalogo en vivo, que la Caja ya
            // tiene en memoria. Cada variante y cada extra es un documento propio de
            // productos, asi que el match por id cubre todo el carrito. Si el producto
            // ya no esta (visible: false), se mantiene el precio del cliente.
            if (solicitud.carrito?.length > 0) {
                setCarrito(solicitud.carrito.map(producto => {
                    const cantidad = producto.cantidad || 1;
                    const precio = productos.find(p => p.id === producto.id)?.precio ?? producto.precio;
                    return { ...producto, cantidad, precio, subtotal: cantidad * precio };
                }));
            }

            // Cerrar el modal. Solo se llega aca si la asignacion se grabo bien.
            setShowPendientesSolicitudes(false);

        } catch (error) {
            // Las reglas rechazan la asignacion si otro cajero la tomo primero. El
            // listener del modal actualiza el badge solo; aca alcanza con decirlo.
            if (error.code === "permission-denied") {
                Swal.fire({
                    title: 'Solicitud tomada',
                    text: 'Otro cajero ya tomó esta solicitud',
                    icon: 'info',
                    confirmButtonColor: '#0d6efd',
                });
                return;
            }
            console.error('Error cargando datos de solicitud:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos de la solicitud',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    }, [setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios, productos, userData]);

    return { handleRevisarSolicitud };
};

export default useRevisarSolicitud;
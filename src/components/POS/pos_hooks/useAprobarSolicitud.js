// pos_hooks/useAprobarSolicitud.js
import { useCallback } from "react";
import Swal from "sweetalert2";

const useAprobarSolicitud = ({ setValue, setCarrito, setShowPendientesSolicitudes, envios }) => {

    const handleAprobarSolicitud = useCallback((solicitud) => {
        try {
            // Llenar los campos del formulario con los datos de la solicitud
            setValue("nombre", solicitud.cliente?.nombre || "");
            setValue("telefono", solicitud.cliente?.telefono || "");
            setValue("direccion", solicitud.cliente?.direccion || "");
            setValue("entreCalles", solicitud.cliente?.entreCalles || "");
            setValue("metodoPago", solicitud.cliente?.metodoPago || "");


            // Juntar observaciones de cada producto del carrito
            const obsProductos = (solicitud.productos || [])
                .filter(p => p.observaciones)
                .map(p => `${p.descripcion}: ${p.observaciones}`)
                .join("\n");
            setValue("observaciones", obsProductos);

            // Mapear opcion a zona_envio
            if (solicitud.cliente?.opcion === "Retira") {
                const envioRetira = envios.find(e =>
                    e.zona_envio.toLowerCase().includes("retira")
                );
                if (envioRetira) {
                    setValue("envio", JSON.stringify({
                        zona_envio: envioRetira.zona_envio,
                        costo_envio: envioRetira.costo_envio
                    }));
                }
            }

            // Agregar productos al carrito
            if (solicitud.productos?.length > 0) {
                setCarrito(solicitud.productos.map(producto => ({
                    ...producto,
                    cantidad: producto.cantidad || 1,
                    subtotal: (producto.cantidad || 1) * producto.precio
                })));
            }

            // Cerrar el modal
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
    }, [setValue, setCarrito, setShowPendientesSolicitudes, envios]);

    return { handleAprobarSolicitud };
};

export default useAprobarSolicitud;
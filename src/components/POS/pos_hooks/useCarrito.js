import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { CATEGORIAS_HAMBURGUESA } from "../../../Utils/Constantes";

const useCarrito = ({ envioSeleccionado, metodoPago, montoEfectivo, recargo }) => {
    const [carrito, setCarrito] = useState([]);

    const getResumen = useMemo(() => {
        const subtotal = carrito.reduce((acum, producto) => acum + producto.subtotal, 0);
        const costoEnvio = envioSeleccionado?.costo_envio || 0;
        const base = subtotal + costoEnvio;

        // Recargo segun metodo de pago
        const recargoCalculado = (() => {
            if (metodoPago === "MP") return base * (recargo / 100);
            if (metodoPago === "%") return (base - montoEfectivo) * (recargo / 100);
            return 0;
        })();

        // Total final
        const total = base + recargoCalculado;
        const restoMP = base - montoEfectivo;
        const montoMPConRecargo = restoMP + recargoCalculado;

        return {
            subtotal,
            costoEnvio,
            totalBase: base,
            recargo: recargoCalculado,
            total,
            restoMP,
            montoMPConRecargo
        };
    }, [carrito, envioSeleccionado, metodoPago, recargo, montoEfectivo]);

    const handleAgregarAlCarrito = (producto) => {
        if (producto.categoria === "EXTRA" && producto.tipoExtra === "HAMBURGUESA") {
            const ultimoProducto = carrito[carrito.length - 1];

            const esValido = ultimoProducto && (
                CATEGORIAS_HAMBURGUESA.includes(ultimoProducto.categoria) ||
                (ultimoProducto.categoria === "EXTRA" && ultimoProducto.tipoExtra === "HAMBURGUESA")
            );

            if (!esValido) {
                Swal.fire({
                    title: 'Advertencia',
                    text: 'Solo puedes agregar un extra de Hamburguesa después de una Hamburguesa',
                    icon: 'warning',
                    confirmButtonColor: '#ffc107',
                });
                return;
            }
        }

        setCarrito((prevCarrito) => {
            const ultimoProducto = prevCarrito.length > 0 ? prevCarrito[prevCarrito.length - 1] : null;

            if (ultimoProducto && ultimoProducto.id === producto.id) {
                return prevCarrito.map((item, index) =>
                    index === prevCarrito.length - 1 && item.id === producto.id
                        ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio }
                        : item
                );
            }

            return [...prevCarrito, {
                ...producto,
                carritoItemId: crypto.randomUUID(),
                cantidad: 1,
                subtotal: producto.precio
            }];
        });
    };

    const handleEliminarDelCarrito = (carritoItemId) => {
        setCarrito((prev) =>
            prev
                .map((item) =>
                    item.carritoItemId === carritoItemId
                        ? { ...item, cantidad: item.cantidad - 1, subtotal: (item.cantidad - 1) * item.precio }
                        : item
                )
                .filter((item) => item.cantidad > 0)
        );
    };

    const resetCarrito = () => setCarrito([]);

    return {
        carrito,
        setCarrito,
        handleAgregarAlCarrito,
        handleEliminarDelCarrito,
        resetCarrito,
        getResumen,
    };
};

export default useCarrito;
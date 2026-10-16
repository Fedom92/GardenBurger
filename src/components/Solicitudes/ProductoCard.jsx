import React, { useState } from "react";
import { fmtPesos } from "../../Utils/formato";
import { ilustracionDe } from "./catalogo";
import { ilustracion } from "./ilustraciones";

// La foto de un producto, o la ilustración de su categoría si no tiene o si no carga
// (un link externo puede caerse; los de Drive, a la larga, responden 429). La usan la
// tarjeta y la ficha. `alt` vacío: el nombre del producto está escrito al lado.
//
// Recuerda QUÉ foto falló y no un sí/no: en la ficha, al cambiar de tamaño cambia la
// foto, y la nueva se prueba en el mismo <img>, sin desmontarlo (así no parpadea).
export const FotoProducto = ({ producto, className = "" }) => {
    const [rota, setRota] = useState(null);
    const src = producto?.imagen;
    if (!src || rota === src) {
        return (
            <div className={`gb-producto-foto is-ilustracion ${className}`}>
                <img src={ilustracion(ilustracionDe(producto))} alt="" />
            </div>
        );
    }
    return (
        <div className={`gb-producto-foto ${className}`}>
            <img src={src} alt="" loading="lazy" onError={() => setRota(src)} />
        </div>
    );
};

// La tarjeta de un producto del catálogo. Una hamburguesa agrupada muestra el nombre
// sin la variante y "desde" el precio más bajo; el tamaño se elige en la ficha.
const ProductoCard = ({ producto, onAgregar }) => {
    const agrupada = Boolean(producto.variantes);
    const nombre = agrupada ? producto.nombre : producto.descripcion;
    return (
        <article className="gb-producto">
            <FotoProducto producto={producto} />
            <div className="gb-producto-cuerpo">
                <h3 className="gb-producto-nombre">{nombre}</h3>
                <p className="gb-producto-precio">
                    {agrupada ? `desde ${fmtPesos(producto.precioDesde)}` : fmtPesos(producto.precio)}
                </p>
            </div>
            <button type="button" className="btn btn-gb gb-producto-boton" onClick={() => onAgregar(producto)}
                aria-label={`Agregar ${nombre}`}>
                Agregar
            </button>
        </article>
    );
};

export default ProductoCard;

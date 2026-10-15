import React from "react";
import { Link } from "react-router-dom";
import isotipo from "../../img/marca/logos/isotipo-lino.svg";

// La cabecera de la web pública: el isotipo, un texto de dos líneas (la sucursal y
// su estado) y, a la derecha, lo que la pantalla necesite: el botón del carrito en
// el catálogo. Reemplaza al par de logos mobile/desktop que estaba copiado en cada
// pantalla. Queda fija arriba al hacer scroll.
//
// El isotipo y el texto llevan al selector: es como se cambia de sucursal.
const HeaderWeb = ({ titulo, subtitulo, subtituloApagado = false, children }) => (
    <header className="gb-header">
        <Link to="/crear-solicitud" className="gb-header-marca" title="Elegir otra sucursal">
            <img src={isotipo} alt="Garden Burger" className="gb-header-isotipo" width="42" height="40" />
            {(titulo || subtitulo) && (
                <span className="gb-header-texto">
                    {titulo && <span className="gb-header-titulo">{titulo}</span>}
                    {subtitulo && (
                        <span className={`gb-header-sub ${subtituloApagado ? "is-apagado" : ""}`}>{subtitulo}</span>
                    )}
                </span>
            )}
        </Link>
        {children && <div className="gb-header-derecha">{children}</div>}
    </header>
);

export default HeaderWeb;

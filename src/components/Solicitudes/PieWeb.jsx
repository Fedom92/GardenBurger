import React from "react";
import { FaInstagram, FaFacebookF, FaTiktok } from "react-icons/fa";
import { textoHorarioWeb, textoExcepcionWeb } from "../../Utils/fechaComercial";
import { REDES } from "./contenidoWeb";

const ICONOS = { Instagram: FaInstagram, Facebook: FaFacebookF, TikTok: FaTiktok };

// El pie de la web pública. Con `sucursal` muestra sus datos y el mismo horario que
// decide si la web abre; sin ella (el selector, donde todavía no se eligió), solo
// las redes. Una red sin URL va apagada: es el lugar que falta completar en
// contenidoWeb.js.
const PieWeb = ({ sucursal = null }) => {
    const horario = textoHorarioWeb(sucursal);
    const excepcion = textoExcepcionWeb(sucursal);
    const datos = [sucursal?.nombre, sucursal?.direccion, sucursal?.telefono].filter(Boolean);

    return (
        <footer className="gb-pie">
            <div className="gb-damero" aria-hidden="true" />
            <div className="gb-pie-contenido gb-col">
                {datos.length > 0 && <p>{datos.join(" · ")}</p>}
                {horario && <p>Pedidos {horario}</p>}
                {/* Una excepción de hoy: un feriado que se abre, una noche cerrada. */}
                {excepcion && <p className="gb-ambar">{excepcion}</p>}
                <div className="gb-redes">
                    {REDES.map(({ nombre, url }) => {
                        const Icono = ICONOS[nombre];
                        const contenido = Icono ? <Icono aria-hidden="true" /> : nombre.charAt(0);
                        return url ? (
                            <a key={nombre} href={url} className="gb-red" target="_blank" rel="noopener noreferrer" aria-label={nombre}>
                                {contenido}
                            </a>
                        ) : (
                            <span key={nombre} className="gb-red is-pendiente" title={`Falta el link de ${nombre}`}>
                                {contenido}
                            </span>
                        );
                    })}
                </div>
                <p>© {new Date().getFullYear()} Garden Burger</p>
            </div>
        </footer>
    );
};

export default PieWeb;

import React from "react";
import { Link } from "react-router-dom";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import Footer from "./Footer";
import { textoHorarioWeb } from "../../Utils/fechaComercial";
import '../../style/Main.css';

// Una sucursal fuera de horario no toma pedidos por la web: no se arma el carrito.
// El seguimiento de un pedido (/ver-pedido) sigue abierto.
//
// `sucursal` es su documento (de menu.json, o de Firestore si el JSON falló), con
// el horario, la dirección y el teléfono para el pie: es justo cuando el cliente no
// puede pedir por la web. Cada sucursal tiene su horario, así que se ofrece volver
// al selector: capaz otra sigue abierta.
const WebCerrada = ({ sucursal = null }) => {
    const horario = textoHorarioWeb(sucursal);

    return (
        <div>
            <header>
                <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
                <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
            </header>
            <main>
                <div className='mainpageCS itemListConteiner'>
                    <h2 className="w-75 tituloCategoria">
                        {sucursal?.nombre ? `${sucursal.nombre}: ahora estamos cerrados` : "Ahora no estamos tomando pedidos"}
                    </h2>
                    <div className="text-white text-center py-4 px-3">
                        {horario && <p className="fw-bold fs-5">Tomamos pedidos {horario}.</p>}
                        <Link to="/crear-solicitud" className="btn btn-success">Ver otras sucursales</Link>
                    </div>
                </div>
            </main>
            <Footer sucursal={sucursal} />
        </div>
    );
};

export default WebCerrada;

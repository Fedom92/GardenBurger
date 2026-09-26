import React from "react";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import Footer from "./Footer";
import { textoHorarioWeb } from "../../Utils/fechaComercial";
import '../../style/Main.css';

// Fuera de horario la web no toma pedidos: ni se elige sucursal ni se arma el
// carrito. El seguimiento de un pedido (/ver-pedido) sigue abierto. No lee nada
// de Firestore. Sin link al menú: todavía no está terminado.
const WebCerrada = () => (
    <div>
        <header>
            <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
            <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
        </header>
        <main>
            <div className='mainpageCS itemListConteiner'>
                <h2 className="w-75 tituloCategoria">Ahora estamos cerrados</h2>
                <div className="text-white text-center py-4 px-3">
                    <p className="fw-bold fs-5 mb-0">Tomamos pedidos {textoHorarioWeb()}.</p>
                </div>
            </div>
        </main>
        <Footer />
    </div>
);

export default WebCerrada;

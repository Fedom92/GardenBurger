import React, { useEffect, useState } from "react";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import Footer from "./Footer";
import { textoHorarioWeb } from "../../Utils/fechaComercial";
import { fetchMenuPublico } from "../../Utils/menuPublico";
import '../../style/Main.css';

// Fuera de horario la web no toma pedidos: ni se elige sucursal ni se arma el
// carrito. El seguimiento de un pedido (/ver-pedido) sigue abierto. Sin link al
// menú: todavía no está terminado.
//
// Si el link trae la sucursal (/crear-solicitud/davinci), el pie muestra su
// dirección y teléfono: es justo cuando el cliente no puede pedir por la web. Salen
// de menu.json, en Storage: la pantalla de cerrado sigue sin leer Firestore.
const WebCerrada = ({ sucursal = null }) => {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        if (!sucursal) return;
        fetchMenuPublico()
            .then((menu) => setInfo(menu?.sucursales?.find((s) => s.id === sucursal) || null))
            // El pie va sin esos datos: lo importante de esta pantalla es el cartel.
            .catch(() => {});
    }, [sucursal]);

    return (
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
            <Footer sucursal={info} />
        </div>
    );
};

export default WebCerrada;

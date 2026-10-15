import React from "react";
import { Link } from "react-router-dom";
import { textoHorarioWeb, textoExcepcionWeb } from "../../Utils/fechaComercial";
import llama from "../../img/marca/ilustraciones/llama.webp";
import HeaderWeb from "./HeaderWeb";
import PieWeb from "./PieWeb";
import { BotonWhatsApp } from "./piezasWeb";
import "./webPublica.css";

// Una sucursal fuera de horario no toma pedidos por la web: no se arma el carrito.
// El seguimiento de un pedido (/ver-pedido) sigue abierto.
//
// `sucursal` es su documento (de menu.json, o de Firestore si el JSON falló), con
// el horario, la dirección y el teléfono para el pie: es justo cuando el cliente no
// puede pedir por la web. Cada sucursal tiene su horario, así que se ofrece volver
// al selector: capaz otra sigue abierta.
//
// Si hoy hay una excepción ("Hoy cerrado · Inventario", "Hoy de 20 a 23 hs") va
// primero: es lo que explica por qué hoy no es como siempre.
const WebCerrada = ({ sucursal = null }) => {
    const horario = textoHorarioWeb(sucursal);
    const excepcion = textoExcepcionWeb(sucursal);

    return (
        <div className="gb-web" data-bs-theme="dark">
            <HeaderWeb titulo={sucursal?.nombre} subtitulo="Cerrada" subtituloApagado />
            <main className="gb-col px-3 py-5 d-flex flex-column align-items-start gap-3">
                <img src={llama} alt="" className="gb-ilustracion-aviso" width="120" />
                <h1 className="gb-display gb-titulo">
                    {sucursal ? "Ahora estamos cerrados" : "Ahora no estamos tomando pedidos"}
                </h1>
                {excepcion && <p className="gb-ambar fw-bold">{excepcion}</p>}
                {horario && <p>Tomamos pedidos {horario}.</p>}
                <Link to="/crear-solicitud" className="btn btn-gb-claro px-4 mt-2 d-inline-flex align-items-center">
                    Ver otras sucursales
                </Link>
            </main>
            <PieWeb sucursal={sucursal} />
            <BotonWhatsApp sucursales={[sucursal]} />
        </div>
    );
};

export default WebCerrada;

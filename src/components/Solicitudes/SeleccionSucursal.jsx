import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchSucursales } from "../../Utils/sucursales";
import { fetchMenuPublico } from "../../Utils/menuPublico";
import { webRecibePedidos, textoHorarioWeb, textoExcepcionWeb, textoCorteWeb } from "../../Utils/fechaComercial";
import isotipo from "../../img/marca/logos/isotipo-lino.svg";
import { FOTO_SELECTOR } from "./contenidoWeb";
import PieWeb from "./PieWeb";
import CargandoWeb from "./CargandoWeb";
import { BotonWhatsApp } from "./piezasWeb";
import "./webPublica.css";

// Pantalla pública: el cliente elige la sucursal antes de armar su pedido.
// Los links con sucursal precargada (/crear-solicitud/luro) salteán esta pantalla.
//
// Cada sucursal tiene su horario, así que una puede estar abierta y la otra no: se
// listan todas, y la cerrada muestra cuándo toma pedidos. Las sucursales salen de
// menu.json, que está en Storage: elegir sucursal no lee Firestore. Solo si el
// JSON falla se leen de Firestore (2-3 lecturas).
const SeleccionSucursal = () => {
    const [sucursales, setSucursales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorCarga, setErrorCarga] = useState(false);

    useEffect(() => {
        fetchMenuPublico()
            .then((menu) => menu?.sucursales || fetchSucursales())
            .catch(() => fetchSucursales())
            .then((lista) => setSucursales(lista.filter((s) => s.activa !== false)))
            .catch((error) => {
                console.error("Error cargando sucursales:", error);
                setErrorCarga(true);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="gb-web" data-bs-theme="dark">
            <div className="gb-col">
                <div className="gb-hero-sucursal">
                    {FOTO_SELECTOR
                        ? <img src={FOTO_SELECTOR} alt="" className="gb-foto" />
                        : <div className="gb-foto-pendiente">Foto pendiente</div>}
                    <img src={isotipo} alt="Garden Burger" className="gb-hero-isotipo" width="56" height="54" />
                </div>
                <div className="gb-damero" aria-hidden="true" />

                <main className="px-3 pt-4">
                    <p className="gb-epigrafe mb-1">Garden Burger, sabemos lo que hacemos.</p>
                    <h1 className="gb-display gb-titulo mb-4">¿Donde querés pedir?</h1>

                    {loading ? (
                        <CargandoWeb />
                    ) : sucursales.length === 0 ? (
                        <p className="fw-bold">
                            {errorCarga
                                ? "No pudimos cargar las sucursales. Probá recargar la página."
                                : "No hay sucursales disponibles por el momento."}
                        </p>
                    ) : (
                        <ul className="list-unstyled d-grid gap-3 m-0">
                            {sucursales.map((s) => (
                                <li key={s.id}><TarjetaSucursal sucursal={s} /></li>
                            ))}
                        </ul>
                    )}
                </main>
            </div>
            <PieWeb />
            <BotonWhatsApp sucursales={sucursales} />
        </div>
    );
};

const Flecha = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

// Abierta: toda la tarjeta lleva al catálogo. Cerrada: no es un link, y dice
// cuándo toma pedidos (o la excepción de hoy, que explica por qué hoy no abre).
const TarjetaSucursal = ({ sucursal }) => {
    const nombre = sucursal.nombre || sucursal.id;
    const excepcion = textoExcepcionWeb(sucursal);

    if (webRecibePedidos(sucursal)) {
        const corte = textoCorteWeb(sucursal);
        return (
            <Link to={`/crear-solicitud/${sucursal.id}`} className="gb-sucursal">
                <span className="d-grid gap-1">
                    <span className="gb-display gb-sucursal-nombre">{nombre}</span>
                    {sucursal.direccion && <span>{sucursal.direccion}</span>}
                    <span className="gb-sucursal-estado">Abierta{corte && ` · pedidos ${corte}`}</span>
                    {/* Abierta por excepción (un feriado): que se sepa que hoy es distinto. */}
                    {excepcion && <span className="gb-sucursal-estado">{excepcion}</span>}
                </span>
                <span className="gb-sucursal-flecha"><Flecha /></span>
            </Link>
        );
    }

    const horario = textoHorarioWeb(sucursal);
    return (
        <div className="gb-sucursal is-cerrada">
            <span className="d-grid gap-1">
                <span className="gb-display gb-sucursal-nombre">{nombre}</span>
                {sucursal.direccion && <span>{sucursal.direccion}</span>}
                <span className="gb-sucursal-estado">
                    {excepcion || `Cerrada${horario ? ` · Pedidos ${horario}` : ""}`}
                </span>
            </span>
        </div>
    );
};

export default SeleccionSucursal;

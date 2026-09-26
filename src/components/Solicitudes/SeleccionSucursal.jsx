import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchSucursales } from "../../Utils/sucursales";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import Footer from "./Footer";
import '../../style/Main.css';
import { webRecibePedidos } from "../../Utils/fechaComercial";
import WebCerrada from "./WebCerrada";

// Pantalla pública: el cliente elige la sucursal antes de armar su pedido.
// Los links con sucursal precargada (/crear-solicitud/luro) salteán esta pantalla.
const SeleccionSucursal = () => {
    const [sucursales, setSucursales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorCarga, setErrorCarga] = useState(false);
    // Se decide al entrar: fuera de horario ni se eligen sucursales.
    const [abierta] = useState(webRecibePedidos);

    useEffect(() => {
        // Cerrada no lee nada: una visita fuera de horario no cuesta lecturas.
        if (!abierta) return;
        fetchSucursales()
            .then((lista) => setSucursales(lista.filter((s) => s.activa !== false)))
            .catch((error) => {
                console.error("Error cargando sucursales:", error);
                setErrorCarga(true);
            })
            .finally(() => setLoading(false));
    }, [abierta]);

    if (!abierta) return <WebCerrada />;

    if (loading) {
        return <p>Cargando...</p>;
    }

    return (
        <div>
            <header>
                <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
                <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
            </header>
            <main>
                <div className='mainpageCS itemListConteiner'>
                    <h2 className="w-75 tituloCategoria">Elegí tu sucursal</h2>
                    {sucursales.length === 0 ? (
                        <div className="text-white fw-bold text-center py-5">
                            {errorCarga
                                ? "No pudimos cargar las sucursales. Probá recargar la página."
                                : "No hay sucursales disponibles por el momento"}
                        </div>
                    ) : (
                        <div className="d-flex flex-column align-items-center gap-3 py-4 w-100">
                            {sucursales.map((s) => (
                                <Link
                                    key={s.id}
                                    to={`/crear-solicitud/${s.id}`}
                                    className="btn btn-success btn-lg w-75"
                                >
                                    {s.nombre || s.id}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SeleccionSucursal;

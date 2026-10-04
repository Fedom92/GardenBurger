import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchSucursales } from "../../Utils/sucursales";
import { fetchMenuPublico } from "../../Utils/menuPublico";
import logo from '../../img/logo_negro.webp';
import logoMobile from '../../img/logo_pub_mobile.webp';
import Footer from "./Footer";
import '../../style/Main.css';
import { webRecibePedidos, textoHorarioWeb } from "../../Utils/fechaComercial";

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
                            {sucursales.map((s) => webRecibePedidos(s) ? (
                                <Link
                                    key={s.id}
                                    to={`/crear-solicitud/${s.id}`}
                                    className="btn btn-success btn-lg w-75"
                                >
                                    {s.nombre || s.id}
                                </Link>
                            ) : (
                                <div key={s.id} className="btn btn-secondary btn-lg w-75 disabled" aria-disabled="true">
                                    {s.nombre || s.id}
                                    <small className="d-block fs-6">
                                        Cerrada{textoHorarioWeb(s) ? ` · Pedidos ${textoHorarioWeb(s)}` : ""}
                                    </small>
                                </div>
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

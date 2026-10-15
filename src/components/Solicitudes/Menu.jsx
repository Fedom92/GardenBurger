import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { fmtPesos } from "../../Utils/formato";
import { fetchCatalogoPublico } from "../../Utils/menuPublico";
import { armarCarta, capitalizar } from "./catalogo";
import imagotipo from "../../img/marca/logos/imagotipo-lino.svg";
import HeaderWeb from "./HeaderWeb";
import PieWeb from "./PieWeb";
import CargandoWeb from "./CargandoWeb";
import { BotonWhatsApp } from "./piezasWeb";
import "./webPublica.css";

// /menu: la carta siempre al día, para mandar el link o bajarla y subirla a los
// estados de WhatsApp sin rehacer un Canva cada vez que cambia un precio. Sale de
// menu.json, como el pedido web: verla no cuesta lecturas de Firestore.
const Menu = () => {
    const [catalogo, setCatalogo] = useState(null);
    const [errorCarga, setErrorCarga] = useState(false);
    // "imagen" o "pdf" mientras se arma el archivo.
    const [generando, setGenerando] = useState(null);
    const carta = useRef(null);

    useEffect(() => {
        let vigente = true;
        fetchCatalogoPublico()
            .then((c) => { if (vigente) setCatalogo(c); })
            .catch((error) => {
                console.error("Error cargando el menú:", error);
                if (vigente) setErrorCarga(true);
            });
        return () => { vigente = false; };
    }, []);

    const { hamburguesas, variantes, secciones } = useMemo(
        () => armarCarta(catalogo?.categorias, catalogo?.productos),
        [catalogo]
    );

    const exportar = async (formato) => {
        if (generando) return;
        setGenerando(formato);
        try {
            // html2canvas y jsPDF pesan y solo sirven para estos botones: bajan recién
            // al tocarlos, no con la página.
            const { descargarImagenes, descargarPDF } = await import("./exportarMenu");
            await (formato === "pdf" ? descargarPDF(carta.current) : descargarImagenes(carta.current));
        } catch (error) {
            console.error("Error exportando el menú:", error);
            toast.error("No se pudo generar el archivo. Revisá la conexión e intentá de nuevo.", { theme: "dark" });
        } finally {
            setGenerando(null);
        }
    };

    const vacia = !hamburguesas.length && !secciones.length;

    return (
        <div className="gb-web" data-bs-theme="dark">
            <HeaderWeb titulo="Menú">
                <Link to="/crear-solicitud" className="btn btn-gb px-3 d-inline-flex align-items-center">Pedir online</Link>
            </HeaderWeb>

            <main className="gb-col px-3 pt-4">
                {errorCarga ? (
                    <p className="fw-bold">No pudimos cargar el menú. Probá recargar la página.</p>
                ) : !catalogo ? (
                    <CargandoWeb bloques={4} alto={120} />
                ) : vacia ? (
                    <p className="fw-bold">No hay productos disponibles por el momento.</p>
                ) : (
                    <>
                        <div className="d-flex gap-2 mb-3">
                            <button type="button" className="btn btn-gb-claro flex-fill" onClick={() => exportar("imagen")}
                                disabled={Boolean(generando)}>
                                {generando === "imagen" ? "Generando…" : "Descargar imagen"}
                            </button>
                            <button type="button" className="btn btn-gb-claro flex-fill" onClick={() => exportar("pdf")}
                                disabled={Boolean(generando)}>
                                {generando === "pdf" ? "Generando…" : "Descargar PDF"}
                            </button>
                        </div>
                        <Carta ref={carta} hamburguesas={hamburguesas} variantes={variantes} secciones={secciones}
                            sucursales={catalogo.sucursales} />
                    </>
                )}
            </main>

            <PieWeb />
            <BotonWhatsApp sucursales={catalogo?.sucursales} />
        </div>
    );
};

// La carta: lo que se ve y lo que se exporta. Las marcas data-carta son para
// exportarMenu.js, que la reparte en páginas: la cabecera y el pie van en todas, y
// una sección partida repite su título.
//
// Las hamburguesas llevan un precio por variante: en columnas cuando la carta es
// ancha (la PC y las páginas exportadas) y debajo del nombre en el celular. Lo
// decide el CSS, con una consulta al ancho de la carta.
const Carta = ({ ref, hamburguesas, variantes, secciones, sucursales }) => (
    <article ref={ref} className="gb-carta" aria-label="Menú">
        <div className="gb-damero" aria-hidden="true" />
        <header className="gb-carta-cabecera" data-carta="cabecera">
            <img src={imagotipo} alt="Garden Burger" className="gb-carta-logo" width="160" height="75" />
            <p className="gb-epigrafe">Un clásico, pero bien hecho.</p>
        </header>

        <div className="gb-carta-cuerpo">
            {hamburguesas.length > 0 && (
                <section className="gb-carta-seccion" data-carta="seccion" style={{ "--variantes": variantes.length }}>
                    <div className="gb-carta-titulo" data-carta="titulo">
                        <h2 className="gb-display">{"//. Hamburguesas"}</h2>
                        <div className="gb-carta-variantes">
                            {variantes.map((v) => <span key={v}>{capitalizar(v)}</span>)}
                        </div>
                    </div>
                    {hamburguesas.map((h) => (
                        <div key={h.id} className="gb-carta-item gb-carta-hamburguesa" data-carta="item">
                            <Descripcion nombre={h.nombre} ingredientes={h.ingredientes} />
                            <div className="gb-carta-precios">
                                {variantes.map((v) => {
                                    const variante = h.variantes.find((x) => x.categoria === v);
                                    return (
                                        <span key={v} className="gb-carta-precio">
                                            <span className="gb-carta-precio-variante">{capitalizar(v)} </span>
                                            {variante ? fmtPesos(variante.precio) : "—"}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {secciones.map((s) => (
                <section key={s.id} className="gb-carta-seccion" data-carta="seccion">
                    <div className="gb-carta-titulo" data-carta="titulo">
                        <h2 className="gb-display">{`//. ${s.nombre}`}</h2>
                    </div>
                    {s.productos.map((p) => (
                        <div key={p.id} className="gb-carta-item" data-carta="item">
                            <Descripcion nombre={p.descripcion} ingredientes={p.ingredientes} />
                            <span className="gb-carta-precio">{fmtPesos(p.precio)}</span>
                        </div>
                    ))}
                </section>
            ))}
        </div>

        <footer className="gb-carta-pie" data-carta="pie">
            <p className="fw-bold">Todos los combos incluyen papas.</p>
            {sucursales.map((s) => (
                <p key={s.id}>{s.nombre}{s.direccion ? ` · ${s.direccion}` : ""}</p>
            ))}
            <p>Pedí online en <span className="gb-ambar fw-bold">{window.location.host}/crear-solicitud</span></p>
        </footer>
        <div className="gb-damero" aria-hidden="true" />
    </article>
);

const Descripcion = ({ nombre, ingredientes }) => (
    <div className="gb-carta-descripcion">
        <h3 className="gb-carta-nombre">{nombre}</h3>
        {ingredientes && <p className="gb-carta-ingredientes">{ingredientes}</p>}
    </div>
);

export default Menu;

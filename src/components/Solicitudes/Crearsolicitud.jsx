import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../firebaseConfig/firebase";
import { fmtPesos } from "../../Utils/formato";
import { fetchMenuPublico, fetchCatalogoPublico } from "../../Utils/menuPublico";
import { webRecibePedidos, textoCorteWeb } from "../../Utils/fechaComercial";
import { armarSecciones, extrasDe, abreFicha, capitalizar } from "./catalogo";
import { useCarritoWeb, nuevaLinea, totalCarrito, cantidadProductos, lineaSimpleDe } from "./carritoWeb";
import { FOTO_CATALOGO } from "./contenidoWeb";
import { ilustracion } from "./ilustraciones";
import HeaderWeb from "./HeaderWeb";
import PieWeb from "./PieWeb";
import CargandoWeb from "./CargandoWeb";
import WebCerrada from "./WebCerrada";
import ProductoCard from "./ProductoCard";
import FichaProducto from "./FichaProducto";
import TuPedido from "./TuPedido";
import { BotonCarrito, BotonWhatsApp, Cantidad, Icono } from "./piezasWeb";
import "./webPublica.css";

const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

// Un aviso por cada vez que se agrega algo, no uno por línea: antes una hamburguesa
// con tres extras eran cuatro "Producto agregado!".
const avisarAgregado = (nombre) =>
    toast.success(`${nombre}: agregado a tu pedido`, { autoClose: 2000, theme: "dark", position: "bottom-center" });

// La página del pedido web: el catálogo filtrado por categoría, la ficha de cada
// producto y "Tu pedido" con el formulario. Lo que cuesta en Firestore: nada al
// navegar —la sucursal y el catálogo salen de menu.json— y 1 lectura más 1
// escritura al confirmar (ver TuPedido).
const CrearSolicitud = () => {
    // Sucursal elegida por el cliente (viene en la URL, ej: /crear-solicitud/luro)
    const { sucursal } = useParams();

    // La sucursal de la URL: su horario decide si la web toma pedidos, y su dirección
    // y teléfono van al pie. `abierta` es undefined mientras se carga.
    const [sucursalInfo, setSucursalInfo] = useState(null);
    const [abierta, setAbierta] = useState(undefined);
    const [catalogo, setCatalogo] = useState(null);
    const [errorCarga, setErrorCarga] = useState(false);
    const [seccionElegida, setSeccionElegida] = useState(null);
    const [ficha, setFicha] = useState(null);
    const tituloSeccion = useRef(null);
    const { carrito, agregarLinea, quitarLinea, sumar, restar, vaciar, actualizarPrecios } = useCarritoWeb(sucursal);

    // Desde el selector se llega con la página scrolleada: el catálogo arranca arriba.
    useEffect(() => { window.scrollTo(0, 0); }, [sucursal]);

    // La sucursal sale de menu.json, en Storage: decidir si abre no lee Firestore. Si
    // el JSON falla o todavía no la tiene (una sucursal nueva sin publicar), se lee su
    // documento: 1 lectura, solo en ese caso. Sin sucursal, queda cerrada. Una
    // desactivada tampoco está en el JSON, y por el link directo no tiene que abrir.
    useEffect(() => {
        let vigente = true;
        const leerDocumento = () => getDoc(doc(db, "sucursales", sucursal))
            .then((d) => (d.exists() && d.data().activa !== false ? { id: d.id, ...d.data() } : null));

        fetchMenuPublico()
            .then((menu) => menu?.sucursales?.find((s) => s.id === sucursal) || leerDocumento())
            .catch(() => leerDocumento())
            .catch(() => null)
            .then((info) => {
                if (!vigente) return;
                setSucursalInfo(info);
                setAbierta(webRecibePedidos(info));
            });

        return () => { vigente = false; };
    }, [sucursal]);

    // Cerrada no carga el catálogo: fuera de horario la visita no cuesta nada.
    useEffect(() => {
        if (!abierta) return;
        let vigente = true;
        fetchCatalogoPublico()
            .then((c) => { if (vigente) setCatalogo(c); })
            .catch((error) => {
                console.error("Error cargando el catálogo:", error);
                if (vigente) setErrorCarga(true);
            });
        return () => { vigente = false; };
    }, [abierta]);

    // El carrito guardado en el navegador (el de esta sucursal) toma los precios del
    // menú vigente.
    useEffect(() => {
        if (!catalogo) return;
        const quitadas = actualizarPrecios(catalogo.productos);
        if (quitadas > 0) toast.info("Sacamos de tu pedido lo que ya no está en el menú.", { theme: "dark" });
    }, [catalogo, actualizarPrecios, sucursal]);

    const secciones = useMemo(
        () => (catalogo ? armarSecciones(catalogo.categorias, catalogo.productos) : []),
        [catalogo]
    );
    const activa = secciones.find((s) => s.id === seccionElegida) || secciones[0];

    if (abierta === false) return <WebCerrada sucursal={sucursalInfo} />;

    const elegirSeccion = (id) => {
        setSeccionElegida(id);
        // Si el título de la sección quedó fuera de la vista, se baja hasta él; si se
        // ve, no se mueve nada.
        requestAnimationFrame(() => {
            const titulo = tituloSeccion.current;
            if (!titulo) return;
            const { top } = titulo.getBoundingClientRect();
            if (top < 72 || top > window.innerHeight - 160) titulo.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const agregarProducto = (producto) => {
        const grupos = extrasDe(producto, catalogo.productos);
        if (abreFicha(producto, grupos)) {
            setFicha({ producto, grupos, clave: `${producto.id}-${Date.now()}` });
            return;
        }
        // Sin nada que elegir: directo al carrito. Una hamburguesa agrupada con una
        // sola variante se agrega como esa variante.
        const real = producto.variantes ? producto.variantes[0] : producto;
        agregarLinea(nuevaLinea(real));
        avisarAgregado(producto.variantes ? `${producto.nombre} ${capitalizar(real.categoria)}` : real.descripcion);
    };

    const corte = textoCorteWeb(sucursalInfo);
    const cargando = abierta === undefined || (!catalogo && !errorCarga);

    return (
        <div className="gb-web" data-bs-theme="dark">
            <HeaderWeb titulo={sucursalInfo?.nombre} subtitulo={abierta ? `Abierta ${corte}`.trim() : ""}>
                <BotonCarrito cantidad={cantidadProductos(carrito)} total={totalCarrito(carrito)} onClick={() => irA("tu-pedido")} />
            </HeaderWeb>

            <main className="gb-col">
                {FOTO_CATALOGO && (
                    <div className="gb-hero-catalogo"><img src={FOTO_CATALOGO} alt="" className="gb-foto" /></div>
                )}
                <div className="px-3 pt-4">
                    <p className="gb-epigrafe mb-1">Un clásico, pero bien hecho.</p>
                    <h1 className="gb-display gb-titulo-catalogo">¿Qué vas a comer hoy?</h1>
                </div>

                {cargando ? (
                    <div className="px-3 pt-4"><CargandoWeb bloques={3} alto={150} /></div>
                ) : errorCarga ? (
                    <p className="px-3 pt-4 fw-bold">No pudimos cargar el menú. Probá recargar la página.</p>
                ) : !secciones.length ? (
                    <p className="px-3 pt-4 fw-bold">No hay productos disponibles por el momento.</p>
                ) : (
                    <>
                        <FiltroCategorias secciones={secciones} activa={activa.id} onElegir={elegirSeccion} />

                        <section className="px-3 pt-4" aria-labelledby="titulo-seccion">
                            <h2 id="titulo-seccion" ref={tituloSeccion} className="gb-display gb-titulo-seccion gb-ancla mb-3">
                                {`//. ${activa.nombre}`}
                            </h2>

                            {activa.esBebidas ? (
                                <ListaBebidas productos={activa.productos} carrito={carrito} onAgregar={agregarProducto}
                                    onSumar={sumar} onRestar={restar} onQuitar={quitarLinea} />
                            ) : (
                                <div className="row row-cols-2 row-cols-md-3 gb-grilla">
                                    {activa.productos.map((p) => (
                                        <div className="col" key={p.id}>
                                            <ProductoCard producto={p} onAgregar={agregarProducto} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="px-3 pt-5">
                            <TuPedido sucursal={sucursal} sucursalInfo={sucursalInfo} envios={catalogo.envios} carrito={carrito}
                                quitarLinea={quitarLinea} sumar={sumar} restar={restar} vaciar={vaciar}
                                onVolverAlMenu={() => irA("menu")} />
                        </div>
                    </>
                )}
            </main>

            <PieWeb sucursal={sucursalInfo} />
            <BotonWhatsApp sucursales={[sucursalInfo]} />

            {ficha && (
                <FichaProducto key={ficha.clave} ficha={ficha} onCerrada={() => setFicha(null)}
                    onAgregar={(linea, nombre) => { agregarLinea(linea); avisarAgregado(nombre); }} />
            )}
        </div>
    );
};

// "Hambur-guesas", el corte del diseño, con un guion suave: hyphens:auto depende
// del diccionario del navegador y, sin él, partía en cualquier letra ("Hamburg-uesas").
// Donde entra entera, el guion no se ve.
const nombreTarjeta = (seccion) => (seccion.id === "hamburguesas" ? "Hambur­guesas" : seccion.nombre);

// Las tarjetas de categoría: filtran, no navegan. La activa, en ámbar. Hamburguesas
// ocupa dos columnas cuando así se completan las filas de tres (con Ofertas
// adelante, también: Ofertas en la primera columna y Hamburguesas en las otras dos).
const FiltroCategorias = ({ secciones, activa, onElegir }) => {
    const hayAncha = (secciones.length + 1) % 3 === 0;
    return (
        <section id="menu" className="gb-categorias gb-ancla px-3 pt-4" aria-label="Categorías">
            {secciones.map((s) => {
                const ancha = hayAncha && s.id === "hamburguesas";
                return (
                    <button key={s.id} type="button" aria-pressed={s.id === activa}
                        className={`gb-categoria ${ancha ? "is-ancha" : ""}`} onClick={() => onElegir(s.id)}>
                        <img src={ilustracion(s.ilustracion)} alt="" className="gb-categoria-ilustracion" />
                        <span className={ancha ? "gb-display gb-categoria-nombre-ancha" : "gb-categoria-nombre"}>{nombreTarjeta(s)}</span>
                    </button>
                );
            })}
        </section>
    );
};

// Las bebidas van en lista: nombre, precio y "+". Si ya está en el pedido, sus
// botones de cantidad en lugar del "+" (en 1, la ✕ la saca).
const ListaBebidas = ({ productos, carrito, onAgregar, onSumar, onRestar, onQuitar }) => (
    <ul className="list-unstyled mb-0">
        {productos.map((p) => {
            const linea = lineaSimpleDe(carrito, p.id);
            return (
                <li key={p.id} className="gb-lista-fila">
                    <div className="flex-grow-1">
                        <p className="fw-semibold">{p.descripcion}</p>
                        <p className="gb-ambar fw-bold small">{fmtPesos(p.precio)}</p>
                    </div>
                    {linea ? (
                        <Cantidad valor={linea.cantidad} nombre={p.descripcion}
                            onMenos={() => onRestar(linea.lineaId)} onQuitar={() => onQuitar(linea.lineaId)}
                            onMas={() => onSumar(linea.lineaId)} />
                    ) : (
                        <button type="button" className="gb-boton-mas" onClick={() => onAgregar(p)} aria-label={`Agregar ${p.descripcion}`}>
                            <Icono nombre="mas" />
                        </button>
                    )}
                </li>
            );
        })}
    </ul>
);

export default CrearSolicitud;

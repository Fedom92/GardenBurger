import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { ESTADOS, ENVIOS_LOCALES, METODOS_PAGO, etiquetaPago, getCurrentStepIndex } from "../../Utils/Constantes";
import { fmtPesos } from "../../Utils/formato";
import { agruparExtras } from "../../Utils/agruparExtras";
import { fetchMenuPublico } from "../../Utils/menuPublico";
import { capitalizar } from "./catalogo";
import { FOTO_COCINA } from "./contenidoWeb";
import { ilustracion } from "./ilustraciones";
import HeaderWeb from "./HeaderWeb";
import PieWeb from "./PieWeb";
import CargandoWeb from "./CargandoWeb";
import { BotonWhatsApp, Icono, Subtitulo } from "./piezasWeb";
import "./webPublica.css";

const RECARGO_MP = process.env.REACT_APP_recargoMP;

// Una etiqueta por cada paso de FLUJO_PUB_ESTADOS, en el mismo orden.
const ETAPAS_RETIRO = ["Recibido", "Confirmado", "En cocina", "Listo", "Retirado"];
const ETAPAS_DELIVERY = ["Recibido", "Confirmado", "En cocina", "En camino", "Entregado"];

// Cómo se lee cada forma de entrega. Las claves son los valores que guardan la web
// y la Caja: el cliente nunca ve "Retira" ni "delivery" crudos.
const ETIQUETA_ENTREGA = {
    [ENVIOS_LOCALES[0]]: "Retiro en el local",
    [ENVIOS_LOCALES[1]]: "Te esperamos afuera",
    delivery: "Delivery",
};

// Manda lo que cargó la Caja (envio.zona_envio, por donde rutea la Cocina);
// mientras no lo cargue, lo que eligió el cliente en la web.
const entregaDe = (pedido) => {
    if (!pedido.envio) return pedido.cliente.opcion;
    return ENVIOS_LOCALES.includes(pedido.envio.zona_envio) ? pedido.envio.zona_envio : "delivery";
};

// El título y la línea de cada estado.
const textoDelEstado = (estado, esRetiro, esperaTransferencia) => {
    if (esperaTransferencia) {
        return ["Esperando tu transferencia",
            "Elegiste MercadoPago: en cuanto llegue la transferencia confirmamos el pedido y lo mandamos a la cocina."];
    }
    switch (estado) {
        case ESTADOS.CONFIRMADO:
            return ["Confirmamos tu pedido", "Ya está en la fila de la cocina."];
        case ESTADOS.COCINA:
            return ["Lo estamos preparando", esRetiro
                ? "Tu pedido ya está en la plancha. Cuando esté listo para retirar, lo vas a ver acá."
                : "Tu pedido ya está en la plancha. Cuando salga para tu casa, lo vas a ver acá."];
        case ESTADOS.ATP:
        case ESTADOS.DELIVERY:
            return esRetiro ? ["Listo para retirar", "Ya podés pasar a buscarlo."] : ["En camino", "Salió para tu casa."];
        case ESTADOS.FINAL:
            return ["¡Que lo disfrutes!", "Gracias por elegirnos."];
        default:
            return ["Recibimos tu pedido", "La sucursal lo va a confirmar en unos minutos."];
    }
};

const subtotalDe = (linea) => Number(linea.subtotal) || (Number(linea.precio) || 0) * (Number(linea.cantidad) || 1);

// "1123456789" -> "11 2345 6789". Solo los de característica 11: con otra (223,
// 2965…) los grupos son otros, y mal partido se lee peor que entero.
const fmtCelular = (telefono = "") =>
    /^11\d{8}$/.test(telefono) ? `${telefono.slice(0, 2)} ${telefono.slice(2, 6)} ${telefono.slice(6)}` : telefono;

// El seguimiento de un pedido web: el link que el cliente recibe al confirmar.
// Cuesta una lectura por visita, el getDoc del pedido. No se actualiza solo: para
// ver un cambio de estado se recarga la página (un onSnapshot cobraría cada cambio
// a cada cliente con la página abierta). Los datos de la sucursal —nombre,
// dirección, el teléfono cuando no hay pedido— salen de menu.json, sin lecturas.
const PaginaDetalle = () => {
    const { sucursal, id } = useParams();
    // undefined mientras carga; null si no existe o el link venció.
    const [pedido, setPedido] = useState(undefined);
    const [errorCarga, setErrorCarga] = useState(false);
    const [intento, setIntento] = useState(0);
    const [sucursalInfo, setSucursalInfo] = useState(null);

    // Se llega desde "Confirmar pedido", con la página del pedido scrolleada hasta
    // abajo: el seguimiento arranca desde arriba.
    useEffect(() => { window.scrollTo(0, 0); }, [sucursal, id]);

    useEffect(() => {
        let vigente = true;
        getDoc(doc(db, "sucursales", sucursal, "pedidos", id))
            .then((snap) => { if (vigente) setPedido(snap.exists() ? snap.data() : null); })
            .catch((error) => {
                if (!vigente) return;
                // Las reglas niegan con el mismo permission-denied el link vencido
                // (48 h) y el que no existe: para el cliente es lo mismo.
                if (error.code === "permission-denied") {
                    setPedido(null);
                } else {
                    console.error("Error obteniendo el pedido:", error);
                    setErrorCarga(true);
                }
            });
        return () => { vigente = false; };
    }, [sucursal, id, intento]);

    useEffect(() => {
        let vigente = true;
        fetchMenuPublico()
            .then((menu) => { if (vigente) setSucursalInfo(menu?.sucursales?.find((s) => s.id === sucursal) || null); })
            // Sin menu.json el seguimiento anda igual, sin la dirección del local ni el pie.
            .catch(() => {});
        return () => { vigente = false; };
    }, [sucursal]);

    // Cada reintento es una lectura, y solo si el cliente lo pide.
    const reintentar = () => {
        setErrorCarga(false);
        setIntento((n) => n + 1);
    };

    const telefono = pedido?.telefonoSucursal || sucursalInfo?.telefono || "";
    // El mensaje del pedido, el mismo que se abrió al confirmar: si el navegador
    // bloqueó WhatsApp, se manda desde acá. Sin pedido, una consulta.
    const mensaje = pedido?.mensajeWsp ? decodeURIComponent(pedido.mensajeWsp) : "Hola, tengo una consulta por mi pedido.";
    // Sin `cliente` es un pedido de la Caja: solo lo puede abrir alguien del staff.
    const seguible = Boolean(pedido?.cliente);

    let contenido;
    if (errorCarga) {
        contenido = (
            <Aviso titulo="No pudimos cargar tu pedido" texto="Revisá tu conexión y probá de nuevo.">
                <button type="button" className="btn btn-gb gb-boton-grande" onClick={reintentar}>Reintentar</button>
            </Aviso>
        );
    } else if (pedido === undefined) {
        contenido = <div className="px-3 pt-4"><CargandoWeb bloques={3} alto={140} /></div>;
    } else if (!seguible) {
        contenido = (
            <Aviso epigrafe={pedido ? "" : "¡Esperamos que lo hayas disfrutado!"}
                titulo={pedido ? "Este pedido no se puede seguir desde acá" : "Este pedido ya no está disponible"}>
                <Link to={`/crear-solicitud/${sucursal}`} className="btn btn-gb gb-boton-grande">Hacer un pedido</Link>
            </Aviso>
        );
    } else if (pedido.estado === ESTADOS.CANCELADO || pedido.estado === ESTADOS.ELIMINADO) {
        contenido = <PedidoCancelado pedido={pedido} sucursal={sucursal} conWhatsApp={Boolean(telefono)} />;
    } else {
        contenido = <Seguimiento pedido={pedido} sucursal={sucursal} sucursalInfo={sucursalInfo} />;
    }

    return (
        <div className="gb-web" data-bs-theme="dark">
            {seguible ? (
                // El código es el de la Caja: existe desde que el cajero confirma el pedido.
                <HeaderWeb antetitulo={`Pedido en ${sucursalInfo?.nombre || capitalizar(sucursal)}`}
                    titulo={pedido.codigo ? <>Código <span className="gb-ambar">#{pedido.codigo}</span></> : "Seguimiento de pedido"} />
            ) : (
                <HeaderWeb titulo="Seguimiento de pedido" />
            )}
            <main className="gb-col">{contenido}</main>
            <PieWeb sucursal={sucursalInfo} />
            <BotonWhatsApp sucursales={[{ ...sucursalInfo, telefono }]} mensaje={mensaje} />
        </div>
    );
};

const Seguimiento = ({ pedido, sucursal, sucursalInfo }) => {
    const { cliente, estado } = pedido;
    // Lo que cargó la Caja al confirmar manda sobre lo que escribió el cliente: el
    // cajero pudo corregir un dato o cambiar la forma de pago.
    const metodoPago = pedido.metodoPago || cliente.metodoPago;
    const nombre = pedido.nombre || cliente.nombre;
    const direccion = pedido.direccion || cliente.direccion;
    const entreCalles = pedido.entreCalles || cliente.entreCalles;
    const entrega = entregaDe(pedido);
    const esRetiro = entrega !== "delivery";

    const esperaTransferencia = estado === ESTADOS.PENDIENTEMP
        || (estado === ESTADOS.WEB_PENDIENTE && metodoPago === METODOS_PAGO.MP.key);
    const [titulo, texto] = textoDelEstado(estado, esRetiro, esperaTransferencia);

    return (
        <div className="px-3 pt-4">
            <p className="gb-epigrafe">¡Gracias, {nombre}!</p>
            <h1 className="gb-display gb-titulo mt-1">{titulo}</h1>
            <p className="gb-muted mt-2">{texto}</p>

            <Etapas estado={estado} esRetiro={esRetiro} />

            {estado === ESTADOS.COCINA && FOTO_COCINA && (
                <div className="gb-banda-foto mt-3"><img src={FOTO_COCINA} alt="" className="gb-foto" /></div>
            )}
            {esperaTransferencia && <CajaTransferencia pedido={pedido} metodoPago={metodoPago} esRetiro={esRetiro} />}

            <Subtitulo numero="01">Tu pedido</Subtitulo>
            <div className="gb-tarjeta">
                <LineasPedido carrito={pedido.carrito} />
                <Totales pedido={pedido} metodoPago={metodoPago} esRetiro={esRetiro} />
                <dl className="gb-datos">
                    <Dato etiqueta="Entrega">{ETIQUETA_ENTREGA[entrega] || entrega}</Dato>
                    <Dato etiqueta="Pago">{etiquetaPago(metodoPago)}</Dato>
                    {esRetiro ? (
                        sucursalInfo?.direccion && <Dato etiqueta="Dónde retirás" ancho>{sucursalInfo.direccion}</Dato>
                    ) : (
                        <Dato etiqueta="Dirección" ancho>
                            {[direccion, entreCalles && `entre ${entreCalles}`].filter(Boolean).join(" · ")}
                        </Dato>
                    )}
                    <Dato etiqueta="A nombre de">{nombre}</Dato>
                    <Dato etiqueta="Celular">{fmtCelular(pedido.telefono || cliente.telefono)}</Dato>
                </dl>
            </div>

            <Link to={`/crear-solicitud/${sucursal}`} className="btn btn-gb gb-boton-grande mt-4">Hacer otro pedido</Link>
        </div>
    );
};

// Los cinco pasos, en horizontal. Entregado es el último y ya está hecho: no queda
// ninguno en curso.
const Etapas = ({ estado, esRetiro }) => {
    const actual = getCurrentStepIndex(estado);
    const terminado = estado === ESTADOS.FINAL;
    return (
        <section aria-label="Estado del pedido" className="mt-4">
            <ol className="gb-etapas">
                {(esRetiro ? ETAPAS_RETIRO : ETAPAS_DELIVERY).map((etiqueta, i) => {
                    const hecha = terminado || i < actual;
                    const enCurso = !terminado && i === actual;
                    return (
                        <li key={etiqueta} className={`gb-etapa ${hecha ? "is-hecha" : ""} ${enCurso ? "is-actual" : ""}`}
                            aria-current={enCurso ? "step" : undefined}>
                            <span className="gb-etapa-circulo">{hecha && <Icono nombre="check" tamanio={16} />}</span>
                            {etiqueta}
                            {hecha && <span className="visually-hidden"> (hecho)</span>}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

// Cuánto transferir. Con un delivery todavía sin confirmar falta el envío, que lo
// suma el cajero según la zona: ahí el monto no se puede dar.
const CajaTransferencia = ({ pedido, metodoPago, esRetiro }) => {
    const montoConocido = pedido.estado === ESTADOS.PENDIENTEMP || esRetiro;
    // Con el pago dividido se transfiere solo la parte de MercadoPago.
    const monto = metodoPago === METODOS_PAGO.DIVIDIDO.key
        ? pedido.total - (Number(pedido.montoEfectivo) || 0)
        : pedido.total;
    return (
        <div className="gb-pago mt-3">
            {montoConocido ? (
                <>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                        <span className="fw-bold">Monto a transferir</span>
                        <span className="gb-display gb-pago-monto">{fmtPesos(monto)}</span>
                    </div>
                    <p className="gb-muted mt-2">
                        Te pasamos el alias por WhatsApp. Si ya transferiste, mandanos el comprobante por ahí.
                    </p>
                </>
            ) : (
                <p className="gb-muted">Cuando confirmemos el envío te pasamos por WhatsApp el monto y el alias.</p>
            )}
        </div>
    );
};

// Cada extra debajo del producto que tiene arriba, como lo arman la Caja y la web.
const LineasPedido = ({ carrito = [] }) => (
    <ul className="list-unstyled mb-0">
        {agruparExtras(carrito).map(({ principal, extras }, i) => (
            <li key={i} className="gb-fila">
                <div className="gb-fila-titulo">
                    <span>{principal.cantidad || 1} × {principal.descripcion}</span>
                    <span className="gb-fila-precio">
                        {fmtPesos(extras.reduce((t, e) => t + subtotalDe(e), subtotalDe(principal)))}
                    </span>
                </div>
                {extras.length > 0 && (
                    <p className="gb-fila-extras">
                        {extras.map((e) => `+ ${e.cantidad > 1 ? `${e.cantidad} × ` : ""}${capitalizar(e.descripcion)}`).join(" · ")}
                    </p>
                )}
                {principal.observaciones && <p className="gb-nota">“{principal.observaciones}”</p>}
            </li>
        ))}
    </ul>
);

const textoEnvio = (pedido, esRetiro) => {
    if (esRetiro) return null;
    // Todavía no lo confirmó la Caja: la web no sabe la zona.
    if (!pedido.envio) return "lo suma la sucursal según tu zona";
    const envio = Number(pedido.envio.costo_envio) || 0;
    return envio > 0 ? fmtPesos(envio) : "sin cargo";
};

// El total no se recalcula: es el que se guardó. El recargo se muestra como
// porcentaje, igual que en "Tu pedido": su monto ya está en el total. Sin envío ni
// recargo va directo al total.
const Totales = ({ pedido, metodoPago, esRetiro }) => {
    const total = Number(pedido.total) || 0;
    const productos = (pedido.carrito || []).reduce((t, l) => t + subtotalDe(l), 0);
    const envio = Number(pedido.envio?.costo_envio) || 0;
    const conRecargo = metodoPago === METODOS_PAGO.MP.key || metodoPago === METODOS_PAGO.DIVIDIDO.key;
    const recargo = conRecargo ? Math.max(0, total - productos - envio) : 0;
    const filas = [
        ["Productos", fmtPesos(productos)],
        textoEnvio(pedido, esRetiro) && ["Envío", textoEnvio(pedido, esRetiro)],
        recargo > 0 && ["Recargo MercadoPago", `+${RECARGO_MP}%`],
    ].filter(Boolean);

    return (
        <>
            {filas.length > 1 && (
                <div className="gb-totales">
                    {filas.map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="gb-resumen-fila"><span>{etiqueta}</span><span>{valor}</span></div>
                    ))}
                </div>
            )}
            <div className="gb-total">
                <span className="gb-display gb-resumen-total-etiqueta">Total</span>
                <span className="gb-display gb-resumen-total-monto">{fmtPesos(total)}</span>
            </div>
        </>
    );
};

const Dato = ({ etiqueta, ancho = false, children }) => (
    <div className={ancho ? "gb-dato-ancho" : undefined}>
        <dt>{etiqueta}</dt>
        <dd>{children}</dd>
    </div>
);

// Cancelado o eliminado: sin pasos, lo que había pedido tachado y la invitación a
// armar otro. Las dudas, por el botón de WhatsApp.
const PedidoCancelado = ({ pedido, sucursal, conWhatsApp }) => (
    <div className="px-3 pt-4">
        <div className="gb-cancelado-icono" aria-hidden="true"><Icono nombre="cruz" tamanio={30} /></div>
        <h1 className="gb-display gb-titulo mt-4">Tu pedido fue cancelado</h1>
        {conWhatsApp && <p className="gb-muted mt-2">Si tenés dudas, escribinos por WhatsApp.</p>}
        <Link to={`/crear-solicitud/${sucursal}`} className="btn btn-gb gb-boton-grande mt-4">Armar un pedido nuevo</Link>
        <div className="gb-tarjeta is-tachada mt-4">
            <p className="gb-paso mt-3 mb-0">Lo que habías pedido</p>
            <LineasPedido carrito={pedido.carrito} />
        </div>
    </div>
);

// Cuando no hay pedido para mostrar: el link venció, no existe, no es de la web o
// no se pudo leer.
const Aviso = ({ epigrafe, titulo, texto, children }) => (
    <div className="px-3 pt-5 d-flex flex-column align-items-center text-center">
        <img src={ilustracion("bolsa")} alt="" width="120" className="gb-ilustracion-aviso" />
        {epigrafe && <p className="gb-epigrafe mt-4">{epigrafe}</p>}
        <h1 className={`gb-display gb-titulo ${epigrafe ? "mt-2" : "mt-4"}`}>{titulo}</h1>
        {texto && <p className="gb-muted mt-2">{texto}</p>}
        <div className="w-100 mt-4">{children}</div>
    </div>
);

export default PaginaDetalle;

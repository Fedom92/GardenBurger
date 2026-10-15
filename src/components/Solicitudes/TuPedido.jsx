import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { FaMoneyBillWave, FaStore, FaUser, FaMobileAlt, FaMapMarkerAlt, FaMapSigns } from "react-icons/fa";
import { MdDeliveryDining } from "react-icons/md";
import { db } from "../../firebaseConfig/firebase";
import { ENVIOS_LOCALES, METODOS_PAGO } from "../../Utils/Constantes";
import { fmtPesos } from "../../Utils/formato";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { webRecibePedidos, textoHorarioWeb, textoExcepcionWeb } from "../../Utils/fechaComercial";
import { capitalizar } from "./catalogo";
import {
    precioLinea, totalCarrito, totalConPago, armarSolicitud, mensajeWhatsApp, MAX_LINEAS_SOLICITUD,
} from "./carritoWeb";
import { Cantidad, Icono, Subtitulo, urlWhatsApp } from "./piezasWeb";
import logoMP from "../../img/mercado-pago.webp";

const RECARGO_MP = process.env.REACT_APP_recargoMP;

// Las confirmaciones de la web pública: con los colores de la marca, no los del staff.
const confirmar = (titulo, texto, boton) => Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: boton,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c62b12",
    cancelButtonColor: "#5c5752",
    background: "#322f2d",
    color: "#fcf5ed",
});

// "Tu pedido": lo que el cliente eligió, cómo lo recibe, sus datos, cómo paga y el
// resumen con el botón de confirmar. Vive en la misma página que el catálogo; el
// botón del carrito de la cabecera trae hasta acá.
const TuPedido = ({ sucursal, sucursalInfo, carrito, quitarLinea, sumar, restar, vaciar, onVolverAlMenu }) => {
    const [errorEnvio, setErrorEnvio] = useState("");
    // Un useState no alcanza: entre dos toques rápidos el botón todavía figura
    // habilitado y salían DOS solicitudes con ids distintos, que el cajero ve
    // duplicadas en F1. useAccionUnica corta en el mismo tick.
    const { procesando, ejecutar } = useAccionUnica();
    const navigate = useNavigate();

    // shouldUnregister: al volver de Delivery a Retiro, dirección y entre calles se
    // olvidan (antes viajaban igual). armarSolicitud tampoco las manda con Retiro.
    const { register, handleSubmit, watch, formState: { errors } } = useForm({ shouldUnregister: true });
    const opcion = watch("opcion");
    const metodoPago = watch("metodoPago");

    const total = totalCarrito(carrito);
    const totalFinal = totalConPago(total, metodoPago, RECARGO_MP);
    const nombreSucursal = sucursalInfo?.nombre || sucursal;

    const avisarCerrada = (datosSucursal) => {
        const horario = textoHorarioWeb(datosSucursal);
        // Si hoy hay una excepción, explica mejor que el horario de siempre.
        const excepcion = textoExcepcionWeb(datosSucursal);
        setErrorEnvio(excepcion
            ? `Ya no estamos tomando pedidos. ${excepcion}.`
            : horario ? `Ya no estamos tomando pedidos. Tomamos pedidos ${horario}.` : "Ya no estamos tomando pedidos.");
    };

    const comprar = (datos) => ejecutar(async () => {
        setErrorEnvio("");
        // Con lo que ya está en memoria, sin leer nada: la página pudo quedar abierta
        // pasado el corte.
        if (!webRecibePedidos(sucursalInfo)) {
            avisarCerrada(sucursalInfo);
            return;
        }

        const solicitud = armarSolicitud(datos, carrito, RECARGO_MP);
        if (solicitud.carrito.length > MAX_LINEAS_SOLICITUD) {
            setErrorEnvio("Tu pedido es muy grande para la web. Escribinos por WhatsApp y te lo tomamos por ahí.");
            return;
        }

        const nuevoPedido = doc(collection(db, "sucursales", sucursal, "pedidos"));
        const texto = mensajeWhatsApp(solicitud.cliente, `${window.location.origin}/ver-pedido/${sucursal}/${nuevoPedido.id}`);
        const mensajeWsp = encodeURIComponent(texto);

        try {
            // La sucursal viene de la URL sin validar: /crear-solicitud/loquesea creaba
            // una subcolección huérfana bajo un documento que no existe, y ese pedido no
            // lo veía nadie. Una lectura de un solo documento, solo al confirmar.
            const sucursalDoc = await getDoc(doc(db, "sucursales", sucursal));
            if (!sucursalDoc.exists() || sucursalDoc.data().activa === false) {
                setErrorEnvio("La sucursal de este link no está disponible. Volvé a elegirla y armá el pedido de nuevo.");
                return;
            }

            // El horario se vuelve a mirar con el documento recién leído, sin lecturas
            // extra: el de menu.json puede estar viejo si el admin lo cambió y todavía no
            // publicó el menú.
            if (!webRecibePedidos(sucursalDoc.data())) {
                avisarCerrada(sucursalDoc.data());
                return;
            }

            // El teléfono de ESTA sucursal sale del documento que se acaba de leer, sin
            // lecturas extra. Queda en la solicitud para que /ver-pedido arme su botón de
            // WhatsApp sin leer la sucursal.
            const telefonoSucursal = sucursalDoc.data().telefono || "";
            await setDoc(nuevoPedido, { ...solicitud, clienteTimestamp: serverTimestamp(), mensajeWsp, telefonoSucursal });

            vaciar();
            // Si el bloqueador de pop-ups lo corta (Safari, después de un await), el
            // pedido igual quedó guardado y /ver-pedido tiene su botón de WhatsApp.
            // Sin teléfono cargado en la sucursal no hay a dónde mandarlo: el pedido quedó
            // registrado igual y el cajero lo ve en F1.
            if (telefonoSucursal) {
                window.open(urlWhatsApp(telefonoSucursal, texto), "_blank");
            }
            navigate(`/ver-pedido/${sucursal}/${nuevoPedido.id}`);
        } catch (error) {
            // Un console.error solo dejaba al cliente mirando el formulario creyendo que
            // había comprado, y el pedido no existía.
            console.error("Error al crear solicitud:", error);
            setErrorEnvio("No pudimos registrar tu pedido. Revisá tu conexión e intentá de nuevo.");
        }
    });

    const quitarConConfirmacion = async (linea) => {
        const { isConfirmed } = await confirmar(`¿Quitar ${linea.producto.descripcion}?`, "Se saca del pedido con sus extras.", "Sí, quitar");
        if (isConfirmed) quitarLinea(linea.lineaId);
    };

    const vaciarConConfirmacion = async () => {
        const { isConfirmed } = await confirmar("¿Vaciar el pedido?", "Se saca todo lo que agregaste.", "Sí, vaciar");
        if (isConfirmed) vaciar();
    };

    if (!carrito.length) {
        return (
            <section id="tu-pedido" className="gb-pedido" aria-labelledby="tu-pedido-titulo">
                <h2 id="tu-pedido-titulo" className="gb-display gb-titulo-seccion">Tu pedido</h2>
                <p className="gb-muted mt-2">Todavía no agregaste nada.</p>
                <button type="button" className="gb-link" onClick={onVolverAlMenu}>Ver el menú</button>
            </section>
        );
    }

    return (
        <section id="tu-pedido" className="gb-pedido" aria-labelledby="tu-pedido-titulo">
            <div className="d-flex align-items-center gap-3">
                <button type="button" className="gb-boton-icono" onClick={onVolverAlMenu} aria-label="Volver al menú">
                    <Icono nombre="atras" />
                </button>
                <h2 id="tu-pedido-titulo" className="gb-display gb-titulo-seccion">Tu pedido</h2>
            </div>

            <Subtitulo numero="01">Lo que pediste</Subtitulo>
            <ul className="gb-tarjeta list-unstyled mb-0">
                {carrito.map((linea) => (
                    <FilaPedido key={linea.lineaId} linea={linea}
                        onSumar={() => sumar(linea.lineaId)} onRestar={() => restar(linea.lineaId)}
                        onQuitar={() => quitarConConfirmacion(linea)} />
                ))}
            </ul>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-1">
                <button type="button" className="gb-link" onClick={onVolverAlMenu}>+ Agregar algo más</button>
                <button type="button" className="gb-link is-apagado" onClick={vaciarConConfirmacion}>Vaciar pedido</button>
            </div>

            <form onSubmit={handleSubmit(comprar)} noValidate>
                <Subtitulo numero="02">Entrega</Subtitulo>
                <div className="row row-cols-2 g-2" role="radiogroup" aria-label="Cómo recibís el pedido">
                    <OpcionGrande registro={register("opcion", { required: "Elegí cómo recibís el pedido" })}
                        valor={ENVIOS_LOCALES[0]} elegida={opcion === ENVIOS_LOCALES[0]} titulo="Retiro" detalle={`en ${nombreSucursal}`}
                        icono={<FaStore className="gb-opcion-icono" aria-hidden="true" />} />
                    <OpcionGrande registro={register("opcion", { required: "Elegí cómo recibís el pedido" })}
                        valor="delivery" elegida={opcion === "delivery"} titulo="Delivery" detalle="te lo llevamos"
                        icono={<MdDeliveryDining className="gb-opcion-icono is-grande" aria-hidden="true" />} />
                </div>
                <Error error={errors.opcion} />

                {opcion === "delivery" && (
                    <>
                        <Campo id="direccion" etiqueta="Dirección" error={errors.direccion} icono={<FaMapMarkerAlt aria-hidden="true" />}>
                            <input id="direccion" type="text" className="form-control" placeholder="Calle y número" autoComplete="street-address"
                                {...register("direccion", { validate: (v) => (v || "").trim() !== "" || "Necesitamos la dirección" })} />
                        </Campo>
                        <Campo id="entreCalles" etiqueta="Entre calles" error={errors.entreCalles} icono={<FaMapSigns aria-hidden="true" />}>
                            <input id="entreCalles" type="text" className="form-control" placeholder="Para encontrarte más rápido"
                                {...register("entreCalles", { validate: (v) => (v || "").trim() !== "" || "Necesitamos las entre calles" })} />
                        </Campo>
                    </>
                )}

                <Subtitulo numero="03">Tus datos</Subtitulo>
                <Campo id="nombre" etiqueta="Nombre" error={errors.nombre} icono={<FaUser aria-hidden="true" />}>
                    <input id="nombre" type="text" className="form-control" autoComplete="name"
                        {...register("nombre", { validate: (v) => (v || "").trim() !== "" || "Necesitamos tu nombre" })} />
                </Campo>
                <Campo id="telefono" etiqueta="Celular" error={errors.telefono} ayuda="Con código de área, sin 0 ni 15."
                    icono={<FaMobileAlt aria-hidden="true" />}>
                    {/* onInput limpia antes de que react-hook-form lea el valor. */}
                    <input id="telefono" type="tel" inputMode="numeric" className="form-control" placeholder="11 2345 6789"
                        maxLength={10} autoComplete="tel-national"
                        onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, ""); }}
                        {...register("telefono", {
                            required: "Necesitamos tu celular",
                            pattern: { value: /^\d{10}$/, message: "El celular tiene que tener 10 números" },
                        })} />
                </Campo>

                <Subtitulo numero="04">Pago</Subtitulo>
                <div className="row row-cols-2 g-2" role="radiogroup" aria-label="Cómo pagás">
                    <OpcionGrande registro={register("metodoPago", { required: "Elegí cómo pagás" })}
                        valor={METODOS_PAGO.EFECTIVO.key} elegida={metodoPago === METODOS_PAGO.EFECTIVO.key} titulo="Efectivo"
                        icono={<FaMoneyBillWave className="gb-icono-efectivo" aria-hidden="true" />} />
                    <OpcionGrande registro={register("metodoPago", { required: "Elegí cómo pagás" })}
                        valor={METODOS_PAGO.MP.key} elegida={metodoPago === METODOS_PAGO.MP.key} titulo="MercadoPago"
                        icono={<img src={logoMP} alt="" className="gb-logo-mp" width="32" height="24" />} />
                </div>
                <Error error={errors.metodoPago} />
                {/* El recargo no es un error: antes salía en rojo. */}
                {metodoPago === METODOS_PAGO.MP.key && (
                    <p className="gb-aviso fst-italic small text-center">
                        (Tomamos el pedido cuando recibimos la transferencia)
                    </p>
                )}

                <div className="gb-resumen">
                    <div className="gb-resumen-fila"><span>Productos</span><span>{fmtPesos(total)}</span></div>
                    {/* El porcentaje y no el monto: el monto ya está sumado en el total. */}
                    {metodoPago === METODOS_PAGO.MP.key && (
                        <div className="gb-resumen-fila"><span>Recargo MercadoPago</span><span>+{RECARGO_MP}%</span></div>
                    )}
                    {/* La web no sabe cuánto sale el envío: la zona la elige el cajero,
                        porque el costo depende de la distancia. */}
                    {opcion === "delivery" && (
                        <div className="gb-resumen-fila"><span>Envío</span><span>lo suma la sucursal según tu zona</span></div>
                    )}
                    <div className="gb-resumen-total">
                        <span className="gb-display gb-resumen-total-etiqueta">Total</span>
                        <span className="gb-display gb-resumen-total-monto">{fmtPesos(totalFinal)}</span>
                    </div>

                    {errorEnvio && (
                        <div className="gb-error-envio" role="alert">
                            <strong>Tu pedido no se registró.</strong> {errorEnvio}
                        </div>
                    )}
                    <button type="submit" className="btn btn-gb gb-resumen-boton" disabled={procesando}>
                        {procesando ? "Enviando…" : "Confirmar pedido"}
                    </button>
                    <p className="gb-resumen-leyenda fst-italic">(Al confirmar se abre WhatsApp con el detalle)</p>
                </div>
            </form>
        </section>
    );
};

// Una línea del pedido: cantidad, producto, extras, nota y precio. Con ⋮ —o tocando
// la línea— aparece su contador, centrado; en 1, la ✕ del contador la saca (con sus
// extras: están adentro de la línea). Antes la ✕ y el contador iban siempre a la
// vista y cada línea ocupaba el doble.
const FilaPedido = ({ linea, onSumar, onRestar, onQuitar }) => {
    const [abierta, setAbierta] = useState(false);
    const { producto, extras, observaciones, cantidad } = linea;
    const alternar = () => setAbierta((a) => !a);
    return (
        <li className={`gb-fila gb-fila-editable ${abierta ? "is-abierta" : ""}`} onClick={alternar}>
            <div className="gb-fila-titulo">
                <span>{cantidad} × {producto.descripcion}</span>
                <span className="d-flex align-items-center gap-1">
                    <span className="gb-fila-precio">{fmtPesos(precioLinea(linea))}</span>
                    <button type="button" className="gb-fila-menu" aria-expanded={abierta}
                        aria-label={`Cambiar la cantidad de ${producto.descripcion}`}
                        onClick={(e) => { e.stopPropagation(); alternar(); }}>
                        <Icono nombre="puntos" tamanio={20} />
                    </button>
                </span>
            </div>
            {extras.length > 0 && (
                <p className="gb-fila-extras">{extras.map((e) => `+ ${capitalizar(e.descripcion)}`).join(" · ")}</p>
            )}
            {observaciones && <p className="gb-nota">“{observaciones}”</p>}
            {abierta && (
                // Los toques en el contador no cierran la línea.
                <div className="d-flex justify-content-center mt-2" onClick={(e) => e.stopPropagation()}>
                    <Cantidad valor={cantidad} nombre={producto.descripcion}
                        onMenos={onRestar} onMas={onSumar} onQuitar={onQuitar} />
                </div>
            )}
        </li>
    );
};

// Una opción grande (Retiro / Delivery, Efectivo / MercadoPago): el radio real va
// escondido adentro del label, así el teclado y los lectores de pantalla lo usan
// como cualquier radio. Los valores son los de siempre: los lee la Caja.
const OpcionGrande = ({ registro, valor, elegida, titulo, detalle, icono }) => (
    <div className="col">
        <label className={`gb-opcion ${elegida ? "is-on" : ""}`}>
            <input type="radio" className="visually-hidden" value={valor} {...registro} />
            <span className="fw-bold d-inline-flex align-items-center gap-2">{icono}{titulo}</span>
            {detalle && <span className="gb-opcion-detalle">{detalle}</span>}
        </label>
    </div>
);

// Con `icono`, va adentro del campo, a la izquierda.
const Campo = ({ id, etiqueta, error, ayuda, icono, children }) => (
    <div>
        <label htmlFor={id} className="gb-label">{etiqueta}</label>
        {icono ? <div className="gb-campo-icono">{icono}{children}</div> : children}
        {ayuda && !error && <p className="gb-ayuda">{ayuda}</p>}
        <Error error={error} />
    </div>
);

// En ámbar y no en rojo: el rojo sobre el carbón no se lee.
const Error = ({ error }) => (error ? <p className="gb-error" role="alert">{error.message}</p> : null);

export default TuPedido;

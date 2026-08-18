import React, { useState, useEffect, useCallback, useMemo } from "react";
import { serverTimestamp, writeBatch, doc, Timestamp, deleteField, getDoc } from "firebase/firestore";
import { db, getNextSequence, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import '../../style/Main.css';
import logoMP from '../../img/mercado-pago.webp';

import PendientesMP from './pos_modales/Alertas/PendientesMP';
import PendientesSolicitudes from './pos_modales/Alertas/PendientesSolicitudes';
import BuscarPedido from './pos_modales/BuscarPedido';
import PagoDividido from './pos_modales/PagoDividido';
import ResumenDiario from './pos_modales/ResumenDiario';

import useTraerDatos from './pos_hooks/useTraerDatos';
import usePendientes from './pos_hooks/usePendientes';
import useCliente from './pos_hooks/useCliente';
import useCarrito from './pos_hooks/useCarrito';
import useHorarioEspecial from './pos_hooks/useHorarioEspecial';
import validarPedido from './pos_hooks/validarPedido';
import useRevisarSolicitud, { liberarSolicitud } from './pos_hooks/useRevisarSolicitud';
import { getResumenOperation } from './pos_hooks/useResumenDiario';
import { ESTADOS, ENVIOS_LOCALES } from '../../Utils/Constantes';
import { ahoraServidor, getFechaComercial } from '../../Utils/fechaComercial';

// Los montos del ticket se leen de un vistazo y a las apuradas: con separador
// de miles, que $77.000 no se confunda con $7.700.
const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

const Caja = () => {
    const { register, handleSubmit, reset, watch, setValue, resetField } = useForm({
        defaultValues: { direccion: "", id: "" }
    });
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");
    // Seteado solo cuando el ticket vino de una solicitud web: cambia Limpiar por Cancelar.
    const idSolicitud = watch("id");

    const { userData } = useAuth();
    const [search, setSearch] = useState("");
    const [modoDelivery, setModoDelivery] = useState(false);
    const mostrarDelivery = modoDelivery || (envioSeleccionado?.zona_envio && !ENVIOS_LOCALES.includes(envioSeleccionado.zona_envio));

    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const recargo = Number(process.env.REACT_APP_recargoMP) || 0;
    const [procesando, setProcesando] = useState(false);
    const [montoEfectivo, setMontoEfectivo] = useState(0);

    const [showPendientesMP, setShowPendientesMP] = useState(false);
    const [showPendientesSolicitudes, setShowPendientesSolicitudes] = useState(false);
    const [showModalDividido, setShowModalDividido] = useState(false);
    const [showBuscarPedido, setShowBuscarPedido] = useState(false);
    const [showResumen, setShowResumen] = useState(false);
    const [resumenDiario, setResumenDiario] = useState(null);
    const [cargandoResumen, setCargandoResumen] = useState(false);

    const horarioEspecial = watch("horarioEspecial");
    const horaEspecial = horarioEspecial ? horarioEspecial.split(':')[0] : "20";
    const minutosEspecial = horarioEspecial ? horarioEspecial.split(':')[1] : "00";

    const { productos, categorias, envios, isLoading } = useTraerDatos();
    const { tieneSolicitudesPendientes, tienePendientesMP } = usePendientes();
    const { guardarClienteSiNoExiste } = useCliente();
    const { carrito, setCarrito, handleAgregarAlCarrito, handleEliminarDelCarrito, resetCarrito, getResumen } = useCarrito({ envioSeleccionado, metodoPago, montoEfectivo, recargo });
    const { showHorarioEspecial, toggleHorarioEspecial, handleHoraEspecialChange, handleMinutosEspecialChange, resetHorario } = useHorarioEspecial({ setValue });
    const { handleRevisarSolicitud } = useRevisarSolicitud({ setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios });

    const { totalBase, total: totalFinal, montoMPConRecargo } = getResumen;

    const guardarBD = async (data) => {
        if (!validarPedido({ data, carrito, envioSeleccionado, totalFinal })) return;
        setProcesando(true);

        try {
            const nuevoCodigo = await getNextSequence("pedidos");
            const batch = writeBatch(db);

            const isWebOrder = !!data.id;
            const pedidosRef = colSucursal("pedidos");
            const pedidoRef = isWebOrder ? doc(pedidosRef, data.id) : doc(pedidosRef);

            let timestampPedido = serverTimestamp();
            if (data.horarioEspecial) {
                const [h, m] = data.horarioEspecial.split(":").map(Number);
                // Base la hora del servidor, no la de la PC: si el reloj esta corrido
                // el pedido se graba con otra fecha y desaparece de la jornada.
                const fecha = ahoraServidor().set({ hour: h, minute: m, second: 0, millisecond: 0 });
                timestampPedido = Timestamp.fromDate(fecha.toDate());
            }

            batch.set(pedidoRef, {
                codigo: `${nuevoCodigo}-${userData.iniciales}`,
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
                cajeroTimestamp: serverTimestamp(),
                nombre: data.nombre,
                direccion: data.direccion,
                entreCalles: data.entreCalles || "",
                telefono: data.telefono,
                observaciones: data.observaciones || "",
                envio: envioSeleccionado,
                metodoPago: data.metodoPago,
                pagaCon: Number(data.pagaCon) || 0,
                montoEfectivo: data.metodoPago === "%" ? Number(montoEfectivo) : 0,
                total: Number(totalFinal),
                carrito: carrito,
                estado: data.metodoPago === "MP" || data.metodoPago === "%" ? ESTADOS.PENDIENTEMP : ESTADOS.CONFIRMADO,
                esHorarioEspecial: !!data.horarioEspecial,
                sucursal: userData.sucursal,
                origen: isWebOrder ? "WEB" : "CAJA",
                timestamp: timestampPedido,
                // La asignacion ya cumplio su funcion: no queda colgando en el pedido.
                cajeroRevisaID: deleteField(),
                cajeroRevisa: deleteField(),
            }, { merge: true });

            const { ref, stats: resumenData } = getResumenOperation({
                metodoPago: data.metodoPago,
                total: totalFinal,
                montoEfectivo,
                montoMPConRecargo,
                envio: envioSeleccionado,
                carrito,
            });
            batch.set(ref, resumenData, { merge: true });

            await batch.commit();
            guardarClienteSiNoExiste(data);
            await Swal.fire({
                title: '¡Éxito!',
                text: 'Pedido agregado!.',
                icon: 'success',
                confirmButtonColor: '#198754',
            });
            limpiar();
        } catch (error) {
            console.error("Error al agregar pedido: ", error);
            Swal.fire({
                title: '¡Error!',
                text: 'Error al Agregar Pedido. Verifica internet, recarga e intente de nuevo.',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        } finally {
            setProcesando(false);
        }
    };

    const limpiarCamposMetodoPago = useCallback(() => {
        resetField("pagaCon");
        setMontoEfectivo(0);
    }, [resetField, setMontoEfectivo]);

    const handleMetodoPagoChange = (e) => {
        const nuevoMetodo = e.target.value;
        limpiarCamposMetodoPago();
        setValue("metodoPago", nuevoMetodo);
        setShowModalDividido(nuevoMetodo === "%");
    };

    const limpiar = useCallback(() => {
        reset();
        resetCarrito();
        setMontoEfectivo(0);
        resetHorario();
        setModoDelivery(false);
    }, [reset, resetCarrito, resetHorario]);

    // Una sola lectura al abrir, no un listener: el arqueo se mira al cierre del turno
    // y no necesita ir actualizandose solo mientras el modal esta abierto.
    const verResumen = useCallback(async () => {
        setCargandoResumen(true);
        setShowResumen(true);
        try {
            const snap = await getDoc(docSucursal("resumenDiario", getFechaComercial()));
            setResumenDiario(snap.exists() ? snap.data() : null);
        } catch (error) {
            console.error("Error cargando el resumen del dia:", error);
            setResumenDiario(null);
        } finally {
            setCargandoResumen(false);
        }
    }, []);

    // Cancelar devuelve la solicitud al listado para que otro cajero pueda tomarla.
    // Un ticket comun no tiene nada que liberar y se comporta como el Limpiar de siempre.
    const cancelarTicket = useCallback(async () => {
        if (idSolicitud) {
            await liberarSolicitud(idSolicitud, userData.id);
        }
        limpiar();
    }, [idSolicitud, userData.id, limpiar]);

    useEffect(() => {
        if (ENVIOS_LOCALES.includes(envioSeleccionado?.zona_envio)) {
            setValue("direccion", "");
            setValue("entreCalles", "");
        }
    }, [envioSeleccionado?.zona_envio, setValue]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    if (tieneSolicitudesPendientes) {
                        setShowPendientesSolicitudes(true);
                    }
                    break;
                case 'F2':
                    e.preventDefault();
                    if (tienePendientesMP) {
                        setShowPendientesMP(true);
                    }
                    break;
                case 'F3':
                    e.preventDefault();
                    setShowBuscarPedido(true);
                    break;
                case 'F4':
                    e.preventDefault();
                    verResumen();
                    break;
                case 'Escape':
                    cancelarTicket();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancelarTicket, verResumen, tieneSolicitudesPendientes, tienePendientesMP]);

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100" id="caja">
                    <div className="search-bar">
                        <h1 className="caja-titulo">Caja</h1>

                        {/* Accesos F1..F4 dentro de la barra: no ocupan una franja
                            propia y ese alto se lo lleva el ticket. */}
                        <div className="caja-header d-flex align-items-center gap-1">
                            <button
                                className={`btn btn-sm fw-bold ${tieneSolicitudesPendientes && !showPendientesSolicitudes ? 'btn-warning text-white btn-blink' : 'btn-outline-light'}`}
                                disabled={!tieneSolicitudesPendientes}
                                onClick={() => setShowPendientesSolicitudes(true)}
                            >
                                <i className="fa fa-list-check"></i> Ver Solicitudes <small className="fst-italic"> (F1)</small>
                            </button>
                            <button
                                className={`btn btn-sm fw-bold ${tienePendientesMP && !showPendientesMP ? 'btn-info text-white btn-blink' : 'btn-outline-light'}`}
                                disabled={!tienePendientesMP}
                                onClick={() => setShowPendientesMP(true)}
                            >
                                <img src={logoMP} alt="MP" className="img-fluid" style={{ height: "1.1rem" }}></img> Pendientes MP <small className="fst-italic"> (F2)</small>
                            </button>
                            <button
                                className="btn btn-sm btn-primary fw-bold"
                                onClick={() => setShowBuscarPedido(true)}
                            >
                                <i className="fa fa-search"></i> Buscar Ticket<small className="fst-italic"> (F3)</small>
                            </button>
                            <button
                                className="btn btn-sm btn-light fw-bold"
                                onClick={verResumen}
                            >
                                <i className="fa fa-chart-simple"></i> Ver Estadísticas <small className="fst-italic"> (F4)</small>
                            </button>
                        </div>

                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar Producto..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    {/* Fila principal: ticket a la izquierda, productos a la derecha */}
                    <main className="row m-0 px-2" id="caja-main">
                        <section className="col-4 p-0" id="ticket">
                            <div className="card mb-1" id="datos_clientes">
                                <input type="text" maxLength={10} className="form-control fs-6 p-1 mb-1" placeholder="Teléfono (sin 0 y sin 15)..." autoComplete="off" required {...register("telefono")}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/\D/g, '');
                                    }}
                                />
                                <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Nombre..." autoComplete="off" required {...register("nombre")} />

                                <div className="btn-group w-100 mb-2" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm btn-upload fw-bold ${envioSeleccionado?.zona_envio === ENVIOS_LOCALES[1] ? "btn-dark text-white" : "btn-outline-dark"}`}
                                        onClick={() => {
                                            setModoDelivery(false);
                                            setValue("envio", JSON.stringify({ zona_envio: ENVIOS_LOCALES[1], costo_envio: 0 }));
                                        }}
                                    >
                                        <i className="fa-solid fa-store me-1"></i> Espera Afuera
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm btn-upload fw-bold ${envioSeleccionado?.zona_envio === ENVIOS_LOCALES[0] ? "btn-dark text-white" : "btn-outline-dark"}`}
                                        onClick={() => {
                                            setModoDelivery(false);
                                            setValue("envio", JSON.stringify({ zona_envio: ENVIOS_LOCALES[0], costo_envio: 0 }));
                                        }}
                                    >
                                        <i className="fa-solid fa-store me-1"></i> Retira
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm btn-upload fw-bold ${mostrarDelivery ? "btn-dark text-white" : "btn-outline-dark"}`}
                                        onClick={() => {
                                            setModoDelivery(true);
                                            setValue("envio", "");
                                        }}
                                    >
                                        <i className="fa-solid fa-motorcycle me-1"></i> Delivery
                                    </button>
                                </div>

                                {mostrarDelivery && (<>
                                    <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Direccion..." autoComplete="off" required {...register("direccion")} />
                                    <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Entre Calles..." autoComplete="off" required {...register("entreCalles")} />
                                </>)}
                                <textarea className="form-control" rows="2" placeholder="Observaciones..." autoComplete="off" {...register("observaciones")}></textarea>
                            </div>

                            <hr className="m-0"></hr>

                            <div className="card mt-2 mb-2" id="tabla_productos">
                                <table className="table-hover shopping-cart-wrap">
                                    <thead>
                                        <tr>
                                            <th className="col">N°</th>
                                            <th className="col text-start">Item</th>
                                            <th className="col">Subtotal</th>
                                            <th className="col"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {carrito.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center text-body-secondary">
                                                    No hay productos
                                                </td>
                                            </tr>
                                        ) : (
                                            carrito.map((producto) => (
                                                <tr key={producto.carritoItemId}>
                                                    <td className="text-center">{producto.cantidad}</td>
                                                    <td className="text-start">
                                                        <p
                                                            className={`title text-truncate mb-0 ${producto.categoria === "EXTRA" ? "fst-italic ps-2" : ""}`}>
                                                            {producto.categoria === "EXTRA" && "-"}{producto.descripcion}
                                                        </p>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="price-wrap">
                                                            <var className="price">${producto.subtotal}</var>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            className="btn text-danger p-0"
                                                            onClick={() => handleEliminarDelCarrito(producto.carritoItemId)}
                                                        >
                                                            <i className="fa fa-circle-xmark fs-4"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <hr className="m-0"></hr>

                            <div id="datos_pago">
                                <label htmlFor="pago-envio">Envío</label>
                                <div className="pago-valor">
                                    <select
                                        id="pago-envio"
                                        className={`form-control border-0 text-center ${ENVIOS_LOCALES.includes(envioSeleccionado?.zona_envio) ? "p-0" : ""}`}
                                        multiple={false}
                                        disabled={ENVIOS_LOCALES.includes(envioSeleccionado?.zona_envio)}
                                        required
                                        {...register("envio")}
                                    >
                                        <option value="">....</option>
                                        {envios.map(env => (
                                            <option key={env.id} value={JSON.stringify({ zona_envio: env.zona_envio, costo_envio: env.costo_envio })}>
                                                {env.zona_envio}
                                            </option>
                                        ))
                                        }
                                    </select>
                                    <span className="pago-monto">{fmtPesos(envioSeleccionado?.costo_envio)}</span>
                                </div>

                                <label htmlFor="pago-metodo">Método</label>
                                <div className="pago-valor">
                                    <select id="pago-metodo" className="form-control border-0 p-0 px-1 m-0" multiple={false} required {...register("metodoPago")} onChange={handleMetodoPagoChange}>
                                        <option value="">....</option>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="MP">MP</option>
                                        <option value="%">Dividido</option>
                                    </select>
                                    {metodoPago === "MP" && (<span className="pago-nota">Recargo {recargo}%</span>)}
                                </div>

                                {metodoPago === "EFECTIVO" && (<>
                                    <label htmlFor="pago-paga-con">Paga con</label>
                                    <div className="pago-valor">
                                        <input
                                            id="pago-paga-con"
                                            type="number"
                                            className="form-control border-0 bg-transparent pago-input"
                                            autoComplete="off"
                                            min={0}
                                            placeholder="0"
                                            {...register("pagaCon", { valueAsNumber: true })}
                                        />
                                    </div>
                                </>)}

                                {metodoPago === "%" && (<>
                                    <label>Efectivo</label>
                                    <div className="pago-valor">
                                        <span className="pago-monto">{fmtPesos(montoEfectivo)}</span>
                                    </div>

                                    <label>MP</label>
                                    <div className="pago-valor">
                                        <span className="pago-monto">{fmtPesos(montoMPConRecargo)}</span>
                                    </div>
                                </>)}

                                {/* Separador propio: con el borde en las celdas la
                                    línea salía cortada por el gap de la grilla. */}
                                <div className="pago-separador"></div>

                                <label className="pago-total">Total</label>
                                <div className="pago-valor pago-total">
                                    <span className="pago-monto">{fmtPesos(totalFinal)}</span>
                                </div>
                            </div>

                            <div className="row" id="acciones">
                                    <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap mb-1">
                                        <button
                                            title="(Esc)"
                                            className="btn btn-danger"
                                            type="reset"
                                            onClick={() => { cancelarTicket() }}
                                        >
                                            {idSolicitud ? "Cancelar" : "Limpiar"} <i className="fas fa-trash-alt"></i>
                                        </button>
                                        <button
                                            title="(ALT+ENTER)"
                                            className="btn btn-success"
                                            type="submit"
                                            disabled={procesando}
                                            onClick={() => handleSubmit(guardarBD)()}>
                                            {procesando ? "Cargando..." : "Crear Pedido"} <i className="fas fa-burger"></i>
                                        </button>
                                    </div>

                                    <div className="row">
                                        <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                                            <button
                                                className={'btn btn-secondary'}
                                                type="button"
                                                onClick={toggleHorarioEspecial}
                                            >
                                                Horario Especial <i className="fa fa-clock"></i>
                                            </button>
                                            {showHorarioEspecial && (
                                                <>
                                                    <select
                                                        className="form-control text-center"
                                                        style={{ width: "80px" }}
                                                        value={horaEspecial}
                                                        onChange={(e) => handleHoraEspecialChange(e, minutosEspecial)}
                                                    >
                                                        <option value="20">20</option>
                                                        <option value="21">21</option>
                                                        <option value="22">22</option>
                                                        <option value="23">23</option>
                                                    </select>
                                                    <span className="fw-bold">:</span>
                                                    <select
                                                        className="form-control text-center"
                                                        style={{ width: "80px" }}
                                                        value={minutosEspecial}
                                                        onChange={(e) => handleMinutosEspecialChange(e, horaEspecial)}
                                                    >
                                                        <option value="00">00</option>
                                                        <option value="15">15</option>
                                                        <option value="30">30</option>
                                                        <option value="45">45</option>
                                                    </select>
                                                </>
                                            )}
                                            <input
                                                type="hidden"
                                                {...register("horarioEspecial")}
                                            />
                                        </div>
                                    </div>
                                </div>
                        </section>

                        <section className="col-8 card" id="productos">
                            <ul className="nav nav-pills nav-fill p-0 d-flex overflow-auto" role="tablist" style={{ whiteSpace: "nowrap", gap: "2px" }}>
                                {categorias.map((categoria) => (
                                    <li className="nav-item" key={categoria.id}>
                                        <button
                                            className={`d-flex justify-content-center align-items-center nav-link text-black lex-shrink-0 gap-1 p-1 ${categoriaSeleccionada === categoria.nombre ? "active" : ""}`}
                                            onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                                        >
                                            <i className="fa fa-tags" ></i> {categoria.nombre}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
                                {productos
                                    .filter((p) =>
                                        search
                                            ? p.descripcion?.toLowerCase().includes(search.toLowerCase())
                                            : true
                                    )
                                    .filter(
                                        (p) => categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada
                                    )
                                    .map((producto) => (
                                        <div className="p-0" key={producto.id}>
                                            <button
                                                onClick={() => handleAgregarAlCarrito(producto)}
                                                className="card card-product h-100 d-flex flex-column justify-content-between"
                                            >
                                                <div className="img-wrap flex-grow-1 d-flex align-items-center justify-content-center">
                                                    <img
                                                        src={producto.imagen}
                                                        alt={producto.descripcion}
                                                        className="img-fluid w-75"
                                                    />
                                                </div>
                                                <figcaption className="info-wrap">
                                                    <p className="d-flex justify-content-center title lh-1 m-auto" style={{ fontSize: "0.8rem", minHeight: "1.5rem" }}>
                                                        {producto.descripcion}
                                                    </p>
                                                    <div className="action-wrap">
                                                        <div className="price-wrap h6 p-1 m-0">
                                                            <span className="price-new">${producto.precio}</span>
                                                        </div>
                                                    </div>
                                                </figcaption>
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </main >
                </div >
            )}

            {/* Modal para método de pago dividido */}
            <PagoDividido
                isOpen={showModalDividido}
                onClose={() => setShowModalDividido(false)}
                onCancelar={() => {
                    setShowModalDividido(false);
                    setValue("metodoPago", "");
                    setMontoEfectivo(0);
                }}
                montoEfectivo={montoEfectivo}
                setMontoEfectivo={setMontoEfectivo}
                totalBase={totalBase}
            />

            {/* Modal de Pendientes MP */}
            <PendientesMP
                isOpen={showPendientesMP}
                onClose={() => setShowPendientesMP(false)}
            />

            {/* Modal de Pendientes Solicitudes */}
            <PendientesSolicitudes
                isOpen={showPendientesSolicitudes}
                onClose={() => setShowPendientesSolicitudes(false)}
                onRevisarSolicitud={handleRevisarSolicitud}
            />

            {/* Modal de Buscar Pedido */}
            <BuscarPedido
                isOpen={showBuscarPedido}
                onClose={() => setShowBuscarPedido(false)}
            />

            {/* Modal del resumen de la jornada */}
            <ResumenDiario
                isOpen={showResumen}
                onClose={() => setShowResumen(false)}
                resumen={resumenDiario}
                fecha={getFechaComercial()}
                isLoading={cargandoResumen}
            />
        </>
    );
}
export default Caja;
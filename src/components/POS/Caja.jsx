import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db, getNextSequence } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import '../../style/Main.css';
import logoMP from '../../img/mercado-pago.webp';
import AutocompleteGoogle from '../../Utils/AutocompleteGoogle';

import PendientesMP from './pos_modales/Alertas/PendientesMP';
import PendientesSolicitudes from './pos_modales/Alertas/PendientesSolicitudes';
import EliminarTickets from './pos_modales/EliminarTickets';
import BuscarSolicitud from './pos_modales/BuscarSolicitud';
import PagoDividido from './pos_modales/PagoDividido';

import useTraerDatos from './pos_hooks/useTraerDatos';
import usePendientes from './pos_hooks/usePendientes';
import useCliente from './pos_hooks/useCliente';
import useCarrito from './pos_hooks/useCarrito';
import useHorarioEspecial from './pos_hooks/useHorarioEspecial';
import validarPedido from './pos_hooks/validarPedido';
import useAprobarSolicitud from './pos_hooks/useAprobarSolicitud';
import { getResumenOperation } from './pos_hooks/useResumenDiario';
import { ESTADOS } from '../../Utils/Constantes';

const Caja = () => {
    const { register, handleSubmit, reset, watch, setValue, resetField } = useForm({
        defaultValues: { direccion: "", latitud: "", longitud: "", id: "" }
    });
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");

    const { userData } = useAuth();
    const [search, setSearch] = useState("");

    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const recargo = Number(process.env.REACT_APP_recargoMP) || 0;
    const [procesando, setProcesando] = useState(false);
    const [montoEfectivo, setMontoEfectivo] = useState(0);

    const [showPendientesMP, setShowPendientesMP] = useState(false);
    const [showPendientesSolicitudes, setShowPendientesSolicitudes] = useState(false);
    const [showModalDividido, setShowModalDividido] = useState(false);
    const [showEliminarTickets, setShowEliminarTickets] = useState(false);
    const [showBuscarSolicitud, setShowBuscarSolicitud] = useState(false);

    const horarioEspecial = watch("horarioEspecial");
    const horaEspecial = horarioEspecial ? horarioEspecial.split(':')[0] : "20";
    const minutosEspecial = horarioEspecial ? horarioEspecial.split(':')[1] : "00";

    const { productos, categorias, envios, isLoading } = useTraerDatos();
    const { tieneSolicitudesPendientes, tienePendientesMP } = usePendientes();
    const { guardarClienteSiNoExiste } = useCliente();
    const { carrito, setCarrito, handleAgregarAlCarrito, handleEliminarDelCarrito, resetCarrito, getResumen } = useCarrito({ envioSeleccionado, metodoPago, montoEfectivo, recargo });
    const { showHorarioEspecial, toggleHorarioEspecial, handleHoraEspecialChange, handleMinutosEspecialChange, resetHorario } = useHorarioEspecial({ setValue });
    const { handleAprobarSolicitud } = useAprobarSolicitud({ setValue, setCarrito, setShowPendientesSolicitudes, envios });

    const { totalBase, total: totalFinal, montoMPConRecargo } = getResumen;

    const guardarBD = async (data) => {
        if (!validarPedido({ data, carrito, envioSeleccionado, totalFinal })) return;
        setProcesando(true);

        try {
            const nuevoCodigo = await getNextSequence("pedidos");
            const batch = writeBatch(db);

            const isWebOrder = !!data.id;
            const pedidoRef = isWebOrder ? doc(db, "pedidos", data.id) : doc(collection(db, "pedidos"));
            
            batch.set(pedidoRef, {
                codigo: `${nuevoCodigo}-${userData.iniciales}`,
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
                cajeroTimestamp: serverTimestamp(),
                nombre: data.nombre,
                direccion: data.direccion,
                latitud: data.latitud || "",
                longitud: data.longitud || "",
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
                hora: data.horarioEspecial || null,
                sucursal: process.env.REACT_APP_sucursal,
                origen: isWebOrder ? "WEB" : "CAJA",
                timestamp: serverTimestamp(),
            }, { merge: true });

            const { ref, stats: resumenData } = getResumenOperation({
                metodoPago: data.metodoPago,
                total: totalFinal,
                montoEfectivo,
                montoMPConRecargo
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
    }, [reset, resetCarrito, resetHorario]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    setShowPendientesSolicitudes(true);
                    break;
                case 'F2':
                    e.preventDefault();
                    setShowPendientesMP(true);
                    break;
                case 'F3':
                    e.preventDefault();
                    setShowBuscarSolicitud(true);
                    break;
                case 'F4':
                    e.preventDefault();
                    setShowEliminarTickets(true);
                    break;
                case 'Escape':
                    limpiar();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [limpiar]);

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100" id="caja">
                    <div className="search-bar">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar Producto..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100 p-1">
                        <div
                            className="d-flex justify-content-start align-items-center">
                            <h3>Sistema Caja</h3>
                            <button
                                className={`btn mx-2 btn-sm fw-bold mb-1 ${tieneSolicitudesPendientes && !showPendientesSolicitudes ? 'btn-warning text-white btn-blink' : 'btn-outline-secondary'}`}
                                disabled={!tieneSolicitudesPendientes}
                                onClick={() => setShowPendientesSolicitudes(true)}
                            >
                                <i className="fa fa-list-check"></i> Ver Solicitudes <small className="fst-italic"> (F1)</small>
                            </button>
                            <button
                                className={`btn mx-2 btn-sm fw-bold mb-1 ${tienePendientesMP && !showPendientesMP ? 'btn-info text-white btn-blink' : 'btn-outline-secondary'}`}
                                disabled={!tienePendientesMP}
                                onClick={() => setShowPendientesMP(true)}
                            >
                                <img src={logoMP} alt="MP" className="img-fluid" style={{ height: "3vh" }}></img> Pendientes MP <small className="fst-italic"> (F2)</small>
                            </button>
                            <div className="ms-auto d-flex">
                                <button
                                    className="btn btn-sm btn-primary mx-2 fw-bold mb-1"
                                    onClick={() => setShowBuscarSolicitud(true)}
                                >
                                    <i className="fa fa-search"></i> Buscar Solicitud <small className="fst-italic"> (F3)</small>
                                </button>
                                <button
                                    className="btn btn-sm btn-danger mx-2 fw-bold mb-1"
                                    onClick={() => setShowEliminarTickets(true)}
                                >
                                    <i className="fa fa-trash"></i> Eliminar Ticket <small className="fst-italic"> (F4)</small>
                                </button>
                            </div>
                        </div>

                        <main className="container-fluid">
                            <div className="row">
                                <section className="col-4 p-0" id="ticket">
                                    <div className="card mb-1" id="datos_clientes">
                                        <input type="text" maxLength={10} className="form-control fs-6 p-1 mb-1" placeholder="Teléfono (sin 0 y sin 15)..." autoComplete="off" required {...register("telefono")}
                                            onInput={(e) => {
                                                e.target.value = e.target.value.replace(/\D/g, '');
                                            }}
                                        />
                                        <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Nombre..." autoComplete="off" required {...register("nombre")} />
                                        {envioSeleccionado?.zona_envio !== "Retira" && (<AutocompleteGoogle
                                            value={watch("direccion")}
                                            onChange={({ direccion, latitud, longitud }) => {
                                                setValue("direccion", direccion || "");
                                                setValue("latitud", latitud ?? "");
                                                setValue("longitud", longitud ?? "");
                                            }}
                                            placeholder="Dirección (selecciona del listado)..."
                                            required
                                        />
                                        )}
                                        <input type="hidden" {...register("latitud")} />
                                        <input type="hidden" {...register("longitud")} />
                                        <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Entre Calles..." autoComplete="off" required {...register("entreCalles")} />
                                        <textarea className="form-control" rows="2" placeholder="Observaciones..." autoComplete="off" {...register("observaciones")}></textarea>
                                    </div>

                                    <hr style={{ margin: "0.5rem 0" }}></hr>

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

                                    <hr style={{ margin: "0.5rem 0" }}></hr>

                                    <div id="datos_pago">
                                        <div className="row p-0 m-auto">
                                            <div className="col-3"></div>
                                            <div className="col-4 d-flex align-items-center text-end">
                                                <label className="form-label mb-0">Envío</label>

                                                <select className="form-control border-0 text-center" multiple={false} required {...register("envio")}>
                                                    <option value="">....</option>
                                                    {envios.map(env => (
                                                        <option key={env.id} value={JSON.stringify({ zona_envio: env.zona_envio, costo_envio: env.costo_envio })}>
                                                            {env.zona_envio}
                                                        </option>
                                                    ))}
                                                </select>
                                                :
                                            </div>
                                            <div className="col-3 d-flex align-items-center">
                                                <span className="p-0">$</span>
                                                <input type="number" className="form-control border-0 bg-transparent" autoComplete="off" disabled value={envioSeleccionado?.costo_envio || 0}
                                                />
                                            </div>
                                            <div className="col-1"></div>
                                        </div>

                                        <div className="row p-0 m-auto">
                                            <div className="col-3 p-0">
                                                {metodoPago === "MP" && (<span className="p-0 m-0">Recargo {recargo}%</span>)}
                                            </div>
                                            <div className="col-4 text-end">
                                                <label className="form-label mb-0">Metodo Pago:</label>
                                            </div>
                                            <div className="col-3">
                                                <select className="form-control border-0 p-0 px-1 m-0" multiple={false} required {...register("metodoPago")} onChange={handleMetodoPagoChange}>
                                                    <option value="">....</option>
                                                    <option value="EFECTIVO">Efectivo</option>
                                                    <option value="MP">MP</option>
                                                    <option value="%">Dividido</option>
                                                </select>
                                            </div>
                                            <div className="col-2"></div>
                                        </div>

                                        {metodoPago === "EFECTIVO" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">Paga Con:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        min={0}
                                                        placeholder="0"
                                                        {...register("pagaCon", { valueAsNumber: true })}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

                                        {metodoPago === "%" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">Efectivo:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        min={0}
                                                        disabled
                                                        value={montoEfectivo}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

                                        {metodoPago === "%" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">MP:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        step={1000}
                                                        min={0}
                                                        disabled
                                                        value={montoMPConRecargo}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

                                        <div className="row p-0 m-auto d-flex align-items-center">
                                            <div className="col-2"></div>
                                            <div className="col-5 text-end">
                                                <label className="form-label fw-bold mb-0">Total:</label>
                                            </div>
                                            <div className="col-5 d-flex align-items-center">
                                                <span className="p-0">$</span>
                                                <input type="number" className="form-control border-0 bg-transparent" autoComplete="off" min={0} disabled value={totalFinal || 0} />
                                            </div>
                                        </div>

                                        <div className="row" id="acciones">
                                            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap mb-1">
                                                <button
                                                    title="(Esc)"
                                                    className="btn btn-danger"
                                                    type="reset"
                                                    onClick={() => { limpiar() }}
                                                >
                                                    Limpiar <i className="fas fa-trash-alt"></i>
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

                                    <div className="row">
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
                                                <div className="col-2 p-0" key={producto.id}>
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
                            </div >
                        </main >
                    </div >
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
                onAprobarSolicitud={handleAprobarSolicitud}
            />

            {/* Modal de Eliminar Tickets */}
            <EliminarTickets
                isOpen={showEliminarTickets}
                onClose={() => setShowEliminarTickets(false)}
            />

            {/* Modal de Buscar Solicitudes */}
            <BuscarSolicitud
                isOpen={showBuscarSolicitud}
                onClose={() => setShowBuscarSolicitud(false)}
            />
        </>
    );
}
export default Caja;
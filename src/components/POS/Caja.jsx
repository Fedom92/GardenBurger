import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { serverTimestamp, writeBatch, doc, Timestamp, deleteField, getDoc } from "firebase/firestore";
import { db, getNextSequence, colSucursal, docSucursal } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import '../../style/Main.css';
import './Caja.css';
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
import useTicketLayout from './pos_hooks/useTicketLayout';
import validarPedido from './pos_hooks/validarPedido';
import useRevisarSolicitud, { liberarSolicitud } from './pos_hooks/useRevisarSolicitud';
import { getResumenOperation } from './pos_hooks/useResumenDiario';
import { ESTADOS, ENVIOS_LOCALES } from '../../Utils/Constantes';
import { ahoraServidor, getFechaComercial } from '../../Utils/fechaComercial';

// Los montos del ticket se leen de un vistazo y a las apuradas: con separador
// de miles, que $77.000 no se confunda con $7.700.
const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

// Los EXTRA son filas hermanas en el carrito, pero el diseño los cuelga de su
// producto. Se agrupa solo para mostrar: el array que se guarda no cambia.
const agruparCarrito = (carrito) => {
    const grupos = [];
    let actual = null;

    carrito.forEach((item) => {
        if (item.categoria !== "EXTRA") {
            if (actual) grupos.push(actual);
            actual = { principal: item, extras: [] };
        } else if (actual) {
            actual.extras.push(item);
        } else {
            // Un extra suelto al principio del carrito no debería pasar, pero si
            // pasa se muestra como línea propia en vez de desaparecer.
            grupos.push({ principal: item, extras: [] });
        }
    });

    if (actual) grupos.push(actual);
    return grupos;
};

const Caja = () => {
    const { register, handleSubmit, reset, watch, setValue, resetField } = useForm({
        defaultValues: { direccion: "", id: "" }
    });
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");
    // Seteado solo cuando el ticket vino de una solicitud web: cambia Limpiar por Cancelar.
    const idSolicitud = watch("id");
    const pagaCon = watch("pagaCon");

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

    const buscadorRef = useRef(null);

    const horarioEspecial = watch("horarioEspecial");
    const horaEspecial = horarioEspecial ? horarioEspecial.split(':')[0] : "20";
    const minutosEspecial = horarioEspecial ? horarioEspecial.split(':')[1] : "00";

    const { productos, categorias, envios, isLoading } = useTraerDatos();
    const { tieneSolicitudesPendientes, tienePendientesMP } = usePendientes();
    const { guardarClienteSiNoExiste } = useCliente();
    const { carrito, setCarrito, handleAgregarAlCarrito, handleEliminarDelCarrito, resetCarrito, getResumen } = useCarrito({ envioSeleccionado, metodoPago, montoEfectivo, recargo });
    const { showHorarioEspecial, toggleHorarioEspecial, handleHoraEspecialChange, handleMinutosEspecialChange, resetHorario } = useHorarioEspecial({ setValue });
    const { handleRevisarSolicitud } = useRevisarSolicitud({ setValue, setCarrito, setShowPendientesSolicitudes, setModoDelivery, envios });
    const layout = useTicketLayout();

    const { totalBase, total: totalFinal, montoMPConRecargo } = getResumen;

    const gruposCarrito = useMemo(() => agruparCarrito(carrito), [carrito]);
    const unidades = useMemo(() => carrito.reduce((acum, p) => acum + (p.cantidad || 1), 0), [carrito]);

    // Retira y Espera Afuera ya viven en los tres tabs de arriba: en el selector
    // solo quedan las zonas de reparto.
    const zonasReparto = useMemo(
        () => envios.filter((e) => !ENVIOS_LOCALES.includes(e.zona_envio)),
        [envios]
    );

    const productosFiltrados = useMemo(() => productos
        .filter((p) => search ? p.descripcion?.toLowerCase().includes(search.toLowerCase()) : true)
        .filter((p) => categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada),
        [productos, search, categoriaSeleccionada]);

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

    // Los tabs reemplazaron al <select>, asi que recibe el valor y no el evento.
    const seleccionarMetodoPago = (nuevoMetodo) => {
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
                case '/': {
                    // Atajo del diseño. No secuestra la barra mientras se escribe
                    // en cualquier otro campo del ticket.
                    const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
                    if (!enCampo) {
                        e.preventDefault();
                        buscadorRef.current?.focus();
                    }
                    break;
                }
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

    const esAfuera = envioSeleccionado?.zona_envio === ENVIOS_LOCALES[1];
    const esRetira = envioSeleccionado?.zona_envio === ENVIOS_LOCALES[0];
    const pagaConCorto = metodoPago === "EFECTIVO" && pagaCon > 0 && pagaCon < totalFinal;

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div id="caja">
                    {/* Topbar: identidad + accesos F1..F4. Reemplaza a la barra
                        negra anterior; el sidebar de la app sigue a la izquierda. */}
                    <header className="pos-topbar">
                        <span className="pos-title">Sistema Caja</span>
                        <span className="pos-avatar">{userData?.iniciales?.charAt(0) || "?"}</span>

                        <div className="flex-fill"></div>

                        <button
                            className={`pos-fkey ${tieneSolicitudesPendientes && !showPendientesSolicitudes ? 'btn-blink' : ''}`}
                            disabled={!tieneSolicitudesPendientes}
                            onClick={() => setShowPendientesSolicitudes(true)}
                        >
                            <kbd>F1</kbd><span>Solicitudes</span>
                            {tieneSolicitudesPendientes && <span className="pos-dot"></span>}
                        </button>
                        <button
                            className={`pos-fkey is-mp ${tienePendientesMP && !showPendientesMP ? 'btn-blink' : ''}`}
                            disabled={!tienePendientesMP}
                            onClick={() => setShowPendientesMP(true)}
                        >
                            <kbd>F2</kbd>
                            <img src={logoMP} alt="" className="pos-fkey-logo" />
                            <span>MP</span>
                            {tienePendientesMP && <span className="pos-dot"></span>}
                        </button>
                        <button className="pos-fkey" onClick={() => setShowBuscarPedido(true)}>
                            <kbd>F3</kbd><span>Buscar Tickets</span>
                        </button>
                        <button className="pos-fkey" onClick={verResumen}>
                            <kbd>F4</kbd><span>Estadística</span>
                        </button>
                    </header>

                    <div className={`pos-row ${layout.side === 'left' ? 'is-left' : ''}`} ref={layout.rowRef}>
                        {/* Panel de productos. Es también la zona donde se suelta el
                            ticket para mandarlo al otro lado. */}
                        <section
                            className={`pos-panel-prod ${layout.dragging ? 'is-drop' : ''}`}
                            onDragOver={layout.onDragOver}
                            onDrop={layout.onDrop}
                        >
                            <div className="pos-search">
                                <span>⌕</span>
                                <input
                                    ref={buscadorRef}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    type="text"
                                    placeholder="Escribí para filtrar el menú…"
                                    className="fst-italic text-secondary"
                                />
                                <kbd>/ para enfocar</kbd>
                            </div>

                            <div className="pos-cats">
                                {categorias.map((categoria) => (
                                    <button
                                        key={categoria.id}
                                        className={`pos-cat ${categoriaSeleccionada === categoria.nombre ? 'is-on' : ''}`}
                                        onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                                    >
                                        {categoria.nombre || "Todo"}
                                    </button>
                                ))}
                            </div>

                            <div className="pos-grid">
                                {productosFiltrados.map((producto) => (
                                    <button
                                        key={producto.id}
                                        className="pos-prod"
                                        onClick={() => handleAgregarAlCarrito(producto)}
                                    >
                                        <div className={`pos-prod-img ${producto.imagen ? '' : 'is-empty'}`}>
                                            {producto.imagen
                                                ? <img src={producto.imagen} alt={producto.descripcion} />
                                                : "foto"}
                                        </div>
                                        <div className="pos-prod-info">
                                            <span className="pos-prod-name">{producto.descripcion}</span>
                                            <span className="pos-prod-price">{fmtPesos(producto.precio)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div
                            className={`pos-divider ${layout.grabbing ? 'is-grabbing' : ''}`}
                            onMouseDown={layout.onResizeStart}
                            onTouchStart={layout.onResizeStart}
                            onDoubleClick={layout.onResetWidth}
                            title="Arrastrá para repartir el ancho · doble clic para volver al mínimo"
                        >
                            <span></span>
                        </div>

                        <section className="pos-ticket" style={{ width: layout.width }}>
                            <div
                                className="pos-grip"
                                draggable="true"
                                onDragStart={layout.onDragStart}
                                onDragEnd={layout.onDragEnd}
                                title="Arrastrá para mover el ticket al otro lado"
                            >
                                <span></span><span></span>
                            </div>

                            <div className="pos-cliente">
                                <div className="pos-seg-group">
                                    <button
                                        type="button"
                                        className={`pos-seg ${esAfuera ? 'is-on' : ''}`}
                                        onClick={() => {
                                            setModoDelivery(false);
                                            setValue("envio", JSON.stringify({ zona_envio: ENVIOS_LOCALES[1], costo_envio: 0 }));
                                        }}
                                    >
                                        Espera afuera
                                    </button>
                                    <button
                                        type="button"
                                        className={`pos-seg ${esRetira ? 'is-on' : ''}`}
                                        onClick={() => {
                                            setModoDelivery(false);
                                            setValue("envio", JSON.stringify({ zona_envio: ENVIOS_LOCALES[0], costo_envio: 0 }));
                                        }}
                                    >
                                        Retira
                                    </button>
                                    <button
                                        type="button"
                                        className={`pos-seg ${mostrarDelivery ? 'is-on' : ''}`}
                                        onClick={() => {
                                            setModoDelivery(true);
                                            setValue("envio", "");
                                        }}
                                    >
                                        Delivery
                                    </button>
                                </div>

                                <div className="d-flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={10}
                                        className="pos-input is-tel"
                                        placeholder="Teléfono…"
                                        autoComplete="off"
                                        required
                                        {...register("telefono")}
                                        onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, ''); }}
                                    />
                                    <input
                                        type="text"
                                        className="pos-input flex-fill"
                                        placeholder="Nombre…"
                                        autoComplete="off"
                                        required
                                        {...register("nombre")}
                                    />
                                </div>

                                {mostrarDelivery && (
                                    <div className="d-flex flex-column gap-2">
                                        <input type="text" className="pos-input" placeholder="Dirección…" autoComplete="off" required {...register("direccion")} />
                                        <input type="text" className="pos-input" placeholder="Entre calles…" autoComplete="off" required {...register("entreCalles")} />
                                    </div>
                                )}
                            </div>

                            <div className="pos-count">
                                {unidades} ítem{unidades === 1 ? '' : 's'} · {carrito.length} fila{carrito.length === 1 ? '' : 's'}
                            </div>

                            <div className="pos-items">
                                {carrito.length === 0 ? (
                                    <div className="pos-vacio">Sin productos cargados</div>
                                ) : (
                                    /* El extra es una fila propia con las mismas cuatro columnas
                                       que el principal: así el precio y la ✕ caen alineados en
                                       vez de quedar pegados al nombre. La sangría y la itálica
                                       son las que lo muestran colgando de su producto. */
                                    gruposCarrito.map((grupo) => (
                                        <div className="pos-item-grupo" key={grupo.principal.carritoItemId}>
                                            <div className="pos-item">
                                                <span className="pos-item-qty">{grupo.principal.cantidad}</span>
                                                <span className="pos-item-name">{grupo.principal.descripcion}</span>
                                                <span className="pos-item-sub">{fmtPesos(grupo.principal.subtotal)}</span>
                                                <button
                                                    type="button"
                                                    className="pos-item-del"
                                                    title="Quitar uno"
                                                    onClick={() => handleEliminarDelCarrito(grupo.principal.carritoItemId)}
                                                >✕</button>
                                            </div>

                                            {grupo.extras.map((extra) => (
                                                <div className="pos-item is-extra" key={extra.carritoItemId}>
                                                    <span className="pos-item-qty">{extra.cantidad > 1 ? extra.cantidad : ''}</span>
                                                    <span className="pos-item-name">— {extra.descripcion}</span>
                                                    <span className="pos-item-sub">{fmtPesos(extra.subtotal)}</span>
                                                    <button
                                                        type="button"
                                                        className="pos-item-del"
                                                        title="Quitar adicional"
                                                        onClick={() => handleEliminarDelCarrito(extra.carritoItemId)}
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Observaciones como nota pegada al pie: siempre visible y
                                sin competir con los datos del cliente. */}
                            <div className="pos-nota">
                                <span className="pos-nota-label"><i className="fa fa-pen-to-square"></i></span>
                                <textarea
                                    rows="1"
                                    placeholder="Observaciones…"
                                    autoComplete="off"
                                    {...register("observaciones")}
                                ></textarea>
                            </div>

                            <div className="pos-cobro">
                                <div className="pos-seg-group">
                                    <button type="button" className={`pos-seg ${metodoPago === 'EFECTIVO' ? 'is-on' : ''}`} onClick={() => seleccionarMetodoPago("EFECTIVO")}>Efectivo</button>
                                    <button type="button" className={`pos-seg ${metodoPago === 'MP' ? 'is-on' : ''}`} onClick={() => seleccionarMetodoPago("MP")}>MP +{recargo}%</button>
                                    <button type="button" className={`pos-seg ${metodoPago === '%' ? 'is-on' : ''}`} onClick={() => seleccionarMetodoPago("%")}>Dividido</button>
                                </div>

                                {mostrarDelivery && (
                                    <div className="pos-fila">
                                        <select
                                            className="pos-select"
                                            value={envioRaw || ""}
                                            onChange={(e) => setValue("envio", e.target.value)}
                                        >
                                            <option value="">Zona de envío…</option>
                                            {zonasReparto.map((env) => (
                                                <option
                                                    key={env.id}
                                                    value={JSON.stringify({ zona_envio: env.zona_envio, costo_envio: env.costo_envio })}
                                                >
                                                    {env.zona_envio}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="pos-item-sub">{fmtPesos(envioSeleccionado?.costo_envio)}</span>
                                    </div>
                                )}

                                {/* "Paga con" no estaba en el diseño, pero sin él
                                    validarPedido no deja guardar un pedido en efectivo. */}
                                {metodoPago === "EFECTIVO" && (
                                    <div className="pos-fila">
                                        <span className="pos-desglose flex-fill">Paga con</span>
                                        <input
                                            type="number"
                                            className={`pos-monto-input ${pagaConCorto ? 'is-corto' : ''}`}
                                            autoComplete="off"
                                            min={0}
                                            placeholder="0"
                                            {...register("pagaCon", { valueAsNumber: true })}
                                        />
                                    </div>
                                )}

                                {metodoPago === "MP" && (
                                    <div className="pos-desglose">
                                        <span>Recargo MP {recargo}%</span>
                                        <span>{fmtPesos(totalFinal - totalBase)}</span>
                                    </div>
                                )}

                                {metodoPago === "%" && (<>
                                    <div className="pos-desglose">
                                        <span>Efectivo</span>
                                        <span>{fmtPesos(montoEfectivo)}</span>
                                    </div>
                                    <div className="pos-desglose">
                                        <span>MP</span>
                                        <span>{fmtPesos(montoMPConRecargo)}</span>
                                    </div>
                                </>)}

                                <div className="pos-total">
                                    <span className="pos-total-label">Total</span>
                                    <span className="pos-total-monto">{fmtPesos(totalFinal)}</span>
                                </div>

                                <div className="pos-actions">
                                    <button
                                        type="button"
                                        title="Horario Especial"
                                        className={`btn btn-warning pos-btn-horario`}
                                        onClick={toggleHorarioEspecial}
                                    >
                                        <span>⏱</span>
                                    </button>
                                    <button
                                        type="button"
                                        title="Limpiar (Esc)"
                                        className="btn btn-danger pos-btn-limpiar"
                                        onClick={() => { cancelarTicket() }}
                                    >
                                        {idSolicitud ? "Cancelar" : "Limpiar"}
                                    </button>
                                    <button
                                        type="button"
                                        className="pos-btn-crear"
                                        disabled={procesando}
                                        onClick={() => handleSubmit(guardarBD)()}
                                    >
                                        {procesando ? "Cargando..." : (
                                            <>
                                                Crear Pedido <i className="fas fa-burger"></i>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {showHorarioEspecial && (
                                    <div className="pos-fila">
                                        <select
                                            className="pos-select text-center"
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
                                            className="pos-select text-center"
                                            value={minutosEspecial}
                                            onChange={(e) => handleMinutosEspecialChange(e, horaEspecial)}
                                        >
                                            <option value="00">00</option>
                                            <option value="15">15</option>
                                            <option value="30">30</option>
                                            <option value="45">45</option>
                                        </select>
                                    </div>
                                )}

                                {/* El envío y el método de pago se manejan con tabs, pero
                                    siguen siendo campos del formulario: sin estos hidden
                                    quedarían fuera de handleSubmit y validarPedido. */}
                                <input type="hidden" {...register("envio")} />
                                <input type="hidden" {...register("metodoPago")} />
                                <input type="hidden" {...register("horarioEspecial")} />
                            </div>
                        </section>
                    </div>
                </div>
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

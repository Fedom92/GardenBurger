import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import Swal from "sweetalert2";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchSucursales } from "../../../Utils/sucursales";
import { getFechaComercial } from "../../../Utils/fechaComercial";
import { CATEGORIAS_COMBOS } from "../../../Utils/Constantes";
import { useAccionUnica } from "../../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../../Utils/avisos";
import { fmtPesos } from "../../../Utils/formato";
import { obtenerResumenes, primeraJornadaConPedidos } from "../../POS/pos_hooks/useResumenDiario";
import { KpiCard, BarChart, Section } from "../componentes";
import { rangoDeFiltro, armarEstadisticas, armarEvolucion } from "./calculos";
import "../Historico/Estadisticas.css";

// Estadísticas Generales: lo mismo que el Histórico (/estadisticas-viejas), pero
// con los datos del sistema nuevo. No lee pedidos: lee la FOTO de cada noche
// (resumenDiario), 1 lectura por noche y sucursal; las noches sin foto se calculan
// una vez y se guardan. Al entrar no lee nada: todo arranca con "Ver". La noche en
// curso no entra —todavía se mueve—: esa se ve en Métricas.
//
// La evolución anual tiene su propio botón: abarca desde la primera noche con
// pedidos de la sucursal, y no tiene sentido releerla cada vez que cambia un filtro.

const F = "YYYY-MM-DD";
const hoy = () => moment(getFechaComercial(), "DD-MM-YYYY");
const fmtN = (n) => (Number(n) || 0).toLocaleString("es-AR");
const fmtDia = (s) => moment(s, F).format("DD/MM/YYYY");

// Chrome abre el almanaque solo al tocar el iconito. Con esto lo abre todo el campo.
const abrirPicker = (e) => {
    try { e.currentTarget.showPicker?.(); } catch { /* navegador sin showPicker */ }
};

const COLOR_METODO = { Efectivo: "#f59e0b", "Mercado Pago": "#3b82f6", Dividido: "#a855f7" };
const COLORES_ANIO = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#06b6d4", "#ec4899"];

// Las categorías que suman como combo, de a tres por renglón, como en el Histórico.
const combosSub = (
    <span style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>
        {CATEGORIAS_COMBOS.map((c) => c.label).reduce((filas, label, i) => {
            if (i % 3 === 0) filas.push([]);
            filas[filas.length - 1].push(label);
            return filas;
        }, []).map((fila, i, todas) => (
            <React.Fragment key={i}>{fila.join(" + ")}{i < todas.length - 1 && <br />}</React.Fragment>
        ))}
    </span>
);

export default function EstadisticasGenerales() {
    const [sucursales, setSucursales] = useState([]);
    const [sucursal, setSucursal] = useState("TODAS");
    const [modo, setModo] = useState("mes");
    const [mes, setMes] = useState(() => hoy().format("YYYY-MM"));
    const [anio, setAnio] = useState(() => String(hoy().year()));
    const [desde, setDesde] = useState(() => hoy().startOf("month").format(F));
    const [hasta, setHasta] = useState(() => hoy().subtract(1, "day").format(F));

    const [consulta, setConsulta] = useState(null);   // { noches, desde, hasta, sucursal }
    const [evolucion, setEvolucion] = useState(null); // { data, anios, sucursal }
    const [evolucionVista, setEvolucionVista] = useState("combos");
    const { procesando, ejecutar } = useAccionUnica();
    const { procesando: cargandoEvolucion, ejecutar: ejecutarEvolucion } = useAccionUnica();

    useEffect(() => {
        fetchSucursales().then(setSucursales).catch((error) => {
            console.error(error);
            avisarErrorDeCarga("las sucursales");
        });
    }, []);

    // Los últimos años, para el filtro "Año". No se calculan de los datos: eso
    // costaría una lectura al entrar.
    const anios = useMemo(() => Array.from({ length: 4 }, (_, i) => String(hoy().year() - i)), []);

    const elegidas = () => (sucursal === "TODAS" ? sucursales : sucursales.filter((s) => s.id === sucursal));
    const nombreSucursal = () => (sucursal === "TODAS" ? "Todas" : sucursales.find((s) => s.id === sucursal)?.nombre || sucursal);

    const ver = () => ejecutar(async () => {
        const [d, h] = rangoDeFiltro({ modo, mes, anio, desde, hasta });
        if (!d || !h || d > h) {
            Swal.fire({ title: "Rango inválido", text: "La fecha desde tiene que ser anterior o igual a la fecha hasta.", icon: "warning", confirmButtonColor: "#198754" });
            return;
        }
        try {
            const listas = await Promise.all(elegidas().map((s) => obtenerResumenes(d, h, s.id)));
            setConsulta({ noches: listas.flat(), desde: d, hasta: h, sucursal: nombreSucursal() });
        } catch (error) {
            console.error("Error cargando estadísticas:", error);
            Swal.fire({ title: "Error", text: "No se pudieron cargar las estadísticas. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#dc3545" });
        }
    });

    // Desde la primera noche con pedidos de cada sucursal (1 lectura) hasta ayer.
    const verEvolucion = () => ejecutarEvolucion(async () => {
        const ayer = hoy().subtract(1, "day").format(F);
        try {
            const listas = await Promise.all(elegidas().map(async (s) => {
                const primera = await primeraJornadaConPedidos(s.id);
                if (!primera) return [];
                const inicio = moment(primera, "DD-MM-YYYY").format(F);
                return inicio > ayer ? [] : obtenerResumenes(inicio, ayer, s.id);
            }));
            setEvolucion({ ...armarEvolucion(listas.flat()), sucursal: nombreSucursal() });
        } catch (error) {
            console.error("Error cargando la evolución:", error);
            Swal.fire({ title: "Error", text: "No se pudo cargar la evolución. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#dc3545" });
        }
    });

    const e = useMemo(() => (consulta ? armarEstadisticas(consulta.noches) : null), [consulta]);
    const llegaAHoy = consulta && !moment(consulta.hasta, F).isBefore(hoy(), "day");

    return (
        <div className="est-wrap container-fluid">
            <h1 className="est-title est-titulo-pantalla fw-bolder mb-3">Estadísticas Generales</h1>

            {/* ── Filtros ── */}
            <div className="est-card est-filtros p-3 mb-4">
                <div className="est-filtro">
                    <label>Ver por</label>
                    <div className="mode-tabs d-flex rounded overflow-hidden">
                        {[["mes", "Mes"], ["anio", "Año"], ["rango", "Rango"]].map(([val, lbl]) => (
                            <button key={val} type="button" className={`flex-fill py-1 px-2 fw-bold m-0 ${modo === val ? "active" : ""}`} onClick={() => setModo(val)}>{lbl}</button>
                        ))}
                    </div>
                </div>

                {modo === "mes" && (
                    <div className="est-filtro">
                        <label>Mes</label>
                        <input className="form-control form-control-sm est-input text-center" type="month" value={mes} onClick={abrirPicker} onChange={(ev) => setMes(ev.target.value)} />
                    </div>
                )}

                {modo === "anio" && (
                    <div className="est-filtro">
                        <label>Año</label>
                        <select className="form-select form-select-sm est-input text-center" value={anio} onChange={(ev) => setAnio(ev.target.value)}>
                            {anios.map((a) => <option key={a}>{a}</option>)}
                        </select>
                    </div>
                )}

                {modo === "rango" && (<>
                    <div className="est-filtro">
                        <label>Desde</label>
                        <input className="form-control form-control-sm est-input text-center" type="date" value={desde} onClick={abrirPicker} onChange={(ev) => setDesde(ev.target.value)} />
                    </div>
                    <div className="est-filtro">
                        <label>Hasta</label>
                        <input className="form-control form-control-sm est-input text-center" type="date" value={hasta} onClick={abrirPicker} onChange={(ev) => setHasta(ev.target.value)} />
                    </div>
                </>)}

                <div className="est-filtro">
                    <label>Sucursal</label>
                    <select className="form-select form-select-sm est-input text-center" value={sucursal} onChange={(ev) => setSucursal(ev.target.value)}>
                        <option value="TODAS">Todas</option>
                        {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre || s.id}</option>)}
                    </select>
                </div>

                <div className="est-filtro">
                    <label>&nbsp;</label>
                    <button
                        type="button"
                        className="btn btn-sm fw-bold w-100"
                        style={{ background: "var(--accent)", color: "#fff" }}
                        onClick={ver}
                        disabled={procesando || !sucursales.length}
                    >
                        {procesando ? "Cargando..." : "Ver"}
                    </button>
                </div>
            </div>

            {!e ? (
                <div className="est-card p-4 mb-4 text-center text-secondary">
                    {procesando
                        ? <span className="spinner-border text-info" role="status"><span className="visually-hidden">Cargando...</span></span>
                        : <>Elegí el período y la sucursal, y tocá <strong className="text-light">Ver</strong>. No se lee nada hasta entonces.</>}
                </div>
            ) : (
                <div style={{ opacity: procesando ? 0.45 : 1, transition: "opacity .2s" }}>
                    <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ letterSpacing: "0.04em" }}>
                        Del {fmtDia(consulta.desde)} al {fmtDia(consulta.hasta)} · {consulta.sucursal} · {fmtN(e.noches)} {e.noches === 1 ? "noche" : "noches"}
                        {llegaAHoy && <span className="d-block fw-normal" style={{ textTransform: "none" }}>La noche en curso no entra: se ve en Métricas.</span>}
                    </div>

                    {/* ── KPI Grid ── */}
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-3 mb-4">
                        <div className="col"><KpiCard icon="🎫" label="Total Tickets" value={fmtN(e.kpis.tickets.total)} color="#6366f1"
                            sub={<><span className="d-block">{fmtN(e.kpis.tickets.validos)} válidos</span><span className="d-block">{fmtN(e.kpis.tickets.eliminados)} eliminados · {fmtN(e.kpis.tickets.cancelados)} cancelados</span></>} /></div>
                        <div className="col"><KpiCard icon="💵" label="Efectivo en Caja" value={fmtPesos(e.kpis.efectivo.total)} color="#f59e0b"
                            sub={<><span className="d-block">Delivery {fmtPesos(e.kpis.efectivo.delivery)}</span><span className="d-block">Mostrador {fmtPesos(e.kpis.efectivo.mostrador)}</span></>} /></div>
                        <div className="col"><KpiCard icon="📱" label="MercadoPago" value={fmtPesos(e.kpis.mp.total)} color="#3b82f6"
                            sub={`${e.kpis.mp.pctPedidos}% de los pedidos`} /></div>
                        <div className="col"><KpiCard icon="💰" label="Total Facturado" value={fmtPesos(e.kpis.facturado.total)} color="#22c55e"
                            sub={`Ticket promedio: ${fmtPesos(Math.round(e.kpis.facturado.ticketPromedio))}`} /></div>
                        <div className="col"><KpiCard icon="📦" label="Stock Vendido" value={fmtN(e.kpis.stock.unidades)} color="#06b6d4"
                            sub={`${e.kpis.stock.porTicket} ítems por pedido`} /></div>
                        <div className="col"><KpiCard icon="🍔" label="Combos" value={fmtN(e.kpis.combos)} color="#e85d04" sub={combosSub} /></div>
                        <div className="col"><KpiCard icon="🛵" label="Delivery" value={`${e.kpis.delivery.pct}%`} color="#a855f7"
                            sub={`${fmtN(e.kpis.delivery.delivery)} delivery · ${fmtN(e.kpis.delivery.mostrador)} mostrador`} /></div>
                        <div className="col"><KpiCard icon="📝" label="Con Observaciones" value={fmtN(e.kpis.observaciones.total)} color="#ec4899"
                            sub={`${e.kpis.observaciones.pct}% de los pedidos`} /></div>
                    </div>

                    {/* ── Delivery vs Mostrador + Métodos de pago ── */}
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-6">
                            <Section title="🛵 Delivery vs Mostrador">
                                <div className="d-flex align-items-center justify-content-around py-3 w-100 flex-grow-1">
                                    <div className="d-flex flex-column align-items-center gap-1">
                                        <span className="dvsv-val" style={{ "--dvsv-color": "#f97316" }}>{fmtN(e.canal.delivery)}</span>
                                        <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: "0.06em" }}>Delivery</span>
                                        <span className="fw-bolder fs-5 text-light">{e.canal.pctDelivery}%</span>
                                    </div>
                                    <div className="dvsv-sep align-self-stretch mx-3" />
                                    <div className="d-flex flex-column align-items-center gap-1">
                                        <span className="dvsv-val" style={{ "--dvsv-color": "#6366f1" }}>{fmtN(e.canal.mostrador)}</span>
                                        <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: "0.06em" }}>Mostrador</span>
                                        <span className="fw-bolder fs-5 text-light">{e.kpis.tickets.validos ? 100 - e.canal.pctDelivery : 0}%</span>
                                    </div>
                                </div>
                                <div className="dual-bar w-100 mt-2">
                                    <div style={{ width: `${e.canal.pctDelivery}%`, background: "#f97316" }} />
                                    <div style={{ width: `${e.kpis.tickets.validos ? 100 - e.canal.pctDelivery : 0}%`, background: "#6366f1" }} />
                                </div>
                            </Section>
                        </div>

                        <div className="col-12 col-lg-6">
                            <Section title="💳 Métodos de Pago">
                                <div className="d-flex flex-column justify-content-center flex-grow-1 gap-2">
                                    {e.metodosPago.length === 0 && <p className="text-secondary text-center py-4 small">Sin datos en el período seleccionado</p>}
                                    {e.metodosPago.map((m) => (
                                        <div key={m.label} className="d-flex flex-column gap-1">
                                            <div className="d-flex align-items-center gap-3 w-100">
                                                <span className="small fw-bold text-light flex-shrink-0" style={{ width: "90px" }}>{m.label}</span>
                                                <div className="bar-track flex-grow-1 overflow-hidden">
                                                    <div className="bar-fill" style={{ width: `${m.pct}%`, background: COLOR_METODO[m.label] || "#a855f7" }} />
                                                </div>
                                                <span className="text-secondary small text-nowrap text-end" style={{ minWidth: "140px" }}>
                                                    {m.pct}% · {fmtN(m.valor)} · {fmtPesos(m.total)}
                                                </span>
                                            </div>
                                            {m.extra && (
                                                <div className="d-flex justify-content-end w-100 pe-1" style={{ marginTop: "-4px" }}>
                                                    <span className="text-secondary" style={{ fontSize: "0.7rem", fontWeight: 600 }}>
                                                        (Efec. {fmtPesos(m.extra.efectivo)} | MP {fmtPesos(m.extra.mp)})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </div>
                    </div>

                    {/* ── Categorías y Zonas ── */}
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-6">
                            <Section title="🍔 Ventas por Categoría">
                                <BarChart items={e.categorias} fmt={fmtN} color="#e85d04" />
                            </Section>
                        </div>
                        <div className="col-12 col-lg-6">
                            <Section title="📍 Zonas de Envío">
                                <BarChart items={e.zonas} valueKey="pct" fmt={(n) => `${n}%`} color="#ec4899" />
                            </Section>
                        </div>
                    </div>

                    {/* ── Tops ── */}
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-4">
                            <Section title="🏆 Top 10 Productos">
                                <BarChart items={e.topProductos} fmt={fmtN} color="#22c55e" />
                            </Section>
                        </div>
                        <div className="col-12 col-lg-4">
                            <Section title="👥 Top 10 Clientes">
                                <BarChart items={e.topClientes} fmt={fmtN} color="#6366f1" />
                            </Section>
                        </div>
                        <div className="col-12 col-lg-4">
                            <Section title="🥤 Top 10 Bebidas">
                                {e.topBebidas.length > 0
                                    ? <BarChart items={e.topBebidas} fmt={fmtN} color="#06b6d4" />
                                    : <p className="text-secondary text-center py-4 small">No hay productos con categoría BEBIDAS en el período.</p>}
                            </Section>
                        </div>
                    </div>

                    {/* ── Temporales ── */}
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-6">
                            <Section title="📅 Pedidos por Día de la Semana">
                                <BarChart items={e.porDia} fmt={fmtN} color="#8b5cf6" />
                            </Section>
                        </div>
                        <div className="col-12 col-lg-6">
                            <Section title="🕐 Franja Horaria">
                                <BarChart items={e.porHora} fmt={fmtN} color="#f97316" />
                            </Section>
                        </div>
                    </div>

                    {/* ── Stock ── */}
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6">
                            <Section title="📦 Stock Total Vendido (Artículos)">
                                <BarChart items={e.stockArticulos} limit={25} fmt={fmtN} color="#8b5cf6" labelWidth="200px" />
                            </Section>
                        </div>
                        <div className="col-12 col-md-6">
                            <Section title="🥤 Stock Total Vendido (Bebidas)">
                                {e.stockBebidas.length > 0
                                    ? <BarChart items={e.stockBebidas} limit={25} fmt={fmtN} color="#3b82f6" labelWidth="200px" />
                                    : <p className="text-secondary text-center py-4 small">No hay bebidas vendidas.</p>}
                            </Section>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Evolución histórica anual: botón propio ── */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <div className="est-card p-4 h-100 d-flex flex-column">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2">
                            <h3 className="fs-6 fw-bold m-0 d-flex align-items-center gap-2 text-light">
                                📈 Evolución Histórica Anual
                                {evolucion && <span className="text-secondary fw-normal small">· {evolucion.sucursal}</span>}
                            </h3>
                            <div className="d-flex align-items-center gap-2">
                                {evolucion && (
                                    <div className="mode-tabs d-flex rounded overflow-hidden" style={{ transform: "scale(0.85)", margin: 0 }}>
                                        {[["combos", "Combos"], ["tickets", "Tickets"], ["monto", "Monto ($)"]].map(([val, lbl]) => (
                                            <button key={val} type="button" className={`flex-fill py-1 px-3 fw-bold m-0 ${evolucionVista === val ? "active" : ""}`} onClick={() => setEvolucionVista(val)}>{lbl}</button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary text-nowrap"
                                    onClick={verEvolucion}
                                    disabled={cargandoEvolucion || !sucursales.length}
                                    title="Lee todas las noches desde la primera con pedidos: 1 lectura por noche y sucursal"
                                >
                                    {cargandoEvolucion ? "Cargando..." : evolucion ? "Actualizar" : "Cargar evolución"}
                                </button>
                            </div>
                        </div>

                        {!evolucion ? (
                            <p className="text-secondary small mb-0">
                                Combos, tickets y monto mes a mes, año contra año, de la sucursal elegida en el filtro.
                                Se carga aparte porque lee todas las noches desde la primera con pedidos.
                            </p>
                        ) : (
                            <div className="w-100 mt-2" style={{ height: "350px", overflow: "hidden", minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={evolucion.data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                                        <YAxis
                                            stroke="#9ca3af"
                                            tick={{ fill: "#9ca3af", fontSize: 12 }}
                                            tickFormatter={(val) => (evolucionVista === "monto" ? `$${val / 1000}k` : val)}
                                            width={60}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "13px" }}
                                            formatter={(value, name) => [evolucionVista === "monto" ? fmtPesos(value) : fmtN(value), name]}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: "13px", paddingTop: "10px" }} />
                                        {evolucion.anios.map((y, idx) => {
                                            const color = COLORES_ANIO[idx % COLORES_ANIO.length];
                                            return (
                                                <Line
                                                    key={y}
                                                    type="monotone"
                                                    dataKey={`${y}_${evolucionVista}`}
                                                    name={String(y)}
                                                    stroke={color}
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "#0f172a" }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

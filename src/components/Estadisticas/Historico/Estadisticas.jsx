import React, { useMemo, useState } from "react";
import { useSheetData } from "./useGoogleSheets";
import { CATEGORIAS_HAMBURGUESA } from "../../../Utils/Constantes";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Estadisticas.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseMoney = (str = "") =>
    parseInt((str || "").replace(/[$.\\s]/g, ""), 10) || 0;

const parseDate = (str = "") => {
    if (!str) return null;
    const [datePart, timePart = "00:00"] = str.trim().split(" ");
    const [day, month, year] = datePart.split("/");
    const [hour, min] = (timePart || "00:00").split(":");
    const d = new Date(+year, +month - 1, +day, +hour, +min);
    return isNaN(d) ? null : d;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt$ = (n) => `$${Math.round(n).toLocaleString("es-AR")}`;
const fmtN = (n) => Number(n).toLocaleString("es-AR");

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = "#6366f1" }) {
    return (
        <div className="est-card kpi-card h-100 p-3 d-flex align-items-start gap-3" style={{ "--kpi-color": color }}>
            <div className="kpi-icon-wrap flex-shrink-0 d-flex align-items-center justify-content-center">
                {icon}
            </div>
            <div className="d-flex flex-column text-start">
                <span className="text-secondary small fw-bold text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                    {label}
                </span>
                <span className="fs-4 fw-bolder mb-1 lh-1 text-light">{value}</span>
                {sub && <span className="text-white small mb-0 lh-sm" style={{ fontSize: "0.75rem" }}>{sub}</span>}
            </div>
        </div>
    );
}

function BarChart({ items = [], valueKey = "valor", labelKey = "label", fmt = fmtN, color, limit, labelWidth }) {
    const [expanded, setExpanded] = useState(false);

    if (!items.length) return <p className="text-secondary text-center py-4 small">Sin datos en el período seleccionado</p>;

    const displayItems = (limit && !expanded) ? items.slice(0, limit) : items;
    const max = Math.max(...items.map(i => i[valueKey]), 1);

    return (
        <div className="d-flex flex-column gap-2 w-100">
            {displayItems.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2">
                    <span
                        className="bar-label flex-shrink-0 text-start"
                        style={labelWidth ? { width: labelWidth, minWidth: labelWidth, maxWidth: labelWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : {}}
                    >
                        {item[labelKey]}
                    </span>
                    <div className="bar-track flex-grow-1 overflow-hidden w-100">
                        <div
                            className="bar-fill"
                            style={{
                                width: `${(item[valueKey] / max) * 100}%`,
                                background: color || `hsl(${220 + idx * 15}, 70%, 60%)`
                            }}
                        />
                    </div>
                    <span className="small fw-bold text-end text-light" style={{ minWidth: "60px" }}>{fmt(item[valueKey])}</span>
                </div>
            ))}
            {limit && items.length > limit && (
                <button
                    className="btn btn-sm btn-outline-secondary mt-2 w-100"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "Ver menos" : `Ver ${items.length - limit} más`}
                </button>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="est-card p-4 h-100 d-flex flex-column">
            <h3 className="fs-6 fw-bold mb-3 d-flex align-items-center gap-2 text-light">{title}</h3>
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Estadisticas() {
    const { ventas, pagos, loading } = useSheetData();

    // ── Filtros ──
    const [sucursal, setSucursal] = useState("TODAS");
    const [modoFecha, setModoFecha] = useState("mes");
    const [desde, setDesde] = useState("");
    const [desdeHora, setDesdeHora] = useState("");
    const [hasta, setHasta] = useState("");
    const [hastaHora, setHastaHora] = useState("");
    const [evolucionVista, setEvolucionVista] = useState("mes");
    const now = new Date();
    const [mesSelec, setMesSelec] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
    const [añoSelec, setAñoSelec] = useState(String(now.getFullYear()));

    // ── Listas dinámicas para filtros ──
    const sucursales = useMemo(() => {
        const set = new Set(pagos.map(p => (p.sucursal || "").trim()).filter(Boolean));
        return ["TODAS", ...Array.from(set).sort()];
    }, [pagos]);

    const años = useMemo(() => {
        const set = new Set(
            pagos.map(p => { const d = parseDate(p.timestamp); return d?.getFullYear(); }).filter(Boolean)
        );
        return Array.from(set).sort((a, b) => b - a);
    }, [pagos]);

    // ── Aplicar filtros a pagos ──
    const pagosFiltrados = useMemo(() => {
        return pagos.filter(p => {
            if (sucursal !== "TODAS" && (p.sucursal || "").trim() !== sucursal) return false;
            const d = parseDate(p.timestamp);
            if (!d) return false;
            if (modoFecha === "rango") {
                if (desde) {
                    const [y, m, day] = desde.split("-");
                    const dDesde = new Date(+y, +m - 1, +day);
                    if (desdeHora) dDesde.setHours(parseInt(desdeHora, 10), 0, 0);
                    if (d < dDesde) return false;
                }
                if (hasta) {
                    const [y, m, day] = hasta.split("-");
                    const dHasta = new Date(+y, +m - 1, +day);
                    if (hastaHora) dHasta.setHours(parseInt(hastaHora, 10), 59, 59);
                    else dHasta.setHours(23, 59, 59);
                    if (d > dHasta) return false;
                }
            } else if (modoFecha === "mes") {
                const [y, m] = mesSelec.split("-");
                if (d.getFullYear() !== +y || d.getMonth() + 1 !== +m) return false;
            } else if (modoFecha === "año") {
                if (d.getFullYear() !== +añoSelec) return false;
            }
            return true;
        });
    }, [pagos, sucursal, modoFecha, desde, hasta, desdeHora, hastaHora,mesSelec, añoSelec]);

    // ── Separar válidos / cancelados ──
    const ticketsCancelados = useMemo(() =>
        pagosFiltrados.filter(p => (p.cancelado || "").toUpperCase() === "X"),
        [pagosFiltrados]);

    const ticketsValidos = useMemo(() =>
        pagosFiltrados.filter(p => (p.cancelado || "").toUpperCase() !== "X"),
        [pagosFiltrados]);

    const ticketIdsValidos = useMemo(() =>
        new Set(ticketsValidos.map(p => p.nroTicket)),
        [ticketsValidos]);

    // ── Ventas filtradas por tickets válidos ──
    const ventasFiltradas = useMemo(() =>
        ventas.filter(v => ticketIdsValidos.has(v.nroTicket)),
        [ventas, ticketIdsValidos]);

    // ── KPIs financieros ──
    const totalEfectivo = useMemo(() =>
        ticketsValidos.reduce((sum, p) => {
            if (p.metodoPago === "Efectivo") return sum + parseMoney(p.total);
            if (p.metodoPago === "%") return sum + parseMoney(p.montoEfectivo);
            return sum;
        }, 0), [ticketsValidos]);

    const totalMP = useMemo(() =>
        ticketsValidos.reduce((sum, p) => {
            if (p.metodoPago === "MP") return sum + parseMoney(p.total);
            if (p.metodoPago === "%") {
                const total = parseMoney(p.total);
                const ef = parseMoney(p.montoEfectivo);
                return sum + Math.max(0, total - ef);
            }
            return sum;
        }, 0), [ticketsValidos]);

    const totalCaja = totalEfectivo + totalMP;
    const ticketPromedio = ticketsValidos.length > 0 ? totalCaja / ticketsValidos.length : 0;

    // ── Delivery vs Retiro ──
    const delivery = useMemo(() => ticketsValidos.filter(p => parseMoney(p.envio) > 0), [ticketsValidos]);
    const retiro = useMemo(() => ticketsValidos.filter(p => parseMoney(p.envio) === 0), [ticketsValidos]);
    const pctDelivery = ticketsValidos.length > 0 ? Math.round((delivery.length / ticketsValidos.length) * 100) : 0;

    const efectivoDelivery = useMemo(() =>
        delivery.reduce((sum, p) => {
            if (p.metodoPago === "Efectivo") return sum + parseMoney(p.total);
            if (p.metodoPago === "%") return sum + parseMoney(p.montoEfectivo);
            return sum;
        }, 0), [delivery]);

    // ── Métodos de pago ──
    const metodosPago = useMemo(() => {
        const counts = {}, totals = {};
        let efectivoExtra = 0;
        let mpExtra = 0;

        ticketsValidos.forEach(p => {
            const m = p.metodoPago === "%" ? "Mixto" : (p.metodoPago || "Otro");
            counts[m] = (counts[m] || 0) + 1;
            totals[m] = (totals[m] || 0) + parseMoney(p.total);

            if (m === "Mixto") {
                const ef = parseMoney(p.montoEfectivo);
                const mp = parseMoney(p.total) - ef;
                efectivoExtra += ef;
                mpExtra += Math.max(0, mp);
            }
        });
        const total = ticketsValidos.length || 1;
        return Object.entries(counts)
            .map(([label, qty]) => ({
                label,
                valor: qty,
                total: totals[label] || 0,
                pct: Math.round((qty / total) * 100),
                extra: label === "Mixto" ? { ef: efectivoExtra, mp: mpExtra } : null
            }))
            .sort((a, b) => b.valor - a.valor);
    }, [ticketsValidos]);

    // ── Categorías ──
    const categorias = useMemo(() => {
        const map = {};
        ventasFiltradas.forEach(v => {
            const cat = (v.categoria || "SIN CAT").trim().toUpperCase();
            if (!map[cat]) map[cat] = { label: cat, valor: 0 };
            map[cat].valor += Number(v.cantidad) || 1;
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor);
    }, [ventasFiltradas]);

    // hamburguesas agrupadas
    const totalBurgers = useMemo(() =>
        categorias.filter(c => CATEGORIAS_HAMBURGUESA.includes(c.label)).reduce((s, c) => s + c.valor, 0),
        [categorias]);

    // ── Top productos / bebidas ──
    const topProductos = useMemo(() => {
        const map = {};
        ventasFiltradas.forEach(v => {
            const cat = (v.categoria || "").trim().toUpperCase();
            if (cat === "BEBIDAS") return;
            const desc = (v.descripcion || "SIN DESC").trim();
            if (!map[desc]) map[desc] = { label: desc, valor: 0 };
            map[desc].valor += Number(v.cantidad) || 1;
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
    }, [ventasFiltradas]);

    const topBebidas = useMemo(() => {
        const map = {};
        ventasFiltradas.forEach(v => {
            const cat = (v.categoria || "").trim().toUpperCase();
            if (cat !== "BEBIDAS") return;
            const desc = (v.descripcion || "SIN DESC").trim();
            if (!map[desc]) map[desc] = { label: desc, valor: 0 };
            map[desc].valor += Number(v.cantidad) || 1;
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
    }, [ventasFiltradas]);

    // ── Top clientes ──
    const topClientes = useMemo(() => {
        const map = {};
        ticketsValidos.forEach(p => {
            const nombre = (p.nombre || "").trim();
            if (!nombre) return;
            if (!map[nombre]) map[nombre] = { label: nombre, valor: 0, monto: 0 };
            map[nombre].valor += 1;
            map[nombre].monto += parseMoney(p.total);
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
    }, [ticketsValidos]);

    // ── Stock total ──
    const stockTotal = useMemo(() =>
        ventasFiltradas.reduce((sum, v) => sum + (Number(v.cantidad) || 1), 0),
        [ventasFiltradas]);

    const promedioItems = ticketsValidos.length > 0
        ? (ventasFiltradas.length / ticketsValidos.length).toFixed(1)
        : "0";

    // ── Stock agrupado por descripción (No Bebidas y Bebidas) ──
    const stockVendidosNoBebidas = useMemo(() => {
        const map = {};
        ventasFiltradas.forEach(v => {
            const cat = (v.categoria || "").trim().toUpperCase();
            if (cat === "BEBIDAS") return;
            const desc = (v.descripcion || "SIN DESC").trim();
            const labelStr = `${desc} [${cat}]`;
            if (!map[labelStr]) map[labelStr] = { label: labelStr, valor: 0, cat, desc };
            map[labelStr].valor += (Number(v.cantidad) || 1);
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor);
    }, [ventasFiltradas]);

    const stockVendidosBebidas = useMemo(() => {
        const map = {};
        ventasFiltradas.forEach(v => {
            const cat = (v.categoria || "").trim().toUpperCase();
            if (cat !== "BEBIDA" && cat !== "BEBIDAS") return;
            const desc = (v.descripcion || "SIN DESC").trim();
            if (!map[desc]) map[desc] = { label: desc, valor: 0, cat, desc };
            map[desc].valor += (Number(v.cantidad) || 1);
        });
        return Object.values(map).sort((a, b) => b.valor - a.valor);
    }, [ventasFiltradas]);

    // ── Día de la semana ──
    const porDia = useMemo(() => {
        const map = Array(7).fill(0);
        ticketsValidos.forEach(p => { const d = parseDate(p.timestamp); if (d) map[d.getDay()]++; });
        return DIAS.map((label, i) => ({ label, valor: map[i] }));
    }, [ticketsValidos]);

    // ── Franja horaria ──
    const porHora = useMemo(() => {
        const map = {};
        ticketsValidos.forEach(p => {
            const d = parseDate(p.timestamp);
            if (!d) return;
            const label = `${String(d.getHours()).padStart(2, "0")}hs`;
            map[label] = (map[label] || 0) + 1;
        });
        return Object.entries(map).map(([label, valor]) => ({ label, valor })).sort((a, b) => a.label.localeCompare(b.label));
    }, [ticketsValidos]);

    // ── Zonas de envío (porcentajes) ──
    const zonas = useMemo(() => {
        const map = {};
        ticketsValidos.forEach(p => {
            let zona = (p.zonaEnvio || "").trim().toUpperCase();
            if (parseMoney(p.envio) === 0) {
                zona = "RETIRA";
            } else if (!zona) {
                return; // ignored empty ones
            }
            map[zona] = (map[zona] || 0) + 1;
        });
        const total = ticketsValidos.length || 1;
        return Object.entries(map)
            .map(([label, valor]) => ({ label, valor, pct: Math.round((valor / total) * 100) }))
            .sort((a, b) => b.pct - a.pct);
    }, [ticketsValidos]);

    // ── Data para Recharts (Evolución) ──
    const chartData = useMemo(() => {
        // [ { name: 'Ene', '2023_tickets': 150, '2023_monto': 500000, '2024_tickets': 200, ... }, ... ]
        const data = MESES_CORTO.map(m => ({ name: m }));

        pagos.filter(p => {
            if (sucursal !== "TODAS" && (p.sucursal || "").trim() !== sucursal) return false;
            return (p.cancelado || "").toUpperCase() !== "X";
        }).forEach(p => {
            const d = parseDate(p.timestamp);
            if (!d) return;
            const mesIdx = d.getMonth();
            const year = d.getFullYear();

            data[mesIdx][`${year}_tickets`] = (data[mesIdx][`${year}_tickets`] || 0) + 1;
            data[mesIdx][`${year}_monto`] = (data[mesIdx][`${year}_monto`] || 0) + parseMoney(p.total);
        });
        return data;
    }, [pagos, sucursal]);

    // ── Observaciones ──
    const conObservaciones = useMemo(() =>
        ticketsValidos.filter(p => (p.observaciones || "").trim() !== ""),
        [ticketsValidos]);

    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="w-100 d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                <span className="spinner-border text-info" role="status">
                    <span className="visually-hidden">Loading...</span>
                </span>
            </div>
        );
    }

    return (
        <div className="est-wrap container-fluid">

            {/* ── Header ── */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <h1 className="est-title fw-bolder mb-1">📊 Estadísticas</h1>
                </div>
                {/*<div className="d-flex gap-2 flex-wrap">
                    <span className="chip chip--green text-nowrap">{fmtN(ticketsValidos.length)} tickets válidos</span>
                    <span className="chip chip--blue text-nowrap">{fmt$(totalCaja)} total</span>
                </div>*/}
            </div>

            {/* ── Filtros ── */}
            <div className="est-card p-3 mb-4 d-flex flex-column flex-md-row flex-wrap align-items-md-end gap-3 w-100">
                <div className="d-flex flex-column flex-grow-1" style={{ minWidth: "140px", maxWidth: "250px" }}>
                    <label className="text-secondary small fw-bold mb-1 text-uppercase" style={{ letterSpacing: "0.05em", fontSize: "0.75rem" }}>Ver por</label>
                    <div className="mode-tabs d-flex rounded overflow-hidden">
                        {[["rango", "Rango"], ["mes", "Mes"], ["año", "Año"]].map(([val, lbl]) => (
                            <button key={val} className={`flex-fill py-1 px-2 fw-bold m-0 ${modoFecha === val ? "active" : ""}`} onClick={() => setModoFecha(val)}>{lbl}</button>
                        ))}
                    </div>
                </div>

                {modoFecha === "rango" && (<>
                    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: "200px" }}>
                        <label className="text-secondary small fw-bold mb-1 text-uppercase" style={{ fontSize: "0.75rem" }}>Desde</label>
                        <div className="d-flex gap-1">
                            <input className="form-control form-control-sm est-input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                            <select className="form-select form-select-sm est-input w-auto" value={desdeHora} onChange={e => setDesdeHora(e.target.value)}>
                                <option value="">Hora</option>
                                {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: "200px" }}>
                        <label className="text-secondary small fw-bold mb-1 text-uppercase" style={{ fontSize: "0.75rem" }}>Hasta</label>
                        <div className="d-flex gap-1">
                            <input className="form-control form-control-sm est-input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                            <select className="form-select form-select-sm est-input w-auto" value={hastaHora} onChange={e => setHastaHora(e.target.value)}>
                                <option value="">Hora</option>
                                {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                            </select>
                        </div>
                    </div>
                </>)}

                {modoFecha === "mes" && (
                    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: "140px" }}>
                        <label className="text-secondary small fw-bold mb-1 text-uppercase" style={{ fontSize: "0.75rem" }}>Mes</label>
                        <input className="form-control form-control-sm est-input" type="month" value={mesSelec} onChange={e => setMesSelec(e.target.value)} />
                    </div>
                )}

                {modoFecha === "año" && (
                    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: "140px" }}>
                        <label className="text-secondary small fw-bold mb-1 text-uppercase" style={{ fontSize: "0.75rem" }}>Año</label>
                        <select className="form-select form-select-sm est-input" value={añoSelec} onChange={e => setAñoSelec(e.target.value)}>
                            {años.map(a => <option key={a}>{a}</option>)}
                        </select>
                    </div>
                )}

                <div className="d-flex flex-column flex-grow-1 ms-md-auto" style={{ maxWidth: "200px" }}>
                    <label className="text-secondary small fw-bold mb-1 text-uppercase text-md-end" style={{ letterSpacing: "0.05em", fontSize: "0.75rem" }}>Sucursal</label>
                    <select className="form-select form-select-sm est-input" value={sucursal} onChange={e => setSucursal(e.target.value)}>
                        {sucursales.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-3 mb-4">
                <div className="col"><KpiCard icon="🎫" label="Total Tickets" value={fmtN(pagosFiltrados.length)} sub={<><span className="d-block">{fmtN(ticketsValidos.length)} válidos</span><span className="d-block">{fmtN(ticketsCancelados.length)} cancelados</span></>} color="#6366f1" /></div>
                <div className="col"><KpiCard icon="💵" label="Efectivo en Caja" value={fmt$(totalEfectivo)} sub={<><span className="d-block">Delivery {fmt$(efectivoDelivery)}</span><span className="d-block">Retiro {fmt$(totalEfectivo - efectivoDelivery)}</span></>} color="#f59e0b" /></div>
                <div className="col"><KpiCard icon="📱" label="MercadoPago" value={fmt$(totalMP)} sub={`${metodosPago.find(m => m.label === "MP")?.pct ?? 0}% de los tickets`} color="#3b82f6" /></div>
                <div className="col"><KpiCard icon="💰" label="Total Facturado" value={fmt$(totalCaja)} sub={`Ticket promedio: ${fmt$(ticketPromedio)}`} color="#22c55e" /></div>
                <div className="col"><KpiCard icon="📦" label="Stock Vendido" value={fmtN(stockTotal)} sub={`${promedioItems} ítems por ticket`} color="#06b6d4" /></div>
                <div className="col"><KpiCard icon="🍔" label="Combos" value={fmtN(totalBurgers)} sub="Simple + Doble + Triple" color="#e85d04" /></div>
                <div className="col"><KpiCard icon="🛵" label="Delivery" value={`${pctDelivery}%`} sub={`${fmtN(delivery.length)} delivery · ${fmtN(retiro.length)} retiro`} color="#a855f7" /></div>
                <div className="col"><KpiCard icon="📝" label="Con Observaciones" value={fmtN(conObservaciones.length)} sub={`${ticketsValidos.length > 0 ? Math.round((conObservaciones.length / ticketsValidos.length) * 100) : 0}% de los pedidos`} color="#ec4899" /></div>
            </div>

            {/* ── Delivery vs Retiro + Métodos de pago ── */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-lg-6">
                    <Section title="🛵 Delivery vs Retiro">
                        <div className="d-flex align-items-center justify-content-around py-3 w-100 flex-grow-1">
                            <div className="d-flex flex-column align-items-center gap-1">
                                <span className="dvsv-val" style={{ "--dvsv-color": "#f97316" }}>{delivery.length}</span>
                                <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: "0.06em" }}>Delivery</span>
                                <span className="fw-bolder fs-5 text-light">{pctDelivery}%</span>
                            </div>
                            <div className="dvsv-sep align-self-stretch mx-3" />
                            <div className="d-flex flex-column align-items-center gap-1">
                                <span className="dvsv-val" style={{ "--dvsv-color": "#6366f1" }}>{retiro.length}</span>
                                <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: "0.06em" }}>Retiro</span>
                                <span className="fw-bolder fs-5 text-light">{100 - pctDelivery}%</span>
                            </div>
                        </div>
                        <div className="dual-bar w-100 mt-2">
                            <div style={{ width: `${pctDelivery}%`, background: "#f97316" }} />
                            <div style={{ width: `${100 - pctDelivery}%`, background: "#6366f1" }} />
                        </div>
                    </Section>
                </div>

                <div className="col-12 col-lg-6">
                    <Section title="💳 Métodos de Pago">
                        <div className="d-flex flex-column justify-content-center flex-grow-1 gap-2">
                            {metodosPago.map(m => (
                                <div key={m.label} className="d-flex flex-column gap-1">
                                    <div className="d-flex align-items-center gap-3 w-100">
                                        <span className="small fw-bold text-light flex-shrink-0" style={{ width: "60px" }}>{m.label}</span>
                                        <div className="bar-track flex-grow-1 overflow-hidden">
                                            <div className="bar-fill" style={{ width: `${m.pct}%`, background: m.label === "MP" ? "#3b82f6" : m.label === "Efectivo" ? "#f59e0b" : "#a855f7" }} />
                                        </div>
                                        <span className="text-secondary small text-nowrap text-end" style={{ minWidth: "140px" }}>
                                            {m.pct}% · {m.valor} · {fmt$(m.total)}
                                        </span>
                                    </div>
                                    {m.extra && (
                                        <div className="d-flex justify-content-end w-100 pe-1" style={{ marginTop: "-4px" }}>
                                            <span className="text-secondary" style={{ fontSize: "0.7rem", fontWeight: 600 }}>
                                                (Efec. {fmt$(m.extra.ef)} | MP {fmt$(m.extra.mp)})
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
                        <BarChart items={categorias} color="#e85d04" />
                    </Section>
                </div>
                <div className="col-12 col-lg-6">
                    <Section title="📍 Zonas de Envío">
                        <BarChart items={zonas} valueKey="pct" fmt={n => `${n}%`} color="#ec4899" />
                    </Section>
                </div>
            </div>

            {/* ── Tops (3 columnas) ── */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-lg-4">
                    <Section title="🏆 Top 10 Productos">
                        <BarChart items={topProductos} color="#22c55e" />
                    </Section>
                </div>
                <div className="col-12 col-lg-4">
                    <Section title="👥 Top 10 Clientes">
                        <BarChart items={topClientes} fmt={fmtN} color="#6366f1" />
                    </Section>
                </div>
                <div className="col-12 col-lg-4">
                    <Section title="🥤 Top 10 Bebidas">
                        {topBebidas.length > 0
                            ? <BarChart items={topBebidas} color="#06b6d4" />
                            : <p className="text-secondary text-center py-4 small">No hay productos con categoría BEBIDA en el período.</p>
                        }
                    </Section>
                </div>
            </div>

            {/* ── Temporales ── */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-lg-6">
                    <Section title="📅 Pedidos por Día de la Semana">
                        <BarChart items={porDia} color="#8b5cf6" />
                    </Section>
                </div>
                <div className="col-12 col-lg-6">
                    <Section title="🕐 Franja Horaria">
                        <BarChart items={porHora} color="#f97316" />
                    </Section>
                </div>
            </div>

            {/* ── Evolución Histórica (Recharts) ── */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <div className="est-card p-4 h-100 d-flex flex-column">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2">
                            <h3 className="fs-6 fw-bold m-0 d-flex align-items-center gap-2 text-light">📈 Evolución Histórica Anual</h3>
                            <div className="mode-tabs d-flex rounded overflow-hidden" style={{ transform: "scale(0.85)", margin: 0 }}>
                                <button className={`flex-fill py-1 px-3 fw-bold m-0 ${evolucionVista === "mes" ? "active" : ""}`} onClick={() => setEvolucionVista("mes")}>Cantidad Tickets</button>
                                <button className={`flex-fill py-1 px-3 fw-bold m-0 ${evolucionVista === "año" ? "active" : ""}`} onClick={() => setEvolucionVista("año")}>Monto ($)</button>
                            </div>
                        </div>
                        <div className="w-100 mt-2" style={{ height: "350px", overflow: "hidden", minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis
                                        stroke="#9ca3af"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        tickFormatter={val => evolucionVista === "año" ? `$${(val / 1000)}k` : val}
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                                        formatter={(value, name) => {
                                            const isMonto = name.includes('monto');
                                            const label = name.split('_')[0]; // Year
                                            return [isMonto ? fmt$(value) : fmtN(value), label];
                                        }}
                                        itemStyle={{ textTransform: 'capitalize' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                                    {años.map((yr, idx) => {
                                        const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#06b6d4", "#ec4899"];
                                        const color = colors[idx % colors.length];
                                        return (
                                            <Line
                                                key={yr}
                                                type="monotone"
                                                dataKey={evolucionVista === "mes" ? `${yr}_tickets` : `${yr}_monto`}
                                                name={String(yr)}
                                                stroke={color}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#0f172a' }}
                                                activeDot={{ r: 6 }}
                                            />
                                        )
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stock por Categoría ── */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                    <Section title="📦 Stock Total Vendido (Artículos)">
                        <BarChart items={stockVendidosNoBebidas} limit={25} fmt={fmtN} color="#8b5cf6" labelWidth="200px" />
                    </Section>
                </div>
                <div className="col-12 col-md-6">
                    <Section title="🥤 Stock Total Vendido (Bebidas)">
                        {stockVendidosBebidas.length > 0
                            ? <BarChart items={stockVendidosBebidas} limit={25} fmt={fmtN} color="#3b82f6" labelWidth="200px" />
                            : <p className="text-secondary text-center py-4 small">No hay bebidas vendidas.</p>
                        }
                    </Section>
                </div>
            </div>
        </div>
    );
}

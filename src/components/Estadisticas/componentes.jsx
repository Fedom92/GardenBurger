import React, { useState } from "react";

// Lo visual de las pantallas de números: el Histórico (TSV), Métricas y, más
// adelante, Estadísticas Generales. Los estilos están en Historico/Estadisticas.css,
// que cada pantalla importa.

// Mismo formato que el `fmtN` del Histórico, SIN guarda `|| 0` a propósito: ahí un
// dato faltante del TSV tiene que verse como NaN y no pasar por un 0 legítimo.
const fmtN = (n) => Number(n).toLocaleString("es-AR");

// `compacto`: menos aire, para pantallas que tienen que entrar enteras en el celular
// (Métricas). El texto ocupa todo el ancho, así un `sub` puede llevar una barra.
export function KpiCard({ icon, label, value, sub, color = "#6366f1", compacto = false }) {
    return (
        <div
            className={`est-card kpi-card h-100 d-flex align-items-start ${compacto ? "kpi-card--compacto p-2 gap-2" : "p-3 gap-3"}`}
            style={{ "--kpi-color": color }}
        >
            <div className="kpi-icon-wrap flex-shrink-0 d-flex align-items-center justify-content-center">
                {icon}
            </div>
            <div className={`d-flex flex-column text-start ${compacto ? "flex-grow-1" : ""}`} style={compacto ? { minWidth: 0 } : undefined}>
                <span className="text-secondary small fw-bold text-uppercase mb-1" style={{ letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                    {label}
                </span>
                <span className={`${compacto ? "fs-5" : "fs-4"} fw-bolder mb-1 lh-1 text-light`}>{value}</span>
                {sub && <span className="text-white small mb-0 lh-sm" style={{ fontSize: "0.75rem" }}>{sub}</span>}
            </div>
        </div>
    );
}

export function BarChart({ items = [], valueKey = "valor", labelKey = "label", fmt = fmtN, color, limit, labelWidth }) {
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

export function Section({ title, children }) {
    return (
        <div className="est-card p-4 h-100 d-flex flex-column">
            <h3 className="fs-6 fw-bold mb-3 d-flex align-items-center gap-2 text-light">{title}</h3>
            {children}
        </div>
    );
}

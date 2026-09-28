import React, { useEffect, useState } from "react";
import moment from "moment";
import Swal from "sweetalert2";
import { fetchSucursales } from "../../Utils/sucursales";
import { getFechaComercial } from "../../Utils/fechaComercial";
import { obtenerResumenes, obtenerArqueo, sumarResumenes, esCombo } from "../POS/pos_hooks/useResumenDiario";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../Utils/avisos";
import { fmtPesos } from "../../Utils/formato";
import { KpiCard, BarChart } from "../Estadisticas/componentes";
import "../Estadisticas/Historico/Estadisticas.css";
import "./Metricas.css";

// Métricas: el vistazo rápido del admin, de todas las sucursales, desde el celular.
// Se maneja con botones, como una app: primero la sucursal y después el período;
// con los dos elegidos busca solo, y cambiar cualquiera vuelve a buscar. Al entrar
// no lee nada: las tarjetas arrancan en cero. Tiene el aspecto del Histórico
// (tarjetas y barras compartidas en Estadisticas/componentes.jsx).
//
// Lee las fotos de cada noche (1 lectura por noche y sucursal); las que faltan se
// calculan una vez y se guardan. La noche en curso no tiene foto: los períodos que
// llegan a hoy la calculan en el momento desde sus pedidos (~60-100 lecturas por
// sucursal), igual que el F4. El detalle de los pedidos está en Historial; lo
// completo, en Estadísticas.

const F = "YYYY-MM-DD";
// "Hoy" es la jornada en curso: a las 00:30 todavía es la noche de ayer.
const hoy = () => moment(getFechaComercial(), "DD-MM-YYYY");
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);
const fmtN = (n) => (Number(n) || 0).toLocaleString("es-AR");

const PERIODOS = [
    { id: "hoy", label: "Hoy", rango: () => [hoy(), hoy()] },
    { id: "ayer", label: "Ayer", rango: () => [hoy().subtract(1, "day"), hoy().subtract(1, "day")] },
    { id: "semana", label: "Semana actual", rango: () => [hoy().startOf("isoWeek"), hoy()] },
    { id: "semanaPasada", label: "Semana pasada", rango: () => { const l = hoy().startOf("isoWeek").subtract(1, "week"); return [l, l.clone().endOf("isoWeek")]; } },
    { id: "mes", label: "Mes actual", rango: () => [hoy().startOf("month"), hoy()] },
    { id: "mesPasado", label: "Mes pasado", rango: () => { const m = hoy().subtract(1, "month"); return [m.clone().startOf("month"), m.clone().endOf("month")]; } },
];

const incluyeHoy = (hasta) => !hasta.isBefore(hoy(), "day");

// Las fotos del rango, más la noche en curso si el rango llega a hoy. La noche en
// curso se calcula y no se guarda: todavía se mueve.
const leerPeriodo = async (sucursalId, [desde, hasta]) => {
    const [fotos, enCurso] = await Promise.all([
        obtenerResumenes(desde.format(F), hasta.format(F), sucursalId),
        incluyeHoy(hasta) ? obtenerArqueo(getFechaComercial(), sucursalId).then((r) => r.arqueo) : null,
    ]);
    return sumarResumenes(enCurso ? [...fotos, enCurso] : fotos);
};

const tituloDe = (periodo, [desde, hasta]) => {
    const fechas = desde.isSame(hasta, "day")
        ? desde.format("DD/MM")
        : `${desde.format("DD/MM")} al ${hasta.format("DD/MM")}`;
    return `${periodo.label} · ${fechas}${incluyeHoy(hasta) ? " · con la noche en curso" : ""}`;
};

// Las cifras que muestra Métricas, a partir de una foto (o de varias sumadas).
const cifras = (r = {}) => ({
    combos: r.totalCombos || 0,
    efectivo: r.totalEfectivo || 0,
    mp: r.mp || 0,
    pedidos: r.totalPedidos || 0,
    eliminados: r.eliminados || 0,
    delivery: r.porCanal?.delivery?.pedidos || 0,
    mostrador: r.porCanal?.mostrador?.pedidos || 0,
    // Top 3 de combos: los productos que cuentan como combo, con la misma regla
    // que totalCombos, así el top cuadra con el total.
    topCombos: Object.entries(r.productos || {})
        .filter(([descripcion, p]) => esCombo({ descripcion, categoria: p.categoria }))
        .sort((a, b) => b[1].unidades - a[1].unidades)
        .slice(0, 3)
        .map(([descripcion, p]) => ({ label: descripcion, valor: p.unidades })),
});

// El subtítulo de la tarjeta Delivery: delivery contra mostrador, con los números y
// la barra doble del Histórico en chico. Sin pedidos, la barra queda vacía.
function DeliveryVsMostrador({ c }) {
    const pctDelivery = pct(c.delivery, c.pedidos);
    const pctMostrador = c.pedidos > 0 ? 100 - pctDelivery : 0;
    return (
        <>
            <span className="d-block">
                {fmtN(c.delivery)} delivery ({pctDelivery}%) · {fmtN(c.mostrador)} mostrador ({pctMostrador}%)
            </span>
            <div className="dual-bar w-100 mt-1" style={{ height: "6px" }}>
                <div style={{ width: `${pctDelivery}%`, background: "#f97316" }} />
                <div style={{ width: `${pctMostrador}%`, background: "#6366f1" }} />
            </div>
        </>
    );
}

// Con "Todas", una línea con cada sucursal: "DaVinci 60 · Luro 70". La comparación
// va en el subtítulo y no en secciones aparte, para que la pantalla entre sin scroll.
const lineaPorSucursal = (lista, valor, fmt) =>
    lista.map((s) => `${s.nombre} ${fmt(valor(s))}`).join(" · ");

export default function Metricas() {
    const [sucursales, setSucursales] = useState([]);
    const [sucursal, setSucursal] = useState(null);   // "TODAS" o un id
    const [periodo, setPeriodo] = useState(null);     // un id de PERIODOS
    const [resultado, setResultado] = useState(null);
    const { procesando, ejecutar } = useAccionUnica();

    useEffect(() => {
        fetchSucursales().then(setSucursales).catch((error) => {
            console.error(error);
            avisarErrorDeCarga("las sucursales");
        });
    }, []);

    // Recibe la sucursal y el período, y no los lee del estado: el click que la
    // dispara acaba de cambiar uno de los dos, y el estado todavía no se aplicó.
    const cargar = (sucursalId, periodoId) => ejecutar(async () => {
        const p = PERIODOS.find((x) => x.id === periodoId);
        const rango = p.rango();
        const elegidas = sucursalId === "TODAS" ? sucursales : sucursales.filter((s) => s.id === sucursalId);
        try {
            const porSucursal = await Promise.all(elegidas.map(async (s) => ({
                id: s.id,
                nombre: s.nombre || s.id,
                resumen: await leerPeriodo(s.id, rango),
            })));
            setResultado({ titulo: tituloDe(p, rango), porSucursal, total: sumarResumenes(porSucursal.map((x) => x.resumen)) });
        } catch (error) {
            console.error("Error cargando métricas:", error);
            Swal.fire({ title: "Error", text: "No se pudieron cargar las métricas. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#dc3545" });
        }
    });

    const elegirSucursal = (id) => {
        setSucursal(id);
        if (periodo) cargar(id, periodo);
    };

    const elegirPeriodo = (id) => {
        setPeriodo(id);
        cargar(sucursal, id);
    };

    const titulo = procesando
        ? "Cargando..."
        : resultado?.titulo || (!sucursal ? "Elegí una sucursal" : "Elegí un período");

    const c = cifras(resultado?.total);
    // Con "Todas", cada sucursal por separado para los subtítulos. El detalle de una
    // se ve eligiéndola.
    const comparar = resultado?.porSucursal.length > 1
        ? resultado.porSucursal.map((s) => ({ nombre: s.nombre, ...cifras(s.resumen) }))
        : null;

    return (
        <div className="est-wrap met-wrap container-fluid">
            <h1 className="est-title est-titulo-pantalla fw-bolder met-titulo">Métricas</h1>

            <div className="est-card p-2 mb-2">
                <div className="met-etiqueta">Sucursal</div>
                {/* Deshabilitados hasta que llegan las sucursales: "Todas" sin la lista
                    buscaría sobre nada y mostraría ceros. */}
                <div className="met-opciones met-opciones--sucursal mb-2">
                    {[{ id: "TODAS", nombre: "Todas" }, ...sucursales].map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className={`met-opcion ${sucursal === s.id ? "activa" : ""}`}
                            onClick={() => elegirSucursal(s.id)}
                            disabled={procesando || !sucursales.length}
                        >
                            {s.nombre || s.id}
                        </button>
                    ))}
                </div>

                <div className="met-etiqueta">Período</div>
                {/* Se habilita con la sucursal elegida: primero la sucursal, después el período. */}
                <div className="met-opciones met-opciones--periodo">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`met-opcion ${periodo === p.id ? "activa" : ""}`}
                            onClick={() => elegirPeriodo(p.id)}
                            disabled={!sucursal || procesando}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="met-estado">{titulo}</div>

            {/* En el celular: Pedidos y Combos lado a lado, Ventas, Delivery y el Top 3;
                todo en una pantalla. En la PC las cuatro tarjetas van en una fila. */}
            <div className={`met-resultado ${procesando ? "met-resultado--cargando" : ""}`}>
                <div className="row g-2 mb-2">
                    <div className="col-6 col-lg-3">
                        <KpiCard compacto icon="🎫" label="Pedidos" value={fmtN(c.pedidos)} color="#6366f1"
                            sub={c.eliminados ? `${fmtN(c.eliminados)} eliminados` : "Sin eliminados"} />
                    </div>
                    <div className="col-6 col-lg-3">
                        <KpiCard compacto icon="🍔" label="Combos" value={fmtN(c.combos)} color="#e85d04"
                            sub={comparar
                                ? lineaPorSucursal(comparar, (s) => s.combos, fmtN)
                                : c.pedidos ? `${(c.combos / c.pedidos).toFixed(1)} por pedido` : null} />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                        <KpiCard compacto icon="💰" label="Ventas" value={fmtPesos(c.efectivo + c.mp)} color="#22c55e"
                            sub={<>
                                <span className="d-block">Efectivo {fmtPesos(c.efectivo)} · MP {fmtPesos(c.mp)}</span>
                                {comparar && <span className="d-block">{lineaPorSucursal(comparar, (s) => s.efectivo + s.mp, fmtPesos)}</span>}
                            </>} />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                        <KpiCard compacto icon="🛵" label="Delivery" value={`${pct(c.delivery, c.pedidos)}%`} color="#a855f7"
                            sub={<DeliveryVsMostrador c={c} />} />
                    </div>
                </div>

                <div className="est-card p-3">
                    <div className="met-etiqueta mb-2">🏆 Top 3 combos</div>
                    <BarChart items={c.topCombos} fmt={fmtN} color="#e85d04" />
                </div>
            </div>
        </div>
    );
}

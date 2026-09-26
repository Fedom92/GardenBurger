import React, { useEffect, useState } from "react";
import moment from "moment";
import Swal from "sweetalert2";
import { fetchSucursales } from "../../Utils/sucursales";
import { getFechaComercial } from "../../Utils/fechaComercial";
import { obtenerResumenes, obtenerArqueo, sumarResumenes, esCombo } from "../POS/pos_hooks/useResumenDiario";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { avisarErrorDeCarga } from "../../Utils/avisos";
import { fmtPesos } from "../../Utils/formato";

// Métricas: el vistazo rápido del admin, de todas las sucursales, desde el celular.
// Lee las fotos de cada noche (1 lectura por noche y sucursal); las que faltan se
// calculan una vez y se guardan. Al entrar NO lee nada: todo arranca con "Ver".
// El detalle de los pedidos está en Historial; lo completo, en Estadísticas.

const F = "YYYY-MM-DD";
const hoy = () => moment(getFechaComercial(), "DD-MM-YYYY");
const fmtDia = (s) => moment(s, F).format("DD/MM/YYYY");
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

// Atajos de rango. "Este mes" y "Este año" terminan ayer: la noche en curso tiene
// su propio botón y no entra en los rangos.
const ATAJOS = [
    ["Semana pasada", () => { const l = hoy().startOf("isoWeek").subtract(1, "week"); return [l, l.clone().endOf("isoWeek")]; }],
    ["Este mes", () => [hoy().startOf("month"), hoy().subtract(1, "day")]],
    ["Mes pasado", () => { const m = hoy().subtract(1, "month"); return [m.clone().startOf("month"), m.clone().endOf("month")]; }],
    ["Este año", () => [hoy().startOf("year"), hoy().subtract(1, "day")]],
];

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
        .slice(0, 3),
});

function Tarjeta({ titulo, valor, detalle, destacada = false }) {
    return (
        <div className="col">
            <div className={`border rounded p-3 h-100 ${destacada ? "bg-dark text-white" : "bg-white"}`}>
                <div className="small text-uppercase opacity-75">{titulo}</div>
                <div className="fs-3 fw-bold lh-sm">{valor}</div>
                {detalle && <div className="small opacity-75">{detalle}</div>}
            </div>
        </div>
    );
}

function Panel({ c }) {
    return (
        <>
            <div className="row row-cols-2 row-cols-lg-4 g-2">
                <Tarjeta titulo="Combos" valor={c.combos.toLocaleString("es-AR")} destacada />
                <Tarjeta titulo="Ventas" valor={fmtPesos(c.efectivo + c.mp)} detalle={`Efectivo ${fmtPesos(c.efectivo)} · MP ${fmtPesos(c.mp)}`} />
                <Tarjeta titulo="Pedidos" valor={c.pedidos.toLocaleString("es-AR")} detalle={c.eliminados ? `${c.eliminados} eliminados` : "Sin eliminados"} />
                <Tarjeta titulo="Delivery / Mostrador" valor={`${pct(c.delivery, c.pedidos)}% / ${pct(c.mostrador, c.pedidos)}%`} detalle={`${c.delivery} delivery · ${c.mostrador} mostrador`} />
            </div>
            <div className="border rounded p-3 mt-2 bg-white">
                <div className="small text-uppercase opacity-75 mb-1">Top 3 combos</div>
                {c.topCombos.length === 0
                    ? <div className="small text-muted">Sin combos en el período</div>
                    : c.topCombos.map(([desc, p], i) => (
                        <div key={desc} className="d-flex justify-content-between">
                            <span>{i + 1}. {desc}</span>
                            <strong>{p.unidades.toLocaleString("es-AR")}</strong>
                        </div>
                    ))}
            </div>
        </>
    );
}

export default function Metricas() {
    const [sucursales, setSucursales] = useState([]);
    const [sucursal, setSucursal] = useState("TODAS");
    const [[desde, hasta], setRango] = useState(() => ATAJOS[0][1]().map((m) => m.format(F)));
    const [resultado, setResultado] = useState(null);
    const { procesando, ejecutar } = useAccionUnica();

    useEffect(() => {
        fetchSucursales().then(setSucursales).catch((error) => {
            console.error(error);
            avisarErrorDeCarga("las sucursales");
        });
    }, []);

    const cargar = (titulo, leer) => ejecutar(async () => {
        const elegidas = sucursal === "TODAS" ? sucursales : sucursales.filter((s) => s.id === sucursal);
        try {
            const porSucursal = await Promise.all(elegidas.map(async (s) => ({
                id: s.id,
                nombre: s.nombre || s.id,
                resumen: await leer(s.id),
            })));
            setResultado({ titulo, porSucursal, total: sumarResumenes(porSucursal.map((p) => p.resumen)) });
        } catch (error) {
            console.error("Error cargando métricas:", error);
            Swal.fire({ title: "Error", text: "No se pudieron cargar las métricas. Revisá la conexión e intentá de nuevo.", icon: "error", confirmButtonColor: "#dc3545" });
        }
    });

    const ver = () => {
        if (!desde || !hasta || desde > hasta) {
            Swal.fire({ title: "Rango inválido", text: "La fecha desde tiene que ser anterior o igual a la fecha hasta.", icon: "warning", confirmButtonColor: "#198754" });
            return;
        }
        cargar(`Del ${fmtDia(desde)} al ${fmtDia(hasta)}`,
            async (id) => sumarResumenes(await obtenerResumenes(desde, hasta, id)));
    };

    // La noche en curso: se calcula a pedido y no se guarda (todavía se mueve).
    const verEstaNoche = () => cargar("Esta noche (en curso)",
        async (id) => (await obtenerArqueo(getFechaComercial(), id)).arqueo);

    return (
        <div className="container py-3" style={{ maxWidth: "960px" }}>
            <h1 className="mb-3">Métricas</h1>

            <div className="border rounded p-3 mb-3 bg-light">
                <div className="row g-2">
                    <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">Sucursal</label>
                        <select className="form-select" value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
                            <option value="TODAS">Todas</option>
                            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre || s.id}</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-md-4">
                        <label className="form-label small mb-1">Desde</label>
                        <input type="date" className="form-control" value={desde} onChange={(e) => setRango([e.target.value, hasta])} />
                    </div>
                    <div className="col-6 col-md-4">
                        <label className="form-label small mb-1">Hasta</label>
                        <input type="date" className="form-control" value={hasta} onChange={(e) => setRango([desde, e.target.value])} />
                    </div>
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                    {ATAJOS.map(([label, rango]) => (
                        <button key={label} className="btn btn-sm btn-outline-secondary" onClick={() => setRango(rango().map((m) => m.format(F)))}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-dark flex-fill" onClick={ver} disabled={procesando}>
                        {procesando ? "Cargando..." : "Ver"}
                    </button>
                    <button className="btn btn-outline-dark flex-fill" onClick={verEstaNoche} disabled={procesando}>
                        Esta noche
                    </button>
                </div>
            </div>

            {!resultado ? (
                <p className="text-muted text-center py-4">Elegí el rango y tocá <strong>Ver</strong>. No se lee nada hasta entonces.</p>
            ) : (
                <>
                    <h6 className="fw-bold mb-2">{resultado.titulo}</h6>
                    <Panel c={cifras(resultado.total)} />

                    {resultado.porSucursal.length > 1 && resultado.porSucursal.map((p) => (
                        <div key={p.id} className="mt-4">
                            <h6 className="fw-bold mb-2">{p.nombre}</h6>
                            <Panel c={cifras(p.resumen)} />
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

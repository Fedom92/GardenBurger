import moment from "moment";
import { METODOS_PAGO } from "../../../Utils/Constantes";
import { horaEnJornada } from "../../../Utils/fechaComercial";
import { sumarResumenes } from "../../POS/pos_hooks/useResumenDiario";

// Las cuentas de Estadísticas Generales, a partir de las fotos de cada noche
// (`resumenDiario`, ver useResumenDiario.js): lo mismo que el Histórico saca de los
// TSV, pero sin leer un solo pedido. Funciones puras, sin Firestore: se verifican
// con casos armados a mano.
//
// `noches` es [{ jornada: "DD-MM-YYYY", ...foto }]: lo que devuelve
// obtenerResumenes(). Con "Todas" las sucursales vienen todas juntas en la lista:
// sumar fotos de distintas sucursales es lo mismo que sumar noches.

const F = "YYYY-MM-DD";
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const pct = (n, total) => (total > 0 ? Math.round(((n || 0) / total) * 100) : 0);
const desc = (a, b) => b.valor - a.valor;
const esBebida = (categoria = "") => ["BEBIDA", "BEBIDAS"].includes(categoria);

// El rango de días de un filtro, como "YYYY-MM-DD". obtenerResumenes se encarga de
// dejar afuera la noche en curso y las futuras.
export const rangoDeFiltro = ({ modo, mes, anio, desde, hasta }) => {
    if (modo === "mes") {
        const m = moment(mes, "YYYY-MM");
        return [m.clone().startOf("month").format(F), m.clone().endOf("month").format(F)];
    }
    if (modo === "anio") return [`${anio}-01-01`, `${anio}-12-31`];
    return [desde, hasta];
};

// Reparte el 100% entre las filas por resto mayor, como el Histórico: con
// redondeos sueltos los porcentajes podían sumar 101.
const porcentajesRestoMayor = (filas) => {
    const total = filas.reduce((s, f) => s + f.valor, 0) || 1;
    const conPct = filas.map((f) => {
        const exacto = (f.valor / total) * 100;
        return { ...f, pct: Math.floor(exacto), resto: exacto - Math.floor(exacto) };
    });
    let sobrante = 100 - conPct.reduce((s, f) => s + f.pct, 0);
    if (!filas.length) sobrante = 0;
    [...conPct].sort((a, b) => b.resto - a.resto).forEach((f) => { if (sobrante-- > 0) f.pct += 1; });
    return conPct.sort((a, b) => b.pct - a.pct || b.valor - a.valor);
};

export const armarEstadisticas = (noches = []) => {
    const t = sumarResumenes(noches);
    const pedidos = t.totalPedidos || 0;
    const eliminados = t.eliminados || 0;
    const cancelados = t.cancelados || 0;
    const efectivo = t.totalEfectivo || 0;
    const mp = t.mp || 0;
    const facturado = efectivo + mp;
    const porMetodo = t.porMetodo || {};
    const delivery = t.porCanal?.delivery?.pedidos || 0;
    const mostrador = t.porCanal?.mostrador?.pedidos || 0;
    const unidades = t.unidades || 0;

    // Métodos de pago. La foto no separa el efectivo del pago dividido, pero se
    // deduce: el efectivo total es el de los pedidos en efectivo más la parte en
    // efectivo de los divididos.
    const efectivoDividido = Math.max(0, efectivo - (porMetodo.EFECTIVO?.monto || 0));
    const metodosPago = Object.entries(porMetodo)
        .map(([clave, m]) => ({
            label: METODOS_PAGO[clave]?.label || clave,
            valor: m.pedidos || 0,
            total: m.monto || 0,
            pct: pct(m.pedidos, pedidos),
            extra: clave === "DIVIDIDO"
                ? { efectivo: efectivoDividido, mp: Math.max(0, (m.monto || 0) - efectivoDividido) }
                : null,
        }))
        .sort(desc);

    // Productos, con la categoría normalizada: viene como la escribió el catálogo.
    const productos = Object.entries(t.productos || {}).map(([descripcion, p]) => ({
        descripcion,
        categoria: String(p.categoria || "SIN CAT").trim().toUpperCase(),
        unidades: p.unidades || 0,
    }));

    const porCategoria = {};
    productos.forEach((p) => { porCategoria[p.categoria] = (porCategoria[p.categoria] || 0) + p.unidades; });
    const categorias = Object.entries(porCategoria).map(([label, valor]) => ({ label, valor })).sort(desc);

    const articulos = productos.filter((p) => !esBebida(p.categoria));
    const bebidas = productos.filter((p) => esBebida(p.categoria));

    // Clientes: solo nombre y cantidad de pedidos, nunca el teléfono (es la clave de
    // la foto y no sale de acá).
    const topClientes = Object.values(t.porCliente || {})
        .map((c) => ({ label: c.nombre || "Sin nombre", valor: c.pedidos || 0 }))
        .sort(desc)
        .slice(0, 10);

    // Día de la semana de cada noche (por jornada: el sábado a la 01:00 sigue siendo
    // la noche del viernes) por los pedidos de esa noche.
    const dias = Array(7).fill(0);
    noches.forEach((n) => { dias[moment(n.jornada, "DD-MM-YYYY").day()] += n.totalPedidos || 0; });

    // Franja horaria, ordenada como corre la noche: de horaAbre a horaCierre.
    const porHora = Object.entries(t.porHora || {})
        .map(([h, x]) => ({ hora: Number(h), label: `${String(h).padStart(2, "0")}hs`, valor: x.pedidos || 0 }))
        .sort((a, b) => horaEnJornada(a.hora) - horaEnJornada(b.hora));

    return {
        noches: noches.length,
        kpis: {
            tickets: { total: pedidos + eliminados + cancelados, validos: pedidos, eliminados, cancelados },
            efectivo: { total: efectivo, mostrador: t.efectivoLocal || 0, delivery: t.efectivoEnvio || 0 },
            mp: { total: mp, pctPedidos: pct(porMetodo.MP?.pedidos, pedidos) },
            facturado: { total: facturado, ticketPromedio: pedidos ? facturado / pedidos : 0 },
            stock: { unidades, porTicket: pedidos ? (unidades / pedidos).toFixed(1) : "0" },
            combos: t.totalCombos || 0,
            delivery: { pct: pct(delivery, pedidos), delivery, mostrador },
            observaciones: { total: t.conObservaciones || 0, pct: pct(t.conObservaciones, pedidos) },
        },
        canal: { delivery, mostrador, pctDelivery: pct(delivery, pedidos) },
        metodosPago,
        categorias,
        zonas: porcentajesRestoMayor(Object.entries(t.porZona || {}).map(([label, valor]) => ({ label, valor }))),
        topProductos: articulos.map((p) => ({ label: p.descripcion, valor: p.unidades })).sort(desc).slice(0, 10),
        topBebidas: bebidas.map((p) => ({ label: p.descripcion, valor: p.unidades })).sort(desc).slice(0, 10),
        topClientes,
        porDia: DIAS.map((label, i) => ({ label, valor: dias[i] })),
        porHora,
        stockArticulos: articulos.map((p) => ({ label: `${p.descripcion} [${p.categoria}]`, valor: p.unidades })).sort(desc),
        stockBebidas: bebidas.map((p) => ({ label: p.descripcion, valor: p.unidades })).sort(desc),
    };
};

// Evolución anual: una fila por mes, y por cada año sus tickets, monto y combos
// (`2026_tickets`, `2026_monto`, `2026_combos`), el formato que espera el gráfico.
// Un mes sin noches queda sin valor: el gráfico corta la línea en vez de bajar a 0.
export const armarEvolucion = (noches = []) => {
    const data = MESES_CORTO.map((name) => ({ name }));
    const anios = new Set();
    noches.forEach((n) => {
        const d = moment(n.jornada, "DD-MM-YYYY");
        const y = d.year();
        const fila = data[d.month()];
        anios.add(y);
        fila[`${y}_tickets`] = (fila[`${y}_tickets`] || 0) + (n.totalPedidos || 0);
        fila[`${y}_monto`] = (fila[`${y}_monto`] || 0) + (n.totalEfectivo || 0) + (n.mp || 0);
        fila[`${y}_combos`] = (fila[`${y}_combos`] || 0) + (n.totalCombos || 0);
    });
    return { data, anios: [...anios].sort((a, b) => b - a) };
};

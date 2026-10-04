import moment from "moment";
import { getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, writeBatch, Timestamp } from "firebase/firestore";
import { db, colSucursal, docSucursal, colDeSucursal, docDeSucursal } from "../../../firebaseConfig/firebase";
import { getFechaComercial, getFechaComercialDe, getRangoDeJornada, jornadaEstaAbierta } from "../../../Utils/fechaComercial";
import { CATEGORIAS_COMBOS, ENVIOS_LOCALES, ESTADOS, SUBESTADOS_MOTODELIVERY, METODOS_PAGO, DESTINO_VUELTO } from "../../../Utils/Constantes";

// ─────────────────────────────────────────────────────────────────────────────
// EL ARQUEO SE CALCULA DESDE LOS PEDIDOS, NO SE ACUMULA
//
// Antes `resumenDiario` se mantenía con increment(): cada guardado sumaba y cada
// eliminación restaba. Eso obligaba a que TODO camino que tocara un pedido se
// acordara de mover el arqueo, en el orden correcto y una sola vez —increment()
// no es idempotente—, y si alguna vez se desincronizaba no había forma de saberlo
// ni de arreglarlo: el número era un acumulado, no la verdad.
//
// Ahora el resumen de una noche es una función de sus pedidos. Si un número está
// mal, es porque los pedidos están mal, y eso se ve mirando los pedidos.
//
// El resultado se guarda en `resumenDiario/{DD-MM-YYYY}`, un DOCUMENTO de Firestore
// con los números de esa noche ya calculados. En el código y en el vault se le dice
// FOTO: queda congelado como estaba. Sirve para que Métricas y Estadísticas cuesten
// 1 lectura por noche y sucursal en vez de releer todos sus pedidos.
//
// Las reglas de la foto, y el porqué de cada una:
//
//  1. Jornada ABIERTA: se calcula siempre, no se guarda nada. Todavía se está
//     moviendo, congelarla daría un número que enseguida es falso.
//  2. Jornada CERRADA sin foto: se calcula una vez y se guarda. Las noches sin
//     ventas también: una escritura, y no se vuelven a leer.
//  3. Jornada CERRADA con foto: se usa la foto. No se recalcula sola, salvo que
//     cambie VERSION_FOTO (ver abajo).
//  4. Si alguien corrige LOS HECHOS —cancela o elimina un pedido de una jornada
//     cerrada— borra su foto con `invalidarFotoDePedido()`, y el siguiente que la
//     mire la reconstruye con los pedidos corregidos.
//
// Cambiar CÓDIGO no cambia la historia. Lo que depende de reglas que cambian —qué
// cuenta como combo, qué zona cobra en mostrador, cuánto cuesta el envío— se
// CONGELA en el pedido al escribirlo (`combos`, `esLocal`, `envio`), igual que el
// valorHora en asistencias. Así una foto da lo mismo la saque quien la saque
// y cuando la saque: es un caché de lecturas, no la que guarda la historia.
//
// Por eso se puede VERSIONAR: si mañana Estadísticas necesita un campo nuevo, se
// agrega acá, se sube VERSION_FOTO, y las fotos viejas se reconstruyen solas la
// próxima vez que alguien las mire —una lectura por pedido, una sola vez—. Lo que
// ya existía da exactamente igual, porque sale de los mismos hechos congelados.
// Lo que NO se hace es cambiar el significado de un campo existente.
// ─────────────────────────────────────────────────────────────────────────────

export const VERSION_FOTO = 1;

// Si un renglón del carrito cuenta como combo. Los productos que comparten
// categoría con los combos pero se venden sueltos salen de la lista `excludes`
// de cada categoría. Misma regla que esComboConta en el Histórico, así la jornada
// y el histórico dan el mismo número.
export const esCombo = (item) => {
    const combo = CATEGORIAS_COMBOS.find(c => c.key === item?.categoria);
    return !!combo && !combo.excludes?.includes(item?.descripcion);
};

// Cuenta unidades y no renglones: un item con cantidad 3 son 3 combos.
export const contarCombos = (carrito = []) =>
    carrito.reduce((total, item) => (esCombo(item) ? total + (Number(item.cantidad) || 1) : total), 0);

// Un pedido entra al arqueo si lo cobró un cajero y no quedó anulado.
//
// `cajeroID` es lo que distingue un pedido cobrado de una solicitud web que nadie
// atendió: esas nunca movieron plata, así que no suman ni restan. Y CANCELADO y
// ELIMINADO son las dos formas de anular: la plata no entró.
const entraAlArqueo = (p) =>
    !!p.cajeroID && ![ESTADOS.CANCELADO, ESTADOS.ELIMINADO].includes(p.estado);

// Cuánto de un pedido fue efectivo y cuánto Mercado Pago.
//
// En el pago dividido el cajero fija la parte en efectivo y el resto va por MP con
// recargo. `total - montoEfectivo` da exactamente eso: total ya incluye el
// recargo, así que la resta deja la parte de MP con su recargo adentro.
//
// `efectivo` es también lo que el repartidor le cobra al cliente en la puerta:
// el Jefe de Deliverys lo usa tal cual, así la caja y la calle no pueden discrepar.
export const repartirPago = (p) => {
    const total = Number(p.total) || 0;
    const efectivo = Number(p.montoEfectivo) || 0;

    if (p.metodoPago === METODOS_PAGO.EFECTIVO.key) return { efectivo: total, mp: 0 };
    if (p.metodoPago === METODOS_PAGO.DIVIDIDO.key) return { efectivo, mp: total - efectivo };
    return { efectivo: 0, mp: total };   // MP
};

const estaAnulado = (p) => [ESTADOS.CANCELADO, ESTADOS.ELIMINADO].includes(p.estado);

// Un delivery con el repartidor en la calle: salió y todavía no volvió. No se anula
// —ni desde F3 ni desde el Historial—: primero la jefa de deliverys marca que volvió
// (entregado o no), así el viaje queda registrado y se le paga el envío. Un pedido
// que todavía no salió se anula como cualquier otro: no hubo viaje.
export const enLaCalle = (p) =>
    p?.estado === ESTADOS.DELIVERY && p?.estadoDelivery === SUBESTADOS_MOTODELIVERY.SALIDA;

// Los viajes de cada repartidor en la jornada. Función pura: la usan el F4 del
// encargado —que le suma la base de Asistencias (horas × valorHora − descuentos)
// para pagarle cada noche— y las Métricas de la jefa de deliverys, así los dos ven
// los mismos números. No hay fijo: el sueldo es esa base más los envíos.
//
// Cuentan los viajes CERRADOS (estadoDelivery == FIN): el repartidor volvió. Cada
// viaje paga su envío, se haya entregado o no: si el cliente canceló o no se
// encontró la dirección, el viaje se hizo igual. El encargado no puede anular un
// pedido con el repartidor en la calle (F3): primero la jefa marca que volvió, así
// todo viaje hecho llega acá.
//
// Un viaje sin entregar (`sinEntregar`) o un pedido anulado no suma efectivo: no
// hubo cobro.
//
// `entregas` es el detalle para la pantalla de la jefa (con las direcciones). La
// foto del arqueo lo descarta: ya está en los pedidos y no hace falta duplicarlo.
export const liquidarDeliverys = (pedidos = []) => {
    const porRepartidor = {};

    for (const p of pedidos) {
        if (!p.deliveryID || p.estadoDelivery !== SUBESTADOS_MOTODELIVERY.FIN) continue;

        if (!porRepartidor[p.deliveryID]) {
            porRepartidor[p.deliveryID] = {
                nombre: "",
                cantidadPedidos: 0,
                totalEnvios: 0,
                efectivoCobrado: 0,
                entregas: [],
            };
        }
        const r = porRepartidor[p.deliveryID];
        const envio = Number(p.envio?.costo_envio) || 0;
        const anulado = estaAnulado(p);
        const sinEntregar = !!p.sinEntregar;
        const efectivo = sinEntregar || anulado ? 0 : repartirPago(p).efectivo;

        r.nombre = p.deliveryAsignado || r.nombre;
        r.cantidadPedidos += 1;
        r.totalEnvios += envio;
        r.efectivoCobrado += efectivo;
        r.entregas.push({
            id: p.id,
            codigo: p.codigo,
            direccion: p.direccion || "",
            zona: p.envio?.zona_envio || "",
            envio,
            metodoPago: p.metodoPago,
            efectivo,
            sinEntregar,
            anulado,
            pagaronCon: Number(p.pagaronCon) || 0,
            finTimestamp: p.deliveryFinTimestamp || null,
        });
    }

    return porRepartidor;
};

// Los viajes que volvieron sin entregar y todavía no se anularon. Mientras el
// encargado no los elimine desde F3, el arqueo los sigue sumando como cobrados: el
// F4 los muestra para que no se escapen.
export const sinEntregarPendientes = (pedidos = []) =>
    pedidos.filter((p) => p.sinEntregar && !estaAnulado(p));

// Los vueltos que los admins tienen que transferir al cierre: deliverys en efectivo
// donde el cliente pidió el vuelto. El monto es el real si el repartidor ya volvió
// (`pagaronCon`), y si no el que anunció el cliente (`pagaCon`), marcado como
// estimado. Un viaje sin entregar o un pedido anulado no deja vuelto: no hubo cobro.
export const vueltosATransferir = (pedidos = []) =>
    pedidos
        .filter((p) => p.destinoVuelto === DESTINO_VUELTO.VUELTO.key && !p.sinEntregar && !estaAnulado(p))
        .map((p) => {
            const pagaronCon = Number(p.pagaronCon) || 0;
            const pagoCon = pagaronCon || Number(p.pagaCon) || 0;
            return {
                id: p.id,
                codigo: p.codigo,
                nombre: p.nombre || "",
                alias: p.aliasVuelto || "",
                monto: Math.max(pagoCon - repartirPago(p).efectivo, 0),
                estimado: !pagaronCon,
            };
        })
        .filter((v) => v.monto > 0);

// El nombre del método en METODOS_PAGO (EFECTIVO, MP, DIVIDIDO) a partir del valor
// guardado. Es la clave de `porMetodo`: "%" no es un buen nombre de campo.
const nombreMetodo = (valor) =>
    Object.keys(METODOS_PAGO).find((k) => METODOS_PAGO[k].key === valor) || "OTRO";

// La hora del pedido (0-23), en hora argentina. Con horario especial `timestamp`
// es la hora pedida, no la de cobro: es la que importa para la franja horaria.
const horaDe = (p) => {
    const d = p.timestamp?.toDate?.();
    return d ? String(moment(d).hour()) : null;
};

// Las claves de los mapas son datos (nombres de producto, zonas): Firestore solo
// rechaza la vacía y la que empieza y termina con "__".
const clave = (texto, siFalta) => {
    const k = String(texto || "").trim();
    if (!k) return siFalta;
    return /^__.*__$/.test(k) ? k.slice(1) : k;
};

const sumarEn = (mapa, k, valores) => {
    if (!mapa[k]) mapa[k] = Object.fromEntries(Object.keys(valores).map((c) => [c, 0]));
    for (const [c, v] of Object.entries(valores)) mapa[k][c] += v;
};

// El resumen de una noche, calculado. Función pura: sin Firestore y sin estado,
// así se puede verificar a mano con casos. Es lo que se guarda como foto.
//
// Tiene todo lo que usan Métricas (una parte) y Estadísticas (casi todo). Las
// cifras principales van además hora por hora (`porHora`), para que un filtro de
// horas futuro funcione sin leer pedidos. Productos, zonas y clientes no van por
// hora: multiplicarían el tamaño por ocho.
export const calcularArqueo = (pedidos = []) => {
    const r = {
        totalPedidos: 0,
        eliminados: 0,
        cancelados: 0,
        totalEfectivo: 0,
        efectivoLocal: 0,
        efectivoEnvio: 0,
        mp: 0,
        totalCombos: 0,
        unidades: 0,
        conObservaciones: 0,
        porCanal: { delivery: { pedidos: 0, monto: 0 }, mostrador: { pedidos: 0, monto: 0 } },
        porMetodo: {},
        porZona: {},
        porHora: {},
        productos: {},
        porCliente: {},
        deliverys: {},
    };

    // La foto guarda el resumen de cada repartidor, sin el detalle de entregas.
    const liquidacion = liquidarDeliverys(pedidos);
    for (const id of Object.keys(liquidacion)) {
        const { entregas, ...resumen } = liquidacion[id];
        r.deliverys[id] = resumen;
    }

    for (const p of pedidos) {
        // Anulados: se cuentan, pero no mueven plata. Solo los que pasaron por la
        // Caja: una solicitud web rechazada nunca fue un pedido.
        if (p.cajeroID && p.estado === ESTADOS.ELIMINADO) { r.eliminados += 1; continue; }
        if (p.cajeroID && p.estado === ESTADOS.CANCELADO) { r.cancelados += 1; continue; }
        if (!entraAlArqueo(p)) continue;

        const total = Number(p.total) || 0;
        const { efectivo, mp } = repartirPago(p);
        // Retira y Espera Afuera cobran en el mostrador; el resto de las zonas
        // vuelve con el repartidor. Son dos cajas distintas.
        const esLocal = p.esLocal ?? ENVIOS_LOCALES.includes(p.envio?.zona_envio);
        const combos = p.combos ?? contarCombos(p.carrito);
        const canal = esLocal ? "mostrador" : "delivery";

        r.totalPedidos += 1;
        r.totalEfectivo += efectivo;
        r.efectivoLocal += esLocal ? efectivo : 0;
        r.efectivoEnvio += esLocal ? 0 : efectivo;
        r.mp += mp;
        r.totalCombos += combos;
        if ((p.observaciones || "").trim()) r.conObservaciones += 1;

        sumarEn(r.porCanal, canal, { pedidos: 1, monto: total });
        sumarEn(r.porMetodo, nombreMetodo(p.metodoPago), { pedidos: 1, monto: total });
        const zona = clave(p.envio?.zona_envio, "Sin zona");
        r.porZona[zona] = (r.porZona[zona] || 0) + 1;

        const hora = horaDe(p);
        if (hora !== null) {
            sumarEn(r.porHora, hora, {
                pedidos: 1, monto: total, efectivo, mp, combos,
                delivery: esLocal ? 0 : 1, mostrador: esLocal ? 1 : 0,
            });
        }

        for (const item of p.carrito || []) {
            const unidades = Number(item.cantidad) || 1;
            r.unidades += unidades;
            const desc = clave(item.descripcion, "Sin descripción");
            if (!r.productos[desc]) r.productos[desc] = { categoria: item.categoria || "", unidades: 0 };
            r.productos[desc].unidades += unidades;
        }

        // Agrupados por teléfono, que es lo único que distingue a dos "Juan". En
        // pantalla se muestra solo el nombre y la cantidad de pedidos.
        const telefono = String(p.telefono || "").replace(/\D/g, "");
        if (telefono) {
            if (!r.porCliente[telefono]) r.porCliente[telefono] = { nombre: "", pedidos: 0 };
            r.porCliente[telefono].nombre = p.nombre || r.porCliente[telefono].nombre;
            r.porCliente[telefono].pedidos += 1;
        }
    }

    return r;
};

// ── Rangos de noches (puro) ──────────────────────────────────────────────────

// Las jornadas de un rango de días, "YYYY-MM-DD" a "YYYY-MM-DD" (los valores de un
// <input type="date">), como ids DD-MM-YYYY. Cada día es la noche que empieza ese día.
export const jornadasEntre = (desde, hasta) => {
    const lista = [];
    const dia = moment(desde, "YYYY-MM-DD");
    const fin = moment(hasta, "YYYY-MM-DD");
    while (dia.isSameOrBefore(fin, "day")) {
        lista.push(dia.format("DD-MM-YYYY"));
        dia.add(1, "day");
    }
    return lista;
};

// Los pedidos agrupados por su noche. Mismo criterio que traerPedidosDeJornada: la
// noche va de horaAbre a horaCierre, y un pedido en el hueco no es de ninguna.
export const agruparPorJornada = (pedidos = []) => {
    const grupos = {};
    for (const p of pedidos) {
        const d = p.timestamp?.toDate?.();
        if (!d) continue;
        const jornada = getFechaComercialDe(d);
        const { inicio, fin } = getRangoDeJornada(jornada);
        if (d < inicio || d > fin) continue;
        if (!grupos[jornada]) grupos[jornada] = [];
        grupos[jornada].push(p);
    }
    return grupos;
};

// Noches seguidas, en tandas: cada tanda es UNA consulta de pedidos. Si las que
// faltan están salteadas, una consulta de punta a punta releería las del medio.
export const bloquesDeDias = (jornadas = []) => {
    const bloques = [];
    let anterior = null;
    for (const j of jornadas) {
        const dia = moment(j, "DD-MM-YYYY");
        if (anterior && dia.diff(anterior, "days") === 1) bloques[bloques.length - 1].push(j);
        else bloques.push([j]);
        anterior = dia;
    }
    return bloques;
};

// Suma varias fotos —noches o sucursales— en una sola. Números se suman y los
// mapas se suman clave por clave; los textos (nombres, categorías) quedan con el
// último no vacío. No suma lo que no es una cifra del período.
const NO_SE_SUMA = ["fecha", "generadoEl", "version", "deliverys", "jornada", "sucursal"];

const sumarObjeto = (destino, origen) => {
    for (const [k, v] of Object.entries(origen || {})) {
        if (typeof v === "number") destino[k] = (destino[k] || 0) + v;
        else if (typeof v === "string") { if (v) destino[k] = v; }
        else if (v && typeof v === "object" && !v.toDate) {
            if (!destino[k] || typeof destino[k] !== "object") destino[k] = {};
            sumarObjeto(destino[k], v);
        }
    }
    return destino;
};

export const sumarResumenes = (resumenes = []) => {
    const total = {};
    for (const r of resumenes) {
        const cifras = { ...r };
        NO_SE_SUMA.forEach((k) => delete cifras[k]);
        sumarObjeto(total, cifras);
    }
    return total;
};

// ── Acceso a Firestore ───────────────────────────────────────────────────────
// Las funciones aceptan `sucursal` opcional: sin ella usan la del usuario
// logueado, que es lo que hace la Caja. La pasa el admin, que opera sobre
// cualquier sucursal (Métricas, Estadísticas, Historial).

const refPedidos = (sucursal) => (sucursal ? colDeSucursal(sucursal, "pedidos") : colSucursal("pedidos"));
const refFotos = (sucursal) => (sucursal ? colDeSucursal(sucursal, "resumenDiario") : colSucursal("resumenDiario"));
const refFoto = (jornada, sucursal) =>
    sucursal ? docDeSucursal(sucursal, "resumenDiario", jornada) : docSucursal("resumenDiario", jornada);

// Una foto sirve si es de este mecanismo (`generadoEl`) y de la versión actual.
const fotoVigente = (data) => !!data?.generadoEl && data.version === VERSION_FOTO;

// `fecha` es el inicio de la noche: es lo que permite pedir "las fotos entre tal y
// tal día" en una sola consulta. El id DD-MM-YYYY no se puede ordenar por fecha.
const armarFoto = (jornada, resumen) => ({
    ...resumen,
    fecha: Timestamp.fromDate(getRangoDeJornada(jornada).inicio),
    version: VERSION_FOTO,
    generadoEl: serverTimestamp(),
});

// Los pedidos entre dos momentos. Sin filtro de estado: los CANCELADO y ELIMINADO
// se cuentan como anulados, así que tienen que venir.
const traerPedidosEntre = async (inicio, fin, sucursal) => {
    const snap = await getDocs(query(
        refPedidos(sucursal),
        where("timestamp", ">=", inicio),
        where("timestamp", "<=", fin),
        orderBy("timestamp", "asc")
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const traerPedidosDeJornada = async (jornada, sucursal) => {
    const { inicio, fin } = getRangoDeJornada(jornada);
    return traerPedidosEntre(inicio, fin, sucursal);
};

// El arqueo de UNA jornada, con la foto como caché. Ver las reglas de arriba.
//
// Devuelve { arqueo, calculado, pedidos }: `calculado` dice si salió de los pedidos
// (true) o de la foto (false), para que la pantalla pueda avisar que es
// provisorio. `pedidos` viene solo cuando se leyeron: el F4 arma con ellos la lista
// de vueltos y los viajes sin entregar, sin volver a leer.
export const obtenerArqueo = async (jornada = getFechaComercial(), sucursal) => {
    const abierta = jornadaEstaAbierta(jornada);

    if (!abierta) {
        const foto = await getDoc(refFoto(jornada, sucursal));
        if (foto.exists() && fotoVigente(foto.data())) {
            return { arqueo: foto.data(), calculado: false, pedidos: null };
        }
    }

    const pedidos = await traerPedidosDeJornada(jornada, sucursal);
    const arqueo = calcularArqueo(pedidos);

    // La jornada abierta no se congela: el número cambia con cada pedido.
    if (!abierta) {
        await setDoc(refFoto(jornada, sucursal), armarFoto(jornada, arqueo));
    }

    return { arqueo, calculado: true, pedidos };
};

// Las fotos de un RANGO de noches de una sucursal, para Métricas y Estadísticas.
// `desde` y `hasta` son "YYYY-MM-DD". La noche en curso y las futuras no entran:
// la de hoy tiene su propio botón, y se calcula sin guardarse (regla 1).
//
// Costo: 1 lectura por noche que ya tiene foto. Las que no, se calculan UNA vez
// leyendo sus pedidos —una consulta por tanda de noches seguidas— y se guardan,
// incluidas las que dan cero. Devuelve [{ jornada, ...resumen }] en orden.
export const obtenerResumenes = async (desde, hasta, sucursal) => {
    const hoy = moment(getFechaComercial(), "DD-MM-YYYY");
    const jornadas = jornadasEntre(desde, hasta)
        .filter((j) => moment(j, "DD-MM-YYYY").isBefore(hoy, "day"));
    if (!jornadas.length) return [];

    const fotos = {};
    const snap = await getDocs(query(
        refFotos(sucursal),
        where("fecha", ">=", Timestamp.fromDate(getRangoDeJornada(jornadas[0]).inicio)),
        where("fecha", "<=", Timestamp.fromDate(getRangoDeJornada(jornadas[jornadas.length - 1]).inicio))
    ));
    snap.docs.forEach((d) => { if (fotoVigente(d.data())) fotos[d.id] = d.data(); });

    const faltan = jornadas.filter((j) => !fotos[j]);
    for (const bloque of bloquesDeDias(faltan)) {
        const pedidos = await traerPedidosEntre(
            getRangoDeJornada(bloque[0]).inicio,
            getRangoDeJornada(bloque[bloque.length - 1]).fin,
            sucursal
        );
        const porJornada = agruparPorJornada(pedidos);
        const nuevas = bloque.map((j) => [j, calcularArqueo(porJornada[j] || [])]);

        // De a 400 por batch: el límite de Firestore son 500 operaciones.
        for (let i = 0; i < nuevas.length; i += 400) {
            const batch = writeBatch(db);
            nuevas.slice(i, i + 400).forEach(([j, r]) => batch.set(refFoto(j, sucursal), armarFoto(j, r)));
            await batch.commit();
        }
        nuevas.forEach(([j, r]) => {
            fotos[j] = { ...r, fecha: Timestamp.fromDate(getRangoDeJornada(j).inicio) };
        });
    }

    return jornadas.map((j) => ({ jornada: j, ...fotos[j] }));
};

// La primera noche con pedidos de una sucursal: desde ahí arranca la evolución
// histórica. Una lectura.
export const primeraJornadaConPedidos = async (sucursal) => {
    const snap = await getDocs(query(refPedidos(sucursal), orderBy("timestamp", "asc"), limit(1)));
    const d = snap.docs[0]?.data().timestamp?.toDate?.();
    return d ? getFechaComercialDe(d) : null;
};

// La llama quien corrija un pedido de una jornada ya cerrada: al cambiar los
// hechos, la foto quedó vieja. Se borra y el siguiente que la mire la reconstruye.
export const invalidarFoto = async (jornada, sucursal) => {
    if (jornadaEstaAbierta(jornada)) return;   // la abierta no tiene foto
    try {
        await deleteDoc(refFoto(jornada, sucursal));
    } catch (error) {
        console.error("No se pudo invalidar el arqueo de la jornada", jornada, error);
    }
};

// Lo mismo, pero a partir del pedido que se acaba de corregir: la foto que queda
// vieja es la de SU jornada, no la de hoy. Un pedido de las 00:30 de anoche que se
// elimina a las 20:00 tiene que invalidar la noche anterior. Vive aca y no en cada
// pantalla para que ningun camino nuevo tenga que acordarse de calcular la jornada.
export const invalidarFotoDePedido = (pedido, sucursal) => {
    if (!pedido?.timestamp?.toDate) return Promise.resolve();
    return invalidarFoto(getFechaComercialDe(pedido.timestamp.toDate()), sucursal);
};

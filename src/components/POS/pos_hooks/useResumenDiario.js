import { getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { colSucursal, docSucursal, colDeSucursal, docDeSucursal } from "../../../firebaseConfig/firebase";
import { getFechaComercial, getFechaComercialDe, getRangoDeJornada, jornadaEstaAbierta } from "../../../Utils/fechaComercial";
import { CATEGORIAS_COMBOS, ENVIOS_LOCALES, ESTADOS, SUBESTADOS_MOTODELIVERY, METODOS_PAGO } from "../../../Utils/Constantes";

// ─────────────────────────────────────────────────────────────────────────────
// EL ARQUEO SE CALCULA DESDE LOS PEDIDOS, NO SE ACUMULA
//
// Antes `resumenDiario` se mantenía con increment(): cada guardado sumaba y cada
// eliminación restaba. Eso obligaba a que TODO camino que tocara un pedido se
// acordara de mover el arqueo, en el orden correcto y una sola vez —increment()
// no es idempotente—, y si alguna vez se desincronizaba no había forma de saberlo
// ni de arreglarlo: el número era un acumulado, no la verdad.
//
// Ahora el arqueo es una función de los pedidos de la jornada. Si el número está
// mal, es porque los pedidos están mal, y eso se ve mirando los pedidos. Eliminar
// un pedido volvió a ser cambiar un campo.
//
// El resultado se guarda igual en `resumenDiario/{DD-MM-YYYY}`, pero como FOTO:
// para que el histórico y el dashboard cross-sucursal cuesten 1 lectura por día y
// sucursal en vez de releer todos los pedidos de cada jornada.
//
// Las reglas de la foto, y el porqué de cada una:
//
//  1. Jornada ABIERTA: se calcula siempre, no se guarda nada. Todavía se está
//     moviendo, congelarla daría un número que enseguida es falso.
//  2. Jornada CERRADA sin foto: se calcula una vez y se guarda. Queda definitiva.
//  3. Jornada CERRADA con foto: se usa la foto. NUNCA se recalcula sola.
//  4. Solo se regenera si alguien corrige LOS HECHOS: quien cancele o elimine un
//     pedido de una jornada cerrada borra su foto con `invalidarFoto()`, y el
//     siguiente que la mire la reconstruye con los pedidos corregidos.
//
// Cambiar CÓDIGO no cambia la historia. Lo que depende de reglas que cambian —qué
// cuenta como combo, qué zona cobra en mostrador, el fijo del repartidor— se
// CONGELA en el pedido al escribirlo (`combos`, `esLocal`, `fijoDelivery`), igual
// que el valorHora en asistencias. Así agosto dice lo que era cierto en agosto sin
// importar cuándo se saque su foto: la foto es un caché de lecturas, no la que
// guarda la historia. El cálculo de siempre queda solo como respaldo para un
// pedido que no tenga el campo.
// ─────────────────────────────────────────────────────────────────────────────

// Cuenta unidades y no renglones: un item con cantidad 3 son 3 combos. Los productos que
// comparten categoria con los combos pero se venden sueltos salen de la lista `excludes`
// de cada categoria. Misma regla que esComboConta en Estadisticas, asi la jornada y el
// historico dan el mismo numero.
export const contarCombos = (carrito = []) =>
    carrito.reduce((total, item) => {
        const combo = CATEGORIAS_COMBOS.find(c => c.key === item.categoria);
        if (!combo || combo.excludes?.includes(item.descripcion)) return total;
        return total + (Number(item.cantidad) || 1);
    }, 0);

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

// Lo que cobra cada repartidor por noche: un fijo mas el costo de envio de cada
// entrega que hizo. Se lee una vez: el .env no cambia con la app andando.
export const FIJO_DELIVERY = Number(process.env.REACT_APP_fijoDeliverys) || 0;

// Qué hizo cada repartidor en la jornada y cuánto hay que pagarle. Función pura.
//
// Cuentan solo las entregas CERRADAS (estadoDelivery == FIN): es cuando el
// repartidor volvió y rindió la plata. Una que sigue en la calle no se paga todavía.
// Se cuenta aunque el pedido se haya anulado después: el viaje se hizo igual.
// PENDIENTE: confirmar con el negocio qué pasa en ese caso.
//
// Un repartidor aparece si hizo al menos una entrega: sin entregas no cobra el
// fijo, por regla del negocio. El fijo va una vez por repartidor y por noche,
// no por entrega.
//
// `entregas` es el detalle para la pantalla del jefe (con las direcciones). La foto
// del arqueo lo descarta: ya está en los pedidos y no hace falta duplicarlo.
export const liquidarDeliverys = (pedidos = [], fijo = FIJO_DELIVERY) => {
    const porRepartidor = {};

    for (const p of pedidos) {
        if (!p.deliveryID || p.estadoDelivery !== SUBESTADOS_MOTODELIVERY.FIN) continue;

        if (!porRepartidor[p.deliveryID]) {
            // El fijo que quedó congelado en la entrega, si lo tiene: es el de esa
            // noche. El de la constante solo para pedidos sin el campo.
            const fijoNoche = Number(p.fijoDelivery ?? fijo) || 0;
            porRepartidor[p.deliveryID] = {
                nombre: "",
                cantidadPedidos: 0,
                totalEnvios: 0,
                efectivoCobrado: 0,
                fijo: fijoNoche,
                aPagar: fijoNoche,
                entregas: [],
            };
        }
        const r = porRepartidor[p.deliveryID];
        const envio = Number(p.envio?.costo_envio) || 0;
        const { efectivo } = repartirPago(p);

        r.nombre = p.deliveryAsignado || r.nombre;
        r.cantidadPedidos += 1;
        r.totalEnvios += envio;
        r.aPagar += envio;
        r.efectivoCobrado += efectivo;
        r.entregas.push({
            id: p.id,
            codigo: p.codigo,
            direccion: p.direccion || "",
            zona: p.envio?.zona_envio || "",
            envio,
            metodoPago: p.metodoPago,
            efectivo,
            pagaronCon: Number(p.pagaronCon) || 0,
            finTimestamp: p.deliveryFinTimestamp || null,
        });
    }

    return porRepartidor;
};

// El arqueo de una jornada, calculado. Función pura: sin Firestore y sin estado,
// así se puede verificar a mano con casos.
export const calcularArqueo = (pedidos = []) => {
    const arqueo = {
        totalEfectivo: 0,
        efectivoLocal: 0,
        efectivoEnvio: 0,
        mp: 0,
        totalPedidos: 0,
        totalCombos: 0,
        deliverys: {},
    };

    // La foto guarda el resumen de cada repartidor, sin el detalle de entregas.
    const liquidacion = liquidarDeliverys(pedidos);
    for (const id of Object.keys(liquidacion)) {
        const { entregas, ...resumen } = liquidacion[id];
        arqueo.deliverys[id] = resumen;
    }

    for (const p of pedidos) {
        if (!entraAlArqueo(p)) continue;

        const { efectivo, mp } = repartirPago(p);
        // Retira y Espera Afuera cobran en el mostrador; el resto de las zonas
        // vuelve con el repartidor. Son dos cajas distintas.
        const esLocal = p.esLocal ?? ENVIOS_LOCALES.includes(p.envio?.zona_envio);

        arqueo.totalEfectivo += efectivo;
        arqueo.efectivoLocal += esLocal ? efectivo : 0;
        arqueo.efectivoEnvio += esLocal ? 0 : efectivo;
        arqueo.mp += mp;
        arqueo.totalPedidos += 1;
        arqueo.totalCombos += p.combos ?? contarCombos(p.carrito);
    }

    return arqueo;
};

// ── Acceso a Firestore ───────────────────────────────────────────────────────
// Las funciones aceptan `sucursal` opcional: sin ella usan la del usuario
// logueado, que es lo que hace la Caja. La pasa el admin, que opera sobre una
// sucursal ajena (y el dashboard cross-sucursal, que recorre todas).

const refPedidos = (sucursal) => (sucursal ? colDeSucursal(sucursal, "pedidos") : colSucursal("pedidos"));
const refFoto = (jornada, sucursal) =>
    sucursal ? docDeSucursal(sucursal, "resumenDiario", jornada) : docSucursal("resumenDiario", jornada);

// Los pedidos de una jornada. Sin filtro de estado: los CANCELADO y ELIMINADO se
// descartan al calcular, pero tienen que venir para poder contarlos como anulados
// en vez de como inexistentes.
export const traerPedidosDeJornada = async (jornada, sucursal) => {
    const { inicio, fin } = getRangoDeJornada(jornada);
    const snap = await getDocs(query(
        refPedidos(sucursal),
        where("timestamp", ">=", inicio),
        where("timestamp", "<=", fin),
        orderBy("timestamp", "asc")
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// El arqueo de una jornada, con la foto como caché. Ver las 4 reglas de arriba.
//
// Devuelve { arqueo, calculado }: `calculado` dice si salió de los pedidos (true)
// o de la foto (false), para que la pantalla pueda avisar que es provisorio.
export const obtenerArqueo = async (jornada = getFechaComercial(), sucursal) => {
    const abierta = jornadaEstaAbierta(jornada);

    if (!abierta) {
        const foto = await getDoc(refFoto(jornada, sucursal));
        // Sin `generadoEl` no es una foto de este mecanismo: se recalcula.
        if (foto.exists() && foto.data().generadoEl) {
            return { arqueo: foto.data(), calculado: false };
        }
    }

    const arqueo = calcularArqueo(await traerPedidosDeJornada(jornada, sucursal));

    // La jornada abierta no se congela: el número cambia con cada pedido.
    if (!abierta) {
        await setDoc(refFoto(jornada, sucursal), { ...arqueo, generadoEl: serverTimestamp() });
    }

    return { arqueo, calculado: true };
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

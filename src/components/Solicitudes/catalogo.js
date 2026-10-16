import { CATEGORIAS_HAMBURGUESA } from "../../Utils/Constantes";

// Las reglas del catálogo de la web pública, puras: sin React ni Firebase, así se
// prueban con casos (catalogo.test.js). Las comparten el pedido web y /menu.
//
// Las categorías con comportamiento propio van por su nombre, como en el resto del
// sistema (decisión del dueño): renombrar una desde el ABM le cambia el
// comportamiento en la web.
export const POLLO = "POLLO CRISPY";
export const BEBIDAS = "BEBIDAS";
export const EXTRA = "EXTRA";
export const CAJA_PAPAS = "CAJA PAPAS";
// El tamaño que representa a la hamburguesa en la tarjeta del catálogo y en /menu: su
// foto y sus ingredientes (decisión del dueño, 16-10-2026).
const VARIANTE_DE_LA_TARJETA = "DOBLE";

// La ilustración de cada categoría, cuando no hay foto. La que no figura usa la bolsa.
const ILUSTRACION_DE_CATEGORIA = {
    [POLLO]: "llama",
    NUGGETS: "aderezo",
    [CAJA_PAPAS]: "papas",
    [BEBIDAS]: "vaso",
};

export const esHamburguesa = (producto) => CATEGORIAS_HAMBURGUESA.includes(producto?.categoria);

// "CAJA PAPAS" -> "Caja papas": las categorías y los extras se guardan en mayúsculas.
export const capitalizar = (texto = "") => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();

const aClave = (texto) =>
    texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// "BLT DOBLE" -> "BLT". Cada variante es un producto propio (categoría DOBLE,
// descripción "BLT DOBLE"): la web y /menu las juntan por el nombre sin el sufijo.
// Era la misma regla escrita tres veces, y no eran iguales.
const SUFIJO = new RegExp(`\\s+(${CATEGORIAS_HAMBURGUESA.join("|")})\\s*$`, "i");
export const quitarVariante = (descripcion = "") => descripcion.replace(SUFIJO, "").trim();

// Las variantes de cada hamburguesa, juntas en una tarjeta:
// [{ id, nombre, variantes, precioDesde, imagen, ingredientes }]. Las variantes van
// como CATEGORIAS_HAMBURGUESA (simple, doble, triple); las hamburguesas, en el orden
// del catálogo. La foto y los ingredientes son los del DOBLE (VARIANTE_DE_LA_TARJETA);
// si el DOBLE no los tiene, los de la primera variante que sí. La ficha, en cambio,
// muestra los del tamaño elegido.
export const agruparHamburguesas = (productos = []) => {
    const porNombre = new Map();
    for (const p of productos) {
        if (!esHamburguesa(p)) continue;
        const nombre = quitarVariante(p.descripcion);
        if (!porNombre.has(nombre)) porNombre.set(nombre, []);
        porNombre.get(nombre).push(p);
    }
    const orden = (p) => CATEGORIAS_HAMBURGUESA.indexOf(p.categoria);
    return [...porNombre.entries()].map(([nombre, variantes]) => {
        const ordenadas = [...variantes].sort((a, b) => orden(a) - orden(b));
        const doble = ordenadas.find((v) => v.categoria === VARIANTE_DE_LA_TARJETA);
        return {
            id: `hamburguesa-${aClave(nombre)}`,
            nombre,
            variantes: ordenadas,
            precioDesde: Math.min(...ordenadas.map((v) => Number(v.precio) || 0)),
            imagen: doble?.imagen || ordenadas.find((v) => v.imagen)?.imagen || "",
            ingredientes: doble?.ingredientes || ordenadas.find((v) => v.ingredientes)?.ingredientes || "",
        };
    });
};

const porOrden = (categorias) => [...categorias].sort((a, b) => (Number(a.nroOrden) || 0) - (Number(b.nroOrden) || 0));

// Las tarjetas del filtro y lo que muestra cada una: Ofertas (si hay), Hamburguesas
// y el resto de las categorías en su nroOrden —Pollo crispy es una más, ya no vive
// dentro de Hamburguesas—, sin EXTRA (los extras se eligen en la ficha) y sin las
// que quedan vacías.
export const armarSecciones = (categorias = [], productos = []) => {
    const secciones = [];

    const ofertas = productos.filter((p) => p.oferta && p.categoria !== EXTRA);
    if (ofertas.length) {
        secciones.push({ id: "ofertas", nombre: "Ofertas", ilustracion: "bolsa", productos: ofertas });
    }

    const hamburguesas = agruparHamburguesas(productos);
    if (hamburguesas.length) {
        secciones.push({ id: "hamburguesas", nombre: "Hamburguesas", ilustracion: "hamburguesa-fuego", productos: hamburguesas });
    }

    porOrden(categorias)
        .filter((c) => !CATEGORIAS_HAMBURGUESA.includes(c.nombre) && c.nombre !== EXTRA)
        .forEach((c) => {
            const deLaCategoria = productos.filter((p) => p.categoria === c.nombre);
            if (!deLaCategoria.length) return;
            secciones.push({
                id: aClave(c.nombre),
                nombre: capitalizar(c.nombre),
                ilustracion: ILUSTRACION_DE_CATEGORIA[c.nombre] || "bolsa",
                productos: deLaCategoria,
                esBebidas: c.nombre === BEBIDAS,
            });
        });

    return secciones;
};

// La carta de /menu: las hamburguesas agrupadas, con un precio por variante (solo
// las variantes que existen), y después el resto de las categorías en su nroOrden,
// sin las vacías. A diferencia del pedido web van los extras —en la carta dicen qué
// se le puede agregar— y no hay "Ofertas" aparte.
export const armarCarta = (categorias = [], productos = []) => ({
    hamburguesas: agruparHamburguesas(productos),
    variantes: CATEGORIAS_HAMBURGUESA.filter((v) => productos.some((p) => p.categoria === v)),
    secciones: porOrden(categorias)
        .filter((c) => !CATEGORIAS_HAMBURGUESA.includes(c.nombre))
        .map((c) => ({
            id: aClave(c.nombre),
            nombre: c.nombre === EXTRA ? "Extras" : capitalizar(c.nombre),
            productos: productos.filter((p) => p.categoria === c.nombre),
        }))
        .filter((s) => s.productos.length),
});

// La ilustración de un producto sin foto: la de su categoría.
export const ilustracionDe = (producto) => {
    if (producto?.variantes || esHamburguesa(producto)) return "hamburguesa-fuego";
    return ILUSTRACION_DE_CATEGORIA[producto?.categoria] || "bolsa";
};

// Qué extras ofrece la ficha de cada producto, en grupos:
// - hamburguesas y pollo crispy: los de hamburguesa y, aparte, los de las papas del
//   combo (tipoExtra PAPAS);
// - cajas de papas: los de papas y los generales;
// - el resto (nuggets…): los generales;
// - bebidas: ninguno.
// Se muestran todos, también los de $0: ocultar un producto es cosa del admin, desde
// Productos (decisión del dueño, 15-10-2026).
export const extrasDe = (producto, productos = []) => {
    const categoria = producto?.variantes ? producto.variantes[0]?.categoria : producto?.categoria;
    if (!categoria || categoria === BEBIDAS || categoria === EXTRA) return [];

    const extras = productos.filter((p) => p.categoria === EXTRA);
    const deTipo = (...tipos) => extras.filter((e) => tipos.includes(e.tipoExtra));

    let grupos;
    if (CATEGORIAS_HAMBURGUESA.includes(categoria) || categoria === POLLO) {
        grupos = [
            { id: "hamburguesa", titulo: "Extras", extras: deTipo("HAMBURGUESA") },
            { id: "papas", titulo: "Para las papas del combo", extras: deTipo("PAPAS") },
        ];
    } else if (categoria === CAJA_PAPAS) {
        grupos = [{ id: "papas", titulo: "Extras", extras: deTipo("PAPAS", "GENERAL") }];
    } else {
        grupos = [{ id: "general", titulo: "Extras", extras: deTipo("GENERAL") }];
    }
    return grupos.filter((g) => g.extras.length);
};

// "Agregar" abre la ficha cuando hay algo para elegir: el tamaño o algún extra. Una
// bebida, o un producto sin extras, se agrega directo.
export const abreFicha = (producto, grupos = []) => (producto?.variantes?.length || 0) > 1 || grupos.length > 0;

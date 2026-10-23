// Utils/menuPublico.js
// Menú público como JSON estático en Storage: las pantallas públicas (Menu, CrearSolicitud)
// lo consumen sin lecturas de Firestore. Se regenera con el botón "Publicar Menú" de Productos.
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig/firebase";

const MENU_PATH = "publico/menu.json";

export const URL_MENU_PUBLICO =
    `https://firebasestorage.googleapis.com/v0/b/${process.env.REACT_APP_storageBucket}/o/${encodeURIComponent(MENU_PATH)}?alt=media`;

// Qué ve la web pública. Lo privado se vende solo en la Caja, en dos niveles:
// - una categoría privada (casilla "¿Privada?" de Categorías: las de empleados, como
//   COMBO GARDEN) no se publica, ni ninguno de sus productos;
// - un producto privado (casilla "¿Privado?" de Productos: un extra que solo usan los
//   cajeros) tampoco, aunque su categoría sea pública.
// Se filtra acá y no en la consulta: Firestore no puede pedir "privado distinto de
// true" incluyendo los documentos sin el campo, y se leen todos igual. Los productos
// van a su categoría por el nombre, como en todo el sistema.
const filtrarPublico = (productos, categorias) => {
    const privadas = new Set(categorias.filter((c) => c.privado).map((c) => c.nombre));
    return {
        productos: productos.filter((p) => !p.privado && !privadas.has(p.categoria)),
        categorias: categorias.filter((c) => !c.privado),
    };
};
const conId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// Las sucursales tal como viajan en el JSON: las activas, por nombre.
const sucursalesPublicas = (snap) => snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.activa !== false)
    .sort((a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id));

// Las zonas de envío tal como viajan en el JSON: solo lo que la web necesita para
// calcular el envío por distancia (Utils/zonasEnvio.js).
const enviosPublicos = (envios) => envios.map(({ zona_envio, costo_envio }) => ({ zona_envio, costo_envio }));

const subirMenu = async (menu) => {
    const blob = new Blob([JSON.stringify(menu)], { type: "application/json" });
    // 60 segundos de caché: durante ese minuto el navegador ni pregunta, así que un
    // precio recién publicado no se ve hasta que expire (o con Ctrl+F5, que saltea
    // la caché). No es un problema en operación —el menú se publica horas antes de
    // que lo mire un cliente— y a cambio son cero requests durante ese minuto.
    await uploadBytes(ref(storage, MENU_PATH), blob, {
        contentType: "application/json",
        cacheControl: "public, max-age=60",
    });

    // La copia en memoria de esta pestaña quedó vieja: sin esto, la web abierta en
    // el mismo navegador seguía mostrando el menú anterior hasta recargar la página.
    menuPromise = null;
};

export const publicarMenu = async () => {
    // Las sucursales viajan dentro del JSON a propósito: la web necesita su
    // horario para saber si toma pedidos, su dirección y teléfono para el pie, y su
    // ubicación para el envío. Así los tiene sin pagar una lectura por visita. Las
    // zonas de envío, por lo mismo: leerlas en cada visita sería 1 lectura por zona
    // y por cliente. El costo es de 2-3 sucursales y ~10 zonas, solo cuando el admin
    // publica.
    const [productosSnap, categoriasSnap, sucursalesSnap, enviosSnap] = await Promise.all([
        getDocs(collection(db, "productos")),
        getDocs(query(collection(db, "categorias"), orderBy("nroOrden", "asc"))),
        getDocs(collection(db, "sucursales")),
        getDocs(collection(db, "envios")),
    ]);

    const menu = {
        generadoEl: Date.now(),
        // Lo privado se vende solo en la Caja: no se publica.
        ...filtrarPublico(conId(productosSnap), conId(categoriasSnap)),
        sucursales: sucursalesPublicas(sucursalesSnap),
        envios: enviosPublicos(conId(enviosSnap)),
    };

    await subirMenu(menu);
    return menu;
};

// no-store: el JSON tiene un minuto de caché, y partir de una copia vieja borraría
// lo que se publicó en ese minuto.
const leerMenuPublicado = async () => {
    const res = await fetch(URL_MENU_PUBLICO, { cache: "no-store" });
    if (!res.ok) throw new Error(`menu.json no disponible (${res.status})`);
    return res.json();
};

// Republica SOLO las sucursales, sin tocar productos ni categorías. La llama el
// Panel Admin después de cualquier cambio en una sucursal —datos, horario,
// activarla, una excepción—, así que "Publicar Menú" queda solo para el catálogo.
//
// Parte del JSON ya publicado y no de Firestore: publicarMenu() leería el catálogo
// entero y, de rebote, publicaría cambios de productos a medio hacer. Cuesta 2-3
// lecturas (las sucursales). Si todavía no hay menu.json falla, y el que llama
// avisa que hay que publicar el menú.
export const publicarSucursales = async () => {
    const [menu, sucursalesSnap] = await Promise.all([
        leerMenuPublicado(),
        getDocs(collection(db, "sucursales")),
    ]);
    await subirMenu({ ...menu, sucursales: sucursalesPublicas(sucursalesSnap) });
};

// Republica SOLO las zonas de envío, como publicarSucursales. La llama el ABM de
// Envíos con la lista que ya tiene en memoria: 0 lecturas.
export const publicarEnvios = async (envios) => {
    const menu = await leerMenuPublicado();
    await subirMenu({ ...menu, envios: enviosPublicos(envios) });
};

// Bandera "hay cambios sin publicar". Vive en localStorage: la prende Productos
// con cualquier edición del catálogo y se apaga al publicar. Es por navegador, a
// propósito: no vale una lectura de Firestore para saberlo desde otra PC, y
// publicar dos veces no rompe nada. Los try/catch son por el modo privado, donde
// localStorage puede tirar.
const CLAVE_PENDIENTE = "menuSinPublicar";
export const marcarMenuPendiente = () => { try { localStorage.setItem(CLAVE_PENDIENTE, "1"); } catch { /* sin storage */ } };
export const limpiarMenuPendiente = () => { try { localStorage.removeItem(CLAVE_PENDIENTE); } catch { /* sin storage */ } };
export const hayMenuPendiente = () => { try { return localStorage.getItem(CLAVE_PENDIENTE) === "1"; } catch { return false; } };

// Cachea la promesa para que productos y categorías compartan una sola descarga
let menuPromise = null;

export const fetchMenuPublico = () => {
    if (!menuPromise) {
        menuPromise = fetch(URL_MENU_PUBLICO)
            .then((res) => {
                if (!res.ok) throw new Error(`menu.json no disponible (${res.status})`);
                return res.json();
            })
            .catch((error) => {
                menuPromise = null; // permite reintentar en la próxima llamada
                throw error;
            });
    }
    return menuPromise;
};

// El catálogo de las pantallas públicas (el pedido web y /menu): productos,
// categorías en su nroOrden, sucursales y zonas de envío, de menu.json. Si el JSON no
// está, de Firestore, con el mismo filtro con que se publica: todos los productos y
// todas las categorías en cada visita, y sin sucursales ni zonas (el envío lo suma
// el cajero). Estaba escrito dos veces,
// en el contexto del carrito y en /menu. Ojo (docs/Decisiones tecnicas.md): el
// respaldo tapa la falla en silencio, y lo único que la delata es la factura.
export const fetchCatalogoPublico = async () => {
    try {
        const menu = await fetchMenuPublico();
        return {
            productos: menu.productos || [],
            categorias: [...(menu.categorias || [])].sort((a, b) => a.nroOrden - b.nroOrden),
            sucursales: menu.sucursales || [],
            envios: menu.envios || [],
        };
    } catch (error) {
        console.warn("menu.json no disponible, se lee Firestore:", error);
    }
    const [productosSnap, categoriasSnap] = await Promise.all([
        getDocs(collection(db, "productos")),
        getDocs(query(collection(db, "categorias"), orderBy("nroOrden", "asc"))),
    ]);
    return {
        ...filtrarPublico(conId(productosSnap), conId(categoriasSnap)),
        sucursales: [],
        envios: [],
    };
};

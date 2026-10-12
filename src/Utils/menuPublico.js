// Utils/menuPublico.js
// Menú público como JSON estático en Storage: las pantallas públicas (Menu, CrearSolicitud)
// lo consumen sin lecturas de Firestore. Se regenera con el botón "Publicar Menú" de Productos.
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig/firebase";
import { CATEGORIAS_SOLO_CAJA } from "./Constantes";

const MENU_PATH = "publico/menu.json";

export const URL_MENU_PUBLICO =
    `https://firebasestorage.googleapis.com/v0/b/${process.env.REACT_APP_storageBucket}/o/${encodeURIComponent(MENU_PATH)}?alt=media`;

// Las sucursales tal como viajan en el JSON: las activas, por nombre.
const sucursalesPublicas = (snap) => snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.activa !== false)
    .sort((a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id));

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
    // horario para saber si toma pedidos, y su dirección y teléfono para el pie. Así
    // los tiene sin pagar una lectura por visita. El costo es de 2-3 documentos y
    // solo cuando el admin publica.
    const [productosSnap, categoriasSnap, sucursalesSnap] = await Promise.all([
        getDocs(query(collection(db, "productos"), where("visible", "==", true))),
        getDocs(query(collection(db, "categorias"), orderBy("nroOrden", "asc"))),
        getDocs(collection(db, "sucursales")),
    ]);

    const menu = {
        generadoEl: Date.now(),
        // Los productos para empleados se venden solo en la Caja: no se publican.
        productos: productosSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !CATEGORIAS_SOLO_CAJA.includes(p.categoria)),
        categorias: categoriasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !CATEGORIAS_SOLO_CAJA.includes(c.nombre)),
        sucursales: sucursalesPublicas(sucursalesSnap),
    };

    await subirMenu(menu);
    return menu;
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
    // no-store: el JSON tiene un minuto de caché, y partir de una copia vieja
    // borraría lo que se publicó en ese minuto.
    const res = await fetch(URL_MENU_PUBLICO, { cache: "no-store" });
    if (!res.ok) throw new Error(`menu.json no disponible (${res.status})`);
    const [menu, sucursalesSnap] = await Promise.all([
        res.json(),
        getDocs(collection(db, "sucursales")),
    ]);
    await subirMenu({ ...menu, sucursales: sucursalesPublicas(sucursalesSnap) });
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

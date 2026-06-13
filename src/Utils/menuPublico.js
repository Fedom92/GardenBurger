// Utils/menuPublico.js
// Menú público como JSON estático en Storage: las pantallas públicas (Menu, CrearSolicitud)
// lo consumen sin lecturas de Firestore. Se regenera con el botón "Publicar Menú" de Productos.
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig/firebase";

const MENU_PATH = "publico/menu.json";

export const URL_MENU_PUBLICO =
    `https://firebasestorage.googleapis.com/v0/b/${process.env.REACT_APP_storageBucket}/o/${encodeURIComponent(MENU_PATH)}?alt=media`;

export const publicarMenu = async () => {
    const [productosSnap, categoriasSnap] = await Promise.all([
        getDocs(query(collection(db, "productos"), where("visible", "==", true))),
        getDocs(query(collection(db, "categorias"), orderBy("nroOrden", "asc"))),
    ]);

    const menu = {
        generadoEl: Date.now(),
        productos: productosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        categorias: categoriasSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    };

    const blob = new Blob([JSON.stringify(menu)], { type: "application/json" });
    await uploadBytes(ref(storage, MENU_PATH), blob, {
        contentType: "application/json",
        cacheControl: "public, max-age=60",
    });

    return menu;
};

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

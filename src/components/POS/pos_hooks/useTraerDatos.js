import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";

// Catalogo de la Caja por listener, no por getDocs.
//
// Antes releia productos + categorias + envios enteros en CADA montaje: cada F5 y
// cada vuelta desde otra pantalla. Era el mayor costo recurrente del sistema.
//
// Con persistentLocalCache el resumeToken de cada listener queda en IndexedDB, asi
// que al re-montar el servidor manda solo los cambios en lugar de la query entera.
// Y de paso el catalogo queda en vivo: un precio que cambia el admin llega a la
// Caja abierta sin recargar.
const useTraerDatos = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [envios, setEnvios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const productosCollection = useRef(query(collection(db, "productos"), where("visible", "==", true)));
    const categoriasCollection = useRef(query(collection(db, "categorias"), orderBy("nroOrden", "asc")));
    const enviosCollection = useRef(query(collection(db, "envios"), orderBy("zona_envio", "asc")));

    useEffect(() => {
        const parseDocs = (snapshot) =>
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // El loader se apaga recien cuando llegaron las tres fuentes, igual que
        // hacia el Promise.all: apagarlo con la primera mostraria la Caja sin
        // envios cargados. Un error tambien marca listo, si no la pantalla queda
        // girando para siempre.
        const listos = { productos: false, categorias: false, envios: false };
        const marcarListo = (clave) => {
            listos[clave] = true;
            if (listos.productos && listos.categorias && listos.envios) setIsLoading(false);
        };

        const alFallar = (clave) => (error) => {
            console.error(`Error escuchando ${clave} en Caja:`, error);
            marcarListo(clave);
        };

        const unsubProductos = onSnapshot(productosCollection.current, (snap) => {
            setProductos(parseDocs(snap).sort((a, b) =>
                a.descripcion.localeCompare(b.descripcion)
            ));
            marcarListo("productos");
        }, alFallar("productos"));

        const unsubCategorias = onSnapshot(categoriasCollection.current, (snap) => {
            // "todas" es la pestaña que no filtra: no existe en Firestore.
            setCategorias([...parseDocs(snap), { id: "todas", nombre: "" }]);
            marcarListo("categorias");
        }, alFallar("categorias"));

        const unsubEnvios = onSnapshot(enviosCollection.current, (snap) => {
            setEnvios(parseDocs(snap));
            marcarListo("envios");
        }, alFallar("envios"));

        // Desuscribirse ya evita el update tardio: no hace falta el flag isMounted
        // que llevaba la version con getDocs.
        return () => {
            unsubProductos();
            unsubCategorias();
            unsubEnvios();
        };
    }, []);

    return { productos, categorias, envios, isLoading };
};

export default useTraerDatos;

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";

const useTraerDatos = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [envios, setEnvios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const productosCollection = useRef(query(collection(db, "productos"), where("visible", "==", true)));
    const categoriasCollection = useRef(query(collection(db, "categorias"), orderBy("nroOrden", "asc")));
    const enviosCollection = useRef(query(collection(db, "envios"), orderBy("zona_envio", "asc")));

    useEffect(() => {
        let isMounted = true;

        const parseDocs = (snapshot) =>
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const fetchData = async () => {
            try {
                const [prodSnap, catSnap, envSnap] = await Promise.all([
                    getDocs(productosCollection.current),
                    getDocs(categoriasCollection.current),
                    getDocs(enviosCollection.current)
                ]);

                if (!isMounted) return;

                setProductos(parseDocs(prodSnap).sort((a, b) =>
                    a.descripcion.localeCompare(b.descripcion)
                ));
                setCategorias([...parseDocs(catSnap), { id: "todas", nombre: "" }]);
                setEnvios(parseDocs(envSnap));
                setIsLoading(false);

            } catch (error) {
                console.error("Error fetching data Caja:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, []);

    return { productos, categorias, envios, isLoading };
};

export default useTraerDatos;
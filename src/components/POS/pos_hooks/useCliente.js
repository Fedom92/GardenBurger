import { useCallback } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";

const useCliente = () => {

    const buscarClientePorTelefono = useCallback(async (telefono) => {
        if (!telefono || telefono.length < 10) return null;
        try {
            const q = query(collection(db, "clientes"), where("telefono", "==", telefono), limit(1));
            const snap = await getDocs(q);
            return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (error) {
            console.error('Error buscando cliente:', error);
            return null;
        }
    }, []);

    return {
        buscarClientePorTelefono,
    };
};

export default useCliente;
import { useCallback } from "react";
import { collection, query, where, limit, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";
import { useAuth } from "../../../context/AuthContext";

const useCliente = () => {
    const { userData } = useAuth();

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

    // Se dispara sin await desde guardarBD: el alta del cliente es secundaria al
    // pedido. Sin catch, un fallo acá era una unhandled rejection y el alta se
    // perdía sin dejar rastro en ningún lado.
    const guardarClienteSiNoExiste = useCallback((clienteData) => {
        buscarClientePorTelefono(clienteData.telefono).then(existente => {
            if (!existente) {
                return addDoc(collection(db, "clientes"), {
                    nombre: clienteData.nombre || "",
                    direccion: clienteData.direccion || "",
                    entreCalles: clienteData.entreCalles || "",
                    telefono: clienteData.telefono,
                    sucursal: userData?.sucursal || "",
                });
            }
        }).catch(error => console.error("Error guardando el cliente:", error));
    }, [buscarClientePorTelefono, userData?.sucursal]);

    return {
        buscarClientePorTelefono,
        guardarClienteSiNoExiste
    };
};

export default useCliente;
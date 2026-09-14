import { useCallback } from "react";
import { collection, doc, query, where, limit, getDocs, addDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
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

    // La ficha del cliente se actualiza en CADA pedido, no solo se crea la primera
    // vez: nombre, direccion y entre calles quedan como los acaba de cargar el
    // cajero (la ultima direccion usada es la mas probable como actual), y se
    // llevan ultimoPedido y cantidadPedidos para CRM. increment() sobre un campo
    // ausente lo crea en 1, asi que los clientes viejos arrancan a contar desde su
    // proximo pedido sin migracion. ultimoPedido va con serverTimestamp() y no con
    // el timestamp del pedido: un horario especial tiene fecha futura.
    //
    // Costo: 1 lectura (la busqueda por telefono) + 1 escritura por pedido.
    //
    // Se dispara sin await desde guardarBD: la ficha es secundaria al pedido. Sin
    // catch, un fallo aca era una unhandled rejection y se perdia sin dejar rastro.
    const registrarCliente = useCallback((clienteData) => {
        const datos = {
            nombre: clienteData.nombre || "",
            direccion: clienteData.direccion || "",
            entreCalles: clienteData.entreCalles || "",
            telefono: clienteData.telefono,
        };

        buscarClientePorTelefono(clienteData.telefono).then(existente => {
            if (existente) {
                return updateDoc(doc(db, "clientes", existente.id), {
                    ...datos,
                    ultimoPedido: serverTimestamp(),
                    cantidadPedidos: increment(1),
                });
            }
            return addDoc(collection(db, "clientes"), {
                ...datos,
                sucursal: userData?.sucursal || "",
                creado: serverTimestamp(),
                ultimoPedido: serverTimestamp(),
                cantidadPedidos: 1,
            });
        }).catch(error => console.error("Error registrando el cliente:", error));
    }, [buscarClientePorTelefono, userData?.sucursal]);

    return {
        buscarClientePorTelefono,
        registrarCliente
    };
};

export default useCliente;

import { useRef, useEffect, useCallback } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase";

const useCliente = ({ telefono, setValue }) => {
    const clienteEncontradoRef = useRef(null);
    const saltearAutocompletadoRef = useRef(false);

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

    useEffect(() => {
        const autocompletarCliente = async () => {
            if (saltearAutocompletadoRef.current) {
                saltearAutocompletadoRef.current = false;
                return;
            }

            if (!telefono || telefono.length < 10) {
                if (clienteEncontradoRef.current) {
                    setValue("nombre", "");
                    setValue("direccion", "");
                    setValue("latitud", "");
                    setValue("longitud", "");
                    setValue("entreCalles", "");
                    clienteEncontradoRef.current = null;
                }
                return;
            }

            if (telefono.length !== 10) return;

            const cliente = await buscarClientePorTelefono(telefono);

            if (cliente) {
                clienteEncontradoRef.current = cliente;
                setValue("nombre", cliente.nombre || "");
                setValue("direccion", cliente.direccion || "");
                setValue("latitud", cliente.latitud || "");
                setValue("longitud", cliente.longitud || "");
                setValue("entreCalles", cliente.entreCalles || "");
            }
        };

        autocompletarCliente();
    }, [telefono, buscarClientePorTelefono, setValue]);

    const resetCliente = useCallback(() => {
        clienteEncontradoRef.current = null;
        saltearAutocompletadoRef.current = false;
    }, []);

    return {
        clienteEncontradoRef,
        saltearAutocompletadoRef,
        resetCliente,
    };
};

export default useCliente;
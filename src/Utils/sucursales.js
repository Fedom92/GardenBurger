// Utils/sucursales.js
// Lista de sucursales (colección global "sucursales"), ordenada por nombre.
// La usan el selector público (/crear-solicitud) y los selects de usuarios del admin.
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";

export const fetchSucursales = async () => {
    const snap = await getDocs(collection(db, "sucursales"));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id));
};

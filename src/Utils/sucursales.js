// Utils/sucursales.js
// Lista de sucursales (colección global "sucursales"), ordenada por nombre.
// La usan el selector público (/crear-solicitud) y los selects de usuarios del admin.
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";

// Promesa cacheada en módulo, igual que fetchMenuPublico. PanelAdmin la disparaba
// dos veces al montar (la suya y la de CrearEmpleado), y cada pantalla con
// selector de sucursal pagaba su propia lectura. Las sucursales cambian una vez
// al año: una lectura por sesión alcanza.
let sucursalesPromise = null;

export const fetchSucursales = () => {
    if (!sucursalesPromise) {
        sucursalesPromise = getDocs(collection(db, "sucursales"))
            .then((snap) =>
                snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id))
            )
            .catch((error) => {
                sucursalesPromise = null; // permite reintentar en la próxima llamada
                throw error;
            });
    }
    return sucursalesPromise;
};

// La llama el ABM de Sucursales después de crear, editar o activar una: sin esto
// el alta no aparecería en los selectores hasta recargar la pestaña.
export const invalidarSucursales = () => {
    sucursalesPromise = null;
};

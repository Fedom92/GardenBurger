import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, setSucursalStaff } from "../firebaseConfig/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthContextProvider({ children }) {

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  // login() lee usuarios/{uid} y onAuthStateChanged dispara por ese mismo login y
  // lo volvía a leer: 2 lecturas por inicio de sesión. Cuál de los dos llega
  // primero no está garantizado, así que en vez de marcar "ya lo leí" se comparte
  // la promesa en vuelo: el segundo en pedir se cuelga de la lectura del primero.
  // Se descarta al resolverse, para que un login posterior vuelva a leer de verdad
  // y siga viendo un `activo: false` puesto mientras tanto.
  const lecturasEnVuelo = useRef(new Map());

  const getIniciales = (nombreCompleto) => {
    if (!nombreCompleto) return "";
    const palabras = nombreCompleto.trim().split(" ");
    return palabras
      .filter(palabra => palabra.length > 0)
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join("");
  };

  const fetchUserData = useCallback((user) => {
    const enVuelo = lecturasEnVuelo.current.get(user.uid);
    if (enVuelo) return enVuelo;

    const lectura = (async () => {
      try {
        // Espera a que el ID token este resuelto: si no, la lectura sale sin
        // credencial y la regla de usuarios la rechaza con permission-denied.
        await user.getIdToken();

        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          // Respaldo del borrado real en Auth: cubre la ventana en que un token
          // ya emitido sigue vigente. Los docs viejos sin el campo son activos.
          if (data.activo === false) {
            await signOut(auth);
            return null;
          }
          setSucursalStaff(data.sucursal);
          return data;
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
      }
      return null;
    })();

    const conLimpieza = lectura.finally(() => lecturasEnVuelo.current.delete(user.uid));
    lecturasEnVuelo.current.set(user.uid, conLimpieza);
    return conLimpieza;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const data = await fetchUserData(user);
        if (data) {
          setUserData({
            ...data,
            id: user.uid,
            iniciales: getIniciales(data.nombreCompleto)
          });
        } else {
          setUserData(null);
          setSucursalStaff(null);
        }
      } else {
        setUserData(null);
        setSucursalStaff(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email, password) => {
    try {
      await setPersistence(auth, browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Validamos y obtenemos datos antes de retornar para evitar navegación prematura
      const data = await fetchUserData(credential.user);
      if (!data) {
        throw new Error("Usuario bloqueado o sin permisos");
      }
      setUserData({
        ...data,
        id: credential.user.uid,
        iniciales: getIniciales(data.nombreCompleto)
      });
      return data;
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error("Error en logout:", error);
      window.alert("Error al Cerrar sesión, Verifique su conexión!");
    }
  }, []);

  const contextValue = useMemo(() => ({
    userData,
    login,
    logout
  }), [userData, login, logout]);

  if (loading) {
    return (
      <div className="w-100 vh-100 d-flex justify-content-center align-items-center">
        <span className="loader position-absolute start-50 top-50 mt-3"></span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
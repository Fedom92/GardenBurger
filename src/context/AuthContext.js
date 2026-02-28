import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthContextProvider({ children }) {

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getIniciales = (nombreCompleto) => {
    if (!nombreCompleto) return "";
    const palabras = nombreCompleto.trim().split(" ");
    return palabras
      .filter(palabra => palabra.length > 0)
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join("");
  };

  const fetchUserData = useCallback(async (user) => {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.rol === process.env.REACT_APP_rolBloq) {
          await signOut(auth);
          return null;
        }
        return data;
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
    }
    return null;
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
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email, password) => {
    try {
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
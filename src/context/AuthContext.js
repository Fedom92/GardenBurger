import { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from "react";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";

const auth = getAuth();

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return { ...state, currentUser: action.payload.user, inicialesUsuario: action.payload.iniciales, loading: false };
    case "LOGOUT":
      return { ...state, currentUser: null, inicialesUsuario: "", loading: false };
    default:
      return state;
  }
};

const initialState = {
  currentUser: null,
  inicialesUsuario: "",
  loading: true,
};

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Función para obtener las iniciales del usuario
  const obtenerInicialesUsuario = async (user) => {
    if (!user) return "";
    
    try {
      const userQuery = query(collection(db, "usuarios"), where("correo", "==", user.email));
      const userDocsSnapshot = await getDocs(userQuery);
      
      if (!userDocsSnapshot.empty) {
        const userData = userDocsSnapshot.docs[0].data();
        const nombreCompleto = userData.nombreCompleto || "";
        
        // Extraer las iniciales de cada palabra
        const palabras = nombreCompleto.trim().split(" ");
        const iniciales = palabras
          .filter(palabra => palabra.length > 0)
          .map(palabra => palabra.charAt(0).toUpperCase())
          .join("");
        
        return iniciales;
      }
    } catch (error) {
      console.error("Error al obtener iniciales del usuario:", error);
    }
    
    return "";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const iniciales = await obtenerInicialesUsuario(user);
        dispatch({ 
          type: "LOGIN", 
          payload: { 
            user, 
            iniciales 
          } 
        });
      } else {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setPersistence(auth, browserLocalPersistence);
      
      const iniciales = await obtenerInicialesUsuario(userCredential.user);
      dispatch({ 
        type: "LOGIN", 
        payload: { 
          user: userCredential.user, 
          iniciales 
        } 
      });
    } catch (error) {
      console.error("Login" + error)
      window.alert("Error al Logearse, Verifique su conexión!")
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.setItem("rol", JSON.stringify(null));
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Logout" + error)
      window.alert("Error al Cerrar sesión, Verifique su conexión!")
    }
  }, []);

  // Memoizar el valor del contexto para evitar re-renderizados innecesarios
  const contextValue = useMemo(() => ({
    currentUser: state.currentUser, 
    inicialesUsuario: state.inicialesUsuario,
    login, 
    logout 
  }), [state.currentUser, state.inicialesUsuario, login, logout]);

  if (state.loading) {
    return <div className="w-100">
      <span className="loader position-absolute start-50 top-50 mt-3"></span>
    </div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
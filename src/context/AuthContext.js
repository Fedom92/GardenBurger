import { createContext, useContext, useEffect, useReducer } from "react";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

const auth = getAuth();

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return { ...state, currentUser: action.payload, loading: false };
    case "LOGOUT":
      return { ...state, currentUser: null, loading: false };
    default:
      return state;
  }
};

const initialState = {
  currentUser: null,
  loading: true,
};

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch({ type: "LOGIN", payload: user });
      } else {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setPersistence(auth, browserLocalPersistence);
      dispatch({ type: "LOGIN", payload: userCredential.user });
    } catch (error) {
      console.error("Login" + error)
      window.alert("Error al Logearse, Verifique su conexión!")
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      localStorage.setItem("rol", JSON.stringify(null));
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Logout" + error)
      window.alert("Error al Cerrar sesión, Verifique su conexión!")
    }
  }

  if (state.loading) {
    return <div className="w-100">
      <span className="loader position-absolute start-50 top-50 mt-3"></span>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ currentUser: state.currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
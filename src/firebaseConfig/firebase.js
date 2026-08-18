import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { initializeFirestore, memoryLocalCache, runTransaction, collection, doc } from "firebase/firestore";
import { getAuth, EmailAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
};

export const app = initializeApp(firebaseConfig);

// La clave de reCAPTCHA Enterprise solo vale para los dominios registrados, así
// que desde localhost no se consigue token y App Check rechaza todo. El debug
// token es la vía oficial para desarrollar: se imprime en consola al arrancar y
// se registra una vez en Consola → App Check → Apps → Tokens de depuración.
// Guardándolo después en REACT_APP_appCheckDebug deja de regenerarse.
if (process.env.NODE_ENV === "development") {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_appCheckDebug || true;
}

// App Check está "Aplicada" en la consola: sin token válido, Firestore y Auth
// rechazan con permission-denied, indistinguible de un problema de reglas.
if (process.env.REACT_APP_gardenAppCheck) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.REACT_APP_gardenAppCheck),
    isTokenAutoRefreshEnabled: true,
  });
}

// Cache en memoria y no persistente: la persistencia multi-pestaña comparte una
// sola capa de IndexedDB entre todas las pestañas del origen, y está pensada para
// pestañas del MISMO usuario. Con browserSessionPersistence la sesión es por
// pestaña, así que una pública anónima (/ver-pedido) convivía con la de Caja y las
// lecturas del staff salían sin credencial.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
export const auth = getAuth();
export const storage = getStorage(app);

export const verifCredenciales = EmailAuthProvider.credential;
export { signOut, reauthenticateWithCredential, updatePassword, updateProfile, updateEmail, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

// ── Sucursal del staff ─────────────────────────────────────────────────
// La setea únicamente AuthContext al loguear (userData.sucursal) y la limpia
// al desloguear. Las páginas públicas NO la usan: toman la sucursal de la URL.
let sucursalStaff = null;

export const setSucursalStaff = (id) => {
  sucursalStaff = id || null;
};

const sucursalRequerida = () => {
  if (!sucursalStaff) {
    throw new Error("Usuario sin sucursal asignada: no se puede acceder a colecciones por sucursal.");
  }
  return sucursalStaff;
};

// Refs a subcolecciones de la sucursal del usuario logueado:
// colSucursal("pedidos") → sucursales/{sucursalStaff}/pedidos
export const colSucursal = (nombre, ...segs) => collection(db, "sucursales", sucursalRequerida(), nombre, ...segs);
export const docSucursal = (nombre, ...segs) => doc(db, "sucursales", sucursalRequerida(), nombre, ...segs);

export const getNextSequence = async (coleccion) => {
  const counterRef = docSucursal("contadores", coleccion);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    const newValue = counterDoc.exists() ? counterDoc.data().value + 1 : 1;

    transaction.set(counterRef, { value: newValue }, { merge: true });

    return newValue;
  });
};
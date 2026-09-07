import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, runTransaction, collection, doc } from "firebase/firestore";
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

// Persistencia en IndexedDB, en modo UNA SOLA PESTAÑA. La distinción importa:
//
// El modo multi-pestaña elige una pestaña "primaria" que abre los streams de red
// por todas las demás. Con browserSessionPersistence la sesión de Auth es por
// pestaña, así que si la primaria era una pública anónima (/ver-pedido conviviendo
// con la de Caja), las lecturas del staff salían con esa credencial y volvían
// permission-denied. Por eso se había vuelto a memoria.
//
// En single-tab no hay primaria ni delegación: cada pestaña usa su propia conexión
// y sus propias credenciales, así que ese problema no puede repetirse. La primera
// pestaña que arranca Firestore se queda con IndexedDB y las siguientes caen solas
// a caché de memoria con un warning en consola —comportamiento del SDK, no un error—
// funcionando igual que antes de este cambio.
//
// Lo que gana: los onSnapshot persisten su resumeToken, así que al recargar el
// servidor manda solo los cambios en lugar de la query entera. Ojo: getDocs SIEMPRE
// consulta al servidor y se factura igual; para ahorrar ahí hay que pedir
// explícitamente getDocsFromCache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({})
    //persistentMultipleTabManager
  }),
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

// Refs a una sucursal EXPLÍCITA. Las usan el admin —que no tiene sucursal
// propia y elige sobre cuál operar— y, por debajo, las versiones de abajo.
export const colDeSucursal = (sucursal, nombre, ...segs) => collection(db, "sucursales", sucursal, nombre, ...segs);
export const docDeSucursal = (sucursal, nombre, ...segs) => doc(db, "sucursales", sucursal, nombre, ...segs);

// Refs a subcolecciones de la sucursal del usuario logueado:
// colSucursal("pedidos") → sucursales/{sucursalStaff}/pedidos
export const colSucursal = (nombre, ...segs) => colDeSucursal(sucursalRequerida(), nombre, ...segs);
export const docSucursal = (nombre, ...segs) => docDeSucursal(sucursalRequerida(), nombre, ...segs);

// `sucursal` es un override opcional: sin él usa la del usuario logueado, que es
// lo que hace la Caja. Lo pasa solo el admin, que opera sobre una sucursal ajena.
export const getNextSequence = async (coleccion, sucursal) => {
  const counterRef = sucursal
    ? docDeSucursal(sucursal, "contadores", coleccion)
    : docSucursal("contadores", coleccion);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    const newValue = counterDoc.exists() ? counterDoc.data().value + 1 : 1;

    transaction.set(counterRef, { value: newValue }, { merge: true });

    return newValue;
  });
};
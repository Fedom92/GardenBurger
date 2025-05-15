import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut, } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
  measurementId: process.env.REACT_APP_measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
export const auth = getAuth();
export const db = getFirestore(app)
export const verifCredenciales = EmailAuthProvider.credential;
export const reautenticar = reauthenticateWithCredential;
export const actualizarClave = updatePassword;
export { updateProfile, updateEmail, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

export const deslogear = signOut;

/*async function agregarCampoMasivamente() {
  const tratamientosRef = collection(db, 'tratamientos');
  const batch = writeBatch(db);

  try {
      const snapshot = await getDocs(tratamientosRef);

      snapshot.forEach((doc) => {
          const docRef = doc.ref;

          const updates = {
              notificacionLeida: false,
              fechaNotificacion: ""
          };

          batch.update(docRef, updates);
      });

      await batch.commit();
  } catch (error) {
      console.error('Error updating documents: ', error);
  }
}*/
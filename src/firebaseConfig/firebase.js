import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, EmailAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore(app)
export const verifCredenciales = EmailAuthProvider.credential;
export { signOut, reauthenticateWithCredential, updatePassword, updateProfile, updateEmail, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

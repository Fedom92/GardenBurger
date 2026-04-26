import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, runTransaction } from "firebase/firestore";
import { getAuth, EmailAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const auth = getAuth();
export const storage = getStorage(app);

export const verifCredenciales = EmailAuthProvider.credential;
export { signOut, reauthenticateWithCredential, updatePassword, updateProfile, updateEmail, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

export const getNextSequence = async (coleccion) => {
  const counterRef = doc(db, "contadores", coleccion);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    const newValue = counterDoc.exists() ? counterDoc.data().value + 1 : 1;

    transaction.set(counterRef, { value: newValue }, { merge: true });

    return newValue;
  });
};
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Novo login com email/senha
export const loginWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const registerWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

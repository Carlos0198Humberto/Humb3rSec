// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";

// ================== CONFIGURACIÓN FIREBASE ==================
const firebaseConfig = {
  apiKey: "AIzaSyC6AlHlfL0mTHT8W61YRISDdeu3Sa7UPbo",
  authDomain: "humb3rt0sec-2d96e.firebaseapp.com",
  projectId: "humb3rt0sec-2d96e",
  storageBucket: "humb3rt0sec-2d96e.appspot.com",
  messagingSenderId: "770052220746",
  appId: "1:770052220746:web:408f41cfa988d3fdb783b3",
};

// ================== INICIALIZAR FIREBASE ==================
const app = initializeApp(firebaseConfig);

// ================== AUTENTICACIÓN ==================
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ================== FIRESTORE ==================
const db = getFirestore(app);

// ================== STORAGE ==================
const storage = getStorage(app);

// ================== EXPORTAR ==================
export {
  app,
  auth,
  provider,
  db,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
};

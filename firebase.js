import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
import {
  getFirestore,
  setDoc,
  doc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const fallbackConfig = {
  apiKey: "AIzaSyAzEmNL-rMG6d3SJ6lFR6bJobzWZGe9H1Q",
  authDomain: "bidsphere-a55b1.firebaseapp.com",
  projectId: "bidsphere-a55b1",
  storageBucket: "bidsphere-a55b1.firebasestorage.app",
  messagingSenderId: "757445986493",
  appId: "1:757445986493:web:45a41b333823057ad50fd4",
  measurementId: "G-264CDTDBKG",
};

export const firebaseConfig = window.UniBidConfig || fallbackConfig;

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

(async function initAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Error setting persistence:", error);
  }
})();

export {
  analytics,
  auth,
  db,
  signOut,
  deleteUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setDoc,
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  setPersistence,
  browserLocalPersistence,
};




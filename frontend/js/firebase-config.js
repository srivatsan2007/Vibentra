// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCf1OtJD4xo1l41vBEceWdTBIg7i3xrj-Q",
    authDomain: "vibentra.firebaseapp.com",
    projectId: "vibentra",
    storageBucket: "vibentra.firebasestorage.app",
    messagingSenderId: "352644206426",
    appId: "1:352644206426:web:ab82ccc886e8bd4ac72d63",
    measurementId: "G-LJTL89BQL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

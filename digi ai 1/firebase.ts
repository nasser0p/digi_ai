

import { initializeApp } from 'firebase/app';
import { getAuth } from "@firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKbEYW0bt_lH2gaKPqt5V4BPDjjMNt1HM",
    authDomain: "digitalmenu-53813.firebaseapp.com",
    projectId: "digitalmenu-53813",
    storageBucket: "digitalmenu-53813.firebasestorage.app",
    messagingSenderId: "202450812678",
    appId: "1:202450812678:web:4b3b8955893a9da024e887",
    measurementId: "G-S8LZ0LFLCV"
};

// ======================================================================
// !! SUPER ADMIN SETUP (STEP 1 of 2) !!
// To become the Super Admin, you MUST do the following:
//
// 1. Create an account for yourself in the app.
// 2. Go to the Firebase Console -> Authentication -> Users tab.
// 3. Find your account and copy its "User UID".
// 4. Paste that UID here, replacing "REPLACE_WITH_YOUR_FIREBASE_UID".
//
// ==> NEXT, YOU MUST DO THE SAME IN `firestorerules.txt` <==
// ======================================================================
export const SUPER_ADMIN_UID = "REPLACE_WITH_YOUR_FIREBASE_UID";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
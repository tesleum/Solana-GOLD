import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyADyi-9N9ewNhUE3xTPo78r9Yu1U2-UW-4",
  authDomain: "smart-gold-2.firebaseapp.com",
  projectId: "smart-gold-2",
  storageBucket: "smart-gold-2.firebasestorage.app",
  messagingSenderId: "909106359671",
  appId: "1:909106359671:web:d7573b84fd7d5a5586c572",
  databaseURL: "https://smart-gold-2-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Safe initialization of messaging for SSR or unsupported browser webviews
export let messaging: Messaging | null = null;
try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && typeof Notification !== "undefined") {
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn("Firebase Messaging is not supported in this browser:", err);
}

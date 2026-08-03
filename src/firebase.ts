import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

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
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Safe messaging helper to prevent crashes in unsupported environments/iframes
export const getSafeMessaging = async () => {
  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn("Firebase Messaging is not supported or blocked in this browser:", err);
  }
  return null;
};

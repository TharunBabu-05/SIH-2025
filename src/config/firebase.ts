import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCYn0i9LqA71w2ASBTewy8Qyoo5TwxUgSc",
  authDomain: "gridguard-9891a.firebaseapp.com",
  projectId: "gridguard-9891a",
  storageBucket: "gridguard-9891a.firebasestorage.app",
  messagingSenderId: "633470332422",
  appId: "1:633470332422:web:fd0ca4ca9c31a2fb381d87",
  measurementId: "G-MPH9YNKTSX",
  databaseURL: "https://gridguard-9891a-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);

export default app;

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAWZWfpS_Ilqwm7TC9SoKcby14ozc0t8no",
  authDomain: "adjust-wordpress.firebaseapp.com",
  projectId: "adjust-wordpress",
  storageBucket: "adjust-wordpress.firebasestorage.app",
  messagingSenderId: "1086924297819",
  appId: "1:1086924297819:web:a0d937fbfc7f346ad0917e",
  measurementId: "G-G0M6GQDG2T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);

export default app;
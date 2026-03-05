import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAnfPAxVfAEqNQAlFKEtdJg5AmiQLrW7ag",
  thDomain: "lis-app-8c60c.firebaseapp.com",
  projectId: "lis-app-8c60c",
  storageBucket: "lis-app-8c60c.firebasestorage.app",
  messagingSenderId: "96239737867",
  appId: "1:96239737867:web:00886ff885b353cf30bb0e",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

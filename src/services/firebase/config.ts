import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Config } from '../../constants/config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export const initFirebase = () => {
  try {
    if (getApps().length === 0) {
      app = initializeApp(Config.firebase);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    return { app, auth, db };
  } catch (error) {
    console.warn('Firebase başlatılamadı — anahtarlar eksik veya geçersiz:', error);
    return { app: null, auth: null, db: null };
  }
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    initFirebase();
  }
  return auth;
};

export const getFirebaseDB = (): Firestore => {
  if (!db) {
    initFirebase();
  }
  return db;
};

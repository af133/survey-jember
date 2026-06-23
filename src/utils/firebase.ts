import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Respondent } from "../data/mockData";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = isSupported().then((yes) => yes ? getAnalytics(app) : null);

export { app, db, auth, analytics };

export const checkAdminAuth = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export async function getRespondentsFromFirestore(): Promise<Respondent[]> {
  const querySnapshot = await getDocs(collection(db, 'respondents'));
  const list: Respondent[] = [];
  querySnapshot.forEach((doc) => {
    list.push(doc.data() as Respondent);
  });
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

export async function saveRespondentToFirestore(respondent: Respondent): Promise<void> {
  const docRef = doc(db, 'respondents', respondent.id);
  await setDoc(docRef, respondent);
}

export async function deleteRespondentFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'respondents', id));
}

export async function seedFirestoreWithMockData(respondents: Respondent[]): Promise<void> {
  const batch = writeBatch(db);
  respondents.forEach((r) => {
    const docRef = doc(db, 'respondents', r.id);
    batch.set(docRef, r);
  });
  await batch.commit();
}

export async function clearFirestoreRespondents(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const docRef = doc(db, 'respondents', id);
    batch.delete(docRef);
  });
  await batch.commit();
}
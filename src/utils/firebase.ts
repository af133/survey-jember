import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Respondent, ALL_ITEM_IDS } from "../data/mockData";

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

/**
 * Validasi bahwa SEMUA 37 jawaban item likert sudah terisi sebelum disimpan.
 * Ini mencegah data parsial (mis. ada item yang ke-skip) tersimpan diam-diam ke Firestore.
 */
function validateRespondentComplete(respondent: Respondent): string[] {
  const missing: string[] = [];

  // Cek identitas wajib
  const requiredIdentityFields: Array<[keyof Respondent, string]> = [
    ['nama', 'Nama'],
    ['usia', 'Usia'],
    ['jenisKelamin', 'Jenis Kelamin'],
    ['pendidikan', 'Pendidikan'],
    ['kecamatan', 'Kecamatan'],
    ['desa', 'Desa'],
    ['wilayahTinggal', 'Wilayah Tinggal'],
    ['luasPertanian', 'Luas Pertanian'],
    ['jarakLahan', 'Jarak Lahan'],
  ];
  requiredIdentityFields.forEach(([key, label]) => {
    const val = respondent[key];
    if (val === undefined || val === null || val === '') {
      missing.push(label);
    }
  });

  // Cek koordinat
  if (respondent.latitude === undefined || respondent.latitude === null) missing.push('Latitude');
  if (respondent.longitude === undefined || respondent.longitude === null) missing.push('Longitude');

  // Cek SEMUA 37 jawaban item likert — tanpa kecuali
  if (!respondent.jawaban) {
    missing.push('Semua jawaban kuesioner (objek jawaban kosong)');
  } else {
    ALL_ITEM_IDS.forEach((itemId) => {
      const val = (respondent.jawaban as Record<string, number>)[itemId];
      if (val === undefined || val === null || val < 1 || val > 5) {
        missing.push(`Jawaban ${itemId}`);
      }
    });
  }

  return missing;
}

export async function saveRespondentToFirestore(respondent: Respondent): Promise<void> {
  const missing = validateRespondentComplete(respondent);
  if (missing.length > 0) {
    throw new Error(
      `Data belum lengkap, field berikut kosong/tidak valid: ${missing.join(', ')}`
    );
  }

  const docRef = doc(db, 'respondents', respondent.id);
  // setDoc menyimpan SELURUH objek respondent secara utuh ke Firestore,
  // termasuk objek nested `jawaban` (37 jawaban mentah) — tidak ada field yang dipotong.
  await setDoc(docRef, respondent);
}

export async function deleteRespondentFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'respondents', id));
}

export async function seedFirestoreWithMockData(respondents: Respondent[]): Promise<void> {
  // Firestore batch dibatasi maksimal 500 operasi per batch.
  // Untuk aman, kita pecah jadi chunk 450 agar tidak pernah menabrak limit.
  const CHUNK_SIZE = 450;
  for (let i = 0; i < respondents.length; i += CHUNK_SIZE) {
    const chunk = respondents.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((r) => {
      const docRef = doc(db, 'respondents', r.id);
      batch.set(docRef, r);
    });
    await batch.commit();
  }
}

export async function clearFirestoreRespondents(ids: string[]): Promise<void> {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const docRef = doc(db, 'respondents', id);
      batch.delete(docRef);
    });
    await batch.commit();
  }
}
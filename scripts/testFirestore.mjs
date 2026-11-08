import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('Connecting to Firestore...');
  const snapshot = await getDocs(collection(db, 'levels'));
  console.log('Found', snapshot.docs.length, 'levels in Firestore:');
  snapshot.docs.forEach(d => console.log(' -', d.id, ':', d.data().title));
  
  const hsk1Snap = await getDoc(doc(db, 'lessons', 'hsk1-l1'));
  if (hsk1Snap.exists()) {
    console.log('Sample lesson hsk1-l1 exists in Firestore! Title:', hsk1Snap.data().titleVi);
  } else {
    console.log('hsk1-l1 not found in Firestore');
  }
}

main().catch(console.error);

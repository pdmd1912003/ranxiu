import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { HSK2_LESSONS_1_TO_5 } from './data/hsk2Lessons1to5.mjs';
import { HSK2_LESSONS_6_TO_10 } from './data/hsk2Lessons6to10.mjs';
import { HSK2_LESSONS_11_TO_15 } from './data/hsk2Lessons11to15.mjs';

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

const allLessons = [
  ...HSK2_LESSONS_1_TO_5,
  ...HSK2_LESSONS_6_TO_10,
  ...HSK2_LESSONS_11_TO_15,
];

async function seed() {
  console.log(`[SEED] Bắt đầu đẩy dữ liệu HSK 2 lên Firestore... Tổng số bài học: ${allLessons.length}`);

  for (let i = 0; i < allLessons.length; i++) {
    const lesson = allLessons[i];
    console.log(`[SEED] [${i + 1}/${allLessons.length}] Đang tải lên bài: ${lesson.id} - ${lesson.titleVi}...`);
    const docRef = doc(db, 'lessons', lesson.id);
    await setDoc(docRef, lesson);
  }

  console.log(`[SEED] Đang cập nhật metadata cho cấp độ 'levels/hsk2'...`);
  const levelRef = doc(db, 'levels', 'hsk2');
  await setDoc(levelRef, {
    id: 'hsk2',
    code: '2级',
    title: 'New HSK 2 (新HSK教程2)',
    badge: 'Sơ cấp · 15 bài',
    status: 'Đang học',
    subtitle: '15 bài học toàn diện: 200+ từ mới, 45 điểm ngữ pháp Lớp học Tiểu Ngữ, 60 bài khóa & luyện viết chữ Hán.',
    bgIconColor: 'bg-[#DCFCE7]',
    tags: ['15 Bài Học', 'Từ vựng', 'Ngữ pháp', 'Bài khóa & Audio', 'Tập viết'],
    progressPercent: 100,
    updatedAt: Date.now(),
  });

  console.log(`[SEED] Hoàn tất 100% đồng bộ toàn bộ 15 bài HSK 2 lên Firestore!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

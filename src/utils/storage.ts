import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lesson, FlashCard, ReadingText, LevelId } from '../types';
import { INITIAL_LESSONS, LEVELS, NEW_HSK1_CHARACTERS } from '../data/curriculumData';

const STORAGE_KEY = 'ranxiu_custom_lessons_v3';
const IDB_NAME = 'ranxiu_audio_cache_v1';
const IDB_STORE = 'audio_files';
const CHUNK_CHAR_SIZE = 650000; // ~650KB per Firestore document (safely below 1MB Firestore limit & 950k rule limit)

// In-memory fast cache for resolved audio Data URIs keyed by mediaId (`${lessonId}_${targetId}`)
const audioMemoryCache = new Map<string, string>();

// In-memory authoritative lessons cache so consecutive edits/deletes never resurrect deleted items
// even if localStorage hits its 5MB quota or before Firestore snapshot round-trips
let lessonsMemoryCache: Lesson[] | null = null;

// ===============================================================
// IndexedDB Helper for Large Audio Files (Bypasses 5MB localStorage limit)
// ===============================================================

function openAudioIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveAudioToIDB(mediaId: string, dataUri: string): Promise<void> {
  audioMemoryCache.set(mediaId, dataUri);
  const idb = await openAudioIDB();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(dataUri, mediaId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function getAudioFromIDB(mediaId: string): Promise<string | null> {
  if (audioMemoryCache.has(mediaId)) {
    return audioMemoryCache.get(mediaId)!;
  }
  const idb = await openAudioIDB();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(mediaId);
      req.onsuccess = () => {
        const val = typeof req.result === 'string' ? req.result : null;
        if (val) audioMemoryCache.set(mediaId, val);
        resolve(val);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function removeAudioFromIDB(mediaId: string): Promise<void> {
  audioMemoryCache.delete(mediaId);
  const idb = await openAudioIDB();
  if (!idb) return;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(mediaId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Recursively strips `undefined` fields AND strips large inline `audioDataUri` from lesson documents
 * so `lessons/{lessonId}` never exceeds Firestore's 1MB limit or localStorage's 5MB limit.
 */
function sanitizeLessonForStorage(lesson: Lesson): Lesson {
  const copy: Lesson = JSON.parse(JSON.stringify(lesson));
  if (Array.isArray(copy.readingTexts)) {
    copy.readingTexts = copy.readingTexts.map((rt) => {
      const mediaId = `${copy.id}_${rt.id}`;
      // If there's a large inline data:audio URI, move it to cache and store the firestore:// reference
      if (rt.audioDataUri && rt.audioDataUri.startsWith('data:')) {
        audioMemoryCache.set(mediaId, rt.audioDataUri);
        saveAudioToIDB(mediaId, rt.audioDataUri);
        if (!rt.audioUrl) {
          rt.audioUrl = `firestore://audio_media/${mediaId}`;
        }
        delete rt.audioDataUri;
      }
      return rt;
    });
  }
  if (Array.isArray(copy.flashcards)) {
    copy.flashcards = copy.flashcards.map((fc) => {
      const mediaId = `${copy.id}_${fc.id}`;
      if (fc.audioDataUri && fc.audioDataUri.startsWith('data:')) {
        audioMemoryCache.set(mediaId, fc.audioDataUri);
        saveAudioToIDB(mediaId, fc.audioDataUri);
        if (!fc.customAudioUrl) {
          fc.customAudioUrl = `firestore://audio_media/${mediaId}`;
        }
        delete fc.audioDataUri;
      }
      return fc;
    });
  }
  return copy;
}

function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Saves a single lesson document to Cloud Firestore (`lessons/{lesson.id}`).
 */
export async function saveLessonToFirestore(lesson: Lesson): Promise<void> {
  try {
    const cleanLesson = sanitizeLessonForStorage({
      ...lesson,
      updatedAt: Date.now(),
    } as Lesson);
    await setDoc(doc(db, 'lessons', lesson.id), cleanLesson);
  } catch (err) {
    console.warn('Could not sync lesson to Firestore:', err);
  }
}

/**
 * Seeds all initial lessons, levels, and HSK1 character profiles into Cloud Firestore.
 */
export async function seedCurriculumToFirestore(
  lessonsToSeed: Lesson[] = INITIAL_LESSONS
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batch = writeBatch(db);

    for (const lvl of LEVELS) {
      const lvlRef = doc(db, 'levels', lvl.id);
      batch.set(lvlRef, sanitizeForFirestore(lvl), { merge: true });
    }

    for (const charProfile of NEW_HSK1_CHARACTERS) {
      const charRef = doc(db, 'characters', charProfile.id);
      batch.set(charRef, sanitizeForFirestore(charProfile), { merge: true });
    }

    for (const lesson of lessonsToSeed) {
      const lessonRef = doc(db, 'lessons', lesson.id);
      batch.set(
        lessonRef,
        sanitizeLessonForStorage({
          ...lesson,
          updatedAt: Date.now(),
        } as Lesson)
      );
    }

    await batch.commit();
    return { success: true, count: lessonsToSeed.length };
  } catch (err: any) {
    console.error('Error seeding curriculum to Firestore:', err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Không thể đồng bộ lên Firestore',
    };
  }
}

/**
 * Converts a File or Blob into a Base64 Data URI string.
 */
function blobToDataUri(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Uploads an audio file or recording to Firebase Cloud Firestore (`audio_media` collection)
 * using automatic multi-document chunking (supports MP3/WAV/M4A files even > 1MB!)
 * and caches in IndexedDB for instant playback.
 * Returns a persistent `firestore://audio_media/{mediaId}` URI stored on the reading text.
 */
export async function uploadAudioMediaToFirebase(
  fileOrBlob: File | Blob,
  fileName: string,
  _levelId: LevelId,
  lessonId: string,
  targetId: string,
  fallbackDataUri?: string
): Promise<string> {
  const dataUri = fallbackDataUri || (await blobToDataUri(fileOrBlob));
  if (!dataUri) {
    throw new Error('Không thể đọc dữ liệu file âm thanh.');
  }

  const mediaId = `${lessonId}_${targetId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const safeFileName = (fileName || 'audio.mp3').slice(0, 250);
  const mimeType = (fileOrBlob.type || 'audio/mpeg').slice(0, 90);

  // 1. Save immediately in Memory Cache & IndexedDB for zero-latency local playback
  await saveAudioToIDB(mediaId, dataUri);

  // 2. Split Data URI into 650KB chunks so each chunk is well below Firestore's 1MB document limit
  const chunks: string[] = [];
  for (let i = 0; i < dataUri.length; i += CHUNK_CHAR_SIZE) {
    chunks.push(dataUri.slice(i, i + CHUNK_CHAR_SIZE));
  }

  if (chunks.length > 25) {
    throw new Error('File âm thanh quá lớn (vui lòng chọn file dưới 12MB).');
  }

  // 3. Save main document `audio_media/{mediaId}` (contains chunk 0 and total chunk count)
  const now = Date.now();
  await setDoc(
    doc(db, 'audio_media', mediaId),
    sanitizeForFirestore({
      id: mediaId,
      lessonId: lessonId.slice(0, 120),
      targetId: targetId.slice(0, 150),
      targetType: `chunks:${chunks.length}`,
      fileName: safeFileName,
      mimeType,
      audioDataUri: chunks[0],
      updatedAt: now,
    })
  );

  // 4. Save any additional chunks `audio_media/{mediaId}_p1`, `_p2`, ... in parallel
  if (chunks.length > 1) {
    const partPromises: Promise<void>[] = [];
    for (let idx = 1; idx < chunks.length; idx++) {
      const partId = `${mediaId}_p${idx}`;
      partPromises.push(
        setDoc(
          doc(db, 'audio_media', partId),
          sanitizeForFirestore({
            id: partId,
            lessonId: lessonId.slice(0, 120),
            targetId: mediaId,
            targetType: `part:${idx}`,
            fileName: safeFileName,
            mimeType,
            audioDataUri: chunks[idx],
            updatedAt: now,
          })
        )
      );
    }
    await Promise.all(partPromises);
  }

  return `firestore://audio_media/${mediaId}`;
}

/**
 * Loads a custom audio track from Memory Cache -> IndexedDB -> Cloud Firestore `audio_media` (reassembling chunks).
 */
export async function loadCustomAudioData(
  lessonId: string,
  targetId: string,
  audioUrl?: string,
  audioDataUri?: string
): Promise<string | null> {
  // 1. Direct inline data: URI
  if (audioDataUri && audioDataUri.startsWith('data:')) {
    return audioDataUri;
  }

  // 2. External http(s) URL or local public path (e.g., /audio/...)
  if (audioUrl && !audioUrl.startsWith('firestore://')) {
    return audioUrl;
  }

  // 3. Determine mediaId for Firestore / IndexedDB lookup
  let mediaId = `${lessonId}_${targetId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  if (audioUrl && audioUrl.startsWith('firestore://audio_media/')) {
    mediaId = audioUrl.replace('firestore://audio_media/', '').trim();
  } else if (!audioUrl && !audioDataUri) {
    return null;
  }

  // 4. Check Memory Cache & IndexedDB first
  const cached = await getAudioFromIDB(mediaId);
  if (cached) {
    return cached;
  }

  // 5. Fetch from Cloud Firestore `audio_media/{mediaId}` and reassemble chunks if multi-part
  try {
    const mainSnap = await getDoc(doc(db, 'audio_media', mediaId));
    if (!mainSnap.exists()) {
      return null;
    }

    const mainData = mainSnap.data();
    const firstChunk: string = mainData.audioDataUri || '';
    const targetType: string = mainData.targetType || 'chunks:1';

    let totalChunks = 1;
    if (targetType.startsWith('chunks:')) {
      totalChunks = parseInt(targetType.split(':')[1], 10) || 1;
    }

    if (totalChunks <= 1) {
      await saveAudioToIDB(mediaId, firstChunk);
      return firstChunk;
    }

    const partSnaps = await Promise.all(
      Array.from({ length: totalChunks - 1 }, (_, i) =>
        getDoc(doc(db, 'audio_media', `${mediaId}_p${i + 1}`))
      )
    );

    const allParts = [firstChunk];
    for (const pSnap of partSnaps) {
      if (pSnap.exists() && pSnap.data().audioDataUri) {
        allParts.push(pSnap.data().audioDataUri);
      }
    }

    const fullDataUri = allParts.join('');
    await saveAudioToIDB(mediaId, fullDataUri);
    return fullDataUri;
  } catch (err) {
    console.warn('Error loading custom audio from Firestore:', err);
    return null;
  }
}

/**
 * Deletes custom audio from Memory Cache, IndexedDB, and Cloud Firestore `audio_media`.
 */
export async function deleteCustomAudioFromFirebase(
  lessonId: string,
  targetId: string,
  audioUrl?: string
): Promise<void> {
  let mediaId = `${lessonId}_${targetId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  if (audioUrl && audioUrl.startsWith('firestore://audio_media/')) {
    mediaId = audioUrl.replace('firestore://audio_media/', '').trim();
  }

  await removeAudioFromIDB(mediaId);

  try {
    const mainSnap = await getDoc(doc(db, 'audio_media', mediaId));
    if (mainSnap.exists()) {
      const targetType: string = mainSnap.data().targetType || 'chunks:1';
      let totalChunks = 1;
      if (targetType.startsWith('chunks:')) {
        totalChunks = parseInt(targetType.split(':')[1], 10) || 1;
      }
      await deleteDoc(doc(db, 'audio_media', mediaId));
      if (totalChunks > 1) {
        await Promise.all(
          Array.from({ length: totalChunks - 1 }, (_, i) =>
            deleteDoc(doc(db, 'audio_media', `${mediaId}_p${i + 1}`)).catch(() => {})
          )
        );
      }
    }
  } catch (err) {
    console.warn('Could not delete audio_media doc from Firestore:', err);
  }
}

/**
 * Real-time subscription to Cloud Firestore `lessons` collection.
 * Automatically seeds Firestore on first connect if the database is empty.
 */
export function subscribeToFirestoreLessons(
  onLessonsUpdate: (lessons: Lesson[]) => void,
  onSyncStatusChange?: (status: 'connecting' | 'connected' | 'seeding' | 'offline', detail?: string) => void
): () => void {
  onSyncStatusChange?.('connecting', 'Đang kết nối Cloud Firestore...');

  const lessonsCol = collection(db, 'lessons');

  const unsubscribe = onSnapshot(
    lessonsCol,
    async (snapshot) => {
      if (snapshot.empty) {
        onSyncStatusChange?.('seeding', 'Đang khởi tạo 15 bài HSK 1 & dữ liệu gốc lên Firebase...');
        const currentLocal = getAllLessons();
        const res = await seedCurriculumToFirestore(currentLocal);
        if (res.success) {
          onSyncStatusChange?.('connected', `Đã đồng bộ ${res.count} bài học lên Firebase Firestore`);
        } else {
          onSyncStatusChange?.('offline', res.error);
        }
        return;
      }

      const firestoreLessons: Lesson[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Lesson;
        if (data && data.id) {
          firestoreLessons.push(data);
        }
      });

      // Merge with INITIAL_LESSONS so any newly added lessons in code are also present
      const mergedMap = new Map<string, Lesson>();
      for (const initLes of INITIAL_LESSONS) {
        mergedMap.set(initLes.id, initLes);
      }
      for (const fsLes of firestoreLessons) {
        mergedMap.set(fsLes.id, fsLes);
      }

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        if (a.levelId !== b.levelId) {
          return a.levelId.localeCompare(b.levelId);
        }
        return (a.lessonNumber || 0) - (b.lessonNumber || 0);
      });

      saveLessonsToLocalCache(mergedList);
      onLessonsUpdate(mergedList);
      onSyncStatusChange?.('connected', `Đã đồng bộ Cloud Firestore (${mergedList.length} bài học)`);
    },
    (error) => {
      console.warn('Firestore real-time listener fallback to local cache:', error.message);
      onSyncStatusChange?.('offline', 'Đang dùng bộ nhớ đệm cục bộ');
    }
  );

  return unsubscribe;
}

export function getAllLessons(): Lesson[] {
  if (typeof window === 'undefined') return INITIAL_LESSONS;

  // Return authoritative in-memory cache if already loaded so deleted items never resurrect
  if (lessonsMemoryCache && lessonsMemoryCache.length > 0) {
    return lessonsMemoryCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      lessonsMemoryCache = INITIAL_LESSONS;
      return INITIAL_LESSONS;
    }
    const customLessons: Lesson[] = JSON.parse(raw);

    const merged = INITIAL_LESSONS.map((initLesson) => {
      const match = customLessons.find((c) => c.id === initLesson.id);
      if (match) {
        // Use match.flashcards as the authoritative list so deleted initial cards stay deleted!
        const finalFlashcards = Array.isArray(match.flashcards)
          ? match.flashcards.map((savedCard) => {
              const initCard = initLesson.flashcards.find((ic) => ic.id === savedCard.id);
              return initCard ? { ...initCard, ...savedCard } : savedCard;
            })
          : initLesson.flashcards;

        // Use match.readingTexts as the authoritative list so deleted reading texts stay deleted!
        const finalReadingTexts = Array.isArray(match.readingTexts)
          ? match.readingTexts.map((savedReading) => {
              const initReading = initLesson.readingTexts.find((ir) => ir.id === savedReading.id);
              return initReading ? { ...initReading, ...savedReading } : savedReading;
            })
          : initLesson.readingTexts;

        return {
          ...initLesson,
          ...match,
          flashcards: finalFlashcards,
          readingTexts: finalReadingTexts,
        };
      }
      return initLesson;
    });

    const brandNewLessons = customLessons.filter(
      (c) => !INITIAL_LESSONS.some((il) => il.id === c.id)
    );

    const finalResult = [...merged, ...brandNewLessons];
    lessonsMemoryCache = finalResult;
    return finalResult;
  } catch (e) {
    console.error('Failed to parse custom lessons from localStorage', e);
    lessonsMemoryCache = INITIAL_LESSONS;
    return INITIAL_LESSONS;
  }
}

function saveLessonsToLocalCache(lessons: Lesson[]): void {
  lessonsMemoryCache = lessons;
  if (typeof window === 'undefined') return;
  try {
    const sanitized = lessons.map((les) => sanitizeLessonForStorage(les));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('LocalStorage quota reached, relying on Firebase Firestore & IndexedDB:', e);
  }
}

export function saveLessonsToStorage(lessons: Lesson[]): void {
  saveLessonsToLocalCache(lessons);
  seedCurriculumToFirestore(lessons).catch((e) =>
    console.warn('Background Firestore sync warning:', e)
  );
}

export function addCustomReadingText(
  levelId: LevelId,
  lessonId: string,
  readingText: ReadingText
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        readingTexts: [readingText, ...les.readingTexts],
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  if (!targetLesson) {
    const newLesson: Lesson = {
      id: lessonId,
      levelId,
      lessonNumber: updatedLessons.filter((l) => l.levelId === levelId).length + 1,
      buoiNumber: updatedLessons.filter((l) => l.levelId === levelId).length + 1,
      durationMinutes: 40,
      status: 'active',
      titleVi: `Bài tự tạo: ${readingText.title}`,
      titleZh: readingText.titleZh || '自编课文',
      titlePinyin: readingText.titlePinyin || 'Zìbiān kèwén',
      shortDesc: readingText.summary || 'Bài khóa do giáo viên thiết kế.',
      pills: [
        { label: 'Flashcard', action: 'flashcard', color: 'pink' },
        { label: 'Bài khóa', action: 'reading', color: 'green' },
      ],
      flashcards: [],
      readingTexts: [readingText],
      isCustom: true,
    };
    updatedLessons.push(newLesson);
    targetLesson = newLesson;
  }

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function addCustomFlashcard(
  levelId: LevelId,
  lessonId: string,
  flashcard: FlashCard
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        flashcards: [...les.flashcards, flashcard],
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function updateFlashcard(
  levelId: LevelId,
  lessonId: string,
  cardId: string,
  updatedFields: Partial<FlashCard>
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        flashcards: les.flashcards.map((c) =>
          c.id === cardId ? { ...c, ...updatedFields } : c
        ),
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function deleteFlashcard(
  levelId: LevelId,
  lessonId: string,
  cardId: string
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        flashcards: les.flashcards.filter((c) => c.id !== cardId),
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function updateReadingText(
  levelId: LevelId,
  lessonId: string,
  textId: string,
  updatedFields: Partial<ReadingText>
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        readingTexts: les.readingTexts.map((r) =>
          r.id === textId ? { ...r, ...updatedFields } : r
        ),
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function deleteReadingText(
  levelId: LevelId,
  lessonId: string,
  textId: string
): Lesson[] {
  const allLessons = getAllLessons();
  let targetLesson: Lesson | null = null;

  const updatedLessons = allLessons.map((les) => {
    if (les.id === lessonId && les.levelId === levelId) {
      const updated = {
        ...les,
        readingTexts: les.readingTexts.filter((r) => r.id !== textId),
      };
      targetLesson = updated;
      return updated;
    }
    return les;
  });

  saveLessonsToLocalCache(updatedLessons);
  if (targetLesson) {
    saveLessonToFirestore(targetLesson);
  }
  return updatedLessons;
}

export function exportLessonsToJSON(lessons: Lesson[]): void {
  const jsonString = JSON.stringify(lessons, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ranxiu_GiaoAn_TiengTrung_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importLessonsFromJSON(file: File): Promise<Lesson[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          saveLessonsToStorage(parsed);
          resolve(getAllLessons());
        } else {
          reject(new Error('Định dạng tệp không hợp lệ. Phải là mảng danh sách bài học.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

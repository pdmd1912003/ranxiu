import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { YCT_LEVELS, ALL_YCT_LESSONS } from './yct1Data';

/**
 * Hệ thống lưu trữ & đồng bộ Đám mây Firebase Firestore + IndexedDB
 * dành riêng cho cổng YCT Kids (Tách biệt hoàn toàn với cổng HSK thông qua phân vùng `lessonId = 'yct_portal'`).
 * - Hỗ trợ lưu trữ & đồng bộ thời gian thực (real-time):
 *   1. Hình minh hoạ tuỳ chỉnh (Flashcard, Từ vựng, Hội thoại, Truyện, Nối từ, Bài thi mẫu)
 *   2. Audio hội thoại & Audio bài thi nghe (kèm tên file / bản thu âm giáo viên)
 *   3. Video bài hát (File tải lên hoặc link URL / YouTube)
 *   4. Cặp nối Hán tự & Hình minh hoạ do giáo viên thêm/sửa
 */

const DB_NAME = 'ranxiu_yct_media_db_v1';
const DB_VERSION = 1;
const STORE_MEDIA = 'yct_media_items';

const YCT_FIRESTORE_COLLECTION = 'audio_media';
const YCT_PARTITION_ID = 'yct_portal';
const CHUNK_CHAR_SIZE = 650000; // ~650KB/chunk (dưới giới hạn 1MB của Firestore & 950KB của firestore.rules)

export type YctFirebaseSyncStatus = 'connecting' | 'connected' | 'syncing' | 'offline';

export interface YctSongVideoItem {
  id: string;
  title: string;
  url: string; // DataURL, direct MP4 URL, or YouTube URL
  sourceType: 'file' | 'url';
  createdAt: number;
}

export interface YctCustomMatchingPair {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  emoji?: string;
  customImageKey: string; // Khoá trỏ tới ảnh trong images store
}

interface YctMediaState {
  images: Record<string, string>; // slotKey -> image URL / DataURL
  audios: Record<string, string>; // slotKey -> audio URL / DataURL
  audioNames: Record<string, string>; // slotKey -> tên hiển thị của file audio / bản thu âm
  songVideos: Record<string, YctSongVideoItem[]>; // songId -> danh sách video
  activeSongVideoId: Record<string, string>; // songId -> videoId đang chọn
  customMatchingPairs: Record<string, YctCustomMatchingPair[]>; // lessonId -> danh sách cặp nối Hán tự & Hình
  loaded: boolean;
  syncStatus: YctFirebaseSyncStatus;
  syncDetail: string;
}

const state: YctMediaState = {
  images: {},
  audios: {},
  audioNames: {},
  songVideos: {},
  activeSongVideoId: {},
  customMatchingPairs: {},
  loaded: false,
  syncStatus: 'connecting',
  syncDetail: 'Đang kết nối Firebase YCT...',
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function setSyncState(status: YctFirebaseSyncStatus, detail: string) {
  state.syncStatus = status;
  state.syncDetail = detail;
  notifyListeners();
}

function sanitizeMediaId(prefix: string, rawKey: string): string {
  const clean = rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  return `yct_${prefix}_${clean}`;
}

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE_MEDIA)) {
        idb.createObjectStore(STORE_MEDIA);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key: string, value: any): Promise<void> {
  try {
    const idb = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Không thể ghi vào IndexedDB:', e);
  }
}

async function dbGetAll(): Promise<Record<string, any>> {
  try {
    const idb = await openMediaDB();
    return await new Promise<Record<string, any>>((resolve, reject) => {
      const tx = idb.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const result: Record<string, any> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          result[String(cursor.key)] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch {
    return {};
  }
}

// ===============================================================
// Đồng bộ đa phần (Multi-chunk) lên Cloud Firestore
// ===============================================================

async function uploadChunkedPayloadToFirestore(
  mediaId: string,
  kind: 'img' | 'aud' | 'vid' | 'meta_pairs' | 'meta_videos' | 'curriculum',
  targetKey: string,
  payloadString: string,
  displayName?: string
): Promise<void> {
  if (!payloadString) return;

  const chunks: string[] = [];
  for (let i = 0; i < payloadString.length; i += CHUNK_CHAR_SIZE) {
    chunks.push(payloadString.slice(i, i + CHUNK_CHAR_SIZE));
  }

  if (chunks.length > 30) {
    console.warn('File quá lớn để đồng bộ Firestore (>18MB), chỉ lưu cục bộ IndexedDB.');
    return;
  }

  const now = Date.now();
  const safeTargetId = targetKey.slice(0, 150);
  const safeFileName = (displayName || targetKey || 'yct_media').slice(0, 250);

  await setDoc(doc(db, YCT_FIRESTORE_COLLECTION, mediaId), {
    id: mediaId,
    lessonId: YCT_PARTITION_ID,
    targetId: safeTargetId,
    targetType: `${kind}:${chunks.length}`,
    fileName: safeFileName,
    mimeType: `yct/${kind}`,
    audioDataUri: chunks[0],
    updatedAt: now,
  });

  if (chunks.length > 1) {
    const partPromises: Promise<void>[] = [];
    for (let idx = 1; idx < chunks.length; idx++) {
      const partId = `${mediaId}_p${idx}`;
      partPromises.push(
        setDoc(doc(db, YCT_FIRESTORE_COLLECTION, partId), {
          id: partId,
          lessonId: YCT_PARTITION_ID,
          targetId: mediaId,
          targetType: `part:${idx}`,
          fileName: safeFileName,
          mimeType: `yct/${kind}`,
          audioDataUri: chunks[idx],
          updatedAt: now,
        })
      );
    }
    await Promise.all(partPromises);
  }
}

async function deleteChunkedPayloadFromFirestore(mediaId: string): Promise<void> {
  try {
    const mainSnap = await getDoc(doc(db, YCT_FIRESTORE_COLLECTION, mediaId));
    if (mainSnap.exists()) {
      const targetType: string = mainSnap.data().targetType || '';
      const parts = targetType.split(':');
      const totalChunks = parseInt(parts[1], 10) || 1;
      await deleteDoc(doc(db, YCT_FIRESTORE_COLLECTION, mediaId));
      if (totalChunks > 1) {
        await Promise.all(
          Array.from({ length: totalChunks - 1 }, (_, i) =>
            deleteDoc(doc(db, YCT_FIRESTORE_COLLECTION, `${mediaId}_p${i + 1}`)).catch(() => {})
          )
        );
      }
    }
  } catch (err) {
    console.warn('Không thể xoá dữ liệu YCT trên Firestore:', err);
  }
}

let initPromise: Promise<void> | null = null;
let firestoreUnsubscribe: (() => void) | null = null;

function startFirestoreRealtimeSync() {
  if (firestoreUnsubscribe) return;

  try {
    const q = query(
      collection(db, YCT_FIRESTORE_COLLECTION),
      where('lessonId', '==', YCT_PARTITION_ID)
    );

    firestoreUnsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Tự động khởi tạo dữ liệu giáo trình YCT 1-6 và dữ liệu tuỳ chỉnh lên Firebase Cloud Firestore
          await syncAllYctMediaToFirebase();
          return;
        }

        const docsById = new Map<string, any>();
        snapshot.forEach((docSnap) => {
          docsById.set(docSnap.id, docSnap.data());
        });

        const reassembleDoc = (mainData: any): string => {
          const firstChunk: string = mainData.audioDataUri || '';
          const targetType: string = mainData.targetType || '';
          const totalChunks = parseInt(targetType.split(':')[1], 10) || 1;
          if (totalChunks <= 1) return firstChunk;

          const parts = [firstChunk];
          for (let i = 1; i < totalChunks; i++) {
            const pDoc = docsById.get(`${mainData.id}_p${i}`);
            if (pDoc && pDoc.audioDataUri) {
              parts.push(pDoc.audioDataUri);
            }
          }
          return parts.join('');
        };

        const remoteImages: Record<string, string> = { ...state.images };
        const remoteAudios: Record<string, string> = { ...state.audios };
        const remoteAudioNames: Record<string, string> = { ...state.audioNames };
        const remoteVideoBlobs: Record<string, string> = {};
        let remoteSongVideosMeta: Record<string, YctSongVideoItem[]> | null = null;
        let remoteActiveSongVideoId: Record<string, string> | null = null;
        let remoteMatchingPairs: Record<string, YctCustomMatchingPair[]> | null = null;

        for (const data of docsById.values()) {
          const tType: string = data.targetType || '';
          if (tType.startsWith('part:')) continue; // Bỏ qua các mảnh phụ, sẽ được ghép ở mảnh chính

          const fullPayload = reassembleDoc(data);
          const slotKey: string = data.targetId || '';

          if (tType.startsWith('img:') && slotKey && fullPayload) {
            remoteImages[slotKey] = fullPayload;
          } else if (tType.startsWith('aud:') && slotKey && fullPayload) {
            remoteAudios[slotKey] = fullPayload;
            if (data.fileName) {
              remoteAudioNames[slotKey] = data.fileName;
            }
          } else if (tType.startsWith('vid:') && slotKey && fullPayload) {
            remoteVideoBlobs[slotKey] = fullPayload;
          } else if (tType.startsWith('meta_pairs:') && fullPayload) {
            try {
              remoteMatchingPairs = JSON.parse(fullPayload) as Record<
                string,
                YctCustomMatchingPair[]
              >;
            } catch {
              //
            }
          } else if (tType.startsWith('meta_videos:') && fullPayload) {
            try {
              const parsed = JSON.parse(fullPayload);
              if (parsed.songVideos) {
                remoteSongVideosMeta = parsed.songVideos as Record<string, YctSongVideoItem[]>;
              }
              if (parsed.activeSongVideoId) {
                remoteActiveSongVideoId = parsed.activeSongVideoId as Record<string, string>;
              }
            } catch {
              //
            }
          }
        }

        state.images = remoteImages;
        state.audios = remoteAudios;
        state.audioNames = remoteAudioNames;

        if (remoteMatchingPairs) {
          state.customMatchingPairs = {
            ...state.customMatchingPairs,
            ...remoteMatchingPairs,
          };
        }

        if (remoteSongVideosMeta) {
          const hydratedVideos: Record<string, YctSongVideoItem[]> = { ...state.songVideos };
          for (const [songId, list] of Object.entries(remoteSongVideosMeta)) {
            hydratedVideos[songId] = list.map((item) => {
              if (item.url === `firestore_vid://${item.id}` && remoteVideoBlobs[item.id]) {
                return { ...item, url: remoteVideoBlobs[item.id] };
              }
              return item;
            });
          }
          state.songVideos = hydratedVideos;
        }

        if (remoteActiveSongVideoId) {
          state.activeSongVideoId = {
            ...state.activeSongVideoId,
            ...remoteActiveSongVideoId,
          };
        }

        await dbSet('images', state.images);
        await dbSet('audios', state.audios);
        await dbSet('audioNames', state.audioNames);
        await dbSet('songVideos', state.songVideos);
        await dbSet('activeSongVideoId', state.activeSongVideoId);
        await dbSet('customMatchingPairs', state.customMatchingPairs);

        if (!docsById.has('yct_curriculum_v1')) {
          uploadChunkedPayloadToFirestore(
            'yct_curriculum_v1',
            'curriculum',
            'yct1_to_yct6',
            JSON.stringify({
              levels: YCT_LEVELS,
              lessons: ALL_YCT_LESSONS,
              updatedAt: Date.now(),
            }),
            `Giáo trình YCT 1-6 (${ALL_YCT_LESSONS.length} bài YCT 1)`
          ).catch(() => {});
        }

        const totalSyncedItems =
          Object.keys(state.images).length +
          Object.keys(state.audios).length +
          Object.keys(state.songVideos).length +
          Object.keys(state.customMatchingPairs).length;

        setSyncState(
          'connected',
          totalSyncedItems > 0
            ? `Đã đồng bộ Cloud Firestore (${ALL_YCT_LESSONS.length} bài YCT + ${totalSyncedItems} mục)`
            : `Đã đồng bộ Cloud Firestore (${ALL_YCT_LESSONS.length} bài YCT)`
        );
      },
      (err) => {
        console.warn('Firebase YCT real-time listener fallback to IndexedDB:', err.message);
        setSyncState('offline', 'Đang dùng bộ nhớ cục bộ');
      }
    );
  } catch (err) {
    console.warn('Không thể khởi tạo đồng bộ Firebase YCT:', err);
    setSyncState('offline', 'Đang dùng bộ nhớ cục bộ');
  }
}

export function initYctMediaStore(): Promise<void> {
  if (state.loaded) {
    startFirestoreRealtimeSync();
    return Promise.resolve();
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const all = await dbGetAll();
    if (all.images) state.images = all.images;
    if (all.audios) state.audios = all.audios;
    if (all.audioNames) state.audioNames = all.audioNames;
    if (all.songVideos) state.songVideos = all.songVideos;
    if (all.activeSongVideoId) state.activeSongVideoId = all.activeSongVideoId;
    if (all.customMatchingPairs) state.customMatchingPairs = all.customMatchingPairs;
    state.loaded = true;
    notifyListeners();
    startFirestoreRealtimeSync();
  })();

  return initPromise;
}

/**
 * Đẩy toàn bộ dữ liệu tuỳ chỉnh của trang YCT (Hình ảnh, Audio hội thoại/bài thi, Video bài hát, Cặp nối từ) lên Firebase Firestore
 */
export async function syncAllYctMediaToFirebase(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  await initYctMediaStore();
  setSyncState('syncing', 'Đang đồng bộ dữ liệu YCT lên Firebase...');

  try {
    let count = 0;

    // 1. Đồng bộ toàn bộ Hình minh hoạ tuỳ chỉnh
    for (const [slotKey, imgData] of Object.entries(state.images)) {
      const mediaId = sanitizeMediaId('img', slotKey);
      await uploadChunkedPayloadToFirestore(mediaId, 'img', slotKey, imgData, slotKey);
      count++;
    }

    // 2. Đồng bộ toàn bộ Audio hội thoại & bài thi nghe
    for (const [slotKey, audData] of Object.entries(state.audios)) {
      const mediaId = sanitizeMediaId('aud', slotKey);
      const displayName = state.audioNames[slotKey] || slotKey;
      await uploadChunkedPayloadToFirestore(mediaId, 'aud', slotKey, audData, displayName);
      count++;
    }

    // 3. Đồng bộ danh sách Video bài hát
    if (Object.keys(state.songVideos).length > 0) {
      const serializedVideos: Record<string, YctSongVideoItem[]> = {};
      for (const [songId, list] of Object.entries(state.songVideos)) {
        serializedVideos[songId] = [];
        for (const v of list) {
          if (v.url.startsWith('data:')) {
            const vidMediaId = sanitizeMediaId('vid', v.id);
            await uploadChunkedPayloadToFirestore(vidMediaId, 'vid', v.id, v.url, v.title);
            serializedVideos[songId].push({
              ...v,
              url: `firestore_vid://${v.id}`,
            });
          } else {
            serializedVideos[songId].push(v);
          }
        }
      }

      const metaVidId = 'yct_meta_song_videos';
      await uploadChunkedPayloadToFirestore(
        metaVidId,
        'meta_videos',
        'song_videos',
        JSON.stringify({
          songVideos: serializedVideos,
          activeSongVideoId: state.activeSongVideoId,
        }),
        'YCT Song Videos Metadata'
      );
      count++;
    }

    // 4. Đồng bộ các cặp nối Hán tự & Hình minh hoạ
    if (Object.keys(state.customMatchingPairs).length > 0) {
      const metaPairsId = 'yct_meta_matching_pairs';
      await uploadChunkedPayloadToFirestore(
        metaPairsId,
        'meta_pairs',
        'matching_pairs',
        JSON.stringify(state.customMatchingPairs),
        'YCT Matching Pairs'
      );
      count++;
    }

    // 5. Đồng bộ giáo trình chuẩn YCT 1–6 (6 cấp độ & 12 bài học YCT 1) lên Firebase Cloud Firestore
    await uploadChunkedPayloadToFirestore(
      'yct_curriculum_v1',
      'curriculum',
      'yct1_to_yct6',
      JSON.stringify({
        levels: YCT_LEVELS,
        lessons: ALL_YCT_LESSONS,
        updatedAt: Date.now(),
      }),
      `Giáo trình YCT 1-6 (${ALL_YCT_LESSONS.length} bài YCT 1)`
    );

    setSyncState(
      'connected',
      `Đã đồng bộ Firebase YCT (${ALL_YCT_LESSONS.length} bài học${count > 0 ? ` + ${count} mục tuỳ chỉnh` : ''})`
    );
    return { success: true, count: ALL_YCT_LESSONS.length + count };
  } catch (err: any) {
    console.error('Lỗi đồng bộ YCT lên Firebase:', err);
    setSyncState('offline', 'Lỗi đồng bộ Firebase');
    return {
      success: false,
      count: 0,
      error: err?.message || 'Không thể đồng bộ lên Firebase Firestore',
    };
  }
}

/**
 * Chuyển đổi File sang DataURL để lưu bền vững vào IndexedDB & Firebase
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Lưu hoặc xoá Hình minh hoạ tuỳ chỉnh cho bất kỳ vị trí nào (slotKey) + Đồng bộ tức thì lên Firebase
 */
export async function setYctCustomImage(
  slotKey: string,
  imageUrlOrData: string | null
): Promise<void> {
  await initYctMediaStore();
  const nextImages = { ...state.images };
  const mediaId = sanitizeMediaId('img', slotKey);

  if (!imageUrlOrData) {
    delete nextImages[slotKey];
    state.images = nextImages;
    notifyListeners();
    await dbSet('images', nextImages);
    await deleteChunkedPayloadFromFirestore(mediaId);
  } else {
    nextImages[slotKey] = imageUrlOrData;
    state.images = nextImages;
    notifyListeners();
    await dbSet('images', nextImages);
    uploadChunkedPayloadToFirestore(mediaId, 'img', slotKey, imageUrlOrData, slotKey).catch((e) =>
      console.warn('Không thể đồng bộ ảnh YCT lên Firebase:', e)
    );
  }
}

export function getYctCustomImage(slotKey?: string, fallbackKey?: string): string | undefined {
  if (slotKey && state.images[slotKey]) return state.images[slotKey];
  if (fallbackKey && state.images[fallbackKey]) return state.images[fallbackKey];
  return undefined;
}

/**
 * Lưu hoặc xoá Audio tuỳ chỉnh (cho Hội thoại hoặc Bài thi nghe) + Đồng bộ tức thì lên Firebase
 */
export async function setYctCustomAudio(
  slotKey: string,
  audioUrlOrData: string | null,
  displayName?: string
): Promise<void> {
  await initYctMediaStore();
  const nextAudios = { ...state.audios };
  const nextNames = { ...state.audioNames };
  const mediaId = sanitizeMediaId('aud', slotKey);

  if (!audioUrlOrData) {
    delete nextAudios[slotKey];
    delete nextNames[slotKey];
    state.audios = nextAudios;
    state.audioNames = nextNames;
    notifyListeners();
    await dbSet('audios', nextAudios);
    await dbSet('audioNames', nextNames);
    await deleteChunkedPayloadFromFirestore(mediaId);
  } else {
    nextAudios[slotKey] = audioUrlOrData;
    const finalName = displayName || nextNames[slotKey] || slotKey;
    nextNames[slotKey] = finalName;
    state.audios = nextAudios;
    state.audioNames = nextNames;
    notifyListeners();
    await dbSet('audios', nextAudios);
    await dbSet('audioNames', nextNames);
    await uploadChunkedPayloadToFirestore(mediaId, 'aud', slotKey, audioUrlOrData, finalName);
  }
}

export function getYctCustomAudio(slotKey: string): string | undefined {
  return state.audios[slotKey];
}

export function getYctCustomAudioName(slotKey: string): string | undefined {
  return state.audioNames[slotKey];
}

async function syncSongVideosMetadataToFirebase() {
  try {
    const serializedVideos: Record<string, YctSongVideoItem[]> = {};
    for (const [sId, list] of Object.entries(state.songVideos)) {
      serializedVideos[sId] = list.map((v) =>
        v.url.startsWith('data:') ? { ...v, url: `firestore_vid://${v.id}` } : v
      );
    }
    await uploadChunkedPayloadToFirestore(
      'yct_meta_song_videos',
      'meta_videos',
      'song_videos',
      JSON.stringify({
        songVideos: serializedVideos,
        activeSongVideoId: state.activeSongVideoId,
      }),
      'YCT Song Videos Metadata'
    );
  } catch (e) {
    console.warn('Không thể đồng bộ metadata video YCT lên Firebase:', e);
  }
}

/**
 * Thêm Video mới cho Bài hát (từ File hoặc từ URL) + Đồng bộ lên Firebase
 */
export async function addYctSongVideo(
  songId: string,
  video: Omit<YctSongVideoItem, 'id' | 'createdAt'>
): Promise<YctSongVideoItem> {
  await initYctMediaStore();
  const newItem: YctSongVideoItem = {
    ...video,
    id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const existing = state.songVideos[songId] || [];
  const nextList = [...existing, newItem];
  state.songVideos = { ...state.songVideos, [songId]: nextList };
  state.activeSongVideoId = { ...state.activeSongVideoId, [songId]: newItem.id };
  notifyListeners();
  await dbSet('songVideos', state.songVideos);
  await dbSet('activeSongVideoId', state.activeSongVideoId);

  if (newItem.url.startsWith('data:')) {
    const vidMediaId = sanitizeMediaId('vid', newItem.id);
    uploadChunkedPayloadToFirestore(vidMediaId, 'vid', newItem.id, newItem.url, newItem.title).catch(
      (e) => console.warn('Không thể tải video lên Firestore:', e)
    );
  }
  syncSongVideosMetadataToFirebase();
  return newItem;
}

export async function selectYctSongVideo(songId: string, videoId: string): Promise<void> {
  await initYctMediaStore();
  state.activeSongVideoId = { ...state.activeSongVideoId, [songId]: videoId };
  notifyListeners();
  await dbSet('activeSongVideoId', state.activeSongVideoId);
  syncSongVideosMetadataToFirebase();
}

export async function removeYctSongVideo(songId: string, videoId: string): Promise<void> {
  await initYctMediaStore();
  const existing = state.songVideos[songId] || [];
  const nextList = existing.filter((v) => v.id !== videoId);
  state.songVideos = { ...state.songVideos, [songId]: nextList };
  if (state.activeSongVideoId[songId] === videoId) {
    state.activeSongVideoId = {
      ...state.activeSongVideoId,
      [songId]: nextList[0]?.id || '',
    };
  }
  notifyListeners();
  await dbSet('songVideos', state.songVideos);
  await dbSet('activeSongVideoId', state.activeSongVideoId);
  deleteChunkedPayloadFromFirestore(sanitizeMediaId('vid', videoId)).catch(() => {});
  syncSongVideosMetadataToFirebase();
}

/**
 * Quản lý các cặp nối "Hán tự - Hình minh hoạ" trong phần Cùng nối nhé + Đồng bộ lên Firebase
 */
export async function saveYctLessonMatchingPairs(
  lessonId: string,
  pairs: YctCustomMatchingPair[]
): Promise<void> {
  await initYctMediaStore();
  state.customMatchingPairs = {
    ...state.customMatchingPairs,
    [lessonId]: pairs,
  };
  notifyListeners();
  await dbSet('customMatchingPairs', state.customMatchingPairs);
  uploadChunkedPayloadToFirestore(
    'yct_meta_matching_pairs',
    'meta_pairs',
    'matching_pairs',
    JSON.stringify(state.customMatchingPairs),
    'YCT Matching Pairs'
  ).catch((e) => console.warn('Không thể đồng bộ cặp nối YCT lên Firebase:', e));
}

export async function resetYctLessonMatchingPairs(lessonId: string): Promise<void> {
  await initYctMediaStore();
  const next = { ...state.customMatchingPairs };
  delete next[lessonId];
  state.customMatchingPairs = next;
  notifyListeners();
  await dbSet('customMatchingPairs', state.customMatchingPairs);
  uploadChunkedPayloadToFirestore(
    'yct_meta_matching_pairs',
    'meta_pairs',
    'matching_pairs',
    JSON.stringify(state.customMatchingPairs),
    'YCT Matching Pairs'
  ).catch(() => {});
}

/**
 * Hook phản ứng tự động cập nhật giao diện khi giáo viên thêm/đổi Hình, Video, Audio hoặc đồng bộ từ Firebase
 */
export function useYctMediaStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    initYctMediaStore();
    const onUpdate = () => setTick((t) => t + 1);
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return {
    images: state.images,
    audios: state.audios,
    audioNames: state.audioNames,
    songVideos: state.songVideos,
    activeSongVideoId: state.activeSongVideoId,
    customMatchingPairs: state.customMatchingPairs,
    syncStatus: state.syncStatus,
    syncDetail: state.syncDetail,
    getCustomImage: getYctCustomImage,
    setCustomImage: setYctCustomImage,
    getCustomAudio: getYctCustomAudio,
    getCustomAudioName: getYctCustomAudioName,
    setCustomAudio: setYctCustomAudio,
    addSongVideo: addYctSongVideo,
    selectSongVideo: selectYctSongVideo,
    removeSongVideo: removeYctSongVideo,
    saveLessonMatchingPairs: saveYctLessonMatchingPairs,
    resetLessonMatchingPairs: resetYctLessonMatchingPairs,
    syncAllToFirebase: syncAllYctMediaToFirebase,
  };
}

/**
 * Trích xuất YouTube Embed URL nếu giáo viên dán link YouTube (youtube.com/watch?v=... hoặc youtu.be/...)
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
  } catch {
    //
  }
  return null;
}

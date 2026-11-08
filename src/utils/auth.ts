/**
 * Teacher Authentication & Access Control Service
 * Đồng bộ Cloud Firestore (ranxiu-hsk-app) cho phép duy nhất 1 giáo viên quản trị trên mọi thiết bị
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TeacherSession } from '../types';

const SESSION_STORAGE_KEY = 'ranxiu_teacher_session';
const CLOUD_CONFIG_CACHE_KEY = 'ranxiu_cloud_auth_cache';
const DEFAULT_SALT = 'ranxiu_salt_hsk_2026_teacher';

export const DEFAULT_TEACHER_NAME = 'Cô Nhiên Tú';
export const DEFAULT_TEACHER_PASS = 'ranxiu';

export interface TeacherAuthConfig {
  id: string; // 'teacher_auth'
  username: string; // Tên đăng nhập / danh xưng giáo viên
  passwordHash: string; // SHA-256 hash có muối
  updatedAt?: number;
}

/**
 * Băm mật khẩu an toàn với SHA-256 + Salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = `${password.trim()}:${DEFAULT_SALT}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(salted);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fb_${(hash >>> 0).toString(16)}`;
}

/**
 * Lấy cấu hình tài khoản giáo viên từ Cloud Firestore
 * (Đồng bộ mọi thiết bị, lưu cache local để offline fallback)
 */
export async function getCloudTeacherAuth(): Promise<TeacherAuthConfig> {
  try {
    const docRef = doc(db, 'system_config', 'teacher_auth');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as TeacherAuthConfig;
      if (typeof window !== 'undefined') {
        localStorage.setItem(CLOUD_CONFIG_CACHE_KEY, JSON.stringify(data));
      }
      return data;
    }

    // Nếu chưa khởi tạo trên Firestore lần nào, khởi tạo cấu hình ban đầu
    const initialHash = await hashPassword(DEFAULT_TEACHER_PASS);
    const initialConfig: TeacherAuthConfig = {
      id: 'teacher_auth',
      username: DEFAULT_TEACHER_NAME,
      passwordHash: initialHash,
      updatedAt: Date.now(),
    };

    try {
      await setDoc(docRef, initialConfig);
    } catch (e) {
      console.warn('Chưa thể ghi cấu hình mặc định lên Firestore (có thể do rules):', e);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(CLOUD_CONFIG_CACHE_KEY, JSON.stringify(initialConfig));
    }
    return initialConfig;
  } catch (err) {
    console.warn('Lỗi đọc cấu hình giáo viên từ Firestore, dùng cache:', err);
    // Thử lấy từ cache local
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CLOUD_CONFIG_CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // parse error
        }
      }
    }
    const fallbackHash = await hashPassword(DEFAULT_TEACHER_PASS);
    return {
      id: 'teacher_auth',
      username: DEFAULT_TEACHER_NAME,
      passwordHash: fallbackHash,
      updatedAt: Date.now(),
    };
  }
}

/**
 * Kiểm tra xem tài khoản & mật mã nhập vào có hợp lệ không
 */
export async function verifyTeacherCredentials(
  inputUsername: string,
  inputPassword: string
): Promise<{ isValid: boolean; message?: string; currentConfig?: TeacherAuthConfig }> {
  const userTrim = inputUsername.trim();
  const passTrim = inputPassword.trim();

  if (!userTrim) {
    return { isValid: false, message: 'Vui lòng nhập tên đăng nhập giáo viên!' };
  }
  if (!passTrim) {
    return { isValid: false, message: 'Vui lòng nhập mật mã truy cập!' };
  }

  const cloudConfig = await getCloudTeacherAuth();
  const inputHash = await hashPassword(passTrim);

  // So sánh tên đăng nhập (không phân biệt hoa thường, hoặc chấp nhận cả 'ranxiu')
  const isUsernameMatch =
    userTrim.toLowerCase() === cloudConfig.username.trim().toLowerCase() ||
    (cloudConfig.username === DEFAULT_TEACHER_NAME && userTrim.toLowerCase() === 'ranxiu');

  // So sánh mật khẩu băm
  const isPasswordMatch = inputHash === cloudConfig.passwordHash;

  if (!isUsernameMatch) {
    return { isValid: false, message: 'Tên đăng nhập giáo viên không chính xác!' };
  }
  if (!isPasswordMatch) {
    return { isValid: false, message: 'Mật mã truy cập không chính xác!' };
  }

  return { isValid: true, currentConfig: cloudConfig };
}

/**
 * Lấy phiên đăng nhập hiện tại từ trình duyệt
 */
export function getTeacherSession(): TeacherSession | null {
  if (typeof window === 'undefined') return null;

  try {
    let raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (!raw) return null;

    const session: TeacherSession = JSON.parse(raw);
    if (session && session.isAuthenticated && session.role === 'teacher') {
      return session;
    }
  } catch (e) {
    console.error('Lỗi phân tích phiên đăng nhập:', e);
  }
  return null;
}

/**
 * Đăng nhập giáo viên
 */
export async function loginTeacher(
  username: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; message: string; session?: TeacherSession }> {
  const check = await verifyTeacherCredentials(username, password);
  if (!check.isValid || !check.currentConfig) {
    return {
      success: false,
      message: check.message || 'Thông tin đăng nhập không hợp lệ!',
    };
  }

  const session: TeacherSession = {
    isAuthenticated: true,
    teacherName: check.currentConfig.username,
    role: 'teacher',
    loginAt: Date.now(),
    rememberMe,
  };

  const serialized = JSON.stringify(session);
  if (rememberMe) {
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return {
    success: true,
    message: `Chào mừng ${check.currentConfig.username} trở lại lớp học!`,
    session,
  };
}

/**
 * Cập nhật thông tin đăng nhập giáo viên (Lưu trực tiếp lên Cloud Firestore)
 */
export async function updateTeacherCredentials(
  currentPass: string,
  newPass?: string,
  newUsername?: string
): Promise<{ success: boolean; message: string; updatedUsername?: string }> {
  const cloudConfig = await getCloudTeacherAuth();
  const currentHash = await hashPassword(currentPass.trim());

  if (currentHash !== cloudConfig.passwordHash) {
    return {
      success: false,
      message: 'Mật khẩu hiện tại không chính xác. Không thể đổi thông tin!',
    };
  }

  const updatedConfig: TeacherAuthConfig = {
    ...cloudConfig,
    updatedAt: Date.now(),
  };

  if (newUsername && newUsername.trim()) {
    updatedConfig.username = newUsername.trim();
  }

  if (newPass && newPass.trim()) {
    if (newPass.trim().length < 4) {
      return {
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 4 ký tự!',
      };
    }
    updatedConfig.passwordHash = await hashPassword(newPass.trim());
  }

  try {
    const docRef = doc(db, 'system_config', 'teacher_auth');
    await setDoc(docRef, updatedConfig);

    if (typeof window !== 'undefined') {
      localStorage.setItem(CLOUD_CONFIG_CACHE_KEY, JSON.stringify(updatedConfig));

      // Cập nhật session nếu có
      const currentSession = getTeacherSession();
      if (currentSession) {
        currentSession.teacherName = updatedConfig.username;
        const serialized = JSON.stringify(currentSession);
        if (currentSession.rememberMe) {
          localStorage.setItem(SESSION_STORAGE_KEY, serialized);
        } else {
          sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
        }
      }
    }

    return {
      success: true,
      message: 'Đã cập nhật thông tin đăng nhập thành công trên hệ thống máy chủ!',
      updatedUsername: updatedConfig.username,
    };
  } catch (err: any) {
    console.error('Lỗi khi lưu lên Cloud Firestore:', err);
    return {
      success: false,
      message: err.message || 'Lỗi khi lưu thông tin lên Firebase!',
    };
  }
}

/**
 * Đăng xuất
 */
export function logoutTeacher(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Lấy tên giáo viên đã lưu (local cache)
 */
export function getSavedTeacherName(): string {
  if (typeof window === 'undefined') return DEFAULT_TEACHER_NAME;
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.username) return parsed.username;
    }
  } catch {
    //
  }
  return DEFAULT_TEACHER_NAME;
}

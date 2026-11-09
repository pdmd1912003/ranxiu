/**
 * Teacher Authentication & Access Control Service
 * Đồng bộ Cloud Firestore (ranxiu-hsk-app) cho phép duy nhất 1 giáo viên quản trị trên mọi thiết bị
 * Hỗ trợ 2 trang độc lập không tương tác với nhau: HSK (ranxiu_teacher_session) & YCT (ranxiu_yct_teacher_session)
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TeacherSession } from '../types';

const SESSION_STORAGE_KEY = 'ranxiu_teacher_session';
const YCT_SESSION_STORAGE_KEY = 'ranxiu_yct_teacher_session';
const ACTIVE_PORTAL_KEY = 'ranxiu_active_portal';
const CLOUD_CONFIG_CACHE_KEY = 'ranxiu_cloud_auth_cache';
const DEFAULT_SALT = 'ranxiu_salt_hsk_2026_teacher';

export type PortalType = 'hsk' | 'yct';

export const DEFAULT_TEACHER_NAME = 'Cô Nhiên Tú';
export const DEFAULT_TEACHER_PASS = 'ranxiu';

export interface TeacherAuthConfig {
  id: string; // 'teacher_auth'
  username: string; // Tên đăng nhập / danh xưng giáo viên
  passwordHash: string; // SHA-256 hash có muối
  updatedAt?: number;
}

export function getActivePortal(): PortalType | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(ACTIVE_PORTAL_KEY) || sessionStorage.getItem(ACTIVE_PORTAL_KEY);
  if (saved === 'hsk' || saved === 'yct') return saved;
  return null;
}

export function setActivePortal(portal: PortalType | null): void {
  if (typeof window === 'undefined') return;
  if (!portal) {
    localStorage.removeItem(ACTIVE_PORTAL_KEY);
    sessionStorage.removeItem(ACTIVE_PORTAL_KEY);
  } else {
    localStorage.setItem(ACTIVE_PORTAL_KEY, portal);
    sessionStorage.setItem(ACTIVE_PORTAL_KEY, portal);
  }
}

function getSessionKeyForPortal(portal: PortalType = 'hsk'): string {
  return portal === 'yct' ? YCT_SESSION_STORAGE_KEY : SESSION_STORAGE_KEY;
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
 * Lấy phiên đăng nhập hiện tại từ trình duyệt theo từng cổng độc lập (HSK hoặc YCT)
 */
export function getTeacherSession(portal: PortalType = 'hsk'): TeacherSession | null {
  if (typeof window === 'undefined') return null;

  const key = getSessionKeyForPortal(portal);
  try {
    let raw = localStorage.getItem(key);
    if (!raw) {
      raw = sessionStorage.getItem(key);
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
 * Đăng nhập giáo viên vào trang đã chọn (HSK hoặc YCT độc lập)
 */
export async function loginTeacher(
  username: string,
  password: string,
  rememberMe: boolean = true,
  portal: PortalType = 'hsk'
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

  const key = getSessionKeyForPortal(portal);
  const serialized = JSON.stringify(session);
  if (rememberMe) {
    localStorage.setItem(key, serialized);
  } else {
    sessionStorage.setItem(key, serialized);
    localStorage.removeItem(key);
  }
  setActivePortal(portal);

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

      // Cập nhật session nếu có ở cả 2 cổng
      (['hsk', 'yct'] as PortalType[]).forEach((portal) => {
        const currentSession = getTeacherSession(portal);
        if (currentSession) {
          currentSession.teacherName = updatedConfig.username;
          const key = getSessionKeyForPortal(portal);
          const serialized = JSON.stringify(currentSession);
          if (currentSession.rememberMe) {
            localStorage.setItem(key, serialized);
          } else {
            sessionStorage.setItem(key, serialized);
          }
        }
      });
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
 * Đăng xuất khỏi cổng hiện tại (hoặc tất cả)
 */
export function logoutTeacher(portal?: PortalType): void {
  if (typeof window === 'undefined') return;
  if (!portal || portal === 'hsk') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
  if (!portal || portal === 'yct') {
    localStorage.removeItem(YCT_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(YCT_SESSION_STORAGE_KEY);
  }
  setActivePortal(null);
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

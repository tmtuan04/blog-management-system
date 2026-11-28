import { Injectable } from '@angular/core';
import { TokenPair } from './auth.models';

/** Key trong localStorage (docs/phase-4-frontend.md mục 3.2, 7.2). Không thêm key khác. */
export const ACCESS_TOKEN_KEY = 'auth.accessToken';
export const REFRESH_TOKEN_KEY = 'auth.refreshToken';

/**
 * Đọc, ghi token trong localStorage. Mỗi lần đọc đều đọc lại localStorage (không giữ bản sao),
 * nên tab khác vừa refresh thì tab này thấy ngay token mới.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  get accessToken(): string | null {
    return read(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return read(REFRESH_TOKEN_KEY);
  }

  save(pair: TokenPair): void {
    write(ACCESS_TOKEN_KEY, pair.accessToken);
    write(REFRESH_TOKEN_KEY, pair.refreshToken);
  }

  clear(): void {
    remove(ACCESS_TOKEN_KEY);
    remove(REFRESH_TOKEN_KEY);
  }
}

// Trình duyệt chặn localStorage (ẩn danh, tắt cookie): coi như chưa đăng nhập, không làm app lỗi.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Bỏ qua: phiên chỉ còn trong bộ nhớ đến khi tải lại trang
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Bỏ qua
  }
}

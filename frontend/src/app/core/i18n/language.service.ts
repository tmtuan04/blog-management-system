import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../api/api.models';
import { unwrap } from '../api/unwrap';
import { Language } from '../models/language.model';
import {
  FALLBACK_LANG,
  I18nFile,
  fallbackFileFor,
  hasStaticFile,
} from './i18n-files';

/** Key trong localStorage (docs/phase-4-frontend.md mục 7.2). */
const STORAGE_KEY = 'lang';

/**
 * Ngôn ngữ đang chọn (UC09, docs/phase-4-frontend.md mục 3.4).
 *
 * - `current`: ngôn ngữ của **nội dung**, gửi lên API qua `Accept-Language`.
 * - `uiLang`: file dịch **chữ tĩnh** đang dùng. Bằng `current`, trừ khi ngôn ngữ đó chưa có file dịch.
 *
 * Màn có dữ liệu theo ngôn ngữ đọc API bằng `toObservable(language.current)` + `switchMap`,
 * nên đổi ngôn ngữ là tự gọi lại.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  private readonly currentCode = signal<string>(FALLBACK_LANG);
  private readonly uiFile = signal<I18nFile>(FALLBACK_LANG);
  private readonly activeLanguages = signal<Language[]>([]);
  /** Tăng mỗi lần đổi ngôn ngữ: bấm đổi liên tiếp thì chỉ lần cuối được áp dụng */
  private switchId = 0;

  /** Mã ngôn ngữ nội dung đang chọn, ví dụ `vi`. */
  readonly current = this.currentCode.asReadonly();
  /** Ngôn ngữ của chữ tĩnh đang hiện (`vi` hoặc `en`), dùng cho định dạng ngày giờ. */
  readonly uiLang = this.uiFile.asReadonly();
  /** Ngôn ngữ đang hoạt động, ngôn ngữ mặc định đứng đầu (thứ tự của API). Rỗng nếu chưa tải được. */
  readonly languages = this.activeLanguages.asReadonly();
  readonly defaultLanguage = computed(
    () => this.activeLanguages().find((lang) => lang.isDefault) ?? null,
  );

  /**
   * Chạy trong provideAppInitializer, trước `AuthService.init()`.
   * Chọn ngôn ngữ: đã lưu (còn hoạt động) → theo trình duyệt → mặc định.
   * Đã lưu nhưng ngôn ngữ đã bị tắt thì về mặc định (UC09).
   */
  async init(): Promise<void> {
    const languages = await firstValueFrom(this.fetchLanguages());
    if (languages) this.activeLanguages.set(languages);
    await this.apply(this.pickInitial());
  }

  /** Đổi ngôn ngữ (bộ chọn trên header, dòng "Bài viết này có ở các ngôn ngữ"). */
  async use(code: string): Promise<void> {
    if (!this.isSelectable(code)) return;
    writeStored(code);
    await this.apply(code);
  }

  /**
   * Tải lại danh sách sau khi admin sửa ngôn ngữ (UC16), để bộ chọn trên header cập nhật ngay.
   * Ngôn ngữ đang chọn vừa bị tắt thì về mặc định.
   */
  async reload(): Promise<void> {
    const languages = await firstValueFrom(this.fetchLanguages());
    if (!languages) return;
    this.activeLanguages.set(languages);
    if (this.isSelectable(this.currentCode())) {
      await this.apply(this.currentCode()); // ngôn ngữ mặc định có thể đổi → file dự phòng đổi
      return;
    }
    removeStored();
    await this.apply(this.defaultCode());
  }

  private pickInitial(): string {
    const stored = readStored();
    if (stored) {
      if (this.isSelectable(stored)) return stored;
      removeStored();
      return this.defaultCode();
    }
    const browser = (this.document.defaultView?.navigator.languages ?? [])
      .map((tag) => tag.split('-')[0].toLowerCase())
      .find((code) => this.isSelectable(code));
    return browser ?? this.defaultCode();
  }

  /** Chưa tải được danh sách ngôn ngữ (lỗi mạng) thì chỉ nhận ngôn ngữ có file dịch. */
  private isSelectable(code: string): boolean {
    const languages = this.activeLanguages();
    if (languages.length === 0) return hasStaticFile(code);
    return languages.some((lang) => lang.code === code);
  }

  private defaultCode(): string {
    return this.defaultLanguage()?.code ?? FALLBACK_LANG;
  }

  private async apply(code: string): Promise<void> {
    const id = ++this.switchId;
    const fallback = fallbackFileFor(this.defaultLanguage()?.code ?? null);
    const file = hasStaticFile(code) ? code : fallback;
    try {
      if (this.translate.getFallbackLang() !== fallback) {
        await firstValueFrom(this.translate.setFallbackLang(fallback));
      }
      await firstValueFrom(this.translate.use(file));
    } catch {
      // File dịch lỗi: vẫn đổi ngôn ngữ nội dung, chữ tĩnh hiện key cho đến khi tải lại
    }
    if (id !== this.switchId) return;
    this.document.documentElement.lang = code;
    this.uiFile.set(file);
    this.currentCode.set(code);
  }

  /** `null` nếu lỗi: giữ danh sách cũ. Lỗi mạng đã có toast của errorInterceptor. */
  private fetchLanguages(): Observable<Language[] | null> {
    return this.http.get<ApiResponse<Language[]>>('/languages').pipe(
      unwrap(),
      catchError(() => of(null)),
    );
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Trình duyệt chặn localStorage: vẫn đổi được, chỉ không nhớ khi tải lại
  }
}

function removeStored(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Bỏ qua
  }
}

import { provideApiTesting } from '../testing/provide-api-testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Language } from '../models/language.model';
import { LanguageService } from './language.service';

const VI: Language = { code: 'vi', name: 'Tiếng Việt', isDefault: true };
const EN: Language = { code: 'en', name: 'English', isDefault: false };
const ok = <T>(data: T) => ({ success: true, message: 'OK', data });

describe('LanguageService', () => {
  let service: LanguageService;
  let backend: HttpTestingController;
  let translate: TranslateService;

  function browserLanguages(tags: string[]): void {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(tags);
  }

  /** Gọi init(), trả danh sách ngôn ngữ cho GET /languages */
  async function initWith(
    languages: Language[] | 'network-error',
  ): Promise<void> {
    const done = service.init();
    const req = backend.expectOne('/api/v1/languages');
    if (languages === 'network-error') req.error(new ProgressEvent('error'));
    else req.flush(ok(languages));
    await done;
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    browserLanguages([]);
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(LanguageService);
    backend = TestBed.inject(HttpTestingController);
    translate = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('chọn ngôn ngữ lần đầu (init)', () => {
    it('đã lưu và còn hoạt động: dùng ngôn ngữ đã lưu', async () => {
      localStorage.setItem('lang', 'en');
      browserLanguages(['vi-VN']);
      await initWith([VI, EN]);

      expect(service.current()).toBe('en');
      expect(service.uiLang()).toBe('en');
      expect(translate.getCurrentLang()).toBe('en');
      expect(document.documentElement.lang).toBe('en');
    });

    it('chưa lưu: theo trình duyệt (en-US → en)', async () => {
      browserLanguages(['en-US', 'en']);
      await initWith([VI, EN]);
      expect(service.current()).toBe('en');
    });

    it('chưa lưu, trình duyệt dùng ngôn ngữ không có: về ngôn ngữ mặc định', async () => {
      browserLanguages(['fr-FR', 'ja']);
      await initWith([VI, EN]);
      expect(service.current()).toBe('vi');
    });

    it('ngôn ngữ mặc định không phải vi thì về đúng ngôn ngữ mặc định', async () => {
      browserLanguages(['fr-FR']);
      await initWith([
        { ...EN, isDefault: true },
        { ...VI, isDefault: false },
      ]);
      expect(service.current()).toBe('en');
      expect(service.defaultLanguage()?.code).toBe('en');
    });

    it('đã lưu nhưng ngôn ngữ đã bị tắt: về mặc định (không theo trình duyệt), xóa giá trị đã lưu', async () => {
      localStorage.setItem('lang', 'en');
      browserLanguages(['en-US']);
      await initWith([VI]); // en đã bị tắt

      expect(service.current()).toBe('vi');
      expect(localStorage.getItem('lang')).toBeNull();
    });

    it('không tải được danh sách ngôn ngữ: vẫn dùng ngôn ngữ đã lưu nếu có file dịch', async () => {
      localStorage.setItem('lang', 'en');
      await initWith('network-error');
      expect(service.current()).toBe('en');
      expect(service.languages()).toEqual([]);
    });

    it('không tải được danh sách, chưa lưu, trình duyệt không khớp: về vi', async () => {
      browserLanguages(['fr-FR']);
      await initWith('network-error');
      expect(service.current()).toBe('vi');
    });
  });

  describe('use(code)', () => {
    beforeEach(() => initWith([VI, EN]));

    it('lưu localStorage, đổi chữ tĩnh, <html lang> và Accept-Language của request sau', async () => {
      await service.use('en');

      expect(localStorage.getItem('lang')).toBe('en');
      expect(service.current()).toBe('en');
      expect(translate.getCurrentLang()).toBe('en');
      expect(document.documentElement.lang).toBe('en');

      TestBed.inject(HttpClient).get('/posts').subscribe();
      const req = backend.expectOne('/api/v1/posts');
      expect(req.request.headers.get('Accept-Language')).toBe('en');
      req.flush(ok([]));
    });

    it('ngôn ngữ không hoạt động: bỏ qua', async () => {
      await service.use('fr');
      expect(service.current()).toBe('vi');
      expect(localStorage.getItem('lang')).toBeNull();
    });
  });

  it('ngôn ngữ nội dung chưa có file dịch: nội dung theo ngôn ngữ đó, chữ tĩnh dùng file của ngôn ngữ mặc định', async () => {
    const JA: Language = { code: 'ja', name: '日本語', isDefault: false };
    await initWith([VI, EN, JA]);
    await service.use('ja');

    expect(service.current()).toBe('ja');
    expect(service.uiLang()).toBe('vi');
    expect(translate.getCurrentLang()).toBe('vi');
    expect(document.documentElement.lang).toBe('ja');
  });

  describe('reload() sau khi admin sửa ngôn ngữ (UC16)', () => {
    beforeEach(async () => {
      await initWith([VI, EN]);
      await service.use('en');
    });

    it('cập nhật danh sách cho bộ chọn trên header', async () => {
      const JA: Language = { code: 'ja', name: '日本語', isDefault: false };
      const done = service.reload();
      backend.expectOne('/api/v1/languages').flush(ok([VI, EN, JA]));
      await done;

      expect(service.languages().map((l) => l.code)).toEqual([
        'vi',
        'en',
        'ja',
      ]);
      expect(service.current()).toBe('en');
    });

    it('ngôn ngữ đang chọn vừa bị tắt: về mặc định', async () => {
      const done = service.reload();
      backend.expectOne('/api/v1/languages').flush(ok([VI]));
      await done;

      expect(service.current()).toBe('vi');
      expect(localStorage.getItem('lang')).toBeNull();
    });

    it('lỗi khi tải lại: giữ danh sách và ngôn ngữ cũ', async () => {
      const done = service.reload();
      backend.expectOne('/api/v1/languages').error(new ProgressEvent('error'));
      await done;

      expect(service.languages()).toEqual([VI, EN]);
      expect(service.current()).toBe('en');
    });
  });
});

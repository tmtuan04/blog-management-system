import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { registerAppLocales } from '../../core/i18n/locale';
import { LocalDatePipe } from './local-date.pipe';

describe('LocalDatePipe', () => {
  const uiLang = signal<'vi' | 'en'>('vi');
  let pipe: LocalDatePipe;
  // Giờ máy người xem, để test không phụ thuộc múi giờ của máy chạy test
  const date = new Date(2026, 9, 12, 21, 15);

  beforeAll(() => registerAppLocales());

  beforeEach(() => {
    uiLang.set('vi');
    TestBed.configureTestingModule({
      providers: [{ provide: LanguageService, useValue: { uiLang } }],
    });
    pipe = TestBed.runInInjectionContext(() => new LocalDatePipe());
  });

  it('vi: ngày và ngày giờ như phase 2', () => {
    expect(pipe.transform(date)).toBe('12/10/2026');
    expect(pipe.transform(date, 'datetime')).toBe('12/10/2026 21:15');
  });

  it('en: dùng tên tháng', () => {
    uiLang.set('en');
    expect(pipe.transform(date)).toBe('Oct 12, 2026');
    expect(pipe.transform(date, 'datetime')).toBe('Oct 12, 2026, 21:15');
  });

  it('đổi ngôn ngữ thì định dạng lại', () => {
    expect(pipe.transform(date)).toBe('12/10/2026');
    uiLang.set('en');
    expect(pipe.transform(date)).toBe('Oct 12, 2026');
  });

  it('nhận chuỗi ISO của API', () => {
    expect(pipe.transform(date.toISOString())).toBe('12/10/2026');
  });

  it('null, rỗng thì trả chuỗi rỗng', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});

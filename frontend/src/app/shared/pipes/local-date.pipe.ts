import { formatDate } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { DATE_FORMATS, DateStyle } from '../../core/i18n/locale';

/**
 * Hiện ngày giờ API trả (ISO 8601 UTC) theo giờ máy người xem và ngôn ngữ đang chọn (mục 3.1).
 * Đổi ngôn ngữ thì tự định dạng lại.
 *
 * @example <time [attr.datetime]="post.publishedAt">{{ post.publishedAt | localDate }}</time>
 * @example {{ comment.createdAt | localDate: 'datetime' }}
 */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);
  // Pipe không thuần (để đổi theo ngôn ngữ) chạy lại mỗi lần render: nhớ kết quả gần nhất
  private last: { key: string; result: string } | null = null;

  transform(
    value: string | Date | null | undefined,
    style: DateStyle = 'date',
  ): string {
    if (value === null || value === undefined || value === '') return '';
    const locale = this.language.uiLang();
    const key = `${value instanceof Date ? value.toISOString() : value}|${style}|${locale}`;
    if (this.last?.key === key) return this.last.result;
    const result = formatDate(value, DATE_FORMATS[locale][style], locale);
    this.last = { key, result };
    return result;
  }
}

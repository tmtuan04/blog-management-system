import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

/**
 * Đặt `<title>` dạng `Tên trang · Inkwell` như phase 2.
 *
 * Route có tiêu đề cố định khai báo key dịch: `{ path: 'login', title: 'auth.login.title' }`,
 * TranslatedTitleStrategy tự dịch và dịch lại khi đổi ngôn ngữ.
 * Màn có tiêu đề theo dữ liệu (chi tiết bài, trang tĩnh) không khai báo `title` trên route,
 * gọi `pageTitle.set(post.title)` sau khi tải xong (tải lại khi đổi ngôn ngữ thì gọi lại).
 */
@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  /** @param text chữ đã dịch hoặc dữ liệu từ API. Rỗng thì chỉ hiện tên site. */
  set(text: string): void {
    const site = this.translate.instant('common.site_name') as string;
    this.title.setTitle(text ? `${text} · ${site}` : site);
  }
}

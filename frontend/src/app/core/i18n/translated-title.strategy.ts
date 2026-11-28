import { DestroyRef, Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PageTitle } from './page-title.service';

/**
 * `title` trên route là key dịch (mục 3.6). Dịch theo ngôn ngữ đang chọn và dịch lại khi đổi ngôn ngữ.
 * Route không có `title` thì chỉ hiện tên site, component tự đặt bằng `PageTitle.set()`.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly translate = inject(TranslateService);
  private readonly pageTitle = inject(PageTitle);
  private key: string | undefined;

  constructor() {
    super();
    const sub = this.translate.onLangChange.subscribe(() => {
      // Route không có key: giữ tiêu đề component đã đặt
      if (this.key) this.render(this.key);
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key = this.buildTitle(snapshot);
    if (this.key) this.render(this.key);
    else this.pageTitle.set('');
  }

  private render(key: string): void {
    this.pageTitle.set(this.translate.instant(key) as string);
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PageTitle } from './page-title.service';
import { TranslatedTitleStrategy } from './translated-title.strategy';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankComponent {}

describe('TranslatedTitleStrategy', () => {
  let translate: TranslateService;
  let title: Title;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'login',
            title: 'auth.login.title',
            component: BlankComponent,
          },
          { path: 'posts/:slug', component: BlankComponent },
        ]),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
        provideTranslateService(),
      ],
    });
    translate = TestBed.inject(TranslateService);
    title = TestBed.inject(Title);
    translate.setTranslation('vi', {
      common: { site_name: 'Inkwell' },
      auth: { login: { title: 'Đăng nhập' } },
    });
    translate.setTranslation('en', {
      common: { site_name: 'Inkwell' },
      auth: { login: { title: 'Sign in' } },
    });
    await firstValueFrom(translate.use('vi'));
  });

  it('dịch key trên route, thêm tên site như phase 2', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(title.getTitle()).toBe('Đăng nhập · Inkwell');
  });

  it('đổi ngôn ngữ thì dịch lại', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    await firstValueFrom(translate.use('en'));
    expect(title.getTitle()).toBe('Sign in · Inkwell');
  });

  it('route không có title: giữ tiêu đề component đặt, kể cả khi đổi ngôn ngữ', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/posts/hello');
    expect(title.getTitle()).toBe('Inkwell');

    TestBed.inject(PageTitle).set('Hello world');
    await firstValueFrom(translate.use('en'));
    expect(title.getTitle()).toBe('Hello world · Inkwell');
  });
});

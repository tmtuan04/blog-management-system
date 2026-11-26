# Phase 4 - Xây dựng frontend (Angular)

| Mục | Nội dung |
| --- | --- |
| Phiên bản | 1.0 (theo requirements 2.2) |
| Ngày tạo | 26/11/2026 |
| Thời gian | ~2,5 tuần (13 ngày làm việc, 30/11 - 16/12/2026) |
| Phân công | A ~45%, B ~40%, C ~15% (mục 8) |
| Đầu vào | [requirements.md](requirements.md) (mục 1.5 - Phase 4, mục 3 - 7), [phase-2-html.md](phase-2-html.md) (mục 5 - danh sách màn, mục 7 - quy ước), thư mục `html/` (markup, SCSS, file dịch `html/i18n/`), [phase-3-backend.md](phase-3-backend.md) (mục 3 - format response, mục 4 - danh sách API), Swagger tại `/api-docs` |
| Đầu ra | Thư mục `frontend/`: ứng dụng Angular chạy với backend ở local, mọi use case Must chạy được từ giao diện |

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

- Chuyển mọi màn HTML của phase 2 thành component Angular, nối với API thật của phase 3.
- Chạy được trọn vẹn mọi use case Must từ giao diện, từ đầu đến cuối: UC01-UC09, UC11, UC13-UC16, UC18. Làm thêm Should (UC10, UC12, UC19, UC20) nếu còn thời gian; UC10 và UC12 đã có giao diện sẵn nên nên làm luôn.
- Giao diện giữ nguyên như phase 2: cùng bộ SCSS, cùng class, cùng câu chữ. Phase 4 không thiết kế lại.
- Chữ tĩnh đổi theo ngôn ngữ đang chọn bằng file JSON của frontend (requirements D5), nội dung đổi theo `Accept-Language` gửi lên API (UC09).
- Validate ở frontend bằng Angular Validators (requirements 6.1), lỗi hiện ngay dưới ô nhập, có trạng thái loading và thông báo thành công/lỗi (requirements 6.3).

### 1.2. Bắt đầu khi phase 3 chưa đóng

Ngày 26/11, phase 3 còn B6 (trang tĩnh UC11, UC18), C3 (kiểm tra tổng) và A8 (hoàn thiện, merge `dev` → `master`). Để không mất thời gian:

- A bắt đầu A1 (khung Angular) từ 30/11. A8 của phase 3 làm xen vào khi C3 merge.
- B làm xong B6 backend trước, rồi mới nhận việc phase 4. C làm xong C3 phase 3 trong lúc chờ A1 merge. Đằng nào B và C cũng phải chờ A1.
- Màn trang tĩnh (B6 phase 4) chờ B6 backend merge.
- Phase 3 vẫn phải đạt hết điều kiện hoàn thành của nó. Phase 4 chỉ được tính là xong sau khi phase 3 đã xong.

### 1.3. Những gì nhận lại từ phase 2 và phase 3

| Từ | Nhận | Dùng ở phase 4 |
| --- | --- | --- |
| `html/scss/` | Design tokens, theme sáng/tối, layout, component | Chép vào `frontend/src/styles/` ở A1 (mục 3.7) |
| `html/public/`, `html/admin/` | Markup từng màn, khối bọc `<!-- component: ... -->`, các trạng thái demo | Cắt thành component theo mục 5 |
| `html/i18n/vi.json`, `en.json` | ~360 key chữ tĩnh | Chép vào `frontend/public/i18n/` ở A1 (mục 3.4) |
| `html/js/theme.js` | Đổi sáng/tối không nháy màu | Chuyển thành `ThemeService` + script chặn trong `index.html` (C1) |
| `html/js/multi-select.js`, `translation-tabs.js`, `post-preview.js`, `post-language-select.js` | Hành vi của form bài viết | Viết lại bằng Angular trong A5, chỉ giữ markup và class |
| `invalid-feedback` trong HTML | Câu báo lỗi validate | Key `validation.*`, cùng câu với message của DTO backend |
| Backend | Format response, `code` lỗi, bảng route | Mục 3.1, 3.3 và cột "API" ở mục 4 |

`html/js/demo-state.js`, thanh demo và mọi thuộc tính `data-demo*` **không** chuyển sang Angular: trạng thái demo thành trạng thái thật của component (mục 5).

---

## 2. Công cụ và cấu trúc thư mục

### 2.1. Công cụ

| Thành phần | Lựa chọn |
| --- | --- |
| Framework | Angular CLI bản ổn định mới nhất lúc tạo project, khóa major trong `package.json`. TypeScript strict, `strictTemplates` |
| Kiểu component | Standalone component, chia theo tính năng: mỗi khu vực một thư mục trong `features/`, nạp lười bằng `loadChildren` (Q1, mục 10) |
| Trạng thái | Signals trong service (`signal`, `computed`). Không dùng NgRx |
| Gọi API | `HttpClient` + functional interceptor |
| Form | Reactive Forms (`FormBuilder`, `Validators`) |
| CSS | Bootstrap 5.3.8 (khóa đúng bản như `html/`), SCSS, Bootstrap Icons |
| Component Bootstrap (dropdown, modal, offcanvas, tooltip, tab) | `@ng-bootstrap/ng-bootstrap`, bản khớp major của Angular (Q3). Không nạp `bootstrap.bundle.js` |
| Đa ngôn ngữ | `@ngx-translate/core` + `@ngx-translate/http-loader`, đổi ngôn ngữ lúc chạy, không build lại (Q2) |
| Rich text editor | Tiptap (`@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-image`) bọc trong một component tự viết (mục 3.8, Q4) |
| Font | Google Fonts `Inter`, `Source Serif 4`, nạp trong `index.html` như phase 2 |
| Chạy dev | `ng serve` cổng 4200, `proxy.conf.json` chuyển `/api` và `/uploads` về `http://localhost:3000` |
| Test | Test runner mặc định của Angular CLI (`ng test`) |
| Code style | `angular-eslint` + Prettier, cùng cấu hình Prettier với backend |

Dev dùng proxy để trình duyệt chỉ thấy một origin (`localhost:4200`), giống phase 5 khi Nginx phục vụ cả bản build lẫn `/api`. Nhờ vậy đường dẫn ảnh `uploads/...` và link OAuth `/api/v1/auth/google` chạy giống nhau ở dev và trên máy ảo. `FRONTEND_URL` của backend giữ `http://localhost:4200` (link đặt lại mật khẩu, chuyển hướng OAuth).

### 2.2. Cấu trúc thư mục

```text
frontend/
├── angular.json
├── package.json
├── proxy.conf.json                # /api, /uploads → http://localhost:3000
├── public/
│   ├── i18n/                      # vi.json, en.json: chép từ html/i18n/ ở A1, từ đó là nguồn chuẩn
│   └── favicon.ico
├── scripts/
│   └── check-i18n.mjs             # npm run i18n:check (mục 3.4)
└── src/
    ├── index.html                 # Font, script chặn đặt data-bs-theme (UC10)
    ├── main.ts
    ├── styles.scss                # Điểm vào SCSS, thứ tự import như html/scss/main.scss
    ├── styles/                    # abstracts, themes, base, layouts, components: chép từ html/scss/
    ├── environments/
    └── app/
        ├── app.config.ts          # provideRouter, provideHttpClient(withInterceptors), translate, khởi tạo phiên
        ├── app.routes.ts          # Route gốc, nạp lười từng khu vực
        ├── core/                  # Dùng một lần cho cả app, không chứa giao diện
        │   ├── api/               # ApiResponse<T>, Paginated<T>, ApiError, hàm unwrap
        │   ├── auth/              # AuthService, TokenStorage, authGuard, guestGuard, roleGuard
        │   ├── i18n/              # LanguageService, loader, map mã lỗi → key
        │   ├── interceptors/      # api-url, language, auth, refresh, error
        │   ├── theme/             # ThemeService (C1)
        │   └── models/            # Kiểu dữ liệu theo response DTO của backend
        ├── shared/                # Component, pipe, directive dùng ở nhiều khu vực
        │   ├── components/        # post-card, pagination, confirm-dialog, empty-state, toast, rich-text-editor...
        │   ├── forms/             # field-error, setServerErrors(), validator dùng chung
        │   └── pipes/             # uploadUrl, relativeDate...
        ├── layouts/               # public-layout, auth-layout, admin-layout, editor-layout
        └── features/
            ├── home/              # UC05 (C)
            ├── posts/             # UC06 (A), comments UC08 (B)
            ├── categories/        # UC07 (C)
            ├── search/            # UC19 (A)
            ├── pages/             # UC11 (B)
            ├── auth/              # UC01-UC04, UC20 (A)
            ├── profile/           # UC12 (B)
            ├── errors/            # 404, 403
            └── admin/
                ├── posts/         # UC13 (A)
                ├── users/         # UC14 (B)
                ├── categories/    # UC15 (B)
                ├── languages/     # UC16 (B)
                └── pages/         # UC18 (B)
```

Mỗi khu vực trong `features/` có file route riêng, component màn hình, service gọi API và kiểu dữ liệu của khu vực đó:

```text
features/admin/categories/
├── categories.routes.ts           # export default Routes, nạp lười từ app.routes.ts
├── categories-page.component.ts   # Màn danh sách (html, scss cạnh file ts)
├── category-form-modal.component.ts
├── admin-categories.service.ts    # Gọi /admin/categories, trả Observable đã unwrap
└── admin-categories.models.ts
```

---

## 3. Khung Angular (A phụ trách, việc A1)

Các phần trong mục này là phần nền. Sửa phần nền (`core/`, `shared/`, `layouts/`, `styles/abstracts|themes|layouts`) thì A phải duyệt PR.

### 3.1. Gọi API và kiểu dữ liệu

- `apiUrlInterceptor` thêm `/api/v1` trước đường dẫn tương đối. Service chỉ viết `this.http.get('/posts')`.
- Kiểu chung trong `core/api/`:

  ```ts
  interface ApiResponse<T> { success: true; message: string; data: T; meta?: PageMeta }
  interface PageMeta { page: number; limit: number; total: number; totalPages: number }
  interface Paginated<T> { items: T[]; meta: PageMeta }
  interface ApiError { status: number; code: string; message: string; errors: { field: string; message: string }[] }
  ```

- Service khu vực dùng `unwrap()` (lấy `data`) hoặc `unwrapPage()` (lấy `{ items: data, meta }`). Component không đọc `success`, `message` của response.
- Kiểu dữ liệu viết tay theo response DTO trong Swagger, đặt trong `*.models.ts` của khu vực; kiểu dùng ở nhiều khu vực (`AuthUser`, `PostCard`, `Language`) đặt trong `core/models/`. Tên field giữ đúng camelCase của API.
- Ngày giờ API trả ISO 8601 UTC. Hiển thị bằng `DatePipe` theo locale của ngôn ngữ đang chọn, đăng ký `registerLocaleData` cho `vi` và `en`.
- Danh sách phân trang đọc và ghi `page` cùng các bộ lọc lên query string của URL (`/admin/posts?status=draft&page=2`), để tải lại trang và nút Back giữ đúng trang.

### 3.2. Xác thực và phân quyền

Theo Q1 của phase 3: refresh token gửi qua body, frontend lưu `localStorage`.

| Phần | Cách làm |
| --- | --- |
| Lưu token | `TokenStorage` ghi `accessToken`, `refreshToken` vào `localStorage` (key `auth.accessToken`, `auth.refreshToken`) |
| Trạng thái phiên | `AuthService.user` là signal `AuthUser \| null` (`id`, `fullName`, `email`, `avatar`, `role`). `isLoggedIn`, `role`, `canWrite` (Blog Owner, Super Admin), `isSuperAdmin` là `computed` |
| Khởi động app | `provideAppInitializer`: có `refreshToken` thì gọi `GET /auth/me` trước khi router chạy, để guard và header biết role ngay. Lỗi thì xóa token, coi như khách |
| Gửi token | `authInterceptor` thêm `Authorization: Bearer <accessToken>` cho mọi request tới `/api` (route public có `optionalAuth` như `/posts/:slug` cần token để biết quyền xóa bình luận) |
| Hết hạn | `refreshInterceptor`: gặp 401 có `code: TOKEN_EXPIRED` thì gọi `POST /auth/refresh` **một lần** cho mọi request đang chờ (dùng chung một Observable), lưu cặp token mới, gửi lại request cũ. Refresh lỗi thì xóa token, chuyển `/login?returnUrl=<url hiện tại>` (UC02) |
| Nhiều tab | Refresh token xoay vòng nên hai tab cùng refresh thì một tab bị 401. Trước khi refresh đọc lại `localStorage` (tab khác có thể vừa đổi token); nghe sự kiện `storage` để đồng bộ đăng nhập, đăng xuất giữa các tab |
| Bị khóa | 403 `ACCOUNT_LOCKED` ở bất kỳ request nào: xóa phiên, chuyển `/login`, hiện `error.account_locked` |
| Đăng xuất (UC04) | `POST /auth/logout` với `refreshToken`. Thành công hay lỗi đều xóa token và chuyển `/` |

Guard (functional, khai báo trong route):

| Guard | Dùng cho | Không đạt |
| --- | --- | --- |
| `authGuard` | `/profile`, `/admin/**` | `/login?returnUrl=...` |
| `guestGuard` | `/login`, `/register`, `/forgot-password`, `/reset-password` | `/` |
| `roleGuard` + `data: { roles: [...] }` | `/admin/posts/**`: `blog_owner`; `/admin/users`, `categories`, `languages`, `pages`: `super_admin` | Màn 403 (mục 3.6) |

`roleGuard` kế thừa role giống backend: `super_admin` qua mọi `roles`, `blog_owner` qua `user`. Guard chỉ để giao diện hợp lý; quyền thật do backend kiểm tra (403 từ API vẫn phải xử lý).

### 3.3. Xử lý lỗi

`errorInterceptor` chuyển mọi `HttpErrorResponse` thành `ApiError` (lỗi mạng hoặc không có body: `status: 0`, `code: 'NETWORK_ERROR'`). Mỗi loại lỗi có một chỗ xử lý:

| Lỗi | Xử lý ở | Hiện gì |
| --- | --- | --- |
| 400 `VALIDATION_ERROR` có `errors[]` | Component có form, gọi `setServerErrors(form, err)` | Lỗi dưới đúng ô nhập. `field` dạng `translation.title`, `names.vi`, `translations.en.title` map sang đường dẫn control; field thuộc tab khác thì đánh dấu tab đó |
| 401 `TOKEN_EXPIRED` | `refreshInterceptor` (mục 3.2) | Không hiện gì nếu refresh thành công |
| 401 khác, 403 `ACCOUNT_LOCKED` | Interceptor | Chuyển `/login` kèm thông báo |
| 403 `FORBIDDEN` khi mở màn (ví dụ sửa bài của người khác, UC13) | Component màn hình | Màn 403 tại chỗ, giữ nguyên URL |
| 404 khi mở màn có slug, key, id | Component màn hình | Màn 404 tại chỗ, giữ nguyên URL (UC06, UC11) |
| 409, 400 có mã nghiệp vụ (`CATEGORY_IN_USE`, `LANGUAGE_IN_USE`, `LAST_SUPER_ADMIN`, `RESET_TOKEN_INVALID`...) | Component | Toast hoặc `.alert-inline` theo màn HTML phase 2 |
| 429 | Component có form | `.alert-inline` với `auth.error.too_many_attempts` hoặc `error.too_many_requests` |
| 0, 500 | Interceptor | Toast `error.network` / `error.internal_error` |

**Câu thông báo theo ngôn ngữ đang chọn** (Q2 của phase 3): backend trả `message` tiếng Việt và `code`. Frontend không hiện `message` của backend mà tra key:

- Lỗi chung theo `code`: key `error.<code viết thường>`, ví dụ `CATEGORY_IN_USE` → `error.category_in_use`. A1 thêm đủ key cho mọi mã trong `backend/src/common/errors.ts`. Key `auth.error.*` có sẵn từ phase 2 giữ nguyên cho màn đăng nhập.
- Lỗi theo field: Validators của frontend bắt trước gần hết lỗi, câu lấy từ `validation.*`. Lỗi chỉ backend biết (email đã tồn tại, mật khẩu hiện tại sai, mã ngôn ngữ trùng) map theo cặp màn + field sang key `validation.*` trong component đó. Không có key thì hiện `message` của backend (Q5).

### 3.4. Đa ngôn ngữ (UC09, D5)

**Chữ tĩnh**

- A1 chép `html/i18n/vi.json`, `en.json` vào `frontend/public/i18n/`. Từ đó file trong `frontend/` là nguồn chuẩn của Angular. Phase 2 còn sửa theo góp ý của mentor: PR sửa câu hoặc thêm key ở `html/i18n/` thì sửa luôn file tương ứng trong `frontend/public/i18n/`.
- Template dùng pipe: `{{ 'menu.home' | translate }}`, thuộc tính `[placeholder]="'search.placeholder' | translate"`, có tham số `{{ 'admin.posts.count' | translate: { n: total } }}`. Không viết chữ tĩnh thẳng trong template hay trong TypeScript.
- Danh sách file dịch có sẵn khai báo trong `core/i18n/i18n-files.ts` (`['vi', 'en']`), để không gọi file không tồn tại.
- Ngôn ngữ dự phòng (thiếu key hoặc chưa có file, UC16): ngôn ngữ mặc định nếu có file, không thì `vi`.
- `npm run i18n:check` (A1 viết `scripts/check-i18n.mjs`): báo key dùng trong template mà không có trong `vi.json`, key có trong `vi.json` mà thiếu trong `en.json`. Chạy trước mỗi PR.

**Ngôn ngữ của nội dung**

`LanguageService` (A1) giữ `current` (signal mã ngôn ngữ) và `languages` (danh sách từ `GET /languages`):

| Lúc | Làm gì |
| --- | --- |
| Khởi động | Đọc `localStorage` key `lang`. Chưa có thì lấy `navigator.languages` nếu có trong danh sách đang hoạt động, không thì lấy ngôn ngữ `isDefault` (UC09). Mã đã lưu nhưng ngôn ngữ đã bị tắt thì về mặc định |
| Mọi request | `languageInterceptor` gửi `Accept-Language: <current>` |
| Đổi ngôn ngữ (`use(code)`) | Ghi `localStorage`, `translate.use(code)`, đặt `<html lang>`, cập nhật `current` |
| Sau khi đổi | Màn hình nào hiện nội dung theo ngôn ngữ thì tự tải lại (xem dưới). Header, footer tải lại danh mục và danh sách trang tĩnh |
| Admin sửa ngôn ngữ (UC16) | Gọi `languageService.reload()` để bộ chọn trên header cập nhật ngay |

Màn có dữ liệu theo ngôn ngữ đọc API bằng `toObservable(language.current)` kết hợp với tham số route rồi `switchMap`, nên đổi ngôn ngữ là tự gọi lại. Hai màn có slug phụ thuộc ngôn ngữ xử lý riêng (UC09):

- Chi tiết bài `/posts/:slug`: lấy slug mới trong `availableLanguages` của bài đang xem; không có bản dịch ở ngôn ngữ mới thì chuyển `/`.
- Danh mục `/categories/:slug`: lấy slug mới trong `translations` của danh mục, rồi chuyển route.

### 3.5. Giao diện sáng/tối (UC10, C làm ở C1)

- Chép đoạn đặt `data-bs-theme` của `html/js/theme.js` thành script chặn trong `<head>` của `src/index.html`, để không nháy màu khi tải trang.
- `ThemeService`: signal `theme`, `toggle()`, ghi `localStorage` key `theme` (cùng key với phase 2), lần đầu theo `prefers-color-scheme`.
- Nút đổi theme là component dùng chung, đặt trên header public, header admin, offcanvas mobile và thanh trên màn soạn bài.

### 3.6. Layout và route

| Layout | Dùng cho | Từ phase 2 |
| --- | --- | --- |
| `public-layout` | Trang đọc, tìm kiếm, trang tĩnh, hồ sơ, 404 | `_templates/public.html`: header (2 biến thể khách / đã đăng nhập thành `@if`), offcanvas mobile, footer |
| `auth-layout` | Đăng nhập, đăng ký, quên/đặt lại mật khẩu, OAuth callback | `_templates/auth.html` |
| `admin-layout` | Mọi màn `/admin` trừ màn soạn bài | `_templates/admin.html`: sidebar hiện mục theo role |
| `editor-layout` | `/admin/posts/new`, `/admin/posts/:id/edit` | `layouts/_editor.scss`, thanh trên tối giản |

Header hiện theo trạng thái phiên (requirements, phase 2 mục 4.1): nút "Viết bài" khi `canWrite`; mục "Trang quản trị" khi `isSuperAdmin`; menu "Giới thiệu" và link footer lấy từ `GET /pages`, trang bị ẩn thì không hiện link (UC11).

Route `**` dùng màn 404. Màn 403 dùng lại khối `.not-found` với mã 403 và key `error.forbidden_*` (A1 thêm key).

Router bật `withComponentInputBinding()` (tham số route vào thẳng `input()` của component), `withInMemoryScrolling({ scrollPositionRestoration: 'top' })`. Mỗi màn đặt `<title>` qua `TitleStrategy` có dịch.

### 3.7. SCSS và component dùng chung

**SCSS**

- A1 chép `html/scss/` (trừ `components/_demo-state.scss`) vào `frontend/src/styles/`, `styles.scss` import theo đúng thứ tự của `html/scss/main.scss`. Bootstrap import từ `node_modules` (`stylePreprocessorOptions.includePaths`).
- SCSS dùng chung nằm ở `src/styles/`, không chuyển vào `styles` của từng component, để class giống hệt phase 2. File `.scss` riêng của component chỉ dùng khi có style thật sự chỉ của component đó.
- Phase 2 sửa SCSS theo góp ý của mentor thì sửa cả hai nơi trong cùng PR, cho đến khi phase 2 đóng (Q6).

**Component trong `shared/` (A1 làm, trừ toast)**

| Component | Từ phase 2 | Ghi chú |
| --- | --- | --- |
| `post-card` | `.post-card` (`--compact`, `--grid`, `--skeleton`) | Input `post: PostCard`, `variant`. Dùng ở trang chủ, danh mục, tìm kiếm, bài liên quan, sidebar |
| `pagination` | `.pagination-bar` | Input `meta: PageMeta`, output `pageChange`. Ẩn khi `totalPages <= 1` |
| `confirm-dialog` | Hộp xác nhận xóa của `admin/posts.html` | `confirm.open({ title, message, confirmText, danger, action })` trả `Promise<boolean>`. Có `action` (Observable) thì giữ modal mở, nút có spinner đến khi xong (trạng thái "đang xóa" của phase 2) |
| `empty-state` | `.empty-state` | Input icon, key tiêu đề, key mô tả, slot nút |
| `field-error` | `invalid-feedback` | Nhận control, hiện câu `validation.*` theo lỗi đầu tiên, hoặc lỗi server |
| `submit-button` | Nút có `spinner-border-sm` + "Đang lưu..." | Input `loading`, chữ khi loading |
| `avatar` | `.avatar`, `--initials` | Chưa có ảnh thì hiện chữ cái đầu của tên |
| `language-switcher` | Bộ chọn `[VI ▾]` | Khung do A1 đặt trên header; C4 làm hành vi |
| `theme-toggle` | `.theme-toggle` | C1 làm |
| `toast` + `ToastService` | `.toast-container`, `.toast__icon` | C1 làm. `toast.success(key, params?)`, `toast.error(key)` |
| `rich-text-editor` | `.editor` | A4 làm (mục 3.8) |
| `thumb-upload` | `.thumb-upload` | A5 làm, B1 dùng lại cho avatar nếu hợp |

Pipe `uploadUrl`: đổi đường dẫn API trả (`uploads/images/<uuid>.webp`) thành URL hiển thị (`/uploads/images/<uuid>.webp`). `null` thì component tự hiện ảnh thay thế hoặc ẩn khối ảnh.

### 3.8. Rich text editor (A phụ trách, việc A4)

Dùng ở form bài viết (UC13) và form sửa trang tĩnh (UC18).

- Giữ nguyên giao diện `.editor` của phase 2: thanh công cụ H2, H3, đậm, nghiêng, gạch chân, danh sách có/không thứ tự, trích dẫn, link, ảnh; vùng soạn dùng `.prose`; placeholder là input của component (bài viết dùng `admin.editor.placeholder`, trang tĩnh dùng `admin.page_edit.content_placeholder`, như phase 2).
- Là `ControlValueAccessor`: dùng `formControlName="content"` như ô nhập thường. Giá trị là chuỗi HTML; rỗng thì `''` để `Validators.required` bắt được (một `<p></p>` trống tính là rỗng).
- Chỉ bật những định dạng nằm trong danh sách thẻ backend cho phép (phase 3 mục 3.7): `p, h2, h3, strong, em, u, ul, ol, li, blockquote, a, img, pre, code, br`. Thẻ ngoài danh sách bị backend bỏ khi lưu nên nội dung sẽ khác lúc soạn.
- Link: chỉ nhận `http://`, `https://`, `mailto:`.
- Ảnh: bấm nút ảnh → chọn file → kiểm tra đuôi `jpg/jpeg/png/webp` và ≤ 2MB ở frontend → `POST /uploads/images` → chèn `<img src="/uploads/images/...">`. Trong lúc upload hiện trạng thái `.editor__upload` của phase 2. Lỗi thì hiện dòng lỗi dưới editor.
- Hiển thị nội dung bài và trang tĩnh bằng `[innerHTML]` trong khối `.prose`. Không dùng `bypassSecurityTrustHtml`: backend đã lọc, Angular lọc thêm một lớp.
- Bình luận là văn bản thuần: hiện bằng `{{ }}` (không bao giờ `innerHTML`), xuống dòng bằng `white-space: pre-line`.

### 3.9. Form

- Reactive Forms, kiểu chặt (`FormBuilder.nonNullable`). Ràng buộc giống DTO backend (độ dài, định dạng email, mật khẩu có chữ và số, xác nhận trùng khớp): validator dùng chung đặt ở `shared/forms/validators.ts`.
- Hiện lỗi khi ô đã chạm hoặc đã bấm gửi: `[class.is-invalid]` + `field-error`. Bấm gửi khi form sai thì `markAllAsTouched()` và đặt focus vào ô lỗi đầu tiên.
- Đang gửi: khóa nút gửi (`submit-button`), không khóa cả form. Không cho gửi hai lần.
- Thành công: toast hoặc `.alert-inline--success` theo màn HTML phase 2.

---

## 4. Danh sách màn hình

Cột "Người" theo requirements mục 1.4 và mục 8.3. Cột "API" là route ở phase-3-backend.md mục 4 (bỏ prefix `/api/v1`). "Trạng thái" là cột "Trạng thái bắt buộc" của phase-2-html.md mục 5: mỗi trạng thái demo phải thành trạng thái thật.

### 4.1. Trang đọc blog

| Route | UC | Người | Từ HTML | API | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `/` | UC05 | C | `public/index.html` | `GET /posts?page=`, `/posts/popular`, `/categories` | Chip danh mục, thẻ bài, phân trang, sidebar "Đọc nhiều nhất". Loading dùng `post-card--skeleton`, rỗng "Chưa có bài viết ở ngôn ngữ này" |
| `/categories/:slug` | UC07 | C | `public/category.html` | `GET /categories/:slug`, `/categories/:slug/posts` | Chip đang chọn được tô. Đổi ngôn ngữ thì đổi slug (mục 3.4). Không có → 404 |
| `/posts/:slug` | UC06 | A | `public/post-detail.html` | `GET /posts/:slug`, `/posts/:slug/related` | Dòng "Bài viết này có ở các ngôn ngữ": bấm thì `language.use(code)` rồi chuyển slug tương ứng. Khối bình luận là component của B (UC08). Không có → 404 |
| (khối trong `/posts/:slug`) | UC08 | B | khu bình luận của `post-detail.html` | `GET`, `POST /post-translations/:id/comments`, `DELETE /comments/:id` | Input `translationId`. Khách thấy "Đăng nhập để bình luận" (link `/login?returnUrl=`). Trả lời 1 cấp: bình luận trả lời không có nút "Trả lời". Nút xóa theo `canDelete`, xác nhận bằng `confirm-dialog`. Gửi xong thêm vào danh sách, không tải lại cả trang. Nội dung hiện bằng văn bản thuần |
| `/search?q=` | UC19 | A | `public/search.html` | `GET /search?q=&page=` | Ô tìm trên header chuyển tới đây. Từ khóa trim, < 2 hoặc > 100 ký tự thì báo lỗi ngay, không gọi API |
| `/pages/:key` | UC11 | B | `public/page.html` | `GET /pages/:key` | Trang ẩn hoặc key sai → 404. Link header, footer lấy từ `GET /pages` (A1 đặt chỗ, B6 nối) |
| `**` | | A | `public/404.html` | | |

### 4.2. Tài khoản

| Route | UC | Người | Từ HTML | API | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `/login` | UC02, UC20 | A | `public/login.html` | `POST /auth/login` | **Màn mẫu form** (A1). Sai → `auth.error.invalid_credentials` (một câu chung), khóa → `auth.error.account_locked`, 429 → `auth.error.too_many_attempts`. Thành công: lưu token, về `returnUrl` hoặc `/`. Có `?registered=1` thì hiện thông báo đăng ký thành công. Có `?oauthError=<code>` thì hiện lỗi OAuth |
| (header) | UC04 | A | menu avatar | `POST /auth/logout` | Làm cùng A1 |
| `/register` | UC01 | A | `public/register.html` | `POST /auth/register` | 409 → lỗi dưới ô email. Thành công → `/login?registered=1` |
| `/forgot-password` | UC03 | A | `public/forgot-password.html` | `POST /auth/forgot-password` | Luôn hiện cùng một câu "Nếu email tồn tại..." |
| `/reset-password?token=` | UC03 | A | `public/reset-password.html` | `POST /auth/reset-password` | `RESET_TOKEN_INVALID` → trạng thái token hết hạn, nút gửi lại yêu cầu. Thiếu `token` trên URL cũng hiện trạng thái đó |
| (nút OAuth) | UC20 | A | `login.html`, `register.html` | `GET /auth/google`, `/auth/github` | Thẻ `<a href="/api/v1/auth/google">`, chuyển trang thật, không gọi bằng `HttpClient` |
| `/oauth/callback` | UC20 | A | (không có, dùng `auth-layout` + spinner) | `POST /auth/oauth/exchange` | Có `?code=` thì đổi lấy token rồi về `/`. Có `?error=` hoặc đổi mã lỗi thì `/login?oauthError=<code>` |
| `/profile` | UC12 | B | `public/profile.html` | `GET`, `PATCH /profile`, `POST /profile/avatar`, `PATCH /profile/password` | `hasPassword = false` thì ẩn ô mật khẩu cũ. Chọn ảnh là upload ngay, kiểm tra đuôi và 2MB trước. Đổi tên hoặc avatar thì cập nhật `AuthService.user` để header đổi theo. Đổi mật khẩu thành công thì mọi refresh token bị thu hồi: báo thành công rồi đăng xuất, chuyển `/login` |

### 4.3. Quản lý bài viết (A, quyền `blog_owner`)

| Route | Từ HTML | API | Ghi chú |
| --- | --- | --- | --- |
| `/admin/posts` | `admin/posts.html` | `GET /admin/posts`, `DELETE /admin/posts/:id` | **Màn mẫu danh sách admin** (A2). Tab trạng thái, lọc ngôn ngữ, danh mục, ô tìm (debounce 300ms), tất cả ghi lên query string. Xóa qua `confirm-dialog` có `action`, xong toast và tải lại trang hiện tại (trang trống thì lùi một trang) |
| `/admin/posts/new` | `admin/post-create.html` | `POST /uploads/images`, `POST /admin/posts`, `POST /admin/posts/:id/translations` | Luồng "Lưu" theo phase-3-backend.md mục 4.5: tạo bài + bản gốc trước; lỗi thì đánh dấu tab bản gốc. Thành công thì lưu từng bản dịch, rồi chuyển màn sửa bài; bản dịch lỗi thì báo "Đã lưu bài, N bản dịch chưa lưu được" và giữ nội dung đã nhập. Ô "Bản dịch" chỉ có ngôn ngữ đang hoạt động khác ngôn ngữ gốc. Xem trước desktop/mobile như phase 2 |
| `/admin/posts/:id/edit` | `admin/post-edit.html` | `GET`, `PATCH /admin/posts/:id`, `POST`, `PATCH`, `DELETE /admin/posts/:id/translations/:code` | Phần dùng chung lưu riêng với từng tab. Tab chưa có bản dịch: "Thêm bản dịch" điền sẵn nội dung bản gốc. Không có nút xóa ở tab bản gốc. Sửa tiêu đề thì slug đổi: cập nhật slug chỉ đọc từ response. 403 → màn 403, 404 → màn 404. Rời màn khi còn thay đổi chưa lưu thì hỏi lại (`canDeactivate`) |

Màn soạn bài dùng `editor-layout`. `thumbnail: null` khi bỏ ảnh. Nút "Xem trên blog" chỉ bật khi bản dịch đang `published`.

### 4.4. Quản trị hệ thống (B, quyền `super_admin`)

| Route | UC | Từ HTML | API | Ghi chú |
| --- | --- | --- | --- | --- |
| `/admin/languages` | UC16 | `admin/languages.html` | `GET`, `POST /admin/languages`, `PATCH /admin/languages/:id`, `PATCH /admin/languages/:id/default`, `DELETE /admin/languages/:id` | Ngôn ngữ mặc định: switch và nút xóa disabled + tooltip. `LANGUAGE_IN_USE` → báo chỉ được tắt. Xong mỗi thao tác gọi `languageService.reload()` |
| `/admin/categories` | UC15 | `admin/categories.html` | `GET`, `POST`, `PATCH`, `DELETE /admin/categories` | Mỗi ngôn ngữ đang hoạt động một cột và một ô tên trong modal, ngôn ngữ mặc định đứng đầu và bắt buộc. Lỗi `names.<code>` hiện dưới ô của ngôn ngữ đó. `CATEGORY_IN_USE` → báo lỗi trong hộp xác nhận |
| `/admin/users` | UC14 | `admin/users.html` | `GET`, `POST /admin/users`, `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/status` | `isSelf` thì khóa nút đổi role, khóa tài khoản. `LAST_SUPER_ADMIN` → toast. Khóa tài khoản qua `confirm-dialog` |
| `/admin/pages` | UC18 | `admin/pages.html` | `GET /admin/pages` | Không phân trang, không tìm kiếm |
| `/admin/pages/:key/edit` | UC18 | `admin/page-edit.html` | `GET`, `PUT /admin/pages/:key`, `POST /uploads/images` | Mỗi ngôn ngữ đang hoạt động một tab, mỗi tab tiêu đề + `rich-text-editor`. Lưu mọi tab một lần. Lỗi `translations.<code>.<field>` đánh dấu chấm đỏ trên tab. "Xem trên trang public" mở `/pages/:key` ở tab mới |

---

## 5. Chuyển HTML phase 2 sang Angular

Mỗi màn làm theo cùng một cách (hướng dẫn từng bước ở [phase-4-huong-dan.md](phase-4-huong-dan.md) mục 5):

| Trong HTML phase 2 | Trong Angular |
| --- | --- |
| `<!-- component: ten -->` ... `<!-- /component: ten -->` | Một component. Khối dùng ở nhiều màn đã có trong `shared/` thì dùng lại, không chép markup |
| `data-i18n="menu.home"` | `{{ 'menu.home' \| translate }}` |
| `data-i18n-placeholder="..."`, `data-i18n-aria-label="..."` | `[placeholder]="'...' \| translate"`, `[attr.aria-label]="'...' \| translate"` |
| Dữ liệu giả (tiêu đề, tên, số) | Binding từ API |
| Danh sách lặp lại | `@for (item of items(); track item.id)` + `@empty` cho trạng thái rỗng |
| `data-demo="loading"`, `"empty"`, `"error"` | `@if` theo signal `loading()`, `items().length === 0`, lỗi của form |
| `data-demo-auth="..."` | `@if (auth.isLoggedIn())`, `auth.canWrite()`, `auth.isSuperAdmin()` |
| `data-demo-modal`, modal Bootstrap | `NgbModal` hoặc `confirm-dialog` |
| `data-bs-toggle="dropdown"`, `"offcanvas"`, `"tab"`, `"tooltip"` | `ngbDropdown`, `NgbOffcanvas`, `ngbNav`, `ngbTooltip` (giữ class Bootstrap như phase 2) |
| `is-invalid` + `invalid-feedback` viết sẵn | `[class.is-invalid]` + `field-error` |
| `href="../public/login.html"` | `routerLink="/login"`; link ra ngoài app (OAuth) giữ `href` |
| `src="../assets/img/..."` | Ảnh từ API qua pipe `uploadUrl`; ảnh tĩnh của giao diện chép vào `frontend/public/` |
| `.is-active` + `aria-current="page"` trên menu | `routerLinkActive="is-active"` + `ariaCurrentWhenActive="page"` |
| Thanh demo, `demo-state.js`, `data-demo*` | Bỏ |

Giữ nguyên thứ tự thẻ, class, thuộc tính truy cập (`alt`, `<label>`, `aria-label`) của phase 2. Thấy markup phase 2 sai thì sửa ở cả `html/` lẫn `frontend/` trong cùng PR, hoặc báo người làm màn đó.

---

## 6. Kiểm thử

### 6.1. Unit test

Requirements không đặt ngưỡng độ phủ cho frontend. Bắt buộc có test cho phần nền, vì lỗi ở đây ảnh hưởng mọi màn:

- `refreshInterceptor`: 401 `TOKEN_EXPIRED` thì refresh và gửi lại; nhiều request cùng hết hạn chỉ gọi refresh một lần; refresh lỗi thì xóa phiên và chuyển `/login`.
- `authGuard`, `guestGuard`, `roleGuard`: từng role, kể cả kế thừa role.
- `LanguageService`: chọn ngôn ngữ lần đầu (đã lưu, theo trình duyệt, mặc định), ngôn ngữ đã lưu bị tắt.
- `setServerErrors`: map `field` lồng nhau (`translation.title`, `names.vi`, `translations.en.title`).
- Luồng lưu bài viết mới (A5): bản gốc lỗi, một bản dịch lỗi.

Màn hình khác: test nếu có logic riêng đáng kể (luồng nhiều bước, tính toán), không bắt buộc.

### 6.2. Kiểm tra trên trình duyệt

Mỗi PR tự kiểm tra màn của mình với backend thật, dữ liệu vừa seed:

- Mọi trạng thái ở cột "Trạng thái" của phase-2-html.md mục 5 xuất hiện được bằng thao tác thật. Trạng thái khó tạo (loading, lỗi mạng) xem bằng DevTools: Network → throttling "Slow 4G" hoặc "Offline".
- 360px và desktop, sáng và tối, `vi` và `en`.
- Đúng quyền: mở màn bằng tài khoản không đủ role, và bằng khách.
- Console không có lỗi.
- Thử hết hạn token: đặt `JWT_ACCESS_TTL=1m` trong `backend/.env` của máy mình (không commit), đợi quá 1 phút rồi thao tác, phải không bị đăng xuất.

### 6.3. Kiểm tra tổng (C5)

Đi lại toàn bộ use case Must từ giao diện theo kịch bản ở mục 9, bằng cả 4 vai trò, trên Chrome, Edge, Firefox. Ghi lỗi thành danh sách: lỗi trong một màn chuyển người làm màn đó, lỗi phần nền chuyển A.

---

## 7. Quy ước code

### 7.1. Đặt tên

- File kebab-case theo vai trò: `categories-page.component.ts`, `admin-categories.service.ts`, `auth.guard.ts`, `language.interceptor.ts`. Màn hình có hậu tố `-page`, modal có hậu tố `-modal`.
- Selector có tiền tố `app-`: `app-post-card`.
- Route Angular theo cột "Route phase 4" của phase-2-html.md mục 5, kebab-case, khớp các link backend tạo ra (`/reset-password?token=`, `/oauth/callback`).
- Key dịch theo nhóm có sẵn: `menu.*`, `auth.*`, `post.*`, `comment.*`, `admin.*`, `common.*`, `validation.*`, `error.*`. Tìm key đã có trước khi thêm key mới.

### 7.2. Component, service

- Component màn hình chỉ giữ trạng thái giao diện và gọi service. Gọi `HttpClient` chỉ trong service.
- Trạng thái của màn dùng signal: `loading`, `items`, `meta`, `error`. Dùng `inject()` thay cho constructor injection.
- `ChangeDetectionStrategy.OnPush` cho mọi component.
- Subscribe trong component phải tự hủy: dùng `takeUntilDestroyed()`, `toSignal()` hoặc pipe `async`.
- Không thao tác DOM trực tiếp (`document.querySelector`), trừ trong editor và script chặn theme.
- Không lưu gì vào `localStorage` ngoài 4 key đã nêu: `auth.accessToken`, `auth.refreshToken`, `lang`, `theme`.

### 7.3. SCSS

Như phase 2 (`.claude/rules/html.md`): ưu tiên class Bootstrap, BEM không tiền tố, màu luôn `var(--bl-...)`, không style inline, không `!important`, mobile-first. Không dùng `::ng-deep`. Class mới dùng ở nhiều màn thì thêm vào `src/styles/components/` và ghi vào bảng "Có sẵn để dùng" của `frontend/README.md`.

### 7.4. Biến môi trường

Frontend không có secret. `environment.ts` chỉ có `apiBase: '/api/v1'`. Không ghi địa chỉ backend cứng trong code: dev đi qua `proxy.conf.json`, phase 5 đi qua Nginx.

### 7.5. Git

- Nhánh `feature/fe-<phần>` tạo từ `dev`, ví dụ `feature/fe-starter`, `feature/fe-admin-categories`. Cần bổ sung tiền tố này vào `.claude/rules/git-workflow.md`.
- Commit theo Conventional Commits với scope `web`: `feat(web): add category admin page`, `fix(web): keep page query on reload`.
- Merge vào `dev` qua PR, review theo requirements 1.4. Sửa `core/`, `shared/`, `layouts/`, `src/styles/abstracts|themes|layouts` thì A phải duyệt.
- Trước khi tạo PR: `npm run lint`, `npm run test`, `npm run build`, `npm run i18n:check` đều qua; checklist ở [phase-4-huong-dan.md](phase-4-huong-dan.md) mục 6; ảnh chụp 360px và desktop, sáng và tối.
- Mỗi thay đổi thêm dòng vào `CHANGELOG.md` mục `[Unreleased]`.
- Cuối phase merge `dev` vào `master`.

---

## 8. Thứ tự làm

Cách đọc bảng giống phase 3:

- Mỗi việc (A1, B1...) là một nhánh và một PR. Mỗi người làm theo thứ tự số trong bảng của mình (mục 8.3).
- Trạng thái ghi ngay sau mã việc: (**đã xong**) là đã merge vào `dev`; (**đang làm**) là đã có nhánh nhưng chưa merge; không ghi là chưa bắt đầu. PR nào thì sửa trạng thái dòng của việc đó ngay trong PR.
- Cột "Chờ" ghi việc phải **merge** xong thì mới bắt đầu được.
- Đến lượt mà việc phải chờ chưa merge thì làm trước việc tiếp theo không phải chờ, rồi quay lại sau.

### 8.1. Tỉ lệ phân công

| Người | Khối lượng | Phần việc |
| --- | --- | --- |
| A | ~45% | Khung Angular, đăng nhập/đăng xuất (màn mẫu form), màn mẫu danh sách admin, chi tiết bài (UC06), rich text editor, form bài viết (UC13), đăng ký, quên mật khẩu, OAuth (UC01, UC03, UC20), tìm kiếm (UC19), hoàn thiện cuối phase |
| B | ~40% | Hồ sơ cá nhân (UC12), ngôn ngữ (UC16), danh mục (UC15), người dùng (UC14), bình luận (UC08), trang tĩnh (UC11, UC18) |
| C | ~15% | Toast, đổi sáng/tối (UC10), trang chủ (UC05), bài theo danh mục (UC07), bộ chọn ngôn ngữ (UC09), kiểm tra tổng |

Theo requirements 1.4. Hồ sơ cá nhân UC12 trả về B (phase 3 chuyển phần backend sang A vì A còn thời gian; ở phase 4 A đã có editor và form bài viết là phần lớn nhất).

### 8.2. Thứ tự chung theo đợt

| Đợt | Việc | Bắt đầu được khi | Mở đường cho |
| --- | --- | --- | --- |
| 1 | A1 | Ngay từ đầu | Mọi việc còn lại |
| 2 | A2, A3, C1, C2, B1 | A1 đã merge | A2 → B2, B3, B4. A3 → B5, C4. C1 → mọi màn cần toast |
| 3 | A4, B2, B3, C3 | A4 chờ A1. B2, B3 chờ A2. C3 chờ C2 | A4 → A5, B6 |
| 4 | A5, A6, B4, B5, C4 | A5 chờ A4. A6 chờ A1. B4 chờ A2. B5 chờ A3. C4 chờ A3, C3 | |
| 5 | B6, A7 | B6 chờ A4 và B0 (B6 backend của phase 3). A7 chờ A1 | |
| 6 | C5 (kiểm tra tổng) | Mọi việc Must đã merge | A8, các PR sửa lỗi |
| 7 | A8 | C5 đã merge | Kết thúc phase: merge `dev` → `master` |

Việc chặn nhiều người nhất: **A1** (chặn tất cả), rồi **A2** (chặn 3 việc của B) và **A4** (chặn A5, B6). Ưu tiên review và merge ba việc này sớm.

### 8.3. Việc của từng người

#### A

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| A1 | Khung Angular: project `frontend/`, ESLint, Prettier, proxy, SCSS chép từ phase 2, file dịch, mọi phần ở mục 3.1-3.4, 3.6, 3.7, 3.9 (interceptor, `AuthService`, guard, `LanguageService`, layout, component dùng chung trừ toast, theme, editor), màn 404, 403, script `i18n:check`, `frontend/README.md`. **Màn mẫu form**: đăng nhập `/login` (UC02) + đăng xuất (UC04) | | **Merge sớm** (mục tiêu 02/12). Màn đăng nhập có đủ: validate, lỗi server, 429, loading, `returnUrl`. Có unit test của mục 6.1 |
| A2 | **Màn mẫu danh sách admin**: `/admin/posts` (UC13 danh sách, lọc, xóa) | A1 | **Merge sớm** vì B2, B3, B4 copy theo. Có đủ: bảng, lọc trên query string, phân trang, skeleton, rỗng, `confirm-dialog` có `action`, toast |
| A3 | Chi tiết bài `/posts/:slug` (UC06): nội dung, bài liên quan, dòng ngôn ngữ, đổi slug khi đổi ngôn ngữ; chỗ đặt khối bình luận | A1 | Mở đường cho B5, C4 |
| A4 | Component `rich-text-editor` (mục 3.8) + upload ảnh | A1 | **Merge sớm** vì A5, B6 cần. Đặt một màn thử tạm trong PR để review, xóa trước khi merge |
| A5 | `/admin/posts/new`, `/admin/posts/:id/edit` (UC13): `thumb-upload`, ô chọn nhiều bản dịch, tab ngôn ngữ, xem trước, luồng lưu nhiều bước | A4 | Phần lớn nhất của phase. Có thể tách 2 PR: tạo bài, rồi sửa bài và bản dịch |
| A6 | `/register` (UC01), `/forgot-password`, `/reset-password` (UC03), nút OAuth + `/oauth/callback` (UC20) | A1 | Sửa câu `auth.error.oauth_no_email` (đang chỉ nhắc Github, Google cũng có thể trả lỗi này) |
| A7 | Tìm kiếm `/search` (UC19, Should) | A1 | Dùng lại `post-card`, `pagination` |
| A8 | Duyệt lỗi C báo ở C5 thuộc phần nền, kiểm tra `ng build` production, merge `dev` → `master` | C5 | |

#### B

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| B0 | B6 backend của phase 3 (trang tĩnh UC11, UC18) | | Việc còn lại của phase 3, làm trước |
| B1 | Hồ sơ cá nhân `/profile` (UC12) | A1 | Copy cách làm của màn đăng nhập (A1). Đổi avatar, tên thì header đổi theo |
| B2 | Ngôn ngữ `/admin/languages` (UC16) | A2 | Copy màn mẫu `/admin/posts`. Modal thêm/sửa dùng `NgbModal` |
| B3 | Danh mục `/admin/categories` (UC15) | A2 | Cột và ô tên theo danh sách ngôn ngữ đang hoạt động |
| B4 | Người dùng `/admin/users` (UC14) | A2 | |
| B5 | Khối bình luận (UC08) trong `/posts/:slug` | A3 | Component riêng trong `features/posts/comments/`, nhận `translationId`, `canDeleteComments` |
| B6 | `/pages/:key` (UC11), link header/footer từ `GET /pages`, `/admin/pages`, `/admin/pages/:key/edit` (UC18) | A4, B0 | Dùng lại `rich-text-editor`, tab ngôn ngữ giống màn sửa bài |

#### C

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| C0 | C3 của phase 3 (kiểm tra tổng backend) | | Việc còn lại của phase 3, làm trong lúc chờ A1 |
| C1 | `ToastService` + component toast; `ThemeService` + nút đổi theme + script chặn trong `index.html` (UC10) | A1 | **Merge sớm** vì mọi màn có thông báo đều cần toast. Theo `html/js/theme.js` và `components/_toast.scss` |
| C2 | Trang chủ `/` (UC05): chip danh mục, danh sách thẻ bài, phân trang, sidebar | A1 | Dùng `post-card`, `pagination`, `empty-state` của A1. Gặp chỗ chưa rõ thì hỏi A trước khi làm |
| C3 | Bài theo danh mục `/categories/:slug` (UC07) | C2 | Dùng lại phần danh sách của C2 |
| C4 | Bộ chọn ngôn ngữ trên header và offcanvas (UC09): danh sách từ `LanguageService`, đổi ngôn ngữ, đổi slug ở trang danh mục | A3, C3 | `LanguageService` đã có ở A1, C chỉ làm giao diện và gọi `use(code)`. Đổi slug ở chi tiết bài do A3 làm sẵn |
| C5 | Kiểm tra tổng theo mục 9: kịch bản mọi UC Must bằng 4 vai trò, 360px / 768px / 1280px, sáng/tối, `vi`/`en`, Chrome / Edge / Firefox; ghi lỗi thành danh sách, lỗi trong một màn chuyển người làm màn đó, lỗi phần nền chuyển A | Mọi việc Must | Làm sau cùng. Ghi danh sách lỗi vào mô tả PR |

Hướng dẫn từng bước (cài máy, chạy frontend, quy trình làm một màn, checklist, Git): [phase-4-huong-dan.md](phase-4-huong-dan.md).

### 8.4. Lịch dự kiến

| Ngày | A | B | C |
| --- | --- | --- | --- |
| 30/11 - 02/12 | A1 | B0 (B6 backend), review A1 | C0 (C3 backend) |
| 03/12 | A2; A8 phase 3 nếu C0 đã merge | B1 | C1 |
| 04/12 | A3 | B1, B2 | C2 |
| 07/12 - 08/12 | A4 | B2, B3 | C2, C3 |
| 09/12 - 11/12 | A5 | B4, B5 | C3, C4 |
| 14/12 | A6 | B6 | C4 |
| 15/12 | A7, sửa lỗi phần nền | B6, sửa lỗi C5 | C5 |
| 16/12 | A8 | Sửa lỗi C5 | Kiểm tra lại sau khi sửa |

Nếu đến 09/12 mà A4 chưa merge thì lùi A6 (trừ đăng ký và quên mật khẩu, là Must) và A7 (Should) ra sau, dành thời gian cho A5. B6 là việc Must cuối của B: nếu đến 14/12 B6 backend vẫn chưa merge thì báo A ngay.

---

## 9. Điều kiện hoàn thành

Phase 4 kết thúc khi đạt hết các mục sau (mở rộng từ requirements mục 1.5):

**Đủ chức năng**

- [ ] Chạy được từ giao diện, với backend thật và dữ liệu vừa seed, mọi use case Must: UC01-UC09, UC11, UC13-UC16, UC18.
- [ ] Đủ mọi màn ở mục 4, mỗi trạng thái bắt buộc của phase 2 xuất hiện được bằng thao tác thật.
- [ ] Kịch bản đầu cuối chạy trọn: đăng ký → đăng nhập → (Super Admin cấp quyền Blog Owner) → viết bài có ảnh và một bản dịch → đăng → khách thấy bài ở cả hai ngôn ngữ → bình luận, trả lời → đổi ngôn ngữ ở trang chi tiết thì sang đúng bản dịch → xóa bình luận theo đúng quyền.

**Xác thực và quyền**

- [ ] Access token hết hạn thì tự refresh, người dùng không bị đăng xuất; refresh token hết hạn thì về `/login` và quay lại đúng trang sau khi đăng nhập.
- [ ] Mở thẳng URL `/admin/...` bằng khách, User, Blog Owner thì bị chặn đúng (đăng nhập hoặc 403).
- [ ] Tài khoản bị khóa trong lúc đang dùng thì bị đưa về `/login` kèm thông báo.
- [ ] Header, sidebar admin hiện mục đúng theo role.

**Đa ngôn ngữ và giao diện**

- [ ] Đổi ngôn ngữ thì đổi hết chữ tĩnh, danh sách bài, tên danh mục, trang tĩnh, không phải tải lại trang; tải lại vẫn giữ ngôn ngữ (UC09).
- [ ] `npm run i18n:check` không báo thiếu key; không còn chữ tĩnh viết thẳng trong template.
- [ ] Lỗi từ API hiện theo ngôn ngữ đang chọn (mục 3.3).
- [ ] Hiển thị đúng ở 360px, 768px, 1280px, sáng và tối, trên Chrome, Edge, Firefox bản mới nhất. Đổi theme rồi tải lại không nháy màu.
- [ ] Giao diện khớp phase 2: đặt cạnh file HTML tương ứng thì cùng bố cục, class, câu chữ.

**Bảo mật**

- [ ] Nội dung bài và trang tĩnh hiện qua `[innerHTML]`, không có `bypassSecurityTrust*` trong code. Bình luận chứa `<script>` hiện ra đúng là chữ.
- [ ] Token chỉ nằm trong `localStorage` ở 2 key đã nêu, không có trên URL (kể cả OAuth).

**Code và build**

- [ ] `npm run lint`, `npm run test`, `npm run build` (production) không lỗi, không vượt budget của `angular.json`.
- [ ] Không còn `data-demo*`, `demo-state.js` hay dữ liệu giả trong `frontend/`.
- [ ] Console trình duyệt không có lỗi khi đi qua kịch bản ở trên.
- [ ] Mọi PR đã được review theo requirements 1.4 và merge vào `dev`; `dev` đã merge vào `master`.

---

## 10. Các quyết định cần thống nhất

Cả nhóm chốt các mục này trước khi bắt đầu A1. Cột "Đề xuất" là phương án tài liệu này đang dùng.

**Đã chốt (26/11/2026):** Q1-Q6 theo cột "Đề xuất". Q1 vẫn chờ mentor trả lời có bắt buộc `NgModule` không; A1 làm standalone, nếu mentor yêu cầu thì thêm `*.module.ts` cho từng khu vực như cột "Lý do". Q7 chốt trước A5.

| # | Vấn đề | Đề xuất | Lý do |
| --- | --- | --- | --- |
| Q1 | Requirements 1.2 ghi "Angular (chia theo module)": dùng `NgModule` hay standalone component? | Standalone, chia theo khu vực tính năng trong `features/`, mỗi khu vực nạp lười bằng một file route | Standalone là mặc định của Angular CLI từ bản 17, `NgModule` không còn được khuyên dùng cho project mới. Vẫn giữ ý "chia theo module": mỗi khu vực tự chứa route, màn, service. Cần hỏi mentor có bắt buộc `NgModule` không; nếu có thì mỗi khu vực thêm một `*.module.ts`, phần còn lại của tài liệu không đổi |
| Q2 | Thư viện i18n: `@angular/localize` hay `ngx-translate`? | `ngx-translate` | D5 yêu cầu đọc file JSON theo ngôn ngữ, đổi ngôn ngữ lúc chạy và dự phòng về ngôn ngữ mặc định. `@angular/localize` dịch lúc build, mỗi ngôn ngữ một bản build, không đổi được mà không tải lại trang |
| Q3 | Component động của Bootstrap: `ng-bootstrap` hay `bootstrap.bundle.js`? | `ng-bootstrap` | Dùng nguyên CSS Bootstrap của phase 2, mở/đóng theo dữ liệu của Angular. `bootstrap.bundle.js` sửa DOM ngoài Angular, phải tự khởi tạo và hủy trong từng component |
| Q4 | Thư viện editor? | Tiptap, tự bọc thành component | Xuất HTML ngữ nghĩa (`ul`, `ol`, `h2`, `blockquote`) khớp danh sách thẻ của `sanitizeRichText`, chỉ bật đúng các định dạng cần, giao diện thanh công cụ tự dựng nên giữ được `.editor` của phase 2. Quill 2 xuất danh sách dạng `<ol><li data-list="bullet">`, backend bỏ `data-list` nên danh sách gạch đầu dòng bị đổi thành danh sách số |
| Q5 | Lỗi theo field từ backend chỉ có `message` tiếng Việt, không có `code`. Giao diện `en` hiện gì? | Map các lỗi chỉ backend biết (email trùng, mật khẩu hiện tại sai, mã ngôn ngữ trùng...) sang key `validation.*` ngay trong component; còn lại hiện `message` của backend | Validators của frontend đã bắt gần hết lỗi theo field, phần còn lại ít. Cách khác là thêm `code` cho từng phần tử `errors[]` ở backend, sửa phần nền phase 3 |
| Q6 | SCSS dùng chung: chép sang `frontend/` hay import thẳng `html/scss/`? | Chép ở A1, sửa cả hai nơi cho đến khi phase 2 đóng | `frontend/` tự build được, phase 5 chỉ cần thư mục này. Import thẳng thì không lệch nhau nhưng `frontend/` phụ thuộc `html/` và `html/node_modules` |
| Q7 | Bản dịch ở ngôn ngữ đã tắt (`GET /admin/posts/:id` vẫn trả) có tab trên màn sửa bài không? | Có tab, chỉ xem và xóa, không sửa | Requirements UC16 không cho thêm bản dịch mới ở ngôn ngữ đã tắt nhưng không nói về sửa. Cần đối chiếu `PATCH /admin/posts/:id/translations/:code` ở backend trước A5 |

---

## 11. Ngoài phạm vi phase 4

- Build và phục vụ frontend bằng Nginx, đường dẫn `/var/www/blog` (phase 5). Phase 4 chỉ cần `ng build` production chạy được.
- Server-side rendering, SEO, PWA, service worker.
- Test e2e trên trình duyệt tự động (Playwright, Cypress). Kiểm tra bằng tay theo mục 6.2 và 6.3.
- Giữ nháp tự động khi soạn bài (autosave), cảnh báo hai người cùng sửa.
- Facebook OAuth và tham số `state` của OAuth (phase-3-backend.md mục 11).
- Thêm ngôn ngữ chữ tĩnh mới ngoài `vi`, `en` (cần file dịch mới và deploy lại, requirements D5).
- Các chức năng ở requirements mục 8.

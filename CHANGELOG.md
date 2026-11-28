# Changelog

Ghi lại các thay đổi của dự án. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/).

## [Unreleased]

### Added

- Khung frontend Angular (A1, nhánh `feature/fe-starter`), bước 1 - dựng project `frontend/`:
  - Angular 22.3 standalone, TypeScript `strict` + `strictTemplates`, không SSR. Test runner mặc định Vitest (`npm run test` chạy một lần, `npm run test:watch` để theo dõi).
  - Thư viện: `bootstrap@5.3.8` (khóa đúng bản như `html/`), `bootstrap-icons`, `@ng-bootstrap/ng-bootstrap` (kèm `@angular/localize/init` trong polyfills, `@popperjs/core`), `@ngx-translate/core`, `@ngx-translate/http-loader`.
  - `proxy.conf.json`: `/api`, `/uploads` → `http://localhost:3000`, khai báo trong `serve.options.proxyConfig` nên `npm start` tự dùng proxy.
  - `angular.json`: `stylePreprocessorOptions.includePaths: ["node_modules"]`, tắt cảnh báo deprecation `@import` của Sass do Bootstrap 5.3; schematic sinh file theo quy ước mục 7.1 (`*.component.ts`, `*.service.ts`, `auth.guard.ts`, `language.interceptor.ts`) và component mặc định `OnPush`.
  - ESLint (`angular-eslint` 22 + `eslint-config-prettier`), bật luật `prefer-on-push-component-change-detection`, `prefer-inject`. Prettier cùng cấu hình backend (`singleQuote`, `trailingComma: all`) + parser `angular` cho `.html`. `npm run lint` chạy ESLint `--fix` rồi Prettier.
  - `src/environments/environment.ts` chỉ có `apiBase: '/api/v1'`. Component gốc `AppComponent` chỉ có `<router-outlet />`.
- Khung frontend Angular (A1), bước 2 - giao diện và file dịch từ phase 2:
  - `frontend/src/styles/`: chép `html/scss/` (`abstracts`, `themes`, `base`, `layouts`, `components`), bỏ `components/_demo-state.scss`. Chỉ khác `html/scss/` ở 3 dòng chú thích còn nhắc `data-demo*` (`_editor.scss`, `_thumb-upload.scss`, `_toast.scss`). `src/styles.scss` import theo đúng thứ tự `html/scss/main.scss`.
  - `frontend/.prettierignore` bỏ qua `src/styles/` để Prettier không format lại, giữ các file giống `html/scss/` cho đến khi phase 2 đóng (Q6).
  - Bootstrap Icons lấy từ npm (`bootstrap-icons@1.13.1`, khóa đúng bản CDN phase 2) qua mảng `styles` của `angular.json`, không dùng CDN. Font Google `Inter`, `Source Serif 4` nạp trong `src/index.html` như `_templates/public.html`; `<html lang="vi" data-bs-theme="light">`, chừa chỗ script chặn theme cho C1.
  - `angular.json`: `cli.analytics: false`, để `ng serve` lần đầu không hỏi chia sẻ dữ liệu sử dụng với Google.
  - Budget `initial` của bản build production nâng lên cảnh báo 900kB / lỗi 1.2MB: CSS dùng chung (Bootstrap đầy đủ + Bootstrap Icons) đã khoảng 360kB, bằng `html/css/main.css` + icon của phase 2.
  - `frontend/public/i18n/vi.json`, `en.json`: chép từ `html/i18n/`, thêm key `error.<code viết thường>` cho mọi mã trong `backend/src/common/errors.ts` (`validation_error`, `bad_request`, `unauthorized`, `token_expired`, `forbidden`, `not_found`, `conflict`, `too_many_requests`, `internal_error`, `invalid_credentials`, `account_locked`, `reset_token_invalid`, `oauth_no_email`, `oauth_failed`, `oauth_code_invalid`, `language_in_use`, `category_in_use`, `last_super_admin`, `original_translation_required`), `error.network_error` (lỗi mạng, `status: 0`), `error.forbidden_title`, `error.forbidden_text` (màn 403). 378 key mỗi file, ngoài nhóm `error` giống hệt `html/i18n/`.
- Khung frontend Angular (A1), bước 3 - gọi API và xử lý lỗi (docs/phase-4-frontend.md mục 3.1, 3.3):
  - `core/api/`: kiểu `ApiResponse<T>`, `PageMeta`, `Paginated<T>`, `FieldError`, `ApiError`, `ApiErrorCode` (mọi mã trong `backend/src/common/errors.ts` + `NETWORK_ERROR`); operator `unwrap()` (lấy `data`), `unwrapPage()` (lấy `{ items, meta }`, không có `meta` thì coi là một trang); `toApiError()`, `isApiError()`; `skipErrorToast()` (HttpContext `SKIP_ERROR_TOAST`) để tắt toast lỗi mạng/5xx cho một request.
  - `apiUrlInterceptor`: thêm `/api/v1` trước đường dẫn tương đối (`/posts` → `/api/v1/posts`, kể cả `POST /uploads/images`); bỏ qua URL tuyệt đối, URL đã có prefix và file dịch `/i18n/*`.
  - `languageInterceptor`: gửi `Accept-Language` theo `LanguageService.current()` cho request API, không ghi đè header đặt sẵn. `LanguageService` mới có signal `current` (mặc định `vi`), bước 5 làm đủ.
  - `errorInterceptor`: đổi `HttpErrorResponse` của request API thành `ApiError`. Lỗi mạng hoặc response không đúng format lỗi của backend (proxy 502/504) thành `status: 0`, `code: NETWORK_ERROR`. Lỗi mạng và 5xx hiện toast `error.network_error` / `error.internal_error`; 4xx để component xử lý.
  - Thứ tự interceptor khai báo một chỗ ở `core/interceptors/index.ts` (`API_INTERCEPTORS`), chừa chỗ cho `auth`, `refresh` ở bước 4. `provideHttpClient(withFetch(), withInterceptors(API_INTERCEPTORS))` trong `app.config.ts`.
  - `errorKey(code)` (`core/i18n/error-key.ts`): `CATEGORY_IN_USE` → `error.category_in_use`. `I18N_FILES = ['vi', 'en']`, `FALLBACK_LANG = 'vi'` (`core/i18n/i18n-files.ts`).
  - `ToastService` tối giản (`shared/components/toast/`): `success(key, params?)`, `error(key, params?)`, `dismiss(id)`, signal `toasts`. C1 làm component hiển thị, giữ nguyên chữ ký.
  - Unit test: chuỗi interceptor (prefix, query string, `Accept-Language`, map lỗi, toast theo loại lỗi, `skipErrorToast`, lỗi file dịch giữ nguyên), `unwrap` / `unwrapPage`.
- Khung frontend Angular (A1), bước 4 - phiên đăng nhập và phân quyền (docs/phase-4-frontend.md mục 3.2; UC02, UC04):
  - `TokenStorage` (`core/auth/token-storage.ts`): lưu `auth.accessToken`, `auth.refreshToken` trong `localStorage`, mỗi lần đọc đều đọc lại để thấy token tab khác vừa ghi; trình duyệt chặn `localStorage` thì coi như khách, không lỗi.
  - `AuthService`: signal `user`; computed `isLoggedIn`, `role`, `canWrite` (Blog Owner, Super Admin), `isSuperAdmin`. `login()` (`POST /auth/login`), `logout()` (`POST /auth/logout` kèm `refreshToken`, thành công hay lỗi đều xóa phiên và về `/`), `setSession()` (dùng lại cho OAuth UC20), `updateUser()` (UC12 đổi tên, avatar), `endSession(reason)` (xóa phiên, chuyển `/login?returnUrl=<url>&sessionError=<TOKEN_EXPIRED|UNAUTHORIZED|ACCOUNT_LOCKED>`).
  - `AuthService.refreshAccessToken()`: gọi `POST /auth/refresh` **một lần** cho mọi request hết hạn cùng lúc; tab khác vừa refresh (localStorage có token khác còn hạn) thì dùng luôn; hai tab refresh cùng lúc mà tab này thua (refresh token đã bị xoay vòng) thì dùng cặp token tab kia vừa ghi, không đăng xuất.
  - Khởi động: `provideAppInitializer` gọi `AuthService.init()`: có refresh token thì `GET /auth/me` trước khi router chạy. Phiên không hợp lệ thì xóa token, coi như khách, không chuyển trang; lỗi mạng thì giữ token.
  - Đồng bộ giữa các tab qua sự kiện `storage`: tab khác đăng xuất thì tab này về khách và về `/`; tab khác đăng nhập thì tab này tải `GET /auth/me`.
  - `authInterceptor`: gắn `Authorization: Bearer` cho mọi request API trừ request `skipAuth()`. Access token đã hết hạn theo `exp` (trừ hao 10 giây) thì refresh trước khi gửi, vì route `optionalAuth` (`/posts/:slug`) nhận token hết hạn không trả 401 mà coi như khách. Refresh lỗi thì xóa phiên, gửi như khách.
  - `refreshInterceptor`: 401 `TOKEN_EXPIRED` thì refresh rồi gửi lại; refresh lỗi thì hết phiên `TOKEN_EXPIRED`. 401 khác hoặc gửi lại vẫn 401 thì hết phiên `UNAUTHORIZED`. 403 `ACCOUNT_LOCKED` thì hết phiên `ACCOUNT_LOCKED`. 403 `FORBIDDEN` để component hiện màn 403. Bỏ qua request `skipAuth()` (401 `INVALID_CREDENTIALS` của màn đăng nhập là lỗi của form).
  - HttpContext (`core/auth/auth-context.ts`): `skipAuth()` cho đăng nhập, refresh, đăng ký, quên/đặt lại mật khẩu, OAuth exchange; `noSessionRedirect()` cho `GET /auth/me` lúc khởi động và `POST /auth/logout` (hết phiên chỉ xóa token, không chuyển `/login`).
  - Guard: `authGuard` (chưa đăng nhập → `/login?returnUrl=`), `guestGuard` (đã đăng nhập → `/`), `roleGuard` với `data: { roles }`, kế thừa role giống backend (`hasRole`, `core/auth/roles.ts`); không đủ role thì hiện màn `/403` bằng `RedirectCommand` + `skipLocationChange`, URL giữ nguyên.
  - Kiểu `AuthUser`, `RoleCode` (`core/models/auth-user.model.ts`), `TokenPair`, `LoginResponse`, `LoginRequest` (`core/auth/auth.models.ts`).
  - Unit test (mục 6.1): `refreshInterceptor` (refresh và gửi lại, nhiều request chỉ refresh một lần, refresh lỗi chuyển `/login` kèm `returnUrl`, tab khác vừa refresh, hai tab refresh cùng lúc, gửi lại vẫn 401, `ACCOUNT_LOCKED`, `FORBIDDEN` giữ phiên, đăng nhập sai không chuyển trang, refresh trước khi gửi); ba guard với từng role và kế thừa role; `AuthService` (`init`, `login`, `logout`, đồng bộ tab, `updateUser`); `isTokenExpired`.
  - `docs/phase-4-frontend.md` mục 3.2, 4.2: ghi thêm refresh trước khi gửi và tham số `?sessionError=<code>` của `/login`.
- Tài liệu phase 4 (frontend Angular):
  - `docs/phase-4-frontend.md`: công cụ, cấu trúc `frontend/`, khung Angular (gọi API, token trong `localStorage` + refresh khi 401 `TOKEN_EXPIRED`, guard theo role, xử lý lỗi theo `code` → key `error.*`, đa ngôn ngữ bằng `ngx-translate` + header `Accept-Language`, theme, layout, component dùng chung, rich text editor Tiptap), bảng màn hình kèm route, API và người làm, quy tắc chuyển HTML phase 2 sang component, kiểm thử, quy ước, thứ tự làm A1-A8 / B0-B6 / C0-C5, lịch 30/11 - 16/12/2026, điều kiện hoàn thành, quyết định cần thống nhất Q1-Q7.
  - `docs/phase-4-huong-dan.md`: cài máy, chạy backend + frontend qua proxy, quy trình làm một màn (ví dụ `/admin/categories`), checklist PR, commit scope `web`, nhánh `feature/fe-<phần>`, lỗi hay gặp.
  - `docs/requirements.md` mục 1.5 Phase 4: thêm link tới `phase-4-frontend.md`.
  - `docs/phase-4-frontend.md` mục 3.3: toast lỗi mạng dùng key `error.network_error` (trước ghi `error.network`), cho đúng quy tắc `error.<code viết thường>` với mã `NETWORK_ERROR`.
  - `docs/phase-4-frontend.md` mục 10: chốt Q1-Q6 theo phương án đề xuất (standalone, `ngx-translate`, `ng-bootstrap`, Tiptap, map lỗi field chỉ backend biết sang `validation.*`, chép SCSS sang `frontend/`). Q1 còn chờ mentor xác nhận, Q7 chốt trước A5.
  - Rule `.claude/rules/frontend.md` (áp dụng cho `frontend/**`): phân tầng component/service, dùng interceptor và component có sẵn, đa ngôn ngữ, quyền, bảo mật (`innerHTML`, 4 key `localStorage`), chuyển HTML phase 2, phần nền cần duyệt.
  - Skill `new-angular-page`: chuyển một màn HTML phase 2 thành màn Angular nối API thật, theo màn mẫu `login` / `admin/posts`, kèm route, guard, file dịch, kiểm tra trên trình duyệt và changelog.
- `.claude/rules/git-workflow.md`: thêm nhánh `feature/fe-<phần>`, bảng scope commit (`api`, `html`, `web`), checklist PR frontend (`docs/phase-4-huong-dan.md` mục 6), phần nền frontend cần duyệt, conflict ở `app.routes.ts` và `public/i18n/*.json`; bỏ qua `.angular/` khi `git add`.
- Skill `pr-ready`: thêm bước kiểm tra `frontend/` (`lint`, `test`, `build`, `i18n:check`, soát diff theo `.claude/rules/frontend.md`, kiểm tra bằng mắt) và checklist mô tả PR frontend.
- Quản lý người dùng UC14 (B5, PR #64 merge 25/11, trước đây chưa ghi changelog), module `AdminUsersModule`, chỉ Super Admin:
  - `GET /admin/users`: phân trang, `?q=` (họ tên hoặc email, tối đa 100 ký tự), `?role=` (`user`, `blog_owner`, `super_admin`), `?isActive=true|false`; mới tạo xếp trước. Mỗi dòng có `isSelf` để phase 4 vô hiệu nút ở hàng của chính mình. Không trả `passwordHash`.
  - `POST /admin/users`: body `{ fullName, email, password, role }`, ràng buộc giống UC01. 201. Email đã có → 409 `CONFLICT` kèm `errors[{field: "email"}]` (kể cả khi hai request trùng email chạy song song).
  - `PATCH /admin/users/:id/role`: tự đổi vai trò của chính mình → 400 `BAD_REQUEST`; hạ quyền Super Admin hoạt động cuối cùng → 409 `LAST_SUPER_ADMIN` (khóa dòng `roles` để hai Super Admin hạ quyền nhau cùng lúc không deadlock). Người dùng không có → 404. Vai trò mới có hiệu lực với access token cấp sau đó.
  - `PATCH /admin/users/:id/status`: body `{ isActive }`. Tự khóa mình → 400; khóa Super Admin hoạt động cuối cùng → 409 `LAST_SUPER_ADMIN`. Khóa thì thu hồi mọi refresh token (`TokenService.revokeAll`) và xóa cache `auth:user-active` nên access token cũ bị từ chối ngay (403 `ACCOUNT_LOCKED`).
  - Unit test `admin-users.service.spec.ts`, e2e `admin-users.e2e-spec.ts`.
- Postman folder `12 - Admin Users` (UC14), nhánh `feature/be-user-postman`: 17 request gồm 401 khi chưa đăng nhập, 403 với Blog Owner, danh sách (`isSelf`, không có `passwordHash`), lọc theo vai trò và trạng thái, tìm theo email, lọc sai giá trị (400), tạo tài khoản, email trùng (409), sai dữ liệu (400), đổi vai trò, tự hạ quyền (400), người dùng không có (404), khóa, đăng nhập bằng tài khoản bị khóa (403 `ACCOUNT_LOCKED`), tự khóa (400), mở khóa, đăng nhập lại. Chỉ thao tác trên tài khoản vừa tạo (email ngẫu nhiên) nên không đổi dữ liệu seed. 409 `LAST_SUPER_ADMIN` chỉ kiểm tra ở e2e. Environment `local` thêm biến `adminUserId`, `newUserId`, `newUserEmail`.
- Trang tĩnh UC11 + UC18 (B6), nhánh `feature/be-pages` (làm lại PR #71 trên `dev` mới nhất), module `PagesModule`:
  - `GET /pages` (public): trang đang hiển thị, mỗi dòng `{ key, title }`, tiêu đề theo `Accept-Language`, thiếu thì dùng ngôn ngữ mặc định. Không cache.
  - `GET /pages/:key` (public): `{ key, title, content }` theo ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định. Trang đang ẩn hoặc key không có → 404 `NOT_FOUND`.
  - `GET /admin/pages` (Super Admin): mọi trang kể cả đang ẩn, `{ key, title, languages, isVisible, updatedAt }`; `title` theo ngôn ngữ mặc định (chưa có thì trả `key`), `languages` là mã các ngôn ngữ đang hoạt động đã có nội dung, mặc định đứng đầu. Không phân trang, không lấy cột `content`.
  - `GET /admin/pages/:key` (Super Admin): `isVisible`, `updatedAt` và `translations` gồm mỗi ngôn ngữ đang hoạt động một tab (`code`, `name`, `isDefault`, `title`, `content`; chưa có nội dung thì chuỗi rỗng). Key không có → 404.
  - `PUT /admin/pages/:key` (Super Admin): body `{ isVisible, translations: [{ code, title, content }] }`, lưu trong một transaction có khóa dòng `pages`. Ngôn ngữ mặc định bắt buộc tiêu đề 2-255 ký tự và nội dung; ngôn ngữ khác điền đủ cả hai thì lưu, trống cả hai thì xóa bản dịch, thiếu một trong hai → 400. Mã ngôn ngữ không có hoặc gửi trùng → 400. Báo mọi lỗi trong một lần, field dạng `translations.en.title`. Nội dung qua `sanitizeRichText`. Ngôn ngữ không gửi trong body thì giữ nguyên.
  - Unit test `pages.service.spec.ts`, `admin-pages.service.spec.ts` (27 test, độ phủ module 100% dòng); e2e `pages.e2e-spec.ts`, `admin-pages.e2e-spec.ts` (18 test).
  - Postman folder mới `13 - Pages` (14 request): danh sách và xem trang (vi, en), key không có (404), 401 khi chưa đăng nhập, 403 với Blog Owner, danh sách và chi tiết admin, lưu thiếu nội dung (400, kiểm tra field theo tab), ẩn trang `contact` rồi public trả 404, lưu lại nội dung cũ và hiện lại. Environment `local` thêm biến `pageSaveBody`, `pageHideBody` (lưu nội dung `contact` trước khi sửa để trả lại ở cuối folder, không đổi dữ liệu seed).
- Đăng nhập GitHub UC20 (A7), nhánh `feature/be-oauth`:
  - Package `passport-github2` (dev: `@types/passport-github2`).
  - Config `oauth.github { clientId, clientSecret, callbackUrl }` trong `AppConfig`, đọc từ `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`. Các biến này vẫn không bắt buộc: để trống thì backend chạy bình thường, chỉ log cảnh báo và đăng nhập GitHub không dùng được. Chú thích trong `env.validation.ts`, `.env.example` sửa "việc A6" thành "việc A7".
  - `GithubStrategy` (`modules/auth/strategies/github.strategy.ts`, tên strategy `github`): scope `user:email`, bật `allRawEmails` để có cờ `primary` / `verified` (mặc định `passport-github2` chỉ giữ email chính và bỏ cờ). Chỉ chuyển profile sang `OauthProfile` (`modules/auth/oauth.types.ts`: `provider`, `providerUserId`, `email`, `fullName`, `avatar`), không truy vấn database. Đăng ký trong `AuthModule`.
  - Chỉ nhận email **đã xác minh**, ưu tiên email chính, trim và viết thường như `RegisterDto` (`pickVerifiedEmail`). Không có email đã xác minh thì `email: null` (sau này báo `OAUTH_NO_EMAIL`). Lý do: UC20 liên kết theo email, nhận email chưa xác minh thì người khác thêm email của nạn nhân vào GitHub là đăng nhập được tài khoản blog của nạn nhân.
  - `GET /auth/github` (public): chuyển hướng 302 sang `github.com/login/oauth/authorize` (`GithubAuthGuard`).
  - `GET /auth/github/callback` (public, ẩn khỏi Swagger): luôn chuyển hướng về `${FRONTEND_URL}/oauth/callback`, không trả JSON. Thành công `?code=<mã>`; lỗi `?error=OAUTH_NO_EMAIL` (không có email đã xác minh), `?error=ACCOUNT_LOCKED`, `?error=OAUTH_FAILED` (người dùng bấm Cancel, GitHub lỗi, lỗi không lường trước — có ghi log). `GithubAuthGuard.handleRequest` không ném lỗi để `AllExceptionsFilter` không trả JSON giữa luồng chuyển hướng.
  - `POST /auth/oauth/exchange` (public): body `{ code }` (thiếu → 400 ở field `code`, “Vui lòng nhập trường này.”). Đổi mã dùng một lần (`GETDEL` key `auth:oauth-code:{code}`, 60 giây) lấy `{ accessToken, refreshToken, user }` như login. Mã sai, hết hạn hoặc đã dùng → 400 `OAUTH_CODE_INVALID` (“Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.”). Bị khóa trong lúc chờ đổi mã → 403 `ACCOUNT_LOCKED`.
  - `AuthService.oauthLogin`: đã liên kết `(provider, provider_user_id)` thì dùng tài khoản đó; chưa liên kết mà trùng email thì liên kết vào tài khoản đó; chưa có thì tạo tài khoản role `user`, `password_hash = NULL`, avatar là URL ảnh GitHub (bỏ nếu dài hơn 255 ký tự), họ tên lấy tên GitHub, ngắn hơn 2 ký tự thì lấy phần trước @ của email (`oauthFullName`, tối đa 150 ký tự). Tài khoản trùng email đang bị khóa thì 403, không ghi liên kết. Tài khoản trùng email đã liên kết một GitHub khác (unique `user_id, provider`) → 409 `OAUTH_FAILED` (“Tài khoản có email này đã liên kết với một tài khoản GitHub khác.”). Mã đổi token: 32 byte ngẫu nhiên base64url.
  - `UsersService` thêm `findByOauth`, `hasOauth`, `linkOauth`, `createFromOauth` (tạo user + `oauth_accounts` trong một transaction); inject thêm model `OauthAccount` và `Sequelize`.
  - Phần nền: `common/errors.ts` thêm mã `OAUTH_FAILED`, `OAUTH_CODE_INVALID`.
  - Phase 3 doc: mục 3.1 thêm 2 mã lỗi; mục 4.1 ghi quy tắc email đã xác minh, các `?error=` của callback, mã trả về của `exchange`; mục 8.3 A7 chuyển sang đang làm; mục 11 thêm tham số `state` của OAuth (chưa làm vì backend không dùng session).
  - Test: unit `github.strategy.spec.ts` (8 test: chọn email, chuẩn hóa, tên dự phòng bằng username, khởi tạo khi chưa cấu hình); `auth.service.spec.ts` thêm 19 test (`oauthLogin` 8 nhánh, `oauthFullName`, `oauthRedirectUrl`, `exchangeOauthCode`); `users.service.spec.ts` thêm 5 test.
  - E2E mới `test/oauth.e2e-spec.ts` (19 test): thay bước đổi code lấy token và bước đọc profile của `passport-github2` bằng hàm giả, còn guard, strategy, service, MySQL, Redis chạy thật. Kiểm tra: `GET /auth/github` 302 kèm `client_id`, `scope=user:email`, `redirect_uri`; callback tạo tài khoản mới (`password_hash` NULL, role `user`, avatar GitHub, dòng `oauth_accounts`), đăng nhập lần 2 không tạo thêm và không ghi đè họ tên, trùng email thì liên kết và mật khẩu cũ vẫn đăng nhập được, email chưa xác minh → `OAUTH_NO_EMAIL` và không liên kết vào tài khoản có sẵn, bị khóa → `ACCOUNT_LOCKED`, trùng email đã liên kết GitHub khác → `OAUTH_FAILED`, bấm Cancel / GitHub lỗi → `OAUTH_FAILED`; mã trong Redis TTL ≤ 60 giây; `exchange` trả token dùng được với `/auth/me`, `/auth/refresh`, `hasPassword = false` ở `/profile`, mã dùng lần 2 / sai → `OAUTH_CODE_INVALID`, thiếu hoặc sai kiểu `code` → 400 ở field `code`, bị khóa trước khi đổi mã → 403. `response-format.e2e-spec.ts` thêm nhóm OAuth. `test/helpers/setup-env.ts` đặt `GITHUB_*` cố định cho e2e, không dùng app OAuth trong `.env`.
  - Postman folder mới `11 - OAuth` (5 request): chuyển sang GitHub (302, tắt tự theo chuyển hướng), người dùng hủy (302 `?error=OAUTH_FAILED`), đổi mã sai, thiếu `code`, và "Đổi mã lấy token" chạy tay sau khi đăng nhập GitHub trên trình duyệt (biến môi trường mới `oauthCode`; rỗng thì request tự bỏ qua bằng `pm.execution.skipRequest()` nên `postman collection run` vẫn qua hết; đổi xong thì xóa `oauthCode` vì mã chỉ dùng một lần).

- Đăng nhập Google UC20 (A7), nhánh `feature/be-oauth`:
  - Package `passport-google-oauth20` (dev: `@types/passport-google-oauth20`).
  - Config `oauth.google { clientId, clientSecret, callbackUrl }` trong `AppConfig`, đọc từ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (đã có sẵn trong `env.validation.ts` và `.env.example`, vẫn không bắt buộc). Tách kiểu chung `OauthProviderConfig` dùng cho cả `github` và `google`.
  - `GoogleStrategy` (`modules/auth/strategies/google.strategy.ts`, tên strategy `google`): scope `profile`, `email`. Chuyển profile sang `OauthProfile`: `providerUserId` là `sub` của Google, chỉ nhận email có `email_verified = true` (dùng lại `pickVerifiedEmail`, trim và viết thường), không có thì `email: null`; họ tên lấy `displayName` đã trim; avatar lấy ảnh đầu tiên hoặc `null`. Chưa đặt `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` thì chỉ log cảnh báo. Đăng ký trong `AuthModule`.
  - Test: unit `google.strategy.spec.ts` (7 test: chuyển profile, email chưa xác minh, không có email, chuẩn hóa email, trim / thiếu họ tên, thiếu ảnh, khởi tạo khi chưa cấu hình).
  - Guard chung `OauthAuthGuard(provider, options)` (`modules/auth/guards/oauth-auth.guard.ts`) thay cho `GithubAuthGuard` riêng (đã xóa `github-auth.guard.ts`); export `GithubAuthGuard` và `GoogleAuthGuard`. Hành vi GitHub giữ nguyên: callback không ném lỗi, người dùng hủy hoặc provider lỗi thì `req.user = null` và ghi log `Đăng nhập <provider> lỗi: ...`. `GoogleAuthGuard` truyền `prompt=select_account` sang Google để luôn hiện màn chọn tài khoản.
  - Test: unit `oauth-auth.guard.spec.ts` (6 test: trả profile, hủy trả null, provider lỗi trả null kèm log, tham số `prompt` của Google, GitHub không thêm tham số).
  - `GET /auth/google` (public): chuyển hướng 302 sang `accounts.google.com/o/oauth2/v2/auth` với `scope=profile email`, `prompt=select_account` (`GoogleAuthGuard`). Chỉ chạy với callback `localhost` (Google không nhận callback là địa chỉ IP, requirements mục 9).
  - `GET /auth/google/callback` (public, ẩn khỏi Swagger): xử lý giống `/auth/github/callback`, luôn chuyển hướng về `${FRONTEND_URL}/oauth/callback` kèm `?code=<mã>` hoặc `?error=OAUTH_NO_EMAIL` / `ACCOUNT_LOCKED` / `OAUTH_FAILED` (người dùng hủy, Google lỗi). Đổi mã lấy token vẫn qua `POST /auth/oauth/exchange`.
  - E2E mới `test/oauth-google.e2e-spec.ts` (13 test): thay bước đổi code lấy token và bước đọc profile của cả `passport-google-oauth20` lẫn `passport-github2` bằng hàm giả, phần còn lại chạy thật. Kiểm tra: `GET /auth/google` 302 kèm `client_id`, `scope=profile email`, `prompt=select_account`, `redirect_uri`; callback tạo tài khoản mới (`password_hash` NULL, role `user`, avatar Google, dòng `oauth_accounts` provider `google`) và token đổi được dùng với `/auth/me`; đăng nhập lần 2 không tạo thêm; email Google viết hoa trùng tài khoản đăng ký bằng mật khẩu thì liên kết vào tài khoản đó; `email_verified = false` hoặc không có email → `OAUTH_NO_EMAIL` và không liên kết vào tài khoản có sẵn; không có tên Google thì họ tên lấy phần trước @; trùng email đã liên kết Google khác, bấm Cancel, Google lỗi → `OAUTH_FAILED`; cùng email đăng nhập qua GitHub rồi Google (và ngược lại) thì vẫn một tài khoản, hai dòng liên kết, không ghi đè họ tên. `test/helpers/setup-env.ts` đặt `GOOGLE_*` cố định cho e2e.
  - Postman folder `11 - OAuth` thêm 2 request: chuyển sang Google (302, kiểm tra `scope=profile email`, `prompt=select_account`) và người dùng hủy trên Google (302 `?error=OAUTH_FAILED`). Mô tả folder và request "Đổi mã lấy token" ghi cách đăng nhập bằng cả GitHub và Google (Google: chỉ `localhost`, email phải có trong Test users của app).
  - Phase 3 doc: mục 4.1 ghi `prompt=select_account` và giới hạn `localhost` của Google; mục 8.3 A7 chuyển sang đã xong, chờ PR.

- Hồ sơ cá nhân UC12 (A6), nhánh `feature/be-profile`:
  - Module mới `ProfileModule` (`ProfileController`, `ProfileService`), mọi route cần đăng nhập, chỉ thao tác trên tài khoản của người đang đăng nhập.
  - `GET /profile`: `fullName`, `email`, `avatar`, `role`, `hasPassword` (false với tài khoản OAuth chưa đặt mật khẩu). Không trả `passwordHash`.
  - `PATCH /profile`: body `{ fullName }`, 2-150 ký tự sau khi trim (“Họ tên từ 2 đến 150 ký tự.”, dùng lại `FullNameField` của UC01). Gửi kèm `email` hoặc `role` → 400 `VALIDATION_ERROR` ở field đó, không đổi gì. Trả hồ sơ sau khi sửa.
  - `POST /profile/avatar`: multipart field `file`, kiểm tra như `POST /uploads/images` (JPG/PNG/WEBP, MIME thật, tối đa 2MB), lưu vào `uploads/avatars/`, 200 trả `{ path, url }`. Lưu DB xong mới xóa ảnh cũ; lưu DB lỗi thì xóa ảnh vừa ghi. Avatar là URL ngoài (OAuth) thì không xóa gì.
  - `PATCH /profile/password`: body `{ currentPassword?, newPassword, confirmPassword }`, mật khẩu mới theo UC01. Đã có mật khẩu thì `currentPassword` bắt buộc (“Vui lòng nhập trường này.”) và phải đúng (“Mật khẩu hiện tại không đúng.”), sai → 400 `errors[{ field: "currentPassword" }]`. Tài khoản OAuth chưa có mật khẩu thì đặt mới không cần `currentPassword`. Thành công thì thu hồi mọi refresh token như UC03.
  - Đổi họ tên hoặc avatar thì xóa `cache:posts:` vì thẻ bài có `author { fullName, avatar }`; không xóa thì thẻ trong cache trỏ tới ảnh cũ đã xóa tới 5 phút.
  - `UsersService.findById` thêm tùy chọn `{ withPassword }`, thêm `UsersService.updateProfile(id, { fullName?, avatar? })`.
  - Test: unit mới `profile.service.spec.ts`, `users.service.spec.ts` thêm 2 test; e2e mới `test/profile.e2e-spec.ts` (401, 403 tài khoản bị khóa, `hasPassword`, trim họ tên, chặn email/role, avatar lưu và xóa file cũ, file giả mạo, quá 2MB, đổi mật khẩu và thu hồi refresh token, sai / thiếu mật khẩu hiện tại, tài khoản OAuth đặt mật khẩu, xóa cache bài viết); `response-format.e2e-spec.ts` thêm nhóm Profile. Postman folder mới `10 - Profile` (9 request, đăng nhập bằng tài khoản `{{regEmail}}` vừa đăng ký nên đổi mật khẩu không ảnh hưởng tài khoản seed), biến môi trường mới `userAccessToken`.
  - Phase 3 doc: mục 3.5 thêm dòng xóa cache khi đổi họ tên / avatar; mục 4.4 ghi mã trả về của avatar, lỗi khi gửi `email`/`role`, thu hồi refresh token khi đổi mật khẩu; mục 8: A6 chuyển sang đã xong, thêm ghi chú 21/11.

- Tìm kiếm toàn văn UC19 (A5), nhánh `feature/be-search`:
  - `GET /search` (public, `SearchController` trong `PostsModule`): `?q=` trim và chuẩn hóa NFC, 2-100 ký tự, sai hoặc thiếu → 400 `VALIDATION_ERROR` ở field `q` (“Từ khóa cần từ 2 đến 100 ký tự.”, khớp `invalid-feedback` của màn `public/search.html`). Phân trang như `GET /posts` (`limit` tối đa 50). Trả thẻ bài giống `GET /posts`.
  - Tìm bằng `MATCH (title, excerpt, content) AGAINST (:search IN BOOLEAN MODE)` trên FULLTEXT `ft_post_translations_search` (parser `ngram`), chỉ bản dịch `published` ở ngôn ngữ đang chọn, liên quan nhất trước rồi mới nhất trước. Từ khóa truyền bằng replacement, không nối chuỗi SQL.
  - Nhiều từ thì kết quả phải chứa đủ mọi từ: `toBooleanSearchTerm` tách từ ở mọi ký tự không phải chữ hoặc số (bỏ luôn toán tử `+ - < > ( ) ~ * " @`), thêm `+` trước mỗi từ, bỏ từ 1 ký tự vì ngắn hơn `ngram_token_size`. Không còn từ nào thì trả rỗng, không truy vấn. Gõ không dấu vẫn khớp bài có dấu (“lap trinh” ra bài “lập trình”). Không cache.
  - `PostsService.findCards` thêm tùy chọn `search`.
  - Phần nền: migration mới `20261117000001-rebuild-post-translations-fulltext` dựng lại `ft_post_translations_search` với `innodb_ft_enable_stopword = OFF` (đặt trong session của migration). `docker-compose.yml` thêm `--innodb_ft_enable_stopword=OFF` cho MySQL. Lý do: với parser `ngram`, MySQL bỏ khỏi index mọi token chứa stopword; danh sách mặc định có `a`, `i` và collation không phân biệt dấu, nên mọi cụm có a, à, ậ, i, ì... bị mất. Trên dữ liệu seed, trước khi sửa “REST API” không ra bài nào, còn “cơ sở dữ liệu” ra cả bài không liên quan. Cấu hình ở server để `TRUNCATE` (e2e), `OPTIMIZE`, `ALTER` dựng lại index không bật lại stopword. Sau khi pull cần chạy lại `docker compose up -d` (tạo lại container, dữ liệu giữ nguyên) và `npm run db:migrate`.
  - Test: unit `posts.service.spec.ts` thêm nhóm UC19 (ghép từ AND, bỏ toán tử, chữ NFD, từ 1 ký tự, replacement, thứ tự, phân trang, không cache, `findCards` không có `search`); e2e mới `test/search.e2e-spec.ts` chạy trên MySQL thật (có dấu, không dấu, AND, từ có a/i, tiêu đề / tóm tắt / nội dung, độ liên quan, chỉ `published` đúng ngôn ngữ, toán tử không gây 500, phân trang, validate); `response-format.e2e-spec.ts` thêm nhóm Search. Postman folder mới `09 - Search` (7 request; ban đầu là `07 - Search`, đổi số khi merge `dev` vì trùng `07 - Public Categories`).
  - Phase 3 doc: mục 4 ghi cách ghép từ, cách tách từ, không cache; mục 8: A5 chuyển sang đã xong, thêm ghi chú 17/11; mục 11: MySQL của server phase 5 phải tắt stopword.

- Bình luận UC08 (B4), nhánh `feature/be-comment`:
  - Module mới `CommentsModule` (`CommentsController`, `CommentsService`). Không cache, luôn đọc dữ liệu mới nhất.
  - `GET /post-translations/:id/comments` (public, optionalAuth): bình luận gốc mới nhất trước, phân trang mặc định 20, `limit` > 50 → 400; mỗi bình luận gốc kèm `replies` (cũ nhất trước), lấy chung một truy vấn cho cả trang. Mỗi bình luận có `id`, `parentId`, `content`, `createdAt`, `author { fullName, avatar, isPostAuthor }`, `canDelete`. Bản dịch không có hoặc chưa `published` → 404.
  - `POST /post-translations/:id/comments` (đăng nhập): body `{ content, parentId? }`. `content` 1-1000 ký tự sau khi trim (“Bình luận phải có từ 1 đến 1000 ký tự.”), có thẻ HTML → 400 (“Bình luận chỉ được là văn bản thuần, không chứa thẻ HTML.”). `parentId` không phải bình luận gốc của cùng bản dịch → 400 ở field `parentId`. Bản dịch hoặc bình luận cha bị xóa đúng lúc đang lưu (lỗi khóa ngoại) vẫn trả 404 / 400 như trên, không thành 409. 201, trả bình luận vừa tạo.
  - `DELETE /comments/:id` (đăng nhập): người viết, Blog Owner là tác giả bài, hoặc Super Admin; người khác → 403 `FORBIDDEN`, không có → 404. Xóa bình luận gốc thì xóa luôn trả lời (CASCADE).
  - Quyền xóa dùng chung ở `modules/comments/comment-permissions.ts` (`canDeleteComment`, `canModeratePostComments`): tác giả bài chỉ có quyền xóa bình luận của người khác khi còn role `blog_owner` (ma trận phân quyền requirements mục 5).
  - Test: unit `comments.service.spec.ts`, `create-comment.dto.spec.ts` (service phủ 100% dòng); e2e mới `test/comments.e2e-spec.ts`; `response-format.e2e-spec.ts` thêm nhóm Comments. Postman folder mới `08 - Comments` (11 request; biến môi trường `commentTranslationId`, `commentId`, `replyId`).

- Danh mục công khai UC07 (C2), nhánh `feature/be-categories-public-c2`:
  - `CategoriesController` và `CategoriesService` thêm vào `CategoriesModule` (module import thêm `LanguagesModule`, `PostsModule`, model `PostTranslation`). Cả 3 route đều public.
  - `GET /categories`: mọi danh mục, sắp theo `id`. Mỗi dòng có `id`, `name`, `slug` theo ngôn ngữ đang chọn (thiếu thì dùng ngôn ngữ mặc định) và `postCount` (số bản dịch `published` ở ngôn ngữ đang chọn, đếm cho mọi danh mục bằng một truy vấn `GROUP BY`). Cache `cache:categories:list:{code}` 10 phút.
  - `GET /categories/:slug`: tìm theo slug của ngôn ngữ đang chọn. Danh mục chưa có tên ở ngôn ngữ đó thì nhận slug của ngôn ngữ mặc định; slug mặc định của danh mục đã có bản dịch thì 404. Trả `id`, `name`, `slug`, `postCount`, `translations [{ code, slug }]` (ngôn ngữ đang hoạt động có bản dịch). Không có → 404 `NOT_FOUND` (“Không tìm thấy danh mục”). Cache `cache:categories:detail:{code}:{slug}` 10 phút.
  - `GET /categories/:slug/posts`: thẻ bài như `GET /posts`, lọc theo danh mục, mới nhất trước, phân trang mặc định 10, `limit` > 50 → 400; tìm danh mục theo cùng quy tắc slug như trên. Dùng lại `PostsService.findCards`. Cache `cache:posts:category:{code}:{categoryId}:{page}:{limit}` 5 phút.
  - Các key nằm dưới prefix `cache:categories:` và `cache:posts:`, nên đã được admin bài viết (A3) và admin danh mục (B3) xóa khi ghi.
  - Phần nền: `RedisKeys.categoriesList`, `RedisKeys.categoryDetail`, `RedisKeys.categoryPosts` trong `common/utils/redis-keys.ts`. Response DTO `PublicCategoryDto`, `PublicCategoryDetailDto`.
  - Test: unit `categories.service.spec.ts` (10 test, service phủ 95% dòng); e2e mới `test/categories.e2e-spec.ts` (11 test: danh sách rỗng, `postCount`, tên dự phòng, chi tiết và `translations`, slug dự phòng, phân trang, chỉ bản `published`, 400, 404). Postman folder mới `07 - Public Categories` (9 request).
  - Phase 3 doc mục 8: C2 chuyển sang đã xong, thêm ghi chú 20/11 (việc đang chặn vẫn là B6).

- Quản lý danh mục UC15 (B3), nhánh `feature/be-categories`:
  - Module mới `CategoriesModule` (`AdminCategoriesController`, `AdminCategoriesService`), chỉ Super Admin; route public UC07 thêm vào module này ở việc C2.
  - `GET /admin/categories`: phân trang, mỗi dòng `id`, `translations [{ code, name, slug }]` (ngôn ngữ mặc định đứng đầu, ngôn ngữ chưa có tên thì không có trong mảng), `postCount` (bài mọi trạng thái), `createdAt`, `updatedAt`. `?q=` tìm `LIKE` trong tên ở mọi ngôn ngữ (có `escapeLike`), khớp ô tìm của màn `admin/categories.html`. Bản dịch và số bài của cả trang lấy bằng 2 truy vấn gộp.
  - `POST /admin/categories`: body `{ names: { vi, en, ... } }`. Tên ngôn ngữ mặc định bắt buộc (“Nhập tên danh mục ở ngôn ngữ mặc định (Tiếng Việt).”), tên khác rỗng dài 2-150 ký tự, mã ngôn ngữ không có → 400; lỗi ghi field `names.<code>`, báo mọi lỗi một lần. Tên rỗng thì không tạo dòng `category_translations`. Slug tự sinh, trùng trong cùng ngôn ngữ thì thêm `-2`. Tạo danh mục và bản dịch trong một transaction. 201.
  - `PATCH /admin/categories/:id`: ràng buộc như POST; ngôn ngữ không gửi thì giữ nguyên, tên rỗng ở ngôn ngữ không mặc định thì xóa bản dịch, đổi tên thì sinh lại slug. Không có → 404.
  - `DELETE /admin/categories/:id`: còn bài → 409 `CATEGORY_IN_USE` (“Danh mục đang có N bài viết. Chuyển các bài viết sang danh mục khác rồi thử xóa lại.”, khớp hộp “Không thể xóa” của màn HTML); bản dịch xóa theo khóa ngoại CASCADE. Không có → 404.
  - Mọi thao tác ghi xóa cache `cache:categories:` và `cache:posts:`.
  - Test: unit `admin-categories.service.spec.ts` (16 test, service phủ 100% dòng); e2e mới `test/admin-categories.e2e-spec.ts` (401, 403, validate, slug trùng, `q`, 404, 409, xóa cache); `response-format.e2e-spec.ts` thêm nhóm Admin Categories. Postman folder mới `06 - Admin Categories` (9 request, tự dọn danh mục vừa tạo; biến `newCategoryId`, `usedCategoryId`).
  - Phase 3 doc: mục 4.6 ghi thêm `?q=` và cách PATCH xử lý ngôn ngữ không gửi; mục 8: B3 chuyển sang đã xong, thêm ghi chú 16/11 (C2 bắt đầu được, việc đang chặn còn B6).
  - Lệch cần sửa sau: màn `admin/categories.html` đặt `maxlength="100"` cho ô tên, còn doc và cột DB là 150; backend theo doc (150).

- Chi tiết bài viết UC06 (A4), nhánh `feature/be-post-detail`:
  - `GET /posts/:slug` (public, `optionalAuth`): bản dịch `published` có slug này ở ngôn ngữ đang chọn; không có, đang `draft` / `archived`, hoặc slug thuộc ngôn ngữ khác → 404 `NOT_FOUND`. Trả `translationId`, `slug`, `title`, `excerpt`, `content`, `thumbnail`, `category { name, slug }` (thiếu tên ở ngôn ngữ đang chọn thì dùng ngôn ngữ mặc định), `author { fullName, avatar }`, `publishedAt`, `viewCount`, `readingMinutes`, `commentCount` (gồm cả trả lời), `availableLanguages [{ code, name, slug }]` (ngôn ngữ đang hoạt động có bản `published`, gồm cả ngôn ngữ đang xem, mặc định đứng đầu), `canDeleteComments` (tác giả bài hoặc Super Admin; khách hoặc token lỗi thì `false`). Không cache.
  - Lượt xem: `SET view:{translationId}:{ip} NX EX 3600`, chỉ khi đặt được key mới `viewCount + 1`, nên mỗi IP tính 1 lần / giờ / bản dịch kể cả khi gửi hai request cùng lúc. IP lấy từ `req.ip` (đã `trust proxy` loopback). `viewCount` trả về đã gồm lượt vừa tính. Không xóa cache danh sách.
  - `GET /posts/:slug/related` (public): tối đa 4 bài cùng danh mục, có bản dịch `published` ở ngôn ngữ đang chọn, bỏ bài đang xem, mới nhất trước; dùng lại `PostsService.findCards` (thêm tùy chọn `excludePostId`). Slug không có → 404. Không tăng lượt xem.
  - Response DTO `PublicPostDetailDto`, `PostAvailableLanguageDto`. `PostsModule` đăng ký thêm model `Comment`; `PostsService` inject `RedisService` để dùng `SET NX`.
  - Test: unit `posts.service.spec.ts` thêm nhóm UC06 (404, đủ trường, `availableLanguages`, lượt xem tính / không tính, tên danh mục dự phòng, `canDeleteComments` theo 5 loại người xem, related); e2e mới `test/post-detail.e2e-spec.ts`; `response-format.e2e-spec.ts` thêm nhóm Posts. Postman folder `05 - Public Posts` thêm 6 request UC06 (dùng slug của dữ liệu seed; mỗi request tự đặt `Accept-Language` bằng pre-request script vì slug gắn với một ngôn ngữ, script cấp collection ghi đè header theo `{{lang}}`).
  - Phase 3 doc mục 8: A4 chuyển sang đã xong, thêm ghi chú 15/11 (việc đang chặn: B3, B6). Mục 11: ghi việc phase 5 phải đặt `trust proxy` theo dải mạng của Nginx, nếu không lượt xem UC06 và rate limit đăng nhập sẽ coi mọi người là một IP.

- Danh sách bài viết công khai UC05 (C1), nhánh `feature/be-posts-public` (hoàn thiện từ `feature/be-home`):
  - `GET /posts` (public): bản dịch `published` ở ngôn ngữ đang chọn, mới nhất trước (`publishedAt`, rồi `id`), phân trang mặc định 10, `limit` > 50 → 400. Mỗi thẻ: `slug`, `title`, `excerpt`, `thumbnail`, `category { name, slug }` (thiếu tên ở ngôn ngữ đang chọn thì dùng ngôn ngữ mặc định, không có cả hai thì `null`), `author { fullName, avatar }`, `publishedAt`, `viewCount`, `readingMinutes` (số chữ đã bỏ thẻ / 200, làm tròn lên, tối thiểu 1). Cache `cache:posts:list:{code}:{page}:{limit}` 5 phút.
  - `GET /posts/popular` (public): `?limit=` 1-10, mặc định 5, theo `viewCount` giảm dần. Cache `cache:posts:popular:{code}:{limit}` 5 phút. Cả hai key bị xóa khi thêm, sửa, xóa bài hoặc bản dịch (prefix `cache:posts:`, đã có ở A3).
  - `PostsService.findCards(language, { limit, offset, order, categoryId? })` dùng chung, `PostsModule` export `PostsService` để C2 (`GET /categories/:slug/posts`) dùng lại. Tên danh mục lấy bằng một truy vấn cho cả trang; ngôn ngữ mặc định lấy từ `LanguagesService.findActive()` (có cache). Response DTO `PublicPostCardDto`.
  - Phần nền: `RedisKeys.postsList`, `RedisKeys.postsPopular` trong `common/utils/redis-keys.ts`.
  - Test: unit `posts.service.spec.ts` (thêm key cache, tên danh mục ưu tiên ngôn ngữ đang chọn, `category = null`, lọc `categoryId`, `calculateReadingMinutes`); e2e `test/posts.e2e-spec.ts` (thêm: lần gọi thứ hai lấy từ cache, tạo bài qua `POST /admin/posts` thì danh sách và popular thấy ngay; bỏ mock `sanitize-html` vì `npm run test*` đã nạp được bản ESM). Postman folder mới `05 - Public Posts` (5 request).
  - Chạy thử migrate, seed, rollback trên database trống (việc còn lại của phase 1): `db:migrate` tạo đủ 12 bảng; `db:seed` nạp 3 role, 2 ngôn ngữ, 4 tài khoản, 5 danh mục, 30 bài / 43 bản dịch, 11 bình luận, 748 dòng UI translation (374 key × 2), 3 trang tĩnh, 23 ảnh mẫu; `db:seed:undo` xóa hết dữ liệu và ảnh; `db:migrate:undo:all` xóa hết bảng; chạy lại cả chu trình lần hai không lỗi.
  - Phase 3 doc mục 8: C1 chuyển sang đã xong. A3 cũng chuyển sang đã xong (PR bản dịch #48, #49, #50 đã merge nhưng bảng chưa cập nhật); thêm ghi chú 14/11: việc đang chặn nhiều người nhất là A4 (chặn C3) và B3 (chặn C2).
  - Sửa lỗi lint `no-unsafe-call` có sẵn ở `test/admin-posts.e2e-spec.ts` (khai báo kiểu cho `body.data`) để `npm run lint` qua.

- Quản lý ngôn ngữ UC16 và bản dịch giao diện UC17 (B2), nhánh `feature/be-languages-ui-translations`:
  - UC16, Super Admin: `GET /admin/languages` (mọi ngôn ngữ kèm `postTranslationCount`), `POST /admin/languages` (`code` theo ISO 639-1, trùng → 409 ở field `code`; `name` tối đa 50 ký tự; `isActive` không gửi thì là `true`; sao chép mọi `ui_translations` của ngôn ngữ mặc định sang ngôn ngữ mới trong cùng transaction), `PATCH /admin/languages/:id` (chỉ `name`, `isActive`; gửi `code` → 400; tắt ngôn ngữ mặc định → 400), `PATCH /admin/languages/:id/default` (bỏ mặc định cũ trong cùng transaction; ngôn ngữ đang tắt → 400), `DELETE /admin/languages/:id` (mặc định → 400; đang có bản dịch bài → 409 `LANGUAGE_IN_USE`). Mọi thao tác ghi xóa toàn bộ `cache:`.
  - UC17: `GET /ui-translations/:code` (public, object `{ key: value }` đã điền giá trị mặc định cho key chưa dịch, mã không có hoặc đã tắt → 404, cache `cache:ui:{code}`); Super Admin: `GET /admin/ui-translations` (`?q=` tìm theo key hoặc giá trị, phân trang theo key, mặc định 50), `POST /admin/ui-translations` (`key` dạng `nhom.ten` tối đa 100 ký tự, trùng → 409 ở field `key`; thiếu giá trị ngôn ngữ mặc định → 400 ở `values.<code>`; giá trị tối đa 255 ký tự), `PUT /admin/ui-translations/:key/:code` (rỗng ở ngôn ngữ không mặc định thì xóa dòng, rỗng ở ngôn ngữ mặc định → 400 ở `value`), `DELETE /admin/ui-translations/:key`. `values` chỉ gồm các ngôn ngữ đang hoạt động, khớp màn `admin/ui-translations.html`. Mọi thao tác ghi xóa `cache:ui:`.
  - Phần nền: thêm `src/common/iso-639-1.ts` (danh sách mã ISO 639-1). Module mới `UiTranslationsModule`; `LanguagesModule` thêm `AdminLanguagesController`, `AdminLanguagesService`.
  - Test: unit `admin-languages.service.spec.ts`, `ui-translations.service.spec.ts`; e2e `admin-languages.e2e-spec.ts`, `ui-translations.e2e-spec.ts`; `response-format.e2e-spec.ts` thêm nhóm Admin Languages và UI Translations. Postman: folder `01 - Languages` thêm 13 request UC16, folder mới `04 - UI Translations` (14 request); các request ghi tự dọn dữ liệu ở cuối.
  - Phase 3 doc: B2 chuyển sang đã xong, mục 4.6 ghi thêm giới hạn độ dài và phạm vi của `values`.
- Cấu hình Claude Code cho repo:
  - `CLAUDE.md` ở gốc: tổng quan dự án, lệnh chạy và test, bảng trỏ tới đúng mục trong `docs/`.
  - `.claude/rules/`: `backend.md` (chỉ nạp khi sửa `backend/**`), `html.md` (chỉ nạp khi sửa `html/**`), `git-workflow.md` (nhánh, commit, changelog, mô tả PR, cách gỡ conflict).
  - `.claude/skills/`: `new-backend-module` (làm một module API theo mẫu `languages`), `new-html-page` (dựng một màn từ `_templates/`), `pr-ready` (kiểm tra nhánh trước khi tạo PR và soạn mô tả PR).
  - `.claude/settings.json`: cho phép sẵn các lệnh lint, test, i18n, build; hỏi lại trước khi rollback migration, xóa seed, `docker compose down`; chặn đọc và sửa `backend/.env`. `.gitignore` bỏ qua `.claude/settings.local.json`.
- Quản lý bản dịch bài viết UC13 (A3, PR 2/2):
  - `POST /admin/posts/:id/translations` (ngôn ngữ đã có bản dịch → 409), `PATCH /admin/posts/:id/translations/:code` (trường không gửi thì giữ nguyên; đổi tiêu đề thì sinh lại slug; `publishedAt` chỉ ghi lần đầu chuyển sang `published`; bản dịch ở ngôn ngữ đã tắt vẫn sửa được), `DELETE /admin/posts/:id/translations/:code` (xóa kèm bình luận; bản gốc → 400 `ORIGINAL_TRANSLATION_REQUIRED`). Mọi thao tác xóa cache `posts` + `categories`.
  - `POST /admin/posts` nhận thêm `translations[]` (không bắt buộc) để tạo bài, bản gốc và các bản dịch trong cùng một transaction, khớp màn viết bài mới soạn được bản dịch (góp ý của mentor). Bản dịch trùng ngôn ngữ gốc hoặc trùng nhau → 400 ở `translations.N.languageCode`. Phase 3 doc mục 4.5 cập nhật theo.
  - DTO `CreateTranslationDto`, `UpdateTranslationDto`. Unit test và e2e cho các ràng buộc trên; Postman folder `03 - Admin Posts` thêm 5 request bản dịch.
- Ô "Bản dịch" ở `admin/post-create.html` đổi từ nhóm checkbox sang dropdown chọn nhiều (UC13, theo góp ý của mentor: nhóm checkbox chiếm chỗ, nhiều ngôn ngữ thì các hàng không thẳng cột):
  - Component `multi-select` (`scss/components/_multi-select.scss`, `js/multi-select.js`): khung giống `.form-select`, ngôn ngữ đã chọn hiện thành chip có nút bỏ chọn; khung luôn cao một dòng: hiện tối đa 3 chip (ít hơn nếu khung hẹp, tính lại khi đổi cỡ màn hình), còn lại gộp vào chip "+N" (rê chuột vào để xem tên); chọn hết thì hiện "Tất cả (N ngôn ngữ)". Menu có ô tìm (không phân biệt hoa/thường và dấu), "Chọn tất cả" (theo kết quả đang lọc, có trạng thái chọn một phần), danh sách cuộn, dòng "Không tìm thấy ngôn ngữ".
  - Thêm 5 ngôn ngữ demo (Français, Deutsch, 日本語, 한국어, 中文) vào ô "Ngôn ngữ gốc" và ô "Bản dịch" để thấy được ô tìm, chip "+N" và "Tất cả". Tab + form của các ngôn ngữ này dựng từ `<template id="postTranslationTemplate">` (`post-language-select.js`), không chép tay từng bản.
  - Checkbox của ngôn ngữ gốc bị disabled và bỏ chọn thay vì chỉ ẩn. Bỏ class `.post-form__translations`, thuộc tính `data-lang-option`.
  - Trạng thái demo mới "Nhiều bản dịch" (`?demo=translations`): chọn 4 bản dịch và mở sẵn menu. `demo-state.js`: `data-demo-dropdown="<trạng thái>"` trên nút `data-bs-toggle="dropdown"` tự mở dropdown ở trạng thái đó.
  - UI translation mới: `admin.post_form.translation_placeholder`, `translation_search`, `translation_count`, `translation_no_match`, `common.select_all`, `common.deselect`. `html/README.md`, phase 2 doc: cập nhật dòng `post-create` và bảng "Có sẵn để dùng".
- `README.md` ở gốc repo: giới thiệu ngắn, bảng link tới các tài liệu trong `docs/` và README của `html/`, `backend/`, link bản deploy, địa chỉ local (API, Swagger, Adminer, RedisInsight), lệnh chạy nhanh, cấu trúc thư mục.
- Quản lý bài viết UC13 phần bài + bản gốc (A3, PR 1/2):
  - `GET/POST /admin/posts`, `GET/PATCH/DELETE /admin/posts/:id` (Blog Owner / Super Admin, chỉ bài của chính mình). Lọc danh sách bằng EXISTS; tạo bài và bản gốc trong transaction; sanitize HTML, slug, xóa cache `posts` + `categories`; đổi/bỏ thumbnail thì xóa file cũ.
  - Module `posts` (`AdminPostsController` / `AdminPostsService`), DTO, `escapeLike`, mã lỗi `ORIGINAL_TRANSLATION_REQUIRED` (dùng cho PR bản dịch).
  - Unit test `admin-posts.service.spec.ts`, e2e `test/admin-posts.e2e-spec.ts`; Postman folder `03 - Admin Posts` (biến `categoryId`, `postId`). API bản dịch để PR sau.
- Seeders phase 3 (B1), `npm run db:seed` / `db:seed:undo`:
  - 8 seeder theo phase 3 doc mục 5: 3 role, 2 ngôn ngữ, 4 tài khoản (mật khẩu chung `Password123`, user Github không có mật khẩu), 5 danh mục ("Đời sống" chỉ có tên `vi`, "Tin tức" chưa có bài), 30 bài / 43 bản dịch (đủ `draft`, `published`, `archived`; bài "Hướng dẫn Angular" dùng đủ định dạng của editor), 11 bình luận, 369 key UI translation `vi` + `en`, 3 trang tĩnh song ngữ.
  - Ảnh mẫu: SVG ở `html/assets/img/` chuyển sang PNG trong `backend/database/seed-data/images/`, seeder copy vào `UPLOAD_DIR` với tên UUID cố định khớp quy tắc upload; rollback xóa file.
  - `backend/database/seed-helpers.js`: tra ngôn ngữ theo mã, chặn id trùng, copy/xóa ảnh mẫu. Khi `NODE_ENV=production` bỏ qua dữ liệu demo (tài khoản, danh mục, bài, bình luận), chỉ nạp dữ liệu hệ thống.
  - Rollback kiểm tra dữ liệu phụ thuộc trước khi xóa (ví dụ không xóa ngôn ngữ khi trang tĩnh còn dùng).
- `backend/scripts/extract-i18n.mjs` (`npm run i18n:extract`, `npm run i18n:check`): quét `data-i18n`, `data-i18n-<thuộc tính>`, `data-loading-i18n` trong `html/` và key gán trong `html/js/`, ghi `backend/database/seed-data/ui-translations.json` (giữ bản dịch `en` khi chạy lại); báo key trùng mà khác chữ, key thiếu `en`. Chữ có dữ liệu động dùng mẫu `{{ten}}` kèm trường `sample`.
- `docs/phase-3-backend.md` mục 8: cách đọc bảng, trạng thái từng việc, bảng thứ tự chung theo đợt (8.2).
- Ô "Bản dịch" dạng checkbox ở `admin/post-create.html` (UC13, theo góp ý của mentor), thay cho ô select "Ngôn ngữ đang soạn":
  - Nằm cạnh ô "Ngôn ngữ gốc", mỗi ngôn ngữ một checkbox (ẩn ngôn ngữ gốc). Tick ngôn ngữ nào thì có tab soạn ngôn ngữ đó (dùng lại `.translation-tabs` của `post-edit`) và mở luôn tab đó; bỏ tick thì ẩn tab, khóa ô nhập của bản dịch đó, đang mở thì về tab gốc.
  - Ô chọn ngôn ngữ trong modal xem trước dựng từ các tab đang hiện, chỉ một tab thì ẩn.
  - `demo-state.js`: `<input type="checkbox" data-demo-checked="<trạng thái>">`; chọn tab (`data-demo-tab`) chạy trước khi mở modal demo.
  - UI translation: bỏ `admin.post_form.editing_language`.
- `docs/phase-3-huong-dan.md`: hướng dẫn từng bước cho phase 3 (cài Docker Desktop, Postman CLI; chạy MySQL/Redis, điền `.env`, migrate, chạy app, kiểm tra bằng Swagger; quy trình làm một module theo mẫu `languages` từ DTO đến e2e test và Postman; checklist PR; Git và cách gỡ conflict `app.module.ts`, Postman collection; lỗi hay gặp). Link từ phase 3 doc mục 8 và `backend/README.md`.
- Chọn ngôn ngữ đang soạn ở `admin/post-create.html` (UC13, theo góp ý của mentor: sửa bài dùng tab, tạo bài dùng select):
  - Ô "Ngôn ngữ đang soạn" dưới phần dùng chung, mỗi ngôn ngữ một form bản dịch (tiêu đề, tóm tắt, trạng thái, editor), chỉ hiện form đang chọn. Chữ "Bản gốc" / "Bản dịch" trong ô chọn và ở đầu form đổi theo ô "Ngôn ngữ gốc"; form bản dịch có ghi chú "Bản dịch không bắt buộc".
  - Tên ô nhập đổi thành `translations[vi][title]`, `translations[en][title]`... như `post-edit`.
  - Xem trước theo ngôn ngữ: modal có ô chọn ngôn ngữ ngay sau tiêu đề, đồng bộ hai chiều với ô "Ngôn ngữ đang soạn"; đổi ngôn ngữ khi modal đang mở thì dựng lại bản xem trước. `<html lang>` của iframe theo ngôn ngữ đang xem.
  - Trạng thái demo mới: "Soạn bản dịch", "Xem trước bản dịch" (`?demo=translation`, `?demo=preview-translation`), bản dịch English đã điền của bài Hà Giang.
  - `js/post-language-select.js`, component `post-language-select`, class `.post-form__language`, `.post-preview__language`. `html/README.md`, phase 2 doc: cập nhật dòng `post-create`.
- `demo-state.js`: `<option data-demo-select="<trạng thái>">` tự chọn option ở trạng thái đó và phát sự kiện `change` (chạy trước khi mở modal demo).
- Xem trước bài viết ở `admin/post-create.html` và `admin/post-edit.html` (UC13, theo góp ý của mentor):
  - Nút "Xem trước" trên thanh trên (màn hẹp chỉ có icon), mở modal toàn màn hình. Bài hiện như trang chi tiết bài viết (tiêu đề, tóm tắt, tác giả, danh mục, thời gian đọc, thumbnail, nội dung), trạng thái bài ghi cạnh tiêu đề modal.
  - Nút đổi cỡ Desktop / Mobile (từ màn `md`). Bản xem trước nằm trong iframe nạp cùng CSS và theme nên media query chạy theo khung: khung mobile rộng 390px có viền như điện thoại. Màn hẹp hơn `md` thì luôn hiện cỡ của màn đó.
  - Trạng thái demo mới: "Xem trước (desktop)", "Xem trước (mobile)" (`?demo=preview`, `?demo=preview-mobile`), dùng dữ liệu của form đã điền (`post-create`) hoặc tab gốc (`post-edit`).
  - `post-edit`: xem trước bản dịch của tab đang mở (tiêu đề, tóm tắt, trạng thái, nội dung lấy trong `.tab-pane.active`; danh mục, thumbnail lấy từ phần dùng chung). `post-preview.js` tìm ô theo `name="title"` hoặc `name="translations[xx][title]"`.
  - `js/post-preview.js`, component `post-preview` (`scss/components/_post-preview.scss`). `html/README.md`: thêm vào bảng "Có sẵn để dùng". Phase 2 doc: cập nhật dòng `post-create`.

- Màn bản dịch giao diện và sửa trang tĩnh (B5), khung admin, chỉ Super Admin (`data-demo-auths="super_admin"`):
  - `admin/ui-translations.html` (UC17): ô tìm theo key/giá trị, số key và số ô thiếu bản English; bảng cột key (font đơn cách), mỗi ngôn ngữ một cột, ô là nút bấm để sửa tại chỗ, ô thiếu giá trị nền nhạt + chữ xám "Chưa có, dùng: <giá trị mặc định>"; nút xóa key mở hộp xác nhận. Modal "Thêm key" (key, giá trị Tiếng Việt bắt buộc, English không bắt buộc). Trạng thái demo: bình thường, loading (skeleton), rỗng (không tìm thấy key), đang sửa ô, đang lưu, key trùng, đang xóa.
  - `admin/page-edit.html` (UC18): link về danh sách trang tĩnh; key và URL public chỉ đọc, switch "Hiển thị" áp dụng cho mọi ngôn ngữ; nút "Xem trên trang public" (mở `public/page.html?key=about` ở tab mới) và "Lưu"; tab ngôn ngữ dùng lại component `translation-tabs` của `post-edit`, mỗi tab có tiêu đề và rich text editor chép từ `admin/post-create.html`. Trạng thái demo: bình thường, lỗi tab mặc định (thiếu tiêu đề), lỗi điền thiếu ở tab English ("điền đủ cả hai hoặc để trống cả hai"), tab có lỗi có chấm đỏ và được chọn sẵn (`data-demo-tab`), đang lưu, đã lưu (toast).
  - Component `ui-translation-table`, `page-edit`.
  - `html/index.html`: hai màn thành link, badge "Đã xong". `html/README.md`: thêm bảng bản dịch giao diện, form sửa trang tĩnh vào bảng "Có sẵn để dùng". Phase 2 doc: hai màn và B5 đánh dấu đã làm. `SCREENS.md`: B5 đã xong (B 14/14).
- Xác thực UC01-UC04 (A2), module `auth` và `users`:
  - `POST /auth/register` (role `user`, email trùng → 409 kèm `errors[{ field: "email" }]`), `POST /auth/login` (sai email/mật khẩu cùng một thông báo `INVALID_CREDENTIALS`, bị khóa `ACCOUNT_LOCKED`, quá 5 lần sai / 15 phút theo IP + email → 429, đăng nhập đúng thì xóa bộ đếm), `POST /auth/refresh` (xoay vòng, refresh token cũ dùng lại → 401 `TOKEN_EXPIRED`), `POST /auth/logout`, `POST /auth/forgot-password` (luôn cùng message, token 15 phút, 3 lần / 15 phút / IP), `POST /auth/reset-password` (token dùng một lần, thu hồi mọi phiên), `GET /auth/me`.
  - `TokenService`: refresh token ký bằng secret riêng, lưu `auth:refresh:{jti}` và `auth:user-refresh:{userId}`; `revokeAll(userId)` để B5 (UC14) dùng khi khóa tài khoản.
  - DTO dùng câu lỗi của màn HTML phase 2; `@Match()` cho xác nhận mật khẩu.
  - Unit test `AuthService`, `TokenService`, `UsersService`; e2e `test/auth.e2e-spec.ts`; Postman folder `00 - Auth` (13 request, lưu `accessToken`, `ownerAccessToken`, `adminAccessToken`).
  - Bảo mật dependency: `sanitize-html` lên 2.18 (sửa các lỗi XSS đã công bố), `multer` lên 2.5.0 qua `overrides`. Lệnh `test*` chạy Jest với `--experimental-vm-modules` để nạp được `htmlparser2` ESM.
- Khung backend phase 3 (A1), thư mục `backend/`:
  - `docker-compose.yml` ở gốc repo: `mysql:8.4` (`utf8mb4`, tạo sẵn `blog_dev`, `blog_test`, user `blog`) và `redis:7`; đổi cổng host bằng `MYSQL_HOST_PORT`, `REDIS_HOST_PORT` khi máy đã cài sẵn MySQL/Redis.
  - Project NestJS 11 (TypeScript strict, plugin Swagger của Nest CLI), `.env.example` đủ biến ở mục 7.3, validate bằng Joi lúc khởi động. `NODE_ENV=test` tự dùng `blog_test` và Redis db 1.
  - 12 migration theo `database.dbml` (khóa ngoại RESTRICT/CASCADE như ERD, FULLTEXT `ngram` trên `post_translations`), `database/config.js` cho 3 môi trường; model `sequelize-typescript` cho 12 bảng (`User` mặc định không lấy `password_hash`).
  - Phần nền: `TransformInterceptor` + `@ResponseMessage`, `AllExceptionsFilter` (thêm `code`, lỗi unique → 409, lỗi 500 không trả stack), `ValidationPipe` trả `errors[]` dạng `translations.0.title`, `PaginationQueryDto` + `paginate()`, `JwtAuthGuard` global (`@Public`, `optionalAuth`, kiểm tra `is_active` cache 60 giây), `RolesGuard` có kế thừa role, `LanguageMiddleware` + `@CurrentLanguage`, `CacheService` (xóa theo prefix bằng `SCAN`), `redis-keys.ts`, throttler lưu trong Redis, helmet, CORS, upload ảnh `POST /uploads/images` (đuôi + magic bytes + 2MB, tên UUID, phục vụ tĩnh tại `/uploads`), `sanitizeRichText`, `generateUniqueSlug`, `MailService`, Swagger tại `/api-docs`.
  - Module mẫu `languages`: `GET /api/v1/languages`.
  - Test: unit test cho tiện ích, guard, service (độ phủ tầng service ≥ 70%, cấu hình trong Jest); e2e với helper `createTestApp`, `resetDatabase`, `tokenFor(role)`; `test/response-format.e2e-spec.ts`.
  - Khung Postman `docs/postman/` (collection + environment), chạy được bằng `postman collection run`.
  - `backend/README.md`: cách chạy, lệnh, cách viết module mới.
- `docs/phase-3-backend.md`: kế hoạch phase 3 (backend NestJS, 26/10 - 11/11/2026) gồm
  - Công cụ, cấu trúc thư mục `backend/`, `docker-compose.yml` cho MySQL + Redis.
  - Khung backend (A1): format response và lỗi (thêm trường `code`), guard JWT + role, đọc `Accept-Language`, phân trang, bảng key Redis và quy tắc xóa cache, upload, lọc HTML, slug, Swagger.
  - Danh sách API theo module, kèm quyền, UC, màn HTML phase 2 dùng API đó và người làm.
  - Seeders (gồm UI translation lấy từ key `data-i18n` của `html/`), unit test, integration test, Postman collection chạy bằng Postman CLI.
  - Thứ tự làm của A (A1-A7), B (B1-B7), C (C1-C3), lịch theo ngày, checklist điều kiện hoàn thành, 5 quyết định cần thống nhất (Q1-Q5), mục ngoài phạm vi.
  - Migrations và seeders của phase 1 chưa có ở dạng code nên chuyển vào A1, B1, C1.
- Requirements mục 1.5 phase 3: link tới `docs/phase-3-backend.md`.
- Màn sửa bài viết (A5): `admin/post-edit.html` (UC13): phần dùng chung ở trên (ngôn ngữ gốc chỉ đọc, danh mục, thumbnail), tab ngôn ngữ `.nav-tabs` (tab gốc có nhãn "Gốc", chấm màu theo trạng thái bản dịch), dòng thông tin bản dịch (slug chỉ đọc, lượt xem, ngày đăng, nút "Xóa bản dịch"; bản gốc không có nút xóa), form bản dịch dùng lại `post-form` và rich text editor. Trạng thái demo: tab gốc, tab bản dịch, chưa có bản dịch (khối rỗng + nút "Thêm bản dịch"), bản dịch mới điền sẵn nội dung gốc, lỗi validate (chấm đỏ trên tab), đang lưu, hộp xác nhận xóa bản dịch, đã lưu (toast). Component `translation-tabs`; ô chỉ đọc trong `.post-form__shared` có nền xám.
- `demo-state.js`: `data-demo-tab="<trạng thái>"` trên nút tab để tự chọn tab ở trạng thái đó.
- Màn bài viết theo danh mục (C2): `public/category.html` (UC07): hàng chip danh mục (chip đang xem được tô), tên danh mục lớn căn giữa + số bài, 10 thẻ bài, phân trang, sidebar giống trang chủ. Trạng thái demo: bình thường, rỗng (danh mục chưa có bài ở ngôn ngữ đang chọn). Component `category-head`.
- Màn tìm kiếm, 404 và trang tĩnh (B4):
  - `public/search.html` (UC19): ô tìm kiếm lớn, "Kết quả cho <từ khóa>" + số kết quả, 10 thẻ bài, phân trang, sidebar giống trang chủ. Trạng thái demo: có kết quả, không có kết quả (gợi ý + nút về trang chủ), lỗi từ khóa (< 2 hoặc > 100 ký tự).
  - `public/page.html` (UC11): một file cho cả 3 trang `about`, `contact`, `privacy`, chuyển bằng thanh demo hoặc `?key=` trên URL nên link footer/menu mở đúng trang. Mục "Giới thiệu" trên menu active ở trang about.
  - `public/404.html`: số "404" lớn, thông báo, nút pill "Về trang chủ".
  - Component `search-head`, `static-page`, `not-found`.
- `demo-state.js`: `<body data-demo-param="key">` lấy trạng thái từ tham số khác trên URL khi không có `?demo=`.
- Deploy giao diện phase 2 lên GitHub Pages (<https://tmtuan04.github.io/blog-management-system/>):
  - `.github/workflows/deploy-pages.yml`: push vào `master` (có thay đổi trong `html/`) hoặc chạy tay thì build CSS, kiểm tra link, deploy thư mục `html/` (bỏ `node_modules`). Link chết chỉ báo thành annotation, chưa chặn deploy.
  - `html/index.html`: trang mục lục 20 màn, màn đã xong có link, màn chưa làm ghi "Chưa làm" và không có link.
  - `html/scripts/check-links.mjs` (`npm run check-links`): báo `href`/`src` trỏ tới file không tồn tại, sai hoa/thường, đường dẫn bắt đầu bằng `/` hoặc ra ngoài `html/`; bỏ qua link ngoài, `#`, comment HTML và `_templates/`.
  - Phase 2 doc 1.2 → 1.3: đầu ra có link GitHub Pages; mục 2.2 thêm `scripts/`; mục 7.4 ghi deploy khi merge `master`; mục 8 A6 đổi thành kiểm tra cuối (trang mục lục đã có, mỗi PR tự cập nhật); mục 9 thêm quy tắc "danh sách nhiều mục chỉ bắt buộc link mục đầu tiên", `check-links` sạch, kiểm tra bản trên GitHub Pages.
  - `docs/phase-2-huong-dan.md`: checklist PR thêm chạy `check-links`, cập nhật `index.html`; lỗi hay gặp thêm 404 do sai hoa/thường và mất CSS do đường dẫn bắt đầu bằng `/`.
  - `html/README.md`: lệnh `check-links`, mục Deploy.
- Thư mục `html/` (phase 2), phần nền cho màn mẫu:
  - `package.json`: Bootstrap 5.3.8, Dart Sass; script `build`, `watch`.
  - `scss/`: `main.scss`; `abstracts/` (biến Bootstrap ghi đè, font, kích thước layout, mixin `line-clamp`); `themes/` (token `--bl-*` sáng/tối, `_bootstrap-bridge.scss` nối biến `--bs-*` vào token); `base/` (kiểu chữ theo vai trò `.text-*`, `.prose`); `components/` (nút đổi theme, thanh demo).
  - `js/theme.js`: đổi sáng/tối, lưu `localStorage`, lần đầu theo `prefers-color-scheme`, không nháy màu khi tải trang.
  - `js/demo-state.js`: thanh chuyển trạng thái demo (bình thường, lỗi validate, loading, rỗng, khách/đã đăng nhập), lưu trạng thái trên URL.
  - `README.md`: cách chạy, khung `<head>` mẫu, danh sách biến và class dùng được.
- Màn mẫu để các màn khác làm theo:
  - `_templates/admin.html`: khung trang quản trị (sidebar `offcanvas-lg`, topbar có bộ chọn ngôn ngữ, nút theme, menu tài khoản; mục chỉ Super Admin thấy).
  - `admin/posts.html`: danh sách bài viết (UC13) với tab trạng thái, bộ lọc, bảng có badge bản dịch (thành thẻ dưới `md`), menu ⋯, phân trang, hộp xác nhận xóa; trạng thái bình thường, loading (skeleton), rỗng, đang xóa; vai trò Blog Owner / Super Admin.
  - `layouts/_admin.scss` và component `avatar`, `brand`, `dropdown`, `empty-state`, `icon-btn`, `page-tabs`, `pagination`, `post-table`, `search-input`, `status-badge`, `table`.
  - Ảnh giả SVG trong `assets/img/posts/` và `assets/img/avatars/`.
- `demo-state.js`: trạng thái tự đặt tên (`data-demo-label-<tên>`), vai trò `guest` / `user` / `blog_owner` / `super_admin` (`data-demo-auths`), tự mở modal (`data-demo-modal`), chọn trạng thái cho `data-demo-invalid` / `data-demo-loading`.
- Nút `.btn-outline-secondary`, `.btn-danger` theo token màu.
- Khung public và auth (A1), phần SCSS: `layouts/_public.scss` (header dính trên cùng, thanh tìm kiếm mobile, nội dung + sidebar từ `lg`, footer, offcanvas menu), `layouts/_auth.scss` (thẻ form 440px, nút OAuth, đường chia "hoặc"), component `alert-inline` (thông báo lỗi/thành công trong form).
- `_templates/public.html`: khung trang public (header 4 biến thể theo vai trò `guest` / `user` / `blog_owner` / `super_admin`, ô tìm kiếm desktop và thanh tìm kiếm mobile, nội dung + sidebar, footer, offcanvas menu mobile có chọn ngôn ngữ và switch giao diện tối).
- `_templates/auth.html`: khung trang tài khoản (header logo + ngôn ngữ + theme, thẻ form 440px, footer), mẫu là form đăng nhập: nút Google/Github, đường chia "hoặc", email, mật khẩu, link quên mật khẩu, link đăng ký; trạng thái `normal`, `error` (lỗi dưới trường + `.alert-inline`), `loading`.
- `html/README.md`: cách dùng `_templates/public.html` và `_templates/auth.html`; bảng class thêm layout public, layout auth, `.alert-inline`.
- `js/theme.js`: hỗ trợ nút đổi theme dạng switch (`input[type=checkbox][data-theme-toggle]`, dùng trong offcanvas mobile), đồng bộ `checked` theo theme.
- Phase 2 doc: token `--bl-border-strong`, `--bl-btn-primary-hover` và các token `-rgb`; quy ước `data-i18n-placeholder`, `data-i18n-aria-label`; dữ liệu từ CSDL không gắn `data-i18n`.
- Màn quản trị danh mục và trang tĩnh (B1), chỉ Super Admin (`data-demo-auths="super_admin"`):
  - `admin/categories.html` (UC15): mỗi ngôn ngữ một cột tên, slug nằm dưới tên, ô chưa có tên hiện chữ xám "Chưa có, dùng: <tên mặc định>"; cột số bài; menu ⋯ (Sửa, Xem trên blog, Xóa); ô tìm theo tên. Modal thêm và modal sửa (điền sẵn tên, hiện slug hiện tại), hộp xác nhận xóa, hộp "Không thể xóa danh mục" cho danh mục đang có bài. Trạng thái demo: bình thường, loading (skeleton), rỗng, lỗi validate (thiếu tên ngôn ngữ mặc định), đang lưu, đang xóa, lỗi xóa.
  - `admin/pages.html` (UC18): bảng tên trang + URL public, key, badge ngôn ngữ đã có nội dung, trạng thái hiển thị, ngày cập nhật, nút "Sửa" tới `page-edit.html`; không phân trang, không tìm kiếm. Dưới `sm` cột "Hiển thị" chuyển xuống dưới tên, nút "Sửa" chỉ còn icon. Trạng thái demo: bình thường, loading.
  - Component `category-table`, `page-table`.
- Component `user-table` (`scss/components/_user-table.scss`): ô người dùng (avatar + họ tên + email), nhãn "(Bạn)", badge vai trò (Super Admin nền đậm), hàng tài khoản bị khóa làm mờ, skeleton.
- Toast (C1):
  - `scss/components/_toast.scss`: `.toast` của Bootstrap, nối biến `--bs-toast-*` vào token `--bl-*`; icon `.toast__icon` màu `--bl-success`.
  - `admin/posts.html`: trạng thái demo "Đã xóa" (`deleted`) hiện toast "Đã xóa bài viết." góc trên phải; chữ gắn `data-i18n` (`common.success`, `admin.posts.delete_success`, `common.close`).
  - `demo-state.js`: `data-demo-toast="<trạng thái>"` tự hiện toast ở trạng thái đó, không tự ẩn để chụp màn hình.
  - `html/README.md`: thêm dòng Toast vào bảng "Có sẵn để dùng". Phase 2 doc: C1 đánh dấu đã làm, `admin/posts.html` thêm trạng thái đã xóa. `SCREENS.md`: bỏ toast khỏi A2.
- Trang chủ và thẻ bài viết (A2):
  - `public/index.html` (UC05): thanh chip danh mục cuộn ngang ("Tất cả" đang chọn), 10 thẻ bài viết, phân trang 1–10 / 24; sidebar từ `lg` gồm "Đọc nhiều nhất" (5 bài theo lượt xem), danh mục kèm số bài, link Giới thiệu / Liên hệ / Chính sách bảo mật. Dữ liệu giả có tiêu đề 3 dòng, tóm tắt dài, bài không ảnh, tên tác giả dài, chuỗi không dấu rất dài. Trạng thái demo: bình thường, loading (skeleton cả feed và sidebar), rỗng ("Chưa có bài viết ở ngôn ngữ này"); 4 vai trò của header.
  - Component `post-card` (dòng tác giả · danh mục, tiêu đề cắt 3 dòng, tóm tắt cắt 2 dòng, ngày đăng · lượt xem, thumbnail 80×53 / 160×107 từ `md`; biến thể `--compact`, `--skeleton`), `category-chips` (`--wrap`, `.is-active`, `__count`), `aside-section`, `aside-links`.
  - `html/index.html`: "Trang chủ" thành link, badge "Đã xong". `html/README.md`: thêm thẻ bài viết, chip danh mục, khối sidebar vào bảng "Có sẵn để dùng". Phase 2 doc: `public/index.html` và A2 đánh dấu đã làm.
  - `SCREENS.md` cập nhật theo phase 2 doc 1.4: `category.html` chuyển từ A4 sang C2 (nhánh A4 đổi thành `feature/html-post-detail`), thêm bảng C (C1, C2, C3), A6 đổi thành sửa lỗi phần dùng chung, chờ C3; số màn A 5, B 14, C 1.
- Viết bài mới và rich text editor (A3):
  - `admin/post-create.html` (UC13): thanh trên tối giản (← về danh sách, logo, "Nháp", ngôn ngữ, theme, nút pill "Lưu", menu tài khoản); phần dùng chung (ngôn ngữ gốc kèm ghi chú không đổi được, danh mục, thumbnail kéo thả hoặc xem trước với nút Đổi ảnh / Xóa ảnh); bản gốc (trạng thái Nháp / Đã đăng / Lưu trữ, tiêu đề Inter 42px không viền, tóm tắt, editor). Bài mẫu "Ghi chép từ chuyến đi Hà Giang mùa hoa tam giác mạch" có đủ đoạn văn, H2, H3, đậm, nghiêng, gạch chân, danh sách, trích dẫn, link, ảnh có chú thích. Trạng thái demo: bài mới (placeholder), đã điền, lỗi validate (thiếu danh mục, tiêu đề ngoài 5–255 ký tự, thiếu nội dung, thông báo đầu form), lỗi ảnh (> 2MB), đang tải ảnh trong bài, đang lưu; vai trò Blog Owner / Super Admin.
  - Layout `layouts/_editor.scss` (`.editor-topbar`, `.editor-page` rộng bằng cột đọc 680px) cho trang viết/sửa bài, không có sidebar admin.
  - Component `editor` (thanh công cụ H2, H3, đậm, nghiêng, gạch chân, danh sách, danh sách đánh số, trích dẫn, link, ảnh; dính dưới thanh trên, cuộn ngang khi màn hẹp; vùng nhập `contenteditable` dùng `.prose`, placeholder "Kể câu chuyện của bạn..."; viền dưới đỏ khi lỗi; khối đang tải ảnh có thanh tiến độ), `post-form`, `thumb-upload`.
  - `html/index.html`: "Viết bài mới" thành link, badge "Đã xong". `html/README.md`: thêm layout soạn bài, editor, form bài viết, chọn ảnh vào bảng "Có sẵn để dùng". Phase 2 doc: `admin/post-create.html` và A3 đánh dấu đã làm, mục 2.2 thêm `layouts/_editor.scss`, mục 5.2 ghi chỗ đặt editor và cách `page-edit` dùng lại. `SCREENS.md`: A3 đã xong (A 3/5).
- Chi tiết bài viết và bình luận (A4):
  - `public/post-detail.html` (UC06, UC08): cột đọc 680px, không sidebar. Bài mẫu "Hướng dẫn Angular": tiêu đề, tóm tắt dạng subtitle xám, thanh tác giả (avatar, tên · danh mục, thời gian đọc · ngày đăng), thanh lượt xem + số bình luận kẻ trên dưới, dòng "Bài viết này có ở các ngôn ngữ" (Tiếng Việt · English), ảnh thumbnail, nội dung `.prose` đủ đoạn văn, H2, H3, đậm, nghiêng, gạch chân, danh sách có/không thứ tự, trích dẫn, link, ảnh có chú thích, code inline và khối code; chip danh mục cuối bài; khu bình luận; "Bài viết cùng danh mục" lưới 2 cột từ `md`.
  - Bình luận: khách thấy khối "Đăng nhập để bình luận"; đã đăng nhập có ô nhập (avatar + tên theo vai trò, đếm 0 / 1000, nút "Gửi"). Trả lời 1 cấp, lùi vào và kẻ trái; nhãn "Tác giả" cạnh tên tác giả bài; nút "Trả lời" chỉ ở bình luận gốc. Nút ⋯ (Xóa) theo quyền UC08: `user` (Lê Minh Cường) chỉ xóa bình luận của mình, `blog_owner` (tác giả bài) và `super_admin` xóa mọi bình luận. Dữ liệu khó: tên dài, bình luận nhiều dòng có chuỗi không dấu rất dài.
  - Trạng thái demo: bình thường, lỗi validate (ô bình luận rỗng), đang gửi, chưa có bình luận, đang trả lời (ô trả lời dưới bình luận đầu), xóa bình luận (hộp xác nhận với nút đang xóa); 4 vai trò của header. Lỗi validate, đang gửi, đang trả lời, xóa bình luận chỉ có với tài khoản đã đăng nhập.
  - `demo-state.js`: thuộc tính `data-demo-auths-<trạng thái>` trên `<body>` giới hạn trạng thái theo vai trò. Thanh demo ẩn nút trạng thái không hợp với vai trò đang chọn; đổi vai trò thì về trạng thái hợp lệ đầu tiên, chọn trạng thái hoặc mở link có `?demo=` thì đổi sang vai trò hợp lệ đầu tiên. Trang không khai báo thì không đổi gì. Phase 2 doc mục 7.2 ghi cách dùng.
  - Component `post-detail`, `comment` (`comment-form`, `comment-login`, `comment-list`); `post-card--grid` (thumbnail lên trên) trong `_post-card.scss`.
  - `html/index.html`: "Chi tiết bài viết" thành link, badge "Đã xong". `html/README.md`: thêm thẻ bài dạng lưới, trang chi tiết bài, bình luận vào bảng "Có sẵn để dùng". Phase 2 doc: `public/post-detail.html` và A4 đánh dấu đã làm. `SCREENS.md`: A4 đã xong (A 4/5).
- Trang tài khoản (B3), dựng từ `_templates/auth.html`:
  - `public/login.html` (UC02, UC20): trạng thái demo bình thường, vừa đăng ký (`.alert-inline--success`), sai email/mật khẩu, tài khoản bị khóa, quá số lần thử (429), lỗi OAuth không có email, loading.
  - `public/register.html` (UC01): họ tên, email, mật khẩu, xác nhận mật khẩu, nút Google/Github, dòng chính sách bảo mật; lỗi email trùng (kèm link đăng nhập), mật khẩu yếu, không khớp; loading.
  - `public/forgot-password.html` (UC03): ô email; lỗi validate, loading, đã gửi ("Kiểm tra hộp thư", link gửi lại).
  - `public/reset-password.html` (UC03): mật khẩu mới, xác nhận; lỗi validate, loading, link hết hạn/không hợp lệ.
  - `layouts/_auth.scss`: thêm `.auth-card__lead` (đoạn giới thiệu dưới tiêu đề), `.auth-card__icon` (icon lớn ở màn kết quả).
- `public/profile.html` (UC12), dựng từ `_templates/public.html`, không sidebar: avatar lớn + nút "Đổi ảnh", họ tên, email và vai trò chỉ đọc; khối đổi mật khẩu riêng. Trạng thái demo: bình thường, lỗi validate (họ tên rỗng, sai mật khẩu hiện tại), lỗi ảnh (sai định dạng), loading, đã lưu, tài khoản OAuth chưa có mật khẩu (ẩn ô mật khẩu hiện tại, nút "Đặt mật khẩu", chỉ với vai trò `user`); vai trò `user` / `blog_owner` / `super_admin`. Component `profile`, thêm `.avatar--xl`.
- `admin/languages.html` (UC16), chỉ Super Admin: bảng mã (chip), tên hiển thị, mặc định (badge), hoạt động (switch), số bản dịch bài, menu ⋯ (Sửa, Đặt làm mặc định, Xóa). Ngôn ngữ mặc định khóa switch và nút xóa kèm tooltip; ngôn ngữ đã tắt không đặt làm mặc định được. Modal thêm (mã ISO 639-1, tên hiển thị, hoạt động, ghi chú sao chép bản dịch giao diện), modal sửa (mã chỉ đọc), hộp xác nhận xóa, hộp "Không thể xóa ngôn ngữ" khi đang có bản dịch. Trạng thái demo: bình thường, lỗi validate (mã trùng), đang lưu, đang xóa, lỗi xóa. Component `language-table`.
- `html/index.html`: 6 màn trên thành link, badge "Đã xong". `html/README.md`: thêm trang hồ sơ, bảng ngôn ngữ, `.avatar--xl`, `.auth-card__lead` / `__icon`. Phase 2 doc: 6 màn trên, `admin/users.html`, B2, B3 đánh dấu đã làm. `SCREENS.md`: B2, B3 đã xong (B 9/14).

### Changed

- Phase 3 doc mục 8: A7 (OAuth UC20, PR #65 merge 25/11 và #67 merge 26/11) và B5 (Người dùng UC14, PR #64 merge 25/11) chuyển sang đã xong ở bảng đợt 8.2 và bảng việc 8.3. Thêm ghi chú 26/11: còn B6, C3, A8; B6 chưa có nhánh, đã quá mốc 09/11 nên A có thể nhận B6 theo mục 8.4.
- Phase 3 doc mục 8: B4 (Bình luận UC08, PR #59 merge 21/11) chuyển sang đã xong ở bảng đợt 8.2 và bảng việc 8.3. A5 ở bảng đợt 8.2 cũng chuyển sang đã xong cho khớp với 8.3. Thêm ghi chú 24/11: còn A7, B5, B6, C3, A8; B6 vẫn là việc đang chặn nhiều người nhất.

- Chữ tĩnh trên giao diện (UI translation) chuyển từ CSDL sang file JSON của frontend theo góp ý của mentor, nhánh `feature/be-remove-ui-translations`:
  - Requirements 2.1 → 2.2: D5 đổi thành "chữ tĩnh nằm trong file JSON của frontend, mỗi ngôn ngữ một file, thiếu key hoặc thiếu file thì hiện theo ngôn ngữ mặc định", kèm lý do. UC17 đánh dấu đã bỏ (giữ mã, không đánh số lại UC18-UC20). UC16 bỏ quy tắc sao chép key khi thêm ngôn ngữ; chữ tĩnh của ngôn ngữ mới cần lập trình viên thêm file dịch. Sửa theo: thuật ngữ, phân công, phase 1 (bảng `ui_translations`), phase 2 (màn quản lý bản dịch giao diện), UC09, UC18, ma trận phân quyền, mục 6.6; mục 8 thêm "sửa chữ tĩnh qua màn quản trị".
  - Phase 3 doc 1.1 → 1.2: bỏ route, key Redis `cache:ui:{code}`, dòng xóa cache, seeder `07-ui-translations`, việc sao chép key ở `POST /admin/languages`; mục 5 ghi cách dùng `html/i18n/`; mục 8 thêm ghi chú 22/11. Phase 2 doc 1.5 → 1.6: bỏ màn `admin/ui-translations.html`, mục 7 ghi `data-i18n` được gom vào `html/i18n/`. `database.dbml`, `sample-data.md` bỏ bảng `ui_translations`.
  - `POST /admin/languages` (UC16) chỉ tạo dòng `languages`, không còn sao chép UI translation và không chạy transaction. Mã trả về và response không đổi.
  - Script `extract-i18n.mjs` chuyển từ `backend/scripts/` sang `html/scripts/`; `npm run i18n:extract`, `npm run i18n:check` chạy trong `html/` (bỏ khỏi `backend/package.json`). Script ghi `html/i18n/vi.json`, `html/i18n/en.json` dạng lồng nhau theo dấu chấm của key (`menu.home` → `{ "menu": { "home": ... } }`), dùng được ngay với thư viện i18n của Angular. Bỏ trường `sample`: giá trị `vi` có tham số `{{ten}}` thì script giữ nguyên và kiểm tra chữ trong HTML còn khớp mẫu; báo thêm khi bản `en` khác tham số với bản `vi`.
  - HTML: modal thêm ngôn ngữ ở `admin/languages.html` thay ghi chú sao chép bản dịch bằng `admin.languages.static_text_note` (“Chữ trên menu, nút bấm và footer của ngôn ngữ mới hiện bằng {{language}} cho tới khi có file dịch giao diện.”); hộp xóa ngôn ngữ ghi “Tên danh mục và nội dung trang tĩnh ở ngôn ngữ này cũng bị xóa.”; `admin.page_edit.subtitle` thành “Chỉ sửa nội dung trang. Chữ trên menu và footer không sửa ở đây.”. `validation.image_too_large` ở `admin/post-create.html` dùng ngoặc kép cong như mẫu (script mới phát hiện lệch).
  - `CLAUDE.md`, `.claude/rules/`, skill `new-html-page`, `pr-ready`, `backend/README.md`, `html/README.md`: lệnh i18n chạy trong `html/`, file dịch ở `html/i18n/`.
  - Sau khi pull cần chạy `npm run db:migrate` (và `npm run db:test:migrate` cho database test).
- Phần nền: `containsHtml` (`common/utils/html-sanitize.ts`) chỉ coi là HTML khi có thẻ của phần tử HTML có thật (hoặc custom element có `-`) với thuộc tính đúng cú pháp, hoặc comment `<!--`. Trước đây mọi `<` + chữ cái + `>` phía sau (kể cả khác dòng) đều bị coi là thẻ, nên bình luận như `List<String>` hay `a<b thì c>d` bị 400. Hàm này hiện chỉ bình luận (UC08) dùng.
- `canDeleteComments` ở `GET /posts/:slug` (UC06) dùng chung `canModeratePostComments`: tác giả bài đã bị hạ xuống `user` thì là `false` (ma trận phân quyền requirements mục 5).
- `POST /admin/posts` bỏ `translations[]`, chỉ tạo bài + bản gốc trong một transaction (UC13, A3, theo góp ý của mentor). Trước đây bài, bản gốc và mọi bản dịch nằm chung một transaction nên chỉ một bản dịch lỗi (ví dụ trùng slug do hai request đồng thời) là mất cả bài, và lỗi DB không chỉ ra được tab nào. Nay màn viết bài (phase 4) lưu bài + bản gốc trước, rồi gọi `POST /admin/posts/:id/translations` cho từng tab: bản nào lỗi thì chỉ bản đó lỗi, báo đúng tab, các bản khác vẫn lưu. Gửi `translations` → 400 `Trường này không được phép`. Bỏ `prepareExtraTranslations` và các test của nó; e2e thêm test "một bản dịch lỗi không ảnh hưởng bài và các bản đã lưu", "thêm bản dịch ở ngôn ngữ gốc → 409". Phase 3 doc mục 4.5 cập nhật theo.
- HTML phát hiện nhờ `extract-i18n.mjs`: nút xóa key ở `admin/ui-translations.html` dùng aria-label chung "Xóa key" (trước đây chứa tên key nên mỗi dòng một chữ khác nhau); `validation.email_taken` ở `admin/users.html` dùng cùng câu với `public/register.html`.
- `docs/sample-data.md`: đường dẫn ảnh mẫu theo quy tắc upload (`uploads/images/<uuid>.png`); trang `contact`, `privacy` có thêm bản `en`.
- Chia lại việc phase 3 (`docs/phase-3-backend.md` 1.0 → 1.1): A ~50%, B ~35%, C ~15%.
  - Mục 8 thêm bảng tỉ lệ phân công. Hồ sơ cá nhân UC12 chuyển từ B (B7 cũ) sang A (A6 mới); OAuth thành A7, việc hoàn thiện cuối phase thành A8. Mục 4.4 ghi A phụ trách.
  - A1, A2 đánh dấu đã xong. A3 bỏ chờ B1 (test e2e dùng dữ liệu riêng).
  - Lịch theo ngày làm lại vì A1, A2 xong sớm 3 ngày và B5 phase 2 đã xong: B bắt đầu B1 từ 27/10; A có 2 ngày dự phòng (09/11 - 10/11), nhận B6 nếu B chậm. Mốc lùi việc Should sang phase 4 đổi từ 06/11 thành 05/11.
  - Requirements mục 1.4 (tỉ lệ chung của dự án) giữ nguyên.
- Gia hạn phase 2 thêm 1 tuần (đến 21/10/2026, ~10 ngày làm việc): requirements 2.0 → 2.1 (mục 1.5 phase 2 ~2 tuần, tổng thời gian 8 → 9 tuần); phase 2 doc 1.4 → 1.5 (thời gian ~2 tuần).
- `html/index.html`: bảng mục lục thêm cột "Người làm" (A - Từ Minh Tuân, B - Ngô Đức, C - Cao Tiến Dũng, theo `SCREENS.md`); đầu trang thêm badge "Đã xong x / y màn", tự đếm từ badge "Đã xong" trong bảng.
- `admin/users.html` (UC14) viết lại theo quy ước phase 2, sửa lỗi giao diện bảng (avatar nằm trên tên vì class `user-cell`, `role-badge`, `self-tag`, `min-w-0` không có CSS; ảnh avatar sai đường dẫn `../img/avatar-2.svg`): dùng component `user-table`, Bootstrap Icons thay SVG Lucide, modal Bootstrap thay `onclick`/script tự viết, `data-demo` thay `data-state-*`, skeleton bằng `placeholder-glow`; thêm `data-i18n`. Chỉ Super Admin (`data-demo-auths="super_admin"`). Hàng của chính mình có nút ⋯ bị vô hiệu kèm chú thích. Trạng thái demo: bình thường, loading, rỗng (tìm không ra), lỗi validate (email trùng, mật khẩu yếu), đang lưu, hộp xác nhận khóa tài khoản. `index.html`, `SCREENS.md`: đánh dấu màn đã xong.
- Nhóm từ 2 lên 3 người, C nhận các việc dễ tách từ phần của A:
  - Requirements 1.9 → 2.0: A ~45%, B ~40%, C ~15%. C phụ trách UC05, UC07, UC09 (bộ chọn ngôn ngữ, A vẫn dựng cơ chế đa ngôn ngữ), UC10, component toast; phase 1 review ERD và chạy thử migrate/seed/rollback; phase 2 toast, `category.html`, kiểm tra tổng; phase 5 tạo máy ảo và cấu hình hệ điều hành (bước 1-2). PR của C do A hoặc B review.
  - Phase 2 doc 1.3 → 1.4: mục 8 ghi A1 đã xong; A2 bỏ toast, A4 bỏ `category.html`, A6 chỉ duyệt lỗi phần dùng chung và bật chặn link chết; thêm bảng C (C1 toast, C2 `category.html`, C3 kiểm tra theo mục 9); B5 chờ thêm C1. Mục 7.4, 9 sửa quy tắc review cho 3 người.
  - `docs/phase-2-huong-dan.md`: cách chọn reviewer, xử lý conflict và báo khi sửa phần dùng chung theo nhóm 3 người.
- `layouts/_public.scss`: ở 768px chữ trên header (menu, "Viết bài", "Đăng nhập", "Bắt đầu") không còn xuống dòng; ô tìm kiếm co từ 240px xuống khi thiếu chỗ.
- `layouts/_auth.scss`: nút Google/Github (thẻ `<a>`) căn giữa chữ theo chiều dọc.
- `admin/categories.html`, `admin/pages.html` viết lại theo quy ước phase 2: bỏ icon SVG Lucide (dùng Bootstrap Icons), `style="..."` inline, `onclick` và script mở modal tự viết (dùng modal Bootstrap), class không tồn tại (`role-chip`, `cell-key`, `cell-fallback`, `lang-badge`, `code-chip`, `skeleton`) và thuộc tính `data-state-*` (dùng `data-demo`); thêm `data-i18n`, comment component, `<title>` đúng tên trang.
- `html/index.html`: "Quản lý danh mục", "Quản lý trang tĩnh" thành link, badge "Đã xong". `html/SCREENS.md`: đánh dấu B1 xong.
- Phase 2 doc mục 5.3: dòng `admin/categories.html`, `admin/pages.html` ghi "đã làm", bố cục bảng và trạng thái demo thực tế.
- Phase 2 doc: mục 2.1 thay khối `package.json` mẫu bằng mô tả file thật; Bootstrap JS và Bootstrap Icons nạp từ CDN. Mục 7.2 ghi cách đánh dấu trạng thái demo bằng `data-demo`, `data-demo-auth`.
- Phase 2 doc: `--bl-border` chỉ dùng cho đường kẻ, viền bảng; viền ô nhập dùng `--bl-border-strong`.
- Phase 2 doc: mục 8 lập lại kế hoạch theo ngày vì phần nền và màn mẫu đã làm trước; B làm khung public/auth ngày 1, C bắt đầu từ các trang admin.
- `docs/phase-2-huong-dan.md` (mới): hướng dẫn từng bước cho B và C (cài máy, chạy dự án, thứ tự việc của từng người, quy trình làm một màn, trạng thái demo, checklist PR, Git và xử lý conflict, lỗi hay gặp).
- Phase 2 doc: mục 7.2 thay "Khách / Đã đăng nhập" bằng 4 vai trò; mục 5.2 `admin/posts.html` gộp ngôn ngữ gốc và danh mục vào dòng meta dưới tiêu đề.
- Dự án chuyển sang 1 người làm toàn bộ, bỏ phân công A/B/C và review chéo:
  - Requirements 1.7 → 1.8: mục 1.4 "Phân công" thành "Nhân sự" (làm phần nền trước, Must trước Should, tự kiểm tra theo checklist trước khi merge); bỏ bảng người phụ trách ở phase 1, 2, 5 và cột "Phụ trách" ở bảng use case; phase 5 thay "mỗi thành viên làm lại" bằng làm lại trên một máy ảo mới để kiểm tra tài liệu deploy.
  - Phase 2 doc 1.0 → 1.1: bỏ tên người ở tiêu đề mục 3, 4, 5; mục 7.4 bỏ quy định người review; mục 8 "Kế hoạch theo ngày" thành "Thứ tự làm" (11 việc theo thứ tự phụ thuộc).
  - `docs/phase-2-huong-dan.md`: bỏ "dành cho B và C"; mục 4 trỏ sang thứ tự làm ở phase 2 doc; bỏ bước chọn người review, thay bằng tự xem lại và tự merge PR.
  - `html/README.md`, comment trong `scss/main.scss`: bỏ nhắc tới B và nhóm.
- Dự án chuyển sang 2 người: A làm chủ đạo (~60%), B (~40%); có lại review chéo:
  - Requirements 1.8 → 1.9: mục 1.4 "Nhân sự" thành "Phân công" (bảng việc của A và B; A dựng khung backend/Angular trước, B bắt đầu sau khi khung được merge; mỗi PR do người còn lại review, PR sửa phần nền thì A duyệt); thêm lại bảng người phụ trách ở phase 1, 2 và cột "Phụ trách" ở bảng use case (B: UC08, UC11, UC12, UC14-UC18; còn lại là A); phase 3, 4 ghi rõ ai dựng khung; phase 5 A deploy, B làm lại trên máy ảo mới theo tài liệu.
  - Phase 2 doc 1.1 → 1.2: mục 3, 4 ghi A phụ trách; mục 7.4 thêm review chéo; mục 8 chia thành bảng việc của A (A1-A6) và B (B1-B5), có cột "Chờ" ghi việc phụ thuộc; mục 9 đổi lại "Mọi PR đã được người còn lại review".
  - `docs/phase-2-huong-dan.md`: mục 4 trỏ sang bảng việc của từng người và cách xử lý việc phải chờ; mục 8 thêm bước chọn người review và Approve trước khi merge; conflict và sửa component dùng chung thì báo người kia.
  - `html/README.md`: đổi "việc #1" thành "việc A1", sửa component dùng chung thì báo người kia.

### Removed

- UC17 - Quản lý bản dịch giao diện (requirements 2.2, D5), nhánh `feature/be-remove-ui-translations`:
  - Route `GET /ui-translations/:code`, `GET /admin/ui-translations`, `POST /admin/ui-translations`, `PUT /admin/ui-translations/:key/:code`, `DELETE /admin/ui-translations/:key`; module `ui-translations`, model `UiTranslation`.
  - Phần nền: `RedisKeys.uiTranslations`, `CachePrefix.ui`, `CacheTtl.ui` trong `common/utils/redis-keys.ts`; `UiTranslation` trong `infra/database/models.ts`.
  - Bảng `ui_translations`: migration mới `20261122000001-drop-ui-translations` (down dựng lại bảng rỗng, không khôi phục dữ liệu). Seeder `07-ui-translations`; `backend/database/seed-data/ui-translations.json` (nội dung chuyển sang `html/i18n/vi.json`, `en.json`).
  - Test: `ui-translations.service.spec.ts`, `test/ui-translations.e2e-spec.ts`, nhóm UI Translations ở `response-format.e2e-spec.ts`, phần sao chép key ở test UC16 (unit và e2e). Postman: folder `04 - UI Translations` (14 request), không đánh số lại các folder sau; request “UC16 - Ngôn ngữ đang tắt không có ở API public” chuyển sang kiểm tra `GET /languages`.
  - HTML: màn `admin/ui-translations.html`, mục “Bản dịch giao diện” ở sidebar admin (`_templates/admin.html` và 6 trang admin), component `_ui-translation-table.scss` (`.ui-translation-filter`, `.ui-translation-table`), dòng ở `html/index.html` (badge thành “Đã xong 17 / 19 màn”), `SCREENS.md` (19 màn, B 13 màn), `html/README.md`. 19 key i18n không còn dùng (`admin.ui_translations.*`, `admin.nav.ui_translations`, `admin.languages.copy_note`, `validation.ui_key_taken`).

## [1.7] - 2026-10-08

Bắt đầu phase 2: giao diện HTML clone theo phong cách Medium.

### Added

- `docs/phase-2-html.md`: tài liệu phase 2 gồm
  - Phạm vi "clone Medium" (clone gì, không clone gì) và bảng ánh xạ thành phần Medium sang use case.
  - Công cụ (Bootstrap 5.3, Dart Sass, Bootstrap Icons, font Inter + Source Serif 4) và cấu trúc thư mục `html/`.
  - Design tokens: màu sáng/tối (`--bl-*`, theme qua `data-bs-theme`), kiểu chữ, kích thước, breakpoint.
  - Layout public, auth, admin.
  - Danh sách 20 màn hình theo người phụ trách, kèm route phase 4, UC, nội dung và trạng thái bắt buộc.
  - Quy ước HTML (comment ranh giới component, thuộc tính `data-i18n`), trạng thái demo (`demo-state.js`), SCSS (BEM, mobile-first), Git.
  - Kế hoạch theo ngày, checklist điều kiện hoàn thành, mục ngoài phạm vi.

### Changed

- Requirements:
  - Phiên bản 1.6 → 1.7.
  - Phase 2: giao diện clone theo phong cách Medium, link tới `docs/phase-2-html.md`.

## [1.6] - 2026-10-07

Bài viết có ngôn ngữ gốc và dịch được ra nhiều ngôn ngữ (thay cho mô hình mỗi post thuộc đúng 1 ngôn ngữ). Role chuyển từ enum sang bảng riêng.

### Added

- Bảng `roles` (`id`, `code`, `name`): danh sách cố định `user`, `blog_owner`, `super_admin`, tạo bằng seeder, không có màn hình quản lý.
- Bảng `post_translations`: nội dung bài theo từng ngôn ngữ (`title`, `slug`, `excerpt`, `content`, `status`, `view_count`, `published_at`).
  - Unique `(post_id, language_id)`: mỗi bài có tối đa 1 bản dịch / ngôn ngữ.
  - Unique `(language_id, slug)`, index `(language_id, status, published_at)`.
  - FULLTEXT index chuyển sang `ft_post_translations_search ON post_translations(title, excerpt, content)`.
- Khóa ngoại mới: `users.role_id → roles.id` (restrict), `post_translations.post_id → posts.id` (cascade), `post_translations.language_id → languages.id` (restrict), `comments.post_translation_id → post_translations.id` (cascade).
- Requirements:
  - Thuật ngữ "Bản gốc" và "Bản dịch bài viết (Post translation)".
  - Quyết định D14: phần dùng chung (tác giả, danh mục, thumbnail) và phần riêng của từng bản dịch (tiêu đề, slug, tóm tắt, nội dung, trạng thái, ngày đăng, lượt xem, bình luận).
  - UC06: dòng "Bài viết này có ở các ngôn ngữ: ..." để chuyển sang bản dịch khác.
  - UC13: quản lý bản dịch (thêm/sửa/xóa), màn hình sửa bài có tab cho từng ngôn ngữ, form bản dịch mới điền sẵn nội dung bản gốc.
  - Mục ngoài phạm vi: dịch tự động, đánh dấu bản dịch lỗi thời, đổi ngôn ngữ gốc sau khi tạo.
- Sample data: bảng `roles`, bảng `post_translations` (5 bản dịch, có bản dịch `draft`), bình luận trên bản dịch `en`, bảng trang chủ theo từng ngôn ngữ.

### Changed

- `users.role` (enum) → `users.role_id` (FK tới `roles`).
- `posts` chỉ giữ phần dùng chung: `user_id`, `language_id` (ngôn ngữ gốc, không đổi được), `category_id`, `thumbnail`. Các cột nội dung chuyển sang `post_translations`. Index còn `user_id` và `category_id`.
- `comments.post_id` → `comments.post_translation_id`: mỗi bản dịch có luồng bình luận riêng; reply phải cùng `post_translation_id` với comment cha.
- Requirements:
  - Phiên bản 1.5 → 1.6.
  - D3: post có ngôn ngữ gốc và có bản dịch, không fallback về bản gốc.
  - Phase 1 thêm bảng `roles`, `post_translations`; FULLTEXT index đặt trên `post_translations`.
  - UC05, UC07, UC19: chỉ hiện/đếm/tìm các bản dịch `published` ở ngôn ngữ đang chọn.
  - UC06: lượt xem tính riêng cho từng bản dịch; 404 khi không có bản dịch với slug đó ở ngôn ngữ đang chọn.
  - UC08: xóa bản dịch thì xóa bình luận của bản dịch đó.
  - UC09: đang ở chi tiết bài thì chuyển sang bản dịch tương ứng (không có thì về trang chủ); đang ở trang danh mục thì chuyển sang slug danh mục ở ngôn ngữ mới.
  - UC16: không xóa được ngôn ngữ đang có bản dịch bài viết; ngôn ngữ đã tắt không chọn được làm ngôn ngữ gốc hay thêm bản dịch mới.
  - Mục 2 (vai trò): role lưu ở bảng `roles`, tham chiếu qua `users.role_id`.
  - Seeder (6.6): thêm 3 role, bài gốc ở cả `vi` và `en`, một phần bài có bản dịch.
  - Điều kiện hoàn thành phase 5: thêm bước "thêm bản dịch cho bài".
- Sample data: đánh lại số thứ tự các mục; số bài theo danh mục tách theo từng ngôn ngữ.

### Removed

- Enum `user_role` (thay bằng bảng `roles`).
- Giá trị `facebook` khỏi enum `oauth_provider` (chỉ còn `google`, `github`).
- Index `users(role, is_active)`, `languages(is_active)`, `ui_translations(key)`.
- Index cũ trên `posts`: `(language_id, status, published_at)`, `(category_id, language_id, status, published_at)`, `(user_id, status)`.
- Mục ngoài phạm vi "Liên kết các bản dịch của cùng một bài viết" (nay đã làm).

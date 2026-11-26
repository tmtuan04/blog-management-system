---
paths:
  - "frontend/**"
---

# Frontend (Angular)

Nguồn chuẩn: `docs/phase-4-frontend.md` mục 3 (khung), 4 (bảng màn), 5 (chuyển HTML sang Angular), 7 (quy ước). Màn mẫu để làm theo: `features/auth/login/` (form), `features/admin/posts/` (danh sách admin). Dưới đây là những điều dễ quên.

## Phân tầng

- Gọi `HttpClient` chỉ trong service của khu vực. Service trả Observable đã `unwrap()` / `unwrapPage()`, không giữ trạng thái giao diện.
- Component màn hình giữ trạng thái bằng signal (`loading`, `items`, `meta`), dùng `inject()`, `ChangeDetectionStrategy.OnPush`.
- Subscribe phải tự hủy: `takeUntilDestroyed()`, `toSignal()` hoặc pipe `async`.
- Không thao tác DOM trực tiếp, trừ trong `rich-text-editor` và script chặn theme.

## Dùng cái có sẵn, không tự viết lại

- Không thêm `/api/v1`, `Authorization`, `Accept-Language` bằng tay: interceptor đã làm. Không gọi thẳng `http://localhost:3000`.
- Lỗi form từ server: `setServerErrors(form, err)`. Câu lỗi hiện bằng `field-error`, nút gửi dùng `submit-button`.
- Xác nhận xóa: `confirm.open({ ..., action })`. Thông báo: `toast.success(key)` / `toast.error(key)`.
- Phân trang: component `pagination`; `page` và bộ lọc ghi lên query string.
- Ảnh từ API: pipe `uploadUrl`. Rich text: `rich-text-editor` (form) và `[innerHTML]` trong `.prose` (hiển thị).
- Phiên đăng nhập: `AuthService` (`isLoggedIn`, `canWrite`, `isSuperAdmin`). Ngôn ngữ: `LanguageService` (`current`, `use(code)`, `reload()`).
- Component Bootstrap động dùng `ng-bootstrap` (`ngbDropdown`, `NgbModal`, `ngbNav`, `ngbTooltip`). Không nạp `bootstrap.bundle.js`, không chép `html/js/*.js`.

## Đa ngôn ngữ

- Mọi chữ tĩnh qua pipe `translate`; thuộc tính dùng `[placeholder]="'key' | translate"`, `[attr.aria-label]="..."`. Không viết chữ trong template hay TypeScript.
- Tìm key có sẵn trong `public/i18n/vi.json` trước khi thêm. Key mới thêm vào cả `vi.json` và `en.json`, rồi `npm run i18n:check`.
- Lỗi API: không hiện `message` của backend; tra `error.<code viết thường>`. Lỗi theo field chỉ backend biết thì map sang `validation.*` trong component (Q5).
- Màn có dữ liệu theo ngôn ngữ phải tự tải lại khi đổi ngôn ngữ: `toObservable(language.current)` kết hợp tham số route rồi `switchMap`.

## Quyền và lỗi theo màn

- Route `/admin/**` có `authGuard` + `roleGuard` với `data: { roles }` theo bảng ở docs mục 4. Guard chỉ là giao diện, vẫn xử lý 403 từ API.
- 404 / 403 khi mở màn có slug, key, id: hiện màn lỗi tại chỗ, giữ nguyên URL.

## Bảo mật

- Không dùng `bypassSecurityTrust*`. Bình luận, tên người dùng, dữ liệu người dùng nhập hiện bằng `{{ }}`, không bao giờ `innerHTML`.
- `localStorage` chỉ có 4 key: `auth.accessToken`, `auth.refreshToken`, `lang`, `theme`. Token không bao giờ lên URL.

## Chuyển từ HTML phase 2

- Giữ nguyên thứ tự thẻ, class, `alt`, `<label>`, `aria-label` của file trong `html/`. Câu lỗi validate là câu trong `invalid-feedback`.
- Bỏ thanh demo và mọi `data-demo*`; mỗi trạng thái demo thành trạng thái thật (`@if`, `@for ... @empty`).
- Sửa markup, câu chữ hoặc SCSS dùng chung thì sửa cả `html/` lẫn `frontend/` trong cùng thay đổi, cho đến khi phase 2 đóng.

## SCSS

- Như `.claude/rules/html.md`: ưu tiên class Bootstrap, BEM không tiền tố, màu luôn `var(--bl-...)`, không inline style, không `!important`, mobile-first.
- Style dùng chung nằm ở `src/styles/`, không chuyển vào `styles` của component. Không dùng `::ng-deep`.

## Phần nền, hỏi trước khi sửa

- `src/app/core/`, `src/app/shared/`, `src/app/layouts/`, `src/styles/abstracts|themes|layouts` là phần nền, PR đụng vào phải có người phụ trách khung duyệt.
- Thiếu API hoặc API trả khác tài liệu: báo người làm module backend đó, không tự sửa backend.

## Trước khi xong

- Trong `frontend/`: `npm run lint`, `npm run test`, `npm run build`, `npm run i18n:check`.
- Không tự xác nhận giao diện đúng nếu chưa mở trang: 360px và desktop, sáng và tối, `vi` và `en`, đúng role.
- Component hoặc class dùng chung mới thì thêm dòng vào bảng "Có sẵn để dùng" của `frontend/README.md`.

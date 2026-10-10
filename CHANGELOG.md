# Changelog

Ghi lại các thay đổi của dự án. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/).

## [Unreleased]

### Added

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
- `js/theme.js`: hỗ trợ nút đổi theme dạng switch (`input[type=checkbox][data-theme-toggle]`, dùng trong offcanvas mobile), đồng bộ `checked` theo theme.
- Phase 2 doc: token `--bl-border-strong`, `--bl-btn-primary-hover` và các token `-rgb`; quy ước `data-i18n-placeholder`, `data-i18n-aria-label`; dữ liệu từ CSDL không gắn `data-i18n`.

### Changed

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

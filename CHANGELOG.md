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

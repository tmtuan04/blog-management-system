# Phase 2 - Xây dựng giao diện HTML (clone Medium)

| Mục | Nội dung |
| --- | --- |
| Phiên bản | 1.0 (theo requirements 1.7) |
| Ngày tạo | 08/10/2026 |
| Thời gian | ~1 tuần (5 ngày làm việc) |
| Đầu vào | [requirements.md](requirements.md) (mục 1.5 - Phase 2, mục 4, mục 6.3), [sample-data.md](sample-data.md) |
| Đầu ra | Thư mục `html/` chứa các file HTML, SCSS, CSS đã build, JS demo |

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

- Dựng toàn bộ màn hình của hệ thống bằng HTML tĩnh, Bootstrap 5 và SCSS, dùng dữ liệu giả, chưa gọi API.
- Giao diện **clone theo phong cách Medium** (medium.com): bố cục, kiểu chữ, khoảng trắng, màu sắc và cách sắp xếp thông tin.
- Các file HTML là bản mẫu để phase 4 cắt thành component Angular, nên markup phải chia khối rõ ràng, đặt tên class thống nhất.

### 1.2. "Clone Medium" nghĩa là gì

| Clone | Không clone |
| --- | --- |
| Bố cục trang chủ: cột feed ở giữa, sidebar bên phải | Logo, tên "Medium" và mọi hình ảnh thương hiệu. Blog dùng tên riêng của nhóm |
| Kiểu chữ: tiêu đề sans-serif đậm, nội dung bài serif cỡ lớn, dòng thoáng | Font độc quyền của Medium (`sohne`, `charter`). Thay bằng font miễn phí, xem mục 3.2 |
| Thẻ bài viết: dòng tác giả, tiêu đề, tóm tắt, thumbnail bên phải, dòng meta | Chức năng ngoài phạm vi (requirements mục 8): clap/like, bookmark, share, follow, highlight, membership, thông báo |
| Trang chi tiết: cột đọc hẹp (~680px), thanh tác giả, thanh hành động có viền trên dưới | Infinite scroll. Hệ thống dùng phân trang (UC05) |
| Nút bo tròn dạng viên thuốc (pill), header mảnh có viền dưới | Bố cục đăng nhập dạng modal. Hệ thống dùng trang riêng nhưng trình bày giống modal của Medium |
| Trình soạn thảo tối giản: tiêu đề lớn, nội dung serif, không khung viền | Ảnh, bài viết thật copy từ Medium. Chỉ dùng dữ liệu giả theo sample-data |

Medium không có trang quản trị. Trang quản trị dùng chung bộ màu, font, nút của phần public, bố cục theo kiểu admin thông thường (sidebar trái + bảng), tham khảo trang "Your stories" của Medium cho danh sách bài viết.

### 1.3. Ánh xạ chức năng Medium sang yêu cầu của dự án

| Thành phần trên Medium | Trên hệ thống | Use case |
| --- | --- | --- |
| Tab "For you / Following" đầu feed | Thanh chip danh mục cuộn ngang (Tất cả, Lập trình, Đời sống...) | UC05, UC07 |
| "Recommended topics" ở sidebar | Danh sách danh mục kèm số bài | UC07 |
| "Staff Picks" ở sidebar | "Đọc nhiều nhất" (theo lượt xem, dữ liệu giả) | UC05 |
| Link Help/About/Privacy cuối sidebar | Footer: Giới thiệu, Liên hệ, Chính sách bảo mật | UC11 |
| Nút "Write" trên header | "Viết bài" (chỉ hiện với Blog Owner, Super Admin), dẫn tới form thêm bài | UC13 |
| Menu avatar | Hồ sơ, Quản lý bài viết, Trang quản trị, Đăng xuất (hiện theo role) | UC04, UC12 |
| Thanh clap/comment/bookmark | Lượt xem, số bình luận | UC06 |
| "Responses" (drawer bên phải) | Khu bình luận ngay dưới bài, trả lời tối đa 1 cấp | UC08 |
| "More from <tác giả>" | "Bài viết cùng danh mục" | UC06 |
| (không có) | Bộ chọn ngôn ngữ, nút sáng/tối trên header | UC09, UC10 |
| (không có) | Dòng "Bài viết này có ở các ngôn ngữ: ..." dưới tiêu đề | UC06 |

---

## 2. Công cụ và cấu trúc thư mục

### 2.1. Công cụ

| Thành phần | Lựa chọn |
| --- | --- |
| CSS framework | Bootstrap 5.3 (cài qua npm, import SCSS để ghi đè biến) |
| Biên dịch SCSS | `sass` (Dart Sass) qua npm script |
| Icon | Bootstrap Icons |
| Font | Google Fonts: `Inter` (giao diện), `Source Serif 4` (nội dung bài). Cả hai hỗ trợ tiếng Việt |
| JS | Chỉ `bootstrap.bundle.min.js` và vài file JS nhỏ cho đổi theme và chuyển trạng thái demo. Không dùng jQuery |
| Kiểm tra hiển thị | DevTools (Device Toolbar), Chrome, Edge, Firefox bản mới nhất |
| Chạy thử | Extension Live Server của VS Code |

`html/package.json`:

```json
{
  "name": "blog-html",
  "private": true,
  "scripts": {
    "build": "sass scss/main.scss css/main.css --load-path=node_modules --style=compressed --no-source-map",
    "watch": "sass scss/main.scss css/main.css --load-path=node_modules --watch"
  },
  "dependencies": {
    "bootstrap": "^5.3.3",
    "bootstrap-icons": "^1.11.3"
  },
  "devDependencies": {
    "sass": "^1.80.0"
  }
}
```

Chạy `npm install` rồi `npm run watch` trong lúc làm. File `css/main.css` được commit để người review mở HTML là xem được ngay.

### 2.2. Cấu trúc thư mục

```text
html/
├── index.html                  # Mục lục: link tới mọi màn hình, dùng để review
├── package.json
├── scss/
│   ├── main.scss               # Import theo thứ tự: abstracts → bootstrap → themes → base → layouts → components → pages
│   ├── abstracts/
│   │   ├── _variables.scss     # Ghi đè biến Bootstrap: font, màu, bo góc, breakpoint
│   │   └── _mixins.scss
│   ├── themes/
│   │   ├── _light.scss         # CSS custom properties cho chế độ sáng
│   │   └── _dark.scss          # [data-bs-theme="dark"]
│   ├── base/
│   │   ├── _typography.scss
│   │   └── _base.scss
│   ├── layouts/
│   │   ├── _public.scss        # Header, footer, khung 2 cột
│   │   ├── _auth.scss          # Khung trang đăng nhập/đăng ký
│   │   └── _admin.scss         # Sidebar, topbar, khung nội dung
│   ├── components/             # Mỗi component một file: _post-card.scss, _comment.scss, _editor.scss...
│   └── pages/                  # Style riêng của từng trang (chỉ khi thật cần)
├── css/main.css                # Kết quả build
├── js/
│   ├── theme.js                # Đổi sáng/tối, lưu localStorage (UC10)
│   └── demo-state.js           # Chuyển trạng thái demo: bình thường, lỗi, loading, rỗng
├── assets/img/                 # Ảnh giả: thumbnail, avatar, ảnh trong bài
├── _templates/                 # Khung mẫu để copy khi tạo trang mới
│   ├── public.html
│   ├── auth.html
│   └── admin.html
├── public/                     # Màn hình public và tài khoản
└── admin/                      # Màn hình quản trị
```

HTML tĩnh không có include, nên header, footer, sidebar được copy vào từng file. Quy định:

- B làm xong `_templates/` trước, A và C copy từ đây.
- Khi đổi header/footer/sidebar, người đổi phải cập nhật ở mọi file trong cùng một PR.

---

## 3. Design tokens (B phụ trách)

Mọi màu, font, khoảng cách dùng qua biến, không viết mã màu trực tiếp trong file component hay trang.

### 3.1. Màu

Khai báo bằng CSS custom properties để đổi theme không cần build lại. Medium không có dark mode trên web, nên bảng màu tối do nhóm tự đặt, giữ độ tương phản tương đương.

| Token | Dùng cho | Sáng | Tối |
| --- | --- | --- | --- |
| `--bl-bg` | Nền trang | `#FFFFFF` | `#121212` |
| `--bl-bg-subtle` | Nền khối phụ, hover, sidebar admin | `#F9F9F9` | `#1C1C1C` |
| `--bl-text` | Chữ chính | `#242424` | `#E6E6E6` |
| `--bl-text-secondary` | Tóm tắt, meta, label | `#6B6B6B` | `#A8A8A8` |
| `--bl-border` | Đường kẻ, viền ô nhập | `#F2F2F2` | `#2B2B2B` |
| `--bl-btn-primary-bg` | Nút chính (pill đen kiểu Medium) | `#191919` | `#F2F2F2` |
| `--bl-btn-primary-text` | Chữ trên nút chính | `#FFFFFF` | `#191919` |
| `--bl-accent` | Link, trạng thái active, chip đang chọn | `#1A8917` | `#4CC55A` |
| `--bl-danger` | Lỗi validate, nút xóa | `#C94A4A` | `#E57373` |
| `--bl-warning` | Badge `draft` | `#B26A00` | `#FFB74D` |
| `--bl-success` | Badge `published`, toast thành công | `#1A8917` | `#4CC55A` |
| `--bl-muted` | Badge `archived`, tài khoản bị khóa | `#9E9E9E` | `#757575` |

Theme bật bằng thuộc tính `data-bs-theme="light|dark"` trên thẻ `<html>` (color mode có sẵn của Bootstrap 5.3), nên các component Bootstrap (modal, dropdown, form) tự đổi màu theo.

### 3.2. Kiểu chữ

| Vai trò | Font | Cỡ / line-height (desktop) | Mobile | Đậm |
| --- | --- | --- | --- | --- |
| Tiêu đề bài (trang chi tiết) | Inter | 42px / 52px | 32px / 38px | 700 |
| Tiêu đề trang (admin, auth, trang tĩnh) | Inter | 32px / 40px | 26px / 32px | 700 |
| Tiêu đề thẻ bài viết | Inter | 20px / 28px | 16px / 20px | 700 |
| Tóm tắt trên thẻ | Inter | 16px / 24px | 14px / 20px | 400 |
| Nội dung bài, trang tĩnh | Source Serif 4 | 20px / 32px | 18px / 28px | 400 |
| H2 / H3 trong nội dung | Inter | 24px / 30px; 20px / 28px | giảm 2px | 700 |
| Meta (tác giả, ngày, lượt xem) | Inter | 13px / 20px | 13px | 400 |
| Giao diện chung (nút, form, bảng) | Inter | 14px / 20px | 14px | 400-500 |

Font load từ Google Fonts với `subset` có `vietnamese`. Kiểm tra hiển thị chữ có dấu chồng (ví dụ "Hướng dẫn", "Ứng dụng") ở mọi cỡ.

### 3.3. Kích thước và khoảng cách

| Token | Giá trị |
| --- | --- |
| Chiều cao header | 57px, có viền dưới `--bl-border` |
| Cột feed trang chủ | Tối đa 728px |
| Sidebar phải trang chủ | 368px, chỉ hiện từ `lg` (≥ 992px) |
| Cột đọc trang chi tiết, trang tĩnh | Tối đa 680px, căn giữa |
| Sidebar admin | 240px; dưới `lg` thu thành offcanvas |
| Bo góc | Nút, chip: `999px` (pill); thẻ, modal, ô nhập: `4px`; avatar: tròn |
| Khoảng cách | Theo thang Bootstrap (`$spacer = 1rem`), giữa 2 thẻ bài viết trên feed là 32px, có kẻ dưới |
| Breakpoint | Giữ mặc định Bootstrap: `sm` 576, `md` 768, `lg` 992, `xl` 1200. Thiết kế từ 360px trở lên |

---

## 4. Layout (B phụ trách)

### 4.1. Layout public

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] [🔍 Tìm kiếm...]      [✎ Viết bài] [VI ▾] [☾] [Avatar ▾]      │  header 57px
├──────────────────────────────────────────────────────────────────────┤
│                                    │                                 │
│   Nội dung chính (≤ 728px)         │  Sidebar (368px, từ lg)         │
│                                    │                                 │
├──────────────────────────────────────────────────────────────────────┤
│ © Tên blog · Giới thiệu · Liên hệ · Chính sách bảo mật               │  footer
└──────────────────────────────────────────────────────────────────────┘
```

- **Header khi chưa đăng nhập:** logo, ô tìm kiếm, bộ chọn ngôn ngữ, nút theme, link "Đăng nhập", nút pill "Bắt đầu" (đăng ký).
- **Header khi đã đăng nhập:** thay 2 nút trên bằng avatar có dropdown. Nút "Viết bài" chỉ hiện với Blog Owner và Super Admin. Mục "Trang quản trị" trong dropdown chỉ hiện với Super Admin.
- **Menu:** "Trang chủ", "Giới thiệu" (UC11). Trên desktop nằm cạnh logo, trên mobile nằm trong offcanvas mở từ nút ☰.
- **Mobile (< 768px):** ô tìm kiếm thu thành icon 🔍, bấm vào mở thanh tìm kiếm toàn chiều rộng; bộ chọn ngôn ngữ và nút theme chuyển vào offcanvas.
- Mỗi file public có 2 biến thể header (khách / đã đăng nhập) đặt cạnh nhau, chuyển qua bằng `demo-state.js` (mục 7.2).

### 4.2. Layout auth

Trang trắng, chỉ có logo ở trên, giữa là một khối rộng tối đa 440px giống modal "Sign in" của Medium: tiêu đề serif lớn căn giữa, các nút OAuth pill viền (Google, Github), đường kẻ "hoặc", form email/mật khẩu, link chuyển trang ở dưới.

### 4.3. Layout admin

```text
┌──────────────┬───────────────────────────────────────────────────────┐
│ [Logo]       │ Tiêu đề trang                 [VI ▾] [☾] [Avatar ▾]   │
│              ├───────────────────────────────────────────────────────┤
│ Bài viết     │ [Thanh lọc / tìm kiếm]                   [+ Thêm mới] │
│ Người dùng*  │ ┌───────────────────────────────────────────────────┐ │
│ Danh mục*    │ │ Bảng dữ liệu                                      │ │
│ Ngôn ngữ*    │ └───────────────────────────────────────────────────┘ │
│ Bản dịch GD* │                                    [‹ 1 2 3 ›]        │
│ Trang tĩnh*  │                                                       │
│ ← Về blog    │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
  * Chỉ Super Admin thấy
```

- Bảng dùng `table` của Bootstrap, không kẻ dọc, chỉ kẻ ngang `--bl-border`, hàng hover nền `--bl-bg-subtle`.
- Dưới `md`, bảng bọc trong `.table-responsive`; với danh sách bài viết thì chuyển mỗi hàng thành thẻ xếp dọc.

---

## 5. Danh sách màn hình

Cột "Route phase 4" là đường dẫn dự kiến trong Angular, ghi lại để đặt tên file và link giữa các trang cho thống nhất.

### 5.1. B - Public và tài khoản

| File | Route phase 4 | UC | Nội dung chính | Trạng thái bắt buộc |
| --- | --- | --- | --- | --- |
| `public/index.html` | `/` | UC05 | Thanh chip danh mục; danh sách thẻ bài viết (10 thẻ); phân trang; sidebar: "Đọc nhiều nhất", danh mục kèm số bài, link footer | Bình thường, loading (skeleton), rỗng ("Chưa có bài viết ở ngôn ngữ này") |
| `public/post-detail.html` | `/posts/:slug` | UC06, UC08 | Tiêu đề, tóm tắt (dạng subtitle xám), thanh tác giả (avatar, tên, danh mục, ngày đăng, thời gian đọc), thanh lượt xem + số bình luận có viền trên dưới, dòng "Bài viết này có ở các ngôn ngữ", ảnh thumbnail, nội dung rich text đủ mọi định dạng của editor, chip danh mục, khu bình luận, bài cùng danh mục (lưới 2 cột) | Khách (nút "Đăng nhập để bình luận"), đã đăng nhập (ô nhập bình luận), lỗi validate bình luận, đang gửi, chưa có bình luận, hộp xác nhận xóa bình luận |
| `public/category.html` | `/categories/:slug` | UC07 | Tiêu đề danh mục lớn + số bài, chip danh mục đang chọn được tô, danh sách bài như trang chủ | Bình thường, rỗng |
| `public/search.html` | `/search?q=` | UC19 | "Kết quả cho *từ khóa*" + số kết quả, danh sách thẻ bài, phân trang | Có kết quả, không có kết quả, lỗi từ khóa (< 2 hoặc > 100 ký tự) |
| `public/404.html` | (mọi route lỗi) | UC06, UC11 | Số "404" lớn, câu thông báo, nút pill "Về trang chủ" | - |
| `public/register.html` | `/register` | UC01 | Họ tên, email, mật khẩu, xác nhận mật khẩu; nút OAuth | Bình thường, lỗi từng trường (email trùng, mật khẩu yếu, không khớp), loading |
| `public/login.html` | `/login` | UC02, UC20 | Email, mật khẩu, link "Quên mật khẩu"; nút Google, Github | Bình thường, thông báo đăng ký thành công, sai email/mật khẩu, tài khoản bị khóa, quá số lần thử (429), lỗi OAuth không có email, loading |
| `public/forgot-password.html` | `/forgot-password` | UC03 | Ô email | Bình thường, lỗi validate, loading, đã gửi ("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn") |
| `public/reset-password.html` | `/reset-password?token=` | UC03 | Mật khẩu mới, xác nhận | Bình thường, lỗi validate, loading, token hết hạn/không hợp lệ |
| `public/profile.html` | `/profile` | UC12 | Avatar lớn + nút đổi ảnh, họ tên, email (chỉ đọc), role (chỉ đọc); khối đổi mật khẩu riêng | Lỗi validate, lỗi ảnh (sai định dạng, > 2MB), loading, lưu thành công; biến thể tài khoản OAuth chưa có mật khẩu (ẩn ô mật khẩu cũ) |

Các component B làm và dùng chung: header, footer, thẻ bài viết, chip danh mục, phân trang, hộp xác nhận (modal), toast, skeleton, khối trạng thái rỗng, bình luận.

### 5.2. A - Quản trị bài viết, người dùng, ngôn ngữ

| File | Route phase 4 | UC | Nội dung chính | Trạng thái bắt buộc |
| --- | --- | --- | --- | --- |
| `admin/posts.html` | `/admin/posts` | UC13 | Tab trạng thái kiểu "Your stories" của Medium (Tất cả, Nháp, Đã đăng, Lưu trữ - theo bản gốc); lọc ngôn ngữ, danh mục; ô tìm tiêu đề. Bảng: thumbnail nhỏ, tiêu đề bản gốc, ngôn ngữ gốc, danh mục, badge từng bản dịch (`VI · Đã đăng`, `EN · Nháp`), ngày cập nhật, menu ⋯ (Sửa, Xem, Xóa) | Bình thường, rỗng, loading, hộp xác nhận xóa bài |
| `admin/post-create.html` | `/admin/posts/new` | UC13 | Thanh trên: "Nháp" + nút pill "Lưu". Phần dùng chung: chọn ngôn ngữ gốc, danh mục, upload thumbnail (xem trước). Bản gốc: tiêu đề kiểu Medium (Inter 42px, không viền), tóm tắt, editor, trạng thái | Lỗi validate từng trường, lỗi ảnh, đang lưu |
| `admin/post-edit.html` | `/admin/posts/:id/edit` | UC13 | Phần dùng chung ở trên (ngôn ngữ gốc chỉ đọc). Dưới là tab ngôn ngữ: tab gốc có nhãn "Gốc"; tab đã có bản dịch hiện form + slug (chỉ đọc) + lượt xem + nút "Xóa bản dịch"; tab chưa có bản dịch hiện khối rỗng với nút "Thêm bản dịch" | Tab có dữ liệu, tab chưa có bản dịch, form bản dịch mới đã điền sẵn nội dung bản gốc, lỗi validate, đang lưu, hộp xác nhận xóa bản dịch |
| `admin/users.html` | `/admin/users` | UC14 | Tìm theo tên/email; lọc role, trạng thái. Bảng: avatar, họ tên, email, role (badge), trạng thái, ngày tạo, hành động (đổi role, khóa/mở khóa). Modal tạo tài khoản | Bình thường, rỗng, modal có lỗi validate, hộp xác nhận khóa tài khoản, hàng của chính mình bị vô hiệu nút khóa/đổi role |
| `admin/languages.html` | `/admin/languages` | UC16 | Bảng: mã, tên, mặc định (radio/badge), hoạt động (switch), hành động. Modal thêm/sửa | Ngôn ngữ mặc định không tắt/xóa được (nút disabled + tooltip), lỗi xóa ngôn ngữ đang có bản dịch, modal lỗi validate (mã trùng, sai ISO 639-1) |

A làm thêm component **rich text editor** (giao diện tĩnh) dùng chung với C:

- Thanh công cụ: H2, H3, đậm, nghiêng, gạch chân, danh sách, trích dẫn, link, ảnh (đúng danh sách ở UC18).
- Vùng nhập dùng `contenteditable`, font Source Serif 4 20px giống trang chi tiết, không khung viền, có placeholder "Kể câu chuyện của bạn...".
- Có trạng thái lỗi (viền dưới đỏ + dòng lỗi) và trạng thái đang upload ảnh.
- Phase 2 chỉ dựng giao diện, chưa cần nút bấm hoạt động. Phase 4 sẽ thay bằng thư viện editor và giữ style này.

### 5.3. C - Trang tĩnh, danh mục, bản dịch giao diện

| File | Route phase 4 | UC | Nội dung chính | Trạng thái bắt buộc |
| --- | --- | --- | --- | --- |
| `public/page.html` | `/pages/:key` | UC11 | Cột đọc 680px: tiêu đề lớn, nội dung rich text (dùng chung style nội dung bài). Làm mẫu đủ 3 trang `about`, `contact`, `privacy` bằng dữ liệu giả | - (404 dùng trang của B) |
| `admin/categories.html` | `/admin/categories` | UC15 | Bảng: tên theo ngôn ngữ mặc định, các cột tên theo từng ngôn ngữ (ô trống hiện chữ xám "Chưa có, dùng: Đời sống"), slug, số bài, hành động. Modal thêm/sửa có một ô tên cho mỗi ngôn ngữ | Modal lỗi validate (thiếu tên ngôn ngữ mặc định), lỗi xóa danh mục đang có bài, hộp xác nhận xóa, rỗng |
| `admin/ui-translations.html` | `/admin/ui-translations` | UC17 | Ô tìm theo key/giá trị; bảng: cột key (font monospace), mỗi ngôn ngữ một cột, ô bấm vào thì sửa tại chỗ; ô thiếu giá trị tô nền nhạt + chữ xám. Modal thêm key | Đang sửa một ô, đang lưu, key trùng, rỗng, hộp xác nhận xóa key |
| `admin/pages.html` | `/admin/pages` | UC18 | Bảng: tên trang, key, badge các ngôn ngữ đã có nội dung, trạng thái hiển thị, ngày cập nhật, nút "Sửa". Không phân trang | - |
| `admin/page-edit.html` | `/admin/pages/:key/edit` | UC18 | Thông tin key + URL (chỉ đọc), switch "Hiển thị", tab ngôn ngữ (mỗi tab: tiêu đề + editor của A), nút "Lưu" và "Xem trên trang public" (mở tab mới) | Lỗi validate tab ngôn ngữ mặc định, lỗi "điền đủ cả hai hoặc để trống cả hai" ở tab khác, tab có lỗi được đánh dấu chấm đỏ, đang lưu, toast thành công |

C viết thêm `js/theme.js` (UC10):

- Lần đầu: đọc `prefers-color-scheme`. Sau đó đọc/ghi `localStorage` key `theme`.
- Gán `data-bs-theme` lên `<html>` **trong `<head>`** (script chặn) để không bị nháy màu khi tải trang.
- Nút theme đổi icon ☀/☾ theo theme hiện tại, dùng chung cho cả public và admin.

---

## 6. Dữ liệu giả

- Lấy theo [sample-data.md](sample-data.md) để giao diện khớp với dữ liệu sẽ seed: tác giả "Nguyễn Văn An", "Trần Thị Bình"; danh mục "Lập trình", "Đời sống"; bài "Hướng dẫn Angular", "Bắt đầu với NestJS"...
- Trang chủ cần đủ 10 thẻ bài để thấy phân trang; thêm bài giả theo cùng phong cách.
- Phải có dữ liệu "khó": tiêu đề dài 2-3 dòng, tóm tắt dài (cắt bằng `line-clamp`), bài không có thumbnail, tên tác giả dài, chuỗi không dấu rất dài (kiểm tra tràn chữ), bình luận nhiều dòng.
- Nội dung bài mẫu trên `post-detail.html` phải có đủ: đoạn văn, H2, H3, đậm/nghiêng/gạch chân, danh sách có thứ tự và không thứ tự, trích dẫn, link, ảnh có chú thích, khối code.
- Ảnh đặt trong `assets/img/`, dung lượng nhỏ (< 200KB mỗi ảnh). Không hotlink ảnh từ Medium hay trang khác.

---

## 7. Quy ước code

### 7.1. HTML

- HTML5 chuẩn, có `<meta name="viewport">`, `lang="vi"`.
- Dùng thẻ ngữ nghĩa: `header`, `nav`, `main`, `aside`, `article`, `footer`.
- Mỗi khối sẽ thành component Angular được bọc bằng comment để phase 4 dễ cắt:

  ```html
  <!-- component: post-card -->
  <article class="post-card">...</article>
  <!-- /component: post-card -->
  ```

- Mọi chữ tĩnh trên giao diện gắn thuộc tính `data-i18n` với key UI translation dự kiến, để phase 4 và seeder UI translations (UC17) dùng chung danh sách key:

  ```html
  <a href="#" data-i18n="menu.home">Trang chủ</a>
  <button class="btn btn-dark rounded-pill" data-i18n="auth.login">Đăng nhập</button>
  ```

  Key đặt theo dạng `<nhóm>.<tên>`: `menu.*`, `auth.*`, `post.*`, `comment.*`, `admin.*`, `common.*`, `validation.*`.
- Ảnh có `alt`; ô nhập có `<label>` (có thể ẩn bằng `visually-hidden`); nút chỉ có icon có `aria-label`.
- Link giữa các trang dùng đường dẫn tương đối tới file HTML thật, để bấm qua lại được khi review.

### 7.2. Trạng thái demo

Mỗi trang có nhiều trạng thái (mục 5) nhưng chỉ là một file. Dùng `js/demo-state.js`:

- Thêm một thanh nhỏ cố định góc dưới phải, chỉ có ở phase 2, gồm các nút: "Bình thường", "Lỗi validate", "Loading", "Rỗng", "Khách / Đã đăng nhập".
- Bấm nút thì gán `data-demo-state="..."` lên `<body>`. Các khối trạng thái trong HTML được ẩn/hiện bằng CSS theo thuộc tính này.
- Trạng thái lỗi dùng đúng class của Bootstrap: `is-invalid` trên ô nhập + `invalid-feedback` ngay dưới, để phase 4 nối thẳng với Angular Validators.
- Trạng thái loading: nút bị `disabled`, có `spinner-border spinner-border-sm` + chữ "Đang lưu...".
- Thanh demo và `demo-state.js` bị bỏ khi chuyển sang Angular.

### 7.3. SCSS

- Ghi đè biến Bootstrap trong `abstracts/_variables.scss` **trước** khi import Bootstrap. Không sửa file trong `node_modules`.
- Ưu tiên class tiện ích của Bootstrap (`d-flex`, `gap-3`, `mb-4`...). Chỉ viết SCSS riêng khi Bootstrap không có.
- Class tự viết dùng BEM, không có tiền tố: `.post-card`, `.post-card__title`, `.post-card--compact`.
- Màu luôn dùng `var(--bl-...)`, không viết mã hex trong component. Đây là điều kiện để dark mode chạy đúng.
- Không dùng `style="..."` inline, không dùng `!important` (trừ khi ghi đè Bootstrap bắt buộc, phải có comment giải thích).
- Viết mobile-first: style mặc định cho màn nhỏ, mở rộng bằng `@include media-breakpoint-up(md)`.
- Mỗi component một file `_ten-component.scss` trong `components/`; người tạo component nào thì sở hữu file đó.

### 7.4. Git

- Mỗi người làm trên nhánh `feature/html-<phần>`, ví dụ `feature/html-layout`, `feature/html-admin-posts`.
- Commit theo Conventional Commits: `feat(html): add post detail page`, `style(html): adjust dark mode colors`.
- PR đính kèm ảnh chụp màn hình ở 360px và desktop, cả sáng lẫn tối.
- Mỗi PR có ít nhất 1 người khác review. A review PR của C; B review mọi PR có đụng tới `abstracts/`, `themes/`, `layouts/`.

---

## 8. Kế hoạch theo ngày

| Ngày | A | B | C |
| --- | --- | --- | --- |
| 1 | Xem Medium, phác bố cục trang quản lý bài và form bài viết | Cài đặt `html/`, design tokens, theme sáng/tối, typography, `_templates/` (public, auth, admin). **Merge trong ngày** | Xem Medium, viết `theme.js`, chuẩn bị nội dung giả cho 3 trang tĩnh |
| 2 | Rich text editor (component), `post-create.html` | Header, footer hoàn chỉnh; thẻ bài viết, phân trang, modal xác nhận, toast; `index.html` (trang chủ) | `page.html`, `admin/pages.html` |
| 3 | `post-edit.html` (tab ngôn ngữ), `posts.html` | `post-detail.html` (gồm bình luận), `category.html`, `search.html`, `404.html` | `admin/page-edit.html` (dùng editor của A), `admin/categories.html` |
| 4 | `users.html`, `languages.html` | Các trang auth, `profile.html`, `demo-state.js`, trang mục lục `html/index.html` | `admin/ui-translations.html` |
| 5 | Kiểm tra chéo, sửa lỗi | Kiểm tra chéo toàn bộ, sửa lỗi layout chung | Kiểm tra chéo theo checklist mục 9, sửa lỗi |

- Ngày 1 chỉ có B chạm vào SCSS dùng chung. A và C bắt đầu viết trang sau khi PR khung của B được merge.
- Kiểm tra chéo ngày 5: A kiểm tra trang của B, B kiểm tra trang của C, C kiểm tra trang của A.

---

## 9. Điều kiện hoàn thành

Phase 2 kết thúc khi đạt hết các mục sau (mở rộng từ requirements mục 1.5):

**Đủ màn hình**

- [ ] Có đủ 20 file HTML ở mục 5, mở từ `html/index.html` bấm tới được tất cả.
- [ ] Các link giữa trang (menu, thẻ bài, nút) dẫn đúng file.

**Giống Medium**

- [ ] Trang chủ, chi tiết bài, đăng nhập đặt cạnh trang tương ứng của Medium thì nhận ra cùng phong cách: bố cục, cỡ chữ, khoảng trắng, nút pill.
- [ ] Không dùng logo, tên, font độc quyền hay ảnh của Medium.

**Responsive và theme**

- [ ] Hiển thị đúng ở 360px, 768px, 1280px: không có thanh cuộn ngang, chữ không tràn, nút đủ lớn để bấm.
- [ ] Mọi trang đúng ở cả chế độ sáng và tối; không còn khối nào nền trắng hay chữ đen cố định ở chế độ tối.
- [ ] Đổi theme rồi tải lại trang vẫn giữ theme, không bị nháy màu.
- [ ] Hiển thị đúng trên Chrome, Edge, Firefox bản mới nhất.

**Trạng thái**

- [ ] Mọi form có trạng thái lỗi validate (lỗi nằm ngay dưới trường) và trạng thái loading.
- [ ] Các trạng thái ghi ở cột "Trạng thái bắt buộc" của mục 5 đều xem được qua thanh demo.

**Code**

- [ ] `npm run build` không lỗi, không cảnh báo deprecation của Sass.
- [ ] Không có mã màu viết trực tiếp ngoài `abstracts/` và `themes/`, không có style inline.
- [ ] Chữ tĩnh đã gắn `data-i18n`.
- [ ] Mọi PR đã được review và merge vào `dev`.

---

## 10. Ngoài phạm vi phase 2

- Gọi API, xử lý đăng nhập thật, lưu dữ liệu.
- Rich text editor hoạt động thật (chỉ dựng giao diện).
- Đổi ngôn ngữ thật: bộ chọn ngôn ngữ chỉ là dropdown tĩnh, nội dung vẫn tiếng Việt.
- Các chức năng của Medium nằm ngoài phạm vi dự án (mục 1.2).
- Tối ưu hiệu năng tải trang, SEO.

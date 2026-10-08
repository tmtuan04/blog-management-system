# Hướng dẫn làm phase 2 (dành cho B và C)

File này hướng dẫn từng bước: cài máy, chạy dự án, làm một màn hình từ đầu đến khi tạo PR. Quy định đầy đủ nằm ở [phase-2-html.md](phase-2-html.md). Khi file này và file đó nói khác nhau thì theo [phase-2-html.md](phase-2-html.md).

---

## 1. Đọc trước (khoảng 30 phút)

1. [phase-2-html.md](phase-2-html.md): đọc mục 1 (clone Medium là gì), mục 5 (**phần màn hình của bạn**) và mục 7 (quy ước code).
2. [html/README.md](../html/README.md): những class và biến đã có sẵn để dùng.
3. Mở màn mẫu `html/admin/posts.html` trên trình duyệt (xem mục 3), bấm thử thanh Demo ở góc dưới phải và nút đổi sáng/tối. Sau đó mở file này trong VS Code, đọc code kèm comment. **Mọi màn hình của bạn đều làm theo cách của màn này.**

---

## 2. Cài máy (làm 1 lần)

| Cần cài | Kiểm tra đã có chưa (gõ trong terminal) |
| --- | --- |
| [Git](https://git-scm.com/downloads) | `git --version` |
| [NodeJS bản LTS](https://nodejs.org) | `node -v` (từ v20 trở lên) |
| [VS Code](https://code.visualstudio.com) | |
| Extension **Live Server** (Ritwick Dey) trong VS Code | Chuột phải vào file `.html` thấy dòng "Open with Live Server" |

Mở terminal trong VS Code bằng phím ``Ctrl + ` ``.

---

## 3. Lấy code và chạy

**Lần đầu** (chưa có thư mục dự án trên máy):

```bash
git clone https://github.com/tmtuan04/blog-management-system.git
cd blog-management-system
git checkout dev
cd html
npm install
```

**Đã có dự án trên máy**: lấy code mới nhất.

```bash
git checkout dev
git pull origin dev
cd html
npm install
```

**Chạy để xem và sửa:**

1. Mở terminal, chạy lệnh dưới đây và **để nguyên terminal đó** trong suốt lúc làm. Lệnh này tự build lại CSS mỗi khi bạn lưu file `.scss`.

   ```bash
   cd html
   npm run watch
   ```

2. Trong VS Code, chuột phải vào file HTML (ví dụ `html/admin/posts.html`) rồi chọn **Open with Live Server**. Mỗi lần lưu file, trình duyệt tự tải lại.
3. Muốn xem giao diện mobile: nhấn `F12`, rồi `Ctrl + Shift + M`, nhập chiều rộng `360`.

---

## 4. Việc của từng người, theo thứ tự

Làm lần lượt từ trên xuống. Mỗi dòng là **một nhánh và một PR riêng**, làm xong dòng nào thì tạo PR dòng đó, đừng gom nhiều màn vào một PR.

### B

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | `_templates/public.html` (header, footer), `_templates/auth.html`, `scss/layouts/_public.scss`, `_auth.scss` | **Làm đầu tiên, merge trong ngày 1** vì C cần khung public. Xem bố cục ở mục 4.1, 4.2 của tài liệu. Header làm 4 biến thể theo vai trò (`data-demo-auths="guest user blog_owner super_admin"`) |
| 2 | Thẻ bài viết (`components/_post-card.scss`), toast, `public/index.html` (trang chủ) | Thẻ bài viết dùng lại ở trang danh mục, tìm kiếm, bài liên quan, nên làm kỹ |
| 3 | `public/post-detail.html` (gồm bình luận) | Nội dung bài dùng class `.prose` có sẵn |
| 4 | `public/category.html` | Dùng lại thẻ bài viết |
| 5 | `public/search.html`, `public/404.html` | |
| 6 | `public/register.html`, `login.html`, `forgot-password.html`, `reset-password.html` | Form: xem mục 6.1 |
| 7 | `public/profile.html` | |

Từ bây giờ B sở hữu `scss/abstracts/`, `scss/themes/`, `scss/layouts/`. A đã làm sẵn một số component mà theo phân công là của B (phân trang, hộp xác nhận, trạng thái rỗng). B xem lại, muốn sửa thì sửa và báo A.

### C

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | `admin/pages.html` | **Màn dễ nhất, làm trước để quen.** Copy khung admin, bảng 3 dòng, không phân trang. Bảng tham khảo `posts.html` |
| 2 | `admin/categories.html` | Bảng + modal thêm/sửa (một ô tên cho mỗi ngôn ngữ) + hộp xác nhận xóa (copy từ `posts.html`) |
| 3 | `admin/ui-translations.html` | Bảng nhiều cột ngôn ngữ, ô sửa tại chỗ (làm dạng tĩnh: một ô đang ở trạng thái sửa) |
| 4 | `public/page.html` | **Chờ B merge khung public** (việc #1 của B). Nội dung dùng class `.prose` |
| 5 | `admin/page-edit.html` | **Chờ A merge rich text editor.** Tab ngôn ngữ dùng `.nav-tabs` của Bootstrap |

`js/theme.js` (UC10) A đã viết sẵn. C đọc qua để hiểu, sau này phase 4 C làm phần này trong Angular.

---

## 5. Quy trình làm một màn hình

Ví dụ C làm `admin/categories.html`. Màn khác làm tương tự.

**Bước 1. Tạo nhánh mới từ `dev` mới nhất**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/html-admin-categories
```

Tên nhánh: `feature/html-<tên màn>`.

**Bước 2. Tạo file từ khung mẫu**

- Trang admin: copy `html/_templates/admin.html` thành `html/admin/categories.html`.
- Trang public: copy `html/_templates/public.html` (B làm). Trang auth: copy `html/_templates/auth.html`.

Sau đó sửa trong file mới:

- Xóa đoạn comment hướng dẫn ở đầu file.
- Đổi `<title>`.
- Trong sidebar: thêm `is-active` và `aria-current="page"` vào link của trang mình (xem `posts.html` làm thế nào).
- Đổi `data-demo-states` trên thẻ `<body>` thành các trạng thái trang mình có (xem cột "Trạng thái bắt buộc" ở mục 5 của tài liệu).

**Bước 3. Xem Medium để tham khảo**

Mở trang tương ứng trên medium.com, nhấn `F12` để xem cỡ chữ, khoảng cách. **Chỉ tham khảo, không copy code hay ảnh của Medium.** Trang admin thì Medium không có, cứ làm giống `posts.html` cho đồng bộ.

**Bước 4. Dựng HTML với dữ liệu giả**

- Viết trong `<main class="admin-content">`.
- Dùng class có sẵn của Bootstrap trước (`d-flex`, `gap-2`, `mb-3`, `row`, `col-md-6`, `table`, `modal`, `form-control`...). Tra cứu tại [getbootstrap.com/docs/5.3](https://getbootstrap.com/docs/5.3/).
- Dùng lại class đã có trong [html/README.md](../html/README.md) (`.status-badge`, `.page-tabs`, `.empty-state`, `.search-input`, `.icon-btn`...).
- Dữ liệu giả lấy theo [sample-data.md](sample-data.md) (tên người, danh mục, bài viết).
- Icon: tìm tại [icons.getbootstrap.com](https://icons.getbootstrap.com), viết `<i class="bi bi-trash3" aria-hidden="true"></i>`.

**Bước 5. Chỉ viết SCSS khi Bootstrap không có sẵn**

1. Tạo file mới, ví dụ `html/scss/components/_category-table.scss`.
2. Mở `html/scss/main.scss`, thêm một dòng `@import "components/category-table";` vào danh sách components (giữ thứ tự a-z).
3. Màu luôn viết `var(--bl-...)`, **không bao giờ** viết mã như `#333` hay `white`. Viết sai thì chế độ tối sẽ hỏng.
4. Tên class theo BEM: `.category-table`, `.category-table__name`, `.category-table__name--missing`.

**Bước 6. Thêm các trạng thái demo**

Xem mục 6 bên dưới.

**Bước 7. Đánh dấu cho phase 4**

- Bọc mỗi khối lớn bằng comment `<!-- component: ten-khoi -->` ... `<!-- /component: ten-khoi -->`.
- Mọi chữ cố định trên giao diện (nút, tiêu đề, nhãn) gắn `data-i18n="nhom.ten"`. Dữ liệu từ CSDL (tên danh mục, tên bài, tên người) thì không gắn.
- Chữ trong `placeholder`, `aria-label` thì gắn `data-i18n-placeholder`, `data-i18n-aria-label`.

**Bước 8. Tự kiểm tra theo checklist ở mục 7**

**Bước 9. Commit, push, tạo PR**: xem mục 8.

---

## 6. Làm các trạng thái demo

Thanh Demo đọc các thuộc tính `data-demo-*` trong HTML để ẩn/hiện. Hướng dẫn đầy đủ nằm ở comment đầu file `html/js/demo-state.js`. Dưới đây là những trường hợp hay gặp.

### 6.1. Form có lỗi validate và nút loading

```html
<body data-demo-states="normal error loading">
...
<form novalidate>
  <div class="mb-3">
    <label class="form-label" for="email" data-i18n="auth.email">Email</label>
    <input type="email" class="form-control" id="email" value="an@blog.local" data-demo-invalid>
    <div class="invalid-feedback" data-i18n="validation.email_taken">Email đã tồn tại</div>
  </div>

  <button type="submit" class="btn btn-primary w-100" data-demo-loading data-loading-text="Đang đăng ký..." data-loading-i18n="auth.registering">
    <span data-i18n="auth.register">Đăng ký</span>
  </button>
</form>
```

- Bấm "Lỗi validate": ô có `data-demo-invalid` tự viền đỏ và hiện dòng lỗi ngay dưới.
- Bấm "Loading": nút có `data-demo-loading` tự hiện spinner và bị khóa.
- Dòng `invalid-feedback` phải đặt **ngay sau** ô nhập thì mới tự hiện.

### 6.2. Khối chỉ hiện ở một trạng thái

```html
<table class="table" data-demo="normal">...</table>          <!-- chỉ hiện khi Bình thường -->
<div class="empty-state" data-demo="empty">...</div>         <!-- chỉ hiện khi Rỗng -->
<div class="alert alert-danger" data-demo="error">...</div>  <!-- chỉ hiện khi Lỗi -->
```

Tên trạng thái trong `data-demo` phải có trong `data-demo-states` ở thẻ `<body>`.

### 6.3. Khối chỉ hiện với một số vai trò

```html
<body data-demo-auths="guest user blog_owner super_admin">
...
<a href="login.html" data-demo-auth="guest">Đăng nhập</a>
<div data-demo-auth="user blog_owner super_admin">...avatar...</div>
<a href="../admin/post-create.html" data-demo-auth="blog_owner super_admin">Viết bài</a>
```

### 6.4. Hộp xác nhận xóa

Copy khối `<!-- component: confirm-dialog -->` ở cuối `admin/posts.html`, đổi `id` và nội dung. Nút mở hộp cần `data-bs-toggle="modal" data-bs-target="#id-cua-hop"`.

---

## 7. Checklist trước khi tạo PR

Copy danh sách này vào mô tả PR và đánh dấu từng mục.

```markdown
- [ ] Mở trang không lỗi; tất cả link bấm được, đi đúng trang
- [ ] 360px: không có thanh cuộn ngang, chữ không tràn, không bị che
- [ ] Tablet (768px) và desktop (1280px) hiển thị đúng
- [ ] Chế độ tối: không còn chỗ nào nền trắng hay chữ đen
- [ ] Đủ các trạng thái ở mục 5 của tài liệu, chuyển được bằng thanh Demo
- [ ] Không có style="..." trong HTML, không có mã màu (#xxx) trong SCSS
- [ ] Chữ cố định đã gắn data-i18n; khối lớn đã bọc comment component
- [ ] Đã chạy npm run build và commit cả html/css/main.css
- [ ] Đã xem trên Chrome và Firefox (hoặc Edge)
- [ ] Ảnh chụp: 360px sáng, 360px tối, desktop sáng, desktop tối
```

---

## 8. Commit, push và tạo PR

```bash
cd html
npm run build
cd ..
git add html/
git commit -m "feat(html): add admin categories page"
git push -u origin feature/html-admin-categories
```

- Lời nhắn commit viết tiếng Anh, bắt đầu bằng `feat(html):` (thêm mới), `fix(html):` (sửa lỗi) hoặc `style(html):` (chỉnh giao diện).
- Commit nhiều lần trong lúc làm cũng được, không cần đợi xong mới commit.

**Tạo PR trên GitHub:**

1. Mở trang repo trên GitHub, bấm nút **Compare & pull request** vừa hiện ra.
2. Chọn **base: `dev`** (không phải `master`).
3. Dán checklist ở mục 7, đánh dấu từng mục, kéo thả ảnh chụp vào.
4. Chọn người review: PR của C thì chọn A; PR có sửa `abstracts/`, `themes/`, `layouts/` thì chọn B.
5. Người review góp ý thì sửa tiếp trên cùng nhánh, commit, push. PR tự cập nhật, không cần tạo PR mới.

**Trước khi tạo PR, cập nhật code mới nhất từ `dev`:**

```bash
git pull origin dev
```

Nếu báo **conflict** (xung đột):

- Ở file `html/css/main.css`: đừng sửa tay. Chạy lại build rồi commit:

  ```bash
  cd html
  npm run build
  cd ..
  git add html/css/main.css
  git commit
  ```

- Ở file `html/scss/main.scss`: thường do 2 người cùng thêm dòng `@import`. Giữ **cả hai** dòng, xóa các dấu `<<<<<<<`, `=======`, `>>>>>>>`, lưu file, rồi `git add` và `git commit`.
- Conflict ở file khác: nhắn nhóm, đừng tự đoán.

---

## 9. Lỗi hay gặp

| Hiện tượng | Cách sửa |
| --- | --- |
| Sửa SCSS nhưng giao diện không đổi | Kiểm tra terminal `npm run watch` còn chạy và không báo lỗi; file mới đã thêm `@import` vào `main.scss` chưa; thử `Ctrl + F5` |
| Terminal `npm run watch` báo lỗi đỏ | Đọc dòng có tên file và số dòng, thường là thiếu `;` hoặc `}` |
| Chế độ tối có chỗ vẫn trắng hoặc chữ đen | Đang dùng mã màu hoặc class như `bg-white`, `text-dark`. Đổi sang `var(--bl-...)` |
| Dropdown, modal, menu mobile bấm không mở | Thiếu dòng `<script src=".../bootstrap.bundle.min.js">` cuối `<body>`, hoặc sai `data-bs-target` |
| Icon không hiện | Sai tên icon, hoặc máy không có mạng |
| Khối không ẩn/hiện theo thanh Demo | Tên trong `data-demo` không có trong `data-demo-states` ở `<body>`, hoặc gõ sai tên |
| Ảnh, CSS không tải (trang trắng trơn) | Sai đường dẫn tương đối. File trong `admin/` và `public/` phải dùng `../css/...`, `../assets/...` |
| `npm` báo "command not found" | Chưa cài NodeJS, hoặc cần mở lại VS Code sau khi cài |

---

## 10. Những điều không làm

- Không sửa file của người khác mà không báo. Cần sửa header, sidebar hay component dùng chung thì nhắn người phụ trách trước.
- Không sửa gì trong `node_modules/`.
- Không dùng `style="..."`, không viết mã màu, không dùng `!important`.
- Không copy code, ảnh hay logo từ Medium.
- Không commit thẳng vào `dev` hay `master`, luôn qua PR.

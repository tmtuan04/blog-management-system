# Danh sách màn hình phase 2

Tổng cộng **20 màn**: A 6 màn (đã xong 1), B 14 màn. Nguồn: [docs/phase-2-html.md](../docs/phase-2-html.md) mục 5 và 8.

Quy ước: mỗi việc (A1, B1...) là **một nhánh và một PR** vào `dev`. Việc có nhiều màn thì các màn đó nằm chung một nhánh. Tên nhánh theo dạng `feature/html-<phần>`.

Cột "Chờ": việc của người kia phải merge vào `dev` rồi mới bắt đầu.

---

## A: 6 màn

| Việc | Màn | File | Mô tả ngắn | Nhánh | Chờ |
|---|---|---|---|---|---|
| (xong) | **Quản lý bài viết** ✅ | `admin/posts.html` | Danh sách bài viết trong admin: tab trạng thái, lọc, tìm kiếm, bảng bài viết | `feature/html-admin-posts` | |
| A1 | *(không phải màn)* Khung public, khung auth | `_templates/public.html`, `_templates/auth.html`, `layouts/_public.scss`, `layouts/_auth.scss` | Header (4 biến thể theo vai trò), footer, khung trang đăng nhập. **Merge sớm** | `feature/html-layout-public-auth` | |
| A2 | **Trang chủ** | `public/index.html` | Chip danh mục, danh sách thẻ bài viết, phân trang, sidebar "Đọc nhiều nhất". Kèm thẻ bài viết, toast. **Merge sớm** | `feature/html-home` | |
| A3 | **Viết bài mới** | `admin/post-create.html` | Form tạo bài: ngôn ngữ gốc, danh mục, ảnh bìa, tiêu đề, tóm tắt, trình soạn thảo. Kèm rich text editor. **Merge sớm** | `feature/html-post-create` | |
| A4 | **Chi tiết bài viết** | `public/post-detail.html` | Nội dung bài đầy đủ, thông tin tác giả, bình luận, bài cùng danh mục | `feature/html-post-detail-category` | |
| A4 | **Bài viết theo danh mục** | `public/category.html` | Tiêu đề danh mục, số bài và danh sách bài thuộc danh mục đó | *(chung nhánh trên)* | |
| A5 | **Sửa bài viết** | `admin/post-edit.html` | Sửa bài, mỗi ngôn ngữ một tab, thêm hoặc xóa bản dịch | `feature/html-post-edit` | |
| A6 | *(không phải màn)* Mục lục, kiểm tra cuối | `html/index.html` | Trang mục lục link tới mọi màn; kiểm tra toàn bộ theo mục 9, sửa lỗi (làm cùng B) | `feature/html-index-review` | B5 |

## B: 14 màn

### Quản trị (6 màn)

| Việc | Màn | File | Mô tả ngắn | Nhánh | Chờ |
|---|---|---|---|---|---|
| B1 | **Quản lý danh mục** | `admin/categories.html` | Bảng danh mục, tên theo từng ngôn ngữ, modal thêm/sửa | `feature/html-admin-categories-pages` | |
| B1 | **Quản lý trang tĩnh** | `admin/pages.html` | Danh sách trang Giới thiệu, Liên hệ, Chính sách bảo mật | *(chung nhánh trên)* | |
| B2 | **Quản lý người dùng** | `admin/users.html` | Bảng người dùng, đổi vai trò, khóa/mở khóa, tạo tài khoản | `feature/html-admin-users-languages` | |
| B2 | **Quản lý ngôn ngữ** | `admin/languages.html` | Bảng ngôn ngữ, đặt ngôn ngữ mặc định, bật/tắt, thêm/sửa | *(chung nhánh trên)* | |
| B5 | **Quản lý bản dịch giao diện** | `admin/ui-translations.html` | Bảng key và bản dịch theo từng ngôn ngữ, sửa ngay trong ô | `feature/html-admin-translations-page-edit` | A3 |
| B5 | **Sửa trang tĩnh** | `admin/page-edit.html` | Sửa nội dung trang tĩnh, mỗi ngôn ngữ một tab, có trình soạn thảo | *(chung nhánh trên)* | A3 |

### Tài khoản (5 màn)

| Việc | Màn | File | Mô tả ngắn | Nhánh | Chờ |
|---|---|---|---|---|---|
| B3 | **Đăng ký** | `public/register.html` | Họ tên, email, mật khẩu, nút đăng ký bằng Google/Github | `feature/html-auth-profile` | A1 |
| B3 | **Đăng nhập** | `public/login.html` | Email, mật khẩu, quên mật khẩu, đăng nhập bằng Google/Github | *(chung nhánh trên)* | A1 |
| B3 | **Quên mật khẩu** | `public/forgot-password.html` | Nhập email để nhận link đặt lại mật khẩu | *(chung nhánh trên)* | A1 |
| B3 | **Đặt lại mật khẩu** | `public/reset-password.html` | Nhập mật khẩu mới và xác nhận | *(chung nhánh trên)* | A1 |
| B3 | **Hồ sơ cá nhân** | `public/profile.html` | Đổi ảnh đại diện, họ tên, đổi mật khẩu | *(chung nhánh trên)* | A1 |

### Public (3 màn)

| Việc | Màn | File | Mô tả ngắn | Nhánh | Chờ |
|---|---|---|---|---|---|
| B4 | **Kết quả tìm kiếm** | `public/search.html` | "Kết quả cho *từ khóa*", danh sách bài, phân trang | `feature/html-search-404-page` | A1, A2 |
| B4 | **Không tìm thấy trang (404)** | `public/404.html` | Số 404 lớn, thông báo, nút về trang chủ | *(chung nhánh trên)* | A1, A2 |
| B4 | **Trang tĩnh** | `public/page.html` | Hiển thị trang Giới thiệu, Liên hệ, Chính sách bảo mật | *(chung nhánh trên)* | A1, A2 |

---

## Tóm tắt nhánh

| Việc | Nhánh | Số màn |
|---|---|---|
| A1 | `feature/html-layout-public-auth` | 0 (khung) |
| A2 | `feature/html-home` | 1 |
| A3 | `feature/html-post-create` | 1 |
| A4 | `feature/html-post-detail-category` | 2 |
| A5 | `feature/html-post-edit` | 1 |
| A6 | `feature/html-index-review` | 0 (mục lục) |
| B1 | `feature/html-admin-categories-pages` | 2 |
| B2 | `feature/html-admin-users-languages` | 2 |
| B3 | `feature/html-auth-profile` | 5 |
| B4 | `feature/html-search-404-page` | 3 |
| B5 | `feature/html-admin-translations-page-edit` | 2 |

Tạo nhánh luôn từ `dev` mới nhất:

```bash
git checkout dev
git pull origin dev
git checkout -b <tên-nhánh>
```

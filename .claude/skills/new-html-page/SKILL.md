---
name: new-html-page
description: Dựng một màn HTML mới trong html/ từ template có sẵn (admin, public, auth), kèm component SCSS, data-i18n, trạng thái demo, rồi cập nhật mục lục và seed UI translation. Dùng khi được giao làm một trang hoặc một màn giao diện mới của phase 2.
---

# Làm một màn HTML mới

Đầu vào: tên màn và loại (quản trị, public, tài khoản). Thiếu thì hỏi.

## 1. Đọc yêu cầu

1. `docs/phase-2-html.md` mục 5: dòng của màn này (file, nội dung, các trạng thái phải có).
2. `docs/requirements.md`: use case tương ứng, để biết ô nhập, ràng buộc và câu báo lỗi.
3. Bảng "Có sẵn để dùng" trong `html/README.md`: ghi lại những class và component dùng lại được.
4. Một màn mẫu cùng loại: `html/admin/posts.html` (bảng, lọc, modal), `html/admin/post-create.html` (form, editor), `html/public/index.html` (danh sách thẻ bài).

## 2. Tạo file từ template

| Loại | Copy từ | Vào | Viết nội dung trong |
| --- | --- | --- | --- |
| Quản trị | `html/_templates/admin.html` | `html/admin/` | `<main class="admin-content">` |
| Public | `html/_templates/public.html` | `html/public/` | `<main class="site-body__main">` |
| Tài khoản | `html/_templates/auth.html` | `html/public/` | `.auth-card` |

Đổi `<title>`, chuyển `.is-active` + `aria-current="page"` sang mục menu của trang. Trang public không cần sidebar thì xóa `<aside>`.

## 3. Viết nội dung

Áp dụng `.claude/rules/html.md`. Thứ tự làm:

1. Dựng khung bằng class Bootstrap và component có sẵn, bọc từng khối bằng comment `<!-- component: ... -->`.
2. Dữ liệu giả lấy theo `docs/sample-data.md`, có cả dữ liệu "khó": tiêu đề dài, chuỗi không dấu rất dài, mục không có ảnh.
3. Gắn `data-i18n` cho mọi chữ tĩnh. Tìm key đã có trước khi đặt key mới (Grep trong `backend/database/seed-data/ui-translations.json`).
4. Khai báo trạng thái demo trên `<body>` (`data-demo-states`, `data-demo-auths`) và đánh dấu khối theo trạng thái. Mọi trạng thái ghi trong docs mục 5 đều phải xem được qua thanh demo.
5. Component mới: một file `html/scss/components/_ten.scss`, đăng ký trong `html/scss/main.scss`.

## 4. Đồng bộ

```bash
cd html
npm run build
npm run check-links
cd ../backend
npm run i18n:extract
npm run i18n:check
```

`i18n:extract` thêm key mới vào `backend/database/seed-data/ui-translations.json`; dịch các key thiếu `en` rồi chạy lại `i18n:check`.

Sau đó cập nhật:

- `html/index.html`: đổi dòng của màn thành link.
- `html/SCREENS.md`: đánh dấu màn đã xong, sửa số đếm ở đầu file.
- `html/README.md`: thêm dòng vào bảng "Có sẵn để dùng" nếu có component hoặc class dùng chung mới.
- `CHANGELOG.md` mục `[Unreleased]`.

## 5. Kiểm tra bằng mắt

Không tự xác nhận giao diện đúng nếu chưa nhìn thấy trang. Mở trang trong trình duyệt nếu có công cụ; nếu không thì nói rõ là chưa kiểm tra và đưa danh sách cho người dùng tự xem: 360px và desktop, sáng và tối, từng trạng thái demo, từng vai trò.

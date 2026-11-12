---
paths:
  - "html/**"
---

# Giao diện HTML (phase 2)

Nguồn chuẩn: `docs/phase-2-html.md` mục 7. Trước khi viết class mới, tra bảng "Có sẵn để dùng" trong `html/README.md`.

## HTML

- Mỗi khối sẽ thành component Angular được bọc bằng `<!-- component: ten -->` ... `<!-- /component: ten -->`.
- Mọi chữ tĩnh gắn `data-i18n="<nhóm>.<tên>"`; chữ trong thuộc tính dùng `data-i18n-<thuộc tính>`. Dữ liệu lấy từ CSDL (tiêu đề bài, tên danh mục, tên người dùng) thì không gắn.
- Thêm, sửa, bỏ key `data-i18n`: vào `backend/` chạy `npm run i18n:extract`, dịch key thiếu `en` trong `backend/database/seed-data/ui-translations.json`, rồi `npm run i18n:check`.
- Link và đường dẫn tài nguyên luôn tương đối, đúng hoa/thường như tên file, không bắt đầu bằng `/` (site nằm dưới `/blog-management-system/` trên GitHub Pages).
- Ảnh có `alt`, ô nhập có `<label>`, nút chỉ có icon có `aria-label`.
- Header, footer, offcanvas chép giống nhau ở mọi trang: sửa ở `_templates/` thì sửa cả các file trong `public/` hoặc `admin/` trong cùng thay đổi.

## Trạng thái demo

- Một file cho mọi trạng thái, điều khiển bằng `js/demo-state.js`: `data-demo-states`, `data-demo-auths` trên `<body>`; `data-demo`, `data-demo-auth`, `data-demo-modal` trên khối. Cách đánh dấu đầy đủ ở comment đầu file đó.
- Lỗi validate dùng `is-invalid` + `invalid-feedback` của Bootstrap. Câu trong `invalid-feedback` là câu backend dùng lại trong DTO, sửa thì kiểm tra DTO tương ứng.

## SCSS

- Ưu tiên class tiện ích của Bootstrap, chỉ viết SCSS khi Bootstrap không có.
- Class tự viết theo BEM, không tiền tố: `.post-card`, `.post-card__title`, `.post-card--compact`. Mỗi component một file `scss/components/_ten.scss`.
- Màu luôn là `var(--bl-...)`, không viết mã hex trong component (điều kiện để dark mode đúng).
- Không `style="..."` inline, không `!important` (trừ khi buộc phải ghi đè Bootstrap, kèm comment giải thích).
- Mobile-first: mở rộng bằng `@include media-breakpoint-up(md)`.
- Ghi đè biến Bootstrap trong `scss/abstracts/_variables.scss`. Sửa `abstracts/`, `themes/`, `layouts/` hoặc component dùng chung thì kiểm tra lại các trang đang dùng.

## Trước khi xong

- `npm run build` và commit cả `css/main.css`.
- `npm run check-links` không báo lỗi mới.
- Thêm component hoặc class dùng chung thì bổ sung một dòng vào bảng "Có sẵn để dùng" của `html/README.md`.

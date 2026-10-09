# Giao diện HTML (phase 2)

Quy định đầy đủ xem [docs/phase-2-html.md](../docs/phase-2-html.md). File này chỉ ghi cách chạy và đoạn code phải chép vào mỗi trang.

## Chạy

```bash
cd html
npm install
npm run watch   # build lại css/main.css mỗi khi sửa SCSS
```

Mở file HTML bằng Live Server của VS Code. Trước khi commit chạy `npm run build` và commit cả `css/main.css`.

## Bắt đầu một trang mới

- Trang quản trị: copy [_templates/admin.html](_templates/admin.html) vào `admin/`, đổi `<title>`, chuyển `.is-active` + `aria-current="page"` sang mục sidebar của trang, viết nội dung trong `<main class="admin-content">`.
- Xem [admin/posts.html](admin/posts.html) làm mẫu: chia component bằng comment, `data-i18n`, trạng thái demo (bình thường, loading, rỗng, đang xóa), vai trò Blog Owner / Super Admin, bảng chuyển thành thẻ trên mobile.
- Khung public và auth chưa có (việc A1 ở mục 8 của tài liệu). Trong lúc chưa có, phần `<head>` dùng đoạn dưới đây.
- Tên blog "Inkwell" là tên tạm, gắn `data-i18n="common.site_name"`. Chốt tên thì thay ở mọi file.

## Khung `<head>` và cuối `<body>`

Đường dẫn dưới đây tính cho file nằm trong `public/` hoặc `admin/`.

```html
<!doctype html>
<html lang="vi" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tên trang · Tên blog</title>

  <!-- Gán theme trước khi tải CSS để không bị nháy màu. Không thêm defer/async. -->
  <script src="../js/theme.js"></script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="../css/main.css">
</head>
<body data-demo-states="normal error loading empty">

  ...

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../js/demo-state.js"></script>
</body>
</html>
```

- Google Fonts tự tải bộ ký tự tiếng Việt khi trang có chữ có dấu, không cần thêm tham số `subset`.
- Phiên bản Bootstrap JS trên CDN phải trùng với bản `bootstrap` trong `package.json`.

## Có sẵn để dùng

| Thứ | Cách dùng |
| --- | --- |
| Màu | `var(--bl-text)`, `var(--bl-text-secondary)`, `var(--bl-border)`... xem [scss/themes/_light.scss](scss/themes/_light.scss) |
| Kích thước layout | `$header-height`, `$feed-max-width`, `$reading-max-width`, `$admin-sidebar-width`... xem [scss/abstracts/_variables.scss](scss/abstracts/_variables.scss) |
| Kiểu chữ | `.text-post-title`, `.text-page-title`, `.text-card-title`, `.text-excerpt`, `.text-meta`, `.prose` (nội dung rich text) |
| Cắt chữ | `@include line-clamp(2);` |
| Nút | `.btn-primary` (pill đen, chế độ tối thì pill sáng), `.btn-outline-secondary` (pill viền xám), `.btn-danger` |
| Nút chỉ có icon | `.icon-btn` (☰, ⋯, đổi theme), `.icon-btn.icon-btn--text` (chữ ngắn như "VI"). Luôn có `aria-label` |
| Logo chữ | `.brand` |
| Ảnh đại diện | `.avatar`, `.avatar--sm`, `.avatar--lg`; chưa có ảnh thì `.avatar.avatar--initials` |
| Badge trạng thái | `.status-badge` + `--success` / `--warning` / `--muted` / `--danger`, mã ngôn ngữ trong `.status-badge__code` |
| Tab lọc kiểu Medium | `.page-tabs`, `.page-tabs__link.is-active`, `.page-tabs__count` |
| Ô tìm kiếm có icon | `.search-input`, `.search-input__icon`, `.search-input__control` |
| Bảng | `.table` của Bootstrap đã chỉnh sẵn màu, kẻ ngang nhạt |
| Phân trang | `.pagination-bar` bọc dòng "Hiển thị..." và `.pagination` của Bootstrap |
| Trạng thái rỗng | `.empty-state`, `__icon`, `__title`, `__text` |
| Dropdown, modal | Dùng thẳng của Bootstrap, màu đã theo theme |
| Layout admin | `.admin-layout`, `.admin-sidebar`, `.admin-topbar`, `.admin-content`, `.admin-page-header` |
| Nút đổi theme | Xem comment đầu [js/theme.js](js/theme.js) |
| Trạng thái demo | Xem comment đầu [js/demo-state.js](js/demo-state.js). Mở trang với `?demo=empty&auth=super_admin` để vào thẳng một trạng thái |

Sửa component dùng chung (phân trang, trạng thái rỗng, hộp xác nhận...) thì báo người kia và kiểm tra lại các trang đang dùng nó.

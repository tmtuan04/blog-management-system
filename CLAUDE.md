# Blog Management System

Blog đa ngôn ngữ (vi / en): trang đọc cho người dùng, trang quản trị cho Blog Owner và Super Admin. Dự án chia 5 phase: CSDL, giao diện HTML, backend, frontend Angular, deploy. **Đang ở phase 3 (backend)**; phase 2 (HTML) đã xong nhưng vẫn còn sửa theo góp ý của mentor.

## Thư mục

| Thư mục | Nội dung |
| --- | --- |
| `backend/` | NestJS 11 + Sequelize (MySQL 8) + Redis |
| `html/` | Giao diện HTML tĩnh, Bootstrap 5.3 + SCSS, deploy GitHub Pages |
| `docs/` | Đặc tả, thiết kế DB, quy ước từng phase, Postman collection |
| `docker-compose.yml` | MySQL, Redis, Adminer, RedisInsight cho dev và test |

## Lệnh

Chạy trong `backend/`:

- `npm run lint`: ESLint + Prettier, tự sửa.
- `npm run test`, `npm run test -- <tên>`: unit test.
- `npm run test:e2e`, `npm run test:e2e -- <tên>`: e2e, cần `docker compose up -d` (MySQL + Redis thật).
- `npm run test:cov`: báo lỗi nếu tầng service dưới 70%.
- `npm run i18n:extract`, `npm run i18n:check`: đồng bộ key `data-i18n` của `html/` với seed UI translation.

Không gọi `npx jest` trực tiếp: Jest cần `--experimental-vm-modules`, chỉ các script `npm run test*` có sẵn cờ này.

Chạy trong `html/`: `npm run build` (SCSS thành `css/main.css`, file này được commit), `npm run check-links`.

## Tài liệu là nguồn chuẩn

Quy ước nằm trong docs, không chép lại ở đây. Đọc đúng mục cần, đừng đọc cả file (mỗi file 20-50 KB).

| Cần biết | Đọc |
| --- | --- |
| Use case, ràng buộc nghiệp vụ | `docs/requirements.md` |
| Bảng route, format response, Redis key, quy ước backend | `docs/phase-3-backend.md` (mục 3, 4, 7) |
| Quy trình làm một module, checklist PR, lỗi hay gặp | `docs/phase-3-huong-dan.md` (mục 5, 6, 9) |
| Quy ước HTML / SCSS, trạng thái demo | `docs/phase-2-html.md` (mục 7) |
| Class và component có sẵn của giao diện | `html/README.md` (bảng "Có sẵn để dùng") |
| Thiết kế bảng | `docs/database.dbml` |

Code và docs lệch nhau thì báo lại, đừng tự chọn một bên.

## Quy tắc chung

- Viết tài liệu, message lỗi, changelog bằng tiếng Việt. Tên biến, commit message bằng tiếng Anh.
- Mọi thay đổi đều thêm dòng vào `CHANGELOG.md` mục `[Unreleased]` (xem `.claude/rules/git-workflow.md`).
- Không đọc, không sửa `backend/.env`. Cần tên biến thì xem `backend/.env.example`.

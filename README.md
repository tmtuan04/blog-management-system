# Blog Management System

Hệ thống blog đa ngôn ngữ (vi / en): trang đọc blog cho người dùng và trang quản trị cho Blog Owner, Super Admin. Dự án chia 5 phase: cơ sở dữ liệu, giao diện HTML, backend, frontend, deploy lên máy ảo Linux.

## Link

- Giao diện HTML đã deploy: <https://tmtuan04.github.io/blog-management-system/>
- Repo: <https://github.com/tmtuan04/blog-management-system>

Khi chạy local (xem [backend/README.md](backend/README.md)):

| Dịch vụ | Địa chỉ |
| --- | --- |
| API | <http://localhost:3000/api/v1> |
| Swagger | <http://localhost:3000/api-docs> |
| Adminer (xem MySQL) | <http://localhost:8080> (server `mysql`, user / pass `blog` / `blog`) |
| RedisInsight (xem Redis) | <http://localhost:5540> (host `redis`, port `6379`) |

## Chạy nhanh

```bash
# MySQL, Redis, Adminer, RedisInsight
docker compose up -d

# Backend
cd backend
npm install
cp .env.example .env   # điền JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MAIL_*
npm run db:migrate
npm run db:seed
npm run start:dev
```

Giao diện HTML: `cd html && npm install && npm run watch`, rồi mở file HTML bằng Live Server.

Tài khoản mẫu sau khi seed: `admin@blog.local` (Super Admin), `owner1@blog.local` (Blog Owner), mật khẩu chung `Password123`. Danh sách đủ ở [backend/README.md](backend/README.md).

## Cấu trúc

```text
.github/workflows/   # Deploy html/ lên GitHub Pages
backend/             # NestJS API
docker/              # Script khởi tạo MySQL (tạo blog_dev, blog_test)
docs/                # Đặc tả, thiết kế DB, hướng dẫn từng phase, Postman
html/                # Giao diện HTML tĩnh
docker-compose.yml   # MySQL, Redis, Adminer, RedisInsight cho dev và test
```

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [docs/requirements.md](docs/requirements.md) | Đặc tả yêu cầu, use case, kế hoạch theo phase |
| [docs/database.dbml](docs/database.dbml) | Thiết kế cơ sở dữ liệu (mở bằng [dbdiagram.io](https://dbdiagram.io)) |
| [docs/sample-data.md](docs/sample-data.md) | Dữ liệu mẫu dạng bảng |
| [docs/phase-2-html.md](docs/phase-2-html.md) | Quy định phase 2: danh sách màn, quy ước HTML / SCSS |
| [docs/phase-2-huong-dan.md](docs/phase-2-huong-dan.md) | Hướng dẫn từng bước làm phase 2 |
| [docs/phase-3-backend.md](docs/phase-3-backend.md) | Kế hoạch và quy ước phase 3, trạng thái từng việc |
| [docs/phase-3-huong-dan.md](docs/phase-3-huong-dan.md) | Hướng dẫn từng bước làm phase 3 (Docker, migrate, viết module, PR) |
| [html/README.md](html/README.md) | Cách chạy, deploy giao diện HTML và bắt đầu một trang mới |
| [backend/README.md](backend/README.md) | Cách chạy backend, các lệnh, tài khoản mẫu, viết module mới |
| [docs/postman/](docs/postman/) | Postman collection và environment local |
| [CHANGELOG.md](CHANGELOG.md) | Các thay đổi của dự án |

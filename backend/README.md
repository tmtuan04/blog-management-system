# Backend - Blog Management System

NestJS 11 + Sequelize (MySQL 8) + Redis. Kế hoạch và quy ước: [docs/phase-3-backend.md](../docs/phase-3-backend.md).

## Chạy lần đầu

```bash
# 1. MySQL + Redis (ở gốc repo)
docker compose up -d

# 2. Cài thư viện và tạo .env
cd backend
npm install
cp .env.example .env   # điền JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MAIL_*

# 3. Tạo bảng và dữ liệu mẫu
npm run db:migrate
npm run db:seed        # có từ việc B1

# 4. Chạy
npm run start:dev
```

- API: <http://localhost:3000/api/v1>
- Swagger: <http://localhost:3000/api-docs> (bấm Authorize, dán access token)
- Ảnh upload: <http://localhost:3000/uploads/...>

Máy đã cài sẵn MySQL hoặc Redis chiếm cổng 3306/6379: tạo file `.env` ở **gốc repo** với `MYSQL_HOST_PORT=3307` và `REDIS_HOST_PORT=6380` rồi chạy lại `docker compose up -d`, sau đó đổi `DB_PORT`, `REDIS_PORT` trong `backend/.env` cho khớp.

Tài khoản mẫu (sau khi seed): mật khẩu chung `Password123`.

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run start:dev` | Chạy dev, tự reload |
| `npm run lint` | ESLint + Prettier (tự sửa) |
| `npm run test` | Unit test (`src/**/*.spec.ts`) |
| `npm run test:cov` | Unit test + độ phủ, báo lỗi nếu tầng service dưới 70% |
| `npm run test:e2e` | Integration test trên `blog_test` + Redis db 1 (tự chạy migrations) |
| `npm run db:migrate` | Chạy migrations |
| `npm run db:migrate:undo:all` | Rollback mọi migration |
| `npm run db:seed` / `db:seed:undo` | Nạp / xóa dữ liệu mẫu |
| `npm run db:test:migrate` | Chạy migrations trên database test |

Postman (cần dữ liệu vừa seed và app đang chạy):

```bash
postman collection run docs/postman/blog-api.postman_collection.json -e docs/postman/local.postman_environment.json
```

## Cấu trúc

```text
database/            # sequelize-cli: config.js, migrations/, seeders/
src/
  config/            # Đọc + validate biến môi trường (Joi)
  common/            # decorators, guards, filters, interceptors, pipes, middleware, dto, utils
  infra/             # database, redis (CacheService), upload, mail
  modules/<module>/  # module, controller, service, dto/, models/, *.spec.ts
test/
  helpers/           # createTestApp, resetDatabase, tokenFor(role)
  *.e2e-spec.ts
```

## Viết một module mới

Copy cách làm của module mẫu `src/modules/languages/`.

- **Controller** chỉ nhận request, gọi service, đặt `@ResponseMessage('...')`. Không truy vấn DB.
- **Quyền**: mặc định mọi route cần đăng nhập. Route public thêm `@Public()`; public nhưng cần biết ai đang xem thì `@Public({ optionalAuth: true })`. Giới hạn role: `@Roles('blog_owner')` (Super Admin tự qua).
- **Người dùng / ngôn ngữ**: `@CurrentUser() user: AuthUser`, `@CurrentLanguage() lang: RequestLanguage`.
- **Phân trang**: query DTO kế thừa `PaginationQueryDto`; service trả `paginate(items, total, query)`, interceptor tự tách `data` và `meta`.
- **Lỗi**: ném `AppException` với mã trong `common/errors.ts`, ví dụ `new AppException(409, ErrorCode.CATEGORY_IN_USE, 'Danh mục đang có bài viết')`. Lỗi validate field: `AppException.validation([{ field, message }])`.
- **Cache**: key và TTL ở `common/utils/redis-keys.ts`; đọc bằng `cache.wrap(key, ttl, load)`, xóa bằng `cache.invalidate(CachePrefix.posts)`.
- **Swagger**: `@ApiTags`, `@ApiOperation({ summary: 'UCxx - ...' })`, `@ApiDataResponse(Dto)` / `@ApiPaginatedResponse(Dto)`, `@ApiErrorResponses(400, 401, 403)`. Field của DTO tự sinh từ plugin CLI (file `*.dto.ts`), comment `/** */` thành mô tả.
- **HTML / slug / upload**: `sanitizeRichText`, `hasRichTextContent`, `containsHtml` (`common/utils/html-sanitize.ts`); `generateUniqueSlug` (`common/utils/slug.ts`); `UploadService` (`infra/upload`).

## Test

- Unit test mock model (`getModelToken(Model)`), `CacheService`, `RedisService`, `MailService`.
- E2E: `createTestApp()` dựng app giống `main.ts` với `MailService` mock; `resetDatabase(app)` xóa dữ liệu và nạp 3 role + 2 ngôn ngữ; `tokenFor(app, 'super_admin')` tạo user và access token.

```ts
const { token } = await tokenFor(ctx.app, 'blog_owner');
await request(ctx.app.getHttpServer())
  .get('/api/v1/admin/posts')
  .set(bearer(token))
  .expect(200);
```

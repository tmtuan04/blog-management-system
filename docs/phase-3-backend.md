# Phase 3 - Xây dựng backend (NestJS)

| Mục | Nội dung |
| --- | --- |
| Phiên bản | 1.1 (theo requirements 2.1) |
| Ngày tạo | 23/10/2026, cập nhật 27/10/2026 (chia lại việc, mục 8) |
| Thời gian | ~2,5 tuần (13 ngày làm việc, 26/10 - 11/11/2026) |
| Phân công | A ~50%, B ~35%, C ~15% (mục 8) |
| Đầu vào | [requirements.md](requirements.md) (mục 1.5 - Phase 3, mục 3 - 7), [database.dbml](database.dbml), [sample-data.md](sample-data.md), các màn HTML của phase 2 (danh sách field, trạng thái lỗi, key `data-i18n`) |
| Đầu ra | Thư mục `backend/`: API dưới `/api/v1`, Swagger tại `/api-docs`, test Jest + Supertest; Postman collection trong `docs/postman/` |

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

- Có đủ API cho mọi use case Must (mục 3 của requirements), làm thêm Should (UC12, UC19, UC20) nếu còn thời gian. UC10 chỉ có ở frontend.
- Mọi API theo đúng chuẩn ở requirements mục 6.4: prefix `/api/v1`, format response chung, mã HTTP đúng.
- Validate, phân quyền, lọc XSS, rate limit, cache Redis theo requirements mục 6.1 và 6.2.
- Test chạy qua hết, độ phủ tầng service tối thiểu 70%.
- Phase 4 nối Angular vào API mà không phải sửa backend: mỗi màn HTML của phase 2 có đủ API cho mọi trạng thái của màn đó.

### 1.2. Bắt đầu sớm khi phase 2 chưa đóng

Phase 2 còn B5 (`ui-translations`, `page-edit`), C3 (kiểm tra tổng) và A6 (sửa lỗi phần dùng chung). Để không mất thêm thời gian:

- A bắt đầu A1 (khung backend) từ 26/10. A6 của phase 2 làm xen vào khi C3 báo lỗi.
- B và C làm nốt B5 và C3 trong lúc chờ A1 merge. Đằng nào B và C cũng phải chờ A1 mới viết được API. (Cập nhật 27/10: A1 và B5 đã xong ngày 26/10, B bắt đầu B1 từ 27/10.)
- Phase 2 vẫn phải đạt hết điều kiện hoàn thành của nó. Phase 3 chỉ được tính là xong sau khi phase 2 đã xong.

### 1.3. Migrations và seeders của phase 1

Repo hiện chưa có source backend, nên migrations và seeders của phase 1 chưa có ở dạng code. Phase 3 viết chúng trong `backend/` và lấy [database.dbml](database.dbml) làm chuẩn:

- A viết migrations trong A1, kể cả FULLTEXT index `ngram`.
- B viết seeders trong B1.
- C chạy thử migrate, seed và rollback trên database trống trong C1, đúng như điều kiện hoàn thành của phase 1.

Nếu migrations đã có ở chỗ khác thì chuyển vào `backend/database/` và đối chiếu lại với ERD.

---

## 2. Công cụ và cấu trúc thư mục

### 2.1. Công cụ

| Thành phần | Lựa chọn |
| --- | --- |
| Framework | NestJS 11, TypeScript strict, NodeJS LTS |
| ORM | Sequelize qua `@nestjs/sequelize` + `sequelize-typescript`. Migrations và seeders chạy bằng `sequelize-cli` (file `.js` trong `database/`) |
| Database | MySQL 8, `utf8mb4` / `utf8mb4_unicode_ci`. Database `blog_dev`, `blog_test` (requirements 6.5) |
| Redis | `ioredis`. Dev dùng db 0, test dùng db 1 |
| Môi trường dev | `docker-compose.yml` ở gốc repo: `mysql:8.4` (cổng 3306), `redis:7` (cổng 6379) |
| Validate | `class-validator`, `class-transformer`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) |
| Xác thực | `@nestjs/jwt`, `@nestjs/passport` (`passport-jwt`, `passport-google-oauth20`, `passport-github2`), `bcrypt` (cost 10) |
| Bảo mật | `helmet`, CORS theo `FRONTEND_URL`, `@nestjs/throttler` lưu bộ đếm trong Redis |
| Lọc HTML | `sanitize-html` với danh sách thẻ khớp với toolbar editor (mục 3.7) |
| Upload | `multer` (có sẵn trong `@nestjs/platform-express`), kiểm tra MIME bằng `file-type` (đọc magic bytes) |
| Email | `nodemailer`. Dev dùng Mailtrap hoặc Ethereal (requirements mục 9) |
| Slug | `slugify` cùng bảng chuyển `đ → d`, bỏ dấu tiếng Việt |
| Tài liệu API | `@nestjs/swagger`, mở tại `/api-docs` |
| Test | Jest, Supertest. `npm run test` (unit), `npm run test:e2e` (integration), `npm run test:cov` |
| Kiểm thử thủ công | Postman. Chạy cả collection bằng Postman CLI: `postman collection run` |
| Code style | ESLint + Prettier (cấu hình mặc định của Nest CLI) |

### 2.2. Cấu trúc thư mục

```text
docker-compose.yml               # MySQL + Redis cho dev và test
backend/
├── .env.example                 # Danh sách biến môi trường, không có giá trị thật
├── .sequelizerc                 # Trỏ sequelize-cli tới database/
├── package.json
├── database/
│   ├── config.js                # 3 môi trường development, test, production, đọc từ .env
│   ├── migrations/              # Mỗi bảng một file, theo thứ tự khóa ngoại trong ERD
│   └── seeders/                 # Theo requirements 6.6 + sample-data.md
├── src/
│   ├── main.ts                  # helmet, CORS, prefix /api/v1, ValidationPipe, Swagger
│   ├── app.module.ts
│   ├── config/                  # Đọc và validate biến môi trường (@nestjs/config + Joi)
│   ├── common/
│   │   ├── decorators/          # @Public, @Roles, @CurrentUser, @CurrentLanguage, @ResponseMessage
│   │   ├── guards/              # JwtAuthGuard (global), RolesGuard
│   │   ├── interceptors/        # TransformInterceptor: bọc response theo format 6.4
│   │   ├── filters/             # AllExceptionsFilter: bọc lỗi theo format 6.4
│   │   ├── middleware/          # LanguageMiddleware: đọc Accept-Language
│   │   ├── dto/                 # PaginationQueryDto
│   │   └── utils/               # slug, paginate, html-sanitize, redis-keys
│   ├── infra/
│   │   ├── redis/               # RedisModule + CacheService (get/set/invalidate theo prefix)
│   │   ├── upload/              # UploadModule: lưu ảnh vào uploads/, kiểm tra đuôi + MIME + 2MB
│   │   └── mail/                # MailModule
│   └── modules/
│       ├── auth/                # UC01-UC04, UC20
│       ├── users/               # UC14 + model User, Role, OauthAccount
│       ├── profile/             # UC12
│       ├── languages/           # UC16
│       ├── ui-translations/     # UC17
│       ├── categories/          # UC15 (admin), UC07 (public)
│       ├── posts/               # UC13 (admin), UC05, UC06, UC07, UC19 (public)
│       ├── comments/            # UC08
│       └── pages/               # UC11, UC18
├── test/
│   ├── helpers/                 # Tạo app test, reset DB, tạo token cho từng role
│   └── *.e2e-spec.ts            # Mỗi module một file
└── uploads/                     # Ảnh upload (gitignore, chỉ giữ .gitkeep)
docs/postman/
├── blog-api.postman_collection.json
└── local.postman_environment.json
```

Mỗi module có module file, controller, service, DTO, model và test (requirements 6.5):

```text
modules/categories/
├── categories.module.ts
├── categories.controller.ts         # Route public
├── admin-categories.controller.ts   # Route /admin/... (nếu module có cả hai)
├── categories.service.ts
├── categories.service.spec.ts       # Unit test
├── dto/
└── models/
```

---

## 3. Khung backend (A phụ trách, việc A1)

Các phần trong mục này là phần nền. Sửa phần nền thì A phải duyệt PR.

### 3.1. Format response

`TransformInterceptor` bọc mọi response thành công:

```json
{ "success": true, "message": "Lấy danh sách bài viết thành công", "data": [], "meta": { "page": 1, "limit": 10, "total": 125, "totalPages": 13 } }
```

- Controller đặt message bằng `@ResponseMessage('...')`. Không có message thì dùng `"Thành công"`.
- Service trả `{ items, meta }` qua helper `paginate()`. Interceptor tách `items` vào `data` và `meta` vào `meta`. API không phân trang thì không có `meta`.

`AllExceptionsFilter` bọc mọi lỗi:

```json
{ "success": false, "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ", "errors": [{ "field": "email", "message": "Email đã tồn tại" }] }
```

- `ValidationPipe` có `exceptionFactory` chuyển lỗi của `class-validator` thành `errors[]`. Field lồng nhau viết dạng `translations.0.title`.
- `code` là phần thêm vào format 6.4 (quyết định Q2 ở mục 10). Phase 4 dựa vào `code` để hiện thông báo theo ngôn ngữ đang chọn. Danh sách mã đặt trong `common/errors.ts`, ví dụ: `VALIDATION_ERROR`, `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `RESET_TOKEN_INVALID`, `OAUTH_NO_EMAIL`, `LANGUAGE_IN_USE`, `CATEGORY_IN_USE`, `LAST_SUPER_ADMIN`.
- Lỗi 500 chỉ trả `"Lỗi hệ thống"`, không trả stack. Chi tiết ghi vào log.
- Lỗi unique của Sequelize (`SequelizeUniqueConstraintError`) đổi thành 409. Lỗi khóa ngoại RESTRICT đổi thành 409, kèm mã lỗi theo ngữ cảnh do service tự ném.

### 3.2. Xác thực và phân quyền

- `JwtAuthGuard` gắn global. Route public đánh dấu `@Public()`. Route public nhưng cần biết ai đang xem (chi tiết bài để biết quyền xóa bình luận) dùng `@Public({ optionalAuth: true })`.
- `RolesGuard` + `@Roles('blog_owner', 'super_admin')`. Kế thừa role (requirements mục 2) được xử lý trong guard: `super_admin` qua được mọi `@Roles`, `blog_owner` qua được `@Roles('user')`.
- Access token chứa `sub` (user id), `role` (code), `jti`; hạn 15 phút. Mỗi request kiểm tra `is_active` của user (cache Redis 60 giây) để tài khoản vừa bị khóa không dùng tiếp access token cũ.
- `@CurrentUser()` lấy user từ request.
- `test/helpers/auth.ts` có `tokenFor(role)` để B và C test API admin mà không phải chờ A2 làm xong đăng nhập.

### 3.3. Ngôn ngữ của request

- `LanguageMiddleware` đọc `Accept-Language` (lấy mã đầu tiên, ví dụ `en-US,en;q=0.9` → `en`), tìm trong danh sách ngôn ngữ đang hoạt động (cache Redis). Không có thì dùng ngôn ngữ mặc định.
- `@CurrentLanguage()` trả `{ id, code, isDefault }`. Mọi API public dùng ngôn ngữ này, không nhận `?lang=`. Ngoại lệ là `GET /ui-translations` và các API admin có tham số ngôn ngữ riêng.

### 3.4. Phân trang

- `PaginationQueryDto`: `page` (mặc định 1, ≥ 1), `limit` (mặc định 10, từ 1 đến 50). Quá 50 thì báo lỗi 400, không tự cắt (requirements 6.2).
- `meta`: `page`, `limit`, `total`, `totalPages`.

### 3.5. Redis

Tên key đặt trong `common/utils/redis-keys.ts`, không viết chuỗi key rải rác trong service.

| Key | Giá trị | TTL | Dùng ở |
| --- | --- | --- | --- |
| `auth:refresh:{jti}` | `userId` | 7 ngày | UC02, UC04 |
| `auth:user-refresh:{userId}` | Set các `jti` | 7 ngày | Thu hồi mọi phiên (UC03, UC14) |
| `auth:reset:{token}` | `userId` | 15 phút | UC03, xóa ngay sau khi dùng |
| `auth:login-fail:{ip}:{email}` | Số lần sai | 15 phút | UC02, quá 5 lần thì 429 |
| `auth:oauth-code:{code}` | `userId` | 60 giây | UC20, đổi lấy token |
| `auth:user-active:{userId}` | `1` / `0` | 60 giây | Guard, xóa khi khóa tài khoản |
| `view:{translationId}:{ip}` | `1` | 1 giờ | UC06 |
| `cache:posts:*` | JSON response | 5 phút | UC05, UC07, bài đọc nhiều |
| `cache:categories:*` | JSON response | 10 phút | Danh sách danh mục public |
| `cache:languages:active` | JSON | 10 phút | Middleware, bộ chọn ngôn ngữ |
| `cache:ui:{code}` | JSON | 10 phút | UC17 public |
| `throttle:*` | Bộ đếm của `@nestjs/throttler` | Theo rule | Rate limit |

Cache bị xóa khi dữ liệu liên quan thay đổi (requirements 6.2). `CacheService.invalidate('cache:posts:')` xóa theo prefix bằng `SCAN`, không dùng `KEYS`:

| Dữ liệu đổi | Xóa prefix |
| --- | --- |
| Bài viết, bản dịch bài (thêm, sửa, xóa, đổi trạng thái) | `cache:posts:`, `cache:categories:` (vì số bài theo danh mục đổi) |
| Danh mục | `cache:categories:`, `cache:posts:` (vì tên danh mục nằm trong thẻ bài) |
| Ngôn ngữ | `cache:` (toàn bộ) |
| UI translation | `cache:ui:` |
| Khóa tài khoản | `auth:user-active:{userId}` |

Lượt xem không xóa cache: số lượt xem trên thẻ bài được phép trễ tối đa 5 phút.

### 3.6. Upload

- `POST /api/v1/uploads/images` (Blog Owner, Super Admin): nhận 1 file field `file`, trả `{ path: "uploads/images/<uuid>.webp", url }`. Dùng cho thumbnail và ảnh chèn trong editor (UC13, UC18).
- Avatar dùng route riêng ở module profile (mục 4.4), lưu vào `uploads/avatars/`.
- Kiểm tra: đuôi `.jpg/.jpeg/.png/.webp`, MIME thật đọc từ nội dung file trùng với đuôi, tối đa 2MB. Tên file đổi thành UUID (requirements 6.1).
- Thư mục `uploads/` phục vụ tĩnh tại `/uploads` (dev dùng `ServeStaticModule`, phase 5 do Nginx chuyển tiếp).
- Trường `thumbnail` trong DTO chỉ nhận đường dẫn khớp `^uploads/images/[0-9a-f-]{36}\.(jpg|png|webp)$` và file phải tồn tại.
- Đổi hoặc xóa thumbnail, đổi avatar, xóa bài: xóa file cũ. Ảnh trong nội dung bài không dọn (mục 11).

### 3.7. Lọc HTML

`sanitizeRichText(html)` dùng chung cho nội dung bài (UC13) và trang tĩnh (UC18):

- Thẻ cho phép: `p, h2, h3, strong, b, em, i, u, ul, ol, li, blockquote, a, img, figure, figcaption, pre, code, br`.
- Thuộc tính: `a[href, target, rel]`, `img[src, alt]`. `href` chỉ nhận `http`, `https`, `mailto`. `img src` chỉ nhận `/uploads/...` hoặc `http(s)`. Mọi `a` được thêm `rel="noopener noreferrer"`.
- Bỏ `script`, `style`, `iframe`, mọi thuộc tính `on*` và `style`.
- Sau khi lọc mà không còn chữ hay ảnh thì báo lỗi "Nội dung là bắt buộc".

Bình luận (UC08) là văn bản thuần: nội dung có thẻ HTML thì báo lỗi validate, không lọc rồi lưu.

### 3.8. Slug

`generateUniqueSlug(text, languageId, model)`: bỏ dấu (`đ → d`), chữ thường, nối bằng `-`, cắt còn 250 ký tự. Trùng trong cùng ngôn ngữ thì thêm `-2`, `-3`... Dùng cho bản dịch bài (UC13) và tên danh mục (UC15). Sửa tiêu đề thì sinh lại slug (Q4, mục 10).

### 3.9. Swagger

- Mở tại `/api-docs`. Có nút Authorize kiểu Bearer.
- Mỗi controller có `@ApiTags`, mỗi route có `@ApiOperation` (ghi mã UC) và `@ApiResponse` cho các mã lỗi có thể xảy ra. DTO dùng plugin `@nestjs/swagger` của Nest CLI để không phải viết `@ApiProperty` bằng tay.
- Có `ApiPaginatedResponse(Dto)` để mô tả đúng format có `meta`.

---

## 4. Danh sách API

Mọi route có prefix `/api/v1`. Cột "Quyền": `public` (không cần đăng nhập), `auth` (mọi tài khoản đã đăng nhập), `owner` (Blog Owner, Super Admin), `admin` (Super Admin). Cột "Màn" là file HTML của phase 2 dùng API đó.

### 4.1. Xác thực (A)

| Method | Route | Quyền | UC | Màn | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | public | UC01 | `register` | 201. Email trùng → 409 kèm `errors[{field: "email"}]`. Role `user` |
| POST | `/auth/login` | public | UC02 | `login` | Trả `{ accessToken, refreshToken, user }`. Sai → 401 `INVALID_CREDENTIALS` (một thông báo chung). Bị khóa → 403 `ACCOUNT_LOCKED`. Quá 5 lần sai / 15 phút theo IP + email → 429. Đăng nhập đúng thì xóa bộ đếm |
| POST | `/auth/refresh` | public | UC02 | (interceptor phase 4) | Body `{ refreshToken }`. Xoay vòng: xóa `jti` cũ, cấp cặp token mới. Không hợp lệ hoặc hết hạn → 401 `TOKEN_EXPIRED` |
| POST | `/auth/logout` | auth | UC04 | header | Body `{ refreshToken }`. Xóa `jti` khỏi Redis |
| POST | `/auth/forgot-password` | public | UC03 | `forgot-password` | Luôn 200 với cùng một message. Có email thì gửi link `${FRONTEND_URL}/reset-password?token=...`. Rate limit 3 lần / 15 phút / IP |
| POST | `/auth/reset-password` | public | UC03 | `reset-password` | Body `{ token, password, confirmPassword }`. Token sai hoặc hết hạn → 400 `RESET_TOKEN_INVALID`. Thành công: xóa token, thu hồi mọi refresh token |
| GET | `/auth/me` | auth | UC02 | header | Thông tin user + role, để frontend hiện menu theo role |
| GET | `/auth/google`, `/auth/github` | public | UC20 | `login`, `register` | Chuyển hướng sang provider |
| GET | `/auth/google/callback`, `/auth/github/callback` | public | UC20 | | Xử lý theo UC20 rồi chuyển hướng về `${FRONTEND_URL}/oauth/callback?code=...`. Lỗi thì `?error=OAUTH_NO_EMAIL` (hoặc `ACCOUNT_LOCKED`) |
| POST | `/auth/oauth/exchange` | public | UC20 | | Body `{ code }`. Đổi mã dùng một lần (60 giây) lấy cặp token. Không đưa token lên URL |

### 4.2. Trang đọc blog

| Method | Route | Quyền | UC | Người | Màn | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/posts` | public | UC05 | C | `index` | Bản dịch `published` ở ngôn ngữ đang chọn, mới nhất trước, 10 bài / trang. Mỗi thẻ: `slug`, `title`, `excerpt`, `thumbnail`, `category { name, slug }` (tên theo ngôn ngữ đang chọn, thiếu thì dùng tên ngôn ngữ mặc định), `author { fullName, avatar }`, `publishedAt`, `viewCount`, `readingMinutes`. Cache |
| GET | `/posts/popular` | public | UC05 | C | sidebar | `?limit=` (mặc định 5, tối đa 10), theo `viewCount`. Cache |
| GET | `/posts/:slug` | public (optionalAuth) | UC06 | A | `post-detail` | Chi tiết bản dịch: nội dung, tác giả, danh mục, `translationId`, `commentCount`, `availableLanguages [{ code, name, slug }]` (chỉ ngôn ngữ đang hoạt động có bản `published`), `canDeleteComments` (người đang xem là tác giả bài hoặc Super Admin). Không có hoặc chưa đăng → 404. Tăng lượt xem theo mục 3.5 |
| GET | `/posts/:slug/related` | public | UC06 | A | `post-detail` | Tối đa 4 bài cùng danh mục, cùng ngôn ngữ, bỏ bài đang xem |
| GET | `/categories` | public | UC07 | C | sidebar, chip | Mọi danh mục, tên và slug theo ngôn ngữ đang chọn, `postCount` (số bản dịch `published` ở ngôn ngữ đó). Cache |
| GET | `/categories/:slug` | public | UC07 | C | `category` | Danh mục theo slug ở ngôn ngữ đang chọn + `postCount` + `translations [{ code, slug }]` để phase 4 đổi slug khi đổi ngôn ngữ (UC09). Thiếu tên ở ngôn ngữ đang chọn thì dùng slug của ngôn ngữ mặc định. Không có → 404 |
| GET | `/categories/:slug/posts` | public | UC07 | C | `category` | Như `GET /posts`, lọc theo danh mục. Cache |
| GET | `/search` | public | UC19 | A | `search` | `?q=` 2-100 ký tự (trim trước khi kiểm tra), sai → 400. `MATCH ... AGAINST (? IN BOOLEAN MODE)` trên FULLTEXT `ngram`, sắp theo độ liên quan, phân trang. Chỉ bản `published` ở ngôn ngữ đang chọn |
| GET | `/languages` | public | UC09, UC16 | B | header | Ngôn ngữ đang hoạt động: `code`, `name`, `isDefault`. Cache |
| GET | `/ui-translations/:code` | public | UC09, UC17 | B | mọi màn | Object `{ key: value }` của ngôn ngữ `code`, đã gộp sẵn giá trị của ngôn ngữ mặc định cho các key bị thiếu. Mã không có hoặc đã tắt → 404. Cache |
| GET | `/pages` | public | UC11 | B | footer, header | Trang đang hiển thị: `key`, `title` theo ngôn ngữ đang chọn (thiếu thì dùng ngôn ngữ mặc định) |
| GET | `/pages/:key` | public | UC11 | B | `page` | Tiêu đề + nội dung theo ngôn ngữ đang chọn, thiếu thì dùng ngôn ngữ mặc định. Trang ẩn hoặc key không có → 404 |

`readingMinutes` = số chữ trong nội dung đã bỏ thẻ / 200, làm tròn lên, tối thiểu 1. Thẻ bài trong phase 2 có hiện thời gian đọc nên tính ở backend.

### 4.3. Bình luận (B)

| Method | Route | Quyền | UC | Ghi chú |
| --- | --- | --- | --- | --- |
| GET | `/post-translations/:id/comments` | public (optionalAuth) | UC08 | Bình luận gốc, mới nhất trước, 20 / trang, mỗi bình luận kèm toàn bộ trả lời (cũ nhất trước). Mỗi bình luận có `canDelete` tính theo người đang xem. Bản dịch chưa đăng → 404 |
| POST | `/post-translations/:id/comments` | auth | UC08 | Body `{ content, parentId? }`. `content` 1-1000 ký tự sau khi trim, không chứa thẻ HTML. `parentId` phải là bình luận gốc (`parent_id = NULL`) và cùng bản dịch, sai → 400. Bản dịch chưa đăng → 404. 201, trả bình luận vừa tạo |
| DELETE | `/comments/:id` | auth | UC08 | Người viết, tác giả bài, Super Admin. Không có quyền → 403. Xóa luôn các trả lời (cascade) |

### 4.4. Hồ sơ cá nhân (A)

| Method | Route | Quyền | UC | Ghi chú |
| --- | --- | --- | --- | --- |
| GET | `/profile` | auth | UC12 | `fullName`, `email`, `avatar`, `role`, `hasPassword` (false thì phase 4 ẩn ô mật khẩu cũ) |
| PATCH | `/profile` | auth | UC12 | Body `{ fullName }`. DTO không có `email`, `role` nên `whitelist` tự chặn |
| POST | `/profile/avatar` | auth | UC12 | Multipart, field `file`. Theo mục 3.6. Xóa ảnh cũ |
| PATCH | `/profile/password` | auth | UC12 | Body `{ currentPassword?, newPassword, confirmPassword }`. Có mật khẩu thì `currentPassword` bắt buộc và phải đúng (sai → 400 kèm `errors[{field: "currentPassword"}]`). Mật khẩu mới theo ràng buộc UC01 |

### 4.5. Quản lý bài viết (A)

Mọi route có quyền `owner` và chỉ làm việc với bài của người đang đăng nhập. Super Admin cũng chỉ thấy bài của chính mình (UC13). Bài của người khác → 403. Bài không tồn tại → 404.

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/posts` | `?status=` (theo bản gốc), `?language=` (có bản dịch ở ngôn ngữ đó), `?categoryId=`, `?q=` (tìm `LIKE` trong tiêu đề mọi bản dịch), phân trang. Mỗi dòng: `id`, tiêu đề + ngôn ngữ gốc, danh mục, `thumbnail`, `translations [{ code, status }]`, `updatedAt` (lớn nhất giữa bài và các bản dịch) |
| POST | `/admin/posts` | Body: `languageCode`, `categoryId`, `thumbnail?`, `translation { title, excerpt?, content, status }`. Tạo bài và bản gốc trong cùng một transaction. Ngôn ngữ phải đang hoạt động, danh mục phải tồn tại. 201 |
| GET | `/admin/posts/:id` | Phần dùng chung + mọi bản dịch (kể cả bản dịch ở ngôn ngữ đã tắt) + `slug`, `viewCount`, `publishedAt` của từng bản dịch. Dùng cho màn sửa bài |
| PATCH | `/admin/posts/:id` | Body `{ categoryId?, thumbnail? }` (`thumbnail: null` là bỏ ảnh). Không nhận `languageCode` |
| DELETE | `/admin/posts/:id` | Xóa bài, mọi bản dịch, bình luận (cascade) và file thumbnail |
| POST | `/admin/posts/:id/translations` | Body `{ languageCode, title, excerpt?, content, status }`. Ngôn ngữ phải đang hoạt động; đã có bản dịch ở ngôn ngữ đó → 409 |
| PATCH | `/admin/posts/:id/translations/:code` | Sửa một bản dịch. Lần đầu chuyển sang `published` thì ghi `published_at`, các lần sau giữ nguyên. Sửa tiêu đề thì sinh lại slug |
| DELETE | `/admin/posts/:id/translations/:code` | Xóa bản dịch và bình luận của nó. Bản gốc → 400 |

Mọi API thay đổi dữ liệu ở bảng này đều xóa cache theo mục 3.5. Nội dung luôn qua `sanitizeRichText`.

### 4.6. Quản trị hệ thống (B)

Mọi route có quyền `admin`.

**Người dùng (UC14)**

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/users` | `?q=` (tên hoặc email), `?role=`, `?isActive=`, phân trang. Trả thêm `isSelf` để phase 4 vô hiệu nút ở hàng của chính mình |
| POST | `/admin/users` | Body `{ fullName, email, password, role }`. Ràng buộc giống UC01. 201 |
| PATCH | `/admin/users/:id/role` | Body `{ role }`. Tự hạ quyền chính mình → 400. Hạ quyền Super Admin hoạt động cuối cùng → 409 `LAST_SUPER_ADMIN` |
| PATCH | `/admin/users/:id/status` | Body `{ isActive }`. Tự khóa mình → 400. Khóa Super Admin hoạt động cuối cùng → 409. Khóa thì thu hồi mọi refresh token và xóa `auth:user-active` |

**Danh mục (UC15)**

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/categories` | Mọi danh mục: `translations [{ code, name, slug }]` theo mọi ngôn ngữ, `postCount` (mọi trạng thái). Có phân trang |
| POST | `/admin/categories` | Body `{ names: { vi: "...", en: "" } }`. Tên ngôn ngữ mặc định bắt buộc (2-150 ký tự). Tên rỗng thì không tạo dòng `category_translations`. Slug tự sinh |
| PATCH | `/admin/categories/:id` | Như POST. Xóa tên của ngôn ngữ không mặc định thì xóa dòng bản dịch đó |
| DELETE | `/admin/categories/:id` | Còn bài → 409 `CATEGORY_IN_USE` |

**Ngôn ngữ (UC16)**

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/languages` | Mọi ngôn ngữ + `postTranslationCount` |
| POST | `/admin/languages` | Body `{ code, name, isActive }`. `code` theo ISO 639-1 (kiểm tra bằng danh sách mã trong `common/iso-639-1.ts`), trùng → 409. Trong cùng transaction: sao chép mọi `ui_translations` của ngôn ngữ mặc định sang ngôn ngữ mới |
| PATCH | `/admin/languages/:id` | Body `{ name?, isActive? }`. Không đổi `code`. Tắt ngôn ngữ mặc định → 400 |
| PATCH | `/admin/languages/:id/default` | Đặt làm mặc định, bỏ mặc định ngôn ngữ cũ trong cùng transaction. Ngôn ngữ đang tắt → 400 |
| DELETE | `/admin/languages/:id` | Ngôn ngữ mặc định → 400. Đang có bản dịch bài (kể cả là ngôn ngữ gốc) → 409 `LANGUAGE_IN_USE`. Xóa được thì cascade `category_translations`, `ui_translations`, `page_translations` |

**Bản dịch giao diện (UC17)**

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/ui-translations` | `?q=` (tìm theo key hoặc giá trị), phân trang theo key (50 / trang). Mỗi dòng: `key`, `values: { vi: "...", en: null }` |
| POST | `/admin/ui-translations` | Body `{ key, values: { vi, en } }`. `key` dạng `nhom.ten` (`^[a-z0-9_]+(\.[a-z0-9_]+)+$`), trùng → 409. Giá trị của ngôn ngữ mặc định bắt buộc |
| PUT | `/admin/ui-translations/:key/:code` | Body `{ value }`. Sửa một ô (màn phase 2 sửa tại chỗ từng ô). Giá trị rỗng ở ngôn ngữ không mặc định thì xóa dòng (frontend sẽ dùng giá trị mặc định) |
| DELETE | `/admin/ui-translations/:key` | Xóa key ở mọi ngôn ngữ |

**Trang tĩnh (UC18)**

| Method | Route | Ghi chú |
| --- | --- | --- |
| GET | `/admin/pages` | Mọi trang: `key`, tiêu đề theo ngôn ngữ mặc định, `languages` đã có nội dung, `isVisible`, `updatedAt`. Không phân trang |
| GET | `/admin/pages/:key` | `isVisible` + nội dung của mọi ngôn ngữ |
| PUT | `/admin/pages/:key` | Body `{ isVisible, translations: [{ code, title, content }] }`. Lưu mọi tab trong một transaction. Ngôn ngữ mặc định: bắt buộc cả hai trường. Ngôn ngữ khác: có đủ cả hai hoặc trống cả hai (trống thì xóa dòng). Lỗi ghi field dạng `translations.en.title` để phase 4 đánh dấu tab có lỗi. Nội dung qua `sanitizeRichText` |

---

## 5. Seeders (B phụ trách, việc B1)

Theo requirements 6.6 và [sample-data.md](sample-data.md). Chạy bằng `npm run db:seed`, rollback bằng `npm run db:seed:undo`.

| Seeder | Nội dung |
| --- | --- |
| `01-roles` | 3 role `user`, `blog_owner`, `super_admin` |
| `02-languages` | `vi` (mặc định), `en` |
| `03-users` | 1 Super Admin, 2 Blog Owner, 1 User (tài khoản OAuth Github, `password_hash = NULL`). Mật khẩu chung `Password123` ghi trong README backend, băm lúc chạy seeder |
| `04-categories` | 5 danh mục, có tên `vi` và `en` (1 danh mục chỉ có tên `vi` để test việc dùng tên mặc định) |
| `05-posts` | ~30 bài: gốc `vi` và gốc `en`, một phần có bản dịch sang ngôn ngữ còn lại, có bản dịch `draft` và `archived`. Nội dung có đủ các định dạng của editor. Thumbnail copy từ `html/assets/img/` vào `uploads/images/` |
| `06-comments` | Bình luận và trả lời 1 cấp trên vài bản dịch, cả `vi` lẫn `en` |
| `07-ui-translations` | Mọi key `data-i18n` trong `html/` (hiện có ~320 key), giá trị `vi` lấy từ chữ trong HTML, giá trị `en` dịch tay. Dùng script `scripts/extract-i18n.mjs` để xuất danh sách key và chữ tiếng Việt, tránh gõ tay sót key |
| `08-pages` | `about`, `contact`, `privacy` có nội dung `vi` và `en` |

Seeder hiệu năng riêng `npm run db:seed:perf` (C viết ở C3): sinh 10.000 bài để đo yêu cầu "dưới 500ms" ở requirements 6.2. Không chạy chung với seeder thường.

---

## 6. Kiểm thử

### 6.1. Unit test (tầng service)

- File `*.service.spec.ts` nằm cạnh service. Mock model Sequelize, `CacheService`, `RedisService`, `MailService`.
- Mỗi ràng buộc trong requirements có ít nhất một test. Ví dụ: slug trùng thêm `-2`; không xóa được bản gốc; ghi `published_at` chỉ lần đầu; không hạ quyền Super Admin cuối cùng; trả lời bình luận chỉ 1 cấp; rate limit lần sai thứ 6 bị 429.
- Độ phủ tối thiểu 70% với `src/**/*.service.ts` (cấu hình `collectCoverageFrom` và `coverageThreshold` trong Jest để `npm run test:cov` báo lỗi nếu thấp hơn).

### 6.2. Integration test (Supertest)

- Chạy với database `blog_test` và Redis db 1 trong `docker-compose`. Trước mỗi file test: chạy migrations, nạp dữ liệu nhỏ riêng cho test (không dùng seeder demo), xóa sạch Redis db 1.
- Mỗi module một file `test/<module>.e2e-spec.ts`. Ít nhất kiểm tra: đường thành công, lỗi validate (đúng format `errors[]`), 401 khi không có token, 403 khi sai role hoặc không phải chủ bài, 404, 409.
- Một file `test/response-format.e2e-spec.ts` kiểm tra format 6.4 cho một API thành công, một API phân trang và một API lỗi của mỗi module.
- Gửi email: dùng mock `MailService`, kiểm tra có gọi gửi và link chứa token.

### 6.3. Postman

- `docs/postman/blog-api.postman_collection.json`: mỗi module một folder, đặt tên request kèm mã UC, ví dụ `UC02 - Đăng nhập`.
- `docs/postman/local.postman_environment.json`: `baseUrl`, `lang`, `accessToken`, `refreshToken`, `adminAccessToken`, `ownerAccessToken`. Không chứa mật khẩu thật.
- Folder `00 - Auth` chạy đầu tiên, có script lưu token vào biến môi trường. Mọi request khác dùng `Bearer {{accessToken}}` và gửi `Accept-Language: {{lang}}`.
- Mỗi request có test script kiểm tra mã HTTP và `success`.
- Chạy cả collection bằng Postman CLI (dữ liệu phải vừa seed xong):

  ```bash
  postman collection run docs/postman/blog-api.postman_collection.json -e docs/postman/local.postman_environment.json
  ```

- Mỗi người thêm request cho API của mình trong cùng PR với API đó. Để tránh conflict file JSON: chỉ sửa folder của module mình, export lại cả collection rồi commit; ai merge sau thì rebase và export lại.

---

## 7. Quy ước code

### 7.1. Đặt tên

- Route dạng kebab-case, danh từ số nhiều: `/admin/ui-translations`, `/post-translations/:id/comments`.
- JSON dạng camelCase (`fullName`, `publishedAt`). Model map sang cột snake_case bằng `underscored: true`.
- Ngôn ngữ trong route và body dùng `code` (`vi`, `en`), không dùng `id`. Phase 4 chỉ cần biết mã ngôn ngữ.
- Ngày giờ trả theo ISO 8601 UTC (`2026-09-01T01:00:00.000Z`). Sequelize đặt `timezone: '+00:00'`.

### 7.2. Controller, service, DTO

- Controller chỉ nhận request, gọi service và đặt `@ResponseMessage`. Không truy vấn database trong controller.
- Thao tác ghi nhiều bảng chạy trong `sequelize.transaction()`: tạo bài + bản gốc, đổi ngôn ngữ mặc định, thêm ngôn ngữ + sao chép UI translation, lưu trang tĩnh.
- Mỗi DTO có message lỗi tiếng Việt cho từng ràng buộc. Câu chữ lấy theo `invalid-feedback` của màn HTML tương ứng để phase 4 hiện giống phase 2.
- Không trả model thô: `password_hash` và các cột nội bộ không bao giờ có trong response. Dùng hàm map hoặc `ClassSerializerInterceptor` + `@Exclude`.
- Truy vấn danh sách không có N+1: dùng `include` hoặc truy vấn gộp, kiểm tra bằng log SQL khi dev.

### 7.3. Biến môi trường

`.env.example` gồm: `NODE_ENV`, `PORT`, `FRONTEND_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, `UPLOAD_DIR`, `UPLOAD_MAX_SIZE`. Ứng dụng validate biến lúc khởi động, thiếu biến thì dừng và báo tên biến.

### 7.4. Git

- Nhánh `feature/be-<phần>` tạo từ `dev`, ví dụ `feature/be-starter`, `feature/be-auth`, `feature/be-categories`.
- Commit theo Conventional Commits với scope `api`: `feat(api): add category endpoints`, `test(api): cover post translation rules`.
- Merge vào `dev` qua PR, review theo requirements 1.4. Sửa `src/common/`, `src/infra/`, `database/migrations/` thì A phải duyệt.
- Trước khi tạo PR: `npm run lint`, `npm run test`, `npm run test:e2e` đều qua; Swagger có route mới; Postman có request mới. Mô tả PR ghi danh sách route và kết quả `test:cov` của module.
- Cuối phase merge `dev` vào `master`. Requirements 6.5 ghi `main`, nhưng repo dùng `master` (Q5, mục 10).

---

## 8. Thứ tự làm

Mỗi dòng là một nhánh và một PR. Cột "Chờ" ghi việc của người khác phải merge xong thì mới bắt đầu được. Đến lượt mà việc phải chờ chưa merge thì làm trước việc tiếp theo không phải chờ.

### Tỉ lệ phân công

| Người | Khối lượng | Phần việc |
| --- | --- | --- |
| A | ~50% | Khung backend, xác thực (UC01-UC04), quản lý bài viết (UC13), chi tiết bài (UC06), tìm kiếm (UC19), hồ sơ cá nhân (UC12), OAuth (UC20), hoàn thiện cuối phase |
| B | ~35% | Seeders, ngôn ngữ (UC16), bản dịch giao diện (UC17), danh mục (UC15), bình luận (UC08), người dùng (UC14), trang tĩnh (UC11, UC18) |
| C | ~15% | Chạy thử migrate/seed/rollback, trang chủ (UC05), bài theo danh mục (UC07), kiểm tra tổng và đo hiệu năng |

So với bản 1.0 (A ~45%, B ~40%), hồ sơ cá nhân UC12 chuyển từ B sang A (việc A6). UC12 dùng lại nhiều phần của A: upload ảnh (A1), đổi mật khẩu theo ràng buộc UC01 (A2), `hasPassword` cho tài khoản OAuth (A7). A1, A2 đã merge ngày 26/10, sớm hơn lịch 3 ngày, nên A còn thời gian nhận thêm.

Tỉ lệ này chỉ áp dụng cho phase 3. Requirements mục 1.4 (tỉ lệ chung của dự án) giữ nguyên.

### A

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| A1 (**đã xong**) | Khung backend: `docker-compose.yml`, project NestJS, config 3 môi trường, migrations đủ 12 bảng (gồm FULLTEXT `ngram`), model; mọi phần ở mục 3 (response, exception filter, guard, language middleware, phân trang, Redis + cache, throttler, upload, lọc HTML, slug, Swagger, helmet, CORS); Jest + helper test (`tokenFor(role)`); khung Postman collection. Module mẫu `languages` (chỉ `GET /languages`) để B, C copy | | **Merge sớm** (mục tiêu 28/10) vì mọi việc khác cần. Module mẫu có đủ controller, service, DTO, test unit và e2e |
| A2 (**đã xong**) | Auth UC01-UC04: register, login + rate limit, refresh xoay vòng, logout, forgot/reset password + email, `/auth/me` | A1 | Merge sớm để Postman có token thật |
| A3 | Quản lý bài viết UC13 (mục 4.5), xóa cache bài viết | A1 | Phần lớn nhất của phase. Tách 2 PR: bài + bản gốc, rồi bản dịch. Test e2e dùng dữ liệu riêng nên không phải chờ B1; B1 chỉ cần khi thử bằng Postman |
| A4 | Chi tiết bài UC06: `/posts/:slug`, `/related`, tăng lượt xem | A3 | |
| A5 | Tìm kiếm UC19 (Should) | A3 | Test với cả từ khóa tiếng Việt có dấu |
| A6 | Hồ sơ cá nhân UC12 (Should, mục 4.4) | A2 | Chuyển từ B sang ở bản 1.1. Avatar dùng lại `UploadModule` |
| A7 | OAuth UC20 Google, Github (Should) | A2 | Cần đăng ký app OAuth (requirements mục 9) trước ngày làm |
| A8 | Duyệt lỗi C báo ở C3 thuộc phần nền, hoàn thiện Swagger, kiểm tra độ phủ chung, merge `dev` → `master` | C3 | |

### B

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| B1 | Seeders (mục 5), script `extract-i18n.mjs` | A1 | **Merge sớm** vì A3, C1 cần dữ liệu |
| B2 | Ngôn ngữ UC16 (admin, mở rộng module mẫu) + bản dịch giao diện UC17 (admin + `GET /ui-translations/:code`) | A1 | Thêm ngôn ngữ thì sao chép UI translation |
| B3 | Danh mục UC15 (admin) | A1 | Tạo module `categories`. C2 thêm route public vào đây |
| B4 | Bình luận UC08 | A1, B1 | Quyền xóa cần biết tác giả bài qua `post_translations → posts.user_id` |
| B5 | Người dùng UC14 | A2 | Thu hồi refresh token dùng hàm của A2 |
| B6 | Trang tĩnh UC11 + UC18 | A1 | |

### C

| # | Việc | Chờ | Ghi chú |
| --- | --- | --- | --- |
| C1 | Chạy thử migrate, seed, rollback trên database trống (việc còn lại của phase 1), báo lỗi cho A và B. Sau đó làm `GET /posts`, `GET /posts/popular` (UC05) có cache | A1, B1 | Copy cách làm của module mẫu. Gặp chỗ chưa rõ thì hỏi A trước khi làm |
| C2 | `GET /categories`, `/categories/:slug`, `/categories/:slug/posts` (UC07) có cache | B3, C1 | Dùng lại hàm truy vấn thẻ bài của C1 |
| C3 | Kiểm tra tổng: chạy cả Postman collection bằng Postman CLI trên dữ liệu vừa seed; đối chiếu từng API với format 6.4 và bảng mục 4; viết `db:seed:perf` và đo `GET /posts`, `/categories/:slug/posts`, `/search`, `/admin/posts` với 10.000 bài; ghi lỗi thành danh sách, lỗi trong một module chuyển người làm module đó, lỗi phần nền chuyển A | A4, B6 | Làm sau cùng. Ghi danh sách lỗi và số đo thời gian vào mô tả PR |

### Lịch dự kiến

| Ngày | A | B | C |
| --- | --- | --- | --- |
| 26/10 | A1, A2 (đã merge) | B5 phase 2 (đã xong), review A2 | C3 phase 2 |
| 27/10 - 28/10 | A3 (bài + bản gốc) | B1 | C3 phase 2 |
| 29/10 - 30/10 | A3 (bản dịch) | B2 | C1 (chạy thử migrate/seed) |
| 02/11 - 03/11 | A4 | B3 | C1 (`/posts`) |
| 04/11 - 05/11 | A5, A6 | B4 | C1, C2 |
| 06/11 | A7 | B5 | C2 |
| 09/11 - 10/11 | Dự phòng, review, sửa lỗi C3 phần nền | B6, sửa lỗi C3 | C3 |
| 11/11 | A8 | Sửa lỗi C3 | Chạy lại Postman CLI sau khi sửa |

Nếu đến 05/11 mà A3 hoặc A4 chưa merge thì lùi A5, A6, A7 (Should) sang đầu phase 4 và dành thời gian cho Must. B6 là việc Must cuối của B: nếu đến 09/11 B còn chậm thì A nhận B6 trong 2 ngày dự phòng.

---

## 9. Điều kiện hoàn thành

Phase 3 kết thúc khi đạt hết các mục sau (mở rộng từ requirements mục 1.5):

**Đủ API**

- [ ] Có đủ API ở mục 4 cho mọi use case Must: UC01-UC09, UC11, UC13-UC18.
- [ ] Mỗi trạng thái bắt buộc của các màn ở phase 2 (danh sách ở phase 2 doc mục 5) có API hoặc mã lỗi tương ứng.
- [ ] Chạy migrate, seed, rollback trên database trống không lỗi.

**Chuẩn API**

- [ ] Mọi response đúng format requirements 6.4 (thành công, phân trang, lỗi), đúng mã HTTP.
- [ ] Lỗi validate có `field` khớp tên field trong request.
- [ ] Mọi API danh sách có phân trang, `limit` tối đa 50.
- [ ] Swagger tại `/api-docs` có đủ mọi route, có mô tả lỗi, gọi thử được bằng Authorize.
- [ ] Postman collection có đủ mọi route, `postman collection run` qua hết trên dữ liệu vừa seed.

**Bảo mật**

- [ ] Mỗi route admin trả 401 khi không có token và 403 khi sai role (có test e2e).
- [ ] Blog Owner không xem, sửa, xóa được bài của người khác (403).
- [ ] Gửi `<script>` và `onerror=` trong nội dung bài, trang tĩnh thì bị lọc; bình luận có thẻ HTML thì bị từ chối.
- [ ] Upload file `.php` đổi tên thành `.jpg`, hoặc file lớn hơn 2MB, bị từ chối.
- [ ] Đăng nhập sai lần thứ 6 trong 15 phút nhận 429.
- [ ] Khóa tài khoản thì refresh token cũ không dùng được; access token cũ bị chặn trong vòng 60 giây.
- [ ] Không có `password_hash` trong bất kỳ response nào. Không commit `.env`.

**Hiệu năng**

- [ ] Với 10.000 bài (`db:seed:perf`), các API danh sách ở C3 trả về dưới 500ms (đo lần gọi đầu, chưa có cache).
- [ ] Sửa bài, danh mục thì lần gọi danh sách tiếp theo thấy dữ liệu mới (cache đã xóa).

**Test và code**

- [ ] `npm run test`, `npm run test:e2e` qua hết. `npm run test:cov` đạt ≥ 70% ở tầng service.
- [ ] `npm run lint` không lỗi.
- [ ] Mọi PR đã được review theo requirements 1.4 và merge vào `dev`; `dev` đã merge vào `master`.

---

## 10. Các quyết định cần thống nhất

Cả nhóm chốt các mục này trước khi bắt đầu A1. Cột "Đề xuất" là phương án tài liệu này đang dùng.

| # | Vấn đề | Đề xuất | Lý do |
| --- | --- | --- | --- |
| Q1 | Refresh token gửi qua body hay cookie httpOnly? | Body + frontend lưu `localStorage` | Đúng với requirements UC04 ("xóa token đang lưu ở frontend"); không phải xử lý CSRF và cookie khi phase 5 truy cập bằng IP không có HTTPS. Đổi lại phải lọc XSS kỹ (mục 3.7) |
| Q2 | Message lỗi theo ngôn ngữ nào? | `message` tiếng Việt như ví dụ ở 6.4, thêm trường `code` vào response lỗi | Swagger và Postman dễ đọc; phase 4 hiện thông báo theo ngôn ngữ đang chọn bằng cách map `code` sang key UI translation `error.*`. Cần sửa requirements 6.4 để ghi thêm `code` |
| Q3 | Thumbnail upload cùng form bài viết hay upload riêng? | Upload riêng (`POST /uploads/images`), bài viết chỉ nhận đường dẫn | Editor cũng cần chèn ảnh (UC13, UC18), dùng chung một API; form bài viết vẫn là JSON |
| Q4 | Sửa tiêu đề thì có đổi slug không? | Có, sinh lại slug | Requirements ghi slug "tự sinh từ tiêu đề". Link cũ sẽ ra 404; giữ slug cũ hoặc redirect thì nằm ngoài phạm vi |
| Q5 | Nhánh chính tên `main` (requirements 6.5) hay `master`? | Giữ `master` + `dev` như phase 2, sửa requirements 6.5 | Repo và GitHub Pages đang chạy trên `master` |

---

## 11. Ngoài phạm vi phase 3

- Giao diện Angular và việc nối API vào giao diện (phase 4).
- Facebook OAuth (requirements UC20 ghi "làm nếu còn thời gian").
- Dọn ảnh không còn dùng: ảnh trong nội dung bài, ảnh đã upload nhưng không lưu bài.
- Giữ slug cũ hoặc redirect khi đổi tiêu đề.
- Ghi log ra file, monitoring. Chỉ log ra console.
- Cấu hình production: PM2, Nginx, MySQL user riêng (phase 5). Phase 3 chỉ cần `.env.example` đủ biến.
- Các chức năng ở requirements mục 8.

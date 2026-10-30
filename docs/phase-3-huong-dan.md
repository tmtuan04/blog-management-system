# Hướng dẫn làm phase 3

File này hướng dẫn từng bước: cài máy, chạy backend, làm một module từ đầu đến khi tạo PR. Quy định đầy đủ nằm ở [phase-3-backend.md](phase-3-backend.md). Khi file này và file đó nói khác nhau thì theo [phase-3-backend.md](phase-3-backend.md).

---

## 1. Đọc trước (khoảng 45 phút)

1. [phase-3-backend.md](phase-3-backend.md): đọc mục 3 (khung backend đã có những gì), mục 4 (danh sách API, tìm dòng có tên mình), mục 7 (quy ước code) và mục 8 (**việc của từng người và thứ tự làm**).
2. [backend/README.md](../backend/README.md) mục "Viết một module mới": các decorator, hàm có sẵn để dùng.
3. Module mẫu `backend/src/modules/languages/`: mở từng file trong VS Code, đọc code kèm comment. Đọc thêm `languages.service.spec.ts` (unit test) và `backend/test/languages.e2e-spec.ts` (e2e test). **Mọi module còn lại đều làm theo cách của module này.**
4. Module `auth` (`src/modules/auth/`) là ví dụ đầy đủ hơn: có DTO validate, nhiều route, ném lỗi, test nhiều trường hợp.

---

## 2. Cài máy (làm 1 lần)

| Cần cài | Kiểm tra đã có chưa (gõ trong terminal) |
| --- | --- |
| [Git](https://git-scm.com/downloads) | `git --version` |
| [NodeJS bản LTS](https://nodejs.org) | `node -v` (từ v20 trở lên) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` và `docker compose version` |
| [Postman](https://www.postman.com/downloads/) (app) | |
| [Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-installation/) | `postman --version` |
| VS Code + extension **ESLint**, **Prettier** | |

Docker Desktop trên Windows:

- Lúc cài chọn **Use WSL 2**. Nếu Docker báo thiếu WSL thì mở PowerShell bằng quyền Administrator, chạy `wsl --install`, khởi động lại máy.
- Mỗi lần làm việc phải **mở Docker Desktop trước** và đợi biểu tượng cá voi báo "Engine running". Docker chưa chạy thì mọi lệnh `docker` và cả app đều lỗi.

---

## 3. Lấy code và chạy

**Bước 1. Lấy code mới nhất**

```bash
git checkout dev
git pull origin dev
```

Chưa có dự án trên máy thì `git clone https://github.com/tmtuan04/blog-management-system.git` trước, rồi `cd blog-management-system`.

**Bước 2. Bật MySQL và Redis** (ở **gốc repo**, không phải trong `backend/`)

```bash
docker compose up -d
docker compose ps
```

Đợi đến khi cột STATUS của `blog-mysql` ghi `healthy` (lần đầu mất khoảng 30 giây để tải image). Lần đầu chạy, MySQL tự tạo 2 database `blog_dev`, `blog_test` và user `blog` / mật khẩu `blog`.

Máy đã cài sẵn MySQL hoặc Redis (cổng 3306, 6379 bị chiếm): xem mục 9.

**Bước 3. Cài thư viện và tạo `.env`**

```bash
cd backend
npm install
cp .env.example .env
```

Mở `backend/.env`, điền 4 chỗ còn trống:

| Biến | Lấy ở đâu |
| --- | --- |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Chạy lệnh dưới **2 lần**, mỗi biến dán một chuỗi khác nhau |
| `MAIL_USER`, `MAIL_PASSWORD` | Vào [ethereal.email](https://ethereal.email), bấm **Create Ethereal Account**, chép Username và Password. Email "quên mật khẩu" gửi đi sẽ xem được ở mục Messages của trang đó |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Các biến `GOOGLE_*`, `GITHUB_*` để trống (chỉ A cần ở việc A7). Những biến khác giữ nguyên.

**Không commit file `.env`** (đã có trong `.gitignore`).

**Bước 4. Tạo bảng và chạy app**

```bash
npm run db:migrate
npm run db:seed
npm run start:dev
```

- `npm run db:seed` chỉ nạp dữ liệu sau khi việc B1 (seeders) được merge. Trước đó lệnh này không làm gì; cần tài khoản thì gọi `POST /auth/register` ở Swagger.
- Để nguyên terminal `start:dev` trong lúc làm. Lưu file `.ts` thì app tự khởi động lại.

**Bước 5. Kiểm tra đã chạy được**

1. Mở <http://localhost:3000/api-docs>, thấy trang Swagger có nhóm Auth, Languages, Uploads.
2. Mở nhóm **Languages**, bấm `GET /api/v1/languages` → **Try it out** → **Execute**. Trả `200` là xong (sau khi có seed thì `data` có `vi`, `en`; chưa seed thì `data: []`).
3. Mở terminal thứ hai trong `backend/`, chạy test. Cả hai phải báo xanh hết:

   ```bash
   npm run test
   npm run test:e2e
   ```

**Gọi API cần đăng nhập trên Swagger:** gọi `POST /auth/login`, chép `data.accessToken` trong response, bấm nút **Authorize** (góc trên phải), dán vào rồi bấm Authorize. Access token hết hạn sau 15 phút thì đăng nhập lại.

**Hằng ngày** chỉ cần: mở Docker Desktop → `git pull origin dev` → trong `backend/` chạy `npm install` (nếu có người thêm thư viện), `npm run db:migrate` (nếu có migration mới) → `npm run start:dev`.

---

## 4. Thứ tự làm

Việc của A, B và C nằm ở [phase-3-backend.md](phase-3-backend.md) mục 8. Mỗi người làm bảng của mình, lần lượt từ trên xuống. Mỗi dòng là **một nhánh và một PR riêng**, làm xong dòng nào thì tạo PR dòng đó.

Việc có ghi ở cột "Chờ" thì đợi việc đó của người khác merge vào `dev` rồi mới bắt đầu (nhớ `git pull origin dev`). Chưa có thì làm trước việc tiếp theo không phải chờ.

Phần nền đã có sẵn trong `src/common/`, `src/infra/` (format response, guard, phân trang, cache, upload, lọc HTML, slug...) cứ dùng lại, **không viết lại**. Cần sửa phần nền thì báo A trước, PR đó A phải duyệt.

Model của cả 12 bảng đã có sẵn trong `src/modules/<module>/models/` và đã đăng ký trong `src/infra/database/models.ts`. Không cần viết migration hay model mới, trừ khi A đồng ý.

---

## 5. Quy trình làm một module

Ví dụ B làm B3, quản lý danh mục (`/admin/categories`, UC15). Module khác làm tương tự.

**Bước 1. Tạo nhánh mới từ `dev` mới nhất**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/be-categories
```

Tên nhánh: `feature/be-<phần>`.

**Bước 2. Đọc yêu cầu của API**

- [phase-3-backend.md](phase-3-backend.md) mục 4: bảng route của mình (method, route, body, mã lỗi). Ví dụ danh mục ở mục 4.6.
- [requirements.md](requirements.md): use case tương ứng (UC15), đọc kỹ phần ràng buộc. **Mỗi ràng buộc phải có ít nhất một test.**
- Màn HTML phase 2 tương ứng (`html/admin/categories.html`): xem màn cần dữ liệu gì, câu thông báo lỗi trong `invalid-feedback` (DTO dùng đúng câu đó).

**Bước 3. Tạo các file theo module mẫu**

```text
src/modules/categories/
├── categories.module.ts
├── admin-categories.controller.ts   # route /admin/categories
├── categories.service.ts
├── categories.service.spec.ts
├── dto/
│   ├── save-category.dto.ts         # body của POST, PATCH
│   ├── list-categories-query.dto.ts # query, kế thừa PaginationQueryDto
│   └── category-response.dto.ts     # dữ liệu trả về
└── models/                          # đã có sẵn
```

Copy `languages.module.ts`, `languages.controller.ts`, `languages.service.ts` sang rồi đổi tên. Sau đó thêm module vào `imports` trong `src/app.module.ts`.

**Bước 4. Viết DTO**

- Mỗi ràng buộc một decorator của `class-validator`, có `message` tiếng Việt lấy từ màn HTML.
- Comment `/** ... */` trên mỗi field sẽ thành mô tả trong Swagger.
- Response DTO chỉ chứa field trả về, viết camelCase. Không bao giờ trả `passwordHash` hay model thô.

**Bước 5. Viết service**

Service chứa toàn bộ logic và truy vấn database. Những thứ có sẵn để dùng:

| Cần | Dùng |
| --- | --- |
| Báo lỗi | `throw new AppException(409, ErrorCode.CATEGORY_IN_USE, 'Danh mục đang có bài viết')`. Mã lỗi khai báo trong `src/common/errors.ts`, thiếu thì thêm |
| Lỗi validate một field | `throw AppException.validation([{ field: 'names.vi', message: '...' }])` |
| Phân trang | Query DTO kế thừa `PaginationQueryDto`, service trả `paginate(items, total, query)` |
| Ghi nhiều bảng cùng lúc | `this.sequelize.transaction(async (transaction) => { ... })` |
| Cache | Đọc: `this.cache.wrap(key, CacheTtl.categories, load)`. Ghi xong thì xóa: `this.cache.invalidate(CachePrefix.categories)`. Key khai báo trong `src/common/utils/redis-keys.ts` |
| Slug | `generateUniqueSlug(...)` trong `src/common/utils/slug.ts` |
| Nội dung rich text | `sanitizeRichText`, `hasRichTextContent`, `containsHtml` trong `src/common/utils/html-sanitize.ts` |
| Upload ảnh | `UploadService` trong `src/infra/upload` |

Khi dev, xem log SQL trong terminal `start:dev` để chắc không bị N+1 (mỗi dòng của danh sách lại gọi thêm một câu SQL). Gặp thì dùng `include`.

**Bước 6. Viết controller**

Controller chỉ nhận request và gọi service, không truy vấn database.

```ts
@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'UC15 - Thêm danh mục' })
  @ApiDataResponse(CategoryResponseDto)
  @ApiErrorResponses(400, 401, 403)
  @ResponseMessage('Thêm danh mục thành công')
  create(@Body() dto: SaveCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }
}
```

- Mặc định mọi route **cần đăng nhập**. Route ai cũng gọi được thì thêm `@Public()`; public nhưng cần biết ai đang xem thì `@Public({ optionalAuth: true })`.
- Giới hạn role bằng `@Roles(...)`: `user`, `blog_owner`, `super_admin`. Route ghi quyền `admin` trong tài liệu là `@Roles('super_admin')`.
- Lấy người dùng: `@CurrentUser() user: AuthUser`. Lấy ngôn ngữ của request: `@CurrentLanguage() lang: RequestLanguage`.
- Danh sách dùng `@ApiPaginatedResponse(Dto)` thay cho `@ApiDataResponse`.

Lưu file rồi mở lại Swagger, thử gọi từng route mới.

**Bước 7. Viết unit test cho service** (`categories.service.spec.ts`)

Copy cách làm của `languages.service.spec.ts`: thay model và `CacheService` bằng object giả (`jest.fn()`), chỉ test logic của service. Mỗi ràng buộc trong use case một test, ví dụ: thiếu tên ngôn ngữ mặc định → lỗi; slug trùng thêm `-2`; xóa danh mục còn bài → 409; ghi xong thì gọi `cache.invalidate`.

```bash
npm run test -- categories          # chỉ chạy test có tên chứa "categories"
npm run test:cov                    # độ phủ tầng service phải ≥ 70%
```

**Bước 8. Viết e2e test** (`test/categories.e2e-spec.ts`)

Copy cách làm của `test/languages.e2e-spec.ts`. E2e test chạy trên database `blog_test` (tự chạy migrations), trước mỗi test được xóa sạch và nạp sẵn 3 role, 2 ngôn ngữ `vi`, `en`. Dữ liệu khác tự tạo trong test.

```ts
import { bearer, tokenFor } from './helpers/auth';

const { token } = await tokenFor(ctx.app, 'super_admin');
await request(server())
  .post('/api/v1/admin/categories')
  .set(bearer(token))
  .send({ names: { vi: 'Lập trình', en: 'Programming' } })
  .expect(201);
```

Mỗi module ít nhất có: đường thành công; lỗi validate (đúng `errors[].field`); `401` khi không có token; `403` khi sai role (dùng `tokenFor(ctx.app, 'user')`); `404`; `409` nếu có.

```bash
npm run test:e2e -- categories
```

**Bước 9. Thêm request vào Postman**

1. Trong app Postman: **Import** file `docs/postman/blog-api.postman_collection.json` và `docs/postman/local.postman_environment.json`, chọn environment `local` ở góc trên phải.
2. Chạy folder `00 - Auth` trước để có `accessToken`, `ownerAccessToken`, `adminAccessToken`.
3. Tạo folder cho module mình (ví dụ `Categories`). Mỗi route một request, tên kèm mã UC (`UC15 - Thêm danh mục`), dùng `{{baseUrl}}`, header `Authorization: Bearer {{adminAccessToken}}` và `Accept-Language: {{lang}}`.
4. Mỗi request có tab **Scripts → Post-response** kiểm tra mã HTTP và `success`, copy từ request có sẵn trong `00 - Auth`.
5. Export lại cả collection (chuột phải vào collection → **Export** → Collection v2.1), ghi đè file cũ. **Chỉ sửa folder của mình.**
6. Chạy thử cả collection bằng Postman CLI (app phải đang chạy, dữ liệu vừa seed):

   ```bash
   postman collection run docs/postman/blog-api.postman_collection.json -e docs/postman/local.postman_environment.json
   ```

**Bước 10. Tự kiểm tra theo checklist ở mục 6**

**Bước 11. Commit, push, tạo PR**: xem mục 7.

---

## 6. Checklist trước khi tạo PR

Copy danh sách này vào mô tả PR và đánh dấu từng mục.

```markdown
- [ ] Đủ route của mình ở phase-3-backend.md mục 4, đúng method, đường dẫn, mã HTTP
- [ ] Response đúng format (success, message, data / meta / errors), JSON dạng camelCase
- [ ] Không có passwordHash hay cột nội bộ trong response
- [ ] Message lỗi validate tiếng Việt, khớp câu trong màn HTML phase 2
- [ ] Ghi nhiều bảng thì chạy trong transaction; ghi xong có xóa cache liên quan
- [ ] Swagger: route mới có summary kèm mã UC, mô tả lỗi, gọi thử được bằng Authorize
- [ ] npm run lint không lỗi
- [ ] npm run test và npm run test:e2e qua hết
- [ ] npm run test:cov: tầng service ≥ 70% (ghi % của module mình vào đây)
- [ ] Mỗi ràng buộc của use case có ít nhất một test; e2e có 401, 403 cho route cần đăng nhập
- [ ] Đã thêm request vào Postman collection, postman collection run qua hết
- [ ] Không commit .env, uploads/, coverage/, dist/
- [ ] Đã thêm dòng vào CHANGELOG.md (mục [Unreleased])
```

Mô tả PR ghi thêm danh sách route đã làm.

---

## 7. Commit, push và tạo PR

```bash
cd backend
npm run lint
npm run test
npm run test:e2e
cd ..
git add backend/ docs/postman/ CHANGELOG.md
git commit -m "feat(api): add admin category endpoints"
git push -u origin feature/be-categories
```

- Lời nhắn commit viết tiếng Anh, có scope `api`: `feat(api):` (thêm mới), `fix(api):` (sửa lỗi), `test(api):` (chỉ thêm test), `refactor(api):` (sửa code không đổi chức năng).
- Commit nhiều lần trong lúc làm cũng được.
- Trước khi `git add`, chạy `git status` xem có lọt file thừa không.

**Tạo PR trên GitHub:**

1. Mở trang repo trên GitHub, bấm **Compare & pull request**.
2. Chọn **base: `dev`** (không phải `master`).
3. Dán checklist ở mục 6, đánh dấu từng mục, ghi danh sách route và % độ phủ.
4. Tự xem lại tab **Files changed** một lượt.
5. **Reviewers**: PR của A chọn B, PR của B chọn A, PR của C chọn A hoặc B. PR có sửa `src/common/`, `src/infra/`, `database/migrations/` thì phải có A.
6. Người review góp ý thì sửa tiếp trên cùng nhánh, commit, push. Người review bấm **Approve** rồi mới **Merge pull request** và xóa nhánh.

**Trước khi tạo PR, cập nhật code mới nhất từ `dev`:**

```bash
git pull origin dev
```

Nếu báo **conflict**:

- `src/app.module.ts`: thường do nhiều người cùng thêm module vào `imports`. Giữ **tất cả** các dòng, xóa dấu `<<<<<<<`, `=======`, `>>>>>>>`.
- `src/common/errors.ts`, `src/common/utils/redis-keys.ts`: giống trên, giữ hết các dòng của hai bên.
- `docs/postman/blog-api.postman_collection.json`: **đừng sửa tay**. Lấy bản của `dev` (`git checkout --theirs docs/postman/blog-api.postman_collection.json`), import lại vào Postman, thêm lại folder của mình, export ghi đè rồi commit.
- `package-lock.json`: lấy bản của `dev` rồi chạy lại `npm install` trong `backend/`, commit file mới sinh ra.
- File khác: nhắn người viết đoạn code bị conflict, cùng xem rồi mới sửa.

---

## 8. Một số điều cần biết

- **Ngôn ngữ của request** lấy từ header `Accept-Language` (`vi`, `en`). Không gửi hoặc gửi mã không hoạt động thì dùng ngôn ngữ mặc định. Trên Swagger không có ô cho header này, thử ngôn ngữ khác thì dùng Postman.
- **Ngôn ngữ trong route và body** dùng mã (`vi`, `en`), không dùng `id`.
- **Ngày giờ** trả theo ISO 8601 UTC (`2026-09-01T01:00:00.000Z`).
- **Cache**: API public có cache Redis. Sửa dữ liệu thẳng trong database (bằng MySQL Workbench, DBeaver...) thì API vẫn trả dữ liệu cũ cho đến khi hết TTL. Xóa cache: `docker exec blog-redis redis-cli -n 0 FLUSHDB`.
- **Xem database**: kết nối bằng MySQL Workbench hoặc DBeaver tới `127.0.0.1:3306`, user `blog`, mật khẩu `blog`. Hoặc dùng `docker exec -it blog-mysql mysql -ublog -pblog blog_dev`.
- **Làm lại database từ đầu**: `npm run db:migrate:undo:all`, rồi `npm run db:migrate` và `npm run db:seed`.

---

## 9. Lỗi hay gặp

| Hiện tượng | Cách sửa |
| --- | --- |
| `docker` báo "cannot connect to the Docker daemon" hoặc "pipe ... not found" | Docker Desktop chưa mở hoặc chưa chạy xong. Mở lên, đợi "Engine running" |
| `docker compose up` báo "port is already allocated" (3306 hoặc 6379) | Máy đã cài sẵn MySQL/Redis. Tạo file `.env` ở **gốc repo** với `MYSQL_HOST_PORT=3307` và `REDIS_HOST_PORT=6380`, chạy lại `docker compose up -d`, rồi sửa `DB_PORT=3307`, `REDIS_PORT=6380` trong `backend/.env` |
| App báo `ECONNREFUSED 127.0.0.1:3306` hoặc `:6379` | Container chưa chạy hoặc chưa `healthy`. Chạy `docker compose ps` ở gốc repo |
| App dừng ngay, báo `"JWT_ACCESS_SECRET" is not allowed to be empty` (hoặc biến khác) | Chưa điền biến đó trong `backend/.env`. Secret phải dài tối thiểu 16 ký tự |
| `Table 'blog_dev.xxx' doesn't exist` | Chưa chạy `npm run db:migrate`, hoặc có migration mới sau khi pull |
| `Access denied for user 'blog'` hoặc thiếu database `blog_test` | Volume MySQL được tạo từ trước khi có file init. Chạy `docker compose down -v` rồi `docker compose up -d` (**xóa sạch dữ liệu** trong MySQL), sau đó migrate và seed lại |
| `npx jest` báo "Must use import to load ES Module" | Không gọi Jest trực tiếp, dùng `npm run test` / `npm run test:e2e` |
| e2e test báo timeout hoặc lỗi kết nối | Docker chưa chạy. E2e cần MySQL và Redis thật |
| Route mới không có trên Swagger | Chưa thêm module vào `imports` của `src/app.module.ts`, hoặc terminal `start:dev` đang báo lỗi biên dịch |
| Gọi route bị `401` dù đã Authorize | Access token hết hạn (15 phút), đăng nhập lại. Hoặc quên `@Public()` cho route public |
| Gọi route bị `403` | Sai role. Dùng tài khoản đúng role (sau khi seed, mật khẩu chung `Password123`) |
| Lỗi `400` với `property xxx should not exist` | Gửi field không có trong DTO. Thêm field vào DTO hoặc bỏ khỏi body |
| Sửa dữ liệu nhưng API vẫn trả cũ | Cache. Xem mục 8, và kiểm tra service đã gọi `cache.invalidate` sau khi ghi chưa |

---

## 10. Những điều không làm

- Không sửa `src/common/`, `src/infra/`, `database/migrations/` mà không báo A. PR có sửa những chỗ đó A phải duyệt.
- Không sửa migration đã merge. Cần đổi bảng thì hỏi A để tạo migration mới.
- Không truy vấn database trong controller.
- Không trả model thô hay `passwordHash` trong response.
- Không commit `.env`, mật khẩu, secret thật.
- Không sửa folder Postman của người khác.
- Không sửa gì trong `node_modules/`.
- Không commit thẳng vào `dev` hay `master`, luôn qua PR.

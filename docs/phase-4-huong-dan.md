# Hướng dẫn làm phase 4

File này hướng dẫn từng bước: cài máy, chạy backend và frontend cùng lúc, chuyển một màn HTML thành component Angular đến khi tạo PR. Quy định đầy đủ nằm ở [phase-4-frontend.md](phase-4-frontend.md). Khi file này và file đó nói khác nhau thì theo [phase-4-frontend.md](phase-4-frontend.md).

Các lệnh trong `frontend/` có từ khi A1 merge. A1 phải tạo đúng các script ở mục 3, bước 4.

---

## 1. Đọc trước (khoảng 45 phút)

1. [phase-4-frontend.md](phase-4-frontend.md): đọc mục 3 (khung Angular có những gì), mục 4 (danh sách màn, tìm dòng có tên mình), mục 5 (cách chuyển HTML sang Angular), mục 7 (quy ước code) và mục 8 (**việc của từng người và thứ tự làm**).
2. `frontend/README.md` mục "Có sẵn để dùng": service, component, pipe dùng lại được.
3. Hai màn mẫu, đọc code kèm comment. **Mọi màn còn lại làm theo cách của hai màn này:**
   - Màn mẫu form: `frontend/src/app/features/auth/login/` (validate, lỗi từ server, loading, chuyển trang sau khi xong).
   - Màn mẫu danh sách admin: `frontend/src/app/features/admin/posts/` (bảng, lọc trên URL, phân trang, xóa có xác nhận, toast).
4. File HTML phase 2 của màn mình làm, mở bằng Live Server, bấm qua mọi trạng thái trên thanh demo. Đây là "bản thiết kế" phải làm giống.
5. Swagger <http://localhost:3000/api-docs>: các route ở cột "API" của màn mình, xem response trả gì và lỗi nào có thể xảy ra.

---

## 2. Cài máy (làm 1 lần)

Như phase 3 ([phase-3-huong-dan.md](phase-3-huong-dan.md) mục 2), thêm:

| Cần cài | Kiểm tra đã có chưa |
| --- | --- |
| Angular CLI | `npm install -g @angular/cli`, rồi `ng version` |
| VS Code extension **Angular Language Service** | Gõ sai tên biến trong template thì có gạch đỏ |
| Chrome, Edge, Firefox bản mới nhất | Để kiểm tra trước khi tạo PR |

---

## 3. Lấy code và chạy

Phase 4 cần **backend chạy song song** với frontend.

**Bước 1. Lấy code mới nhất**

```bash
git checkout dev
git pull origin dev
```

**Bước 2. Bật MySQL, Redis và backend**

Làm như [phase-3-huong-dan.md](phase-3-huong-dan.md) mục 3, bước 2 - 4. Tóm tắt:

```bash
docker compose up -d          # ở gốc repo
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev             # để nguyên terminal này
```

Kiểm tra <http://localhost:3000/api-docs> mở được.

**Bước 3. Cài và chạy frontend** (terminal thứ hai)

```bash
cd frontend
npm install
npm start
```

Mở <http://localhost:4200>. Trang chủ có bài viết là backend và proxy đã nối đúng.

`npm start` chạy `ng serve --proxy-config proxy.conf.json`: mọi request tới `/api` và `/uploads` được chuyển sang `http://localhost:3000`. Không gọi thẳng `http://localhost:3000` trong code.

**Bước 4. Các lệnh dùng thường xuyên** (trong `frontend/`)

| Lệnh | Làm gì |
| --- | --- |
| `npm start` | Chạy dev, lưu file thì trình duyệt tự tải lại |
| `npm run lint` | ESLint + Prettier, tự sửa |
| `npm run test` | Unit test |
| `npm run build` | Build production, báo lỗi template và vượt budget |
| `npm run i18n:check` | Báo key dịch thiếu (mục 5, bước 5) |

**Tài khoản thử** (sau khi seed, mật khẩu chung `Password123`, danh sách ở `backend/README.md`): 1 Super Admin, 2 Blog Owner, 1 User đăng nhập bằng Github. Thử quyền User thì tự đăng ký một tài khoản mới.

**Hằng ngày**: mở Docker Desktop → `git pull origin dev` → `npm install` trong `backend/` và `frontend/` nếu có người thêm thư viện → `npm run db:migrate` nếu có migration mới → `npm run start:dev` (backend) và `npm start` (frontend).

---

## 4. Thứ tự làm

Việc của A, B và C nằm ở [phase-4-frontend.md](phase-4-frontend.md) mục 8.3, bảng thứ tự theo đợt ở mục 8.2. Mỗi dòng là **một nhánh và một PR riêng**.

Việc có ghi ở cột "Chờ" thì đợi việc đó merge vào `dev` rồi mới bắt đầu (nhớ `git pull origin dev`). Chưa có thì làm trước việc tiếp theo không phải chờ.

Phần nền có sẵn trong `core/`, `shared/`, `layouts/`, `src/styles/` (gọi API, token, guard, ngôn ngữ, phân trang, hộp xác nhận, toast...) cứ dùng lại, **không viết lại**. Cần sửa phần nền thì báo A trước, PR đó A phải duyệt.

---

## 5. Quy trình làm một màn

Ví dụ B làm B3, quản lý danh mục (`/admin/categories`, UC15). Màn khác làm tương tự.

**Bước 1. Tạo nhánh mới từ `dev` mới nhất**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/fe-admin-categories
```

Tên nhánh: `feature/fe-<phần>`.

**Bước 2. Đọc yêu cầu của màn**

- [phase-4-frontend.md](phase-4-frontend.md) mục 4: dòng của màn (route, API, ghi chú).
- [requirements.md](requirements.md): use case tương ứng (UC15), đọc kỹ ràng buộc. Mỗi ràng buộc phải có validator hoặc xử lý lỗi tương ứng.
- `html/admin/categories.html`: liệt kê các khối `<!-- component: ... -->` và các trạng thái trên thanh demo. Ghi lại thành danh sách, xong màn thì đi lại danh sách này.
- Swagger: response của `GET /admin/categories`, body của `POST`, các mã lỗi.

**Bước 3. Tạo file theo màn mẫu**

```text
src/app/features/admin/categories/
├── categories.routes.ts
├── categories-page.component.ts      # + .html, copy từ màn mẫu admin/posts
├── category-form-modal.component.ts  # + .html
├── admin-categories.service.ts
└── admin-categories.models.ts
```

Thêm route vào `src/app/app.routes.ts`, trong nhóm `/admin` có `roleGuard` đúng role:

```ts
{
  path: 'categories',
  canActivate: [roleGuard],
  data: { roles: ['super_admin'] },
  loadChildren: () => import('./features/admin/categories/categories.routes'),
},
```

**Bước 4. Viết model và service**

- Model: chép tên field đúng như response trong Swagger, camelCase.
- Service chỉ gọi API và unwrap, không giữ trạng thái giao diện:

```ts
@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly http = inject(HttpClient);

  list(query: CategoryQuery): Observable<Paginated<AdminCategory>> {
    return this.http.get<ApiResponse<AdminCategory[]>>('/admin/categories', { params: toParams(query) }).pipe(unwrapPage());
  }

  create(body: SaveCategory): Observable<AdminCategory> {
    return this.http.post<ApiResponse<AdminCategory>>('/admin/categories', body).pipe(unwrap());
  }
}
```

Không thêm `/api/v1`, `Authorization`, `Accept-Language`: interceptor đã làm.

**Bước 5. Chép markup và gắn dịch**

1. Chép HTML của từng khối từ `html/admin/categories.html` vào template. Bỏ thanh demo, mọi `data-demo*`, dữ liệu giả.
2. Đổi theo bảng ở [phase-4-frontend.md](phase-4-frontend.md) mục 5: `data-i18n` → pipe `translate`, danh sách → `@for`, trạng thái → `@if`, `data-bs-toggle` → directive của ng-bootstrap, link → `routerLink`.
3. Khối đã có trong `shared/` (phân trang, trạng thái rỗng, hộp xác nhận) thì dùng component, không chép markup.
4. Key dịch mới: thêm vào cả `public/i18n/vi.json` và `en.json`, rồi chạy:

   ```bash
   npm run i18n:check
   ```

**Bước 6. Nối dữ liệu và trạng thái**

Copy cách làm của màn mẫu. Màn danh sách thường có:

```ts
readonly loading = signal(true);
readonly items = signal<AdminCategory[]>([]);
readonly meta = signal<PageMeta | null>(null);
```

- Bộ lọc và `page` đọc từ query string, đổi bộ lọc thì `router.navigate([], { queryParams, queryParamsHandling: 'merge' })`.
- Xóa: `confirm.open({ ..., action: () => this.service.remove(id) })`. Lỗi `CATEGORY_IN_USE` thì báo `error.category_in_use`.
- Thành công: `toast.success('admin.categories.saved')`.

**Bước 7. Form**

Copy cách làm của màn đăng nhập:

- Validator giống ràng buộc của DTO backend (độ dài, bắt buộc). Câu lỗi lấy từ `validation.*`, cùng câu với `invalid-feedback` của phase 2.
- Gửi bị 400 thì `setServerErrors(form, err)`: lỗi `names.vi` tự hiện dưới ô tên tiếng Việt.
- Nút gửi dùng `submit-button` với `loading`.

**Bước 8. Kiểm tra trên trình duyệt**

Đi lại danh sách trạng thái ở bước 2, theo [phase-4-frontend.md](phase-4-frontend.md) mục 6.2:

- Mọi trạng thái xuất hiện được bằng thao tác thật. Loading: DevTools → Network → "Slow 4G". Lỗi mạng: "Offline".
- 360px và desktop (DevTools → Device Toolbar), sáng và tối, `vi` và `en`.
- Đăng nhập bằng tài khoản không phải Super Admin rồi mở `/admin/categories`: phải ra 403.
- Console không có lỗi.
- Đặt cạnh file HTML phase 2: cùng bố cục, cùng câu chữ.

**Bước 9. Tự kiểm tra theo checklist ở mục 6**

**Bước 10. Commit, push, tạo PR**: xem mục 7.

---

## 6. Checklist trước khi tạo PR

Copy danh sách này vào mô tả PR và đánh dấu từng mục.

```markdown
- [ ] Đủ màn và route của mình ở phase-4-frontend.md mục 4, đúng guard và role
- [ ] Mọi trạng thái bắt buộc của màn phase 2 xuất hiện được bằng thao tác thật
- [ ] Giao diện khớp file HTML phase 2 (bố cục, class, câu chữ); không còn data-demo hay dữ liệu giả
- [ ] Không có chữ tĩnh viết thẳng trong template; npm run i18n:check qua; đã xem bằng cả vi và en
- [ ] Đổi ngôn ngữ thì dữ liệu của màn tự tải lại (nếu màn có dữ liệu theo ngôn ngữ)
- [ ] Form: validator giống DTO backend, lỗi server hiện đúng ô, nút có loading, không gửi hai lần
- [ ] Lỗi API hiện câu theo ngôn ngữ đang chọn (key error.*), 403 / 404 hiện đúng màn
- [ ] Gọi HttpClient chỉ trong service; component OnPush; subscribe có hủy
- [ ] Không dùng bypassSecurityTrust*, không innerHTML cho bình luận hay dữ liệu người dùng nhập
- [ ] Đã xem ở 360px và desktop, sáng và tối; console không có lỗi
- [ ] npm run lint, npm run test, npm run build qua hết
- [ ] Không commit .env, dist/, .angular/, node_modules/
- [ ] Đã thêm dòng vào CHANGELOG.md (mục [Unreleased])
```

Mô tả PR ghi thêm danh sách route đã làm và đính kèm ảnh chụp 360px và desktop, cả sáng lẫn tối.

---

## 7. Commit, push và tạo PR

```bash
cd frontend
npm run lint
npm run test
npm run build
npm run i18n:check
cd ..
git status
git add frontend/ CHANGELOG.md
git commit -m "feat(web): add category admin page"
git push -u origin feature/fe-admin-categories
```

- Lời nhắn commit viết tiếng Anh, scope `web`: `feat(web):`, `fix(web):`, `test(web):`, `refactor(web):`, `style(web):` (chỉ đổi SCSS).
- Sửa cả `html/` (cùng câu, cùng markup) thì `git add` cả `html/` và chạy `npm run build`, `npm run i18n:check` trong `html/`.
- Trước khi `git add`, xem `git status` để không lọt `dist/`, `.angular/`, `.env`.

**Tạo PR trên GitHub**: như [phase-3-huong-dan.md](phase-3-huong-dan.md) mục 7. Base `dev`. PR có sửa `core/`, `shared/`, `layouts/`, `src/styles/abstracts|themes|layouts` thì phải có A duyệt và ghi rõ trong mô tả.

**Conflict hay gặp:**

- `src/app/app.routes.ts`: nhiều người cùng thêm route. Giữ **tất cả** các dòng.
- `public/i18n/vi.json`, `en.json`: giữ key của cả hai bên, kiểm tra dấu phẩy, rồi chạy `npm run i18n:check`.
- `package-lock.json`: lấy bản của `dev` rồi chạy lại `npm install` trong `frontend/`.
- File khác: nhắn người viết đoạn code bị conflict, cùng xem rồi mới sửa.

---

## 8. Một số điều cần biết

- **Ngôn ngữ đang chọn** nằm ở `localStorage` key `lang`. Xóa key này (DevTools → Application → Local Storage) để thử lại lần truy cập đầu tiên.
- **Ảnh từ API** là đường dẫn `uploads/...`, hiện bằng pipe `uploadUrl`. Ảnh không lên thì kiểm tra `proxy.conf.json` có `/uploads` và backend đang chạy.
- **Thử token hết hạn**: đặt `JWT_ACCESS_TTL=1m` trong `backend/.env` trên máy mình (không commit), khởi động lại backend. Sau 1 phút thao tác bình thường phải không bị đăng xuất; tab Network sẽ thấy một request `refresh`.
- **Cache backend**: API public có cache Redis tới 5-10 phút. Sửa dữ liệu bằng màn admin thì cache tự xóa; sửa thẳng trong database thì xóa tay: `docker exec blog-redis redis-cli -n 0 FLUSHDB`.
- **Đăng nhập Google/Github ở local**: cần các biến `GOOGLE_*`, `GITHUB_*` trong `backend/.env`. Người không làm UC20 thì đăng nhập bằng mật khẩu.
- **Email quên mật khẩu**: xem ở mục Messages của tài khoản Ethereal trong `backend/.env`. Link trong email trỏ về `http://localhost:4200/reset-password?token=...`.
- **Làm lại dữ liệu mẫu**: trong `backend/`, `npm run db:seed:undo` rồi `npm run db:seed`.

---

## 9. Lỗi hay gặp

| Hiện tượng | Cách sửa |
| --- | --- |
| Mọi request `/api/...` trả 504 hoặc `ECONNREFUSED` trong terminal `npm start` | Backend chưa chạy. Chạy `npm run start:dev` trong `backend/` |
| Request trả về `index.html` thay vì JSON | Chạy `ng serve` thiếu `--proxy-config`. Dùng `npm start` |
| Lỗi CORS trong console | Code đang gọi thẳng `http://localhost:3000`. Gọi đường dẫn tương đối, để proxy chuyển |
| Chữ hiện ra là key (`admin.categories.add`) | Key chưa có trong `public/i18n/vi.json`, hoặc sai tên. Chạy `npm run i18n:check` |
| Đổi ngôn ngữ mà danh sách không đổi | Màn không theo dõi `language.current`. Xem cách làm của trang chủ hoặc màn mẫu |
| Bị đưa về `/login` liên tục | Refresh token đã bị thu hồi (đổi mật khẩu, bị khóa, seed lại database). Xóa `localStorage` rồi đăng nhập lại |
| `NG8001: 'app-xxx' is not a known element` | Chưa thêm component vào `imports` của component đang dùng nó |
| `NG0100: ExpressionChangedAfterItHasBeenCheckedError` | Đổi giá trị signal trong lúc render. Đổi trong handler sự kiện hoặc `effect`, không đổi trong getter dùng ở template |
| Dropdown, modal không mở | Còn `data-bs-toggle` chép từ phase 2. Đổi sang directive của ng-bootstrap |
| Màu sai ở chế độ tối | Viết mã màu thẳng trong SCSS của component. Dùng `var(--bl-...)` |
| `npm run build` báo vượt budget | Import cả thư viện lớn vào màn nạp sẵn. Đặt màn đó trong route nạp lười, hoặc hỏi A |
| Gọi API bị `403` dù đúng tài khoản | Role trong access token cũ (vừa được đổi role). Đăng xuất, đăng nhập lại |

---

## 10. Những điều không làm

- Không sửa `core/`, `shared/`, `layouts/`, `src/styles/abstracts|themes|layouts` mà không báo A. PR có sửa những chỗ đó A phải duyệt.
- Không gọi `HttpClient` trong component, không gọi thẳng địa chỉ backend.
- Không viết chữ tĩnh thẳng trong template hay TypeScript.
- Không dùng `bypassSecurityTrust*`; không hiện bình luận, tên người dùng bằng `innerHTML`.
- Không lưu thêm gì vào `localStorage` ngoài 4 key ở phase-4-frontend.md mục 7.2.
- Không nạp `bootstrap.bundle.js`, jQuery hay chép `html/js/*.js` sang Angular.
- Không sửa backend để làm cho màn chạy được. Thiếu API hoặc API trả khác tài liệu thì báo người làm module backend đó.
- Không sửa gì trong `node_modules/`. Không commit thẳng vào `dev` hay `master`, luôn qua PR.

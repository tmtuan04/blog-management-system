# Tài liệu đặc tả yêu cầu - Blog Management System

| Mục | Nội dung |
| --- | --- |
| Phiên bản | 1.0 (Sprint 1 - Ngày 1) |
| Ngày tạo | 01/10/2026 |
| Thời gian thực hiện | 8 tuần (8 sprint, mỗi sprint 1 tuần) |
| Nhân sự | 1 người (full-stack) |

---

## 1. Giới thiệu

### 1.1. Mục đích

Xây dựng hệ thống Blog đa ngôn ngữ, gồm trang đọc blog cho người dùng và trang quản trị cho chủ blog và quản trị viên. Dự án thực hiện theo quy trình Agile/Scrum, đi từ phân tích yêu cầu, thiết kế CSDL, dựng giao diện HTML tĩnh, code backend rồi đến frontend.

### 1.2. Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Backend | NodeJS, ExpressJS, Sequelize, kiến trúc Monolith chia module theo HMVC |
| Frontend | Angular (chia theo module), Bootstrap 5, SCSS |
| Cơ sở dữ liệu | MySQL 8 (utf8mb4) |
| Cache / token store | Redis |
| Thiết kế CSDL | dbdiagram.io |
| Kiểm thử API | Postman, Jest, Supertest |
| Tài liệu API | Swagger (OpenAPI 3) |
| Môi trường chạy | Docker Compose (MySQL, Redis) |

### 1.3. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Post | Một bài viết blog, mỗi post thuộc đúng một ngôn ngữ |
| Category | Danh mục bài viết, dùng chung cho mọi ngôn ngữ, tên được dịch theo từng ngôn ngữ |
| Language | Ngôn ngữ do Super Admin quản lý (ví dụ `vi`, `en`) |
| UI translation | Bản dịch chữ tĩnh trên giao diện (menu, nút bấm, footer...) |
| Page | Trang nội dung tĩnh (About...), có nội dung riêng cho từng ngôn ngữ |
| Slug | Chuỗi định danh trên URL, sinh từ tiêu đề, ví dụ `huong-dan-angular` |
| Access token | JWT ngắn hạn dùng để gọi API |
| Refresh token | Token dài hạn dùng để xin access token mới, lưu trong Redis |

---

## 2. Tác nhân (Actors)

| Actor | Mô tả | Kế thừa |
| --- | --- | --- |
| Guest | Khách vãng lai, chưa đăng nhập | - |
| Authenticated User | Người dùng đã đăng nhập, là người đọc blog, không viết bài | Guest (trừ đăng ký/đăng nhập) |
| Blog Owner | Người viết và quản lý bài viết của chính mình | Authenticated User |
| Super Admin | Quản trị toàn hệ thống | Blog Owner |

Trong CSDL, mỗi tài khoản có đúng một role: `user`, `blog_owner` hoặc `super_admin`. Guest là người chưa có phiên đăng nhập nên không có role.

---

## 3. Danh sách use case

Mức độ ưu tiên theo MoSCoW: **Must** (bắt buộc), **Should** (nên có), **Could** (làm nếu còn thời gian).

| Mã | Use case | Actor | Ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- |
| UC01 | Đăng ký (Register) | Guest | Must | |
| UC02 | Đăng nhập (Login) | Guest | Must | |
| UC03 | Khôi phục mật khẩu (Recover password) | Guest | Must | |
| UC04 | Đăng xuất (Logout) | Authenticated User | Must | Bổ sung, đề bài không ghi |
| UC05 | Xem danh sách bài viết (trang chủ) | Guest, Authenticated User | Must | Bổ sung, đề bài không ghi |
| UC06 | Xem chi tiết bài viết (View post detail) | Guest, Authenticated User | Must | |
| UC07 | Xem bài viết theo danh mục (View posts by category) | Guest, Authenticated User | Must | |
| UC08 | Bình luận (Comment) | Authenticated User | Must | |
| UC09 | Đổi ngôn ngữ (Change blog language) | Guest, Authenticated User | Must | |
| UC10 | Đổi giao diện sáng/tối (Change theme) | Guest, Authenticated User | Should | Mở rộng |
| UC11 | Xem trang tĩnh (About) | Guest, Authenticated User | Must | |
| UC12 | Quản lý hồ sơ cá nhân | Authenticated User | Should | Bổ sung, đề bài không ghi |
| UC13 | Quản lý bài viết (Manage posts) | Blog Owner | Must | Thêm, sửa, xóa, xem danh sách |
| UC14 | Quản lý người dùng (Manage users) | Super Admin | Must | |
| UC15 | Quản lý danh mục (Manage categories) | Super Admin | Must | |
| UC16 | Quản lý ngôn ngữ (Manage languages) | Super Admin | Must | |
| UC17 | Quản lý bản dịch giao diện (Manage UI translations) | Super Admin | Must | Cần để đổi được menu và chữ tĩnh theo ngôn ngữ |
| UC18 | Quản lý trang tĩnh (Manage pages) | Super Admin | Must | Cần để đổi được trang About theo ngôn ngữ |
| UC19 | Tìm kiếm toàn văn (Full text search) | Guest, Authenticated User | Should | Mở rộng |
| UC20 | Đăng nhập bằng OAuth (Google, Github, Facebook) | Guest | Should | Mở rộng, làm Google và Github trước |

---

## 4. Yêu cầu chức năng chi tiết

### 4.1. Xác thực (Auth)

**UC01 - Đăng ký**

- Dữ liệu nhập: họ tên, email, mật khẩu, xác nhận mật khẩu.
- Ràng buộc:
  - Email đúng định dạng và chưa tồn tại trong hệ thống.
  - Họ tên từ 2 đến 150 ký tự.
  - Mật khẩu ít nhất 8 ký tự, có cả chữ và số. Xác nhận mật khẩu phải trùng khớp.
- Tài khoản mới có role `user` và trạng thái hoạt động.
- Đăng ký thành công thì chuyển sang trang đăng nhập và hiện thông báo thành công.

**UC02 - Đăng nhập**

- Dữ liệu nhập: email, mật khẩu.
- Thành công: trả về access token (hạn 15 phút) và refresh token (hạn 7 ngày, lưu trong Redis).
- Sai email hoặc mật khẩu: hiện chung một thông báo "Email hoặc mật khẩu không đúng", không cho biết sai phần nào.
- Tài khoản bị khóa (`is_active = false`): không cho đăng nhập, hiện thông báo tài khoản đã bị khóa.
- Giới hạn tối đa 5 lần đăng nhập sai trong 15 phút cho mỗi IP và email (rate limit bằng Redis).
- Khi access token hết hạn, frontend tự gọi API refresh. Nếu refresh token cũng hết hạn thì đưa người dùng về trang đăng nhập.

**UC03 - Khôi phục mật khẩu**

1. Người dùng nhập email tại trang "Quên mật khẩu".
2. Hệ thống luôn hiện cùng một thông báo "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn", để không lộ email nào đã đăng ký.
3. Nếu email tồn tại, hệ thống gửi email chứa link đặt lại mật khẩu. Token trong link hết hạn sau 15 phút, chỉ dùng được 1 lần và được lưu trong Redis.
4. Người dùng mở link, nhập mật khẩu mới theo đúng ràng buộc của UC01.
5. Đặt lại thành công thì thu hồi toàn bộ refresh token của tài khoản đó (đăng xuất mọi thiết bị).

**UC04 - Đăng xuất**

- Xóa refresh token hiện tại khỏi Redis và xóa token đang lưu ở frontend.

**UC20 - Đăng nhập OAuth**

- Provider: Google và Github (bắt buộc trong phần mở rộng), Facebook (làm nếu còn thời gian).
- Nếu email từ provider trả về đã tồn tại: liên kết vào tài khoản đó và đăng nhập.
- Nếu chưa tồn tại: tạo tài khoản mới với role `user`, mật khẩu để trống (`password_hash = NULL`).
- Tài khoản tạo qua OAuth muốn đăng nhập bằng mật khẩu thì dùng chức năng Khôi phục mật khẩu để tạo mật khẩu.
- Provider không trả về email: báo lỗi và yêu cầu dùng cách đăng nhập khác.

### 4.2. Trang đọc blog (Public)

**UC05 - Danh sách bài viết (trang chủ)**

- Chỉ hiện bài có trạng thái `published` và thuộc ngôn ngữ đang chọn.
- Sắp xếp theo ngày đăng mới nhất, phân trang 10 bài mỗi trang.
- Mỗi bài hiện: ảnh thumbnail, tiêu đề, tóm tắt, tên danh mục (theo ngôn ngữ đang chọn), tác giả, ngày đăng, lượt xem.

**UC06 - Chi tiết bài viết**

- Truy cập qua URL `/posts/:slug`.
- Hiện đầy đủ nội dung, tác giả, danh mục, ngày đăng, lượt xem, danh sách bình luận và một vài bài cùng danh mục.
- Mỗi lần xem thì tăng lượt xem lên 1 (mỗi IP chỉ tính 1 lần trong 1 giờ, kiểm tra bằng Redis).
- Bài không tồn tại, chưa đăng, hoặc không thuộc ngôn ngữ đang chọn: hiện trang 404.

**UC07 - Bài viết theo danh mục**

- Truy cập qua URL `/categories/:slug`, slug là slug của danh mục theo ngôn ngữ đang chọn.
- Danh sách bài viết hiển thị và phân trang giống UC05.
- Thanh điều hướng hoặc sidebar hiện danh sách danh mục kèm số lượng bài.

**UC08 - Bình luận**

- Phải đăng nhập mới được bình luận. Guest chỉ xem được bình luận và thấy nút "Đăng nhập để bình luận".
- Nội dung từ 1 đến 1000 ký tự, chỉ là văn bản thuần (không nhận HTML).
- Cho phép trả lời bình luận, tối đa 1 cấp (không trả lời một bình luận trả lời).
- Bình luận hiện ngay, không cần duyệt.
- Quyền xóa:
  - Người viết bình luận xóa được bình luận của mình.
  - Blog Owner xóa được mọi bình luận trên bài của mình.
  - Super Admin xóa được mọi bình luận.
  - Xóa bình luận cha thì xóa luôn các bình luận trả lời.

**UC09 - Đổi ngôn ngữ**

- Bộ chọn ngôn ngữ trên header chỉ hiện các ngôn ngữ đang hoạt động.
- Khi đổi ngôn ngữ, toàn bộ nội dung sau phải đổi theo:
  - Danh sách bài viết: chỉ còn bài của ngôn ngữ mới.
  - Tên danh mục.
  - Menu, nút bấm, footer và mọi chữ tĩnh khác (UI translations).
  - Nội dung trang About.
- Nếu đang ở trang chi tiết bài viết hoặc trang danh mục khi đổi ngôn ngữ thì chuyển về trang chủ, vì bài viết của các ngôn ngữ là độc lập với nhau.
- Lựa chọn được lưu ở `localStorage`, tải lại trang vẫn giữ nguyên.
- Lần truy cập đầu tiên: dùng ngôn ngữ của trình duyệt nếu hệ thống có hỗ trợ, nếu không thì dùng ngôn ngữ mặc định.
- Frontend gửi ngôn ngữ đang chọn qua header `Accept-Language` trong mọi request.

**UC10 - Đổi giao diện sáng/tối**

- Có nút chuyển Light/Dark trên header, áp dụng cho cả trang public lẫn trang quản trị.
- Lựa chọn được lưu ở `localStorage`. Lần đầu truy cập thì theo cài đặt hệ điều hành (`prefers-color-scheme`).

**UC11 - Trang tĩnh (About)**

- Hiện nội dung trang theo ngôn ngữ đang chọn.
- Nếu trang chưa có bản dịch cho ngôn ngữ đó thì hiện bản của ngôn ngữ mặc định.

**UC19 - Tìm kiếm toàn văn**

- Ô tìm kiếm trên header, chuyển sang trang `/search?q=...`.
- Tìm trong tiêu đề, tóm tắt và nội dung bài viết, chỉ trong các bài `published` thuộc ngôn ngữ đang chọn.
- Dùng MySQL FULLTEXT index với parser `ngram` để tìm được tiếng Việt có dấu.
- Từ khóa từ 2 đến 100 ký tự. Kết quả sắp xếp theo độ liên quan và có phân trang.

**UC12 - Hồ sơ cá nhân**

- Xem và sửa họ tên, ảnh đại diện (jpg, png, webp, tối đa 2MB).
- Đổi mật khẩu: phải nhập đúng mật khẩu cũ. Tài khoản OAuth chưa có mật khẩu thì không cần nhập mật khẩu cũ.
- Không cho tự đổi email và role.

### 4.3. Blog Owner

**UC13 - Quản lý bài viết**

- **Danh sách**: chỉ hiện bài của chính mình. Có lọc theo trạng thái, ngôn ngữ, danh mục, tìm theo tiêu đề, có phân trang.
- **Thêm bài**, các trường:

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| Tiêu đề | Có | 5 đến 255 ký tự |
| Ngôn ngữ | Có | Ngôn ngữ đang hoạt động |
| Danh mục | Có | Danh mục đang tồn tại |
| Tóm tắt | Không | Tối đa 500 ký tự |
| Nội dung | Có | Rich text (HTML), backend lọc bỏ thẻ và thuộc tính nguy hiểm để chống XSS |
| Ảnh thumbnail | Không | jpg, png, webp, tối đa 2MB |
| Trạng thái | Có | `draft`, `published` hoặc `archived` |

- **Slug**: tự sinh từ tiêu đề (bỏ dấu tiếng Việt) và là duy nhất trong cùng một ngôn ngữ. Nếu trùng thì thêm hậu tố `-2`, `-3`...
- **Ngày đăng** (`published_at`): ghi lại vào lần đầu tiên bài chuyển sang `published`.
- **Sửa bài**: chỉ sửa được bài của mình. Vào trang sửa bài của người khác thì trả lỗi 403.
- **Xóa bài**: chỉ xóa được bài của mình, phải xác nhận trước khi xóa. Xóa bài thì xóa luôn bình luận và ảnh thumbnail.

### 4.4. Super Admin

**UC14 - Quản lý người dùng**

- Danh sách người dùng: tìm theo tên hoặc email, lọc theo role và trạng thái, có phân trang.
- Tạo tài khoản mới và chọn role.
- Đổi role: `user`, `blog_owner` hoặc `super_admin`.
- Khóa và mở khóa tài khoản. Khóa tài khoản thì thu hồi luôn refresh token của tài khoản đó.
- Không xóa cứng người dùng, chỉ khóa, để giữ lại bài viết và bình luận cũ.
- Không được tự khóa hoặc tự hạ quyền chính mình. Hệ thống luôn phải còn ít nhất 1 Super Admin đang hoạt động.

**UC15 - Quản lý danh mục**

- Thêm, sửa, xóa, xem danh sách danh mục.
- Mỗi danh mục nhập tên cho từng ngôn ngữ. Tên của ngôn ngữ mặc định là bắt buộc, các ngôn ngữ khác có thể để trống.
- Slug tự sinh từ tên và là duy nhất trong cùng một ngôn ngữ.
- Không xóa được danh mục đang có bài viết.
- Ngôn ngữ nào chưa có tên thì hiện tên theo ngôn ngữ mặc định.

**UC16 - Quản lý ngôn ngữ**

- Thêm, sửa, xóa, xem danh sách ngôn ngữ. Các trường: mã (`vi`, `en`..., theo chuẩn ISO 639-1, duy nhất), tên hiển thị, trạng thái hoạt động.
- Hệ thống luôn có đúng 1 ngôn ngữ mặc định. Chọn ngôn ngữ khác làm mặc định thì ngôn ngữ cũ tự bỏ mặc định.
- Không được xóa hoặc tắt ngôn ngữ mặc định.
- Không xóa được ngôn ngữ đang có bài viết, chỉ được tắt. Ngôn ngữ đã tắt sẽ ẩn khỏi bộ chọn ngôn ngữ và các bài của ngôn ngữ đó không hiện ra ngoài trang public.
- Khi thêm ngôn ngữ mới, hệ thống sao chép toàn bộ key UI translation từ ngôn ngữ mặc định sang (giữ nguyên giá trị để admin dịch dần).

**UC17 - Quản lý bản dịch giao diện**

- Hiện dạng bảng: mỗi dòng là một key (ví dụ `menu.home`), mỗi cột là một ngôn ngữ.
- Thêm key mới, sửa giá trị, xóa key (xóa ở mọi ngôn ngữ).
- Tìm theo key hoặc theo giá trị.
- Ngôn ngữ nào thiếu giá trị của một key thì frontend hiện giá trị của ngôn ngữ mặc định.

**UC18 - Quản lý trang tĩnh**

- Danh sách trang (About...), mỗi trang có một key cố định.
- Sửa tiêu đề và nội dung (rich text) cho từng ngôn ngữ.

---

## 5. Ma trận phân quyền

| Chức năng | Guest | User | Blog Owner | Super Admin |
| --- | --- | --- | --- | --- |
| Đăng ký, đăng nhập, quên mật khẩu, OAuth | X | | | |
| Xem danh sách, chi tiết, danh mục, About, tìm kiếm | X | X | X | X |
| Đổi ngôn ngữ, đổi theme | X | X | X | X |
| Bình luận | | X | X | X |
| Xóa bình luận của mình | | X | X | X |
| Xóa bình luận trên bài của mình | | | X | X |
| Xóa mọi bình luận | | | | X |
| Hồ sơ cá nhân, đăng xuất | | X | X | X |
| Quản lý bài viết của mình | | | X | X |
| Quản lý người dùng, danh mục, ngôn ngữ, bản dịch, trang tĩnh | | | | X |

Super Admin cũng có quyền viết bài, vì Super Admin kế thừa mọi quyền của Blog Owner.

---

## 6. Yêu cầu phi chức năng

### 6.1. Bảo mật

- Mật khẩu băm bằng bcrypt (cost 10).
- Xác thực bằng JWT (access token 15 phút). Refresh token 7 ngày lưu trong Redis để thu hồi được.
- Validate mọi dữ liệu đầu vào ở backend bằng `express-validator`, và ở frontend bằng Angular Validators.
- Lọc HTML nội dung bài viết và trang tĩnh để chống XSS.
- Upload file: kiểm tra cả đuôi file lẫn MIME type, giới hạn dung lượng, đổi tên file ngẫu nhiên khi lưu.
- Dùng `helmet`, cấu hình CORS chỉ cho phép domain của frontend, rate limit API đăng nhập và quên mật khẩu.
- Không commit file `.env` và các secret lên Git.

### 6.2. Hiệu năng

- API danh sách bài viết và danh mục được cache bằng Redis. Cache bị xóa khi dữ liệu liên quan thay đổi.
- API danh sách trả về trong dưới 500ms với khoảng 10.000 bài viết.
- Mọi API danh sách đều có phân trang, tối đa 50 bản ghi mỗi trang.

### 6.3. Giao diện

- Responsive trên mobile (từ 360px), tablet và desktop.
- Hỗ trợ bản mới nhất của Chrome, Edge và Firefox.
- Mọi form đều hiện lỗi validate ngay cạnh trường nhập. Có trạng thái loading và thông báo thành công/lỗi.

### 6.4. Chuẩn API

- RESTful, prefix `/api/v1`.
- Mọi response dùng chung một format:

```json
{
  "success": true,
  "message": "Lấy danh sách bài viết thành công",
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 125, "totalPages": 13 }
}
```

- Response lỗi:

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [{ "field": "email", "message": "Email đã tồn tại" }]
}
```

- Mã HTTP: `200`, `201`, `400` (validate), `401` (chưa đăng nhập), `403` (không có quyền), `404`, `409` (trùng dữ liệu), `429` (vượt rate limit), `500`.
- Toàn bộ API có tài liệu Swagger tại `/api-docs` và có Postman collection trong thư mục `docs/`.

### 6.5. Chất lượng code và kiểm thử

- Backend chia theo module (HMVC). Mỗi module tự chứa routes, controller, service, validator, model và test.
- Sequelize cấu hình 2 môi trường `development` và `test`, dùng 2 database riêng. Thay đổi schema chỉ qua migration.
- Unit test và integration test bằng Jest + Supertest, độ phủ tối thiểu 70% ở tầng service.
- Dùng ESLint và Prettier cho cả backend và frontend.
- Git: nhánh `main` luôn chạy được, mỗi task làm trên nhánh `feature/*`, commit theo Conventional Commits.

### 6.6. Dữ liệu

- CSDL dùng `utf8mb4` / `utf8mb4_unicode_ci` để lưu đúng tiếng Việt và emoji.
- Có seeder dữ liệu mẫu: 1 Super Admin, 2 Blog Owner, 2 ngôn ngữ (`vi` mặc định, `en`), 5 danh mục, khoảng 30 bài viết, các UI translation cơ bản và trang About.

---

## 7. Các quyết định cho những điểm đề bài chưa rõ

| # | Vấn đề | Quyết định | Lý do |
| --- | --- | --- | --- |
| D1 | Blog Owner là role riêng hay user tự viết bài? | Role riêng `blog_owner`, do Super Admin cấp | Đúng theo use case của đề: User chỉ đọc, Owner mới viết |
| D2 | Guest có được đọc bài không? | Có. Guest đọc được, chỉ bình luận mới cần đăng nhập | Blog công khai thì hợp lý hơn. Đề chỉ ghi các chức năng của User mà không cấm Guest đọc |
| D3 | Bài tiếng Việt và tiếng Anh có liên kết với nhau không? | Không. Mỗi post độc lập và thuộc một ngôn ngữ | Đúng theo mục "Chú ý" của đề: đổi ngôn ngữ thì đọc các blog của ngôn ngữ đó |
| D4 | Danh mục có tách riêng theo ngôn ngữ không? | Dùng chung, chỉ dịch tên | Tránh trùng lặp, admin quản lý dễ hơn |
| D5 | Chữ tĩnh (menu, nút) lưu ở đâu? | Lưu trong CSDL (bảng `ui_translations`), frontend tải qua API | Admin thêm ngôn ngữ mới mà không cần sửa code hay build lại frontend |
| D6 | Bình luận có cần duyệt không? | Không, hiện ngay. Owner và Admin có quyền xóa | Đơn giản, phù hợp quy mô dự án |
| D7 | Bình luận có trả lời lồng nhau không? | Có, tối đa 1 cấp | Cân bằng giữa trải nghiệm và độ phức tạp |
| D8 | Có xóa người dùng không? | Không xóa cứng, chỉ khóa tài khoản | Giữ toàn vẹn dữ liệu bài viết và bình luận |
| D9 | Có xác thực email khi đăng ký không? | Không (đưa ra ngoài phạm vi) | Giảm khối lượng. Đã có gửi email ở chức năng khôi phục mật khẩu |
| D10 | Mỗi Owner có nhiều blog không? | Không. Owner quản lý danh sách bài viết của mình, không có khái niệm "blog" riêng | Đề chỉ yêu cầu quản lý bài đăng |
| D11 | Token lưu ở đâu? | Refresh token và token reset mật khẩu lưu trong Redis kèm TTL | Thu hồi được, tự hết hạn, và tận dụng Redis theo đề bài |

---

## 8. Ngoài phạm vi

- Xác thực email khi đăng ký.
- Thông báo (email, realtime) khi có bình luận mới.
- Like, share, bookmark bài viết.
- Thống kê, dashboard biểu đồ.
- Lên lịch đăng bài.
- Liên kết các bản dịch của cùng một bài viết.
- Triển khai lên môi trường production (chỉ chạy local bằng Docker Compose).

---

## 9. Giả định và ràng buộc

- Có một SMTP để gửi email khôi phục mật khẩu. Môi trường dev dùng Mailtrap hoặc Ethereal.
- Đã đăng ký app OAuth trên Google Cloud Console và GitHub Developer Settings, callback chạy trên `localhost`.
- Ảnh upload lưu ở thư mục `uploads/` trên server, không dùng dịch vụ cloud storage.
- Máy phát triển chạy Windows có Docker Desktop (WSL2 backend), NodeJS LTS và Angular CLI.

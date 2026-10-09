# Tài liệu đặc tả yêu cầu - Blog Management System

| Mục | Nội dung |
| --- | --- |
| Phiên bản | 1.8 (dự án do 1 người thực hiện) |
| Ngày tạo | 01/10/2026 |
| Thời gian thực hiện | Khoảng 8 tuần, chia thành 5 phase (xem mục 1.5) |
| Nhân sự | 1 người làm toàn bộ (xem mục 1.4) |

---

## 1. Giới thiệu

### 1.1. Mục đích

Xây dựng hệ thống Blog đa ngôn ngữ, gồm trang đọc blog cho người dùng và trang quản trị cho chủ blog và quản trị viên. Dự án chia thành 5 phase làm lần lượt: xây dựng cơ sở dữ liệu, xây dựng giao diện HTML, xây dựng backend, xây dựng frontend, và deploy lên máy ảo Linux.

### 1.2. Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện HTML tĩnh | HTML5, Bootstrap 5, SCSS |
| Backend | NodeJS, NestJS (TypeScript), Sequelize (`@nestjs/sequelize`), kiến trúc Monolith chia theo module của NestJS |
| Frontend | Angular (chia theo module), Bootstrap 5, SCSS |
| Cơ sở dữ liệu | MySQL 8 (utf8mb4) |
| Cache / token store | Redis |
| Thiết kế CSDL | dbdiagram.io |
| Kiểm thử API | Postman, Jest, Supertest |
| Tài liệu API | Swagger (OpenAPI 3) qua `@nestjs/swagger` |
| Môi trường phát triển | Máy Windows, MySQL và Redis chạy bằng Docker Compose |
| Môi trường deploy | Máy ảo Ubuntu Server 24.04 LTS (VirtualBox hoặc VMware); MySQL Server, Redis, NodeJS cài trực tiếp, không dùng Docker |
| Web server | Nginx: phục vụ bản build Angular và chuyển tiếp `/api` về backend NodeJS |
| Quản lý tiến trình NodeJS | PM2 |

### 1.3. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Post | Một bài viết blog. Mỗi post có một ngôn ngữ gốc và có thể có bản dịch sang các ngôn ngữ khác |
| Bản gốc | Bản dịch của post ở ngôn ngữ gốc. Bắt buộc có, tạo cùng lúc với post |
| Bản dịch bài viết (Post translation) | Nội dung của post ở một ngôn ngữ: tiêu đề, slug, tóm tắt, nội dung, trạng thái, lượt xem. Mỗi post có tối đa một bản dịch cho mỗi ngôn ngữ |
| Category | Danh mục bài viết, dùng chung cho mọi ngôn ngữ, tên được dịch theo từng ngôn ngữ |
| Language | Ngôn ngữ do Super Admin quản lý (ví dụ `vi`, `en`) |
| UI translation | Bản dịch chữ tĩnh trên giao diện (menu, nút bấm, footer...) |
| Page | Trang nội dung tĩnh (Giới thiệu, Liên hệ, Chính sách bảo mật). Danh sách trang cố định, mỗi trang có nội dung riêng cho từng ngôn ngữ (xem UC18) |
| Slug | Chuỗi định danh trên URL, sinh từ tiêu đề, ví dụ `huong-dan-angular` |
| Access token | JWT ngắn hạn dùng để gọi API |
| Refresh token | Token dài hạn dùng để xin access token mới, lưu trong Redis |

### 1.4. Nhân sự

Dự án do 1 người làm toàn bộ: cơ sở dữ liệu, giao diện HTML, backend, frontend và deploy.

- Làm phần nền trước rồi mới tới các chức năng: ở phase 3 dựng xong khung backend rồi mới code API cho từng use case; ở phase 4 dựng xong khung Angular rồi mới làm từng màn hình.
- Trong mỗi phase, làm các use case Must trước, Should sau (mục 3).
- Mỗi việc vẫn làm trên nhánh riêng và merge qua PR. Không có người review, nên trước khi merge tự đi qua checklist của phase đó.

### 1.5. Kế hoạch theo phase

Các phase làm lần lượt. Một phase chỉ kết thúc khi đạt hết "Điều kiện hoàn thành". Thời gian ghi trong bảng là ước lượng.

| Phase | Nội dung | Thời gian | Đầu ra chính |
| --- | --- | --- | --- |
| 1 | Xây dựng cơ sở dữ liệu | ~1 tuần | ERD, migrations, seeders |
| 2 | Xây dựng giao diện HTML | ~1 tuần | Các trang HTML tĩnh cho mọi màn hình |
| 3 | Xây dựng backend | ~2,5 tuần | API, Swagger, Postman, test |
| 4 | Xây dựng frontend | ~2,5 tuần | Ứng dụng Angular chạy được với API thật |
| 5 | Deploy lên máy ảo Linux | ~1 tuần | Hệ thống chạy trên máy ảo, tài liệu hướng dẫn deploy |

#### Phase 1 - Xây dựng cơ sở dữ liệu

Công việc:

- Thiết kế ERD trên dbdiagram.io cho các bảng: `roles`, `users`, `oauth_accounts`, `languages`, `categories`, `category_translations`, `posts`, `post_translations`, `comments`, `ui_translations`, `pages`, `page_translations`.
- Viết tài liệu mô tả từng bảng: cột, kiểu dữ liệu, ràng buộc, index, khóa ngoại và hành vi khi xóa (ví dụ xóa bài thì xóa luôn bình luận).
- Viết migrations Sequelize, gồm cả FULLTEXT index (parser `ngram`) cho bảng `post_translations`.
- Viết seeders theo mục 6.6.

Đầu ra: file ERD (link dbdiagram và ảnh export) và tài liệu mô tả bảng trong `docs/`, migrations và seeders trong source backend.

Điều kiện hoàn thành:

- ERD đã chốt, tài liệu mô tả bảng khớp với ERD.
- Trên một database trống, chạy migrate rồi seed không lỗi, và rollback (`db:migrate:undo:all`) cũng không lỗi.

#### Phase 2 - Xây dựng giao diện HTML

Dựng giao diện bằng HTML, Bootstrap 5 và SCSS, clone theo phong cách Medium (medium.com), dùng dữ liệu giả, chưa gọi API. Chi tiết xem [phase-2-html.md](phase-2-html.md). Mỗi màn hình là một file HTML, dùng chung một bộ SCSS (biến màu, cả chế độ sáng lẫn tối). Ở phase 4, các file này được chuyển thành component Angular.

Màn hình cần làm:

- Bộ SCSS dùng chung; layout trang public (header, footer), trang auth và trang quản trị (sidebar).
- Trang public: trang chủ, chi tiết bài viết (kèm bình luận), bài theo danh mục, kết quả tìm kiếm, trang tĩnh, trang 404.
- Tài khoản: đăng ký, đăng nhập, quên mật khẩu, đặt lại mật khẩu, hồ sơ cá nhân.
- Trang quản trị: danh sách bài viết, form thêm/sửa bài viết (có tab cho từng ngôn ngữ), quản lý người dùng, quản lý danh mục, quản lý ngôn ngữ, quản lý bản dịch giao diện, danh sách trang tĩnh, sửa trang tĩnh.

Đầu ra: thư mục `html/` chứa các file HTML và SCSS.

Điều kiện hoàn thành:

- Có đủ tất cả màn hình trong danh sách trên.
- Hiển thị đúng trên mobile (360px), tablet, desktop, ở cả chế độ sáng và tối.
- Mỗi form có sẵn trạng thái hiển thị lỗi validate và trạng thái loading.

#### Phase 3 - Xây dựng backend

Công việc:

- Dựng khung backend NestJS trước (cấu trúc module, interceptor format response, exception filter xử lý lỗi, guard xác thực và phân quyền, upload, lọc HTML, Redis, Swagger), merge xong mới code API cho từng use case.
- Code API cho từng use case (mục 3), kèm validate, test, tài liệu Swagger và request trong Postman collection.

Đầu ra: API dưới `/api/v1`, Swagger tại `/api-docs`, Postman collection trong `docs/`.

Điều kiện hoàn thành:

- Có đủ API cho các use case Must.
- Test chạy qua hết, độ phủ tầng service tối thiểu 70%.
- Mọi API đúng chuẩn ở mục 6.4.

#### Phase 4 - Xây dựng frontend

Công việc:

- Dựng khung Angular trước (module, routing, interceptors, guards, đa ngôn ngữ, layout, component dùng chung: phân trang, hộp xác nhận, thông báo, rich text editor), merge xong mới làm từng màn hình.
- Chuyển các trang HTML của phase 2 thành component Angular, nối với API thật.

Đầu ra: ứng dụng Angular chạy với backend ở local.

Điều kiện hoàn thành:

- Chạy được trọn vẹn mọi use case Must từ giao diện, từ đầu đến cuối.
- Các use case Should làm nếu còn thời gian.

#### Phase 5 - Deploy lên máy ảo Linux

Mục tiêu: chạy toàn bộ hệ thống trên một máy ảo Linux như một server thật. Qua đó nắm được cách cài và cấu hình Nginx, MySQL Server (gồm cả đặt mật khẩu), Redis, NodeJS trên Linux.

Công việc:

1. **Máy ảo:** tạo máy ảo Ubuntu Server 24.04 LTS (khuyến nghị 2 CPU, 4GB RAM, 25GB ổ cứng). Cấu hình mạng Bridged hoặc Host-only để máy thật truy cập được.
2. **Hệ điều hành:** cập nhật hệ thống; tạo user `deploy` có quyền sudo, không dùng root để chạy ứng dụng; đăng nhập SSH bằng key; bật firewall UFW, chỉ mở cổng 22 (SSH) và 80 (HTTP).
3. **MySQL Server 8:**
   - Cài đặt và chạy `mysql_secure_installation`: đặt mật khẩu cho `root`, xóa user ẩn danh, chặn `root` đăng nhập từ xa, xóa database test.
   - Tạo database `blog_db` với `utf8mb4` / `utf8mb4_unicode_ci`.
   - Tạo user riêng cho ứng dụng (ví dụ `blog_app`) có mật khẩu mạnh và chỉ có quyền trên `blog_db`. Ứng dụng không được dùng tài khoản `root`.
   - Cấu hình `bind-address = 127.0.0.1` để MySQL chỉ nhận kết nối từ trong máy ảo.
4. **Redis:** cài đặt, chỉ lắng nghe `127.0.0.1`, đặt mật khẩu (`requirepass`).
5. **Backend:**
   - Cài NodeJS LTS, clone source, tạo file `.env` cho môi trường production (không commit lên Git).
   - Chạy migrations và seeders.
   - Chạy backend bằng PM2, cấu hình `pm2 startup` để tự chạy lại khi khởi động lại máy ảo.
6. **Frontend:** build Angular ở chế độ production, copy kết quả vào `/var/www/blog`.
7. **Nginx:**
   - Phục vụ bản build Angular, cấu hình `try_files ... /index.html` để reload trang ở mọi route không bị lỗi 404.
   - Chuyển tiếp `/api` và `/uploads` về backend NodeJS.
   - Đặt `client_max_body_size` đủ cho upload ảnh 2MB; bật gzip.
8. **Kiểm tra:** đi qua checklist ở mục "Điều kiện hoàn thành".

Vừa làm vừa ghi lại lệnh vào tài liệu hướng dẫn deploy. Sau khi deploy xong, **làm lại toàn bộ các bước trên một máy ảo mới** chỉ theo tài liệu, để chắc tài liệu đủ và đúng.

Đầu ra:

- `docs/deployment.md`: hướng dẫn deploy từng bước, ghi đủ lệnh.
- `deploy/nginx.conf`: file cấu hình Nginx mẫu.
- `ecosystem.config.js`: file cấu hình PM2.
- `.env.example`: danh sách biến môi trường, không chứa giá trị thật.

Điều kiện hoàn thành:

- Từ trình duyệt trên máy thật, mở địa chỉ IP của máy ảo thì dùng được blog: đọc bài, đăng ký, đăng nhập, viết bài có upload ảnh, thêm bản dịch cho bài, bình luận, đổi ngôn ngữ.
- Reload trang ở một route bất kỳ (ví dụ `/posts/abc`) không bị lỗi 404 của Nginx.
- Khởi động lại máy ảo thì ứng dụng tự chạy lại, không cần thao tác tay.
- Không đăng nhập được MySQL bằng `root` khi không có mật khẩu. Ứng dụng kết nối bằng user riêng, không dùng `root`.
- Từ máy thật không kết nối trực tiếp được vào MySQL (cổng 3306) và Redis (cổng 6379).

Lưu ý về OAuth: Google chỉ chấp nhận callback là `localhost` hoặc địa chỉ HTTPS có tên miền, nên đăng nhập Google có thể không chạy được trên máy ảo truy cập bằng IP. Trên máy ảo chỉ bắt buộc chạy đăng nhập bằng Github. Đăng nhập Google demo ở môi trường local.

---

## 2. Tác nhân (Actors)

| Actor | Mô tả | Kế thừa |
| --- | --- | --- |
| Guest | Khách vãng lai, chưa đăng nhập | - |
| Authenticated User | Người dùng đã đăng nhập, là người đọc blog, không viết bài | Guest (trừ đăng ký/đăng nhập) |
| Blog Owner | Người viết và quản lý bài viết của chính mình | Authenticated User |
| Super Admin | Quản trị toàn hệ thống | Blog Owner |

Trong CSDL, role lưu ở bảng `roles` (danh sách cố định `user`, `blog_owner`, `super_admin`, tạo bằng seeder, không có màn hình quản lý). Mỗi tài khoản có đúng một role, tham chiếu qua `users.role_id`. Guest là người chưa có phiên đăng nhập nên không có role.

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
| UC09 | Đổi ngôn ngữ (Change blog language) | Guest, Authenticated User | Must | Dùng API ngôn ngữ (UC16) và API bản dịch giao diện (UC17) |
| UC10 | Đổi giao diện sáng/tối (Change theme) | Guest, Authenticated User | Should | Mở rộng |
| UC11 | Xem trang tĩnh (Giới thiệu, Liên hệ, Chính sách bảo mật) | Guest, Authenticated User | Must | |
| UC12 | Quản lý hồ sơ cá nhân | Authenticated User | Should | Bổ sung, đề bài không ghi |
| UC13 | Quản lý bài viết (Manage posts) | Blog Owner | Must | Thêm, sửa, xóa, xem danh sách, thêm/sửa/xóa bản dịch theo ngôn ngữ |
| UC14 | Quản lý người dùng (Manage users) | Super Admin | Must | |
| UC15 | Quản lý danh mục (Manage categories) | Super Admin | Must | |
| UC16 | Quản lý ngôn ngữ (Manage languages) | Super Admin | Must | |
| UC17 | Quản lý bản dịch giao diện (Manage UI translations) | Super Admin | Must | Cần để đổi được menu và chữ tĩnh theo ngôn ngữ |
| UC18 | Quản lý trang tĩnh (Manage pages) | Super Admin | Must | Chỉ sửa nội dung của các trang có sẵn, không đổi bố cục giao diện |
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

- Chỉ hiện các bài có bản dịch ở ngôn ngữ đang chọn và bản dịch đó có trạng thái `published`. Không fallback: bài chưa có bản dịch `published` ở ngôn ngữ đang chọn thì không hiện, kể cả khi bản gốc đã đăng.
- Sắp xếp theo ngày đăng của bản dịch, mới nhất trước, phân trang 10 bài mỗi trang.
- Mỗi bài hiện: ảnh thumbnail, tiêu đề, tóm tắt, tên danh mục (theo ngôn ngữ đang chọn), tác giả, ngày đăng, lượt xem. Tiêu đề, tóm tắt, ngày đăng, lượt xem lấy theo bản dịch đang hiển thị; thumbnail, danh mục, tác giả dùng chung cho mọi bản dịch.

**UC06 - Chi tiết bài viết**

- Truy cập qua URL `/posts/:slug`, slug là slug của bản dịch theo ngôn ngữ đang chọn.
- Hiện đầy đủ nội dung, tác giả, danh mục, ngày đăng, lượt xem, danh sách bình luận và một vài bài cùng danh mục (có bản dịch `published` ở cùng ngôn ngữ).
- Hiện dòng "Bài viết này có ở các ngôn ngữ: ..." gồm các ngôn ngữ đang hoạt động mà bài có bản dịch `published`. Bấm vào một ngôn ngữ thì đổi ngôn ngữ (như UC09) và mở bản dịch tương ứng.
- Mỗi lần xem thì tăng lượt xem của bản dịch đang xem lên 1 (mỗi IP chỉ tính 1 lần trong 1 giờ cho mỗi bản dịch, kiểm tra bằng Redis).
- Không tìm thấy bản dịch có slug này ở ngôn ngữ đang chọn, hoặc bản dịch chưa đăng: hiện trang 404.

**UC07 - Bài viết theo danh mục**

- Truy cập qua URL `/categories/:slug`, slug là slug của danh mục theo ngôn ngữ đang chọn.
- Danh sách bài viết hiển thị và phân trang giống UC05.
- Thanh điều hướng hoặc sidebar hiện danh sách danh mục kèm số lượng bài có bản dịch `published` ở ngôn ngữ đang chọn.

**UC08 - Bình luận**

- Phải đăng nhập mới được bình luận. Guest chỉ xem được bình luận và thấy nút "Đăng nhập để bình luận".
- Nội dung từ 1 đến 1000 ký tự, chỉ là văn bản thuần (không nhận HTML).
- Cho phép trả lời bình luận, tối đa 1 cấp (không trả lời một bình luận trả lời).
- Bình luận gắn với từng bản dịch: mỗi ngôn ngữ của bài có luồng bình luận riêng.
- Bình luận hiện ngay, không cần duyệt.
- Quyền xóa:
  - Người viết bình luận xóa được bình luận của mình.
  - Blog Owner xóa được mọi bình luận trên bài của mình.
  - Super Admin xóa được mọi bình luận.
  - Xóa bình luận cha thì xóa luôn các bình luận trả lời. Xóa bản dịch thì xóa luôn bình luận của bản dịch đó.

**UC09 - Đổi ngôn ngữ**

- Bộ chọn ngôn ngữ trên header chỉ hiện các ngôn ngữ đang hoạt động.
- Khi đổi ngôn ngữ, toàn bộ nội dung sau phải đổi theo:
  - Danh sách bài viết: chỉ còn các bài có bản dịch `published` ở ngôn ngữ mới, hiện theo bản dịch đó.
  - Tên danh mục.
  - Menu, nút bấm, footer và mọi chữ tĩnh khác (UI translations).
  - Nội dung các trang tĩnh (Giới thiệu, Liên hệ, Chính sách bảo mật).
- Nếu đang ở trang chi tiết bài viết khi đổi ngôn ngữ: bài có bản dịch `published` ở ngôn ngữ mới thì chuyển sang bản dịch đó (`/posts/:slug` theo slug mới), nếu không thì chuyển về trang chủ.
- Nếu đang ở trang danh mục khi đổi ngôn ngữ: chuyển sang slug của danh mục đó ở ngôn ngữ mới.
- Lựa chọn được lưu ở `localStorage`, tải lại trang vẫn giữ nguyên.
- Lần truy cập đầu tiên: dùng ngôn ngữ của trình duyệt nếu hệ thống có hỗ trợ, nếu không thì dùng ngôn ngữ mặc định.
- Frontend gửi ngôn ngữ đang chọn qua header `Accept-Language` trong mọi request.

**UC10 - Đổi giao diện sáng/tối**

- Có nút chuyển Light/Dark trên header, áp dụng cho cả trang public lẫn trang quản trị.
- Lựa chọn được lưu ở `localStorage`. Lần đầu truy cập thì theo cài đặt hệ điều hành (`prefers-color-scheme`).

**UC11 - Xem trang tĩnh**

- Hệ thống có 3 trang tĩnh cố định: Giới thiệu, Liên hệ, Chính sách bảo mật (danh sách ở UC18).
- Truy cập qua URL `/pages/:key`, ví dụ `/pages/about`.
- Link tới cả 3 trang nằm ở footer. Trang Giới thiệu có thêm link trên menu header.
- Hiện tiêu đề và nội dung theo ngôn ngữ đang chọn. Nếu trang chưa có nội dung cho ngôn ngữ đó thì hiện bản của ngôn ngữ mặc định.
- Trang đang bị ẩn hoặc key không tồn tại: hiện trang 404. Link tới trang bị ẩn cũng không hiện trên footer và menu.
- Mọi trang tĩnh dùng chung một khung giao diện: tiêu đề ở trên, nội dung rich text ở dưới.

**UC19 - Tìm kiếm toàn văn**

- Ô tìm kiếm trên header, chuyển sang trang `/search?q=...`.
- Tìm trong tiêu đề, tóm tắt và nội dung của bản dịch, chỉ trong các bản dịch `published` thuộc ngôn ngữ đang chọn.
- Dùng MySQL FULLTEXT index với parser `ngram` để tìm được tiếng Việt có dấu.
- Từ khóa từ 2 đến 100 ký tự. Kết quả sắp xếp theo độ liên quan và có phân trang.

**UC12 - Hồ sơ cá nhân**

- Xem và sửa họ tên, ảnh đại diện (jpg, png, webp, tối đa 2MB).
- Đổi mật khẩu: phải nhập đúng mật khẩu cũ. Tài khoản OAuth chưa có mật khẩu thì không cần nhập mật khẩu cũ.
- Không cho tự đổi email và role.

### 4.3. Blog Owner

**UC13 - Quản lý bài viết**

Mỗi bài viết gồm phần dùng chung cho mọi ngôn ngữ và các bản dịch theo từng ngôn ngữ. Bài được tạo ở một ngôn ngữ gốc, sau đó tác giả thêm dần bản dịch sang các ngôn ngữ khác.

*Phần dùng chung (bảng `posts`):*

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| Ngôn ngữ gốc | Có | Ngôn ngữ đang hoạt động. Chọn khi tạo bài, không đổi được sau đó |
| Danh mục | Có | Danh mục đang tồn tại |
| Ảnh thumbnail | Không | jpg, png, webp, tối đa 2MB |

*Phần theo từng ngôn ngữ (bảng `post_translations`):*

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| Tiêu đề | Có | 5 đến 255 ký tự |
| Tóm tắt | Không | Tối đa 500 ký tự |
| Nội dung | Có | Rich text (HTML), backend lọc bỏ thẻ và thuộc tính nguy hiểm để chống XSS |
| Trạng thái | Có | `draft`, `published` hoặc `archived`, riêng cho từng bản dịch |

- **Danh sách**: chỉ hiện bài của chính mình, mỗi dòng là một bài: tiêu đề (theo bản gốc), ngôn ngữ gốc, danh mục, các ngôn ngữ đã có bản dịch kèm trạng thái của từng bản, ngày cập nhật. Lọc theo trạng thái của bản gốc, theo ngôn ngữ (bài có bản dịch ở ngôn ngữ đó), theo danh mục; tìm theo tiêu đề ở mọi bản dịch; có phân trang.
- **Thêm bài**: nhập phần dùng chung và bản gốc. Bản gốc là bản dịch ở ngôn ngữ gốc.
- **Sửa bài**: màn hình gồm phần dùng chung ở trên và các tab ngôn ngữ ở dưới, mỗi ngôn ngữ đang hoạt động là một tab. Tab ngôn ngữ gốc luôn có dữ liệu. Tab ngôn ngữ chưa có bản dịch hiện nút "Thêm bản dịch"; khi thêm, form điền sẵn nội dung của bản gốc để tác giả dịch lại.
- **Bản dịch**:
  - Mỗi bài có tối đa một bản dịch cho mỗi ngôn ngữ.
  - Mỗi bản dịch có trạng thái, ngày đăng, lượt xem và bình luận riêng.
  - Xóa được bản dịch không phải bản gốc (phải xác nhận). Xóa bản dịch thì xóa luôn bình luận của bản dịch đó.
  - Không xóa riêng được bản gốc, muốn bỏ thì xóa cả bài.
  - Sửa bản gốc không làm thay đổi các bản dịch khác.
- **Slug**: mỗi bản dịch có slug riêng, tự sinh từ tiêu đề của bản dịch đó (bỏ dấu tiếng Việt) và là duy nhất trong cùng một ngôn ngữ. Nếu trùng thì thêm hậu tố `-2`, `-3`...
- **Ngày đăng** (`published_at`): ghi lại vào lần đầu tiên bản dịch chuyển sang `published`, riêng cho từng bản dịch.
- **Quyền**: chỉ sửa được bài và bản dịch của mình. Vào trang sửa bài của người khác thì trả lỗi 403.
- **Xóa bài**: chỉ xóa được bài của mình, phải xác nhận trước khi xóa. Xóa bài thì xóa luôn mọi bản dịch, bình luận và ảnh thumbnail.

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
- Không xóa được ngôn ngữ đang có bản dịch bài viết (kể cả khi là ngôn ngữ gốc của bài), chỉ được tắt. Ngôn ngữ đã tắt sẽ ẩn khỏi bộ chọn ngôn ngữ, các bản dịch ở ngôn ngữ đó không hiện ra ngoài trang public, và không chọn được làm ngôn ngữ gốc hay thêm bản dịch mới ở ngôn ngữ đó.
- Khi thêm ngôn ngữ mới, hệ thống sao chép toàn bộ key UI translation từ ngôn ngữ mặc định sang (giữ nguyên giá trị để admin dịch dần).

**UC17 - Quản lý bản dịch giao diện**

- Hiện dạng bảng: mỗi dòng là một key (ví dụ `menu.home`), mỗi cột là một ngôn ngữ.
- Thêm key mới, sửa giá trị, xóa key (xóa ở mọi ngôn ngữ).
- Tìm theo key hoặc theo giá trị.
- Ngôn ngữ nào thiếu giá trị của một key thì frontend hiện giá trị của ngôn ngữ mặc định.

**UC18 - Quản lý trang tĩnh**

Trang tĩnh là trang chỉ gồm chữ và hình, nội dung ít thay đổi và không phải bài viết. Hệ thống có sẵn một danh sách trang cố định. Admin chỉ sửa nội dung, không tạo thêm hay xóa trang.

*Danh sách trang:*

| Key | Tên trang | URL public | Nội dung gợi ý |
| --- | --- | --- | --- |
| `about` | Giới thiệu | `/pages/about` | Giới thiệu blog, mục đích, đội ngũ tác giả |
| `contact` | Liên hệ | `/pages/contact` | Email, mạng xã hội, địa chỉ. Chỉ là văn bản, không có form gửi liên hệ |
| `privacy` | Chính sách bảo mật | `/pages/privacy` | Blog thu thập và sử dụng dữ liệu người dùng như thế nào |

- Các trang được tạo sẵn bằng seeder. Key và URL không đổi được.
- Muốn thêm trang mới thì lập trình viên thêm bằng seeder, không làm qua màn hình quản trị.

*Màn hình danh sách trang:*

- Bảng gồm: tên trang (theo ngôn ngữ mặc định), key, các ngôn ngữ đã có nội dung, trạng thái hiển thị, ngày cập nhật gần nhất, nút "Sửa".
- Không cần phân trang và tìm kiếm vì chỉ có vài trang.

*Màn hình sửa trang:*

- Mỗi ngôn ngữ đang hoạt động là một tab. Mỗi tab có các trường:

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| Tiêu đề | Có với ngôn ngữ mặc định, không bắt buộc với ngôn ngữ khác | 2 đến 255 ký tự |
| Nội dung | Có với ngôn ngữ mặc định, không bắt buộc với ngôn ngữ khác | Rich text (HTML), backend lọc bỏ thẻ và thuộc tính nguy hiểm để chống XSS |

- Ngôn ngữ khác ngôn ngữ mặc định: điền đủ cả tiêu đề và nội dung, hoặc để trống cả hai. Để trống cả hai thì trang public hiện bản của ngôn ngữ mặc định.
- Công tắc "Hiển thị" bật/tắt trang, áp dụng cho mọi ngôn ngữ.
- Nút "Lưu" lưu tất cả các tab cùng lúc và hiện thông báo thành công hoặc lỗi.
- Nút "Xem trên trang public" mở trang ở tab mới của trình duyệt.
- Rich text editor dùng chung component với UC13, hỗ trợ: tiêu đề (H2, H3), in đậm, in nghiêng, gạch chân, danh sách, trích dẫn, chèn link, chèn ảnh. Ảnh chèn vào theo ràng buộc ảnh của UC13 (jpg, png, webp, tối đa 2MB).

*Những gì chức năng này KHÔNG làm:*

- Không phải công cụ thiết kế trang (page builder): không kéo thả, không đổi bố cục, màu sắc, font chữ hay CSS của trang. Mọi trang tĩnh dùng chung một khung giao diện do frontend làm sẵn.
- Không tạo trang mới, không xóa trang, không đổi key hoặc URL.
- Không sửa chữ trên menu, footer hay nút bấm, kể cả tên của các link dẫn tới trang tĩnh. Phần đó sửa ở UC17.
- Không lưu lịch sử các lần sửa.

*Phân biệt UC17 và UC18:*

| | UC17 - Bản dịch giao diện | UC18 - Trang tĩnh |
| --- | --- | --- |
| Sửa cái gì | Chữ ngắn cố định trên giao diện: menu, nút bấm, footer, thông báo | Nội dung dài của một trang riêng |
| Dạng dữ liệu | Mỗi key là một chuỗi văn bản thuần | Tiêu đề và nội dung rich text |
| Ví dụ | `menu.about` = "Giới thiệu" | Toàn bộ nội dung của trang `/pages/about` |

---

## 5. Ma trận phân quyền

| Chức năng | Guest | User | Blog Owner | Super Admin |
| --- | --- | --- | --- | --- |
| Đăng ký, đăng nhập, quên mật khẩu, OAuth | X | | | |
| Xem danh sách, chi tiết, danh mục, trang tĩnh, tìm kiếm | X | X | X | X |
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
- Validate mọi dữ liệu đầu vào ở backend bằng DTO với `class-validator` và `ValidationPipe` của NestJS, và ở frontend bằng Angular Validators.
- Lọc HTML nội dung bài viết và trang tĩnh để chống XSS.
- Upload file: kiểm tra cả đuôi file lẫn MIME type, giới hạn dung lượng, đổi tên file ngẫu nhiên khi lưu.
- Dùng `helmet`, cấu hình CORS chỉ cho phép domain của frontend, rate limit API đăng nhập và quên mật khẩu (`@nestjs/throttler`, lưu bộ đếm trong Redis).
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

- Backend chia theo module của NestJS. Mỗi module tự chứa module file, controller, service, DTO, model và test.
- Sequelize cấu hình 3 môi trường `development`, `test` và `production`, mỗi môi trường dùng database riêng. Thay đổi schema chỉ qua migration.
- Unit test và integration test bằng Jest + Supertest, độ phủ tối thiểu 70% ở tầng service.
- Dùng ESLint và Prettier cho cả backend và frontend.
- Git: nhánh `main` luôn chạy được, mỗi task làm trên nhánh `feature/*`, commit theo Conventional Commits.

### 6.6. Dữ liệu

- CSDL dùng `utf8mb4` / `utf8mb4_unicode_ci` để lưu đúng tiếng Việt và emoji.
- Có seeder dữ liệu mẫu: 3 role (`user`, `blog_owner`, `super_admin`), 1 Super Admin, 2 Blog Owner, 2 ngôn ngữ (`vi` mặc định, `en`), 5 danh mục, khoảng 30 bài viết (có cả bài gốc `vi` và bài gốc `en`, một phần bài đã có bản dịch sang ngôn ngữ còn lại, trong đó có bản dịch đang `draft`), các UI translation cơ bản, 3 trang tĩnh (`about`, `contact`, `privacy`) có nội dung cho cả `vi` và `en`.

---

## 7. Các quyết định cho những điểm đề bài chưa rõ

| # | Vấn đề | Quyết định | Lý do |
| --- | --- | --- | --- |
| D1 | Blog Owner là role riêng hay user tự viết bài? | Role riêng `blog_owner`, do Super Admin cấp | Đúng theo use case của đề: User chỉ đọc, Owner mới viết |
| D2 | Guest có được đọc bài không? | Có. Guest đọc được, chỉ bình luận mới cần đăng nhập | Blog công khai thì hợp lý hơn. Đề chỉ ghi các chức năng của User mà không cấm Guest đọc |
| D3 | Bài tiếng Việt và tiếng Anh có liên kết với nhau không? | Có. Mỗi post có một ngôn ngữ gốc và có thể dịch ra nhiều ngôn ngữ (bảng `post_translations`). Ở mỗi ngôn ngữ chỉ hiện các bài có bản dịch `published` ở ngôn ngữ đó, không fallback về bản gốc | Đổi ngôn ngữ thì đọc các blog của ngôn ngữ đó, đang đọc một bài thì chuyển được sang bản dịch của chính bài đó |
| D4 | Danh mục có tách riêng theo ngôn ngữ không? | Dùng chung, chỉ dịch tên | Tránh trùng lặp, admin quản lý dễ hơn |
| D5 | Chữ tĩnh (menu, nút) lưu ở đâu? | Lưu trong CSDL (bảng `ui_translations`), frontend tải qua API | Admin thêm ngôn ngữ mới mà không cần sửa code hay build lại frontend |
| D6 | Bình luận có cần duyệt không? | Không, hiện ngay. Owner và Admin có quyền xóa | Đơn giản, phù hợp quy mô dự án |
| D7 | Bình luận có trả lời lồng nhau không? | Có, tối đa 1 cấp | Cân bằng giữa trải nghiệm và độ phức tạp |
| D8 | Có xóa người dùng không? | Không xóa cứng, chỉ khóa tài khoản | Giữ toàn vẹn dữ liệu bài viết và bình luận |
| D9 | Có xác thực email khi đăng ký không? | Không (đưa ra ngoài phạm vi) | Giảm khối lượng. Đã có gửi email ở chức năng khôi phục mật khẩu |
| D10 | Mỗi Owner có nhiều blog không? | Không. Owner quản lý danh sách bài viết của mình, không có khái niệm "blog" riêng | Đề chỉ yêu cầu quản lý bài đăng |
| D11 | Token lưu ở đâu? | Refresh token và token reset mật khẩu lưu trong Redis kèm TTL | Thu hồi được, tự hết hạn, và tận dụng Redis theo đề bài |
| D12 | Admin có tạo thêm trang tĩnh được không? | Không. Danh sách cố định 3 trang (`about`, `contact`, `privacy`), admin chỉ sửa nội dung | Đề chỉ nêu trang About. Danh sách cố định giúp menu, footer và route frontend không phải đổi theo dữ liệu |
| D13 | "Quản lý trang tĩnh" có cho đổi giao diện trang không? | Không. Chỉ sửa tiêu đề, nội dung và bật/tắt hiển thị. Bố cục do frontend làm sẵn | Làm page builder quá lớn so với 8 tuần. Giao diện thống nhất trên toàn site |
| D14 | Bản dịch dùng chung những gì với bài gốc? | Dùng chung tác giả, danh mục, thumbnail. Riêng cho từng bản dịch: tiêu đề, slug, tóm tắt, nội dung, trạng thái, ngày đăng, lượt xem, bình luận | Bản dịch có thể soạn và đăng sau bản gốc. Bình luận riêng để mỗi ngôn ngữ không bị lẫn bình luận của ngôn ngữ khác |

---

## 8. Ngoài phạm vi

- Xác thực email khi đăng ký.
- Thông báo (email, realtime) khi có bình luận mới.
- Like, share, bookmark bài viết.
- Thống kê, dashboard biểu đồ.
- Lên lịch đăng bài.
- Công cụ thiết kế trang (page builder), tùy chỉnh bố cục hoặc màu sắc riêng cho từng trang tĩnh.
- Dịch tự động bài viết (máy dịch, AI).
- Đánh dấu bản dịch đã lỗi thời khi bản gốc được sửa.
- Đổi ngôn ngữ gốc của bài sau khi tạo.
- Deploy lên cloud hoặc hosting thật, dùng tên miền thật và chứng chỉ HTTPS thật (chỉ deploy lên máy ảo, xem phase 5).
- CI/CD tự động build và deploy.

---

## 9. Giả định và ràng buộc

- Có một SMTP để gửi email khôi phục mật khẩu. Môi trường dev dùng Mailtrap hoặc Ethereal.
- Đã đăng ký app OAuth trên Google Cloud Console và GitHub Developer Settings. Callback chạy trên `localhost`; riêng app Github có thêm callback theo địa chỉ IP của máy ảo.
- Ảnh upload lưu ở thư mục `uploads/` trên server, không dùng dịch vụ cloud storage.
- Máy phát triển chạy Windows có Docker Desktop (WSL2 backend), NodeJS LTS và Angular CLI.
- Máy thật đủ tài nguyên để chạy máy ảo (khuyến nghị RAM từ 8GB) và đã cài VirtualBox hoặc VMware.

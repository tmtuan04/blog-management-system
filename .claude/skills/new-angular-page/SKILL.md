---
name: new-angular-page
description: Chuyển một màn HTML của phase 2 thành màn Angular trong frontend/ và nối với API thật, theo màn mẫu login (form) hoặc admin/posts (danh sách), kèm route, guard, service, file dịch, trạng thái thật, kiểm tra và changelog. Dùng khi được giao làm một màn hoặc một khối giao diện của phase 4 (ví dụ "làm màn danh mục admin", "làm UC12 frontend", "nối trang chủ với API", "làm khối bình luận").
---

# Làm một màn Angular

Đầu vào: tên màn, route hoặc mã use case (ví dụ `/admin/categories`, `UC15`). Thiếu thì hỏi.

Quy trình gốc ở `docs/phase-4-huong-dan.md` mục 5. Các bước dưới đây theo đúng thứ tự đó; làm xong bước nào kiểm tra bước đó.

## 1. Đọc yêu cầu trước khi viết code

1. `docs/phase-4-frontend.md` mục 4: dòng của màn (route, quyền, file HTML, API, ghi chú). Dùng Grep theo route, không đọc cả file.
2. `docs/requirements.md`: use case tương ứng. Liệt kê từng ràng buộc; mỗi ràng buộc phải thành validator hoặc cách xử lý lỗi.
3. File HTML phase 2 trong `html/public/` hoặc `html/admin/`:
   - các khối `<!-- component: ... -->`;
   - các trạng thái khai báo trên `<body>` (`data-demo-states`, `data-demo-auths`) và khối `data-demo*`;
   - câu trong `invalid-feedback`, key `data-i18n`.
   Ghi thành danh sách trạng thái phải có.
4. Response và mã lỗi của các route ở cột "API": Swagger `http://localhost:3000/api-docs` nếu backend đang chạy, không thì `docs/phase-3-backend.md` mục 4 và response DTO trong `backend/src/modules/<module>/dto/`.
5. Màn mẫu: `frontend/src/app/features/auth/login/` (form) hoặc `frontend/src/app/features/admin/posts/` (danh sách admin), và bảng "Có sẵn để dùng" trong `frontend/README.md`.

Tóm tắt lại cho người dùng: route, API sẽ gọi, danh sách trạng thái, ràng buộc, chỗ nào tài liệu chưa rõ. API thiếu hoặc trả khác tài liệu thì báo, không tự sửa backend.

Nếu `frontend/` chưa có (khung A1 chưa merge) thì dừng và báo: mọi màn đều chờ A1.

## 2. Tạo file

```text
frontend/src/app/features/<khu vực>/<màn>/
  <màn>.routes.ts                 # export default Routes (nếu là khu vực mới)
  <màn>-page.component.ts|html    # màn hình
  <tên>-modal.component.ts|html   # modal, nếu có
  <khu vực>.service.ts            # gọi API, unwrap
  <khu vực>.models.ts             # kiểu theo response DTO, camelCase
```

Khối gắn vào màn của người khác (ví dụ bình luận trong chi tiết bài) là component riêng nhận `input()`, không sửa logic của màn chủ ngoài chỗ đặt khối.

Thêm route vào `frontend/src/app/app.routes.ts`, nạp lười bằng `loadChildren`, đúng guard: `authGuard` cho màn cần đăng nhập, `roleGuard` + `data: { roles }` theo bảng docs mục 4, `guestGuard` cho màn đăng nhập/đăng ký.

## 3. Viết theo thứ tự model, service, template, logic

Áp dụng `.claude/rules/frontend.md`. Những điểm hay bị bỏ sót:

- Template: chép markup từ HTML phase 2, đổi theo bảng ở docs mục 5. Khối đã có trong `shared/` thì dùng component, không chép markup. Bỏ mọi `data-demo*`.
- Mọi trạng thái trong danh sách ở bước 1 phải có nhánh `@if` / `@empty` tương ứng: loading (skeleton nếu phase 2 có), rỗng, lỗi validate, đang gửi, thành công, theo role.
- Danh sách: `page` và bộ lọc đọc/ghi query string.
- Form: validator giống DTO backend, `setServerErrors` cho lỗi 400, lỗi nghiệp vụ theo `code` → `error.*`, nút `submit-button`.
- Dữ liệu theo ngôn ngữ: tải lại khi `language.current` đổi. Màn có slug theo ngôn ngữ thì đổi slug theo docs mục 3.4.
- 404 / 403 khi mở màn: hiện màn lỗi tại chỗ.

## 4. File dịch

1. Tìm key có sẵn trong `frontend/public/i18n/vi.json` trước khi đặt key mới (thường đã có từ phase 2).
2. Key mới: thêm vào `vi.json` và dịch trong `en.json`. Key `error.*` mới đặt theo `error.<code viết thường>`.
3. Trong `frontend/`:

   ```bash
   npm run i18n:check
   ```

Sửa câu chữ đã có từ phase 2 thì sửa cả `html/i18n/` và data-i18n trong `html/` (chạy `npm run i18n:check` trong `html/`).

## 5. Test

Unit test bắt buộc nếu màn có logic riêng đáng kể (luồng nhiều bước, map lỗi field lồng nhau, tính toán), theo docs mục 6.1. Sửa phần nền (`core/`, `shared/`) thì phải có test cho phần đã sửa.

```bash
cd frontend
npm run test
```

## 6. Kiểm tra bằng mắt

Không tự xác nhận giao diện đúng nếu chưa nhìn thấy trang. Cần backend chạy (`npm run start:dev` trong `backend/`, `docker compose ps` ở gốc repo) và `npm start` trong `frontend/`. Nếu có công cụ trình duyệt thì mở trang và đi lại danh sách trạng thái ở bước 1; nếu không thì nói rõ là chưa kiểm tra và đưa danh sách cho người dùng tự xem:

- mọi trạng thái xuất hiện được bằng thao tác thật (loading: Network "Slow 4G"; lỗi mạng: "Offline");
- 360px và desktop, sáng và tối, `vi` và `en`;
- mở màn bằng khách và bằng role không đủ quyền;
- đặt cạnh file HTML phase 2: cùng bố cục, class, câu chữ;
- console không có lỗi.

## 7. Hoàn tất

1. Trong `frontend/`: `npm run lint`, `npm run test`, `npm run build`, `npm run i18n:check`.
2. Component hoặc class dùng chung mới: thêm dòng vào bảng "Có sẵn để dùng" của `frontend/README.md`.
3. Cập nhật trạng thái việc trong `docs/phase-4-frontend.md` mục 8.3 (và bảng đợt 8.2) nếu việc đó có trong bảng.
4. Thêm dòng vào `CHANGELOG.md` mục `[Unreleased]`: route, màn, API đã nối, key dịch mới, thay đổi ở `html/` nếu có.
5. Báo lại: route đã làm, trạng thái nào đã kiểm tra trên trình duyệt và trạng thái nào chưa, lệnh nào chưa chạy được và vì sao.

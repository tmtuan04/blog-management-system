---
name: new-backend-module
description: Dựng hoặc mở rộng một module API NestJS trong backend/ theo module mẫu languages, từ DTO, service, controller đến unit test, e2e test, Postman và changelog. Dùng khi được giao làm một nhóm route mới (ví dụ "làm API danh mục", "làm UC15", "thêm endpoint bình luận").
---

# Làm một module backend

Đầu vào: tên module hoặc mã use case (ví dụ `categories`, `UC15`). Thiếu thì hỏi.

Quy trình gốc ở `docs/phase-3-huong-dan.md` mục 5. Các bước dưới đây theo đúng thứ tự đó; làm xong bước nào kiểm tra bước đó.

## 1. Đọc yêu cầu trước khi viết code

1. `docs/phase-3-backend.md` mục 4: tìm bảng route của module (method, đường dẫn, body, mã lỗi). Dùng Grep theo tên route để tới đúng mục, không đọc cả file.
2. `docs/requirements.md`: use case tương ứng. Liệt kê ra từng ràng buộc; mỗi ràng buộc sẽ thành ít nhất một unit test.
3. Màn HTML tương ứng trong `html/admin/` hoặc `html/public/`: lấy nguyên văn các câu trong `invalid-feedback` để dùng làm `message` của DTO.
4. Module mẫu `backend/src/modules/languages/` và một module gần nhất về nghiệp vụ (ví dụ `posts` nếu có bản dịch, phân quyền theo chủ sở hữu).

Tóm tắt lại cho người dùng: danh sách route sẽ làm, danh sách ràng buộc, chỗ nào tài liệu chưa rõ. Tài liệu mâu thuẫn hoặc thiếu thì hỏi, không tự đoán.

## 2. Tạo file

```text
backend/src/modules/<module>/
  <module>.module.ts
  <module>.controller.ts            # route public
  admin-<module>.controller.ts      # route /admin/<module>, nếu có
  <module>.service.ts
  <module>.service.spec.ts
  dto/                              # body, query (kế thừa PaginationQueryDto), response
  models/                           # thường đã có sẵn
```

Thêm module vào `imports` của `backend/src/app.module.ts`. Model mới thì đăng ký trong `backend/src/infra/database/models.ts`.

## 3. Viết theo thứ tự DTO, service, controller

Áp dụng `.claude/rules/backend.md`. Những điểm hay bị bỏ sót:

- Mã lỗi nghiệp vụ mới: thêm vào `src/common/errors.ts`.
- Key và TTL cache mới: thêm vào `src/common/utils/redis-keys.ts`.
- Ghi nhiều bảng: transaction. Ghi xong: `cache.invalidate` đúng các prefix theo bảng ở `docs/phase-3-backend.md` mục 3.5.
- Route chỉ cho chủ sở hữu: kiểm tra trong service, trả 403 khi không phải chủ.

## 4. Unit test

Theo cách của `languages.service.spec.ts`: mock model bằng `getModelToken(Model)`, mock `CacheService`. Đi lại danh sách ràng buộc ở bước 1 và viết test cho từng cái.

```bash
cd backend
npm run test -- <module>
npm run test:cov
```

Tầng service của module phải từ 70% trở lên.

## 5. E2E test

File `backend/test/<module>.e2e-spec.ts`, theo cách của `test/languages.e2e-spec.ts`, dùng `createTestApp`, `resetDatabase`, `tokenFor(app, role)`, `bearer(token)`. Tối thiểu: đường thành công, lỗi validate (kiểm tra `errors[].field`), 401, 403, 404, 409 nếu có. Thêm một API thành công, một API phân trang và một API lỗi của module vào `test/response-format.e2e-spec.ts`.

```bash
npm run test:e2e -- <module>
```

E2E cần MySQL và Redis đang chạy (`docker compose ps` ở gốc repo). Container chưa chạy thì báo người dùng, không tự bỏ qua e2e.

## 6. Postman

Thêm folder của module vào `docs/postman/blog-api.postman_collection.json`: mỗi route một request, tên kèm mã UC, dùng `{{baseUrl}}`, `Authorization: Bearer {{adminAccessToken}}` (hoặc `ownerAccessToken`, `accessToken`), `Accept-Language: {{lang}}`, có test script kiểm tra mã HTTP và `success` giống request có sẵn. Chỉ sửa folder của module này.

Nếu app đang chạy và dữ liệu vừa seed thì chạy thử:

```bash
postman collection run docs/postman/blog-api.postman_collection.json -e docs/postman/local.postman_environment.json
```

## 7. Hoàn tất

1. `npm run lint`, `npm run test`, `npm run test:e2e` trong `backend/`.
2. Cập nhật trạng thái việc trong `docs/phase-3-backend.md` mục 8 nếu việc đó có trong bảng.
3. Thêm dòng vào `CHANGELOG.md` mục `[Unreleased]`: route, ràng buộc đáng chú ý, mã lỗi mới, test và Postman đã thêm.
4. Báo lại: route đã làm, phần trăm độ phủ, test nào chưa chạy được và vì sao.

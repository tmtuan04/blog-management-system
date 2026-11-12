---
paths:
  - "backend/**"
---

# Backend (NestJS)

Nguồn chuẩn: `docs/phase-3-backend.md` mục 3 (khung), 4 (bảng route), 7 (quy ước). Module mẫu để làm theo: `backend/src/modules/languages/`. Dưới đây là những điều dễ quên.

## Phân tầng

- Controller chỉ nhận request, gọi service, đặt `@ResponseMessage('...')`. Không truy vấn database trong controller.
- Service chứa toàn bộ logic. Ghi từ hai bảng trở lên thì chạy trong `this.sequelize.transaction(...)`.
- Không trả model thô. Response đi qua response DTO hoặc hàm map, không bao giờ có `passwordHash` hay cột nội bộ.
- Danh sách không được N+1: dùng `include` hoặc truy vấn gộp.

## Dùng cái có sẵn, không tự viết lại

- Lỗi: `throw new AppException(status, ErrorCode.X, 'câu tiếng Việt')`. Lỗi theo field: `AppException.validation([{ field, message }])`. Mã lỗi mới thêm vào `src/common/errors.ts`.
- Phân trang: query DTO kế thừa `PaginationQueryDto`, service trả `paginate(items, total, query)`.
- Cache: key và TTL khai báo trong `src/common/utils/redis-keys.ts`, không viết chuỗi key trong service. Đọc bằng `cache.wrap(...)`, ghi xong thì `cache.invalidate(CachePrefix.x)`.
- Slug: `generateUniqueSlug`. Rich text: `sanitizeRichText`, `hasRichTextContent`, `containsHtml`. Upload: `UploadService`. `LIKE` với chuỗi người dùng nhập: `escapeLike`.

## Xóa cache sau khi ghi

| Dữ liệu đổi | Xóa prefix |
| --- | --- |
| Bài viết, bản dịch bài | `posts` và `categories` |
| Danh mục | `categories` và `posts` |
| Ngôn ngữ | toàn bộ `cache:` |
| UI translation | `ui` |

Bảng đầy đủ ở `docs/phase-3-backend.md` mục 3.5.

## Quyền

- Mặc định mọi route cần đăng nhập. Route public phải có `@Public()`; public nhưng cần biết ai đang xem thì `@Public({ optionalAuth: true })`.
- `@Roles('blog_owner')` thì Super Admin tự qua. Quyền "admin" trong tài liệu là `@Roles('super_admin')`.
- Blog Owner chỉ thao tác trên bài của chính mình: kiểm tra chủ bài trong service, không chỉ dựa vào role.

## DTO và đặt tên

- Mỗi ràng buộc một decorator `class-validator` có `message` tiếng Việt, lấy đúng câu trong `invalid-feedback` của màn HTML tương ứng ở `html/`.
- Comment `/** ... */` trên field thành mô tả Swagger (plugin CLI), không viết `@ApiProperty` bằng tay.
- Route kebab-case số nhiều, JSON camelCase, ngôn ngữ dùng `code` (`vi`, `en`) chứ không dùng `id`, ngày giờ ISO 8601 UTC.
- Mỗi route có `@ApiOperation({ summary: 'UCxx - ...' })`, `@ApiDataResponse` hoặc `@ApiPaginatedResponse`, `@ApiErrorResponses(...)`.

## Test đi kèm trong cùng thay đổi

- Unit test `*.service.spec.ts` cạnh service: mỗi ràng buộc của use case ít nhất một test, có test gọi `cache.invalidate` sau khi ghi.
- E2E `test/<module>.e2e-spec.ts`: đường thành công, lỗi validate (đúng `errors[].field`), 401, 403, 404, 409 nếu có.
- Route mới thì thêm request vào `docs/postman/blog-api.postman_collection.json`, chỉ sửa folder của module đó.
- Chỉ chạy test bằng `npm run test*`, không gọi `npx jest`.

## Phần nền, hỏi trước khi sửa

- `src/common/`, `src/infra/`, `database/migrations/` là phần nền, PR đụng vào phải có người phụ trách khung duyệt. Thêm mã lỗi hoặc key Redis thì được; đổi hành vi thì nêu rõ lý do trước.
- Không sửa migration đã merge. Cần đổi bảng thì tạo migration mới.

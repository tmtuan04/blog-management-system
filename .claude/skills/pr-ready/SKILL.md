---
name: pr-ready
description: Kiểm tra nhánh hiện tại trước khi tạo PR vào dev - chạy lint, unit test, e2e, độ phủ, i18n, build CSS, check-links tùy phần đã sửa, soát changelog và Postman, rồi soạn mô tả PR theo checklist của dự án. Dùng khi người dùng nói "chuẩn bị PR", "kiểm tra trước khi tạo PR", "xong chưa".
---

# Kiểm tra trước khi tạo PR

Skill này chỉ kiểm tra và soạn mô tả. Không commit, không push, không tạo PR trừ khi người dùng yêu cầu.

## 1. Xác định phạm vi

```bash
git status --short
git diff --name-only dev...HEAD
```

Từ danh sách file, xác định PR đụng `backend/`, `html/`, hay cả hai, và chỉ chạy phần kiểm tra tương ứng. Ghi nhận ngay nếu có file không nên commit (`.env`, `uploads/`, `coverage/`, `dist/`) hoặc nhánh chưa có thay đổi mới nhất của `dev`.

## 2. Backend (khi có file trong `backend/`)

Chạy trong `backend/`, theo thứ tự, dừng lại báo khi một bước lỗi:

```bash
npm run lint
npm run test
npm run test:cov
npm run test:e2e
```

- `lint` tự sửa file: sau khi chạy xem `git status` có gì đổi thêm không.
- `test:e2e` cần Docker. `docker compose ps` cho thấy MySQL hoặc Redis chưa chạy thì báo người dùng, ghi là e2e chưa chạy, không coi là qua.
- Ghi lại phần trăm độ phủ của các service đã sửa.

Soát bằng cách đọc diff:

- Route mới có đủ trong `docs/phase-3-backend.md` mục 4, đúng method và đường dẫn.
- Thao tác ghi có transaction (khi ghi nhiều bảng) và có `cache.invalidate`.
- Response không lộ model thô.
- Route mới có request trong `docs/postman/blog-api.postman_collection.json`.
- PR có sửa `src/common/`, `src/infra/`, `database/migrations/` không. Có thì ghi rõ trong mô tả.

## 3. HTML (khi có file trong `html/`)

```bash
cd html
npm run build
npm run check-links
cd ../backend
npm run i18n:check
```

- Sau `npm run build`, `css/main.css` còn thay đổi chưa commit nghĩa là CSS trong nhánh đang cũ.
- `i18n:check` lỗi: chạy `npm run i18n:extract`, dịch key thiếu `en`, chạy lại.
- Sửa template dùng chung thì kiểm tra các trang chép lại header, footer, offcanvas đã được sửa theo.

## 4. Changelog

Đọc phần `[Unreleased]` của `CHANGELOG.md` (chỉ phần đầu file) và đối chiếu với diff. Thiếu thì bổ sung.

## 5. Báo cáo và mô tả PR

Báo kết quả từng bước: qua, lỗi (kèm đoạn output), hay chưa chạy được (kèm lý do). Không gộp thành "đã ổn" khi còn bước chưa chạy.

Sau đó soạn mô tả PR bằng tiếng Việt, base `dev`:

- Backend: dùng checklist ở `docs/phase-3-huong-dan.md` mục 6, đánh dấu đúng theo kết quả thật, kèm danh sách route và phần trăm độ phủ.
- HTML: dùng checklist ở `docs/phase-2-huong-dan.md` mục 7, nhắc người dùng đính kèm ảnh chụp 360px và desktop, sáng và tối.

# Git, PR và changelog

## Nhánh và commit

- Nhánh tạo từ `dev` mới nhất: `feature/be-<phần>` cho backend, `feature/html-<phần>` cho giao diện HTML, `feature/fe-<phần>` cho frontend Angular.
- PR luôn vào `dev`, không vào `master`. Merge vào `master` sẽ tự deploy `html/` lên GitHub Pages.
- Commit theo Conventional Commits, tiếng Anh: `feat(<scope>): ...`, `fix(<scope>): ...`, `test(<scope>): ...`, `refactor(<scope>): ...`. Scope: `api` (backend), `html` (giao diện HTML), `web` (frontend Angular).
- Chỉ commit, push, tạo PR khi được yêu cầu. Trước khi `git add`, xem `git status` để không lọt `.env`, `uploads/`, `coverage/`, `dist/`, `.angular/`.

## CHANGELOG.md

- Mọi thay đổi code hoặc tài liệu đều thêm dòng vào mục `[Unreleased]` của `CHANGELOG.md` ở gốc repo, trong cùng thay đổi đó.
- Viết tiếng Việt, theo Keep a Changelog: `Added`, `Changed`, `Fixed`, `Removed`. Ghi cái gì đổi và hành vi cụ thể (route, mã lỗi, tên class, tên key), kèm mã UC nếu có.
- Số phiên bản đi theo phiên bản của `docs/requirements.md`: requirements lên phiên bản mới thì mở mục phiên bản mới.
- File dài: chỉ đọc phần `[Unreleased]` ở đầu file (dùng `offset` / `limit` hoặc tìm theo heading), không đọc cả file.

## Mô tả PR

- Backend: dán checklist ở `docs/phase-3-huong-dan.md` mục 6, đánh dấu từng mục, ghi danh sách route và phần trăm độ phủ của module.
- HTML: theo checklist ở `docs/phase-2-huong-dan.md` mục 7, kèm ảnh chụp 360px và desktop, cả sáng lẫn tối.
- Frontend: dán checklist ở `docs/phase-4-huong-dan.md` mục 6, đánh dấu từng mục, ghi danh sách route đã làm, kèm ảnh chụp 360px và desktop, cả sáng lẫn tối.
- PR đụng `backend/src/common/`, `backend/src/infra/`, `backend/database/migrations/`, `html/scss/abstracts|themes|layouts`, hoặc `frontend/src/app/core|shared|layouts`, `frontend/src/styles/abstracts|themes|layouts` thì ghi rõ trong mô tả để người phụ trách khung duyệt.

## Conflict hay gặp

- `app.module.ts`, `common/errors.ts`, `common/utils/redis-keys.ts`: giữ dòng của cả hai bên.
- `frontend/src/app/app.routes.ts`, `frontend/public/i18n/*.json`: giữ dòng của cả hai bên; với file dịch kiểm tra dấu phẩy rồi chạy `npm run i18n:check`.
- `docs/postman/blog-api.postman_collection.json`: không sửa tay để gỡ conflict; lấy bản của `dev` rồi thêm lại folder của module.
- `package-lock.json`: lấy bản của `dev` rồi chạy lại `npm install` trong đúng thư mục (`backend/`, `html/` hoặc `frontend/`).

# Changelog

Ghi lại các thay đổi của dự án. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/).

## [1.6] - 2026-10-07

Bài viết có ngôn ngữ gốc và dịch được ra nhiều ngôn ngữ (thay cho mô hình mỗi post thuộc đúng 1 ngôn ngữ). Role chuyển từ enum sang bảng riêng.

### Added

- Bảng `roles` (`id`, `code`, `name`): danh sách cố định `user`, `blog_owner`, `super_admin`, tạo bằng seeder, không có màn hình quản lý.
- Bảng `post_translations`: nội dung bài theo từng ngôn ngữ (`title`, `slug`, `excerpt`, `content`, `status`, `view_count`, `published_at`).
  - Unique `(post_id, language_id)`: mỗi bài có tối đa 1 bản dịch / ngôn ngữ.
  - Unique `(language_id, slug)`, index `(language_id, status, published_at)`.
  - FULLTEXT index chuyển sang `ft_post_translations_search ON post_translations(title, excerpt, content)`.
- Khóa ngoại mới: `users.role_id → roles.id` (restrict), `post_translations.post_id → posts.id` (cascade), `post_translations.language_id → languages.id` (restrict), `comments.post_translation_id → post_translations.id` (cascade).
- Requirements:
  - Thuật ngữ "Bản gốc" và "Bản dịch bài viết (Post translation)".
  - Quyết định D14: phần dùng chung (tác giả, danh mục, thumbnail) và phần riêng của từng bản dịch (tiêu đề, slug, tóm tắt, nội dung, trạng thái, ngày đăng, lượt xem, bình luận).
  - UC06: dòng "Bài viết này có ở các ngôn ngữ: ..." để chuyển sang bản dịch khác.
  - UC13: quản lý bản dịch (thêm/sửa/xóa), màn hình sửa bài có tab cho từng ngôn ngữ, form bản dịch mới điền sẵn nội dung bản gốc.
  - Mục ngoài phạm vi: dịch tự động, đánh dấu bản dịch lỗi thời, đổi ngôn ngữ gốc sau khi tạo.
- Sample data: bảng `roles`, bảng `post_translations` (5 bản dịch, có bản dịch `draft`), bình luận trên bản dịch `en`, bảng trang chủ theo từng ngôn ngữ.

### Changed

- `users.role` (enum) → `users.role_id` (FK tới `roles`).
- `posts` chỉ giữ phần dùng chung: `user_id`, `language_id` (ngôn ngữ gốc, không đổi được), `category_id`, `thumbnail`. Các cột nội dung chuyển sang `post_translations`. Index còn `user_id` và `category_id`.
- `comments.post_id` → `comments.post_translation_id`: mỗi bản dịch có luồng bình luận riêng; reply phải cùng `post_translation_id` với comment cha.
- Requirements:
  - Phiên bản 1.5 → 1.6.
  - D3: post có ngôn ngữ gốc và có bản dịch, không fallback về bản gốc.
  - Phase 1 thêm bảng `roles`, `post_translations`; FULLTEXT index đặt trên `post_translations`.
  - UC05, UC07, UC19: chỉ hiện/đếm/tìm các bản dịch `published` ở ngôn ngữ đang chọn.
  - UC06: lượt xem tính riêng cho từng bản dịch; 404 khi không có bản dịch với slug đó ở ngôn ngữ đang chọn.
  - UC08: xóa bản dịch thì xóa bình luận của bản dịch đó.
  - UC09: đang ở chi tiết bài thì chuyển sang bản dịch tương ứng (không có thì về trang chủ); đang ở trang danh mục thì chuyển sang slug danh mục ở ngôn ngữ mới.
  - UC16: không xóa được ngôn ngữ đang có bản dịch bài viết; ngôn ngữ đã tắt không chọn được làm ngôn ngữ gốc hay thêm bản dịch mới.
  - Mục 2 (vai trò): role lưu ở bảng `roles`, tham chiếu qua `users.role_id`.
  - Seeder (6.6): thêm 3 role, bài gốc ở cả `vi` và `en`, một phần bài có bản dịch.
  - Điều kiện hoàn thành phase 5: thêm bước "thêm bản dịch cho bài".
- Sample data: đánh lại số thứ tự các mục; số bài theo danh mục tách theo từng ngôn ngữ.

### Removed

- Enum `user_role` (thay bằng bảng `roles`).
- Giá trị `facebook` khỏi enum `oauth_provider` (chỉ còn `google`, `github`).
- Index `users(role, is_active)`, `languages(is_active)`, `ui_translations(key)`.
- Index cũ trên `posts`: `(language_id, status, published_at)`, `(category_id, language_id, status, published_at)`, `(user_id, status)`.
- Mục ngoài phạm vi "Liên kết các bản dịch của cùng một bài viết" (nay đã làm).

# Dữ liệu mẫu (dạng bảng)

Dữ liệu tương ứng với schema trong [database.dbml](database.dbml), lấy từ phần `Records` và điền đủ mọi cột (giá trị mặc định, timestamp, cột nullable).

Quy ước: `NULL` = không có giá trị; `true`/`false` = `TINYINT(1)` 1/0 trong MySQL.

---

## 1. `languages`

| id | code | name       | is_default | is_active | created_at          | updated_at          |
|----|------|------------|------------|-----------|---------------------|---------------------|
| 1  | vi   | Tiếng Việt | true       | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | en   | English    | false      | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 2. `roles`

| id | code        | name        | created_at          | updated_at          |
|----|-------------|-------------|---------------------|---------------------|
| 1  | user        | Người dùng  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | blog_owner  | Blog Owner  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | super_admin | Super Admin | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 3. `users`

| id | full_name     | email             | password_hash         | avatar                   | role_id         | is_active | created_at          | updated_at          |
|----|---------------|-------------------|-----------------------|--------------------------|-----------------|-----------|---------------------|---------------------|
| 1  | Super Admin   | admin@blog.local  | `$2b$10$Xk9...` (bcrypt) | NULL                     | 3 (super_admin) | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | Nguyễn Văn An | owner1@blog.local | `$2b$10$Qa7...` (bcrypt) | uploads/avatars/2.jpg    | 2 (blog_owner)  | true      | 2026-08-10 10:15:00 | 2026-08-10 10:15:00 |
| 3  | Trần Thị Bình | owner2@blog.local | `$2b$10$Lm3...` (bcrypt) | NULL                     | 2 (blog_owner)  | true      | 2026-08-12 14:20:00 | 2026-08-12 14:20:00 |
| 4  | Lê Minh Cường | user@blog.local   | NULL                  | NULL                     | 1 (user)        | true      | 2026-08-20 19:45:00 | 2026-08-20 19:45:00 |

> User 4 đăng ký qua GitHub nên `password_hash = NULL`.

## 4. `oauth_accounts`

| id | user_id | provider | provider_user_id | provider_email  | created_at          | updated_at          |
|----|---------|----------|------------------|-----------------|---------------------|---------------------|
| 1  | 4       | github   | 10293847         | user@blog.local | 2026-08-20 19:45:00 | 2026-08-20 19:45:00 |

## 5. `categories`

| id | created_at          | updated_at          |
|----|---------------------|---------------------|
| 1  | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 2  | 2026-08-02 09:05:00 | 2026-08-02 09:05:00 |

## 6. `category_translations`

| id | category_id | language_id | name        | slug        | created_at          | updated_at          |
|----|-------------|-------------|-------------|-------------|---------------------|---------------------|
| 1  | 1           | 1 (vi)      | Lập trình   | lap-trinh   | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 2  | 1           | 2 (en)      | Programming | programming | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 3  | 2           | 1 (vi)      | Đời sống    | doi-song    | 2026-08-02 09:05:00 | 2026-08-02 09:05:00 |

> Category 2 chưa có bản tiếng Anh → khi xem ở `en` sẽ fallback về "Đời sống".

## 7. `posts`

| id | user_id | language_id (gốc) | category_id | thumbnail           | created_at          | updated_at          |
|----|---------|-------------------|-------------|---------------------|---------------------|---------------------|
| 1  | 2       | 1 (vi)            | 1           | uploads/posts/1.jpg | 2026-08-30 21:00:00 | 2026-09-03 10:00:00 |
| 2  | 2       | 2 (en)            | 1           | uploads/posts/2.jpg | 2026-09-04 16:10:00 | 2026-09-06 08:00:00 |
| 3  | 3       | 1 (vi)            | 2           | NULL                | 2026-09-10 11:00:00 | 2026-09-10 11:00:00 |

## 8. `post_translations`

| id | post_id | language_id | title                       | slug                        | excerpt                           | content                | status    | view_count | published_at        | created_at          | updated_at          |
|----|---------|-------------|-----------------------------|-----------------------------|-----------------------------------|------------------------|-----------|------------|---------------------|---------------------|---------------------|
| 1  | 1       | 1 (vi)      | Hướng dẫn Angular           | huong-dan-angular           | Làm quen với Angular từ con số 0. | `<p>Nội dung...</p>`   | published | 120        | 2026-09-01 08:00:00 | 2026-08-30 21:00:00 | 2026-09-01 08:00:00 |
| 2  | 1       | 2 (en)      | Angular tutorial            | angular-tutorial            | Learn Angular from scratch.       | `<p>Content...</p>`    | published | 30         | 2026-09-03 10:00:00 | 2026-09-02 15:00:00 | 2026-09-03 10:00:00 |
| 3  | 2       | 2 (en)      | Getting started with NestJS | getting-started-with-nestjs | A quick introduction to NestJS.   | `<p>Content...</p>`    | published | 45         | 2026-09-05 09:30:00 | 2026-09-04 16:10:00 | 2026-09-05 09:30:00 |
| 4  | 2       | 1 (vi)      | Bắt đầu với NestJS          | bat-dau-voi-nestjs          | NULL                              | `<p>Nội dung...</p>`   | draft     | 0          | NULL                | 2026-09-06 08:00:00 | 2026-09-06 08:00:00 |
| 5  | 3       | 1 (vi)      | Bản nháp                    | ban-nhap                    | NULL                              | `<p>...</p>`           | draft     | 0          | NULL                | 2026-09-10 11:00:00 | 2026-09-10 11:00:00 |

> - Bản dịch 1, 3, 5 là bản gốc (cùng `language_id` với `posts.language_id`).
> - Post 1 (gốc `vi`) đã dịch sang `en` và cả hai bản đều đã đăng.
> - Post 2 (gốc `en`) có bản dịch `vi` còn `draft` → ở `vi` chưa hiện bài này (không fallback).

## 9. `comments`

| id | post_translation_id | user_id | parent_id | content             | created_at          | updated_at          |
|----|---------------------|---------|-----------|---------------------|---------------------|---------------------|
| 1  | 1 (Hướng dẫn Angular, vi) | 4 | NULL      | Bài viết rất hay!   | 2026-09-02 20:15:00 | 2026-09-02 20:15:00 |
| 2  | 1 (Hướng dẫn Angular, vi) | 2 | 1         | Cảm ơn bạn đã đọc.  | 2026-09-02 21:00:00 | 2026-09-02 21:00:00 |
| 3  | 2 (Angular tutorial, en)  | 4 | NULL      | Great tutorial!     | 2026-09-03 18:30:00 | 2026-09-03 18:30:00 |

> Comment 2 là trả lời (1 cấp) của comment 1. Mỗi bản dịch có luồng bình luận riêng.

## 10. `ui_translations`

| id | language_id | key        | value      | created_at          | updated_at          |
|----|-------------|------------|------------|---------------------|---------------------|
| 1  | 1 (vi)      | menu.home  | Trang chủ  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | 2 (en)      | menu.home  | Home       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | 1 (vi)      | menu.about | Giới thiệu | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 4  | 2 (en)      | menu.about | About      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 11. `pages`

| id | key     | is_visible | created_at          | updated_at          |
|----|---------|------------|---------------------|---------------------|
| 1  | about   | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | contact | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | privacy | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 12. `page_translations`

| id | page_id | language_id | title              | content                            | created_at          | updated_at          |
|----|---------|-------------|--------------------|------------------------------------|---------------------|---------------------|
| 1  | 1       | 1 (vi)      | Giới thiệu         | `<p>Về blog của chúng tôi...</p>`  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | 1       | 2 (en)      | About              | `<p>About our blog...</p>`         | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | 2       | 1 (vi)      | Liên hệ            | `<p>Email: contact@blog.local</p>` | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 4  | 3       | 1 (vi)      | Chính sách bảo mật | `<p>...</p>`                       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

> Trang `contact` và `privacy` chưa có bản `en` → fallback về tiếng Việt.

---

## Dữ liệu sau khi JOIN (góc nhìn ứng dụng)

### Bài viết và bản dịch

| post | tác giả       | ngôn ngữ gốc | danh mục | bản `vi`                            | bản `en`                                    |
|------|---------------|--------------|----------|-------------------------------------|---------------------------------------------|
| 1    | Nguyễn Văn An | vi           | 1        | Hướng dẫn Angular (published, 120 lượt xem, 2 bình luận) | Angular tutorial (published, 30 lượt xem, 1 bình luận) |
| 2    | Nguyễn Văn An | en           | 1        | Bắt đầu với NestJS (draft)          | Getting started with NestJS (published, 45 lượt xem) |
| 3    | Trần Thị Bình | vi           | 2        | Bản nháp (draft)                    | —                                           |

### Trang chủ theo ngôn ngữ (chỉ bản dịch `published`)

| ngôn ngữ | bài hiển thị (mới nhất trước)                      |
|----------|----------------------------------------------------|
| vi       | Hướng dẫn Angular                                  |
| en       | Getting started with NestJS, Angular tutorial      |

### Bình luận

| bản dịch                | người viết    | trả lời cho        | nội dung           |
|-------------------------|---------------|--------------------|--------------------|
| Hướng dẫn Angular (vi)  | Lê Minh Cường | —                  | Bài viết rất hay!  |
| Hướng dẫn Angular (vi)  | Nguyễn Văn An | Lê Minh Cường (#1) | Cảm ơn bạn đã đọc. |
| Angular tutorial (en)   | Lê Minh Cường | —                  | Great tutorial!    |

### Danh mục theo ngôn ngữ (có fallback)

| category_id | vi        | en                         | số bài `vi` (published) | số bài `en` (published) |
|-------------|-----------|----------------------------|-------------------------|-------------------------|
| 1           | Lập trình | Programming                | 1                       | 2                       |
| 2           | Đời sống  | Đời sống *(fallback vi)*   | 0                       | 0                       |

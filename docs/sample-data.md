# Dữ liệu mẫu (dạng bảng)

Dữ liệu tương ứng với schema trong [database.dbml](database.dbml), lấy từ phần `Records` và điền đủ mọi cột (giá trị mặc định, timestamp, cột nullable).

Quy ước: `NULL` = không có giá trị; `true`/`false` = `TINYINT(1)` 1/0 trong MySQL.

---

## 1. `languages`

| id | code | name       | is_default | is_active | created_at          | updated_at          |
|----|------|------------|------------|-----------|---------------------|---------------------|
| 1  | vi   | Tiếng Việt | true       | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | en   | English    | false      | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 2. `users`

| id | full_name     | email             | password_hash         | avatar                   | role        | is_active | created_at          | updated_at          |
|----|---------------|-------------------|-----------------------|--------------------------|-------------|-----------|---------------------|---------------------|
| 1  | Super Admin   | admin@blog.local  | `$2b$10$Xk9...` (bcrypt) | NULL                     | super_admin | true      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | Nguyễn Văn An | owner1@blog.local | `$2b$10$Qa7...` (bcrypt) | uploads/avatars/2.jpg    | blog_owner  | true      | 2026-08-10 10:15:00 | 2026-08-10 10:15:00 |
| 3  | Trần Thị Bình | owner2@blog.local | `$2b$10$Lm3...` (bcrypt) | NULL                     | blog_owner  | true      | 2026-08-12 14:20:00 | 2026-08-12 14:20:00 |
| 4  | Lê Minh Cường | user@blog.local   | NULL                  | NULL                     | user        | true      | 2026-08-20 19:45:00 | 2026-08-20 19:45:00 |

> User 4 đăng ký qua GitHub nên `password_hash = NULL`.

## 3. `oauth_accounts`

| id | user_id | provider | provider_user_id | provider_email  | created_at          | updated_at          |
|----|---------|----------|------------------|-----------------|---------------------|---------------------|
| 1  | 4       | github   | 10293847         | user@blog.local | 2026-08-20 19:45:00 | 2026-08-20 19:45:00 |

## 4. `categories`

| id | created_at          | updated_at          |
|----|---------------------|---------------------|
| 1  | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 2  | 2026-08-02 09:05:00 | 2026-08-02 09:05:00 |

## 5. `category_translations`

| id | category_id | language_id | name        | slug        | created_at          | updated_at          |
|----|-------------|-------------|-------------|-------------|---------------------|---------------------|
| 1  | 1           | 1 (vi)      | Lập trình   | lap-trinh   | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 2  | 1           | 2 (en)      | Programming | programming | 2026-08-02 09:00:00 | 2026-08-02 09:00:00 |
| 3  | 2           | 1 (vi)      | Đời sống    | doi-song    | 2026-08-02 09:05:00 | 2026-08-02 09:05:00 |

> Category 2 chưa có bản tiếng Anh → khi xem ở `en` sẽ fallback về "Đời sống".

## 6. `posts`

| id | user_id | language_id | category_id | title                       | slug                        | excerpt                                  | content              | thumbnail                  | status    | view_count | published_at        | created_at          | updated_at          |
|----|---------|-------------|-------------|-----------------------------|-----------------------------|------------------------------------------|----------------------|----------------------------|-----------|------------|---------------------|---------------------|---------------------|
| 1  | 2       | 1 (vi)      | 1           | Hướng dẫn Angular           | huong-dan-angular           | Làm quen với Angular từ con số 0.        | `<p>Nội dung...</p>` | uploads/posts/1.jpg        | published | 120        | 2026-09-01 08:00:00 | 2026-08-30 21:00:00 | 2026-09-01 08:00:00 |
| 2  | 2       | 2 (en)      | 1           | Getting started with NestJS | getting-started-with-nestjs | A quick introduction to NestJS.          | `<p>Content...</p>`  | uploads/posts/2.jpg        | published | 45         | 2026-09-05 09:30:00 | 2026-09-04 16:10:00 | 2026-09-05 09:30:00 |
| 3  | 3       | 1 (vi)      | 2           | Bản nháp                    | ban-nhap                    | NULL                                     | `<p>...</p>`         | NULL                       | draft     | 0          | NULL                | 2026-09-10 11:00:00 | 2026-09-10 11:00:00 |

## 7. `comments`

| id | post_id | user_id | parent_id | content             | created_at          | updated_at          |
|----|---------|---------|-----------|---------------------|---------------------|---------------------|
| 1  | 1       | 4       | NULL      | Bài viết rất hay!   | 2026-09-02 20:15:00 | 2026-09-02 20:15:00 |
| 2  | 1       | 2       | 1         | Cảm ơn bạn đã đọc.  | 2026-09-02 21:00:00 | 2026-09-02 21:00:00 |

> Comment 2 là trả lời (1 cấp) của comment 1.

## 8. `ui_translations`

| id | language_id | key        | value      | created_at          | updated_at          |
|----|-------------|------------|------------|---------------------|---------------------|
| 1  | 1 (vi)      | menu.home  | Trang chủ  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | 2 (en)      | menu.home  | Home       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | 1 (vi)      | menu.about | Giới thiệu | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 4  | 2 (en)      | menu.about | About      | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 9. `pages`

| id | key     | is_visible | created_at          | updated_at          |
|----|---------|------------|---------------------|---------------------|
| 1  | about   | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | contact | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | privacy | true       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

## 10. `page_translations`

| id | page_id | language_id | title              | content                            | created_at          | updated_at          |
|----|---------|-------------|--------------------|------------------------------------|---------------------|---------------------|
| 1  | 1       | 1 (vi)      | Giới thiệu         | `<p>Về blog của chúng tôi...</p>`  | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 2  | 1       | 2 (en)      | About              | `<p>About our blog...</p>`         | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 3  | 2       | 1 (vi)      | Liên hệ            | `<p>Email: contact@blog.local</p>` | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |
| 4  | 3       | 1 (vi)      | Chính sách bảo mật | `<p>...</p>`                       | 2026-08-01 00:00:00 | 2026-08-01 00:00:00 |

> Trang `contact` và `privacy` chưa có bản `en` → fallback về tiếng Việt.

---

## Dữ liệu sau khi JOIN (góc nhìn ứng dụng)

### Bài viết

| post | tác giả       | ngôn ngữ | danh mục (theo ngôn ngữ bài)        | trạng thái | lượt xem | số bình luận |
|------|---------------|----------|-------------------------------------|------------|----------|--------------|
| Hướng dẫn Angular           | Nguyễn Văn An | vi | Lập trình                    | published | 120 | 2 |
| Getting started with NestJS | Nguyễn Văn An | en | Programming                  | published | 45  | 0 |
| Bản nháp                    | Trần Thị Bình | vi | Đời sống                     | draft     | 0   | 0 |

### Bình luận

| bài viết          | người viết    | trả lời cho        | nội dung           |
|-------------------|---------------|--------------------|--------------------|
| Hướng dẫn Angular | Lê Minh Cường | —                  | Bài viết rất hay!  |
| Hướng dẫn Angular | Nguyễn Văn An | Lê Minh Cường (#1) | Cảm ơn bạn đã đọc. |

### Danh mục theo ngôn ngữ (có fallback)

| category_id | vi        | en                         | số bài |
|-------------|-----------|----------------------------|--------|
| 1           | Lập trình | Programming                | 2      |
| 2           | Đời sống  | Đời sống *(fallback vi)*   | 1      |

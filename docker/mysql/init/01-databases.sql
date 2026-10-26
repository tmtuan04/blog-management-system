-- Chạy một lần khi volume MySQL còn trống.
-- blog_dev do MYSQL_DATABASE tạo sẵn; ở đây thêm blog_test và cấp quyền cho user blog.
CREATE DATABASE IF NOT EXISTS blog_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS blog_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON blog_dev.* TO 'blog'@'%';
GRANT ALL PRIVILEGES ON blog_test.* TO 'blog'@'%';
FLUSH PRIVILEGES;

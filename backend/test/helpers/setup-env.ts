import { tmpdir } from 'os';
import { join } from 'path';

// Chạy trước mỗi file test: database blog_test, Redis db 1 (src/config/configuration.ts)
process.env.NODE_ENV = 'test';
// Ảnh upload trong test ghi vào thư mục tạm, không lẫn với uploads/ của dev
process.env.UPLOAD_DIR = join(tmpdir(), 'blog-e2e-uploads');

import { tmpdir } from 'os';
import { join } from 'path';

// Chạy trước mỗi file test: database blog_test, Redis db 1 (src/config/configuration.ts)
process.env.NODE_ENV = 'test';
// Ảnh upload trong test ghi vào thư mục tạm, không lẫn với uploads/ của dev
process.env.UPLOAD_DIR = join(tmpdir(), 'blog-e2e-uploads');
// OAuth (UC20): giá trị cố định, không dùng app OAuth thật trong .env. Test không gọi
// GitHub thật, test/oauth.e2e-spec.ts mock bước đổi token và đọc profile
process.env.GITHUB_CLIENT_ID = 'test-github-client';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
process.env.GITHUB_CALLBACK_URL =
  'http://localhost:3000/api/v1/auth/github/callback';

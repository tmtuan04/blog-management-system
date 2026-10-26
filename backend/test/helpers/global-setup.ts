import { execSync } from 'child_process';
import { resolve } from 'path';

/** Chạy migrations trên database test một lần trước toàn bộ e2e test */
export default function globalSetup(): void {
  execSync('npx sequelize-cli db:migrate --env test', {
    cwd: resolve(__dirname, '..', '..'),
    stdio: 'pipe',
  });
}

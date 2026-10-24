import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PNG_1PX } from '../../../test/helpers/fixtures';
import { AppException } from '../../common/errors';
import { UploadService } from './upload.service';

const fileOf = (originalname: string, buffer: Buffer) =>
  ({ originalname, buffer, size: buffer.length }) as Express.Multer.File;

describe('UploadService', () => {
  let dir: string;
  let service: UploadService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'blog-upload-'));
    const config = {
      get: () => ({ dir, maxSize: 1024 }),
    } as unknown as ConfigService;
    service = new UploadService(config as never);
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  const errorOf = (promise: Promise<unknown>) =>
    promise.catch((e: unknown) => e as AppException);

  it('lưu ảnh với tên UUID và trả đường dẫn uploads/images/...', async () => {
    const path = await service.saveImage(fileOf('a.PNG', PNG_1PX), 'images');
    expect(path).toMatch(/^uploads\/images\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(service.toDiskPath(path)!)).toBe(true);
    await expect(service.exists(path)).resolves.toBe(true);
  });

  it('không có file thì báo lỗi field file', async () => {
    const error = await errorOf(service.saveImage(undefined, 'images'));
    expect((error as AppException).errors?.[0].field).toBe('file');
  });

  it('từ chối đuôi không cho phép', async () => {
    const error = await errorOf(
      service.saveImage(fileOf('a.php', PNG_1PX), 'images'),
    );
    expect((error as AppException).errors?.[0].message).toContain('JPG, PNG');
  });

  it('từ chối file .php đổi tên thành .jpg (MIME thật không khớp)', async () => {
    const error = await errorOf(
      service.saveImage(
        fileOf('shell.jpg', Buffer.from('<?php echo 1; ?>')),
        'images',
      ),
    );
    expect((error as AppException).errors?.[0].message).toBe(
      'File không phải ảnh hợp lệ.',
    );
  });

  it('từ chối ảnh PNG đặt đuôi .jpg', async () => {
    const error = await errorOf(
      service.saveImage(fileOf('a.jpg', PNG_1PX), 'images'),
    );
    expect(error).toBeInstanceOf(AppException);
  });

  it('từ chối file lớn hơn giới hạn', async () => {
    const big = Buffer.concat([PNG_1PX, Buffer.alloc(2048)]);
    const error = await errorOf(
      service.saveImage(fileOf('a.png', big), 'images'),
    );
    expect((error as AppException).errors?.[0].message).toBe('Ảnh tối đa 2MB.');
  });

  it('toDiskPath chỉ nhận đường dẫn đúng định dạng (chặn ../)', () => {
    expect(service.toDiskPath('uploads/images/../../etc/passwd')).toBeNull();
    expect(service.toDiskPath('uploads/other/a.png')).toBeNull();
  });

  it('remove xóa file, file không còn thì bỏ qua', async () => {
    const path = await service.saveImage(fileOf('a.png', PNG_1PX), 'avatars');
    await service.remove(path);
    expect(existsSync(service.toDiskPath(path)!)).toBe(false);
    await expect(service.remove(path)).resolves.toBeUndefined();
    await expect(service.remove(null)).resolves.toBeUndefined();
    await expect(service.exists('uploads/images/x.png')).resolves.toBe(false);
  });
});

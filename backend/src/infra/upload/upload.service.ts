import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { fromBuffer } from 'file-type';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { AppException } from '../../common/errors';
import { AppConfig } from '../../config/configuration';

export type UploadFolder = 'images' | 'avatars';

/** Đuôi file → MIME thật phải đọc được từ nội dung file */
const ALLOWED: Record<string, { mime: string; ext: string }> = {
  '.jpg': { mime: 'image/jpeg', ext: 'jpg' },
  '.jpeg': { mime: 'image/jpeg', ext: 'jpg' },
  '.png': { mime: 'image/png', ext: 'png' },
  '.webp': { mime: 'image/webp', ext: 'webp' },
};

/** Đường dẫn lưu trong DB: `uploads/images/<uuid>.jpg` */
export const UPLOAD_PATH_PATTERN =
  /^uploads\/(images|avatars)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const fileError = (message: string) =>
  AppException.validation([{ field: 'file', message }]);

/**
 * Lưu ảnh vào thư mục upload (phase 3 doc mục 3.6): kiểm tra đuôi, MIME đọc từ
 * magic bytes, dung lượng; đổi tên thành UUID.
 */
@Injectable()
export class UploadService {
  private readonly rootDir: string;
  private readonly maxSize: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const upload = config.get('upload', { infer: true });
    this.rootDir = resolve(upload.dir);
    this.maxSize = upload.maxSize;
  }

  get root(): string {
    return this.rootDir;
  }

  async saveImage(
    file: Express.Multer.File | undefined,
    folder: UploadFolder,
  ): Promise<string> {
    if (!file?.buffer?.length) {
      throw fileError('Vui lòng chọn ảnh.');
    }
    const allowed = ALLOWED[extname(file.originalname).toLowerCase()];
    if (!allowed) {
      throw fileError('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
    }
    if (file.size > this.maxSize) {
      throw fileError('Ảnh tối đa 2MB.');
    }
    const detected = await fromBuffer(file.buffer);
    if (detected?.mime !== allowed.mime) {
      throw fileError('File không phải ảnh hợp lệ.');
    }

    const name = `${randomUUID()}.${allowed.ext}`;
    await mkdir(join(this.rootDir, folder), { recursive: true });
    await writeFile(join(this.rootDir, folder, name), file.buffer);
    return `uploads/${folder}/${name}`;
  }

  /** Đường dẫn trên đĩa của file đã upload. Sai định dạng thì trả null */
  toDiskPath(publicPath: string): string | null {
    if (!UPLOAD_PATH_PATTERN.test(publicPath)) {
      return null;
    }
    return join(this.rootDir, publicPath.slice('uploads/'.length));
  }

  /** Dùng để kiểm tra trường `thumbnail` trong DTO: file phải tồn tại */
  async exists(publicPath: string): Promise<boolean> {
    const diskPath = this.toDiskPath(publicPath);
    if (!diskPath) {
      return false;
    }
    try {
      return (await stat(diskPath)).isFile();
    } catch {
      return false;
    }
  }

  /** Xóa file cũ khi đổi/xóa thumbnail, đổi avatar, xóa bài. File không còn thì bỏ qua */
  async remove(publicPath: string | null | undefined): Promise<void> {
    const diskPath = publicPath ? this.toDiskPath(publicPath) : null;
    if (!diskPath) {
      return;
    }
    try {
      await unlink(diskPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

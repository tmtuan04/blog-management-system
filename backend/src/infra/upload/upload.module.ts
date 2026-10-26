import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppConfig } from '../../config/configuration';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * Module nào có route upload (ví dụ profile/avatar) thì import UploadModule
 * để dùng chung giới hạn dung lượng của multer.
 */
@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        // Giữ file trong bộ nhớ để đọc magic bytes trước khi ghi đĩa
        storage: memoryStorage(),
        limits: {
          fileSize: config.get('upload', { infer: true }).maxSize,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService, MulterModule],
})
export class UploadModule {}

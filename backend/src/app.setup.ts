import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'path';
import { AppConfig } from './config/configuration';

export const API_PREFIX = 'api/v1';

/** Cấu hình dùng chung cho main.ts và app trong e2e test */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  // Lấy đúng IP người dùng khi chạy sau Nginx (phase 5), dùng cho rate limit và lượt xem
  app.set('trust proxy', 'loopback');
  // Nội dung bài viết có thể dài hơn mặc định 100kb
  app.useBodyParser('json', { limit: '5mb' });
  app.use(
    helmet({
      // Frontend ở domain khác cần tải được ảnh trong /uploads
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: config.get('frontendUrl', { infer: true }),
  });
  // Ảnh upload phục vụ tĩnh tại /uploads (phase 5 do Nginx làm). Dùng useStaticAssets
  // thay ServeStaticModule vì module đó không đăng ký được trong app của e2e test
  app.useStaticAssets(resolve(config.get('upload', { infer: true }).dir), {
    prefix: '/uploads/',
    index: false,
  });
  app.enableShutdownHooks();
}

/** Swagger tại /api-docs, có nút Authorize kiểu Bearer (phase 3 doc mục 3.9) */
export function setupSwagger(app: NestExpressApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Blog Management System API')
      .setDescription(
        'API phase 3. Mọi response theo format requirements 6.4. ' +
          'Gửi header Accept-Language (vi, en...) để chọn ngôn ngữ nội dung.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}

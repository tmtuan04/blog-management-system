import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);

  const port = app
    .get<ConfigService<AppConfig, true>>(ConfigService)
    .get('port', { infer: true });
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/api-docs`, 'Bootstrap');
}

void bootstrap();

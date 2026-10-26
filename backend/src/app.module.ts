import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LanguageMiddleware } from './common/middleware/language.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import configuration, { AppConfig } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './infra/database/database.module';
import { MailModule } from './infra/mail/mail.module';
import { RedisModule } from './infra/redis/redis.module';
import { UploadModule } from './infra/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { LanguagesModule } from './modules/languages/languages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      // Báo hết các biến thiếu trong một lần
      validationOptions: { abortEarly: false },
    }),
    // Bộ đếm rate limit lưu trong Redis, key bắt đầu bằng throttle:
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        return {
          throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
          // Truyền options (không truyền client) để storage tự đóng kết nối khi app tắt
          storage: new ThrottlerStorageRedisService({
            host: redis.host,
            port: redis.port,
            password: redis.password || undefined,
            db: redis.db,
            keyPrefix: 'throttle:',
          }),
        };
      },
    }),
    DatabaseModule,
    RedisModule,
    MailModule,
    UploadModule,
    AuthModule,
    LanguagesModule,
  ],
  providers: [
    // Thứ tự guard: rate limit → xác thực → phân quyền
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LanguageMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/configuration';
import { CacheService } from './cache.service';
import { REDIS_CLIENT, RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        return new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          db: redis.db,
        });
      },
    },
    RedisService,
    CacheService,
  ],
  exports: [RedisService, CacheService],
})
export class RedisModule {}

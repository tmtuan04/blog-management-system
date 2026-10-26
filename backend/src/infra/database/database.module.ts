import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppConfig } from '../../config/configuration';
import { MODELS } from './models';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('db', { infer: true });
        const logger = new Logger('SQL');
        return {
          dialect: 'mysql',
          host: db.host,
          port: db.port,
          database: db.name,
          username: db.user,
          password: db.password,
          timezone: '+00:00',
          dialectOptions: { charset: 'utf8mb4' },
          define: { underscored: true },
          models: MODELS,
          synchronize: false,
          // Dev in SQL để kiểm tra N+1 (phase 3 doc mục 7.2)
          logging:
            config.get('env', { infer: true }) === 'development'
              ? (sql: string) => logger.debug(sql)
              : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}

import { parseDuration } from '../common/utils/duration';

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  frontendUrl: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    accessSecret: string;
    /** Giây */
    accessTtl: number;
    refreshSecret: string;
    /** Giây */
    refreshTtl: number;
  };
  mail: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  upload: {
    dir: string;
    maxSize: number;
  };
}

/**
 * Chạy sau envValidationSchema nên mọi biến đã có giá trị và đúng kiểu.
 * NODE_ENV=test dùng database blog_test và Redis db 1 (phase 3 doc mục 2.1).
 */
export default (): AppConfig => {
  const env = process.env as Record<string, string>;
  const isTest = env.NODE_ENV === 'test';

  return {
    env: env.NODE_ENV as AppConfig['env'],
    port: Number(env.PORT),
    frontendUrl: env.FRONTEND_URL,
    db: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      name: isTest ? env.DB_TEST_NAME : env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },
    redis: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
      db: Number(isTest ? env.REDIS_TEST_DB : env.REDIS_DB),
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: parseDuration(env.JWT_ACCESS_TTL),
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshTtl: parseDuration(env.JWT_REFRESH_TTL),
    },
    mail: {
      host: env.MAIL_HOST,
      port: Number(env.MAIL_PORT),
      user: env.MAIL_USER,
      password: env.MAIL_PASSWORD,
      from: env.MAIL_FROM,
    },
    upload: {
      dir: env.UPLOAD_DIR,
      maxSize: Number(env.UPLOAD_MAX_SIZE),
    },
  };
};

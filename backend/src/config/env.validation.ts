import * as Joi from 'joi';

const DURATION = /^\d+[smhd]?$/;

/**
 * Danh sách biến ở phase 3 doc mục 7.3. Thiếu biến bắt buộc thì app dừng lúc khởi động
 * và báo tên biến (abortEarly: false để báo hết một lần).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  // Chỉ dùng khi NODE_ENV=test, mặc định blog_test
  DB_TEST_NAME: Joi.string().default('blog_test'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  // Chỉ dùng khi NODE_ENV=test, mặc định db 1
  REDIS_TEST_DB: Joi.number().integer().min(0).default(1),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().pattern(DURATION).default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_TTL: Joi.string().pattern(DURATION).default('7d'),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().port().required(),
  MAIL_USER: Joi.string().allow('').required(),
  MAIL_PASSWORD: Joi.string().allow('').required(),
  MAIL_FROM: Joi.string().required(),

  // OAuth (UC20, việc A6): chưa bắt buộc cho tới khi làm A6
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().allow('').default(''),
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_CALLBACK_URL: Joi.string().allow('').default(''),

  UPLOAD_DIR: Joi.string().default('uploads'),
  UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .positive()
    .default(2 * 1024 * 1024),
});

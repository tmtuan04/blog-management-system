/**
 * Mọi key Redis đặt ở đây, không viết chuỗi key rải rác trong service
 * (phase 3 doc mục 3.5).
 */
export const RedisKeys = {
  // Auth (UC02, UC03, UC04, UC20)
  refreshToken: (jti: string) => `auth:refresh:${jti}`,
  userRefreshTokens: (userId: number) => `auth:user-refresh:${userId}`,
  resetToken: (token: string) => `auth:reset:${token}`,
  loginFail: (ip: string, email: string) => `auth:login-fail:${ip}:${email}`,
  oauthCode: (code: string) => `auth:oauth-code:${code}`,
  userActive: (userId: number) => `auth:user-active:${userId}`,

  // Lượt xem (UC06)
  view: (translationId: number, ip: string) => `view:${translationId}:${ip}`,

  // Cache response
  languagesActive: () => 'cache:languages:active',
  uiTranslations: (code: string) => `cache:ui:${code}`,
} as const;

/** Prefix dùng với CacheService.invalidate() */
export const CachePrefix = {
  all: 'cache:',
  posts: 'cache:posts:',
  categories: 'cache:categories:',
  languages: 'cache:languages:',
  ui: 'cache:ui:',
} as const;

/** TTL (giây) */
export const CacheTtl = {
  posts: 5 * 60,
  categories: 10 * 60,
  languages: 10 * 60,
  ui: 10 * 60,
  userActive: 60,
  view: 60 * 60,
  oauthCode: 60,
  resetToken: 15 * 60,
  loginFail: 15 * 60,
} as const;

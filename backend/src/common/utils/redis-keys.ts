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
  postsList: (code: string, page: number, limit: number) =>
    `cache:posts:list:${code}:${page}:${limit}`,
  postsPopular: (code: string, limit: number) =>
    `cache:posts:popular:${code}:${limit}`,

  // UC07 - Danh mục công khai
  categoriesList: (code: string) => `cache:categories:list:${code}`,

  categoryDetail: (code: string, slug: string) =>
    `cache:categories:detail:${code}:${slug}`,

  categoryPosts: (
    code: string,
    categoryId: number,
    page: number,
    limit: number,
  ) => `cache:posts:category:${code}:${categoryId}:${page}:${limit}`,
  languagesActive: () => 'cache:languages:active',
} as const;

/** Prefix dùng với CacheService.invalidate() */
export const CachePrefix = {
  all: 'cache:',
  posts: 'cache:posts:',
  categories: 'cache:categories:',
  languages: 'cache:languages:',
} as const;

/** TTL (giây) */
export const CacheTtl = {
  posts: 5 * 60,
  categories: 10 * 60,
  languages: 10 * 60,
  userActive: 60,
  view: 60 * 60,
  oauthCode: 60,
  resetToken: 15 * 60,
  loginFail: 15 * 60,
} as const;

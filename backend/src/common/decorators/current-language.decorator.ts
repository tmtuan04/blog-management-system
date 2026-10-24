import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AppException } from '../errors';
import { AppRequest, RequestLanguage } from '../types/request-context';

/**
 * Ngôn ngữ của request `{ id, code, isDefault }` do LanguageMiddleware gắn.
 * Mọi API public dùng ngôn ngữ này, không nhận `?lang=` (phase 3 doc mục 3.3).
 */
export const CurrentLanguage = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestLanguage => {
    const language = ctx.switchToHttp().getRequest<AppRequest>().language;
    if (!language) {
      // Chỉ xảy ra khi database chưa có ngôn ngữ nào (chưa chạy seeder)
      throw AppException.notFound('Chưa có ngôn ngữ nào');
    }
    return language;
  },
);

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { LanguagesService } from '../../modules/languages/languages.service';
import { AppRequest } from '../types/request-context';

/** Đọc Accept-Language, gắn req.language để `@CurrentLanguage()` dùng */
@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  constructor(private readonly languagesService: LanguagesService) {}

  async use(req: AppRequest, _res: Response, next: NextFunction) {
    try {
      req.language =
        (await this.languagesService.resolve(req.headers['accept-language'])) ??
        undefined;
      next();
    } catch (error) {
      next(error);
    }
  }
}

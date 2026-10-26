import { Request } from 'express';
import { RoleCode } from '../../modules/users/models/role.model';

/** Người đang đăng nhập, lấy từ access token (gắn vào req.user) */
export interface AuthUser {
  id: number;
  role: RoleCode;
  jti: string;
}

/** Ngôn ngữ của request, lấy từ Accept-Language (gắn vào req.language) */
export interface RequestLanguage {
  id: number;
  code: string;
  isDefault: boolean;
}

export type AppRequest = Request & {
  user?: AuthUser;
  language?: RequestLanguage;
};

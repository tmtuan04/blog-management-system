import { AuthUser } from '../models/auth-user.model';

/** `TokenPairDto`: response của `POST /auth/refresh` */
export interface TokenPair {
  /** JWT, hạn 15 phút */
  accessToken: string;
  /** Hạn 7 ngày, xoay vòng: mỗi lần refresh nhận token mới, token cũ bị thu hồi */
  refreshToken: string;
}

/** `LoginResponseDto`: response của `POST /auth/login`, `POST /auth/oauth/exchange` */
export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

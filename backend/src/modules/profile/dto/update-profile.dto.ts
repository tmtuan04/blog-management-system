import { FullNameField } from '../../auth/dto/auth-fields';

/**
 * UC12. Không có `email`, `role`: ValidationPipe (`whitelist` +
 * `forbidNonWhitelisted`) trả 400 nếu client gửi lên, nên không tự đổi được.
 */
export class UpdateProfileDto {
  /** 2-150 ký tự, ràng buộc giống UC01 */
  @FullNameField()
  fullName!: string;
}

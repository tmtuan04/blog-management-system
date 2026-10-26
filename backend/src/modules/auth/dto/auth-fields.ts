import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Ràng buộc dùng chung cho các DTO xác thực (UC01). Câu chữ lấy theo
 * `invalid-feedback` của các màn HTML phase 2.
 */
export const REQUIRED_MESSAGE = 'Vui lòng nhập trường này.';
export const PASSWORD_MESSAGE =
  'Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.';
export const PASSWORD_MISMATCH_MESSAGE = 'Mật khẩu xác nhận không khớp.';

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

/** Email: bỏ khoảng trắng, chữ thường */
export const EmailField = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsNotEmpty({ message: REQUIRED_MESSAGE }),
    IsEmail({}, { message: 'Email không hợp lệ.' }),
    MaxLength(255, { message: 'Email tối đa 255 ký tự.' }),
  );

/** Họ tên 2-150 ký tự sau khi bỏ khoảng trắng hai đầu */
export const FullNameField = () =>
  applyDecorators(
    trim,
    IsString({ message: 'Họ tên từ 2 đến 150 ký tự.' }),
    Length(2, 150, { message: 'Họ tên từ 2 đến 150 ký tự.' }),
  );

/**
 * Mật khẩu mới: ít nhất 8 ký tự, có cả chữ và số. Tối đa 72 ký tự vì bcrypt
 * chỉ dùng 72 byte đầu.
 */
export const NewPasswordField = () =>
  applyDecorators(
    IsString({ message: PASSWORD_MESSAGE }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, { message: PASSWORD_MESSAGE }),
    MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự.' }),
  );

import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { AppException } from '../errors';
import { createValidationPipe } from './validation.pipe';

class TranslationDto {
  @IsString()
  @MinLength(5, { message: 'Tiêu đề từ 5 ký tự' })
  title!: string;
}

class BodyDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;

  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const transform = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: BodyDto });

  it('đổi lỗi thành errors[] với field lồng nhau dạng translations.0.title', async () => {
    const error = (await transform({
      email: 'x',
      translations: [{ title: 'abc' }],
    }).catch((e: unknown) => e)) as AppException;

    expect(error).toBeInstanceOf(AppException);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors).toEqual([
      { field: 'email', message: 'Email không hợp lệ.' },
      { field: 'translations.0.title', message: 'Tiêu đề từ 5 ký tự' },
    ]);
  });

  it('chặn field không khai báo trong DTO', async () => {
    const error = (await transform({
      email: 'a@b.com',
      translations: [],
      role: 'super_admin',
    }).catch((e: unknown) => e)) as AppException;

    expect(error.errors).toEqual([
      { field: 'role', message: 'Trường này không được phép' },
    ]);
  });
});

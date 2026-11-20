import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { flattenValidationErrors } from '../../../common/pipes/validation.pipe';
import {
  COMMENT_HTML_MESSAGE,
  COMMENT_LENGTH_MESSAGE,
  COMMENT_PARENT_MESSAGE,
  CreateCommentDto,
} from './create-comment.dto';

/** Chạy qua cùng cách ValidationPipe gom lỗi: mỗi field lấy lỗi đầu tiên */
async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateCommentDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
  });
  return { dto, errors: flattenValidationErrors(errors) };
}

describe('CreateCommentDto - UC08', () => {
  it('nhận nội dung hợp lệ và bỏ khoảng trắng hai đầu', async () => {
    const { dto, errors } = await check({ content: '  Bài viết rất hay!  ' });
    expect(errors).toEqual([]);
    expect(dto.content).toBe('Bài viết rất hay!');
  });

  it('nhận nội dung nhiều dòng và ký tự < > không tạo thành thẻ', async () => {
    const { errors } = await check({ content: 'Dòng 1\nDòng 2: 3 < 5 > 2' });
    expect(errors).toEqual([]);
  });

  it.each([
    ['rỗng', ''],
    ['chỉ có khoảng trắng', '   \n  '],
    ['dài 1001 ký tự', 'a'.repeat(1001)],
  ])('nội dung %s thì báo lỗi độ dài', async (_, content) => {
    const { errors } = await check({ content });
    expect(errors).toEqual([
      { field: 'content', message: COMMENT_LENGTH_MESSAGE },
    ]);
  });

  it('nhận đúng 1 và 1000 ký tự', async () => {
    expect((await check({ content: 'a' })).errors).toEqual([]);
    expect((await check({ content: 'a'.repeat(1000) })).errors).toEqual([]);
  });

  it('thiếu hoặc sai kiểu thì báo lỗi độ dài', async () => {
    expect((await check({})).errors).toEqual([
      { field: 'content', message: COMMENT_LENGTH_MESSAGE },
    ]);
    expect((await check({ content: 123 })).errors).toEqual([
      { field: 'content', message: COMMENT_LENGTH_MESSAGE },
    ]);
  });

  it.each([
    '<script>alert(1)</script>',
    'Xin chào <b>bạn</b>',
    '<img src=x onerror=alert(1)>',
  ])('nội dung có thẻ HTML %s bị từ chối', async (content) => {
    const { errors } = await check({ content });
    expect(errors).toEqual([
      { field: 'content', message: COMMENT_HTML_MESSAGE },
    ]);
  });

  it('parentId là số nguyên dương hoặc không gửi', async () => {
    expect((await check({ content: 'a', parentId: 3 })).errors).toEqual([]);
    expect((await check({ content: 'a', parentId: null })).errors).toEqual([]);
    expect((await check({ content: 'a' })).errors).toEqual([]);
  });

  it.each([0, -1, 1.5, 'abc'])('parentId %p không hợp lệ', async (parentId) => {
    const { errors } = await check({ content: 'a', parentId });
    expect(errors).toEqual([
      { field: 'parentId', message: COMMENT_PARENT_MESSAGE },
    ]);
  });

  it('không nhận field lạ', async () => {
    const { errors } = await check({ content: 'a', userId: 1 });
    expect(errors.map((e) => e.field)).toEqual(['userId']);
  });
});

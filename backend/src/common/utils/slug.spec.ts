import { generateUniqueSlug, toSlug } from './slug';

describe('toSlug', () => {
  it('bỏ dấu tiếng Việt, đ → d, chữ thường, nối bằng -', () => {
    expect(toSlug('Hướng dẫn Đăng nhập với NestJS!')).toBe(
      'huong-dan-dang-nhap-voi-nestjs',
    );
  });

  it('cắt còn tối đa 250 ký tự và không để - ở cuối', () => {
    const slug = toSlug('a '.repeat(300));
    expect(slug.length).toBeLessThanOrEqual(250);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('generateUniqueSlug', () => {
  const modelWith = (slugs: string[]) => ({
    findAll: jest.fn().mockResolvedValue(slugs.map((slug) => ({ slug }))),
  });

  it('chưa trùng thì giữ nguyên slug', async () => {
    await expect(
      generateUniqueSlug('Lập trình', 1, modelWith([])),
    ).resolves.toBe('lap-trinh');
  });

  it('trùng trong cùng ngôn ngữ thì thêm -2, -3', async () => {
    await expect(
      generateUniqueSlug('Lập trình', 1, modelWith(['lap-trinh'])),
    ).resolves.toBe('lap-trinh-2');
    await expect(
      generateUniqueSlug(
        'Lập trình',
        1,
        modelWith(['lap-trinh', 'lap-trinh-2']),
      ),
    ).resolves.toBe('lap-trinh-3');
  });

  it('chỉ tìm trong cùng ngôn ngữ và bỏ qua bản ghi đang sửa', async () => {
    const model = modelWith([]);
    await generateUniqueSlug('Bài viết', 2, model, { excludeId: 5 });
    const { where } = model.findAll.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.languageId).toBe(2);
    expect(where.id).toBeDefined();
  });

  it('tiêu đề không có chữ cái hợp lệ thì dùng n-a', async () => {
    await expect(generateUniqueSlug('!!!', 1, modelWith([]))).resolves.toBe(
      'n-a',
    );
  });
});

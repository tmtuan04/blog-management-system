import { Sequelize } from 'sequelize-typescript';
import { AppException } from '../../common/errors';
import { Language } from '../languages/models/language.model';
import { AdminPagesService } from './admin-pages.service';
import { PageTranslation } from './models/page-translation.model';
import { Page } from './models/page.model';

// Bộ lọc XSS có test riêng (html-sanitize.spec.ts). Ở đây chỉ cần biết service gọi nó
// và lưu đúng kết quả trả về, nên dùng bản giả đơn giản
jest.mock('../../common/utils/html-sanitize', () => ({
  sanitizeRichText: jest.fn((html: string) =>
    html.replace(/<script[\s\S]*?<\/script>/g, '').trim(),
  ),
  hasRichTextContent: jest.fn(
    (html: string) =>
      /<img\s/i.test(html) ||
      html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim().length > 0,
  ),
}));

import { sanitizeRichText } from '../../common/utils/html-sanitize';

describe('AdminPagesService (UC18)', () => {
  const pageModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const translationModel = {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  };
  const languageModel = { findAll: jest.fn() };
  const transaction = { id: 'tx', LOCK: { UPDATE: 'UPDATE' } };
  const sequelize = {
    transaction: jest.fn(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    ),
  };
  const service = new AdminPagesService(
    pageModel as unknown as typeof Page,
    translationModel as unknown as typeof PageTranslation,
    languageModel as unknown as typeof Language,
    sequelize as unknown as Sequelize,
  );

  const VI = {
    id: 1,
    code: 'vi',
    name: 'Tiếng Việt',
    isDefault: true,
    isActive: true,
  };
  const EN = {
    id: 2,
    code: 'en',
    name: 'English',
    isDefault: false,
    isActive: true,
  };
  const JA = {
    id: 3,
    code: 'ja',
    name: '日本語',
    isDefault: false,
    isActive: false,
  };
  const UPDATED_AT = new Date('2026-11-20T10:00:00Z');

  const tr = (
    languageId: number,
    title: string,
    content = `<p>${title}</p>`,
  ) => ({
    languageId,
    title,
    content,
  });
  const pageRow = (
    key: string,
    translations: ReturnType<typeof tr>[] = [],
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 10,
    key,
    isVisible: true,
    updatedAt: UPDATED_AT,
    translations,
    ...overrides,
  });
  /** Dòng page_translations giả: update() ghi đè field như Sequelize */
  const translationRow = (
    languageId: number,
    title: string,
    content: string,
  ) => {
    const row: Record<string, unknown> = {
      id: languageId * 100,
      languageId,
      title,
      content,
    };
    row.update = jest.fn((values: Record<string, unknown>) => {
      Object.assign(row, values);
      return Promise.resolve(row);
    });
    return row as typeof row & { update: jest.Mock };
  };

  const expectError = async (
    promise: Promise<unknown>,
    status: number,
    code: string,
  ): Promise<AppException> => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(status);
    expect((error as AppException).code).toBe(code);
    return error as AppException;
  };

  beforeEach(() => {
    // Không dùng resetAllMocks: nó xóa cả bản giả của html-sanitize ở đầu file
    for (const mock of [
      ...Object.values(pageModel),
      ...Object.values(translationModel),
      ...Object.values(languageModel),
    ]) {
      mock.mockReset();
    }
    sequelize.transaction.mockClear();
    sequelize.transaction.mockImplementation(
      async <T>(callback: (t: unknown) => Promise<T>): Promise<T> =>
        callback(transaction),
    );
    pageModel.update.mockResolvedValue([1]);
    translationModel.findAll.mockResolvedValue([]);
    translationModel.destroy.mockResolvedValue(0);
  });

  describe('list', () => {
    it('trả mọi trang kể cả đang ẩn: tiêu đề mặc định, ngôn ngữ đang hoạt động đã có nội dung, không lấy content', async () => {
      languageModel.findAll.mockResolvedValue([VI, EN]);
      pageModel.findAll.mockResolvedValue([
        pageRow('about', [tr(1, 'Giới thiệu'), tr(2, 'About'), tr(3, '概要')]),
        pageRow('contact', [tr(1, 'Liên hệ')]),
        pageRow('privacy', [tr(1, 'Chính sách bảo mật')], { isVisible: false }),
      ]);

      const result = await service.list();

      expect(result).toEqual([
        {
          key: 'about',
          title: 'Giới thiệu',
          // ja đang tắt nên không tính, mặc định đứng đầu
          languages: ['vi', 'en'],
          isVisible: true,
          updatedAt: UPDATED_AT,
        },
        {
          key: 'contact',
          title: 'Liên hệ',
          languages: ['vi'],
          isVisible: true,
          updatedAt: UPDATED_AT,
        },
        {
          key: 'privacy',
          title: 'Chính sách bảo mật',
          languages: ['vi'],
          isVisible: false,
          updatedAt: UPDATED_AT,
        },
      ]);
      const options = pageModel.findAll.mock.calls[0][0] as {
        include: { attributes: string[] }[];
        order: unknown;
      };
      expect(options.include[0].attributes).not.toContain('content');
      expect(options.order).toEqual([['id', 'ASC']]);
      // Hai câu truy vấn cho cả danh sách, không gọi thêm cho từng trang
      expect(pageModel.findAll).toHaveBeenCalledTimes(1);
      expect(languageModel.findAll).toHaveBeenCalledTimes(1);
    });

    it('chưa có tiêu đề ngôn ngữ mặc định thì dùng key', async () => {
      languageModel.findAll.mockResolvedValue([VI, EN]);
      pageModel.findAll.mockResolvedValue([pageRow('about', [tr(2, 'About')])]);
      const [item] = await service.list();
      expect(item.title).toBe('about');
      expect(item.languages).toEqual(['en']);
    });
  });

  describe('findByKey', () => {
    it('mỗi ngôn ngữ đang hoạt động một tab, ngôn ngữ chưa có nội dung thì title và content rỗng', async () => {
      languageModel.findAll.mockResolvedValue([VI, EN]);
      pageModel.findOne.mockResolvedValue(
        pageRow('about', [
          tr(1, 'Giới thiệu', '<p>Xin chào</p>'),
          tr(3, '概要'),
        ]),
      );

      await expect(service.findByKey('about')).resolves.toEqual({
        key: 'about',
        isVisible: true,
        updatedAt: UPDATED_AT,
        translations: [
          {
            code: 'vi',
            name: 'Tiếng Việt',
            isDefault: true,
            title: 'Giới thiệu',
            content: '<p>Xin chào</p>',
          },
          {
            code: 'en',
            name: 'English',
            isDefault: false,
            title: '',
            content: '',
          },
        ],
      });
    });

    it('không có trang → 404', async () => {
      languageModel.findAll.mockResolvedValue([VI, EN]);
      pageModel.findOne.mockResolvedValue(null);
      await expectError(service.findByKey('abc'), 404, 'NOT_FOUND');
    });
  });

  describe('save', () => {
    /** Sau khi ghi, service đọc lại trang để trả kết quả */
    const mockReadBack = (translations: ReturnType<typeof tr>[] = []) => {
      languageModel.findAll.mockResolvedValueOnce([VI, EN, JA]); // trong transaction
      languageModel.findAll.mockResolvedValueOnce([VI, EN]); // đọc lại: ngôn ngữ đang hoạt động
      pageModel.findOne
        .mockResolvedValueOnce(pageRow('about')) // khóa dòng
        .mockResolvedValueOnce(pageRow('about', translations)); // đọc lại
    };

    it('khóa dòng trang, ghi isVisible, thêm bản dịch mới và sửa bản dịch đã có trong một transaction', async () => {
      mockReadBack([tr(1, 'Giới thiệu mới'), tr(2, 'About')]);
      const existingEn = translationRow(2, 'Old', '<p>Old</p>');
      translationModel.findAll.mockResolvedValue([existingEn]);

      const result = await service.save('about', {
        isVisible: false,
        translations: [
          {
            code: 'vi',
            title: '  Giới thiệu mới  ',
            content: '<p>Nội dung</p>',
          },
          { code: 'en', title: 'About', content: '<p>Content</p>' },
        ],
      });

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(pageModel.findOne).toHaveBeenNthCalledWith(1, {
        where: { key: 'about' },
        transaction,
        lock: 'UPDATE',
      });
      expect(pageModel.update).toHaveBeenCalledWith(
        { isVisible: false },
        { where: { id: 10 }, transaction },
      );
      // vi chưa có dòng nên tạo mới, tiêu đề đã bỏ khoảng trắng hai đầu
      expect(translationModel.create).toHaveBeenCalledWith(
        {
          pageId: 10,
          languageId: 1,
          title: 'Giới thiệu mới',
          content: '<p>Nội dung</p>',
        },
        { transaction },
      );
      // en đã có dòng nên sửa, không tạo thêm
      expect(existingEn.update).toHaveBeenCalledWith(
        { title: 'About', content: '<p>Content</p>' },
        { transaction },
      );
      expect(translationModel.create).toHaveBeenCalledTimes(1);
      expect(translationModel.destroy).not.toHaveBeenCalled();
      expect(result.translations.map((t) => t.code)).toEqual(['vi', 'en']);
    });

    it('nội dung đi qua bộ lọc XSS và lưu bản đã lọc', async () => {
      mockReadBack();
      await service.save('about', {
        isVisible: true,
        translations: [
          {
            code: 'vi',
            title: 'Giới thiệu',
            content: '<p>Chào</p><script>alert(1)</script>',
          },
        ],
      });
      expect(sanitizeRichText).toHaveBeenCalledWith(
        '<p>Chào</p><script>alert(1)</script>',
      );
      expect(translationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: '<p>Chào</p>' }),
        { transaction },
      );
    });

    it('ngôn ngữ khác để trống cả tiêu đề và nội dung thì xóa bản dịch đã có, không tạo mới', async () => {
      mockReadBack();
      await service.save('about', {
        isVisible: true,
        translations: [
          { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' },
          { code: 'en', title: '   ', content: '<p>&nbsp;</p>' },
        ],
      });
      expect(translationModel.destroy).toHaveBeenCalledWith({
        where: { pageId: 10, languageId: [2] },
        transaction,
      });
      expect(translationModel.create).toHaveBeenCalledTimes(1);
    });

    it('không gửi title, content (undefined) coi như trống', async () => {
      mockReadBack();
      await service.save('about', {
        isVisible: true,
        translations: [
          { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' },
          { code: 'en' },
        ],
      });
      expect(translationModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pageId: 10, languageId: [2] },
        }),
      );
    });

    it('chấp nhận mã ngôn ngữ viết hoa hoặc có khoảng trắng, và ngôn ngữ đang tắt', async () => {
      mockReadBack();
      await service.save('about', {
        isVisible: true,
        translations: [
          { code: ' VI ', title: 'Giới thiệu', content: '<p>Chào</p>' },
          { code: 'ja', title: '概要', content: '<p>こんにちは</p>' },
        ],
      });
      const created = translationModel.create.mock.calls.map(
        (call) => (call[0] as { languageId: number }).languageId,
      );
      expect(created).toEqual([1, 3]);
    });

    it('ngôn ngữ vắng trong body thì giữ nguyên, không xóa', async () => {
      mockReadBack();
      await service.save('about', {
        isVisible: true,
        translations: [
          { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' },
        ],
      });
      expect(translationModel.destroy).not.toHaveBeenCalled();
    });

    it('không có trang → 404, không ghi gì', async () => {
      pageModel.findOne.mockResolvedValue(null);
      await expectError(
        service.save('abc', { isVisible: true, translations: [] }),
        404,
        'NOT_FOUND',
      );
      expect(pageModel.update).not.toHaveBeenCalled();
      expect(languageModel.findAll).not.toHaveBeenCalled();
    });

    describe('kiểm tra dữ liệu (lỗi 400 ghi field theo mã ngôn ngữ, không ghi gì)', () => {
      const fail = async (
        translations: { code: string; title?: string; content?: string }[],
      ) => {
        pageModel.findOne.mockResolvedValue(pageRow('about'));
        languageModel.findAll.mockResolvedValue([VI, EN, JA]);
        const error = await expectError(
          service.save('about', { isVisible: true, translations }),
          400,
          'VALIDATION_ERROR',
        );
        expect(pageModel.update).not.toHaveBeenCalled();
        expect(translationModel.create).not.toHaveBeenCalled();
        expect(translationModel.destroy).not.toHaveBeenCalled();
        return error.errors;
      };

      it('ngôn ngữ mặc định: tiêu đề ngắn hơn 2 ký tự hoặc dài hơn 255, thiếu nội dung', async () => {
        const message = 'Tiêu đề của ngôn ngữ mặc định cần từ 2 đến 255 ký tự.';
        expect(
          await fail([{ code: 'vi', title: 'A', content: '<p>Chào</p>' }]),
        ).toEqual([{ field: 'translations.vi.title', message }]);
        expect(
          await fail([
            { code: 'vi', title: 'a'.repeat(256), content: '<p>Chào</p>' },
          ]),
        ).toEqual([{ field: 'translations.vi.title', message }]);
        expect(
          await fail([
            { code: 'vi', title: 'Giới thiệu', content: '<p> </p>' },
          ]),
        ).toEqual([
          {
            field: 'translations.vi.content',
            message: 'Nhập nội dung ở ngôn ngữ mặc định.',
          },
        ]);
      });

      it('ngôn ngữ mặc định có đủ 255 ký tự thì hợp lệ', async () => {
        mockReadBackFor255();
        await expect(
          service.save('about', {
            isVisible: true,
            translations: [
              { code: 'vi', title: 'a'.repeat(255), content: '<p>Chào</p>' },
            ],
          }),
        ).resolves.toBeDefined();
      });

      it('không gửi tab của ngôn ngữ mặc định thì báo cả tiêu đề lẫn nội dung', async () => {
        expect(
          await fail([{ code: 'en', title: 'About', content: '<p>Hi</p>' }]),
        ).toEqual([
          { field: 'translations.vi.title', message: expect.any(String) },
          { field: 'translations.vi.content', message: expect.any(String) },
        ]);
      });

      it('ngôn ngữ khác: chỉ điền một trong hai thì lỗi ở phần còn thiếu', async () => {
        const message = 'Điền đủ cả tiêu đề và nội dung, hoặc để trống cả hai.';
        const vi = { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' };
        expect(
          await fail([vi, { code: 'en', title: 'About', content: '' }]),
        ).toEqual([{ field: 'translations.en.content', message }]);
        expect(
          await fail([vi, { code: 'en', title: '', content: '<p>Hi</p>' }]),
        ).toEqual([{ field: 'translations.en.title', message }]);
      });

      it('ngôn ngữ khác: tiêu đề đã điền thì cũng phải từ 2 đến 255 ký tự', async () => {
        const vi = { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' };
        expect(
          await fail([vi, { code: 'en', title: 'A', content: '<p>Hi</p>' }]),
        ).toEqual([
          {
            field: 'translations.en.title',
            message: 'Tiêu đề cần từ 2 đến 255 ký tự.',
          },
        ]);
      });

      it('mã ngôn ngữ không tồn tại hoặc gửi trùng', async () => {
        const vi = { code: 'vi', title: 'Giới thiệu', content: '<p>Chào</p>' };
        expect(
          await fail([
            vi,
            { code: 'fr', title: 'À propos', content: '<p>Salut</p>' },
          ]),
        ).toEqual([
          { field: 'translations.fr', message: 'Ngôn ngữ “fr” không tồn tại.' },
        ]);
        expect(await fail([vi, { ...vi }])).toEqual([
          { field: 'translations.vi', message: 'Ngôn ngữ “vi” bị gửi trùng.' },
        ]);
      });

      it('báo mọi lỗi của mọi tab trong một lần', async () => {
        const errors = await fail([
          { code: 'vi', title: '', content: '' },
          { code: 'en', title: 'About', content: '' },
          { code: 'zz', title: 'x', content: 'y' },
        ]);
        expect((errors ?? []).map((e) => e.field)).toEqual([
          'translations.vi.title',
          'translations.vi.content',
          'translations.en.content',
          'translations.zz',
        ]);
      });
    });

    /** Dùng cho ca tiêu đề đúng 255 ký tự: chỉ cần đọc lại thành công */
    function mockReadBackFor255() {
      pageModel.findOne.mockReset();
      languageModel.findAll.mockReset();
      languageModel.findAll.mockResolvedValueOnce([VI, EN, JA]);
      languageModel.findAll.mockResolvedValueOnce([VI, EN]);
      pageModel.findOne
        .mockResolvedValueOnce(pageRow('about'))
        .mockResolvedValueOnce(pageRow('about'));
    }
  });
});

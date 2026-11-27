import { AppException } from '../../common/errors';
import { LanguagesService } from '../languages/languages.service';
import { PageTranslation } from './models/page-translation.model';
import { Page } from './models/page.model';
import { PagesService } from './pages.service';

describe('PagesService (UC11)', () => {
  const pageModel = { findAll: jest.fn(), findOne: jest.fn() };
  const languages = { findActive: jest.fn() };
  const service = new PagesService(
    pageModel as unknown as typeof Page,
    languages as unknown as LanguagesService,
  );

  const VI = { id: 1, code: 'vi', isDefault: true };
  const EN = { id: 2, code: 'en', isDefault: false };

  const tr = (
    languageId: number,
    title: string,
    content = `<p>${title}</p>`,
  ) => ({
    languageId,
    title,
    content,
  });
  const page = (
    key: string,
    translations: ReturnType<typeof tr>[],
    overrides: Record<string, unknown> = {},
  ) => ({ key, isVisible: true, translations, ...overrides });

  const include = (languageIds: number[]) => [
    {
      model: PageTranslation,
      required: false,
      where: { languageId: languageIds },
    },
  ];

  const expectNotFound = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(404);
    expect((error as AppException).code).toBe('NOT_FOUND');
  };

  beforeEach(() => {
    jest.resetAllMocks();
    languages.findActive.mockResolvedValue([
      { ...VI, name: 'Tiếng Việt' },
      { ...EN, name: 'English' },
    ]);
  });

  describe('list', () => {
    it('ngôn ngữ mặc định: chỉ lấy trang đang hiển thị, trả key và title, không lộ nội dung', async () => {
      pageModel.findAll.mockResolvedValue([
        page('about', [tr(1, 'Giới thiệu')]),
        page('contact', [tr(1, 'Liên hệ')]),
      ]);

      const result = await service.list(VI);

      expect(pageModel.findAll).toHaveBeenCalledWith({
        where: { isVisible: true },
        include: include([1]),
        order: [['id', 'ASC']],
      });
      expect(result).toEqual([
        { key: 'about', title: 'Giới thiệu' },
        { key: 'contact', title: 'Liên hệ' },
      ]);
      // Ngôn ngữ đang chọn đã là mặc định nên không cần tìm thêm
      expect(languages.findActive).not.toHaveBeenCalled();
    });

    it('ngôn ngữ khác: dùng bản của ngôn ngữ đó, thiếu thì dùng bản của ngôn ngữ mặc định', async () => {
      pageModel.findAll.mockResolvedValue([
        page('about', [tr(1, 'Giới thiệu'), tr(2, 'About')]),
        page('contact', [tr(1, 'Liên hệ')]),
      ]);

      const result = await service.list(EN);

      expect(pageModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ include: include([2, 1]) }),
      );
      expect(result).toEqual([
        { key: 'about', title: 'About' },
        { key: 'contact', title: 'Liên hệ' },
      ]);
    });

    it('bỏ qua trang không có bản dịch nào (kể cả bản mặc định)', async () => {
      pageModel.findAll.mockResolvedValue([
        page('about', []),
        page('contact', [tr(1, 'Liên hệ')]),
      ]);
      await expect(service.list(VI)).resolves.toEqual([
        { key: 'contact', title: 'Liên hệ' },
      ]);
    });

    it('không có trang nào hiển thị thì trả mảng rỗng', async () => {
      pageModel.findAll.mockResolvedValue([]);
      await expect(service.list(EN)).resolves.toEqual([]);
    });
  });

  describe('findByKey', () => {
    it('trả tiêu đề và nội dung theo ngôn ngữ đang chọn', async () => {
      pageModel.findOne.mockResolvedValue(
        page('about', [
          tr(1, 'Giới thiệu', '<p>Xin chào</p>'),
          tr(2, 'About', '<p>Hello</p>'),
        ]),
      );

      await expect(service.findByKey('about', EN)).resolves.toEqual({
        key: 'about',
        title: 'About',
        content: '<p>Hello</p>',
      });
      expect(pageModel.findOne).toHaveBeenCalledWith({
        where: { key: 'about', isVisible: true },
        include: include([2, 1]),
      });
    });

    it('ngôn ngữ đang chọn chưa có nội dung thì dùng bản của ngôn ngữ mặc định', async () => {
      pageModel.findOne.mockResolvedValue(
        page('about', [tr(1, 'Giới thiệu', '<p>Xin chào</p>')]),
      );
      await expect(service.findByKey('about', EN)).resolves.toEqual({
        key: 'about',
        title: 'Giới thiệu',
        content: '<p>Xin chào</p>',
      });
    });

    it('trang đang ẩn hoặc key không có → 404', async () => {
      // Điều kiện isVisible nằm trong where nên trang ẩn cũng không tìm thấy
      pageModel.findOne.mockResolvedValue(null);
      await expectNotFound(service.findByKey('privacy', VI));
      expect(pageModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'privacy', isVisible: true } }),
      );
    });

    it('trang chưa có bản dịch nào → 404', async () => {
      pageModel.findOne.mockResolvedValue(page('about', []));
      await expectNotFound(service.findByKey('about', VI));
    });

    it('ngôn ngữ mặc định chưa có nội dung thì không có gì để hiện → 404', async () => {
      // Chỉ có bản en nhưng đang xem bằng ngôn ngữ mặc định vi
      pageModel.findOne.mockResolvedValue(page('about', [tr(2, 'About')]));
      await expectNotFound(service.findByKey('about', VI));
    });
  });
});

import { ForeignKeyConstraintError } from 'sequelize';
import { AppException } from '../../common/errors';
import type { AuthUser } from '../../common/types/request-context';
import { isPaginated } from '../../common/utils/paginate';
import { canDeleteComment } from './comment-permissions';
import { CommentsService } from './comments.service';
import type { Comment } from './models/comment.model';
import type { PostTranslation } from '../posts/models/post-translation.model';

const TRANSLATION_ID = 7;
/** Tác giả bài viết */
const OWNER_ID = 2;

const asUser = (id: number, role: AuthUser['role'] = 'user'): AuthUser => ({
  id,
  role,
  jti: 'jti',
});

const row = (
  id: number,
  userId: number,
  parentId: number | null,
  createdAt: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  postTranslationId: TRANSLATION_ID,
  userId,
  parentId,
  content: `Nội dung ${id}`,
  createdAt: new Date(createdAt),
  user: { fullName: `Người ${userId}`, avatar: null },
  ...overrides,
});

describe('CommentsService - UC08', () => {
  let service: CommentsService;
  let commentModel: {
    findAndCountAll: jest.Mock;
    findAll: jest.Mock;
    findByPk: jest.Mock;
    create: jest.Mock;
  };
  let postTranslationModel: { findOne: jest.Mock };

  beforeEach(() => {
    commentModel = {
      findAndCountAll: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findByPk: jest.fn(),
      create: jest.fn(),
    };
    // Bản dịch published của bài do user OWNER_ID viết
    postTranslationModel = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: TRANSLATION_ID, post: { userId: OWNER_ID } }),
    };
    service = new CommentsService(
      commentModel as unknown as typeof Comment,
      postTranslationModel as unknown as typeof PostTranslation,
    );
  });

  describe('canDeleteComment', () => {
    it('khách không xóa được', () => {
      expect(canDeleteComment(undefined, 5, OWNER_ID)).toBe(false);
    });

    it('người viết xóa được bình luận của mình', () => {
      expect(canDeleteComment(asUser(5), 5, OWNER_ID)).toBe(true);
    });

    it('tác giả bài xóa được mọi bình luận trên bài của mình', () => {
      expect(
        canDeleteComment(asUser(OWNER_ID, 'blog_owner'), 5, OWNER_ID),
      ).toBe(true);
    });

    it('Super Admin xóa được mọi bình luận', () => {
      expect(canDeleteComment(asUser(99, 'super_admin'), 5, OWNER_ID)).toBe(
        true,
      );
    });

    it('Blog Owner khác (không phải tác giả bài) không xóa được bình luận của người khác', () => {
      expect(canDeleteComment(asUser(3, 'blog_owner'), 5, OWNER_ID)).toBe(
        false,
      );
    });

    it('người dùng thường không xóa được bình luận của người khác', () => {
      expect(canDeleteComment(asUser(6), 5, OWNER_ID)).toBe(false);
    });

    it('tác giả bài đã bị hạ xuống user chỉ còn xóa được bình luận của mình', () => {
      expect(canDeleteComment(asUser(OWNER_ID), 5, OWNER_ID)).toBe(false);
      expect(canDeleteComment(asUser(OWNER_ID), OWNER_ID, OWNER_ID)).toBe(true);
    });
  });

  describe('list', () => {
    const query = { page: 1, limit: 20 };

    it('bản dịch không có hoặc chưa published thì 404', async () => {
      postTranslationModel.findOne.mockResolvedValue(null);
      await expect(service.list(TRANSLATION_ID, query)).rejects.toMatchObject({
        status: 404,
      });
      expect(postTranslationModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSLATION_ID, status: 'published' },
        }),
      );
      expect(commentModel.findAndCountAll).not.toHaveBeenCalled();
    });

    it('chỉ lấy bình luận gốc của bản dịch, mới nhất trước, phân trang theo trang', async () => {
      commentModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await service.list(TRANSLATION_ID, { page: 3, limit: 20 });
      expect(commentModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postTranslationId: TRANSLATION_ID, parentId: null },
          order: [
            ['createdAt', 'DESC'],
            ['id', 'DESC'],
          ],
          offset: 40,
          limit: 20,
        }),
      );
    });

    it('không có bình luận gốc thì không truy vấn trả lời', async () => {
      commentModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const result = await service.list(TRANSLATION_ID, query);
      expect(commentModel.findAll).not.toHaveBeenCalled();
      expect(isPaginated(result)).toBe(true);
      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('gộp trả lời vào đúng bình luận gốc bằng một truy vấn, giữ thứ tự cũ nhất trước', async () => {
      commentModel.findAndCountAll.mockResolvedValue({
        rows: [
          row(3, 5, null, '2026-10-03T10:00:00Z'),
          row(1, 4, null, '2026-10-01T10:00:00Z'),
        ],
        count: 25,
      });
      commentModel.findAll.mockResolvedValue([
        row(2, OWNER_ID, 1, '2026-10-01T11:00:00Z'),
        row(4, 6, 1, '2026-10-01T12:00:00Z'),
      ]);

      const result = await service.list(TRANSLATION_ID, query);

      expect(commentModel.findAll).toHaveBeenCalledTimes(1);
      expect(commentModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postTranslationId: TRANSLATION_ID, parentId: [3, 1] },
          order: [
            ['createdAt', 'ASC'],
            ['id', 'ASC'],
          ],
        }),
      );
      expect(result.items.map((item) => item.id)).toEqual([3, 1]);
      expect(result.items[0].replies).toEqual([]);
      expect(result.items[1].replies.map((reply) => reply.id)).toEqual([2, 4]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });
    });

    it('trả đủ trường, id là số, ngày ISO UTC, không có thông tin nội bộ của người viết', async () => {
      commentModel.findAndCountAll.mockResolvedValue({
        rows: [
          row(1, 5, null, '2026-10-01T10:00:00Z', {
            id: '1',
            userId: '5',
            user: {
              fullName: 'Lê Minh Cường',
              avatar: 'uploads/avatars/a.webp',
              email: 'x@y.z',
            },
          }),
        ],
        count: 1,
      });
      const [item] = (await service.list(TRANSLATION_ID, query)).items;
      expect(item).toEqual({
        id: 1,
        parentId: null,
        content: 'Nội dung 1',
        createdAt: '2026-10-01T10:00:00.000Z',
        author: {
          fullName: 'Lê Minh Cường',
          avatar: 'uploads/avatars/a.webp',
          isPostAuthor: false,
        },
        canDelete: false,
        replies: [],
      });
      expect(JSON.stringify(item)).not.toContain('email');
    });

    it('đánh dấu isPostAuthor cho bình luận của tác giả bài', async () => {
      commentModel.findAndCountAll.mockResolvedValue({
        rows: [row(1, 4, null, '2026-10-01T10:00:00Z')],
        count: 1,
      });
      commentModel.findAll.mockResolvedValue([
        row(2, OWNER_ID, 1, '2026-10-01T11:00:00Z'),
      ]);
      const [item] = (await service.list(TRANSLATION_ID, query)).items;
      expect(item.author.isPostAuthor).toBe(false);
      expect(item.replies[0].author.isPostAuthor).toBe(true);
      expect(item.replies[0].parentId).toBe(1);
    });

    it('canDelete theo người đang xem: khách, người viết, người khác, tác giả bài, Super Admin', async () => {
      const rows = [
        row(1, 5, null, '2026-10-01T10:00:00Z'),
        row(2, 6, null, '2026-10-01T09:00:00Z'),
      ];
      commentModel.findAndCountAll.mockResolvedValue({ rows, count: 2 });
      const canDelete = async (viewer?: AuthUser) =>
        (await service.list(TRANSLATION_ID, query, viewer)).items.map(
          (item) => item.canDelete,
        );

      await expect(canDelete(undefined)).resolves.toEqual([false, false]);
      await expect(canDelete(asUser(5))).resolves.toEqual([true, false]);
      await expect(canDelete(asUser(8))).resolves.toEqual([false, false]);
      await expect(canDelete(asUser(OWNER_ID, 'blog_owner'))).resolves.toEqual([
        true,
        true,
      ]);
      await expect(canDelete(asUser(99, 'super_admin'))).resolves.toEqual([
        true,
        true,
      ]);
    });
  });

  describe('create', () => {
    const user = asUser(5);
    /** Người viết trả về từ findByPk sau khi tạo */
    const stored = (id: number, parentId: number | null) =>
      row(id, 5, parentId, '2026-10-05T10:00:00Z', {
        content: 'Bài viết rất hay!',
      });

    it('bản dịch chưa published hoặc không có thì 404, không lưu', async () => {
      postTranslationModel.findOne.mockResolvedValue(null);
      await expect(
        service.create(TRANSLATION_ID, { content: 'abc' }, user),
      ).rejects.toMatchObject({ status: 404 });
      expect(commentModel.create).not.toHaveBeenCalled();
    });

    it('tạo bình luận gốc: parentId null, gắn đúng bản dịch và người viết', async () => {
      commentModel.create.mockResolvedValue({ id: 10 });
      commentModel.findByPk.mockResolvedValue(stored(10, null));

      const result = await service.create(
        TRANSLATION_ID,
        { content: 'Bài viết rất hay!' },
        user,
      );

      expect(commentModel.create).toHaveBeenCalledWith({
        postTranslationId: TRANSLATION_ID,
        userId: 5,
        parentId: null,
        content: 'Bài viết rất hay!',
      });
      expect(result).toMatchObject({
        id: 10,
        parentId: null,
        content: 'Bài viết rất hay!',
        author: { fullName: 'Người 5', isPostAuthor: false },
        // Người viết xóa được bình luận của mình
        canDelete: true,
      });
      expect(commentModel.findByPk).toHaveBeenCalledTimes(1);
    });

    it('trả lời một bình luận gốc của cùng bản dịch', async () => {
      commentModel.findByPk
        .mockResolvedValueOnce(row(1, 4, null, '2026-10-01T10:00:00Z'))
        .mockResolvedValueOnce(stored(11, 1));
      commentModel.create.mockResolvedValue({ id: 11 });

      const result = await service.create(
        TRANSLATION_ID,
        { content: 'Cảm ơn', parentId: 1 },
        user,
      );

      expect(commentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 1 }),
      );
      expect(result.parentId).toBe(1);
    });

    it.each([
      ['không tồn tại', null],
      [
        'đã là một trả lời (chỉ trả lời 1 cấp)',
        row(2, 4, 1, '2026-10-01T11:00:00Z'),
      ],
      [
        'thuộc bản dịch khác',
        row(1, 4, null, '2026-10-01T10:00:00Z', { postTranslationId: 99 }),
      ],
    ])('parentId %s thì 400 ở field parentId, không lưu', async (_, parent) => {
      commentModel.findByPk.mockResolvedValue(parent);
      const error = (await service
        .create(TRANSLATION_ID, { content: 'abc', parentId: 2 }, user)
        .catch((e: unknown) => e)) as AppException;
      expect(error).toBeInstanceOf(AppException);
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'parentId', message: expect.any(String) },
      ]);
      expect(commentModel.create).not.toHaveBeenCalled();
    });

    it('bản dịch bị xóa ngay trước khi lưu (lỗi khóa ngoại) thì 404', async () => {
      commentModel.create.mockRejectedValue(new ForeignKeyConstraintError({}));
      postTranslationModel.findOne
        .mockResolvedValueOnce({
          id: TRANSLATION_ID,
          post: { userId: OWNER_ID },
        })
        .mockResolvedValueOnce(null);
      await expect(
        service.create(TRANSLATION_ID, { content: 'abc' }, user),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('bình luận cha bị xóa ngay trước khi lưu (lỗi khóa ngoại) thì 400 ở parentId', async () => {
      commentModel.findByPk.mockResolvedValue(
        row(1, 4, null, '2026-10-01T10:00:00Z'),
      );
      commentModel.create.mockRejectedValue(new ForeignKeyConstraintError({}));
      const error = (await service
        .create(TRANSLATION_ID, { content: 'abc', parentId: 1 }, user)
        .catch((e: unknown) => e)) as AppException;
      expect(error).toBeInstanceOf(AppException);
      expect(error.getStatus()).toBe(400);
      expect(error.errors).toEqual([
        { field: 'parentId', message: expect.any(String) },
      ]);
    });

    it('lỗi khác khi lưu thì ném lại nguyên lỗi', async () => {
      const failure = new Error('db down');
      commentModel.create.mockRejectedValue(failure);
      await expect(
        service.create(TRANSLATION_ID, { content: 'abc' }, user),
      ).rejects.toBe(failure);
    });

    it('bình luận vừa tạo đã bị xóa theo bình luận cha thì 404', async () => {
      commentModel.findByPk
        .mockResolvedValueOnce(row(1, 4, null, '2026-10-01T10:00:00Z'))
        .mockResolvedValueOnce(null);
      commentModel.create.mockResolvedValue({ id: 11 });
      await expect(
        service.create(TRANSLATION_ID, { content: 'abc', parentId: 1 }, user),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('bình luận của tác giả bài có isPostAuthor', async () => {
      commentModel.create.mockResolvedValue({ id: 12 });
      commentModel.findByPk.mockResolvedValue(
        row(12, OWNER_ID, null, '2026-10-05T10:00:00Z'),
      );
      const result = await service.create(
        TRANSLATION_ID,
        { content: 'abc' },
        asUser(OWNER_ID, 'blog_owner'),
      );
      expect(result.author.isPostAuthor).toBe(true);
    });
  });

  describe('remove', () => {
    const stored = (
      userId: number,
      overrides: Record<string, unknown> = {},
    ) => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      return {
        ...row(1, userId, null, '2026-10-01T10:00:00Z'),
        postTranslation: { id: TRANSLATION_ID, post: { userId: OWNER_ID } },
        destroy,
        ...overrides,
      };
    };

    it('không có bình luận thì 404', async () => {
      commentModel.findByPk.mockResolvedValue(null);
      await expect(service.remove(1, asUser(5))).rejects.toMatchObject({
        status: 404,
      });
    });

    it('người viết xóa được bình luận của mình', async () => {
      const comment = stored(5);
      commentModel.findByPk.mockResolvedValue(comment);
      await service.remove(1, asUser(5));
      expect(comment.destroy).toHaveBeenCalledTimes(1);
    });

    it('tác giả bài xóa được bình luận của người khác', async () => {
      const comment = stored(5);
      commentModel.findByPk.mockResolvedValue(comment);
      await service.remove(1, asUser(OWNER_ID, 'blog_owner'));
      expect(comment.destroy).toHaveBeenCalledTimes(1);
    });

    it('Super Admin xóa được mọi bình luận', async () => {
      const comment = stored(5);
      commentModel.findByPk.mockResolvedValue(comment);
      await service.remove(1, asUser(99, 'super_admin'));
      expect(comment.destroy).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['người dùng khác', asUser(6)],
      ['Blog Owner không phải tác giả bài', asUser(3, 'blog_owner')],
      ['tác giả bài đã bị hạ xuống user', asUser(OWNER_ID)],
    ])('%s thì 403 và không xóa', async (_, viewer) => {
      const comment = stored(5);
      commentModel.findByPk.mockResolvedValue(comment);
      await expect(service.remove(1, viewer)).rejects.toMatchObject({
        status: 403,
      });
      expect(comment.destroy).not.toHaveBeenCalled();
    });
  });
});

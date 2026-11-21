/**
 * E2E - B4 / UC08
 *
 * GET    /api/v1/post-translations/:id/comments
 * POST   /api/v1/post-translations/:id/comments
 * DELETE /api/v1/comments/:id
 */

import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { Category } from '../src/modules/categories/models/category.model';
import { Comment } from '../src/modules/comments/models/comment.model';
import { Language } from '../src/modules/languages/models/language.model';
import { Post } from '../src/modules/posts/models/post.model';
import {
  PostTranslation,
  type PostStatus,
} from '../src/modules/posts/models/post-translation.model';
import type { User } from '../src/modules/users/models/user.model';

import { TestContext, createTestApp } from './helpers/app';
import { bearer, tokenFor } from './helpers/auth';
import { resetDatabase } from './helpers/db';

interface CommentBody {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  author: { fullName: string; avatar: string | null; isPostAuthor: boolean };
  canDelete: boolean;
}

interface ThreadBody extends CommentBody {
  replies: CommentBody[];
}

describe('Comments - UC08 (e2e)', () => {
  let ctx: TestContext;
  const server = () => ctx.app.getHttpServer();
  const listUrl = (translationId: number) =>
    `/api/v1/post-translations/${translationId}/comments`;
  const deleteUrl = (commentId: number) => `/api/v1/comments/${commentId}`;

  let vi: Language;
  let en: Language;
  let author: User;
  let authorToken: string;
  let category: Category;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.app);
    vi = (await Language.findOne({ where: { code: 'vi' } }))!;
    en = (await Language.findOne({ where: { code: 'en' } }))!;
    ({ user: author, token: authorToken } = await tokenFor(
      ctx.app,
      'blog_owner',
      { fullName: 'Nguyễn Văn An' },
    ));
    category = await Category.create({});
  });

  /** Bài của `author` với một bản dịch vi (và bản en nếu có) */
  async function createTranslations(
    items: { language: Language; slug: string; status?: PostStatus }[],
  ): Promise<PostTranslation[]> {
    const post = await Post.create({
      userId: author.id,
      languageId: vi.id,
      categoryId: category.id,
    });
    const rows: PostTranslation[] = [];
    for (const item of items) {
      const status = item.status ?? 'published';
      rows.push(
        await PostTranslation.create({
          postId: post.id,
          languageId: item.language.id,
          title: `Tiêu đề ${item.slug}`,
          slug: item.slug,
          excerpt: null,
          content: '<p>Nội dung bài viết</p>',
          status,
          viewCount: 0,
          publishedAt: status === 'published' ? new Date() : null,
        }),
      );
    }
    return rows;
  }

  let minute = 0;
  /** Thời điểm tăng dần để thứ tự sắp xếp cố định */
  const at = () => new Date(Date.UTC(2026, 9, 1, 8, (minute += 1)));

  const addComment = (
    translationId: number,
    userId: number,
    content: string,
    parentId: number | null = null,
  ) =>
    Comment.create({
      postTranslationId: translationId,
      userId,
      parentId,
      content,
      createdAt: at(),
      updatedAt: at(),
    });

  // =========================================================
  // GET /post-translations/:id/comments
  // =========================================================

  describe('GET /post-translations/:id/comments', () => {
    it('200: khách xem được, gốc mới nhất trước, trả lời cũ nhất trước, canDelete false', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user', {
        fullName: 'Lê Minh Cường',
      });
      const first = await addComment(
        translation.id,
        reader.id,
        'Bài viết rất hay!',
      );
      await addComment(
        translation.id,
        author.id,
        'Cảm ơn bạn đã đọc.',
        first.id,
      );
      await addComment(
        translation.id,
        reader.id,
        'Mình có một câu hỏi.',
        first.id,
      );
      const latest = await addComment(
        translation.id,
        reader.id,
        'Bình luận mới nhất',
      );

      const res = await request(server())
        .get(listUrl(translation.id))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      const data = res.body.data as ThreadBody[];
      expect(data.map((item) => item.id)).toEqual([
        Number(latest.id),
        Number(first.id),
      ]);
      expect(data[0].replies).toEqual([]);
      expect(data[1]).toMatchObject({
        parentId: null,
        content: 'Bài viết rất hay!',
        canDelete: false,
        author: {
          fullName: 'Lê Minh Cường',
          avatar: null,
          isPostAuthor: false,
        },
      });
      expect(data[1].replies.map((reply) => reply.content)).toEqual([
        'Cảm ơn bạn đã đọc.',
        'Mình có một câu hỏi.',
      ]);
      // Trả lời của tác giả bài có huy hiệu "Tác giả"
      expect(data[1].replies[0].author.isPostAuthor).toBe(true);
      expect(data[1].replies[0].parentId).toBe(Number(first.id));
      expect(typeof data[1].createdAt).toBe('string');
      // Không lộ thông tin nội bộ của người viết
      expect(JSON.stringify(res.body)).not.toMatch(
        /passwordHash|password_hash|@test\.local/,
      );
    });

    it('200: bản dịch chưa có bình luận trả mảng rỗng', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const res = await request(server())
        .get(listUrl(translation.id))
        .expect(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('canDelete theo người đang xem: người viết, người khác, tác giả bài, Super Admin', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: writer, token: writerToken } = await tokenFor(
        ctx.app,
        'user',
      );
      const { user: other } = await tokenFor(ctx.app, 'user');
      const { token: otherToken } = await tokenFor(ctx.app, 'user');
      const { token: ownerToken } = await tokenFor(ctx.app, 'blog_owner');
      const { token: adminToken } = await tokenFor(ctx.app, 'super_admin');
      await addComment(translation.id, writer.id, 'Của người viết');
      await addComment(translation.id, other.id, 'Của người khác');

      const canDelete = async (token?: string) => {
        const req = request(server()).get(listUrl(translation.id));
        const res = await (token ? req.set(bearer(token)) : req).expect(200);
        // Mới nhất trước: [người khác, người viết]
        return (res.body.data as ThreadBody[]).map((item) => item.canDelete);
      };

      await expect(canDelete(writerToken)).resolves.toEqual([false, true]);
      await expect(canDelete(otherToken)).resolves.toEqual([false, false]);
      // Blog Owner không phải tác giả bài thì không có quyền riêng
      await expect(canDelete(ownerToken)).resolves.toEqual([false, false]);
      await expect(canDelete(authorToken)).resolves.toEqual([true, true]);
      await expect(canDelete(adminToken)).resolves.toEqual([true, true]);
    });

    it('token sai ở route public thì coi như khách', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const res = await request(server())
        .get(listUrl(translation.id))
        .set(bearer('token-khong-hop-le'))
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('phân trang theo bình luận gốc, 20 mỗi trang', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      for (let i = 1; i <= 25; i += 1) {
        await addComment(translation.id, reader.id, `Bình luận ${i}`);
      }

      const page1 = await request(server())
        .get(listUrl(translation.id))
        .expect(200);
      expect(page1.body.data).toHaveLength(20);
      expect(page1.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });
      expect((page1.body.data as ThreadBody[])[0].content).toBe('Bình luận 25');

      const page2 = await request(server())
        .get(`${listUrl(translation.id)}?page=2`)
        .expect(200);
      expect(page2.body.data).toHaveLength(5);
      expect((page2.body.data as ThreadBody[])[4].content).toBe('Bình luận 1');
    });

    it('400: limit lớn hơn 50 hoặc page = 0', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const tooMany = await request(server())
        .get(`${listUrl(translation.id)}?limit=51`)
        .expect(400);
      expect(tooMany.body.errors).toEqual([
        { field: 'limit', message: expect.any(String) },
      ]);
      await request(server())
        .get(`${listUrl(translation.id)}?page=0`)
        .expect(400);
    });

    it('mỗi bản dịch có luồng bình luận riêng', async () => {
      const [viTranslation, enTranslation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
        { language: en, slug: 'the-post' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      await addComment(viTranslation.id, reader.id, 'Bình luận tiếng Việt');
      await addComment(enTranslation.id, reader.id, 'English comment');

      const viRes = await request(server())
        .get(listUrl(viTranslation.id))
        .expect(200);
      const enRes = await request(server())
        .get(listUrl(enTranslation.id))
        .expect(200);
      expect((viRes.body.data as ThreadBody[]).map((c) => c.content)).toEqual([
        'Bình luận tiếng Việt',
      ]);
      expect((enRes.body.data as ThreadBody[]).map((c) => c.content)).toEqual([
        'English comment',
      ]);
    });

    it('404: bản dịch không có, bản nháp hoặc đã lưu trữ', async () => {
      const [draft, archived] = await createTranslations([
        { language: vi, slug: 'ban-nhap', status: 'draft' },
        { language: en, slug: 'archived-post', status: 'archived' },
      ]);
      const missing = await request(server()).get(listUrl(999999)).expect(404);
      expect(missing.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
      await request(server()).get(listUrl(draft.id)).expect(404);
      await request(server()).get(listUrl(archived.id)).expect(404);
    });

    it('400: id không phải số', async () => {
      await request(server())
        .get('/api/v1/post-translations/abc/comments')
        .expect(400);
    });
  });

  // =========================================================
  // POST /post-translations/:id/comments
  // =========================================================

  describe('POST /post-translations/:id/comments', () => {
    it('401: chưa đăng nhập, không lưu', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const res = await request(server())
        .post(listUrl(translation.id))
        .send({ content: 'Xin chào' })
        .expect(401);
      expect(res.body).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
      expect(await Comment.count()).toBe(0);
    });

    it('201: tạo bình luận gốc, bỏ khoảng trắng hai đầu, trả bình luận vừa tạo', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user, token } = await tokenFor(ctx.app, 'user', {
        fullName: 'Lê Minh Cường',
      });

      const res = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(token))
        .send({ content: '  Bài viết rất hay!  ' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        parentId: null,
        content: 'Bài viết rất hay!',
        canDelete: true,
        author: {
          fullName: 'Lê Minh Cường',
          avatar: null,
          isPostAuthor: false,
        },
      });
      const saved = await Comment.findAll();
      expect(saved).toHaveLength(1);
      expect(Number(saved[0].userId)).toBe(Number(user.id));
      expect(Number(saved[0].postTranslationId)).toBe(Number(translation.id));
      expect(saved[0].content).toBe('Bài viết rất hay!');
    });

    it('201: nhận nội dung nhiều dòng, đúng 1000 ký tự và ký tự < > không thành thẻ', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { token } = await tokenFor(ctx.app, 'user');
      for (const content of [
        'Dòng 1\nDòng 2',
        'a'.repeat(1000),
        '3 < 5 > 2',
        'Nên dùng List<String> thay vì mảng',
        'nếu a<b thì c>d',
      ]) {
        await request(server())
          .post(listUrl(translation.id))
          .set(bearer(token))
          .send({ content })
          .expect(201);
      }
      expect(await Comment.count()).toBe(5);
    });

    it('201: tác giả bài và Super Admin cũng bình luận được; bình luận của tác giả có isPostAuthor', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { token: adminToken } = await tokenFor(ctx.app, 'super_admin');

      const byAuthor = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(authorToken))
        .send({ content: 'Tác giả bình luận' })
        .expect(201);
      expect(byAuthor.body.data.author.isPostAuthor).toBe(true);

      const byAdmin = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(adminToken))
        .send({ content: 'Admin bình luận' })
        .expect(201);
      expect(byAdmin.body.data.author.isPostAuthor).toBe(false);
    });

    it('201: trả lời một bình luận gốc và hiện trong danh sách; commentCount ở chi tiết bài tăng', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const parent = await addComment(
        translation.id,
        reader.id,
        'Bình luận gốc',
      );

      const res = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(authorToken))
        .send({ content: 'Cảm ơn bạn', parentId: Number(parent.id) })
        .expect(201);
      expect(res.body.data.parentId).toBe(Number(parent.id));

      const list = await request(server())
        .get(listUrl(translation.id))
        .expect(200);
      expect(
        (list.body.data as ThreadBody[])[0].replies.map((r) => r.content),
      ).toEqual(['Cảm ơn bạn']);

      const detail = await request(server())
        .get('/api/v1/posts/bai-viet')
        .expect(200);
      // Gồm cả bình luận gốc lẫn trả lời
      expect(detail.body.data.commentCount).toBe(2);
    });

    it.each([
      ['thiếu content', {}],
      ['content rỗng', { content: '' }],
      ['content chỉ có khoảng trắng', { content: '   \n ' }],
      ['content dài 1001 ký tự', { content: 'a'.repeat(1001) }],
      ['content không phải chuỗi', { content: 123 }],
    ])('400: %s, lỗi ở field content', async (_, body) => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(token))
        .send(body)
        .expect(400);
      expect(res.body).toMatchObject({
        success: false,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.errors).toEqual([
        { field: 'content', message: 'Bình luận phải có từ 1 đến 1000 ký tự.' },
      ]);
      expect(await Comment.count()).toBe(0);
    });

    it.each([
      '<script>alert(1)</script>',
      'Xin chào <b>bạn</b>',
      '<img src=x onerror=alert(1)>',
    ])(
      '400: nội dung có thẻ HTML %s bị từ chối, không lọc rồi lưu',
      async (content) => {
        const [translation] = await createTranslations([
          { language: vi, slug: 'bai-viet' },
        ]);
        const { token } = await tokenFor(ctx.app, 'user');
        const res = await request(server())
          .post(listUrl(translation.id))
          .set(bearer(token))
          .send({ content })
          .expect(400);
        expect(res.body.errors).toEqual([
          { field: 'content', message: expect.stringContaining('HTML') },
        ]);
        expect(await Comment.count()).toBe(0);
      },
    );

    it('400: field không có trong DTO (ví dụ userId) bị chặn', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { token } = await tokenFor(ctx.app, 'user');
      const res = await request(server())
        .post(listUrl(translation.id))
        .set(bearer(token))
        .send({ content: 'abc', userId: 1 })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'userId', message: expect.any(String) },
      ]);
    });

    it('400: parentId không hợp lệ (không tồn tại, là một trả lời, thuộc bản dịch khác, sai kiểu)', async () => {
      const [viTranslation, enTranslation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
        { language: en, slug: 'the-post' },
      ]);
      const { user: reader, token } = await tokenFor(ctx.app, 'user');
      const root = await addComment(viTranslation.id, reader.id, 'Gốc');
      const reply = await addComment(
        viTranslation.id,
        reader.id,
        'Trả lời',
        root.id,
      );
      const otherRoot = await addComment(
        enTranslation.id,
        reader.id,
        'English root',
      );
      const before = await Comment.count();

      for (const parentId of [
        999999,
        Number(reply.id),
        Number(otherRoot.id),
        0,
        'abc',
      ]) {
        const res = await request(server())
          .post(listUrl(viTranslation.id))
          .set(bearer(token))
          .send({ content: 'abc', parentId })
          .expect(400);
        expect(res.body.errors).toEqual([
          { field: 'parentId', message: expect.any(String) },
        ]);
      }
      expect(await Comment.count()).toBe(before);
    });

    it('404: bản dịch không có, bản nháp hoặc đã lưu trữ, không lưu', async () => {
      const [draft, archived] = await createTranslations([
        { language: vi, slug: 'ban-nhap', status: 'draft' },
        { language: en, slug: 'archived-post', status: 'archived' },
      ]);
      const { token } = await tokenFor(ctx.app, 'user');
      for (const id of [999999, Number(draft.id), Number(archived.id)]) {
        const res = await request(server())
          .post(listUrl(id))
          .set(bearer(token))
          .send({ content: 'abc' })
          .expect(404);
        expect(res.body.code).toBe('NOT_FOUND');
      }
      expect(await Comment.count()).toBe(0);
    });
  });

  // =========================================================
  // DELETE /comments/:id
  // =========================================================

  describe('DELETE /comments/:id', () => {
    it('401: chưa đăng nhập, không xóa', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const comment = await addComment(translation.id, reader.id, 'abc');
      await request(server())
        .delete(deleteUrl(Number(comment.id)))
        .expect(401);
      expect(await Comment.count()).toBe(1);
    });

    it('200: người viết xóa bình luận của mình, data null', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: writer, token } = await tokenFor(ctx.app, 'user');
      const comment = await addComment(translation.id, writer.id, 'abc');

      const res = await request(server())
        .delete(deleteUrl(Number(comment.id)))
        .set(bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ success: true, data: null });
      expect(await Comment.count()).toBe(0);
    });

    it('200: tác giả bài xóa được bình luận của người khác', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const comment = await addComment(translation.id, reader.id, 'abc');
      await request(server())
        .delete(deleteUrl(Number(comment.id)))
        .set(bearer(authorToken))
        .expect(200);
      expect(await Comment.count()).toBe(0);
    });

    it('200: Super Admin xóa được mọi bình luận', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const { token: adminToken } = await tokenFor(ctx.app, 'super_admin');
      const comment = await addComment(translation.id, reader.id, 'abc');
      await request(server())
        .delete(deleteUrl(Number(comment.id)))
        .set(bearer(adminToken))
        .expect(200);
      expect(await Comment.count()).toBe(0);
    });

    it('403: người dùng khác và Blog Owner không phải tác giả bài, không xóa', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const { token: otherToken } = await tokenFor(ctx.app, 'user');
      const { token: otherOwnerToken } = await tokenFor(ctx.app, 'blog_owner');
      const comment = await addComment(translation.id, reader.id, 'abc');

      for (const token of [otherToken, otherOwnerToken]) {
        const res = await request(server())
          .delete(deleteUrl(Number(comment.id)))
          .set(bearer(token))
          .expect(403);
        expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
      }
      expect(await Comment.count()).toBe(1);
    });

    it('403: tác giả bài đã bị hạ xuống user không xóa được bình luận của người khác', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const comment = await addComment(translation.id, reader.id, 'abc');
      // Token mang role mới sau khi Super Admin đổi role (UC14)
      const demotedToken = await ctx.app
        .get(JwtService)
        .signAsync({ sub: author.id, role: 'user', jti: randomUUID() });

      const list = await request(server())
        .get(listUrl(translation.id))
        .set(bearer(demotedToken))
        .expect(200);
      expect((list.body.data as ThreadBody[])[0].canDelete).toBe(false);

      await request(server())
        .delete(deleteUrl(Number(comment.id)))
        .set(bearer(demotedToken))
        .expect(403);
      expect(await Comment.count()).toBe(1);
    });

    it('xóa bình luận cha thì xóa luôn các trả lời; xóa một trả lời thì giữ cha', async () => {
      const [translation] = await createTranslations([
        { language: vi, slug: 'bai-viet' },
      ]);
      const { user: reader } = await tokenFor(ctx.app, 'user');
      const root = await addComment(translation.id, reader.id, 'Gốc');
      const reply1 = await addComment(
        translation.id,
        author.id,
        'Trả lời 1',
        root.id,
      );
      await addComment(translation.id, reader.id, 'Trả lời 2', root.id);
      const other = await addComment(translation.id, reader.id, 'Gốc khác');

      await request(server())
        .delete(deleteUrl(Number(reply1.id)))
        .set(bearer(authorToken))
        .expect(200);
      expect(await Comment.count()).toBe(3);

      await request(server())
        .delete(deleteUrl(Number(root.id)))
        .set(bearer(authorToken))
        .expect(200);
      const left = await Comment.findAll();
      expect(left.map((c) => Number(c.id))).toEqual([Number(other.id)]);
    });

    it('404: bình luận không có, kể cả với Super Admin', async () => {
      const { token: adminToken } = await tokenFor(ctx.app, 'super_admin');
      const res = await request(server())
        .delete(deleteUrl(999999))
        .set(bearer(adminToken))
        .expect(404);
      expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    });

    it('400: id không phải số', async () => {
      const { token } = await tokenFor(ctx.app, 'user');
      await request(server())
        .delete('/api/v1/comments/abc')
        .set(bearer(token))
        .expect(400);
    });
  });
});

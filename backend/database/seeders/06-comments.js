const { skipInProduction, assertIdsFree } = require('../seed-helpers');

const SEEDER = '06-comments';

// [id, post_translation_id, user_id, parent_id, content, created_at]
// Trả lời chỉ 1 cấp. Người trả lời (user 2) là tác giả bài nên có huy hiệu "Tác giả".
const COMMENTS = [
  // 3 bình luận đầu theo docs/sample-data.md
  [1, 1, 4, null, 'Bài viết rất hay!', '2026-09-02 20:15:00'],
  [2, 1, 2, 1, 'Cảm ơn bạn đã đọc.', '2026-09-02 21:00:00'],
  [3, 2, 4, null, 'Great tutorial!', '2026-09-03 18:30:00'],
  // Getting started with NestJS (en)
  [4, 3, 4, null, 'Clear introduction, very helpful for beginners.', '2026-09-05 11:20:00'],
  [5, 3, 2, 4, 'Thanks! I will add more examples in the next posts.', '2026-09-05 12:00:00'],
  [6, 3, 3, null, 'Looking forward to a post about modules and providers.', '2026-09-06 09:10:00'],
  // Các khái niệm cơ bản trong lập trình (vi)
  [7, 6, 4, null, 'Phần giải thích về biến và kiểu dữ liệu rất dễ hiểu.', '2026-09-14 19:00:00'],
  [8, 6, 2, 7, 'Cảm ơn bạn đã góp ý!', '2026-09-14 20:00:00'],
  // Understanding JavaScript Variables (en)
  [9, 8, 4, null, 'The examples make the difference between let and const really clear.', '2026-09-16 15:00:00'],
  // Cách quản lý thời gian hiệu quả (vi)
  [10, 10, 4, null, 'Những phương pháp này khá thực tế, mình sẽ thử áp dụng.', '2026-09-19 10:00:00'],
  // A Beginner Guide to REST APIs (en)
  [11, 14, 4, null, 'This guide explains REST API concepts in a clear and simple way.', '2026-09-25 17:00:00'],
];

module.exports = {
  async up(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await assertIdsFree(
        queryInterface,
        'comments',
        COMMENTS.map(([id]) => id),
        transaction,
        SEEDER,
      );
      await queryInterface.bulkInsert(
        'comments',
        COMMENTS.map(([id, postTranslationId, userId, parentId, content, createdAt]) => ({
          id,
          post_translation_id: postTranslationId,
          user_id: userId,
          parent_id: parentId,
          content,
          created_at: createdAt,
          updated_at: createdAt,
        })),
        { transaction },
      );
    });
  },

  /** Trả lời xóa theo CASCADE cùng bình luận gốc */
  async down(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.bulkDelete('comments', { id: COMMENTS.map(([id]) => id) });
  },
};

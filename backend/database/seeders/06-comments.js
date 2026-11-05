const COMMENTS = [
    // 3 bình luận đầu: giữ nguyên theo bảng mẫu
    {
        id: 1,
        post_translation_id: 1,
        user_id: 4,
        parent_id: null,
        content: 'Bài viết rất hay!',
        created_at: '2026-09-02 20:15:00',
        updated_at: '2026-09-02 20:15:00',
    },
    {
        id: 2,
        post_translation_id: 1,
        user_id: 2,
        parent_id: 1,
        content: 'Cảm ơn bạn đã đọc.',
        created_at: '2026-09-02 21:00:00',
        updated_at: '2026-09-02 21:00:00',
    },
    {
        id: 3,
        post_translation_id: 2,
        user_id: 4,
        parent_id: null,
        content: 'Great tutorial!',
        created_at: '2026-09-03 18:30:00',
        updated_at: '2026-09-03 18:30:00',
    },

    // Bình luận bài viết Getting started with NestJS (translation ID 3)
    {
        id: 4,
        post_translation_id: 3,
        user_id: 4,
        parent_id: null,
        content: 'Bài viết giới thiệu khá dễ hiểu, rất hữu ích cho người mới bắt đầu.',
        created_at: '2026-09-05 11:20:00',
        updated_at: '2026-09-05 11:20:00',
    },
    {
        id: 5,
        post_translation_id: 3,
        user_id: 2,
        parent_id: 4,
        content: 'Cảm ơn bạn! Mình sẽ bổ sung thêm các ví dụ trong những bài viết tiếp theo.',
        created_at: '2026-09-05 12:00:00',
        updated_at: '2026-09-05 12:00:00',
    },

    // Bình luận bài viết Các khái niệm cơ bản trong lập trình (translation ID 6)
    {
        id: 6,
        post_translation_id: 6,
        user_id: 4,
        parent_id: null,
        content: 'Phần giải thích về biến và kiểu dữ liệu rất dễ hiểu.',
        created_at: '2026-09-14 19:00:00',
        updated_at: '2026-09-14 19:00:00',
    },
    {
        id: 7,
        post_translation_id: 6,
        user_id: 2,
        parent_id: 6,
        content: 'Cảm ơn bạn đã góp ý!',
        created_at: '2026-09-14 20:00:00',
        updated_at: '2026-09-14 20:00:00',
    },

    // Bình luận bài viết Understanding JavaScript Variables (translation ID 8)
    {
        id: 8,
        post_translation_id: 8,
        user_id: 4,
        parent_id: null,
        content: 'Ví dụ minh họa rất trực quan, giúp mình hiểu rõ hơn về JavaScript.',
        created_at: '2026-09-16 15:00:00',
        updated_at: '2026-09-16 15:00:00',
    },

    // Bình luận bài viết Cách quản lý thời gian hiệu quả (translation ID 10)
    {
        id: 9,
        post_translation_id: 10,
        user_id: 4,
        parent_id: null,
        content: 'Những phương pháp này khá thực tế, mình sẽ thử áp dụng.',
        created_at: '2026-09-19 10:00:00',
        updated_at: '2026-09-19 10:00:00',
    },

    // Bình luận bài viết A Beginner Guide to REST APIs (translation ID 14)
    {
        id: 10,
        post_translation_id: 14,
        user_id: 4,
        parent_id: null,
        content: 'This guide explains REST API concepts in a clear and simple way.',
        created_at: '2026-09-25 17:00:00',
        updated_at: '2026-09-25 17:00:00',
    },
];

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.bulkInsert('comments', COMMENTS, {
                transaction,
            });
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.bulkDelete(
                'comments',
                {
                    id: COMMENTS.map((item) => item.id),
                },
                { transaction },
            );
        });
    },
};
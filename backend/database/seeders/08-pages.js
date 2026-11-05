const PAGES = [
    {
        id: 1,
        key: 'about',
        is_visible: true,
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
    {
        id: 2,
        key: 'contact',
        is_visible: true,
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
    {
        id: 3,
        key: 'privacy',
        is_visible: true,
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
];

const PAGE_TRANSLATIONS = [
    {
        id: 1,
        page_id: 1,
        language_id: 1,
        title: 'Giới thiệu',
        content: '<p>Chúng tôi chia sẻ những kiến thức hữu ích.</p>',
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
    {
        id: 2,
        page_id: 1,
        language_id: 2,
        title: 'About',
        content: '<p>We share useful knowledge and experiences.</p>',
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
    {
        id: 3,
        page_id: 2,
        language_id: 1,
        title: 'Liên hệ',
        content: '<p>Liên hệ với chúng tôi qua email contact@blog.local.</p>',
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
    {
        id: 4,
        page_id: 3,
        language_id: 1,
        title: 'Chính sách bảo mật',
        content: '<p>Chúng tôi luôn bảo vệ thông tin cá nhân của bạn.</p>',
        created_at: '2026-08-01 00:00:00',
        updated_at: '2026-08-01 00:00:00',
    },
];

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.bulkInsert('pages', PAGES, {
                transaction,
            });

            await queryInterface.bulkInsert(
                'page_translations',
                PAGE_TRANSLATIONS,
                { transaction },
            );
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.bulkDelete(
                'page_translations',
                {
                    id: PAGE_TRANSLATIONS.map((item) => item.id),
                },
                { transaction },
            );

            await queryInterface.bulkDelete(
                'pages',
                {
                    id: PAGES.map((item) => item.id),
                },
                { transaction },
            );
        });
    },
};
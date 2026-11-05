
// 5 sample categories.
// IDs 1 and 2 match the provided sample data.
// IDs 3, 4 and 5 are additional sample categories.
const CATEGORIES = [
    {
        id: 1,
        created_at: '2026-08-02 09:00:00',
        updated_at: '2026-08-02 09:00:00',
    },
    {
        id: 2,
        created_at: '2026-08-02 09:05:00',
        updated_at: '2026-08-02 09:05:00',
    },
    {
        id: 3,
        created_at: '2026-08-02 09:10:00',
        updated_at: '2026-08-02 09:10:00',
    },
    {
        id: 4,
        created_at: '2026-08-02 09:15:00',
        updated_at: '2026-08-02 09:15:00',
    },
    {
        id: 5,
        created_at: '2026-08-02 09:20:00',
        updated_at: '2026-08-02 09:20:00',
    },
];

// 9 translations:
// Category 1: vi + en
// Category 2: vi only (fallback test)
// Category 3: vi + en
// Category 4: vi + en
// Category 5: vi + en
const CATEGORY_TRANSLATIONS = [
    {
        id: 1,
        category_id: 1,
        language_code: 'vi',
        name: 'Lập trình',
        slug: 'lap-trinh',
        created_at: '2026-08-02 09:00:00',
        updated_at: '2026-08-02 09:00:00',
    },
    {
        id: 2,
        category_id: 1,
        language_code: 'en',
        name: 'Programming',
        slug: 'programming',
        created_at: '2026-08-02 09:00:00',
        updated_at: '2026-08-02 09:00:00',
    },
    {
        id: 3,
        category_id: 2,
        language_code: 'vi',
        name: 'Đời sống',
        slug: 'doi-song',
        created_at: '2026-08-02 09:05:00',
        updated_at: '2026-08-02 09:05:00',
    },
    {
        id: 4,
        category_id: 3,
        language_code: 'vi',
        name: 'Công nghệ',
        slug: 'cong-nghe',
        created_at: '2026-08-02 09:10:00',
        updated_at: '2026-08-02 09:10:00',
    },
    {
        id: 5,
        category_id: 3,
        language_code: 'en',
        name: 'Technology',
        slug: 'technology',
        created_at: '2026-08-02 09:10:00',
        updated_at: '2026-08-02 09:10:00',
    },
    {
        id: 6,
        category_id: 4,
        language_code: 'vi',
        name: 'Học tập',
        slug: 'hoc-tap',
        created_at: '2026-08-02 09:15:00',
        updated_at: '2026-08-02 09:15:00',
    },
    {
        id: 7,
        category_id: 4,
        language_code: 'en',
        name: 'Learning',
        slug: 'learning',
        created_at: '2026-08-02 09:15:00',
        updated_at: '2026-08-02 09:15:00',
    },
    {
        id: 8,
        category_id: 5,
        language_code: 'vi',
        name: 'Tin tức',
        slug: 'tin-tuc',
        created_at: '2026-08-02 09:20:00',
        updated_at: '2026-08-02 09:20:00',
    },
    {
        id: 9,
        category_id: 5,
        language_code: 'en',
        name: 'News',
        slug: 'news',
        created_at: '2026-08-02 09:20:00',
        updated_at: '2026-08-02 09:20:00',
    },
];

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const TRANSLATION_IDS = CATEGORY_TRANSLATIONS.map(
    (translation) => translation.id,
);

module.exports = {
    /**
     * Create 5 categories and 9 category translations.
     *
     * The category "Đời sống" intentionally has no English translation
     * to test fallback to the default language.
     */
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {

            // 1. Get language IDs by language codes.
            const languages = await queryInterface.sequelize.query(
                `
          SELECT id, code
          FROM languages
          WHERE code IN (:codes)
        `,
                {
                    replacements: {
                        codes: ['vi', 'en'],
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction,
                },
            );

            const languageMap = Object.fromEntries(
                languages.map((language) => [language.code, language.id]),
            );

            if (!languageMap.vi || !languageMap.en) {
                throw new Error(
                    'Seed 04 aborted: languages vi and en must exist. ' +
                    'Run Seed 02 first.',
                );
            }

            // 2. Check whether category IDs already exist.
            const existingCategories =
                await queryInterface.sequelize.query(
                    `
            SELECT id
            FROM categories
            WHERE id IN (:categoryIds)
          `,
                    {
                        replacements: {
                            categoryIds: CATEGORY_IDS,
                        },
                        type: Sequelize.QueryTypes.SELECT,
                        transaction,
                    },
                );

            if (existingCategories.length > 0) {
                throw new Error(
                    'Seed 04 aborted: one or more category IDs already exist. ' +
                    'Check the categories table before running this seeder.',
                );
            }

            // 3. Check whether translation IDs already exist.
            const existingTranslations =
                await queryInterface.sequelize.query(
                    `
            SELECT id
            FROM category_translations
            WHERE id IN (:translationIds)
          `,
                    {
                        replacements: {
                            translationIds: TRANSLATION_IDS,
                        },
                        type: Sequelize.QueryTypes.SELECT,
                        transaction,
                    },
                );

            if (existingTranslations.length > 0) {
                throw new Error(
                    'Seed 04 aborted: one or more category translation IDs ' +
                    'already exist. Check the category_translations table.',
                );
            }

            // 4. Check unique category-language pairs.
            const existingPairs =
                await queryInterface.sequelize.query(
                    `
            SELECT id, category_id, language_id
            FROM category_translations
            WHERE category_id IN (:categoryIds)
              AND language_id IN (:languageIds)
          `,
                    {
                        replacements: {
                            categoryIds: CATEGORY_IDS,
                            languageIds: [languageMap.vi, languageMap.en],
                        },
                        type: Sequelize.QueryTypes.SELECT,
                        transaction,
                    },
                );

            if (existingPairs.length > 0) {
                throw new Error(
                    'Seed 04 aborted: category-language translations already exist.',
                );
            }

            // 5. Check unique slugs within each language.
            for (const languageCode of ['vi', 'en']) {
                const slugs = CATEGORY_TRANSLATIONS
                    .filter((item) => item.language_code === languageCode)
                    .map((item) => item.slug);

                const existingSlugs =
                    await queryInterface.sequelize.query(
                        `
              SELECT id, slug
              FROM category_translations
              WHERE language_id = :languageId
                AND slug IN (:slugs)
            `,
                        {
                            replacements: {
                                languageId: languageMap[languageCode],
                                slugs,
                            },
                            type: Sequelize.QueryTypes.SELECT,
                            transaction,
                        },
                    );

                if (existingSlugs.length > 0) {
                    throw new Error(
                        `Seed 04 aborted: duplicate category slug in ${languageCode}.`,
                    );
                }
            }

            // 6. Insert categories.
            await queryInterface.bulkInsert(
                'categories',
                CATEGORIES,
                { transaction },
            );

            // 7. Prepare translations using actual language IDs.
            const translationRecords = CATEGORY_TRANSLATIONS.map(
                (translation) => ({
                    id: translation.id,
                    category_id: translation.category_id,
                    language_id: languageMap[translation.language_code],
                    name: translation.name,
                    slug: translation.slug,
                    created_at: translation.created_at,
                    updated_at: translation.updated_at,
                }),
            );

            // 8. Insert category translations.
            await queryInterface.bulkInsert(
                'category_translations',
                translationRecords,
                { transaction },
            );
        });
    },

    /**
     * Rollback seeded categories and translations.
     *
     * Posts referencing these categories must be rolled back first.
     */
    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {

            // 1. Check whether posts still reference these categories.
            const postReferences =
                await queryInterface.sequelize.query(
                    `
            SELECT COUNT(*) AS total
            FROM posts
            WHERE category_id IN (:categoryIds)
          `,
                    {
                        replacements: {
                            categoryIds: CATEGORY_IDS,
                        },
                        type: Sequelize.QueryTypes.SELECT,
                        transaction,
                    },
                );

            const postsCount = Number(postReferences[0].total);

            if (postsCount > 0) {
                throw new Error(
                    `Cannot rollback Seed 04: ${postsCount} post(s) still reference ` +
                    'these categories. Rollback Seed 05 first.',
                );
            }

            // 2. Check for additional translations not created by this seeder.
            const additionalTranslations =
                await queryInterface.sequelize.query(
                    `
            SELECT id
            FROM category_translations
            WHERE category_id IN (:categoryIds)
              AND id NOT IN (:translationIds)
          `,
                    {
                        replacements: {
                            categoryIds: CATEGORY_IDS,
                            translationIds: TRANSLATION_IDS,
                        },
                        type: Sequelize.QueryTypes.SELECT,
                        transaction,
                    },
                );

            if (additionalTranslations.length > 0) {
                throw new Error(
                    'Cannot rollback Seed 04: additional translations exist for ' +
                    'these categories. Remove or migrate them first.',
                );
            }

            // 3. Delete category translations first.
            for (const translation of CATEGORY_TRANSLATIONS) {
                await queryInterface.bulkDelete(
                    'category_translations',
                    {
                        id: translation.id,
                        category_id: translation.category_id,
                        slug: translation.slug,
                    },
                    { transaction },
                );
            }

            // 4. Delete categories using their IDs and creation timestamps.
            for (const category of CATEGORIES) {
                await queryInterface.bulkDelete(
                    'categories',
                    {
                        id: category.id,
                        created_at: category.created_at,
                    },
                    { transaction },
                );
            }
        });
    },
};

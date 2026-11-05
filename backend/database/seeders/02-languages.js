const LANGUAGE_SEED_DATA = [
    {
        id: 1,
        code: 'vi',
        name: 'Tiếng Việt',
        is_default: true,
        is_active: true,
    },
    {
        id: 2,
        code: 'en',
        name: 'English',
        is_default: false,
        is_active: true,
    },
];

const LANGUAGE_CODES = LANGUAGE_SEED_DATA.map(
    (language) => language.code,
);

const SEED_TIMESTAMP = '2026-08-01 00:00:00';

module.exports = {
    /**
     * Create the default languages.
     *
     * vi: Default language
     * en: Secondary language
     */
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            // Check whether the seed languages already exist.
            const [existingLanguages] =
                await queryInterface.sequelize.query(
                    `
            SELECT code
            FROM languages
            WHERE code IN (:languageCodes)
          `,
                    {
                        replacements: {
                            languageCodes: LANGUAGE_CODES,
                        },
                        transaction,
                    },
                );

            if (existingLanguages.length > 0) {
                const existingCodes = existingLanguages
                    .map((language) => language.code)
                    .join(', ');

                throw new Error(
                    `Seed 02 aborted: these language codes already exist: ${existingCodes}. ` +
                    'Check the existing data before running this seeder.',
                );
            }

            // Ensure that no other default language already exists.
            const [defaultLanguages] =
                await queryInterface.sequelize.query(
                    `
            SELECT code
            FROM languages
            WHERE is_default = true
          `,
                    { transaction },
                );

            if (defaultLanguages.length > 0) {
                throw new Error(
                    'Seed 02 aborted: a default language already exists. ' +
                    'Only one default language is allowed.',
                );
            }

            // Insert languages.
            await queryInterface.bulkInsert(
                'languages',
                LANGUAGE_SEED_DATA.map((language) => ({
                    ...language,
                    created_at: SEED_TIMESTAMP,
                    updated_at: SEED_TIMESTAMP,
                })),
                { transaction },
            );
        });
    },

    /**
     * Remove the seeded languages.
     *
     * Do not delete languages that are referenced by other tables.
     */
    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            // Check foreign-key references before deletion.
            const [references] =
                await queryInterface.sequelize.query(
                    `
            SELECT
              (SELECT COUNT(*) FROM posts
                WHERE language_id IN (:languageCodes)) AS posts_count,

              (SELECT COUNT(*) FROM post_translations
                WHERE language_id IN (:languageCodes)) AS translations_count,

              (SELECT COUNT(*) FROM category_translations
                WHERE language_id IN (:languageCodes)) AS categories_count,

              (SELECT COUNT(*) FROM ui_translations
                WHERE language_id IN (:languageCodes)) AS ui_count,

              (SELECT COUNT(*) FROM page_translations
                WHERE language_id IN (:languageCodes)) AS pages_count
          `,
                    {
                        replacements: {
                            languageCodes: LANGUAGE_CODES,
                        },
                        transaction,
                    },
                );

            const row = references[0];

            const dependencies = [
                { table: 'posts', count: Number(row.posts_count) },
                {
                    table: 'post_translations',
                    count: Number(row.translations_count),
                },
                {
                    table: 'category_translations',
                    count: Number(row.categories_count),
                },
                {
                    table: 'ui_translations',
                    count: Number(row.ui_count),
                },
                {
                    table: 'page_translations',
                    count: Number(row.pages_count),
                },
            ].filter((item) => item.count > 0);

            if (dependencies.length > 0) {
                const details = dependencies
                    .map((item) => `${item.table}: ${item.count}`)
                    .join(', ');

                throw new Error(
                    `Cannot rollback 02-language. ` +
                    `These languages are still referenced: ${details}. ` +
                    'Rollback dependent data first.',
                );
            }

            // Delete the seeded languages.
            await queryInterface.bulkDelete(
                'languages',
                {
                    code: {
                        [Sequelize.Op.in]: LANGUAGE_CODES,
                    },
                },
                { transaction },
            );
        });
    },
};

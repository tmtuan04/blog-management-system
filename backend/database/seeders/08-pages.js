const { select, languageIds, assertIdsFree } = require('../seed-helpers');

const SEEDER = '08-pages';
const SEED_TIMESTAMP = '2026-08-01 00:00:00';

// Key và URL cố định, chỉ tạo bằng seeder (UC18). Nội dung viết sẵn ở dạng sau khi qua sanitizeRichText.
const PAGES = [
  {
    id: 1,
    key: 'about',
    vi: [
      'Giới thiệu',
      '<p>Inkwell là blog chia sẻ kiến thức về lập trình, công nghệ và đời sống.</p>' +
        '<h2>Chúng tôi viết gì?</h2>' +
        '<ul><li>Hướng dẫn lập trình từ cơ bản đến nâng cao.</li><li>Kinh nghiệm học tập và làm việc.</li><li>Những câu chuyện thường ngày.</li></ul>' +
        '<p>Mỗi bài viết có thể có nhiều ngôn ngữ để bạn đọc theo ngôn ngữ quen thuộc.</p>',
    ],
    en: [
      'About',
      '<p>Inkwell is a blog sharing knowledge about programming, technology and everyday life.</p>' +
        '<h2>What do we write about?</h2>' +
        '<ul><li>Programming tutorials from basic to advanced.</li><li>Experience in studying and working.</li><li>Everyday stories.</li></ul>' +
        '<p>Posts can be available in several languages so you can read in the one you prefer.</p>',
    ],
  },
  {
    id: 2,
    key: 'contact',
    vi: [
      'Liên hệ',
      '<p>Bạn có câu hỏi hoặc góp ý? Hãy gửi email cho chúng tôi.</p>' +
        '<p><strong>Email:</strong> <a rel="noopener noreferrer" href="mailto:contact@blog.local">contact@blog.local</a></p>' +
        '<p>Chúng tôi thường trả lời trong vòng 2 ngày làm việc.</p>',
    ],
    en: [
      'Contact',
      '<p>Have a question or feedback? Send us an email.</p>' +
        '<p><strong>Email:</strong> <a rel="noopener noreferrer" href="mailto:contact@blog.local">contact@blog.local</a></p>' +
        '<p>We usually reply within 2 business days.</p>',
    ],
  },
  {
    id: 3,
    key: 'privacy',
    vi: [
      'Chính sách bảo mật',
      '<p>Chúng tôi tôn trọng và bảo vệ thông tin cá nhân của bạn.</p>' +
        '<h2>Thông tin chúng tôi thu thập</h2>' +
        '<ul><li>Họ tên, email và ảnh đại diện khi bạn đăng ký.</li><li>Bình luận bạn gửi trên bài viết.</li></ul>' +
        '<h2>Cách chúng tôi sử dụng thông tin</h2>' +
        '<p>Thông tin chỉ dùng để vận hành tài khoản và hiển thị bình luận. Chúng tôi <strong>không</strong> chia sẻ thông tin cho bên thứ ba.</p>',
    ],
    en: [
      'Privacy policy',
      '<p>We respect and protect your personal information.</p>' +
        '<h2>Information we collect</h2>' +
        '<ul><li>Your name, email and avatar when you sign up.</li><li>Comments you post on articles.</li></ul>' +
        '<h2>How we use it</h2>' +
        '<p>The information is only used to run your account and display your comments. We do <strong>not</strong> share it with third parties.</p>',
    ],
  },
];

const PAGE_KEYS = PAGES.map((page) => page.key);

module.exports = {
  /** 3 trang tĩnh, mỗi trang có nội dung vi và en */
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const languages = await languageIds(queryInterface, transaction, SEEDER);
      await assertIdsFree(queryInterface, 'pages', PAGES.map((page) => page.id), transaction, SEEDER);
      const taken = await select(
        queryInterface,
        'SELECT `key` FROM pages WHERE `key` IN (:keys)',
        { keys: PAGE_KEYS },
        transaction,
      );
      if (taken.length > 0) {
        throw new Error(`${SEEDER}: đã có trang ${taken.map((row) => row.key).join(', ')}.`);
      }

      await queryInterface.bulkInsert(
        'pages',
        PAGES.map((page) => ({
          id: page.id,
          key: page.key,
          is_visible: true,
          created_at: SEED_TIMESTAMP,
          updated_at: SEED_TIMESTAMP,
        })),
        { transaction },
      );
      await queryInterface.bulkInsert(
        'page_translations',
        PAGES.flatMap((page) =>
          ['vi', 'en'].map((code) => ({
            page_id: page.id,
            language_id: languages[code],
            title: page[code][0],
            content: page[code][1],
            created_at: SEED_TIMESTAMP,
            updated_at: SEED_TIMESTAMP,
          })),
        ),
        { transaction },
      );
    });
  },

  /** Nội dung theo ngôn ngữ xóa theo CASCADE */
  async down(queryInterface) {
    await queryInterface.bulkDelete('pages', { key: PAGE_KEYS });
  },
};

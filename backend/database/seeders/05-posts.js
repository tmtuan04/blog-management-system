const {
  skipInProduction,
  languageIds,
  assertIdsFree,
  seedUuid,
  copySeedImages,
  removeSeedImages,
} = require('../seed-helpers');

const SEEDER = '05-posts';
const SOURCE_IMAGE_COUNT = 7;

// Danh mục: 1 Lập trình, 2 Đời sống (chỉ có tên vi), 3 Công nghệ, 4 Học tập. Danh mục 5 cố ý để trống.
// [id, user_id, ngôn ngữ gốc, category_id, có thumbnail, created_at, updated_at]
const POSTS = [
  [1, 2, 'vi', 1, true, '2026-08-30 21:00:00', '2026-09-03 10:00:00'],
  [2, 2, 'en', 1, true, '2026-09-04 16:10:00', '2026-09-06 08:00:00'],
  [3, 3, 'vi', 2, false, '2026-09-10 11:00:00', '2026-09-10 11:00:00'],
  [4, 2, 'vi', 1, true, '2026-09-12 09:00:00', '2026-09-14 08:00:00'],
  [5, 3, 'en', 1, true, '2026-09-15 14:30:00', '2026-09-16 09:00:00'],
  [6, 2, 'vi', 2, false, '2026-09-18 10:20:00', '2026-09-18 10:20:00'],
  [7, 3, 'vi', 3, true, '2026-09-20 18:00:00', '2026-09-22 08:00:00'],
  [8, 2, 'en', 1, true, '2026-09-23 08:15:00', '2026-09-25 09:00:00'],
  [9, 3, 'vi', 2, false, '2026-09-25 19:30:00', '2026-09-25 19:30:00'],
  [10, 2, 'en', 1, true, '2026-09-27 13:00:00', '2026-09-29 08:00:00'],
  [11, 2, 'vi', 3, true, '2026-09-29 20:00:00', '2026-10-01 08:00:00'],
  [12, 3, 'en', 1, false, '2026-10-01 10:00:00', '2026-10-01 10:00:00'],
  [13, 3, 'vi', 3, true, '2026-10-03 09:00:00', '2026-10-04 08:00:00'],
  [14, 2, 'en', 4, true, '2026-10-05 15:45:00', '2026-10-06 08:00:00'],
  [15, 2, 'vi', 1, true, '2026-10-07 09:30:00', '2026-10-08 08:00:00'],
  [16, 3, 'en', 1, false, '2026-10-09 14:00:00', '2026-10-09 14:00:00'],
  [17, 2, 'vi', 4, true, '2026-10-11 11:20:00', '2026-10-11 11:20:00'],
  [18, 3, 'en', 1, true, '2026-10-13 16:00:00', '2026-10-14 08:00:00'],
  [19, 3, 'vi', 2, false, '2026-10-15 08:45:00', '2026-10-15 08:45:00'],
  [20, 2, 'en', 1, true, '2026-10-17 19:00:00', '2026-10-18 08:00:00'],
  [21, 2, 'vi', 2, true, '2026-10-19 10:00:00', '2026-10-19 10:00:00'],
  [22, 3, 'en', 1, false, '2026-10-21 13:30:00', '2026-10-21 13:30:00'],
  [23, 3, 'vi', 3, true, '2026-10-23 09:15:00', '2026-10-24 08:00:00'],
  [24, 2, 'en', 3, true, '2026-10-25 17:00:00', '2026-10-25 17:00:00'],
  [25, 2, 'vi', 3, false, '2026-10-27 08:30:00', '2026-10-28 08:00:00'],
  [26, 3, 'en', 1, true, '2026-10-29 14:45:00', '2026-10-29 14:45:00'],
  [27, 3, 'vi', 2, true, '2026-10-31 10:00:00', '2026-10-31 10:00:00'],
  [28, 2, 'en', 3, true, '2026-11-01 09:00:00', '2026-11-01 09:00:00'],
  [29, 2, 'vi', 4, true, '2026-11-02 15:30:00', '2026-11-02 15:30:00'],
  [30, 3, 'en', 1, false, '2026-11-03 11:00:00', '2026-11-03 11:00:00'],
];

const thumbnailPath = (postId) => `uploads/images/${seedUuid(1, postId)}.png`;
const CONTENT_IMAGE = `uploads/images/${seedUuid(3, 1)}.png`;

/** Ảnh thumbnail: mỗi bài một file riêng vì xóa bài thì xóa luôn file thumbnail */
const IMAGES = [
  ...POSTS.filter((post) => post[4]).map(([id]) => ({
    source: `post-${((id - 1) % SOURCE_IMAGE_COUNT) + 1}.png`,
    path: thumbnailPath(id),
  })),
  { source: 'post-3.png', path: CONTENT_IMAGE },
];

// Nội dung dùng đủ các thẻ của editor (phase 3 doc mục 3.7), viết sẵn ở dạng sau khi qua sanitizeRichText
const ANGULAR_VI = [
  '<p>Angular là framework của Google để xây dựng ứng dụng web một trang (SPA). Bài viết đi từ cài đặt tới component đầu tiên.</p>',
  '<h2>Chuẩn bị môi trường</h2>',
  '<p>Bạn cần cài <strong>Node.js LTS</strong> và <em>Angular CLI</em>. Hướng dẫn chi tiết có tại <a rel="noopener noreferrer" href="https://angular.dev" target="_blank">angular.dev</a>.</p>',
  '<ol><li>Cài Node.js LTS.</li><li>Chạy <code>npm install -g @angular/cli</code>.</li><li>Tạo project bằng <code>ng new my-app</code>.</li></ol>',
  '<h3>Cấu trúc thư mục</h3>',
  '<ul><li><code>src/app</code>: component, service và route.</li><li><code>src/assets</code>: ảnh và file tĩnh.</li></ul>',
  `<figure><img src="/${CONTENT_IMAGE}" alt="Sơ đồ component Angular" /><figcaption>Mỗi màn hình được ghép từ nhiều component nhỏ.</figcaption></figure>`,
  '<h2>Component đầu tiên</h2>',
  '<pre><code>ng generate component hello</code></pre>',
  '<blockquote>Hãy giữ mỗi component thật nhỏ và chỉ làm một việc.</blockquote>',
  '<p><u>Lưu ý:</u> chạy <code>ng serve</code> rồi mở trình duyệt ở cổng 4200.<br />Trang tự tải lại mỗi khi bạn sửa code.</p>',
].join('');

const ANGULAR_EN = [
  '<p>Angular is a framework by Google for building single-page applications (SPA). This post goes from installation to your first component.</p>',
  '<h2>Setting up</h2>',
  '<p>You need <strong>Node.js LTS</strong> and the <em>Angular CLI</em>. Detailed instructions are available at <a rel="noopener noreferrer" href="https://angular.dev" target="_blank">angular.dev</a>.</p>',
  '<ol><li>Install Node.js LTS.</li><li>Run <code>npm install -g @angular/cli</code>.</li><li>Create a project with <code>ng new my-app</code>.</li></ol>',
  '<h3>Folder structure</h3>',
  '<ul><li><code>src/app</code>: components, services and routes.</li><li><code>src/assets</code>: images and static files.</li></ul>',
  `<figure><img src="/${CONTENT_IMAGE}" alt="Angular component diagram" /><figcaption>Each screen is composed of many small components.</figcaption></figure>`,
  '<h2>Your first component</h2>',
  '<pre><code>ng generate component hello</code></pre>',
  '<blockquote>Keep each component small and focused on a single task.</blockquote>',
  '<p><u>Note:</u> run <code>ng serve</code> and open the browser on port 4200.<br />The page reloads every time you change the code.</p>',
].join('');

const NESTJS_EN = [
  '<p>NestJS is a Node.js framework for building server-side applications with TypeScript.</p>',
  '<h2>Why NestJS?</h2>',
  '<ul><li>A clear structure based on <strong>modules</strong>, <strong>controllers</strong> and <strong>providers</strong>.</li><li>Built-in dependency injection.</li><li>First-class TypeScript support.</li></ul>',
  '<h3>Create a project</h3>',
  '<pre><code>npm i -g @nestjs/cli\nnest new blog-api</code></pre>',
  '<p>Read more in the <a rel="noopener noreferrer" href="https://docs.nestjs.com" target="_blank">official documentation</a>.</p>',
].join('');

const POST_TRANSLATIONS = [
  // 5 bản dịch đầu theo docs/sample-data.md
  {
    id: 1, post_id: 1, language: 'vi',
    title: 'Hướng dẫn Angular', slug: 'huong-dan-angular',
    excerpt: 'Làm quen với Angular từ con số 0.', content: ANGULAR_VI,
    status: 'published', view_count: 120, published_at: '2026-09-01 08:00:00',
    created_at: '2026-08-30 21:00:00', updated_at: '2026-09-01 08:00:00',
  },
  {
    id: 2, post_id: 1, language: 'en',
    title: 'Angular tutorial', slug: 'angular-tutorial',
    excerpt: 'Learn Angular from scratch.', content: ANGULAR_EN,
    status: 'published', view_count: 30, published_at: '2026-09-03 10:00:00',
    created_at: '2026-09-02 15:00:00', updated_at: '2026-09-03 10:00:00',
  },
  {
    id: 3, post_id: 2, language: 'en',
    title: 'Getting started with NestJS', slug: 'getting-started-with-nestjs',
    excerpt: 'A quick introduction to NestJS.', content: NESTJS_EN,
    status: 'published', view_count: 45, published_at: '2026-09-05 09:30:00',
    created_at: '2026-09-04 16:10:00', updated_at: '2026-09-05 09:30:00',
  },
  // Bản dịch vi còn draft: ở vi chưa hiện bài này
  {
    id: 4, post_id: 2, language: 'vi',
    title: 'Bắt đầu với NestJS', slug: 'bat-dau-voi-nestjs',
    excerpt: null, content: '<p>NestJS là framework Node.js để xây dựng ứng dụng phía server bằng TypeScript.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-09-06 08:00:00', updated_at: '2026-09-06 08:00:00',
  },
  {
    id: 5, post_id: 3, language: 'vi',
    title: 'Bản nháp', slug: 'ban-nhap',
    excerpt: null, content: '<p>Ghi chú cho bài viết sắp tới.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-09-10 11:00:00', updated_at: '2026-09-10 11:00:00',
  },
  {
    id: 6, post_id: 4, language: 'vi',
    title: 'Các khái niệm cơ bản trong lập trình', slug: 'cac-khai-niem-co-ban-trong-lap-trinh',
    excerpt: 'Tìm hiểu những khái niệm nền tảng dành cho người mới học lập trình.',
    content: '<p>Bài viết giới thiệu các khái niệm cơ bản như biến, kiểu dữ liệu, câu lệnh điều kiện và vòng lặp.</p>',
    status: 'published', view_count: 85, published_at: '2026-09-14 08:00:00',
    created_at: '2026-09-12 09:00:00', updated_at: '2026-09-14 08:00:00',
  },
  {
    id: 7, post_id: 4, language: 'en',
    title: 'Basic Programming Concepts', slug: 'basic-programming-concepts',
    excerpt: 'Learn the fundamental concepts of programming.',
    content: '<p>This article introduces variables, data types, conditional statements, and loops.</p>',
    status: 'published', view_count: 25, published_at: '2026-09-15 08:00:00',
    created_at: '2026-09-14 10:00:00', updated_at: '2026-09-15 08:00:00',
  },
  {
    id: 8, post_id: 5, language: 'en',
    title: 'Understanding JavaScript Variables', slug: 'understanding-javascript-variables',
    excerpt: 'An introduction to variables and data types in JavaScript.',
    content: '<p>Learn how to declare variables and work with common JavaScript data types.</p>',
    status: 'published', view_count: 62, published_at: '2026-09-16 09:00:00',
    created_at: '2026-09-15 14:30:00', updated_at: '2026-09-16 09:00:00',
  },
  {
    id: 9, post_id: 5, language: 'vi',
    title: 'Tìm hiểu biến trong JavaScript', slug: 'tim-hieu-bien-trong-javascript',
    excerpt: 'Giới thiệu về biến và kiểu dữ liệu trong JavaScript.',
    content: '<p>Tìm hiểu cách khai báo biến và sử dụng các kiểu dữ liệu phổ biến trong JavaScript.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-09-16 10:00:00', updated_at: '2026-09-16 10:00:00',
  },
  {
    id: 10, post_id: 6, language: 'vi',
    title: 'Cách quản lý thời gian hiệu quả', slug: 'cach-quan-ly-thoi-gian-hieu-qua',
    excerpt: 'Một số phương pháp giúp sắp xếp công việc và thời gian hợp lý.',
    content: '<p>Bài viết chia sẻ cách lập kế hoạch, xác định mức độ ưu tiên và duy trì thói quen làm việc hiệu quả.</p>',
    status: 'published', view_count: 74, published_at: '2026-09-19 08:00:00',
    created_at: '2026-09-18 10:20:00', updated_at: '2026-09-19 08:00:00',
  },
  // Danh mục 2 chưa có tên en: bài này xem ở en sẽ hiện danh mục "Đời sống"
  {
    id: 11, post_id: 6, language: 'en',
    title: 'How to Manage Your Time Effectively', slug: 'how-to-manage-your-time-effectively',
    excerpt: 'Practical methods for organizing tasks and managing time.',
    content: '<p>This article shares ways to plan tasks, set priorities, and build productive habits.</p>',
    status: 'published', view_count: 18, published_at: '2026-09-20 08:00:00',
    created_at: '2026-09-19 10:00:00', updated_at: '2026-09-20 08:00:00',
  },
  {
    id: 12, post_id: 7, language: 'vi',
    title: 'Giới thiệu về Git và GitHub', slug: 'gioi-thieu-ve-git-va-github',
    excerpt: 'Tìm hiểu công cụ quản lý phiên bản phổ biến trong phát triển phần mềm.',
    content: '<p>Git giúp theo dõi lịch sử thay đổi mã nguồn, còn GitHub hỗ trợ lưu trữ và cộng tác trên dự án.</p>',
    status: 'published', view_count: 110, published_at: '2026-09-22 08:00:00',
    created_at: '2026-09-20 18:00:00', updated_at: '2026-09-22 08:00:00',
  },
  {
    id: 13, post_id: 7, language: 'en',
    title: 'Introduction to Git and GitHub', slug: 'introduction-to-git-and-github',
    excerpt: 'Explore popular version control tools used in software development.',
    content: '<p>Git tracks source code changes, while GitHub provides hosting and collaboration features.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-09-22 09:00:00', updated_at: '2026-09-22 09:00:00',
  },
  {
    id: 14, post_id: 8, language: 'en',
    title: 'A Beginner Guide to REST APIs', slug: 'a-beginner-guide-to-rest-apis',
    excerpt: 'Understand the basic principles of REST API design.',
    content: '<p>This guide explains resources, HTTP methods, status codes, and common REST API practices.</p>',
    status: 'published', view_count: 95, published_at: '2026-09-25 09:00:00',
    created_at: '2026-09-23 08:15:00', updated_at: '2026-09-25 09:00:00',
  },
  {
    id: 15, post_id: 8, language: 'vi',
    title: 'Hướng dẫn cơ bản về REST API', slug: 'huong-dan-co-ban-ve-rest-api',
    excerpt: 'Tìm hiểu những nguyên tắc cơ bản trong thiết kế REST API.',
    content: '<p>Bài viết giải thích tài nguyên, phương thức HTTP, mã trạng thái và các quy tắc REST API thường gặp.</p>',
    status: 'published', view_count: 32, published_at: '2026-09-26 09:00:00',
    created_at: '2026-09-25 10:00:00', updated_at: '2026-09-26 09:00:00',
  },
  {
    id: 16, post_id: 9, language: 'vi',
    title: 'Những thói quen sống lành mạnh', slug: 'nhung-thoi-quen-song-lanh-manh',
    excerpt: 'Một số thói quen đơn giản giúp cải thiện chất lượng cuộc sống.',
    content: '<p>Ngủ đủ giấc, vận động thường xuyên và ăn uống cân bằng là những thói quen có lợi cho sức khỏe.</p>',
    status: 'published', view_count: 53, published_at: '2026-09-26 08:00:00',
    created_at: '2026-09-25 19:30:00', updated_at: '2026-09-26 08:00:00',
  },
  {
    id: 17, post_id: 9, language: 'en',
    title: 'Healthy Lifestyle Habits', slug: 'healthy-lifestyle-habits',
    excerpt: 'Simple habits that can improve your quality of life.',
    content: '<p>Getting enough sleep, exercising regularly, and eating a balanced diet are beneficial daily habits.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-09-26 10:00:00', updated_at: '2026-09-26 10:00:00',
  },
  {
    id: 18, post_id: 10, language: 'en',
    title: 'Tips for Building a Personal Website', slug: 'tips-for-building-a-personal-website',
    excerpt: 'Useful tips for planning and creating your first personal website.',
    content: '<p>Start with a clear purpose, choose a suitable layout, and organize your content before building the website.</p>',
    status: 'published', view_count: 88, published_at: '2026-09-29 08:00:00',
    created_at: '2026-09-27 13:00:00', updated_at: '2026-09-29 08:00:00',
  },
  {
    id: 19, post_id: 10, language: 'vi',
    title: 'Mẹo xây dựng website cá nhân', slug: 'meo-xay-dung-website-ca-nhan',
    excerpt: 'Một số gợi ý hữu ích khi lên kế hoạch tạo website cá nhân.',
    content: '<p>Hãy xác định mục đích, lựa chọn bố cục phù hợp và sắp xếp nội dung trước khi xây dựng website.</p>',
    status: 'published', view_count: 21, published_at: '2026-09-30 08:00:00',
    created_at: '2026-09-29 09:00:00', updated_at: '2026-09-30 08:00:00',
  },
  {
    id: 20, post_id: 11, language: 'vi',
    title: 'Tìm hiểu về cơ sở dữ liệu quan hệ', slug: 'tim-hieu-ve-co-so-du-lieu-quan-he',
    excerpt: 'Các thành phần cơ bản của một cơ sở dữ liệu quan hệ.',
    content: '<p>Bài viết giới thiệu bảng, hàng, cột, khóa chính và khóa ngoại trong cơ sở dữ liệu quan hệ.</p>',
    status: 'published', view_count: 130, published_at: '2026-10-01 08:00:00',
    created_at: '2026-09-29 20:00:00', updated_at: '2026-10-01 08:00:00',
  },
  {
    id: 21, post_id: 11, language: 'en',
    title: 'Introduction to Relational Databases', slug: 'introduction-to-relational-databases',
    excerpt: 'Learn the basic components of a relational database.',
    content: '<p>This article introduces tables, rows, columns, primary keys, and foreign keys.</p>',
    status: 'published', view_count: 42, published_at: '2026-10-02 08:00:00',
    created_at: '2026-10-01 09:00:00', updated_at: '2026-10-02 08:00:00',
  },
  {
    id: 22, post_id: 12, language: 'en',
    title: 'Understanding Asynchronous JavaScript', slug: 'understanding-asynchronous-javascript',
    excerpt: 'An introduction to callbacks, promises, and async/await.',
    content: '<p>Learn how JavaScript handles asynchronous operations with callbacks, promises, and async/await.</p>',
    status: 'published', view_count: 67, published_at: '2026-10-02 10:00:00',
    created_at: '2026-10-01 10:00:00', updated_at: '2026-10-02 10:00:00',
  },
  {
    id: 23, post_id: 12, language: 'vi',
    title: 'Tìm hiểu JavaScript bất đồng bộ', slug: 'tim-hieu-javascript-bat-dong-bo',
    excerpt: 'Giới thiệu callback, promise và async/await.',
    content: '<p>Tìm hiểu cách JavaScript xử lý các tác vụ bất đồng bộ bằng callback, promise và async/await.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-10-02 11:00:00', updated_at: '2026-10-02 11:00:00',
  },
  {
    id: 24, post_id: 13, language: 'vi',
    title: 'Cách bảo vệ thông tin cá nhân trên Internet', slug: 'cach-bao-ve-thong-tin-ca-nhan-tren-internet',
    excerpt: 'Những lưu ý giúp bảo vệ tài khoản và dữ liệu cá nhân khi trực tuyến.',
    content: '<p>Sử dụng mật khẩu mạnh, bật xác thực hai yếu tố và cẩn trọng với các đường dẫn đáng ngờ.</p>',
    status: 'published', view_count: 150, published_at: '2026-10-04 08:00:00',
    created_at: '2026-10-03 09:00:00', updated_at: '2026-10-04 08:00:00',
  },
  {
    id: 25, post_id: 13, language: 'en',
    title: 'Protecting Your Personal Information Online', slug: 'protecting-your-personal-information-online',
    excerpt: 'Tips for protecting your accounts and personal data online.',
    content: '<p>Use strong passwords, enable two-factor authentication, and be careful with suspicious links.</p>',
    status: 'archived', view_count: 12, published_at: '2026-10-05 08:00:00',
    created_at: '2026-10-04 09:00:00', updated_at: '2026-10-06 08:00:00',
  },
  {
    id: 26, post_id: 14, language: 'en',
    title: 'How to Write Better Technical Documentation', slug: 'how-to-write-better-technical-documentation',
    excerpt: 'Practical advice for writing clear and useful technical documents.',
    content: '<p>Good technical documentation should be accurate, well-structured, consistent, and easy to follow.</p>',
    status: 'published', view_count: 76, published_at: '2026-10-06 08:00:00',
    created_at: '2026-10-05 15:45:00', updated_at: '2026-10-06 08:00:00',
  },
  {
    id: 27, post_id: 14, language: 'vi',
    title: 'Cách viết tài liệu kỹ thuật hiệu quả', slug: 'cach-viet-tai-lieu-ky-thuat-hieu-qua',
    excerpt: 'Một số gợi ý để viết tài liệu kỹ thuật rõ ràng và hữu ích.',
    content: '<p>Tài liệu kỹ thuật tốt cần chính xác, có cấu trúc rõ ràng, nhất quán và dễ theo dõi.</p>',
    status: 'published', view_count: 28, published_at: '2026-10-07 08:00:00',
    created_at: '2026-10-06 09:00:00', updated_at: '2026-10-07 08:00:00',
  },
  // Bài 15-30 chỉ có bản gốc
  {
    id: 28, post_id: 15, language: 'vi',
    title: 'Các bước xây dựng một ứng dụng web', slug: 'cac-buoc-xay-dung-mot-ung-dung-web',
    excerpt: 'Tổng quan các bước chính khi phát triển một ứng dụng web.',
    content: '<p>Quá trình phát triển ứng dụng web thường bao gồm phân tích yêu cầu, thiết kế, lập trình, kiểm thử và triển khai.</p>',
    status: 'published', view_count: 92, published_at: '2026-10-08 08:00:00',
    created_at: '2026-10-07 09:30:00', updated_at: '2026-10-08 08:00:00',
  },
  {
    id: 29, post_id: 16, language: 'en',
    title: 'Getting Started with TypeScript', slug: 'getting-started-with-typescript',
    excerpt: 'An overview of TypeScript and its main features.',
    content: '<p>TypeScript adds static typing to JavaScript and helps developers build more maintainable applications.</p>',
    status: 'published', view_count: 58, published_at: '2026-10-10 08:00:00',
    created_at: '2026-10-09 14:00:00', updated_at: '2026-10-10 08:00:00',
  },
  {
    id: 30, post_id: 17, language: 'vi',
    title: 'Lập kế hoạch học tập cho người mới bắt đầu', slug: 'lap-ke-hoach-hoc-tap-cho-nguoi-moi-bat-dau',
    excerpt: 'Gợi ý cách xây dựng kế hoạch học tập phù hợp.',
    content: '<p>Hãy xác định mục tiêu, chia nhỏ nội dung và duy trì thời gian học tập đều đặn.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-10-11 11:20:00', updated_at: '2026-10-11 11:20:00',
  },
  {
    id: 31, post_id: 18, language: 'en',
    title: 'Introduction to Responsive Web Design', slug: 'introduction-to-responsive-web-design',
    excerpt: 'Learn how to create websites that work across different screen sizes.',
    content: '<p>Responsive design helps a website adapt its layout to desktops, tablets, and mobile devices.</p>',
    status: 'published', view_count: 105, published_at: '2026-10-14 08:00:00',
    created_at: '2026-10-13 16:00:00', updated_at: '2026-10-14 08:00:00',
  },
  {
    id: 32, post_id: 19, language: 'vi',
    title: 'Những lợi ích của việc đọc sách', slug: 'nhung-loi-ich-cua-viec-doc-sach',
    excerpt: 'Đọc sách giúp mở rộng kiến thức và cải thiện khả năng tư duy.',
    content: '<p>Thói quen đọc sách thường xuyên giúp chúng ta tiếp cận kiến thức mới và rèn luyện khả năng tập trung.</p>',
    status: 'archived', view_count: 34, published_at: '2026-10-16 08:00:00',
    created_at: '2026-10-15 08:45:00', updated_at: '2026-10-17 08:00:00',
  },
  {
    id: 33, post_id: 20, language: 'en',
    title: 'A Practical Guide to CSS Flexbox', slug: 'a-practical-guide-to-css-flexbox',
    excerpt: 'Understand how Flexbox helps arrange elements in a web layout.',
    content: '<p>Flexbox provides a convenient way to align, distribute, and order elements within a container.</p>',
    status: 'published', view_count: 140, published_at: '2026-10-18 08:00:00',
    created_at: '2026-10-17 19:00:00', updated_at: '2026-10-18 08:00:00',
  },
  {
    id: 34, post_id: 21, language: 'vi',
    title: 'Cách duy trì thói quen tập thể dục', slug: 'cach-duy-tri-thoi-quen-tap-the-duc',
    excerpt: 'Một số phương pháp giúp duy trì việc vận động mỗi ngày.',
    content: '<p>Bắt đầu với mục tiêu nhỏ, lựa chọn hoạt động yêu thích và xây dựng lịch tập phù hợp với bản thân.</p>',
    status: 'published', view_count: 61, published_at: '2026-10-20 08:00:00',
    created_at: '2026-10-19 10:00:00', updated_at: '2026-10-20 08:00:00',
  },
  {
    id: 35, post_id: 22, language: 'en',
    title: 'Writing Clean and Readable Code', slug: 'writing-clean-and-readable-code',
    excerpt: 'Simple practices for making source code easier to understand.',
    content: '<p>Use meaningful names, keep functions focused, and maintain consistent formatting to improve code readability.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-10-21 13:30:00', updated_at: '2026-10-21 13:30:00',
  },
  {
    id: 36, post_id: 23, language: 'vi',
    title: 'Tìm hiểu về bảo mật mật khẩu', slug: 'tim-hieu-ve-bao-mat-mat-khau',
    excerpt: 'Các nguyên tắc cơ bản để tạo và bảo vệ mật khẩu.',
    content: '<p>Nên sử dụng mật khẩu dài, không dùng lại mật khẩu giữa các dịch vụ và bật xác thực nhiều yếu tố.</p>',
    status: 'published', view_count: 118, published_at: '2026-10-24 08:00:00',
    created_at: '2026-10-23 09:15:00', updated_at: '2026-10-24 08:00:00',
  },
  {
    id: 37, post_id: 24, language: 'en',
    title: 'The Basics of Software Testing', slug: 'the-basics-of-software-testing',
    excerpt: 'An introduction to common software testing activities.',
    content: '<p>Software testing helps identify defects and verify that an application meets its requirements.</p>',
    status: 'archived', view_count: 19, published_at: '2026-10-26 08:00:00',
    created_at: '2026-10-25 17:00:00', updated_at: '2026-10-27 08:00:00',
  },
  {
    id: 38, post_id: 25, language: 'vi',
    title: 'Mẹo sử dụng Internet an toàn', slug: 'meo-su-dung-internet-an-toan',
    excerpt: 'Những lưu ý khi truy cập và sử dụng các dịch vụ trực tuyến.',
    content: '<p>Kiểm tra địa chỉ website, hạn chế chia sẻ thông tin cá nhân và cập nhật phần mềm thường xuyên.</p>',
    status: 'published', view_count: 45, published_at: '2026-10-28 08:00:00',
    created_at: '2026-10-27 08:30:00', updated_at: '2026-10-28 08:00:00',
  },
  {
    id: 39, post_id: 26, language: 'en',
    title: 'Getting Started with Node.js', slug: 'getting-started-with-nodejs',
    excerpt: 'Learn the basics of running JavaScript on the server.',
    content: '<p>Node.js allows developers to use JavaScript outside the browser and build server-side applications.</p>',
    status: 'published', view_count: 97, published_at: '2026-10-30 08:00:00',
    created_at: '2026-10-29 14:45:00', updated_at: '2026-10-30 08:00:00',
  },
  {
    id: 40, post_id: 27, language: 'vi',
    title: 'Cách sắp xếp công việc cá nhân', slug: 'cach-sap-xep-cong-viec-ca-nhan',
    excerpt: 'Một số cách đơn giản để quản lý công việc hằng ngày.',
    content: '<p>Ghi lại công việc cần làm, phân chia mức độ ưu tiên và dành thời gian đánh giá kết quả mỗi ngày.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-10-31 10:00:00', updated_at: '2026-10-31 10:00:00',
  },
  {
    id: 41, post_id: 28, language: 'en',
    title: 'An Introduction to Database Indexes', slug: 'an-introduction-to-database-indexes',
    excerpt: 'Understand how indexes can improve database query performance.',
    content: '<p>Database indexes help locate records more efficiently, although they also require storage and maintenance.</p>',
    status: 'published', view_count: 73, published_at: '2026-11-02 08:00:00',
    created_at: '2026-11-01 09:00:00', updated_at: '2026-11-02 08:00:00',
  },
  {
    id: 42, post_id: 29, language: 'vi',
    title: 'Lợi ích của việc học ngoại ngữ', slug: 'loi-ich-cua-viec-hoc-ngoai-ngu',
    excerpt: 'Học ngoại ngữ giúp mở rộng cơ hội học tập và giao tiếp.',
    content: '<p>Việc học ngoại ngữ giúp tiếp cận thêm nguồn kiến thức, giao lưu với nhiều người và khám phá các nền văn hóa.</p>',
    status: 'published', view_count: 56, published_at: '2026-11-03 08:00:00',
    created_at: '2026-11-02 15:30:00', updated_at: '2026-11-03 08:00:00',
  },
  {
    id: 43, post_id: 30, language: 'en',
    title: 'Planning Your First Web Development Project', slug: 'planning-your-first-web-development-project',
    excerpt: 'A starting point for planning a small web development project.',
    content: '<p>Define the project scope, identify the main features, and break the work into manageable tasks.</p>',
    status: 'draft', view_count: 0, published_at: null,
    created_at: '2026-11-03 11:00:00', updated_at: '2026-11-03 11:00:00',
  },
];

const POST_IDS = POSTS.map(([id]) => id);

module.exports = {
  /** 30 bài, 43 bản dịch. Ảnh mẫu copy từ database/seed-data/images/ vào uploads/images/ */
  async up(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      const languages = await languageIds(queryInterface, transaction, SEEDER);
      await assertIdsFree(queryInterface, 'posts', POST_IDS, transaction, SEEDER);
      await assertIdsFree(
        queryInterface,
        'post_translations',
        POST_TRANSLATIONS.map((translation) => translation.id),
        transaction,
        SEEDER,
      );

      await queryInterface.bulkInsert(
        'posts',
        POSTS.map(([id, userId, language, categoryId, hasThumbnail, createdAt, updatedAt]) => ({
          id,
          user_id: userId,
          language_id: languages[language],
          category_id: categoryId,
          thumbnail: hasThumbnail ? thumbnailPath(id) : null,
          created_at: createdAt,
          updated_at: updatedAt,
        })),
        { transaction },
      );
      await queryInterface.bulkInsert(
        'post_translations',
        POST_TRANSLATIONS.map(({ language, ...translation }) => ({
          ...translation,
          language_id: languages[language],
        })),
        { transaction },
      );

      await copySeedImages(IMAGES);
    });
  },

  /** Bản dịch và bình luận xóa theo CASCADE */
  async down(queryInterface) {
    if (skipInProduction(SEEDER)) {
      return;
    }
    await queryInterface.bulkDelete('posts', { id: POST_IDS });
    await removeSeedImages(IMAGES.map((image) => image.path));
  },
};

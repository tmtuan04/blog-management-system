// Hàm dùng chung cho seeders. Không đặt trong seeders/ vì sequelize-cli chạy mọi file .js trong đó.
const fs = require('fs/promises');
const path = require('path');
const { QueryTypes } = require('sequelize');

const SEED_IMAGE_DIR = path.join(__dirname, 'seed-data', 'images');

/**
 * Seeder dữ liệu demo (tài khoản mật khẩu chung, bài viết mẫu) không chạy ở production.
 * Dữ liệu hệ thống (roles, languages, ui_translations, pages) vẫn nạp bình thường.
 */
function skipInProduction(seeder) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  console.warn(`${seeder}: bỏ qua dữ liệu demo khi NODE_ENV=production`);
  return true;
}

function select(queryInterface, sql, replacements, transaction) {
  return queryInterface.sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction,
  });
}

/** `{ vi: 1, en: 2 }`. Thiếu mã nào thì dừng và nhắc chạy 02-languages */
async function languageIds(queryInterface, transaction, seeder) {
  const rows = await select(
    queryInterface,
    'SELECT id, code FROM languages WHERE code IN (:codes)',
    { codes: ['vi', 'en'] },
    transaction,
  );
  const ids = Object.fromEntries(rows.map((row) => [row.code, row.id]));
  if (!ids.vi || !ids.en) {
    throw new Error(`${seeder}: cần ngôn ngữ vi và en. Chạy 02-languages trước.`);
  }
  return ids;
}

/** Dừng khi bảng đã có id trùng, để seeder không ghi đè dữ liệu có sẵn */
async function assertIdsFree(queryInterface, table, ids, transaction, seeder) {
  const rows = await select(
    queryInterface,
    `SELECT id FROM \`${table}\` WHERE id IN (:ids)`,
    { ids },
    transaction,
  );
  if (rows.length > 0) {
    throw new Error(
      `${seeder}: bảng ${table} đã có id ${rows.map((row) => row.id).join(', ')}. ` +
        'Chạy npm run db:seed:undo hoặc làm lại database trống trước.',
    );
  }
}

/** UUID cố định cho ảnh mẫu, khớp UPLOAD_PATH_PATTERN của UploadService */
function seedUuid(group, n) {
  return `5eed000${group}-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Cùng cách tính với UploadService: UPLOAD_DIR tính từ thư mục backend/ */
function toDiskPath(publicPath) {
  const root = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
  return path.join(root, publicPath.slice('uploads/'.length));
}

/** Copy ảnh trong seed-data/images/ vào uploads/. `files`: `[{ source: 'post-1.png', path: 'uploads/images/<uuid>.png' }]` */
async function copySeedImages(files) {
  for (const file of files) {
    const target = toDiskPath(file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(SEED_IMAGE_DIR, file.source), target);
  }
}

async function removeSeedImages(paths) {
  await Promise.all(paths.map((publicPath) => fs.rm(toDiskPath(publicPath), { force: true })));
}

module.exports = {
  skipInProduction,
  select,
  languageIds,
  assertIdsFree,
  seedUuid,
  copySeedImages,
  removeSeedImages,
};

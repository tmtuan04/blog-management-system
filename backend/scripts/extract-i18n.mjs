// Xuất danh sách key UI translation từ html/ cho seeder 07-ui-translations (phase 3 doc mục 5).
// Chạy trong backend/:
//   npm run i18n:extract   cập nhật database/seed-data/ui-translations.json
//   npm run i18n:check     chỉ kiểm tra, file lệch với HTML hoặc còn key thiếu `en` thì exit 1
//
// Nguồn key:
// - data-i18n="key"              giá trị vi = chữ bên trong phần tử
// - data-i18n-<thuộc tính>="key"  giá trị vi = thuộc tính <thuộc tính> của cùng phần tử
// - data-loading-i18n="key"      giá trị vi = data-loading-text (mặc định lấy từ js/demo-state.js)
// - html/js/*.js: cặp { text: '...', i18n: '...' } mà script gán data-i18n lúc chạy
// Không quét _templates/ vì đó là khung để copy, không phải trang thật.
//
// Giá trị `vi` lấy lại từ HTML mỗi lần chạy. Giá trị `en` dịch tay trong file JSON và được giữ nguyên;
// key mới có `en: null` để người dịch điền.
//
// Chữ trong HTML có dữ liệu demo (số lượng, tên người, tên file) thì thêm trường `sample` vào key đó và viết
// `vi`, `en` bằng tay với tham số `{{ten}}`, ví dụ "Trả lời {{name}}...". Key có `sample` thì script giữ
// nguyên `vi`, chỉ ghi chữ trong HTML vào `sample` và báo khi chữ đó đổi để người viết xem lại mẫu.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML_DIR = resolve(BACKEND, '..', 'html');
const OUTPUT = join(BACKEND, 'database', 'seed-data', 'ui-translations.json');
const SKIP_DIRS = new Set(['node_modules', '_templates', 'scripts']);
const KEY_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  middot: '·', copy: '©', rarr: '→', larr: '←', laquo: '«', raquo: '»', times: '×',
};

const checkOnly = process.argv.includes('--check');
const entries = new Map(); // key -> { vi, sources: [] }
const errors = [];

function listFiles(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : listFiles(path, ext);
    return entry.name.endsWith(ext) ? [path] : [];
  });
}

const rel = (file) => relative(HTML_DIR, file).split(sep).join('/');
const lineOf = (content, index) => content.slice(0, index).split('\n').length;

function decode(text, where) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return String.fromCodePoint(code);
    }
    if (name in ENTITIES) return ENTITIES[name];
    errors.push(`${where}: không đọc được entity ${match}`);
    return match;
  });
}

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

function record(key, vi, where) {
  if (!KEY_PATTERN.test(key)) {
    errors.push(`${where}: key "${key}" sai dạng nhom.ten`);
    return;
  }
  if (!vi) {
    errors.push(`${where}: key "${key}" không có chữ tiếng Việt`);
    return;
  }
  const entry = entries.get(key);
  if (!entry) {
    entries.set(key, { vi, sources: [where] });
  } else if (entry.vi !== vi) {
    errors.push(`${where}: key "${key}" = "${vi}", nhưng ${entry.sources[0]} ghi "${entry.vi}"`);
  } else {
    entry.sources.push(where);
  }
}

function parseAttributes(source) {
  const attrs = {};
  for (const match of source.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

// Chữ loading mặc định của nút data-demo-loading (js/demo-state.js)
const demoState = readFileSync(join(HTML_DIR, 'js', 'demo-state.js'), 'utf8');
const DEFAULT_LOADING_TEXT = demoState.match(/DEFAULT_LOADING_TEXT = '([^']*)'/)?.[1];
const DEFAULT_LOADING_I18N = demoState.match(/DEFAULT_LOADING_I18N = '([^']*)'/)?.[1];

function scanHtml(file) {
  // Xóa comment, nội dung <script>/<style> nhưng giữ dấu xuống dòng để số dòng vẫn đúng
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  const content = readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, __, body, close) => open + blank(body) + close);

  const stack = []; // phần tử đang mở: { tag, key, text, where }
  const TAG = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0;

  const pushText = (text) => {
    for (const el of stack) if (el.key) el.text.push(text);
  };

  for (const match of content.matchAll(TAG)) {
    pushText(content.slice(last, match.index));
    last = match.index + match[0].length;

    const [, closing, rawTag, rawAttrs] = match;
    const tag = rawTag.toLowerCase();
    const where = `${rel(file)}:${lineOf(content, match.index)}`;

    if (closing) {
      const index = stack.map((el) => el.tag).lastIndexOf(tag);
      if (index === -1) continue;
      for (const el of stack.splice(index).reverse()) {
        if (el.key) record(el.key, normalize(decode(el.text.join(''), el.where)), el.where);
      }
      continue;
    }

    const attrs = parseAttributes(rawAttrs);
    for (const [name, key] of Object.entries(attrs)) {
      if (!name.startsWith('data-i18n-')) continue;
      const target = name.slice('data-i18n-'.length);
      if (!(target in attrs)) {
        errors.push(`${where}: có ${name}="${key}" nhưng thiếu thuộc tính ${target}`);
        continue;
      }
      record(key, normalize(decode(attrs[target], where)), where);
    }
    if ('data-loading-i18n' in attrs) {
      record(attrs['data-loading-i18n'], normalize(decode(attrs['data-loading-text'] ?? DEFAULT_LOADING_TEXT, where)), where);
    } else if ('data-demo-loading' in attrs && DEFAULT_LOADING_I18N) {
      record(DEFAULT_LOADING_I18N, DEFAULT_LOADING_TEXT, where);
    }

    const selfClosing = VOID_TAGS.has(tag) || rawAttrs.trimEnd().endsWith('/');
    if (selfClosing) {
      if (attrs['data-i18n']) errors.push(`${where}: <${tag}> không có nội dung nhưng gắn data-i18n`);
      continue;
    }
    stack.push({ tag, key: attrs['data-i18n'] ?? null, text: [], where });
  }

  for (const el of stack) {
    if (el.key) errors.push(`${el.where}: <${el.tag} data-i18n="${el.key}"> không có thẻ đóng`);
  }
}

function scanJs(file) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(/text:\s*'([^']*)',\s*i18n:\s*'([^']*)'/g)) {
    record(match[2], normalize(match[1]), `${rel(file)}:${lineOf(content, match.index)}`);
  }
}

listFiles(HTML_DIR, '.html').forEach(scanHtml);
listFiles(join(HTML_DIR, 'js'), '.js').forEach(scanJs);

if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  console.error(`\n${errors.length} lỗi, sửa HTML rồi chạy lại.`);
  process.exit(1);
}

// Gộp với file cũ: giữ bản dịch `en` và mẫu có tham số, cập nhật chữ lấy từ HTML
const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : {};
const htmlText = (entry) => entry.sample ?? entry.vi;
const next = {};
for (const key of [...entries.keys()].sort()) {
  const { vi } = entries.get(key);
  const old = previous[key];
  next[key] = old?.sample !== undefined
    ? { vi: old.vi, en: old.en ?? null, sample: vi }
    : { vi, en: old?.en ?? null };
}

const added = Object.keys(next).filter((key) => !(key in previous));
const removed = Object.keys(previous).filter((key) => !(key in next));
const changed = Object.keys(next).filter((key) => key in previous && htmlText(previous[key]) !== htmlText(next[key]));
const missingEn = Object.keys(next).filter((key) => !next[key].en);
const json = `${JSON.stringify(next, null, 2)}\n`;
const upToDate = existsSync(OUTPUT) && readFileSync(OUTPUT, 'utf8') === json;

console.log(`${Object.keys(next).length} key (${added.length} mới, ${removed.length} bỏ, ${changed.length} đổi chữ vi).`);
for (const [label, keys] of [['Mới', added], ['Bỏ (không còn trong HTML)', removed], ['Đổi chữ vi', changed], ['Thiếu en', missingEn]]) {
  if (keys.length > 0) console.log(`${label}: ${keys.join(', ')}`);
}

if (checkOnly) {
  if (!upToDate || missingEn.length > 0) {
    console.error(`\n${relative(BACKEND, OUTPUT)} chưa khớp với html/. Chạy npm run i18n:extract rồi dịch các key thiếu en.`);
    process.exit(1);
  }
  console.log('File UI translation đã khớp với html/.');
} else if (!upToDate) {
  writeFileSync(OUTPUT, json);
  console.log(`Đã ghi ${relative(BACKEND, OUTPUT)}.`);
}

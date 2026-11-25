// Đồng bộ file dịch chữ tĩnh i18n/vi.json, i18n/en.json với các key data-i18n trong html/ (requirements D5).
// Phase 4 chép hai file này sang src/assets/i18n/ của Angular.
// Chạy trong html/:
//   npm run i18n:extract   cập nhật i18n/vi.json và i18n/en.json
//   npm run i18n:check     chỉ kiểm tra, file lệch với HTML hoặc còn key thiếu `en` thì exit 1
//
// Nguồn key:
// - data-i18n="key"              giá trị vi = chữ bên trong phần tử
// - data-i18n-<thuộc tính>="key"  giá trị vi = thuộc tính <thuộc tính> của cùng phần tử
// - data-loading-i18n="key"      giá trị vi = data-loading-text (mặc định lấy từ js/demo-state.js)
// - js/*.js: cặp { text: '...', i18n: '...' } mà script gán data-i18n lúc chạy
// Không quét _templates/ vì đó là khung để copy, không phải trang thật.
//
// File dịch dạng lồng nhau theo dấu chấm của key (`menu.home` → { "menu": { "home": ... } }), key sắp theo
// thứ tự chữ cái. Giá trị `vi` lấy lại từ HTML mỗi lần chạy. Giá trị `en` dịch tay trong en.json và được giữ
// nguyên; key mới chưa có trong en.json thì script báo "Thiếu en", giao diện dùng tạm giá trị vi.
//
// Chữ trong HTML có dữ liệu demo (số lượng, tên người, tên file) thì sửa tay giá trị trong vi.json và en.json
// thành mẫu có tham số `{{ten}}`, ví dụ "Trả lời {{name}}...". Giá trị vi có tham số thì script giữ nguyên,
// chỉ kiểm tra chữ trong HTML vẫn khớp mẫu (mỗi `{{ten}}` khớp một đoạn chữ bất kỳ) và báo khi lệch.
// Bản en phải có đúng các tham số như bản vi.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_DIR = join(HTML_DIR, 'i18n');
const LANGUAGES = ['vi', 'en'];
const fileOf = (code) => join(I18N_DIR, `${code}.json`);
const SKIP_DIRS = new Set(['node_modules', '_templates', 'scripts', 'i18n']);
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

// File dịch lồng nhau ↔ Map key phẳng
function flatten(node, prefix, out, file) {
  for (const [name, value] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === 'string') out.set(key, value);
    else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, key, out, file);
    else errors.push(`${file}: key "${key}" phải là chuỗi hoặc nhóm key`);
  }
  return out;
}

function nest(map) {
  const root = {};
  for (const key of [...map.keys()].sort()) {
    const parts = key.split('.');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] === 'string') errors.push(`key "${key}" trùng với key "${parts.slice(0, parts.indexOf(part) + 1).join('.')}"`);
      node = node[part] ??= {};
    }
    const last = parts.at(-1);
    if (typeof node[last] === 'object') errors.push(`key "${key}" là tiền tố của key khác`);
    node[last] = map.get(key);
  }
  return root;
}

function readTranslations(code) {
  const file = fileOf(code);
  return existsSync(file) ? flatten(JSON.parse(readFileSync(file, 'utf8')), '', new Map(), rel(file)) : new Map();
}

const PARAM = /\{\{\s*(\w+)\s*\}\}/g;
const paramsOf = (text) => [...text.matchAll(PARAM)].map((match) => match[1]).sort().join(',');
// Mẫu có tham số → regex khớp chữ trong HTML, mỗi tham số khớp một đoạn chữ bất kỳ
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function matchesTemplate(template, text) {
  // split với nhóm bắt: phần chẵn là chữ thường, phần lẻ là tên tham số
  const pattern = template.split(PARAM).map((part, i) => (i % 2 ? '.+?' : escapeRegExp(part))).join('');
  return new RegExp(`^${pattern}$`).test(text);
}

const previousVi = readTranslations('vi');
const previousEn = readTranslations('en');
const nextVi = new Map();
const nextEn = new Map();
const templateMismatch = [];
const paramMismatch = [];
for (const key of [...entries.keys()].sort()) {
  const { vi: htmlText } = entries.get(key);
  const oldVi = previousVi.get(key);
  if (oldVi !== undefined && paramsOf(oldVi)) {
    nextVi.set(key, oldVi);
    if (!matchesTemplate(oldVi, htmlText)) templateMismatch.push(`${key} (HTML: "${htmlText}", mẫu: "${oldVi}")`);
  } else {
    nextVi.set(key, htmlText);
  }
  const en = previousEn.get(key);
  if (en) {
    nextEn.set(key, en);
    if (paramsOf(en) !== paramsOf(nextVi.get(key))) paramMismatch.push(key);
  }
}

const added = [...nextVi.keys()].filter((key) => !previousVi.has(key));
const removed = [...new Set([...previousVi.keys(), ...previousEn.keys()])].filter((key) => !nextVi.has(key));
const changed = [...nextVi.keys()].filter((key) => previousVi.has(key) && previousVi.get(key) !== nextVi.get(key));
const missingEn = [...nextVi.keys()].filter((key) => !nextEn.has(key));
const output = { vi: nextVi, en: nextEn };
const json = Object.fromEntries(LANGUAGES.map((code) => [code, `${JSON.stringify(nest(output[code]), null, 2)}\n`]));
if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
const stale = LANGUAGES.filter((code) => !existsSync(fileOf(code)) || readFileSync(fileOf(code), 'utf8') !== json[code]);

console.log(`${nextVi.size} key (${added.length} mới, ${removed.length} bỏ, ${changed.length} đổi chữ vi).`);
for (const [label, keys] of [
  ['Mới', added],
  ['Bỏ (không còn trong HTML)', removed],
  ['Đổi chữ vi', changed],
  ['Thiếu en', missingEn],
  ['Chữ trong HTML không khớp mẫu có tham số, sửa tay vi.json / en.json', templateMismatch],
  ['Bản en khác tham số với bản vi', paramMismatch],
]) {
  if (keys.length > 0) console.log(`${label}: ${keys.join(', ')}`);
}

const problems = missingEn.length + templateMismatch.length + paramMismatch.length;
if (checkOnly) {
  if (stale.length > 0 || problems > 0) {
    console.error('\nFile dịch trong i18n/ chưa khớp với html/. Chạy npm run i18n:extract rồi sửa các mục ở trên.');
    process.exit(1);
  }
  console.log('File dịch trong i18n/ đã khớp với html/.');
} else {
  mkdirSync(I18N_DIR, { recursive: true });
  for (const code of stale) {
    writeFileSync(fileOf(code), json[code]);
    console.log(`Đã ghi ${rel(fileOf(code))}.`);
  }
}

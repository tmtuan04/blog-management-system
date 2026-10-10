// Kiểm tra link chết trong các trang HTML trước khi deploy lên GitHub Pages.
// Chạy: npm run check-links (trong thư mục html/)
//
// Quét mọi href="..." và src="..." trỏ tới file trong html/, báo lỗi khi:
// - file không tồn tại;
// - sai hoa/thường (Windows vẫn mở được nhưng GitHub Pages trả 404);
// - đường dẫn bắt đầu bằng "/" (site nằm dưới /blog-management-system/ nên sẽ hỏng);
// - đường dẫn đi ra ngoài thư mục html/.
// Bỏ qua link ngoài (http, https, mailto...) và link "#".
// Không quét _templates/ vì đó là khung để copy, không phải trang thật.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '_templates', 'scripts']);
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const ATTR = /\b(?:href|src)\s*=\s*"([^"]*)"/g;
const inCi = process.env.GITHUB_ACTIONS === 'true';

function listHtmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : listHtmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

// Đi từng đoạn đường dẫn từ ROOT, so tên đúng từng ký tự để bắt lỗi hoa/thường
function findExact(target) {
  let current = ROOT;
  for (const part of relative(ROOT, target).split(sep)) {
    let names;
    try {
      names = readdirSync(current);
    } catch {
      return 'không tồn tại';
    }
    if (!names.includes(part)) {
      const other = names.find((name) => name.toLowerCase() === part.toLowerCase());
      return other ? `sai hoa/thường, file thật là "${other}"` : 'không tồn tại';
    }
    current = join(current, part);
  }
  if (statSync(current).isDirectory()) {
    return readdirSync(current).includes('index.html') ? null : 'thư mục không có index.html';
  }
  return null;
}

function checkLink(file, link) {
  if (link === '' || link.startsWith('#') || EXTERNAL.test(link)) return null;
  if (link.startsWith('/')) return 'đường dẫn tuyệt đối, phải dùng đường dẫn tương đối';

  const path = decodeURI(link.split(/[?#]/)[0]);
  if (path === '') return null; // chỉ có query, ví dụ href="?status=draft"

  const target = resolve(dirname(file), path);
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return 'trỏ ra ngoài thư mục html/';
  return findExact(target);
}

const problems = [];
for (const file of listHtmlFiles(ROOT)) {
  // Xóa comment HTML nhưng giữ dấu xuống dòng để số dòng báo lỗi vẫn đúng
  const content = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  for (const match of content.matchAll(ATTR)) {
    const reason = checkLink(file, match[1]);
    if (reason) {
      const line = content.slice(0, match.index).split('\n').length;
      problems.push({ file: relative(ROOT, file).split(sep).join('/'), line, link: match[1], reason });
    }
  }
}

if (problems.length === 0) {
  console.log('Không có link chết.');
  process.exit(0);
}

for (const { file, line, link, reason } of problems) {
  console.log(`${file}:${line}  ${link}  →  ${reason}`);
  if (inCi) console.log(`::error file=html/${file},line=${line}::${link} → ${reason}`);
}
const targets = new Set(problems.map((p) => p.link.split(/[?#]/)[0]));
console.log(`\n${problems.length} link chết (${targets.size} đích khác nhau).`);
process.exit(1);

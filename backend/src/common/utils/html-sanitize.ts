import sanitizeHtml from 'sanitize-html';

/** Thẻ khớp với toolbar rich text editor (phase 3 doc mục 3.7) */
const ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'figure',
  'figcaption',
  'pre',
  'code',
  'br',
];

const HREF_PATTERN = /^(https?:|mailto:)/i;
const IMG_SRC_PATTERN = /^(\/uploads\/|https?:\/\/)/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Bỏ cả nội dung bên trong các thẻ này
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe'],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href?.trim();
      const result: Record<string, string> = { rel: 'noopener noreferrer' };
      if (href && HREF_PATTERN.test(href)) {
        result.href = href;
      }
      if (attribs.target === '_blank') {
        result.target = '_blank';
      }
      return { tagName, attribs: result };
    },
  },
  // img chỉ nhận src /uploads/... hoặc http(s), không có src hợp lệ thì bỏ thẻ
  exclusiveFilter: (frame) =>
    frame.tag === 'img' && !IMG_SRC_PATTERN.test(frame.attribs.src ?? ''),
};

/** Lọc XSS cho nội dung bài viết (UC13) và trang tĩnh (UC18) */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', OPTIONS).trim();
}

/** Sau khi lọc còn chữ hoặc ảnh. Không còn thì báo "Nội dung là bắt buộc" */
export function hasRichTextContent(html: string): boolean {
  if (/<img\s/i.test(html)) {
    return true;
  }
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    // trim() đã bỏ ký tự U+00A0, chỉ cần đổi entity &nbsp;
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length > 0;
}

/** Có thẻ HTML hay không. Bình luận (UC08) có thẻ thì báo lỗi, không lọc rồi lưu */
export function containsHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(text);
}

/** Bỏ thẻ, dùng để đếm chữ (readingMinutes) */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
}

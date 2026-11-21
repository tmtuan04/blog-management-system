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

/** Tên phần tử HTML (kể cả SVG, MathML và thẻ cũ trình duyệt vẫn chạy) */
const HTML_ELEMENTS = [
  'a',
  'abbr',
  'address',
  'applet',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'basefont',
  'bdi',
  'bdo',
  'big',
  'blink',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'font',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'image',
  'img',
  'input',
  'ins',
  'isindex',
  'kbd',
  'keygen',
  'label',
  'legend',
  'li',
  'link',
  'listing',
  'main',
  'map',
  'mark',
  'marquee',
  'math',
  'menu',
  'meta',
  'meter',
  'nav',
  'nobr',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'plaintext',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'search',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strike',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'svg',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'tt',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
  'xmp',
];

/** Thuộc tính: tên, có thể kèm =giá trị (nháy kép, nháy đơn hoặc không nháy) */
const HTML_ATTRIBUTE = String.raw`[\s/]+[a-z_:@][-\w:.@]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>=\x60]+))?`;

/**
 * Thẻ mở hoặc đóng: tên là phần tử HTML có thật (hoặc custom element có dấu `-`)
 * và thuộc tính đúng cú pháp HTML. Nhờ vậy `List<String>`, `2 < 3 và 5 > 4`,
 * `a<b thì c>d` không bị coi là HTML. Có thêm comment `<!--`.
 */
const HTML_TAG_PATTERN = new RegExp(
  String.raw`<!--|</?(?:${HTML_ELEMENTS.join('|')}|[a-z][a-z0-9]*-[a-z0-9-]*)` +
    String.raw`(?:${HTML_ATTRIBUTE})*[\s/]*>`,
  'i',
);

/** Có thẻ HTML hay không. Bình luận (UC08) có thẻ thì báo lỗi, không lọc rồi lưu */
export function containsHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text);
}

/** Bỏ thẻ, dùng để đếm chữ (readingMinutes) */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
}

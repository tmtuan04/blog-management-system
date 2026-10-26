import {
  containsHtml,
  hasRichTextContent,
  sanitizeRichText,
} from './html-sanitize';

describe('sanitizeRichText', () => {
  it('giữ các thẻ của editor', () => {
    const html =
      '<h2>Tiêu đề</h2><p><strong>Đậm</strong> <em>nghiêng</em> <u>gạch</u></p><ul><li>a</li></ul><blockquote>q</blockquote><pre><code>x</code></pre>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('bỏ script, style, iframe cùng nội dung bên trong', () => {
    const result = sanitizeRichText(
      '<p>ok</p><script>alert(1)</script><style>p{}</style><iframe src="x">y</iframe>',
    );
    expect(result).toBe('<p>ok</p>');
  });

  it('bỏ thuộc tính on* và style', () => {
    expect(sanitizeRichText('<p style="color:red" onclick="x()">a</p>')).toBe(
      '<p>a</p>',
    );
  });

  it('img chỉ nhận src /uploads/... hoặc http(s), bỏ onerror', () => {
    expect(
      sanitizeRichText(
        '<img src="/uploads/images/a.png" onerror="x()" alt="a">',
      ),
    ).toBe('<img src="/uploads/images/a.png" alt="a" />');
    expect(sanitizeRichText('<img src="javascript:alert(1)">')).toBe('');
    expect(sanitizeRichText('<img src="data:image/png;base64,AAA">')).toBe('');
  });

  it('a chỉ nhận http, https, mailto và luôn có rel="noopener noreferrer"', () => {
    expect(
      sanitizeRichText('<a href="https://x.com" target="_blank">x</a>'),
    ).toBe(
      '<a rel="noopener noreferrer" href="https://x.com" target="_blank">x</a>',
    );
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeRichText('<a href="//evil.com">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>',
    );
  });
});

describe('hasRichTextContent', () => {
  it('rỗng sau khi lọc thì false', () => {
    expect(
      hasRichTextContent(sanitizeRichText('<p>&nbsp;</p><script>x</script>')),
    ).toBe(false);
  });

  it('có chữ hoặc ảnh thì true', () => {
    expect(hasRichTextContent('<p>a</p>')).toBe(true);
    expect(hasRichTextContent('<img src="/uploads/images/a.png" />')).toBe(
      true,
    );
  });
});

describe('containsHtml', () => {
  it('phát hiện thẻ HTML trong bình luận', () => {
    expect(containsHtml('Hay quá <b>!</b>')).toBe(true);
    expect(containsHtml('2 < 3 và 5 > 4')).toBe(false);
  });
});

/**
 * Xem trước bài viết đang soạn (UC13), ở cỡ desktop hoặc mobile.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .post-preview*.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js và TRƯỚC demo-state.js:
 *   <script src="../js/post-preview.js"></script>
 *
 * Markup: chép khối <!-- component: post-preview --> trong admin/post-create.html.
 *   <div class="modal post-preview" data-preview-form="postForm">  id của form bài viết
 *     [data-preview-status]                                         Chỗ ghi trạng thái bài (Nháp, Đã đăng...)
 *     [data-preview-device="desktop|mobile"]                       Nút đổi cỡ màn hình
 *     select[data-preview-language="postEditingLanguage"]          Không bắt buộc: chọn ngôn ngữ xem trước,
 *                                                                   đồng bộ với ô "Ngôn ngữ đang soạn" có id đó
 *     .post-preview__frame > iframe.post-preview__iframe            Bản xem trước
 *
 * Mỗi lần mở modal, nội dung form (tiêu đề, tóm tắt, danh mục, thumbnail, nội dung editor) được dựng
 * thành trang chi tiết bài viết trong iframe, nạp cùng file CSS với trang. Dùng iframe thay cho <div>
 * để media query chạy theo chiều rộng khung: khung mobile rộng 390px thì chữ và khoảng cách đúng như
 * trên điện thoại thật.
 *
 * Form có tab bản dịch (post-edit): tiêu đề, tóm tắt, trạng thái, nội dung lấy trong tab đang mở (.tab-pane.active);
 * danh mục và thumbnail dùng chung nên lấy trong cả form. Ô nhập tìm theo name: "title" hoặc "translations[vi][title]".
 * Form chọn ngôn ngữ bằng ô select (post-create, js/post-language-select.js): lấy trong form [data-lang-pane] đang hiện.
 * Đổi ngôn ngữ trong modal thì ô "Ngôn ngữ đang soạn" đổi theo và bản xem trước dựng lại.
 *
 * Trang dùng demo-state.js: ô nhập có thể có nhiều bản theo trạng thái demo, chỉ lấy bản đang hiện.
 * Trạng thái demo "preview-mobile" tự chọn cỡ mobile; "preview", "preview-translation" chọn cỡ desktop.
 */
(function () {
  'use strict';

  const modal = document.querySelector('.post-preview');
  if (!modal) return;

  const form = document.getElementById(modal.dataset.previewForm);
  const iframe = modal.querySelector('.post-preview__iframe');
  const frame = modal.querySelector('.post-preview__frame');
  const statusLabel = modal.querySelector('[data-preview-status]');
  const deviceButtons = modal.querySelectorAll('[data-preview-device]');
  const languageSelect = modal.querySelector('[data-preview-language]');
  const editingSelect = languageSelect && document.getElementById(languageSelect.dataset.previewLanguage);

  // Chữ khi form còn trống. Phase 4 lấy từ UI translation.
  const EMPTY_TITLE = 'Chưa có tiêu đề';
  const EMPTY_CONTENT = 'Chưa có nội dung.';
  const WORDS_PER_MINUTE = 200; // Giống cách backend tính readingMinutes (phase-3-backend.md mục 4.2)

  // Phần tử đang hiện: không nằm trong phần tử bị demo-state.js ẩn
  function isShown(el) {
    return el.closest('[hidden]') === null;
  }

  function findShown(root, selector) {
    return Array.from(root.querySelectorAll(selector)).find(isShown) || null;
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // Ô nhập theo tên trường: name="title" (post-create) hoặc name="translations[vi][title]" (post-edit)
  function findField(root, field) {
    return findShown(root, `[name="${field}"], [name$="[${field}]"]`);
  }

  // Bản dịch đang soạn: tab đang mở (post-edit) hoặc form ngôn ngữ đang chọn (post-create); không có thì là cả form
  function translationRoot() {
    return form.querySelector('.tab-pane.active') || findShown(form, '[data-lang-pane]') || form;
  }

  function selectedText(select) {
    return select && select.value ? select.options[select.selectedIndex].text : '';
  }

  // Nội dung editor, bỏ phần chỉ có lúc soạn (khối "Đang tải ảnh lên")
  function readContent() {
    const editor = findShown(translationRoot(), '.editor__content');
    if (!editor) return null;
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('.editor__upload').forEach((el) => el.remove());
    return clone;
  }

  // Tác giả là người đang đăng nhập: lấy tên và avatar trong menu tài khoản ở thanh trên
  function readAuthor() {
    const name = findShown(document, '.editor-topbar .dropdown-menu .fw-semibold');
    const avatar = findShown(document, '.editor-topbar .avatar');
    let avatarHtml = '';
    if (avatar) {
      const clone = avatar.cloneNode(true);
      clone.classList.add('avatar--lg');
      clone.removeAttribute('data-demo-auth');
      avatarHtml = clone.outerHTML;
    }
    return { name: name ? name.textContent.trim() : '', avatarHtml };
  }

  function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return {
      iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      text: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    };
  }

  // Markup giống public/post-detail.html (phần đầu bài, ảnh bìa, nội dung)
  function buildArticle() {
    const translation = translationRoot();
    const title = (findField(translation, 'title') || {}).value || '';
    const excerpt = (findField(translation, 'excerpt') || {}).value || '';
    const category = selectedText(findField(form, 'category_id'));
    const thumb = findShown(form, '.thumb-upload__preview img');
    const content = readContent();
    const author = readAuthor();

    const hasContent = content && (content.textContent.trim() !== '' || content.querySelector('img'));
    const words = hasContent ? content.textContent.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
    const date = formatDate(new Date());

    return `
      <article class="post-detail">
        <header>
          ${title.trim()
            ? `<h1 class="post-detail__title text-post-title">${escapeHtml(title.trim())}</h1>`
            : `<h1 class="post-detail__title text-post-title text-body-tertiary">${EMPTY_TITLE}</h1>`}
          ${excerpt.trim() ? `<p class="post-detail__subtitle">${escapeHtml(excerpt.trim())}</p>` : ''}
          <div class="post-detail__author">
            ${author.avatarHtml}
            <div class="post-detail__author-info">
              <div class="post-detail__author-line">
                <span class="post-detail__author-name">${escapeHtml(author.name)}</span>
                ${category ? `<span class="post-detail__sep" aria-hidden="true">·</span>
                <a class="post-detail__category" href="#">${escapeHtml(category)}</a>` : ''}
              </div>
              <div class="text-meta">
                <span>${minutes} phút đọc</span>
                <span aria-hidden="true">·</span>
                <time datetime="${date.iso}">${date.text}</time>
              </div>
            </div>
          </div>
          <div class="post-detail__actions">
            <span><i class="bi bi-eye" aria-hidden="true"></i>0</span>
            <span><i class="bi bi-chat" aria-hidden="true"></i>0</span>
          </div>
        </header>
        ${thumb ? `<figure class="post-detail__cover"><img src="${escapeHtml(thumb.getAttribute('src'))}" alt=""></figure>` : ''}
        <div class="post-detail__content prose">
          ${hasContent ? content.innerHTML : `<p class="text-body-tertiary">${EMPTY_CONTENT}</p>`}
        </div>
      </article>`;
  }

  // Trang trong iframe: cùng CSS, font, theme với trang soạn bài và cùng khung .site-body của trang public.
  // <base> để đường dẫn ảnh tương đối (../assets/...) chạy như ở trang soạn bài; link mở tab mới.
  function buildDocument() {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${escapeHtml(link.href)}">`)
      .join('\n');
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const lang = translationRoot().dataset.langPane || document.documentElement.lang;

    return `<!doctype html>
<html lang="${lang}" data-bs-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeHtml(document.baseURI)}" target="_blank">
${styles}
</head>
<body>
<div class="site-body"><main class="site-body__main">${buildArticle()}</main></div>
</body>
</html>`;
  }

  function setDevice(device) {
    frame.dataset.device = device;
    deviceButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.previewDevice === device));
    });
  }

  deviceButtons.forEach((button) => {
    button.addEventListener('click', () => setDevice(button.dataset.previewDevice));
  });

  // Ô chọn ngôn ngữ trong modal: chép chữ option (đổi theo ngôn ngữ gốc) và giá trị từ ô "Ngôn ngữ đang soạn"
  function syncLanguage() {
    if (!editingSelect) return;
    Array.from(languageSelect.options).forEach((option) => {
      const source = editingSelect.querySelector(`option[value="${option.value}"]`);
      if (source) option.text = source.text;
    });
    languageSelect.value = editingSelect.value;
  }

  function render() {
    syncLanguage();
    const status = selectedText(findField(translationRoot(), 'status'));
    statusLabel.textContent = status ? `· ${status}` : '';
    iframe.srcdoc = buildDocument();
  }

  modal.addEventListener('show.bs.modal', render);

  if (editingSelect) {
    // Đổi ngôn ngữ trong modal = đổi ngôn ngữ đang soạn; post-language-select.js hiện form tương ứng
    languageSelect.addEventListener('change', () => {
      editingSelect.value = languageSelect.value;
      editingSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Ngôn ngữ đổi khi modal đang mở (đổi trong modal, hoặc chuyển trạng thái demo preview <-> preview-translation)
    editingSelect.addEventListener('change', () => {
      if (modal.classList.contains('show')) render();
    });
  }

  // Trạng thái demo preview / preview-mobile / preview-translation: chọn sẵn cỡ màn hình. Theo dõi data-demo-state
  // trên <body> vì khi chuyển giữa các trạng thái này modal đã mở sẵn, Bootstrap không phát lại sự kiện show.
  new MutationObserver(() => {
    const state = document.body.dataset.demoState;
    if (state === 'preview' || state === 'preview-translation') setDevice('desktop');
    if (state === 'preview-mobile') setDevice('mobile');
  }).observe(document.body, { attributes: true, attributeFilter: ['data-demo-state'] });
})();

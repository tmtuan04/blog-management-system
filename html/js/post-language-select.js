/**
 * Chọn ngôn ngữ đang soạn ở trang viết bài mới (UC13): soạn bản gốc và các bản dịch ngay khi tạo bài.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .post-form__*.
 *
 * Nhúng cuối <body>, TRƯỚC post-preview.js và demo-state.js:
 *   <script src="../js/post-language-select.js"></script>
 *
 * Markup: chép khối <!-- component: post-language-select --> trong admin/post-create.html.
 *   <select id="postLanguage">                     Ô "Ngôn ngữ gốc", mỗi option có data-lang="vi|en"
 *   <select data-editing-language                  Ô "Ngôn ngữ đang soạn", value là mã ngôn ngữ
 *           data-original-select="postLanguage">   id của ô "Ngôn ngữ gốc"
 *   <section data-lang-pane="vi">                  Form bản dịch của từng ngôn ngữ, chỉ hiện form đang chọn
 *     [data-pane-role]                             Chữ "Bản gốc" / "Bản dịch" ở đầu form
 *     [data-translation-hint]                      Ghi chú chỉ hiện ở form bản dịch
 *
 * Đổi ngôn ngữ gốc thì chữ "Bản gốc" / "Bản dịch" trong ô chọn và ở đầu mỗi form đổi theo.
 * Form bị ẩn bằng thuộc tính hidden nên post-preview.js chỉ đọc form đang hiện.
 */
(function () {
  'use strict';

  const editing = document.querySelector('[data-editing-language]');
  if (!editing) return;

  const original = document.getElementById(editing.dataset.originalSelect);
  const panes = document.querySelectorAll('[data-lang-pane]');

  // Chữ theo vai trò của bản dịch. Phase 4 lấy từ UI translation.
  const ROLES = {
    original: { text: 'Bản gốc', i18n: 'admin.post_form.original' },
    translation: { text: 'Bản dịch', i18n: 'admin.post_form.translation' },
  };

  function originalLang() {
    return original.options[original.selectedIndex].dataset.lang;
  }

  // Tên ngôn ngữ lấy từ ô "Ngôn ngữ gốc" để hai ô không bị lệch nhau
  function languageName(lang) {
    const option = original.querySelector(`option[data-lang="${lang}"]`);
    return option ? option.text : lang;
  }

  function updateRoles() {
    const lang = originalLang();
    Array.from(editing.options).forEach((option) => {
      option.text = `${languageName(option.value)} · ${ROLES[option.value === lang ? 'original' : 'translation'].text}`;
    });
    panes.forEach((pane) => {
      const isOriginal = pane.dataset.langPane === lang;
      const role = ROLES[isOriginal ? 'original' : 'translation'];
      pane.querySelectorAll('[data-pane-role]').forEach((el) => {
        el.textContent = role.text;
        el.dataset.i18n = role.i18n;
      });
      pane.querySelectorAll('[data-translation-hint]').forEach((el) => {
        el.hidden = isOriginal;
      });
    });
  }

  function showPane() {
    panes.forEach((pane) => {
      pane.hidden = pane.dataset.langPane !== editing.value;
    });
  }

  original.addEventListener('change', updateRoles);
  editing.addEventListener('change', showPane);
  updateRoles();
  showPane();
})();

/**
 * Chọn ngôn ngữ bản dịch ở trang viết bài mới (UC13): soạn bản gốc và các bản dịch ngay khi tạo bài.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .post-form__*, .translation-tabs*.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js, TRƯỚC post-preview.js và demo-state.js:
 *   <script src="../js/post-language-select.js"></script>
 *
 * Markup: chép khối <!-- component: post-translation-languages --> và <!-- component: translation-tabs -->
 * trong admin/post-create.html.
 *   <select id="postLanguage">                       Ô "Ngôn ngữ gốc", mỗi option có data-lang="vi|en"
 *   <div data-translation-languages                  Ô "Bản dịch": mỗi ngôn ngữ một checkbox
 *        data-original-select="postLanguage"         id của ô "Ngôn ngữ gốc"
 *        data-tabs="postLanguageTabs">               id của thanh tab ngôn ngữ
 *     [data-lang-option="vi"] > input[type=checkbox] Ô của ngôn ngữ gốc bị ẩn
 *   <ul id="postLanguageTabs">                       Thanh tab (.nav-tabs của Bootstrap)
 *     li[data-lang-tab="vi"] > button[data-lang]     Tab ngôn ngữ gốc luôn hiện, tab khác hiện khi được tick
 *       [data-tab-origin]                            Nhãn "Gốc", chỉ hiện ở tab ngôn ngữ gốc
 *   <section class="tab-pane" data-lang-pane="vi">   Form bản dịch của từng ngôn ngữ
 *     [data-pane-role]                               Chữ "Bản gốc" / "Bản dịch" ở đầu form
 *     [data-translation-hint]                        Ghi chú chỉ hiện ở form bản dịch
 *
 * Tick một ngôn ngữ thì hiện và mở tab của nó. Bỏ tick thì ẩn tab, khóa các ô nhập (disabled) để không gửi lên khi lưu; đang mở tab đó
 * thì chuyển về tab ngôn ngữ gốc. Mỗi tab có data-tab-label ("Tiếng Việt · Bản gốc") để post-preview.js
 * dựng ô chọn ngôn ngữ xem trước.
 */
(function () {
  'use strict';

  const picker = document.querySelector('[data-translation-languages]');
  if (!picker || !window.bootstrap) return;

  const original = document.getElementById(picker.dataset.originalSelect);
  const tabList = document.getElementById(picker.dataset.tabs);
  const checkboxes = picker.querySelectorAll('input[type="checkbox"]');
  const panes = document.querySelectorAll('[data-lang-pane]');

  // Chữ theo vai trò của bản dịch. Phase 4 lấy từ UI translation.
  const ROLES = {
    original: { text: 'Bản gốc', i18n: 'admin.post_form.original' },
    translation: { text: 'Bản dịch', i18n: 'admin.post_form.translation' },
  };

  function originalLang() {
    return original.options[original.selectedIndex].dataset.lang;
  }

  // Tên ngôn ngữ lấy từ ô "Ngôn ngữ gốc" để các ô không bị lệch nhau
  function languageName(lang) {
    const option = original.querySelector(`option[data-lang="${lang}"]`);
    return option ? option.text : lang;
  }

  function tabButton(lang) {
    return tabList.querySelector(`button[data-lang="${lang}"]`);
  }

  function isEnabled(lang) {
    if (lang === originalLang()) return true;
    const checkbox = picker.querySelector(`input[value="${lang}"]`);
    return Boolean(checkbox && checkbox.checked);
  }

  function update() {
    const lang = originalLang();

    picker.querySelectorAll('[data-lang-option]').forEach((option) => {
      option.hidden = option.dataset.langOption === lang;
    });

    panes.forEach((pane) => {
      const paneLang = pane.dataset.langPane;
      const isOriginal = paneLang === lang;
      const enabled = isEnabled(paneLang);
      const role = ROLES[isOriginal ? 'original' : 'translation'];
      const button = tabButton(paneLang);

      pane.querySelectorAll('[data-pane-role]').forEach((el) => {
        el.textContent = role.text;
        el.dataset.i18n = role.i18n;
      });
      pane.querySelectorAll('[data-translation-hint]').forEach((el) => {
        el.hidden = isOriginal;
      });
      pane.querySelectorAll('[name]').forEach((field) => {
        field.disabled = !enabled;
      });

      if (button) {
        button.closest('[data-lang-tab]').hidden = !enabled;
        button.dataset.tabLabel = `${languageName(paneLang)} · ${role.text}`;
        button.querySelectorAll('[data-tab-origin]').forEach((el) => {
          el.hidden = !isOriginal;
        });
      }
    });

    // Tab đang mở bị ẩn (vừa bỏ tick) thì về tab ngôn ngữ gốc
    const active = tabList.querySelector('button.active');
    if (active && active.closest('[data-lang-tab]').hidden) {
      window.bootstrap.Tab.getOrCreateInstance(tabButton(lang)).show();
    }
  }

  original.addEventListener('change', update);
  // Vừa tick thì mở luôn tab của ngôn ngữ đó để soạn
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', () => {
    update();
    if (checkbox.checked) window.bootstrap.Tab.getOrCreateInstance(tabButton(checkbox.value)).show();
  }));
  update();
})();

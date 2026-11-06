/**
 * Chọn ngôn ngữ bản dịch ở trang viết bài mới (UC13): soạn bản gốc và các bản dịch ngay khi tạo bài.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .post-form__*, .translation-tabs*.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js và multi-select.js, TRƯỚC post-preview.js và demo-state.js:
 *   <script src="../js/post-language-select.js"></script>
 *
 * Markup: chép khối <!-- component: multi-select --> (ô "Bản dịch") và <!-- component: translation-tabs -->
 * trong admin/post-create.html.
 *   <select id="postLanguage">                       Ô "Ngôn ngữ gốc", mỗi option có data-lang="vi|en|..."
 *   <div data-multi-select data-translation-languages  Ô "Bản dịch" (js/multi-select.js), mỗi ngôn ngữ một checkbox value="vi|en|..."
 *        data-original-select="postLanguage"         id của ô "Ngôn ngữ gốc"
 *        data-tabs="postLanguageTabs"                id của thanh tab ngôn ngữ
 *        data-pane-template="postTranslationTemplate">  id của <template> dựng tab + form cho ngôn ngữ chưa có sẵn markup
 *   <ul id="postLanguageTabs">                       Thanh tab (.nav-tabs của Bootstrap)
 *     li[data-lang-tab="vi"] > button[data-lang]     Tab ngôn ngữ gốc luôn hiện, tab khác hiện khi được chọn
 *       [data-tab-origin]                            Nhãn "Gốc", chỉ hiện ở tab ngôn ngữ gốc
 *   <section class="tab-pane" data-lang-pane="vi">   Form bản dịch của từng ngôn ngữ
 *     [data-pane-role]                               Chữ "Bản gốc" / "Bản dịch" ở đầu form
 *     [data-translation-hint]                        Ghi chú chỉ hiện ở form bản dịch
 *
 * Option nào của ô "Ngôn ngữ gốc" chưa có form thì dựng tab + form từ <template>: {lang} thay bằng mã ngôn ngữ,
 * {Lang} bằng mã viết hoa chữ đầu (dùng trong id), {name} bằng tên ngôn ngữ.
 *
 * Checkbox của ngôn ngữ gốc bị disabled (ô chọn ẩn nó đi) và bỏ chọn. Chọn một ngôn ngữ thì hiện và mở tab của nó.
 * Bỏ chọn thì ẩn tab, khóa các ô nhập (disabled) để không gửi lên khi lưu; đang mở tab đó thì chuyển về tab ngôn ngữ
 * gốc. Mỗi tab có data-tab-label ("Tiếng Việt · Bản gốc") để post-preview.js dựng ô chọn ngôn ngữ xem trước.
 */
(function () {
  'use strict';

  const picker = document.querySelector('[data-translation-languages]');
  if (!picker || !window.bootstrap) return;

  const original = document.getElementById(picker.dataset.originalSelect);
  const tabList = document.getElementById(picker.dataset.tabs);
  const template = document.getElementById(picker.dataset.paneTemplate);
  const checkboxes = Array.from(picker.querySelectorAll('[data-multi-select-option] input[type="checkbox"]'));

  // Chữ theo vai trò của bản dịch. Phase 4 lấy từ UI translation.
  const ROLES = {
    original: { text: 'Bản gốc', i18n: 'admin.post_form.original' },
    translation: { text: 'Bản dịch', i18n: 'admin.post_form.translation' },
  };

  function buildMissingPanes() {
    if (!template) return;
    const paneParent = document.querySelector('[data-lang-pane]').parentElement;
    Array.from(original.options).forEach((option) => {
      const lang = option.dataset.lang;
      if (document.querySelector(`[data-lang-pane="${lang}"]`)) return;
      const html = template.innerHTML
        .replaceAll('{lang}', lang)
        .replaceAll('{Lang}', lang.charAt(0).toUpperCase() + lang.slice(1))
        .replaceAll('{name}', option.text);
      const fragment = document.createRange().createContextualFragment(html);
      tabList.append(fragment.querySelector('[data-lang-tab]'));
      paneParent.append(fragment.querySelector('[data-lang-pane]'));
    });
  }

  buildMissingPanes();
  const panes = document.querySelectorAll('[data-lang-pane]');

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
    const checkbox = checkboxes.find((input) => input.value === lang);
    return Boolean(checkbox && checkbox.checked);
  }

  function update() {
    const lang = originalLang();

    checkboxes.forEach((checkbox) => {
      checkbox.disabled = checkbox.value === lang;
      if (checkbox.disabled) checkbox.checked = false;
    });
    picker.dispatchEvent(new Event('multi-select:update'));

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

    // Tab đang mở bị ẩn (vừa bỏ chọn) thì về tab ngôn ngữ gốc
    const active = tabList.querySelector('button.active');
    if (active && active.closest('[data-lang-tab]').hidden) {
      window.bootstrap.Tab.getOrCreateInstance(tabButton(lang)).show();
    }
  }

  original.addEventListener('change', update);
  // Vừa chọn một ngôn ngữ thì mở luôn tab của nó để soạn. "Chọn tất cả" giữ tab đang mở.
  picker.addEventListener('change', (event) => {
    update();
    const checkbox = event.target;
    if (checkboxes.includes(checkbox) && checkbox.checked) {
      window.bootstrap.Tab.getOrCreateInstance(tabButton(checkbox.value)).show();
    }
  });
  update();
})();

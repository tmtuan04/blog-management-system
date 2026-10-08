/**
 * Thanh chuyển trạng thái demo cho giao diện HTML tĩnh (docs/phase-2-html.md mục 7.2).
 * Chỉ dùng ở phase 2: bỏ file này khi chuyển sang Angular.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js:  <script src="../js/demo-state.js"></script>
 *
 * 1. Trạng thái trang
 *   <body data-demo-states="normal loading empty">   Trạng thái trang có, theo thứ tự nút trên thanh.
 *                                                    Bỏ trống = normal error loading empty.
 *                                                    Trạng thái đầu tiên là mặc định.
 *   <body data-demo-states="normal deleting" data-demo-label-deleting="Đang xóa">
 *                                                    Trạng thái tự đặt tên thì khai báo nhãn hiện trên thanh.
 *   <div data-demo="empty">                         Chỉ hiện ở trạng thái "empty"
 *   <div data-demo="normal error">                  Hiện ở nhiều trạng thái (cách nhau bằng dấu cách)
 *   <input class="form-control" data-demo-invalid>  Thêm .is-invalid ở trạng thái "error"; đặt
 *                                                    <div class="invalid-feedback"> ngay sau ô nhập.
 *                                                    Ghi giá trị để đổi trạng thái: data-demo-invalid="error-email"
 *   <button data-demo-loading>                      Ở trạng thái "loading": disabled + spinner + "Đang lưu...".
 *                                                    Ghi giá trị để đổi trạng thái: data-demo-loading="deleting"
 *     data-loading-text="Đang xóa..."               Đổi chữ khi loading (mặc định "Đang lưu...")
 *     data-loading-i18n="common.deleting"           Key UI translation của chữ đó (mặc định common.saving)
 *   <div class="modal" data-demo-modal="deleting">  Tự mở modal ở trạng thái đó (để chụp màn hình)
 *
 * 2. Vai trò người xem
 *   <body data-demo-auths="blog_owner super_admin"> Các vai trò trang có. Mặc định "guest user" nếu trang
 *                                                    có phần tử data-demo-auth. Vai trò đầu tiên là mặc định.
 *                                                    Giá trị: guest, user, blog_owner, super_admin
 *   <div data-demo-auth="guest">                    Chỉ hiện khi xem với vai trò khách
 *   <div data-demo-auth="user blog_owner super_admin">  Hiện với mọi tài khoản đã đăng nhập
 *
 * Phần tử không có data-demo / data-demo-auth thì luôn hiện.
 * Trạng thái được ghi lên URL (?demo=error&auth=user) để gửi link hoặc chụp màn hình đúng trạng thái.
 *
 * Chữ trên thanh demo không cần data-i18n vì thanh này không có ở sản phẩm thật.
 */
(function () {
  'use strict';

  const STATE_LABELS = { normal: 'Bình thường', error: 'Lỗi validate', loading: 'Loading', empty: 'Rỗng' };
  const AUTH_LABELS = { guest: 'Khách', user: 'Người dùng', blog_owner: 'Blog Owner', super_admin: 'Super Admin' };
  const DEFAULT_LOADING_TEXT = 'Đang lưu...';
  const DEFAULT_LOADING_I18N = 'common.saving';

  const body = document.body;

  function splitList(value) {
    return (value || '').split(/\s+/).filter(Boolean);
  }

  function stateLabel(state) {
    const key = 'demoLabel' + state.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
    return body.dataset[key] || STATE_LABELS[state] || state;
  }

  const states = splitList(body.dataset.demoStates || Object.keys(STATE_LABELS).join(' '));
  if (states.length === 0) states.push('normal');

  const hasAuth = body.dataset.demoAuths !== undefined || document.querySelector('[data-demo-auth]') !== null;
  const auths = splitList(body.dataset.demoAuths || 'guest user').filter((auth) => auth in AUTH_LABELS);

  // Nội dung gốc của các nút đang ở trạng thái loading, để trả lại khi rời trạng thái đó
  const loadingButtons = new Map();

  const params = new URLSearchParams(window.location.search);
  let currentState = states.includes(params.get('demo')) ? params.get('demo') : states[0];
  let currentAuth = auths.includes(params.get('auth')) ? params.get('auth') : auths[0];

  // Thuộc tính rỗng (data-demo-loading) nghĩa là dùng trạng thái mặc định
  function activeIn(value, fallback) {
    return splitList(value || fallback).includes(currentState);
  }

  function isVisible(el) {
    const demo = el.dataset.demo;
    const auth = el.dataset.demoAuth;
    return (demo === undefined || splitList(demo).includes(currentState))
      && (auth === undefined || splitList(auth).includes(currentAuth));
  }

  function setLoading(button, loading) {
    if (loading && !loadingButtons.has(button)) {
      loadingButtons.set(button, { html: button.innerHTML, disabled: button.disabled });

      const spinner = document.createElement('span');
      spinner.className = 'spinner-border spinner-border-sm me-2';
      spinner.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.setAttribute('role', 'status');
      text.dataset.i18n = button.dataset.loadingI18n || DEFAULT_LOADING_I18N;
      text.textContent = button.dataset.loadingText || DEFAULT_LOADING_TEXT;

      button.replaceChildren(spinner, text);
      button.disabled = true;
    } else if (!loading && loadingButtons.has(button)) {
      const original = loadingButtons.get(button);
      button.innerHTML = original.html;
      button.disabled = original.disabled;
      loadingButtons.delete(button);
    }
  }

  function render() {
    body.dataset.demoState = currentState;
    if (hasAuth) body.dataset.demoAuthState = currentAuth;

    document.querySelectorAll('[data-demo], [data-demo-auth]').forEach((el) => {
      el.hidden = !isVisible(el);
    });
    document.querySelectorAll('[data-demo-invalid]').forEach((el) => {
      el.classList.toggle('is-invalid', activeIn(el.dataset.demoInvalid, 'error'));
    });
    document.querySelectorAll('[data-demo-loading]').forEach((button) => {
      setLoading(button, activeIn(button.dataset.demoLoading, 'loading'));
    });
    if (window.bootstrap) {
      document.querySelectorAll('[data-demo-modal]').forEach((el) => {
        const modal = window.bootstrap.Modal.getOrCreateInstance(el);
        if (activeIn(el.dataset.demoModal)) modal.show();
        else if (el.classList.contains('show')) modal.hide();
      });
    }
    document.querySelectorAll('.demo-bar__btn').forEach((button) => {
      const active = button.dataset.state === currentState || button.dataset.auth === currentAuth;
      button.setAttribute('aria-pressed', String(active));
    });

    const url = new URL(window.location.href);
    url.searchParams.set('demo', currentState);
    if (hasAuth) url.searchParams.set('auth', currentAuth);
    window.history.replaceState(null, '', url);
  }

  function createGroup(keys, getLabel, dataKey) {
    const group = document.createElement('div');
    group.className = 'demo-bar__group';
    keys.forEach((key) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'demo-bar__btn';
      button.dataset[dataKey] = key;
      button.textContent = getLabel(key);
      group.append(button);
    });
    return group;
  }

  function createBar() {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Trạng thái demo');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'demo-bar__toggle';
    toggle.textContent = 'Demo';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.title = 'Thu gọn / mở rộng thanh demo';
    toggle.addEventListener('click', () => {
      const collapsed = bar.classList.toggle('demo-bar--collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
    bar.append(toggle);

    if (states.length > 1) bar.append(createGroup(states, stateLabel, 'state'));
    if (hasAuth && auths.length > 1) bar.append(createGroup(auths, (auth) => AUTH_LABELS[auth], 'auth'));

    bar.addEventListener('click', (event) => {
      const button = event.target.closest('.demo-bar__btn');
      if (!button) return;
      if (button.dataset.state) currentState = button.dataset.state;
      if (button.dataset.auth) currentAuth = button.dataset.auth;
      render();
    });

    body.append(bar);
  }

  if (states.length > 1 || (hasAuth && auths.length > 1)) createBar();
  render();
})();

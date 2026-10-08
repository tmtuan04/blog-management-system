/**
 * Đổi giao diện sáng/tối (UC10).
 *
 * Nhúng trong <head>, trước thẻ <link> CSS, KHÔNG dùng defer/async, để theme được gán
 * trước khi trang hiện ra (không bị nháy màu):
 *
 *   <script src="../js/theme.js"></script>
 *
 * Nút đổi theme (bao nhiêu nút cũng được, ví dụ một ở header, một trong offcanvas mobile):
 *
 *   <button type="button" class="btn btn-link theme-toggle" data-theme-toggle
 *           aria-label="Giao diện tối" aria-pressed="false">
 *     <i class="bi bi-moon theme-toggle__icon--moon" aria-hidden="true"></i>
 *     <i class="bi bi-sun theme-toggle__icon--sun" aria-hidden="true"></i>
 *   </button>
 *
 * Lựa chọn lưu ở localStorage key "theme". Chưa chọn lần nào thì theo hệ điều hành (prefers-color-scheme).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function getStoredTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Trình duyệt chặn localStorage (ẩn danh, tắt cookie): vẫn đổi được theme, chỉ không nhớ khi tải lại
    }
  }

  function preferredTheme() {
    return getStoredTheme() || (media.matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  }

  applyTheme(preferredTheme());

  // Script chạy trong <head>, lúc này nút chưa có trong DOM: dùng event delegation
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    storeTheme(next);
    applyTheme(next);
  });

  // Cập nhật aria-pressed cho các nút khi DOM đã có
  document.addEventListener('DOMContentLoaded', () => applyTheme(preferredTheme()));

  // Người dùng chưa tự chọn thì đổi theo khi hệ điều hành đổi sáng/tối
  media.addEventListener('change', () => {
    if (!getStoredTheme()) applyTheme(preferredTheme());
  });

  // Đổi theme ở tab khác thì tab này đổi theo
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyTheme(preferredTheme());
  });
})();

/**
 * Thanh tab ngôn ngữ .translation-tabs (viết bài, sửa bài, sửa trang tĩnh) cuộn ngang khi không đủ chỗ.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .translation-tabs*.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js:
 *   <script src="../js/translation-tabs.js"></script>
 *
 * Tab vừa mở được cuộn vào giữa thanh. Tab đầu/cuối thì thanh cuộn hẳn về mép đó, người viết thấy rõ đã hết tab
 * ở phía ấy. Bắt sự kiện ở document nên tab dựng sau khi tải trang (post-language-select.js) cũng được.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('shown.bs.tab', (event) => {
    const tabList = event.target.closest('.translation-tabs');
    if (!tabList) return;
    const listRect = tabList.getBoundingClientRect();
    const tabRect = event.target.getBoundingClientRect();
    const offset = (tabRect.left + tabRect.width / 2) - (listRect.left + listRect.width / 2);
    tabList.scrollBy({ left: offset, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
})();

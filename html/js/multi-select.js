/**
 * Ô chọn nhiều dạng dropdown có tìm kiếm, ví dụ ô "Bản dịch" ở admin/post-create.html.
 * Chỉ dùng ở phase 2: phase 4 làm lại bằng component Angular, giữ các class .multi-select*.
 *
 * Nhúng cuối <body>, SAU bootstrap.bundle.min.js và TRƯỚC script của trang dùng ô này:
 *   <script src="../js/multi-select.js"></script>
 *
 * Markup: chép khối <!-- component: multi-select --> trong admin/post-create.html.
 *   <div class="multi-select dropdown" data-multi-select data-max-chips="3">
 *     [data-multi-select-placeholder]                  Chữ gợi ý khi chưa chọn gì
 *     [data-multi-select-chips]                        Chỗ đặt chip, mỗi chip dựng từ <template data-multi-select-chip>
 *                                                      (tên lựa chọn ghi vào mọi [data-chip-label] của mẫu)
 *       [data-multi-select-more] > [data-multi-select-rest]
 *                                                      Chip "+N" cho các lựa chọn không hiện thành chip: hiện tối đa
 *                                                      data-max-chips chip (mặc định 3), ít hơn nếu khung không đủ một dòng
 *     [data-multi-select-summary] > [data-multi-select-total]
 *                                                      "Tất cả (N ...)" thay cho chip khi chọn hết và nhiều hơn data-max-chips
 *     button[data-bs-toggle="dropdown"]                Nút mở menu
 *     input[data-multi-select-search]                  Lọc theo tên, không phân biệt hoa/thường và dấu
 *     input[type=checkbox][data-multi-select-all]      Chọn / bỏ chọn mọi lựa chọn đang hiện (sau khi lọc)
 *     [data-multi-select-option] > input[type=checkbox] + label   Mỗi lựa chọn một ô
 *     [data-multi-select-empty]                        Hiện khi không lựa chọn nào khớp ô tìm
 *
 * Checkbox bị disabled coi như không có: ẩn khỏi danh sách, không thành chip. Script khác đổi checked / disabled bằng
 * code thì phát sự kiện "multi-select:update" trên khung ngoài để vẽ lại.
 * Mỗi lần người dùng đổi lựa chọn đều có sự kiện change nổi lên khung ngoài: bấm "Chọn tất cả" chỉ có một change
 * (event.target là ô chọn tất cả), bỏ chọn bằng nút trên chip thì change phát từ checkbox của lựa chọn đó.
 */
(function () {
  'use strict';

  // Bỏ dấu để gõ "tieng" vẫn tìm được "Tiếng Việt"
  function normalize(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  }

  function setup(root) {
    const maxChips = Number(root.dataset.maxChips) || 3;
    const placeholder = root.querySelector('[data-multi-select-placeholder]');
    const chips = root.querySelector('[data-multi-select-chips]');
    const chipTemplate = root.querySelector('template[data-multi-select-chip]');
    const more = root.querySelector('[data-multi-select-more]');
    const rest = root.querySelector('[data-multi-select-rest]');
    const summary = root.querySelector('[data-multi-select-summary]');
    const total = root.querySelector('[data-multi-select-total]');
    const toggle = root.querySelector('[data-bs-toggle="dropdown"]');
    const search = root.querySelector('[data-multi-select-search]');
    const all = root.querySelector('[data-multi-select-all]');
    const empty = root.querySelector('[data-multi-select-empty]');
    const options = Array.from(root.querySelectorAll('[data-multi-select-option]'));

    const inputOf = (option) => option.querySelector('input[type="checkbox"]');
    const labelOf = (option) => option.querySelector('label').textContent.trim();
    const available = () => options.filter((option) => !inputOf(option).disabled);

    function matches(option) {
      const query = search ? normalize(search.value) : '';
      return query === '' || normalize(labelOf(option)).includes(query);
    }

    function createChip(option) {
      const chip = chipTemplate.content.firstElementChild.cloneNode(true);
      chip.querySelectorAll('[data-chip-label]').forEach((el) => {
        el.textContent = labelOf(option);
      });
      chip.querySelector('button').addEventListener('click', () => {
        const input = inputOf(option);
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // Chip vừa bấm đã bị xóa khỏi trang, đưa focus về nút mở menu để không bị mất
        toggle.focus();
      });
      return chip;
    }

    function render() {
      const usable = available();
      const shown = usable.filter(matches);
      const selected = usable.filter((option) => inputOf(option).checked);
      const shownSelected = shown.filter((option) => inputOf(option).checked);

      options.forEach((option) => {
        option.hidden = !shown.includes(option);
      });
      if (empty) empty.hidden = shown.length > 0;
      if (all) {
        all.closest('.form-check').hidden = shown.length === 0;
        all.checked = shown.length > 0 && shownSelected.length === shown.length;
        all.indeterminate = shownSelected.length > 0 && shownSelected.length < shown.length;
      }

      const isAll = selected.length > maxChips && selected.length === usable.length;
      placeholder.hidden = selected.length > 0;
      summary.hidden = !isAll;
      total.textContent = String(selected.length);
      chips.hidden = isAll || selected.length === 0;

      const chipOptions = chips.hidden ? [] : selected.slice(0, maxChips);
      const restNames = selected.slice(chipOptions.length).map(labelOf);
      chips.replaceChildren(...chipOptions.map(createChip), more);
      setRest(restNames);
      // Khung chỉ cao một dòng: chip cuối không vừa thì gộp vào "+N", giữ lại ít nhất một chip
      if (chips.clientWidth === 0) return;
      while (chips.scrollWidth > chips.clientWidth && chipOptions.length > 1) {
        restNames.unshift(labelOf(chipOptions.pop()));
        more.previousElementSibling.remove();
        setRest(restNames);
      }
    }

    function setRest(names) {
      more.hidden = names.length === 0;
      rest.textContent = String(names.length);
      more.title = names.join(', ');
    }

    if (all) {
      // Chạy trước listener change trên khung ngoài (sự kiện nổi từ ô này lên) nên lúc vẽ lại đã đổi xong
      all.addEventListener('change', () => {
        available().filter(matches).forEach((option) => {
          inputOf(option).checked = all.checked;
        });
      });
    }

    if (search) {
      search.addEventListener('input', render);
      // Enter trong ô tìm không gửi form chứa ô chọn
      search.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') event.preventDefault();
      });
      root.addEventListener('shown.bs.dropdown', () => search.focus());
      root.addEventListener('hidden.bs.dropdown', () => {
        search.value = '';
        render();
      });
    }

    root.addEventListener('change', (event) => {
      if (event.target !== search) render();
    });
    root.addEventListener('multi-select:update', render);
    // Khung đổi chiều rộng (đổi cỡ màn hình) thì tính lại số chip vừa một dòng
    new ResizeObserver(render).observe(chips.parentElement);
    render();
  }

  document.querySelectorAll('[data-multi-select]').forEach(setup);
})();

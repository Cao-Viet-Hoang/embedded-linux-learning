/* ============================================================
   ICONS — bộ SVG dùng chung.
   Tất cả vẽ trên khung 24x24, nét currentColor, stroke-width 2.
   Dùng: ICON('name')  →  chuỗi HTML <svg>…</svg>
   Hoặc: đặt thuộc tính data-icon="name" lên phần tử, app.js sẽ tự điền.
   ============================================================ */
(function (global) {
  'use strict';

  var W = function (inner, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true"' + (extra || '') + '>' + inner + '</svg>';
  };

  var P = {
    /* ---- điều hướng ---- */
    menu:        '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close:       '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronRight:'<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    arrowRight:  '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowLeft:   '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    externalLink:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',

    /* ---- giao diện ---- */
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:   '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    copy:   '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check:  '<path d="M20 6 9 17l-5-5"/>',

    /* ---- nội dung ---- */
    map:        '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
    target:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    book:       '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/>',
    layers:     '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    listChecks: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1.5 1.5L7.5 4.5M3 16.5 4.5 18l3-3"/>',
    award:      '<circle cx="12" cy="9" r="6"/><path d="m8.2 13.9-1.4 7.3 5.2-2.8 5.2 2.8-1.4-7.3"/>',
    sparkles:   '<path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    scissors:   '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    fileCode:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2M14 13l2 2-2 2"/>',
    bookmark:   '<path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',

    /* ---- đồng bộ ---- */
    cloud:    '<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 11.1 3.9 3.9 0 0 0 6.5 19Z"/>',
    cloudOff: '<path d="M17.5 19a4.5 4.5 0 0 0 3.3-7.56M14.9 6.1A6 6 0 0 1 18 10.03M6.2 11.1A3.9 3.9 0 0 0 6.5 19h9"/><path d="m3 3 18 18"/>',
    user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logOut:   '<path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="m10 17-5-5 5-5M5 12h11"/>',

    /* ---- callout ---- */
    info:      '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    lightbulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a6.5 6.5 0 0 0-4 11.6c.6.5 1 1.2 1 2V15h6v-1.4c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2Z"/>',
    alert:     '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    danger:    '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    help:      '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',

    /* ---- môi trường chạy lệnh ---- */
    terminal:  '<path d="m4 17 6-5-6-5M12 19h8"/>',
    windows:   '<path d="M3 5.5 10 4.5v7H3ZM11.5 4.3 21 3v8.5h-9.5ZM3 12.5h7v7L3 18.5ZM11.5 12.5H21V21l-9.5-1.3Z"/>',
    cpu:       '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    chip:      '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/>',
    hardDrive: '<path d="M2 12h20"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z"/><path d="M6 16h.01M10 16h.01"/>',
    file:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',

    /* ---- logo ----
       Dấu nhắc ">_": mark duy nhất của sản phẩm, dùng ở topbar và ở favicon.
       Nét dày hơn các icon khác (3.12 / 2.64 thay vì 2) vì logo phải còn đọc
       được khi thu xuống 16px trong tab trình duyệt.
       assets/favicon.svg vẽ lại đúng toạ độ này, nhân 32/24. Sửa ở đây thì
       phải sửa cả ở đó rồi dựng lại assets/favicon.ico. */
    logo: '<path d="M6.24 6.96 11.52 12 6.24 17.04" stroke-width="3.12"/><path d="M13.2 17.28h5.28" stroke-width="2.64"/>'
  };

  function ICON(name, extra) {
    var p = P[name];
    if (!p) { return ''; }
    return W(p, extra);
  }

  ICON.has = function (n) { return Object.prototype.hasOwnProperty.call(P, n); };

  /* Điền mọi phần tử có data-icon trong một gốc DOM */
  ICON.hydrate = function (root) {
    var nodes = (root || document).querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset.iconDone === '1') { continue; }
      el.innerHTML = ICON(el.getAttribute('data-icon'));
      el.dataset.iconDone = '1';
    }
  };

  global.ICON = ICON;
})(window);

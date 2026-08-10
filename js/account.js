/* ============================================================
   ACCOUNT — hộp thoại nhập tên và nút trạng thái đồng bộ trên thanh trên.

   Đây KHÔNG phải đăng nhập. Không mật khẩu, không phân quyền: tên người
   dùng chỉ là khoá chọn tài liệu trên Firestore (CLAUDE.md §14).

   Nhưng từ 2026-08-10 nó là BẮT BUỘC, không còn là tuỳ chọn: tiến độ chỉ
   tồn tại trên máy chủ, nên chưa có tên thì không có chỗ nào để ghi. Vì thế
   không còn nút "Dùng ngoại tuyến", và hộp thoại tự bật mỗi lần mở trang
   khi chưa có tên. Người học vẫn đóng được nó để đọc bài — chỉ là mọi nút
   ghi sẽ bị khoá cho tới khi kết nối xong.

   Toàn bộ file này chỉ là giao diện. Việc kết nối, nghe và ghi nằm ở
   js/cloud.js; ở đây chỉ gọi Cloud.connect / Cloud.disconnect.
   ============================================================ */
(function (global) {
  'use strict';

  /* Chữ, số, gạch dưới, gạch ngang — trùng với điều kiện trong Firestore
     Rules. Cho phép khoảng trắng hay dấu tiếng Việt sẽ khiến người học gõ
     sai một ký tự vô hình là mất sạch tiến độ đã đồng bộ. */
  var RE = /^[A-Za-z0-9_-]{3,40}$/;

  var LABEL = {
    off:        'Chưa đồng bộ',
    connecting: 'Đang kết nối…',
    live:       'Đang đồng bộ',
    error:      'Lỗi đồng bộ'
  };

  var btn = null;      // nút trên thanh trên
  var box = null;      // .modal (bao cả lớp phủ)
  var lastFocus = null;

  function $(s, r) { return (r || document).querySelector(s); }

  /* ══════════ Nút trên thanh trên ══════════ */

  function paintButton() {
    if (!btn) { return; }
    var st = Cloud.state();
    var name = Store.getUser();

    btn.dataset.sync = st;
    btn.innerHTML = ICON(st === 'live' ? 'cloud' : (st === 'error' ? 'cloudOff' : 'user'));
    btn.setAttribute('aria-label',
      LABEL[st] + (name ? ' — ' + name : '') + '. Bấm để đổi.');
    btn.title = name ? (LABEL[st] + ': ' + name) : LABEL[st];
  }

  /* ══════════ Hộp thoại ══════════ */

  function body() {
    var st = Cloud.state();
    var name = Store.getUser();
    var err = Cloud.error();

    var status =
      '<div class="acc__state" data-sync="' + st + '">' +
        ICON(st === 'live' ? 'cloud' : (st === 'error' ? 'cloudOff' : 'user')) +
        '<span>' + LABEL[st] + (name ? ' · ' + Render.esc(name) : '') + '</span>' +
      '</div>';

    var hint = err
      ? '<div class="acc__err">' + ICON('alert') +
        '<span>Không kết nối được (' + Render.esc(err) + '). Bài học vẫn đọc ' +
        'bình thường, nhưng <b>không ghi được tiến độ</b>: tiến độ chỉ tồn tại ' +
        'trên máy chủ, không còn bản nào lưu ở máy này.</span></div>'
      : '';

    if (name && st !== 'error') {
      return status + hint +
        '<p class="acc__p">' +
          (st === 'connecting'
            ? 'Đang nối tới máy chủ dưới tên <b>' + Render.esc(name) + '</b>. ' +
              'Cứ đọc bài tiếp — các nút đánh dấu sẽ mở khoá ngay khi dữ liệu về.'
            : 'Tiến độ, đáp án quiz và bài tập của bạn đang được lưu dưới tên ' +
              '<b>' + Render.esc(name) + '</b>. Mở trang này trên máy khác và nhập ' +
              'đúng tên đó là có lại toàn bộ.') +
        '</p>' +
        '<div class="acc__row">' +
          '<button class="btn" type="button" data-acc="switch">' + ICON('user') + 'Đổi tên khác</button>' +
        '</div>';
    }

    return status + hint +
      '<p class="acc__p">' + (name
        ? 'Tiến độ của bạn nằm trên máy chủ dưới tên <b>' + Render.esc(name) + '</b>. ' +
          'Bấm <b>Kết nối lại</b> để thử lần nữa, hoặc nhập một tên khác.'
        : 'Nhập một tên để có chỗ lưu tiến độ học. Đây không phải tài khoản — ' +
          'không có mật khẩu, chỉ cần nhớ đúng tên đã dùng, và nhập lại đúng tên ' +
          'đó trên máy khác là có lại toàn bộ.') +
      '</p>' +
      '<label class="acc__lbl" for="accName">Tên người dùng</label>' +
      '<input class="acc__in" id="accName" type="text" spellcheck="false" autocomplete="off" ' +
        'placeholder="vi-du-ten-cua-ban" value="' + Render.esc(name).replace(/"/g, '&quot;') + '">' +
      '<div class="acc__note" id="accNote">3–40 ký tự, chỉ chữ không dấu, số, <code>-</code> và <code>_</code>.</div>' +
      '<div class="acc__row">' +
        '<button class="btn btn--primary" type="button" data-acc="go">' + ICON('cloud') +
          (name ? 'Kết nối lại' : 'Bắt đầu lưu tiến độ') + '</button>' +
      '</div>';
  }

  function paintBody() {
    if (!box) { return; }
    var b = $('.acc__body', box);
    b.innerHTML = body();
    ICON.hydrate(b);

    /* Focus phải nằm TRONG hộp thoại, nếu không phím Esc và bẫy Tab đều
       không nhận được sự kiện (listener gắn trên chính hộp thoại). */
    var input = $('#accName', b);
    if (input) { input.focus(); input.select(); }
    else { $('[data-acc="close"].icon-btn', box).focus(); }
  }

  function open() {
    if (box) { paintBody(); return; }
    lastFocus = document.activeElement;

    box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML =
      '<div class="modal__veil" data-acc="close"></div>' +
      '<div class="modal__card acc" role="dialog" aria-modal="true" aria-labelledby="accTitle">' +
        '<div class="modal__head">' +
          '<h2 id="accTitle">Đồng bộ tiến độ</h2>' +
          '<button class="icon-btn" type="button" data-acc="close" aria-label="Đóng">' +
            ICON('close') +
          '</button>' +
        '</div>' +
        '<div class="acc__body"></div>' +
      '</div>';

    document.body.appendChild(box);
    document.body.classList.add('is-locked');
    paintBody();

    box.addEventListener('click', onClick);
    box.addEventListener('keydown', onKey);
  }

  function close() {
    if (!box) { return; }
    box.remove();
    box = null;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  function submit() {
    var input = $('#accName', box);
    var note = $('#accNote', box);
    var v = (input.value || '').trim();

    if (!RE.test(v)) {
      note.classList.add('is-bad');
      note.textContent = 'Tên không hợp lệ: cần 3–40 ký tự, chỉ chữ không dấu, số, - và _.';
      input.focus();
      return;
    }

    /* Không cần paintBody() ở đây: connect() đặt trạng thái 'connecting'
       ngay lập tức, và Cloud.onState đã được nối tới paintBody trong init(). */
    Cloud.connect(v);
  }

  function onClick(e) {
    var t = e.target.closest('[data-acc]');
    if (!t) { return; }
    var a = t.dataset.acc;

    if (a === 'close') { close(); }
    else if (a === 'go') { submit(); }
    /* Rơi về màn hình nhập tên. Vẽ lại tay chứ không dựa vào Cloud.onState:
       setState() bỏ qua khi trạng thái không đổi. */
    else if (a === 'switch') { Cloud.disconnect(); paintBody(); }
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Enter' && e.target.id === 'accName') { e.preventDefault(); submit(); return; }

    /* Bẫy tab trong hộp thoại: đây là modal, để tab chạy ra sidebar phía sau
       thì người dùng bàn phím sẽ lạc và không biết đường quay lại. */
    if (e.key !== 'Tab') { return; }
    var f = box.querySelectorAll('button, input, [href]');
    if (!f.length) { return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ══════════ Khởi động ══════════ */

  var Account = {
    open: open,
    close: close,

    init: function () {
      btn = $('#btnAccount');
      if (btn) { btn.addEventListener('click', open); }

      Cloud.onState(function () {
        paintButton();
        if (box) { paintBody(); }
      });

      paintButton();

      /* Chưa có tên thì hỏi, mỗi lần mở trang — không còn "hỏi một lần rồi
         thôi" như hồi đồng bộ còn là tuỳ chọn: không có tên thì không có
         chỗ ghi tiến độ, im lặng bỏ qua chỉ khiến người học tick cả buổi
         rồi mất trắng. Vẫn đợi trang vẽ xong bài đã: chưa đọc được chữ nào
         đã bị chặn bởi hộp thoại là trải nghiệm tệ. */
      if (!Store.getUser()) { setTimeout(open, 700); }
    }
  };

  global.Account = Account;
})(window);

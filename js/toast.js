/* ============================================================
   TOAST — báo ngắn ở góc màn hình.

   Tồn tại vì đúng một lý do: từ 2026-08-10 tiến độ chỉ nằm trên máy chủ, và
   một lệnh ghi có thể hỏng. Khi đó giao diện tự hoàn tác về trạng thái cũ —
   nếu không nói gì thì người học chỉ thấy nút mình vừa bấm tự bật ngược lại
   và không hiểu vì sao.

   Cố ý không có nút đóng, không xếp chồng quá 3 cái, và tự biến mất: đây là
   thông báo, không phải hộp thoại. Vùng chứa mang aria-live="polite" nên
   trình đọc màn hình đọc nó mà không cắt ngang việc đang làm.
   ============================================================ */
(function (global) {
  'use strict';

  var LIFE = 5000;   // ms trước khi tự tan
  var MAX  = 3;
  var wrap = null;

  function box() {
    if (wrap) { return wrap; }
    wrap = document.createElement('div');
    wrap.className = 'toasts';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
    return wrap;
  }

  function drop(el) {
    if (!el || !el.parentNode) { return; }
    el.classList.add('is-out');
    setTimeout(function () {
      if (el.parentNode) { el.parentNode.removeChild(el); }
    }, 200);
  }

  var Toast = {

    /* kind: 'err' (mặc định) | 'ok' | 'info' */
    show: function (msg, kind) {
      var w = box();

      while (w.children.length >= MAX) { drop(w.firstChild); }

      var el = document.createElement('div');
      el.className = 'toast toast--' + (kind || 'err');
      el.innerHTML =
        '<span class="toast__ico">' +
          ICON(kind === 'ok' ? 'check' : (kind === 'info' ? 'info' : 'alert')) +
        '</span><span class="toast__x">' + msg + '</span>';
      w.appendChild(el);
      ICON.hydrate(el);

      setTimeout(function () { drop(el); }, LIFE);
      return el;
    },

    /* Câu nói duy nhất dùng cho mọi lần ghi hỏng, để người học nhận ra ngay
       nó là cùng một chuyện chứ không phải ba lỗi khác nhau. */
    writeFailed: function (what) {
      this.show('Không lưu được ' + what + ' lên máy chủ — thao tác vừa rồi đã được ' +
        'hoàn tác. Kiểm tra kết nối rồi thử lại.');
    }
  };

  global.Toast = Toast;
})(window);

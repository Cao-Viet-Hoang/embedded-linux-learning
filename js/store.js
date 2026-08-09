/* ============================================================
   STORE — lưu trạng thái người học vào localStorage.

   localStorage LUÔN là nguồn sự thật của máy này. js/cloud.js chỉ là một
   lớp phủ tuỳ chọn: nó đọc snapshot() để đẩy lên Firestore và gọi
   applyRemote() khi máy khác sửa. Không có mạng, không đăng nhập, hay SDK
   nạp hỏng thì mọi thứ dưới đây vẫn chạy nguyên vẹn.

   Chỉ ba nhóm được đồng bộ: bài đã hoàn thành, đáp án quiz, và (để dành)
   bài tập. Giao diện sáng/tối, sidebar thu gọn và chặng nào đang mở là
   tuỳ chọn RIÊNG của từng máy — đồng bộ chúng chỉ gây khó chịu.
   ============================================================ */
(function (global) {
  'use strict';

  var K = {
    theme:     'elx.theme',
    done:      'elx.done',      // { "bai-01": 1735000000000, ... }
    quiz:      'elx.quiz',      // { "bai-01": { "0": 2, "1": 0 } }  câu → đáp án đã chọn
    ex:        'elx.ex',        // bài tập — CLAUDE.md §13. Chưa có API, mới chỉ được đồng bộ
    modules:   'elx.modOpen',   // { "m0": true, ... }  chặng nào đang mở
    sidebarCl: 'elx.sbCollapsed', // '1' nếu người học đã thu gọn sidebar trên desktop
    user:      'elx.user',      // tên người dùng dùng để đồng bộ; rỗng = học offline
    asked:     'elx.syncAsked'  // '1' = đã hỏi tên một lần, đừng bật hộp thoại lại nữa
  };

  /* Các khoá được đẩy lên máy chủ. Thêm khoá mới thì thêm cả ở đây,
     ở snapshot() và ở applyRemote() — nếu không nó sẽ im lặng không đồng bộ. */
  var SYNCED = ['done', 'quiz', 'ex'];

  /* localStorage có thể bị chặn (chế độ riêng tư, chính sách trình duyệt).
     Khi đó rơi về bộ nhớ tạm để ứng dụng vẫn chạy, chỉ mất tính lưu lâu dài. */
  var mem = {};
  var ok = (function () {
    try {
      localStorage.setItem('elx.probe', '1');
      localStorage.removeItem('elx.probe');
      return true;
    } catch (e) { return false; }
  })();

  function readRaw(k) {
    if (!ok) { return mem[k] === undefined ? null : mem[k]; }
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function writeRaw(k, v) {
    if (!ok) { mem[k] = v; return; }
    try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; }
  }

  function readObj(k) {
    var raw = readRaw(k);
    if (!raw) { return {}; }
    try {
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function writeObj(k, o) { writeRaw(k, JSON.stringify(o)); }

  /* ---------- Thông báo thay đổi ----------
     cloud.js đăng ký một hàm ở đây để biết khi nào cần đẩy dữ liệu lên.
     Cờ `muted` được bật trong applyRemote(): nếu không, việc ghi dữ liệu
     nhận từ máy chủ sẽ lại kích hoạt một lần đẩy lên, và hai máy sẽ ping
     pong vô hạn. */
  var listeners = [];
  var muted = false;

  function emit() {
    if (muted) { return; }
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); }
      catch (e) { console.error('[store] listener lỗi:', e); }
    }
  }

  var Store = {

    /* ---------- Giao diện ---------- */
    getTheme: function () {
      var t = readRaw(K.theme);
      if (t === 'dark' || t === 'light') { return t; }
      return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    setTheme: function (t) {
      writeRaw(K.theme, t);
      document.documentElement.setAttribute('data-theme', t);
    },
    toggleTheme: function () {
      var next = this.getTheme() === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
      return next;
    },

    /* ---------- Hoàn thành bài ---------- */
    isDone: function (id) { return !!readObj(K.done)[id]; },
    doneMap: function () { return readObj(K.done); },
    doneCount: function () { return Object.keys(readObj(K.done)).length; },
    setDone: function (id, on) {
      var m = readObj(K.done);
      if (on) { m[id] = Date.now(); } else { delete m[id]; }
      writeObj(K.done, m);
      emit();
      return !!m[id];
    },
    toggleDone: function (id) { return this.setDone(id, !this.isDone(id)); },

    /* ---------- Quiz ---------- */
    getQuiz: function (lessonId) { return readObj(K.quiz)[lessonId] || {}; },
    setQuizAnswer: function (lessonId, qIndex, choice) {
      var all = readObj(K.quiz);
      if (!all[lessonId]) { all[lessonId] = {}; }
      all[lessonId][String(qIndex)] = choice;
      writeObj(K.quiz, all);
      emit();
    },
    resetQuiz: function (lessonId) {
      var all = readObj(K.quiz);
      delete all[lessonId];
      writeObj(K.quiz, all);
      emit();
    },

    /* ---------- Thu gọn sidebar trên desktop ---------- */
    getSidebarCollapsed: function () { return readRaw(K.sidebarCl) === '1'; },
    setSidebarCollapsed: function (on) { writeRaw(K.sidebarCl, on ? '1' : '0'); },

    /* ---------- Chặng đang mở trong sidebar ---------- */
    isModuleOpen: function (mid, fallback) {
      var m = readObj(K.modules);
      return Object.prototype.hasOwnProperty.call(m, mid) ? !!m[mid] : !!fallback;
    },
    setModuleOpen: function (mid, on) {
      var m = readObj(K.modules);
      m[mid] = !!on;
      writeObj(K.modules, m);
    },

    /* ---------- Bài tập (CLAUDE.md §13) ----------
       Chưa có giao diện nào ghi vào khoá này. Nó đã nằm trong SYNCED từ bây
       giờ để khi module bài tập ra đời thì không phải sửa lại cloud.js. */
    getEx: function (exId) { return readObj(K.ex)[exId] || {}; },
    setEx: function (exId, data) {
      var all = readObj(K.ex);
      all[exId] = data;
      writeObj(K.ex, all);
      emit();
    },

    /* ---------- Xoá sạch tiến độ ---------- */
    resetAll: function () {
      [K.done, K.quiz, K.ex, K.modules].forEach(function (k) {
        if (ok) { try { localStorage.removeItem(k); } catch (e) {} }
        delete mem[k];
      });
      emit();
    },

    /* ---------- Tên người dùng dùng để đồng bộ ----------
       Đây KHÔNG phải đăng nhập: không có mật khẩu, không phân quyền. Nó chỉ
       là khoá chọn tài liệu trên Firestore. Xem CLAUDE.md §14. */
    getUser: function () { return readRaw(K.user) || ''; },
    setUser: function (name) { writeRaw(K.user, String(name || '')); },
    clearUser: function () { writeRaw(K.user, ''); },

    /* Đã bật hộp thoại hỏi tên lần nào chưa. Hỏi đúng một lần rồi thôi —
       người học chọn "Dùng offline" thì đừng làm phiền lại mỗi lần mở trang. */
    getSyncAsked: function () { return readRaw(K.asked) === '1'; },
    setSyncAsked: function (on) { writeRaw(K.asked, on ? '1' : '0'); },

    /* ---------- Cầu nối với cloud.js ---------- */

    /* Gọi fn() sau mỗi lần dữ liệu được đồng bộ thay đổi. Trả về hàm huỷ. */
    onChange: function (fn) {
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) { listeners.splice(i, 1); }
      };
    },

    /* Toàn bộ dữ liệu được đồng bộ, dạng thuần để đẩy thẳng lên Firestore. */
    snapshot: function () {
      return { done: readObj(K.done), quiz: readObj(K.quiz), ex: readObj(K.ex) };
    },

    /* Ghi đè trạng thái máy này bằng dữ liệu từ máy chủ.
       Ghi ĐÈ chứ không trộn: người học đã chốt là máy chủ luôn đúng, dữ liệu
       cũ trên máy không quan trọng (CLAUDE.md §14). Trộn hai phía sẽ làm một
       bài bị bỏ tick ở máy A "sống lại" khi máy B đồng bộ lên. */
    applyRemote: function (data) {
      if (!data || typeof data !== 'object') { return; }
      muted = true;
      try {
        for (var i = 0; i < SYNCED.length; i++) {
          var name = SYNCED[i];
          var v = data[name];
          writeObj(K[name], (v && typeof v === 'object') ? v : {});
        }
      } finally { muted = false; }
    },

    persistent: ok
  };

  global.Store = Store;
})(window);

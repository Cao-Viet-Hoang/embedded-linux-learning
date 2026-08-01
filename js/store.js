/* ============================================================
   STORE — lưu trạng thái người học vào localStorage.
   Ba thứ được lưu: giao diện sáng/tối, bài đã hoàn thành,
   và kết quả quiz của từng bài.
   ============================================================ */
(function (global) {
  'use strict';

  var K = {
    theme:   'elx.theme',
    done:    'elx.done',      // { "bai-01": 1735000000000, ... }
    quiz:    'elx.quiz',      // { "bai-01": { "0": 2, "1": 0 } }  câu → đáp án đã chọn
    modules: 'elx.modOpen'    // { "m0": true, ... }  chặng nào đang mở
  };

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
    },
    resetQuiz: function (lessonId) {
      var all = readObj(K.quiz);
      delete all[lessonId];
      writeObj(K.quiz, all);
    },

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

    /* ---------- Xoá sạch tiến độ ---------- */
    resetAll: function () {
      [K.done, K.quiz, K.modules].forEach(function (k) {
        if (ok) { try { localStorage.removeItem(k); } catch (e) {} }
        delete mem[k];
      });
    },

    persistent: ok
  };

  global.Store = Store;
})(window);

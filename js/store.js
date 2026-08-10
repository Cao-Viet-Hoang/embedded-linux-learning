/* ============================================================
   STORE — trạng thái người học.

   Từ 2026-08-10 kiến trúc đảo ngược so với bản đầu: CƠ SỞ DỮ LIỆU LÀ NGUỒN
   SỰ THẬT DUY NHẤT của tiến độ học. localStorage chỉ còn giữ những thứ
   thuộc về CÁI MÁY này, không thuộc về người học:

     giữ ở localStorage   giao diện sáng/tối, sidebar thu gọn, chặng nào
                          đang mở, tên người dùng, id máy
     bắt buộc ở Firestore bài đã hoàn thành, đáp án quiz, toàn bộ bài tập

   Lý do chia đúng ở đường này: đồng bộ một tuỳ chọn máy nghĩa là mở trang
   trên điện thoại ở chế độ tối sẽ lật luôn máy bàn sang tối — phiền, không
   phải tính năng. Còn tiến độ mà nằm ở máy thì mỗi máy có một sự thật khác
   nhau, đúng cái mà việc đồng bộ sinh ra để dẹp.

   Dữ liệu tiến độ nằm trong bộ nhớ RAM của trang, KHÔNG bao giờ chạm
   localStorage. Chưa tải xong thì ready() = false và giao diện phải khoá
   thao tác lại — thà chờ còn hơn hiện một con số sai rồi tự nhảy.

   Mọi hàm ghi đều theo đúng một khuôn: sửa bộ nhớ NGAY (giao diện phản hồi
   tức thì), gửi lệnh ghi xuống js/cloud.js, và nếu ghi hỏng thì HOÀN TÁC lại
   đúng giá trị cũ rồi trả về false. Vì vậy chúng trả về Promise<boolean>:
   `true` = máy chủ đã nhận, `false` = đã hoàn tác, hãy vẽ lại và báo người
   dùng. File này vẫn không biết Firebase là gì — nó chỉ gọi hàm ghi mà
   cloud.js đăng ký qua setWriter().
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Khoá localStorage: CHỈ tuỳ chọn của máy này ---------- */
  var K = {
    theme:     'elx.theme',
    modules:   'elx.modOpen',     // { "m0": true, ... }  chặng nào đang mở
    sidebarCl: 'elx.sbCollapsed', // '1' nếu đã thu gọn sidebar trên desktop
    user:      'elx.user',        // tên người dùng = khoá tài liệu trên Firestore
    dev:       'elx.dev'          // id ngẫu nhiên của máy này, ghi kèm mỗi lần ghi
  };

  /* Khoá của kiến trúc cũ, khi tiến độ còn nằm ở máy. Chúng chỉ còn được
     ĐỌC đúng một lần, để chuyển dữ liệu cũ lên máy chủ rồi xoá đi — xem
     legacy() / dropLegacy() ở cuối file. Không bao giờ ghi vào lại. */
  var OLD = { done: 'elx.done', quiz: 'elx.quiz', ex: 'elx.ex' };

  /* localStorage có thể bị chặn (chế độ riêng tư, chính sách trình duyệt).
     Khi đó rơi về bộ nhớ tạm: mất tính lưu lâu dài của các tuỳ chọn, nhưng
     tiến độ thì không hề hấn gì vì nó vốn không nằm ở đây. */
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
  function dropRaw(k) {
    if (ok) { try { localStorage.removeItem(k); } catch (e) {} }
    delete mem[k];
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

  /* ---------- Dữ liệu tiến độ: CHỈ trong RAM, gương của Firestore ---------- */

  var data   = { done: {}, quiz: {} };   // tài liệu progress/{user}
  var exData = {};                       // exId -> { itemId: {…} }, mỗi bộ một tài liệu con
  var ready  = false;                    // đã nhận đủ dữ liệu từ máy chủ chưa
  var writer = null;                     // hàm ghi do cloud.js đăng ký

  /* Cờ "xoá trường này đi" gửi kèm trong lệnh ghi. Store không được biết
     firebase.firestore.FieldValue.delete() tồn tại; cloud.js dịch hộ. */
  var DEL = { __del: true };

  /* Một câu quiz của một bài, dạng chuẩn { n, a }.
       n = số câu hỏi của bài lúc người học trả lời (0 = không rõ)
       a = { "<chỉ số câu>": <đáp án đã chọn> }

     Nhận cả hình dạng cũ — `{ "0": 2, "1": 0 }` phẳng, không có n — vì tài
     liệu trên máy chủ có thể vẫn đang ở dạng đó. Đọc lên thành n = 0 nghĩa
     là "không biết bài lúc đó có bao nhiêu câu", nên bỏ qua phép kiểm lệch
     nấc thay vì xoá oan đáp án cũ. */
  function quizEntry(raw) {
    if (!raw || typeof raw !== 'object') { return { n: 0, a: {} }; }
    if (raw.a && typeof raw.a === 'object') {
      return { n: parseInt(raw.n, 10) || 0, a: raw.a };
    }
    return { n: 0, a: raw };
  }

  function clone(o) {
    return (o && typeof o === 'object') ? JSON.parse(JSON.stringify(o)) : {};
  }

  /* ---------- Khuôn chung của mọi thao tác ghi ----------
     `ops`  = danh sách trường phải đổi, mỗi trường là { p: [đường dẫn], v: giá trị }.
              Đường dẫn được tách sẵn thành mảng chứ không nối bằng dấu chấm:
              id bài là `bai-01`, có dấu gạch ngang, nên "done.bai-01" là một
              field path KHÔNG hợp lệ nếu không bọc dấu backtick. Mảng thì
              cloud.js dựng thẳng thành FieldPath, không phải đoán quy tắc
              trích dẫn của ai cả.
     `undo` = hàm trả bộ nhớ về đúng trạng thái trước đó khi ghi hỏng.

     Trả về Promise<boolean>. KHÔNG bao giờ reject: nơi gọi là chỗ xử lý
     giao diện, và một promise bị bỏ quên ở đó sẽ thành "Unhandled rejection"
     chứ không thành thông tin gì hữu ích cho người học. */
  function commit(exId, ops, undo) {
    if (!writer || !ready) {
      undo();
      return Promise.resolve(false);
    }
    return writer(exId, ops).then(
      function () { return true; },
      function (e) {
        console.warn('[store] ghi hỏng, đã hoàn tác:', e);
        undo();
        return false;
      }
    );
  }

  var Store = {

    DEL: DEL,

    /* ══════════ Tuỳ chọn của máy này (localStorage) ══════════ */

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

    getSidebarCollapsed: function () { return readRaw(K.sidebarCl) === '1'; },
    setSidebarCollapsed: function (on) { writeRaw(K.sidebarCl, on ? '1' : '0'); },

    isModuleOpen: function (mid, fallback) {
      var m = readObj(K.modules);
      return Object.prototype.hasOwnProperty.call(m, mid) ? !!m[mid] : !!fallback;
    },
    setModuleOpen: function (mid, on) {
      var m = readObj(K.modules);
      m[mid] = !!on;
      writeObj(K.modules, m);
    },

    /* Tên người dùng: KHÔNG phải đăng nhập, chỉ là khoá chọn tài liệu trên
       Firestore. Nó nằm ở máy vì nó trả lời câu hỏi "máy này là của ai",
       chứ không phải "người này đã học tới đâu". CLAUDE.md §14. */
    getUser:   function () { return readRaw(K.user) || ''; },
    setUser:   function (name) { writeRaw(K.user, String(name || '')); },
    clearUser: function () { writeRaw(K.user, ''); },

    /* Id ngẫu nhiên của máy này, sinh một lần rồi giữ nguyên, ghi kèm vào
       trường `by` mỗi lần ghi. Ghi sau đè ghi trước mà không để lại dấu vết,
       nên trường này là thứ biến "tiến độ tự nhiên biến mất" từ chuyện
       không giải thích được thành chuyện tra ra được. */
    deviceId: function () {
      var d = readRaw(K.dev);
      if (!d) {
        d = 'web-' + Math.random().toString(36).slice(2, 8);
        writeRaw(K.dev, d);
      }
      return d;
    },

    persistent: ok,

    /* ══════════ Tiến độ — nguồn sự thật là Firestore ══════════ */

    /* false = chưa nhận được dữ liệu từ máy chủ. Giao diện PHẢI khoá mọi
       nút ghi khi cờ này false: mọi con số đọc ra lúc đó đều là 0 giả. */
    ready: function () { return ready; },

    /* ---------- Hoàn thành bài ---------- */
    isDone:    function (id) { return !!data.done[id]; },
    doneMap:   function () { return data.done; },
    doneCount: function () { return Object.keys(data.done).length; },

    setDone: function (id, on) {
      var prev = data.done[id];
      if (on) { data.done[id] = Date.now(); } else { delete data.done[id]; }
      return commit(null, [{ p: ['done', id], v: on ? data.done[id] : DEL }], function () {
        if (prev === undefined) { delete data.done[id]; } else { data.done[id] = prev; }
      });
    },

    /* ---------- Quiz ----------
       Đáp án được khoá theo CHỈ SỐ câu hỏi, nên nếu quiz của một bài được
       sửa (chèn thêm câu vào giữa) thì mọi đáp án cũ sẽ lệch một nấc và
       hiện sai một cách im lặng. `n` = số câu lúc trả lời chính là chốt
       chặn: số câu đổi thì bỏ hết đáp án cũ thay vì hiển thị sai. */
    getQuiz: function (lessonId, n) {
      var e = quizEntry(data.quiz[lessonId]);
      if (n && e.n && e.n !== n) { return {}; }
      return e.a;
    },

    setQuizAnswer: function (lessonId, qIndex, choice, n) {
      var prev = data.quiz[lessonId];
      var e = quizEntry(prev);
      e = { n: n || e.n || 0, a: clone(e.a) };
      e.a[String(qIndex)] = choice;
      data.quiz[lessonId] = e;
      return commit(null, [{ p: ['quiz', lessonId], v: e }], function () {
        if (prev === undefined) { delete data.quiz[lessonId]; }
        else { data.quiz[lessonId] = prev; }
      });
    },

    resetQuiz: function (lessonId) {
      var prev = data.quiz[lessonId];
      delete data.quiz[lessonId];
      return commit(null, [{ p: ['quiz', lessonId], v: DEL }], function () {
        if (prev !== undefined) { data.quiz[lessonId] = prev; }
      });
    },

    /* ---------- Bài tập (CLAUDE.md §13) ----------
       Mỗi bộ là MỘT tài liệu con riêng, progress/{user}/ex/{bt-NN}, chứ
       không nhét chung vào tài liệu tiến độ: câu trả lời tự luận của 70 bộ
       cộng lại có thể vượt trần 1 MiB của một document Firestore. */
    getEx: function (exId) { return exData[exId] || {}; },

    /* Cập nhật MỘT câu, trộn `patch` vào trạng thái cũ của đúng câu đó.
       Trộn chứ không ghi đè vì một câu có nhiều mặt độc lập nhau: `tf` giữ
       cả đáp án đúng/sai (`p`) lẫn phần viết lại (`txt`) lẫn các ý đã tự
       chấm (`ck`), và mỗi thứ được ghi ở một thời điểm khác nhau. */
    setExItem: function (exId, itemId, patch) {
      var set  = exData[exId] || (exData[exId] = {});
      var prev = set[itemId];
      var st   = clone(prev);
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) { st[k] = patch[k]; }
      }
      set[itemId] = st;
      return commit(exId, [{ p: ['items', itemId], v: st }], function () {
        if (prev === undefined) { delete set[itemId]; } else { set[itemId] = prev; }
      });
    },

    resetEx: function (exId) {
      var prev = exData[exId];
      exData[exId] = {};
      return commit(exId, [{ p: ['items'], v: {} }], function () {
        if (prev === undefined) { delete exData[exId]; } else { exData[exId] = prev; }
      });
    },

    /* ---------- Xoá sạch tiến độ bài học ---------- */
    resetAll: function () {
      var prev = { done: data.done, quiz: data.quiz };
      data.done = {};
      data.quiz = {};
      return commit(null, [{ p: ['done'], v: {} }, { p: ['quiz'], v: {} }], function () {
        data.done = prev.done;
        data.quiz = prev.quiz;
      });
    },

    /* ══════════ Cầu nối với cloud.js ══════════ */

    /* cloud.js đăng ký hàm ghi thật ở đây: fn(exId | null, ops) -> Promise.
       Chưa đăng ký (chưa nhập tên, SDK hỏng) thì commit() hoàn tác ngay và
       trả false — giao diện tự khắc báo "không lưu được". */
    setWriter: function (fn) { writer = fn; },

    setReady: function (on) { ready = !!on; },

    /* Ghi đè trạng thái trang bằng dữ liệu từ máy chủ.
       Ghi ĐÈ chứ không trộn: máy chủ luôn đúng (CLAUDE.md §14). Trộn hai
       phía sẽ làm một bài bị bỏ tick ở máy A "sống lại" khi máy B ghi lên. */
    applyRemote: function (d) {
      d = d || {};
      data.done = (d.done && typeof d.done === 'object') ? d.done : {};
      data.quiz = (d.quiz && typeof d.quiz === 'object') ? d.quiz : {};
    },

    /* map = { "bt-01": { itemId: {…} }, … } — toàn bộ tài liệu con ex. */
    applyRemoteEx: function (map) {
      exData = (map && typeof map === 'object') ? map : {};
    },

    /* ══════════ Dữ liệu sót lại của kiến trúc cũ ══════════
       Trước 2026-08-10, `done`/`quiz` được đồng bộ nhưng `ex` thì chỉ nằm ở
       máy. Nếu xoá thẳng localStorage thì toàn bộ câu trả lời bài tập của
       người học bốc hơi. cloud.js đọc hàm này đúng một lần, đẩy những gì
       máy chủ chưa có lên, rồi gọi dropLegacy(). */
    legacy: function () {
      return { done: readObj(OLD.done), quiz: readObj(OLD.quiz), ex: readObj(OLD.ex) };
    },
    dropLegacy: function () {
      dropRaw(OLD.done);
      dropRaw(OLD.quiz);
      dropRaw(OLD.ex);
    }
  };

  global.Store = Store;
})(window);

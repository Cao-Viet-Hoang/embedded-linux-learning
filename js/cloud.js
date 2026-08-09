/* ============================================================
   CLOUD — đồng bộ tiến độ qua Firebase Firestore.

   Đây là một LỚP PHỦ TUỲ CHỌN. Không có mạng, chưa nhập tên, hay Firebase
   chết thì toàn bộ ứng dụng vẫn chạy y như cũ nhờ localStorage. Mọi lỗi ở
   file này đều kết thúc bằng trạng thái 'error' và một dòng console — không
   bao giờ được ném ra ngoài làm hỏng trang đang đọc.

   Mô hình dữ liệu — CLAUDE.md §14:
     progress/{username} = { v, at, done, quiz, ex }
   Một tài liệu duy nhất cho mỗi người, ghi đè toàn bộ mỗi lần. Không trộn,
   không lịch sử: người học đã chốt là chỉ ngồi một máy tại một thời điểm,
   nên máy chủ luôn đúng.

   SDK được nạp MUỘN, chỉ khi người học thật sự bật đồng bộ. Đặt hai thẻ
   <script> của Firebase vào index.html sẽ chặn lần vẽ đầu tiên khi offline —
   người chỉ muốn đọc bài phải chờ trình duyệt hết giờ kết nối.
   ============================================================ */
(function (global) {
  'use strict';

  /* Cấu hình này công khai theo thiết kế của Firebase: nó chỉ định danh dự
     án, không phải bí mật. Thứ bảo vệ dữ liệu là Firestore Rules
     (firebase/firestore.rules) — danh sách trắng tên người dùng. */
  var CONFIG = {
    apiKey:            'AIzaSyA_u3iCbLmyii6imVTEXbfxF-E7AHqJf04',
    authDomain:        'learning-embedded-linux.firebaseapp.com',
    projectId:         'learning-embedded-linux',
    storageBucket:     'learning-embedded-linux.firebasestorage.app',
    messagingSenderId: '774796208399',
    appId:             '1:774796208399:web:6286ca565311658049b67a'
  };

  var SDK  = 'https://www.gstatic.com/firebasejs/11.10.0/';
  var COLL = 'progress';
  var VER  = 1;          // v trong tài liệu, để sau này đổi cấu trúc còn biết đường
  var DEBOUNCE = 900;    // ms gộp nhiều thao tác liên tiếp thành một lần ghi
  var LOAD_TIMEOUT = 15000;

  /* Bản compat (namespaced) chứ không phải bản module: cả dự án là ES5 +
     IIFE, không bundler. Bản module bắt buộc `import`, tức là phải có
     <script type="module"> và một bước build — thứ CLAUDE.md §1 cấm. */
  var FILES = ['firebase-app-compat.js', 'firebase-firestore-compat.js'];

  var state    = 'off';   // off | connecting | live | error
  var lastErr  = '';
  var db       = null;
  var unsub    = null;    // huỷ onSnapshot
  var unwatch  = null;    // huỷ Store.onChange
  var timer    = null;    // debounce ghi lên
  var user     = '';
  var stateCbs = [];
  var remoteCbs = [];
  var loading  = null;    // Promise nạp SDK, dùng lại nếu bật/tắt nhiều lần
  var lastSig  = null;    // chữ ký dữ liệu vừa đồng bộ, để bỏ qua bản tin trùng

  function setState(s, err) {
    err = err || '';
    /* Không phát lại trạng thái y hệt: với includeMetadataChanges bật, mỗi
       lần ghi sinh ra vài bản tin liên tiếp, và mỗi lần phát lại sẽ vẽ lại
       hộp thoại — cướp luôn con trỏ đang nằm trong ô nhập tên. */
    if (s === state && err === lastErr) { return; }
    state = s;
    lastErr = err;
    for (var i = 0; i < stateCbs.length; i++) {
      try { stateCbs[i](s, lastErr); } catch (e) { console.error('[cloud]', e); }
    }
  }

  /* Chữ ký của phần dữ liệu thật (bỏ v và at). Dùng để nhận ra "bản tin này
     chính là thứ mình vừa đẩy lên" và không áp lại — áp lại thì vô hại về dữ
     liệu nhưng sẽ vẽ lại khối quiz người học đang nhìn. */
  function sign(d) {
    return JSON.stringify([d && d.done, d && d.quiz, d && d.ex]);
  }

  function fail(where, e) {
    var msg = (e && (e.message || e.code)) ? (e.code || e.message) : String(e || '');
    console.warn('[cloud] ' + where + ':', e);
    setState('error', msg);
  }

  /* ---------- Nạp SDK ---------- */

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.async = false;                 // giữ đúng thứ tự app → firestore
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Không tải được ' + url)); };
      document.head.appendChild(s);
    });
  }

  function loadSdk() {
    if (global.firebase && global.firebase.firestore) { return Promise.resolve(); }
    if (loading) { return loading; }

    loading = new Promise(function (resolve, reject) {
      var timeout = setTimeout(function () {
        reject(new Error('Hết thời gian chờ tải Firebase SDK'));
      }, LOAD_TIMEOUT);

      FILES.reduce(function (p, f) {
        return p.then(function () { return loadScript(SDK + f); });
      }, Promise.resolve()).then(function () {
        clearTimeout(timeout);
        resolve();
      }, function (e) {
        clearTimeout(timeout);
        reject(e);
      });
    });

    // Tải hỏng thì xoá cache promise, lần bấm "Thử lại" sau mới tải lại được
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* ---------- Đẩy lên ---------- */

  function push() {
    if (!db || !user) { return; }
    var snap = Store.snapshot();
    lastSig = sign(snap);
    db.collection(COLL).doc(user).set({
      v:    VER,
      at:   firebase.firestore.FieldValue.serverTimestamp(),
      done: snap.done,
      quiz: snap.quiz,
      ex:   snap.ex
    }).then(function () {
      if (state === 'error') { setState('live'); }
    }, function (e) { fail('ghi', e); });
  }

  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE);
  }

  /* ---------- Lắng nghe ---------- */

  /* includeMetadataChanges PHẢI bật. Firestore trả lời từ bộ nhớ đệm cục bộ
     trước, kể cả khi không hề nối được máy chủ — nếu chỉ nghe thay đổi dữ
     liệu thì máy mất mạng vẫn báo "Đang đồng bộ" màu xanh, một lời hứa sai.
     Với cờ này, mỗi lần `fromCache` lật là có bản tin, nên trạng thái hiển
     thị luôn đúng sự thật. Cái giá là nhiều bản tin trùng hơn — đã chặn bằng
     `lastSig` ở dưới và bộ lọc trùng trong setState(). */
  function listen() {
    unsub = db.collection(COLL).doc(user).onSnapshot(
      { includeMetadataChanges: true },
      function (snap) {
        var meta = snap.metadata;

        // Xanh chỉ khi máy chủ đã xác nhận. Còn nằm trong đệm = chưa nối được.
        setState(meta.fromCache ? 'connecting' : 'live');

        // Tiếng vọng của chính mình, chưa lên tới máy chủ
        if (meta.hasPendingWrites) { return; }
        // Dữ liệu đệm không phải sự thật từ máy chủ — không được áp đè
        if (meta.fromCache) { return; }

        if (!snap.exists) {
          // Lần đầu dùng tên này: tạo tài liệu từ trạng thái đang có trên máy
          push();
          return;
        }

        var data = snap.data();
        var sig = sign(data);
        if (sig === lastSig) { return; }   // chính là thứ mình vừa đẩy lên
        lastSig = sig;

        Store.applyRemote(data);
        for (var i = 0; i < remoteCbs.length; i++) {
          try { remoteCbs[i](); } catch (e) { console.error('[cloud]', e); }
        }
      },
      function (e) { fail('nghe', e); }
    );
  }

  /* ---------- API ---------- */

  var Cloud = {

    state: function () { return state; },
    error: function () { return lastErr; },
    user:  function () { return user; },

    onState:  function (fn) { stateCbs.push(fn); return fn; },
    onRemote: function (fn) { remoteCbs.push(fn); return fn; },

    /* Bật đồng bộ cho một tên. Trả về Promise chỉ để hộp thoại biết khi nào
       nên đóng — mọi lỗi đã được nuốt và chuyển thành trạng thái 'error'. */
    connect: function (name) {
      name = String(name || '').trim();
      if (!name) { return Promise.resolve(false); }

      this.disconnect(true);
      user = name;
      lastSig = null;
      Store.setUser(name);
      setState('connecting');

      return loadSdk().then(function () {
        if (!firebase.apps.length) { firebase.initializeApp(CONFIG); }
        db = firebase.firestore();
        listen();
        unwatch = Store.onChange(schedulePush);
        return true;
      }).catch(function (e) {
        fail('kết nối', e);
        return false;
      });
    },

    /* Ngắt đồng bộ. `keepName` = true khi đang đổi sang tên khác — lúc đó
       không được xoá tên đã lưu, connect() sẽ ghi tên mới ngay sau đó. */
    disconnect: function (keepName) {
      clearTimeout(timer);
      if (unsub)   { try { unsub(); }   catch (e) {} unsub = null; }
      if (unwatch) { try { unwatch(); } catch (e) {} unwatch = null; }
      db = null;
      user = '';
      lastSig = null;
      if (!keepName) {
        Store.clearUser();
        setState('off');
      }
    },

    /* Gọi một lần lúc khởi động: nối lại nếu lần trước đã nhập tên. */
    init: function () {
      var saved = Store.getUser();
      if (saved) { this.connect(saved); }
      else { setState('off'); }
    }
  };

  global.Cloud = Cloud;
})(window);

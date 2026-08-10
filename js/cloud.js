/* ============================================================
   CLOUD — Firebase Firestore là nơi lưu tiến độ, không phải bản sao.

   Từ 2026-08-10 file này không còn là "lớp phủ tuỳ chọn" nữa: js/store.js
   giữ tiến độ trong RAM và KHÔNG ghi xuống localStorage, nên chưa nối được
   máy chủ thì Store.ready() = false và giao diện khoá mọi nút ghi lại. Bài
   học vẫn đọc bình thường — mất mạng thì mất chỗ ghi tiến độ, không mất
   khoá học.

   Mô hình dữ liệu — CLAUDE.md §14.3, schema v3:

     progress/{username}          = { v, createdAt, updatedAt, by, done, quiz }
     progress/{username}/ex/{bt-NN} = { v, createdAt, updatedAt, by, items }

   Bài tập nằm ở tài liệu con vì câu trả lời tự luận của 70 bộ cộng lại có
   thể vượt trần 1 MiB của một document. Cả bộ sưu tập `ex` được đọc bằng
   MỘT truy vấn lúc kết nối, nên thanh tiến độ của mọi bộ đều đúng ngay,
   không cần tải lười từng trang.

   Ghi theo TỪNG TRƯỜNG (update + FieldPath), không ghi đè cả tài liệu. Đó
   là điều kiện để hoàn tác được từng thao tác: người học tick một bài rồi
   ghi hỏng thì chỉ đúng bài đó bật lại, phần còn lại không suy suyển.

   SDK được nạp MUỘN. Đặt hai thẻ <script> của Firebase vào index.html sẽ
   chặn lần vẽ đầu tiên khi offline — người chỉ muốn đọc bài phải chờ trình
   duyệt hết giờ kết nối trước khi thấy chữ nào.
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
  var SUB  = 'ex';

  /* Phiên bản hình dạng document. Firestore Rules ép ĐÚNG số này (d.v == 3),
     nên đổi ở đây mà quên deploy rules thì đồng bộ hỏng NGAY và kêu to bằng
     chấm đỏ + permission-denied — tốt hơn nhiều so với việc hai hình dạng
     lặng lẽ trộn vào nhau. CLAUDE.md §14.3. */
  var VER = 3;

  var LOAD_TIMEOUT  = 15000;   // ms chờ tải SDK
  var WRITE_TIMEOUT = 6000;    // ms chờ máy chủ xác nhận một lệnh ghi

  /* Bản compat (namespaced) chứ không phải bản module: cả dự án là ES5 +
     IIFE, không bundler. Bản module bắt buộc `import`, tức là phải có
     <script type="module"> và một bước build — thứ CLAUDE.md §1 cấm. */
  var FILES = ['firebase-app-compat.js', 'firebase-firestore-compat.js'];

  var state    = 'off';   // off | connecting | live | error
  var lastErr  = '';
  var db       = null;
  var unsub    = null;    // huỷ onSnapshot
  var user     = '';
  var stateCbs = [];
  var remoteCbs = [];
  var loading  = null;    // Promise nạp SDK, dùng lại nếu bật/tắt nhiều lần
  var lastSig  = null;    // chữ ký dữ liệu vừa nhận, để bỏ qua bản tin trùng
  var booted   = false;   // đã chạy xong ensureShape + tải ex cho phiên này chưa

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

  function fireRemote() {
    for (var i = 0; i < remoteCbs.length; i++) {
      try { remoteCbs[i](); } catch (e) { console.error('[cloud]', e); }
    }
  }

  /* Chữ ký của phần dữ liệu thật — cố tình bỏ v/createdAt/updatedAt/by. Nếu
     tính cả updatedAt thì mọi bản tin đều khác nhau và phép chống trùng trở
     nên vô dụng. Dùng để nhận ra "bản tin này đúng bằng thứ đang hiển thị"
     và không vẽ lại — vẽ lại thì vô hại về dữ liệu nhưng sẽ dựng lại khối
     quiz mà người học đang đọc dở. */
  function sign(d) {
    return JSON.stringify([d && d.done, d && d.quiz]);
  }

  function fail(where, e) {
    var msg = (e && (e.message || e.code)) ? (e.code || e.message) : String(e || '');
    console.warn('[cloud] ' + where + ':', e);
    setState('error', msg);
    return msg;
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

  /* ---------- Hết giờ ----------
     Bắt buộc phải có. Khi mất mạng, Firestore KHÔNG từ chối lệnh ghi: nó xếp
     vào hàng đợi cục bộ và promise của set()/update() nằm chờ vô hạn cho tới
     lúc nối lại được. Không có đồng hồ đếm ngược này thì "ghi hỏng thì hoàn
     tác" không bao giờ chạy — người học bấm xong, không thấy lỗi, và tưởng
     là đã lưu.

     Hệ quả đã biết, và chấp nhận: nếu mạng chỉ chậm hơn 6 giây chứ không
     chết, lệnh ghi vẫn tới nơi sau khi trang đã hoàn tác. Bản tin onSnapshot
     kế tiếp mang giá trị từ máy chủ về và sửa lại màn hình. Máy chủ vẫn là
     nguồn sự thật ở mọi thời điểm, chỉ có đường đi tới đó là xấu. */
  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        reject(new Error('Máy chủ không phản hồi trong ' + Math.round(ms / 1000) + ' giây'));
      }, ms);
      p.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  /* ---------- Ghi ---------- */

  function docRef()          { return db.collection(COLL).doc(user); }
  function exRef(exId)       { return docRef().collection(SUB).doc(exId); }

  /* Dựng FieldPath từ mảng đoạn đường dẫn. Phải đi qua FieldPath chứ không
     nối chuỗi "done.bai-01": id bài có dấu gạch ngang, mà field path dạng
     chuỗi chỉ chấp nhận [A-Za-z_][A-Za-z0-9_]* cho mỗi đoạn nếu không bọc
     backtick. Dựng thẳng thì không phải phụ thuộc vào quy tắc trích dẫn. */
  function fp(segs) {
    var F = firebase.firestore.FieldPath;
    if (segs.length === 1) { return new F(segs[0]); }
    if (segs.length === 2) { return new F(segs[0], segs[1]); }
    return new F(segs[0], segs[1], segs[2]);
  }

  function stamp() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* ops -> danh sách tham số của update(). Mỗi lệnh ghi đều kèm updatedAt
     (Rules ép nó == request.time) và `by` (id máy đã ghi). */
  function updateArgs(ops) {
    var args = [];
    ops.forEach(function (o) {
      args.push(fp(o.p), o.v === Store.DEL ? firebase.firestore.FieldValue.delete() : o.v);
    });
    args.push(fp(['updatedAt']), stamp());
    args.push(fp(['by']), Store.deviceId());
    return args;
  }

  /* Hàm ghi mà Store gọi. exId = null nghĩa là tài liệu tiến độ chính.
     Trả về Promise: resolve = máy chủ đã nhận, reject = Store hoàn tác. */
  function write(exId, ops) {
    if (!db || !user) { return Promise.reject(new Error('Chưa kết nối máy chủ')); }

    var ref = exId ? exRef(exId) : docRef();
    var p = ref.update.apply(ref, updateArgs(ops));

    /* Tài liệu con của một bộ bài tập chỉ ra đời khi người học làm câu đầu
       tiên, nên update() gặp not-found là chuyện bình thường chứ không phải
       lỗi — tạo mới bằng cả hình dạng rồi thôi. */
    if (exId) {
      p = p.catch(function (e) {
        if (!e || e.code !== 'not-found') { throw e; }
        return exRef(exId).set({
          v: VER,
          createdAt: stamp(),
          updatedAt: stamp(),
          by: Store.deviceId(),
          items: Store.getEx(exId)
        });
      });
    }

    return withTimeout(p, WRITE_TIMEOUT).then(function () {
      if (state === 'error') { setState('live'); }
    }, function (e) {
      fail('ghi', e);
      throw e;
    });
  }

  /* ---------- Dựng đúng hình dạng tài liệu ----------
     Chạy một lần mỗi phiên, ngay sau bản tin đầu tiên từ máy chủ. Ba việc:
     tạo tài liệu nếu chưa có, nâng cấp nếu nó còn ở schema cũ, và giữ lại
     dữ liệu đang có. Phải làm trước mọi lệnh ghi từng trường, vì update()
     trên tài liệu không tồn tại sẽ hỏng, và Rules ghim v == 3 nên một tài
     liệu v1/v2 sẽ chặn mọi lần ghi cho tới khi được viết lại cho đúng. */
  function ensureShape(snap) {
    var d = snap.exists ? (snap.data() || {}) : null;
    if (d && d.v === VER) { return Promise.resolve(d); }

    /* Chưa có tài liệu: lấy nốt những gì còn sót lại ở localStorage của kiến
       trúc cũ làm hạt giống, thay vì tạo một tài liệu rỗng rồi xoá trắng
       tiến độ mà người học đã có. */
    var seed = d || Store.legacy();
    var body = {
      v: VER,
      createdAt: (d && d.createdAt) || stamp(),
      updatedAt: stamp(),
      by: Store.deviceId(),
      done: (seed.done && typeof seed.done === 'object') ? seed.done : {},
      quiz: (seed.quiz && typeof seed.quiz === 'object') ? seed.quiz : {}
    };

    return withTimeout(docRef().set(body), WRITE_TIMEOUT).then(function () {
      return body;
    });
  }

  /* ---------- Đọc toàn bộ bài tập ----------
     MỘT truy vấn cho cả bộ sưu tập, không phải 70 lần đọc từng bộ. Thanh
     tiến độ ở sidebar và trang #/bai-tap cần con số của mọi bộ ngay khi
     trang mở, nên tải lười từng trang sẽ khiến chúng hiện 0 rồi tự nhảy.

     `source: 'server'` là cố ý: Firestore trả lời từ bộ nhớ đệm trước, và
     dữ liệu đệm thì không phải sự thật — xem CLAUDE.md §14.6. */
  function loadEx() {
    return withTimeout(
      docRef().collection(SUB).get({ source: 'server' }),
      WRITE_TIMEOUT
    ).then(function (qs) {
      var map = {};
      qs.forEach(function (doc) {
        var v = doc.data() || {};
        map[doc.id] = (v.items && typeof v.items === 'object') ? v.items : {};
      });
      return map;
    });
  }

  /* ---------- Chuyển dữ liệu cũ lên máy chủ ----------
     Trước 2026-08-10, câu trả lời bài tập CHỈ nằm ở localStorage — nó chưa
     bao giờ được đồng bộ. Xoá thẳng localStorage sẽ xoá luôn công sức đó,
     nên đẩy lên trước, và chỉ đẩy những bộ mà máy chủ chưa hề có. */
  function migrateEx(remote) {
    var old = Store.legacy().ex;
    var ids = Object.keys(old).filter(function (id) {
      return Object.keys(old[id] || {}).length && !remote[id];
    });
    if (!ids.length) { return Promise.resolve(remote); }

    console.log('[cloud] Chuyển ' + ids.length + ' bộ bài tập từ máy lên máy chủ.');
    return Promise.all(ids.map(function (id) {
      return exRef(id).set({
        v: VER,
        createdAt: stamp(),
        updatedAt: stamp(),
        by: Store.deviceId(),
        items: old[id]
      }).then(function () { remote[id] = old[id]; });
    })).then(function () { return remote; });
  }

  /* ---------- Lắng nghe ---------- */

  /* includeMetadataChanges PHẢI bật. Firestore trả lời từ bộ nhớ đệm cục bộ
     trước, kể cả khi không hề nối được máy chủ — nếu chỉ nghe thay đổi dữ
     liệu thì máy mất mạng vẫn báo "Đang đồng bộ" màu xanh, một lời hứa sai.
     Với cờ này, mỗi lần `fromCache` lật là có bản tin, nên trạng thái hiển
     thị luôn đúng sự thật. CLAUDE.md §14.6. */
  function listen() {
    var mine = user;

    unsub = docRef().onSnapshot(
      { includeMetadataChanges: true },
      function (snap) {
        if (mine !== user) { return; }          // đã đổi tên giữa chừng
        var meta = snap.metadata;

        /* Tiếng vọng của lệnh ghi vừa gửi, chưa lên tới máy chủ. Bỏ qua
           TRƯỚC phép kiểm fromCache: một bản tin đang chờ xác nhận luôn
           mang fromCache = true, nên xét ngược thứ tự sẽ khiến chấm trạng
           thái nháy vàng mỗi lần người học tick một bài. */
        if (meta.hasPendingWrites) { return; }

        // Xanh chỉ khi máy chủ đã xác nhận. Còn nằm trong đệm = chưa nối được.
        if (meta.fromCache) { setState('connecting'); return; }

        if (!booted) {
          booted = true;
          ensureShape(snap)
            .then(function (d) {
              Store.applyRemote(d);
              lastSig = sign(d);
              return loadEx().then(migrateEx);
            })
            .then(function (map) {
              if (mine !== user) { return; }
              Store.applyRemoteEx(map);
              Store.setReady(true);
              Store.dropLegacy();
              setState('live');
              fireRemote();
            })
            .catch(function (e) {
              booted = false;                    // bản tin sau được thử lại
              fail('khởi tạo', e);
            });
          return;
        }

        var d = snap.data() || {};
        setState('live');

        var sig = sign(d);
        if (sig === lastSig) { return; }         // đúng bằng thứ đang hiển thị
        lastSig = sig;

        Store.applyRemote(d);
        fireRemote();
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
      booted = false;
      Store.setUser(name);
      setState('connecting');

      return loadSdk().then(function () {
        if (!firebase.apps.length) { firebase.initializeApp(CONFIG); }
        db = firebase.firestore();
        Store.setWriter(write);
        listen();
        return true;
      }).catch(function (e) {
        fail('kết nối', e);
        return false;
      });
    },

    /* Ngắt đồng bộ. `keepName` = true khi đang đổi sang tên khác — lúc đó
       không được xoá tên đã lưu, connect() sẽ ghi tên mới ngay sau đó.

       Ngắt là MẤT dữ liệu trên màn hình, không phải chỉ tắt một tính năng:
       tiến độ chỉ nằm trong RAM và thuộc về tài liệu của tên vừa ngắt. */
    disconnect: function (keepName) {
      if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
      db = null;
      user = '';
      lastSig = null;
      booted = false;
      Store.setWriter(null);
      Store.setReady(false);
      Store.applyRemote({});
      Store.applyRemoteEx({});
      if (!keepName) {
        Store.clearUser();
        setState('off');
      }
      fireRemote();          // giao diện phải khoá lại và bỏ mọi con số cũ
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

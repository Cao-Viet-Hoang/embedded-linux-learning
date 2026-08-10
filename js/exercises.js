/* ============================================================
   EXERCISES — kho bộ bài tập và phép tính tiến độ riêng của chúng.

   Quan hệ 1–1 với bài học: bai-NN  ↔  bt-NN. Mỗi bộ nằm trong một file
   exercises/bt-NN.js và tự đăng ký qua Exercise.register().

   File này KHÔNG biết gì về DOM và cũng không dựng HTML — đó là việc của
   js/render-ex.js. Ở đây chỉ có: kho dữ liệu, ánh xạ id, và câu trả lời
   cho đúng một câu hỏi — "câu này đã trả lời chưa".

   Tiến độ bài tập tách hẳn khỏi tiến độ bài học (CLAUDE.md §13.1): vòng
   tròn trên thanh trên vẫn chỉ đếm 70 bài, không bao giờ bị bài tập kéo
   xuống, và không bao giờ tự bỏ tick một bài người học đã đánh dấu xong.
   ============================================================ */
(function (global) {
  'use strict';

  var SETS = {};

  /* Sáu phần cố định của MỌI bộ bài tập (CLAUDE.md §13.2).
     Khai báo ở đây chứ không ở từng file bt-NN.js: cấu trúc là bất biến của
     cả khoá học, file nội dung chỉ được điền câu hỏi vào chỗ đã có sẵn. */
  var PARTS = [
    { k: 'A', name: 'Nhận biết',  pass: 1,
      desc: 'Gọi lại thuật ngữ và con số. Mỗi câu dưới 60 giây — mục tiêu là gặp lại nhiều lần, không phải là khó.' },
    { k: 'B', name: 'Thông hiểu', pass: 1,
      desc: 'Giải thích cơ chế bằng lời của bạn. Đây là chỗ ảo giác "đọc hiểu rồi" sụp đổ.' },
    { k: 'C', name: 'Vận dụng',   pass: 2,
      desc: 'Tình huống có ràng buộc, không có trong bài. Bạn phải quyết định, không phải nhớ lại.' },
    { k: 'D', name: 'Ôn xen kẽ',  pass: 2,
      desc: 'Câu hỏi về những bài TRƯỚC mà bài này đứng lên. Chống quên rẻ nhất trong cả khoá.' },
    { k: 'E', name: 'Thực hành',  pass: 2,
      desc: 'Gõ, dự đoán, sửa lỗi. Dự đoán trước rồi mới chạy — khoảng cách giữa hai thứ đó là chỗ học được nhiều nhất.' },
    { k: 'F', name: 'Bí ở đâu thì đọc lại đâu', pass: 0,
      desc: 'Không phải câu hỏi. Là bảng tra: sai câu nào thì đọc lại mục nào.' }
  ];

  /* Nhãn hiển thị của 12 kiểu câu hỏi trong §13.2. Kiểu (`k`) quyết định
     CÁCH CHẤM, nhãn (`tag`) nói cho người học biết ĐANG LUYỆN GÌ. */
  var KINDS = ['mcq', 'tf', 'fill', 'match', 'multi', 'num', 'free'];

  function idFor(lessonId)  { return String(lessonId).replace(/^bai-/, 'bt-'); }
  function lessonOf(exId)   { return String(exId).replace(/^bt-/, 'bai-'); }

  /* Mọi câu hỏi của một bộ, phẳng, đúng thứ tự đọc. Mỗi câu được gắn thêm
     `part` và `no` (A1, B2, …) để bảng tra ở phần F trỏ tới được. */
  function items(d) {
    var out = [];
    if (!d) { return out; }
    PARTS.forEach(function (p) {
      (d[p.k] || []).forEach(function (it, i) {
        out.push({ it: it, part: p.k, no: p.k + (i + 1) });
      });
    });
    return out;
  }

  /* Đã trả lời chưa — định nghĩa theo TỪNG BỀ MẶT NHẬP LIỆU của câu hỏi,
     không phải theo "đúng hay sai". Bài tập tự chấm thì đúng/sai là việc
     của người học; thanh tiến độ chỉ đo mức độ đã làm. */
  function isAnswered(item, st) {
    if (!st) { return false; }
    switch (item.k) {
      case 'mcq':                    return st.p !== undefined && st.p !== null;
      case 'tf':                     return st.p !== undefined && st.p !== null &&
                                            !!String(st.txt || '').trim();
      case 'multi':
      case 'fill':
      case 'num':
      case 'match':                  return st.ok !== undefined && st.ok !== null;
      case 'free':                   return !!String(st.txt || '').trim();
      default:                       return false;
    }
  }

  /* Số ý tự chấm đã tick / tổng số tiêu chí, cộng dồn cả bộ. Phần F dùng
     con số này để nói "bí ở đâu"; thanh tiến độ thì không. */
  function selfScore(exId) {
    var d = SETS[exId];
    if (!d) { return { got: 0, max: 0 }; }
    var state = Store.getEx(exId), got = 0, max = 0;
    items(d).forEach(function (e) {
      var crit = e.it.crit;
      if (!crit || !crit.length) { return; }
      max += crit.length;
      var st = state[e.it.id];
      if (st && st.ck) { got += st.ck.length; }
    });
    return { got: got, max: max };
  }

  function stats(exId) {
    var d = SETS[exId];
    if (!d) { return { total: 0, done: 0, pct: 0 }; }
    var state = Store.getEx(exId);
    var list = items(d);
    var done = 0;
    list.forEach(function (e) {
      if (isAnswered(e.it, state[e.it.id])) { done++; }
    });
    return {
      total: list.length,
      done: done,
      pct: list.length ? Math.round(done / list.length * 100) : 0
    };
  }

  var Exercise = {
    PARTS: PARTS,
    KINDS: KINDS,

    register: function (d) {
      if (!d || !d.id) {
        console.error('[exercises] Bộ bài tập thiếu id:', d);
        return;
      }
      if (SETS[d.id]) {
        console.warn('[exercises] Bộ "' + d.id + '" bị đăng ký trùng, bản sau ghi đè bản trước.');
      }
      SETS[d.id] = d;
    },

    get: function (id) { return SETS[id] || null; },
    has: function (id) { return !!SETS[id]; },
    all: function () { return SETS; },

    idFor: idFor,
    lessonOf: lessonOf,
    items: items,

    /* Một câu kèm vị trí của nó (part + số hiệu A1/B2…). js/app.js cần đúng
       thứ này để dựng lại một câu khi lệnh ghi bị máy chủ từ chối. */
    entryOf: function (exId, itemId) {
      var found = null;
      items(SETS[exId]).forEach(function (e) {
        if (e.it.id === itemId) { found = e; }
      });
      return found;
    },

    isAnswered: isAnswered,
    stats: stats,
    selfScore: selfScore,

    /* Bộ nào đã viết, kèm meta của bài học tương ứng — dùng cho trang #/bai-tap */
    ready: function () {
      return Course.flat
        .map(function (meta) {
          var exId = idFor(meta.id);
          return SETS[exId] ? { exId: exId, lesson: meta } : null;
        })
        .filter(Boolean);
    },

    /* Tổng của mọi bộ đã viết. Đây là con số cho thanh tiến độ RIÊNG của
       bài tập — nó không đụng gì tới vòng tròn 70 bài trên thanh trên. */
    totals: function () {
      var total = 0, done = 0, sets = 0, setsDone = 0;
      this.ready().forEach(function (r) {
        var s = stats(r.exId);
        total += s.total; done += s.done; sets++;
        if (s.total && s.done === s.total) { setsDone++; }
      });
      return {
        total: total, done: done, sets: sets, setsDone: setsDone,
        pct: total ? Math.round(done / total * 100) : 0
      };
    }
  };

  global.Exercise = Exercise;
})(window);

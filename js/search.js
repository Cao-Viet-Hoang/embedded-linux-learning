/* ============================================================
   SEARCH — tìm kiếm trên toàn bộ bài học đã đăng ký.

   Chỉ mục được dựng một lần khi khởi động, từ chính dữ liệu block
   của các bài. Vì mọi bài đều nằm sẵn trong bộ nhớ nên không cần
   gọi mạng — chạy tốt cả khi mở bằng file:// .
   ============================================================ */
(function (global) {
  'use strict';

  /* Gỡ thẻ HTML và gom khoảng trắng */
  function plain(html) {
    return String(html == null ? '' : html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Bỏ dấu để "kernel" tìm được cả khi gõ "kernel", và
     "tiến trình" tìm được khi gõ "tien trinh" */
  function fold(s) {
    return String(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /* Rút toàn bộ văn bản từ một mảng block */
  function textOf(blocks, out) {
    out = out || [];
    (blocks || []).forEach(function (b) {
      if (!b || !b.t) { return; }
      switch (b.t) {
        case 'h2': case 'h3': case 'h4': case 'p': case 'html':
          out.push(plain(b.x)); break;
        case 'list': case 'recap':
          (b.items || []).forEach(function (i) { out.push(plain(i)); }); break;
        case 'code':
          out.push(plain(b.code));
          (b.notes || []).forEach(function (n) { out.push(n[0] + ' ' + plain(n[1])); });
          break;
        case 'cmdx':
          out.push(plain(b.cmd));
          (b.rows || []).forEach(function (r) { out.push(plain(r[0]) + ' ' + plain(r[1])); });
          break;
        case 'cal':
          out.push(plain(b.title) + ' ' + plain(b.x)); break;
        case 'table':
          (b.head || []).forEach(function (h) { out.push(plain(h)); });
          (b.rows || []).forEach(function (r) { r.forEach(function (c) { out.push(plain(c)); }); });
          break;
        case 'steps':
          (b.items || []).forEach(function (s) {
            out.push(plain(s.title));
            textOf(s.blocks || [], out);
          });
          break;
        case 'terms':
          (b.items || []).forEach(function (t) { out.push(plain(t[0]) + ' ' + plain(t[2])); }); break;
        case 'fig':
          if (b.cap) { out.push(plain(b.cap)); } break;
      }
    });
    return out;
  }

  var index = [];

  function build() {
    index = [];
    Course.flat.forEach(function (meta) {
      var data = Lesson.get(meta.id);
      if (!data) { return; }

      var parts = [];
      parts.push(plain(data.title));
      if (data.intro) { parts.push(plain(data.intro)); }
      (data.goals || []).forEach(function (g) { parts.push(plain(g)); });
      textOf(data.blocks || [], parts);
      (data.quiz || []).forEach(function (q) { parts.push(plain(q.q)); });

      var body = parts.join(' · ');
      index.push({
        id: meta.id,
        n: meta.n,
        title: data.title,
        module: meta.moduleName,
        body: body,
        fTitle: fold(data.title),
        fBody: fold(body)
      });
    });
    return index.length;
  }

  /* Tạo đoạn trích quanh vị trí khớp, có bôi vàng từ khoá */
  function snippet(entry, q) {
    var pos = entry.fBody.indexOf(q);
    if (pos < 0) { return entry.body.slice(0, 130) + '…'; }

    var from = Math.max(0, pos - 55);
    var to = Math.min(entry.body.length, pos + q.length + 90);
    var raw = (from > 0 ? '…' : '') + entry.body.slice(from, to) + (to < entry.body.length ? '…' : '');

    // Bôi vàng trên bản đã bỏ dấu để vị trí luôn khớp
    var fRaw = fold(raw);
    var at = fRaw.indexOf(q);
    if (at < 0) { return Render.esc(raw); }

    return Render.esc(raw.slice(0, at)) +
           '<mark>' + Render.esc(raw.slice(at, at + q.length)) + '</mark>' +
           Render.esc(raw.slice(at + q.length));
  }

  function query(term, limit) {
    var q = fold(String(term || '').trim());
    if (q.length < 2) { return []; }

    var hits = [];
    index.forEach(function (e) {
      var score = 0;
      var ti = e.fTitle.indexOf(q);
      if (ti === 0)      { score += 100; }
      else if (ti > 0)   { score += 60; }

      var bi = e.fBody.indexOf(q);
      if (bi >= 0) {
        score += 20;
        // càng nhiều lần xuất hiện càng liên quan, nhưng có trần
        var count = e.fBody.split(q).length - 1;
        score += Math.min(count, 8) * 2;
      }

      if (score > 0) {
        hits.push({ entry: e, score: score, snip: snippet(e, q) });
      }
    });

    hits.sort(function (a, b) {
      return b.score - a.score || a.entry.n - b.entry.n;
    });
    return hits.slice(0, limit || 8);
  }

  global.Search = {
    build: build,
    query: query,
    fold: fold,
    plain: plain,
    size: function () { return index.length; }
  };
})(window);

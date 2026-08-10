/* ============================================================
   RENDER-EX — biến dữ liệu một bộ bài tập thành HTML.

   Song song với js/render.js và cùng một triết lý: nội dung là DỮ LIỆU,
   không bao giờ là HTML viết tay. Mọi bộ bài tập đi qua đúng bộ hàm này
   nên 70 bộ không thể lệch style của nhau.

   Bảy kiểu chấm (`k`), phủ 12 kiểu câu hỏi trong CLAUDE.md §13.2:

     mcq    một đáp án đúng            — máy chấm
     tf     đúng/sai KÈM viết lại      — máy chấm nửa đầu, tự chấm nửa sau
     multi  chọn nhiều đáp án          — máy chấm
     fill   điền khuyết                — máy chấm (bỏ dấu, bỏ hoa/thường)
     num    một con số                 — máy chấm (có sai số cho phép)
     match  ghép nối                   — máy chấm từng cặp
     free   tự luận                    — CHỐT → ĐỐI CHIẾU → TỰ CHẤM

   Ổ khoá của `free` là thứ quan trọng nhất trong file này: hai nút
   "Tiêu chí tự chấm" và "Lời giải" bị khoá tới khi ô nhập có chữ. Không có
   ổ khoá đó, người học đọc lời giải rồi nghĩ "ừ ý tôi cũng thế" và cả bài
   tập mất sạch giá trị (CLAUDE.md §13.5).
   ============================================================ */
(function (global) {
  'use strict';

  var esc = Render.esc;
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }

  var LETTER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /* ══════════ Chuẩn hoá + chấm tự động ══════════ */

  /* Bỏ dấu, bỏ hoa/thường, gom khoảng trắng, bỏ dấu câu ở hai đầu.
     Người học gõ "MMU." hay "mmu" hay "M M U" đều phải được tính đúng —
     một lần chấm sai oan là mất niềm tin vào mọi lần chấm sau. */
  function normText(s) {
    return Search.fold(String(s == null ? '' : s))
      .replace(/[.,;:!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Bỏ dấu phân cách hàng nghìn (cả "." kiểu Việt lẫn "," kiểu Anh và
     khoảng trắng), rồi đọc thành số. */
  function normNum(s) {
    var t = String(s == null ? '' : s).replace(/[\s._,]/g, '').replace(/[^0-9eE+-]/g, '');
    var n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  function gradeFill(item, v) {
    var got = normText(v);
    if (!got) { return false; }
    return (item.a || []).some(function (want) { return normText(want) === got; });
  }

  function gradeNum(item, v) {
    var n = normNum(v);
    if (n === null) { return false; }
    return Math.abs(n - item.a) <= (item.tol || 0);
  }

  /* Trả về mảng đúng/sai theo từng dòng, để người học thấy mình sai cặp nào
     chứ không chỉ thấy "sai". */
  function gradeMatch(item, m) {
    return (item.a || []).map(function (want, i) {
      return m && m[i] !== null && m[i] !== undefined && Number(m[i]) === want;
    });
  }

  function gradeMulti(item, sel) {
    var want = (item.a || []).slice().sort().join(',');
    var got = (sel || []).slice().sort().join(',');
    return want === got && want !== '';
  }

  /* ══════════ Mảnh dùng lại ══════════ */

  function optButtons(opts, itemId, picked, right, wrong) {
    return opts.map(function (o, oi) {
      var cls = 'q__opt';
      if (right && right.indexOf(oi) >= 0) { cls += ' is-right'; }
      if (wrong && wrong.indexOf(oi) >= 0) { cls += ' is-wrong'; }
      if (picked && picked.indexOf(oi) >= 0 && !right && !wrong) { cls += ' is-sel'; }
      return '<button type="button" class="' + cls + '" data-opt="' + oi + '"' +
               (right ? ' disabled' : '') + '>' +
               '<span class="q__letter">' + LETTER[oi] + '</span><span>' + o + '</span>' +
             '</button>';
    }).join('');
  }

  function whyBox(item, open, verdict) {
    return '<div class="q__why" data-why' + (open ? '' : ' hidden') + '>' +
             '<b data-verdict>' + (verdict || '') + '</b>' + (item.why || '') +
           '</div>';
  }

  function checkBtn() {
    return '<button class="btn btn--sm" type="button" data-act="check">' +
             ICON('check') + 'Kiểm tra' +
           '</button>';
  }

  /* Khối "chốt câu trả lời" — dùng cho cả `free` và nửa sau của `tf`. */
  function freeBody(item, st, opts) {
    opts = opts || {};
    var txt = String((st && st.txt) || '');
    var locked = !txt.trim();
    var crit = item.crit || [];
    var ck = (st && st.ck) || [];

    var critRows = crit.map(function (c, i) {
      return '<label class="exck' + (ck.indexOf(i) >= 0 ? ' is-on' : '') + '">' +
               '<input type="checkbox" data-ck="' + i + '"' +
                 (ck.indexOf(i) >= 0 ? ' checked' : '') + '>' +
               '<span>' + c + '</span>' +
             '</label>';
    }).join('');

    var solInner = item.sol || '';
    if (item.solBlocks) { solInner += Render.blocks(item.solBlocks, { toc: [] }); }

    return '<div class="exf">' +
      (opts.label ? '<div class="exf__lbl">' + opts.label + '</div>' : '') +
      '<textarea class="exf__ta" data-ta rows="' + (opts.rows || 4) + '" ' +
        'placeholder="' + attr(opts.ph || 'Viết câu trả lời của bạn vào đây…') + '" ' +
        'spellcheck="false">' + esc(txt) + '</textarea>' +

      '<div class="exf__acts">' +
        (item.hint
          ? '<button class="btn btn--sm" type="button" data-act="hint">' +
              ICON('lightbulb') + 'Gợi ý</button>'
          : '') +
        '<button class="btn btn--sm" type="button" data-act="crit"' + (locked ? ' disabled' : '') + '>' +
          ICON('listChecks') + 'Tiêu chí tự chấm</button>' +
        (solInner
          ? '<button class="btn btn--sm" type="button" data-act="sol"' + (locked ? ' disabled' : '') + '>' +
              ICON('help') + 'Lời giải</button>'
          : '') +
        '<span class="exf__score" data-score>' +
          (crit.length ? ck.length + '/' + crit.length + ' ý' : '') +
        '</span>' +
        /* Ô tự luận là chỗ DUY NHẤT không hoàn tác khi ghi hỏng: trả ô về
           nội dung đã lưu lần cuối nghĩa là xoá luôn đoạn người học vừa
           viết. Thay vào đó nói thẳng đã lưu hay chưa và để họ quyết định. */
        '<span class="exf__save" data-save></span>' +
      '</div>' +

      '<div class="exf__lock" data-lock' + (locked ? '' : ' hidden') + '>' +
        ICON('bookmark') + 'Viết câu trả lời của bạn trước đã. Đọc lời giải khi chưa tự viết ' +
        'thì bộ não luôn kết luận “ý mình cũng thế” — và bài tập này mất sạch tác dụng.' +
      '</div>' +

      (crit.length
        ? '<div class="exf__panel" data-panel="crit" hidden>' +
            '<div class="exf__panelT">' + ICON('listChecks') +
              'Tick những ý mà câu trả lời bạn vừa viết THỰC SỰ có. Không tick ý bạn chỉ “nghĩ tới”.' +
            '</div>' + critRows +
          '</div>'
        : '') +

      (solInner
        ? '<div class="exf__panel" data-panel="sol" hidden>' +
            '<div class="exf__panelT">' + ICON('help') + 'Lời giải tham khảo</div>' +
            solInner +
          '</div>'
        : '') +

      (item.hint
        ? '<div class="exf__panel" data-panel="hint" hidden>' +
            '<div class="exf__panelT">' + ICON('lightbulb') + 'Gợi ý</div>' + item.hint +
          '</div>'
        : '') +
    '</div>';
  }

  /* ══════════ Bộ dựng theo từng kiểu chấm ══════════ */

  var K = {};

  K.mcq = function (item, st) {
    var picked = st && st.p !== undefined && st.p !== null ? st.p : null;
    var answered = picked !== null;
    return '<div class="q__opts">' +
             optButtons(item.opts, item.id,
               null,
               answered ? [item.a] : null,
               answered && picked !== item.a ? [picked] : null) +
           '</div>' +
           whyBox(item, answered, answered ? (picked === item.a ? 'Chính xác. ' : 'Chưa đúng. ') : '');
  };

  K.tf = function (item, st) {
    var picked = st && st.p !== undefined && st.p !== null ? st.p : null;
    var answered = picked !== null;
    var opts = ['Đúng', 'Sai'];
    return '<div class="q__opts q__opts--tf">' +
             optButtons(opts, item.id, null,
               answered ? [item.a] : null,
               answered && picked !== item.a ? [picked] : null) +
           '</div>' +
           whyBox(item, answered, answered ? (picked === item.a ? 'Chính xác. ' : 'Chưa đúng. ') : '') +
           freeBody(item, st, {
             label: item.rw || 'Viết lại phát biểu cho đúng, bằng lời của bạn:',
             rows: 3,
             ph: 'Phát biểu đúng là…'
           });
  };

  K.multi = function (item, st) {
    var sel = (st && st.sel) || [];
    var checked = st && st.ok !== undefined && st.ok !== null;
    var right = null, wrong = null;
    if (checked) {
      right = item.a;
      wrong = sel.filter(function (i) { return item.a.indexOf(i) < 0; });
    }
    return '<div class="q__opts" data-multi>' +
             optButtons(item.opts, item.id, sel, right, wrong) +
           '</div>' +
           '<div class="exact">' + checkBtn() +
             '<span class="exact__hint">Chọn tất cả phương án đúng rồi bấm Kiểm tra.</span>' +
           '</div>' +
           whyBox(item, checked, checked ? (st.ok ? 'Chính xác. ' : 'Chưa đủ/đúng. ') : '');
  };

  K.fill = function (item, st) {
    var v = (st && st.v) || '';
    var checked = st && st.ok !== undefined && st.ok !== null;
    return '<div class="exin' + (checked ? (st.ok ? ' is-right' : ' is-wrong') : '') + '">' +
             '<input class="exin__i" type="text" data-in value="' + attr(v) + '" ' +
               'placeholder="' + attr(item.ph || 'Điền vào đây') + '" ' +
               'autocomplete="off" spellcheck="false">' +
             checkBtn() +
           '</div>' +
           whyBox(item, checked, checked ? (st.ok ? 'Chính xác. ' : 'Chưa đúng. ') : '');
  };

  K.num = function (item, st) {
    var v = (st && st.v) || '';
    var checked = st && st.ok !== undefined && st.ok !== null;
    return '<div class="exin' + (checked ? (st.ok ? ' is-right' : ' is-wrong') : '') + '">' +
             '<input class="exin__i exin__i--num" type="text" inputmode="numeric" data-in ' +
               'value="' + attr(v) + '" placeholder="0" autocomplete="off">' +
             (item.unit ? '<span class="exin__u">' + esc(item.unit) + '</span>' : '') +
             checkBtn() +
           '</div>' +
           whyBox(item, checked, checked ? (st.ok ? 'Chính xác. ' : 'Chưa đúng. ') : '');
  };

  K.match = function (item, st) {
    var m = (st && st.m) || [];
    var checked = st && st.ok !== undefined && st.ok !== null;
    var marks = checked ? gradeMatch(item, m) : null;

    var options = item.right.map(function (r, i) {
      return '<option value="' + i + '">' + LETTER[i] + '. ' + esc(Search.plain(r)) + '</option>';
    }).join('');

    var rows = item.left.map(function (l, i) {
      var cur = (m[i] === undefined || m[i] === null) ? '' : String(m[i]);
      var cls = 'exm__row';
      if (checked) { cls += marks[i] ? ' is-right' : ' is-wrong'; }
      var fix = (checked && !marks[i])
        ? '<span class="exm__fix">đúng là <b>' + LETTER[item.a[i]] + '</b></span>'
        : '';
      return '<div class="' + cls + '" data-row="' + i + '">' +
               '<span class="exm__l">' + l + '</span>' +
               '<span class="exm__pick">' +
                 '<select class="exm__s" data-sel="' + i + '"' + (checked ? ' disabled' : '') + '>' +
                   '<option value="">— chọn —</option>' + options +
                 '</select>' + fix +
               '</span>' +
             '</div>';
    }).join('');

    var legend = item.right.map(function (r, i) {
      return '<li><b>' + LETTER[i] + '.</b> ' + r + '</li>';
    }).join('');

    return '<div class="exm">' + rows + '</div>' +
           '<ul class="exm__legend">' + legend + '</ul>' +
           '<div class="exact">' + checkBtn() + '</div>' +
           whyBox(item, checked, checked ? (st.ok ? 'Chính xác. ' : 'Chưa đúng. ') : '');
  };

  K.free = function (item, st) {
    return freeBody(item, st, { rows: item.rows || 4, ph: item.ph });
  };

  /* ══════════ Một câu hỏi ══════════ */

  function itemHtml(entry, data, state) {
    var item = entry.it;
    var st = state[item.id];
    var build = K[item.k];
    if (!build) {
      console.warn('[render-ex] Không biết kiểu câu hỏi:', item.k);
      return '';
    }

    var truc = (item.truc !== undefined && data.truc && data.truc[item.truc])
      ? '<span class="exi__truc" title="Trục xoáy: khái niệm cốt lõi được hỏi ba lần, mỗi lần một kiểu tư duy khác">' +
          ICON('target') + esc(data.truc[item.truc].name) +
        '</span>'
      : '';

    var pre = item.blocks ? Render.blocks(item.blocks, { toc: [] }) : '';

    return '<article class="exi" data-item="' + attr(item.id) + '" data-k="' + attr(item.k) + '">' +
      '<div class="exi__head">' +
        '<span class="exi__no">' + entry.no + '</span>' +
        '<span class="exi__tag">' + esc(item.tag) + '</span>' +
        truc +
        '<span class="exi__dot" data-dot></span>' +
      '</div>' +
      '<div class="exi__q">' + item.q + '</div>' +
      pre +
      build(item, st) +
    '</article>';
  }

  /* ══════════ Cả bộ bài tập ══════════ */

  function bar(s) {
    return '<div class="exbar">' +
      '<div class="exbar__top">' +
        '<span class="exbar__t">Đã làm <b data-exdone>' + s.done + '</b>/' + s.total + ' câu</span>' +
        '<span class="exbar__p" data-expct>' + s.pct + '%</span>' +
      '</div>' +
      '<span class="bar"><span class="bar__f" data-exfill style="width:' + s.pct + '%"></span></span>' +
    '</div>';
  }

  function set(data) {
    var ctx = { toc: [] };
    var lessonId = Exercise.lessonOf(data.id);
    var meta = Course.find(lessonId) || { n: '?', title: '', moduleNum: '', moduleName: '' };
    var state = Store.getEx(data.id);
    var all = Exercise.items(data);

    var trucCard = '';
    if (data.truc && data.truc.length) {
      trucCard = '<div class="extruc">' +
        '<div class="extruc__title">' + ICON('target') + 'Trục xoáy của bài này</div>' +
        '<p>' + data.truc.length + ' khái niệm dưới đây được hỏi <b>ba lần</b> — ở phần A bạn phải ' +
        '<i>nhớ ra</i>, ở phần B phải <i>giải thích cơ chế</i>, ở phần C phải <i>ra quyết định</i> ' +
        'bằng chúng. Mọi khái niệm khác chỉ được hỏi một lần.</p>' +
        '<ol>' + data.truc.map(function (t) {
          return '<li>' + esc(t.name) + '</li>';
        }).join('') + '</ol>' +
      '</div>';
    }

    var head =
      '<div class="lead-crumb">' +
        '<span>Chặng ' + esc(meta.moduleNum) + '</span>' + ICON('chevronRight') +
        '<span>Bài ' + esc(meta.n) + '</span>' + ICON('chevronRight') +
        '<span>Bài tập</span>' +
      '</div>' +
      '<h1 class="lead-title">Bài tập ' + esc(meta.n) + '. ' + esc(meta.title) + '</h1>' +
      '<div class="lead-meta">' +
        '<span class="lead-meta__i">' + ICON('listChecks') + all.length + ' câu</span>' +
        '<span class="lead-meta__i">' + ICON('clock') + (data.minutes || 60) + ' phút, chia 2 lượt</span>' +
        '<a class="lead-meta__i lead-meta__i--link" href="#/' + attr(lessonId) + '">' +
          ICON('arrowLeft') + 'Về Bài ' + esc(meta.n) + '</a>' +
      '</div>' +
      (data.intro ? '<div class="lead-intro">' + data.intro + '</div>' : '') +
      bar(Exercise.stats(data.id)) +
      trucCard;

    var body = Exercise.PARTS.map(function (p) {
      if (p.k === 'F') { return diagHtml(data, p, ctx); }

      var list = all.filter(function (e) { return e.part === p.k; });
      var pass = '';
      if (p.k === 'A' || p.k === 'C') {
        pass = passBanner(p.pass);
      }
      if (!list.length) {
        if (!data[p.k + 'Empty']) { return pass; }
        return pass + partHead(p, 0, ctx) +
          '<div class="cal cal--info"><span class="cal__ico">' + ICON('info') + '</span>' +
          '<div class="cal__body">' + data[p.k + 'Empty'] + '</div></div>';
      }

      return pass + partHead(p, list.length, ctx) +
        list.map(function (e) { return itemHtml(e, data, state); }).join('');
    }).join('');

    return { html: head + body, toc: ctx.toc };
  }

  function passBanner(n) {
    var d = n === 1
      ? { t: 'Lượt 1 — làm ngay sau khi đọc xong bài',
          x: 'Phần A và B. Củng cố khi kiến thức còn nóng.' }
      : { t: 'Lượt 2 — làm sau 2–3 ngày',
          x: 'Phần C, D và E. Khoảng nghỉ này là <b>thành phần chủ động</b>, không phải sự trì hoãn: ' +
             'nhớ lại sau khi đã quên một phần thì bền hơn hẳn nhớ lại ngay.' };
    return '<div class="expass expass--' + n + '">' +
      '<span class="expass__n">' + n + '</span>' +
      '<div><b>' + d.t + '</b><span>' + d.x + '</span></div>' +
    '</div>';
  }

  function partHead(p, n, ctx) {
    var title = 'Phần ' + p.k + ' · ' + p.name;
    var id = Render.slug(title);
    ctx.toc.push({ id: id, text: title, level: 2 });
    return '<section class="expart" id="' + attr(id) + '">' +
      '<span class="expart__k">' + p.k + '</span>' +
      '<div class="expart__b">' +
        '<h2>' + esc(p.name) + '</h2>' +
        '<p>' + p.desc + '</p>' +
      '</div>' +
      (n ? '<span class="expart__n">' + n + ' câu</span>' : '') +
    '</section>';
  }

  /* Phần F — bảng tra "sai câu nào thì đọc lại đâu". Không phải câu hỏi:
     đây là thứ biến một lần làm sai thành một lần được chỉ đường, việc mà
     người tự học không có ai làm hộ (CLAUDE.md §13.2). */
  function diagHtml(data, p, ctx) {
    var rows = (data.diag || []).map(function (r) {
      return '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    }).join('');
    if (!rows) { return ''; }
    return partHead(p, 0, ctx) +
      '<div class="tbl-wrap"><table class="tbl">' +
        '<thead><tr><th>Sai ở câu</th><th>Nghĩa là bạn đang hổng chỗ nào</th><th>Đọc lại</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  }

  global.RenderEx = {
    set: set,
    /* Dựng lại MỘT câu. js/app.js cần nó để hoàn tác khi máy chủ từ chối
       lệnh ghi: vẽ lại đúng câu đó từ dữ liệu đã hoàn tác thì chắc chắn
       khớp, còn gỡ tay từng class trên DOM thì sớm muộn cũng sót một chỗ. */
    item: itemHtml,
    bar: bar,
    normText: normText,
    normNum: normNum,
    gradeFill: gradeFill,
    gradeNum: gradeNum,
    gradeMatch: gradeMatch,
    gradeMulti: gradeMulti
  };
})(window);

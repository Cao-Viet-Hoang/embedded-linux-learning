/* ============================================================
   RENDER — biến dữ liệu bài học (mảng block) thành HTML.

   Mọi bài học đều đi qua đúng bộ hàm này, nên style tuyệt đối
   thống nhất: không bài nào có thể "vẽ" khác bài nào.

   Các loại block hỗ trợ:
     h2 h3 h4   tiêu đề (h2/h3 tự vào mục lục)
     p          đoạn văn
     list       danh sách có/không đánh số
     code       khối lệnh kiểu terminal, có huy hiệu môi trường
     cmdx       mổ xẻ câu lệnh theo từng thành phần
     cal        hộp nhấn mạnh (info/tip/warn/danger/why)
     table      bảng
     steps      các bước thực hành đánh số
     fig        sơ đồ SVG kèm chú thích
     terms      bảng thuật ngữ
     recap      tóm tắt cuối bài
   ============================================================ */
(function (global) {
  'use strict';

  /* ══════════ Tiện ích ══════════ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function attr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  /* Bỏ dấu tiếng Việt để tạo id neo cho tiêu đề */
  function slug(s) {
    return String(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'muc';
  }

  /* ══════════ Tô màu cú pháp ══════════ */

  var SH_KEYWORDS = ['if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done',
                     'while', 'case', 'esac', 'function', 'return', 'export',
                     'local', 'sudo', 'time'];

  /* Tách một dòng shell thành các mảnh và bọc màu.
     Làm theo kiểu quét tuần tự để không bao giờ khớp nhầm vào bên trong thẻ. */
  function hiShellLine(line) {
    var t = line.replace(/\t/g, '    ');

    // Dòng chú thích trọn vẹn
    if (/^\s*#/.test(t)) {
      return '<span class="tk-comment">' + esc(t) + '</span>';
    }

    var out = '';
    var rest = t;

    // 1) Tách phần thụt đầu dòng
    var mIndent = rest.match(/^\s*/);
    var indent = mIndent ? mIndent[0] : '';
    out += indent;
    rest = rest.slice(indent.length);

    // 2) Từ đầu tiên là tên lệnh (bỏ qua nếu là từ khoá điều khiển)
    var mCmd = rest.match(/^([A-Za-z_][A-Za-z0-9_.\/+-]*)/);
    if (mCmd) {
      var word = mCmd[1];
      var cls = SH_KEYWORDS.indexOf(word) >= 0 ? 'tk-flag' : 'tk-cmd';
      out += '<span class="' + cls + '">' + esc(word) + '</span>';
      rest = rest.slice(word.length);
    }

    // 3) Quét phần còn lại: chuỗi, biến, tuỳ chọn, chú thích cuối dòng
    var re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\$\([^)]*\))|(\s#.*$)|((?:^|\s)--?[A-Za-z][A-Za-z0-9-]*)/g;
    var last = 0, m;
    while ((m = re.exec(rest)) !== null) {
      out += esc(rest.slice(last, m.index));
      if (m[1])      { out += '<span class="tk-str">' + esc(m[1]) + '</span>'; }
      else if (m[2]) { out += '<span class="tk-var">' + esc(m[2]) + '</span>'; }
      else if (m[3]) { out += '<span class="tk-comment">' + esc(m[3]) + '</span>'; }
      else if (m[4]) {
        var lead = m[4].charAt(0) === '-' ? '' : m[4].charAt(0);
        var flag = lead ? m[4].slice(1) : m[4];
        out += esc(lead) + '<span class="tk-flag">' + esc(flag) + '</span>';
      }
      last = m.index + m[0].length;
    }
    out += esc(rest.slice(last));
    return out;
  }

  function hiCLine(line) {
    var t = line.replace(/\t/g, '    ');
    if (/^\s*\/\//.test(t) || /^\s*\*/.test(t) || /^\s*\/\*/.test(t)) {
      return '<span class="tk-comment">' + esc(t) + '</span>';
    }
    if (/^\s*#\s*(include|define|ifdef|ifndef|endif|if|else|pragma)/.test(t)) {
      return '<span class="tk-flag">' + esc(t) + '</span>';
    }
    var out = '', last = 0, m;
    var re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|<[a-z0-9_\/.]+\.h>)|(\/\/.*$)|\b(static|struct|void|int|char|unsigned|const|return|if|else|for|while|sizeof|typedef|enum|union|goto|break|continue)\b/g;
    while ((m = re.exec(t)) !== null) {
      out += esc(t.slice(last, m.index));
      if (m[1])      { out += '<span class="tk-str">' + esc(m[1]) + '</span>'; }
      else if (m[2]) { out += '<span class="tk-comment">' + esc(m[2]) + '</span>'; }
      else           { out += '<span class="tk-cmd">' + esc(m[3]) + '</span>'; }
      last = m.index + m[0].length;
    }
    out += esc(t.slice(last));
    return out;
  }

  function hiIniLine(line) {
    var t = line.replace(/\t/g, '    ');
    if (/^\s*[#;]/.test(t))  { return '<span class="tk-comment">' + esc(t) + '</span>'; }
    if (/^\s*\[.*\]\s*$/.test(t)) { return '<span class="tk-cmd">' + esc(t) + '</span>'; }
    var eq = t.indexOf('=');
    if (eq > 0) {
      return '<span class="tk-flag">' + esc(t.slice(0, eq)) + '</span>=' +
             '<span class="tk-str">' + esc(t.slice(eq + 1)) + '</span>';
    }
    return esc(t);
  }

  function highlight(code, lang) {
    var lines = String(code).replace(/\r\n/g, '\n').split('\n');
    var fn;
    if (lang === 'c')            { fn = hiCLine; }
    else if (lang === 'ini' || lang === 'conf') { fn = hiIniLine; }
    else if (lang === 'text' || lang === 'out') { fn = function (l) { return esc(l.replace(/\t/g, '    ')); }; }
    else                          { fn = hiShellLine; }
    return lines.map(fn).join('\n');
  }

  /* ══════════ Huy hiệu môi trường chạy lệnh ══════════ */

  var WHERE = {
    ps:    { cls: 'ps',    icon: 'windows',   label: 'PowerShell (Windows)' },
    psadm: { cls: 'ps',    icon: 'windows',   label: 'PowerShell (Administrator)' },
    wsl:   { cls: 'wsl',   icon: 'terminal',  label: 'WSL — Ubuntu' },
    qemu:  { cls: 'qemu',  icon: 'cpu',       label: 'Trong máy ảo QEMU' },
    uboot: { cls: 'uboot', icon: 'chip',      label: 'Dấu nhắc U-Boot' },
    file:  { cls: 'file',  icon: 'file',      label: 'Nội dung file' },
    out:   { cls: 'out',   icon: 'listChecks',label: 'Kết quả in ra' }
  };

  function whereBadge(w) {
    var d = WHERE[w];
    if (!d) { return ''; }
    return '<span class="where where--' + d.cls + '">' +
             ICON(d.icon) + d.label +
           '</span>';
  }

  /* ══════════ Bộ dựng từng loại block ══════════ */

  var B = {};

  B.h2 = function (b, ctx) {
    var id = b.id || slug(b.x);
    ctx.toc.push({ id: id, text: b.x, level: 2 });
    return '<h2 class="h2" id="' + attr(id) + '">' + b.x + '</h2>';
  };

  B.h3 = function (b, ctx) {
    var id = b.id || slug(b.x);
    ctx.toc.push({ id: id, text: b.x, level: 3 });
    return '<h3 class="h3" id="' + attr(id) + '">' + b.x + '</h3>';
  };

  B.h4 = function (b) {
    return '<h4 class="h4">' + b.x + '</h4>';
  };

  B.p = function (b) {
    return '<p class="p' + (b.muted ? ' p--muted' : '') + '">' + b.x + '</p>';
  };

  B.list = function (b) {
    var tag = b.ordered ? 'ol' : 'ul';
    var li = (b.items || []).map(function (i) { return '<li>' + i + '</li>'; }).join('');
    return '<' + tag + ' class="list">' + li + '</' + tag + '>';
  };

  B.code = function (b) {
    var notes = '';
    if (b.notes && b.notes.length) {
      notes = '<div class="code__notes">' +
        b.notes.map(function (n) {
          return '<div class="code__note"><b>' + esc(n[0]) + '</b><span>' + n[1] + '</span></div>';
        }).join('') +
      '</div>';
    }
    var name = b.name ? '<span class="code__name">' + esc(b.name) + '</span>' : '';
    var copy = b.nocopy ? '' :
      '<button class="code__copy" type="button" data-copy>' + ICON('copy') + 'Sao chép</button>';

    return '<div class="code">' +
      '<div class="code__bar">' + whereBadge(b.where || 'wsl') + name + copy + '</div>' +
      '<pre class="code__body"><code>' + highlight(b.code, b.lang) + '</code></pre>' +
      notes +
    '</div>';
  };

  B.cmdx = function (b) {
    /* Cột token nhận rich text như mọi trường văn bản khác (<code>, <i>, <b>…).
       Ký tự  <  và  &  trong một token thật phải viết &lt; và &amp; — xem
       CLAUDE.md §4. tools/check.js bắt các token quên escape. */
    var rows = (b.rows || []).map(function (r) {
      return '<div class="cmdx__row">' +
        '<div class="cmdx__tok">' + r[0] + '</div>' +
        '<div class="cmdx__desc">' + r[1] + (r[2] ? '<em>' + r[2] + '</em>' : '') + '</div>' +
      '</div>';
    }).join('');

    return '<div class="cmdx">' +
      '<div class="cmdx__head">' + ICON('scissors') + (b.title || 'Mổ xẻ câu lệnh') + '</div>' +
      '<div class="cmdx__cmd">' + highlight(b.cmd, b.lang || 'sh') + '</div>' +
      '<div class="cmdx__rows">' + rows + '</div>' +
    '</div>';
  };

  var CAL_ICON = { info: 'info', tip: 'lightbulb', warn: 'alert', danger: 'danger', why: 'help' };
  var CAL_TITLE = {
    info: 'Ghi chú', tip: 'Mẹo', warn: 'Cẩn thận',
    danger: 'Nguy hiểm', why: 'Tại sao lại thế?'
  };

  B.cal = function (b) {
    var kind = b.kind || 'info';
    var title = b.title === null ? '' :
      '<div class="cal__title">' + (b.title || CAL_TITLE[kind]) + '</div>';
    return '<div class="cal cal--' + kind + '">' +
      '<span class="cal__ico">' + ICON(CAL_ICON[kind] || 'info') + '</span>' +
      '<div class="cal__body">' + title + b.x + '</div>' +
    '</div>';
  };

  B.table = function (b) {
    var head = '<thead><tr>' +
      (b.head || []).map(function (h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead>';
    var body = '<tbody>' +
      (b.rows || []).map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') +
    '</tbody>';
    return '<div class="tbl-wrap"><table class="tbl">' + head + body + '</table></div>';
  };

  B.steps = function (b, ctx) {
    var items = (b.items || []).map(function (s) {
      return '<div class="step">' +
        '<div class="step__title">' + s.title + '</div>' +
        '<div class="step__body">' + blocks(s.blocks || [], ctx) + '</div>' +
      '</div>';
    }).join('');
    return '<div class="steps">' + items + '</div>';
  };

  B.fig = function (b) {
    return '<figure class="fig">' +
      '<div class="fig__canvas">' + b.svg + '</div>' +
      (b.cap ? '<figcaption class="fig__cap">' + b.cap + '</figcaption>' : '') +
    '</figure>';
  };

  B.terms = function (b) {
    var items = (b.items || []).map(function (t) {
      return '<div class="term">' +
        '<div class="term__k">' + t[0] + (t[1] ? '<small>' + t[1] + '</small>' : '') + '</div>' +
        '<div class="term__v">' + t[2] + '</div>' +
      '</div>';
    }).join('');
    return '<div class="terms">' + items + '</div>';
  };

  B.recap = function (b) {
    var li = (b.items || []).map(function (i) { return '<li>' + i + '</li>'; }).join('');
    return '<div class="recap">' +
      '<div class="recap__title">' + ICON('listChecks') + (b.title || 'Bạn đã nắm được gì') + '</div>' +
      '<ul>' + li + '</ul>' +
    '</div>';
  };

  B.hr = function () { return '<hr>'; };

  B.html = function (b) { return b.x; };

  /* ══════════ Vòng lặp dựng block ══════════ */

  function blocks(list, ctx) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.t) { continue; }
      var fn = B[b.t];
      if (!fn) {
        console.warn('[render] Không biết loại block:', b.t);
        continue;
      }
      out.push(fn(b, ctx));
    }
    return out.join('\n');
  }

  /* ══════════ Quiz ══════════ */

  function quiz(items, lessonId) {
    if (!items || !items.length) { return ''; }

    var saved = Store.getQuiz(lessonId);
    var letters = ['A', 'B', 'C', 'D', 'E'];

    var qs = items.map(function (q, qi) {
      var picked = saved[String(qi)];
      var answered = picked !== undefined;

      var opts = q.opts.map(function (o, oi) {
        var cls = 'q__opt';
        if (answered) {
          if (oi === q.a)               { cls += ' is-right'; }
          else if (oi === picked)       { cls += ' is-wrong'; }
        }
        return '<button type="button" class="' + cls + '"' +
                 ' data-q="' + qi + '" data-o="' + oi + '"' +
                 (answered ? ' disabled' : '') + '>' +
                 '<span class="q__letter">' + letters[oi] + '</span>' +
                 '<span>' + o + '</span>' +
               '</button>';
      }).join('');

      var why = '<div class="q__why"' + (answered ? '' : ' hidden') + '>' +
                  '<b>' + (picked === q.a ? 'Chính xác. ' : (answered ? 'Chưa đúng. ' : '')) + '</b>' +
                  q.why +
                '</div>';

      return '<div class="q" data-qi="' + qi + '">' +
        '<div class="q__ask"><span>Câu ' + (qi + 1) + '.</span>' + q.q + '</div>' +
        '<div class="q__opts">' + opts + '</div>' +
        why +
      '</div>';
    }).join('');

    return '<section class="quiz" data-quiz="' + attr(lessonId) + '">' +
      '<div class="quiz__head">' +
        ICON('help') +
        '<h3>Tự kiểm tra</h3>' +
        '<span class="quiz__score" data-score></span>' +
      '</div>' +
      qs +
    '</section>';
  }

  /* ══════════ Dựng cả bài học ══════════ */

  function lesson(data) {
    var ctx = { toc: [] };
    var meta = Course.find(data.id) || { n: '?', moduleName: '', moduleNum: '' };

    var goals = '';
    if (data.goals && data.goals.length) {
      goals = '<div class="goals">' +
        '<div class="goals__title">' + ICON('target') + 'Sau bài này bạn sẽ</div>' +
        '<ul>' + data.goals.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul>' +
      '</div>';
    }

    var head =
      '<div class="lead-crumb">' +
        '<span>Chặng ' + esc(meta.moduleNum) + '</span>' + ICON('chevronRight') +
        '<span>' + esc(meta.moduleName) + '</span>' +
      '</div>' +
      '<h1 class="lead-title">Bài ' + esc(meta.n) + '. ' + data.title + '</h1>' +
      '<div class="lead-meta">' +
        '<span class="lead-meta__i">' + ICON('clock') + (data.minutes || 30) + ' phút đọc</span>' +
        (data.practice ? '<span class="lead-meta__i">' + ICON('terminal') + data.practice + '</span>' : '') +
        (data.level ? '<span class="lead-meta__i">' + ICON('layers') + data.level + '</span>' : '') +
      '</div>' +
      (data.intro ? '<div class="lead-intro">' + data.intro + '</div>' : '') +
      goals;

    var body = blocks(data.blocks || [], ctx);
    var qz = quiz(data.quiz, data.id);

    return { html: head + body + qz, toc: ctx.toc };
  }

  global.Render = {
    lesson: lesson,
    blocks: blocks,
    highlight: highlight,
    esc: esc,
    slug: slug,
    whereBadge: whereBadge
  };
})(window);

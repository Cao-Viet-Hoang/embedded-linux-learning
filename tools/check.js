/* ============================================================
   Consistency + render smoke test.   Run:  node tools/check.js
   No dependencies. Loads the browser modules in a vm sandbox,
   then validates the course structure and renders every lesson.
   Exits non-zero on any error.
   ============================================================ */
'use strict';

var fs = require('fs');
var vm = require('vm');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CORE = ['js/icons.js', 'js/store.js', 'js/registry.js', 'js/render.js',
            'js/search.js', 'js/exercises.js', 'js/render-ex.js'];

var WHERE = ['ps', 'psadm', 'wsl', 'qemu', 'uboot', 'file', 'out'];
var CAL   = ['info', 'tip', 'warn', 'danger', 'why'];
var BLOCK = ['h2', 'h3', 'h4', 'p', 'list', 'code', 'cmdx', 'cal',
             'table', 'steps', 'fig', 'terms', 'recap', 'hr', 'html'];

var errs = [];
function err(m) { errs.push(m); }

/* Cột token của cmdx và cột khoá của terms là rich text (xem CLAUDE.md §4),
   nên "<" hoặc "&" của một giá trị thật phải viết &lt; / &amp; — nếu không
   trình duyệt nuốt mất. Riêng ">" trong text HTML là hợp lệ, bỏ qua. */
var INLINE = /<\/?(code|i|b|em|strong|kbd|small|sub|sup)>/g;
var ENTITY = /&(lt|gt|amp|quot|nbsp|#\d+);/g;
function richText(s, at) {
  var rest = String(s == null ? '' : s).replace(INLINE, '').replace(ENTITY, '');
  if (/[<&]/.test(rest)) { err(at + ': unescaped < or & — "' + s + '"'); }
}

/* ---------- sandbox ---------- */
var ctx = { console: console };
ctx.window = ctx;
ctx.global = ctx;
ctx.localStorage = {
  _d: {},
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem: function (k, v) { this._d[k] = String(v); },
  removeItem: function (k) { delete this._d[k]; }
};
ctx.matchMedia = function () { return { matches: false, addEventListener: function () {} }; };
vm.createContext(ctx);

/* ---------- load ---------- */
var lessonFiles = fs.readdirSync(path.join(ROOT, 'lessons'))
  .filter(function (f) { return /^bai-\d\d\.js$/.test(f); })
  .sort()
  .map(function (f) { return 'lessons/' + f; });

var exDir = path.join(ROOT, 'exercises');
var exFiles = fs.existsSync(exDir)
  ? fs.readdirSync(exDir)
      .filter(function (f) { return /^bt-\d\d\.js$/.test(f); })
      .sort()
      .map(function (f) { return 'exercises/' + f; })
  : [];

CORE.concat(lessonFiles).concat(exFiles).forEach(function (f) {
  var src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { new vm.Script(src, { filename: f }); }
  catch (e) { err('SYNTAX ' + f + ': ' + e.message); return; }
  try { vm.runInContext(src, ctx, { filename: f }); }
  catch (e) { err('RUNTIME ' + f + ': ' + e.message); }
});
if (errs.length) { report(); }

var COURSE = ctx.COURSE, Course = ctx.Course, Lesson = ctx.Lesson, Render = ctx.Render;
var Exercise = ctx.Exercise, RenderEx = ctx.RenderEx;

/* ---------- structure ---------- */
COURSE.modules.forEach(function (m, i) {
  if (m.num !== String(i).padStart(2, '0')) { err('module #' + i + ' has num "' + m.num + '"'); }
});

var seen = {};
Course.flat.forEach(function (l, i) {
  if (l.n !== i + 1) { err('lesson order: ' + l.id + ' has n=' + l.n + ' at position ' + (i + 1)); }
  if (l.id !== 'bai-' + String(l.n).padStart(2, '0')) { err('id/n mismatch: ' + l.id + ' n=' + l.n); }
  if (seen[l.id]) { err('duplicate id: ' + l.id); }
  seen[l.id] = true;
  if (!l.title || !l.title.trim()) { err('empty title: ' + l.id); }
});

var first = Course.flat[0].id, last = Course.flat[Course.flat.length - 1].id;
if (Course.prev(first) !== null) { err('prev(' + first + ') should be null'); }
if (Course.next(last) !== null) { err('next(' + last + ') should be null'); }

/* ---------- index.html wiring ---------- */
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
lessonFiles.forEach(function (f) {
  if (html.indexOf(f) === -1) { err('index.html has no <script> for ' + f); }
});
var appAt = html.indexOf('js/app.js');
lessonFiles.concat(exFiles).forEach(function (f) {
  var at = html.indexOf(f);
  if (at !== -1 && appAt !== -1 && at > appAt) { err(f + ' is loaded after js/app.js'); }
});
exFiles.forEach(function (f) {
  if (html.indexOf(f) === -1) { err('index.html has no <script> for ' + f); }
});
['js/exercises.js', 'js/render-ex.js'].forEach(function (f) {
  if (exFiles.length && html.indexOf(f) === -1) { err('index.html has no <script> for ' + f); }
});

/* ---------- per-lesson ---------- */
var written = Course.flat.filter(function (l) { return Lesson.has(l.id); });

written.forEach(function (meta) {
  var d = Lesson.get(meta.id), id = meta.id;

  ['title', 'intro'].forEach(function (k) { if (!d[k]) { err(id + ': missing "' + k + '"'); } });
  if (!Array.isArray(d.goals) || d.goals.length < 3) { err(id + ': needs at least 3 goals'); }
  if (!Array.isArray(d.blocks) || !d.blocks.length) { err(id + ': no blocks'); }
  if (!Array.isArray(d.quiz) || d.quiz.length < 4) { err(id + ': needs at least 4 quiz questions'); }
  if (d.title !== meta.title) { err(id + ': title differs from registry.js'); }

  var h2 = 0, hasRecap = false, hasPractice = false;

  function walk(blocks, where) {
    blocks.forEach(function (b, i) {
      var at = id + ' ' + where + '#' + i;
      if (BLOCK.indexOf(b.t) === -1) { err(at + ': unknown block type "' + b.t + '"'); return; }
      if (b.t === 'h2') { h2++; }
      if (b.t === 'recap') { hasRecap = true; }
      if (b.t === 'steps') {
        hasPractice = true;
        b.items.forEach(function (s, j) {
          if (!s.title) { err(at + ' step#' + j + ': missing title'); }
          walk(s.blocks || [], 'steps#' + i + '.' + j);
        });
      }
      if (b.t === 'code') {
        if (b.where && WHERE.indexOf(b.where) === -1) { err(at + ': bad where "' + b.where + '"'); }
        if (!b.code) { err(at + ': empty code'); }
      }
      if (b.t === 'cal' && CAL.indexOf(b.kind) === -1) { err(at + ': bad cal kind "' + b.kind + '"'); }
      if (b.t === 'fig') {
        if (!b.cap) { err(at + ': figure without caption'); }
        var o = (b.svg.match(/<svg/g) || []).length, c = (b.svg.match(/<\/svg>/g) || []).length;
        if (o !== 1 || c !== 1) { err(at + ': svg tag count ' + o + '/' + c); }
        if (!/viewBox=/.test(b.svg)) { err(at + ': svg missing viewBox'); }
        if (!/role="img"/.test(b.svg)) { err(at + ': svg missing role="img"'); }
        if (!/aria-label=/.test(b.svg)) { err(at + ': svg missing aria-label'); }
      }
      if (b.t === 'table' && b.rows.some(function (r) { return r.length !== b.head.length; })) {
        err(at + ': table row width differs from head');
      }
      if (b.t === 'cmdx') {
        if (!b.rows || !b.rows.length) { err(at + ': cmdx without rows'); }
        (b.rows || []).forEach(function (r, j) { richText(r[0], at + ' row#' + j + ' token'); });
      }
      if (b.t === 'terms') {
        if (!b.items || !b.items.length) { err(at + ': terms without items'); }
        (b.items || []).forEach(function (t, j) { richText(t[0], at + ' item#' + j + ' key'); });
      }
    });
  }
  walk(d.blocks, 'block');

  if (h2 < 3) { err(id + ': only ' + h2 + ' h2 sections'); }
  if (!hasRecap) { err(id + ': no recap block'); }
  if (!hasPractice) { err(id + ': no steps (practice) block'); }

  d.quiz.forEach(function (q, i) {
    var at = id + ' quiz#' + i;
    if (!q.q) { err(at + ': no question'); }
    if (!Array.isArray(q.opts) || q.opts.length < 3) { err(at + ': needs at least 3 options'); }
    if (typeof q.a !== 'number' || q.a < 0 || q.a >= (q.opts || []).length) { err(at + ': answer index out of range'); }
    if (!q.why) { err(at + ': missing "why" explanation'); }
  });

  var out;
  try { out = Render.lesson(d); }
  catch (e) { err(id + ': Render.lesson threw — ' + e.message); return; }
  if (!out.html || out.html.length < 3000) { err(id + ': rendered html suspiciously short'); }

  console.log(
    '  ' + id +
    '  blocks=' + String(d.blocks.length).padStart(3) +
    '  toc=' + String(out.toc.length).padStart(2) +
    '  quiz=' + d.quiz.length +
    '  html=' + Math.round(out.html.length / 1024) + 'KB'
  );
});

/* ---------- exercise sets (CLAUDE.md §13) ----------
   Bộ bài tập bt-NN đi kèm bài học bai-NN. Kiểm tra ở đây là thứ duy nhất
   canh được hai bất biến mà mắt người hay bỏ sót: đúng 7 kiểu chấm, và
   lưới trục xoáy 3×1 — mỗi trục xuất hiện đúng một lần ở A, B và C. */
var exSets = exFiles.map(function (f) {
  return path.basename(f, '.js');
}).filter(function (id) {
  if (!Exercise.has(id)) { err(id + ': file did not call Exercise.register'); return false; }
  return true;
});

exSets.forEach(function (exId) {
  var d = Exercise.get(exId);
  var lessonId = Exercise.lessonOf(exId);

  if (!Course.find(lessonId)) { err(exId + ': no lesson ' + lessonId + ' in registry.js'); return; }
  if (!Lesson.has(lessonId)) { err(exId + ': lesson ' + lessonId + ' is not written yet'); }
  if (!d.intro) { err(exId + ': missing "intro"'); }
  if (!d.minutes) { err(exId + ': missing "minutes"'); }

  var truc = d.truc || [];
  if (truc.length > 3) { err(exId + ': ' + truc.length + ' trục — the cap is 3 (§13.3)'); }
  truc.forEach(function (t, i) {
    if (!t.name) { err(exId + ' trục#' + i + ': missing name'); }
  });

  var ids = {}, grid = {}, nItems = 0;
  Exercise.items(d).forEach(function (e) {
    var it = e.it, at = exId + ' ' + e.no;
    nItems++;

    if (!it.id) { err(at + ': missing item id'); }
    else if (ids[it.id]) { err(at + ': duplicate item id "' + it.id + '"'); }
    ids[it.id] = true;

    if (Exercise.KINDS.indexOf(it.k) === -1) { err(at + ': unknown kind "' + it.k + '"'); return; }
    if (!it.q) { err(at + ': no question'); }
    if (!it.tag) { err(at + ': no tag (which of the 12 types is this?)'); }

    if (it.truc !== undefined) {
      if (typeof it.truc !== 'number' || it.truc < 0 || it.truc >= truc.length) {
        err(at + ': truc index out of range');
      } else if ('ABC'.indexOf(e.part) === -1) {
        err(at + ': the spiral lives in A/B/C only, not part ' + e.part);
      } else {
        grid[it.truc] = (grid[it.truc] || '') + e.part;
      }
    }

    /* Mỗi kiểu chấm có bộ trường bắt buộc riêng — thiếu một trường thì câu
       vẫn hiện ra nhưng không chấm được, và người học chỉ phát hiện lúc bấm. */
    switch (it.k) {
      case 'mcq':
        if (!Array.isArray(it.opts) || it.opts.length < 3) { err(at + ': needs at least 3 options'); }
        if (typeof it.a !== 'number' || it.a < 0 || it.a >= (it.opts || []).length) { err(at + ': answer index out of range'); }
        if (!it.why) { err(at + ': missing "why"'); }
        break;
      case 'multi':
        if (!Array.isArray(it.opts) || it.opts.length < 3) { err(at + ': needs at least 3 options'); }
        if (!Array.isArray(it.a) || !it.a.length) { err(at + ': "a" must be a non-empty array'); }
        (it.a || []).forEach(function (x) {
          if (x < 0 || x >= (it.opts || []).length) { err(at + ': answer index ' + x + ' out of range'); }
        });
        if (!it.why) { err(at + ': missing "why"'); }
        break;
      case 'tf':
        if (it.a !== 0 && it.a !== 1) { err(at + ': "a" must be 0 (Đúng) or 1 (Sai)'); }
        if (!it.why) { err(at + ': missing "why"'); }
        if (!Array.isArray(it.crit) || !it.crit.length) { err(at + ': needs "crit" for the rewrite half'); }
        break;
      case 'fill':
        if (!Array.isArray(it.a) || !it.a.length) { err(at + ': "a" must list the accepted strings'); }
        if (!it.why) { err(at + ': missing "why"'); }
        break;
      case 'num':
        if (typeof it.a !== 'number') { err(at + ': "a" must be a number'); }
        if (!it.why) { err(at + ': missing "why"'); }
        break;
      case 'match':
        if (!Array.isArray(it.left) || !Array.isArray(it.right)) { err(at + ': match needs left[] and right[]'); }
        else {
          if (it.left.length !== (it.a || []).length) { err(at + ': "a" length differs from left[]'); }
          (it.a || []).forEach(function (x) {
            if (x < 0 || x >= it.right.length) { err(at + ': answer index ' + x + ' out of range'); }
          });
          /* a = [0,1,2,…] nghĩa là chọn từ trên xuống là đúng — giải được mà
             không cần đọc cột phải. Xáo lại right[] trước khi ship. */
          if (it.a && it.a.length && it.a.every(function (x, i) { return x === i; })) {
            err(at + ': identity mapping — shuffle right[] or the item grades itself');
          }
        }
        if (!it.why) { err(at + ': missing "why"'); }
        break;
      case 'free':
        if (!Array.isArray(it.crit) || !it.crit.length) { err(at + ': free text needs a "crit" checklist (§13.5)'); }
        if (!it.sol && !it.solBlocks) { err(at + ': free text needs "sol" or "solBlocks"'); }
        break;
      default: break;
    }

    (it.blocks || []).concat(it.solBlocks || []).forEach(function (b, j) {
      var bat = at + ' block#' + j;
      if (BLOCK.indexOf(b.t) === -1) { err(bat + ': unknown block type "' + b.t + '"'); return; }
      if (b.t === 'code') {
        if (b.where && WHERE.indexOf(b.where) === -1) { err(bat + ': bad where "' + b.where + '"'); }
        if (!b.code) { err(bat + ': empty code'); }
      }
      if (b.t === 'cal' && CAL.indexOf(b.kind) === -1) { err(bat + ': bad cal kind "' + b.kind + '"'); }
      if (b.t === 'table' && b.rows.some(function (r) { return r.length !== b.head.length; })) {
        err(bat + ': table row width differs from head');
      }
    });
  });

  /* Lưới 3×1 của §13.3: mỗi trục đúng một lần ở A, một lần ở B, một lần ở C. */
  truc.forEach(function (t, i) {
    var g = (grid[i] || '').split('').sort().join('');
    if (g !== 'ABC') {
      err(exId + ' trục#' + i + ' ("' + t.name + '"): appears as "' + (g || '—') + '", must be exactly A+B+C');
    }
  });

  /* Phần F là bảng tra, không phải câu hỏi — nhưng nó phải trỏ đi đâu đó. */
  if (!Array.isArray(d.diag) || !d.diag.length) { err(exId + ': missing the part F "diag" table'); }
  (d.diag || []).forEach(function (r, i) {
    if (!Array.isArray(r) || r.length !== 3) { err(exId + ' diag#' + i + ': needs exactly 3 columns'); }
    else if (!/href="#\//.test(r[2])) { err(exId + ' diag#' + i + ': the "đọc lại" cell has no link'); }
  });

  /* Phần rỗng phải nói rõ vì sao rỗng, nếu không người học tưởng thiếu nội dung. */
  ['A', 'B', 'C', 'D', 'E'].forEach(function (k) {
    if (!(d[k] || []).length && !d[k + 'Empty']) {
      err(exId + ': part ' + k + ' is empty and has no "' + k + 'Empty" note');
    }
  });

  var out;
  try { out = RenderEx.set(d); }
  catch (e) { err(exId + ': RenderEx.set threw — ' + e.message); return; }
  if (!out.html || out.html.length < 3000) { err(exId + ': rendered html suspiciously short'); }

  console.log(
    '  ' + exId +
    '  items=' + String(nItems).padStart(3) +
    '  truc=' + truc.length +
    '  diag=' + String((d.diag || []).length).padStart(2) +
    '  html=' + Math.round(out.html.length / 1024) + 'KB'
  );
});

/* ---------- summary ---------- */
console.log(
  '\n  ' + COURSE.modules.length + ' modules · ' +
  Course.total() + ' lessons · ' +
  written.length + ' written · ' +
  exSets.length + ' bài tập'
);
report();

function report() {
  if (errs.length) {
    console.log('\nFAILED (' + errs.length + ')');
    errs.forEach(function (e) { console.log('  - ' + e); });
    process.exit(1);
  }
  console.log('  OK\n');
  process.exit(0);
}

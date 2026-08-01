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
var CORE = ['js/icons.js', 'js/store.js', 'js/registry.js', 'js/render.js'];

var WHERE = ['ps', 'psadm', 'wsl', 'qemu', 'uboot', 'file', 'out'];
var CAL   = ['info', 'tip', 'warn', 'danger', 'why'];
var BLOCK = ['h2', 'h3', 'h4', 'p', 'list', 'code', 'cmdx', 'cal',
             'table', 'steps', 'fig', 'terms', 'recap', 'hr', 'html'];

var errs = [];
function err(m) { errs.push(m); }

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

CORE.concat(lessonFiles).forEach(function (f) {
  var src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { new vm.Script(src, { filename: f }); }
  catch (e) { err('SYNTAX ' + f + ': ' + e.message); return; }
  try { vm.runInContext(src, ctx, { filename: f }); }
  catch (e) { err('RUNTIME ' + f + ': ' + e.message); }
});
if (errs.length) { report(); }

var COURSE = ctx.COURSE, Course = ctx.Course, Lesson = ctx.Lesson, Render = ctx.Render;

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
lessonFiles.forEach(function (f) {
  var at = html.indexOf(f);
  if (at !== -1 && appAt !== -1 && at > appAt) { err(f + ' is loaded after js/app.js'); }
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
      if (b.t === 'cmdx' && (!b.rows || !b.rows.length)) { err(at + ': cmdx without rows'); }
      if (b.t === 'terms' && (!b.items || !b.items.length)) { err(at + ': terms without items'); }
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

/* ---------- summary ---------- */
console.log(
  '\n  ' + COURSE.modules.length + ' modules · ' +
  Course.total() + ' lessons · ' +
  written.length + ' written'
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

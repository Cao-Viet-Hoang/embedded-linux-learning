# CLAUDE.md

Working conventions for this repository. Read this before writing anything.

**This file is written in English.** The only Vietnamese in it is quoted literal strings —
field values, heading text, terminology — that lesson files must reproduce **verbatim**.
Those are data, not prose: do not translate them, and do not translate them in the lessons
either. Every one is glossed in English on the spot.

---

## 0. Where the conventions live

This file used to hold all fourteen sections and had grown to 1 180 lines, most of which are
irrelevant to any given session. It was split on 2026-08-11. **The section numbers did not
change** — roughly fifty comments in `js/`, `css/`, `exercises/`, `firebase/` and
`tools/check.js` point at `CLAUDE.md §13.4`, `§14.3`, `§10` and so on, and every one of them
still resolves. Only the file holding the section moved.

| § | Topic | Lives in |
|---|---|---|
| 1 · 2 · 3 · 4 · 11 · 12 | project, hard rules, file map, the data-not-HTML rule, design system, numbering, status | **this file** |
| 3.1 | the product mark (logo / topbar tile / favicon) | `docs/product-mark.md` |
| 5 · 6 · 7 · 8 · 9 | lesson object shape, block types, lesson anatomy, SVG figures, add-a-lesson checklist | skill **`write-lesson`** |
| 9.1 | pre-flight, Git Bash/WSL gotchas, temp-file cleanup | `docs/running-commands.md` |
| 10 | verified environment facts | `docs/environment.md` |
| 12.1 | per-module continuity notes + `Chặng NN` cross-reference map | `docs/course-notes.md` |
| 13 | exercise sets `Bài tập` | skill **`write-exercise`** |
| 14 | progress storage (Firestore) | skill **`progress-storage`** |

**These are not optional reading.** Load the relevant one *before* you start, not after you
have written something that contradicts it:

| Before you… | Invoke / read |
|---|---|
| write, edit or review a lesson | skill `write-lesson` |
| write or edit an exercise set | skill `write-exercise` |
| touch `store.js`, `cloud.js`, `account.js`, `toast.js`, `firestore.rules`, the sync dot | skill `progress-storage` |
| run any command destined for a lesson, or anything slower than ~30 s | `docs/running-commands.md`, then `docs/environment.md` |

Skills live in `.claude/skills/<name>/SKILL.md` and are plain Markdown — a human can read
them directly, and so can a session that has no skill mechanism.

**Where to record a new fact** — one home each, no duplicates:

| Kind of fact | Goes in |
|---|---|
| A number or capability measured on the machine | `docs/environment.md` (§10) |
| "Lesson N owns this topic, lesson M must not repeat it" | `docs/course-notes.md` (§12.1) |
| A `trục` now spent | skill `write-exercise`, §13.8 |
| What is written / deployed right now | §12 below |

---

## 1. What this project is

A zero-dependency web app that teaches **Embedded Linux in Vietnamese**, from absolute
beginner to employable engineer, with **no hardware required** — all practice runs on
WSL2 + QEMU.

| | |
|---|---|
| Learner | Complete beginner at Linux *and* embedded Linux. Already knows Git. |
| Language | **All learner-facing content is Vietnamese.** Only `CLAUDE.md`, the skills and `docs/` are English. |
| Goal | Job-ready Embedded Linux Engineer |
| Scope | 70 lessons across 14 modules ("chặng"), 8–11 months — see `LO-TRINH.md` |
| Delivery | Open `index.html` by double-clicking. `file://` must work. No server, no build step, no npm. Also deployed to GitHub Pages. |
| Stack | Vanilla HTML + CSS + ES5-style JS. IIFE modules, no bundler, no framework. |

`tools/check.js` is the only Node script and it is a test, never a build step.

**"No Internet" has exactly one exception, and since 2026-08-10 it is no longer optional:
progress requires the network.** Everything that *teaches* — lesson text, figures, search,
theme, the rendering itself — is still 100 % offline and always will be. Pull the network
cable and the whole course is still readable, end to end, with no build step and no server.
What you lose is the ability to *record* anything: lesson ticks, quiz answers and exercise
answers live only in Firebase Firestore, so with no connection the page shows a loading
state and disables those controls rather than writing a copy to the machine. This was the
user's explicit instruction; §14 (skill `progress-storage`) spells out what it cost and why
it is not negotiable.

### The original brief

Every rule below is derived from this. When in doubt about scope, this wins:

> Build a web app containing detailed lessons so I can master embedded Linux, both theory
> and practice. Note that I am a complete beginner at Linux and embedded Linux, so the
> lessons must explain the commands in detail, explain **why** those commands are used, and
> explain both the theory and the practice steps in detail. The site must be in Vietnamese,
> suited to learning Linux; the **style must be consistent**, the **typeface and font sizes
> must be appropriate**, the **UI/UX must be the best possible for a learner**, and
> **everything must be unified**. Use **SVG icons**. Build it primarily with HTML, CSS and
> JS; splitting it into several modules is fine. Do not create all the lessons at once.
> Step one is a single `.md` roadmap file. Then create only the first lesson of that
> roadmap in the site; I will ask for the next ones as I get to them.

Follow-up decisions the user made when asked:

- Include a full Linux-basics module (do not assume any Linux knowledge).
- SPA, lesson content in `.js` files, must open by double-clicking `index.html`.
- All four learner features: progress tracking, copy button + environment badges,
  end-of-lesson quiz, dark mode + full-text search.
- Target outcome: job-ready Embedded Linux Engineer.
- Full roadmap expansion, **except** a Git lesson — the user already knows Git.

---

## 2. Hard rules (from the user — do not renegotiate)

1. **Never write lessons ahead of demand.** Write only the lesson(s) explicitly requested.
   The user learns one lesson, does the practice, then asks for the next.
2. **Every command must be verified on the user's actual machine before it enters a lesson.**
   Run it through `Bash`, capture the real output, paste that real output into the lesson.
   Never invent, guess, or approximate terminal output.
   **After running: if the actual output differs from expected output, investigate *why* before
   accepting it.** Check for forgotten cleanup, stale state from previous runs, or environment
   differences. Do not assume the output is correct just because the command ran. Document any
   reasons the output differs, or pause and dig deeper—never skip this step early. If the cause
   remains unclear after a reasonable investigation, record that explicitly in the lesson notes
   (not the lesson content itself): "investigated X and Y, cause unknown, will verify again."
   How to run it, and what is already measured: §9.1 and §10 — `docs/running-commands.md`,
   `docs/environment.md`.
3. **Explain the *why*, not just the *how*.** A command with no reason attached is a defect.
4. **Style must be identical across all lessons.** This is enforced structurally — see §4.
5. **No Git lesson.** The user already knows Git. Embedded-specific Git usage (patches,
   bisect) stays folded into lessons 34, 61 and 64.
6. **Every code block declares its environment** (PowerShell vs WSL vs QEMU vs U-Boot).
   The learner must never have to guess where to type something.
7. Icons are **inline SVG** only. No icon fonts, no `<img>`, no external sprite sheet —
   `file://` must work offline and icons must recolour with the theme.
8. **Typography and UI/UX are requirements, not polish.** The user explicitly asked for
   appropriate typeface and font sizes, the best possible UI/UX for a learner, and a
   unified feel throughout. Treat a readability regression as a bug of the same severity
   as a broken command. See §4 "Design system".
9. **Everything must feel like one product.** Same spacing rhythm, same corner radius, same
   icon weight, same wording for the same concept, in every lesson and every screen.
10. Keep the code split into **small single-purpose modules** (`js/*.js`, `css/*.css`,
    one file per lesson). The user explicitly allowed and expected this. Never merge them
    into one large file, and never introduce a bundler to do it.
11. Do **not** run `wsl --manage Ubuntu --set-sparse true --allow-unsafe` — risk of ext4
    corruption in the user's build tree.
12. **All code is English — always, no exceptions.** Variable names, function names,
    filenames, comments, and printed string literals (`printf`/`echo`/log messages) inside
    every `code`/`cmdx` block must be English, in every lesson, including all future ones.
    This is independent of the surrounding lesson prose, which stays Vietnamese as always.
    A Vietnamese identifier like `chuong_trinh` or a Vietnamese `printf("Xin chao")` is a
    defect of the same severity as an unverified command. The exact scope (what counts as
    code vs. what stays Vietnamese) and what to do when renaming something an earlier lesson
    also references are in §7 "Writing rules" and §9 — skill `write-lesson`.

---

## 3. File map

```
index.html            app shell + script load order  (add one <script> per new lesson)
LO-TRINH.md           the 70-lesson roadmap — single source of truth for scope
README.md             user-facing overview + status count
CLAUDE.md             this file — §0 says where the other sections live
docs/
  environment.md      §10  verified environment facts. Check before probing the machine
  running-commands.md §9.1 pre-flight, Git Bash/WSL gotchas, temp-file cleanup
  course-notes.md     §12.1 per-module continuity + the Chặng NN cross-reference map
  product-mark.md     §3.1 logo / topbar tile / favicon — all three must change together
.claude/skills/
  write-lesson/       §5–§9   lesson shape, blocks, anatomy, figures, checklist
  write-exercise/     §13     exercise sets: parts, trục, grading, data contract
  progress-storage/   §14     Firestore: schema, optimistic write, offline lock, rules
css/
  tokens.css          design tokens: colour, font, spacing.  ONLY place to define them
  base.css            reset + typography
  layout.css          topbar, sidebar, toc, breakpoints
  components.css      every content block style
  exercise.css        the exercise page only — parts, item cards, reveal states
js/
  icons.js            inline SVG icon set
  toast.js            transient failure notice, bottom-right — see §14
  store.js            state: machine prefs in localStorage, progress in RAM only — see §14
  registry.js         COURSE skeleton (14 modules / 70 lessons) + Lesson registry
  render.js           data -> HTML.  THE consistency engine
  search.js           in-memory full-text index, diacritic-insensitive
  exercises.js        exercise registry, PARTS/KINDS, per-set progress — see §13
  render-ex.js        data -> HTML for exercise pages. THE grading engine — see §13
  cloud.js            Firestore: the only home of progress, lazy-loaded — see §14
  account.js          the username modal + topbar sync dot — see §14
  app.js              hash routing, sidebar, toc, quiz, copy buttons
lessons/
  bai-01.js  bai-02.js  bai-03.js       one file per lesson, self-registering
exercises/
  bt-01.js                              one file per exercise set, self-registering
firebase/
  firestore.rules     username whitelist + document shape.  Deploy by hand — §14.7
assets/
  favicon.svg         hand-copy of the topbar .brand__mark tile — see §3.1
  favicon.ico         same geometry at 16/32/48 px, for browsers ignoring the SVG
tools/
  check.js            structure + render validator.  `node tools/check.js`
```

---

## 4. The core architectural rule

**Lesson content is data, never HTML.**

Every lesson is a plain object passed to `Lesson.register()`. `js/render.js` turns that
object into HTML. Because all lessons flow through the same renderer, they are
*structurally incapable* of drifting apart in style. This is how requirement #4 is met.

Therefore:

- **Do not** hand-write `<div class="...">` markup in a lesson file.
- **Do not** add inline `style=` attributes.
- **Do not** add per-lesson CSS.
- If a lesson needs a visual you cannot express, **add a block type to `render.js` and a
  style to `components.css`** so every future lesson can use it too. Never one-off it.
- Colours, sizes and spacing live in `css/tokens.css`. Never hard-code a hex value.

Rich text *inside* text fields (`x`, `items`, table cells, `notes`, and **both** columns of
`cmdx`) may use `<b>`, `<i>`, `<code>`, `<kbd>`, `<ul>`, `<p>`. The `code` field of a `code`
block is HTML-escaped automatically — write commands verbatim there.

The `cmdx` token column is rich text too, so a literal `<` or `&` in a token must be written
`&lt;` / `&amp;` (a literal `>` is fine). `tools/check.js` fails the build on an unescaped
one. It used to be escaped automatically, but every lesson from 8 onward was written against
the opposite assumption — 411 tokens wrapped in `<code>` — so the renderer was changed to
match the lessons rather than the other way round. `.cmdx__tok code` deliberately strips its
own background and border: the whole column is already mono + accent, so a nested `<code>`
must not draw a second chip.

The same rule governs exercise sets (§13, skill `write-exercise`): an exercise set is data,
`js/render-ex.js` is its renderer.

### Design system — the other half of the consistency rule

The renderer keeps *content* consistent; `css/tokens.css` keeps *appearance* consistent.
These values were chosen deliberately for long-form Vietnamese technical reading. Do not
change them to fix a one-off layout problem — fix the layout instead.

| Token | Value | Why this value |
|---|---|---|
| `--font-sans` | Segoe UI Variable Text → system stack | System fonts render Vietnamese diacritics correctly and need no network |
| `--font-mono` | Cascadia Mono → JetBrains Mono → system | Distinguishable `0/O` and `1/l/I` — mandatory when copying commands |
| `--fs-body` | `1.0625rem` (17px) | 16px is too small for a beginner reading 40-minute technical prose |
| `--fs-ui` | `0.875rem` (14px) | Sidebar, buttons, code — chrome must not compete with content |
| `--fs-2xl` / `--fs-xl` | 28px / 22px | `h2` / `h3`; the scale is ~1.2 around a 16px base |
| `--lh-relaxed` | `1.78` | **Critical.** Vietnamese stacks tone marks above and below; tight leading makes diacritics collide |
| `--content-max` | `792px` | ≈ 75–80 characters per line, the readability sweet spot. This is why every SVG is `width="720"` |
| `--sp-*` | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 | 4px grid. Never write a raw pixel margin |
| `--sidebar-w` / `--toc-w` / `--header-h` | 304 / 236 / 58 px | Three-column shell: nav · content · in-lesson TOC |

UI/UX invariants — check these still hold after any CSS change:

- **The learner always knows where they are:** breadcrumb (`Chặng` → `Bài`, i.e.
  module → lesson), in-lesson TOC with scrollspy, prev/next at the bottom, progress ring
  in the topbar.
- **The learner always knows where to type:** every `code` block carries an environment badge.
- **Nothing costs a round trip:** search, theme and the rendering itself are local. Progress
  is the one exception and it is deliberate — §14.
- Search must stay diacritic-insensitive (`normalize('NFD')`) — typing `tien trinh` has to
  match `tiến trình`.
- **Terminal colours stay constant across light and dark themes.** A command block should
  look like a terminal in both, so the learner's eye locks onto it.
- **Keyboard reachable:** `/` focuses search, skip-link first in tab order, every icon
  button has an `aria-label`.
- **Dark mode is not an afterthought.** Anything hard-coded instead of tokenised will break
  it — this is exactly why SVG figures may only use the `d-*` helper classes (§8).

The product mark lives in three places with no automatic link between them — `js/icons.js` →
`logo`, `css/layout.css` → `.brand__mark`, `assets/favicon.svg` — and changing any one means
changing all three **and** regenerating `assets/favicon.ico`: `docs/product-mark.md` (§3.1).

---

## 11. Numbering discipline

In lesson prose a lesson is called `Bài N` ("Lesson N") and a module `Chặng NN`
("Module NN"). The roadmap has been renumbered once and it caused a wave of broken
cross-references. Guard against a repeat:

- `LO-TRINH.md`, `js/registry.js` and every `Bài N` mention inside lesson prose must agree.
- Module numbers in prose are written **`Chặng 00`–`Chặng 13`**, matching `module.num`.
- Lesson ids are zero-padded to two digits: `bai-07`, not `bai-7`.
- `tools/check.js` catches id/number drift inside `registry.js`, but it **cannot** check
  prose cross-references. Grep for them by hand after any renumbering.
- Before writing `Chặng NN` in prose, check it against the map in `docs/course-notes.md`
  (§12.1) — the topic name and the module number do not resemble each other, and this is
  the easiest thing in the project to get wrong.
- If the roadmap changes, append to `LO-TRINH.md` §10 `Nhật ký thay đổi` ("Changelog") —
  do not rewrite history silently.

---

## 12. Current state

- **Modules 00, 01, 02, 03, 04 and 05 are complete**: `Chặng 00 — Nhập môn` ("Introduction",
  lessons 1–3), `Chặng 01 — Linux căn bản` ("Linux basics", lessons 4–13),
  `Chặng 02 — C và công cụ build` ("C and the build toolchain", lessons 14–18),
  `Chặng 03 — Lập trình hệ thống Linux` ("Linux systems programming", lessons 19–24),
  `Chặng 04 — Cross-compilation` (lessons 25–28) and
  `Chặng 05 — QEMU và luồng khởi động` (lessons 29–32) are written and rendering.
- Next lesson to write, when asked: lesson 33, `Nhiệm vụ của bootloader`, opening
  `Chặng 06 — Bootloader U-Boot`.
- `node tools/check.js` → `14 modules · 70 lessons · 32 written · OK`.
- **Exercise sets written: `bt-01` … `bt-05`.** `bt-01` has **25 items, not 28**, because
  part D (`Ôn xen kẽ`) asks about *earlier* lessons and lesson 1 has none; `DEmpty` says so
  on the page. From `bt-02` on, every set is 28. The system itself (`js/exercises.js`,
  `js/render-ex.js`, `css/exercise.css`, the `#/bt-NN` + `#/bai-tap` routes, the sidebar chip
  and the end-of-lesson CTA) was implemented 2026-08-10 and `tools/check.js` validates and
  renders every set.
- **Firestore is the only home of progress since 2026-08-10** — the storage model was
  inverted on that date at the user's instruction. `done`, `quiz` and every exercise answer
  live on the server and in RAM, never in `localStorage`; only theme, sidebar-collapse,
  open-module and the username stay local. Every action paints first, writes with a 6 s
  deadline, and **rolls the UI back** if the write fails. Until server data arrives the page
  shows `—` and locks every control. Details: §14, skill `progress-storage`.
- **Schema v3 rules are written but NOT yet deployed or re-tested.** Every write is
  permission-denied until the user pastes `firebase/firestore.rules` into the Firebase
  console — which is the pinned-`v` design working as intended. `progress/shinarus` is still
  **v1 on disk**; `ensureShape()` rewrites it on first connect, no migration script needed.
  Re-test procedure: §14.6b.
- Per-module content decisions that a new lesson must not contradict — who owns which topic,
  which numbers are already spent, which programs must not be reintroduced — are in
  `docs/course-notes.md` (§12.1). Read it before writing a lesson; the `trục` already spent
  are in §13.8, skill `write-exercise`.

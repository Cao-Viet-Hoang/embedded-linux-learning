# CLAUDE.md

Working conventions for this repository. Read this before writing anything.

**This file is written in English.** The only Vietnamese in it is quoted literal strings —
field values, heading text, terminology — that lesson files must reproduce **verbatim**.
Those are data, not prose: do not translate them, and do not translate them in the lessons
either. Every one is glossed in English on the spot.

---

## 1. What this project is

A zero-dependency web app that teaches **Embedded Linux in Vietnamese**, from absolute
beginner to employable engineer, with **no hardware required** — all practice runs on
WSL2 + QEMU.

| | |
|---|---|
| Learner | Complete beginner at Linux *and* embedded Linux. Already knows Git. |
| Language | **All learner-facing content is Vietnamese.** Only `CLAUDE.md` is English. |
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
user's explicit instruction; §14 spells out what it cost and why it is not negotiable.

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
    defect of the same severity as an unverified command. See §7 "Writing rules" for the
    exact scope (what counts as code vs. what stays Vietnamese) and §9 for what to do when
    renaming something an earlier lesson also references.

---

## 3. File map

```
index.html            app shell + script load order  (add one <script> per new lesson)
LO-TRINH.md           the 70-lesson roadmap — single source of truth for scope
README.md             user-facing overview + status count
CLAUDE.md             this file
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

### 3.1 The product mark

There is exactly **one** mark: a terminal prompt `>_`, white, on a rounded tile filled with
`linear-gradient(140deg, var(--primary), var(--accent))`. It appears in the topbar and as the
favicon, and it must look identical in both. Tux was dropped because its line art is
illegible once scaled to a 16px browser tab, which guaranteed the two would keep drifting.

It lives in **three** places that have no automatic link between them:

| Place | What it holds |
|---|---|
| `js/icons.js` → `logo` | the glyph, in a 24×24 box, `stroke-width` 3.12 / 2.64 |
| `css/layout.css` → `.brand__mark` | the tile: 32px, `--r-md`, the gradient. The svg is sized 32px so the icon's own padding becomes the tile inset |
| `assets/favicon.svg` | both, redrawn in a 32×32 box — glyph coords are the icon's × 32/24, gradient axis is the 140° CSS angle resolved to `x1/y1/x2/y2` |

Changing any one of them means changing all three **and** regenerating `assets/favicon.ico`.
The `.ico` is not built by a script in the repo — `tools/check.js` stays the only Node file
and it is a test, never a build step. Regenerate it by writing a throwaway rasteriser
(rounded-rect + segment SDFs, 4×4 supersampling, 32-bit BGRA DIBs at 16/32/48) and deleting
it afterwards.

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
- **Nothing costs a round trip:** search, progress, theme and quiz state are all local.
  Search must stay diacritic-insensitive (`normalize('NFD')`) — typing `tien trinh` has to
  match `tiến trình`.
- **Terminal colours stay constant across light and dark themes.** A command block should
  look like a terminal in both, so the learner's eye locks onto it.
- **Keyboard reachable:** `/` focuses search, skip-link first in tab order, every icon
  button has an `aria-label`.
- **Dark mode is not an afterthought.** Anything hard-coded instead of tokenised will break
  it — this is exactly why SVG figures may only use the `d-*` helper classes (§8).

---

## 5. Lesson object shape

```js
Lesson.register({
  id: 'bai-04',                 // MUST match js/registry.js exactly
  title: 'Shell và cấu trúc một câu lệnh',   // MUST match registry.js character for character
  minutes: 40,                  // realistic reading time
  practice: 'Thực hành 20 phút',             // "Practice, 20 minutes" — keep this wording
  level: 'Người mới bắt đầu',                // "Beginner". Only other legal values:
                                             // 'Trung cấp' (Intermediate), 'Nâng cao' (Advanced)
  intro: '...',                 // 3–5 sentences, hooks the learner, may contain HTML
  goals: ['...', '...'],        // 4–6 items, each starts with a verb, each testable
  blocks: [ /* see §6 */ ],
  quiz: [
    { q: 'Câu hỏi?', opts: ['A', 'B', 'C', 'D'], a: 2, why: 'Giải thích vì sao.' }
    //  ^ question    ^ options                    ^ index   ^ why that answer is right
  ]
});
```

`a` is a **zero-based index** into `opts`. `why` is mandatory and must teach, not just
confirm — restate the underlying principle.

---

## 6. Block types

| `t` | Purpose | Fields |
|---|---|---|
| `h2` `h3` `h4` | Headings. `h2`/`h3` auto-populate the table of contents | `x` |
| `p` | Paragraph | `x`, `muted` |
| `list` | Bullet or numbered list | `items`, `ordered` |
| `code` | Terminal / file block with an environment badge | `where`, `code`, `lang`, `name`, `notes`, `nocopy` |
| `cmdx` | Per-flag command dissection table | `cmd`, `title`, `rows: [[token, desc, extra?]]` |
| `cal` | Callout box | `kind`, `title`, `x` |
| `table` | Table | `head`, `rows` |
| `steps` | Numbered practice steps, each containing nested blocks | `items: [{title, blocks}]` |
| `fig` | SVG diagram | `svg`, `cap` |
| `terms` | Glossary | `items: [[term, abbrev, desc]]` |
| `recap` | End-of-lesson summary | `title?`, `items` |
| `hr` `html` | Divider / escape hatch (avoid `html`) | — |

**`where` values** — pick honestly, the badge is a promise to the learner:

| value | badge | meaning |
|---|---|---|
| `ps` | PowerShell | run in a normal PowerShell window |
| `psadm` | PowerShell Admin | needs elevation |
| `wsl` | WSL | run inside Ubuntu — the default for ~90% of blocks |
| `qemu` | QEMU | typed at the `(qemu)` monitor prompt |
| `uboot` | U-Boot | typed at the U-Boot prompt inside the VM |
| `file` | File | this is file *content* to create, not a command |
| `out` | Output | real captured output. Always set `nocopy: true` |

**`cal` kinds** — each has a distinct job, do not use them interchangeably:

| kind | use for |
|---|---|
| `why` | **The most important one.** Explains the reason behind a command or design choice |
| `info` | Extra depth, a number worth remembering, a "what just happened" |
| `tip` | Practical shortcut, memory aid, mental model |
| `warn` | Common trap that costs time |
| `danger` | Something that breaks the machine or wastes hours |

---

## 7. Lesson anatomy

Every lesson follows this arc. Keep the order.

1. **`intro`** — why this lesson exists, framed around a problem the learner will recognise.
2. **`goals`** — 4–6 concrete, testable outcomes.
3. **Theory sections (`h2`)** — 3–6 of them. Interleave `p`, `table`, `fig`, `terms`, `cal`.
4. **`h2` "Thực hành: …"** *(= "Practice: …")* — one `steps` block, 4–6 steps. Each step:
   `p` (what and why) → `code` (the command) → `code where:'out'` (real output) →
   `cmdx` (dissect any non-trivial command) → `cal` (what just happened / why it matters).
5. **`h2` "Lỗi thường gặp"** *(= "Common errors")* — a `table` whose header is exactly
   `Thông báo | Nguyên nhân | Cách xử lý` *(= Message | Cause | Fix)*.
   Include errors actually hit while verifying the commands.
6. **`recap`** — 6–8 bullets. Bold the numbers and the terms.
7. **`cal kind:'info'` or `'tip'` titled "Bài tiếp theo"** *(= "Next lesson")* — one
   paragraph teasing the next lesson, naming something concrete it will prove or measure.
8. **`quiz`** — 5–6 questions. At least one must be diagnostic ("you see symptom X, what is
   the most likely cause?"), not just recall.

### Writing rules

- **Verified numbers beat adjectives.** Write a measured figure — `chậm hơn 52 lần`
  ("52× slower") — never a vague one like `chậm hơn nhiều` ("much slower").
- **Dissect every non-obvious command** with `cmdx`. A beginner should never meet an
  unexplained flag.
- **Show the failure on purpose** when the failure teaches something. Lesson 3 makes the
  learner hit `Exec format error` deliberately, then explains why that is the correct outcome.
- **Cross-reference forward and backward**, e.g. `Bài 17 sẽ phân tích kỹ` ("lesson 17 will
  analyse this in depth") and `như bạn đã kiểm chứng ở Bài 1` ("as you verified in lesson 1").
  This is what makes 70 lessons feel like one course rather than 70 articles.
- Address the learner in the second person singular, `bạn` ("you"). Never use `chúng ta`
  ("we") for an action only the learner performs.
- No filler, no hype, no emoji in lesson content.
- Prefer a table over three paragraphs when comparing things.
- **Code is English, prose is Vietnamese — never mix the two inside an identifier.** Inside
  a `code`/`cmdx` block's `code`/`cmd`/`cmd`-column fields: every variable, function,
  filename, comment, and printed string literal must be English (`counter`, `read_sensor.c`,
  `printf("done\n")`), never a Vietnamese word written with or without diacritics
  (`bo_dem`, `doc_cam_bien.c`, `printf("xong\n")`). This applies retroactively too — if you
  touch a lesson that predates this rule, fix any Vietnamese identifiers you encounter in
  the blocks you're editing rather than leaving them.
  - **Exception — meta-syntax placeholders stay Vietnamese.** A generic stand-in used only
    in prose/table/`cmdx`-explanation text to mean "a command" or "a filename" in the
    abstract (`<lệnh>`, `$đường_dẫn`, `TÊN_FILE` used as a syntax template, e.g.
    `chmod [tuỳ chọn] CHẾ_ĐỘ FILE...`) is documentation, not an identifier a learner will
    actually type into a real, executed program — leave it Vietnamese like the rest of the
    prose. The line: if it's inside a string that gets written to a file and compiled/run,
    it's code (English); if it's inside a sentence explaining syntax in the abstract, it's
    prose (Vietnamese).
  - **When you rename something across lessons**, grep the *other* lesson files for the old
    name too — lessons cross-reference each other's example files/output by name (e.g.
    "như `cong.o` ở Bài 15"), and a rename in one lesson without updating the others'
    mentions is a stale cross-reference, not a finished rename.

---

## 8. SVG figures

Every `fig` must:

- use `viewBox="0 0 720 H"` and `width="720"` — 720 is the content column width;
- carry `role="img"` and a descriptive `aria-label`;
- have a `cap` that states the *takeaway*, not just what is drawn;
- use **only** the shared helper classes below, so figures re-colour correctly in dark mode.

| class | use |
|---|---|
| `d-box` | neutral box |
| `d-box-p` | primary / emphasis box |
| `d-box-a` | accent box |
| `d-box-g` | "good / fast / success" box |
| `d-box-w` | "warning / slow / caution" box |
| `d-t` | label text, 13px, weight 600 |
| `d-ts` | small text, 11px, muted — for prose annotations |
| `d-tm` | monospace 11px — **only** for literal identifiers, paths, versions |
| `d-line` | connector line |
| `d-arrow` | arrowhead (a filled `<path>`) |

Never put a `fill=`, `stroke=` or `font-` attribute on an SVG element. `d-tm` on ordinary
Vietnamese prose is a bug — use `d-ts`.

Two to three figures per lesson is right. Good figure subjects: sequences and handoffs,
layered architectures, side-by-side comparisons, symptom→cause tables.

---

## 9. Adding a lesson — checklist

1. Read the lesson's entry in `LO-TRINH.md` (§4). It defines scope, prerequisites and
   deliverables. Do not silently expand or shrink it.
2. **Pre-flight the dependencies before running anything long** — see §9.1.
3. **Verify every command on the user's machine first.** Run the whole practice section
   end to end via `Bash`, including cleanup. Capture real output. If a command fails,
   fix the lesson plan — do not paper over it. Record the failure in the lesson's
   `Lỗi thường gặp` ("Common errors") table.
4. Write `lessons/bai-XX.js` following §5–§8.
5. Add `<script src="lessons/bai-XX.js"></script>` to `index.html`, **before** `js/app.js`.
6. Update the status table in `LO-TRINH.md` §9 and the `Bài đã viết: N / 70`
   ("Lessons written: N / 70") line in `README.md`.
7. Run `node tools/check.js`. It must print `OK`.
8. Check every `Bài N` / `Chặng NN` cross-reference you wrote actually points at the right
   lesson in `registry.js`.

### 9.1 Pre-flight — check dependencies *before* running anything slow

**Rule: never start a long command to find out what is missing.** Find out first, in
seconds, then start it once. A build that dies at minute 52 on a missing package costs the
user an hour of wall clock and costs the session its context.

This is not a suggestion. Lesson 28 was built **twice** — a 62-minute build failed at step
17/19 with `configure: error: unable to find python program`, purely because
`python-is-python3` was not installed. One `command -v python` up front would have prevented
it.

Before any command that can run longer than ~30 seconds — a compile, a `ct-ng build`, a
kernel build, a Buildroot/Yocto run, a QEMU boot, a large `apt-get` — run **one** cheap
probe script that answers all of these at once:

| Check | How | Why it bites |
|---|---|---|
| Packages present | `dpkg -s <pkg> 2>/dev/null \| grep -c '^Status: install ok'`, or `apt policy <pkg>` | The usual cause of a late failure |
| Binaries on `PATH` | `command -v gcc make bison flex makeinfo python …` | A package can be installed under a *different binary name* — Ubuntu ships `python3`, not `python` |
| Versions | `--version \| head -n 1` for each tool | Lessons quote exact versions; also catches "installed but too old" |
| Disk | `df -h ~ \| tail -n 1` | `.build` for a toolchain peaks at **18 GB** |
| Cores / RAM | `nproc`, `free -h` | Decides the `-jN` you pass, and whether `-jN` will thrash |
| Devices / features | `ls /dev/kvm`, `qemu-system-aarch64 -accel help`, `qemu-system-aarch64 -M help \| grep …` | A machine or accel that does not exist fails instantly but only *after* you have written the lesson around it |

Practical shape of it:

- Write **one** temp probe script with `Write`, run it, read the whole result. Do not fire
  six separate `Bash` calls — each one costs a round trip.
- Have the probe **print a verdict**, not just raw output: e.g. `MISSING: texinfo, python`.
  It is much easier to act on, and much cheaper to re-read later.
- Have the probe be **non-destructive and idempotent**. It must be safe to re-run.
- If anything is missing, install it and **re-run the probe** before starting the long
  command. Do not install and assume.
- Re-check §10 first — a fact already recorded there does not need re-probing. Add anything
  new the probe taught you *to* §10 so the next session skips the probe entirely.

Two traps that pre-flighting alone does not catch, both hit for real in lesson 28:

- **A cached `configure` result outlives the fix.** Installing the missing package is not
  always enough: `crosstool-ng-1.28.0/paths.sh` had already cached `export python=""` from
  the first `./configure`. The fix had to be `./configure --enable-local && make` again.
  After installing a dependency, **re-run whatever detected it**, not just the failing step.
- **Resumability must be switched on before the build, not after.** `ct-ng <step>+` refuses
  to resume unless `CT_DEBUG_CT_SAVE_STEPS` was already set when the build started. For any
  multi-hour job, turn on checkpointing/logging *in the pre-flight*, while it is still free.

### Running commands on the user's machine — known gotchas

The shell is Git Bash on Windows driving `wsl.exe`. These bite every time:

- Prefix with `MSYS_NO_PATHCONV=1` when passing Unix paths to `wsl`, or Git Bash rewrites
  `/mnt/c/...` into `C:/Program Files/Git/mnt/c/...`.
- Vietnamese text, `$(...)`, `awk '{print $5}'` and `time (...)` all break when nested
  through `wsl -d Ubuntu -- bash -lc '...'`. Write the script to a temp file with `Write`
  and run the file instead. Delete the temp file afterwards.
- QEMU: `-nographic` conflicts with `-monitor stdio`. Use
  `-display none -serial null -monitor stdio` instead.

### Cleaning up temporary files

**After verifying a lesson or exercise set, delete all temporary files created during the
process.** This includes:

- **Temporary probe scripts** written for dependency checking (e.g., `tmp-probe-*.sh`)
- **Scratch output files** created during testing (e.g., object files, binaries, test outputs)
- **Build artifacts** and `.build` directories
- **Temporary directories** created during practice (e.g., scratch folders in `$HOME`)

Cleanup applies to **both** locations:

1. **In the Git repository** (`/mnt/c/...`): Use `git status` to verify no scratch files are
   staged or tracked. Delete them with `rm` or from Windows Explorer.
2. **In WSL/Ubuntu** (`/home/shinarus`): Run cleanup commands in the WSL terminal to remove
   temporary directories and files. Do not leave behind practice artifacts that will confuse
   a later session.

**Exception:** Some lessons deliberately create output that the next lesson depends on. Check
the lesson notes in §12 — for instance, lesson 32 creates `~/bai32/` that lesson 33 expects.
Do not delete those directories; they are part of the course continuity. If in doubt, ask
before deleting.

When writing a probe script, give it a name like `tmp-probe-lesson-XX.sh` so it is obvious
it is temporary. When you are done testing, delete it.

---

## 10. Verified environment facts

Measured on the user's machine. Reuse these; re-verify before contradicting them.

| Fact | Value |
|---|---|
| Windows | 11 Home Single Language, 10.0.22631 |
| WSL | 2.7.11.0, kernel `6.18.33.2-microsoft-standard-WSL2` |
| Distro | Ubuntu **26.04 "resolute"**, WSL version 2. Login user **`shinarus`**, `$HOME` = `/home/shinarus` |
| Shells | `bash` **5.3.9(1)-release**; `/bin/sh` → **`dash`** |
| Coreutils | **uutils** (Rust) — `/bin/ls` and `/usr/bin/[` symlink into `/usr/lib/cargo/bin/coreutils/`, package `coreutils-from-uutils` |
| Packages | 776 installed, 2524.9 MB; `dpkg --print-architecture` = `amd64` |
| CPUs / RAM | 6 CPUs via `.wslconfig` (`nr_cpus=6` in cmdline). `MemTotal` = **5 036 144 kB ≈ 4.8 GiB** (re-measured 2026-08-08 — the older "8 GB" figure was the Windows-side allocation, not what the guest sees) |
| `/proc/cmdline` | `initrd=\initrd.img WSL_ROOT_INIT=1 panic=-1 nr_cpus=6 … console=hvc0 debug …` |
| Kernel boot time | `Freeing unused kernel image (initmem) memory: 4852K` at **0.376880 s** |
| Userspace boot time | `Startup finished in 2.456s (userspace)` |
| PID 1 | systemd |
| `/boot` | **empty** — no bootloader in WSL2 |
| Filesystem penalty | 500 × `touch`: `~` = **0.017 s**, `/mnt/c` = **0.882 s** → **52×** |
| `/dev/kvm` | exists (`crw-rw---- 1 root kvm 10, 232`) |
| `qemu-system-aarch64 -accel help` | lists **`tcg` only** — ARM64 on x86 is always emulation |
| Cross compiler | `aarch64-linux-gnu-gcc` 15.2.0; `arm-linux-gnueabihf-gcc` also installed |
| Toolchain versions | GCC **15.2.0** (`Ubuntu 15.2.0-16ubuntu1`), defaults to **C23**; GNU Make **4.4.1**; glibc **2.43** |
| Static vs dynamic hello | x86 dynamic **15,952 B**; x86 `-static` **816,912 B** (**51.2×**); ARM64 `-static` **705,328 B** |
| Shared-library facts | `libc.so.6` = **2,186,512 B**; `ldconfig -p` lists **485** libraries; static-vs-dynamic break-even ≈ **3** programs |
| ELF sample (lesson 18) | dynamic **16,184 B**; `.bss` **16,424 B** = `MemSiz − FileSiz` (0x4298 − 0x270); same program with a 1 MB *initialised* array → **1,064,584 B** (**65.8×**) |
| `strip` gain | static binary 817,000 → **735,512 B** = **10.0 %**; `-ffunction-sections -Wl,--gc-sections` on a 5-function program: 16,112 → 15,856 B = only **1.6 %** |
| Parallel make | `-j6` on 6 cores is **2.6×**, not 6× — link step is serial and gcc processes contend for header reads |
| Installed | `qemu-system-arm`, **`qemu-user`** (`/usr/bin/qemu-aarch64` — installed 2026-08-08 for lesson 29; §10 previously said otherwise), `gcc-aarch64-linux-gnu`, `gdb-multiarch`, `device-tree-compiler`, `u-boot-tools`, `tree`, `gpiod` + `libgpiod3` |
| Not installed | `qemu-system-x86_64`, `shellcheck`, `pahole` |
| QEMU version | **10.2.1** (`Debian 1:10.2.1+ds-1ubuntu3.2`), both `qemu-system-aarch64` and `qemu-aarch64`. `-M help` lists **113** ARM machines (114 lines incl. header); `virt` is an alias of **`virt-10.2`** |
| QEMU `virt` | has **no I2C/SPI bus** (`No 'i2c-bus' bus found`). `grep -icE 'i2c\|spi\|mmc\|sdhci\|usb\|ethernet'` on its dumped `.dts` → **0** for every term. Lesson 58 must use `i2c-stub` / `gpio-sim` / SPI loopback, or switch machine to `raspi3b` (`bcm2835-i2c`) / `mcimx7d-sabre` (`imx.i2c`) — both accept `-device tmp105`, but **neither supports `-machine dumpdtb`** (`This machine doesn't have an FDT`) |
| `virt` memory map (lesson 30) | flash `0x00000000` (2×64 MiB), GIC dist `0x08000000`, GIC cpu `0x08010000`, PL011 `0x09000000`, PL031 RTC `0x09010000`, fw-cfg `0x09020000`, PL061 GPIO `0x09030000`, **32** virtio-mmio slots `0x0a000000`→`0x0a003e00` step `0x200`, PCIe ECAM `0x10000000`, RAM `0x40000000` |
| `virt` device tree (lesson 30) | `dumpdtb` file is always exactly **1 048 576 B** (`totalsize` header field says the same); `dtc -I dtb -O dts` → **393** lines (391 after stripping `rng-seed`/`kaslr-seed`). `-m 1G` changes **1** line; `-M virt,gic-version=3` changes **16**; `-smp 2` changes **35** (phandle renumbering cascade). `-device virtio-net-device` / `virtio-blk-device` change **0** lines — the 32 slots are pre-declared |
| Bare-metal ARM64 (lesson 30) | `hello.S` + `link.ld` at `. = 0x40080000`, built `-nostdlib -static -Wl,-T,link.ld`: `.text` **105 B**, ELF **66 504 B**, entry `0x40080000`. Runs under `-kernel`, prints via PL011, parks in `wfi`. `info registers` → `PC=0x4008001c`, `X01=0x09000000`. `info jit` on it: TB count **6**, avg target **7 B**, avg host **158 B**, **expansion ratio 21.6** (vs **3.48** user-mode in lesson 29 — softmmu + MMIO + very short TBs) |
| Self-built toolchain (lesson 28) | crosstool-NG **1.28.0** (`ct-ng` tarball **2 448 288 B**) → `~/x-tools/aarch64-unknown-linux-musl`, **354 MB**, **34** tools in `bin/`, dir left `dr-xr-xr-x` by `CT_PREFIX_DIR_RO`. GCC **15.2.0**, binutils **2.45**, gdb **16.3**, musl **1.2.5**, kernel headers **6.16**, all stamped `(crosstool-NG 1.28.0)` |
| crosstool-NG build cost | total of all steps **3 591 s** (≈62 min wall on 6 cores, `build.6`). `cc_core` **860.44 s** + `cc_for_host` **1 066.55 s** = **53.7 %**; musl itself only **37.72 s** (**1.1 %**); tarball download **513.78 s**; cross-gdb **470.93 s**. `.build` peaks at **18 GB** with save-steps on; `build.log` **41 704 605 B** |
| musl vs glibc, same `temp_daemon.c` | `-static`: musl **108 720 B**, glibc **787 032 B** = **7.24×**. After `strip`: **42 512** vs **655 288** = **15.4×** (musl loses **60.9 %**, glibc only **16.7 %**). `size`: `.text` **39 300** vs **626 361**, `.bss` **1 792** vs **22 680**. musl dynamic **14 144 B**, interp `/lib/ld-musl-aarch64.so.1` |
| Prebuilt ARM64 kernel (lesson 32) | Debian trixie `linux-image-6.12.94+deb13-**cloud**-arm64_6.12.94-1_arm64.deb` = **27 985 180 B** → `boot/vmlinuz-…` = **30 771 136 B**, `file` says `Linux kernel ARM64 boot executable Image, little-endian, 4K pages`. The non-cloud variant is **92 732 600 B** deb / **37 605 312 B** image — cloud is smaller and boots `virt` fine. Find the current version with `curl -s https://deb.debian.org/debian/dists/trixie/main/binary-arm64/Packages.gz \| zcat \| awk …` (old versions get pulled from the pool) |
| Lesson 32 initramfs | `busybox-static_1.38.0-3_arm64.deb` **860 056 B** → binary **1 980 944 B**, static, stripped, **280** applets. 7-entry tree (`/init`, `/bin/busybox`, `/bin/sh`→busybox, `/dev`, `/proc`, `/sys`, `.`). Raw cpio `newc` is **always 1 982 464 B** (`3872 blocks`); the **gzip -9 result is NOT reproducible across rebuilds** — measured 1 035 400 / 1 035 399 / 1 035 396 B, because cpio headers embed inode numbers and mtimes. Repacking the *same* tree 3× is byte-identical |
| Lesson 32 boot | `-M virt -cpu cortex-a57 -m 512 -kernel Image -initrd … -append "console=ttyAMA0 rdinit=/init" -nographic` → **238** log lines, stable marker line numbers **2** `Linux version`, **5** `Machine model: linux,dummy-virt`, **38** `Kernel command line`, **90** `Memory: 411880K/524288K available (14272K kernel code, 2784K rwdata, 10748K rodata, 2112K init, 908K bss, 43816K reserved, 65536K cma-reserved)`, **115** `printk: legacy console [ttyAMA0] enabled`, **156** `Trying to unpack rootfs image as initramfs...`, **162** `Freeing initrd memory: 1008K`, **229** `Run /init as init process`. `Run /init` timestamp is **not** stable — measured 1.61 s / 1.71 s / 2.06 s / 3.27 s depending on host load. Guest `MemTotal: 483592 kB` |
| Lesson 32 failure modes (all hit for real) | no `-initrd` → `VFS: Cannot open root device "" … error -6` then `Kernel panic … VFS: Unable to mount root fs on unknown-block(0,0)`; `rdinit=/sbin/init` (nonexistent) → **the same panic, no distinct message**; `--format=odc` → `Initramfs unpacking failed: incorrect cpio method used: use -H newc option` then same panic; `/init` without `+x` → **boots to a shell anyway** (kernel falls through to `/bin/sh`), no `procfs`, no applet symlinks; `init` that returns → `Kernel panic … Attempted to kill init! exitcode=0x00000000`; no `console=` → still **15 351 B** of log because `chosen/stdout-path = "/pl011@9000000"`; default `-cpu` with a real `Image` → **silent hang, 69 B, rc=124** (no error message at all, unlike the ELF case in lesson 31) |
| initrd page-rounding (lesson 32) | `linux,initrd-end − linux,initrd-start` = the initramfs file size **exactly**. But `Freeing initrd memory:` reports the page-aligned-down span: end `0x480fcc84` → `0x480fc000`, i.e. `0xfc000` = 1 032 192 B = **1008 KiB** |
| crosstool-NG gotchas (all hit for real) | gdb step needs a binary literally named `python` (`python-is-python3`); `paths.sh` caches `export python=""` from the first `./configure`, so re-run `./configure --enable-local && make` after installing it. `ct-ng <step>+` refuses to resume unless `CT_DEBUG_CT_SAVE_STEPS` was on *before* the build, and refuses if `.config` changed since |

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
- **Firestore is the only home of progress since 2026-08-10** — the storage model was
  inverted on that date at the user's instruction and §14 was rewritten around it. `done`,
  `quiz` and every exercise answer live on the server and in RAM, never in `localStorage`;
  only theme, sidebar-collapse, open-module and the username stay local. Every action paints
  first, writes with a 6 s deadline, and **rolls the UI back** if the write fails
  (`Store.commit()` → `Toast.writeFailed()`). Until server data arrives the page shows `—`
  and locks every control (`body.is-nodb`). Files: `js/store.js` (rewritten), `js/cloud.js`
  (rewritten), `js/toast.js` (new), `js/account.js`, `js/app.js`,
  `firebase/firestore.rules`.
- **Schema v3** (2026-08-10) adds `progress/{user}/ex/{bt-NN}` and moves writes from
  whole-document `set()` to field-level `update()`. **The v3 rules are written but NOT yet
  deployed or re-tested** — every write is permission-denied until the user pastes
  `firebase/firestore.rules` into the console, which is the pinned-`v` design working. The
  v2 suite passed 24/24 on 2026-08-09; re-run it against `progress/elx-probe`, now including
  the subcollection (§14.6b). `allowed()` holds `shinarus` and `elx-probe`.
  `progress/shinarus` is still **v1 on disk**; `ensureShape()` rewrites it on first connect,
  no migration script needed.
- **The exercise system (§13) is implemented** (2026-08-10): `js/exercises.js`,
  `js/render-ex.js`, `css/exercise.css`, the `#/bt-NN` + `#/bai-tap` routes, the sidebar
  chip and the end-of-lesson CTA. `tools/check.js` validates and renders every set (§13.7).
  **Written so far: `bt-01` … `bt-05`.** `bt-01` has **25 items, not 28**, because part D
  (`Ôn xen kẽ`) asks about *earlier* lessons and lesson 1 has none; `DEmpty` says so on the
  page. From `bt-02` on, every set is 28. Exercise state lives in `progress/{user}/ex/{bt-NN}`
  since 2026-08-10 (§14.3).
- **Trục already spent.** Per §13.4 step 4 a concept may be spiralled **once in the whole
  course**, so none of these may become a trục again — in later sets they belong in part D:

  | Set | The three trục |
  |---|---|
  | `bt-01` | MMU is the hard boundary (not RAM size) · the four pieces run in sequence, so "where did it die" is deducible · hardware does not announce itself, Device Tree declares it |
  | `bt-02` | DRAM is not usable at reset, hence SRAM and an SPL · each stage hands over and then *disappears* · `bootargs` is the one channel to the kernel |
  | `bt-03` | virtualisation needs the *same* architecture, emulation does not · the two QEMU families solve different problems · `/mnt/c` is a filesystem boundary, and it is the slow one |
  | `bt-04` | `$?` is the machine's only answer to "did that work" · a builtin is not a file on disk · the shell splits on whitespace *before* the command ever sees the arguments |
  | `bt-05` | `/proc` and `/sys` are generated at read time · a file in `/dev` holds no data, major/minor point elsewhere · an empty directory in a rootfs is a mount point |
- Module 05 splits ownership deliberately, to avoid overlap — keep it that way:
  lesson 29 is **TCG internals via user-mode only** (`qemu-aarch64`, `-d in_asm/out_asm/exec`,
  `-one-insn-per-tb`, `-d nochain`); lesson 30 is **the machine model** (memory map, device
  tree, `info mtree -f` / `info qtree` / `info jit`, the 105-byte bare-metal PL011 program);
  lesson 31 is **the command line itself** (four groups of options, the chardev model,
  `-s -S` + `gdb-multiarch` on lesson 30's `hello.elf`); lesson 32 is **a real Linux kernel**
  (prebuilt Debian `Image` + a hand-built initramfs, read the boot log).
- Lesson 32's practice **creates** `~/bai32/` (**135 MB**) holding `Image`,
  `initramfs.cpio.gz` and `run.sh`. **Module 06 is promised these exact files** — U-Boot will
  be made to load them. Once the user has done the practice, do not tell them to delete that
  directory. It does **not** exist yet: the scratch copy built while verifying lesson 32 was
  removed at the user's request on 2026-08-09, so check before assuming the files are there.
- Module 04 runs one thread ending in a self-built toolchain: why cross-compile (25) →
  toolchain anatomy (26) → first ARM64 binary + `qemu-aarch64` (27) → crosstool-NG (28).
  Lesson 27's `temp_daemon.c` (from lesson 24) is recompiled in lesson 28 with musl, so
  **do not** reintroduce that program as new material in module 05.
- Lesson 27 measures the glibc static build **without** `-Wl,-z,max-page-size=4096`
  (**795 224 B**); lesson 28 uses the flag (**787 032 B**). The 8 192 B gap is two 4 KB
  pages and lesson 28 explains it — keep both numbers, they are both correct.
- Lesson 13 ends with a capstone `build.sh` (cross-compiles `hello.c` for x86 or ARM64 using
  `set -euo pipefail` + `mktemp -d` + `trap … EXIT`). Verified numbers reused from Bài 3:
  x86 dynamic **15 952 B**, ARM64 `-static` **705 328 B**, ratio **44.2×**; running the ARM64
  binary directly gives `Exec format error`, exit **126**.
- Module 02 runs one continuous thread: `gcc` → four compilation stages → `make` → `.a`/`.so`
  → ELF internals. It opens (lesson 14 intro) and closes (lesson 18 recap) on the same
  question — why static `hello` is **816 912 B** and dynamic is **15 952 B**, a **51.2×**
  gap — so do not restate that pair as a fresh discovery in module 03.
- Lesson 18 is the reference lesson for `readelf` / `objdump` / `nm` / `size` / `strip`.
  Later modules should point back to it rather than re-teaching the tools: `vmlinux` is
  ELF `EXEC` (Chặng 07), `.ko` is ELF `REL` (Chặng 10).

### Cross-reference map (grep this before writing `Chặng NN` in prose)

Module numbers are the easiest thing to get wrong, because the topic name and the module
number do not resemble each other. Verified against `js/registry.js`:

| Topic named in prose | Correct module |
|---|---|
| cross-compiler, target triplet, musl/uClibc-ng | `Chặng 04` |
| QEMU, booting a kernel image | `Chặng 05` |
| U-Boot | `Chặng 06` |
| building the kernel, Kbuild, `vmlinux`, vDSO | `Chặng 07` |
| Device Tree, `.dtb` | `Chặng 08` |
| rootfs, BusyBox `CONFIG_STATIC`, size-shrinking an image | `Chặng 09` |
| kernel modules, drivers, `.ko` | `Chặng 10` |
| Buildroot, **Yocto**, reproducible builds | `Chặng 11` |

---

## 13. Exercise sets — `Bài tập`

> **Status: implemented 2026-08-10.** `js/exercises.js`, `js/render-ex.js`,
> `css/exercise.css`, the `#/bt-NN` and `#/bai-tap` routes, `Store.getEx/setEx/setExItem/
> resetEx`, and the first content file `exercises/bt-01.js` all exist and render.
> `node tools/check.js` validates every set — see §13.7. Exercise state is stored **only on
> the server**, one document per set at `progress/{user}/ex/{bt-NN}` — see §14.3.
>
> The spec below is what the implementation was built to. When writing `bt-NN`, follow
> §13.1–§13.6 for the content and §13.7 for the data contract.

### 13.1 What it is, and the one thing it must not become

One exercise set per lesson, `bai-NN` ↔ `bt-NN`, on its own page `#/bt-NN`.

Every lesson already ends with a `quiz` — 5–6 recall MCQs. **An exercise set is not a second
quiz.** If it only asks "do you remember what the lesson said", it is redundant and should
not be written. It earns its place by making the learner *produce* something and then
*check themselves against a falsifiable criterion*.

Decisions already fixed by the user, do not re-open:

| Decision | Value |
|---|---|
| Navigation | Real page `#/bt-NN`. Reached from a chip on the lesson row in the sidebar, a CTA at the end of the lesson, and an index page `#/bai-tap` |
| Progress | **Separate.** The topbar ring keeps counting 70 lessons only. Exercise progress lives in its own store key and its own bar. Never retro-uncomplete a lesson the user already ticked |
| Content weight | **Theory-heavy** — 22 of 28 items are theory, 6 are hands-on |
| Reveal state | Hints/criteria/solutions are **not** persisted. Reload closes everything. Only the learner's typed answers and self-scores persist |

### 13.2 Structure — 6 parts, 12 types, 28 items

| Part | Type | Items | Why this type exists |
|---|---|---|---|
| **A · `Nhận biết`** *(Remember)* | `Trắc nghiệm nhanh` (4-option MCQ) | 4 | Surface the terminology again. Each must be answerable in **under 60 s** — the goal is frequency of re-encounter, not difficulty |
| | `Đúng/Sai kèm sửa` (T/F + rewrite) | 2 | Bare true/false is worthless: 50 % guess rate, nothing produced. Requiring a corrected restatement turns it into a micro-essay |
| | `Điền khuyết` (fill in the blank) | 1 | Forces **active recall** instead of recognition. Reserve for formulas and relations |
| | `Ghép nối` (matching, 5–6 pairs) | 1 | Cheapest coverage per item, and the only format that teaches the **boundary between adjacent concepts**, because the distractors sit side by side |
| **B · `Thông hiểu`** *(Understand)* | `Giải thích vì sao` (short answer) | 2 | Where the illusion of knowing collapses. Reading feels like understanding; writing three sentences proves it |
| | `So sánh cặp` (paired comparison) | 1 | Ask which difference is **the difference that matters**. People learn concepts by contrast, not by definition |
| | `Bắt lỗi phát biểu` (find the flaw) | 1 | The only type aimed at the **misconception** rather than at the correct fact — and misconceptions are what break builds |
| | `Đọc output` (interpret real output) | 2 | Given real captured output, say what it means. This is the daily job of an embedded engineer, not a paper exercise |
| **C · `Vận dụng`** *(Apply)* | `Chẩn đoán` (symptom → cause) | 2 | Highest career value in the whole set: it *is* the interview and it *is* the job. Best variant: one symptom, several possible causes |
| | `Tình huống mới` (new scenario) | 2 | Change the context — QEMU → real board, 4.8 GiB RAM → 64 MB flash. Tests whether the learner holds the principle or only the example |
| | `Tính toán / Chọn và biện minh` | 1 | Produce a number or a decision **with its justification**. The justification is what gets graded, not the choice |
| **D · `Ôn xen kẽ`** *(Interleaved review)* | `Nhắc lại bài cũ` | 3 | Questions about **earlier** lessons that this one stands on. Over a 70-lesson, 8–11-month course this is the cheapest and most effective anti-forgetting measure, and it exposes gaps while they are still cheap to patch |
| **E · `Thực hành`** *(Hands-on)* | `Dự đoán output` | 2 | Write the result **before** running, then run. The gap between prediction and reality is the strongest learning moment available — much stronger than run-then-read |
| | `Gõ lệnh` | 2 | Move from reading commands to producing them |
| | `Sửa lỗi` | 1 | Something broken, must be diagnosed. Raw material already exists: the `Lỗi thường gặp` table of every lesson |
| | `Thử thách` | 1 | Open-ended, allowed to be unsolved. Plants an unanswered question that the next lesson answers |
| **F · Diagnostic table** | `Bí ở đâu thì đọc lại đâu` | — | Not a question. A lookup: which item you failed → which section of which lesson to reread. The only part a lesson cannot replace — it turns **failure into instruction**, which is exactly what a self-learner has nobody to provide |

Total **28 items ≈ 83 minutes**; theory (A+B+C+D) = **22 items, 79 %**.

**Two passes, and this is design, not compromise:**

- **`Lượt 1`** — right after reading the lesson: **A + B** (~23 min). Consolidate while warm.
- **`Lượt 2`** — after 2–3 days: **C + D + E** (~60 min). Retrieval after partial forgetting
  is substantially stronger than immediate retrieval. The gap is an active ingredient.

### 13.3 The `Trục xoáy` rule (spiral)

The user asked for core theory to be **asked repeatedly in different framings**, and in the
same breath asked that this **not** be overused. Both are satisfied by one hard cap:

> Each lesson picks **at most 3 `trục`** (core concepts). Each `trục` appears **exactly
> three times**: once in A, once in B, once in C. Every other concept in the lesson is asked
> **at most once**.

3 × 3 = 9 spiral items; the remaining 19 are breadth. Overuse is structurally impossible.

**Repetition only works if the mental operation changes.** Rephrasing the same question is
rereading, not relearning. Across the three appearances the learner must *recognise it*,
*explain it*, and *diagnose with it* — and the **stimulus must differ in kind**:

| Level | Stimulus the item supplies | Operation demanded |
|---|---|---|
| A | A statement or a formula | Retrieve from memory |
| B | Real data — captured output, a measured pair, two things side by side | Explain the mechanism |
| C | A situation with a constraint, absent from the lesson | Decide, using the principle |

If two of the three supply the same kind of stimulus, the grid is wrong — redo it.

**Never make a `trục` out of:** flag names, exact byte counts, file paths, version numbers.
They are lookup-able in ten seconds, and spiralling them three times is precisely the abuse
the user is guarding against. They get at most one A-level item.

### 13.4 Choosing the `trục` — follow these seven steps in order

Do this **before writing a single item**, as a domain expert on that lesson's subject.
Record the step-2 scoring table as a header comment in `exercises/bt-NN.js` so a later
session can audit the choice instead of re-deriving it.

**Step 1 — Inventory.** List every concept the lesson actually teaches. Sources, in order:
`goals`, every `h2`/`h3`, every `cal kind:'why'`, every `cmdx` title, `terms`, `recap`.
Expect 12–20 candidates. Do not filter yet.

**Step 2 — Score each candidate 0/1/2 on three axes.**

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| **Downstream dependency** — does a later lesson collapse without it? | no lesson needs it | 1–2 later lessons | ≥3 later lessons, or it underpins a whole `Chặng` |
| **Cost of misconception** — what does getting it wrong cost? | nothing | an error message you can search for | a *silent* wrong result, or hours lost |
| **Counterintuitive** — is the beginner's natural guess wrong? | guess is right | guess is roughly right | guess is flatly wrong |

**Step 3 — Cut.** A `trục` needs **total ≥ 4** *and* **≥ 2 axes scoring ≥ 1**. Take the top
3 that qualify. **If only two qualify, write only two.** A lesson with 2 `trục` is normal;
padding to 3 is worse than having 2, because the padded one steals nine items' worth of
attention from where it belongs.

**Step 4 — Disqualify.** Drop a candidate, even a high scorer, if: it is lookup-able trivia
(§13.3); it is a fact about the user's environment rather than a principle; or it was
already a `trục` of the previous lesson. A concept may only be spiralled once in the course
— on later encounters it belongs in part **D** (`Ôn xen kẽ`), not in a second spiral.

**Step 5 — State each `trục` as one falsifiable sentence.** Example:
`.bss` *chiếm RAM lúc chạy nhưng không chiếm byte nào trong file ELF.*
If it cannot be said in one sentence that could be wrong, it is a topic, not a `trục` —
go back to step 1 and split it.

**Step 6 — Write the opposing misconception.** For each `trục`, write down the wrong belief
a beginner actually holds. This single line then drives three things: the MCQ distractors in
A, the `Bắt lỗi phát biểu` item in B, and the failure mode in C. A `trục` with no credible
misconception attached is probably not counterintuitive enough to deserve nine items.

**Step 7 — Build the 3 × 1 grid and validate it.** Before writing prose, check:

- Can the C item be answered **without** understanding the `trục`? If yes, C is broken.
- Do the three items share vocabulary? They must not — same idea, different words.
- Does an earlier item on the page give away a later one? Reorder.

### 13.5 How free-text answers get graded

They are **not** auto-graded, and this must never be faked. There is no server, no grader,
and no keyword matching — keyword matching on Vietnamese free text produces false negatives,
and one wrong "sai" destroys the learner's trust in every subsequent verdict.

The mechanism is **commit → compare → self-score**, and its load-bearing part is the lock:

1. **Commit.** A `<textarea>`, debounced 700 ms and written to Firestore (§14.2 decision 5 —
   a failed write shows *chưa lưu được* but never erases what was typed). The learner types
   their answer.
2. **Lock.** The `Tiêu chí tự chấm` and `Lời giải` buttons stay **disabled until the
   textarea is non-empty**. Without this, hindsight bias ("that's what I meant") voids the
   entire exercise. The lock is not friction to be smoothed away — it is the mechanism.
3. **Compare.** Revealing shows a **checklist of required points**, not a model paragraph.
   The learner ticks each point their own answer actually contained.
4. **Score.** Ticks produce `3/4 ý` ("3 of 4 required points"). Stored. This number is what
   part **F** looks up to tell them what to reread.

Consequence for how items are *written*:

- Every criterion must be checkable **by eye in five seconds** — a number, a string that
  must appear, an exit code. This is §7's *verified numbers beat adjectives*, applied to
  grading. `Nhắc tới việc .bss không nằm trong file` is checkable;
  `Hiểu được bản chất của .bss` is not, and is a defect.
- **Prefer a machine-checkable format whenever it does not cost rigour.** A fair share of
  B-level questions survive being recast as ordering, select-all-that-apply, fill-a-table,
  or an exact numeric answer (normalised: trim, case-fold, strip thousands separators).
  Reach for free text only when producing prose *is* the point — `Giải thích vì sao`,
  `Diễn đạt lại`, and the justification half of `Chọn và biện minh`.
- Part **A** is 100 % machine-checkable and should reuse the existing quiz UI
  (`js/render.js` → `quiz()`), including its `why` explanation. Parts **B**/**C** need the
  new commit-lock-reveal card. These are two visually distinct regions of the page, and that
  difference is honest — it tells the learner which answers a machine can vouch for.

The learner may also paste answers into a chat session to be graded there. That is a real
option, but the page must stand on its own without it.

### 13.6 Cost control

`recall` and `predict` items cost almost nothing to verify — the material already exists in
the lesson and in §10. `cmd` and `debug` items contain commands, so **§2.2 applies in full**:
run them on the user's machine, capture real output, paste that. The theory-heavy 22/6 split
is therefore also the cost lever. Do not silently shift the mix toward hands-on items to
make a set feel meatier; it multiplies verification time without adding retention.

### 13.7 The data contract — what `exercises/bt-NN.js` must contain

Same rule as §4: **an exercise set is data, never HTML.** `js/render-ex.js` turns it into a
page, and that is what makes every set look and grade alike. Rich text is allowed inside
`q`, `opts`, `crit`, `sol`, `why` and the `diag` cells; `blocks`/`solBlocks` take the
ordinary lesson block types from §6 and go through `Render.blocks()`.

```js
Exercise.register({
  id: 'bt-04',                  // MUST pair with lessons/bai-04.js
  minutes: 85,
  intro: '...',                 // HTML, sets up the two passes
  truc: [ { id: 'mmu', name: '...', x: '...', mis: '...' } ],   // only `name` is rendered
  A: [...], B: [...], C: [...], D: [...], E: [...],  // §13.2's six parts
  DEmpty: '<p>…</p>',           // REQUIRED if a part is empty — say why, don't leave a hole
  diag: [ ['A1, B2', 'what you are missing', '<a href="#/bai-04#slug">Đọc lại …</a>'] ]
});
```

Every item: `id` (unique in the set), `k` (the grading primitive), `tag` (the Vietnamese
name of the §13.2 type — `k` decides how it grades, `tag` tells the learner what they are
practising), `q`, optional `blocks` (rendered under `q`), optional `truc` (index into
`truc[]`, **A/B/C only**).

| `k` | Grades by | Required | Optional |
|---|---|---|---|
| `mcq` | one correct index | `opts`, `a`, `why` | — |
| `multi` | exact set of indices | `opts`, `a: []`, `why` | — |
| `tf` | index + a written rewrite | `a` (0 = Đúng, 1 = Sai), `why`, `crit` | `rw` (rewrite prompt), `sol`, `hint` |
| `fill` | normalised string match | `a: []` (all accepted spellings), `why` | `ph` |
| `num` | number ± `tol` | `a`, `why` | `tol`, `unit` |
| `match` | left[i] → right[a[i]] | `left`, `right`, `a`, `why` | — |
| `free` | **self-scored only** | `crit`, `sol` or `solBlocks` | `hint`, `rows`, `ph` |

Rules the validator enforces, each for a reason learned the hard way:

- **`match` may not use an identity mapping.** `a: [0,1,2,…]` is solvable by picking A, B,
  C top to bottom without reading anything. Shuffle `right[]`.
- **Every trục appears exactly once in A, once in B, once in C** — §13.3's grid, checked
  mechanically. A trục badge outside A/B/C is an error: the UI tells the learner these are
  asked *three* times, so a fourth badge makes the page lie.
- **`free` without `crit` is rejected.** Free text that cannot be self-scored is a dead end
  (§13.5), and every criterion must be checkable by eye in five seconds.
- **An empty part needs `<PART>Empty`.** A silently missing part reads as broken content.
- **Every part-F row needs a link.** The whole value of the table is that it routes a
  failure to a specific section: `#/bai-NN#<slug>`, where the slug is `Render.slug()` of
  that heading's exact text.

Checklist for adding a set — the §9 checklist, applied here:

1. Do §13.4 steps 1–7 first and paste the scoring table into the file as a header comment.
2. Verify every command in part E on the user's machine and paste real output (§13.6).
3. `exercises/bt-NN.js`, then a `<script>` line in `index.html` **before** `js/app.js`.
4. Update the `Bộ bài tập đã viết` line in `README.md` and §9.1 of `LO-TRINH.md`.
5. `node tools/check.js` → `OK`. It renders every set and prints
   `bt-NN items=… truc=… diag=… html=…KB`.

---

## 14. Progress storage — Firebase Firestore

**Rewritten 2026-08-10.** This section used to describe an optional sync overlay on top of
localStorage. The user inverted it:

> *"Hãy cập nhật code để gỡ toàn bộ những thứ liên quan tới localstorage, bắt buộc phải
> dùng database. Đối với những cái thuộc về máy tính như user mode dark, light hoặc
> collapse,... thì có thể dùng localstorage, còn lại phải ghi toàn bộ vào firebase database
> cho tôi. Thêm vào đó khi user thao tác thì hiệu ứng trang web ghi nhận ngay lập tức và
> bắt đầu ghi vào database, nếu ghi thất bại thì revert hiệu ứng trang web."*

— remove everything localStorage-related, the database is mandatory; machine-level things
(dark/light, sidebar collapse) may stay local; everything else must be written to Firebase;
the UI must register the action immediately and start writing, and **revert the UI effect if
the write fails**.

Everything below follows from that sentence. The decisions in §14.2 of the *previous*
version (localStorage is the source of truth · cloud is an overlay · ask for the username
once) are **dead**. Do not resurrect them from an older transcript.

### 14.1 What it is, and what it deliberately is not

| | |
|---|---|
| Users | Exactly one real human. |
| Auth | **None.** No Firebase Auth, no password, no session. |
| Identity | A username typed into a modal, stored in `localStorage` under `elx.user`. |
| Meaning of the username | It is a *document key*, nothing more. Typing the right one gets you the right data — that is the entire authorization model, and the user explicitly accepted it. |
| Protection | Firestore Rules: a fixed whitelist of usernames + a document-shape constraint + `allow delete: if false`. |

Do not "improve" this into a login flow. It was scoped this way on purpose. What changed in
2026-08-10 is *where the data lives*, not *who may read it*.

### 14.2 Hard decisions (from the user — do not renegotiate)

1. **Firestore is the only home of progress.** `done`, `quiz` and every exercise answer live
   in RAM as a mirror of the server and are never written to `localStorage`. Reload with no
   connection and the learner has nothing — by design. The four keys that stay local are
   `elx.theme`, `elx.modOpen`, `elx.sbCollapsed`, `elx.user`, plus `elx.dev` (the device id).
   The line is *"does this describe the machine or the person"*: syncing dark mode would let
   a phone flip the desktop to dark, which is an annoyance, not a feature.
2. **Optimistic, then reverted.** Every write paints first and writes second. On failure the
   change is rolled back in `Store` *and* on screen, and a toast says so. A silent failure
   is the one outcome that is unacceptable: the learner would keep working against a page
   that is no longer recording anything.
3. **Offline locks the controls; it never falls back to local storage.** The user chose
   *"Khoá thao tác, vẫn đọc được bài"* — lock the actions, keep the lessons readable. So the
   username is asked at every page open until one is set (the "Dùng ngoại tuyến" button is
   **gone**), and with no connection the lesson renders fully while the tick button, the
   quiz and the exercise inputs are disabled. **No progress is quietly kept on the machine
   to "sync later"** — that would recreate exactly the two-sources-of-truth problem this
   change removed.
4. **Failure is detected with the SDK plus our own deadline.** The user chose
   *"SDK + timeout tự đặt"*. Keeping the SDK keeps `onSnapshot`, which is what makes a
   second machine update live. The explicit timeout exists because **Firestore does not
   reject writes when offline** — it queues them locally and the promise simply never
   settles. Without `withTimeout()` the revert-on-failure rule would never fire once.
   `WRITE_TIMEOUT` is 6 s. Accepted trade-off: a merely *slow* network (>6 s) reverts, and
   the next server snapshot puts the value back. The server is authoritative at every
   instant; only the path to it was ugly.
5. **Free text is never erased by a failed write.** The user chose *"Không revert chữ, chỉ
   báo trạng thái"*. A `<textarea>` debounces at 700 ms and shows *đang lưu / đã lưu / chưa
   lưu được*; typing again retries. Everything discrete — a lesson tick, a chosen answer, a
   self-score checkbox — reverts immediately. `repaintExItem()` therefore snapshots the
   `[data-ta]` and `[data-in]` values before it replaces the item's HTML and restores them
   afterwards: what gets rolled back is the *score*, not the learner's typing.
6. **Never display a number that might be wrong.** The user chose *"Skeleton, khoá thao tác
   tới khi có dữ liệu"*. Until `Store.ready()` is true, every progress figure renders as
   `—` (`num()` in `app.js`), the ring is empty, bars get `.bar.is-wait`, and `body.is-nodb`
   dims every writable surface. Showing `0%` while loading tells the learner the exact thing
   they are most afraid of — that their progress is gone.
7. **Remote wins, always. There is no merge.** Unchanged from the previous design and still
   the user's instruction: *"Không cần quan tâm tới vấn đề đồng bộ ngược… dữ liệu trước đó
   không quan trọng"*. `Store.applyRemote()` **overwrites**. Merging would resurrect a
   lesson the learner deliberately un-ticked on another machine.
8. **The SDK is lazy-loaded, never in `index.html`.** Two `<script>` tags to `gstatic.com`
   in the head would block first paint for the whole browser connect timeout whenever the
   machine is offline — and reading the lessons offline is still a supported use.
9. **The config is hardcoded and that is correct.** A Firebase web config identifies the
   project; it is not a secret (Google publishes this). The rules file is what protects the
   data. The user authorised this explicitly.

### 14.3 The data model — schema v3 (2026-08-10)

Two document kinds. **Writes are field-level `update()`, not whole-document `set()`** —
that is what makes a single failed action revertible without disturbing the other 69 lessons.

```
progress/{username} = {
  v:         3,                  // schema version — Rules pin this exact value
  createdAt: <timestamp>,        // written once, then echoed back by the client
  updatedAt: <timestamp>,        // serverTimestamp(); Rules force == request.time
  by:        "web-a1b2c3",       // opaque device id from Store.deviceId()
  done: { "bai-01": 1735000000000, ... },          // lesson id → epoch ms it was ticked
  quiz: { "bai-01": { n: 6, a: { "0": 2 } }, ... } // lesson id → {question count, index → choice}
}

progress/{username}/ex/{bt-NN} = {
  v: 3, createdAt, updatedAt, by,
  items: { "a1": { p: 2 }, "b3": { txt: "…", ck: [0,2] }, ... }   // §13.7's per-item state
}
```

Why each piece is the way it is:

- **Username is the document id, not a field.** With no Auth, the path is the *only* thing
  Rules can see. A username stored inside the document could not gate a read, because a read
  rule is evaluated before the content is known.
- **`done` and `quiz` share one document.** They are tiny, both are needed on every page load
  to paint the ring and the sidebar, and "remote wins" needs one atomic snapshot. Splitting
  them per lesson would cost 70 reads per load and turn `onSnapshot` into 70 uncoordinated
  events that must be reassembled — which is the merge logic decision 7 forbids.
- **Exercises live in a subcollection, one document per set.** Free-text answers across 70
  sets can reach hundreds of KB against Firestore's **1 MiB per-document** ceiling and
  **40 000 index entries per document**. This is also why the whole-document `set()` of the
  old design had to go: it would have resent every answer on every debounced keystroke.
- **All exercise documents are fetched in ONE collection query at connect time**
  (`loadEx()`), not lazily per page. The sidebar chips, the `#/bai-tap` index and
  `Exercise.stats()` need every set's numbers the moment the page opens; lazy loading would
  show 0 and then jump. Do **not** "optimise" this into a per-page fetch, and do not add a
  summary field to the parent document to avoid it — a denormalised count is a second
  source of truth and it will drift.
- **Maps, not arrays.** Rules can call `size()` on a map, and that key count is the *only*
  measurable ceiling available: Firestore Rules has no byte-size function for a document
  (only Storage has `request.resource.size`).
- **Field paths are passed as arrays, not dotted strings.** `Store` emits
  `{ p: ['done', 'bai-01'], v: … }` and `cloud.js` builds a `firebase.firestore.FieldPath`
  from it. `"done.bai-01"` is an **invalid** field path — a hyphen forces backtick quoting —
  and every lesson id has one.
- **`Store.DEL` is a sentinel, not a Firebase value.** `store.js` must not know that
  `firebase.firestore.FieldValue.delete()` exists; `cloud.js` translates it in
  `updateArgs()`. This is the layering in §14.4, in one line of code.
- **`quiz` carries `n`, the question count at answer time.** Answers are keyed by question
  index, so inserting a question into an already-written lesson would shift every stored
  answer by one and display it wrongly, in silence. `Store.getQuiz(id, n)` discards the whole
  entry when `n` disagrees. `n: 0` means "unknown" — that is how pre-v2 flat entries
  (`{ "0": 2 }`) read, and they are accepted rather than thrown away.
- **`updatedAt` is server-owned.** Rules require `updatedAt == request.time`, so a machine
  with a wrong clock cannot write a fabricated timestamp. It is **not** used to decide which
  side is newer — remote always wins, and comparing timestamps would sneak merge logic back.
- **`createdAt` is not enforced immutable.** Doing so would reject a legitimate write from a
  client that pushed before its listener delivered the document, in exchange for no threat
  reduction. See the comment in `firebase/firestore.rules`.
- **`by` exists because last-write-wins is silent.** One machine can erase another's work
  with no trace. This field is what turns "my progress vanished" into something diagnosable.

**`ensureShape()` is not optional.** Rules pin `v == 3`, and a field-level `update()` fails
on a document that does not exist. So the first server snapshot of a session either finds a
v3 document or rewrites the whole thing with `set()` — creating it, or upgrading a v1/v2 one
in place, seeded from whatever is still in the old localStorage keys. Skip this and every
subsequent write is permission-denied forever, with no obvious cause.

**Legacy exercise answers are migrated, once.** Before this change `elx.ex` had **never**
been synced anywhere. Clearing localStorage without uploading it first would have destroyed
real work. `migrateEx()` uploads only the sets the server does not already have, then
`Store.dropLegacy()` removes `elx.done`, `elx.quiz` and `elx.ex` for good. Once the user has
connected once on a machine, that machine's legacy keys are gone and this path is dead code
there — leave it in anyway, other machines have not run it yet.

### 14.4 File map and responsibilities

| File | Owns |
|---|---|
| `js/store.js` | Machine prefs in localStorage; progress in RAM. The optimistic-write/undo shape. Knows nothing about Firebase. |
| `js/cloud.js` | SDK loading, `onSnapshot` listener, `ensureShape`, `loadEx`, `migrateEx`, the `write()` registered via `Store.setWriter()`, connection state. Knows nothing about the DOM. |
| `js/account.js` | The modal and the topbar state dot. Knows nothing about Firestore. |
| `js/toast.js` | The one sentence shown when a write fails and the UI has just rolled back. Knows nothing about anything. |
| `js/app.js` | Paint-then-write handlers, `repaintExItem`/`repaintQuiz`/`rerender`, `num()`, `blocked()`, `syncLock()`, `applyRemoteToUi()`. |
| `firebase/firestore.rules` | The username whitelist and both document shapes. **Deploy by hand.** |

The layering is the point: each file can be deleted or stubbed without the ones below it
noticing. Keep it that way.

### 14.5 The invariants you must not break

- **Every mutator returns `Promise<boolean>` and never rejects.** `true` = the server took
  it, `false` = it was rolled back, repaint and tell the learner. A rejecting mutator turns
  into an unhandled rejection in a click handler, which helps nobody. Any new mutating method
  on `Store` must go through `commit()`.
- **Echo loop.** A local write lands back through `onSnapshot`. Three guards stop it from
  looping: `snap.metadata.hasPendingWrites` is skipped, `lastSig` skips any snapshot whose
  `done`/`quiz` equal what is already on screen, and remote data only ever enters through
  `Store.applyRemote()`.
- **Guard order in the snapshot handler matters.** `hasPendingWrites` is checked **before**
  `fromCache`, because a snapshot carrying a pending write always has `fromCache: true` —
  checking the other way round flashes the sync dot amber on every single tick.
- **Scroll position.** A remote change must never bounce the learner to the top. Repaints go
  through `repaintQuiz()` (one `outerHTML` swap — this is why `render.js` exports `quiz`) or
  `rerender()`, which restores `window.scrollY`. A full re-render is only allowed on the
  not-ready ⇄ ready transition, when every control is locked and nothing is half-typed.
- **`Store.ready()` gates both the look and the behaviour.** `body.is-nodb` handles the look;
  `blocked()` at the top of every write handler handles the behaviour. Both are needed —
  `pointer-events: none` would not stop a keyboard user, and the CSS deliberately leaves
  clicks reachable so the toast can explain *why* nothing happened. A dead, silent control
  is the fastest way to make the learner think the page is broken.

### 14.6 `fromCache` — why the green dot is harder than it looks

**`includeMetadataChanges: true` is mandatory. Do not "simplify" it back to `false`.**

Firestore answers a listener from its local cache *first*, and it does so even when the
device has never reached the server. Caught for real on 2026-08-09: a jsdom run that could
not open a WebChannel at all still received a snapshot, and `cloud.js` reported state
`live` — a green dot and the words *"Đang đồng bộ"* over a connection that did not exist.
That is a lie to the learner, and the learner would only find out by losing work.

The fix, and the reasoning behind each half:

- State comes from `snap.metadata.fromCache`: `fromCache` → `connecting` (amber),
  server-confirmed → `live` (green). Nothing else may set `live`.
- A `fromCache` snapshot is **never** applied to `Store`, and never sets `ready`. Cached data
  is not truth. `loadEx()` uses `get({source: 'server'})` for the same reason.
- `includeMetadataChanges` must therefore be `true`, because with `false` a cache→server
  transition carrying identical data fires **no event at all** — the dot would stay amber
  forever on a perfectly healthy connection.
- The cost of `true` is duplicate snapshots. Two dedupes absorb it: `lastSig` (skip identical
  payloads) and the equal-state guard at the top of `setState()`. Without the latter, every
  redundant event repaints the modal and steals the caret out of the username field
  mid-typing.

### 14.6b Re-testing the rules

The v2 rules were verified on 2026-08-09: **24/24** correct over plain REST with the bare API
key and no auth token — a browser's exact privilege. **The v3 rules have not been
re-verified**, and the subcollection block in particular is new. Three things to know before
running the suite again:

- **Test writes go to `progress/elx-probe`, never a real username.** That is the only reason
  the canary is in `allowed()`. `allow delete: if false` means a test cannot clean up after
  itself, and a leftover document with empty `done`/`quiz` would — remote wins, no merge —
  erase that learner's progress on their next connect. That used to cost them their sync;
  now it costs them the data itself, because there is no local copy any more.
- **Write with `POST …/documents:commit` + `updateTransforms` /
  `setToServerValue: 'REQUEST_TIME'`, not `PATCH`.** `updatedAt == request.time` cannot be
  satisfied by a client literal, so a test that PATCHes a literal timestamp tests nothing.
- **Rules do not cascade.** `progress/{name}/ex/{set}` was 403 until v3 gave it its own
  `match` block. Confirm both the positive path (`bt-01`) and the negative one (a set id that
  does not match `^bt-[0-9]{2}$`).

`progress/shinarus` is **v1 on disk** and pre-dates both bumps. No migration script is
needed: `ensureShape()` rewrites it with a whole-document `set()` the first time a v3 client
connects, and `wellFormed()` constrains only `request.resource.data`, so that write is legal.
Its flat v1 `quiz` values read back as `{ n: 0, a: raw }`, and `n: 0` skips the drift check
rather than discarding real answers — exactly what that back-compat branch exists for, so do
not "clean it up".

### 14.7 Checklist for touching this subsystem

1. **Adding a synced key** to the main document: add it to the `data` object in `store.js`,
   to `applyRemote()`, to the rules' `hasOnly([...])`, and to §14.3. Missing any one fails
   silently.
2. **Adding a machine/person:** add the username to `allowed()` in `firebase/firestore.rules`
   and deploy. It must match `/^[A-Za-z0-9_-]{3,40}$/` — the same regex lives in
   `js/account.js`, keep the two identical.
3. **Changing either document shape:** bump `VER` in `js/cloud.js`, change **both** `d.v == N`
   in the rules, update §14.3, **and deploy the rules by hand.** The pinned `v` means
   forgetting the deploy breaks writes loudly rather than silently — that is the design.
   Test against `progress/elx-probe`, never a real username (§14.6b).
4. **Adding a new mutator:** it must live in `store.js`, mutate RAM first, call `commit()`
   with an `undo` closure, and return `Promise<boolean>`. Its caller in `app.js` must paint
   optimistically, then repaint + `Toast.writeFailed(...)` on `false`.
5. `node tools/check.js` still has to print `OK`. It sandboxes `js/store.js` with a stub
   `localStorage` and **no `document`** — so `store.js` must never touch the DOM at load
   time. `cloud.js`, `account.js` and `toast.js` are not in its `CORE` list and are not
   loaded by it.
6. **Test offline:** throttle to offline in devtools, reload. Expect an **amber** dot, a
   fully readable lesson, `—` everywhere a progress number would be, a disabled tick button,
   and no thrown exception. A **green** dot while offline is the bug §14.6 exists to prevent;
   a **0%** while offline is the bug §14.2 decision 6 exists to prevent.
7. **Test the revert:** connect, then throttle to offline *without* reloading, then tick a
   lesson. Expect the tick to appear, hold for 6 s, then undo itself with a toast. This is
   the single most important behaviour in the subsystem and it is invisible in any test that
   only checks the happy path.
8. There is no automated test for this subsystem in the repo, and there should not be one —
   `tools/check.js` must stay dependency-free. The v2 logic was verified once, on 2026-08-09,
   with a throwaway jsdom harness installed **outside** the repo (52 assertions). Rebuild the
   same way if you change the logic; do not add `node_modules` to this repository.

### 14.8 Known open items

- **Firestore from `file://` (origin `null`) is unverified**, and it matters more than it
  used to: a double-clicked `index.html` that cannot reach Firestore is now a course with no
  progress recording at all, not merely one without sync. The user deploys to GitHub Pages,
  so this is not the primary path, and the agreed fallback is that `cloud.js` degrades to
  `'error'` while the course stays readable. Test it if and when it becomes a requirement.
- **The v3 rules have not been deployed or re-tested** as of this writing. Until the user
  deploys them, every write fails with permission-denied — loudly, as designed (§14.7 item 3).

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
| Delivery | Open `index.html` by double-clicking. `file://` must work. No server, no build step, no npm, no Internet. |
| Stack | Vanilla HTML + CSS + ES5-style JS. IIFE modules, no bundler, no framework. |

`tools/check.js` is the only Node script and it is a test, never a build step.

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
js/
  icons.js            inline SVG icon set
  store.js            localStorage: theme, progress, quiz answers
  registry.js         COURSE skeleton (14 modules / 70 lessons) + Lesson registry
  render.js           data -> HTML.  THE consistency engine
  search.js           in-memory full-text index, diacritic-insensitive
  app.js              hash routing, sidebar, toc, quiz, copy buttons
lessons/
  bai-01.js  bai-02.js  bai-03.js       one file per lesson, self-registering
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

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

Rich text *inside* text fields (`x`, `items`, table cells, `notes`, `cmdx` descriptions)
may use `<b>`, `<i>`, `<code>`, `<kbd>`, `<ul>`, `<p>`. The `code` field of a `code` block
and the token column of `cmdx` are HTML-escaped automatically — write commands verbatim.

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
2. **Verify every command on the user's machine first.** Run the whole practice section
   end to end via `Bash`, including cleanup. Capture real output. If a command fails,
   fix the lesson plan — do not paper over it. Record the failure in the lesson's
   `Lỗi thường gặp` ("Common errors") table.
3. Write `lessons/bai-XX.js` following §5–§8.
4. Add `<script src="lessons/bai-XX.js"></script>` to `index.html`, **before** `js/app.js`.
5. Update the status table in `LO-TRINH.md` §9 and the `Bài đã viết: N / 70`
   ("Lessons written: N / 70") line in `README.md`.
6. Run `node tools/check.js`. It must print `OK`.
7. Check every `Bài N` / `Chặng NN` cross-reference you wrote actually points at the right
   lesson in `registry.js`.

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
| Distro | Ubuntu, WSL version 2 |
| CPUs / RAM | 6 CPUs via `.wslconfig` (`nr_cpus=6` in cmdline), 8 GB RAM |
| `/proc/cmdline` | `initrd=\initrd.img WSL_ROOT_INIT=1 panic=-1 nr_cpus=6 … console=hvc0 debug …` |
| Kernel boot time | `Freeing unused kernel image (initmem) memory: 4852K` at **0.376880 s** |
| Userspace boot time | `Startup finished in 2.456s (userspace)` |
| PID 1 | systemd |
| `/boot` | **empty** — no bootloader in WSL2 |
| Filesystem penalty | 500 × `touch`: `~` = **0.017 s**, `/mnt/c` = **0.882 s** → **52×** |
| `/dev/kvm` | exists (`crw-rw---- 1 root kvm 10, 232`) |
| `qemu-system-aarch64 -accel help` | lists **`tcg` only** — ARM64 on x86 is always emulation |
| Cross compiler | `aarch64-linux-gnu-gcc` 15.2.0 |
| Static vs dynamic hello | x86 dynamic **15,952 B**; ARM64 `-static` **705,328 B** |
| Installed | `qemu-system-arm`, `qemu-user`, `gcc-aarch64-linux-gnu`, `gdb-multiarch`, `device-tree-compiler`, `u-boot-tools` |
| Not installed | `qemu-system-x86_64` |
| QEMU `virt` | has **no I2C/SPI bus** (`No 'i2c-bus' bus found`). Lesson 58 must use `i2c-stub` / `gpio-sim` / SPI loopback, or switch machine to `raspi3b` / `mcimx7d-sabre` |

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

- **Module 00 (`Chặng 00 — Nhập môn`, "Introduction") is complete**: lessons 1, 2 and 3
  are written and rendering.
- Next lesson to write, when asked: lesson 4, `Shell và cấu trúc một câu lệnh`
  ("The shell and the anatomy of a command") — it opens module 01, Linux basics.
- `node tools/check.js` → `14 modules · 70 lessons · 3 written · OK`.

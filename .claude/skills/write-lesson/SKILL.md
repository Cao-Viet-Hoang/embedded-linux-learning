---
name: write-lesson
description: Rules for writing, editing or reviewing a lesson of the Vietnamese Embedded Linux course (lessons/bai-NN.js) — the Lesson.register object shape, the 12 block types and their fields, the required lesson arc (intro → goals → theory → Thực hành → Lỗi thường gặp → recap → Bài tiếp theo → quiz), the Vietnamese/English writing rules, SVG figure classes, and the add-a-lesson checklist. Use whenever a lesson is being written, edited, planned, verified or reviewed, or when a lesson block type or figure is in question.
---

# Writing a lesson — §5–§9 of the project conventions

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged**, so a
> `CLAUDE.md §7` reference anywhere in the repo means the §7 below.
>
> `CLAUDE.md` still governs: §2 (hard rules — verify every command, never write ahead of
> demand, code is English) and §4 (lesson content is data, never HTML).
>
> Before running anything: `docs/running-commands.md` (§9.1) and `docs/environment.md` (§10).
> Per-module continuity and the `Chặng NN` cross-reference map: `docs/course-notes.md` (§12.1).

---

## §5. Lesson object shape

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

## §6. Block types

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

## §7. Lesson anatomy

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
- **Memory aids for critical concepts.** At important points that learners should retain,
  add memory aids (mnemonics, vivid examples, repeated restatement in different framings)
  to help them remember. BUT: distinguish between two cases:
  - *Checkable facts* (a flag, a command syntax, a file path, a version number): Say
    "you can always check this with `command`" and show them how. Never imply they must
    memorize it. Include the check command in the lesson so they can verify their answer
    later without opening the manual.
  - *Principles and design decisions* (why MMU matters, when to use static vs dynamic,
    how signals propagate): These are worth memorizing because understanding them fast
    saves hours during debugging and interviewing. Invest memory aids here.
  Example: "Linux assigns every process a unique PID, but you can always see it with
  `echo $$` or `ps` — no need to remember" vs. "Virtual memory lets a process use more
  RAM than physically exists. This is so foundational to everything that follows that
  it is worth spending two minutes right now learning it deeply."
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

## §8. SVG figures

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

## §9. Adding a lesson — checklist

1. Read the lesson's entry in `LO-TRINH.md` (§4). It defines scope, prerequisites and
   deliverables. Do not silently expand or shrink it.
2. **Pre-flight the dependencies before running anything long** — see §9.1, `docs/running-commands.md`.
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
9. Update `docs/course-notes.md` (§12.1) with anything a later lesson must not contradict,
   and the status lines in `CLAUDE.md` §12.

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

`notes` on a `code` block **must be an array of strings, never a bare string.** `js/render.js`
guards with `if (b.notes && b.notes.length)` — a string passes that guard and then dies on
`.map`, so `tools/check.js` fails with `Render.lesson threw — b.notes.map is not a function`
(hit while writing lesson 40). One note is still `notes: ['…']`.
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
4. **`h2` "Thực hành: …"** *(= "Practice: …")* — one `steps` block, 4–6 steps. **Every command
   run inside a step** — not every step — follows this unit: `p` (what you're about to run and
   why) → `code` (the command) → `code where:'out'` (real output) → `cmdx` (dissect any
   non-trivial command) → `cal` or a follow-up `p`/`notes` (what *this* output specifically
   shows, in terms of the values printed — not just "what just happened" in the abstract).
   **The unit repeats per command, not once per step.** A step that runs two or three commands
   back to back needs an interpretation for each one, not a single lead-in `p` shared by all of
   them plus one `cal` at the end covering only the most interesting output — a beginner cannot
   infer unaided that a given line of output confirms, contradicts, or is simply consistent with
   what came before. The only output allowed to go without its own explanation is one whose
   meaning was already taught for an identical shape earlier in the *same* step (e.g. the same
   command run twice with only one argument changed, where the first call's `cal` already
   established how to read that output).
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
- **Every command shown must answer two questions on the page, not just in the writer's
  head: why am I running this, and what does *this* output tell me?** The `p` before a `code`
  block answers the first. A `cal` or a follow-up `p`/`notes` after the matching
  `code where:'out'` block must answer the second — explicitly, pointing at the actual values
  printed (a specific line, number, or field), not a generic restatement of the command's
  purpose that would read the same regardless of what came out. If a command's output genuinely
  needs no interpretation (a directory listing used only to set up files for the next command,
  say), that is a reason to consider `nocopy`-ing it out of the reader's attention, not a licence
  to leave a *meaningful* result unglossed. This is the most common gap in existing Thực hành
  sections: a run of two or three commands sharing one lead-in paragraph, where only the last
  output gets a `cal` and the earlier ones are left for the learner to interpret alone.
- **Show the failure on purpose** when the failure teaches something. Lesson 3 makes the
  learner hit `Exec format error` deliberately, then explains why that is the correct outcome.
- **Cross-reference forward and backward**, e.g. `Bài 17 sẽ phân tích kỹ` ("lesson 17 will
  analyse this in depth") and `như bạn đã kiểm chứng ở Bài 1` ("as you verified in lesson 1").
  This is what makes 70 lessons feel like one course rather than 70 articles.
- Address the learner in the second person singular, `bạn` ("you"). Never use `chúng ta`
  ("we") for an action only the learner performs.
- No filler, no hype, no emoji in lesson content.
- Prefer a table over three paragraphs when comparing things.
- **A new or abstract concept must be grounded, not just defined.** The learner is a
  complete beginner at Linux — a one-sentence definition of something like "job table",
  "file descriptor", "virtual memory", "environment variable" or "process vs. program"
  is not enough on its own, because the learner has no prior mental model to hang it on.
  Every such definition must be paired with **at least one** of:
  - a concrete worked example using real values/output (a command actually run, a real
    number, a real file) — not a hypothetical;
  - an analogy to something the learner already has a mental model for;
  - a `fig` diagram (§8) — reach for this when the concept is about *structure or
    sequence* (what components exist, what talks to what, what happens in what order).
  A worked example is usually right when the concept is best understood by *seeing it
  run*. Test before moving on: could a complete beginner picture this concept after
  reading only the paragraph that introduces it? If not, that paragraph needs an example
  or a diagram, not more prose. Treat a bare definition with neither as a defect of the
  same severity as an unexplained command flag (previous bullet).
- **If a concept can be observed directly, show the real observation — don't just
  describe it in prose.** Direct, hands-on evidence is more intuitive and memorable than a
  text description, for any concept, not only obscure ones. Before writing a description
  of *anything* the lesson introduces, ask: is there a command, file, flag or tool that
  lets the learner see this for themselves right now? This applies broadly — it is not
  limited to invisible OS/shell bookkeeping, though that is the clearest case: a job table
  (`jobs`), the process table (`ps`/`/proc`), the environment block (`env`/`printenv`), a
  symbol table (`nm`/`objdump -t`), memory layout (`cat /proc/self/maps`). It applies just
  as much to anything else observable — a file's permission bits (`ls -l`), a variable's
  value (`echo`), a program's behaviour (running it). If such a way to look exists, run it
  (§9.1/§2 — verify on the real machine as always) and show its real output right where the
  concept is introduced, instead of settling for prose alone.
  **Showing the captured output is necessary but not sufficient.** The point is for the
  *learner* to watch it happen on their own machine, not to take your word for a transcript
  you already ran. So the code block must also be something they can reproduce: the exact
  command, with its `where` badge (§6), placed so they type or paste it themselves — never
  a captured result presented with no command attached, and never one so vague ("run
  something like…") that they cannot reproduce it verbatim. The one exception is when
  reproducing it yourself would demand something impractical for this lesson's scope —
  specialized hardware, a multi-hour build, a real embedded board the learner may not own.
  In that case it is fine to show only the captured output, but say so **explicitly** and
  point the learner toward exploring it further on their own (name what it would take),
  rather than silently leaving them unsure whether they were supposed to try it themselves.
  When the concept is a structure that changes over time, prefer capturing the change itself (an entry appearing,
  then disappearing or changing state) over one static snapshot — watching something change
  is what makes a mechanism concrete. This may need a second, separate worked example from
  the one already used to teach the surrounding command, if running the observation itself
  would alter the original example's outcome (e.g. lesson 4's `jobs` demo of the job table
  is deliberately a separate sequence from its `kill`/`wait` exit-code demo, because running
  `jobs` in between would itself change the exit code being taught). If no way to observe a
  given concept exists, say so explicitly rather than silently falling back to prose, and
  reach for an analogy or a `fig` instead (previous bullet).
- **Flag which values in a captured output will differ for the learner.** A
  `code where:'out'` block is one real capture from one specific run on one specific
  machine — but some fields in it are inherently non-reproducible: PIDs, timestamps,
  memory addresses, inode numbers, random ports, hostnames, usernames, UUIDs, MAC
  addresses. When a captured output contains a value like this, say so explicitly right
  next to it (e.g. "Số sau `[1]` là PID thật, sẽ khác trên máy bạn mỗi lần chạy" —
  lesson 4's `jobs` demo does this). Otherwise a learner who reproduces the exact same
  command and gets a different number will suspect they did something wrong, when the
  difference is normal and expected. Don't over-apply this: only flag fields that are
  actually run-dependent — a value the lesson asserts should be identical everywhere
  (an exit code, a fixed constant, a flag's documented effect) needs no such caveat, and
  hedging on it would just teach the learner to distrust numbers that are, in fact, reliable.
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

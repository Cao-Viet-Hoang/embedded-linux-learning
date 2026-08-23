---
name: write-exercise
description: Rules for writing or editing an exercise set (exercises/bt-NN.js) of the Vietnamese Embedded Linux course — the six parts A–F and 12 item types, the 28-item budget, the Trục xoáy spiral rule and the seven-step procedure for choosing a trục, how free-text answers are self-graded (commit → lock → compare → score), and the data contract that tools/check.js validates. Use whenever an exercise set, a bt-NN file, a trục, or the grading kinds (mcq/multi/tf/fill/num/match/free) are involved.
---

# Exercise sets `Bài tập` — §13 of the project conventions

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged**, so a
> `CLAUDE.md §13.4` reference anywhere in the repo means the §13.4 below.
>
> `CLAUDE.md` still governs: §2 (hard rules) and §4 (content is data, never HTML).
> Block types used inside `blocks`/`solBlocks` are §6, in the `write-lesson` skill.
> Verifying part E on the machine: `docs/running-commands.md` (§9.1) and
> `docs/environment.md` (§10). Exercise state on the server: the `progress-storage` skill (§14).

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

1. **Commit.** A `<textarea>`, debounced 700 ms and written to Firestore (§14.2 decision 5, `progress-storage` skill —
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
  must appear, an exit code. This is §7's (`write-lesson` skill) *verified numbers beat adjectives*, applied to
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
the lesson and in §10 (`docs/environment.md`). `cmd` and `debug` items contain commands, so **§2.2 applies in full**:
run them on the user's machine, capture real output, paste that. The theory-heavy 22/6 split
is therefore also the cost lever. Do not silently shift the mix toward hands-on items to
make a set feel meatier; it multiplies verification time without adding retention.

### 13.7 The data contract — what `exercises/bt-NN.js` must contain

Same rule as §4: **an exercise set is data, never HTML.** `js/render-ex.js` turns it into a
page, and that is what makes every set look and grade alike. Rich text is allowed inside
`q`, `opts`, `crit`, `sol`, `why` and the `diag` cells; `blocks`/`solBlocks` take the
ordinary lesson block types from §6 (`write-lesson` skill) and go through `Render.blocks()`.

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
  that heading's exact text. **`Render.slug()` ends with `.slice(0, 60)`**, so a long
  heading is silently truncated mid-word — Bài 9's *"Tín hiệu: cách duy nhất để nói chuyện
  với tiến trình đang chạy"* becomes `…-tien-trinh-dang-cha`, not `…-dang-chay`. Hand-typing
  the slug from the heading gives a dead anchor and `tools/check.js` does **not** catch it.
  Compute it, don't guess it — load `js/render.js` in `node` and call `Render.slug()` on the
  literal `x` of the target block.

Checklist for adding a set — the §9 checklist (`write-lesson` skill), applied here:

1. Do §13.4 steps 1–7 first and paste the scoring table into the file as a header comment.
2. Verify every command in part E on the user's machine and paste real output (§13.6).
3. `exercises/bt-NN.js`, then a `<script>` line in `index.html` **before** `js/app.js`.
4. Update the `Bộ bài tập đã viết` line in `README.md` and §9.1 of `LO-TRINH.md`.
5. `node tools/check.js` → `OK`. It renders every set and prints
   `bt-NN items=… truc=… diag=… html=…KB`.

### 13.8 Trục already spent

Per §13.4 step 4 a concept may be spiralled **once in the whole course**, so none of these
may become a `trục` again — in later sets they belong in part D. Append a row here every
time a set is written.

| Set | The three trục |
|---|---|
| `bt-01` | MMU is the hard boundary (not RAM size) · the four pieces run in sequence, so "where did it die" is deducible · hardware does not announce itself, Device Tree declares it |
| `bt-02` | DRAM is not usable at reset, hence SRAM and an SPL · each stage hands over and then *disappears* · `bootargs` is the one channel to the kernel |
| `bt-03` | virtualisation needs the *same* architecture, emulation does not · the two QEMU families solve different problems · `/mnt/c` is a filesystem boundary, and it is the slow one |
| `bt-04` | `$?` is the machine's only answer to "did that work" · a builtin is not a file on disk · the shell splits on whitespace *before* the command ever sees the arguments |
| `bt-05` | `/proc` and `/sys` are generated at read time · a file in `/dev` holds no data, major/minor point elsewhere · an empty directory in a rootfs is a mount point |
| `bt-06` | the shell expands `*`, the command never sees it · a name is not the file, the inode is · metadata is a system, not decoration |
| `bt-07` | <kbd>Ctrl</kbd>+<kbd>S</kbd> freezes the *terminal*, the program keeps running · vim has modes — one key, two meanings · a `:` command defaults to **one line** only |
| `bt-08` | the kernel checks **one** triplet and stops at the first match · a directory's `rwx` describes the *name table*, not the files in it · permission to touch hardware comes from **group membership**, not from `sudo` |
| `bt-09` | `kill` is a request, `kill -9` is an order — and the price of the order is no time to flush · load average is a **count** of waiting processes, not a percentage — divide by `nproc`, and it lags ~60 s · `jobs`/`%1` are the **shell's** bookkeeping, not the kernel's |
| `bt-10` | a pipe carries **fd 1 only** — fd 2 walks around it, so `make \| grep error` can report 0 on a dead build · not every command reads stdin (`echo`, `rm`, `mkdir`), and those fail **silently** — `xargs` is the bridge · the real price of a temp file is **bytes written to disk**, not seconds — on flash that is product lifetime |
| `bt-11` | `uniq` compares each line only with the one **immediately before** it — no `sort` first, no correct count, and no error either · `sed` is a **filter**, it never edits the file; `-i` writes a new file and renames over the path, so the inode changes (hard link splits, symlink replaced) · in **BRE** the characters `+ ? { } ( ) \|` are literals — a wrong-dialect pattern is still *valid*, so it silently answers a different question |
| `bt-12` | the apt index is a **snapshot on disk**, not a live view of the server — `apt-get update` is what makes it current · a dependency alarm is often **not real**: the resolver reports the first unsatisfiable path, not the cause · a `.deb` is a **derived artefact** — it is built from source, and what it installs is decided at build time, not at install time |
| `bt-13` | a shebang only takes effect when the **kernel** launches the file — `sh script.sh` ignores it entirely, and the script still exits 0 · `set -e` deliberately **looks away** whenever the exit status is being *asked for* (`if`, left of `&&`/`\|\|`, after `!`, non-final pipeline stage) — it only fires when the status would be thrown away · a function returns a **status**, not a value: `return` is 8-bit and 0 already means success, so counts must leave via `echo` + `$( )` |
| `bt-14` | `int`/`long` have **no fixed width** — the target's ABI decides, so a struct that fits on x86-64 can silently change size on ARM32 · the compiler **inserts padding**, so reordering fields changes `sizeof` — the layout is not the declaration order laid end to end · `volatile` forbids the compiler from assuming memory never changes by itself, and its absence is **invisible at `-O0`** — the bug only appears at `-O2` |
| `bt-15` | the preprocessor is a **text substituter** — it does not know C and does not know operator precedence, so `100 / HALF_BAD(10)` is 5, not 20 · a **declaration** is all stage 2 ever asks for; a **definition** is only demanded at stage 4 — so a clean `gcc -c` proves nothing about whether the function exists · every error message **names the stage that produced it**, so the message itself says which file to open |
| `bt-16` | make chỉ so mtime của phụ thuộc ĐÃ khai báo — không đọc nội dung, không biết tới phụ thuộc chưa khai báo · .PHONY cần thiết vì make coi MỌI mục tiêu là một tên file · obj-$(CONFIG_X) += x.o cho ba hành vi từ một dòng, vì tên biến đích được ghép từ giá trị cấu hình |
| `bt-17` | .so không copy mã, chỉ ghi TÊN vào NEEDED — người tìm lúc build (ld) và người tìm lúc chạy (ld.so) là hai hệ thống khác nhau · trình liên kết tĩnh lấy thư viện theo đơn vị THÀNH VIÊN (một file .o), không theo từng hàm · khi cả .a và .so cùng tên đều có mặt, trình liên kết LUÔN ưu tiên bản động |

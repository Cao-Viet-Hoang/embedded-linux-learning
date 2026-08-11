---
name: progress-storage
description: How progress is stored for the Embedded Linux course — Firebase Firestore is the only home of lesson ticks, quiz answers and exercise answers; localStorage keeps machine preferences only. Covers the schema v3 document shapes, the optimistic-write-then-revert rule, the offline lock, the fromCache/green-dot trap, the Firestore Rules whitelist and how to re-test it. Use when touching js/store.js, js/cloud.js, js/account.js, js/toast.js, firebase/firestore.rules, the sync dot, the username modal, or anything about saving, syncing or losing progress.
---

# Progress storage — §14 of the project conventions

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged**, so a
> `CLAUDE.md §14.3` reference anywhere in the repo means the §14.3 below.
>
> `CLAUDE.md` §1 still governs the offline promise: everything that *teaches* works with no
> network; only *recording* requires it. `CLAUDE.md` §12 carries the current deploy status.

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
  items: { "a1": { p: 2 }, "b3": { txt: "…", ck: [0,2] }, ... }   // §13.7 (`write-exercise` skill), per-item state
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

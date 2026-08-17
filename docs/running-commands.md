# §9.1. Running commands on the user's machine

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged.**
>
> This is the operational half of hard rule 2 (`CLAUDE.md` §2): every command that ends up
> in a lesson or an exercise set is run here first, and its real output is what gets pasted.
> Read together with `docs/environment.md` (§10) — the facts already measured.

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
- Re-check §10 (`docs/environment.md`) first — a fact already recorded there does not need re-probing. Add anything
  new the probe taught you *to* §10 (`docs/environment.md`) so the next session skips the probe entirely.

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
- Vietnamese text, `$(...)`, `awk '{print $5}'`, `time (...)` and `$?` (exit-code checks
  written inline as `cmd; echo $?`) all break when nested through
  `wsl -d Ubuntu -- bash -lc '...'` — confirmed 2026-08-16: the same `which cd; echo $?`
  reports `0` inline but `1` when run from a script file. Write the script to a temp file
  with `Write` and run the file instead. Delete the temp file afterwards.
- QEMU: `-nographic` conflicts with `-monitor stdio`. Use
  `-display none -serial null -monitor stdio` instead.
- **`bash -lc` does not source `~/.bashrc`.** It is a login shell but not an interactive
  one, and Ubuntu's `~/.profile` only sources `~/.bashrc` for interactive shells. This means
  verification is blind to anything defined only in `~/.bashrc` — most importantly the
  default `alias ls='ls --color=auto'` (`~/.bashrc:78`). A command that resolves aliases
  (`command -v`, `type`, `alias`, a shell function) can therefore verify one way here and
  behave differently in the learner's real interactive terminal — confirmed 2026-08-16 on
  lesson 4's `readlink -f "$(command -v ls)"`: `bash -lc` reports `/usr/bin/ls`, `bash -ic`
  reports `alias ls='ls --color=auto'`, and `readlink -f` on the latter silently prepends the
  cwd instead of erroring, producing a plausible-looking but wrong path. Before trusting a
  verified output for a command that touches aliases/functions/builtins, re-run it through
  `bash -ic` too and compare. If they differ, the lesson must say so explicitly (e.g. warn
  that the reader's own aliases can change this) rather than assert one output as universal.

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
the lesson notes in §12.1 (`docs/course-notes.md`) — for instance, lesson 32 creates `~/bai32/` that lesson 33 expects.
Do not delete those directories; they are part of the course continuity. If in doubt, ask
before deleting.

When writing a probe script, give it a name like `tmp-probe-lesson-XX.sh` so it is obvious
it is temporary. When you are done testing, delete it.

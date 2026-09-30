# §12.1. Course continuity notes

> Split out of `CLAUDE.md` §12 on 2026-08-11. `CLAUDE.md` §12 keeps the short status —
> what is written, what is next, what is deployed. This file keeps the per-module content
> decisions that only matter while writing or editing a lesson.
>
> **Update this file in the same commit as the lesson that changes it.**

## Module and lesson notes

- **Chặng 07 — `Linux Kernel` (lessons 37–41).** Lesson 38 (`Source kernel và cách định
  hướng`, written 2026-08-20) owns the following and later lessons must not re-teach them:
  - **The tree on disk is `~/bai38/linux-6.18.45` (1.7 GB), and lesson 38's closing callout
    tells the learner to keep it — lesson 39 runs `make menuconfig` inside it.** `~/bai38`
    also holds `linux-6.18.45.tar.xz` (154 592 412 B), `linux-6.18.45.tar.sign` (991 B) and
    an **optional** shallow git clone at `~/bai38/linux` (2.0 GB, `.git` 282 MB) that the
    learner may have skipped. Never assume `~/bai38/linux` exists; `~/bai38/linux-6.18.45`
    you may assume.
  - **Version pinned: 6.18.45 (longterm/stable, signed by Greg Kroah-Hartman).** Makefile
    `VERSION 6 / PATCHLEVEL 18 / SUBLEVEL 45`. Lesson 38 states the line numbers of seven
    symbols *for this exact version* — a later lesson that bumps the version invalidates
    every one of them.
  - **GPG verification belongs to lesson 38**: the signature is over the *uncompressed*
    `.tar`, so `xz -cd … | gpg --verify ….tar.sign -`. Fingerprints
    `647F28654894E3BD457199BE38DBBDC86092693E` (Greg KH) and
    `ABAF11C65A2970B130ABE3C479BE3E4300411886` (Linus). The `WARNING: This key is not
    certified` line is **normal** and lesson 38 says so at length — do not "fix" it anywhere.
  - **The four ways to interrogate the tree** (symbol name anchored with `^` · `compatible`
    string · `CONFIG_` symbol via `obj-$(CONFIG_X) += y.o` · `MAINTAINERS` +
    `scripts/get_maintainer.pl`) are lesson 38's spine. Later lessons should *use* them and
    point back, not re-explain them.
  - **The PL011 walk is spent**: `"arm,pl011"` → `drivers/tty/serial/amba-pl011.c` →
    `drivers/tty/serial/Makefile:30` → `Kconfig:48` / `:59` → the explanation of
    `console=ttyAMA0`. Chặng 08 must find a different device for its own walk-through.
  - **The macro trap is spent**: `__arm64_sys_write` does not exist in the source (token
    paste `##` in `arch/arm64/include/asm/syscall_wrapper.h:48–58`). Do not present it as a
    fresh discovery later.
  - **`fs/shmem.c` does not exist** — tmpfs lives at `mm/shmem.c`. Lesson 38 uses
    `fs/proc/inode.c:555` (`proc_reg_file_ops`) as its second `file_operations` example.
  - **`scripts/get_maintainer.pl` works fine on a tarball tree without `--nogit
    --nogit-fallback`** — it silently skips the git heuristics and prints the same four
    lines. Verified 2026-08-20. The flags are for determinism and speed only; an earlier
    draft of lesson 38 wrongly claimed the script *errors* without them.
  - **Every search timing in the lesson is page-cache dependent** — see `docs/environment.md`.
    Any future lesson quoting a `grep`-over-the-kernel figure must run three warm-ups first
    and say so, or it will publish a number that is off by more than an order of magnitude.

- **Lesson 39 (`Kconfig và menuconfig`, written 2026-08-24) owns the following. Lessons 40–41,
  and every later `defconfig`/Buildroot/BusyBox lesson, must *use* these and point back rather
  than re-teach them:**
  - **It runs inside lesson 38's tree — `~/bai38/linux-6.18.45`, `ARCH=arm64`** — and leaves it
    **pristine on purpose**: `.config` is the plain `make ARCH=arm64 defconfig` output, md5
    `611d4d6d025c3b7e030e1352b8efaf86`, and the practice deletes `./defconfig`,
    `.config.backup` and `.config.old` at the end. **Lesson 40 may assume exactly that
    `.config` exists** and may quote its numbers, but must `md5sum` or re-run `defconfig`
    before quoting anything finer, because the learner may have poked at it in `menuconfig`.
  - **The Kconfig *language* is spent**: `config` / `menuconfig` / `choice`, the five types
    (`bool` `tristate` `string` `int` `hex`), `prompt`, `depends on`, `select`, `default`,
    `def_bool`, `help`, and `bool "…" if EXPERT`. The worked entry read line by line is
    `drivers/tty/serial/Kconfig` (PL011) plus `arch/x86/Kconfig:1108` `X86_LOCAL_APIC`.
  - **The four states of a symbol are spent** — `=y`, `=m`, `# … is not set`, and **absent
    entirely** (dependency unmeetable). The canonical examples used, and therefore burnt:
    `EXT4_FS=y`, `BTRFS_FS=m`, `# XFS_FS is not set`, `X86_LOCAL_APIC` absent, `ARM_AMBA=y`.
    Do **not** reuse `# CONFIG_BTRFS_FS_POSIX_ACL is not set` as an "explicitly off" example —
    it is `=y` in the arm64 defconfig (this was a real error caught during verification).
  - **`y` vs `m` as the compiler sees it is spent**: `=y` → `#define CONFIG_X 1`; `=m` →
    `#define CONFIG_X_MODULE 1` **and no plain `CONFIG_X`** (verified: `grep -c '^#define
    CONFIG_BTRFS_FS 1$'` → `0`), hence `IS_ENABLED()` / `IS_BUILTIN()` / `IS_MODULE()` /
    `IS_REACHABLE()` in `include/linux/kconfig.h`. Chặng 10 should *apply* this, not re-derive it.
  - **The generated-file chain is spent**: `syncconfig` → `include/config/auto.conf`
    (read by `Makefile:798`, for make) + `include/generated/autoconf.h` (for gcc) +
    `include/config/auto.conf.cmd`. **`make ARCH=arm64 syncconfig` prints nothing at all,
    even cold** — verified by moving `include/config` and `include/generated` aside. Do not
    write a lesson that expects it to be chatty.
  - **The target set is spent**: `defconfig`, `menuconfig`, `nconfig`, `oldconfig`,
    `olddefconfig`, `listnewconfig`, `helpnewconfig`, `savedefconfig`, `syncconfig`,
    `tinyconfig`, `allnoconfig`, `allmodconfig`, `localmodconfig`, `mod2yesconfig`.
  - **Two traps are spent, both verified, both worth pointing back to rather than re-staging:**
    (a) **y → m → y is not symmetric.** `scripts/config --module SERIAL_AMBA_PL011` +
    `olddefconfig` silently drops `CONFIG_SERIAL_AMBA_PL011_CONSOLE` (a console cannot be a
    module); switching back with `--enable` restores the driver but leaves
    `# CONFIG_SERIAL_AMBA_PL011_CONSOLE is not set` — a kernel that boots with **no console
    output**. (b) **`select` cannot be overridden by hand**: `--disable SERIAL_CORE` survives
    in `.config` until the next `olddefconfig` puts it straight back to `=y`, because 72
    `select SERIAL_CORE` lines in `drivers/tty/serial/Kconfig` demand it.
  - **`savedefconfig` numbers are spent**: `.config` **11 727 lines / 314 649 B** shrinks to
    `./defconfig` **1 755 lines / 42 448 B**, and the round trip
    (`cp defconfig .config && make olddefconfig`) reproduces the original byte for byte.
    The shipped `arch/arm64/configs/defconfig` is **1 824 lines**.
  - **The version-bump workflow is spent**: `listnewconfig` → `helpnewconfig` → `olddefconfig`,
    demonstrated by deleting `CONFIG_BTRFS_FS=m` from `.config` so `listnewconfig` prints
    exactly `CONFIG_BTRFS_FS=n`. Chặng 11 (Buildroot) should reuse this vocabulary.
  - **The `menuconfig` screenshots are text captures with the ncurses box art and colour
    stripped**, taken through a pty harness — the lesson says so explicitly in `notes`. If a
    later lesson needs a TUI screen, do the same and say the same; do not present a stripped
    capture as if it were the literal screen.
  - **mconf marker semantics were read out of `scripts/kconfig/mconf.c`**, not guessed:
    `[*]`/`[ ]` bool changeable, `-*-` unchangeable (bool or tristate), `<*>`/`<M>`/`< >`
    tristate changeable, `{*}`/`{M}` when `rev_dep.tri == mod` — selected up to `m`, still
    raisable to `y` but not lowerable to `n`.
  - **`scripts/config` accepts either `SERIAL_AMBA_PL011` or `CONFIG_SERIAL_AMBA_PL011`** —
    lines 8 and 61–62 strip the prefix. An earlier draft wrongly called the long form a
    common mistake. Verified 2026-08-24.

- **Chặng 02 — `C và công cụ build` (lessons 14–18).** First entry for this module; written
  2026-08-19 while producing `bt-14` and `bt-15`. Decisions a later lesson or set must not
  contradict:
  - **Lesson 15's `Lỗi thường gặp` table was corrected on 2026-08-19.** It claimed
    `warning: implicit declaration of function 'f'`. On this machine GCC 15 makes that a
    hard **error** — even under `-std=gnu17` — so the two-step story it told (warning at
    stage 2, then `undefined reference` at stage 4) cannot happen here. The row now states
    both behaviours and says which one this machine shows. Full measurement in
    `docs/environment.md`. **Any lesson that says "GCC will warn about X" must be run
    before the sentence is written** — GCC 14/15 promoted several long-standing warnings.
  - **Do not build a library-linking demo on `sqrt(2.0)`.** A constant argument is folded
    at stage 2, `U sqrt` never appears in the `.o`, and the link succeeds with no `-lm` —
    the classic demo silently fails to demonstrate anything. `bt-15` C2 uses a runtime
    argument for exactly this reason; lesson 17 (`-l`, static vs shared) must do the same.
  - **The "static hides the symbol" demo needs the declaration in the *caller*.** Writing
    `int scale(int);` in the shared header and `static int scale(...)` in the `.c` is now
    `error: static declaration of 'scale' follows non-static declaration` — the build never
    reaches the linker. Declare it in `app.c` instead and you get the intended
    `undefined reference to 'scale'` with `nm` showing lowercase `t`.
  - `bt-14` spends three trục on the C **language/ABI** axis (int width, padding,
    volatile) and `bt-15` spends three on the **toolchain** axis (preprocessor is text
    only, declaration ≠ definition, each message names its stage). Lessons 16–18 (`make`,
    libraries, debugging) must pick trục outside both sets — see §13.8 of the
    `write-exercise` skill for the exact sentences.
  - `bt-14` E6 deliberately ends unanswered and points at lesson 15; `bt-15` E6 ends
    unanswered and points at lesson 17 (what the extra 14 KB in the executable is). Keep
    that hand-off chain intact when writing `bt-16`.
  - **`bt-16` and `bt-17` were written on 2026-08-23**, continuing that hand-off chain:
    `bt-16` E6 ends unanswered pointing at lesson 17 (why `printf` needs no source in the
    project, and what the static/dynamic size gap is), and `bt-17` E6 ends unanswered
    pointing at lesson 18 (why file size, `size`'s text+data+bss total, and the
    post-`strip` size are three different numbers). `bt-17`'s trục deliberately picked
    "linker always prefers `.so` when both formats are present" over soname — soname
    scored the same 5 points in the audit but was demoted to breadth (A8/B4/C4) because it
    shares the same *kind* of evidence (`readelf -d | grep NEEDED`) as the chosen trục, and
    spiralling both would make two trục lean on one data source. **Bài 18 (ELF anatomy /
    `strip`) must not pick a trục that resolves via `readelf -d | grep NEEDED` or `nm -D`
    output alone** — those diagnostic moves are already spent in `bt-17`.

- **Exercise sets `bt-12` and `bt-13` were written on 2026-08-17/18** and their trục are
  recorded in §13.8 of the `write-exercise` skill. Two content decisions a later set must
  not contradict:
  - `bt-13` deliberately does **not** spiral quoting / `"$x"` word-splitting, even though
    lesson 13 teaches it at length and it is the single most useful idea in the lesson.
    It was already spent as a trục by `bt-04` ("the shell splits on whitespace *before*
    the command ever sees the arguments"). It appears in `bt-13` as breadth only —
    A3, A7, B5 — which is the correct handling under §13.4 step 4.
  - The three trục of `bt-13` are all about the **gap between "the script finished" and
    "the script did its job"**: shebang ignored by `sh`, `set -e` looking away, `return`
    carrying a status not a value. Every one of them produces **exit code 0 on a wrong
    result**. A later scripting-adjacent set should pick a different failure axis rather
    than restate this one.
- **Silent-failure evidence built for `bt-13` is reusable and already verified** — the
  `sh dbl.sh` / `sh arr.sh` transcripts, the four-context `set -e` probe, the
  `PIPESTATUS` sequence, the guarded `mktemp -d` + `trap` cleanup, and the five-defect
  build script. All are in `docs/environment.md` (§10). Do not re-probe them; do re-read
  §9.1.0 of `docs/running-commands.md` before writing any new probe that contains a
  destructive command.

- **Lesson 37 opens Chặng 07 and deliberately builds nothing.** It teaches kernel
  architecture entirely by dissecting the *running* WSL2 kernel through `/proc` and `/sys`
  — no source tree, no `make`. That is only possible because `/proc/config.gz` happens to
  be readable here (`docs/environment.md`). A `warn` callout in the practice section says
  out loud that the machine being dissected is **x86-64 WSL2**, not ARM64, and that the
  architecture-specific names differ; lesson 38 is where the ARM64 counterparts
  (`el0_svc`, `__arm64_sys_write`) get read in source. Do not "fix" this into an ARM64
  practice — the point is that the learner can do it on the machine in front of them.
- **Lesson 37 owns, and lessons 38–41 must not re-teach:** "the kernel is called, not run"
  (the three entry paths: syscall / interrupt / kernel thread), monolithic vs microkernel
  and *why a `.ko` is packaging rather than isolation*, the six subsystems and their source
  directories, the five-layer path of a `write()` (`entry_SYSCALL_64` → `do_syscall_64` →
  `__x64_sys_write` → `vfs_write` → `ext4_file_write_iter`), `f_op` as C's vtable, `/proc`
  files having `st_size` 0, vDSO + `[vvar]`, `kptr_restrict`/KASLR, the bus–device–driver
  triangle + `modalias`, and reading the `user`/`sys` split from `time`. Lesson 41 may
  reuse the `user`/`sys` idea only as a *measurement*, not as a fresh concept.
- **Lesson 37 measures vDSO with `clock_gettime`, on purpose.** Lesson 19 already owns
  syscall cost via `getpid` (254.9×) and stdio buffering (358× fewer syscalls); re-measuring
  `getpid` here would be a repeat. Lesson 37 cites Bài 19 ten times but measures something
  lesson 19 cannot: a call that *does not reach the kernel at all*.
- **Lesson 37's practice creates and then deletes `~/bai37`** (three small C programs). It
  leaves nothing behind and depends on no earlier lesson's files.
- **`~/bai32` was gone from the machine as of 2026-08-18; it is now *partly* back.** The
  note below says module 06 depends on those files persisting, and it did while 33–36 were
  being written — but the directory was deleted. On **2026-08-27** lesson 40's verification
  re-created **`~/bai32/initramfs.cpio.gz` only** (1 030 528 B, 3871 blocks, md5
  `f4c51fa4dc08f661e1b3257b1e356867`), together with `busybox.deb`, `busybox-pkg/` and
  `initramfs/`. **There is still no `~/bai32/Image`** — lesson 33's practice quotes it and
  will fail until someone rebuilds it. Lesson 40 builds its own `Image` inside
  `~/bai38/linux-6.18.45/arch/arm64/boot/` and boots *that* against the restored initramfs;
  it does not restore lesson 32's. Also: **lesson 32's hard-coded BusyBox URL 404s now** —
  see `docs/environment.md` for the working one and why not to hard-code it.

- **Lesson 40 (`Build kernel ARM64 và boot`, written 2026-08-27) leaves `~/bai38/linux-6.18.45`
  BUILT — 4.6 GB — and Chặng 08 through Chặng 10 depend on that.** Never `mrproper` it; the
  lesson itself carries a `danger` callout saying so. What is on disk after it:
  `.config` with **`CONFIG_LOCALVERSION="-embedded"`**, `arch/arm64/boot/Image` (41 MB),
  `vmlinux` (157 MB, `with debug_info, not stripped`), `System.map`, **1 423** `.ko`,
  **1 577** `.dtb`, and `.version` sitting at **4**. Kernel release string is
  **`6.18.45-embedded`**. Also left behind: `~/bai40/modroot` (325 MB) and
  `~/bai40/modroot-stripped` (80 MB) — `~/bai40` totals **404 MB**, and Chặng 09 is supposed
  to install the stripped one into a real rootfs. A fresh unbuilt tree is **1.7 GB**, so the
  build costs **2.9 GB**. The build logs the lesson quotes (`~/bai40-logs/image.log`,
  `dtbs.log`, `modules.log`, `incr.log`, `config-cross`, `config-nocross`) were **deleted after
  verification** — every figure taken from them is already transcribed into the lesson and into
  `docs/environment.md` (§10), so nothing needs to re-read them. Also still on disk:
  `~/bai38/linux` (a 2.0 GB git clone from lesson 38) and `~/bai38/linux-6.18.45.tar.xz`
  (148 MB) — `~/bai38` totals **6.6 GB**.
- **The `#N` build counter in lesson 40's captured boot is `#2`, and the lesson says out loud
  that a learner following steps 1–6 in order will see `#1`.** The writing machine relinked
  once extra during verification. Step 5 opens with `cat .version` for exactly this reason,
  and step 6's incremental rebuild shows `3 → 4` with the same caveat. Do not "correct" these
  to a tidy `#1` — they are real captures and the caveat is the honest fix.
- **Lesson 40 owns, and lessons 41+ / Chặng 11 must not re-teach:** `ARCH=` vs
  `CROSS_COMPILE=` (including that Kconfig *asks the compiler*, so forgetting `CROSS_COMPILE`
  on `defconfig` changes `.config` by **19 lines / 15 ARM64 features** with no warning, while
  *mistyping* it fails loudly at `scripts/Kconfig.include:40`); the
  `.c` → `.o` → `built-in.a` → `vmlinux.a` → `vmlinux` → `Image` chain; the 3-pass `kallsyms`
  relink; `objcopy -O binary -S` as the reason `vmlinux` is **3.82×** bigger than `Image`;
  target selection (bare `make` on ARM64 gives you **no** `Image`); `O=` and `mrproper`;
  `modules_install` + `INSTALL_MOD_PATH` + `INSTALL_MOD_STRIP=1` (325 MB → 80 MB); and the
  incremental-rebuild loop.
- **Numbers lesson 40 has already spent** (do not re-measure them as a fresh discovery):
  `Image` **1 110.8 s**, parallel ratio **5.83**; `dtbs` **13.802 s**, ratio **5.06**;
  `modules` **20m37.036 s**, ratio **5.91** (modules cost **more** than the kernel);
  incremental rebuild after one `touch` **36.390 s** — **30.5×** faster but ratio only
  **2.00**, because the single-threaded `kallsyms` chain dominates a 28-line rebuild.
  `defconfig` under `O=` on a clean tree **4.467 s**; `mrproper` on a lightly-dirtied tree
  **3.163 s** (`CLEAN scripts/basic` + `CLEAN scripts/kconfig`).
- **Two Kbuild facts lesson 40 discovered the hard way — a later lesson will hit them again:**
  (1) `.config` is *Kconfig* syntax (`CONFIG_LOCALVERSION="-embedded"`, quoted) but
  `include/config/auto.conf` is *make* syntax (`CONFIG_LOCALVERSION=-embedded`, **unquoted**),
  because make `include`s it directly and would treat quotes as literal characters.
  (2) `kernelrelease` is in `no-sync-config-targets` (`Makefile:299`), so it reads the **stale**
  `auto.conf` and will happily print `6.18.45` while `.config` already says `-embedded`;
  `make … syncconfig` fixes it and prints nothing. The `O=`-on-a-dirty-tree refusal comes from
  the `outputmakefile` guard at `Makefile:695`–`697`.
- **The `dtbs` log has 1 746 lines but only 1 577 `.dtb` exist on disk** — `1565 DTC` +
  `181 OVL`, where `OVL` steps produce `.dtbo` overlays and overlay-applied intermediates.
  Lesson 40 states the split and explicitly defers overlays to Chặng 08. A Chặng 08 lesson
  should pick that thread up rather than re-deriving the arithmetic.
- **Lesson 40's next-lesson callout promises Bài 41 four things**: dissecting
  `console=` / `root=` / `init=` / `loglevel=` (step 5 uses `console=ttyAMA0 rdinit=/init`
  without explaining it), `dmesg` and the eight log levels, reading the **268-line** boot log
  it captured, and shrinking the **41 MB** `Image`. Lesson 41 must deliver all four.

- **Lesson 41 (`Kernel cmdline, log và tối ưu kích thước`, written 2026-08-29) closes Chặng 07.**
  It delivered all four of lesson 40's promises. Written against the `Image` lesson 40 built
  (`6.18.45-embedded #4`), so it needs no kernel build of its own until its last step.
- **Lesson 41 owns, and no later lesson may re-teach as new:**
  - the cmdline supply chain **QEMU `-append` → DT `/chosen/bootargs` → `parse_args()` →
    `/proc/cmdline`**, and U-Boot's `bootargs` as the real-board equivalent;
  - `__setup()` vs `early_param()` vs `unknown_bootoption()`, and the **three-way split** of
    unknown tokens: no `=` → init's **argv**, has `=` → init's **envp**, known → a handler.
    Proved with `-append "… foo=bar hello"`;
  - `console=ttyAMA0,115200n8` field by field; the **replay** of the pre-console ring buffer;
    `earlycon` as bootconsole and the **doubled** handover lines;
  - `rdinit=` → `init=` → the four fallbacks, and their *different* failure semantics
    (`rdinit=` bad → `-2, ignoring`; `init=` bad → immediate `panic()`);
  - the three VFS messages as **distinct diagnoses** — `Cannot open root device ""` +
    `(0,0)` vs `No filesystem could mount root` + `(254,0)` vs `No working init found`;
  - `panic=N` and why it is wrong during development (each reboot wipes the ring buffer);
  - printk's **eight levels**, the ring-buffer-vs-console two-layer model, the four numbers in
    `/proc/sys/kernel/printk`, `loglevel=`/`quiet`/`debug`, `dmesg -n`, and `/dev/kmsg`;
  - `tinyconfig` as a *floor*, `CC_OPTIMIZE_FOR_SIZE`, the `KALLSYMS` cost, why `DEBUG_INFO`
    costs `vmlinux` but **not** `Image`, and out-of-tree builds with **`O=`** (first use in
    the course — Chặng 11 should build on it, not re-introduce it).
- **Numbers lesson 41 has already spent** (all in `docs/environment.md`; re-deriving any of
  them as a fresh discovery is repetition, not teaching):
  **247** console lines vs **257** in the ring buffer and the exactly **10** `KERN_DEBUG`
  lines between them · console enabled at line **106**, earlycon at lines **7–8**, handover
  doubled at **108–111** · `7 4 1 7` default and the `1/3/4/10` variants, with
  `dmesg | wc -l` = **257** in every one of them · **280 / 272 / 1 / 273** log lines for the
  four `console=` experiments · **15** panics in 90 s with `panic=5` · `Image`
  **41 089 536 → 1 961 992 → 3 303 432 B**, `=y` **3 286 → 421 → 506**, build
  **18 m 30,8 s → 2 m 23,7 s → 2 m 34,5 s**, ratios **12,44×** / **92,0 %** / **7,2×** ·
  `KALLSYMS` **5 743 888 B = 14,0 %** of `Image` · minimal-kernel `dmesg` **80** lines,
  `ls /proc` **60** entries.
- **Lesson 41 deliberately does NOT build a working `root=` disk.** It creates a *blank*
  64 MiB `blank.img` only to show that `No filesystem could mount root` differs from
  `Cannot open root device`, and says so on the page: formatting it and installing a real
  rootfs is **Chặng 09 (Bài 46–49)**. A Chặng 09 lesson should pick that thread up.
  Note the roadmap names Buildroot in **Chặng 11**, not Chặng 09 — an early draft of lesson
  41 got this wrong and it was corrected before shipping.
- **The 17 symbols lesson 41 re-enables on top of `tinyconfig`** (via
  `./scripts/config --file <build>/.config -e …` then `make olddefconfig`):
  `PRINTK TTY BINFMT_ELF BINFMT_SCRIPT MULTIUSER SERIAL_AMBA_PL011
  SERIAL_AMBA_PL011_CONSOLE BLK_DEV_INITRD RD_GZIP PROC_FS SYSFS FUTEX EPOLL SIGNALFD
  TIMERFD EVENTFD AIO`. They pull **+85** options through `select`/`depends on` (421 → 506) —
  the lesson uses that as concrete evidence for Bài 39's Kconfig mechanism. `DEVTMPFS` and
  `PRINTK_TIME` are deliberately *left off*, so the minimal boot shows
  `mount: mounting none on /dev failed: No such device` and has **no timestamps at all**.
- **Lesson 41 leaves a second kernel source tree and two build dirs on disk**:
  `~/bai41/linux-6.18.45` (clean, unconfigured, ~1,7 G), `~/bai41/b-tiny`,
  `~/bai41/b-min`, `~/bai41/blank.img` (64 MiB), `~/bai41/initramfs/` and
  `~/bai41/initramfs.cpio.gz` (**1 030 594 B**) — about **1,8 G** total. Nothing after
  Chặng 07 depends on it, unlike `~/bai38/linux-6.18.45` and `~/bai40/modroot*`, which must
  still never be touched.
- **The probe initramfs `~/bai41/initramfs/init`** adds three things to lesson 32's `/init`:
  `mount -t devtmpfs none /dev`, `echo "=== init argv: $0 $* ==="` + `env`, and
  `cat /proc/cmdline`. The `devtmpfs` line is **not optional** — see the `/dev/kmsg` gotcha
  in `docs/environment.md`. Lesson 32's own `~/bai32/initramfs` is copied, never modified.
- **Lesson 41's next-lesson callout promises Bài 42 one thing**: the pre-2011 "board file"
  problem, why hardware description was split out of kernel C code, and DT-on-ARM vs
  ACPI-on-x86. It also hands Chặng 08 three unexplained threads lesson 41 raised on purpose:
  `/chosen/bootargs`, `/chosen/stdout-path` (why a board boots with no `console=`), and how
  `earlycon` learns the MMIO address `0x9000000` without being told.
- **Lesson 41's `ls ~/bai41/initramfs` capture was wrong and was corrected 2026-08-29.**
  It published `bin  dev  etc  init  proc  root  sys  usr` and called it "tám thư mục";
  the real listing is **`bin  dev  init  proc  sys`** — lesson 32 creates exactly
  `initramfs/bin initramfs/dev initramfs/proc initramfs/sys` plus `/init`, and lesson 41
  only `cp -a`s it. Both the capture and the sentence after it now say **four** directories.
  Nothing else in lesson 41 depended on the phantom `etc/root/usr`. Treat this as the
  standing example of why hard rule 2 exists: the block *looked* like a plausible initramfs
  skeleton, which is exactly why nobody re-ran it.

### Chặng 08 — Device Tree

- **Lesson 42 (`Vì sao Device Tree ra đời`) is history + motivation only, not syntax.**
  It owns: the pre-2011 `arch/arm/mach-*/board-*.c` model, `platform_device` +
  `struct resource`, discoverable buses (PCI/USB) vs non-discoverable MMIO,
  `CONFIG_ARCH_MULTIPLATFORM`, `DT_MACHINE_START` / `.dt_compat`, the Open Firmware descent
  of the `of_` prefix, and **DT-on-ARM vs ACPI-on-x86**. It deliberately does **not** teach
  DTS syntax (Bài 43), bindings / `of_match_table` (Bài 44), or a full
  `/proc/device-tree` walk (Bài 45) — it touches only `model`, `chosen/stdout-path`,
  the size of `/sys/firmware/fdt` and `/proc/consoles`.
- **Lesson 42 closed two of the three threads lesson 41 left, and left one on purpose.**
  Closed: `/chosen/stdout-path` (boot 3 runs with **no** `-append` at all and still gets a
  console) and how bare `earlycon` finds `0x9000000` (boot 4 — the answer is
  `stdout-path` → `OF_EARLYCON_DECLARE`). **`/chosen/bootargs` is still unspent** — leave it
  for Bài 43 or Bài 45.
- **The ARM-vs-x86 framing lesson 42 commits to: "platform, not CPU architecture."**
  ARM64 *servers* use ACPI (SBBR), some x86 SoCs carry a DT. A later lesson saying
  "ARM = DT, x86 = ACPI" as a law contradicts lesson 42's own `cal warn`.
- **Numbers lesson 42 spends** (all measured 2026-08-29 on `~/bai38/linux-6.18.45`, kernel
  **6.18.45**; recorded in `docs/environment.md`): `arch/arm/mach-*` = **55** dirs /
  **20** surviving `board-*.c` / **4 220** lines · the whole pre-DT `mach-*` bulk **474**
  files / **108 675** lines vs `drivers/of` **22** files / **18 236** lines ·
  `arch/arm64/mach-*` = **0** / **0** · `board-ams-delta.c` **851** lines / **18**
  `platform_device` · `board-generic.c` **378** lines / **15** `DT_MACHINE_START` ·
  **5 322** `.dts`+`.dtsi` under `arch/arm{,64}/boot/dts` (**1 784 680** lines) ·
  **5 182** binding `.yaml` · **58** dts/dtsi mentioning `pl011` (see the artefact trap
  below — the published **175** was wrong and was corrected 2026-09-05) · **171** powerpc dts ·
  cpio **1 030 749 B** = `3872 blocks`. Do not re-derive these as fresh discoveries.
- **The `find arch -name '*.dts'` over-count trap.** Counting without scoping to
  `arch/arm/boot/dts arch/arm64/boot/dts` gives **5 974** / **1 906 110** because it sweeps
  every architecture; `grep --include='*.dts'` alone misses `.dtsi` and gives 7 instead of
  58. Lesson 42's `Lỗi thường gặp` table teaches this; a later lesson must use the scoped
  form (`docs/environment.md`).
- **The built-tree artefact trap — this one shipped as a defect and was fixed 2026-09-05.**
  `~/bai38/linux-6.18.45` is a **built** tree, so an unfiltered `grep -rl` under
  `arch/arm{,64}/boot/dts` matches compiled output as well as source. For `arm,pl011` the
  unfiltered count is **175** = 7 `.dts` + 51 `.dtsi` + **63 `.dtb`** + **54 `.dtb.tmp`**;
  **117 of the 175 are artefacts** — the same descriptions counted a second time, compiled.
  The real answer is **58** source files. Lesson 42 originally published 175 *and* called
  them `175 bo mạch` ("175 boards") — wrong twice over, since a `.dtsi` is not a board.
  Both the number and the wording are corrected now, and lesson 42's `cmdx` has a row on
  why `--include` is mandatory on a built tree. Lesson 43's include callout cites the same
  **58** and points back at Bài 42. **Any future count over a kernel tree must filter by
  extension**, and must never describe a file count as a board count.
- **The 2011 LKML history in lesson 42 is NOT machine-verified, and the lesson says so.**
  `~/bai38/linux` is a **shallow clone (1 commit)** — no `git log` archaeology is possible
  without a ~5 GB full clone. Lesson 42 puts that admission in a `cal info` rather than
  passing the story off as measured. Any later lesson quoting 2011 history inherits the
  same obligation.
- **`~/bai42` (~5 MB) is disposable** — `initramfs/`, `initramfs.cpio.gz`, four `boot*.log`.
  Like `~/bai41` and unlike `~/bai38` / `~/bai40`, nothing after it depends on it. It reuses
  `~/bai38/linux-6.18.45/arch/arm64/boot/Image`, which must keep existing.
- **The four-boot matrix is lesson 42's punchline: one byte-identical `Image`, four
  machines.** Boots 1–2 differ only in `-m` / `-smp` (`1024`/`4` vs the default), boot 3 has
  no `-append`, boot 4 uses `earlycon`. A later lesson re-proving "one kernel, many boards"
  is repeating lesson 42, not teaching.
- **Lesson 43 (`Cú pháp DTS`, written 2026-09-05) owns DTS *syntax* and nothing else.**
  It teaches: node anatomy `label: name@unit-address`, the four property types (string,
  string list, cell array `<>`, byte array `[]`, boolean = zero-length), `compatible` /
  `reg` / `status`, `#address-cells` + `#size-cells` (**the parent decides how a child's
  `reg` is read** — `#size-cells = <0>` for CPUs, I2C, SPI), `ranges` in its three states
  (with a value = translate, empty = identity, absent = untranslatable), **label vs
  phandle** (a label is compile-time only; `&label` inside `<>` becomes a phandle cell,
  outside `<>` becomes a path string), `#clock-cells`/`#gpio-cells` as "how many parameter
  cells must follow a phandle to me", the `/include/` + override chain, and overlays
  (`fragment@N`, `target`, `__overlay__`, `__fixups__`, `__symbols__`). A later lesson must
  not re-teach these from scratch.
- **Lesson 43 deliberately never boots QEMU.** Every step is `dtc`/`fdtget`/`fdtoverlay` on
  the host — the reasoning is that syntax is verifiable without a boot, and mixing a boot in
  would blur the 43/45 boundary. **Bài 45 is where a modified DT is actually booted**, and
  `/chosen/bootargs` (left unspent by lessons 41 and 42) is still unspent after 43 — it now
  belongs to Bài 45.
- **DTB type erasure is lesson 43's key insight and must not be contradicted.** A `.dtb`
  stores only a property's *name* and *byte length*, never its type. So `dtc -I dtb -O dts`
  **guesses**: 4 bytes → `<0x…>`, printable-and-NUL-terminated → a string, anything else →
  `[..]`. A round-tripped `.dts` is therefore not guaranteed to look like the original.
- **The rpi3 two-line-wrapper trap.** `arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts` is
  **2 lines** — an SPDX line plus `#include "arm/broadcom/bcm2837-rpi-3-b.dts"`. The real
  source (**154** lines) lives under `arch/arm`. Reading the arm64 path and reporting "2
  lines" is wrong; the `cpp` expansion is **1 212** lines from **19** real files (2 `.dts`,
  10 `.dtsi`, 7 `dt-bindings` `.h`). The `# N "file"` linemarker count is **21** because
  `<built-in>` and `<command-line>` are included and **sort last**, not first.
- **Numbers lesson 43 spends** (measured 2026-09-05, recorded in `docs/environment.md`):
  `virt.dtb` **1 048 576 B** (QEMU always pads `dumpdtb` to 1 MiB) decompiling to **407**
  lines at `-smp 2` with `-append` · `board.dts` 800 B → `board.dtb` **867 B** · `types.dts`
  250 B → **323 B** · include chain `soc-common.dtsi` **626 B**, board-a 137→**730**, board-b
  240→**756**, board-c 192→**558** · overlay: base-plain **730 B**, `led.dtbo` **504 B**,
  `fdtoverlay` without `-@` → `FDT_ERR_BADOFFSET` **exit 1**; with `-@` base **941 B**
  (+211) and merged **1 047 B** exit 0 · rpi3 `dtc` **15 607 B** vs `dtc -@` **21 605 B**
  (+5 998 = **28 %**), sha256 `c2d92e31…` byte-identical to the kernel's own `.dtb`.
- **`~/bai43` (~1.2 MB) is disposable** — `~/bai43x` too. Nothing after Chặng 08 depends on
  either. Note **over half of that 1.2 MB is `virt.dtb`'s 1 MiB of QEMU padding**, not real
  content. Lesson 43 reads `~/bai38/linux-6.18.45` but writes nothing into it.
- **`fdtget` takes node/property *pairs*.** An odd argument count produces its whole usage
  block followed by `Error: must have an even number of arguments` — captured verbatim in
  lesson 43's `Lỗi thường gặp` table, along with `FDT_ERR_NOTFOUND` (target label absent
  from `__symbols__`) vs `FDT_ERR_BADOFFSET` (base compiled without `-@`, so no
  `__symbols__` at all). A later overlay lesson should reuse this distinction, not re-derive it.
- **`CONFIG_OF_OVERLAY=y` is what makes the kernel Makefile pass `-@` to `dtc`** — verified
  on `~/bai38/linux-6.18.45`. Chặng 10 or a Yocto lesson touching overlays inherits this.
- **Lesson 44 (`Binding và cơ chế khớp driver`, written 2026-09-28) was the first lesson
  verified on machine B (`cah8hc@OSD`).** Every captured output in it — paths
  (`/home/cah8hc/embedded-course/bai38/...`), timings, the `dtschema` version — is machine B's,
  not machine A's. Do not "harmonise" it with lessons 38–43 or vice versa.
- **Lesson 44 owns bindings and matching; a later lesson must not re-teach these.** It teaches:
  binding YAML (`properties:` / `required:` / `const:`·`enum:` / `additionalProperties:`),
  installing `dtschema` in a venv, `make dt_binding_check DT_SCHEMA_FILES=…`,
  `dt-validate -m -s processed-schema.json`, `CHECK_DTBS=y`, `of_match_table`,
  `MODULE_DEVICE_TABLE` → `modules.alias` → `MODALIAS`, the scoring formula
  `INT_MAX/2 − (index << 2)` in `__of_device_is_compatible` (best score wins, not first match),
  the five-step path DTB → `of_platform_populate` → `platform_match` → `really_probe` →
  `probe()`, `-ENODEV` = "match rejected", `initcall_debug`, and sysfs `bind`/`unbind`.
  **It writes no driver** — Bài 50 (first module) and Bài 54 (platform driver + DT) own that,
  and Bài 54 inherits the `-EPROBE_DEFER` / deferred-probe thread lesson 44 only named.
- **The pipeline steps are called `giai đoạn 1–5`, never `chặng`.** `Chặng NN` means a module
  in this course; lesson 44 first wrote "chặng 2" for a pipeline step and it was renamed before
  shipping. Any later lesson referring back to those steps must say `giai đoạn`.
- **The walk-through device is `virtio,mmio`, not PL011** (PL011 was spent by Bài 38). Facts
  lesson 44 established and later lessons must not contradict:
  - QEMU `virt` declares **32** virtio-mmio slots; `probe()` is called on all 32 and returns
    **19** (`-ENODEV`, sign-flipped by `really_probe`, `dd.c:733`) on **31** empty ones
    (`DEVICE_ID == 0`). With one `-device virtio-rng-device` the populated slot is
    **`a003e00`** (the highest); a second device lands in **`a003c00`**.
  - `/sys/bus/platform/devices` holds **42** entries: **40** from the tree (8 + 32 virtio) plus
    **`alarmtimer.0.auto`** and **`serial8250`**, which C code creates by name. The tell is the
    `of_node` symlink. Nodes skipped by population: `memory@…`, `cpus`, `chosen` (no
    `compatible`), `intc@8000000` and `apb-pclk` (`OF_POPULATED` set by `IRQCHIP_DECLARE` /
    `CLK_OF_DECLARE`), and the three `arm,primecell` nodes, which go to **bus `amba`**.
  - **PL011 does not match by `compatible` at probe time.** `uart-pl011` is an `amba_driver`
    with `id_table` `{ .id = 0x00041011, .mask = 0x000fffff }`; the device's periphid reads
    `00141011`. `"arm,pl011"` itself is only consumed by `OF_EARLYCON_DECLARE` (`amba-pl011.c:2733`).
    Bài 38's "the kernel looks for the driver declaring `arm,pl011`" is true for earlycon only;
    lesson 44 says so explicitly, and a later lesson must not reassert the simpler version.
  - PSCI node is `"arm,psci-0.2", "arm,psci"`; the driver table lists `"arm,psci"` **first**,
    yet `psci: Using standard PSCI v0.2 function IDs` is printed — the scoring proof.
  - `platform@c000000` (`"qemu,platform", "simple-bus"`) gets `probe … returned 19` from
    `simple-pm-bus`, which refuses when `simple-bus` is not the first compatible.
  - `dt-validate` returns **0** even when it prints violations; `make … CHECK_DTBS=y` is silent
    on a second run because nothing is rebuilt. Both are in lesson 44's `Lỗi thường gặp`.
  - `initcall_debug` probe lines are `KERN_DEBUG` (not on console) and need
    **`log_buf_len=4M`**: the default 128 KiB buffer (`CONFIG_LOG_BUF_SHIFT=17`) loses the
    early ones.
- **Numbers lesson 44 spends** (machine B, 2026-09-28; details in `docs/environment.md`):
  5 182 yaml / 814 txt bindings · 928 vendor prefixes · `modules.alias` **6 174** `alias of:`
  lines, `rtc_pcf2127` 4 compatibles → 8 aliases, `virtio_mmio` 0 (built-in) ·
  `processed-schema.json` **25 017 437 B** · `dt_binding_check` 64–71 s · rpi3 `CHECK_DTBS`
  3 violations (`simple-bus.yaml`: `firmware`, `power`, `gpu` need `ranges`), 4 `dtc` warnings
  hidden by `scripts/Makefile.dtbs:96–101`, sha256 `c2d92e31…` unchanged · full arm64
  `dtbs_check` **1 402 s**, **1 396** dtbs checked, **2 558** violations in **498** dtbs (36 %) ·
  `~/bai44` **19M**.
- **`~/bai44` is disposable, but its `venv/` is worth keeping** for Bài 45 if the learner wants
  to validate the tree they modify there. `processed-schema.json` and the rebuilt `.dtb` files
  live inside `~/bai38/linux-6.18.45` and are normal build products — do not delete them as
  "lesson 44 residue".
- **Lesson 45 (`Thực hành Device Tree với QEMU virt`, written 2026-09-28, machine B) closes
  Chặng 08.** It owns: the dumpdtb → `dtc -I dtb` → edit → `dtc -I dts` → `-dtb` loop, writing
  **`/chosen/bootargs`** into the tree (the thread lessons 41–43 left is now **spent**), the
  bootargs priority (bootloader overwrites the property; `CONFIG_CMDLINE` only fills a blank),
  re-adding a label (`gpio0:`) to a decompiled node that only has a numeric phandle, the
  **three-tier check** (`/proc/device-tree` → `/sys/bus/platform/devices` → `driver` link), a
  `gpio-leds` node driving `/sys/class/leds` + `debugfs` `gpio`, `fdtput`, and QEMU-as-bootloader
  patching `/memory` (`-m 512`) and `/chosen/bootargs` (`-append`). A later lesson must not
  re-teach these. It writes **no driver** — `learn,temp-sensor` at `0xb000000` is deliberately
  left unbound so **Bài 54** can write the platform driver for exactly that node.
- **The silent `-dtb virt.dtb` boot is lesson 45's centrepiece — do not "fix" it into a clean
  path.** QEMU 4.2.1 inflates a `-dtb` blob to `(size + 10000) × 2`; the 1 MiB dump becomes
  2 117 152 B > `MAX_FDT_SIZE` (2 MiB) and the kernel spins with no console. The lesson proves
  it with GDB (`x/2wx $x0`), the source constant, and a `dtc -S` bisection. **The formula is
  inferred from measurement, not from QEMU source**, and the lesson says a newer QEMU may pad
  differently. If the course is re-verified on machine A (QEMU 10.2.1), this step must be
  re-measured before anyone quotes it.
- **It refines lesson 42's `/sys/firmware/fdt` = 1 MiB reading.** Without `-dtb` it is always
  1 048 576 (lesson 42 stays correct for what it ran); with `-dtb` it is QEMU's inflated size
  (35 806 for the 7 903 B `board.dtb`). Lesson 45 says this explicitly and does not call
  lesson 42 wrong.
- **GPIO pin ownership on `virt`:** PL061 has 8 pins; QEMU's `gpio-keys/poweroff` owns **pin 3**.
  Lesson 45 puts its LED on **pin 0** and uses pin 3 on purpose to show `-EBUSY` (`gpio-keys`
  loses, `/sys/class/input` goes empty). Lesson 58 (GPIO) inherits this map.
- **`-EPROBE_DEFER` was only shown, not explained**: an out-of-range pin (`<&gpio0 8 0>`) gives
  `deferred probe pending: leds-gpio: Failed to get GPIO` — in the Lỗi thường gặp table only,
  pointing at Bài 54. Bài 54 still owns deferred probe.
- **Numbers lesson 45 spends** (machine B, 2026-09-28; details in `docs/environment.md`): 383
  dts lines (381 without `-kernel/-initrd`) · dump 1 048 576 B, recompile 7 481 B, `board.dtb`
  7 903 B (+422) · `x0 = 0x48200000` · 2 117 152 / 34 962 / 35 806 · threshold between
  1 015 808 and 1 040 384 · 7 dtc warnings on recompile · 44 platform devices, 56 vs 53 root
  entries · `dt-validate` 14 vs 16 lines (on stderr) · `MemTotal 476148 kB` at `-m 512` ·
  `~/bai45` 1.1M.
- **`~/bai45` is disposable.** Lesson 45 writes nothing into `~/bai38` or `~/bai32`; it uses
  `~/bai44/venv` only in an optional sub-step.

### Chặng 09 — Root filesystem

- **Lesson 46 (`Rootfs gồm những gì`, written 2026-09-28, machine B) boots from an ext4 disk
  image, not an initramfs** — `-drive file=rootfs.img,format=raw,if=virtio` + `root=/dev/vda`, no
  `-initrd`. Images are built with **`mkfs.ext4 -q -d DIR IMG 64M`** (e2fsprogs ≥ 1.43; no `sudo`,
  no `debugfs`), which supersedes lesson 35's `debugfs -w -R write` trick for whole trees. The
  lesson ships two helper scripts, `~/bai46/run.sh` (QEMU line, `$*` appended to `-append`) and
  `~/bai46/mkimg.sh` (`rm -f` then `mkfs.ext4`). A later lesson may reuse the pattern.
- **Lesson 46 owns, and lessons 47–49 must not re-teach as new:** the four points where the kernel
  touches rootfs (console from the built-in 512 B cpio → mount root `ro` → devtmpfs → init);
  the built-in `usr/initramfs_data.cpio` (`dev`, `dev/console` 5,1, `root`) and why a shell has
  a console on a disk with no `/dev`; "kernel needs vs program needs" (only a runnable init is
  mandatory, `/dev` is a mount point, `/proc /sys /tmp /etc` are program requirements); FHS as
  convention; device nodes = type + major/minor (name is a label); devtmpfs, `CONFIG_DEVTMPFS_MOUNT`,
  why it is **not** auto-mounted in initramfs (`devtmpfs_mount()` sits at the end of
  `prepare_namespace()`), and `devtmpfs.mount=0`; root mounted `ro` by default
  (`root_mountflags = MS_RDONLY`) and the `rw` parameter; hand-mounting `proc`/`sysfs`/`tmpfs`;
  the dynamic loader as the first thing a dynamic binary needs on a rootfs (`INTERP`, `cp -L`
  from `/usr/aarch64-linux-gnu/lib`); and `try_to_run_init_process()` staying **silent on
  `-ENOENT`**, so a dynamic init missing its loader looks exactly like no init at all.
- **Lesson 46 deliberately does NOT**: cross-compile BusyBox or use `busybox --install` /
  `make install` (Bài 47 — lesson 46 makes 11 symlinks with a `for` loop and says Bài 47 replaces
  it); write `inittab`/`fstab`/`rcS` (Bài 47 — `/etc/passwd` and `/etc/group` are one line each
  and their field format is explicitly deferred to Bài 47); compare initramfs vs initrd or
  SquashFS/UBIFS/overlayfs (Bài 48 — only named as where read-only rootfs goes next); explain
  why PID 1 must never exit (Bài 49 — `Attempted to kill init!` is shown and pointed there).
- **Two findings a later lesson could trip over:** (1) `cp` onto an existing file **keeps the
  destination's mode**, so `chmod -x init` followed by `cp /bin/true init` still gives `-13`,
  not `-8` — the lesson's step 6 has an explicit `chmod +x` for this reason. (2) The kernel
  checks permission before format: an x86-64 dynamic binary gives `-8`, never reaching its
  missing loader.
- **`~/bai46` (19M) is disposable** — `rootfs/`, `rootfs.img`, `broken/`, `broken.img`,
  `hello`, `hello.c`, `run.sh`, `mkimg.sh`. Lesson 46 only *copies* `~/bai32/initramfs/bin/busybox`
  and reads `~/bai38/linux-6.18.45`; it writes into neither. **Caveat since lesson 47:** step 4 of
  lesson 47 does `cp ~/bai46/run.sh ~/bai46/mkimg.sh .` (with a note saying to retype them from
  Bài 46 if deleted), so "disposable" now means "disposable once you have copied those two scripts".

- **Lesson 47 (`BusyBox — dựng rootfs bằng tay`, written 2026-09-28, machine B) owns, and lessons
  48–49 must not re-teach as new:** the multi-call binary and `argv[0]` dispatch
  (`libbb/appletlib.c:924`, the `//applet:` declaration line, `busybox.links`, `mytool: applet not
  found`); BusyBox's Kconfig as the kernel's (`defconfig`, `.config`, no `scripts/config` → `sed`);
  **no `ARCH=` needed** (userspace, toolchain decides; `Makefile:181` derives it from the prefix);
  `CONFIG_STATIC` and the glibc `--gc-sections` warning; `make install` → `_install` (1 file + 408
  relative symlinks, `CONFIG_PREFIX`, the setuid banner, `linuxrc`); `cp -a` to keep symlinks;
  BusyBox init's **default table** (`init/init.c:681–695`: `sysinit` rcS, `askfirst` on console +
  tty2–4, `ctrlaltdel`, two `shutdown`, `restart`); the **inittab format** (`tty` = `/dev/` name,
  runlevel ignored, the eight actions, `-` = login shell) and that a present inittab replaces the
  default table **entirely**; the **fstab** six columns and why `/` and `/dev` are absent; **rcS**
  (`mount -a`, `remount,rw`, `hostname -F`); `respawn` making `exit` give a new PID; `/etc/passwd`
  and `/etc/group` field layout (the thing lesson 46 deferred).
- **Lesson 47 deliberately does NOT**: explain *why* PID 1 must never exit, init's signal set
  (`HUP`/`QUIT`/`USR1`…), SysV runlevels or systemd (Bài 49 — lesson 47 only points there);
  compare initramfs vs initrd or cover SquashFS/UBIFS/overlayfs (Bài 48 — `linuxrc` is named as the
  initrd relic and pointed there); use musl/uClibc-ng (Chặng 11); install `libncurses-dev` (machine B
  lacks it, so `menuconfig` fails with `curses.h` and the lesson shows that failure on purpose);
  write mdev/hotplug, getty/login, or a daemon under `respawn` (Bài 49).
- **Lesson 47's `Bài tiếp theo` promises Bài 48 three things**: pack `~/bai47/rootfs` into a cpio
  initramfs and boot it without a disk; measure it against the ext4 image (boot time, RAM) and show
  again why initramfs must mount devtmpfs itself; and initrd vs initramfs (with `linuxrc`) plus
  SquashFS/UBIFS/overlayfs. **So `~/bai47/rootfs` must be kept** — the lesson's last note says so.
- **Findings a later lesson could trip over:** (1) with a wrong `tty` field (`ttyS0` on `virt`) the
  boot goes **completely silent** after `rcS` — `/dev/ttyS0` exists (4,64) but writes give `EIO`,
  the shell respawns once a second, and init's own complaint goes to that same dead tty
  (`message()` → stderr). (2) `#!/bin/bash` and a CRLF shebang both give exactly
  `can't run '/etc/init.d/rcS': No such file or directory`, indistinguishable from a missing file.
  (3) A misspelt action gives `Bad inittab entry at line N` and that line is dropped, so no shell.
  (4) BusyBox `ps` with an *empty* `/proc` prints only the header, no error — unlike lesson 46's
  `can't open '/proc'` when the directory is absent.
- **`~/bai47` is 72M** (61M is the built BusyBox tree). Keep it for Bài 48.

- **Lesson 48 (`initramfs và các loại rootfs`, written 2026-09-29, machine B) delivered all three of
  lesson 47's promises** and only *copies* from `~/bai47` (`rootfs/`, `rootfs.img`, `bin/busybox`);
  it writes nothing there. Six steps: pack `~/bai47/rootfs` → it panics (no `/init`) → with
  `rdinit=/sbin/init` it loops `can't open /dev/ttyAMA0` every second (no devtmpfs) → fix = a
  `devtmpfs` line in `fstab` + `ln -s sbin/init init`; measure raw/gzip/xz vs ext4; `rootfs.img` via
  `-initrd` → `invalid magic`; SquashFS root; stage-1 initramfs + overlayfs + `switch_root`; UBIFS on
  the `virt` NOR flash (`mtd0`) surviving `reboot`.
- **Lesson 48 owns, and later lessons must not re-teach as new:** rootfs-the-tmpfs as the thing
  initramfs unpacks into and the `/init` fork (`init/main.c:1559–1564`), the two differences between a
  disk rootfs and an initramfs rootfs (`/init`, devtmpfs); `pack.sh` (cpio + `gzip -9` +
  `xz --check=crc32 --lzma2=dict=1MiB`); magic bytes (`070701`, `1f 8b`, `fd 37 7a 58 5a`); the
  initrd/initramfs table, `linuxrc`, `CONFIG_BLK_DEV_RAM` off, `do_mounts_initrd.c:92` "deprecated";
  block device vs MTD, FTL, erase blocks, wear levelling; the ext4/SquashFS/EROFS/UBIFS/JFFS2/tmpfs/
  overlayfs table; SquashFS `-comp`/`-all-root`/`-noappend` and the compressor-vs-`CONFIG_SQUASHFS_*`
  contract; overlayfs lower/upper/work, **copy-up**, **whiteout** (char dev `0,0`); `switch_root`
  (must be PID 1 → `exec`, deletes rootfs, `mount --move /dev`); UBI PEB/LEB, reserved PEBs, `ubimkvol`,
  UBIFS self-format + journal; the written-by-hand `erase_mtd.c` (`MEMGETINFO`/`MEMERASE`).
- **Lesson 48 deliberately does NOT**: explain why PID 1 must not die, signals to init, SysV or systemd
  (Bài 49 — its `Bài tiếp theo` promises PID 1 receiving signals / reaping orphans, BusyBox init vs
  SysV vs systemd, and `temp_daemon` kept alive by `respawn` **and** a systemd unit); teach modules,
  `modprobe`, `modules.dep` (Chặng 10 — lesson 48 uses bare `insmod` only and says so; note Bài 50's
  roadmap line lists `insmod lsmod rmmod modinfo`, **not** `modprobe`); build a kernel (it lives with
  `defconfig`: SquashFS zlib only, overlay/UBI/UBIFS as `=m`); `mkfs.ubifs`/`ubinize` (named only,
  Chặng 11); OTA/A-B (Bài 69, pointed to once).
- **Findings a later lesson could trip over:** (1) `fs/ubifs/compress.c:309`'s `pr_err` has **no
  `\n`**, so `UBIFS error … cannot initialize compressor zstd` stays in the printk continuation buffer
  and `dmesg | tail` shows nothing new until another message flushes it (`echo mark > /dev/kmsg`).
  (2) BusyBox `insmod` maps **every** `ENOENT` to `unknown symbol in module or invalid parameter`
  (`modutils/modutils.c:270–271`) and `EINVAL` to `invalid parameter`. (3) `ubifs.ko` depends on `ubi`
  per `modinfo`, but actually also needs `zstd` **and** `deflate` crypto modules (`request_module`
  cannot help without a working `modprobe`). (4) QEMU's NOR flash starts all `0x00`, which UBI rejects
  (`layout volume was not found`, -22); it must be erased to `0xFF` first. (5) BusyBox `df` skips any
  mount named `rootfs` (`FEATURE_SKIP_ROOTFS`), so `df /` fails inside an initramfs. (6) `-pflash`
  with a user image at `index=0` hung silently (0 lines; cause not investigated) — lesson 48
  uses QEMU's built-in RAM-backed flash instead, which survives `reboot` but not a new QEMU process.
- **`~/bai48` (18M) is disposable** — `initramfs/`, `sqroot/`, `stage1/`, three `rootfs.cpio*`,
  `rootfs.sqfs`, `stage1.cpio.gz`, `erase_mtd{,.c}`, `pack.sh`, `run-initramfs.sh`, `run-sqfs.sh`,
  `run-overlay.sh`. **Keep `~/bai47`** until Bài 49 is written: Bài 49 is likely to reuse its rootfs.

- **Lesson 49 (`init: từ /init đến systemd`, written 2026-09-29, machine B) closes Chặng 09.** It copies
  `~/bai47/rootfs`, `run.sh`, `mkimg.sh` into `~/bai49` and writes nothing into `~/bai47`. Six steps:
  (1) `temp_daemon.c` from Bài 24, unchanged, built `-static` for ARM64 and stripped into
  `rootfs/usr/bin`; (2) three kernel rules watched on BusyBox init; (3) `noreap_init.c` booted with
  `init=`; (4) `::respawn:/usr/bin/temp_daemon`; (5) SysV `rcS`/`rcK` + `S10network` + `S50temp_daemon`
  with `start-stop-daemon`; (6) a **`systemctl --user`** unit on the WSL host — deliberately not systemd
  inside the rootfs (needs dynamic glibc + dozens of libs; that is Chặng 11's Buildroot/Yocto job, and
  the lesson says so).
- **Lesson 49 owns, and later lessons must not re-teach as new:** the three PID-1 kernel rules with
  source lines (`kernel/exit.c:935–937` panic; `kernel/fork.c:2385–2387` sets `SIGNAL_UNKILLABLE`;
  `kernel/signal.c:84` `sig_task_ignored()` lines 90–96, and `sig_ignored()` line 113 exempting
  *blocked* signals; `kernel/exit.c:642` `find_new_reaper()`); the two duties of init (reap, accept
  shutdown signals); BusyBox init's signal table (`USR2` poweroff, `TERM` reboot, `USR1` halt, `INT`
  ctrlaltdel, `HUP` reread inittab, `QUIT` restart) and that it **blocks + `sigtimedwait()`s** rather
  than installing handlers; `poweroff` = `kill(1, SIGUSR2)` (`init/halt.c:172`); the 1-second
  SIGTERM→SIGKILL gap (`init/init.c:768–774`); `respawn` resurrecting even a clean `exit 0`; `SIGHUP`
  not killing a removed entry (`CONFIG_FEATURE_KILL_REMOVED` off, BusyBox `.config:519`); SysV
  `rcN.d`/`S??`/`K??`, runlevels, `start-stop-daemon -S -b -m -p -x` / `-K`, pidfile staleness; systemd
  unit/target/`WantedBy`/`enable`-is-a-symlink/cgroup/journal, `Restart=always` vs `on-failure`,
  `NRestarts`, `StartLimitBurst=5`/`10s`, `daemon-reload`, `reset-failed`, `--user` instance; and the
  init-choice table.
- **Relationship to Bài 20/21 — do not contradict:** orphans, zombies, subreaper and the `pid_max`
  "three and a half days" arithmetic are **Bài 20's**; the `while (waitpid(-1, …, WNOHANG) > 0)` rule
  and `signalfd` are **Bài 21's**; `bad_reaper` is **`bt-21`'s**. Lesson 49 points back to each and
  only applies them to PID 1.
- **Findings a later lesson could trip over:** (1) `/proc/1/status` shows `SigBlk: 0` for BusyBox init
  even though it blocks 8 signals — it is asleep in `sigtimedwait()`, which moves the mask to
  `real_blocked` (`kernel/signal.c:3785–3786`) and `/proc` prints only `blocked`. `SigCgt` is
  `0x80000` = SIGTSTP only (`init.c:1173`). (2) The rootfs has **no loopback up** until
  `ifconfig lo 127.0.0.1 up`: `bind(0.0.0.0)` still succeeds but `nc 127.0.0.1` returns 1. Any later
  lesson running a network daemon in this rootfs needs that line. (3) `start-stop-daemon -b` sends the
  daemon's stdout to `/dev/null` — SysV loses the log lines `respawn` and systemd both show. (4)
  `systemctl … show -p MainPID --value` reads **0** once a unit is `failed`, and `kill -9 0` kills the
  caller's process group — the lesson guards with `[ "$P" -gt 0 ]` and says why. (5) BusyBox `nc` needs
  no `-q1`; Ubuntu's OpenBSD `nc` does. (6) Two managers for one daemon (respawn + a manual/SysV start)
  gives `bind: Address already in use` once a second, forever.
- **The M7 milestone (`LO-TRINH.md` §5) is met by step 4**: BusyBox rootfs, `rcS: done at 0.76 s`,
  `temp_daemon` listening and respawning. Chặng 10 may cite that figure as "where Chặng 09 left you".
- **`~/bai49` (11M) is disposable** — `rootfs/`, `rootfs.img`, `run.sh`, `mkimg.sh`, `temp_daemon{,.c}`,
  `temp_daemon_x86`, `noreap_init.c`. The lesson's cleanup removes its unit and the learner may
  `rmdir ~/.config/systemd{/user,}`. **`~/bai47` is no longer needed by anything after Chặng 09.**

- **Lesson 50 (`Module đầu tiên`, written 2026-09-29, machine B) opens Chặng 10.** Working dir
  `~/bai50`: `hello/` (`hello.c` 28 lines, `fail_init.c`, `prop.c` generated by `sed`, an 11-line
  `Makefile` with `obj-m := hello.o fail_init.o prop.o` after step 3), `initramfs/` = a copy of
  `~/bai32/initramfs` plus `hello.ko`, `fail_init.ko`, `prop.ko`, `bad-vermagic.ko` at `/`, and
  `initramfs.cpio.gz`. Boot line = lesson 32's with `-initrd initramfs.cpio.gz`. **It boots from
  initramfs, not an ext4 rootfs**, and writes nothing into `~/bai38` (build is out-of-tree, `M=`).
  The lesson tells the learner to **keep `~/bai50`** (≈4.7 MB) as the template for Chặng 10.
- **Lesson 50 owns, and later lessons must not re-teach as new:** module vs program table; `module_init`
  as `alias` → `init_module` (read in `include/linux/module.h:130–144`, `__inittest` type check,
  the `=y` branch at line 89 → `__initcall`); `__init`/`__exit` sections (`init.h:45`, `:79`) and
  `initsize` = 0 / `hello_init` gone from `/proc/kallsyms`; `pr_fmt` + `KBUILD_MODNAME` (from the
  filename — `prop.c` prints `prop:`); `MODULE_LICENSE`/`AUTHOR`/`DESCRIPTION`, `.modinfo`; out-of-tree
  build `make -C KDIR M=$(CURDIR) ARCH CROSS_COMPILE modules`, `obj-m`, the Makefile read twice, `?=`,
  the 95 Kbuild flags (`-nostdinc -D__KERNEL__ -DMODULE -DKBUILD_MODNAME -mgeneral-regs-only
  -include`); `/lib/modules/$(uname -r)/build` is WSL's, not QEMU's; `modpost` + `*.mod.c` +
  `Module.symvers` (20 745 exports, `_printk` `EXPORT_SYMBOL` from `vmlinux`); `file`/`modinfo`/`size`/
  `nm`/`strip --strip-debug` on a `.ko`; the load lifecycle figure (ELF → vermagic → license → EEXIST
  → alloc+reloc → init; `load_module()` :3358 → `do_init_module()` :3516); `insmod`/`lsmod`/
  `/proc/modules` fields/`/sys/module/NAME`/`rmmod`; the four failures (EEXIST rc 17, init `-ENODEV`
  rc 19, vermagic `ENOEXEC` rc 8, `missing MODULE_LICENSE()` at build); taint bitmask (0 → 4096 `O`
  → 4097 `P`, permanent until reboot, `Documentation/admin-guide/tainted-kernels.rst`), lockdep
  disabled by `P`, 12 425 `EXPORT_SYMBOL_GPL` vs 8 320 `EXPORT_SYMBOL`.
- **Lesson 50 deliberately does NOT teach** (scope line in `LO-TRINH.md` lists only `insmod lsmod rmmod
  modinfo dmesg`): `modprobe`/`depmod`/`modules.dep` (named once as "the sixth tool"), `module_param`,
  `EXPORT_SYMBOL` in *your own* module, printk levels/`console_loglevel`/`pr_debug` (Bài 51 — the
  lesson says the line shows on console because 6 < 7 and points to Bài 41), `kmalloc`, `copy_*_user`,
  float/stack (Bài 51), oops (Bài 51's `Bài tiếp theo` promise), char devices (Bài 52), `devm_*`
  (Bài 54, named once). The `[permanent]` / no-`module_exit` case is in `Lỗi thường gặp` only, not
  a practice step.
- **Findings a later lesson could trip over:** (1) BusyBox `insmod` tries `finit_module()` then falls
  back to `init_module()` on **any** failure (`modutils/modutils.c:216` / `:242`), so a failing module's
  `init` runs **twice** and every rejection line (vermagic) appears twice in `dmesg`. A lesson showing
  `insmod` of a bad module in this initramfs must expect doubled lines. (2) BusyBox `lsmod` only knows
  the `P`/`F`/`S` taint letters (`modutils/lsmod.c`), so it prints `Tainted: G` for an `O`-only taint;
  `/proc/modules` shows `(O)`. (3) BusyBox `insmod` exit code **is** the errno (17, 19, 8); `rmmod` exits
  1. (4) `ls /sys/module/hello/sections` printed **nothing** (as root, in QEMU), yet
  `cat /sys/module/hello/sections/.exit.text` returned `0xffff80007afd0000` and `.text` gave `No such
  file`. Cause **not investigated** (the entries are `bin_attrs` since 6.x — `kernel/module/sysfs.c:65`);
  do not build a step on listing that directory without re-checking.
  (5) `modinfo` on the host (kmod 27) reads an ARM64 `.ko` fine. (6) the `~/bai32/initramfs` BusyBox
  (Debian `busybox-static` 1.38.0) has `CONFIG_MODPROBE_SMALL`-style applets: `depmod` in it writes
  `modules.dep`, `modules.alias`, `modules.symbols`, and its `modinfo NAME` needs
  `/lib/modules/$(uname -r)/modules.dep` (`modinfo /hello.ko` → `can't open …/modules.dep`) — verified,
  not used in the lesson.

- **Lesson 51 (`Luật chơi trong kernel space`, written 2026-09-29, machine B) is a TEMPORARY DRAFT.**
  The session was interrupted twice for reasons never identified; the user asked to ship it as a draft
  and redo it later. Working dir `~/bai51/rules` (Makefile copied from `~/bai50/hello`, single modules
  built with `make obj-m=NAME.o`), initramfs = `~/bai32/initramfs` + 7 `.ko`, boot line = lesson 50's.
- **Lesson 51 owns, and later lessons must not re-teach as new:** the six-rule table; no libc
  (`-nostdinc` → `stdio.h` missing; hand-declared `printf` → `modpost: "puts" [nolibc2.ko] undefined!` —
  GCC rewrites `printf("…\n")` to `puts`); looking functions up with `grep -w … Module.symvers`, and that
  `kmalloc`/`strscpy`/`copy_from_user` are inline/macros absent from it (`nm -u` shows
  `__kmalloc_noprof`, `__kmalloc_large_noprof`, `__arch_copy_from_user`); no float (`v0`–`v31`, 512 B,
  not saved on kernel entry; `-mgeneral-regs-only` error printed **4×** at `printk.h:512`; constant-only
  float folds to `mov w1, #0x4a` = 74, zero FP instructions); `kernel_neon_begin/end` named once;
  fixed-point / hwmon milli-degrees; `THREAD_SIZE` = `1 << 14` = 16 KiB (`memory.h:115–131`, KASAN
  doubles it), 512× smaller than `ulimit -s` 8192; `CONFIG_FRAME_WARN=2048`, 4 KiB array → frame
  **4 112** B, `sub sp` **4 144** B (stack protector), 25 %; `VMAP_STACK=y` → overflow = panic (prose
  only); `pr_*` level table from the writer's side; `dmesg -r` `<0>`–`<6>`; bare `printk` → `<4>`
  (`MESSAGE_LOGLEVEL_DEFAULT=4`); taint line is `<4>` and printed once per boot; `pr_debug` absent from
  the `.ko` without `-DDEBUG` (`strings … | grep -c` = 0; `DYNAMIC_DEBUG` off), `CFLAGS_x.o := -DDEBUG`;
  `%p` → `(____ptrval____)`, `%px`, `%pS` → `do_one_initcall+0x70/0x1b8`; `kmalloc` + `GFP_KERNEL` vs
  `GFP_ATOMIC` (named for Bài 55); `ksize` 1→8, 13→16, 100→128, 1000→1024, 3000→4096, 5000→8192;
  `kmalloc(8 MiB)` NULL (`ARCH_FORCE_MAX_ORDER=10` → 4 MiB), `vmalloc(8 MiB)` ok; leak: `SUnreclaim`
  5 696 → 22 084 kB, unchanged after `rmmod` (38 476 after a second load in a separate run);
  `copy_from_user` returns bytes NOT copied — argv of `insmod` 0, `NULL` 8/8, kernel address 8/8, no
  crash; `__user` + `sparse` named; PAN described in prose.
- **Lesson 51 does NOT yet deliver** (still owed to lesson 50's `Bài tiếp theo`): a hands-on
  bad-pointer **oops** step, and any hands-on `copy_to_user`. The theory part has a prose `cal` on what
  an oops contains (`Unable to handle kernel NULL pointer dereference`, `pc : fn+off [mod]`,
  `Call trace`, `Tainted:`, taint `D` bit 7, `panic_on_oops`) and says the hands-on part will be added.
  Whoever redoes lesson 51 should re-verify from scratch on the machine in use, and ask the user in
  Vietnamese how they want the crash demonstration handled before running it.
- **Findings a later lesson could trip over:** (1) `ls` output captured through a pipe is one entry per
  line; the lesson says so in a `notes`. (2) Scratch modules named `oops.c` fail to build —
  `oops_exit` collides with `extern void oops_exit(void)` in `include/linux/panic.h:19`
  (`static declaration … follows non-static declaration`). Do not name a module `oops`. (3)
  `faddr2line` rejects `func+0x28/0x1000` for a module (`size mismatch (0x1000 != 0x40)` — the `/0x1000`
  is the module's page-rounded size); passing `func+0x28` alone works. (4) `KASLR` on this kernel is
  `disabled due to lack of seed` under `-cpu cortex-a57` but `enabled` under `-cpu max` (which also has
  a RNG), so addresses differ between those two CPU models. (5) `-cpu cortex-a57` has **no PAN**
  (`pstate … -PAN`), so an unguarded user-pointer read does not fault there — do not use a direct read to
  "prove" PAN on this setup. (6) A `python - <<'PY'` heredoc edit of a C file silently failed again
  (backslash escapes) — same rule as `docs/running-commands.md`.

- **Lesson 52 (`Character device driver`, written 2026-09-29, machine B).** Working dir `~/bai52`:
  `ramdisk/` (`ramdisk.c` 201 lines, Makefile = lesson 50's with `obj-m := ramdisk.o` +
  `CFLAGS_ramdisk.o := -DDEBUG`), `app/rdtest.c` (static, 50 lines), `bug/` (same driver minus
  `*ppos += count;`), `initramfs/` = `~/bai32/initramfs` + `ramdisk.ko` + `rdtest` (+ `ramdisk_bug.ko`
  in step 6). Boot line = lessons 50/51. **The lesson tells the learner to keep `~/bai52/ramdisk`** —
  its `Bài tiếp theo` promises that Bài 53 adds `ioctl` (`_IOR`/`_IOW`), a sysfs attribute under
  `/sys/class/ramdisk/ramdisk0/`, a procfs and a debugfs file **to this same driver**.
- **Lesson 52 owns, and later lessons must not re-teach as new:** open() path inode → `dev_t` →
  `chrdev_open()` (`fs/char_dev.c:373`, ENXIO at :388) → `cdev` → `file_operations`; `dev_t` 12/20 bits
  (`MINORBITS 20`); `register_chrdev_region` vs `alloc_chrdev_region`; `find_dynamic_major()` 254→234
  then 511→384, and **major 510** on this kernel (21/21 of 234–254 taken, 511 = `rpmb`); `cdev_init`/
  `cdev_add` and "device is live once `cdev_add` returns"; `container_of` from `i_cdev` +
  `filp->private_data`; the fops table (`open`/`release` = last close/`read`/`write`/`llseek` via
  `fixed_size_llseek`/`.owner`); the read/write contract (0 = EOF, `*ppos` is the driver's job, short
  write, `-EFAULT`, `-ENOSPC`); per-device `mutex` (spinlock vs mutex deferred to Bài 56);
  `O_APPEND`/`O_TRUNC` being the driver's job for a char device, `O_ACCMODE`, and the always-set
  `O_LARGEFILE` 0x20000; `mknod` vs `class_create` + `device_create` + devtmpfs (and devtmpfs not mounted
  in lesson 32's initramfs — `mount -t devtmpfs none /dev`), `/sys/class/…/uevent`; `crw-------` vs
  `crw-r--r--`; mount-over hiding the `mknod` nodes; `class_create` signature change in 6.4; GPL-only
  `class_*`/`device_*`; `.owner` → `try_module_get` → `Used by 1` → `rmmod` EAGAIN; failed
  `copy_from_user` zero-fills (`uaccess.h:183`); the forgotten-`*ppos` bug (endless `cat`); the
  build-up/tear-down order figure.
- **Lesson 52 deliberately does NOT teach:** `ioctl`, sysfs attributes, procfs, debugfs (Bài 53);
  `poll`/blocking reads/wait queues; `misc_register` (not in the roadmap line — never mentioned);
  `udev`/`mdev` rules beyond one sentence; `platform_driver` and `devm_*` (Bài 54); spinlocks (Bài 56).
  It **does not touch the lesson 51 oops debt** — lesson 51 is still a draft.
- **Findings a later lesson could trip over:** (1) the BusyBox shell in lesson 32's initramfs never
  mounts devtmpfs, so every lesson that uses that initramfs and expects `/dev/<node>` must mount it
  first. (2) Renaming a `.ko` does not rename the module (`ramdisk_bug.ko` is still `ramdisk` →
  `File exists`, rc 17). (3) A node made with `mknod` before `insmod` starts working once the driver
  registers the same major — but only because major 510 is deterministic for this `.config`. (4) Driving
  QEMU with commands piped over stdin: a command containing `"$1"` inside double quotes gets mangled by
  the probe's own shell; write the command list to a file with the `Write` tool and feed it line by line
  (`while IFS= read -r c`), as lesson 52's verification did.

- **Lesson 53 (`Giao tiếp user ↔ kernel`, written 2026-09-29, machine B).** Working dir `~/bai53`:
  `ramdisk/` = a copy of `~/bai52/ramdisk` (`make clean` first) with `ramdisk.c` 373 lines and the shared
  `ramdisk_ioctl.h`; `nodebug/` = same sources, Makefile without `-DDEBUG`; `app/rdctl.c` (68 lines),
  `app/rdbench.c` (54 lines), both static, plus `rdctl-host` (x86 build, only for `rdctl codes`);
  `initramfs/` = `~/bai32/initramfs` + `ramdisk.ko`, `rdctl`, `rdbench`, `nodebug/ramdisk.ko`. Boot line =
  lessons 50–52. **`~/bai52` is not modified.** The lesson tells the learner to **keep `~/bai53`** for Bài 54.
- **Lesson 53 owns, and later lessons must not re-teach as new:** the four-channel table (who / format /
  ABI) and the decision tree; `ioctl` path `SYSCALL_DEFINE3(ioctl)` → `do_vfs_ioctl` → `vfs_ioctl` →
  `unlocked_ioctl` (`fs/ioctl.c:583/492/44`), `ENOTTY`/`-ENOIOCTLCMD`, "unlocked" = no BKL; the 32-bit code
  layout dir 2 · size 14 · type 8 · nr 8 and `_IO/_IOR/_IOW/_IOWR`, direction from the user's view;
  `ioctl-number.rst` and magic `'x'`; the shared uapi-style header (`__u32`, `Linux-syscall-note`); size in
  the code → an old binary gets errno 25 instead of memory corruption; `compat_ioctl` = `compat_ptr_ioctl`;
  `ioctl` ignores the open mode → driver checks `FMODE_WRITE` (`-EBADF`); `TCGETS2` from `stty`/`isatty`.
  sysfs: `DEVICE_ATTR_RO/RW`, `ATTRIBUTE_GROUPS`, `sysfs_emit`, `kstrtobool`, `dev_get_drvdata`,
  `device_create_with_groups` (attrs before uevent, `core.c:3710/3730/3737`), the one-value rule, root denied on
  0444 (`KERNFS_ROOT_EXTRA_OPEN_PERM_CHECK`), `VERIFY_OCTAL_PERMISSIONS` rejecting 0666. procfs:
  `proc_create_single` + `seq_file`, `remove_proc_entry`, write → `EIO`. debugfs: mount point, "no rules",
  `debugfs_create_dir/u32/blob`, `debugfs_remove`, never check its return values, u32 0444 write → `EACCES`.
  The `ioctl` vs sysfs benchmark and the `-DDEBUG` trap (121 µs → 2.4 µs), log ring wrapping.
- **Lesson 53 deliberately does NOT teach:** `misc_register`; `poll`/wait queues; `mmap`; netlink,
  configfs, uevent emission from a driver (`kobject_uevent_env`); `debugfs_create_file` with custom fops;
  `DEVICE_ATTR_WO`; `_IOWR` hands-on (named in a table only); `sparse`/`__user` beyond Bài 51. Ftrace is
  pointed at Bài 65. It **does not touch the lesson 51 oops debt** — lesson 51 is still a draft.
- **Findings a later lesson could trip over:** (1) The benchmark must use a module built **without**
  `-DDEBUG` — a single `pr_debug` in `unlocked_ioctl` makes `ioctl` look slower than sysfs. Any later timing
  demo inherits this. (2) BusyBox `sh` reports `open` failures as `can't create X: …` and `write` failures as
  `write error: …` — the wording tells which syscall failed. (3) `ioctl` codes are compile-time constants and
  identical on x86-64 and arm64 (only alpha/mips/powerpc/sparc override `_IOC_SIZEBITS`), so a host build can
  print them. (4) A second probe build that deletes the `FMODE_WRITE` lines was verified but not kept.
  (5) `readonly` blocks writers at `open`, so a blocked `echo`/`rdctl clear` never reaches `rd_write`/`rd_ioctl`
  and never bumps the counters. (6) Bài 54's node facts: lesson 45 left `sensor@b000000` okay and
  `sensor@b001000` disabled — the teaser says `probe()` runs for the first and not the second.

- **Lesson 54 (`Platform driver và Device Tree`, written 2026-09-30, machine B).** Working dir `~/bai54`:
  `virt.dtb`/`virt.dts` (fresh `dumpdtb`, **no `-smp`**, with `-append` → **376** lines, PL061 at line 273),
  `nodes.dts` (35 lines), `board.dts` = `virt.dts` with `gpio0:` on line 273 + `nodes.dts` before the last `};`,
  `board.dtb` (**8 100 B**), `short.dtb` (`fdtput`: `b002000` gets `learn,offset-mdeg 40000` and a 1-cell
  `learn,trip-mdeg`), `tsensor/` (`tsensor.c` 245 lines, Makefile = lesson 53's with `ramdisk`→`tsensor`),
  `leaky/` (`leaky.c` 42 lines, `tidy.c` made by `sed`), `initramfs/` = `~/bai32/initramfs` + `tsensor.ko` +
  `gpio-aggregator.ko` (from `~/bai40/modroot-stripped`) + in step 5 `leaky.ko`/`tidy.ko`. Boot line = lessons
  50–53 **plus `-dtb board.dtb`**. It does **not** reuse lesson 45's `board.dts` (lesson 45 allowed deleting
  `~/bai45`) and says why. `~/bai53` is only read (Makefile). **The lesson tells the learner to keep
  `~/bai54` (5.5M)** — `tsensor/` + `board.dt[sb]` — and that `~/bai53` may now be deleted.
- **Node map lesson 54 fixed (a later lesson must not contradict):** `gpio_delay: gpio-delay`
  (`compatible = "gpio-delay"`, `#gpio-cells = <3>`, `gpios = <&gpio0 1 0>`, phandle **1**) — the supplier, driven
  by `gpio-aggregator.ko` (`CONFIG_GPIO_AGGREGATOR=m`, the only GPIO provider built as a module on this
  `.config`; `GPIO_SIM`/`GPIO_MOCKUP` are **not set**). `sensor@b000000` label `board`, offset 42500, trip
  60000/85000; `sensor@b001000` disabled; `sensor@b002000` label `broken`, no offset; `sensor@b003000` label
  `gated`, offset 38000, poll 250, `enable-gpios = <&gpio_delay 0 0 0>`. **PL061 pin 1 is now spent** by
  `gpio-delay` (pin 0 = lesson 45's LED, pin 3 = `gpio-keys`). Lesson 57/58 (GPIO) inherits this map.
- **Lesson 54 owns, and later lessons must not re-teach as new:** platform bus as the bus for undiscoverable
  devices; `struct platform_driver` (`platform_device.h:231`, `remove` returns **void** on 6.18 — old `int`
  form → `-Werror=incompatible-pointer-types`); `of_match_table` + `MODULE_DEVICE_TABLE(of)` → `alias:
  of:N*T*C…`; `.dev_groups`; `module_platform_driver` (named, used in `leaky.c`); "module = once, device =
  each time"; `platform_get_resource` + `devm_request_mem_region` (`/proc/iomem` entry appears/disappears — no
  `ioremap`, that is Bài 56); `of_device_alloc` turning `reg` into resources; `of_property_read_u32/_string/
  _u32_array`, the `-EINVAL`/`-ENODATA`/`-EOVERFLOW` table (`property.c:130–148`), and the three patterns
  required / optional-preset-default / optional-but-well-formed; `dev_info`/`dev_dbg`/`dev_err_probe` +
  `%pR`/`%pe`; devres as a per-device stack (`release_nodes` `devres.c:496`, reverse order), `devm_kzalloc`,
  `devm_gpiod_get_optional`, `devm_add_action_or_reset` for `ida`/`cdev`/`device_create`, the two devres
  limits (module-wide resources, mixing with manual frees in `remove`); `DEFINE_IDA`/`ida_alloc_max`;
  `simple_read_from_buffer`; `-EPROBE_DEFER`, `deferred_probe_pending_list`, retry on every successful bind,
  `/sys/kernel/debug/devices_deferred`, the reason format `DRIVER: msg` (`dd.c:235`), fw_devlink
  (`supplier:platform:…` symlink, `platform: supplier X not ready` from `core.c:1162`),
  `driver_deferred_probe_timeout = 10` (`dd.c:261`) and `deferred_probe_timeout=`; sysfs `bind`/`unbind` as a
  test tool; `/proc/slabinfo` columns and the leak measurement; `drvdata` cleared on unbind (`dd.c:614`).
- **Lesson 54 deliberately does NOT teach:** `ioremap`/`readl`/`devm_ioremap_resource` (Bài 56 — named in a
  table only; `ts_read_mdeg` returns the DT offset); IRQs/`devm_request_irq` (Bài 55, named); hwmon/thermal
  frameworks (named once as the standard home for temperature sensors); `platform_device_register` from C;
  ACPI; `devres_open_group`; `of_property_count_*` (in Lỗi thường gặp only); `kmemleak` (named, off in
  `.config`); `modprobe` auto-loading (alias shown, not exercised — no udev in the initramfs). It **does not
  touch the lesson 51 oops debt**.
- **Findings a later lesson could trip over:** (1) **The 10-second mark matters.** Before
  `deferred_probe_timeout` (10 s after late_initcall) fires, fw_devlink blocks a consumer whose DT supplier has
  no driver *before* `probe()` runs (`platform: supplier gpio-delay not ready`, no `probe` line). After it,
  `fw_devlink_drivers_done()` relaxes the link and `probe()` itself gets `-EPROBE_DEFER` from `gpiod_get`
  (`tsensor: enable gpio`). Any lesson showing deferral must say which regime it is in; the lesson uses
  `deferred_probe_timeout=600` to pin the first. (2) Each successful bind retriggers the pending list, so the
  deferred device prints extra `probe` lines (2–3 per `insmod` observed; count varies run to run). (3) Lines from
  the deferred-probe worker interleave with the BusyBox prompt (`~ # [ 50.9…] … probe`) — cosmetic. (4)
  `/proc/slabinfo` `kmalloc-2k` did not move for the first 3 probes (per-CPU slab counted as active) — only a
  large repeated leak is visible there. (5) `diff virt.dts board.dts` reports `374a375,409`, not after the
  `chosen` close, because the last new node also ends with `\t};` — the lesson explains it. (6) `fdtget` with
  several property names in one call fails (`FDT_ERR_BADPATH`): it takes one property per call.

- **Lesson 55 (`Ngắt và xử lý trễ`, written 2026-09-30, machine B).** Working dir `~/bai55`: `alarm.dts` (17 lines,
  `/include/ "../bai54/board.dts"` — so it **reads `~/bai54/board.dts`**), `alarm.dtb` (**8 069 B**), `talarm/`
  (`talarm.c` 145 lines, Makefile = lesson 54's with `tsensor`→`talarm`), `v/{stack,sleep,null,oneshot}/` (variants
  built with `KCFLAGS=-DSHOW_STACK` / `-DSLEEP_IN_TASKLET` or `sed`), `initramfs/` = `~/bai32/initramfs` + five `.ko`.
  Boot line = lessons 50–54 with `-dtb alarm.dtb`. Step 1 boots `~/bai32/initramfs.cpio.gz` + `~/bai54/board.dtb`
  unchanged. The lesson says `~/bai55` is disposable and lesson 56 reads nothing from it.
- **Node map lesson 55 fixed (a later lesson must not contradict):** PL061 (`gpio0`, phandle `0x8003`) becomes an
  interrupt controller with `#interrupt-cells = <2>`; `gpio-keys` is **deleted** so pin 3 is free; `alarm@b004000`
  (`compatible = "learn,temp-alarm"`, `interrupt-parent = <&gpio0>`, `interrupts = <3 1>` = rising edge). Pin map so far:
  pin 0 = lesson 45's LED, pin 1 = lesson 54's `gpio-delay`, **pin 3 = the `virt` power button → lesson 55's alarm**.
  Lesson 57/58 inherits this. **The only guest-triggerable interrupt source on QEMU 4.2.1 `virt` is the power button**
  (`system_powerdown` at the monitor → one pulse on pin 3); nothing else in `virt` can be fired by hand.
- **Lesson 55 owns, and later lessons must not re-teach as new:** polling vs interrupt; `CONFIG_HZ=250` +
  `NO_HZ_IDLE` measured through `arch_timer` (33 / 4 s idle, 1 005 / 4 s busy); the GIC → PL061 cascade (`chained`,
  `pl061_irq_handler`, `generic_handle_domain_irq`); the three numbers (DT cell / `hwirq` / Linux IRQ), SPI + 32 and
  PPI + 16 (`irq-gic.c:1098/1101`), IRQ domain, `/proc/interrupts` columns, `/sys/kernel/irq/N/{hwirq,type,actions}`,
  chained IRQs hidden from `/proc/interrupts` (`kernel/irq/proc.c:481`); edge rising / both / level and the DT flag
  values 1/3/4; `request_threaded_irq` as the one real API (`request_irq` = thread_fn NULL + `IRQF_COND_ONESHOT`,
  `interrupt.h:169/209/215`); `IRQ_NONE`/`IRQ_HANDLED`/`IRQ_WAKE_THREAD` and the 99 900/100 000 `nobody cared` rule
  (`spurious.c:360–364`); `devm_request_threaded_irq` and its own `dev_err_probe` (`devres.c:40`); top half / bottom half
  and the receptionist analogy; the four-context table; `preempt_count` layout (`preempt.h:33–52`, `in_atomic` :186),
  idle task's extra 1 (`asm/preempt.h:25`); softirq's 10 vectors (`softirq.c:64–66`), `MAX_SOFTIRQ_TIME`/`RESTART`
  (:543–544), `ksoftirqd`, `/proc/softirqs`; tasklet API + `from_tasklet` and its **deprecation** (`interrupt.h:667`),
  `system_bh_wq` named; workqueue `INIT_WORK`/`schedule_work` (`queue_work_on`, `system_percpu_wq` in `nm -u`);
  threaded IRQ thread `irq/N-name` (`manage.c:1402`), `SCHED_FIFO` 50 (`sched_set_fifo`, :1252; `/proc/PID/stat` fields
  18/41 = `-51`/`1`); the "may it sleep" table; `might_sleep` + `CONFIG_DEBUG_ATOMIC_SLEEP` (**not set**) named;
  devres ordering: request the IRQ **last** so `free_irq` runs **first**; `IRQF_ONESHOT` and the `handler=NULL` rejection
  (`manage.c:1667`); `BUG: scheduling while atomic` format (`core.c:5875`, check at :5914) → `bad: scheduling from the
  idle thread!` (`idle.c:510`) → `Attempted to kill the idle task!` (`exit.c:1041`); "find the first `BUG:`".
- **Lesson 55 deliberately does NOT teach:** spinlocks / `spin_lock_irqsave` / `atomic_t` (Bài 56 — named in the "may it
  sleep" table and the teaser only); `ioremap`/`readl` (Bài 56); `IRQF_SHARED` hands-on (named); `enable_irq`/
  `disable_irq`/`disable_irq_nosync`; IRQ affinity (`smp_affinity` listed in an `ls`, not explained); NMI beyond one
  table row; `ftrace`/`irqsoff` tracer (not in `.config`); wait queues / `poll`; `hrtimer`; `gpiod_to_irq` (the node uses
  `interrupts` directly — Bài 57 owns GPIO consumer APIs); `request_any_context_irq`. It **does not touch the lesson 51
  oops debt**, though step 5 shows a real oops as a *consequence* of sleeping in atomic context — a redo of lesson 51
  must still add its own bad-pointer oops step and must not claim lesson 55 already did it.
- **Findings a later lesson could trip over:** (1) **The PL061 pin already owned by `gpio-keys` cannot be requested
  with another trigger type**: with `gpio-keys` left in the tree, `platform_get_irq` fails with `irq: type mismatch,
  failed to map hwirq-3 for pl061@9030000!` + `error -ENXIO: IRQ index 0 not found` (`irqdomain.c:933`). Without
  `interrupt-controller;` on PL061 the same `-ENXIO` appears alone and `dtc` (no `-q`) warns `Missing
  interrupt-controller or interrupt-map property`. (2) `gpio-keys` requests both edges, so one `system_powerdown`
  bumps its counter by **2**; a rising-edge node gets **1**. (3) In lesson 32's initramfs shell there is **no job control**:
  `kill %1` returns 0 and kills nothing (the busy loop kept `arch_timer` at ~250/s); use `kill $!`. A background `&`
  also needs devtmpfs mounted first (`/bin/sh: can't open /dev/null: no such file`). (4) Firing `system_powerdown` from a verification
  script and filtering the monitor's escape codes: `docs/running-commands.md`. (5) Sleeping in a
  tasklet gives **different final crashes** depending on who was interrupted: idle → `execute from non-executable
  memory` + `Attempted to kill the idle task!` (3/3 runs); busy `sh` → `write to read-only memory` in `run_timer_base` +
  `Fatal exception in interrupt` (1 run). The first `BUG:` line is identical. (6) `talarm.c` without `#include
  <linux/of.h>` fails with `array type has incomplete element type ‘struct of_device_id’`. (7) Latency numbers are TCG
  numbers and swing 5–10× between runs; only order and context are stable.

- **Lesson 56 (`Truy cập phần cứng: MMIO và đồng bộ`, written 2026-09-30, machine B).** Working dir `~/bai56`:
  `race/` (`race.c` 92 lines, Makefile = lesson 55's with `race`), `virt.dtb`/`virt.dts` (fresh `dumpdtb` **with `-smp 2`**
  and `-append` → **384** lines, PL061 at line 273), `vgpio.dts` (9 lines: `/include/ "virt.dts"` + `/delete-node/ gpio-keys`
  + `pl061@9030000 { compatible = "learn,vgpio"; }`), `vgpio.dtb` (**7 331 B**), `clash.dts`/`clash.dtb` (7 634 B — keeps
  the PL061 node and adds `vgpio@9030000` on the same range), `vgpio/` (`vgpio.c` **270** lines, `vgpio_ioctl.h` 18,
  Makefile), `app/` (`vgctl.c` 53 lines, static `vgctl`, `vgctl-host`), `v/noirqsave/`, `v/noclear/` (built with
  `KCFLAGS=-DNO_IRQSAVE` / `-DNO_CLEAR`), `initramfs/` = `~/bai32/initramfs` + `race.ko`, `vgpio.ko`, `vgctl`,
  `vgpio_noirqsave.ko`, `vgpio_noclear.ko`. Boot line = lessons 50–55 **plus `-smp 2`** (the first lesson that adds it).
  **Reads nothing from `~/bai54` or `~/bai55`**; the lesson says both may now be deleted, and tells the learner to keep
  `~/bai56/vgpio`, `app/`, `virt.dts`, `vgpio.dts` because Bài 57 maps the PL061 datasheet onto `vgpio.c`.
- **Node map lesson 56 fixed (a later lesson must not contradict):** in `vgpio.dts` PL061 is **no longer a GPIO controller
  driven by the kernel** — it is a platform device `9030000.pl061` bound by `vgpio`; `gpio-keys` is deleted. Pin map in
  this tree: pins 0–2 = three LEDs (`LED_MASK 0x07`), pin 3 = the `virt` power button (rising edge, `GPIOIBE` 0, `GPIOIEV`
  bit 3). IRQ is the PL061's own SPI 7 → `hwirq` 39 → Linux IRQ **20**, **level** (`GIC-0  39 Level`), not lesson 55's
  chained IRQ 21. The lesson-54/55 pins (1 = `gpio-delay`, 0 = lesson 45's LED) do **not** exist in this tree. Bài 57/58
  choosing a GPIO setup must pick one of the two trees explicitly and say so.
- **Lesson 56 owns, and later lessons must not re-teach as new:** MMIO as the "service counter" analogy; the PL061 register
  table (`GPIODATA` 0x000–0x3FC with the address-mask trick, `GPIODIR` 0x400, `IS/IBE/IEV/IE` 0x404–0x410, `MIS` 0x418,
  `IC` 0x41C, `PeriphID0..3` 0xFE0 → `0x041061`, PrimeCellID `0x0D 0xF0 0x05 0xB1`); why `ioremap` (Device memory, no
  cache); the four-row table `ioremap` / `devm_ioremap` / `devm_ioremap_resource` / `devm_platform_ioremap_resource`;
  never dereference `__iomem`; `readb/w/l/q`; `readl` = `ldr` + `dmb oshld`, `writel` = `dmb oshst` + `str`, `_relaxed`,
  `mb/rmb/wmb` = `dsb`; BusyBox `devmem` (read, write, width), `Bus error` rc 135, `STRICT_DEVMEM`; race condition in
  kernel with the four interrupter table (other CPU / preemption / hardirq / softirq); `kthread_create` + `kthread_bind`
  + `completion`; `module_param` + `MODULE_PARM_DESC` + `/sys/module/NAME/parameters` + `modinfo -F parm` (**first lesson to
  use `module_param`**); `READ_ONCE`/`WRITE_ONCE` are not atomicity; `atomic_t` (`stadd` LSE vs `ldxr`/`stxr` fallback,
  `.altinstructions`, `alt_cb_patch_nops`); spinlock vs mutex vs atomic table and decision figure with measured cost;
  `spin_lock_irqsave` rule; `misc_register` (major 10, `MISC_DYNAMIC_MINOR` → 258, `/proc/misc`, `private_data` set by
  misc core — **the first lesson to use it**, lessons 52–54 never mentioned it); level-IRQ clearing (`GPIOIC`) and the
  interrupt storm; `/proc/irq/N/effective_affinity_list`; `taskset`; reading a hung guest with QEMU monitor
  `info registers` + `cpu 1` and resolving PC via `System.map`; the RCU stall report format (`0-...0`, `detected by 1`,
  `t=5252 jiffies`, `CONFIG_RCU_CPU_STALL_TIMEOUT=21`).
- **Lesson 56 deliberately does NOT teach:** `gpiochip`/`gpio_chip` registration, `/dev/gpiochipN`, `libgpiod`, reading the
  PL061 datasheet itself (Bài 57 — the register table is presented as "copied from `gpio-pl061.c`"); `rwlock`, seqlock,
  RCU as an API (RCU appears only as the stall detector); `lockdep`/`PROVE_LOCKING` (named, not set); `spin_lock_bh`;
  `local_irq_save`; `wait_event`/wait queues; `completion` beyond `race.ko`; DMA mapping API (DMA only as the reason for
  barriers); `ioremap_wc`; `iowrite32`; `regmap`. It **does not touch the lesson 51 oops debt**; the `Bus error` in step 1
  is a userspace SIGBUS, not a kernel oops.
- **Findings a later lesson could trip over:** (1) **The missing-`irqsave` deadlock is only reproducible if the `echo` runs
  on the CPU that receives the IRQ.** IRQ 20 and IRQ 13 (UART) both have `effective_affinity_list` = `0` on this setup, so
  the lesson pins the writer with `taskset 1`. With the writer on CPU1 the other CPU simply spins until release. (2) The
  RCU stall message after that deadlock appears in only **5 of 13** runs (always at ≈29.3 s uptime when it does, second
  one at ≈92.3 s); the other runs are completely silent. `info registers` always gives CPU0 PC
  `ffff800081162c90` (`queued_spin_lock_slowpath+8`) and CPU1 `ffff800081157b58` (`cpu_do_idle`); with `-smp 1` CPU0 PC is
  `ffff800081162cf8`. Cause of the 5/13 not investigated further. (3) In the deadlocked guest, a background
  `taskset 2 sh -c 'sleep 15; …; echo helper done on cpu1' &` still prints — CPU1 is alive; only input is dead. (4)
  `/include/` paths in a `.dts` are relative to **the including file's directory**, not the cwd (`FATAL ERROR: Couldn't
  open "../bai54/virt.dts"` when the `.dts` sat in `v/`). (5) BusyBox `time` splits `user`/`sys` unreliably while IRQs are
  off: the same 3 s `mdelay` read `user 0.00 / sys 3.00` and `user 0.76 / sys 2.24` in two runs. (6) `READ_ONCE`/
  `WRITE_ONCE` are needed in `race.ko` mode 0 or GCC may fold the loop. (7) Timings (`atomic_t` 94–126 ms, spinlock 257–320,
  mutex 380–395) are TCG numbers and drift per boot; the order is stable. (8) The `for` loop over `$f`/`$s` inside
  `wsl -d OSD -- bash -c '…'` is emptied by the outer shell again — loop on the Git Bash side (`docs/running-commands.md`).
  (9) `grep -c 'dmb\toshst'` (basic regex) counts **0**; use `grep -cP`.

- **Lesson 57 (`Đọc datasheet và GPIO hiện đại`, written 2026-09-30, machine B).** Working dir `~/bai57`: `doc/`
  (`DDI0190.pdf` **379 704 B**, sha256 `6cebbefa…c9c6d`, and `DDI0190.txt` from `pdftotext -layout`, **2 542** lines),
  `libgpiod-2.2.5.tar.xz` (511 516 B, `sha256sum -c` against kernel.org `sha256sums.asc` OK) + source tree + `build-gpiod/`
  (static ARM64 tools, `lib/.libs/libgpiod.a` 282 992 B), `config.orig` (the `.config` before `GPIO_SIM`), `initramfs/` =
  `~/bai32/initramfs` + six stripped libgpiod tools + `button` + `lib/modules/{gpio-sim,dev-sync-probe,vgchip,vgchip_onewrite}.ko`
  + empty `/config`, `app/button.c` (63 lines), `vgchip/` (`vgchip.c` **143** lines, Makefile = `~/bai56/vgpio/Makefile` with
  `vgpio`→`vgchip`), `v/onewrite/` (`KCFLAGS=-DVALUE_BEFORE_DIR_ONLY`), `vgchip.dts` (`/include/ "../bai56/virt.dts"` +
  `/delete-node/ gpio-keys` + `compatible = "learn,vgchip"`), `vgchip.dtb` **7 335 B**. ~27 MB. Reads `~/bai56/vgpio.dtb`,
  `virt.dts`, `vgpio/Makefile`; the lesson says `~/bai56` may now be deleted.
- **Lesson 57 changed the shared kernel tree:** `~/bai38/linux-6.18.45/.config` now has `CONFIG_GPIO_SIM=m`, `CONFIG_IRQ_SIM=y`
  (built-in, so `Image` was rebuilt), `CONFIG_DEV_SYNC_PROBE=m`. `Image` size unchanged (49 342 976 B); `.version` went 1 → 4
  during verification. `drivers/gpio/gpio-sim.ko` (262 128 B) depends on `dev_sync_probe`. Every later lesson boots this `Image`.
- **Lesson 57 owns, and later lessons must not re-teach as new:** datasheet vs TRM; the five-chapter TRM layout and which
  chapters a driver writer reads; "base address is not fixed, offset is" (DDI 0190B §3.1) → base from DT `reg`; register-map
  columns (offset / type / width / reset value), `Read`/`Write`/`Read/write`, W1C, reserved; bit-field extraction
  `(v >> lo) & mask` on `PeriphID` → part/designer/revision/config; the Table 3-3 typo ("Bits cleared, pins output") settled by
  hardware; GPIODATA address mask (0xFB @ +0x098 → 0x22, read @ +0x0C4 → 0x31); "only affects the pins that are configured as
  outputs" and the `direction_output` double write (`gpio-pl061.c` comment); the line-by-line map `vgpio.c` → DDI 0190B;
  reading §2.3.2 "Recommendations" for intent; provider vs consumer, `struct gpio_chip` fields and five ops,
  `devm_gpiochip_add_data` (`EXPORT_SYMBOL_GPL`), `gpiochip_get_data`, `base = -1` → `GPIO_DYNAMIC_BASE` 512; GPIO chardev
  (major **254** `gpiochip`), `GPIO_CDEV`/`GPIO_CDEV_V1`, why sysfs GPIO is obsolete (table of six problems; `GPIO_SYSFS` is
  `if EXPERT` and absent from `defconfig`); libgpiod v1 vs v2, the six tools and their v2 syntax (`-c`, `-t 0`, `-a`, names),
  ownership (`EBUSY`, `consumer=`, release on fd close), libgpiod v2 object model (`chip` / `line_settings` / `line_config` /
  `request_config` / `line_request` / `edge_event_buffer`); configfs as "userspace mkdir asks the kernel to create";
  gpio-sim lifecycle (`mkdir` → attrs → `live`, `sim_gpioN/pull`/`value`, `EPERM` on re-`live`, `rmdir` leaf-first).
- **Lesson 57 deliberately does NOT teach:** `gpio_irq_chip` / `gc.irq` (named as the reason `gpiomon` gets `ENXIO` on
  `vgchip`; suggested as an exercise); `regmap`; pinctrl / pinmux (`GPIOAFSEL` explained only as "hardware control mode");
  `gpiod_*` consumer API beyond naming (Bài 54 used it); GPIO hogs; `gpio-line-names` in DT; `gpionotify`; libgpiod bindings
  (C++/Python/Rust); debounce; `gpio-mockup`/`gpio-virtuser` beyond one mention; HTE timestamps. **Does not touch the lesson 51
  oops debt.**
- **Findings a later lesson could trip over:** (1) ARM's doc portal serves every PDF under an opaque
  `documentation-service.arm.com/static/<24-hex>` id; a wrong id returned the SP804 TRM (DDI 0271D) with the same look — always
  check `pdfinfo` Title. The id for DDI0190.pdf came from the JSON at `…/documentation/ddi0190/b/?lang=en`
  (`_links.resources[].name == "DDI0190.pdf"`). (2) Ubuntu 20.04's `gpiod` is 1.4.1 (v1 CLI); libgpiod ≥ 2.3 needs `meson`
  (absent) — 2.2.5 is the last autotools release. It bundles `lib/uapi/gpio.h`, needed because the arm64 cross headers
  (`linux-libc-dev-arm64-cross` 5.4) have 0 `GPIO_V2_*`. `LDFLAGS=-all-static` is required for fully static tools (libtool).
  (3) **gpiolib does not restore direction when a line is released**: after `gpioset -t 0`, PL061 keeps `GPIODIR`/`GPIODATA`;
  gpio-sim drops `value` back to its pull. (4) `gpioget` **without `-a` switches the line to input** — on `vgchip` it took
  `GPIODIR` 0x05 → 0x00. Any later lesson reading an output line must use `-a`. (5) The one-write bug reproduces only when the
  line is input at the moment of the write; a second `gpioset` succeeds. Seen in 4 boots. (6) `rmmod vgchip` does **not** reset
  `GPIODIR` (no `free`/teardown writes) — the register survives into the next `insmod` within one boot. (7) Background
  `gpiomon`/`button` output interleaves with the `~ #` prompt, as in lesson 54. (8) A second kernel build after toggling
  `GPIO_SIM` shows no `CC … irq_sim.o` lines (objects cached); the lesson quotes the first build (32.4 s) and says so in a callout.

- **Lesson 58 (`Driver cho bus I2C và SPI`, written 2026-09-30, machine B) closes Chặng 10.** Working dir `~/bai58`:
  `virt.dts`/`virt.dtb` (fresh `dumpdtb` with `-smp 2` + `-append`, **384** lines, 0 lines matching `i2c|spi`),
  `config.orig` (the `.config` before `I2C_STUB`), `ltemp/` (`ltemp.c` **125** lines, Makefile = `~/bai57/vgchip/Makefile`
  with `vgchip`→`ltemp`), `i2csim/` (`i2csim.c` **127**), `spiloop/` (`spiloop.c` **63**), `lspi/` (`lspi.c` **64**),
  `v/oldprobe/`, `v/noswap/`, `v/spidev1.dts`, `v/spidev2.dts`, `buses.dts` (43 lines, `/include/ "virt.dts"` + `i2c-sim` +
  `spi-loop`), `bad.dts` (I2C only, child without `reg`), `spidev_test` (static, built from `tools/spi/`), `initramfs/` =
  `~/bai32/initramfs` + modules in `lib/modules/`. The lesson says `~/bai58` is disposable (keep `ltemp/` as a portfolio
  sample if wanted) and that `~/bai57` may now be deleted. **Next lesson (59) opens Chặng 11 and reads nothing from here.**
- **Lesson 58 changed the shared kernel tree:** `~/bai38/linux-6.18.45/.config` now has `CONFIG_I2C_STUB=m` (one-line diff,
  line 4002, no `select`); `Image` rebuilt (size unchanged 49 342 976 B, `.version` 4 → 5), `drivers/i2c/i2c-stub.ko`
  163 856 B. `I2C=y`, `I2C_CHARDEV=y`, `SPI=y`, `SPI_SPIDEV=m`, `SENSORS_TMP102=m`, `SENSORS_LM75=m`, `I2C_GPIO=m`,
  `I2C_BCM2835=m`, `REGMAP_I2C=y` were already in `defconfig`; `SPI_LOOPBACK_TEST` and `SPI_GPIO` are **not set**.
- **Departure from the roadmap line (recorded in `LO-TRINH.md` §10):** "machine `raspi3b`" was not used. QEMU 4.2.1 has no
  `raspi3b` (it is `raspi3`), and `raspi3`'s `bcm2835-i2c0/1/2` at `0x3f205000`/`0x3f804000`/`0x3f805000` are
  `prio -1000` unimplemented placeholders — `-device tmp105` → `No 'i2c-bus' bus found`, same as `virt`. The lesson replaces
  it with self-written simulated bus drivers (`i2csim`, `spiloop`). "SPI loopback" in the roadmap line = `spiloop`, not the
  kernel's `SPI_LOOPBACK_TEST` (which tests a real controller with MOSI wired to MISO).
- **Lesson 58 owns, and later lessons must not re-teach as new:** the three roles adapter/controller – client/device – client
  driver, and "the client driver never touches adapter registers"; I2C vs SPI table (wires, addressing, duplex, ACK); START/
  STOP/repeated START, address byte = addr<<1 | R/W (0x48 → 0x90/0x91), open-drain + pull-up, NACK → `-ENXIO`; SMBus
  transaction types and the `i2c_smbus_*` table; SMBus low-byte-first vs TMP102 MSB-first and `i2c_smbus_read_word_swapped`
  (static inline, `i2c.h:162`); I2C fault codes (`Documentation/i2c/fault-codes.rst`, 135 lines) and `dd.c:649–650` silence
  for `-ENODEV`/`-ENXIO`; `struct i2c_driver` on 6.18 (probe one arg, remove void), `struct i2c_client` fields, sysfs name
  `BUS-ADDR` (`i2c-core-base.c:893`), three ways to instantiate a client (DT child / `new_device` / `i2c_new_client_device`);
  `new_device`/`delete_device`; `/dev/i2c-N` major 89; BusyBox `i2cdetect/i2cget/i2cset/i2cdump` (`-y`, `w`/`b`, `-f`),
  `--`/number/`UU`, `EBUSY` from `i2c-dev.c:414–415`; `i2c-stub` (`chip_addr`, `depends on m`, `u16 words[256]`, byte read =
  low byte, returns `-ENODEV` for an empty address); DT children of a bus (`#address-cells = <1>`, `#size-cells = <0>`,
  `reg` = 7-bit address or CS, `spi-max-frequency`), "i2c-core, not the platform bus, creates the child", `of_i2c: invalid
  reg`; `struct i2c_adapter` + `i2c_algorithm` (`smbus_xfer`, `functionality`), `adap.dev.of_node`, `devm_i2c_add_adapter`;
  removing an adapter removes its clients but not the client drivers; SPI full duplex / `spi_transfer` / `spi_message` /
  `spi_sync` / `spi_sync_transfer` / `spi_write_then_read` / `spi_w8r8`, SPI modes CPOL/CPHA and `spi-cpha`/`spi-cpol`;
  `struct spi_controller` + `transfer_one`, `devm_spi_alloc_host`, `devm_spi_register_controller`; `spi_match_device` order
  (`spi.c:370`) and `has no spi_device_id` warning (`spi.c:511`), SPI `modalias` = `spi:<name>`; `spidev` major 153,
  `/dev/spidevB.C`, the "never `compatible = "spidev"`" rule (`spidev_of_check`, `spidev.c:711`), `spidev_test` (`-D -s -H -p -v`);
  `tmp102` as a real hwmon driver (config check R1:R0, extended mode → 50 000 on a dumb model).
- **Lesson 58 deliberately does NOT teach:** `regmap` (named only via `tmp102` using it); 10-bit addresses; I2C mux; SMBus
  alert / PEC / Host Notify; I2C slave mode; `i2c_transfer` hands-on (table row only); `spi_async`; SPI DMA; QSPI/dual/quad
  (`SPI_TX_OCTAL` only as a build error); IIO subsystem; hwmon API for your own driver (`ltemp` exports a private sysfs file);
  `i2c-gpio` hands-on (warn callout only). **Does not touch the lesson 51 oops debt.**
- **Findings a later lesson could trip over:** (1) `i2c-gpio` on `gpio-sim` lines builds a real bit-banged bus (`using lines 520
  (SDA) and 521 (SCL)`, `Slow GPIO pins might wreak havoc` because gpio-sim sets `can_sleep`) but nothing ACKs: `i2cdetect` over
  16 addresses took **13.3 s** and showed only `--`; with SDA pull-down `i2c_algo_bit.bit_test=1` prints `bus seems to be busy
  (scl=1, sda=0)`. A slave emulator would be needed. (2) `i2c-stub` stores words; `i2cset … w 0x0019` makes the "chip" send
  0x19 0x00, which is what a TMP102 at 25 °C sends. (3) `tmp102` writes EM + TM into the config register in `probe`
  (`0xa060` → `0xb062` as SMBus words) and then reads 13-bit format, so a model that does not reformat reads **50 000** for a
  25 °C 12-bit value — on both `i2c-stub` and `i2csim`. (4) `dtc` 1.5.0 warns `unit_address_vs_reg` for a top-level
  `i2c@c000000` without `reg`; the lesson's nodes are named `i2c-sim`/`spi-loop` to avoid it. (5) `spidev_test.c` needs
  `-I ~/bai38/linux-6.18.45/include/uapi` (else `SPI_TX_OCTAL` undeclared — cross headers are 5.4) and then prints one
  `#warning "Attempt to use kernel headers from user space"`. (6) `compatible = "spidev"` alone → `modalias spi:spidev`, no
  probe, no log, no node; with a real chip first → `spidev listed directly in DT is not supported` + `error -22`. (7) The
  verification driver `bin/run.sh` (feed a command file into `qemu … -nographic` with 0.7 s per line) left `\e[6n` after
  each prompt; strip with `sed 's/\x1b\[6n//g'`.

- Module 06 splits ownership the same way module 05 does — keep it that way:
  lesson 33 is **the bootloader's job, proved on QEMU's own stub** (the four mandatory
  duties, SPL/TPL, the ARM64 boot protocol, the 64-byte `Image` header, the handover
  contract broken on purpose with `set $x0`); lesson 34 is **U-Boot as a build artefact**
  (clone → `qemu_arm64_defconfig` → cross-compile → `-bios` → `git am` / `patch -p1`).
  Lesson 33 uses **no U-Boot at all** — that is deliberate, the learner must see that the
  *role* exists before the *program* does. Lesson 35 owns the U-Boot command line
  (`bootflow`, `md`, `setenv`/`saveenv`, `booti`) and lesson 36 owns TFTP + FIT: do not
  spend those in 33/34 beyond a one-line tease.
  **Module 06 is now complete (33–36).**
- Lesson 35 owns, and lesson 36 must not re-teach: the `=>` shell and `help`
  (124 commands), the environment (`printenv`/`setenv`/`saveenv`, `bootcmd` vs `bootargs`,
  the `bad CRC` warning, `CONFIG_ENV_IS_IN_FLASH` at `0x4000000` / 256 KiB), `md`/`mw`/`cmp`,
  `d00dfeed`, `virtio`/`ls`/`load`/`ext4load`, `booti` vs `bootm` (`Wrong Image Type`),
  `boot.scr` via `mkimage -T script`, and the `-bios` vs `-drive if=pflash` persistence
  proof. Lesson 36 owns: QEMU slirp networking, TFTP, FIT (`.its` → `mkimage -f` → `.itb`),
  sha256 verification, and RSA-2048 signing.
- **Lesson 35 creates `~/bai35/disk.img` unprivileged** — `truncate` + `mkfs.ext4 -F -q -L
  BOOT` + `debugfs -w -R "write SRC DST"`. There is **no `sudo` on this machine** (it times
  out), so `mount`, `dosfstools` and `mtools` are all unavailable. Any later lesson that
  needs to put a file into a disk image must use the same `debugfs` trick or build the image
  with `cpio`/`tar` instead.
- **The `-nic` trap (lesson 36, step 1).** On `-M virt`,
  `-nic user,model=virtio-net-device,tftp=…` does **not** work: QEMU prints two warnings
  (`netdev #netNNN has no peer`, `requested NIC … was not created`) and boots on with
  `Net: No ethernet found.` Always write the explicit pair
  `-netdev user,id=net0,tftp=$HOME/… -device virtio-net-device,netdev=net0`.
- **The `dumpdtb` trap (lesson 36, steps 3–6) — the most valuable thing in module 06.**
  `-machine dumpdtb=` must be run with the **identical command line that will boot**,
  `-bios` included. Without `-bios`, QEMU adds `pl061@9030000` + `gpio-keys`
  (393 dts lines vs 372, `pl061` count 1 vs 0) and the resulting DTB makes the kernel die in
  `amba_read_periphid` (`synchronous external abort`, `x9 = 0x9031000`) with **no console
  output at all** unless `earlycon=pl011,0x9000000` is added. Lesson 36 walks the learner
  through this failure on purpose; do not "fix" it into a clean path.
- **`dumpdtb` output is not reproducible**: QEMU injects fresh `rng-seed` and `kaslr-seed`
  each dump, so the DTB's sha256 (and therefore the FIT's) changes every time. Lesson 36
  says so in a `warn` callout. Never tell a learner to compare FIT hashes across builds.
- **FIT load address**: the FIT must be loaded somewhere other than the `load` address
  declared inside it, or `bootm` aborts with `ERROR: new format image overwritten - must
  RESET the board to recover`. Lesson 36 uses `0x44000000` for the FIT and `0x40400000`
  (= `kernel_addr_r`) for the kernel. Note `ramdisk_addr_r` is also `0x44000000` on this
  machine — that is fine in the FIT flow, but do not reuse both in one sequence.
- **FIT signing works on this U-Boot** because `qemu_arm64_defconfig` sets `CONFIG_OF_BOARD=y`:
  `mkimage -f … -k keys -K control.dtb -r` writes `/signature/key-dev` with
  `required = "conf"` into a copy of the dumped DTB, and QEMU `-dtb control.dtb` hands it to
  U-Boot as the control FDT. Signed → `sha256,rsa2048:dev+ OK`; unsigned-but-intact →
  `No 'signature' subnode found for 'conf-1' config node` / `Failed to verify required
  signature 'key-dev'` / `Bad Data Hash` / `ERROR -2`. On real hardware the control FDT is
  built into U-Boot instead; say so, do not imply `-dtb` is the production method.
- Lesson 33's practice reuses `~/bai32/Image` — nothing else. It never needs
  `initramfs.cpio.gz` for the header work, only for the control boot in step 4. Its "Lỗi
  thường gặp" table tells the learner to keep `~/bai32` **until the end of Chặng 06**.
- Lesson 34's practice **creates** `~/bai34/u-boot` — a `--depth 1` clone of tag
  **v2026.07** (commit `ece349ad`, 402M fresh, 481M after building). The tree really exists
  on the machine as of 2026-08-16 and was left **pristine** (`git reset --hard ece349ad`,
  clean `git status`, `u-boot.bin` rebuilt to 1 498 688 B). **Lessons 35 and 36 reuse this
  exact tree and this exact `u-boot.bin`** — do not tell the learner to delete it, and
  re-verify the commit before quoting a new number from it.
- The proven patch hook for module 06 is **`board_late_init()`** in
  `board/emulation/qemu-arm/qemu-arm.c`, not `checkboard()` — lesson 34's demo patch adds a
  `printf()` there and the banner lands between `Err: serial,vidconsole` and
  `No USB controllers found`. If a later lesson patches U-Boot, use the same hook so the
  learner sees output in a place they already recognise.
- `qemu_arm64_defconfig` has **no SPL and no TPL** (`CONFIG_POSITION_INDEPENDENT=y`,
  `CONFIG_TEXT_BASE=0x00000000`, `CONFIG_OF_BOARD=y`). Lesson 33 teaches SPL/TPL as theory
  and says so explicitly — do not later claim the learner has "built an SPL".
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
  directory. It was rebuilt on **2026-08-16** while verifying lesson 33 and is on the machine
  now — **134 MB**, holding `Image` (30 771 136 B), `initramfs.cpio.gz` (1 035 397 B), the two
  `.deb` files and the unpacked `initramfs/` tree, but **no `run.sh`** (the verification typed
  the QEMU line directly). Lesson 33 quotes `~/bai32/Image` and `~/bai32/initramfs.cpio.gz`
  only, never `run.sh`. `ls` it before assuming any other file is there.
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
- **Bài 24 (`select`/`poll`/`epoll`) — its motivation is already spent by `bt-23` E6.** That
  exercise has the learner build the two-FIFO reader, watch it deadlock, and name both
  escape routes (thread-per-FIFO vs. wait-on-many) with the cost of each. Lesson 24 should
  *pick that experiment up*, not re-derive it. Two details from it that the lesson must not
  contradict: the reader stalls at **`open()`**, not `read()` — so any lesson-24 example has
  to open with `O_RDWR` or `O_NONBLOCK` to reach its event loop at all; and the verified
  transcript is `opened a = 3` · `opened b = 4` · `from a: a1` · `from b: b1`, all appearing
  at once only after `a` is written (`docs/environment.md`, 2026-08-27).
- **`bt-23` E4 owns the "shm survives its process" demo** via a 64 MB `pause()`-based leaker
  killed with `kill -9`. It also spends the `ftruncate` ≠ allocated-pages point (`df` reads
  `0` until you `memset` the mapping). Do not reintroduce either as new material.

- **DEFECT, found 2026-08-28 while writing `bt-25`: Bài 25's headline transcript no longer
  reproduces on this machine.** Lesson 25 (`lessons/bai-25.js` ~line 682) prints
  `./hello-arm64: cannot execute binary file: Exec format error` / `exit=126`, and the whole
  lesson — `goals`, the `ENOEXEC` glossary row, the *"126 vs 127"* callout, the `recap`, and
  quiz question 3 — is built on it. Today the same command prints the program's output and
  **exits 0**, because `qemu-user-binfmt` is installed and `/proc/sys/fs/binfmt_misc/` has
  `qemu-arm`, `qemu-aarch64` and `qemu-armeb` registered; the kernel hands the binary to
  `/usr/bin/qemu-aarch64` instead of refusing it. Those handlers almost certainly arrived
  with the **Chặng 05** QEMU work (lessons 29–32), which was written *after* Bài 25 — so the
  lesson was correct when captured and the environment moved underneath it. Ironically Bài 25
  already names the mechanism (its own §1 ends *"...muốn có lớp dịch, bạn phải cài thêm một
  chương trình làm việc đó — và tự nói cho nhân biết, qua `binfmt_misc`"*) without knowing it
  would soon be true locally. **The lesson has not been edited** — that is the user's call.
  `bt-25` handles it head-on instead: its E1 has the learner predict the failure, meet the
  success, find the handler, and only then reach the principle, which is a stronger exercise
  than the original. Anything later in the course that re-runs a foreign binary on the host
  must expect **exit 0**, not 126.
- **`bt-25` E-part owns the sudo-free `ENOEXEC` trick**: patch `e_machine` (2-byte LE at
  offset `0x12`) to `250` with `dd`, and the kernel refuses with the textbook
  `Exec format error` / **126** because no `binfmt_misc` handler claims that value. Required
  because the handlers cannot be turned off without root and `sudo` here needs a password
  (`docs/environment.md`, 2026-08-28). Do not reintroduce it as new material later.
- **`bt-25` also spends these numbers** (all re-measured 2026-08-28, `docs/environment.md`):
  `e_machine` 62 vs 183 · the three `-dumpmachine` triplets vs `uname -m` ·
  `__SIZEOF_LONG__` 8/8/**4** and the armhf `_Static_assert` failure · one 11 711-byte
  compile costing **33 MB** peak RSS natively and **43 MB** cross · the `ulimit -v` floor
  between **32 MB (fails)** and **64 MB (succeeds)** · `cc1` = **37 475 472 B** and
  `/usr/libexec/gcc/x86_64-linux-gnu/15` = **111 MB** · emulation costing **≈5.5×**
  (0.09 s → 0.47–0.55 s). Chặng 04's remaining lessons should not re-derive these.

- **`bt-26` spends the ABI / prefixed-tools / sysroot triple.** Its trục are *ABI, not
  architecture, decides linkability* · *ELF-shell tools are architecture-agnostic,
  instruction-decoding tools are not* · *the cross compiler looks for headers and libraries
  in the target's tree, not `/usr/include`*. Its part D reaches back to Bài 25, 16 and 17.
  None of these may be spiralled again (`write-exercise` §13.8) — later sets put them in D.
- **`bt-27` spends three failure modes that later modules will keep meeting.** Record them
  so Chặng 08–10 do not present them as new:
  - **The "`Nothing to be done`" cross-architecture trap.** Build natively, then re-run
    `make CROSS_COMPILE=aarch64-linux-gnu-` without touching a source file: `make` compares
    **mtimes only**, prints `make: Nothing to be done for 'all'.`, exits **0**, and leaves an
    **x86-64** artefact behind. This is the only error in the set that exits 0 with a wrong
    product, and `bt-27` E5 owns it. Verifying it requires building in that order — build
    cross-first and the trap looks harmless (a mistake made and corrected 2026-08-29).
  - **`STRIP = strip` in a cross Makefile** → `strip: Unable to recognise the architecture
    of the input file`, `Error 1`, make exit **2**, product left unstripped. `bt-27` E5's
    other half; Bài 26's *every tool needs the prefix* is the principle behind it.
  - **`skipping incompatible …libfoo.a when searching for -lfoo` then `cannot find -lfoo`.**
    The linker's way of saying "found it, wrong architecture" — distinct from a plain
    `cannot find -lz`, which means it never found anything. `bt-27` C3 makes the learner
    separate the two, plus a third cause (name/permission mismatch). Note that **`file` on a
    `.a` reports only `current ar archive`**, so the architecture is invisible until you look
    at a member.
- **`bt-27` also spends these numbers** (verified 2026-08-29, all in `docs/environment.md`):
  15 952 / 70 448 / 9 008 B and the **61 440 B** page-alignment delta that survives `strip`
  unchanged · `size` `1373 600 8` vs `1678 640 8` (identical for both ARM64 files) ·
  stripped **6 168** vs native **14 464** · static **705 256** / **597 920** with text
  **530 865** · **31** `qemu-*` binfmt handlers plus `WSLInterop`/`python3.14` · exit **126**
  vs exit **255** · `ldd` → `not a dynamic executable`, exit 1 · **49 vs 858** libraries and
  the `libc.so.6` 1 781 952 + loader 200 688 = **1 982 640 B** fixed dynamic cost, break-even
  at **4** programs. A later lesson re-deriving any of these is repeating, not teaching.
- **`-L` before `-l` is NOT required** — a plausible rule that verification disproved
  (`docs/environment.md`, 2026-08-29). Do not build a lesson, a quiz or an exercise on it.
- **Lesson 27's build tree `~/embedded/bai27` is gone.** Unlike `~/bai38/linux-6.18.45` and
  `~/bai40/modroot*`, nothing depends on it; anything re-verifying Bài 27 rebuilds fresh.

### Chặng 11 — Build system

- **Lesson 59 (`Vì sao cần build system`, written 2026-09-30, machine B) opens Chặng 11.** Working dir `~/bai59`: `dl/`
  (BusyBox 1.38.0 tarball + `.sha256`, **copied from `~/bai47`** because `busybox.net` answered **401** through the machine-B
  proxy all evening), `pristine.config`, `one/`, `two/` (two full BusyBox trees), `pack/` (`a`, `b`), `mini/` (the 47-line
  Makefile project), `other/` (a copy of `mini`). **~190 MB, disposable** — Bài 60 reads nothing from it. The lesson tells
  the learner they may keep `~/bai59/mini` after `make clean` (2.7 MB) as a reference. **It writes nothing into
  `~/bai38`**: step 1 runs `defconfig` with `KCONFIG_CONFIG=$HOME/bai59/pristine.config`, and `.config` md5 stays
  `1ebe385ae54674dd43034ea6006ad670` (verified with a `find -newer` marker: nothing in the tree changed).
- **Lesson 59 owns, and Bài 60–62 must not re-teach as new:** the three problems (reproducibility, dependency, long-term
  maintenance) and the "cooking from memory vs written recipe" analogy; the five leak sources table (clock, TZ/locale,
  filesystem, machine identity, toolchain); `KBUILD_BUILD_USER/HOST/VERSION/TIMESTAMP` (named, grep shown at
  `scripts/mkcompile_h:8–16`, `init/Makefile:32–33`; **not** exercised — no kernel rebuild) and why `Image` holds two
  `Linux version` strings (`version.c` with `utsversion-tmp.h` vs `version-timestamp.c`, `init/Makefile:44–62`);
  `KCONFIG_CONFIG=` + `scripts/diffconfig` (5 lines vs defconfig: `GPIO_SIM`, `I2C_STUB`, `LOCALVERSION`, `+DEV_SYNC_PROBE`,
  `+IRQ_SIM`); `SOURCE_DATE_EPOCH` (BusyBox `scripts/kconfig/confdata.c:384`, `AUTOCONF_TIMESTAMP` →
  `libbb/messages.c:11`); the `TZ` leak; `cmp -l`, `grep -abo`, `readelf -n` Build ID arithmetic; cpio `newc` header fields
  read by hand; `touch -h -d @EPOCH`, `LC_ALL=C sort`, `cpio --reproducible --owner=0:0`, `gzip -n`; the four-column ablation;
  stamps (`.stamp_extracted`, `.stamp_rootfs` — named after Buildroot's); `build/` vs `out/` (≈ Buildroot `output/build` /
  `output/images`); "rebuild rootfs from scratch, never patch it"; check → delete → stamp-last ordering; the **undeclared
  dependency** lesson (edit `EPOCH` in the Makefile → `Nothing to be done`, rc 0, stale product; fix = add `Makefile` as a
  prerequisite of `build/.stamp_extracted` — verified, shown only in a callout).
- **Lesson 59 deliberately does NOT:** build the kernel reproducibly (named only; would replace the shared `Image`);
  use `-ffile-prefix-map`, `diffoscope` or `strip-nondeterminism` (neither installed on machine B); fetch Buildroot or show
  its source (github raw and gitlab both returned 401 through the proxy) — every Buildroot/Yocto claim is in a comparison
  table or a forward pointer to Bài 60–62. **Bài 60 should confirm on disk** that Buildroot really names its stamps
  `.stamp_extracted` etc. and really creates `output/build`, `output/images`, `target/` — lesson 59 promises it will.
- **Lesson 59's `Bài tiếp theo` promises Bài 60:** Buildroot builds its own ARM64 toolchain (the fifth leak), then kernel +
  BusyBox + rootfs from one `defconfig` and one `make`; the learner finds the same stamp names in `output/build/`; measure
  first-build time and disk usage; boot the Buildroot image in QEMU and compare with lesson 59's **1 156 KiB** rootfs.
- **Findings a later lesson could trip over:** (1) **BusyBox Kconfig leaks `TZ` even with `SOURCE_DATE_EPOCH` set**:
  `confdata.c:387` calls `gmtime()`, then `:404` calls `ctime()`, which overwrites the shared static `struct tm`, so
  `AUTOCONF_TIMESTAMP` is written in local time. Same epoch: `+07` → sha256 `da878811…`, `TZ=UTC` → `b9613970…`.
  (2) Exporting `SOURCE_DATE_EPOCH` and re-running `make` in an already-built BusyBox tree changes nothing — the timestamp
  is baked in at config time; needs `distclean` + `defconfig`. (3) Without `sort`, two copies on the same ext4 packed
  identically; a copy on tmpfs (`/dev/shm`) did not — the order leak only shows when the filesystem changes. Two command-running gotchas from this session
  (a `bash -lc` hang, `grep` swallowing binary output) are in `docs/running-commands.md`.

## Cross-reference map (grep this before writing `Chặng NN` in prose)

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

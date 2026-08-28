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

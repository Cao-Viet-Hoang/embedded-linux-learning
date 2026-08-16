# §12.1. Course continuity notes

> Split out of `CLAUDE.md` §12 on 2026-08-11. `CLAUDE.md` §12 keeps the short status —
> what is written, what is next, what is deployed. This file keeps the per-module content
> decisions that only matter while writing or editing a lesson.
>
> **Update this file in the same commit as the lesson that changes it.**

## Module and lesson notes

- Module 06 splits ownership the same way module 05 does — keep it that way:
  lesson 33 is **the bootloader's job, proved on QEMU's own stub** (the four mandatory
  duties, SPL/TPL, the ARM64 boot protocol, the 64-byte `Image` header, the handover
  contract broken on purpose with `set $x0`); lesson 34 is **U-Boot as a build artefact**
  (clone → `qemu_arm64_defconfig` → cross-compile → `-bios` → `git am` / `patch -p1`).
  Lesson 33 uses **no U-Boot at all** — that is deliberate, the learner must see that the
  *role* exists before the *program* does. Lesson 35 owns the U-Boot command line
  (`bootflow`, `md`, `setenv`/`saveenv`, `booti`) and lesson 36 owns TFTP + FIT: do not
  spend those in 33/34 beyond a one-line tease.
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

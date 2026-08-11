# §10. Verified environment facts

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged** — every
> `§10` reference in the repository points here.
>
> Read this *before* writing a probe script: a fact already recorded here does not need
> re-probing. Add anything a probe teaches you back into the table below, so the next
> session can skip the probe entirely. Companion file: `docs/running-commands.md` (§9.1).

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

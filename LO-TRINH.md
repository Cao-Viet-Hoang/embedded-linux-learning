# Lộ trình học Embedded Linux từ số 0 đến đi làm

> Dành cho người **chưa biết gì về Linux**, học hoàn toàn bằng phần mềm
> (WSL2 + QEMU), không cần mua board.

---

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| **Mục tiêu** | Đủ năng lực ứng tuyển vị trí *Embedded Linux Engineer* |
| **Điểm xuất phát** | Chưa biết Linux, chưa biết embedded |
| **Tổng số bài** | **70 bài**, chia thành **14 chặng** |
| **Thời lượng** | 8–11 tháng, nhịp 8–12 giờ/tuần |
| **Môi trường** | WSL2 (Ubuntu 26.04) + QEMU trên Windows 11 |
| **Phần cứng** | Không bắt buộc. Có thể mua sau ở Chặng 13 |
| **Ngôn ngữ lập trình** | C là chính, Bash hỗ trợ, Python ở mức đọc hiểu |
| **Giả định sẵn có** | Biết dùng Git ở mức cơ bản (clone, branch, commit, patch) |

---

## 2. Bốn nguyên tắc của lộ trình này

**1. Không có bài nào chỉ toàn lý thuyết, cũng không có bài nào chỉ toàn thao tác.**
Mỗi bài đều theo cấu trúc: *hiểu vấn đề → hiểu công cụ → tự tay làm → kiểm chứng kết quả*.

**2. Mọi câu lệnh đều được mổ xẻ.**
Không có dòng lệnh nào xuất hiện mà không giải thích từng thành phần: lệnh gốc làm gì, mỗi tham số nghĩa là gì, tại sao chọn tham số đó chứ không phải cái khác, và điều gì xảy ra nếu bỏ nó đi.

**3. Sai lầm được dạy chủ động.**
Mỗi bài có mục *"Lỗi thường gặp"* — mô tả thông báo lỗi thật, nguyên nhân gốc, và cách sửa. Học embedded Linux là học cách đọc lỗi.

**4. Hiểu trước, tối ưu sau.**
Bạn sẽ dựng rootfs bằng tay với BusyBox **trước khi** chạm vào Buildroot; build kernel thủ công **trước khi** dùng Yocto. Công cụ tự động chỉ có ý nghĩa khi bạn biết nó đang tự động hoá cái gì.

---

## 3. Bản đồ tổng quan

```
CHẶNG 0  ▸ Nhập môn                          3 bài   ─┐
CHẶNG 1  ▸ Linux căn bản                    10 bài    │ NỀN MÓNG
CHẶNG 2  ▸ C và công cụ build                5 bài    │  (~3 tháng)
CHẶNG 3  ▸ Lập trình hệ thống Linux          6 bài   ─┘

CHẶNG 4  ▸ Cross-compilation                 4 bài   ─┐
CHẶNG 5  ▸ QEMU và luồng khởi động           4 bài    │ LÕI EMBEDDED
CHẶNG 6  ▸ Bootloader U-Boot                 4 bài    │  (~2 tháng)
CHẶNG 7  ▸ Linux Kernel                      5 bài   ─┘

CHẶNG 8  ▸ Device Tree                       4 bài   ─┐
CHẶNG 9  ▸ Root filesystem                   4 bài    │ CHUYÊN SÂU
CHẶNG 10 ▸ Kernel module & Driver            9 bài   ─┘  (~4 tháng)

CHẶNG 11 ▸ Build system                      4 bài   ─┐
CHẶNG 12 ▸ Debug, đo đạc, tối ưu             4 bài    │ THÀNH NGHỀ
CHẶNG 13 ▸ Thành phẩm & nghề nghiệp          4 bài   ─┘  (~2 tháng)
                                          ─────────
                                            70 bài
```

**Vì sao Chặng 3 nằm ở đó.** Bạn cần biết viết một chương trình *nói chuyện được với
hệ điều hành* trước khi cross-compile nó (Chặng 4), và cần hiểu `open`/`read`/`ioctl`
từ phía người dùng trước khi viết phía kernel đáp lại chúng (Chặng 10).

---

## 4. Chi tiết từng chặng

### CHẶNG 0 — Nhập môn *(3 bài)*

Mục tiêu: hiểu mình đang học cái gì và tại sao, trước khi gõ dòng lệnh đầu tiên.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| **1** | **Embedded Linux là gì và tại sao nó ở khắp mọi nơi** | Định nghĩa; phổ thiết bị từ vi điều khiển đến server; so sánh bare-metal / RTOS / Embedded Linux; khác biệt với Linux desktop; bốn mảnh ghép của một hệ thống |
| 2 | Toàn cảnh luồng khởi động | ROM code → bootloader → kernel → init → ứng dụng; vai trò từng giai đoạn; điều gì hỏng ở đâu thì biểu hiện thế nào |
| 3 | Môi trường học: WSL2 + QEMU | WSL2 là gì và không phải là gì; QEMU emulation vs virtualization; mô hình "máy build ↔ máy target"; giới hạn của môi trường ảo |

**Kết quả:** vẽ được sơ đồ khởi động của một hệ Linux nhúng bằng trí nhớ.

---

### CHẶNG 1 — Linux căn bản *(10 bài)*

Mục tiêu: dùng terminal thành thạo, không cần Google cho thao tác hằng ngày.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 4 | Shell và cấu trúc một câu lệnh | Shell là gì; `lệnh [tuỳ chọn] [đối số]`; short flag vs long flag; `man`, `--help`, `type`, `which`; exit code |
| 5 | Hệ thống file Linux (FHS) | "Mọi thứ là file"; ý nghĩa `/bin /etc /dev /proc /sys /lib /usr /var /tmp`; đường dẫn tuyệt đối vs tương đối; vì sao `/proc` và `/sys` cực quan trọng với embedded |
| 6 | Điều hướng, thao tác, xem file | `pwd cd ls tree cp mv rm mkdir ln`; `cat less head tail`; wildcard; hard link vs symlink |
| 7 | Trình soạn thảo trong terminal | `nano` để dùng ngay; `vim` ở mức sống sót và làm việc được — đây là kỹ năng bắt buộc khi SSH vào target |
| 8 | Người dùng, nhóm, quyền, `sudo` | `rwx`, số bát phân, `chmod chown umask`; setuid; vì sao root trên thiết bị nhúng là chuyện khác với trên desktop |
| 9 | Tiến trình, job, tín hiệu | `ps top htop`; PID/PPID; foreground/background, `&`, `jobs`, `fg`, `bg`; `kill` và ý nghĩa từng signal; cây tiến trình từ PID 1 |
| 10 | Pipe, redirect và triết lý Unix | `>` `>>` `<` `2>` `&>` `\|` `tee`; stdin/stdout/stderr là file descriptor 0/1/2; ghép công cụ nhỏ thành công cụ lớn |
| 11 | Tìm kiếm và xử lý văn bản | `find`, `grep` (kèm regex), `sed`, `awk`, `xargs`, `sort uniq wc cut`; bộ kỹ năng để lục soát source kernel |
| 12 | Quản lý gói | `apt` hoạt động ra sao; `dpkg`; repository và khoá GPG; gói binary vs source; `apt-get source`; xử lý phụ thuộc gãy |
| 13 | Bash script | Shebang, biến và quoting (`"$x"` vs `$x`), `if case for while`, hàm, `$1 $@ $?`, `set -euo pipefail`, here-doc, `trap`; viết script tự động hoá build — nền tảng cho init script ở Chặng 9 |

**Kết quả:** tự viết được script tìm mọi file `.c` chứa một chuỗi và thống kê kết quả.

---

### CHẶNG 2 — C và công cụ build *(5 bài)*

Mục tiêu: hiểu chuyện gì xảy ra giữa `file.c` và file thực thi.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 14 | C cho embedded — ôn tập trọng tâm | Con trỏ, struct, `volatile`, `static`, bit manipulation, `union`; kiểu dữ liệu cố định `uint32_t`; endianness; alignment |
| 15 | Bốn giai đoạn biên dịch | Preprocess → compile → assemble → link; xem output từng bước bằng `gcc -E -S -c`; vai trò của header và symbol |
| 16 | Make và Makefile | Target, prerequisite, recipe; biến, pattern rule, `.PHONY`; đọc hiểu Makefile của kernel |
| 17 | Thư viện tĩnh và động | `.a` vs `.so`; `ld`, `ldd`, `LD_LIBRARY_PATH`, rpath; vì sao static linking hay được chọn cho thiết bị nhúng |
| 18 | Giải phẫu file ELF | Cấu trúc ELF; `readelf objdump nm strings file size strip`; đọc section `.text .data .bss`; đo kích thước binary |

**Kết quả:** giải thích được vì sao một chương trình "hello world" tĩnh nặng 700 KB còn bản động chỉ 16 KB.

---

### CHẶNG 3 — Lập trình hệ thống Linux *(6 bài)*

Mục tiêu: viết được ứng dụng userspace tương tác với hệ điều hành — phần lớn công việc
hằng ngày của kỹ sư Embedded Linux nằm ở đây, không phải trong kernel.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 19 | Syscall và File I/O | Ranh giới user/kernel; syscall thực sự là gì và diễn ra thế nào; `open read write close lseek`; file descriptor; `errno` và `perror`; syscall thuần vs `stdio` có đệm; `strace` để nhìn xuyên chương trình; đọc/ghi thiết bị qua `/sys` và `/dev` |
| 20 | Tiến trình | `fork()` và ý nghĩa "trả về hai lần"; `exec*()`; `wait/waitpid` và exit status; zombie và orphan; biến môi trường; daemon hoá bằng double-fork; soi tiến trình qua `/proc/<pid>` |
| 21 | Tín hiệu | `signal` vs `sigaction` và vì sao luôn chọn cái sau; SIGINT/SIGTERM/SIGKILL/SIGCHLD/SIGUSR1; async-signal-safe nghĩa là gì và vì sao không được `printf` trong handler; `sigprocmask`, `signalfd`; tắt máy êm (graceful shutdown) cho thiết bị nhúng |
| 22 | Luồng và đồng bộ | `pthread_create/join`, cờ `-pthread`; race condition tự tay tạo ra rồi tự sửa; `pthread_mutex`, `pthread_cond`; deadlock; khi nào dùng thread, khi nào dùng process trên hệ tài nguyên hạn chế |
| 23 | Giao tiếp liên tiến trình (IPC) | `pipe()` và FIFO; POSIX shared memory (`shm_open` + `mmap`); message queue (`mq_*`); semaphore; bảng chọn cơ chế theo tình huống; `mmap` trên `/dev/mem` để chạm thẳng vào thanh ghi |
| 24 | Socket và I/O đa kênh | TCP vs UDP; client–server; byte order (`htons`, `htonl`); `select`, `poll`, `epoll`; non-blocking I/O; dự án nhỏ: daemon đọc dữ liệu và phục vụ qua mạng |

**Kết quả:** một daemon đa luồng, đọc dữ liệu, xử lý `SIGTERM` đúng cách, và đẩy kết quả qua TCP socket.

---

### CHẶNG 4 — Cross-compilation *(4 bài)*

Mục tiêu: build phần mềm cho kiến trúc khác với máy đang ngồi.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 25 | Vì sao phải cross-compile | Kiến trúc x86-64 vs ARM64; build native trên target chậm/không khả thi; khái niệm build / host / target |
| 26 | Giải phẫu một toolchain | Binutils, GCC, thư viện C (glibc / musl / uClibc), sysroot; đọc tên bộ ba `aarch64-linux-gnu-`; ABI và `gnueabihf` nghĩa là gì |
| 27 | Cross-compile chương trình đầu tiên | Build lại chính daemon ở Chặng 3 cho ARM64; `file` để xác minh; static vs dynamic; chạy thử bằng `qemu-aarch64` |
| 28 | Tự build toolchain với crosstool-NG | Vì sao đôi khi phải tự build; cấu hình, build, và kiểm thử toolchain của riêng mình |

**Kết quả:** có toolchain ARM64 hoạt động và hiểu từng thành phần trong đó.

---

### CHẶNG 5 — QEMU và luồng khởi động *(4 bài)*

Mục tiêu: biến QEMU thành "board" của bạn.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 29 | QEMU: nguyên lý hoạt động | TCG (dịch lệnh động) vs KVM; `qemu-system-*` vs `qemu-user`; vì sao emulation chậm hơn nhưng vẫn đủ dùng |
| 30 | Machine `virt` của ARM64 | Bản đồ bộ nhớ, UART PL011, GIC, virtio; dump device tree QEMU tự sinh bằng `-machine dumpdtb`; **những gì `virt` không có** (I2C, SPI) và các machine thay thế |
| 31 | Bộ tham số dòng lệnh QEMU | `-M -cpu -m -smp -kernel -initrd -append -nographic -serial -drive -netdev -s -S`; giải thích và thử từng cái |
| 32 | Boot kernel đầu tiên trong QEMU | Dùng kernel dựng sẵn + initramfs tối giản để ra được dấu nhắc shell; đọc hiểu log khởi động |

**Kết quả:** ra được shell trong máy ảo ARM64 và hiểu từng dòng log boot.

---

### CHẶNG 6 — Bootloader U-Boot *(4 bài)*

Mục tiêu: làm chủ giai đoạn trước khi kernel chạy.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 33 | Nhiệm vụ của bootloader | Khởi tạo DRAM, clock, console; nạp kernel + DTB vào RAM; bàn giao quyền điều khiển; SPL và boot nhiều tầng |
| 34 | Build U-Boot cho QEMU | Lấy source, chọn defconfig, cross-compile, nạp vào QEMU bằng `-bios`; áp patch lên source bằng `git am` / `patch -p1` |
| 35 | Dòng lệnh U-Boot | `help printenv setenv saveenv bdinfo md mw load bootm booti`; `bootcmd` và `bootargs`; tự viết boot script |
| 36 | Nạp kernel qua mạng và FIT image | TFTP boot — quy trình phát triển thực tế; cấu trúc FIT image; ký và xác thực |

**Kết quả:** tự cấu hình U-Boot để boot kernel của mình với tham số tuỳ chỉnh.

---

### CHẶNG 7 — Linux Kernel *(5 bài)*

Mục tiêu: build, cấu hình và hiểu kernel như một sản phẩm bạn kiểm soát.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 37 | Kiến trúc kernel | Monolithic + module; các phân hệ: scheduler, MM, VFS, network, driver model; ranh giới user/kernel space; syscall nhìn từ phía kernel (nối tiếp bài 19) |
| 38 | Source kernel và cách định hướng trong đó | Lấy source từ kernel.org; ý nghĩa `arch/ drivers/ kernel/ mm/ fs/ include/ Documentation/`; tra cứu hiệu quả trong 30 triệu dòng code |
| 39 | Kconfig và `menuconfig` | Cơ chế Kconfig; `defconfig`, `.config`, `olddefconfig`, `savedefconfig`; ý nghĩa `y` / `m` / `n` |
| 40 | Build kernel ARM64 và boot | `make ARCH=arm64 CROSS_COMPILE=... defconfig`, `make -j6 Image dtbs modules`; sản phẩm `Image`, `vmlinux`, `.dtb`; boot trong QEMU |
| 41 | Kernel cmdline, log, và tối ưu kích thước | `console=`, `root=`, `init=`, `loglevel=`; `dmesg` và các mức log; cắt bỏ tính năng để thu nhỏ kernel |

**Kết quả:** boot thành công kernel do chính bạn build, với cấu hình do chính bạn chọn.

---

### CHẶNG 8 — Device Tree *(4 bài)*

Mục tiêu: mô tả phần cứng cho kernel — kỹ năng phân biệt người mới và người làm nghề.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 42 | Vì sao Device Tree ra đời | Vấn đề "board file" trước 2011; tách mô tả phần cứng khỏi mã kernel; DT trên ARM, ACPI trên x86 |
| 43 | Cú pháp DTS | Node, property, `reg`, `compatible`, `status`, `#address-cells`, `#size-cells`, phandle, label; `include` và overlay |
| 44 | Binding và cơ chế khớp driver | Tài liệu binding trong `Documentation/devicetree/bindings`; `of_match_table`; kernel duyệt DT và gọi `probe()` ra sao |
| 45 | Thực hành với QEMU virt | Dump DTB → decompile → sửa → nạp lại; thêm node thiết bị ảo; kiểm chứng qua `/proc/device-tree` và `/sys` |

**Kết quả:** thêm được một node vào device tree và thấy kernel nhận diện nó.

---

### CHẶNG 9 — Root filesystem *(4 bài)*

Mục tiêu: tự tay dựng hệ thống file gốc từ con số không.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 46 | Rootfs gồm những gì | Cây thư mục tối thiểu; `/dev` và devtmpfs; `/proc`, `/sys`, `/tmp`; thư viện chia sẻ cần thiết; `Kernel panic: no init found` nghĩa là gì |
| 47 | BusyBox — dựng rootfs bằng tay | Triết lý "một binary, trăm lệnh"; cấu hình, cross-compile, `make install`; tạo thủ công `/etc/inittab`, `/etc/fstab`, script khởi động (dùng lại Bash ở bài 13) |
| 48 | initramfs và các loại rootfs | initramfs (cpio trong RAM) vs rootfs trên đĩa; `initrd` vs `initramfs`; hệ thống file cho flash: SquashFS, UBIFS, ext4, overlayfs read-only |
| 49 | init: từ `/init` đến systemd | Vai trò PID 1; BusyBox init + inittab; SysV; systemd unit, target, journal; viết service tự khởi chạy daemon của bạn; chọn init nào cho thiết bị nhúng |

**Kết quả:** một hệ Linux ARM64 hoàn chỉnh do bạn tự lắp, boot vào shell trong dưới 5 giây, tự chạy daemon viết ở Chặng 3.

---

### CHẶNG 10 — Kernel module và Driver *(9 bài)*

Mục tiêu: chặng nặng nhất và cũng là chặng quyết định giá trị nghề nghiệp.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 50 | Module đầu tiên | `module_init` / `module_exit`, `MODULE_LICENSE`; Makefile module; cross-compile `.ko`; `insmod lsmod rmmod modinfo dmesg` |
| 51 | Luật chơi trong kernel space | Không có libc, không có float, stack nhỏ; `printk` và mức log; `kmalloc/kfree`, `copy_to_user/copy_from_user`; hậu quả của một con trỏ sai |
| 52 | Character device driver | Major/minor number; `file_operations`; `open read write release`; đăng ký cdev; tạo device node; viết driver ram-disk hoàn chỉnh — và chương trình userspace gọi nó |
| 53 | Giao tiếp user ↔ kernel | `ioctl` và cách định nghĩa lệnh (`_IOR`, `_IOW`); sysfs attribute; procfs; debugfs; chọn cơ chế nào cho tình huống nào |
| 54 | Platform driver và Device Tree | Platform bus; `platform_driver`, `probe`/`remove`; đọc property từ DT bằng `of_*`; devres (`devm_*`) và vì sao nó cứu bạn khỏi rò rỉ bộ nhớ |
| 55 | Ngắt và xử lý trễ | Luồng xử lý IRQ; `request_irq`; top half / bottom half; softirq, tasklet, workqueue; threaded IRQ; sleep ở đâu được và ở đâu không |
| 56 | Truy cập phần cứng: MMIO và đồng bộ | MMIO, `ioremap`, `readl/writel`; barrier bộ nhớ; spinlock, mutex, atomic; dự án: driver LED/GPIO ảo có sysfs + ioctl + interrupt |
| 57 | Đọc datasheet và GPIO hiện đại | Cấu trúc một datasheet; register map, bit field, reset value; từ trang datasheet đến dòng `writel`; `gpiochip` trong kernel; **GPIO chardev API** (`/dev/gpiochipN`) và `libgpiod`; vì sao sysfs GPIO đã bị khai tử; thực hành bằng `gpio-sim` |
| 58 | Driver cho bus I2C và SPI | Mô hình bus – adapter – client trong kernel; `i2c_driver`, `struct i2c_client`, `i2c_smbus_*`; `spi_driver`, `spi_transfer`, `spidev`; khai báo thiết bị con trong Device Tree; thực hành bằng `i2c-stub`, machine `raspi3b`, và SPI loopback |

**Kết quả:** một driver character device hoàn chỉnh + một driver I2C client — đây là thứ đưa vào portfolio.

> **Ghi chú kỹ thuật.** Machine `virt` của QEMU **không có bus I2C hay SPI** — đã kiểm chứng:
> `-device ds1338` báo `No 'i2c-bus' bus found`. Bài 58 vì vậy thực hành theo hai đường:
> module giả lập của kernel (`i2c-stub`, `gpio-sim`, SPI loopback) để tập trung vào code driver,
> và machine `raspi3b` / `mcimx7d-sabre` khi cần một controller thật do QEMU mô phỏng.

---

### CHẶNG 11 — Build system *(4 bài)*

Mục tiêu: chuyển từ làm thủ công sang quy trình tái lập được.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 59 | Vì sao cần build system | Bài toán tái lập, phụ thuộc, và bảo trì lâu dài; điều bạn đã làm bằng tay ở Chặng 9 giờ được tự động hoá |
| 60 | Buildroot từ đầu đến cuối | Cấu trúc, `make menuconfig`, chọn toolchain/kernel/package; sản phẩm trong `output/`; boot image Buildroot trong QEMU |
| 61 | Buildroot nâng cao | Tự viết package `.mk` để đóng gói daemon của bạn; overlay rootfs; `defconfig` để lưu cấu hình; thư mục `patches/`; script post-build |
| 62 | Yocto — khái niệm và so sánh | Layer, recipe, bitbake, metadata; khi nào doanh nghiệp chọn Yocto; **lưu ý: máy 8 GB RAM sẽ rất chật vật với Yocto — bài này ở mức đọc hiểu, không build thật** |

**Kết quả:** một `defconfig` Buildroot dựng lại toàn bộ hệ thống của bạn bằng một lệnh.

---

### CHẶNG 12 — Debug, đo đạc, tối ưu *(4 bài)*

Mục tiêu: kỹ năng thực chiến — thứ được hỏi nhiều nhất khi phỏng vấn.

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 63 | Debug kernel bằng GDB | QEMU `-s -S`; `gdb-multiarch vmlinux`; breakpoint trong kernel; đặt breakpoint vào driver của bạn và chạy từng dòng |
| 64 | Đọc kernel panic và oops | Cấu trúc thông điệp oops; call trace; `addr2line`, `objdump`, `decode_stacktrace.sh`; từ địa chỉ lỗi truy ngược về dòng code; `git bisect` để truy vết hồi quy kernel |
| 65 | Ftrace và các công cụ theo vết | `printk` có hại thế nào; dynamic debug; ftrace, function graph tracer, `trace-cmd`; đo thời gian thực thi trong kernel |
| 66 | Đo và tối ưu thời gian boot | `printk.time`, `initcall_debug`, `bootgraph`; cắt giảm bootloader/kernel/init; mục tiêu boot dưới 1 giây |

**Kết quả:** định vị được nguyên nhân một kernel panic chỉ từ log.

---

### CHẶNG 13 — Thành phẩm và nghề nghiệp *(4 bài)*

| # | Bài học | Nội dung cốt lõi |
|---|---|---|
| 67 | Dự án tổng hợp | Ghép toàn bộ: U-Boot + kernel tuỳ biến + DT tuỳ biến + driver tự viết + rootfs Buildroot + daemon userspace; đóng gói thành sản phẩm có tài liệu |
| 68 | Bảo mật cơ bản | Secure boot, chain of trust; rootfs read-only + overlay; tối giản bề mặt tấn công; quản lý bí mật |
| 69 | Cập nhật OTA | A/B partition, RAUC, SWUpdate, Mender; chiến lược rollback; cập nhật an toàn khi mất điện |
| 70 | Chuyển sang hardware thật và chuẩn bị phỏng vấn | Chọn board đầu tiên (Pi Zero 2W, BeagleBone, board NXP); USB–UART, `usbipd-win` để passthrough vào WSL; bộ câu hỏi phỏng vấn Embedded Linux kèm hướng trả lời |

**Kết quả:** một dự án đầy đủ trên GitHub + khả năng trả lời câu hỏi phỏng vấn.

---

## 5. Các mốc kiểm chứng năng lực

Đây là cách tự đánh giá. Nếu làm được mốc, bạn đã thật sự nắm chặng đó.

| Mốc | Sau bài | Bạn phải làm được |
|---|---|---|
| **M1** | 13 | Viết script Bash tìm và thống kê nội dung trong cây thư mục, không cần tra cứu |
| **M2** | 18 | Giải thích được mọi thứ `readelf` in ra, và vì sao bản tĩnh nặng gấp 40 lần bản động |
| **M3** | 24 | Một daemon đa luồng: đọc dữ liệu, xử lý `SIGTERM` êm, phục vụ client qua TCP |
| **M4** | 27 | Cross-compile chính daemon đó cho ARM64 và chạy được bằng `qemu-aarch64` |
| **M5** | 32 | Boot vào shell trong QEMU ARM64 và giải thích được từng dòng log khởi động |
| **M6** | 40 | Boot kernel do chính bạn build và cấu hình |
| **M7** | 49 | Hệ thống Linux tự lắp từ BusyBox, boot dưới 5 giây, tự chạy daemon của bạn |
| **M8** | 56 | Driver character device có sysfs, ioctl và interrupt, chạy ổn định |
| **M9** | 58 | Driver I2C client hoàn chỉnh, `probe()` được gọi từ Device Tree |
| **M10** | 61 | Một lệnh `make` dựng lại toàn bộ hệ thống từ đầu |
| **M11** | 70 | Dự án hoàn chỉnh, có tài liệu, sẵn sàng trình bày khi phỏng vấn |

---

## 6. Nhịp học đề xuất

| Chặng | Số bài | Thời lượng | Ghi chú |
|---|---|---|---|
| 0 | 3 | 1 tuần | Đọc nhanh, nắm bức tranh lớn |
| 1 | 10 | 4–5 tuần | **Đừng vội.** Đây là nền móng của mọi thứ phía sau |
| 2 | 5 | 2–3 tuần | Nặng nếu bạn chưa vững C |
| 3 | 6 | 4 tuần | Nhiều code tay. Đừng chỉ đọc — phải gõ và chạy |
| 4 | 4 | 2 tuần | |
| 5 | 4 | 2 tuần | |
| 6 | 4 | 2–3 tuần | |
| 7 | 5 | 3–4 tuần | Build kernel lần đầu tốn thời gian chờ |
| 8 | 4 | 2–3 tuần | Khái niệm khó, cần đọc lại nhiều lần |
| 9 | 4 | 3 tuần | |
| 10 | 9 | 8–10 tuần | **Chặng nặng nhất.** Cứ chậm mà chắc |
| 11 | 4 | 3 tuần | |
| 12 | 4 | 3 tuần | |
| 13 | 4 | 3–4 tuần | Chủ yếu là làm dự án |

Tổng khoảng 44–50 tuần ở nhịp 8–12 giờ/tuần.

---

## 7. Điều kiện môi trường

Đã hoàn tất trước khi bắt đầu Bài 1:

- [x] WSL2 + Ubuntu 26.04, systemd đã bật
- [x] `.wslconfig`: 5 GB RAM (thấy 4.8 GB), 8 GB swap, 6 CPU
- [x] Thư mục làm việc `~/embedded` nằm trong hệ thống file WSL (**không** trong `/mnt/c`)
- [x] QEMU, cross-toolchain ARM64, `gdb-multiarch`, `dtc`, `u-boot-tools`
- [x] Thư viện build kernel: `bison flex libssl-dev libncurses-dev bc cpio rsync`

Cài thêm khi tới chặng tương ứng:

- Chặng 3: `manpages-dev manpages-posix-dev strace ltrace` — trang `man` mục 2 và 3 là tài liệu chính khi lập trình hệ thống
- Chặng 10: `i2c-tools libgpiod-dev gpiod`

**Giới hạn cần biết:** RAM 7.73 GB đủ cho Buildroot và build kernel với `-j6`, nhưng chật với Yocto. Chặng 11 vì vậy tập trung vào Buildroot.

---

## 8. Tài liệu tham khảo chính thống

| Nguồn | Dùng khi nào |
|---|---|
| [Bootlin Training Materials](https://bootlin.com/docs/) | Slide đào tạo miễn phí, chất lượng cao nhất trong ngành |
| [The Linux Programming Interface](https://man7.org/tlpi/) | Kinh điển về lập trình hệ thống — tài liệu nền cho Chặng 3 |
| [man7.org — man pages](https://man7.org/linux/man-pages/) | Tra cứu syscall và hàm thư viện |
| [Kernel documentation](https://docs.kernel.org/) | Tra cứu API và cơ chế kernel |
| [Linux Device Drivers, 3rd ed.](https://lwn.net/Kernel/LDD3/) | Kinh điển về driver (cũ nhưng khái niệm còn nguyên giá trị) |
| [devicetree.org specification](https://www.devicetree.org/specifications/) | Chuẩn Device Tree |
| [libgpiod](https://libgpiod.readthedocs.io/) | GPIO chardev API hiện đại (bài 57) |
| [Buildroot manual](https://buildroot.org/downloads/manual/manual.html) | Tài liệu Buildroot |
| [QEMU documentation](https://www.qemu.org/docs/master/) | Tham số và machine model |
| [LWN.net](https://lwn.net/) | Theo dõi thay đổi trong kernel |

---

## 9. Tình trạng nội dung

| Bài | Tiêu đề | Trạng thái |
|---|---|---|
| 1 | Embedded Linux là gì và tại sao nó ở khắp mọi nơi | ✅ Đã có |
| 2 | Toàn cảnh luồng khởi động | ✅ Đã có |
| 3 | Môi trường học: WSL2 và QEMU | ✅ Đã có |
| 4 | Shell và cấu trúc một câu lệnh | ✅ Đã có |
| 5 | Hệ thống file Linux (FHS) | ✅ Đã có |
| 6 | Điều hướng, thao tác và xem file | ✅ Đã có |
| 7 | Soạn thảo trong terminal: nano và vim | ✅ Đã có |
| 8 | Người dùng, nhóm, quyền và sudo | ✅ Đã có |
| 9 | Tiến trình, job và tín hiệu | ✅ Đã có |
| 10 | Pipe, redirect và triết lý Unix | ✅ Đã có |
| 11 | Tìm kiếm và xử lý văn bản | ✅ Đã có |
| 12 | Quản lý gói | ✅ Đã có |
| 13 | Bash script | ✅ Đã có |
| 14 | C cho embedded — ôn tập trọng tâm | ✅ Đã có |
| 15 | Bốn giai đoạn biên dịch | ✅ Đã có |
| 16 | Make và Makefile | ✅ Đã có |
| 17 | Thư viện tĩnh và động | ✅ Đã có |
| 18 | Giải phẫu file ELF | ✅ Đã có |
| 19 | Syscall và File I/O | ✅ Đã có |
| 20 | Tiến trình: fork, exec, wait | ✅ Đã có |
| 21 | Tín hiệu và tắt máy êm | ✅ Đã có |
| 22 | Luồng và đồng bộ với pthread | ✅ Đã có |
| 23 | Giao tiếp liên tiến trình (IPC) | ✅ Đã có |
| 24 | Socket và I/O đa kênh | ✅ Đã có |
| 25 | Vì sao phải cross-compile | ✅ Đã có |
| 26 | Giải phẫu một toolchain | ✅ Đã có |
| 27 | Cross-compile chương trình đầu tiên cho ARM64 | ✅ Đã có |
| 28 | Tự build toolchain với crosstool-NG | ✅ Đã có |
| 29 | QEMU: nguyên lý hoạt động | ✅ Đã có |
| 30 | Machine `virt` của ARM64 | ✅ Đã có |
| 31 | Bộ tham số dòng lệnh QEMU | ✅ Đã có |
| 32 | Boot kernel đầu tiên trong QEMU | ✅ Đã có |
| 33 | Nhiệm vụ của bootloader | ✅ Đã có |
| 34 | Build U-Boot cho QEMU | ✅ Đã có |
| 35 | Dòng lệnh U-Boot | ✅ Đã có |
| 36 | Nạp kernel qua mạng và FIT image | ✅ Đã có |
| 37 → 70 | | ⬜ Sẽ viết dần theo yêu cầu |

**Chặng 0, Chặng 1, Chặng 2, Chặng 3, Chặng 4, Chặng 5 và Chặng 6 đã hoàn tất (36 / 70 bài).** Bài kế tiếp sẽ viết: Bài 37 — *Kiến trúc kernel*.

Mỗi bài được viết khi bạn học tới. Cách dùng: học xong bài hiện tại, làm hết phần thực hành, rồi yêu cầu viết bài tiếp theo.

### 9.1 Bộ bài tập

Mỗi bài học có một bộ bài tập riêng, đánh số song song: `Bài N` ↔ `bt-NN`, mở ở `#/bt-NN`.
Bài tập **không phải quiz thứ hai**: nó bắt bạn tạo ra một câu trả lời rồi tự đối chiếu với
tiêu chí đo được. Tiến độ bài tập tách hẳn khỏi tiến độ bài học — vòng tròn trên thanh trên
cùng vẫn chỉ đếm 70 bài.

| Bộ | Đi kèm | Số câu | Trạng thái |
|---|---|---|---|
| `bt-01` | Bài 1 | 25 | ✅ Đã có |
| `bt-02` | Bài 2 | 28 | ✅ Đã có |
| `bt-03` | Bài 3 | 28 | ✅ Đã có |
| `bt-04` | Bài 4 | 28 | ✅ Đã có |
| `bt-05` | Bài 5 | 28 | ✅ Đã có |
| `bt-06` | Bài 6 | 28 | ✅ Đã có |
| `bt-07` | Bài 7 | 28 | ✅ Đã có |
| `bt-08` | Bài 8 | 28 | ✅ Đã có |
| `bt-09` | Bài 9 | 28 | ✅ Đã có |
| `bt-10` | Bài 10 | 28 | ✅ Đã có |
| `bt-11` | Bài 11 | 28 | ✅ Đã có |
| `bt-12` | Bài 12 | 28 | ✅ Đã có |
| `bt-13` | Bài 13 | 28 | ✅ Đã có |
| `bt-14` → `bt-70` | | 28 | ⬜ Viết khi được yêu cầu |

`bt-01` có 25 câu thay vì 28 vì phần **D — Ôn xen kẽ** hỏi về các bài *trước*, mà Bài 1
không có bài nào trước nó. Từ `bt-02` phần D luôn có 3 câu và bộ nào cũng đủ 28.

---

## 10. Nhật ký thay đổi

**2026-08-01 — bản 2.** Rà soát lại theo mô tả công việc thực tế:

- **Thêm Chặng 3 — Lập trình hệ thống Linux (6 bài).** Bản 1 nhảy thẳng từ C cơ bản sang cross-compile rồi sang driver, bỏ trống toàn bộ mảng POSIX API, tiến trình, luồng, IPC và socket. Đây là lỗ hổng lớn nhất của bản 1: bài 53 dạy `ioctl` phía kernel trong khi người học chưa từng viết phía userspace gọi nó.
- **Tách Bash thành bài riêng (bài 13).** Bản 1 nhét Bash chung nửa bài với `apt` — quá mỏng cho kỹ năng dùng hằng ngày và cho init script ở Chặng 9.
- **Thêm 2 bài vào chặng Driver:** đọc datasheet + GPIO chardev/libgpiod (bài 57), và driver bus I2C/SPI (bài 58). Kèm cách thực hành khi QEMU `virt` không có các bus này.
- **Sửa lỗi đếm.** Bản 1 ghi "52 bài" trong khi đánh số chạy tới 60 — con số sót lại từ bản nháp. Đồng thời đồng bộ lại đánh số giữa file này và `js/registry.js`.
- **Không thêm bài Git** theo yêu cầu — giả định người học đã biết. Các thao tác patch (`git am`, `patch -p1`) và `git bisect` vẫn xuất hiện tại chỗ cần dùng: bài 34, 61, 64.

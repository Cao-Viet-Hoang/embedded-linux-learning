/* Bài 60 — Buildroot từ đầu đến cuối
   Chặng 11 — Build system
   Cấu trúc cây Buildroot, make menuconfig, chọn toolchain/kernel/package; sản phẩm trong output/;
   boot ảnh Buildroot trong QEMU.
   Thực hành trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1), 2026-10-01,
   với Buildroot 2026.02.3 (bản LTS hiện hành, phát hành 2026-06-16).
   - Bước 1: kiểm tra công cụ (thiếu rsync; cài thêm libncurses-dev), tải tarball 6 059 504 B + .sign,
     gpg --verify (Good signature, Arnout Vandecappelle, 18C7 DF28 … 9CB0 E540) + sha256sum -c; cây nguồn
     89M, 14 911 file, 2 786 package, 308 defconfig; readme.txt của board/qemu/aarch64-virt.
   - Bước 2: make qemu_aarch64_virt_defconfig (19 dòng → .config 5 270 dòng, 323 =y); vòng menuconfig
     (màn hình chụp qua pty, đã bỏ khung ncurses).
   - Bước 3: lỗi "Your PATH contains spaces" (26 thư mục Windows) → PATH sạch; make source (48 package,
     1,2 GB, 56 lần chạy lại vì proxy 401); make 24m41s real / 244m47s user, 390 dòng >>>, 62 package.
   - Bước 4: output/ (build 13G, host 1,2G, target 4,4M, images 21M), stamp của busybox/gcc/linux,
     gcc 14.3.0 + QEMU 10.2.0 tự build, target thuộc user thường, Image 13 236 736 B, rootfs 60 MiB thưa.
   - Bước 5: start-qemu.sh --serial-only → login sau ~1,4 s; trong máy ảo file thuộc root (fakeroot),
     8 script init.d; --use-system-qemu (4.2.1) cũng boot (~2,8 s); bảng so sánh với Bài 59.
   - Bước 6: make không đổi gì 6 s; đổi hostname 6 s; bật dtc 7,4 s; tắt dtc → file vẫn trong ảnh
     (debugfs); make clean all 25m26s → sạch. Output của bước 4–5 chụp từ lần build lại này.
   Máy B dùng proxy công ty: buildroot.org/sources.buildroot.net/github trả 401 ngẫu nhiên. */

Lesson.register({
  id: 'bai-60',
  title: 'Buildroot từ đầu đến cuối',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 59 bạn viết một <code>Makefile</code> 47 dòng để dựng <b>một</b> package — BusyBox — thành một rootfs ' +
    'tái lập được. Nó chạy tốt, nhưng thử đếm những gì nó <i>không</i> làm: trình biên dịch vẫn là gcc 9.4 của ' +
    'Ubuntu (lỗ rò thứ năm), kernel vẫn được build bằng tay ở <code>~/bai38</code>, thư viện C được chép từ ' +
    'toolchain của máy, và muốn thêm một chương trình thứ hai thì bạn phải tự viết thêm bước tải, giải nén, ' +
    'cấu hình, build, cài đặt cho nó. Một sản phẩm thật có vài chục đến vài trăm package như thế.<br><br>' +
    '<b>Buildroot</b> là cái Makefile đó được viết sẵn cho gần 3 000 package, bởi một cộng đồng đã làm việc này từ ' +
    '2001. Bài này dùng nó từ đầu đến cuối: tải và kiểm tra Buildroot, đọc cây nguồn của nó, chọn một ' +
    '<code>defconfig</code> cho đúng máy <code>virt</code> mà bạn đã dùng từ Chặng 05, xem <code>menuconfig</code> ' +
    'chia các lựa chọn ra sao, rồi gõ <b>một</b> lệnh <code>make</code>. Lệnh đó tự build một toolchain ARM64 hoàn ' +
    'chỉnh, kernel, BusyBox, rootfs và cả QEMU dùng để chạy nó. Bạn sẽ đo nó tốn bao lâu và bao nhiêu dung lượng, ' +
    'tìm trong <code>output/</code> đúng những stamp bạn tự đặt tên ở Bài 59, rồi boot ảnh đó và so với rootfs ' +
    '1 156 KiB của bài trước.',

  goals: [
    'Tải Buildroot, kiểm tra sha256 với file chữ ký của bản phát hành, và giải thích vai trò của từng thư mục cấp cao nhất trong cây nguồn',
    'Chọn và đọc một <code>defconfig</code> có sẵn, dùng <code>make menuconfig</code> để tìm nơi chọn kiến trúc, toolchain, kernel và package',
    'Chạy một lần build đầy đủ, đọc dòng tiến trình <code>&gt;&gt;&gt;</code> và đo xem mỗi nhóm bước (toolchain, kernel, rootfs) tốn bao nhiêu thời gian',
    'Phân biệt năm thư mục trong <code>output/</code> — <code>build</code>, <code>host</code>, <code>staging</code>, <code>target</code>, <code>images</code> — và chuỗi stamp mà mỗi package đi qua',
    'Boot ảnh Buildroot trong QEMU và đối chiếu nó với rootfs tự dựng ở Chặng 09 và Bài 59',
    'Dự đoán khi nào một thay đổi cấu hình chỉ cần <code>make</code> lại, và khi nào phải build lại từ đầu'
  ],

  blocks: [
    /* ============================================================
       LÝ THUYẾT 1 — BUILDROOT LÀ GÌ
       ============================================================ */
    { t: 'h2', x: 'Buildroot là gì: Makefile của Bài 59, viết sẵn cho cả hệ thống' },

    { t: 'p', x:
      'Hãy nhớ lại đồ thị phụ thuộc của Bài 59: tarball → giải nén → <code>.config</code> → build → rootfs → ' +
      '<code>cpio</code>. Mỗi nút có một stamp, mỗi stamp chỉ được tạo khi bước của nó thành công. Buildroot là ' +
      'đúng ý tưởng đó, nhân lên theo hai chiều. Theo chiều <b>rộng</b>: thay vì một package, nó có công thức cho ' +
      'gần 3 000 package — từ <code>zlib</code> tới <code>python3</code>, <code>openssh</code>, <code>qt6</code>. ' +
      'Theo chiều <b>sâu</b>: thay vì nhận một trình biên dịch có sẵn, nó tự build trình biên dịch trước, rồi dùng ' +
      'chính trình biên dịch đó cho mọi thứ còn lại.' },

    { t: 'p', x:
      'Nói ngắn gọn, Buildroot là <b>một bộ Makefile cộng với Kconfig</b>. Không có daemon, không có cơ sở dữ ' +
      'liệu, không có ngôn ngữ riêng: mọi công thức package là một file <code>.mk</code> mà <code>make</code> đọc ' +
      'trực tiếp, và mọi lựa chọn là một symbol <code>BR2_…</code> trong file <code>.config</code>, đúng định ' +
      'dạng <code>.config</code> của kernel mà Bài 39 đã mổ xẻ. Bạn đưa vào một cấu hình, nó trả ra một bộ ảnh ' +
      'sẵn sàng để nạp vào thiết bị.' },

    { t: 'fig', cap: 'Một lần make của Buildroot đi theo thứ tự này: công cụ cho máy build, rồi toolchain chéo, rồi mọi thứ chạy trên thiết bị được build bằng toolchain đó, cuối cùng đóng thành ảnh. Phần giữa — toolchain — là cái Makefile của Bài 59 còn thiếu, và là phần tốn thời gian nhất ở lần build đầu.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Luồng một lần build Buildroot: cấu hình, công cụ host, toolchain, package của thiết bị, ảnh">' +
        '<rect class="d-box-p" x="20" y="30" width="150" height="70" rx="8"/>' +
        '<text class="d-t" x="95" y="58" text-anchor="middle">.config</text>' +
        '<text class="d-ts" x="95" y="78" text-anchor="middle">từ một defconfig</text>' +
        '<text class="d-tm" x="95" y="92" text-anchor="middle">BR2_aarch64=y …</text>' +
        '<path class="d-line" d="M170 65 H202"/><path class="d-arrow" d="M210 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="210" y="30" width="150" height="70" rx="8"/>' +
        '<text class="d-t" x="285" y="56" text-anchor="middle">công cụ host</text>' +
        '<text class="d-ts" x="285" y="76" text-anchor="middle">chạy trên máy build</text>' +
        '<text class="d-tm" x="285" y="92" text-anchor="middle">m4 bison tar …</text>' +
        '<path class="d-line" d="M360 65 H392"/><path class="d-arrow" d="M400 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-w" x="400" y="30" width="150" height="70" rx="8"/>' +
        '<text class="d-t" x="475" y="56" text-anchor="middle">toolchain chéo</text>' +
        '<text class="d-ts" x="475" y="76" text-anchor="middle">binutils · gcc · glibc</text>' +
        '<text class="d-tm" x="475" y="92" text-anchor="middle">aarch64-buildroot-…</text>' +
        '<path class="d-line" d="M550 65 H582"/><path class="d-arrow" d="M590 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="590" y="30" width="110" height="70" rx="8"/>' +
        '<text class="d-t" x="645" y="58" text-anchor="middle">package</text>' +
        '<text class="d-ts" x="645" y="78" text-anchor="middle">của thiết bị</text>' +
        '<text class="d-tm" x="645" y="92" text-anchor="middle">linux busybox</text>' +
        '<path class="d-line" d="M645 100 V162"/><path class="d-arrow" d="M645 170 l-5 -8 h10 z"/>' +
        '<rect class="d-box-g" x="470" y="170" width="230" height="90" rx="8"/>' +
        '<text class="d-t" x="585" y="196" text-anchor="middle">output/images/</text>' +
        '<text class="d-tm" x="585" y="218" text-anchor="middle">Image</text>' +
        '<text class="d-tm" x="585" y="234" text-anchor="middle">rootfs.ext4</text>' +
        '<text class="d-tm" x="585" y="250" text-anchor="middle">start-qemu.sh</text>' +
        '<rect class="d-box" x="20" y="170" width="400" height="90" rx="8"/>' +
        '<text class="d-t" x="220" y="196" text-anchor="middle">Bài 59 tự làm phần nào?</text>' +
        '<text class="d-ts" x="220" y="218" text-anchor="middle">chỉ ô cuối: một package (BusyBox) + đóng gói rootfs</text>' +
        '<text class="d-ts" x="220" y="236" text-anchor="middle">toolchain mượn của Ubuntu, kernel build tay ở ~/bai38</text>' +
        '<text class="d-ts" x="220" y="254" text-anchor="middle">Buildroot làm cả năm ô, từ một file cấu hình</text>' +
        '</svg>' },

    { t: 'p', x:
      'Bảng dưới đặt hai hệ thống cạnh nhau. Mỗi dòng bên phải là một thứ Bài 59 đã làm tay hoặc bỏ qua:' },

    { t: 'table',
      head: ['Việc', 'Makefile 47 dòng (Bài 59)', 'Buildroot'],
      rows: [
        ['Tải nguồn', 'Không tự tải — bạn chép tarball vào <code>dl/</code>', 'Tự tải vào <code>dl/</code>, thử site gốc rồi tới mirror dự phòng <code>sources.buildroot.net</code>'],
        ['Kiểm tra nguồn', '<code>sha256sum -c</code> một file', 'Mỗi package có file <code>.hash</code>; sai hash là dừng'],
        ['Toolchain', 'gcc 9.4 của Ubuntu', 'Tự build binutils + gcc + thư viện C, hoặc dùng một toolchain ngoài bạn chỉ định'],
        ['Kernel', 'Build tay ở <code>~/bai38</code>', 'Một package như mọi package khác, phiên bản và <code>.config</code> nằm trong cấu hình'],
        ['Số package', '1', 'Gần 3 000, mỗi cái một file <code>.mk</code> + <code>Config.in</code>'],
        ['Stamp', '<code>.stamp_extracted</code>, <code>.stamp_rootfs</code>', 'Mười mấy loại stamp cho mỗi package — phần lý thuyết thứ ba liệt kê đủ'],
        ['Rootfs', 'Dựng lại từ đầu mỗi lần, đóng <code>cpio</code>', 'Dựng trong <code>output/target</code>, đóng thành ext4, cpio, squashfs, ubifs… tuỳ chọn'],
        ['Tái lập', '<code>SOURCE_DATE_EPOCH</code>, <code>TZ=UTC</code>, cờ cpio — tự bịt', 'Có tuỳ chọn <code>BR2_REPRODUCIBLE</code>, mặc định tắt']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao học Buildroot trước Yocto',
      x: 'Buildroot và Yocto giải cùng bài toán. Buildroot nhỏ hơn hẳn: bạn đọc được toàn bộ cơ chế của nó bằng ' +
         '<code>make</code> và Kconfig — hai thứ bạn đã dùng từ Bài 16 và Bài 39. Nó sinh ra <b>một bộ ảnh</b> ' +
         'cố định, không có trình quản lý gói trên thiết bị, và lần build đầu thường ngắn hơn Yocto nhiều lần. ' +
         'Đổi lại, nó không cố đoán thay đổi nào cần build lại cái gì — điều phần lý thuyết cuối và bước 6 của ' +
         'thực hành sẽ cho bạn thấy tận mắt. Bài 62 so sánh hai hệ thống một cách đầy đủ.' },

    /* ============================================================
       LÝ THUYẾT 2 — CÂY NGUỒN
       ============================================================ */
    { t: 'h2', x: 'Cây nguồn Buildroot: mỗi thư mục một việc' },

    { t: 'p', x:
      'Giải nén tarball Buildroot 2026.02.3 ra một cây <b>89 MB</b>, <b>14 911</b> file — và chưa có dòng mã nguồn ' +
      'nào của gcc, kernel hay BusyBox trong đó. Buildroot chỉ chứa <b>công thức</b>; nguyên liệu được tải về lúc ' +
      'build. Bước 1 của phần thực hành đếm lại những con số này trên máy bạn. Bảng sau liệt kê các thư mục cấp ' +
      'cao nhất theo đúng việc chúng làm:' },

    { t: 'table',
      head: ['Thư mục', 'Số file', 'Chứa gì'],
      rows: [
        ['<code>package/</code>', '11 892', 'Công thức của gần 3 000 package: mỗi thư mục con có <code>Config.in</code> (lựa chọn trong menu), <code>&lt;tên&gt;.mk</code> (cách tải và build), <code>&lt;tên&gt;.hash</code> (checksum), đôi khi thêm file <code>.patch</code>'],
        ['<code>board/</code>', '1 111', 'File riêng cho từng bo mạch (94 thư mục): cấu hình kernel, script sau build, hướng dẫn chạy. Có <code>board/qemu/aarch64-virt/</code> cho máy <code>virt</code>'],
        ['<code>configs/</code>', '308', 'Các <code>defconfig</code> có sẵn — mỗi file là cấu hình tối thiểu cho một bo mạch, ví dụ <code>qemu_aarch64_virt_defconfig</code>'],
        ['<code>support/</code>', '1 050', 'Phần máy móc dùng chung: Kconfig, script kiểm tra máy build, hạ tầng tải về, kiểm tra hash'],
        ['<code>boot/</code>', '202', 'Bootloader: U-Boot (Chặng 06), GRUB, ARM Trusted Firmware, OpenSBI…'],
        ['<code>toolchain/</code>', '36', 'Cách tự build toolchain hoặc dùng toolchain ngoài'],
        ['<code>linux/</code>', '9', 'Package <code>linux</code>: cách tải, cấu hình và build kernel'],
        ['<code>fs/</code>', '39', 'Cách đóng rootfs thành ảnh: <code>ext2</code> (cả ext4), <code>cpio</code>, <code>squashfs</code>, <code>ubifs</code>, <code>erofs</code>… — mọi định dạng Bài 48 đã đo'],
        ['<code>system/</code>', '23', 'Bộ khung rootfs (<code>skeleton</code>) và bảng thiết bị'],
        ['<code>docs/</code>', '147', 'Tài liệu chính thức (định dạng asciidoc) — đáng đọc khi nghi ngờ'],
        ['<code>utils/</code>', '52', 'Công cụ tiện ích: <code>utils/config</code> sửa <code>.config</code> từ dòng lệnh, <code>utils/diffconfig</code>, <code>utils/check-package</code>…'],
        ['<code>Makefile</code>, <code>Config.in</code>', '—', 'Điểm vào: <code>make</code> bắt đầu từ đây, menu gốc của <code>menuconfig</code> bắt đầu từ đây']
      ] },

    { t: 'p', x:
      'Thư mục <code>package/</code> chiếm <b>63 MB</b> trong 89 MB, vì nó chứa phần lớn công thức. Mở một công ' +
      'thức ra để thấy một package trông như thế nào trong Buildroot. Đây là phần đầu của ' +
      '<code>package/busybox/busybox.mk</code>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'package/busybox/busybox.mk (dòng 1–12)', code:
      '################################################################################\n' +
      '#\n' +
      '# busybox\n' +
      '#\n' +
      '################################################################################\n' +
      '\n' +
      'BUSYBOX_VERSION = 1.37.0\n' +
      'BUSYBOX_SITE = https://www.busybox.net/downloads\n' +
      'BUSYBOX_SOURCE = busybox-$(BUSYBOX_VERSION).tar.bz2\n' +
      'BUSYBOX_LICENSE = GPL-2.0, bzip2-1.0.4\n' +
      'BUSYBOX_LICENSE_FILES = LICENSE archival/libarchive/bz/LICENSE\n' +
      'BUSYBOX_CPE_ID_VENDOR = busybox' },

    { t: 'p', x:
      'Ba dòng <code>VERSION</code>, <code>SITE</code>, <code>SOURCE</code> chính là ba thông tin mà bạn tự gõ vào ' +
      'lệnh <code>curl</code> ở Bài 47. Buildroot ghép chúng thành URL ' +
      '<code>https://www.busybox.net/downloads/busybox-1.37.0.tar.bz2</code>, tải về, rồi so với checksum trong ' +
      '<code>package/busybox/busybox.hash</code>. Hai dòng <code>LICENSE</code> phục vụ một việc mà sản phẩm thương ' +
      'mại bắt buộc phải làm: liệt kê giấy phép của mọi thứ nằm trong firmware. Để ý phiên bản: Buildroot ' +
      '2026.02.3 dùng BusyBox <b>1.37.0</b>, không phải 1.38.0 bạn build ở Bài 47 — mỗi bản Buildroot chốt cứng ' +
      'phiên bản của từng package, và đó chính là một phần của tính tái lập.' },

    { t: 'cal', kind: 'tip', title: 'Đọc một công thức như đọc một Makefile',
      x: 'Mọi biến trong file <code>.mk</code> có tiền tố là tên package viết hoa: <code>BUSYBOX_</code>, ' +
         '<code>LINUX_</code>, <code>GCC_FINAL_</code>. Muốn biết package <code>X</code> lấy nguồn từ đâu, chỉ cần ' +
         '<code>grep -n \'^X_SITE\' package/x/x.mk</code>. Bài 61 sẽ viết một file <code>.mk</code> từ đầu cho ' +
         'daemon của bạn; bài này chỉ cần bạn đọc được nó.' },

    /* ============================================================
       LÝ THUYẾT 3 — CẤU HÌNH: DEFCONFIG VÀ MENUCONFIG
       ============================================================ */
    { t: 'h2', x: 'Cấu hình: defconfig, .config và bốn quyết định lớn' },

    { t: 'p', x:
      'Buildroot dùng lại nguyên bộ Kconfig của kernel, nên mọi khái niệm của Bài 39 áp dụng y hệt: ' +
      '<code>.config</code> là cấu hình <b>đầy đủ</b> — mọi symbol, kể cả những symbol nhận giá trị mặc định; ' +
      '<code>defconfig</code> là cấu hình <b>tối thiểu</b> — chỉ những dòng khác mặc định. Chỉ có tiền tố đổi: ' +
      'kernel viết <code>CONFIG_…</code>, Buildroot viết <code>BR2_…</code>. Một defconfig có thể ngắn đến kinh ' +
      'ngạc. Đây là toàn bộ <code>configs/qemu_aarch64_virt_defconfig</code> — <b>19</b> dòng mô tả một hệ thống ' +
      'Linux ARM64 hoàn chỉnh:' },

    { t: 'code', where: 'out', nocopy: true, name: 'configs/qemu_aarch64_virt_defconfig', code:
      'BR2_aarch64=y\n' +
      'BR2_PACKAGE_HOST_LINUX_HEADERS_CUSTOM_6_18=y\n' +
      'BR2_GLOBAL_PATCH_DIR="board/qemu/patches"\n' +
      'BR2_DOWNLOAD_FORCE_CHECK_HASHES=y\n' +
      'BR2_SYSTEM_DHCP="eth0"\n' +
      'BR2_ROOTFS_POST_IMAGE_SCRIPT="board/qemu/post-image.sh"\n' +
      'BR2_ROOTFS_POST_SCRIPT_ARGS="$(BR2_DEFCONFIG)"\n' +
      'BR2_LINUX_KERNEL=y\n' +
      'BR2_LINUX_KERNEL_CUSTOM_VERSION=y\n' +
      'BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"\n' +
      'BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y\n' +
      'BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"\n' +
      'BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL=y\n' +
      'BR2_TARGET_ROOTFS_EXT2=y\n' +
      'BR2_TARGET_ROOTFS_EXT2_4=y\n' +
      '# BR2_TARGET_ROOTFS_TAR is not set\n' +
      'BR2_PACKAGE_HOST_QEMU=y\n' +
      'BR2_PACKAGE_HOST_QEMU_SYSTEM_MODE=y' },

    { t: 'p', x:
      'Đọc nó theo nhóm, mỗi nhóm trả lời một câu hỏi bạn đã tự trả lời bằng tay ở các chặng trước:' },

    { t: 'table',
      head: ['Dòng', 'Quyết định', 'Bạn đã làm tay ở'],
      rows: [
        ['<code>BR2_aarch64=y</code>', 'Kiến trúc đích. Mọi thứ khác — triplet của toolchain, <code>ARCH</code> cho kernel — suy ra từ dòng này', 'Bài 25–27: chọn <code>aarch64-linux-gnu-</code>'],
        ['<code>…LINUX_HEADERS_CUSTOM_6_18</code>', 'Header kernel mà thư viện C được build dựa vào — phải không mới hơn kernel sẽ chạy', 'Bài 26: header là một phần của toolchain'],
        ['<code>BR2_LINUX_KERNEL…</code> (6 dòng)', 'Build kernel 6.18.7, cấu hình lấy từ một file trong <code>board/</code>', 'Bài 38–40: tải, <code>defconfig</code>, build kernel'],
        ['<code>BR2_TARGET_ROOTFS_EXT2_4</code>', 'Đóng rootfs thành ảnh ext4', 'Bài 46: <code>mkfs.ext4 -d</code>'],
        ['<code>BR2_ROOTFS_POST_IMAGE_SCRIPT</code>', 'Script chạy sau khi ảnh xong — ở đây sinh ra <code>start-qemu.sh</code>', 'Bài 46: <code>run.sh</code> tự viết'],
        ['<code>BR2_PACKAGE_HOST_QEMU…</code>', 'Build luôn cả QEMU cho máy build, để chạy được ảnh mà không cần QEMU của Ubuntu', 'Bài 3: cài <code>qemu-system-arm</code> bằng <code>apt</code>'],
        ['<code>BR2_DOWNLOAD_FORCE_CHECK_HASHES</code>', 'Từ chối mọi file tải về không có hash khai sẵn', 'Bài 38, 47: <code>sha256sum -c</code>']
      ] },

    { t: 'p', x:
      'Những gì <b>không</b> có trong 19 dòng cũng quan trọng không kém: không có dòng nào nói về toolchain, ' +
      'BusyBox, thư viện C hay init. Tất cả nhận giá trị mặc định. Sau <code>make qemu_aarch64_virt_defconfig</code>, ' +
      'file <code>.config</code> được bung ra thành <b>5 270</b> dòng với <b>323</b> symbol <code>=y</code>, và trong ' +
      'đó có những quyết định mặc định sau:' },

    { t: 'code', where: 'out', nocopy: true, name: 'trích từ .config sau make qemu_aarch64_virt_defconfig', code:
      'BR2_TOOLCHAIN_BUILDROOT=y\n' +
      'BR2_TOOLCHAIN_BUILDROOT_GLIBC=y\n' +
      'BR2_BINUTILS_VERSION="2.44"\n' +
      'BR2_GCC_VERSION="14.3.0"\n' +
      'BR2_INIT_BUSYBOX=y\n' +
      'BR2_ROOTFS_DEVICE_CREATION_DYNAMIC_DEVTMPFS=y\n' +
      'BR2_SYSTEM_BIN_SH_BUSYBOX=y\n' +
      'BR2_PACKAGE_BUSYBOX=y\n' +
      'BR2_TARGET_GENERIC_HOSTNAME="buildroot"\n' +
      'BR2_TARGET_GENERIC_ISSUE="Welcome to Buildroot"' },

    { t: 'p', x:
      'Bốn dòng đầu nói Buildroot sẽ <b>tự build</b> toolchain — binutils 2.44, gcc 14.3.0, glibc — thay vì dùng gcc ' +
      'của Ubuntu. Đó là cách nó bịt lỗ rò thứ năm của Bài 59: trình biên dịch giờ là một <i>sản phẩm</i> của ' +
      'chính lần build, với phiên bản ghi trong cấu hình, không phải một thứ tình cờ có sẵn trên máy. Các dòng còn ' +
      'lại là đúng những gì bạn dựng tay ở Chặng 09: BusyBox làm <code>init</code> (Bài 47, 49), ' +
      '<code>/bin/sh</code> là BusyBox, <code>/dev</code> do devtmpfs tạo (Bài 46).' },

    { t: 'cal', kind: 'info', title: 'Bốn quyết định lớn, đúng thứ tự menu',
      x: 'Menu gốc của <code>make menuconfig</code> xếp các mục theo đúng thứ tự phụ thuộc: <b>Target options</b> ' +
         '(kiến trúc, biến thể CPU) → <b>Toolchain</b> (tự build hay dùng ngoài, thư viện C, phiên bản gcc) → ' +
         '<b>System configuration</b> (init, <code>/dev</code>, hostname, mật khẩu root) → <b>Kernel</b> → ' +
         '<b>Target packages</b> (mọi chương trình chạy trên thiết bị) → <b>Filesystem images</b> → ' +
         '<b>Bootloaders</b>. Đổi một lựa chọn ở mục trên thường kéo theo phải build lại mọi thứ ở dưới; đổi ở ' +
         'mục dưới thì không. Bước 2 của phần thực hành cho bạn xem từng màn hình.' },

    { t: 'cal', kind: 'why', title: 'Vì sao defconfig, không phải .config, mới là thứ đưa vào Git',
      x: 'Bài 39 đã chứng minh: <code>defconfig</code> cộng với <code>olddefconfig</code> dựng lại đúng ' +
         '<code>.config</code> từng byte. File 19 dòng thì đọc được, review được, <code>git diff</code> được; file ' +
         '5 270 dòng thì không. Và khi bạn nâng lên một bản Buildroot mới, những symbol mặc định mới xuất hiện tự ' +
         'nhiên, thay vì bị một <code>.config</code> cũ chặn lại. Bài 61 dùng <code>make savedefconfig</code> để ' +
         'lưu cấu hình của chính bạn theo cách này.' },

    /* ============================================================
       LÝ THUYẾT 4 — OUTPUT/ VÀ STAMP
       ============================================================ */
    { t: 'h2', x: 'Thư mục output/ và chuỗi stamp của một package' },

    { t: 'p', x:
      'Mọi thứ Buildroot sinh ra nằm trong <code>output/</code>, tách hẳn khỏi cây nguồn — ý tưởng ' +
      '<code>build/</code> và <code>out/</code> của Bài 59, chỉ chia nhỏ hơn. Mỗi thư mục con trả lời một câu hỏi ' +
      'khác nhau: \"cái này chạy trên máy nào, và để làm gì?\"' },

    { t: 'table',
      head: ['Thư mục', 'Chạy trên', 'Chứa gì', 'Tương ứng ở các bài trước'],
      rows: [
        ['<code>output/build/</code>', '—', 'Một thư mục cho mỗi package: <code>&lt;tên&gt;-&lt;phiên bản&gt;/</code>, mã nguồn đã giải nén và build, cùng các stamp', '<code>build/</code> của Bài 59'],
        ['<code>output/host/</code>', 'máy build (x86-64)', 'Toolchain chéo, QEMU, và mọi công cụ build cần: <code>host/bin/aarch64-buildroot-linux-gnu-gcc</code>', '<code>~/x-tools</code> của Bài 28'],
        ['<code>output/staging/</code>', '—', 'Sysroot: header và thư viện của thiết bị, để <i>biên dịch</i> các package khác. Thực chất là một symlink vào <code>host/</code>', 'sysroot của Bài 26'],
        ['<code>output/target/</code>', 'thiết bị (ARM64)', 'Cây rootfs gần hoàn chỉnh, đã strip; thiếu quyền root và file thiết bị nên <b>chưa</b> dùng trực tiếp được', '<code>~/bai47/rootfs</code>'],
        ['<code>output/images/</code>', 'thiết bị', 'Sản phẩm cuối: <code>Image</code>, <code>rootfs.ext4</code>, script khởi động', '<code>out/</code> của Bài 59']
      ] },

    { t: 'cal', kind: 'warn', title: 'output/target không phải rootfs của bạn',
      x: 'Buildroot chạy hoàn toàn bằng user thường, nên mọi file trong <code>output/target</code> thuộc UID của ' +
         'bạn, không thuộc <code>root</code>, và không có node thiết bị nào. Quyền đúng được áp ở bước cuối, qua ' +
         '<code>fakeroot</code>, khi đóng thành ảnh. Để nhắc điều đó, Buildroot đặt một file tên ' +
         '<code>THIS_IS_NOT_YOUR_ROOT_FILESYSTEM</code> ngay trong thư mục đó (biến ' +
         '<code>TARGET_DIR_WARNING_FILE</code>, dòng 491 của <code>Makefile</code>). Muốn sửa rootfs, sửa cấu hình ' +
         'hoặc dùng overlay (Bài 61), rồi <code>make</code> lại — đúng nguyên tắc \"dựng lại rootfs từ đầu, không vá ' +
         'nó\" của Bài 59.' },

    { t: 'p', x:
      'Bên trong <code>output/build/&lt;package&gt;/</code>, Buildroot đánh dấu tiến trình bằng đúng cơ chế bạn tự ' +
      'viết ở Bài 59: một file rỗng cho mỗi bước đã xong. Định nghĩa của chúng nằm ở ' +
      '<code>package/pkg-generic.mk</code>, dòng 839–851. Một package đi qua các stamp sau, theo thứ tự:' },

    { t: 'fig', cap: 'Mỗi package đi qua cùng một chuỗi stamp. Bước cài đặt tách làm bốn đích vì cùng một package có thể cài vào bốn nơi: host (công cụ cho máy build), staging (header và thư viện để biên dịch package khác), target (rootfs) và images (sản phẩm cuối). .stamp_installed chỉ xuất hiện khi mọi đích cần thiết đã xong.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Chuỗi stamp của một package Buildroot từ downloaded tới installed">' +
        '<rect class="d-box" x="10" y="30" width="108" height="56" rx="8"/>' +
        '<text class="d-tm" x="64" y="54" text-anchor="middle">downloaded</text>' +
        '<text class="d-ts" x="64" y="72" text-anchor="middle">tải + kiểm hash</text>' +
        '<path class="d-line" d="M118 58 H130"/><path class="d-arrow" d="M138 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="138" y="30" width="100" height="56" rx="8"/>' +
        '<text class="d-tm" x="188" y="54" text-anchor="middle">extracted</text>' +
        '<text class="d-ts" x="188" y="72" text-anchor="middle">giải nén</text>' +
        '<path class="d-line" d="M238 58 H250"/><path class="d-arrow" d="M258 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="258" y="30" width="100" height="56" rx="8"/>' +
        '<text class="d-tm" x="308" y="54" text-anchor="middle">patched</text>' +
        '<text class="d-ts" x="308" y="72" text-anchor="middle">áp .patch</text>' +
        '<path class="d-line" d="M358 58 H370"/><path class="d-arrow" d="M378 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="378" y="30" width="110" height="56" rx="8"/>' +
        '<text class="d-tm" x="433" y="54" text-anchor="middle">configured</text>' +
        '<text class="d-ts" x="433" y="72" text-anchor="middle">./configure…</text>' +
        '<path class="d-line" d="M488 58 H500"/><path class="d-arrow" d="M508 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box-p" x="508" y="30" width="90" height="56" rx="8"/>' +
        '<text class="d-tm" x="553" y="54" text-anchor="middle">built</text>' +
        '<text class="d-ts" x="553" y="72" text-anchor="middle">make</text>' +
        '<path class="d-line" d="M553 86 V104 H90 V122"/>' +
        '<path class="d-line" d="M553 104 H260 V122"/><path class="d-line" d="M553 104 H430 V122"/>' +
        '<path class="d-line" d="M553 104 H620 V122"/>' +
        '<path class="d-arrow" d="M90 130 l-5 -8 h10 z"/><path class="d-arrow" d="M260 130 l-5 -8 h10 z"/>' +
        '<path class="d-arrow" d="M430 130 l-5 -8 h10 z"/><path class="d-arrow" d="M620 130 l-5 -8 h10 z"/>' +
        '<rect class="d-box-a" x="20" y="130" width="140" height="50" rx="8"/>' +
        '<text class="d-tm" x="90" y="152" text-anchor="middle">host_installed</text>' +
        '<text class="d-ts" x="90" y="170" text-anchor="middle">→ output/host</text>' +
        '<rect class="d-box-a" x="185" y="130" width="150" height="50" rx="8"/>' +
        '<text class="d-tm" x="260" y="152" text-anchor="middle">staging_installed</text>' +
        '<text class="d-ts" x="260" y="170" text-anchor="middle">→ output/staging</text>' +
        '<rect class="d-box-a" x="355" y="130" width="150" height="50" rx="8"/>' +
        '<text class="d-tm" x="430" y="152" text-anchor="middle">target_installed</text>' +
        '<text class="d-ts" x="430" y="170" text-anchor="middle">→ output/target</text>' +
        '<rect class="d-box-a" x="545" y="130" width="150" height="50" rx="8"/>' +
        '<text class="d-tm" x="620" y="152" text-anchor="middle">images_installed</text>' +
        '<text class="d-ts" x="620" y="170" text-anchor="middle">→ output/images</text>' +
        '<rect class="d-box-g" x="260" y="200" width="200" height="40" rx="8"/>' +
        '<text class="d-tm" x="360" y="225" text-anchor="middle">.stamp_installed</text>' +
        '</svg>' },

    { t: 'p', x:
      'Tên của chúng là <code>.stamp_downloaded</code>, <code>.stamp_extracted</code>, ' +
      '<code>.stamp_patched</code>, <code>.stamp_configured</code>, <code>.stamp_built</code>, rồi một hoặc vài ' +
      'trong bốn <code>.stamp_*_installed</code>, và cuối cùng <code>.stamp_installed</code>. Hai bước Bài 59 có ' +
      'mà ở đây tách nhỏ hơn: \"patched\" (Buildroot vá nguồn trước khi build — thư mục <code>board/qemu/patches</code> ' +
      'trong defconfig là một nơi chứa bản vá) và \"configured\" (chạy <code>./configure</code> hoặc ' +
      '<code>make defconfig</code> của package). Bước 4 của phần thực hành liệt kê những file này trên đĩa và đọc ' +
      'thời điểm của chúng.' },

    /* ============================================================
       LÝ THUYẾT 5 — KHI NÀO BUILD LẠI
       ============================================================ */
    { t: 'h2', x: 'Khi nào make lại là đủ, khi nào phải build lại từ đầu' },

    { t: 'p', x:
      'Bài 59 kết thúc bằng bài học <b>phụ thuộc bị khai thiếu</b>: <code>make</code> chỉ biết những gì nằm ở vế ' +
      'phải dấu <code>:</code>. Buildroot chọn đối mặt với điều đó một cách thẳng thắn: <b>nó không cố phát hiện ' +
      'thay đổi cấu hình nào cần build lại cái gì</b>. Một khi package đã có <code>.stamp_built</code>, nó không ' +
      'bao giờ được build lại trừ khi bạn yêu cầu. Tài liệu chính thức nói rõ điều này ngay đầu ' +
      '<code>docs/manual/rebuilding-packages.adoc</code>. Quy tắc thực tế gói lại trong bảng sau:' },

    { t: 'table',
      head: ['Bạn thay đổi', '<code>make</code> làm gì', 'Cần làm thêm'],
      rows: [
        ['Bật thêm một package mới', 'Build package đó và đóng ảnh lại', 'Không — trừ khi một package đã build có thể dùng nó (ví dụ bật <code>openssl</code> sau khi đã build một chương trình có tuỳ chọn SSL)'],
        ['Tắt một package', 'Đóng ảnh lại — nhưng file của nó <b>vẫn nằm</b> trong <code>output/target</code>', 'Build lại từ đầu để thật sự loại bỏ'],
        ['Đổi tuỳ chọn con của một package đã build', 'Không gì cả với package đó', '<code>make &lt;pkg&gt;-reconfigure</code> hoặc <code>&lt;pkg&gt;-rebuild</code>'],
        ['Đổi kiến trúc, toolchain, thư viện C', 'Không phát hiện được', '<code>make clean all</code> — luôn luôn'],
        ['Sửa overlay, script post-build/post-image', 'Áp dụng ngay', 'Không'],
        ['Sửa cấu hình kernel (<code>make linux-menuconfig</code>)', 'Build lại kernel', 'Không']
      ] },

    { t: 'cal', kind: 'tip', title: 'Ba lệnh cho một package, theo mức độ',
      x: '<code>make &lt;pkg&gt;-rebuild</code> xoá các stamp từ <code>.stamp_built</code> trở đi và build lại từ ' +
         'bước biên dịch. <code>make &lt;pkg&gt;-reconfigure</code> lùi xa hơn một bước, tới ' +
         '<code>.stamp_configured</code>. <code>make &lt;pkg&gt;-dirclean</code> xoá hẳn thư mục ' +
         '<code>output/build/&lt;pkg&gt;-&lt;ver&gt;/</code>, nên lần <code>make</code> sau sẽ giải nén lại từ ' +
         'tarball trong <code>dl/</code>. Cả ba đều chỉ là thao tác trên stamp — đúng cách bạn ép Makefile của Bài 59 ' +
         'làm lại một bước bằng cách xoá stamp của nó.' },

    { t: 'cal', kind: 'why', title: 'Vì sao Buildroot chọn không đoán',
      x: 'Đoán đúng đòi hỏi biết mọi đầu vào của mọi bước — Yocto làm điều đó bằng cách băm từng công thức và từng ' +
         'biến, và trả giá bằng độ phức tạp. Buildroot chọn ngược lại: một cơ chế đơn giản ai cũng đọc được, cộng ' +
         'một quy tắc dễ nhớ — <b>khi nghi ngờ, build lại từ đầu</b>. Vì <code>dl/</code> được giữ lại, build lại ' +
         'không phải tải lại gì; nó chỉ tốn thời gian máy. Bước 6 đo chính xác thời gian đó.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ tarball tới hệ thống boot được, bằng một lệnh make' },

    { t: 'p', x:
      'Mọi lệnh chạy trong WSL, thư mục làm việc là <code>~/bai60</code>. Bài này <b>không</b> dùng lại bất kỳ cây ' +
      'nào của các bài trước — không <code>~/bai38</code>, không <code>~/bai47</code>, không gcc chéo của Ubuntu. ' +
      'Buildroot tự tải và tự build mọi thứ. Đổi lại, bạn cần ba thứ: mạng ổn định, khoảng <b>17 GB</b> đĩa trống, và ' +
      'từ 25 phút tới vài giờ tuỳ số CPU. Mọi thời gian và kích thước trong bài là của máy soạn bài (16 CPU, 15 GiB ' +
      'RAM); bài sẽ nói rõ con số nào sẽ khác trên máy bạn.' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Kiểm tra máy build, tải Buildroot và đọc cây nguồn',
        blocks: [
          { t: 'p', x:
            'Buildroot có một danh sách công cụ bắt buộc trên máy build và tự kiểm tra lúc bắt đầu. Kiểm tra trước, ' +
            'trong vài giây, thay vì để lần build đầu dừng lại sau khi đã tải xong 1 GB. Mười một tên đầu lấy đúng từ ' +
            'dòng 157 của <code>support/dependencies/dependencies.sh</code>; năm tên cuối (<code>file</code>, ' +
            '<code>patch</code>, <code>gcc</code>, <code>g++</code>, <code>make</code>) được kiểm tra ở những dòng ' +
            'khác của cùng script:' },

          { t: 'code', where: 'wsl', code:
            'for p in perl tar wget cpio unzip rsync bc cmp find xargs awk file patch gcc g++ make; do\n' +
            '  command -v "$p" > /dev/null || echo "MISSING: $p"\n' +
            'done; echo "check done"' },

          { t: 'p', x:
            'Mỗi tên thiếu in ra một dòng <code>MISSING: …</code>. Trên máy soạn bài (Ubuntu 20.04, đã cài ' +
            '<code>build-essential</code> từ các chặng trước) chỉ thiếu đúng <code>rsync</code>. Cài nó, cùng với ' +
            '<code>libncurses-dev</code> mà <code>make menuconfig</code> cần để vẽ giao diện — Bài 47 đã cho thấy thiếu ' +
            'gói này thì <code>menuconfig</code> dừng với <code>curses.h: No such file or directory</code>. Rồi chạy ' +
            'lại vòng lặp:' },

          { t: 'code', where: 'wsl', code:
            'sudo apt-get install -y rsync libncurses-dev' },

          { t: 'code', where: 'out', nocopy: true, name: 'vòng lặp kiểm tra, chạy lại sau khi cài', code:
            'check done' },

          { t: 'p', x:
            'Chỉ còn <code>check done</code>: không thiếu gì. Nếu máy bạn còn in dòng <code>MISSING</code> nào, cài nốt ' +
            'gói đó trước khi đi tiếp. Giờ tải Buildroot. Bài dùng <b>2026.02.3</b>: dòng <code>2026.02</code> là bản ' +
            '<b>hỗ trợ dài hạn</b> (LTS) — Buildroot ra một bản mỗi ba tháng, và bản tháng 2 hằng năm được sửa lỗi suốt ' +
            'một năm. Sản phẩm thật luôn chọn LTS, vì một bản vá bảo mật không được phép kéo theo hàng trăm package ' +
            'đổi phiên bản. Tải cả tarball lẫn file <code>.sign</code> đi kèm:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai60 && cd ~/bai60\n' +
            'curl -fLO https://buildroot.org/downloads/buildroot-2026.02.3.tar.xz\n' +
            'curl -fLO https://buildroot.org/downloads/buildroot-2026.02.3.tar.xz.sign\n' +
            'ls -l\n' +
            'sed -n 4,7p buildroot-2026.02.3.tar.xz.sign' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 5924\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 6059504 Oct  1 10:22 buildroot-2026.02.3.tar.xz\n' +
            '-rw-r--r-- 1 cah8hc cah8hc    1252 Oct  1 10:22 buildroot-2026.02.3.tar.xz.sign\n' +
            'buildroot-2026.02.3.tar.xz released Tue Jun 16 21:01:40 UTC 2026\n' +
            '\n' +
            'SHA1: 86337a4c78ba707b29359ea257072596660c5347  buildroot-2026.02.3.tar.xz\n' +
            'SHA256: 5a59e7501b0b4ec52c41f4bfa79412320e0b37eae5f719605a258e8d0c6fc7fb  buildroot-2026.02.3.tar.xz' },

          { t: 'p', x:
            'Toàn bộ Buildroot chỉ nặng <b>6 059 504 B</b> (khoảng 5,8 MB) — nhỏ hơn cả tarball BusyBox của Bài 47 ' +
            'nhân đôi. File <code>.sign</code> là một tin nhắn PGP có chữ ký: phần đầu là văn bản thường chứa ngày phát ' +
            'hành và hai checksum, phần sau là chữ ký của người phát hành. Tên user, nhóm và giờ trong ' +
            '<code>ls -l</code> sẽ khác trên máy bạn; kích thước và hai checksum thì phải trùng từng ký tự.' },

          { t: 'p', x:
            'Kiểm tra tarball bằng chính dòng <code>SHA256:</code> đó. <code>sha256sum -c</code> cần định dạng ' +
            '\"<i>hash</i>, hai dấu cách, <i>tên file</i>\" — đúng phần nằm sau chữ <code>SHA256:</code>:' },

          { t: 'code', where: 'wsl', code:
            "grep '^SHA256:' buildroot-2026.02.3.tar.xz.sign | cut -d' ' -f2- | sha256sum -c" },

          { t: 'code', where: 'out', nocopy: true, code:
            'buildroot-2026.02.3.tar.xz: OK' },

          { t: 'cmdx', cmd: "grep '^SHA256:' FILE.sign | cut -d' ' -f2- | sha256sum -c", rows: [
            ["grep '^SHA256:'", 'Chỉ giữ dòng bắt đầu bằng <code>SHA256:</code> — bỏ dòng SHA1 (thuật toán đã bị phá) và phần chữ ký'],
            ["cut -d' ' -f2-", 'Cắt theo dấu cách, giữ từ trường thứ 2 tới hết: bỏ đúng chữ <code>SHA256:</code>, còn lại <code>hash  tên-file</code>'],
            ['sha256sum -c', 'Đọc danh sách <code>hash  tên-file</code> từ stdin, tính lại hash của từng file và so sánh (Bài 38, 47)']
          ] },

          { t: 'p', x:
            '<code>OK</code> chứng minh tarball khớp với checksum trong file <code>.sign</code>, tức là không bị cắt ' +
            'hay hỏng trên đường tải. Nhưng ai sửa được tarball trên máy chủ thì cũng sửa được dòng checksum đó. Thứ ' +
            'chống được việc này là <b>chữ ký</b> bọc quanh văn bản, như Bài 38 đã làm với kernel. Chính file ' +
            '<code>.sign</code> cho biết lấy khoá công khai ở đâu (dòng 8–9 của nó). Dùng một thư mục khoá riêng cho ' +
            'bài này để không lẫn với khoá kernel của Bài 38:' },

          { t: 'code', where: 'wsl', code:
            'export GNUPGHOME=~/bai60/.gnupg\n' +
            'mkdir -p "$GNUPGHOME" && chmod 700 "$GNUPGHOME"\n' +
            'curl -fsSL -o arnout.asc https://gitlab.com/-/snippets/4836881/raw/main/arnout@rnout.be.asc\n' +
            'gpg --import arnout.asc\n' +
            'gpg --verify buildroot-2026.02.3.tar.xz.sign' },

          { t: 'code', where: 'out', nocopy: true, code:
            'gpg: keybox \'/home/cah8hc/bai60/.gnupg/pubring.kbx\' created\n' +
            'gpg: /home/cah8hc/bai60/.gnupg/trustdb.gpg: trustdb created\n' +
            'gpg: key A500D6EE9CB0E540: public key "Arnout Vandecappelle <arnout@rnout.be>" imported\n' +
            'gpg: Total number processed: 1\n' +
            'gpg:               imported: 1\n' +
            'gpg: Signature made Wed 17 Jun 2026 04:00:54 AM +07\n' +
            'gpg:                using RSA key 18C7DF2819C1733D822D599EA500D6EE9CB0E540\n' +
            'gpg: Good signature from "Arnout Vandecappelle <arnout@rnout.be>" [unknown]\n' +
            'gpg:                 aka "Arnout Vandecappelle <arnout.vandecappelle@essensium.com>" [unknown]\n' +
            'gpg: WARNING: This key is not certified with a trusted signature!\n' +
            'gpg:          There is no indication that the signature belongs to the owner.\n' +
            'Primary key fingerprint: 18C7 DF28 19C1 733D 822D  599E A500 D6EE 9CB0 E540\n' +
            'gpg: WARNING: not a detached signature; file \'buildroot-2026.02.3.tar.xz\' was NOT verified!' },

          { t: 'cmdx', cmd: 'gpg --verify buildroot-2026.02.3.tar.xz.sign', rows: [
            ['GNUPGHOME=…', 'Thư mục chứa khoá của gpg. Đặt riêng cho bài để khoá Buildroot không trộn vào <code>~/.gnupg</code> của bạn'],
            ['gpg --import FILE', 'Thêm khoá công khai trong file vào kho khoá'],
            ['gpg --verify FILE.sign', 'Kiểm tra chữ ký bọc quanh văn bản trong file (chữ ký kiểu <i>clearsign</i>: văn bản và chữ ký nằm chung một file)']
          ] },

          { t: 'p', x:
            'Đọc ba dòng quan trọng. <code>Good signature from "Arnout Vandecappelle"</code>: văn bản chứa checksum ' +
            'đúng là do người giữ khoá này ký, không ai sửa một ký tự nào. <code>WARNING: This key is not certified</code>: ' +
            'gpg chỉ nói bạn chưa tự xác nhận khoá này thuộc về ai — bạn tải nó từ địa chỉ do chính file ' +
            '<code>.sign</code> chỉ ra, nên hãy đối chiếu dấu vân tay <code>18C7 DF28 … 9CB0 E540</code> với một nguồn ' +
            'độc lập (trang tải của buildroot.org) trước khi tin hoàn toàn. Dòng cuối cùng nói đúng sự thật: chữ ký ' +
            'bảo vệ <b>văn bản</b>, không bảo vệ trực tiếp tarball. Vì vậy cần cả hai bước: <code>gpg</code> chứng ' +
            'minh dòng checksum là thật, <code>sha256sum -c</code> chứng minh tarball khớp với dòng checksum đó. Dấu ' +
            'vân tay và tên người ký phải trùng với máy bạn; ngày giờ hiển thị theo múi giờ của máy bạn.' },

          { t: 'cal', kind: 'info', title: 'Chữ ký phát hiện được một ký tự bị sửa',
            x: 'Để thấy chữ ký làm việc, sửa một bản sao của file: <code>sed \'s/^SHA256: 5/SHA256: 6/\' ' +
               'buildroot-2026.02.3.tar.xz.sign &gt; /tmp/bad.sign</code> rồi <code>gpg --verify /tmp/bad.sign</code>. ' +
               'Trên máy soạn bài: <code>gpg: BAD signature from "Arnout Vandecappelle &lt;arnout@rnout.be&gt;"</code>, ' +
               'mã thoát <b>1</b> (với file gốc là <b>0</b>). Một kẻ thay tarball và sửa checksum cho khớp sẽ bị chặn ở ' +
               'đúng dòng này. Xoá <code>/tmp/bad.sign</code> sau khi thử.' },

          { t: 'p', x:
            'Giải nén và nhìn vào cây nguồn. Đếm ba thứ: tổng dung lượng, tổng số file, và số package:' },

          { t: 'code', where: 'wsl', code:
            'tar xf buildroot-2026.02.3.tar.xz\n' +
            'cd buildroot-2026.02.3\n' +
            'ls -F\n' +
            'du -sh . ; find . -type f | wc -l\n' +
            'ls package/*/Config.in | wc -l\n' +
            'ls configs | wc -l ; ls configs | grep qemu_aarch64' },

          { t: 'code', where: 'out', nocopy: true, code:
            'arch/   CHANGES           configs/    docs/   Makefile         README       system/\n' +
            'board/  Config.in         COPYING     fs/     Makefile.legacy  SECURITY.md  toolchain/\n' +
            'boot/   Config.in.legacy  DEVELOPERS  linux/  package/         support/     utils/\n' +
            '89M\t.\n' +
            '14911\n' +
            '2786\n' +
            '308\n' +
            'qemu_aarch64_ebbr_defconfig\n' +
            'qemu_aarch64_sbsa_defconfig\n' +
            'qemu_aarch64_virt_defconfig' },

          { t: 'p', x:
            'Bạn vừa đếm đúng những con số phần lý thuyết đã nêu: <b>89 MB</b>, <b>14 911</b> file, <b>2 786</b> package ' +
            'có menu riêng (số thư mục trong <code>package/</code> nhiều hơn một chút vì có thư mục chỉ chứa hạ tầng ' +
            'dùng chung), <b>308</b> defconfig. Ba defconfig cuối là ba cách dùng QEMU cho ARM64; <code>virt</code> là ' +
            'máy bạn đã dùng từ Bài 30, nên bài chọn nó. Đọc nó trước khi dùng — bạn đã thấy toàn văn 19 dòng ở phần lý ' +
            'thuyết; ở đây xem file hướng dẫn đi kèm trong <code>board/</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat board/qemu/aarch64-virt/readme.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Run the emulation with:\n' +
            '\n' +
            '  qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic -smp 1 -kernel output/images/Image -append "rootwait root=/dev/vda console=ttyAMA0" -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 -drive file=output/images/rootfs.ext4,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 # qemu_aarch64_virt_defconfig\n' +
            '\n' +
            'The login prompt will appear in the terminal that started Qemu.' },

          { t: 'p', x:
            'Dòng lệnh QEMU này gần như trùng với <code>run.sh</code> bạn viết ở Bài 46: <code>-kernel Image</code>, ' +
            '<code>root=/dev/vda</code>, một đĩa virtio chứa rootfs ext4. Hai khác biệt nhỏ: <code>rootwait</code> bảo ' +
            'kernel chờ đĩa xuất hiện thay vì panic ngay, và có thêm một card mạng virtio (<code>-netdev user</code>). ' +
            'Chú thích <code># qemu_aarch64_virt_defconfig</code> ở cuối không phải để trang trí: script ' +
            '<code>board/qemu/post-image.sh</code> tìm đúng chú thích này để sinh ra <code>start-qemu.sh</code> ở bước 5.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Nạp defconfig và đi một vòng menuconfig',
        blocks: [
          { t: 'p', x:
            'Nạp defconfig. Lệnh này biên dịch công cụ Kconfig của Buildroot (lần đầu) rồi bung 19 dòng thành ' +
            '<code>.config</code> đầy đủ:' },

          { t: 'code', where: 'wsl', code:
            'make qemu_aarch64_virt_defconfig\n' +
            'wc -l .config ; grep -c \'=y\' .config\n' +
            'ls output' },

          { t: 'code', where: 'out', nocopy: true, code:
            '…\n' +
            '#\n' +
            '# configuration written to /home/cah8hc/bai60/buildroot-2026.02.3/.config\n' +
            '#\n' +
            '5270 .config\n' +
            '323\n' +
            'build' },

          { t: 'p', x:
            '<b>5 270</b> dòng, <b>323</b> symbol bật — từ 19 dòng đầu vào. Thư mục <code>output/</code> đã xuất hiện ' +
            'nhưng mới chỉ có <code>build/buildroot-config</code>, nơi chứa chương trình <code>conf</code> vừa được ' +
            'biên dịch. Mọi thứ khác sẽ đến ở bước 3.' },

          { t: 'p', x:
            'Giờ mở menu. Mục đích không phải sửa gì, mà là tìm lại từng quyết định của defconfig trên màn hình, để ' +
            'lần sau bạn biết chỗ cần đổi:' },

          { t: 'code', where: 'wsl', code: 'make menuconfig' },

          { t: 'code', where: 'out', nocopy: true, name: 'menu gốc', code:
            '            Target options  --->\n' +
            '            Toolchain  --->\n' +
            '            Build options  --->\n' +
            '            System configuration  --->\n' +
            '            Kernel  --->\n' +
            '            Target packages  --->\n' +
            '            Filesystem images  --->\n' +
            '            Bootloaders  --->\n' +
            '            Host utilities  --->\n' +
            '            Legacy config options  --->',
            notes: ['Các màn hình trong bước này được chụp qua một pty và đã bỏ khung viền ncurses cùng màu sắc, giống ' +
                    'cách Bài 39 làm. Trên terminal của bạn mỗi màn hình có khung, tiêu đề và thanh nút ' +
                    '<code>&lt;Select&gt; &lt; Exit &gt; &lt; Help &gt; &lt; Save &gt; &lt; Load &gt;</code> ở dưới.'] },

          { t: 'p', x:
            'Mười mục, đúng thứ tự phần lý thuyết thứ ba đã nêu. Phím điều khiển giống hệt <code>menuconfig</code> của ' +
            'kernel ở Bài 39: mũi tên để đi, <kbd>Enter</kbd> để vào, <kbd>Esc</kbd> <kbd>Esc</kbd> để lùi, ' +
            '<kbd>/</kbd> để tìm một symbol, <kbd>?</kbd> để đọc trợ giúp. Vào <b>Target options</b>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Target options', code:
            '            Target Architecture (AArch64 (little endian))  --->\n' +
            '            Target Architecture Variant (cortex-A53)  --->\n' +
            '            Floating point strategy (FP-ARMv8)  --->\n' +
            '            MMU Page Size (4KB)  --->\n' +
            '            Target Binary Format (ELF)  --->' },

          { t: 'p', x:
            'Dòng <code>BR2_aarch64=y</code> hiện ra ở đây thành \"AArch64 (little endian)\". Mọi giá trị khác là mặc ' +
            'định suy từ nó: CPU <code>cortex-A53</code> — đúng là CPU <code>-cpu cortex-a53</code> trong ' +
            '<code>readme.txt</code>, và gcc sẽ được build để tối ưu cho đúng CPU đó; trang 4 KB, như ' +
            '<code>ARM64_4K_PAGES=y</code> của kernel Bài 51. Lùi ra và vào <b>Toolchain</b>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Toolchain (16 dòng đầu)', code:
            '            Toolchain type (Buildroot toolchain)  --->\n' +
            '            *** Toolchain Buildroot Options ***\n' +
            '        (buildroot) custom toolchain vendor name\n' +
            '            C library (glibc)  --->\n' +
            '            *** Kernel Header Options ***\n' +
            '            Kernel Headers (Same as kernel being built)  --->\n' +
            '            Custom kernel headers series (6.18.x)  --->\n' +
            '            *** Glibc Options ***\n' +
            '        [ ] Enable compatibility shims to run on older kernels\n' +
            '        [ ] Install glibc utilities\n' +
            '            *** Binutils Options ***\n' +
            '            Binutils Version (binutils 2.44)  --->\n' +
            '        [ ] gprofng support\n' +
            '        ()  Additional binutils options\n' +
            '            *** GCC Options ***\n' +
            '            GCC compiler Version (gcc 14.x)  --->' },

          { t: 'p', x:
            'Dòng đầu là quyết định lớn nhất của cả cấu hình. <b>Buildroot toolchain</b> nghĩa là tự build; lựa chọn ' +
            'kia là <b>External toolchain</b> — dùng một toolchain có sẵn, ví dụ của nhà sản xuất chip, hay chính ' +
            '<code>~/x-tools</code> mà Bài 28 dựng bằng crosstool-NG. Tên vendor <code>buildroot</code> sẽ thành phần ' +
            'giữa của triplet: <code>aarch64-<b>buildroot</b>-linux-gnu</code>, giống <code>aarch64-<b>unknown</b>-linux-musl</code> ' +
            'của Bài 28. Thư viện C là <code>glibc</code>; ở đây cũng có thể chọn <code>musl</code> hay ' +
            '<code>uClibc-ng</code> mà Bài 26 đã so sánh. Header kernel \"Same as kernel being built\" khớp đúng quy tắc ' +
            '\"header không mới hơn kernel sẽ chạy\". Tiếp theo, <b>System configuration</b>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'System configuration (16 dòng đầu)', code:
            '            Root FS skeleton (default target skeleton)  --->\n' +
            '        (buildroot) System hostname\n' +
            '        (Welcome to Buildroot) System banner\n' +
            '            Passwords encoding (sha-256)  --->\n' +
            '            Init system (BusyBox)  --->\n' +
            '            /dev management (Dynamic using devtmpfs only)  --->\n' +
            '        (system/device_table.txt) Path to the permission tables\n' +
            '        [ ] support extended attributes in device tables\n' +
            '        [ ] Merged /usr\n' +
            '        [*] Enable root login with password\n' +
            '        ()    Root password\n' +
            '            /bin/sh (busybox\' default shell)  --->\n' +
            '        [*] Run a getty (login prompt) after boot  --->\n' +
            '        [*] remount root filesystem read-write during boot\n' +
            '        (eth0) Network interface to configure through DHCP\n' +
            '        (/bin:/sbin:/usr/bin:/usr/sbin) Set the system\'s default PATH' },

          { t: 'p', x:
            'Đây là cả Chặng 09 trên một màn hình. <b>Init system (BusyBox)</b> là init của Bài 47–49; các lựa chọn ' +
            'khác là SysV init đầy đủ, OpenRC và systemd. <b>/dev management</b> là devtmpfs của Bài 46. ' +
            '<b>remount root filesystem read-write</b> là dòng <code>mount -o remount,rw /</code> bạn tự viết vào ' +
            '<code>rcS</code> ở Bài 47. <b>Root password</b> để trống: đăng nhập <code>root</code> không cần mật khẩu — ' +
            'tiện cho bài học, không bao giờ chấp nhận được trên sản phẩm (Bài 68). Hai mục cuối cần xem là ' +
            '<b>Kernel</b> và <b>Filesystem images</b>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Kernel (10 dòng đầu)', code:
            '        [*] Linux Kernel\n' +
            '              Kernel version (Custom version)  --->\n' +
            '        (6.18.7) Kernel version\n' +
            '        (COPYING LICENSES/preferred/GPL-2.0 LICENSES/exceptions/Linux-syscall-note) Kern\n' +
            '        ()    Custom kernel patches\n' +
            '              Kernel configuration (Using a custom (def)config file)  --->\n' +
            '        (board/qemu/aarch64-virt/linux.config) Configuration file path\n' +
            '        ()    Additional configuration fragment files\n' +
            '        ()    Custom boot logo file path\n' +
            '              Kernel binary format (Image)  --->' },

          { t: 'code', where: 'out', nocopy: true, name: 'Filesystem images (14 dòng đầu)', code:
            '        [ ] btrfs root filesystem\n' +
            '        [ ] cloop root filesystem for the target device\n' +
            '        [ ] cpio the root filesystem (for use as an initial RAM filesystem)\n' +
            '        [ ] cramfs root filesystem\n' +
            '        [ ] erofs root filesystem\n' +
            '        [*] ext2/3/4 root filesystem\n' +
            '              ext2/3/4 variant (ext4)  --->\n' +
            '        (rootfs) filesystem label\n' +
            '        (60M) exact size\n' +
            '        (0)   exact number of inodes (leave at 0 for auto calculation)\n' +
            '        (256) inode size\n' +
            '        (5)   reserved blocks percentage\n' +
            '        (-O ^64bit) additional mke2fs options\n' +
            '              Compression method (no compression)  --->' },

          { t: 'p', x:
            'Kernel 6.18.7 với cấu hình lấy từ <code>board/qemu/aarch64-virt/linux.config</code> — một file chỉ ' +
            '<b>76</b> dòng, sẽ được Kconfig bung ra ở bước 3. Rootfs là ext4, kích thước cố định <b>60M</b>. Ngay trên ' +
            'nó là dòng <code>cpio the root filesystem</code>: bật nó lên là bạn có initramfs của Bài 48, không cần viết ' +
            'lệnh <code>find | cpio</code> nào. Thoát bằng <kbd>Esc</kbd> <kbd>Esc</kbd> cho tới khi menu hỏi ' +
            '<i>Do you wish to save your new configuration?</i> và chọn <b>No</b> — bạn chưa đổi gì.' },

          { t: 'code', where: 'out', nocopy: true, code:
            '*** End of the configuration.\n' +
            '*** Execute \'make\' to start the build or try \'make help\'.' },

          { t: 'cal', kind: 'tip', title: 'Không chắc mình đã lỡ đổi gì? Hỏi Kconfig',
            x: 'Trước khi mở menu, chạy <code>cp .config /tmp/before</code>; sau khi thoát, ' +
               '<code>utils/diffconfig /tmp/before .config</code> in từng symbol khác nhau, cùng định dạng ' +
               '<code>scripts/diffconfig</code> của kernel ở Bài 59. Không in gì nghĩa là không có gì thay đổi. Bước 6 ' +
               'dùng đúng công cụ này.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Một lệnh make: tải nguồn, build toolchain, kernel, rootfs',
        blocks: [
          { t: 'p', x:
            'Đây là lúc gõ lệnh duy nhất. Có hai điều phải làm trước, vì cả hai đều đã làm hỏng lần chạy đầu tiên trên ' +
            'máy soạn bài. Thứ nhất, chạy <code>make</code> ngay lập tức:' },

          { t: 'code', where: 'wsl', code: 'make' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/usr/bin/make -j1  O=/home/cah8hc/bai60/buildroot-2026.02.3/output HOSTCC="/usr/bin/gcc" HOSTCXX="/usr/bin/g++" syncconfig\n' +
            'make[1]: Entering directory \'/home/cah8hc/bai60/buildroot-2026.02.3\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/bai60/buildroot-2026.02.3\'\n' +
            'Your PATH contains spaces, TABs, and/or newline (\\n) characters.\n' +
            'This doesn\'t work. Fix your PATH environment variable.\n' +
            'make: *** [support/dependencies/dependencies.mk:27: dependencies] Error 1' },

          { t: 'p', x:
            'Lỗi này gần như chắc chắn xảy ra trên WSL. Mặc định WSL nối toàn bộ <code>PATH</code> của Windows vào ' +
            '<code>PATH</code> của Linux, và Windows có những thư mục như <code>/mnt/c/Program Files/Git/usr/bin</code>. ' +
            'Trên máy soạn bài có <b>26</b> thư mục như vậy. Buildroot từ chối chạy, vì hàng nghìn dòng lệnh trong các ' +
            'Makefile của nó không đặt <code>$PATH</code> trong ngoặc kép. Cách sửa an toàn nhất là dùng một ' +
            '<code>PATH</code> sạch chỉ cho phiên build, không đụng tới cấu hình của bạn:' },

          { t: 'code', where: 'wsl', code:
            'echo "$PATH" | tr \':\' \'\\n\' | grep -c \' \'\n' +
            'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },

          { t: 'code', where: 'out', nocopy: true, code: '26' },

          { t: 'cmdx', cmd: "echo \"$PATH\" | tr ':' '\\n' | grep -c ' '", rows: [
            ["tr ':' '\\n'", 'Đổi mỗi dấu <code>:</code> thành xuống dòng, để mỗi thư mục trong <code>PATH</code> nằm trên một dòng'],
            ["grep -c ' '", 'Đếm số dòng có chứa dấu cách. Khác 0 là Buildroot sẽ từ chối chạy']
          ] },

          { t: 'p', x:
            'Số <b>26</b> phụ thuộc vào phần mềm đã cài trên Windows của bạn; nó có thể là 5 hay 40, và nếu bạn đã tắt ' +
            '<code>appendWindowsPath</code> trong <code>/etc/wsl.conf</code> thì nó là 0 và bạn không gặp lỗi này. ' +
            '<code>export</code> chỉ có hiệu lực trong terminal hiện tại — mở terminal mới là <code>PATH</code> cũ quay ' +
            'lại, nên mỗi lần quay lại thư mục này để build, gõ lại dòng <code>export</code> trước.' },

          { t: 'p', x:
            'Thứ hai, tách phần tải về ra chạy trước. <code>make source</code> chỉ tải và kiểm tra hash mọi tarball ' +
            'cần cho cấu hình hiện tại, vào thư mục <code>dl/</code>, rồi dừng — không build gì cả. Tách ra như vậy có ' +
            'hai lợi ích: một lỗi mạng hiện ra sau vài phút thay vì sau nửa giờ build, và sau đó việc build chạy ' +
            'hoàn toàn offline:' },

          { t: 'code', where: 'wsl', code:
            'make source\n' +
            'du -sh dl ; ls dl | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '…\n' +
            'linux-6.18.7.tar.xz: OK (sha256: b726a4d15cf9ae06219b56d87820776e34d89fbc137e55fb54a9b9c3015b8f1e)\n' +
            '…\n' +
            'busybox-1.37.0.tar.bz2: OK (sha256: 3311dff32e746499f4df0d5df04d7eb396382d7e108bb9250e7b519b837043a4)\n' +
            '…\n' +
            '1.2G\tdl\n' +
            '48' },

          { t: 'p', x:
            'Mỗi tarball tải về đều đi kèm một dòng <code>OK (sha256: …)</code> — đó là <code>.hash</code> của từng ' +
            'package đang làm việc, cùng cơ chế với <code>sha256sum -c</code> ở bước 1. <b>48</b> package, <b>1,2 GB</b>. ' +
            'Hai checksum trên phải trùng từng ký tự với máy bạn: đó là toàn bộ ý nghĩa của việc khai hash trong công ' +
            'thức.' },

          { t: 'cal', kind: 'warn', title: 'Mạng công ty: make source có thể phải chạy lại nhiều lần',
            x: 'Trên máy soạn bài, proxy công ty trả <code>401 Proxy server authentication failed</code> một cách ngẫu ' +
               'nhiên cho cả site gốc lẫn mirror <code>sources.buildroot.net</code>, nên <code>make source</code> dừng ' +
               'với <code>Error 1</code> ở một package, lần sau lại qua. Phải chạy <b>56</b> lần trong khoảng 28 phút mới ' +
               'tải đủ. Điều quan trọng: <code>make source</code> <b>an toàn khi chạy lại</b> — file đã tải xong và ' +
               'đúng hash được giữ trong <code>dl/</code>, file hỏng bị xoá, nên mỗi lần chạy lại chỉ tải tiếp phần còn ' +
               'thiếu. Một vòng lặp đơn giản làm việc đó thay bạn: ' +
               '<code>until make source; do sleep 10; done</code>. Trên mạng gia đình bình thường, một lần là đủ.' },

          { t: 'p', x:
            'Giờ build. Bọc lệnh trong <code>time</code> để đo, và ghi log ra file — log của lần build này dài hơn ' +
            '<b>83 000</b> dòng, không thể đọc trên màn hình:' },

          { t: 'code', where: 'wsl', code:
            'time make > build.log 2>&1 ; echo "make rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t24m41.051s\n' +
            'user\t244m47.495s\n' +
            'sys\t18m26.410s\n' +
            'make rc=0' },

          { t: 'p', x:
            '<b>24 phút 41 giây</b> đồng hồ, nhưng <b>244 phút</b> CPU: tỉ lệ <code>user / real</code> là 9,9 — trên ' +
            'máy 16 CPU, trung bình gần 10 lõi bận suốt thời gian build. Bạn không truyền <code>-j</code> nào: ' +
            '<code>BR2_JLEVEL=0</code> trong <code>.config</code> nghĩa là \"mỗi package tự dùng số CPU của máy\". Thời ' +
            'gian này thay đổi rất mạnh theo máy — với 4 CPU hãy chuẩn bị 1,5 tới 2 giờ. <code>make rc=0</code> là ' +
            'điều duy nhất phải trùng.' },

          { t: 'cal', kind: 'info', title: 'Vì sao không có lệnh make -j16',
            x: 'Buildroot đặt <code>.NOTPARALLEL:</code> ở dòng 251 của <code>Makefile</code> gốc: các <b>package</b> ' +
               'được build lần lượt, từng cái một, còn song song nằm <b>bên trong</b> mỗi package (gcc, kernel… tự chạy ' +
               '<code>make -j16</code>). Lý do là tái lập: hai package cùng cài vào <code>output/target</code> mà chạy ' +
               'song song thì kết quả có thể phụ thuộc thứ tự. Có một chế độ build song song nhiều package ' +
               '(<code>BR2_PER_PACKAGE_DIRECTORIES</code>), nhưng tài liệu vẫn gọi nó là thử nghiệm. Đây cũng là lý do ' +
               'tỉ lệ dừng ở 9,9 chứ không gần 16: những package nhỏ chạy configure một lõi chiếm một phần thời gian.' },

          { t: 'p', x:
            'Log dài, nhưng mỗi bước của mỗi package bắt đầu bằng một dòng <code>&gt;&gt;&gt;</code> có thể lọc ra ' +
            'được. Đếm chúng và xem vài dòng đầu:' },

          { t: 'code', where: 'wsl', code:
            "grep -c '>>>' build.log\n" +
            "grep '>>>' build.log | sed 's/\\x1b\\[[0-9;]*m//g' | head -n 6" },

          { t: 'code', where: 'out', nocopy: true, code:
            '390\n' +
            '>>> host-m4 1.4.21 Extracting\n' +
            '>>> host-m4 1.4.21 Patching\n' +
            '>>> host-m4 1.4.21 Updating config.sub and config.guess\n' +
            '>>> host-m4 1.4.21 Patching libtool\n' +
            '>>> host-m4 1.4.21 Configuring\n' +
            '>>> host-m4 1.4.21 Building' },

          { t: 'cmdx', cmd: "grep '>>>' build.log | sed 's/\\x1b\\[[0-9;]*m//g'", rows: [
            ["grep '>>>'", 'Giữ các dòng tiến trình. Buildroot in mỗi dòng này đảo màu trên terminal để bạn nhìn thấy giữa hàng nghìn dòng output của trình biên dịch'],
            ["sed 's/\\x1b\\[[0-9;]*m//g'", 'Xoá mã màu ANSI (<code>ESC [ 7 m</code> … <code>ESC [ 27 m</code>) mà Buildroot chèn quanh dòng đó; không có bước này, file log hiện ra các ký tự lạ']
          ] },

          { t: 'p', x:
            'Mỗi dòng có dạng <code>&gt;&gt;&gt; &lt;package&gt; &lt;phiên bản&gt; &lt;bước&gt;</code>, và các bước ' +
            'trùng với chuỗi stamp ở phần lý thuyết thứ tư: Extracting → Patching → Configuring → Building → ' +
            'Installing. Package đầu tiên là <code>host-m4</code>: tiền tố <code>host-</code> nghĩa là chương trình ' +
            'này chạy trên <b>máy build</b>, không lên thiết bị. Trước khi build được gcc, Buildroot build những công ' +
            'cụ mà gcc cần, theo phiên bản nó kiểm soát, thay vì tin vào bản có sẵn trên Ubuntu. Lần build này đi qua ' +
            '<b>62</b> package khác nhau, và <b>49</b> trong số đó bắt đầu bằng <code>host-</code>. Vài dòng ' +
            '<code>&gt;&gt;&gt;</code> cuối log không mang tên package mà là bước chung của cả hệ thống — ' +
            '<code>&gt;&gt;&gt;   Finalizing target directory</code>, <code>Generating filesystem image rootfs.ext2</code> — ' +
            'bước 6 sẽ gặp lại chúng.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Đọc output/: dung lượng, stamp, toolchain, rootfs',
        blocks: [
          { t: 'p', x:
            'Build xong, giờ xem nó để lại gì. Bắt đầu bằng hình dạng và kích thước của <code>output/</code>:' },

          { t: 'code', where: 'wsl', code:
            'ls -l output\n' +
            'du -sh dl output/*' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 20\n' +
            'drwxr-xr-x 68 cah8hc cah8hc 4096 Oct  1 12:20 build\n' +
            'drwxr-xr-x 11 cah8hc cah8hc 4096 Oct  1 12:11 host\n' +
            'drwxr-xr-x  2 cah8hc cah8hc 4096 Oct  1 12:20 images\n' +
            'lrwxrwxrwx  1 cah8hc cah8hc   86 Oct  1 12:20 staging -> /home/cah8hc/bai60/buildroot-2026.02.3/output/host/aarch64-buildroot-linux-gnu/sysroot\n' +
            'drwxr-xr-x 17 cah8hc cah8hc 4096 Oct  1 12:07 target\n' +
            '1.2G\tdl\n' +
            '13G\toutput/build\n' +
            '1.2G\toutput/host\n' +
            '21M\toutput/images\n' +
            '4.0K\toutput/staging\n' +
            '4.4M\toutput/target' },

          { t: 'p', x:
            'Đủ năm thư mục của bảng lý thuyết, và <code>staging</code> đúng là một symlink vào ' +
            '<code>host/aarch64-buildroot-linux-gnu/sysroot</code>. Nhìn vào cột dung lượng thì thấy một tỉ lệ đáng ' +
            'nhớ: <b>13 GB</b> mã nguồn và file trung gian trong <code>build/</code>, <b>1,2 GB</b> công cụ trong ' +
            '<code>host/</code>, để sinh ra <b>21 MB</b> sản phẩm. Thứ thật sự lên thiết bị chỉ là <b>4,4 MB</b> trong ' +
            '<code>target/</code>. Bạn cần khoảng 15 GB cho <code>output/</code> cộng 1,2 GB cho <code>dl/</code> — ' +
            'đó là con số 17 GB ở đầu phần thực hành. Dung lượng sẽ gần như trùng trên máy bạn; giờ trong ' +
            '<code>ls -l</code> thì không.' },

          { t: 'p', x:
            'Giờ tìm lời hứa của Bài 59: những stamp mang đúng tên bạn đã tự đặt. Liệt kê stamp của BusyBox cùng thời ' +
            'điểm tạo ra từng cái:' },

          { t: 'code', where: 'wsl', code:
            'ls -la --time-style=+%H:%M:%S output/build/busybox-1.37.0/.stamp_* | awk \'{print $6, $7}\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '12:07:30 output/build/busybox-1.37.0/.stamp_built\n' +
            '12:07:18 output/build/busybox-1.37.0/.stamp_configured\n' +
            '12:07:17 output/build/busybox-1.37.0/.stamp_dotconfig\n' +
            '12:07:13 output/build/busybox-1.37.0/.stamp_downloaded\n' +
            '12:07:13 output/build/busybox-1.37.0/.stamp_extracted\n' +
            '12:07:32 output/build/busybox-1.37.0/.stamp_installed\n' +
            '12:07:18 output/build/busybox-1.37.0/.stamp_kconfig_fixup_done\n' +
            '12:07:13 output/build/busybox-1.37.0/.stamp_patched\n' +
            '12:07:31 output/build/busybox-1.37.0/.stamp_target_installed' },

          { t: 'cmdx', cmd: "ls -la --time-style=+%H:%M:%S DIR/.stamp_* | awk '{print $6, $7}'", rows: [
            ['-a', 'Hiện cả file bắt đầu bằng dấu chấm — mọi stamp đều là file ẩn'],
            ['--time-style=+%H:%M:%S', 'In giờ tới từng giây thay vì chỉ <code>Oct  1 12:07</code>, để thấy thứ tự các bước'],
            ["awk '{print $6, $7}'", 'Chỉ giữ cột thứ 6 (giờ) và thứ 7 (tên file), bỏ quyền, chủ, kích thước — mọi stamp đều rỗng nên kích thước luôn là 0']
          ] },

          { t: 'p', x:
            '<code>.stamp_extracted</code> — đúng cái tên bạn dùng ở Bài 59 — nằm đó. Sắp xếp theo giờ thay vì theo ' +
            'tên, bạn đọc được toàn bộ đời của BusyBox trong lần build này: giải nén và vá lúc <b>12:07:13</b>; sinh ' +
            '<code>.config</code> lúc :17 (<code>.stamp_dotconfig</code> và <code>.stamp_kconfig_fixup_done</code> là ' +
            'hai stamp riêng của package dùng Kconfig); cấu hình xong :18; build xong :30; cài vào ' +
            '<code>target</code> :31; hoàn tất :32. Toàn bộ BusyBox mất <b>19 giây</b>. Package này chỉ có ' +
            '<code>.stamp_target_installed</code> vì nó chỉ cài vào rootfs. So với hai package khác:' },

          { t: 'code', where: 'wsl', code:
            'ls -1a output/build/host-gcc-final-14.3.0 | grep stamp\n' +
            'ls -1a output/build/linux-6.18.7 | grep stamp' },

          { t: 'code', where: 'out', nocopy: true, code:
            '.stamp_built\n' +
            '.stamp_configured\n' +
            '.stamp_downloaded\n' +
            '.stamp_extracted\n' +
            '.stamp_host_installed\n' +
            '.stamp_installed\n' +
            '.stamp_patched\n' +
            '.stamp_built\n' +
            '.stamp_configured\n' +
            '.stamp_dotconfig\n' +
            '.stamp_downloaded\n' +
            '.stamp_extracted\n' +
            '.stamp_images_installed\n' +
            '.stamp_installed\n' +
            '.stamp_kconfig_fixup_done\n' +
            '.stamp_patched\n' +
            '.stamp_target_installed' },

          { t: 'p', x:
            '<code>host-gcc-final</code> (7 dòng đầu) có <code>.stamp_host_installed</code> và không có stamp cài ' +
            'nào khác: trình biên dịch chỉ chạy trên máy build. <code>linux</code> (10 dòng sau) có ' +
            '<b>hai</b>: <code>.stamp_images_installed</code> vì <code>Image</code> đi vào <code>output/images</code>, và ' +
            '<code>.stamp_target_installed</code> vì module kernel (nếu có) đi vào <code>/lib/modules</code> của rootfs. ' +
            'Đó chính là bốn nhánh của hình chuỗi stamp ở phần lý thuyết, quan sát trực tiếp trên đĩa.' },

          { t: 'p', x:
            'Tiếp theo, toolchain mà Buildroot vừa tự build — sản phẩm lớn nhất của lần build đầu:' },

          { t: 'code', where: 'wsl', code:
            'ls output/host/bin | grep -c aarch64-buildroot\n' +
            'output/host/bin/aarch64-buildroot-linux-gnu-gcc --version | head -1\n' +
            'output/host/bin/qemu-system-aarch64 --version | head -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '31\n' +
            'aarch64-buildroot-linux-gnu-gcc.br_real (Buildroot 2026.02.3) 14.3.0\n' +
            'QEMU emulator version 10.2.0' },

          { t: 'p', x:
            '<b>31</b> công cụ mang tiền tố <code>aarch64-buildroot-linux-gnu-</code> — cùng loại với 34 công cụ ' +
            '<code>aarch64-unknown-linux-musl-</code> mà Bài 28 dựng bằng crosstool-NG. gcc tự nhận là <b>14.3.0</b> ' +
            '<code>(Buildroot 2026.02.3)</code>, không phải 9.4.0 của Ubuntu: lỗ rò thứ năm của Bài 59 đã được bịt — ' +
            'người khác dùng cùng bản Buildroot sẽ có cùng gcc, bất kể distro của họ. Đuôi <code>.br_real</code> lộ ra ' +
            'một chi tiết: lệnh bạn gọi thực ra là một chương trình bọc nhỏ, nó thêm các cờ sysroot và CPU đúng rồi ' +
            'mới gọi gcc thật. QEMU <b>10.2.0</b> cũng được build ra — mới hơn nhiều so với 4.2.1 của Ubuntu 20.04.' },

          { t: 'p', x:
            'Cuối cùng, rootfs. So sánh cây trong <code>output/target</code> với file thật bên trong ảnh:' },

          { t: 'code', where: 'wsl', code:
            'ls output/target\n' +
            'stat -c \'%U:%G %s %n\' output/target/bin/busybox output/target/etc/passwd\n' +
            'file output/target/bin/busybox' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin  etc  lib64    media  opt   root  sbin  THIS_IS_NOT_YOUR_ROOT_FILESYSTEM  usr\n' +
            'dev  lib  linuxrc  mnt    proc  run   sys   tmp                               var\n' +
            'cah8hc:cah8hc 817608 output/target/bin/busybox\n' +
            'cah8hc:cah8hc 340 output/target/etc/passwd\n' +
            'output/target/bin/busybox: ELF 64-bit LSB shared object, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, for GNU/Linux 6.18.0, stripped' },

          { t: 'p', x:
            'Ba điều đáng để ý. File <code>THIS_IS_NOT_YOUR_ROOT_FILESYSTEM</code> ở giữa danh sách thư mục, đúng như ' +
            'callout ở phần lý thuyết. <code>busybox</code> thuộc <code>cah8hc:cah8hc</code> — user của bạn, không ' +
            'phải root; trên máy bạn sẽ là tên của bạn. Và BusyBox lần này là <b>dynamically linked</b>, ' +
            '<b>817 608 B</b>, khác với BusyBox static 2 094 192 B của Bài 47: Buildroot có sẵn glibc trong rootfs, ' +
            'nên không cần nhồi thư viện vào từng chương trình. Bài 46 đã cho thấy một chương trình dynamic cần loader ' +
            'và libc; Buildroot tự đặt chúng vào <code>/lib</code>.' },

          { t: 'p', x:
            'Và sản phẩm cuối:' },

          { t: 'code', where: 'wsl', code:
            'ls -l output/images\n' +
            'du -h output/images/rootfs.ext2' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 21484\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 13236736 Oct  1 12:20 Image\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 62914560 Oct  1 12:20 rootfs.ext2\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc       11 Oct  1 12:20 rootfs.ext4 -> rootfs.ext2\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc      839 Oct  1 12:20 start-qemu.sh\n' +
            '8.6M\toutput/images/rootfs.ext2' },

          { t: 'p', x:
            'Bốn file. <code>Image</code> chỉ <b>13 236 736 B</b> (12,6 MB) — so với <b>49 342 976 B</b> của ' +
            '<code>~/bai38</code>: cấu hình kernel của Buildroot chỉ bật <b>1 127</b> symbol <code>=y</code> và ' +
            '<b>4</b> <code>=m</code>, trong khi <code>defconfig</code> của kernel bật 3 271 và 1 276, vì nó phải chạy ' +
            'trên hàng trăm bo mạch ARM64 thật. <code>rootfs.ext2</code> có kích thước danh nghĩa đúng 60 MiB ' +
            '(<code>62914560 = 60 × 1024 × 1024</code>, giá trị \"exact size\" ở bước 2) nhưng chỉ chiếm <b>8,6 MB</b> ' +
            'trên đĩa — file thưa, như <code>mkfs.ext4 -d</code> ở Bài 46. <code>rootfs.ext4</code> chỉ là một symlink ' +
            'tới nó. <code>start-qemu.sh</code> là thứ script post-image sinh ra.' },

          { t: 'cal', kind: 'info', title: 'Thời gian đi đâu: build-time.log',
            x: 'Buildroot ghi giờ bắt đầu và kết thúc của từng bước, từng package vào ' +
               '<code>output/build/build-time.log</code>. Cộng lại theo nhóm trên máy soạn bài (bỏ phần tải về): ' +
               '<b>toolchain</b> và các công cụ nó cần — binutils, hai lượt gcc, glibc, gmp, mpfr… — ' +
               '<b>683 s</b> (47 %); riêng <b>host-qemu</b> và những gì chỉ nó cần — python3, meson, ninja, ' +
               'cmake, glib — <b>474 s</b> (32 %); <b>kernel</b> cùng openssl/kmod <b>239 s</b> (16 %); ' +
               '<b>BusyBox</b> <b>10 s</b>. Package chậm nhất không phải gcc mà là <code>host-cmake</code> ' +
               '(<b>239 s</b>): <code>host-ninja</code> cần CMake ≥ 3.18, Ubuntu 20.04 chỉ có 3.16.3, nên Buildroot ' +
               'build CMake riêng. Trên distro mới hơn, bước đó biến mất. Nếu bạn không cần QEMU mới, tắt ' +
               '<code>BR2_PACKAGE_HOST_QEMU</code> và dùng QEMU của máy (bước 5) là tiết kiệm được khoảng một phần ba ' +
               'thời gian build.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Boot ảnh Buildroot trong QEMU',
        blocks: [
          { t: 'p', x:
            'Đọc <code>start-qemu.sh</code> trước khi chạy nó — đây là kịch bản do chính lần build sinh ra:' },

          { t: 'code', where: 'wsl', code:
            'tail -n 7 output/images/start-qemu.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'fi\n' +
            '\n' +
            'if ! ${mode_sys_qemu}; then\n' +
            '    export PATH="/home/cah8hc/bai60/buildroot-2026.02.3/output/host/bin:${PATH}"\n' +
            'fi\n' +
            '\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic -smp 1 -kernel Image -append "rootwait root=/dev/vda console=ttyAMA0" -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 -drive file=rootfs.ext4,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0  ${EXTRA_ARGS} "$@"' },

          { t: 'p', x:
            'Dòng lệnh QEMU là đúng dòng trong <code>readme.txt</code> ở bước 1, đã bỏ tiền tố ' +
            '<code>output/images/</code> (script tự <code>cd</code> vào đó). Khối <code>if</code> phía trên đặt ' +
            '<code>output/host/bin</code> lên đầu <code>PATH</code>, nên <code>qemu-system-aarch64</code> được gọi là ' +
            'bản 10.2.0 Buildroot vừa build, trừ khi bạn truyền <code>--use-system-qemu</code>. Đường dẫn tuyệt đối ' +
            '<code>/home/cah8hc/…</code> được ghi cứng vào script lúc build — trên máy bạn nó là thư mục của bạn. ' +
            'Chạy nó:' },

          { t: 'code', where: 'wsl', code:
            'output/images/start-qemu.sh --serial-only' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Booting Linux on physical CPU 0x0000000000 [0x410fd034]\n' +
            'Linux version 6.18.7 (cah8hc@HC-C-005W7) (aarch64-buildroot-linux-gnu-gcc.br_real (Buildroot 2026.02.3) 14.3.0, GNU ld (GNU Binutils) 2.44) #1 SMP Thu Oct  1 12:19:55 +07 2026\n' +
            '…\n' +
            'VFS: Mounted root (ext4 filesystem) readonly on device 254:0.\n' +
            'devtmpfs: mounted\n' +
            'Freeing unused kernel memory: 1152K\n' +
            'Run /sbin/init as init process\n' +
            'EXT4-fs (vda): re-mounted 6360fb16-511b-4432-a664-62a0eee55a4a r/w.\n' +
            'Saving 256 bits of creditable seed for next boot\n' +
            'Starting syslogd: OK\n' +
            'Starting klogd: OK\n' +
            'Running sysctl: OK\n' +
            'Starting network: udhcpc: started, v1.37.0\n' +
            'udhcpc: broadcasting discover\n' +
            'udhcpc: broadcasting select for 10.0.2.15, server 10.0.2.2\n' +
            'udhcpc: lease of 10.0.2.15 obtained from 10.0.2.2, lease time 86400\n' +
            'deleting routers\n' +
            'adding dns 10.0.2.3\n' +
            'OK\n' +
            'Starting crond: OK\n' +
            '\n' +
            'Welcome to Buildroot\n' +
            'buildroot login:',
            notes: ['Log đầy đủ dài <b>159</b> dòng tới dấu nhắc đăng nhập; phần giữa (khởi tạo bộ nhớ, ngắt, thiết bị ' +
                    'virtio…) được lược bằng <code>…</code>.',
                    'Dấu nhắc <code>buildroot login:</code> xuất hiện sau khoảng <b>1,4 s</b> với QEMU 10.2.0 trên máy soạn ' +
                    'bài. UUID của ext4 và giờ trong dòng <code>Linux version</code> khác nhau mỗi lần build; ' +
                    '<code>cah8hc@HC-C-005W7</code> là user và tên máy của bạn.'] },

          { t: 'cmdx', cmd: 'start-qemu.sh [--serial-only] [--use-system-qemu] [-- thêm-tham-số-QEMU]', rows: [
            ['--serial-only', 'Thêm <code>-nographic</code>: mọi thứ đi qua cổng nối tiếp tới terminal của bạn. Không có nó, QEMU mở cửa sổ đồ hoạ — không chạy được trên WSL không có giao diện'],
            ['--use-system-qemu', 'Bỏ qua <code>output/host/bin</code>, dùng <code>qemu-system-aarch64</code> có sẵn trên máy'],
            ['"$@"', 'Mọi tham số còn lại được nối vào cuối dòng lệnh QEMU, ví dụ <code>-m 512</code>']
          ] },

          { t: 'p', x:
            'Đọc log từ dưới lên, bạn thấy lại cả Chặng 09. <code>Mounted root (ext4 filesystem) readonly</code> rồi ' +
            '<code>re-mounted … r/w</code>: kernel gắn root chỉ đọc, init gắn lại có ghi — đúng như Bài 46 và 47. ' +
            '<code>devtmpfs: mounted</code>: <code>/dev</code> tự có. <code>Run /sbin/init</code>: BusyBox init. Năm ' +
            'dòng <code>Starting …: OK</code> là năm script trong <code>/etc/init.d</code>, được <code>rcS</code> chạy ' +
            'theo thứ tự số — mô hình SysV của Bài 49. <code>udhcpc</code> lấy địa chỉ <code>10.0.2.15</code> từ ' +
            'mạng ảo của QEMU, do dòng <code>BR2_SYSTEM_DHCP="eth0"</code> trong defconfig. Rồi <code>getty</code> in ' +
            'banner <code>Welcome to Buildroot</code> và hỏi tên đăng nhập. Gõ <code>root</code>, không có mật khẩu, ' +
            'rồi xem bên trong:' },

          { t: 'code', where: 'qemu', code:
            'cat /etc/os-release\n' +
            'mount\n' +
            'df -h /\n' +
            'ls -l /bin/busybox /lib/libc.so.6 /lib/ld-linux-aarch64.so.1\n' +
            'ls /THIS_IS_NOT_YOUR_ROOT_FILESYSTEM; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NAME=Buildroot\n' +
            'VERSION=2026.02.3\n' +
            'ID=buildroot\n' +
            'VERSION_ID=2026.02.3\n' +
            'PRETTY_NAME="Buildroot 2026.02.3"\n' +
            '/dev/root on / type ext4 (rw,relatime)\n' +
            'devtmpfs on /dev type devtmpfs (rw,relatime,size=56796k,nr_inodes=14199,mode=755)\n' +
            'proc on /proc type proc (rw,relatime)\n' +
            'devpts on /dev/pts type devpts (rw,relatime,gid=5,mode=620,ptmxmode=666)\n' +
            'tmpfs on /dev/shm type tmpfs (rw,relatime)\n' +
            'tmpfs on /tmp type tmpfs (rw,relatime)\n' +
            'tmpfs on /run type tmpfs (rw,nosuid,nodev,relatime,mode=755)\n' +
            'sysfs on /sys type sysfs (rw,relatime)\n' +
            'Filesystem                Size      Used Available Use% Mounted on\n' +
            '/dev/root                51.1M      4.1M     42.8M   9% /\n' +
            '-rwsr-xr-x    1 root     root        817608 Oct  1 05:20 /bin/busybox\n' +
            '-rwxr-xr-x    1 root     root        202464 Oct  1 05:20 /lib/ld-linux-aarch64.so.1\n' +
            '-rwxr-xr-x    1 root     root       1613984 Oct  1 05:20 /lib/libc.so.6\n' +
            'ls: /THIS_IS_NOT_YOUR_ROOT_FILESYSTEM: No such file or directory\n' +
            'rc=1' },

          { t: 'p', x:
            'Bên trong máy ảo, mọi thứ bước 4 nghi ngờ đã được sửa. <code>/bin/busybox</code> giờ thuộc ' +
            '<code>root root</code>, không còn là <code>cah8hc</code>: <code>fakeroot</code> đã áp quyền đúng lúc đóng ' +
            'ảnh. Nó còn có bit <b>s</b> (<code>-rwsr-xr-x</code>, setuid) — Buildroot đặt quyền ' +
            '<code>4755</code> cho file này trong bảng quyền của package BusyBox (<code>package/busybox/busybox.mk</code>, ' +
            'dòng 153), để các applet như <code>passwd</code> và <code>su</code> làm việc. File cảnh báo ' +
            '<code>THIS_IS_NOT_YOUR_ROOT_FILESYSTEM</code> đã bị loại khỏi ảnh (<code>rc=1</code>). Tám dòng ' +
            '<code>mount</code> là kết quả của <code>/etc/fstab</code> và <code>inittab</code> mặc định — những file ' +
            'bạn tự viết ở Bài 47. Rootfs dùng <b>4,1 MB</b> trên 51,1 MB khả dụng.' },

          { t: 'cal', kind: 'warn', title: 'Giờ trên máy ảo lệch 7 tiếng — và đó không phải lỗi',
            x: '<code>ls -l</code> trên máy ảo in <code>Oct  1 05:20</code>, trong khi bước 4 trên WSL in ' +
               '<code>12:20</code> cho cùng file. Rootfs không có <code>/etc/localtime</code> nên máy ảo hiển thị giờ ' +
               'UTC, còn WSL của máy soạn bài ở múi <code>+07</code>. Đây chính là lỗ rò <code>TZ</code> của Bài 59, ' +
               'nhìn từ phía ngược lại: cùng một mốc thời gian, hai cách trình bày.' },

          { t: 'p', x:
            'Xem init đã khởi động những gì, và hệ thống chiếm bao nhiêu bộ nhớ:' },

          { t: 'code', where: 'qemu', code:
            'ls /etc/init.d\n' +
            'ps | grep -v \'\\[\'\n' +
            'free -k' },

          { t: 'code', where: 'out', nocopy: true, code:
            'S01seedrng  S02klogd    S11modules  S50crond    rcS\n' +
            'S01syslogd  S02sysctl   S40network  rcK\n' +
            'PID   USER     COMMAND\n' +
            '    1 root     init\n' +
            '   55 root     /sbin/syslogd -n\n' +
            '   59 root     /sbin/klogd -n\n' +
            '  101 root     udhcpc -t1 -A3 -b -R -O search -O staticroutes -p /var/run/udhcpc.eth0.pid -i eth0 -x hostname:buildroot\n' +
            '  106 root     /usr/sbin/crond -f\n' +
            '  107 root     -sh\n' +
            '  110 root     ps\n' +
            '              total        used        free      shared  buff/cache   available\n' +
            'Mem:         114748       12176       98820          44        3752       98656\n' +
            'Swap:             0           0           0' },

          { t: 'p', x:
            'Tám script <code>S??*</code> và cặp <code>rcS</code>/<code>rcK</code> — đúng cấu trúc SysV bạn tự dựng ' +
            'cho <code>temp_daemon</code> ở Bài 49, chỉ khác là Buildroot viết sẵn. Bỏ các luồng kernel (dòng có ' +
            '<code>[</code>), chỉ còn <b>7</b> tiến trình người dùng: init, hai daemon log, udhcpc, crond, shell của bạn, ' +
            'và chính <code>ps</code>. Dòng của <code>udhcpc</code> kết thúc bằng <code>-x hostname:buildroot</code>: ' +
            'nó gửi hostname lấy từ cấu hình cho máy chủ DHCP. Toàn bộ hệ thống dùng khoảng <b>12 MB</b> RAM ' +
            '(<code>used</code> <b>12 176</b> KiB; con số này xê dịch vài chục KiB giữa các lần boot). Số PID sẽ khác ' +
            'trên máy bạn; số tiến trình và danh sách script thì giống.' },

          { t: 'p', x:
            'Tắt máy ảo bằng <code>poweroff</code>:' },

          { t: 'code', where: 'qemu', code: 'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Stopping crond: stopped /usr/sbin/crond (pid 106)\n' +
            'OK\n' +
            'Stopping network: OK\n' +
            'Stopping klogd: stopped /sbin/klogd (pid 59)\n' +
            'OK\n' +
            'Stopping syslogd: stopped /sbin/syslogd (pid 55)\n' +
            'OK\n' +
            'Seeding 256 bits and crediting\n' +
            'Saving 256 bits of creditable seed for next boot\n' +
            'umount: devtmpfs busy - remounted read-only\n' +
            'EXT4-fs (vda): re-mounted 6360fb16-511b-4432-a664-62a0eee55a4a ro.\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            'reboot: Power down' },

          { t: 'p', x:
            '<code>rcK</code> chạy các script theo thứ tự <b>ngược</b> — crond trước, syslogd sau cùng — đúng dòng ' +
            '<code>::shutdown:/etc/init.d/rcK</code> trong <code>inittab</code>. Dòng ' +
            '<code>umount: devtmpfs busy - remounted read-only</code> bạn đã gặp y hệt ở Bài 47 và nó vô hại.' },

          { t: 'p', x:
            'Thử thêm một lần với QEMU 4.2.1 của Ubuntu, để chắc ảnh không phụ thuộc vào QEMU Buildroot build:' },

          { t: 'code', where: 'wsl', code:
            'output/images/start-qemu.sh --serial-only --use-system-qemu' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Booting Linux on physical CPU 0x0000000000 [0x410fd034]\n' +
            'Linux version 6.18.7 (cah8hc@HC-C-005W7) (aarch64-buildroot-linux-gnu-gcc.br_real (Buildroot 2026.02.3) 14.3.0, GNU ld (GNU Binutils) 2.44) #1 SMP Thu Oct  1 12:19:55 +07 2026\n' +
            '…\n' +
            'Run /sbin/init as init process\n' +
            '…\n' +
            'Welcome to Buildroot\n' +
            'buildroot login:' },

          { t: 'p', x:
            'Cùng một kernel (giờ build <code>12:19:55</code> trùng khớp), cùng rootfs, boot tới dấu nhắc trong khoảng ' +
            '<b>2,8 s</b> — chậm gấp đôi QEMU 10.2.0 nhưng vẫn đúng. Ảnh là sản phẩm độc lập; QEMU trong ' +
            '<code>output/host</code> chỉ là tiện ích. Đăng nhập rồi <code>poweroff</code> như lần trước.' },

          { t: 'p', x:
            'Giờ đặt hệ thống này cạnh rootfs tự dựng của Bài 59 — lời hứa cuối cùng của bài trước:' },

          { t: 'table',
            head: ['', 'Bài 59 — Makefile 47 dòng', 'Bài 60 — Buildroot'],
            rows: [
              ['Rootfs', '<code>rootfs.cpio.gz</code>, <b>1 156 KiB</b> trong RAM (initramfs)', '<code>rootfs.ext2</code>, ext4 trên đĩa virtio, <b>4,1 MB</b> đã dùng'],
              ['BusyBox', '1.38.0, static, 2 094 192 B', '1.37.0, dynamic, 817 608 B + glibc'],
              ['Thư viện C', 'Không có — mọi thứ static', 'glibc 2.42: <code>libc.so.6</code> 1 613 984 B, loader 202 464 B'],
              ['Init', 'BusyBox init + <code>rcS</code> tự viết', 'BusyBox init + 8 script SysV có sẵn: syslog, mạng DHCP, cron'],
              ['Kernel', '<code>~/bai38</code>, 49 342 976 B, build tay', '6.18.7, 13 236 736 B, một package trong cấu hình'],
              ['Toolchain', 'gcc 9.4.0 của Ubuntu', 'gcc 14.3.0 tự build, ghi phiên bản trong cấu hình'],
              ['Đăng nhập', 'Shell thẳng trên console', '<code>getty</code> → <code>login</code> → shell'],
              ['Build lần đầu', '17,4 s', '24 phút 41 s (cộng 28 phút tải về qua proxy)']
            ] },

          { t: 'p', x:
            'Hệ thống Buildroot lớn hơn, chậm build hơn hàng trăm lần, và đổi lại có những thứ Makefile của Bài 59 ' +
            'không bao giờ có: thư viện C dùng chung, mạng, log hệ thống, đăng nhập, và một toolchain thuộc về chính ' +
            'nó. Quan trọng hơn: thêm bất kỳ chương trình nào trong gần 3 000 package chỉ là bật một dòng trong ' +
            '<code>menuconfig</code>.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Đổi cấu hình: khi nào make lại là đủ, khi nào không',
        blocks: [
          { t: 'p', x:
            'Phần lý thuyết cuối nói Buildroot không đoán. Bước này kiểm chứng bốn trường hợp, mỗi trường hợp một ' +
            'thay đổi nhỏ. Giữ một bản sao <code>.config</code> gốc để so sánh và để quay lại. Trường hợp đầu tiên: ' +
            'không đổi gì cả.' },

          { t: 'code', where: 'wsl', code:
            'cp .config ../config.orig\n' +
            "time make > noop.log 2>&1\n" +
            "grep '>>>' noop.log | sed 's/\\x1b\\[[0-9;]*m//g'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m5.939s\n' +
            '…\n' +
            '>>>   Finalizing host directory\n' +
            '>>>   Finalizing target directory\n' +
            '>>>   Sanitizing RPATH in target tree\n' +
            '>>>   Sanity check in overlays\n' +
            '>>>   Generating root filesystems common tables\n' +
            '>>>   Generating filesystem image rootfs.ext2\n' +
            '>>>   Executing post-image script board/qemu/post-image.sh' },

          { t: 'p', x:
            '<b>6 giây</b>, và không một package nào được build lại — mọi <code>.stamp_installed</code> đều đã có. ' +
            'Nhưng khác với Makefile của Bài 59, Buildroot <b>không</b> in <code>Nothing to be done</code>: bảy bước ' +
            'cuối — hoàn thiện thư mục, đóng ảnh ext4, chạy script post-image — chạy lại ở mọi lần ' +
            '<code>make</code>. Đó là quy tắc \"dựng rootfs lại từ đầu, không vá nó\" của Bài 59, được Buildroot áp ' +
            'dụng cho ảnh cuối cùng.' },

          { t: 'p', x:
            'Trường hợp hai: đổi hostname. Dùng <code>utils/config</code> để sửa <code>.config</code> từ dòng lệnh — ' +
            'cùng công cụ với <code>scripts/config</code> của kernel ở Bài 41 — rồi <code>olddefconfig</code> để ' +
            'Kconfig kiểm tra lại các phụ thuộc:' },

          { t: 'code', where: 'wsl', code:
            'utils/config --set-str BR2_TARGET_GENERIC_HOSTNAME board-a\n' +
            'make olddefconfig > /dev/null\n' +
            'utils/diffconfig ../config.orig .config\n' +
            'time make > hostname.log 2>&1\n' +
            'cat output/target/etc/hostname' },

          { t: 'code', where: 'out', nocopy: true, code:
            ' BR2_TARGET_GENERIC_HOSTNAME "buildroot" -> "board-a"\n' +
            'real\t0m6.069s\n' +
            'board-a' },

          { t: 'cmdx', cmd: 'utils/config --set-str SYMBOL VALUE', rows: [
            ['utils/config', 'Script sửa <code>.config</code> mà không cần mở menu — tiện cho script và CI'],
            ['--set-str', 'Gán một giá trị chuỗi (có ngoặc kép trong <code>.config</code>). <code>-e</code> bật, <code>-d</code> tắt một symbol'],
            ['make olddefconfig', 'Đọc lại <code>.config</code>, áp mọi <code>select</code>/<code>depends on</code> và giá trị mặc định cho symbol mới (Bài 39)'],
            ['utils/diffconfig A B', 'In từng symbol khác nhau giữa hai file cấu hình']
          ] },

          { t: 'p', x:
            '<code>diffconfig</code> xác nhận đúng một dòng thay đổi. Vẫn <b>6 giây</b>, và hostname mới có mặt trong ' +
            '<code>/etc/hostname</code>. Thay đổi này đến được rootfs vì hostname được ghi vào ở bước \"Finalizing ' +
            'target directory\" — một bước chạy lại mỗi lần — không phải bởi một package có stamp.' },

          { t: 'p', x:
            'Trường hợp ba: bật một package mới. <code>dtc</code> — trình biên dịch Device Tree của Chặng 08 — lần ' +
            'này chạy được ngay trên thiết bị:' },

          { t: 'code', where: 'wsl', code:
            'cp .config ../config.hostname\n' +
            'utils/config -e BR2_PACKAGE_DTC -e BR2_PACKAGE_DTC_PROGRAMS\n' +
            'make olddefconfig > /dev/null\n' +
            'utils/diffconfig ../config.hostname .config\n' +
            'time make > dtc.log 2>&1\n' +
            "grep '>>> dtc' dtc.log | sed 's/\\x1b\\[[0-9;]*m//g'\n" +
            "ls output/target/usr/bin | grep -E 'dtc|fdt'" },

          { t: 'code', where: 'out', nocopy: true, code:
            ' BR2_PACKAGE_DTC n -> y\n' +
            '+BR2_PACKAGE_DTC_PROGRAMS y\n' +
            'real\t0m7.422s\n' +
            '>>> dtc 1.7.2 Extracting\n' +
            '>>> dtc 1.7.2 Patching\n' +
            '>>> dtc 1.7.2 Configuring\n' +
            '>>> dtc 1.7.2 Building\n' +
            '>>> dtc 1.7.2 Installing to staging directory\n' +
            '>>> dtc 1.7.2 Fixing libtool files\n' +
            '>>> dtc 1.7.2 Installing to target\n' +
            'dtc\n' +
            'fdtdump\n' +
            'fdtget\n' +
            'fdtoverlay\n' +
            'fdtput' },

          { t: 'p', x:
            '<b>7,4 giây</b>: chỉ <code>dtc</code> đi qua đủ chuỗi stamp, mọi package khác giữ nguyên. Không có dòng ' +
            '<code>Downloading</code>, dù <code>dtc</code> không có trong cấu hình lúc chạy <code>make source</code>: ' +
            'QEMU cần <code>host-dtc</code>, và hai package <code>dtc</code> (cho thiết bị) và <code>host-dtc</code> ' +
            '(cho máy build) dùng chung một tarball <code>dl/dtc/dtc-1.7.2.tar.xz</code> đã tải từ bước 3. ' +
            '<code>dtc</code> và các công cụ <code>fdt*</code> mà Bài 43 chạy trên WSL giờ nằm trong rootfs của thiết ' +
            'bị. Bật thêm một package là việc rẻ và an toàn.' },

          { t: 'p', x:
            'Trường hợp bốn — trường hợp mà bảng lý thuyết cảnh báo: tắt package đó đi.' },

          { t: 'code', where: 'wsl', code:
            'utils/config -d BR2_PACKAGE_DTC -d BR2_PACKAGE_DTC_PROGRAMS\n' +
            'make olddefconfig > /dev/null\n' +
            'utils/diffconfig ../config.hostname .config ; echo "diffconfig rc=$?"\n' +
            'time make > undtc.log 2>&1\n' +
            "ls output/target/usr/bin | grep -E 'dtc|fdt'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'diffconfig rc=0\n' +
            'real\t0m6.436s\n' +
            'dtc\n' +
            'fdtdump\n' +
            'fdtget\n' +
            'fdtoverlay\n' +
            'fdtput' },

          { t: 'p', x:
            '<code>diffconfig</code> không in gì: cấu hình đã quay về đúng trạng thái trước khi bật <code>dtc</code>. ' +
            '<code>make</code> chạy xong trong 6 giây, mã 0, không một lời cảnh báo. Và cả năm file <b>vẫn nằm đó</b>. ' +
            'Không chỉ trong <code>output/target</code> — kiểm tra bên trong ảnh ext4 vừa đóng:' },

          { t: 'code', where: 'wsl', code:
            "output/host/sbin/debugfs -R 'ls -l /usr/bin' output/images/rootfs.ext2 2>/dev/null | grep -E 'dtc|fdt'" },

          { t: 'code', where: 'out', nocopy: true, code:
            '    271  100755 (1)      0      0   142752  1-Oct-2026 11:54 dtc\n' +
            '    278  100755 (1)      0      0   18288  1-Oct-2026 11:54 fdtdump\n' +
            '    279  100755 (1)      0      0   18288  1-Oct-2026 11:54 fdtget\n' +
            '    280  100755 (1)      0      0   18288  1-Oct-2026 11:54 fdtoverlay\n' +
            '    281  100755 (1)      0      0   22384  1-Oct-2026 11:54 fdtput' },

          { t: 'cmdx', cmd: "debugfs -R 'ls -l /usr/bin' IMAGE", rows: [
            ['output/host/sbin/debugfs', '<code>debugfs</code> của e2fsprogs mà Buildroot đã build cho máy build — đọc được ảnh ext4 mà không cần <code>mount</code> (và không cần <code>sudo</code>)'],
            ["-R 'ls -l /usr/bin'", 'Chạy một lệnh <code>debugfs</code> rồi thoát: liệt kê thư mục <code>/usr/bin</code> bên trong ảnh'],
            ['2>/dev/null', 'Bỏ dòng phiên bản <code>debugfs</code> in ra stderr']
          ] },

          { t: 'p', x:
            'Ảnh vừa đóng — thứ bạn sẽ nạp vào thiết bị — vẫn chứa năm chương trình mà cấu hình nói là không có. Cột ' +
            '<code>0      0</code> là UID/GID root, cột giờ <code>11:54</code> là lúc chúng được cài ở trường hợp ba. Đây ' +
            'chính là bài học \"phụ thuộc bị khai thiếu\" của Bài 59, ở quy mô lớn: Buildroot không ghi lại package ' +
            'nào cài file nào vào <code>output/target</code>, nên không có cách nào gỡ chúng ra. Cấu hình và sản phẩm ' +
            'đã lệch nhau, một cách im lặng.' },

          { t: 'p', x:
            'Cách sửa duy nhất là build lại từ đầu. Đưa hostname về <code>buildroot</code> để cấu hình trùng hẳn với ' +
            '<code>../config.orig</code>, rồi <code>make clean all</code>. <code>clean</code> xoá toàn bộ ' +
            '<code>output/</code> nhưng giữ <code>dl/</code>, nên không tải lại gì:' },

          { t: 'code', where: 'wsl', code:
            'utils/config --set-str BR2_TARGET_GENERIC_HOSTNAME buildroot\n' +
            'make olddefconfig > /dev/null\n' +
            'cmp .config ../config.orig && echo "config identical to original"\n' +
            'time make clean all > rebuild.log 2>&1 ; echo "make rc=$?"\n' +
            "ls output/target/usr/bin | grep -E 'dtc|fdt' ; echo \"grep dtc rc=$?\"" },

          { t: 'code', where: 'out', nocopy: true, code:
            'config identical to original\n' +
            'real\t25m26.218s\n' +
            'user\t246m5.229s\n' +
            'sys\t18m44.343s\n' +
            'make rc=0\n' +
            'grep dtc rc=1' },

          { t: 'p', x:
            '<code>cmp</code> im lặng rồi in <code>config identical to original</code>: hai file trùng từng byte. ' +
            'Build lại tốn <b>25 phút 26 giây</b> — gần như y hệt lần đầu (24:41), vì phần tải về đã tách ra từ bước ' +
            '3 và <code>dl/</code> được giữ lại. <code>grep dtc rc=1</code>: không còn file nào khớp, rootfs sạch. ' +
            'Đây là cái giá của quy tắc \"khi nghi ngờ, build lại từ đầu\": 25 phút máy, không phải 25 phút người. ' +
            'Toàn bộ output của bước 4 và bước 5 trong bài này được chụp từ lần build lại này.' },

          { t: 'cal', kind: 'tip', title: 'Có cách nhanh hơn make clean all không?',
            x: 'Với riêng trường hợp này thì có: xoá tay năm file trong <code>output/target/usr/bin</code> rồi ' +
               '<code>make</code>. Nhưng đó là \"vá rootfs\" — bạn phải tự biết package đã cài những gì, ở đâu, kể cả ' +
               'thư viện và file cấu hình — và không ai kiểm chứng được bạn đã xoá đủ. Trong quá trình phát triển, ' +
               'nhiều người chấp nhận rủi ro đó để tiết kiệm thời gian. Trước khi <b>phát hành</b> một firmware, luôn ' +
               '<code>make clean all</code> từ một defconfig đã commit vào Git.' },

          { t: 'cal', kind: 'info', title: 'Dọn dẹp',
            x: '<code>~/bai60</code> chiếm khoảng <b>16 GB</b>: <b>15 GB</b> là <code>output/</code>, <b>1,2 GB</b> là ' +
               '<code>dl/</code>. <b>Hãy giữ nguyên nó</b> — Bài 61 viết package riêng và overlay trên chính cây ' +
               'Buildroot này, và nhờ <code>dl/</code> cùng toolchain đã build, những lần build sau chỉ tốn vài phút. ' +
               'Nếu thật sự cần chỗ, <code>make clean</code> giải phóng 15 GB nhưng giữ <code>dl/</code>; lần ' +
               '<code>make</code> sau sẽ lại mất khoảng 25 phút. Xoá các file log và <code>../config.*</code> tuỳ ý.' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Your PATH contains spaces, TABs, and/or newline (\\n) characters.</code> + <code>dependencies.mk:27: dependencies] Error 1</code>', 'WSL nối <code>PATH</code> của Windows (có <code>/mnt/c/Program Files/…</code>) vào <code>PATH</code> của Linux', '<code>export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin</code> trước khi <code>make</code>; hoặc đặt <code>appendWindowsPath = false</code> trong <code>/etc/wsl.conf</code>'],
        ['<code>You must install \'rsync\' on your build machine</code>', 'Thiếu một công cụ bắt buộc trong danh sách ở dòng 157 của <code>dependencies.sh</code>', '<code>sudo apt-get install -y rsync</code> (hoặc tên gói tương ứng), rồi <code>make</code> lại'],
        ['<code>make menuconfig</code> dừng với <code>curses.h: No such file or directory</code>', 'Thiếu header ncurses để biên dịch giao diện menu', '<code>sudo apt-get install -y libncurses-dev</code>'],
        ['<code>Proxy tunneling failed: Proxy server authentication failed</code> rồi <code>.stamp_downloaded] Error 1</code>', 'Proxy công ty từ chối kết nối tới site gốc và cả mirror <code>sources.buildroot.net</code> (gặp khi soạn bài)', 'Chạy lại: <code>until make source; do sleep 10; done</code> — file đã tải đúng hash được giữ lại'],
        ['<code>ERROR 404: Not Found</code> trong log tải về, nhưng build vẫn tiếp tục', 'Buildroot thử một URL trên mirror không có file đó, rồi chuyển sang URL kế tiếp', 'Không cần làm gì nếu dòng sau là <code>OK (sha256: …)</code>; chỉ là lỗi khi cả ba URL đều hỏng'],
        ['<code>gpg: WARNING: not a detached signature; file \'buildroot-….tar.xz\' was NOT verified!</code>', 'File <code>.sign</code> chỉ ký văn bản chứa checksum, không ký trực tiếp tarball', 'Bình thường — chạy thêm <code>sha256sum -c</code> với dòng <code>SHA256:</code> như bước 1'],
        ['Đã tắt một package trong <code>menuconfig</code>, nhưng chương trình vẫn còn trong rootfs', 'Buildroot không theo dõi file nào thuộc package nào; tắt package không gỡ file đã cài', '<code>make clean all</code> (giữ <code>dl/</code>, không tải lại)'],
        ['Đổi tuỳ chọn con của một package đã build, <code>make</code> không build lại nó', 'Package đã có <code>.stamp_built</code>; Buildroot không so lại cấu hình', '<code>make &lt;pkg&gt;-reconfigure</code> hoặc <code>&lt;pkg&gt;-rebuild</code>, rồi <code>make</code>'],
        ['Sửa file trong <code>output/target</code>, sau một lần build lại thì thay đổi biến mất', '<code>output/target</code> được dựng lại từ các package; nó không phải nơi để sửa tay', 'Dùng overlay rootfs hoặc script post-build (Bài 61)'],
        ['<code>start-qemu.sh</code> mở cửa sổ đồ hoạ hoặc báo lỗi hiển thị trên WSL', 'Chạy không có <code>--serial-only</code>, QEMU cố mở màn hình', '<code>output/images/start-qemu.sh --serial-only</code>']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<b>Buildroot</b> là một bộ Makefile cộng Kconfig: mỗi package một file <code>.mk</code> + <code>Config.in</code> + <code>.hash</code>, mọi lựa chọn là một symbol <code>BR2_…</code>. Bản <b>2026.02.3</b> (LTS) nặng <b>6 059 504 B</b>, giải nén ra <b>89 MB</b>, <b>2 786</b> package, <b>308</b> defconfig.',
      'Kiểm tra bản tải về bằng hai bước: <code>gpg --verify</code> chứng minh dòng checksum là thật, <code>sha256sum -c</code> chứng minh tarball khớp với nó. Mỗi package tải về sau đó cũng được kiểm <code>sha256</code> tự động.',
      '<code>qemu_aarch64_virt_defconfig</code> chỉ <b>19</b> dòng, bung ra <code>.config</code> <b>5 270</b> dòng. Thứ tự menu — Target → Toolchain → System → Kernel → Packages → Images — cũng là thứ tự phụ thuộc. Commit <b>defconfig</b>, không commit <code>.config</code>.',
      'Một lệnh <code>make</code>: <b>24 phút 41 giây</b> trên 16 CPU, <b>62</b> package (<b>49</b> là <code>host-</code>). Toolchain chiếm <b>47 %</b> thời gian, host-qemu <b>32 %</b>, kernel <b>16 %</b>, BusyBox <b>10 s</b>. gcc là <b>14.3.0</b> tự build — lỗ rò thứ năm của Bài 59 đã được bịt.',
      '<code>output/</code>: <code>build</code> (<b>13 GB</b>, mã nguồn + stamp), <code>host</code> (<b>1,2 GB</b>, toolchain + QEMU), <code>staging</code> (symlink vào sysroot), <code>target</code> (<b>4,4 MB</b>, chưa có quyền đúng), <code>images</code> (<b>21 MB</b>). Mỗi package đi qua <code>.stamp_downloaded</code> → <code>extracted</code> → <code>patched</code> → <code>configured</code> → <code>built</code> → <code>*_installed</code>.',
      'Ảnh boot tới <code>buildroot login:</code> trong <b>1,4 s</b> (QEMU 10.2.0) hoặc <b>2,8 s</b> (QEMU 4.2.1 của máy): BusyBox init + 8 script SysV, DHCP, khoảng <b>12 MB</b> RAM, rootfs dùng <b>4,1 MB</b>, file thuộc <code>root</code> nhờ <code>fakeroot</code>.',
      'Buildroot <b>không đoán</b>: <code>make</code> không đổi gì <b>6 s</b>, bật một package <b>7,4 s</b>, nhưng <b>tắt</b> một package thì file của nó vẫn nằm trong ảnh. <code>make clean all</code> giữ <code>dl/</code> và tốn <b>25 phút 26 giây</b> — khi nghi ngờ, build lại từ đầu.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Hệ thống hôm nay chỉ chứa những gì cộng đồng Buildroot đã đóng gói sẵn. <b>Bài 61 — Buildroot nâng cao</b> ' +
         'đưa chính code của bạn vào: viết một file <code>.mk</code> cho <code>temp_daemon</code> của Bài 24 để nó ' +
         'được build bằng toolchain 14.3.0 vừa dựng và tự xuất hiện trong <code>/usr/bin</code>; thêm một overlay để ' +
         'sửa rootfs mà không đụng vào <code>output/target</code>; một script post-build; một thư mục ' +
         '<code>patches/</code>; và <code>make savedefconfig</code> để cả hệ thống được mô tả bằng một file bạn commit ' +
         'vào Git. Nhờ <code>dl/</code> và toolchain đã có trong <code>~/bai60</code>, mỗi lần build lại ở đó chỉ ' +
         'tốn vài phút thay vì 25.' }
  ],

  quiz: [
    { q: 'Bạn chạy <code>make</code> lần đầu trong cây Buildroot trên WSL và nhận được <code>Your PATH contains spaces, TABs, and/or newline (\\n) characters.</code> Nguyên nhân có khả năng nhất?',
      opts: [
        'Thư mục chứa cây Buildroot có dấu cách trong tên',
        'WSL đã nối các thư mục của Windows như <code>/mnt/c/Program Files/…</code> vào <code>PATH</code> của Linux',
        'File <code>.config</code> bị lưu với ký tự xuống dòng kiểu Windows (CRLF)',
        'Thiếu gói <code>rsync</code>'
      ],
      a: 1,
      why: 'Thông báo nói đúng về biến <code>PATH</code>, không phải về thư mục làm việc hay <code>.config</code>. Mặc định WSL thêm <code>PATH</code> của Windows vào cuối <code>PATH</code> của Linux, và Windows có nhiều thư mục chứa dấu cách — máy soạn bài có 26 thư mục như vậy. Buildroot từ chối chạy vì các Makefile của nó không đặt <code>$PATH</code> trong ngoặc kép. Thiếu <code>rsync</code> cho một thông báo khác hẳn: <code>You must install \'rsync\'</code>.' },

    { q: '<code>configs/qemu_aarch64_virt_defconfig</code> không có dòng nào về toolchain, vậy mà Buildroot vẫn tự build gcc 14.3.0. Vì sao?',
      opts: [
        'Buildroot luôn dùng gcc mới nhất có trên máy build',
        'defconfig là cấu hình tối thiểu: chỉ ghi những gì khác mặc định; <code>make …_defconfig</code> điền giá trị mặc định cho mọi symbol còn lại, và mặc định của Toolchain type là \"Buildroot toolchain\"',
        'Dòng <code>BR2_aarch64=y</code> bắt buộc phải tự build toolchain',
        'Toolchain được khai trong <code>board/qemu/aarch64-virt/linux.config</code>'
      ],
      a: 1,
      why: 'Đây là quy tắc defconfig/<code>.config</code> của Bài 39 áp dụng cho Buildroot: 19 dòng đầu vào bung ra 5 270 dòng vì Kconfig điền mặc định cho mọi symbol không được nhắc tới. <code>BR2_TOOLCHAIN_BUILDROOT=y</code>, <code>BR2_GCC_VERSION="14.3.0"</code> đều là mặc định. Một <code>BR2_aarch64=y</code> vẫn có thể đi với toolchain ngoài; còn <code>linux.config</code> là cấu hình kernel, không liên quan tới toolchain.' },

    { q: 'Trong <code>output/target/bin</code>, <code>busybox</code> thuộc user của bạn (<code>cah8hc:cah8hc</code>). Sau khi boot ảnh trong QEMU, <code>ls -l /bin/busybox</code> lại in <code>root root</code>. Điều gì đã xảy ra?',
      opts: [
        'QEMU tự đổi chủ của mọi file thành root khi boot',
        'Kernel bỏ qua UID trên ext4 và coi mọi file là của root',
        'Khi đóng ảnh, Buildroot dùng <code>fakeroot</code> và bảng quyền của các package để ghi UID/GID và quyền đúng vào ext4; <code>output/target</code> chỉ là bản nháp không có quyền thật',
        '<code>init</code> chạy <code>chown -R root /</code> trong <code>rcS</code>'
      ],
      a: 2,
      why: 'Buildroot chạy hoàn toàn bằng user thường, nên không thể tạo file thuộc root trong <code>output/target</code>. Quyền thật được áp ở bước cuối, trong môi trường <code>fakeroot</code>, khi <code>mkfs.ext4</code> ghi ảnh — kể cả quyền <code>4755</code> (setuid) cho <code>busybox</code> lấy từ <code>busybox.mk</code> dòng 153. Đó là lý do có file <code>THIS_IS_NOT_YOUR_ROOT_FILESYSTEM</code>, và nó không có trong ảnh cuối.' },

    { q: 'Bạn bật <code>BR2_PACKAGE_DTC</code>, <code>make</code>, rồi tắt nó và <code>make</code> lại. Cả hai lần đều thoát mã 0. <code>dtc</code> có còn trong <code>rootfs.ext2</code> không?',
      opts: [
        'Không — Buildroot thấy package bị tắt nên xoá file của nó',
        'Không — ảnh được đóng lại từ đầu ở mỗi lần <code>make</code>',
        'Có — ảnh được đóng lại từ <code>output/target</code>, mà Buildroot không biết package nào đã cài file nào vào đó, nên file của dtc vẫn nằm lại',
        'Có, nhưng chỉ trong <code>output/target</code>, không có trong ảnh'
      ],
      a: 2,
      why: 'Bước 6 kiểm chứng bằng <code>debugfs</code>: năm file <code>dtc</code>, <code>fdt*</code> vẫn nằm trong <code>/usr/bin</code> của ảnh ext4 vừa đóng. Ảnh <b>có</b> được đóng lại mỗi lần (phương án 2 đúng nửa đầu), nhưng nó được đóng từ <code>output/target</code>, nơi Buildroot không ghi lại ai cài gì. Cách sửa duy nhất: <code>make clean all</code>.' },

    { q: 'Sau lần build đầu, <code>du</code> báo <code>output/build</code> 13 GB, <code>output/host</code> 1,2 GB, <code>output/images</code> 21 MB. Bạn cần giải phóng chỗ nhưng tuần sau còn build tiếp. Lệnh nào hợp lý nhất?',
      opts: [
        '<code>rm -rf dl</code> — vì nó chỉ là bản sao của các tarball',
        '<code>make clean</code> — xoá <code>output/</code>, giữ <code>dl/</code>, lần sau build lại không cần tải gì',
        '<code>rm -rf output/images</code> — vì đó là thứ lớn nhất',
        '<code>make distclean</code> — để có cây sạch như lúc mới giải nén'
      ],
      a: 1,
      why: '<code>output/images</code> chỉ 21 MB, xoá nó gần như không được gì. <code>dl/</code> (1,2 GB) là thứ đắt nhất để lấy lại — trên máy soạn bài nó tốn 56 lần thử và 28 phút qua proxy. <code>make clean</code> xoá đúng phần lớn (15 GB) và giữ phần đắt; bước 6 đo được lần build lại sau đó mất 25 phút 26 giây, không cần mạng. <code>distclean</code> còn xoá cả <code>.config</code> và <code>dl/</code> mặc định nằm trong cây.' },

    { q: 'Lần build đầu của bài này tốn 24 phút 41 giây. Theo <code>build-time.log</code>, phần nào chiếm nhiều thời gian nhất?',
      opts: [
        'BusyBox, vì nó có hơn 400 applet',
        'Kernel Linux, vì nó là package lớn nhất',
        'Toolchain và các công cụ nó cần (binutils, hai lượt gcc, glibc…), khoảng 47 %',
        'Đóng ảnh ext4'
      ],
      a: 2,
      why: 'Toolchain chiếm 683 s (47 %), host-qemu và các phụ thuộc riêng của nó 474 s (32 %), kernel 239 s (16 %), BusyBox chỉ 10 s. Đây là lý do lần build đầu luôn đắt nhất: toolchain chỉ build một lần, mọi thay đổi sau đó — như bật <code>dtc</code> ở bước 6 — chỉ tốn vài giây. Nó cũng là lý do Buildroot cho phép dùng một toolchain ngoài đã build sẵn.' }
  ]
});

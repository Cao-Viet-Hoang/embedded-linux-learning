/* Bài 67 — Dự án tổng hợp
   Chặng 13 — Thành phẩm và nghề nghiệp
   Ghép sáu lớp đã học thành một sản phẩm tên "Thermo": U-Boot 2026.01 + kernel 6.18.45 tuỳ biến (fragment) +
   Device Tree tuỳ biến (cây QEMU virt + sensor.dtsi) + driver tsensor của Bài 54 (kernel-module) + daemon
   temp_daemon của Bài 24 đọc /dev/tsensor0 + rootfs Buildroot 2026.02.3 — tất cả từ một cây br2-external
   ~/bai67/thermo và một defconfig; đóng gói thành bản phát hành có README, MANIFEST, SHA256SUMS, legal-info.
   Mọi số liệu đo 2026-10-31 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, 16 CPU, QEMU 4.2.1 hệ thống).
   - Toolchain: Bootlin "aarch64 glibc stable 2025.08-1" (GCC 14.3.0) qua BR2_TOOLCHAIN_EXTERNAL_BOOTLIN — nhờ
     nó U-Boot được build từ mã nguồn, điều Bài 66 không làm được với GCC 9.4 của Ubuntu 20.04.
   - Kernel 6.18.45 lấy từ tarball đã kiểm chứng của Bài 38 (chép vào dl/linux/, kèm linux.hash riêng), không
     dùng lại cây đã build ~/bai38 (không đổi gì trong ~/bai38).
   - Lần boot đầu hỏng thật: U-Boot qemu-arm không có biến fdt_addr_r nên boot/pxe_utils.c bỏ qua dòng
     "fdt" của extlinux.conf và đưa cho kernel cây của QEMU (Machine model: linux,dummy-virt). Sửa bằng một
     patch một dòng trong board/thermo/patches/uboot; uboot-rebuild không áp patch (đúng như Bài 61), phải
     uboot-dirclean.
   - Ba lần build sạch từ cùng cây (chỉ khác model/offset/LICENSE): 6m51s, 6m54s, 6m55s; bài trích lần cuối.
   - ~/bai67 (~4,2 GB: buildroot-2026.02.3 với dl/ 368M + out/ 4,2G) là nháp, xoá được; giữ ~/bai67/thermo
     (176K) nếu muốn dùng lại sản phẩm ở Bài 68–69. */

Lesson.register({
  id: 'bai-67',
  title: 'Dự án tổng hợp',
  minutes: 60,
  practice: 'Thực hành 60 phút',
  level: 'Nâng cao',

  intro:
    'Sáu mươi sáu bài vừa qua, mỗi bài dựng một mảnh: U-Boot ở Chặng 06, kernel ở Chặng 07, Device Tree ở ' +
    'Chặng 08, rootfs ở Chặng 09, driver ở Chặng 10, Buildroot ở Chặng 11. Nhưng mỗi mảnh đều được thử ' +
    '<b>riêng</b>: driver nạp bằng <code>insmod</code> gõ tay trong một initramfs dựng tay, daemon chạy trên ' +
    'WSL, U-Boot boot một kernel không liên quan gì tới rootfs Buildroot. Một nhà tuyển dụng sẽ không hỏi bạn ' +
    '"đã từng build kernel chưa" mà hỏi "bạn đã từng giao một <b>hệ thống</b> chạy được chưa".<br><br>' +
    'Bài này ghép tất cả thành một sản phẩm nhỏ tên <b>Thermo</b> — một cảm biến nhiệt độ có mạng. Bật nguồn là ' +
    'U-Boot tự tìm kernel và Device Tree <i>của bạn</i> trên đĩa, kernel thấy node cảm biến, driver ' +
    '<code>tsensor</code> tự được nạp, daemon tự khởi động và trả lời qua TCP cổng 9006 với giá trị đọc từ ' +
    '<code>/dev/tsensor0</code>. Mọi thứ đi ra từ <b>một</b> cây thư mục và <b>một</b> lệnh <code>make</code> ' +
    'trong <b>6 phút 55 giây</b>. Lần boot đầu tiên sẽ hỏng — đúng như sản phẩm thật — và bạn sẽ dùng chính ' +
    'các kỹ năng của Chặng 12 để tìm ra một biến môi trường U-Boot bị thiếu.',

  goals: [
    'Thiết kế cây br2-external cho cả một sản phẩm: bootloader, kernel, Device Tree, driver, daemon, ảnh đĩa — ' +
      'và nói được mỗi file thuộc lớp nào, vì sao nằm ở đó.',
    'Đóng gói một kernel module ngoài cây bằng hạ tầng <code>kernel-module</code> của Buildroot, và giải thích ' +
      'vì sao nó tự được nạp lúc boot mà không cần dòng <code>insmod</code> nào.',
    'Dùng một external toolchain (Bootlin, GCC 14.3.0) để build U-Boot từ mã nguồn, và boot nó bằng ' +
      '<code>extlinux.conf</code> trên một ảnh đĩa có bảng phân vùng.',
    'Chẩn đoán một lần boot hỏng theo từng lớp — từ triệu chứng (<code>open /dev/tsensor0: No such file</code>) ' +
      'ngược về nguyên nhân (U-Boot thiếu <code>fdt_addr_r</code>) — và sửa bằng một patch đúng chỗ.',
    'Biết lệnh build lại nào ứng với thay đổi nào, và chứng minh rằng một <code>make</code> trơn có thể giao ' +
      'ra ảnh cũ mà không báo lỗi.',
    'Đóng gói bản phát hành: <code>savedefconfig</code>, <code>legal-info</code>, README, MANIFEST và ' +
      '<code>SHA256SUMS</code> kiểm tra được.'
  ],

  blocks: [

    /* ============================================================
       1. SẢN PHẨM
       ============================================================ */
    { t: 'h2', x: 'Sản phẩm Thermo: sáu lớp, sáu chặng' },

    { t: 'p', x:
      'Một "dự án tổng hợp" dễ biến thành một danh sách việc vụn. Tránh điều đó bằng cách bắt đầu từ thứ người ' +
      'dùng nhìn thấy: Thermo là một hộp nhỏ cắm mạng; ai hỏi nó qua TCP cổng 9006 thì nhận lại một dòng ' +
      '<code>temperature=47.0 samples=N</code>. Mọi lớp phần mềm bên dưới tồn tại chỉ để dòng đó đúng. Đây là ' +
      'cách người làm sản phẩm thật nghĩ: bắt đầu từ yêu cầu, rồi hỏi mỗi lớp phải đóng góp gì.' },

    { t: 'table',
      head: ['Lớp', 'Trong Thermo', 'Học ở', 'Thay đổi so với lúc học'],
      rows: [
        ['Bootloader', 'U-Boot 2026.01, <code>qemu_arm64_defconfig</code> + 1 fragment + 1 patch', 'Chặng 06 (Bài 33–36)',
         'Build bằng Buildroot với GCC 14.3.0; boot bằng <code>extlinux.conf</code> thay vì <code>bootcmd</code> gõ tay'],
        ['Kernel', 'Linux 6.18.45, cấu hình <code>aarch64-virt</code> của Buildroot + fragment 4 dòng', 'Chặng 07 (Bài 37–41)',
         'Không dùng <code>defconfig</code> 4,6 GB của Bài 40 mà một cấu hình sản phẩm gọn; <code>Image</code> 13 MB'],
        ['Device Tree', '<code>thermo.dts</code> = cây QEMU <code>virt</code> + <code>sensor.dtsi</code>', 'Chặng 08 (Bài 42–45)',
         'Được build <b>trong</b> kernel và cài vào <code>/boot</code>, không truyền bằng <code>-dtb</code>'],
        ['Driver', '<code>tsensor.ko</code> — đúng file 245 dòng của Bài 54', 'Chặng 10 (Bài 50–54)',
         'Không <code>insmod</code> tay: <code>mdev</code> nạp nó theo <code>modalias</code> lúc boot'],
        ['Daemon', '<code>temp_daemon</code> của Bài 24, sửa để đọc <code>/dev/tsensor0</code>', 'Chặng 03 (Bài 24), Bài 61',
         'Giá trị không còn là số giả trong vòng lặp mà đi từ Device Tree qua driver'],
        ['Rootfs + build', 'Buildroot 2026.02.3, BusyBox init, ext4 trong ảnh đĩa có phân vùng', 'Chặng 09, Chặng 11',
         'Một cây br2-external chứa <b>cả</b> sản phẩm, không chỉ một package']
      ] },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Kiến trúc Thermo: giá trị nhiệt độ đi từ Device Tree qua driver tsensor, file thiết bị /dev/tsensor0, daemon temp_daemon tới máy khách TCP">' +
        '<rect class="d-box" x="20" y="20" width="680" height="60" rx="8"/>' +
        '<text class="d-t" x="40" y="44">Máy khách (máy host)</text>' +
        '<text class="d-tm" x="40" y="64">echo GET | nc -q1 127.0.0.1 19006  →  temperature=47.0 samples=2</text>' +
        '<line class="d-line" x1="360" y1="80" x2="360" y2="100"/>' +
        '<path class="d-arrow" d="M360,106 l-4,-8 h8 z"/>' +
        '<rect class="d-box-g" x="20" y="108" width="680" height="52" rx="8"/>' +
        '<text class="d-t" x="40" y="130">Userspace — temp_daemon (S60temp_daemon khởi động)</text>' +
        '<text class="d-ts" x="40" y="148">luồng đo: pread(/dev/tsensor0) mỗi 200 ms · vòng epoll: trả lời trên cổng 9006</text>' +
        '<line class="d-line" x1="360" y1="160" x2="360" y2="176"/>' +
        '<path class="d-arrow" d="M360,182 l-4,-8 h8 z"/>' +
        '<rect class="d-box-p" x="20" y="184" width="680" height="52" rx="8"/>' +
        '<text class="d-t" x="40" y="206">Kernel — tsensor.ko (mdev nạp theo modalias)</text>' +
        '<text class="d-ts" x="40" y="224">probe() đọc learn,offset-mdeg → ts_read() trả "47000\\n" cho mỗi read()</text>' +
        '<line class="d-line" x1="360" y1="236" x2="360" y2="252"/>' +
        '<path class="d-arrow" d="M360,258 l-4,-8 h8 z"/>' +
        '<rect class="d-box-a" x="20" y="260" width="680" height="52" rx="8"/>' +
        '<text class="d-t" x="40" y="282">Device Tree — thermo.dtb (U-Boot nạp từ /boot)</text>' +
        '<text class="d-tm" x="40" y="300">sensor@b000000 { compatible = "learn,temp-sensor"; learn,offset-mdeg = &lt;47000&gt;; }</text>' +
        '</svg>',
      cap: 'Đọc hình từ dưới lên: con số 47 000 được viết <b>một lần</b>, trong Device Tree. Driver, daemon và ' +
           'máy khách chỉ chuyển tiếp nó. Đổi phần cứng (hoặc giá trị hiệu chuẩn) chỉ cần đổi một dòng DTS — ' +
           'đúng lời hứa Bài 42 đưa ra khi giải thích vì sao Device Tree ra đời.' },

    { t: 'cal', kind: 'why', title: 'Vì sao chọn đúng những mảnh cũ, không viết mảnh mới',
      x: 'Dự án tổng hợp không kiểm tra bạn viết được driver hay daemon — Chặng 03 và Chặng 10 đã làm việc đó. Nó ' +
         'kiểm tra những thứ <b>chỉ xuất hiện khi ghép</b>: driver được nạp bởi ai, daemon khởi động trước hay sau ' +
         'driver, U-Boot lấy Device Tree từ đâu, một thay đổi ở lớp này phải build lại những gì. Dùng lại đúng ' +
         'file <code>tsensor.c</code> của Bài 54 (md5 không đổi) và <code>temp_daemon.c</code> của Bài 24 (thêm ' +
         '11 dòng, bớt 1) giữ cho mọi lỗi bạn gặp hôm nay là lỗi <i>ghép nối</i>, không phải lỗi của một mảnh.' },

    /* ============================================================
       2. MỘT CÂY CHO CẢ SẢN PHẨM
       ============================================================ */
    { t: 'h2', x: 'Một cây br2-external cho cả sản phẩm' },

    { t: 'p', x:
      'Bài 61 đã dùng br2-external cho <b>một</b> package. Ở đây nó chứa toàn bộ thứ làm nên Thermo, còn cây ' +
      'Buildroot chỉ là "công cụ" — giống như bạn không sửa mã nguồn của <code>gcc</code> để viết chương trình C. ' +
      'Nguyên tắc: <b>mọi thứ riêng của sản phẩm nằm trong cây của bạn, và được quản lý bằng Git</b>; cây ' +
      'Buildroot có thể xoá và tải lại bất cứ lúc nào. Đây là hình dạng cuối cùng của cây ' +
      '<code>~/bai67/thermo</code> (25 file):' },

    { t: 'code', where: 'out', nocopy: true, name: 'cây ~/bai67/thermo khi xong bài', code:
      'thermo/\n' +
      '├── external.desc  Config.in  external.mk     ← khung br2-external (Bài 61)\n' +
      '├── configs/thermo_defconfig                   ← "công thức" của cả sản phẩm\n' +
      '├── board/thermo/\n' +
      '│   ├── thermo.dts  sensor.dtsi                ← Device Tree\n' +
      '│   ├── linux.fragment                         ← 4 dòng thêm vào cấu hình kernel\n' +
      '│   ├── uboot.fragment                         ← 2 dòng thêm vào cấu hình U-Boot\n' +
      '│   ├── genimage.cfg                           ← bố cục ảnh đĩa\n' +
      '│   ├── overlay/boot/extlinux/extlinux.conf    ← U-Boot đọc file này lúc boot\n' +
      '│   └── patches/linux/linux.hash               ← tổng kiểm tra của tarball kernel\n' +
      '│       patches/uboot/0001-qemu-arm-add-fdt_addr_r.patch   ← (thêm ở Bước 3)\n' +
      '├── package/tsensor/      Config.in  tsensor.mk\n' +
      '├── package/temp-daemon/  Config.in  temp-daemon.mk  S60temp_daemon\n' +
      '├── src/tsensor/          tsensor.c  Kbuild  LICENSE\n' +
      '├── src/temp-daemon/      temp_daemon.c  Makefile  LICENSE\n' +
      '├── README.md\n' +
      '└── release.sh' },

    { t: 'p', x:
      'Cây ở trên là sơ đồ viết tay để dễ đọc, không phải đầu ra của một lệnh. So với Bài 61 có ba thay đổi ' +
      'về tổ chức đáng giải thích:' },

    { t: 'table',
      head: ['Quyết định', 'Bài 61 làm', 'Thermo làm', 'Vì sao'],
      rows: [
        ['Mã nguồn của package', 'Tarball "upstream" + <code>_SITE_METHOD = file</code> + <code>.hash</code>',
         '<code>src/</code> trong cùng cây + <code>_SITE_METHOD = local</code>',
         'Ở Bài 61 bạn đóng vai người đóng gói phần mềm của <i>người khác</i>. Ở đây driver và daemon là mã của chính ' +
         'sản phẩm, sửa hằng ngày; <code>local</code> chép thư mục bằng <code>rsync</code> mỗi lần build, không cần ' +
         'đóng tarball, không cần hash.'],
        ['Toolchain', 'Buildroot tự build GCC 14.3.0 (11 phút)', '<b>External</b>: toolchain Bootlin dựng sẵn, cũng GCC 14.3.0',
         'Tải một tarball 92 MB thay vì build 47 % thời gian. Và nó mới đủ để build U-Boot 2026.01 — thứ GCC 9.4 ' +
         'của Ubuntu 20.04 bị từ chối ở Bài 66.'],
        ['Kernel', '6.18.7 tải từ kernel.org', '6.18.45 — <b>đúng tarball</b> đã kiểm chữ ký ở Bài 38',
         'Sản phẩm phải dùng phiên bản đã được kiểm chứng. Tarball được chép vào <code>dl/linux/</code> nên không cần ' +
         'tải lại; file <code>linux.hash</code> riêng bảo đảm không ai thay nó bằng một bản khác.']
      ] },

    { t: 'cal', kind: 'info', title: 'external toolchain là gì, và vì sao Bootlin',
      x: 'Từ Bài 25 bạn biết một toolchain chéo gồm gcc, binutils, thư viện C và header kernel. Buildroot có hai ' +
         'cách lấy nó: <b>internal</b> (tự build từ mã nguồn — Bài 60 đo 683 giây) và <b>external</b> (dùng một ' +
         'toolchain đã build sẵn, Buildroot chỉ chép thư viện C vào rootfs). Bootlin — công ty đứng sau nhiều tài ' +
         'liệu đào tạo Embedded Linux — phát hành sẵn toolchain cho hàng chục kiến trúc, mỗi bản có tên dạng ' +
         '<code>aarch64--glibc--stable-2025.08-1</code>, và Buildroot biết sẵn URL lẫn sha256 của chúng ' +
         '(<code>toolchain/toolchain-external/toolchain-external-bootlin/</code>). Kiểm tra danh sách bạn có thể ' +
         'chọn bằng <code>grep "config BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64" -A1 …/Config.in.options</code>.' },

    /* ============================================================
       3. TỪ BẬT NGUỒN TỚI CỔNG 9006
       ============================================================ */
    { t: 'h2', x: 'Từ lúc bật nguồn tới cổng 9006: ai giao gì cho ai' },

    { t: 'p', x:
      'Ở Bài 66 bạn gõ tay một <code>bootcmd</code> trỏ thẳng vào <code>Image</code> và initramfs trên một ổ ' +
      'không có bảng phân vùng. Một sản phẩm không thể làm vậy: <code>bootcmd</code> viết cứng địa chỉ và tên ' +
      'file nằm trong flash của bootloader, nên đổi tên kernel là phải nạp lại bootloader. Thermo dùng cách ' +
      'của các bản phân phối: U-Boot tự <b>quét</b> các ổ đĩa, tìm file <code>/boot/extlinux/extlinux.conf</code> ' +
      'trên phân vùng có cờ <i>bootable</i>, và làm theo file đó. File này nằm <b>trong rootfs</b>, nên nó đi cùng ' +
      'kernel mà nó mô tả:' },

    { t: 'code', where: 'file', name: '~/bai67/thermo/board/thermo/overlay/boot/extlinux/extlinux.conf', code:
      'label thermo\n' +
      '\tkernel /boot/Image\n' +
      '\tfdt /boot/thermo.dtb\n' +
      '\tappend root=/dev/vda1 rootwait console=ttyAMA0' },

    { t: 'cmdx', cmd: 'extlinux.conf', title: 'Bốn dòng, bốn câu trả lời cho U-Boot', rows: [
      ['label thermo', 'Một mục boot. File có thể có nhiều mục (ví dụ kernel cũ để quay lại); U-Boot chọn mục đầu tiên nếu không ai can thiệp.', 'Bài 69 (OTA) sẽ dựa vào ý tưởng nhiều mục'],
      ['kernel /boot/Image', 'Đường dẫn <b>trên phân vùng đang quét</b>, không phải trên máy build. U-Boot nạp nó vào <code>kernel_addr_r</code>.', 'Đọc ext4 bằng driver của chính U-Boot'],
      ['fdt /boot/thermo.dtb', 'Device Tree sẽ đưa cho kernel. U-Boot nạp nó vào địa chỉ trong biến <code>fdt_addr_r</code>.', 'Bước 3 sẽ cho thấy dòng này bị bỏ qua <b>im lặng</b> khi biến đó không có'],
      ['append root=/dev/vda1 rootwait console=ttyAMA0', 'Dòng lệnh kernel. <code>vda1</code> = phân vùng 1 của ổ virtio đầu tiên; <code>rootwait</code> đợi ổ đĩa xuất hiện thay vì panic ngay.', 'Bài 41 đã đọc từng tham số này']
    ] },

    { t: 'p', x:
      'Để U-Boot quét được, <code>Image</code> và <code>thermo.dtb</code> phải nằm trong <code>/boot</code> của ' +
      'rootfs (<code>BR2_LINUX_KERNEL_INSTALL_TARGET=y</code>), và rootfs phải nằm trong một ảnh đĩa có bảng ' +
      'phân vùng MBR. Công cụ dựng ảnh đĩa đó là <b><code>genimage</code></b>: bạn mô tả bố cục bằng một file ' +
      'cấu hình, nó ghép các ảnh con (<code>rootfs.ext4</code>) thành <code>disk.img</code>:' },

    { t: 'code', where: 'file', name: '~/bai67/thermo/board/thermo/genimage.cfg', code:
      'image disk.img {\n' +
      '\thdimage {\n' +
      '\t}\n' +
      '\n' +
      '\tpartition rootfs {\n' +
      '\t\tpartition-type = 0x83\n' +
      '\t\timage = "rootfs.ext4"\n' +
      '\t\tbootable = true\n' +
      '\t}\n' +
      '}' },

    { t: 'p', x:
      '<code>hdimage</code> = ảnh ổ cứng có bảng phân vùng (MBR mặc định). Một phân vùng duy nhất, kiểu ' +
      '<code>0x83</code> (Linux), chứa nguyên <code>rootfs.ext4</code>, và có cờ <code>bootable</code> — chính cờ ' +
      'mà U-Boot tìm khi quét. Trên một bo mạch thật, file này thường có thêm một phân vùng FAT cho firmware và ' +
      'bootloader; ở QEMU, U-Boot nằm trong flash (<code>-bios</code>) nên không cần.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Chuỗi khởi động của Thermo: QEMU nạp u-boot.bin vào flash, U-Boot quét ổ virtio, đọc extlinux.conf, nạp Image và thermo.dtb, kernel mount vda1, init chạy S10mdev nạp tsensor rồi S60temp_daemon">' +
        '<rect class="d-box-w" x="20" y="20" width="160" height="70" rx="8"/>' +
        '<text class="d-t" x="100" y="46" text-anchor="middle">U-Boot 2026.01</text>' +
        '<text class="d-tm" x="100" y="66" text-anchor="middle">-bios u-boot.bin</text>' +
        '<text class="d-ts" x="100" y="82" text-anchor="middle">quét virtio → part 1</text>' +
        '<line class="d-line" x1="180" y1="55" x2="206" y2="55"/><path class="d-arrow" d="M212,55 l-8,-4 v8 z"/>' +
        '<rect class="d-box" x="214" y="20" width="160" height="70" rx="8"/>' +
        '<text class="d-t" x="294" y="46" text-anchor="middle">extlinux.conf</text>' +
        '<text class="d-tm" x="294" y="66" text-anchor="middle">kernel · fdt · append</text>' +
        '<text class="d-ts" x="294" y="82" text-anchor="middle">trong /boot của rootfs</text>' +
        '<line class="d-line" x1="374" y1="55" x2="400" y2="55"/><path class="d-arrow" d="M406,55 l-8,-4 v8 z"/>' +
        '<rect class="d-box-p" x="408" y="20" width="292" height="70" rx="8"/>' +
        '<text class="d-t" x="554" y="46" text-anchor="middle">Linux 6.18.45-thermo</text>' +
        '<text class="d-tm" x="554" y="66" text-anchor="middle">Machine model: Thermo board (QEMU virt)</text>' +
        '<text class="d-ts" x="554" y="82" text-anchor="middle">tạo platform_device b000000.sensor, mount vda1</text>' +
        '<line class="d-line" x1="554" y1="90" x2="554" y2="116"/><path class="d-arrow" d="M554,122 l-4,-8 h8 z"/>' +
        '<rect class="d-box" x="408" y="124" width="292" height="56" rx="8"/>' +
        '<text class="d-t" x="554" y="148" text-anchor="middle">/sbin/init (BusyBox) → /etc/init.d/rcS</text>' +
        '<text class="d-ts" x="554" y="166" text-anchor="middle">chạy S??* theo thứ tự tên, như Bài 49</text>' +
        '<line class="d-line" x1="408" y1="152" x2="388" y2="152"/><line class="d-line" x1="388" y1="152" x2="388" y2="214"/>' +
        '<line class="d-line" x1="388" y1="214" x2="380" y2="214"/><path class="d-arrow" d="M374,214 l8,-4 v8 z"/>' +
        '<rect class="d-box-a" x="20" y="190" width="354" height="48" rx="8"/>' +
        '<text class="d-t" x="40" y="210">S10mdev: modprobe theo modalias</text>' +
        '<text class="d-tm" x="40" y="228">of:N*T*Clearn,temp-sensor → tsensor.ko</text>' +
        '<rect class="d-box-g" x="20" y="246" width="354" height="48" rx="8"/>' +
        '<text class="d-t" x="40" y="266">S60temp_daemon: start-stop-daemon</text>' +
        '<text class="d-tm" x="40" y="284">open("/dev/tsensor0") · listen :9006</text>' +
        '<text class="d-ts" x="408" y="230">S10 chạy trước S60: driver phải có trước</text>' +
        '<text class="d-ts" x="408" y="248">khi daemon mở file thiết bị. Thứ tự này là</text>' +
        '<text class="d-ts" x="408" y="266">một phần của thiết kế, không phải tình cờ.</text>' +
        '</svg>',
      cap: 'Mỗi mũi tên là một "hợp đồng" giữa hai lớp. U-Boot phải tìm được file kernel tên gì; kernel phải nhận ' +
           'đúng Device Tree; mdev phải nạp driver <b>trước</b> khi daemon mở <code>/dev/tsensor0</code>. Hỏng một ' +
           'hợp đồng là hỏng cả chuỗi, và triệu chứng thường xuất hiện ở lớp trên cùng.' },

    /* ============================================================
       4. DRIVER TỰ ĐƯỢC NẠP
       ============================================================ */
    { t: 'h2', x: 'Driver ngoài cây trong Buildroot, và vì sao nó tự được nạp' },

    { t: 'p', x:
      'Ở Bài 50–58 bạn build module bằng một Makefile gọi <code>make -C ~/bai38/linux-6.18.45 M=$(PWD)</code>. ' +
      'Buildroot có sẵn hạ tầng <b><code>kernel-module</code></b> làm đúng việc đó, nhưng với kernel <i>mà nó ' +
      'vừa build</i> và toolchain của nó. Toàn bộ file <code>.mk</code> của driver chỉ có thế này:' },

    { t: 'code', where: 'file', name: '~/bai67/thermo/package/tsensor/tsensor.mk', lang: 'make', code:
      '################################################################################\n' +
      '#\n' +
      '# tsensor\n' +
      '#\n' +
      '################################################################################\n' +
      '\n' +
      'TSENSOR_VERSION = 1.0\n' +
      'TSENSOR_SITE = $(BR2_EXTERNAL_THERMO_PATH)/src/tsensor\n' +
      'TSENSOR_SITE_METHOD = local\n' +
      'TSENSOR_LICENSE = GPL-2.0\n' +
      'TSENSOR_LICENSE_FILES = LICENSE\n' +
      '\n' +
      '$(eval $(kernel-module))\n' +
      '$(eval $(generic-package))' },

    { t: 'cmdx', cmd: 'tsensor.mk', rows: [
      ['_SITE_METHOD = local', 'Mã nguồn là một thư mục trên máy build; Buildroot <code>rsync</code> nó vào <code>output/build/tsensor-1.0</code> mỗi lần cần.', 'Không tarball, không <code>.hash</code>'],
      ['_LICENSE_FILES = LICENSE', 'File giấy phép trong thư mục nguồn. <code>make legal-info</code> chép nó vào bản phát hành.', 'Thiếu dòng này → cảnh báo ở Bước 5'],
      ['$(eval $(kernel-module))', 'Thêm các bước: gọi Kbuild với <code>M=</code> trỏ vào thư mục nguồn, rồi <code>modules_install</code> vào <code>$(TARGET_DIR)</code>. Tự thêm phụ thuộc vào <code>linux</code>.', 'Theo <code>docs/manual/adding-packages-kernel-module.adoc</code>'],
      ['$(eval $(generic-package))', 'Vẫn bắt buộc: <code>kernel-module</code> chỉ <i>bổ sung</i> bước, phần tải/giải nén/stamp vẫn là của <code>generic-package</code>.', 'Bài 61 đã dùng nó cho daemon']
    ] },

    { t: 'p', x:
      'Thư mục nguồn chỉ cần <code>tsensor.c</code> và một file <code>Kbuild</code> một dòng, ' +
      '<code>obj-m := tsensor.o</code> — đúng dòng đầu của Makefile Bài 54. Không cần phần ' +
      '<code>KDIR</code>/<code>CROSS_COMPILE</code> nữa vì Buildroot truyền chúng. Bỏ luôn ' +
      '<code>CFLAGS_tsensor.o := -DDEBUG</code>: bản sản phẩm không in dòng <code>dev_dbg</code>.' },

    { t: 'p', x:
      'Câu hỏi thú vị hơn: ai gọi <code>insmod</code>? Không ai cả. Khi kernel tạo platform device ' +
      '<code>b000000.sensor</code> từ Device Tree, nó gửi một sự kiện <i>uevent</i> kèm chuỗi ' +
      '<code>MODALIAS=of:N…T…Clearn,temp-sensor</code>. Bài 44 đã cho bạn thấy chuỗi này nằm trong ' +
      '<code>/sys/…/modalias</code>, và Bài 50 thấy <code>MODULE_DEVICE_TABLE(of, …)</code> biến bảng ' +
      '<code>of_match_table</code> thành dòng <code>alias:</code> trong <code>modinfo</code>. Ba mảnh đó, lần đầu ' +
      'tiên được ghép:' },

    { t: 'table',
      head: ['Bước', 'Ai làm', 'Bằng chứng bạn sẽ thấy ở Bước 2–3'],
      rows: [
        ['1. Build: bảng <code>of_match_table</code> → dòng <code>alias</code> trong <code>.ko</code>', '<code>modpost</code> (Bài 50)', '<code>modinfo</code>: <code>alias: of:N*T*Clearn,temp-sensor</code>'],
        ['2. Cài: gom alias của mọi module vào một file', '<code>depmod</code> chạy trong target-finalize của Buildroot', '<code>modules.alias</code>: <code>alias of:N*T*Clearn,temp-sensor tsensor</code>'],
        ['3. Boot: tìm mọi thiết bị chưa có driver', '<code>S10mdev</code>: <code>find /sys/ -name modalias | xargs … modprobe -abq</code>', '<code>lsmod</code> có <code>tsensor</code>; <code>dmesg</code> có <code>probe</code>'],
        ['4. Nạp: <code>modprobe</code> tra alias, gọi <code>init_module</code>', 'BusyBox <code>modprobe</code>', '<code>/dev/tsensor0</code> xuất hiện (mdev tạo node)']
      ] },

    { t: 'cal', kind: 'tip', title: 'modprobe — "người thứ sáu" mà Bài 50 chỉ nhắc tên',
      x: 'Bài 50 dạy năm công cụ <code>insmod lsmod rmmod modinfo dmesg</code> và cố ý bỏ <code>modprobe</code>, ' +
         'vì initramfs dựng tay không có <code>modules.dep</code>/<code>modules.alias</code>. Rootfs Buildroot có đủ ' +
         'cả hai, nên đây là lần đầu <code>modprobe</code> làm việc thật. Khác biệt duy nhất cần nhớ: ' +
         '<code>insmod</code> nhận <b>đường dẫn file</b>; <code>modprobe</code> nhận <b>tên hoặc alias</b> và tự ' +
         'tìm file trong <code>/lib/modules/$(uname -r)/</code> — vì vậy <code>uname -r</code> phải khớp đúng ' +
         'tên thư mục, đến cả hậu tố <code>-thermo</code>.' },

    /* ============================================================
       5. ĐỔI GÌ, BUILD LẠI GÌ
       ============================================================ */
    { t: 'h2', x: 'Đổi gì thì build lại gì' },

    { t: 'p', x:
      'Bài 60 đã cho thấy Buildroot <b>không đoán</b> phụ thuộc: một package có stamp "đã build" thì <code>make</code> ' +
      'trơn bỏ qua nó, dù file nguồn đã đổi. Với một package, đó là chuyện nhỏ. Với một sản phẩm sáu lớp, nó ' +
      'thành câu hỏi hằng ngày: <i>tôi vừa sửa file này, lệnh nào đưa thay đổi vào <code>disk.img</code>?</i> ' +
      'Bảng dưới là câu trả lời, và cũng là một phần của README sản phẩm. Hai dòng đầu được đo ở Bước 4 và Bước 3:' },

    { t: 'table',
      head: ['Bạn vừa sửa', 'Lệnh', 'Vì sao lệnh đó'],
      rows: [
        ['<code>board/thermo/*.dts*</code>', '<code>make linux-rebuild all</code>', 'DTB được build <b>trong</b> package <code>linux</code>; stamp của <code>linux</code> phải bị xoá. <code>all</code> đóng lại ảnh đĩa.'],
        ['Một patch trong <code>patches/uboot/</code>', '<code>make uboot-dirclean all</code>', 'Patch chỉ được áp lúc giải nén (Bài 61). <code>-rebuild</code> không giải nén lại.'],
        ['<code>src/tsensor/*</code>', '<code>make tsensor-rebuild all</code>', '<code>local</code>: <code>-rebuild</code> <code>rsync</code> lại nguồn rồi build'],
        ['<code>src/temp-daemon/*</code>', '<code>make temp-daemon-rebuild all</code>', 'Như trên'],
        ['<code>linux.fragment</code>', '<code>make linux-reconfigure all</code>', 'Fragment được trộn ở bước cấu hình'],
        ['<code>overlay/</code>', '<code>make</code>', 'Overlay được chép lại mỗi lần đóng ảnh, không có stamp'],
        ['<code>configs/thermo_defconfig</code>', 'một thư mục <code>O=</code> mới', 'Bài 60: "khi nghi ngờ, build lại từ đầu" — ở đây chỉ tốn ~7 phút']
      ] },

    { t: 'terms', items: [
      ['br2-external', '', 'Cây thư mục nằm ngoài Buildroot, chứa package, defconfig, board file của bạn (Bài 61). Ở bài này nó chứa cả sản phẩm.'],
      ['External toolchain', '', 'Toolchain dựng sẵn mà Buildroot dùng thay vì tự build; ở đây là Bootlin <code>aarch64--glibc--stable-2025.08-1</code>.'],
      ['Config fragment', '', 'Một file chỉ chứa vài dòng <code>CONFIG_…</code>, được trộn lên trên một cấu hình gốc. Giữ phần "của sản phẩm" tách khỏi phần "của bo mạch".'],
      ['extlinux.conf', '', 'File mô tả kernel, Device Tree và dòng lệnh, U-Boot đọc khi quét ổ đĩa. Định dạng gốc của trình nạp SYSLINUX.'],
      ['genimage', '', 'Công cụ dựng ảnh đĩa có phân vùng từ các ảnh con, theo một file cấu hình.'],
      ['modalias', '', 'Chuỗi kernel tạo cho mỗi thiết bị để tìm module phù hợp; <code>modprobe</code> tra nó trong <code>modules.alias</code>.'],
      ['legal-info', '', 'Mục tiêu <code>make</code> của Buildroot gom mã nguồn, giấy phép và bảng kê mọi package — thứ bắt buộc khi phát hành phần mềm GPL.']
    ] },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: dựng, boot, sửa và phát hành Thermo' },

    { t: 'p', x:
      'Mọi lệnh chạy trong WSL, thư mục làm việc là <code>~/bai67</code>. Bài <b>không</b> dùng lại cây Buildroot ' +
      'của Bài 60–61 (nếu bạn đã xoá chúng sau Bài 62 như bài đó gợi ý thì càng không sao), và <b>không ghi gì</b> ' +
      'vào <code>~/bai38</code> — chỉ đọc hai file: tarball kernel và <code>tsensor.c</code> của Bài 54 trong ' +
      '<code>~/bai54</code>, cùng <code>temp_daemon.c</code> bạn giữ từ Bài 49 (hoặc Bài 24). Bạn cần khoảng ' +
      '<b>5 GB</b> đĩa trống và mạng ổn định cho ~370 MB tải về. Mỗi shell mới, đặt lại <code>PATH</code> sạch như ' +
      'Bài 60 — WSL nối các thư mục <code>/mnt/c/Program Files/…</code> vào, và Buildroot từ chối chạy:' },

    { t: 'code', where: 'wsl', code:
      'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Chuẩn bị nguyên liệu: Buildroot, tarball kernel, khung cây và Device Tree',
        blocks: [
          { t: 'p', x:
            'Tải Buildroot 2026.02.3 — đúng bản LTS của Bài 60 — và kiểm tra tổng sha256 bằng chính file ' +
            '<code>.sign</code> đi kèm. Bài 60 đã kiểm chữ ký GPG của file đó; ở đây chỉ cần dòng ' +
            '<code>SHA256:</code>. Rồi chép tarball kernel 6.18.45 mà Bài 38 đã kiểm chữ ký vào thư mục tải về của ' +
            'Buildroot, để Buildroot dùng nó thay vì tải lại 155 MB:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai67 && cd ~/bai67\n' +
            'curl -fLO https://buildroot.org/downloads/buildroot-2026.02.3.tar.xz\n' +
            'curl -fLO https://buildroot.org/downloads/buildroot-2026.02.3.tar.xz.sign\n' +
            "grep '^SHA256:' buildroot-2026.02.3.tar.xz.sign | cut -d' ' -f2- | sha256sum -c\n" +
            'tar xf buildroot-2026.02.3.tar.xz\n' +
            'mkdir -p buildroot-2026.02.3/dl/linux\n' +
            'cp ~/bai38/linux-6.18.45.tar.xz buildroot-2026.02.3/dl/linux/\n' +
            'sha256sum buildroot-2026.02.3/dl/linux/linux-6.18.45.tar.xz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'buildroot-2026.02.3.tar.xz: OK\n' +
            '30fa4a56579ca614ac125a12614f7f6466f87ab1278aef7b951dd74156deab33  buildroot-2026.02.3/dl/linux/linux-6.18.45.tar.xz' },

          { t: 'p', x:
            'Dòng đầu: tarball Buildroot khớp tổng do người phát hành công bố. Dòng hai là tổng của tarball kernel — ' +
            'bạn sẽ chép đúng chuỗi <code>30fa4a56…</code> này vào file <code>linux.hash</code> ngay dưới. Nó phải ' +
            'giống từng ký tự trên máy bạn, vì đó là cùng một tarball kernel.org đã ký. Vì sao lại là ' +
            '<code>dl/linux/</code>? Buildroot tìm tarball của package <code>X</code> trong <code>dl/X/</code> trước ' +
            'khi tải; thấy file có sẵn và khớp hash thì bỏ qua bước tải.' },

          { t: 'p', x:
            'Giờ dựng khung cây br2-external. Ba file khung giống hệt Bài 61, chỉ đổi tên cây thành ' +
            '<code>THERMO</code> và liệt kê hai package:' },

          { t: 'code', where: 'wsl', code:
            'T=~/bai67/thermo\n' +
            'mkdir -p $T/configs $T/package/tsensor $T/package/temp-daemon \\\n' +
            '         $T/src/tsensor $T/src/temp-daemon \\\n' +
            '         $T/board/thermo/overlay/boot/extlinux $T/board/thermo/patches/linux\n' +
            "printf 'name: THERMO\\ndesc: Thermo - lesson 67 product\\n' > $T/external.desc\n" +
            "printf 'source \"$BR2_EXTERNAL_THERMO_PATH/package/tsensor/Config.in\"\\n' > $T/Config.in\n" +
            "printf 'source \"$BR2_EXTERNAL_THERMO_PATH/package/temp-daemon/Config.in\"\\n' >> $T/Config.in\n" +
            "printf 'include $(sort $(wildcard $(BR2_EXTERNAL_THERMO_PATH)/package/*/*.mk))\\n' > $T/external.mk\n" +
            "printf '# Verified against kernel.org sha256sums.asc (GPG) in lesson 38\\n' > $T/board/thermo/patches/linux/linux.hash\n" +
            "printf 'sha256  30fa4a56579ca614ac125a12614f7f6466f87ab1278aef7b951dd74156deab33  linux-6.18.45.tar.xz\\n' >> $T/board/thermo/patches/linux/linux.hash\n" +
            'cat $T/external.desc $T/Config.in $T/external.mk' },

          { t: 'code', where: 'out', nocopy: true, code:
            'name: THERMO\n' +
            'desc: Thermo - lesson 67 product\n' +
            'source "$BR2_EXTERNAL_THERMO_PATH/package/tsensor/Config.in"\n' +
            'source "$BR2_EXTERNAL_THERMO_PATH/package/temp-daemon/Config.in"\n' +
            'include $(sort $(wildcard $(BR2_EXTERNAL_THERMO_PATH)/package/*/*.mk))' },

          { t: 'p', x:
            'Năm dòng, đúng như dự kiến; mọi điều Bài 61 nói về chúng vẫn đúng. File mới duy nhất là ' +
            '<code>linux.hash</code>, đặt trong <code>board/thermo/patches/linux/</code>. Buildroot tìm file hash của ' +
            'một package ở cả thư mục package <b>lẫn</b> mọi thư mục trong <code>BR2_GLOBAL_PATCH_DIR</code> — đúng ' +
            'cơ chế cây Buildroot dùng cho các bo QEMU của chính nó (<code>board/qemu/patches/linux/linux.hash</code>). ' +
            'Không có file này, kernel 6.18.45 (phiên bản Buildroot chưa biết) chỉ nhận một dòng <code>WARNING: no ' +
            'hash file</code> như Bài 61 đã đo.' },

          { t: 'p', x:
            'Cuối cùng là Device Tree. Bạn cần cây <b>đúng</b> với máy ảo mà sản phẩm sẽ chạy — Bài 36 đã đo rằng ' +
            '<code>-machine dumpdtb</code> phụ thuộc <i>toàn bộ</i> dòng lệnh QEMU: thêm <code>-bios</code> là PL061 ' +
            'và <code>gpio-keys</code> biến mất khỏi cây. Vì vậy hãy dump với đúng các thiết bị Thermo sẽ có: ' +
            '<code>-bios</code>, một ổ virtio, một card mạng virtio. File bios rỗng và ổ 1 MiB là đủ — QEMU chỉ cần ' +
            'biết <i>có</i> những thiết bị đó, nó dừng trước khi chạy bất cứ thứ gì:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai67/probe && cd ~/bai67/probe\n' +
            'touch empty.bin && truncate -s 1M x.img\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -bios empty.bin \\\n' +
            '  -drive file=x.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
            '  -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 \\\n' +
            '  -machine dumpdtb=qemu-virt.dtb\n' +
            'dtc -q -I dtb -O dts -o qemu-virt.dts qemu-virt.dtb\n' +
            'ls -l qemu-virt.dtb; wc -l qemu-virt.dts\n' +
            "grep -c 'pl061\\|gpio-keys' qemu-virt.dts" },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 1048576 Oct 31 21:11 qemu-virt.dtb\n' +
            '350 qemu-virt.dts\n' +
            '0' },

          { t: 'p', x:
            '<b>350</b> dòng và <b>0</b> lần nhắc tới <code>pl061</code>/<code>gpio-keys</code>: đây là cây của máy có ' +
            '<code>-bios</code>, khác cây 393 dòng (không <code>-bios</code>) của Bài 36. Nếu bạn dùng cây đó, kernel ' +
            'sẽ chết trong <code>amba_read_periphid</code> khi đọc một PL061 không tồn tại — lỗi Bài 36 đã ghi lại. ' +
            'File <code>.dtb</code> vẫn bị QEMU đệm tới đúng 1 MiB như Bài 45 đã thấy; không sao, vì bạn chỉ lấy ' +
            'bản <code>.dts</code>. Ngày giờ và tên user trong <code>ls -l</code> sẽ là của máy bạn.' },

          { t: 'p', x:
            'Ghép cây sản phẩm: giữ nguyên 350 dòng của QEMU, thêm một dòng <code>/include/</code> trỏ sang file ' +
            'riêng chứa phần của Thermo. Tách như vậy để phần "của bo mạch" (sinh tự động) và phần "của sản phẩm" ' +
            '(bạn viết) không bao giờ lẫn vào nhau — Bài 43 đã dạy <code>/include/</code> ghi đè node gốc:' },

          { t: 'code', where: 'wsl', code:
            "{ cat qemu-virt.dts; echo; echo '/include/ \"sensor.dtsi\"'; } > ~/bai67/thermo/board/thermo/thermo.dts\n" +
            'nano ~/bai67/thermo/board/thermo/sensor.dtsi' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/board/thermo/sensor.dtsi', lang: 'text', code:
            '/ {\n' +
            '\tmodel = "Thermo board (QEMU virt)";\n' +
            '\n' +
            '\tsensor@b000000 {\n' +
            '\t\tcompatible = "learn,temp-sensor";\n' +
            '\t\treg = <0x00 0xb000000 0x00 0x1000>;\n' +
            '\t\tlabel = "board";\n' +
            '\t\tlearn,offset-mdeg = <47000>;\n' +
            '\t\tlearn,trip-mdeg = <60000 85000>;\n' +
            '\t};\n' +
            '};' },

          { t: 'p', x:
            'Node <code>sensor@b000000</code> chép từ <code>nodes.dts</code> của Bài 54, đổi giá trị hiệu chuẩn thành ' +
            '<b>47 000</b> (47,0 °C) để bạn phân biệt được với số 42 500 của Bài 54. Dòng <code>model</code> mới là ' +
            '"chữ ký" của cây: kernel in nó ở dòng <code>Machine model:</code> của mọi lần boot, nên chỉ cần nhìn một ' +
            'dòng log là biết kernel đang dùng cây <i>nào</i>. Bước 3 sẽ cho thấy dòng đó đáng giá thế nào.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Hai package, hai fragment, một defconfig; build cả sản phẩm',
        blocks: [
          { t: 'p', x:
            'Mã nguồn driver: chép nguyên <code>tsensor.c</code> của Bài 54, thêm một <code>Kbuild</code> một dòng. ' +
            '<code>md5sum</code> chứng minh bạn không sửa gì:' },

          { t: 'code', where: 'wsl', code:
            'T=~/bai67/thermo\n' +
            'cp ~/bai54/tsensor/tsensor.c $T/src/tsensor/\n' +
            "printf 'obj-m := tsensor.o\\n' > $T/src/tsensor/Kbuild\n" +
            'md5sum ~/bai54/tsensor/tsensor.c $T/src/tsensor/tsensor.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '924ffb240b4fa34e932bac30ae56fb7f  /home/cah8hc/bai54/tsensor/tsensor.c\n' +
            '924ffb240b4fa34e932bac30ae56fb7f  /home/cah8hc/bai67/thermo/src/tsensor/tsensor.c' },

          { t: 'p', x:
            'Hai tổng giống nhau: đúng file 245 dòng đã chạy ở Bài 54. Tổng của bạn chỉ giống nếu bạn gõ lại file từng ' +
            'byte như bài đó; khác cũng không sao, miễn file của bạn đã chạy được ở Bài 54. Tạo ' +
            '<code>package/tsensor/tsensor.mk</code> với nội dung đã đọc ở phần lý thuyết, và ' +
            '<code>Config.in</code> sau:' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/package/tsensor/Config.in', code:
            'config BR2_PACKAGE_TSENSOR\n' +
            '\tbool "tsensor"\n' +
            '\tdepends on BR2_LINUX_KERNEL\n' +
            '\thelp\n' +
            '\t  Platform driver for "learn,temp-sensor" Device Tree nodes\n' +
            '\t  (lesson 54). Creates /dev/tsensorN.\n' +
            '\n' +
            'comment "tsensor needs a Linux kernel to be built"\n' +
            '\tdepends on !BR2_LINUX_KERNEL' },

          { t: 'p', x:
            '<code>depends on BR2_LINUX_KERNEL</code> thay cho <code>BR2_TOOLCHAIN_HAS_THREADS</code> của daemon: một ' +
            'module chỉ có nghĩa khi Buildroot build kernel để module khớp <code>vermagic</code>. Giờ đến daemon. Lấy ' +
            '<code>temp_daemon.c</code> 152 dòng của Bài 24/49 cùng Makefile 16 dòng của Bài 61, rồi sửa đúng một ' +
            'chỗ: số đo không còn là chuỗi giả <code>40.0 + (i % 50) / 10.0</code> mà đọc từ ' +
            '<code>/dev/tsensor0</code>. Đây là toàn bộ thay đổi, ở dạng <code>diff -u</code>:' },

          { t: 'code', where: 'file', name: 'thay đổi trong ~/bai67/thermo/src/temp-daemon/temp_daemon.c', lang: 'diff', nocopy: true, code:
            '@@ -12,6 +12,7 @@\n' +
            ' #include <arpa/inet.h>\n' +
            ' \n' +
            ' #define PORT       9006\n' +
            '+#define SENSOR     "/dev/tsensor0"   /* created by the tsensor driver */\n' +
            ' #define MAX_EVENTS 32\n' +
            ' \n' +
            ' static struct {\n' +
            '@@ -21,13 +22,18 @@\n' +
            ' } state = { PTHREAD_MUTEX_INITIALIZER, 0.0, 0 };\n' +
            ' \n' +
            ' static volatile sig_atomic_t running = 1;\n' +
            '+static int sensor_fd = -1;\n' +
            ' \n' +
            ' static void *sensor_thread(void *arg)\n' +
            ' {\n' +
            '     (void)arg;\n' +
            '     unsigned long i = 0;\n' +
            '     while (running) {\n' +
            '-        double d = 40.0 + (double)(i % 50) / 10.0;\n' +
            '+        char buf[16];\n' +
            '+        ssize_t r = pread(sensor_fd, buf, sizeof buf - 1, 0);   /* "42500\\n" */\n' +
            '+        if (r <= 0) { perror("pread " SENSOR); usleep(200000); continue; }\n' +
            '+        buf[r] = \'\\0\';\n' +
            '+        double d = strtol(buf, NULL, 10) / 1000.0;              /* millidegrees */\n' +
            '         pthread_mutex_lock(&state.lock);\n' +
            '         state.temperature  = d;\n' +
            '         state.sample_count = ++i;\n' +
            '@@ -48,6 +54,9 @@\n' +
            ' {\n' +
            '     signal(SIGPIPE, SIG_IGN);             /* early client close != killing the daemon */\n' +
            ' \n' +
            '+    sensor_fd = open(SENSOR, O_RDONLY | O_CLOEXEC);\n' +
            '+    if (sensor_fd == -1) { perror("open " SENSOR); exit(1); }\n' +
            '+\n' +
            '     sigset_t mask;\n' +
            '     sigemptyset(&mask);\n' +
            '     sigaddset(&mask, SIGTERM);\n' +
            '@@ -146,7 +155,7 @@\n' +
            '     }\n' +
            ' \n' +
            '     pthread_join(thread, NULL);\n' +
            '-    close(listen_fd); close(sig_fd); close(epoll_fd);\n' +
            '+    close(listen_fd); close(sig_fd); close(epoll_fd); close(sensor_fd);\n' +
            '     printf("[daemon] served %lu requests, closed every file descriptor cleanly, exiting 0\\n", served);\n' +
            '     return 0;\n' +
            ' }' },

          { t: 'cal', kind: 'why', title: 'Ba quyết định nhỏ trong 11 dòng',
            x: '<ul>' +
               '<li><b>Mở file một lần trong <code>main()</code>, trước mọi thứ khác.</b> Không có cảm biến thì daemon ' +
               'không có lý do tồn tại; chết ngay với một thông báo rõ ràng tốt hơn chạy và trả về số rác. Bước 3 sẽ ' +
               'thấy chính dòng <code>perror</code> này.</li>' +
               '<li><b><code>pread(…, 0)</code> thay vì <code>read</code>.</b> Driver của Bài 54 trả "47000\\n" rồi báo ' +
               'hết file (<code>simple_read_from_buffer</code> tăng <code>*ppos</code>). <code>read</code> lần hai sẽ ' +
               'nhận 0 byte. <code>pread</code> đọc tại offset 0 mỗi lần và không đổi vị trí của fd — không cần ' +
               '<code>lseek</code>, không cần mở lại file 5 lần mỗi giây.</li>' +
               '<li><b>Đơn vị.</b> Driver báo mili-độ (giống <code>hwmon</code> của kernel thật); daemon chia 1000 ' +
               'để giữ nguyên định dạng <code>temperature=%.1f</code> mà mọi máy khách đã quen từ Bài 24.</li>' +
               '</ul>' },

          { t: 'p', x:
            'File <code>.mk</code> của daemon giống Bài 61 ở mọi chỗ trừ ba dòng nguồn: <code>VERSION = 2.0</code> ' +
            '(bản 1.0 là bản số giả), <code>_SITE = $(BR2_EXTERNAL_THERMO_PATH)/src/temp-daemon</code> và ' +
            '<code>_SITE_METHOD = local</code>; thêm <code>_LICENSE_FILES = LICENSE</code>. ' +
            '<code>Config.in</code> và <code>S60temp_daemon</code> chép nguyên từ <code>~/bai61/br-ext</code> nếu bạn ' +
            'còn giữ, hoặc gõ lại từ Bài 61, với hai khác biệt: phần <code>help</code> mô tả "reads /dev/tsensor0", và script khởi động bỏ hai dòng <code>/etc/default</code> cùng <code>-- $TEMP_DAEMON_ARGS</code> — Thermo không cần đổi cổng. Hai ' +
            'file <code>LICENSE</code> trong <code>src/</code> là văn bản giấy phép ngắn; Bước 6 cho thấy vì sao phải có.' },

          { t: 'p', x:
            'Tiếp theo là hai fragment — phần "của sản phẩm" trộn lên cấu hình gốc của bo mạch:' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/board/thermo/linux.fragment', code:
            'CONFIG_LOCALVERSION="-thermo"\n' +
            'CONFIG_PRINTK_TIME=y\n' +
            'CONFIG_IKCONFIG=y\n' +
            'CONFIG_IKCONFIG_PROC=y' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/board/thermo/uboot.fragment', code:
            'CONFIG_BOOTDELAY=1\n' +
            '# CONFIG_TOOLS_MKEFICAPSULE is not set' },

          { t: 'table',
            head: ['Dòng', 'Vì sao'],
            rows: [
              ['<code>LOCALVERSION="-thermo"</code>', 'Tên thư mục module trở thành <code>/lib/modules/6.18.45-thermo</code>. Một kernel khác — kể cả cùng 6.18.45 — không thể vô tình nạp module của Thermo (Bài 50: <code>vermagic</code>).'],
              ['<code>PRINTK_TIME=y</code>', 'Cấu hình <code>aarch64-virt</code> của Buildroot tắt nó (Bài 60 đã thấy log không có <code>[ x.xxx]</code>). Bài 66 dạy rằng không có dấu thời gian thì không đo được boot.'],
              ['<code>IKCONFIG</code>, <code>IKCONFIG_PROC</code>', 'Nhúng chính <code>.config</code> vào kernel, đọc được qua <code>/proc/config.gz</code>. Trên một thiết bị ngoài hiện trường, đó là cách duy nhất chắc chắn biết kernel được build với cấu hình nào.'],
              ['<code>BOOTDELAY=1</code>', 'Mặc định của U-Boot là 2 giây (Bài 66 đo: một nửa thời gian boot). 1 giây vẫn đủ để bạn bấm phím dừng ở dấu nhắc khi cần chẩn đoán — Bước 3 sẽ cần.'],
              ['<code># CONFIG_TOOLS_MKEFICAPSULE is not set</code>', 'Công cụ host <code>mkeficapsule</code> cần header GnuTLS — Bài 34 đã gặp <code>gnutls/gnutls.h: No such file or directory</code> vì nó. Thermo không dùng cập nhật capsule EFI, nên tắt đi thay vì kéo thêm một thư viện vào build.']
            ] },

          { t: 'p', x:
            'Và <code>configs/thermo_defconfig</code> — công thức của cả sản phẩm. Dòng nào cũng đã có lý do ở đâu đó ' +
            'trong khoá học; bảng dưới chỉ gom chúng theo lớp:' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/configs/thermo_defconfig', code:
            'BR2_aarch64=y\n' +
            'BR2_cortex_a57=y\n' +
            'BR2_TOOLCHAIN_EXTERNAL=y\n' +
            'BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y\n' +
            'BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC_STABLE=y\n' +
            'BR2_GLOBAL_PATCH_DIR="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/patches"\n' +
            'BR2_TARGET_GENERIC_HOSTNAME="thermo"\n' +
            'BR2_TARGET_GENERIC_ISSUE="Thermo 1.0 - lesson 67"\n' +
            'BR2_ROOTFS_DEVICE_CREATION_DYNAMIC_MDEV=y\n' +
            'BR2_SYSTEM_DHCP="eth0"\n' +
            'BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/overlay"\n' +
            'BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"\n' +
            'BR2_ROOTFS_POST_SCRIPT_ARGS="-c $(BR2_EXTERNAL_THERMO_PATH)/board/thermo/genimage.cfg"\n' +
            'BR2_LINUX_KERNEL=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_VERSION=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.45"\n' +
            'BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"\n' +
            'BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/linux.fragment"\n' +
            'BR2_LINUX_KERNEL_DTS_SUPPORT=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_DTS_PATH="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/thermo.dts $(BR2_EXTERNAL_THERMO_PATH)/board/thermo/sensor.dtsi"\n' +
            'BR2_LINUX_KERNEL_INSTALL_TARGET=y\n' +
            'BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL=y\n' +
            'BR2_TARGET_ROOTFS_EXT2=y\n' +
            'BR2_TARGET_ROOTFS_EXT2_4=y\n' +
            'BR2_TARGET_ROOTFS_EXT2_SIZE="96M"\n' +
            '# BR2_TARGET_ROOTFS_TAR is not set\n' +
            'BR2_TARGET_UBOOT=y\n' +
            'BR2_TARGET_UBOOT_BOARD_DEFCONFIG="qemu_arm64"\n' +
            'BR2_TARGET_UBOOT_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/uboot.fragment"\n' +
            'BR2_TARGET_UBOOT_NEEDS_DTC=y\n' +
            'BR2_TARGET_UBOOT_NEEDS_OPENSSL=y\n' +
            'BR2_PACKAGE_HOST_GENIMAGE=y\n' +
            'BR2_PACKAGE_TSENSOR=y\n' +
            'BR2_PACKAGE_TEMP_DAEMON=y' },

          { t: 'table',
            head: ['Lớp', 'Các dòng', 'Điểm cần để ý'],
            rows: [
              ['CPU + toolchain', '1–5', '<code>cortex_a57</code> khớp <code>-cpu cortex-a57</code> mà mọi bài từ Chặng 05 dùng. Bootlin "stable" = GCC 14.3.0, glibc. Không chọn dòng 5 thì Buildroot mặc định lấy bản <i>bleeding-edge</i> — kiểm bằng <code>grep BOOTLIN_AARCH64 .config</code>.'],
              ['Hệ thống', '6–13', '<code>DYNAMIC_MDEV</code> là thứ nạp driver tự động (lý thuyết mục 4). <code>GLOBAL_PATCH_DIR</code> chứa <code>linux.hash</code> và, sau Bước 3, patch U-Boot.'],
              ['Kernel + DT', '14–23', 'Cấu hình gốc là file của chính Buildroot cho QEMU <code>virt</code> (76 dòng), không phải <code>defconfig</code> đầy đủ. <code>CUSTOM_DTS_PATH</code> liệt kê cả <code>.dtsi</code> để nó được chép vào cây kernel cạnh <code>thermo.dts</code>.'],
              ['Rootfs', '24–27', 'ext4 96 MiB; không cần tarball.'],
              ['Bootloader', '28–32', '<code>qemu_arm64</code> — defconfig Bài 34 đã dùng. Hai dòng <code>NEEDS_</code> báo Buildroot build <code>host-dtc</code>/<code>host-openssl</code> trước U-Boot.'],
              ['Sản phẩm', '33–35', '<code>genimage</code> trên máy build và hai package của bạn.']
            ] },

          { t: 'p', x:
            'Thêm ba file còn lại của <code>board/thermo/</code> — <code>genimage.cfg</code> và ' +
            '<code>overlay/boot/extlinux/extlinux.conf</code> đúng như phần lý thuyết. Giờ áp defconfig vào một thư ' +
            'mục build riêng (<code>O=</code>, như mốc M10 của Bài 61) và kiểm tra hai lựa chọn quan trọng nhất đã vào ' +
            '<code>.config</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai67/buildroot-2026.02.3\n' +
            'make O=~/bai67/out BR2_EXTERNAL=~/bai67/thermo thermo_defconfig | tail -n 3\n' +
            'cd ~/bai67/out\n' +
            "grep -n 'BOOTLIN_AARCH64_GLIBC_STABLE=\\|TOOLCHAIN_GCC_AT_LEAST=\\|PACKAGE_TSENSOR\\|PACKAGE_TEMP_DAEMON\\|UBOOT_VERSION=' .config" },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to /home/cah8hc/bai67/out/.config\n' +
            '#\n' +
            '154:BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC_STABLE=y\n' +
            '252:BR2_TOOLCHAIN_GCC_AT_LEAST="14"\n' +
            '2847:BR2_TARGET_UBOOT_VERSION="2026.01"\n' +
            '4112:BR2_PACKAGE_TSENSOR=y\n' +
            '4113:BR2_PACKAGE_TEMP_DAEMON=y' },

          { t: 'p', x:
            'Năm dòng xác nhận: toolchain stable, GCC ≥ 14 (đủ cho U-Boot, vốn đòi ≥ 10 — Bài 66), U-Boot ' +
            '<b>2026.01</b> (bản Buildroot 2026.02.3 mặc định chọn, không phải 2026.07 của Bài 34), và hai package ' +
            'của bạn được bật. Số dòng phụ thuộc phiên bản Buildroot, đừng so với máy khác. Nếu ' +
            '<code>PACKAGE_TSENSOR</code> không xuất hiện, thường là <code>Config.in</code> gốc của cây chưa ' +
            '<code>source</code> nó. Giờ tải trước mọi mã nguồn (Bài 60: để một kết nối chập chờn không giết bản build ' +
            'giữa chừng), rồi build:' },

          { t: 'code', where: 'wsl', code:
            'until make source > ~/bai67/source.log 2>&1; do sleep 10; done\n' +
            'du -sh ~/bai67/buildroot-2026.02.3/dl\n' +
            'time make > ~/bai67/build.log 2>&1; echo "rc=$?"\n' +
            'ls -l images' },

          { t: 'code', where: 'out', nocopy: true, code:
            '368M\t/home/cah8hc/bai67/buildroot-2026.02.3/dl\n' +
            '\n' +
            'real\t6m55.379s\n' +
            'user\t52m46.441s\n' +
            'sys\t4m30.741s\n' +
            'rc=0\n' +
            'total 60712\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 100663808 Oct 31 21:08 disk.img\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  13302272 Oct 31 21:08 Image\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 100663296 Oct 31 21:08 rootfs.ext2\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc        11 Oct 31 21:08 rootfs.ext4 -> rootfs.ext2\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc      7094 Oct 31 21:08 thermo.dtb\n' +
            '-rw-r--r-- 1 cah8hc cah8hc   1440152 Oct 31 21:05 u-boot.bin' },

          { t: 'p', x:
            '<b>6 phút 55 giây</b> cho cả sản phẩm — so với <b>24 phút 41 giây</b> của Bài 60. Gần như toàn bộ chênh ' +
            'lệch là toolchain (683 s ở Bài 60; ở đây <code>toolchain-external-bootlin</code> chỉ tốn <b>6,4 s</b> để giải nén tarball 92 MB) và QEMU cho máy host ' +
            '(474 s, Thermo không bật nó). Package tốn nhất giờ là <code>linux</code> với <b>167 s</b> — kiểm bằng ' +
            '<code>build/build-time.log</code> như Bài 60. Thời gian của bạn tỉ lệ với số CPU; máy soạn bài có 16.' },

          { t: 'table',
            head: ['File trong <code>images/</code>', 'Kích thước', 'Là gì, dùng ở đâu'],
            rows: [
              ['<code>u-boot.bin</code>', '1 440 152 B', 'Bootloader; QEMU nạp vào flash bằng <code>-bios</code>. Lớn gấp đôi bản 2021.01 của Bài 66 (724 880 B).'],
              ['<code>Image</code>', '13 302 272 B', 'Kernel. Nhỏ hơn 4,5 lần <code>Image</code> 60 MB của <code>~/bai38</code> — cấu hình sản phẩm, không ftrace, không debug.'],
              ['<code>thermo.dtb</code>', '7 094 B', 'Cây đã biên dịch, không còn 1 MiB đệm của <code>dumpdtb</code>.'],
              ['<code>rootfs.ext2</code> (+ link <code>.ext4</code>)', '96 MiB', 'Rootfs; <code>/boot</code> bên trong chứa bản sao của <code>Image</code> và <code>thermo.dtb</code>.'],
              ['<code>disk.img</code>', '100 663 808 B', '= 96 MiB + 512 byte MBR. <b>Đây là thứ bạn giao</b>: một ổ đĩa hoàn chỉnh.']
            ] }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Lần boot đầu hỏng: đi ngược từ triệu chứng tới một biến U-Boot',
        blocks: [
          { t: 'p', x:
            'Boot ảnh đĩa đúng như một bo mạch: U-Boot trong flash, <code>disk.img</code> là ổ duy nhất, một card mạng. ' +
            '<code>hostfwd</code> chuyển cổng 19006 của máy host vào cổng 9006 của Thermo, để bước sau gọi daemon từ ' +
            'WSL. Đăng nhập bằng <code>root</code>, không mật khẩu; thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi ' +
            '<kbd>X</kbd>, hoặc gõ <code>poweroff</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai67/out\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios images/u-boot.bin \\\n' +
            '  -drive file=images/disk.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
            '  -netdev user,id=eth0,hostfwd=tcp::19006-:9006 -device virtio-net-device,netdev=eth0' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 … -bios images/u-boot.bin -drive … -netdev user,…,hostfwd=…', rows: [
            ['-bios images/u-boot.bin', 'U-Boot nằm ở flash, địa chỉ 0 — như Bài 34. Không có <code>-kernel</code>, <code>-dtb</code>, <code>-append</code>: mọi thứ đó giờ là việc của U-Boot.', 'Đây là khác biệt lớn nhất với Chặng 07–10'],
            ['-drive file=images/disk.img,… -device virtio-blk-device', 'Ổ đĩa có bảng phân vùng; kernel thấy nó là <code>vda</code>, phân vùng 1 là <code>vda1</code>.', 'Đúng tên trong dòng <code>append</code>'],
            ['-netdev user,id=eth0,hostfwd=tcp::19006-:9006', 'Mạng "user" của QEMU (NAT, không cần <code>sudo</code>), cộng một luật: kết nối tới cổng 19006 của host được chuyển vào cổng 9006 của khách.', '19006 để không đụng một <code>temp_daemon</code> nào đang chạy trên WSL ở 9006']
          ] },

          { t: 'code', where: 'out', nocopy: true, name: 'phần U-Boot và vài dòng đầu của kernel (rút gọn)', code:
            'U-Boot 2026.01 (Oct 31 2026 - 20:52:12 +0700)\n' +
            '…\n' +
            'Hit any key to stop autoboot:  1 Hit any key to stop autoboot: 0\n' +
            '…\n' +
            "Scanning bootdev 'virtio-blk#31.bootdev':\n" +
            '  1  extlinux     ready   virtio       1  virtio-blk#31.bootdev.par /boot/extlinux/extlinux.conf\n' +
            "** Booting bootflow 'virtio-blk#31.bootdev.part_1' with extlinux\n" +
            '1:\tthermo\n' +
            'Retrieving file: /boot/Image\n' +
            'append: root=/dev/vda1 rootwait console=ttyAMA0\n' +
            '## Flattened Device Tree blob at 40000000\n' +
            '   Booting using the fdt blob at 0x40000000\n' +
            'Working FDT set to 40000000\n' +
            '   Loading Device Tree to 000000005d408000, end 000000005d50afff ... OK\n' +
            '…\n' +
            'Starting kernel ...\n' +
            '\n' +
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[    0.000000] Linux version 6.18.45-thermo (cah8hc@HC-C-005W7) (aarch64-linux-gcc.br_real (Buildroot 2021.11-18033-g83947c7bb6) 14.3.0, GNU ld (GNU Binutils) 2.43.1) #1 SMP Sat Oct 31 20:55:19 +07 2026\n' +
            '[    0.000000] Machine model: linux,dummy-virt\n' +
            '…\n' +
            'Starting mdev... OK\n' +
            '…\n' +
            'Starting temp_daemon: OK\n' +
            '\n' +
            'Thermo 1.0 - lesson 67\n' +
            'thermo login:' },

          { t: 'p', x:
            'Mọi thứ trông như thành công: U-Boot tìm thấy <code>extlinux.conf</code> trên phân vùng 1, kernel ' +
            '<code>6.18.45-thermo</code> được build bằng GCC 14.3.0 của Bootlin, init chạy, và ' +
            '<code>Starting temp_daemon: OK</code>. Tên máy <code>cah8hc@HC-C-005W7</code> và giờ build là của máy ' +
            'soạn bài. Chuỗi <code>Buildroot 2021.11-18033-…</code> trong tên trình biên dịch là phiên bản Buildroot ' +
            'mà <i>Bootlin</i> dùng để dựng toolchain, không phải bản 2026.02.3 của bạn. Giờ hỏi sản phẩm câu hỏi duy ' +
            'nhất nó tồn tại để trả lời — đăng nhập và kiểm tra từng lớp từ trên xuống:' },

          { t: 'code', where: 'qemu', code:
            'ps | grep [t]emp_daemon; echo none\n' +
            '/usr/bin/temp_daemon; echo rc=$?\n' +
            'ls /dev/tsensor*\n' +
            'lsmod\n' +
            'cat /proc/device-tree/model; echo' },

          { t: 'code', where: 'out', nocopy: true, code:
            'none\n' +
            'open /dev/tsensor0: No such file or directory\n' +
            'rc=1\n' +
            'ls: /dev/tsensor*: No such file or directory\n' +
            'Module                  Size  Used by    Not tainted\n' +
            "cat: can't open '/proc/device-tree/model': No such file or directory" },

          { t: 'p', x:
            'Khối lệnh mang badge "Trong máy ảo QEMU" được gõ vào shell của Thermo, sau dấu nhắc <code>#</code>. ' +
            'Đọc năm câu trả lời như một cuộc điều tra, mỗi dòng ' +
            'đẩy nghi vấn xuống một lớp:' },

          { t: 'table',
            head: ['Lớp', 'Bằng chứng', 'Kết luận'],
            rows: [
              ['Daemon', '<code>none</code>: không có tiến trình. Chạy tay → <code>open /dev/tsensor0: No such file or directory</code>, <code>rc=1</code>',
               '<code>OK</code> lúc boot chỉ có nghĩa <code>start-stop-daemon</code> <b>khởi chạy</b> được nó. Daemon chết ngay sau đó ở đúng dòng <code>perror</code> bạn viết ở Bước 2. Daemon không có lỗi — nó báo đúng.'],
              ['File thiết bị', '<code>/dev/tsensor*</code> không tồn tại', 'Không ai gọi <code>device_create</code> → <code>probe()</code> của driver chưa chạy.'],
              ['Driver', '<code>lsmod</code> rỗng, <code>Not tainted</code>', 'Module chưa từng được nạp (nạp rồi thì kernel đã bị đánh dấu <code>O</code>, Bài 50). <code>mdev</code> không tìm thấy thiết bị nào cần <code>tsensor</code>.'],
              ['Device Tree', 'Không có <code>/proc/device-tree/model</code>; log boot ghi <code>Machine model: linux,dummy-virt</code>',
               'Kernel đang chạy với cây <b>không có</b> dòng <code>model</code> của bạn — tức không có cả node <code>sensor@b000000</code>. Đây là cây do QEMU sinh, không phải <code>thermo.dtb</code>.']
            ] },

          { t: 'p', x:
            'Vậy lỗi nằm ở chỗ chuyển giao giữa U-Boot và kernel. Nhìn lại log U-Boot: có <code>Retrieving file: ' +
            '/boot/Image</code> nhưng <b>không có</b> <code>Retrieving file: /boot/thermo.dtb</code>, và cây được dùng ' +
            'nằm ở <code>0x40000000</code> — Bài 34 đã đo đó là nơi QEMU đặt cây của nó. Để kiểm tra, dừng U-Boot ở ' +
            'dấu nhắc: khởi động lại QEMU, bấm một phím bất kỳ trong 1 giây đếm ngược (đó là lý do giữ ' +
            '<code>BOOTDELAY=1</code>), rồi hỏi các biến địa chỉ và xem phân vùng:' },

          { t: 'code', where: 'uboot', code:
            'printenv fdt_addr fdt_addr_r kernel_addr_r\n' +
            'ext4ls virtio 0:1 /boot' },

          { t: 'code', where: 'out', nocopy: true, code:
            'fdt_addr=0x40000000\n' +
            '## Error: "fdt_addr_r" not defined\n' +
            'kernel_addr_r=0x40400000\n' +
            '            ./\n' +
            '            ../\n' +
            ' 13302272   Image\n' +
            '            extlinux/\n' +
            '     7094   thermo.dtb\n' +
            '\n' +
            '2 file(s), 3 dir(s)' },

          { t: 'p', x:
            'Hai sự thật. Một: <code>thermo.dtb</code> <b>có</b> trên đĩa, đúng 7 094 byte — đóng gói không sai. Hai: ' +
            'U-Boot có <code>kernel_addr_r</code> (nơi nạp kernel) nhưng <b>không có</b> <code>fdt_addr_r</code> (nơi ' +
            'nạp cây). Mã xử lý <code>extlinux.conf</code> nằm trong <code>boot/pxe_utils.c</code> của U-Boot; chú ' +
            'thích của chính nó mô tả bốn kịch bản:' },

          { t: 'code', where: 'out', nocopy: true, name: '~/bai67/out/build/uboot-2026.01/boot/pxe_utils.c (trích chú thích)', code:
            ' * Scenario 1: If fdt_addr_r specified and "fdt" or "fdtdir" label is\n' +
            ' * defined in pxe file, retrieve fdt blob from server. Pass fdt_addr_r to\n' +
            ' * bootm, and adjust argc appropriately.\n' +
            ' *\n' +
            ' * If retrieve fails and no exact fdt blob is specified in pxe file with\n' +
            ' * "fdt" label, try Scenario 2.\n' +
            ' *\n' +
            ' * Scenario 2: If there is an fdt_addr specified, pass it along to\n' +
            ' * bootm, and adjust argc appropriately.' },

          { t: 'cal', kind: 'why', title: 'Một dòng bị bỏ qua mà không ai báo',
            x: 'Kịch bản 1 — nạp file <code>fdt</code> — chỉ chạy khi <code>fdt_addr_r</code> tồn tại. Không có nó, ' +
               'U-Boot lặng lẽ rơi xuống kịch bản 2 và đưa cho kernel cây ở <code>fdt_addr</code>, tức cây QEMU ' +
               'sinh ra. Không lỗi, không cảnh báo; kernel vẫn boot vì cây QEMU mô tả đúng máy. Môi trường mặc định ' +
               'của bo <code>qemu-arm</code> (<code>board/emulation/qemu-arm/qemu-arm.env</code>) không định nghĩa ' +
               '<code>fdt_addr_r</code> vì trên QEMU người ta hầu như luôn dùng cây của QEMU. Thermo thì không. ' +
               'Bài học tổng quát: <b>triệu chứng hiện ở lớp trên cùng (daemon), nguyên nhân ở lớp dưới cùng ' +
               '(bootloader)</b>, và dòng <code>Machine model:</code> là cách nhanh nhất để biết kernel đang dùng cây ' +
               'nào — lý do Bước 1 thêm <code>model</code> vào <code>sensor.dtsi</code>.' },

          { t: 'p', x:
            'Sửa ở đâu? Gõ <code>setenv fdt_addr_r …; saveenv</code> chỉ sửa <i>một</i> máy (và Bài 35 đã cho thấy ' +
            'môi trường lưu trong flash của QEMU mất khi tắt QEMU). Sửa đúng là đưa biến vào môi trường mặc định ' +
            '<b>biên dịch trong</b> U-Boot — bằng một patch trong cây sản phẩm, đúng cơ chế ' +
            '<code>BR2_GLOBAL_PATCH_DIR</code> của Bài 61. Chọn <code>0x48000000</code>: cách <code>kernel_addr_r</code> ' +
            '124 MiB, xa khỏi kernel 13 MB và cả <code>ramdisk_addr_r</code> <code>0x44000000</code>. Patch là một ' +
            'file văn bản; tạo nó bằng <code>diff -u</code> giữa bản gốc và bản sửa:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai67/work && cd ~/bai67/work\n' +
            'mkdir -p a/board/emulation/qemu-arm b/board/emulation/qemu-arm\n' +
            'cp ~/bai67/out/build/uboot-2026.01/board/emulation/qemu-arm/qemu-arm.env a/board/emulation/qemu-arm/\n' +
            'cp a/board/emulation/qemu-arm/qemu-arm.env b/board/emulation/qemu-arm/\n' +
            "sed -i 's/^kernel_addr_r=0x40400000$/fdt_addr_r=0x48000000\\nkernel_addr_r=0x40400000/' b/board/emulation/qemu-arm/qemu-arm.env\n" +
            'P=~/bai67/thermo/board/thermo/patches/uboot\n' +
            'mkdir -p $P\n' +
            "{ printf 'From: Thermo <thermo@example.com>\\nSubject: [PATCH] qemu-arm: add fdt_addr_r so extlinux \"fdt\" is honoured\\n\\n'\n" +
            "  printf 'Without fdt_addr_r, boot/pxe_utils.c skips the fdt line of\\nextlinux.conf and boots with the QEMU-generated tree at fdt_addr.\\n---\\n'\n" +
            '  diff -u a/board/emulation/qemu-arm/qemu-arm.env b/board/emulation/qemu-arm/qemu-arm.env; } > $P/0001-qemu-arm-add-fdt_addr_r.patch\n' +
            'tail -n 10 $P/0001-qemu-arm-add-fdt_addr_r.patch' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- a/board/emulation/qemu-arm/qemu-arm.env\t2026-10-31 20:46:07.034655454 +0700\n' +
            '+++ b/board/emulation/qemu-arm/qemu-arm.env\t2026-10-31 20:46:07.034655454 +0700\n' +
            '@@ -10,6 +10,7 @@\n' +
            ' fdt_addr=0x40000000\n' +
            ' scriptaddr=0x40200000\n' +
            ' pxefile_addr_r=0x40300000\n' +
            '+fdt_addr_r=0x48000000\n' +
            ' kernel_addr_r=0x40400000\n' +
            ' ramdisk_addr_r=0x44000000\n' +
            ' boot_targets=qfw usb scsi virtio nvme dhcp' },

          { t: 'p', x:
            'Một dòng <code>+</code>, ba dòng ngữ cảnh mỗi bên, đường dẫn bắt đầu bằng <code>a/</code> và ' +
            '<code>b/</code> — đúng định dạng <code>patch -p1</code> mà Buildroot dùng (<code>apply-patches.sh</code>, ' +
            'Bài 61). Dấu thời gian trong hai dòng <code>---</code>/<code>+++</code> là của máy bạn và vô hại. Phần ' +
            'đầu <code>Subject:</code> và thân thư giải thích <i>vì sao</i> — người đọc patch sau sáu tháng (có thể ' +
            'chính bạn) cần điều đó hơn cả dòng mã. Giờ build lại U-Boot. Bài 61 đã đo rằng <code>-rebuild</code> ' +
            'không áp patch mới; kiểm chứng lại, rồi làm đúng cách:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai67/out\n' +
            'make uboot-rebuild > ub-rebuild.log 2>&1; grep -c Applying ub-rebuild.log\n' +
            'make uboot-dirclean\n' +
            'time make > build3.log 2>&1; echo "rc=$?"\n' +
            'grep Applying build3.log | grep qemu-arm' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0\n' +
            '\n' +
            'real\t0m23.471s\n' +
            'user\t2m4.175s\n' +
            'sys\t0m12.085s\n' +
            'rc=0\n' +
            'Applying 0001-qemu-arm-add-fdt_addr_r.patch using patch: ' },

          { t: 'p', x:
            '<code>uboot-rebuild</code>: <b>0</b> dòng <code>Applying</code> — nó chỉ chạy lại bước build trên mã đã ' +
            'giải nén. Sau <code>uboot-dirclean</code>, <code>make</code> giải nén lại U-Boot, áp patch, build, và ' +
            'đóng lại ảnh — tổng cộng <b>23 giây</b>. Boot lại bằng đúng lệnh QEMU ở trên:' },

          { t: 'code', where: 'out', nocopy: true, name: 'boot sau khi vá (rút gọn)', code:
            'U-Boot 2026.01 (Oct 31 2026 - 21:05:06 +0700)\n' +
            '…\n' +
            'Retrieving file: /boot/Image\n' +
            'append: root=/dev/vda1 rootwait console=ttyAMA0\n' +
            'Retrieving file: /boot/thermo.dtb\n' +
            '   Booting using the fdt blob at 0x48000000\n' +
            '…\n' +
            '[    0.000000] Machine model: Thermo board (QEMU virt)\n' +
            '…\n' +
            '[    0.434086] Run /sbin/init as init process\n' +
            '…\n' +
            'Starting temp_daemon: OK\n' +
            '\n' +
            'Thermo 1.0 - lesson 67\n' +
            'thermo login:' },

          { t: 'p', x:
            'Ba dòng thay đổi, đúng chỗ dự đoán: U-Boot giờ nạp <code>/boot/thermo.dtb</code>, đặt nó ở ' +
            '<code>0x48000000</code> (địa chỉ trong patch), và kernel in <code>Machine model: Thermo board (QEMU ' +
            'virt)</code> — dòng <code>model</code> của bạn. Từ lúc bật nguồn tới dấu nhắc đăng nhập mất ' +
            '<b>4,66–4,78 giây</b> theo đồng hồ host (đo như Bài 66 qua 6 lần boot), trong đó 1 giây là ' +
            '<code>BOOTDELAY</code> và kernel chỉ chiếm 0,43 s tới <code>Run /sbin/init</code>. Bài này không chia nhỏ ' +
            'phần còn lại; công cụ để làm việc đó là của Bài 66.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Kiểm tra từng hợp đồng giữa các lớp, rồi gọi sản phẩm từ bên ngoài',
        blocks: [
          { t: 'p', x:
            'Một sản phẩm "chạy được" chưa đủ; bạn phải <b>chứng minh</b> được từng mắt xích, theo đúng thứ tự hình ' +
            'kiến trúc ở đầu bài. Đăng nhập vào Thermo và đi từ dưới lên. Trước hết, kernel và cây:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/device-tree/model; echo\n' +
            'uname -r\n' +
            "zcat /proc/config.gz | grep -E 'LOCALVERSION=|PRINTK_TIME'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'Thermo board (QEMU virt) \n' +
            '6.18.45-thermo\n' +
            'CONFIG_LOCALVERSION="-thermo"\n' +
            'CONFIG_PRINTK_TIME=y' },

          { t: 'p', x:
            'Cây là <code>thermo.dtb</code> (có <code>model</code>; ký tự trống ở cuối là byte 0 kết thúc chuỗi, ' +
            '<code>echo</code> chỉ thêm xuống dòng). Kernel mang hậu tố <code>-thermo</code>, và hai dòng của ' +
            '<code>linux.fragment</code> đọc được ngay trên thiết bị nhờ <code>IKCONFIG_PROC</code> — không cần giữ ' +
            'lại cây build để biết thiết bị chạy cấu hình nào. Tiếp theo, chuỗi nạp driver tự động — ba mảnh của ' +
            'bảng lý thuyết:' },

          { t: 'code', where: 'qemu', code:
            'cat /sys/bus/platform/devices/b000000.sensor/modalias; echo\n' +
            'grep tsensor /lib/modules/$(uname -r)/modules.alias\n' +
            'lsmod\n' +
            'dmesg | grep tsensor' },

          { t: 'code', where: 'out', nocopy: true, code:
            'of:NsensorT(null)Clearn,temp-sensor\n' +
            '\n' +
            'alias of:N*T*Clearn,temp-sensorC* tsensor\n' +
            'alias of:N*T*Clearn,temp-sensor tsensor\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'tsensor                12288  1 \n' +
            '[    2.088071] tsensor: loading out-of-tree module taints kernel.\n' +
            '[    2.092640] tsensor b000000.sensor: probe\n' +
            '[    2.094126] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 47000 trip 60000/85000 poll 1000 ms gpio no -> tsensor0' },

          { t: 'cal', kind: 'info', title: 'Đọc bốn khối kết quả như một chuỗi khớp',
            x: '<ul>' +
               '<li><code>of:NsensorT(null)Clearn,temp-sensor</code>: chuỗi kernel gán cho thiết bị — <code>N</code> = ' +
               'tên node (<code>sensor</code>), <code>T</code> = <code>device_type</code> (không có → ' +
               '<code>(null)</code>), <code>C</code> = <code>compatible</code>.</li>' +
               '<li>Hai dòng <code>alias of:N*T*Clearn,temp-sensor…</code>: mẫu do <code>depmod</code> gom vào lúc ' +
               'build. <code>*</code> khớp mọi tên node và mọi kiểu, nên chuỗi trên khớp dòng thứ hai → module ' +
               '<code>tsensor</code>.</li>' +
               '<li><code>lsmod</code>: <code>tsensor</code> đã nạp, <code>Used by 1</code> — một fd đang mở nó (bạn ' +
               'sẽ thấy của ai ngay dưới). <code>Tainted: G</code> thay vì <code>Not tainted</code> như ở Bước 3.</li>' +
               '<li><code>dmesg</code>: nạp lúc <b>2,09 s</b> — sau <code>Run /sbin/init</code> ở 0,43 s, tức do ' +
               '<code>S10mdev</code> trong userspace, không phải kernel tự nạp. <code>offset 47000</code> là giá trị ' +
               'trong <code>sensor.dtsi</code>.</li>' +
               '</ul>Không có dòng <code>insmod</code> nào trong toàn bộ sản phẩm. Dấu thời gian sẽ lệch vài mili giây ' +
               'trên máy bạn.' },

          { t: 'p', x:
            'Lớp trên cùng: file thiết bị, thuộc tính sysfs, và daemon đang giữ file đó:' },

          { t: 'code', where: 'qemu', code:
            'ls -l /dev/tsensor0; cat /dev/tsensor0\n' +
            'cat /sys/bus/platform/devices/b000000.sensor/temp\n' +
            'ps | grep [t]emp_daemon\n' +
            'ls -l /proc/$(pidof temp_daemon)/fd | grep tsensor' },

          { t: 'code', where: 'out', nocopy: true, code:
            'crw-rw----    1 root     root      248,   0 Oct 31 14:08 /dev/tsensor0\n' +
            '47000\n' +
            '47000\n' +
            '  123 root     /usr/bin/temp_daemon\n' +
            'lr-x------    1 root     root            64 Oct 31 14:09 3 -> /dev/tsensor0' },

          { t: 'p', x:
            'Node <code>/dev/tsensor0</code> do <code>mdev</code> tạo, major <b>248</b> — Bài 54 nhận <b>510</b> trên ' +
            'kernel <code>defconfig</code> của <code>~/bai38</code>. Major động phụ thuộc kernel nào đã chiếm số nào, nên đừng bao giờ ghi cứng nó. Hai đường đọc, cùng ' +
            '<b>47000</b>. Daemon PID 123 giữ fd <b>3</b> trỏ vào <code>/dev/tsensor0</code> — fd đầu tiên sau ' +
            '0/1/2, vì <code>open</code> là việc đầu tiên <code>main()</code> làm. Đó cũng là "<code>Used by 1</code>" ' +
            'của <code>lsmod</code>. Giờ thì đóng vai khách hàng. Để Thermo chạy, mở <b>một terminal WSL khác</b>:' },

          { t: 'code', where: 'wsl', code:
            'for i in 1 2 3; do echo GET | nc -q1 127.0.0.1 19006; sleep 0.5; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'temperature=47.0 samples=6\n' +
            'temperature=47.0 samples=14\n' +
            'temperature=47.0 samples=21' },

          { t: 'p', x:
            'Đây là dòng mà cả sản phẩm tồn tại để trả lời. <code>47.0</code> = 47 000 mili-độ trong Device Tree, đi ' +
            'qua <code>probe()</code>, <code>read()</code> của driver, <code>pread</code> của daemon, ' +
            '<code>epoll</code>, NAT của QEMU, tới <code>nc</code> trên WSL. <code>samples</code> tăng ~7–8 mỗi 0,5 ' +
            'giây — luồng đo đọc cảm biến 5 lần mỗi giây như Bài 24 thiết kế; con số tuyệt đối phụ thuộc lúc bạn gõ ' +
            'lệnh. <code>nc</code> trên WSL là OpenBSD netcat có <code>-q1</code>; BusyBox của Buildroot không có ' +
            '<code>nc</code> (Bài 61) nên phép thử này phải chạy từ host. Hai số đo cuối cho README:' },

          { t: 'code', where: 'qemu', code:
            'df -h /\n' +
            'free' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Filesystem                Size      Used Available Use% Mounted on\n' +
            '/dev/root                84.5M     18.2M     59.5M  23% /\n' +
            '              total        used        free      shared  buff/cache   available\n' +
            'Mem:         501172       12764      472668          56       15740      478928\n' +
            'Swap:             0           0           0' },

          { t: 'p', x:
            'Cả hệ thống — kernel 13 MB trong <code>/boot</code>, glibc, BusyBox, module, daemon — dùng <b>18,2 MB</b> ' +
            'đĩa và <b>12,8 MB</b> RAM sau boot (<code>used</code> 12 764 KiB, dao động vài chục KiB giữa các lần). ' +
            'Đó là loại con số bạn cần khi chọn dung lượng flash và RAM cho một bo mạch thật — chủ đề của Bài 70.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Sửa một giá trị hiệu chuẩn: make trơn giao ảnh cũ, linux-rebuild giao ảnh đúng',
        blocks: [
          { t: 'p', x:
            'Tình huống hằng ngày của một sản phẩm: phòng thí nghiệm báo cảm biến lệch, giá trị hiệu chuẩn phải là ' +
            '49 000. Bạn sửa một dòng DTS. Câu hỏi là thay đổi đó có thật sự vào ảnh đĩa không. Tắt Thermo, rồi trên ' +
            'WSL:' },

          { t: 'code', where: 'wsl', code:
            'T=~/bai67/thermo; cd ~/bai67/out\n' +
            "sed -i 's/learn,offset-mdeg = <47000>;/learn,offset-mdeg = <49000>;/' $T/board/thermo/sensor.dtsi\n" +
            'time make > plain.log 2>&1; echo "rc=$?"\n' +
            'fdtget images/thermo.dtb /sensor@b000000 learn,offset-mdeg\n' +
            'ls -l --time-style=+%H:%M:%S images/thermo.dtb images/disk.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m5.932s\n' +
            'user\t0m9.924s\n' +
            'sys\t0m1.415s\n' +
            'rc=0\n' +
            '47000\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 100663808 21:10:01 images/disk.img\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc      7094 21:08:05 images/thermo.dtb' },

          { t: 'cal', kind: 'danger', title: 'rc=0, ảnh mới, nội dung cũ',
            x: '<code>make</code> chạy 6 giây, trả <b>0</b>, và <code>disk.img</code> có giờ mới (21:10:01) — mọi dấu ' +
               'hiệu của một bản build thành công. Nhưng <code>thermo.dtb</code> vẫn mang giờ của lần build trước ' +
               '(21:08:05) và vẫn chứa <b>47000</b>. Stamp <code>.stamp_built</code> của package <code>linux</code> còn ' +
               'đó, nên Buildroot không chạy lại nó; nó chỉ đóng lại rootfs từ <code>output/target</code> cũ. Nếu bạn ' +
               'giao <code>disk.img</code> này, cả lô thiết bị sẽ báo sai 2 °C, và không có dòng log nào nói vì sao. ' +
               'Đây chính là "phụ thuộc không khai báo" của Bài 59, ở quy mô sản phẩm. Kiểm bằng <code>fdtget</code> ' +
               'trên ảnh, đừng tin <code>rc=0</code>.' },

          { t: 'p', x:
            'Lệnh đúng theo bảng "đổi gì, build lại gì": xoá stamp của <code>linux</code> và build lại, rồi ' +
            '<code>all</code> để đóng ảnh:' },

          { t: 'code', where: 'wsl', code:
            'time make linux-rebuild all > rebuild.log 2>&1; echo "rc=$?"\n' +
            "grep '>>>' rebuild.log | head -n 3\n" +
            'fdtget images/thermo.dtb /sensor@b000000 learn,offset-mdeg' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m9.639s\n' +
            'user\t0m22.924s\n' +
            'sys\t0m4.150s\n' +
            'rc=0\n' +
            '>>> linux 6.18.45 Building\n' +
            '>>> linux 6.18.45 Installing to target\n' +
            '>>> linux 6.18.45 Installing to images directory\n' +
            '49000' },

          { t: 'p', x:
            '<b>9,6 giây</b>, không phải 167: Kbuild của kernel nhìn mốc thời gian từng file, nên chỉ biên dịch lại ' +
            '<code>thermo.dtb</code> — cùng nguyên tắc so mốc thời gian của <code>make</code> mà Bài 16 đã dạy. Ba dòng <code>&gt;&gt;&gt;</code> cho thấy ' +
            '<code>linux</code> được build, cài vào <code>target/boot</code>, và chép sang <code>images/</code>. ' +
            'Ảnh giờ chứa <b>49000</b>. Boot lại và hỏi từ WSL như Bước 4:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'temperature=49.0 samples=2' },

          { t: 'p', x:
            'Thay đổi đã đi hết chuỗi: DTS → DTB → <code>/boot</code> → U-Boot → kernel → driver → daemon → mạng. Đưa ' +
            'giá trị về 47 000 bằng cùng hai lệnh (<code>sed</code> ngược lại, rồi <code>make linux-rebuild all</code>) ' +
            'để phần còn lại của bài khớp với bản ghi. Hai phép thử nhanh khác cho bảng trong README, đều đo trên ' +
            'cây này:' },

          { t: 'table',
            head: ['Lệnh', 'Thời gian', 'Kết quả'],
            rows: [
              ['<code>make tsensor-rebuild all</code>', '6,5 s', '<code>rsync</code> lại <code>src/tsensor</code>, build lại module, đóng ảnh'],
              ['<code>make uboot-rebuild</code>', '—', '<b>0</b> dòng <code>Applying</code>: patch không được áp lại (Bước 3)'],
              ['<code>make uboot-dirclean all</code>', '23,5 s', 'Giải nén, áp 1 patch, build U-Boot']
            ] }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Đóng gói bản phát hành: savedefconfig, legal-info, README, SHA256SUMS',
        blocks: [
          { t: 'p', x:
            'Một sản phẩm chỉ là sản phẩm khi người khác dựng lại và kiểm tra được nó. Bốn việc. Một: chắc chắn ' +
            '<code>thermo_defconfig</code> trong Git đúng là cấu hình đã build. Bài 61 đã cảnh báo ' +
            '<code>savedefconfig</code> trơn có thể ghi đè file sai chỗ, nên ghi ra một file tạm rồi so:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai67/out\n' +
            'make savedefconfig BR2_DEFCONFIG=$HOME/bai67/work/check_defconfig > /dev/null\n' +
            'diff ~/bai67/thermo/configs/thermo_defconfig ~/bai67/work/check_defconfig && echo IDENTICAL' },

          { t: 'code', where: 'out', nocopy: true, code: 'IDENTICAL' },

          { t: 'p', x:
            '<code>IDENTICAL</code>: không có lựa chọn nào bị đặt bằng tay trong <code>menuconfig</code> mà quên ghi lại. ' +
            'Ở lần thử đầu, khi bài soạn viết defconfig bằng tay, <code>diff</code> báo hai khác biệt: ' +
            '<code>BR2_GLOBAL_PATCH_DIR</code> nằm sai thứ tự, và một dòng ' +
            '<code>BR2_TARGET_UBOOT_BUILD_SYSTEM_KCONFIG=y</code> thừa (đó đã là mặc định). Bản trong bài là bản ' +
            '<code>savedefconfig</code> sinh ra — luôn để công cụ viết file này, đừng viết tay.' },

          { t: 'p', x:
            'Hai: giấy phép. Thermo chứa Linux, U-Boot, BusyBox (GPL) và glibc; phát hành ảnh mà không kèm mã nguồn ' +
            'tương ứng là vi phạm giấy phép. Buildroot gom sẵn mọi thứ cần thiết:' },

          { t: 'code', where: 'wsl', code:
            'time make legal-info > legal.log 2>&1; echo "rc=$?"\n' +
            'grep WARNING legal.log\n' +
            'cut -d, -f1-3 legal-info/manifest.csv\n' +
            'du -sh legal-info' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m7.378s\n' +
            'user\t0m7.035s\n' +
            'sys\t0m0.301s\n' +
            'rc=0\n' +
            'WARNING: no hash file for LICENSE\n' +
            'WARNING: no hash file for LICENSE\n' +
            'WARNING: the Buildroot source code has not been saved\n' +
            'WARNING: toolchain-external-bootlin-2025.08-1: cannot save license (TOOLCHAIN_EXTERNAL_BOOTLIN_LICENSE_FILES not defined)\n' +
            '"PACKAGE","VERSION","LICENSE"\n' +
            '"toolchain-external-bootlin","2025.08-1","unknown"\n' +
            '"busybox","1.37.0","GPL-2.0\n' +
            '"uboot","2026.01","GPL-2.0+"\n' +
            '"linux","6.18.45","GPL-2.0"\n' +
            '"temp-daemon","2.0","MIT"\n' +
            '"tsensor","1.0","GPL-2.0"\n' +
            '370M\tlegal-info' },

          { t: 'table',
            head: ['Dòng', 'Nghĩa là gì', 'Việc phải làm'],
            rows: [
              ['6 package trong <code>manifest.csv</code>', 'Mỗi package của <b>target</b> một dòng, kèm giấy phép. (<code>"GPL-2.0</code> của BusyBox bị cắt vì cột giấy phép của nó chứa dấu phẩy — <code>cut</code> không hiểu dấu ngoặc kép.)', 'Gửi kèm bản phát hành'],
              ['<code>no hash file for LICENSE</code> ×2', 'File <code>LICENSE</code> của hai package <code>local</code> không có hash — package <code>local</code> không có <code>.hash</code> nào.', 'Chấp nhận được với mã của chính bạn'],
              ['<code>Buildroot source code has not been saved</code>', 'Cây Buildroot không phải một kho Git nên <code>legal-info</code> không đóng gói nó.', 'Ghi phiên bản Buildroot vào MANIFEST (dưới)'],
              ['<code>toolchain-external-bootlin … cannot save license</code>', 'Buildroot không biết file giấy phép trong tarball Bootlin, và ghi <code>unknown</code>.', 'glibc (LGPL) và libgcc nằm trong rootfs — sản phẩm thật phải tự bổ sung phần này'],
              ['<b>370M</b>', 'Gần như toàn bộ là <code>sources/</code>: tarball của mọi package.', 'Đây là thứ bạn phải cung cấp khi có người yêu cầu mã nguồn GPL']
            ] },

          { t: 'p', x:
            'Ở lần chạy đầu, khi hai file <code>.mk</code> chưa có <code>_LICENSE_FILES</code>, có thêm hai cảnh báo ' +
            '<code>temp-daemon-2.0: cannot save license (TEMP_DAEMON_LICENSE_FILES not defined)</code> và tương tự cho ' +
            '<code>tsensor</code>. Đó là lý do hai file <code>LICENSE</code> trong <code>src/</code> tồn tại.' },

          { t: 'p', x:
            'Ba và bốn: tài liệu và gói phát hành. <code>README.md</code> của cây (bảng các lớp, cách build, cách chạy, ' +
            'bảng "đổi gì build lại gì") là tài liệu cho người phát triển tiếp theo. Script sau gom ảnh, README, một ' +
            'script chạy QEMU, một MANIFEST ghi phiên bản, và tổng sha256 của từng file vào một tarball có số phiên ' +
            'bản:' },

          { t: 'code', where: 'file', name: '~/bai67/thermo/release.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# release.sh VERSION -- collect the Thermo images into one versioned, checksummed bundle\n' +
            'set -eu\n' +
            'VERSION=${1:?usage: release.sh VERSION}\n' +
            'OUT=${OUT:-$HOME/bai67/out}\n' +
            'NAME=thermo-$VERSION\n' +
            'DIR=$HOME/bai67/release/$NAME\n' +
            '\n' +
            'rm -rf "$DIR"\n' +
            'mkdir -p "$DIR"\n' +
            'cp "$OUT/images/u-boot.bin" "$OUT/images/disk.img" "$DIR/"\n' +
            'cp "$OUT/images/Image" "$OUT/images/thermo.dtb" "$DIR/"\n' +
            'cp "$(dirname "$0")/README.md" "$DIR/"\n' +
            "cat > \"$DIR/run-qemu.sh\" <<'EOF'\n" +
            '#!/bin/sh\n' +
            '# Boot the Thermo image. Port 9006 of the board is forwarded to 19006 on this host.\n' +
            'cd "$(dirname "$0")"\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '\t-bios u-boot.bin \\\n' +
            '\t-drive file=disk.img,if=none,format=raw,id=hd0 \\\n' +
            '\t-device virtio-blk-device,drive=hd0 \\\n' +
            '\t-netdev user,id=eth0,hostfwd=tcp::19006-:9006 \\\n' +
            '\t-device virtio-net-device,netdev=eth0\n' +
            'EOF\n' +
            'chmod 0755 "$DIR/run-qemu.sh"\n' +
            '{\n' +
            '\techo "version: $VERSION"\n' +
            '\tsed -n \'s/^# \\(Buildroot .*\\) Configuration$/\\1/p\' "$OUT/.config"\n' +
            "\tgrep -E '^BR2_LINUX_KERNEL_VERSION=|^BR2_TARGET_UBOOT_VERSION=' \"$OUT/.config\"\n" +
            '} > "$DIR/MANIFEST"\n' +
            'cd "$DIR"\n' +
            'sha256sum u-boot.bin disk.img Image thermo.dtb run-qemu.sh README.md MANIFEST > SHA256SUMS\n' +
            'cd ..\n' +
            'tar --owner=0 --group=0 --sort=name -czf "$NAME.tar.gz" "$NAME"\n' +
            'ls -l "$NAME.tar.gz"' },

          { t: 'cmdx', cmd: 'release.sh', title: 'Những dòng bảo vệ bạn khỏi chính mình', rows: [
            ['set -eu', '<code>-e</code>: dừng ở lệnh lỗi đầu tiên, không đóng gói một thư mục thiếu file. <code>-u</code>: biến chưa đặt là lỗi.', 'Bài 13 và tai nạn <code>rm -rf "$buld_dir"</code> mà <code>-u</code> chặn được'],
            ['${1:?usage: …}', 'Không có tham số phiên bản thì dừng với thông báo, thay vì tạo <code>thermo-.tar.gz</code>.', ''],
            ['rm -rf "$DIR"', 'Xoá bản cũ cùng phiên bản trước khi gom — một file thừa của lần trước không được lọt vào. <code>$DIR</code> luôn có tiền tố cố định <code>$HOME/bai67/release/thermo-</code>.', 'Bài 59: dựng lại từ đầu, đừng vá'],
            ["sed -n 's/^# \\(Buildroot .*\\) Configuration$/\\1/p'", 'Lấy dòng thứ 3 của <code>.config</code> (<code># Buildroot 2026.02.3 Configuration</code>) — phiên bản công cụ build, thứ <code>legal-info</code> không lưu.', ''],
            ['sha256sum … > SHA256SUMS', 'Tổng của từng file. Người nhận kiểm bằng <code>sha256sum -c</code>.', 'Bài 68 sẽ <i>ký</i> danh sách này'],
            ['tar --owner=0 --group=0 --sort=name', 'Chủ sở hữu và thứ tự cố định (Bài 59, 61). Không thêm <code>--mtime</code>, nên hai lần đóng vẫn khác nhau ở mốc thời gian.', '']
          ] },

          { t: 'code', where: 'wsl', code:
            'chmod 0755 ~/bai67/thermo/release.sh\n' +
            '~/bai67/thermo/release.sh 1.0\n' +
            'cd ~/bai67/release/thermo-1.0\n' +
            'cat MANIFEST\n' +
            'sha256sum -c SHA256SUMS' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 15338643 Oct 31 21:09 thermo-1.0.tar.gz\n' +
            'version: 1.0\n' +
            'Buildroot 2026.02.3\n' +
            'BR2_LINUX_KERNEL_VERSION="6.18.45"\n' +
            'BR2_TARGET_UBOOT_VERSION="2026.01"\n' +
            'u-boot.bin: OK\n' +
            'disk.img: OK\n' +
            'Image: OK\n' +
            'thermo.dtb: OK\n' +
            'run-qemu.sh: OK\n' +
            'README.md: OK\n' +
            'MANIFEST: OK' },

          { t: 'p', x:
            'Ảnh đĩa 96 MiB nén còn <b>15,3 MB</b> vì phần lớn ext4 còn trống (Bước 4: 18,2 MB dùng). Bảy file ' +
            '<code>OK</code>. Tổng sha256 cụ thể sẽ khác trên máy bạn — kernel và ảnh đĩa nhúng giờ build và UUID ' +
            'ext4 mới mỗi lần (Bài 60). Để thấy <code>SHA256SUMS</code> thật sự bảo vệ được gì, làm hỏng một byte rồi ' +
            'kiểm lại:' },

          { t: 'code', where: 'wsl', code:
            'cp thermo.dtb /tmp/keep.dtb\n' +
            "printf 'x' >> thermo.dtb\n" +
            'sha256sum -c --quiet SHA256SUMS; echo "rc=$?"\n' +
            'cp /tmp/keep.dtb thermo.dtb\n' +
            'sha256sum -c --quiet SHA256SUMS; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'thermo.dtb: FAILED\n' +
            'sha256sum: WARNING: 1 computed checksum did NOT match\n' +
            'rc=1\n' +
            'rc=0' },

          { t: 'p', x:
            'Một byte thêm vào cuối <code>thermo.dtb</code> — thứ <code>dtc</code> và U-Boot có thể không hề than ' +
            'phiền — bị bắt ngay, mã trả về <b>1</b>, chỉ đúng file đó. Trả file về: <code>--quiet</code> không in ' +
            'gì và mã trả về <b>0</b>. Nhưng hãy nghĩ như kẻ tấn công: ai sửa được <code>thermo.dtb</code> thì cũng ' +
            'sửa được <code>SHA256SUMS</code>. Tổng kiểm tra chống <i>hỏng</i>, không chống <i>giả mạo</i> — đó là ' +
            'điểm xuất phát của Bài 68.' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Boot tới <code>thermo login:</code>, <code>Starting temp_daemon: OK</code>, nhưng không có tiến trình; chạy tay → <code>open /dev/tsensor0: No such file or directory</code>',
         'Kernel không nhận <code>thermo.dtb</code> → không có node cảm biến → driver không nạp. Log có <code>Machine model: linux,dummy-virt</code>.',
         'Kiểm <code>printenv fdt_addr_r</code> ở dấu nhắc U-Boot; thêm patch của Bước 3; <code>make uboot-dirclean all</code>.'],
        ['U-Boot in <code>Retrieving file: /boot/Image</code> nhưng không in <code>Retrieving file: /boot/thermo.dtb</code>; <code>Booting using the fdt blob at 0x40000000</code>',
         'Thiếu biến <code>fdt_addr_r</code>: <code>pxe_utils.c</code> bỏ qua dòng <code>fdt</code> của <code>extlinux.conf</code> mà không báo.',
         'Như trên. <code>0x40000000</code> luôn là cây của QEMU.'],
        ['Thêm patch vào <code>patches/uboot/</code>, <code>make uboot-rebuild</code> → rc 0 nhưng lỗi vẫn còn; <code>grep Applying</code> ra 0 dòng',
         'Patch chỉ áp lúc giải nén; <code>-rebuild</code> dùng lại mã đã giải nén (Bài 61).',
         '<code>make uboot-dirclean all</code>.'],
        ['Sửa <code>.dts</code>, <code>make</code> rc 0, <code>disk.img</code> giờ mới, nhưng thiết bị vẫn báo giá trị cũ',
         'Stamp của <code>linux</code> còn; DTB được build trong package <code>linux</code>, không ai build lại nó.',
         '<code>make linux-rebuild all</code>. Kiểm bằng <code>fdtget images/thermo.dtb …</code>.'],
        ['Kernel chết sớm trong <code>amba_read_periphid</code> (<code>synchronous external abort</code>), có khi không in gì',
         '<code>thermo.dts</code> dump từ QEMU <b>không</b> có <code>-bios</code>: cây có PL061 mà máy có <code>-bios</code> không có (Bài 36).',
         'Dump lại với đúng các thiết bị của Bước 1 (<code>-bios</code>, ổ virtio, card mạng); kiểm <code>grep -c pl061</code> = 0.'],
        ['<code>.config</code> có <code>BOOTLIN_AARCH64_GLIBC_BLEEDING_EDGE=y</code> thay vì stable',
         'Defconfig chỉ có <code>BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y</code>; Buildroot mặc định chọn bản bleeding-edge.',
         'Thêm <code>BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC_STABLE=y</code>, áp lại defconfig vào một <code>O=</code> mới.'],
        ['<code>lsmod</code> rỗng dù có node; <code>modprobe tsensor</code> → <code>module tsensor not found</code>',
         '<code>uname -r</code> khác tên thư mục trong <code>/lib/modules</code>, hoặc package <code>tsensor</code> chưa bật.',
         'So <code>uname -r</code> với <code>ls /lib/modules</code>; kiểm <code>BR2_PACKAGE_TSENSOR=y</code> trong <code>.config</code>.'],
        ['<code>WARNING: tsensor-1.0: cannot save license (TSENSOR_LICENSE_FILES not defined)</code> khi <code>make legal-info</code>',
         'Package khai <code>_LICENSE</code> nhưng không chỉ ra file giấy phép.',
         'Thêm file <code>LICENSE</code> vào <code>src/tsensor</code> và <code>TSENSOR_LICENSE_FILES = LICENSE</code>.'],
        ['<code>Your PATH contains spaces, TABs, and/or newline (\\n) characters.</code>',
         'Shell WSL mới lại nối <code>PATH</code> của Windows vào (Bài 60).',
         'Đặt lại <code>PATH</code> sạch ở đầu mỗi terminal.']
      ] },

    { t: 'recap', items: [
      'Thermo = <b>sáu lớp</b> từ <b>một</b> cây br2-external (<b>25</b> file) và <b>một</b> defconfig 35 dòng: ' +
        'U-Boot 2026.01, Linux 6.18.45-thermo, <code>thermo.dts</code>, <code>tsensor.ko</code>, ' +
        '<code>temp_daemon</code>, rootfs Buildroot 2026.02.3.',
      'External toolchain Bootlin (GCC <b>14.3.0</b>) cắt build từ 24m41s (Bài 60) xuống <b>6m55s</b> và cho phép ' +
        'build U-Boot từ mã nguồn — thứ GCC 9.4 không làm được ở Bài 66.',
      'U-Boot boot sản phẩm bằng <code>extlinux.conf</code> trong <code>/boot</code> của rootfs, trên ' +
        '<code>disk.img</code> có MBR do <code>genimage</code> dựng — không còn <code>bootcmd</code> viết cứng.',
      'Driver tự nạp không cần <code>insmod</code>: <code>MODULE_DEVICE_TABLE</code> → <code>modules.alias</code> ' +
        '(<code>depmod</code>) → <code>S10mdev</code> + <code>modprobe</code> theo <code>modalias</code>, ở <b>2,09 s</b>.',
      'Lần boot đầu hỏng <b>im lặng</b>: thiếu <code>fdt_addr_r</code> → U-Boot đưa cây QEMU. Triệu chứng ở daemon, ' +
        'nguyên nhân ở bootloader; dòng <code>Machine model:</code> chỉ ra ngay. Sửa bằng patch 1 dòng + ' +
        '<code>uboot-dirclean</code> (<code>-rebuild</code> áp <b>0</b> patch).',
      'Sửa DTS rồi <code>make</code> trơn: <b>rc 0, ảnh mới, DTB cũ</b>. Đúng là <code>make linux-rebuild all</code> ' +
        '(<b>9,6 s</b>). Luôn kiểm sản phẩm bằng <code>fdtget</code>/boot, không bằng mã trả về.',
      'Phát hành = <code>savedefconfig</code> khớp (IDENTICAL), <code>legal-info</code> (<b>370 MB</b> mã nguồn, ' +
        '6 package), README, MANIFEST, <code>SHA256SUMS</code> — tarball <b>15,3 MB</b>. Tổng kiểm tra chống hỏng, ' +
        'không chống giả mạo.'
    ] },

    { t: 'cal', kind: 'danger', title: 'Dọn dẹp',
      x: '<code>~/bai67</code> chiếm khoảng <b>4,2 GB</b>, gần hết là <code>out/</code>. Giữ <code>~/bai67/thermo</code> ' +
         '(176 KB) — đó là sản phẩm của bạn, nên đưa vào một kho Git riêng. Mọi thứ khác dựng lại được trong ' +
         '7 phút. Bài 68 có thể xuất phát từ cây này.' },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Thermo boot được, nhưng ai sửa được <code>disk.img</code> thì sửa được mọi thứ: U-Boot nạp bất cứ ' +
         '<code>Image</code> nào nằm ở <code>/boot</code>, rootfs ghi được, root không có mật khẩu, và ' +
         '<code>SHA256SUMS</code> chỉ bắt được lỗi vô tình. <b>Bài 68 — Bảo mật và secure boot</b> biến từng điểm ' +
         'yếu đó thành một mắt xích của <i>chain of trust</i>: ảnh FIT có chữ ký mà Bài 36 đã chạm tới, rootfs chỉ ' +
         'đọc kèm overlay, và đo xem một bản <code>Image</code> bị sửa một byte có còn boot được nữa không.' }
  ],

  quiz: [
    { q: 'Thermo boot tới <code>thermo login:</code>, log có <code>Starting temp_daemon: OK</code>, nhưng ' +
         '<code>ps</code> không thấy daemon và <code>/dev/tsensor0</code> không tồn tại. Dòng log nào nên tìm <b>đầu tiên</b>?',
      opts: [
        '<code>Starting mdev... OK</code>',
        '<code>Machine model:</code> của kernel',
        '<code>udhcpc: lease of 10.0.2.15 obtained</code>',
        '<code>EXT4-fs (vda1): mounted filesystem</code>'
      ],
      a: 1,
      why: 'Không có file thiết bị nghĩa là <code>probe()</code> không chạy, thường vì không có node phù hợp trong ' +
           'cây. <code>Machine model:</code> cho biết kernel đang dùng cây nào trong một dòng: ở Bước 3 nó là ' +
           '<code>linux,dummy-virt</code> (cây QEMU) thay vì <code>Thermo board (QEMU virt)</code>. Đi ngược từ ' +
           'triệu chứng ở lớp trên xuống từng lớp dưới; <code>OK</code> của script init chỉ nói tiến trình được khởi chạy.' },

    { q: 'Vì sao U-Boot 2026.01 bỏ qua dòng <code>fdt /boot/thermo.dtb</code> trong <code>extlinux.conf</code> mà không báo lỗi?',
      opts: [
        'Vì file <code>thermo.dtb</code> nằm sai phân vùng',
        'Vì <code>BOOTDELAY=1</code> quá ngắn để nạp hai file',
        'Vì môi trường mặc định của <code>qemu-arm</code> không có <code>fdt_addr_r</code>, nên <code>pxe_utils.c</code> rơi xuống kịch bản dùng <code>fdt_addr</code>',
        'Vì kernel 6.18.45 không nhận cây do U-Boot nạp'
      ],
      a: 2,
      why: '<code>ext4ls</code> cho thấy <code>thermo.dtb</code> có trên đĩa. <code>pxe_utils.c</code> chỉ nạp file ' +
           '<code>fdt</code> khi <code>fdt_addr_r</code> tồn tại; nếu không, nó dùng <code>fdt_addr</code> = ' +
           '<code>0x40000000</code>, cây QEMU, và không in gì. Sửa bằng cách đưa biến vào môi trường biên dịch sẵn ' +
           '(patch), không bằng <code>setenv</code> trên một máy.' },

    { q: 'Bạn sửa <code>learn,offset-mdeg</code> trong <code>sensor.dtsi</code> rồi chạy <code>make</code>: rc 0, ' +
         '<code>disk.img</code> có giờ mới. Thiết bị vẫn báo giá trị cũ. Vì sao, và lệnh nào đúng?',
      opts: [
        'Ảnh đĩa bị cache trong QEMU; chạy lại QEMU với <code>-snapshot</code>',
        'Stamp của package <code>linux</code> còn nên DTB không được build lại; dùng <code>make linux-rebuild all</code>',
        'Overlay ghi đè <code>/boot</code>; xoá <code>overlay/</code>',
        'Cần <code>make clean all</code> vì Buildroot không hỗ trợ build lại một phần'
      ],
      a: 1,
      why: 'DTB được build trong package <code>linux</code>. <code>make</code> chỉ chạy những bước chưa có stamp, rồi ' +
           'đóng lại rootfs từ <code>target/</code> cũ — nên ảnh mới nhưng nội dung cũ. <code>linux-rebuild</code> ' +
           'xoá stamp build/install của <code>linux</code>, Kbuild chỉ biên dịch lại DTB (9,6 s), <code>all</code> ' +
           'đóng ảnh. <code>make clean all</code> cũng đúng nhưng tốn 7 phút.' },

    { q: 'Trong Thermo, cái gì làm <code>tsensor.ko</code> được nạp lúc boot?',
      opts: [
        'Một dòng <code>insmod</code> trong <code>S60temp_daemon</code>',
        'Kernel tự nạp mọi module trong <code>/lib/modules</code> lúc boot',
        '<code>S10mdev</code> gọi <code>modprobe</code> với chuỗi <code>modalias</code> của thiết bị, khớp với <code>modules.alias</code> do <code>depmod</code> sinh từ <code>MODULE_DEVICE_TABLE</code>',
        'U-Boot nạp module cùng lúc với kernel'
      ],
      a: 2,
      why: 'Không có <code>insmod</code> nào trong sản phẩm. <code>dmesg</code> cho thấy module nạp ở 2,09 s, sau ' +
           '<code>Run /sbin/init</code> (0,43 s): userspace làm việc này. <code>of:NsensorT(null)Clearn,temp-sensor</code> ' +
           'khớp mẫu <code>of:N*T*Clearn,temp-sensor</code> trong <code>modules.alias</code> → <code>tsensor</code>.' },

    { q: 'Vì sao bài dùng toolchain external Bootlin thay vì để Buildroot tự build toolchain như Bài 60?',
      opts: [
        'Toolchain internal của Buildroot không hỗ trợ aarch64',
        'Bootlin dùng musl nên ảnh nhỏ hơn',
        'Tiết kiệm phần lớn thời gian build (toolchain chiếm 47 % ở Bài 60, ở đây 6,4 s giải nén) mà vẫn có GCC 14.3.0 đủ mới để build U-Boot 2026.01',
        'Vì kernel 6.18.45 chỉ build được bằng toolchain Bootlin'
      ],
      a: 2,
      why: 'Toolchain internal vẫn dùng được (Bài 60 đã build gcc 14.3.0 + glibc), nhưng tốn 683 s. Bản Bootlin ' +
           'stable cũng là GCC 14.3.0 + glibc, dựng sẵn và có hash trong Buildroot; build cả sản phẩm còn 6m55s. ' +
           'GCC ≥ 10 là điều kiện U-Boot hiện đại đòi, thứ GCC 9.4 của Ubuntu 20.04 không đạt ở Bài 66.' },

    { q: 'Người nhận chạy <code>sha256sum -c SHA256SUMS</code> trên bản phát hành Thermo và mọi file đều <code>OK</code>. Điều đó chứng minh gì?',
      opts: [
        'Bản phát hành do chính bạn tạo ra và không ai sửa',
        'Các file khớp với danh sách tổng đi kèm — tức không bị hỏng khi tải về; nhưng ai sửa được file cũng sửa được danh sách',
        'Ảnh sẽ boot được trên mọi bo mạch aarch64',
        'Mọi giấy phép GPL đã được tuân thủ'
      ],
      a: 1,
      why: 'Bước 6 cho thấy thêm một byte vào <code>thermo.dtb</code> làm <code>sha256sum -c</code> trả 1 — tổng ' +
           'kiểm tra bắt được hỏng hóc. Nhưng <code>SHA256SUMS</code> nằm ngay cạnh các file và không được ký, nên ' +
           'kẻ sửa ảnh chỉ cần tính lại tổng. Chống giả mạo cần chữ ký và một chuỗi tin cậy — Bài 68.' }
  ]
});

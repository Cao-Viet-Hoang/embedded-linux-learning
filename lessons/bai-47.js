/* Bài 47 — BusyBox — dựng rootfs bằng tay
   Chặng 09 — Root filesystem
   Nối tiếp Bài 46: thay BusyBox Debian build sẵn bằng BusyBox tự cross-compile từ mã nguồn
   (1.38.0, defconfig + CONFIG_STATIC), để make install tạo 408 symlink, rồi viết tay ba file
   /etc/fstab, /etc/init.d/rcS, /etc/inittab (cùng passwd/group/hostname) để hệ thống tự gắn
   /proc /sys /tmp và tự mở shell trên ttyAMA0 mà không ai gõ gì.
   Ba lần boot: không có /etc (init dùng bảng mặc định) → fstab + rcS → inittab (respawn).
   Mọi số liệu đo 2026-09-28 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1),
   kernel ~/bai38/linux-6.18.45. Không dạy vì sao PID 1 không được chết, tín hiệu gửi init,
   SysV/runlevel hay systemd (Bài 49); không initramfs/SquashFS (Bài 48). */

Lesson.register({
  id: 'bai-47',
  title: 'BusyBox — dựng rootfs bằng tay',
  minutes: 50,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Cuối Bài 46, rootfs của bạn chạy được nhưng còn ba vết vá tạm. BusyBox là bản Debian build ' +
    'sẵn, với <b>280</b> lệnh mà bạn không chọn. Mười một symlink được tạo bằng một vòng ' +
    '<code>for</code> gõ tay. Và mỗi lần boot, bạn phải tự gõ ba lệnh <code>mount</code> thì ' +
    '<code>ps</code> mới chạy được — vì PID 1 là một shell, và shell không biết gì về việc ' +
    'khởi động một hệ thống.<br><br>' +
    'Bài này thay cả ba. Bạn tải mã nguồn BusyBox, cấu hình nó bằng đúng hệ Kconfig của kernel ' +
    'mà Bài 39 đã dạy, cross-compile thành <b>một file tĩnh duy nhất</b>, rồi để ' +
    '<code>make install</code> dựng <b>408</b> symlink trong một lệnh. Sau đó bạn viết tay ba ' +
    'file nhỏ trong <code>/etc</code> — tổng cộng chưa tới 30 dòng — và lần đầu tiên, máy ảo ' +
    'boot thẳng vào một shell đã có sẵn <code>/proc</code>, <code>/sys</code>, <code>/tmp</code>, ' +
    'ổ đĩa ghi được và tên máy, mà bạn không gõ một ký tự nào.<br><br>' +
    'Trên đường đi, bạn sẽ gặp một điều nghe như câu đố: một chương trình duy nhất có thể là ' +
    '<code>ls</code>, <code>cat</code>, <code>mount</code> <i>và</i> <code>init</code> cùng lúc, ' +
    'tuỳ theo <b>tên mà bạn gọi nó</b>.',

  goals: [
    'Giải thích được vì sao một binary BusyBox trả lời được hàng trăm lệnh — cơ chế ' +
      '<code>argv[0]</code> — và chứng minh nó bằng một symlink mang tên lạ.',
    'Cấu hình BusyBox từ mã nguồn bằng <code>make defconfig</code>, bật ' +
      '<code>CONFIG_STATIC</code>, cross-compile cho ARM64 và kiểm chứng kết quả là một file ' +
      'tĩnh bằng <code>file</code> và <code>readelf -l</code>.',
    'Dùng <code>make install</code> để dựng cây <code>bin sbin usr/bin usr/sbin</code> và ' +
      'biến nó thành một rootfs boot được.',
    'Viết được <code>/etc/fstab</code>, một script khởi động <code>/etc/init.d/rcS</code> và ' +
      '<code>/etc/inittab</code> cho BusyBox init, và đọc được từng trường của mỗi dòng.',
    'Từ một thông báo lúc boot như <code>can\'t run \'/etc/init.d/rcS\'</code> hay ' +
      '<code>Bad inittab entry</code>, chỉ ra được file nào trong <code>/etc</code> sai và sai ' +
      'ở đâu.'
  ],

  blocks: [

    /* ============================================================
       1. MỘT BINARY, TRĂM LỆNH
       ============================================================ */
    { t: 'h2', x: 'Một binary, trăm lệnh' },

    { t: 'p', x:
      'Trên máy WSL của bạn, mỗi lệnh là một file riêng. <code>/bin/ls</code> nặng 142 144 byte, ' +
      '<code>/bin/cat</code> 43 416 byte, <code>/bin/mount</code> 55 528 byte — mỗi file mang ' +
      'mã khởi động riêng, bảng ký hiệu riêng, cách đọc tham số riêng, và (vì chúng liên kết ' +
      'động) cùng trỏ tới một <code>libc.so.6</code> dùng chung. Trên một máy chủ có hàng trăm GB ' +
      'đĩa, sự trùng lặp đó không đáng bận tâm. Trên một bo mạch có 16 MB flash, nó là toàn bộ ' +
      'vấn đề.' },

    { t: 'p', x:
      '<b>BusyBox</b> giải quyết bằng cách gộp: mã của hàng trăm lệnh Unix quen thuộc được biên ' +
      'dịch vào <b>một</b> file thực thi duy nhất, dùng chung một hàm <code>main()</code>, một bộ ' +
      'hàm tiện ích (<code>libbb</code>) và một bản libc. Mỗi lệnh bên trong gọi là một ' +
      '<b>applet</b>. Một cách hình dung: máy WSL giống một tủ đồ nghề, mỗi dụng cụ một hộp riêng ' +
      'kèm hướng dẫn riêng; BusyBox là một con <b>dao đa năng</b> — một cái cán, nhiều lưỡi, và ' +
      'bạn chọn lưỡi bằng cách gọi tên nó. Chính tài liệu của BusyBox tự giới thiệu là ' +
      '<i>\"The Swiss Army Knife of Embedded Linux\"</i>.' },

    { t: 'p', x:
      'Câu hỏi là: file đó biết bạn muốn lưỡi nào bằng cách nào? Khi bạn gõ <code>ls</code>, ' +
      'shell gọi <code>execve()</code> và truyền cho chương trình một mảng tham số, trong đó phần ' +
      'tử đầu tiên, <code>argv[0]</code>, là <b>tên mà chương trình được gọi</b> — Bài 20 đã thấy ' +
      'nó khi viết <code>exec</code>. Nếu <code>/bin/ls</code> là một symlink trỏ tới ' +
      '<code>busybox</code>, kernel chạy file <code>busybox</code>, nhưng <code>argv[0]</code> vẫn ' +
      'là <code>ls</code>. BusyBox đọc tên đó, tra trong bảng applet, và gọi hàm ' +
      '<code>ls_main()</code>. Dòng quyết định nằm ở <code>libbb/appletlib.c:924</code>:' },

    { t: 'code', where: 'file', name: 'libbb/appletlib.c — dòng 924 (BusyBox 1.38.0)', lang: 'c', code:
      'applet_name = bb_get_last_path_component_nostrip(argv[0]);' },

    { t: 'fig',
      cap: 'Ba cái tên, một file. Kernel chạy cùng một <code>busybox</code> cho cả ba; thứ khác ' +
           'nhau duy nhất là <code>argv[0]</code>. BusyBox cắt phần thư mục, tra tên còn lại trong ' +
           'bảng applet sinh ra lúc build, và nhảy vào hàm tương ứng. Tên không có trong bảng thì ' +
           'nhận câu <code>applet not found</code>.',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="Ba symlink /bin/ls, /bin/cat và /sbin/init cùng trỏ tới /bin/busybox; BusyBox đọc argv[0], tra bảng applet và gọi ls_main, cat_main hoặc init_main">' +
        '<rect class="d-box" x="14" y="20" width="150" height="46" rx="6"/>' +
        '<text class="d-tm" x="26" y="40">/bin/ls</text>' +
        '<text class="d-ts" x="26" y="56">symlink → busybox</text>' +
        '<rect class="d-box" x="14" y="80" width="150" height="46" rx="6"/>' +
        '<text class="d-tm" x="26" y="100">/bin/cat</text>' +
        '<text class="d-ts" x="26" y="116">symlink → busybox</text>' +
        '<rect class="d-box" x="14" y="140" width="150" height="46" rx="6"/>' +
        '<text class="d-tm" x="26" y="160">/sbin/init</text>' +
        '<text class="d-ts" x="26" y="176">symlink → ../bin/busybox</text>' +
        '<line class="d-line" x1="164" y1="43" x2="226" y2="98"/>' +
        '<line class="d-line" x1="164" y1="103" x2="226" y2="103"/>' +
        '<line class="d-line" x1="164" y1="163" x2="226" y2="108"/>' +
        '<path class="d-arrow" d="M 234 103 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="234" y="70" width="170" height="66" rx="6"/>' +
        '<text class="d-t" x="246" y="94">Một file thực thi</text>' +
        '<text class="d-tm" x="246" y="114">/bin/busybox</text>' +
        '<text class="d-ts" x="246" y="128">2 094 192 byte, tĩnh</text>' +
        '<line class="d-line" x1="404" y1="103" x2="426" y2="103"/>' +
        '<path class="d-arrow" d="M 434 103 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="434" y="70" width="120" height="66" rx="6"/>' +
        '<text class="d-t" x="446" y="94">Đọc argv[0]</text>' +
        '<text class="d-ts" x="446" y="114">cắt thư mục,</text>' +
        '<text class="d-ts" x="446" y="128">tra bảng applet</text>' +
        '<line class="d-line" x1="554" y1="95" x2="580" y2="43"/>' +
        '<line class="d-line" x1="554" y1="103" x2="580" y2="103"/>' +
        '<line class="d-line" x1="554" y1="111" x2="580" y2="163"/>' +
        '<rect class="d-box-g" x="584" y="20" width="122" height="46" rx="6"/>' +
        '<text class="d-tm" x="596" y="48">ls_main()</text>' +
        '<rect class="d-box-g" x="584" y="80" width="122" height="46" rx="6"/>' +
        '<text class="d-tm" x="596" y="108">cat_main()</text>' +
        '<rect class="d-box-g" x="584" y="140" width="122" height="46" rx="6"/>' +
        '<text class="d-tm" x="596" y="168">init_main()</text>' +
        '<rect class="d-box-w" x="14" y="210" width="692" height="62" rx="6"/>' +
        '<text class="d-t" x="26" y="234">Cùng một file, gọi bằng tên lạ</text>' +
        '<text class="d-tm" x="26" y="256">ln -s /bin/busybox /tmp/mytool; /tmp/mytool  →  mytool: applet not found</text>' +
        '</svg>' },

    { t: 'p', x:
      'Mỗi applet tự khai báo mình với hệ thống build bằng một dòng chú thích đặc biệt trong mã ' +
      'nguồn của nó. Với <code>ls</code>, đó là dòng 95 của <code>coreutils/ls.c</code>: ' +
      '<code>//applet:IF_LS(APPLET_NOEXEC(ls, ls, BB_DIR_BIN, BB_SUID_DROP, ls))</code>. Đọc từ ' +
      'trái sang: nếu <code>CONFIG_LS</code> được bật thì có applet tên <code>ls</code>, và khi ' +
      'cài đặt, symlink của nó nằm trong <code>/bin</code> (<code>BB_DIR_BIN</code>). Lúc build, ' +
      'một công cụ quét mọi dòng như thế để sinh ra bảng applet và danh sách ' +
      '<code>busybox.links</code> — thứ mà <code>make install</code> sẽ dùng ở bước 4.' },

    { t: 'table',
      head: ['', 'Mỗi lệnh một file (máy WSL)', 'BusyBox (bài này)'],
      rows: [
        ['Số file thực thi', 'Hàng trăm', '<b>Một</b>, cộng symlink'],
        ['Kích thước cho cùng tập lệnh', '<b>24 077 534</b> byte cho 251 lệnh cùng tên tìm thấy trên host (đo ở bước 4)', '<b>2 094 192</b> byte cho 408 applet'],
        ['Cách chọn lệnh', 'Mỗi file chỉ là một lệnh', 'Theo <code>argv[0]</code>'],
        ['Tính năng mỗi lệnh', 'Đầy đủ (GNU coreutils)', 'Rút gọn, đủ dùng — nhiều tuỳ chọn hiếm bị bỏ'],
        ['Chọn lệnh nào có mặt', 'Theo gói cài đặt', 'Theo <code>.config</code> lúc build']
      ] },

    { t: 'cal', kind: 'warn', title: 'Applet không phải bản sao của lệnh GNU',
      x: 'Để nhỏ, mỗi applet chỉ cài những tuỳ chọn phổ biến. Một script chạy tốt trên WSL (GNU ' +
         'coreutils, bash) có thể hỏng trên BusyBox vì một tuỳ chọn hiếm không tồn tại, hoặc vì ' +
         '<code>/bin/sh</code> là <b>ash</b> của BusyBox chứ không phải bash. Bước 5 sẽ cho bạn ' +
         'gặp đúng trường hợp thứ hai. Muốn biết một applet hỗ trợ gì, gõ ' +
         '<code>busybox ls --help</code> ngay trong máy ảo — không cần thuộc.' },

    /* ============================================================
       2. CẤU HÌNH VÀ BUILD: CÙNG KCONFIG VỚI KERNEL
       ============================================================ */
    { t: 'h2', x: 'Cấu hình BusyBox: cùng một Kconfig với kernel' },

    { t: 'p', x:
      'Mở cây mã nguồn BusyBox ra, bạn sẽ thấy những cái tên quen: <code>Config.in</code>, ' +
      '<code>scripts/kconfig</code>, <code>make defconfig</code>, <code>make menuconfig</code>, ' +
      'và một file <code>.config</code> chứa những dòng <code>CONFIG_…=y</code> hoặc ' +
      '<code># CONFIG_… is not set</code>. BusyBox mượn nguyên hệ Kconfig của kernel từ nhiều năm ' +
      'trước. Mọi thứ Bài 39 dạy — bốn trạng thái của một symbol, <code>defconfig</code>, ' +
      '<code>oldconfig</code>, <code>menuconfig</code> — áp dụng ở đây gần như y nguyên. Khác ' +
      'biệt là quy mô: kernel có <b>22 125</b> symbol, BusyBox có một <code>.config</code> ' +
      '<b>1 248</b> dòng, và mỗi symbol thường ứng với <b>một applet</b> hoặc một tính năng của ' +
      'applet.' },

    { t: 'table',
      head: ['Khái niệm', 'Kernel (Bài 39–40)', 'BusyBox (bài này)'],
      rows: [
        ['Cấu hình mặc định', '<code>make ARCH=arm64 defconfig</code>', '<code>make defconfig</code> — bật gần như mọi applet (<b>890</b> dòng <code>=y</code>)'],
        ['Giao diện chọn', '<code>make menuconfig</code>', '<code>make menuconfig</code> — cần gói <code>libncurses-dev</code>'],
        ['Chọn kiến trúc đích', '<code>ARCH=arm64</code> <b>bắt buộc</b>', 'Không cần <code>ARCH</code>: BusyBox là chương trình userspace, toolchain đã quyết định kiến trúc'],
        ['Chọn toolchain', '<code>CROSS_COMPILE=aarch64-linux-gnu-</code>', 'Giống hệt, hoặc ghi cố định vào <code>CONFIG_CROSS_COMPILER_PREFIX</code>'],
        ['Kết quả', '<code>Image</code> 49 MB + 1 423 <code>.ko</code>', '<b>Một</b> file <code>busybox</code> 2 MB']
      ] },

    { t: 'p', x:
      'Dòng thứ ba đáng dừng lại. Kernel cần <code>ARCH</code> vì mã nguồn của nó chứa hàng chục ' +
      'thư mục <code>arch/*</code> với mã khởi động, bảng ngắt, mã hợp ngữ riêng cho từng loại ' +
      'CPU — phải chọn đúng một. BusyBox chỉ là chương trình C bình thường gọi hàm libc; thư mục ' +
      '<code>arch/</code> của nó chỉ có bốn mục (<code>i386 sparc sparc64 x86_64</code>) và ARM64 ' +
      'không nằm trong đó. Thứ quyết định file ra là ARM64 hay x86-64 là <b>trình biên dịch</b>: ' +
      '<code>aarch64-linux-gnu-gcc</code> chỉ biết sinh mã ARM64. Bạn sẽ thấy ở bước 3 rằng lệnh ' +
      'build không có chữ <code>ARCH</code> nào mà vẫn ra đúng kiến trúc.' },

    { t: 'h3', x: '<code>CONFIG_STATIC</code>: vì sao bật, và cái giá' },

    { t: 'p', x:
      'Trong 1 248 dòng, chỉ có một dòng bạn phải đổi: <code>CONFIG_STATIC</code>, tuỳ chọn ' +
      '<i>\"Build static binary (no shared libs)\"</i> trong menu <code>Settings</code>, mặc định ' +
      'tắt. Bài 46 đã cho bạn thấy tại sao nó quan trọng: một chương trình động thiếu loader ' +
      'làm init chết <b>trong im lặng</b>, không để lại một dòng log. Một BusyBox tĩnh không có ' +
      'phần <code>INTERP</code>, không cần <code>/lib</code> — rootfs chỉ cần đúng một file.' },

    { t: 'p', x:
      'Cái giá đến từ glibc, thư viện C mà toolchain <code>aarch64-linux-gnu</code> dùng. glibc ' +
      'được thiết kế cho liên kết động, và khi ép liên kết tĩnh nó kéo theo khá nhiều mã. Lúc ' +
      'build, BusyBox in thẳng ra cảnh báo <code>Static linking against glibc, can\'t use ' +
      '--gc-sections</code> — nghĩa là trình liên kết không được phép vứt bỏ những đoạn mã không ' +
      'dùng tới. Bài 28 đã đo: cùng một chương trình, bản tĩnh musl nhỏ hơn bản tĩnh glibc ' +
      '<b>7,24</b> lần. Với BusyBox, bạn sẽ nhận một file <b>2 094 192</b> byte. Chặng 11 ' +
      '(Buildroot) sẽ build lại với musl hoặc uClibc-ng để thấy nó nhỏ đi.' },

    { t: 'cal', kind: 'why', title: 'Vì sao hệ thống nhúng chọn tĩnh cho BusyBox, dù tốn hơn vài trăm KB',
      x: 'Một rootfs nhúng thường có BusyBox <b>và gần như không gì khác</b> ở giai đoạn đầu — ' +
         'bootloader, kernel, BusyBox, một hai chương trình của bạn. Bài 17 đã tính điểm hoà ' +
         'vốn tĩnh/động ở khoảng <b>3</b> chương trình. Với một chương trình (BusyBox, dù nó là ' +
         '408 lệnh), tĩnh thắng: không phải mang <code>libc.so.6</code> 1,4 MB và loader 145 KB ' +
         'mà Bài 46 đã chép. Quan trọng hơn: tĩnh loại bỏ cả một loại lỗi — không bao giờ có ' +
         '\"thiếu thư viện\", không bao giờ có \"libc trên rootfs khác bản toolchain\". Nguyên tắc ' +
         'đáng nhớ: <b>init là chương trình cuối cùng bạn muốn phụ thuộc vào thứ gì khác</b>.' },

    /* ============================================================
       3. BUSYBOX INIT VÀ BA FILE TRONG /etc
       ============================================================ */
    { t: 'h2', x: 'BusyBox init và ba file trong <code>/etc</code>' },

    { t: 'p', x:
      'Ở Bài 46, PID 1 là một shell — kernel rơi xuống đường dự phòng cuối cùng <code>/bin/sh</code>. ' +
      'Shell làm tốt việc của nó: đọc lệnh bạn gõ và chạy. Nhưng nó không biết rằng mình đang là ' +
      'chương trình đầu tiên của cả hệ thống, và rằng trước khi mời ai vào, phải có người gắn ' +
      '<code>/proc</code>, đặt tên máy, mở console. Việc đó cần một chương trình <b>init</b> thực ' +
      'thụ. <code>make install</code> sẽ tạo <code>/sbin/init</code> là symlink tới BusyBox, và vì ' +
      'kernel thử <code>/sbin/init</code> <b>đầu tiên</b>, từ bước 4 trở đi PID 1 sẽ là applet ' +
      '<code>init</code> của BusyBox chứ không còn là shell.' },

    { t: 'p', x:
      'BusyBox init làm việc theo một <b>bảng hành động</b>. Mỗi hành động là một bộ ba: chạy ' +
      '<i>lệnh gì</i>, trên <i>terminal nào</i>, vào <i>lúc nào</i>. Bảng đó được đọc từ ' +
      '<code>/etc/inittab</code>. Nếu file không tồn tại, init tự dựng một bảng mặc định — và ' +
      'đây là toàn bộ bảng đó, trong hàm <code>parse_inittab()</code> ở ' +
      '<code>init/init.c:681–695</code>:' },

    { t: 'code', where: 'file', name: 'init/init.c — dòng 678–695 (BusyBox 1.38.0)', lang: 'c', code:
      '\t\t/* No inittab file - set up some default behavior */\n' +
      '\t\t/* Sysinit */\n' +
      '\t\tnew_init_action(SYSINIT, INIT_SCRIPT, "");\n' +
      '\t\t/* Askfirst shell on tty1-4 */\n' +
      '\t\tnew_init_action(ASKFIRST, bb_default_login_shell, "");\n' +
      '\t\tnew_init_action(ASKFIRST, bb_default_login_shell, VC_2);\n' +
      '\t\tnew_init_action(ASKFIRST, bb_default_login_shell, VC_3);\n' +
      '\t\tnew_init_action(ASKFIRST, bb_default_login_shell, VC_4);\n' +
      '\t\t/* Reboot on Ctrl-Alt-Del */\n' +
      '\t\tnew_init_action(CTRLALTDEL, "reboot", "");\n' +
      '\t\t/* Umount all filesystems on halt/reboot */\n' +
      '\t\tnew_init_action(SHUTDOWN, "umount -a -r", "");\n' +
      '\t\t/* Swapoff on halt/reboot */\n' +
      '\t\tnew_init_action(SHUTDOWN, "swapoff -a", "");\n' +
      '\t\t/* Restart init when a QUIT is received */\n' +
      '\t\tnew_init_action(RESTART, "init", "");' },

    { t: 'p', x:
      '<code>INIT_SCRIPT</code> được định nghĩa ở dòng 156 là <code>"/etc/init.d/rcS"</code>. ' +
      'Vậy dù bạn chưa viết gì, init đã có kế hoạch: chạy <code>/etc/init.d/rcS</code> một lần, ' +
      'rồi mở một shell trên console và ba shell nữa trên <code>tty2</code>–<code>tty4</code>, ' +
      'mỗi shell chờ bạn nhấn <kbd>Enter</kbd> (<code>ASKFIRST</code>). Bước 4 sẽ cho bạn thấy kế ' +
      'hoạch này chạy trên một rootfs có <code>/etc</code> rỗng — kể cả ba tiến trình ' +
      '<code>init</code> con đang đợi trên ba terminal không ai nhìn thấy.' },

    { t: 'fig',
      cap: 'Trình tự của BusyBox init sau khi kernel gọi nó. Hai file chạy <b>một lần</b> ở đầu ' +
           '(<code>rcS</code>, và <code>fstab</code> mà <code>rcS</code> đọc qua ' +
           '<code>mount -a</code>); <code>inittab</code> nói init chạy gì và giữ gì sống mãi. ' +
           'Vòng lặp cuối là lý do init không bao giờ thoát: nó ngồi chờ con chết để hồi sinh chúng.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Trình tự BusyBox init: đọc /etc/inittab, chạy các dòng sysinit (rcS, rcS gọi mount -a đọc /etc/fstab), rồi wait, once, rồi vòng lặp respawn/askfirst chờ tiến trình con chết và khởi động lại">' +
        '<rect class="d-box-p" x="14" y="14" width="160" height="56" rx="6"/>' +
        '<text class="d-t" x="26" y="38">Kernel</text>' +
        '<text class="d-tm" x="26" y="58">Run /sbin/init</text>' +
        '<line class="d-line" x1="174" y1="42" x2="196" y2="42"/>' +
        '<path class="d-arrow" d="M 204 42 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="204" y="14" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="216" y="38">init đọc bảng</text>' +
        '<text class="d-tm" x="216" y="58">/etc/inittab</text>' +
        '<line class="d-line" x1="384" y1="42" x2="406" y2="42"/>' +
        '<path class="d-arrow" d="M 414 42 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-w" x="414" y="14" width="292" height="56" rx="6"/>' +
        '<text class="d-t" x="426" y="36">Không có file?</text>' +
        '<text class="d-ts" x="426" y="54">dùng bảng mặc định: rcS + askfirst</text>' +
        '<text class="d-ts" x="426" y="66">trên console, tty2, tty3, tty4</text>' +
        '<line class="d-line" x1="294" y1="70" x2="294" y2="92"/>' +
        '<path class="d-arrow" d="M 294 100 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box" x="14" y="100" width="692" height="70" rx="6"/>' +
        '<text class="d-t" x="26" y="122">1 · sysinit — chạy lần lượt, chờ từng cái xong</text>' +
        '<text class="d-tm" x="26" y="142">/etc/init.d/rcS  →  mount -a  (đọc /etc/fstab)  →  hostname  →  …</text>' +
        '<text class="d-ts" x="26" y="160">Nơi đặt mọi việc \"chuẩn bị hệ thống\". Không có file hoặc thiếu bit x: in can\'t run, đi tiếp.</text>' +
        '<line class="d-line" x1="294" y1="170" x2="294" y2="186"/>' +
        '<path class="d-arrow" d="M 294 194 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box" x="14" y="194" width="692" height="40" rx="6"/>' +
        '<text class="d-t" x="26" y="219">2 · wait (chạy và chờ)  ·  3 · once (chạy, không chờ)</text>' +
        '<line class="d-line" x1="294" y1="234" x2="294" y2="250"/>' +
        '<path class="d-arrow" d="M 294 258 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-g" x="14" y="258" width="692" height="60" rx="6"/>' +
        '<text class="d-t" x="26" y="280">4 · Vòng lặp mãi mãi: respawn / askfirst</text>' +
        '<text class="d-ts" x="26" y="300">Khởi động tiến trình → chờ bất kỳ con nào chết → nếu là respawn thì khởi động lại → chờ tiếp.</text>' +
        '</svg>' },

    { t: 'h3', x: '<code>/etc/inittab</code>: bốn trường, một trường bị bỏ qua' },

    { t: 'p', x:
      'Mỗi dòng của <code>inittab</code> có bốn trường, ngăn bằng dấu hai chấm: ' +
      '<code>&lt;tty&gt;:&lt;runlevel&gt;:&lt;action&gt;:&lt;process&gt;</code>. Đây là file ' +
      'bạn sẽ viết ở bước 6, đọc từng dòng:' },

    { t: 'code', where: 'file', name: 'rootfs/etc/inittab', lang: 'text', code:
      '# /etc/inittab for BusyBox init.  Format: <tty>:<runlevels>:<action>:<process>\n' +
      '::sysinit:/etc/init.d/rcS\n' +
      'ttyAMA0::respawn:-/bin/sh\n' +
      '::ctrlaltdel:/sbin/reboot\n' +
      '::shutdown:/bin/umount -a -r' },

    { t: 'table',
      head: ['Trường', 'Ý nghĩa với BusyBox init', 'Trong file trên'],
      rows: [
        ['<code>tty</code>', 'Terminal mà tiến trình dùng làm stdin/stdout/stderr, tính từ <code>/dev/</code>. <b>Để trống</b> = dùng console của chính init.', '<code>ttyAMA0</code> cho shell (cổng PL011 mà <code>console=ttyAMA0</code> chỉ tới); trống cho các dòng còn lại'],
        ['<code>runlevel</code>', '<b>Bị bỏ qua hoàn toàn.</b> Trường này có mặt để giữ định dạng giống SysV init; BusyBox không có runlevel.', 'Luôn để trống'],
        ['<code>action</code>', 'Khi nào chạy: <code>sysinit</code>, <code>wait</code>, <code>once</code>, <code>respawn</code>, <code>askfirst</code>, <code>ctrlaltdel</code>, <code>shutdown</code>, <code>restart</code>.', 'Bốn loại, xem bảng dưới'],
        ['<code>process</code>', 'Lệnh sẽ chạy. Dấu <code>-</code> đứng đầu = chạy như <b>login shell</b>.', '<code>-/bin/sh</code>: shell đọc <code>/etc/profile</code>, và <code>ps</code> hiện tên là <code>-/bin/sh</code>']
      ] },

    { t: 'table',
      head: ['action', 'Khi nào chạy', 'init có chờ không', 'Tiến trình chết thì'],
      rows: [
        ['<code>sysinit</code>', 'Đầu tiên, ngay khi init khởi động', '<b>Có</b> — chờ xong mới sang dòng kế', 'Thôi, không chạy lại'],
        ['<code>wait</code>', 'Sau mọi <code>sysinit</code>', 'Có', 'Thôi'],
        ['<code>once</code>', 'Sau mọi <code>wait</code>', 'Không', 'Thôi'],
        ['<code>respawn</code>', 'Sau mọi <code>once</code>', 'Không', '<b>Khởi động lại</b>'],
        ['<code>askfirst</code>', 'Như <code>respawn</code>', 'Không', 'Khởi động lại, nhưng trước đó in <code>Please press Enter to activate this console.</code> và chờ'],
        ['<code>ctrlaltdel</code>', 'Khi nhận tín hiệu <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Del</kbd> (SIGINT)', '—', '—'],
        ['<code>shutdown</code>', 'Khi tắt máy (<code>poweroff</code>, <code>reboot</code>)', 'Có', '—']
      ] },

    { t: 'cal', kind: 'tip', title: 'Hai cặp dễ nhầm, và cách nhớ',
      x: '<b><code>sysinit</code> vs <code>once</code></b>: cả hai chạy một lần, nhưng init <b>chờ</b> ' +
         '<code>sysinit</code> xong mới làm gì khác. Việc chuẩn bị (gắn hệ thống file) phải là ' +
         '<code>sysinit</code> — bạn không muốn shell mở ra khi <code>/proc</code> chưa gắn. ' +
         '<b><code>respawn</code> vs <code>askfirst</code></b>: <code>askfirst</code> là ' +
         '<code>respawn</code> có thêm câu \"Please press Enter\". Hữu ích khi có nhiều terminal ' +
         'và bạn không muốn tốn RAM chạy shell trên terminal không ai dùng — đó là lý do bảng mặc ' +
         'định dùng <code>askfirst</code> cho <code>tty2</code>–<code>tty4</code>. Không cần ' +
         'thuộc danh sách action: <code>busybox init --help</code> không in nó, nhưng file ' +
         '<code>examples/inittab</code> trong cây mã nguồn (96 dòng) giải thích từng loại.' },

    { t: 'h3', x: '<code>/etc/fstab</code>: danh sách hệ thống file cần gắn' },

    { t: 'p', x:
      'Ở Bài 46 bạn gõ <code>mount -t proc proc /proc</code> — ba thông tin: loại, nguồn, điểm ' +
      'gắn. <code>/etc/fstab</code> chỉ là nơi ghi sẵn những bộ ba đó, mỗi dòng một hệ thống file, ' +
      'để một lệnh <code>mount -a</code> (\"all\") gắn hết một lượt:' },

    { t: 'code', where: 'file', name: 'rootfs/etc/fstab', lang: 'text', code:
      '# <file system> <mount point> <type> <options> <dump> <pass>\n' +
      'proc            /proc         proc   defaults  0      0\n' +
      'sysfs           /sys          sysfs  defaults  0      0\n' +
      'tmpfs           /tmp          tmpfs  defaults  0      0' },

    { t: 'table',
      head: ['Cột', 'Ý nghĩa', 'Tương ứng trong <code>mount -t proc proc /proc</code>'],
      rows: [
        ['1 · file system', 'Nguồn. Với ổ đĩa là <code>/dev/vda</code>; với hệ thống file ảo chỉ là một cái nhãn', '<code>proc</code> thứ hai'],
        ['2 · mount point', 'Thư mục gắn vào — phải đã tồn tại', '<code>/proc</code>'],
        ['3 · type', 'Loại hệ thống file', '<code>-t proc</code>'],
        ['4 · options', 'Tuỳ chọn gắn. <code>defaults</code> = <code>rw,suid,dev,exec,auto,nouser,async</code>', 'Không có (tức là mặc định)'],
        ['5 · dump', 'Có sao lưu bằng <code>dump</code> không. Luôn <code>0</code> trên hệ nhúng', '—'],
        ['6 · pass', 'Thứ tự chạy <code>fsck</code> lúc boot. <code>0</code> = không kiểm tra; hệ thống file ảo luôn <code>0</code>', '—']
      ] },

    { t: 'cal', kind: 'info', title: 'Không có dòng nào cho / và /dev — cố ý',
      x: 'Kernel đã gắn <code>/</code> (từ <code>root=/dev/vda</code>) và <code>/dev</code> ' +
         '(devtmpfs, <code>CONFIG_DEVTMPFS_MOUNT</code>) trước khi init chạy — Bài 46 đã chứng ' +
         'minh cả hai. Liệt kê lại chúng trong <code>fstab</code> thì <code>mount -a</code> sẽ cố ' +
         'gắn chúng lần nữa. File này chỉ chứa những gì <b>còn thiếu</b>. Kernel cũng không bao ' +
         'giờ đọc <code>/etc/fstab</code>: chỉ có <code>mount -a</code>, <code>umount -a</code> và ' +
         '<code>swapoff -a</code> đọc nó.' },

    { t: 'h3', x: '<code>/etc/init.d/rcS</code>: script khởi động' },

    { t: 'p', x:
      '<code>rcS</code> (\"run commands, single-user\" — cái tên thừa kế từ SysV init) là một ' +
      'shell script bình thường. BusyBox init chạy nó bằng dòng <code>sysinit</code>, chờ nó ' +
      'xong, rồi mới mở shell. Mọi thứ Bài 13 dạy về script — shebang, biến, ' +
      '<code>$(...)</code> — đều dùng được, với hai lưu ý: trình thông dịch là <b>ash</b> của ' +
      'BusyBox, và lúc script chạy, hệ thống <b>chưa có gì</b> ngoài những gì kernel đã gắn.' },

    { t: 'code', where: 'file', name: 'rootfs/etc/init.d/rcS', lang: 'bash', code:
      '#!/bin/sh\n' +
      '# Run once by init at boot, before any shell is started.\n' +
      'echo "rcS: mounting filesystems from /etc/fstab"\n' +
      'mount -a\n' +
      'mount -o remount,rw /\n' +
      'hostname -F /etc/hostname\n' +
      'echo "rcS: done at $(cut -d \' \' -f 1 /proc/uptime) s, hostname is $(hostname)"' },

    { t: 'cmdx', cmd: 'rcS', title: 'Bốn lệnh làm việc của rcS',
      rows: [
        ['<code>#!/bin/sh</code>', 'Chạy bằng <code>/bin/sh</code> — symlink tới BusyBox, applet <code>ash</code>.', 'Không được viết <code>#!/bin/bash</code>: rootfs không có bash. Bước 6 cho bạn thấy hậu quả.'],
        ['<code>mount -a</code>', 'Gắn mọi dòng trong <code>/etc/fstab</code>.', 'Thay cho ba lệnh <code>mount</code> gõ tay ở Bài 46.'],
        ['<code>mount -o remount,rw /</code>', 'Gắn lại <code>/</code> ở chế độ ghi được.', 'Kernel gắn root <code>ro</code> (Bài 46). Init truyền thống chạy <code>fsck</code> trước dòng này; bài này bỏ qua bước đó.'],
        ['<code>hostname -F /etc/hostname</code>', 'Đặt tên máy từ nội dung file.', '<code>-F</code> = đọc từ file. Không có dòng này, tên máy là <code>(none)</code>.'],
        ['<code>$(cut -d \' \' -f 1 /proc/uptime)</code>', 'Số giây từ lúc kernel khởi động.', 'Chỉ đọc được <b>sau</b> <code>mount -a</code> — thử đặt dòng <code>echo</code> này lên trên cùng để thấy nó hỏng.']
      ]},

    { t: 'terms', items: [
      ['BusyBox', '', 'Một chương trình thực thi duy nhất chứa hàng trăm lệnh Unix rút gọn, dùng chung mã và libc. Chuẩn mực cho userspace của hệ nhúng nhỏ.'],
      ['Applet', '', 'Một lệnh bên trong BusyBox (<code>ls</code>, <code>mount</code>, <code>init</code>…). Được chọn theo tên mà BusyBox được gọi — <code>argv[0]</code>.'],
      ['Multi-call binary', '', 'Chương trình đổi hành vi theo <code>argv[0]</code>. BusyBox tự gọi mình như vậy trong dòng đầu của <code>busybox --help</code>.'],
      ['inittab', '', 'Bảng hành động của init: chạy gì, trên terminal nào, lúc nào. BusyBox có bảng mặc định dùng khi file không tồn tại.'],
      ['rcS', '', 'Script khởi động mà init chạy một lần (hành động <code>sysinit</code>) trước khi mở shell. Nơi đặt việc gắn hệ thống file, đặt tên máy, khởi động daemon.'],
      ['fstab', 'file system table', 'Danh sách hệ thống file cần gắn. Được <code>mount -a</code> đọc; kernel không đọc nó.'],
      ['respawn', '', 'Hành động của init: khởi động lại tiến trình mỗi khi nó chết. Lý do bạn không thể \"thoát\" khỏi shell của một hệ nhúng.'],
      ['Login shell', '', 'Shell được gọi với <code>argv[0]</code> bắt đầu bằng <code>-</code>. Nó đọc <code>/etc/profile</code> khi khởi động.']
    ] },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ tarball BusyBox đến một hệ thống tự khởi động' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<ul>' +
         '<li><code>~/bai38/linux-6.18.45/arch/arm64/boot/Image</code> — kernel của Bài 40, như ' +
         'Bài 46. Không build lại gì trong cây kernel.</li>' +
         '<li><code>aarch64-linux-gnu-gcc</code> (Bài 26), <code>make</code>, <code>bzip2</code>, ' +
         '<code>curl</code>, <code>mkfs.ext4</code> — đều đã có từ các chặng trước.</li>' +
         '<li>Khoảng <b>75 MB</b> đĩa: cây mã nguồn BusyBox sau khi build là 61 MB.</li>' +
         '<li>Bài này dựng rootfs mới trong <code>~/bai47</code> và <b>không</b> dùng lại ' +
         '<code>~/bai46</code>. Hai script <code>run.sh</code> và <code>mkimg.sh</code> giống hệt ' +
         'Bài 46 — bạn sẽ chép chúng sang.</li>' +
         '</ul>' +
         'Máy soạn bài: Ubuntu 20.04 trong WSL2, GCC <b>9.4</b>, GNU Make <b>4.2.1</b>, QEMU ' +
         '<b>4.2.1</b>, 16 CPU. Kích thước file BusyBox và thời gian build sẽ khác nếu phiên bản ' +
         'GCC của bạn khác; cấu trúc cây thư mục và số applet thì không.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Tải mã nguồn và kiểm chứng nó',
        blocks: [
          { t: 'p', x:
            'BusyBox phát hành mã nguồn dưới dạng tarball nén bzip2 trên <code>busybox.net</code>, ' +
            'kèm một file <code>.sha256</code> cho mỗi bản. Bài này dùng <b>1.38.0</b> — bản mới ' +
            'nhất lúc soạn, và cùng số phiên bản với gói Debian mà Bài 32 đã tải. Như mọi thứ tải ' +
            'qua mạng từ Chặng 07 trở đi, kiểm chứng bằng checksum trước khi dùng:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai47 && cd ~/bai47\n' +
            'curl -fLO https://busybox.net/downloads/busybox-1.38.0.tar.bz2\n' +
            'curl -fLO https://busybox.net/downloads/busybox-1.38.0.tar.bz2.sha256\n' +
            'sha256sum -c busybox-1.38.0.tar.bz2.sha256\n' +
            'ls -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            'busybox-1.38.0.tar.bz2: OK\n' +
            'total 2640\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 2695723 Sep 28 21:12 busybox-1.38.0.tar.bz2\n' +
            '-rw-r--r-- 1 cah8hc cah8hc      89 Sep 28 21:12 busybox-1.38.0.tar.bz2.sha256',
            notes: [
              'Đã lược bỏ thanh tiến trình của <code>curl</code>. Tên người dùng và ngày giờ sẽ khác trên máy bạn; kích thước <b>2 695 723</b> byte thì phải giống hệt.'
            ] },

          { t: 'cmdx', cmd: 'sha256sum -c busybox-1.38.0.tar.bz2.sha256', title: 'Kiểm tra checksum theo danh sách',
            rows: [
              ['<code>curl -fLO</code>', '<code>-f</code>: lỗi HTTP (404…) thì thoát với mã khác 0 thay vì lưu trang lỗi. <code>-L</code>: theo chuyển hướng. <code>-O</code>: lưu với tên file trên server.', 'Không có <code>-f</code>, một URL sai sẽ để lại một \"tarball\" thực chất là trang HTML báo 404.'],
              ['<code>-c</code>', 'Đọc file <code>.sha256</code> (dạng <code>băm  tên_file</code>), tự tính lại và so sánh.', 'In <code>OK</code> hoặc <code>FAILED</code> cho từng file. Mã thoát 0 chỉ khi mọi file khớp.']
            ]},

          { t: 'cal', kind: 'warn', title: 'Vì sao kiểm checksum chứ không kiểm kích thước',
            x: 'Một bản tải bị cắt cụt vẫn có tên đúng, và <code>ls -l</code> không cho bạn biết nó ' +
               'lẽ ra phải dài bao nhiêu. Proxy công ty có thể trả về một phần file mà không báo lỗi. ' +
               'Tarball hỏng sẽ lộ ra muộn — lúc <code>tar</code> báo <code>Unexpected EOF</code>, ' +
               'hoặc tệ hơn, lúc build thiếu một file. <code>OK</code> ở dòng đầu là bằng chứng duy ' +
               'nhất rằng bạn có đúng byte mà tác giả phát hành. Lưu ý: checksum chỉ chống hỏng đường ' +
               'truyền, không chống giả mạo; muốn chống giả mạo thì cần chữ ký, như Bài 38 làm với ' +
               'kernel. BusyBox cũng phát hành file <code>.sig</code>.' },

          { t: 'p', x:
            'Giải nén và nhìn vào bên trong. Mỗi thư mục cấp một là một <i>nhóm</i> applet, đặt tên ' +
            'theo gói phần mềm mà chúng bắt chước:' },

          { t: 'code', where: 'wsl', code:
            'tar -xf busybox-1.38.0.tar.bz2\n' +
            'cd busybox-1.38.0\n' +
            'ls -d */\n' +
            'find . -name \'*.c\' | wc -l\n' +
            'grep -n \'^int ls_main\\|^int init_main\' coreutils/ls.c init/init.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            'applets/        coreutils/    findutils/    loginutils/  procps/                  sysklogd/\n' +
            'applets_sh/     debianutils/  include/      mailutils/   qemu_multiarch_testing/  testsuite/\n' +
            'arch/           docs/         init/         miscutils/   runit/                   util-linux/\n' +
            'archival/       e2fsprogs/    klibc-utils/  modutils/    scripts/\n' +
            'configs/        editors/      libbb/        networking/  selinux/\n' +
            'console-tools/  examples/     libpwdgrp/    printutils/  shell/\n' +
            '704\n' +
            'coreutils/ls.c:1140:int ls_main(int argc UNUSED_PARAM, char **argv)\n' +
            'init/init.c:1038:int init_main(int argc, char **argv) MAIN_EXTERNALLY_VISIBLE;\n' +
            'init/init.c:1039:int init_main(int argc UNUSED_PARAM, char **argv)',
            notes: [
              'Bố cục cột của <code>ls -d */</code> phụ thuộc độ rộng terminal của bạn; nội dung là 33 thư mục. Dòng 1038 là khai báo trước (prototype) của hàm, dòng 1039 là định nghĩa.'
            ] },

          { t: 'p', x:
            'Toàn bộ BusyBox là <b>704</b> file C. <code>coreutils/</code> chứa <code>ls</code>, ' +
            '<code>cat</code>, <code>cp</code>…; <code>init/</code> chứa chính chương trình init sẽ ' +
            'chạy làm PID 1; <code>shell/</code> chứa <code>ash</code> và <code>hush</code>; ' +
            '<code>libbb/</code> là thư viện dùng chung. Dòng <code>grep</code> cuối cho thấy hai ' +
            'hàm bạn đã gặp trong hình ở đầu bài: <code>ls_main</code> và <code>init_main</code> — ' +
            'không có hàm <code>main()</code> nào trong hai file đó. Chỉ có đúng một ' +
            '<code>main()</code> cho cả chương trình, trong <code>libbb/appletlib.c</code>, và nó ' +
            'gọi tới <code>xxx_main</code> tương ứng với <code>argv[0]</code>.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — defconfig, rồi bật CONFIG_STATIC',
        blocks: [
          { t: 'p', x:
            'Giống kernel, bước đầu tiên là sinh một <code>.config</code> khởi điểm. ' +
            '<code>make defconfig</code> của BusyBox bật gần như mọi applet — một điểm xuất phát ' +
            'rộng rãi, sau này bạn tỉa bớt:' },

          { t: 'code', where: 'wsl', code:
            'make defconfig > ../defconfig.log 2>&1\n' +
            'wc -l ../defconfig.log .config\n' +
            'grep -c \'=y$\' .config\n' +
            'grep -n \'CONFIG_STATIC\\b\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            ' 1238 ../defconfig.log\n' +
            ' 1248 .config\n' +
            ' 2486 total\n' +
            '890\n' +
            '45:# CONFIG_STATIC is not set' },

          { t: 'p', x:
            'Log dài <b>1 238</b> dòng vì <code>defconfig</code> của BusyBox in ra từng câu hỏi ' +
            'Kconfig cùng câu trả lời mặc định (dạng <code>Circular Buffer support ' +
            '(FEATURE_IPC_SYSLOG) [Y/n/?] (NEW) y</code>) — đó là lý do lệnh trên ghi nó vào file ' +
            'thay vì để tràn màn hình. <code>.config</code> có <b>890</b> symbol ở <code>=y</code>. ' +
            'Dòng 45 là thứ cần đổi: <code>CONFIG_STATIC</code> đang ở trạng thái \"tắt tường ' +
            'minh\" — trạng thái thứ ba trong bốn trạng thái Bài 39 đã dạy.' },

          { t: 'p', x:
            'Cách thông thường là <code>make menuconfig</code> → <code>Settings</code> → ' +
            '<code>Build static binary (no shared libs)</code>. Nhưng nó cần gói ' +
            '<code>libncurses-dev</code>, mà máy soạn bài không có:' },

          { t: 'code', where: 'wsl', code:
            'make menuconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  HOSTCC  scripts/kconfig/lxdialog/checklist.o\n' +
            '<command-line>: fatal error: curses.h: No such file or directory\n' +
            'compilation terminated.\n' +
            'make[2]: *** [scripts/Makefile.host:120: scripts/kconfig/lxdialog/checklist.o] Error 1\n' +
            'make[1]: *** [/home/cah8hc/bai47/busybox-1.38.0/scripts/kconfig/Makefile:14: menuconfig] Error 2\n' +
            'make: *** [Makefile:444: menuconfig] Error 2',
            notes: [
              'Nếu máy bạn đã cài <code>libncurses-dev</code> (Bài 39 cần nó cho kernel), <code>menuconfig</code> sẽ mở bình thường. Khi đó bạn có thể bật tuỳ chọn trong giao diện, nhưng vẫn nên đọc tiếp cách bên dưới — nó dùng được trong mọi script build.'
            ] },

          { t: 'p', x:
            '<code>curses.h: No such file or directory</code> nói đúng điều đang thiếu: header của ' +
            'thư viện ncurses, thứ vẽ giao diện menu trong terminal. Bạn có hai lựa chọn: cài gói ' +
            'đó bằng <code>sudo apt install libncurses-dev</code>, hoặc sửa thẳng <code>.config</code>. ' +
            'Vì chỉ đổi một dòng, cách thứ hai gọn hơn — và đó cũng là cách các hệ thống build tự ' +
            'động làm. BusyBox không có <code>scripts/config</code> như kernel, nên dùng ' +
            '<code>sed</code>:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'s/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/\' .config\n' +
            'grep -n \'CONFIG_STATIC\\b\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '45:CONFIG_STATIC=y' },

          { t: 'cmdx', cmd: 'sed -i \'s/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/\' .config', title: 'Đổi đúng một dòng, không đụng dòng nào khác',
            rows: [
              ['<code>-i</code>', 'Sửa tại chỗ, ghi đè file.', 'Không có <code>-i</code>, <code>sed</code> chỉ in kết quả ra màn hình.'],
              ['<code>^</code> … <code>$</code>', 'Neo đầu dòng và cuối dòng.', 'Bắt buộc: không có <code>$</code>, mẫu cũng khớp <code># CONFIG_STATIC_LIBGCC is not set</code> nếu dòng đó tồn tại. Bài 39 đã cảnh báo về <code>grep</code> không neo.'],
              ['<code>CONFIG_STATIC=y</code>', 'Dạng \"bật\" của symbol.', 'Sau lệnh này, <code>grep</code> in ra dòng 45 đã đổi — cùng số dòng, khác nội dung.']
            ]},

          { t: 'cal', kind: 'info', title: 'Sửa .config bằng tay có an toàn không?',
            x: 'Bài 39 đã chỉ ra cái bẫy: <code>scripts/config</code> hay <code>sed</code> chỉ sửa ' +
               '<i>văn bản</i>, không biết gì về <code>depends on</code> và <code>select</code>. Lần ' +
               'build kế tiếp, hệ Kconfig sẽ đọc lại <code>.config</code> và tự điều chỉnh các symbol ' +
               'phụ thuộc. Với <code>CONFIG_STATIC</code>, điều đó có nghĩa là symbol con ' +
               '<code>CONFIG_STATIC_LIBGCC</code> — chỉ hiện ra khi <code>STATIC</code> bật — sẽ xuất ' +
               'hiện ở dòng 59 với giá trị mặc định <code>=y</code>. Bạn không cần làm gì: ' +
               '<code>make</code> ở bước 3 tự chạy bước đồng bộ đó (dòng đầu log build là ' +
               '<code>scripts/kconfig/conf -s Config.in</code>).' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Cross-compile: một file, 2 MB, 26 giây',
        blocks: [
          { t: 'p', x:
            'Build với toolchain ARM64. Chú ý: chỉ có <code>CROSS_COMPILE</code>, không có ' +
            '<code>ARCH</code>. Lệnh chạy khoảng nửa phút và không in gì ra màn hình vì mọi thứ đi ' +
            'vào <code>build.log</code>:' },

          { t: 'code', where: 'wsl', code:
            'time make CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > ../build.log 2>&1\n' +
            'tail -n 8 ../build.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m26.128s\n' +
            'user\t2m11.906s\n' +
            'sys\t0m22.526s\n' +
            'Static linking against glibc, can\'t use --gc-sections\n' +
            'Trying libraries: m resolv rt\n' +
            ' Library m is needed, can\'t exclude it (yet)\n' +
            ' Library resolv is needed, can\'t exclude it (yet)\n' +
            ' Library rt is not needed, excluding it\n' +
            ' Library m is needed, can\'t exclude it (yet)\n' +
            ' Library resolv is needed, can\'t exclude it (yet)\n' +
            'Final link with: m resolv',
            notes: [
              'Ba dòng <code>real/user/sys</code> do <code>time</code> in ra (vào terminal, không vào log). Máy soạn bài có 16 CPU; ba lần build trên cùng máy mất 20,4 / 23,5 / 26,1 giây — thời gian phụ thuộc tải máy, đừng so từng giây. <code>user</code> lớn gấp khoảng 5 lần <code>real</code>: nhiều trình biên dịch chạy song song.'
            ] },

          { t: 'cmdx', cmd: 'make CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc)', title: 'Build BusyBox cho ARM64',
            rows: [
              ['<code>CROSS_COMPILE=aarch64-linux-gnu-</code>', 'Tiền tố cho <code>gcc</code>, <code>ld</code>, <code>strip</code>…', 'Như Bài 40. Quên nó, bạn nhận một BusyBox x86-64 — chạy được trên WSL nhưng vô dụng với máy ảo.'],
              ['Không có <code>ARCH=</code>', 'BusyBox tự suy ra từ tiền tố.', '<code>Makefile:181</code> cắt phần trước dấu <code>-</code> đầu tiên của <code>CROSS_COMPILE</code> → <code>aarch64</code>. Nó chỉ dùng giá trị đó để tìm thư mục <code>arch/</code> riêng — và ARM64 không có.'],
              ['<code>-j$(nproc)</code>', 'Chạy song song số job bằng số CPU.', 'Bài 40 đã dạy. <code>$(nproc)</code> trên máy soạn bài là 16.'],
              ['<code>&gt; ../build.log 2&gt;&amp;1</code>', 'Ghi toàn bộ log (khoảng 960 dòng — 959 và 963 trong hai lần đo) ra file.', 'Log nằm ngoài cây mã nguồn để không lẫn vào <code>make clean</code>.']
            ]},

          { t: 'p', x:
            'Bảy dòng cuối là của script liên kết <code>scripts/trylink</code>. Nó thử bỏ bớt từng ' +
            'thư viện (<code>m</code> = toán, <code>resolv</code> = phân giải tên miền, ' +
            '<code>rt</code> = thời gian thực) và chỉ giữ lại những thư viện thật sự cần: ' +
            '<code>rt</code> bị loại, <code>m</code> và <code>resolv</code> được giữ. Dòng đầu là ' +
            'cảnh báo đã nói ở phần lý thuyết: liên kết tĩnh với glibc thì không dọn được mã thừa. ' +
            'Log có <b>60</b> dòng <code>warning:</code>: <b>55</b> dòng <i>ignoring return value of …, ' +
            'declared with attribute warn_unused_result</i> (Ubuntu bật kiểm tra này mặc định) và ' +
            '<b>5</b> dòng cảnh báo chuỗi <code>%s</code> có thể bị cắt ngắn. Chúng là cảnh báo về mã ' +
            'nguồn BusyBox, không phải lỗi build, và không ảnh hưởng tới bài này. ' +
            'Giờ kiểm tra thành phẩm:' },

          { t: 'code', where: 'wsl', code:
            'file busybox\n' +
            'ls -l busybox busybox_unstripped ~/bai32/initramfs/bin/busybox\n' +
            'aarch64-linux-gnu-readelf -l busybox | grep interpreter; echo "grep exit: $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'busybox: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=56fa31d650c8fb19b23192d2d9cbca0a7afde0dd, for GNU/Linux 3.7.0, stripped\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 2094192 Sep 28 21:13 busybox\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 2533920 Sep 28 21:13 busybox_unstripped\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 1980720 Sep 28 14:15 /home/cah8hc/bai32/initramfs/bin/busybox\n' +
            'grep exit: 1',
            notes: [
              '<code>BuildID</code> khác nhau giữa mỗi lần build vì BusyBox nhúng ngày giờ build vào banner của nó. Kích thước <b>2 094 192</b> byte thì giống nhau qua hai lần build trên máy soạn bài; với GCC khác, số này sẽ khác.'
            ] },

          { t: 'p', x:
            'Ba dòng, ba bằng chứng. <code>file</code> nói <code>ARM aarch64</code> và ' +
            '<code>statically linked</code> — đúng kiến trúc, không phụ thuộc thư viện nào. ' +
            '<code>grep interpreter</code> không in gì và thoát mã <b>1</b> (\"không tìm thấy\"): ' +
            'không có phần <code>INTERP</code>, tức là không có loader nào để thiếu — chính cái bẫy ' +
            'đã làm init chết im lặng ở bước 6 Bài 46. Và <code>stripped</code>: build của BusyBox ' +
            'tự chạy <code>strip</code> lên <code>busybox_unstripped</code> (2 533 920 byte) để ra ' +
            '<code>busybox</code>, bỏ <b>439 728</b> byte bảng ký hiệu và thông tin gỡ lỗi mà Bài 18 ' +
            'đã phân tích.' },

          { t: 'cal', kind: 'info', title: 'Lớn hơn bản Debian 113 472 byte — vì bạn bật nhiều hơn',
            x: 'BusyBox của Bài 32 (gói Debian) là <b>1 980 720</b> byte với <b>280</b> applet. Bản ' +
               'của bạn là <b>2 094 192</b> byte với <b>408</b> applet (bước 4 sẽ đếm) — hơn 128 ' +
               'lệnh, chỉ thêm <b>5,7 %</b> kích thước. Đó là sức mạnh của mã dùng chung: một applet ' +
               'mới chỉ phải mang phần mã riêng của nó, còn đọc tham số, in lỗi, cấp phát bộ nhớ đã ' +
               'có sẵn trong <code>libbb</code>. Debian chọn tắt một số applet vì gói ' +
               '<code>busybox-static</code> của họ phục vụ việc cứu hộ, không phải làm rootfs.' },

          { t: 'p', x:
            'Cuối cùng, thử chạy nó ngay trên WSL:' },

          { t: 'code', where: 'wsl', code:
            './busybox; echo "exit: $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bash: ./busybox: cannot execute binary file: Exec format error\n' +
            'exit: 126' },

          { t: 'cal', kind: 'why', title: 'Exec format error là tin tốt ở đây',
            x: 'Đây là <code>ENOEXEC</code> của Bài 25, mã thoát <b>126</b>: kernel x86-64 của WSL ' +
               'đọc trường <code>e_machine</code> của ELF, thấy AArch64, và từ chối. Nó chứng minh ' +
               'bạn thật sự đã cross-compile. <b>Nếu máy bạn in ra banner BusyBox thay vì lỗi</b>, ' +
               'đừng lo: đó là vì máy bạn có gói <code>qemu-user-binfmt</code>, thứ tự động chuyển ' +
               'binary ARM64 cho <code>qemu-aarch64</code> — Bài 25 và <code>bt-25</code> đã gặp ' +
               'đúng hiện tượng này. Máy soạn bài của bài này không có gói đó ' +
               '(<code>ls /proc/sys/fs/binfmt_misc/</code> chỉ có <code>WSLInterop</code>), nên thấy ' +
               'lỗi nguyên bản. Hai kết quả đều đúng; <code>file busybox</code> ở trên mới là bằng ' +
               'chứng quyết định.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — make install: 408 symlink, và BusyBox init với /etc rỗng',
        blocks: [
          { t: 'p', x:
            'Ở Bài 46, bạn tạo mười một symlink bằng một vòng <code>for</code>. ' +
            '<code>make install</code> làm việc đó cho <b>mọi</b> applet đã bật, mỗi symlink đặt ' +
            'đúng thư mục mà dòng <code>//applet:</code> của nó khai báo:' },

          { t: 'code', where: 'wsl', code:
            'make CROSS_COMPILE=aarch64-linux-gnu- install > ../install.log 2>&1\n' +
            'tail -n 7 ../install.log\n' +
            'ls -l _install' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  ./_install//usr/sbin/udhcpd -> ../../bin/busybox\n' +
            '\n' +
            '\n' +
            '--------------------------------------------------\n' +
            'You will probably need to make your busybox binary\n' +
            'setuid root to ensure all configured applets will\n' +
            'work properly.\n' +
            '--------------------------------------------------\n' +
            '\n' +
            'total 12\n' +
            'drwxr-xr-x 2 cah8hc cah8hc 4096 Sep 28 21:15 bin\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc   11 Sep 28 21:15 linuxrc -> bin/busybox\n' +
            'drwxr-xr-x 2 cah8hc cah8hc 4096 Sep 28 21:15 sbin\n' +
            'drwxr-xr-x 4 cah8hc cah8hc 4096 Sep 28 21:15 usr',
            notes: [
              '<code>tail -n 7</code> đếm cả hai dòng trống ở cuối log nên in ra phần thông báo đóng khung. Log đầy đủ có 416 dòng, mỗi symlink một dòng dạng <code>./_install//bin/ls -> busybox</code>.'
            ] },

          { t: 'cmdx', cmd: 'make CROSS_COMPILE=aarch64-linux-gnu- install', title: 'Cài đặt vào một thư mục, không phải vào máy',
            rows: [
              ['<code>install</code>', 'Chép <code>busybox</code> và tạo symlink cho từng applet trong <code>busybox.links</code>.', 'Đích mặc định là <code>CONFIG_PREFIX="./_install"</code> trong <code>.config</code> — một thư mục con, <b>không phải</b> <code>/</code> của WSL. Không cần <code>sudo</code>.'],
              ['<code>CROSS_COMPILE=…</code>', 'Giữ nguyên như lúc build.', 'Thiếu nó, <code>make</code> thấy toolchain khác và build lại toàn bộ cho x86-64 trước khi cài.'],
              ['<code>CONFIG_PREFIX=…</code> (không dùng ở đây)', 'Cài thẳng vào thư mục khác.', 'Ví dụ <code>make … CONFIG_PREFIX=~/bai47/rootfs install</code>. Bài này giữ mặc định để thấy rõ <code>_install</code> là gì.']
            ]},

          { t: 'cal', kind: 'info', title: 'Thông báo \"setuid root\" — đọc nhưng không làm theo',
            x: 'Vài applet như <code>passwd</code>, <code>su</code>, <code>ping</code> cần chạy với ' +
               'quyền root dù người gọi không phải root, và cách truyền thống là bật bit ' +
               '<i>setuid</i> trên file. Vì mọi applet dùng chung một file, bật setuid cho ' +
               '<code>busybox</code> nghĩa là bật cho <b>cả 408 lệnh</b> — một rủi ro bảo mật. Trong ' +
               'bài này mọi thứ chạy dưới PID 1 là root, nên không cần. Một hệ thống thật dùng ' +
               '<code>CONFIG_FEATURE_SUID</code> để BusyBox tự hạ quyền cho applet không cần root.' },

          { t: 'p', x:
            '<code>_install</code> có ba thư mục và một symlink lạ tên <code>linuxrc</code>. Đếm xem ' +
            'bên trong có gì:' },

          { t: 'code', where: 'wsl', code:
            'find _install -type f\n' +
            'find _install -type l | wc -l\n' +
            'for d in bin sbin usr/bin usr/sbin; do echo "$d $(ls _install/$d | wc -l)"; done\n' +
            'ls -l _install/bin/ls _install/sbin/init _install/usr/bin/wc\n' +
            'du -sh _install' },

          { t: 'code', where: 'out', nocopy: true, code:
            '_install/bin/busybox\n' +
            '408\n' +
            'bin 94\n' +
            'sbin 72\n' +
            'usr/bin 182\n' +
            'usr/sbin 60\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc  7 Sep 28 21:15 _install/bin/ls -> busybox\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc 14 Sep 28 21:15 _install/sbin/init -> ../bin/busybox\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc 17 Sep 28 21:15 _install/usr/bin/wc -> ../../bin/busybox\n' +
            '2.1M\t_install' },

          { t: 'p', x:
            'Đúng <b>một</b> file thường — <code>bin/busybox</code> — và <b>408</b> symlink. ' +
            '<code>bin</code> đếm 94 mục vì tính cả chính <code>busybox</code>, nên 93 + 72 + 182 + ' +
            '60 = 407, cộng <code>linuxrc</code> ở gốc là 408. Ba dòng <code>ls -l</code> cho thấy ' +
            'mọi symlink dùng <b>đường dẫn tương đối</b>: <code>busybox</code>, ' +
            '<code>../bin/busybox</code>, <code>../../bin/busybox</code> tuỳ độ sâu — đúng quy tắc ' +
            'Bài 46 đã nêu, vì đường dẫn tuyệt đối trên host sẽ không tồn tại trong máy ảo. Và ' +
            '<code>/sbin/init</code> đã có mặt: lần boot tới, kernel sẽ tìm thấy nó ở lần thử ' +
            '<b>đầu tiên</b>. Cả cây chiếm <b>2.1M</b>, gần như toàn bộ là một file BusyBox.' },

          { t: 'p', x:
            'Cái giá của cách \"mỗi lệnh một file\" đo được ngay trên máy bạn. File ' +
            '<code>busybox.links</code> mà build sinh ra liệt kê đường dẫn của cả 408 applet; vòng ' +
            'lặp dưới tra từng tên trên chính WSL, cộng kích thước của những lệnh cùng tên đang được ' +
            'cài sẵn:' },

          { t: 'code', where: 'wsl', code:
            'n=0; t=0\n' +
            'for a in $(sed \'s:.*/::\' busybox.links); do\n' +
            '  p=$(type -P "$a") && { n=$((n+1)); t=$((t + $(stat -Lc %s "$p"))); }\n' +
            'done\n' +
            'echo "$n commands, $t bytes"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '251 commands, 24077534 bytes',
            notes: [
              'Số lệnh và tổng byte phụ thuộc những gói đã cài trên WSL của bạn — một máy cài nhiều công cụ hơn sẽ cho số lớn hơn.'
            ] },

          { t: 'cmdx', cmd: 'p=$(type -P "$a") && …', title: 'Tìm file thật của một lệnh, bỏ qua alias và builtin',
            rows: [
              ['<code>sed \'s:.*/::\' busybox.links</code>', 'Cắt phần thư mục, còn lại tên lệnh.', 'Dòng <code>/usr/bin/wc</code> thành <code>wc</code>. Dấu <code>:</code> thay cho <code>/</code> làm dấu phân cách để khỏi phải thoát dấu <code>/</code> trong mẫu.'],
              ['<code>type -P</code>', 'In đường dẫn file thực thi của tên đó trong <code>PATH</code>.', 'Khác <code>command -v</code>: <code>-P</code> bỏ qua alias và lệnh dựng sẵn của bash, nên <code>echo</code>, <code>test</code> vẫn trả về <code>/usr/bin/echo</code>… — Bài 4 đã chỉ ra cái bẫy alias. Không tìm thấy thì thoát mã 1 và <code>&amp;&amp;</code> bỏ qua phần sau.'],
              ['<code>stat -Lc %s</code>', 'Kích thước file, đi theo symlink (<code>-L</code>).', 'Nhiều lệnh trên host cũng là symlink; <code>-L</code> đo file thật chúng trỏ tới.']
            ]},

          { t: 'cal', kind: 'info', title: '408 lệnh trong 2,1 MB, so với 251 lệnh trong 24 MB',
            x: 'WSL có <b>251</b> trong 408 lệnh đó, tổng <b>24 077 534</b> byte — gấp <b>11,5</b> ' +
               'lần một file BusyBox, dù chỉ bằng 62 % số lệnh. Con số đó còn chưa tính ' +
               '<code>libc.so.6</code> và các thư viện mà chúng liên kết động. Công bằng mà nói, lệnh ' +
               'GNU làm được nhiều hơn applet tương ứng — nhưng trên flash 16 MB, con số này là toàn bộ ' +
               'lý do BusyBox tồn tại. <code>linuxrc</code> là tàn tích của kiểu boot <i>initrd</i> cũ, ' +
               'nơi kernel chạy <code>/linuxrc</code> thay vì <code>/init</code> — Bài 48 sẽ so sánh ' +
               'initrd với initramfs. Rootfs của bạn không cần nó nhưng để đó cũng vô hại.' },

          { t: 'p', x:
            'Biến <code>_install</code> thành rootfs: chép nó ra <code>~/bai47/rootfs</code>, thêm ' +
            'những thư mục rỗng mà Bài 46 đã chứng minh là cần, và mang hai script ' +
            '<code>run.sh</code>, <code>mkimg.sh</code> của Bài 46 sang. <code>/etc</code> để ' +
            '<b>rỗng</b> — lần boot này là để xem BusyBox init làm gì khi không có một file cấu ' +
            'hình nào:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai47\n' +
            'cp ~/bai46/run.sh ~/bai46/mkimg.sh .\n' +
            'cp -a busybox-1.38.0/_install rootfs\n' +
            'mkdir rootfs/dev rootfs/proc rootfs/sys rootfs/tmp rootfs/etc rootfs/root\n' +
            'ls rootfs\n' +
            './mkimg.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin\n' +
            'dev\n' +
            'etc\n' +
            'linuxrc\n' +
            'proc\n' +
            'root\n' +
            'sbin\n' +
            'sys\n' +
            'tmp\n' +
            'usr',
            notes: [
              'Kết quả ghi qua script nên mỗi tên một dòng. Nếu bạn đã xoá <code>~/bai46</code>, gõ lại hai script từ bước 1 của Bài 46 — nội dung không đổi một ký tự.'
            ] },

          { t: 'cmdx', cmd: 'cp -a busybox-1.38.0/_install rootfs', title: 'Chép mà giữ nguyên symlink',
            rows: [
              ['<code>-a</code>', '\"Archive\": chép đệ quy, giữ symlink là symlink, giữ quyền và thời gian.', 'Bắt buộc ở đây. <code>cp -r</code> không có <code>-a</code> sẽ đi theo từng symlink và chép <b>408 bản</b> của file 2 MB — một rootfs 800 MB. Ngược hẳn với <code>cp -L</code> mà Bài 46 cần cho thư viện.']
            ]},

          { t: 'p', x:
            'Boot. Lần này bạn sẽ không thấy dấu nhắc ngay — hãy nhấn <kbd>Enter</kbd> khi được hỏi, ' +
            'rồi gõ các lệnh:' },

          { t: 'code', where: 'wsl', code:
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'echo $$\n' +
            'ps\n' +
            'busybox --list | wc -l\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.401124] Run /sbin/init as init process\n' +
            'can\'t run \'/etc/init.d/rcS\': No such file or directory\n' +
            '\n' +
            'Please press Enter to activate this console. \n' +
            '~ # echo $$\n' +
            '54\n' +
            '~ # ps\n' +
            'PID   USER     TIME  COMMAND\n' +
            '~ # busybox --list | wc -l\n' +
            '408\n' +
            '~ # poweroff\n' +
            'umount: can\'t open \'/proc/mounts\'\n' +
            'swapoff: can\'t open \'/etc/fstab\': No such file or directory\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Terminated\n' +
            '~ # Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   16.791818] Flash device refused suspend due to active operation (state 20)\n' +
            '[   16.792832] Flash device refused suspend due to active operation (state 20)\n' +
            '[   16.795769] reboot: Power down',
            notes: [
              'Chỉ in từ dòng <code>Run /sbin/init</code> (dòng 254 của log). PID của shell (<code>54</code>) phụ thuộc số luồng kernel đã chạy trước nó; hai lần đo trên máy soạn bài ra 54 và 55. Dòng <code>~ # Sent SIGKILL…</code> là shell kịp in lại dấu nhắc trước khi bị giết — thứ tự các dòng cuối có thể xê dịch.'
            ] },

          { t: 'p', x:
            'So với Bài 46, <b>mọi thứ</b> đã khác, dù rootfs vẫn thiếu cấu hình. Đọc từ trên xuống:' },

          { t: 'list', ordered: true, items: [
            'Chỉ có <b>một</b> dòng <code>Run … as init process</code>: <code>/sbin/init</code> tồn ' +
              'tại và chạy được, kernel không phải thử thêm ba đường dự phòng.',
            '<code>can\'t run \'/etc/init.d/rcS\': No such file or directory</code> — dòng ' +
              '<code>sysinit</code> của bảng mặc định. Init không dừng lại vì nó, chỉ báo rồi đi tiếp.',
            '<code>Please press Enter to activate this console.</code> — dòng <code>askfirst</code> ' +
              'trên console. Không nhấn <kbd>Enter</kbd> thì không có shell.',
            '<code>echo $$</code> in <b>54</b>, không phải <b>1</b>. Shell này là <b>con</b> của ' +
              'init. PID 1 giờ là BusyBox init, ngồi chờ ở vòng lặp cuối của hình phía trên.',
            '<code>ps</code> in xong dòng tiêu đề rồi không in gì, cũng không báo lỗi. Ở bước 3 ' +
              'Bài 46, cùng lệnh đó báo <code>can\'t open \'/proc\'</code> vì thư mục không tồn ' +
              'tại; giờ <code>/proc</code> có mặt nhưng <b>rỗng</b> (chưa gắn), nên ' +
              '<code>ps</code> mở được thư mục và thấy không có tiến trình nào. Một danh sách rỗng ' +
              'không có nghĩa là không có tiến trình — chỉ là chưa ai gắn <code>proc</code>.',
            '<code>poweroff</code> kích hoạt các dòng <code>shutdown</code> mặc định: ' +
              '<code>umount -a -r</code> thất bại vì không có <code>/proc/mounts</code>, ' +
              '<code>swapoff -a</code> thất bại vì không có <code>/etc/fstab</code>. Rồi init gửi ' +
              'SIGTERM, SIGKILL cho mọi tiến trình và tắt máy — một quy trình tắt máy <b>có thứ tự</b>, ' +
              'khác hẳn <code>poweroff -f</code> của Bài 46.'
          ] },

          { t: 'cal', kind: 'why', title: 'Hai lỗi lúc tắt máy là danh sách việc cần làm của bạn',
            x: 'Hãy đọc hai dòng <code>can\'t open</code> như một lời nhắn: init đã sẵn sàng làm ' +
               'đúng việc, nó chỉ thiếu thông tin. <code>/etc/init.d/rcS</code> và ' +
               '<code>/etc/fstab</code> chính là hai file bước 5 sẽ tạo. Chú ý init <b>không bao giờ ' +
               'panic</b> vì thiếu file cấu hình — thiết kế này cố ý, để một rootfs hỏng một nửa vẫn ' +
               'cho bạn vào shell mà sửa. Có một điều bạn không thấy được từ console: bảng mặc định ' +
               'còn mở thêm ba shell <code>askfirst</code> trên <code>tty2</code>, <code>tty3</code>, ' +
               '<code>tty4</code> — màn hình ảo mà <code>-nographic</code> không hiển thị. Bước 5 sẽ ' +
               'tìm ra chúng.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — fstab và rcS: hệ thống tự gắn mọi thứ',
        blocks: [
          { t: 'p', x:
            'Tạo các file mà bước 4 đã chỉ ra là thiếu, với đúng nội dung bạn đã đọc ở phần lý ' +
            'thuyết. Mỗi khối <code>cat &gt; … &lt;&lt; \'EOF\'</code> ghi mọi dòng phía sau nó vào ' +
            'file cho tới dòng <code>EOF</code> — dán nguyên khối vào terminal:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai47\n' +
            'cat > rootfs/etc/fstab << \'EOF\'\n' +
            '# <file system> <mount point> <type> <options> <dump> <pass>\n' +
            'proc            /proc         proc   defaults  0      0\n' +
            'sysfs           /sys          sysfs  defaults  0      0\n' +
            'tmpfs           /tmp          tmpfs  defaults  0      0\n' +
            'EOF\n' +
            'mkdir rootfs/etc/init.d\n' +
            'cat > rootfs/etc/init.d/rcS << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Run once by init at boot, before any shell is started.\n' +
            'echo "rcS: mounting filesystems from /etc/fstab"\n' +
            'mount -a\n' +
            'mount -o remount,rw /\n' +
            'hostname -F /etc/hostname\n' +
            'echo "rcS: done at $(cut -d \' \' -f 1 /proc/uptime) s, hostname is $(hostname)"\n' +
            'EOF\n' +
            'echo \'embedded\' > rootfs/etc/hostname\n' +
            'echo \'root:x:0:0:root:/root:/bin/sh\' > rootfs/etc/passwd\n' +
            'echo \'root:x:0:\' > rootfs/etc/group\n' +
            'ls -l rootfs/etc rootfs/etc/init.d' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rootfs/etc:\n' +
            'total 20\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  229 Sep 28 21:35 fstab\n' +
            '-rw-r--r-- 1 cah8hc cah8hc   10 Sep 28 21:35 group\n' +
            '-rw-r--r-- 1 cah8hc cah8hc    9 Sep 28 21:35 hostname\n' +
            'drwxr-xr-x 2 cah8hc cah8hc 4096 Sep 28 21:35 init.d\n' +
            '-rw-r--r-- 1 cah8hc cah8hc   30 Sep 28 21:35 passwd\n' +
            '\n' +
            'rootfs/etc/init.d:\n' +
            'total 4\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 252 Sep 28 21:35 rcS' },

          { t: 'cmdx', cmd: 'cat > rootfs/etc/fstab << \'EOF\'', title: 'Heredoc: gõ một file nhiều dòng ngay trong terminal',
            rows: [
              ['<code>cat &gt; FILE</code>', '<code>cat</code> đọc stdin và ghi ra FILE.', 'Bài 10 đã dạy chuyển hướng <code>&gt;</code>.'],
              ['<code>&lt;&lt; \'EOF\'</code>', 'Lấy stdin từ chính các dòng tiếp theo, tới dòng chỉ có <code>EOF</code>.', 'Dấu nháy quanh <code>EOF</code> là <b>bắt buộc</b> với <code>rcS</code>: không có nó, shell của WSL sẽ tự thay <code>$(hostname)</code> bằng tên máy WSL <i>ngay lúc tạo file</i>, và máy ảo sẽ in sai tên.'],
              ['<code>root:x:0:0:root:/root:/bin/sh</code>', 'Bảy trường của <code>/etc/passwd</code>: tên, mật khẩu (<code>x</code> = không dùng ở đây), UID, GID, mô tả, thư mục nhà, shell.', 'Bài 46 hứa sẽ giải thích dòng này. <code>/etc/group</code> tương tự: tên nhóm, mật khẩu, GID, danh sách thành viên (rỗng).']
            ]},

          { t: 'p', x:
            'Đọc kỹ dòng cuối của kết quả: <code>rcS</code> là <code>-rw-r--r--</code> — <b>không có ' +
            'bit <code>x</code></b>. <code>cat &gt;</code> tạo file thường, không tạo file thực thi. ' +
            'Cứ tạo ảnh và boot như vậy để xem init phản ứng thế nào:' },

          { t: 'code', where: 'wsl', code:
            './mkimg.sh\n' +
            './run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.532114] Run /sbin/init as init process\n' +
            'can\'t run \'/etc/init.d/rcS\': Permission denied\n' +
            '\n' +
            'Please press Enter to activate this console. ' },

          { t: 'cal', kind: 'warn', title: 'Cùng câu \"can\'t run\", khác lý do',
            x: 'Bước 4 in <code>No such file or directory</code>; lần này là ' +
               '<code>Permission denied</code> — file có đó, nhưng thiếu quyền thực thi. Đây là ' +
               '<code>EACCES</code>, đúng mã <code>-13</code> mà kernel báo cho <code>/sbin/init</code> ' +
               'ở bước 6 Bài 46, chỉ là giờ người báo là BusyBox init chứ không phải kernel. Phần sau ' +
               'dấu hai chấm luôn là lý do thật — hãy đọc nó trước khi đi kiểm tra đường dẫn. Nhấn ' +
               '<kbd>Enter</kbd>, gõ <code>poweroff</code>, rồi sửa:' },

          { t: 'code', where: 'wsl', code:
            'chmod +x rootfs/etc/init.d/rcS\n' +
            './mkimg.sh\n' +
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'mount\n' +
            'ps | grep -v "]$"\n' +
            'touch /root/x && echo writable\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.348898] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            '[    1.512981] EXT4-fs (vda): re-mounted 59860651-11f1-4dd8-9370-16428f8897ed r/w.\n' +
            '[    1.513510] ext4 filesystem being remounted at / supports timestamps until 2038-01-19 (0x7fffffff)\n' +
            'rcS: done at 1.47 s, hostname is embedded\n' +
            '\n' +
            'Please press Enter to activate this console. \n' +
            '~ # mount\n' +
            '/dev/root on / type ext4 (rw,relatime)\n' +
            'devtmpfs on /dev type devtmpfs (rw,relatime,size=215424k,nr_inodes=53856,mode=755)\n' +
            'proc on /proc type proc (rw,relatime)\n' +
            'sysfs on /sys type sysfs (rw,relatime)\n' +
            'tmpfs on /tmp type tmpfs (rw,relatime)\n' +
            '~ # ps | grep -v "]$"\n' +
            'PID   USER     TIME  COMMAND\n' +
            '    1 root      0:01 init\n' +
            '   61 root      0:00 -/bin/sh\n' +
            '   62 root      0:00 init\n' +
            '   63 root      0:00 init\n' +
            '   64 root      0:00 init\n' +
            '   66 root      0:00 ps\n' +
            '   67 root      0:00 grep -v ]$\n' +
            '~ # touch /root/x && echo writable\n' +
            'writable\n' +
            '~ # poweroff\n' +
            '~ # umount: devtmpfs busy - remounted read-only\n' +
            '[   14.934691] EXT4-fs (vda): re-mounted 59860651-11f1-4dd8-9370-16428f8897ed ro.\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   16.987261] Flash device refused suspend due to active operation (state 20)\n' +
            '[   16.988559] Flash device refused suspend due to active operation (state 20)\n' +
            '[   16.991948] reboot: Power down',
            notes: [
              'UUID của ext4, các PID và mọi dấu thời gian đều khác trên máy bạn. <code>grep -v "]$"</code> bỏ các dòng kết thúc bằng <code>]</code> — tức là khoảng năm mươi luồng kernel như <code>[kthreadd]</code>, <code>[kdevtmpfs]</code> — để chỉ còn tiến trình userspace.'
            ] },

          { t: 'p', x:
            'Đây là lần đầu tiên hệ thống tự chuẩn bị mọi thứ. Đọc theo thứ tự:' },

          { t: 'list', ordered: true, items: [
            'Hai dòng <code>rcS:</code> là hai lệnh <code>echo</code> trong script — bằng chứng nó ' +
              'chạy từ đầu tới cuối. Giữa chúng, kernel in <code>re-mounted … r/w</code>: đó là ' +
              'lệnh <code>mount -o remount,rw /</code>. Dòng cuối đọc được <code>/proc/uptime</code> ' +
              '(<b>1.47</b> giây — <code>mount -a</code> đã chạy) và <code>hostname</code> trả về ' +
              '<code>embedded</code>.',
            '<code>mount</code> liệt kê đúng năm hệ thống file: <code>/</code> giờ là ' +
              '<code>rw</code> (ở Bài 46 là <code>ro</code>), <code>/dev</code> do kernel gắn, và ' +
              'ba dòng <code>proc</code>, <code>sysfs</code>, <code>tmpfs</code> — đúng ba dòng của ' +
              '<code>fstab</code>. Không ai gõ <code>mount</code> nào.',
            '<code>ps</code> giờ chạy được, và cho thấy cấu trúc: PID <b>1</b> là ' +
              '<code>init</code>, PID <b>61</b> là shell của bạn với tên <code>-/bin/sh</code> ' +
              '(dấu <code>-</code> = login shell). Và ba tiến trình <code>init</code> nữa: 62, 63, 64.',
            '<code>touch /root/x</code> thành công — ổ root ghi được mà không cần tham số ' +
              '<code>rw</code> trên dòng lệnh kernel.',
            'Lúc tắt máy: <code>umount: devtmpfs busy - remounted read-only</code> và kernel in ' +
              '<code>re-mounted … ro</code>. Đó là dòng <code>shutdown</code> <code>umount -a -r</code> ' +
              'của bảng mặc định: nó gỡ được những gì gỡ được, cái nào đang bận (<code>/dev</code>, ' +
              'vì console đang mở; <code>/</code>) thì chuyển về chỉ đọc (<code>-r</code>). Ext4 ' +
              'được đóng sạch trước khi mất điện. Lần này không còn lỗi <code>swapoff</code> — ' +
              '<code>/etc/fstab</code> đã tồn tại.'
          ] },

          { t: 'p', x:
            'Ba tiến trình <code>init</code> 62–64 là gì? Hỏi <code>/proc</code>: stdin của mỗi ' +
            'tiến trình trỏ tới terminal nào. Boot lại, nhấn <kbd>Enter</kbd>, rồi gõ:' },

          { t: 'code', where: 'qemu', code:
            'for p in $(pidof init); do echo "$p $(readlink /proc/$p/fd/0)"; done\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # for p in $(pidof init); do echo "$p $(readlink /proc/$p/fd/0)"; done\n' +
            '64 /dev/tty4\n' +
            '63 /dev/tty3\n' +
            '62 /dev/tty2\n' +
            '1 /dev/console' },

          { t: 'cmdx', cmd: 'for p in $(pidof init); do echo "$p $(readlink /proc/$p/fd/0)"; done', title: 'Mỗi tiến trình init đang đứng ở terminal nào',
            rows: [
              ['<code>pidof init</code>', 'In PID của mọi tiến trình tên <code>init</code>.', 'Một applet BusyBox khác. Ra bốn số: 64 63 62 1.'],
              ['<code>/proc/$p/fd/0</code>', 'Symlink tới file đang là stdin của tiến trình <code>$p</code>.', 'Bài 46 dùng đúng cách này với <code>/proc/self/fd</code>.'],
              ['<code>readlink</code>', 'In đích của symlink thay vì đi theo nó.', 'Kết quả là tên thiết bị terminal.']
            ]},

          { t: 'cal', kind: 'why', title: 'Ba shell đang chờ trên ba màn hình không ai nhìn',
            x: '62, 63, 64 đứng trên <code>/dev/tty2</code>, <code>tty3</code>, <code>tty4</code> — ' +
               'chính là ba dòng <code>new_init_action(ASKFIRST, …, VC_2/3/4)</code> trong mã nguồn ' +
               'bạn đã đọc. Mỗi dòng là một tiến trình con mà init đã <code>fork()</code>; nó đang in ' +
               '<code>Please press Enter</code> lên một màn hình ảo và chờ phím. Tên hiện ' +
               '<code>init</code> vì con của <code>fork()</code> giữ nguyên tên cha cho tới khi nó ' +
               '<code>exec</code> shell — điều Bài 20 đã giải thích. Với <code>-nographic</code> không ' +
               'có màn hình ảo nào, nên ba tiến trình này tốn RAM vô ích. Trên một bo mạch thật chỉ có ' +
               'cổng nối tiếp, chúng cũng vô ích như vậy. Đó là lý do phải viết <code>inittab</code> ' +
               'của riêng mình.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — inittab: một shell trên ttyAMA0, và không thể thoát khỏi nó',
        blocks: [
          { t: 'p', x:
            'Thay bảng mặc định bằng bảng của bạn — bốn dòng, như đã phân tích ở phần lý thuyết. Bỏ ' +
            'ba shell trên <code>tty2</code>–<code>tty4</code>, bỏ câu \"Please press Enter\", và ' +
            'đổi shell trên console từ <code>askfirst</code> sang <code>respawn</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat > rootfs/etc/inittab << \'EOF\'\n' +
            '# /etc/inittab for BusyBox init.  Format: <tty>:<runlevels>:<action>:<process>\n' +
            '::sysinit:/etc/init.d/rcS\n' +
            'ttyAMA0::respawn:-/bin/sh\n' +
            '::ctrlaltdel:/sbin/reboot\n' +
            '::shutdown:/bin/umount -a -r\n' +
            'EOF\n' +
            './mkimg.sh\n' +
            './run.sh' },

          { t: 'p', x:
            'Lần này <b>đừng nhấn phím nào</b> — chờ dấu nhắc tự hiện ra, rồi gõ:' },

          { t: 'code', where: 'qemu', code:
            'echo $$; tty\n' +
            'ps | grep -v "]$"\n' +
            'exit\n' +
            'echo $$\n' +
            'ln -s /bin/busybox /tmp/mytool; /tmp/mytool\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.303246] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            '[    1.484509] EXT4-fs (vda): re-mounted 06dc033a-d6d1-45dc-b3a7-83b6b943fea8 r/w.\n' +
            '[    1.485234] ext4 filesystem being remounted at / supports timestamps until 2038-01-19 (0x7fffffff)\n' +
            'rcS: done at 1.47 s, hostname is embedded\n' +
            '~ # echo $$; tty\n' +
            '61\n' +
            '/dev/ttyAMA0\n' +
            '~ # ps | grep -v "]$"\n' +
            'PID   USER     TIME  COMMAND\n' +
            '    1 root      0:01 init\n' +
            '   61 root      0:00 -/bin/sh\n' +
            '   63 root      0:00 ps\n' +
            '   64 root      0:00 grep -v ]$\n' +
            '~ # exit\n' +
            '~ # echo $$\n' +
            '65\n' +
            '~ # ln -s /bin/busybox /tmp/mytool; /tmp/mytool\n' +
            'mytool: applet not found\n' +
            '~ # poweroff\n' +
            '~ # umount: devtmpfs busy - remounted read-only\n' +
            '[   16.824202] EXT4-fs (vda): re-mounted 06dc033a-d6d1-45dc-b3a7-83b6b943fea8 ro.\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   18.850856] Flash device refused suspend due to active operation (state 20)\n' +
            '[   18.852027] Flash device refused suspend due to active operation (state 20)\n' +
            '[   18.856096] reboot: Power down',
            notes: [
              'PID của shell (61, rồi 65) và mọi dấu thời gian sẽ khác trên máy bạn; điều phải giống là PID <b>đổi</b> sau <code>exit</code>.'
            ] },

          { t: 'p', x:
            'Ngay sau <code>rcS: done</code> là dấu nhắc <code>~ #</code>, không có câu hỏi nào. ' +
            '<code>tty</code> xác nhận shell đang đứng trên <code>/dev/ttyAMA0</code> — trường ' +
            'thứ nhất của dòng <code>respawn</code>. <code>ps</code> giờ chỉ còn <b>hai</b> tiến trình ' +
            'userspace thường trực: init và một shell. Ba tiến trình <code>init</code> thừa đã biến ' +
            'mất, vì khi <code>/etc/inittab</code> tồn tại, bảng mặc định <b>không được dùng một dòng ' +
            'nào</b> — cả dòng <code>askfirst</code> lẫn <code>swapoff -a</code>.' },

          { t: 'cal', kind: 'why', title: 'exit không thoát được — shell mới có PID mới',
            x: 'Bạn gõ <code>exit</code>; shell 61 kết thúc thật. Nhưng dòng kế tiếp là một dấu nhắc ' +
               'mới, và <code>echo $$</code> in <b>65</b>. Init đã thấy con của dòng ' +
               '<code>respawn</code> chết, và khởi động một shell <b>mới</b> — đúng vòng lặp cuối ' +
               'trong hình ở phần lý thuyết. So với Bài 46: khi shell là PID 1, <code>exit</code> là ' +
               '<code>Kernel panic - not syncing: Attempted to kill init!</code>. Giờ shell chỉ là ' +
               'một đứa con; nó chết thì init sinh đứa khác, còn init thì không bao giờ thoát. Đây là ' +
               'thiết kế của mọi hệ nhúng có cổng console: người dùng không thể \"lỡ tay\" làm treo ' +
               'thiết bị bằng một lệnh <code>exit</code>. Bài 49 sẽ giải thích vì sao PID 1 bị cấm ' +
               'chết, và dùng <code>respawn</code> để giữ daemon của bạn sống.' },

          { t: 'cal', kind: 'info', title: 'mytool: applet not found — argv[0] trong thực tế',
            x: '<code>/tmp/mytool</code> là symlink tới đúng file <code>/bin/busybox</code> mà ' +
               '<code>ls</code>, <code>ps</code>, <code>init</code> đang dùng. Kernel chạy nó bình ' +
               'thường; BusyBox cắt <code>argv[0]</code> thành <code>mytool</code>, tra bảng applet, ' +
               'không thấy, và báo lỗi bằng chính cái tên đó. Đổi tên symlink thành <code>ls</code> ' +
               'thì cùng file đó sẽ liệt kê thư mục. Không có gì trong nội dung file quyết định nó là ' +
               'lệnh nào — chỉ có cái tên.' },

          { t: 'p', x:
            'Nhìn lại toàn bộ rootfs bạn vừa dựng:' },

          { t: 'code', where: 'wsl', code:
            'find rootfs -type f | sort\n' +
            'wc -l rootfs/etc/fstab rootfs/etc/inittab rootfs/etc/init.d/rcS\n' +
            'du -sh rootfs ~/bai47' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rootfs/bin/busybox\n' +
            'rootfs/etc/fstab\n' +
            'rootfs/etc/group\n' +
            'rootfs/etc/hostname\n' +
            'rootfs/etc/init.d/rcS\n' +
            'rootfs/etc/inittab\n' +
            'rootfs/etc/passwd\n' +
            '  4 rootfs/etc/fstab\n' +
            '  5 rootfs/etc/inittab\n' +
            '  7 rootfs/etc/init.d/rcS\n' +
            ' 16 total\n' +
            '2.1M\trootfs\n' +
            '72M\t/home/cah8hc/bai47',
            notes: [
              '<code>~/bai47</code> chiếm 72M, trong đó 61M là cây mã nguồn BusyBox đã build. Bài 48 sẽ đóng gói chính thư mục <code>rootfs/</code> này thành initramfs, nên <b>hãy giữ <code>~/bai47</code></b>.'
            ] },

          { t: 'cal', kind: 'tip', title: 'Bảy file, mười sáu dòng cấu hình, 2,1 MB',
            x: 'Toàn bộ userspace của một hệ Linux ARM64 tự khởi động: <b>một</b> binary và <b>sáu</b> ' +
               'file văn bản, trong đó ba file cấu hình chính cộng lại <b>16</b> dòng. So với rootfs ' +
               'của Bài 46 (3,5 MB, BusyBox Debian + loader + libc, ba lệnh <code>mount</code> gõ tay ' +
               'mỗi lần boot), bản này nhỏ hơn và làm nhiều hơn. Đó là toàn bộ bí mật của rootfs nhúng ' +
               'tối giản — Buildroot ở Chặng 11 sẽ sinh ra đúng những file này, chỉ là tự động.' }
        ] }
    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều được dựng lại thật trong lúc soạn bài, bằng cách sửa hỏng đúng một ' +
      'chỗ trong rootfs đang chạy tốt rồi boot. Chú ý ba dòng cuối cùng: rootfs vẫn boot, vẫn có ' +
      'shell — lỗi chỉ lộ ra khi bạn đọc log từng dòng.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>make menuconfig</code> dừng với <code>fatal error: curses.h: No such file or directory</code>',
         'Thiếu header của thư viện ncurses, thứ vẽ giao diện menu.',
         '<code>sudo apt install libncurses-dev</code>, hoặc bỏ qua <code>menuconfig</code> và sửa ' +
         '<code>.config</code> bằng <code>sed</code> như bước 2.'],

        ['<code>bash: ./busybox: cannot execute binary file: Exec format error</code>, mã 126',
         'Đang chạy file ARM64 trên WSL x86-64. <b>Không phải lỗi</b> — đó là bằng chứng bạn đã ' +
         'cross-compile đúng.',
         'Không cần sửa. Chạy nó trong máy ảo. Nếu thay vào đó bạn thấy banner BusyBox, máy bạn có ' +
         '<code>qemu-user-binfmt</code>; dùng <code>file busybox</code> để kiểm chứng kiến trúc.'],

        ['<code>file busybox</code> nói <code>x86-64</code> hoặc <code>dynamically linked</code>',
         'Quên <code>CROSS_COMPILE=aarch64-linux-gnu-</code>, hoặc quên bật <code>CONFIG_STATIC</code>.',
         '<code>grep CONFIG_STATIC= .config</code> phải ra <code>=y</code>. Rồi <code>make clean</code> ' +
         'và build lại với đủ <code>CROSS_COMPILE</code>.'],

        ['<code>can\'t run \'/etc/init.d/rcS\': No such file or directory</code>',
         'Không có file <code>rcS</code> — <b>hoặc</b> có, nhưng dòng shebang trỏ tới trình thông ' +
         'dịch không tồn tại (<code>#!/bin/bash</code>: rootfs không có bash), <b>hoặc</b> file có ' +
         'kết thúc dòng kiểu Windows (CRLF), khiến shebang thành <code>/bin/sh\\r</code>. Cả ba đều ' +
         'đã được dựng lại và cho cùng một câu.',
         '<code>ls -l rootfs/etc/init.d/rcS</code>; <code>head -n 1</code> phải là ' +
         '<code>#!/bin/sh</code>; <code>file rootfs/etc/init.d/rcS</code> không được có chữ ' +
         '<code>CRLF</code>. Soạn file trong WSL, không soạn bằng Notepad trên ổ Windows.'],

        ['<code>can\'t run \'/etc/init.d/rcS\': Permission denied</code>',
         'File có đó nhưng thiếu bit thực thi. <code>cat &gt;</code> và trình soạn thảo đều tạo ' +
         'file <code>-rw-r--r--</code>.',
         '<code>chmod +x rootfs/etc/init.d/rcS</code>, rồi <code>./mkimg.sh</code>.'],

        ['<code>Please press Enter to activate this console.</code> và ba tiến trình <code>init</code> thừa trong <code>ps</code>',
         'Không có <code>/etc/inittab</code>, init dùng bảng mặc định (<code>askfirst</code> trên ' +
         'console và <code>tty2</code>–<code>tty4</code>). Không phải lỗi, nhưng hiếm khi là thứ bạn muốn.',
         'Viết <code>/etc/inittab</code> như bước 6.'],

        ['<code>mount: mounting sysfs on /sys failed: No such device</code> trong lúc boot',
         'Cột <code>type</code> của <code>/etc/fstab</code> sai (dựng lại bằng cách gõ ' +
         '<code>sysf</code>). \"No such device\" ở đây nghĩa là kernel không biết loại hệ thống file ' +
         'đó. Các dòng khác vẫn được gắn, <code>rcS</code> vẫn chạy tiếp tới cuối.',
         'So cột 3 với <code>cat /proc/filesystems</code> trong máy ảo — đó là danh sách loại ' +
         'kernel hỗ trợ.'],

        ['<code>Bad inittab entry at line 3</code>, sau đó không có dấu nhắc nào',
         'Trường <code>action</code> sai chính tả (dựng lại bằng <code>respwan</code>). Init bỏ qua ' +
         'đúng dòng đó và dùng các dòng còn lại — vì không còn dòng nào mở shell, máy ảo boot xong rồi ' +
         '<b>im lặng</b>.',
         'Số dòng trong thông báo chỉ thẳng vào chỗ sai. Tên action hợp lệ nằm trong ' +
         '<code>examples/inittab</code> của cây mã nguồn.'],

        ['Boot tới <code>rcS: done</code> rồi <b>không có gì nữa</b> — không lỗi, không dấu nhắc',
         'Trường <code>tty</code> của dòng <code>respawn</code> trỏ tới một terminal không ai nhìn ' +
         '(dựng lại bằng <code>ttyS0</code>: file thiết bị có tồn tại, 4,64, nhưng <code>virt</code> ' +
         'không có UART 8250 — ghi vào nó trả về <code>Input/output error</code>). Shell mở ra ở đó, ' +
         'chết ngay, được respawn, chết tiếp — mỗi giây một lần. Lời phàn nàn của init cũng đi vào ' +
         'đúng terminal hỏng đó, nên console của bạn không thấy gì.',
         'Tên trong trường <code>tty</code> phải khớp với <code>console=</code> trên dòng lệnh ' +
         'kernel (<code>ttyAMA0</code> trên <code>virt</code>). Hoặc để trống trường đó để shell ' +
         'dùng console của init.'],

        ['<code>mytool: applet not found</code>',
         'BusyBox được gọi bằng một cái tên không có trong bảng applet — symlink đặt sai tên, hoặc ' +
         'applet đó đã bị tắt trong <code>.config</code>.',
         '<code>busybox --list</code> trong máy ảo liệt kê mọi tên hợp lệ. Muốn có applet mới, bật ' +
         'symbol của nó trong <code>.config</code> và build lại.']
      ] },

    { t: 'recap', title: 'Tóm tắt', items: [
      '<b>BusyBox</b> là <b>một</b> file thực thi chứa hàng trăm <b>applet</b>. Nó chọn applet theo ' +
        '<code>argv[0]</code> — tên mà nó được gọi (<code>libbb/appletlib.c:924</code>); tên lạ thì ' +
        '<code>applet not found</code>.',
      'BusyBox dùng <b>cùng hệ Kconfig</b> với kernel: <code>make defconfig</code> cho ' +
        '<code>.config</code> <b>1 248</b> dòng, <b>890</b> symbol <code>=y</code>. Chỉ cần ' +
        '<code>CROSS_COMPILE</code>, <b>không cần</b> <code>ARCH</code>: toolchain quyết định kiến trúc.',
      '<code>CONFIG_STATIC=y</code> cho một file <b>2 094 192</b> byte, <code>statically linked</code>, ' +
        'không có <code>INTERP</code> — không loader nào để thiếu. Build mất khoảng <b>20–26</b> giây ' +
        'trên 16 CPU.',
      '<code>make install</code> tạo <code>_install</code>: <b>1</b> file và <b>408</b> symlink ' +
        'tương đối trong <code>bin sbin usr/bin usr/sbin</code>, tổng <b>2.1M</b>. Chép bằng ' +
        '<code>cp -a</code> để giữ symlink.',
      'Có <code>/sbin/init</code>, PID 1 là <b>BusyBox init</b>, không còn là shell. Không có ' +
        '<code>/etc/inittab</code>, nó dùng bảng mặc định: <code>rcS</code> + <code>askfirst</code> ' +
        'trên console và <code>tty2</code>–<code>tty4</code>.',
      '<code>/etc/fstab</code> liệt kê hệ thống file cho <code>mount -a</code>; kernel không đọc nó. ' +
        '<code>/etc/init.d/rcS</code> là script <code>sysinit</code> — phải có <code>#!/bin/sh</code> ' +
        'và bit <code>x</code>.',
      '<code>/etc/inittab</code>: <code>tty:runlevel:action:process</code>, runlevel bị bỏ qua. ' +
        '<code>sysinit</code> chạy trước và được chờ; <code>respawn</code> khởi động lại mỗi khi ' +
        'con chết — <code>exit</code> cho shell PID mới (61 → 65) thay vì kernel panic.',
      'Rootfs cuối cùng: <b>7</b> file, <b>16</b> dòng cấu hình, <b>2.1M</b>, tự gắn ' +
        '<code>/proc /sys /tmp</code>, remount <code>rw</code>, đặt hostname và mở shell trên ' +
        '<code>ttyAMA0</code> mà không ai gõ gì.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Suốt Chặng 09 bạn boot từ một ảnh ext4 64 MiB, còn suốt Chặng 07–08 bạn boot từ một ' +
         'initramfs nén của Bài 32 — hai cách đưa rootfs cho kernel mà chưa ai so sánh. ' +
         '<b>Bài 48 — initramfs và các loại rootfs</b> đóng gói chính thư mục <code>~/bai47/rootfs</code> ' +
         'này thành một kho cpio, boot nó không cần ổ đĩa, rồi đặt nó cạnh bản ext4 để đo: cái nào ' +
         'boot nhanh hơn, cái nào tốn RAM hơn, và vì sao initramfs lại cần tự gắn devtmpfs trong ' +
         'khi bản ext4 thì không. Bài 48 cũng phân biệt <code>initrd</code> với initramfs — nơi ' +
         'symlink <code>linuxrc</code> bạn vừa thấy có ý nghĩa — và giới thiệu SquashFS, UBIFS và ' +
         'overlayfs cho rootfs chỉ đọc trên flash.' }
  ],

  quiz: [
    { q: 'Trên rootfs của bài này, <code>/bin/ls</code>, <code>/bin/cat</code> và <code>/sbin/init</code> đều là symlink tới cùng một file <code>busybox</code>. Làm sao BusyBox biết phải chạy lệnh nào?',
      opts: [
        'Kernel đọc tên symlink và truyền một cờ đặc biệt cho BusyBox.',
        'BusyBox đọc <code>argv[0]</code> — tên mà nó được gọi — và tra trong bảng applet.',
        'Mỗi symlink chứa một đoạn mã nhỏ chọn applet.',
        'BusyBox đọc file <code>/etc/busybox.conf</code> để ánh xạ tên sang lệnh.'
      ],
      a: 1,
      why: 'Kernel chạy đúng một file cho cả ba; symlink không chứa mã, và kernel không truyền cờ nào. Thứ duy nhất khác nhau là <code>argv[0]</code>, phần tử đầu của mảng tham số mà <code>execve()</code> truyền vào — đó là tên đường dẫn đã gọi. BusyBox cắt phần thư mục (<code>libbb/appletlib.c:924</code>), tra bảng applet sinh ra lúc build và gọi <code>ls_main</code>, <code>cat_main</code> hay <code>init_main</code>. Symlink <code>/tmp/mytool</code> chứng minh điều ngược lại: cùng file, tên lạ, <code>applet not found</code>.' },

    { q: 'Vì sao lệnh build BusyBox cho ARM64 chỉ cần <code>CROSS_COMPILE=aarch64-linux-gnu-</code>, trong khi kernel thì bắt buộc cả <code>ARCH=arm64</code>?',
      opts: [
        'Vì BusyBox chỉ hỗ trợ ARM64 nên không cần chỉ định.',
        'Vì <code>ARCH</code> đã được ghi sẵn trong <code>.config</code> của BusyBox.',
        'Vì BusyBox là chương trình userspace gọi libc; kiến trúc do trình biên dịch quyết định. Kernel chứa mã riêng cho từng CPU trong <code>arch/*</code> và phải chọn đúng một.',
        'Vì <code>make</code> của BusyBox tự đọc kiến trúc của máy host.'
      ],
      a: 2,
      why: 'Kernel có mã khởi động, bảng ngắt, hợp ngữ riêng cho từng kiến trúc trong <code>arch/arm64</code>, <code>arch/x86</code>…, nên <code>ARCH</code> chọn thư mục nào được build. BusyBox chỉ là C bình thường; <code>aarch64-linux-gnu-gcc</code> chỉ biết sinh mã ARM64, và thư mục <code>arch/</code> của BusyBox thậm chí không có mục ARM64. BusyBox suy <code>ARCH</code> từ tiền tố (<code>Makefile:181</code>) nhưng không cần nó. Đọc kiến trúc của host là điều ngược lại với cross-compile.' },

    { q: 'Rootfs có BusyBox, có <code>/etc/fstab</code> và <code>/etc/init.d/rcS</code> đúng nội dung, không có <code>/etc/inittab</code>. Log boot in <code>can\'t run \'/etc/init.d/rcS\': Permission denied</code>. Chuyện gì xảy ra tiếp theo?',
      opts: [
        'Kernel panic vì init không chạy được script khởi động.',
        'Init in câu đó, bỏ qua <code>rcS</code>, rồi vẫn mời bạn nhấn Enter để có shell — nhưng <code>/proc</code>, <code>/sys</code>, <code>/tmp</code> chưa được gắn.',
        'Init tự thêm bit thực thi rồi chạy lại <code>rcS</code>.',
        'Máy ảo khởi động lại liên tục.'
      ],
      a: 1,
      why: 'BusyBox init không bao giờ panic vì thiếu cấu hình: dòng <code>sysinit</code> hỏng chỉ được báo rồi bỏ qua, và bảng mặc định vẫn chạy <code>askfirst</code> trên console. Nhưng vì <code>rcS</code> không chạy, <code>mount -a</code> cũng không chạy — <code>ps</code> sẽ trả về danh sách rỗng. <code>Permission denied</code> = <code>EACCES</code>: file có mặt nhưng thiếu bit <code>x</code>, sửa bằng <code>chmod +x</code>. Init không có quyền hay ý định tự sửa file của bạn.' },

    { q: 'Bạn viết <code>/etc/inittab</code> có dòng <code>ttyS0::respawn:-/bin/sh</code> cho máy <code>virt</code>. Máy ảo boot, in <code>rcS: done …</code> rồi không in gì nữa, không có dấu nhắc, không có lỗi. Nguyên nhân khả dĩ nhất?',
      opts: [
        '<code>rcS</code> bị treo ở lệnh cuối.',
        'Kernel panic nhưng không in ra màn hình.',
        'Shell đang được mở trên <code>ttyS0</code> — một terminal mà <code>virt</code> không có phần cứng thật phía sau — nên nó chết ngay và được respawn liên tục, còn console <code>ttyAMA0</code> của bạn không có shell nào.',
        'Thiếu <code>/etc/passwd</code> nên shell không đăng nhập được.'
      ],
      a: 2,
      why: 'Trường đầu của dòng inittab chọn terminal cho tiến trình. Trên <code>virt</code>, UART là PL011 = <code>ttyAMA0</code>; <code>/dev/ttyS0</code> tồn tại (major/minor 4,64) nhưng ghi vào nó trả về <code>Input/output error</code>. Shell chết, init respawn nó mỗi giây — và vì <code>message()</code> của init cũng ghi vào terminal hỏng đó, không có lời phàn nàn nào tới được bạn. <code>rcS: done</code> đã in nghĩa là <code>rcS</code> chạy xong; một panic luôn in ra console; <code>/etc/passwd</code> không cần để chạy <code>/bin/sh</code>.' },

    { q: 'Với <code>ttyAMA0::respawn:-/bin/sh</code> trong <code>inittab</code>, bạn gõ <code>exit</code> ở shell. Điều gì xảy ra, và vì sao khác với Bài 46?',
      opts: [
        'Kernel panic <code>Attempted to kill init!</code>, giống hệt Bài 46.',
        'Máy ảo tắt, vì shell là tiến trình cuối cùng.',
        'Một dấu nhắc mới hiện ra ngay với PID khác: shell giờ là con của init, init thấy nó chết và khởi động lại theo <code>respawn</code>. Ở Bài 46, shell là PID 1 nên thoát là panic.',
        'Không có gì xảy ra; <code>exit</code> bị vô hiệu hoá trong login shell.'
      ],
      a: 2,
      why: 'Bước 6 đo được: <code>echo $$</code> in 61, <code>exit</code>, rồi <code>echo $$</code> in 65 — một tiến trình mới. PID 1 là BusyBox init, và vòng lặp cuối của nó chờ con chết để hồi sinh các dòng <code>respawn</code>/<code>askfirst</code>. Ở Bài 46, kernel chạy <code>/bin/sh</code> làm PID 1 trực tiếp; PID 1 thoát thì kernel panic. <code>exit</code> hoạt động bình thường — shell thực sự kết thúc.' },

    { q: '<code>/etc/fstab</code> của bạn có dòng <code>sysfs /sys sysf defaults 0 0</code> (gõ nhầm). Boot sẽ thế nào?',
      opts: [
        'Kernel panic vì không gắn được <code>/sys</code>.',
        '<code>mount -a</code> in <code>mounting sysfs on /sys failed: No such device</code>, các dòng khác vẫn được gắn, <code>rcS</code> chạy tiếp và bạn vẫn có shell.',
        'Init từ chối đọc toàn bộ <code>fstab</code> và không gắn gì cả.',
        '<code>mount -a</code> tự sửa thành <code>sysfs</code>.'
      ],
      a: 1,
      why: 'Kernel không bao giờ đọc <code>fstab</code> — chỉ <code>mount -a</code> đọc, từng dòng một. Dòng hỏng cho một lỗi; <code>proc</code> và <code>tmpfs</code> vẫn được gắn. <code>No such device</code> ở đây nghĩa là kernel không biết loại hệ thống file <code>sysf</code>; <code>cat /proc/filesystems</code> liệt kê những loại hợp lệ. Vì <code>rcS</code> không có <code>set -e</code>, nó chạy tiếp tới cuối — lỗi dễ bị bỏ sót nếu không đọc log.' }
  ]
});

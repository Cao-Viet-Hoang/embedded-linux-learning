/* Bài 53 — Giao tiếp user ↔ kernel
   Chặng 10 — Kernel module và Driver
   Mở rộng driver ram-disk của Bài 52 (~/bai52/ramdisk, chép sang ~/bai53/ramdisk) bằng bốn kênh:
   ioctl (_IO/_IOR/_IOW, magic 'x', header dùng chung với userspace, compat_ptr_ioctl, kiểm tra
   f_mode), sysfs (DEVICE_ATTR_RO/RW, sysfs_emit, kstrtobool, device_create_with_groups), procfs
   (proc_create_single + seq_file) và debugfs (debugfs_create_u32/blob). Chương trình rdctl gọi
   ioctl và nhận EINVAL, EFAULT, EBADF, ENOTTY thật; rdbench đo ioctl so với sysfs (có và không
   có -DDEBUG). Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4,
   QEMU 4.2.1), kernel ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs. */

Lesson.register({
  id: 'bai-53',
  title: 'Giao tiếp user ↔ kernel',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Driver ram-disk của Bài 52 chỉ hiểu một thứ: luồng byte. Muốn hỏi nó "đang chứa bao nhiêu ' +
    'byte?", bạn phải <code>cat</code> toàn bộ rồi tự đếm. Muốn xoá sạch, bạn phải mượn ' +
    '<code>O_TRUNC</code> của dấu <code>&gt;</code>. Muốn biết nó đã bị đọc bao nhiêu lần, bạn không ' +
    'có cách nào cả.<br><br>' +
    'Một driver thật cần thêm những kênh khác bên cạnh <code>read</code>/<code>write</code>: một kênh ' +
    'để <b>ra lệnh</b>, một kênh để <b>cấu hình</b> bằng shell, một kênh để <b>báo cáo tổng quan</b>, và ' +
    'một kênh để <b>chính bạn gỡ lỗi</b>. Linux có sẵn bốn cơ chế cho bốn việc đó: <code>ioctl</code>, ' +
    'sysfs, procfs và debugfs. Bài này gắn cả bốn vào chính <code>ramdisk.c</code> của Bài 52, cho ' +
    'từng kênh trả về lỗi thật, rồi đo xem kênh nào nhanh hơn bao nhiêu lần.',

  goals: [
    'Định nghĩa lệnh <code>ioctl</code> bằng <code>_IO</code>/<code>_IOR</code>/<code>_IOW</code> trong ' +
      'một header dùng chung, và giải mã một số như <code>0x80087801</code> thành bốn trường ' +
      'hướng, kích thước, loại, số thứ tự.',
    'Viết hàm <code>unlocked_ioctl</code> trả đúng <code>-ENOTTY</code>, <code>-EFAULT</code>, ' +
      '<code>-EINVAL</code>, <code>-EBADF</code>, và giải thích vì sao đổi kiểu tham số làm chương trình ' +
      'cũ nhận <code>errno 25</code>.',
    'Thêm thuộc tính sysfs chỉ đọc và đọc-ghi bằng <code>DEVICE_ATTR_RO</code>/<code>DEVICE_ATTR_RW</code>, ' +
      'và giải thích vì sao root vẫn nhận <code>Permission denied</code> khi ghi vào file chỉ đọc.',
    'Tạo một file procfs bằng <code>proc_create_single</code> và một cây debugfs bằng ' +
      '<code>debugfs_create_u32</code>/<code>debugfs_create_blob</code>.',
    'Đo được chi phí của <code>ioctl</code> so với sysfs, và nhận ra một phép đo bị ' +
      '<code>pr_debug</code> làm sai lệch.',
    'Chọn đúng kênh cho một tình huống cho trước, dựa trên người dùng, định dạng dữ liệu và mức ' +
      'cam kết ổn định (ABI).'
  ],

  blocks: [

    /* ============================================================
       1. BỐN KÊNH, BỐN CÂU HỎI
       ============================================================ */
    { t: 'h2', x: 'Bốn kênh, bốn câu hỏi khác nhau' },

    { t: 'p', x:
      'Ở Bài 52, mọi giao tiếp đi qua một cửa: file <code>/dev/ramdisk0</code> và cặp ' +
      '<code>read</code>/<code>write</code>. Cửa đó hợp với <b>dữ liệu</b>, nhưng không hợp với ' +
      '<b>điều khiển</b>. Hãy hình dung một chiếc máy in: bạn gửi tài liệu qua cùng một sợi cáp, nhưng ' +
      'lệnh "đổi khay giấy", nút cài đặt trên màn hình, đèn báo trạng thái và cổng chẩn đoán của thợ sửa ' +
      'là bốn thứ khác nhau. Không ai nhét lệnh đổi khay giấy vào giữa nội dung tài liệu.' },

    { t: 'p', x:
      'Kernel cũng vậy. Mỗi kênh trả lời một câu hỏi khác nhau: <b>ai</b> dùng nó, dữ liệu có <b>dạng</b> ' +
      'gì, và kernel <b>cam kết</b> giữ nó không đổi trong bao lâu. Bảng dưới là bản đồ của cả bài. Bạn ' +
      'sẽ quay lại nó ở cuối để chọn kênh.' },

    { t: 'table',
      head: ['Kênh', 'Nằm ở đâu', 'Ai dùng', 'Dạng dữ liệu', 'Cam kết ổn định'],
      rows: [
        ['<code>ioctl</code>', 'Một fd đã <code>open</code> trên <code>/dev/ramdisk0</code>', 'Chương trình C', 'Nhị phân: số hiệu lệnh + một con trỏ tới <code>struct</code>', '<b>ABI</b>. Số hiệu và cấu trúc không bao giờ được đổi'],
        ['sysfs', '<code>/sys/class/ramdisk/ramdisk0/used</code>', 'Shell, script, udev', 'Văn bản ASCII, <b>một giá trị mỗi file</b>', '<b>ABI</b>, ghi trong <code>Documentation/ABI/</code>'],
        ['procfs', '<code>/proc/ramdisk</code>', 'Người đọc, công cụ cũ', 'Văn bản tự do, thường là bảng', 'ABI trên thực tế, nhưng không còn dành cho driver mới'],
        ['debugfs', '<code>/sys/kernel/debug/ramdisk/</code>', 'Người phát triển (root)', 'Bất kỳ, kể cả nhị phân', '<b>Không có</b>. Có thể biến mất ở bản kernel sau']
      ] },

    { t: 'fig',
      cap: 'Bốn cửa vào cùng một <code>struct rd_dev</code>. Chỉ <code>ioctl</code> cần mở ' +
           '<code>/dev/ramdisk0</code> trước; ba kênh còn lại là file trong ba hệ thống file ảo khác ' +
           'nhau, và mỗi lần đọc chúng kernel gọi một hàm của driver để sinh nội dung ngay lúc đó. Không ' +
           'kênh nào lưu bản sao dữ liệu: cả bốn đều đọc cùng các trường <code>len</code>, ' +
           '<code>readonly</code> và bộ đếm.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Bốn kênh giao tiếp: chương trình C gọi ioctl trên fd của /dev/ramdisk0 tới rd_ioctl; shell đọc /sys/class/ramdisk/ramdisk0/used tới used_show; người đọc cat /proc/ramdisk tới rd_proc_show; người phát triển đọc /sys/kernel/debug/ramdisk tới debugfs helper; cả bốn hàm đều đọc chung struct rd_dev">' +
        '<rect class="d-box" x="20" y="16" width="160" height="52" rx="6"/>' +
        '<text class="d-t" x="100" y="38" text-anchor="middle">Chương trình C</text>' +
        '<text class="d-tm" x="100" y="56" text-anchor="middle">ioctl(fd, cmd, &amp;arg)</text>' +
        '<rect class="d-box" x="192" y="16" width="160" height="52" rx="6"/>' +
        '<text class="d-t" x="272" y="38" text-anchor="middle">Shell, udev</text>' +
        '<text class="d-tm" x="272" y="56" text-anchor="middle">cat, echo</text>' +
        '<rect class="d-box" x="364" y="16" width="160" height="52" rx="6"/>' +
        '<text class="d-t" x="444" y="38" text-anchor="middle">Người đọc</text>' +
        '<text class="d-tm" x="444" y="56" text-anchor="middle">cat</text>' +
        '<rect class="d-box" x="536" y="16" width="164" height="52" rx="6"/>' +
        '<text class="d-t" x="618" y="38" text-anchor="middle">Người phát triển</text>' +
        '<text class="d-tm" x="618" y="56" text-anchor="middle">root, od, cat</text>' +
        '<line class="d-line" x1="100" y1="68" x2="100" y2="96"/><path class="d-arrow" d="M 100 104 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="272" y1="68" x2="272" y2="96"/><path class="d-arrow" d="M 272 104 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="444" y1="68" x2="444" y2="96"/><path class="d-arrow" d="M 444 104 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="618" y1="68" x2="618" y2="96"/><path class="d-arrow" d="M 618 104 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-p" x="20" y="104" width="160" height="56" rx="6"/>' +
        '<text class="d-t" x="100" y="126" text-anchor="middle">fd của /dev</text>' +
        '<text class="d-tm" x="100" y="146" text-anchor="middle">/dev/ramdisk0</text>' +
        '<rect class="d-box-p" x="192" y="104" width="160" height="56" rx="6"/>' +
        '<text class="d-t" x="272" y="126" text-anchor="middle">sysfs</text>' +
        '<text class="d-tm" x="272" y="146" text-anchor="middle">…/ramdisk0/used</text>' +
        '<rect class="d-box-p" x="364" y="104" width="160" height="56" rx="6"/>' +
        '<text class="d-t" x="444" y="126" text-anchor="middle">procfs</text>' +
        '<text class="d-tm" x="444" y="146" text-anchor="middle">/proc/ramdisk</text>' +
        '<rect class="d-box-w" x="536" y="104" width="164" height="56" rx="6"/>' +
        '<text class="d-t" x="618" y="126" text-anchor="middle">debugfs</text>' +
        '<text class="d-tm" x="618" y="146" text-anchor="middle">…/debug/ramdisk/</text>' +
        '<line class="d-line" x1="100" y1="160" x2="100" y2="188"/><path class="d-arrow" d="M 100 196 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="272" y1="160" x2="272" y2="188"/><path class="d-arrow" d="M 272 196 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="444" y1="160" x2="444" y2="188"/><path class="d-arrow" d="M 444 196 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="618" y1="160" x2="618" y2="188"/><path class="d-arrow" d="M 618 196 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-a" x="20" y="196" width="160" height="44" rx="6"/>' +
        '<text class="d-tm" x="100" y="222" text-anchor="middle">rd_ioctl()</text>' +
        '<rect class="d-box-a" x="192" y="196" width="160" height="44" rx="6"/>' +
        '<text class="d-tm" x="272" y="222" text-anchor="middle">used_show()</text>' +
        '<rect class="d-box-a" x="364" y="196" width="160" height="44" rx="6"/>' +
        '<text class="d-tm" x="444" y="222" text-anchor="middle">rd_proc_show()</text>' +
        '<rect class="d-box-a" x="536" y="196" width="164" height="44" rx="6"/>' +
        '<text class="d-tm" x="618" y="222" text-anchor="middle">debugfs_create_u32</text>' +
        '<line class="d-line" x1="100" y1="240" x2="300" y2="268"/>' +
        '<line class="d-line" x1="272" y1="240" x2="330" y2="268"/>' +
        '<line class="d-line" x1="444" y1="240" x2="390" y2="268"/>' +
        '<line class="d-line" x1="618" y1="240" x2="420" y2="268"/>' +
        '<rect class="d-box-g" x="200" y="268" width="320" height="48" rx="6"/>' +
        '<text class="d-t" x="360" y="288" text-anchor="middle">struct rd_dev (một bản duy nhất)</text>' +
        '<text class="d-tm" x="360" y="306" text-anchor="middle">data  len  readonly  reads  writes  ioctls</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao không nhồi lệnh vào read/write?',
      x: 'Bạn hoàn toàn có thể quy ước "ghi chuỗi <code>CLEAR</code> vào <code>/dev/ramdisk0</code> nghĩa ' +
         'là xoá". Nhưng khi đó, một người dùng lưu đúng năm chữ cái ấy vào ram-disk sẽ vô tình xoá sạch ' +
         'nó. Dữ liệu và lệnh dùng chung một kênh thì không bao giờ phân biệt được nhau. Tách kênh điều ' +
         'khiển ra khỏi kênh dữ liệu là nguyên tắc của mọi giao thức tử tế, từ cặp chân dữ liệu/điều khiển ' +
         'của cổng nối tiếp tới cổng 21/20 của FTP.' },

    /* ============================================================
       2. IOCTL
       ============================================================ */
    { t: 'h2', x: 'ioctl: một lệnh có số hiệu' },

    { t: 'p', x:
      '<code>ioctl</code> là một syscall nhận ba tham số: một fd, một <b>số hiệu lệnh</b> 32 bit và một ' +
      'tham số 64 bit, thường là một con trỏ. Kernel không hiểu số hiệu đó; nó chuyển nguyên cả ba tới ' +
      'hàm <code>unlocked_ioctl</code> trong <code>file_operations</code> của driver sở hữu fd. Nói cách ' +
      'khác, <code>ioctl</code> là một "cổng hàm tuỳ ý": mỗi driver tự định nghĩa bộ lệnh của mình. Bạn ' +
      'đã gặp phía userspace của nó ở Bài 19 (một tiến trình treo tại <code>ioctl</code>) và Bài 29 ' +
      '(<code>ENOTTY</code> trên board thật). Giờ bạn viết phía còn lại.' },

    { t: 'fig',
      cap: 'Đường đi của một <code>ioctl</code>. Kernel thử bộ lệnh chung trước (<code>FIOCLEX</code>, ' +
           '<code>FIONBIO</code>, <code>FIONREAD</code>…), sau đó mới tới driver. Driver không có ' +
           '<code>unlocked_ioctl</code>, hoặc có nhưng không nhận lệnh đó, thì chương trình nhận ' +
           '<code>ENOTTY</code> = 25. Tên lỗi "Inappropriate ioctl for device" (cũ hơn nữa là "Not a ' +
           'typewriter") là di sản từ thời <code>ioctl</code> chỉ dùng cho terminal.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="ioctl từ userspace vào SYSCALL_DEFINE3 ioctl; do_vfs_ioctl xử lý lệnh chung; không phải lệnh chung thì vfs_ioctl gọi f_op unlocked_ioctl của driver; không có hàm đó hoặc driver trả ENOIOCTLCMD thì trả ENOTTY">' +
        '<rect class="d-box" x="20" y="20" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">Chương trình</text>' +
        '<text class="d-tm" x="120" y="64" text-anchor="middle">ioctl(fd, 0x80087801, &amp;info)</text>' +
        '<line class="d-line" x1="220" y1="48" x2="262" y2="48"/><path class="d-arrow" d="M 270 48 l -9 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="270" y="20" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="370" y="44" text-anchor="middle">do_vfs_ioctl()</text>' +
        '<text class="d-ts" x="370" y="64" text-anchor="middle">lệnh chung cho mọi file?</text>' +
        '<line class="d-line" x1="470" y1="48" x2="512" y2="48"/><path class="d-arrow" d="M 520 48 l -9 -4 l 0 8 z"/>' +
        '<rect class="d-box-g" x="520" y="20" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="610" y="44" text-anchor="middle">có: kernel tự làm</text>' +
        '<text class="d-tm" x="610" y="64" text-anchor="middle">FIOCLEX, FIONBIO…</text>' +
        '<line class="d-line" x1="370" y1="76" x2="370" y2="108"/><path class="d-arrow" d="M 370 116 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-p" x="270" y="116" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="370" y="140" text-anchor="middle">vfs_ioctl()</text>' +
        '<text class="d-tm" x="370" y="160" text-anchor="middle">f_op-&gt;unlocked_ioctl</text>' +
        '<line class="d-line" x1="470" y1="144" x2="512" y2="144"/><path class="d-arrow" d="M 520 144 l -9 -4 l 0 8 z"/>' +
        '<rect class="d-box-w" x="520" y="116" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="610" y="140" text-anchor="middle">không có hàm</text>' +
        '<text class="d-tm" x="610" y="160" text-anchor="middle">-ENOTTY (25)</text>' +
        '<line class="d-line" x1="270" y1="144" x2="228" y2="144"/><path class="d-arrow" d="M 220 144 l 9 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="20" y="116" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="120" y="140" text-anchor="middle">rd_ioctl()</text>' +
        '<text class="d-ts" x="120" y="160" text-anchor="middle">switch (cmd) của driver</text>' +
        '<rect class="d-box" x="20" y="196" width="680" height="40" rx="6"/>' +
        '<text class="d-tm" x="36" y="221">fs/ioctl.c:583 SYSCALL_DEFINE3(ioctl) → :492 do_vfs_ioctl() → :44 vfs_ioctl()</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hàm của driver có chữ ký <code>long (*unlocked_ioctl)(struct file *, unsigned int, unsigned long)</code> ' +
      '(<code>include/linux/fs.h:2283</code>). Chữ "unlocked" là dấu vết lịch sử: trước kernel 2.6.36, ' +
      '<code>ioctl</code> chạy dưới một khoá toàn cục (Big Kernel Lock). Giờ không còn khoá nào cả, nên ' +
      'driver tự lo đồng bộ bằng <code>mutex</code> của mình, đúng như <code>read</code>/<code>write</code> ' +
      'ở Bài 52.' },

    { t: 'h3', x: 'Số hiệu lệnh không phải một số tuỳ ý' },

    { t: 'p', x:
      'Bạn có thể viết <code>#define RD_CLEAR 2</code> và driver vẫn chạy. Nhưng số 2 cũng là lệnh của ' +
      'hàng trăm driver khác. Nếu một chương trình lỡ gọi nó trên nhầm thiết bị, thiết bị đó sẽ ' +
      '<b>thực thi</b> một lệnh không ai định gửi. Vì thế kernel quy ước mỗi số hiệu là 32 bit ghép từ ' +
      'bốn trường, định nghĩa trong <code>include/uapi/asm-generic/ioctl.h</code>:' },

    { t: 'fig',
      cap: 'Bốn trường của <code>RD_IOC_GET_INFO</code> = <code>0x80087801</code>. Hai bit hướng (' +
           '<code>2</code> = <code>_IOC_READ</code>), 14 bit kích thước (<code>8</code> = ' +
           '<code>sizeof(struct rd_info)</code>), 8 bit loại (<code>0x78</code> = <code>\'x\'</code>, chữ cái ' +
           'riêng của driver), 8 bit số thứ tự (<code>1</code>). Vì <b>kích thước</b> nằm trong số hiệu, đổi ' +
           'cấu trúc tham số là đổi số hiệu: chương trình cũ gọi số cũ và bị từ chối thay vì ghi đè bộ ' +
           'nhớ.',
      svg:
        '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Số 32 bit 0x80087801 chia thành bit 31-30 hướng bằng 2 nghĩa là đọc, bit 29-16 kích thước bằng 8, bit 15-8 loại bằng 0x78 chữ x, bit 7-0 số thứ tự bằng 1">' +
        '<text class="d-tm" x="20" y="28">bit 31</text>' +
        '<text class="d-tm" x="700" y="28" text-anchor="end">bit 0</text>' +
        '<rect class="d-box-w" x="20" y="40" width="80" height="60" rx="4"/>' +
        '<text class="d-t" x="60" y="64" text-anchor="middle">dir</text>' +
        '<text class="d-ts" x="60" y="86" text-anchor="middle">2 bit</text>' +
        '<rect class="d-box-a" x="100" y="40" width="300" height="60" rx="4"/>' +
        '<text class="d-t" x="250" y="64" text-anchor="middle">size</text>' +
        '<text class="d-ts" x="250" y="86" text-anchor="middle">14 bit, tối đa 16 383 byte</text>' +
        '<rect class="d-box-p" x="400" y="40" width="150" height="60" rx="4"/>' +
        '<text class="d-t" x="475" y="64" text-anchor="middle">type</text>' +
        '<text class="d-ts" x="475" y="86" text-anchor="middle">8 bit, chữ cái</text>' +
        '<rect class="d-box-g" x="550" y="40" width="150" height="60" rx="4"/>' +
        '<text class="d-t" x="625" y="64" text-anchor="middle">nr</text>' +
        '<text class="d-ts" x="625" y="86" text-anchor="middle">8 bit, số thứ tự</text>' +
        '<text class="d-tm" x="60" y="126" text-anchor="middle">10</text>' +
        '<text class="d-tm" x="250" y="126" text-anchor="middle">00 0000 0000 1000</text>' +
        '<text class="d-tm" x="475" y="126" text-anchor="middle">0111 1000</text>' +
        '<text class="d-tm" x="625" y="126" text-anchor="middle">0000 0001</text>' +
        '<text class="d-tm" x="60" y="150" text-anchor="middle">= 2 (READ)</text>' +
        '<text class="d-tm" x="250" y="150" text-anchor="middle">= 8</text>' +
        '<text class="d-tm" x="475" y="150" text-anchor="middle">= 0x78 \'x\'</text>' +
        '<text class="d-tm" x="625" y="150" text-anchor="middle">= 1</text>' +
        '<text class="d-ts" x="20" y="184">Ghép lại: 10|00000000001000|01111000|00000001 = 0x80087801</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Macro', 'Trường <code>dir</code>', 'Dùng khi', 'Ví dụ trong bài'],
      rows: [
        ['<code>_IO(type, nr)</code>', '0 — không có dữ liệu', 'Lệnh không cần tham số', '<code>RD_IOC_CLEAR</code> = <code>0x00007802</code>'],
        ['<code>_IOR(type, nr, T)</code>', '2 — <code>_IOC_READ</code>', 'Chương trình <b>đọc</b> một <code>T</code> từ kernel', '<code>RD_IOC_GET_INFO</code> = <code>0x80087801</code>'],
        ['<code>_IOW(type, nr, T)</code>', '1 — <code>_IOC_WRITE</code>', 'Chương trình <b>ghi</b> một <code>T</code> vào kernel', '<code>RD_IOC_SET_LEN</code> = <code>0x40047803</code>'],
        ['<code>_IOWR(type, nr, T)</code>', '3 — cả hai', 'Gửi yêu cầu, nhận lại kết quả trong cùng cấu trúc', '(không dùng)']
      ] },

    { t: 'cal', kind: 'tip', title: 'Đọc/ghi luôn tính từ phía chương trình',
      x: '<code>_IOR</code> nghĩa là <b>chương trình đọc</b>, dù bên trong kernel thực ra là driver ' +
         '<i>ghi</i> vào bộ nhớ userspace bằng <code>copy_to_user</code>. Mẹo nhớ: đặt mình vào vị trí ' +
         'lời gọi <code>read()</code>/<code>write()</code> của Bài 19. Lệnh "GET" giống <code>read()</code> ' +
         'nên là <code>_IOR</code>; lệnh "SET" giống <code>write()</code> nên là <code>_IOW</code>. Chính ' +
         '<code>Documentation/userspace-api/ioctl/ioctl-number.rst</code> ghi đúng câu ấy: ' +
         '"<i>\'Write\' and \'read\' are from the user\'s point of view</i>".' },

    { t: 'p', x:
      'Chữ cái loại được chọn sao cho không trùng với ai. Danh sách chính thức là ' +
      '<code>Documentation/userspace-api/ioctl/ioctl-number.rst</code> (413 dòng trong cây 6.18.45). Chữ ' +
      '<code>\'x\'</code> không có trong bảng đó, nên bài dùng nó. Một driver đưa vào mainline sẽ phải gửi ' +
      'patch đăng ký chữ cái của mình vào chính file này. Bạn sẽ kiểm tra chữ <code>\'x\'</code> bằng ' +
      '<code>grep</code> ở bước 1.' },

    { t: 'h3', x: 'Một header, hai phía' },

    { t: 'p', x:
      'Driver và chương trình phải dùng <b>đúng cùng một</b> số hiệu và <b>đúng cùng một</b> cấu trúc. ' +
      'Cách duy nhất để chắc chắn là đặt chúng vào một header mà cả hai cùng <code>#include</code>. ' +
      'Header đó bị ràng buộc bởi hai phía cùng lúc, nên nó tuân theo luật của header <code>uapi</code> ' +
      'trong kernel:' },

    { t: 'list', items: [
      'Kiểu có kích thước cố định: <code>__u32</code>, <code>__u64</code> từ <code>&lt;linux/types.h&gt;</code>, ' +
        'không dùng <code>int</code>, <code>long</code> hay <code>size_t</code>. <code>long</code> là 8 byte với ' +
        'chương trình ARM64 nhưng 4 byte với chương trình ARM 32 bit chạy trên cùng kernel đó ' +
        '(<code>CONFIG_COMPAT=y</code> trên kernel của Bài 40).',
      'Chỉ <code>#include</code> header mà cả kernel lẫn userspace đều có: <code>&lt;linux/ioctl.h&gt;</code>, ' +
        '<code>&lt;linux/types.h&gt;</code>. Bộ cross-compiler của bạn có sẵn cả hai trong ' +
        '<code>/usr/aarch64-linux-gnu/include/linux/</code>.',
      'Không bao giờ sửa một cấu trúc đã phát hành. Cần thêm trường thì định nghĩa lệnh mới với số thứ ' +
        'tự mới, như <code>Documentation/driver-api/ioctl.rst</code> khuyên.'
    ] },

    { t: 'terms', items: [
      ['<code>ioctl</code>', 'I/O control', 'Syscall gửi một lệnh có số hiệu tới driver sở hữu một fd. Driver tự định nghĩa bộ lệnh.'],
      ['<code>unlocked_ioctl</code>', '—', 'Ô trong <code>file_operations</code> nhận lệnh <code>ioctl</code> từ chương trình 64 bit. Không có khoá nào bao quanh nó.'],
      ['<code>compat_ioctl</code>', '—', 'Ô nhận lệnh từ chương trình 32 bit trên kernel 64 bit. Nếu tham số là con trỏ tới cấu trúc không chứa <code>long</code>/con trỏ, chỉ cần gán <code>compat_ptr_ioctl</code>.'],
      ['Magic number', 'type', '8 bit giữa của số hiệu lệnh, thường là một chữ cái, riêng cho mỗi driver.'],
      ['<code>ENOTTY</code>', 'errno 25', 'Mã lỗi chuẩn cho "fd này không hiểu lệnh <code>ioctl</code> đó".'],
      ['uapi', 'user API', 'Header trong <code>include/uapi/</code> được chép nguyên sang userspace. Mọi thứ trong đó là cam kết không đổi.']
    ] },

    { t: 'cal', kind: 'warn', title: 'ioctl không quan tâm fd được mở để đọc hay để ghi',
      x: 'Với <code>write()</code>, kernel tự từ chối một fd mở bằng <code>O_RDONLY</code>. Với ' +
         '<code>ioctl</code> thì không: kernel chuyển lệnh tới driver bất kể chế độ mở. Nếu lệnh làm thay ' +
         'đổi dữ liệu, <b>driver phải tự kiểm tra</b> <code>filp-&gt;f_mode &amp; FMODE_WRITE</code> và trả ' +
         '<code>-EBADF</code>. Quên dòng đó thì một chương trình chỉ có quyền đọc cũng xoá được dữ liệu. ' +
         'Bước 4 cho bạn thấy driver chặn nó, và điều gì xảy ra khi thiếu dòng kiểm tra.' },

    /* ============================================================
       3. SYSFS
       ============================================================ */
    { t: 'h2', x: 'sysfs: một giá trị, một file' },

    { t: 'p', x:
      'Ở Bài 52, <code>device_create</code> đã tạo thư mục <code>/sys/class/ramdisk/ramdisk0/</code> với ' +
      'bốn mục do kernel tự sinh: <code>dev</code>, <code>power</code>, <code>subsystem</code>, <code>uevent</code>. Một ' +
      '<b>thuộc tính</b> (attribute) là một file bạn tự thêm vào thư mục đó. Mỗi lần có ai ' +
      '<code>cat</code> nó, kernel gọi hàm <code>show</code> của bạn để sinh nội dung; mỗi lần có ai ' +
      '<code>echo</code> vào nó, kernel gọi hàm <code>store</code>. File không chứa gì trên đĩa hay trong ' +
      'RAM giữa hai lần đọc. Nó giống một nút bấm trên bảng điều khiển hơn là một tờ giấy: mỗi lần ' +
      'nhìn vào, bạn thấy trạng thái <i>hiện tại</i>.' },

    { t: 'p', x:
      'Luật của sysfs rất chặt, và được viết thẳng ra trong ' +
      '<code>Documentation/filesystems/sysfs.rst:62</code>: "<i>Attributes should be ASCII text files, ' +
      'preferably with only one value per file</i>". Chính sự chặt chẽ đó làm sysfs hữu ích: một script ' +
      'shell đọc <code>used</code> bằng <code>$(cat …/used)</code> mà không phải phân tích cú pháp gì cả. ' +
      'udev (hay <code>mdev</code> của BusyBox) cũng đọc thuộc tính theo cách đó để quyết định đặt tên và ' +
      'quyền cho node trong <code>/dev</code>.' },

    { t: 'code', where: 'file', name: 'Phần sysfs trong ramdisk.c', lang: 'c', nocopy: true, code:
      'static ssize_t used_show(struct device *dev, struct device_attribute *attr,\n' +
      '\t\t\t char *buf)\n' +
      '{\n' +
      '\tstruct rd_dev *rd = dev_get_drvdata(dev);\n' +
      '\t...\n' +
      '\treturn sysfs_emit(buf, "%zu\\n", len);\n' +
      '}\n' +
      'static DEVICE_ATTR_RO(used);          /* file "used", mode 0444, only _show */\n' +
      '\n' +
      'static DEVICE_ATTR_RW(readonly);      /* file "readonly", mode 0644, _show + _store */\n' +
      '\n' +
      'static struct attribute *rd_attrs[] = {\n' +
      '\t&dev_attr_used.attr,\n' +
      '\t&dev_attr_readonly.attr,\n' +
      '\tNULL,\n' +
      '};\n' +
      'ATTRIBUTE_GROUPS(rd);                 /* defines rd_groups */\n' +
      '...\n' +
      'dev = device_create_with_groups(rd_class, NULL, rd->cdev.dev, rd,\n' +
      '\t\t\t\trd_groups, "ramdisk%d", i);',
      notes: ['Đoạn trích để đọc, không phải để gõ. File đầy đủ nằm ở bước 2.'] },

    { t: 'cmdx', cmd: 'static DEVICE_ATTR_RW(readonly);',
      title: 'Một dòng macro sinh ra những gì',
      rows: [
        ['<code>DEVICE_ATTR_RW(readonly)</code>', 'Khai báo biến <code>dev_attr_readonly</code> kiểu <code>struct device_attribute</code>.', 'Macro nối tên file với hai hàm theo quy ước đặt tên: <code>readonly_show</code> và <code>readonly_store</code>. Viết sai tên hàm là lỗi biên dịch ngay (<code>include/linux/device.h:180</code>).'],
        ['<code>_RW</code> / <code>_RO</code>', 'Chọn quyền file: <code>0644</code> hoặc <code>0444</code>.', 'Quyền này là thật: root cũng không ghi được vào file <code>0444</code> của sysfs. Bước 5 cho thấy điều đó.'],
        ['<code>ATTRIBUTE_GROUPS(rd)</code>', 'Từ mảng <code>rd_attrs</code> sinh ra <code>rd_groups</code>.', 'Một danh sách kết thúc bằng <code>NULL</code> mà <code>device_create_with_groups</code> nhận vào (<code>include/linux/sysfs.h:285</code>).'],
        ['<code>dev_get_drvdata(dev)</code>', 'Lấy lại con trỏ <code>rd</code> đã truyền vào <code>device_create_with_groups</code>.', 'Tham số thứ tư, <code>drvdata</code>, chính là cầu nối từ <code>struct device</code> của sysfs về <code>struct rd_dev</code> của bạn. Ở Bài 52 tham số này là <code>NULL</code>.'],
        ['<code>sysfs_emit(buf, …)</code>', 'Ghi vào bộ đệm một trang (4 096 byte) mà sysfs đưa cho.', '<code>sysfs.rst</code> yêu cầu mọi <code>show</code> mới dùng hàm này thay vì <code>sprintf</code>: nó không bao giờ ghi quá trang.']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao dùng device_create_with_groups, không phải device_create rồi thêm file sau?',
      x: 'Trong <code>device_add()</code> (<code>drivers/base/core.c</code>), kernel tạo các thuộc tính ở ' +
         'dòng <b>3710</b>, node devtmpfs ở dòng <b>3730</b>, và phát sự kiện <code>uevent</code> báo ' +
         '"có thiết bị mới" ở dòng <b>3737</b>. Truyền nhóm thuộc tính vào cùng lời gọi thì khi udev ' +
         'nhận sự kiện, file <code>used</code> đã có sẵn. Nếu gọi <code>device_create</code> trước rồi ' +
         '<code>device_create_file</code> sau, udev có thể chạy vào đúng khoảng trống giữa hai lời gọi và ' +
         'không thấy file nào. Đây cùng một nguyên tắc với <code>cdev_add</code> ở Bài 52: dựng xong mọi ' +
         'thứ rồi mới cho thế giới bên ngoài nhìn thấy.' },

    { t: 'p', x:
      'Hàm <code>store</code> nhận chuỗi người dùng gõ, kèm cả ký tự xuống dòng mà <code>echo</code> thêm ' +
      'vào. Đừng tự so sánh chuỗi: kernel có sẵn họ hàm <code>kstrto*</code>. Bài dùng ' +
      '<code>kstrtobool</code> (<code>lib/kstrtox.c:348</code>), hàm này nhận <code>1</code>/<code>0</code>, ' +
      '<code>y</code>/<code>n</code>, <code>on</code>/<code>off</code> và trả <code>-EINVAL</code> cho mọi ' +
      'thứ khác. Trả mã lỗi âm từ <code>store</code> thì <code>echo</code> nhận đúng mã đó.' },

    /* ============================================================
       4. PROCFS VÀ DEBUGFS
       ============================================================ */
    { t: 'h2', x: 'procfs và debugfs: báo cáo và gỡ lỗi' },

    { t: 'h3', x: 'procfs: một bảng cho con người' },

    { t: 'p', x:
      'Bạn đã đọc <code>/proc</code> từ Bài 5 (<code>/proc/PID/status</code>), Bài 51 ' +
      '(<code>/proc/meminfo</code>) và Bài 52 (<code>/proc/devices</code>). <code>/proc</code> ra đời để ' +
      'mô tả <b>tiến trình</b>, rồi dần dần mọi thứ khác bị nhét vào đó, vì thời ấy chưa có sysfs. Kết quả ' +
      'là hàng trăm file, mỗi file một định dạng riêng. Kernel không cấm driver mới tạo file trong ' +
      '<code>/proc</code>, nhưng một driver thiết bị gửi lên mainline hôm nay sẽ được yêu cầu dùng sysfs ' +
      'thay thế. Bài dùng procfs cho đúng việc nó còn hợp: một <b>bảng tổng quan</b> cho cả driver, gồm ' +
      'nhiều cột và nhiều dòng, thứ mà luật "một giá trị mỗi file" của sysfs không cho phép.' },

    { t: 'code', where: 'file', name: 'Phần procfs trong ramdisk.c', lang: 'c', nocopy: true, code:
      'static int rd_proc_show(struct seq_file *m, void *v)\n' +
      '{\n' +
      '\tseq_puts(m, "minor  used  readonly  reads  writes  ioctls\\n");\n' +
      '\tfor (i = 0; i < RD_COUNT; i++)\n' +
      '\t\tseq_printf(m, "%5d %5zu %9d ...", i, rd->len, ...);\n' +
      '\treturn 0;\n' +
      '}\n' +
      '...\n' +
      'rd_proc = proc_create_single("ramdisk", 0444, NULL, rd_proc_show);\n' +
      '...\n' +
      'remove_proc_entry("ramdisk", NULL);    /* in rd_exit() */',
      notes: ['<code>seq_file</code> lo phần khó của <code>read</code>: cắt nội dung theo <code>count</code>, giữ <code>*ppos</code>, trả 0 ở cuối. Bạn chỉ việc <code>seq_printf</code> như <code>printf</code>. Đó chính là hợp đồng mà Bài 52 bắt bạn tự viết tay trong <code>rd_read</code>.'] },

    { t: 'h3', x: 'debugfs: không luật lệ, không cam kết' },

    { t: 'p', x:
      'debugfs được gắn ở <code>/sys/kernel/debug</code> và chỉ có một mục đích: cho người phát triển ' +
      'nhìn vào bên trong driver. <code>Documentation/filesystems/debugfs.rst:13</code> nói thẳng: ' +
      '"<i>debugfs has no rules at all</i>". Bạn được phép đổ ra bộ đệm nhị phân, cấu trúc nội bộ, bộ ' +
      'đếm, thậm chí thanh ghi phần cứng, và kernel không hứa giữ chúng không đổi. Bạn đã dùng một file ' +
      'debugfs ở Bài 45 (<code>/sys/kernel/debug/gpio</code>) để xem chân GPIO nào đã có chủ.' },

    { t: 'p', x:
      'Kernel có sẵn các hàm tạo file cho kiểu dữ liệu thường gặp, nên không phải viết <code>show</code>:' },

    { t: 'table',
      head: ['Hàm', 'Tạo ra', 'Trong bài'],
      rows: [
        ['<code>debugfs_create_dir(name, parent)</code>', 'Một thư mục. <code>parent = NULL</code> nghĩa là ngay dưới gốc debugfs', '<code>ramdisk/</code>, rồi <code>ramdisk0/</code>, <code>ramdisk1/</code> bên trong'],
        ['<code>debugfs_create_u32(name, mode, dir, &amp;var)</code>', 'Một file đọc ra giá trị hiện tại của một biến <code>u32</code>, dạng thập phân', '<code>reads</code>, <code>writes</code>, <code>ioctls</code>'],
        ['<code>debugfs_create_blob(name, mode, dir, &amp;blob)</code>', 'Một file đọc ra nguyên văn một vùng nhớ', '<code>data</code>: cả 4 096 byte của ram-disk, kể cả phần sau <code>len</code>'],
        ['<code>debugfs_remove(dir)</code>', 'Xoá cả cây bên dưới <code>dir</code>', 'Một lời gọi trong <code>rd_exit</code>']
      ] },

    { t: 'cal', kind: 'warn', title: 'Không bao giờ kiểm tra giá trị trả về của debugfs',
      x: 'Nghe ngược đời, nhưng đó là quy ước của kernel từ 5.x. Nếu kernel build với ' +
         '<code># CONFIG_DEBUG_FS is not set</code>, mọi hàm debugfs trả một con trỏ lỗi, và một driver ' +
         '"cẩn thận" kiểm tra nó rồi trả lỗi từ <code>init</code> sẽ <b>không nạp được</b> trên chính ' +
         'thiết bị xuất xưởng, nơi debugfs thường bị tắt. Các hàm debugfs đã được viết để chấp nhận con ' +
         'trỏ lỗi làm <code>parent</code> mà không làm gì cả. Kernel của Bài 40 có ' +
         '<code>CONFIG_DEBUG_FS=y</code> (dòng 11483 của <code>.config</code>), nên trong bài mọi thứ đều ' +
         'được tạo.' },

    { t: 'cal', kind: 'info', title: 'Hai hệ thống file ảo không tự gắn trong initramfs của Bài 32',
      x: '<code>/init</code> của Bài 32 chỉ gắn <code>proc</code> và <code>sysfs</code>. devtmpfs (cho ' +
         '<code>/dev/ramdisk0</code>) bạn đã tự gắn ở Bài 52. debugfs cũng vậy: thư mục ' +
         '<code>/sys/kernel/debug</code> luôn tồn tại (sysfs tạo sẵn điểm gắn), nhưng rỗng cho tới khi ' +
         'bạn <code>mount -t debugfs none /sys/kernel/debug</code>. Trên Ubuntu hay một bản Buildroot có ' +
         'systemd, việc này được làm lúc boot.' },

    /* ============================================================
       5. CHỌN KÊNH NÀO
       ============================================================ */
    { t: 'h2', x: 'Chọn kênh nào cho việc nào' },

    { t: 'p', x:
      'Câu hỏi đầu tiên luôn là: <b>ai sẽ dùng nó, và dùng trong bao lâu?</b> Một giá trị mà script ' +
      'của khách hàng sẽ đọc trong mười năm cần một kênh có cam kết ABI. Một bộ đếm bạn chỉ cần trong ' +
      'tuần gỡ lỗi này thì không. Cây quyết định dưới đây đủ cho mọi driver còn lại của Chặng 10.' },

    { t: 'fig',
      cap: 'Chọn kênh bằng ba câu hỏi. Tốc độ gần như không bao giờ là tiêu chí đầu tiên: bước 6 cho ' +
           'thấy <code>ioctl</code> nhanh hơn sysfs khoảng <b>20 lần</b>, nhưng một lần đọc sysfs vẫn ' +
           'chỉ mất khoảng <b>60 µs</b> trên QEMU. Chỉ khi cần gọi hàng nghìn lần mỗi giây, hoặc cần ' +
           'truyền một cấu trúc nhị phân nguyên khối, <code>ioctl</code> mới thắng vì lý do tốc độ.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Cây quyết định: chỉ để gỡ lỗi thì dùng debugfs; nếu không, là lệnh hoặc dữ liệu nhị phân từ chương trình thì dùng ioctl; nếu không, là một giá trị đơn cho shell thì dùng sysfs; bảng tổng quan nhiều cột thì procfs cho mã cũ, driver mới nên tách thành nhiều file sysfs">' +
        '<rect class="d-box-p" x="20" y="20" width="300" height="52" rx="6"/>' +
        '<text class="d-t" x="170" y="42" text-anchor="middle">Chỉ để gỡ lỗi, chỉ root cần?</text>' +
        '<text class="d-ts" x="170" y="60" text-anchor="middle">bộ đếm nội bộ, dump bộ đệm, thanh ghi</text>' +
        '<line class="d-line" x1="320" y1="46" x2="442" y2="46"/><path class="d-arrow" d="M 450 46 l -9 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="385" y="38" text-anchor="middle">có</text>' +
        '<rect class="d-box-w" x="450" y="20" width="250" height="52" rx="6"/>' +
        '<text class="d-t" x="575" y="42" text-anchor="middle">debugfs</text>' +
        '<text class="d-ts" x="575" y="60" text-anchor="middle">không ABI, có thể tắt khi xuất xưởng</text>' +
        '<line class="d-line" x1="170" y1="72" x2="170" y2="100"/><path class="d-arrow" d="M 170 108 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="186" y="92">không</text>' +
        '<rect class="d-box-p" x="20" y="108" width="300" height="52" rx="6"/>' +
        '<text class="d-t" x="170" y="130" text-anchor="middle">Lệnh, hay dữ liệu nhị phân có cấu trúc?</text>' +
        '<text class="d-ts" x="170" y="148" text-anchor="middle">gắn với một fd đang mở, gọi từ C</text>' +
        '<line class="d-line" x1="320" y1="134" x2="442" y2="134"/><path class="d-arrow" d="M 450 134 l -9 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="385" y="126" text-anchor="middle">có</text>' +
        '<rect class="d-box-a" x="450" y="108" width="250" height="52" rx="6"/>' +
        '<text class="d-t" x="575" y="130" text-anchor="middle">ioctl</text>' +
        '<text class="d-ts" x="575" y="148" text-anchor="middle">_IO/_IOR/_IOW, header uapi</text>' +
        '<line class="d-line" x1="170" y1="160" x2="170" y2="188"/><path class="d-arrow" d="M 170 196 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="186" y="180">không</text>' +
        '<rect class="d-box-p" x="20" y="196" width="300" height="52" rx="6"/>' +
        '<text class="d-t" x="170" y="218" text-anchor="middle">Một giá trị văn bản, cho shell/udev?</text>' +
        '<text class="d-ts" x="170" y="236" text-anchor="middle">trạng thái, cấu hình, thuộc tính thiết bị</text>' +
        '<line class="d-line" x1="320" y1="222" x2="442" y2="222"/><path class="d-arrow" d="M 450 222 l -9 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="385" y="214" text-anchor="middle">có</text>' +
        '<rect class="d-box-g" x="450" y="196" width="250" height="52" rx="6"/>' +
        '<text class="d-t" x="575" y="218" text-anchor="middle">sysfs</text>' +
        '<text class="d-ts" x="575" y="236" text-anchor="middle">DEVICE_ATTR_RO / _RW</text>' +
        '<line class="d-line" x1="170" y1="248" x2="170" y2="264"/>' +
        '<text class="d-ts" x="20" y="286">Không: một bảng nhiều cột cho người đọc → procfs (mã cũ) hoặc tách thành nhiều file sysfs (driver mới).</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Tình huống', 'Kênh', 'Vì sao'],
      rows: [
        ['Chương trình giám sát đọc nhiệt độ cảm biến mỗi giây', 'sysfs', 'Một giá trị văn bản, script đọc được. Đây đúng là cách <code>hwmon</code> làm (Bài 51 nói tới độ mili-độ C).'],
        ['Ứng dụng camera đặt độ phân giải và định dạng điểm ảnh cùng lúc', '<code>ioctl</code>', 'Nhiều trường phải đổi nguyên khối, trong một lời gọi. V4L2 dùng <code>VIDIOC_S_FMT</code> với một <code>struct</code>.'],
        ['Bật/tắt chế độ chỉ đọc của thiết bị từ script khởi động', 'sysfs', 'Một giá trị <code>0</code>/<code>1</code>, ghi bằng <code>echo</code>. <code>readonly</code> của bài.'],
        ['Xem bộ đệm vòng nội bộ của driver lúc gỡ lỗi', 'debugfs', 'Nhị phân, chỉ bạn cần, không cam kết giữ định dạng.'],
        ['Liệt kê trạng thái mọi thiết bị của driver trong một bảng', 'procfs (cũ) / sysfs (mới)', 'Bảng nhiều cột vi phạm luật sysfs. Driver mới thì mỗi thiết bị một thư mục sysfs với nhiều file.'],
        ['Xoá bộ đệm của thiết bị', '<code>ioctl</code> hoặc sysfs', 'Cả hai đều ổn. <code>ioctl</code> nếu chương trình đã có fd mở; một thuộc tính chỉ-ghi nếu người vận hành cần gọi từ shell.']
      ] },

    /* ============================================================
       6. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: bốn kênh cho driver ram-disk' },

    { t: 'p', x:
      'Sáu bước, trong thư mục mới <code>~/bai53</code>. Driver xuất phát từ bản sao của ' +
      '<code>~/bai52/ramdisk</code>, initramfs từ <code>~/bai32/initramfs</code>, kernel là cây ' +
      '<code>~/bai38/linux-6.18.45</code> của Bài 40. Không bước nào ghi vào ba thư mục đó, nên bản ' +
      'driver của Bài 52 vẫn còn nguyên để bạn so sánh.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Chép driver, định nghĩa lệnh ioctl',
        blocks: [
          { t: 'p', x:
            'Chép thư mục <code>ramdisk</code> của Bài 52 sang chỗ mới rồi xoá sản phẩm build cũ, để ' +
            'bước 3 build lại từ đầu và bạn thấy đủ các dòng <code>CC</code>/<code>LD</code>:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai53/app\n' +
            'cp -a ~/bai52/ramdisk ~/bai53/\n' +
            'cd ~/bai53/ramdisk\n' +
            'make clean > /dev/null\n' +
            'ls' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Makefile\n' +
            'ramdisk.c',
            notes: ['Bản ghi này chạy qua pipe nên <code>ls</code> in mỗi mục một dòng; trong terminal của bạn nó xếp thành cột.'] },

          { t: 'p', x:
            'Còn đúng hai file nguồn: Makefile 12 dòng và <code>ramdisk.c</code> 201 dòng của Bài 52. ' +
            '<code>make clean</code> đã xoá <code>ramdisk.ko</code> cùng mọi file <code>.o</code>, ' +
            '<code>.cmd</code>. Makefile dùng <code>$(CURDIR)</code> làm <code>M=</code>, nên nó chạy ' +
            'đúng ở thư mục mới mà không cần sửa.' },

          { t: 'p', x:
            'Trước khi chọn chữ cái cho lệnh <code>ioctl</code>, hãy xem bảng đăng ký của kernel quanh ' +
            'chữ <code>x</code>:' },

          { t: 'code', where: 'wsl', code:
            'grep -nE "^\'[wxyz]\'" ~/bai38/linux-6.18.45/Documentation/userspace-api/ioctl/ioctl-number.rst' },

          { t: 'code', where: 'out', nocopy: true, code:
            '309:\'w\'   all                                                              CERN SCI driver\n' +
            '310:\'y\'   00-1F                                                            packet based user level communications\n' +
            '312:\'z\'   00-3F                                                            CAN bus card conflict!\n' +
            '314:\'z\'   40-7F                                                            CAN bus card conflict!\n' +
            '316:\'z\'   10-4F  drivers/s390/crypto/zcrypt_api.h                          conflict!' },

          { t: 'cmdx', cmd: 'grep -nE "^\'[wxyz]\'" …/ioctl-number.rst',
            title: 'Tra bảng chữ cái ioctl',
            rows: [
              ['<code>-n</code>', 'In số dòng trước mỗi kết quả.', 'Để bạn mở file đúng chỗ nếu muốn đọc cả khối.'],
              ['<code>-E</code>', 'Dùng biểu thức chính quy mở rộng.', 'Cần cho nhóm ký tự <code>[wxyz]</code> đứng giữa hai dấu nháy.'],
              ['<code>^\'[wxyz]\'</code>', 'Dòng bắt đầu bằng một trong bốn chữ, đặt trong dấu nháy đơn.', 'Cột đầu của bảng ghi chữ cái như <code>\'w\'</code>. Dấu <code>^</code> loại những dòng chỉ nhắc tới chữ đó ở giữa câu.']
            ] },

          { t: 'p', x:
            '<code>w</code>, <code>y</code> và <code>z</code> đều đã có chủ, <code>z</code> còn bị ba ' +
            'driver dùng chung (<code>conflict!</code>). Không có dòng nào cho <code>x</code>: chữ này ' +
            'chưa được cấp cho driver nào trong mainline 6.18.45, nên bài dùng nó. Bảng chỉ bảo đảm không ' +
            'trùng với mainline; một driver ngoài cây của hãng khác vẫn có thể đã dùng <code>x</code>, và ' +
            'đó là lý do driver luôn kiểm tra <b>cả</b> kích thước lẫn số thứ tự, không chỉ chữ cái.' },

          { t: 'p', x:
            'Giờ tạo header dùng chung. Nó nằm trong thư mục driver, và chương trình userspace sẽ ' +
            '<code>#include</code> nó qua <code>-I</code>:' },

          { t: 'code', where: 'file', name: '~/bai53/ramdisk/ramdisk_ioctl.h', lang: 'c', code:
            '/* SPDX-License-Identifier: GPL-2.0 WITH Linux-syscall-note */\n' +
            '/* Shared by the driver and by user programs: one definition, two sides */\n' +
            '#ifndef RAMDISK_IOCTL_H\n' +
            '#define RAMDISK_IOCTL_H\n' +
            '\n' +
            '#include <linux/ioctl.h>\n' +
            '#include <linux/types.h>\n' +
            '\n' +
            '#define RD_IOC_MAGIC \'x\'\n' +
            '\n' +
            'struct rd_info {\n' +
            '	__u32 size;             /* capacity in bytes */\n' +
            '	__u32 used;             /* bytes holding data */\n' +
            '};\n' +
            '\n' +
            '#define RD_IOC_GET_INFO _IOR(RD_IOC_MAGIC, 1, struct rd_info)\n' +
            '#define RD_IOC_CLEAR    _IO(RD_IOC_MAGIC, 2)\n' +
            '#define RD_IOC_SET_LEN  _IOW(RD_IOC_MAGIC, 3, __u32)\n' +
            '\n' +
            '#endif' },

          { t: 'cmdx', cmd: 'ramdisk_ioctl.h',
            title: 'Từng dòng của header',
            rows: [
              ['<code>GPL-2.0 WITH Linux-syscall-note</code>', 'Giấy phép GPL kèm một ngoại lệ.', 'Ngoại lệ cho phép chương trình không phải GPL <code>#include</code> header này. Mọi header trong <code>include/uapi/</code> đều mang dòng đó.'],
              ['<code>&lt;linux/ioctl.h&gt;</code>, <code>&lt;linux/types.h&gt;</code>', 'Hai header có ở cả hai phía.', 'Trong kernel chúng nằm ở <code>include/uapi/</code>; ở userspace, trong <code>/usr/aarch64-linux-gnu/include/linux/</code> của cross-compiler.'],
              ['<code>struct rd_info</code>', 'Hai trường <code>__u32</code>, tổng 8 byte.', 'Kiểu cố định kích thước, không có <code>long</code> hay con trỏ, nên một chương trình ARM 32 bit thấy đúng cùng bố cục.'],
              ['<code>_IOR(RD_IOC_MAGIC, 1, struct rd_info)</code>', 'Lệnh 1: chương trình đọc về một <code>rd_info</code>.', 'Truyền <b>kiểu</b>, không truyền <code>sizeof</code>. Macro tự lấy <code>sizeof</code>; <code>ioctl-number.rst</code> cảnh báo riêng điều này.'],
              ['<code>_IO(RD_IOC_MAGIC, 2)</code>', 'Lệnh 2: không có dữ liệu đi kèm.', 'Xoá nội dung. Tham số thứ ba của <code>ioctl()</code> bị bỏ qua.'],
              ['<code>_IOW(RD_IOC_MAGIC, 3, __u32)</code>', 'Lệnh 3: chương trình gửi vào một <code>__u32</code>.', 'Đặt lại độ dài dữ liệu hợp lệ, như <code>truncate</code> thu nhỏ một file.']
            ] },

          { t: 'p', x:
            'Chương trình <code>rdctl</code> gọi từng lệnh theo đối số dòng lệnh. Hai lệnh con đặc biệt ' +
            'dùng để gây lỗi có chủ ý: <code>badptr</code> truyền <code>NULL</code>, còn <code>v0</code> ' +
            'giả làm một bản <code>rdctl</code> cũ, biên dịch từ hồi <code>struct rd_info</code> chỉ có ' +
            'một trường. <code>roclear</code> thử xoá qua một fd chỉ mở để đọc.' },

          { t: 'code', where: 'file', name: '~/bai53/app/rdctl.c', lang: 'c', code:
            '#include <errno.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '#include <sys/ioctl.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            '#include "ramdisk_ioctl.h"\n' +
            '\n' +
            '/* An old build of this program, from when rd_info held a single __u32 */\n' +
            '#define RD_IOC_GET_INFO_V0 _IOR(RD_IOC_MAGIC, 1, __u32)\n' +
            '\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '	const char *path = argc > 1 ? argv[1] : "";\n' +
            '	const char *cmd = argc > 2 ? argv[2] : "";\n' +
            '	struct rd_info info;\n' +
            '	__u32 len = 0;\n' +
            '	int fd, ret;\n' +
            '\n' +
            '	if (!strcmp(path, "codes")) {\n' +
            '		printf("RD_IOC_GET_INFO    = 0x%08lx\\n", (unsigned long)RD_IOC_GET_INFO);\n' +
            '		printf("RD_IOC_CLEAR       = 0x%08lx\\n", (unsigned long)RD_IOC_CLEAR);\n' +
            '		printf("RD_IOC_SET_LEN     = 0x%08lx\\n", (unsigned long)RD_IOC_SET_LEN);\n' +
            '		printf("RD_IOC_GET_INFO_V0 = 0x%08lx\\n", (unsigned long)RD_IOC_GET_INFO_V0);\n' +
            '		return 0;\n' +
            '	}\n' +
            '	if (argc < 3) {\n' +
            '		fprintf(stderr, "usage: rdctl DEVICE info|clear|roclear|setlen N|badptr|v0\\n"\n' +
            '				"       rdctl codes\\n");\n' +
            '		return 2;\n' +
            '	}\n' +
            '\n' +
            '	/* info only looks, and roclear tries to clear through a read-only fd */\n' +
            '	fd = open(path, strcmp(cmd, "info") && strcmp(cmd, "roclear") ? O_RDWR : O_RDONLY);\n' +
            '	if (fd < 0) {\n' +
            '		perror(path);\n' +
            '		return 1;\n' +
            '	}\n' +
            '\n' +
            '	if (!strcmp(cmd, "info"))\n' +
            '		ret = ioctl(fd, RD_IOC_GET_INFO, &info);\n' +
            '	else if (!strcmp(cmd, "clear") || !strcmp(cmd, "roclear"))\n' +
            '		ret = ioctl(fd, RD_IOC_CLEAR);\n' +
            '	else if (!strcmp(cmd, "setlen") && argc > 3) {\n' +
            '		len = strtoul(argv[3], NULL, 0);\n' +
            '		ret = ioctl(fd, RD_IOC_SET_LEN, &len);\n' +
            '	} else if (!strcmp(cmd, "badptr"))\n' +
            '		ret = ioctl(fd, RD_IOC_GET_INFO, NULL);\n' +
            '	else if (!strcmp(cmd, "v0"))\n' +
            '		ret = ioctl(fd, RD_IOC_GET_INFO_V0, &len);\n' +
            '	else {\n' +
            '		fprintf(stderr, "unknown command: %s\\n", cmd);\n' +
            '		return 2;\n' +
            '	}\n' +
            '\n' +
            '	if (ret < 0) {\n' +
            '		printf("%s: ioctl -> -1  errno %d (%s)\\n", cmd, errno, strerror(errno));\n' +
            '		close(fd);\n' +
            '		return 1;\n' +
            '	}\n' +
            '	printf("%s: ioctl -> %d\\n", cmd, ret);\n' +
            '	if (!strcmp(cmd, "info"))\n' +
            '		printf("    size %u  used %u\\n", info.size, info.used);\n' +
            '	close(fd);\n' +
            '	return 0;\n' +
            '}' },

          { t: 'p', x:
            'Trước khi đụng tới kernel, hãy xem các số hiệu thực sự là gì. Số hiệu là hằng số lúc ' +
            'biên dịch, và x86-64 lẫn ARM64 đều dùng <code>asm-generic/ioctl.h</code> (chỉ alpha, mips, ' +
            'powerpc, sparc định nghĩa lại kích thước trường), nên một bản build cho chính WSL in ra đúng ' +
            'các số mà bản ARM64 sẽ dùng:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53/app\n' +
            'gcc -O2 -Wall -I ../ramdisk -o rdctl-host rdctl.c\n' +
            './rdctl-host codes' },

          { t: 'code', where: 'out', nocopy: true, code:
            'RD_IOC_GET_INFO    = 0x80087801\n' +
            'RD_IOC_CLEAR       = 0x00007802\n' +
            'RD_IOC_SET_LEN     = 0x40047803\n' +
            'RD_IOC_GET_INFO_V0 = 0x80047801' },

          { t: 'cmdx', cmd: 'gcc -O2 -Wall -I ../ramdisk -o rdctl-host rdctl.c',
            title: 'Build cho chính WSL, chỉ để in số',
            rows: [
              ['<code>gcc</code>', 'Trình biên dịch của WSL, không phải cross-compiler.', '<code>rdctl-host</code> chạy ngay trên WSL. Nó không mở được <code>/dev/ramdisk0</code> ở đây, nhưng lệnh con <code>codes</code> không cần thiết bị nào.'],
              ['<code>-I ../ramdisk</code>', 'Thêm thư mục chứa <code>ramdisk_ioctl.h</code> vào đường tìm header.', 'Thiếu nó thì <code>#include "ramdisk_ioctl.h"</code> báo <code>No such file or directory</code>.']
            ] },

          { t: 'cal', kind: 'info', title: 'Đọc bốn con số',
            x: '<code>0x80087801</code>: hai bit cao <code>10</code> = đọc, kích thước <code>0x0008</code>, ' +
               'loại <code>0x78</code> = <code>x</code>, số <code>01</code>, đúng như hình ở phần lý thuyết. ' +
               '<code>0x40047803</code>: bit cao <code>01</code> = ghi, kích thước 4 (<code>__u32</code>), số 3. ' +
               '<code>0x00007802</code>: không hướng, kích thước 0, số 2. Dòng cuối là điểm mấu chốt: ' +
               '<code>RD_IOC_GET_INFO_V0</code> cùng chữ cái, cùng số thứ tự 1 với ' +
               '<code>RD_IOC_GET_INFO</code>, chỉ khác trường kích thước (<code>4</code> thay vì ' +
               '<code>8</code>). Với <code>switch</code> của driver, đó là hai lệnh hoàn toàn khác nhau.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Thêm bốn kênh vào driver',
        blocks: [
          { t: 'p', x:
            'Thay toàn bộ <code>~/bai53/ramdisk/ramdisk.c</code> bằng bản dưới. So với Bài 52, ' +
            '<code>diff</code> đếm được <b>181</b> dòng thêm và <b>9</b> dòng bỏ. Chín dòng bỏ là bảng ' +
            '<code>rd_fops</code> (dàn lại cột để chứa hai ô mới), lời gọi <code>device_create</code> và ' +
            '<code>MODULE_DESCRIPTION</code>. Mọi hàm của Bài 52 vẫn còn nguyên, chỉ được thêm vài dòng.' },

          { t: 'code', where: 'file', name: '~/bai53/ramdisk/ramdisk.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/fs.h>\n' +
            '#include <linux/cdev.h>\n' +
            '#include <linux/device.h>\n' +
            '#include <linux/slab.h>\n' +
            '#include <linux/mutex.h>\n' +
            '#include <linux/uaccess.h>\n' +
            '#include <linux/proc_fs.h>\n' +
            '#include <linux/seq_file.h>\n' +
            '#include <linux/debugfs.h>\n' +
            '#include <linux/compat.h>\n' +
            '\n' +
            '#include "ramdisk_ioctl.h"\n' +
            '\n' +
            '#define RD_COUNT 2          /* two devices: minor 0 and minor 1 */\n' +
            '#define RD_SIZE  4096       /* bytes of storage per device */\n' +
            '\n' +
            'struct rd_dev {\n' +
            '	char *data;             /* RD_SIZE bytes from kzalloc() */\n' +
            '	size_t len;             /* how many bytes hold real data */\n' +
            '	bool readonly;          /* set through sysfs */\n' +
            '	u32 reads, writes, ioctls;              /* call counters */\n' +
            '	struct debugfs_blob_wrapper blob;       /* raw view of data */\n' +
            '	struct mutex lock;      /* one reader or writer at a time */\n' +
            '	struct cdev cdev;       /* links this device to rd_fops */\n' +
            '};\n' +
            '\n' +
            'static dev_t rd_base;       /* first major:minor we own */\n' +
            'static struct class *rd_class;\n' +
            'static struct rd_dev rd_devs[RD_COUNT];\n' +
            'static struct proc_dir_entry *rd_proc;  /* /proc/ramdisk */\n' +
            'static struct dentry *rd_debug;         /* /sys/kernel/debug/ramdisk */\n' +
            '\n' +
            'static int rd_open(struct inode *inode, struct file *filp)\n' +
            '{\n' +
            '	struct rd_dev *rd = container_of(inode->i_cdev, struct rd_dev, cdev);\n' +
            '\n' +
            '	filp->private_data = rd;\n' +
            '	pr_debug("open    minor %u flags 0x%x\\n", iminor(inode), filp->f_flags);\n' +
            '\n' +
            '	if (rd->readonly && (filp->f_flags & O_ACCMODE) != O_RDONLY)\n' +
            '		return -EPERM;\n' +
            '\n' +
            '	/* "> file" in a shell opens with O_WRONLY|O_TRUNC: start empty */\n' +
            '	if ((filp->f_flags & O_ACCMODE) == O_WRONLY && (filp->f_flags & O_TRUNC)) {\n' +
            '		mutex_lock(&rd->lock);\n' +
            '		rd->len = 0;\n' +
            '		mutex_unlock(&rd->lock);\n' +
            '	}\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static int rd_release(struct inode *inode, struct file *filp)\n' +
            '{\n' +
            '	pr_debug("release minor %u\\n", iminor(inode));\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static ssize_t rd_read(struct file *filp, char __user *buf,\n' +
            '		       size_t count, loff_t *ppos)\n' +
            '{\n' +
            '	struct rd_dev *rd = filp->private_data;\n' +
            '	loff_t start = *ppos;\n' +
            '	size_t want = count;\n' +
            '	ssize_t ret;\n' +
            '\n' +
            '	mutex_lock(&rd->lock);\n' +
            '	rd->reads++;\n' +
            '	if (*ppos >= rd->len) {\n' +
            '		ret = 0;                        /* end of file */\n' +
            '		goto out;\n' +
            '	}\n' +
            '	if (count > rd->len - *ppos)\n' +
            '		count = rd->len - *ppos;\n' +
            '	if (copy_to_user(buf, rd->data + *ppos, count)) {\n' +
            '		ret = -EFAULT;\n' +
            '		goto out;\n' +
            '	}\n' +
            '	*ppos += count;\n' +
            '	ret = count;\n' +
            'out:\n' +
            '	mutex_unlock(&rd->lock);\n' +
            '	pr_debug("read    count %zu pos %lld -> %zd\\n", want, start, ret);\n' +
            '	return ret;\n' +
            '}\n' +
            '\n' +
            'static ssize_t rd_write(struct file *filp, const char __user *buf,\n' +
            '			size_t count, loff_t *ppos)\n' +
            '{\n' +
            '	struct rd_dev *rd = filp->private_data;\n' +
            '	size_t want = count;\n' +
            '	loff_t pos;\n' +
            '	ssize_t ret;\n' +
            '\n' +
            '	mutex_lock(&rd->lock);\n' +
            '	rd->writes++;\n' +
            '	/* ">> file" opens with O_APPEND: always write after the data */\n' +
            '	pos = (filp->f_flags & O_APPEND) ? rd->len : *ppos;\n' +
            '	if (pos >= RD_SIZE) {\n' +
            '		ret = -ENOSPC;\n' +
            '		goto out;\n' +
            '	}\n' +
            '	if (count > RD_SIZE - pos)\n' +
            '		count = RD_SIZE - pos;\n' +
            '	if (copy_from_user(rd->data + pos, buf, count)) {\n' +
            '		ret = -EFAULT;\n' +
            '		goto out;\n' +
            '	}\n' +
            '	*ppos = pos + count;\n' +
            '	if (*ppos > rd->len)\n' +
            '		rd->len = *ppos;\n' +
            '	ret = count;\n' +
            'out:\n' +
            '	mutex_unlock(&rd->lock);\n' +
            '	pr_debug("write   count %zu pos %lld -> %zd\\n", want, pos, ret);\n' +
            '	return ret;\n' +
            '}\n' +
            '\n' +
            'static loff_t rd_llseek(struct file *filp, loff_t off, int whence)\n' +
            '{\n' +
            '	return fixed_size_llseek(filp, off, whence, RD_SIZE);\n' +
            '}\n' +
            '\n' +
            '/* ---- channel 1: ioctl, a numbered command on an open file ---- */\n' +
            '\n' +
            '/* ioctl ignores the open mode: commands that change data check it here */\n' +
            'static long rd_may_change(struct file *filp, struct rd_dev *rd)\n' +
            '{\n' +
            '	if (!(filp->f_mode & FMODE_WRITE))\n' +
            '		return -EBADF;\n' +
            '	if (rd->readonly)\n' +
            '		return -EPERM;\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static long rd_ioctl(struct file *filp, unsigned int cmd, unsigned long arg)\n' +
            '{\n' +
            '	struct rd_dev *rd = filp->private_data;\n' +
            '	void __user *uarg = (void __user *)arg;\n' +
            '	struct rd_info info;\n' +
            '	__u32 len;\n' +
            '	long ret = 0;\n' +
            '\n' +
            '	pr_debug("ioctl   cmd 0x%08x dir %u type \'%c\' nr %u size %u\\n", cmd,\n' +
            '		 _IOC_DIR(cmd), _IOC_TYPE(cmd), _IOC_NR(cmd), _IOC_SIZE(cmd));\n' +
            '	if (_IOC_TYPE(cmd) != RD_IOC_MAGIC)\n' +
            '		return -ENOTTY;                 /* not one of ours */\n' +
            '\n' +
            '	mutex_lock(&rd->lock);\n' +
            '	rd->ioctls++;\n' +
            '	switch (cmd) {\n' +
            '	case RD_IOC_GET_INFO:                   /* kernel -> user */\n' +
            '		info.size = RD_SIZE;\n' +
            '		info.used = rd->len;\n' +
            '		if (copy_to_user(uarg, &info, sizeof(info)))\n' +
            '			ret = -EFAULT;\n' +
            '		break;\n' +
            '	case RD_IOC_CLEAR:                      /* no data at all */\n' +
            '		ret = rd_may_change(filp, rd);\n' +
            '		if (!ret)\n' +
            '			rd->len = 0;\n' +
            '		break;\n' +
            '	case RD_IOC_SET_LEN:                    /* user -> kernel */\n' +
            '		ret = rd_may_change(filp, rd);\n' +
            '		if (ret)\n' +
            '			break;\n' +
            '		if (copy_from_user(&len, uarg, sizeof(len)))\n' +
            '			ret = -EFAULT;\n' +
            '		else if (len > RD_SIZE)\n' +
            '			ret = -EINVAL;\n' +
            '		else\n' +
            '			rd->len = len;\n' +
            '		break;\n' +
            '	default:\n' +
            '		ret = -ENOTTY;                  /* right magic, unknown command */\n' +
            '	}\n' +
            '	mutex_unlock(&rd->lock);\n' +
            '	return ret;\n' +
            '}\n' +
            '\n' +
            'static const struct file_operations rd_fops = {\n' +
            '	.owner          = THIS_MODULE,\n' +
            '	.open           = rd_open,\n' +
            '	.release        = rd_release,\n' +
            '	.read           = rd_read,\n' +
            '	.write          = rd_write,\n' +
            '	.llseek         = rd_llseek,\n' +
            '	.unlocked_ioctl = rd_ioctl,\n' +
            '	.compat_ioctl   = compat_ptr_ioctl,    /* 32-bit programs, same numbers */\n' +
            '};\n' +
            '\n' +
            '/* ---- channel 2: sysfs, one value per file under /sys/class/ramdisk ---- */\n' +
            'static ssize_t used_show(struct device *dev, struct device_attribute *attr,\n' +
            '			 char *buf)\n' +
            '{\n' +
            '	struct rd_dev *rd = dev_get_drvdata(dev);\n' +
            '	size_t len;\n' +
            '\n' +
            '	mutex_lock(&rd->lock);\n' +
            '	len = rd->len;\n' +
            '	mutex_unlock(&rd->lock);\n' +
            '	return sysfs_emit(buf, "%zu\\n", len);\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(used);\n' +
            '\n' +
            'static ssize_t readonly_show(struct device *dev, struct device_attribute *attr,\n' +
            '			     char *buf)\n' +
            '{\n' +
            '	struct rd_dev *rd = dev_get_drvdata(dev);\n' +
            '\n' +
            '	return sysfs_emit(buf, "%d\\n", rd->readonly);\n' +
            '}\n' +
            '\n' +
            'static ssize_t readonly_store(struct device *dev, struct device_attribute *attr,\n' +
            '			      const char *buf, size_t count)\n' +
            '{\n' +
            '	struct rd_dev *rd = dev_get_drvdata(dev);\n' +
            '	bool val;\n' +
            '	int ret;\n' +
            '\n' +
            '	ret = kstrtobool(buf, &val);            /* accepts 1/0, y/n, on/off */\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '	mutex_lock(&rd->lock);\n' +
            '	rd->readonly = val;\n' +
            '	mutex_unlock(&rd->lock);\n' +
            '	pr_debug("sysfs   readonly <- %d\\n", val);\n' +
            '	return count;\n' +
            '}\n' +
            'static DEVICE_ATTR_RW(readonly);\n' +
            '\n' +
            'static struct attribute *rd_attrs[] = {\n' +
            '	&dev_attr_used.attr,\n' +
            '	&dev_attr_readonly.attr,\n' +
            '	NULL,\n' +
            '};\n' +
            'ATTRIBUTE_GROUPS(rd);                           /* defines rd_groups */\n' +
            '\n' +
            '/* ---- channel 3: procfs, one summary for the whole driver ---- */\n' +
            'static int rd_proc_show(struct seq_file *m, void *v)\n' +
            '{\n' +
            '	int i;\n' +
            '\n' +
            '	seq_puts(m, "minor  used  readonly  reads  writes  ioctls\\n");\n' +
            '	for (i = 0; i < RD_COUNT; i++) {\n' +
            '		struct rd_dev *rd = &rd_devs[i];\n' +
            '\n' +
            '		mutex_lock(&rd->lock);\n' +
            '		seq_printf(m, "%5d %5zu %9d %6u %7u %7u\\n", i, rd->len,\n' +
            '			   rd->readonly, rd->reads, rd->writes, rd->ioctls);\n' +
            '		mutex_unlock(&rd->lock);\n' +
            '	}\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            '/* ---- channel 4: debugfs, internals for the developer only ---- */\n' +
            'static void rd_debugfs_init(void)\n' +
            '{\n' +
            '	char name[16];\n' +
            '	int i;\n' +
            '\n' +
            '	/* debugfs calls are never checked: a failure must not stop the driver */\n' +
            '	rd_debug = debugfs_create_dir("ramdisk", NULL);\n' +
            '	for (i = 0; i < RD_COUNT; i++) {\n' +
            '		struct rd_dev *rd = &rd_devs[i];\n' +
            '		struct dentry *dir;\n' +
            '\n' +
            '		snprintf(name, sizeof(name), "ramdisk%d", i);\n' +
            '		dir = debugfs_create_dir(name, rd_debug);\n' +
            '		rd->blob.data = rd->data;\n' +
            '		rd->blob.size = RD_SIZE;\n' +
            '		debugfs_create_blob("data", 0400, dir, &rd->blob);\n' +
            '		debugfs_create_u32("reads", 0444, dir, &rd->reads);\n' +
            '		debugfs_create_u32("writes", 0444, dir, &rd->writes);\n' +
            '		debugfs_create_u32("ioctls", 0444, dir, &rd->ioctls);\n' +
            '	}\n' +
            '}\n' +
            '\n' +
            '/* Undo everything rd_init() did for device i, in reverse order */\n' +
            'static void rd_teardown(int i)\n' +
            '{\n' +
            '	device_destroy(rd_class, MKDEV(MAJOR(rd_base), i));\n' +
            '	cdev_del(&rd_devs[i].cdev);\n' +
            '	kfree(rd_devs[i].data);\n' +
            '}\n' +
            '\n' +
            'static int __init rd_init(void)\n' +
            '{\n' +
            '	struct device *dev;\n' +
            '	int i, ret;\n' +
            '\n' +
            '	ret = alloc_chrdev_region(&rd_base, 0, RD_COUNT, "ramdisk");\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	rd_class = class_create("ramdisk");\n' +
            '	if (IS_ERR(rd_class)) {\n' +
            '		ret = PTR_ERR(rd_class);\n' +
            '		goto err_region;\n' +
            '	}\n' +
            '\n' +
            '	for (i = 0; i < RD_COUNT; i++) {\n' +
            '		struct rd_dev *rd = &rd_devs[i];\n' +
            '\n' +
            '		rd->data = kzalloc(RD_SIZE, GFP_KERNEL);\n' +
            '		if (!rd->data) {\n' +
            '			ret = -ENOMEM;\n' +
            '			goto err_devs;\n' +
            '		}\n' +
            '		mutex_init(&rd->lock);\n' +
            '\n' +
            '		/* the cdev must be live before the /dev node appears */\n' +
            '		cdev_init(&rd->cdev, &rd_fops);\n' +
            '		ret = cdev_add(&rd->cdev, MKDEV(MAJOR(rd_base), i), 1);\n' +
            '		if (ret) {\n' +
            '			kfree(rd->data);\n' +
            '			goto err_devs;\n' +
            '		}\n' +
            '\n' +
            '		/* rd becomes drvdata; the attributes exist before the uevent */\n' +
            '		dev = device_create_with_groups(rd_class, NULL, rd->cdev.dev, rd,\n' +
            '						rd_groups, "ramdisk%d", i);\n' +
            '		if (IS_ERR(dev)) {\n' +
            '			ret = PTR_ERR(dev);\n' +
            '			cdev_del(&rd->cdev);\n' +
            '			kfree(rd->data);\n' +
            '			goto err_devs;\n' +
            '		}\n' +
            '	}\n' +
            '\n' +
            '	rd_proc = proc_create_single("ramdisk", 0444, NULL, rd_proc_show);\n' +
            '	if (!rd_proc) {\n' +
            '		ret = -ENOMEM;\n' +
            '		goto err_devs;                  /* i == RD_COUNT here */\n' +
            '	}\n' +
            '	rd_debugfs_init();\n' +
            '\n' +
            '	pr_info("major %d, %d devices of %d bytes\\n",\n' +
            '		MAJOR(rd_base), RD_COUNT, RD_SIZE);\n' +
            '	return 0;\n' +
            '\n' +
            'err_devs:\n' +
            '	while (--i >= 0)\n' +
            '		rd_teardown(i);\n' +
            '	class_destroy(rd_class);\n' +
            'err_region:\n' +
            '	unregister_chrdev_region(rd_base, RD_COUNT);\n' +
            '	return ret;\n' +
            '}\n' +
            '\n' +
            'static void __exit rd_exit(void)\n' +
            '{\n' +
            '	int i;\n' +
            '\n' +
            '	debugfs_remove(rd_debug);               /* removes the whole tree */\n' +
            '	remove_proc_entry("ramdisk", NULL);\n' +
            '	for (i = 0; i < RD_COUNT; i++)\n' +
            '		rd_teardown(i);\n' +
            '	class_destroy(rd_class);\n' +
            '	unregister_chrdev_region(rd_base, RD_COUNT);\n' +
            '	pr_info("unloaded\\n");\n' +
            '}\n' +
            '\n' +
            'module_init(rd_init);\n' +
            'module_exit(rd_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("RAM-backed character device with ioctl, sysfs, procfs, debugfs");' },

          { t: 'table',
            head: ['Chỗ thay đổi', 'Làm gì'],
            rows: [
              ['<code>struct rd_dev</code>', 'Thêm <code>readonly</code>, ba bộ đếm <code>u32</code> và một <code>debugfs_blob_wrapper</code> trỏ vào <code>data</code>.'],
              ['<code>rd_open</code>', 'Thiết bị đang <code>readonly</code> mà ai đó mở để ghi thì trả <code>-EPERM</code> ngay.'],
              ['<code>rd_read</code> / <code>rd_write</code>', 'Tăng <code>reads</code>/<code>writes</code> trong vùng đã khoá mutex.'],
              ['<code>rd_may_change</code> + <code>rd_ioctl</code>', 'Kênh 1. Lọc chữ cái trước, rồi <code>switch</code> trên <b>cả số hiệu</b>. Lệnh đổi dữ liệu phải qua <code>rd_may_change</code>: fd không có <code>FMODE_WRITE</code> → <code>-EBADF</code>, đang <code>readonly</code> → <code>-EPERM</code>.'],
              ['<code>.unlocked_ioctl</code>, <code>.compat_ioctl</code>', 'Hai ô mới trong <code>rd_fops</code>. <code>compat_ptr_ioctl</code> (<code>fs/ioctl.c:629</code>) chuyển con trỏ 32 bit thành con trỏ 64 bit rồi gọi thẳng <code>rd_ioctl</code>, được vì <code>struct rd_info</code> không có trường nào đổi kích thước.'],
              ['<code>used_show</code>, <code>readonly_show</code>/<code>_store</code>', 'Kênh 2, hai thuộc tính sysfs.'],
              ['<code>rd_proc_show</code>', 'Kênh 3, bảng <code>/proc/ramdisk</code>.'],
              ['<code>rd_debugfs_init</code>', 'Kênh 4, cây <code>/sys/kernel/debug/ramdisk/</code>.'],
              ['<code>rd_init</code> / <code>rd_exit</code>', '<code>device_create_with_groups</code> thay <code>device_create</code>; tạo procfs và debugfs <b>sau cùng</b>, gỡ chúng <b>trước tiên</b>.']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao procfs và debugfs được gỡ trước mọi thứ khác?',
            x: 'Cả <code>rd_proc_show</code> lẫn file <code>data</code> của debugfs đều đọc thẳng vào ' +
               '<code>rd_devs[]</code> và bộ đệm <code>kzalloc</code>. Nếu <code>rd_exit</code> gọi ' +
               '<code>kfree</code> trước rồi mới gỡ <code>/proc/ramdisk</code>, một <code>cat</code> chạy ' +
               'đúng lúc đó sẽ đọc bộ nhớ đã trả về kernel. Quy tắc vẫn là hình dựng/dỡ của Bài 52: thứ ' +
               'gì cho thế giới bên ngoài chạm vào driver thì <b>dựng cuối, gỡ đầu</b>. ' +
               '<code>remove_proc_entry</code> còn chờ mọi lượt đọc đang dở kết thúc rồi mới trả về.' },

          { t: 'p', x:
            'Chương trình thứ hai, <code>rdbench</code>, hỏi "đang dùng bao nhiêu byte?" 10 000 lần qua ' +
            'mỗi kênh rồi so thời gian. Qua <code>ioctl</code>, fd được mở một lần; qua sysfs, mỗi lần hỏi ' +
            'là một bộ <code>open</code> + <code>read</code> + <code>close</code>, đúng như ' +
            '<code>$(cat …/used)</code> trong script:' },

          { t: 'code', where: 'file', name: '~/bai53/app/rdbench.c', lang: 'c', code:
            '#include <fcntl.h>\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <sys/ioctl.h>\n' +
            '#include <time.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            '#include "ramdisk_ioctl.h"\n' +
            '\n' +
            '#define SYSFS_USED "/sys/class/ramdisk/ramdisk0/used"\n' +
            '\n' +
            'static double now(void)\n' +
            '{\n' +
            '	struct timespec ts;\n' +
            '\n' +
            '	clock_gettime(CLOCK_MONOTONIC, &ts);\n' +
            '	return ts.tv_sec + ts.tv_nsec / 1e9;\n' +
            '}\n' +
            '\n' +
            '/* Ask "how many bytes are used?" n times through each channel */\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '	int n = argc > 1 ? atoi(argv[1]) : 10000;\n' +
            '	struct rd_info info;\n' +
            '	char buf[32];\n' +
            '	double t0, t_ioctl, t_sysfs;\n' +
            '	int fd, i;\n' +
            '\n' +
            '	fd = open("/dev/ramdisk0", O_RDONLY);\n' +
            '	if (fd < 0) {\n' +
            '		perror("/dev/ramdisk0");\n' +
            '		return 1;\n' +
            '	}\n' +
            '	t0 = now();\n' +
            '	for (i = 0; i < n; i++)\n' +
            '		ioctl(fd, RD_IOC_GET_INFO, &info);\n' +
            '	t_ioctl = now() - t0;\n' +
            '	close(fd);\n' +
            '\n' +
            '	t0 = now();\n' +
            '	for (i = 0; i < n; i++) {\n' +
            '		fd = open(SYSFS_USED, O_RDONLY);\n' +
            '		if (read(fd, buf, sizeof(buf)) < 0)\n' +
            '			return 1;\n' +
            '		close(fd);\n' +
            '	}\n' +
            '	t_sysfs = now() - t0;\n' +
            '\n' +
            '	printf("%d queries, used = %u\\n", n, info.used);\n' +
            '	printf("ioctl                 : %.3f s  %5.1f us per query\\n", t_ioctl, t_ioctl * 1e6 / n);\n' +
            '	printf("sysfs open+read+close : %.3f s  %5.1f us per query\\n", t_sysfs, t_sysfs * 1e6 / n);\n' +
            '	printf("sysfs / ioctl         : %.1fx\\n", t_sysfs / t_ioctl);\n' +
            '	return 0;\n' +
            '}' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Build driver, hai chương trình, đóng gói initramfs',
        blocks: [
          { t: 'p', x:
            'Build module bằng đúng Makefile của Bài 52. Không có dòng nào phải sửa: ' +
            '<code>ramdisk_ioctl.h</code> nằm cùng thư mục với <code>ramdisk.c</code>, nên ' +
            '<code>#include "ramdisk_ioctl.h"</code> tìm thấy nó mà không cần thêm <code>-I</code>.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53/ramdisk\n' +
            'time make' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai53/ramdisk ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai53/ramdisk\'\n' +
            '  CC [M]  ramdisk.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  ramdisk.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  ramdisk.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai53/ramdisk\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '\n' +
            'real\t0m2.304s\n' +
            'user\t0m1.542s\n' +
            'sys\t0m0.417s',
            notes: ['<code>/home/cah8hc</code> là thư mục nhà trên máy dùng để viết bài; trên máy bạn nó là tên người dùng của bạn. Dòng <code>embedded-course/bai38</code> xuất hiện vì trên máy đó <code>~/bai38</code> là một symlink; nếu <code>~/bai38</code> của bạn là thư mục thật, dòng này sẽ là <code>/home/…/bai38/linux-6.18.45</code>. Thời gian cũng sẽ khác.'] },

          { t: 'p', x:
            'Năm giai đoạn quen thuộc của Bài 50, <b>2,3 giây</b>, không một cảnh báo. Kernel không cần ' +
            'biết gì thêm về <code>ioctl</code>, sysfs, procfs hay debugfs: cả bốn chỉ là vài hàm nữa lấy ' +
            'từ <code>vmlinux</code>. Xem driver lớn thêm bao nhiêu và gọi thêm bao nhiêu hàm của kernel:' },

          { t: 'code', where: 'wsl', code:
            'ls -l ramdisk.ko\n' +
            'aarch64-linux-gnu-size ramdisk.ko ~/bai52/ramdisk/ramdisk.ko\n' +
            'aarch64-linux-gnu-nm -u ~/bai52/ramdisk/ramdisk.ko | wc -l\n' +
            'aarch64-linux-gnu-nm -u ramdisk.ko | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 146200 Sep 29 21:23 ramdisk.ko\n' +
            '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
            '   4470\t   1236\t    392\t   6098\t   17d2\tramdisk.ko\n' +
            '   2632\t   1132\t    320\t   4084\t    ff4\t/home/cah8hc/bai52/ramdisk/ramdisk.ko\n' +
            '20\n' +
            '33' },

          { t: 'p', x:
            'Mã máy (<code>text</code>) tăng từ <b>2 632</b> lên <b>4 470</b> byte, tức thêm 1 838 byte ' +
            'cho bốn kênh. <code>bss</code> tăng 72 byte cho các trường mới của hai <code>rd_dev</code> ' +
            '(<code>readonly</code>, ba bộ đếm, <code>blob</code>) và hai con trỏ <code>rd_proc</code>, ' +
            '<code>rd_debug</code>. Số hàm nhập từ kernel (<code>nm -u</code>, Bài 51) tăng từ <b>20</b> lên ' +
            '<b>33</b>. Mười ba hàm mới là cái giá của bốn kênh, và chín trong số đó đáng xem kỹ:' },

          { t: 'code', where: 'wsl', code:
            'for s in device_create_with_groups sysfs_emit kstrtobool proc_create_single_data seq_printf \\\n' +
            '         debugfs_create_dir debugfs_create_u32 debugfs_create_blob compat_ptr_ioctl; do\n' +
            '  grep -w "$s" ~/bai38/linux-6.18.45/Module.symvers | awk \'{print $2, $4}\'\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'device_create_with_groups EXPORT_SYMBOL_GPL\n' +
            'sysfs_emit EXPORT_SYMBOL_GPL\n' +
            'kstrtobool EXPORT_SYMBOL\n' +
            'proc_create_single_data EXPORT_SYMBOL\n' +
            'seq_printf EXPORT_SYMBOL\n' +
            'debugfs_create_dir EXPORT_SYMBOL_GPL\n' +
            'debugfs_create_u32 EXPORT_SYMBOL_GPL\n' +
            'debugfs_create_blob EXPORT_SYMBOL_GPL\n' +
            'compat_ptr_ioctl EXPORT_SYMBOL' },

          { t: 'cmdx', cmd: 'grep -w "$s" …/Module.symvers | awk \'{print $2, $4}\'',
            title: 'Tra loại export của từng hàm',
            rows: [
              ['<code>for s in …; do … done</code>', 'Lặp qua chín tên hàm, mỗi vòng gán một tên vào <code>$s</code>.', 'Vòng lặp của Bài 13. Dấu <code>\\</code> cuối dòng đầu nối hai dòng thành một lệnh.'],
              ['<code>grep -w "$s"</code>', 'Tìm dòng chứa đúng tên đó như một từ trọn vẹn.', 'Bài 51 đã dùng cách này. Không có <code>-w</code> thì <code>debugfs_create_dir</code> cũng khớp mọi hàm có tên dài hơn bắt đầu bằng nó.'],
              ['<code>awk \'{print $2, $4}\'</code>', 'In cột 2 (tên hàm) và cột 4 (loại export).', 'Mỗi dòng <code>Module.symvers</code> có bốn cột: CRC, tên, nơi định nghĩa, loại export.']
            ] },

          { t: 'cal', kind: 'info', title: 'Năm hàm GPL-only mới',
            x: '<code>device_create_with_groups</code>, <code>sysfs_emit</code> và cả ba hàm ' +
               '<code>debugfs_*</code> đều là <code>EXPORT_SYMBOL_GPL</code>. Cùng với ' +
               '<code>class_create</code>/<code>device_destroy</code> của Bài 52, driver giờ dùng tám hàm ' +
               'mà một module không mang giấy phép GPL không được phép gọi. Như Bài 52 đã cho thấy, ' +
               'đổi <code>MODULE_LICENSE</code> thì <code>modpost</code> từ chối từng hàm một. Hàm procfs ' +
               'và <code>compat_ptr_ioctl</code> là <code>EXPORT_SYMBOL</code> thường, vì chúng có từ ' +
               'trước khi quy ước GPL-only ra đời.' },

          { t: 'p', x:
            'Bước 6 sẽ đo tốc độ, và sẽ cần một bản driver giống hệt nhưng <b>không</b> có ' +
            '<code>-DDEBUG</code>. Lý do sẽ rõ khi bạn thấy con số. Build sẵn nó ngay bây giờ, trong một ' +
            'thư mục riêng để không đè lên bản chính:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53\n' +
            'mkdir nodebug\n' +
            'cp ramdisk/ramdisk.c ramdisk/ramdisk_ioctl.h nodebug/\n' +
            'grep -v DDEBUG ramdisk/Makefile > nodebug/Makefile\n' +
            'make -C nodebug > /dev/null\n' +
            'ls -l ramdisk/ramdisk.ko nodebug/ramdisk.ko\n' +
            'strings ramdisk/ramdisk.ko | grep -c \'ioctl   cmd\'\n' +
            'strings nodebug/ramdisk.ko | grep -c \'ioctl   cmd\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 144824 Sep 29 21:23 nodebug/ramdisk.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 146200 Sep 29 21:23 ramdisk/ramdisk.ko\n' +
            '1\n' +
            '0' },

          { t: 'cmdx', cmd: 'grep -v DDEBUG ramdisk/Makefile > nodebug/Makefile',
            title: 'Một Makefile không có -DDEBUG',
            rows: [
              ['<code>grep -v DDEBUG</code>', 'In mọi dòng <b>không</b> chứa <code>DDEBUG</code>.', 'Chỉ dòng <code>CFLAGS_ramdisk.o := -DDEBUG</code> bị bỏ. Mười một dòng còn lại giữ nguyên.'],
              ['<code>make -C nodebug</code>', 'Chạy <code>make</code> như thể đang đứng trong <code>nodebug/</code>.', '<code>$(CURDIR)</code> khi đó là <code>~/bai53/nodebug</code>, nên Kbuild build module ở đúng thư mục ấy.'],
              ['<code>strings … | grep -c \'ioctl   cmd\'</code>', 'Đếm chuỗi định dạng của <code>pr_debug</code> trong <code>rd_ioctl</code>.', 'Cách kiểm tra của Bài 51: không có <code>DEBUG</code>, <code>pr_debug</code> biến mất khỏi file <code>.ko</code>, kể cả chuỗi của nó.']
            ] },

          { t: 'p', x:
            'Bản <code>nodebug</code> nhỏ hơn <b>1 376</b> byte, và không còn chứa chuỗi ' +
            '<code>ioctl   cmd</code>: cả sáu lời gọi <code>pr_debug</code> đã bị trình biên dịch loại bỏ. ' +
            'Hai file mang cùng tên module <code>ramdisk</code> (Bài 52: tên lấy từ tên file ' +
            '<code>.c</code>), nên trong QEMU bạn chỉ nạp được một bản mỗi lúc.' },

          { t: 'p', x:
            'Biên dịch chéo hai chương trình, tĩnh như <code>rdtest</code> của Bài 52, vì initramfs của ' +
            'Bài 32 không có thư viện C:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53/app\n' +
            'aarch64-linux-gnu-gcc -O2 -Wall -static -I ../ramdisk -o rdctl rdctl.c\n' +
            'aarch64-linux-gnu-gcc -O2 -Wall -static -I ../ramdisk -o rdbench rdbench.c\n' +
            'ls -l rdctl rdbench' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rwxr-xr-x 1 cah8hc cah8hc 607968 Sep 29 21:23 rdbench\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 604248 Sep 29 21:23 rdctl' },

          { t: 'p', x:
            'Không cảnh báo nào. Hai file xấp xỉ <code>rdtest</code> 603 952 B của Bài 52: gần như toàn ' +
            'bộ kích thước là glibc tĩnh, mã của bạn chỉ chiếm vài kilobyte. Cả hai dùng chung ' +
            '<code>ramdisk_ioctl.h</code> với driver qua <code>-I ../ramdisk</code>, nên không thể lệch ' +
            'số hiệu.' },

          { t: 'p', x:
            'Đóng gói initramfs theo cách của Bài 52, thêm thư mục <code>nodebug/</code> chứa bản thứ hai:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp ramdisk/ramdisk.ko app/rdctl app/rdbench initramfs/\n' +
            'mkdir initramfs/nodebug\n' +
            'cp nodebug/ramdisk.ko initramfs/nodebug/\n' +
            'ls initramfs\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin\n' +
            'dev\n' +
            'init\n' +
            'nodebug\n' +
            'proc\n' +
            'ramdisk.ko\n' +
            'rdbench\n' +
            'rdctl\n' +
            'sys\n' +
            '6809 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1648998 Sep 29 21:23 initramfs.cpio.gz' },

          { t: 'p', x:
            'Năm mục của Bài 32 cộng bốn mục mới. <code>6809 blocks</code> lớn hơn <b>5308</b> của Bài 52 ' +
            'chủ yếu vì có hai chương trình tĩnh thay vì một. Kích thước <code>.gz</code> sẽ lệch vài byte ' +
            'trên máy bạn (chính máy viết bài đo được 1 648 998 và 1 649 000 ở hai lần đóng gói), vì cpio ' +
            'ghi cả số inode và giờ sửa file.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Kênh 1: gọi ioctl, nhận từng mã lỗi',
        blocks: [
          { t: 'p', x: 'Boot bằng đúng dòng lệnh của Bài 50–52:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai53\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Ở dấu nhắc <code>~ #</code>, gắn devtmpfs như Bài 52, nạp driver, rồi in lại bốn số hiệu, ' +
            'lần này bằng bản ARM64 của <code>rdctl</code>:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /ramdisk.ko\n' +
            '/rdctl codes' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # mount -t devtmpfs none /dev\n' +
            '~ # insmod /ramdisk.ko\n' +
            '[    6.354800] ramdisk: loading out-of-tree module taints kernel.\n' +
            '[    6.376047] ramdisk: major 510, 2 devices of 4096 bytes\n' +
            '~ # /rdctl codes\n' +
            'RD_IOC_GET_INFO    = 0x80087801\n' +
            'RD_IOC_CLEAR       = 0x00007802\n' +
            'RD_IOC_SET_LEN     = 0x40047803\n' +
            'RD_IOC_GET_INFO_V0 = 0x80047801',
            notes: ['Số trong ngoặc vuông là thời điểm tính từ lúc boot, sẽ khác trên máy bạn và khác ở mỗi lần chạy.'] },

          { t: 'p', x:
            'Vẫn <b>major 510</b>, như mọi lần boot ở Bài 52. Bốn số hiệu trùng khít từng chữ số với bản ' +
            'WSL ở bước 1: chúng được tính lúc biên dịch từ cùng một header, không phụ thuộc máy chạy. ' +
            'Giờ dùng thử ba lệnh trên đường đi bình thường:' },

          { t: 'code', where: 'qemu', code:
            'echo hello > /dev/ramdisk0\n' +
            '/rdctl /dev/ramdisk0 info\n' +
            '/rdctl /dev/ramdisk0 setlen 3\n' +
            'cat /dev/ramdisk0; echo\n' +
            '/rdctl /dev/ramdisk0 clear\n' +
            '/rdctl /dev/ramdisk0 info' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo hello > /dev/ramdisk0\n' +
            '~ # /rdctl /dev/ramdisk0 info\n' +
            'info: ioctl -> 0\n' +
            '    size 4096  used 6\n' +
            '~ # /rdctl /dev/ramdisk0 setlen 3\n' +
            'setlen: ioctl -> 0\n' +
            '~ # cat /dev/ramdisk0; echo\n' +
            'hel\n' +
            '~ # /rdctl /dev/ramdisk0 clear\n' +
            'clear: ioctl -> 0\n' +
            '~ # /rdctl /dev/ramdisk0 info\n' +
            'info: ioctl -> 0\n' +
            '    size 4096  used 0' },

          { t: 'p', x:
            '<code>ioctl -&gt; 0</code> là thành công, đúng khuyến nghị của ' +
            '<code>Documentation/driver-api/ioctl.rst</code>: trả 0, dữ liệu đi qua cấu trúc. ' +
            '<code>used 6</code> là năm chữ <code>hello</code> cộng ký tự xuống dòng của ' +
            '<code>echo</code>. <code>setlen 3</code> gửi số 3 vào kernel (<code>_IOW</code>), và ' +
            '<code>cat</code> chỉ còn thấy <code>hel</code>, dù hai byte <code>lo</code> vẫn nằm trong bộ ' +
            'đệm. <code>clear</code> không mang dữ liệu nào (<code>_IO</code>), và <code>info</code> lần ' +
            'hai xác nhận <code>used 0</code>. Bạn vừa làm hai việc mà Bài 52 không có cách nào làm ngoài ' +
            '<code>cat</code> rồi đếm, hoặc mượn <code>O_TRUNC</code>.' },

          { t: 'p', x:
            'Giờ là phần đáng giá hơn: gọi sai theo năm cách, và một lần hỏi nhầm thiết bị.' },

          { t: 'code', where: 'qemu', code:
            '/rdctl /dev/ramdisk0 setlen 5000\n' +
            '/rdctl /dev/ramdisk0 badptr\n' +
            '/rdctl /dev/ramdisk0 roclear\n' +
            '/rdctl /dev/ramdisk0 v0\n' +
            '/rdctl /dev/console info\n' +
            'stty -F /dev/ramdisk0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # /rdctl /dev/ramdisk0 setlen 5000\n' +
            'setlen: ioctl -> -1  errno 22 (Invalid argument)\n' +
            '~ # /rdctl /dev/ramdisk0 badptr\n' +
            'badptr: ioctl -> -1  errno 14 (Bad address)\n' +
            '~ # /rdctl /dev/ramdisk0 roclear\n' +
            'roclear: ioctl -> -1  errno 9 (Bad file descriptor)\n' +
            '~ # /rdctl /dev/ramdisk0 v0\n' +
            'v0: ioctl -> -1  errno 25 (Inappropriate ioctl for device)\n' +
            '~ # /rdctl /dev/console info\n' +
            'info: ioctl -> -1  errno 25 (Inappropriate ioctl for device)\n' +
            '~ # stty -F /dev/ramdisk0\n' +
            'stty: /dev/ramdisk0: Inappropriate ioctl for device' },

          { t: 'table',
            head: ['Lệnh', '<code>errno</code>', 'Dòng nào trong <code>rd_ioctl</code> trả nó'],
            rows: [
              ['<code>setlen 5000</code>', '22 <code>EINVAL</code>', '<code>len &gt; RD_SIZE</code>. Tham số đến được kernel an toàn, nhưng giá trị vô lý: bộ đệm chỉ có 4 096 byte.'],
              ['<code>badptr</code>', '14 <code>EFAULT</code>', '<code>copy_to_user(NULL, …)</code> thất bại. Kernel không sập, đúng như Bài 51 và 52 đã cho thấy với <code>copy_from_user</code>.'],
              ['<code>roclear</code>', '9 <code>EBADF</code>', '<code>rd_may_change</code>: fd mở bằng <code>O_RDONLY</code> nên không có <code>FMODE_WRITE</code>. Kernel không tự chặn, driver phải tự chặn.'],
              ['<code>v0</code>', '25 <code>ENOTTY</code>', 'Chữ cái đúng nên qua được bộ lọc đầu, nhưng <code>0x80047801</code> không khớp nhánh <code>case</code> nào, rơi vào <code>default</code>.'],
              ['<code>/dev/console info</code>', '25 <code>ENOTTY</code>', 'Không phải driver của bạn. Driver console không biết lệnh <code>x</code> nào và trả <code>ENOTTY</code>. <code>rd_ioctl</code> không hề được gọi.'],
              ['<code>stty -F /dev/ramdisk0</code>', '25 <code>ENOTTY</code>', 'Ngược lại: <code>stty</code> gửi một lệnh terminal tới driver của bạn. Chữ cái <code>T</code> khác <code>x</code>, bộ lọc đầu trả <code>-ENOTTY</code>.']
            ] },

          { t: 'p', x:
            'Hai dòng cuối là cùng một mã lỗi đi theo hai chiều ngược nhau, và đó chính là điều hệ ' +
            'thống số hiệu được thiết kế để bảo đảm: gửi nhầm thiết bị thì <b>bị từ chối</b>, không bị ' +
            'thực thi. <code>pr_debug</code> ở đầu <code>rd_ioctl</code> đã ghi lại từng lệnh đến được ' +
            'driver, đã giải mã sẵn:' },

          { t: 'code', where: 'qemu', code: 'dmesg | grep ioctl' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    8.448314] ramdisk: ioctl   cmd 0x80087801 dir 2 type \'x\' nr 1 size 8\n' +
            '[    9.149688] ramdisk: ioctl   cmd 0x40047803 dir 1 type \'x\' nr 3 size 4\n' +
            '[   10.558663] ramdisk: ioctl   cmd 0x00007802 dir 0 type \'x\' nr 2 size 0\n' +
            '[   11.260168] ramdisk: ioctl   cmd 0x80087801 dir 2 type \'x\' nr 1 size 8\n' +
            '[   11.965461] ramdisk: ioctl   cmd 0x40047803 dir 1 type \'x\' nr 3 size 4\n' +
            '[   12.667646] ramdisk: ioctl   cmd 0x80087801 dir 2 type \'x\' nr 1 size 8\n' +
            '[   13.368411] ramdisk: ioctl   cmd 0x00007802 dir 0 type \'x\' nr 2 size 0\n' +
            '[   14.061362] ramdisk: ioctl   cmd 0x80047801 dir 2 type \'x\' nr 1 size 4\n' +
            '[   15.475441] ramdisk: ioctl   cmd 0x802c542a dir 2 type \'T\' nr 42 size 44' },

          { t: 'p', x:
            'Chín dòng: bốn lệnh thành công, bốn lệnh lỗi đến từ <code>rdctl</code>, một từ ' +
            '<code>stty</code>. Lệnh gửi tới <code>/dev/console</code> không có ở đây vì nó không bao giờ ' +
            'tới driver của bạn. Dòng thứ tám (<code>v0</code>) cho thấy chính xác vì sao bản cũ bị từ ' +
            'chối: cùng <code>nr 1</code>, nhưng <code>size 4</code> thay vì <code>size 8</code>. Dòng cuối ' +
            'là <code>TCGETS2</code>, định nghĩa ở <code>include/uapi/asm-generic/ioctls.h:61</code> là ' +
            '<code>_IOR(\'T\', 0x2A, struct termios2)</code>, 44 byte. Đó là câu hỏi "bạn có phải terminal ' +
            'không?" mà <code>stty</code> và hàm <code>isatty()</code> gửi đi. Câu trả lời ' +
            '<code>ENOTTY</code> nghĩa đen là "không phải terminal", và đó là lý do cái tên của mã lỗi nghe ' +
            'lạ như vậy.' },

          { t: 'cal', kind: 'danger', title: 'Bỏ hai dòng kiểm tra FMODE_WRITE thì sao?',
            x: 'Trên máy viết bài, một bản driver bỏ đúng hai dòng <code>if (!(filp-&gt;f_mode &amp; ' +
               'FMODE_WRITE)) return -EBADF;</code> khỏi <code>rd_may_change</code> cho kết quả: ' +
               '<code>roclear: ioctl -&gt; 0</code>, rồi <code>info</code> báo <code>used 0</code>. Một fd ' +
               'chỉ được phép đọc vừa xoá sạch dữ liệu. Bạn có thể tự thử bằng cách sửa bản trong ' +
               '<code>nodebug/</code>. Trên thiết bị thật, đó là lỗ hổng cho phép một tiến trình chỉ có ' +
               'quyền đọc <code>/dev/…</code> (nhóm <code>r--</code>) thay đổi cấu hình phần cứng.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Kênh 2: sysfs điều khiển được cả ba kênh kia',
        blocks: [
          { t: 'p', x:
            'Vẫn trong phiên QEMU đó. Xem thư mục thiết bị, rồi đứng hẳn vào đó cho các lệnh sau ngắn ' +
            'gọn:' },

          { t: 'code', where: 'qemu', code:
            'ls /sys/class/ramdisk/ramdisk0\n' +
            'cd /sys/class/ramdisk/ramdisk0\n' +
            'ls -l used readonly' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/class/ramdisk/ramdisk0\n' +
            'dev        power      readonly   subsystem  uevent     used\n' +
            '~ # cd /sys/class/ramdisk/ramdisk0\n' +
            '/sys/class/ramdisk/ramdisk0 # ls -l used readonly\n' +
            '-rw-r--r--    1 0        0             4096 Sep 29 14:23 readonly\n' +
            '-r--r--r--    1 0        0             4096 Sep 29 14:23 used',
            notes: ['Giờ trong <code>ls -l</code> là giờ UTC của máy ảo lúc chạy, sẽ khác trên máy bạn.'] },

          { t: 'p', x:
            'Bốn mục của Bài 52 (<code>dev</code>, <code>power</code>, <code>subsystem</code>, ' +
            '<code>uevent</code>) cộng hai file của bạn. Quyền khớp đúng hai macro: <code>used</code> là ' +
            '<code>r--r--r--</code> = <code>0444</code> (<code>_RO</code>), <code>readonly</code> là ' +
            '<code>rw-r--r--</code> = <code>0644</code> (<code>_RW</code>). Kích thước <b>4096</b> không phải ' +
            'nội dung thật: sysfs báo kích thước một trang cho mọi thuộc tính, vì đó là bộ đệm tối đa mà ' +
            '<code>show</code> được phép điền.' },

          { t: 'p', x:
            'Ghi một ít dữ liệu, đọc hai thuộc tính, rồi bật chế độ chỉ đọc và thử phá nó bằng ba đường ' +
            'khác nhau:' },

          { t: 'code', where: 'qemu', code:
            'echo abc > /dev/ramdisk0\n' +
            'cat used readonly\n' +
            'echo 1 > readonly\n' +
            'echo xyz > /dev/ramdisk0\n' +
            '/rdctl /dev/ramdisk0 clear\n' +
            'cat /dev/ramdisk0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/class/ramdisk/ramdisk0 # echo abc > /dev/ramdisk0\n' +
            '/sys/class/ramdisk/ramdisk0 # cat used readonly\n' +
            '4\n' +
            '0\n' +
            '/sys/class/ramdisk/ramdisk0 # echo 1 > readonly\n' +
            '/sys/class/ramdisk/ramdisk0 # echo xyz > /dev/ramdisk0\n' +
            '/bin/sh: can\'t create /dev/ramdisk0: Operation not permitted\n' +
            '/sys/class/ramdisk/ramdisk0 # /rdctl /dev/ramdisk0 clear\n' +
            '/dev/ramdisk0: Operation not permitted\n' +
            '/sys/class/ramdisk/ramdisk0 # cat /dev/ramdisk0\n' +
            'abc' },

          { t: 'p', x:
            '<code>used</code> = <b>4</b>: <code>abc</code> cộng ký tự xuống dòng, và <code>&gt;</code> đã ' +
            'xoá nội dung cũ qua <code>O_TRUNC</code> như Bài 52. Một chữ <code>1</code> ghi vào ' +
            '<code>readonly</code> đã khoá luôn hai kênh khác. Cả <code>echo</code> lẫn <code>rdctl</code> ' +
            'đều bị chặn ngay ở <code>open</code> (thông báo là <code>can\'t create</code> và ' +
            '<code>/dev/ramdisk0:</code>, không phải <code>ioctl -&gt;</code>), vì <code>rd_open</code> trả ' +
            '<code>-EPERM</code> cho mọi lần mở để ghi. <code>cat</code> mở để đọc nên vẫn chạy, và ' +
            '<code>abc</code> còn nguyên. Đây đúng là vai trò của sysfs: một công tắc cấu hình mà ' +
            'script khởi động bật được bằng <code>echo</code>, không cần chương trình C nào.' },

          { t: 'p', x:
            'Giờ ghi sai vào sysfs theo hai cách, rồi trả công tắc về như cũ:' },

          { t: 'code', where: 'qemu', code:
            'echo maybe > readonly\n' +
            'echo 5 > used\n' +
            'echo off > readonly\n' +
            'cat readonly\n' +
            'cd /' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/class/ramdisk/ramdisk0 # echo maybe > readonly\n' +
            'sh: write error: Invalid argument\n' +
            '/sys/class/ramdisk/ramdisk0 # echo 5 > used\n' +
            '/bin/sh: can\'t create used: Permission denied\n' +
            '/sys/class/ramdisk/ramdisk0 # echo off > readonly\n' +
            '/sys/class/ramdisk/ramdisk0 # cat readonly\n' +
            '0\n' +
            '/sys/class/ramdisk/ramdisk0 # cd /' },

          { t: 'table',
            head: ['Lệnh', 'Thông báo', 'Chặn ở đâu'],
            rows: [
              ['<code>echo maybe &gt; readonly</code>', '<code>write error: Invalid argument</code>', '<code>open</code> thành công, <code>write</code> tới được <code>readonly_store</code>. <code>kstrtobool("maybe\\n")</code> trả <code>-EINVAL</code>, <code>store</code> trả lại đúng mã đó. Chữ <code>write error</code> cho biết lỗi xảy ra ở bước ghi.'],
              ['<code>echo 5 &gt; used</code>', '<code>can\'t create used: Permission denied</code>', 'Ngay ở <code>open</code>, bạn đang là root. sysfs kiểm tra thêm: file không có bit ghi nào, hoặc thuộc tính không có <code>store</code>, thì trả <code>-EACCES</code> (<code>fs/kernfs/file.c:631</code>). Hàm <code>used_show</code> không hề được gọi.'],
              ['<code>echo off &gt; readonly</code>', '(không có gì)', '<code>kstrtobool</code> hiểu <code>off</code> là <code>false</code>. Đọc lại ra <code>0</code>: <code>show</code> in số, không in lại chữ bạn đã gõ.']
            ] },

          { t: 'cal', kind: 'warn', title: 'Root không phải lúc nào cũng ghi được',
            x: 'Bài 8 đã dạy rằng root bỏ qua bit quyền của file thường. sysfs là ngoại lệ có chủ ý: kernel ' +
               'tạo nó với cờ <code>KERNFS_ROOT_EXTRA_OPEN_PERM_CHECK</code> (<code>fs/sysfs/mount.c:101</code>), ' +
               'nên quyền của một thuộc tính là lời hứa của driver, không phải gợi ý. Và bạn cũng không ' +
               'thể hứa ẩu: trên máy viết bài, đổi <code>DEVICE_ATTR_RW(readonly)</code> thành ' +
               '<code>DEVICE_ATTR(readonly, 0666, …)</code> làm build dừng với ' +
               '<code>error: static assertion failed: "(0666) &amp; 2 is true"</code>. Macro ' +
               '<code>VERIFY_OCTAL_PERMISSIONS</code> (<code>include/linux/kernel.h:209</code>) cấm mọi ' +
               'thuộc tính sysfs cho người lạ ghi.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — Kênh 3 và 4, rồi đo xem kênh nào nhanh hơn',
        blocks: [
          { t: 'p', x:
            'Bảng procfs tổng hợp mọi thứ đã xảy ra từ đầu phiên. Đọc nó, rồi thử ghi vào nó:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/ramdisk\n' +
            'echo 3 > /proc/ramdisk' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/ramdisk\n' +
            'minor  used  readonly  reads  writes  ioctls\n' +
            '    0     4         0      4       2       8\n' +
            '    1     0         0      0       0       0\n' +
            '~ # echo 3 > /proc/ramdisk\n' +
            'sh: write error: Input/output error' },

          { t: 'p', x:
            'Hãy đối chiếu từng số với những gì bạn đã gõ. <b>writes 2</b>: <code>echo hello</code> ở bước 4 ' +
            'và <code>echo abc</code> ở bước 5 (hai lần ghi bị chặn đã dừng ở <code>open</code>, chưa tới ' +
            '<code>rd_write</code>). <b>reads 4</b>: hai lần <code>cat</code>, mỗi lần gọi <code>read</code> ' +
            'hai lượt như Bài 52 đã đếm (một lượt lấy dữ liệu, một lượt nhận 0). <b>ioctls 8</b>: đúng tám ' +
            'lệnh <code>x</code> trong <code>dmesg</code> ở bước 4. Lệnh <code>TCGETS2</code> của ' +
            '<code>stty</code> bị lọc trước khi tăng bộ đếm, và lần <code>rdctl clear</code> ở bước 5 không ' +
            'bao giờ tới <code>ioctl</code>. <code>ramdisk1</code> toàn số 0 vì bạn chưa đụng tới nó.' },

          { t: 'p', x:
            'Lần ghi trả <code>Input/output error</code> (<code>EIO</code>), khác với <code>EACCES</code> ' +
            'của sysfs: file <code>0444</code> nhưng root vẫn mở được để ghi, vì procfs không kiểm tra ' +
            'thêm như sysfs. Lệnh <code>write</code> tới <code>pde_write()</code>, thấy ' +
            '<code>proc_create_single</code> không có hàm ghi, và trả <code>-EIO</code> ' +
            '(<code>fs/proc/inode.c:331</code>). Cùng một ý "không ghi được", hai hệ thống file báo bằng ' +
            'hai mã khác nhau.' },

          { t: 'p', x:
            'Sang debugfs. Nhìn trước khi gắn, gắn, rồi đi vào cây của driver:' },

          { t: 'code', where: 'qemu', code:
            'ls /sys/kernel/debug\n' +
            'mount -t debugfs none /sys/kernel/debug\n' +
            'cd /sys/kernel/debug/ramdisk\n' +
            'ls . ramdisk0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/kernel/debug\n' +
            '~ # mount -t debugfs none /sys/kernel/debug\n' +
            '~ # cd /sys/kernel/debug/ramdisk\n' +
            '/sys/kernel/debug/ramdisk # ls . ramdisk0\n' +
            '.:\n' +
            'ramdisk0  ramdisk1\n' +
            'ramdisk0:\n' +
            'data    ioctls  reads   writes' },

          { t: 'p', x:
            '<code>ls</code> đầu tiên không in gì: thư mục có sẵn nhưng rỗng, vì chưa có gì được gắn ' +
            'vào đó. Driver đã tạo cây debugfs từ lúc <code>insmod</code>; <code>mount</code> chỉ làm nó ' +
            'hiện ra. Hai thư mục con, mỗi thư mục bốn file, đúng như vòng lặp trong ' +
            '<code>rd_debugfs_init</code>.' },

          { t: 'code', where: 'qemu', code:
            'cd ramdisk0\n' +
            'ls -l\n' +
            'grep . reads writes ioctls\n' +
            'od -c data | head -n 3\n' +
            'echo 99 > reads\n' +
            'cd /' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/kernel/debug/ramdisk # cd ramdisk0\n' +
            '/sys/kernel/debug/ramdisk/ramdisk0 # ls -l\n' +
            'total 0\n' +
            '-r--------    1 0        0                0 Sep 29 14:23 data\n' +
            '-r--r--r--    1 0        0                0 Sep 29 14:23 ioctls\n' +
            '-r--r--r--    1 0        0                0 Sep 29 14:23 reads\n' +
            '-r--r--r--    1 0        0                0 Sep 29 14:23 writes\n' +
            '/sys/kernel/debug/ramdisk/ramdisk0 # grep . reads writes ioctls\n' +
            'reads:4\n' +
            'writes:2\n' +
            'ioctls:8\n' +
            '/sys/kernel/debug/ramdisk/ramdisk0 # od -c data | head -n 3\n' +
            '0000000   a   b   c  \\n   o  \\n  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0\n' +
            '0000020  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0\n' +
            '*\n' +
            '/sys/kernel/debug/ramdisk/ramdisk0 # echo 99 > reads\n' +
            'sh: write error: Permission denied\n' +
            '/sys/kernel/debug/ramdisk/ramdisk0 # cd /' },

          { t: 'cmdx', cmd: 'grep . reads writes ioctls',
            title: 'In nhiều file nhỏ, mỗi dòng kèm tên',
            rows: [
              ['<code>grep .</code>', 'Khớp mọi dòng có ít nhất một ký tự.', 'Mẹo quen thuộc khi đọc sysfs/debugfs: nhiều file một dòng, <code>grep</code> tự thêm tiền tố <code>tên:</code> khi có hơn một file. <code>cat</code> chỉ in số, bạn phải tự nhớ thứ tự.'],
              ['<code>od -c data</code>', 'In từng byte, ký tự in được thì in chữ, còn lại in mã thoát.', 'Bài 52 đã dùng để thấy byte <code>\\0</code>. <code>*</code> nghĩa là các dòng tiếp theo giống hệt dòng trên.']
            ] },

          { t: 'p', x:
            'Ba bộ đếm trùng khít bảng procfs: hai kênh cùng đọc một biến. Nhưng file <code>data</code> ' +
            'cho thấy thứ không kênh nào khác thấy được: <b>byte thật</b> trong bộ đệm, không chỉ phần ' +
            'hợp lệ. Bốn byte đầu <code>a b c \\n</code> là nội dung hiện tại (<code>used 4</code>). Hai byte ' +
            'tiếp theo, <code>o \\n</code>, là <b>phần còn sót lại của <code>hello\\n</code></b> từ bước 4: ' +
            '<code>clear</code> chỉ đặt <code>len = 0</code>, và <code>echo abc</code> chỉ đè bốn byte đầu. ' +
            '<code>cat /dev/ramdisk0</code> không bao giờ lộ ra hai byte đó vì <code>rd_read</code> dừng ' +
            'ở <code>len</code>. Đây chính là loại sự thật mà debugfs tồn tại để cho bạn thấy, và cũng là ' +
            'lý do nó chỉ dành cho root: <code>data</code> được tạo với quyền <code>0400</code>.' },

          { t: 'p', x:
            '<code>echo 99 &gt; reads</code> bị từ chối với <code>Permission denied</code> (<code>EACCES</code>). ' +
            'Lần này không phải do kiểm tra ở <code>open</code> như sysfs: <code>debugfs_create_u32</code> ' +
            'thấy <code>mode</code> <code>0444</code> không có bit ghi nào, nên chọn bộ ' +
            '<code>fops_u32_ro</code> không có hàm <code>set</code>, và lần ghi trả <code>-EACCES</code> từ ' +
            '<code>fs/libfs.c:1380</code>. Ba hệ thống file, ba đường khác nhau tới cùng một câu trả lời "không".' },

          { t: 'p', x:
            'Cuối cùng là phép đo. Chạy <code>rdbench</code> với bản driver đang nạp, tức bản có ' +
            '<code>-DDEBUG</code>:' },

          { t: 'code', where: 'qemu', code: '/rdbench 10000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # /rdbench 10000\n' +
            '10000 queries, used = 4\n' +
            'ioctl                 : 1.214 s  121.4 us per query\n' +
            'sysfs open+read+close : 0.748 s   74.8 us per query\n' +
            'sysfs / ioctl         : 0.6x',
            notes: ['Với bản có <code>-DDEBUG</code>, máy viết bài đo được <code>ioctl</code> 52–121 µs và sysfs 55–75 µs qua năm lần chạy, tỉ số 0,6–1,3. Số của bạn sẽ khác, nhưng hai kênh sẽ ngang ngửa nhau.'] },

          { t: 'p', x:
            'Theo kết quả này, <code>ioctl</code> <b>chậm hơn</b> sysfs: 121 µs so với 75 µs. Điều đó trái ' +
            'với mọi thứ phần lý thuyết vừa nói, vì một lần <code>ioctl</code> chỉ là một syscall, còn một ' +
            'lần đọc sysfs là ba. Đừng tin con số khi nó trái với cơ chế. Hãy tìm xem nó thực sự đo cái gì. ' +
            'Dòng đầu tiên của <code>rd_ioctl</code> là một <code>pr_debug</code>, và bản đang nạp được build ' +
            'với <code>-DDEBUG</code>. Màn hình không hiện dòng nào, vì mức <code>KERN_DEBUG</code> là 7, ' +
            'không nhỏ hơn <code>console_loglevel</code> 7 (Bài 51). Nhưng mỗi lệnh vẫn phải định dạng ' +
            'chuỗi, lấy dấu thời gian và ghi một bản ghi vào bộ đệm log của kernel. <code>used_show</code> ' +
            'không có <code>pr_debug</code> nào. Bảng procfs xác nhận số lần gọi:' },

          { t: 'code', where: 'qemu', code: 'cat /proc/ramdisk' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/ramdisk\n' +
            'minor  used  readonly  reads  writes  ioctls\n' +
            '    0     4         0      4       2   10008' },

          { t: 'p', x:
            'Tám lệnh của bước 4 cộng đúng <b>10 000</b>: mười nghìn bản ghi log trong khoảng một giây. Bộ ' +
            'đệm log của kernel này chỉ có 128 KiB (<code>CONFIG_LOG_BUF_SHIFT=17</code>), nên nó quay vòng. ' +
            'Ở một lần đo riêng, <code>dmesg | wc -l</code> tăng từ 254 lên <b>1 702</b>, không phải 10 254: ' +
            'các dòng log lúc boot đã bị đè mất. Log trong đường đi nóng vừa tốn thời gian, vừa đẩy mất ' +
            'thông tin khác. Giờ thay bằng bản <code>nodebug</code> đã build ở bước 3, đo lại hai lần:' },

          { t: 'code', where: 'qemu', code:
            'rmmod ramdisk\n' +
            'insmod /nodebug/ramdisk.ko\n' +
            '/rdbench 10000\n' +
            '/rdbench 10000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod ramdisk\n' +
            '[   40.864980] ramdisk: unloaded\n' +
            '~ # insmod /nodebug/ramdisk.ko\n' +
            '[   41.564435] ramdisk: major 510, 2 devices of 4096 bytes\n' +
            '~ # /rdbench 10000\n' +
            '10000 queries, used = 0\n' +
            'ioctl                 : 0.027 s    2.7 us per query\n' +
            'sysfs open+read+close : 0.622 s   62.2 us per query\n' +
            'sysfs / ioctl         : 23.1x\n' +
            '~ # /rdbench 10000\n' +
            '10000 queries, used = 0\n' +
            'ioctl                 : 0.024 s    2.4 us per query\n' +
            'sysfs open+read+close : 0.706 s   70.6 us per query\n' +
            'sysfs / ioctl         : 29.0x',
            notes: ['Thời gian phụ thuộc máy chủ và tải lúc chạy. Trên máy viết bài, qua năm lần đo với bản <code>nodebug</code>, <code>ioctl</code> nằm trong 2,4–3,5 µs, sysfs trong 58–71 µs, tỉ số 17–29 lần. Số của bạn sẽ khác, nhưng khoảng cách hơn mười lần sẽ còn đó.'] },

          { t: 'p', x:
            'Bỏ một dòng <code>pr_debug</code>, <code>ioctl</code> rơi từ 121 µs xuống 2,4–2,7 µs, và giờ ' +
            'nhanh hơn sysfs <b>23–29 lần</b>. (Qua năm lần đo bản <code>-DDEBUG</code>, ' +
            '<code>ioctl</code> dao động 52–121 µs, nên cái giá của dòng log là khoảng <b>20–50 lần</b> ' +
            'công việc thật.) <code>used = 0</code> vì module vừa ' +
            'nạp lại với bộ đệm mới. sysfs gần như không đổi (62–75 µs), vì nó chưa bao giờ in gì. Bài học ' +
            'lớn hơn cả con số: <b>một dòng log trong đường đi nóng có thể lớn gấp mấy chục lần công việc ' +
            'thật</b>. Bài 65 sẽ đo cái giá đó bằng ftrace.' },

          { t: 'p', x: 'Gỡ driver và kiểm tra ba cây đã biến mất cùng lúc:' },

          { t: 'code', where: 'qemu', code:
            'rmmod ramdisk\n' +
            'ls /proc/ramdisk /sys/kernel/debug/ramdisk /sys/class/ramdisk\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod ramdisk\n' +
            '[   52.273332] ramdisk: unloaded\n' +
            '~ # ls /proc/ramdisk /sys/kernel/debug/ramdisk /sys/class/ramdisk\n' +
            'ls: /proc/ramdisk: No such file or directory\n' +
            'ls: /sys/kernel/debug/ramdisk: No such file or directory\n' +
            'ls: /sys/class/ramdisk: No such file or directory\n' +
            '~ # poweroff -f\n' +
            '[   53.678095] Flash device refused suspend due to active operation (state 20)\n' +
            '[   53.679357] Flash device refused suspend due to active operation (state 20)\n' +
            '[   53.683601] reboot: Power down' },

          { t: 'p', x:
            'Ba dòng <code>No such file or directory</code>: <code>remove_proc_entry</code>, ' +
            '<code>debugfs_remove</code> và <code>class_destroy</code> trong <code>rd_exit</code> đã dọn ' +
            'sạch cả ba cây. Driver quên một trong ba lời gọi đó thì lần <code>insmod</code> tiếp theo sẽ ' +
            'thất bại vì tên đã tồn tại. Hai dòng <code>Flash device refused suspend</code> là của flash ' +
            'NOR trên máy <code>virt</code>, đã gặp từ Bài 51, không liên quan tới driver của bạn.' },

          { t: 'cal', kind: 'tip', title: 'Giữ lại ~/bai53',
            x: '<code>~/bai53</code> nặng khoảng <b>7,3 MB</b>. Bài 54 sẽ biến chính driver này thành một ' +
               'platform driver gắn với nút <code>learn,temp-sensor</code> mà Bài 45 để lại trong Device ' +
               'Tree. <code>~/bai52</code> giờ có thể xoá nếu bạn muốn; bản sao đầy đủ của nó nằm trong ' +
               'lịch sử các bước trên.' }
        ] }
    ] },

    /* ============================================================
       7. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>ioctl -&gt; -1  errno 25 (Inappropriate ioctl for device)</code> dù driver có xử lý lệnh đó',
         'Số hiệu phía chương trình khác số hiệu phía driver. Thường gặp nhất: chương trình build với bản header cũ, khi cấu trúc tham số còn khác kích thước (<code>v0</code> ở bước 4), hoặc gọi nhầm fd của thiết bị khác.',
         'In số hiệu ở cả hai phía (<code>printf("0x%08lx")</code> và <code>pr_debug</code> với <code>_IOC_SIZE</code>) rồi so. Luôn build cả hai từ <b>một</b> header dùng chung.'],
        ['<code>errno 14 (Bad address)</code> từ <code>ioctl</code>',
         'Tham số thứ ba không phải con trỏ hợp lệ trong không gian người dùng: <code>NULL</code>, quên dấu <code>&amp;</code>, hoặc truyền giá trị thay vì địa chỉ.',
         'Với <code>_IOR</code>/<code>_IOW</code>, luôn truyền <code>&amp;biến</code>. Driver phải kiểm tra giá trị trả về của <code>copy_to_user</code>/<code>copy_from_user</code> và trả <code>-EFAULT</code>.'],
        ['<code>errno 9 (Bad file descriptor)</code> từ một lệnh <code>ioctl</code> làm thay đổi dữ liệu',
         'fd được mở bằng <code>O_RDONLY</code>, và driver từ chối đúng như nó nên làm.',
         'Mở bằng <code>O_RDWR</code>. Nếu bạn là người viết driver và lệnh <b>không</b> bị chặn, hãy thêm kiểm tra <code>filp-&gt;f_mode &amp; FMODE_WRITE</code>.'],
        ['<code>fatal error: ramdisk_ioctl.h: No such file or directory</code> khi build chương trình',
         'Header nằm trong thư mục driver, trình biên dịch không tự tìm ở đó.',
         'Thêm <code>-I ../ramdisk</code> (hoặc đường dẫn đúng tới thư mục chứa header).'],
        ['<code>can\'t create …/used: Permission denied</code>, dù đang là root',
         'Thuộc tính sysfs chỉ đọc (<code>DEVICE_ATTR_RO</code>, không có <code>store</code>). sysfs chặn ngay ở <code>open</code>.',
         'Đúng như thiết kế. Nếu thật sự cần ghi, dùng <code>DEVICE_ATTR_RW</code> và viết hàm <code>_store</code>.'],
        ['<code>sh: write error: Invalid argument</code> khi <code>echo</code> vào sysfs',
         'Hàm <code>store</code> không hiểu chuỗi đó và trả <code>-EINVAL</code>. Với <code>kstrtobool</code>, chỉ <code>1/0</code>, <code>y/n</code>, <code>on/off</code> hợp lệ.',
         'Đọc hàm <code>_store</code> của driver để biết định dạng nó chấp nhận, hoặc tài liệu trong <code>Documentation/ABI/</code>.'],
        ['<code>error: static assertion failed: "(0666) &amp; 2 is true"</code>',
         'Quyền của thuộc tính sysfs cho phép "người khác" ghi. <code>VERIFY_OCTAL_PERMISSIONS</code> cấm điều đó lúc biên dịch.',
         'Dùng <code>0644</code> (hoặc <code>DEVICE_ATTR_RW</code>). Nếu một nhóm cần ghi, dùng quy tắc udev đổi nhóm sở hữu, không mở quyền cho tất cả.'],
        ['<code>sh: write error: Input/output error</code> khi ghi vào <code>/proc/…</code>',
         'File procfs không có hàm ghi. <code>pde_write()</code> trả <code>-EIO</code>.',
         'File đó chỉ để đọc. Muốn nhận cấu hình, dùng sysfs hoặc <code>ioctl</code>.'],
        ['<code>ls /sys/kernel/debug</code> rỗng dù driver đã tạo file debugfs',
         'debugfs chưa được gắn. Initramfs của Bài 32 không gắn nó.',
         '<code>mount -t debugfs none /sys/kernel/debug</code>. Nếu vẫn rỗng, kiểm tra <code>CONFIG_DEBUG_FS=y</code> trong <code>.config</code>.'],
        ['<code>ioctl</code> đo được chậm bằng hoặc hơn sysfs',
         'Có <code>pr_debug</code> (hoặc <code>pr_info</code>) trong đường đi của <code>ioctl</code> và module được build với <code>-DDEBUG</code>. Phép đo đo cái giá của log, không phải của <code>ioctl</code>.',
         'Đo với bản không có <code>-DDEBUG</code>. Đếm số lần gọi (bộ đếm procfs/debugfs) để chắc mình đang đo đúng thứ.']
      ] },

    /* ============================================================
       8. RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<b>Bốn kênh, bốn người dùng</b>: <code>ioctl</code> cho chương trình C (lệnh, dữ liệu nhị phân), <b>sysfs</b> cho shell và udev (một giá trị mỗi file), <b>procfs</b> cho bảng tổng quan kiểu cũ, <b>debugfs</b> cho chính bạn khi gỡ lỗi (không luật lệ, không ABI).',
      'Số hiệu <code>ioctl</code> là 32 bit gồm <b>hướng · kích thước · chữ cái · số thứ tự</b>. <code>_IOR(\'x\', 1, struct rd_info)</code> = <b><code>0x80087801</code></b>. Đọc/ghi luôn tính từ phía chương trình.',
      'Kích thước nằm trong số hiệu, nên đổi cấu trúc là đổi số hiệu: bản <code>v0</code> gọi <code>0x80047801</code> và nhận <b><code>errno 25</code></b> thay vì làm hỏng bộ nhớ. Driver và chương trình phải dùng <b>một header chung</b> với kiểu <code>__u32</code>.',
      '<code>rd_ioctl</code> trả đúng mã cho từng lỗi: <b><code>EINVAL</code></b> (5000 &gt; 4096), <b><code>EFAULT</code></b> (<code>NULL</code>), <b><code>EBADF</code></b> (fd chỉ đọc), <b><code>ENOTTY</code></b> (lệnh lạ hoặc chữ cái lạ, như <code>TCGETS2</code> của <code>stty</code>).',
      '<b><code>ioctl</code> không tự kiểm tra chế độ mở</b>: bỏ hai dòng <code>FMODE_WRITE</code> thì một fd <code>O_RDONLY</code> xoá được dữ liệu.',
      'sysfs: <code>DEVICE_ATTR_RO</code> = <b><code>0444</code></b>, <code>_RW</code> = <b><code>0644</code></b>, <code>sysfs_emit</code>, <code>kstrtobool</code>. Root ghi vào file <code>0444</code> vẫn nhận <b><code>Permission denied</code></b>; <code>0666</code> không build được. <code>device_create_with_groups</code> tạo thuộc tính <b>trước</b> <code>uevent</code>.',
      'Cùng câu trả lời "không ghi được", ba mã khác nhau: sysfs <b><code>EACCES</code></b> ở <code>open</code>, procfs <b><code>EIO</code></b> ở <code>write</code>, debugfs <b><code>EACCES</code></b> ở <code>write</code>. debugfs <code>data</code> cho thấy hai byte <code>o\\n</code> còn sót mà <code>cat</code> không bao giờ lộ ra.',
      '<code>ioctl</code> 2,4–3,5 µs, sysfs 58–71 µs: nhanh hơn <b>17–29 lần</b>, nhưng chỉ sau khi bỏ <code>-DDEBUG</code>. Với một <code>pr_debug</code> trong đường đi, <code>ioctl</code> chậm tới <b>121 µs</b> và thua sysfs.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Driver của bạn giờ nói được bốn ngôn ngữ, nhưng nó vẫn tự bịa ra thiết bị của mình: ' +
         '<code>rd_init</code> tự quyết có hai ram-disk, mỗi cái 4 096 byte. Driver thật không làm vậy. ' +
         'Nó chờ kernel báo "phần cứng này tồn tại, ở địa chỉ này", rồi mới dựng thiết bị. ' +
         '<b>Bài 54 — Platform driver và Device Tree</b> nối driver với nút ' +
         '<code>learn,temp-sensor</code> tại <code>0xb000000</code> mà Bài 45 cố ý để lại chưa có chủ, đọc ' +
         'property của nó bằng <code>of_*</code>, và thay mọi <code>kfree</code>/<code>device_destroy</code> ' +
         'trong đường lỗi bằng <code>devm_*</code>. Bạn sẽ thấy <code>probe()</code> chạy cho nút ' +
         '<code>sensor@b000000</code> và không chạy lần nào cho nút anh em <code>disabled</code> ở ' +
         '<code>0xb001000</code>.' }
  ],

  quiz: [
    { q: 'Bạn nâng cấp driver, thêm một trường <code>__u32 flags</code> vào cuối <code>struct rd_info</code>, nhưng giữ nguyên <code>_IOR(\'x\', 1, struct rd_info)</code>. Một chương trình cũ chưa được build lại gọi lệnh đó. Chuyện gì xảy ra?',
      opts: [
        'Chương trình nhận đủ 12 byte, trường mới bị bỏ qua',
        'Chương trình nhận <code>errno 25</code>, vì số hiệu nó gửi mang kích thước 8 còn driver so với số hiệu mang kích thước 12',
        'Kernel ghi 12 byte vào bộ đệm 8 byte của chương trình cũ',
        'Driver tự nhận ra bản cũ và trả 8 byte'
      ],
      a: 1,
      why: 'Macro <code>_IOR</code> nhúng <code>sizeof(struct rd_info)</code> vào 14 bit kích thước. Build lại driver thì số hiệu đổi từ <code>0x80087801</code> sang <code>0x800c7801</code>, còn chương trình cũ vẫn gửi số hiệu đã biên dịch sẵn. <code>switch</code> của driver không có nhánh nào khớp, rơi vào <code>default</code> → <code>-ENOTTY</code>. Đó đúng là kết quả của <code>v0</code> ở bước 4. Hỏng rõ ràng như thế tốt hơn nhiều so với phương án 3, nơi bộ nhớ của chương trình bị ghi đè âm thầm. Cách đúng khi cần thêm trường: định nghĩa lệnh mới với số thứ tự mới và giữ lệnh cũ.' },

    { q: 'Theo quy ước, lệnh "đặt độ sáng đèn nền" nhận một <code>__u32</code> từ chương trình nên được định nghĩa bằng macro nào?',
      opts: ['<code>_IO</code>', '<code>_IOR</code>', '<code>_IOW</code>', '<code>_IOWR</code>'],
      a: 2,
      why: 'Chương trình <b>ghi</b> một giá trị vào kernel, như gọi <code>write()</code>. Hướng luôn tính từ phía chương trình, dù bên trong driver thực ra <i>đọc</i> bằng <code>copy_from_user</code>. <code>RD_IOC_SET_LEN</code> của bài là cùng loại: <code>_IOW(\'x\', 3, __u32)</code> = <code>0x40047803</code>, hai bit cao <code>01</code>.' },

    { q: 'Một script khởi động cần đọc số khung hình mà driver camera đã làm rơi, mỗi phút một lần, và giá trị này sẽ được công cụ giám sát của khách hàng dùng trong nhiều năm. Kênh nào hợp nhất?',
      opts: [
        'debugfs, vì nó là một bộ đếm',
        'Một thuộc tính sysfs chỉ đọc',
        'Một lệnh <code>ioctl</code> mới',
        'Một dòng <code>pr_info</code> mỗi phút'
      ],
      a: 1,
      why: 'Một giá trị đơn, đọc từ script, cần ổn định lâu dài: đúng ba đặc điểm của sysfs (<code>DEVICE_ATTR_RO</code> + <code>sysfs_emit</code>). debugfs không có cam kết ABI và thường bị tắt trên thiết bị xuất xưởng. <code>ioctl</code> buộc script phải có một chương trình C trung gian. <code>pr_info</code> không phải một giao diện: bộ đệm log 128 KiB quay vòng và đè mất nó, như bước 6 đã thấy với 10 000 dòng <code>pr_debug</code>.' },

    { q: 'Bạn là root, chạy <code>echo 5 &gt; /sys/class/ramdisk/ramdisk0/used</code> và nhận <code>Permission denied</code>. Giải thích nào đúng?',
      opts: [
        'Driver chưa được nạp',
        '<code>used</code> được tạo bằng <code>DEVICE_ATTR_RO</code>: quyền <code>0444</code> và không có hàm <code>store</code>, nên sysfs từ chối ngay ở <code>open</code>, kể cả với root',
        'Hàm <code>used_store</code> trả <code>-EACCES</code>',
        'Cần gắn sysfs lại với tuỳ chọn <code>rw</code>'
      ],
      a: 1,
      why: 'sysfs được tạo với <code>KERNFS_ROOT_EXTRA_OPEN_PERM_CHECK</code>: <code>kernfs_fop_open()</code> kiểm tra bit ghi <b>và</b> sự tồn tại của hàm ghi, bất kể UID. Thông báo là <code>can\'t create</code>, tức lỗi ở <code>open</code>, và không có hàm <code>used_store</code> nào để trả gì cả. So với <code>echo maybe &gt; readonly</code>: <code>open</code> thành công, lỗi xảy ra ở <code>write</code> (<code>write error: Invalid argument</code>) do <code>readonly_store</code> trả <code>-EINVAL</code>.' },

    { q: 'Bạn đo <code>ioctl</code> mất 120 µs mỗi lần, chậm hơn cả đọc sysfs. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        '<code>ioctl</code> vốn chậm hơn sysfs vì phải chuyển con trỏ',
        '<code>copy_to_user</code> tốn thời gian với cấu trúc 8 byte',
        'Hàm <code>unlocked_ioctl</code> có <code>pr_debug</code> và module được build với <code>-DDEBUG</code>, nên mỗi lần gọi đều ghi một bản ghi log',
        'QEMU không giả lập được syscall <code>ioctl</code> hiệu quả'
      ],
      a: 2,
      why: 'Một <code>ioctl</code> là một syscall; một lần đọc sysfs là ba (<code>open</code>, <code>read</code>, <code>close</code>). Kết quả trái với cơ chế là tín hiệu để nghi ngờ phép đo. Ở bước 6, cùng mã nguồn bỏ <code>-DDEBUG</code> đưa <code>ioctl</code> từ 121 µs xuống 2,4–2,7 µs, nhanh hơn sysfs 23–29 lần. Dòng log không hiện lên màn hình (mức 7 không nhỏ hơn <code>console_loglevel</code> 7), nhưng vẫn phải định dạng và ghi vào bộ đệm log.' },

    { q: 'Vì sao driver <b>không nên</b> kiểm tra giá trị trả về của <code>debugfs_create_dir</code> rồi trả lỗi từ hàm <code>init</code>?',
      opts: [
        'Vì hàm đó không bao giờ thất bại',
        'Vì trên kernel build với <code>CONFIG_DEBUG_FS</code> tắt, mọi hàm debugfs trả con trỏ lỗi, và driver sẽ từ chối nạp trên chính thiết bị xuất xưởng',
        'Vì kiểm tra sẽ làm chậm quá trình nạp module',
        'Vì con trỏ trả về không dùng được cho việc gì khác'
      ],
      a: 1,
      why: 'debugfs là công cụ gỡ lỗi, không phải chức năng. Thiếu nó thì driver vẫn phải chạy. Các hàm debugfs được viết để nhận một con trỏ lỗi làm <code>parent</code> mà không làm gì cả, nên đoạn mã không kiểm tra vẫn an toàn. Đây là trường hợp hiếm hoi trong kernel mà "không kiểm tra lỗi" là cách làm đúng, và chỉ áp dụng cho debugfs. <code>proc_create_single</code> trong bài vẫn được kiểm tra.' }
  ]
});

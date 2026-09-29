/* Bài 52 — Character device driver
   Chặng 10 — Kernel module và Driver
   Driver ram-disk hoàn chỉnh: alloc_chrdev_region (major động), cdev_init/cdev_add, class_create +
   device_create (devtmpfs tự tạo /dev/ramdisk0..1), struct file_operations với open/release/read/
   write/llseek, copy_to_user/copy_from_user, mutex, *ppos. Một chương trình C tĩnh (rdtest) gọi
   driver và nhận -EFAULT, -ENOSPC thật. Hai node tạo bằng mknod (một đúng minor, một sai → ENXIO),
   refcount module qua .owner (rmmod → EAGAIN khi còn fd mở), và một driver cố ý quên *ppos.
   Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1),
   kernel ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs. */

Lesson.register({
  id: 'bai-52',
  title: 'Character device driver',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Hai module của Bài 50 và 51 chỉ làm việc đúng một lần, lúc <code>insmod</code>, rồi ngồi yên ' +
    'trong kernel. Không chương trình nào gọi được chúng. Một driver thật thì ngược lại: nó nằm chờ ' +
    'suốt, và bất cứ lúc nào một tiến trình <code>open()</code>, <code>read()</code>, ' +
    '<code>write()</code> vào nó, kernel sẽ gọi mã của nó.<br><br>' +
    'Cánh cửa đó là một file trong <code>/dev</code>. Bạn đã đọc cặp số major/minor của ' +
    '<code>/dev/console</code> ở Bài 46 từ phía <b>người dùng</b>. Bài này đứng ở phía bên kia: bạn ' +
    'xin kernel một major, gắn một bảng hàm vào nó, và nhìn kernel tự tạo ' +
    '<code>/dev/ramdisk0</code>. Driver lưu dữ liệu trong 4 KiB bộ nhớ kernel. <code>echo</code>, ' +
    '<code>cat</code>, <code>dd</code> và một chương trình C bạn tự viết đều đọc ghi được vào đó, ' +
    'và lần đầu tiên <code>-EFAULT</code> của Bài 51 sẽ đến tay một tiến trình thật.',

  goals: [
    'Xin một dải major/minor động bằng <code>alloc_chrdev_region</code>, và giải thích vì sao kernel ' +
      'này cấp số <b>510</b> chứ không cấp một số trong dải 234–254.',
    'Điền một <code>struct file_operations</code> và lần theo đường đi từ <code>open("/dev/…")</code> ' +
      'tới hàm <code>open</code> của driver, qua <code>cdev</code>.',
    'Viết <code>read</code>/<code>write</code> đúng hợp đồng: cập nhật <code>*ppos</code>, trả 0 ở ' +
      'cuối file, trả <code>-EFAULT</code> khi <code>copy_*_user</code> thất bại, trả ' +
      '<code>-ENOSPC</code> khi hết chỗ.',
    'Tạo node thiết bị bằng hai cách, <code>mknod</code> bằng tay và <code>device_create</code> + ' +
      'devtmpfs, rồi giải thích <code>No such device or address</code> khi cặp số không khớp driver ' +
      'nào.',
    'Viết một chương trình userspace gọi driver và đọc <code>errno</code> mà driver trả về.',
    'Giải thích vì sao <code>.owner = THIS_MODULE</code> khiến <code>rmmod</code> thất bại khi còn ' +
      'một file đang mở.'
  ],

  blocks: [

    /* ============================================================
       1. TỪ MỘT FILE TỚI MỘT DRIVER
       ============================================================ */
    { t: 'h2', x: 'Từ một file tới một driver' },

    { t: 'p', x:
      'Ở Bài 19 bạn đã gọi <code>open</code>/<code>read</code>/<code>write</code> trên file thường, ' +
      'và kernel chuyển chúng tới hệ thống file ext4 hay tmpfs chứa file đó. Một file thiết bị ký tự ' +
      'cũng nhận đúng các syscall ấy. Điểm khác duy nhất là ở cuối đường: thay vì hệ thống file, ' +
      'kernel gọi <b>một hàm do driver cung cấp</b>. Chương trình không biết và không cần biết sự khác ' +
      'nhau đó. Đây là lý do <code>cat</code>, <code>echo</code> và <code>dd</code>, vốn được viết ' +
      'cho file thường, dùng được ngay với driver của bạn mà không cần sửa dòng nào.' },

    { t: 'p', x:
      'Hãy nhìn lại ba file thiết bị mà máy WSL của bạn đang có, và bảng major của kernel WSL:' },

    { t: 'code', where: 'wsl', code:
      'ls -l /dev/null /dev/zero /dev/urandom /dev/tty\n' +
      'head -n 8 /proc/devices' },

    { t: 'code', where: 'out', nocopy: true, code:
      'crw-rw-rw- 1 root root 1, 3 Sep 29 19:37 /dev/null\n' +
      'crw-rw-rw- 1 root tty  5, 0 Sep 29 19:37 /dev/tty\n' +
      'crw-rw-rw- 1 root root 1, 9 Sep 29 19:37 /dev/urandom\n' +
      'crw-rw-rw- 1 root root 1, 5 Sep 29 19:37 /dev/zero\n' +
      'Character devices:\n' +
      '  1 mem\n' +
      '  4 /dev/vc/0\n' +
      '  4 tty\n' +
      '  4 ttyS\n' +
      '  5 /dev/tty\n' +
      '  5 /dev/console\n' +
      '  5 /dev/ptmx' },

    { t: 'p', x:
      'Ba file <code>null</code>, <code>zero</code>, <code>urandom</code> cùng major <b>1</b>, và dòng ' +
      '<code>1 mem</code> của <code>/proc/devices</code> cho biết major 1 thuộc về driver tên ' +
      '<code>mem</code>. Một driver, ba thiết bị, phân biệt bằng minor 3, 5, 9. Mỗi thiết bị cư xử ' +
      'khác nhau: <code>null</code> nuốt mọi thứ, <code>zero</code> trả toàn byte 0, ' +
      '<code>urandom</code> trả byte ngẫu nhiên. Driver <code>mem</code> nhìn minor để biết phải làm ' +
      'gì. Bài này bạn viết đúng kiểu driver đó: một major, hai minor, mỗi minor là một vùng 4 KiB ' +
      'riêng. Ngày giờ trong cột thứ sáu là lúc WSL khởi động, trên máy bạn sẽ khác.' },

    { t: 'fig',
      cap: 'Đường đi của một <code>open()</code>. Tên <code>/dev/ramdisk0</code> chỉ dùng để tìm ra ' +
           'inode; từ inode trở đi kernel chỉ nhìn cặp số <b>510:0</b>. Cặp số chọn ra một ' +
           '<code>struct cdev</code>, <code>cdev</code> trỏ tới bảng <code>file_operations</code> của ' +
           'driver, và từ đó mọi <code>read</code>/<code>write</code> trên file này đi thẳng vào hàm ' +
           'của bạn. Không có <code>cdev</code> nào cho cặp số đó thì <code>open</code> dừng ở ô thứ ' +
           'ba với <code>ENXIO</code>.',
      svg:
        '<svg viewBox="0 0 720 360" width="720" role="img" aria-label="Tiến trình gọi open trên /dev/ramdisk0; VFS tìm inode loại c với cặp số 510:0; chrdev_open tra cdev_map theo cặp số, không thấy thì trả ENXIO; thấy thì lấy cdev của driver, cdev trỏ tới rd_fops; kernel gọi rd_open; từ đó read và write trên file gọi rd_read, rd_write">' +
        '<rect class="d-box" x="20" y="20" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">Tiến trình (userspace)</text>' +
        '<text class="d-tm" x="120" y="64" text-anchor="middle">open("/dev/ramdisk0")</text>' +
        '<line class="d-line" x1="220" y1="48" x2="262" y2="48"/>' +
        '<path class="d-arrow" d="M 270 48 l -9 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="270" y="20" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="370" y="44" text-anchor="middle">VFS: tìm inode</text>' +
        '<text class="d-ts" x="370" y="64" text-anchor="middle">loại c, cặp số 510:0</text>' +
        '<line class="d-line" x1="470" y1="48" x2="512" y2="48"/>' +
        '<path class="d-arrow" d="M 520 48 l -9 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="520" y="20" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="610" y="44" text-anchor="middle">chrdev_open()</text>' +
        '<text class="d-ts" x="610" y="64" text-anchor="middle">tra cdev_map theo 510:0</text>' +
        '<line class="d-line" x1="610" y1="76" x2="610" y2="108"/>' +
        '<path class="d-arrow" d="M 610 116 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-w" x="520" y="116" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="610" y="140" text-anchor="middle">không có cdev</text>' +
        '<text class="d-tm" x="610" y="160" text-anchor="middle">-ENXIO</text>' +
        '<line class="d-line" x1="560" y1="76" x2="420" y2="112"/>' +
        '<path class="d-arrow" d="M 412 116 l 9 -1 l -3 -8 z"/>' +
        '<rect class="d-box-a" x="270" y="116" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="370" y="140" text-anchor="middle">struct cdev của driver</text>' +
        '<text class="d-ts" x="370" y="160" text-anchor="middle">cdev_add() đã đăng ký nó</text>' +
        '<line class="d-line" x1="370" y1="172" x2="370" y2="204"/>' +
        '<path class="d-arrow" d="M 370 212 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-a" x="270" y="212" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="370" y="236" text-anchor="middle">rd_fops</text>' +
        '<text class="d-ts" x="370" y="256" text-anchor="middle">struct file_operations</text>' +
        '<line class="d-line" x1="270" y1="240" x2="228" y2="240"/>' +
        '<path class="d-arrow" d="M 220 240 l 9 -4 l 0 8 z"/>' +
        '<rect class="d-box-g" x="20" y="212" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="120" y="236" text-anchor="middle">rd_open()</text>' +
        '<text class="d-ts" x="120" y="256" text-anchor="middle">mã của bạn chạy</text>' +
        '<rect class="d-box-g" x="20" y="296" width="680" height="48" rx="6"/>' +
        '<text class="d-t" x="36" y="318">Từ đây: read() → rd_read(), write() → rd_write(), close() → rd_release()</text>' +
        '<text class="d-tm" x="36" y="336">fs/char_dev.c:373 chrdev_open() — :388 return -ENXIO — :412 replace_fops()</text>' +
        '</svg>' },

    { t: 'terms', items: [
      ['Character device', 'thiết bị ký tự', 'Thiết bị đọc ghi theo luồng byte qua <code>read</code>/<code>write</code>, không qua bộ đệm khối của kernel. Ví dụ: cổng nối tiếp, <code>/dev/null</code>, cảm biến, driver của bài này.'],
      ['<code>dev_t</code>', '—', 'Một số 32 bit chứa cả major và minor: 12 bit cao là major, 20 bit thấp là minor (<code>MINORBITS 20</code> trong <code>include/linux/kdev_t.h</code>). <code>MKDEV</code>, <code>MAJOR</code>, <code>MINOR</code> ghép và tách nó.'],
      ['<code>struct cdev</code>', '—', 'Đối tượng kernel nối một dải <code>dev_t</code> với một bảng <code>file_operations</code>. Kernel tra nó mỗi lần có <code>open</code> trên một file loại <code>c</code>.'],
      ['<code>struct file_operations</code>', 'fops', 'Bảng con trỏ hàm: <code>open</code>, <code>read</code>, <code>write</code>, <code>release</code>, <code>llseek</code>… Ô nào để trống, kernel dùng hành vi mặc định hoặc trả lỗi.'],
      ['Node thiết bị', 'device node', 'File đặc biệt trong <code>/dev</code>, chỉ mang loại và cặp số (Bài 46). Tạo bằng <code>mknod</code> hoặc để devtmpfs tự tạo.']
    ] },

    /* ============================================================
       2. MAJOR VÀ MINOR, NHÌN TỪ PHÍA DRIVER
       ============================================================ */
    { t: 'h2', x: 'Major và minor, nhìn từ phía driver' },

    { t: 'p', x:
      'Bài 46 dạy bạn <b>đọc</b> cặp số. Người viết driver thì phải <b>xin</b> nó. Có hai cách:' },

    { t: 'table',
      head: ['Cách', 'Hàm', 'Khi nào dùng'],
      rows: [
        ['Xin một major cố định',
         '<code>register_chrdev_region(MKDEV(240, 0), 2, "ramdisk")</code>',
         'Chỉ khi major đó đã được cấp chính thức trong <code>Documentation/admin-guide/devices.txt</code>, như <code>1</code> của <code>mem</code> hay <code>5</code> của <code>/dev/console</code>. Chọn bừa một số thì sớm muộn sẽ trùng với driver khác, và <code>register</code> trả <code>-EBUSY</code>.'],
        ['Để kernel chọn',
         '<code>alloc_chrdev_region(&amp;rd_base, 0, 2, "ramdisk")</code>',
         'Mọi driver mới. Kernel tìm một major còn trống, ghi cặp số đầu tiên vào <code>rd_base</code>. Driver đọc lại bằng <code>MAJOR(rd_base)</code>.']
      ] },

    { t: 'p', x:
      'Tham số thứ ba, <code>2</code>, là số minor bạn cần: minor 0 và minor 1. Chuỗi ' +
      '<code>"ramdisk"</code> chỉ là nhãn hiện trong <code>/proc/devices</code>, kernel không dùng nó ' +
      'để tìm gì cả. Sau lệnh này, cặp 510:0 và 510:1 (hoặc major nào kernel chọn) thuộc về bạn, nhưng ' +
      'chưa có hàm nào gắn vào. <code>open</code> lúc này vẫn trả <code>ENXIO</code>, vì ' +
      '<code>chrdev_open()</code> tìm <code>cdev</code> chứ không tìm vùng số đã xin.' },

    { t: 'cal', kind: 'info', title: 'Kernel chọn major động bằng cách nào',
      x: '<code>find_dynamic_major()</code> ở <code>fs/char_dev.c:65</code> quét <b>từ 254 lùi xuống ' +
         '234</b> (<code>CHRDEV_MAJOR_DYN_END</code>) và lấy số trống đầu tiên. Hết chỗ, nó quét dải ' +
         'mở rộng <b>từ 511 lùi xuống 384</b>. Kernel defconfig ARM64 của Bài 40 build sẵn rất nhiều ' +
         'driver, và ở bước 4 bạn sẽ đếm được cả <b>21</b> số từ 234 tới 254 đều đã có chủ, còn 511 ' +
         'thuộc về <code>rpmb</code>. Vì vậy driver của bạn nhận <b>510</b>. Con số này do cấu hình ' +
         'kernel quyết định chứ không ngẫu nhiên. Cùng kernel <code>~/bai38</code>, bạn sẽ thấy đúng ' +
         '510. Với một kernel cấu hình khác, số sẽ khác. Vì thế một driver không bao giờ ' +
         '<i>đoán</i> major của mình, nó in ra bằng <code>pr_info</code>.' },

    { t: 'cal', kind: 'why', title: 'Vì sao không để mỗi driver tự chọn số',
      x: 'Ngày trước mỗi driver tự chọn một major và ghi cứng nó vào mã. Major khi đó chỉ có 8 bit ' +
         '(256 số), và hai ' +
         'driver không quen biết nhau rất dễ chọn trùng. Hậu quả: driver nào nạp sau thì ' +
         '<code>register</code> thất bại, tuỳ theo thứ tự nạp. Cấp số động chấm dứt chuyện đó, nhưng ' +
         'đổi lại tạo ra một vấn đề mới. Major không còn biết trước, vậy ai sẽ tạo file ' +
         '<code>/dev</code> với đúng cặp số? Câu trả lời, <code>device_create</code> + devtmpfs, là ' +
         'phần thứ tư của bài.' },

    /* ============================================================
       3. FILE_OPERATIONS VÀ CDEV
       ============================================================ */
    { t: 'h2', x: 'file_operations: bảng hàm mà kernel sẽ gọi' },

    { t: 'p', x:
      '<code>struct file_operations</code> là một struct toàn con trỏ hàm, mỗi ô ứng với một syscall. ' +
      'Kernel 6.18.45 có hơn 30 ô. Driver chỉ điền những ô nó cần, bằng cú pháp khởi tạo có tên của C99 ' +
      '(<code>.tên = giá_trị</code>): mọi ô không được nhắc tên tự nhận <code>NULL</code>, như một biến <code>static</code> chưa khởi tạo. Đây là bảng của driver bài này:' },

    { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c, dòng 112–119', lang: 'c', nocopy: true, code:
      'static const struct file_operations rd_fops = {\n' +
      '\t.owner   = THIS_MODULE,\n' +
      '\t.open    = rd_open,\n' +
      '\t.release = rd_release,\n' +
      '\t.read    = rd_read,\n' +
      '\t.write   = rd_write,\n' +
      '\t.llseek  = rd_llseek,\n' +
      '};' },

    { t: 'table',
      head: ['Ô', 'Syscall kích hoạt', 'Hợp đồng của hàm'],
      rows: [
        ['<code>.open</code>', '<code>open()</code>', 'Trả 0 để cho phép mở, hoặc một mã lỗi âm để từ chối. Thường dùng để gắn dữ liệu riêng của thiết bị vào <code>filp-&gt;private_data</code>.'],
        ['<code>.release</code>', '<code>close()</code> <b>cuối cùng</b>', 'Được gọi khi fd cuối cùng trỏ tới file này đóng, không phải ở mỗi <code>close()</code>. Sau <code>fork()</code> (Bài 20), hai tiến trình cùng giữ một <code>struct file</code>, nên <code>release</code> chỉ chạy một lần.'],
        ['<code>.read</code>', '<code>read()</code>', 'Chép tối đa <code>count</code> byte vào bộ đệm userspace, tăng <code>*ppos</code>, trả số byte đã chép. Trả <b>0</b> nghĩa là hết file.'],
        ['<code>.write</code>', '<code>write()</code>', 'Chép tối đa <code>count</code> byte từ userspace, tăng <code>*ppos</code>, trả số byte đã nhận. Nhận ít hơn <code>count</code> là hợp lệ.'],
        ['<code>.llseek</code>', '<code>lseek()</code>', 'Đổi <code>f_pos</code>. Để <code>NULL</code> thì kernel 6.18 coi file là không seek được.'],
        ['<code>.owner</code>', '—', 'Không phải hàm. Chỉ ra module sở hữu bảng này, để kernel giữ module lại chừng nào còn một file đang mở. Bước 5 sẽ đo hệ quả của nó.']
      ] },

    { t: 'p', x:
      'Bảng hàm một mình chưa đủ. Kernel cần biết bảng nào ứng với cặp số nào, và đó là việc của ' +
      '<code>struct cdev</code>. Hai lời gọi nối chúng lại:' },

    { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c, dòng 155–156', lang: 'c', nocopy: true, code:
      '\t\tcdev_init(&rd->cdev, &rd_fops);\n' +
      '\t\tret = cdev_add(&rd->cdev, MKDEV(MAJOR(rd_base), i), 1);' },

    { t: 'p', x:
      '<code>cdev_init</code> chỉ ghi con trỏ <code>&amp;rd_fops</code> vào struct. ' +
      '<code>cdev_add</code> mới là lời gọi có hiệu lực: nó đưa cặp số <code>510:i</code> vào bảng ' +
      '<code>cdev_map</code> mà <code>chrdev_open()</code> tra cứu. <b>Ngay khi <code>cdev_add</code> ' +
      'trả về, một tiến trình khác đã có thể <code>open</code> thiết bị</b>, kể cả khi hàm ' +
      '<code>init</code> của bạn chưa chạy xong. Vì vậy trong mã của bài, mọi thứ ' +
      '<code>rd_open</code> cần (bộ đệm <code>kzalloc</code>, <code>mutex</code>) đều được chuẩn bị ' +
      '<b>trước</b> <code>cdev_add</code>.' },

    { t: 'cal', kind: 'tip', title: 'Từ inode về struct của bạn: container_of',
      x: 'Driver có hai thiết bị, mỗi thiết bị một <code>struct rd_dev</code> chứa bộ đệm riêng. Khi ' +
         '<code>rd_open</code> được gọi, nó chỉ nhận <code>inode</code>. Làm sao biết đó là thiết bị ' +
         'nào? <code>inode-&gt;i_cdev</code> trỏ tới trường <code>cdev</code> <b>nằm bên trong</b> ' +
         '<code>struct rd_dev</code>. <code>container_of(ptr, struct rd_dev, cdev)</code> lấy địa chỉ ' +
         'đó trừ đi vị trí của trường <code>cdev</code> trong struct, và ra địa chỉ của cả struct. ' +
         'Hãy hình dung bạn biết số phòng của một người trong khách sạn, và biết phòng đó ở tầng ' +
         'mấy: bạn suy ra được toà nhà. Kết quả được cất vào <code>filp-&gt;private_data</code>, để ' +
         '<code>read</code>/<code>write</code> lấy lại mà không phải tính lần nữa. Bạn sẽ gặp mẫu ' +
         '<code>container_of</code> này ở hầu hết mọi driver trong Chặng 10.' },

    /* ============================================================
       4. READ, WRITE VÀ *PPOS
       ============================================================ */
    { t: 'h2', x: 'read và write: hợp đồng với userspace' },

    { t: 'p', x:
      'Chữ ký của <code>.read</code> có bốn tham số, và mỗi tham số trả lời một câu hỏi:' },

    { t: 'code', where: 'file', name: 'mẫu chữ ký, không chạy', lang: 'c', nocopy: true, code:
      'ssize_t rd_read(struct file *filp, char __user *buf, size_t count, loff_t *ppos);' },

    { t: 'table',
      head: ['Tham số', 'Câu hỏi nó trả lời'],
      rows: [
        ['<code>filp</code>', 'Lần mở nào? Mỗi <code>open()</code> tạo một <code>struct file</code> riêng, có <code>f_flags</code> và <code>private_data</code> riêng.'],
        ['<code>buf</code>', 'Chép vào đâu? Một địa chỉ <b>userspace</b>, đánh dấu <code>__user</code> (Bài 51). Chỉ được chạm qua <code>copy_to_user</code>.'],
        ['<code>count</code>', 'Người gọi muốn tối đa bao nhiêu byte? <code>cat</code> của BusyBox xin 65 536, <code>head -c 40</code> xin 4 096. Bước 5 cho bạn thấy cả hai con số.'],
        ['<code>ppos</code>', 'Đọc từ đâu? Con trỏ tới vị trí hiện tại của file. <b>Driver phải tự tăng nó</b>, kernel không làm hộ.']
      ] },

    { t: 'p', x:
      'Giá trị trả về là cả một giao thức. Số dương là số byte đã chép. <b>0</b> nghĩa là "hết ' +
      'file". Số âm (<code>-EFAULT</code>, <code>-ENOSPC</code>…) được kernel đổi thành ' +
      '<code>-1</code> và <code>errno</code> tương ứng cho chương trình, đúng cơ chế bạn đã đọc ở ' +
      'Bài 19. Toàn bộ <code>rd_read</code>:' },

    { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c, dòng 49–74', lang: 'c', nocopy: true, code:
      'static ssize_t rd_read(struct file *filp, char __user *buf,\n' +
      '\t\t       size_t count, loff_t *ppos)\n' +
      '{\n' +
      '\tstruct rd_dev *rd = filp->private_data;\n' +
      '\tloff_t start = *ppos;\n' +
      '\tsize_t want = count;\n' +
      '\tssize_t ret;\n' +
      '\n' +
      '\tmutex_lock(&rd->lock);\n' +
      '\tif (*ppos >= rd->len) {\n' +
      '\t\tret = 0;                        /* end of file */\n' +
      '\t\tgoto out;\n' +
      '\t}\n' +
      '\tif (count > rd->len - *ppos)\n' +
      '\t\tcount = rd->len - *ppos;\n' +
      '\tif (copy_to_user(buf, rd->data + *ppos, count)) {\n' +
      '\t\tret = -EFAULT;\n' +
      '\t\tgoto out;\n' +
      '\t}\n' +
      '\t*ppos += count;\n' +
      '\tret = count;\n' +
      'out:\n' +
      '\tmutex_unlock(&rd->lock);\n' +
      '\tpr_debug("read    count %zu pos %lld -> %zd\\n", want, start, ret);\n' +
      '\treturn ret;\n' +
      '}' },

    { t: 'list', items: [
      '<b>Hết dữ liệu thì trả 0.</b> <code>rd-&gt;len</code> là số byte thật sự đã ghi, không phải ' +
        '4096. Đọc quá nó là "hết file".',
      '<b>Cắt <code>count</code></b> để không bao giờ chép quá phần có dữ liệu.',
      '<b><code>copy_to_user</code> trả về số byte <i>không</i> chép được</b> (Bài 51). Khác 0 là ' +
        'con trỏ hỏng, trả <code>-EFAULT</code>.',
      '<b><code>*ppos += count</code></b>: lần <code>read</code> sau bắt đầu ở chỗ lần này dừng. ' +
        'Quên dòng này là lỗi kinh điển của người viết driver lần đầu. Bước 6 sẽ xoá nó đi để bạn ' +
        'thấy hậu quả.',
      'Mọi đường ra đều đi qua nhãn <code>out:</code>, để <code>mutex_unlock</code> không bao giờ bị ' +
        'bỏ sót. Cùng mẫu <code>goto</code> dọn dẹp mà Bài 51 dùng cho <code>kfree</code>.'
    ] },

    { t: 'cal', kind: 'why', title: 'Vì sao cần mutex cho một driver nhỏ như vậy',
      x: 'Hai tiến trình có thể gọi <code>write</code> vào cùng <code>/dev/ramdisk0</code> cùng lúc, ' +
         'trên hai CPU khác nhau (máy QEMU của bài này chỉ có 1 CPU vì không có <code>-smp</code>, nhưng bo mạch thật ' +
         'thường có 4). Không có khoá, cả hai cùng đọc <code>rd-&gt;len</code>, cùng chép vào một ' +
         'chỗ, và một trong hai lần ghi mất dấu. <code>mutex_lock</code> xếp hàng họ lại. Mutex được ' +
         'phép ngủ, và <code>copy_*_user</code> cũng có thể ngủ (khi trang userspace đang nằm ngoài ' +
         'RAM), nên hai thứ này đi được với nhau. Spinlock thì không được ngủ, nên không dùng được ở ' +
         'đây. Bài 56 sẽ so sánh đầy đủ mutex, spinlock và atomic.' },

    { t: 'p', x:
      '<code>rd_write</code> đối xứng với <code>rd_read</code>, với hai điểm khác. Nếu ' +
      '<code>pos</code> đã tới 4096, nó trả <code>-ENOSPC</code>: đó là cách một thiết bị báo "đầy". ' +
      'Ghi được một phần thì trả số byte đã ghi. Và nếu file được mở với <code>O_APPEND</code> (toán ' +
      'tử <code>&gt;&gt;</code> của shell), nó ghi sau dữ liệu cũ, bất kể <code>*ppos</code> đang ở ' +
      'đâu:' },

    { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c, dòng 84–92', lang: 'c', nocopy: true, code:
      '\tmutex_lock(&rd->lock);\n' +
      '\t/* ">> file" opens with O_APPEND: always write after the data */\n' +
      '\tpos = (filp->f_flags & O_APPEND) ? rd->len : *ppos;\n' +
      '\tif (pos >= RD_SIZE) {\n' +
      '\t\tret = -ENOSPC;\n' +
      '\t\tgoto out;\n' +
      '\t}\n' +
      '\tif (count > RD_SIZE - pos)\n' +
      '\t\tcount = RD_SIZE - pos;' },

    { t: 'cal', kind: 'warn', title: 'O_APPEND và O_TRUNC là việc của driver, không phải của kernel',
      x: 'Với file thường, hệ thống file lo <code>O_APPEND</code> và <code>O_TRUNC</code>. Với một ' +
         'thiết bị ký tự, kernel chỉ chuyển cờ vào <code>filp-&gt;f_flags</code>, và <b>driver phải ' +
         'tự đọc chúng</b>. Nếu bạn bỏ qua, <code>echo world &gt;&gt; /dev/ramdisk0</code> sẽ ghi đè ' +
         'lên chữ <code>hello</code> thay vì nối thêm, vì mỗi <code>open</code> mới bắt đầu với ' +
         '<code>*ppos = 0</code>. Đó là lý do <code>rd_open</code> xoá <code>rd-&gt;len</code> khi ' +
         'thấy <code>O_TRUNC</code> (<code>&gt;</code>), còn <code>rd_write</code> nhảy tới cuối khi ' +
         'thấy <code>O_APPEND</code>. Nhiều driver thật (<code>/dev/ttyAMA0</code> chẳng hạn) không có ' +
         'khái niệm "cuối file" và bỏ qua cả hai cờ, điều đó hợp lệ. Driver của bạn giả làm một ' +
         'file, nên nó phải tôn trọng chúng.' },

    /* ============================================================
       5. TỪ CẶP SỐ TỚI FILE TRONG /DEV
       ============================================================ */
    { t: 'h2', x: 'Từ cặp số tới file trong /dev' },

    { t: 'p', x:
      'Sau <code>cdev_add</code>, kernel đã biết 510:0 thuộc về <code>rd_fops</code>. Nhưng chưa có ' +
      'file nào trong <code>/dev</code> mang cặp số đó, nên chương trình vẫn chưa có gì để ' +
      '<code>open</code>. Có hai cách tạo file:' },

    { t: 'table',
      head: ['', '<code>mknod</code> bằng tay', '<code>device_create</code> + devtmpfs'],
      rows: [
        ['Ai tạo', 'Người dùng root, gõ lệnh', 'Driver, trong hàm <code>init</code>'],
        ['Cần biết major', 'Có. Phải đọc <code>/proc/devices</code> hoặc <code>dmesg</code> trước', 'Không. Driver đã có <code>rd_base</code>'],
        ['Khi driver bị gỡ', 'File vẫn còn, trỏ vào khoảng trống (<code>ENXIO</code>)', 'File biến mất cùng driver'],
        ['Kiểm tra cặp số', '<b>Không.</b> Tạo được cả <code>510:9</code>, một minor driver không có', 'Luôn đúng'],
        ['Dùng khi', 'Hệ thống cũ không có devtmpfs, hoặc để thử nghiệm', 'Mọi driver hiện đại']
      ] },

    { t: 'p', x:
      '<code>device_create</code> cần một <code>struct class</code>. Class là một nhóm thiết bị cùng ' +
      'loại, hiện ra thành một thư mục dưới <code>/sys/class/</code>, như <code>/sys/class/tty</code> ' +
      'hay <code>/sys/class/leds</code> mà Bài 45 đã đọc. Driver tạo class <code>ramdisk</code> một ' +
      'lần, rồi gọi <code>device_create</code> cho từng minor:' },

    { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c, dòng 138 và 162–163', lang: 'c', nocopy: true, code:
      'rd_class = class_create("ramdisk");\n' +
      '...\n' +
      'dev = device_create(rd_class, NULL, rd->cdev.dev, NULL,\n' +
      '\t\t    "ramdisk%d", i);' },

    { t: 'p', x:
      'Mỗi lần gọi làm ba việc: tạo thư mục <code>/sys/class/ramdisk/ramdisk0</code> có file ' +
      '<code>dev</code> chứa <code>510:0</code>, phát một sự kiện <i>uevent</i> cho userspace, và gọi ' +
      '<code>devtmpfs_create_node()</code> (<code>drivers/base/core.c:3730</code>) để tạo ngay ' +
      '<code>/dev/ramdisk0</code> trong devtmpfs, không cần tiến trình nào ở userspace. Tên file lấy ' +
      'từ chuỗi định dạng <code>"ramdisk%d"</code>.' },

    { t: 'cal', kind: 'warn', title: 'devtmpfs có tạo node, nhưng initramfs của bạn chưa gắn nó',
      x: 'Bài 46 đã chỉ ra: kernel tự gắn devtmpfs vào <code>/dev</code> <b>chỉ khi</b> boot từ ' +
         'một rootfs trên đĩa. Với initramfs, <code>/init</code> phải tự gắn. <code>/init</code> ' +
         'của Bài 32 mà bài này dùng lại không làm việc đó, nên <code>/dev</code> chỉ có ' +
         '<code>console</code>. Node <code>ramdisk0</code> vẫn được tạo, nhưng trong một devtmpfs ' +
         'chưa được gắn vào đâu cả. Bước 4 sẽ cho bạn thấy <code>/dev</code> vẫn trống sau ' +
         '<code>insmod</code>, rồi chỉ một lệnh <code>mount -t devtmpfs</code> là cả hai node hiện ' +
         'ra.' },

    { t: 'cal', kind: 'danger', title: 'class_create đã đổi chữ ký ở kernel 6.4',
      x: 'Mọi sách và bài hướng dẫn viết trước 2023, kể cả cuốn <i>Linux Device Drivers</i> kinh ' +
         'điển, đều viết <code>class_create(THIS_MODULE, "ramdisk")</code>. Từ kernel 6.4, tham số ' +
         'đầu bị bỏ, và dòng đó không còn build được trên kernel 6.18.45. Bảng Lỗi thường gặp có ' +
         'thông báo lỗi thật. Khi chép mã driver từ Internet, hãy kiểm tra chữ ký trong ' +
         '<code>include/linux/device/class.h</code> của đúng cây bạn đang build, bằng ' +
         '<code>grep -n class_create</code>. Đừng tin trí nhớ, của bạn hay của bài viết.' },

    { t: 'fig',
      cap: 'Thứ tự dựng lên và dỡ xuống của driver. <code>rd_init</code> đi từ trên xuống; mỗi bước ' +
           'hỏng thì nhảy tới nhãn dọn dẹp và gỡ <b>đúng</b> những gì đã dựng, theo thứ tự ngược. ' +
           '<code>rd_exit</code> đi từ dưới lên. Quy tắc để nhớ: <b>thứ gì cho phép người khác chạm ' +
           'vào driver (<code>cdev_add</code>, <code>device_create</code>) thì dựng cuối, gỡ đầu</b>.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Năm bước dựng driver theo thứ tự: alloc_chrdev_region xin 510:0 và 510:1; class_create tạo /sys/class/ramdisk; với mỗi minor: kzalloc 4096 byte và mutex_init, cdev_add đưa cặp số vào cdev_map, device_create tạo /dev/ramdiskN. Mũi tên bên phải đi ngược lên cho rd_exit: device_destroy, cdev_del, kfree, class_destroy, unregister_chrdev_region">' +
        '<text class="d-t" x="20" y="22">rd_init() — dựng lên</text>' +
        '<text class="d-t" x="540" y="22">rd_exit() — dỡ xuống</text>' +
        '<rect class="d-box" x="20" y="36" width="480" height="44" rx="6"/>' +
        '<text class="d-tm" x="36" y="56">1. alloc_chrdev_region(&amp;rd_base, 0, 2, "ramdisk")</text>' +
        '<text class="d-ts" x="36" y="72">xin 510:0 và 510:1 — hiện trong /proc/devices</text>' +
        '<rect class="d-box" x="20" y="92" width="480" height="44" rx="6"/>' +
        '<text class="d-tm" x="36" y="112">2. class_create("ramdisk")</text>' +
        '<text class="d-ts" x="36" y="128">thư mục /sys/class/ramdisk</text>' +
        '<rect class="d-box-p" x="20" y="148" width="480" height="164" rx="6"/>' +
        '<text class="d-t" x="36" y="168">Lặp cho minor 0 và 1</text>' +
        '<rect class="d-box" x="36" y="178" width="448" height="36" rx="6"/>' +
        '<text class="d-tm" x="50" y="200">3. kzalloc(4096) + mutex_init()</text>' +
        '<rect class="d-box-a" x="36" y="222" width="448" height="36" rx="6"/>' +
        '<text class="d-tm" x="50" y="244">4. cdev_init() + cdev_add()  → open() đã chạy được</text>' +
        '<rect class="d-box-g" x="36" y="266" width="448" height="36" rx="6"/>' +
        '<text class="d-tm" x="50" y="288">5. device_create()  → /dev/ramdiskN, /sys/class/…/ramdiskN</text>' +
        '<line class="d-line" x1="610" y1="290" x2="610" y2="52"/>' +
        '<path class="d-arrow" d="M 610 44 l -4 8 l 8 0 z"/>' +
        '<text class="d-tm" x="540" y="290">device_destroy</text>' +
        '<text class="d-tm" x="540" y="246">cdev_del</text>' +
        '<text class="d-tm" x="540" y="202">kfree</text>' +
        '<text class="d-tm" x="540" y="118">class_destroy</text>' +
        '<text class="d-tm" x="540" y="62">unregister_…</text>' +
        '</svg>' },

    /* ============================================================
       6. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: driver ram-disk và chương trình gọi nó' },

    { t: 'p', x:
      'Sáu bước, trong thư mục mới <code>~/bai52</code>. Makefile lấy từ <code>~/bai50/hello</code>, ' +
      'initramfs từ <code>~/bai32/initramfs</code>, kernel là cây <code>~/bai38/linux-6.18.45</code> ' +
      'của Bài 40. Không bước nào ghi vào ba thư mục đó.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Viết driver',
        blocks: [
          { t: 'p', x:
            'Tạo thư mục và file nguồn. Bạn có thể dùng <code>nano</code> như Bài 7, hoặc dán nguyên ' +
            'khối:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai52/ramdisk ~/bai52/app\n' +
            'cd ~/bai52/ramdisk\n' +
            'nano ramdisk.c' },

          { t: 'code', where: 'file', name: '~/bai52/ramdisk/ramdisk.c', lang: 'c', code:
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
            '\n' +
            '#define RD_COUNT 2          /* two devices: minor 0 and minor 1 */\n' +
            '#define RD_SIZE  4096       /* bytes of storage per device */\n' +
            '\n' +
            'struct rd_dev {\n' +
            '\tchar *data;             /* RD_SIZE bytes from kzalloc() */\n' +
            '\tsize_t len;             /* how many bytes hold real data */\n' +
            '\tstruct mutex lock;      /* one reader or writer at a time */\n' +
            '\tstruct cdev cdev;       /* links this device to rd_fops */\n' +
            '};\n' +
            '\n' +
            'static dev_t rd_base;       /* first major:minor we own */\n' +
            'static struct class *rd_class;\n' +
            'static struct rd_dev rd_devs[RD_COUNT];\n' +
            '\n' +
            'static int rd_open(struct inode *inode, struct file *filp)\n' +
            '{\n' +
            '\tstruct rd_dev *rd = container_of(inode->i_cdev, struct rd_dev, cdev);\n' +
            '\n' +
            '\tfilp->private_data = rd;\n' +
            '\tpr_debug("open    minor %u flags 0x%x\\n", iminor(inode), filp->f_flags);\n' +
            '\n' +
            '\t/* "> file" in a shell opens with O_WRONLY|O_TRUNC: start empty */\n' +
            '\tif ((filp->f_flags & O_ACCMODE) == O_WRONLY && (filp->f_flags & O_TRUNC)) {\n' +
            '\t\tmutex_lock(&rd->lock);\n' +
            '\t\trd->len = 0;\n' +
            '\t\tmutex_unlock(&rd->lock);\n' +
            '\t}\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static int rd_release(struct inode *inode, struct file *filp)\n' +
            '{\n' +
            '\tpr_debug("release minor %u\\n", iminor(inode));\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static ssize_t rd_read(struct file *filp, char __user *buf,\n' +
            '\t\t       size_t count, loff_t *ppos)\n' +
            '{\n' +
            '\tstruct rd_dev *rd = filp->private_data;\n' +
            '\tloff_t start = *ppos;\n' +
            '\tsize_t want = count;\n' +
            '\tssize_t ret;\n' +
            '\n' +
            '\tmutex_lock(&rd->lock);\n' +
            '\tif (*ppos >= rd->len) {\n' +
            '\t\tret = 0;                        /* end of file */\n' +
            '\t\tgoto out;\n' +
            '\t}\n' +
            '\tif (count > rd->len - *ppos)\n' +
            '\t\tcount = rd->len - *ppos;\n' +
            '\tif (copy_to_user(buf, rd->data + *ppos, count)) {\n' +
            '\t\tret = -EFAULT;\n' +
            '\t\tgoto out;\n' +
            '\t}\n' +
            '\t*ppos += count;\n' +
            '\tret = count;\n' +
            'out:\n' +
            '\tmutex_unlock(&rd->lock);\n' +
            '\tpr_debug("read    count %zu pos %lld -> %zd\\n", want, start, ret);\n' +
            '\treturn ret;\n' +
            '}\n' +
            '\n' +
            'static ssize_t rd_write(struct file *filp, const char __user *buf,\n' +
            '\t\t\tsize_t count, loff_t *ppos)\n' +
            '{\n' +
            '\tstruct rd_dev *rd = filp->private_data;\n' +
            '\tsize_t want = count;\n' +
            '\tloff_t pos;\n' +
            '\tssize_t ret;\n' +
            '\n' +
            '\tmutex_lock(&rd->lock);\n' +
            '\t/* ">> file" opens with O_APPEND: always write after the data */\n' +
            '\tpos = (filp->f_flags & O_APPEND) ? rd->len : *ppos;\n' +
            '\tif (pos >= RD_SIZE) {\n' +
            '\t\tret = -ENOSPC;\n' +
            '\t\tgoto out;\n' +
            '\t}\n' +
            '\tif (count > RD_SIZE - pos)\n' +
            '\t\tcount = RD_SIZE - pos;\n' +
            '\tif (copy_from_user(rd->data + pos, buf, count)) {\n' +
            '\t\tret = -EFAULT;\n' +
            '\t\tgoto out;\n' +
            '\t}\n' +
            '\t*ppos = pos + count;\n' +
            '\tif (*ppos > rd->len)\n' +
            '\t\trd->len = *ppos;\n' +
            '\tret = count;\n' +
            'out:\n' +
            '\tmutex_unlock(&rd->lock);\n' +
            '\tpr_debug("write   count %zu pos %lld -> %zd\\n", want, pos, ret);\n' +
            '\treturn ret;\n' +
            '}\n' +
            '\n' +
            'static loff_t rd_llseek(struct file *filp, loff_t off, int whence)\n' +
            '{\n' +
            '\treturn fixed_size_llseek(filp, off, whence, RD_SIZE);\n' +
            '}\n' +
            '\n' +
            'static const struct file_operations rd_fops = {\n' +
            '\t.owner   = THIS_MODULE,\n' +
            '\t.open    = rd_open,\n' +
            '\t.release = rd_release,\n' +
            '\t.read    = rd_read,\n' +
            '\t.write   = rd_write,\n' +
            '\t.llseek  = rd_llseek,\n' +
            '};\n' +
            '\n' +
            '/* Undo everything rd_init() did for device i, in reverse order */\n' +
            'static void rd_teardown(int i)\n' +
            '{\n' +
            '\tdevice_destroy(rd_class, MKDEV(MAJOR(rd_base), i));\n' +
            '\tcdev_del(&rd_devs[i].cdev);\n' +
            '\tkfree(rd_devs[i].data);\n' +
            '}\n' +
            '\n' +
            'static int __init rd_init(void)\n' +
            '{\n' +
            '\tstruct device *dev;\n' +
            '\tint i, ret;\n' +
            '\n' +
            '\tret = alloc_chrdev_region(&rd_base, 0, RD_COUNT, "ramdisk");\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\n' +
            '\trd_class = class_create("ramdisk");\n' +
            '\tif (IS_ERR(rd_class)) {\n' +
            '\t\tret = PTR_ERR(rd_class);\n' +
            '\t\tgoto err_region;\n' +
            '\t}\n' +
            '\n' +
            '\tfor (i = 0; i < RD_COUNT; i++) {\n' +
            '\t\tstruct rd_dev *rd = &rd_devs[i];\n' +
            '\n' +
            '\t\trd->data = kzalloc(RD_SIZE, GFP_KERNEL);\n' +
            '\t\tif (!rd->data) {\n' +
            '\t\t\tret = -ENOMEM;\n' +
            '\t\t\tgoto err_devs;\n' +
            '\t\t}\n' +
            '\t\tmutex_init(&rd->lock);\n' +
            '\n' +
            '\t\t/* the cdev must be live before the /dev node appears */\n' +
            '\t\tcdev_init(&rd->cdev, &rd_fops);\n' +
            '\t\tret = cdev_add(&rd->cdev, MKDEV(MAJOR(rd_base), i), 1);\n' +
            '\t\tif (ret) {\n' +
            '\t\t\tkfree(rd->data);\n' +
            '\t\t\tgoto err_devs;\n' +
            '\t\t}\n' +
            '\n' +
            '\t\tdev = device_create(rd_class, NULL, rd->cdev.dev, NULL,\n' +
            '\t\t\t\t    "ramdisk%d", i);\n' +
            '\t\tif (IS_ERR(dev)) {\n' +
            '\t\t\tret = PTR_ERR(dev);\n' +
            '\t\t\tcdev_del(&rd->cdev);\n' +
            '\t\t\tkfree(rd->data);\n' +
            '\t\t\tgoto err_devs;\n' +
            '\t\t}\n' +
            '\t}\n' +
            '\n' +
            '\tpr_info("major %d, %d devices of %d bytes\\n",\n' +
            '\t\tMAJOR(rd_base), RD_COUNT, RD_SIZE);\n' +
            '\treturn 0;\n' +
            '\n' +
            'err_devs:\n' +
            '\twhile (--i >= 0)\n' +
            '\t\trd_teardown(i);\n' +
            '\tclass_destroy(rd_class);\n' +
            'err_region:\n' +
            '\tunregister_chrdev_region(rd_base, RD_COUNT);\n' +
            '\treturn ret;\n' +
            '}\n' +
            '\n' +
            'static void __exit rd_exit(void)\n' +
            '{\n' +
            '\tint i;\n' +
            '\n' +
            '\tfor (i = 0; i < RD_COUNT; i++)\n' +
            '\t\trd_teardown(i);\n' +
            '\tclass_destroy(rd_class);\n' +
            '\tunregister_chrdev_region(rd_base, RD_COUNT);\n' +
            '\tpr_info("unloaded\\n");\n' +
            '}\n' +
            '\n' +
            'module_init(rd_init);\n' +
            'module_exit(rd_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("RAM-backed character device, two minors");' },

          { t: 'p', x:
            'Phần lớn file bạn đã đọc ở phần lý thuyết. Bốn chỗ chưa được nói tới:' },

          { t: 'list', items: [
            '<b>Dòng 16–21</b>, <code>struct rd_dev</code>: mọi thứ thuộc về <b>một</b> thiết bị nằm ' +
              'chung một chỗ. Bộ đệm, độ dài, khoá, và chính <code>struct cdev</code>. Chính vì ' +
              '<code>cdev</code> nằm bên trong struct này mà <code>container_of</code> ở dòng 29 tìm ' +
              'ngược ra được thiết bị.',
            '<b>Dòng 32, 45, 72, 103</b>, <code>pr_debug</code>: mỗi <code>open</code>, <code>read</code>, ' +
              '<code>write</code>, <code>release</code> in một dòng. Đó là cửa sổ để bạn nhìn thấy ' +
              'kernel gọi driver lúc nào, với tham số gì. Bài 51 đã chỉ ra <code>pr_debug</code> chỉ ' +
              'tồn tại khi file được dịch với <code>-DDEBUG</code>, và Makefile ở bước 2 sẽ bật cờ đó.',
            '<b>Dòng 107–110</b>, <code>rd_llseek</code>: <code>fixed_size_llseek</code> là hàm có sẵn ' +
              'của kernel, cho phép <code>lseek</code> trong khoảng 0–4096 và từ chối phần còn lại. Bạn ' +
              'không phải tự viết phép tính <code>SEEK_SET</code>/<code>SEEK_CUR</code>/' +
              '<code>SEEK_END</code>.',
            '<b>Dòng 176–183</b>, hai nhãn <code>err_devs</code>/<code>err_region</code>: nếu minor 1 ' +
              'hỏng giữa chừng, vòng <code>while (--i &gt;= 0)</code> gỡ minor 0 đã dựng xong. Đường ' +
              'lỗi của <code>init</code> quan trọng ngang đường thành công. Bài 51 đã đo được một vụ ' +
              'rò rỉ 16 MiB chỉ vì <code>exit</code> không dọn.'
          ] },

          { t: 'cal', kind: 'why', title: 'Vì sao dữ liệu nằm trong bộ nhớ kernel mà không nằm trong file',
            x: 'Một "ram-disk" giữ dữ liệu trong RAM: <code>kzalloc(4096)</code> xin 4 KiB đã xoá về ' +
               '0 (<code>kmalloc</code> của Bài 51 cộng thêm <code>memset</code>). Dữ liệu sống chừng ' +
               'nào module còn nạp, và mất khi <code>rmmod</code> hoặc tắt máy. Đây không phải một ' +
               'driver đồ chơi vô dụng. Nó có đúng cấu trúc của một driver cảm biến hay cổng nối tiếp ' +
               'thật, chỉ khác là "phần cứng" là một mảng byte. Bài 56 sẽ thay mảng đó bằng thanh ghi ' +
               'MMIO, và <code>rd_read</code> sẽ đọc từ <code>readl</code> thay vì từ ' +
               '<code>rd-&gt;data</code>.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Build module',
        blocks: [
          { t: 'p', x:
            'Makefile giống hệt của Bài 50, chỉ đổi dòng <code>obj-m</code> và thêm dòng bật ' +
            '<code>pr_debug</code> mà Bài 51 đã giới thiệu:' },

          { t: 'code', where: 'file', name: '~/bai52/ramdisk/Makefile', lang: 'makefile', code:
            'obj-m := ramdisk.o\n' +
            'CFLAGS_ramdisk.o := -DDEBUG\n' +
            '\n' +
            'KDIR          ?= $(HOME)/bai38/linux-6.18.45\n' +
            'ARCH          ?= arm64\n' +
            'CROSS_COMPILE ?= aarch64-linux-gnu-\n' +
            '\n' +
            'all:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) modules\n' +
            '\n' +
            'clean:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) clean' },

          { t: 'cal', kind: 'warn', title: 'Dòng lệnh dưới all: và clean: bắt đầu bằng một Tab',
            x: 'Nếu trình soạn thảo hay thao tác dán đổi Tab thành dấu cách, <code>make</code> báo ' +
               '<code>missing separator</code> (Bài 50 đã có thông báo thật). Cách chắc ăn nhất: ' +
               '<code>cp ~/bai50/hello/Makefile .</code> rồi chỉ sửa hai dòng đầu.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai52/ramdisk\n' +
            'time make\n' +
            'ls -l ramdisk.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai52/ramdisk ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai52/ramdisk\'\n' +
            '  CC [M]  ramdisk.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  ramdisk.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  ramdisk.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai52/ramdisk\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '\n' +
            'real\t0m2.558s\n' +
            'user\t0m1.954s\n' +
            'sys\t0m0.611s\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 131296 Sep 29 19:47 ramdisk.ko' },

          { t: 'p', x:
            'Năm dòng <code>CC</code>/<code>MODPOST</code>/<code>LD</code> giống hệt Bài 50, và ' +
            '<b>không có cảnh báo nào</b>. <code>ramdisk.ko</code> nặng <b>131 296 B</b>, so với ' +
            '104 728 B của <code>hello.ko</code>. Phần lớn là thông tin debug, vì driver dài gấp bảy ' +
            'lần. Trên máy soạn bài, <code>~/bai38</code> là một liên kết mềm vào ' +
            '<code>~/embedded-course/bai38</code>, nên dòng <code>Entering directory</code> hiện ' +
            'đường dẫn thật. Trên máy bạn nó sẽ là <code>/home/&lt;tên_bạn&gt;/bai38/…</code>. Thời ' +
            'gian build và ngày giờ cũng sẽ khác.' },

          { t: 'p', x:
            'Bây giờ hỏi <code>.ko</code> xem nó cần những hàm nào của kernel, và kiểm tra hai trong ' +
            'số đó trong <code>Module.symvers</code>, như cách Bài 51 đã dạy:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-nm -u ramdisk.ko\n' +
            'grep -wE "class_create|device_create|cdev_add|alloc_chrdev_region" \\\n' +
            '  ~/bai38/linux-6.18.45/Module.symvers | awk \'{print $2, $4}\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '                 U alloc_chrdev_region\n' +
            '                 U __arch_copy_from_user\n' +
            '                 U __arch_copy_to_user\n' +
            '                 U cdev_add\n' +
            '                 U cdev_del\n' +
            '                 U cdev_init\n' +
            '                 U class_create\n' +
            '                 U class_destroy\n' +
            '                 U device_create\n' +
            '                 U device_destroy\n' +
            '                 U fixed_size_llseek\n' +
            '                 U kfree\n' +
            '                 U __kmalloc_cache_noprof\n' +
            '                 U kmalloc_caches\n' +
            '                 U memset\n' +
            '                 U __mutex_init\n' +
            '                 U mutex_lock\n' +
            '                 U mutex_unlock\n' +
            '                 U _printk\n' +
            '                 U unregister_chrdev_region\n' +
            'alloc_chrdev_region EXPORT_SYMBOL\n' +
            'cdev_add EXPORT_SYMBOL\n' +
            'device_create EXPORT_SYMBOL_GPL\n' +
            'class_create EXPORT_SYMBOL_GPL' },

          { t: 'cmdx', cmd: 'grep -wE "class_create|device_create|…" Module.symvers | awk \'{print $2, $4}\'',
            title: 'Tra loại export của bốn hàm',
            rows: [
              ['<code>-w</code>', 'Chỉ khớp cả từ.', 'Không có <code>-w</code>, <code>class_create</code> cũng khớp <code>class_create_file_ns</code>.'],
              ['<code>-E "a|b|c"</code>', 'Biểu thức chính quy mở rộng: một trong các tên.', 'Bài 11 khuyên luôn dùng <code>-E</code>; với nó, <code>|</code> là toán tử "hoặc" không cần thoát.'],
              ['<code>awk \'{print $2, $4}\'</code>', 'In cột 2 (tên hàm) và cột 4 (loại export).', 'Mỗi dòng <code>Module.symvers</code> có bốn cột: CRC, tên, nơi định nghĩa, loại. Bài 50 đã mở file này.']
            ] },

          { t: 'p', x:
            '<b>20</b> tên chưa định nghĩa. Nửa trên là những gì bạn gọi trực tiếp. Có bốn tên bạn ' +
            'không hề viết: <code>__arch_copy_to_user</code>/<code>__arch_copy_from_user</code> là thứ ' +
            'mà macro inline <code>copy_*_user</code> gọi xuống (Bài 51 đã gặp hiện tượng này với ' +
            '<code>__kmalloc_noprof</code>); <code>__kmalloc_cache_noprof</code> + ' +
            '<code>kmalloc_caches</code> là đích của <code>kzalloc</code> với kích thước biết trước ' +
            'lúc dịch; <code>memset</code> đến từ <code>struct rd_dev</code> được khởi tạo về 0. ' +
            'Dòng quan trọng nhất là hai dòng cuối: <code>class_create</code> và ' +
            '<code>device_create</code> là <b><code>EXPORT_SYMBOL_GPL</code></b>. Một driver không ' +
            'khai báo GPL sẽ build hỏng ngay ở bước <code>modpost</code>. Bảng Lỗi thường gặp có ' +
            'bốn dòng <code>ERROR</code> thật khi đổi <code>MODULE_LICENSE</code> sang ' +
            '<code>"Proprietary"</code>. Đây là hệ quả cụ thể nhất của bảng taint ở Bài 50: giấy ' +
            'phép không chỉ là một nhãn, nó quyết định hàm nào bạn được gọi.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Chương trình userspace và initramfs',
        blocks: [
          { t: 'p', x:
            '<code>echo</code> và <code>cat</code> chỉ cho bạn thấy dữ liệu, không cho thấy ' +
            '<code>errno</code>. Chương trình sau gọi thẳng các syscall và in mọi giá trị trả về, kể ' +
            'cả khi thất bại. Nó thử ba nhóm việc: đường bình thường, hai con trỏ hỏng, và ghi quá ' +
            'cuối thiết bị.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai52/app\n' +
            'nano rdtest.c' },

          { t: 'code', where: 'file', name: '~/bai52/app/rdtest.c', lang: 'c', code:
            '#include <errno.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <stdio.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            '/* Print what a system call returned, and errno when it failed */\n' +
            'static void report(const char *what, long ret)\n' +
            '{\n' +
            '\tif (ret < 0)\n' +
            '\t\tprintf("%-24s -> -1  errno %d (%s)\\n", what, errno, strerror(errno));\n' +
            '\telse\n' +
            '\t\tprintf("%-24s -> %ld\\n", what, ret);\n' +
            '}\n' +
            '\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '\tconst char *path = argc > 1 ? argv[1] : "/dev/ramdisk0";\n' +
            '\tconst char msg[] = "hello from userspace";\n' +
            '\tstatic char big[100];\n' +
            '\tchar buf[64] = { 0 };\n' +
            '\tlong n;\n' +
            '\tint fd;\n' +
            '\n' +
            '\tfd = open(path, O_RDWR);\n' +
            '\tif (fd < 0) {\n' +
            '\t\tperror(path);\n' +
            '\t\treturn 1;\n' +
            '\t}\n' +
            '\n' +
            '\t/* 1. the normal path: write, rewind, read back */\n' +
            '\treport("write(msg, 20)", write(fd, msg, strlen(msg)));\n' +
            '\treport("lseek(0, SEEK_SET)", lseek(fd, 0, SEEK_SET));\n' +
            '\tn = read(fd, buf, sizeof(buf) - 1);\n' +
            '\treport("read(buf, 63)", n);\n' +
            '\tprintf("    buf = \\"%s\\"\\n", buf);\n' +
            '\n' +
            '\t/* 2. bad pointers: the driver must answer -EFAULT, not crash */\n' +
            '\tlseek(fd, 0, SEEK_SET);\n' +
            '\treport("write(NULL, 8)", write(fd, NULL, 8));\n' +
            '\treport("read((void *)1, 8)", read(fd, (void *)1, 8));\n' +
            '\n' +
            '\t/* 3. the end of the device */\n' +
            '\treport("lseek(4090, SEEK_SET)", lseek(fd, 4090, SEEK_SET));\n' +
            '\treport("write(big, 100)", write(fd, big, sizeof(big)));\n' +
            '\treport("write(big, 100)", write(fd, big, sizeof(big)));\n' +
            '\n' +
            '\tclose(fd);\n' +
            '\treturn 0;\n' +
            '}' },

          { t: 'list', items: [
            '<code>report()</code> in <code>errno</code> <b>ngay</b> sau lời gọi hỏng. Bài 19 đã ' +
              'nhắc: <code>errno</code> chỉ có nghĩa ngay sau một lời gọi trả -1, gọi thêm bất kỳ hàm ' +
              'nào là nó có thể bị ghi đè.',
            '<code>write(fd, NULL, 8)</code> và <code>read(fd, (void *)1, 8)</code> cố ý đưa cho ' +
              'driver hai địa chỉ không hợp lệ. Bài 51 đã gọi <code>copy_from_user</code> với ' +
              '<code>NULL</code> từ bên trong module. Lần này con trỏ hỏng đi <b>đúng đường thật</b>: ' +
              'từ một chương trình, qua syscall, tới <code>rd_write</code>.',
            '<code>lseek(fd, 4090, SEEK_SET)</code> rồi ghi 100 byte hai lần: lần đầu chỉ còn 6 byte ' +
              'chỗ trống, lần thứ hai không còn byte nào.',
            '<code>static char big[100]</code> nằm trong <code>.bss</code> (Bài 18) nên toàn byte 0, ' +
              'không cần <code>memset</code>.'
          ] },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -O2 -Wall -static -o rdtest rdtest.c\n' +
            'ls -l rdtest\n' +
            './rdtest; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rwxr-xr-x 1 cah8hc cah8hc 603952 Sep 29 19:47 rdtest\n' +
            'bash: ./rdtest: cannot execute binary file: Exec format error\n' +
            'rc=126' },

          { t: 'p', x:
            '<code>-Wall</code> không in cảnh báo nào. <code>-static</code> vì initramfs của Bài 32 ' +
            'không có thư viện C (Bài 46 đã cho thấy chương trình động báo <code>not found</code> khi ' +
            'thiếu loader). File <b>603 952 B</b>, gần bằng <code>erase_mtd</code> tĩnh của Bài 48. ' +
            'Dòng thứ hai là lời nhắc có chủ ý: đây là mã máy ARM64, nên máy WSL x86-64 từ chối chạy ' +
            'nó với mã <b>126</b>, đúng như Bài 3 và Bài 47. Nếu máy bạn có cài ' +
            '<code>qemu-user-binfmt</code>, WSL sẽ chạy được nó qua QEMU user-mode, và bạn sẽ thấy ' +
            '<code>/dev/ramdisk0: No such file or directory</code> thay vì lỗi định dạng. Cả hai đều ' +
            'bình thường. Chương trình chỉ có nghĩa bên trong máy QEMU, nơi driver tồn tại.' },

          { t: 'p', x:
            'Đóng gói initramfs theo cách của Bài 50: chép cây của Bài 32, thả module và chương trình ' +
            'vào gốc.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai52\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp ramdisk/ramdisk.ko app/rdtest initramfs/\n' +
            'ls initramfs\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin\n' +
            'dev\n' +
            'init\n' +
            'proc\n' +
            'ramdisk.ko\n' +
            'rdtest\n' +
            'sys\n' +
            '5308 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1334922 Sep 29 19:47 initramfs.cpio.gz',
            notes: ['Bản ghi này chạy qua pipe nên <code>ls</code> in mỗi mục một dòng; trong terminal của bạn nó xếp thành cột. Nội dung giống nhau.'] },

          { t: 'p', x:
            'Năm mục của Bài 32 cộng hai file mới. <code>5308 blocks</code> (mỗi block 512 B) lớn hơn ' +
            '4689 của Bài 50 chủ yếu vì <code>rdtest</code> tĩnh nặng 590 KiB. Kích thước ' +
            '<code>.gz</code> sẽ lệch vài byte trên máy bạn, vì cpio ghi cả số inode và giờ sửa file ' +
            '(Bài 32 đã giải thích).' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Nạp driver, tạo node bằng hai cách',
        blocks: [
          { t: 'p', x:
            'Boot kernel của Bài 40 với initramfs vừa đóng gói. Dòng lệnh giống hệt Bài 50 và 51:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai52\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Khi dấu nhắc <code>~ #</code> hiện ra, trước khi nạp gì cả, hãy nhìn vào dải major động ' +
            'mà phần lý thuyết nói tới, và vào <code>/dev</code>:' },

          { t: 'code', where: 'qemu', code:
            'sed -n \'/Character/,/^$/p\' /proc/devices | tail -n 5\n' +
            'sed -n \'/Character/,/^$/p\' /proc/devices | awk \'$1>=234 && $1<=254\' | wc -l\n' +
            'ls /dev' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # sed -n \'/Character/,/^$/p\' /proc/devices | tail -n 5\n' +
            '252 pwm\n' +
            '253 ttyMV\n' +
            '254 gpiochip\n' +
            '511 rpmb\n' +
            '\n' +
            '~ # sed -n \'/Character/,/^$/p\' /proc/devices | awk \'$1>=234 && $1<=254\' | wc -l\n' +
            '21\n' +
            '~ # ls /dev\n' +
            'console' },

          { t: 'cmdx', cmd: 'sed -n \'/Character/,/^$/p\' /proc/devices | awk \'$1>=234 && $1<=254\' | wc -l',
            title: 'Đếm số major đã có chủ trong dải động',
            rows: [
              ['<code>sed -n \'/Character/,/^$/p\'</code>', 'Chỉ in từ dòng <code>Character devices:</code> tới dòng trống đầu tiên.', '<code>/proc/devices</code> có hai phần, ký tự rồi khối. Không cắt thì dòng <code>254 virtblk</code> của phần khối cũng bị đếm, và kết quả thành 22 (đã thử). Dải <code>/a/,/b/</code> của <code>sed</code> chọn mọi dòng từ dòng khớp <code>a</code> tới dòng khớp <code>b</code>; <code>^$</code> là dòng trống.'],
              ['<code>awk \'$1&gt;=234 &amp;&amp; $1&lt;=254\'</code>', 'Giữ dòng có cột 1 nằm trong 234–254.', 'Đúng dải mà <code>find_dynamic_major()</code> quét đầu tiên.'],
              ['<code>wc -l</code>', 'Đếm dòng.', '21 dòng cho 21 số, nghĩa là không còn số nào trống.']
            ] },

          { t: 'p', x:
            '<b>21</b> trên 21: dải 234–254 đầy kín. Dòng cuối của phần ký tự là <code>511 rpmb</code>, ' +
            'số cao nhất của dải mở rộng, đã bị driver <code>rpmb</code> lấy lúc boot. Theo đúng thuật ' +
            'toán ở phần lý thuyết, số tiếp theo kernel cấp phải là <b>510</b>. <code>/dev</code> chỉ ' +
            'có <code>console</code>, cái mà kernel tự tạo từ kho cpio 512 byte (Bài 46).' },

          { t: 'code', where: 'qemu', code:
            'insmod /ramdisk.ko\n' +
            'grep ramdisk /proc/devices\n' +
            'ls /sys/class/ramdisk\n' +
            'cat /sys/class/ramdisk/ramdisk0/uevent\n' +
            'ls /dev' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /ramdisk.ko\n' +
            '[   16.567399] ramdisk: loading out-of-tree module taints kernel.\n' +
            '[   16.575053] ramdisk: major 510, 2 devices of 4096 bytes\n' +
            '~ # grep ramdisk /proc/devices\n' +
            '510 ramdisk\n' +
            '~ # ls /sys/class/ramdisk\n' +
            'ramdisk0  ramdisk1\n' +
            '~ # cat /sys/class/ramdisk/ramdisk0/uevent\n' +
            'MAJOR=510\n' +
            'MINOR=0\n' +
            'DEVNAME=ramdisk0\n' +
            '~ # ls /dev\n' +
            'console' },

          { t: 'p', x:
            'Dự đoán đúng: <b>major 510</b>. Mỗi lệnh xác nhận một bước của hình "dựng lên":' },

          { t: 'list', items: [
            '<code>510 ramdisk</code> trong <code>/proc/devices</code> là kết quả của ' +
              '<code>alloc_chrdev_region</code>. Nhãn <code>ramdisk</code> là chuỗi bạn truyền vào.',
            '<code>/sys/class/ramdisk</code> có hai mục: <code>class_create</code> đã chạy, và ' +
              '<code>device_create</code> đã chạy hai lần.',
            'File <code>uevent</code> cho thấy chính xác những gì kernel gửi cho userspace khi có ' +
              'thiết bị mới: major, minor, và tên node nên tạo. Trên một hệ thống đủ đầy, ' +
              '<code>udev</code> hay <code>mdev</code> đọc đúng các trường này để đặt quyền và tạo liên ' +
              'kết mềm.',
            'Nhưng <code>ls /dev</code> <b>vẫn chỉ có <code>console</code></b>. Đúng như lời cảnh báo ' +
              'ở phần lý thuyết: devtmpfs đã tạo node, nhưng nó chưa được gắn vào <code>/dev</code>.'
          ] },

          { t: 'p', x:
            'Thời gian <code>16.5</code> giây là lúc bạn gõ lệnh, trên máy bạn sẽ khác. Số ' +
            '<b>510</b> thì sẽ giống, nếu bạn dùng đúng kernel <code>~/bai38</code>.' },

          { t: 'p', x:
            'Trước khi để devtmpfs làm việc, hãy tạo node theo cách cũ, bằng tay. Bạn tạo hai node: ' +
            'một với minor 0 mà driver có, một với minor 9 mà driver không có. Sau đó dùng thử cả hai:' },

          { t: 'code', where: 'qemu', code:
            'mknod /dev/rd0 c 510 0\n' +
            'mknod /dev/rd9 c 510 9\n' +
            'ls -l /dev\n' +
            'echo hi > /dev/rd0\n' +
            'cat /dev/rd0\n' +
            'cat /dev/rd9' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # mknod /dev/rd0 c 510 0\n' +
            '~ # mknod /dev/rd9 c 510 9\n' +
            '~ # ls -l /dev\n' +
            'total 0\n' +
            'crw-------    1 0        0           5,   1 Sep 29 12:54 console\n' +
            'crw-r--r--    1 0        0         510,   0 Sep 29 12:54 rd0\n' +
            'crw-r--r--    1 0        0         510,   9 Sep 29 12:54 rd9\n' +
            '~ # echo hi > /dev/rd0\n' +
            '~ # cat /dev/rd0\n' +
            'hi\n' +
            '~ # cat /dev/rd9\n' +
            'cat: can\'t open \'/dev/rd9\': No such device or address' },

          { t: 'cmdx', cmd: 'mknod /dev/rd0 c 510 0',
            title: 'Tạo một node thiết bị bằng tay',
            rows: [
              ['<code>/dev/rd0</code>', 'Tên file.', 'Tuỳ ý. Kernel không nhìn tên. Bạn cố ý đặt khác <code>ramdisk0</code> để thấy điều đó.'],
              ['<code>c</code>', 'Loại: thiết bị ký tự.', '<code>b</code> sẽ tạo thiết bị khối, và kernel sẽ tìm trong bảng driver khối, nơi không có 510.'],
              ['<code>510 0</code>', 'Major, minor.', '<code>mknod</code> không kiểm tra gì cả. Nó ghi hai số này vào inode, kể cả khi không driver nào nhận chúng.']
            ] },

          { t: 'p', x:
            '<code>mknod</code> nhận cả hai cặp số mà không phàn nàn. <code>ls -l</code> hiện chúng ' +
            'giống hệt nhau, chỉ khác số minor. Kết quả dùng thì khác hẳn:' },

          { t: 'list', items: [
            '<code>/dev/rd0</code> (510:0) hoạt động: <code>echo hi</code> ghi 3 byte, ' +
              '<code>cat</code> đọc lại <code>hi</code>. Tên <code>rd0</code> không liên quan gì tới ' +
              'chuỗi <code>ramdisk%d</code> trong driver. Cặp số đưa <code>open</code> tới đúng ' +
              '<code>cdev</code>, và chỉ vậy là đủ.',
            '<code>/dev/rd9</code> (510:9) hỏng với <code>No such device or address</code>, tức ' +
              '<code>ENXIO</code>. Driver chỉ <code>cdev_add</code> minor 0 và 1, nên ' +
              '<code>chrdev_open()</code> không tìm thấy gì cho 510:9 và dừng ở dòng 388, đúng ô cảnh ' +
              'báo của hình đầu bài. Hàm <code>rd_open</code> của bạn không hề được gọi.'
          ] },

          { t: 'p', x:
            'Giờ gắn devtmpfs lên <code>/dev</code>, bằng đúng dòng mà <code>/init</code> của Bài 48 ' +
            'đã phải thêm:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls -l /dev/ramdisk*\n' +
            'cat /dev/ramdisk0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # mount -t devtmpfs none /dev\n' +
            '~ # ls -l /dev/ramdisk*\n' +
            'crw-------    1 0        0         510,   0 Sep 29 12:54 /dev/ramdisk0\n' +
            'crw-------    1 0        0         510,   1 Sep 29 12:54 /dev/ramdisk1\n' +
            '~ # cat /dev/ramdisk0\n' +
            'hi' },

          { t: 'p', x:
            'Hai node hiện ra ngay, đúng tên <code>ramdisk0</code>/<code>ramdisk1</code>, đúng cặp số ' +
            '<code>510, 0</code>/<code>510, 1</code>. Chúng đã tồn tại từ lúc <code>insmod</code>, ' +
            'chỉ là trước đó bạn không nhìn thấy chúng. Có ba chi tiết đáng để ý:' },

          { t: 'list', items: [
            'Quyền là <code>crw-------</code> (chỉ root), khác <code>crw-r--r--</code> của ' +
              '<code>mknod</code>. devtmpfs dùng mặc định an toàn nhất. Trên một bản phân phối thật, ' +
              '<code>udev</code> đổi quyền theo quy tắc sau khi nhận <code>uevent</code>.',
            '<code>rd0</code> và <code>rd9</code> <b>đã biến mất</b>. Chúng không bị xoá. devtmpfs ' +
              'được gắn <b>đè lên</b> thư mục <code>/dev</code> cũ, nên các file cũ bị che đi, giống một tờ giấy đặt lên bàn che những gì bên dưới. <code>umount /dev</code> sẽ làm chúng hiện lại.',
            '<code>cat /dev/ramdisk0</code> in <code>hi</code>, chữ bạn vừa ghi qua ' +
              '<code>/dev/rd0</code>. Hai file khác tên, cùng cặp số 510:0, cùng một bộ đệm 4 KiB trong ' +
              'kernel. Đây là bằng chứng rõ nhất rằng <b>tên file chỉ là nhãn</b>.'
          ] }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Đọc, ghi, và nghe kernel gọi driver',
        blocks: [
          { t: 'p', x:
            'Dùng các công cụ quen thuộc của shell. Mỗi lệnh ứng với một hoặc vài lời gọi hàm trong ' +
            'driver:' },

          { t: 'code', where: 'qemu', code:
            'echo hello > /dev/ramdisk0\n' +
            'cat /dev/ramdisk0\n' +
            'echo world >> /dev/ramdisk0\n' +
            'cat /dev/ramdisk0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo hello > /dev/ramdisk0\n' +
            '~ # cat /dev/ramdisk0\n' +
            'hello\n' +
            '~ # echo world >> /dev/ramdisk0\n' +
            '~ # cat /dev/ramdisk0\n' +
            'hello\n' +
            'world' },

          { t: 'p', x:
            'Ba điều được xác nhận. <code>&gt;</code> đã xoá chữ <code>hi</code> cũ, vì ' +
            '<code>rd_open</code> thấy <code>O_TRUNC</code>. <code>&gt;&gt;</code> nối thêm, vì ' +
            '<code>rd_write</code> thấy <code>O_APPEND</code>. Và <code>cat</code> dừng lại đúng lúc, ' +
            'không in rác sau <code>world</code>. Nhưng từ bên ngoài bạn không thấy <b>vì sao</b>. Các ' +
            'dòng <code>pr_debug</code> thì cho thấy:' },

          { t: 'code', where: 'qemu', code:
            'dmesg | tail -n 15' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   36.094194] ramdisk: release minor 0\n' +
            '[   37.592766] ramdisk: open    minor 0 flags 0x20241\n' +
            '[   37.593451] ramdisk: write   count 6 pos 0 -> 6\n' +
            '[   37.593706] ramdisk: release minor 0\n' +
            '[   39.101230] ramdisk: open    minor 0 flags 0x20000\n' +
            '[   39.101962] ramdisk: read    count 65536 pos 0 -> 6\n' +
            '[   39.102533] ramdisk: read    count 65536 pos 6 -> 0\n' +
            '[   39.102981] ramdisk: release minor 0\n' +
            '[   40.596729] ramdisk: open    minor 0 flags 0x20441\n' +
            '[   40.597420] ramdisk: write   count 6 pos 6 -> 6\n' +
            '[   40.597786] ramdisk: release minor 0\n' +
            '[   42.110106] ramdisk: open    minor 0 flags 0x20000\n' +
            '[   42.111000] ramdisk: read    count 65536 pos 0 -> 12\n' +
            '[   42.111696] ramdisk: read    count 65536 pos 12 -> 0\n' +
            '[   42.112769] ramdisk: release minor 0' },

          { t: 'p', x:
            'Dòng đầu là đuôi của lệnh <code>cat</code> ở bước 4. Mười bốn dòng còn lại là bốn lệnh ' +
            'bạn vừa gõ, mỗi lệnh một cụm <code>open</code> … <code>release</code>:' },

          { t: 'table',
            head: ['Lệnh shell', 'Dấu vết trong driver', 'Đọc thế nào'],
            rows: [
              ['<code>echo hello &gt;</code>', '<code>flags 0x20241</code>, <code>write count 6 pos 0</code>',
               '<code>0x241</code> = <code>O_WRONLY</code> (1) + <code>O_CREAT</code> (0x40) + <code>O_TRUNC</code> (0x200). 6 byte là <code>hello</code> cộng ký tự xuống dòng.'],
              ['<code>cat</code>', '<code>flags 0x20000</code>, hai lần <code>read count 65536</code>',
               '<code>O_RDONLY</code> = 0. Lần 1 nhận 6 byte. Lần 2 bắt đầu ở <code>pos 6</code>, driver trả <b>0</b>, và <code>cat</code> hiểu là hết file, dừng lại.'],
              ['<code>echo world &gt;&gt;</code>', '<code>flags 0x20441</code>, <code>write count 6 pos 6</code>',
               '<code>0x400</code> là <code>O_APPEND</code>. <code>pos 6</code>: driver ghi sau <code>hello\\n</code>, không ghi đè.'],
              ['<code>cat</code>', '<code>read … pos 0 -&gt; 12</code> rồi <code>pos 12 -&gt; 0</code>',
               'Giờ có 12 byte. Vẫn đúng hai lần <code>read</code>.']
            ] },

          { t: 'cal', kind: 'info', title: 'Còn 0x20000 là gì',
            x: 'Mọi dòng <code>open</code> đều có bit <code>0x20000</code>, dù không lệnh nào yêu cầu. ' +
               'Đó là <code>O_LARGEFILE</code> trên ARM64 (<code>arch/arm64/include/uapi/asm/fcntl.h:26</code> ' +
               'viết nó ở hệ bát phân, <code>0400000</code>). Trên kiến trúc 64 bit, kernel tự thêm cờ ' +
               'này vào mọi lần mở (<code>fs/open.c:1458</code>, <code>force_o_largefile()</code>). Bạn ' +
               'không cần làm gì với nó. Nhưng đừng viết <code>if (filp-&gt;f_flags == O_WRONLY)</code>: ' +
               'điều kiện đó không bao giờ đúng. Hãy lọc bằng <code>O_ACCMODE</code> như dòng 35 của ' +
               'driver.' },

          { t: 'cal', kind: 'tip', title: 'Hình dung *ppos như một dấu trang',
            x: '<code>*ppos</code> là dấu trang kẹp trong <b>một lần mở</b> file. <code>read</code> đọc ' +
               'từ dấu trang, rồi dời nó đi đúng số byte đã đọc. Lần mở mới bắt đầu với dấu trang ở ' +
               'đầu sách. Hai dòng <code>read</code> của mỗi <code>cat</code> cho thấy dấu trang di ' +
               'chuyển: <code>pos 0</code> rồi <code>pos 6</code>. Lần đọc thứ hai trả 0 vì dấu trang ' +
               'đã nằm ở trang cuối. Bước 6 sẽ cho bạn xem một driver quên dời dấu trang.' },

          { t: 'p', x:
            'Hai minor là hai thiết bị độc lập, mỗi cái một bộ đệm riêng. Kiểm tra minor 1, rồi chạy ' +
            'chương trình C:' },

          { t: 'code', where: 'qemu', code:
            'wc -c < /dev/ramdisk1\n' +
            '/rdtest' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # wc -c < /dev/ramdisk1\n' +
            '0\n' +
            '~ # /rdtest\n' +
            'write(msg, 20)           -> 20\n' +
            'lseek(0, SEEK_SET)       -> 0\n' +
            'read(buf, 63)            -> 20\n' +
            '    buf = "hello from userspace"\n' +
            'write(NULL, 8)           -> -1  errno 14 (Bad address)\n' +
            'read((void *)1, 8)       -> -1  errno 14 (Bad address)\n' +
            'lseek(4090, SEEK_SET)    -> 4090\n' +
            'write(big, 100)          -> 6\n' +
            'write(big, 100)          -> -1  errno 28 (No space left on device)' },

          { t: 'p', x:
            '<code>/dev/ramdisk1</code> có <b>0</b> byte: mọi thứ bạn ghi đều vào minor 0. Còn ' +
            '<code>rdtest</code> thì in chín dòng, mỗi dòng là một điều khoản của hợp đồng ' +
            '<code>read</code>/<code>write</code>:' },

          { t: 'list', items: [
            '<b>Ba dòng đầu</b>: ghi 20 byte, <code>lseek</code> về 0 (<code>fixed_size_llseek</code> ' +
              'làm việc), đọc lại được 20 byte dù xin 63. Driver cắt <code>count</code> theo ' +
              '<code>rd-&gt;len</code>.',
            '<b><code>errno 14 (Bad address)</code></b> hai lần. 14 là <code>EFAULT</code>. Con trỏ ' +
              '<code>NULL</code> đi vào <code>rd_write</code>, <code>copy_from_user</code> trả 8 (không ' +
              'chép được byte nào), driver trả <code>-EFAULT</code>, và kernel đổi nó thành ' +
              '<code>-1</code> cộng <code>errno = 14</code>. Đó chính là lời hứa của Bài 51: ' +
              '<code>-EFAULT</code> đến tay một chương trình thật, và kernel không sập.',
            '<b><code>write(big, 100) -&gt; 6</code></b>: từ vị trí 4090 chỉ còn 6 byte. Ghi thiếu là ' +
              'hợp lệ. Chương trình phải tự kiểm tra con số trả về.',
            '<b><code>errno 28 (No space left on device)</code></b>: lần ghi tiếp theo bắt đầu ở ' +
              '4096, driver trả <code>-ENOSPC</code>.'
          ] },

          { t: 'p', x:
            'Tính theo từng byte, bộ đệm của minor 0 giờ trông thế nào? <code>od -c</code> in từng ' +
            'byte một:' },

          { t: 'code', where: 'qemu', code:
            'od -c /dev/ramdisk0 | head -n 2' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # od -c /dev/ramdisk0 | head -n 2\n' +
            '0000000  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0   o   m       u   s   e   r   s\n' +
            '0000020   p   a   c   e  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0' },

          { t: 'p', x:
            'Tám byte <code>\\0</code> đầu tiên, rồi <code>om userspace</code>. Tám byte đó chính là ' +
            '<code>write(NULL, 8)</code> để lại. Khi <code>copy_from_user</code> thất bại, nó ' +
            '<b>xoá về 0</b> phần đích không chép được (<code>include/linux/uaccess.h:183</code>, ' +
            '<code>memset(to + (n - res), 0, res)</code>). Kernel làm vậy để bộ đệm kernel không bao ' +
            'giờ chứa rác cũ có thể rò ra ngoài. Hệ quả cho driver này: một lần ghi thất bại vẫn ' +
            '<b>ghi đè</b> dữ liệu, dù chương trình nhận <code>-EFAULT</code>. Driver chuyên nghiệp ' +
            'chép vào một bộ đệm tạm trước, rồi mới chép vào vùng dữ liệu thật khi thành công. ' +
            'Driver của bài chấp nhận khuyết điểm này để mã ngắn, nhưng bây giờ bạn đã biết nó tồn ' +
            'tại.' },

          { t: 'p', x:
            'Cuối cùng, <code>dd</code> thử ghi 5 KiB vào một thiết bị chỉ có 4 KiB:' },

          { t: 'code', where: 'qemu', code:
            'dd if=/dev/zero of=/dev/ramdisk1 bs=1024 count=5\n' +
            'wc -c < /dev/ramdisk1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # dd if=/dev/zero of=/dev/ramdisk1 bs=1024 count=5\n' +
            'dd: error writing \'/dev/ramdisk1\': No space left on device\n' +
            '5+0 records in\n' +
            '4+0 records out\n' +
            '~ # wc -c < /dev/ramdisk1\n' +
            '4096' },

          { t: 'p', x:
            '<code>5+0 records in</code>: <code>dd</code> đọc đủ 5 khối từ <code>/dev/zero</code> ' +
            '(driver <code>mem</code>, major 1, minor 5, cùng họ với driver của bạn). ' +
            '<code>4+0 records out</code>: chỉ 4 khối vào được <code>/dev/ramdisk1</code>, khối thứ ' +
            'năm nhận <code>ENOSPC</code>, và <code>dd</code> in đúng thông báo ' +
            '<code>No space left on device</code> mà <code>rdtest</code> vừa in. <code>wc -c</code> ' +
            'xác nhận <b>4096</b>. Một công cụ bạn không viết đã hiểu mã lỗi của driver bạn viết.' },

          { t: 'p', x:
            'Giờ đến <code>.owner = THIS_MODULE</code>. Mở một file descriptor tới thiết bị và giữ nó ' +
            'mở, bằng lệnh <code>exec</code> của shell (Bài 10), rồi thử gỡ driver:' },

          { t: 'code', where: 'qemu', code:
            'lsmod\n' +
            'exec 3< /dev/ramdisk0\n' +
            'lsmod\n' +
            'rmmod ramdisk' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'ramdisk                12288  0 \n' +
            '~ # exec 3< /dev/ramdisk0\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'ramdisk                12288  1 \n' +
            '~ # rmmod ramdisk\n' +
            'rmmod: can\'t unload module \'ramdisk\': Resource temporarily unavailable' },

          { t: 'cmdx', cmd: 'exec 3< /dev/ramdisk0',
            title: 'Giữ một file mở ngay trong shell',
            rows: [
              ['<code>exec</code>', 'Không kèm lệnh: áp dụng chuyển hướng lên chính shell đang chạy.', 'Bài 10 đã dùng <code>exec</code> để thay shell. Không có lệnh theo sau, nó chỉ mở hoặc đóng fd của shell.'],
              ['<code>3&lt; /dev/ramdisk0</code>', 'Mở file để đọc, gán vào fd số 3.', 'fd 0/1/2 đã có chủ (Bài 19). fd 3 sống cho tới khi shell thoát hoặc bạn đóng nó.']
            ] },

          { t: 'p', x:
            'Cột <code>Used by</code> nhảy từ <b>0</b> lên <b>1</b> ngay khi fd 3 được mở. Đó là ' +
            '<code>fops_get()</code> trong <code>chrdev_open()</code>: nó gọi ' +
            '<code>try_module_get(fops-&gt;owner)</code> và tăng bộ đếm tham chiếu của module ghi ' +
            'trong <code>.owner</code>. <code>rmmod</code> thấy bộ đếm khác 0 và từ chối với ' +
            '<code>EWOULDBLOCK</code> (<code>kernel/module/main.c:750</code>), cùng giá trị với ' +
            '<code>EAGAIN</code>, nên BusyBox in <code>Resource temporarily unavailable</code>. Nếu ' +
            'không có <code>.owner</code>, <code>rmmod</code> sẽ thành công, mã của ' +
            '<code>rd_read</code> sẽ bị giải phóng, và lần <code>read</code> tiếp theo trên fd 3 sẽ ' +
            'nhảy vào vùng nhớ đã bị trả lại. Đó là một oops, hoặc tệ hơn. <code>G</code> ở cuối ' +
            'dòng tiêu đề là giới hạn đã biết của <code>lsmod</code> BusyBox, không phải trạng thái ' +
            'taint thật (Bài 50).' },

          { t: 'code', where: 'qemu', code:
            'exec 3<&-\n' +
            'rmmod ramdisk\n' +
            'ls /dev/ramdisk* /sys/class/ramdisk\n' +
            'grep -c ramdisk /proc/devices' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # exec 3<&-\n' +
            '~ # rmmod ramdisk\n' +
            '[   60.143634] ramdisk: unloaded\n' +
            '~ # ls /dev/ramdisk* /sys/class/ramdisk\n' +
            'ls: /dev/ramdisk*: No such file or directory\n' +
            'ls: /sys/class/ramdisk: No such file or directory\n' +
            '~ # grep -c ramdisk /proc/devices\n' +
            '0' },

          { t: 'p', x:
            '<code>3&lt;&amp;-</code> đóng fd 3, bộ đếm về 0, và <code>rmmod</code> chạy được. Ba lệnh ' +
            'kiểm tra xác nhận <code>rd_exit</code> đã dỡ đủ ba tầng: node trong devtmpfs ' +
            '(<code>device_destroy</code>), thư mục class (<code>class_destroy</code>), và major 510 ' +
            'trong <code>/proc/devices</code> (<code>unregister_chrdev_region</code>). <code>grep ' +
            '-c</code> đếm <b>0</b> dòng. Không còn dấu vết nào. Tắt máy ảo bằng ' +
            '<code>poweroff -f</code>.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — Một driver quên *ppos, và một node không có driver',
        blocks: [
          { t: 'p', x:
            'Lỗi kinh điển nhất khi viết <code>read</code> là quên tăng <code>*ppos</code>. Tạo một ' +
            'bản sao của driver, xoá đúng một dòng bằng <code>sed</code>, rồi build nó:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai52/bug && cd ~/bai52/bug\n' +
            'sed \'/\\*ppos += count;/d\' ../ramdisk/ramdisk.c > ramdisk.c\n' +
            'diff ../ramdisk/ramdisk.c ramdisk.c\n' +
            'cp ../ramdisk/Makefile .\n' +
            'make 2>&1 | grep -E "warning|LD"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '68d67\n' +
            '< \t*ppos += count;\n' +
            '  LD [M]  ramdisk.ko' },

          { t: 'cmdx', cmd: 'sed \'/\\*ppos += count;/d\' ../ramdisk/ramdisk.c > ramdisk.c',
            title: 'Xoá một dòng theo nội dung',
            rows: [
              ['<code>/…/d</code>', 'Với mọi dòng khớp mẫu, xoá (<code>d</code>, delete).', 'Chỉ dòng 68 trong <code>rd_read</code> khớp. <code>rd_write</code> viết <code>*ppos = pos + count</code>, nên nó được giữ nguyên.'],
              ['<code>\\*</code>', 'Dấu sao thật, không phải toán tử lặp.', 'Không thoát thì <code>*</code> ở đầu mẫu mang nghĩa khác, và mẫu có thể khớp sai dòng.'],
              ['<code>&gt; ramdisk.c</code>', 'Ghi kết quả sang file mới.', 'Bản gốc trong <code>../ramdisk</code> không bị động tới.']
            ] },

          { t: 'p', x:
            '<code>diff</code> xác nhận đúng một dòng bị mất: <code>68d67</code> nghĩa là "dòng 68 ' +
            'của file cũ bị xoá, file mới tiếp tục ở dòng 67". Và <code>grep</code> không tìm thấy chữ ' +
            '<code>warning</code> nào: <b>trình biên dịch không có cách nào biết đây là lỗi</b>. Mã ' +
            'vẫn đúng cú pháp, đúng kiểu. Chỉ có hợp đồng với userspace là bị phá.' },

          { t: 'p', x:
            'Thêm module lỗi vào initramfs dưới một tên khác, rồi đóng gói lại:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai52\n' +
            'cp bug/ramdisk.ko initramfs/ramdisk_bug.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '5565 blocks' },

          { t: 'p', x:
            '<code>5565</code> so với <code>5308</code> của bước 3: thêm 257 block, tức khoảng 128 KiB, ' +
            'đúng bằng một file <code>.ko</code> nữa. Boot lại bằng đúng lệnh <code>qemu-system-aarch64</code> ' +
            'của bước 4. Lần này đừng gắn devtmpfs. Tạo node bằng tay <b>trước</b> khi có driver, ' +
            'rồi thử dùng nó ở ba thời điểm:' },

          { t: 'code', where: 'qemu', code:
            'mknod /dev/rd0 c 510 0\n' +
            'cat /dev/rd0\n' +
            'insmod /ramdisk.ko\n' +
            'cat /dev/rd0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # mknod /dev/rd0 c 510 0\n' +
            '~ # cat /dev/rd0\n' +
            'cat: can\'t open \'/dev/rd0\': No such device or address\n' +
            '~ # insmod /ramdisk.ko\n' +
            '[   21.736524] ramdisk: loading out-of-tree module taints kernel.\n' +
            '[   21.748395] ramdisk: major 510, 2 devices of 4096 bytes\n' +
            '~ # cat /dev/rd0' },

          { t: 'p', x:
            'Cùng một file <code>/dev/rd0</code>, hai kết quả khác nhau. Trước <code>insmod</code>: ' +
            '<code>ENXIO</code>, vì 510:0 chưa có <code>cdev</code>. Sau <code>insmod</code>: ' +
            '<code>cat</code> thành công và không in gì, vì bộ đệm mới cấp đang rỗng ' +
            '(<code>rd-&gt;len = 0</code>, lần <code>read</code> đầu tiên trả ngay 0). File không đổi, ' +
            'chỉ có bảng <code>cdev_map</code> trong kernel đổi. Đây là lý do một node tạo bằng ' +
            '<code>mknod</code> trong rootfs vẫn dùng được với một driver nạp sau, miễn là major ' +
            'trùng. Cũng là lý do major động làm hỏng cách làm đó: lần boot sau, kernel khác có thể ' +
            'cấp một số khác.' },

          { t: 'p', x:
            'Giờ thay driver đúng bằng driver lỗi, rồi đọc lại. <code>head -c 40</code> giới hạn đầu ' +
            'ra ở 40 byte:' },

          { t: 'code', where: 'qemu', code:
            'rmmod ramdisk\n' +
            'insmod /ramdisk_bug.ko\n' +
            'echo hello > /dev/rd0\n' +
            'head -c 40 /dev/rd0 | od -c\n' +
            'dmesg | tail -n 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod ramdisk\n' +
            '[   24.271195] ramdisk: unloaded\n' +
            '~ # insmod /ramdisk_bug.ko\n' +
            '[   25.782529] ramdisk: major 510, 2 devices of 4096 bytes\n' +
            '~ # echo hello > /dev/rd0\n' +
            '~ # head -c 40 /dev/rd0 | od -c\n' +
            '0000000   h   e   l   l   o  \\n   h   e   l   l   o  \\n   h   e   l   l\n' +
            '0000020   o  \\n   h   e   l   l   o  \\n   h   e   l   l   o  \\n   h   e\n' +
            '0000040   l   l   o  \\n   h   e   l   l\n' +
            '0000050\n' +
            '~ # dmesg | tail -n 4\n' +
            '[   28.792798] ramdisk: read    count 4096 pos 0 -> 6\n' +
            '[   28.792931] ramdisk: read    count 4096 pos 0 -> 6\n' +
            '[   28.793004] ramdisk: read    count 4096 pos 0 -> 6\n' +
            '[   28.794581] ramdisk: release minor 0',
            notes: ['Thời điểm trong ngoặc vuông là của một lần chạy (lần này là lần chạy ghi lại riêng cho bước 6), trên máy bạn sẽ khác. Lần chạy ghi lại ở đây có hai lệnh <code>insmod</code> cách nhau vài giây nên không có dòng <code>taints kernel</code> ở lần thứ hai: taint chỉ được báo một lần mỗi lần boot.'] },

          { t: 'p', x:
            '<code>ramdisk_bug.ko</code> vẫn tự gọi mình là <code>ramdisk</code> (tên module lấy từ tên ' +
            'file lúc build, Bài 50), nên phải <code>rmmod ramdisk</code> trước. Nếu không, bạn sẽ ' +
            'nhận <code>File exists</code>. Node <code>/dev/rd0</code> cũ lập tức dùng được với driver ' +
            'mới. Và kết quả là <code>hello\\n</code> lặp mãi. Ba dòng <code>read</code> cuối cho biết ' +
            'vì sao: mỗi lần <code>head</code> gọi <code>read</code>, driver nhận <b><code>pos 0</code></b>, ' +
            'trả 6 byte, nhưng không dời dấu trang. Lần sau lại <code>pos 0</code>, lại 6 byte. Driver ' +
            'không bao giờ trả 0, nên chương trình không bao giờ biết đã hết file. <code>head -c 40</code> ' +
            'dừng được chỉ vì nó tự đếm tới 40 byte. <code>count 4096</code> chứ không phải 65 536 như ' +
            '<code>cat</code>: mỗi công cụ tự chọn kích thước bộ đệm của mình, và driver phải chạy đúng ' +
            'với mọi kích thước.' },

          { t: 'p', x:
            'Còn <code>cat</code>, vốn đọc tới khi gặp 0? Đừng chạy nó trần, vì nó sẽ không bao giờ ' +
            'dừng. Chạy nó với <code>timeout</code> để giới hạn thời gian:' },

          { t: 'code', where: 'qemu', code:
            'timeout 2 cat /dev/rd0 | wc -c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # timeout 2 cat /dev/rd0 | wc -c\n' +
            '41880\n' +
            'Terminated' },

          { t: 'p', x:
            'Trong 2 giây, <code>cat</code> đọc được <b>41 880</b> byte từ một thiết bị chỉ chứa 6 byte, ' +
            'và phải bị <code>timeout</code> giết (<code>Terminated</code>). Con số này phụ thuộc vào ' +
            'tốc độ máy: hai lần chạy khi soạn bài cho ra 38 658 và 43 110. Trên máy bạn nó sẽ khác, ' +
            'nhưng luôn là "rất nhiều lần 6". Trên một hệ thống thật, <code>cat</code> kiểu này sẽ ' +
            'đổ đầy đĩa nếu đầu ra được chuyển vào file.' },

          { t: 'code', where: 'qemu', code:
            'rmmod ramdisk\n' +
            'poweroff -f' },

          { t: 'cal', kind: 'why', title: 'Vì sao lỗi này đáng một bước riêng',
            x: 'Mọi lỗi khác trong bài đều có người bắt: trình biên dịch (<code>class_create</code> ' +
               'sai chữ ký), <code>modpost</code> (<code>GPL-only symbol</code>), kernel ' +
               '(<code>ENXIO</code>, <code>EFAULT</code>). Lỗi quên <code>*ppos</code> thì không ai bắt ' +
               'cả. Nó build sạch, nạp sạch, <code>echo</code> vẫn chạy, <code>head -c</code> vẫn cho ra ' +
               'đúng số byte. Chỉ có một công cụ đọc tới cuối file mới lộ ra nó, và lúc đó triệu chứng ' +
               'là "chương trình treo", rất xa nguyên nhân thật. Cách phát hiện nhanh nhất là đúng ' +
               'cái bạn vừa làm: một dòng <code>pr_debug</code> in <code>pos</code>. Nếu <code>pos</code> ' +
               'không đổi giữa các lần <code>read</code>, bạn đã tìm ra lỗi.' },

          { t: 'p', x:
            'Thư mục <code>~/bai52</code> nặng khoảng 5,7 MB. Hãy <b>giữ <code>~/bai52/ramdisk</code></b>: ' +
            'Bài 53 sẽ thêm <code>ioctl</code> và một thuộc tính sysfs vào chính driver này. ' +
            '<code>bug/</code> và <code>initramfs*</code> xoá được.' }
        ] }
    ] },

    /* ============================================================
       7. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>can\'t open \'/dev/…\': No such device or address</code> (<code>ENXIO</code>)',
         'Node tồn tại nhưng không <code>cdev</code> nào nhận cặp số của nó: driver chưa nạp, đã gỡ, sai major, hoặc minor nằm ngoài dải driver đã <code>cdev_add</code>.',
         'So <code>ls -l /dev/tên</code> với <code>grep tên /proc/devices</code> và dòng <code>major</code> trong <code>dmesg</code>. Dùng devtmpfs thay vì <code>mknod</code> để cặp số luôn đúng.'],
        ['<code>ls /dev</code> không có node dù <code>insmod</code> thành công và <code>/sys/class/…</code> có mục',
         'devtmpfs đã tạo node nhưng chưa được gắn vào <code>/dev</code>. Hay gặp với initramfs: kernel không tự gắn nó (Bài 46).',
         '<code>mount -t devtmpfs none /dev</code>, hoặc thêm dòng đó vào <code>/init</code> như Bài 48.'],
        ['<code>error: too many arguments to function ‘class_create’</code>',
         'Mã viết cho kernel trước 6.4: <code>class_create(THIS_MODULE, "tên")</code>.',
         'Bỏ tham số đầu: <code>class_create("tên")</code>. Kiểm tra chữ ký trong <code>include/linux/device/class.h</code> của cây đang build.'],
        ['<code>ERROR: modpost: GPL-incompatible module ramdisk.ko uses GPL-only symbol \'device_create\'</code> (cùng lúc với <code>class_create</code>, <code>class_destroy</code>, <code>device_destroy</code>)',
         '<code>MODULE_LICENSE</code> không phải GPL, trong khi bốn hàm này là <code>EXPORT_SYMBOL_GPL</code>. <code>make</code> dừng với mã 2, không có <code>.ko</code>.',
         'Dùng <code>MODULE_LICENSE("GPL")</code>. Tra loại export bằng <code>grep -w tên Module.symvers</code>.'],
        ['<code>warning: ignoring return value of ‘copy_to_user’ … [-Wunused-result]</code>',
         'Gọi <code>copy_*_user</code> mà không kiểm tra giá trị trả về. Hàm được khai báo <code>__must_check</code>.',
         'Luôn viết <code>if (copy_to_user(…)) return -EFAULT;</code> (hoặc <code>goto</code> tới nhãn mở khoá).'],
        ['<code>cat</code> không bao giờ dừng, in lặp lại cùng một nội dung',
         '<code>read</code> không tăng <code>*ppos</code>, nên không bao giờ trả 0.',
         'Thêm <code>*ppos += count;</code>. Một dòng <code>pr_debug</code> in <code>pos</code> cho thấy lỗi ngay: <code>pos</code> không đổi giữa các lần gọi.'],
        ['<code>echo … &gt;&gt; /dev/…</code> ghi đè thay vì nối thêm, hoặc <code>&gt;</code> không xoá nội dung cũ',
         'Driver bỏ qua <code>O_APPEND</code>/<code>O_TRUNC</code> trong <code>filp-&gt;f_flags</code>. Với thiết bị ký tự, kernel không xử lý hộ hai cờ này.',
         'Kiểm tra cờ trong <code>open</code>/<code>write</code>, lọc chế độ truy cập bằng <code>O_ACCMODE</code> (đừng so sánh <code>f_flags</code> trực tiếp, vì luôn có thêm <code>O_LARGEFILE</code>).'],
        ['<code>rmmod: can\'t unload module \'…\': Resource temporarily unavailable</code>',
         'Còn ít nhất một file đang mở trên thiết bị. <code>.owner = THIS_MODULE</code> giữ module lại. Cột <code>Used by</code> của <code>lsmod</code> khác 0.',
         'Đóng mọi fd trước (<code>exec 3&lt;&amp;-</code>, thoát chương trình đang giữ nó), rồi <code>rmmod</code> lại. Không bao giờ bỏ <code>.owner</code> để \"sửa\" lỗi này.'],
        ['<code>write</code> trả <code>-1</code>, <code>errno 28 (No space left on device)</code>; <code>dd</code> báo <code>4+0 records out</code>',
         'Đã ghi tới cuối vùng 4 KiB. Driver trả <code>-ENOSPC</code>. Đây là hành vi đúng, không phải lỗi.',
         'Nếu cần nhiều chỗ hơn, đổi <code>RD_SIZE</code>. Trên 4 MiB phải dùng <code>vmalloc</code> (Bài 51).'],
        ['<code>insmod: can\'t insert \'/ramdisk_bug.ko\': File exists</code>',
         'Tên module lấy từ tên file lúc build (<code>ramdisk.c</code> → <code>ramdisk</code>). Đổi tên file <code>.ko</code> không đổi tên module, nên nó trùng với <code>ramdisk</code> đang nạp.',
         '<code>rmmod ramdisk</code> trước, rồi mới <code>insmod</code> bản kia.']
      ] },

    /* ============================================================
       8. RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<b>Tên file chỉ là nhãn</b>: <code>/dev/rd0</code> và <code>/dev/ramdisk0</code> cùng cặp <b>510:0</b> đọc ra cùng một chữ <code>hi</code>. Kernel đi từ inode → cặp số → <code>cdev</code> → <code>file_operations</code>.',
      '<b><code>alloc_chrdev_region</code></b> xin major động. Kernel này cấp <b>510</b>, vì cả <b>21</b> số trong dải 234–254 và số 511 đều đã có chủ. Driver in major của mình ra, không đoán.',
      '<b><code>cdev_add</code></b> là lúc thiết bị \"sống\": sau nó, <code>open</code> chạy được. Chuẩn bị mọi thứ trước nó, gỡ nó đầu tiên. Không có <code>cdev</code> cho cặp số → <b><code>ENXIO</code></b>.',
      '<b><code>device_create</code></b> tạo <code>/sys/class/ramdisk/ramdisk0</code> và node trong devtmpfs. Với initramfs phải <code>mount -t devtmpfs</code> mới thấy node. Node của devtmpfs có quyền <code>crw-------</code>.',
      '<b><code>read</code> trả 0 = hết file, <code>*ppos</code> do driver tự tăng.</b> <code>cat</code> gọi <code>read</code> 2 lần, mỗi lần xin <b>65 536</b> byte. Quên <code>*ppos</code> → <code>cat</code> đọc <b>41 880</b> byte trong 2 giây từ một thiết bị chứa 6 byte.',
      '<b><code>-EFAULT</code> đến tay chương trình</b>: <code>write(NULL, 8)</code> → <code>errno 14 (Bad address)</code>, kernel không sập. <code>copy_from_user</code> hỏng vẫn <b>xoá về 0</b> phần đích (8 byte <code>\\0</code> trong <code>od -c</code>).',
      '<b><code>-ENOSPC</code></b> ở byte 4096: <code>write</code> 100 byte từ vị trí 4090 → <b>6</b>, lần sau → <code>errno 28</code>; <code>dd</code> 5 KiB → <b>4+0 records out</b>.',
      '<b><code>.owner = THIS_MODULE</code></b>: một fd mở làm <code>Used by</code> 0 → <b>1</b>, <code>rmmod</code> → <code>Resource temporarily unavailable</code>. <code>class_create</code>/<code>device_create</code> là <b>GPL-only</b>, đổi giấy phép thì <code>modpost</code> từ chối.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Driver của bạn giờ chỉ nói một thứ ngôn ngữ: luồng byte. Muốn hỏi nó "còn bao nhiêu chỗ ' +
         'trống?" hay bảo nó "xoá sạch bộ đệm", bạn không có cách nào ngoài việc bịa ra một ' +
         'giao thức trong dữ liệu. <b>Bài 53 — Giao tiếp user ↔ kernel</b> thêm những kênh khác vào ' +
         'chính <code>~/bai52/ramdisk</code>: một lệnh <code>ioctl</code> định nghĩa bằng ' +
         '<code>_IOR</code>/<code>_IOW</code>, một thuộc tính trong <code>/sys/class/ramdisk/ramdisk0/</code> ' +
         'đọc được bằng <code>cat</code>, một file procfs và một file debugfs. Rồi bạn sẽ so sánh ' +
         'bốn kênh đó để biết mỗi tình huống nên chọn kênh nào.' }
  ],

  quiz: [
    { q: 'Bạn chạy <code>mknod /dev/sensor c 510 3</code>, rồi <code>cat /dev/sensor</code> và nhận <code>No such device or address</code>. <code>grep sensor /proc/devices</code> in <code>510 sensor</code>. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Tên file <code>/dev/sensor</code> phải trùng với tên trong <code>device_create</code>',
        'Driver đã xin major 510 nhưng không <code>cdev_add</code> minor 3, nên không có <code>cdev</code> nào cho 510:3',
        'Node tạo bằng <code>mknod</code> có quyền <code>crw-r--r--</code>, không đủ để đọc',
        'Driver chưa được nạp'
      ],
      a: 1,
      why: '<code>/proc/devices</code> chứng minh driver đã nạp và giữ major 510, nên phương án 4 sai. Tên file không bao giờ quan trọng (bước 4: <code>/dev/rd0</code> vẫn chạy), nên phương án 1 sai. Bạn đang là root, nên quyền không phải vấn đề. <code>chrdev_open()</code> tra <code>cdev_map</code> theo <b>cả cặp số</b>. Xin một dải major và thật sự đăng ký một <code>cdev</code> cho từng minor là hai bước khác nhau, đúng như <code>/dev/rd9</code> ở bước 4.' },

    { q: 'Hàm <code>read</code> của một driver phải trả về gì để <code>cat</code> biết đã đọc hết?',
      opts: ['<code>-1</code>', '<code>-EOF</code>', '<code>0</code>', 'Số byte bằng đúng <code>count</code>'],
      a: 2,
      why: 'Hợp đồng của <code>read()</code> từ Bài 19: <b>0 byte nghĩa là hết file</b>. Driver chỉ việc tuân theo nó. Trong dấu vết của bước 5, mỗi <code>cat</code> gọi <code>read</code> hai lần, và lần thứ hai nhận <code>-&gt; 0</code>. Không có mã lỗi <code>EOF</code> nào trong kernel. Trả số âm là báo lỗi, không phải báo hết file.' },

    { q: 'Một driver build sạch, nạp sạch, <code>echo abc &gt; /dev/x</code> chạy được, <code>head -c 10 /dev/x</code> in <code>abc\\nabc\\nab</code>, còn <code>cat /dev/x</code> treo mãi. Dòng nào nhiều khả năng bị thiếu trong <code>read</code>?',
      opts: [
        '<code>mutex_unlock(&amp;dev-&gt;lock);</code>',
        '<code>*ppos += count;</code>',
        '<code>if (copy_to_user(…)) return -EFAULT;</code>',
        '<code>.owner = THIS_MODULE,</code>'
      ],
      a: 1,
      why: 'Nội dung <b>lặp lại</b> là dấu vân tay của <code>*ppos</code> không được tăng: mỗi lần <code>read</code> lại bắt đầu ở vị trí 0 (bước 6: <code>pos 0 -&gt; 6</code> ba lần liền). Driver không bao giờ trả 0, nên <code>cat</code> không dừng. <code>head -c</code> dừng được chỉ vì nó tự đếm byte. Thiếu <code>mutex_unlock</code> thì lần đọc thứ hai sẽ <b>treo ngay</b>, không lặp dữ liệu. Thiếu kiểm tra <code>copy_to_user</code> thì trình biên dịch cảnh báo.' },

    { q: 'Bạn giữ <code>exec 3&lt; /dev/ramdisk0</code> trong shell và gõ <code>rmmod ramdisk</code>. Điều gì xảy ra, và cơ chế nào gây ra nó?',
      opts: [
        '<code>rmmod</code> thành công; lần <code>read</code> tiếp theo trên fd 3 trả <code>ENXIO</code>',
        '<code>rmmod</code> thất bại với <code>Resource temporarily unavailable</code>, vì <code>.owner = THIS_MODULE</code> khiến <code>open</code> tăng bộ đếm tham chiếu của module',
        '<code>rmmod</code> chờ cho tới khi fd 3 được đóng',
        'Kernel tự đóng fd 3 rồi gỡ module'
      ],
      a: 1,
      why: '<code>chrdev_open()</code> gọi <code>fops_get()</code>, và hàm này gọi <code>try_module_get(fops-&gt;owner)</code>. Cột <code>Used by</code> nhảy từ 0 lên 1 (bước 5). <code>delete_module</code> thấy bộ đếm khác 0 và trả <code>EWOULDBLOCK</code> = <code>EAGAIN</code> ngay lập tức, không chờ. Nhờ vậy mã của <code>rd_read</code> không bao giờ bị giải phóng khi còn người có thể gọi nó.' },

    { q: 'Vì sao driver của bài gọi <code>kzalloc</code> và <code>mutex_init</code> <b>trước</b> <code>cdev_add</code>, chứ không phải sau?',
      opts: [
        'Vì <code>cdev_add</code> cần biết kích thước bộ đệm',
        'Vì ngay khi <code>cdev_add</code> trả về, một tiến trình khác đã có thể <code>open</code> và <code>read</code> thiết bị, trước khi <code>init</code> chạy xong',
        'Vì <code>mutex_init</code> không được gọi sau khi module đã Live',
        'Chỉ là quy ước trình bày, thứ tự không ảnh hưởng gì'
      ],
      a: 1,
      why: '<code>cdev_add</code> đưa cặp số vào <code>cdev_map</code>, nơi <code>chrdev_open()</code> tra cứu. Từ khoảnh khắc đó, thiết bị đã \"sống\" với phần còn lại của hệ thống, dù <code>rd_init</code> chưa trả về. Nếu bộ đệm chưa được cấp, <code>rd_read</code> sẽ đọc qua một con trỏ <code>NULL</code>. Quy tắc trong hình dựng/dỡ: thứ gì cho người khác chạm vào driver thì dựng cuối, gỡ đầu.' },

    { q: 'Bạn chép một driver từ một bài hướng dẫn năm 2019, và build với kernel 6.18.45 báo <code>too many arguments to function ‘class_create’</code>. Cách xử lý đúng là gì?',
      opts: [
        'Hạ kernel xuống một bản cũ hơn',
        'Thêm <code>-Wno-error</code> vào Makefile',
        'Đọc chữ ký hiện tại trong <code>include/linux/device/class.h</code> của cây đang build, và bỏ tham số <code>THIS_MODULE</code>',
        'Thay <code>class_create</code> bằng <code>mknod</code> trong hàm <code>init</code>'
      ],
      a: 2,
      why: 'API bên trong kernel <b>không ổn định</b> giữa các phiên bản, không như syscall. <code>class_create</code> bỏ tham số <code>owner</code> từ kernel 6.4. Đây là lỗi thật, không phải cảnh báo, nên <code>-Wno-error</code> vô ích. Nguồn sự thật duy nhất là header của đúng cây bạn build module với nó. Thói quen <code>grep -n tên_hàm include/…</code> trước khi tin một đoạn mã trên mạng sẽ tiết kiệm cho bạn nhiều giờ.' }
  ]
});

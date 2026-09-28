/* Bài 46 — Rootfs gồm những gì
   Chặng 09 — Root filesystem
   Bài mở đầu Chặng 09. Dựng một rootfs ext4 từ con số không, THÊM TỪNG THỨ MỘT và boot sau mỗi
   lần thêm, để học viên thấy chính xác kernel cần gì và userspace cần gì:
   rỗng → panic; một busybox tĩnh → có shell (dù chưa có /dev); /dev → devtmpfs tự gắn;
   /proc /sys /tmp /etc → mount tay, root read-only; chương trình động → loader + libc;
   bốn cách /sbin/init chết (-2 im lặng, -13, -8, thoát).
   Ảnh đĩa tạo bằng mkfs.ext4 -d, không cần sudo. Mọi số liệu đo 2026-09-28 trên máy B (WSL2
   Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1, e2fsprogs 1.45.5), kernel ~/bai38/linux-6.18.45.
   Không cross-compile BusyBox (Bài 47), không inittab/fstab (Bài 47), không initramfs vs initrd
   hay SquashFS (Bài 48), không systemd (Bài 49). */

Lesson.register({
  id: 'bai-46',
  title: 'Rootfs gồm những gì',
  minutes: 45,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Suốt Chặng 07 và Chặng 08, userspace của bạn là một initramfs Bài 32 để lại: một BusyBox, ' +
    'một symlink <code>sh</code>, bốn thư mục rỗng và một script <code>/init</code> sáu dòng. Nó ' +
    'chạy được, nhưng bạn chưa bao giờ hỏi: <b>trong đó, thứ nào thật sự bắt buộc?</b> Bài 41 ' +
    'từng thấy <code>/dev/kmsg</code> hỏng lặng lẽ vì thiếu một dòng <code>mount</code>; Bài 45 ' +
    'phải tự gõ <code>mount -t debugfs</code>. Đó là những mảnh rootfs bạn đang vá tạm.<br><br>' +
    'Bài này làm ngược lại với mọi hướng dẫn \"cài đặt\": thay vì chép một cây thư mục có sẵn, ' +
    'bạn bắt đầu từ <b>một ổ đĩa rỗng tuyệt đối</b>, boot nó, đọc xem kernel phàn nàn gì, rồi ' +
    'thêm <b>đúng một thứ</b> và boot lại. Sáu lần như vậy. Bạn sẽ thấy kernel cần ít đến bất ' +
    'ngờ — một file duy nhất là đủ để có dấu nhắc <code>~ #</code> — còn phần lớn những thư mục ' +
    'quen thuộc như <code>/proc</code>, <code>/tmp</code>, <code>/etc</code> là yêu cầu của ' +
    '<i>chương trình</i>, không phải của kernel.<br><br>' +
    'Và bạn sẽ gặp thông báo <code>No working init found</code> theo bốn con đường khác nhau — ' +
    'trong đó có một con đường mà file init <b>nằm ngay đó</b>, đúng quyền, đúng kiến trúc, ' +
    'nhưng kernel vẫn nói không tìm thấy gì.',

  goals: [
    'Tạo được một ảnh đĩa ext4 chứa rootfs từ một thư mục thường bằng <code>mkfs.ext4 -d</code>, ' +
      'không cần <code>sudo</code>, và boot nó bằng <code>root=/dev/vda</code>.',
    'Phân biệt được thứ <b>kernel</b> đòi hỏi ở rootfs (một chương trình init chạy được, chỗ ' +
      'để gắn <code>/dev</code>) với thứ <b>chương trình</b> đòi hỏi (<code>/proc</code>, ' +
      '<code>/sys</code>, <code>/tmp</code>, <code>/etc</code>), và chứng minh từng điều bằng một ' +
      'lần boot.',
    'Giải thích được <code>devtmpfs</code> là gì, vì sao nó tự gắn khi boot từ ổ đĩa nhưng ' +
      '<b>không</b> tự gắn trong initramfs, và đọc được major/minor của một file thiết bị.',
    'Nhận ra được một chương trình liên kết động qua <code>readelf -l</code>, biết nó cần ' +
      '<code>ld-linux-aarch64.so.1</code> và <code>libc.so.6</code>, và hiểu vì sao thiếu loader ' +
      'thì shell báo <code>not found</code> cho một file đang nằm đó.',
    'Từ một dòng panic và vài dòng log ngay trước nó, chỉ ra được init hỏng theo cách nào: ' +
      'không có, thiếu thư viện, thiếu quyền, sai kiến trúc, hay đã chạy rồi thoát.'
  ],

  blocks: [

    /* ============================================================
       1. KERNEL CẦN GÌ TỪ ROOTFS
       ============================================================ */
    { t: 'h2', x: 'Kernel xong việc ở đâu, rootfs bắt đầu từ đâu' },

    { t: 'p', x:
      '<b>Root filesystem</b> (rootfs) là hệ thống file được gắn vào thư mục gốc <code>/</code> ' +
      'đầu tiên — nơi chứa mọi chương trình, thư viện và file cấu hình mà người dùng thấy. Kernel ' +
      'nằm <b>ngoài</b> nó: file <code>Image</code> bạn build ở Bài 40 không nằm trong ' +
      '<code>/</code> của máy ảo, QEMU nạp nó thẳng vào RAM. Một cách hình dung: kernel là ' +
      '<b>người quản lý toà nhà</b> — điện, nước, thang máy, chìa khoá. Rootfs là <b>đồ đạc và ' +
      'người thuê</b>. Người quản lý có thể mở cửa toà nhà mà không cần một món đồ nào, nhưng ' +
      'không có người thuê thì toà nhà chẳng làm được gì.' },

    { t: 'p', x:
      'Câu hỏi của bài này là: người quản lý cần tối thiểu những gì trước khi giao chìa khoá? ' +
      'Bài 41 đã đọc hàm <code>kernel_init()</code> trong <code>init/main.c</code> và thấy thứ tự ' +
      'kernel đi tìm chương trình đầu tiên. Nhìn lại hàm đó, kernel chạm vào rootfs ở đúng ' +
      '<b>bốn</b> chỗ, theo thứ tự này:' },

    { t: 'fig',
      cap: 'Bốn lần kernel chạm vào rootfs khi boot từ ổ đĩa. Chú ý thứ tự: <code>/dev/console</code> ' +
           'được mở từ một rootfs tí hon nhúng sẵn trong kernel, <b>trước</b> khi ổ đĩa của bạn ' +
           'được gắn — nên shell vẫn có màn hình dù ổ đĩa không có <code>/dev</code>. Chỉ khâu ' +
           'cuối cùng là bắt buộc phải có trên ổ đĩa của bạn.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Bốn bước kernel chạm vào rootfs: mở /dev/console từ rootfs nhúng sẵn, gắn ổ đĩa root chỉ đọc, gắn devtmpfs vào /dev, chạy /sbin/init hoặc ba đường dự phòng">' +
        '<rect class="d-box-p" x="14" y="14" width="160" height="62" rx="6"/>' +
        '<text class="d-t" x="26" y="38">1 · Mở console</text>' +
        '<text class="d-tm" x="26" y="58">/dev/console</text>' +
        '<rect class="d-box" x="190" y="14" width="160" height="62" rx="6"/>' +
        '<text class="d-t" x="202" y="38">2 · Gắn ổ root</text>' +
        '<text class="d-tm" x="202" y="58">root=/dev/vda, ro</text>' +
        '<rect class="d-box" x="366" y="14" width="160" height="62" rx="6"/>' +
        '<text class="d-t" x="378" y="38">3 · Gắn devtmpfs</text>' +
        '<text class="d-tm" x="378" y="58">vào /dev</text>' +
        '<rect class="d-box-a" x="542" y="14" width="164" height="62" rx="6"/>' +
        '<text class="d-t" x="554" y="38">4 · Chạy init</text>' +
        '<text class="d-tm" x="554" y="58">/sbin/init … /bin/sh</text>' +
        '<line class="d-line" x1="174" y1="45" x2="182" y2="45"/>' +
        '<path class="d-arrow" d="M 190 45 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="350" y1="45" x2="358" y2="45"/>' +
        '<path class="d-arrow" d="M 366 45 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="526" y1="45" x2="534" y2="45"/>' +
        '<path class="d-arrow" d="M 542 45 l -8 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="14" y="100">Cần gì trên ổ đĩa của bạn?</text>' +
        '<rect class="d-box-g" x="14" y="110" width="160" height="84" rx="6"/>' +
        '<text class="d-t" x="26" y="134">Không gì cả</text>' +
        '<text class="d-ts" x="26" y="154">file này nằm trong rootfs</text>' +
        '<text class="d-ts" x="26" y="170">512 byte nhúng trong kernel,</text>' +
        '<text class="d-ts" x="26" y="186">mở trước khi gắn ổ đĩa</text>' +
        '<rect class="d-box-g" x="190" y="110" width="160" height="84" rx="6"/>' +
        '<text class="d-t" x="202" y="134">Một hệ thống file</text>' +
        '<text class="d-ts" x="202" y="154">kernel đọc được (ext4…);</text>' +
        '<text class="d-ts" x="202" y="170">rỗng cũng gắn được</text>' +
        '<rect class="d-box-w" x="366" y="110" width="160" height="84" rx="6"/>' +
        '<text class="d-t" x="378" y="134">Thư mục /dev</text>' +
        '<text class="d-ts" x="378" y="154">thiếu thì chỉ in một</text>' +
        '<text class="d-ts" x="378" y="170">dòng lỗi, boot vẫn tiếp</text>' +
        '<rect class="d-box-w" x="542" y="110" width="164" height="84" rx="6"/>' +
        '<text class="d-t" x="554" y="134">Một init chạy được</text>' +
        '<text class="d-ts" x="554" y="154">+ mọi thư viện nó cần.</text>' +
        '<text class="d-ts" x="554" y="170">Thiếu là panic</text>' +
        '<text class="d-ts" x="14" y="226">Sau khâu 4, kernel không làm gì thêm cho rootfs nữa. /proc, /sys, /tmp, /etc — tất cả do init</text>' +
        '<text class="d-ts" x="14" y="244">(hoặc chính bạn) tự gắn và tự dùng. Kernel không đọc một file cấu hình nào trong /etc.</text>' +
        '<text class="d-ts" x="14" y="276">Khâu 1: init/main.c:1552 · khâu 2 và 3: prepare_namespace() trong init/do_mounts.c · khâu 4: init/main.c:1493.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Khâu thứ nhất là thứ ít người để ý nhất. Ngay cả khi bạn không nạp initramfs nào, kernel ' +
      'vẫn tự tạo một rootfs tạm trong RAM từ một kho cpio <b>nhúng sẵn bên trong</b> ' +
      '<code>Image</code>. Kho đó được build ra cạnh các file khác trong cây kernel, và bạn có thể ' +
      'mở nó ra xem ngay bây giờ:' },

    { t: 'code', where: 'wsl', code:
      'cd ~/bai38/linux-6.18.45\n' +
      'ls -l usr/initramfs_data.cpio\n' +
      'cpio -itv < usr/initramfs_data.cpio' },

    { t: 'code', where: 'out', nocopy: true, code:
      '-rw------- 1 cah8hc cah8hc 512 Sep 28 14:14 usr/initramfs_data.cpio\n' +
      'drwxr-xr-x   2 root     root            0 Sep 28 14:14 dev\n' +
      'crw-------   1 root     root       5,   1 Sep 28 14:14 dev/console\n' +
      'drwx------   2 root     root            0 Sep 28 14:14 root\n' +
      '1 block' },

    { t: 'cmdx', cmd: 'cpio -itv < usr/initramfs_data.cpio', title: 'Liệt kê một kho cpio mà không bung nó ra',
      rows: [
        ['<code>-i</code>', 'Chế độ <i>đọc</i> kho (copy-in).', 'Ngược với <code>-o</code> mà Bài 32 dùng để tạo kho.'],
        ['<code>-t</code>', 'Chỉ in danh sách, không ghi file nào ra đĩa.', 'An toàn để chạy ở bất kỳ đâu — không có <code>-t</code>, cpio sẽ tạo thư mục <code>dev</code> ngay trong cây kernel.'],
        ['<code>-v</code>', 'In dạng dài như <code>ls -l</code>.', 'Nhờ nó bạn thấy chữ <code>c</code> và cặp số <code>5, 1</code> của file thiết bị.'],
        ['<code>&lt; usr/initramfs_data.cpio</code>', 'Đưa kho vào đầu vào chuẩn.', 'cpio luôn đọc kho từ stdin, không nhận tên file làm tham số.']
      ]},

    { t: 'cal', kind: 'info', title: 'Ba mục, 512 byte — và vì sao đây là lý do shell luôn có màn hình',
      x: 'Kho chỉ có <b>ba</b> mục: thư mục <code>dev</code>, một file thiết bị <code>dev/console</code> ' +
         '(chữ <code>c</code> đầu dòng = thiết bị ký tự, số <code>5, 1</code> là cặp major/minor mà ' +
         'phần sau sẽ giải thích), và thư mục <code>root</code>. Nó được sinh từ ' +
         '<code>usr/default_cpio_list</code> vì <code>.config</code> của bạn có ' +
         '<code>CONFIG_INITRAMFS_SOURCE=""</code>. Ngày giờ trên dòng là lúc bạn build kernel, sẽ ' +
         'khác trên máy bạn. Kernel mở <code>/dev/console</code> <b>trong kho này</b> rồi nhân bản ' +
         'nó thành stdin, stdout, stderr (<code>console_on_rootfs()</code>, <code>init/main.c:1552</code>) ' +
         '— và chỉ sau đó, ở dòng <code>1564</code>, mới đi gắn ổ đĩa của bạn. Bước 2 của phần thực ' +
         'hành sẽ cho bạn thấy hệ quả: một shell in chữ ra màn hình từ một ổ đĩa không hề có ' +
         '<code>/dev</code>.' },

    /* ============================================================
       2. CÂY THƯ MỤC TỐI THIỂU
       ============================================================ */
    { t: 'h2', x: 'Cây thư mục tối thiểu: ai cần thư mục nào' },

    { t: 'p', x:
      'Mở <code>ls /</code> trên máy WSL của bạn và bạn sẽ thấy khoảng hai mươi thư mục. Trên máy ' +
      'soạn bài, lệnh đó in ra <code>bin boot dev etc home lib lib32 lib64 libx32 lost+found media ' +
      'mnt opt proc root run sbin srv sys tmp usr var</code> cùng vài thư mục riêng của WSL. Cây này ' +
      'theo một quy ước tên là <b>FHS</b> (Filesystem Hierarchy Standard) — một bản thoả thuận ' +
      'giữa các bản phân phối, <b>không phải</b> luật của kernel. Kernel không biết ' +
      '<code>/usr</code> hay <code>/home</code> là gì. Bảng dưới xếp các thư mục theo câu hỏi ' +
      '\"ai sẽ phàn nàn nếu thiếu nó\" — mỗi dòng ở cột cuối là thứ bạn sẽ tự thấy trong phần thực hành:' },

    { t: 'table',
      head: ['Thư mục', 'Ai cần', 'Thiếu thì sao (đo trong bài này)'],
      rows: [
        ['<code>/sbin/init</code> hoặc <code>/bin/sh</code>', '<b>Kernel</b>',
         '<code>Kernel panic - not syncing: No working init found.</code> — bước 1.'],
        ['<code>/dev</code>', '<b>Kernel</b> (điểm gắn devtmpfs)',
         'Kernel in <code>devtmpfs: error mounting -2</code> rồi boot tiếp. Chương trình nào cần ' +
         '<code>/dev/null</code>, <code>/dev/vda</code>… sẽ hỏng về sau — bước 2.'],
        ['<code>/lib</code> (loader + <code>libc.so.6</code>)', 'Mọi chương trình <b>liên kết động</b>',
         'Shell báo <code>not found</code> cho một file đang nằm đó, mã thoát 127 — bước 5.'],
        ['<code>/proc</code>', '<code>ps</code>, <code>top</code>, <code>free</code>, <code>mount</code>…',
         '<code>ps: can\'t open \'/proc\': No such file or directory</code> — bước 3.'],
        ['<code>/sys</code>', 'Công cụ quản lý thiết bị, udev, chính bạn ở Chặng 08',
         'Thư mục rỗng; không ai đọc được <code>/sys/class</code>, <code>/sys/bus</code> — bước 4.'],
        ['<code>/tmp</code>', 'Chương trình cần chỗ ghi file tạm',
         '<code>touch: /tmp/x: Read-only file system</code> nếu chưa gắn tmpfs — bước 4.'],
        ['<code>/etc</code>', 'Chương trình đọc cấu hình: <code>ls</code> tra <code>/etc/passwd</code> để đổi số UID thành tên',
         '<code>ls -l</code> in cột chủ sở hữu là <code>0</code> thay vì <code>root</code> — bước 4. ' +
         '<code>/etc/inittab</code>, <code>/etc/fstab</code> là việc của Bài 47.'],
        ['<code>/root</code>, <code>/home</code>, <code>/usr</code>, <code>/var</code>, <code>/boot</code>…', 'Quy ước FHS, người dùng',
         'Không ai phàn nàn cả. Rootfs trong bài này không có thư mục nào trong số đó và vẫn chạy.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Một câu để nhớ: kernel chỉ đòi hai thứ',
      x: 'Chỉ <b>một chương trình init chạy được</b> (cùng thư viện của nó) là bắt buộc — thiếu thì ' +
         'panic. <b>Một thư mục <code>/dev</code></b> để gắn devtmpfs thì không bắt buộc nhưng gần ' +
         'như luôn cần — thiếu thì kernel chỉ in một dòng lỗi rồi đi tiếp. Mọi thứ khác do ' +
         '<i>chương trình</i> đòi. Khi một rootfs nhúng hỏng, câu hỏi đầu tiên luôn là: \"<i>kernel ' +
         'phàn nàn, hay một chương trình phàn nàn?</i>\". Nhìn thông báo bắt đầu bằng ' +
         '<code>Kernel panic</code> hay bằng tên một lệnh như <code>ps:</code> là biết ngay.' },

    /* ============================================================
       3. /dev VÀ devtmpfs
       ============================================================ */
    { t: 'h2', x: '<code>/dev</code>, file thiết bị và devtmpfs' },

    { t: 'p', x:
      'Linux cho chương trình nói chuyện với phần cứng qua những \"file\" đặc biệt gọi là <b>file ' +
      'thiết bị</b> (device node). Mở <code>/dev/vda</code> rồi đọc là đọc từng byte của ổ đĩa ảo; ' +
      'ghi vào <code>/dev/null</code> là vứt dữ liệu đi. Một file thiết bị <b>không chứa dữ liệu</b>: ' +
      'nó chỉ mang một chữ cái và hai con số. Xem ngay trên máy WSL của bạn:' },

    { t: 'code', where: 'wsl', code:
      'ls -l /dev/null /dev/console /dev/zero /dev/sdc' },

    { t: 'code', where: 'out', nocopy: true, code:
      'crw--w---- 1 root tty  5,  1 Sep 28 14:05 /dev/console\n' +
      'crw-rw-rw- 1 root root 1,  3 Sep 28 14:05 /dev/null\n' +
      'brw-rw---- 1 root disk 8, 32 Sep 28 14:05 /dev/sdc\n' +
      'crw-rw-rw- 1 root root 1,  5 Sep 28 14:05 /dev/zero',
      notes: [
        '<code>/dev/sdc</code> là ổ đĩa ảo chứa hệ thống file của WSL <b>trên máy soạn bài</b>. Máy bạn có thể là <code>/dev/sdb</code>, <code>/dev/sdd</code>… — <code>df /</code> sẽ cho bạn biết tên đúng. Ngày giờ là lúc WSL khởi động.'
      ] },

    { t: 'p', x:
      'Đọc từ trái sang: ký tự đầu là <b>loại</b> — <code>c</code> (character, đọc/ghi từng luồng ' +
      'byte như cổng nối tiếp) hay <code>b</code> (block, đọc/ghi từng khối như ổ đĩa). Vị trí ' +
      'thường hiện kích thước file thì giờ là hai số: <b>major</b> chọn <i>driver nào</i> xử lý, ' +
      '<b>minor</b> chọn <i>thiết bị nào</i> trong số các thiết bị của driver đó. <code>1, 3</code> ' +
      'và <code>1, 5</code> cùng driver số 1 (\"bộ nhớ\"), khác thiết bị: <code>null</code> và ' +
      '<code>zero</code>. Chú ý <code>/dev/console</code> là <code>5, 1</code> — <b>đúng</b> cặp số ' +
      'bạn vừa thấy trong kho cpio 512 byte của kernel. Cặp số này cố định trên mọi máy Linux; ' +
      'danh sách đầy đủ nằm trong <code>Documentation/admin-guide/devices.txt</code> của cây kernel, ' +
      'nên bạn không cần thuộc — <code>grep \'1 = /dev/console\'</code> trên file đó là ra.' },

    { t: 'cal', kind: 'why', title: 'Tên file không quan trọng, cặp số mới quan trọng',
      x: 'Một cách hình dung: file thiết bị giống <b>một tấm danh thiếp</b> ghi số điện thoại. Tên ' +
         'trên danh thiếp (<code>console</code>) là để người đọc; thứ kernel gọi tới là số ' +
         '(<code>5, 1</code>). Bạn có thể tạo một file thiết bị tên <code>banana</code> với số ' +
         '<code>1, 3</code> và nó sẽ hành xử y hệt <code>/dev/null</code>. Chính vì vậy mà ngày ' +
         'xưa, rootfs nhúng phải mang theo một thư mục <code>/dev</code> đầy file thiết bị tạo sẵn ' +
         'bằng <code>mknod</code> (cần quyền root), và mỗi khi gắn thêm phần cứng thì phải tạo thêm ' +
         'bằng tay — hoặc có một tiến trình chạy nền lo việc đó.' },

    { t: 'p', x:
      '<b>devtmpfs</b> là lời giải của kernel cho bài toán ấy. Nó là một hệ thống file nằm hoàn ' +
      'toàn trong RAM mà <b>chính kernel</b> điền nội dung: mỗi khi một driver đăng ký một thiết ' +
      'bị, kernel tự tạo file thiết bị tương ứng trong đó với đúng tên và đúng cặp số. Không cần ' +
      '<code>mknod</code>, không cần root, không cần tiến trình nào. Ở bước 3 bạn sẽ thấy một luồng ' +
      'kernel tên <code>[kdevtmpfs]</code> trong danh sách tiến trình — đó là người điền. Máy WSL ' +
      'của bạn cũng dùng đúng cơ chế này: <code>mount | grep \' /dev \'</code> in ra ' +
      '<code>none on /dev type devtmpfs (rw,nosuid,relatime,size=8052564k,…)</code>.' },

    { t: 'p', x:
      'Câu hỏi còn lại là <i>ai gắn</i> devtmpfs vào <code>/dev</code>. Tuỳ chọn Kconfig ' +
      '<code>CONFIG_DEVTMPFS_MOUNT</code> (kernel của bạn có <code>=y</code>) trả lời trong chính ' +
      'đoạn trợ giúp của nó, ở <code>drivers/base/Kconfig:50</code>:' },

    { t: 'code', where: 'file', name: 'drivers/base/Kconfig — dòng 50–63', lang: 'text', code:
      'config DEVTMPFS_MOUNT\n' +
      '\tbool "Automount devtmpfs at /dev, after the kernel mounted the rootfs"\n' +
      '\tdepends on DEVTMPFS\n' +
      '\thelp\n' +
      '\t  This will instruct the kernel to automatically mount the\n' +
      '\t  devtmpfs filesystem at /dev, directly after the kernel has\n' +
      '\t  mounted the root filesystem. The behavior can be overridden\n' +
      '\t  with the commandline parameter: devtmpfs.mount=0|1.\n' +
      '\t  This option does not affect initramfs based booting, here\n' +
      '\t  the devtmpfs filesystem always needs to be mounted manually\n' +
      '\t  after the rootfs is mounted.' },

    { t: 'cal', kind: 'why', title: 'Vì sao Bài 41 phải tự gõ mount -t devtmpfs, còn bài này thì không',
      x: 'Câu \"<i>does not affect initramfs based booting</i>\" là lời giải cho điều Bài 41 gặp: ' +
         'khi boot bằng initramfs, kernel chạy <code>/init</code> ngay và <b>không bao giờ</b> đi ' +
         'qua khâu \"gắn ổ root\" — nên cũng không qua khâu \"gắn devtmpfs\" nằm ngay sau nó ' +
         '(<code>devtmpfs_mount()</code> ở <code>init/do_mounts.c:493</code>, cuối hàm ' +
         '<code>prepare_namespace()</code>). <code>/init</code> phải tự gắn. Còn khi boot từ ổ đĩa ' +
         'bằng <code>root=</code>, kernel gắn hộ bạn, <b>với điều kiện</b> ổ đĩa có sẵn một thư mục ' +
         '<code>/dev</code> để làm điểm gắn. Không có thư mục đó, <code>init_mount()</code> trả về ' +
         '<code>-2</code> (<code>ENOENT</code>) và bạn thấy <code>devtmpfs: error mounting -2</code>. ' +
         'Tham số <code>devtmpfs.mount=0</code> tắt việc gắn tự động — bước 3 sẽ dùng nó để chứng minh.' },

    /* ============================================================
       4. /proc, /sys, /tmp VÀ ROOT CHỈ ĐỌC
       ============================================================ */
    { t: 'h2', x: '<code>/proc</code>, <code>/sys</code>, <code>/tmp</code>: thư mục rỗng chờ được gắn' },

    { t: 'p', x:
      'Ba thư mục này trên ổ đĩa luôn <b>rỗng</b>. Nội dung bạn thấy trong chúng đến từ ba hệ ' +
      'thống file ảo mà kernel cung cấp nhưng <b>không tự gắn</b> — việc gắn là của init. Trên ' +
      'máy WSL, systemd đã làm hộ bạn:' },

    { t: 'code', where: 'wsl', code:
      "mount | grep -E ' on /(proc|sys|tmp|dev) '" },

    { t: 'code', where: 'out', nocopy: true, code:
      'none on /dev type devtmpfs (rw,nosuid,relatime,size=8052564k,nr_inodes=2013141,mode=755)\n' +
      'sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,noatime)\n' +
      'proc on /proc type proc (rw,nosuid,nodev,noexec,noatime)',
      notes: [
        '<code>size=</code> và <code>nr_inodes=</code> của devtmpfs tính theo RAM của máy nên sẽ khác trên máy bạn. Không có dòng nào cho <code>/tmp</code>: trên máy soạn bài (Ubuntu 20.04), <code>/tmp</code> của WSL là một thư mục thường trên ổ ext4, không phải tmpfs — một quyết định của bản phân phối, không phải của kernel.'
      ] },

    { t: 'table',
      head: ['Điểm gắn', 'Loại', 'Chứa gì', 'Gắn bằng'],
      rows: [
        ['<code>/proc</code>', '<code>proc</code>', 'Một thư mục cho mỗi tiến trình, cộng <code>cmdline</code>, <code>meminfo</code>, <code>mounts</code>… — Bài 19 và 37 đã đọc', '<code>mount -t proc proc /proc</code>'],
        ['<code>/sys</code>', '<code>sysfs</code>', 'Mô hình thiết bị: <code>bus</code>, <code>class</code>, <code>devices</code>… — Bài 44 và 45 đã sống trong đó', '<code>mount -t sysfs sysfs /sys</code>'],
        ['<code>/tmp</code>', '<code>tmpfs</code>', 'File tạm, nằm trong RAM, mất khi tắt máy', '<code>mount -t tmpfs tmpfs /tmp</code>'],
        ['<code>/dev</code>', '<code>devtmpfs</code>', 'File thiết bị do kernel tự tạo', 'Kernel tự gắn (ổ đĩa), hoặc <code>mount -t devtmpfs devtmpfs /dev</code> (initramfs)']
      ] },

    { t: 'p', x:
      'Vì sao <code>/tmp</code> lại cần một hệ thống file riêng, thay vì dùng luôn thư mục trên ổ ' +
      'đĩa? Vì kernel gắn ổ root ở chế độ <b>chỉ đọc</b>. Dòng 31 của <code>init/do_mounts.c</code> ' +
      'nói thẳng: <code>int root_mountflags = MS_RDONLY | MS_SILENT;</code>. Chỉ khi dòng lệnh có ' +
      'chữ <code>rw</code> thì cờ đó mới bị gỡ. Lý do là lịch sử và an toàn: init truyền thống ' +
      'muốn chạy <code>fsck</code> kiểm tra ổ đĩa <i>trước</i> khi cho phép ghi, rồi mới tự ' +
      '<code>mount -o remount,rw /</code>. Trên thiết bị nhúng, rootfs chỉ đọc còn là một tính năng: ' +
      'mất điện giữa chừng không thể làm hỏng thứ không bao giờ được ghi. Bài 48 sẽ đi tiếp hướng ' +
      'đó với SquashFS và overlayfs.' },

    { t: 'cal', kind: 'info', title: 'Nhìn thấy dấu hiệu chỉ đọc ngay trong log',
      x: 'Log boot từ ổ đĩa luôn có một dòng dạng <code>VFS: Mounted root (ext4 filesystem) ' +
         '<b>readonly</b> on device 254:0.</code> Thêm <code>rw</code> vào dòng lệnh thì chữ ' +
         '<code>readonly</code> biến mất. <code>254:0</code> là major/minor của <code>/dev/vda</code> ' +
         '— cùng loại cặp số bạn vừa học, và cùng cặp <code>(254,0)</code> mà Bài 41 thấy trong ' +
         'thông báo <code>No filesystem could mount root</code>.' },

    /* ============================================================
       5. THƯ VIỆN CHIA SẺ
       ============================================================ */
    { t: 'h2', x: 'Thư viện chia sẻ: thứ rootfs phải mang theo cho chương trình' },

    { t: 'p', x:
      'Bài 17 đã so sánh liên kết tĩnh và liên kết động trên máy host. Trên rootfs, sự khác biệt đó ' +
      'không còn là chuyện kích thước nữa mà là chuyện <b>chạy được hay không</b>. Một chương trình ' +
      '<b>tĩnh</b> mang theo mọi đoạn mã nó cần bên trong chính file của nó — BusyBox bạn lấy từ ' +
      'Bài 32 là loại này, 1 980 720 byte, không phụ thuộc gì. Một chương trình <b>động</b> thì chỉ ' +
      'mang mã của riêng nó, và ghi trong phần đầu file một câu nhắn: \"<i>trước khi chạy tôi, hãy ' +
      'nạp chương trình <code>/lib/ld-linux-aarch64.so.1</code></i>\". Chương trình được nhắn tới ' +
      'đó gọi là <b>dynamic loader</b> (bộ nạp động).' },

    { t: 'fig',
      cap: 'Khi chạy một file động, kernel không nhảy vào mã của nó ngay. Kernel đọc đường dẫn ' +
           'loader trong phần <code>INTERP</code>, mở file đó trên <b>rootfs của máy đích</b>, và ' +
           'giao quyền cho loader; loader mới đi tìm <code>libc.so.6</code>. Thiếu mắt xích nào, ' +
           'chương trình không bao giờ bắt đầu — và thông báo lỗi nói về file bạn gõ, không nói ' +
           'về file thực sự bị thiếu.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Chuỗi nạp một chương trình động: shell gọi execve trên /bin/hello, kernel đọc INTERP và mở /lib/ld-linux-aarch64.so.1, loader mở /lib/libc.so.6, rồi mới nhảy vào main">' +
        '<rect class="d-box" x="14" y="20" width="150" height="60" rx="6"/>' +
        '<text class="d-t" x="26" y="44">Shell</text>' +
        '<text class="d-tm" x="26" y="64">execve("/bin/hello")</text>' +
        '<rect class="d-box-p" x="194" y="20" width="160" height="60" rx="6"/>' +
        '<text class="d-t" x="206" y="44">Kernel đọc ELF</text>' +
        '<text class="d-tm" x="206" y="64">INTERP → loader</text>' +
        '<rect class="d-box-a" x="384" y="20" width="160" height="60" rx="6"/>' +
        '<text class="d-t" x="396" y="44">Loader chạy</text>' +
        '<text class="d-tm" x="396" y="64">ld-linux-aarch64.so.1</text>' +
        '<rect class="d-box-g" x="574" y="20" width="132" height="60" rx="6"/>' +
        '<text class="d-t" x="586" y="44">main()</text>' +
        '<text class="d-ts" x="586" y="64">mã của bạn</text>' +
        '<line class="d-line" x1="164" y1="50" x2="186" y2="50"/>' +
        '<path class="d-arrow" d="M 194 50 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="354" y1="50" x2="376" y2="50"/>' +
        '<path class="d-arrow" d="M 384 50 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="544" y1="50" x2="566" y2="50"/>' +
        '<path class="d-arrow" d="M 574 50 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="464" y1="80" x2="464" y2="112"/>' +
        '<path class="d-arrow" d="M 464 120 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box" x="384" y="120" width="160" height="44" rx="6"/>' +
        '<text class="d-tm" x="396" y="140">/lib/libc.so.6</text>' +
        '<text class="d-ts" x="396" y="156">printf, malloc…</text>' +
        '<rect class="d-box-w" x="14" y="120" width="340" height="80" rx="6"/>' +
        '<text class="d-t" x="26" y="142">Thiếu loader trên rootfs</text>' +
        '<text class="d-ts" x="26" y="162">execve trả về ENOENT — giống hệt \"file không tồn tại\".</text>' +
        '<text class="d-ts" x="26" y="180">Shell in: /bin/sh: /bin/hello: not found, mã 127.</text>' +
        '<text class="d-ts" x="26" y="196">Kernel (khi là init): im lặng, thử đường kế tiếp.</text>' +
        '<text class="d-ts" x="14" y="232">File tĩnh (BusyBox) không có INTERP: kernel nhảy thẳng từ ô thứ hai sang main().</text>' +
        '</svg>' },

    { t: 'p', x:
      'Mắt xích thứ hai được kernel làm trong <code>fs/binfmt_elf.c</code>: dòng 894 đọc đường dẫn ' +
      'từ phần <code>INTERP</code>, dòng 907 gọi <code>open_exec()</code> trên đường dẫn đó. Nếu ' +
      'file không tồn tại, lỗi <code>-ENOENT</code> được trả thẳng về cho <code>execve()</code> — ' +
      'và <code>execve()</code> không có cách nào nói \"<i>file anh gọi thì có, file nó cần thì ' +
      'không</i>\". Đây là nguồn gốc của thông báo khó hiểu nhất trong nghề nhúng. Bước 5 sẽ cho ' +
      'bạn tự thấy, bước 6 sẽ cho bạn thấy hệ quả khi chương trình đó là init.' },

    { t: 'cal', kind: 'why', title: 'Vì sao hệ thống nhúng thường chọn BusyBox tĩnh cho rootfs đầu tiên',
      x: 'Một binary tĩnh không có mắt xích nào để thiếu. Đó là lý do Bài 32 chọn gói ' +
         '<code>busybox-static</code>, và lý do Bài 47 sẽ build BusyBox với <code>CONFIG_STATIC</code>. ' +
         'Cái giá là mỗi chương trình tĩnh mang một bản libc riêng: rootfs chỉ có một hai chương ' +
         'trình thì tĩnh nhỏ hơn, có hàng chục chương trình thì động nhỏ hơn — Bài 17 đã tính điểm ' +
         'hoà vốn ở khoảng <b>3</b> chương trình. Khi dùng động, quy tắc sắt là: <b>libc trên rootfs phải là đúng bản mà toolchain ' +
         'đã liên kết</b>. Bài này chép <code>libc.so.6</code> từ chính thư mục ' +
         '<code>/usr/aarch64-linux-gnu/lib</code> của toolchain <code>aarch64-linux-gnu-gcc</code>, ' +
         'nên điều đó đúng một cách tự nhiên.' },

    /* ============================================================
       6. NO WORKING INIT FOUND
       ============================================================ */
    { t: 'h2', x: '<code>No working init found</code>: một thông báo, năm nguyên nhân' },

    { t: 'p', x:
      'Bài 41 đã đọc đoạn cuối của <code>kernel_init()</code>: sau khi gắn rootfs, kernel lần lượt ' +
      'thử <code>/sbin/init</code>, <code>/etc/init</code>, <code>/bin/init</code>, <code>/bin/sh</code>, ' +
      'và panic nếu cả bốn thất bại. Điều Bài 41 chưa đọc là hàm <b>thử</b> ấy, ngay phía trên ở ' +
      '<code>init/main.c:1361</code>:' },

    { t: 'code', where: 'file', name: 'init/main.c — dòng 1361–1374', lang: 'c', code:
      'static int try_to_run_init_process(const char *init_filename)\n' +
      '{\n' +
      '\tint ret;\n' +
      '\n' +
      '\tret = run_init_process(init_filename);\n' +
      '\n' +
      '\tif (ret && ret != -ENOENT) {\n' +
      '\t\tpr_err("Starting init: %s exists but couldn\'t execute it (error %d)\\n",\n' +
      '\t\t       init_filename, ret);\n' +
      '\t}\n' +
      '\n' +
      '\treturn ret;\n' +
      '}' },

    { t: 'p', x:
      'Dòng <code>if (ret &amp;&amp; ret != -ENOENT)</code> là mấu chốt. Kernel <b>chỉ in lời giải ' +
      'thích khi lỗi khác <code>-ENOENT</code></b>. \"Không có file\" được coi là bình thường — đó ' +
      'chính là lý do có bốn đường dự phòng — nên nó bị bỏ qua trong im lặng. Kết hợp với hình ở ' +
      'phần trước, bạn đã thấy vấn đề: một init <b>động</b> thiếu loader cũng trả về ' +
      '<code>-ENOENT</code>, nên kernel sẽ im lặng về nó y như khi file không tồn tại. Bảng dưới ' +
      'gom cả năm trường hợp; bước 6 sẽ dựng lại từng dòng:' },

    { t: 'table',
      head: ['Tình trạng của /sbin/init', 'Mã lỗi', 'Log ngay sau <code>Run /sbin/init as init process</code>'],
      rows: [
        ['Không có file', '<code>-2</code> <code>ENOENT</code>', 'Không gì cả. Chuyển sang <code>Run /etc/init</code>.'],
        ['Có file, là chương trình động, <b>thiếu loader</b>', '<code>-2</code> <code>ENOENT</code>', '<b>Không gì cả</b> — không phân biệt được với dòng trên.'],
        ['Có file, thiếu bit thực thi <code>x</code>', '<code>-13</code> <code>EACCES</code>', '<code>Starting init: /sbin/init exists but couldn\'t execute it (error -13)</code>'],
        ['Có file, sai kiến trúc (ví dụ x86-64)', '<code>-8</code> <code>ENOEXEC</code>', '<code>Starting init: /sbin/init exists but couldn\'t execute it (error -8)</code>'],
        ['Chạy được, rồi <b>thoát</b>', '—', 'Chương trình in gì thì in, rồi <code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x…</code>']
      ] },

    { t: 'cal', kind: 'warn', title: 'Thấy \"No working init found\", đừng vội kết luận \"thiếu file\"',
      x: 'Ba dòng đầu của bảng đều kết thúc bằng cùng một panic <code>No working init found</code> ' +
         '(nếu các đường dự phòng cũng không có). Muốn phân biệt, <b>đọc các dòng ngay phía trên ' +
         'panic</b>: có dòng <code>Starting init: … exists</code> là file có mặt nhưng bị từ chối, ' +
         'kèm mã lỗi nói lý do. <b>Không có</b> dòng đó thì hoặc file thật sự không có, hoặc là ' +
         'chương trình động thiếu thư viện — và cách phân biệt hai trường hợp này là mở ảnh đĩa ra ' +
         'trên host rồi <code>readelf -l</code> file init. Mã <code>-8</code> cũng là mã mà Bài 25 ' +
         'gọi là <code>Exec format error</code>; khác biệt là trong máy ảo không có ' +
         '<code>binfmt_misc</code> nào đỡ cho bạn.' },

    { t: 'terms', items: [
      ['Root filesystem', 'rootfs', 'Hệ thống file được gắn vào <code>/</code> đầu tiên. Chứa mọi chương trình và thư viện userspace; kernel nằm ngoài nó.'],
      ['File thiết bị', 'device node', 'File đặc biệt không chứa dữ liệu, chỉ mang loại (<code>c</code>/<code>b</code>) và cặp major/minor để kernel chuyển thao tác tới đúng driver.'],
      ['Major / minor', '', 'Hai số của file thiết bị: major chọn driver, minor chọn thiết bị trong driver đó. <code>/dev/console</code> = <code>5, 1</code>.'],
      ['devtmpfs', '', 'Hệ thống file trong RAM mà kernel tự điền file thiết bị mỗi khi driver đăng ký thiết bị. Kernel tự gắn vào <code>/dev</code> khi boot từ ổ đĩa, không tự gắn trong initramfs.'],
      ['tmpfs', '', 'Hệ thống file nằm trong RAM, dùng cho <code>/tmp</code>. Mất sạch khi tắt máy — đúng điều bạn muốn với file tạm.'],
      ['Dynamic loader', 'ld.so', 'Chương trình nạp thư viện chia sẻ cho một binary động trước khi <code>main()</code> chạy. Đường dẫn của nó ghi trong phần <code>INTERP</code> của ELF.'],
      ['FHS', 'Filesystem Hierarchy Standard', 'Quy ước đặt tên thư mục (<code>/usr</code>, <code>/var</code>, <code>/etc</code>…) giữa các bản phân phối. Không phải yêu cầu của kernel.']
    ] },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: dựng rootfs từ một ổ đĩa rỗng, mỗi lần thêm một thứ' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<ul>' +
         '<li><code>~/bai38/linux-6.18.45/arch/arm64/boot/Image</code> — kernel bạn build ở Bài 40. ' +
         'Nó có sẵn <code>CONFIG_EXT4_FS=y</code>, <code>CONFIG_VIRTIO_BLK=y</code>, ' +
         '<code>CONFIG_DEVTMPFS=y</code>, <code>CONFIG_DEVTMPFS_MOUNT=y</code> và ' +
         '<code>CONFIG_TMPFS=y</code>, nên không cần build lại gì.</li>' +
         '<li><code>~/bai32/initramfs/bin/busybox</code> — BusyBox tĩnh của Bài 32. Bài này chỉ ' +
         '<b>chép</b> nó ra, không sửa gì trong <code>~/bai32</code>.</li>' +
         '<li><code>mkfs.ext4</code> (gói <code>e2fsprogs</code>, có sẵn trên mọi Ubuntu) và ' +
         '<code>aarch64-linux-gnu-gcc</code> của Bài 26.</li>' +
         '</ul>' +
         'Máy soạn bài: Ubuntu 20.04 trong WSL2, QEMU <b>4.2.1</b>, <code>mke2fs 1.45.5</code>, ' +
         'GCC <b>9.4</b>. Kernel 6.18.45 build trên máy này có <code>Image</code> 49 342 976 byte — ' +
         'lớn hơn con số 41 MB của Bài 40 vì Bài 40 được đo với GCC 15. Mọi thứ trong bài này ' +
         'không phụ thuộc vào con số đó.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Một ổ đĩa rỗng, và panic đầu tiên',
        blocks: [
          { t: 'p', x:
            'Bài 35 từng tạo ảnh đĩa ext4 bằng <code>mkfs.ext4</code> rồi dùng <code>debugfs</code> ' +
            'để chép từng file vào, vì không có <code>sudo</code> để <code>mount</code>. Bài này dùng ' +
            'một cách gọn hơn: tuỳ chọn <code>-d</code> của <code>mkfs.ext4</code> chép <b>cả một ' +
            'thư mục</b> vào ảnh ngay lúc tạo. Bạn sẽ sửa thư mục <code>rootfs/</code> như sửa file ' +
            'thường, rồi tạo lại ảnh. Bắt đầu với một thư mục rỗng:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai46 && cd ~/bai46\n' +
            'mkdir rootfs\n' +
            'mkfs.ext4 -q -d rootfs rootfs.img 64M\n' +
            'ls -l rootfs.img\n' +
            'du -h rootfs.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 67108864 Sep 28 20:29 rootfs.img\n' +
            '4.2M\trootfs.img' },

          { t: 'cmdx', cmd: 'mkfs.ext4 -q -d rootfs rootfs.img 64M', title: 'Tạo ảnh ext4 từ một thư mục',
            rows: [
              ['<code>mkfs.ext4</code>', 'Tạo hệ thống file ext4.', 'Đích không nhất thiết là ổ đĩa thật: một file thường cũng được, và khi đó không cần quyền root.'],
              ['<code>-q</code>', 'Im lặng, chỉ in khi có lỗi.', 'Bỏ <code>-q</code> thì bạn thấy khoảng mười dòng tiến trình, có dòng <code>Copying files into the device: done</code>.'],
              ['<code>-d rootfs</code>', 'Chép nội dung thư mục <code>rootfs/</code> vào gốc của hệ thống file mới.', 'Đây là thứ thay thế cho <code>sudo mount</code> + <code>cp</code>. Có từ e2fsprogs 1.43; máy soạn bài có 1.45.5.'],
              ['<code>rootfs.img</code>', 'File đích.', 'Nếu chưa có, <code>mkfs.ext4</code> tự tạo.'],
              ['<code>64M</code>', 'Kích thước hệ thống file.', 'Bắt buộc khi đích là file chưa tồn tại — <code>mkfs.ext4</code> không đoán được bạn muốn bao nhiêu.']
            ]},

          { t: 'cal', kind: 'info', title: '64 MiB theo ls, 4,2 MiB theo du',
            x: '<code>ls -l</code> in <b>67 108 864</b> byte = đúng 64 × 1 048 576. <code>du -h</code> ' +
               'in <b>4.2M</b>: đó là dung lượng thực sự chiếm trên đĩa của WSL. Phần còn lại là các ' +
               'vùng toàn số 0 mà <code>mkfs.ext4</code> không ghi, và ext4 của WSL lưu file này ở dạng ' +
               '<i>sparse</i> — cùng hiện tượng Bài 19 thấy với <code>lseek</code>. 4,2 MiB là siêu dữ ' +
               'liệu của ext4 (bảng inode, journal) cho một hệ thống file chưa chứa gì.' },

          { t: 'p', x:
            'Bạn sẽ boot rất nhiều lần trong bài này với cùng một dòng lệnh QEMU dài, chỉ thỉnh thoảng ' +
            'thêm một tham số kernel. Hãy cất nó vào một script nhỏ, và thêm một script thứ hai để ' +
            'tạo lại ảnh:' },

          { t: 'code', where: 'file', name: '~/bai46/run.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# Boot rootfs.img under QEMU; any arguments are appended to the kernel command line.\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -drive file=rootfs.img,format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda $*"' },

          { t: 'code', where: 'file', name: '~/bai46/mkimg.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# Rebuild rootfs.img from the rootfs/ directory.\n' +
            'rm -f rootfs.img\n' +
            'mkfs.ext4 -q -d rootfs rootfs.img 64M' },

          { t: 'cmdx', cmd: 'run.sh', title: 'Hai dòng mới so với mọi lần boot trước',
            rows: [
              ['<code>-drive file=rootfs.img,format=raw,if=virtio</code>', 'Gắn file ảnh làm một ổ đĩa virtio.', 'Kernel thấy nó là <code>/dev/vda</code>, major/minor <code>254:0</code>. Bài 41 đã dùng đúng tuỳ chọn này với <code>blank.img</code>.'],
              ['Không có <code>-initrd</code>', 'Không nạp initramfs nào.', 'Đây là khác biệt lớn nhất với Chặng 07–08: kernel phải tìm userspace trên ổ đĩa.'],
              ['<code>root=/dev/vda</code>', 'Bảo kernel gắn ổ đó làm <code>/</code>.', 'Bài 41 đã liệt kê các dạng giá trị của <code>root=</code>.'],
              ['<code>$*</code>', 'Mọi tham số bạn truyền cho <code>./run.sh</code>.', '<code>./run.sh rw</code> sẽ thêm chữ <code>rw</code> vào cuối dòng lệnh kernel.'],
              ['<code>exec</code>', 'Thay script bằng QEMU.', 'Không để lại một tiến trình <code>sh</code> thừa chờ QEMU thoát.']
            ]},

          { t: 'cal', kind: 'warn', title: 'Vì sao mkimg.sh phải xoá ảnh cũ trước',
            x: 'Chạy <code>mkfs.ext4</code> lên một file đã chứa ext4 thì nó dừng lại hỏi: ' +
               '<code>rootfs.img contains a ext4 file system</code> … <code>Proceed anyway? (y,N)</code>. ' +
               'Gõ nhầm <kbd>Enter</kbd> là trả lời <code>N</code>, lệnh thoát với mã <b>1</b>, và ảnh ' +
               'cũ <b>giữ nguyên</b> — bạn sẽ boot phiên bản cũ mà tưởng là mới. <code>rm -f</code> ' +
               'trước tránh hẳn câu hỏi. Đừng dùng <code>-F</code> để ép: câu hỏi đó tồn tại để bạn ' +
               'không lỡ tay format nhầm một ổ đĩa thật.' },

          { t: 'code', where: 'wsl', code:
            'chmod +x run.sh mkimg.sh\n' +
            './run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.151300] check access for rdinit=/init failed: -2, ignoring\n' +
            '[    1.186041] EXT4-fs (vda): mounted filesystem 89026afa-aad5-4bce-9c66-66839c8a40aa ro with ordered data mode. Quota mode: none.\n' +
            '[    1.186882] VFS: Mounted root (ext4 filesystem) readonly on device 254:0.\n' +
            '[    1.189704] devtmpfs: error mounting -2\n' +
            '[    1.249532] Freeing unused kernel memory: 11648K\n' +
            '[    1.252008] Run /sbin/init as init process\n' +
            '[    1.254482] Run /etc/init as init process\n' +
            '[    1.254965] Run /bin/init as init process\n' +
            '[    1.255333] Run /bin/sh as init process\n' +
            '[    1.255966] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.',
            notes: [
              'Chỉ in 10 dòng cuối trước panic, từ dòng 249 đến 258 của log. Mã UUID sau <code>mounted filesystem</code> do <code>mkfs.ext4</code> sinh ngẫu nhiên và các dấu thời gian đều sẽ khác trên máy bạn. Panic xong, QEMU đứng yên: thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'
            ] },

          { t: 'p', x:
            'Đọc từ trên xuống, bốn khâu của hình đầu bài hiện ra đủ cả:' },

          { t: 'list', ordered: true, items: [
            '<code>check access for rdinit=/init failed: -2, ignoring</code> — kernel tìm ' +
              '<code>/init</code> trong rootfs 512 byte nhúng sẵn, không thấy (kho đó chỉ có ' +
              '<code>dev</code>, <code>dev/console</code>, <code>root</code>), nên đi gắn ổ đĩa. Bài 41 ' +
              'đã giải thích chữ <code>ignoring</code>.',
            '<code>VFS: Mounted root (ext4 filesystem) readonly on device 254:0</code> — <b>gắn thành ' +
              'công</b> một hệ thống file rỗng, chế độ chỉ đọc, trên <code>/dev/vda</code>.',
            '<code>devtmpfs: error mounting -2</code> — kernel muốn gắn devtmpfs vào ' +
              '<code>/dev</code> nhưng ổ đĩa không có thư mục đó: <code>-2</code> = <code>ENOENT</code>. ' +
              'Chỉ là <code>pr_info</code>, boot vẫn đi tiếp.',
            'Bốn dòng <code>Run … as init process</code> liên tiếp, <b>không có dòng giải thích nào ' +
              'xen giữa</b> — theo mã <code>try_to_run_init_process()</code> bạn vừa đọc, đó là dấu ' +
              'hiệu cả bốn file đều trả về <code>-ENOENT</code>. Rồi panic.'
          ] },

          { t: 'cal', kind: 'why', title: 'Đây là panic Bài 41 dự đoán, nhưng lần đầu bạn thấy nó thật',
            x: 'Bài 41 đã nói: gặp <code>No working init found</code> là <b>tin tốt</b> — nó chứng ' +
               'minh <code>root=</code> đúng, ổ đĩa gắn được, chỉ có nội dung là sai. Log trên xác nhận ' +
               'từng chữ: dòng <code>VFS: Mounted root</code> nằm <b>trước</b> panic. So với ' +
               '<code>VFS: Cannot open root device</code> (sai <code>root=</code>) hay ' +
               '<code>No filesystem could mount root</code> (ổ trắng chưa format) của Bài 41, bạn đã tiến ' +
               'thêm đúng một bậc.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Một file duy nhất: BusyBox tĩnh',
        blocks: [
          { t: 'p', x:
            'Kernel chấp nhận <code>/bin/sh</code> làm init — đó là đường dự phòng cuối cùng. Vậy ' +
            'thêm đúng một chương trình vào đường dẫn đó: BusyBox tĩnh của Bài 32, cùng symlink ' +
            '<code>sh</code> trỏ tới nó. Chưa có thư mục nào khác.' },

          { t: 'code', where: 'wsl', code:
            'mkdir rootfs/bin\n' +
            'cp ~/bai32/initramfs/bin/busybox rootfs/bin/\n' +
            'ln -s busybox rootfs/bin/sh\n' +
            './mkimg.sh\n' +
            'find rootfs | sort' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rootfs\n' +
            'rootfs/bin\n' +
            'rootfs/bin/busybox\n' +
            'rootfs/bin/sh' },

          { t: 'p', x:
            'Toàn bộ rootfs: một thư mục, một file 1 980 720 byte, một symlink. Boot, rồi gõ bốn lệnh ' +
            'ở dấu nhắc. Chú ý phải viết <code>busybox ls</code> chứ không phải <code>ls</code> — ' +
            'rootfs chưa có symlink <code>ls</code>:' },

          { t: 'code', where: 'wsl', code:
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'echo $$\n' +
            'busybox ls /\n' +
            'busybox ls /dev\n' +
            'busybox ls -l /proc/self/fd' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.177381] devtmpfs: error mounting -2\n' +
            '[    1.234329] Run /sbin/init as init process\n' +
            '[    1.235228] Run /etc/init as init process\n' +
            '[    1.235631] Run /bin/init as init process\n' +
            '[    1.238312] Run /bin/sh as init process\n' +
            '\n' +
            '\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
            'Enter \'help\' for a list of built-in commands.\n' +
            '\n' +
            '/bin/sh: can\'t access tty; job control turned off\n' +
            '~ # echo $$\n' +
            '1\n' +
            '~ # busybox ls /\n' +
            'bin         lost+found\n' +
            '~ # busybox ls /dev\n' +
            'ls: /dev: No such file or directory\n' +
            '~ # busybox ls -l /proc/self/fd\n' +
            'ls: /proc/self/fd: No such file or directory',
            notes: [
              'Dấu nhắc <code>~ #</code> ở đây là của máy ảo, dù khung lệnh phía trên mang nhãn <b>QEMU</b>: bạn gõ vào cửa sổ đang chạy <code>./run.sh</code>. Dòng <code>can\'t access tty; job control turned off</code> là bình thường, Bài 32 đã giải thích. Terminal của bạn có thể chèn một chuỗi ký tự lạ như <code>^[[6n</code> trước mỗi lệnh — đó là shell hỏi vị trí con trỏ, vô hại.'
            ] },

          { t: 'p', x:
            'Bốn kết quả, bốn điều khác nhau. <code>echo $$</code> in <b>1</b>: shell này là PID 1, ' +
            'chính là init — kernel đã rơi xuống đường dự phòng cuối cùng và tìm thấy nó. ' +
            '<code>busybox ls /</code> chỉ thấy <code>bin</code> và <code>lost+found</code> (thư mục ' +
            '<code>mkfs.ext4</code> luôn tạo cho <code>fsck</code>). <code>/dev</code> không tồn tại — ' +
            'khớp với dòng <code>devtmpfs: error mounting -2</code> trong log. Và <code>/proc</code> ' +
            'cũng không, nên bạn không có cách nào hỏi tiến trình về chính nó.' },

          { t: 'cal', kind: 'why', title: 'Không có /dev, nhưng chữ vẫn hiện ra màn hình — vì sao',
            x: 'Shell đang ghi ra stdout, và stdout phải là <i>một file</i> nào đó. Ổ đĩa không có ' +
               '<code>/dev/console</code>. Câu trả lời là khâu 1 của hình đầu bài: kernel đã mở ' +
               '<code>/dev/console</code> trong kho cpio 512 byte, nhân bản thành fd 0, 1, 2 cho PID 1, ' +
               '<b>rồi mới</b> gắn ổ đĩa đè lên. Tên file biến mất khỏi tầm nhìn, nhưng file đã mở thì ' +
               'vẫn mở — giống như bạn vẫn nghe điện thoại được dù ai đó đã xé danh bạ. Bước 4, khi đã ' +
               'có <code>/proc</code>, sẽ bắt quả tang điều này qua <code>/proc/self/fd</code>.' },

          { t: 'p', x:
            'Thoát máy ảo. Lệnh <code>poweroff</code> chưa tồn tại dưới dạng tên riêng, nên phải gọi ' +
            'qua <code>busybox</code>:' },

          { t: 'code', where: 'qemu', code:
            'poweroff -f\n' +
            'busybox poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # poweroff -f\n' +
            '/bin/sh: poweroff: not found\n' +
            '~ # busybox poweroff -f\n' +
            '[    7.815927] Flash device refused suspend due to active operation (state 20)\n' +
            '[    7.817066] Flash device refused suspend due to active operation (state 20)\n' +
            '[    7.821497] reboot: Power down' },

          { t: 'cal', kind: 'info', title: 'Một file đủ để có shell — và đó là điều BusyBox sinh ra để làm',
            x: '<code>poweroff: not found</code> không phải lỗi của kernel mà của <b>shell</b>: nó tìm ' +
               'file tên <code>poweroff</code> trong <code>PATH</code> và không thấy. BusyBox biết ' +
               '<b>280</b> lệnh (Bài 32 đã đếm), nhưng chỉ trả lời theo tên nó được gọi — ' +
               '<code>argv[0]</code>. Hai dòng <code>Flash device refused suspend</code> xuất hiện ở ' +
               'mọi lần tắt máy <code>virt</code>, Bài 41 đã ghi nhận chúng là vô hại.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Thêm /dev: devtmpfs tự điền 141 file thiết bị',
        blocks: [
          { t: 'p', x:
            'Thêm thư mục <code>/dev</code> (rỗng — bạn không tạo một file thiết bị nào) và vài ' +
            'symlink cho những lệnh sẽ dùng, để khỏi gõ <code>busybox</code> trước mỗi lệnh:' },

          { t: 'code', where: 'wsl', code:
            'mkdir rootfs/dev\n' +
            'for a in ls cat mount umount ps poweroff touch mkdir uname df wc; do ln -s busybox rootfs/bin/$a; done\n' +
            './mkimg.sh\n' +
            'ls rootfs/bin' },

          { t: 'code', where: 'out', nocopy: true, code:
            'busybox\n' +
            'cat\n' +
            'df\n' +
            'ls\n' +
            'mkdir\n' +
            'mount\n' +
            'poweroff\n' +
            'ps\n' +
            'sh\n' +
            'touch\n' +
            'umount\n' +
            'uname\n' +
            'wc',
            notes: [
              'Kết quả được ghi qua script nên mỗi tên nằm một dòng; trong terminal, <code>ls</code> xếp chúng thành hàng. Bài 47 sẽ thay vòng <code>for</code> này bằng <code>busybox --install</code> hoặc <code>make install</code> của BusyBox.'
            ] },

          { t: 'cmdx', cmd: 'for a in … ; do ln -s busybox rootfs/bin/$a; done', title: 'Mười một symlink trong một dòng',
            rows: [
              ['<code>for a in ls cat …</code>', 'Lặp qua danh sách tên lệnh.', 'Bài 13 đã dạy vòng <code>for</code>.'],
              ['<code>ln -s busybox rootfs/bin/$a</code>', 'Tạo symlink tên <code>$a</code> trỏ tới <code>busybox</code>.', 'Đích <code>busybox</code> là <b>đường dẫn tương đối</b> — tương đối với thư mục chứa symlink. Viết <code>~/bai46/rootfs/bin/busybox</code> thì symlink sẽ trỏ tới một đường dẫn không tồn tại <i>trong máy ảo</i>.']
            ]},

          { t: 'code', where: 'wsl', code:
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'ls /dev | wc -l\n' +
            'ls -l /dev/console /dev/null /dev/vda /dev/ttyAMA0\n' +
            'ps\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.224526] devtmpfs: mounted\n' +
            '…\n' +
            '~ # ls /dev | wc -l\n' +
            '141\n' +
            '~ # ls -l /dev/console /dev/null /dev/vda /dev/ttyAMA0\n' +
            'crw-------    1 0        0           5,   1 Jan  1  1970 /dev/console\n' +
            'crw-rw-rw-    1 0        0           1,   3 Jan  1  1970 /dev/null\n' +
            'crw-------    1 0        0         204,  64 Jan  1  1970 /dev/ttyAMA0\n' +
            'brw-------    1 0        0         254,   0 Jan  1  1970 /dev/vda\n' +
            '~ # ps\n' +
            'PID   USER     COMMAND\n' +
            'ps: can\'t open \'/proc\': No such file or directory\n' +
            '~ # poweroff -f',
            notes: [
              'Dòng <code>devtmpfs: mounted</code> là dòng 252 của log, đúng vị trí của <code>error mounting -2</code> ở hai bước trước. Dấu <code>…</code> thay cho các dòng boot và banner BusyBox đã thấy ở bước 2.'
            ] },

          { t: 'p', x:
            'Log giờ nói <code>devtmpfs: mounted</code>, và thư mục bạn tạo rỗng giờ chứa <b>141</b> ' +
            'file thiết bị. Bốn file được hỏi mang đúng những cặp số bạn đã học: ' +
            '<code>/dev/console</code> <code>5, 1</code>, <code>/dev/null</code> <code>1, 3</code> — ' +
            'giống hệt máy WSL; <code>/dev/vda</code> là <code>b</code> (block) với <code>254, 0</code> ' +
            '— khớp chữ <code>on device 254:0</code> trong dòng <code>VFS: Mounted root</code>; và ' +
            '<code>/dev/ttyAMA0</code>, cổng PL011 mà <code>console=ttyAMA0</code> nói tới, là ' +
            '<code>204, 64</code>. Ngày <code>Jan  1  1970</code> không phải lỗi: máy ảo chưa đặt ' +
            'đồng hồ lúc devtmpfs tạo các file này, nên chúng mang thời điểm 0 của Unix.' },

          { t: 'cal', kind: 'info', title: 'Hai lời phàn nàn còn lại đều của chương trình',
            x: 'Cột chủ sở hữu in <code>0</code> thay vì <code>root</code>: <code>ls</code> tìm tên ' +
               'cho UID 0 trong <code>/etc/passwd</code> và không thấy file. <code>ps</code> in xong ' +
               'dòng tiêu đề rồi báo <code>can\'t open \'/proc\'</code>: nó lấy danh sách tiến trình ' +
               'bằng cách liệt kê <code>/proc</code>. Không dòng nào bắt đầu bằng ' +
               '<code>Kernel</code>. Cả hai sẽ được sửa ở bước 4.' },

          { t: 'p', x:
            'Để chắc rằng chính kernel — không phải ai khác — gắn devtmpfs, boot lại với tham số ' +
            '<code>devtmpfs.mount=0</code> mà đoạn trợ giúp Kconfig đã nhắc:' },

          { t: 'code', where: 'wsl', code:
            './run.sh devtmpfs.mount=0' },

          { t: 'code', where: 'qemu', code:
            'ls /dev | wc -l\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.000000] Kernel command line: console=ttyAMA0 root=/dev/vda devtmpfs.mount=0\n' +
            '…\n' +
            '~ # ls /dev | wc -l\n' +
            '0' },

          { t: 'cal', kind: 'why', title: 'Cùng ổ đĩa, một tham số khác, 141 thành 0',
            x: 'Ảnh đĩa không đổi một byte. Tham số xuất hiện nguyên văn trong ' +
               '<code>Kernel command line</code>, và lần này log <b>không có</b> dòng ' +
               '<code>devtmpfs: …</code> nào sau <code>VFS: Mounted root</code> — ' +
               '<code>devtmpfs_mount()</code> thấy <code>mount_dev</code> bằng 0 và trả về ngay mà ' +
               'không in gì (<code>drivers/base/devtmpfs.c:365</code>). Đây đúng là tình trạng của ' +
               'mọi initramfs: devtmpfs có sẵn trong kernel (dòng <code>devtmpfs: initialized</code> ' +
               'ở giây 0,16 vẫn in ra), chỉ là không ai gắn nó. Bước 4 sẽ gắn tay.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — /proc, /sys, /tmp, /etc: gắn tay và gặp root chỉ đọc',
        blocks: [
          { t: 'p', x:
            'Thêm năm thư mục rỗng. Không file nào bên trong — nội dung sẽ đến từ các hệ thống file ' +
            'ảo khi bạn gắn chúng:' },

          { t: 'code', where: 'wsl', code:
            'mkdir rootfs/proc rootfs/sys rootfs/tmp rootfs/etc rootfs/root\n' +
            './mkimg.sh\n' +
            'ls rootfs' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin\n' +
            'dev\n' +
            'etc\n' +
            'proc\n' +
            'root\n' +
            'sys\n' +
            'tmp' },

          { t: 'p', x:
            'Boot, rồi đi qua từng thư mục: nhìn nó khi còn rỗng, gắn hệ thống file vào, nhìn lại. ' +
            'Gõ từng dòng một để thấy kết quả của mỗi lệnh:' },

          { t: 'code', where: 'wsl', code:
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'ls /proc | wc -l\n' +
            'mount -t proc proc /proc\n' +
            'ls /proc | wc -l\n' +
            'cat /proc/cmdline\n' +
            'mount -t sysfs sysfs /sys\n' +
            'ls /sys' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /proc | wc -l\n' +
            '0\n' +
            '~ # mount -t proc proc /proc\n' +
            '~ # ls /proc | wc -l\n' +
            '105\n' +
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 root=/dev/vda \n' +
            '~ # mount -t sysfs sysfs /sys\n' +
            '~ # ls /sys\n' +
            'block       class       devices     fs          kernel      power\n' +
            'bus         dev         firmware    hypervisor  module' },

          { t: 'cmdx', cmd: 'mount -t proc proc /proc', title: 'Ba phần của một lệnh gắn hệ thống file ảo',
            rows: [
              ['<code>-t proc</code>', 'Loại hệ thống file.', 'Kernel phải được build với loại đó: <code>CONFIG_PROC_FS=y</code>, <code>CONFIG_SYSFS=y</code>, <code>CONFIG_TMPFS=y</code>.'],
              ['<code>proc</code> (thứ hai)', 'Tên \"thiết bị nguồn\".', 'Hệ thống file ảo không có thiết bị nguồn, nên chữ này chỉ để hiện trong cột đầu của <code>mount</code>. Bài 32 viết <code>none</code>; ở đây viết <code>proc</code> cho dễ đọc — kernel không quan tâm.'],
              ['<code>/proc</code>', 'Điểm gắn.', 'Phải là một thư mục <b>đã tồn tại</b>. Đó là lý do duy nhất rootfs cần thư mục rỗng này.']
            ]},

          { t: 'p', x:
            'Trước khi gắn: <b>0</b> mục. Sau khi gắn: <b>105</b> — mỗi tiến trình một thư mục số ' +
            'cộng các file như <code>cmdline</code>, <code>meminfo</code>; con số này phụ thuộc vào số ' +
            'luồng kernel đang chạy nên có thể lệch một hai đơn vị trên máy bạn. ' +
            '<code>/proc/cmdline</code> in đúng chuỗi <code>run.sh</code> truyền vào, kể cả dấu cách ' +
            'thừa ở cuối do <code>$*</code> rỗng. <code>/sys</code> cũng từ rỗng thành mười một thư ' +
            'mục mà Bài 44 và 45 đã đi qua. Giờ đến <code>/tmp</code>:' },

          { t: 'code', where: 'qemu', code:
            'touch /tmp/x\n' +
            'mount -t tmpfs tmpfs /tmp\n' +
            'touch /tmp/x && ls /tmp\n' +
            'mount' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # touch /tmp/x\n' +
            'touch: /tmp/x: Read-only file system\n' +
            '~ # mount -t tmpfs tmpfs /tmp\n' +
            '~ # touch /tmp/x && ls /tmp\n' +
            'x\n' +
            '~ # mount\n' +
            '/dev/root on / type ext4 (ro,relatime)\n' +
            'devtmpfs on /dev type devtmpfs (rw,relatime,size=215424k,nr_inodes=53856,mode=755)\n' +
            'proc on /proc type proc (rw,relatime)\n' +
            'sysfs on /sys type sysfs (rw,relatime)\n' +
            'tmpfs on /tmp type tmpfs (rw,relatime)' },

          { t: 'cal', kind: 'why', title: 'Dòng đầu tiên của mount giải thích lỗi đầu tiên',
            x: '<code>touch /tmp/x</code> thất bại với <code>Read-only file system</code> vì ' +
               '<code>/tmp</code> lúc đó chỉ là một thư mục trên ổ đĩa, và dòng đầu của ' +
               '<code>mount</code> cho thấy ổ đĩa được gắn <b><code>ro</code></b> — đúng như ' +
               '<code>root_mountflags = MS_RDONLY</code> trong mã kernel. Sau khi gắn tmpfs đè lên, ' +
               '<code>/tmp</code> thuộc một hệ thống file khác, nằm trong RAM, ghi được. Bốn dòng dưới ' +
               'đều <code>rw</code>. <code>mount</code> đọc danh sách này từ <code>/proc/mounts</code> ' +
               '— nếu bạn gõ nó <i>trước</i> khi gắn <code>/proc</code>, nó chỉ in ' +
               '<code>mount: no /proc/mounts</code>. Chữ <code>/dev/root</code> là tên kernel đặt cho ' +
               'thiết bị root, không phải một file trong <code>/dev</code>.' },

          { t: 'p', x:
            'Còn <code>/etc</code>. Nhìn cột chủ sở hữu của thư mục gốc:' },

          { t: 'code', where: 'qemu', code:
            'ls -l /\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls -l /\n' +
            'total 28\n' +
            'drwxr-xr-x    2 1000     1000          4096 Sep 28 13:29 bin\n' +
            'drwxr-xr-x    5 0        0             2860 Sep 28 13:30 dev\n' +
            'drwxr-xr-x    2 1000     1000          4096 Sep 28 13:30 etc\n' +
            'drwx------    2 0        0            16384 Sep 28 13:30 lost+found\n' +
            'dr-xr-xr-x   60 0        0                0 Sep 28 13:30 proc\n' +
            'drwxr-xr-x    2 1000     1000          4096 Sep 28 13:30 root\n' +
            'dr-xr-xr-x   13 0        0                0 Sep 28 13:30 sys\n' +
            'drwxrwxrwt    2 0        0               60 Sep 28 13:30 tmp' },

          { t: 'p', x:
            'Hai điều. Thứ nhất, <b>mọi</b> cột chủ sở hữu là số, không phải tên: ' +
            '<code>ls</code> đổi UID thành tên bằng cách đọc <code>/etc/passwd</code>, và thư mục ' +
            '<code>/etc</code> của bạn rỗng. Thứ hai, những thư mục bạn tạo trên host mang UID ' +
            '<b>1000</b> — đó là UID của bạn trong WSL (chạy <code>id -u</code> để xem số của bạn), ' +
            'vì <code>mkfs.ext4 -d</code> chép nguyên chủ sở hữu. Những thư mục do kernel gắn ' +
            '(<code>dev</code>, <code>proc</code>, <code>sys</code>, <code>tmp</code>) thuộc ' +
            '<code>0</code>. Giờ giờ ở đây là giờ UTC của máy ảo, sẽ khác trên máy bạn.' },

          { t: 'cal', kind: 'info', title: 'UID 1000 trên rootfs không phải lỗi, nhưng cũng không phải thứ để ship',
            x: 'Trên một thiết bị thật, <code>/bin</code> hay <code>/etc</code> thuộc UID 1000 nghĩa là ' +
               'người dùng thứ nhất có thể sửa chương trình hệ thống. Công cụ build rootfs như Buildroot ' +
               '(Chặng 11) giải quyết bằng <code>fakeroot</code>: đóng gói như thể mọi file thuộc root ' +
               'mà không cần quyền root thật. Trong bài này, mọi thứ chạy dưới PID 1 là root nên chủ sở ' +
               'hữu không cản gì — bạn chỉ cần biết con số 1000 từ đâu ra.' },

          { t: 'p', x:
            'Thêm hai file cấu hình tối thiểu, mỗi file một dòng. Định dạng các trường sẽ được Bài 47 ' +
            'giải thích cùng <code>inittab</code> và <code>fstab</code>; ở đây chỉ cần biết dòng đầu ' +
            'nói \"UID 0 tên là <code>root</code>\":' },

          { t: 'code', where: 'wsl', code:
            "echo 'root:x:0:0:root:/root:/bin/sh' > rootfs/etc/passwd\n" +
            "echo 'root:x:0:' > rootfs/etc/group\n" +
            './mkimg.sh' },

          { t: 'p', x:
            'Giờ đến lúc giữ lời hứa ở bước 2: chứng minh shell đang ghi vào một <code>/dev/console</code> ' +
            'không còn tên. Boot với <code>devtmpfs.mount=0</code> để <code>/dev</code> trên ổ đĩa ' +
            'rỗng, gắn <code>/proc</code>, rồi hỏi shell ba fd chuẩn của nó trỏ vào đâu:' },

          { t: 'code', where: 'wsl', code:
            './run.sh devtmpfs.mount=0' },

          { t: 'code', where: 'qemu', code:
            'mount -t proc proc /proc\n' +
            'ls -l /proc/self/fd/0 /proc/self/fd/1 /proc/self/fd/2\n' +
            'ls /dev\n' +
            'ls /dev/console\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # mount -t proc proc /proc\n' +
            '~ # ls -l /proc/self/fd/0 /proc/self/fd/1 /proc/self/fd/2\n' +
            'lrwx------    1 root     root            64 Sep 28 13:49 /proc/self/fd/0 -> /dev/console\n' +
            'lrwx------    1 root     root            64 Sep 28 13:49 /proc/self/fd/1 -> /dev/console\n' +
            'lrwx------    1 root     root            64 Sep 28 13:49 /proc/self/fd/2 -> /dev/console\n' +
            '~ # ls /dev\n' +
            '~ # ls /dev/console\n' +
            'ls: /dev/console: No such file or directory' },

          { t: 'cal', kind: 'why', title: 'Ba fd trỏ vào một cái tên không tồn tại — bằng chứng cho khâu 1',
            x: 'fd 0, 1, 2 đều là <code>/dev/console</code>, trong khi <code>ls /dev</code> in ra không ' +
               'gì cả và <code>ls /dev/console</code> báo không có. Tên mà <code>/proc/self/fd</code> ' +
               'hiện ra là tên <b>lúc file được mở</b> — lúc kernel mở nó trong rootfs 512 byte, trước ' +
               'khi ổ đĩa của bạn được gắn đè lên. (<code>/proc/self</code> ở đây là tiến trình ' +
               '<code>ls</code>; nó thừa kế ba fd đó từ shell PID 1.) Cột chủ sở hữu giờ in ' +
               '<code>root</code>, vì <code>/etc/passwd</code> đã có mặt.' },

          { t: 'p', x:
            'Cuối cùng, <code>rw</code>. Boot với tham số đó và thử ghi thẳng vào ổ đĩa:' },

          { t: 'code', where: 'wsl', code:
            './run.sh rw' },

          { t: 'code', where: 'qemu', code:
            'touch /root/x && echo writable\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.210197] VFS: Mounted root (ext4 filesystem) on device 254:0.\n' +
            '…\n' +
            '~ # touch /root/x && echo writable\n' +
            'writable' },

          { t: 'cal', kind: 'tip', title: 'Đọc một chữ trong log thay vì đoán',
            x: 'So dòng <code>VFS: Mounted root</code> ở đây với bước 1: chữ <code>readonly</code> đã ' +
               'biến mất. Đây là cách nhanh nhất để biết root đang <code>ro</code> hay <code>rw</code> ' +
               'mà không cần vào được shell. File <code>/root/x</code> vừa ghi nằm trong ' +
               '<code>rootfs.img</code>, không nằm trong thư mục <code>rootfs/</code> trên host — lần ' +
               '<code>./mkimg.sh</code> kế tiếp sẽ xoá nó. Hướng dữ liệu chỉ có một chiều: thư mục → ảnh.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Một chương trình động, và cái \"not found\" nói dối',
        blocks: [
          { t: 'p', x:
            'Viết một chương trình C ngắn nhất có thể và cross-compile nó theo cách mặc định — ' +
            'không có <code>-static</code>, tức là liên kết động, như mọi chương trình trên máy host:' },

          { t: 'code', where: 'file', name: '~/bai46/hello.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("hello from a dynamically linked program\\n");\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -O2 -o hello hello.c\n' +
            'file hello\n' +
            'aarch64-linux-gnu-readelf -l hello | grep interpreter\n' +
            'aarch64-linux-gnu-readelf -d hello | grep NEEDED' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello: ELF 64-bit LSB shared object, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=f987ef2b3aa613dac37f714ca9adc4592775c9dd, for GNU/Linux 3.7.0, not stripped\n' +
            '      [Requesting program interpreter: /lib/ld-linux-aarch64.so.1]\n' +
            ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]',
            notes: [
              '<code>BuildID</code> là một mã băm của nội dung file và sẽ khác nếu phiên bản GCC của bạn khác. <code>shared object</code> không có nghĩa là thư viện: GCC 9.4 mặc định tạo file thực thi dạng PIE, và <code>file</code> gọi PIE là shared object.'
            ] },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-readelf -l hello | grep interpreter', title: 'Hai câu hỏi cho một file ELF',
            rows: [
              ['<code>readelf -l</code>', 'In bảng <i>program header</i> — các đoạn kernel nạp vào bộ nhớ.', 'Đoạn <code>INTERP</code> chứa đường dẫn loader. Bài 18 đã đọc bảng này.'],
              ['<code>| grep interpreter</code>', 'Chỉ giữ dòng tên loader.', 'Không có dòng nào (<code>grep</code> in rỗng) = file tĩnh. Chạy lệnh này trên <code>rootfs/bin/busybox</code> để tự kiểm chứng.'],
              ['<code>readelf -d … | grep NEEDED</code>', 'In các thư viện chương trình yêu cầu.', 'Đây là danh sách loader sẽ đi tìm. Bài 17 đã dùng nó.'],
              ['Tiền tố <code>aarch64-linux-gnu-</code>', 'Dùng bản <code>readelf</code> của toolchain.', 'Với <code>readelf</code> thì bản của host cũng đọc được — ELF là định dạng chung. Nhưng giữ thói quen dùng tiền tố như Bài 26 dạy.']
            ]},

          { t: 'p', x:
            'Hai dòng đó là toàn bộ danh sách mua sắm: rootfs cần một file ở ' +
            '<code>/lib/ld-linux-aarch64.so.1</code>, và một file tên <code>libc.so.6</code> mà loader ' +
            'tìm được. Nhưng trước hết, thử chép chương trình vào mà <b>không</b> mang theo gì:' },

          { t: 'code', where: 'wsl', code:
            'cp hello rootfs/bin/\n' +
            './mkimg.sh\n' +
            './run.sh' },

          { t: 'code', where: 'qemu', code:
            'ls -l /bin/hello\n' +
            '/bin/hello\n' +
            'echo $?\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls -l /bin/hello\n' +
            '-rwxr-xr-x    1 1000     1000          9296 Sep 28 13:30 /bin/hello\n' +
            '~ # /bin/hello\n' +
            '/bin/sh: /bin/hello: not found\n' +
            '~ # echo $?\n' +
            '127' },

          { t: 'cal', kind: 'warn', title: 'ls thấy nó, shell nói không có nó',
            x: 'Dòng thứ nhất chứng minh <code>/bin/hello</code> tồn tại, 9 296 byte, có bit ' +
               '<code>x</code>. Dòng thứ hai nói <code>not found</code>. Mã <b>127</b> là mã shell dùng ' +
               'cho \"không chạy được lệnh\" — Bài 12 đã gặp nó, và đã nói nguyên nhân thường gặp là thiếu ' +
               'thư viện chia sẻ. Không có gì sai trong hai câu trả lời đó: ' +
               '<code>execve()</code> trả về <code>ENOENT</code> vì kernel không mở được ' +
               '<code>/lib/ld-linux-aarch64.so.1</code>, và shell chỉ biết in lại ENOENT theo cách nó ' +
               'hiểu. Thông báo nói về file bạn gõ, không phải file thực sự thiếu. Hãy nhớ cảnh này: ' +
               'nó sẽ xuất hiện lại ở mọi bo mạch mà bạn chép một chương trình build sai toolchain vào.' },

          { t: 'p', x:
            'Mang loader và libc theo. <code>cp -L</code> là bắt buộc: trong toolchain, cả hai tên đều ' +
            'là symlink trỏ tới file có số phiên bản (<code>ld-2.31.so</code>, <code>libc-2.31.so</code>), ' +
            'và bạn cần chép <i>nội dung</i>, không phải một symlink trỏ vào hư không:' },

          { t: 'code', where: 'wsl', code:
            'mkdir rootfs/lib\n' +
            'cp -L /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1 rootfs/lib/\n' +
            'cp -L /usr/aarch64-linux-gnu/lib/libc.so.6 rootfs/lib/\n' +
            'ls -l rootfs/lib\n' +
            './mkimg.sh\n' +
            './run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 1560\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  145320 Sep 28 20:31 ld-linux-aarch64.so.1\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 1446928 Sep 28 20:31 libc.so.6' },

          { t: 'cmdx', cmd: 'cp -L /usr/aarch64-linux-gnu/lib/libc.so.6 rootfs/lib/', title: 'Chép theo symlink',
            rows: [
              ['<code>-L</code>', 'Đi theo symlink và chép file đích.', 'Không có <code>-L</code>, <code>cp</code> vẫn đi theo symlink ở đối số nguồn — nhưng viết rõ ra để người đọc không phải nhớ quy tắc đó. <code>cp -a</code> hay <code>cp -P</code> thì ngược lại: chép symlink nguyên dạng, và trong máy ảo nó trỏ tới <code>libc-2.31.so</code> không tồn tại.'],
              ['<code>/usr/aarch64-linux-gnu/lib/</code>', 'Thư viện đích của toolchain.', 'Bài 26 gọi đây là sysroot. Chép từ đây đảm bảo libc trên rootfs đúng bản mà <code>hello</code> được liên kết.']
            ]},

          { t: 'code', where: 'qemu', code:
            '/bin/hello\n' +
            'echo $?\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # /bin/hello\n' +
            'hello from a dynamically linked program\n' +
            '~ # echo $?\n' +
            '0' },

          { t: 'cal', kind: 'info', title: '1,59 MB thư viện cho một chương trình 9 KB',
            x: 'Chương trình chạy, mã thoát <b>0</b>. Cái giá: <b>145 320 + 1 446 928 = 1 592 248</b> ' +
               'byte thư viện để chạy một file <b>9 296</b> byte — trong khi BusyBox tĩnh, với 280 lệnh, ' +
               'là 1 980 720 byte. Cả rootfs giờ chiếm <b>3.5M</b> theo <code>du -sh rootfs</code>. Đây ' +
               'là con số khiến người ta tính kỹ trước khi chọn động hay tĩnh cho một thiết bị flash nhỏ, ' +
               'và là lý do Bài 28 dựng toolchain musl: <code>libc</code> của musl nhỏ hơn nhiều. Chú ý ' +
               'thêm: <code>libc.so.6</code> tự nó cũng cần loader — ' +
               '<code>readelf -d rootfs/lib/libc.so.6 | grep NEEDED</code> in ' +
               '<code>[ld-linux-aarch64.so.1]</code>.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — Bốn cách /sbin/init chết',
        blocks: [
          { t: 'p', x:
            'Giờ đặt chương trình động đó vào chỗ quan trọng nhất: làm init. Dùng một rootfs thứ hai, ' +
            '<code>broken/</code>, tối giản hết mức — chỉ <code>/sbin/init</code> và <code>/dev</code>, ' +
            '<b>không có</b> <code>/bin/sh</code> để kernel có đường lui:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p broken/sbin broken/dev\n' +
            'cp hello broken/sbin/init\n' +
            'mkfs.ext4 -q -d broken broken.img 64M\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -drive file=broken.img,format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.362617] Run /sbin/init as init process\n' +
            '[    1.393204] Run /etc/init as init process\n' +
            '[    1.394734] Run /bin/init as init process\n' +
            '[    1.395880] Run /bin/sh as init process\n' +
            '[    1.397112] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.',
            notes: [
              'Dòng lệnh QEMU giống <code>run.sh</code>, chỉ đổi <code>rootfs.img</code> thành <code>broken.img</code>. Ba lần boot kế tiếp trong bước này dùng đúng lệnh đó; sau mỗi panic, thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'
            ] },

          { t: 'cal', kind: 'danger', title: 'Log này giống hệt bước 1 — dù /sbin/init nằm ngay đó',
            x: 'So với bước 1, ổ đĩa rỗng tuyệt đối: <b>không có một dòng nào khác</b>. Không ' +
               '<code>Starting init: … exists</code>, không mã lỗi. Một người chỉ đọc log sẽ kết luận ' +
               '\"thiếu <code>/sbin/init</code>\" và đi kiểm tra đường dẫn, quyền, tên file — cả ba đều ' +
               'đúng. Lý do nằm ở hai phần lý thuyết bạn đã đọc: loader thiếu làm <code>execve()</code> ' +
               'trả về <code>-ENOENT</code>, và <code>try_to_run_init_process()</code> không in gì khi ' +
               'gặp <code>-ENOENT</code>. Đây là lần boot đắt nhất trong bài, vì nó không để lại dấu ' +
               'vết. Cách duy nhất để thấy nguyên nhân là mở rootfs trên host: ' +
               '<code>readelf -l broken/sbin/init | grep interpreter</code> rồi kiểm tra ' +
               '<code>broken/lib</code> có file đó không.' },

          { t: 'p', x:
            'Mang loader và libc vào, rồi boot lại bằng đúng lệnh QEMU trên:' },

          { t: 'code', where: 'wsl', code:
            'mkdir broken/lib\n' +
            'cp -L /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1 /usr/aarch64-linux-gnu/lib/libc.so.6 broken/lib/\n' +
            'rm -f broken.img; mkfs.ext4 -q -d broken broken.img 64M' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.425678] Run /sbin/init as init process\n' +
            'hello from a dynamically linked program\n' +
            '[    1.519329] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000' },

          { t: 'cal', kind: 'info', title: 'Lần này init chạy thật — rồi chết theo cách khác',
            x: 'Không còn ba dòng <code>Run /etc/init</code>, <code>/bin/init</code>, <code>/bin/sh</code>: ' +
               'kernel dừng ở đường đầu tiên vì <code>/sbin/init</code> đã chạy được. Chương trình in ' +
               'câu của nó, <code>return 0</code>, và PID 1 kết thúc. Kernel không cho phép điều đó: ' +
               '<code>Attempted to kill init! exitcode=0x00000000</code> — <code>0x00000000</code> là ' +
               'mã thoát 0, đúng giá trị <code>main()</code> trả về. Bài 32 đã gặp panic này khi ' +
               '<code>/init</code> thiếu <code>exec</code>; Bài 49 sẽ giải thích vì sao PID 1 phải ' +
               'sống mãi.' },

          { t: 'p', x:
            'Hai cách chết còn lại có lời giải thích trong log. Gỡ bit thực thi:' },

          { t: 'code', where: 'wsl', code:
            'chmod -x broken/sbin/init\n' +
            'rm -f broken.img; mkfs.ext4 -q -d broken broken.img 64M' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.179329] Run /sbin/init as init process\n' +
            '[    1.182901] Starting init: /sbin/init exists but couldn\'t execute it (error -13)\n' +
            '[    1.183390] Run /etc/init as init process\n' +
            '[    1.184278] Run /bin/init as init process\n' +
            '[    1.184924] Run /bin/sh as init process\n' +
            '[    1.185637] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.' },

          { t: 'p', x:
            'Giờ có một dòng mới, ngay sau <code>Run /sbin/init</code>: <code>exists but couldn\'t ' +
            'execute it (error -13)</code>. <code>-13</code> là <code>EACCES</code> — \"không có ' +
            'quyền\". Panic ở cuối vẫn là cùng một câu, nhưng dòng thứ hai đã nói cho bạn biết ' +
            'chính xác phải sửa gì. Cuối cùng, thay init bằng một chương trình <b>x86-64</b> — ' +
            '<code>/bin/true</code> của chính máy WSL:' },

          { t: 'code', where: 'wsl', code:
            'cp /bin/true broken/sbin/init && chmod +x broken/sbin/init\n' +
            'file broken/sbin/init\n' +
            'rm -f broken.img; mkfs.ext4 -q -d broken broken.img 64M' },

          { t: 'code', where: 'out', nocopy: true, code:
            'broken/sbin/init: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=be53663829ed7ccdc4a913aa637ff91d280738f5, for GNU/Linux 3.2.0, stripped\n' +
            '…\n' +
            '[    1.581662] Run /sbin/init as init process\n' +
            '[    1.619699] Starting init: /sbin/init exists but couldn\'t execute it (error -8)\n' +
            '[    1.620358] Run /etc/init as init process',
            notes: [
              'Dòng đầu là của <code>file</code> trên host; <code>BuildID</code> của <code>/bin/true</code> phụ thuộc bản Ubuntu của bạn. Dấu <code>…</code> thay cho lệnh QEMU và phần boot. Sau dòng cuối là <code>Run /bin/init</code>, <code>Run /bin/sh</code> và cùng một panic <code>No working init found</code>.'
            ] },

          { t: 'cal', kind: 'why', title: '-8 là ENOEXEC — và vì sao dòng chmod +x ở đây là bắt buộc',
            x: '<code>-8</code> = <code>ENOEXEC</code>, <code>Exec format error</code> của Bài 25: ' +
               'kernel ARM64 đọc trường <code>e_machine</code> của ELF, thấy x86-64, và từ chối. Để ý ' +
               'thứ tự kiểm tra: dòng <code>chmod +x</code> phải có, vì <code>cp</code> chép đè lên ' +
               'một file đã tồn tại thì <b>giữ nguyên quyền của file đích</b> — file vừa bị ' +
               '<code>chmod -x</code> ở trên. Quên nó, bạn sẽ lại thấy <code>-13</code>, vì kernel ' +
               'kiểm tra quyền <b>trước</b> khi đọc nội dung. Chú ý thêm: <code>/bin/true</code> cũng ' +
               'là chương trình động, và loader của nó (<code>/lib64/ld-linux-x86-64.so.2</code>) không ' +
               'có trên rootfs — nhưng kernel không bao giờ đi xa đến đó, nên bạn thấy <code>-8</code> ' +
               'chứ không phải sự im lặng của <code>-2</code>.' },

          { t: 'p', x:
            'Bước này đã dựng lại đủ năm dòng của bảng <code>No working init found</code> ở phần lý ' +
            'thuyết (dòng \"không có file\" là bước 1). Nhìn lại những gì còn trên đĩa:' },

          { t: 'code', where: 'wsl', code:
            'ls ~/bai46\n' +
            'du -sh ~/bai46' },

          { t: 'code', where: 'out', nocopy: true, code:
            'broken\n' +
            'broken.img\n' +
            'hello\n' +
            'hello.c\n' +
            'mkimg.sh\n' +
            'rootfs\n' +
            'rootfs.img\n' +
            'run.sh\n' +
            '19M\t/home/cah8hc/bai46',
            notes: [
              'Kết quả ghi qua script nên mỗi tên một dòng. Hai ảnh đĩa 64 MiB chỉ chiếm vài MB mỗi cái nhờ sparse, như bước 1 đã giải thích. <code>~/bai46</code> không được bài nào sau dùng tới; bạn có thể giữ lại để thử nghiệm hoặc xoá bằng <code>rm -rf ~/bai46</code>. Bài này không ghi gì vào <code>~/bai38</code> hay <code>~/bai32</code>.'
            ] }
        ] }
    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều gặp thật trong lúc soạn bài. Chú ý cột đầu: dòng nào bắt đầu bằng ' +
      '<code>Kernel panic</code> hoặc <code>devtmpfs</code> là kernel phàn nàn; dòng nào bắt đầu ' +
      'bằng tên một lệnh là chương trình phàn nàn.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Kernel panic - not syncing: No working init found.</code>, và ngay phía trên chỉ có ' +
         'bốn dòng <code>Run … as init process</code> liền nhau',
         'Cả bốn đường dẫn đều trả về <code>-ENOENT</code>: hoặc không có file, <b>hoặc</b> file ' +
         'là chương trình động mà loader của nó không có trên rootfs. Kernel không phân biệt được hai ' +
         'trường hợp.',
         'Trên host: <code>ls rootfs/sbin/init rootfs/bin/sh</code>. Nếu có file, ' +
         '<code>readelf -l … | grep interpreter</code> rồi kiểm tra đường dẫn đó có trong rootfs. ' +
         'Dùng BusyBox tĩnh để loại hẳn khả năng thứ hai.'],

        ['<code>Starting init: /sbin/init exists but couldn\'t execute it (error -13)</code>',
         '<code>EACCES</code>: file thiếu bit thực thi.',
         '<code>chmod +x rootfs/sbin/init</code>, rồi tạo lại ảnh.'],

        ['<code>Starting init: /sbin/init exists but couldn\'t execute it (error -8)</code>',
         '<code>ENOEXEC</code>: file không phải ELF cho kiến trúc này — thường là chép nhầm một ' +
         'binary x86-64 của host, hoặc một script thiếu dòng <code>#!</code>.',
         '<code>file rootfs/sbin/init</code> phải nói <code>ARM aarch64</code>. Build lại bằng ' +
         '<code>aarch64-linux-gnu-gcc</code>.'],

        ['<code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000</code>',
         'Init đã chạy được rồi <b>thoát</b>. Mã sau <code>exitcode=</code> là giá trị nó trả về. ' +
         'Cũng xảy ra khi bạn gõ <code>exit</code> ở shell PID 1.',
         'Init không bao giờ được kết thúc: script phải kết thúc bằng <code>exec</code> một chương ' +
         'trình sống mãi, chương trình C phải lặp mãi. Bài 49 bàn tiếp.'],

        ['<code>devtmpfs: error mounting -2</code>',
         'Rootfs không có thư mục <code>/dev</code> để kernel gắn devtmpfs vào.',
         '<code>mkdir rootfs/dev</code>. Không cần tạo file thiết bị nào bên trong.'],

        ['<code>/bin/sh: /bin/hello: not found</code>, mã thoát <b>127</b>, dù <code>ls -l</code> thấy file',
         'Chương trình liên kết động, loader ghi trong <code>INTERP</code> không có trên rootfs.',
         'Chép <code>ld-linux-aarch64.so.1</code> và <code>libc.so.6</code> vào ' +
         '<code>rootfs/lib/</code> bằng <code>cp -L</code>, hoặc build lại với <code>-static</code>.'],

        ['<code>ps: can\'t open \'/proc\': No such file or directory</code> hoặc ' +
         '<code>mount: no /proc/mounts</code>',
         'Chưa gắn <code>procfs</code> (hoặc chưa có thư mục <code>/proc</code>).',
         '<code>mkdir rootfs/proc</code> trên host, rồi <code>mount -t proc proc /proc</code> trong ' +
         'máy ảo. Bài 47 sẽ để init làm việc này.'],

        ['<code>touch: /tmp/x: Read-only file system</code>',
         'Kernel gắn root ở chế độ chỉ đọc (<code>root_mountflags = MS_RDONLY</code>).',
         'Gắn tmpfs vào <code>/tmp</code>, hoặc thêm <code>rw</code> vào dòng lệnh kernel, hoặc ' +
         '<code>mount -o remount,rw /</code>.'],

        ['<code>/bin/sh: poweroff: not found</code>',
         'BusyBox có lệnh đó, nhưng chưa có symlink <code>poweroff</code> trỏ tới nó.',
         'Gõ <code>busybox poweroff -f</code>, hoặc tạo symlink trong <code>rootfs/bin</code>.'],

        ['<code>rootfs.img contains a ext4 file system</code> … <code>Proceed anyway? (y,N)</code>',
         'Chạy <code>mkfs.ext4</code> lên một ảnh đã tồn tại. Trả lời <code>N</code> (hoặc chỉ ' +
         '<kbd>Enter</kbd>) thì lệnh thoát mã 1 và <b>ảnh cũ giữ nguyên</b> — lần boot sau chạy ' +
         'phiên bản cũ.',
         '<code>rm -f rootfs.img</code> trước, như <code>mkimg.sh</code> làm.'],

        ['Cột chủ sở hữu trong <code>ls -l</code> hiện <code>0</code> và <code>1000</code> thay vì tên',
         'Không có <code>/etc/passwd</code> để đổi UID thành tên; <code>1000</code> là UID của bạn ' +
         'trên host, được <code>mkfs.ext4 -d</code> chép nguyên.',
         'Thêm <code>/etc/passwd</code> và <code>/etc/group</code>. Không ảnh hưởng gì tới việc ' +
         'chạy; khi ship thật, dùng <code>fakeroot</code> hoặc Buildroot để đặt chủ sở hữu là root.']
      ] },

    { t: 'recap', title: 'Tóm tắt', items: [
      'Kernel chạm vào rootfs ở <b>bốn</b> chỗ: mở <code>/dev/console</code> (từ một kho cpio ' +
        '<b>512</b> byte nhúng trong <code>Image</code>, trước khi gắn ổ đĩa), gắn ổ root ' +
        '<b>chỉ đọc</b>, gắn devtmpfs vào <code>/dev</code>, rồi chạy init.',
      'Chỉ <b>một init chạy được</b> là bắt buộc. Một file — BusyBox tĩnh <b>1 980 720</b> byte ' +
        'tại <code>/bin/sh</code> — đủ để có dấu nhắc <code>~ #</code> với <code>echo $$</code> = ' +
        '<b>1</b>, dù ổ đĩa chưa có <code>/dev</code>.',
      '<code>/proc</code>, <code>/sys</code>, <code>/tmp</code>, <code>/etc</code> là yêu cầu của ' +
        '<b>chương trình</b>. Ba thư mục đầu chỉ là điểm gắn rỗng; nội dung đến từ ' +
        '<code>mount -t proc</code> (0 → <b>105</b> mục), <code>sysfs</code>, <code>tmpfs</code>.',
      '<b>devtmpfs</b>: kernel tự điền file thiết bị — <b>141</b> file từ một <code>/dev</code> ' +
        'rỗng. Tự gắn khi boot từ ổ đĩa (<code>CONFIG_DEVTMPFS_MOUNT</code>), <b>không</b> tự gắn ' +
        'trong initramfs; <code>devtmpfs.mount=0</code> đưa 141 về 0.',
      'File thiết bị chỉ mang loại (<code>c</code>/<code>b</code>) và <b>major/minor</b>: ' +
        '<code>/dev/console</code> <code>5, 1</code>, <code>/dev/null</code> <code>1, 3</code>, ' +
        '<code>/dev/vda</code> <code>254, 0</code>. Tên chỉ là nhãn.',
      'Chương trình động cần loader trong <code>INTERP</code> + <code>libc.so.6</code> — ' +
        '<b>1 592 248</b> byte cho một file <b>9 296</b> byte. Thiếu loader, shell báo ' +
        '<code>not found</code> mã <b>127</b> cho một file đang nằm đó.',
      '<code>No working init found</code> có nhiều nguyên nhân: <code>-2</code> (không có file ' +
        '<b>hoặc</b> thiếu loader) <b>im lặng</b>; <code>-13</code> (thiếu <code>x</code>) và ' +
        '<code>-8</code> (sai kiến trúc) in <code>Starting init: … exists</code>. Init chạy rồi thoát ' +
        'thì là <code>Attempted to kill init!</code>.',
      '<code>mkfs.ext4 -d thư_mục ảnh 64M</code> tạo rootfs không cần <code>sudo</code>. Root ' +
        'gắn <code>ro</code> theo mặc định; <code>rw</code> trên dòng lệnh xoá chữ ' +
        '<code>readonly</code> khỏi dòng <code>VFS: Mounted root</code>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Rootfs của bạn giờ chạy được, nhưng mỗi lần boot bạn phải tự gõ ba lệnh ' +
         '<code>mount</code>, tự tạo từng symlink bằng một vòng <code>for</code>, và shell PID 1 ' +
         'chết là cả máy panic. BusyBox bạn dùng cũng là bản Debian build sẵn, với <b>280</b> lệnh ' +
         'mà bạn không chọn. <b>Bài 47 — BusyBox: dựng rootfs bằng tay</b> tự cross-compile BusyBox ' +
         'từ mã nguồn với <code>CONFIG_STATIC</code>, để <code>make install</code> tạo hết symlink ' +
         'trong một lệnh, và viết <code>/etc/inittab</code>, <code>/etc/fstab</code> cùng một script ' +
         'khởi động để ba lệnh <code>mount</code> kia tự chạy — lần đầu tiên hệ thống của bạn boot ' +
         'vào một shell mà không cần bạn gõ gì.' }
  ],

  quiz: [
    { q: 'Boot một rootfs mới, log kết thúc bằng bốn dòng <code>Run /sbin/init as init process</code> … <code>Run /bin/sh as init process</code> liền nhau rồi <code>No working init found</code>. Trên host, <code>ls -l rootfs/sbin/init</code> cho thấy file tồn tại, <code>-rwxr-xr-x</code>, và <code>file</code> nói <code>ARM aarch64</code>. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Kernel không đọc được ext4, nên không thấy file nào.',
        '<code>/sbin/init</code> là chương trình liên kết động và loader của nó không có trên rootfs.',
        'File thiếu quyền thực thi cho người dùng root.',
        'Thiếu thư mục <code>/dev</code> nên kernel không mở được console.'
      ],
      a: 1,
      why: 'Không có dòng <code>Starting init: … exists</code> nghĩa là mọi lần thử đều trả về <code>-ENOENT</code> — mã duy nhất <code>try_to_run_init_process()</code> bỏ qua trong im lặng. File có mặt, đúng quyền, đúng kiến trúc, nên <code>-ENOENT</code> phải đến từ file <i>khác</i>: loader ghi trong <code>INTERP</code>. Nếu kernel không đọc được ext4 thì log đã dừng ở lỗi VFS, không tới được <code>Run /sbin/init</code>; thiếu quyền cho <code>-13</code> kèm lời giải thích; thiếu <code>/dev</code> chỉ gây <code>devtmpfs: error mounting -2</code>.' },

    { q: 'Rootfs chỉ gồm <code>/bin/busybox</code> (tĩnh) và symlink <code>/bin/sh</code>, không có <code>/dev</code>. Điều gì xảy ra khi boot bằng <code>root=/dev/vda</code>?',
      opts: [
        'Boot tới dấu nhắc <code>~ #</code>, shell là PID 1 và in chữ ra màn hình bình thường; log có <code>devtmpfs: error mounting -2</code>.',
        'Panic <code>No working init found</code>, vì thiếu <code>/dev/console</code>.',
        'Treo im lặng sau <code>VFS: Mounted root</code>, vì shell không có stdout.',
        'Kernel tự tạo thư mục <code>/dev</code> trên ổ đĩa rồi gắn devtmpfs vào.'
      ],
      a: 0,
      why: 'Kernel mở <code>/dev/console</code> trong kho cpio 512 byte nhúng sẵn và nhân bản thành fd 0, 1, 2 <b>trước</b> khi gắn ổ đĩa. Ổ đĩa không có <code>/dev</code> chỉ khiến devtmpfs không có chỗ gắn (<code>-2</code> = <code>ENOENT</code>), và kernel đi tiếp. Kernel gắn root chỉ đọc nên cũng không thể tự tạo thư mục nào trên đó.' },

    { q: 'Vì sao khi boot bằng initramfs, <code>/init</code> phải tự gõ <code>mount -t devtmpfs devtmpfs /dev</code>, còn khi boot từ ổ đĩa bằng <code>root=</code> thì <code>/dev</code> đã có sẵn 141 file?',
      opts: [
        'Initramfs dùng một kernel khác, không có <code>CONFIG_DEVTMPFS</code>.',
        'devtmpfs chỉ hoạt động trên ext4, không hoạt động trên tmpfs của initramfs.',
        'Kernel gắn devtmpfs ở cuối bước \"gắn ổ root\"; initramfs chạy <code>/init</code> ngay và không bao giờ đi qua bước đó.',
        'Ổ đĩa ext4 chứa sẵn 141 file thiết bị do <code>mkfs.ext4</code> tạo.'
      ],
      a: 2,
      why: '<code>devtmpfs_mount()</code> được gọi ở cuối <code>prepare_namespace()</code>, hàm chỉ chạy khi không có <code>/init</code> dùng được. Đoạn trợ giúp của <code>DEVTMPFS_MOUNT</code> nói thẳng: \"<i>This option does not affect initramfs based booting</i>\". devtmpfs có sẵn trong cả hai trường hợp — dòng <code>devtmpfs: initialized</code> luôn in ra — chỉ là không ai gắn nó. <code>mkfs.ext4 -d</code> chép một thư mục <code>/dev</code> rỗng.' },

    { q: 'Trong máy ảo, <code>ls -l /bin/hello</code> in <code>-rwxr-xr-x … 9296 … /bin/hello</code>, nhưng gõ <code>/bin/hello</code> thì được <code>/bin/sh: /bin/hello: not found</code> và <code>echo $?</code> in 127. Lệnh nào trên <b>host</b> chỉ ra nguyên nhân nhanh nhất?',
      opts: [
        '<code>chmod +x rootfs/bin/hello</code>',
        '<code>aarch64-linux-gnu-readelf -l rootfs/bin/hello | grep interpreter</code>',
        '<code>file rootfs/bin/busybox</code>',
        '<code>du -h rootfs.img</code>'
      ],
      a: 1,
      why: 'File đã có bit <code>x</code>, nên <code>chmod</code> không đổi gì. \"not found\" cho một file đang tồn tại là dấu hiệu kinh điển của loader thiếu: <code>execve()</code> trả về <code>ENOENT</code> khi kernel không mở được đường dẫn trong <code>INTERP</code>. <code>readelf -l</code> in ra đường dẫn đó (<code>/lib/ld-linux-aarch64.so.1</code>), và bạn chỉ cần kiểm tra nó có trong <code>rootfs/lib</code> không.' },

    { q: 'Bạn chép một chương trình vào <code>rootfs/sbin/init</code> và boot. Log in <code>Starting init: /sbin/init exists but couldn\'t execute it (error -8)</code>. Chuyện gì đã xảy ra?',
      opts: [
        'File thiếu bit thực thi.',
        'Thiếu <code>libc.so.6</code>.',
        'Rootfs đang gắn chỉ đọc nên không chạy được chương trình.',
        'File là binary cho kiến trúc khác (ví dụ x86-64), kernel ARM64 không chạy được.'
      ],
      a: 3,
      why: '<code>-8</code> là <code>ENOEXEC</code> — <code>Exec format error</code> của Bài 25: kernel đọc header ELF và không nhận ra định dạng. Thiếu bit thực thi cho <code>-13</code> (<code>EACCES</code>). Thiếu thư viện cho <code>-2</code> và không in dòng này. Root chỉ đọc không cản việc <i>chạy</i> chương trình, chỉ cản việc ghi.' },

    { q: 'Vì sao lệnh <code>touch /tmp/x</code> thất bại với <code>Read-only file system</code> ngay sau khi boot từ ổ đĩa, nhưng thành công sau <code>mount -t tmpfs tmpfs /tmp</code>?',
      opts: [
        'Vì <code>/tmp</code> trên ổ đĩa thiếu quyền ghi cho root.',
        'Vì <code>touch</code> của BusyBox chỉ ghi được vào RAM.',
        'Vì kernel gắn ổ root ở chế độ chỉ đọc theo mặc định; tmpfs là một hệ thống file khác, nằm trong RAM, gắn đè lên và ghi được.',
        'Vì devtmpfs chiếm hết chỗ trên ổ đĩa.'
      ],
      a: 2,
      why: '<code>init/do_mounts.c:31</code>: <code>root_mountflags = MS_RDONLY | MS_SILENT</code>. Dòng đầu của <code>mount</code> xác nhận <code>/dev/root on / type ext4 (ro,…)</code>. Gắn tmpfs vào <code>/tmp</code> thì mọi thao tác dưới <code>/tmp</code> đi vào hệ thống file mới, <code>rw</code>. Thêm <code>rw</code> vào dòng lệnh kernel là cách thứ hai — và dòng <code>VFS: Mounted root</code> sẽ mất chữ <code>readonly</code>.' }
  ]
});

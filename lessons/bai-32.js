/* Bài 32 — Boot kernel đầu tiên trong QEMU
   Chặng 05 — QEMU và luồng khởi động */

Lesson.register({
  id: 'bai-32',
  title: 'Boot kernel đầu tiên trong QEMU',
  minutes: 65,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    '<p>Đến bài này bạn đã có đủ mọi thứ trừ một thứ: <b>một hệ điều hành</b>. Bài 30 dựng được ' +
    'cỗ máy và cho nó chạy 105 byte assembly. Bài 31 dạy bạn điều khiển cỗ máy ấy bằng dòng ' +
    'lệnh. Hôm nay bạn nạp vào đó một <b>nhân Linux ARM64 thật</b> và đi tới dấu nhắc ' +
    '<code>~ #</code> chạy bên trong máy ảo.</p>' +
    '<p>Nhưng một nhân Linux một mình thì <b>không boot được</b>. Nó sẽ khởi tạo xong phần cứng, ' +
    'đi tìm hệ thống tệp gốc, không thấy, và chết bằng một dòng <code>Kernel panic</code>. Bạn ' +
    'phải đưa cho nó mảnh ghép thứ hai — một <b>initramfs</b>: một thư mục nhỏ chứa shell, được ' +
    'đóng gói thành cpio, nén gzip, và nạp thẳng vào RAM cạnh nhân.</p>' +
    '<p>Bài này bạn <b>tự tay đóng gói initramfs ấy</b>. Bảy file, một script <code>init</code> ' +
    'sáu dòng, một lệnh <code>cpio</code>. Kết quả là một file <b>1 035 400</b> byte — chính con ' +
    'số bạn đã trừ bằng tay từ device tree ở Bài 31, giờ hiện ra dưới dạng một file thật trên ' +
    'đĩa.</p>' +
    '<p>Phần lớn thời gian còn lại dành cho việc <b>đọc log</b>. 238 dòng trôi qua trong khoảng ' +
    'ba giây, và một kỹ sư embedded sống bằng khả năng nhìn vào đống đó rồi chỉ đúng dòng có ' +
    'nghĩa. Bạn sẽ chia log thành sáu chặng, và sẽ cố tình phá ba lần để thấy mỗi cách hỏng in ' +
    'ra thông báo gì.</p>',

  goals: [
    'Phân biệt được <code>vmlinux</code>, <code>vmlinuz</code>, <code>Image</code> và <code>zImage</code>, và nói được QEMU nhận cái nào',
    'Lấy được một nhân Linux ARM64 dựng sẵn từ kho Debian mà không cần biên dịch',
    'Tự đóng gói một initramfs tối giản bằng <code>cpio -H newc</code> + <code>gzip</code>',
    'Giải thích được vì sao nhân cần <code>/init</code> và khác nhau giữa <code>init=</code> và <code>rdinit=</code>',
    'Chia được log khởi động thành sáu chặng và chỉ đúng dòng đánh dấu ranh giới mỗi chặng',
    'Chẩn đoán được ba kiểu hỏng: thiếu initramfs, sai đường dẫn init, thiếu <code>console=</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. BA MẢNH GHÉP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba mảnh ghép của một lần boot' },

    { t: 'p', x:
      'Một hệ thống Linux nhúng tối giản cần đúng ba thứ, không hơn. Bài này bạn chuẩn bị cả ba ' +
      'rồi ghép chúng bằng ba tham số QEMU đã học ở Bài 31.' },

    { t: 'table',
      head: ['Mảnh ghép', 'Là cái gì', 'Đưa vào bằng'],
      rows: [
        ['<b>Ảnh nhân</b>', 'Bản thân Linux, đã biên dịch cho ARM64. Chứa mã khởi tạo phần cứng, quản lý bộ nhớ, lập lịch, driver.', '<code>-kernel</code>'],
        ['<b>Hệ thống tệp gốc</b>', 'Nơi nhân đi tìm chương trình đầu tiên để chạy. Ở đây là một <b>initramfs</b> nằm hoàn toàn trong RAM.', '<code>-initrd</code>'],
        ['<b>Dòng lệnh nhân</b>', 'Chuỗi tham số nhân đọc lúc khởi động: console ở đâu, chạy chương trình nào đầu tiên.', '<code>-append</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao thiếu mảnh nào cũng chết',
      x: '<p>Ba mảnh này không phải ba tuỳ chọn — chúng là ba mắt xích của <b>một chuỗi bàn ' +
         'giao</b>. Nhân khởi tạo xong phần cứng thì việc cuối cùng nó làm là ' +
         '<code>execve()</code> một chương trình ở không gian người dùng. Nếu chương trình ấy ' +
         'không tồn tại, nhân không có gì để bàn giao, và mã nguồn Linux xử lý tình huống đó ' +
         'bằng <code>panic()</code> — dừng hẳn, không có phương án dự phòng.</p>' +
         '<p>Ở Bài 30 bạn không gặp vấn đề này vì <code>hello.S</code> <b>tự nó là</b> chương ' +
         'trình cuối cùng — không có khái niệm không gian người dùng, không có ' +
         'bàn giao. Nạp một nhân Linux là bước vào một thế giới có <b>hai không gian</b>, và ' +
         'mọi rắc rối boot của bạn từ nay tới hết khoá học đều nằm ở đường nối giữa chúng.</p>' },

    { t: 'fig', cap:
      'Nhân không "chạy" hệ thống — nó chỉ chuẩn bị rồi bàn giao. Điểm bàn giao ' +
      '(<code>Run /init as init process</code>) là dòng log quan trọng nhất của cả lần boot.',
      svg:
      '<svg viewBox="0 0 720 232" width="720" role="img" aria-label="Ba mảnh ghép của một lần boot: ảnh nhân, initramfs và dòng lệnh nhân, gặp nhau tại điểm bàn giao Run init">' +

      '<rect class="d-box-p" x="4" y="10" width="210" height="76" rx="8"/>' +
      '<text class="d-t"  x="109" y="34" text-anchor="middle">Ảnh nhân</text>' +
      '<text class="d-tm" x="109" y="54" text-anchor="middle">-kernel Image</text>' +
      '<text class="d-ts" x="109" y="74" text-anchor="middle">nạp tại 0x40080000</text>' +

      '<rect class="d-box-a" x="4" y="96" width="210" height="76" rx="8"/>' +
      '<text class="d-t"  x="109" y="120" text-anchor="middle">Hệ thống tệp gốc</text>' +
      '<text class="d-tm" x="109" y="140" text-anchor="middle">-initrd final.cpio.gz</text>' +
      '<text class="d-ts" x="109" y="160" text-anchor="middle">nạp tại 0x48000000</text>' +

      '<rect class="d-box" x="4" y="182" width="210" height="44" rx="8"/>' +
      '<text class="d-tm" x="109" y="200" text-anchor="middle">-append "console=…"</text>' +
      '<text class="d-ts" x="109" y="218" text-anchor="middle">vào chosen/bootargs</text>' +

      '<line class="d-line" x1="214" y1="48"  x2="290" y2="100"/>' +
      '<line class="d-line" x1="214" y1="134" x2="290" y2="116"/>' +
      '<line class="d-line" x1="214" y1="204" x2="290" y2="132"/>' +
      '<path class="d-arrow" d="M290 116 L280 111 L280 121 Z"/>' +

      '<rect class="d-box-p" x="296" y="86" width="180" height="60" rx="8"/>' +
      '<text class="d-t"  x="386" y="110" text-anchor="middle">Nhân khởi tạo</text>' +
      '<text class="d-ts" x="386" y="130" text-anchor="middle">238 dòng log, ~3,3 s</text>' +

      '<line class="d-line" x1="476" y1="116" x2="530" y2="116"/>' +
      '<path class="d-arrow" d="M530 116 L520 111 L520 121 Z"/>' +

      '<rect class="d-box-g" x="536" y="76" width="180" height="80" rx="8"/>' +
      '<text class="d-t"  x="626" y="100" text-anchor="middle">Bàn giao</text>' +
      '<text class="d-tm" x="626" y="120" text-anchor="middle">Run /init</text>' +
      '<text class="d-ts" x="626" y="140" text-anchor="middle">shell của bạn, PID 1</text>' +

      '</svg>' },

    /* ══════════════════════════════════════════════
       2. ĐỊNH DẠNG ẢNH NHÂN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ảnh nhân ARM64: vì sao là Image chứ không phải ELF' },

    { t: 'p', x:
      'Biên dịch nhân Linux xong bạn không nhận được một file mà nhận được <b>cả một họ file</b>, ' +
      'tên gần giống nhau và rất dễ nhầm. Bảng này là bảng bạn sẽ quay lại tra suốt Chặng 07:' },

    { t: 'table',
      head: ['Tên file', 'Định dạng', 'Dùng khi nào'],
      rows: [
        ['<code>vmlinux</code>', 'ELF, có bảng ký hiệu, <b>không</b> nén', 'Gỡ lỗi. Đây là thứ bạn nạp vào GDB, không phải thứ bootloader chạy. Là ELF <code>EXEC</code> — đúng loại bạn đã mổ ở Bài 18.'],
        ['<code>Image</code>', 'Nhị phân thuần, không header ELF, không nén', '<b>Định dạng chuẩn của ARM64.</b> Đây là thứ QEMU và U-Boot nạp.'],
        ['<code>Image.gz</code>', '<code>Image</code> nén gzip', 'Khi bootloader biết tự giải nén. QEMU cũng nhận.'],
        ['<code>zImage</code>', 'Nhị phân + mã tự giải nén gắn kèm', 'Chỉ có ở ARM 32 bit. ARM64 <b>không</b> dùng.'],
        ['<code>vmlinuz</code>', 'Tên Debian/Ubuntu đặt cho file cài vào <code>/boot</code>', 'Là tên, không phải định dạng. Trên ARM64 nội dung bên trong nó là một <code>Image</code>.']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao ARM64 bỏ ELF ở bước này',
      x: '<p>Bootloader chạy khi <b>chưa có</b> MMU, chưa có hệ thống tệp, và thường chỉ còn vài ' +
         'chục KB mã. Bắt nó hiểu định dạng ELF — đọc program header, ánh xạ từng segment, xử lý ' +
         'phần <code>.bss</code> — là một gánh nặng không cần thiết.</p>' +
         '<p>Nên ARM64 quy định ngược lại: ảnh nhân là <b>một khối byte phẳng</b>, có một header ' +
         '64 byte ở đầu ghi sẵn mọi thứ bootloader cần biết. Bootloader chỉ việc copy cả khối vào ' +
         'RAM rồi nhảy vào byte đầu tiên. Chính vì thế Bài 30 dựng được chương trình bare-metal ' +
         'chỉ bằng một linker script đặt <code>. = 0x40080000</code>.</p>' +
         '<p>QEMU dễ tính hơn bootloader thật: nó nhận <b>cả</b> ELF (Bài 30) lẫn <code>Image</code> ' +
         '(bài này). U-Boot ở Chặng 06 sẽ khắt khe hơn nhiều.</p>' },

    { t: 'p', x:
      'Bạn sẽ dùng nhân dựng sẵn của Debian thay vì tự biên dịch. Đó là lựa chọn có chủ đích: ' +
      'biên dịch nhân là toàn bộ nội dung của <b>Chặng 07</b>, mất khoảng một giờ, và trộn nó vào ' +
      'đây sẽ che mất bài học thật của hôm nay — <b>luồng boot</b>.' },

    { t: 'terms', items: [
      ['initramfs', '', 'Hệ thống tệp gốc nằm hoàn toàn trong RAM, do nhân tự giải nén từ một kho cpio nạp kèm. Không cần ổ đĩa, không cần driver lưu trữ.'],
      ['initrd', '', 'Cơ chế cũ hơn: một ảnh <b>đĩa</b> ram (ext2/romfs) cần driver block. Tên tham số <code>-initrd</code> giữ lại vì lý do lịch sử, nhưng thứ nó nạp ngày nay là initramfs.'],
      ['cpio', '', 'Định dạng lưu trữ tuần tự, mỗi file là header + nội dung nối tiếp. Nhân Linux <b>chỉ</b> đọc được biến thể <code>newc</code>.'],
      ['rootfs', '', 'Hệ thống tệp gốc — cây thư mục treo tại <code>/</code>. Bài này rootfs sống trong RAM; Chặng 09 sẽ dựng rootfs đầy đủ.'],
      ['PID 1', '', 'Tiến trình đầu tiên nhân tạo ra ở không gian người dùng. Nó là tổ tiên của mọi tiến trình khác và không được phép thoát.']
    ]},

    /* ══════════════════════════════════════════════
       3. INITRAMFS
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'initramfs: bảy file và một script sáu dòng' },

    { t: 'p', x:
      'initramfs là chỗ người mới hay tưởng phức tạp. Thực ra nó chỉ là <b>một thư mục bình ' +
      'thường</b>, được nén lại theo một định dạng nhân đọc được. Không có phép thuật, không có ' +
      'siêu dữ liệu bí ẩn — bạn tạo thư mục, chép file vào, rồi gói.' },

    { t: 'p', x:
      'Đây là toàn bộ nội dung initramfs bạn sắp dựng. Bảy mục, và chỉ <b>hai</b> trong số đó là ' +
      'file thật:' },

    { t: 'table',
      head: ['Mục', 'Loại', 'Vì sao cần'],
      rows: [
        ['<code>/init</code>', 'script', 'Chương trình đầu tiên nhân chạy. <b>Bắt buộc</b>, và bắt buộc có quyền thực thi.'],
        ['<code>/bin/busybox</code>', 'file ELF tĩnh', 'Chứa toàn bộ lệnh Unix trong một file. Phải <b>tĩnh</b> — trong initramfs không có <code>libc.so</code>.'],
        ['<code>/bin/sh</code>', 'symlink → busybox', 'Cái tên <code>exec /bin/sh</code> trong <code>init</code> trỏ tới.'],
        ['<code>/dev</code>', 'thư mục rỗng', 'Điểm treo cho <code>devtmpfs</code> nhân tự gắn.'],
        ['<code>/proc</code>', 'thư mục rỗng', 'Điểm treo cho <code>procfs</code>. Không có nó thì <code>ps</code>, <code>free</code> không chạy.'],
        ['<code>/sys</code>', 'thư mục rỗng', 'Điểm treo cho <code>sysfs</code>. Chặng 10 sẽ dùng nó liên tục để nói chuyện với driver.'],
        ['<code>/</code>', 'thư mục gốc', 'cpio cần một mục cho chính thư mục hiện tại.']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao BusyBox phải là bản tĩnh',
      x: '<p>Bài 17 bạn đã đo: một chương trình động cần <code>ld-linux-aarch64.so.1</code> nạp ' +
         'nó, rồi cần <code>libc.so.6</code> — <b>2 186 512</b> byte — nằm sẵn trên hệ thống tệp. ' +
         'initramfs của bạn <b>không có</b> hai file đó.</p>' +
         '<p>Nhân <code>execve()</code> một chương trình động mà thiếu bộ nạp động sẽ thất bại ' +
         'ngay ở bước đọc <code>PT_INTERP</code>, và vì đó là PID 1 nên kết quả là ' +
         '<code>panic</code>. Bản tĩnh không có <code>PT_INTERP</code>, không phụ thuộc gì ' +
         'ngoài các lời gọi hệ thống — đúng thứ initramfs cần.</p>' +
         '<p>Đây là lý do gói bạn tải tên là <code>busybox-<b>static</b></code>, và cũng là lý do ' +
         'Chặng 09 sẽ bật <code>CONFIG_STATIC</code> khi tự biên dịch BusyBox.</p>' },

    { t: 'h3', x: 'Hợp đồng /init: nhân tìm gì, ở đâu' },

    { t: 'p', x:
      'Sau khi giải nén initramfs, nhân đi tìm chương trình để bàn giao theo một thứ tự cố định. ' +
      'Hiểu thứ tự này là hiểu vì sao gõ sai một chữ trong <code>-append</code> lại làm cả hệ ' +
      'thống panic:' },

    { t: 'table',
      head: ['Tham số dòng lệnh nhân', 'Nhân sẽ chạy', 'Nếu không có / chạy hỏng'],
      rows: [
        ['<code>rdinit=/init</code>', 'Đúng đường dẫn ấy, <b>trong initramfs</b>', 'Bỏ qua initramfs, quay sang đi tìm ổ đĩa gốc'],
        ['<code>init=/sbin/init</code>', 'Đúng đường dẫn ấy, <b>trong rootfs thật</b> sau khi đã mount', 'Panic <code>Requested init … failed</code>'],
        ['(không có gì)', 'Thử <code>/init</code> trong initramfs trước; không thấy thì mount <code>root=</code>', 'Panic <code>VFS: Unable to mount root fs</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Cái bẫy: sai rdinit không báo "sai rdinit"',
      x: '<p>Bạn sẽ nghĩ gõ nhầm <code>rdinit=/sbin/init</code> thì nhân sẽ nói "không tìm thấy ' +
         '/sbin/init". Nó <b>không</b> nói thế. Nhân coi initramfs là thất bại, rơi xuống phương ' +
         'án dự phòng là mount ổ đĩa gốc, không có ổ nào, và chết bằng đúng thông báo của trường ' +
         'hợp thiếu initramfs:</p>' +
         '<p><code>Kernel panic - not syncing: VFS: Unable to mount root fs on ' +
         'unknown-block(0,0)</code></p>' +
         '<p>Nghĩa là <b>một thông báo lỗi ứng với nhiều nguyên nhân khác nhau</b>. Bước 6 phần ' +
         'thực hành cho bạn gặp cả hai, để lần sau nhìn thấy dòng đó bạn kiểm tra <b>hai</b> ' +
         'thứ chứ không phải một.</p>' },

    { t: 'fig', cap:
      'Từ thư mục trên host tới PID 1 trong guest chỉ có bốn bước biến đổi. Kích thước ' +
      'thu được ở mỗi bước đều kiểm chứng được — và bước cuối phải khớp với device tree.',
      svg:
      '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Đường đi của initramfs: thư mục trên host, cpio, gzip, nạp vào RAM, nhân giải nén rồi chạy init">' +

      '<rect class="d-box" x="4" y="34" width="128" height="76" rx="8"/>' +
      '<text class="d-t"  x="68" y="58" text-anchor="middle">Thư mục</text>' +
      '<text class="d-tm" x="68" y="78" text-anchor="middle">initramfs/</text>' +
      '<text class="d-ts" x="68" y="98" text-anchor="middle">7 mục</text>' +

      '<line class="d-line" x1="132" y1="72" x2="166" y2="72"/>' +
      '<path class="d-arrow" d="M166 72 L156 67 L156 77 Z"/>' +
      '<text class="d-tm" x="149" y="60" text-anchor="middle">cpio</text>' +

      '<rect class="d-box-a" x="172" y="34" width="128" height="76" rx="8"/>' +
      '<text class="d-t"  x="236" y="58" text-anchor="middle">Kho cpio</text>' +
      '<text class="d-tm" x="236" y="78" text-anchor="middle">newc</text>' +
      '<text class="d-ts" x="236" y="98" text-anchor="middle">1 982 464 B</text>' +

      '<line class="d-line" x1="300" y1="72" x2="334" y2="72"/>' +
      '<path class="d-arrow" d="M334 72 L324 67 L324 77 Z"/>' +
      '<text class="d-tm" x="317" y="60" text-anchor="middle">gzip</text>' +

      '<rect class="d-box-g" x="340" y="34" width="128" height="76" rx="8"/>' +
      '<text class="d-t"  x="404" y="58" text-anchor="middle">File nén</text>' +
      '<text class="d-tm" x="404" y="78" text-anchor="middle">final.cpio.gz</text>' +
      '<text class="d-ts" x="404" y="98" text-anchor="middle">1 035 400 B</text>' +

      '<line class="d-line" x1="468" y1="72" x2="502" y2="72"/>' +
      '<path class="d-arrow" d="M502 72 L492 67 L492 77 Z"/>' +
      '<text class="d-tm" x="485" y="60" text-anchor="middle">-initrd</text>' +

      '<rect class="d-box-p" x="508" y="34" width="208" height="76" rx="8"/>' +
      '<text class="d-t"  x="612" y="58" text-anchor="middle">RAM của guest</text>' +
      '<text class="d-tm" x="612" y="78" text-anchor="middle">0x48000000 → 0x480fcc88</text>' +
      '<text class="d-ts" x="612" y="98" text-anchor="middle">đúng 1 035 400 B</text>' +

      '<line class="d-line" x1="612" y1="110" x2="612" y2="140"/>' +
      '<path class="d-arrow" d="M612 140 L607 130 L617 130 Z"/>' +

      '<rect class="d-box-g" x="440" y="146" width="276" height="44" rx="8"/>' +
      '<text class="d-tm" x="578" y="164" text-anchor="middle">Trying to unpack rootfs image…</text>' +
      '<text class="d-ts" x="578" y="182" text-anchor="middle">nhân bung ra tmpfs rồi chạy /init</text>' +

      '</svg>' },

    /* ══════════════════════════════════════════════
       4. ĐỌC LOG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đọc log khởi động theo sáu chặng' },

    { t: 'p', x:
      '238 dòng là quá nhiều để đọc từng dòng, và cũng không cần. Log khởi động luôn đi theo ' +
      '<b>cùng một trật tự</b>, ở mọi board, mọi phiên bản nhân. Học thuộc sáu mốc dưới đây thì ' +
      'lần sau gặp một board lạ bạn vẫn định vị được ngay mình đang ở đâu.' },

    { t: 'table',
      head: ['Chặng', 'Dòng đánh dấu (số dòng thật trong log của bạn)', 'Nếu dừng ở đây nghĩa là'],
      rows: [
        ['1 · CPU', '<code>2</code> — <code>Linux version 6.12.94+deb13-cloud-arm64 …</code>', 'Nhân đã chạy. Nếu không thấy dòng nào cả thì lỗi ở QEMU, không phải ở nhân.'],
        ['2 · Phần cứng', '<code>5</code> — <code>Machine model: linux,dummy-virt</code>', 'Nhân đã đọc được device tree QEMU sinh ra ở Bài 30.'],
        ['3 · Bộ nhớ', '<code>90</code> — <code>Memory: 411880K/524288K available …</code>', 'Bộ cấp phát bộ nhớ đã hoạt động. Con số đầu là RAM còn lại cho bạn.'],
        ['4 · Console', '<code>115</code> — <code>printk: legacy console [ttyAMA0] enabled</code>', '<b>Mốc quan trọng nhất khi gỡ lỗi.</b> Từ dòng này trở đi log mới thực sự chảy ra UART.'],
        ['5 · initramfs', '<code>155</code> — <code>Trying to unpack rootfs image as initramfs…</code>', 'Nhân đã thấy vùng RAM bạn nạp và đang bung nó ra.'],
        ['6 · Bàn giao', '<code>229</code> — <code>Run /init as init process</code>', 'Xong việc của nhân. Mọi thứ sau dòng này là <b>lỗi của bạn</b>, không phải của nhân.']
      ]},

    { t: 'cal', kind: 'tip', title: 'Ba dòng đọc trước, luôn luôn',
      x: '<p>Khi một hệ thống nhúng không boot, đừng đọc từ trên xuống. Nhảy thẳng tới ba dòng ' +
         'này, theo đúng thứ tự:</p>' +
         '<p><b>1.</b> <code>Kernel command line:</code> — nhân <b>thật sự</b> nhận được tham số ' +
         'gì? Rất nhiều lần nó khác thứ bạn tưởng mình đã truyền, vì bootloader đã ghi đè.<br>' +
         '<b>2.</b> <code>Machine model:</code> — nhân nghĩ nó đang chạy trên board nào? Sai ' +
         'device tree là sai tất cả.<br>' +
         '<b>3.</b> <code>console … enabled</code> — nếu không có dòng này, mọi thứ bạn <b>không</b> ' +
         'nhìn thấy đều có thể vẫn đang xảy ra bình thường.</p>' },

    { t: 'cal', kind: 'info', title: 'Mốc thời gian trong ngoặc vuông đếm từ đâu',
      x: '<p><code>[    0.000000]</code> là lúc nhân bắt đầu chạy, <b>không</b> phải lúc bạn gõ ' +
         'lệnh <code>qemu-system-aarch64</code>. Thời gian QEMU dựng máy, đọc file ảnh nhân và ' +
         'copy nó vào RAM nằm <b>ngoài</b> đồng hồ này.</p>' +
         '<p>Và vì đây là TCG — mọi lệnh ARM64 đều được dịch sang x86 rồi mới chạy, như Bài 29 đo ' +
         'được tỉ lệ giãn nở <b>21,6</b> lần — con số bạn thấy phụ thuộc vào tải máy host. Cùng ' +
         'một lần boot này, hai lần chạy khác nhau cho <code>Run /init</code> ở <b>2,057 s</b> ' +
         'và <b>3,268 s</b>. Trên phần cứng thật con số ổn định hơn nhiều; ở đây hãy đọc ' +
         '<b>thứ tự</b> các mốc, đừng bám vào giá trị tuyệt đối.</p>' },

    /* ══════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ hai file tải về tới dấu nhắc shell' },

    { t: 'p', x:
      'Sáu bước. Bước 1–3 chuẩn bị nguyên liệu, bước 4 boot, bước 5 đọc log, bước 6 cố tình phá. ' +
      'Toàn bộ thư mục làm việc sẽ chiếm khoảng <b>135 MB</b> — chủ yếu là ảnh nhân 30 MB và hai ' +
      'gói <code>.deb</code>.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Lấy một nhân Linux ARM64 dựng sẵn',
        blocks: [
          { t: 'p', x:
            'Debian biên dịch sẵn nhân cho ARM64 và phát hành dưới dạng gói <code>.deb</code>. ' +
            'Bạn không cần cài Debian để dùng nó — một gói <code>.deb</code> chỉ là một kho nén, ' +
            'và <code>dpkg-deb -x</code> bung nó ra như <code>tar</code>.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai32 && cd ~/bai32\n' +
            'curl -fLo linux-cloud.deb \\\n' +
            '  https://deb.debian.org/debian/pool/main/l/linux-signed-arm64/linux-image-6.12.94+deb13-cloud-arm64_6.12.94-1_arm64.deb\n' +
            'ls -l linux-cloud.deb' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus 27985180 Aug  8 12:04 linux-cloud.deb' },

          { t: 'cmdx', cmd: 'curl -fLo linux-cloud.deb <url>', title: 'Vì sao ba cờ này, không phải một',
            rows: [
              ['<code>-f</code>', 'Coi mã lỗi HTTP là thất bại của lệnh (thoát khác 0).', 'Thiếu nó, một trang 404 sẽ được lưu thành file <code>.deb</code> và bạn chỉ phát hiện ra ở bước sau.'],
              ['<code>-L</code>', 'Đi theo chuyển hướng.', 'Máy chủ Debian hay chuyển hướng sang máy nhân bản gần bạn nhất.'],
              ['<code>-o &lt;tên&gt;</code>', 'Đặt tên file lưu.', 'Tên gói gốc rất dài; đặt lại tên ngắn để mọi lệnh sau gõ nhanh.']
            ]},

          { t: 'p', x: 'Bung gói ra và xem trong đó có gì:' },

          { t: 'code', where: 'wsl', code:
            'dpkg-deb -x linux-cloud.deb kernel\n' +
            'ls -l kernel/boot/' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 30196\n' +
            '-rw-r--r-- 1 shinarus shinarus       83 Jun 20 14:03 System.map-6.12.94+deb13-cloud-arm64\n' +
            '-rw-r--r-- 1 shinarus shinarus   140992 Jun 20 14:03 config-6.12.94+deb13-cloud-arm64\n' +
            '-rw-r--r-- 1 shinarus shinarus 30771136 Jun 20 14:03 vmlinuz-6.12.94+deb13-cloud-arm64' },

          { t: 'p', x:
            'Ba file này chính là ba thứ Chặng 07 sẽ dạy bạn tự tạo ra: bảng ký hiệu, file cấu ' +
            'hình, và ảnh nhân. Kiểm tra định dạng của ảnh nhân rồi đặt cho nó một cái tên ngắn:' },

          { t: 'code', where: 'wsl', code:
            'file kernel/boot/vmlinuz-6.12.94+deb13-cloud-arm64\n' +
            'cp kernel/boot/vmlinuz-6.12.94+deb13-cloud-arm64 Image\n' +
            'ls -l Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            'kernel/boot/vmlinuz-6.12.94+deb13-cloud-arm64: Linux kernel ARM64 boot executable Image, little-endian, 4K pages\n' +
            '-rw-r--r-- 1 shinarus shinarus 30771136 Aug  8 12:04 Image' },

          { t: 'cal', kind: 'info', title: 'Debian đặt tên vmlinuz nhưng nội dung là Image',
            x: '<p><code>file</code> vừa xác nhận đúng điều bảng ở trên nói: cái tên ' +
               '<code>vmlinuz</code> là quy ước đóng gói của Debian, còn <b>định dạng thật</b> là ' +
               '<code>Linux kernel ARM64 boot executable Image</code> — nhị phân thuần, không nén, ' +
               'trang 4K.</p>' +
               '<p>Đối chiếu với Bài 30: <code>hello.elf</code> được <code>file</code> gọi là ' +
               '<code>ELF 64-bit LSB executable</code>. Hai định dạng khác hẳn nhau, cùng nạp ' +
               'được bằng <code>-kernel</code>, vì QEMU tự nhận dạng. U-Boot ở Chặng 06 sẽ bắt ' +
               'bạn nói rõ đó là loại nào.</p>' },

          { t: 'cal', kind: 'warn', title: 'Khi đường dẫn trên trả về 404',
            x: '<p>Debian gỡ các phiên bản nhân cũ khỏi kho khi có bản mới. Nếu <code>curl -f</code> ' +
               'báo lỗi, hãy hỏi kho xem hiện đang có bản nào:</p>' },

          { t: 'code', where: 'wsl', code:
            'curl -s https://deb.debian.org/debian/dists/trixie/main/binary-arm64/Packages.gz | zcat |\n' +
            '  awk \'/^Package: linux-image-[0-9].*cloud-arm64$/{p=$2} /^Filename: /{if(p!=""){print p" -> "$2; p=""}}\' |\n' +
            '  tail -n 3' },

          { t: 'code', where: 'out', nocopy: true, code:
            'linux-image-6.12.86+deb13-cloud-arm64 -> pool/main/l/linux-signed-arm64/linux-image-6.12.86+deb13-cloud-arm64_6.12.86-1_arm64.deb\n' +
            'linux-image-6.12.94+deb13-cloud-arm64 -> pool/main/l/linux-signed-arm64/linux-image-6.12.94+deb13-cloud-arm64_6.12.94-1_arm64.deb' },

          { t: 'p', muted: true, x:
            'Ghép <code>https://deb.debian.org/debian/</code> với đường dẫn ở cột phải là được ' +
            'liên kết tải mới. Mọi số liệu trong bài này đo trên bản <b>6.12.94</b>; bản khác sẽ ' +
            'cho số dòng log lệch chút ít nhưng sáu chặng thì y hệt.' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Lấy BusyBox tĩnh cho ARM64',
        blocks: [
          { t: 'p', x:
            'Cần một chương trình để nhân bàn giao quyền. Nó phải là mã <b>ARM64</b> (chạy trong ' +
            'guest, không phải trên WSL của bạn) và phải liên kết <b>tĩnh</b>. Debian có sẵn gói ' +
            'đúng như thế.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai32\n' +
            'curl -fLo busybox.deb \\\n' +
            '  https://deb.debian.org/debian/pool/main/b/busybox/busybox-static_1.38.0-3_arm64.deb\n' +
            'dpkg-deb -x busybox.deb busybox-pkg\n' +
            'ls -l busybox-pkg/usr/bin/busybox\n' +
            'file busybox-pkg/usr/bin/busybox' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rwxr-xr-x 1 shinarus shinarus 1980944 Jul 26 12:53 busybox-pkg/usr/bin/busybox\n' +
            'busybox-pkg/usr/bin/busybox: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=be06e2cf9300eff8480d09bd8840d4fa7176dcd1, for GNU/Linux 3.7.0, stripped' },

          { t: 'cal', kind: 'why', title: 'Đọc dòng file này như một danh sách kiểm tra',
            x: '<p>Bốn từ khoá, bốn điều kiện phải đúng, và bạn kiểm được cả bốn chỉ bằng một ' +
               'lệnh <code>file</code> — đúng kỹ năng Bài 18 đã dạy:</p>' +
               '<p><code>ARM aarch64</code> — đúng kiến trúc guest.<br>' +
               '<code>statically linked</code> — không cần <code>libc.so</code>, đúng thứ ' +
               'initramfs cần.<br>' +
               '<code>stripped</code> — đã bỏ bảng ký hiệu, nên chỉ còn 1 980 944 byte.<br>' +
               '<code>executable</code> — ELF loại <code>EXEC</code>, không phải thư viện.</p>' +
               '<p>Nếu một trong bốn sai, bạn sẽ biết <b>ngay bây giờ</b> thay vì biết qua một ' +
               'dòng <code>Kernel panic</code> mười phút sau.</p>' },

          { t: 'p', muted: true, x:
            'Vì sao không tự biên dịch BusyBox? Vì đó là nội dung của <b>Chặng 09</b> — ở đó bạn ' +
            'sẽ mở <code>menuconfig</code>, bật <code>CONFIG_STATIC</code> và hiểu từng lựa chọn. ' +
            'Hôm nay BusyBox chỉ là một quân cờ, không phải bài học.' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Đóng gói initramfs',
        blocks: [
          { t: 'p', x:
            'Dựng cây thư mục bảy mục đã mô tả ở phần lý thuyết. Chú ý <code>ln -sf busybox sh</code> ' +
            'là symlink <b>tương đối</b> — nó phải trỏ đúng khi cây này được treo tại ' +
            '<code>/</code> bên trong guest, chứ không phải khi nhìn từ WSL.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai32\n' +
            'mkdir -p initramfs/bin initramfs/dev initramfs/proc initramfs/sys\n' +
            'cp busybox-pkg/usr/bin/busybox initramfs/bin/busybox\n' +
            'ln -sf busybox initramfs/bin/sh' },

          { t: 'p', x: 'Rồi viết chương trình đầu tiên của hệ thống — sáu dòng:' },

          { t: 'code', where: 'file', name: '~/bai32/initramfs/init', lang: 'bash', code:
            '#!/bin/sh\n' +
            '/bin/busybox --install -s /bin\n' +
            'mount -t proc  none /proc\n' +
            'mount -t sysfs none /sys\n' +
            'echo\n' +
            'echo "=== init running as PID $$ ==="\n' +
            'exec /bin/sh' },

          { t: 'cmdx', cmd: 'init', title: 'Từng dòng của init làm gì',
            rows: [
              ['<code>#!/bin/sh</code>', 'Nói cho nhân biết cần chạy file này bằng trình thông dịch nào.', 'Nhân đọc hai byte đầu; thấy <code>#!</code> thì nó chạy <code>/bin/sh</code> với file làm tham số. <code>/bin/sh</code> là symlink bạn vừa tạo.'],
              ['<code>busybox --install -s /bin</code>', 'Tạo symlink cho <b>từng</b> lệnh BusyBox biết làm, trong <code>/bin</code>.', 'Không có bước này thì phải gõ <code>busybox ls</code> thay vì <code>ls</code>. Một lệnh đổi lấy <b>280</b> tên lệnh.'],
              ['<code>mount -t proc none /proc</code>', 'Gắn hệ thống tệp ảo <code>procfs</code>.', 'Bài 19 đã đọc file trong đó bằng syscall, Bài 20 dùng nó để soi tiến trình. Không gắn thì <code>ps</code>, <code>free</code>, <code>top</code> đều câm.'],
              ['<code>mount -t sysfs none /sys</code>', 'Gắn <code>sysfs</code>.', 'Cửa sổ nhìn vào cây thiết bị của nhân. Chặng 10 sẽ sống trong này.'],
              ['<code>echo "… PID $$ …"</code>', 'In số hiệu tiến trình của chính script.', 'Phải là <b>1</b>. Nếu ra số khác nghĩa là bạn không phải tiến trình đầu tiên — sai ở đâu đó.'],
              ['<code>exec /bin/sh</code>', 'Thay thế chính mình bằng shell.', '<code>exec</code>, không phải gọi thường: PID 1 <b>không được phép thoát</b>. Gọi thường thì shell thoát là script chạy tiếp rồi kết thúc, và nhân panic.']
            ]},

          { t: 'code', where: 'wsl', code:
            'chmod +x initramfs/init\n' +
            'find initramfs | sort' },

          { t: 'code', where: 'out', nocopy: true, code:
            'initramfs\n' +
            'initramfs/bin\n' +
            'initramfs/bin/busybox\n' +
            'initramfs/bin/sh\n' +
            'initramfs/dev\n' +
            'initramfs/init\n' +
            'initramfs/proc\n' +
            'initramfs/sys' },

          { t: 'p', x: 'Giờ gói lại. Đây là lệnh quan trọng nhất của cả bài:' },

          { t: 'code', where: 'wsl', code:
            '( cd initramfs && find . -print0 | cpio --null --create --format=newc | gzip -9 ) > initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3872 blocks' },

          { t: 'cmdx', cmd: '( cd initramfs && find . -print0 | cpio --null --create --format=newc | gzip -9 ) > initramfs.cpio.gz',
            title: 'Mổ xẻ lệnh đóng gói',
            rows: [
              ['<code>( … )</code>', 'Chạy trong shell con.', 'Lệnh <code>cd</code> bên trong không ảnh hưởng ra ngoài. Sau khi xong bạn vẫn đứng ở <code>~/bai32</code>.'],
              ['<code>cd initramfs &amp;&amp; find .</code>', 'Đi vào trong rồi liệt kê từ <code>.</code>.', '<b>Bắt buộc.</b> Đứng ngoài mà chạy <code>find initramfs</code> thì mọi đường dẫn trong kho sẽ là <code>initramfs/bin/sh</code>, và guest sẽ có <code>/initramfs/bin/sh</code> — nhân tìm <code>/init</code> không thấy.'],
              ['<code>-print0</code> / <code>--null</code>', 'Ngăn cách tên file bằng byte 0 thay vì xuống dòng.', 'Tên file được phép chứa dấu xuống dòng. Cặp cờ này là thói quen an toàn, giống <code>-print0 | xargs -0</code> ở Bài 11.'],
              ['<code>--create</code>', 'Chế độ tạo kho (viết tắt <code>-o</code>).', 'cpio đọc danh sách tên từ đầu vào chuẩn và ghi kho ra đầu ra chuẩn.'],
              ['<code>--format=newc</code>', 'Chọn biến thể "new ASCII" (viết tắt <code>-H newc</code>).', '<b>Nhân Linux chỉ đọc được đúng biến thể này.</b> Dùng nhầm định dạng khác thì nhân im lặng bỏ qua initramfs rồi panic.'],
              ['<code>gzip -9</code>', 'Nén ở mức cao nhất.', 'Nhân tự giải nén được gzip. Nén tối đa vì thứ này sẽ nằm trên flash của board thật.'],
              ['<code>&gt; initramfs.cpio.gz</code>', 'Hứng kết quả vào file.', 'Chuyển hướng đặt <b>ngoài</b> ngoặc để hứng cả đường ống.']
            ]},

          { t: 'code', where: 'wsl', code:
            'ls -l initramfs.cpio.gz\n' +
            'zcat initramfs.cpio.gz | wc -c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus 1035396 Aug  8 12:31 initramfs.cpio.gz\n' +
            '1982464' },

          { t: 'cal', kind: 'info', title: 'Vì sao con số của bạn lệch vài byte so với ở đây',
            x: '<p>Kho cpio <b>chưa nén</b> luôn là <b>1 982 464</b> byte, ở mọi máy: kích thước ' +
               'đó chỉ phụ thuộc vào nội dung file và các trường header có độ rộng cố định. Bạn ' +
               'nên thấy đúng con số này.</p>' +
               '<p>File <b>đã nén</b> thì khác. Header cpio còn nhúng <b>số inode</b> và ' +
               '<b>thời gian sửa file</b> — hai thứ khác nhau ở mỗi máy và mỗi lần bạn dựng lại ' +
               'cây thư mục. Chúng làm dữ liệu đầu vào của gzip khác đi vài byte, nên kết quả ' +
               'cũng lệch vài byte. Ba lần đóng gói liên tiếp <b>cùng một cây</b> cho ra file ' +
               'giống hệt nhau đến từng byte; dựng lại cây rồi gói lại thì không.</p>' +
               '<p>Con số của tôi là <b>1 035 396</b>. Con số của bạn sẽ quanh quẩn ' +
               '<b>1,01 MB</b>. Điều <b>luôn đúng</b> — và bước 5 sẽ kiểm chứng — là hiệu hai ' +
               'đầu mút trong device tree bằng đúng kích thước file <b>của bạn</b>.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Boot, và ra được dấu nhắc shell',
        blocks: [
          { t: 'p', x:
            'Ba mảnh ghép đã đủ. Ghép chúng bằng đúng ba tham số đã học ở Bài 31:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai32\n' +
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -nographic' },

          { t: 'code', where: 'out', nocopy: true, name: 'Mười dòng cuối cùng', code:
            '[    1.513525] Freeing unused kernel memory: 2112K\n' +
            '[    1.589865] Checked W+X mappings: passed, no W+X pages found\n' +
            '[    1.609774] Run /init as init process\n' +
            '\n' +
            '=== init running as PID 1 ===\n' +
            '\n' +
            '\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3) built-in shell (ash)\n' +
            'Enter \'help\' for a list of built-in commands.\n' +
            '\n' +
            '/bin/sh: can\'t access tty; job control turned off\n' +
            '~ #' },

          { t: 'cal', kind: 'tip', title: 'Bạn đang đứng trong một máy ARM64',
            x: '<p>Dấu nhắc <code>~ #</code> ấy là shell chạy trên CPU ARM64, do TCG dịch từng ' +
               'lệnh sang x86 như Bài 29 mổ xẻ. Thử vài lệnh để tự thuyết phục mình:</p>' },

          { t: 'code', where: 'qemu', code:
            'uname -a\n' +
            'busybox --list | wc -l\n' +
            'grep MemTotal /proc/meminfo\n' +
            'ls /bin | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Linux (none) 6.12.94+deb13-cloud-arm64 #1 SMP Debian 6.12.94-1 (2026-06-20) aarch64 GNU/Linux\n' +
            '280\n' +
            'MemTotal:         483592 kB\n' +
            '280' },

          { t: 'cal', kind: 'info', title: 'Ba con số này đều nối ngược về bài trước',
            x: '<p><code>aarch64</code> — kiến trúc thật của guest, không phải x86 của host.</p>' +
               '<p><code>MemTotal: 483 592 kB</code> — <b>đúng</b> con số Bài 31 đo được với ' +
               '<code>-m 512</code>. Hụt khoảng 41 MB so với 512 MB vì mã nhân, bảng trang và ' +
               'vùng CMA đã chiếm mất; dòng <code>Memory:</code> trong log ghi rõ từng khoản.</p>' +
               '<p><code>280</code> xuất hiện hai lần: BusyBox biết làm 280 lệnh, và ' +
               '<code>--install -s</code> đã tạo đúng 280 mục trong <code>/bin</code>. Một file ' +
               '1,98 MB thay cho cả một bộ coreutils.</p>' },

          { t: 'p', x:
            'Thoát máy ảo: gõ <b>Ctrl-A</b>, thả tay, rồi gõ <b>X</b>. Đây là chuỗi thoát của ' +
            '<code>-nographic</code> mà Bài 31 đã giới thiệu; <code>exit</code> trong shell ' +
            '<b>không</b> thoát được vì shell ấy là PID 1.' },

          { t: 'cal', kind: 'warn', title: 'Nếu shell thoát, nhân panic',
            x: '<p>Sửa dòng cuối của <code>init</code> thành <code>echo "init is about to exit"</code> ' +
               'rồi boot lại. Dòng ấy in ra, và ngay sau nó:</p>' +
               '<p><code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000</code></p>' +
               '<p>Đây không phải lỗi — đây là <b>thiết kế</b>. PID 1 chết đồng nghĩa hệ thống ' +
               'không còn tổ tiên cho mọi tiến trình, nên nhân dừng luôn thay vì để hệ thống rơi ' +
               'vào trạng thái không xác định. Trên board thật, một <code>init</code> thoát nhầm ' +
               'là nguyên nhân kinh điển của "board cứ reboot liên tục".</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Đọc log theo sáu chặng, và kiểm chứng số học initrd',
        blocks: [
          { t: 'p', x:
            'Chạy lại nhưng hứng toàn bộ log vào file. <code>timeout 20</code> để QEMU tự tắt sau ' +
            '20 giây — bạn không cần tương tác lần này.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai32\n' +
            'timeout 20 qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -nographic > boot.log 2>&1\n' +
            'wc -l boot.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '238 boot.log' },

          { t: 'p', x: 'Giờ trích ra đúng sáu mốc — kèm số dòng, để thấy chúng nằm rải ra sao:' },

          { t: 'code', where: 'wsl', code:
            'grep -nE \'Linux version|Machine model|Kernel command line|Memory:|legacy console|Trying to unpack|Freeing initrd|Run /init\' boot.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '2:[    0.000000] Linux version 6.12.94+deb13-cloud-arm64 (debian-kernel@lists.debian.org) (aarch64-linux-gnu-gcc-14 (Debian 14.2.0-19) 14.2.0, GNU ld (GNU Binutils for Debian) 2.44) #1 SMP Debian 6.12.94-1 (2026-06-20)\n' +
            '5:[    0.000000] Machine model: linux,dummy-virt\n' +
            '38:[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init\n' +
            '90:[    0.147841] Memory: 411880K/524288K available (14272K kernel code, 2784K rwdata, 10748K rodata, 2112K init, 908K bss, 43816K reserved, 65536K cma-reserved)\n' +
            '115:[    0.335820] printk: legacy console [ttyAMA0] enabled\n' +
            '156:[    0.744190] Trying to unpack rootfs image as initramfs...\n' +
            '162:[    0.884952] Freeing initrd memory: 1008K\n' +
            '229:[    1.713551] Run /init as init process' },

          { t: 'cal', kind: 'info', title: 'Đọc kỹ hai dòng dễ bỏ qua nhất',
            x: '<p><b>Dòng 5</b> — <code>Machine model: linux,dummy-virt</code>. Nhân biết mình ' +
               'chạy trên máy nào vì nó <b>đọc device tree</b>, không phải vì nó được biên dịch ' +
               'riêng cho máy đó. Chính cái cây bạn đã dump ra ở Bài 30 và Bài 31. Đây là điểm ' +
               'khác biệt lớn nhất giữa ARM và x86, và là lý do Chặng 08 dành cả chặng cho ' +
               'Device Tree.</p>' +
               '<p><b>Dòng 115</b> — <code>legacy console [ttyAMA0] enabled</code>. Trước dòng ' +
               'này, 114 dòng log đã được nhân ghi vào <b>bộ đệm trong RAM</b> chứ chưa gửi ra ' +
               'UART. Khi console được bật, nhân xả cả bộ đệm ra một lượt. Nghĩa là 114 dòng đầu ' +
               'bạn thấy <b>không</b> chảy theo thời gian thực — điều rất quan trọng khi gỡ lỗi ' +
               'một board treo trước mốc này: màn hình trắng không có nghĩa là nhân chưa chạy.</p>' },

          { t: 'p', x:
            'Còn dòng 162, <code>Freeing initrd memory: 1008K</code>, là một bài toán số học nhỏ. ' +
            'Hãy hỏi device tree xem QEMU đã nói với nhân những gì:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -machine virt,dumpdtb=boot.dtb -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -display none -serial null -monitor none\n' +
            'dtc -I dtb -O dts -o boot.dts boot.dtb 2>/dev/null\n' +
            'sed -n \'/chosen {/,/};/p\' boot.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tchosen {\n' +
            '\t\tlinux,initrd-end = <0x00 0x480fcc84>;\n' +
            '\t\tlinux,initrd-start = <0x00 0x48000000>;\n' +
            '\t\tbootargs = "console=ttyAMA0 rdinit=/init";\n' +
            '\t\tstdout-path = "/pl011@9000000";\n' +
            '\t\trng-seed = <0xb67ec42a 0x2395009 0x13b0429c 0x2ee2d991 0x1fecb38d 0x5123e495 0x1ab824c0 0xba9546b0>;\n' +
            '\t\tkaslr-seed = <0x283d62da 0xcf6d58b8>;\n' +
            '\t};' },

          { t: 'p', x:
            'Kiểm chứng bằng máy tính của shell, dùng chính kích thước file trên đĩa của bạn:' },

          { t: 'code', where: 'wsl', code:
            'stat -c %s initramfs.cpio.gz\n' +
            'printf \'0x%x\\n\' $(( 0x48000000 + $(stat -c %s initramfs.cpio.gz) ))\n' +
            'printf \'freed = %d KiB\\n\' $(( ((0x48000000 + $(stat -c %s initramfs.cpio.gz)) / 4096 * 4096 - 0x48000000) / 1024 ))' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1035396\n' +
            '0x480fcc84\n' +
            'freed = 1008 KiB' },

          { t: 'cal', kind: 'why', title: 'Vì sao nhân giải phóng 1008K chứ không phải 1011K',
            x: '<p>Dòng thứ hai khớp <b>chính xác</b> với <code>linux,initrd-end</code> trong ' +
               'device tree — QEMU không làm gì hơn ngoài phép cộng <code>địa chỉ nạp + kích ' +
               'thước file</code>.</p>' +
               '<p>Nhưng nhân báo giải phóng <b>1008K</b>, còn file thì <b>1 035 396</b> byte ' +
               '= 1011,1 KiB. Chênh 3 KiB. Lý do: nhân trả bộ nhớ về cho bộ cấp phát theo ' +
               '<b>trang 4 KiB</b>, và nó chỉ dám trả những trang <b>nằm trọn</b> trong vùng ' +
               'initrd. Trang cuối cùng bị cắt dở nên bị bỏ lại.</p>' +
               '<p>Làm tròn <code>0x480fcc84</code> xuống bội của 4096 được <code>0x480fc000</code>. ' +
               'Hiệu với <code>0x48000000</code> là <code>0xfc000</code> = 1 032 192 byte = ' +
               '<b>đúng 1008 KiB</b>. Đây là lần đầu bạn gặp hiện tượng "làm tròn theo trang", ' +
               'và nó sẽ quay lại suốt phần còn lại của khoá học — mọi con số bộ nhớ nhân báo ' +
               'đều là bội của kích thước trang.</p>' }
        ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Phá ba lần, rồi gói lại thành một script',
        blocks: [
          { t: 'p', x:
            'Ba cách hỏng dưới đây chiếm phần lớn số giờ người mới mất khi tự dựng hệ thống. Gặp ' +
            'chúng bây giờ, có chủ đích, rẻ hơn nhiều so với gặp lúc nửa đêm.' },

          { t: 'h4', x: 'Hỏng 1 — quên -initrd' },

          { t: 'code', where: 'wsl', code:
            'timeout 60 qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image -append "console=ttyAMA0" -nographic 2>&1 |\n' +
            '  grep -E \'VFS: Cannot open|Kernel panic - not syncing\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.350258] VFS: Cannot open root device "" or unknown-block(0,0): error -6\n' +
            '[    1.351575] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' },

          { t: 'h4', x: 'Hỏng 2 — rdinit trỏ vào đường dẫn không tồn tại' },

          { t: 'code', where: 'wsl', code:
            'timeout 60 qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/sbin/init" -nographic 2>&1 |\n' +
            '  grep -E \'Kernel panic - not syncing\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    1.395170] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' },

          { t: 'cal', kind: 'danger', title: 'Cùng một thông báo, hai nguyên nhân hoàn toàn khác nhau',
            x: '<p>So hai kết quả trên: <b>y hệt nhau</b>. Nhưng nguyên nhân thì một bên là ' +
               '"không có initramfs", bên kia là "có initramfs nhưng gõ sai đường dẫn init".</p>' +
               '<p>Nhân không nói "không tìm thấy /sbin/init" vì với nó, initramfs không dùng ' +
               'được thì phương án còn lại là mount ổ đĩa gốc — và ổ đĩa gốc thì không có. Nó báo ' +
               'lỗi của <b>phương án cuối cùng</b>, không phải của nguyên nhân gốc.</p>' +
               '<p>Bài học: khi thấy dòng <code>VFS: Unable to mount root fs</code>, đừng đi tìm ' +
               'ổ đĩa. Hãy kiểm tra <b>ba</b> thứ trước — <code>-initrd</code> có được truyền ' +
               'không; <code>rdinit=</code> có trỏ đúng một file <b>tồn tại và có quyền thực ' +
               'thi</b> trong kho cpio không (<code>zcat initramfs.cpio.gz | cpio -t</code>); và ' +
               'ngay phía trên dòng panic có dòng <code>Initramfs unpacking failed</code> nào ' +
               'không — nếu có thì bạn đã gói sai định dạng cpio.</p>' },

          { t: 'h4', x: 'Hỏng 3 — quên console=' },

          { t: 'code', where: 'wsl', code:
            'timeout 60 qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
            '  -append "rdinit=/init" -nographic > noconsole.log 2>&1\n' +
            'wc -c noconsole.log\n' +
            'sed -n \'38p\' noconsole.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '15351 noconsole.log\n' +
            '[    0.000000] Kernel command line: rdinit=/init' },

          { t: 'cal', kind: 'info', title: 'Bất ngờ: vẫn có log, dù thiếu console=',
            x: '<p>Bỏ <code>console=ttyAMA0</code> mà vẫn nhận được 15 351 byte log. Lý do nằm ở ' +
               'dòng bạn vừa nhìn thấy trong device tree: <code>stdout-path = "/pl011@9000000"</code>.</p>' +
               '<p>QEMU đã ghi sẵn vào <code>chosen</code> rằng đầu ra chuẩn của máy này là con ' +
               'PL011 ở <code>0x09000000</code> — chính con UART bạn đã tự tay ghi vào bằng ' +
               'assembly ở Bài 30. Khi không có <code>console=</code>, nhân dùng ' +
               '<code>stdout-path</code> làm phương án dự phòng.</p>' +
               '<p>Đừng rút ra kết luận "vậy không cần <code>console=</code>". Rất nhiều board ' +
               'thật <b>không</b> khai <code>stdout-path</code>, và khi đó thiếu ' +
               '<code>console=</code> cho bạn một màn hình trắng hoàn toàn trong khi hệ thống ' +
               'bên trong vẫn boot bình thường. Luôn khai tường minh.</p>' },

          { t: 'h4', x: 'Gói lại thành một lệnh' },

          { t: 'p', x:
            'Bạn sẽ boot lại cấu hình này rất nhiều lần trong Chặng 06 và Chặng 07. Đóng nó thành ' +
            'script, theo đúng khuôn <code>set -euo pipefail</code> của Bài 13:' },

          { t: 'code', where: 'file', name: '~/bai32/run.sh', lang: 'bash', code:
            '#!/usr/bin/env bash\n' +
            '# Boot the ARM64 kernel with our initramfs on the QEMU virt machine.\n' +
            '# Usage: ./run.sh [extra qemu args...]\n' +
            'set -euo pipefail\n' +
            'cd "$(dirname "$0")"\n' +
            '\n' +
            'KERNEL=Image\n' +
            'INITRD=initramfs.cpio.gz\n' +
            'BOOTARGS="console=ttyAMA0 rdinit=/init"\n' +
            '\n' +
            'for f in "$KERNEL" "$INITRD"; do\n' +
            '  [ -f "$f" ] || { echo "error: missing $f" >&2; exit 1; }\n' +
            'done\n' +
            '\n' +
            'echo "booting $KERNEL + $INITRD  (exit with Ctrl-A then X)"\n' +
            'exec qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -smp 1 \\\n' +
            '  -kernel "$KERNEL" \\\n' +
            '  -initrd "$INITRD" \\\n' +
            '  -append "$BOOTARGS" \\\n' +
            '  -nographic "$@"' },

          { t: 'code', where: 'wsl', code:
            'chmod +x run.sh\n' +
            './run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'booting Image + initramfs.cpio.gz  (exit with Ctrl-A then X)\n' +
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '…\n' +
            '~ #' },

          { t: 'p', x:
            '<code>"$@"</code> ở cuối là chi tiết đáng giá: nó cho bạn thêm tham số QEMU bất kỳ ' +
            'mà không phải sửa script. Thử cấp cho guest hai CPU:' },

          { t: 'code', where: 'wsl', code:
            'timeout 25 ./run.sh -smp 2 > run2.log 2>&1\n' +
            'grep -E \'smp: Brought up|SMP: Total of\' run2.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.092586] smp: Brought up 1 node, 2 CPUs\n' +
            '[    0.092626] SMP: Total of 2 processors activated.' },

          { t: 'cal', kind: 'tip', title: 'Tham số sau ghi đè tham số trước',
            x: '<p>Script đã có <code>-smp 1</code>, bạn thêm <code>-smp 2</code> ở cuối, và ' +
               'QEMU lấy <b>cái sau</b>. Quy tắc này đúng với hầu hết tham số QEMU và là lý do ' +
               '<code>"$@"</code> nên đặt ở <b>cuối</b> dòng lệnh, không phải đầu.</p>' +
               '<p>Đối chiếu Bài 31: <code>-smp 2</code> làm device tree đổi <b>35</b> dòng vì ' +
               'toàn bộ <code>phandle</code> bị đánh số lại. Ở đây bạn nhìn thấy hệ quả ở phía ' +
               'bên kia — nhân đọc cây ấy và dựng lên đúng hai CPU.</p>' },

          { t: 'p', x: 'Kiểm tra nhánh xử lý lỗi của script, rồi xem tốn bao nhiêu đĩa:' },

          { t: 'code', where: 'wsl', code:
            'mv initramfs.cpio.gz keep.gz\n' +
            './run.sh; echo "rc=$?"\n' +
            'mv keep.gz initramfs.cpio.gz\n' +
            'du -sh ~/bai32' },

          { t: 'code', where: 'out', nocopy: true, code:
            'error: missing initramfs.cpio.gz\n' +
            'rc=1\n' +
            '135M\t/home/shinarus/bai32' },

          { t: 'cal', kind: 'tip', title: 'Giữ lại thư mục này',
            x: '<p>Đừng xoá <code>~/bai32</code>. <code>Image</code> và ' +
               '<code>initramfs.cpio.gz</code> sẽ được dùng lại ngay ở <b>Chặng 06</b>: bạn sẽ ' +
               'build U-Boot, cho U-Boot nạp chính hai file này, và lần đầu tiên thấy một luồng ' +
               'boot <b>đầy đủ</b> — bootloader trước, rồi mới tới nhân.</p>' +
               '<p>Nếu cần dọn bớt, chỉ hai gói <code>.deb</code> và hai thư mục đã bung là bỏ ' +
               'được: <code>rm -rf linux-cloud.deb busybox.deb kernel busybox-pkg</code> trả lại ' +
               'khoảng <b>100 MB</b>.</p>' }
        ]}

    ]},

    /* ══════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)</code>',
         'Ba nguyên nhân cho <b>cùng một</b> thông báo: quên <code>-initrd</code>; <code>rdinit=</code> trỏ vào file không tồn tại; hoặc kho cpio sai định dạng.',
         'Kiểm theo thứ tự: dòng lệnh có <code>-initrd</code> chưa → <code>zcat initramfs.cpio.gz | cpio -t</code> xem có <code>init</code> không → xem dòng <code>Initramfs unpacking failed</code> ngay phía trên.'],

        ['<code>Initramfs unpacking failed: incorrect cpio method used: use -H newc option</code>',
         'Đóng gói bằng định dạng cpio khác <code>newc</code> (ví dụ <code>--format=odc</code>).',
         'Gói lại với <code>cpio --create --format=newc</code>. Nhân Linux <b>chỉ</b> đọc <code>newc</code>.'],

        ['<code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000</code>',
         '<code>/init</code> chạy xong rồi thoát. Thường do quên <code>exec</code> ở dòng cuối, hoặc bạn gõ <code>exit</code> ở dấu nhắc.',
         'Kết thúc <code>init</code> bằng <code>exec /bin/sh</code>. PID 1 không được phép thoát, dù thoát với mã 0.'],

        ['Ra được dấu nhắc <code>~ #</code> nhưng <b>không</b> thấy dòng <code>=== init running as PID 1 ===</code>, và <code>ls /proc</code> rỗng',
         '<code>/init</code> thiếu quyền thực thi. Nhân bỏ qua nó và rơi xuống phương án dự phòng, chạy thẳng <code>/bin/sh</code>.',
         '<code>chmod +x initramfs/init</code> rồi đóng gói lại. Đây là lỗi <b>khó thấy nhất</b> của cả bài vì hệ thống trông như đã boot thành công.'],

        ['Màn hình câm hoàn toàn, không một dòng log, QEMU không thoát',
         'Quên <code>-cpu cortex-a57</code>. <code>-M virt</code> mặc định cho CPU <b>cortex-a15 32 bit</b>, không chạy được ảnh nhân ARM64.',
         'Luôn ghi <code>-cpu cortex-a57</code> tường minh. Với ảnh <code>Image</code> bạn <b>không</b> nhận được thông báo lỗi nào cả — chỉ 69 byte và một tiến trình treo.'],

        ['<code>qemu-system-aarch64: could not load kernel \'Image\'</code>',
         'Sai tên hoặc sai thư mục làm việc.',
         '<code>cd ~/bai32</code> rồi <code>ls -l Image</code>. Đây cũng là lý do <code>run.sh</code> có <code>cd "$(dirname "$0")"</code>.'],

        ['<code>qemu-system-aarch64: -append only allowed with -kernel option</code>',
         'Truyền dòng lệnh nhân mà không có nhân để nhận nó.',
         'Thêm <code>-kernel Image</code>, hoặc bỏ <code>-append</code>. Đã gặp ở Bài 31.'],

        ['<code>curl: (22) The requested URL returned error: 404</code>',
         'Debian đã gỡ phiên bản nhân đó khỏi kho khi phát hành bản mới.',
         'Chạy lệnh <code>awk</code> hỏi <code>Packages.gz</code> ở Bước 1 để lấy tên gói hiện hành.'],

        ['Trong guest: <code>sh: ls: not found</code>',
         'Quên <code>/bin/busybox --install -s /bin</code> nên chưa có symlink cho các applet.',
         'Tạm thời gõ <code>busybox ls</code>. Sửa hẳn thì thêm dòng đó vào <code>init</code> và đóng gói lại.'],

        ['<code>/bin/sh: can\'t access tty; job control turned off</code>',
         '<b>Không phải lỗi.</b> Shell chạy trên cổng nối tiếp, không có terminal điều khiển nên tắt tính năng quản lý công việc (<code>Ctrl-Z</code>, <code>fg</code>, <code>bg</code>).',
         'Bỏ qua. Mọi lệnh vẫn chạy bình thường. Chặng 09 sẽ dựng <code>getty</code> để có tty thật.']
      ]},

    /* ══════════════════════════════════════════════
       TỔNG KẾT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Một hệ thống Linux nhúng tối giản cần <b>ba</b> mảnh: ảnh nhân (<code>-kernel</code>), hệ thống tệp gốc (<code>-initrd</code>), dòng lệnh nhân (<code>-append</code>). Thiếu mảnh nào cũng dẫn tới <code>panic</code>.',
      'ARM64 dùng định dạng <b><code>Image</code></b> — nhị phân thuần, không header ELF, không nén. <code>vmlinuz</code> chỉ là <b>tên</b> Debian đặt; <code>vmlinux</code> là bản ELF để gỡ lỗi; <code>zImage</code> không tồn tại trên ARM64.',
      'initramfs chỉ là một thư mục thường, đóng bằng <code>cpio --format=newc</code> rồi <code>gzip</code>. Kho chưa nén luôn <b>1 982 464</b> byte; file nén khoảng <b>1,01 MB</b> và lệch vài byte mỗi lần dựng vì header cpio nhúng inode và thời gian.',
      'BusyBox phải liên kết <b>tĩnh</b>: initramfs không có <code>ld-linux-aarch64.so.1</code> lẫn <code>libc.so.6</code>. Một file <b>1 980 944</b> byte cung cấp <b>280</b> lệnh.',
      '<code>/init</code> phải <b>có quyền thực thi</b> và phải kết thúc bằng <code>exec</code>. Thiếu quyền thì nhân âm thầm chạy <code>/bin/sh</code> thay thế; thiếu <code>exec</code> thì nhân panic vì "Attempted to kill init".',
      'Log boot luôn theo <b>sáu chặng</b>: CPU (dòng 2) → phần cứng (5) → bộ nhớ (90) → console (115) → initramfs (156) → bàn giao (229). Trước dòng <code>legacy console … enabled</code>, log nằm trong bộ đệm RAM chứ chưa ra UART.',
      '<code>linux,initrd-end − linux,initrd-start</code> bằng <b>đúng</b> kích thước file initramfs của bạn. Nhưng nhân chỉ báo giải phóng <b>1008K</b> vì nó trả bộ nhớ theo <b>trang 4 KiB</b> và bỏ lại trang cuối bị cắt dở.',
      '<code>VFS: Unable to mount root fs</code> là một thông báo cho <b>ba</b> nguyên nhân khác nhau. Luôn đọc dòng ngay <b>phía trên</b> nó trước khi đoán.',
      'QEMU tự nhận dạng cả ELF (Bài 30) lẫn <code>Image</code> (bài này) và tự sinh device tree. Bootloader thật thì không — đó là nội dung của Chặng 06.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Hãy để ý một điều bạn vừa <b>không</b> phải làm: không ai chép ảnh nhân vào RAM, ' +
         'không ai đặt initramfs ở <code>0x48000000</code>, không ai dựng device tree, không ai ' +
         'nạp địa chỉ cây ấy vào thanh ghi <code>x0</code> trước khi nhảy. QEMU đã âm thầm làm ' +
         'hết — nó đóng luôn vai <b>bootloader</b>.</p>' +
         '<p>Trên một board thật không có ai làm hộ. Bài 33 mở <b>Chặng 06</b> bằng câu hỏi: ' +
         'giữa lúc cấp điện và dòng <code>Booting Linux on physical CPU 0x0000000000</code>, ' +
         'có bao nhiêu phần mềm đã chạy, và mỗi phần làm gì?</p>' +
         '<p>Rồi Chặng 06 sẽ build U-Boot và bắt nó nạp <b>chính hai file</b> bạn vừa tạo — ' +
         '<code>Image</code> và <code>initramfs.cpio.gz</code> trong <code>~/bai32</code>. Khi ' +
         'đó bạn sẽ thấy lại đúng 238 dòng log này, nhưng lần đầu tiên có một màn hình khác đi ' +
         'trước chúng.</p>' }

  ],

  quiz: [
    { q: 'Vì sao BusyBox dùng trong initramfs bắt buộc phải là bản liên kết tĩnh?',
      opts: [
        'Vì bản động chạy chậm hơn dưới TCG',
        'Vì initramfs không chứa bộ nạp động và <code>libc.so.6</code>, nên chương trình động sẽ không khởi chạy được',
        'Vì nhân Linux chỉ chạy được file ELF tĩnh',
        'Vì bản tĩnh có kích thước nhỏ hơn'
      ],
      a: 1,
      why: 'Chương trình liên kết động mang trong ELF một mục <code>PT_INTERP</code> ghi đường dẫn bộ nạp động. Nhân đọc mục đó và cố nạp <code>/lib/ld-linux-aarch64.so.1</code>; file ấy không có trong initramfs nên <code>execve()</code> thất bại. Vì đây là PID 1 nên thất bại đồng nghĩa panic. Bản tĩnh không có <code>PT_INTERP</code> và không phụ thuộc gì ngoài lời gọi hệ thống. Bản tĩnh cũng <b>lớn hơn</b> chứ không nhỏ hơn — Bài 17 đã đo tỉ lệ 51,2 lần.' },

    { q: 'Trong lệnh đóng gói, vì sao phải <code>cd</code> vào thư mục rồi mới <code>find .</code>, thay vì đứng ngoài chạy <code>find initramfs</code>?',
      opts: [
        'Vì <code>cpio</code> không nhận đường dẫn có dấu gạch chéo',
        'Vì đường dẫn lưu trong kho là đường dẫn <code>find</code> in ra, nên đứng ngoài sẽ tạo ra <code>/initramfs/init</code> trong guest thay vì <code>/init</code>',
        'Vì <code>gzip</code> nén tốt hơn khi tên file ngắn',
        'Vì <code>find</code> không đi vào symlink nếu đứng ngoài'
      ],
      a: 1,
      why: 'cpio lưu <b>nguyên văn</b> chuỗi tên mà nó nhận từ đầu vào chuẩn. Đứng ngoài thì mỗi mục thành <code>initramfs/bin/sh</code>, và khi nhân bung kho ra tại <code>/</code>, file sẽ nằm ở <code>/initramfs/bin/sh</code>. Nhân tìm <code>/init</code>, không thấy, và panic bằng <code>VFS: Unable to mount root fs</code> — một thông báo chẳng gợi ý gì về nguyên nhân thật.' },

    { q: 'Bạn boot và <b>ra được</b> dấu nhắc <code>~ #</code>, nhưng dòng <code>=== init running as PID 1 ===</code> không xuất hiện và <code>ls /proc</code> cho kết quả rỗng. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Thiếu <code>console=ttyAMA0</code> nên một số dòng bị mất',
        '<code>/init</code> thiếu quyền thực thi, nên nhân bỏ qua nó và chạy thẳng <code>/bin/sh</code> theo phương án dự phòng',
        'BusyBox không hỗ trợ <code>mount</code>',
        'Bộ nhớ <code>-m 512</code> quá nhỏ để gắn <code>procfs</code>'
      ],
      a: 1,
      why: 'Nhân thử chạy đường dẫn trong <code>rdinit=</code>; thất bại thì nó lần lượt thử <code>/sbin/init</code>, <code>/etc/init</code>, <code>/bin/init</code>, <code>/bin/sh</code>. Trong initramfs của bạn <code>/bin/sh</code> <b>có tồn tại</b>, nên bạn được một shell — nhưng là shell chạy trực tiếp, chưa qua <code>init</code>. Hệ quả: không có <code>--install</code>, không có <code>/proc</code>, không có dòng <code>echo</code>. Đây là kiểu hỏng nguy hiểm vì nó <b>trông như</b> thành công. Sửa bằng <code>chmod +x initramfs/init</code> rồi đóng gói lại.' },

    { q: 'File initramfs của bạn là 1 035 396 byte, nhưng nhân báo <code>Freeing initrd memory: 1008K</code> (= 1 032 192 byte). Vì sao lệch 3 KiB?',
      opts: [
        'Vì nhân giữ lại 3 KiB làm bộ đệm giải nén',
        'Vì nhân chỉ trả về bộ cấp phát những <b>trang 4 KiB nằm trọn</b> trong vùng initrd, nên trang cuối bị cắt dở thì bị bỏ lại',
        'Vì gzip thêm 3 KiB header khi nạp vào RAM',
        'Vì device tree chiếm 3 KiB ngay sau initrd'
      ],
      a: 1,
      why: 'Bộ cấp phát bộ nhớ của nhân làm việc theo đơn vị <b>trang</b>, ở đây là 4 KiB. Vùng initrd kết thúc ở <code>0x480fcc84</code>, làm tròn xuống bội của 4096 được <code>0x480fc000</code>, tức <code>0xfc000</code> = 1 032 192 byte = đúng 1008 KiB. Quy tắc "làm tròn theo trang" này lặp lại ở mọi con số bộ nhớ mà nhân in ra.' },

    { q: 'Bạn bỏ <code>console=ttyAMA0</code> khỏi <code>-append</code> nhưng log nhân vẫn hiện ra đầy đủ. Vì sao?',
      opts: [
        'Vì <code>-nographic</code> tự thêm <code>console=ttyAMA0</code> vào dòng lệnh nhân',
        'Vì QEMU ghi <code>stdout-path = "/pl011@9000000"</code> vào nút <code>chosen</code> của device tree, và nhân dùng nó làm phương án dự phòng',
        'Vì nhân Debian được biên dịch với console mặc định là <code>ttyAMA0</code>',
        'Vì máy <code>virt</code> chỉ có một thiết bị ký tự nên không có gì để chọn nhầm'
      ],
      a: 1,
      why: 'Ở Bước 5 bạn đã nhìn thấy tận mắt thuộc tính <code>stdout-path</code> trong nút <code>chosen</code>. Khi không có <code>console=</code>, nhân đọc thuộc tính này để biết console ở đâu. Nhưng đừng dựa vào nó: nhiều board thật không khai <code>stdout-path</code>, và khi đó thiếu <code>console=</code> cho bạn màn hình trắng trong khi hệ thống bên trong vẫn boot bình thường. Luôn khai tường minh.' },

    { q: 'Vì sao dòng cuối của <code>init</code> phải là <code>exec /bin/sh</code> chứ không phải <code>/bin/sh</code>?',
      opts: [
        '<code>exec</code> chạy nhanh hơn vì không tạo tiến trình con',
        '<code>exec</code> thay thế tiến trình hiện tại, nên shell <b>trở thành</b> PID 1; gọi thường thì shell thoát là script kết thúc theo và nhân panic vì PID 1 đã chết',
        'Không có <code>exec</code> thì shell không đọc được <code>/proc</code>',
        '<code>exec</code> là bắt buộc với mọi script trong initramfs'
      ],
      a: 1,
      why: 'Nhân coi việc PID 1 kết thúc — dù với mã 0 — là tình huống không thể phục hồi và dừng bằng <code>Kernel panic - not syncing: Attempted to kill init!</code>. Gọi <code>/bin/sh</code> thường sẽ tạo tiến trình con; khi bạn thoát shell ấy, script <code>init</code> hết lệnh và cũng thoát theo, kéo theo panic. <code>exec</code> thay ảnh tiến trình ngay tại chỗ, giữ nguyên PID 1, nên shell chính là init. Việc tiết kiệm một tiến trình chỉ là hệ quả phụ, không phải lý do.' }
  ]
});

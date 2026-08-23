/* Bài 36 — Nạp kernel qua mạng và FIT image
   Chặng 06 — Bootloader U-Boot
   TFTP như vòng lặp phát triển thực tế; cấu trúc FIT (.its -> mkimage -> .itb);
   hash SHA-256 bắt lỗi một byte; ký RSA-2048 và khoá công khai trong control FDT. */

Lesson.register({
  id: 'bai-36',
  title: 'Nạp kernel qua mạng và FIT image',
  minutes: 70,
  practice: 'Thực hành 55 phút',
  level: 'Nâng cao',

  intro:
    'Ở <b>Bài 35</b> bạn đã làm cho máy tự boot từ ổ đĩa — tuyệt vời cho một sản phẩm đã xuất ' +
    'xưởng, nhưng là cực hình khi đang phát triển. Sửa một dòng trong kernel, build lại, rồi ' +
    'phải chép <b>30 771 136 byte</b> vào ảnh đĩa, khởi động lại máy ảo — mà trên board thật ' +
    'còn phải rút thẻ SD ra, cắm vào máy tính, chép, rút ra, cắm lại. Làm ba mươi lần một ngày ' +
    'thì hỏng cả thẻ lẫn người. Bài này bạn dựng <b>vòng lặp phát triển thật</b> mà mọi kỹ sư ' +
    'embedded đều dùng: kernel nằm nguyên trong thư mục build trên máy bạn, và U-Boot ' +
    '<b>kéo nó qua mạng</b> bằng TFTP mỗi lần boot. Nửa sau của bài giải quyết một vấn đề khác ' +
    'hẳn: kernel, device tree và initramfs là <b>ba</b> file rời rạc, không có gì ràng buộc ' +
    'chúng với nhau, và không có gì chứng minh chúng chưa bị sửa. Câu trả lời của U-Boot là ' +
    '<b>FIT image</b> — một file duy nhất chứa cả ba, mỗi phần kèm <b>hash SHA-256</b>. Bạn sẽ ' +
    'cố tình lật <b>đúng một byte</b> giữa một file 31 MB để nhìn U-Boot phát hiện và từ chối ' +
    'boot, rồi <b>ký</b> ảnh bằng RSA-2048 và dạy U-Boot từ chối luôn mọi ảnh không có chữ ký. ' +
    'Đó là viên gạch đầu tiên của secure boot.',

  goals: [
    'Dựng máy chủ TFTP có sẵn trong QEMU bằng cặp <code>-netdev user,tftp=…</code> + <code>-device virtio-net-device</code>, và giải thích vì sao <code>-nic</code> không dùng được ở đây',
    'Dùng <code>dhcp</code>, <code>ping</code>, <code>tftpboot</code> để nạp kernel từ máy host vào RAM máy ảo rồi <code>booti</code>',
    'Lấy đúng device tree của máy ảo bằng <code>-machine dumpdtb</code>, và giải thích vì sao phải dump bằng <b>đúng dòng lệnh sẽ boot</b>',
    'Viết một file <code>.its</code> mô tả kernel + DTB + initramfs, build thành <code>.itb</code> bằng <code>mkimage -f</code>, và đọc kết quả bằng <code>iminfo</code>',
    'Chứng minh hash SHA-256 trong FIT phát hiện được sai lệch <b>một byte</b>, và đọc đúng thông báo <code>Bad Data Hash</code>',
    'Ký FIT bằng RSA-2048, nhúng khoá công khai vào control FDT của U-Boot bằng <code>mkimage -K … -r</code>, và kiểm chứng U-Boot từ chối ảnh không ký'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Vòng lặp phát triển
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Vòng lặp phát triển: vì sao TFTP vẫn sống sau bốn mươi năm' },

    { t: 'p', x:
      'Công việc thật của một kỹ sư kernel/BSP là một vòng lặp: <i>sửa mã → build → boot → ' +
      'xem log → sửa tiếp</i>. Thứ quyết định năng suất không phải tốc độ compiler mà là ' +
      '<b>thời gian từ lúc build xong đến lúc thấy log</b>. Hãy so ba cách:' },

    { t: 'table',
      head: ['Cách nạp kernel', 'Mỗi vòng lặp tốn gì', 'Dùng khi nào'],
      rows: [
        ['Rút thẻ SD ra chép lại', 'Vài phút thao tác tay, mòn khe cắm, dễ quên chép',
         'Chỉ khi board không có mạng và không có gì khác'],
        ['Chép vào ảnh đĩa rồi boot lại', 'Vài chục giây, phải nhớ chép đúng file',
         'Khi kiểm thử đúng cấu hình xuất xưởng'],
        ['<b>TFTP</b>', 'Gõ lại <b>một lệnh</b>; file lấy thẳng từ thư mục build',
         '<b>Mặc định trong lúc phát triển</b> — cả trên QEMU lẫn board thật']
      ] },

    { t: 'p', x:
      '<b>TFTP</b> (Trivial File Transfer Protocol) ra đời năm 1981 và đơn giản đến mức thô ' +
      'sơ: chạy trên UDP cổng 69, không đăng nhập, không mã hoá, không liệt kê được thư mục, ' +
      'không đổi tên, không xoá. Chỉ có "đưa tôi file tên này" và "nhận file tên này". Chính ' +
      'sự nghèo nàn đó là lý do nó sống dai: toàn bộ mã client nhét vừa vài kilobyte, đủ nhỏ ' +
      'để nhúng vào ROM khởi động của một con chip — điều mà HTTP hay SSH không bao giờ làm ' +
      'được.' },

    { t: 'cal', kind: 'warn', title: 'TFTP không có bảo mật — và điều đó có hậu quả thật',
      x: 'Bất kỳ ai trong cùng mạng đều tải được mọi file trong thư mục TFTP của bạn, và nếu ' +
         'máy chủ cho ghi thì họ <b>thay được kernel</b> mà board của bạn sắp boot. Vì vậy quy ' +
         'tắc trong ngành là: TFTP chỉ dùng ở bàn làm việc, trong mạng phòng lab, và ' +
         '<b>không bao giờ</b> nằm trong <code>bootcmd</code> của thiết bị xuất xưởng. Đây cũng ' +
         'chính là lý do nửa sau bài này tồn tại: nếu buộc phải nạp qua một kênh không đáng ' +
         'tin, thì bản thân <b>ảnh</b> phải tự chứng minh được nó là thật — bằng hash và chữ ký.' },

    { t: 'p', x:
      'Điều dễ chịu là bạn <b>không cần cài máy chủ TFTP</b>. Lớp mạng người dùng ' +
      '(<i>user-mode networking</i>, tên cũ là "slirp") của QEMU đã có sẵn một máy chủ TFTP ' +
      'bên trong. Bạn chỉ cần chỉ cho nó thư mục nào, và nó phục vụ ngay ở địa chỉ ' +
      '<code>10.0.2.2</code> — không <code>sudo</code>, không dịch vụ hệ thống, không mở cổng ' +
      'ra thế giới bên ngoài.' },

    { t: 'table',
      head: ['Địa chỉ', 'Là ai', 'Ghi chú'],
      rows: [
        ['<code>10.0.2.2</code>', 'Máy host của bạn', 'Cũng là gateway và máy chủ TFTP'],
        ['<code>10.0.2.3</code>', 'Máy chủ DNS ảo', 'QEMU chuyển tiếp sang DNS thật của host'],
        ['<code>10.0.2.15</code>', 'Máy ảo', 'Địa chỉ mà DHCP của QEMU luôn cấp đầu tiên'],
        ['<code>255.255.255.0</code>', 'Netmask', 'Mạng <code>10.0.2.0/24</code> hoàn toàn ảo, nằm gọn trong tiến trình QEMU']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       2. Mạng trong QEMU
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Nối mạng cho máy ảo: hai nửa phải khớp nhau' },

    { t: 'p', x:
      'Giống hệt chuyện gắn ổ đĩa ở Bài 35 — <code>-drive</code> mô tả dữ liệu, ' +
      '<code>-device</code> tạo phần cứng — mạng cũng có hai nửa, và phải nối chúng lại bằng ' +
      'một cái tên:' },

    { t: 'cmdx', cmd: '-netdev user,id=net0,tftp=/home/ban/bai36/tftp -device virtio-net-device,netdev=net0',
      title: 'Hai nửa của một card mạng ảo',
      rows: [
        ['<code>-netdev</code>', 'Nửa "hạ tầng": gói tin đi từ máy ảo ra sẽ được xử lý thế nào.'],
        ['<code>user</code>', 'Chế độ user-mode/slirp: QEMU tự đóng vai router, DHCP, DNS và TFTP. ' +
                              'Không cần quyền root, đổi lại máy ảo không nhìn thấy được từ mạng LAN thật.'],
        ['<code>id=net0</code>', 'Tên để nửa kia tham chiếu tới. Sai tên là hỏng cả cặp.'],
        ['<code>tftp=&lt;thư mục&gt;</code>', '<b>Bật máy chủ TFTP</b> phục vụ đúng thư mục này. ' +
                                              'Phải là đường dẫn <b>tuyệt đối</b>.'],
        ['<code>-device virtio-net-device</code>',
         'Nửa "phần cứng": card mạng virtio trên bus MMIO của máy <code>virt</code>. Hậu tố ' +
         '<code>-device</code> (thay vì <code>-pci</code>) là bắt buộc với máy này.'],
        ['<code>netdev=net0</code>', 'Cắm card mạng đó vào hạ tầng tên <code>net0</code>.']
      ] },

    { t: 'cal', kind: 'danger', title: 'Cái bẫy <code>-nic</code>: QEMU chỉ <i>cảnh báo</i> rồi chạy tiếp',
      x: 'Tuỳ chọn <code>-nic</code> gộp cả hai nửa vào một dòng cho gọn, nên rất hấp dẫn. ' +
         'Nhưng viết <code>-nic user,model=virtio-net-device,tftp=…</code> thì QEMU in một dòng ' +
         'cảnh báo mờ nhạt — <code>requested NIC … was not created</code> — rồi <b>khởi động ' +
         'bình thường không có card mạng nào</b>. U-Boot sẽ báo <code>Net: No ethernet found.</code> ' +
         'và mọi lệnh mạng trả về cùng một câu đó, khiến bạn đi tìm lỗi trong U-Boot suốt nửa ' +
         'tiếng trong khi lỗi nằm ở dòng lệnh QEMU. Bước 1 phần thực hành cho bạn nhìn cả hai ' +
         'trường hợp cạnh nhau, để lần sau bạn nhận ra ngay.' },

    { t: 'p', x:
      'Trong U-Boot, ba lệnh mạng bạn cần thuộc nằm lòng:' },

    { t: 'table',
      head: ['Lệnh', 'Việc nó làm', 'Biến môi trường liên quan'],
      rows: [
        ['<code>dhcp</code>', 'Xin địa chỉ IP. Mặc định nó <b>xin xong rồi tải luôn</b> một file khởi động',
         'Đặt <code>ipaddr</code>, <code>serverip</code>, <code>gatewayip</code>, <code>netmask</code>'],
        ['<code>setenv autoload no</code>', 'Bảo <code>dhcp</code> chỉ xin IP thôi, đừng tải gì cả',
         'Nên gõ trước <code>dhcp</code> khi bạn chỉ cần địa chỉ'],
        ['<code>ping &lt;ip&gt;</code>', 'Kiểm tra đường mạng. U-Boot chỉ <b>gửi</b> được, không trả lời ping',
         '—'],
        ['<code>tftpboot &lt;addr&gt; &lt;file&gt;</code>', 'Tải file từ <code>serverip</code> vào RAM',
         'Đặt <code>filesize</code>, y hệt <code>load</code> ở Bài 35']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       3. FIT image
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'FIT image: một file, nhiều thành phần, có hash' },

    { t: 'p', x:
      'Cách boot bạn dùng suốt Bài 35 có một điểm yếu mà lúc đó chưa lộ ra: nó cần ' +
      '<b>ba file rời rạc</b> — <code>Image</code>, device tree, <code>initramfs.cpio.gz</code> ' +
      '— và <i>không có gì</i> ràng buộc chúng với nhau. Chép nhầm một device tree của board ' +
      'khác vào, U-Boot vẫn boot vui vẻ, và bạn nhận một kernel chết im lặng. Cập nhật kernel ' +
      'qua mạng mà mất điện giữa chừng, thiết bị có nửa file và biến thành cục gạch. Không có ' +
      'chỗ nào để hỏi <i>"ba file này có thuộc về nhau không, và chúng có nguyên vẹn không?"</i>' },

    { t: 'p', x:
      'Định dạng cũ <b>legacy uImage</b> — cái header 64 byte bạn đã gặp ở <code>boot.scr</code> ' +
      '— không giải quyết được, vì nó chỉ mô tả được <b>một</b> payload và chỉ có CRC32. ' +
      '<b>FIT</b> (Flattened Image Tree) là câu trả lời hiện đại, và ý tưởng của nó rất đẹp: ' +
      '<i>dùng lại chính định dạng device tree để mô tả một bộ ảnh khởi động</i>.' },

    { t: 'terms', items: [
      ['.its', 'Image Tree Source',
       'File văn bản bạn viết, cú pháp y hệt file <code>.dts</code> của device tree. Nó ' +
       '<i>mô tả</i> ảnh chứ không chứa dữ liệu: mỗi thành phần trỏ tới file thật bằng ' +
       '<code>/incbin/("tên_file")</code>.'],
      ['.itb', 'Image Tree Blob',
       'Kết quả sau khi <code>mkimage -f</code> nhúng toàn bộ dữ liệu vào. Đây là file thật sự ' +
       'được nạp. Nó bắt đầu bằng đúng số magic <b><code>d00dfeed</code></b> mà bạn đã học ở ' +
       'Bài 35 — vì nó <i>là</i> một device tree.'],
      ['images', '—',
       'Node chứa các thành phần. Mỗi thành phần khai báo <code>type</code> ' +
       '(<code>kernel</code>/<code>flat_dt</code>/<code>ramdisk</code>), ' +
       '<code>arch</code>, <code>os</code>, <code>compression</code>, địa chỉ ' +
       '<code>load</code>/<code>entry</code>, và một node <code>hash</code>.'],
      ['configurations', '—',
       '<b>Đây mới là chỗ đắt giá.</b> Mỗi cấu hình ghép <i>một</i> kernel với <i>một</i> DTB ' +
       'và <i>một</i> ramdisk. Một file FIT có thể chứa năm DTB cho năm biến thể board, và ' +
       '<code>bootm</code> chọn đúng cấu hình — đây là cách một bản cập nhật duy nhất phục vụ ' +
       'cả dòng sản phẩm.']
    ] },

    { t: 'fig',
      cap: 'FIT chỉ là một device tree mà "lá" của nó là dữ liệu nhị phân. Vì vậy nó thừa hưởng ' +
           'miễn phí toàn bộ công cụ của device tree — kể cả <code>dtc</code> để đọc lại nội dung.',
      svg:
      '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Cấu trúc một FIT image gồm node images và node configurations">' +
      '<rect class="d-box" x="10" y="14" width="200" height="52" rx="8"/>' +
      '<text class="d-tm" x="110" y="36" text-anchor="middle">kernel.its</text>' +
      '<text class="d-ts" x="110" y="55" text-anchor="middle">văn bản, ~1,3 KB</text>' +
      '<line class="d-line" x1="210" y1="40" x2="272" y2="40"/>' +
      '<path class="d-arrow" d="M280 40 l-9 -4 v8 z"/>' +
      '<text class="d-tm" x="245" y="30" text-anchor="middle">mkimage -f</text>' +
      '<rect class="d-box-p" x="280" y="14" width="200" height="52" rx="8"/>' +
      '<text class="d-tm" x="380" y="36" text-anchor="middle">kernel.itb</text>' +
      '<text class="d-ts" x="380" y="55" text-anchor="middle">nhị phân, ~31 MB</text>' +
      '<line class="d-line" x1="480" y1="40" x2="542" y2="40"/>' +
      '<path class="d-arrow" d="M550 40 l-9 -4 v8 z"/>' +
      '<rect class="d-box-a" x="550" y="14" width="160" height="52" rx="8"/>' +
      '<text class="d-tm" x="630" y="36" text-anchor="middle">bootm</text>' +
      '<text class="d-ts" x="630" y="55" text-anchor="middle">kiểm tra rồi boot</text>' +
      '<rect class="d-box" x="10" y="96" width="340" height="176" rx="8"/>' +
      '<text class="d-t" x="30" y="120">images { }</text>' +
      '<rect class="d-box-g" x="30" y="132" width="300" height="38" rx="6"/>' +
      '<text class="d-tm" x="44" y="148">kernel-1</text>' +
      '<text class="d-ts" x="44" y="163">type=kernel · load=0x40400000 · hash sha256</text>' +
      '<rect class="d-box-g" x="30" y="178" width="300" height="38" rx="6"/>' +
      '<text class="d-tm" x="44" y="194">fdt-1</text>' +
      '<text class="d-ts" x="44" y="209">type=flat_dt · hash sha256</text>' +
      '<rect class="d-box-g" x="30" y="224" width="300" height="38" rx="6"/>' +
      '<text class="d-tm" x="44" y="240">ramdisk-1</text>' +
      '<text class="d-ts" x="44" y="255">type=ramdisk · hash sha256</text>' +
      '<rect class="d-box" x="380" y="96" width="330" height="176" rx="8"/>' +
      '<text class="d-t" x="400" y="120">configurations { }</text>' +
      '<text class="d-tm" x="400" y="142">default = "conf-1";</text>' +
      '<rect class="d-box-a" x="400" y="154" width="290" height="70" rx="6"/>' +
      '<text class="d-tm" x="414" y="174">conf-1</text>' +
      '<text class="d-ts" x="414" y="192">kernel = "kernel-1"; fdt = "fdt-1";</text>' +
      '<text class="d-ts" x="414" y="210">ramdisk = "ramdisk-1";</text>' +
      '<text class="d-ts" x="400" y="248">Một FIT có thể có nhiều cấu hình cho nhiều</text>' +
      '<text class="d-ts" x="400" y="264">biến thể board — cùng kernel, khác DTB</text>' +
      '<rect class="d-box-p" x="10" y="286" width="700" height="34" rx="8"/>' +
      '<text class="d-ts" x="360" y="308" text-anchor="middle">4 byte đầu của kernel.itb là d0 0d fe ed — FIT chính là một device tree, chỉ khác nội dung</text>' +
      '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao lại đi mượn định dạng device tree?',
      x: 'Vì U-Boot <b>đã có sẵn</b> thư viện <code>libfdt</code> để đọc device tree — nó phải ' +
         'có, vì device tree là thứ nó bàn giao cho kernel. Dùng lại định dạng đó nghĩa là ' +
         'không phải viết thêm một trình phân tích cú pháp nào, không thêm một dòng mã nào có ' +
         'thể chứa lỗi tràn bộ đệm ở vị trí nhạy cảm nhất của hệ thống. Trong embedded, ' +
         '<b>không viết thêm mã</b> luôn là quyết định thiết kế tốt nhất khi bạn có thể chọn.' },

    /* ══════════════════════════════════════════════════════════════════
       4. Hash và chữ ký
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Hash và chữ ký: hai tầng bảo vệ trả lời hai câu hỏi khác nhau' },

    { t: 'p', x:
      'Đây là chỗ rất nhiều người nhầm, và nhầm ở đây thì thiết kế bảo mật sai từ gốc. Hai cơ ' +
      'chế nghe giống nhau nhưng chống lại hai loại đối thủ hoàn toàn khác:' },

    { t: 'table',
      head: ['', 'Hash (SHA-256)', 'Chữ ký (RSA-2048)'],
      rows: [
        ['Trả lời câu hỏi', '<i>File có bị thay đổi so với lúc đóng gói không?</i>',
         '<i>Ai là người đóng gói file này?</i>'],
        ['Chống lại', 'Tai nạn: lỗi bit, mất điện giữa lúc cập nhật, truyền hỏng',
         '<b>Kẻ tấn công</b> cố tình thay kernel'],
        ['Cần gì để tạo', 'Không cần gì — ai cũng tính được',
         'Khoá <b>bí mật</b>, giữ trong két, không bao giờ rời máy build'],
        ['Cần gì để kiểm tra', 'Không cần gì', 'Khoá <b>công khai</b>, phải nằm sẵn trong U-Boot'],
        ['Điểm yếu chí mạng', 'Kẻ tấn công sửa file <b>và</b> tính lại hash — hoàn toàn hợp lệ',
         'Nếu khoá bí mật lộ thì mọi thứ sụp đổ']
      ] },

    { t: 'cal', kind: 'warn', title: 'Hash một mình <b>không</b> phải bảo mật',
      x: 'Hash nằm ngay bên trong file mà nó bảo vệ. Ai sửa được kernel thì cũng sửa được hash ' +
         '— chỉ mất một dòng lệnh. Vì vậy hash chỉ bảo vệ bạn khỏi <b>tai nạn</b>, và điều đó ' +
         'đã rất đáng giá. Muốn chống <b>ý đồ xấu</b>, phải có một thứ mà kẻ tấn công không thể ' +
         'tạo ra: chữ ký bằng khoá bí mật. Và mấu chốt là <b>khoá công khai không nằm trong ' +
         'ảnh</b> — nó nằm trong U-Boot, thứ mà kẻ tấn công (theo giả thiết) không sửa được.' },

    { t: 'p', x:
      'Với U-Boot, khoá công khai được nhét vào <b>control FDT</b> — device tree mà chính ' +
      'U-Boot dùng để tự cấu hình. Công cụ <code>mkimage</code> làm cả hai việc trong một lần ' +
      'chạy: ký ảnh <b>và</b> ghi khoá công khai vào một file <code>.dtb</code> mà bạn chỉ định:' },

    { t: 'cmdx', cmd: 'mkimage -f kernel-signed.its -k keys -K control.dtb -r kernel-signed.itb',
      title: 'Ký ảnh và phát hành khoá công khai trong một lệnh',
      rows: [
        ['<code>-f &lt;its&gt;</code>', 'File mô tả nguồn, như mọi lần build FIT.'],
        ['<code>-k keys</code>', '<b>Thư mục</b> chứa khoá bí mật. <code>mkimage</code> tìm file theo ' +
                                 '<code>key-name-hint</code> ghi trong <code>.its</code> — hint ' +
                                 '<code>"dev"</code> thì nó mở <code>keys/dev.key</code> và ' +
                                 '<code>keys/dev.crt</code>.'],
        ['<code>-K control.dtb</code>', '<b>Ghi khoá công khai vào</b> file device tree này, dưới node ' +
                                        '<code>/signature/key-dev</code>. Đây là bản sao mà U-Boot sẽ đọc.'],
        ['<code>-r</code>', '<i>required</i> — đánh dấu khoá là <b>bắt buộc</b>. Từ đây U-Boot ' +
                            '<b>từ chối</b> mọi cấu hình không có chữ ký hợp lệ của khoá này. Thiếu ' +
                            '<code>-r</code> thì U-Boot chỉ kiểm tra khi có chữ ký, còn ảnh không ký ' +
                            'vẫn boot — tức là bảo mật bằng không.'],
        ['<code>kernel-signed.itb</code>', 'File FIT kết quả, đã có node <code>signature-1</code> bên trong.']
      ] },

    { t: 'fig',
      cap: 'Khoá bí mật không bao giờ rời máy build; khoá công khai đi cùng U-Boot. Cờ ' +
           '<code>-r</code> là thứ biến "có kiểm tra nếu có chữ ký" thành "không ký thì không boot".',
      svg:
      '<svg viewBox="0 0 720 270" width="720" role="img" aria-label="Luồng ký FIT trên máy build và xác thực trên thiết bị">' +
      '<text class="d-t" x="10" y="20">Máy build (nơi bạn tin tưởng)</text>' +
      '<rect class="d-box-w" x="10" y="32" width="150" height="56" rx="8"/>' +
      '<text class="d-tm" x="85" y="54" text-anchor="middle">keys/dev.key</text>' +
      '<text class="d-ts" x="85" y="74" text-anchor="middle">khoá bí mật — giữ kín</text>' +
      '<rect class="d-box" x="185" y="32" width="150" height="56" rx="8"/>' +
      '<text class="d-tm" x="260" y="54" text-anchor="middle">mkimage -k -K -r</text>' +
      '<text class="d-ts" x="260" y="74" text-anchor="middle">ký và phát hành</text>' +
      '<line class="d-line" x1="160" y1="60" x2="177" y2="60"/>' +
      '<path class="d-arrow" d="M185 60 l-9 -4 v8 z"/>' +
      '<line class="d-line" x1="335" y1="48" x2="392" y2="48"/>' +
      '<path class="d-arrow" d="M400 48 l-9 -4 v8 z"/>' +
      '<line class="d-line" x1="335" y1="76" x2="392" y2="76"/>' +
      '<path class="d-arrow" d="M400 76 l-9 -4 v8 z"/>' +
      '<rect class="d-box-p" x="400" y="26" width="310" height="34" rx="6"/>' +
      '<text class="d-ts" x="416" y="48">kernel-signed.itb — ảnh kèm chữ ký</text>' +
      '<rect class="d-box-g" x="400" y="64" width="310" height="34" rx="6"/>' +
      '<text class="d-ts" x="416" y="86">control.dtb — chứa khoá công khai</text>' +
      '<line class="d-line" x1="10" y1="118" x2="710" y2="118"/>' +
      '<text class="d-t" x="10" y="146">Thiết bị (nơi không ai tin ai)</text>' +
      '<rect class="d-box-a" x="10" y="158" width="200" height="56" rx="8"/>' +
      '<text class="d-tm" x="110" y="180" text-anchor="middle">U-Boot + control.dtb</text>' +
      '<text class="d-ts" x="110" y="200" text-anchor="middle">khoá công khai nằm sẵn ở đây</text>' +
      '<line class="d-line" x1="210" y1="186" x2="262" y2="186"/>' +
      '<path class="d-arrow" d="M270 186 l-9 -4 v8 z"/>' +
      '<rect class="d-box" x="270" y="158" width="180" height="56" rx="8"/>' +
      '<text class="d-tm" x="360" y="180" text-anchor="middle">bootm</text>' +
      '<text class="d-ts" x="360" y="200" text-anchor="middle">đối chiếu chữ ký</text>' +
      '<line class="d-line" x1="450" y1="172" x2="502" y2="172"/>' +
      '<path class="d-arrow" d="M510 172 l-9 -4 v8 z"/>' +
      '<line class="d-line" x1="450" y1="200" x2="502" y2="200"/>' +
      '<path class="d-arrow" d="M510 200 l-9 -4 v8 z"/>' +
      '<rect class="d-box-g" x="510" y="154" width="200" height="30" rx="6"/>' +
      '<text class="d-ts" x="524" y="174">khớp &#8594; Starting kernel</text>' +
      '<rect class="d-box-w" x="510" y="190" width="200" height="30" rx="6"/>' +
      '<text class="d-ts" x="524" y="210">không &#8594; Bad Data Hash</text>' +
      '<rect class="d-box-p" x="10" y="234" width="700" height="30" rx="8"/>' +
      '<text class="d-ts" x="360" y="254" text-anchor="middle">Kẻ tấn công sửa được ảnh nhưng không tạo được chữ ký — vì khoá bí mật chưa bao giờ rời máy build</text>' +
      '</svg>' },

    { t: 'cal', kind: 'info', title: 'Chuỗi tin cậy phải bắt đầu từ đâu đó',
      x: 'Bạn có thể hỏi ngay: <i>thế ai bảo vệ chính U-Boot?</i> Câu hỏi rất đúng. Trên thiết ' +
         'bị thật, mã ROM cố định trong chip (không sửa được, kể cả bởi nhà sản xuất) kiểm tra ' +
         'chữ ký của bootloader tầng đầu, tầng đầu kiểm tra U-Boot, U-Boot kiểm tra FIT, và ' +
         'kernel kiểm tra rootfs bằng <code>dm-verity</code>. Đó gọi là <b>chuỗi tin cậy</b>, ' +
         'và mỗi mắt xích chỉ có nghĩa khi mắt trước nó đã được xác thực. Trong bài này ta làm ' +
         'đúng <b>một mắt xích</b> — mắt U-Boot kiểm tra FIT — nhưng nguyên lý ở mọi mắt còn ' +
         'lại giống hệt.' },

    { t: 'hr' },

    /* ══════════════════════════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: từ TFTP đến FIT image có chữ ký' },

    { t: 'p', x:
      'Bảy bước dưới đây đi liền một mạch trong <b>một thư mục duy nhất</b> là ' +
      '<code>~/bai36</code>. Bạn sẽ gặp <b>ba lỗi thật</b> trên đường đi — và cả ba đều nằm ' +
      'trong bài một cách cố ý, vì đó chính là ba lỗi mà mọi người mới làm FIT đều gặp. Đừng ' +
      'bỏ qua chúng: bước chẩn đoán ở bước 5 là phần có giá trị nhất của cả bài. Kernel và ' +
      'initramfs lấy lại từ <b>Bài 32</b>, U-Boot lấy lại từ <b>Bài 34</b> — không phải build ' +
      'lại gì cả.' },

    { t: 'steps', items: [

      /* ─────────────── Bước 1 ─────────────── */
      { title: 'Chuẩn bị thư mục TFTP và nối mạng cho máy ảo',
        blocks: [
          { t: 'p', x:
            'Máy chủ TFTP ở đây <b>không phải</b> một dịch vụ bạn phải cài. QEMU có sẵn một ' +
            'cái nhúng trong lớp mạng <code>user</code> (slirp): bạn chỉ cần chỉ cho nó một ' +
            'thư mục, và mọi file trong đó lập tức tải được từ trong máy ảo. Bước đầu là tạo ' +
            'thư mục ấy và bỏ hai file của Bài 32 vào.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai36/tftp\n' +
            'cd ~/bai36\n' +
            'cp ~/bai32/Image ~/bai32/initramfs.cpio.gz tftp/\n' +
            'ls -l tftp/' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 31064\n' +
            '-rw-r--r-- 1 shinarus shinarus 30771136 Aug 16 18:17 Image\n' +
            '-rw-r--r-- 1 shinarus shinarus  1035397 Aug 16 18:17 initramfs.cpio.gz' },

          { t: 'cal', kind: 'info', title: 'Hai con số này còn quay lại nhiều lần trong bài',
            x: '<b>30 771 136</b> byte (<code>Image</code>) và <b>1 035 397</b> byte ' +
               '(<code>initramfs.cpio.gz</code>) không phải để nhớ, mà để đối chiếu: chúng sẽ ' +
               'in lại y nguyên trong <code>Bytes transferred</code> của <code>tftpboot</code> ' +
               'ở bước sau, và trong <code>Data Size</code> của <code>mkimage</code> ở bước 3. ' +
               'Bất cứ chỗ nào hai con số đó lệch đi là dấu hiệu file bị cắt xén hoặc gửi dở ' +
               'chừng.' },

          { t: 'p', x:
            'Bây giờ đến phần dễ sai nhất của cả bài. Cách <i>ngắn gọn</i> để nối mạng cho ' +
            'QEMU là tuỳ chọn <code>-nic</code>, và trực giác bảo rằng nó phải chạy. Hãy thử ' +
            'đúng một lần để nhìn thấy nó hỏng như thế nào:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios ~/bai34/u-boot/u-boot.bin \\\n' +
            '  -nic user,model=virtio-net-device,tftp=$HOME/bai36/tftp' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-system-aarch64: warning: netdev #net058 has no peer\n' +
            'qemu-system-aarch64: warning: requested NIC (anonymous, model virtio-net-device) was not created (not supported by this machine?)\n' +
            '...\n' +
            'Net:   No ethernet found.' },

          { t: 'cal', kind: 'danger', title: 'Hai dòng warning này sẽ ngốn của bạn một buổi chiều',
            x: 'QEMU <b>không dừng lại</b>. Nó in hai dòng warning rồi boot tiếp như không có ' +
               'chuyện gì, và bạn chỉ phát hiện ra vấn đề ở tận dòng <code>Net:   No ethernet ' +
               'found.</code> — lúc đó bạn đã cuộn màn hình qua hàng chục dòng khác rồi. ' +
               'Nguyên nhân: <code>-nic</code> là lối tắt cho máy có sẵn slot NIC theo mặc ' +
               'định; máy <code>virt</code> của ARM thì không, nó cần thiết bị được gắn tường ' +
               'minh vào bus virtio. Quy tắc để nhớ: <b>trên <code>-M virt</code>, luôn viết ' +
               'hai nửa</b> — <code>-netdev</code> tả <i>đường mạng</i>, <code>-device</code> ' +
               'tả <i>card mạng</i>, và <code>id=</code> của nửa trên phải khớp ' +
               '<code>netdev=</code> của nửa dưới.' },

          { t: 'p', x: 'Đây mới là dòng lệnh đúng. Từ đây đến hết bài, mọi lần khởi động máy ảo đều dùng nó:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios ~/bai34/u-boot/u-boot.bin \\\n' +
            '  -netdev user,id=net0,tftp=$HOME/bai36/tftp \\\n' +
            '  -device virtio-net-device,netdev=net0' },

          { t: 'cmdx', title: 'Hai nửa của một sợi dây mạng', cmd: '-netdev … -device …', rows: [
            ['<code>-netdev user</code>', 'Nửa <b>phía host</b>: dùng lớp mạng người dùng (slirp) do QEMU tự cài đặt trong tiến trình của nó. Không cần quyền root, không đụng tới card mạng thật, không cần <code>bridge</code>.'],
            ['<code>id=net0</code>', 'Đặt tên cho sợi dây. Cái tên này tồn tại chỉ để nửa còn lại trỏ vào.'],
            ['<code>tftp=$HOME/bai36/tftp</code>', 'Bật máy chủ TFTP nhúng và cắm gốc của nó vào thư mục này. <b>Phải là đường dẫn tuyệt đối</b> — <code>$HOME</code> để shell tự bung ra, đừng viết <code>~</code> vì nó nằm giữa chuỗi nên shell sẽ không bung.'],
            ['<code>-device virtio-net-device</code>', 'Nửa <b>phía máy ảo</b>: cắm một card mạng virtio vào bus MMIO của máy <code>virt</code>. Đây chính là thứ mà <code>-nic</code> không làm được.'],
            ['<code>netdev=net0</code>', 'Nối card mạng này vào sợi dây tên <code>net0</code>. Sai tên ở đây thì card có mà dây không — bạn lại nhận đúng hai dòng warning ở trên.']
          ]},

          { t: 'p', x: 'Lần này U-Boot tìm thấy card mạng ngay trong phần khởi tạo:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Net:   eth0: virtio-net#31' },

          { t: 'cal', kind: 'tip', title: 'Nhấn phím trong 2 giây',
            x: 'Vẫn như Bài 33–35: U-Boot đếm ngược <code>Hit any key to stop autoboot</code>. ' +
               'Nhấn <kbd>Enter</kbd> để rơi vào dấu nhắc <code>=&gt;</code>. Cả bảy bước còn ' +
               'lại đều gõ ở đó.' }
        ]},

      /* ─────────────── Bước 2 ─────────────── */
      { title: 'dhcp, ping, tftpboot: dựng vòng lặp phát triển',
        blocks: [
          { t: 'p', x:
            'U-Boot khởi động chưa có địa chỉ IP. Lệnh <code>dhcp</code> xin một cái từ máy chủ ' +
            'DHCP giả lập của QEMU. Nhưng <code>dhcp</code> theo mặc định còn <i>tự động tải ' +
            'luôn</i> một file boot ngay sau khi có IP — điều ta chưa muốn — nên tắt nó trước ' +
            'bằng <code>autoload</code>.' },

          { t: 'code', where: 'uboot', code:
            'setenv autoload no\n' +
            'dhcp' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> setenv autoload no\n' +
            '=> dhcp\n' +
            'BOOTP broadcast 1\n' +
            'DHCP client bound to address 10.0.2.15 (22 ms)' },

          { t: 'cal', kind: 'why', title: 'Vì sao phải đặt autoload=no',
            x: 'Nếu để mặc định, <code>dhcp</code> sẽ lấy IP rồi lập tức TFTP một file có tên ' +
               'suy ra từ chính địa chỉ IP đó. Bạn sẽ thấy nó đi tìm ' +
               '<code>&#39;0A00020F.img&#39;</code> — <code>0A00020F</code> chính là ' +
               '<code>10.0.2.15</code> viết dưới dạng hex — rồi báo ' +
               '<code>TFTP error: &#39;File not found&#39;</code>. Không hỏng gì, nhưng nó làm ' +
               'rối màn hình và tốn vài giây mỗi lần boot. Đặt <code>autoload no</code> để ' +
               '<code>dhcp</code> chỉ làm đúng một việc: lấy IP.' },

          { t: 'p', x: 'Xem QEMU đã phát cho máy ảo những gì:' },

          { t: 'code', where: 'uboot', code: 'printenv ipaddr serverip gatewayip netmask' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ipaddr=10.0.2.15\n' +
            'serverip=10.0.2.2\n' +
            'gatewayip=10.0.2.2\n' +
            'netmask=255.255.255.0' },

          { t: 'cal', kind: 'info', title: 'Ba địa chỉ này cố định, không phải ngẫu nhiên',
            x: 'Slirp luôn phát cùng một sơ đồ: máy ảo là <code>10.0.2.15</code>, còn ' +
               '<code>10.0.2.2</code> là <i>máy host của bạn</i> — và đồng thời là ' +
               '<code>serverip</code>, tức nơi <code>tftpboot</code> sẽ đi hỏi. Bạn không cần ' +
               'nhớ chúng: <code>printenv</code> luôn nói cho bạn biết. Nhưng biết rằng ' +
               '<code>10.0.2.2</code> = host thì khi mất kết nối bạn sẽ chẩn đoán nhanh hơn ' +
               'rất nhiều.' },

          { t: 'code', where: 'uboot', code: 'ping 10.0.2.2' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Using virtio-net#31 device\n' +
            'host 10.0.2.2 is alive' },

          { t: 'cal', kind: 'info', title: 'Ping xác nhận tầng mạng, không xác nhận file',
            x: '<code>host 10.0.2.2 is alive</code> chỉ chứng minh gói tin đi và về được giữa ' +
               'máy ảo và host — tầng mạng ổn. Nó không nói gì về việc file có tồn tại trong ' +
               'thư mục TFTP hay không, vì đó là chuyện của tầng ứng dụng (TFTP chạy trên UDP, ' +
               'ping dùng ICMP — hai giao thức khác nhau hoàn toàn). Vì ping đã xác nhận mạng ' +
               'ổn, phép thử tiếp theo cho phép bạn loại trừ nguyên nhân mạng ngay từ đầu.' },

          { t: 'p', x:
            'Trước khi tải file thật, hãy cố tình tải một file <b>không tồn tại</b>. Bạn cần ' +
            'nhận ra thông báo này ngay lập tức, vì 90% sự cố TFTP là gõ sai tên file hoặc để ' +
            'file sai thư mục:' },

          { t: 'code', where: 'uboot', code: 'tftpboot ${kernel_addr_r} nosuchfile' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Using virtio-net#31 device\n' +
            'TFTP from server 10.0.2.2; our IP address is 10.0.2.15\n' +
            "Filename 'nosuchfile'.\n" +
            'Load address: 0x40400000\n' +
            'Loading: *\n' +
            "TFTP error: 'File not found' (1)\n" +
            'Not retrying...' },

          { t: 'cal', kind: 'warn', title: 'File not found nói về thư mục, không phải về mạng',
            x: 'Thông báo này chứng minh mạng <b>đang hoạt động tốt</b> — máy ảo đã hỏi được ' +
               'server và server đã trả lời. Nó chỉ nói: trong thư mục gốc TFTP không có file ' +
               'tên đó. Nếu mạng hỏng thật, bạn sẽ thấy một chuỗi <code>T</code> (timeout) kéo ' +
               'dài rồi <code>Retry count exceeded</code>. Hai triệu chứng khác nhau hoàn ' +
               'toàn, hai nguyên nhân khác nhau hoàn toàn.' },

          { t: 'p', x: 'Giờ tải thật. Hai file, hai địa chỉ khác nhau:' },

          { t: 'code', where: 'uboot', code:
            'tftpboot ${kernel_addr_r} Image\n' +
            'tftpboot ${ramdisk_addr_r} initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Using virtio-net#31 device\n' +
            'TFTP from server 10.0.2.2; our IP address is 10.0.2.15\n' +
            "Filename 'Image'.\n" +
            'Load address: 0x40400000\n' +
            'Loading: *#################################################################\n' +
            '\t 24.5 MiB/s\n' +
            'done\n' +
            'Bytes transferred = 30771136 (1d587c0 hex)\n' +
            '=> tftpboot ${ramdisk_addr_r} initramfs.cpio.gz\n' +
            'Using virtio-net#31 device\n' +
            'TFTP from server 10.0.2.2; our IP address is 10.0.2.15\n' +
            "Filename 'initramfs.cpio.gz'.\n" +
            'Load address: 0x44000000\n' +
            'Loading: *#################################################################\n' +
            '\t 21.5 MiB/s\n' +
            'done\n' +
            'Bytes transferred = 1035397 (fcc85 hex)' },

          { t: 'cmdx', title: 'tftpboot — ba thông tin trong một dòng', cmd: 'tftpboot ${kernel_addr_r} Image', rows: [
            ['<code>tftpboot</code>', 'Tải một file từ <code>serverip</code> qua TFTP vào RAM. Viết tắt được thành <code>tftp</code>.'],
            ['<code>${kernel_addr_r}</code>', 'Địa chỉ đích trong RAM. Trên máy này bằng <code>0x40400000</code> — U-Boot in ra thành <code>Load address:</code> để bạn đối chiếu. Đây là biến sẵn có, đã gặp ở Bài 35.'],
            ['<code>Image</code>', 'Tên file <b>tương đối với thư mục gốc TFTP</b> (<code>~/bai36/tftp</code>). Không có đường dẫn tuyệt đối, không đi ngược ra ngoài bằng <code>../</code> được.'],
            ['<code>Bytes transferred</code>', 'Con số này U-Boot đồng thời ghi vào biến <code>filesize</code> — chính là thứ ta sắp dùng cho tham số kích thước của <code>booti</code>.']
          ]},

          { t: 'cal', kind: 'info', title: 'Bytes transferred khớp chính xác với ls -l ở bước trước',
            x: '<b>30 771 136</b> và <b>1 035 397</b> — đúng bằng hai con số bạn đã thấy trong ' +
               '<code>ls -l tftp/</code> ở đầu bước này. Đây là bằng chứng cụ thể rằng TFTP đã ' +
               'chuyển đủ từng byte, không cắt xén giữa chừng: nếu đường truyền đứt gánh, U-Boot ' +
               'thường tự báo <code>TFTP error</code> hoặc treo ở dấu <code>*</code> trước khi ' +
               'kịp in dòng <code>done</code>, chứ hiếm khi âm thầm trả về một con số nhỏ hơn.' },

          { t: 'p', x: 'Và boot — y hệt Bài 35, chỉ khác là ba file đến từ mạng chứ không từ ổ đĩa:' },

          { t: 'code', where: 'uboot', code:
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr}' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Flattened Device Tree blob at 40000000\n' +
            '   Booting using the fdt blob at 0x40000000\n' +
            'Working FDT set to 40000000\n' +
            '   Loading Ramdisk to 5d429000, end 5d525c85 ... OK\n' +
            '   Loading Device Tree to 000000005d326000, end 000000005d428fff ... OK\n' +
            'Working FDT set to 5d326000\n' +
            '\n' +
            'Starting kernel ...\n' +
            '...\n' +
            "/bin/sh: can't access tty; job control turned off\n" +
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init' },

          { t: 'cal', kind: 'info', title: 'cat /proc/cmdline xác nhận đúng bootargs vừa đặt',
            x: 'Dòng in ra — <code>console=ttyAMA0 rdinit=/init</code> — giống hệt chuỗi bạn ' +
               'vừa gán bằng <code>setenv bootargs</code> ba lệnh trước. Đây là bằng chứng trực ' +
               'tiếp rằng U-Boot đã truyền đúng dòng lệnh cho kernel qua mạng, chứ không chỉ ' +
               'suy luận từ việc máy không báo lỗi gì. Bạn sẽ dùng lại đúng phép kiểm tra này ở ' +
               'các bước sau, mỗi khi đổi <code>bootargs</code>.' },

          { t: 'cal', kind: 'info', title: 'Vòng lặp phát triển vừa rút xuống còn vài giây',
            x: 'Đo được <b>24,5 MiB/s</b> cho kernel và <b>21,5 MiB/s</b> cho initramfs — ' +
               'tức khoảng <b>1,3 giây</b> cho toàn bộ 31 MB. Con số cụ thể trên máy bạn sẽ ' +
               'khác vì đây là mạng giả lập trong RAM, nhưng điều đáng nhớ là <i>quy trình</i>: ' +
               'từ giờ, sửa kernel xong bạn chỉ cần <code>cp Image ~/bai36/tftp/</code> rồi ' +
               'reset máy ảo. Không tháo thẻ, không chép tay, không có bước nào để quên.' }
        ]},

      /* ─────────────── Bước 3 ─────────────── */
      { title: 'Lấy device tree của máy ảo và viết kernel.its',
        blocks: [
          { t: 'p', x:
            'Đến đây bạn vẫn đang quản lý <b>ba</b> thứ rời rạc, và một trong ba thứ đó — ' +
            'device tree — cho tới giờ vẫn do QEMU tự nhét vào RAM ở <code>${fdt_addr}</code>. ' +
            'FIT thì phải chứa DTB <i>bên trong</i>, nên bạn cần một file <code>.dtb</code> ' +
            'thật. QEMU xuất được nó ra bằng <code>-machine dumpdtb</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai36\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -machine dumpdtb=virt.dtb\n' +
            'ls -l virt.dtb' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus 1048576 Aug 16 17:54 virt.dtb' },

          { t: 'cal', kind: 'info', title: 'Đúng 1 MiB, và đó là bình thường',
            x: 'QEMU cấp phát sẵn một vùng đệm 1 MiB cho device tree rồi ghi nguyên cả vùng đó ' +
               'ra file, nên <code>virt.dtb</code> luôn tròn <b>1 048 576 byte</b> dù nội dung ' +
               'thật chỉ vài chục KB. Phần thừa là số 0, hoàn toàn vô hại: cả U-Boot lẫn kernel ' +
               'đều đọc trường <code>totalsize</code> trong header <code>d00dfeed</code> ' +
               '(Bài 35) để biết dữ liệu thật dừng ở đâu. Cái giá duy nhất là FIT của bạn sẽ ' +
               'phình thêm 1 MB.' },

          { t: 'cal', kind: 'warn', title: 'Ghi nhớ dòng lệnh này — bước 5 sẽ chứng minh nó SAI',
            x: 'Dòng <code>dumpdtb</code> ở trên trông hoàn toàn hợp lý và là thứ bạn sẽ tìm ' +
               'thấy trong 9/10 bài blog. Hãy cứ chạy nó, vì bạn cần nhìn thấy hậu quả bằng ' +
               'mắt mình. Ở <b>bước 5</b> ta sẽ tìm ra nó thiếu cái gì và vì sao cái thiếu đó ' +
               'lại làm kernel chết ngay trong 0,3 giây đầu.' },

          { t: 'p', x:
            'Giờ mô tả cả ba thành phần trong một file <code>.its</code>. Nó là cú pháp ' +
            'device-tree source, nhưng đừng nhầm: file này <b>mô tả một ảnh boot</b>, không mô ' +
            'tả phần cứng. Tạo <code>~/bai36/kernel.its</code>:' },

          { t: 'code', where: 'file', name: '~/bai36/kernel.its', lang: 'dts', code:
            '/dts-v1/;\n' +
            '\n' +
            '/ {\n' +
            '\tdescription = "Course kernel + DTB + initramfs";\n' +
            '\t#address-cells = <1>;\n' +
            '\n' +
            '\timages {\n' +
            '\t\tkernel-1 {\n' +
            '\t\t\tdescription = "Linux kernel";\n' +
            '\t\t\tdata = /incbin/("tftp/Image");\n' +
            '\t\t\ttype = "kernel";\n' +
            '\t\t\tarch = "arm64";\n' +
            '\t\t\tos = "linux";\n' +
            '\t\t\tcompression = "none";\n' +
            '\t\t\tload = <0x40400000>;\n' +
            '\t\t\tentry = <0x40400000>;\n' +
            '\t\t\thash-1 {\n' +
            '\t\t\t\talgo = "sha256";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\n' +
            '\t\tfdt-1 {\n' +
            '\t\t\tdescription = "QEMU virt device tree";\n' +
            '\t\t\tdata = /incbin/("virt.dtb");\n' +
            '\t\t\ttype = "flat_dt";\n' +
            '\t\t\tarch = "arm64";\n' +
            '\t\t\tcompression = "none";\n' +
            '\t\t\thash-1 {\n' +
            '\t\t\t\talgo = "sha256";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\n' +
            '\t\tramdisk-1 {\n' +
            '\t\t\tdescription = "initramfs";\n' +
            '\t\t\tdata = /incbin/("tftp/initramfs.cpio.gz");\n' +
            '\t\t\ttype = "ramdisk";\n' +
            '\t\t\tarch = "arm64";\n' +
            '\t\t\tos = "linux";\n' +
            '\t\t\tcompression = "none";\n' +
            '\t\t\thash-1 {\n' +
            '\t\t\t\talgo = "sha256";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\t};\n' +
            '\n' +
            '\tconfigurations {\n' +
            '\t\tdefault = "conf-1";\n' +
            '\n' +
            '\t\tconf-1 {\n' +
            '\t\t\tdescription = "Linux + DTB + initramfs";\n' +
            '\t\t\tkernel = "kernel-1";\n' +
            '\t\t\tfdt = "fdt-1";\n' +
            '\t\t\tramdisk = "ramdisk-1";\n' +
            '\t\t};\n' +
            '\t};\n' +
            '};' },

          { t: 'table',
            head: ['Trường', 'Ý nghĩa', 'Sai thì sao'],
            rows: [
              ['<code>data = /incbin/("…")</code>', 'Nhúng nguyên nội dung file này vào ảnh. Đường dẫn tính từ <b>thư mục bạn chạy <code>mkimage</code></b>, không phải từ vị trí file <code>.its</code>.', '<code>mkimage</code> báo không mở được file và dừng ngay — lỗi này tự lộ.'],
              ['<code>type</code>', '<code>kernel</code> / <code>flat_dt</code> / <code>ramdisk</code>. Đây là cái U-Boot dựa vào để biết phải làm gì với từng khối.', 'U-Boot không tìm thấy thành phần nó cần và bỏ boot.'],
              ['<code>compression = "none"</code>', 'Nói rằng dữ liệu <i>trong ảnh</i> chưa nén. <code>initramfs.cpio.gz</code> tuy là gzip nhưng ta vẫn khai <code>none</code>: phần gzip đó do <b>kernel</b> tự bung, U-Boot không được đụng vào.', 'Khai <code>gzip</code> cho ramdisk thì U-Boot sẽ bung sẵn, kernel nhận được cpio thô và vẫn chạy — nhưng bạn mất một lớp nén vô ích và tốn RAM.'],
              ['<code>load</code> / <code>entry</code>', 'Địa chỉ U-Boot phải chép kernel tới, và địa chỉ nhảy vào. Với arm64 hai giá trị này bằng nhau và bằng <code>0x40400000</code>.', 'Trùng với chỗ đang chứa chính file FIT thì gặp lỗi ở bước 4.'],
              ['<code>hash-1 { algo }</code>', 'Yêu cầu <code>mkimage</code> tính SHA-256 của khối dữ liệu và ghi kết quả vào ảnh.', 'Bỏ đi thì ảnh vẫn boot được, nhưng bạn mất toàn bộ khả năng phát hiện hỏng hóc — tức mất lý do tồn tại của FIT.'],
              ['<code>configurations</code>', 'Một <i>cấu hình</i> là một <b>bộ ba đã ghép sẵn</b>: kernel nào + dtb nào + ramdisk nào. Đây chính là thứ giải quyết vấn đề "ba file rời rạc".', 'Thiếu <code>default</code> thì <code>bootm</code> không biết chọn cấu hình nào.']
            ]},

          { t: 'p', x: 'Build ảnh. <code>mkimage</code> in ra đúng những gì nó vừa đóng gói:' },

          { t: 'code', where: 'wsl', code: 'mkimage -f kernel.its tftp/kernel.itb' },

          { t: 'code', where: 'out', nocopy: true, code:
            'FIT description: Course kernel + DTB + initramfs\n' +
            'Created:         Sun Aug 16 17:57:14 2026\n' +
            ' Image 0 (kernel-1)\n' +
            '  Description:  Linux kernel\n' +
            '  Type:         Kernel Image\n' +
            '  Compression:  uncompressed\n' +
            '  Data Size:    30771136 Bytes = 30049.94 KiB = 29.35 MiB\n' +
            '  Architecture: AArch64\n' +
            '  OS:           Linux\n' +
            '  Load Address: 0x40400000\n' +
            '  Entry Point:  0x40400000\n' +
            '  Hash algo:    sha256\n' +
            '  Hash value:   dce5033377095c9be9f7066187e166f3754ccead4ac1f0de1ef0d87a37335a40\n' +
            ' Image 1 (fdt-1)\n' +
            '  Description:  QEMU virt device tree\n' +
            '  Type:         Flat Device Tree\n' +
            '  Data Size:    1048576 Bytes = 1024.00 KiB = 1.00 MiB\n' +
            '  Hash algo:    sha256\n' +
            '  Hash value:   133e346a119debb91049c083435587ec6087ba4abe87fe5c231da580981a0514\n' +
            ' Image 2 (ramdisk-1)\n' +
            '  Description:  initramfs\n' +
            '  Type:         RAMDisk Image\n' +
            '  Data Size:    1035397 Bytes = 1011.13 KiB = 0.99 MiB\n' +
            '  Hash algo:    sha256\n' +
            '  Hash value:   470a91428509d99869578dd7aa01c1be84638fbb65b68c9f4725feec3a0ca701\n' +
            " Default Configuration: 'conf-1'\n" +
            ' Configuration 0 (conf-1)\n' +
            '  Description:  Linux + DTB + initramfs\n' +
            '  Kernel:       kernel-1\n' +
            '  Init Ramdisk: ramdisk-1\n' +
            '  FDT:          fdt-1',
            notes: ['Đã lược vài dòng <code>Created:</code> lặp lại của từng thành phần cho gọn.'] },

          { t: 'p', x:
            'Ba giá trị <code>Hash value</code> đó không phải thứ gì bí ẩn — chúng đúng bằng ' +
            'SHA-256 của ba file gốc. Tự kiểm chứng:' },

          { t: 'code', where: 'wsl', code: 'sha256sum tftp/Image virt.dtb tftp/initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'dce5033377095c9be9f7066187e166f3754ccead4ac1f0de1ef0d87a37335a40  tftp/Image\n' +
            '133e346a119debb91049c083435587ec6087ba4abe87fe5c231da580981a0514  virt.dtb\n' +
            '470a91428509d99869578dd7aa01c1be84638fbb65b68c9f4725feec3a0ca701  tftp/initramfs.cpio.gz' },

          { t: 'cal', kind: 'warn', title: 'Hash của DTB trên máy bạn sẽ KHÁC',
            x: 'Hai giá trị đầu và cuối bạn sẽ thấy giống hệt ở đây, vì <code>Image</code> và ' +
               '<code>initramfs.cpio.gz</code> là hai file cố định từ Bài 32. Nhưng hash của ' +
               '<code>virt.dtb</code> thì <b>khác nhau ở mỗi lần dump</b>: QEMU nhét vào ' +
               'device tree hai trường ngẫu nhiên là <code>rng-seed</code> và ' +
               '<code>kaslr-seed</code> để kernel có nguồn ngẫu nhiên lúc khởi động. Điều này ' +
               'quan trọng khi bạn dựng CI: <b>dump DTB không tái lập được</b>, nên đừng bao ' +
               'giờ so hash của ảnh FIT giữa hai lần build để kết luận "build sạch".' },

          { t: 'cal', kind: 'why', title: 'Vì sao hash phải nằm trong ảnh chứ không nằm cạnh ảnh',
            x: 'Bạn hoàn toàn có thể để một file <code>Image.sha256</code> bên cạnh. Nhưng lúc ' +
               'đó lại thành <b>hai</b> file phải đi cùng nhau, và ta quay về đúng bài toán ban ' +
               'đầu. FIT gói hash <i>vào trong</i>, nên chỉ còn <b>một</b> thứ để chép, một thứ ' +
               'để đặt tên phiên bản, một thứ để đưa lên máy chủ cập nhật. Số lượng file mà một ' +
               'con người phải giữ đồng bộ chính là số lượng cơ hội để sai.' }
        ]},

      /* ─────────────── Bước 4 ─────────────── */
      { title: 'bootm lần đầu — và cái bẫy địa chỉ nạp',
        blocks: [
          { t: 'p', x:
            'Chép <code>kernel.itb</code> đã có sẵn trong <code>tftp/</code>, nên khởi động lại ' +
            'máy ảo bằng đúng dòng lệnh ở bước 1 rồi tải nó về như mọi file khác. Lần này ta ' +
            'cố tình nạp vào <code>${kernel_addr_r}</code> — địa chỉ "hiển nhiên" nhất:' },

          { t: 'code', where: 'uboot', code:
            'setenv autoload no\n' +
            'dhcp\n' +
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'tftpboot ${kernel_addr_r} kernel.itb' },

          { t: 'code', where: 'out', nocopy: true, code:
            "Filename 'kernel.itb'.\n" +
            'Load address: 0x40400000\n' +
            'Loading: *#################################################################\n' +
            '\t ...\n' +
            '\t 24.5 MiB/s\n' +
            'done\n' +
            'Bytes transferred = 32856448 (1f55980 hex)' },

          { t: 'cal', kind: 'info', title: '32 856 448 byte — cộng đúng phần thừa bạn dự đoán được',
            x: 'Ba thành phần cộng lại là 30 771 136 + 1 048 576 + 1 035 397 = ' +
               '<b>32 855 109</b> byte. Ảnh nặng <b>32 856 448</b>, tức phần "vỏ" — cây device ' +
               'tree mô tả cấu trúc, các chuỗi mô tả, ba giá trị hash — chỉ tốn <b>1 339 ' +
               'byte</b>, khoảng <b>0,004 %</b>. FIT gần như không có chi phí về dung lượng.' },

          { t: 'p', x:
            'Trước khi boot, hãy dùng <code>iminfo</code> — lệnh bạn đã gặp ở Bài 35 khi nó từ ' +
            'chối một <code>Image</code> thô. Lần này nó có thứ để đọc, và nó đọc được cả ba ' +
            'thành phần lẫn cấu hình:' },

          { t: 'code', where: 'uboot', code: 'iminfo ${kernel_addr_r}' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Checking Image at 40400000 ...\n' +
            '   FIT image found\n' +
            '   FIT description: Course kernel + DTB + initramfs\n' +
            '   Created:         2026-08-16  10:57:14 UTC\n' +
            '    Image 0 (kernel-1)\n' +
            '     Data Start:   0x404000d0\n' +
            '     Data Size:    30771136 Bytes = 29.3 MiB\n' +
            '     Load Address: 0x40400000\n' +
            '     Hash value:   dce5033377095c9be9f7066187e166f3754ccead4ac1f0de1ef0d87a37335a40\n' +
            '    Image 1 (fdt-1)\n' +
            '     Data Start:   0x42158990\n' +
            '    Image 2 (ramdisk-1)\n' +
            '     Data Start:   0x42258a54\n' +
            "    Default Configuration: 'conf-1'\n" +
            '## Checking hash(es) for FIT Image at 40400000 ...\n' +
            '   Hash(es) for Image 0 (kernel-1): sha256+\n' +
            '   Hash(es) for Image 1 (fdt-1): sha256+\n' +
            '   Hash(es) for Image 2 (ramdisk-1): sha256+',
            notes: ['Đã lược bớt các dòng mô tả trùng với output của <code>mkimage</code> ở bước 3.'] },

          { t: 'cal', kind: 'tip', title: 'Dấu + là "đã kiểm tra và khớp"',
            x: '<code>sha256+</code> — dấu cộng phía sau nghĩa là U-Boot đã tính lại hash và ' +
               'nó trùng với giá trị ghi trong ảnh. Ở bước 7 bạn sẽ nhìn thấy phiên bản không ' +
               'có dấu cộng, và đó là toàn bộ sự khác nhau giữa "boot" và "không boot".' },

          { t: 'p', x:
            'Chú ý con số <code>Data Start: 0x404000d0</code>. Dữ liệu kernel nằm ở đó, còn ' +
            '<code>Load Address</code> lại là <code>0x40400000</code> — U-Boot sắp phải chép ' +
            '30 MB từ chỗ này sang chỗ kia, mà hai vùng chồng lên nhau. Nó phát hiện ra:' },

          { t: 'code', where: 'uboot', code: 'bootm ${kernel_addr_r}' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 40400000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... OK\n' +
            "   Trying 'kernel-1' kernel subimage\n" +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '...\n' +
            '   Booting using the fdt blob at 0x42158990\n' +
            '   Loading Kernel Image to 40400000\n' +
            'ERROR: new format image overwritten - must RESET the board to recover\n' +
            'Resetting the board...' },

          { t: 'cal', kind: 'danger', title: 'new format image overwritten — lỗi #1 của người mới dùng FIT',
            x: 'Bạn nạp file FIT vào <code>0x40400000</code>, và bên trong file đó, kernel khai ' +
               '<code>load = &lt;0x40400000&gt;</code>. Để boot, U-Boot phải chép khối kernel ' +
               'ra đúng địa chỉ ấy — tức <b>ghi đè lên chính cái ảnh nó đang đọc dở</b>. Nó ' +
               'phát hiện được điều đó và tự reset board thay vì chạy tiếp với dữ liệu rác. ' +
               'Quy tắc để nhớ: <b>địa chỉ nạp FIT và địa chỉ <code>load</code> bên trong FIT ' +
               'phải cách xa nhau</b>. Với <code>booti</code> ở Bài 35 vấn đề này không tồn ' +
               'tại, vì file thô được boot ngay tại chỗ, không phải chép đi đâu cả.' },

          { t: 'p', x:
            'Cách sửa: nạp FIT vào một địa chỉ trống khác. Máy này có 512 MB RAM trải từ ' +
            '<code>0x40000000</code>, kernel chiếm tới khoảng <code>0x421d87c0</code>, nên ' +
            '<code>0x44000000</code> là chỗ an toàn và vẫn còn dư hơn 400 MB phía sau. Khởi ' +
            'động lại máy ảo và làm lại:' },

          { t: 'code', where: 'uboot', code:
            'setenv autoload no\n' +
            'dhcp\n' +
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'tftpboot 0x44000000 kernel.itb\n' +
            'bootm 0x44000000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 44000000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... OK\n' +
            "   Trying 'kernel-1' kernel subimage\n" +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading ramdisk (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading fdt (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '   Booting using the fdt blob at 0x45d58990\n' +
            'Working FDT set to 45d58990\n' +
            '   Loading Kernel Image to 40400000\n' +
            '   Loading Ramdisk to 5d429000, end 5d525c85 ... OK\n' +
            '   Loading Device Tree to 000000005d326000, end 000000005d428fff ... OK\n' +
            'Working FDT set to 5d326000\n' +
            '\n' +
            'Starting kernel ...\n' +
            '\n' +
            '_' },

          { t: 'cal', kind: 'danger', title: 'Và đây là lỗi #2: im lặng tuyệt đối',
            x: 'Cả ba hash đều <code>OK</code>. U-Boot chép đủ ba thành phần, in ' +
               '<code>Starting kernel ...</code> — rồi <b>không có gì nữa</b>. Không panic, ' +
               'không stack trace, không một ký tự. Máy treo cho tới khi bạn giết QEMU. ' +
               'Đây là kiểu lỗi khó chịu nhất trong toàn bộ nghề embedded, và bước tiếp theo ' +
               'dành trọn cho việc bắt nó phải lên tiếng.' }
        ]},

      /* ─────────────── Bước 5 ─────────────── */
      { title: 'Chẩn đoán: bắt một kernel câm phải nói',
        blocks: [
          { t: 'p', x:
            'Trước khi đoán bất cứ điều gì, hãy hỏi: <i>vì sao kernel im lặng?</i> Kernel chỉ ' +
            'in được ra <code>console=ttyAMA0</code> <b>sau khi</b> nó đã khởi tạo xong driver ' +
            'UART — mà việc đó xảy ra khá muộn, sau khi nó đã đọc và duyệt device tree. Nếu ' +
            'kernel chết <i>trước</i> mốc đó thì nó chết trong bóng tối. Linux có sẵn thuốc ' +
            'giải: tham số <code>earlycon</code> bảo nó dùng một driver UART tối giản ngay từ ' +
            'dòng đầu tiên.' },

          { t: 'code', where: 'uboot', code:
            'setenv bootargs "console=ttyAMA0 rdinit=/init earlycon=pl011,0x9000000"\n' +
            'tftpboot 0x44000000 kernel.itb\n' +
            'bootm 0x44000000' },

          { t: 'cmdx', title: 'earlycon — cái đèn pin của người debug kernel', cmd: 'earlycon=pl011,0x9000000', rows: [
            ['<code>earlycon</code>', 'Bật console siêu sớm: kernel ghi thẳng ra thanh ghi UART, không cần driver, không cần device tree, hoạt động từ hàm khởi động đầu tiên.'],
            ['<code>pl011</code>', 'Loại UART. Máy <code>virt</code> của QEMU dùng ARM PrimeCell PL011 — chính là con <code>ttyAMA0</code> bạn vẫn dùng.'],
            ['<code>0x9000000</code>', 'Địa chỉ vật lý của thanh ghi UART. Bạn <b>không cần thuộc</b> con số này: nó nằm trong device tree, xem bằng <code>fdt print /pl011@9000000</code> ở dấu nhắc U-Boot, hoặc <code>dtc -I dtb -O dts virt.dtb</code> trên máy host.'],
            ['<i>tại sao phải chỉ tay</i>', 'Vì <code>earlycon</code> chạy <i>trước</i> khi device tree được duyệt, nên nó không thể tự tra ra địa chỉ. Đó vừa là điểm yếu vừa là điểm mạnh: nó vẫn nói được ngay cả khi device tree sai bét — mà đó đúng là tình huống của ta.']
          ]},

          { t: 'p', x: 'Lần này kernel nói. Và nó nói ra một cú sập:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Starting kernel ...\n' +
            '\n' +
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[    0.000000] Linux version 6.12.94+deb13-cloud-arm64 ...\n' +
            '[    0.000000] Machine model: linux,dummy-virt\n' +
            "[    0.000000] earlycon: pl11 at MMIO 0x0000000009000000 (options '')\n" +
            '[    0.000000] printk: legacy bootconsole [pl11] enabled\n' +
            '...\n' +
            '[    0.264476] Serial: AMBA PL011 UART driver\n' +
            '[    0.291689] Internal error: synchronous external abort: 0000000096000010 [#1] SMP\n' +
            '[    0.293168] CPU: 0 UID: 0 PID: 1 Comm: swapper/0 Tainted: G   M               6.12.94+deb13-cloud-arm64 #1\n' +
            '[    0.293657] Hardware name: linux,dummy-virt (DT)\n' +
            '[    0.294075] pc : amba_read_periphid+0x130/0x2c0\n' +
            '[    0.294730] lr : amba_read_periphid+0x11c/0x2c0\n' +
            '[    0.296022] x11: ffff80008002dfff x10: ffff80008002dfff x9 : 0000000009031000\n' +
            '[    0.296745] Call trace:\n' +
            '[    0.296814]  amba_read_periphid+0x130/0x2c0\n' +
            '[    0.297021]  amba_device_add+0x9c/0xd0\n' +
            '[    0.297133]  of_platform_bus_create+0x350/0x4b8\n' +
            '[    0.297233]  of_platform_populate+0x60/0x160\n' +
            '[    0.297435]  do_one_initcall+0x60/0x298\n' +
            '[    0.297518]  kernel_init_freeable+0x280/0x2f0\n' +
            '[    0.298975] Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b' },

          { t: 'p', x:
            'Đọc dấu vết này từ dưới lên, và nó kể một câu chuyện rất rõ ràng:' },

          { t: 'table',
            head: ['Dòng', 'Nó nói gì'],
            rows: [
              ['<code>of_platform_populate</code>', 'Kernel đang <b>duyệt device tree</b> và tạo thiết bị cho từng node nó tìm thấy.'],
              ['<code>amba_device_add</code>', 'Node đang xử lý khai <code>compatible = "arm,primecell"</code>, nên kernel coi đó là một thiết bị AMBA.'],
              ['<code>amba_read_periphid</code>', 'Với thiết bị AMBA, kernel phải <b>đọc thanh ghi ID</b> để biết đó là chip gì. Tức là nó chạm vào phần cứng thật.'],
              ['<code>x9 : 0000000009031000</code>', '<b>Đây là manh mối quyết định.</b> Địa chỉ nó vừa chạm vào là <code>0x9031000</code> — nằm trong vùng <code>0x9030000</code>.'],
              ['<code>synchronous external abort</code>', 'Không có gì trả lời tại địa chỉ đó. Kernel đọc vào <b>khoảng không</b>.'],
              ['<code>Attempted to kill init!</code>', 'Cú sập xảy ra trong PID 1, mà PID 1 chết thì kernel panic. Đây là <i>hậu quả</i>, không phải nguyên nhân — đừng đi tìm lỗi ở initramfs.']
            ]},

          { t: 'cal', kind: 'why', title: 'Kỹ năng chuyển giao: đọc oops là đọc từ dưới lên',
            x: 'Dòng cuối cùng (<code>Kernel panic</code>) hầu như không bao giờ là nguyên ' +
               'nhân. Nguyên nhân nằm ở <b>hàm sâu nhất trong call trace</b> cộng với ' +
               '<b>giá trị thanh ghi</b> mà nó vừa chạm vào. Ở đây, ' +
               '<code>amba_read_periphid</code> + <code>0x9031000</code> đã trả lời gọn toàn bộ ' +
               'câu hỏi: <i>device tree đang mô tả một thiết bị AMBA ở địa chỉ 0x9030000 mà máy ' +
               'này không có</i>. Cùng một cách đọc dùng được cho mọi oops bạn sẽ gặp trong ' +
               'Chặng 07 và sau này.' },

          { t: 'p', x:
            'Hãy xác nhận nghi ngờ đó thay vì tin nó. U-Boot có sẵn nhóm lệnh <code>fdt</code> ' +
            'để tra cây device tree đang chạy. <code>${fdtcontroladdr}</code> là biến U-Boot tự ' +
            'đặt, trỏ tới device tree <b>mà chính nó nhận được từ QEMU</b> — tức mô tả thật của ' +
            'máy này:' },

          { t: 'code', where: 'uboot', code:
            'fdt addr ${fdtcontroladdr}\n' +
            'fdt print /pl061@9030000\n' +
            'fdt print / compatible' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> fdt addr ${fdtcontroladdr}\n' +
            'Working FDT set to 5e54fd80\n' +
            '=> fdt print /pl061@9030000\n' +
            'libfdt fdt_path_offset() returned FDT_ERR_NOTFOUND\n' +
            '=> fdt print / compatible\n' +
            'compatible = "linux,dummy-virt"' },

          { t: 'cal', kind: 'info', title: 'Kết luận: DTB trong FIT mô tả một máy khác',
            x: 'Máy đang chạy <b>không có</b> node <code>pl061@9030000</code> — U-Boot khẳng ' +
               'định thế. Nhưng <code>virt.dtb</code> bạn nhét vào FIT thì <b>có</b>. Kernel ' +
               'tin device tree, đi chạm vào phần cứng không tồn tại, và chết. Câu hỏi còn lại ' +
               'là: cùng một máy <code>-M virt</code>, vì sao hai lần lại ra hai cây khác nhau?' }
        ]},

      /* ─────────────── Bước 6 ─────────────── */
      { title: 'Dump lại device tree bằng ĐÚNG dòng lệnh sẽ boot',
        blocks: [
          { t: 'p', x:
            'Câu trả lời nằm ở chỗ <code>-M virt</code> <b>không phải một máy cố định</b>. Nó ' +
            'là một máy do QEMU <i>lắp ráp lúc chạy</i>, và thành phần của nó phụ thuộc vào ' +
            'toàn bộ dòng lệnh. Lần dump ở bước 3 thiếu <code>-bios</code> và thiếu cả phần ' +
            'mạng, nên QEMU đã lắp một máy khác. Dump lại, lần này giữ nguyên <b>từng tuỳ chọn ' +
            'một</b> của dòng lệnh boot, chỉ thêm <code>dumpdtb</code> vào cuối:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios ~/bai34/u-boot/u-boot.bin \\\n' +
            '  -netdev user,id=net0,tftp=$HOME/bai36/tftp \\\n' +
            '  -device virtio-net-device,netdev=net0 \\\n' +
            '  -machine dumpdtb=virt-bios.dtb' },

          { t: 'p', x: 'So hai cây bằng <code>dtc</code>, chuyển ngược từ nhị phân về dạng đọc được:' },

          { t: 'code', where: 'wsl', code:
            'dtc -I dtb -O dts -o virt.dts      virt.dtb      2>/dev/null\n' +
            'dtc -I dtb -O dts -o virt-bios.dts virt-bios.dtb 2>/dev/null\n' +
            'wc -l virt.dts virt-bios.dts\n' +
            'grep -c "pl061@" virt.dts virt-bios.dts\n' +
            'diff virt-bios.dts virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  393 virt.dts\n' +
            '  372 virt-bios.dts\n' +
            '  765 total\n' +
            'virt.dts:1\n' +
            'virt-bios.dts:0\n' +
            '...\n' +
            '> \tgpio-keys {\n' +
            '> \t\tcompatible = "gpio-keys";\n' +
            '> \t\tpoweroff {\n' +
            '> \t\t\tgpios = <0x8004 0x03 0x00>;\n' +
            '> \t\t\tlinux,code = <0x74>;\n' +
            '> \t\t\tlabel = "GPIO Key Poweroff";\n' +
            '> \t\t};\n' +
            '> \t};\n' +
            '> \tpl061@9030000 {\n' +
            '> \t\tphandle = <0x8004>;\n' +
            '> \t\tclock-names = "apb_pclk";\n' +
            '> \t\tinterrupts = <0x00 0x07 0x04>;\n' +
            '> \t\tgpio-controller;\n' +
            '> \t\tcompatible = "arm,pl061", "arm,primecell";\n' +
            '> \t\treg = <0x00 0x9030000 0x00 0x1000>;\n' +
            '> \t};' },

          { t: 'cal', kind: 'danger', title: 'Đây là cái bẫy đắt nhất của cả bài',
            x: 'Bản dump "ngây thơ" <b>thừa 21 dòng</b>, và trong đó có node ' +
               '<code>pl061@9030000</code> — con GPIO controller mà QEMU chỉ lắp vào khi nó ' +
               'nghĩ rằng nó phải tự lo phần firmware. Có <code>-bios u-boot.bin</code> thì ' +
               'QEMU biết đã có firmware riêng và bỏ con GPIO ấy đi. Kết quả: một cây device ' +
               'tree <i>trông rất đúng</i>, <code>dtc</code> phân tích được, <code>mkimage</code> ' +
               'đóng gói được, hash khớp hoàn hảo — nhưng mô tả một cái máy không tồn tại. ' +
               '<b>Quy tắc: dump DTB bằng đúng dòng lệnh sẽ boot, khác một tuỳ chọn cũng là ' +
               'khác máy.</b>' },

          { t: 'cal', kind: 'why', title: 'Vì sao hash không cứu được bạn ở đây',
            x: 'Hãy để ý điều này thật kỹ, vì nó là bài học lớn nhất của bài: ' +
               '<code>Verifying Hash Integrity ... sha256+ OK</code> ở bước 4 <b>hoàn toàn ' +
               'trung thực</b>. Hash trả lời câu hỏi <i>"file này có đúng là file tôi đã đóng ' +
               'gói không?"</i> — và câu trả lời là có. Nó không bao giờ trả lời câu hỏi ' +
               '<i>"file tôi đóng gói có đúng không?"</i>. Rác đúng chuẩn vẫn là rác. Hash và ' +
               'chữ ký bảo vệ <b>tính toàn vẹn</b>, không bảo vệ <b>tính đúng đắn</b>.' },

          { t: 'p', x: 'Sửa một dòng trong <code>kernel.its</code> rồi build lại:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'s|/incbin/("virt.dtb")|/incbin/("virt-bios.dtb")|\' kernel.its\n' +
            'grep -n incbin kernel.its\n' +
            'mkimage -f kernel.its tftp/kernel.itb > /dev/null\n' +
            'sha256sum virt-bios.dtb' },

          { t: 'code', where: 'out', nocopy: true, code:
            '10:\t\t\tdata = /incbin/("tftp/Image");\n' +
            '24:\t\t\tdata = /incbin/("virt-bios.dtb");\n' +
            '35:\t\t\tdata = /incbin/("tftp/initramfs.cpio.gz");\n' +
            '9a360d9cae41351a235019ad34a64a930293b04c9dcef0da0443d8492a026b32  virt-bios.dtb' },

          { t: 'cal', kind: 'info', title: 'grep -n xác nhận sed chỉ sửa đúng một dòng',
            x: 'Ba dòng <code>grep -n</code> in ra cho thấy dòng 10 (<code>tftp/Image</code>) và ' +
               'dòng 35 (<code>tftp/initramfs.cpio.gz</code>) không đổi, chỉ dòng 24 chuyển từ ' +
               '<code>virt.dtb</code> sang <code>virt-bios.dtb</code> — đúng và chỉ đúng phần ' +
               'bạn định sửa. Lệnh <code>mkimage</code> ngay phía trên bị chuyển hướng ra ' +
               '<code>/dev/null</code> nên không in lại bảng hash như ở bước 3; giá trị ' +
               '<code>sha256sum</code> của <code>virt-bios.dtb</code> — bắt đầu bằng ' +
               '<code>9a360d9c…</code> — là cách duy nhất ở đây để bạn tự có bằng chứng về nội ' +
               'dung DTB mới trước khi đưa nó vào FIT và boot thử.' },

          { t: 'p', x: 'Khởi động lại máy ảo và boot ảnh mới. Lần này không cần <code>earlycon</code> nữa:' },

          { t: 'code', where: 'uboot', code:
            'setenv autoload no\n' +
            'dhcp\n' +
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'tftpboot 0x44000000 kernel.itb\n' +
            'bootm 0x44000000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading ramdisk (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading fdt (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '   Booting using the fdt blob at 0x45d58990\n' +
            '   Loading Kernel Image to 40400000\n' +
            '   Loading Ramdisk to 5d429000, end 5d525c85 ... OK\n' +
            '   Loading Device Tree to 000000005d326000, end 000000005d428fff ... OK\n' +
            '\n' +
            'Starting kernel ...\n' +
            '...\n' +
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init\n' +
            '~ # uname -r\n' +
            '6.12.94+deb13-cloud-arm64\n' +
            '~ # ls /sys/firmware/devicetree/base | head -5\n' +
            '#address-cells\n' +
            '#size-cells\n' +
            'aliases\n' +
            'apb-pclk\n' +
            'chosen' },

          { t: 'cal', kind: 'info', title: 'Một file, ba thành phần, boot xong',
            x: '<code>/sys/firmware/devicetree/base</code> là cây device tree mà kernel đang ' +
               'dùng, do kernel dựng lại từ đúng cái DTB nằm trong FIT. Đây là cách nhanh nhất ' +
               'để trả lời "kernel đã nhận đúng device tree chưa" ngay từ trong userspace — ' +
               'không cần thêm công cụ gì. Bạn sẽ dùng lại nó rất nhiều ở <b>Chặng 07</b>.' }
        ]},

      /* ─────────────── Bước 7 ─────────────── */
      { title: 'Lật đúng một byte và nhìn U-Boot bắt được',
        blocks: [
          { t: 'p', x:
            'Đến giờ hash mới chỉ toàn báo <code>OK</code>, và một cơ chế an toàn chưa bao giờ ' +
            'thấy nó nói "không" thì chưa đáng tin. Hãy chép ảnh ra một bản và phá đúng ' +
            '<b>một byte</b> giữa vùng dữ liệu kernel — 1 byte trên 32 856 448 byte, tức ' +
            '<b>0,000003 %</b> của file:' },

          { t: 'code', where: 'wsl', code:
            'cp tftp/kernel.itb tftp/kernel-bad.itb\n' +
            'od -A d -t x1 -j 5000000 -N 1 tftp/kernel-bad.itb\n' +
            "printf '\\xff' | dd of=tftp/kernel-bad.itb bs=1 seek=5000000 count=1 conv=notrunc status=none\n" +
            'od -A d -t x1 -j 5000000 -N 1 tftp/kernel-bad.itb\n' +
            'cmp tftp/kernel.itb tftp/kernel-bad.itb\n' +
            'ls -l tftp/kernel.itb tftp/kernel-bad.itb' },

          { t: 'cmdx', title: 'od — nhìn đúng một byte trong một file 31 MB', cmd: 'od -A d -t x1 -j 5000000 -N 1 tftp/kernel-bad.itb', rows: [
            ['<code>-A d</code>', 'In địa chỉ offset theo hệ <b>thập phân</b> (decimal). Mặc định <code>od</code> in offset theo octal — đổi sang decimal để khớp thẳng với con số <code>seek=</code> bạn gõ ở <code>dd</code>, khỏi phải quy đổi hệ cơ số trong đầu.'],
            ['<code>-t x1</code>', 'Định dạng mỗi đơn vị là <b>1 byte, in hex</b> (hai chữ số). Không có nó, <code>od</code> mặc định gộp 2 byte một đơn vị — dễ đọc nhầm byte khi so trước/sau.'],
            ['<code>-j 5000000</code>', '<i>skip</i> — bỏ qua 5 000 000 byte đầu trước khi đọc. Cùng một con số với <code>seek=</code> của <code>dd</code> bên dưới, để bạn soi đúng byte sắp bị ghi đè.'],
            ['<code>-N 1</code>', '<i>read-bytes</i> — chỉ đọc đúng 1 byte rồi dừng, thay vì đổ cả file ra màn hình.']
          ]},

          { t: 'cmdx', title: 'dd — ghi đè đúng một byte, không đụng gì khác', cmd: 'dd of=… bs=1 seek=5000000 count=1 conv=notrunc', rows: [
            ['<code>bs=1</code>', 'Kích thước một khối là 1 byte, để <code>seek</code> và <code>count</code> đếm theo byte thay vì theo khối.'],
            ['<code>seek=5000000</code>', 'Nhảy tới byte thứ 5 000 000 của <b>file đích</b> rồi mới bắt đầu ghi. (<code>skip=</code> mới là nhảy trong file nguồn — nhầm hai cái này là lỗi kinh điển.)'],
            ['<code>count=1</code>', 'Ghi đúng một khối, tức một byte.'],
            ['<code>conv=notrunc</code>', '<b>Bắt buộc.</b> Không có nó, <code>dd</code> cắt cụt file đích còn đúng phần vừa ghi — bạn sẽ được một file 5 000 001 byte thay vì một ảnh 32 MB bị sửa một byte.'],
            ['<code>status=none</code>', 'Bỏ ba dòng thống kê <code>dd</code> vẫn in ra stderr, cho output sạch.']
          ]},

          { t: 'code', where: 'out', nocopy: true, code:
            '5000000 e1\n' +
            '5000001\n' +
            '5000000 ff\n' +
            '5000001\n' +
            'tftp/kernel.itb tftp/kernel-bad.itb differ: byte 5000001, line 11860\n' +
            '-rw-r--r-- 1 shinarus shinarus 32856448 Aug 16 18:09 tftp/kernel-bad.itb\n' +
            '-rw-r--r-- 1 shinarus shinarus 32856448 Aug 16 18:06 tftp/kernel.itb' },

          { t: 'cal', kind: 'info', title: 'Kích thước không đổi, chỉ một byte đổi từ e1 thành ff',
            x: 'Hai file vẫn <b>32 856 448 byte</b> như nhau; <code>cmp</code> phải soi từng ' +
               'byte mới tìm ra khác biệt ở byte thứ 5 000 001 (<code>cmp</code> đếm từ 1, ' +
               '<code>dd</code> và <code>od</code> đếm từ 0 — cùng một chỗ). Không một thao tác ' +
               'kiểm tra thông thường nào — kích thước, tên file, ngày tháng — phát hiện được ' +
               'chuyện này.' },

          { t: 'p', x: 'Nạp bản hỏng vào máy ảo và boot thử:' },

          { t: 'code', where: 'uboot', code:
            'tftpboot 0x44000000 kernel-bad.itb\n' +
            'bootm 0x44000000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 44000000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... OK\n' +
            "   Trying 'kernel-1' kernel subimage\n" +
            '     Hash value:   dce5033377095c9be9f7066187e166f3754ccead4ac1f0de1ef0d87a37335a40\n' +
            '   Verifying Hash Integrity ... sha256 error!\n' +
            "Bad hash value for 'hash-1' hash node in 'kernel-1' image node\n" +
            'Bad Data Hash\n' +
            "ERROR -2: can't get kernel image!" },

          { t: 'cal', kind: 'why', title: 'Bốn dòng, đọc từ trên xuống là bốn tầng nguyên nhân',
            x: '<code>sha256 error!</code> — hash tính lại không khớp (chú ý: <b>không</b> có ' +
               'dấu <code>+</code>). <code>Bad hash value for &#39;hash-1&#39;…</code> — chỉ ' +
               'đích danh node nào hỏng, nên với ảnh nhiều kernel bạn biết ngay cái nào. ' +
               '<code>Bad Data Hash</code> — kết luận của tầng kiểm tra. ' +
               '<code>ERROR -2: can&#39;t get kernel image!</code> — <code>bootm</code> bỏ ' +
               'cuộc. Điều quan trọng nhất: U-Boot dừng <b>trước khi</b> nhảy vào kernel. So ' +
               'với Bài 35, nơi một <code>Image</code> thô hỏng sẽ được nhảy vào và máy chết ' +
               'câm, đây là khác biệt sống còn.' },

          { t: 'cal', kind: 'tip', title: 'Nhớ theo cặp triệu chứng → nguyên nhân',
            x: 'Trong đời làm nghề bạn sẽ gặp <code>Bad Data Hash</code> nhiều hơn bạn tưởng, ' +
               'và gần như luôn vì <b>một</b> trong ba lý do: ảnh tải về dở dang (đứt mạng, ' +
               'thẻ SD lỗi), ảnh bị sửa sau khi build (kể cả bởi chính script deploy của bạn), ' +
               'hoặc bạn build ảnh mới mà quên copy sang server. Cách kiểm tra đầu tiên luôn ' +
               'là <code>sha256sum</code> file trên máy build và so với ' +
               '<code>Bytes transferred</code> + <code>Hash value</code> mà U-Boot in ra.' }
        ]},

      /* ─────────────── Bước 8 ─────────────── */
      { title: 'Ký ảnh bằng RSA-2048 và bắt U-Boot từ chối ảnh không ký',
        blocks: [
          { t: 'p', x:
            'Bước 7 chứng minh U-Boot phát hiện được <i>hỏng</i>. Nhưng kẻ tấn công không làm ' +
            'hỏng ảnh — họ thay ảnh <b>và tính lại hash cho khớp</b>. Chống lại việc đó cần một ' +
            'thứ họ không có: khoá bí mật. Tạo một cặp khoá phát triển:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai36/keys\n' +
            'cd ~/bai36\n' +
            'openssl genpkey -algorithm RSA -out keys/dev.key -pkeyopt rsa_keygen_bits:2048\n' +
            'openssl req -batch -new -x509 -key keys/dev.key -out keys/dev.crt \\\n' +
            '  -subj "/CN=course dev key"\n' +
            'ls -l keys/' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 8\n' +
            '-rw-r--r-- 1 shinarus shinarus 1127 Aug 16 18:12 dev.crt\n' +
            '-rw------- 1 shinarus shinarus 1704 Aug 16 18:12 dev.key' },

          { t: 'cal', kind: 'danger', title: 'Chú ý quyền của hai file — chúng không giống nhau',
            x: '<code>dev.key</code> là <code>-rw-------</code> (chỉ chủ sở hữu đọc được), ' +
               '<code>dev.crt</code> là <code>-rw-r--r--</code> (ai đọc cũng được). Đó không ' +
               'phải ngẫu nhiên: <code>.key</code> là khoá <b>bí mật</b>, ai có nó thì ký được ' +
               'firmware mà thiết bị của bạn sẽ tin tưởng tuyệt đối. Trong sản xuất thật, file ' +
               'này <b>không nằm trên máy lập trình viên</b> — nó nằm trong HSM hoặc một máy ' +
               'build cách ly, và mất nó đồng nghĩa với việc phải thu hồi toàn bộ thiết bị đã ' +
               'bán. Khoá trong bài này là khoá đồ chơi, đừng bao giờ dùng lại nó ở đâu khác.' },

          { t: 'p', x:
            'Thêm một node <code>signature-1</code> vào <b>cấu hình</b> (không phải vào từng ' +
            'ảnh) trong một bản sao của <code>.its</code>:' },

          { t: 'code', where: 'wsl', code:
            'cp kernel.its kernel-signed.its' },

          { t: 'code', where: 'file', name: '~/bai36/kernel-signed.its — sửa node conf-1', lang: 'dts', code:
            '\tconfigurations {\n' +
            '\t\tdefault = "conf-1";\n' +
            '\n' +
            '\t\tconf-1 {\n' +
            '\t\t\tdescription = "Linux + DTB + initramfs";\n' +
            '\t\t\tkernel = "kernel-1";\n' +
            '\t\t\tfdt = "fdt-1";\n' +
            '\t\t\tramdisk = "ramdisk-1";\n' +
            '\n' +
            '\t\t\tsignature-1 {\n' +
            '\t\t\t\talgo = "sha256,rsa2048";\n' +
            '\t\t\t\tkey-name-hint = "dev";\n' +
            '\t\t\t\tsign-images = "kernel", "fdt", "ramdisk";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\t};' },

          { t: 'table',
            head: ['Trường', 'Ý nghĩa'],
            rows: [
              ['<code>algo = "sha256,rsa2048"</code>', 'Băm bằng SHA-256 rồi ký giá trị băm bằng RSA-2048. Chữ ký <b>không</b> ký trực tiếp lên 32 MB dữ liệu — nó ký lên 32 byte hash, nên nhanh và ngắn.'],
              ['<code>key-name-hint = "dev"</code>', 'Tên khoá. <code>mkimage</code> sẽ đi tìm <code>keys/dev.key</code> và <code>keys/dev.crt</code> — <b>đúng cái tên này cộng đuôi</b>. Sai tên là lỗi hay gặp nhất khi ký.'],
              ['<code>sign-images = …</code>', 'Danh sách thành phần được gộp vào phạm vi chữ ký. Ký ở cấp <i>cấu hình</i> nghĩa là ký cả <b>mối liên kết</b> giữa ba thành phần — kẻ tấn công không thể lấy kernel đã ký này ghép với DTB đã ký khác.'],
              ['<i>vì sao ký conf chứ không ký từng image</i>', 'Ký từng ảnh riêng chỉ chứng minh "kernel này là thật". Ký cấu hình chứng minh "<b>bộ ba này</b> là thật, và chúng thuộc về nhau".']
            ]},

          { t: 'p', x:
            'Bây giờ đến phần thú vị nhất: <code>mkimage</code> vừa ký ảnh, vừa <b>ghi khoá ' +
            'công khai vào một file device tree</b> để U-Boot mang theo bên mình. Ta dùng chính ' +
            '<code>virt-bios.dtb</code> làm control FDT:' },

          { t: 'code', where: 'wsl', code:
            'cp virt-bios.dtb control.dtb\n' +
            'mkimage -f kernel-signed.its -k keys -K control.dtb -r tftp/kernel-signed.itb' },

          { t: 'cmdx', title: 'mkimage khi ký — bốn tuỳ chọn làm hai việc', cmd: 'mkimage -f kernel-signed.its -k keys -K control.dtb -r tftp/kernel-signed.itb', rows: [
            ['<code>-f kernel-signed.its</code>', 'File mô tả nguồn, như mọi lần.'],
            ['<code>-k keys</code>', '<b>Thư mục</b> chứa khoá (không phải file). <code>mkimage</code> ghép <code>keys/</code> + <code>key-name-hint</code> + <code>.key</code> để tìm khoá bí mật.'],
            ['<code>-K control.dtb</code>', 'Ghi <b>khoá công khai</b> vào file device tree này. Đây là bước biến một cái DTB thường thành control FDT có chứa khoá.'],
            ['<code>-r</code>', '<b>Đánh dấu chữ ký là bắt buộc.</b> Nó đặt <code>required = "conf"</code> cạnh khoá, và chính thuộc tính này là thứ khiến U-Boot từ chối mọi ảnh không ký. Quên <code>-r</code> thì U-Boot sẽ kiểm tra chữ ký nếu có, và vui vẻ bỏ qua nếu không có — tức bảo mật bằng không.'],
            ['<code>tftp/kernel-signed.itb</code>', 'Ảnh kết quả, đặt thẳng vào thư mục TFTP.']
          ]},

          { t: 'p', x: 'Xem khoá công khai vừa được nhét vào đâu trong <code>control.dtb</code>:' },

          { t: 'code', where: 'wsl', code:
            'dtc -I dtb -O dts -o control.dts control.dtb 2>/dev/null\n' +
            'sed -n "/signature {/,/^\\t};/p" control.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tsignature {\n' +
            '\n' +
            '\t\tkey-dev {\n' +
            '\t\t\trequired = "conf";\n' +
            '\t\t\talgo = "sha256,rsa2048";\n' +
            '\t\t\trsa,r-squared = <0x1c8f4e8b ...>;\n' +
            '\t\t\trsa,modulus = <0xb3d0a5f2 ... 64 word ...>;\n' +
            '\t\t\trsa,exponent = <0x00 0x10001>;\n' +
            '\t\t\trsa,n0-inverse = <0x9f5c1d33>;\n' +
            '\t\t\trsa,num-bits = <0x800>;\n' +
            '\t\t\tkey-name-hint = "dev";\n' +
            '\t\t};\n' +
            '\t};',
            notes: ['Các giá trị số rất dài đã được rút gọn. <code>rsa,modulus</code> thật sự là 64 word 32-bit — chính là 2048 bit của khoá.'] },

          { t: 'cal', kind: 'info', title: 'required = "conf" là toàn bộ chính sách bảo mật, gói trong một dòng',
            x: 'Ba trường đáng nhớ: <code>rsa,num-bits = &lt;0x800&gt;</code> — <code>0x800</code> ' +
               '= <b>2048</b>, đúng độ dài khoá bạn tạo. <code>rsa,exponent = &lt;0x00 ' +
               '0x10001&gt;</code> — <code>0x10001</code> = <b>65537</b>, số mũ công khai tiêu ' +
               'chuẩn của mọi khoá RSA trên đời. Và <code>required = "conf"</code> — dòng do ' +
               '<code>-r</code> sinh ra, nghĩa là "<i>mọi cấu hình đều phải được khoá này ký, ' +
               'không có ngoại lệ</i>".' },

          { t: 'p', x:
            'Trên thiết bị thật, control FDT này được <b>nhúng thẳng vào file U-Boot</b> lúc ' +
            'build, nên khoá nằm trong flash cùng bootloader. Ở đây ta có cách nhanh hơn: đưa ' +
            'nó cho QEMU bằng <code>-dtb</code>, và U-Boot của Bài 34 sẽ dùng nó làm control ' +
            'FDT vì được build với <code>CONFIG_OF_BOARD=y</code> (lấy device tree từ nền ' +
            'tảng). Khởi động máy ảo với <b>một tuỳ chọn mới</b>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios ~/bai34/u-boot/u-boot.bin \\\n' +
            '  -dtb control.dtb \\\n' +
            '  -netdev user,id=net0,tftp=$HOME/bai36/tftp \\\n' +
            '  -device virtio-net-device,netdev=net0' },

          { t: 'code', where: 'uboot', code:
            'setenv autoload no\n' +
            'dhcp\n' +
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'tftpboot 0x44000000 kernel-signed.itb\n' +
            'bootm 0x44000000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 44000000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK\n' +
            "   Trying 'kernel-1' kernel subimage\n" +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading ramdisk (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK\n' +
            '## Loading fdt (any) from FIT Image at 44000000 ...\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:dev+ OK\n' +
            '   Booting using the fdt blob at 0x45d58990\n' +
            '   Loading Kernel Image to 40400000\n' +
            '   Loading Ramdisk to 5d324000, end 5d420c85 ... OK\n' +
            '   Loading Device Tree to 000000005d221000, end 000000005d323fff ... OK\n' +
            '\n' +
            'Starting kernel ...\n' +
            '...\n' +
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init' },

          { t: 'cal', kind: 'info', title: 'sha256,rsa2048:dev+ OK — dòng đáng ăn mừng',
            x: 'Đọc kỹ chuỗi này, nó nói đủ bốn điều: băm bằng <b>sha256</b>, chữ ký ' +
               '<b>rsa2048</b>, khoá tên <b>dev</b>, và dấu <b>+</b> là đã đối chiếu xong và ' +
               'khớp. Nó xuất hiện ba lần — mỗi lần cho một thành phần — vì chữ ký ở cấp cấu ' +
               'hình phủ lên cả ba. Thiết bị của bạn vừa từ chối tin bất cứ thứ gì không do ' +
               'khoá <code>dev</code> ký.' },

          { t: 'p', x:
            'Và đây là phép thử cuối, phép thử quan trọng nhất: cùng máy ảo đó, cùng U-Boot đó, ' +
            'nạp ảnh <b>không ký</b> ở bước 6 — thứ mà chỉ mấy phút trước còn boot ngon lành:' },

          { t: 'code', where: 'uboot', code:
            'tftpboot 0x44000000 kernel.itb\n' +
            'bootm 0x44000000' },

          { t: 'code', where: 'out', nocopy: true, code:
            '## Loading kernel (any) from FIT Image at 44000000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ...  error!\n' +
            "No 'signature' subnode found for 'conf-1' config node\n" +
            "Failed to verify required signature 'key-dev'\n" +
            'Bad Data Hash\n' +
            "ERROR -2: can't get kernel image!" },

          { t: 'cal', kind: 'why', title: 'Chú ý: ảnh này KHÔNG hỏng, và vẫn bị từ chối',
            x: 'Toàn bộ hash trong <code>kernel.itb</code> đều đúng — bạn vừa boot nó thành ' +
               'công ở bước 6. Nó bị từ chối chỉ vì <b>thiếu chữ ký</b>, và ' +
               '<code>required = "conf"</code> nói rằng thiếu chữ ký là không chấp nhận được. ' +
               'Đây chính là ranh giới giữa <i>kiểm tra toàn vẹn</i> và <i>secure boot</i>: cái ' +
               'trước hỏi "có hỏng không", cái sau hỏi "có phải của tôi không". Từ giây phút ' +
               'này, thiết bị chỉ boot phần mềm do bạn ký — và bạn vừa tự tay dựng nên điều đó.' }
        ]},

    ]},

    { t: 'hr' },

    /* ══════════════════════════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mười một dòng dưới đây đều là thông báo <b>thật</b>, gặp trong lúc dựng và kiểm chứng ' +
      'chính bài này. Cột giữa mới là thứ đáng học: mỗi thông báo trỏ về một nguyên nhân rất ' +
      'cụ thể, và biết cặp triệu chứng &#8594; nguyên nhân giúp bạn tiết kiệm hàng giờ.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>warning: requested NIC (anonymous, model virtio-net-device) was not created</code>',
         'Dùng <code>-nic</code> trên máy <code>-M virt</code>. QEMU chỉ cảnh báo rồi boot tiếp không có mạng.',
         'Thay bằng cặp <code>-netdev user,id=net0,tftp=…</code> và <code>-device virtio-net-device,netdev=net0</code>.'],
        ['<code>Net:   No ethernet found.</code>',
         'U-Boot không thấy card mạng nào. Hầu như luôn là hậu quả của dòng trên, hoặc <code>id=</code> không khớp <code>netdev=</code>.',
         'Cuộn ngược lên đầu output tìm dòng <code>warning</code> của QEMU — nguyên nhân thật nằm ở đó, không nằm trong U-Boot.'],
        ['<code>TFTP error: &#39;File not found&#39; (1)</code>',
         'Mạng <b>tốt</b>, chỉ là không có file tên đó trong thư mục gốc TFTP.',
         'Kiểm tra chính tả và chạy <code>ls ~/bai36/tftp/</code>. Nhớ rằng đường dẫn trong <code>tftp=</code> phải là tuyệt đối.'],
        ['<code>T T T T</code> rồi <code>Retry count exceeded</code>',
         'Khác hẳn lỗi trên: máy ảo không liên lạc được với server. Thường do quên <code>dhcp</code>, hoặc <code>serverip</code> sai.',
         '<code>printenv ipaddr serverip</code> rồi <code>ping ${serverip}</code>. Chưa <code>ping</code> được thì đừng đụng tới <code>tftpboot</code>.'],
        ['<code>*** Warning: no boot file name; using &#39;0A00020F.img&#39;</code>',
         '<code>dhcp</code> tự động tải file boot vì <code>autoload</code> vẫn là mặc định.',
         '<code>setenv autoload no</code> trước khi gọi <code>dhcp</code>.'],
        ['<code>ERROR: new format image overwritten - must RESET the board to recover</code>',
         'Địa chỉ nạp FIT trùng với <code>load</code> khai bên trong FIT — U-Boot sẽ phải ghi đè lên ảnh nó đang đọc.',
         'Nạp FIT vào một địa chỉ khác, ví dụ <code>0x44000000</code> thay vì <code>${kernel_addr_r}</code>.'],
        ['Boot xong <code>Starting kernel ...</code> rồi <b>im lặng tuyệt đối</b>',
         'Kernel chết trước khi kịp khởi tạo console. Nguyên nhân số một là device tree mô tả sai phần cứng.',
         'Thêm <code>earlycon=pl011,0x9000000</code> vào <code>bootargs</code> để kernel nói được từ dòng đầu tiên.'],
        ['<code>Internal error: synchronous external abort</code> tại <code>amba_read_periphid</code>',
         'Device tree khai một thiết bị AMBA ở địa chỉ mà máy không có. Giá trị thanh ghi <code>x9</code> cho biết địa chỉ đó.',
         'Dump lại DTB bằng <b>đúng dòng lệnh QEMU sẽ boot</b>, kể cả <code>-bios</code> và phần mạng. So bằng <code>dtc</code> + <code>diff</code>.'],
        ['<code>libfdt fdt_path_offset() returned FDT_ERR_NOTFOUND</code>',
         'Không có node ở đường dẫn bạn hỏi. Đây thường là <b>kết quả mong muốn</b> khi bạn đang xác minh một node <i>không</i> tồn tại.',
         'Dùng <code>fdt addr ${fdtcontroladdr}</code> trước, rồi <code>fdt print /</code> để xem cây thật có gì.'],
        ['<code>sha256 error!</code> + <code>Bad hash value for &#39;hash-1&#39;…</code> + <code>Bad Data Hash</code>',
         'Dữ liệu trong ảnh <b>khác</b> với hash ghi trong ảnh: tải dở dang, file bị sửa, hoặc quên copy ảnh mới sang server.',
         '<code>sha256sum</code> file trên máy build, so với <code>Hash value</code> mà <code>iminfo</code> in ra, và đối chiếu <code>Bytes transferred</code> với kích thước thật.'],
        ['<code>No &#39;signature&#39; subnode found</code> + <code>Failed to verify required signature &#39;key-dev&#39;</code>',
         'Ảnh <b>không hỏng</b>, chỉ là không có chữ ký — mà control FDT có <code>required = "conf"</code>.',
         'Build lại bằng <code>.its</code> có node <code>signature-1</code> và <code>mkimage -k keys -K control.dtb -r</code>. Đây là hành vi đúng, không phải lỗi.']
      ]},

    { t: 'hr' },

    /* ══════════════════════════════════════════════════════════════════
       TỔNG KẾT
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Tóm tắt bài 36', items: [
      'QEMU có sẵn máy chủ <b>TFTP</b> trong lớp mạng <code>user</code>: <code>-netdev user,id=net0,tftp=THƯ_MỤC</code> cộng với <code>-device virtio-net-device,netdev=net0</code>. Trên máy <code>-M virt</code> phải viết <b>đủ hai nửa</b> — <code>-nic</code> chỉ in warning rồi boot không có mạng.',
      'Địa chỉ slirp cố định: máy ảo <b>10.0.2.15</b>, host kiêm TFTP server <b>10.0.2.2</b>. Luôn <code>setenv autoload no</code> trước <code>dhcp</code>, rồi <code>ping</code> trước <code>tftpboot</code>.',
      'Đo được <b>24,5 MiB/s</b> — 31 MB kernel + initramfs mất khoảng <b>1,3 giây</b>. Đó là lý do TFTP vẫn sống sau bốn mươi năm: vòng lặp sửa &#8594; build &#8594; boot rút xuống còn vài giây, không tháo lắp thẻ nhớ.',
      '<b>FIT image</b> gói kernel + DTB + initramfs vào <b>một</b> file: <code>.its</code> mô tả &#8594; <code>mkimage -f</code> &#8594; <code>.itb</code>. Phần "vỏ" chỉ tốn <b>1 339 byte</b> trên tổng <b>32 856 448</b> byte, tức <b>0,004 %</b>.',
      '<code>configurations</code> mới là thứ giải quyết vấn đề gốc: một cấu hình là một <b>bộ ba đã ghép sẵn</b>, nên không còn cách nào boot nhầm kernel với DTB của board khác.',
      'Nạp FIT vào địa chỉ <b>khác</b> với <code>load</code> khai bên trong, nếu không sẽ gặp <code>new format image overwritten</code>. Bài này dùng <code>0x44000000</code> cho FIT và <code>0x40400000</code> cho kernel.',
      'Hash <b>sha256</b> bắt được sai lệch <b>một byte trên 32 856 448</b> (0,000003 %) và U-Boot dừng <b>trước khi</b> nhảy vào kernel: <code>sha256 error!</code> &#8594; <code>Bad Data Hash</code> &#8594; <code>ERROR -2</code>. Dấu <code>+</code> sau tên thuật toán nghĩa là "đã kiểm tra và khớp".',
      'Chữ ký <b>RSA-2048</b> ký ở cấp <i>cấu hình</i>: <code>mkimage -k keys -K control.dtb -r</code> vừa ký ảnh vừa ghi khoá công khai vào control FDT kèm <code>required = "conf"</code>. Ảnh đúng chữ ký in <code>sha256,rsa2048:dev+ OK</code>; ảnh <b>không hỏng nhưng không ký</b> bị từ chối thẳng.',
      '<b>Bài học lớn nhất:</b> hash và chữ ký bảo vệ <b>tính toàn vẹn</b>, không bảo vệ <b>tính đúng đắn</b>. Cái DTB sai ở bước 4 có hash khớp hoàn hảo và vẫn làm kernel panic. Rác đúng chuẩn vẫn là rác.',
      '<code>-M virt</code> <b>không phải một máy cố định</b>: thiếu <code>-bios</code> lúc <code>dumpdtb</code> thì QEMU thêm <code>pl061@9030000</code> + <code>gpio-keys</code> mà máy thật không có (393 dòng dts so với 372). Luôn dump bằng đúng dòng lệnh sẽ boot.',
      'Kernel câm sau <code>Starting kernel ...</code> thì dùng <code>earlycon=pl011,0x9000000</code>. Đọc oops <b>từ dưới lên</b>: hàm sâu nhất trong call trace cộng giá trị thanh ghi mới là nguyên nhân, <code>Kernel panic</code> chỉ là hậu quả.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Hết <b>Chặng 06</b>. Bạn đã đi trọn con đường của bootloader: build U-Boot (Bài 34), ' +
         'điều khiển nó bằng dòng lệnh (Bài 35), và nạp một ảnh có ký qua mạng (bài này). ' +
         'Nhưng suốt bốn bài vừa rồi, <code>Image</code> luôn là một <b>hộp đen 30 771 136 ' +
         'byte</b> đi mượn từ Debian — bạn chưa từng biết bên trong nó có gì. <b>Chặng 07 — ' +
         'Linux Kernel</b> mở cái hộp đó ra, bắt đầu bằng <b>Bài 37 — Kiến trúc kernel</b>: ' +
         'kernel space và user space thật sự khác nhau ở chỗ nào, system call đi qua ranh giới ' +
         'đó bằng cơ chế gì, và vì sao một cái kernel 30 MB lại chỉ nạp vài MB vào RAM. Bạn sẽ ' +
         'gặp lại <code>/sys/firmware/devicetree/base</code> ở bước 6 rất nhiều — đó là cách ' +
         'kernel kể cho userspace nghe về phần cứng nó vừa nhận được từ U-Boot.' }

  ],

  quiz: [
    { q: 'Bạn khởi động QEMU với <code>-nic user,model=virtio-net-device,tftp=…</code> trên máy <code>-M virt</code>. U-Boot báo <code>Net: No ethernet found.</code> Nguyên nhân là gì?',
      opts: [
        'Thư mục TFTP không tồn tại nên QEMU không bật được máy chủ',
        'Máy <code>virt</code> không có slot NIC mặc định, nên <code>-nic</code> không tạo được card mạng; phải viết đủ cặp <code>-netdev</code> + <code>-device</code>',
        'U-Boot của Bài 34 chưa bật driver virtio-net',
        'Thiếu <code>dhcp</code> nên U-Boot chưa nhận ra card mạng'
      ],
      a: 1,
      why: 'QEMU đã nói trước điều đó ở ngay đầu output: <code>requested NIC (anonymous, model virtio-net-device) was not created (not supported by this machine?)</code>. <code>-nic</code> là lối tắt dành cho máy có sẵn slot NIC; máy <code>virt</code> của ARM cần thiết bị được gắn tường minh vào bus virtio. Điểm nguy hiểm là QEMU chỉ <i>cảnh báo</i> rồi boot tiếp, nên nếu bạn không cuộn ngược lên đầu thì sẽ đi tìm lỗi nhầm chỗ trong U-Boot.' },

    { q: '<code>tftpboot ${kernel_addr_r} kernel.itb</code> chạy tốt, nhưng <code>bootm ${kernel_addr_r}</code> lại báo <code>ERROR: new format image overwritten - must RESET the board to recover</code>. Vì sao?',
      opts: [
        'File FIT bị hỏng trong lúc truyền qua mạng',
        'Máy ảo chỉ có 512 MB RAM, không đủ chỗ cho ảnh 32 MB',
        'Địa chỉ nạp FIT trùng với địa chỉ <code>load</code> khai bên trong FIT, nên U-Boot sẽ phải ghi đè lên chính ảnh nó đang đọc',
        'Thiếu <code>iminfo</code> trước <code>bootm</code> nên U-Boot chưa kiểm tra hash'
      ],
      a: 2,
      why: 'Bên trong <code>kernel.its</code>, node <code>kernel-1</code> khai <code>load = &lt;0x40400000&gt;</code> — trùng đúng <code>${kernel_addr_r}</code>. Để boot, U-Boot phải chép 30 MB dữ liệu kernel từ <code>0x404000d0</code> về <code>0x40400000</code>, tức ghi đè lên vùng đang chứa ảnh. Nó phát hiện và tự reset thay vì chạy tiếp với dữ liệu rác. Cách sửa là nạp FIT vào chỗ khác, ví dụ <code>0x44000000</code>.' },

    { q: 'Bạn build FIT, mọi hash đều <code>sha256+ OK</code>, U-Boot in <code>Starting kernel ...</code> rồi máy im lặng hoàn toàn — không panic, không một ký tự. Việc đầu tiên nên làm là gì?',
      opts: [
        'Thêm <code>earlycon</code> vào <code>bootargs</code> để kernel nói được trước khi khởi tạo console',
        'Build lại FIT vì hash chắc chắn đã sai',
        'Tăng RAM máy ảo lên 1024 MB',
        'Đổi <code>rdinit=/init</code> thành <code>init=/bin/sh</code> vì initramfs hỏng'
      ],
      a: 0,
      why: 'Kernel chỉ in ra <code>console=ttyAMA0</code> <b>sau khi</b> đã khởi tạo driver UART — mà việc đó xảy ra sau khi nó duyệt device tree. Chết trước mốc đó thì chết trong bóng tối. <code>earlycon=pl011,0x9000000</code> cho kernel ghi thẳng vào thanh ghi UART từ dòng đầu tiên. Đáp án B sai vì hash đã <code>OK</code>; D sai vì lỗi ở PID 1 chỉ là <i>hậu quả</i>, chưa có bằng chứng nào chỉ về initramfs.' },

    { q: 'Kernel panic với <code>Internal error: synchronous external abort</code> tại <code>amba_read_periphid</code>, thanh ghi <code>x9 : 0000000009031000</code>, call trace đi qua <code>of_platform_populate</code>. Kết luận đúng nhất là gì?',
      opts: [
        'Initramfs hỏng vì dòng cuối cùng là <code>Attempted to kill init!</code>',
        'Kernel thiếu driver cho thiết bị AMBA nên phải bật thêm trong cấu hình',
        'RAM máy ảo bị lỗi ở vùng địa chỉ <code>0x9031000</code>',
        'Device tree khai một thiết bị ở <code>0x9030000</code> mà máy thật không có, nên kernel đọc vào khoảng không'
      ],
      a: 3,
      why: '<code>of_platform_populate</code> nghĩa là kernel đang duyệt device tree; <code>amba_read_periphid</code> nghĩa là nó đang đọc thanh ghi ID của một thiết bị AMBA; <code>x9 = 0x9031000</code> cho biết địa chỉ cụ thể; <code>external abort</code> nghĩa là không có gì trả lời ở đó. Ba mảnh ghép lại thành một kết luận duy nhất. Đáp án A là cái bẫy kinh điển — dòng <code>Kernel panic</code> cuối cùng gần như không bao giờ là nguyên nhân, hãy đọc oops <b>từ dưới lên</b>.' },

    { q: 'Hai lần chạy <code>-machine dumpdtb</code> trên cùng máy <code>-M virt</code> lại cho hai file khác nhau: bản có <code>-bios u-boot.bin</code> có 372 dòng dts, bản không có <code>-bios</code> có 393 dòng. Điều này nói lên gì?',
      opts: [
        '<code>dumpdtb</code> có lỗi, nên phải dùng <code>dtc</code> để sinh DTB thay thế',
        '<code>-M virt</code> là máy do QEMU lắp ráp lúc chạy, nên thành phần của nó phụ thuộc vào toàn bộ dòng lệnh — phải dump bằng đúng dòng lệnh sẽ boot',
        'Phiên bản QEMU khác nhau giữa hai lần chạy',
        'Chênh lệch chỉ do <code>rng-seed</code> và <code>kaslr-seed</code> ngẫu nhiên'
      ],
      a: 1,
      why: 'Không có <code>-bios</code>, QEMU cho rằng nó phải tự lo phần firmware nên lắp thêm <code>pl061@9030000</code> và <code>gpio-keys</code> — 21 dòng dts mà máy thật (đã có U-Boot riêng) không có. Đáp án D đúng một phần nhưng không giải thích được chênh lệch 21 dòng: <code>rng-seed</code>/<code>kaslr-seed</code> chỉ làm <b>giá trị</b> đổi mỗi lần dump chứ không làm <b>số node</b> đổi.' },

    { q: 'Một FIT có đủ hash sha256 và mọi hash đều đúng, nhưng khi boot trên U-Boot có control FDT chứa <code>required = "conf"</code> thì bị từ chối với <code>Failed to verify required signature &#39;key-dev&#39;</code>. Chuyện gì đã xảy ra?',
      opts: [
        'Ảnh bị sửa sau khi build nên hash không còn khớp',
        'Khoá bí mật <code>dev.key</code> đã bị lộ nên U-Boot vô hiệu hoá nó',
        'Ảnh hoàn toàn nguyên vẹn, chỉ là không có chữ ký — mà <code>required = "conf"</code> bắt buộc mọi cấu hình phải được ký',
        'Thuật toán phải là <code>sha256,rsa4096</code> mới được U-Boot chấp nhận'
      ],
      a: 2,
      why: 'Đây là ranh giới giữa <i>kiểm tra toàn vẹn</i> và <i>secure boot</i>. Hash trả lời "file này có đúng là file tôi đã đóng gói không" — và câu trả lời vẫn là có. Chữ ký trả lời "file này có phải do <b>tôi</b> tạo ra không", và không có chữ ký thì không có câu trả lời. Thuộc tính <code>required = "conf"</code> do tuỳ chọn <code>mkimage -r</code> sinh ra chính là thứ biến "không có câu trả lời" thành "từ chối boot". Quên <code>-r</code> thì U-Boot sẽ vui vẻ boot ảnh không ký — tức bảo mật bằng không.' },

    { q: 'Trong <code>kernel.its</code>, vì sao node <code>signature-1</code> nên đặt trong <code>configurations/conf-1</code> chứ không đặt riêng trong từng node của <code>images</code>?',
      opts: [
        'Vì <code>mkimage</code> không hỗ trợ ký từng ảnh riêng lẻ',
        'Vì ký ở cấp cấu hình nhanh hơn, chỉ phải tính một chữ ký thay vì ba',
        'Vì chỉ cấu hình mới có trường <code>key-name-hint</code>',
        'Vì ký cấu hình là ký cả <b>mối liên kết</b> giữa ba thành phần, nên không thể ghép kernel đã ký này với DTB đã ký của board khác'
      ],
      a: 3,
      why: 'Ký từng ảnh riêng chỉ chứng minh "kernel này là thật, DTB này là thật". Nó không ngăn được việc ghép một kernel thật với một DTB thật <i>của board khác</i> — mà đó chính là bài toán "ba file rời rạc" mà FIT sinh ra để giải. Ký ở cấp cấu hình chứng minh thêm một điều nữa: <b>bộ ba này thuộc về nhau</b>. Trường <code>sign-images = "kernel", "fdt", "ramdisk"</code> liệt kê đúng những thành phần được gộp vào phạm vi chữ ký đó.' }
  ]
});

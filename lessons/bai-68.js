/* Bài 68 — Bảo mật và secure boot  (LO-TRINH: "Bảo mật cơ bản")
   Chặng 13 — Thành phẩm và nghề nghiệp
   Lấy sản phẩm Thermo của Bài 67, đo các điểm yếu của nó, rồi bịt từng điểm: FIT ký RSA-2048 + khoá công khai
   trong control FDT của U-Boot (một mắt xích của chain of trust), đóng các đường vòng của U-Boot bằng một
   fragment, rootfs chỉ đọc + phân vùng /data + overlayfs cho /etc, bớt applet/dịch vụ/thiết bị, daemon chạy
   bằng user riêng, mật khẩu root dạng hash, khoá bí mật nằm ngoài cây br2-external.
   Mọi số liệu đo 2026-11-03 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, 16 CPU, QEMU 4.2.1 hệ thống).
   - Cây làm việc: ~/bai68/thermo (bản sao của ~/bai67/thermo), Buildroot dùng lại ~/bai67/buildroot-2026.02.3,
     O=~/bai68/out. Build đầu 7m29s; bản build sạch cuối (make clean all) dùng cho Bước 5–6.
   - Bước 2–4 trích từ cùng một Image (hash cc3d575a…); Bước 5–6 từ bản build sạch sau đó (hash khác, không trích).
   - Phát hiện khi soạn: (1) CONFIG_CMDLINE=n làm extlinux không boot được (Boot failed err=-14) vì CMD_BOOTM
     phụ thuộc CMDLINE; (2) "# CONFIG_CMD_BOOTI is not set" bị BOOTSTD_DEFAULTS -> BOOT_DEFAULTS_CMDS bật lại,
     phải tắt BOOTSTD_DEFAULTS; (3) busybox-dirclean để lại symlink applet cũ trong target/ — cần make clean all;
     (4) hostname -F trong inittab chạy trước overlay; (5) seedrng cần thư mục ghi được.
   - Không làm (ngoài phạm vi QEMU/thời lượng): dm-verity, ký U-Boot bằng ROM/TF-A, OTP/eFuse, TPM, OP-TEE.
   - ~/bai68 là nháp, xoá được; ~/bai68/thermo là sản phẩm đã gia cố, Bài 69 có thể xuất phát từ đó. */

Lesson.register({
  id: 'bai-68',
  title: 'Bảo mật và secure boot',
  minutes: 60,
  practice: 'Thực hành 60 phút',
  level: 'Nâng cao',

  intro:
    'Thermo của Bài 67 chạy được, và đó chính là vấn đề: nó chạy <b>bất cứ thứ gì</b>. Ai cầm được thẻ nhớ ' +
    '(hoặc file <code>disk.img</code>) có thể sửa kernel, và U-Boot vẫn vui vẻ nạp nó. Đăng nhập ' +
    '<code>root</code> không cần mật khẩu, rootfs ghi được, daemon chạy bằng quyền root, và ' +
    '<code>SHA256SUMS</code> mà bạn tự hào đóng gói chỉ nói được rằng file <i>khác</i> đi — không ngăn được ' +
    'ai dùng nó.<br><br>' +
    'Bài này đo từng điểm yếu đó trên chính Thermo, rồi bịt từng điểm một. Bạn sẽ sửa <b>một byte</b> trong ' +
    'kernel và thấy bo mạch vẫn boot; ký ảnh FIT bằng RSA-2048 và thấy nó <i>vẫn</i> boot ảnh giả — vì bên ' +
    'kiểm tra chưa có khoá; đưa khoá vào U-Boot và thấy ảnh giả bị từ chối, nhưng một đường vòng qua ' +
    '<code>extlinux.conf</code> lại mở ra; rồi đóng đường vòng đó. Cuối cùng rootfs trở thành chỉ đọc mà ' +
    'cấu hình vẫn sửa được, nhờ overlayfs. Mỗi bước là một mắt xích của <b>chain of trust</b>, và bạn sẽ thấy ' +
    'tận mắt chuỗi đứt ở đâu khi thiếu một mắt.',

  goals: [
    'Lập mô hình mối đe doạ cho một thiết bị nhúng: liệt kê được kẻ tấn công chạm vào đâu, và đo bề mặt tấn công ' +
      'của Thermo bằng lệnh thật (mật khẩu, cổng mở, setuid, quyền ghi rootfs).',
    'Giải thích chain of trust từ ROM tới rootfs, phân biệt <b>hash</b> (phát hiện hỏng) với <b>chữ ký</b> ' +
      '(phát hiện giả mạo), và chỉ ra mắt xích nào QEMU không mô phỏng được.',
    'Ký một ảnh FIT bằng RSA-2048 trong post-build của Buildroot, đưa khoá công khai vào control FDT của U-Boot ' +
      'với <code>required = "conf"</code>, và chứng minh U-Boot từ chối ảnh không ký, ảnh sửa một byte và ảnh ' +
      'ký bằng khoá khác.',
    'Đóng các đường vòng làm chữ ký vô nghĩa — <code>booti</code>, ảnh legacy, EFI, môi trường lưu trong flash, ' +
      'dấu nhắc U-Boot — bằng một config fragment, và đọc được vì sao một tuỳ chọn tắt rồi vẫn bật lại.',
    'Biến rootfs thành chỉ đọc với một phân vùng <code>/data</code> và overlayfs cho <code>/etc</code>, ' +
      'tìm và sửa những dịch vụ hỏng vì không ghi được.',
    'Thu nhỏ bề mặt tấn công (applet, dịch vụ, <code>/dev/mem</code>, user riêng cho daemon) và giữ bí mật ' +
      '(khoá ký, mật khẩu) ra khỏi cây mã nguồn lẫn ảnh đĩa.'
  ],

  blocks: [

    /* ============================================================
       1. MÔ HÌNH MỐI ĐE DOẠ
       ============================================================ */
    { t: 'h2', x: 'Bắt đầu từ kẻ tấn công: mô hình mối đe doạ' },

    { t: 'p', x:
      '"Làm cho an toàn" không phải là một việc, vì không có thiết bị nào an toàn trước <i>mọi</i> thứ. Người ' +
      'làm bảo mật bắt đầu bằng một câu hỏi cụ thể hơn: <b>ai</b> muốn làm <b>gì</b> với thiết bị này, và họ ' +
      '<b>chạm được vào đâu</b>? Câu trả lời gọi là <i>threat model</i> (mô hình mối đe doạ). Nó quyết định bạn ' +
      'tiêu công sức vào đâu — và quan trọng không kém, chỗ nào bạn <i>chấp nhận</i> để hở.' },

    { t: 'p', x:
      'Hãy hình dung Thermo được lắp ở một nhà kho, cắm mạng nội bộ. Ba kiểu người có thể chạm vào nó:' },

    { t: 'table',
      head: ['Kẻ tấn công', 'Chạm được vào', 'Muốn gì', 'Điểm yếu của Thermo Bài 67'],
      rows: [
        ['Từ mạng', 'Cổng TCP đang mở', 'Chiếm quyền điều khiển, dùng làm bàn đạp', 'Daemon chạy bằng <b>root</b>: một lỗi tràn bộ đệm trong nó = root toàn máy'],
        ['Có mặt tại chỗ, vài phút', 'Cổng serial, nút nguồn', 'Vào shell, đọc cấu hình', 'Đăng nhập <code>root</code> <b>không mật khẩu</b>; U-Boot có dấu nhắc <code>=&gt;</code> ai cũng gõ được'],
        ['Có mặt tại chỗ, mang thiết bị về', 'Thẻ nhớ / ổ eMMC', 'Cấy mã độc tồn tại qua mọi lần khởi động lại', 'U-Boot nạp <b>bất kỳ</b> <code>Image</code> nào trong <code>/boot</code>; rootfs ghi được'],
        ['Chuỗi cung ứng', 'File cập nhật trên đường đi', 'Thay bản phát hành bằng bản có cửa hậu', '<code>SHA256SUMS</code> đi <i>cùng</i> file: kẻ thay file thay luôn tổng kiểm tra']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao hàng cuối cùng nguy hiểm nhất',
      x: 'Ba hàng đầu tấn công <b>một</b> thiết bị. Hàng cuối tấn công <b>mọi</b> thiết bị cùng lúc: nếu kẻ xấu ' +
         'thay được file cập nhật, hàng nghìn bo mạch tự cài cửa hậu cho họ. Đó là lý do mọi cơ chế cập nhật ' +
         'nghiêm túc (Bài 69) đều dựa trên <b>chữ ký</b>, không phải tổng kiểm tra — và cũng là lý do bài này dành ' +
         'nhiều thời gian nhất cho chữ ký.' },

    { t: 'p', x:
      'Mô hình mối đe doạ không phải lý thuyết suông: mỗi ô ở cột cuối là một lệnh bạn chạy được. Bước 1 phần ' +
      'thực hành đo cả bốn trên Thermo thật. Kết quả tóm tắt trước ở đây để bạn có bản đồ:' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Bề mặt tấn công của Thermo Bài 67: bốn lối vào là ảnh đĩa, cổng serial, mạng và bản phát hành, mỗi lối dẫn tới một điểm yếu đo được">' +
        '<rect class="d-box-p" x="260" y="110" width="200" height="80" rx="10"/>' +
        '<text class="d-t" x="360" y="140" text-anchor="middle">Thermo (Bài 67)</text>' +
        '<text class="d-ts" x="360" y="160" text-anchor="middle">mọi thứ chạy bằng root</text>' +
        '<text class="d-ts" x="360" y="176" text-anchor="middle">rootfs ghi được</text>' +
        '<rect class="d-box-w" x="20" y="20" width="220" height="70" rx="8"/>' +
        '<text class="d-t" x="30" y="44">Ảnh đĩa / thẻ nhớ</text>' +
        '<text class="d-ts" x="30" y="62">sửa 1 byte trong kernel</text>' +
        '<text class="d-ts" x="30" y="78">→ vẫn boot, không lời cảnh báo</text>' +
        '<rect class="d-box-w" x="480" y="20" width="220" height="70" rx="8"/>' +
        '<text class="d-t" x="490" y="44">Cổng serial</text>' +
        '<text class="d-tm" x="490" y="62">root::::::::</text>' +
        '<text class="d-ts" x="490" y="78">→ shell root không mật khẩu</text>' +
        '<rect class="d-box-w" x="20" y="210" width="220" height="70" rx="8"/>' +
        '<text class="d-t" x="30" y="234">Mạng</text>' +
        '<text class="d-tm" x="30" y="252">0.0.0.0:9006 LISTEN</text>' +
        '<text class="d-ts" x="30" y="268">→ daemon chạy bằng root</text>' +
        '<rect class="d-box-w" x="480" y="210" width="220" height="70" rx="8"/>' +
        '<text class="d-t" x="490" y="234">Bản phát hành</text>' +
        '<text class="d-tm" x="490" y="252">SHA256SUMS</text>' +
        '<text class="d-ts" x="490" y="268">→ kẻ thay file thay luôn tổng</text>' +
        '<line class="d-line" x1="240" y1="70" x2="270" y2="110"/>' +
        '<line class="d-line" x1="480" y1="70" x2="450" y2="110"/>' +
        '<line class="d-line" x1="240" y1="230" x2="270" y2="190"/>' +
        '<line class="d-line" x1="480" y1="230" x2="450" y2="190"/>' +
        '</svg>',
      cap: 'Bốn lối vào, bốn điểm yếu, và cả bốn đều <b>đo được</b> bằng một lệnh. Bảo mật nhúng bắt đầu từ ' +
           'bản đồ này chứ không phải từ một công cụ: mỗi biện pháp trong bài bịt đúng một mũi tên.' },

    /* ============================================================
       2. CHAIN OF TRUST
       ============================================================ */
    { t: 'h2', x: 'Chain of trust: mỗi tầng kiểm tra tầng sau' },

    { t: 'p', x:
      'Câu hỏi "kernel này có phải của tôi không?" chỉ trả lời được bởi một chương trình <b>đã chạy trước</b> ' +
      'kernel — tức bootloader. Nhưng rồi "bootloader này có phải của tôi không?" lại phải hỏi tầng trước nữa. ' +
      'Chuỗi câu hỏi đó phải dừng ở một thứ <b>không ai sửa được</b>: mã trong ROM của chip, cùng một khoá công ' +
      'khai (hoặc hash của nó) được "đốt" vào bộ nhớ chỉ ghi một lần (OTP/eFuse) ở nhà máy. Điểm dừng đó gọi là ' +
      '<b>root of trust</b>. Từ đó trở đi, mỗi tầng kiểm tra chữ ký của tầng kế tiếp <i>trước khi</i> nhảy vào nó — ' +
      'đó là <b>chain of trust</b>, và toàn bộ quá trình gọi là <b>secure boot</b> (hay <i>verified boot</i>).' },

    { t: 'p', x:
      'Hình dung một dãy người gác cổng: người đầu tiên được chính chủ nhà dựng lên và không ai thay được; mỗi ' +
      'người kiểm tra thẻ của người kế tiếp trước khi giao chìa khoá. Chỉ cần <b>một</b> người gác cho qua mà ' +
      'không kiểm tra, mọi người gác phía sau đều vô nghĩa — kẻ xấu chỉ cần chen vào đúng chỗ đó.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Chain of trust từ Boot ROM qua bootloader tầng đầu, U-Boot, ảnh FIT, kernel tới rootfs; mắt xích bài này làm được là U-Boot kiểm tra FIT">' +
        '<rect class="d-box-a" x="10" y="40" width="105" height="76" rx="8"/>' +
        '<text class="d-t" x="62" y="66" text-anchor="middle">Boot ROM</text>' +
        '<text class="d-ts" x="62" y="84" text-anchor="middle">khoá trong</text>' +
        '<text class="d-ts" x="62" y="100" text-anchor="middle">OTP/eFuse</text>' +
        '<rect class="d-box" x="130" y="40" width="105" height="76" rx="8"/>' +
        '<text class="d-t" x="182" y="66" text-anchor="middle">SPL / TF-A</text>' +
        '<text class="d-ts" x="182" y="84" text-anchor="middle">tầng đầu</text>' +
        '<rect class="d-box" x="250" y="40" width="105" height="76" rx="8"/>' +
        '<text class="d-t" x="302" y="66" text-anchor="middle">U-Boot</text>' +
        '<text class="d-ts" x="302" y="84" text-anchor="middle">giữ khoá</text>' +
        '<text class="d-ts" x="302" y="100" text-anchor="middle">công khai</text>' +
        '<rect class="d-box-g" x="370" y="40" width="105" height="76" rx="8"/>' +
        '<text class="d-t" x="422" y="66" text-anchor="middle">FIT ký</text>' +
        '<text class="d-tm" x="422" y="84" text-anchor="middle">Image + dtb</text>' +
        '<rect class="d-box" x="490" y="40" width="105" height="76" rx="8"/>' +
        '<text class="d-t" x="542" y="66" text-anchor="middle">Kernel</text>' +
        '<text class="d-ts" x="542" y="84" text-anchor="middle">dm-verity</text>' +
        '<rect class="d-box" x="610" y="40" width="100" height="76" rx="8"/>' +
        '<text class="d-t" x="660" y="66" text-anchor="middle">Rootfs</text>' +
        '<text class="d-ts" x="660" y="84" text-anchor="middle">chỉ đọc</text>' +
        '<line class="d-line" x1="115" y1="78" x2="124" y2="78"/><path class="d-arrow" d="M130,78 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="235" y1="78" x2="244" y2="78"/><path class="d-arrow" d="M250,78 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="355" y1="78" x2="364" y2="78"/><path class="d-arrow" d="M370,78 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="475" y1="78" x2="484" y2="78"/><path class="d-arrow" d="M490,78 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="595" y1="78" x2="604" y2="78"/><path class="d-arrow" d="M610,78 l-8,-4 v8 z"/>' +
        '<rect class="d-box-w" x="10" y="150" width="345" height="60" rx="8"/>' +
        '<text class="d-t" x="22" y="174">QEMU không có: ROM, OTP, SPL ký</text>' +
        '<text class="d-ts" x="22" y="194">u-boot.bin nạp bằng -bios, khoá đi qua -dtb — ai đổi tham số là đổi được</text>' +
        '<rect class="d-box-g" x="250" y="230" width="345" height="60" rx="8"/>' +
        '<text class="d-t" x="262" y="254">Bài này làm thật: U-Boot → FIT</text>' +
        '<text class="d-ts" x="262" y="274">+ đóng đường vòng của U-Boot + rootfs chỉ đọc</text>' +
        '</svg>',
      cap: 'Một chuỗi chỉ mạnh bằng mắt yếu nhất. Bài này dựng thật mắt <b>U-Boot → FIT</b> và kiểm chứng nó ' +
           'bằng ảnh giả; các mắt phía trước cần phần cứng thật (Bài 70), mắt <code>dm-verity</code> phía sau được ' +
           'giới thiệu nhưng không dựng.' },

    { t: 'h3', x: 'Hash phát hiện hỏng, chữ ký phát hiện giả' },

    { t: 'p', x:
      'Bài 36 đã cho bạn thấy FIT chứa hash SHA-256 của từng thành phần, và Bài 67 đóng gói ' +
      '<code>SHA256SUMS</code>. Cả hai đều trả lời câu hỏi "file có <b>bị hỏng</b> không?" — một bit lật trên thẻ ' +
      'nhớ, một lần tải bị cắt. Chúng <b>không</b> trả lời được "file có phải <b>của tôi</b> không?", vì ai cũng ' +
      'tính được SHA-256: kẻ sửa kernel chỉ cần tính lại hash và ghi đè. Chữ ký số thêm vào đúng thứ còn thiếu ' +
      '— một bí mật:' },

    { t: 'table',
      head: ['', 'Hash (SHA-256)', 'Chữ ký (RSA-2048 trên SHA-256)'],
      rows: [
        ['Ai tạo được', '<b>Bất kỳ ai</b> có file', 'Chỉ người giữ <b>khoá bí mật</b>'],
        ['Ai kiểm được', 'Bất kỳ ai', 'Bất kỳ ai có <b>khoá công khai</b>'],
        ['Phát hiện bit lật, tải hỏng', 'Có', 'Có (chữ ký bao trùm hash)'],
        ['Phát hiện kẻ thay file và tính lại', '<b>Không</b>', '<b>Có</b> — họ không tạo được chữ ký mới'],
        ['Trong Thermo', '<code>SHA256SUMS</code>, node <code>hash-1</code> của FIT', 'Node <code>signature-1</code> của FIT (Bước 2)'],
        ['Khoá công khai phải ở đâu', '—', 'Trong <b>bên kiểm tra</b> (U-Boot), và bên kiểm tra phải được bảo vệ']
      ] },

    { t: 'cal', kind: 'tip', title: 'Câu để nhớ',
      x: '<b>Hash nói "giống bản gốc", chữ ký nói "do tôi làm ra".</b> Và chữ ký chỉ có giá trị bằng nơi cất khoá ' +
         'công khai: nếu kẻ tấn công thay được khoá công khai trong U-Boot, họ ký ảnh của họ bằng khoá của họ là ' +
         'xong. Vì thế khoá công khai phải nằm trong một tầng đã được tầng trước kiểm tra — lại là chain of trust.' },

    { t: 'h3', x: 'Vì sao ký "configuration", không ký từng ảnh' },

    { t: 'p', x:
      'FIT cho phép ký ở hai chỗ: trên từng <i>image</i> (kernel, dtb) hoặc trên một <i>configuration</i> (một bộ ' +
      '"kernel này + dtb này"). Ký từng ảnh nghe có vẻ đủ, nhưng mở ra tấn công <b>trộn ghép</b> ' +
      '(<i>mix-and-match</i>): kẻ xấu lấy một kernel cũ có lỗ hổng — vẫn mang chữ ký thật của bạn từ năm ngoái — ' +
      'ghép với dtb mới, và mỗi mảnh đều "hợp lệ". Ký configuration nghĩa là chữ ký bao trùm hash của <b>cả bộ</b> ' +
      'cùng lúc, cộng tên các node; đổi bất kỳ mảnh nào là chữ ký hỏng. Vì vậy khoá công khai trong U-Boot sẽ ' +
      'mang <code>required = "conf"</code>: U-Boot <b>chỉ</b> chấp nhận một configuration có chữ ký hợp lệ.' },

    /* ============================================================
       3. ĐƯỜNG VÒNG
       ============================================================ */
    { t: 'h2', x: 'Chữ ký vô dụng nếu còn đường vòng' },

    { t: 'p', x:
      'U-Boot là một chương trình rất giàu tính năng, và mỗi tính năng là một cánh cửa. Ký FIT chỉ khoá <b>một</b> ' +
      'cửa — lệnh <code>bootm</code> với ảnh FIT. Nếu <code>booti</code> (nạp <code>Image</code> trần, Bài 35) còn ' +
      'đó, kẻ tấn công chỉ cần trỏ <code>extlinux.conf</code> sang một <code>Image</code> trần là chữ ký bị bỏ qua ' +
      'hoàn toàn. Bước 3 sẽ cho bạn thấy đúng điều này xảy ra. Danh sách cửa cần đóng:' },

    { t: 'table',
      head: ['Cửa', 'Tuỳ chọn U-Boot', 'Vì sao phải đóng'],
      rows: [
        ['Nạp kernel trần', '<code>CMD_BOOTI</code>', 'Bỏ qua FIT, nên bỏ qua chữ ký'],
        ['Ảnh uImage cũ', '<code>LEGACY_IMAGE_FORMAT</code>', 'Định dạng không có chữ ký; Kconfig của U-Boot tự cảnh báo điều này'],
        ['Nạp ứng dụng EFI', '<code>EFI_LOADER</code>', 'Một đường boot thứ hai hoàn toàn khác, có cơ chế ký riêng (UEFI Secure Boot) chưa cấu hình'],
        ['Môi trường lưu trong flash', '<code>ENV_IS_IN_FLASH</code> → <code>ENV_IS_NOWHERE</code>', 'Ai sửa được flash là sửa được <code>bootcmd</code>, <code>bootargs</code> (vd. thêm <code>init=/bin/sh</code>)'],
        ['Dấu nhắc <code>=&gt;</code>', '<code>BOOTDELAY=-2</code>', 'Không đếm ngược, không đọc phím: không ai gõ được lệnh'],
        ['Rơi về shell khi boot hỏng', '<code>BOOTCOMMAND="…; poweroff"</code>', 'Boot thất bại thì tắt máy, không để lại dấu nhắc']
      ] },

    { t: 'cal', kind: 'warn', title: 'Đóng cửa có giá: mất khả năng gỡ lỗi',
      x: 'U-Boot không có dấu nhắc nghĩa là chính bạn cũng không vào được để sửa lỗi trên thiết bị đã xuất xưởng. ' +
         'Sản phẩm thật thường build <b>hai</b> cấu hình: bản phát triển (có shell, có <code>booti</code>, khoá ' +
         'thử) và bản sản xuất (khoá chặt, khoá thật). Thermo trong bài dùng một fragment duy nhất cho gọn — trong ' +
         'dự án thật, hãy tách hai defconfig.' },

    /* ============================================================
       4. ROOTFS CHỈ ĐỌC
       ============================================================ */
    { t: 'h2', x: 'Rootfs chỉ đọc, cấu hình vẫn sửa được: overlayfs' },

    { t: 'p', x:
      'Bài 46 đã mount root <code>ro</code> bằng tay, và Bài 48 đã dựng overlayfs trên SquashFS. Ở đây cùng hai ý ' +
      'đó trở thành chính sách của sản phẩm, với ba lý do đi cùng nhau:' },

    { t: 'list', items: [
      '<b>Toàn vẹn:</b> mã độc không thể tự ghi vào <code>/usr/bin</code> để sống sót qua lần khởi động lại. ' +
        '(Một kẻ có root vẫn có thể <code>mount -o remount,rw</code> — chỉ đọc là một lớp phòng thủ, không phải ' +
        'bức tường; <code>dm-verity</code> mới khiến việc sửa rootfs bị <i>phát hiện</i>.)',
      '<b>Chịu mất điện:</b> một filesystem không bao giờ được ghi thì không bao giờ hỏng giữa chừng khi rút điện — ' +
        'điều Bài 69 sẽ cần cho cập nhật an toàn.',
      '<b>Khôi phục cài đặt gốc:</b> mọi thay đổi nằm ở một chỗ riêng; xoá chỗ đó là về đúng trạng thái xuất xưởng.'
    ] },

    { t: 'p', x:
      'Vấn đề là một hệ thống Linux luôn muốn ghi <i>đâu đó</i>: log, PID file, hạt giống số ngẫu nhiên, tên máy ' +
      'người dùng đặt lại. Lời giải gồm ba loại chỗ ghi, mỗi loại cho một kiểu dữ liệu:' },

    { t: 'table',
      head: ['Loại dữ liệu', 'Ví dụ trong Thermo', 'Đặt ở đâu'],
      rows: [
        ['Mất khi tắt máy cũng được', 'PID file, <code>resolv.conf</code>, log', '<code>tmpfs</code>: <code>/tmp</code>, <code>/run</code> (Buildroot đã trỏ <code>/var/log</code>, <code>/var/run</code> vào đó)'],
        ['Phải giữ qua khởi động lại', 'Hạt giống <code>seedrng</code>', 'Phân vùng ghi được <code>/data</code> (<code>vda2</code>)'],
        ['Cấu hình người dùng sửa', '<code>/etc/hostname</code>', '<b>overlayfs</b> trên <code>/etc</code>: lớp dưới là rootfs, lớp trên ở <code>/data</code>']
      ] },

    { t: 'p', x:
      'Overlayfs (Bài 48 đã dùng) xếp hai thư mục chồng lên nhau và trình ra một cái. Đọc một file: nếu lớp trên ' +
      '(<i>upper</i>) có, lấy từ đó; không thì lấy từ lớp dưới (<i>lower</i>). Ghi một file: kernel chép nó lên ' +
      'lớp trên rồi ghi ở đó (<i>copy-up</i>) — lớp dưới không bao giờ bị chạm. Giống một tấm kính trong đặt lên ' +
      'một tờ giấy in: bạn viết lên kính, nhìn xuống thấy cả hai, nhấc kính ra là tờ giấy nguyên vẹn.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Overlayfs trên /etc: lớp dưới là /etc của rootfs chỉ đọc, lớp trên là /data/etc/upper, file hostname được copy-up khi ghi">' +
        '<rect class="d-box-p" x="20" y="20" width="680" height="54" rx="8"/>' +
        '<text class="d-t" x="40" y="44">/etc mà chương trình nhìn thấy (overlay)</text>' +
        '<text class="d-tm" x="40" y="62">fstab  hostname=thermo-02  inittab  passwd  shadow  …</text>' +
        '<rect class="d-box-g" x="20" y="96" width="680" height="54" rx="8"/>' +
        '<text class="d-t" x="40" y="120">upper: /data/etc/upper  (vda2, ghi được, sống qua reboot)</text>' +
        '<text class="d-tm" x="40" y="138">hostname=thermo-02</text>' +
        '<rect class="d-box" x="20" y="172" width="680" height="54" rx="8"/>' +
        '<text class="d-t" x="40" y="196">lower: /etc của rootfs  (vda1, mount ro, không bao giờ đổi)</text>' +
        '<text class="d-tm" x="40" y="214">fstab  hostname=thermo  inittab  passwd  shadow  …</text>' +
        '<text class="d-ts" x="560" y="138">ghi → copy-up</text>' +
        '</svg>',
      cap: 'Ghi <code>/etc/hostname</code> tạo một bản trong lớp trên; lớp dưới vẫn là <code>thermo</code>. ' +
           'Xoá <code>/data/etc/upper</code> là về cài đặt gốc — rootfs chưa từng bị sửa.' },

    /* ============================================================
       5. BỀ MẶT TẤN CÔNG VÀ BÍ MẬT
       ============================================================ */
    { t: 'h2', x: 'Tối giản bề mặt tấn công' },

    { t: 'p', x:
      'Mỗi chương trình có trên thiết bị là một chỗ có thể có lỗi; mỗi chương trình chạy bằng root là một chỗ lỗi ' +
      'đó biến thành chiếm toàn máy. Nguyên tắc rất đơn giản, và là thứ kiểm tra được bằng lệnh: <b>không có thì ' +
      'không bị khai thác</b>, và <b>chạy với quyền tối thiểu</b> (<i>least privilege</i>).' },

    { t: 'table',
      head: ['Thứ cần thu nhỏ', 'Đo bằng', 'Thermo làm gì'],
      rows: [
        ['Dịch vụ chạy nền', '<code>ps</code>, <code>ls /etc/init.d</code>', 'Bỏ <code>crond</code> và <code>inetd</code> — sản phẩm không dùng'],
        ['Applet BusyBox', 'đếm symlink trỏ tới <code>busybox</code>', 'Fragment BusyBox tắt <code>crond</code>, <code>crontab</code>, <code>inetd</code>, <code>devmem</code>'],
        ['Thiết bị nguy hiểm', '<code>ls -l /dev/mem</code>', '<code># CONFIG_DEVMEM is not set</code> — Bài 56 đã đọc thanh ghi phần cứng qua nó'],
        ['Quyền của daemon', '<code>ps -o user,comm</code>', 'User <code>thermo</code> riêng; <code>mdev</code> cho group <code>thermo</code> đọc <code>/dev/tsensor0</code>'],
        ['Đăng nhập', '<code>/etc/shadow</code>', 'Mật khẩu root dạng hash SHA-512'],
        ['Cổng mạng', '<code>netstat -tlnu</code>', 'Chỉ 9006 — đã gọn sẵn, giữ nguyên']
      ] },

    { t: 'cal', kind: 'info', title: 'setuid: vì sao BusyBox là một trường hợp đặc biệt',
      x: 'Bước 1 sẽ tìm thấy đúng một file setuid: <code>/bin/busybox</code> (quyền <code>4755</code>). Mọi applet ' +
         'là symlink tới nó, nên về lý thuyết <i>mọi</i> applet chạy với quyền root khi một user thường gọi. BusyBox ' +
         'tự hạ quyền cho những applet không cần (<code>CONFIG_FEATURE_SUID</code>), nhưng đó là thêm một chỗ có ' +
         'thể sai. Trên Thermo chỉ có root và <code>thermo</code> đăng nhập được (và <code>thermo</code> không có ' +
         'shell đăng nhập), nên bài giữ nguyên; một sản phẩm có user thường nên bật ' +
         '<code>BR2_PACKAGE_BUSYBOX_INDIVIDUAL_BINARIES</code> để chỉ vài applet mang bit setuid.' },

    { t: 'h2', x: 'Quản lý bí mật' },

    { t: 'p', x:
      'Toàn bộ chain of trust dựa trên một điều: <b>khoá bí mật không bị lộ</b>. Lộ khoá ký nghĩa là kẻ xấu ký ' +
      'được firmware mà mọi thiết bị của bạn đều tin — và trên phần cứng thật, khoá công khai đã đốt vào eFuse ' +
      'thì <b>không thay được</b>. Một khoá bị commit lên Git một lần là coi như lộ vĩnh viễn, kể cả khi bạn xoá ' +
      'commit sau đó.' },

    { t: 'table',
      head: ['Bí mật', 'Không bao giờ để ở', 'Thermo để ở', 'Sản phẩm thật để ở'],
      rows: [
        ['Khoá ký FIT', 'Cây br2-external, ảnh đĩa, máy CI dùng chung', '<code>~/bai68/keys</code> (quyền <code>700</code>/<code>600</code>), truyền qua biến <code>THERMO_KEY_DIR</code>', 'HSM hoặc dịch vụ ký riêng; máy build chỉ gửi hash đi ký'],
        ['Mật khẩu root', 'Dạng chữ rõ trong defconfig', 'Hash <code>$6$…</code> (SHA-512) trong defconfig', 'Không có mật khẩu dùng chung: tắt đăng nhập root, hoặc mật khẩu riêng từng máy'],
        ['Khoá công khai', '(không bí mật, nhưng phải <b>toàn vẹn</b>)', 'Control FDT truyền bằng <code>-dtb</code>', 'Biên dịch <b>vào</b> <code>u-boot.bin</code>, và U-Boot được ROM kiểm tra'],
        ['Bí mật riêng từng máy (khoá TLS, token)', 'Ảnh đĩa chung cho mọi máy', '— (Thermo không có)', 'Sinh trên máy lúc xuất xưởng, cất trong vùng bảo vệ (TPM, OP-TEE, eMMC RPMB)']
      ] },

    { t: 'cal', kind: 'danger', title: 'Mật khẩu chung cho cả lô thiết bị là một lỗ hổng, không phải cấu hình',
      x: 'Hash trong defconfig vẫn là <b>cùng một mật khẩu</b> trên mọi Thermo xuất xưởng: ai dò ra nó một lần ' +
         'là vào được tất cả. Nhiều botnet IoT nổi tiếng lây lan chỉ bằng danh sách mật khẩu mặc định. Bài dùng ' +
         'một mật khẩu chung để bạn đăng nhập được trong QEMU; một sản phẩm thật nên tắt hẳn đăng nhập root qua ' +
         'serial (<code>BR2_TARGET_ENABLE_ROOT_LOGIN</code>) hoặc sinh mật khẩu riêng cho từng máy lúc sản xuất.' },

    /* ============================================================
       6. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: gia cố Thermo từng mắt xích' },

    { t: 'p', x:
      'Bạn làm việc trên một <b>bản sao</b> của cây Thermo, để <code>~/bai67/thermo</code> vẫn là mốc so sánh, và ' +
      'dùng lại cây Buildroot đã tải của Bài 67 (không tải lại gì). Mỗi bước thêm một biện pháp, và luôn kết thúc ' +
      'bằng việc <b>tấn công lại</b> chính bo mạch của bạn — một biện pháp bảo mật chưa bị thử tấn công là một ' +
      'biện pháp chưa được kiểm chứng.' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<code>~/bai67/buildroot-2026.02.3</code> (cùng <code>dl/</code>) và <code>~/bai67/thermo</code> của Bài 67; ' +
         '<code>openssl</code> (Ubuntu 20.04 có sẵn bản 1.1.1f), <code>debugfs</code> và <code>fdtget</code> (đã dùng từ ' +
         'Bài 35 và Bài 43), <code>qemu-system-aarch64</code>. Không cần <code>sudo</code>. Khoảng 5 GB đĩa trống cho ' +
         '<code>~/bai68/out</code>.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Đo hiện trạng: Thermo của Bài 67 hở ở đâu',
        blocks: [
          { t: 'p', x:
            'Chép cây sản phẩm sang thư mục mới, đổi dòng chào để phân biệt hai bản, và cấu hình một thư mục build ' +
            'riêng <code>O=~/bai68/out</code> — giữ nguyên <code>~/bai67/out</code> để đối chiếu:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai68 && cd ~/bai68\n' +
            'cp -a ~/bai67/thermo ~/bai68/thermo\n' +
            "sed -i 's/lesson 67/lesson 68/' thermo/configs/thermo_defconfig\n" +
            'grep ISSUE thermo/configs/thermo_defconfig\n' +
            'cd ~/bai67/buildroot-2026.02.3\n' +
            'make O=~/bai68/out BR2_EXTERNAL=~/bai68/thermo thermo_defconfig > /dev/null; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            'BR2_TARGET_GENERIC_ISSUE="Thermo 1.0 - lesson 68"\n' +
            'rc=0' },

          { t: 'p', x:
            'Dòng <code>ISSUE</code> là chữ in ra trên màn hình đăng nhập, nên từ giờ bạn luôn biết mình đang boot ' +
            'bản nào. <code>rc=0</code> nghĩa là <code>~/bai68/out/.config</code> đã được sinh từ defconfig của cây ' +
            'mới. Giờ build — Buildroot dùng lại <code>dl/</code> nên không tải gì, nhưng vẫn phải biên dịch lại tất cả ' +
            'trong thư mục build mới. Bỏ <code>/mnt/c/…</code> khỏi <code>PATH</code> như Bài 60:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68/out\n' +
            'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
            'time make > build.log 2>&1; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t7m29.239s\n' +
            'user\t52m58.130s\n' +
            'sys\t5m30.464s\n' +
            'rc=0' },

          { t: 'p', x:
            '7 phút rưỡi, gần bằng 6m55s của Bài 67 — cùng cây, cùng máy 16 CPU; con số trên máy bạn tỉ lệ với số ' +
            'CPU. Để thử nghiệm mà không làm bẩn <code>images/</code>, mỗi bước làm trong thư mục riêng với bản sao ' +
            'của ảnh. Tạo thêm một script khởi động nhỏ để khỏi gõ lại dòng QEMU dài của Bài 67 — tham số thứ ba ' +
            '(tuỳ chọn) sẽ cần ở Bước 3:' },

          { t: 'code', where: 'file', name: '~/bai68/run.sh', code:
            '#!/bin/sh\n' +
            '# run.sh UBOOT DISK [CONTROL_DTB] -- boot one Thermo image the way lesson 67 did\n' +
            'UBOOT=${1:?usage: run.sh UBOOT DISK [CONTROL_DTB]}\n' +
            'DISK=${2:?usage: run.sh UBOOT DISK [CONTROL_DTB]}\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '\t-bios "$UBOOT" ${3:+-dtb "$3"} \\\n' +
            '\t-drive file="$DISK",if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
            '\t-netdev user,id=eth0,hostfwd=tcp::19006-:9006 -device virtio-net-device,netdev=eth0\n' },

          { t: 'code', where: 'wsl', code:
            'chmod +x ~/bai68/run.sh\n' +
            'mkdir -p ~/bai68/step1 && cd ~/bai68/step1\n' +
            'cp ../out/images/u-boot.bin ../out/images/disk.img .\n' +
            '~/bai68/run.sh u-boot.bin disk.img' },

          { t: 'cmdx', cmd: '${3:+-dtb "$3"}', rows: [
            ['<code>${3:+…}</code>', 'Mở rộng tham số của shell: nếu <code>$3</code> có giá trị thì thay bằng phần sau dấu <code>+</code>, không thì thay bằng <b>không gì cả</b>.', 'Không truyền tham số thứ ba = không có <code>-dtb</code>, đúng dòng lệnh của Bài 67'],
            ['<code>-dtb "$3"</code>', 'Cây thiết bị QEMU đưa cho chương trình trong flash. Bước 3 dùng nó để đưa <b>khoá công khai</b> cho U-Boot.', 'Bài 36 đã dùng đúng cơ chế này']
          ] },

          { t: 'p', x:
            'Đăng nhập <code>root</code> (Enter, không mật khẩu) rồi gõ lần lượt từng lệnh dưới đây. Mỗi lệnh trả ' +
            'lời một ô trong bảng mô hình mối đe doạ:' },

          { t: 'code', where: 'qemu', name: 'trong Thermo, sau thermo login: root', code:
            'head -n 2 /etc/shadow\n' +
            'grep " / " /proc/mounts\n' +
            'netstat -tlnu\n' +
            'ps -o user,pid,comm\n' +
            'ls -l /dev/mem\n' +
            'find / -xdev -perm -4000\n' +
            'touch /usr/bin/evil && ls -l /usr/bin/evil' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích (bỏ tiếng vọng lệnh và các luồng kernel trong ps)', code:
            '# head -n 2 /etc/shadow\n' +
            'root::::::::\n' +
            'daemon:*:::::::\n' +
            '# grep " / " /proc/mounts\n' +
            '/dev/root / ext4 rw,relatime 0 0\n' +
            '# netstat -tlnu\n' +
            'Active Internet connections (only servers)\n' +
            'Proto Recv-Q Send-Q Local Address           Foreign Address         State\n' +
            'tcp        0      0 0.0.0.0:9006            0.0.0.0:*               LISTEN\n' +
            '# ps -o user,pid,comm\n' +
            '…\n' +
            'root        55 syslogd\n' +
            'root        59 klogd\n' +
            'root        71 mdev\n' +
            'root       114 udhcpc\n' +
            'root       119 crond\n' +
            'root       123 temp_daemon\n' +
            '…\n' +
            '# ls -l /dev/mem\n' +
            'crw-r-----    1 root     root        1,   1 Jan  1  1970 /dev/mem\n' +
            '# find / -xdev -perm -4000\n' +
            '/bin/busybox\n' +
            '# touch /usr/bin/evil && ls -l /usr/bin/evil\n' +
            '-rw-r--r--    1 root     root             0 Nov  3 02:55 /usr/bin/evil' },

          { t: 'cal', kind: 'info', title: 'Đọc từng dòng như một kẻ tấn công',
            x: '<ul>' +
               '<li><code>root::::::::</code> — trường thứ hai (mật khẩu) <b>rỗng</b>: ai cầm cáp serial là có root. ' +
                 'So với <code>daemon:*</code>: dấu <code>*</code> nghĩa là "không đăng nhập được bằng mật khẩu".</li>' +
               '<li><code>/dev/root / ext4 rw</code> — rootfs ghi được, và lệnh <code>touch</code> ngay sau chứng minh ' +
                 'điều đó: <code>/usr/bin/evil</code> xuất hiện, sẽ còn đó sau khi khởi động lại.</li>' +
               '<li><code>0.0.0.0:9006</code> — một cổng duy nhất, mở trên mọi địa chỉ. Gọn — nhưng ' +
                 '<code>temp_daemon</code> giữ nó chạy bằng <b>root</b> (cột <code>USER</code>), cũng như ' +
                 '<code>crond</code> — một dịch vụ Thermo không dùng.</li>' +
               '<li><code>/bin/busybox</code> setuid, <code>/dev/mem</code> tồn tại (major 1, minor 1): hai thứ ' +
                 'Bước 5 sẽ xét lại.</li></ul>' +
               'PID, giờ trong <code>ls -l</code> sẽ khác trên máy bạn. Gõ <code>poweroff</code> để thoát.' },

          { t: 'p', x:
            'Giờ đóng vai kẻ cầm được thẻ nhớ. Ghi lại tổng kiểm tra của ảnh như Bài 67 làm, tìm chuỗi phiên bản ' +
            'kernel bên trong <b>chính file ảnh đĩa</b> (kernel nằm trong <code>/boot</code> của phân vùng ext4, ' +
            'không nén), rồi đổi đúng một byte — chữ <code>o</code> cuối của <code>thermo</code> thành <code>X</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68/step1\n' +
            'sha256sum disk.img > SHA256SUMS\n' +
            "grep -obUa 'Linux version 6.18.45-thermo' disk.img\n" +
            "off=$(grep -obUa 'Linux version 6.18.45-thermo' disk.img | tail -n 1 | cut -d: -f1)\n" +
            "printf 'X' | dd of=disk.img bs=1 seek=$((off + 27)) conv=notrunc status=none\n" +
            'cmp -l ../out/images/disk.img disk.img\n' +
            'sha256sum -c SHA256SUMS; echo rc=$?' },

          { t: 'cmdx', cmd: "grep -obUa PATTERN FILE · dd of=FILE bs=1 seek=N conv=notrunc", rows: [
            ['<code>grep -o -b</code>', 'In <b>chỉ</b> phần khớp (<code>-o</code>) kèm vị trí byte của nó trong file (<code>-b</code>).', 'Vị trí tính từ 0'],
            ['<code>-U -a</code>', 'Coi file nhị phân như văn bản và không đổi ký tự xuống dòng — bắt buộc với ảnh đĩa.', 'Thiếu <code>-a</code>: chỉ in <code>Binary file matches</code>'],
            ['<code>$((off + 27))</code>', '"Linux version 6.18.45-therm" dài 27 ký tự, nên byte thứ 27 là chữ <code>o</code>.', ''],
            ['<code>dd … bs=1 seek=N conv=notrunc</code>', 'Ghi 1 byte vào đúng vị trí N, <b>không</b> cắt phần còn lại của file.', 'Thiếu <code>notrunc</code>: file bị cắt cụt tại N']
          ] },

          { t: 'code', where: 'out', nocopy: true, code:
            '16624264:Linux version 6.18.45-thermo\n' +
            '17264928:Linux version 6.18.45-thermo\n' +
            ' 17264956 157 130\n' +
            'disk.img: FAILED\n' +
            'sha256sum: WARNING: 1 computed checksum did NOT match\n' +
            'rc=1' },

          { t: 'p', x:
            'Chuỗi xuất hiện hai lần trong kernel; lệnh dùng bản thứ hai (<code>tail -n 1</code>) — đó là bản ' +
            'kernel in ra khi boot. <code>cmp -l</code> xác nhận đúng <b>một</b> byte khác: vị trí 17 264 956 (đếm từ ' +
            '1), giá trị bát phân 157 (<code>o</code>) thành 130 (<code>X</code>). <code>sha256sum -c</code> phát hiện ' +
            'ngay. Nhưng không ai trên bo mạch chạy <code>sha256sum</code> cả — hãy boot nó:' },

          { t: 'code', where: 'wsl', code: '~/bai68/run.sh u-boot.bin disk.img' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích', code:
            'Retrieving file: /boot/Image\n' +
            'Retrieving file: /boot/thermo.dtb\n' +
            'Starting kernel ...\n' +
            '[    0.000000] Linux version 6.18.45-thermX (cah8hc@HC-C-005W7) (aarch64-linux-gcc.br_real (Buildroot 2021.11-18033-g83947c7bb6) 14.3.0, GNU ld (GNU Binutils) 2.43.1) #1 SMP Tue Nov  3 09:53:26 +07 2026\n' +
            '…\n' +
            'thermo login:' },

          { t: 'cal', kind: 'warn', title: 'Kernel đã bị sửa, bo mạch không hề biết',
            x: '<code>6.18.45-thermX</code> là bằng chứng kernel đang chạy <b>chính là</b> bản bạn vừa sửa — và U-Boot ' +
               'không in một dòng cảnh báo nào. Một byte trong chuỗi chữ là vô hại; một byte trong mã máy, đặt đúng ' +
               'chỗ, có thể tắt kiểm tra mật khẩu. Đây là điều Bài 67 hứa sẽ đo: <b>"sửa một byte có còn boot được ' +
               'không?" — có</b>. (Chuỗi <code>cah8hc@HC-C-005W7</code> và ngày build là của máy soạn bài.)' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Ký kernel và Device Tree thành một ảnh FIT, ngay trong Buildroot',
        blocks: [
          { t: 'p', x:
            'Đầu tiên là khoá. Khoá bí mật <b>không</b> nằm trong cây <code>thermo/</code> (cây đó sẽ lên Git), mà ở ' +
            'một thư mục riêng chỉ chủ sở hữu đọc được:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68\n' +
            'mkdir -m 700 keys\n' +
            'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/thermo-dev.key\n' +
            'openssl req -batch -new -x509 -key keys/thermo-dev.key -subj /CN=thermo-dev -days 3650 -out keys/thermo-dev.crt\n' +
            'chmod 600 keys/thermo-dev.key\n' +
            'ls -la keys' },

          { t: 'cmdx', cmd: 'openssl genpkey … / openssl req -new -x509 …', rows: [
            ['<code>genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048</code>', 'Sinh một cặp khoá RSA 2048 bit; file <code>.key</code> chứa cả phần bí mật.', 'Đúng thuật toán <code>rsa2048</code> mà FIT sẽ khai báo'],
            ['<code>req -new -x509 … -days 3650</code>', 'Gói <b>phần công khai</b> vào một chứng chỉ tự ký, hạn 10 năm.', '<code>mkimage</code> đọc khoá công khai từ file <code>.crt</code> cùng tên'],
            ['<code>-batch -subj /CN=thermo-dev</code>', 'Không hỏi gì (không có dấu nhắc nào chặn script), tên chứng chỉ ghi luôn.', ''],
            ['<code>mkdir -m 700</code>, <code>chmod 600</code>', 'Chỉ bạn đọc được thư mục và khoá.', 'Thói quen tối thiểu với mọi bí mật']
          ] },

          { t: 'code', where: 'out', nocopy: true, code:
            '............................+++++\n' +
            '........+++++\n' +
            'total 16\n' +
            'drwx------ 2 cah8hc cah8hc 4096 Nov  3 09:58 .\n' +
            'drwxr-xr-x 7 cah8hc cah8hc 4096 Nov  3 09:58 ..\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1115 Nov  3 09:58 thermo-dev.crt\n' +
            '-rw------- 1 cah8hc cah8hc 1704 Nov  3 09:58 thermo-dev.key' },

          { t: 'p', x:
            'Hai dòng <code>+++++</code> là openssl đang tìm hai số nguyên tố (độ dài khác nhau mỗi lần chạy). Quyền ' +
            '<code>-rw-------</code> trên <code>.key</code> và <code>drwx------</code> trên thư mục là thứ cần thấy; ' +
            '<code>.crt</code> để <code>644</code> là được, nó không bí mật. Tiếp theo là file mô tả FIT. Khác với ' +
            'Bài 36, chữ ký nằm trong node <b>configuration</b>, bao trùm cả kernel lẫn dtb:' },

          { t: 'code', where: 'file', name: '~/bai68/thermo/board/thermo/thermo.its', code:
            '/dts-v1/;\n' +
            '\n' +
            '/ {\n' +
            '\tdescription = "Thermo kernel + device tree, signed";\n' +
            '\t#address-cells = <1>;\n' +
            '\n' +
            '\timages {\n' +
            '\t\tkernel {\n' +
            '\t\t\tdescription = "Linux 6.18.45-thermo";\n' +
            '\t\t\tdata = /incbin/("Image");\n' +
            '\t\t\ttype = "kernel";\n' +
            '\t\t\tarch = "arm64";\n' +
            '\t\t\tos = "linux";\n' +
            '\t\t\tcompression = "none";\n' +
            '\t\t\tload = <0x42000000>;\n' +
            '\t\t\tentry = <0x42000000>;\n' +
            '\t\t\thash-1 {\n' +
            '\t\t\t\talgo = "sha256";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\t\tfdt {\n' +
            '\t\t\tdescription = "thermo.dtb";\n' +
            '\t\t\tdata = /incbin/("thermo.dtb");\n' +
            '\t\t\ttype = "flat_dt";\n' +
            '\t\t\tarch = "arm64";\n' +
            '\t\t\tcompression = "none";\n' +
            '\t\t\thash-1 {\n' +
            '\t\t\t\talgo = "sha256";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\t};\n' +
            '\n' +
            '\tconfigurations {\n' +
            '\t\tdefault = "conf-1";\n' +
            '\t\tconf-1 {\n' +
            '\t\t\tdescription = "Thermo board";\n' +
            '\t\t\tkernel = "kernel";\n' +
            '\t\t\tfdt = "fdt";\n' +
            '\t\t\tsignature-1 {\n' +
            '\t\t\t\talgo = "sha256,rsa2048";\n' +
            '\t\t\t\tkey-name-hint = "thermo-dev";\n' +
            '\t\t\t\tsign-images = "kernel", "fdt";\n' +
            '\t\t\t};\n' +
            '\t\t};\n' +
            '\t};\n' +
            '};\n' },

          { t: 'table',
            head: ['Thuộc tính', 'Ý nghĩa', 'Vì sao giá trị này'],
            rows: [
              ['<code>load = &lt;0x42000000&gt;</code>', 'U-Boot chép kernel ra đây rồi nhảy vào', 'Khác <code>kernel_addr_r</code> = <code>0x40400000</code>, nơi cả file FIT được nạp — trùng nhau là lỗi <code>overwritten</code> Bài 36 đã gặp'],
              ['<code>hash-1 { algo = "sha256"; }</code>', 'Hash của từng ảnh', 'Chữ ký configuration ký <b>các hash này</b>, không ký lại 13 MB dữ liệu'],
              ['<code>signature-1</code> trong <code>conf-1</code>', 'Chữ ký trên cả bộ kernel + fdt', 'Chống trộn ghép (phần lý thuyết)'],
              ['<code>key-name-hint = "thermo-dev"</code>', '<code>mkimage</code> tìm <code>thermo-dev.key</code>/<code>.crt</code> trong thư mục khoá', 'Cũng là tên node khoá trong U-Boot ở Bước 3']
            ] },

          { t: 'p', x:
            'Ai chạy <code>mkimage</code>? Một <b>post-build script</b> (Bài 61) — chạy sau khi rootfs đã đủ file, trước ' +
            'khi đóng thành ext4. Nó lấy <code>Image</code> và <code>thermo.dtb</code> từ <code>images/</code>, ký, đặt ' +
            '<code>thermo.itb</code> vào <code>/boot</code> và <b>xoá</b> kernel/dtb trần khỏi rootfs. Đường dẫn khoá đi ' +
            'qua biến môi trường, và script từ chối chạy nếu thiếu:' },

          { t: 'code', where: 'file', name: '~/bai68/thermo/board/thermo/post-build.sh (phần ký)', code:
            '#!/bin/sh\n' +
            '# post-build.sh TARGET_DIR -- wrap Image + thermo.dtb into a signed FIT inside the rootfs.\n' +
            '# The private key never enters this tree: it is read from $THERMO_KEY_DIR.\n' +
            'set -eu\n' +
            'TARGET=${1:?usage: post-build.sh TARGET_DIR}\n' +
            'BOARD=$(dirname "$0")\n' +
            'KEY_DIR=${THERMO_KEY_DIR:?set THERMO_KEY_DIR to the directory holding thermo-dev.key}\n' +
            'MKIMAGE=$(ls "$BUILD_DIR"/uboot-*/tools/mkimage | head -n 1)\n' +
            '\n' +
            '[ -r "$KEY_DIR/thermo-dev.key" ] || { echo "post-build: no key in $KEY_DIR" >&2; exit 1; }\n' +
            '\n' +
            'WORK=$BUILD_DIR/thermo-fit\n' +
            'rm -rf "$WORK"\n' +
            'mkdir -p "$WORK"\n' +
            'cp "$BOARD/thermo.its" "$BINARIES_DIR/Image" "$BINARIES_DIR/thermo.dtb" "$WORK/"\n' +
            '"$MKIMAGE" -f "$WORK/thermo.its" -k "$KEY_DIR" "$WORK/thermo.itb"\n' +
            '\n' +
            '# the board only ever boots the signed FIT: no loose kernel or DTB in /boot\n' +
            'cp "$WORK/thermo.itb" "$TARGET/boot/thermo.itb"\n' +
            'cp "$WORK/thermo.itb" "$BINARIES_DIR/thermo.itb"\n' +
            'rm -f "$TARGET/boot/Image" "$TARGET/boot/thermo.dtb"\n' },

          { t: 'cmdx', cmd: 'post-build.sh — những dòng đáng chú ý', rows: [
            ['<code>${THERMO_KEY_DIR:?…}</code>', 'Biến chưa đặt thì dừng với thông báo, không chạy tiếp với đường dẫn rỗng.', 'Một biến quên đặt không bao giờ trở thành đường dẫn rỗng'],
            ['<code>$BUILD_DIR</code>, <code>$BINARIES_DIR</code>', 'Buildroot xuất sẵn các biến này cho post-build: <code>out/build</code> và <code>out/images</code>.', 'Không cần đoán đường dẫn'],
            ['<code>uboot-*/tools/mkimage</code>', '<code>mkimage</code> 2026.01 build cùng U-Boot của sản phẩm.', 'Không dùng <code>mkimage</code> 2021.01 của Ubuntu: một công cụ, một phiên bản, cùng nguồn với bên kiểm tra'],
            ['<code>-k "$KEY_DIR"</code>', 'Thư mục khoá: ký mọi node <code>signature-*</code> trong lúc build FIT.', 'Không có <code>-K</code>/<code>-r</code> như Bài 36 — khoá công khai đi vào U-Boot ở Bước 3'],
            ['<code>rm -f …/boot/Image …/boot/thermo.dtb</code>', 'Rootfs không còn kernel trần.', 'Bước 3 sẽ cho thấy vì sao như vậy vẫn chưa đủ']
          ] },

          { t: 'p', x:
            '<code>extlinux.conf</code> trỏ cả <code>kernel</code> lẫn <code>fdt</code> vào cùng một file FIT — ' +
            '<code>boot/pxe_utils.c</code> của U-Boot hiểu "cùng nhãn" nghĩa là lấy dtb từ trong FIT. Thêm dòng ' +
            'post-build vào defconfig, ngay trước dòng post-image:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68/thermo\n' +
            "cat > board/thermo/overlay/boot/extlinux/extlinux.conf <<'EOF'\n" +
            'label thermo\n' +
            '\tkernel /boot/thermo.itb\n' +
            '\tfdt /boot/thermo.itb\n' +
            '\tappend root=/dev/vda1 rootwait console=ttyAMA0\n' +
            'EOF\n' +
            "sed -i '/^BR2_ROOTFS_POST_IMAGE_SCRIPT=/i BR2_ROOTFS_POST_BUILD_SCRIPT=\"$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/post-build.sh\"' configs/thermo_defconfig\n" +
            'chmod +x board/thermo/post-build.sh\n' +
            'grep -n POST configs/thermo_defconfig\n' +
            'cd ~/bai68/out && make thermo_defconfig > /dev/null\n' +
            'make > b2.log 2>&1; echo rc=$?; grep -a THERMO_KEY b2.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '12:BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/post-build.sh"\n' +
            '13:BR2_ROOTFS_POST_IMAGE_SCRIPT="support/scripts/genimage.sh"\n' +
            '14:BR2_ROOTFS_POST_SCRIPT_ARGS="-c $(BR2_EXTERNAL_THERMO_PATH)/board/thermo/genimage.cfg"\n' +
            'rc=2\n' +
            '/home/cah8hc/bai68/thermo/board/thermo/post-build.sh: 7: THERMO_KEY_DIR: set THERMO_KEY_DIR to the directory holding thermo-dev.key' },

          { t: 'p', x:
            'Thất bại có chủ đích: không có khoá thì <b>không có ảnh</b>, thay vì lặng lẽ giao một ảnh không ký. Số ' +
            '<code>7</code> là dòng của script. Truyền biến trên dòng lệnh <code>make</code> (Buildroot chuyển nó ' +
            'xuống môi trường của post-build):' },

          { t: 'code', where: 'wsl', code:
            'make THERMO_KEY_DIR=$HOME/bai68/keys > b2.log 2>&1; echo rc=$?\n' +
            "grep -a -A40 'Executing post-build' b2.log | grep -a -E 'FIT desc|Image [01]|Data Size|Hash value|Sign algo|Signature written'\n" +
            'ls -l images/thermo.itb target/boot' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            'FIT description: Thermo kernel + device tree, signed\n' +
            ' Image 0 (kernel)\n' +
            '  Data Size:    13302272 Bytes = 12990.50 KiB = 12.69 MiB\n' +
            '  Hash value:   cc3d575a6d236dcdd9a4b9ebe797d3558d7e74ce9748ba61326bf514740f99df\n' +
            ' Image 1 (fdt)\n' +
            '  Data Size:    7094 Bytes = 6.93 KiB = 0.01 MiB\n' +
            '  Hash value:   491e689451d9f5a9915787409e46d2afb75145373271453deceb6cedf02fc901\n' +
            '  Sign algo:    sha256,rsa2048:thermo-dev\n' +
            "Signature written to '/home/cah8hc/bai68/out/build/thermo-fit/thermo.itb', node '/configurations/conf-1/signature-1'\n" +
            '-rw-r--r-- 1 cah8hc cah8hc 13311494 Nov  3 09:59 images/thermo.itb\n' +
            '\n' +
            'target/boot:\n' +
            'total 13004\n' +
            'drwxr-xr-x 2 cah8hc cah8hc     4096 Oct 31 20:28 extlinux\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 13311494 Nov  3 09:59 thermo.itb' },

          { t: 'cal', kind: 'info', title: 'Đọc kết quả của mkimage',
            x: 'Lần build này chỉ mất <b>6,4 s</b>: Buildroot chỉ chạy lại các bước cuối (post-build, ext4, genimage). ' +
               'Hai <code>Data Size</code> khớp đúng <code>Image</code> (13 302 272 B) và <code>thermo.dtb</code> ' +
               '(7 094 B) của Bài 67. <code>thermo.itb</code> = 13 311 494 B, tức chỉ hơn tổng hai file 2 128 byte — đủ ' +
               'cho cấu trúc cây, hai hash và chữ ký 256 byte. <code>Sign algo: sha256,rsa2048:thermo-dev</code> và ' +
               'dòng <code>Signature written … conf-1/signature-1</code> xác nhận chữ ký nằm đúng node configuration. ' +
               '<code>/boot</code> giờ chỉ còn <code>thermo.itb</code>. Hai hash value sẽ khác trên máy bạn (ngày build ' +
               'nằm trong kernel).' },

          { t: 'p', x:
            'Thermo giờ boot một ảnh có chữ ký. Hãy kiểm tra xem điều đó có thay đổi được gì với U-Boot <b>hiện tại</b> ' +
            '— chưa ai đưa khoá công khai cho nó:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai68/step2 && cd ~/bai68/step2\n' +
            'cp ../out/images/u-boot.bin ../out/images/disk.img .\n' +
            '~/bai68/run.sh u-boot.bin disk.img' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích phần U-Boot (bỏ các dòng mô tả ảnh)', code:
            'Retrieving file: /boot/thermo.itb\n' +
            'append: root=/dev/vda1 rootwait console=ttyAMA0\n' +
            '## Loading kernel (any) from FIT Image at 40400000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... OK\n' +
            "   Trying 'kernel' kernel subimage\n" +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '## Loading fdt (any) from FIT Image at 40400000 ...\n' +
            "   Using 'conf-1' configuration\n" +
            '   Verifying Hash Integrity ... OK\n' +
            "   Trying 'fdt' fdt subimage\n" +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '   Booting using the fdt blob at 0x410afbc8\n' +
            '   Loading Kernel Image to 42000000\n' +
            '…\n' +
            'Starting kernel ...' },

          { t: 'p', x:
            'Chú ý dòng đầu tiên sau <code>Using \'conf-1\' configuration</code>: <code>Verifying Hash Integrity ... OK</code> ' +
            '<b>không có tên thuật toán</b> — U-Boot nhìn thấy node chữ ký nhưng không có khoá nào để kiểm, nên bỏ qua. ' +
            'Chỉ <code>sha256+</code> của từng ảnh được kiểm. Để chắc chắn đây là lỗ hổng, đóng vai kẻ tấn công: build ' +
            'một FIT từ kernel bị sửa, <b>bỏ hẳn</b> node chữ ký (kẻ xấu không có khoá của bạn), rồi thay vào ảnh đĩa ' +
            'bằng <code>debugfs</code> như Bài 35 — không cần <code>sudo</code>, không cần mount:' },

          { t: 'code', where: 'wsl', code:
            'MKIMAGE=~/bai68/out/build/uboot-2026.01/tools/mkimage\n' +
            'mkdir -p ~/bai68/evil && cd ~/bai68/evil\n' +
            'cp ~/bai68/out/images/Image ~/bai68/out/images/thermo.dtb .\n' +
            "off=$(grep -obUa 'Linux version 6.18.45-thermo' Image | tail -n 1 | cut -d: -f1)\n" +
            "printf 'X' | dd of=Image bs=1 seek=$((off + 27)) conv=notrunc status=none\n" +
            "sed '/signature-1 {/,/};/d' ~/bai68/thermo/board/thermo/thermo.its > evil.its\n" +
            'grep -c signature evil.its\n' +
            '$MKIMAGE -f evil.its thermo.itb > /dev/null; echo rc=$?\n' +
            'cd ~/bai68/step2\n' +
            'cp ../out/images/disk.img evil.img\n' +
            "printf 'cd /boot\\nrm thermo.itb\\nwrite %s thermo.itb\\n' ~/bai68/evil/thermo.itb > evil.cmds\n" +
            "debugfs -w -f evil.cmds 'evil.img?offset=512'\n" +
            '~/bai68/run.sh u-boot.bin evil.img' },

          { t: 'cmdx', cmd: "debugfs -w -f evil.cmds 'evil.img?offset=512'", rows: [
            ['<code>-w</code>', 'Mở filesystem để ghi.', 'Bài 35 đã dùng; không cần quyền root vì chỉ là một file'],
            ['<code>-f evil.cmds</code>', 'Đọc lệnh từ file, mỗi dòng một lệnh, trong <b>một</b> phiên.', '<code>cd</code> ở dòng 1 có hiệu lực cho các dòng sau'],
            ['<code>write SRC thermo.itb</code>', 'Chép file từ WSL vào thư mục hiện tại của filesystem.', 'Tên đích phải là tên trần — xem <code>Lỗi thường gặp</code>'],
            ["<code>'evil.img?offset=512'</code>", 'Filesystem bắt đầu ở byte 512 của ảnh đĩa: phân vùng 1 bắt đầu từ sector 1 (<code>fdisk -l</code>, Bài 67).', 'Dấu nháy đơn để shell không hiểu <code>?</code> là ký tự đại diện']
          ] },

          { t: 'code', where: 'out', nocopy: true, name: 'trích', code:
            '0\n' +
            'rc=0\n' +
            'debugfs 1.45.5 (07-Jan-2020)\n' +
            'debugfs: cd /boot\n' +
            'debugfs: rm thermo.itb\n' +
            'debugfs: write /home/cah8hc/bai68/evil/thermo.itb thermo.itb\n' +
            'Allocated inode: 92\n' +
            '…\n' +
            'Retrieving file: /boot/thermo.itb\n' +
            '   Verifying Hash Integrity ... OK\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            '   Verifying Hash Integrity ... OK\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            'Starting kernel ...\n' +
            '[    0.000000] Linux version 6.18.45-thermX (cah8hc@HC-C-005W7) …\n' +
            'thermo login:' },

          { t: 'cal', kind: 'warn', title: 'Ký mà không kiểm = không ký',
            x: '<code>grep -c</code> in <code>0</code>: FIT của kẻ tấn công không có chữ ký nào. Hash của nó đúng ' +
               '(<code>sha256+ OK</code>) — vì kẻ tấn công tự tính hash cho kernel của họ, đúng như phần lý thuyết nói. ' +
               'Kết quả: <code>thermX</code> boot y như ảnh thật. Bước này tốn công ký mà <b>chưa bảo vệ được gì</b>, vì ' +
               'mắt xích "bên kiểm tra có khoá công khai và <i>bắt buộc</i> kiểm" còn thiếu.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Đưa khoá công khai cho U-Boot, rồi tấn công lại bằng bốn ảnh giả',
        blocks: [
          { t: 'p', x:
            'U-Boot của Thermo lấy cây thiết bị điều khiển (<i>control FDT</i>) từ QEMU — <code>qemu_arm64</code> bật ' +
            '<code>CONFIG_OF_BOARD=y</code>, đúng như Bài 36 đã khai thác. Vậy khoá công khai đi vào bằng đường đó: ' +
            'dump cây QEMU với <b>đúng</b> dòng lệnh sẽ boot (bẫy <code>dumpdtb</code> của Bài 36), rồi thêm node khoá ' +
            'bằng <code>fdt_add_pubkey</code>, một công cụ build sẵn cùng U-Boot 2026.01:' },

          { t: 'code', where: 'wsl', code:
            'T=~/bai68/out/build/uboot-2026.01/tools\n' +
            'mkdir -p ~/bai68/step3 && cd ~/bai68/step3\n' +
            'cp ../step2/u-boot.bin ../step2/disk.img .\n' +
            'qemu-system-aarch64 -M virt,dumpdtb=qemu.dtb -cpu cortex-a57 -m 512 -nographic -bios u-boot.bin \\\n' +
            '  -drive file=disk.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
            '  -netdev user,id=eth0,hostfwd=tcp::19006-:9006 -device virtio-net-device,netdev=eth0\n' +
            'cp qemu.dtb control.dtb\n' +
            '$T/fdt_add_pubkey -a sha256,rsa2048 -k ~/bai68/keys -n thermo-dev -r conf control.dtb; echo rc=$?\n' +
            'fdtget -l control.dtb /signature\n' +
            'fdtget control.dtb /signature/key-thermo-dev required\n' +
            'fdtget control.dtb /signature/key-thermo-dev algo' },

          { t: 'cmdx', cmd: 'fdt_add_pubkey -a sha256,rsa2048 -k ~/bai68/keys -n thermo-dev -r conf control.dtb', rows: [
            ['<code>-a sha256,rsa2048</code>', 'Thuật toán, phải khớp <code>algo</code> trong <code>signature-1</code>.', ''],
            ['<code>-k ~/bai68/keys -n thermo-dev</code>', 'Đọc <code>thermo-dev.crt</code> — chỉ phần <b>công khai</b>.', 'Công cụ này không cần và không đụng tới <code>.key</code>'],
            ['<code>-r conf</code>', 'Ghi <code>required = "conf"</code>: U-Boot <b>bắt buộc</b> mọi configuration phải có chữ ký đúng của khoá này.', 'Thiếu <code>-r</code>: khoá chỉ dùng để kiểm "nếu có", ảnh không ký vẫn qua'],
            ['<code>control.dtb</code>', 'Sửa tại chỗ: thêm node <code>/signature/key-thermo-dev</code>.', 'Bài 36 làm việc này bằng <code>mkimage -K … -r</code> lúc ký; tách riêng thì máy giữ khoá bí mật không cần biết gì về U-Boot']
          ] },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            'key-thermo-dev\n' +
            'conf\n' +
            'sha256,rsa2048' },

          { t: 'p', x:
            'Lệnh QEMU đầu tiên chỉ ghi <code>qemu.dtb</code> rồi thoát ngay (không boot). Ba dòng <code>fdtget</code> xác ' +
            'nhận node khoá tồn tại, mang <code>required = "conf"</code> và đúng thuật toán. Trước khi boot, kiểm chữ ký ' +
            'ngay trên WSL bằng <code>fit_check_sign</code> — cùng mã kiểm tra với U-Boot, chạy trên host — cho ảnh thật ' +
            'và ảnh của kẻ tấn công ở Bước 2:' },

          { t: 'code', where: 'wsl', code:
            '$T/fit_check_sign -f ../out/images/thermo.itb -k control.dtb | head -n 2; echo rc=${PIPESTATUS[0]}\n' +
            '$T/fit_check_sign -f ../evil/thermo.itb -k control.dtb | head -n 4; echo rc=${PIPESTATUS[0]}' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Signature check OK\n' +
            "Verifying Hash Integrity for node 'conf-1'... sha256,rsa2048:thermo-dev+\n" +
            'rc=0\n' +
            'Signature check bad (error 1)\n' +
            "Verifying Hash Integrity for node 'conf-1'...  error!\n" +
            "No 'signature' subnode found for '(null)' hash node in 'conf-1' config node\n" +
            "Failed to verify required signature 'key-thermo-dev'\n" +
            'rc=1' },

          { t: 'p', x:
            '<code>rc=0</code> / <code>rc=1</code>: cùng một khoá công khai phân biệt được hai ảnh mà Bước 2 không phân ' +
            'biệt. <code>${PIPESTATUS[0]}</code> lấy mã thoát của lệnh <i>trước</i> ống <code>| head</code>, không phải ' +
            'của <code>head</code>. Giờ chuẩn bị thêm hai ảnh giả thông minh hơn, để mỗi ảnh thử một cách vượt rào:' },

          { t: 'list', items: [
            '<code>flip.img</code> — ảnh thật, sửa một byte bên trong <code>thermo.itb</code> (kẻ tấn công lười).',
            '<code>forged.img</code> — FIT có chữ ký, nhưng ký bằng <b>một khoá RSA khác</b> cùng tên <code>thermo-dev</code> ' +
              '(kẻ tấn công biết cách ký, chỉ không có khoá của bạn).',
            '<code>bypass.img</code> — không đụng FIT, chép thêm <code>Image</code> + <code>thermo.dtb</code> trần (đã sửa ' +
              'byte) vào <code>/boot</code> và trỏ <code>extlinux.conf</code> sang chúng (kẻ tấn công đọc kỹ U-Boot).'
          ] },

          { t: 'code', where: 'wsl', code:
            'MK=$T/mkimage\n' +
            '# flip: one byte inside the signed FIT\n' +
            'cp ../out/images/disk.img flip.img\n' +
            "off=$(grep -obUa 'Linux version 6.18.45-thermo' flip.img | tail -n 1 | cut -d: -f1)\n" +
            "printf 'X' | dd of=flip.img bs=1 seek=$((off + 27)) conv=notrunc status=none\n" +
            '# forged: signed with the attacker\'s own key\n' +
            'cd ~/bai68/evil && mkdir -p -m 700 keys\n' +
            'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/thermo-dev.key 2>/dev/null\n' +
            '$MK -f ~/bai68/thermo/board/thermo/thermo.its -k keys signed.itb | grep "Sign algo"\n' +
            'cd ~/bai68/step3\n' +
            'cp ../out/images/disk.img forged.img\n' +
            "printf 'cd /boot\\nrm thermo.itb\\nwrite %s thermo.itb\\n' ~/bai68/evil/signed.itb > forged.cmds\n" +
            "debugfs -w -f forged.cmds 'forged.img?offset=512' > /dev/null 2>&1\n" +
            '# bypass: raw kernel + extlinux.conf pointing at it\n' +
            "printf 'label thermo\\n\\tkernel /boot/Image\\n\\tfdt /boot/thermo.dtb\\n\\tappend root=/dev/vda1 rootwait console=ttyAMA0\\n' > ~/bai68/evil/extlinux.conf\n" +
            'cp ../out/images/disk.img bypass.img\n' +
            "printf 'cd /boot\\nwrite %s/Image Image\\nwrite %s/thermo.dtb thermo.dtb\\ncd extlinux\\nrm extlinux.conf\\nwrite %s/extlinux.conf extlinux.conf\\n' ~/bai68/evil ~/bai68/evil ~/bai68/evil > bypass.cmds\n" +
            "debugfs -w -f bypass.cmds 'bypass.img?offset=512' > /dev/null 2>&1\n" +
            "debugfs -R 'ls -l /boot' 'bypass.img?offset=512' 2>/dev/null" },

          { t: 'code', where: 'out', nocopy: true, code:
            '  Sign algo:    sha256,rsa2048:thermo-dev\n' +
            '     89   40755 (2)      0      0    1024  3-Nov-2026 09:59 .\n' +
            '      2   40755 (2)      0      0    1024  3-Nov-2026 09:59 ..\n' +
            '     90   40755 (2)      0      0    1024 31-Oct-2026 20:28 extlinux\n' +
            '     92  100644 (1)      0      0   13311494  3-Nov-2026 09:59 thermo.itb\n' +
            '    432  100644 (1)      0      0   13302272  3-Nov-2026 10:03 Image\n' +
            '    433  100755 (1)      0      0    7094  3-Nov-2026 10:03 thermo.dtb' },

          { t: 'p', x:
            '<code>Sign algo … thermo-dev</code>: ảnh giả mạo trông <b>giống hệt</b> ảnh thật về mặt hình thức — cùng tên ' +
            'khoá, cùng thuật toán. <code>debugfs ls</code> cho thấy <code>bypass.img</code> giờ có cả ' +
            '<code>thermo.itb</code> nguyên vẹn lẫn <code>Image</code>/<code>thermo.dtb</code> trần (số inode sẽ khác trên ' +
            'máy bạn). Boot cả năm ảnh, lần này thêm <code>control.dtb</code> làm tham số thứ ba của <code>run.sh</code>; ' +
            'mỗi lần thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>X</kbd> hoặc <code>poweroff</code>:' },

          { t: 'code', where: 'wsl', code:
            '~/bai68/run.sh u-boot.bin disk.img control.dtb\n' +
            '~/bai68/run.sh u-boot.bin ../step2/evil.img control.dtb\n' +
            '~/bai68/run.sh u-boot.bin flip.img control.dtb\n' +
            '~/bai68/run.sh u-boot.bin forged.img control.dtb\n' +
            '~/bai68/run.sh u-boot.bin bypass.img control.dtb' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích từ năm lần boot (chỉ các dòng kiểm tra)', code:
            '=== disk.img (ảnh thật)\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:thermo-dev+ OK\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            'Starting kernel ...\n' +
            'thermo login:\n' +
            '=== evil.img (không ký)\n' +
            '   Verifying Hash Integrity ...  error!\n' +
            "No 'signature' subnode found for '<NULL>' hash node in 'conf-1' config node\n" +
            "Failed to verify required signature 'key-thermo-dev'\n" +
            'Bad Data Hash\n' +
            'ERROR -2: can\'t get kernel image!\n' +
            '=>\n' +
            '=== flip.img (sửa 1 byte trong FIT)\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:thermo-dev+ OK\n' +
            '   Verifying Hash Integrity ... sha256 error!\n' +
            "Bad hash value for 'hash-1' hash node in 'kernel' image node\n" +
            'Bad Data Hash\n' +
            'ERROR -2: can\'t get kernel image!\n' +
            '=>\n' +
            '=== forged.img (ký bằng khoá khác)\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:thermo-dev-  error!\n' +
            "Failed to verify required signature 'key-thermo-dev'\n" +
            'Bad Data Hash\n' +
            'ERROR -2: can\'t get kernel image!\n' +
            '=>\n' +
            '=== bypass.img (Image trần qua extlinux.conf)\n' +
            'Retrieving file: /boot/Image\n' +
            'Retrieving file: /boot/thermo.dtb\n' +
            'Starting kernel ...\n' +
            '[    0.000000] Linux version 6.18.45-thermX (cah8hc@HC-C-005W7) …\n' +
            'thermo login:' },

          { t: 'table',
            head: ['Ảnh', 'Dòng quyết định', 'Ý nghĩa'],
            rows: [
              ['thật', '<code>sha256,rsa2048:thermo-dev+ OK</code>', 'Dấu <code>+</code> = chữ ký đúng; giờ có tên thuật toán, khác hẳn Bước 2'],
              ['không ký', '<code>No \'signature\' subnode</code> → <code>Failed to verify required signature</code>', '<code>required = "conf"</code> làm việc: thiếu chữ ký là từ chối'],
              ['sửa 1 byte', 'chữ ký <code>+ OK</code>, rồi <code>sha256 error!</code>', 'Chữ ký bao trùm <i>hash</i>; hash của dữ liệu không còn khớp → từ chối. Hai lớp phối hợp'],
              ['khoá khác', '<code>thermo-dev-  error!</code>', 'Dấu <code>-</code> = chữ ký có, nhưng không khớp khoá công khai. Cùng tên khoá không lừa được'],
              ['đường vòng', 'không có dòng <code>Verifying</code> nào', '<code>booti</code> nạp <code>Image</code> trần; chữ ký không hề được hỏi tới']
            ] },

          { t: 'cal', kind: 'danger', title: 'Ba ảnh giả bị chặn, ảnh thứ tư đi thẳng qua',
            x: 'Chữ ký đã làm đúng việc của nó với mọi FIT. Nhưng <code>bypass.img</code> không phải FIT: ' +
               '<code>pxe_utils.c</code> thấy file không có định dạng FIT nên gọi <code>booti</code>, và <code>booti</code> ' +
               'không biết gì về chữ ký. Ngoài ra ba ảnh bị từ chối đều rơi về dấu nhắc <code>=&gt;</code> — kẻ tấn ' +
               'công đứng trước cổng serial được tặng một shell U-Boot để gõ <code>booti</code> bằng tay. Hai lỗ đó là ' +
               'việc của Bước 4.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Đóng đường vòng của U-Boot bằng một fragment (và hai cái bẫy của Kconfig)',
        blocks: [
          { t: 'p', x:
            'Bài 67 đã có <code>board/thermo/uboot.fragment</code> 2 dòng. Ý tưởng đầu tiên, và là ý tưởng mà nhiều ' +
            'hướng dẫn gợi ý, là tắt luôn dòng lệnh U-Boot bằng <code># CONFIG_CMDLINE is not set</code>. Thử nó ' +
            'trước — đây là lần thử đã hỏng thật khi soạn bài:' },

          { t: 'code', where: 'out', nocopy: true, name: 'boot với CONFIG_CMDLINE=n (trích)', code:
            'Programmatic boot starting\n' +
            'Bootmeths:  extlinux vbe_simple\n' +
            '…\n' +
            "** Booting bootflow 'virtio-blk#31.bootdev.part_1' with extlinux\n" +
            '1:\tthermo\n' +
            'Retrieving file: /boot/thermo.itb\n' +
            'append: root=/dev/vda1 rootwait console=ttyAMA0\n' +
            'Boot failed (err=-14)\n' +
            '…\n' +
            'Standard boot failed (err=-14)\n' +
            'Failed to boot\n' +
            'resetting ...' },

          { t: 'p', x:
            'U-Boot đọc được FIT nhưng không boot nổi, rồi tự reset — lặp vô hạn. Nguyên nhân nằm trong Kconfig: ' +
            '<code>CMD_BOOTM</code> (lệnh <code>bootm</code>, thứ <code>extlinux</code> dùng để boot FIT) phụ thuộc ' +
            '<code>CMDLINE</code>. Tắt dòng lệnh là tắt luôn đường boot duy nhất còn lại. Bài học: <b>tắt một tuỳ chọn ' +
            'bảo mật rồi phải boot thử</b>. Bỏ ý tưởng đó; thay vào đó giữ dòng lệnh nhưng không cho ai chạm tới nó:' },

          { t: 'code', where: 'wsl', code:
            "cat >> ~/bai68/thermo/board/thermo/uboot.fragment <<'EOF'\n" +
            '# lesson 68: boot only a signed FIT, never fall back to a prompt\n' +
            '# CONFIG_BOOTSTD_DEFAULTS is not set\n' +
            '# CONFIG_CMD_BOOTI is not set\n' +
            '# CONFIG_LEGACY_IMAGE_FORMAT is not set\n' +
            '# CONFIG_EFI_LOADER is not set\n' +
            'CONFIG_BOOTDELAY=-2\n' +
            'CONFIG_BOOTCOMMAND="bootflow scan -lb; poweroff"\n' +
            '# CONFIG_ENV_IS_IN_FLASH is not set\n' +
            'CONFIG_ENV_IS_NOWHERE=y\n' +
            'EOF\n' +
            "sed -i '/^CONFIG_BOOTDELAY=1$/d' ~/bai68/thermo/board/thermo/uboot.fragment\n" +
            'cd ~/bai68/out\n' +
            'time make THERMO_KEY_DIR=$HOME/bai68/keys uboot-dirclean all > b4.log 2>&1; echo rc=$?\n' +
            'grep -E "^(# )?CONFIG_(CMD_BOOTI|CMD_BOOTM|BOOTSTD_DEFAULTS|LEGACY_IMAGE_FORMAT|EFI_LOADER|BOOTDELAY|BOOTCOMMAND|ENV_IS_NOWHERE|FIT_SIGNATURE)[ =]" build/uboot-2026.01/.config\n' +
            'ls -l images/u-boot.bin' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m25.195s\n' +
            'rc=0\n' +
            '# CONFIG_EFI_LOADER is not set\n' +
            'CONFIG_FIT_SIGNATURE=y\n' +
            '# CONFIG_BOOTSTD_DEFAULTS is not set\n' +
            '# CONFIG_LEGACY_IMAGE_FORMAT is not set\n' +
            'CONFIG_BOOTDELAY=-2\n' +
            'CONFIG_BOOTCOMMAND="bootflow scan -lb; poweroff"\n' +
            'CONFIG_CMD_BOOTM=y\n' +
            '# CONFIG_CMD_BOOTI is not set\n' +
            'CONFIG_ENV_IS_NOWHERE=y\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 978968 Nov  3 10:11 images/u-boot.bin' },

          { t: 'cal', kind: 'warn', title: 'Bẫy thứ hai: "# CONFIG_CMD_BOOTI is not set" một mình không đủ',
            x: 'Lần build đầu tiên khi soạn bài không có dòng <code>BOOTSTD_DEFAULTS</code>, và <code>.config</code> vẫn ' +
               'ghi <code>CONFIG_CMD_BOOTI=y</code>. Lý do: <code>BOOTSTD_DEFAULTS</code> → <code>BOOT_DEFAULTS</code> → ' +
               '<code>BOOT_DEFAULTS_CMDS</code>, và tuỳ chọn cuối có <code>select CMD_BOOTI if ARM64</code> ' +
               '(<code>boot/Kconfig</code>). Trong Kconfig, <code>select</code> <b>thắng</b> mọi dòng "is not set" — ' +
               'fragment không báo lỗi, chỉ lặng lẽ bị lờ đi. Luôn <code>grep</code> <code>.config</code> <i>sau</i> khi ' +
               'build, không tin fragment. Tìm ai bật một tuỳ chọn: <code>grep -rn "select CMD_BOOTI" --include=Kconfig* .</code> ' +
               'trong cây U-Boot.' },

          { t: 'p', x:
            '<code>uboot-dirclean</code> chứ không phải <code>uboot-rebuild</code>, vì fragment chỉ được áp lúc cấu hình ' +
            'lại (Bài 67 đã gặp cùng chuyện với patch). <code>u-boot.bin</code> co từ 1 440 152 B xuống <b>978 968 B</b> ' +
            '(−32 %): EFI và các lệnh mặc định chiếm gần một phần ba bootloader — bề mặt tấn công đo được bằng byte. ' +
            'Tấn công lại bằng U-Boot mới, cùng <code>control.dtb</code>:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai68/step4 && cd ~/bai68/step4\n' +
            'cp ../out/images/u-boot.bin ../out/images/disk.img .\n' +
            '~/bai68/run.sh u-boot.bin ../step3/bypass.img ../step3/control.dtb\n' +
            '~/bai68/run.sh u-boot.bin ../step2/evil.img ../step3/control.dtb\n' +
            '~/bai68/run.sh u-boot.bin disk.img ../step3/control.dtb' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích', code:
            '=== bypass.img\n' +
            'Loading Environment from nowhere... OK\n' +
            '…\n' +
            'Scanning for bootflows in all bootdevs\n' +
            '…\n' +
            'Retrieving file: /boot/Image\n' +
            'append: root=/dev/vda1 rootwait console=ttyAMA0\n' +
            'Retrieving file: /boot/thermo.dtb\n' +
            'zimage: Bad magic!\n' +
            'Boot failed (err=-14)\n' +
            "Scanning bootdev 'virtio-net#30.bootdev':\n" +
            'No more bootdevs\n' +
            '…\n' +
            'poweroff ...\n' +
            '=== evil.img\n' +
            '   Verifying Hash Integrity ...  error!\n' +
            "Failed to verify required signature 'key-thermo-dev'\n" +
            'Bad Data Hash\n' +
            'ERROR -2: can\'t get kernel image!\n' +
            'Boot failed (err=-14)\n' +
            '…\n' +
            'poweroff ...\n' +
            '=== disk.img\n' +
            '   Verifying Hash Integrity ... sha256,rsa2048:thermo-dev+ OK\n' +
            '   Verifying Hash Integrity ... sha256+ OK\n' +
            'Starting kernel ...\n' +
            'thermo login:' },

          { t: 'cal', kind: 'info', title: 'Đọc ba lần boot',
            x: '<ul>' +
               '<li><code>Loading Environment from nowhere... OK</code> — không còn cảnh báo <code>bad CRC</code> của ' +
                 'Bài 35: U-Boot không đọc môi trường từ flash nữa, nên không ai sửa được <code>bootcmd</code> ở đó.</li>' +
               '<li>Không còn dòng <code>Hit any key to stop autoboot</code>: với <code>BOOTDELAY=-2</code> U-Boot không ' +
                 'đọc phím. Khi soạn bài, một script gửi phím cách mỗi 50 ms từ lúc bật máy (cách Bài 66 dùng để vào ' +
                 'dấu nhắc) vẫn đi thẳng tới <code>thermo login:</code>.</li>' +
               '<li><code>bypass.img</code>: không còn <code>booti</code>, <code>pxe_utils.c</code> thử <code>bootz</code> ' +
                 '(định dạng kernel ARM 32 bit) — <code>zimage: Bad magic!</code> — rồi bỏ cuộc. Đường vòng đã đóng.</li>' +
               '<li>Cả hai ảnh giả kết thúc bằng <code>poweroff ...</code> thay vì dấu nhắc <code>=&gt;</code>.</li></ul>' },

          { t: 'cal', kind: 'danger', title: 'Giới hạn của QEMU: khoá công khai vẫn đi qua -dtb',
            x: 'Khi soạn bài, cùng U-Boot đã khoá chặt này được boot <b>không có</b> <code>control.dtb</code>: chỉ ' +
               '<code>Verifying Hash Integrity ... OK</code> không tên thuật toán, và Thermo boot bình thường — tức ảnh ' +
               'không ký cũng sẽ qua. Không có khoá thì không có gì để "bắt buộc". Trên bo mạch thật, khoá được biên dịch ' +
               '<b>vào</b> <code>u-boot.bin</code> (<code>CONFIG_OF_SEPARATE</code> + <code>DEVICE_TREE_INCLUDES</code> hoặc ' +
               '<code>mkimage -K</code> vào <code>u-boot.dtb</code>), và chính <code>u-boot.bin</code> được ROM kiểm chữ ' +
               'ký. QEMU <code>virt</code> không có ROM kiểm tra, nên trong bài, ai đổi được dòng lệnh QEMU là gỡ được ' +
               'cả chuỗi. Mắt xích này bạn chỉ dựng được trọn vẹn trên phần cứng thật — Bài 70.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Rootfs chỉ đọc, phân vùng /data, overlayfs cho /etc',
        blocks: [
          { t: 'p', x:
            'Bốn thay đổi, mỗi cái một file. Thứ nhất, ảnh đĩa có thêm phân vùng thứ hai 16 MiB, một ext4 <b>rỗng</b> ' +
            'nhãn <code>data</code> — genimage tự tạo, không cần rootfs nào:' },

          { t: 'code', where: 'file', name: '~/bai68/thermo/board/thermo/genimage.cfg', code:
            'image data.ext4 {\n' +
            '\text4 {\n' +
            '\t\tlabel = "data"\n' +
            '\t}\n' +
            '\tempty = true\n' +
            '\tsize = 16M\n' +
            '}\n' +
            '\n' +
            'image disk.img {\n' +
            '\thdimage {\n' +
            '\t}\n' +
            '\n' +
            '\tpartition rootfs {\n' +
            '\t\tpartition-type = 0x83\n' +
            '\t\timage = "rootfs.ext4"\n' +
            '\t\tbootable = true\n' +
            '\t}\n' +
            '\n' +
            '\tpartition data {\n' +
            '\t\tpartition-type = 0x83\n' +
            '\t\timage = "data.ext4"\n' +
            '\t}\n' +
            '}\n' },

          { t: 'p', x:
            'Thứ hai, <code>fstab</code> trong overlay của sản phẩm: root <code>ro</code>, <code>/data</code> ghi được ' +
            'nhưng mang <code>nosuid,nodev,noexec</code> — vùng ghi được là vùng kẻ tấn công thả file vào, nên không ' +
            'cho file ở đó chạy hay mang bit setuid. Các dòng còn lại chép nguyên từ <code>fstab</code> của Buildroot:' },

          { t: 'code', where: 'file', name: '~/bai68/thermo/board/thermo/overlay/etc/fstab', code:
            '# <file system>\t<mount pt>\t<type>\t<options>\t<dump>\t<pass>\n' +
            '/dev/root\t/\t\text4\tro,noauto\t0\t1\n' +
            '/dev/vda2\t/data\t\text4\trw,nosuid,nodev,noexec\t0\t0\n' +
            'proc\t\t/proc\t\tproc\tdefaults\t0\t0\n' +
            'devpts\t\t/dev/pts\tdevpts\tdefaults,gid=5,mode=620,ptmxmode=0666\t0\t0\n' +
            'tmpfs\t\t/dev/shm\ttmpfs\tmode=1777\t0\t0\n' +
            'tmpfs\t\t/tmp\t\ttmpfs\tmode=1777\t0\t0\n' +
            'tmpfs\t\t/run\t\ttmpfs\tmode=0755,nosuid,nodev\t0\t0\n' +
            'sysfs\t\t/sys\t\tsysfs\tdefaults\t0\t0\n' },

          { t: 'p', x:
            'Thứ ba, một init script chạy sớm (<code>S05</code>, trước <code>mdev</code> và mạng) dựng overlay lên ' +
            '<code>/etc</code>. Script từ chối nếu <code>/data</code> chưa mount, để không vô tình đặt lớp trên vào ' +
            'rootfs:' },

          { t: 'code', where: 'file', name: '~/bai68/thermo/board/thermo/overlay/etc/init.d/S05overlay (bản đầu)', code:
            '#!/bin/sh\n' +
            '# S05overlay -- give the read-only rootfs a writable /etc whose changes live on /data.\n' +
            '# Lower layer: /etc from the rootfs image (never modified).\n' +
            '# Upper layer: /data/etc/upper on the data partition (survives reboot; wipe it = factory reset).\n' +
            '\n' +
            'UPPER=/data/etc/upper\n' +
            'WORK=/data/etc/work\n' +
            '\n' +
            'start() {\n' +
            "\tprintf 'Mounting /etc overlay: '\n" +
            "\tif ! grep -q ' /data ' /proc/mounts; then\n" +
            '\t\techo "FAIL (/data not mounted)"\n' +
            '\t\treturn 1\n' +
            '\tfi\n' +
            '\tmkdir -p "$UPPER" "$WORK"\n' +
            '\tmount -t overlay overlay -o "lowerdir=/etc,upperdir=$UPPER,workdir=$WORK" /etc\n' +
            '\t[ $? -eq 0 ] && echo "OK" || echo "FAIL"\n' +
            '}\n' +
            '\n' +
            'case "$1" in\n' +
            '\tstart) start;;\n' +
            '\tstop) ;;\n' +
            '\t*) echo "Usage: $0 {start|stop}"; exit 1;;\n' +
            'esac\n' },

          { t: 'cmdx', cmd: 'mount -t overlay overlay -o lowerdir=/etc,upperdir=…,workdir=… /etc', rows: [
            ['<code>lowerdir=/etc</code>', 'Lớp dưới: <code>/etc</code> của rootfs chỉ đọc.', 'Mount <b>lên chính nó</b> được, vì kernel đã mở thư mục lớp dưới trước khi che nó'],
            ['<code>upperdir=/data/etc/upper</code>', 'Lớp trên, nơi mọi thay đổi được ghi.', 'Phải ở cùng filesystem với <code>workdir</code>'],
            ['<code>workdir=/data/etc/work</code>', 'Thư mục nháp kernel dùng để copy-up một cách nguyên tử.', 'Phải rỗng, không bao giờ đụng tay vào'],
            ['<code>/etc</code>', 'Điểm mount.', 'Bài 48 dùng overlay cho cả <code>/</code>; ở đây chỉ một thư mục']
          ] },

          { t: 'p', x:
            'Thứ tư, defconfig: tắt dòng <code>remount,rw /</code> trong <code>inittab</code> (Buildroot làm hộ khi ' +
            '<code>BR2_TARGET_GENERIC_REMOUNT_ROOTFS_RW</code> tắt), thêm <code>ro</code> vào dòng ' +
            '<code>append</code> để kernel mount root chỉ đọc ngay từ đầu, rồi build:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68/thermo\n' +
            'chmod +x board/thermo/overlay/etc/init.d/S05overlay\n' +
            "cat >> board/thermo/post-build.sh <<'EOF'\n" +
            '\n' +
            '# read-only rootfs: /data is where the writable partition is mounted\n' +
            'mkdir -p "$TARGET/data"\n' +
            'EOF\n' +
            "sed -i 's|append root=/dev/vda1 rootwait|append root=/dev/vda1 ro rootwait|' board/thermo/overlay/boot/extlinux/extlinux.conf\n" +
            "echo '# BR2_TARGET_GENERIC_REMOUNT_ROOTFS_RW is not set' >> configs/thermo_defconfig\n" +
            'cd ~/bai68/out && make thermo_defconfig > /dev/null\n' +
            'make THERMO_KEY_DIR=$HOME/bai68/keys > b5.log 2>&1; echo rc=$?\n' +
            'grep remount target/etc/inittab\n' +
            'fdisk -l images/disk.img | tail -n 3' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '#::sysinit:/bin/mount -o remount,rw /\n' +
            'Device           Boot  Start    End Sectors Size Id Type\n' +
            'images/disk.img1 *         1 196608  196608  96M 83 Linux\n' +
            'images/disk.img2      196609 229376   32768  16M 83 Linux' },

          { t: 'cal', kind: 'why', title: 'Vì sao cần mkdir /data trong post-build',
            x: 'Rootfs giờ chỉ đọc, nên không ai tạo được thư mục <code>/data</code> lúc chạy — điểm mount phải có sẵn ' +
               'trong ảnh. Thiếu nó, <code>mount -a</code> bỏ qua <code>/data</code> và <code>S05overlay</code> in ' +
               '<code>FAIL (/data not mounted)</code>. Khi soạn bài, lần build của bước này được chạy chung với các file ' +
               'của Bước 6 (user, fragment BusyBox, mật khẩu) bằng <code>busybox-dirclean temp-daemon-dirclean all</code>; ' +
               'output dưới đây trích phần thuộc Bước 5.' },

          { t: 'p', x:
            'Dòng <code>remount</code> đã bị chú thích (dấu <code>#</code>), và ảnh đĩa có hai phân vùng: <code>vda2</code> ' +
            'đúng 32 768 sector = 16 MiB. Boot (vẫn với <code>control.dtb</code>), đăng nhập, thử ghi:' },

          { t: 'code', where: 'qemu', name: 'trong Thermo', code:
            'grep -E " / | /data | /etc " /proc/mounts\n' +
            'touch /usr/bin/evil\n' +
            'echo thermo-02 > /etc/hostname\n' +
            'ls -l /data/etc/upper\n' +
            'reboot\n' +
            '# ... log in again, then:\n' +
            'cat /etc/hostname\n' +
            'hostname' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích, gồm cả log khởi động', code:
            "seedrng: can't create directory '/var/lib/seedrng': Read-only file system\n" +
            'Starting syslogd: OK\n' +
            '…\n' +
            'Mounting /etc overlay: OK\n' +
            '…\n' +
            '# grep -E " / | /data | /etc " /proc/mounts\n' +
            '/dev/root / ext4 ro,relatime 0 0\n' +
            '/dev/vda2 /data ext4 rw,nosuid,nodev,noexec,relatime 0 0\n' +
            'overlay /etc overlay rw,relatime,lowerdir=/etc,upperdir=/data/etc/upper,workdir=/data/etc/work 0 0\n' +
            '# touch /usr/bin/evil\n' +
            'touch: /usr/bin/evil: Read-only file system\n' +
            '# echo thermo-02 > /etc/hostname\n' +
            '# ls -l /data/etc/upper\n' +
            'total 1\n' +
            '-rw-r--r--    1 root     root            10 Nov  3 03:20 hostname\n' +
            '# reboot\n' +
            '…\n' +
            '# cat /etc/hostname\n' +
            'thermo-02\n' +
            '# hostname\n' +
            'thermo' },

          { t: 'cal', kind: 'info', title: 'Ba điều đúng, hai điều sai',
            x: '<b>Đúng:</b> root là <code>ro</code>, <code>touch /usr/bin/evil</code> bị từ chối (so với Bước 1, nơi nó ' +
               'thành công), và ghi <code>/etc/hostname</code> sinh ra đúng một file 10 byte trong lớp trên — copy-up ' +
               'thấy tận mắt. File đó sống qua <code>reboot</code>.<br>' +
               '<b>Sai 1:</b> <code>seedrng</code> (dòng đầu tiên của log) không cất được hạt giống số ngẫu nhiên — nó ' +
               'chạy ở <code>S01</code>, muốn ghi vào <code>/var/lib</code> trên rootfs. Mỗi lần boot kernel khởi đầu ' +
               'với ít entropy hơn.<br>' +
               '<b>Sai 2:</b> <code>/etc/hostname</code> nói <code>thermo-02</code> nhưng lệnh <code>hostname</code> vẫn ' +
               'nói <code>thermo</code>. Lý do nằm trong <code>inittab</code>: <code>::sysinit:/bin/hostname -F /etc/hostname</code> ' +
               'chạy <b>trước</b> <code>rcS</code>, tức trước khi <code>S05overlay</code> dựng lớp trên — nó đọc bản cũ ' +
               'trong rootfs.' },

          { t: 'p', x:
            'Đây là bài học thực tế nhất của rootfs chỉ đọc: chuyển sang <code>ro</code> thì dễ, tìm hết những thứ âm ' +
            'thầm muốn ghi mới tốn công — và chúng không làm boot hỏng, chỉ làm sai lặng lẽ. Sửa cả hai: ' +
            '<code>seedrng</code> đọc <code>/etc/default/seedrng</code> (xem đầu script <code>S01seedrng</code>), còn ' +
            '<code>S05overlay</code> đặt lại tên máy sau khi mount:' },

          { t: 'code', where: 'wsl', code:
            'B=~/bai68/thermo/board/thermo\n' +
            'mkdir -p $B/overlay/etc/default\n' +
            "printf '# the rootfs is read-only: keep the random seed on the data partition\\nSEEDRNG_ARGS=\"--seed-dir=/data/seedrng\"\\n' > $B/overlay/etc/default/seedrng\n" +
            "sed -i 's|^\\t\\[ \\$? -eq 0 \\] \\&\\& echo \"OK\" \\|\\| echo \"FAIL\"$|\\t[ $? -eq 0 ] \\&\\& echo \"OK\" \\|\\| { echo \"FAIL\"; return 1; }\\n\\t# inittab ran \"hostname -F /etc/hostname\" before this overlay existed: apply it again\\n\\thostname -F /etc/hostname|' $B/overlay/etc/init.d/S05overlay\n" +
            'sed -n 15,20p $B/overlay/etc/init.d/S05overlay' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tmkdir -p "$UPPER" "$WORK"\n' +
            '\tmount -t overlay overlay -o "lowerdir=/etc,upperdir=$UPPER,workdir=$WORK" /etc\n' +
            '\t[ $? -eq 0 ] && echo "OK" || { echo "FAIL"; return 1; }\n' +
            '\t# inittab ran "hostname -F /etc/hostname" before this overlay existed: apply it again\n' +
            '\thostname -F /etc/hostname\n' +
            '}' },

          { t: 'p', x:
            'Dòng <code>sed</code> dài vì phải thoát <code>[</code>, <code>$</code>, <code>&amp;</code>, <code>|</code>; mở ' +
            'file bằng trình soạn thảo và sửa tay cũng được — kết quả phải đúng như sáu dòng trên. Hai sửa này được ' +
            'kiểm chứng cùng Bước 6 (một lần build sạch cho cả hai bước).' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Thu nhỏ bề mặt tấn công, giữ bí mật ngoài cây, kiểm tra lần cuối',
        blocks: [
          { t: 'p', x:
            'Ba file nhỏ. Một fragment BusyBox bỏ bốn applet Thermo không dùng; một dòng thêm vào fragment kernel bỏ ' +
            '<code>/dev/mem</code>; và một bảng user (cú pháp <code>makeusers</code> của Buildroot) tạo user hệ thống ' +
            '<code>thermo</code>:' },

          { t: 'code', where: 'wsl', code:
            'B=~/bai68/thermo/board/thermo\n' +
            "cat > $B/busybox.fragment <<'EOF'\n" +
            '# lesson 68: nothing on the board needs these, so they are not shipped\n' +
            '# CONFIG_CROND is not set\n' +
            '# CONFIG_CRONTAB is not set\n' +
            '# CONFIG_INETD is not set\n' +
            '# CONFIG_DEVMEM is not set\n' +
            'EOF\n' +
            "echo '# CONFIG_DEVMEM is not set' >> $B/linux.fragment\n" +
            "printf 'thermo -1 thermo -1 * - - - Thermo temperature daemon\\n' > $B/users.table" },

          { t: 'table',
            head: ['Trường trong <code>users.table</code>', 'Giá trị', 'Nghĩa'],
            rows: [
              ['username / uid', '<code>thermo -1</code>', '<code>-1</code> = Buildroot tự chọn UID (ra 100)'],
              ['group / gid', '<code>thermo -1</code>', 'Group cùng tên, GID tự chọn (ra 101)'],
              ['password', '<code>*</code>', 'Không đăng nhập được bằng mật khẩu'],
              ['home / shell / groups', '<code>- - -</code>', 'Không thư mục nhà, shell <code>/bin/false</code>, không group phụ'],
              ['comment', '<code>Thermo temperature daemon</code>', 'Trường GECOS, chỉ để người đọc']
            ] },

          { t: 'p', x:
            'Daemon chạy bằng user đó: <code>start-stop-daemon</code> của BusyBox có <code>--chuid</code>. Nhưng ' +
            '<code>/dev/tsensor0</code> mặc định là <code>root:root 660</code> (Bước 1) — user <code>thermo</code> sẽ ' +
            '<code>open</code> thất bại. Thêm một luật <code>mdev</code> cho group <code>thermo</code> quyền đọc, đặt ' +
            '<b>trước</b> luật nạp module (mdev dùng luật khớp đầu tiên). Hai việc này vào cuối post-build:' },

          { t: 'code', where: 'wsl', code:
            "sed -i 's|--pidfile \"$PIDFILE\" --exec \"/usr/bin/$DAEMON\"$|--pidfile \"$PIDFILE\" --chuid thermo --exec \"/usr/bin/$DAEMON\"|' ~/bai68/thermo/package/temp-daemon/S60temp_daemon\n" +
            "cat >> $B/post-build.sh <<'EOF'\n" +
            '\n' +
            '# the daemon runs as user thermo: let that group read the sensor node\n' +
            "sed -i '/^tsensor/d' \"$TARGET/etc/mdev.conf\"\n" +
            "sed -i '/^# load modules/i tsensor[0-9]*\\troot:thermo 640\\n' \"$TARGET/etc/mdev.conf\"\n" +
            'EOF' },

          { t: 'p', x:
            'Cuối cùng là mật khẩu root. Buildroot nhận mật khẩu chữ rõ <i>hoặc</i> hash; đưa hash để chữ rõ không ' +
            'bao giờ nằm trong defconfig. Sinh hash SHA-512 bằng openssl (gói <code>whois</code> chứa ' +
            '<code>mkpasswd</code> không có trên máy này), nhân đôi mọi <code>$</code> như help của Buildroot yêu cầu, ' +
            'rồi thêm ba dòng vào defconfig:' },

          { t: 'code', where: 'wsl', code:
            'openssl passwd -6 -salt lesson68salt thermo-lab\n' +
            "cat >> ~/bai68/thermo/configs/thermo_defconfig <<'EOF'\n" +
            'BR2_TARGET_GENERIC_ROOT_PASSWD="$$6$$lesson68salt$$b35pteUULTiJSnvNxPD9x9.zC3Yyqh7ajuxloQzx6mx1/wvlFzpYzX0MxbiSa3x484MsWy0rRzQmBM4ssBUky/"\n' +
            'BR2_ROOTFS_USERS_TABLES="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/users.table"\n' +
            'BR2_PACKAGE_BUSYBOX_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_THERMO_PATH)/board/thermo/busybox.fragment"\n' +
            'EOF\n' +
            'wc -l ~/bai68/thermo/configs/thermo_defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '$6$lesson68salt$b35pteUULTiJSnvNxPD9x9.zC3Yyqh7ajuxloQzx6mx1/wvlFzpYzX0MxbiSa3x484MsWy0rRzQmBM4ssBUky/\n' +
            '40 /home/cah8hc/bai68/thermo/configs/thermo_defconfig' },

          { t: 'cmdx', cmd: 'openssl passwd -6 -salt lesson68salt thermo-lab', rows: [
            ['<code>passwd -6</code>', 'Băm theo kiểu <code>crypt</code> SHA-512 — đúng định dạng <code>/etc/shadow</code> đọc.', 'Tiền tố <code>$6$</code> = SHA-512, <code>$1$</code> = MD5 (đừng dùng)'],
            ['<code>-salt lesson68salt</code>', 'Muối cố định để bạn ra đúng hash trong bài.', 'Sản phẩm thật: <b>bỏ</b> <code>-salt</code>, để openssl chọn muối ngẫu nhiên'],
            ['<code>thermo-lab</code>', 'Mật khẩu dùng trong QEMU.', 'Gõ trên dòng lệnh nghĩa là nó vào <code>~/.bash_history</code> — chấp nhận được cho bài, không cho sản phẩm']
          ] },

          { t: 'p', x:
            'Bước 5 và 6 đổi cấu hình BusyBox và kernel. Lần soạn bài đầu tiên dùng <code>busybox-dirclean</code> và ' +
            'thấy <code>crond</code> vẫn chạy (<code>Starting crond: OK</code>): dirclean xoá thư mục build của BusyBox ' +
            'nhưng <b>không</b> xoá các symlink applet cũ đã cài vào <code>target/</code> — đúng lời cảnh báo của Bài 60 ' +
            'về việc tắt một package. Vì thế build sạch:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai68/out && make thermo_defconfig > /dev/null\n' +
            'time make THERMO_KEY_DIR=$HOME/bai68/keys clean all > b6.log 2>&1; echo rc=$?\n' +
            "find ~/bai67/out/target -type l -lname '*busybox' | wc -l\n" +
            "find ~/bai68/out/target -type l -lname '*busybox' | wc -l\n" +
            'ls target/usr/sbin/crond target/sbin/devmem target/etc/init.d/S50crond\n' +
            'grep -rl "PRIVATE KEY" ~/bai68/thermo images; echo rc=$?\n' +
            "debugfs -R 'cat /etc/passwd' images/rootfs.ext2 2>/dev/null | grep thermo" },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t7m12.105s\n' +
            'rc=0\n' +
            '279\n' +
            '275\n' +
            "ls: cannot access 'target/usr/sbin/crond': No such file or directory\n" +
            "ls: cannot access 'target/sbin/devmem': No such file or directory\n" +
            "ls: cannot access 'target/etc/init.d/S50crond': No such file or directory\n" +
            'rc=1\n' +
            'thermo:x:100:101:Thermo temperature daemon:/:/bin/false' },

          { t: 'cal', kind: 'info', title: 'Đọc kết quả build sạch',
            x: '<ul>' +
               '<li>279 → 275 applet: đúng bốn applet trong fragment. Không có <code>crond</code> thì Buildroot cũng không ' +
                 'cài <code>S50crond</code> (nó chỉ cài khi thấy <code>CONFIG_CROND=y</code>).</li>' +
               '<li><code>grep -rl "PRIVATE KEY"</code> trả <code>rc=1</code> (không tìm thấy): không file nào trong cây ' +
                 'sản phẩm hay trong <code>images/</code> chứa khoá bí mật. Đây là lệnh nên chạy trước mỗi lần ' +
                 '<code>git commit</code> và mỗi lần phát hành.</li>' +
               '<li>User <code>thermo</code> nằm trong <code>/etc/passwd</code> <b>của ảnh</b>, đọc bằng ' +
                 '<code>debugfs</code>. Đừng tìm nó trong <code>target/etc/passwd</code>: Buildroot chỉ thêm user lúc đóng ' +
                 'ảnh filesystem, trong một bản sao của <code>target/</code>.</li></ul>' },

          { t: 'p', x:
            'Kiểm tra lần cuối — lặp lại các phép đo của Bước 1 trên sản phẩm đã gia cố, cộng thêm phép thử khôi phục ' +
            'cài đặt gốc:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai68/step6 && cd ~/bai68/step6\n' +
            'cp ../out/images/u-boot.bin ../out/images/disk.img .\n' +
            '~/bai68/run.sh u-boot.bin disk.img ../step3/control.dtb' },

          { t: 'code', where: 'qemu', name: 'trong Thermo — thermo login: root, Password: thermo-lab', code:
            'ps -o user,pid,comm | grep -E "temp|cron|USER"\n' +
            'ls -l /dev/tsensor0 /dev/mem\n' +
            'ls /etc/init.d\n' +
            'ls /data /data/seedrng\n' +
            'echo thermo-02 > /etc/hostname\n' +
            'reboot\n' +
            '# ... the login prompt now says thermo-02; log in, then:\n' +
            'hostname\n' +
            'rm /data/etc/upper/hostname\n' +
            'reboot\n' +
            '# ... log in, then:\n' +
            'hostname' },

          { t: 'code', where: 'out', nocopy: true, name: 'trích', code:
            'Saving 256 bits of non-creditable seed for next boot\n' +
            '…\n' +
            'Mounting /etc overlay: OK\n' +
            '…\n' +
            'Starting temp_daemon: OK\n' +
            '\n' +
            'Thermo 1.0 - lesson 68\n' +
            'thermo login: root\n' +
            'Password:\n' +
            '# ps -o user,pid,comm | grep -E "temp|cron|USER"\n' +
            'USER     PID   COMMAND\n' +
            'thermo     125 temp_daemon\n' +
            '# ls -l /dev/tsensor0 /dev/mem\n' +
            'ls: /dev/mem: No such file or directory\n' +
            'crw-r-----    1 root     thermo    248,   0 Nov  3 03:33 /dev/tsensor0\n' +
            '# ls /etc/init.d\n' +
            'S01seedrng      S02sysctl       S11modules      rcK\n' +
            'S01syslogd      S05overlay      S40network      rcS\n' +
            'S02klogd        S10mdev         S60temp_daemon\n' +
            '# ls /data /data/seedrng\n' +
            '/data:\n' +
            'etc         lost+found  seedrng\n' +
            '/data/seedrng:\n' +
            'seed.no-credit\n' +
            '# echo thermo-02 > /etc/hostname\n' +
            '# reboot\n' +
            '…\n' +
            'thermo-02 login: root\n' +
            '# hostname\n' +
            'thermo-02\n' +
            '# rm /data/etc/upper/hostname\n' +
            '# reboot\n' +
            '…\n' +
            '# hostname\n' +
            'thermo' },

          { t: 'table',
            head: ['Phép đo', 'Bước 1 (Bài 67)', 'Bước 6 (đã gia cố)'],
            rows: [
              ['Mật khẩu root', '<code>root::</code> — rỗng', 'Hash SHA-512; sai mật khẩu → <code>Login incorrect</code>'],
              ['Rootfs', '<code>rw</code>, <code>touch /usr/bin/evil</code> thành công', '<code>ro</code>, <code>Read-only file system</code>'],
              ['Daemon', '<code>root 123 temp_daemon</code>', '<code>thermo 125 temp_daemon</code>, đọc sensor qua group'],
              ['Dịch vụ thừa', '<code>crond</code> chạy', 'Không còn <code>crond</code>, <code>inetd</code>'],
              ['<code>/dev/mem</code>', 'Có (1, 1)', '<code>No such file or directory</code>'],
              ['Kernel sửa 1 byte', 'Boot, in <code>thermX</code>', 'U-Boot từ chối, tắt máy'],
              ['Kernel trần qua <code>extlinux.conf</code>', 'Boot', '<code>zimage: Bad magic!</code>, tắt máy'],
              ['Dấu nhắc U-Boot', '<code>Hit any key</code> 1 s', 'Không có'],
              ['Hạt giống RNG', 'Ghi vào rootfs', '<code>/data/seedrng/seed.no-credit</code>'],
              ['Khôi phục cài đặt gốc', '—', 'Xoá một file ở <code>/data</code> → <code>hostname</code> về <code>thermo</code>']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao daemon vẫn chạy được, và vì sao điều đó quan trọng',
            x: 'Dòng <code>root thermo … /dev/tsensor0</code> với quyền <code>crw-r-----</code> là toàn bộ "hợp đồng" ' +
               'least privilege: user <code>thermo</code> đọc được cảm biến (group, <code>r</code>), không ghi được, và ' +
               'không làm gì khác được. Nếu một ngày có ai khai thác lỗi tràn bộ đệm trong <code>temp_daemon</code> qua ' +
               'cổng 9006, họ nhận được một shell <code>thermo</code> không có shell đăng nhập, không ghi được ' +
               '<code>/</code>, không có <code>/dev/mem</code> — chứ không phải root. PID và giờ trong output sẽ khác trên ' +
               'máy bạn; dòng <code>Saving 256 bits…</code> ở đầu log cho thấy <code>seedrng</code> giờ cất được hạt giống.' }
        ] }
    ] },

    { t: 'cal', kind: 'info', title: 'Điều bài này chưa làm: dm-verity',
      x: 'Rootfs chỉ đọc chặn <i>ghi nhầm</i> và mã độc chưa có root. Kẻ cầm thẻ nhớ vẫn sửa được <code>vda1</code> ' +
         'từ máy khác (đúng như bạn đã làm với <code>debugfs</code>), và kernel đã ký vẫn mount nó vô tư. Mắt xích ' +
         'kế tiếp là <b>dm-verity</b>: một cây hash của từng khối rootfs, hash gốc nằm trong dòng lệnh kernel — tức ' +
         'trong FIT đã ký; đọc một khối bị sửa là lỗi I/O. Nó cần <code>veritysetup</code> lúc build, ' +
         '<code>CONFIG_DM_VERITY</code> và thường một initramfs; Buildroot có sẵn gói <code>cryptsetup</code>. Đó là ' +
         'bài tập mở rộng tự nhiên của bài này.' },

    /* ============================================================
       7. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>post-build.sh: 7: THERMO_KEY_DIR: set THERMO_KEY_DIR …</code>, <code>make</code> rc 2',
         'Chạy <code>make</code> mà không truyền thư mục khoá — script cố ý dừng', '<code>make THERMO_KEY_DIR=$HOME/bai68/keys</code> (mọi lần build từ Bước 2 trở đi)'],
        ['U-Boot in <code>Verifying Hash Integrity ... OK</code> không có <code>sha256,rsa2048</code>, ảnh giả vẫn boot',
         'U-Boot không có khoá công khai: quên tham số <code>control.dtb</code> của <code>run.sh</code>, hoặc <code>control.dtb</code> không có <code>/signature</code>', '<code>fdtget -l control.dtb /signature</code>; boot với <code>-dtb control.dtb</code>'],
        ['<code>sha256,rsa2048:thermo-dev-  error!</code> trên chính ảnh của bạn',
         'Ảnh ký bằng một khoá, <code>control.dtb</code> chứa khoá công khai của khoá khác (vd. sinh lại <code>keys/</code>)', 'Chạy lại <code>fdt_add_pubkey</code> trên một <code>qemu.dtb</code> mới với khoá hiện tại; kiểm bằng <code>fit_check_sign</code> trước khi boot'],
        ['<code>Boot failed (err=-14)</code> rồi <code>resetting ...</code> lặp mãi',
         '<code># CONFIG_CMDLINE is not set</code>: kéo theo mất <code>CMD_BOOTM</code>, extlinux không boot được FIT', 'Giữ <code>CMDLINE</code>, chặn dấu nhắc bằng <code>BOOTDELAY=-2</code> + <code>BOOTCOMMAND="…; poweroff"</code>'],
        ['<code>.config</code> vẫn có <code>CONFIG_CMD_BOOTI=y</code> dù fragment ghi "is not set"',
         '<code>BOOTSTD_DEFAULTS</code> → <code>BOOT_DEFAULTS_CMDS</code> <code>select CMD_BOOTI</code>; <code>select</code> thắng fragment', 'Thêm <code>#&nbsp;CONFIG_BOOTSTD_DEFAULTS is not set</code>; luôn <code>grep</code> <code>.config</code> sau build'],
        ['Sửa <code>uboot.fragment</code>, build, U-Boot không đổi',
         '<code>uboot-rebuild</code>/<code>make</code> trơn không cấu hình lại U-Boot', '<code>make … uboot-dirclean all</code>'],
        ['<code>debugfs</code> ghi xong (<code>Allocated inode</code>) nhưng <code>stat /boot/thermo.itb</code> báo <code>File not found by ext2_lookup</code>',
         'Dùng <code>write SRC /boot/thermo.itb</code>: lệnh <code>write</code> của debugfs 1.45.5 không đặt file vào thư mục con theo đường dẫn ở tên đích', '<code>cd /boot</code> trước, rồi <code>write SRC thermo.itb</code> (tên trần) trong cùng một file lệnh <code>-f</code>'],
        ["<code>seedrng: can't create directory '/var/lib/seedrng': Read-only file system</code>",
         'Rootfs chỉ đọc; seedrng cất hạt giống vào rootfs', '<code>/etc/default/seedrng</code> với <code>SEEDRNG_ARGS="--seed-dir=/data/seedrng"</code>'],
        ['<code>/etc/hostname</code> đã đổi nhưng <code>hostname</code> vẫn tên cũ',
         '<code>inittab</code> chạy <code>hostname -F</code> trước khi overlay <code>/etc</code> được dựng', '<code>hostname -F /etc/hostname</code> lần nữa ở cuối <code>S05overlay</code>'],
        ['<code>Starting crond: OK</code> dù fragment BusyBox đã tắt <code>CROND</code>',
         '<code>busybox-dirclean</code> không gỡ symlink applet đã cài trong <code>target/</code>', '<code>make … clean all</code> khi bỏ bớt thứ khỏi rootfs'],
        ['<code>open /dev/tsensor0: Permission denied</code>, daemon không chạy',
         'Daemon chạy bằng <code>thermo</code> nhưng node vẫn <code>root:root 660</code>', 'Luật <code>tsensor[0-9]* root:thermo 640</code> trong <code>mdev.conf</code>, đặt trước luật <code>$MODALIAS</code>'],
        ['Không thấy user <code>thermo</code> trong <code>out/target/etc/passwd</code>',
         'Buildroot thêm user lúc đóng ảnh, trên bản sao của <code>target/</code>', "<code>debugfs -R 'cat /etc/passwd' images/rootfs.ext2</code>"]
      ] },

    /* ============================================================
       8. TỔNG KẾT
       ============================================================ */
    { t: 'recap', items: [
      'Bảo mật bắt đầu bằng <b>mô hình mối đe doạ</b>: ai, muốn gì, chạm vào đâu. Bốn điểm yếu của Thermo Bài 67 ' +
        'đều <b>đo được</b>: <code>root::</code>, rootfs <code>rw</code>, daemon chạy bằng root, kernel sửa <b>1 byte</b> vẫn boot.',
      '<b>Hash</b> phát hiện hỏng, <b>chữ ký</b> phát hiện giả: kẻ thay file tính lại được SHA-256 nhưng không tạo được ' +
        'chữ ký RSA-2048 nếu không có khoá bí mật.',
      '<b>Chain of trust</b>: mỗi tầng kiểm tầng sau, bắt đầu từ ROM + khoá trong OTP. Bài dựng thật mắt ' +
        '<b>U-Boot → FIT</b>; QEMU không có ROM, nên khoá công khai đi qua <code>-dtb</code> — trên bo thật nó phải nằm trong <code>u-boot.bin</code>.',
      'Ký <b>configuration</b> (chống trộn ghép) + <code>required = "conf"</code>: ảnh không ký, sửa 1 byte, ký bằng khoá ' +
        'khác đều bị từ chối — <code>-</code>/<code>+</code> sau tên khoá là chìa khoá để đọc log.',
      'Ký mà còn <b>đường vòng</b> thì vô nghĩa: <code>booti</code>, ảnh legacy, EFI, env trong flash, dấu nhắc. ' +
        'Fragment U-Boot đóng chúng, <code>u-boot.bin</code> 1 440 152 → <b>978 968 B</b>; <code>select</code> trong Kconfig ' +
        'thắng fragment — luôn <code>grep .config</code>.',
      'Rootfs <b>chỉ đọc</b> + <code>/data</code> (<code>nosuid,nodev,noexec</code>) + <b>overlayfs</b> cho <code>/etc</code>: ' +
        'cấu hình vẫn sửa được, xoá lớp trên là khôi phục cài đặt gốc. Những thứ âm thầm muốn ghi (<code>seedrng</code>, ' +
        '<code>hostname -F</code>) không làm boot hỏng, chỉ làm sai lặng lẽ.',
      'Bề mặt tấn công: 279 → <b>275</b> applet, không <code>crond</code>/<code>inetd</code>, không <code>/dev/mem</code>, ' +
        'daemon chạy bằng user <code>thermo</code> chỉ đọc được cảm biến.',
      'Bí mật: khoá ký ở ngoài cây (<code>THERMO_KEY_DIR</code>, quyền <code>600</code>), mật khẩu dạng hash ' +
        '<code>$6$</code>, kiểm bằng <code>grep -rl "PRIVATE KEY"</code> trước mỗi commit và mỗi bản phát hành.'
    ] },

    { t: 'cal', kind: 'danger', title: 'Dọn dẹp',
      x: '<code>~/bai68</code> chiếm khoảng <b>4 GB</b>, gần hết là <code>out/</code> và các ảnh đĩa thử nghiệm trong ' +
         '<code>step*/</code>. Giữ <code>~/bai68/thermo</code> (220 KB) — Thermo đã gia cố — và <code>~/bai68/keys</code> ' +
         'nếu muốn ký lại cùng khoá ở Bài 69. Đừng bao giờ đưa <code>keys/</code> vào cùng kho Git với <code>thermo/</code>.' },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Thermo giờ chỉ chạy firmware do bạn ký, trên một rootfs không ai ghi được. Nhưng thế thì làm sao <b>cập nhật</b> ' +
         'nó? Ghi đè <code>vda1</code> đang chạy là đúng thứ bạn vừa cấm, và nếu mất điện giữa chừng thì bo mạch không ' +
         'boot được nữa. <b>Bài 69 — Cập nhật OTA</b> chia ổ đĩa thành hai khe A/B, ghi bản mới vào khe đang <i>không</i> ' +
         'chạy, kiểm chữ ký trước khi chuyển, và đo xem rút điện ngay giữa lúc ghi thì Thermo có quay về bản cũ ' +
         'được không.' }
  ],

  quiz: [
    { q: 'Bạn sửa một byte trong <code>/boot/Image</code> của Thermo Bài 67 và chạy lại <code>sha256sum -c SHA256SUMS</code>: ' +
         '<code>FAILED</code>. Điều gì xảy ra khi boot ảnh đó?',
      opts: [
        'U-Boot từ chối vì hash không khớp',
        'Kernel panic ngay khi giải nén',
        'Boot bình thường; kernel in đúng chuỗi đã bị sửa',
        'U-Boot rơi về dấu nhắc <code>=&gt;</code>'
      ],
      a: 2,
      why: '<code>SHA256SUMS</code> là một file nằm cạnh ảnh; không ai trên bo mạch kiểm nó. U-Boot của Bài 67 nạp ' +
           '<code>Image</code> trần bằng <code>booti</code>, không kiểm gì — Bước 1 thấy <code>6.18.45-thermX</code> in ra. ' +
           'Một tổng kiểm tra chỉ có ích nếu <i>bên nạp</i> kiểm nó, và chỉ chống được hỏng, không chống được giả.' },

    { q: 'FIT đã có chữ ký <code>sha256,rsa2048:thermo-dev</code>, nhưng U-Boot in <code>Verifying Hash Integrity ... OK</code> ' +
         '(không có tên thuật toán) và một FIT không ký của kẻ tấn công cũng boot được. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Khoá bí mật quá ngắn, cần RSA-4096',
        'U-Boot không có khoá công khai với <code>required = "conf"</code> trong control FDT',
        'Thiếu <code>hash-1</code> trong node kernel',
        '<code>CONFIG_FIT_SIGNATURE</code> bị tắt trong <code>mkimage</code>'
      ],
      a: 1,
      why: 'Chữ ký chỉ được kiểm khi bên kiểm tra có khoá và được lệnh <i>bắt buộc</i> kiểm. Không có node ' +
           '<code>/signature/key-…</code> thì U-Boot không có gì để so, nên bỏ qua chữ ký và chỉ kiểm hash từng ảnh — ' +
           'chính là Bước 2. Thêm khoá bằng <code>fdt_add_pubkey … -r conf</code> và log đổi thành ' +
           '<code>sha256,rsa2048:thermo-dev+ OK</code>.' },

    { q: 'Log U-Boot in <code>sha256,rsa2048:thermo-dev-  error!</code> rồi <code>Failed to verify required signature</code>. Ảnh này là gì?',
      opts: [
        'Ảnh không có node chữ ký nào',
        'Ảnh có chữ ký, nhưng không khớp khoá công khai mà U-Boot giữ',
        'Ảnh đúng chữ ký nhưng một byte kernel bị sửa',
        'Ảnh legacy uImage'
      ],
      a: 1,
      why: 'Dấu <code>-</code> sau tên khoá nghĩa là U-Boot tìm thấy chữ ký và tính toán, nhưng kết quả sai — ký bằng ' +
           'khoá khác (ảnh <code>forged.img</code>). Không có chữ ký thì log là <code>No \'signature\' subnode</code>; chữ ' +
           'ký đúng mà dữ liệu bị sửa thì chữ ký <code>+ OK</code> rồi <code>sha256 error!</code> ở hash của ảnh.' },

    { q: 'Vì sao ký <b>configuration</b> thay vì ký riêng kernel và dtb?',
      opts: [
        'Vì ký configuration nhanh hơn',
        'Để chống ghép một kernel cũ (vẫn có chữ ký thật) với một dtb khác — tấn công trộn ghép',
        'Vì U-Boot không kiểm được chữ ký trên image',
        'Để không phải tính hash từng image'
      ],
      a: 1,
      why: 'Chữ ký trên từng image chứng minh mỗi mảnh do bạn làm ra, nhưng không nói chúng <i>được phép đi cùng nhau</i>. ' +
           'Chữ ký configuration bao trùm hash của cả bộ và tên các node, nên đổi một mảnh (kể cả bằng một mảnh cũ hợp lệ) ' +
           'là chữ ký hỏng. Hash từng image vẫn cần — chữ ký configuration ký chính những hash đó.' },

    { q: 'Sau khi ký FIT và đưa khoá cho U-Boot, kẻ tấn công vẫn boot được kernel đã sửa. Họ làm gì là hợp lý nhất?',
      opts: [
        'Tính lại SHA-256 của kernel và ghi vào FIT',
        'Đổi <code>key-name-hint</code> trong FIT',
        'Chép <code>Image</code> trần vào <code>/boot</code> và trỏ <code>extlinux.conf</code> sang nó, để U-Boot dùng <code>booti</code>',
        'Xoá node <code>signature-1</code>'
      ],
      a: 2,
      why: 'Chữ ký chỉ khoá đường <code>bootm</code> + FIT. Khi <code>CMD_BOOTI</code> còn bật, <code>pxe_utils.c</code> boot ' +
           'file không phải FIT bằng <code>booti</code>, không hỏi chữ ký — Bước 3 với <code>bypass.img</code>. Ba cách còn ' +
           'lại đều bị <code>required = "conf"</code> chặn. Cách sửa là đóng đường vòng: tắt <code>BOOTSTD_DEFAULTS</code> ' +
           'và <code>CMD_BOOTI</code>.' },

    { q: 'Rootfs đã <code>ro</code>, overlay <code>/etc</code> hoạt động, <code>/etc/hostname</code> sau reboot là <code>thermo-02</code> ' +
         'nhưng lệnh <code>hostname</code> in <code>thermo</code>. Lý do?',
      opts: [
        'Overlay mất dữ liệu khi reboot',
        '<code>inittab</code> chạy <code>hostname -F /etc/hostname</code> trước khi <code>S05overlay</code> dựng lớp trên',
        'Kernel cache tên máy từ lần boot trước',
        'File trong lớp trên thiếu quyền đọc'
      ],
      a: 1,
      why: 'Thứ tự khởi động quyết định: các dòng <code>::sysinit:</code> trong <code>inittab</code> chạy theo thứ tự, và dòng ' +
           '<code>hostname -F</code> đứng trước <code>/etc/init.d/rcS</code>. Lúc đó <code>/etc</code> vẫn là bản trong rootfs. ' +
           'File trong lớp trên còn nguyên (<code>cat</code> thấy <code>thermo-02</code>), chỉ là đọc quá sớm — đặt lại tên ' +
           'máy sau khi mount overlay.' }
  ]
});

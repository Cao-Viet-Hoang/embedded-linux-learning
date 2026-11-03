/* Bài 69 — Cập nhật OTA
   Chặng 13 — Thành phẩm và nghề nghiệp
   Lấy Thermo đã gia cố của Bài 68 (~/bai68/thermo, khoá ~/bai68/keys) và cho nó khả năng tự cập nhật:
   ổ đĩa chia hai khe rootfs A/B + /data, U-Boot chọn khe bằng một script dùng đúng các biến của backend
   U-Boot trong RAUC (BOOT_ORDER, BOOT_x_LEFT), môi trường U-Boot nằm lại trong NOR flash với hai bản sao
   (ENV_REDUNDANT) và danh sách biến được phép ghi (ENV_WRITEABLE_LIST); trên bo mạch fw_setenv đổi khe,
   thermo-update ghi ảnh vào khe không chạy rồi kiểm chữ ký trên chính đĩa, S99confirm đánh dấu khe tốt.
   Mọi số liệu đo 2026-11-03 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, 16 CPU, QEMU 4.2.1 hệ thống).
   - RAUC / SWUpdate / Mender chỉ được so sánh lý thuyết: không cài, không build. Cơ chế A/B dựng tay
     dùng đúng hợp đồng biến của RAUC để người học thấy công cụ đó làm gì bên dưới.
   - Không làm: delta update, cập nhật bootloader, máy chủ OTA thật (hawkBit, Mender server), mã hoá ảnh.
   - ~/bai69 là nháp, xoá được; ~/bai69/thermo là Thermo có OTA. */

Lesson.register({
  id: 'bai-69',
  title: 'Cập nhật OTA',
  minutes: 60,
  practice: 'Thực hành 60 phút',
  level: 'Nâng cao',

  intro:
    'Bài 68 khoá Thermo lại: rootfs chỉ đọc, kernel phải có chữ ký. Một tháng sau bạn tìm ra lỗi trong ' +
    '<code>temp_daemon</code>, và có năm nghìn chiếc Thermo đang treo trên tường khách hàng. Không ai tháo ' +
    'chúng xuống để cắm thẻ nhớ. Bản sửa phải đi qua mạng — <b>OTA</b>, <i>over the air</i>.<br><br>' +
    'Cái khó không nằm ở chỗ tải file. Cái khó là: bo mạch có thể <b>mất điện</b> ở bất kỳ mili giây nào ' +
    'trong lúc ghi, ảnh mới có thể <b>hỏng</b> hoặc <b>bị giả</b>, và ảnh mới có thể ghi đúng từng byte mà ' +
    'vẫn <b>không chạy</b>. Trong cả ba trường hợp, chiếc Thermo trên tường phải tự quay về bản cũ, không cần ' +
    'ai chạm vào. Bài này chia ổ đĩa của Thermo thành hai khe A/B, viết một bộ chọn khe trong U-Boot, cập nhật ' +
    'qua mạng, rồi <b>rút điện</b> giữa lúc ghi, cài một ảnh <b>giả chữ ký</b> và một ảnh <b>không boot được</b> ' +
    '— và đo xem Thermo có sống sót cả ba lần không.',

  goals: [
    'Giải thích vì sao ghi đè rootfs đang chạy là cách cập nhật nguy hiểm nhất, và A/B giải quyết điều đó bằng ' +
      'cách nào (khe hoạt động, khe dự phòng, một thao tác chuyển duy nhất).',
    'So sánh được RAUC, SWUpdate và Mender theo cách chúng chia việc: định dạng gói, nơi kiểm chữ ký, cách nói ' +
      'chuyện với bootloader, máy chủ.',
    'Dựng ổ đĩa A/B + <code>/data</code> cho Thermo bằng <code>genimage</code>, và một bộ chọn khe trong môi ' +
      'trường U-Boot với bộ đếm số lần thử (<code>BOOT_ORDER</code>, <code>BOOT_A_LEFT</code>, ' +
      '<code>BOOT_B_LEFT</code>).',
    'Đọc và ghi môi trường U-Boot từ Linux bằng <code>fw_printenv</code>/<code>fw_setenv</code>, và chỉ ra vì ' +
      'sao môi trường cần <b>hai bản sao</b> trong flash.',
    'Cài một bản cập nhật có chữ ký vào khe không chạy, kiểm chữ ký trên chính đĩa, chuyển khe, và đánh dấu ' +
      'khe mới là tốt sau khi kiểm tra sức khoẻ.',
    'Chứng minh bằng ba lần thử thật rằng Thermo quay về bản cũ khi mất điện giữa lúc ghi, khi ảnh sai chữ ký, ' +
      'và khi ảnh mới không boot được.'
  ],

  blocks: [
    { t: 'h2', x: 'Vì sao cập nhật là phần nguy hiểm nhất của sản phẩm' },
    { t: 'p', x: 'Cách cập nhật đầu tiên ai cũng nghĩ tới là cách bạn đã làm suốt khoá học: tải ảnh mới, ' +
      '<code>dd</code> đè lên phân vùng rootfs, khởi động lại. Trên bàn làm việc, cách đó chạy. Trên một thiết bị ' +
      'không ai trông, nó có ba lỗ hổng chết người, và cả ba đều đã có mặt trong các bài trước:' },
    { t: 'table', head: ['Điều gì xảy ra', 'Ghi đè tại chỗ', 'Hậu quả'],
      rows: [
        ['Mất điện khi <code>dd</code> mới ghi được 40 %', 'Nửa đầu phân vùng là bản mới, nửa sau là bản cũ',
         'ext4 hỏng, kernel không mount được root: <code>VFS: Unable to mount root fs</code> (Bài 46). Thiết bị ' +
         'chết, phải mang về xưởng'],
        ['Ảnh tải về bị cắt cụt hoặc bị sửa', 'Ghi nguyên vẹn thứ đã nhận',
         'Như trên — hoặc tệ hơn, chạy mã của kẻ khác. Bài 68 đã cho thấy <code>SHA256SUMS</code> phát hiện hỏng ' +
         'nhưng không chống được giả'],
        ['Ảnh đúng từng byte nhưng daemon crash, driver không probe', 'Không còn bản cũ để quay về',
         'Thiết bị "sống" nhưng vô dụng — và chính nó là thứ phải tải bản sửa tiếp theo'],
        ['Ghi vào rootfs đang được mount', 'Bài 68 đã mount nó <code>ro</code>',
         'Không thể ghi đè tại chỗ mà không phá chính quy tắc bảo mật vừa dựng']
      ] },
    { t: 'p', x: 'Điểm chung của cả bốn dòng: <b>chỉ có một bản</b>, và bạn đang phá nó trong lúc dùng nó. ' +
      'Giống như sửa cây cầu duy nhất qua sông bằng cách tháo từng tấm ván ra thay — nếu trời tối giữa chừng, ' +
      'không ai qua được nữa. Cách của kỹ sư cầu đường là xây cây cầu thứ hai bên cạnh, cho xe chạy thử, rồi mới ' +
      'đổi biển chỉ đường. Đó chính là A/B.' },

    { t: 'h2', x: 'A/B: hai khe, một công tắc' },
    { t: 'p', x: 'Ổ đĩa có <b>hai</b> phân vùng rootfs giống hệt kích thước — khe A và khe B — cộng một phân vùng ' +
      'dữ liệu dùng chung. Tại mỗi thời điểm một khe đang chạy (<i>active</i>), khe kia nằm im. Bản cập nhật luôn ' +
      'được ghi vào khe <b>đang không chạy</b>. Khe đang chạy không bị chạm tới một byte nào, nên mất điện lúc ' +
      'ghi chỉ làm hỏng khe dự phòng — thứ chưa ai dùng.' },
    { t: 'p', x: 'Sau khi ghi xong và kiểm tra xong, chỉ còn <b>một</b> thao tác: nói với bootloader "lần sau boot ' +
      'khe kia". Thao tác đó phải <b>nguyên tử</b> — hoặc đã xảy ra, hoặc chưa, không có trạng thái nửa vời. Toàn ' +
      'bộ độ an toàn của A/B dồn vào câu hỏi: công tắc đó nằm ở đâu và được ghi như thế nào.' },
    { t: 'fig', cap: 'Bản mới chỉ chạm vào khe đang nằm im. Nếu bất kỳ bước nào trước bước 4 thất bại, khe A vẫn y ' +
      'nguyên và bo mạch boot lại khe A như chưa có gì xảy ra.',
      svg: '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Luồng cập nhật A/B: ghi vào khe B trong khi khe A chạy, kiểm chữ ký, đổi BOOT_ORDER, boot thử B, đánh dấu tốt hoặc quay về A">' +
        '<rect class="d-box-g" x="20" y="30" width="150" height="56" rx="8"/>' +
        '<text class="d-t" x="95" y="54" text-anchor="middle">Khe A (vda1)</text>' +
        '<text class="d-ts" x="95" y="74" text-anchor="middle">đang chạy, không bị ghi</text>' +
        '<rect class="d-box-w" x="20" y="120" width="150" height="56" rx="8"/>' +
        '<text class="d-t" x="95" y="144" text-anchor="middle">Khe B (vda2)</text>' +
        '<text class="d-ts" x="95" y="164" text-anchor="middle">nhận bản mới</text>' +
        '<rect class="d-box" x="20" y="200" width="150" height="36" rx="8"/>' +
        '<text class="d-t" x="95" y="223" text-anchor="middle">/data (vda3)</text>' +
        '<rect class="d-box-p" x="220" y="120" width="110" height="56" rx="8"/>' +
        '<text class="d-t" x="275" y="144" text-anchor="middle">1. Ghi</text>' +
        '<text class="d-ts" x="275" y="164" text-anchor="middle">wget | gunzip | dd</text>' +
        '<rect class="d-box-p" x="350" y="120" width="110" height="56" rx="8"/>' +
        '<text class="d-t" x="405" y="144" text-anchor="middle">2. Kiểm</text>' +
        '<text class="d-ts" x="405" y="164" text-anchor="middle">chữ ký trên đĩa</text>' +
        '<rect class="d-box-a" x="480" y="120" width="110" height="56" rx="8"/>' +
        '<text class="d-t" x="535" y="144" text-anchor="middle">3. Công tắc</text>' +
        '<text class="d-tm" x="535" y="164" text-anchor="middle">BOOT_ORDER=B A</text>' +
        '<rect class="d-box-p" x="610" y="120" width="96" height="56" rx="8"/>' +
        '<text class="d-t" x="658" y="144" text-anchor="middle">4. Boot thử</text>' +
        '<text class="d-ts" x="658" y="164" text-anchor="middle">khe B</text>' +
        '<rect class="d-box-g" x="480" y="30" width="226" height="56" rx="8"/>' +
        '<text class="d-t" x="593" y="54" text-anchor="middle">5. Khoẻ: đánh dấu B tốt</text>' +
        '<text class="d-ts" x="593" y="74" text-anchor="middle">hỏng: hết lượt thử, quay về A</text>' +
        '<line class="d-line" x1="170" y1="148" x2="214" y2="148"/><path class="d-arrow" d="M220 148 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="330" y1="148" x2="344" y2="148"/><path class="d-arrow" d="M350 148 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="460" y1="148" x2="474" y2="148"/><path class="d-arrow" d="M480 148 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="590" y1="148" x2="604" y2="148"/><path class="d-arrow" d="M610 148 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="658" y1="120" x2="658" y2="92"/><path class="d-arrow" d="M658 86 l-4 8 h8 z"/>' +
        '</svg>' },
    { t: 'h3', x: 'Bộ đếm số lần thử: thứ biến A/B thành rollback tự động' },
    { t: 'p', x: 'Chỉ có hai khe chưa đủ. Giả sử khe B mới có kernel panic ngay khi boot: bo mạch khởi động lại, ' +
      'U-Boot đọc công tắc — vẫn là "boot B" — và panic lần nữa, mãi mãi. Thứ cần thêm là một <b>bộ đếm</b>: mỗi lần ' +
      'U-Boot chọn một khe, nó <i>trừ</i> lượt thử của khe đó <b>trước khi</b> boot, và ghi xuống flash. Chỉ khi hệ ' +
      'điều hành đã lên và tự kiểm tra thấy ổn, một chương trình trong Linux mới <i>trả lại</i> lượt thử đầy đủ. Khe ' +
      'nào hết lượt thì U-Boot bỏ qua và chọn khe tiếp theo trong danh sách.' },
    { t: 'p', x: 'Bộ ba biến dưới đây không phải do bài này nghĩ ra. Đó là đúng các biến mà <b>RAUC</b> dùng khi chạy ' +
      'với U-Boot — bạn sẽ tự viết phần U-Boot của hợp đồng đó, nên sau bài này đọc tài liệu RAUC sẽ thấy quen:' },
    { t: 'table', head: ['Biến', 'Ví dụ', 'Ai ghi', 'Ý nghĩa'],
      rows: [
        ['<code>BOOT_ORDER</code>', '<code>A B</code>', 'Chương trình cập nhật (Linux)', 'Thứ tự thử các khe. Đổi ' +
         'thành <code>B A</code> = công tắc A/B'],
        ['<code>BOOT_A_LEFT</code>', '<code>3</code>', 'U-Boot trừ, Linux trả lại', 'Số lần còn được thử khe A'],
        ['<code>BOOT_B_LEFT</code>', '<code>3</code>', 'U-Boot trừ, Linux trả lại', 'Số lần còn được thử khe B']
      ] },
    { t: 'cal', kind: 'why', title: 'Vì sao trừ trước khi boot, không phải sau khi lỗi',
      x: 'Một kernel panic, một watchdog reset hay một lần rút điện không cho ai cơ hội ghi "tôi vừa lỗi". Thứ duy ' +
         'nhất chắc chắn chạy ở mỗi lần boot là U-Boot, và nó chạy <b>trước</b> lỗi. Vì vậy nó phải giả định bi quan: ' +
         'trừ một lượt và lưu lại ngay, như thể lần boot này sẽ hỏng. Chỉ bằng chứng tích cực từ Linux ("daemon chạy, ' +
         'cảm biến có") mới xoá được giả định đó. Nhớ một câu: <b>im lặng nghĩa là thất bại</b>.' },

    { t: 'h2', x: 'Công tắc nằm ở đâu: môi trường U-Boot và hai bản sao' },
    { t: 'p', x: 'Ba biến trên phải sống ở nơi cả U-Boot lẫn Linux cùng đọc và ghi được, và sống sót qua mất điện. ' +
      'Ở Bài 35 bạn đã thấy chỗ đó: môi trường U-Boot trong NOR flash của <code>virt</code>, ở địa chỉ ' +
      '<code>0x4000000</code>, dài 256 KiB, dạng CRC32 rồi các chuỗi <code>tên=giá trị</code>. Bài 68 đã tắt nó ' +
      '(<code>ENV_IS_NOWHERE</code>) vì một môi trường ghi được là một đường vòng quanh chữ ký. Bài này bật lại, ' +
      'nhưng có kiểm soát.' },
    { t: 'p', x: 'Vấn đề của <b>một</b> bản môi trường: <code>saveenv</code> trên NOR flash là xoá cả khối rồi ghi ' +
      'lại. Mất điện giữa lúc đó và khối chỉ còn <code>0xff</code> — CRC sai, U-Boot rơi về môi trường mặc định, ' +
      'và công tắc A/B biến mất đúng lúc bạn cần nó nhất. Lời giải là <b>hai bản sao</b> ở hai khối khác nhau, mỗi ' +
      'bản mang một byte <i>cờ</i>. Mỗi lần lưu chỉ ghi bản cũ hơn, rồi mới đánh dấu nó là bản mới. Khi đọc, U-Boot ' +
      'lấy bản có CRC đúng và cờ mới hơn. Mất điện lúc nào thì vẫn còn ít nhất một bản nguyên vẹn.' },
    { t: 'fig', cap: 'Hai bản sao luân phiên: mỗi lần lưu chỉ phá bản cũ hơn. Rút điện ở bất kỳ thời điểm nào, luôn ' +
      'còn một bản có CRC đúng — có thể là bản trước lần lưu, nhưng không bao giờ là rác.',
      svg: '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Môi trường U-Boot dư thừa: hai khối 256 KiB tại 0x4000000 và 0x4040000, mỗi khối có CRC, cờ và dữ liệu, ghi luân phiên">' +
        '<text class="d-ts" x="20" y="24">NOR flash 1 (pflash index=1, 64 MiB, ánh xạ tại 0x4000000)</text>' +
        '<rect class="d-box-g" x="20" y="36" width="320" height="64" rx="8"/>' +
        '<text class="d-tm" x="36" y="58">0x4000000  (offset 0x00000)</text>' +
        '<text class="d-t" x="36" y="82">CRC32 | cờ = 5 | BOOT_ORDER=A B ...</text>' +
        '<rect class="d-box-w" x="380" y="36" width="320" height="64" rx="8"/>' +
        '<text class="d-tm" x="396" y="58">0x4040000  (offset 0x40000)</text>' +
        '<text class="d-t" x="396" y="82">CRC32 | cờ = 4 | bản trước đó</text>' +
        '<text class="d-ts" x="20" y="130">Lần saveenv tiếp theo:</text>' +
        '<text class="d-ts" x="36" y="152">1. xoá + ghi khối bên phải (cờ 4, cũ hơn) với dữ liệu mới, cờ = 6</text>' +
        '<text class="d-ts" x="36" y="172">2. khối bên trái không bị chạm — mất điện ở bước 1 thì U-Boot đọc lại cờ 5</text>' +
        '<text class="d-ts" x="36" y="192">3. lần sau đó ghi khối bên trái; hai khối cứ thế luân phiên</text>' +
        '</svg>' },
    { t: 'p', x: 'Còn lại câu hỏi bảo mật. Nếu môi trường trong flash được phép ghi đè <i>mọi</i> biến, kẻ tấn công ' +
      'chỉ cần sửa <code>bootcmd</code> hay <code>bootargs</code> là vòng qua chữ ký của Bài 68. U-Boot có sẵn hai ' +
      'tuỳ chọn cho đúng tình huống này:' },
    { t: 'table', head: ['Tuỳ chọn U-Boot', 'Tác dụng'],
      rows: [
        ['<code>CONFIG_ENV_WRITEABLE_LIST=y</code>', 'Biến nạp từ flash chỉ được ghi đè giá trị mặc định nếu biến ' +
         'đó mang cờ <code>w</code> trong <code>.flags</code>. Mọi biến khác lấy giá trị biên dịch sẵn trong ' +
         '<code>u-boot.bin</code> — tức là nằm trong phần đã ký/được tin cậy'],
        ['<code>.flags=BOOT_ORDER:sw,BOOT_A_LEFT:dw,...</code>', 'Danh sách đó. <code>s</code> = string, ' +
         '<code>d</code> = decimal, <code>w</code> = writeable'],
        ['<code>CONFIG_ENV_ACCESS_IGNORE_FORCE=y</code>', 'Chặn <code>env set -f</code> — cửa sau để ghi đè cờ'],
        ['<code>CONFIG_ENV_REDUNDANT=y</code> + <code>CONFIG_ENV_ADDR_REDUND</code>', 'Hai bản sao như hình trên']
      ] },

    { t: 'h2', x: 'RAUC, SWUpdate, Mender: ba công cụ, cùng một khung' },
    { t: 'p', x: 'Không ai viết tay hệ thống OTA cho sản phẩm thật. Ba công cụ mã nguồn mở phổ biến nhất đều đã có ' +
      'sẵn trong Buildroot và Yocto. Chúng khác nhau ở chỗ chia việc, nhưng bên dưới đều là A/B + bộ đếm + công tắc ' +
      'trong bootloader — đúng những gì bạn sắp dựng tay. Bài này <b>không</b> cài công cụ nào: dựng tay một lần ' +
      'là cách nhanh nhất để đọc cấu hình của bất kỳ công cụ nào về sau.' },
    { t: 'table', head: ['', 'RAUC', 'SWUpdate', 'Mender'],
      rows: [
        ['Gói cập nhật', '<code>.raucb</code>: SquashFS + manifest, ký CMS (X.509)', '<code>.swu</code>: cpio + ' +
         '<code>sw-description</code>, ký RSA/CMS', '<code>.mender</code>: tar + header, ký RSA/ECDSA'],
        ['Mô tả khe', '<code>system.conf</code> khai báo các khe và nhóm khe', 'Không có khái niệm khe cố định: ' +
         '<code>sw-description</code> nói ghi gì vào đâu (A/B, một khe + recovery, ...)', 'A/B cố định, hai ' +
         'phân vùng rootfs + <code>/data</code>'],
        ['Nói chuyện với bootloader', 'Backend U-Boot/GRUB/barebox/EFI; với U-Boot: <code>BOOT_ORDER</code>, ' +
         '<code>BOOT_x_LEFT</code>', 'Tuỳ biến bằng script/handler; thường dùng <code>bootcount</code>/' +
         '<code>upgrade_available</code> của U-Boot', '<code>upgrade_available</code>, <code>bootcount</code>, ' +
         '<code>mender_boot_part</code> trong env U-Boot/GRUB'],
        ['Đánh dấu tốt', '<code>rauc status mark-good</code>', 'Tuỳ dự án (thường xoá <code>upgrade_available</code>)',
         '<code>mender commit</code> (hoặc tự động khi client lên mạng)'],
        ['Máy chủ', 'Không kèm; thường ghép với Eclipse hawkBit', 'Không kèm; có webserver nội bộ + hawkBit',
         'Kèm máy chủ (tự host hoặc dịch vụ trả phí)'],
        ['Hợp với', 'Thiết bị cần mô hình khe chặt chẽ, dễ kiểm toán', 'Sản phẩm có bố cục lạ, cần tuỳ biến từng bước',
         'Đội nhỏ muốn có ngay máy chủ + giao diện quản lý đội máy']
      ] },
    { t: 'cal', kind: 'info', title: 'Hai biến thể của bộ đếm trong U-Boot',
      x: 'U-Boot có sẵn cơ chế <code>CONFIG_BOOTCOUNT_LIMIT</code> + <code>CONFIG_BOOTCOUNT_ENV</code>: khi ' +
         '<code>upgrade_available=1</code>, mỗi lần boot nó tăng <code>bootcount</code>; vượt <code>bootlimit</code> ' +
         'thì chạy <code>altbootcmd</code> thay cho <code>bootcmd</code>. SWUpdate và Mender dùng kiểu này. RAUC thì ' +
         'đếm <i>ngược</i> từng khe bằng script trong <code>bootcmd</code>. Hai kiểu tương đương về ý tưởng; bài này ' +
         'chọn kiểu RAUC vì nó hiện rõ cả thứ tự khe lẫn lượt thử của từng khe trong một lệnh ' +
         '<code>fw_printenv</code>.' },
    { t: 'terms', items: [
      ['OTA', 'over-the-air', 'Cập nhật phần mềm qua mạng, không cần chạm vào thiết bị.'],
      ['Khe (slot)', 'A/B', 'Một phân vùng chứa một bản hệ thống hoàn chỉnh có thể boot được. Có hai khe để luôn ' +
       'còn một bản không bị ghi.'],
      ['Khe hoạt động', 'active slot', 'Khe đang chạy. Không bao giờ bị cập nhật ghi vào.'],
      ['Rollback', '', 'Quay về khe cũ khi khe mới không chứng minh được mình chạy tốt.'],
      ['Mark-good', 'commit', 'Linux xác nhận khe vừa boot là tốt, trả lại đủ lượt thử. Thiếu bước này, khe mới chỉ ' +
       'là "đang thử".'],
      ['Môi trường dư thừa', 'redundant env', 'Hai bản sao môi trường U-Boot ghi luân phiên, để mất điện lúc ' +
       '<code>saveenv</code> không xoá mất cấu hình boot.'],
      ['fw_printenv / fw_setenv', 'uboot-tools', 'Công cụ Linux đọc/ghi môi trường U-Boot trực tiếp trên flash, ' +
       'theo đúng định dạng CRC + hai bản sao của U-Boot.']
    ] },

    { t: 'h2', x: 'Thực hành: Thermo tự cập nhật và tự quay về' },
    { t: 'p', x: 'Bạn xuất phát từ Thermo đã gia cố của Bài 68 (<code>~/bai68/thermo</code>, khoá ' +
      '<code>~/bai68/keys</code>) và dùng lại cây Buildroot <code>~/bai67/buildroot-2026.02.3</code> cùng kho tải ' +
      '<code>dl/</code> của nó. Mọi thứ của bài này nằm dưới <code>~/bai69</code>. Kết quả cuối: 37 file trong cây ' +
      'br2-external, so với Bài 68 có 7 file sửa, 5 file mới và 1 file bỏ (<code>extlinux.conf</code>).' },
    { t: 'steps', items: [
      { title: 'Chia đĩa A/B và dạy U-Boot chọn khe', blocks: [
        { t: 'p', x: 'Chép cây của Bài 68 sang chỗ mới, để Bài 68 vẫn còn nguyên nếu bạn muốn so sánh. Thư mục ' +
          '<code>overlay/boot</code> (chứa <code>extlinux.conf</code>) bị xoá: từ nay không phải bootflow quét ' +
          '<code>extlinux.conf</code> chọn kernel nữa, mà là script A/B của bạn.' },
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai69 && cd ~/bai69\n' +
          'cp -a ~/bai68/thermo thermo\n' +
          'T=~/bai69/thermo/board/thermo\n' +
          'rm -rf $T/overlay/boot\n' +
          'sed -i "s|/dev/vda2|/dev/vda3|" $T/overlay/etc/fstab\n' +
          'echo "VERSION=1.0" > $T/overlay/etc/thermo-release' },
        { t: 'p', x: '<code>/data</code> chuyển từ <code>vda2</code> sang <code>vda3</code> vì <code>vda2</code> giờ ' +
          'là khe B. File <code>/etc/thermo-release</code> là dấu hiệu nhìn thấy được: mỗi bản phát hành ghi số phiên ' +
          'bản vào đây, nên sau mỗi lần boot bạn biết ngay mình đang chạy bản nào.' },
        { t: 'p', x: 'Bố cục đĩa mới: khe A nhận <code>rootfs.ext4</code> lúc xuất xưởng, khe B để trống nhưng phải ' +
          '<b>cùng kích thước</b> (96M — đúng <code>BR2_TARGET_ROOTFS_EXT2_SIZE</code>), vì sau này nó nhận đúng ảnh ' +
          'đó qua mạng. Thay toàn bộ <code>genimage.cfg</code>:' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/board/thermo/genimage.cfg', code:
          'image data.ext4 {\n\text4 {\n\t\tlabel = "data"\n\t}\n\tempty = true\n\tsize = 16M\n}\n\n' +
          'image disk.img {\n\thdimage {\n\t}\n\n' +
          '\tpartition rootfsA {\n\t\tpartition-type = 0x83\n\t\timage = "rootfs.ext4"\n\t\tbootable = true\n\t}\n\n' +
          '\tpartition rootfsB {\n\t\tpartition-type = 0x83\n\t\tsize = 96M\n\t}\n\n' +
          '\tpartition data {\n\t\tpartition-type = 0x83\n\t\timage = "data.ext4"\n\t}\n}' },
        { t: 'p', x: 'Tiếp theo là U-Boot. Bài 68 cho nó <code>ENV_IS_NOWHERE</code> và ' +
          '<code>bootflow scan</code>; giờ nó cần một môi trường <b>ghi được</b> trong flash (để giữ bộ đếm) và một ' +
          '<code>bootcmd</code> chạy script chọn khe. Mở <code>uboot.fragment</code>, xoá ba dòng ' +
          '<code>CONFIG_BOOTCOMMAND</code>, <code># CONFIG_ENV_IS_IN_FLASH is not set</code>, ' +
          '<code>CONFIG_ENV_IS_NOWHERE=y</code>, rồi để file thành như sau:' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/board/thermo/uboot.fragment', code:
          '# CONFIG_TOOLS_MKEFICAPSULE is not set\n' +
          '# lesson 68: boot only a signed FIT, never fall back to a prompt\n' +
          '# CONFIG_BOOTSTD_DEFAULTS is not set\n' +
          '# CONFIG_CMD_BOOTI is not set\n' +
          '# CONFIG_LEGACY_IMAGE_FORMAT is not set\n' +
          '# CONFIG_EFI_LOADER is not set\n' +
          'CONFIG_BOOTDELAY=-2\n' +
          '# lesson 69: slot selection is the script thermo_ab (qemu-arm.env, patch 0002)\n' +
          'CONFIG_BOOTCOMMAND="run thermo_ab"\n' +
          '# lesson 69: environment back in NOR flash, two copies, only the A/B variables may come from it\n' +
          '# CONFIG_ENV_IS_NOWHERE is not set\n' +
          'CONFIG_ENV_IS_IN_FLASH=y\n' +
          'CONFIG_ENV_REDUNDANT=y\n' +
          'CONFIG_ENV_ADDR_REDUND=0x4040000\n' +
          'CONFIG_ENV_WRITEABLE_LIST=y\n' +
          'CONFIG_ENV_ACCESS_IGNORE_FORCE=y' },
        { t: 'cmdx', title: 'Năm dòng mới của uboot.fragment', rows: [
          ['<code>CONFIG_BOOTCOMMAND="run thermo_ab"</code>', 'Mỗi lần bật máy, U-Boot chạy biến môi trường ' +
           '<code>thermo_ab</code> — script chọn khe do patch 0002 bên dưới đưa vào môi trường mặc định.'],
          ['<code>CONFIG_ENV_IS_IN_FLASH=y</code>', 'Môi trường đọc/ghi ở NOR flash thứ hai của <code>virt</code>, ' +
           '<code>CONFIG_ENV_ADDR=0x4000000</code>, 256 KiB — giá trị có sẵn trong <code>qemu_arm64_defconfig</code> ' +
           '(Bài 35).'],
          ['<code>CONFIG_ENV_REDUNDANT=y</code> + <code>ENV_ADDR_REDUND=0x4040000</code>', 'Bản sao thứ hai ' +
           'ở khối flash kế tiếp (0x4000000 + 0x40000). Mỗi khối xoá 256 KiB, nên hai bản không bao giờ chung một lần ' +
           'xoá.'],
          ['<code>CONFIG_ENV_WRITEABLE_LIST=y</code>', 'Từ flash, U-Boot chỉ nhận các biến có cờ <code>w</code>. ' +
           '<code>bootcmd</code>, <code>thermo_ab</code>, <code>bootargs</code> luôn lấy từ <code>u-boot.bin</code>.'],
          ['<code>CONFIG_ENV_ACCESS_IGNORE_FORCE=y</code>', 'Không cho <code>env set -f</code> lách qua cờ.']
        ] },
        { t: 'p', x: 'Script chọn khe và danh sách biến được ghi đi vào U-Boot qua một patch thứ hai, cạnh patch ' +
          '<code>fdt_addr_r</code> của Bài 67. Môi trường mặc định của board <code>qemu-arm</code> nằm trong file ' +
          'văn bản <code>board/emulation/qemu-arm/qemu-arm.env</code>: mỗi dòng bắt đầu ở cột 1 bằng ' +
          '<code>tên=</code> là một biến mới, các dòng thụt vào được nối tiếp bằng dấu cách. Danh sách biến ghi được ' +
          'phải là một hằng số C, <code>CFG_ENV_FLAGS_LIST_STATIC</code> — <b>không</b> phải biến ' +
          '<code>.flags</code> trong môi trường (lý do ở bảng Lỗi thường gặp: bạn sẽ gặp đúng lỗi đó nếu làm khác).' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/board/thermo/patches/uboot/0002-qemu-arm-ab-slot-selection.patch', code:
          'From: Thermo <thermo@example.com>\n' +
          'Subject: [PATCH] qemu-arm: A/B slot selection for Thermo\n\n' +
          '---\n' +
          '--- a/board/emulation/qemu-arm/qemu-arm.env\n' +
          '+++ b/board/emulation/qemu-arm/qemu-arm.env\n' +
          '@@ -14,3 +14,32 @@\n' +
          ' kernel_addr_r=0x40400000\n' +
          ' ramdisk_addr_r=0x44000000\n' +
          ' boot_targets=qfw usb scsi virtio nvme dhcp\n' +
          '+\n' +
          '+/* lesson 69: A/B slot selection, same variables as RAUC\'s U-Boot backend */\n' +
          '+BOOT_ORDER=A B\n' +
          '+BOOT_A_LEFT=3\n' +
          '+BOOT_B_LEFT=3\n' +
          '+thermo_ab=\n' +
          '+\tsetenv slot;\n' +
          '+\tfor s in ${BOOT_ORDER}; do\n' +
          '+\t\tif test -z "${slot}"; then\n' +
          '+\t\t\tif test "${s}" = "A" && test ${BOOT_A_LEFT} -gt 0; then\n' +
          '+\t\t\t\tsetexpr BOOT_A_LEFT ${BOOT_A_LEFT} - 1;\n' +
          '+\t\t\t\tsetenv slot A; setenv part 1;\n' +
          '+\t\t\telif test "${s}" = "B" && test ${BOOT_B_LEFT} -gt 0; then\n' +
          '+\t\t\t\tsetexpr BOOT_B_LEFT ${BOOT_B_LEFT} - 1;\n' +
          '+\t\t\t\tsetenv slot B; setenv part 2;\n' +
          '+\t\t\tfi;\n' +
          '+\t\tfi;\n' +
          '+\tdone;\n' +
          '+\tif test -z "${slot}"; then\n' +
          '+\t\techo "thermo: no slot has tries left, giving both 3 again";\n' +
          '+\t\tsetenv BOOT_A_LEFT 3; setenv BOOT_B_LEFT 3; saveenv; reset;\n' +
          '+\tfi;\n' +
          '+\techo "thermo: boot slot ${slot} (A left ${BOOT_A_LEFT}, B left ${BOOT_B_LEFT})";\n' +
          '+\tsaveenv;\n' +
          '+\tsetenv bootargs "root=/dev/vda${part} ro rootwait console=ttyAMA0 panic=5 thermo.slot=${slot}";\n' +
          '+\tvirtio scan;\n' +
          '+\tif ext4load virtio 0:${part} ${kernel_addr_r} /boot/thermo.itb; then bootm ${kernel_addr_r}; fi;\n' +
          '+\techo "thermo: slot ${slot} did not boot";\n' +
          '+\treset\n' +
          '--- a/include/configs/qemu-arm.h\n' +
          '+++ b/include/configs/qemu-arm.h\n' +
          '@@ -9,6 +9,9 @@\n' +
          ' /* Physical memory map */\n' +
          ' #define CFG_SYS_SDRAM_BASE\t\t0x40000000\n' +
          ' \n' +
          '+/* lesson 69: the only variables the environment in flash may change */\n' +
          '+#define CFG_ENV_FLAGS_LIST_STATIC "BOOT_ORDER:sw,BOOT_A_LEFT:dw,BOOT_B_LEFT:dw"\n' +
          '+\n' +
          ' /* For timer, QEMU emulates an ARMv7/ARMv8 architected timer */\n' +
          ' \n' +
          ' #endif /* __CONFIG_H */',
          notes: ['Dòng thụt vào trong patch là ký tự Tab. Cách chắc ăn nhất để có patch đúng là tạo nó bằng ' +
            '<code>diff -u</code> giữa hai bản sao <code>a/</code> và <code>b/</code> của hai file, như Bài 61 đã ' +
            'làm với <code>git format-patch</code>; dòng tiêu đề <code>---</code>/<code>+++</code> của bạn sẽ kèm ' +
            'ngày giờ, không sao.'] },
        { t: 'cmdx', title: 'Đọc script thermo_ab', rows: [
          ['<code>for s in ${BOOT_ORDER}</code>', 'Duyệt các khe theo thứ tự ưu tiên. Hush của U-Boot tách chuỗi ' +
           '<code>A B</code> theo dấu cách như shell thường.'],
          ['<code>test ${BOOT_A_LEFT} -gt 0</code>', 'Khe chỉ được chọn khi còn lượt thử.'],
          ['<code>setexpr BOOT_A_LEFT ${BOOT_A_LEFT} - 1</code>', 'Trừ một lượt <b>trước</b> khi boot — giả định ' +
           'bi quan ở phần lý thuyết.'],
          ['<code>saveenv</code>', 'Ghi bộ đếm xuống flash ngay, trước khi nạp kernel. Không có dòng này, một kernel ' +
           'panic sẽ không bao giờ tiêu lượt nào.'],
          ['<code>thermo.slot=${slot}</code>', 'Tham số kernel không ai dùng, chỉ để Linux biết mình đang ở khe ' +
           'nào — đọc lại qua <code>/proc/cmdline</code>.'],
          ['<code>panic=5</code>', 'Kernel panic thì tự khởi động lại sau 5 s, thay vì treo chờ người bấm nút. ' +
           'Không có nó, panic sẽ không bao giờ đưa bo mạch về lại U-Boot để tiêu lượt tiếp.'],
          ['<code>ext4load … /boot/thermo.itb</code> + <code>bootm</code>', 'Nạp FIT đã ký của Bài 68 từ chính khe đã ' +
           'chọn. <code>bootm</code> vẫn kiểm chữ ký: khe nào cũng phải mang FIT hợp lệ.'],
          ['<code>reset</code> (cuối cùng)', 'Nạp hoặc kiểm chữ ký thất bại thì khởi động lại — lần sau lượt của khe ' +
           'này đã ít đi một.'],
          ['Nhánh "no slot has tries left"', 'Cả hai khe đều cạn: trả lại 3 lượt cho cả hai thay vì treo vĩnh viễn. ' +
           'Một thiết bị không ai trông thà thử lại mãi còn hơn chết.']
        ] },
        { t: 'p', x: 'Phía Linux cần ba thứ: driver cho NOR flash (để <code>/dev/mtd0</code> tồn tại), ' +
          '<code>fw_printenv</code>/<code>fw_setenv</code>, và <code>openssl</code> để kiểm chữ ký ảnh cập nhật. Cấu ' +
          'hình kernel <code>aarch64-virt</code> của Buildroot không bật MTD, nên thêm vào ' +
          '<code>linux.fragment</code>; <code>fw_env.config</code> nói cho <code>fw_setenv</code> hai bản sao nằm ở ' +
          'đâu trong <code>/dev/mtd0</code>:' },
        { t: 'code', where: 'wsl', code:
          'cat >> $T/linux.fragment << \'EOF\'\n' +
          '# lesson 69: the NOR flash holding the U-Boot environment, for fw_printenv/fw_setenv\n' +
          'CONFIG_MTD=y\nCONFIG_MTD_CFI=y\nCONFIG_MTD_CFI_INTELEXT=y\nCONFIG_MTD_PHYSMAP=y\nCONFIG_MTD_PHYSMAP_OF=y\n' +
          'EOF\n' +
          'printf \'# device\\t\\toffset\\t\\tsize\\t\\terase-size\\n/dev/mtd0\\t\\t0x4000000\\t0x40000\\t\\t0x40000\\n' +
          '/dev/mtd0\\t\\t0x4040000\\t0x40000\\t\\t0x40000\\n\' > $T/overlay/etc/fw_env.config\n' +
          'cat >> ~/bai69/thermo/configs/thermo_defconfig << \'EOF\'\n' +
          'BR2_PACKAGE_OPENSSL=y\nBR2_PACKAGE_LIBOPENSSL_BIN=y\nBR2_PACKAGE_UBOOT_TOOLS=y\n' +
          'BR2_PACKAGE_UBOOT_TOOLS_FWPRINTENV=y\n# BR2_PACKAGE_UBOOT_TOOLS_MKIMAGE is not set\n' +
          '# BR2_PACKAGE_UBOOT_TOOLS_MKEFICAPSULE is not set\n' +
          'EOF\n' +
          'cat >> $T/post-build.sh << \'EOF\'\n\n' +
          '# lesson 69: the public half of the key checks update images on the board\n' +
          'mkdir -p "$TARGET/etc/thermo"\n' +
          'openssl x509 -in "$KEY_DIR/thermo-dev.crt" -pubkey -noout > "$TARGET/etc/thermo/update.pem"\n' +
          'EOF' },
        { t: 'cmdx', title: 'Vì sao từng dòng', rows: [
          ['<code>MTD_PHYSMAP_OF</code> + <code>MTD_CFI_INTELEXT</code>', 'Node <code>flash@0</code> có ' +
           '<code>compatible = "cfi-flash"</code> (Bài 67 đã dump nó); hai tuỳ chọn này là driver khớp với node đó và ' +
           'với tập lệnh Intel mà flash của QEMU giả lập.'],
          ['<code>/dev/mtd0  0x4000000</code>', 'Hai ngân flash 64 MiB của <code>virt</code> bị kernel <b>nối ' +
           'liền</b> thành một <code>mtd0</code> 128 MiB, nên môi trường của U-Boot ở <code>0x4000000</code> cũng là ' +
           'offset <code>0x4000000</code> trong <code>mtd0</code>. Bước 2 cho thấy điều này trong log kernel.'],
          ['<code>BR2_PACKAGE_UBOOT_TOOLS_FWPRINTENV</code>', 'Gói <code>uboot-tools</code> 2025.10, chỉ lấy ' +
           '<code>fw_printenv</code> (35 016 B, <code>fw_setenv</code> là symlink tới nó). Tắt ' +
           '<code>mkimage</code>/<code>mkeficapsule</code> — bo mạch không cần.'],
          ['<code>BR2_PACKAGE_LIBOPENSSL_BIN</code>', 'Lệnh <code>openssl</code> trên bo mạch (1 053 984 B) để kiểm ' +
           'chữ ký ảnh. Cái giá kích thước được nói ở phần so sánh công cụ: RAUC/SWUpdate dùng thư viện chứ không cần ' +
           'binary này.'],
          ['<code>openssl x509 … -pubkey</code>', 'Chỉ nửa <b>công khai</b> của khoá Bài 68 vào rootfs. Khoá bí mật ' +
           'vẫn chỉ nằm trong <code>~/bai68/keys</code>.']
        ] },
        { t: 'p', x: 'Còn ba file mới trong overlay — chương trình cập nhật, script đánh dấu khe tốt, và công cụ đóng ' +
          'gói phía máy build. Chúng được đọc kỹ ở Bước 3 và 4; giờ chỉ cần tạo chúng (nội dung ở hai bước đó), rồi ' +
          'build. Build sạch đo được <b>8m0s</b> (Bài 68: 7m29s) — thêm <code>libopenssl</code>, ' +
          '<code>uboot-tools</code> và host <code>libopenssl</code>:' },
        { t: 'code', where: 'wsl', code:
          'cd ~/bai67/buildroot-2026.02.3\n' +
          'make O=~/bai69/out BR2_EXTERNAL=~/bai69/thermo thermo_defconfig\n' +
          'cd ~/bai69/out\n' +
          'export THERMO_KEY_DIR=~/bai68/keys\n' +
          'time make\n' +
          '/sbin/fdisk -l images/disk.img | tail -4' },
        { t: 'code', where: 'out', nocopy: true, code:
          'real\t8m0.310s\n' +
          'Device           Boot  Start    End Sectors Size Id Type\n' +
          'images/disk.img1 *         1 196608  196608  96M 83 Linux\n' +
          'images/disk.img2      196609 393216  196608  96M 83 Linux\n' +
          'images/disk.img3      393217 425984   32768  16M 83 Linux' },
        { t: 'cal', kind: 'info', title: 'Đọc bảng phân vùng',
          x: 'Hai khe đúng bằng nhau, <b>196 608</b> sector = 96 MiB mỗi khe, <code>/data</code> 16 MiB ở cuối. ' +
             '<code>disk.img</code> giờ nặng <b>218 104 320 B</b> (Bài 68: 117 441 024 B) — cái giá của A/B là gấp đôi ' +
             'dung lượng rootfs, và đó là lý do lớn nhất khiến có sản phẩm chọn kiểu "một khe + recovery" của SWUpdate. ' +
             'Thời gian build trên máy bạn sẽ khác; các con số kích thước thì không.' }
      ] },
      { title: 'Lần boot đầu: U-Boot chọn khe A, Linux đọc được bộ đếm', blocks: [
        { t: 'p', x: 'QEMU cần thêm một ổ: <b>NOR flash thứ hai</b> (<code>-drive if=pflash,index=1</code>) làm nơi ' +
          'chứa môi trường U-Boot. Bài 35 đã cho thấy: với <code>-bios</code> mà không có file pflash, môi trường chỉ ' +
          'sống trong RAM của tiến trình QEMU — tắt QEMU là mất, tức là mất bộ đếm. Một file 64 MiB toàn số 0 là đủ; ' +
          'U-Boot sẽ thấy CRC sai và dùng môi trường mặc định ở lần đầu. Khoá công khai vẫn đi vào U-Boot qua ' +
          '<code>-dtb control.dtb</code> như Bài 68, và tree đó phải được dump lại với đúng bộ ổ đĩa mới:' },
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai69/lab && cd ~/bai69/lab\n' +
          'cp ../out/images/u-boot.bin ../out/images/disk.img .\n' +
          'truncate -s 64M flash1.img\n' +
          'qemu-system-aarch64 -M virt,dumpdtb=qemu.dtb -cpu cortex-a57 -m 512 -nographic -bios u-boot.bin \\\n' +
          '  -drive if=pflash,format=raw,index=1,file=flash1.img \\\n' +
          '  -drive file=disk.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
          '  -netdev user,id=eth0 -device virtio-net-device,netdev=eth0\n' +
          'cp qemu.dtb control.dtb\n' +
          '../out/build/uboot-2026.01/tools/fdt_add_pubkey -a sha256,rsa2048 -k ~/bai68/keys -n thermo-dev -r conf control.dtb; echo rc=$?\n' +
          'fdtget -l control.dtb /signature; fdtget control.dtb /signature/key-thermo-dev required' },
        { t: 'code', where: 'out', nocopy: true, code: 'rc=0\nkey-thermo-dev\nconf' },
        { t: 'p', x: 'Giống hệt Bài 68: khoá <code>key-thermo-dev</code> có mặt và bắt buộc ở mức ' +
          '<code>conf</code>. Giờ là script khởi động QEMU dùng cho cả bài — nó nhận một thư mục chứa bốn file, để ' +
          'bạn có thể sao chép cả thư mục ra làm "bản chụp" của một chiếc Thermo trước mỗi thí nghiệm:' },
        { t: 'code', where: 'file', name: '~/bai69/run-ab.sh', code:
          '#!/bin/sh\n' +
          '# run-ab.sh DIR -- boot Thermo A/B: u-boot.bin, control.dtb, flash1.img (U-Boot env), disk.img\n' +
          'D=${1:?usage: run-ab.sh DIR}\n' +
          'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
          '\t-bios "$D/u-boot.bin" -dtb "$D/control.dtb" \\\n' +
          '\t-drive if=pflash,format=raw,index=1,file="$D/flash1.img" \\\n' +
          '\t-drive file="$D/disk.img",if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0 \\\n' +
          '\t-netdev user,id=eth0 -device virtio-net-device,netdev=eth0' },
        { t: 'code', where: 'wsl', code: 'chmod +x ~/bai69/run-ab.sh\n~/bai69/run-ab.sh ~/bai69/lab' },
        { t: 'code', where: 'out', nocopy: true, code:
          'U-Boot 2026.01 (Nov 03 2026 - 11:33:37 +0700)\n\n' +
          'DRAM:  512 MiB\n' +
          'Flash: 64 MiB\n' +
          'Loading Environment from Flash... *** Warning - bad CRC, using default environment\n' +
          '...\n' +
          'thermo: boot slot A (A left 2, B left 3)\n' +
          'Saving Environment to Flash... Un-Protected 2 sectors\n' +
          'Un-Protected 2 sectors\n' +
          'Erasing Flash...\n' +
          '.. done\n' +
          'Erased 2 sectors\n' +
          'Writing to Flash... done\n' +
          'Protected 2 sectors\n' +
          'Protected 2 sectors\n' +
          'OK\n' +
          '13444614 bytes read in 13 ms (986.3 MiB/s)\n' +
          '   Verifying Hash Integrity ... sha256,rsa2048:thermo-dev+ OK\n' +
          '...\n' +
          'Starting kernel ...\n' +
          '[    0.349792] physmap-flash 0.flash: physmap platform flash device: [mem 0x00000000-0x03ffffff]\n' +
          '[    0.352434] physmap-flash 0.flash: physmap platform flash device: [mem 0x04000000-0x07ffffff]\n' +
          '[    0.353093] Concatenating MTD devices:\n' +
          '[    0.353128] into device "0.flash"\n' +
          '...\n' +
          'Starting temp_daemon: OK\n' +
          'Checking slot A (tries left 2): OK, slot A marked good\n\n' +
          'Thermo 1.0 - lesson 69\n' +
          'thermo login:',
          notes: ['Rút gọn: bỏ các dòng chi tiết FIT (đã đọc ở Bài 68), DHCP và phần lớn log kernel. Mật khẩu root ' +
            'vẫn là <code>thermo-lab</code> của Bài 68. Ngày giờ build và tốc độ <code>bytes read</code> sẽ khác trên ' +
            'máy bạn.'] },
        { t: 'cal', kind: 'info', title: 'Đọc từng dòng quan trọng',
          x: '<ul><li><code>bad CRC, using default environment</code> — đúng như dự đoán: flash toàn số 0, U-Boot dùng ' +
             'môi trường biên dịch sẵn, trong đó <code>BOOT_ORDER=A B</code>, mỗi khe 3 lượt.</li>' +
             '<li><code>thermo: boot slot A (A left 2, B left 3)</code> — script đã chọn A và trừ lượt <b>trước</b> ' +
             'khi nạp kernel; ngay sau đó <code>Saving Environment</code> xoá và ghi flash: <code>Erased 2 sectors</code>.' +
             '</li><li>Hai dòng <code>physmap-flash</code> + <code>Concatenating MTD devices</code> — kernel thấy hai ngân ' +
             'flash và nối chúng thành một thiết bị, đúng giả định của <code>fw_env.config</code>.</li>' +
             '<li><code>Checking slot A (tries left 2): OK, slot A marked good</code> — script ' +
             '<code>S99confirm</code> (Bước 4 đọc nó) thấy daemon chạy, cảm biến có, và trả lại đủ 3 lượt.</li></ul>' },
        { t: 'p', x: 'Đăng nhập và nhìn cùng các biến đó từ phía Linux:' },
        { t: 'code', where: 'qemu', name: 'trong Thermo, sau thermo login: root', code:
          'cat /proc/cmdline\ncat /proc/mtd\nfw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT\nmount | grep vda' },
        { t: 'code', where: 'out', nocopy: true, code:
          'root=/dev/vda1 ro rootwait console=ttyAMA0 panic=5 thermo.slot=A\n' +
          'dev:    size   erasesize  name\n' +
          'mtd0: 08000000 00040000 "0.flash"\n' +
          'BOOT_ORDER=A B\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3\n' +
          '/dev/vda3 on /data type ext4 (rw,nosuid,nodev,noexec,relatime)' },
        { t: 'cal', kind: 'info', title: 'Điều output này chứng minh',
          x: '<code>bootargs</code> do script dựng: <code>root=/dev/vda1</code> và <code>thermo.slot=A</code>. ' +
             '<code>mtd0</code> dài <code>0x08000000</code> = 128 MiB (hai ngân nối lại), khối xoá <code>0x40000</code> ' +
             '= 256 KiB — khớp cột <code>erase-size</code> của <code>fw_env.config</code>. <code>BOOT_A_LEFT=3</code> chứ ' +
             'không phải 2: U-Boot đã trừ còn 2, rồi <code>S99confirm</code> trả lại 3. Gõ <code>poweroff</code> để ' +
             'tắt.' },
        { t: 'p', x: 'Từ WSL, nhìn thẳng vào file flash để thấy hai bản sao. Mỗi bản bắt đầu bằng 4 byte CRC32 rồi ' +
          '<b>1 byte cờ</b>:' },
        { t: 'code', where: 'wsl', code:
          'cd ~/bai69/lab\nod -A x -t x1z -N 32 flash1.img\nod -A x -t x1z -j 0x40000 -N 32 flash1.img' },
        { t: 'code', where: 'out', nocopy: true, code:
          '000000 09 01 79 67 00 ff ff ff 54 5f 41 5f 4c 45 46 54  >..yg....T_A_LEFT<\n' +
          '000010 3d 32 00 42 4f 4f 54 5f 42 5f 4c 45 46 54 3d 33  >=2.BOOT_B_LEFT=3<\n' +
          '040000 c0 88 26 f7 01 42 4f 4f 54 5f 42 5f 4c 45 46 54  >..&..BOOT_B_LEFT<\n' +
          '040010 3d 33 00 42 4f 4f 54 5f 4f 52 44 45 52 3d 41 20  >=3.BOOT_ORDER=A <' },
        { t: 'cal', kind: 'info', title: 'Hai lần ghi, hai bản sao',
          x: 'Bản ở <code>0x00000</code> là lần ghi của U-Boot (<code>BOOT_A_LEFT=2</code>), cờ <code>00</code> = ' +
             '<b>cũ</b>. Bản ở <code>0x40000</code> là lần ghi của <code>fw_setenv</code> trong <code>S99confirm</code> ' +
             '(<code>BOOT_A_LEFT=3</code>), cờ <code>01</code> = <b>đang dùng</b>. Mỗi lần ghi chọn bản kia — đúng hình ' +
             'luân phiên ở phần lý thuyết. Ba byte <code>ff ff ff</code> ngay sau cờ <code>00</code> lẽ ra là ' +
             '<code>BOO</code>: đó là một tật của flash giả lập trong QEMU 4.2.1, xem callout bên dưới. Giá trị CRC sẽ ' +
             'khác nếu môi trường của bạn khác dù chỉ một byte.' },
        { t: 'cal', kind: 'warn', title: 'QEMU 4.2.1 làm hỏng bản sao cũ sau mỗi lần fw_setenv',
          x: 'Để đánh dấu bản cũ, <code>fw_setenv</code> ghi <b>một byte</b> <code>00</code> vào ô cờ. Flash của ' +
             '<code>virt</code> rộng 4 byte, nên driver MTD ghi cả một từ 4 byte, đệm bằng <code>ff</code>. Trên NOR ' +
             'thật, lệnh ghi chỉ có thể <i>xoá</i> bit (1 → 0), nên đệm <code>ff</code> không đổi gì. Bộ giả lập pflash ' +
             'của QEMU 4.2.1 có vẻ chép thẳng giá trị, nên ba byte sau cờ thành <code>ff</code> và CRC của bản cũ sai. ' +
             'U-Boot ghi cờ theo cách khác và không gây ra điều này (sau một lần <code>saveenv</code> của U-Boot, cả ' +
             'hai bản đều đúng CRC — đã đo). Hệ quả: trên QEMU, sau khi Linux ghi, chỉ còn <b>một</b> bản dùng được. ' +
             'An toàn khi mất điện <i>trong lúc</i> ghi vẫn còn (bản đang dùng không bị chạm cho tới khi bản mới ghi ' +
             'xong); cái mất là bản dự phòng "lần trước". Đây là kết luận từ dữ liệu đo, chưa đối chiếu mã nguồn QEMU.' }
      ] },
      { title: 'Phát hành bản 1.1 và cập nhật qua mạng', blocks: [
        { t: 'p', x: 'Một bản cập nhật của Thermo gồm ba file đặt trên máy chủ: ảnh ext4 nén gzip (để tải ít hơn), ' +
          'chữ ký RSA của ảnh <b>chưa nén</b>, và kích thước ảnh chưa nén. Ký ảnh chưa nén vì đó là thứ sẽ nằm trên ' +
          'đĩa — bo mạch sẽ kiểm tra đúng những byte đó. Công cụ đóng gói đọc khoá từ <code>THERMO_KEY_DIR</code>, ' +
          'giống <code>post-build.sh</code> của Bài 68:' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/mkupdate.sh', code:
          '#!/bin/sh\n' +
          '# mkupdate.sh ROOTFS_EXT4 OUT -- turn one rootfs image into an update: OUT.gz, OUT.sig, OUT.size\n' +
          '# The private key is read from $THERMO_KEY_DIR, exactly like post-build.sh.\n' +
          'set -eu\n' +
          'IMG=${1:?usage: mkupdate.sh ROOTFS_EXT4 OUT}\n' +
          'OUT=${2:?usage: mkupdate.sh ROOTFS_EXT4 OUT}\n' +
          'KEY=${THERMO_KEY_DIR:?set THERMO_KEY_DIR}/thermo-dev.key\n\n' +
          'gzip -9 -n -c "$IMG" > "$OUT.gz"\n' +
          'openssl dgst -sha256 -sign "$KEY" -out "$OUT.sig" "$IMG"\n' +
          'stat -c %s "$IMG" > "$OUT.size"\n' +
          'ls -l "$OUT.gz" "$OUT.sig" "$OUT.size"' },
        { t: 'p', x: 'Trên bo mạch, <code>thermo-update</code> làm năm việc theo đúng thứ tự của hình ở phần lý ' +
          'thuyết. Đặt nó vào overlay:' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/board/thermo/overlay/usr/sbin/thermo-update', code:
          '#!/bin/sh\n' +
          '# thermo-update URL -- install a signed rootfs image into the slot that is NOT running.\n' +
          '# The server publishes URL.gz (gzip of the raw ext4 image), URL.sig (signature of the raw\n' +
          '# image) and URL.size (its size in bytes).\n' +
          'set -eu\n' +
          'URL=${1:?usage: thermo-update URL}\n' +
          'KEY=/etc/thermo/update.pem\n\n' +
          'cur=$(sed -n \'s/.*thermo\\.slot=\\([AB]\\).*/\\1/p\' /proc/cmdline)\n' +
          'case "$cur" in\n' +
          '\tA) new=B; dev=/dev/vda2 ;;\n' +
          '\tB) new=A; dev=/dev/vda1 ;;\n' +
          '\t*) echo "thermo-update: cannot tell which slot is running" >&2; exit 1 ;;\n' +
          'esac\n' +
          'if grep -q "^$dev " /proc/mounts; then\n' +
          '\techo "thermo-update: $dev is mounted, refusing to write it" >&2\n' +
          '\texit 1\n' +
          'fi\n' +
          'echo "running slot $cur, writing slot $new ($dev)"\n\n' +
          'wget -q -O /tmp/update.sig "$URL.sig"\n' +
          'size=$(wget -q -O - "$URL.size")\n\n' +
          '# stream: network -> gunzip -> inactive partition, never through RAM or /data\n' +
          'wget -q -O - "$URL.gz" | gunzip -c | dd of="$dev" bs=1M conv=fsync\n' +
          'echo "written, verifying what is on $dev now"\n\n' +
          '# check the bytes on the disk, not the bytes that came over the network\n' +
          'if ! head -c "$size" "$dev" | openssl dgst -sha256 -verify "$KEY" -signature /tmp/update.sig; then\n' +
          '\techo "thermo-update: signature check FAILED, slot $new stays inactive" >&2\n' +
          '\texit 1\n' +
          'fi\n\n' +
          '# one environment write flips the slot: both variables change together or not at all\n' +
          'printf \'BOOT_ORDER %s %s\\nBOOT_%s_LEFT 3\\n\' "$new" "$cur" "$new" | fw_setenv -s -\n' +
          'echo "slot $new will be tried on the next boot"' },
        { t: 'cmdx', title: 'Những quyết định nằm trong thermo-update', rows: [
          ['<code>sed … /proc/cmdline</code>', 'Khe đang chạy lấy từ <code>thermo.slot=</code> mà U-Boot ghi vào ' +
           '<code>bootargs</code> — nguồn duy nhất không thể sai. Đọc <code>BOOT_ORDER</code> thì có thể sai: nó nói ' +
           'khe <i>sẽ</i> thử, không phải khe <i>đã</i> boot.'],
          ['<code>grep -q "^$dev " /proc/mounts</code>', 'Lưới an toàn cuối cùng: không bao giờ ghi vào phân vùng ' +
           'đang mount.'],
          ['<code>wget | gunzip -c | dd</code>', 'Dòng chảy thẳng từ mạng vào đĩa. Thermo có 512 MiB RAM và ' +
           '<code>/data</code> 16 MiB — ảnh 96 MiB không vừa chỗ nào để tải trước.'],
          ['<code>dd … conv=fsync</code>', 'Đẩy hết dữ liệu xuống đĩa trước khi <code>dd</code> thoát. Thiếu nó, ' +
           '<code>dd</code> báo xong khi dữ liệu còn trong page cache, và công tắc có thể được bật trước khi ảnh thực ' +
           'sự nằm trên đĩa.'],
          ['<code>head -c "$size" "$dev" | openssl dgst -verify</code>', 'Kiểm chữ ký trên <b>những byte đọc lại từ ' +
           'đĩa</b>. Một lỗi ghi, một ảnh bị cắt cụt hay một ảnh giả đều bị bắt ở cùng một chỗ. ' +
           '<code>head -c</code> vì phân vùng có thể lớn hơn ảnh.'],
          ['<code>fw_setenv -s -</code>', 'Đọc nhiều cặp <code>tên giá trị</code> từ stdin và ghi tất cả trong ' +
           '<b>một</b> lần ghi môi trường. Hai lệnh <code>fw_setenv</code> riêng lẻ sẽ có một khoảnh khắc mà ' +
           '<code>BOOT_ORDER</code> đã đổi nhưng lượt thử chưa được nạp lại.'],
          ['<code>BOOT_%s_LEFT 3</code>', 'Khe mới được 3 lượt, bất kể lần trước nó đã cạn bao nhiêu.']
        ] },
        { t: 'p', x: 'Đổi số phiên bản, build lại (chỉ overlay đổi nên Buildroot mất <b>6.4 s</b>), đóng gói, và mở ' +
          'một máy chủ HTTP tối thiểu trong WSL. Trong mạng user-mode của QEMU, máy host luôn ở địa chỉ ' +
          '<code>10.0.2.2</code> nhìn từ guest:' },
        { t: 'code', where: 'wsl', code:
          'cd ~/bai69\n' +
          'sed -i "s/VERSION=1.0/VERSION=1.1/" thermo/board/thermo/overlay/etc/thermo-release\n' +
          'THERMO_KEY_DIR=~/bai68/keys make -C out\n' +
          'mkdir -p server && cp out/images/rootfs.ext4 server/rootfs-1.1.ext4\n' +
          'cd server\n' +
          'THERMO_KEY_DIR=~/bai68/keys sh ../thermo/mkupdate.sh rootfs-1.1.ext4 thermo-1.1\n' +
          'cat thermo-1.1.size\n' +
          'python3 -m http.server 8000' },
        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 cah8hc cah8hc 12477193 Nov  3 11:27 thermo-1.1.gz\n' +
          '-rw-r--r-- 1 cah8hc cah8hc      256 Nov  3 11:27 thermo-1.1.sig\n' +
          '-rw-r--r-- 1 cah8hc cah8hc       10 Nov  3 11:27 thermo-1.1.size\n' +
          '100663296' },
        { t: 'cal', kind: 'info', title: 'Ba con số',
          x: 'Ảnh 96 MiB (<b>100 663 296 B</b>) nén còn <b>12 477 193 B</b> — gần 8 lần, vì phần lớn ext4 là khối ' +
             'trống. Chữ ký đúng <b>256 B</b> = 2048 bit của khoá RSA-2048. <code>python3 -m http.server</code> chạy mãi ' +
             'và chiếm terminal này (dừng bằng <kbd>Ctrl</kbd>+<kbd>C</kbd> khi xong bài); mở terminal WSL thứ hai ' +
             'cho QEMU. Tên user và ngày trong <code>ls -l</code> sẽ là của bạn.' },
        { t: 'cal', kind: 'warn', title: 'Đừng build lại sau khi đã chép lab',
          x: 'Lệnh <code>make</code> ở trên tạo lại <code>out/images/disk.img</code> với 1.1 trong khe A. Thư mục ' +
             '<code>~/bai69/lab</code> đã chép bản 1.0 ở Bước 2 nên không bị ảnh hưởng — và đó chính là lý do ' +
             '<code>run-ab.sh</code> chạy từ một thư mục riêng.' },
        { t: 'p', x: 'Boot lại <code>lab</code> (bản 1.0) và chạy cập nhật. <code>date</code> hai đầu đo thời gian:' },
        { t: 'code', where: 'qemu', name: 'trong Thermo 1.0, khe A', code:
          't0=$(date +%s); thermo-update http://10.0.2.2:8000/thermo-1.1; echo "rc=$? seconds=$(( $(date +%s) - t0 ))"\n' +
          'fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT' },
        { t: 'code', where: 'out', nocopy: true, code:
          'running slot A, writing slot B (/dev/vda2)\n' +
          '0+2996 records in\n' +
          '0+2996 records out\n' +
          'written, verifying what is on /dev/vda2 now\n' +
          'Verified OK\n' +
          'slot B will be tried on the next boot\n' +
          'rc=0 seconds=21\n' +
          'BOOT_ORDER=B A\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3' },
        { t: 'cal', kind: 'info', title: 'Đọc kết quả',
          x: '<code>0+2996 records</code>: số 0 trước dấu cộng nghĩa là <b>không</b> có khối 1 MiB đầy nào — ' +
             '<code>dd</code> đọc từ pipe nên mỗi lần chỉ nhận một mẩu, đó là bình thường; con số sau dấu cộng sẽ khác ' +
             'mỗi lần chạy (2 996 lần này, 3 018 ở lần khác). <code>Verified OK</code> là của <code>openssl</code> trên ' +
             'byte đọc lại từ <code>vda2</code>. Mất <b>16–21 s</b> cho 96 MiB trên QEMU. Và công tắc đã bật: ' +
             '<code>BOOT_ORDER=B A</code>. Khe A vẫn chưa bị chạm.' },
        { t: 'p', x: 'Gõ <code>reboot</code>, đăng nhập lại:' },
        { t: 'code', where: 'out', nocopy: true, code:
          'Loading Environment from Flash... OK\n' +
          'thermo: boot slot B (A left 3, B left 2)\n' +
          '...\n' +
          'Checking slot B (tries left 2): OK, slot B marked good\n\n' +
          'Thermo 1.0 - lesson 69' },
        { t: 'code', where: 'qemu', name: 'sau khi đăng nhập lại', code:
          'cat /proc/cmdline; cat /etc/thermo-release\nfw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT' },
        { t: 'code', where: 'out', nocopy: true, code:
          'root=/dev/vda2 ro rootwait console=ttyAMA0 panic=5 thermo.slot=B\n' +
          'VERSION=1.1\n' +
          'BOOT_ORDER=B A\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3' },
        { t: 'cal', kind: 'why', title: 'Vì sao banner vẫn ghi "Thermo 1.0"',
          x: 'Bản 1.1 đang chạy: <code>root=/dev/vda2</code>, <code>VERSION=1.1</code>. Banner đến từ ' +
             '<code>/etc/issue</code>, sinh ra từ <code>BR2_TARGET_GENERIC_ISSUE</code> mà bạn không đổi — một ' +
             'lời nhắc rằng "số phiên bản" phải có <b>một</b> nguồn duy nhất trong sản phẩm thật. Còn ' +
             '<code>BOOT_B_LEFT=3</code>: U-Boot trừ còn 2, <code>S99confirm</code> trả lại 3 — khe B giờ là khe tốt. ' +
             'Khe A vẫn giữ bản 1.0, sẵn sàng làm đường lui.' }
      ] },
      { title: 'Đánh dấu khe tốt, và để một bản hỏng tự quay về', blocks: [
        { t: 'p', x: 'Từ Bước 2 bạn đã thấy dòng <code>Checking slot …: OK, slot … marked good</code>. Nó đến từ script ' +
          'cuối cùng trong <code>/etc/init.d</code> — cái tên <code>S99</code> bảo đảm nó chạy sau ' +
          '<code>S60temp_daemon</code>. Đây là phần "mark-good" của hợp đồng: <b>chỉ</b> nó được trả lại lượt thử.' },
        { t: 'code', where: 'file', name: '~/bai69/thermo/board/thermo/overlay/etc/init.d/S99confirm', code:
          '#!/bin/sh\n' +
          '# S99confirm -- mark the running slot good once the product really works ("mark-good" in RAUC).\n' +
          '# If the check fails the board reboots; U-Boot spends one more try and, at 0, falls back.\n\n' +
          'start() {\n' +
          '\tslot=$(sed -n \'s/.*thermo\\.slot=\\([AB]\\).*/\\1/p\' /proc/cmdline)\n' +
          '\tleft=$(fw_printenv -n "BOOT_${slot}_LEFT" 2>/dev/null)\n' +
          '\tprintf \'Checking slot %s (tries left %s): \' "$slot" "$left"\n' +
          '\tsleep 2\n' +
          '\tif pidof temp_daemon > /dev/null && [ -c /dev/tsensor0 ]; then\n' +
          '\t\t# only write the flash when something changes: every write wears an erase block\n' +
          '\t\t[ "$left" = 3 ] || fw_setenv "BOOT_${slot}_LEFT" 3\n' +
          '\t\techo "OK, slot $slot marked good"\n' +
          '\telse\n' +
          '\t\techo "FAIL, rebooting"\n' +
          '\t\treboot\n' +
          '\tfi\n' +
          '}\n\n' +
          'case "$1" in\n' +
          '\tstart) start;;\n' +
          '\tstop) ;;\n' +
          '\t*) echo "Usage: $0 {start|stop}"; exit 1;;\n' +
          'esac' },
        { t: 'cmdx', title: 'Kiểm tra sức khoẻ', rows: [
          ['<code>sleep 2</code>', 'Cho daemon vừa khởi chạy kịp chết nếu nó sắp chết. Sản phẩm thật chờ lâu hơn và ' +
           'kiểm tra sâu hơn (daemon trả lời trên cổng 9006, có kết nối tới máy chủ…).'],
          ['<code>pidof temp_daemon</code>', 'Daemon <b>đang</b> chạy, không phải "đã được khởi động". Khác biệt này ' +
           'quyết định kết quả thí nghiệm bên dưới.'],
          ['<code>[ -c /dev/tsensor0 ]</code>', 'Driver của Bài 54 đã probe và tạo node — kernel mới khớp được Device ' +
           'Tree.'],
          ['<code>[ "$left" = 3 ] || fw_setenv …</code>', 'Chỉ ghi flash khi cần. NOR chịu khoảng 100 000 lần xoá mỗi ' +
           'khối; ghi ở mỗi lần boot là tự tiêu tuổi thọ.'],
          ['<code>reboot</code>', 'Thất bại thì không ngồi chờ: khởi động lại để U-Boot tiêu tiếp một lượt. Một ' +
           'watchdog phần cứng làm đúng việc này khi chính Linux bị treo (Bài 70 sẽ gặp watchdog trên board thật).']
        ] },
        { t: 'p', x: 'Giờ tạo một bản <b>1.3 hỏng</b>: ảnh đúng chữ ký, ghi đúng từng byte, nhưng thiếu ' +
          '<code>/usr/bin/temp_daemon</code> — mô phỏng một bản phát hành mà ai đó quên một gói. Không cần build lại; ' +
          '<code>debugfs -w</code> (Bài 68) sửa thẳng trên bản sao của ảnh 1.1:' },
        { t: 'code', where: 'wsl', name: 'terminal thứ hai, trong ~/bai69/server', code:
          'cd ~/bai69/server\n' +
          'cp rootfs-1.1.ext4 rootfs-1.3.ext4\n' +
          'printf "VERSION=1.3\\n" > /tmp/rel\n' +
          'printf "rm /usr/bin/temp_daemon\\nrm /etc/thermo-release\\ncd /etc\\nwrite /tmp/rel thermo-release\\n" > /tmp/edit\n' +
          'debugfs -w -f /tmp/edit rootfs-1.3.ext4\n' +
          'debugfs -R "ls /usr/bin" rootfs-1.3.ext4 2>/dev/null | grep -c temp_daemon\n' +
          'THERMO_KEY_DIR=~/bai68/keys sh ../thermo/mkupdate.sh rootfs-1.3.ext4 thermo-1.3' },
        { t: 'code', where: 'out', nocopy: true, code:
          'debugfs 1.45.5 (07-Jan-2020)\n' +
          'debugfs: rm /usr/bin/temp_daemon\n\n' +
          'debugfs: rm /etc/thermo-release\n\n' +
          'debugfs: cd /etc\n' +
          'debugfs: write /tmp/rel thermo-release\n' +
          'Allocated inode: 155\n' +
          '0\n' +
          '-rw-r--r-- 1 cah8hc cah8hc 12477268 Nov  3 11:28 thermo-1.3.gz\n' +
          '-rw-r--r-- 1 cah8hc cah8hc      256 Nov  3 11:28 thermo-1.3.sig\n' +
          '-rw-r--r-- 1 cah8hc cah8hc       10 Nov  3 11:28 thermo-1.3.size',
          notes: ['<code>0</code> = không còn dòng nào chứa <code>temp_daemon</code> trong <code>/usr/bin</code>. Ảnh ' +
            'này được ký bằng khoá <b>thật</b>: chữ ký chứng minh nguồn gốc, không chứng minh chất lượng.'] },
        { t: 'p', x: 'Trong Thermo (đang chạy 1.1 ở khe B), cài 1.3 rồi khởi động lại và <b>không chạm vào gì nữa</b>:' },
        { t: 'code', where: 'qemu', name: 'trong Thermo 1.1, khe B', code:
          'thermo-update http://10.0.2.2:8000/thermo-1.3; echo "rc=$?"\n' +
          'fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT\n' +
          'reboot' },
        { t: 'code', where: 'out', nocopy: true, code:
          'running slot B, writing slot A (/dev/vda1)\n' +
          '0+3017 records in\n' +
          '0+3017 records out\n' +
          'written, verifying what is on /dev/vda1 now\n' +
          'Verified OK\n' +
          'slot A will be tried on the next boot\n' +
          'rc=0\n' +
          'BOOT_ORDER=A B\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3\n' +
          '...\n' +
          'thermo: boot slot A (A left 2, B left 3)\n' +
          'Starting temp_daemon: OK\n' +
          'Checking slot A (tries left 2): FAIL, rebooting\n' +
          'Stopping temp_daemon: no /usr/bin/temp_daemon found; none killed\n' +
          'FAIL\n' +
          '...\n' +
          'thermo: boot slot A (A left 1, B left 3)\n' +
          'Checking slot A (tries left 1): FAIL, rebooting\n' +
          '...\n' +
          'thermo: boot slot A (A left 0, B left 3)\n' +
          'Checking slot A (tries left 0): FAIL, rebooting\n' +
          '...\n' +
          'thermo: boot slot B (A left 0, B left 2)\n' +
          'Checking slot B (tries left 2): OK, slot B marked good\n\n' +
          'Thermo 1.0 - lesson 69\n' +
          'thermo login:',
          notes: ['Bốn lần boot liên tiếp, lọc còn các dòng của script A/B và của init. Từ <code>reboot</code> đến ' +
            '<code>login:</code> mất khoảng một phút trên QEMU.'] },
        { t: 'cal', kind: 'info', title: 'Đọc bốn lần boot',
          x: '<ul><li>Lần 1–3: U-Boot chọn A, trừ lượt 3 → 2 → 1 → 0 (số in ra là số <i>sau khi</i> trừ). Mỗi lần ' +
             'kiểm tra sức khoẻ thất bại và <code>reboot</code>.</li>' +
             '<li>Lần 4: <code>BOOT_A_LEFT=0</code>, vòng <code>for</code> bỏ qua A, chọn B. Bản 1.1 lên, khoẻ, được ' +
             'đánh dấu tốt. <b>Không ai chạm vào bo mạch</b> từ lúc gõ <code>reboot</code>.</li>' +
             '<li><code>Starting temp_daemon: OK</code> dù file không tồn tại: <code>start-stop-daemon --background</code> ' +
             'fork rồi trả về 0 trước khi tiến trình con kịp thất bại ở <code>exec</code>. Nếu kiểm tra sức khoẻ chỉ ' +
             'tin vào dòng "OK" của init, bản 1.3 đã được đánh dấu tốt — và khe 1.1 sẽ bị ghi đè ở lần cập nhật sau. ' +
             'Chữ <code>FAIL</code> đứng riêng là của <code>S60temp_daemon stop</code> khi tắt máy.</li></ul>' },
        { t: 'code', where: 'qemu', name: 'đăng nhập sau lần boot thứ tư', code:
          'cat /proc/cmdline; cat /etc/thermo-release\nfw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT' },
        { t: 'code', where: 'out', nocopy: true, code:
          'root=/dev/vda2 ro rootwait console=ttyAMA0 panic=5 thermo.slot=B\n' +
          'VERSION=1.1\n' +
          'BOOT_ORDER=A B\n' +
          'BOOT_A_LEFT=0\n' +
          'BOOT_B_LEFT=3' },
        { t: 'cal', kind: 'why', title: 'Trạng thái này nói gì với máy chủ',
          x: '<code>BOOT_ORDER</code> vẫn là <code>A B</code> nhưng <code>BOOT_A_LEFT=0</code> và Thermo đang chạy ' +
             'khe B: đó là dấu vết của một lần rollback. Chương trình cập nhật thật (RAUC: <code>rauc status</code>, ' +
             'Mender: trạng thái <code>failure</code> gửi lên server) đọc đúng loại dấu vết này để báo về "bản 1.3 hỏng ' +
             'trên thiết bị này" — và người vận hành dừng triển khai cho cả đội máy.' },
        { t: 'p', x: 'Trường hợp cuối: nếu <i>cả hai</i> khe đều cạn lượt (ví dụ cả hai bản đều hỏng một cách ngắt ' +
          'quãng), script không treo. Mô phỏng bằng tay:' },
        { t: 'code', where: 'qemu', name: 'trong Thermo', code:
          'printf "BOOT_A_LEFT 0\\nBOOT_B_LEFT 0\\n" | fw_setenv -s -\nreboot' },
        { t: 'code', where: 'out', nocopy: true, code:
          'thermo: no slot has tries left, giving both 3 again\n' +
          '...\n' +
          'thermo: boot slot B (A left 3, B left 2)\n' +
          'Checking slot B (tries left 2): OK, slot B marked good' },
        { t: 'cal', kind: 'tip', title: 'Đây là một chính sách, không phải chân lý',
          x: 'Script trả lại 3 lượt cho cả hai và <code>reset</code>, nên vòng sau chọn lại theo ' +
             '<code>BOOT_ORDER</code> (<code>B A</code> ở lần đo này). Sản phẩm khác có thể chọn boot một phân vùng ' +
             'recovery nhỏ, hoặc dừng và chờ kỹ thuật viên. Điều không được phép là một vòng lặp boot không có lối ra.' }
      ] },
      { title: 'Rút điện giữa lúc ghi, và một ảnh giả chữ ký', blocks: [
        { t: 'p', x: 'Hai thí nghiệm này phá hỏng đĩa, nên mỗi lần bắt đầu từ một bản chụp sạch. Sau Bước 3 (trước khi ' +
          'làm Bước 4), <code>lab</code> là một Thermo đang chạy 1.1 ở khe B với 1.0 ở khe A; nếu bạn đã làm Bước 4, ' +
          'trạng thái khác một chút nhưng kết luận như nhau. Chép nó ra:' },
        { t: 'code', where: 'wsl', code: 'cd ~/bai69\nrm -rf lab1 && cp -a lab lab1\nrm -rf cut && cp -a lab1 cut' },
        { t: 'p', x: 'Chuẩn bị bản 1.2 hợp lệ bằng đúng cách làm 1.3 ở Bước 4, nhưng file lệnh debugfs chỉ có ba dòng cuối (không xoá daemon) và ' +
          'tên là <code>rootfs-1.2.ext4</code>/<code>thermo-1.2</code>, <code>/tmp/rel</code> chứa ' +
          '<code>VERSION=1.2</code>; rồi boot <code>cut</code>. Ngay khi <code>thermo-update</code> in dòng ' +
          '<code>writing slot A</code>, đếm khoảng 6 giây rồi "rút điện": bấm <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi ' +
          '<kbd>X</kbd> — QEMU chết ngay lập tức, không có shutdown, không có <code>sync</code>, đúng như mất điện:' },
        { t: 'code', where: 'qemu', name: '~/bai69/run-ab.sh ~/bai69/cut, đăng nhập root', code:
          'thermo-update http://10.0.2.2:8000/thermo-1.2' },
        { t: 'p', x: 'Terminal chỉ kịp in <code>running slot B, writing slot A (/dev/vda1)</code> trước khi QEMU ' +
          'biến mất. Ở lần đo này điện bị cắt <b>12,9 s</b> sau khi bật QEMU, tức khoảng 6 s sau khi bắt đầu ghi.' },
        { t: 'p', x: 'Trước khi boot lại, nhìn khe A từ WSL: nó đang chứa gì? Cắt đúng các sector của khe A ra một ' +
          'file (bảng phân vùng ở Bước 1: sector 1 đến 196 608), so với ảnh 1.2 thật, và kiểm chữ ký giống hệt cách ' +
          'bo mạch kiểm:' },
        { t: 'code', where: 'wsl', code:
          'cd ~/bai69\n' +
          'dd if=cut/disk.img of=cut/slotA.img bs=512 skip=1 count=196608 2>/dev/null\n' +
          'cmp cut/slotA.img server/rootfs-1.2.ext4 | head -1\n' +
          'openssl dgst -sha256 -verify <(openssl x509 -in ~/bai68/keys/thermo-dev.crt -pubkey -noout) \\\n' +
          '  -signature server/thermo-1.2.sig cut/slotA.img' },
        { t: 'code', where: 'out', nocopy: true, code:
          'cut/slotA.img server/rootfs-1.2.ext4 differ: byte 33555505, line 100646\n' +
          'Verification Failure' },
        { t: 'cal', kind: 'info', title: 'Khe A đang dở dang',
          x: 'Byte khác đầu tiên ở vị trí <b>33 555 505</b> — khoảng 32 MiB của ảnh 96 MiB đã được ghi khi điện bị cắt ' +
             '(con số của bạn phụ thuộc lúc bạn bấm phím). Khe A giờ là nửa 1.2, nửa 1.0: chính xác loại đĩa mà ghi đè ' +
             'tại chỗ sẽ để lại trên phân vùng <i>đang chạy</i>. Chữ ký không khớp, và <code>thermo-update</code> chưa ' +
             'bao giờ chạy tới dòng <code>fw_setenv</code>.' },
        { t: 'code', where: 'wsl', code: '~/bai69/run-ab.sh ~/bai69/cut' },
        { t: 'code', where: 'out', nocopy: true, code:
          'thermo: boot slot B (A left 3, B left 2)\n' +
          '...\n' +
          'Checking slot B (tries left 2): OK, slot B marked good' },
        { t: 'code', where: 'qemu', name: 'đăng nhập', code:
          'cat /proc/cmdline; cat /etc/thermo-release\nfw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT' },
        { t: 'code', where: 'out', nocopy: true, code:
          'root=/dev/vda2 ro rootwait console=ttyAMA0 panic=5 thermo.slot=B\n' +
          'VERSION=1.1\n' +
          'BOOT_ORDER=B A\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3' },
        { t: 'cal', kind: 'why', title: 'Mất điện không có hậu quả nào',
          x: 'Công tắc vẫn là <code>B A</code>, nên U-Boot không hề nhìn tới khe A hỏng. Thermo chạy 1.1 như trước; ' +
             'việc duy nhất cần làm là chạy lại <code>thermo-update</code> — nó ghi đè khe A từ đầu. Đây là toàn bộ ' +
             'lý do của thứ tự "ghi → kiểm → <b>rồi mới</b> bật công tắc".' },
        { t: 'p', x: 'Thí nghiệm thứ hai: kẻ tấn công không có khoá của bạn, nên tự tạo một khoá RSA khác và ký một ' +
          'ảnh. Ảnh đó nén, đặt tên, kích thước y hệt bản thật:' },
        { t: 'code', where: 'wsl', name: 'terminal thứ hai, trong ~/bai69/server', code:
          'mkdir -p ../evilkey && openssl genrsa -out ../evilkey/thermo-dev.key 2048 2>/dev/null\n' +
          'cp rootfs-1.2.ext4 rootfs-evil.ext4\n' +
          'THERMO_KEY_DIR=../evilkey sh ../thermo/mkupdate.sh rootfs-evil.ext4 thermo-evil' },
        { t: 'code', where: 'qemu', name: 'trong Thermo bắt đầu lại từ lab1 (rm -rf lab && cp -a lab1 lab)', code:
          'thermo-update http://10.0.2.2:8000/thermo-evil; echo "rc=$?"\n' +
          'fw_printenv BOOT_ORDER BOOT_A_LEFT BOOT_B_LEFT' },
        { t: 'code', where: 'out', nocopy: true, code:
          'running slot B, writing slot A (/dev/vda1)\n' +
          '0+3006 records in\n' +
          '0+3006 records out\n' +
          'written, verifying what is on /dev/vda1 now\n' +
          'Verification failure\n' +
          '20001291FFFF0000:error:0200008A:rsa routines:RSA_padding_check_PKCS1_type_1:invalid padding:crypto/rsa/rsa_pk1.c:78:\n' +
          '20001291FFFF0000:error:02000072:rsa routines:rsa_ossl_public_decrypt:padding check failed:crypto/rsa/rsa_ossl.c:779:\n' +
          '20001291FFFF0000:error:1C880004:Provider routines:rsa_verify_directly:RSA lib:providers/implementations/signature/rsa_sig.c:1038:\n' +
          'thermo-update: signature check FAILED, slot A stays inactive\n' +
          'rc=1\n' +
          'BOOT_ORDER=B A\n' +
          'BOOT_A_LEFT=3\n' +
          'BOOT_B_LEFT=3',
          notes: ['Số hex đầu mỗi dòng lỗi là mã luồng của OpenSSL, sẽ khác trên máy bạn.'] },
        { t: 'cal', kind: 'info', title: 'Đọc lỗi của OpenSSL',
          x: '<code>invalid padding</code> là cách RSA nói "khoá công khai này không mở được chữ ký đó": giải mã chữ ký ' +
             'bằng khoá của bạn ra rác, không ra cấu trúc PKCS#1 hợp lệ. Ảnh giả <b>đã</b> nằm trên khe A — ' +
             '<code>thermo-update</code> ghi trước, kiểm sau — nhưng công tắc không đổi, nên nó vô hại như phần dở dang ' +
             'của thí nghiệm rút điện. Và giả sử kẻ tấn công lách được bước này, U-Boot vẫn từ chối FIT không có chữ ký ' +
             'của bạn (Bài 68): hai lớp kiểm độc lập.' },
        { t: 'cal', kind: 'warn', title: 'Bản cũ hơn cũng có chữ ký thật',
          x: 'Chữ ký không chặn được <b>hạ cấp</b>: ai giữ được file <code>thermo-1.0.*</code> cũ có lỗ hổng đã biết ' +
             'vẫn cài được nó. RAUC, SWUpdate và Mender đều có cách so phiên bản trong manifest đã ký; ' +
             '<code>thermo-update</code> của bài này cố ý không làm, để giữ script ngắn.' }
      ] },

      { title: 'Hai bản sao môi trường, và danh sách biến được ghi', blocks: [
        { t: 'p', x: 'Còn lại lời hứa của phần lý thuyết: mất một bản môi trường không làm mất công tắc. Để nhìn được ' +
          'hai bản sao, viết một công cụ nhỏ kiểm CRC32 của từng bản (thuật toán giống <code>zlib.crc32</code>):' },
        { t: 'code', where: 'file', name: '~/bai69/envcheck.py', code:
          '#!/usr/bin/env python3\n' +
          '# envcheck.py FLASH -- show both U-Boot environment copies: flag byte and whether the CRC32 matches\n' +
          'import sys, zlib\n' +
          'f = open(sys.argv[1], \'rb\').read()\n' +
          'for off in (0, 0x40000):\n' +
          '    blk = f[off:off + 0x40000]\n' +
          '    crc = int.from_bytes(blk[0:4], \'little\')\n' +
          '    flag = blk[4]\n' +
          '    ok = zlib.crc32(blk[5:]) & 0xffffffff == crc\n' +
          '    print(\'copy @0x%05x  flag=%d  crc %s  first data bytes %s\' % (off, flag, \'OK \' if ok else \'BAD\', blk[5:13]))' },
        { t: 'code', where: 'wsl', code: 'cd ~/bai69\nrm -rf lab && cp -a lab1 lab\npython3 envcheck.py lab/flash1.img' },
        { t: 'code', where: 'out', nocopy: true, code:
          "copy @0x00000  flag=1  crc OK   first data bytes b'BOOT_A_L'\n" +
          "copy @0x40000  flag=0  crc BAD  first data bytes b'\\xff\\xff\\xffT_A_L'" },
        { t: 'p', x: 'Đúng như callout của Bước 2: bản cuối do <code>fw_setenv</code> ghi là bản tốt duy nhất. Để có ' +
          'trạng thái "cả hai bản đều đúng" như trên flash thật, để U-Boot ghi lần cuối: boot với một đĩa trống 1 MiB, ' +
          'U-Boot trừ lượt, <code>saveenv</code>, rồi không tìm thấy kernel. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> ' +
          '<kbd>X</kbd> ngay sau dòng <code>did not boot</code>:' },
        { t: 'code', where: 'wsl', code:
          'rm -rf ub && mkdir ub\n' +
          'cp lab/u-boot.bin lab/control.dtb lab/flash1.img ub/ && truncate -s 1M ub/disk.img\n' +
          './run-ab.sh ub\n' +
          'python3 envcheck.py ub/flash1.img' },
        { t: 'code', where: 'out', nocopy: true, code:
          'thermo: boot slot B (A left 3, B left 2)\n' +
          'thermo: slot B did not boot\n' +
          "copy @0x00000  flag=0  crc OK   first data bytes b'BOOT_A_L'\n" +
          "copy @0x40000  flag=1  crc OK   first data bytes b'BOOT_A_L'" },
        { t: 'p', x: 'Hai bản đều đúng CRC, bản <code>0x40000</code> mới hơn (cờ 1). Giờ giả lập mất điện giữa lúc xoá ' +
          'chính bản <b>mới</b>: phủ 256 KiB của nó bằng <code>0xff</code> (trạng thái của NOR vừa bị xoá), rồi boot:' },
        { t: 'code', where: 'wsl', code:
          'cp ub/flash1.img lab/flash1.img\n' +
          'dd if=/dev/zero bs=4096 count=64 2>/dev/null | tr \'\\0\' \'\\377\' | dd of=lab/flash1.img bs=4096 seek=64 conv=notrunc 2>/dev/null\n' +
          'python3 envcheck.py lab/flash1.img\n' +
          './run-ab.sh lab' },
        { t: 'code', where: 'out', nocopy: true, code:
          "copy @0x00000  flag=0  crc OK   first data bytes b'BOOT_A_L'\n" +
          "copy @0x40000  flag=255  crc BAD  first data bytes b'\\xff\\xff\\xff\\xff\\xff\\xff\\xff\\xff'\n" +
          'Loading Environment from Flash... OK\n' +
          'thermo: boot slot B (A left 3, B left 2)\n' +
          '...\n' +
          'VERSION=1.1' },
        { t: 'cmdx', cmd: 'dd if=/dev/zero bs=4096 count=64 | tr \'\\0\' \'\\377\' | dd of=… bs=4096 seek=64 conv=notrunc', rows: [
          ['<code>bs=4096 count=64</code>', '64 × 4 KiB = 256 KiB = đúng một khối xoá.'],
          ['<code>tr \'\\0\' \'\\377\'</code>', 'Đổi byte 0 thành 0xff (bát phân 377): flash vừa xoá đọc ra toàn bit 1.'],
          ['<code>seek=64</code>', 'Bỏ qua 64 khối 4 KiB = offset <code>0x40000</code>, bản sao thứ hai.'],
          ['<code>conv=notrunc</code>', 'Ghi đè giữa file, không cắt phần còn lại của file 64 MiB.']
        ] },
        { t: 'cal', kind: 'info', title: 'U-Boot dùng bản còn lại',
          x: '<code>Loading Environment from Flash... OK</code> — không có <code>bad CRC</code>: U-Boot thấy bản mới ' +
             'hỏng và lấy bản cũ hơn, vẫn chứa <code>BOOT_ORDER=B A</code>. Thermo boot đúng khe B, chạy 1.1. Lặp lại ' +
             'với <code>seek=0</code> (xoá bản cũ) cũng cho <code>OK</code> và khe B — đã đo. Trên QEMU 4.2.1, nếu bạn ' +
             'xoá bản đang dùng của trạng thái <code>lab1</code> (nơi bản kia đã bị tật pflash làm hỏng), U-Boot báo ' +
             '<code>bad CRC, using default environment</code> và boot khe <b>A</b> với <code>BOOT_ORDER=A B</code> — ' +
             'tức là chạy lại bản cũ 1.0. Một lý do nữa để chạy thử A/B trên phần cứng thật trước khi tin nó.' },
        { t: 'p', x: 'Thí nghiệm cuối là bảo mật: Linux có thể ghi môi trường trong flash, vậy một tiến trình root ' +
          'độc hại có viết lại được script boot không?' },
        { t: 'code', where: 'qemu', name: 'trong Thermo (lab1)', code:
          'fw_setenv thermo_ab \'echo PWNED; poweroff\'; echo rc=$?\nfw_printenv thermo_ab\nreboot' },
        { t: 'code', where: 'out', nocopy: true, code:
          'rc=0\n' +
          'thermo_ab=echo PWNED; poweroff\n' +
          '...\n' +
          'thermo: boot slot B (A left 3, B left 2)' },
        { t: 'cal', kind: 'why', title: 'Ghi được, nhưng không có tác dụng',
          x: '<code>fw_setenv</code> không biết gì về danh sách của U-Boot: nó ghi biến vào flash và trả về 0, và ' +
             '<code>fw_printenv</code> đọc lại đúng giá trị độc. Nhưng khi U-Boot nạp môi trường, ' +
             '<code>ENV_WRITEABLE_LIST</code> chỉ nhận ba biến trong <code>CFG_ENV_FLAGS_LIST_STATIC</code>; ' +
             '<code>thermo_ab</code> giữ bản biên dịch trong <code>u-boot.bin</code>, và Thermo boot bình thường. Thứ ' +
             'kẻ tấn công còn làm được là đổi <code>BOOT_ORDER</code> sang một khe — mà khe nào cũng phải mang FIT có ' +
             'chữ ký của bạn.' }
      ] }
    ] },
    { t: 'h2', x: 'Lỗi thường gặp' },
    { t: 'table', head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>fw_setenv</code> báo thành công, <code>fw_printenv</code> thấy <code>BOOT_ORDER=B A</code>, nhưng ' +
         'U-Boot vẫn boot khe A và <code>BOOT_ORDER</code> quay về <code>A B</code>. Linux in ' +
         '<code>## Warning: Unknown environment variable access method \'w\'</code>',
         'Danh sách biến ghi được đặt bằng biến <code>.flags=…</code> trong <code>qemu-arm.env</code>. Với ' +
         '<code>ENV_WRITEABLE_LIST</code>, U-Boot <b>chỉ</b> đọc danh sách từ hằng ' +
         '<code>CFG_ENV_FLAGS_LIST_STATIC</code>, nên mọi biến từ flash bị bỏ qua. Lần đầu soạn bài này gặp đúng lỗi đó. ' +
         'Cảnh báo phía Linux là vì <code>fw_setenv</code> 2025.10 không biết cờ <code>w</code>',
         'Đưa danh sách vào <code>include/configs/qemu-arm.h</code> như patch 0002, rồi ' +
         '<code>make uboot-dirclean all</code> (23 s)'],
        ['Sửa patch trong <code>patches/uboot/</code>, <code>make</code>, nhưng U-Boot vẫn chạy script cũ',
         '<code>make</code> và <code>uboot-rebuild</code> không áp lại patch (Bài 61, Bài 67)',
         '<code>make uboot-dirclean all</code>'],
        ['<code>Loading Environment from Flash... *** Warning - bad CRC, using default environment</code> ở mọi lần boot',
         'Thiếu <code>-drive if=pflash,index=1</code>: môi trường chỉ nằm trong RAM của QEMU, bộ đếm mất sau mỗi lần ' +
         'tắt (Bài 35). Ở lần boot <i>đầu</i> với file mới thì dòng này là bình thường',
         'Dùng <code>run-ab.sh</code>, luôn mang theo <code>flash1.img</code> cùng thư mục'],
        ['<code>fw_printenv</code>: <code>Cannot access MTD device /dev/mtd0</code> hoặc in ra môi trường rỗng',
         'Kernel không có driver NOR (<code>MTD_PHYSMAP_OF</code>, <code>MTD_CFI_INTELEXT</code>), hoặc offset trong ' +
         '<code>fw_env.config</code> sai',
         '<code>cat /proc/mtd</code> phải thấy <code>mtd0: 08000000</code>; offset là <code>0x4000000</code> vì hai ngân ' +
         'flash bị nối lại'],
        ['Bản mới không chạy daemon nhưng vẫn được đánh dấu tốt',
         'Kiểm tra sức khoẻ tin vào dòng <code>Starting temp_daemon: OK</code> — <code>start-stop-daemon --background' +
         '</code> trả 0 ngay cả khi binary không tồn tại (đo ở Bước 4)',
         'Kiểm cái đang thực sự chạy: <code>pidof</code>, cổng mở, node thiết bị'],
        ['Rollback không bao giờ xảy ra: kernel panic, bo mạch đứng im',
         'Thiếu <code>panic=5</code> trong <code>bootargs</code>: kernel panic treo vô hạn, U-Boot không có dịp trừ lượt',
         'Luôn có <code>panic=N</code>, và trên phần cứng thật thêm watchdog'],
        ['<code>thermo-update: /dev/vda1 is mounted, refusing to write it</code>',
         '<code>thermo.slot</code> trong <code>/proc/cmdline</code> không khớp khe đang mount (ví dụ boot tay với ' +
         '<code>bootargs</code> khác)',
         'Không sửa script để bỏ kiểm tra; tìm xem ai dựng <code>bootargs</code>'],
        ['<code>Verification failure</code> + <code>invalid padding</code>',
         'Ảnh ký bằng khoá khác khoá công khai trong <code>/etc/thermo/update.pem</code> — hoặc ảnh bị cắt cụt/ghi sai',
         'Đúng hành vi. Nếu là bản của chính bạn: kiểm <code>THERMO_KEY_DIR</code> lúc chạy <code>mkupdate.sh</code>'],
        ['Sau một lần <code>fw_setenv</code>, <code>envcheck.py</code> báo một bản <code>crc BAD</code> với ba byte ' +
         '<code>ff</code> sau cờ',
         'Tật của pflash trong QEMU 4.2.1 khi ghi một byte cờ (Bước 2)',
         'Không ảnh hưởng an toàn khi ghi; chỉ mất bản dự phòng. Kiểm lại trên NOR thật']
      ] },

    { t: 'recap', items: [
      'Ghi đè rootfs đang chạy có <b>một</b> bản duy nhất để phá; A/B ghi vào khe <b>không chạy</b>, nên mất điện, ảnh ' +
        'hỏng hay ảnh giả chỉ làm hỏng thứ chưa ai dùng.',
      'Thứ tự bất biến: <b>ghi → kiểm chữ ký trên đĩa → bật công tắc → boot thử → mark-good</b>. Rút điện ở byte ' +
        '<b>33 555 505</b> không đổi gì vì công tắc chưa bật.',
      'Bộ đếm <code>BOOT_A_LEFT</code>/<code>BOOT_B_LEFT</code> bị U-Boot trừ <b>trước</b> khi boot; chỉ Linux khoẻ mới ' +
        'trả lại. Bản 1.3 thiếu daemon tiêu hết <b>3</b> lượt rồi tự về 1.1 sau <b>4</b> lần boot, không ai chạm vào.',
      'Môi trường U-Boot trong NOR có <b>hai bản sao</b> (<code>0x4000000</code>, <code>0x4040000</code>) ghi luân ' +
        'phiên, cờ <code>1</code> = đang dùng; xoá hẳn một bản, U-Boot vẫn đọc bản kia.',
      '<code>ENV_WRITEABLE_LIST</code> + <code>CFG_ENV_FLAGS_LIST_STATIC</code>: Linux ghi được <code>thermo_ab</code> ' +
        'xuống flash, U-Boot vẫn chạy bản biên dịch sẵn. Danh sách phải là hằng C, không phải biến <code>.flags</code>.',
      'Chữ ký ảnh cập nhật chứng minh <b>nguồn gốc</b>, không chứng minh chất lượng (1.3 ký thật vẫn hỏng) và không ' +
        'chống hạ cấp.',
      '<b>RAUC</b> (khe chặt, <code>BOOT_ORDER</code>), <b>SWUpdate</b> (tuỳ biến, <code>bootcount</code>), ' +
        '<b>Mender</b> (A/B + máy chủ) đều là khung này; giá của A/B là gấp đôi rootfs (<code>disk.img</code> ' +
        '<b>218 104 320 B</b>).'
    ] },

    { t: 'cal', kind: 'danger', title: 'Dọn dẹp',
      x: '<code>~/bai69</code> chiếm khoảng <b>5 GB</b>, gần hết là <code>out/</code> (4,4 GB) và các ảnh đĩa 208 MiB ' +
         'trong <code>lab*/</code>, <code>cut/</code>, <code>server/</code>. Giữ <code>~/bai69/thermo</code> nếu muốn có ' +
         'Thermo có OTA; xoá <code>~/bai69/evilkey</code> — đừng để một khoá "kẻ tấn công" nằm cạnh khoá thật. ' +
         '<code>~/bai68/out</code> giờ cũng xoá được; giữ <code>~/bai68/keys</code>.' },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Thermo giờ đã là một sản phẩm hoàn chỉnh: build tái lập được, chỉ chạy firmware có chữ ký, tự cập nhật và tự ' +
         'quay về — nhưng tất cả chạy trong QEMU, kể cả cái tật pflash bạn vừa đo. <b>Bài 70 — Chuyển sang hardware thật ' +
         'và chuẩn bị phỏng vấn</b> chọn một board đầu tiên, nối USB–UART, đưa thiết bị USB vào WSL bằng ' +
         '<code>usbipd-win</code>, và gom mọi thứ bạn đã đo trong 69 bài thành câu trả lời cho các câu hỏi phỏng vấn ' +
         'Embedded Linux.' }
  ],

  quiz: [
    { q: 'Thermo đang chạy khe A. <code>thermo-update</code> ghi xong khe B thì mất điện, <b>trước</b> khi chạy tới ' +
         '<code>fw_setenv</code>. Lần bật máy sau, chuyện gì xảy ra?',
      opts: ['U-Boot boot khe B vì ảnh đã ghi đủ', 'U-Boot boot khe A như cũ; khe B được ghi lại ở lần cập nhật sau',
             'U-Boot báo bad CRC và dừng', 'Kernel panic vì khe B hỏng'],
      a: 1,
      why: 'Công tắc (<code>BOOT_ORDER</code>) chỉ đổi sau khi kiểm chữ ký thành công. Chưa đổi thì U-Boot không có lý do ' +
           'nhìn tới khe B — dù nó đầy đủ hay dở dang. Đó là lý do bật công tắc phải là bước cuối cùng.' },
    { q: 'Vì sao script U-Boot trừ <code>BOOT_x_LEFT</code> và <code>saveenv</code> <b>trước</b> khi nạp kernel, ' +
         'thay vì ghi "lỗi" khi boot hỏng?',
      opts: ['Vì <code>saveenv</code> sau <code>bootm</code> chậm hơn',
             'Vì kernel panic, treo hay mất điện không cho ai cơ hội ghi lỗi; chỉ U-Boot chắc chắn chạy, và nó chạy trước',
             'Vì Linux không đọc được môi trường U-Boot', 'Vì RAUC bắt buộc như vậy'],
      a: 1,
      why: 'Thất bại thường im lặng. Giả định bi quan "lần này sẽ hỏng" được ghi trước, và chỉ bằng chứng tích cực từ ' +
           'Linux (mark-good) mới xoá được nó. Im lặng nghĩa là thất bại.' },
    { q: 'Bạn cài một bản mới; nó boot, <code>Starting temp_daemon: OK</code>, nhưng daemon không chạy. Ba lần boot sau ' +
         'bo mạch vẫn ở bản mới. Nguyên nhân khả dĩ nhất?',
      opts: ['Chữ ký sai', 'Môi trường U-Boot chỉ có một bản sao',
             'Kiểm tra sức khoẻ dựa vào kết quả của script init thay vì kiểm daemon đang thực sự chạy, nên khe mới được ' +
             'đánh dấu tốt', '<code>BOOT_ORDER</code> chưa đổi'],
      a: 2,
      why: '<code>start-stop-daemon --background</code> trả 0 ngay cả khi binary không có (Bước 4). Mark-good dựa trên ' +
           'tín hiệu đó sẽ trả lại lượt thử cho một bản hỏng, và rollback không bao giờ xảy ra. Kiểm thứ đang chạy: ' +
           '<code>pidof</code>, cổng, node thiết bị.' },
    { q: 'Một tiến trình root chạy <code>fw_setenv bootcmd \'…\'</code> trên Thermo bài này. Kết quả?',
      opts: ['U-Boot chạy <code>bootcmd</code> mới ở lần boot sau',
             '<code>fw_setenv</code> báo lỗi permission denied',
             'Biến được ghi xuống flash nhưng U-Boot bỏ qua nó vì không nằm trong <code>CFG_ENV_FLAGS_LIST_STATIC</code>',
             'Môi trường hỏng CRC'],
      a: 2,
      why: 'Với <code>ENV_WRITEABLE_LIST</code>, chỉ các biến có cờ <code>w</code> trong danh sách biên dịch sẵn mới được ' +
           'ghi đè từ flash. <code>fw_setenv</code> không biết luật đó nên vẫn ghi và trả 0 — Bước 6 đo đúng điều này ' +
           'với <code>thermo_ab</code>.' },
    { q: 'Vì sao <code>thermo-update</code> kiểm chữ ký bằng <code>head -c $size /dev/vdaN</code> sau khi ghi, thay vì ' +
         'kiểm file tải về trước khi ghi?',
      opts: ['Vì <code>openssl</code> không đọc được pipe',
             'Vì Thermo không có chỗ chứa ảnh 96 MiB, và kiểm trên đĩa bắt được cả lỗi ghi lẫn ảnh giả ở cùng một chỗ',
             'Vì kiểm trước sẽ chậm hơn', 'Vì chữ ký được tính trên ảnh nén'],
      a: 1,
      why: 'RAM 512 MiB và <code>/data</code> 16 MiB không đủ giữ ảnh, nên ảnh chảy thẳng vào khe trống. Kiểm byte đọc lại ' +
           'từ đĩa chứng minh đúng thứ U-Boot sẽ boot, không phải thứ đã đi qua mạng.' },
    { q: 'So với ghi đè tại chỗ, cái giá chính của bố cục A/B là gì?',
      opts: ['Cần hai bootloader', 'Dung lượng rootfs gấp đôi trên đĩa', 'Không thể dùng rootfs chỉ đọc',
             'Không thể ký ảnh'],
      a: 1,
      why: '<code>disk.img</code> tăng từ 117 441 024 lên 218 104 320 B vì khe B phải bằng khe A. Đó là lý do SWUpdate hỗ ' +
           'trợ cả kiểu "một khe + recovery" cho thiết bị ít flash.' }
  ]
});

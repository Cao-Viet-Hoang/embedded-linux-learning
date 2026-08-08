/* Bài 27 — Cross-compile chương trình đầu tiên cho ARM64
   Chặng 04 — Cross-compilation */

Lesson.register({
  id: 'bai-27',
  title: 'Cross-compile chương trình đầu tiên cho ARM64',
  minutes: 65,
  practice: 'Thực hành 50 phút',
  level: 'Trung cấp',

  intro:
    '<p>Bài 25 cho bạn lý do, Bài 26 cho bạn bộ đồ nghề. Bài này đem cả hai ra làm việc thật: ' +
    'lấy <code>temp_daemon.c</code> — chương trình lớn nhất bạn đã viết, có luồng, có ' +
    '<code>signalfd</code>, có <code>epoll</code>, có socket — và dịch nó cho ARM64 <b>mà không ' +
    'sửa một dòng mã nào</b>.</p>' +
    '<p>Rồi tới câu hỏi mà Bài 3 để ngỏ. Hồi đó bạn chạy một file ARM64 trên máy x86 và nhận ' +
    '<code>Exec format error</code>, mã thoát <b>126</b>. Bài này gỡ đúng lỗi ấy bằng ' +
    '<code>qemu-aarch64</code>: daemon ARM64 sẽ mở cổng <b>9006</b>, phục vụ ba yêu cầu từ một ' +
    'chương trình khách <b>x86</b> thật, rồi tắt êm khi nhận <code>SIGTERM</code> — mã thoát ' +
    '<b>0</b>.</p>' +
    '<p>Bốn con số sẽ theo bạn suốt phần còn lại của khoá: cùng một mã nguồn cho ra ' +
    '<b>17 512</b> byte trên x86, <b>72 072</b> byte trên ARM64, <b>18 824</b> byte khi ép cỡ ' +
    'trang, và <b>795 224</b> byte khi liên kết tĩnh. Bạn sẽ giải thích được từng con số.</p>' +
    '<p>Cuối bài là trở ngại mà Bài 26 đã báo trước: một chương trình cần <code>zlib</code>. ' +
    'Máy build có sẵn, sysroot của target thì không — <b>49</b> thư viện so với <b>858</b>. Bạn ' +
    'sẽ tự dựng một <b>staging sysroot</b> để lấp chỗ trống đó, đúng cách mà Buildroot và Yocto ' +
    'làm ở Chặng 11.</p>',

  goals: [
    'Dịch cùng một mã nguồn C ra hai nhị phân khác kiến trúc và chứng minh sự khác biệt bằng <code>file</code> và <code>readelf -h</code>',
    'Giải thích được vì sao <code>qemu-user</code> chạy được nhị phân ARM64 trên máy x86, và nó khác <code>qemu-system-*</code> ở chỗ nào',
    'Chỉ ra đúng vai trò của <code>binfmt_misc</code> và giải thích vì sao sau khi cài <code>qemu-user</code> thì <code>Exec format error</code> của Bài 3 biến mất',
    'Xử lý được lỗi thiếu trình thông dịch động bằng <code>-L</code>, <code>QEMU_LD_PREFIX</code> hoặc <code>-static</code>, và nói rõ mỗi cách đánh đổi gì',
    'Viết một <code>Makefile</code> đổi kiến trúc chỉ bằng biến <code>CROSS_COMPILE=</code>, theo đúng quy ước của nhân Linux',
    'Dựng một staging sysroot và liên kết chương trình với thư viện ngoài đã cross-compile',
    'Đo được cái giá thật của mô phỏng ở mức người dùng bằng một phép đo lặp lại được'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. MỘT MÃ NGUỒN, HAI KIẾN TRÚC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một mã nguồn, hai kiến trúc' },

    { t: 'p', x:
      'Chương trình bạn sắp dịch là <code>temp_daemon.c</code> ở cuối Bài 24: một luồng cảm biến ' +
      'cập nhật nhiệt độ mỗi 200 ms, một <code>signalfd</code> biến <code>SIGTERM</code> thành ' +
      'file mô tả, một vòng <code>epoll</code> phục vụ mọi khách trên cổng 9006. Nó dùng ' +
      '<code>pthread</code>, dùng lời gọi hệ thống riêng của Linux, dùng socket TCP. Nói cách ' +
      'khác: nó chạm vào gần như mọi thứ mà một daemon nhúng thật sẽ chạm vào.' },

    { t: 'p', x:
      'Bạn sẽ không sửa nó. Toàn bộ khác biệt nằm ở <b>tên chương trình đứng đầu dòng lệnh</b>.' },

    { t: 'code', where: 'wsl', code:
      'gcc                  -Wall -Wextra -O2 -pthread -o temp_daemon_x86   temp_daemon.c\n' +
      'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -o temp_daemon_arm64 temp_daemon.c' },

    { t: 'cal', kind: 'why', title: 'Vì sao mã nguồn không cần đổi một chữ nào?',
      x: '<p>Vì mọi thứ chương trình này dùng đều được định nghĩa ở tầng cao hơn kiến trúc:</p>' +
         '<ul>' +
         '<li><b>Ngôn ngữ C</b> chuẩn hoá <code>int</code>, <code>while</code>, con trỏ — không ' +
         'nhắc tới thanh ghi nào.</li>' +
         '<li><b>POSIX và Linux API</b> chuẩn hoá <code>socket()</code>, <code>epoll_wait()</code>, ' +
         '<code>pthread_create()</code>. Một <code>epoll_wait()</code> trên ARM64 nhận đúng các ' +
         'tham số như trên x86-64; chỉ số hiệu lời gọi hệ thống và cách nạp tham số vào thanh ghi ' +
         'là khác, và đó là việc của thư viện C, không phải của bạn.</li>' +
         '<li><b>Sysroot</b> cung cấp bộ header của target. <code>&lt;sys/epoll.h&gt;</code> ở ' +
         '<code>/usr/aarch64-linux-gnu/include/</code> có cùng tên hàm, chỉ khác vài hằng số ' +
         'trong <code>bits/</code> — đúng như bạn đã đếm ở Bài 26.</li>' +
         '</ul>' +
         '<p>Điều <i>không</i> tự động dịch được là những chỗ mã của bạn nói thẳng về phần cứng: ' +
         'assembly nội tuyến, giả định <code>sizeof(long)</code>, giả định thứ tự byte, giả định ' +
         'truy cập bộ nhớ không căn lề. <code>temp_daemon.c</code> không có chỗ nào như vậy — đó ' +
         'không phải may mắn, đó là kết quả của việc dùng <code>&lt;stdint.h&gt;</code> và ' +
         '<code>htons()</code> mà Bài 24 đã nhấn mạnh.</p>' },

    { t: 'p', x:
      'Câu hỏi tiếp theo là câu quan trọng: <b>làm sao biết bản ARM64 thật sự là ARM64</b>? ' +
      'Trình biên dịch không báo lỗi không có nghĩa là nó đã làm đúng việc. Bạn cần bằng chứng ' +
      'đọc được từ chính file.' },

    { t: 'code', where: 'wsl', code:
      'file temp_daemon_x86 temp_daemon_arm64' },

    { t: 'code', where: 'out', nocopy: true, code:
      'temp_daemon_x86:   ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically\n' +
      'linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=e81a3403..., for\n' +
      'GNU/Linux 3.2.0, not stripped\n' +
      'temp_daemon_arm64: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV),\n' +
      'dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=184c5d99...,\n' +
      'for GNU/Linux 3.7.0, not stripped' },

    { t: 'p', x:
      'Hai dòng này chứa nhiều thông tin hơn vẻ ngoài của chúng. Bảng dưới tách từng mảnh; ba ' +
      'mảnh đầu giống nhau, ba mảnh sau khác nhau, và <b>mảnh khác nhau nào cũng có hệ quả</b>.' },

    { t: 'table',
      head: ['Mảnh trong output', 'Bản x86-64', 'Bản ARM64', 'Nghĩa'],
      rows: [
        ['Lớp', '<code>ELF 64-bit</code>', '<code>ELF 64-bit</code>', 'Cả hai đều 64-bit. Khuôn dạng file giống hệt — Bài 18 đã mổ nó'],
        ['Thứ tự byte', '<code>LSB</code>', '<code>LSB</code>', 'Little-endian cả hai. ARM64 <i>có thể</i> chạy big-endian nhưng thực tế không ai dùng'],
        ['Kiểu', '<code>pie executable</code>', '<code>pie executable</code>', 'Position-Independent Executable — mặc định của Ubuntu, để nạp được ở địa chỉ ngẫu nhiên'],
        ['<b>Kiến trúc</b>', '<code>x86-64</code>', '<b><code>ARM aarch64</code></b>', 'Đây là bằng chứng chính. Đọc từ trường <code>e_machine</code> trong ELF header'],
        ['<b>Trình thông dịch</b>', '<code>/lib64/ld-linux-x86-64.so.2</code>', '<b><code>/lib/ld-linux-aarch64.so.1</code></b>', 'Đường dẫn <i>trên target</i>. Máy build của bạn không có file này — nguồn gốc của lỗi đầu tiên bạn sẽ gặp'],
        ['Phiên bản nhân tối thiểu', '<code>3.2.0</code>', '<code>3.7.0</code>', 'ARM64 chỉ được nhân hỗ trợ từ Linux 3.7 trở đi, nên ngưỡng cao hơn']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao ngưỡng nhân của ARM64 là 3.7 chứ không phải 3.2?',
      x: '<p>Kiến trúc AArch64 được hợp nhất vào nhân Linux ở bản <b>3.7</b> (tháng 12 năm 2012). ' +
         'Không có nhân nào cũ hơn biết cách nạp một nhị phân ARM64, nên trình liên kết ghi đúng ' +
         'con số đó vào ghi chú <code>.note.ABI-tag</code>. Đây không phải chi tiết vô dụng: khi ' +
         'bạn nhận một board dùng nhân vá của nhà sản xuất, số này là thứ đầu tiên cần đối chiếu ' +
         'nếu nhị phân từ chối nạp.</p>' },

    /* ── readelf ── */
    { t: 'h3', x: 'Đọc thẳng từ ELF header' },

    { t: 'p', x:
      '<code>file</code> tiện nhưng nó <i>đoán</i> theo cơ sở dữ liệu số nhiệm màu. ' +
      '<code>readelf -h</code> đọc thẳng cấu trúc. Trong quy trình build tự động, đây mới là ' +
      'công cụ bạn dùng để kiểm tra.' },

    { t: 'code', where: 'wsl', code:
      'readelf -h temp_daemon_x86   | grep -E \'Class|Machine|Type|Entry\'\n' +
      'echo ---\n' +
      'readelf -h temp_daemon_arm64 | grep -E \'Class|Machine|Type|Entry\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  Class:                             ELF64\n' +
      '  Type:                              DYN (Position-Independent Executable file)\n' +
      '  Machine:                           Advanced Micro Devices X86-64\n' +
      '  Entry point address:               0x1a50\n' +
      '---\n' +
      '  Class:                             ELF64\n' +
      '  Type:                              DYN (Position-Independent Executable file)\n' +
      '  Machine:                           AArch64\n' +
      '  Entry point address:               0x1740' },

    { t: 'cal', kind: 'tip', title: '<code>readelf</code> native đọc được file ARM64 — và điều đó là bình thường',
      x: '<p>Bạn vừa dùng <code>readelf</code> <b>không có tiền tố</b> trên một file ARM64 và nó ' +
         'trả lời đúng. Bài 26 đã giải thích: khuôn dạng ELF giống nhau ở mọi kiến trúc, nên đọc ' +
         'phần vỏ không cần biết bảng lệnh. Nhớ lại ranh giới: <code>readelf</code>, ' +
         '<code>nm</code>, <code>size</code> dùng bản native được; <code>objdump -d</code>, ' +
         '<code>strip</code>, <code>ld</code> thì <b>bắt buộc</b> phải đúng tiền tố. Bạn sẽ tự ' +
         'gây ra lỗi đó ở phần thực hành.</p>' },

    { t: 'fig', cap:
      'Cùng một file <code>.c</code> đi qua hai driver khác nhau cho ra hai ELF khác trường ' +
      '<code>e_machine</code>. Mọi khác biệt đều nằm ở phía dưới mã nguồn, không nằm trong mã nguồn.',
      svg:
      '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Sơ đồ một mã nguồn C đi qua hai toolchain cho ra hai file ELF khác kiến trúc">' +
      '<rect class="d-box-p" x="270" y="12" width="180" height="38" rx="6"/>' +
      '<text class="d-tm" x="360" y="30" text-anchor="middle">temp_daemon.c</text>' +
      '<text class="d-ts" x="360" y="44" text-anchor="middle">không sửa một dòng</text>' +

      '<line class="d-line" x1="310" y1="52" x2="180" y2="82"/>' +
      '<path class="d-arrow" d="M180 82 L191 79 L188 89 Z"/>' +
      '<line class="d-line" x1="410" y1="52" x2="540" y2="82"/>' +
      '<path class="d-arrow" d="M540 82 L529 79 L532 89 Z"/>' +

      '<rect class="d-box" x="40" y="86" width="280" height="44" rx="6"/>' +
      '<text class="d-tm" x="180" y="106" text-anchor="middle">gcc</text>' +
      '<text class="d-ts" x="180" y="122" text-anchor="middle">driver native của máy build</text>' +

      '<rect class="d-box-a" x="400" y="86" width="280" height="44" rx="6"/>' +
      '<text class="d-tm" x="540" y="106" text-anchor="middle">aarch64-linux-gnu-gcc</text>' +
      '<text class="d-ts" x="540" y="122" text-anchor="middle">driver cross</text>' +

      '<line class="d-line" x1="180" y1="132" x2="180" y2="156"/>' +
      '<path class="d-arrow" d="M180 158 L175 147 L185 147 Z"/>' +
      '<line class="d-line" x1="540" y1="132" x2="540" y2="156"/>' +
      '<path class="d-arrow" d="M540 158 L535 147 L545 147 Z"/>' +

      '<rect class="d-box-g" x="40" y="160" width="280" height="88" rx="6"/>' +
      '<text class="d-t" x="180" y="182" text-anchor="middle">temp_daemon_x86</text>' +
      '<text class="d-tm" x="180" y="202" text-anchor="middle">e_machine = X86-64</text>' +
      '<text class="d-tm" x="180" y="220" text-anchor="middle">17 512 byte</text>' +
      '<text class="d-ts" x="180" y="238" text-anchor="middle">chạy thẳng trên WSL</text>' +

      '<rect class="d-box-w" x="400" y="160" width="280" height="88" rx="6"/>' +
      '<text class="d-t" x="540" y="182" text-anchor="middle">temp_daemon_arm64</text>' +
      '<text class="d-tm" x="540" y="202" text-anchor="middle">e_machine = AArch64</text>' +
      '<text class="d-tm" x="540" y="220" text-anchor="middle">72 072 byte</text>' +
      '<text class="d-ts" x="540" y="238" text-anchor="middle">cần qemu-aarch64 mới chạy</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       2. CHẠY THỬ Ở ĐÂU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Dịch xong rồi — chạy thử ở đâu?' },

    { t: 'p', x:
      'Đây là chỗ cross-compilation khác hẳn biên dịch thường. Dịch xong bạn có một file mà ' +
      '<b>chính máy vừa tạo ra nó lại không chạy được</b>. Bạn đã gặp đúng cảm giác này ở Bài 3, ' +
      'trên một máy chưa cài <code>qemu-user</code>: gõ <code>./hello-arm64</code> thì shell trả ' +
      'lời <code>cannot execute binary file: Exec format error</code> và mã thoát là <b>126</b>. ' +
      'Với <code>temp_daemon_arm64</code>, kết quả y hệt — kích thước và độ phức tạp của chương ' +
      'trình không liên quan gì.' },

    { t: 'cal', kind: 'why', title: 'Nhân từ chối ở bước nào, và vì sao đó là hành vi đúng?',
      x: '<p>Khi bạn gõ <code>./temp_daemon_arm64</code>, shell gọi <code>execve()</code>. Nhân ' +
         'mở file, đọc <b>18 byte đầu</b> của ELF header, thấy <code>e_machine = 183</code> ' +
         '(AArch64) rồi tra danh sách các "trình nạp nhị phân" đã đăng ký. Nhân x86-64 có trình ' +
         'nạp cho ELF x86-64, cho ELF i386, cho script <code>#!</code> — nhưng không có gì biết ' +
         'nạp AArch64. <code>execve()</code> trả về <code>ENOEXEC</code>, shell in ' +
         '<code>Exec format error</code> và thoát với mã <b>126</b>.</p>' +
         '<p>Đây là hành vi <i>đúng</i>. CPU x86-64 vật lý không có mạch giải mã lệnh ARM64; nếu ' +
         'nhân cứ nạp, con trỏ lệnh sẽ nhảy vào một dãy byte vô nghĩa và tiến trình chết bằng ' +
         '<code>SIGILL</code>. Từ chối sớm với một thông báo rõ ràng tốt hơn nhiều so với sập ' +
         'giữa chừng.</p>' },

    { t: 'p', x:
      'Bạn có ba lối ra, và bạn sẽ dùng cả ba trước khi hết khoá học:' },

    { t: 'table',
      head: ['Cách', 'Cái được mô phỏng', 'Ưu điểm', 'Giới hạn', 'Học ở đâu'],
      rows: [
        ['Board thật', 'Không mô phỏng gì', 'Đúng tuyệt đối', 'Phải có phần cứng, phải nạp ảnh, gỡ lỗi chậm', 'Ngoài phạm vi khoá này'],
        ['<b><code>qemu-aarch64</code></b><br><span class="d-ts">qemu-user</span>', 'Chỉ <b>lệnh CPU ở chế độ người dùng</b>. Lời gọi hệ thống được chuyển thẳng cho nhân Linux của máy bạn', 'Nhanh, gõ một dòng là chạy, không cần nhân/rootfs riêng', 'Không có nhân riêng, không có driver, không có <code>/dev</code> của target', '<b>Bài này</b>'],
        ['<code>qemu-system-aarch64</code><br><span class="d-ts">qemu-system</span>', 'Cả một <b>máy tính</b>: CPU, RAM, UART, timer, thiết bị', 'Chạy được nhân riêng, bootloader, driver thật', 'Phải dựng kernel + rootfs, khởi động lâu hơn', 'Chặng 05 — Bài 29 tới 32']
      ]},

    { t: 'cal', kind: 'info', title: 'Hai chữ "QEMU" trong khoá này là hai chương trình khác nhau',
      x: '<p>Đừng nhầm. <code>qemu-system-aarch64</code> mà bạn đã cài từ Bài 1 mô phỏng <b>một cái ' +
         'máy</b>: nó tự dựng RAM, đồng hồ, UART, rồi khởi động một nhân Linux bên trong. ' +
         '<code>qemu-aarch64</code> — không có chữ <code>system</code> — chỉ mô phỏng <b>một tiến ' +
         'trình</b>: nó nạp file ELF ARM64 vào không gian địa chỉ của chính nó, dịch từng khối ' +
         'lệnh ARM64 sang lệnh x86-64, và mỗi khi chương trình gọi <code>write()</code> thì nó ' +
         'chuyển đổi tham số rồi gọi <code>write()</code> <b>thật</b> lên nhân WSL của bạn.</p>' +
         '<p>Hệ quả trực tiếp: dưới <code>qemu-user</code>, daemon ARM64 của bạn mở cổng 9006 ' +
         'trên <b>ngăn xếp mạng của WSL</b>, nên một chương trình khách x86 kết nối tới ' +
         '<code>127.0.0.1</code> là nói chuyện được ngay. Dưới <code>qemu-system</code> thì cổng ' +
         '9006 nằm trong máy ảo và bạn phải cấu hình chuyển tiếp cổng — chuyện của Chặng 05.</p>' },

    { t: 'fig', cap:
      '<code>qemu-user</code> dịch lệnh ARM64 sang x86-64 rồi đưa lời gọi hệ thống thẳng cho nhân ' +
      'WSL. Không có nhân thứ hai, không có thiết bị ảo — đó là lý do nó nhanh và cũng là lý do ' +
      'nó không thay được <code>qemu-system</code>.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ so sánh qemu-user và qemu-system về số tầng phần mềm">' +
      '<text class="d-t" x="175" y="18" text-anchor="middle">qemu-user (Bài này)</text>' +
      '<text class="d-t" x="545" y="18" text-anchor="middle">qemu-system (Chặng 05)</text>' +

      '<rect class="d-box-a" x="30" y="30" width="290" height="40" rx="6"/>' +
      '<text class="d-tm" x="175" y="48" text-anchor="middle">temp_daemon_arm64</text>' +
      '<text class="d-ts" x="175" y="63" text-anchor="middle">lệnh ARM64, chế độ người dùng</text>' +

      '<rect class="d-box-p" x="30" y="78" width="290" height="40" rx="6"/>' +
      '<text class="d-tm" x="175" y="96" text-anchor="middle">qemu-aarch64</text>' +
      '<text class="d-ts" x="175" y="111" text-anchor="middle">dịch lệnh + chuyển đổi syscall</text>' +

      '<rect class="d-box-g" x="30" y="126" width="290" height="40" rx="6"/>' +
      '<text class="d-tm" x="175" y="144" text-anchor="middle">nhân Linux của WSL</text>' +
      '<text class="d-ts" x="175" y="159" text-anchor="middle">socket, epoll, signalfd đều là đồ thật</text>' +

      '<rect class="d-box" x="30" y="174" width="290" height="34" rx="6"/>' +
      '<text class="d-t" x="175" y="195" text-anchor="middle">CPU x86-64</text>' +

      '<text class="d-ts" x="175" y="230" text-anchor="middle">3 tầng phần mềm · chậm 1,46 lần</text>' +
      '<text class="d-ts" x="175" y="248" text-anchor="middle">cổng 9006 mở ngay trên WSL</text>' +

      '<rect class="d-box-a" x="400" y="30" width="290" height="34" rx="6"/>' +
      '<text class="d-tm" x="545" y="51" text-anchor="middle">chương trình ARM64</text>' +

      '<rect class="d-box-w" x="400" y="70" width="290" height="34" rx="6"/>' +
      '<text class="d-tm" x="545" y="91" text-anchor="middle">nhân Linux ARM64 (bạn tự build)</text>' +

      '<rect class="d-box-w" x="400" y="110" width="290" height="34" rx="6"/>' +
      '<text class="d-tm" x="545" y="131" text-anchor="middle">thiết bị ảo: UART, GIC, virtio</text>' +

      '<rect class="d-box-p" x="400" y="150" width="290" height="34" rx="6"/>' +
      '<text class="d-tm" x="545" y="171" text-anchor="middle">qemu-system-aarch64</text>' +

      '<rect class="d-box-g" x="400" y="190" width="290" height="30" rx="6"/>' +
      '<text class="d-ts" x="545" y="209" text-anchor="middle">nhân Linux của WSL</text>' +

      '<rect class="d-box" x="400" y="226" width="290" height="30" rx="6"/>' +
      '<text class="d-t" x="545" y="245" text-anchor="middle">CPU x86-64</text>' +

      '<text class="d-ts" x="545" y="278" text-anchor="middle">6 tầng · khởi động mất nhiều giây · cần chuyển tiếp cổng</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       3. BINFMT_MISC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '<code>binfmt_misc</code>: dạy nhân nhận ra file lạ' },

    { t: 'p', x:
      'Sau khi cài gói <code>qemu-user</code>, hãy chạy lại đúng lệnh vừa thất bại. Thông báo lỗi ' +
      '<b>đổi khác</b> — và bạn không gõ thêm chữ nào:' },

    { t: 'code', where: 'wsl', code:
      './temp_daemon_arm64\n' +
      'echo "exit code = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or directory\n' +
      'exit code = 255' },

    { t: 'p', x:
      'Chưa chạy được, nhưng đây là một thất bại <b>hoàn toàn khác</b>. Lần trước là ' +
      '<code>bash</code> báo nhân từ chối nạp file. Lần này chính <code>qemu-aarch64</code> lên ' +
      'tiếng — nghĩa là nhân <i>đã</i> nạp file ARM64 và giao nó cho QEMU. Bạn chưa hề gõ tên ' +
      '<code>qemu-aarch64</code> ở đâu cả. Ai đã gọi nó?' },

    { t: 'p', x:
      'Nhân Linux có một mô-đun tên <code>binfmt_misc</code> — "binary format, miscellaneous". ' +
      'Nó cho phép người quản trị đăng ký thêm luật: <i>nếu file bắt đầu bằng dãy byte này, hãy ' +
      'chạy nó bằng chương trình kia</i>. Gói <code>qemu-user-binfmt</code> đăng ký một luật cho ' +
      'mỗi kiến trúc mà QEMU biết dịch.' },

    { t: 'code', where: 'wsl', code:
      'cat /proc/sys/fs/binfmt_misc/qemu-aarch64' },

    { t: 'code', where: 'out', nocopy: true, code:
      'enabled\n' +
      'interpreter /usr/bin/qemu-aarch64\n' +
      'flags: POF\n' +
      'offset 0\n' +
      'magic 7f454c460201010000000000000000000200b700\n' +
      'mask ffffffffffffff00fffffffffffffffffeffffff' },

    { t: 'cmdx', title: 'Giải phẫu một luật <code>binfmt_misc</code>', cmd: 'cat /proc/sys/fs/binfmt_misc/qemu-aarch64',
      rows: [
        ['<code>enabled</code>', 'Luật đang có hiệu lực. Ghi <code>0</code> vào file này sẽ tắt nó mà không cần gỡ gói.', ''],
        ['<code>interpreter</code>', 'Chương trình nhân sẽ chạy thay. Nhân <b>không</b> nạp file ARM64 nữa — nó nạp <code>/usr/bin/qemu-aarch64</code> (một file x86-64 bình thường) rồi truyền đường dẫn file ARM64 làm tham số.', ''],
        ['<code>offset 0</code>', 'Bắt đầu so khớp từ byte 0 của file.', ''],
        ['<code>magic</code>', 'Dãy byte cần khớp. <code>7f 45 4c 46</code> là <code>\\x7fELF</code> — bốn byte mở đầu mọi file ELF, bạn đã gặp ở Bài 18. Hai byte cuối <code>b7 00</code> là số <b>183</b> ở dạng little-endian: đúng <code>e_machine</code> của AArch64.', ''],
        ['<code>mask</code>', 'Byte nào trong <code>magic</code> thật sự phải khớp. Chỗ có <code>ff</code> là bắt buộc, chỗ có <code>00</code> là bỏ qua — nhờ vậy luật không quan tâm tới phiên bản ABI hay số hiệu hệ điều hành trong header.', ''],
        ['<code>flags: POF</code>', '<code>P</code> giữ nguyên <code>argv[0]</code>, <code>O</code> mở sẵn file rồi truyền file mô tả, <code>F</code> nạp sẵn trình thông dịch vào bộ nhớ ngay lúc đăng ký — nhờ <code>F</code> mà luật vẫn dùng được bên trong container hay <code>chroot</code> không chứa <code>/usr/bin/qemu-aarch64</code>.', '']
      ]},

    { t: 'cal', kind: 'info', title: 'Bạn đã dùng <code>binfmt_misc</code> từ lâu mà không biết',
      x: '<p>Liệt kê thư mục đó bạn sẽ thấy một mục tên <code>WSLInterop</code>. Đó chính là cơ ' +
         'chế cho phép bạn gõ <code>notepad.exe</code> hay <code>explorer.exe .</code> ngay trong ' +
         'shell Ubuntu: Microsoft đăng ký một luật khớp với magic <code>MZ</code> của file ' +
         '<code>.exe</code>, và trình thông dịch là cầu nối sang Windows. Cùng một cơ chế nhân, ' +
         'hai mục đích hoàn toàn khác nhau.</p>' +
         '<p>Sau khi cài <code>qemu-user-binfmt</code>, thư mục này có <b>31</b> mục ' +
         '<code>qemu-*</code>: từ <code>qemu-aarch64</code> tới <code>qemu-s390x</code>, ' +
         '<code>qemu-riscv64</code>, <code>qemu-m68k</code>. Máy WSL của bạn vừa biết chạy nhị ' +
         'phân của 31 kiến trúc.</p>' },

    { t: 'cal', kind: 'warn', title: '<code>binfmt_misc</code> tiện nhưng nó giấu mất một sự thật',
      x: '<p>Khi lệnh <code>./temp_daemon_arm64</code> bỗng chạy được, rất dễ quên rằng file đó ' +
         '<b>không</b> phải nhị phân của máy bạn. Trong một quy trình build tự động, sự nhầm lẫn ' +
         'này gây hậu quả thật: một bài kiểm thử "chạy được nên chắc là ổn" trong khi thực tế nó ' +
         'chạy dưới lớp mô phỏng, dùng nhân của máy build chứ không phải nhân của target.</p>' +
         '<p>Trong bài này bạn sẽ gọi <code>qemu-aarch64</code> <b>tường minh</b> ở hầu hết các ' +
         'bước, để luôn nhìn thấy lớp mô phỏng. Đó cũng là thói quen nên giữ khi làm việc thật.</p>' },

    /* ══════════════════════════════════════════════
       4. TRÌNH THÔNG DỊCH ĐỘNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Trình thông dịch động: file đầu tiên bị thiếu' },

    { t: 'p', x:
      'Quay lại thông báo lỗi. <code>qemu-aarch64</code> nói nó không mở được ' +
      '<code>/lib/ld-linux-aarch64.so.1</code>. Đường dẫn ấy không phải QEMU tự nghĩ ra — nó nằm ' +
      'ngay trong file ELF của bạn, ở đoạn <code>INTERP</code>.' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-readelf -d temp_daemon_arm64 | grep NEEDED' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [ld-linux-aarch64.so.1]' },

    { t: 'p', x:
      'Bài 17 đã dạy cơ chế này ở phía x86: nhân nạp chương trình, thấy đoạn <code>INTERP</code>, ' +
      'liền nạp thêm trình liên kết động rồi trao quyền cho nó; trình liên kết động mới đi tìm ' +
      '<code>libc.so.6</code> và nối các ký hiệu lại. Ở đây <code>qemu-aarch64</code> đóng vai ' +
      'nhân: nó cũng phải tìm cho ra <code>/lib/ld-linux-aarch64.so.1</code>. Máy WSL của bạn có ' +
      'file đó không? Có — nhưng <b>không nằm ở <code>/lib</code></b>.' },

    { t: 'code', where: 'wsl', code:
      'ls -l /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1\n' +
      'ls /lib/ld-linux-aarch64.so.1' },

    { t: 'code', where: 'out', nocopy: true, code:
      '-rwxr-xr-x 1 root root 200688 Apr 11 13:34 /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1\n' +
      'ls: cannot access \'/lib/ld-linux-aarch64.so.1\': No such file or directory' },

    { t: 'cal', kind: 'why', title: 'Vì sao trình biên dịch lại ghi một đường dẫn không tồn tại trên máy bạn?',
      x: '<p>Vì nó ghi đường dẫn <b>trên target</b>, không phải trên máy build. Trên một board ' +
         'ARM64 thật, thư viện C nằm ở <code>/lib</code>, đúng như trong file. Máy WSL của bạn cất ' +
         'bộ thư viện ARM64 ở <code>/usr/aarch64-linux-gnu/lib/</code> để không đè lên thư viện ' +
         'x86-64 của chính nó — hai bộ cùng tên <code>libc.so.6</code> mà khác kiến trúc thì ' +
         'không thể ở chung một thư mục.</p>' +
         '<p>Đây chính là <b>sysroot</b> mà Bài 26 định nghĩa: cây thư mục mô phỏng gốc của target ' +
         'nằm nhờ trên máy build. Việc còn lại là nói cho <code>qemu-aarch64</code> biết gốc ' +
         'ấy ở đâu.</p>' },

    { t: 'p', x: 'Ba cách, dùng cả ba trong phần thực hành:' },

    { t: 'table',
      head: ['Cách', 'Lệnh', 'Khi nào dùng'],
      rows: [
        ['Tham số <code>-L</code>', '<code>qemu-aarch64 -L /usr/aarch64-linux-gnu ./prog</code>', 'Gõ tay, chạy một lần. Rõ ràng nhất vì lớp mô phỏng hiện ngay trên dòng lệnh'],
        ['Biến môi trường', '<code>export QEMU_LD_PREFIX=/usr/aarch64-linux-gnu</code>', 'Chạy nhiều lần trong một phiên, hoặc khi chương trình được gọi gián tiếp qua <code>binfmt_misc</code> nên bạn không chen được tham số vào'],
        ['Liên kết tĩnh', '<code>aarch64-linux-gnu-gcc -static …</code>', 'Không cần sysroot lúc chạy vì không cần trình thông dịch. Đổi lại file phình từ <b>72 072</b> lên <b>795 224</b> byte']
      ]},

    { t: 'cal', kind: 'tip', title: '<code>-L</code> ở đây <b>không</b> phải <code>-L</code> của trình liên kết',
      x: '<p>Cùng một chữ cái, hai nghĩa khác hẳn, và chúng xuất hiện cách nhau vài dòng trong ' +
         'cùng một phiên làm việc:</p>' +
         '<ul>' +
         '<li><code>gcc … -L/duong/dan</code> — <b>lúc dịch</b>: thêm một thư mục vào danh sách ' +
         'nơi trình liên kết tìm file <code>.a</code>/<code>.so</code>.</li>' +
         '<li><code>qemu-aarch64 -L /duong/dan</code> — <b>lúc chạy</b>: đặt gốc hệ thống file ' +
         'giả cho tiến trình được mô phỏng. Mọi đường dẫn tuyệt đối chương trình mở sẽ được thử ' +
         'ghép vào tiền tố này trước.</li>' +
         '</ul>' +
         '<p>Nhầm hai cái này là một trong những cách tốn thời gian nhất khi mới cross-compile.</p>' },

    { t: 'fig', cap:
      'Ba đường vào cùng một đích. Liên kết tĩnh bỏ hẳn bước tìm thư viện lúc chạy — đó là lý do ' +
      'nhị phân tĩnh là lựa chọn mặc định khi rootfs của bạn còn chưa tồn tại.',
      svg:
      '<svg viewBox="0 0 720 258" width="720" role="img" aria-label="Sơ đồ ba cách để nhị phân ARM64 tìm được trình thông dịch động">' +
      '<rect class="d-box-a" x="250" y="10" width="220" height="36" rx="6"/>' +
      '<text class="d-tm" x="360" y="27" text-anchor="middle">temp_daemon_arm64</text>' +
      '<text class="d-ts" x="360" y="41" text-anchor="middle">INTERP = /lib/ld-linux-aarch64.so.1</text>' +

      '<line class="d-line" x1="300" y1="48" x2="130" y2="76"/>' +
      '<path class="d-arrow" d="M130 76 L141 73 L138 83 Z"/>' +
      '<line class="d-line" x1="360" y1="48" x2="360" y2="76"/>' +
      '<path class="d-arrow" d="M360 78 L355 67 L365 67 Z"/>' +
      '<line class="d-line" x1="420" y1="48" x2="590" y2="76"/>' +
      '<path class="d-arrow" d="M590 76 L579 73 L582 83 Z"/>' +

      '<rect class="d-box" x="20" y="80" width="220" height="72" rx="6"/>' +
      '<text class="d-t" x="130" y="100" text-anchor="middle">Tham số dòng lệnh</text>' +
      '<text class="d-tm" x="130" y="120" text-anchor="middle">-L /usr/aarch64-linux-gnu</text>' +
      '<text class="d-ts" x="130" y="140" text-anchor="middle">rõ ràng nhất</text>' +

      '<rect class="d-box" x="250" y="80" width="220" height="72" rx="6"/>' +
      '<text class="d-t" x="360" y="100" text-anchor="middle">Biến môi trường</text>' +
      '<text class="d-tm" x="360" y="120" text-anchor="middle">QEMU_LD_PREFIX</text>' +
      '<text class="d-ts" x="360" y="140" text-anchor="middle">dùng được cả qua binfmt</text>' +

      '<rect class="d-box-g" x="480" y="80" width="220" height="72" rx="6"/>' +
      '<text class="d-t" x="590" y="100" text-anchor="middle">Liên kết tĩnh</text>' +
      '<text class="d-tm" x="590" y="120" text-anchor="middle">-static</text>' +
      '<text class="d-ts" x="590" y="140" text-anchor="middle">không cần sysroot lúc chạy</text>' +

      '<line class="d-line" x1="130" y1="154" x2="330" y2="184"/>' +
      '<path class="d-arrow" d="M330 184 L319 181 L322 191 Z"/>' +
      '<line class="d-line" x1="360" y1="154" x2="360" y2="184"/>' +
      '<path class="d-arrow" d="M360 186 L355 175 L365 175 Z"/>' +
      '<line class="d-line" x1="590" y1="154" x2="390" y2="184"/>' +
      '<path class="d-arrow" d="M390 184 L401 181 L398 191 Z"/>' +

      '<rect class="d-box-p" x="200" y="188" width="320" height="52" rx="6"/>' +
      '<text class="d-t" x="360" y="210" text-anchor="middle">Chương trình chạy được</text>' +
      '<text class="d-ts" x="360" y="230" text-anchor="middle">phục vụ 3 yêu cầu, thoát với mã 0</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       5. BỐN CON SỐ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn con số kích thước, và cách đọc chúng' },

    { t: 'p', x:
      'Cùng một <code>temp_daemon.c</code>, bốn cách dịch, bốn kích thước. Đây là bảng bạn nên ' +
      'nhớ, vì mọi tranh luận về "ảnh nhúng nặng quá" đều bắt đầu từ đây.' },

    { t: 'table',
      head: ['Cách dịch', 'Kích thước file', 'Phần <code>text</code>', 'So với x86'],
      rows: [
        ['<code>gcc</code> — x86-64, động', '<b>17 512</b> B', '6 694 B', '—'],
        ['<code>aarch64-…-gcc</code> — ARM64, động', '<b>72 072</b> B', '6 992 B', '<b>4,1×</b>'],
        ['ARM64, động, <code>-Wl,-z,max-page-size=4096</code>', '<b>18 824</b> B', '6 992 B', '1,07×'],
        ['ARM64, <code>-static</code>', '<b>795 224</b> B', '626 361 B', '<b>45,4×</b>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao bản ARM64 động nặng gấp 4,1 lần mà mã lệnh chỉ hơn 4,5 %?',
      x: '<p>Bạn đã trả lời câu này ở Bài 26 với chương trình <code>hello</code>, và câu trả lời ' +
         'không đổi khi chương trình lớn lên: <b>phần đệm căn lề</b>. Trình liên kết ARM64 mặc ' +
         'định căn mỗi segment theo trang <b>65 536</b> byte vì nhân ARM64 có thể được cấu hình ' +
         'trang 4 KB, 16 KB hoặc 64 KB, và nó chọn cỡ lớn nhất cho an toàn. Ép về 4 KB thì ' +
         '<b>72 072 → 18 824</b> byte, giảm <b>73,9 %</b>, trong khi <code>size</code> vẫn báo ' +
         'đúng <b>6 992</b> byte <code>text</code> — không một lệnh nào bị bỏ đi.</p>' +
         '<p>Điều đáng nhớ: chênh lệch <b>53 248</b> byte ấy toàn là số 0. Nó chiếm chỗ trên ' +
         'flash của board nhưng không chiếm thêm RAM khi chạy, vì các trang toàn 0 không bao giờ ' +
         'được đọc tới.</p>' },

    { t: 'cal', kind: 'warn', title: 'Chỉ ép <code>max-page-size</code> khi bạn biết nhân của board',
      x: '<p>Tuỳ chọn này là một lời hứa: "segment của tôi căn theo 4 KB là đủ". Nếu nhân của ' +
         'board được build với <code>CONFIG_ARM64_64K_PAGES</code>, lời hứa ấy sai và nhân sẽ từ ' +
         'chối nạp — một lỗi rất khó chẩn đoán vì file trông hoàn toàn hợp lệ với ' +
         '<code>file</code> và <code>readelf</code>. Trong khoá này bạn sẽ tự build nhân ở Chặng ' +
         '07 nên biết chắc, còn khi nhận nhân dựng sẵn thì đừng ép.</p>' },

    { t: 'h3', x: '<code>strip</code>: cắt phần không ai cần lúc chạy' },

    { t: 'p', x:
      'Bốn con số trên đều là bản <code>not stripped</code> — vẫn còn bảng ký hiệu và thông tin ' +
      'phục vụ gỡ lỗi. Bài 18 đã đo mức lợi của <code>strip</code> trên máy x86; con số ở đây ' +
      'không khác về bản chất, nhưng bạn phải dùng đúng bản có tiền tố.' },

    { t: 'table',
      head: ['File', 'Trước <code>strip</code>', 'Sau <code>strip</code>', 'Giảm'],
      rows: [
        ['ARM64 động, trang 4 KB', '18 824 B', '<b>14 368 B</b>', '23,7 %'],
        ['ARM64 tĩnh', '795 224 B', '<b>663 480 B</b>', '16,6 %']
      ]},

    { t: 'cal', kind: 'danger', title: '<code>strip</code> native trên file ARM64 làm hỏng bản build một cách im lặng',
      x: '<p>Gõ <code>strip</code> thay vì <code>aarch64-linux-gnu-strip</code> thì bạn nhận:</p>' +
         '<p><code>strip: Unable to recognise the architecture of the input file</code></p>' +
         '<p>Lỗi này rõ ràng khi gõ tay. Nguy hiểm nằm ở chỗ khác: trong một ' +
         '<code>Makefile</code>, dòng <code>strip $@</code> chạy sau dòng liên kết đúng, và nếu ' +
         'bạn không kiểm tra mã thoát thì <code>make</code> có thể đi tiếp. Đó chính là lý do ' +
         'quy ước <code>CROSS_COMPILE</code> ở mục kế tiếp bắt bạn đặt <b>mọi</b> công cụ qua ' +
         'cùng một biến, chứ không riêng trình biên dịch.</p>' },

    /* ══════════════════════════════════════════════
       6. CROSS_COMPILE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '<code>CROSS_COMPILE=</code> — quy ước của cả ngành' },

    { t: 'p', x:
      'Gõ tay hai dòng <code>gcc</code> khác nhau chỉ ổn khi có một file <code>.c</code>. Với một ' +
      'dự án thật, bạn cần <b>một</b> tập luật build và một cái công tắc để đổi kiến trúc. Nhân ' +
      'Linux, U-Boot, BusyBox, Buildroot — tất cả đều dùng cùng một công tắc, và tên của nó là ' +
      '<code>CROSS_COMPILE</code>.' },

    { t: 'p', x:
      'Quy ước rất đơn giản: <code>CROSS_COMPILE</code> chứa <b>tiền tố</b>, kể cả dấu gạch nối ' +
      'cuối. Mọi công cụ được gọi bằng cách ghép tiền tố ấy vào trước tên công cụ.' },

    { t: 'code', where: 'file', name: 'Makefile', lang: 'make', code:
      '# CROSS_COMPILE is empty by default -> the tools are the native ones.\n' +
      '# Set it on the command line to build for another architecture:\n' +
      '#   make CROSS_COMPILE=aarch64-linux-gnu-\n' +
      'CROSS_COMPILE ?=\n' +
      '\n' +
      'CC      = $(CROSS_COMPILE)gcc\n' +
      'STRIP   = $(CROSS_COMPILE)strip\n' +
      'CFLAGS  = -Wall -Wextra -O2 -pthread\n' +
      'LDFLAGS = -Wl,-z,max-page-size=4096\n' +
      '\n' +
      'TARGET  = temp_daemon\n' +
      'BUILD   = build/$(if $(CROSS_COMPILE),$(patsubst %-,%,$(CROSS_COMPILE)),native)\n' +
      '\n' +
      'all: $(BUILD)/$(TARGET)\n' +
      '\n' +
      '$(BUILD)/$(TARGET): temp_daemon.c | $(BUILD)\n' +
      '\t$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<\n' +
      '\t$(STRIP) $@\n' +
      '\t@file $@ | cut -d, -f1-2\n' +
      '\n' +
      '$(BUILD):\n' +
      '\tmkdir -p $@\n' +
      '\n' +
      'clean:\n' +
      '\trm -rf build\n' +
      '\n' +
      '.PHONY: all clean',
      notes: [
        'Dấu gạch nối nằm <b>trong</b> giá trị của biến, không nằm trong <code>$(CROSS_COMPILE)gcc</code>. Đây là quy ước, và nó có lý do: vài toolchain dùng dấu ngăn cách khác, vài trường hợp người ta đặt cả đường dẫn tuyệt đối vào biến này.',
        '<code>?=</code> chứ không phải <code>=</code>: chỉ gán khi biến chưa có giá trị. Nhờ vậy <code>export CROSS_COMPILE=…</code> ở shell vẫn có tác dụng, đúng như Bài 16 đã phân biệt các toán tử gán của <code>make</code>.',
        'Mỗi kiến trúc có thư mục <code>build/</code> riêng nên hai bản dịch không đè lên nhau. Không có nó, <code>make</code> sẽ thấy file đích đã mới hơn mã nguồn và <b>không dịch lại</b> khi bạn đổi kiến trúc — một cái bẫy kinh điển.'
      ]},

    { t: 'cmdx', title: 'Dòng khó nhất trong <code>Makefile</code> này', cmd: 'BUILD = build/$(if $(CROSS_COMPILE),$(patsubst %-,%,$(CROSS_COMPILE)),native)',
      rows: [
        ['<code>$(if a,b,c)</code>', 'Hàm dựng sẵn của <code>make</code>: nếu <code>a</code> khác rỗng thì cho ra <code>b</code>, ngược lại cho ra <code>c</code>. Ở đây <code>a</code> là <code>CROSS_COMPILE</code>.', ''],
        ['<code>$(patsubst %-,%,…)</code>', 'Thay thế theo mẫu: khớp "chuỗi bất kỳ rồi tới dấu gạch nối" và giữ lại phần trước dấu gạch. Nó cắt đúng dấu gạch nối cuối của tiền tố.', ''],
        ['Kết quả', '<code>make</code> trần cho ra <code>build/native</code>; <code>make CROSS_COMPILE=aarch64-linux-gnu-</code> cho ra <code>build/aarch64-linux-gnu</code>.', '']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao phải đặt cả <code>STRIP</code> qua biến, không chỉ <code>CC</code>?',
      x: '<p>Vì một toolchain không chỉ có trình biên dịch. Một <code>Makefile</code> nhúng thật ' +
         'thường khai báo cả <code>$(CROSS_COMPILE)ld</code>, <code>$(CROSS_COMPILE)objcopy</code> ' +
         '(để đổi ELF thành ảnh nhị phân nạp vào flash), <code>$(CROSS_COMPILE)ar</code>, ' +
         '<code>$(CROSS_COMPILE)objdump</code>. Nếu chỉ <code>CC</code> đi qua biến còn ' +
         '<code>STRIP</code> thì không, bản build sẽ <i>dịch</i> đúng rồi <i>hỏng</i> ở bước sau ' +
         '— và thông báo lỗi lúc đó nói về "architecture", khiến bạn đi tìm nhầm chỗ.</p>' +
         '<p>Bạn sẽ gặp lại đúng cặp biến này ở Chặng 07 khi build nhân: ' +
         '<code>make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig</code>. Không phải ' +
         'trùng hợp — <code>Makefile</code> bạn vừa viết là bản thu nhỏ của cùng một ý tưởng.</p>' },

    /* ══════════════════════════════════════════════
       7. THƯ VIỆN NGOÀI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thư viện ngoài — nơi cross-compile bắt đầu khó thật' },

    { t: 'p', x:
      'Tới đây mọi thứ trơn tru vì <code>temp_daemon.c</code> chỉ dùng thư viện C và ' +
      '<code>pthread</code> — hai thứ đã nằm sẵn trong sysroot. Thực tế hiếm khi dễ vậy. Hãy thử ' +
      'một chương trình cần <code>zlib</code>:' },

    { t: 'code', where: 'file', name: 'crc_demo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <zlib.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    const char *text = "embedded linux";\n' +
      '    unsigned long crc = crc32(0L, (const unsigned char *)text, 14);\n' +
      '    printf("zlib %s, crc32 = %08lx\\n", zlibVersion(), crc);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc                   -O2 -o crc_demo_x86   crc_demo.c -lz\n' +
      'aarch64-linux-gnu-gcc -O2 -o crc_demo_arm64 crc_demo.c -lz' },

    { t: 'code', where: 'out', nocopy: true, code:
      '/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lz: No such file or directory\n' +
      'collect2: error: ld returned 1 exit status' },

    { t: 'p', x:
      'Bản x86 dịch xong không một lời phàn nàn. Bản ARM64 chết ở bước liên kết. Đếm số thư viện ' +
      'hai bên là thấy ngay vì sao:' },

    { t: 'code', where: 'wsl', code:
      'ls /usr/aarch64-linux-gnu/lib/*.so* | wc -l\n' +
      'ls /usr/lib/x86_64-linux-gnu/*.so* | wc -l' },

    { t: 'code', where: 'out', nocopy: true, code:
      '49\n' +
      '858' },

    { t: 'cal', kind: 'why', title: '<b>49</b> so với <b>858</b> — đây là bất đối xứng lớn nhất của cross-compilation',
      x: '<p>Máy build của bạn là một hệ điều hành hoàn chỉnh: nó có zlib, OpenSSL, SQLite, ' +
         'ncurses, D-Bus… vì bạn dùng chúng hằng ngày. Sysroot của target thì chỉ có đúng những ' +
         'gì gói <code>libc6-dev-arm64-cross</code> mang theo — thư viện C, thư viện toán, ' +
         '<code>libgcc</code>, và không gì khác.</p>' +
         '<p>Hệ quả: <b>mọi</b> thư viện ngoài mà chương trình cần đều phải được cross-compile ' +
         'trước, rồi cài vào một sysroot mà bạn tự quản lý. Với một chương trình phụ thuộc zlib, ' +
         'zlib lại phụ thuộc thứ khác, thứ khác lại phụ thuộc tiếp — việc này nhanh chóng trở ' +
         'thành công việc chính. Đó chính là <b>lý do tồn tại</b> của Buildroot và Yocto ở Chặng ' +
         '11: chúng không làm gì bạn không làm được bằng tay, chúng chỉ làm việc đó hàng trăm ' +
         'lần mà không sai thứ tự.</p>' },

    { t: 'h3', x: 'Staging sysroot: sysroot thứ hai do bạn làm chủ' },

    { t: 'p', x:
      'Cách xử lý chuẩn là không đụng vào <code>/usr/aarch64-linux-gnu/</code> — đó là tài sản ' +
      'của <code>apt</code>. Thay vào đó bạn dựng một cây thư mục riêng, gọi là <b>staging ' +
      'sysroot</b>, rồi cài mọi thư viện đã cross-compile vào đó.' },

    { t: 'code', where: 'wsl', code:
      'STAGING=~/embedded/bai27/staging\n' +
      'CC=aarch64-linux-gnu-gcc ./configure --prefix="$STAGING" --static\n' +
      'make -j6 && make install' },

    { t: 'cmdx', title: 'Vì sao chỉ cần ba dòng đó', cmd: 'CC=aarch64-linux-gnu-gcc ./configure --prefix="$STAGING" --static',
      rows: [
        ['<code>CC=…</code> đặt trước lệnh', 'Đặt biến môi trường <b>chỉ cho lệnh này</b>, đúng cú pháp bạn học ở Bài 13. Script <code>configure</code> của zlib đọc <code>$CC</code> để biết dùng trình biên dịch nào. Đây là cách gần như mọi dự án dùng Autotools nhận toolchain.', ''],
        ['<code>--prefix</code>', 'Nơi <code>make install</code> sẽ chép kết quả. Đặt vào thư mục của bạn, <b>không</b> đặt vào <code>/usr</code> — nếu không bạn vừa chép thư viện ARM64 đè lên hệ thống x86 của mình.', ''],
        ['<code>--static</code>', 'Chỉ dựng <code>libz.a</code>. Với thư viện tĩnh, mã cần dùng được nhúng thẳng vào chương trình nên lúc chạy không phải đi tìm <code>libz.so</code> trên target — bớt được một biến số khi target còn chưa tồn tại.', ''],
        ['<code>make -j6</code>', 'Sáu tiến trình song song trên 6 CPU của WSL, đúng con số bạn đã đo ở Bài 16.', '']
      ]},

    { t: 'p', x:
      'Sau đó chương trình được dịch với hai tham số trỏ vào staging sysroot — một cho header, ' +
      'một cho thư viện:' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 \\\n' +
      '    -I"$STAGING/include" -o crc_demo_arm64 crc_demo.c \\\n' +
      '    -L"$STAGING/lib" -lz' },

    { t: 'cal', kind: 'tip', title: 'Ba tham số, ba câu hỏi khác nhau',
      x: '<ul>' +
         '<li><code>-I</code> trả lời "tìm <code>zlib.h</code> ở đâu" — chỉ ảnh hưởng bước tiền ' +
         'xử lý.</li>' +
         '<li><code>-L</code> trả lời "tìm file <code>libz.a</code> ở đâu" — chỉ ảnh hưởng bước ' +
         'liên kết.</li>' +
         '<li><code>-lz</code> trả lời "cần thư viện tên gì" — trình liên kết tự ghép thành ' +
         '<code>libz.a</code> hoặc <code>libz.so</code>.</li>' +
         '</ul>' +
         '<p>Thứ tự cũng quan trọng: <code>-lz</code> phải đứng <b>sau</b> file <code>.c</code> ' +
         'hoặc <code>.o</code> cần nó, vì trình liên kết duyệt dòng lệnh một lượt từ trái sang ' +
         'phải — đúng quy tắc bạn đã gặp ở Bài 17.</p>' },

    { t: 'fig', cap:
      'Toolchain nhìn vào hai sysroot: một do <code>apt</code> quản lý và bạn không sửa, một do ' +
      'bạn dựng và toàn quyền. Buildroot ở Chặng 11 tự động hoá đúng cột bên phải.',
      svg:
      '<svg viewBox="0 0 720 262" width="720" role="img" aria-label="Sơ đồ hai sysroot: sysroot của apt và staging sysroot do người học tự dựng">' +
      '<rect class="d-box-p" x="220" y="10" width="280" height="36" rx="6"/>' +
      '<text class="d-tm" x="360" y="27" text-anchor="middle">aarch64-linux-gnu-gcc</text>' +
      '<text class="d-ts" x="360" y="41" text-anchor="middle">tìm header và thư viện ở hai nơi</text>' +

      '<line class="d-line" x1="290" y1="48" x2="170" y2="80"/>' +
      '<path class="d-arrow" d="M170 80 L181 77 L178 87 Z"/>' +
      '<line class="d-line" x1="430" y1="48" x2="550" y2="80"/>' +
      '<path class="d-arrow" d="M550 80 L539 77 L542 87 Z"/>' +

      '<rect class="d-box" x="30" y="84" width="280" height="120" rx="6"/>' +
      '<text class="d-t" x="170" y="106" text-anchor="middle">Sysroot của apt</text>' +
      '<text class="d-tm" x="170" y="126" text-anchor="middle">/usr/aarch64-linux-gnu/</text>' +
      '<text class="d-ts" x="170" y="148" text-anchor="middle">49 thư viện: libc, libm, libgcc</text>' +
      '<text class="d-ts" x="170" y="168" text-anchor="middle">tự động được tìm, không cần -I/-L</text>' +
      '<text class="d-ts" x="170" y="190" text-anchor="middle">bạn KHÔNG sửa vào đây</text>' +

      '<rect class="d-box-g" x="410" y="84" width="280" height="120" rx="6"/>' +
      '<text class="d-t" x="550" y="106" text-anchor="middle">Staging sysroot</text>' +
      '<text class="d-tm" x="550" y="126" text-anchor="middle">~/embedded/bai27/staging/</text>' +
      '<text class="d-ts" x="550" y="148" text-anchor="middle">zlib và mọi thư viện bạn tự dựng</text>' +
      '<text class="d-tm" x="550" y="168" text-anchor="middle">-I …/include   -L …/lib</text>' +
      '<text class="d-ts" x="550" y="190" text-anchor="middle">bạn toàn quyền, xoá đi dựng lại được</text>' +

      '<text class="d-ts" x="360" y="228" text-anchor="middle">Máy build có 858 thư viện x86-64 — không dùng được lấy một cái nào cho ARM64</text>' +
      '<text class="d-ts" x="360" y="248" text-anchor="middle">Nhầm sang chúng là nguyên nhân gần như mọi lỗi cross-compile khó hiểu</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: đưa daemon của bạn sang ARM64' },

    { t: 'p', x:
      'Bảy bước. Kết thúc, bạn có một daemon ARM64 phục vụ được yêu cầu từ chương trình khách ' +
      'x86, một <code>Makefile</code> đổi kiến trúc bằng một biến, một staging sysroot, và một ' +
      'con số đo được về cái giá của mô phỏng.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Cài <code>qemu-user</code> và nhìn nó đăng ký vào nhân',
        blocks: [
          { t: 'p', x:
            'Máy bạn đã có <code>qemu-system-arm</code> từ Bài 1. Gói cần thêm là ' +
            '<code>qemu-user</code> — chương trình mô phỏng ở mức tiến trình. Nó kéo theo ' +
            '<code>qemu-user-binfmt</code>, gói đăng ký luật vào <code>binfmt_misc</code>.' },

          { t: 'code', where: 'wsl', code:
            'sudo apt update\n' +
            'sudo apt install -y qemu-user' },

          { t: 'code', where: 'out', nocopy: true, code:
            'The following additional packages will be installed:\n' +
            '  qemu-user-binfmt\n' +
            'The following NEW packages will be installed:\n' +
            '  qemu-user qemu-user-binfmt\n' +
            '0 upgraded, 2 newly installed, 0 to remove and 2 not upgraded.\n' +
            'Need to get 14.8 MB of archives.\n' +
            'After this operation, 136 MB of additional disk space will be used.' },

          { t: 'cal', kind: 'warn', title: 'Đừng bỏ qua <code>apt update</code>',
            x: '<p>Khi soạn bài này, chạy thẳng <code>apt install</code> cho ra ' +
               '<code>404 Not Found</code>: danh sách gói trên máy còn trỏ tới bản ' +
               '<code>1:10.2.1+ds-1ubuntu3.1</code> trong khi kho đã thay bằng ' +
               '<code>…3.2</code>. Đây là cơ chế Bài 12 đã mô tả — <code>apt</code> tải theo ' +
               '<i>danh sách nó nhớ</i>, không phải theo nội dung kho lúc này. Một lần ' +
               '<code>apt update</code> là xong.</p>' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 --version | head -1\n' +
            'ls /proc/sys/fs/binfmt_misc/ | grep -c \'^qemu-\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-aarch64 version 10.2.1 (Debian 1:10.2.1+ds-1ubuntu3.2)\n' +
            '31' },

          { t: 'cal', kind: 'info', title: '31 kiến trúc, một lệnh cài đặt',
            x: '<p>Từ giờ máy WSL của bạn chạy được nhị phân người dùng của 31 kiến trúc: ' +
               'AArch64, ARM 32-bit, RISC-V, MIPS, PowerPC, s390x, m68k… Bản thân ' +
               '<code>/usr/bin/qemu-aarch64</code> nặng <b>7 108 312</b> byte — gần như toàn bộ ' +
               'là bảng dịch lệnh ARM64 sang x86-64.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Dịch daemon cho hai kiến trúc và xác minh bằng ELF',
        blocks: [
          { t: 'p', x:
            'Lấy lại mã nguồn từ Bài 24. Nếu thư mục cũ không còn, hãy quay lại bước cuối của ' +
            'Bài 24 chép lại <code>temp_daemon.c</code> — bài này không sửa nó một dòng nào, nên ' +
            'bản nào cũng dùng được.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai27 && cd ~/embedded/bai27\n' +
            'cp ~/embedded/bai24/temp_daemon.c .\n' +
            'wc -l temp_daemon.c' },

          { t: 'code', where: 'wsl', code:
            'gcc                   -Wall -Wextra -O2 -pthread -o temp_daemon_x86   temp_daemon.c\n' +
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -o temp_daemon_arm64 temp_daemon.c\n' +
            'file temp_daemon_x86 temp_daemon_arm64' },

          { t: 'code', where: 'out', nocopy: true, code:
            'temp_daemon_x86:   ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV),\n' +
            'dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, ... not stripped\n' +
            'temp_daemon_arm64: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV),\n' +
            'dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, ... not stripped' },

          { t: 'cal', kind: 'info', title: 'Không một cảnh báo nào',
            x: '<p><code>-Wall -Wextra</code> im lặng ở cả hai bản. Một chương trình ' +
               'dùng luồng, tín hiệu, socket và <code>epoll</code> dịch sạch cho ' +
               'một kiến trúc hoàn toàn khác mà không sửa gì — đó không phải phép màu của ' +
               'trình biên dịch, đó là kết quả của việc mã nguồn chỉ nói chuyện qua POSIX API.</p>' },

          { t: 'p', x:
            'Bây giờ tự gây một lỗi để nhớ ranh giới công cụ native / công cụ cross:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -c -O2 -o obj_arm64.o temp_daemon.c\n' +
            'gcc -o wrong obj_arm64.o' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/usr/bin/x86_64-linux-gnu-ld.bfd: obj_arm64.o: Relocations in generic ELF (EM: 183)\n' +
            '/usr/bin/x86_64-linux-gnu-ld.bfd: obj_arm64.o: error adding symbols: file in wrong format\n' +
            'collect2: error: ld returned 1 exit status' },

          { t: 'cal', kind: 'why', title: '<code>EM: 183</code> — con số đáng nhớ',
            x: '<p><code>EM</code> là <code>e_machine</code>, và <b>183</b> là mã của AArch64 ' +
               'trong chuẩn ELF (x86-64 là <b>62</b>). Trình liên kết x86-64 đọc được vỏ ELF nên ' +
               'nó <i>biết</i> file này là ARM64, nhưng nó không có bảng relocation của ARM64 nên ' +
               'gọi chung là "generic ELF" rồi từ chối.</p>' +
               '<p>Bạn đã thấy chính con số 183 ở dạng khác: hai byte <code>b7 00</code> cuối ' +
               'dãy <code>magic</code> của luật <code>binfmt_misc</code>. <code>0xb7</code> = ' +
               '183. Nhân và trình liên kết đọc cùng một trường trong cùng một header.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Chạy daemon ARM64 và cho một chương trình khách x86 kết nối',
        blocks: [
          { t: 'p', x:
            'Đây là bước then chốt của cả bài. Trước hết gặp lại lỗi thiếu trình thông dịch, rồi ' +
            'sửa nó bằng biến môi trường.' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 ./temp_daemon_arm64\n' +
            'echo "exit code = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or directory\n' +
            'exit code = 255' },

          { t: 'code', where: 'wsl', code:
            'export QEMU_LD_PREFIX=/usr/aarch64-linux-gnu\n' +
            './temp_daemon_arm64 &\n' +
            'DP=$!\n' +
            'sleep 1\n' +
            'ss -tlnp | grep 9006\n' +
            'for i in 1 2 3; do echo GET | nc -q1 127.0.0.1 9006; sleep 0.3; done\n' +
            'ps -o pid,comm,args -p $DP | tail -1\n' +
            'kill -TERM $DP; wait $DP; echo "exit code = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[daemon] pid 410 - listening on port 9006, epoll fd 5, signalfd 3\n' +
            'LISTEN 0  64  0.0.0.0:9006  0.0.0.0:*  users:(("temp_daemon_arm",pid=410,fd=4))\n' +
            'temperature=40.5 samples=6\n' +
            '[daemon] served request #1 on fd 6\n' +
            'temperature=41.1 samples=12\n' +
            '[daemon] served request #2 on fd 6\n' +
            'temperature=41.8 samples=19\n' +
            '[daemon] served request #3 on fd 6\n' +
            '    410 temp_daemon_arm /usr/bin/qemu-aarch64 ./temp_daemon_arm64 ./temp_daemon_arm64\n' +
            '[daemon] signal 15 (Terminated) via signalfd - beginning graceful shutdown\n' +
            '[daemon] served 3 requests, closed every file descriptor cleanly, exiting 0\n' +
            'exit code = 0' },

          { t: 'cal', kind: 'info', title: 'Đọc kỹ dòng <code>ps</code> — nó kể toàn bộ câu chuyện',
            x: '<p><code>/usr/bin/qemu-aarch64 ./temp_daemon_arm64 ./temp_daemon_arm64</code></p>' +
               '<p>Tiến trình thật mà nhân biết tới là <code>qemu-aarch64</code>, một nhị phân ' +
               'x86-64. Bạn chưa hề gõ tên nó — <code>binfmt_misc</code> chèn vào. Đường dẫn ' +
               'xuất hiện <b>hai lần</b> vì cờ <code>P</code> (preserve-argv) giữ nguyên ' +
               '<code>argv[0]</code> mà chương trình được mô phỏng nhìn thấy, đồng thời QEMU vẫn ' +
               'cần biết file nào phải nạp.</p>' +
               '<p>Còn cột <code>COMM</code> ghi <code>temp_daemon_arm</code> — cắt ở 15 ký tự ' +
               'theo giới hạn của nhân. Đây là điểm rất dễ nhầm khi gỡ lỗi: <code>ps</code> nói ' +
               'daemon của bạn đang chạy, nhưng thứ nhân đang chạy là QEMU.</p>' },

          { t: 'cal', kind: 'why', title: 'Vì sao <code>nc</code> bản x86 nói chuyện được với daemon ARM64?',
            x: '<p>Vì cả hai dùng chung <b>một</b> ngăn xếp mạng. Khi daemon ARM64 gọi ' +
               '<code>socket()</code>, <code>qemu-aarch64</code> dịch tham số từ quy ước gọi hàm ' +
               'ARM64 sang x86-64 rồi thực hiện lời gọi hệ thống <b>thật</b> lên nhân WSL. Cái ' +
               'socket nghe cổng 9006 là socket của nhân Linux thật, không phải mô phỏng. Đó là ' +
               'lý do <code>ss -tlnp</code> nhìn thấy nó và <code>nc</code> kết nối được.</p>' +
               '<p>Và cũng vì vậy, thứ vừa được kiểm chứng chỉ là <b>mã ARM64 của bạn đúng</b>. ' +
               'Nó chưa nói gì về nhân của target, về driver, về thời gian khởi động. Muốn kiểm ' +
               'những thứ đó thì phải sang <code>qemu-system-aarch64</code> ở Chặng 05.</p>' },

          { t: 'p', x:
            'Muốn nhìn ranh giới giữa mã được mô phỏng và nhân thật, bật <code>-strace</code>. ' +
            'Mỗi dòng là một lời gọi hệ thống ARM64 vừa được chuyển sang nhân WSL:' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 -strace ./temp_daemon_arm64 2>&1 | head -6' },

          { t: 'code', where: 'out', nocopy: true, code:
            '422 uname(0x7b9c3397d408) = 0\n' +
            '422 brk(NULL) = 0x00000000004a7000\n' +
            '422 brk(0x00000000004a7ae0) = 0x00000000004a7ae0\n' +
            '422 set_tid_address(0x4a7448) = 422\n' +
            '422 set_robust_list(0x4a7100,24) = -1 errno=38 (Function not implemented)\n' +
            '422 rseq(0x4a77a0,32,0,0xd428bc00) = -1 errno=38 (Function not implemented)' },

          { t: 'cal', kind: 'tip', title: '<code>errno=38</code> ở đây không phải lỗi',
            x: '<p><code>ENOSYS</code> — "function not implemented" — là QEMU nói "tôi không mô ' +
               'phỏng lời gọi này". <code>set_robust_list</code> và <code>rseq</code> là các tối ' +
               'ưu của glibc; khi chúng thất bại, glibc lặng lẽ dùng đường chậm hơn và chương ' +
               'trình vẫn đúng.</p>' +
               '<p>Nhớ điều này: dưới <code>qemu-user</code>, một số lời gọi hệ thống ' +
               '<b>không tồn tại</b>. Nếu chương trình của bạn phụ thuộc vào một syscall hiếm, nó ' +
               'sẽ chạy trên board thật nhưng hỏng dưới <code>qemu-user</code> — chứ không phải ' +
               'ngược lại. <code>-strace</code> là công cụ để tìm ra ngay chỗ đó.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Đo bốn con số kích thước và dùng đúng <code>strip</code>',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -Wl,-z,max-page-size=4096 \\\n' +
            '    -o temp_daemon_arm64_4k temp_daemon.c\n' +
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -static \\\n' +
            '    -o temp_daemon_arm64_static temp_daemon.c\n' +
            'stat -c \'%s %n\' temp_daemon_x86 temp_daemon_arm64 temp_daemon_arm64_4k temp_daemon_arm64_static' },

          { t: 'code', where: 'out', nocopy: true, code:
            '17512 temp_daemon_x86\n' +
            '72072 temp_daemon_arm64\n' +
            '18824 temp_daemon_arm64_4k\n' +
            '795224 temp_daemon_arm64_static' },

          { t: 'code', where: 'wsl', code:
            'size temp_daemon_x86 temp_daemon_arm64 temp_daemon_arm64_4k temp_daemon_arm64_static' },

          { t: 'code', where: 'out', nocopy: true, code:
            '   text	   data	    bss	    dec	    hex	filename\n' +
            '   6694	    844	     88	   7626	   1dca	temp_daemon_x86\n' +
            '   6992	    916	     72	   7980	   1f2c	temp_daemon_arm64\n' +
            '   6992	    916	     72	   7980	   1f2c	temp_daemon_arm64_4k\n' +
            ' 626361	  24440	  22680	 673481	  a46c9	temp_daemon_arm64_static' },

          { t: 'cal', kind: 'why', title: 'Hai dòng giữa giống hệt nhau — đó là toàn bộ lập luận',
            x: '<p><code>temp_daemon_arm64</code> và <code>temp_daemon_arm64_4k</code> có ' +
               '<b>cùng</b> 6 992 byte <code>text</code>, cùng 916 byte <code>data</code>, cùng ' +
               '72 byte <code>bss</code>. Không một lệnh, không một hằng số nào bị bỏ đi. Nhưng ' +
               'file chênh nhau <b>53 248</b> byte. Toàn bộ chênh lệch là số 0 đệm để căn lề ' +
               'segment theo trang 64 KB.</p>' +
               '<p>So sánh với dòng cuối: bản tĩnh có <code>text</code> gấp <b>89,6 lần</b> ' +
               '(626 361 so với 6 992). Ở đó thì phình lên là <i>thật</i> — toàn bộ phần glibc ' +
               'mà chương trình dùng đã được chép vào file. Cùng là "file to hơn", hai nguyên ' +
               'nhân hoàn toàn khác nhau, và <code>size</code> phân biệt được ngay.</p>' },

          { t: 'p', x: 'Giờ thử <code>strip</code> — trước bằng công cụ sai, sau bằng công cụ đúng:' },

          { t: 'code', where: 'wsl', code:
            'cp temp_daemon_arm64_4k s1\n' +
            'strip s1\n' +
            'echo "exit code = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'strip: Unable to recognise the architecture of the input file `s1\'\n' +
            'exit code = 1' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-strip s1\n' +
            'cp temp_daemon_arm64_static s2 && aarch64-linux-gnu-strip s2\n' +
            'stat -c \'%s %n\' temp_daemon_arm64_4k s1 temp_daemon_arm64_static s2' },

          { t: 'code', where: 'out', nocopy: true, code:
            '18824 temp_daemon_arm64_4k\n' +
            '14368 s1\n' +
            '795224 temp_daemon_arm64_static\n' +
            '663480 s2' },

          { t: 'cal', kind: 'info', title: 'Từ 795 224 xuống 14 368 byte — hệ số 55,3',
            x: '<p>Đó là khoảng cách giữa "dịch cho xong" và "dịch cho một thiết bị có 8 MB ' +
               'flash": liên kết động, ép cỡ trang 4 KB, gỡ ký hiệu. Ba tuỳ chọn, không đổi một ' +
               'dòng mã.</p>' +
               '<p>Nhưng đừng vội kết luận bản động luôn thắng. Bản động cần ' +
               '<code>libc.so.6</code> (<b>1 781 952</b> byte) nằm sẵn trên rootfs của target. ' +
               'Bài 17 đã tính điểm hoà vốn: chỉ khi rootfs có từ khoảng <b>3</b> chương trình ' +
               'trở lên thì liên kết động mới thật sự tiết kiệm. Với một thiết bị chạy đúng một ' +
               'daemon, bản tĩnh đã gỡ ký hiệu có khi lại nhỏ hơn tổng cộng.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Viết <code>Makefile</code> đổi kiến trúc bằng một biến',
        blocks: [
          { t: 'p', x:
            'Chép nội dung <code>Makefile</code> ở mục trên vào <code>~/embedded/bai27/Makefile</code>, ' +
            'rồi chạy hai lần:' },

          { t: 'code', where: 'wsl', code:
            'make clean\n' +
            'make\n' +
            'make CROSS_COMPILE=aarch64-linux-gnu-' },

          { t: 'code', where: 'out', nocopy: true, code:
            'mkdir -p build/native\n' +
            'gcc -Wall -Wextra -O2 -pthread -Wl,-z,max-page-size=4096 -o build/native/temp_daemon temp_daemon.c\n' +
            'strip build/native/temp_daemon\n' +
            'build/native/temp_daemon: ELF 64-bit LSB pie executable, x86-64\n' +
            'mkdir -p build/aarch64-linux-gnu\n' +
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -Wl,-z,max-page-size=4096 -o build/aarch64-linux-gnu/temp_daemon temp_daemon.c\n' +
            'aarch64-linux-gnu-strip build/aarch64-linux-gnu/temp_daemon\n' +
            'build/aarch64-linux-gnu/temp_daemon: ELF 64-bit LSB pie executable, ARM aarch64' },

          { t: 'code', where: 'wsl', code:
            'stat -c \'%s %n\' build/native/temp_daemon build/aarch64-linux-gnu/temp_daemon\n' +
            'QEMU_LD_PREFIX=/usr/aarch64-linux-gnu build/aarch64-linux-gnu/temp_daemon &\n' +
            'DP=$!; sleep 1; echo GET | nc -q1 127.0.0.1 9006\n' +
            'kill -TERM $DP; wait $DP; echo "exit code = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '14472 build/native/temp_daemon\n' +
            '14368 build/aarch64-linux-gnu/temp_daemon\n' +
            '[daemon] pid 437 - listening on port 9006, epoll fd 5, signalfd 3\n' +
            '[daemon] served request #1 on fd 6\n' +
            'temperature=40.4 samples=5\n' +
            '[daemon] signal 15 (Terminated) via signalfd - beginning graceful shutdown\n' +
            '[daemon] served 1 requests, closed every file descriptor cleanly, exiting 0\n' +
            'exit code = 0' },

          { t: 'cal', kind: 'info', title: 'Sau khi gỡ ký hiệu, bản ARM64 <i>nhỏ hơn</i> bản x86',
            x: '<p><b>14 368</b> so với <b>14 472</b> byte — chênh 104 byte, ARM64 nhẹ hơn. Con ' +
               'số này đảo ngược ấn tượng "ARM64 to gấp 4 lần" ở đầu bài, và cả hai đều đúng: ' +
               '<b>72 072</b> byte lúc nãy gần như toàn phần đệm và ký hiệu gỡ lỗi, còn phần nội ' +
               'dung thật thì hai kiến trúc xấp xỉ nhau.</p>' +
               '<p>Bài học cho công việc: đừng bao giờ so kích thước hai bản build khác cấu hình ' +
               'liên kết. So bản đã <code>strip</code> với bản đã <code>strip</code>, cùng cỡ ' +
               'trang, cùng mức tối ưu — nếu không, bạn đang đo tuỳ chọn của trình liên kết chứ ' +
               'không đo chương trình.</p>' }
        ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Dựng staging sysroot cho một thư viện ngoài',
        blocks: [
          { t: 'p', x:
            'Tạo <code>crc_demo.c</code> như ở mục trên, rồi thử dịch cả hai bản để thấy chỗ gãy:' },

          { t: 'code', where: 'wsl', code:
            'gcc                   -O2 -o crc_demo_x86   crc_demo.c -lz && ./crc_demo_x86\n' +
            'aarch64-linux-gnu-gcc -O2 -o crc_demo_arm64 crc_demo.c -lz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'zlib 1.3.1, crc32 = 181eeda1\n' +
            '/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lz: No such file or directory\n' +
            'collect2: error: ld returned 1 exit status' },

          { t: 'p', x: 'Cross-compile zlib vào staging sysroot:' },

          { t: 'code', where: 'wsl', code:
            'STAGING=~/embedded/bai27/staging\n' +
            'mkdir -p "$STAGING" && cd ~/embedded/bai27\n' +
            'curl -LO https://zlib.net/fossils/zlib-1.3.1.tar.gz\n' +
            'sha256sum zlib-1.3.1.tar.gz\n' +
            'tar xf zlib-1.3.1.tar.gz && cd zlib-1.3.1\n' +
            'CC=aarch64-linux-gnu-gcc ./configure --prefix="$STAGING" --static\n' +
            'make -j6 && make install' },

          { t: 'code', where: 'out', nocopy: true, code:
            '9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23  zlib-1.3.1.tar.gz\n' +
            'Building static library libz.a version 1.3.1 with aarch64-linux-gnu-gcc.\n' +
            'Checking for size_t... Yes.\n' +
            'Checking for off64_t... Yes.\n' +
            'Checking for fseeko... Yes.\n' +
            'Checking for strerror... Yes.\n' +
            'Checking for unistd.h... Yes.\n' +
            'Checking for stdarg.h... Yes.' },

          { t: 'cal', kind: 'tip', title: 'Dòng đầu tiên của <code>configure</code> là bản kiểm tra tốt nhất',
            x: '<p><code>… with aarch64-linux-gnu-gcc</code>. Nếu dòng đó ghi ' +
               '<code>with gcc</code> thì biến <code>CC</code> chưa tới nơi và bạn sắp dựng một ' +
               'thư viện x86-64 mang tên đúng, đặt đúng chỗ, và <b>không dùng được</b> — lỗi sẽ ' +
               'chỉ lộ ra ở bước liên kết cuối cùng với thông báo khó hiểu. Luôn đọc dòng này ' +
               'trước khi gõ <code>make</code>.</p>' },

          { t: 'code', where: 'wsl', code:
            'find "$STAGING" -type f | sort\n' +
            'aarch64-linux-gnu-ar t "$STAGING/lib/libz.a" | head -5' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/home/shinarus/embedded/bai27/staging/include/zconf.h\n' +
            '/home/shinarus/embedded/bai27/staging/include/zlib.h\n' +
            '/home/shinarus/embedded/bai27/staging/lib/libz.a\n' +
            '/home/shinarus/embedded/bai27/staging/lib/pkgconfig/zlib.pc\n' +
            '/home/shinarus/embedded/bai27/staging/share/man/man3/zlib.3\n' +
            'adler32.o\n' +
            'crc32.o\n' +
            'deflate.o\n' +
            'infback.o\n' +
            'inffast.o' },

          { t: 'p', x:
            'Cây thư mục ấy là một sysroot thu nhỏ: <code>include/</code> cho trình biên dịch, ' +
            '<code>lib/</code> cho trình liên kết. Giờ dịch lại và chạy cả hai bản:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/embedded/bai27\n' +
            'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 \\\n' +
            '    -I"$STAGING/include" -o crc_demo_arm64 crc_demo.c \\\n' +
            '    -L"$STAGING/lib" -lz\n' +
            './crc_demo_x86\n' +
            'qemu-aarch64 -L /usr/aarch64-linux-gnu ./crc_demo_arm64' },

          { t: 'code', where: 'out', nocopy: true, code:
            'zlib 1.3.1, crc32 = 181eeda1\n' +
            'zlib 1.3.1, crc32 = 181eeda1' },

          { t: 'cal', kind: 'why', title: 'Hai dòng giống hệt nhau — vì sao đó là kết quả quan trọng?',
            x: '<p>Cùng một chuỗi <code>"embedded linux"</code>, cùng một thuật toán CRC-32, hai ' +
               'kiến trúc CPU khác nhau, cho ra <b>đúng</b> <code>181eeda1</code>. Điều đó xác ' +
               'nhận thư viện được cross-compile hoạt động đúng ở mức bit, chứ không chỉ "dịch ' +
               'xong không lỗi".</p>' +
               '<p>Đây là mẫu kiểm thử bạn nên nhớ: chọn một phép tính có kết quả xác định ' +
               '(checksum, hash, số nguyên tố thứ N) rồi so hai bản. Nó bắt được cả lỗi thứ tự ' +
               'byte lẫn lỗi độ rộng kiểu — hai họ lỗi mà Bài 25 và Bài 26 đã cảnh báo và trình ' +
               'biên dịch không nói gì.</p>' }
        ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Đo cái giá thật của mô phỏng',
        blocks: [
          { t: 'p', x:
            'Câu "mô phỏng thì chậm" nghe thì hợp lý nhưng vô dụng cho tới khi có con số. Đo bằng ' +
            'một vòng lặp thuần tính toán, không đụng vào đĩa hay mạng:' },

          { t: 'code', where: 'file', name: 'primes.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    unsigned long count = 0;\n' +
            '    for (unsigned long n = 2; n < 3000000; n++) {\n' +
            '        int prime = 1;\n' +
            '        for (unsigned long d = 2; d * d <= n; d++)\n' +
            '            if (n % d == 0) { prime = 0; break; }\n' +
            '        count += prime;\n' +
            '    }\n' +
            '    printf("primes below 3000000 = %lu\\n", count);\n' +
            '    return 0;\n' +
            '}\n' },

          { t: 'code', where: 'wsl', code:
            'gcc                   -O2         -o primes_x86   primes.c\n' +
            'aarch64-linux-gnu-gcc -O2 -static -o primes_arm64 primes.c\n' +
            'for i in 1 2 3; do { time ./primes_x86 >/dev/null ; } 2>&1 | grep real; done\n' +
            'for i in 1 2 3; do { time qemu-aarch64 ./primes_arm64 >/dev/null ; } 2>&1 | grep real; done\n' +
            './primes_x86\n' +
            'qemu-aarch64 ./primes_arm64' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real	0m0.737s\n' +
            'real	0m0.725s\n' +
            'real	0m0.730s\n' +
            'real	0m1.061s\n' +
            'real	0m1.067s\n' +
            'real	0m1.103s\n' +
            'primes below 3000000 = 216816\n' +
            'primes below 3000000 = 216816' },

          { t: 'table',
            head: ['Cách chạy', 'Thời gian (trung vị)', 'Tỉ lệ'],
            rows: [
              ['Nhị phân x86-64 native', '<b>0,730 s</b>', '1,00×'],
              ['Nhị phân ARM64 dưới <code>qemu-aarch64</code>', '<b>1,067 s</b>', '<b>1,46×</b>']
            ]},

          { t: 'cal', kind: 'info', title: 'Chỉ chậm 1,46 lần — thấp hơn nhiều so với người ta hay tưởng',
            x: '<p>Lý do nằm ở cách TCG làm việc: nó <b>dịch</b> từng khối lệnh ARM64 sang lệnh ' +
               'x86-64 <i>một lần</i> rồi lưu vào bộ đệm, các vòng lặp sau chạy thẳng mã đã dịch. ' +
               'Với một vòng lặp chặt như phép thử nguyên tố, gần như toàn bộ thời gian là chạy ' +
               'mã đã dịch, không phải dịch lại. Bài 29 sẽ mổ đúng cơ chế này.</p>' +
               '<p>Đừng suy ra con số này cho <code>qemu-system</code>. Ở đó QEMU còn phải mô ' +
               'phỏng cả MMU, ngắt, timer và thiết bị, và tỉ lệ tệ hơn hẳn — bạn sẽ tự đo ở ' +
               'Chặng 05. Con số <b>1,46×</b> chỉ đúng cho <code>qemu-user</code>, với mã thuần ' +
               'tính toán.</p>' },

          { t: 'cal', kind: 'warn', title: 'Con số này <b>không</b> nói gì về tốc độ của board thật',
            x: '<p>Bạn vừa đo "CPU x86 của tôi giả làm ARM64 nhanh cỡ nào", không phải "ARM64 ' +
               'nhanh cỡ nào". Một CPU Cortex-A53 1,2 GHz trên board nhúng sẽ chậm hơn kết quả ' +
               'này rất nhiều. Mọi đo đạc hiệu năng thật đều phải làm trên phần cứng đích — ' +
               'QEMU dùng để kiểm tra <b>tính đúng</b>, không dùng để kiểm tra <b>tốc độ</b>.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều xuất hiện thật khi kiểm chứng bài này trên máy bạn.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: ./prog: cannot execute binary file: Exec format error</code>',
         'Nhân không có trình nạp cho kiến trúc này. Chưa cài <code>qemu-user</code>',
         '<code>sudo apt update &amp;&amp; sudo apt install qemu-user</code>, hoặc gọi tường minh <code>qemu-aarch64 ./prog</code>'],
        ['<code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\'</code>',
         'Nhị phân liên kết động cần trình thông dịch của target; máy build cất nó ở <code>/usr/aarch64-linux-gnu/lib/</code>',
         'Thêm <code>-L /usr/aarch64-linux-gnu</code>, hoặc <code>export QEMU_LD_PREFIX=/usr/aarch64-linux-gnu</code>, hoặc dịch với <code>-static</code>'],
        ['<code>404 Not Found</code> khi <code>apt install qemu-user</code>',
         'Danh sách gói trên máy cũ hơn kho: kho đã thay <code>…ubuntu3.1</code> bằng <code>…ubuntu3.2</code>',
         'Chạy <code>sudo apt update</code> trước rồi cài lại'],
        ['<code>ld.bfd: obj.o: Relocations in generic ELF (EM: 183)</code><br><code>file in wrong format</code>',
         'Liên kết file <code>.o</code> ARM64 bằng trình liên kết native. Thường do quên tiền tố ở biến <code>CC</code>',
         'Dùng <code>aarch64-linux-gnu-gcc</code> cho cả bước liên kết. <b>183</b> = mã kiến trúc AArch64'],
        ['<code>strip: Unable to recognise the architecture of the input file</code>',
         'Gọi <code>strip</code> native trên file ARM64 — hay lọt vào qua biến <code>STRIP</code> trong <code>Makefile</code>',
         'Khai <code>STRIP = $(CROSS_COMPILE)strip</code>, đừng để công cụ nào nằm ngoài quy ước'],
        ['<code>ld.bfd: cannot find -lz</code> (bản x86 vẫn dịch được)',
         'Sysroot của target chỉ có <b>49</b> thư viện, không có zlib. Máy build có <b>858</b> nhưng toàn x86-64',
         'Cross-compile thư viện đó vào staging sysroot rồi thêm <code>-I…/include -L…/lib</code>'],
        ['<code>qemu-aarch64: …: Invalid ELF image for this architecture</code>',
         'Chạy nhị phân ARM 32-bit bằng <code>qemu-aarch64</code>, hoặc ngược lại',
         'Đối chiếu <code>file</code> rồi dùng đúng chương trình: <code>qemu-arm</code> cho ARM 32-bit, <code>qemu-aarch64</code> cho ARM64'],
        ['<code>ldd prog_arm64</code> → <code>not a dynamic executable</code>',
         'Không phải lỗi của file. <code>ldd</code> chạy chương trình bằng trình liên kết động <b>native</b>, nên nó mù với nhị phân lạ kiến trúc',
         'Dùng <code>aarch64-linux-gnu-readelf -d prog | grep NEEDED</code> để xem thư viện phụ thuộc'],
        ['<code>configure</code> in <code>… with gcc</code> thay vì <code>… with aarch64-linux-gnu-gcc</code>',
         'Biến <code>CC</code> không tới được script, hoặc bị chính script ghi đè',
         'Đặt <code>CC=</code> ngay trước <code>./configure</code>; nếu vẫn không được thì thử <code>--host=aarch64-linux-gnu</code> (quy ước của Autotools)'],
        ['Đổi <code>CROSS_COMPILE</code> nhưng <code>make</code> báo <code>Nothing to be done</code>',
         'Hai kiến trúc dùng chung một file đích; <code>make</code> thấy nó mới hơn mã nguồn nên bỏ qua',
         'Cho mỗi kiến trúc một thư mục <code>build/</code> riêng, như <code>Makefile</code> trong bài; hoặc <code>make clean</code> trước'],
        ['<code>set_robust_list … errno=38 (Function not implemented)</code> trong <code>-strace</code>',
         'Không phải lỗi. <code>qemu-user</code> không mô phỏng vài syscall tối ưu của glibc; glibc tự lùi về đường chậm hơn',
         'Bỏ qua. Nhưng nếu <b>chương trình của bạn</b> phụ thuộc một syscall bị <code>ENOSYS</code> thì phải kiểm trên board thật hoặc <code>qemu-system</code>'],
        ['Daemon chạy được dưới <code>qemu-user</code> nhưng chết trên board',
         '<code>qemu-user</code> dùng nhân của máy build. Board có nhân khác, thiếu tuỳ chọn cấu hình, hoặc thiếu file trong rootfs',
         'Coi <code>qemu-user</code> là bước kiểm tính đúng của <i>mã lệnh</i>. Kiểm hệ thống thì dùng <code>qemu-system</code> ở Chặng 05']
      ]},

    /* ══════════════════════════════════════════════
       TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Cùng một <code>temp_daemon.c</code> — luồng, <code>signalfd</code>, <code>epoll</code>, socket — dịch được cho ARM64 <b>không sửa một dòng</b>, vì nó chỉ nói chuyện qua POSIX API chứ không nói thẳng với phần cứng.',
      'Bằng chứng nằm ở trường <code>e_machine</code>: <b>62</b> cho x86-64, <b>183</b> cho AArch64. Con số 183 xuất hiện lại trong lỗi <code>EM: 183</code> của <code>ld</code> và trong <code>magic</code> của luật <code>binfmt_misc</code>.',
      '<code>qemu-user</code> mô phỏng <b>một tiến trình</b>, syscall đi thẳng vào nhân WSL — nên daemon ARM64 mở được cổng 9006 thật và <code>nc</code> bản x86 nói chuyện được. <code>qemu-system</code> (Chặng 05) mô phỏng <b>cả một máy</b>.',
      '<code>binfmt_misc</code> dạy nhân nhận ra file lạ. Sau khi cài <code>qemu-user-binfmt</code>, thư mục có <b>31</b> luật <code>qemu-*</code> — cùng cơ chế mà WSL dùng để chạy <code>.exe</code>.',
      'Nhị phân động cần trình thông dịch của target. Ba lối ra: <code>-L</code>, <code>QEMU_LD_PREFIX</code>, hoặc <code>-static</code>.',
      'Bốn con số: x86 <b>17 512</b>, ARM64 <b>72 072</b>, ARM64 trang 4 KB <b>18 824</b>, ARM64 tĩnh <b>795 224</b> byte. Hai bản giữa có <code>text</code> giống hệt nhau — chênh <b>53 248</b> byte là số 0 đệm căn lề.',
      'Sau <code>aarch64-linux-gnu-strip</code>, bản ARM64 còn <b>14 368</b> byte — <i>nhỏ hơn</i> bản x86 (<b>14 472</b>). Chỉ so hai bản cùng cấu hình liên kết, nếu không bạn đang đo tuỳ chọn chứ không đo chương trình.',
      '<code>CROSS_COMPILE=</code> là quy ước của nhân Linux, U-Boot, BusyBox và Buildroot. Đặt <b>mọi</b> công cụ qua biến đó, không chỉ <code>CC</code>.',
      'Sysroot của target có <b>49</b> thư viện, máy build có <b>858</b>. Mọi thư viện ngoài phải được cross-compile vào một <b>staging sysroot</b> rồi trỏ tới bằng <code>-I</code> và <code>-L</code>.',
      'Kiểm chứng bằng một phép tính có kết quả xác định: CRC-32 của <code>"embedded linux"</code> ra <code>181eeda1</code> trên cả hai kiến trúc.',
      '<code>qemu-user</code> chậm hơn native <b>1,46 lần</b> với mã thuần tính toán — dùng để kiểm <b>tính đúng</b>, không dùng để đo <b>tốc độ</b> của board.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Cả bài này bạn dùng toolchain do <code>apt</code> cài. Nó tiện, nhưng nó áp cho bạn ' +
         'ba lựa chọn mà bạn không được bàn: GCC <b>15.2.0</b>, glibc <b>2.43</b>, và bộ header ' +
         'nhân của Ubuntu. Nếu board của bạn chạy nhân 5.10 và rootfs dùng <b>musl</b> thì toolchain ' +
         'này sai từ gốc.</p>' +
         '<p><b>Bài 28 — Tự build toolchain với crosstool-NG</b> gỡ nút đó: bạn chọn từng phiên ' +
         'bản của từng thành phần rồi để công cụ dựng ra toolchain của riêng mình. Phần thưởng ' +
         'đo được ngay trên chính <code>temp_daemon.c</code> của bài này — bản tĩnh dựng bằng ' +
         'glibc nặng <b>795 224</b> byte; bạn sẽ dựng một toolchain musl và dịch lại đúng chương ' +
         'trình đó để xem con số tụt xuống bao nhiêu.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    { q: 'Bạn dịch <code>temp_daemon.c</code> bằng <code>aarch64-linux-gnu-gcc</code> và không có cảnh báo nào. Kết luận nào <b>không</b> suy ra được từ đó?',
      opts: [
        'Mã nguồn không dùng cấu trúc nào phụ thuộc kiến trúc mà trình biên dịch phát hiện được',
        'File kết quả có <code>e_machine = 183</code>',
        'Chương trình sẽ chạy đúng trên board ARM64 thật',
        'Trình liên kết đã tìm thấy mọi ký hiệu chương trình cần'
      ], a: 2,
      why: 'Dịch sạch chỉ chứng minh mã <b>hợp lệ về cú pháp và ký hiệu</b> cho kiến trúc đích. Nó không nói gì về hành vi lúc chạy: giả định thứ tự byte, giả định độ rộng kiểu, phụ thuộc vào một syscall mà nhân của board không có — không lỗi nào trong số đó lộ ra lúc dịch. Đúng vì lẽ đó mà bước tiếp theo trong bài là <i>chạy thử</i> dưới <code>qemu-aarch64</code> và so một giá trị CRC xác định.' },

    { q: 'Sau khi cài <code>qemu-user</code>, gõ <code>./temp_daemon_arm64</code> thì lỗi đổi từ <code>Exec format error</code> sang <code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\'</code>. Sự thay đổi này chứng minh điều gì?',
      opts: [
        'Nhân đã học được cách thực thi lệnh ARM64 một cách tự nhiên',
        '<code>binfmt_misc</code> đã khớp magic của file và giao nó cho <code>qemu-aarch64</code>; QEMU chạy rồi, chỉ chưa tìm ra trình thông dịch động',
        'File nhị phân đã bị hỏng lúc cài gói',
        'Gói cài thiếu, cần cài thêm <code>qemu-system-aarch64</code>'
      ], a: 1,
      why: 'Ai in ra thông báo lỗi là manh mối quyết định. Lần đầu là <code>bash</code> báo <code>execve()</code> trả về <code>ENOEXEC</code>. Lần sau chính <code>qemu-aarch64</code> lên tiếng — nghĩa là nhân đã nạp QEMU và trao file cho nó, đúng như luật <code>binfmt_misc</code> quy định. CPU x86 vẫn không hiểu lệnh ARM64; QEMU dịch hộ. Thói quen đọc "ai là người báo lỗi" tiết kiệm rất nhiều thời gian khi gỡ lỗi build.' },

    { q: 'Hai bản ARM64 của cùng chương trình: bản A nặng <b>72 072</b> byte, bản B nặng <b>18 824</b> byte. <code>size</code> báo cả hai đều có <code>text</code> = <b>6 992</b>, <code>data</code> = <b>916</b>, <code>bss</code> = <b>72</b>. Điều gì đã xảy ra?',
      opts: [
        'Bản B đã được <code>strip</code> nên mất bảng ký hiệu',
        'Bản B liên kết động còn bản A liên kết tĩnh',
        'Bản B được liên kết với <code>-Wl,-z,max-page-size=4096</code>; chênh lệch <b>53 248</b> byte là số 0 đệm để căn lề segment theo trang 64 KB',
        'Bản A được dịch không tối ưu nên sinh nhiều mã hơn'
      ], a: 2,
      why: 'Ba con số <code>text/data/bss</code> giống hệt nhau là bằng chứng quyết định: không một lệnh, một hằng số hay một biến nào bị thay đổi. Vậy chênh lệch phải nằm ngoài phần nội dung — và đó là phần đệm căn lề. Trình liên kết ARM64 mặc định căn theo <b>65 536</b> byte vì nhân ARM64 có thể dùng trang 4 KB, 16 KB hoặc 64 KB. Phương án A sai vì <code>strip</code> không đụng tới <code>text</code> nhưng cũng không đụng tới phần đệm; hơn nữa <code>size</code> vẫn báo y hệt sau khi <code>strip</code>.' },

    { q: 'Daemon ARM64 của bạn chạy dưới <code>qemu-aarch64</code>, mở cổng 9006, và <code>nc</code> bản x86 kết nối được ngay từ WSL. Vì sao không cần cấu hình mạng gì cả?',
      opts: [
        'QEMU dựng một cầu nối mạng ảo giữa máy ảo và máy chủ',
        'Vì <code>qemu-user</code> chỉ mô phỏng lệnh CPU; lời gọi <code>socket()</code>/<code>bind()</code> được chuyển thẳng cho nhân WSL nên socket đó là socket thật của máy bạn',
        'Vì cổng 9006 nằm trong dải cổng được QEMU chuyển tiếp mặc định',
        'Vì <code>nc</code> tự nhận ra tiến trình đích là ARM64 và chuyển sang giao thức khác'
      ], a: 1,
      why: 'Đây là khác biệt cốt lõi giữa hai kiểu QEMU. <code>qemu-user</code> không có nhân riêng, không có ngăn xếp mạng riêng, không có thiết bị ảo: nó chỉ dịch lệnh và chuyển đổi tham số syscall. Cái socket nghe cổng 9006 do <b>nhân WSL</b> tạo ra, nên <code>ss -tlnp</code> nhìn thấy và mọi chương trình trên máy đều kết nối được. Với <code>qemu-system-aarch64</code> ở Chặng 05 thì ngược lại — cổng nằm trong máy ảo và bạn phải khai báo chuyển tiếp.' },

    { q: 'Bạn thêm <code>-lssl</code> vào một dự án cross-compile. Bản x86 dịch được, bản ARM64 báo <code>cannot find -lssl</code>. Cách xử lý <b>đúng</b> là gì?',
      opts: [
        'Thêm <code>-L/usr/lib/x86_64-linux-gnu</code> để trình liên kết tìm thấy thư viện',
        'Cross-compile OpenSSL cho ARM64, cài vào một staging sysroot, rồi trỏ tới bằng <code>-I</code> và <code>-L</code>',
        'Chép <code>libssl.so</code> của máy build vào <code>/usr/aarch64-linux-gnu/lib/</code>',
        'Bỏ <code>-lssl</code> và dịch tĩnh bằng <code>-static</code>'
      ], a: 1,
      why: 'Phương án A và C là cùng một sai lầm ở hai dạng: ép trình liên kết dùng thư viện <b>x86-64</b>. Nếu may thì nó từ chối ngay với <code>file in wrong format</code>; nếu không may bạn dựng ra thứ chỉ hỏng lúc chạy. Phương án D không cứu được gì vì <code>-static</code> vẫn cần <code>libssl.a</code> cho ARM64. Cách duy nhất đúng là dựng thư viện cho đúng kiến trúc — và vì việc này lặp lại với mọi phụ thuộc, mọi phụ thuộc của phụ thuộc, nên mới sinh ra Buildroot và Yocto ở Chặng 11.' },

    { q: 'Trong <code>Makefile</code>, bạn khai <code>CC = $(CROSS_COMPILE)gcc</code> nhưng để nguyên <code>STRIP = strip</code>. Chuyện gì xảy ra khi chạy <code>make CROSS_COMPILE=aarch64-linux-gnu-</code>?',
      opts: [
        'Không sao, <code>strip</code> tự nhận ra kiến trúc của file',
        'Bước dịch và liên kết thành công, bước <code>strip</code> báo <code>Unable to recognise the architecture of the input file</code>',
        '<code>make</code> từ chối chạy ngay từ đầu vì biến không nhất quán',
        'File kết quả bị gỡ nhầm ký hiệu và chạy sai trên board'
      ], a: 1,
      why: 'Trình biên dịch và trình liên kết cross làm đúng việc của chúng, nên bạn có một nhị phân ARM64 hợp lệ. Chỉ tới bước cuối, <code>strip</code> bản native mới gặp một file nó không giải mã được và dừng lại. Đây là lý do quy ước <code>CROSS_COMPILE</code> yêu cầu <b>mọi</b> công cụ đi qua cùng một biến: <code>ld</code>, <code>ar</code>, <code>objcopy</code>, <code>objdump</code>, <code>strip</code>. Bỏ sót một cái là bản build gãy ở giữa chừng với thông báo nói về "architecture", khiến bạn đi tìm nhầm chỗ.' },

    { q: 'Đồng nghiệp báo: "Daemon chạy ngon dưới <code>qemu-aarch64</code> suốt tuần, nhưng nạp lên board thì chết ngay lúc khởi động." Giả thuyết nào <b>ít</b> hợp lý nhất?',
      opts: [
        'Rootfs của board thiếu <code>libc.so.6</code> hoặc dùng thư viện C khác phiên bản',
        'Chương trình dùng một syscall mà nhân của board không bật, còn nhân WSL thì có',
        'Nhị phân được liên kết với <code>max-page-size=4096</code> trong khi nhân board dùng trang 64 KB',
        'Mã ARM64 sinh ra sai vì <code>qemu-aarch64</code> dịch lệnh không chính xác'
      ], a: 3,
      why: 'Ba giả thuyết đầu đều là khác biệt <b>môi trường</b>, và <code>qemu-user</code> mù với cả ba: nó dùng nhân của máy build và hệ thống file của máy build, nên không kiểm được rootfs lẫn cấu hình nhân của board. Phương án cuối nhầm vai trò của QEMU — nó không sinh mã, nó chỉ <i>chạy</i> mã mà <code>aarch64-linux-gnu-gcc</code> đã sinh; nếu QEMU dịch sai thì chương trình sẽ hỏng <i>dưới QEMU</i> chứ không phải trên board. Đây chính là ranh giới mà Chặng 05 lấp: <code>qemu-system</code> khởi động nhân thật và rootfs thật.' }
  ]
});

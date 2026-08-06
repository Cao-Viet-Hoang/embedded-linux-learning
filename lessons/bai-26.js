/* Bài 26 — Giải phẫu một toolchain
   Chặng 04 — Cross-compilation */

Lesson.register({
  id: 'bai-26',
  title: 'Giải phẫu một toolchain',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    '<p>Ở Bài 25 bạn gõ <code>aarch64-linux-gnu-gcc</code> và nhận về một file chạy được trên ' +
    'ARM64. Cái tên đó là một hộp đen: bạn biết nó làm gì, chưa biết nó <i>là</i> gì. Bài này ' +
    'mở hộp.</p>' +
    '<p>Điều đầu tiên bạn phát hiện sẽ hơi bất ngờ: <code>gcc</code> <b>không biên dịch gì cả</b>. ' +
    'Nó là người điều phối, gọi lần lượt ba chương trình khác — và bạn sẽ in ra đúng tên, đúng ' +
    'đường dẫn của cả ba.</p>' +
    '<p>Sau đó bạn sẽ tách bộ công cụ thành bốn mảnh có thể đếm được: <b>34</b> chương trình ' +
    'binutils, một trình biên dịch <code>cc1</code> nặng <b>35,7 MB</b>, một thư viện C với ' +
    '<b>3 078</b> ký hiệu, và một sysroot chứa <b>142</b> thư mục header dành riêng cho ARM64. ' +
    'Bốn mảnh đó do bốn gói Debian khác nhau cung cấp — bạn sẽ tự tra ra.</p>' +
    '<p>Cuối cùng là chữ khó nhất trong cả chặng: <b>ABI</b>. Bạn sẽ thấy nó bằng mắt qua hai ' +
    'phép so sánh — cùng một hàm cộng hai số thực, bản <code>gnueabihf</code> dùng <b>2</b> lệnh ' +
    'còn bản soft-float dùng <b>6</b>; và cùng một <code>hello.c</code>, file ARM64 nặng ' +
    '<b>70 448</b> byte tụt xuống <b>9 008</b> byte chỉ nhờ một tuỳ chọn liên kết. Cả hai đều là ' +
    'ABI, không phải kiến trúc.</p>',

  goals: [
    'Chỉ ra được ba chương trình mà <code>gcc</code> thật sự gọi, và giải thích vì sao bản thân <code>gcc</code> chỉ là trình điều phối',
    'Kể tên bốn thành phần của một toolchain và tra được gói Debian nào cung cấp mỗi thành phần',
    'Giải thích được vì sao mọi công cụ binutils đều phải có tiền tố kiến trúc, bằng một lỗi bạn tự gây ra',
    'Phân biệt <code>libgcc</code> với thư viện C, và chỉ ra một hàm chỉ <code>libgcc</code> mới có',
    'Đọc được bộ ba <code>aarch64-linux-gnu</code> theo từng phần, và giải thích <code>gnueabihf</code> khác <code>gnueabi</code> ở đâu',
    'Định nghĩa được sysroot và chỉ ra nó nằm ở đâu trên máy mình',
    'Chứng minh bằng số rằng ABI — chứ không phải kiến trúc — quyết định kích thước file thực thi'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. GCC KHÔNG BIÊN DỊCH GÌ CẢ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '<code>gcc</code> không biên dịch gì cả' },

    { t: 'p', x:
      'Ở Bài 15 bạn đã tách bốn giai đoạn biên dịch bằng các cờ <code>-E</code>, <code>-S</code>, ' +
      '<code>-c</code>. Lúc đó cách kể là "gcc làm bốn việc". Đó là cách kể thuận tiện cho người ' +
      'mới, và giờ đã tới lúc kể chính xác: <code>gcc</code> <b>không làm</b> việc nào trong bốn ' +
      'việc đó. Nó chỉ quyết định gọi ai, theo thứ tự nào, với tham số gì.' },

    { t: 'p', x:
      'Cờ <code>-###</code> bắt <code>gcc</code> khai ra toàn bộ kế hoạch mà không chạy một bước ' +
      'nào. Đây là công cụ chẩn đoán mạnh nhất khi một bản build cư xử lạ.' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc -### hello.c -o hello 2>&1 |\n' +
      '  sed \'s/"//g\' | grep -E \'^ /usr\' | sed -E \'s/^ ([^ ]+).*/\\1/\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '/usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1\n' +
      '/usr/lib/gcc-cross/aarch64-linux-gnu/15/../../../../aarch64-linux-gnu/bin/as\n' +
      '/usr/libexec/gcc-cross/aarch64-linux-gnu/15/collect2' },

    { t: 'p', x:
      'Ba chương trình. Không có cái nào tên là <code>gcc</code>.' },

    { t: 'table',
      head: ['Chương trình', 'Việc nó làm', 'Thuộc về', 'Giai đoạn ở Bài 15'],
      rows: [
        ['<code>cc1</code>', 'Tiền xử lý + biên dịch C thành assembly. Đây <b>là</b> trình biên dịch C', 'GCC', 'Giai đoạn 1 và 2'],
        ['<code>as</code>', 'Hợp dịch: assembly thành mã máy trong file <code>.o</code>', '<b>Binutils</b>', 'Giai đoạn 3'],
        ['<code>collect2</code>', 'Lớp vỏ mỏng, rồi gọi tiếp <code>ld</code> để liên kết', 'GCC gọi Binutils', 'Giai đoạn 4'],
        ['<code>gcc</code>', 'Không làm gì trong bốn giai đoạn. Chọn công cụ, dựng dòng lệnh, truyền cờ, dọn file tạm', 'GCC', '—']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao lại tách ra như vậy thay vì gộp thành một chương trình?',
      x: '<p>Ba lý do, và cả ba đều có hệ quả trực tiếp lên công việc của bạn:</p>' +
         '<ul>' +
         '<li><b>Một trình hợp dịch, nhiều trình biên dịch.</b> C, C++, Fortran, Go, Ada đều sinh ' +
         'ra assembly rồi giao cho cùng một <code>as</code>. Nếu gộp, mỗi ngôn ngữ phải tự viết ' +
         'lại phần sinh mã máy.</li>' +
         '<li><b>Binutils và GCC là hai dự án khác nhau, do hai nhóm khác nhau phát hành.</b> ' +
         'Bạn thấy ngay ở phiên bản: GCC <b>15.2.0</b> nhưng binutils <b>2.46</b>. Nâng cấp một ' +
         'bên không bắt bên kia phải đi theo.</li>' +
         '<li><b>Bạn thay thế được từng mảnh.</b> Ở các dự án nhúng thật, người ta hay thay ' +
         '<code>ld</code> bằng <code>lld</code> hoặc <code>mold</code> để liên kết nhanh hơn, mà ' +
         'vẫn giữ nguyên GCC. Chỉ tách rời mới làm được chuyện đó.</li>' +
         '</ul>' },

    { t: 'fig', cap:
      '<code>gcc</code> là người điều phối, không phải thợ. Ba chương trình làm việc thật đến từ ' +
      'hai dự án khác nhau, có số hiệu phiên bản riêng.',
      svg:
      '<svg viewBox="0 0 720 306" width="720" role="img" aria-label="Sơ đồ gcc điều phối ba chương trình cc1, as và collect2/ld">' +
      '<rect class="d-box-p" x="240" y="12" width="240" height="34" rx="6"/>' +
      '<text class="d-tm" x="360" y="34" text-anchor="middle">aarch64-linux-gnu-gcc</text>' +
      '<text class="d-ts" x="360" y="60" text-anchor="middle">trình điều phối — không dịch một dòng nào</text>' +

      '<line class="d-line" x1="300" y1="68" x2="130" y2="94"/>' +
      '<path class="d-arrow" d="M130 94 L141 91 L138 101 Z"/>' +
      '<line class="d-line" x1="360" y1="68" x2="360" y2="94"/>' +
      '<path class="d-arrow" d="M360 96 L355 85 L365 85 Z"/>' +
      '<line class="d-line" x1="420" y1="68" x2="590" y2="94"/>' +
      '<path class="d-arrow" d="M590 94 L579 91 L582 101 Z"/>' +

      '<rect class="d-box-a" x="20" y="98" width="220" height="76" rx="6"/>' +
      '<text class="d-tm" x="130" y="120" text-anchor="middle">cc1</text>' +
      '<text class="d-ts" x="130" y="140" text-anchor="middle">.c → .s</text>' +
      '<text class="d-ts" x="130" y="158" text-anchor="middle">gói GCC · 35,7 MB</text>' +

      '<rect class="d-box-g" x="250" y="98" width="220" height="76" rx="6"/>' +
      '<text class="d-tm" x="360" y="120" text-anchor="middle">as</text>' +
      '<text class="d-ts" x="360" y="140" text-anchor="middle">.s → .o</text>' +
      '<text class="d-ts" x="360" y="158" text-anchor="middle">gói Binutils 2.46</text>' +

      '<rect class="d-box-g" x="480" y="98" width="220" height="76" rx="6"/>' +
      '<text class="d-tm" x="590" y="120" text-anchor="middle">collect2 → ld</text>' +
      '<text class="d-ts" x="590" y="140" text-anchor="middle">.o + thư viện → ELF</text>' +
      '<text class="d-ts" x="590" y="158" text-anchor="middle">gói Binutils 2.46</text>' +

      '<rect class="d-box" x="20" y="196" width="680" height="44" rx="6"/>' +
      '<text class="d-ts" x="360" y="216" text-anchor="middle">ld còn cần thêm: Scrt1.o · crti.o · crtbeginS.o · crtendS.o · crtn.o</text>' +
      '<text class="d-ts" x="360" y="232" text-anchor="middle">và các thư viện: -lc (thư viện C) · -lgcc (thư viện hỗ trợ của trình biên dịch)</text>' +

      '<rect class="d-box-w" x="200" y="258" width="320" height="34" rx="6"/>' +
      '<text class="d-tm" x="360" y="280" text-anchor="middle">hello — ELF aarch64</text>' +
      '<line class="d-line" x1="360" y1="242" x2="360" y2="256"/>' +
      '<path class="d-arrow" d="M360 258 L355 247 L365 247 Z"/>' +
      '</svg>' },

    { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -### hello.c -o hello',
      title: 'Cờ chẩn đoán quan trọng nhất bạn chưa biết',
      rows: [
        ['-###', 'In <b>toàn bộ</b> dòng lệnh mà driver định chạy, rồi <b>dừng lại</b> — không chạy gì cả',
         'Có một cờ họ hàng là <code>-v</code>: nó vừa in vừa chạy thật. Dùng <code>-###</code> khi bạn chỉ muốn xem kế hoạch'],
        ['2&gt;&amp;1', 'Driver in kế hoạch ra luồng lỗi chuẩn, phải gộp về luồng ra chuẩn mới lọc được',
         'Cùng cái bẫy bạn gặp ở Bài 25 với <code>gcc -v</code>'],
        ['sed \'s/"//g\'', 'Bỏ dấu nháy kép mà driver bọc quanh mỗi tham số cho dễ đọc',
         'Driver bọc nháy để chỉ rõ ranh giới tham số — đúng nhưng rối mắt khi đọc nhanh'],
        ['grep -E \'^ /usr\'', 'Mỗi dòng lệnh thật bắt đầu bằng một khoảng trắng rồi tới đường dẫn tuyệt đối',
         'Các dòng còn lại là biến môi trường (<code>COLLECT_GCC_OPTIONS=…</code>) — không phải chương trình được gọi']
      ]},

    { t: 'cal', kind: 'info', title: 'Năm file <code>crt*.o</code> trong sơ đồ là gì?',
      x: '<p><code>crt</code> viết tắt của <b>C RunTime</b>. Đây là mã khởi động do toolchain thêm ' +
         'vào <i>ngoài</i> mã của bạn, và bạn xem được danh sách bằng cùng lệnh <code>-###</code> ' +
         'ở trên:</p>' +
         '<ul>' +
         '<li><code>Scrt1.o</code> — chứa <code>_start</code>, điểm vào thật của chương trình. ' +
         'Nó gọi <code>main()</code> giúp bạn. Chữ <code>S</code> nghĩa là bản dành cho mã ' +
         'khả tái định vị (PIE), mặc định của Ubuntu.</li>' +
         '<li><code>crti.o</code> và <code>crtn.o</code> — mở và đóng hai section ' +
         '<code>.init</code>/<code>.fini</code>. Cặp này kẹp lấy mọi thứ ở giữa.</li>' +
         '<li><code>crtbeginS.o</code> và <code>crtendS.o</code> — của GCC, lo phần khởi tạo ' +
         'trước <code>main</code> (biến toàn cục của C++, hàm gắn <code>__attribute__' +
         '((constructor))</code>).</li>' +
         '</ul>' +
         '<p>Đây chính là lời giải cho câu hỏi ở Bài 18: vì sao một chương trình in một dòng chữ ' +
         'lại có tới mấy chục ký hiệu. Phần lớn không phải của bạn.</p>' },

    /* ══════════════════════════════════════════════
       2. BỐN THÀNH PHẦN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn thành phần của một toolchain' },

    { t: 'p', x:
      'Từ "toolchain" nghe như một thứ duy nhất, nhưng nó là <b>bộ</b> gồm bốn phần rời, phải ' +
      'khớp phiên bản với nhau. Trên Debian và Ubuntu, bốn phần đó là bốn gói khác nhau — bạn tra ' +
      'được bằng <code>dpkg -S</code>.' },

    { t: 'code', where: 'wsl', code:
      'dpkg -S /usr/bin/aarch64-linux-gnu-as\n' +
      'dpkg -S /usr/bin/aarch64-linux-gnu-gcc-15\n' +
      'dpkg -S /usr/aarch64-linux-gnu/lib/libc.so.6\n' +
      'dpkg -S /usr/aarch64-linux-gnu/include/stdio.h' },

    { t: 'code', where: 'out', nocopy: true, code:
      'binutils-aarch64-linux-gnu: /usr/bin/aarch64-linux-gnu-as\n' +
      'gcc-15-aarch64-linux-gnu: /usr/bin/aarch64-linux-gnu-gcc-15\n' +
      'libc6-arm64-cross: /usr/aarch64-linux-gnu/lib/libc.so.6\n' +
      'libc6-dev-arm64-cross: /usr/aarch64-linux-gnu/include/stdio.h' },

    { t: 'table',
      head: ['Thành phần', 'Vai trò', 'Gói trên máy này', 'Số đo được'],
      rows: [
        ['<b>Binutils</b>', 'Hợp dịch, liên kết, và mọi công cụ đọc/sửa file ELF', '<code>binutils-aarch64-linux-gnu</code>', '<b>34</b> chương trình trong <code>/usr/bin</code>, phiên bản <b>2.46</b>'],
        ['<b>Trình biên dịch</b>', 'Ngôn ngữ nguồn thành assembly, cộng <code>libgcc</code>', '<code>gcc-15-aarch64-linux-gnu</code>', '<code>cc1</code> nặng <b>35,7 MB</b>; <code>libgcc.a</code> <b>3 210 472</b> byte, <b>398</b> file thành viên'],
        ['<b>Thư viện C lúc chạy</b>', 'Bản <code>.so</code> nằm trên board, cùng bộ nạp động', '<code>libc6-arm64-cross</code>', '<code>libc.so.6</code> <b>1 781 952</b> byte, <b>3 078</b> ký hiệu'],
        ['<b>Header + thư viện lúc build</b>', 'Header C và các <code>.a</code>/<code>.so</code> để liên kết. Đây là phần "sysroot"', '<code>libc6-dev-arm64-cross</code>', '<b>142</b> mục trong <code>include/</code>, <b>72</b> file trong <code>lib/</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao thư viện C bị tách làm hai gói?',
      x: '<p>Vì hai phần ấy đi tới hai nơi khác nhau.</p>' +
         '<p><code>libc6-arm64-cross</code> chứa <code>libc.so.6</code> — thứ phải nằm trên ' +
         '<b>board</b>, trong rootfs, để chương trình chạy được. Nếu bạn quên chép nó sang, ' +
         'chương trình sẽ chết ngay khi khởi động dù đã dịch thành công.</p>' +
         '<p><code>libc6-dev-arm64-cross</code> chứa header và các file liên kết — thứ chỉ cần ' +
         'trên <b>máy build</b>, không cần trên board. Rootfs của thiết bị xuất xưởng không bao ' +
         'giờ có <code>/usr/include/stdio.h</code>: nó nặng <b>13 MB</b> và hoàn toàn vô dụng khi ' +
         'chạy.</p>' +
         '<p>Đây là lý do mọi hệ thống build đều phân biệt "runtime" với "development", và bạn sẽ ' +
         'gặp lại đúng cặp khái niệm này ở <b>Chặng 09</b> khi tự cắt gọt rootfs, rồi ở ' +
         '<b>Chặng 11</b> khi Buildroot hỏi bạn có muốn giữ header trên target hay không.</p>' },

    { t: 'h3', x: 'Binutils — vì sao mọi thứ đều phải có tiền tố' },

    { t: 'p', x:
      'Bạn đã dùng <code>objdump</code>, <code>nm</code>, <code>readelf</code>, <code>strip</code>, ' +
      '<code>ar</code>, <code>size</code> suốt Bài 17 và Bài 18. Tất cả đều thuộc binutils, và bản ' +
      'cross của chúng nằm cạnh nhau trong <code>/usr/bin</code> với tiền tố kiến trúc.' },

    { t: 'code', where: 'wsl', code:
      'ls /usr/bin/aarch64-linux-gnu-* | wc -l\n' +
      'ls /usr/aarch64-linux-gnu/bin' },

    { t: 'code', where: 'out', nocopy: true, code:
      '34\n' +
      'ar\nas\nld\nld.bfd\nnm\nobjcopy\nobjdump\nranlib\nreadelf\nstrip' },

    { t: 'p', x:
      'Thư mục thứ hai đáng chú ý: <code>/usr/aarch64-linux-gnu/bin/</code> chứa <b>đúng</b> ' +
      'những công cụ ấy nhưng <b>không</b> có tiền tố. Đó là nơi <code>gcc</code> tìm chúng — ' +
      'nhớ lại dòng <code>-###</code> ở đầu bài, đường dẫn tới <code>as</code> đi qua chính thư ' +
      'mục này. Nói cách khác, tiền tố tồn tại là để phục vụ <i>bạn</i> gõ tay, còn driver thì ' +
      'tìm theo thư mục.' },

    { t: 'p', x:
      'Vì sao phải tách hẳn ra như vậy? Hãy tự gây lỗi để thấy.' },

    { t: 'code', where: 'wsl', code:
      'objdump -d sum-arm64.o | head -4\n' +
      'strip hello-arm64' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sum-arm64.o:     file format elf64-little\n' +
      '\n' +
      'objdump: can\'t disassemble for architecture UNKNOWN!\n' +
      'strip: Unable to recognise the architecture of the input file `hello-arm64\'' },

    { t: 'cal', kind: 'warn', title: 'Một số công cụ vẫn "chạy được" — và đó mới là chỗ nguy hiểm',
      x: '<p>Thử <code>nm sum-arm64.o</code> bằng bản native, nó in ra kết quả <b>đúng</b>: ' +
         '<code>0000000000000000 T sum_array</code>.</p>' +
         '<p>Lý do: đọc bảng ký hiệu chỉ cần hiểu <i>vỏ</i> ELF, mà vỏ ELF thì giống nhau ở mọi ' +
         'kiến trúc — Bài 18 đã cho bạn thấy. Còn dịch ngược mã lệnh hay gỡ bỏ ký hiệu thì phải ' +
         'hiểu <i>ruột</i>, tức là bảng lệnh và bảng relocation của từng ISA.</p>' +
         '<p>Nguy hiểm nằm ở chỗ: <code>nm</code>, <code>size</code>, <code>readelf</code> chạy ' +
         'trót lọt khiến bạn tưởng mọi công cụ native đều dùng được, rồi tới <code>strip</code> ' +
         'hoặc <code>objcopy</code> trong Makefile thì hỏng — mà lúc đó bản build đã đi được nửa ' +
         'đường. <b>Quy tắc: luôn gõ đủ tiền tố, kể cả khi bản native có vẻ hoạt động.</b></p>' },

    { t: 'h3', x: 'GCC — và người bạn ít ai biết tên: <code>libgcc</code>' },

    { t: 'p', x:
      'Ngoài <code>cc1</code>, gói trình biên dịch còn mang theo một thư viện tên ' +
      '<code>libgcc</code>. Nó bị liên kết vào <b>mọi</b> chương trình C bạn build — bạn thấy ' +
      '<code>-lgcc</code> trong dòng <code>collect2</code> ở đầu bài — nhưng hầu như không ai ' +
      'nhắc tới nó.' },

    { t: 'p', x:
      '<code>libgcc</code> chứa những hàm mà <b>trình biên dịch</b> cần, chứ không phải những hàm ' +
      '<b>bạn</b> gọi. Cụ thể: các phép toán mà CPU đích <i>không có lệnh</i> để làm. Ví dụ rõ ' +
      'nhất là chia số 64-bit trên ARM 32-bit — ARM32 không có lệnh chia 64-bit, mà C thì bắt ' +
      'buộc phải hỗ trợ <code>long long</code>.' },

    { t: 'code', where: 'file', name: '~/lab26/div.c', lang: 'c', code:
      'long long divide(long long a, long long b)\n' +
      '{\n' +
      '    return a / b;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'arm-linux-gnueabihf-gcc -O2 -c div.c -o div.o\n' +
      'arm-linux-gnueabihf-objdump -d div.o | tail -5\n' +
      'arm-linux-gnueabihf-nm -u div.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000 <divide>:\n' +
      '   0:\tb508      \tpush\t{r3, lr}\n' +
      '   2:\tf7ff fffe \tbl\t0 <__aeabi_ldivmod>\n' +
      '   6:\tbd08      \tpop\t{r3, pc}\n' +
      '         U __aeabi_ldivmod' },

    { t: 'cal', kind: 'info', title: 'Một dấu <code>/</code> trong C biến thành một lời gọi hàm',
      x: '<p>Bạn viết <code>a / b</code>. Trình biên dịch nhìn vào ARM32, thấy không có lệnh nào ' +
         'chia được hai số 64-bit, nên nó thay phép chia bằng <code>bl __aeabi_ldivmod</code> — ' +
         'một lời gọi hàm. <code>nm -u</code> (u = undefined) xác nhận: file <code>.o</code> này ' +
         'đang <b>nợ</b> một ký hiệu tên <code>__aeabi_ldivmod</code>.</p>' +
         '<p>Ai trả nợ đó? Không phải thư viện C — nó không có hàm này. <code>libgcc</code> trả. ' +
         'Trên máy này <code>libgcc.a</code> nặng <b>3 210 472</b> byte và gồm <b>398</b> file ' +
         'thành viên.</p>' +
         '<p>Hệ quả thực tế bạn sẽ gặp ở <b>Chặng 10</b>: khi build kernel module, bạn liên kết ' +
         '<i>không</i> có thư viện C, nhưng vẫn <i>phải</i> có <code>libgcc</code>. Nếu thiếu, ' +
         'lỗi hiện ra dưới dạng ký hiệu lạ như <code>__aeabi_…</code> hoặc <code>__udivdi3</code> ' +
         'không tìm thấy — và đó là dấu hiệu bạn nhận ra ngay từ giờ.</p>' },

    { t: 'h3', x: 'Thư viện C — chỗ bạn thật sự có quyền chọn' },

    { t: 'p', x:
      'Ba thành phần trên gần như không có lựa chọn: GCC hoặc Clang, binutils hoặc LLVM binutils, ' +
      'hết. Thư viện C thì khác — đây là chỗ dự án nhúng phải ra quyết định, và quyết định đó in ' +
      'dấu lên toàn bộ sản phẩm.' },

    { t: 'terms', items: [
      ['glibc', 'GNU C Library', 'Bản đầy đủ nhất, chuẩn trên mọi bản phân phối Linux máy bàn. Đúng chuẩn POSIX nhất, tương thích tốt nhất, và <b>nặng nhất</b>. Trên máy này: <code>libc.so.6</code> bản ARM64 nặng <b>1 781 952</b> byte với <b>3 078</b> ký hiệu'],
      ['musl', '', 'Viết lại từ đầu, mã nguồn gọn, giấy phép MIT, liên kết tĩnh rất tốt. Là lựa chọn mặc định của Alpine Linux và ngày càng phổ biến ở mảng nhúng. Đánh đổi: thiếu một số phần mở rộng riêng của GNU nên vài phần mềm cũ phải sửa mới dịch được'],
      ['uClibc-ng', 'micro-controller C library, next generation', 'Thiết kế riêng cho hệ nhúng, cắt bỏ được từng tính năng qua menu cấu hình. Buildroot dùng nó rất nhiều. Nhỏ nhất trong ba bản, nhưng cũng ít tương thích nhất'],
      ['ABI', 'Application Binary Interface', 'Giao ước ở mức <b>nhị phân</b>: tham số hàm đi qua thanh ghi nào, cấu trúc dữ liệu xếp byte ra sao, syscall gọi thế nào. Hai file <code>.o</code> khác ABI thì không liên kết được với nhau dù cùng kiến trúc'],
      ['API', 'Application Programming Interface', 'Giao ước ở mức <b>mã nguồn</b>: tên hàm, kiểu tham số. Đổi thư viện C mà giữ nguyên API thì bạn dịch lại là chạy; đổi ABI thì phải dịch lại <b>tất cả</b>'],
      ['sysroot', '', 'Một thư mục giả lập cây thư mục gốc của target, chứa header và thư viện của target. Trình biên dịch tìm <code>&lt;stdio.h&gt;</code> trong đó thay vì trong <code>/usr/include</code> của máy build'],
      ['libgcc', '', 'Thư viện hỗ trợ do GCC mang theo, chứa các phép toán mà CPU đích không có lệnh làm. Luôn được liên kết vào, kể cả khi không có thư viện C']
    ]},

    { t: 'table',
      head: ['', 'glibc', 'musl', 'uClibc-ng'],
      rows: [
        ['Mục tiêu thiết kế', 'Đầy đủ, tương thích tối đa', 'Gọn, đúng chuẩn, dễ liên kết tĩnh', 'Nhỏ nhất, cắt gọt được từng phần'],
        ['Giấy phép', 'LGPL', 'MIT', 'LGPL'],
        ['Dùng ở đâu', 'Ubuntu, Debian, Yocto mặc định', 'Alpine Linux, nhiều container', 'Buildroot, thiết bị flash nhỏ'],
        ['Điểm mạnh', 'Cái gì cũng chạy được', 'File tĩnh nhỏ, mã dễ đọc', 'Cấu hình được tới từng hàm'],
        ['Điểm yếu', 'Nặng, liên kết tĩnh cồng kềnh', 'Thiếu vài phần mở rộng GNU', 'Ít người dùng nhất, dễ gặp phần mềm không tương thích'],
        ['Chọn khi nào', 'Flash rộng rãi, ưu tiên chạy được mọi thứ', 'Muốn nhỏ mà vẫn ít rắc rối', 'Bị ép bởi dung lượng flash rất nhỏ']
      ]},

    { t: 'cal', kind: 'warn', title: 'Bảng trên là đặc điểm thiết kế, không phải số đo trên máy bạn',
      x: '<p>Máy này chỉ cài glibc, nên mọi con số glibc trong bài là <b>đo thật</b>: ' +
         '<b>1 781 952</b> byte, <b>3 078</b> ký hiệu, và file <code>hello</code> liên kết tĩnh ' +
         'nặng <b>705 328</b> byte — con số bạn đã gặp từ Bài 3.</p>' +
         '<p>Còn cột musl và uClibc-ng là mô tả đặc điểm dự án, chưa phải số bạn tự đo. Đừng nhớ ' +
         'chúng như số liệu. Ở <b>Chặng 11</b>, khi Buildroot cho bạn chọn thư viện C bằng một ' +
         'dòng menu, bạn sẽ build cả hai bản và tự cân — lúc đó con số mới là của bạn.</p>' },

    { t: 'p', x:
      'Điểm cần khắc vào đầu ngay bây giờ: <b>thư viện C là một phần của bộ ba tên máy</b>. Đó ' +
      'chính là chữ <code>gnu</code> trong <code>aarch64-linux-gnu</code> — nó nghĩa là glibc. ' +
      'Một toolchain musl sẽ tên là <code>aarch64-linux-musl</code>. Đây không phải chuyện đặt ' +
      'tên cho vui: nhị phân dịch bằng hai toolchain đó <b>không</b> thay thế cho nhau được.' },

    { t: 'h3', x: 'Sysroot — cây thư mục giả của target' },

    { t: 'p', x:
      'Khi bạn viết <code>#include &lt;stdio.h&gt;</code> rồi dịch cho ARM64, trình biên dịch ' +
      '<b>không được phép</b> mở <code>/usr/include/stdio.h</code> của máy bạn. Header đó mô tả ' +
      'glibc bản x86-64: kích thước cấu trúc, số hiệu syscall, kiểu <code>long</code> — tất cả ' +
      'đều có thể khác. Nó phải mở header của <i>target</i>.' },

    { t: 'code', where: 'wsl', code:
      'gcc -E -v - < /dev/null 2>&1 |\n' +
      '  sed -n \'/#include <...> search starts here/,/End of search list/p\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '#include <...> search starts here:\n' +
      ' /usr/lib/gcc/x86_64-linux-gnu/15/include\n' +
      ' /usr/local/include\n' +
      ' /usr/include/x86_64-linux-gnu\n' +
      ' /usr/include\n' +
      'End of search list.' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc -E -v - < /dev/null 2>&1 |\n' +
      '  sed -n \'/#include <...> search starts here/,/End of search list/p\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '#include <...> search starts here:\n' +
      ' /usr/lib/gcc-cross/aarch64-linux-gnu/15/include\n' +
      ' /usr/lib/gcc-cross/aarch64-linux-gnu/15/../../../../aarch64-linux-gnu/include\n' +
      ' /usr/include\n' +
      'End of search list.' },

    { t: 'p', x:
      'Đường dẫn thứ hai trông rối vì đầy <code>../</code>, nhưng rút gọn lại nó chỉ là ' +
      '<code>/usr/aarch64-linux-gnu/include</code>. <b>Đó là sysroot.</b> Cả ' +
      '<code>/usr/include/x86_64-linux-gnu</code> lẫn <code>/usr/local/include</code> đều biến ' +
      'mất khỏi danh sách — đúng như phải thế.' },

    { t: 'code', where: 'wsl', code:
      'ls /usr/aarch64-linux-gnu/\n' +
      'ls /usr/aarch64-linux-gnu/include | wc -l\n' +
      'ls /usr/aarch64-linux-gnu/lib | wc -l\n' +
      'du -sh /usr/aarch64-linux-gnu/lib /usr/aarch64-linux-gnu/include' },

    { t: 'code', where: 'out', nocopy: true, code:
      'bin\ninclude\nlib\n' +
      '142\n' +
      '72\n' +
      '25M\t/usr/aarch64-linux-gnu/lib\n' +
      '13M\t/usr/aarch64-linux-gnu/include' },

    { t: 'fig', cap:
      'Sysroot là cây thư mục gốc <i>của board</i>, đặt tạm trên máy build. Trình biên dịch cross ' +
      'chỉ được nhìn vào đó — nhìn nhầm sang cây của máy build là sinh ra nhị phân sai âm thầm.',
      svg:
      '<svg viewBox="0 0 720 274" width="720" role="img" aria-label="Sơ đồ so sánh đường tìm header của trình biên dịch native và trình biên dịch cross">' +
      '<rect class="d-box-p" x="20" y="12" width="320" height="28" rx="6"/>' +
      '<text class="d-t" x="180" y="31" text-anchor="middle">gcc (native)</text>' +
      '<rect class="d-box-a" x="380" y="12" width="320" height="28" rx="6"/>' +
      '<text class="d-t" x="540" y="31" text-anchor="middle">aarch64-linux-gnu-gcc (cross)</text>' +

      '<rect class="d-box" x="20" y="54" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="180" y="72" text-anchor="middle">/usr/lib/gcc/x86_64-linux-gnu/15/include</text>' +
      '<rect class="d-box" x="20" y="86" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="180" y="104" text-anchor="middle">/usr/local/include</text>' +
      '<rect class="d-box-w" x="20" y="118" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="180" y="136" text-anchor="middle">/usr/include/x86_64-linux-gnu</text>' +
      '<rect class="d-box" x="20" y="150" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="180" y="168" text-anchor="middle">/usr/include</text>' +

      '<rect class="d-box" x="380" y="54" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="540" y="72" text-anchor="middle">/usr/lib/gcc-cross/…/15/include</text>' +
      '<rect class="d-box-g" x="380" y="86" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="540" y="104" text-anchor="middle">/usr/aarch64-linux-gnu/include</text>' +
      '<text class="d-ts" x="540" y="126" text-anchor="middle">SYSROOT — 142 mục · 13 MB · header của ARM64</text>' +
      '<rect class="d-box" x="380" y="150" width="320" height="26" rx="6"/>' +
      '<text class="d-tm" x="540" y="168" text-anchor="middle">/usr/include</text>' +

      '<rect class="d-box-w" x="20" y="196" width="680" height="28" rx="6"/>' +
      '<text class="d-t" x="360" y="215" text-anchor="middle">Bản cross KHÔNG có /usr/include/x86_64-linux-gnu — đó là điểm mấu chốt</text>' +
      '<rect class="d-box" x="20" y="232" width="680" height="30" rx="6"/>' +
      '<text class="d-ts" x="360" y="252" text-anchor="middle">Ép nó dùng header x86 bằng -nostdinc -I/usr/include thì dừng ngay ở gnu/stubs-32.h: No such file</text>' +
      '</svg>' },

    { t: 'cal', kind: 'info', title: 'Vì sao <code>-print-sysroot</code> trả về đúng một dấu gạch chéo?',
      x: '<p>Thử <code>aarch64-linux-gnu-gcc -print-sysroot</code> và bạn nhận được <code>/</code>. ' +
         'Nhìn thì như hỏng, thật ra không.</p>' +
         '<p>Debian và Ubuntu dùng cơ chế <b>multiarch</b>: thay vì gom sysroot vào một thư mục ' +
         'rồi trỏ <code>--with-sysroot</code> vào đó, họ đặt file của từng kiến trúc vào những ' +
         'đường dẫn có tên kiến trúc (<code>/usr/aarch64-linux-gnu/…</code>, ' +
         '<code>/usr/lib/x86_64-linux-gnu/…</code>) và biên dịch sẵn các đường dẫn ấy vào driver. ' +
         'Kết quả giống hệt, chỉ là cách tổ chức khác.</p>' +
         '<p>Toolchain do bạn tự build ở <b>Bài 28</b> bằng crosstool-NG, và toolchain do Buildroot ' +
         'sinh ra ở <b>Chặng 11</b>, đều có sysroot thật — một thư mục riêng biệt, ' +
         '<code>-print-sysroot</code> trỏ thẳng vào nó. Khi đó bạn sẽ thấy khái niệm này ở dạng ' +
         'thuần khiết hơn.</p>' },

    { t: 'h2', x: 'Đọc tên bộ ba: <code>aarch64-linux-gnu-</code> nói gì với bạn' },

    { t: 'p', x:
      'Bài 25 đã giới thiệu bộ ba tên máy (target triplet) ở góc độ build / host / target. ' +
      'Giờ hãy mổ chính cái tên ấy ra. Dù gọi là "bộ ba", trên thực tế nó có <b>ba hoặc bốn</b> ' +
      'phần ngăn nhau bằng dấu gạch ngang.' },

    { t: 'code', where: 'wsl', code:
      'gcc -dumpmachine\n' +
      'aarch64-linux-gnu-gcc -dumpmachine\n' +
      'arm-linux-gnueabihf-gcc -dumpmachine' },

    { t: 'code', where: 'out', nocopy: true, code:
      'x86_64-linux-gnu\n' +
      'aarch64-linux-gnu\n' +
      'arm-linux-gnueabihf' },

    { t: 'table',
      head: ['Phần', 'Tên gọi', 'Trả lời câu hỏi', 'Ví dụ'],
      rows: [
        ['1', 'Kiến trúc (arch)', 'CPU hiểu bảng lệnh nào?', '<code>x86_64</code>, <code>aarch64</code>, <code>arm</code>, <code>riscv64</code>, <code>mips</code>'],
        ['2', 'Nhà cung cấp (vendor)', 'Ai phát hành? — thường vô nghĩa, hay bị bỏ hoặc ghi <code>unknown</code>', '<code>unknown</code>, <code>pc</code>, <code>none</code>, <code>buildroot</code>'],
        ['3', 'Hệ điều hành (os)', 'Nhân nào? Có hệ điều hành không?', '<code>linux</code>, <code>elf</code>, <code>eabi</code> (không hệ điều hành)'],
        ['4', 'Môi trường (abi / libc)', 'Thư viện C nào, giao ước nhị phân nào?', '<code>gnu</code>, <code>musl</code>, <code>gnueabihf</code>, <code>uclibc</code>']
      ]},

    { t: 'p', x:
      'Nên tách <code>aarch64-linux-gnu</code> như sau: kiến trúc <b>aarch64</b>, hệ điều hành ' +
      '<b>linux</b>, môi trường <b>gnu</b> (nghĩa là glibc). Phần vendor đã bị lược bỏ — tên đầy ' +
      'đủ theo chuẩn là <code>aarch64-unknown-linux-gnu</code>, nhưng gần như không ai gõ ' +
      '<code>unknown</code>. Đó chính là lý do một cái tên "ba phần" đôi khi chỉ có ba dấu gạch ' +
      'ngang, đôi khi có bốn, và bạn không thể đếm dấu gạch để đoán ý nghĩa từng phần.' },

    { t: 'cal', kind: 'tip', title: 'Đọc từ phải sang trái sẽ dễ hơn',
      x: '<p>Phần cuối luôn là phần <i>hẹp</i> nhất và cũng là phần <i>quan trọng</i> nhất khi ' +
         'chọn toolchain, vì nó quyết định nhị phân có ghép được với phần còn lại của hệ thống ' +
         'hay không.</p>' +
         '<ul>' +
         '<li><code>…-linux-gnu</code> → Linux + glibc</li>' +
         '<li><code>…-linux-musl</code> → Linux + musl, <b>không</b> thay thế được cho bản trên</li>' +
         '<li><code>…-linux-gnueabihf</code> → Linux + glibc + EABI + hard-float</li>' +
         '<li><code>…-none-eabi</code> → <b>không có hệ điều hành</b>. Đây là toolchain vi điều ' +
         'khiển (STM32 chẳng hạn), không dùng cho Linux nhúng — nhầm hai loại này là lỗi kinh ' +
         'điển của người mới</li>' +
         '</ul>' },

    { t: 'fig', cap:
      'Cùng một dòng chữ, bốn ô thông tin độc lập. Đổi bất kỳ ô nào cũng ra một nhị phân không ' +
      'thay thế được cho nhị phân cũ.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ tách bộ ba tên máy arm-linux-gnueabihf thành bốn thành phần">' +
      '<rect class="d-box-p" x="20" y="14" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="360" y="36" text-anchor="middle">arm - linux - gnueabihf</text>' +

      '<path class="d-line" d="M160 48 L120 84"/><path class="d-arrow" d="M120 84 l7 -11 l-11 -1 z"/>' +
      '<path class="d-line" d="M360 48 L360 84"/><path class="d-arrow" d="M360 84 l5 -12 l-10 0 z"/>' +
      '<path class="d-line" d="M560 48 L600 84"/><path class="d-arrow" d="M600 84 l-4 -12 l9 -3 z"/>' +

      '<rect class="d-box-a" x="20" y="88" width="200" height="60" rx="6"/>' +
      '<text class="d-t" x="120" y="110" text-anchor="middle">Kiến trúc</text>' +
      '<text class="d-ts" x="120" y="132" text-anchor="middle">ARM 32-bit, bảng lệnh Thumb-2</text>' +

      '<rect class="d-box-a" x="240" y="88" width="200" height="60" rx="6"/>' +
      '<text class="d-t" x="340" y="110" text-anchor="middle">Hệ điều hành</text>' +
      '<text class="d-ts" x="340" y="132" text-anchor="middle">nhân Linux — có syscall</text>' +

      '<rect class="d-box-a" x="460" y="88" width="240" height="60" rx="6"/>' +
      '<text class="d-t" x="580" y="110" text-anchor="middle">Môi trường: gnu + eabi + hf</text>' +
      '<text class="d-ts" x="580" y="132" text-anchor="middle">glibc · EABI · số thực qua thanh ghi VFP</text>' +

      '<rect class="d-box-w" x="20" y="164" width="680" height="30" rx="6"/>' +
      '<text class="d-t" x="360" y="184" text-anchor="middle">arm-none-eabi = KHÔNG có hệ điều hành → vi điều khiển, không phải Linux nhúng</text>' +
      '<rect class="d-box" x="20" y="202" width="680" height="34" rx="6"/>' +
      '<text class="d-ts" x="360" y="223" text-anchor="middle">Phần vendor thường bị lược: aarch64-unknown-linux-gnu viết gọn thành aarch64-linux-gnu</text>' +
      '</svg>' },

    { t: 'h2', x: 'ABI và chữ <code>hf</code>: khi hai file cùng kiến trúc vẫn không ghép được' },

    { t: 'p', x:
      'Phần khó nhất của cái tên nằm ở đuôi <code>gnueabihf</code>. Tách ra: <b>gnu</b> ' +
      '(glibc) + <b>eabi</b> (Embedded ABI, giao ước gọi hàm chuẩn của ARM) + <b>hf</b> ' +
      '(hard-float). Chữ <code>hf</code> chỉ dài hai ký tự nhưng nó thay đổi <i>cách truyền tham ' +
      'số</i> của mọi hàm có số thực trong toàn hệ thống.' },

    { t: 'p', x:
      'Cách chắc chắn nhất để hiểu là nhìn mã máy. Hãy lấy một hàm cộng hai số thực và dịch nó ' +
      'hai lần, chỉ đổi mỗi ABI số thực.' },

    { t: 'code', where: 'file', name: '~/lab26/fadd.c', lang: 'c', code:
      'float add(float a, float b)\n' +
      '{\n' +
      '    return a + b;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'arm-linux-gnueabihf-gcc -O2 -c fadd.c -o fadd-hard.o\n' +
      'arm-linux-gnueabihf-gcc -O2 -mfloat-abi=softfp -c fadd.c -o fadd-soft.o\n' +
      'arm-linux-gnueabihf-objdump -d fadd-hard.o | tail -4\n' +
      'arm-linux-gnueabihf-objdump -d fadd-soft.o | tail -6' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000 <add>:\n' +
      '   0:\tee30 0a20 \tvadd.f32\ts0, s0, s1\n' +
      '   4:\t4770      \tbx\tlr\n' +
      '\n' +
      '00000000 <add>:\n' +
      '   0:\tee07 0a10 \tvmov\ts14, r0\n' +
      '   4:\tee07 1a90 \tvmov\ts15, r1\n' +
      '   8:\tee77 7a27 \tvadd.f32\ts15, s14, s15\n' +
      '   c:\tee17 0a90 \tvmov\tr0, s15\n' +
      '  10:\t4770      \tbx\tlr' },

    { t: 'cal', kind: 'why', title: 'Vì sao bản hard-float chỉ có 2 lệnh còn bản softfp có 5?',
      x: '<p>Cả hai bản đều dùng <b>đúng một lệnh</b> để cộng: <code>vadd.f32</code>, chạy trên ' +
         'khối tính số thực (VFP) của CPU. Khác biệt hoàn toàn nằm ở chỗ <i>tham số đi vào bằng ' +
         'đường nào</i>.</p>' +
         '<ul>' +
         '<li><b>hard-float</b>: hàm nhận thẳng <code>a</code> trong <code>s0</code>, ' +
         '<code>b</code> trong <code>s1</code> — đó là thanh ghi của khối VFP. Cộng phát ăn ngay.</li>' +
         '<li><b>softfp</b>: hàm nhận <code>a</code> trong <code>r0</code>, <code>b</code> trong ' +
         '<code>r1</code> — thanh ghi số nguyên. Phải <code>vmov</code> hai lần để chuyển sang ' +
         'VFP, cộng, rồi <code>vmov</code> ngược trở lại để trả về.</li>' +
         '</ul>' +
         '<p><b>4 lệnh thừa cho mỗi lời gọi hàm.</b> Với chương trình xử lý âm thanh, cảm biến ' +
         'hay đồ hoạ — nơi hàm số thực bị gọi hàng triệu lần — con số đó không còn nhỏ. Đây chính ' +
         'là lý do các bản phân phối ARM hiện đại đều chọn hard-float, và vì sao chữ ' +
         '<code>hf</code> có mặt trong tên toolchain.</p>' },

    { t: 'p', x:
      'Quyết định ABI ấy được ghi thẳng vào file <code>.o</code> để trình liên kết kiểm tra ' +
      'được. Binutils cho ARM có riêng một tuỳ chọn để đọc phần ghi chú đó.' },

    { t: 'code', where: 'wsl', code:
      'arm-linux-gnueabihf-readelf -A fadd-hard.o | grep -E \'FP_arch|VFP_args\'\n' +
      'arm-linux-gnueabihf-readelf -A fadd-soft.o | grep -E \'FP_arch|VFP_args\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  Tag_FP_arch: VFPv3-D16\n' +
      '  Tag_ABI_VFP_args: VFP registers\n' +
      '  Tag_FP_arch: VFPv3-D16' },

    { t: 'cmdx', cmd: 'arm-linux-gnueabihf-readelf -A fadd-hard.o',
      title: 'Đọc phần thuộc tính riêng của kiến trúc ARM',
      rows: [
        ['<code>-A</code>', 'Viết tắt của <code>--arch-specific</code>: in các thuộc tính do riêng kiến trúc định nghĩa. Trên ARM đó là section <code>.ARM.attributes</code>', 'x86-64 hầu như không có gì để in ở đây, nên bạn chưa gặp tuỳ chọn này ở Bài 18'],
        ['<code>Tag_FP_arch</code>', 'Khối phần cứng tính số thực mà mã này cần: <code>VFPv3-D16</code>', 'Đây là <i>năng lực CPU</i>, cả hai bản đều giống nhau'],
        ['<code>Tag_ABI_VFP_args</code>', 'Tham số số thực truyền qua đâu. <code>VFP registers</code> = hard-float', 'Bản softfp <b>không có</b> dòng này — không ghi tức là mặc định: truyền qua thanh ghi số nguyên']
      ]},

    { t: 'p', x:
      'Điều gì xảy ra nếu bạn liên kết nhầm hai file khác ABI? Hãy tự gây lỗi — đây là thông báo ' +
      'bạn <b>sẽ</b> gặp khi trộn thư viện nhà cung cấp cấp sẵn với mã bạn tự dịch.' },

    { t: 'code', where: 'wsl', code:
      'arm-linux-gnueabihf-gcc -O2 -c mainf.c -o mainf.o\n' +
      'arm-linux-gnueabihf-gcc mainf.o fadd-soft.o -o mixed' },

    { t: 'code', where: 'out', nocopy: true, code:
      '/usr/bin/arm-linux-gnueabihf-ld.bfd: error: mixed uses VFP register arguments, fadd-soft.o does not\n' +
      '/usr/bin/arm-linux-gnueabihf-ld.bfd: failed to merge target specific data of file fadd-soft.o\n' +
      'collect2: error: ld returned 1 exit status' },

    { t: 'cal', kind: 'warn', title: 'Cùng CPU, cùng kiến trúc, vẫn không ghép được',
      x: '<p><code>fadd-soft.o</code> là mã ARM 32-bit hợp lệ. CPU chạy được nó. ' +
         '<code>mainf.o</code> cũng là mã ARM 32-bit hợp lệ. Vậy mà trình liên kết vẫn từ chối.</p>' +
         '<p>Vì nếu ghép, <code>main</code> sẽ đặt tham số vào <code>s0</code>/<code>s1</code> ' +
         'còn <code>add</code> lại đi đọc <code>r0</code>/<code>r1</code>. Chương trình không ' +
         '<i>sập</i> — nó chỉ trả về những con số rác. <b>Lỗi lúc liên kết như thế này là món quà</b>, ' +
         'so với việc phải gỡ một con số sai ở hiện trường. Nhớ lại Bài 25: ' +
         '<code>ld</code> từ chối vì <code>EM: 183</code> cũng đúng theo tinh thần ấy.</p>' +
         '<p>Đây cũng là câu trả lời cho câu hỏi "sao không dùng đại một toolchain ARM bất kỳ": ' +
         'nhị phân của bạn phải khớp ABI với thư viện đã có trên board, mà ABI thì nằm trong ' +
         'cái tên toolchain.</p>' },

    { t: 'h3', x: 'Còn một ABI nữa bạn phải nhớ: độ rộng của <code>long</code>' },

    { t: 'code', where: 'wsl', code:
      'for t in gcc aarch64-linux-gnu-gcc arm-linux-gnueabihf-gcc; do\n' +
      '    printf \'%-26s \' "$t"\n' +
      '    $t -dM -E - < /dev/null | grep -E \'__SIZEOF_(LONG|POINTER)__\' | sort | tr \'\\n\' \' \'\n' +
      '    echo\n' +
      'done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc                        #define __SIZEOF_LONG__ 8 #define __SIZEOF_POINTER__ 8\n' +
      'aarch64-linux-gnu-gcc      #define __SIZEOF_LONG__ 8 #define __SIZEOF_POINTER__ 8\n' +
      'arm-linux-gnueabihf-gcc    #define __SIZEOF_LONG__ 4 #define __SIZEOF_POINTER__ 4' },

    { t: 'table',
      head: ['Mô hình', 'int', 'long', 'con trỏ', 'Ai dùng'],
      rows: [
        ['LP64', '4', '<b>8</b>', '<b>8</b>', 'x86-64 Linux, ARM64 Linux — hai cột đầu ở trên'],
        ['ILP32', '4', '<b>4</b>', '<b>4</b>', 'ARM 32-bit Linux — cột thứ ba'],
        ['LLP64', '4', '4', '8', 'Windows 64-bit — nêu ra để bạn không ngạc nhiên khi gặp']
      ]},

    { t: 'cal', kind: 'danger', title: 'Đây là nguồn gốc của loại bug tệ nhất khi chuyển sang nhúng',
      x: '<p>Mã viết trên máy bàn x86-64 rất dễ ngầm giả định <code>sizeof(long) == 8</code> hoặc ' +
         '<code>long</code> chứa vừa một con trỏ. Dịch lại cho ARM 32-bit, cả hai giả định đó đều ' +
         'sai — mà trình biên dịch <b>không</b> báo lỗi, chỉ cắt cụt giá trị lúc chạy.</p>' +
         '<p>Bạn đã thấy cách tự bảo vệ ở Bài 25: đặt <code>_Static_assert</code> để lỗi nổ ra ' +
         'lúc dịch thay vì lúc chạy. Ngoài ra, dùng ' +
         '<code>&lt;stdint.h&gt;</code> (<code>int32_t</code>, <code>int64_t</code>, ' +
         '<code>uintptr_t</code>) thay cho <code>long</code> trần là thói quen bắt buộc trong mã ' +
         'nhúng — đó cũng là lý do mã nguồn nhân Linux gần như không dùng <code>long</code> để ' +
         'lưu địa chỉ.</p>' },

    { t: 'h3', x: 'Một khác biệt nữa mà không cái tên nào nhắc tới: kích thước trang nhớ' },

    { t: 'p', x:
      'Bài 25 để lại một câu hỏi treo: vì sao <code>hello</code> bản ARM64 nặng ' +
      '<b>70 448</b> byte trong khi bản x86-64 chỉ <b>15 952</b> byte, dù mã lệnh hai bên xấp xỉ ' +
      'nhau? Câu trả lời không nằm ở mã, mà ở một mặc định của trình liên kết.' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc hello.c -o hello-64k\n' +
      'aarch64-linux-gnu-gcc hello.c -o hello-4k -Wl,-z,max-page-size=4096\n' +
      'gcc hello.c -o hello-x86\n' +
      'ls -l hello-x86 hello-64k hello-4k | awk \'{print $5, $9}\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '9008 hello-4k\n' +
      '70448 hello-64k\n' +
      '15952 hello-x86' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-readelf -lW hello-64k | grep -m1 LOAD\n' +
      'aarch64-linux-gnu-readelf -lW hello-4k  | grep -m1 LOAD' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  LOAD  0x000000 0x0000000000000000 0x0000000000000000 0x00090c 0x00090c R E 0x10000\n' +
      '  LOAD  0x000000 0x0000000000000000 0x0000000000000000 0x00090c 0x00090c R E 0x1000' },

    { t: 'cal', kind: 'info', title: '70 448 byte cho một chương trình có 2 316 byte nội dung',
      x: '<p>Cột áp chót của <code>readelf -l</code> là <b>căn lề</b> của segment: ' +
         '<code>0x10000</code> = <b>65 536</b> byte ở bản mặc định, <code>0x1000</code> = ' +
         '<b>4 096</b> byte ở bản kia. Trong khi nội dung thật (<code>0x90c</code>) chỉ có ' +
         '<b>2 316</b> byte trong cả hai bản — <i>y hệt nhau</i>.</p>' +
         '<p>Mọi chênh lệch đều là đệm. ARM64 cho phép nhân chạy với trang nhớ 4 KB, 16 KB hoặc ' +
         '64 KB, mà trình liên kết thì không biết board của bạn dùng cỡ nào, nên nó chọn cỡ lớn ' +
         'nhất cho an toàn. Ép về 4 KB: <b>70 448 → 9 008</b> byte, giảm <b>87,2 %</b>. Bản tĩnh ' +
         'cũng giảm, nhưng ít hơn nhiều: <b>705 328 → 676 656</b> byte, chỉ <b>4,1 %</b>, vì phần ' +
         'đệm cố định giờ chìm nghỉm trong 676 KB mã của glibc.</p>' +
         '<p>Bài học chung: một tuỳ chọn <i>mặc định</i> của toolchain có thể chi phối kích thước ' +
         'sản phẩm mạnh hơn cả mã bạn viết. Đừng chỉnh nó theo cảm tính — <b>Chặng 07</b> sẽ cho ' +
         'bạn đọc <code>CONFIG_ARM64_4K_PAGES</code> trong cấu hình nhân để biết board thật sự ' +
         'dùng cỡ nào, rồi mới quyết định.</p>' },

    { t: 'h2', x: 'Thực hành: mổ bộ toolchain đang có trên máy bạn' },

    { t: 'p', x:
      'Sáu bước dưới đây đi đúng thứ tự bốn thành phần của bài, rồi khép lại bằng hai thí nghiệm ' +
      'ABI. Mọi kết quả in ra đều đã được chạy thật trên máy này — nếu số của bạn lệch, hãy đọc ' +
      'bảng "Lỗi thường gặp" ngay sau đó trước khi nghi ngờ mình làm sai.' },

    { t: 'code', where: 'wsl', code: 'mkdir -p ~/lab26 && cd ~/lab26' },

    { t: 'steps', items: [

      { title: 'Xác định bốn thành phần là bốn gói riêng biệt',
        blocks: [
          { t: 'p', x:
            'Trước hết hãy chứng minh điều bài này khẳng định ngay từ đầu: cái bạn gọi là "trình ' +
            'biên dịch cross" không phải một chương trình, mà là một bộ sưu tập do nhiều dự án ' +
            'khác nhau đóng góp — và chúng có số phiên bản khác nhau.' },
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc --version | head -1\n' +
            'aarch64-linux-gnu-ld --version | head -1' },
          { t: 'code', where: 'out', nocopy: true, code:
            'aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0\n' +
            'GNU ld (GNU Binutils for Ubuntu) 2.46' },
          { t: 'p', x:
            'Hai con số hoàn toàn không liên quan: <b>15.2.0</b> và <b>2.46</b>. Giờ hỏi hệ thống ' +
            'gói xem ai cung cấp từng mảnh.' },
          { t: 'code', where: 'wsl', code:
            'dpkg -S "$(readlink -f /usr/bin/aarch64-linux-gnu-ld)" | cut -d: -f1\n' +
            'dpkg -S /usr/aarch64-linux-gnu/lib/libc.so.6        | cut -d: -f1\n' +
            'dpkg -S /usr/aarch64-linux-gnu/include/stdio.h      | cut -d: -f1' },
          { t: 'code', where: 'out', nocopy: true, code:
            'binutils-aarch64-linux-gnu\n' +
            'libc6-arm64-cross\n' +
            'libc6-dev-arm64-cross' },
          { t: 'cmdx', cmd: 'dpkg -S "$(readlink -f /usr/bin/aarch64-linux-gnu-ld)" | cut -d: -f1',
            title: 'Truy ngược từ một file về gói đã cài nó',
            rows: [
              ['<code>dpkg -S</code>', '<i>Search</i>: file này thuộc gói nào? Ngược với <code>dpkg -L</code> (gói này có những file nào)', 'Chỉ tìm được file do gói cài, không tìm được file bạn tự tạo'],
              ['<code>readlink -f</code>', 'Bám theo hết chuỗi symlink để ra đường dẫn thật', '<code>aarch64-linux-gnu-ld</code> là symlink tới <code>ld.bfd</code>; hỏi thẳng symlink thì <code>dpkg</code> vẫn trả lời được, nhưng thói quen này cứu bạn ở các file trỏ lòng vòng nhiều tầng'],
              ['<code>cut -d: -f1</code>', 'Cắt lấy phần trước dấu hai chấm, tức tên gói', '<code>dpkg -S</code> in dạng <code>gói: /đường/dẫn</code>']
            ]},
          { t: 'cal', kind: 'info', title: 'Ba gói, ba vai trò — và cái tên nói rõ điều đó',
            x: '<p><code>binutils-…</code> là thợ lắp ráp và liên kết. <code>libc6-arm64-cross</code> ' +
               'là thư viện C <b>lúc chạy</b> (<code>.so</code>). <code>libc6-dev-arm64-cross</code> ' +
               'là phần <b>lúc dịch</b> (header + <code>.a</code>) — hậu tố <code>-dev</code> chính ' +
               'là quy ước bạn đã gặp ở Bài 12 khi cài thư viện phát triển bằng <code>apt</code>.</p>' +
               '<p>Cộng thêm gói <code>gcc-15-aarch64-linux-gnu</code> chứa <code>cc1</code> và ' +
               '<code>libgcc</code> là đủ bốn thành phần. Một toolchain thiếu bất kỳ mảnh nào ' +
               'trong bốn mảnh này đều không dịch nổi một chương trình <code>hello</code>.</p>' }
        ]},

      { title: 'Bắt <code>gcc</code> khai ra ba chương trình nó sẽ gọi',
        blocks: [
          { t: 'p', x:
            'Bước này lặp lại thí nghiệm ở đầu bài nhưng lọc gọn, để bạn tự tay xác nhận: driver ' +
            'không dịch, nó chỉ điều phối.' },
          { t: 'code', where: 'file', name: '~/lab26/hello.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("hello, world\\n");\n' +
            '    return 0;\n' +
            '}' },
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -### hello.c -o hello 2>&1 |\n' +
            '  grep -oE \'/usr/[^" ]*(cc1|/as|collect2)\' | sort -u' },
          { t: 'code', where: 'out', nocopy: true, code:
            '/usr/lib/gcc-cross/aarch64-linux-gnu/15/../../../../aarch64-linux-gnu/bin/as\n' +
            '/usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1\n' +
            '/usr/libexec/gcc-cross/aarch64-linux-gnu/15/collect2' },
          { t: 'cal', kind: 'why', title: 'Vì sao phải có <code>2>&1</code>?',
            x: '<p><code>-###</code> in kế hoạch ra <b>luồng lỗi chuẩn</b>, không phải luồng ra ' +
               'chuẩn. Thiếu <code>2>&1</code> thì <code>grep</code> không nhận được gì và bạn ' +
               'thấy màn hình trống — trong khi kế hoạch vẫn đang xổ đầy terminal. Bài 10 đã dạy ' +
               'phân biệt hai luồng này; đây là lần đầu nó quyết định thí nghiệm thành hay bại.</p>' +
               '<p>Đường dẫn tới <code>as</code> đi vòng qua <code>../../../../</code> rồi vào ' +
               '<code>/usr/aarch64-linux-gnu/bin/</code> — đúng thư mục bản <b>không</b> tiền tố ' +
               'mà bạn đã thấy ở phần binutils. Driver tìm công cụ theo <i>vị trí thư mục</i>, ' +
               'không theo tiền tố tên.</p>' }
        ]},

      { title: 'Tìm ra sysroot bằng cách so hai danh sách đường dẫn header',
        blocks: [
          { t: 'p', x:
            'Câu hỏi cần trả lời: khi dịch cho ARM64, <code>#include &lt;stdio.h&gt;</code> mở file nào?' },
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -E -v - < /dev/null 2>&1 |\n' +
            '  sed -n \'/#include <...> search starts here/,/End of search list/p\'' },
          { t: 'code', where: 'out', nocopy: true, code:
            '#include <...> search starts here:\n' +
            ' /usr/lib/gcc-cross/aarch64-linux-gnu/15/include\n' +
            ' /usr/aarch64-linux-gnu/include\n' +
            ' /usr/include\n' +
            'End of search list.' },
          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -E -v - < /dev/null',
            title: 'Hỏi trình tiền xử lý về chính nó',
            rows: [
              ['<code>-E</code>', 'Dừng ngay sau bước tiền xử lý — giai đoạn 1 trong bốn giai đoạn của Bài 15', 'Không dịch, không lắp ráp, không liên kết'],
              ['<code>-v</code>', '<i>Verbose</i>: in kèm danh sách thư mục sẽ tìm header', 'Chính là thông tin ta cần'],
              ['<code>-</code>', 'Dấu gạch một mình = "đọc mã nguồn từ luồng vào chuẩn"', 'Nhờ vậy không cần tạo file <code>.c</code> giả'],
              ['<code>&lt; /dev/null</code>', 'Cho luồng vào rỗng ngay lập tức', 'Ta chỉ muốn cái danh sách, không muốn dịch gì cả'],
              ['<code>sed -n \'/A/,/B/p\'</code>', 'In các dòng từ dòng khớp A tới dòng khớp B. <code>-n</code> tắt in mặc định', 'Cắt gọn khối cần đọc ra khỏi hàng chục dòng thông tin khác']
            ]},
          { t: 'p', x:
            'So với bản native (<code>gcc -E -v -</code>), <code>/usr/include/x86_64-linux-gnu</code> ' +
            'đã biến mất và <code>/usr/aarch64-linux-gnu/include</code> thế chỗ. Nhưng liệu hai ' +
            'bộ header có thật sự khác nhau, hay chỉ là hai bản sao?' },
          { t: 'code', where: 'wsl', code:
            'grep -c . /usr/aarch64-linux-gnu/include/stdio.h /usr/include/stdio.h\n' +
            'diff -q /usr/aarch64-linux-gnu/include/bits/wordsize.h \\\n' +
            '        /usr/include/x86_64-linux-gnu/bits/wordsize.h' },
          { t: 'code', where: 'out', nocopy: true, code:
            '/usr/aarch64-linux-gnu/include/stdio.h:798\n' +
            '/usr/include/stdio.h:798\n' +
            'Files /usr/aarch64-linux-gnu/include/bits/wordsize.h and\n' +
            '/usr/include/x86_64-linux-gnu/bits/wordsize.h differ' },
          { t: 'cal', kind: 'tip', title: 'Phần giống nhau nằm ngoài mặt, phần khác nhau nằm trong <code>bits/</code>',
            x: '<p><code>stdio.h</code> của hai kiến trúc dài y hệt nhau: <b>798</b> dòng. Nó khai ' +
               'báo API — <code>printf</code>, <code>FILE</code>, <code>fopen</code> — mà API thì ' +
               'không phụ thuộc CPU.</p>' +
               '<p>Cái khác nhau bị đẩy hết xuống thư mục <code>bits/</code>: độ rộng từ máy, ' +
               'kích thước các cấu trúc, số hiệu syscall. <code>bits/wordsize.h</code> chính là ' +
               'nơi ghi <code>sizeof(long)</code> là 4 hay 8. Đây là mẹo thiết kế của glibc, và ' +
               'nó giải thích vì sao dùng nhầm header x86 để dịch cho ARM có thể <i>dịch trót ' +
               'lọt</i> rồi sinh ra nhị phân sai âm thầm — thứ nguy hiểm hơn hẳn một lỗi dịch.</p>' }
        ]},

      { title: 'Tự chứng minh binutils native không thay thế được — kể cả khi có vẻ chạy được',
        blocks: [
          { t: 'p', x:
            'Đây là bước dễ chủ quan nhất trong đời làm nhúng. Hãy dịch ra một file ' +
            '<code>.o</code> ARM64 rồi soi nó bằng công cụ <b>native</b>.' },
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -c hello.c -o hello.o\n' +
            'nm hello.o' },
          { t: 'code', where: 'out', nocopy: true, code:
            '0000000000000000 r $d\n' +
            '0000000000000014 r $d\n' +
            '0000000000000000 t $x\n' +
            '0000000000000000 T main\n' +
            '                 U puts' },
          { t: 'p', x:
            '<code>nm</code> bản x86-64 vừa đọc trót lọt một file ARM64 và cho kết quả đúng. Bây ' +
            'giờ đổi sang công cụ cần hiểu bảng lệnh.' },
          { t: 'code', where: 'wsl', code:
            'objdump -d hello.o\n' +
            'aarch64-linux-gnu-objdump -d hello.o | grep -c .' },
          { t: 'code', where: 'out', nocopy: true, code:
            'objdump: can\'t disassemble for architecture UNKNOWN!\n' +
            '11' },
          { t: 'cal', kind: 'warn', title: 'Cùng một file, một công cụ đọc được, một công cụ mù hẳn',
            x: '<p><code>nm</code> chỉ đọc bảng ký hiệu — phần thuộc <i>khuôn dạng ELF</i>, giống ' +
               'nhau ở mọi kiến trúc (Bài 18). <code>objdump -d</code> phải dịch ngược từng byte ' +
               'thành lệnh, mà bảng lệnh thì mỗi ISA một kiểu, nên bản x86-64 bó tay: ' +
               '<code>architecture UNKNOWN</code>.</p>' +
               '<p>Bản có tiền tố in ra <b>11</b> dòng bình thường. Ghi nhớ: ' +
               '<code>nm</code>, <code>size</code>, <code>readelf</code>, <code>file</code> chạy ' +
               'được không có nghĩa là bạn được phép bỏ tiền tố. <code>objdump</code>, ' +
               '<code>strip</code>, <code>objcopy</code>, <code>ar</code>, <code>as</code>, ' +
               '<code>ld</code> thì bắt buộc. Cách an toàn duy nhất là <b>luôn</b> gõ đủ tiền tố ' +
               'trong Makefile.</p>' },
          { t: 'p', x:
            'Ký hiệu <code>$d</code> và <code>$x</code> trong kết quả <code>nm</code> là đặc sản ' +
            'của ARM: chúng đánh dấu đoạn nào là <i>data</i> (dữ liệu) và đoạn nào là ' +
            '<i>executable</i> (mã lệnh) bên trong cùng một section, để công cụ dịch ngược không ' +
            'nhầm hằng số thành lệnh. x86-64 không có thứ này.', muted: true }
        ]},

      { title: 'Trộn hai ABI số thực và xem trình liên kết bắt lỗi',
        blocks: [
          { t: 'p', x:
            'Chuyển sang toolchain ARM 32-bit để thấy chữ <code>hf</code> trong ' +
            '<code>gnueabihf</code> có sức nặng ra sao. Cùng một file <code>fadd.c</code>, dịch ' +
            'hai lần, chỉ khác đúng một tuỳ chọn.' },
          { t: 'code', where: 'file', name: '~/lab26/fadd.c', lang: 'c', code:
            'float add(float a, float b)\n' +
            '{\n' +
            '    return a + b;\n' +
            '}' },
          { t: 'code', where: 'file', name: '~/lab26/mainf.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'float add(float a, float b);\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("%f\\n", add(1.5f, 2.5f));\n' +
            '    return 0;\n' +
            '}' },
          { t: 'code', where: 'wsl', code:
            'arm-linux-gnueabihf-gcc -O2 -c fadd.c  -o fadd-hard.o\n' +
            'arm-linux-gnueabihf-gcc -O2 -c fadd.c  -o fadd-soft.o -mfloat-abi=softfp\n' +
            'arm-linux-gnueabihf-gcc -O2 -c mainf.c -o mainf.o\n' +
            'arm-linux-gnueabihf-readelf -A fadd-hard.o | grep VFP_args\n' +
            'arm-linux-gnueabihf-readelf -A fadd-soft.o | grep VFP_args' },
          { t: 'code', where: 'out', nocopy: true, code:
            '  Tag_ABI_VFP_args: VFP registers' },
          { t: 'p', x:
            'Chỉ một dòng in ra, vì file softfp <b>không</b> có thuộc tính ấy. Giờ ép chúng ghép ' +
            'với nhau.' },
          { t: 'code', where: 'wsl', code:
            'arm-linux-gnueabihf-gcc mainf.o fadd-soft.o -o mixed\n' +
            'echo "exit=$?"' },
          { t: 'code', where: 'out', nocopy: true, code:
            '/usr/bin/arm-linux-gnueabihf-ld.bfd: error: mixed uses VFP register arguments, fadd-soft.o does not\n' +
            '/usr/bin/arm-linux-gnueabihf-ld.bfd: failed to merge target specific data of file fadd-soft.o\n' +
            'collect2: error: ld returned 1 exit status\n' +
            'exit=1' },
          { t: 'code', where: 'wsl', code:
            'arm-linux-gnueabihf-gcc mainf.o fadd-hard.o -o good\n' +
            'echo "exit=$?"\n' +
            'file good | cut -d, -f1-3' },
          { t: 'code', where: 'out', nocopy: true, code:
            'exit=0\n' +
            'good: ELF 32-bit LSB pie executable, ARM, EABI5 version 1 (SYSV)' },
          { t: 'cal', kind: 'why', title: 'Vì sao lỗi này đáng mừng chứ không đáng bực',
            x: '<p>Trình liên kết không so sánh kiến trúc — cả hai file đều là ARM 32-bit hợp lệ. ' +
               'Nó so <b>thuộc tính ABI</b> ghi trong <code>.ARM.attributes</code>, thấy một bên ' +
               'truyền số thực qua thanh ghi VFP còn bên kia thì không, và từ chối ghép.</p>' +
               '<p>Nếu nó cứ ghép bừa, <code>main</code> sẽ đặt <code>1.5</code> vào ' +
               '<code>s0</code> trong khi <code>add</code> đọc <code>r0</code>. Chương trình vẫn ' +
               'chạy, vẫn in ra một số — chỉ là số vô nghĩa. Một lỗi lúc liên kết mất của bạn năm ' +
               'phút; một con số sai âm thầm trên thiết bị đã xuất xưởng mất của bạn nhiều ngày.</p>' }
        ]},

      { title: 'Đo phần đệm mà mặc định của trình liên kết áp lên bạn, rồi dọn dẹp',
        blocks: [
          { t: 'p', x:
            'Bước cuối trả nốt câu hỏi treo từ Bài 25: vì sao <code>hello</code> bản ARM64 lại ' +
            'phình lên gấp bốn lần bản x86-64.' },
          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc hello.c -o hello-64k\n' +
            'aarch64-linux-gnu-gcc hello.c -o hello-4k         -Wl,-z,max-page-size=4096\n' +
            'aarch64-linux-gnu-gcc hello.c -o hello-static     -static\n' +
            'aarch64-linux-gnu-gcc hello.c -o hello-static-4k  -static -Wl,-z,max-page-size=4096\n' +
            'stat -c \'%s %n\' hello-64k hello-4k hello-static hello-static-4k' },
          { t: 'code', where: 'out', nocopy: true, code:
            '70448 hello-64k\n' +
            '9008 hello-4k\n' +
            '705328 hello-static\n' +
            '676656 hello-static-4k' },
          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc hello.c -o hello-4k -Wl,-z,max-page-size=4096',
            title: 'Truyền một tuỳ chọn xuyên qua driver tới trình liên kết',
            rows: [
              ['<code>-Wl,</code>', 'Mọi thứ sau dấu phẩy được chuyển thẳng cho <code>ld</code>, không phải cho <code>gcc</code>', 'Nhiều dấu phẩy = nhiều tham số. Không có nó, <code>gcc</code> sẽ báo tuỳ chọn lạ'],
              ['<code>-z keyword</code>', 'Dạng tuỳ chọn "mở rộng" của <code>ld</code>; ở đây <code>-Wl,-z,X</code> tương đương gõ <code>-z X</code> cho <code>ld</code>', 'Dấu phẩy thứ hai chính là khoảng trắng giữa <code>-z</code> và giá trị'],
              ['<code>max-page-size=4096</code>', 'Hứa với trình liên kết rằng trang nhớ trên target không lớn hơn 4 KB, nên không cần căn lề segment theo 64 KB', 'Đặt sai — board dùng trang 64 KB — thì nhân từ chối nạp. Phải khớp với <code>CONFIG_ARM64_*_PAGES</code> của nhân'],
              ['<code>stat -c \'%s %n\'</code>', 'In kích thước tính bằng byte (<code>%s</code>) và tên file (<code>%n</code>)', 'Gọn và chắc chắn hơn đọc cột thứ 5 của <code>ls -l</code>']
            ]},
          { t: 'p', x:
            'Kiểm chứng rằng nội dung không hề đổi, chỉ phần đệm đổi:' },
          { t: 'code', where: 'wsl', code: 'aarch64-linux-gnu-size hello-64k hello-4k' },
          { t: 'code', where: 'out', nocopy: true, code:
            '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
            '   1642\t    640\t      8\t   2290\t    8f2\thello-64k\n' +
            '   1642\t    640\t      8\t   2290\t    8f2\thello-4k' },
          { t: 'cal', kind: 'info', title: 'Hai file lệch nhau 61 440 byte mà nội dung giống hệt từng byte một',
            x: '<p><code>size</code> báo <b>1642</b> byte mã, <b>640</b> byte dữ liệu, <b>8</b> byte ' +
               '<code>.bss</code> — <i>y hệt nhau</i> ở cả hai file, đúng như bạn đã học đọc ở ' +
               'Bài 18. Chênh lệch <b>70 448 − 9 008 = 61 440</b> byte hoàn toàn là số 0 đệm vào.</p>' +
               '<p>Bản tĩnh giảm ít hơn hẳn: <b>705 328 → 676 656</b>, tức <b>28 672</b> byte, chỉ ' +
               '<b>4,1 %</b>. Phần đệm gần như cố định, nên nó nặng ký với file bé và không đáng ' +
               'kể với file lớn. Rút ra: <b>hãy đo lại sau mỗi lần đổi tuỳ chọn</b>, đừng suy ' +
               'diễn tỉ lệ từ một phép đo trước đó.</p>' },
          { t: 'p', x: 'Dọn dẹp — thư mục này không còn cần cho bài sau:' },
          { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/lab26' }
        ]}

    ]},

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>objdump: can\'t disassemble for architecture UNKNOWN!</code>',
         'Dùng <code>objdump</code> bản native để dịch ngược file của kiến trúc khác',
         'Gõ đủ tiền tố: <code>aarch64-linux-gnu-objdump</code>'],
        ['<code>strip: Unable to recognise the architecture of the input file</code>',
         'Cùng nguyên nhân trên, thường lọt vào qua biến <code>STRIP</code> trong Makefile',
         'Đặt <code>CROSS_COMPILE=aarch64-linux-gnu-</code> rồi dùng <code>$(CROSS_COMPILE)strip</code>'],
        ['<code>ld.bfd: error: … uses VFP register arguments, x.o does not</code>',
         'Trộn file hard-float với file soft-float trên ARM 32-bit',
         'Dịch lại toàn bộ bằng cùng một ABI. Kiểm tra bằng <code>readelf -A</code>, tìm dòng <code>Tag_ABI_VFP_args</code>'],
        ['<code>undefined reference to `__aeabi_ldivmod\'</code>',
         'Liên kết mà thiếu <code>libgcc</code> — hay gặp khi tự gọi <code>ld</code> thay vì gọi qua <code>gcc</code>',
         'Liên kết bằng driver <code>gcc</code>, hoặc thêm thủ công <code>-lgcc</code> vào cuối dòng lệnh <code>ld</code>'],
        ['<code>-###</code> chạy xong mà <code>grep</code> không ra dòng nào',
         'Kế hoạch được in ra luồng lỗi chuẩn, <code>grep</code> chỉ đọc luồng ra chuẩn',
         'Thêm <code>2>&amp;1</code> ngay sau lệnh, trước dấu ống'],
        ['<code>fatal error: gnu/stubs-32.h: No such file or directory</code>',
         'Trình biên dịch bị ép nhìn sang bộ header của máy build thay vì sysroot của target',
         'Bỏ mọi <code>-I/usr/include</code> và <code>-nostdinc</code> tự thêm; để driver tự chọn đường dẫn'],
        ['<code>aarch64-linux-gnu-gcc: command not found</code>',
         'Chưa cài gói cross, hoặc gõ thiếu một đoạn trong tiền tố (ví dụ <code>aarch64-gcc</code>)',
         '<code>sudo apt install gcc-aarch64-linux-gnu</code>; kiểm tra tên đúng bằng <code>ls /usr/bin/*gcc*</code>'],
        ['<code>-print-sysroot</code> in ra <code>/</code>',
         'Không phải lỗi: toolchain Debian/Ubuntu dùng multiarch, đường dẫn được biên dịch sẵn vào driver',
         'Xem đường dẫn thật bằng <code>gcc -E -v -</code> thay vì tin vào <code>-print-sysroot</code>'],
        ['Nhị phân ARM64 dịch xong không nạp được trên board, nhân báo lỗi định dạng',
         'Ép <code>max-page-size=4096</code> trong khi nhân của board cấu hình trang 16 KB hoặc 64 KB',
         'Đối chiếu <code>CONFIG_ARM64_4K_PAGES</code> / <code>_64K_PAGES</code> của nhân trước khi ép; nghi ngờ thì bỏ tuỳ chọn đi']
      ]},

    { t: 'recap', items: [
      '<code>gcc</code> là <b>trình điều phối</b>, không phải trình biên dịch. <code>-###</code> phơi ra ba chương trình thật: <code>cc1</code>, <code>as</code>, <code>collect2</code>.',
      'Một toolchain gồm <b>bốn</b> thành phần do các dự án khác nhau làm: <b>binutils</b> (2.46), <b>GCC</b> (15.2.0) kèm <code>libgcc</code>, <b>thư viện C</b>, và <b>sysroot</b> chứa header.',
      'Công cụ binutils phải có <b>tiền tố</b>. <code>nm</code> và <code>readelf</code> native vẫn đọc được file lạ kiến trúc vì chúng chỉ đọc vỏ ELF — nhưng <code>objdump</code>, <code>strip</code>, <code>ld</code> thì mù hẳn.',
      '<code>libgcc</code> cung cấp phép toán mà CPU không có lệnh làm, ví dụ <code>__aeabi_ldivmod</code> cho phép chia 64-bit trên ARM32. Nó luôn được liên kết vào, kể cả khi không có thư viện C.',
      'Thư viện C là chỗ bạn thật sự được chọn: <b>glibc</b> (đầy đủ), <b>musl</b> (gọn), <b>uClibc-ng</b> (nhỏ nhất). Tên thư viện nằm ngay trong bộ ba: chữ <code>gnu</code> nghĩa là glibc.',
      '<b>Sysroot</b> là cây thư mục gốc của target: <code>/usr/aarch64-linux-gnu/</code>, <b>142</b> mục header (<b>13 MB</b>) và <b>72</b> mục thư viện (<b>25 MB</b>). Phần khác nhau giữa các kiến trúc nằm trong <code>bits/</code>, không phải trong <code>stdio.h</code>.',
      'Bộ ba tên máy đọc là <b>kiến trúc – (nhà cung cấp) – hệ điều hành – môi trường</b>. <code>arm-none-eabi</code> không có hệ điều hành nên <b>không</b> dùng cho Linux nhúng.',
      'Chữ <code>hf</code> = hard-float: số thực truyền qua <code>s0</code>/<code>s1</code>. Bản softfp phải thêm <b>4 lệnh <code>vmov</code></b> mỗi lời gọi. Trộn hai bên thì <code>ld</code> từ chối ngay lúc liên kết.',
      'ABI còn bao gồm độ rộng kiểu: ARM64 là <b>LP64</b> (<code>long</code> 8 byte), ARM 32-bit là <b>ILP32</b> (<code>long</code> 4 byte). Dùng <code>&lt;stdint.h&gt;</code> thay <code>long</code> trần.',
      'Mặc định của trình liên kết chi phối kích thước mạnh hơn mã bạn viết: <code>hello</code> ARM64 <b>70 448 → 9 008</b> byte (giảm <b>87,2 %</b>) chỉ nhờ <code>-Wl,-z,max-page-size=4096</code>, trong khi phần <code>text</code> vẫn nguyên <b>1 642</b> byte.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Bạn đã biết bộ đồ nghề gồm những gì và cái tên của nó nói lên điều gì. <b>Bài 27 — ' +
         'Cross-compile chương trình đầu tiên cho ARM64</b> đem bộ đồ nghề ấy ra làm việc thật: lấy chính ' +
         'chương trình daemon bạn viết ở <b>Chặng 03</b> — có <code>fork</code>, có tín hiệu, có ' +
         'ghi log — và dịch nó cho ARM64 mà không sửa một dòng mã nào.</p>' +
         '<p>Bạn sẽ viết một <code>Makefile</code> chuyển được qua lại giữa hai kiến trúc chỉ bằng ' +
         'biến <code>CROSS_COMPILE=</code>, đúng quy ước mà nhân Linux và Buildroot dùng — nghĩa ' +
         'là sau bài đó, <code>make</code> và <code>make CROSS_COMPILE=aarch64-linux-gnu-</code> ' +
         'sinh ra hai nhị phân khác kiến trúc từ cùng một thư mục. Và bạn sẽ gặp trở ngại đầu ' +
         'tiên mà bài này đã cảnh báo: một thư viện ngoài mà máy build có sẵn nhưng sysroot của ' +
         'target thì không.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    { q: 'Chạy <code>aarch64-linux-gnu-gcc -### hello.c -o hello</code>, bạn thấy ba đường dẫn chương trình. Điều đó chứng minh gì?',
      opts: [
        '<code>gcc</code> đã dịch xong và đang báo cáo các file tạm nó tạo ra',
        '<code>gcc</code> là một trình điều phối: nó gọi <code>cc1</code>, <code>as</code> và <code>collect2</code> chứ tự nó không dịch',
        'Máy đang cài ba trình biên dịch cross khác nhau',
        'Chương trình đã được liên kết tĩnh với ba thư viện'
      ], a: 1,
      why: '<code>-###</code> chỉ <i>in kế hoạch</i> rồi dừng, không chạy gì cả. Ba đường dẫn ấy là ba chương trình riêng biệt mà driver sẽ lần lượt gọi: <code>cc1</code> dịch C ra assembly, <code>as</code> lắp ráp ra <code>.o</code>, <code>collect2</code> bọc <code>ld</code> để liên kết. Đây đúng là bốn giai đoạn bạn đã học ở Bài 15, nhìn từ phía các chương trình thật sự thực hiện chúng.' },

    { q: 'Bạn gõ <code>nm hello.o</code> bằng công cụ native trên một file <code>.o</code> ARM64 và nó in ra bảng ký hiệu đúng. Kết luận nào là đúng?',
      opts: [
        'Công cụ native dùng được cho mọi file, tiền tố chỉ là thói quen gõ cho đẹp',
        '<code>nm</code> chỉ đọc vỏ ELF nên chạy được, nhưng <code>objdump</code> và <code>strip</code> vẫn sẽ hỏng vì chúng cần hiểu bảng lệnh',
        'File <code>.o</code> đó thật ra đã bị dịch nhầm sang x86-64',
        '<code>nm</code> tự động gọi bản cross tương ứng khi phát hiện kiến trúc lạ'
      ], a: 1,
      why: 'Khuôn dạng ELF — header, danh sách section, bảng ký hiệu — giống nhau ở mọi kiến trúc, nên đọc tên hàm không cần biết ISA. Ngược lại, dịch ngược mã lệnh hay gỡ ký hiệu thì phải hiểu từng byte opcode, và bản x86-64 trả lời thẳng <code>architecture UNKNOWN</code>. Đây là cái bẫy: vài công cụ chạy được khiến bạn tưởng cả bộ đều dùng được, rồi Makefile hỏng ở giữa chừng.' },

    { q: 'Trong <code>arm-linux-gnueabihf</code>, phần <code>gnu</code> mang thông tin gì?',
      opts: [
        'Mã nguồn của trình biên dịch theo giấy phép GNU',
        'Thư viện C là glibc — một toolchain musl sẽ tên là <code>arm-linux-musleabihf</code>',
        'Trình liên kết dùng là GNU <code>ld</code> chứ không phải LLVM <code>lld</code>',
        'Hệ điều hành đích là GNU/Linux chứ không phải Android'
      ], a: 1,
      why: 'Phần cuối bộ ba mô tả <b>môi trường</b>, mà thành phần quan trọng nhất của môi trường là thư viện C. <code>gnu</code> = glibc, <code>musl</code> = musl, <code>uclibc</code> = uClibc-ng. Điều này rất thực tế: nhị phân dịch bằng toolchain glibc không chạy trên rootfs musl, nên cái tên là thứ đầu tiên bạn phải đối chiếu khi nhận toolchain từ nhà sản xuất board.' },

    { q: 'Trình liên kết báo <code>error: mixed uses VFP register arguments, fadd-soft.o does not</code>. Cả hai file đều là mã ARM 32-bit hợp lệ. Vì sao vẫn không ghép được?',
      opts: [
        'Vì hai file được dịch bằng hai phiên bản GCC khác nhau',
        'Vì một file truyền tham số số thực qua thanh ghi VFP, file kia qua thanh ghi số nguyên — hai giao ước gọi hàm không tương thích',
        'Vì file softfp thiếu <code>libgcc</code>',
        'Vì <code>fadd-soft.o</code> được dịch cho ARM64 chứ không phải ARM32'
      ], a: 1,
      why: 'Kiến trúc giống nhau không có nghĩa là ABI giống nhau. Hard-float đặt tham số vào <code>s0</code>/<code>s1</code>, softfp đặt vào <code>r0</code>/<code>r1</code>. Nếu ghép được, chương trình sẽ chạy và in ra số rác chứ không sập — nên <code>ld</code> chặn ngay lúc liên kết là hành vi đúng, và <code>readelf -A</code> cho bạn xem thuộc tính <code>Tag_ABI_VFP_args</code> để tự kiểm tra trước.' },

    { q: 'Đồng nghiệp báo: "Dịch cho ARM 32-bit thì chương trình quản lý bộ nhớ của tôi trả về địa chỉ sai, còn trên máy bàn thì chạy đúng. Không có cảnh báo nào lúc dịch." Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Thiếu <code>libgcc</code> nên phép cộng con trỏ bị hỏng',
        'Mã lưu con trỏ vào <code>long</code>: x86-64 là LP64 nên vừa 8 byte, ARM32 là ILP32 nên <code>long</code> chỉ 4 byte và giá trị bị cắt cụt',
        'Sysroot dùng nhầm header của x86-64',
        'Trình liên kết đệm segment theo trang 64 KB làm lệch địa chỉ'
      ], a: 1,
      why: 'Đây là loại lỗi tệ nhất khi chuyển sang nhúng vì trình biên dịch không có gì để cảnh báo — trên ARM32 <code>sizeof(long)</code> hợp lệ, chỉ là bằng 4. Mã viết trên máy bàn dễ ngầm giả định <code>long</code> chứa vừa một con trỏ. Cách phòng: dùng <code>uintptr_t</code> trong <code>&lt;stdint.h&gt;</code>, và đặt <code>_Static_assert</code> như Bài 25 để lỗi nổ ra lúc dịch. Phương án cuối sai vì phần đệm chỉ ảnh hưởng kích thước file, không làm sai con trỏ trong chương trình.' },

    { q: '<code>hello</code> bản ARM64 nặng <b>70 448</b> byte, nhưng <code>size</code> báo phần <code>text</code> chỉ <b>1 642</b> byte. Thêm <code>-Wl,-z,max-page-size=4096</code> thì file còn <b>9 008</b> byte, <code>text</code> vẫn <b>1 642</b>. Giải thích đúng là gì?',
      opts: [
        'Trình liên kết đã loại bỏ mã chết khi biết kích thước trang nhớ',
        'Phần chênh lệch là số 0 đệm để căn lề segment theo trang 64 KB — mặc định an toàn của ARM64; đổi sang 4 KB thì phần đệm co lại, mã không đổi',
        'Bản 64 KB liên kết tĩnh còn bản 4 KB liên kết động',
        '<code>size</code> không đếm được phần dữ liệu nên hai con số không so sánh được'
      ], a: 1,
      why: 'ARM64 cho phép nhân chạy trang 4 KB, 16 KB hoặc 64 KB; trình liên kết không biết board dùng cỡ nào nên chọn cỡ lớn nhất cho an toàn, làm mỗi segment bị căn lề theo 65 536 byte. <code>readelf -l</code> hiện đúng con số đó ở cột căn lề: <code>0x10000</code> so với <code>0x1000</code>. Bài học rộng hơn: một tuỳ chọn mặc định có thể chi phối kích thước sản phẩm mạnh hơn mã bạn viết — nhưng chỉ ép nó khi đã đối chiếu cấu hình trang nhớ của nhân.' },

    { q: 'Bạn dịch mã cho ARM32 và gặp <code>undefined reference to `__aeabi_ldivmod\'</code>. Ký hiệu này không có trong mã nguồn của bạn. Nó từ đâu ra và ai cung cấp?',
      opts: [
        'Do thư viện C sinh ra; thêm <code>-lc</code> là xong',
        'Do trình biên dịch sinh ra để thay phép chia 64-bit mà ARM32 không có lệnh làm; <code>libgcc</code> cung cấp nó',
        'Do bạn dùng nhầm header của kiến trúc khác; sửa sysroot là hết',
        'Do trình liên kết bản native; đổi sang bản có tiền tố là hết'
      ], a: 1,
      why: 'Một dấu <code>/</code> giữa hai biến <code>long long</code> biến thành <code>bl __aeabi_ldivmod</code> vì CPU ARM32 không có lệnh chia 64-bit. Thư viện C <b>không</b> chứa hàm này — <code>libgcc</code> chứa, và nó được liên kết vào tự động khi bạn liên kết qua driver <code>gcc</code>. Lỗi này thường xuất hiện khi tự gọi <code>ld</code> trực tiếp, và bạn sẽ gặp lại đúng dạng ký hiệu <code>__aeabi_…</code> hoặc <code>__udivdi3</code> khi build kernel module ở Chặng 10.' }
  ]
});

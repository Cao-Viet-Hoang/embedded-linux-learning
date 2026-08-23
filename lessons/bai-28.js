/* Bài 28 — Tự build toolchain với crosstool-NG
   Chặng 04 — Cross-compilation */

Lesson.register({
  id: 'bai-28',
  title: 'Tự build toolchain với crosstool-NG',
  minutes: 70,
  practice: 'Thực hành 120 phút',
  level: 'Nâng cao',

  intro:
    '<p>Ba bài vừa rồi bạn dùng một toolchain do <code>apt</code> đưa cho. Nó tiện, và nó âm thầm ' +
    'quyết định hộ bạn bốn thứ: GCC <b>15.2.0</b>, glibc <b>2.43</b>, binutils <b>2.46</b>, và bộ ' +
    'header nhân của Ubuntu. Bốn quyết định đó không sai — chúng chỉ không phải của bạn.</p>' +
    '<p>Bài này đảo ngược quan hệ ấy. Bạn sẽ dùng <b>crosstool-NG</b> để tự dựng một toolchain ' +
    'ARM64 mà mọi thành phần đều do bạn chọn: binutils <b>2.45</b>, GCC <b>15.2.0</b>, header nhân ' +
    '<b>6.16</b>, và — điểm quan trọng nhất — thư viện C là <b>musl 1.2.5</b> thay vì glibc.</p>' +
    '<p>Trên đường đi bạn sẽ gặp một bài toán mà mọi kỹ sư nhúng đều phải hiểu ít nhất một lần: ' +
    '<b>con gà và quả trứng</b>. Muốn build thư viện C thì cần trình biên dịch; muốn build trình ' +
    'biên dịch đầy đủ thì cần thư viện C. crosstool-NG gỡ vòng lặp đó bằng <b>19 bước</b> có thứ ' +
    'tự chặt chẽ, và bạn sẽ đọc được từng bước làm gì.</p>' +
    '<p>Phần thưởng là một con số đo trên chính <code>temp_daemon.c</code> của Bài 27. Bản tĩnh ' +
    'dựng bằng glibc nặng <b>795 224</b> byte. Bạn sẽ dịch lại đúng chương trình đó bằng toolchain ' +
    'musl vừa dựng và tự đọc con số mới.</p>',

  goals: [
    'Kể ra bốn tình huống mà toolchain của <code>apt</code> không dùng được, và giải thích vì sao',
    'Giải thích bài toán con gà — quả trứng của việc build toolchain và cách bootstrap ba giai đoạn gỡ nó',
    'Đọc được danh sách 19 bước của crosstool-NG và nói đúng vai trò của <code>cc_core</code>, <code>libc_headers</code> và <code>cc_for_host</code>',
    'Cài đủ phụ thuộc, build <code>ct-ng</code>, chọn một sample và đọc hiểu các tuỳ chọn quan trọng trong <code>.config</code>',
    'Build trọn một toolchain <code>aarch64-unknown-linux-musl</code> và kiểm chứng nó bằng nhiều cách độc lập',
    'So sánh bằng số nhị phân dựng bởi glibc và bởi musl, và giải thích chênh lệch đến từ đâu',
    'Chẩn đoán được các lỗi build thường gặp qua <code>build.log</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VÌ SAO PHẢI TỰ BUILD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao lại phải tự build toolchain?' },

    { t: 'p', x:
      'Câu hỏi này đáng được trả lời trước khi bạn bỏ ra một giờ để build. Nếu ' +
      '<code>apt install gcc-aarch64-linux-gnu</code> giải quyết được việc, thì đừng làm gì thêm. ' +
      'Vấn đề là có bốn tình huống rất phổ biến trong nghề mà nó <b>không</b> giải quyết được.' },

    { t: 'table',
      head: ['Tình huống', 'Vì sao toolchain của <code>apt</code> hỏng', 'Tự build thì sao'],
      rows: [
        ['<b>Rootfs của board dùng musl hoặc uClibc-ng</b>',
         'Toolchain Ubuntu chỉ có glibc. Nhị phân glibc tìm <code>/lib/ld-linux-aarch64.so.1</code> và <code>libc.so.6</code> — rootfs musl không có file nào trong hai file đó',
         'Chọn <code>CT_LIBC="musl"</code>, nhận về toolchain sinh nhị phân dùng đúng thư viện C của target'],
        ['<b>Board chạy nhân cũ hơn máy build</b>',
         'Header nhân của Ubuntu khai báo các syscall và hằng số của nhân mới. Chương trình dịch xong gọi một syscall nhân board không có, và chỉ chết lúc chạy',
         'Đặt <code>CT_LINUX_VERSION</code> đúng bằng nhân của board — sai sót bị chặn ngay lúc dịch'],
        ['<b>Bản build phải lặp lại được sau 5 năm</b>',
         'Ubuntu 26.04 hôm nay cho GCC 15.2.0; bản Ubuntu kế tiếp cho phiên bản khác. Không có cách nào ghim',
         'File <code>.config</code> ghim chính xác từng phiên bản. Cùng một file, cùng một toolchain'],
        ['<b>Cần thứ Ubuntu không đóng gói</b>',
         'Ví dụ: kiến trúc lạ, ABI hiếm, cần Fortran hoặc Ada, cần một bản GCC vá riêng cho SoC',
         'crosstool-NG cho phép chọn kiến trúc, ABI, ngôn ngữ, và áp patch của riêng bạn']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao "phiên bản header nhân" lại quan trọng đến thế?',
      x: '<p>Thư viện C không tự nghĩ ra giao diện với nhân — nó đọc từ bộ header do chính nhân ' +
         'xuất ra (<code>make headers_install</code>, bạn sẽ chạy lệnh này ở Chặng 07). Bộ header ' +
         'ấy khai báo số hiệu syscall, các hằng số <code>ioctl</code>, các cấu trúc dữ liệu trao ' +
         'đổi với nhân.</p>' +
         '<p>Nhân Linux giữ lời hứa <b>một chiều</b>: chương trình dịch cho nhân cũ chạy được ' +
         'trên nhân mới. Chiều ngược lại thì không. Nếu bạn dịch bằng header 6.16 rồi nạp lên ' +
         'board chạy nhân 5.10, chương trình có thể gọi một syscall chưa tồn tại và nhận ' +
         '<code>ENOSYS</code> — đúng loại lỗi bạn đã thấy trong <code>-strace</code> ở Bài 27, ' +
         'nhưng lần này glibc <b>không</b> có đường lùi.</p>' +
         '<p>Nguyên tắc: <b>build với header của nhân cũ nhất mà bạn phải hỗ trợ</b>.</p>' },

    { t: 'cal', kind: 'info', title: 'Bạn không phải lúc nào cũng tự build — và đó là điều bình thường',
      x: '<p>Trong công việc thật, toolchain thường tới từ ba nguồn: nhà sản xuất SoC phát hành ' +
         'sẵn (Linaro, ARM GNU Toolchain, bản của NXP hay TI), Buildroot/Yocto tự dựng khi bạn ' +
         'build ảnh, hoặc bạn tự dựng bằng crosstool-NG.</p>' +
         '<p>Nắm bài này quan trọng ngay cả khi bạn dùng hai nguồn kia — vì Buildroot ở Chặng 11 ' +
         'thật ra <i>cũng</i> chạy đúng chuỗi bước bạn sắp thấy, chỉ là giấu nó đi. Khi bản build ' +
         'Buildroot gãy ở bước dựng toolchain, người đọc hiểu được <code>build.log</code> là ' +
         'người sửa được.</p>' },

    /* ══════════════════════════════════════════════
       2. CON GÀ VÀ QUẢ TRỨNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bài toán con gà và quả trứng' },

    { t: 'p', x:
      'Trước khi xem crosstool-NG làm gì, hãy tự đặt mình vào chỗ của nó. Bạn muốn có một GCC ' +
      'sinh mã ARM64. Để build GCC đầy đủ, quá trình build cần dịch được ' +
      '<code>libgcc</code> — mà <code>libgcc</code> lại dùng vài hàm và header của thư viện C. ' +
      'Vậy phải có thư viện C ARM64 trước.' },

    { t: 'p', x:
      'Nhưng để build thư viện C ARM64, bạn cần một trình biên dịch sinh được mã ARM64. Tức là ' +
      'cần GCC trước. Vòng lặp đóng lại:' },

    { t: 'fig', cap:
      'Vòng phụ thuộc được cắt bằng <code>cc_core</code> — một GCC què chỉ đủ sức dịch thư viện C. ' +
      'Đây là ý tưởng trung tâm của mọi hệ thống dựng toolchain, kể cả Buildroot và Yocto.',
      svg:
      '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ vòng phụ thuộc giữa GCC và thư viện C, và cách bootstrap ba giai đoạn cắt vòng đó">' +
      '<text class="d-t" x="170" y="20" text-anchor="middle">Vòng phụ thuộc</text>' +
      '<rect class="d-box-w" x="55" y="34" width="230" height="40" rx="6"/>' +
      '<text class="d-t" x="170" y="59" text-anchor="middle">GCC đầy đủ (cần libc)</text>' +
      '<line class="d-line" x1="285" y1="54" x2="310" y2="54"/>' +
      '<line class="d-line" x1="310" y1="54" x2="310" y2="140"/>' +
      '<line class="d-line" x1="310" y1="140" x2="285" y2="140"/>' +
      '<path class="d-arrow" d="M283 140 L294 136 L294 145 Z"/>' +
      '<rect class="d-box-w" x="55" y="120" width="230" height="40" rx="6"/>' +
      '<text class="d-t" x="170" y="145" text-anchor="middle">libc ARM64 (cần GCC)</text>' +
      '<line class="d-line" x1="55" y1="140" x2="30" y2="140"/>' +
      '<line class="d-line" x1="30" y1="140" x2="30" y2="54"/>' +
      '<line class="d-line" x1="30" y1="54" x2="53" y2="54"/>' +
      '<path class="d-arrow" d="M55 54 L44 50 L44 59 Z"/>' +
      '<text class="d-ts" x="170" y="190" text-anchor="middle">không có điểm bắt đầu</text>' +

      '<text class="d-t" x="530" y="20" text-anchor="middle">Cách cắt vòng</text>' +
      '<rect class="d-box" x="380" y="30" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="51" text-anchor="middle">1 · binutils — as và ld cho ARM64, không cần libc</text>' +
      '<line class="d-line" x1="530" y1="66" x2="530" y2="76"/>' +
      '<path class="d-arrow" d="M530 78 L525 67 L535 67 Z"/>' +
      '<rect class="d-box" x="380" y="78" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="99" text-anchor="middle">2 · libc_headers + kernel_headers — chỉ file .h</text>' +
      '<line class="d-line" x1="530" y1="114" x2="530" y2="124"/>' +
      '<path class="d-arrow" d="M530 126 L525 115 L535 115 Z"/>' +
      '<rect class="d-box-p" x="380" y="126" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="147" text-anchor="middle">3 · cc_core — GCC què: chỉ C, không libgcc đầy đủ</text>' +
      '<line class="d-line" x1="530" y1="162" x2="530" y2="172"/>' +
      '<path class="d-arrow" d="M530 174 L525 163 L535 163 Z"/>' +
      '<rect class="d-box-a" x="380" y="174" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="195" text-anchor="middle">4 · libc_main — musl được dịch bằng cc_core</text>' +
      '<line class="d-line" x1="530" y1="210" x2="530" y2="220"/>' +
      '<path class="d-arrow" d="M530 222 L525 211 L535 211 Z"/>' +
      '<rect class="d-box-g" x="380" y="222" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="243" text-anchor="middle">5 · cc_for_host — GCC đầy đủ, có libc để dựa vào</text>' +
      '<line class="d-line" x1="530" y1="258" x2="530" y2="268"/>' +
      '<path class="d-arrow" d="M530 270 L525 259 L535 259 Z"/>' +
      '<rect class="d-box-g" x="380" y="270" width="300" height="34" rx="6"/>' +
      '<text class="d-ts" x="530" y="291" text-anchor="middle">6 · libc_post_cc + debug — hoàn thiện, thêm gdb</text>' +
      '<text class="d-ts" x="530" y="320" text-anchor="middle">mỗi bước chỉ cần thứ bước trước đã tạo ra</text>' +
      '</svg>' },

    { t: 'p', x:
      'Chìa khoá nằm ở bước 3. <code>cc_core</code> là một GCC <b>cố ý làm què</b>: nó biết sinh ' +
      'mã ARM64 và biết gọi <code>as</code>/<code>ld</code>, nhưng chưa có <code>libgcc</code> ' +
      'đầy đủ, chưa hỗ trợ C++, chưa có thư viện chạy kèm. Chừng đó là vừa đủ để dịch mã nguồn ' +
      'của musl — và musl được viết cẩn thận để không đòi hỏi gì hơn.' },

    { t: 'cal', kind: 'info', title: 'Đây không phải chuyện riêng của cross-compile',
      x: '<p>Cùng bài toán ấy tồn tại ở quy mô lớn hơn nhiều: GCC được viết bằng C++, nên muốn ' +
         'build GCC phải có sẵn một trình biên dịch C++. Trình biên dịch C++ đầu tiên đến từ đâu? ' +
         'Câu trả lời là một chuỗi bootstrap kéo dài hàng chục năm, bắt đầu từ những trình biên ' +
         'dịch viết tay bằng assembly.</p>' +
         '<p>Trong bản build của bạn, dấu vết của chuỗi ấy hiện ra ở các bước ' +
         '<code>*_for_build</code>: crosstool-NG dựng trước một bộ công cụ <i>cho chính máy ' +
         'build</i>, để không phụ thuộc vào phiên bản công cụ của Ubuntu. Nhờ vậy cùng một ' +
         '<code>.config</code> cho ra cùng một toolchain, dù bạn chạy trên Ubuntu hay Fedora.</p>' },

    /* ══════════════════════════════════════════════
       3. 19 BƯỚC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '19 bước, đọc được từng bước' },

    { t: 'p', x:
      'crosstool-NG không giấu quy trình. Lệnh <code>ct-ng list-steps</code> in ra toàn bộ, đúng ' +
      'thứ tự thực hiện:' },

    { t: 'code', where: 'wsl', code:
      'ct-ng list-steps' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Available build steps, in order:\n' +
      '  - companion_tools_for_build\n' +
      '  - companion_libs_for_build\n' +
      '  - binutils_for_build\n' +
      '  - companion_tools_for_host\n' +
      '  - companion_libs_for_host\n' +
      '  - binutils_for_host\n' +
      '  - linker\n' +
      '  - libc_headers\n' +
      '  - kernel_headers\n' +
      '  - cc_core\n' +
      '  - libc_main\n' +
      '  - cc_for_build\n' +
      '  - cc_for_host\n' +
      '  - libc_post_cc\n' +
      '  - companion_libs_for_target\n' +
      '  - binutils_for_target\n' +
      '  - debug\n' +
      '  - test_suite\n' +
      '  - finish\n' +
      'Use "<step>" as action to execute only that step.\n' +
      'Use "+<step>" as action to execute up to that step.\n' +
      'Use "<step>+" as action to execute from that step onward.' },

    { t: 'p', x:
      'Mười chín cái tên, nhưng chỉ có ba khái niệm cần nắm. Ba hậu tố ' +
      '<code>_for_build</code> / <code>_for_host</code> / <code>_for_target</code> chính là bộ ba ' +
      '<b>build – host – target</b> mà Bài 25 đã định nghĩa:' },

    { t: 'table',
      head: ['Hậu tố', 'Chạy ở đâu', 'Sinh mã cho', 'Trong bản build này'],
      rows: [
        ['<code>_for_build</code>', 'Máy build', 'Máy build', 'Công cụ tạm để crosstool-NG tự dùng, không phụ thuộc phiên bản của Ubuntu'],
        ['<code>_for_host</code>', 'Máy build', '<b>Target</b>', '<b>Đây là toolchain bạn sẽ dùng.</b> "Host" nghĩa là máy sẽ <i>chạy</i> toolchain — chính là WSL của bạn'],
        ['<code>_for_target</code>', 'Target', 'Target', 'Toolchain native chạy <i>trên</i> board — chỉ dựng khi bạn bật, thường không cần']
      ]},

    { t: 'cal', kind: 'warn', title: 'Chữ "host" ở đây rất dễ hiểu ngược',
      x: '<p>Trong ngôn ngữ của Autotools mà crosstool-NG dùng theo, <b>host</b> là máy mà chương ' +
         'trình sẽ <i>chạy trên đó</i>, không phải máy làm ra nó. Toolchain của bạn chạy trên ' +
         'WSL, nên WSL là host; nó sinh mã cho ARM64, nên ARM64 là target.</p>' +
         '<p>Vì thế <code>cc_for_host</code> — nghe như "trình biên dịch cho máy tôi" — thật ra ' +
         'chính là <b>trình biên dịch cross</b> mà bạn muốn. Còn <code>cc_for_build</code> mới là ' +
         'trình biên dịch native tạm thời. Nhầm hai cái này khiến người ta đọc ' +
         '<code>build.log</code> mà không hiểu bước nào đang chạy.</p>' },

    { t: 'table',
      head: ['Bước', 'Nó làm gì', 'Vì sao nằm ở đúng chỗ đó'],
      rows: [
        ['<code>binutils_for_host</code>', 'Dựng <code>as</code>, <code>ld</code>, <code>objdump</code>… cho ARM64', 'Phải có trước mọi thứ, vì trình biên dịch nào cũng cần một trình hợp dịch để gọi'],
        ['<code>kernel_headers</code>', 'Giải nén nhân Linux 6.16 và chạy <code>make headers_install</code>', 'Thư viện C cần biết giao diện syscall trước khi dịch được dòng nào'],
        ['<code>libc_headers</code>', 'Cài phần header của musl vào sysroot', 'GCC ở bước sau cần <code>&lt;stdio.h&gt;</code> tồn tại, dù nội dung thư viện chưa có'],
        ['<b><code>cc_core</code></b>', 'GCC giai đoạn 1 — chỉ ngôn ngữ C, không <code>libgcc</code> đầy đủ', '<b>Đây là nhát cắt vòng lặp.</b> Đủ sức dịch musl, không hơn'],
        ['<b><code>libc_main</code></b>', 'Dịch trọn musl bằng <code>cc_core</code>', 'Sau bước này sysroot đã có thư viện C thật'],
        ['<b><code>cc_for_host</code></b>', 'GCC giai đoạn 2 — đầy đủ, có C++, có <code>libgcc</code> hoàn chỉnh', 'Giờ đã có libc để dựa vào, nên GCC dựng được mọi thứ'],
        ['<code>debug</code>', 'Dựng <code>gdb</code> 16.3 biết đọc nhị phân ARM64', 'Cần toolchain hoàn chỉnh mới build được; bạn dùng nó ở Chặng 12'],
        ['<code>finish</code>', 'Tạo symlink, đặt quyền chỉ đọc cho thư mục kết quả', 'Chống sửa nhầm vào toolchain đã dựng — một sai lầm không thể lần ra']
      ]},

    { t: 'cal', kind: 'tip', title: 'Cú pháp <code>+step</code> và <code>step+</code> cứu bạn rất nhiều thời gian',
      x: '<p>Bản build mất khoảng một giờ. Khi nó gãy ở bước <code>libc_main</code>, bạn không ' +
         'muốn chạy lại từ đầu.</p>' +
         '<ul>' +
         '<li><code>ct-ng +cc_core</code> — chạy tới hết <code>cc_core</code> rồi dừng.</li>' +
         '<li><code>ct-ng libc_main+</code> — chạy từ <code>libc_main</code> trở đi.</li>' +
         '<li><code>ct-ng libc_main</code> — chạy đúng một bước đó.</li>' +
         '</ul>' +
         '<p>Muốn dùng được, phải bật lưu trạng thái giữa các bước: trong <code>menuconfig</code> ' +
         'là <i>Paths and misc options → Debug crosstool-NG → Save intermediate steps</i>. Nó tốn ' +
         'thêm khá nhiều dung lượng đĩa, nên chỉ bật khi đang thử nghiệm cấu hình.</p>' },

    /* ══════════════════════════════════════════════
       4. CROSSTOOL-NG LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'crosstool-NG: kconfig cộng với một tập kịch bản shell' },

    { t: 'p', x:
      'Đừng hình dung crosstool-NG là một chương trình lớn. Nó là <b>một tập kịch bản shell</b> ' +
      'biết tải mã nguồn, áp patch, chạy <code>./configure &amp;&amp; make</code> theo đúng thứ ' +
      'tự — cộng với <b>kconfig</b>, chính hệ thống cấu hình menu mà nhân Linux dùng. Bạn sẽ gặp ' +
      'lại kconfig ở BusyBox (Chặng 09), ở nhân (Chặng 07) và ở Buildroot (Chặng 11). Học nó một ' +
      'lần ở đây là học cho cả bốn chỗ.' },

    { t: 'table',
      head: ['Thành phần', 'Vai trò'],
      rows: [
        ['<code>ct-ng</code>', 'Một <b>Makefile</b> được sinh ra lúc <code>./configure</code>. Mọi thứ bạn gõ đều là một target của nó: <code>ct-ng menuconfig</code>, <code>ct-ng build</code>, <code>ct-ng list-steps</code>'],
        ['<code>samples/</code>', 'Các cấu hình mẫu đã được cộng đồng kiểm chứng. Bản 1.28.0 có <b>146</b> sample, trong đó <b>15</b> cho <code>aarch64</code>'],
        ['<code>.config</code>', 'Cấu hình của <i>bạn</i>, do kconfig sinh ra. <b>931 dòng</b>, trong đó <b>513</b> dòng là tuỳ chọn <code>CT_*</code> thật sự'],
        ['<code>.build/</code>', 'Nơi tải, giải nén, và biên dịch. Phình lên khoảng <b>4,7 GB</b> rồi được dọn ở bước <code>finish</code>'],
        ['<code>build.log</code>', 'Nhật ký đầy đủ mọi lệnh đã chạy. Đây là thứ bạn đọc khi build gãy'],
        ['<code>~/x-tools/&lt;target&gt;/</code>', 'Kết quả cuối cùng — toolchain dùng được, thư mục bị đặt quyền chỉ đọc']
      ]},

    { t: 'p', x:
      'Cách làm việc thực tế là <b>không bao giờ bắt đầu từ con số không</b>. Bạn nạp một sample ' +
      'gần giống nhu cầu, rồi mở <code>menuconfig</code> sửa vài chỗ. Danh sách sample cho ARM64 ' +
      'trông như sau:' },

    { t: 'code', where: 'wsl', code:
      './ct-ng list-samples | grep aarch64' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[L...]   aarch64-ol7u9-linux-gnu\n' +
      '[L...]   aarch64-ol8u10-linux-gnu\n' +
      '[L...]   aarch64-ol8u6-linux-gnu\n' +
      '[L...]   aarch64-ol8u7-linux-gnu\n' +
      '[L...]   aarch64-ol8u8-linux-gnu\n' +
      '[L...]   aarch64-ol8u9-linux-gnu\n' +
      '[L...]   aarch64-ol9u2-linux-gnu\n' +
      '[L...]   aarch64-ol9u3-linux-gnu\n' +
      '[L...]   aarch64-ol9u4-linux-gnu\n' +
      '[L...]   aarch64-ol9u5-linux-gnu\n' +
      '[L...]   aarch64-rpi3-linux-gnu\n' +
      '[L...]   aarch64-rpi4-linux-gnu\n' +
      '[L...]   aarch64-unknown-linux-gnu\n' +
      '[L...]   aarch64-unknown-linux-musl\n' +
      '[L...]   aarch64-unknown-linux-uclibc' },

    { t: 'p', x:
      'Ba cái tên cuối cho thấy đúng lựa chọn thư viện C mà Bài 25 đã giới thiệu: ' +
      '<code>gnu</code> là glibc, rồi <code>musl</code>, rồi <code>uclibc</code>. Hai cái ' +
      '<code>rpi3</code>/<code>rpi4</code> là ví dụ về trường <b>vendor</b> trong bộ tứ ' +
      '<code>arch-vendor-os-libc</code> — chúng ghim sẵn phiên bản header nhân hợp với Raspberry Pi.' },

    { t: 'cal', kind: 'tip', title: 'Bốn ký tự trong ngoặc vuông có nghĩa',
      x: '<p><code>[L...]</code> đọc theo từng vị trí: <b>L</b> = sample <i>local</i>, đi kèm ' +
         'crosstool-NG (đối lại <b>G</b> = sample của bạn nằm trong thư mục làm việc). Ba dấu ' +
         'chấm còn lại sẽ thành <b>X</b> nếu sample bị đánh dấu là thử nghiệm, <b>B</b> nếu đang ' +
         'hỏng, <b>O</b> nếu đã lỗi thời. Toàn dấu chấm nghĩa là sample lành lặn — hãy ưu tiên ' +
         'những sample như vậy.</p>' },

    /* ══════════════════════════════════════════════
       5. ĐỌC .config
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đọc <code>.config</code>: 513 tuỳ chọn, 12 dòng đáng nhớ' },

    { t: 'p', x:
      'Sau khi nạp sample, toàn bộ quyết định nằm trong một file văn bản. Bạn không cần hiểu 513 ' +
      'dòng — chỉ cần biết mười hai dòng dưới đây, vì đó là những dòng bạn sẽ sửa trong đời làm việc.' },

    { t: 'code', where: 'wsl', code:
      "grep -nE '^CT_(ARCH=|ARCH_BITNESS|TARGET_VENDOR=|LINUX_VERSION|BINUTILS_VERSION|LIBC=|MUSL_VERSION|GCC_VERSION|GDB_VERSION|CC_LANG_CXX|PARALLEL_JOBS|PREFIX_DIR=)' .config" },

    { t: 'code', where: 'out', nocopy: true, code:
      '56:CT_PREFIX_DIR="${CT_PREFIX:-${HOME}/x-tools}/${CT_HOST:+HOST-${CT_HOST}/}${CT_TARGET}"\n' +
      '97:CT_PARALLEL_JOBS=0\n' +
      '147:CT_ARCH="arm"\n' +
      '179:CT_ARCH_BITNESS=64\n' +
      '216:CT_TARGET_VENDOR=""\n' +
      '303:CT_LINUX_VERSION="6.16"\n' +
      '379:CT_BINUTILS_VERSION="2.45"\n' +
      '422:CT_LIBC="musl"\n' +
      '450:CT_MUSL_VERSION="1.2.5"\n' +
      '517:CT_GCC_VERSION="15.2.0"\n' +
      '601:CT_CC_LANG_CXX=y\n' +
      '636:CT_GDB_VERSION="16.3"' },

    { t: 'table',
      head: ['Tuỳ chọn', 'Nghĩa', 'Khi nào bạn phải sửa'],
      rows: [
        ['<code>CT_ARCH="arm"</code> + <code>CT_ARCH_BITNESS=64</code>',
         'Kiến trúc ARM, chế độ 64 bit. Hai dòng này cộng lại mới ra <code>aarch64</code>',
         'Khi đổi sang MIPS, RISC-V, PowerPC… Đây là dòng đầu tiên phải đúng'],
        ['<code>CT_TARGET_VENDOR=""</code>',
         'Trường vendor để trống → crosstool-NG điền mặc định <code>unknown</code>, tạo ra <code>aarch64-<b>unknown</b>-linux-musl</code>',
         'Khi muốn đặt tên riêng cho toolchain của công ty, ví dụ <code>aarch64-acme-linux-musl</code>'],
        ['<code>CT_LINUX_VERSION="6.16"</code>',
         'Phiên bản nhân dùng để lấy header, <b>không</b> phải nhân sẽ chạy trên board',
         '<b>Rất hay phải sửa.</b> Đặt bằng hoặc thấp hơn nhân của board'],
        ['<code>CT_LIBC="musl"</code>',
         'Thư viện C. Quyết định này ảnh hưởng đến từng nhị phân board chạy về sau',
         'Phải khớp với rootfs. Đổi libc sau khi đã build rootfs là làm lại từ đầu'],
        ['<code>CT_BINUTILS_VERSION</code> / <code>CT_GCC_VERSION</code> / <code>CT_MUSL_VERSION</code> / <code>CT_GDB_VERSION</code>',
         'Ghim chính xác bốn phiên bản. Đây là thứ khiến bản build lặp lại được',
         'Khi cần một tính năng của GCC mới, hoặc khi mã nguồn của SoC chỉ dịch được bằng GCC cũ'],
        ['<code>CT_CC_LANG_CXX=y</code>',
         'Bật C++. Kéo theo <code>libstdc++</code> cho target',
         'Tắt đi nếu chắc chắn không dùng C++ — tiết kiệm thời gian build và dung lượng'],
        ['<code>CT_PARALLEL_JOBS=0</code>',
         '<code>0</code> nghĩa là tự dò số CPU. Trên máy này là <b>6</b>',
         'Đặt số nhỏ hơn khi RAM ít — mỗi tiến trình <code>cc1plus</code> ăn khá nhiều bộ nhớ'],
        ['<code>CT_PREFIX_DIR</code>',
         'Nơi cài kết quả. Biểu thức shell này giải ra thành <code>~/x-tools/aarch64-unknown-linux-musl</code>',
         'Khi muốn cài vào <code>/opt</code> để cả nhóm dùng chung']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao <code>CT_ARCH</code> lại là <code>"arm"</code> chứ không phải <code>"aarch64"</code>?',
      x: '<p>Vì trong cây mã nguồn của GCC, binutils và nhân Linux, ARM 32 bit và ARM 64 bit dùng ' +
         'chung một họ nhưng khác chế độ. crosstool-NG giữ cách phân loại đó: ' +
         '<code>CT_ARCH="arm"</code> chọn họ, <code>CT_ARCH_BITNESS=64</code> chọn chế độ, và bộ ' +
         'kịch bản tự ghép ra chuỗi target <code>aarch64-…</code>.</p>' +
         '<p>Hệ quả thực tế: đừng cố sửa <code>CT_ARCH</code> thành <code>"aarch64"</code> bằng ' +
         'tay. Kconfig sẽ không nhận, và <code>ct-ng build</code> sẽ báo target không hợp lệ. Luôn ' +
         'sửa qua <code>ct-ng menuconfig</code> để các ràng buộc phụ thuộc được kiểm tra.</p>' },

    { t: 'cal', kind: 'warn', title: 'Đừng bao giờ build trên <code>/mnt/c</code>',
      x: '<p>Bài 1 đã đo: 500 lệnh <code>touch</code> mất <b>0,017 s</b> trong <code>~</code> và ' +
         '<b>0,882 s</b> trên <code>/mnt/c</code> — chậm <b>52 lần</b>. Bản build này tạo và xoá ' +
         'hàng trăm nghìn file.</p>' +
         '<p>Tệ hơn, <code>/mnt/c</code> là NTFS đi qua lớp 9P: nó không giữ đúng quyền Unix và ' +
         'không phân biệt hoa thường. Mã nguồn GCC có những cặp file chỉ khác nhau ở chữ hoa, nên ' +
         'bản build sẽ gãy giữa chừng với thông báo không liên quan gì tới nguyên nhân thật. Mọi ' +
         'thư mục trong bài này đều nằm dưới <code>~</code>.</p>' },

    /* ══════════════════════════════════════════════
       6. MUSL VS GLIBC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'musl và glibc: hai triết lý về cùng một chuẩn' },

    { t: 'p', x:
      'Bài 25 đã kể tên ba thư viện C. Giờ bạn sắp dựng một toolchain musl thật, nên cần biết ' +
      'chọn nó nghĩa là chọn gì. Cả hai đều hiện thực hoá cùng một chuẩn (ISO C và POSIX), nên ' +
      '<code>printf</code>, <code>open</code>, <code>pthread_create</code> đều có ở cả hai. Khác ' +
      'biệt nằm ở <b>những thứ ngoài chuẩn</b> và ở <b>cách đóng gói</b>.' },

    { t: 'table',
      head: ['', 'glibc', 'musl'],
      rows: [
        ['Mục tiêu thiết kế', 'Đầy đủ tính năng, nhanh trên máy chủ, tương thích ngược tuyệt đối', 'Nhỏ, đơn giản, đúng chuẩn, liên kết tĩnh sạch sẽ'],
        ['Liên kết tĩnh', 'Có, nhưng <code>getaddrinfo</code>/NSS vẫn cần <code>.so</code> lúc chạy — nguồn gốc cảnh báo bạn gặp ở Bài 27', 'Liên kết tĩnh là <b>trường hợp dùng chính</b>, không có NSS, không cảnh báo'],
        ['Phần mở rộng GNU', 'Rất nhiều: <code>__GLIBC__</code>, <code>error()</code>, <code>qsort_r</code> kiểu GNU, một số biến thể <code>strerror</code>', 'Chỉ những phần mở rộng phổ biến. Mã viết ẩu dựa vào phần mở rộng GNU sẽ không dịch được'],
        ['Kích thước nhị phân tĩnh', 'Lớn — bạn đã đo <b>795 224</b> byte ở Bài 27', 'Nhỏ hơn nhiều — chính là con số bạn sắp đo'],
        ['Xử lý ngôn ngữ / locale', 'Đầy đủ, tốn dung lượng', 'Chỉ UTF-8. Với thiết bị nhúng thường là đủ'],
        ['Ai dùng', 'Ubuntu, Debian, Fedora, phần lớn board có 512 MB RAM trở lên', 'Alpine Linux, container nhỏ, thiết bị nhúng eo hẹp bộ nhớ, OpenWrt (bản mới)']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao musl liên kết tĩnh lại "sạch" hơn glibc?',
      x: '<p>glibc tra cứu người dùng, nhóm và tên miền qua <b>NSS</b> (Name Service Switch): ' +
         '<code>/etc/nsswitch.conf</code> nói nên hỏi ai, rồi glibc <code>dlopen()</code> đúng ' +
         'plugin tương ứng — <code>libnss_files.so</code>, <code>libnss_dns.so</code>… Cơ chế đó ' +
         '<b>bắt buộc</b> phải nạp thư viện động lúc chạy, kể cả khi chương trình được liên kết ' +
         'tĩnh. Vì thế trình liên kết cảnh báo, và vì thế nhị phân tĩnh glibc có thể vẫn gãy trên ' +
         'một rootfs thiếu đúng bản glibc.</p>' +
         '<p>musl không có NSS. Nó đọc thẳng <code>/etc/passwd</code> và ' +
         '<code>/etc/resolv.conf</code>. Kém linh hoạt hơn — nhưng một nhị phân tĩnh musl thật sự ' +
         'là <b>một file duy nhất, chép đi đâu cũng chạy</b>. Với rootfs nhúng, đó chính xác là ' +
         'điều bạn muốn.</p>' },

    { t: 'cal', kind: 'warn', title: 'Cái giá của musl: mã nguồn của người khác',
      x: '<p>Rất nhiều dự án C được viết và thử nghiệm chỉ trên glibc. Khi dịch bằng musl bạn sẽ ' +
         'gặp những lỗi kiểu <code>error: unknown type name \'__u64\'</code>, ' +
         '<code>implicit declaration of function \'strlcpy\'</code>, hoặc mã kiểm tra ' +
         '<code>#ifdef __GLIBC__</code> rồi rơi vào nhánh sai.</p>' +
         '<p>Đó không phải lỗi của musl — đó là mã nguồn đã trót dựa vào phần mở rộng ngoài ' +
         'chuẩn. Alpine Linux duy trì một kho patch lớn cho đúng lý do này. Khi chọn musl cho một ' +
         'sản phẩm, hãy tính cả công vá những gói phụ thuộc.</p>' },

    /* ══════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: dựng toolchain aarch64-unknown-linux-musl' },

    { t: 'p', x:
      'Bảy bước dưới đây đi từ máy trắng đến một nhị phân ARM64 chạy được, dựng bằng toolchain do ' +
      'chính bạn làm ra. Bước 4 mất khoảng nửa giờ và bạn chỉ ngồi nhìn — hãy đọc trước bước 5 để ' +
      'biết mình đang chờ cái gì.' },

    { t: 'cal', kind: 'warn', title: 'Kiểm tra ba điều kiện trước khi bắt đầu',
      x: '<ul>' +
         '<li><b>Dung lượng đĩa:</b> thư mục <code>.build</code> phình tới <b>18 GB</b> ở đỉnh ' +
         '(có bật lưu trạng thái ở bước 3). Hãy có ít nhất <b>25 GB</b> trống.</li>' +
         '<li><b>Thư mục làm việc phải nằm trong <code>~</code></b>, tuyệt đối không phải ' +
         '<code>/mnt/c</code>.</li>' +
         '<li><b>Thời gian:</b> trên máy 6 CPU của bài này, tổng cộng khoảng <b>50 phút</b>. ' +
         'Đừng bắt đầu ngay trước khi phải tắt máy.</li>' +
         '</ul>' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Cài đủ phụ thuộc — đây là chỗ hay gãy nhất', blocks: [

        { t: 'p', x:
          'crosstool-NG không tự tải công cụ về. Nó giả định máy build đã có sẵn một bộ công cụ ' +
          'phát triển đầy đủ, và khi thiếu thì <code>./configure</code> dừng ngay. Cài hết một ' +
          'lượt để khỏi phải quay lại:' },

        { t: 'code', where: 'wsl', code:
          'sudo apt-get update\n' +
          'sudo apt-get install -y \\\n' +
          '    gcc g++ make libtool-bin libtool-doc autoconf automake \\\n' +
          '    texinfo help2man gperf bison flex \\\n' +
          '    libncurses-dev libstdc++6 patch \\\n' +
          '    unzip wget rsync bzip2 xz-utils \\\n' +
          '    python3 python3-dev meson ninja-build' },

        { t: 'cmdx', title: 'Vì sao lại cần đúng những gói này', cmd: 'apt-get install …', rows: [
          ['<code>texinfo</code>', 'Cung cấp <code>makeinfo</code>, dùng để dựng tài liệu của binutils và GCC', 'Thiếu gói này là lỗi số một của người build lần đầu'],
          ['<code>help2man</code>', 'Sinh trang <code>man</code> từ <code>--help</code>. Quy trình build của binutils gọi nó', ''],
          ['<code>gperf</code>', 'Sinh bảng băm hoàn hảo — GCC dùng để tra từ khoá', ''],
          ['<code>bison</code>, <code>flex</code>', 'Sinh bộ phân tích cú pháp và từ vựng cho chính GCC', 'GCC phân tích C bằng mã do bison sinh ra'],
          ['<code>libtool-bin</code>', 'Cho <code>libtoolize</code>. Gói <code>libtool</code> không kèm nhị phân này', 'Tên gói dễ nhầm'],
          ['<code>libncurses-dev</code>', 'Bắt buộc, vì <code>menuconfig</code> là giao diện ncurses', ''],
          ['<code>meson</code>, <code>ninja-build</code>', 'Vài thư viện đồng hành đời mới không còn dùng Autotools', 'Yêu cầu mới của crosstool-NG 1.28'],
          ['<code>rsync</code>', 'Bước <code>kernel_headers</code> dùng <code>rsync</code> để chép header vào sysroot', 'Thiếu là gãy ở bước 9/19, sau 16 phút chờ']
        ]},

        { t: 'p', x: 'Kiểm chứng rằng những công cụ then chốt đã thật sự có mặt:' },

        { t: 'code', where: 'wsl', code:
          'for t in makeinfo help2man gperf libtoolize bison flex meson ninja rsync; do\n' +
          '    printf \'%-12s %s\\n\' "$t" "$(command -v $t || echo MISSING)"\n' +
          'done' },

        { t: 'code', where: 'out', nocopy: true, code:
          'makeinfo     /usr/bin/makeinfo\n' +
          'help2man     /usr/bin/help2man\n' +
          'gperf        /usr/bin/gperf\n' +
          'libtoolize   /usr/bin/libtoolize\n' +
          'bison        /usr/bin/bison\n' +
          'flex         /usr/bin/flex\n' +
          'meson        /usr/bin/meson\n' +
          'ninja        /usr/bin/ninja\n' +
          'rsync        /usr/bin/rsync' },

        { t: 'cal', kind: 'tip', title: 'Kiểm tra trước rẻ hơn chờ rồi gãy',
          x: '<p>Không dòng nào trong chín dòng trên ghi <code>MISSING</code> — nghĩa là cả chín công ' +
             'cụ then chốt đã sẵn sàng, và bản build sắp chạy sẽ không gãy vì thiếu phụ thuộc. Nếu dù ' +
             'chỉ một dòng in ra <code>MISSING</code>, dừng lại và cài gói tương ứng trước khi đi ' +
             'tiếp.</p>' +
             '<p>Vòng lặp trên chạy mất chưa tới một giây. Một bản build gãy ở bước ' +
             '<code>binutils_for_host</code> vì thiếu <code>makeinfo</code> làm bạn mất 4 phút; ' +
             'gãy ở <code>kernel_headers</code> vì thiếu <code>rsync</code> làm bạn mất 16 phút. ' +
             'Thói quen "kiểm tra điều kiện đầu vào trước khi khởi động việc dài" đáng để mang ' +
             'sang mọi bản build sau này, kể cả nhân và Buildroot.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Tải và dựng chính <code>ct-ng</code>', blocks: [

        { t: 'p', x:
          'crosstool-NG bản thân nó cũng phải được build — nhưng chỉ mất khoảng một phút, vì đây ' +
          'chỉ là vài kịch bản shell cộng với giao diện <code>menuconfig</code> viết bằng C.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/embedded/bai28 && cd ~/embedded/bai28\n' +
          'wget https://crosstool-ng.github.io/download/crosstool-ng/crosstool-ng-1.28.0.tar.xz' },

        { t: 'p', x:
          'Kiểm tra file tải về trước khi động vào nó. Đây là thói quen bắt buộc với mọi thứ bạn ' +
          'tải từ Internet rồi cho chạy trên máy mình:' },

        { t: 'code', where: 'wsl', code:
          'ls -l crosstool-ng-1.28.0.tar.xz\n' +
          'sha256sum crosstool-ng-1.28.0.tar.xz' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 2448288 Aug  7 22:02 crosstool-ng-1.28.0.tar.xz\n' +
          '5750e29a2bda5cd8d67900592576b1670a1987a4dcd5e4f6beae09138a1f5699  crosstool-ng-1.28.0.tar.xz',
          notes: ['Tên người dùng và ngày giờ sẽ khác trên máy bạn; hai giá trị phải giống hệt là kích thước file và chuỗi sha256.'] },

        { t: 'cal', kind: 'why', title: 'Vì sao chạy <code>sha256sum</code> — và vì sao con số này một mình chưa đủ',
          x: '<p>Chuỗi hex ở dòng dưới chỉ có ý nghĩa khi bạn <b>đem so</b> nó với một nguồn độc lập với ' +
             'chính bản tải về. Tự nó không chứng minh được gì: một file bị hỏng giữa đường, hoặc bị ' +
             'thay bằng bản khác, vẫn in ra một chuỗi hex trông y hệt thật — chỉ là chuỗi khác.</p>' +
             '<p>Trang phát hành của crosstool-NG trên GitHub kèm sẵn bốn file kiểm chứng cho mỗi bản ' +
             'tải — <code>.md5</code>, <code>.sha1</code>, <code>.sha512</code> và <code>.sig</code> ' +
             '(chữ ký GPG) — dùng đúng nguyên lý này: tải file phụ đó về rồi so khớp bằng ' +
             '<code>sha1sum -c</code> hay tương đương. Không có sẵn <code>.sha256</code> riêng cho ' +
             'thuật toán này, nhưng nguyên tắc như nhau ở cả ba thuật toán băm.</p>' +
             '<p>Bài 38 sẽ đưa đúng thói quen này lên một bậc: xác minh bằng GPG, chứng minh không chỉ ' +
             '"dữ liệu còn nguyên" mà còn "đúng người đã ký".</p>' },

        { t: 'cal', kind: 'info', title: '2,4 MB làm ra một toolchain 354 MB',
          x: '<p><b>2 448 288</b> byte — chưa tới 2,4 MB. Toolchain nó tạo ra nặng ' +
             '<b>354 MB</b>, gấp <b>151 lần</b>. Con số đó nói đúng bản chất của ' +
             'crosstool-NG: nó không chứa trình biên dịch nào cả. Nó chỉ chứa <i>hiểu biết</i> về ' +
             'thứ tự và tham số cần dùng, còn mã nguồn thật thì nó tải từ gnu.org, kernel.org và ' +
             'musl.libc.org lúc build.</p>' +
             '<p>Hệ quả: <b>lần build đầu tiên cần Internet</b>, và tải khoảng 20 gói mã nguồn ' +
             'mất chừng 5 phút.</p>' },

        { t: 'code', where: 'wsl', code:
          'tar -xf crosstool-ng-1.28.0.tar.xz\n' +
          'cd crosstool-ng-1.28.0\n' +
          './configure --enable-local' },

        { t: 'code', where: 'out', nocopy: true, code:
          '…\n' +
          'checking for pkg-config... /usr/bin/pkg-config\n' +
          'checking pkg-config is at least version 0.9.0... yes\n' +
          'checking for ncursesw via pkg-config... yes\n' +
          'checking for working ncursesw/curses.h... yes\n' +
          'checking for working ncursesw.h... no\n' +
          'checking for working ncurses.h... yes\n' +
          'checking for Curses Panel library with ncursesw/panel.h... yes\n' +
          'checking for Curses Menu library with ncursesw/menu.h... yes\n' +
          'checking for build time... Fri Aug  7 23:09:19 2026\n' +
          'checking if the manual needs to be installed... yes\n' +
          'checking that generated files are newer than configure... done\n' +
          'configure: creating ./config.status\n' +
          'config.status: creating Makefile\n' +
          'config.status: creating paths.sh\n' +
          'config.status: creating kconfig/Makefile\n' +
          'config.status: creating config/configure.in\n' +
          'config.status: creating config.h\n' +
          'config.status: executing depfiles commands',
          notes: ['<code>checking for build time…</code> in ra đúng lúc bạn chạy lệnh, nên mốc thời gian này sẽ khác trên máy bạn.'] },

        { t: 'cmdx', title: 'Vì sao lại là <code>--enable-local</code>', cmd: './configure --enable-local', rows: [
          ['<code>./configure</code>', 'Kịch bản Autotools quen thuộc: dò công cụ, dò thư viện, rồi sinh <code>Makefile</code>', 'Bạn đã gặp mẫu này ở Bài 16'],
          ['<code>--enable-local</code>', 'Chạy <code>ct-ng</code> <b>ngay trong thư mục mã nguồn</b>, không cài vào <code>/usr/local</code>', '<b>Nên dùng.</b> Không cần <code>sudo</code>, và giữ được nhiều phiên bản crosstool-NG song song trên cùng một máy'],
          ['(không có <code>--prefix</code>)', 'Mặc định sẽ cài toàn hệ thống — nhưng <code>--enable-local</code> đã loại bỏ nhu cầu đó', 'Dự án nhúng thật thường ghim luôn cả phiên bản crosstool-NG vào kho mã nguồn']
        ]},

        { t: 'cal', kind: 'info', title: 'Ba dòng xác nhận đúng thứ bạn vừa cài ở bước 1',
          x: '<p><code>checking for ncursesw via pkg-config... yes</code> và ' +
             '<code>checking for working ncursesw/curses.h... yes</code> là bằng chứng trực tiếp rằng ' +
             'gói <code>libncurses-dev</code> cài ở bước 1 hoạt động đúng — thiếu nó, ' +
             '<code>./configure</code> sẽ dừng ngay tại đây, vì <code>menuconfig</code> (bạn sẽ gọi ở ' +
             'bước 3) chỉ là một giao diện dựng trên ncurses.</p>' +
             '<p>Dòng <code>checking for working ncursesw.h... no</code> ngay sau đó không phải lỗi — ' +
             'đó chỉ là một trong ba cách <code>configure</code> thử tìm header ncurses bản rộng ' +
             '(wide-char), và cách tiếp theo (<code>ncurses.h</code> thường) đã thành công. Miễn ' +
             '<code>config.status: creating Makefile</code> xuất hiện ở cuối như trên, cấu hình đã ' +
             'xong sạch sẽ.</p>' },

        { t: 'code', where: 'wsl', code: 'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          '…\n' +
          '  CC       lxdialog/textbox.o\n' +
          '  CC       lxdialog/util.o\n' +
          '  CC       lxdialog/yesno.o\n' +
          '  CCLD     mconf\n' +
          'gmake[2]: Entering directory \'/home/shinarus/embedded/bai28/crosstool-ng-1.28.0\'\n' +
          '  GEN      ct-ng\n' +
          '  GEN      bash-completion/ct-ng\n' +
          '  GEN      docs/ct-ng.1' },

        { t: 'p', x:
          'Hai dòng cuối rất đáng chú ý. <code>CCLD mconf</code> là trình <code>menuconfig</code> ' +
          'vừa được biên dịch — đúng chương trình mà nhân Linux dùng. <code>GEN ct-ng</code> cho ' +
          'thấy <code>ct-ng</code> được <i>sinh ra</i>, không phải viết tay:' },

        { t: 'code', where: 'wsl', code:
          'ls -l ct-ng\n' +
          './ct-ng version | head -n 1' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-r-xr-xr-x 1 shinarus shinarus 12051 Aug  7 23:09 ct-ng\n' +
          'This is crosstool-NG version 1.28.0' },

        { t: 'cal', kind: 'why', title: 'Vì sao <code>ct-ng</code> lại là một Makefile, không phải kịch bản shell?',
          x: '<p>Mở nó ra bạn sẽ thấy dòng đầu là <code>#!/usr/bin/make -f</code>. Chọn Makefile ' +
             'đem lại ba thứ miễn phí: cú pháp <code>ct-ng &lt;mục tiêu&gt;</code> tự nhiên, cơ ' +
             'chế phụ thuộc để <code>ct-ng menuconfig</code> tự dựng lại <code>mconf</code> khi ' +
             'cần, và khả năng nhận biến môi trường kiểu ' +
             '<code>CT_PREFIX=/opt ct-ng build</code>.</p>' +
             '<p>Quyền <code>-r-xr-xr-x</code> — <b>không có <code>w</code> cho ai cả</b> — là cố ' +
             'ý: file này do <code>make</code> sinh ra từ <code>ct-ng.in</code>, nên sửa tay là ' +
             'mất trắng ở lần <code>make</code> sau. Bạn sẽ gặp lại đúng kiểu bảo vệ này ở thư ' +
             'mục toolchain thành phẩm tại bước 5.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Nạp sample và chỉnh hai tuỳ chọn quan trọng', blocks: [

        { t: 'p', x:
          'Bản build cần một thư mục làm việc <b>riêng</b>, tách khỏi mã nguồn crosstool-NG. ' +
          'Trong thư mục đó, <code>.config</code> và <code>build.log</code> sẽ xuất hiện.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/embedded/bai28/build-musl && cd ~/embedded/bai28/build-musl\n' +
          '~/embedded/bai28/crosstool-ng-1.28.0/ct-ng aarch64-unknown-linux-musl' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  CONF  aarch64-unknown-linux-musl\n' +
          '#\n' +
          '# configuration written to .config\n' +
          '#\n' +
          '\n' +
          '***********************************************************\n' +
          '\n' +
          'Initially reported by: Chris Packham\n' +
          'URL: http://crosstool-ng.org/\n' +
          '\n' +
          '***********************************************************\n' +
          '\n' +
          'Now configured for "aarch64-unknown-linux-musl"' },

        { t: 'cal', kind: 'info', title: 'Ai là Chris Packham, và vì sao tên anh ấy xuất hiện ở đây',
          x: '<p>Đoạn banner giữa hai dải dấu sao không phải cảnh báo lỗi. Mỗi sample trong ' +
             '<code>samples/</code> đi kèm một file nhỏ ghi tên và địa chỉ của người đã đóng góp cấu ' +
             'hình mẫu đó cho dự án — ở đây là Chris Packham, người nộp sample ' +
             '<code>aarch64-unknown-linux-musl</code>. <code>ct-ng &lt;sample&gt;</code> in banner ' +
             'này mỗi lần bạn nạp một sample <b>local</b>, đúng ký hiệu <code>[L...]</code> đã báo ' +
             'trước ở bảng trên.</p>' +
             '<p>Dòng đáng tin cậy nhất trong cả khối là dòng cuối: ' +
             '<code>Now configured for "aarch64-unknown-linux-musl"</code> — xác nhận ' +
             '<code>.config</code> đã được ghi đúng target bạn chọn, không phải một target khác do ' +
             'gõ nhầm tên sample.</p>' },

        { t: 'p', x:
          'Xem lại toàn bộ quyết định bằng một lệnh duy nhất — đây là cách nhanh nhất để kiểm tra ' +
          'mình sắp build cái gì:' },

        { t: 'code', where: 'wsl', code:
          '~/embedded/bai28/crosstool-ng-1.28.0/ct-ng show-config' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[l...]   aarch64-unknown-linux-musl\n' +
          '    Languages       : C,C++\n' +
          '    OS              : linux-6.16\n' +
          '    Binutils        : binutils-2.45\n' +
          '    Compiler        : gcc-15.2.0\n' +
          '    Linkers         :\n' +
          '    C library       : musl-1.2.5\n' +
          '    Debug tools     : gdb-16.3\n' +
          '    Companion libs  : expat-2.7.1 gettext-0.26 gmp-6.3.0 isl-0.27 libiconv-1.18 mpc-1.3.1 mpfr-4.2.2 ncurses-6.5 zlib-1.3.1 zstd-1.5.7\n' +
          '    Companion tools : automake-1.17' },

        { t: 'cal', kind: 'info', title: 'Mười "companion libs" là gì và vì sao GCC cần chúng',
          x: '<p>GCC làm số học chính xác tuỳ ý ngay lúc biên dịch — khi bạn viết ' +
             '<code>double x = 1.0 / 3.0;</code>, GCC phải tính ra giá trị đó chính xác hơn cả ' +
             'kiểu <code>double</code> rồi mới làm tròn. Việc ấy do <b>GMP</b> (số nguyên lớn), ' +
             '<b>MPFR</b> (dấu phẩy động chính xác tuỳ ý) và <b>MPC</b> (số phức) đảm nhiệm. ' +
             '<b>ISL</b> phục vụ tối ưu hoá vòng lặp.</p>' +
             '<p>Đây là lý do crosstool-NG tự tải và build cả chúng: nếu dùng bản của Ubuntu, ' +
             'toolchain sinh ra sẽ phụ thuộc vào phiên bản GMP của <i>máy bạn</i>, và bản build ' +
             'thôi lặp lại được.</p>' },

        { t: 'p', x:
          'Trước khi bấm nút, hãy chỉnh <b>hai</b> tuỳ chọn. Cả hai đều là bài học rút ra từ một ' +
          'bản build thất bại, và bạn sẽ thấy vì sao ở bước 4.' },

        { t: 'code', where: 'wsl', code:
          '~/embedded/bai28/crosstool-ng-1.28.0/ct-ng menuconfig' },

        { t: 'table',
          head: ['Đường dẫn trong menu', 'Đổi thành', 'Vì sao'],
          rows: [
            ['<i>Paths and misc options → Debug crosstool-NG → Save intermediate steps</i>', 'bật (<code>y</code>)', 'Cho phép chạy lại từ bước gãy thay vì từ đầu. Không bật thì một lỗi ở bước 17/19 buộc bạn làm lại cả 52 phút'],
            ['<i>Paths and misc options → Progress bar</i>', 'tắt (<code>n</code>)', 'Con quay <code>/ - \\ |</code> ghi thẳng vào <code>build.log</code>, làm file phình lên và gần như không đọc được']
          ]},

        { t: 'p', x:
          'Nếu muốn làm bằng kịch bản thay vì menu — cách thường dùng trong CI — hãy sửa thẳng ' +
          '<code>.config</code> rồi để <code>oldconfig</code> giải các phụ thuộc:' },

        { t: 'code', where: 'wsl', code:
          "sed -i 's/^CT_LOG_PROGRESS_BAR=y/# CT_LOG_PROGRESS_BAR is not set/' .config\n" +
          "sed -i 's/^# CT_DEBUG_CT is not set/CT_DEBUG_CT=y/'                 .config\n" +
          "sed -i 's/^# CT_DEBUG_CT_SAVE_STEPS is not set/CT_DEBUG_CT_SAVE_STEPS=y/' .config\n" +
          "yes '' | ~/embedded/bai28/crosstool-ng-1.28.0/ct-ng oldconfig" },

        { t: 'code', where: 'out', nocopy: true, code:
          'Progress bar (LOG_PROGRESS_BAR) [N/y/?] n\n' +
          'Log to a file (LOG_TO_FILE) [Y/n/?] y\n' +
          '  Compress the log file (LOG_FILE_COMPRESS) [Y/n/?] y' },

        { t: 'cal', kind: 'info', title: 'Hai dòng sau không phải điều bạn vừa yêu cầu',
          x: '<p>Chỉ có dòng đầu (<code>Progress bar → n</code>) là do ba lệnh <code>sed</code> ở trên ' +
             'gây ra. Hai dòng còn lại là <code>oldconfig</code> hỏi lại toàn bộ nhóm tuỳ chọn ghi ' +
             'log, và gợi ý giữ nguyên mặc định của chính crosstool-NG: <code>CT_LOG_TO_FILE</code> ' +
             '(mặc định <b>Y</b>) là thứ tạo ra chính file <code>build.log</code> bạn sẽ đọc ở bước ' +
             '4, còn <code>CT_LOG_FILE_COMPRESS</code> (mặc định <b>Y</b>, chỉ hỏi vì phụ thuộc dòng ' +
             'trước) nén file log lại <b>sau khi</b> toolchain build xong — đó là lý do bạn sẽ thấy ' +
             '<code>build.log.bz2</code> nằm sẵn trong thư mục toolchain thành phẩm ở bước 5, chứ ' +
             'không phải bản <code>build.log</code> trần.</p>' +
             '<p><code>yes \'\' |</code> chấp nhận cả hai mặc định này, đúng như tài liệu của ' +
             'crosstool-NG khuyên cho <code>LOG_TO_FILE</code>: "Definitely, say Y." Tuỳ chọn duy ' +
             'nhất bạn thật sự đổi so với mặc định là tắt <i>Progress bar</i>.</p>' },

        { t: 'code', where: 'wsl', code:
          "grep -nE '^CT_DEBUG_CT_SAVE_STEPS|^# CT_LOG_PROGRESS_BAR' .config" },

        { t: 'code', where: 'out', nocopy: true, code:
          '47:CT_DEBUG_CT_SAVE_STEPS=y\n' +
          '48:CT_DEBUG_CT_SAVE_STEPS_GZIP=y\n' +
          '126:# CT_LOG_PROGRESS_BAR is not set' },

        { t: 'cal', kind: 'tip', title: '<code>oldconfig</code> là bạn của bạn ở mọi dự án dùng kconfig',
          x: '<p>Sửa tay <code>.config</code> rất dễ tạo ra cấu hình <b>không nhất quán</b>: bạn ' +
             'bật một tuỳ chọn nhưng quên bật tuỳ chọn cha mà nó phụ thuộc. Dòng ' +
             '<code>CT_DEBUG_CT_SAVE_STEPS_GZIP=y</code> ở trên là do <code>oldconfig</code> tự ' +
             'điền thêm — bạn không hề gõ nó.</p>' +
             '<p><code>yes \'\' |</code> trả lời "giữ mặc định" cho mọi câu hỏi còn lại. Cùng ' +
             'chiêu này dùng được cho nhân Linux (Chặng 07) và BusyBox (Chặng 09).</p>' }
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Chạy build — và biết trước mình sẽ chờ bao lâu', blocks: [

        { t: 'p', x:
          'Trước khi gõ lệnh cuối cùng, hãy hỏi máy hai câu. Bao nhiêu lõi, và còn bao nhiêu đĩa. ' +
          'Cả hai đều quyết định trực tiếp kết quả của giờ đồng hồ sắp tới.' },

        { t: 'code', where: 'wsl', code:
          'nproc\n' +
          'df -h ~ | tail -n 1' },

        { t: 'code', where: 'out', nocopy: true, code:
          '6\n' +
          '/dev/sdd       1007G   35G  922G   4% /' },

        { t: 'cal', kind: 'warn', title: '<code>.build</code> phình tới <b>18 GB</b> rồi mới xẹp',
          x: '<p>Thư mục làm việc tạm <code>.build</code> chứa mã nguồn giải nén của binutils, ' +
             'GCC (hai lần), musl, gdb và mười thư viện phụ trợ, cộng toàn bộ file <code>.o</code> ' +
             'trung gian. Đo trên máy này: <b>18 GB</b> lúc cao điểm — có bật ' +
             '<i>Save intermediate steps</i>, vì mỗi ảnh chụp trạng thái là một bản sao nén của ' +
             'toàn bộ cây build.</p>' +
             '<p>Còn <b>922 GB</b> trống thì không phải lo. Nếu bạn còn dưới <b>25 GB</b>, hãy dọn ' +
             'trước — <code>No space left on device</code> ở phút thứ 40 là kiểu thất bại đắt ' +
             'nhất trong bài này.</p>' },

        { t: 'p', x:
          'Bây giờ mới là lệnh chính. Chỉ một dòng, và nó chạy rất lâu:' },

        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bai28/build-musl\n' +
          '~/embedded/bai28/crosstool-ng-1.28.0/ct-ng build.6' },

        { t: 'cmdx', title: 'Mổ xẻ <code>build.6</code>', cmd: 'ct-ng build.6', rows: [
          ['<code>build</code>', 'Mục tiêu Makefile chạy tuần tự cả 19 bước, từ <code>companion_tools_for_build</code> đến <code>finish</code>', 'Đây là mục tiêu duy nhất bạn thật sự cần; mọi thứ khác chỉ để gỡ rối'],
          ['<code>.6</code>', 'Hậu tố đặt số tiến trình song song, tương đương <code>make -j6</code> bên trong từng bước', 'Không có hậu tố thì crosstool-NG dùng <code>CT_PARALLEL_JOBS</code> trong <code>.config</code>, mặc định là <b>1</b> — chậm hơn nhiều'],
          ['vì sao lại là <b>6</b>', 'Đúng bằng <code>nproc</code>. Máy này được <code>.wslconfig</code> cấp <b>6</b> CPU', 'Bài 16 đã đo: <code>-j6</code> trên 6 lõi chỉ nhanh <b>2,6×</b> chứ không phải 6× — bước liên kết là tuần tự. Đặt cao hơn số lõi chỉ làm máy nghẽn RAM'],
          ['<code>~/…/ct-ng</code>', 'Gọi bằng đường dẫn tuyệt đối vì bản này là <code>--enable-local</code>, không cài vào <code>/usr/local</code>', 'Nếu thấy <code>ct-ng: command not found</code>, đó là lý do']
        ]},

        { t: 'cal', kind: 'danger', title: 'Đóng terminal là mất cả bản build',
          x: '<p><code>ct-ng build</code> chạy khoảng <b>một tiếng</b>. Nếu bạn đóng cửa sổ WSL, ' +
             'tiến trình nhận <code>SIGHUP</code> và chết giữa chừng — chính xác cơ chế đã học ở ' +
             'Bài 9 và Bài 21.</p>' +
             '<p>Chạy trong <code>tmux</code>, hoặc tách hẳn ra nền:</p>' +
             '<p><code>nohup ~/embedded/bai28/crosstool-ng-1.28.0/ct-ng build.6 &amp;</code></p>' +
             '<p>Rồi theo dõi bằng <code>tail -f build.log</code>. Nhờ đã bật ' +
             '<i>Save intermediate steps</i> ở bước 3, kể cả khi chết bạn vẫn chạy tiếp được từ ' +
             'bước gãy — nhưng đừng dựa vào đó.</p>' },

        { t: 'p', x:
          'Trên màn hình bạn thấy đúng một dòng cho mỗi bước lớn. Đây là những dòng thật của bản ' +
          'build này, lọc ra từ <code>build.log</code>:' },

        { t: 'code', where: 'wsl', code:
          "grep -E '^\\[INFO \\]  [A-Z]' build.log | grep -vE 'done in|Saving state' | head -n 22" },

        { t: 'code', where: 'out', nocopy: true, code:
          '[INFO ]  Performing some trivial sanity checks\n' +
          '[INFO ]  Build started 20260807.230851\n' +
          '[INFO ]  Building environment variables\n' +
          '[INFO ]  Retrieving needed toolchain components\' tarballs\n' +
          '[INFO ]  Extracting and patching toolchain components\n' +
          '[INFO ]  Installing automake for build\n' +
          '[INFO ]  Installing ncurses for build\n' +
          '[INFO ]  Installing zlib for host\n' +
          '[INFO ]  Installing zstd for host\n' +
          '[INFO ]  Installing GMP for host\n' +
          '[INFO ]  Installing MPFR for host\n' +
          '[INFO ]  Installing ISL for host\n' +
          '[INFO ]  Installing MPC for host\n' +
          '[INFO ]  Installing expat for host\n' +
          '[INFO ]  Installing ncurses for host\n' +
          '[INFO ]  Installing libiconv for host\n' +
          '[INFO ]  Installing gettext for host\n' +
          '[INFO ]  Installing binutils for host\n' +
          '[INFO ]  Installing kernel headers\n' +
          '[INFO ]  Installing core C gcc compiler\n' +
          '[INFO ]  Installing C library\n' +
          '[INFO ]  Installing final gcc compiler' },

        { t: 'p', muted: true, x:
          'Bỏ <code>| head -n 22</code> đi thì còn hai bước nữa: <i>Installing cross-gdb</i> và ' +
          '<i>Installing gdb server</i>. Ở đây chúng bị cắt vì trên máy này chúng đến từ một lần ' +
          'chạy lại — xem bảng <b>Lỗi thường gặp</b> ở cuối bài để biết vì sao.' },

        { t: 'cal', kind: 'info', title: 'Bạn đang nhìn thẳng vào lời giải của bài toán con gà — quả trứng',
          x: '<p>Đọc bốn dòng liên tiếp ở cuối: <b>kernel headers</b> → <b>core C gcc compiler</b> ' +
             '→ <b>C library</b> → <b>final gcc compiler</b>. Đó chính là hình vẽ ở mục 2, giờ đã ' +
             'thành nhật ký thật.</p>' +
             '<p>Chú ý cả những dòng <i>không</i> có: không có bước nào tên ' +
             '<code>libc_headers</code>, vì musl không tách header ra thành gói riêng như glibc — ' +
             'crosstool-NG bỏ qua bước đó. Danh sách 19 bước là khung cố định; số bước <i>thực sự ' +
             'làm gì</i> phụ thuộc vào <code>.config</code> của bạn.</p>' },

        { t: 'p', x:
          'Khi build xong, câu hỏi thú vị nhất là thời gian đi đâu mất. crosstool-NG ghi lại từng ' +
          'bước, nên bạn không phải đoán:' },

        { t: 'code', where: 'wsl', code:
          "grep ': done in ' build.log | sed -E 's/^\\[INFO \\]  //' | grep -v '^\\['" },

        { t: 'code', where: 'out', nocopy: true, code:
          'Retrieving needed toolchain components\' tarballs: done in 513.78s (at 08:39)\n' +
          'Extracting and patching toolchain components: done in 73.33s (at 09:53)\n' +
          'Installing automake for build: done in 11.38s (at 10:04)\n' +
          'Installing ncurses for build: done in 37.19s (at 10:42)\n' +
          'Installing zlib for host: done in 2.07s (at 10:45)\n' +
          'Installing zstd for host: done in 18.71s (at 11:04)\n' +
          'Installing GMP for host: done in 48.99s (at 11:53)\n' +
          'Installing MPFR for host: done in 35.03s (at 12:28)\n' +
          'Installing ISL for host: done in 76.85s (at 13:44)\n' +
          'Installing MPC for host: done in 12.06s (at 13:57)\n' +
          'Installing expat for host: done in 14.07s (at 14:11)\n' +
          'Installing ncurses for host: done in 41.23s (at 14:52)\n' +
          'Installing libiconv for host: done in 0.02s (at 14:52)\n' +
          'Installing gettext for host: done in 0.02s (at 14:52)\n' +
          'Installing binutils for host: done in 141.64s (at 17:15)\n' +
          'Installing kernel headers: done in 11.50s (at 17:43)\n' +
          'Installing core C gcc compiler: done in 860.44s (at 32:09)\n' +
          '  Building for multilib 1/1: \'\': done in 37.63s (at 33:25)\n' +
          'Installing C library: done in 37.72s (at 33:25)\n' +
          'Installing final gcc compiler: done in 1066.55s (at 52:34)\n' +
          'Checking dynamic linker symlinks: done in 1.17s (at 00:42)\n' +
          'Installing cross-gdb: done in 470.93s (at 08:40)\n' +
          'Installing gdb server: done in 95.09s (at 10:15)\n' +
          'Finalizing the toolchain\'s directory: done in 21.22s (at 16:42)' },

        { t: 'cal', kind: 'warn', title: 'Vì sao đồng hồ nhảy từ <code>52:34</code> về <code>00:42</code>?',
          x: '<p>Cột <code>(at …)</code> đếm từ lúc <i>lần chạy hiện tại</i> bắt đầu, không phải ' +
             'từ lúc toolchain bắt đầu. Bản build này gãy ở bước <code>debug</code> và được chạy ' +
             'lại bằng <code>ct-ng libc_post_cc+</code>, nên đồng hồ khởi động lại từ 0 — đó là ' +
             'toàn bộ ý nghĩa của con số <code>00:42</code>.</p>' +
             '<p>Nếu bạn chạy một mạch không gãy, cột này tăng đều tới khoảng <b>62 phút</b>. ' +
             'Muốn biết tổng thời gian thật thì cộng cột <code>done in</code>, đừng đọc cột ' +
             '<code>at</code> — bài học nhỏ nhưng sẽ lặp lại ở mọi hệ thống build lớn.</p>' },

        { t: 'table',
          head: ['Bước tốn nhất', 'Giây', 'Phút:giây', 'Tỷ trọng'],
          rows: [
            ['<b>Installing final gcc compiler</b> (<code>cc_for_host</code>)', '<b>1 066,55</b>', '17:47', '<b>29,7 %</b>'],
            ['<b>Installing core C gcc compiler</b> (<code>cc_core</code>)', '<b>860,44</b>', '14:20', '<b>24,0 %</b>'],
            ['Retrieving … tarballs', '513,78', '08:34', '14,3 %'],
            ['Installing cross-gdb', '470,93', '07:51', '13,1 %'],
            ['Installing binutils for host', '141,64', '02:22', '3,9 %'],
            ['Installing gdb server', '95,09', '01:35', '2,6 %'],
            ['Installing C library (musl)', '37,72', '00:38', '<b>1,1 %</b>'],
            ['Installing kernel headers', '11,50', '00:12', '0,3 %']
          ]},

        { t: 'cal', kind: 'why', title: 'Hai lần dựng GCC ăn <b>53,7 %</b> tổng thời gian',
          x: '<p>Cộng tất cả các bước lại được <b>3 591</b> giây, tức <b>59 phút 51 giây</b> CPU-đồng ' +
             'hồ trên 6 lõi. Riêng <code>cc_core</code> cộng <code>cc_for_host</code> đã là ' +
             '<b>1 927</b> giây — <b>53,7 %</b>.</p>' +
             '<p>Đây chính là cái giá của bài toán con gà — quả trứng, đo được bằng đồng hồ. Bạn ' +
             'không dựng GCC một lần rồi xong; bạn dựng nó <b>hai</b> lần, và lần đầu là một bản ' +
             'sẽ bị vứt đi.</p>' +
             '<p>Đối lập lại: musl — thứ mà cả kiến trúc này tồn tại để phục vụ — chỉ mất ' +
             '<b>37,72</b> giây, đúng <b>1,1 %</b>. Nhân đôi cái nhỏ để dựng được cái nhỏ hơn nữa: ' +
             'đó là hình dạng thật của việc build toolchain.</p>' },

        { t: 'cal', kind: 'tip', title: '<code>build.log</code> nặng <b>40 MB</b> — hãy dùng <code>grep</code>, đừng mở nó',
          x: '<p>File nhật ký của bản build này là <b>41 704 605</b> byte. Mở bằng ' +
             '<code>nano</code> là treo terminal. Ba câu lệnh đủ dùng cho 99 % trường hợp:</p>' +
             '<ul>' +
             '<li><code>grep -n \'^\\[ERROR\\]\' build.log</code> — tìm chỗ gãy</li>' +
             '<li><code>grep -n \': done in \' build.log</code> — xem đã qua bước nào</li>' +
             '<li><code>tail -n 60 build.log</code> — 60 dòng cuối trước khi chết</li>' +
             '</ul>' +
             '<p>Thói quen đọc log bằng <code>grep</code> này sẽ theo bạn suốt Chặng 07 ' +
             '(build nhân) và Chặng 11 (Yocto), nơi log còn lớn hơn nhiều.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Kiểm tra toolchain: bốn câu hỏi, bốn câu trả lời độc lập', blocks: [

        { t: 'p', x:
          'Build xong không có nghĩa là dùng được. Hãy kiểm chứng bằng bốn góc nhìn khác nhau — ' +
          'nếu cả bốn khớp thì toolchain thật sự đúng, chứ không phải "có vẻ đúng".' },

        { t: 'p', x:
          '<b>Câu hỏi 1 — nó nằm ở đâu và gồm những gì?</b>' },

        { t: 'code', where: 'wsl', code:
          'export PATH=$HOME/x-tools/aarch64-unknown-linux-musl/bin:$PATH\n' +
          'ls ~/x-tools/aarch64-unknown-linux-musl/\n' +
          'ls ~/x-tools/aarch64-unknown-linux-musl/bin/ | wc -l' },

        { t: 'code', where: 'out', nocopy: true, code:
          'aarch64-unknown-linux-musl\n' +
          'bin\n' +
          'build.log.bz2\n' +
          'include\n' +
          'lib\n' +
          'libexec\n' +
          'share\n' +
          '34' },

        { t: 'table',
          head: ['Thư mục', 'Chứa gì', 'Vì sao đáng chú ý'],
          rows: [
            ['<code>bin/</code>', '<b>34</b> công cụ, tất cả mang tiền tố <code>aarch64-unknown-linux-musl-</code>', 'Tiền tố chính là target triplet — đúng cấu trúc đã học ở Bài 26'],
            ['<code>aarch64-unknown-linux-musl/</code>', 'Thư mục trùng tên chứa <code>sysroot/</code>', 'Đây là "hệ thống file của board thu nhỏ": header và thư viện của <i>target</i>'],
            ['<code>libexec/</code>', '<code>cc1</code>, <code>cc1plus</code>, <code>collect2</code> — ruột thật của GCC', 'Bài 15 đã gặp <code>cc1</code>: <code>gcc</code> chỉ là trình điều phối'],
            ['<code>build.log.bz2</code>', 'Toàn bộ nhật ký build, nén lại', 'crosstool-NG chép nó vào đây để một năm sau bạn còn biết toolchain này được dựng thế nào'],
            ['<code>lib/</code>, <code>include/</code>, <code>share/</code>', 'Thư viện và tài liệu của <i>bản thân</i> các công cụ', 'Đừng nhầm với <code>sysroot/lib</code> — cái kia mới là của board']
          ]},

        { t: 'p', x:
          '<b>Câu hỏi 2 — phiên bản có đúng thứ bạn đã chọn không?</b>' },

        { t: 'code', where: 'wsl', code:
          'aarch64-unknown-linux-musl-gcc --version | head -n 1\n' +
          'aarch64-unknown-linux-musl-ld  --version | head -n 1\n' +
          'aarch64-unknown-linux-musl-gdb --version | head -n 1' },

        { t: 'code', where: 'out', nocopy: true, code:
          'aarch64-unknown-linux-musl-gcc (crosstool-NG 1.28.0) 15.2.0\n' +
          'GNU ld (crosstool-NG 1.28.0) 2.45\n' +
          'GNU gdb (crosstool-NG 1.28.0) 16.3' },

        { t: 'cal', kind: 'info', title: 'Chuỗi trong ngoặc là chữ ký của bạn',
          x: '<p>Toolchain của <code>apt</code> in ra <code>(Ubuntu 15.2.0-16ubuntu1)</code> — chữ ' +
             'ký của Ubuntu. Bản này in <code>(crosstool-NG 1.28.0)</code>. Cùng GCC ' +
             '<b>15.2.0</b>, nhưng nguồn gốc khác hẳn, và <b>binutils là 2.45</b> chứ không phải ' +
             '<b>2.46</b> của Ubuntu.</p>' +
             '<p>Chuỗi này do <code>--with-pkgversion</code> đặt lúc <code>configure</code>. Trong ' +
             'một dự án thật, người ta nhét cả số build và commit hash vào đây, để nhìn một nhị ' +
             'phân là biết nó do bản toolchain nào sinh ra. Đó là mảnh đầu tiên của "build lặp ' +
             'lại được" mà Chặng 11 sẽ nói kỹ.</p>' },

        { t: 'p', x:
          '<b>Câu hỏi 3 — nó tự nghĩ nó sinh mã cho ai, và tìm thư viện ở đâu?</b>' },

        { t: 'code', where: 'wsl', code:
          'aarch64-unknown-linux-musl-gcc -dumpmachine\n' +
          'aarch64-unknown-linux-musl-gcc -print-sysroot\n' +
          'ls $(aarch64-unknown-linux-musl-gcc -print-sysroot)/lib/ | head -n 8' },

        { t: 'code', where: 'out', nocopy: true, code:
          'aarch64-unknown-linux-musl\n' +
          '/home/shinarus/x-tools/aarch64-unknown-linux-musl/aarch64-unknown-linux-musl/sysroot\n' +
          'ld-musl-aarch64.so.1\n' +
          'libatomic.a\n' +
          'libatomic.so\n' +
          'libatomic.so.1\n' +
          'libatomic.so.1.2.0\n' +
          'libgcc_s.so\n' +
          'libitm.a\n' +
          'libstdc++.a' },

        { t: 'cal', kind: 'why', title: '<code>ld-musl-aarch64.so.1</code> là bằng chứng quyết định',
          x: '<p>Đây là dòng đáng giá nhất trong cả bước này. Trong <code>sysroot/lib</code> ' +
             '<b>không</b> có <code>ld-linux-aarch64.so.1</code>, <b>không</b> có ' +
             '<code>libc.so.6</code> — hai thứ luôn xuất hiện ở toolchain glibc của Bài 27.</p>' +
             '<p>Thay vào đó là <code>ld-musl-aarch64.so.1</code>: trình nạp động của musl, đồng ' +
             'thời <i>chính là</i> thư viện C (musl gộp cả hai vào một file). Một quyết định trong ' +
             '<code>menuconfig</code> đã lan xuống tận tên file trên đĩa — và lát nữa sẽ lan tiếp ' +
             'vào section <code>.interp</code> của mọi nhị phân bạn dịch.</p>' },

        { t: 'p', x:
          '<b>Câu hỏi 4 — nó nặng bao nhiêu, và vì sao lại chỉ đọc?</b>' },

        { t: 'code', where: 'wsl', code:
          'du -sh ~/x-tools/aarch64-unknown-linux-musl\n' +
          'ls -ld ~/x-tools/aarch64-unknown-linux-musl' },

        { t: 'code', where: 'out', nocopy: true, code:
          '354M\t/home/shinarus/x-tools/aarch64-unknown-linux-musl\n' +
          'dr-xr-xr-x 8 shinarus shinarus 4096 Aug  8 09:33 /home/shinarus/x-tools/aarch64-unknown-linux-musl',
          notes: ['Tên người dùng và mốc thời gian sẽ khác trên máy bạn; điều cần khớp là chuỗi quyền <code>dr-xr-xr-x</code> và kích thước khoảng 354M.'] },

        { t: 'cmdx', title: 'Đọc kỹ chuỗi quyền <code>dr-xr-xr-x</code>', cmd: 'ls -ld ~/x-tools/…', rows: [
          ['<code>d</code>', 'Thư mục', 'Bài 8'],
          ['<code>r-x</code> (chủ sở hữu)', 'Đọc và vào được, nhưng <b>không ghi được</b> — kể cả bởi chính bạn', 'Bình thường một thư mục bạn tạo ra sẽ là <code>rwx</code>. Ở đây chữ <code>w</code> đã bị gỡ có chủ đích'],
          ['ai làm việc này', 'Bước <code>finish</code>, do <code>CT_PREFIX_DIR_RO=y</code> trong <code>.config</code>', 'Đây là mặc định của mọi sample'],
          ['vì sao', 'Chống sửa nhầm. Một toolchain bị sửa lén là nguồn của những lỗi "chỉ xảy ra trên máy tôi" khó truy nhất', 'Muốn xoá để build lại: <code>chmod -R u+w ~/x-tools/&lt;target&gt;</code> trước, rồi mới <code>rm -rf</code>']
        ]},

        { t: 'cal', kind: 'info', title: 'Bước <code>finish</code> đã <code>strip</code> hộ bạn',
          x: '<p><b>354 MB</b> nghe vẫn lớn, nhưng đó là con số <i>sau</i> khi bước ' +
             '<code>finish</code> chạy <i>Stripping all toolchain executables</i>. Nó bỏ toàn bộ ' +
             'ký hiệu gỡ lỗi khỏi 34 công cụ trong <code>bin/</code> và khỏi <code>cc1</code>, ' +
             '<code>cc1plus</code> trong <code>libexec/</code>.</p>' +
             '<p>Chính là <code>strip</code> của Bài 18, chỉ khác là lần này nó được áp lên trình ' +
             'biên dịch thay vì lên chương trình của bạn. Bước đó chỉ mất <b>21,22</b> giây — ' +
             '<b>0,6 %</b> tổng thời gian build.</p>' },

        { t: 'cal', kind: 'tip', title: 'Cho <code>PATH</code> nhớ giúp bạn',
          x: '<p>Mỗi terminal mới lại quên <code>PATH</code>, và bạn sẽ gặp ' +
             '<code>aarch64-unknown-linux-musl-gcc: command not found</code>. Thêm một dòng vào ' +
             '<code>~/.bashrc</code> (Bài 13 đã dựng file này):</p>' +
             '<p><code>export PATH=$HOME/x-tools/aarch64-unknown-linux-musl/bin:$PATH</code></p>' +
             '<p>Đặt <code>$PATH</code> ở <b>cuối</b> chứ không phải đầu, để toolchain của bạn ' +
             'được ưu tiên hơn bản của <code>apt</code> nếu trùng tên. Ở đây không trùng — tiền tố ' +
             'khác nhau — nhưng thói quen đó cứu bạn ở những dự án khác.</p>' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Dịch lại <code>temp_daemon.c</code> — và đọc con số', blocks: [

        { t: 'p', x:
          'Đây là phần thưởng. Bạn dùng <b>đúng mã nguồn</b> của Bài 24 và Bài 27, không sửa một ' +
          'ký tự, chỉ đổi trình biên dịch. Mọi khác biệt về kích thước đều thuần tuý đến từ thư ' +
          'viện C.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bai28\n' +
          'cp ~/embedded/bai27/temp_daemon.c .\n' +
          'export PATH=$HOME/x-tools/aarch64-unknown-linux-musl/bin:$PATH' },

        { t: 'code', where: 'wsl', code:
          '# 1. musl, dynamic linking\n' +
          'aarch64-unknown-linux-musl-gcc -Wall -Wextra -O2 -pthread \\\n' +
          '    -Wl,-z,max-page-size=4096 -o d_musl_dyn temp_daemon.c\n' +
          '\n' +
          '# 2. musl, static linking\n' +
          'aarch64-unknown-linux-musl-gcc -Wall -Wextra -O2 -pthread -static \\\n' +
          '    -Wl,-z,max-page-size=4096 -o d_musl_static temp_daemon.c\n' +
          '\n' +
          '# 3. glibc, static linking — apt toolchain, for comparison\n' +
          'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -pthread -static \\\n' +
          '    -Wl,-z,max-page-size=4096 -o d_glibc_static temp_daemon.c' },

        { t: 'p', x:
          'Cả ba lệnh đều chạy sạch, không một cảnh báo. Riêng điều đó đã là một kết quả: mã ' +
          'nguồn dùng <code>epoll</code>, <code>signalfd</code>, <code>pthread</code> và socket ' +
          'TCP dịch được bằng musl mà không phải sửa gì.' },

        { t: 'code', where: 'wsl', code:
          "stat -c '%s  %n' d_musl_dyn d_musl_static d_glibc_static" },

        { t: 'code', where: 'out', nocopy: true, code:
          '14144  d_musl_dyn\n' +
          '108720  d_musl_static\n' +
          '787032  d_glibc_static' },

        { t: 'table',
          head: ['Bản dựng', 'Byte', 'So với musl tĩnh'],
          rows: [
            ['musl, liên kết động', '<b>14 144</b>', '0,13×'],
            ['<b>musl, liên kết tĩnh</b>', '<b>108 720</b>', '<b>1×</b> — mốc so sánh'],
            ['glibc, liên kết tĩnh', '<b>787 032</b>', '<b>7,24×</b>']
          ]},

        { t: 'cal', kind: 'info', title: 'Con số 795 224 của Bài 27 vẫn đúng — đây là cùng một nhị phân',
          x: '<p>Bài 27 ghi bản tĩnh glibc là <b>795 224</b> byte, ở đây là <b>787 032</b>. Chênh ' +
             'lệch đúng <b>8 192</b> byte = <b>hai trang 4 KB</b>, và nguyên nhân là cờ ' +
             '<code>-Wl,-z,max-page-size=4096</code>: bỏ nó ra, con số quay về đúng 795 224.</p>' +
             '<p>Hãy kiểm chứng thay vì tin lời: <code>aarch64-linux-gnu-gcc -Wall -Wextra -O2 ' +
             '-pthread -static -o d_glibc_nopage temp_daemon.c</code> rồi ' +
             '<code>stat -c \'%s\' d_glibc_nopage</code>. Hai lần đo khác nhau mà giải thích được ' +
             'chênh lệch thì cả hai đều đáng tin; giải thích không được mới là lúc phải lo.</p>' },

        { t: 'p', x:
          'Bỏ phần thông tin gỡ lỗi đi thì khoảng cách còn giãn rộng hơn nữa:' },

        { t: 'code', where: 'wsl', code:
          'cp d_musl_static  d_musl_static_s   && aarch64-unknown-linux-musl-strip d_musl_static_s\n' +
          'cp d_glibc_static d_glibc_static_s  && aarch64-linux-gnu-strip          d_glibc_static_s\n' +
          "stat -c '%s  %n' d_musl_static_s d_glibc_static_s" },

        { t: 'code', where: 'out', nocopy: true, code:
          '42512  d_musl_static_s\n' +
          '655288  d_glibc_static_s' },

        { t: 'table',
          head: ['Sau <code>strip</code>', 'Byte', 'Giảm được', 'glibc / musl'],
          rows: [
            ['musl tĩnh', '<b>42 512</b>', '108 720 → 42 512 = <b>60,9 %</b>', ''],
            ['glibc tĩnh', '<b>655 288</b>', '787 032 → 655 288 = <b>16,7 %</b>', '<b>15,4×</b>']
          ]},

        { t: 'cal', kind: 'why', title: 'Vì sao <code>strip</code> lại có lợi cho musl nhiều gấp bốn lần?',
          x: '<p>Vì phần <i>mã lệnh</i> của musl nhỏ, nên thông tin gỡ lỗi chiếm tỷ trọng lớn hơn ' +
             'trong tổng dung lượng. glibc của Ubuntu lại được phát hành ở dạng đã tách sẵn phần ' +
             'lớn debug info sang gói <code>-dbg</code> riêng, nên trong ' +
             '<code>libc.a</code> còn ít thứ để bỏ.</p>' +
             '<p>Bài 18 đã đo <code>strip</code> trên một nhị phân tĩnh x86 và chỉ được ' +
             '<b>10,0 %</b>. Ba con số <b>10,0 %</b> · <b>16,7 %</b> · <b>60,9 %</b> cho thấy ' +
             'cùng một lệnh có thể cho kết quả rất khác nhau — nên hãy đo trên chính nhị phân của ' +
             'bạn, đừng chép tỷ lệ của người khác.</p>' },

        { t: 'p', x:
          'Chia nhỏ theo section thì thấy tiền nằm ở đâu:' },

        { t: 'code', where: 'wsl', code:
          'aarch64-unknown-linux-musl-size d_musl_static d_glibc_static' },

        { t: 'code', where: 'out', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '  39300\t    648\t   1792\t  41740\t   a30c\td_musl_static\n' +
          ' 626361\t  24440\t  22680\t 673481\t  a46c9\td_glibc_static' },

        { t: 'cal', kind: 'info', title: '<code>.text</code>: 39 300 so với 626 361 — chênh 15,9 lần',
          x: '<p>Bài 18 đã dạy đọc bảng này: <code>text</code> là mã lệnh, <code>data</code> là ' +
             'biến khởi tạo sẵn, <code>bss</code> là biến bằng không (chỉ chiếm chỗ lúc chạy). ' +
             'Chương trình của bạn giống hệt nhau ở cả hai cột, nên toàn bộ chênh lệch ' +
             '<b>587 061</b> byte mã lệnh là phần thư viện C bị kéo vào.</p>' +
             '<p><code>bss</code> cũng nói lên điều tương tự: musl cần <b>1 792</b> byte bộ nhớ ' +
             'không khởi tạo, glibc cần <b>22 680</b> — bảng locale, vùng đệm stdio, trạng thái ' +
             'nội bộ của NSS. Trên board 64 MB RAM chạy hai chục tiến trình, con số ấy là thật.</p>' },

        { t: 'p', x:
          'Cuối cùng, kiểm chứng rằng nhị phân musl thật sự là một loài khác:' },

        { t: 'code', where: 'wsl', code:
          'file d_musl_dyn\n' +
          'aarch64-unknown-linux-musl-readelf -p .interp d_musl_dyn' },

        { t: 'code', where: 'out', nocopy: true, code:
          'd_musl_dyn: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), dynamically linked,\n' +
          'interpreter /lib/ld-musl-aarch64.so.1, not stripped\n' +
          '\n' +
          'String dump of section \'.interp\':\n' +
          '  [     0]  /lib/ld-musl-aarch64.so.1' },

        { t: 'cmdx', title: 'Ba khác biệt so với nhị phân glibc của Bài 27', cmd: 'file / readelf -p .interp', rows: [
          ['<code>interpreter /lib/ld-musl-aarch64.so.1</code>', 'Trình nạp động của musl. Bài 27 thấy <code>/lib/ld-linux-aarch64.so.1</code> — <b>tên hoàn toàn khác</b>', 'Đây chính là lý do nhị phân glibc không chạy nổi trên rootfs musl: nhân đi tìm một file không tồn tại'],
          ['<code>version 1 (SYSV)</code>', 'Bản glibc ghi <code>version 1 (GNU/Linux)</code> và kèm <code>for GNU/Linux 3.7.0</code>', 'musl không đánh dấu ABI riêng — nó bám sát chuẩn SysV'],
          ['không có <code>BuildID</code>', 'Bản glibc có <code>BuildID[sha1]=7a99601e…</code>', 'BuildID là phần mở rộng GNU; hữu ích khi tra symbol từ core dump, nhưng không bắt buộc']
        ]},

        { t: 'code', where: 'wsl', code:
          'aarch64-unknown-linux-musl-readelf -d d_musl_dyn | head -n 4' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Dynamic section at offset 0x1e00 contains 22 entries:\n' +
          '  Tag        Type                         Name/Value\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so]\n' +
          ' 0x000000000000000c (INIT)               0x400d10' },

        { t: 'cal', kind: 'info', title: 'Một dòng <code>NEEDED</code> duy nhất',
          x: '<p><code>libc.so</code> — hết. musl gói <i>toàn bộ</i> thư viện C vào một file: ' +
             'pthread, math, dlopen, mọi thứ. Bản glibc ở Bài 27 cần <code>libc.so.6</code> và ' +
             'kéo theo cả một họ <code>libm</code>, <code>libpthread</code>, <code>libdl</code> ' +
             '(dù glibc 2.34 trở đi đã gộp phần lớn lại).</p>' +
             '<p>Với rootfs nhúng, "một file" nghĩa là một quyết định ít đi khi đóng gói ảnh ở ' +
             'Chặng 09.</p>' }
      ]},

      /* ─────────── BƯỚC 7 ─────────── */
      { title: 'Chạy thử dưới <code>qemu-aarch64</code>', blocks: [

        { t: 'p', x:
          'Kích thước đẹp mà chương trình không chạy thì vô nghĩa. Bản tĩnh trước, vì nó không ' +
          'cần gì bên ngoài:' },

        { t: 'code', where: 'wsl', code:
          'timeout 3 qemu-aarch64 ./d_musl_static\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[daemon] pid 454 - listening on port 9006, epoll fd 5, signalfd 3\n' +
          '[daemon] signal 15 (Terminated) via signalfd - beginning graceful shutdown\n' +
          '[daemon] served 0 requests, closed every file descriptor cleanly, exiting 0\n' +
          'rc=124',
          notes: ['<code>pid 454</code> là PID thật do QEMU cấp, sẽ khác trên máy bạn mỗi lần chạy.'] },

        { t: 'cal', kind: 'why', title: 'Ba dòng này chứng minh nhiều hơn bạn tưởng',
          x: '<p>Chúng cho thấy <code>epoll_create1</code>, <code>signalfd4</code>, ' +
             '<code>socket</code>, <code>bind</code> và <code>listen</code> đều hoạt động — tức ' +
             'là musl gọi syscall đúng và <code>qemu-aarch64</code> dịch đúng. Dòng thứ hai còn ' +
             'chứng minh <code>SIGTERM</code> đi qua <code>signalfd</code> chứ không qua trình xử ' +
             'lý tín hiệu, đúng thiết kế của Bài 24.</p>' +
             '<p><code>rc=124</code> là mã thoát của <code>timeout</code> khi nó phải giết tiến ' +
             'trình — <b>không phải lỗi</b>. Bản thân daemon thoát với mã <b>0</b>, như dòng cuối ' +
             'tự khai báo.</p>' },

        { t: 'p', x:
          'Giờ tới bản động. Chạy trần, nó hỏng — và hãy đọc kỹ thông báo:' },

        { t: 'code', where: 'wsl', code:
          'qemu-aarch64 ./d_musl_dyn\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          "qemu-aarch64: Could not open '/lib/ld-musl-aarch64.so.1': No such file or directory\n" +
          'rc=255' },

        { t: 'p', x:
          'Bài 27 cho bạn <i>đúng</i> lỗi này với tên file <code>/lib/ld-linux-aarch64.so.1</code>. ' +
          'Cách chữa cũng y hệt — chỉ tay QEMU vào sysroot, lần này là sysroot của toolchain bạn ' +
          'vừa dựng:' },

        { t: 'code', where: 'wsl', code:
          'SYSROOT=$(aarch64-unknown-linux-musl-gcc -print-sysroot)\n' +
          'echo "$SYSROOT"\n' +
          'timeout 3 qemu-aarch64 -L "$SYSROOT" ./d_musl_dyn\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/home/shinarus/x-tools/aarch64-unknown-linux-musl/aarch64-unknown-linux-musl/sysroot\n' +
          '[daemon] pid 426 - listening on port 9006, epoll fd 5, signalfd 3\n' +
          '[daemon] signal 15 (Terminated) via signalfd - beginning graceful shutdown\n' +
          '[daemon] served 0 requests, closed every file descriptor cleanly, exiting 0\n' +
          'rc=124',
          notes: ['Tên người dùng trong đường dẫn và <code>pid 426</code> sẽ khác trên máy bạn.'] },

        { t: 'cal', kind: 'tip', title: '<code>-print-sysroot</code> đáng thuộc lòng',
          x: '<p>Đừng gõ tay đường dẫn sysroot — nó dài, và nó đổi theo từng toolchain. ' +
             '<code>gcc -print-sysroot</code> hỏi thẳng trình biên dịch. Cùng họ với nó: ' +
             '<code>-print-file-name=libc.a</code> cho biết thư viện nào <i>thực sự</i> được ' +
             'liên kết, và <code>-print-search-dirs</code> liệt kê mọi nơi trình liên kết sẽ ' +
             'tìm.</p>' +
             '<p>Khi một bản build lấy nhầm thư viện của máy build thay vì của target — lỗi kinh ' +
             'điển ở Chặng 11 — ba lệnh này là thứ chỉ ra sự thật trong vài giây.</p>' },

        { t: 'p', x:
          'Bạn vừa khép một vòng tròn: mã nguồn của Bài 24, dựng bằng toolchain do chính bạn làm ' +
          'ra ở bài này, chạy bằng kỹ thuật của Bài 27, cho ra đúng hành vi đã thiết kế.' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng trong bảng này đều xuất hiện thật khi dựng toolchain cho bài học, trên chính máy ' +
      'bạn đang dùng. Cột đầu là thứ bạn sẽ thấy trong <code>build.log</code>.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>configure: error: missing required tool: makeinfo</code>',
         'Thiếu gói <code>texinfo</code>. <code>./configure</code> của crosstool-NG kiểm tra ngay từ đầu vì binutils và GCC cần nó để dựng tài liệu',
         '<code>sudo apt-get install -y texinfo</code>, rồi chạy lại <code>./configure --enable-local</code>'],
        ['<code>configure: error: unable to find python program</code><br>ở bước <i>Installing cross-gdb</i>',
         '<code>gdb</code> tìm lệnh tên <b><code>python</code></b>, còn Ubuntu 26.04 chỉ cài <code>python3</code>. Bước 17/19 gãy sau <b>52 phút</b> chờ',
         '<code>sudo apt-get install -y python-is-python3</code>. Hoặc tắt gdb trong <code>menuconfig</code> nếu chưa cần'],
        ['<code>You asked to restart a non-restartable build</code><br><code>This happened because you didn\'t set CT_DEBUG_CT_SAVE_STEPS</code>',
         'Bạn thử <code>ct-ng debug+</code> để chạy lại từ bước gãy, nhưng bản build trước không lưu trạng thái',
         'Không cứu được lần này — phải build lại từ đầu. Lần sau <b>bật <i>Save intermediate steps</i> trước</b>, như bước 3 đã làm'],
        ['<code>404  Not Found</code> khi <code>apt-get install</code>',
         'Danh sách gói trong máy trỏ tới một phiên bản đã bị gỡ khỏi kho',
         'Luôn <code>sudo apt-get update</code> trước khi cài'],
        ['<code>build.log</code> đầy <code>[00:01] / [00:01] - [00:01] \\ …</code>',
         '<code>CT_LOG_PROGRESS_BAR=y</code>. Con quay tiến trình được ghi vào file, không chỉ ra màn hình',
         'Tắt <i>Progress bar</i> trong <code>menuconfig</code> (bước 3). Với file đã có: <code>sed -e \'s/\\[[0-9:]*\\] [\\/|\\\\-] //g\'</code>'],
        ['Bản build gãy với lỗi khó hiểu về tên file, hoặc chậm bất thường',
         'Bạn đang build trên <code>/mnt/c</code>. NTFS qua lớp 9P không phân biệt hoa thường và chậm <b>52×</b> (đo ở Bài 1)',
         'Chuyển toàn bộ thư mục làm việc vào <code>~</code>. Không có cách vá nào khác'],
        ['<code>mkdir: cannot create directory … Permission denied</code> ở thư mục <code>~/x-tools/…</code>',
         'Toolchain lần trước đã được bước <code>finish</code> đặt quyền chỉ đọc (<code>CT_PREFIX_DIR_RO=y</code>)',
         '<code>chmod -R u+w ~/x-tools/&lt;target&gt;</code> rồi <code>rm -rf</code> nó trước khi build lại'],
        ['<code>No space left on device</code> giữa chừng',
         '<code>.build</code> phình tới <b>18 GB</b> khi build đủ cả GCC hai lần và gdb, có bật <i>Save intermediate steps</i>',
         'Dọn đĩa cho tối thiểu <b>25 GB</b> trống. Kiểm tra bằng <code>df -h /</code> trước khi bắt đầu'],
        ['Bản build dừng rất lâu ở <i>Retrieving needed toolchain components\' tarballs</i>',
         'Lần đầu phải tải khoảng 20 gói mã nguồn từ gnu.org, kernel.org, musl.libc.org. Thư mục build mới thì tải lại từ đầu',
         'Đặt <i>Paths and misc options → Local tarballs directory</i> trỏ tới một thư mục dùng chung, ví dụ <code>~/src</code>, để mọi bản build sau dùng lại'],
        ['<code>qemu-aarch64: Could not open \'/lib/ld-musl-aarch64.so.1\'</code>',
         'Nhị phân musl liên kết động, nhưng trình nạp của musl không có trong hệ thống file của máy build',
         '<code>qemu-aarch64 -L $(aarch64-unknown-linux-musl-gcc -print-sysroot) ./chương_trình</code>'],
        ['<code>aarch64-unknown-linux-musl-gcc: command not found</code>',
         '<code>~/x-tools/&lt;target&gt;/bin</code> chưa có trong <code>PATH</code>. Mỗi terminal mới lại quên',
         '<code>export PATH=$HOME/x-tools/aarch64-unknown-linux-musl/bin:$PATH</code>, hoặc thêm dòng đó vào <code>~/.bashrc</code>'],
        ['Mã nguồn của bên thứ ba báo <code>unknown type name \'__u64\'</code> hoặc <code>implicit declaration of \'strlcpy\'</code>',
         'Mã đó chỉ từng được dịch bằng glibc và dựa vào phần mở rộng ngoài chuẩn',
         'Vá mã nguồn, hoặc lấy patch có sẵn của Alpine Linux — họ duy trì kho patch cho đúng vấn đề này']
      ]},

    /* ══════════════════════════════════════════════
       RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Tự build toolchain là cần thiết khi rootfs dùng <b>libc khác</b>, khi board chạy <b>nhân cũ hơn</b> máy build, khi bản build phải <b>lặp lại được</b>, hoặc khi cần thứ bản phân phối không đóng gói.',
      'Bài toán <b>con gà — quả trứng</b>: GCC đầy đủ cần libc, libc cần GCC. crosstool-NG cắt vòng bằng <b><code>cc_core</code></b> — một GCC què vừa đủ để dịch libc.',
      'Thứ tự <b>19 bước</b> có logic chặt: <code>binutils</code> → <code>kernel_headers</code> → <code>libc_headers</code> → <b><code>cc_core</code></b> → <b><code>libc_main</code></b> → <b><code>cc_for_host</code></b> → <code>debug</code> → <code>finish</code>.',
      'Ba hậu tố <code>_for_build</code> / <code>_for_host</code> / <code>_for_target</code> chính là bộ ba build–host–target. <b><code>cc_for_host</code> mới là trình biên dịch cross</b> mà bạn muốn, không phải <code>cc_for_build</code>.',
      'crosstool-NG chỉ nặng <b>2 448 288</b> byte vì nó <b>không chứa trình biên dịch nào</b> — nó tải mã nguồn thật lúc build. Kết quả là một toolchain <b>354 MB</b>, gấp <b>151 lần</b> chính nó.',
      'Luôn bắt đầu từ một <b>sample</b> (bản 1.28.0 có <b>146</b> sample, <b>15</b> cho aarch64) rồi sửa qua <code>menuconfig</code>. Trong <b>931</b> dòng <code>.config</code> chỉ có khoảng <b>12</b> dòng bạn thật sự phải quan tâm.',
      'Bật <b><i>Save intermediate steps</i></b> và tắt <b><i>Progress bar</i></b> <i>trước</i> khi build. Không bật cái đầu thì một lỗi ở bước 17/19 buộc bạn làm lại cả <b>52 phút</b>.',
      'Cùng một <code>temp_daemon.c</code>, liên kết tĩnh: glibc <b>787 032</b> byte, musl <b>108 720</b> byte — <b>7,24×</b>. Sau <code>strip</code>: <b>655 288</b> so với <b>42 512</b> — <b>15,4×</b>.',
      'Chênh lệch nằm ở mã lệnh: <code>.text</code> <b>626 361</b> so với <b>39 300</b> byte. Phần <code>.bss</code> cũng vậy — <b>22 680</b> so với <b>1 792</b> byte RAM lúc chạy.',
      'Nhị phân musl dùng trình nạp <b><code>/lib/ld-musl-aarch64.so.1</code></b> và chỉ có <b>một</b> dòng <code>NEEDED: libc.so</code>. Đó là lý do nhị phân glibc không chạy được trên rootfs musl và ngược lại.',
      'Cái giá của musl là <b>mã nguồn của người khác</b>: dự án dựa vào phần mở rộng GNU sẽ không dịch được và phải vá.',
      '<code>gcc -print-sysroot</code>, <code>-print-file-name=</code> và <code>-print-search-dirs</code> là ba lệnh hỏi thẳng trình biên dịch xem nó đang thật sự dùng gì.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Bạn đã có trình biên dịch, và có một nhị phân ARM64 chạy được — nhưng nó mới chỉ ' +
         'chạy dưới <code>qemu-aarch64</code>, tức là <b>vẫn mượn nhân Linux của WSL</b>. Chương ' +
         'trình của bạn chưa hề thấy một nhân ARM64 thật nào.</p>' +
         '<p>Chặng 05 mở ra bằng <code>qemu-system-aarch64</code>: một máy ảo đầy đủ, có nhân ' +
         'riêng, có bộ nhớ riêng, khởi động từ con số không. Bài tiếp theo sẽ dựng một máy ' +
         '<code>virt</code> và cho nó chạy — rồi đo xem một nhân ARM64 mất bao lâu để lên tới dấu ' +
         'nhắc, khi CPU thật ra chỉ là phần mềm giả lập. Nhớ lại Bài 1: nhân WSL2 chạy tới ' +
         '<code>Freeing unused kernel image</code> ở <b>0,376880 s</b>. Con số trong QEMU sẽ ' +
         'không giống thế.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    {
      q: 'Vì sao crosstool-NG phải dựng <code>cc_core</code> trước khi dựng thư viện C, rồi lại dựng GCC lần thứ hai ở bước <code>cc_for_host</code>?',
      opts: [
        'Để tận dụng nhiều lõi CPU — hai bản GCC được build song song',
        'Vì GCC đầy đủ cần thư viện C để dựng <code>libgcc</code> và C++, nhưng thư viện C lại cần một trình biên dịch để được dịch; <code>cc_core</code> cắt vòng phụ thuộc đó',
        'Vì bản GCC đầu tiên luôn có lỗi và phải build lại để sửa',
        'Để so sánh hai bản GCC và chọn bản nhỏ hơn'
      ],
      a: 1,
      why: 'Đây là bài toán con gà — quả trứng. GCC đầy đủ phụ thuộc vào libc, libc phụ thuộc vào một trình biên dịch. Lối thoát là dựng một GCC <b>cố ý thiếu tính năng</b> (<code>cc_core</code>): chỉ ngôn ngữ C, không <code>libgcc</code> hoàn chỉnh, không C++. Chừng đó đủ để dịch musl. Có musl rồi mới dựng lại GCC đầy đủ. Hai bản GCC là <b>tuần tự và bắt buộc</b>, không phải song song hay dư thừa.'
    },
    {
      q: 'Trong crosstool-NG, bước <code>cc_for_host</code> tạo ra cái gì?',
      opts: [
        'Trình biên dịch native chạy trên máy build và sinh mã cho máy build',
        'Trình biên dịch chạy <i>trên</i> board ARM64',
        '<b>Trình biên dịch cross</b> — chạy trên máy build của bạn và sinh mã cho ARM64',
        'Bộ thư viện C dành cho máy build'
      ],
      a: 2,
      why: 'Theo quy ước Autotools, <b>host</b> là máy mà chương trình sẽ <i>chạy trên đó</i>. Toolchain của bạn chạy trên WSL, nên host = WSL; nó sinh mã cho ARM64, nên target = ARM64. Vì thế <code>cc_for_host</code> — dù tên nghe như "cho máy tôi" — chính là trình biên dịch cross. Trình biên dịch native tạm thời là <code>cc_for_build</code>; trình biên dịch chạy trên board là <code>*_for_target</code>.'
    },
    {
      q: 'Bạn dịch cùng một chương trình với <code>-static</code>: bản glibc ra <b>787 032</b> byte, bản musl ra <b>108 720</b> byte. Nguyên nhân chính của chênh lệch nằm ở đâu?',
      opts: [
        'musl bỏ bớt tính năng nên phần mã lệnh nhỏ hơn nhiều — <code>.text</code> là 39 300 so với 626 361 byte',
        'musl nén nhị phân lại sau khi liên kết',
        'Bản musl đã được <code>strip</code> tự động còn bản glibc thì chưa',
        'musl dùng chỉ thị máy ARM64 ngắn hơn'
      ],
      a: 0,
      why: '<code>size</code> trả lời trực tiếp: <code>.text</code> của bản musl là <b>39 300</b> byte, của bản glibc là <b>626 361</b> byte. Vì mã nguồn chương trình giống hệt nhau, toàn bộ <b>587 061</b> byte chênh lệch là phần thư viện C bị kéo vào lúc liên kết tĩnh. Không có nén, không có strip tự động, và cả hai đều sinh cùng một tập chỉ thị AArch64.'
    },
    {
      q: 'Bản build của bạn gãy ở bước 17/19 sau 52 phút. Bạn gõ <code>ct-ng debug+</code> và nhận <code>You asked to restart a non-restartable build</code>. Nguyên nhân nào có khả năng nhất?',
      opts: [
        'Bạn gõ sai tên bước — phải là <code>ct-ng +debug</code>',
        '<code>.config</code> đã bị sửa sau khi build bắt đầu',
        'Bản build trước không bật <code>CT_DEBUG_CT_SAVE_STEPS</code>, nên không có trạng thái nào được lưu để chạy tiếp',
        'Thư mục <code>~/x-tools</code> đang ở chế độ chỉ đọc'
      ],
      a: 2,
      why: 'Chính thông báo nói rõ nguyên nhân. Không bật <i>Save intermediate steps</i> thì crosstool-NG không lưu ảnh chụp trạng thái sau mỗi bước, nên không có gì để tiếp tục và nó dừng "để tránh gây hoạ". Đây là lỗi <b>không cứu được sau khi đã xảy ra</b> — phải build lại từ đầu. Lưu ý phân biệt: <code>+debug</code> nghĩa là chạy <i>tới hết</i> bước đó, còn <code>debug+</code> là chạy <i>từ</i> bước đó trở đi; ở đây <code>debug+</code> mới là ý định đúng.'
    },
    {
      q: 'Một đồng nghiệp chép nhị phân ARM64 dựng bằng toolchain glibc của Ubuntu lên board chạy rootfs Alpine (musl). Chương trình báo <code>not found</code> dù file rõ ràng tồn tại và có quyền chạy. Chẩn đoán đúng nhất là gì?',
      opts: [
        'Board dùng CPU 32 bit nên không chạy được nhị phân ARM64',
        'File bị hỏng trong lúc chép — cần chép lại',
        'Nhị phân yêu cầu trình nạp <code>/lib/ld-linux-aarch64.so.1</code>, nhưng rootfs musl chỉ có <code>/lib/ld-musl-aarch64.so.1</code>',
        'Thiếu quyền thực thi cho nhóm người dùng'
      ],
      a: 2,
      why: 'Thông báo <code>not found</code> khó hiểu vì nó nói về <b>trình thông dịch động</b> ghi trong section <code>.interp</code>, chứ không phải về chính file bạn gõ. Nhân đọc <code>.interp</code>, đi tìm <code>/lib/ld-linux-aarch64.so.1</code>, không thấy, và báo lỗi bằng tên file bạn vừa gõ. Kiểm tra bằng <code>readelf -p .interp</code>. Cách chữa: dựng lại bằng toolchain musl, hoặc liên kết tĩnh — bản tĩnh không cần trình nạp nào cả.'
    },
    {
      q: 'Vì sao crosstool-NG tự tải và build cả GMP, MPFR, MPC thay vì dùng gói có sẵn của Ubuntu?',
      opts: [
        'Vì gói của Ubuntu thiếu tính năng cần thiết',
        'Vì dùng gói của hệ thống sẽ khiến toolchain phụ thuộc vào phiên bản thư viện của máy build, làm bản build không lặp lại được',
        'Vì Ubuntu không đóng gói ba thư viện đó',
        'Vì ba thư viện đó phải được biên dịch cho ARM64'
      ],
      a: 1,
      why: 'GCC dùng GMP/MPFR/MPC để tính số học chính xác tuỳ ý ngay lúc biên dịch. Nếu lấy bản của hệ thống, cùng một <code>.config</code> chạy trên hai máy khác nhau sẽ cho ra hai toolchain khác nhau — mất tính lặp lại, vốn là một trong bốn lý do chính để tự build. Ba thư viện này được dựng cho <b>máy build</b> (chúng chạy bên trong GCC), không phải cho ARM64.'
    },
    {
      q: 'Bạn cần dựng toolchain cho một board chạy nhân Linux 5.10. Trong <code>.config</code> nên đặt <code>CT_LINUX_VERSION</code> thế nào?',
      opts: [
        'Bằng phiên bản mới nhất hiện có, để dùng được nhiều tính năng nhất',
        'Bằng phiên bản nhân của máy build, vì toolchain chạy trên máy build',
        'Bằng 5.10 hoặc thấp hơn — chương trình dịch cho nhân cũ chạy được trên nhân mới, chiều ngược lại thì không',
        'Không quan trọng, vì header nhân chỉ ảnh hưởng tới việc build nhân'
      ],
      a: 2,
      why: 'Header nhân khai báo số hiệu syscall và các hằng số mà thư viện C dùng để nói chuyện với nhân. Linux giữ tương thích <b>một chiều</b>: nhị phân dịch cho nhân cũ chạy được trên nhân mới. Dịch bằng header 6.16 rồi chạy trên nhân 5.10 thì chương trình có thể gọi syscall chưa tồn tại và nhận <code>ENOSYS</code> lúc chạy. Nguyên tắc: đặt bằng <b>nhân cũ nhất mà bạn phải hỗ trợ</b>. Phiên bản nhân của máy build hoàn toàn không liên quan.'
    }
  ]
});

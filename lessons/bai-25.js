/* Bài 25 — Vì sao phải cross-compile
   Chặng 04 — Cross-compilation (bài mở chặng) */

Lesson.register({
  id: 'bai-25',
  title: 'Vì sao phải cross-compile',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    '<p>Ở Bài 24 bạn đã dựng xong một daemon hoàn chỉnh: đa luồng, tắt êm bằng ' +
    '<code>SIGTERM</code>, phục vụ khách qua TCP. Nó chạy tốt — trên WSL, tức là trên chính ' +
    'con CPU Intel trong máy bạn. Nhưng thiết bị nhúng mà bạn nhắm tới hầu như không bao giờ ' +
    'là Intel. Nó là ARM.</p>' +
    '<p>Bạn đã gặp hậu quả của chuyện đó từ rất sớm. Ở <b>Bài 3</b>, khi thử chạy một file ' +
    'nhị phân ARM64 trên máy mình, shell trả lời <code>Exec format error</code> và mã thoát ' +
    '<b>126</b>. Lúc đó bạn chỉ cần biết "nó không chạy được". Bài này giải thích <i>vì sao</i> ' +
    'nó không chạy được, ở mức từng lệnh máy — và vì sao câu trả lời <b>không phải</b> là mang ' +
    'trình biên dịch lên board.</p>' +
    '<p>Bạn sẽ tự tay đo ba con số quyết định: trình biên dịch ngốn <b>68 468 KB</b> RAM chỉ để ' +
    'dịch một file; bộ công cụ chiếm <b>111 MB</b> đĩa; và khi bị giới hạn xuống 64 MB bộ nhớ nó ' +
    'chết với dòng <code>virtual memory exhausted</code>. Đó là ba lý do kỹ thuật, không phải ' +
    'ba lời khuyên.</p>' +
    '<p>Cuối bài bạn sẽ đọc được ba từ mà mọi tài liệu toolchain đều dùng và gần như mọi người ' +
    'mới đều nhầm: <b>build</b>, <b>host</b>, <b>target</b>. Ba từ đó nằm ngay trong dòng ' +
    '<code>configure</code> thật của trình biên dịch đang có trên máy bạn — bạn sẽ tự in nó ra ' +
    'và chỉ đúng vào chỗ.</p>',

  goals: [
    'Chỉ ra được ba khác biệt cụ thể giữa x86-64 và ARM64 bằng chính mã máy <code>gcc</code> sinh ra từ một file C duy nhất',
    'Giải thích được vì sao nhân từ chối chạy một file ELF ARM64 trên x86-64, và mã thoát <b>126</b> đến từ đâu',
    'Đo được bằng số ba chi phí của việc build ngay trên target: RAM, dung lượng đĩa, và thời gian',
    'Chứng minh được rằng cross-compile <b>không</b> tốn thêm thời gian trên máy build — bằng hai phép đo cạnh nhau',
    'Dùng đúng ba từ <b>build</b> / <b>host</b> / <b>target</b> và chỉ ra chúng trong dòng cấu hình thật của GCC',
    'Phân biệt bốn kiểu build: native, cross, cross-native và Canadian cross'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. HAI BỘ MÁY, HAI THỨ TIẾNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai con CPU, hai thứ tiếng không dịch được cho nhau' },

    { t: 'p', x:
      'Một file thực thi không chứa "chương trình" theo nghĩa trừu tượng. Nó chứa <b>mã máy</b> ' +
      '— một dãy byte mà đúng <i>một</i> họ CPU biết cách giải mã. Bài 18 đã cho bạn thấy phần ' +
      'vỏ ELF bọc quanh dãy byte đó; bài này nói về chính dãy byte bên trong.' },

    { t: 'p', x:
      'Trường <code>e_machine</code> trong ELF header ghi rõ dãy byte ấy dành cho ai. Nhân Linux ' +
      'đọc trường đó <b>trước tiên</b> khi bạn gọi <code>execve()</code>. Nếu số hiệu không khớp ' +
      'với kiến trúc nó đang chạy, nhân trả về lỗi <code>ENOEXEC</code> ngay lập tức — chưa nạp ' +
      'lấy một byte mã lệnh nào.' },

    { t: 'terms', items: [
      ['ISA', 'Instruction Set Architecture', 'Bộ lệnh của một họ CPU: có những lệnh nào, mã hoá ra bao nhiêu byte, có bao nhiêu thanh ghi. <code>x86-64</code> và <code>ARM64</code> là hai ISA khác nhau hoàn toàn, không phải hai phiên bản của một thứ'],
      ['x86-64', 'AMD64, Intel 64', 'ISA của CPU máy bàn và máy chủ. Lệnh dài <b>1–15 byte</b>, lệnh số học đọc thẳng từ bộ nhớ được. Máy bạn đang ngồi dùng ISA này'],
      ['ARM64', 'AArch64, arm64', 'ISA 64-bit của ARM, có từ ARMv8-A. Mọi lệnh dài <b>đúng 4 byte</b>, số học chỉ làm việc trên thanh ghi. Hầu hết SoC nhúng đời mới dùng ISA này'],
      ['ARM32', 'armhf, armv7', 'ISA 32-bit đời trước của ARM. Con trỏ 4 byte. Vẫn còn cực nhiều trên thiết bị đang chạy ngoài đời — Raspberry Pi 2, và mọi board Cortex-A7'],
      ['RISC', 'Reduced Instruction Set Computer', 'Triết lý thiết kế: ít lệnh, mỗi lệnh làm một việc đơn giản, độ dài cố định. ARM theo hướng này'],
      ['CISC', 'Complex Instruction Set Computer', 'Triết lý ngược lại: nhiều lệnh, một lệnh có thể vừa đọc bộ nhớ vừa tính toán, độ dài thay đổi. x86 theo hướng này'],
      ['Cross-compile', 'biên dịch chéo', 'Dịch trên máy có ISA A ra mã máy cho ISA B. Từ khoá của cả Chặng 04'],
      ['ENOEXEC', '', 'Mã lỗi số 8 của nhân: "định dạng thực thi sai". Shell dịch nó thành câu <code>Exec format error</code> và thoát với mã <b>126</b>']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao không có "trình dịch mã máy" chạy lúc thi hành?',
      x: '<p>Câu hỏi rất tự nhiên: nếu Java chạy được mọi nơi nhờ máy ảo, sao mã máy ARM không ' +
         'được dịch sang x86 khi chạy?</p>' +
         '<p>Được — đó chính xác là việc QEMU làm, và <b>Chặng 05</b> sẽ mổ xẻ kỹ thuật đó ' +
         '(gọi là TCG, dịch lệnh động). Nhưng nó tốn kém: mỗi lệnh ARM phải được đọc, phân ' +
         'tích, dịch sang lệnh x86 tương đương rồi mới chạy. Nhân Linux <b>không</b> làm việc ' +
         'này mặc định vì đó không phải việc của nhân — nó chỉ nạp và nhảy vào.</p>' +
         '<p>Nói cách khác: nhân từ chối không phải vì không thể, mà vì <code>execve()</code> ' +
         'được thiết kế để nạp mã <i>chạy trực tiếp</i>. Muốn có lớp dịch, bạn phải cài thêm ' +
         'một chương trình làm việc đó — và tự nói cho nhân biết, qua <code>binfmt_misc</code>.</p>' },

    /* ══════════════════════════════════════════════
       2. CÙNG MỘT FILE C, HAI BỘ MÃ MÁY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cùng một file C, hai bộ mã máy hoàn toàn khác nhau' },

    { t: 'p', x:
      'Lý thuyết thì dễ đồng ý. Nhìn tận mắt thì mới nhớ. Lấy một hàm C tầm thường — cộng dồn ' +
      'một mảng số nguyên — rồi bắt hai trình biên dịch dịch nó ra hai ISA.' },

    { t: 'code', where: 'file', name: 'sum.c', lang: 'c', code:
      'int sum_array(const int *data, int n)\n' +
      '{\n' +
      '    int total = 0;\n' +
      '    for (int i = 0; i < n; i++)\n' +
      '        total += data[i];\n' +
      '    return total;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -c sum.c -o sum-x86.o\n' +
      'aarch64-linux-gnu-gcc -O2 -c sum.c -o sum-arm64.o\n' +
      'file sum-x86.o sum-arm64.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sum-x86.o:   ELF 64-bit LSB relocatable, x86-64, version 1 (SYSV), not stripped\n' +
      'sum-arm64.o: ELF 64-bit LSB relocatable, ARM aarch64, version 1 (SYSV), not stripped' },

    { t: 'p', x:
      'Cùng vỏ ELF 64-bit little-endian, nhưng dòng thứ ba khác hẳn: <code>x86-64</code> so với ' +
      '<code>ARM aarch64</code>. Giờ mở ruột ra bằng <code>objdump -d</code>, công cụ bạn đã ' +
      'dùng ở Bài 18.' },

    { t: 'code', where: 'wsl', code: 'objdump -d sum-x86.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sum-x86.o:     file format elf64-x86-64\n' +
      '\n' +
      'Disassembly of section .text:\n' +
      '\n' +
      '0000000000000000 <sum_array>:\n' +
      '   0:\tf3 0f 1e fa          \tendbr64\n' +
      '   4:\t85 f6                \ttest   %esi,%esi\n' +
      '   6:\t7e 28                \tjle    30 <sum_array+0x30>\n' +
      '   8:\t48 63 f6             \tmovslq %esi,%rsi\n' +
      '   b:\t31 c0                \txor    %eax,%eax\n' +
      '   d:\t48 8d 14 b7          \tlea    (%rdi,%rsi,4),%rdx\n' +
      '  11:\t0f 1f 40 00          \tnopl   0x0(%rax)\n' +
      '  15:\t66 66 2e 0f 1f 84 00 \tdata16 cs nopw 0x0(%rax,%rax,1)\n' +
      '  1c:\t00 00 00 00 \n' +
      '  20:\t03 07                \tadd    (%rdi),%eax\n' +
      '  22:\t48 83 c7 04          \tadd    $0x4,%rdi\n' +
      '  26:\t48 39 d7             \tcmp    %rdx,%rdi\n' +
      '  29:\t75 f5                \tjne    20 <sum_array+0x20>\n' +
      '  2b:\tc3                   \tret\n' +
      '  2c:\t0f 1f 40 00          \tnopl   0x0(%rax)\n' +
      '  30:\t31 c0                \txor    %eax,%eax\n' +
      '  32:\tc3                   \tret' },

    { t: 'code', where: 'wsl', code: 'aarch64-linux-gnu-objdump -d sum-arm64.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sum-arm64.o:     file format elf64-littleaarch64\n' +
      '\n' +
      'Disassembly of section .text:\n' +
      '\n' +
      '0000000000000000 <sum_array>:\n' +
      '   0:\t7100003f \tcmp\tw1, #0x0\n' +
      '   4:\t5400018d \tb.le\t34 <sum_array+0x34>\n' +
      '   8:\taa0003e2 \tmov\tx2, x0\n' +
      '   c:\t8b214801 \tadd\tx1, x0, w1, uxtw #2\n' +
      '  10:\t52800000 \tmov\tw0, #0x0                   \t// #0\n' +
      '  14:\td503201f \tnop\n' +
      '  18:\td503201f \tnop\n' +
      '  1c:\td503201f \tnop\n' +
      '  20:\tb8404443 \tldr\tw3, [x2], #4\n' +
      '  24:\t0b030000 \tadd\tw0, w0, w3\n' +
      '  28:\teb01005f \tcmp\tx2, x1\n' +
      '  2c:\t54ffffa1 \tb.ne\t20 <sum_array+0x20>  // b.any\n' +
      '  30:\td65f03c0 \tret\n' +
      '  34:\t52800000 \tmov\tw0, #0x0                   \t// #0\n' +
      '  38:\td65f03c0 \tret' },

    { t: 'p', x:
      'Hãy nhìn <b>cột byte ở giữa</b> trước khi nhìn tên lệnh. Đó là chỗ khác biệt lộ ra rõ ' +
      'nhất, và nó không phải chuyện thẩm mỹ.' },

    { t: 'table',
      head: ['Điểm', 'x86-64', 'ARM64'],
      rows: [
        ['Độ dài một lệnh', '<b>2 đến 7 byte</b> trong chính đoạn mã trên (<code>c3</code> dài 1, <code>66 66 2e 0f 1f 84 00…</code> dài 11)', '<b>Luôn đúng 4 byte</b>. Không ngoại lệ'],
        ['Vòng lặp cộng dồn', '<code>add (%rdi),%eax</code> — <b>một</b> lệnh vừa đọc bộ nhớ vừa cộng', '<code>ldr w3, [x2], #4</code> rồi <code>add w0, w0, w3</code> — <b>hai</b> lệnh, tách bạch'],
        ['Truy cập bộ nhớ', 'Hầu như lệnh nào cũng nhận toán hạng bộ nhớ', 'Chỉ <code>ldr</code>/<code>str</code> chạm bộ nhớ. Gọi là kiến trúc <b>load/store</b>'],
        ['Tên thanh ghi', '<code>%rdi</code>, <code>%rsi</code>, <code>%rax</code>, <code>%rdx</code> — 16 cái, tên chữ', '<code>x0</code>–<code>x30</code> (64-bit) hoặc <code>w0</code>–<code>w30</code> (32-bit thấp) — 31 cái, tên số'],
        ['Tham số hàm đầu tiên', '<code>%rdi</code>', '<code>x0</code>'],
        ['Trả về giá trị', '<code>%eax</code>', '<code>w0</code>'],
        ['Tăng con trỏ trong vòng lặp', 'Một lệnh riêng: <code>add $0x4,%rdi</code>', 'Gộp vào chính lệnh nạp: <code>[x2], #4</code> — gọi là <b>post-index</b>'],
        ['Số lệnh của cả hàm', '<b>17</b>', '<b>15</b>'],
        ['Kích thước <code>.text</code>', '<b>51 byte</b>', '<b>60 byte</b>']
      ]},

    { t: 'cal', kind: 'info', title: '15 lệnh × 4 byte = 60 byte, không dư một byte',
      x: '<p>Con số <b>60</b> ở ô cuối bảng không phải trùng hợp. ARM64 mã hoá <i>mọi</i> lệnh ' +
         'bằng đúng 4 byte, nên 15 lệnh chiếm chính xác 60 byte. Bạn kiểm chứng lại được ngay ' +
         'trong bản dịch trên: mọi cột byte đều là 8 chữ số hex, và địa chỉ bên trái nhảy đều ' +
         '<code>0, 4, 8, c, 10, 14…</code>.</p>' +
         '<p>Phía x86-64 thì 17 lệnh chỉ chiếm 51 byte — trung bình <b>3 byte</b> một lệnh, ' +
         'nhưng dao động từ 1 tới 11. Địa chỉ nhảy lộn xộn: <code>0, 4, 6, 8, b, d, 11, 15, ' +
         '20…</code></p>' +
         '<p>Đổi lại, ARM64 dùng <b>ít lệnh hơn</b> cho cùng công việc (15 so với 17) nhờ có ' +
         'nhiều thanh ghi hơn và nhờ lệnh gộp như <code>add x1, x0, w1, uxtw #2</code> — một ' +
         'lệnh này vừa mở rộng dấu <code>w1</code> vừa nhân 4 vừa cộng vào <code>x0</code>.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao độ dài lệnh cố định lại quan trọng với thiết bị nhúng?',
      x: '<p>Ba hệ quả rất thực tế, bạn sẽ gặp lại cả ba ở các chặng sau:</p>' +
         '<ul>' +
         '<li><b>Bộ giải mã đơn giản hơn</b> nên tốn ít transistor và ít điện hơn. Đây là lý do ' +
         'gốc khiến ARM thắng ở mảng chạy pin.</li>' +
         '<li><b>Địa chỉ lệnh luôn chia hết cho 4</b>, nên nhân và bộ gỡ lỗi biết chắc chỗ nào ' +
         'là đầu một lệnh. Ở x86 thì không — nhảy vào giữa một lệnh dài vẫn ra một lệnh hợp lệ ' +
         'khác. Bạn sẽ thấy điều này có ích khi đọc backtrace ở <b>Chặng 12</b>.</li>' +
         '<li><b>Mã ARM64 hơi phình hơn</b> (60 so với 51 byte ở ví dụ này). Với một hàm thì ' +
         'không sao; với cả một kernel thì đó là vài trăm KB flash. Đó là lý do ARM có thêm ' +
         'chế độ nén lệnh <b>Thumb-2</b> (lệnh 2 hoặc 4 byte) cho ARM32 — bạn sẽ nhìn thấy nó ' +
         'ở Bài 26 khi mổ trình biên dịch <code>arm-linux-gnueabihf</code>.</li>' +
         '</ul>' },

    { t: 'fig', cap:
      'Một file C, hai trình biên dịch, hai dãy byte không thể thay thế cho nhau. Phần đầu ELF ' +
      'ghi rõ dãy byte đó dành cho ai — nhân đọc đúng chỗ đó rồi mới quyết định nạp hay từ chối.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ một file sum.c được hai trình biên dịch dịch ra hai bộ mã máy khác nhau">' +
      '<rect class="d-box-p" x="270" y="14" width="180" height="34" rx="6"/>' +
      '<text class="d-tm" x="360" y="36" text-anchor="middle">sum.c</text>' +
      '<text class="d-ts" x="360" y="62" text-anchor="middle">một file nguồn duy nhất</text>' +

      '<line class="d-line" x1="330" y1="70" x2="180" y2="96"/>' +
      '<path class="d-arrow" d="M180 96 L191 93 L188 103 Z"/>' +
      '<line class="d-line" x1="390" y1="70" x2="540" y2="96"/>' +
      '<path class="d-arrow" d="M540 96 L529 93 L532 103 Z"/>' +

      '<rect class="d-box" x="30" y="98" width="300" height="30" rx="6"/>' +
      '<text class="d-tm" x="180" y="118" text-anchor="middle">gcc -O2 -c</text>' +
      '<rect class="d-box" x="390" y="98" width="300" height="30" rx="6"/>' +
      '<text class="d-tm" x="540" y="118" text-anchor="middle">aarch64-linux-gnu-gcc -O2 -c</text>' +

      '<rect class="d-box-a" x="30" y="146" width="300" height="94" rx="6"/>' +
      '<text class="d-t" x="180" y="166" text-anchor="middle">sum-x86.o</text>' +
      '<text class="d-tm" x="180" y="186" text-anchor="middle">03 07        add (%rdi),%eax</text>' +
      '<text class="d-tm" x="180" y="204" text-anchor="middle">48 83 c7 04  add $0x4,%rdi</text>' +
      '<text class="d-ts" x="180" y="228" text-anchor="middle">17 lệnh · 51 byte · dài 1–11 byte</text>' +

      '<rect class="d-box-g" x="390" y="146" width="300" height="94" rx="6"/>' +
      '<text class="d-t" x="540" y="166" text-anchor="middle">sum-arm64.o</text>' +
      '<text class="d-tm" x="540" y="186" text-anchor="middle">b8404443  ldr w3, [x2], #4</text>' +
      '<text class="d-tm" x="540" y="204" text-anchor="middle">0b030000  add w0, w0, w3</text>' +
      '<text class="d-ts" x="540" y="228" text-anchor="middle">15 lệnh · 60 byte · luôn 4 byte</text>' +

      '<rect class="d-box-w" x="180" y="258" width="360" height="30" rx="6"/>' +
      '<text class="d-t" x="360" y="278" text-anchor="middle">Không có cách nào chạy bên phải trên CPU bên trái</text>' +
      '</svg>' },

    { t: 'cal', kind: 'tip', title: 'Mẹo đọc mã máy khi bạn chưa biết assembly',
      x: '<p>Bạn <b>không</b> cần học assembly để làm Embedded Linux. Nhưng ba mẹo sau đủ để đọc ' +
         'được 80 % những gì bạn sẽ gặp:</p>' +
         '<ul>' +
         '<li>Số bên trái là <b>độ lệch byte</b> tính từ đầu hàm, không phải số dòng.</li>' +
         '<li>Ở ARM64, chữ <code>x</code> nghĩa là dùng cả 64 bit, chữ <code>w</code> nghĩa là ' +
         'chỉ 32 bit thấp của cùng thanh ghi đó. <code>w0</code> và <code>x0</code> là một chỗ.</li>' +
         '<li>Đích luôn đứng trước ở ARM64 (<code>add w0, w0, w3</code> = <code>w0 += w3</code>), ' +
         'còn cú pháp AT&amp;T của x86 thì đích đứng <b>sau</b> (<code>add (%rdi),%eax</code> = ' +
         '<code>eax += *rdi</code>). Đây là bẫy số một khi đọc lẫn hai bên.</li>' +
         '</ul>' },

    /* ══════════════════════════════════════════════
       3. VÌ SAO KHÔNG BUILD THẲNG TRÊN TARGET
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao không mang trình biên dịch lên board?' },

    { t: 'p', x:
      'Đây là phản xạ đầu tiên của mọi người mới, và nó hợp lý: nếu board chạy Linux, mà Linux ' +
      'có <code>gcc</code>, thì cứ cài <code>gcc</code> lên board rồi dịch tại chỗ — khỏi phải ' +
      'học thêm khái niệm nào. Cách đó gọi là <b>native build</b> và trên máy bàn nó đúng là ' +
      'cách bạn vẫn làm từ Bài 14 tới giờ.' },

    { t: 'p', x:
      'Vấn đề là board nhúng không phải máy bàn. Bốn rào cản dưới đây xếp theo thứ tự khó vượt ' +
      'tăng dần — và ba cái đầu bạn đo được ngay trên máy mình.' },

    { t: 'h3', x: 'Rào cản 1 — RAM' },

    { t: 'p', x:
      'Trình biên dịch là một trong những chương trình ngốn RAM nhất trong cả hệ thống. Đo thật ' +
      'bằng <code>/usr/bin/time -v</code>, trên một file C có <b>3 203</b> dòng và 400 hàm:' },

    { t: 'code', where: 'wsl', code:
      '/usr/bin/time -v gcc -O2 -c gen.c -o gen-x86.o 2>&1 | grep -E \'Maximum resident|Elapsed\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '\tElapsed (wall clock) time (h:mm:ss or m:ss): 0:01.51\n' +
      '\tMaximum resident set size (kbytes): 68468' },

    { t: 'p', x:
      '<b>68 468 KB</b> — gần <b>67 MB</b> RAM, cho <i>một</i> file, ở mức tối ưu <code>-O2</code> ' +
      'khá khiêm tốn. Một board dùng Cortex-A7 với 64 MB RAM sẽ không dịch nổi file này, và bạn ' +
      'chứng minh được điều đó ngay trên WSL bằng cách trói bộ nhớ lại bằng <code>ulimit -v</code>.' },

    { t: 'code', where: 'wsl', code:
      '( ulimit -v 65536; gcc -O2 -c gen.c -o /dev/null )\n' +
      'echo "exit=$?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'virtual memory exhausted: Cannot allocate memory\n' +
      'exit=1' },

    { t: 'cmdx', cmd: '( ulimit -v 65536; gcc -O2 -c gen.c -o /dev/null )',
      title: 'Giả lập một board 64 MB ngay trên máy bạn',
      rows: [
        ['( … )', 'Ngoặc đơn tạo một <b>shell con</b>. Mọi thay đổi bên trong chết theo shell con đó',
         'Nếu không có ngoặc, <code>ulimit</code> sẽ trói luôn shell hiện tại của bạn và mọi lệnh sau đều lỗi'],
        ['ulimit -v', 'Đặt trần <b>bộ nhớ ảo</b> (virtual memory) cho tiến trình, đơn vị KB',
         'Có <code>-m</code> cho bộ nhớ vật lý nhưng Linux hiện đại bỏ qua nó — <code>-v</code> mới có tác dụng thật'],
        ['65536', '65 536 KB = <b>64 MB</b>. Đúng cỡ RAM của lớp board Cortex-A7 rẻ tiền',
         'Thử lại với <code>262144</code> (256 MB) thì lệnh chạy trót lọt — ranh giới nằm đâu đó giữa hai mốc'],
        ['-o /dev/null', 'Vứt kết quả đi. Ta chỉ quan tâm nó sống hay chết, không cần file <code>.o</code>',
         '<code>/dev/null</code> là "thùng rác" của hệ thống, bạn đã gặp từ Bài 9']
      ]},

    { t: 'h3', x: 'Rào cản 2 — dung lượng đĩa' },

    { t: 'p', x:
      'Bộ công cụ build không nhỏ. Đo trực tiếp thư mục chứa phần lõi của GCC trên máy này:' },

    { t: 'code', where: 'wsl', code:
      'du -sh /usr/libexec/gcc/x86_64-linux-gnu/15\n' +
      'du -sh /usr/lib/gcc/x86_64-linux-gnu/15\n' +
      'ls -l "$(gcc -print-prog-name=cc1)"' },

    { t: 'code', where: 'out', nocopy: true, code:
      '111M\t/usr/libexec/gcc/x86_64-linux-gnu/15\n' +
      '30M\t/usr/lib/gcc/x86_64-linux-gnu/15\n' +
      '-rwxr-xr-x 1 root root 37475472 Mar 22 17:08 /usr/libexec/gcc/x86_64-linux-gnu/15/cc1',
      notes: ['Mốc thời gian <code>Mar 22 17:08</code> là lúc gói gcc được cài trên máy này, sẽ ' +
        'khác trên máy bạn — con số cần nhớ là kích thước byte.'] },

    { t: 'p', x:
      'Riêng <code>cc1</code> — trình biên dịch C thật sự, thứ bạn sẽ mổ ở Bài 26 — đã ' +
      '<b>37 475 472 byte</b>, tức <b>35,7 MB</b>. Cộng cả GCC, binutils, header của thư viện C ' +
      'và <code>make</code>, một môi trường build tối thiểu ngốn khoảng <b>141 MB</b> chỉ tính ' +
      'hai thư mục ở trên. Rootfs của một thiết bị nhúng gọn gàng thường nằm trong khoảng ' +
      '<b>8–64 MB</b> — bạn sẽ tự dựng một cái như thế ở <b>Chặng 09</b>. Trình biên dịch lớn ' +
      'hơn cả hệ điều hành mà nó phục vụ.' },

    { t: 'h3', x: 'Rào cản 3 — tốc độ CPU' },

    { t: 'p', x:
      'Con CPU trong máy bạn là <code>11th Gen Intel Core i7-1165G7 @ 2.80GHz</code> với ' +
      '<b>6</b> nhân được cấp cho WSL. CPU của board nhúng thường là Cortex-A7 hoặc Cortex-A53 ' +
      'chạy quanh 1 GHz, thực thi <b>theo thứ tự</b> (in-order) chứ không đảo lệnh, và có bộ ' +
      'nhớ đệm nhỏ hơn nhiều lần. Đó là chênh lệch một bậc độ lớn, chưa kể chuyện đọc ghi vào ' +
      'thẻ nhớ eMMC thay vì SSD NVMe.' },

    { t: 'cal', kind: 'warn', title: 'Đừng tin con số ước lượng — hãy nhớ con số bạn đo được',
      x: '<p>Ta <b>không</b> đo được trực tiếp tốc độ build trên board vì chưa có board và vì ' +
         'máy này chưa cài <code>qemu-user</code>. Vậy nên bài này không đưa cho bạn một tỉ số ' +
         '"chậm hơn N lần" bịa ra.</p>' +
         '<p>Cái bạn <b>đo được</b> và nên nhớ là ba con số ở trên: <b>67 MB</b> RAM cho một ' +
         'file, <b>35,7 MB</b> cho riêng <code>cc1</code>, và <code>virtual memory exhausted</code> ' +
         'khi RAM bị trói ở 64 MB. Ba con số đó tự chúng đã kết luận rồi, không cần tới tốc độ.</p>' +
         '<p>Ở <b>Chặng 05</b> khi QEMU đã chạy, bạn sẽ đo được cái giá thật của emulation và ' +
         'lúc đó con số mới có nghĩa.</p>' },

    { t: 'h3', x: 'Rào cản 4 — con gà và quả trứng' },

    { t: 'p', x:
      'Ba rào cản trên còn có thể lách: mua board mạnh hơn, cắm thêm RAM, cắm ổ USB. Rào cản ' +
      'thứ tư thì không lách được.' },

    { t: 'p', x:
      'Bạn sắp <b>tự build lấy hệ điều hành</b> cho board đó: bootloader ở Chặng 06, nhân Linux ' +
      'ở Chặng 07, rootfs ở Chặng 09. Ở thời điểm bắt đầu, board <i>chưa có</i> Linux để chạy ' +
      '<code>gcc</code>. Không có shell, không có hệ thống tập tin, thậm chí chưa có gì đọc nổi ' +
      'thẻ nhớ. Native build ở đây là chuyện bất khả về mặt logic, chứ không phải chuyện chậm.' },

    { t: 'cal', kind: 'info', title: 'Và bù lại: cross-compile gần như không tốn thêm gì',
      x: '<p>Cùng file <code>gen.c</code> 3 203 dòng ở trên, dịch bằng hai trình biên dịch khác ' +
         'nhau trên cùng máy này, mỗi bên chạy hai lần:</p>' +
         '<ul>' +
         '<li>Native x86-64: <b>1,40 s</b> và <b>1,58 s</b>; đỉnh RAM <b>68 224</b> / <b>68 148 KB</b></li>' +
         '<li>Cross ARM64: <b>1,49 s</b> và <b>1,88 s</b>; đỉnh RAM <b>77 804</b> / <b>77 768 KB</b></li>' +
         '</ul>' +
         '<p>Thời gian dao động giữa các lần chạy nhiều hơn là chênh giữa hai trình biên dịch — ' +
         'hai bên cùng một bậc. Số ổn định hơn là RAM: bản cross tốn thêm khoảng <b>14 %</b>, ' +
         'vì nó phải giữ thêm mô tả của một ISA lạ. Không bên nào chậm gấp mấy lần bên nào.</p>' +
         '<p>Điều này rất dễ hiểu khi bạn nhớ lại Bài ' +
         '15: bốn giai đoạn biên dịch đều là <b>xử lý văn bản và cấu trúc dữ liệu trên máy ' +
         'build</b>. Chỉ có giai đoạn cuối — sinh mã — mới quan tâm tới ISA đích, và nó phát ' +
         'ra byte chứ không thực thi byte. Trình biên dịch chưa bao giờ cần chạy thử thứ nó ' +
         'vừa tạo ra.</p>' +
         '<p>Nói ngắn: cross-compile <b>miễn phí</b> về thời gian. Cái giá duy nhất là bạn phải ' +
         'hiểu bộ công cụ — đó chính là Bài 26.</p>' },

    /* ══════════════════════════════════════════════
       4. BUILD / HOST / TARGET
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba cái tên: build, host, target' },

    { t: 'p', x:
      'Mọi tài liệu về toolchain đều dùng ba từ này, và gần như mọi người mới đều nhầm ít nhất ' +
      'một từ. Định nghĩa thực ra rất gọn — chúng trả lời ba câu hỏi khác nhau về <i>một chương ' +
      'trình cụ thể đang được build</i>.' },

    { t: 'table',
      head: ['Tên', 'Câu hỏi nó trả lời', 'Với <code>aarch64-linux-gnu-gcc</code> trên máy bạn'],
      rows: [
        ['<b>build</b>', 'Chương trình này <i>được biên dịch ra</i> trên máy nào?', '<code>x86_64-linux-gnu</code> — máy của người đóng gói Ubuntu'],
        ['<b>host</b>', 'Chương trình này <i>sẽ chạy</i> trên máy nào?', '<code>x86_64-linux-gnu</code> — máy của bạn, WSL'],
        ['<b>target</b>', 'Chương trình này <i>sinh mã cho</i> máy nào?', '<code>aarch64-linux-gnu</code> — board ARM64']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao chỉ trình biên dịch mới có "target"?',
      x: '<p>Vì chỉ trình biên dịch (và trình liên kết, và <code>objdump</code>…) mới <b>sinh ' +
         'ra hoặc đọc mã máy cho một kiến trúc khác</b>. Ba câu hỏi trên áp cho <code>ls</code> ' +
         'thì câu thứ ba vô nghĩa: <code>ls</code> không sinh mã cho ai cả.</p>' +
         '<p>Đây là chỗ nhầm phổ biến nhất: người ta hay nói "cross-compile <code>ls</code> cho ' +
         'ARM" rồi gọi ARM là <i>target</i> của <code>ls</code>. Sai. Khi bạn dịch <code>ls</code> ' +
         'cho board thì ARM là <b>host</b> của <code>ls</code> — nơi <code>ls</code> sẽ chạy. ' +
         'ARM chỉ là <i>target</i> của <b>trình biên dịch</b> bạn dùng để dịch nó.</p>' +
         '<p>Quy tắc bỏ túi: <b>target là của công cụ, không phải của sản phẩm.</b></p>' },

    { t: 'p', x:
      'Ba cái tên đó không phải lý thuyết sách vở — chúng nằm nguyên văn trong dòng ' +
      '<code>configure</code> mà người đóng gói Ubuntu đã dùng, và bạn in ra được:' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc -v 2>&1 | tr \' \' \'\\n\' | grep -E \'^--(build|host|target|program-prefix)=\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '--build=x86_64-linux-gnu\n' +
      '--host=x86_64-linux-gnu\n' +
      '--target=aarch64-linux-gnu\n' +
      '--program-prefix=aarch64-linux-gnu-' },

    { t: 'p', x:
      'Bốn dòng này giải thích trọn vẹn cái tên dài loằng ngoằng bạn vẫn gõ. ' +
      '<code>--target=aarch64-linux-gnu</code> quyết định trình biên dịch sinh mã ARM64; ' +
      '<code>--program-prefix=aarch64-linux-gnu-</code> quyết định nó được đặt tên là ' +
      '<code>aarch64-linux-gnu-gcc</code> chứ không phải <code>gcc</code>, để sống chung một ' +
      'thư mục <code>/usr/bin</code> với trình biên dịch native mà không giẫm chân nhau.' },

    { t: 'table',
      head: ['Kiểu build', 'build', 'host', 'target', 'Bạn gặp khi nào'],
      rows: [
        ['<b>Native</b>', 'A', 'A', 'A', 'Mọi thứ bạn làm từ Bài 14 tới Bài 24. <code>gcc</code> trên WSL dịch cho WSL'],
        ['<b>Cross</b>', 'A', 'A', 'B', '<code>aarch64-linux-gnu-gcc</code> trên máy bạn. Cả Chặng 04 nói về kiểu này'],
        ['<b>Cross-native</b>', 'A', 'B', 'B', 'Build trên PC ra một <code>gcc</code> <i>chạy trên board</i> và <i>sinh mã cho board</i>. Buildroot gọi tuỳ chọn này là "toolchain in target"'],
        ['<b>Canadian cross</b>', 'A', 'B', 'C', 'Build trên Linux ra một toolchain chạy trên Windows sinh mã cho ARM. Đây chính là cách các bộ toolchain <code>.exe</code> phát hành sẵn được tạo ra']
      ]},

    { t: 'cal', kind: 'tip', title: 'Cái tên "Canadian cross" ở đâu ra?',
      x: '<p>Khi khái niệm này được đặt tên, Canada đang có <b>ba</b> đảng chính trị lớn — và ' +
         'trường hợp này cần <b>ba</b> cái tên máy khác nhau. Chỉ vậy thôi. Bạn gần như không ' +
         'bao giờ phải tự làm một Canadian cross, nhưng bạn sẽ <i>dùng</i> sản phẩm của nó mỗi ' +
         'lần tải một toolchain ARM bản Windows về.</p>' },

    { t: 'fig', cap:
      'Chỉ có công cụ mới có "target". Board là <b>host</b> của daemon, nhưng là <b>target</b> ' +
      'của trình biên dịch — nhầm hai vai này là nguồn gốc của phần lớn cấu hình sai.',
      svg:
      '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Sơ đồ phân biệt build, host và target giữa trình biên dịch và chương trình do nó tạo ra">' +
      '<rect class="d-box-p" x="24" y="14" width="320" height="28" rx="6"/>' +
      '<text class="d-t" x="184" y="33" text-anchor="middle">MÁY BUILD — laptop x86-64 của bạn</text>' +
      '<rect class="d-box-a" x="376" y="14" width="320" height="28" rx="6"/>' +
      '<text class="d-t" x="536" y="33" text-anchor="middle">BOARD — SoC ARM64</text>' +

      '<rect class="d-box" x="24" y="62" width="320" height="66" rx="6"/>' +
      '<text class="d-tm" x="184" y="84" text-anchor="middle">aarch64-linux-gnu-gcc</text>' +
      '<text class="d-ts" x="184" y="104" text-anchor="middle">build = x86-64 · host = x86-64</text>' +
      '<text class="d-ts" x="184" y="120" text-anchor="middle">target = aarch64</text>' +

      '<rect class="d-box-g" x="24" y="148" width="320" height="60" rx="6"/>' +
      '<text class="d-tm" x="184" y="170" text-anchor="middle">sensor_daemon (ELF aarch64)</text>' +
      '<text class="d-ts" x="184" y="192" text-anchor="middle">nằm trên đĩa máy build, nhưng chạy được ở đây: KHÔNG</text>' +

      '<line class="d-line" x1="184" y1="128" x2="184" y2="146"/>' +
      '<path class="d-arrow" d="M184 148 L179 137 L189 137 Z"/>' +

      '<line class="d-line" x1="344" y1="178" x2="470" y2="178"/>' +
      '<path class="d-arrow" d="M470 178 L459 173 L459 183 Z"/>' +
      '<text class="d-ts" x="407" y="170" text-anchor="middle">chép sang</text>' +

      '<rect class="d-box-g" x="476" y="148" width="220" height="60" rx="6"/>' +
      '<text class="d-tm" x="586" y="170" text-anchor="middle">sensor_daemon</text>' +
      '<text class="d-ts" x="586" y="192" text-anchor="middle">chạy được: CÓ</text>' +

      '<rect class="d-box-w" x="24" y="228" width="672" height="28" rx="6"/>' +
      '<text class="d-t" x="360" y="247" text-anchor="middle">Board = target CỦA gcc, nhưng = host CỦA daemon</text>' +
      '</svg>' },

    { t: 'h3', x: 'Bộ ba tên máy đọc thế nào' },

    { t: 'p', x:
      'Cái tên <code>aarch64-linux-gnu</code> không phải nhãn tuỳ hứng. Nó là một <b>bộ ba</b> ' +
      '(triplet) có cú pháp chặt chẽ, và bạn dùng nó suốt phần đời còn lại của khoá học. Bài 26 ' +
      'sẽ mổ từng phần; ở đây chỉ cần nhận diện.' },

    { t: 'table',
      head: ['Bộ ba', 'Kiến trúc', 'Hệ điều hành', 'ABI / thư viện C', 'Dùng ở đâu'],
      rows: [
        ['<code>x86_64-linux-gnu</code>', 'x86-64', 'Linux', 'glibc', 'Máy bạn đang ngồi'],
        ['<code>aarch64-linux-gnu</code>', 'ARM64', 'Linux', 'glibc', 'Board ARM 64-bit — mặc định của cả khoá'],
        ['<code>arm-linux-gnueabihf</code>', 'ARM32', 'Linux', 'glibc, EABI, hard-float', 'Board ARM 32-bit như Raspberry Pi 2'],
        ['<code>arm-none-eabi</code>', 'ARM32', '<b>không có</b>', 'EABI, không thư viện C hệ thống', 'Vi điều khiển chạy trần, không Linux']
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -dumpmachine\n' +
      'aarch64-linux-gnu-gcc -dumpmachine\n' +
      'arm-linux-gnueabihf-gcc -dumpmachine' },

    { t: 'code', where: 'out', nocopy: true, code:
      'x86_64-linux-gnu\n' +
      'aarch64-linux-gnu\n' +
      'arm-linux-gnueabihf' },

    { t: 'cal', kind: 'tip', title: '<code>-dumpmachine</code> là câu hỏi đầu tiên nên hỏi mọi trình biên dịch lạ',
      x: '<p>Khi bạn tải một toolchain về từ nhà sản xuất SoC, thư mục của nó có thể tên gì cũng ' +
         'được và tài liệu có thể sai. <code>-dumpmachine</code> hỏi thẳng chính chương trình đó ' +
         '"anh sinh mã cho ai", và nó không bao giờ nói dối. Ba ký tự đầu của kết quả quyết định ' +
         'toàn bộ phần còn lại của công việc.</p>' },

    /* ══════════════════════════════════════════════
       5. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: đo tận tay ranh giới giữa hai kiến trúc' },

    { t: 'p', x:
      'Sáu bước dưới đây chạy hết trong WSL, không cần board, không cần QEMU. Mọi kết quả in ' +
      'ra đều là kết quả thật đo trên máy này — con số của bạn có thể lệch vài trăm KB hoặc vài ' +
      'phần mười giây, nhưng bậc độ lớn phải giống.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/lab25 && cd ~/lab25' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Hỏi ba trình biên dịch xem chúng phục vụ ai',
        blocks: [
          { t: 'p', x:
            'Trước khi dịch bất cứ thứ gì, hãy biết mình đang có gì trong tay. Máy này đã cài sẵn ' +
            'ba trình biên dịch C: một native và hai cross.' },

          { t: 'code', where: 'wsl', code:
            'uname -m\n' +
            'gcc -dumpmachine\n' +
            'aarch64-linux-gnu-gcc -dumpmachine\n' +
            'arm-linux-gnueabihf-gcc -dumpmachine' },

          { t: 'code', where: 'out', nocopy: true, code:
            'x86_64\n' +
            'x86_64-linux-gnu\n' +
            'aarch64-linux-gnu\n' +
            'arm-linux-gnueabihf' },

          { t: 'cmdx', cmd: 'uname -m',
            title: 'Hai câu hỏi khác nhau, đừng lẫn',
            rows: [
              ['uname -m', 'Kiến trúc của <b>nhân đang chạy</b>. Đây là câu hỏi về máy',
               'Trả về <code>x86_64</code>: nhân WSL2 của bạn là x86-64, đúng như Bài 1 đã đo'],
              ['gcc -dumpmachine', 'Bộ ba <b>target</b> của trình biên dịch. Đây là câu hỏi về công cụ',
               'Trùng nhau chỉ vì <code>gcc</code> ở đây là bản native. Hai lệnh sau in ra hai chuỗi khác hẳn — <code>aarch64-linux-gnu</code> và <code>arm-linux-gnueabihf</code> — chứng minh ba trình biên dịch này nhắm ba đích khác nhau dù cùng chạy trên một nhân <code>x86_64</code>']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao tên dài mà không phải chỉ "arm64-gcc"?',
            x: '<p>Vì kiến trúc chưa đủ để quyết định cách sinh mã. <code>aarch64-linux-gnu</code> ' +
               'còn nói thêm: chạy trên <b>Linux</b> (nên có syscall Linux), dùng <b>glibc</b> ' +
               '(nên header và cách gọi hàm thư viện là của glibc). Đổi bất kỳ mảnh nào trong ba ' +
               'mảnh đó là ra một trình biên dịch khác. Bài 26 sẽ tách từng mảnh.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Một nguồn C, hai bộ mã máy, đo bằng byte',
        blocks: [
          { t: 'p', x:
            'Tạo hàm cộng dồn mảng ở phần lý thuyết, rồi dịch bằng cả hai trình biên dịch và đếm ' +
            'byte. Đây là bằng chứng cứng cho câu "hai ISA khác nhau".' },

          { t: 'code', where: 'file', name: '~/lab25/sum.c', lang: 'c', code:
            'int sum_array(const int *data, int n)\n' +
            '{\n' +
            '    int total = 0;\n' +
            '    for (int i = 0; i < n; i++)\n' +
            '        total += data[i];\n' +
            '    return total;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -O2 -c sum.c -o sum-x86.o\n' +
            'aarch64-linux-gnu-gcc -O2 -c sum.c -o sum-arm64.o\n' +
            'size -A sum-x86.o | sed -n \'1,3p\'\n' +
            'aarch64-linux-gnu-size -A sum-arm64.o | sed -n \'1,3p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'sum-x86.o  :\n' +
            'section              size   addr\n' +
            '.text                  51      0\n' +
            'sum-arm64.o  :\n' +
            'section           size   addr\n' +
            '.text               60      0' },

          { t: 'cmdx', cmd: 'size -A sum-x86.o | sed -n \'1,3p\'',
            title: 'Vì sao có <code>-A</code> và vì sao lọc qua <code>sed</code>',
            rows: [
              ['size', 'Đo kích thước từng section của file <code>.o</code>/ELF, tính bằng byte',
               'Không tham số, nó chỉ in một dòng tổng hợp <code>text/data/bss/dec/hex</code> — không thấy tên từng section'],
              ['-A', 'Đổi sang định dạng System V: liệt kê <b>từng section</b> kèm size và địa chỉ, thay vì dòng tổng hợp Berkeley mặc định',
               'Không có <code>-A</code>, bạn không tách được riêng <code>.text</code> — mà đó mới là con số cần so sánh ở đây'],
              ['sed -n \'1,3p\'', 'In đúng dòng 1 tới 3 (tên file, dòng tiêu đề cột, dòng <code>.text</code>) rồi bỏ qua phần còn lại như <code>.data</code>, <code>.bss</code>, <code>.comment</code>',
               'Thiếu <code>-n</code>, <code>sed</code> vẫn in mọi dòng theo mặc định <i>rồi</i> in thêm các dòng khớp <code>1,3p</code> — mỗi dòng đầu bị lặp hai lần']
            ]},

          { t: 'p', x:
            'Hai con số <b>51</b> và <b>60</b> ở cột <code>size</code> chính là kích thước <code>.text</code> đã nói tới trong bảng lý thuyết — giờ bạn tự đo ra chứ không chỉ đọc bảng. Đếm tiếp số lệnh. Mỗi dòng mã lệnh trong bản dịch của <code>objdump</code> đều bắt đầu ' +
            'bằng khoảng trắng rồi tới địa chỉ hex và dấu hai chấm — đếm đúng những dòng đó là ra ' +
            'số lệnh.' },

          { t: 'code', where: 'wsl', code:
            'objdump -d sum-x86.o | grep -cE \'^ +[0-9a-f]+:\'\n' +
            'aarch64-linux-gnu-objdump -d sum-arm64.o | grep -cE \'^ +[0-9a-f]+:\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '17\n' +
            '15' },

          { t: 'cmdx', cmd: 'objdump -d sum-arm64.o | grep -cE \'^ +[0-9a-f]+:\'',
            title: 'Đếm lệnh mà không cần đọc từng dòng',
            rows: [
              ['objdump -d', 'Dịch ngược phần mã lệnh (<code>-d</code> = disassemble) của các section thực thi',
               'Bạn đã dùng nó ở Bài 18 để đọc <code>.text</code>. Ở đây chỉ khác ở tiền tố kiến trúc'],
              ['grep -c', 'Đếm số dòng khớp thay vì in ra chúng',
               'Không có <code>-c</code> thì bạn phải tự đếm 15 dòng bằng mắt — dễ sai'],
              ['-E', 'Bật biểu thức chính quy mở rộng để dùng được <code>+</code>',
               'Không có <code>-E</code> thì phải viết <code>\\+</code>, rối mắt hơn'],
              ['^ +[0-9a-f]+:', 'Đầu dòng, một hoặc nhiều khoảng trắng, một hoặc nhiều chữ số hex, rồi dấu hai chấm',
               'Mẫu này loại được dòng tiêu đề <code>0000000000000000 &lt;sum_array&gt;:</code> vì dòng đó <b>không</b> bắt đầu bằng khoảng trắng']
            ]},

          { t: 'cal', kind: 'why', title: '15 × 4 = 60. Hãy tự nhân thử.',
            x: '<p>Bên ARM64: <b>15</b> lệnh, <code>.text</code> đúng <b>60</b> byte. Không dư, ' +
               'không thiếu — vì mọi lệnh ARM64 đều dài đúng 4 byte.</p>' +
               '<p>Bên x86-64: <b>17</b> lệnh trong <b>51</b> byte. Chia ra không ra số nguyên đẹp, ' +
               'vì độ dài lệnh thay đổi từ 1 tới 11 byte.</p>' +
               '<p>Đây là phép thử bạn có thể làm lại với <i>bất kỳ</i> file <code>.o</code> ARM64 nào ' +
               'trong suốt khoá học. Nếu số byte không chia hết cho 4, hoặc bạn nhìn nhầm file, hoặc ' +
               'trong <code>.text</code> có dữ liệu chứ không chỉ có lệnh.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Chứng minh hai bên không lẫn được, theo hai cách',
        blocks: [
          { t: 'p', x:
            'Cách thứ nhất: dựng hai chương trình chạy được hoàn chỉnh rồi chạy cả hai. Đây là ' +
            'lúc bạn gặp lại <code>Exec format error</code> của Bài 3, nhưng lần này bạn hiểu nó.' },

          { t: 'code', where: 'file', name: '~/lab25/hello.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("hello, world\\n");\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc hello.c -o hello-x86\n' +
            'aarch64-linux-gnu-gcc hello.c -o hello-arm64\n' +
            'file hello-x86\n' +
            'file hello-arm64' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello-x86:   ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked,\n' +
            '             interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=1b78db98…, for GNU/Linux 3.2.0,\n' +
            '             not stripped\n' +
            'hello-arm64: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), dynamically linked,\n' +
            '             interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=9bc6c0cc…, for GNU/Linux 3.7.0,\n' +
            '             not stripped',
            notes: ['Hai giá trị <code>BuildID[sha1]</code> là hash tính từ nội dung file lúc ' +
              'liên kết, sẽ khác trên máy bạn mỗi lần biên dịch lại.'] },

          { t: 'p', x:
            'Chú ý cả trường <code>interpreter</code>: <code>/lib64/ld-linux-x86-64.so.2</code> so ' +
            'với <code>/lib/ld-linux-aarch64.so.1</code>. Ngay cả bộ nạp thư viện động — thứ bạn đã ' +
            'gặp ở Bài 17 — cũng là hai chương trình khác nhau, ở hai đường dẫn khác nhau. Bài 26 sẽ ' +
            'giải thích vì sao tên nó lại là một phần của ABI.' },

          { t: 'code', where: 'wsl', code:
            './hello-x86\n' +
            'echo "exit=$?"\n' +
            './hello-arm64\n' +
            'echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello, world\n' +
            'exit=0\n' +
            './hello-arm64: cannot execute binary file: Exec format error\n' +
            'exit=126' },

          { t: 'cal', kind: 'info', title: 'Mã 126 nghĩa là gì, và vì sao không phải 127',
            x: '<p>Shell dùng hai mã sát nhau cho hai chuyện khác nhau, rất dễ nhầm:</p>' +
               '<ul>' +
               '<li><b>127</b> — "không tìm thấy lệnh". File không tồn tại.</li>' +
               '<li><b>126</b> — "tìm thấy nhưng không chạy được". File có đó, quyền thực thi có đó, ' +
               'nhưng <code>execve()</code> trả về lỗi. Ở đây lỗi là <code>ENOEXEC</code> vì trường ' +
               '<code>e_machine</code> ghi ARM còn nhân là x86.</li>' +
               '</ul>' +
               '<p>Phân biệt được hai số này giúp bạn chẩn đoán nhanh khi chạy chương trình trên board ' +
               'ở các chặng sau: 127 là sai đường dẫn, 126 là sai kiến trúc hoặc sai quyền.</p>' },

          { t: 'p', x:
            'Cách thứ hai, tinh vi hơn: thử <b>trộn</b> một file <code>.o</code> x86 với một file ' +
            '<code>.o</code> ARM64. Trình liên kết sẽ chặn từ sớm hơn nhân rất nhiều.' },

          { t: 'code', where: 'file', name: '~/lab25/main.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            'int sum_array(const int *data, int n);\n' +
            'int main(void)\n' +
            '{\n' +
            '    int values[4] = { 1, 2, 3, 4 };\n' +
            '    printf("sum = %d\\n", sum_array(values, 4));\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -c main.c -o main-x86.o\n' +
            'gcc main-x86.o sum-arm64.o -o mixed\n' +
            'echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ld: sum-arm64.o: Relocations in generic ELF (EM: 183)\n' +
            'ld: sum-arm64.o: error adding symbols: file in wrong format\n' +
            'collect2: error: ld returned 1 exit status\n' +
            'exit=1' },

          { t: 'cal', kind: 'why', title: '<code>EM: 183</code> — con số nói tất cả',
            x: '<p><code>EM</code> chính là trường <code>e_machine</code> trong ELF header, và ' +
               '<b>183</b> là mã của AArch64 (x86-64 là 62). Trình liên kết native đọc được cái vỏ ' +
               'ELF — nên nó biết đây là file ELF hợp lệ — nhưng gặp số 183 thì nó không biết ' +
               'relocation kiểu ARM nghĩa là gì, nên gọi file này là "generic ELF" và bỏ cuộc.</p>' +
               '<p>Câu <code>file in wrong format</code> là lời phàn nàn thường gặp nhất trong cả ' +
               'Chặng 04. Chín trên mười lần nguyên nhân là bạn quên tiền tố: gõ <code>gcc</code> ' +
               'hoặc <code>ld</code> hoặc <code>ar</code> thay vì bản <code>aarch64-linux-gnu-</code>.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Đo cái giá của việc build ngay trên target',
        blocks: [
          { t: 'p', x:
            'Cần một file C đủ lớn để trình biên dịch phải làm việc thật. Sinh nó bằng vòng lặp ' +
            'shell — đúng kỹ thuật bạn học ở Bài 13 — thay vì gõ tay 3 200 dòng.' },

          { t: 'code', where: 'wsl', code:
            '{\n' +
            '  echo \'#include <stdio.h>\'\n' +
            '  echo \'#include <string.h>\'\n' +
            '  echo\n' +
            '  for i in $(seq 0 399); do\n' +
            '    echo "int work_$i(int *a, int n)"\n' +
            '    echo \'{\'\n' +
            '    echo \'    int t = 0;\'\n' +
            '    echo \'    for (int j = 0; j < n; j++)\'\n' +
            '    echo "        t += a[j] * $((i + 1)) + (a[j] >> 2);"\n' +
            '    echo \'    return t;\'\n' +
            '    echo \'}\'\n' +
            '    echo\n' +
            '  done\n' +
            '} > gen.c\n' +
            'wc -l gen.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3203 gen.c' },

          { t: 'cmdx', cmd: '{ … } > gen.c',
            title: 'Vì sao gom cả vòng lặp vào một cặp ngoặc nhọn',
            rows: [
              ['{ … }', 'Nhóm lệnh, chạy trong <b>chính</b> shell hiện tại',
               'Khác ngoặc đơn <code>( … )</code> ở Bước 5: ngoặc đơn tạo shell con'],
              ['&gt; gen.c', 'Chuyển hướng đầu ra của <b>cả nhóm</b> một lần duy nhất',
               'Nếu đặt <code>&gt;&gt; gen.c</code> ở từng dòng <code>echo</code> thì shell phải mở và đóng file 3 203 lần — chậm hơn nhiều'],
              ['seq 0 399', 'In ra các số 0 tới 399, mỗi số một dòng, để vòng <code>for</code> duyệt',
               '400 hàm là đủ để đỉnh RAM vượt 64 MB — mốc ta muốn chạm tới'],
              ['$((i + 1))', 'Phép tính số học của shell. Cho mỗi hàm một hằng số khác nhau',
               'Nếu mọi hàm giống hệt nhau, trình biên dịch có thể gộp chúng lại và phép đo mất ý nghĩa']
            ]},

          { t: 'cal', kind: 'info', title: '3 203 đúng như tính tay: 400 × 8 + 3',
            x: '<p>Mỗi vòng lặp sinh đúng <b>8</b> dòng cho một hàm — khai báo, dấu <code>{</code> mở, ' +
               'khởi tạo <code>t</code>, dòng <code>for</code>, câu lệnh cộng dồn, <code>return</code>, ' +
               'dấu <code>}</code> đóng, và một dòng trống ngăn cách — nhân với <b>400</b> hàm là ' +
               '3 200, cộng <b>3</b> dòng tiêu đề (hai <code>#include</code> và một dòng trống) ra ' +
               'đúng <b>3 203</b> mà <code>wc -l</code> vừa đếm được. Nếu số bạn thấy khác đi, khả năng ' +
               'cao nhất là vòng <code>seq 0 399</code> chạy thiếu hoặc thừa vòng.</p>' },

          { t: 'p', x:
            'Giờ đo. Cờ <code>-v</code> của <code>/usr/bin/time</code> in ra rất nhiều dòng — ta ' +
            'chỉ giữ hai dòng cần thiết.' },

          { t: 'code', where: 'wsl', code:
            '/usr/bin/time -v gcc -O2 -c gen.c -o gen-x86.o 2>&1 | grep -E \'Maximum resident|Elapsed\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tElapsed (wall clock) time (h:mm:ss or m:ss): 0:01.40\n' +
            '\tMaximum resident set size (kbytes): 68224' },

          { t: 'p', x:
            '<b>68 224 KB</b> (~66,6 MB) và <b>0:01.40</b> — sát với <b>68 468 KB</b> và <b>0:01.51</b> ' +
            'bạn đã thấy ở phần lý thuyết cho cùng phép đo này. Chênh lệch dưới <b>0,4 %</b>, đúng mức ' +
            'dao động bình thường giữa hai lần chạy, không phải sai số. Đây chính là con số bạn sắp ' +
            'thử ép xuống thấp hơn nhiều lần bằng <code>ulimit -v</code>.' },

          { t: 'cal', kind: 'warn', title: 'Phải là <code>/usr/bin/time</code>, không phải <code>time</code>',
            x: '<p>Gõ <code>time</code> trần thì bash dùng <b>từ khoá dựng sẵn</b> của nó, và từ khoá ' +
               'đó không có cờ <code>-v</code> — bạn sẽ nhận được lỗi cú pháp khó hiểu. Viết đủ đường ' +
               'dẫn <code>/usr/bin/time</code> mới gọi đúng chương trình ngoài có đo cả bộ nhớ.</p>' +
               '<p>Đây là một trong những chỗ khác nhau giữa "lệnh dựng sẵn" và "chương trình" mà Bài 4 ' +
               'đã cảnh báo. Kiểm chứng bằng <code>type time</code> so với <code>type -a time</code>.</p>' },

          { t: 'p', x:
            'Bây giờ trói bộ nhớ lại còn 64 MB — đúng cỡ RAM của lớp board rẻ nhất — rồi dịch lại ' +
            'chính file đó.' },

          { t: 'code', where: 'wsl', code:
            '( ulimit -v 65536; gcc -O2 -c gen.c -o /dev/null )\n' +
            'echo "exit=$?"\n' +
            '( ulimit -v 262144; gcc -O2 -c gen.c -o /dev/null )\n' +
            'echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'virtual memory exhausted: Cannot allocate memory\n' +
            'exit=1\n' +
            'exit=0' },

          { t: 'cal', kind: 'info', title: 'Đây chính là kết luận của cả bài',
            x: '<p>Ở 64 MB, trình biên dịch chết. Ở 256 MB, nó sống. Ranh giới nằm giữa hai mốc đó, ' +
               'và <i>rất nhiều</i> board thực tế nằm bên trái ranh giới.</p>' +
               '<p>Hãy nhớ thêm: đây mới là <b>một</b> file, ở mức <code>-O2</code>, không có C++, ' +
               'không có template, không có LTO. Nhân Linux mà bạn sẽ build ở Chặng 07 có hơn ' +
               '30 000 file nguồn.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Kiểm chứng rằng cross-compile không đắt hơn native',
        blocks: [
          { t: 'p', x:
            'Người mới hay ngại cross-compile vì tưởng "dịch cho máy khác thì phải mô phỏng máy đó, ' +
            'chắc chậm lắm". Đo là hết ngại.' },

          { t: 'code', where: 'wsl', code:
            'for cc in gcc aarch64-linux-gnu-gcc; do\n' +
            '  echo "--- $cc ---"\n' +
            '  /usr/bin/time -v "$cc" -O2 -c gen.c -o /dev/null 2>&1 |\n' +
            '    grep -E \'Maximum resident|Elapsed\'\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- gcc ---\n' +
            '\tElapsed (wall clock) time (h:mm:ss or m:ss): 0:01.41\n' +
            '\tMaximum resident set size (kbytes): 68264\n' +
            '--- aarch64-linux-gnu-gcc ---\n' +
            '\tElapsed (wall clock) time (h:mm:ss or m:ss): 0:01.59\n' +
            '\tMaximum resident set size (kbytes): 77852' },

          { t: 'p', x:
            'Chạy vài lần bạn sẽ thấy thời gian nhảy trong khoảng <b>1,4</b>–<b>1,9 s</b> cho cả hai ' +
            'bên: dao động giữa các lần chạy lớn hơn chênh lệch giữa hai trình biên dịch. Con số ổn ' +
            'định hơn là RAM — bản cross tốn thêm khoảng <b>9 600 KB</b>, tức <b>14 %</b>.' },

          { t: 'cal', kind: 'why', title: 'Vì sao cross không hề phải "mô phỏng" gì cả',
            x: '<p>Nhớ lại bốn giai đoạn ở Bài 15: tiền xử lý, biên dịch, hợp dịch, liên kết. Ba giai ' +
               'đoạn đầu là xử lý văn bản và cây cú pháp — hoàn toàn không phụ thuộc ISA. Giai đoạn ' +
               'sinh mã có phụ thuộc, nhưng nó chỉ <b>ghi ra byte</b>, không thực thi byte nào.</p>' +
               '<p>Trình biên dịch chưa bao giờ chạy thử thứ nó vừa tạo. Nó cũng chẳng cần biết ' +
               'board có tồn tại hay không. Vì thế cross-compile chỉ là "dùng bảng sinh mã khác", ' +
               'và <b>14 %</b> RAM thêm chính là cái bảng đó.</p>' +
               '<p>Đây là lý do toàn ngành nhúng cross-compile: nó gần như miễn phí, còn native ' +
               'build trên board thì đắt tới mức bất khả.</p>' }
        ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — Nhìn thấy build / host / target trong máy thật',
        blocks: [
          { t: 'p', x:
            'Bước cuối gắn ba từ trừu tượng vào ba dòng chữ có thật trên đĩa máy bạn.' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -v 2>&1 | tr \' \' \'\\n\' |\n' +
            '  grep -E \'^--(build|host|target|program-prefix)=\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--build=x86_64-linux-gnu\n' +
            '--host=x86_64-linux-gnu\n' +
            '--target=aarch64-linux-gnu\n' +
            '--program-prefix=aarch64-linux-gnu-' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -v 2>&1 | tr \' \' \'\\n\' | grep -E \'…\'',
            title: 'Vì sao phải qua <code>tr</code> trước khi <code>grep</code>',
            rows: [
              ['-v', 'In thông tin phiên bản kèm <b>toàn bộ</b> dòng <code>configure</code> đã dùng khi build chính GCC này',
               'Không có file nguồn nào ở đây nên GCC chỉ in thông tin rồi thoát'],
              ['2&gt;&amp;1', 'GCC in các dòng này ra <b>luồng lỗi</b> chứ không phải luồng ra chuẩn. Không gộp lại thì <code>grep</code> không thấy gì',
               'Bẫy kinh điển. Nếu ống dẫn của bạn im lặng bất thường, hãy thử thêm <code>2&gt;&amp;1</code> trước'],
              ['tr \' \' \'\\n\'', 'Đổi mỗi dấu cách thành một dòng mới, biến dòng <code>configure</code> dài hàng nghìn ký tự thành danh sách dọc',
               'Không có bước này, <code>grep</code> khớp cả dòng khổng lồ và in ra hết — vô dụng'],
              ['^--(build|host|target|…)=', 'Chỉ giữ đúng bốn tuỳ chọn ta quan tâm',
               'Dấu <code>^</code> quan trọng: không có nó thì <code>--with-build-config=…</code> cũng bị khớp']
            ]},

          { t: 'p', x:
            'Cuối cùng, một bằng chứng nữa cho thấy trình biên dịch <i>biết</i> nó đang phục vụ ai: ' +
            'hỏi thẳng các macro nó định nghĩa sẵn.' },

          { t: 'code', where: 'wsl', code:
            'for cc in gcc aarch64-linux-gnu-gcc arm-linux-gnueabihf-gcc; do\n' +
            '  echo "--- $cc ---"\n' +
            '  "$cc" -dM -E - < /dev/null |\n' +
            '    grep -E \'^#define (__x86_64__|__aarch64__|__arm__|__LP64__|__SIZEOF_LONG__) \' |\n' +
            '    sort\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- gcc ---\n' +
            '#define __LP64__ 1\n' +
            '#define __SIZEOF_LONG__ 8\n' +
            '#define __x86_64__ 1\n' +
            '--- aarch64-linux-gnu-gcc ---\n' +
            '#define __LP64__ 1\n' +
            '#define __SIZEOF_LONG__ 8\n' +
            '#define __aarch64__ 1\n' +
            '--- arm-linux-gnueabihf-gcc ---\n' +
            '#define __SIZEOF_LONG__ 4\n' +
            '#define __arm__ 1' },

          { t: 'cal', kind: 'danger', title: '<code>long</code> không phải lúc nào cũng 8 byte',
            x: '<p>Hai khối đầu — <code>gcc</code> và <code>aarch64-linux-gnu-gcc</code> — giống hệt ' +
               'nhau ở hai macro chung: <code>__LP64__ 1</code> và <code>__SIZEOF_LONG__ 8</code>. ' +
               'Đúng như dự đoán: cả x86-64 lẫn ARM64 đều là kiến trúc 64-bit, nên <code>long</code> ' +
               'dài 8 byte trên cả hai.</p>' +
               '<p>Nhìn dòng cuối: với <code>arm-linux-gnueabihf</code>, <code>__SIZEOF_LONG__</code> ' +
               'là <b>4</b>, và <code>__LP64__</code> <b>biến mất</b> hoàn toàn.</p>' +
               '<p>Đây là nguồn gốc của cả một họ lỗi rất khó tìm: mã C viết trên máy 64-bit, chạy ' +
               'ngon lành nhiều năm, mang sang board ARM 32-bit thì tràn số hoặc sai con trỏ. Mọi ' +
               'chỗ bạn ép kiểu con trỏ về <code>long</code>, mọi chỗ bạn giả định <code>time_t</code> ' +
               'to bằng <code>long long</code>, đều vỡ.</p>' +
               '<p>Chứng minh trong một dòng:</p>' },

          { t: 'code', where: 'file', name: '~/lab25/model.c', lang: 'c', code:
            '_Static_assert(sizeof(long) == 8, "this code assumes a 64-bit long");\n' +
            'int main(void) { return 0; }' },

          { t: 'code', where: 'wsl', code:
            'gcc -c model.c -o /dev/null && echo "x86-64: OK"\n' +
            'aarch64-linux-gnu-gcc -c model.c -o /dev/null && echo "aarch64: OK"\n' +
            'arm-linux-gnueabihf-gcc -c model.c -o /dev/null' },

          { t: 'code', where: 'out', nocopy: true, code:
            'x86-64: OK\n' +
            'aarch64: OK\n' +
            'model.c:1:1: error: static assertion failed: "this code assumes a 64-bit long"\n' +
            '    1 | _Static_assert(sizeof(long) == 8, "this code assumes a 64-bit long");\n' +
            '      | ^~~~~~~~~~~~~~' },

          { t: 'cal', kind: 'tip', title: 'Bài học mang theo cả khoá',
            x: '<p>Khi viết mã cho thiết bị nhúng, đừng bao giờ giả định kích thước kiểu. Dùng ' +
               '<code>&lt;stdint.h&gt;</code>: <code>int32_t</code>, <code>uint64_t</code>, ' +
               '<code>uintptr_t</code>. Chúng có kích thước cố định trên <b>mọi</b> kiến trúc, và ' +
               'đó là lý do mã nguồn nhân Linux dùng chúng ở khắp nơi — bạn sẽ thấy tận mắt ở ' +
               'Chặng 10.</p>' },

          { t: 'p', x: 'Dọn dẹp khi đã đo xong:' },

          { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/lab25' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       6. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>cannot execute binary file: Exec format error</code> (thoát <b>126</b>)',
         'Bạn đang chạy file ELF của kiến trúc khác. Nhân đọc <code>e_machine</code> rồi trả <code>ENOEXEC</code>',
         'Đây là hành vi <b>đúng</b>, không phải hỏng. Kiểm tra bằng <code>file</code>. Muốn chạy thật thì cần QEMU (Chặng 05) hoặc chép sang board'],

        ['<code>ld: … Relocations in generic ELF (EM: 183)</code>',
         'Trộn file <code>.o</code> ARM64 với trình liên kết native, hoặc quên tiền tố khi gọi <code>gcc</code>/<code>ld</code>/<code>ar</code>',
         'Dùng đúng bản có tiền tố: <code>aarch64-linux-gnu-gcc</code>. Nếu dùng Makefile, đặt <code>CC</code> và <code>AR</code> chứ đừng gọi <code>gcc</code> trực tiếp'],

        ['<code>objdump: can\'t disassemble for architecture UNKNOWN!</code>',
         '<code>objdump</code> native không có bảng lệnh của ARM64',
         'Gọi <code>aarch64-linux-gnu-objdump</code>. Mọi công cụ binutils đều theo kiến trúc — Bài 26 sẽ giải thích vì sao'],

        ['<code>virtual memory exhausted: Cannot allocate memory</code>',
         'Trình biên dịch xin thêm bộ nhớ nhưng chạm trần <code>ulimit -v</code> hoặc hết RAM thật',
         'Trên máy build: nâng trần, hoặc dịch từng file thay vì <code>-flto</code>. Trên board: đừng dịch trên board — đó là toàn bộ nội dung bài này'],

        ['<code>time: -v: invalid option</code> hoặc lỗi cú pháp lạ sau <code>time -v</code>',
         'Bash bắt <code>time</code> làm từ khoá dựng sẵn, và từ khoá đó không có <code>-v</code>',
         'Gọi đủ đường dẫn <code>/usr/bin/time -v</code>. Kiểm chứng bằng <code>type -a time</code>'],

        ['<code>grep</code> không in gì sau <code>gcc -v</code>',
         'GCC in thông tin phiên bản ra <b>luồng lỗi chuẩn</b>, mà ống dẫn chỉ mang luồng ra chuẩn',
         'Thêm <code>2&gt;&amp;1</code> ngay sau <code>gcc -v</code>, trước dấu ống'],

        ['<code>static assertion failed: "this code assumes a 64-bit long"</code>',
         'Mã giả định <code>long</code> 8 byte nhưng target là ARM 32-bit, nơi <code>long</code> chỉ 4 byte',
         'Thay <code>long</code> bằng kiểu có kích thước cố định trong <code>&lt;stdint.h&gt;</code>. Đây là lỗi <i>tốt</i> — nó bắt được sự cố lúc dịch thay vì lúc chạy trên board'],

        ['<code>aarch64-linux-gnu-gcc: command not found</code>',
         'Chưa cài gói <code>gcc-aarch64-linux-gnu</code>',
         'Máy này đã cài sẵn từ Bài 3. Nếu mất, cài lại bằng <code>sudo apt install gcc-aarch64-linux-gnu</code>']
      ]},

    /* ══════════════════════════════════════════════
       7. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 25', items: [
      'Một file thực thi chứa <b>mã máy của đúng một ISA</b>. Trường <code>e_machine</code> trong ELF header ghi rõ ISA đó — <b>62</b> cho x86-64, <b>183</b> cho AArch64. Nhân đọc trường này trước tiên và trả <code>ENOEXEC</code> nếu lệch, cho mã thoát <b>126</b>.',

      'Cùng một <code>sum.c</code>, hai trình biên dịch cho ra hai bộ mã hoàn toàn khác: x86-64 dùng <b>17</b> lệnh trong <b>51</b> byte (lệnh dài 1–11 byte), ARM64 dùng <b>15</b> lệnh trong <b>60</b> byte — đúng bằng <b>15 × 4</b>, vì mọi lệnh ARM64 dài cố định 4 byte.',

      'ARM64 là kiến trúc <b>load/store</b>: chỉ <code>ldr</code>/<code>str</code> chạm bộ nhớ. x86-64 cho phép <code>add (%rdi),%eax</code> — vừa đọc bộ nhớ vừa cộng trong một lệnh. Đây là khác biệt RISC / CISC nhìn thấy được bằng mắt.',

      'Không build trên target vì bốn lý do, ba trong đó đo được: trình biên dịch ngốn <b>68 264 KB</b> RAM cho một file; riêng <code>cc1</code> nặng <b>35,7 MB</b> trong tổng <b>141 MB</b> công cụ; và ở trần 64 MB nó chết với <code>virtual memory exhausted</code>. Lý do thứ tư không lách được: lúc bắt đầu, board <b>chưa có</b> hệ điều hành để chạy trình biên dịch.',

      'Cross-compile gần như miễn phí: <b>1,41 s</b> so với <b>1,59 s</b> cho cùng file, chênh nhỏ hơn dao động giữa các lần chạy. RAM tốn thêm <b>9 588 KB</b> (<b>14 %</b>) — đó là cái giá của việc giữ thêm bảng sinh mã cho một ISA lạ.',

      '<b>build</b> = nơi công cụ được dịch ra, <b>host</b> = nơi công cụ chạy, <b>target</b> = nơi mã do công cụ sinh ra sẽ chạy. Quy tắc nhớ: <b>target là của công cụ, không phải của sản phẩm</b>. Board là target của <code>gcc</code>, nhưng là host của daemon bạn build.',

      'Bốn kiểu build: <b>native</b> (A-A-A), <b>cross</b> (A-A-B, cả Chặng 04), <b>cross-native</b> (A-B-B) và <b>Canadian cross</b> (A-B-C).',

      'Bộ ba tên máy có cú pháp chặt: <code>aarch64-linux-gnu</code> = kiến trúc + hệ điều hành + ABI/thư viện C. Hỏi bất kỳ trình biên dịch lạ nào bằng <code>-dumpmachine</code> và nó sẽ nói thật.',

      '<code>long</code> là <b>8</b> byte trên x86-64 và ARM64 nhưng chỉ <b>4</b> byte trên <code>arm-linux-gnueabihf</code>, nơi macro <code>__LP64__</code> biến mất. Dùng <code>&lt;stdint.h&gt;</code> thay vì giả định kích thước kiểu.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Bạn vừa dùng <code>aarch64-linux-gnu-gcc</code> như một hộp đen. <b>Bài 26</b> mở hộp ' +
         'đó ra. Bạn sẽ thấy <code>gcc</code> thật ra <b>không biên dịch gì cả</b> — nó chỉ là ' +
         'người điều phối, gọi lần lượt <code>cc1</code>, <code>as</code> rồi <code>collect2</code>, ' +
         'và bạn sẽ in ra được đúng ba dòng lệnh nó gọi.</p>' +
         '<p>Bạn cũng sẽ đo một con số làm nhiều người sửng sốt: cùng file <code>hello.c</code>, ' +
         'bản ARM64 nặng <b>70 448</b> byte còn bản x86-64 chỉ <b>15 952</b> byte — dù phần mã ' +
         'lệnh của chúng gần bằng nhau (<b>1 646</b> so với <b>1 379</b> byte). Nguyên nhân không ' +
         'nằm ở kiến trúc mà nằm ở một mặc định của ABI, và chỉ cần một tuỳ chọn liên kết là bản ' +
         'ARM64 tụt xuống <b>9 008</b> byte — nhỏ hơn cả bản x86.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    { q: 'Bạn chép một chương trình ARM64 sang máy x86-64 rồi chạy. Shell in <code>Exec format error</code> và <code>echo $?</code> cho <b>126</b>. Chuyện gì đã xảy ra ở mức nhân?',
      opts: [
        'Nhân đã nạp chương trình vào bộ nhớ nhưng gặp lệnh lạ ở lệnh đầu tiên',
        'Nhân đọc trường <code>e_machine</code> trong ELF header, thấy không khớp kiến trúc, và trả <code>ENOEXEC</code> mà chưa nạp byte mã lệnh nào',
        'File thiếu quyền thực thi nên <code>execve()</code> bị từ chối',
        'Bộ nạp thư viện động không tìm thấy <code>libc.so.6</code> phiên bản ARM'],
      a: 1,
      why: 'Nhân kiểm tra định dạng <b>trước</b> khi nạp. <code>e_machine</code> nằm ngay trong ELF header, đọc vài byte đầu file là biết — không cần chạm tới phần mã lệnh. Vì thế lỗi xảy ra tức thì, không phải "chạy được vài lệnh rồi chết". Đáp án 3 sẽ cho mã <b>126</b> giống hệt nhưng thông báo khác (<code>Permission denied</code>) — nên đọc thông báo chứ đừng chỉ đọc mã thoát.' },

    { q: 'Phần <code>.text</code> của một file <code>.o</code> ARM64 đo được <b>60</b> byte và <code>objdump</code> đếm ra <b>15</b> lệnh. Con số nào dưới đây là <b>bất khả thi</b> cho một file <code>.o</code> ARM64 khác chỉ chứa lệnh?',
      opts: ['<code>.text</code> = 4 byte, 1 lệnh', '<code>.text</code> = 100 byte, 25 lệnh', '<code>.text</code> = 51 byte, 17 lệnh', '<code>.text</code> = 400 byte, 100 lệnh'],
      a: 2,
      why: 'Mọi lệnh ARM64 dài đúng <b>4</b> byte, nên kích thước phần mã lệnh luôn chia hết cho 4 và luôn bằng số lệnh × 4. 51 không chia hết cho 4, và 17 × 4 = 68 chứ không phải 51 — cặp số đó chỉ hợp lý với x86-64, nơi lệnh dài từ 1 tới 15 byte. Đây cũng là cách kiểm tra nhanh xem bạn có đang nhìn nhầm file không.' },

    { q: 'Bạn dùng máy Linux x86-64 để build <code>busybox</code> chạy trên board ARM64. Trong tình huống này, <b>host</b> của <code>busybox</code> là gì?',
      opts: ['<code>x86_64-linux-gnu</code>, vì đó là nơi quá trình build diễn ra', '<code>aarch64-linux-gnu</code>, vì đó là nơi <code>busybox</code> sẽ chạy', '<code>busybox</code> không có host, chỉ trình biên dịch mới có', 'Cả hai, tuỳ theo cách gọi <code>configure</code>'],
      a: 1,
      why: '<b>Host</b> luôn trả lời câu "chương trình này sẽ chạy ở đâu". <code>busybox</code> sẽ chạy trên board, nên host của nó là ARM64; build của nó là x86-64. Còn <i>target</i> thì <code>busybox</code> không có, vì nó không sinh mã cho ai — chỉ trình biên dịch, trình liên kết và các công cụ binutils mới có target. Nhầm host với target ở đây là nguyên nhân số một khiến người mới truyền sai tham số cho <code>./configure</code>.' },

    { q: 'Vì sao cross-compile <b>không</b> chậm hơn native compile đáng kể trên cùng một máy?',
      opts: [
        'Vì trình biên dịch cross được tối ưu kỹ hơn',
        'Vì nó bỏ qua giai đoạn tối ưu để bù lại chi phí đổi kiến trúc',
        'Vì cả bốn giai đoạn biên dịch đều chạy bằng mã native trên máy build; chỉ giai đoạn sinh mã là khác bảng, và nó chỉ <i>ghi ra</i> byte chứ không thực thi byte nào',
        'Vì nhân dùng <code>binfmt_misc</code> để tăng tốc phần mã ARM'],
      a: 2,
      why: 'Trình biên dịch chưa bao giờ chạy thứ nó vừa tạo ra — nó chỉ ghi byte vào file. Vì thế toàn bộ công việc nặng (tiền xử lý, phân tích cú pháp, tối ưu) đều là mã x86 chạy trên CPU x86 với tốc độ đầy đủ. Phép đo xác nhận: <b>1,41 s</b> so với <b>1,59 s</b>, chênh nhỏ hơn dao động giữa các lần chạy. Cái tốn thêm là RAM (<b>14 %</b>) để giữ bảng mô tả ISA đích.' },

    { q: 'Bạn viết một Makefile cho board ARM64 và nó báo <code>ld: Relocations in generic ELF (EM: 183)</code>. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Board dùng ARM32 chứ không phải ARM64',
        'Có một luật trong Makefile gọi <code>gcc</code> hoặc <code>ar</code> trần thay vì bản có tiền tố <code>aarch64-linux-gnu-</code>',
        'Thiếu thư viện <code>libc</code> phiên bản ARM64',
        'File nguồn dùng <code>long</code> nên sai kích thước trên target'],
      a: 1,
      why: 'Số <b>183</b> chính là mã <code>e_machine</code> của AArch64, nghĩa là file <code>.o</code> <i>đúng</i> kiến trúc — cái sai là công cụ đang đọc nó. Trình liên kết native nhận ra vỏ ELF nhưng không hiểu relocation kiểu ARM nên gọi đó là "generic ELF". Trong Makefile, sửa bằng cách đặt biến <code>CC</code>, <code>LD</code>, <code>AR</code> ở một chỗ rồi dùng lại, thay vì gõ tên công cụ rải rác — đúng thói quen Bài 16 đã dạy.' },

    { q: 'Một dự án C chạy tốt nhiều năm trên máy chủ x86-64. Cross-compile sang <code>aarch64-linux-gnu</code> thì vẫn tốt, nhưng sang <code>arm-linux-gnueabihf</code> thì con trỏ bị cắt cụt. Giải thích hợp lý nhất?',
      opts: [
        'ARM32 dùng big-endian nên thứ tự byte của con trỏ bị đảo',
        'Mã lưu con trỏ vào biến <code>long</code>; <code>long</code> là 8 byte ở hai target đầu nhưng chỉ <b>4</b> byte trên ARM32, đủ chứa con trỏ 32-bit nhưng vỡ ở mọi phép tính giả định 64-bit',
        'Trình biên dịch <code>arm-linux-gnueabihf-gcc</code> có lỗi ở mức tối ưu <code>-O2</code>',
        'Thiếu <code>&lt;stdint.h&gt;</code> nên trình biên dịch tự chọn kiểu ngẫu nhiên'],
      a: 1,
      why: 'Bạn đã tự đo: <code>__SIZEOF_LONG__</code> là <b>8</b> với x86-64 và aarch64 nhưng <b>4</b> với <code>arm-linux-gnueabihf</code>, và <code>__LP64__</code> biến mất hoàn toàn ở target thứ ba. Lỗi kiểu này ẩn rất lâu vì hai target đầu che nó đi. Cách phòng: dùng <code>uintptr_t</code> khi cần chứa con trỏ trong số nguyên, và đặt <code>_Static_assert</code> để trình biên dịch bắt lỗi ngay lúc dịch thay vì để board bắt lúc chạy. Endianness không liên quan — cả ba target trên đều little-endian.' },

    { q: 'Vì sao <code>uname -m</code> và <code>gcc -dumpmachine</code> có thể cho hai câu trả lời khác nhau trên cùng một máy?',
      opts: [
        'Chúng không thể khác nhau; nếu khác thì hệ thống đã hỏng',
        '<code>uname -m</code> hỏi <b>nhân đang chạy</b>, còn <code>-dumpmachine</code> hỏi <b>target của một công cụ cụ thể</b> — hai câu hỏi khác nhau về hai đối tượng khác nhau',
        '<code>uname</code> đọc từ BIOS còn <code>gcc</code> đọc từ <code>/proc/cpuinfo</code>',
        'Vì WSL2 báo sai kiến trúc cho tiến trình người dùng'],
      a: 1,
      why: 'Đây chính là bài học trung tâm của bài: <b>máy</b> và <b>công cụ</b> là hai thứ khác nhau. Trên máy này <code>uname -m</code> luôn là <code>x86_64</code>, nhưng <code>-dumpmachine</code> cho ba kết quả khác nhau tuỳ bạn hỏi trình biên dịch nào. Nếu chúng luôn trùng nhau thì cross-compile đã không tồn tại.' }
  ]
});

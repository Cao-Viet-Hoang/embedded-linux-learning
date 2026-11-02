/* Bài 64 — Đọc kernel panic và oops
   Chặng 12 — Debug, đo đạc, tối ưu
   Cố ý gây oops trong một module (buggy.ko, 80 dòng), đọc từng dòng thông điệp, rồi dịch địa chỉ về
   dòng C bằng faddr2line / addr2line / objdump -dS / gdb list / decodecode / decode_stacktrace.sh.
   Sau đó: WARN_ON vs BUG_ON (taint 4096 -> 4608 -> 4736), panic_on_oops, oops trong PID 1, và
   git bisect run trên một lịch sử 8 commit có một hồi quy.
   Mọi số liệu đo 2026-10-31 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, binutils 2.34,
   QEMU 4.2.1, gdb-multiarch 9.2, git 2.25.1), kernel ~/bai38/linux-6.18.45 (.version 6, cấu hình của
   Bài 63: DEBUG_INFO_REDUCED tắt). Không đổi .config, không build lại kernel.
   - Bài này sở hữu phần thực hành oops mà Bài 51 (bản tạm) còn nợ; xem docs/course-notes.md.
   - ~/bai64 (~6M) là nháp, xoá được. */

Lesson.register({
  id: 'bai-64',
  title: 'Đọc kernel panic và oops',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Nâng cao',

  intro:
    'Ở Bài 63 bạn ngồi trước một kernel đang sống, dừng nó lại và hỏi bằng GDB. Ngoài đời, lỗi kernel ' +
    'hiếm khi đến theo cách đó. Nó đến dưới dạng một đoạn log mà ai đó chụp từ cổng UART của một bo mạch ' +
    'ở xa: <code>Unable to handle kernel NULL pointer dereference at virtual address 0000000000000010</code>, ' +
    'rồi 40 dòng thanh ghi, địa chỉ và tên hàm. Máy đã khởi động lại, lỗi không tái hiện được, và đoạn log ' +
    'đó là tất cả những gì bạn có.<br><br>' +
    'Bài này dạy bạn đọc đoạn log đó. Bạn sẽ tự viết một module cố ý sập, đọc từng dòng của oops nó sinh ' +
    'ra, rồi dịch <code>pc : buggy_write+0xb4/0x1cc [buggy]</code> về đúng dòng 39 của <code>buggy.c</code> ' +
    'bằng năm công cụ khác nhau — và thấy vì sao một trong số chúng in sai tên hàm nếu bạn dùng nhầm bản ' +
    'binutils. Cuối bài, khi lỗi là một <i>hồi quy</i> (hôm qua chạy, hôm nay sập), bạn để ' +
    '<code>git bisect run</code> tự tìm ra commit gây lỗi trong 27 giây.',

  goals: [
    'Phân biệt <b>oops</b>, <b>panic</b>, <code>WARN_ON</code> và <code>BUG_ON</code>, và giải thích khi ' +
      'nào một oops biến thành panic (<code>panic_on_oops</code>, trong ngắt, trong PID 1).',
    'Đọc từng phần của một oops ARM64: dòng lý do, <code>ESR</code>/<code>FSC</code>, ' +
      '<code>Internal error: Oops … [#1]</code>, <code>Tainted:</code>, <code>pc</code>/<code>lr</code>, ' +
      'thanh ghi, <code>Call trace</code> và dòng <code>Code:</code>.',
    'Dịch một địa chỉ <code>hàm+offset/size</code> về dòng C bằng <code>faddr2line</code>, ' +
      '<code>addr2line</code>, <code>objdump -dS</code> và <code>gdb list</code>, rồi giải mã cả oops một ' +
      'lần bằng <code>decode_stacktrace.sh</code>.',
    'Suy ra field nào bị đọc từ địa chỉ lỗi (<code>0x10</code> → <code>reading</code>) bằng ' +
      '<code>ptype /o</code> và lệnh máy bị bẫy.',
    'Đọc giá trị <code>/proc/sys/kernel/tainted</code> (4096, 4608, 4224, 4736) thành các cờ ' +
      '<code>O</code>, <code>W</code>, <code>D</code>.',
    'Viết một script kiểm thử trả <code>0</code>/<code>1</code>/<code>125</code> và dùng ' +
      '<code>git bisect run</code> để tìm commit đầu tiên gây oops.'
  ],

  blocks: [

    /* ============================================================
       1. BỐN MỨC CỦA MỘT LỖI KERNEL
       ============================================================ */
    { t: 'h2', x: 'Oops, panic, WARN và BUG: bốn mức của một lỗi kernel' },

    { t: 'p', x:
      'Khi một chương trình userspace đọc con trỏ <code>NULL</code>, kernel gửi cho nó <code>SIGSEGV</code>, ' +
      'nó chết với <code>Segmentation fault</code>, mọi thứ khác chạy tiếp — bạn đã thấy điều này ở Bài 21. ' +
      'Khi chính <b>mã kernel</b> làm điều đó, không có ai đứng trên để gửi tín hiệu. Kernel phải tự quyết ' +
      'định: còn tin được trạng thái của mình không? Câu trả lời chia lỗi kernel thành bốn mức:' },

    { t: 'table',
      head: ['Mức', 'Ai gây ra', 'Kernel làm gì', 'Hệ thống sau đó'],
      rows: [
        ['<code>WARN_ON(cond)</code>', 'Lập trình viên tự đặt: "điều này không nên xảy ra"',
         'In <code>WARNING: … at file.c:dòng</code> + thanh ghi + call trace, đặt cờ taint <code>W</code>, rồi <b>chạy tiếp</b> như không có gì',
         'Bình thường; lệnh gọi vẫn thành công'],
        ['<b>Oops</b>', 'CPU: truy cập địa chỉ không hợp lệ, lệnh không hợp lệ…',
         'In báo cáo <code>Internal error: Oops</code>, <b>giết tác vụ đang chạy</b> mã lỗi, đặt cờ taint <code>D</code>',
         'Vẫn chạy, nhưng có thể đang giữ lock, nửa chừng sửa một danh sách… — không còn đáng tin'],
        ['<code>BUG_ON(cond)</code>', 'Lập trình viên tự đặt: "nếu điều này xảy ra thì không thể đi tiếp"',
         'Cố ý chạy lệnh <code>brk</code> → một oops có nhãn <code>Oops - BUG</code> và dòng <code>kernel BUG at file.c:dòng!</code>',
         'Như oops'],
        ['<b>Panic</b>', 'Oops ở nơi không thể giết ai (trong ngắt, trong PID 1), <code>panic_on_oops=1</code>, hoặc <code>panic()</code> gọi thẳng',
         'In <code>Kernel panic - not syncing: …</code>, dừng mọi CPU',
         'Đứng yên, hoặc khởi động lại sau <code>panic=N</code> giây']
      ] },

    { t: 'p', x:
      'Một cách dễ nhớ: oops là <b>"tôi vừa làm hỏng một việc, tôi bỏ việc đó"</b>; panic là <b>"tôi không ' +
      'dám làm thêm việc gì nữa"</b>. Một oops không làm máy đứng — đó là điều bước 2 sẽ cho bạn thấy: sau ' +
      'oops, shell vẫn nhận lệnh, module vẫn trả lời. Nhưng "vẫn chạy" không có nghĩa "vẫn đúng": bước 5 cho ' +
      'thấy một oops do <code>BUG_ON</code> để lại tác vụ chết khi đang tắt ngắt, và ngay sau đó kernel in ' +
      'thêm một <code>WARNING</code> ở chỗ hoàn toàn khác.' },

    { t: 'fig', cap: 'Mọi lỗi CPU trong kernel đi qua die(). Oops chỉ dừng ở một tác vụ khi kernel còn một tác vụ để giết và không ai yêu cầu dừng hẳn; ba nhánh còn lại đều kết thúc bằng panic.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Luồng xử lý một lỗi CPU trong kernel: từ fault tới die(), rồi tới oops hoặc panic">' +
        '<rect class="d-box-w" x="20" y="20" width="200" height="56" rx="8"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">Lệnh kernel bị bẫy</text>' +
        '<text class="d-ts" x="120" y="62" text-anchor="middle">đọc NULL+0x10, lệnh brk của BUG()</text>' +
        '<line class="d-line" x1="220" y1="48" x2="262" y2="48"/>' +
        '<path class="d-arrow" d="M270 48 l-9 -5 v10 z"/>' +
        '<rect class="d-box-p" x="270" y="20" width="180" height="56" rx="8"/>' +
        '<text class="d-tm" x="360" y="44" text-anchor="middle">die("Oops", regs, esr)</text>' +
        '<text class="d-ts" x="360" y="62" text-anchor="middle">in báo cáo, đặt taint D</text>' +
        '<line class="d-line" x1="450" y1="48" x2="492" y2="48"/>' +
        '<path class="d-arrow" d="M500 48 l-9 -5 v10 z"/>' +
        '<rect class="d-box" x="500" y="20" width="200" height="56" rx="8"/>' +
        '<text class="d-t" x="600" y="44" text-anchor="middle">Có thể tiếp tục không?</text>' +
        '<text class="d-ts" x="600" y="62" text-anchor="middle">ba câu hỏi bên dưới</text>' +
        '<line class="d-line" x1="600" y1="76" x2="600" y2="100"/>' +
        '<line class="d-line" x1="120" y1="100" x2="600" y2="100"/>' +
        '<line class="d-line" x1="120" y1="100" x2="120" y2="122"/>' +
        '<line class="d-line" x1="290" y1="100" x2="290" y2="122"/>' +
        '<line class="d-line" x1="460" y1="100" x2="460" y2="122"/>' +
        '<line class="d-line" x1="620" y1="100" x2="620" y2="122"/>' +
        '<path class="d-arrow" d="M120 130 l-5 -9 h10 z"/>' +
        '<path class="d-arrow" d="M290 130 l-5 -9 h10 z"/>' +
        '<path class="d-arrow" d="M460 130 l-5 -9 h10 z"/>' +
        '<path class="d-arrow" d="M620 130 l-5 -9 h10 z"/>' +
        '<rect class="d-box-w" x="30" y="130" width="180" height="56" rx="8"/>' +
        '<text class="d-t" x="120" y="152" text-anchor="middle">Đang trong ngắt</text>' +
        '<text class="d-ts" x="120" y="170" text-anchor="middle">không có tác vụ nào để giết</text>' +
        '<rect class="d-box-w" x="220" y="130" width="140" height="56" rx="8"/>' +
        '<text class="d-tm" x="290" y="152" text-anchor="middle">panic_on_oops=1</text>' +
        '<text class="d-ts" x="290" y="170" text-anchor="middle">người dùng yêu cầu</text>' +
        '<rect class="d-box-w" x="370" y="130" width="180" height="56" rx="8"/>' +
        '<text class="d-t" x="460" y="152" text-anchor="middle">Tác vụ bị giết là PID 1</text>' +
        '<text class="d-ts" x="460" y="170" text-anchor="middle">luật của Bài 49</text>' +
        '<rect class="d-box-g" x="560" y="130" width="140" height="56" rx="8"/>' +
        '<text class="d-t" x="630" y="152" text-anchor="middle">Không cái nào</text>' +
        '<text class="d-ts" x="630" y="170" text-anchor="middle">giết tác vụ, chạy tiếp</text>' +
        '<line class="d-line" x1="120" y1="186" x2="120" y2="222"/>' +
        '<line class="d-line" x1="290" y1="186" x2="290" y2="222"/>' +
        '<line class="d-line" x1="460" y1="186" x2="460" y2="222"/>' +
        '<path class="d-arrow" d="M120 230 l-5 -9 h10 z"/>' +
        '<path class="d-arrow" d="M290 230 l-5 -9 h10 z"/>' +
        '<path class="d-arrow" d="M460 230 l-5 -9 h10 z"/>' +
        '<line class="d-line" x1="630" y1="186" x2="630" y2="222"/>' +
        '<path class="d-arrow" d="M630 230 l-5 -9 h10 z"/>' +
        '<rect class="d-box-w" x="30" y="230" width="520" height="56" rx="8"/>' +
        '<text class="d-tm" x="290" y="254" text-anchor="middle">Kernel panic - not syncing: …</text>' +
        '<text class="d-ts" x="290" y="272" text-anchor="middle">"Fatal exception in interrupt" / "Oops: Fatal exception" / "Attempted to kill init!"</text>' +
        '<rect class="d-box-g" x="560" y="230" width="140" height="56" rx="8"/>' +
        '<text class="d-tm" x="630" y="254" text-anchor="middle">Segmentation fault</text>' +
        '<text class="d-ts" x="630" y="272" text-anchor="middle">shell nhận rc 139</text>' +
        '</svg>' },

    { t: 'p', x:
      'Ba thông điệp panic trong hình là ba chuỗi có thật trong mã nguồn kernel bạn đang có. Bạn có thể tự ' +
      'kiểm tra chúng sinh ra ở đâu:' },

    { t: 'code', where: 'wsl', code:
      'cd ~/bai38/linux-6.18.45\n' +
      'grep -n \'Internal error\' arch/arm64/kernel/traps.c\n' +
      'grep -n \'Fatal exception\' arch/arm64/kernel/traps.c\n' +
      'grep -n \'Attempted to kill init\' kernel/exit.c' },

    { t: 'code', where: 'out', nocopy: true, code:
      '182:\tpr_emerg("Internal error: %s: %016lx [#%d] " S_SMP "\\n",\n' +
      '227:\t\tpanic("%s: Fatal exception in interrupt", str);\n' +
      '229:\t\tpanic("%s: Fatal exception", str);\n' +
      '936:\t\t\tpanic("Attempted to kill init! exitcode=0x%08x\\n",' },

    { t: 'p', x:
      'Dòng 182 là dòng mở đầu của mọi oops ARM64 — <code>%s</code> là chữ <code>Oops</code> (hoặc ' +
      '<code>Oops - BUG</code>), <code>%016lx</code> là giá trị thanh ghi <code>ESR</code>, <code>[#%d]</code> ' +
      'là số thứ tự oops kể từ khi boot. Dòng 227 và 229 nằm ngay sau đó trong cùng hàm <code>die()</code>: ' +
      'đó là hai nhánh "trong ngắt" và "<code>panic_on_oops</code>" của hình trên. Dòng 936 của ' +
      '<code>kernel/exit.c</code> là luật "PID 1 không được chết" mà Bài 49 đã đọc.' },

    { t: 'cal', kind: 'why', title: 'Vì sao sản phẩm nhúng thường bật panic_on_oops',
      x: 'Trên máy chủ, giữ máy chạy sau oops để quản trị viên vào xem là hợp lý. Trên một thiết bị không ' +
         'người trông, kernel "nửa hỏng" là tình trạng tệ nhất: nó có thể giữ một lock mãi mãi, ngừng phục vụ ' +
         'mà watchdog vẫn được nuôi. <code>panic_on_oops=1</code> cộng <code>panic=N</code> biến mọi oops ' +
         'thành một lần khởi động lại sạch sau N giây — mất vài giây dịch vụ thay vì treo không thời hạn. ' +
         'Kernel của bạn có <code># CONFIG_PANIC_ON_OOPS is not set</code> và <code>CONFIG_PANIC_TIMEOUT=0</code>, ' +
         'nên mặc định là "chạy tiếp" và "panic thì đứng yên"; bước 5 đổi cả hai lúc chạy qua ' +
         '<code>/proc/sys/kernel/</code>.' },

    /* ============================================================
       2. GIẢI PHẪU MỘT OOPS
       ============================================================ */
    { t: 'h2', x: 'Giải phẫu một thông điệp oops' },

    { t: 'p', x:
      'Một oops ARM64 dài khoảng 46 dòng nhưng chỉ có bảy phần, và luôn theo đúng thứ tự này. Hình dưới ' +
      'đánh dấu chúng trên chính bản ghi bạn sẽ tạo ở bước 2 (đã lược bớt thanh ghi):' },

    { t: 'fig', cap: 'Đọc oops từ trên xuống: lý do → loại lỗi phần cứng → dòng "Internal error" → bối cảnh (module, tác vụ, taint) → nơi xảy ra (pc, lr) → đường đi (Call trace) → bằng chứng (Code). Hai dòng đáng giá nhất là dòng đầu và dòng pc.',
      svg:
        '<svg viewBox="0 0 720 380" width="720" role="img" aria-label="Bảy phần của một thông điệp oops ARM64, mỗi phần được đánh dấu">' +
        '<rect class="d-box" x="20" y="10" width="470" height="360" rx="8"/>' +
        '<text class="d-tm" x="32" y="34">Unable to handle kernel NULL pointer</text>' +
        '<text class="d-tm" x="32" y="50">  dereference at virtual address …0010</text>' +
        '<text class="d-tm" x="32" y="76">Mem abort info: ESR = 0x96000006</text>' +
        '<text class="d-tm" x="32" y="92">  EC = 0x25: DABT (current EL)</text>' +
        '<text class="d-tm" x="32" y="108">  FSC = 0x06: level 2 translation fault</text>' +
        '<text class="d-tm" x="32" y="124">  WnR = 0</text>' +
        '<text class="d-tm" x="32" y="150">Internal error: Oops: 0000000096000006 [#1] SMP</text>' +
        '<text class="d-tm" x="32" y="176">Modules linked in: buggy(O)</text>' +
        '<text class="d-tm" x="32" y="192">CPU: 0 … PID: 56 Comm: sh Tainted: G  O</text>' +
        '<text class="d-tm" x="32" y="218">pc : buggy_write+0xb4/0x1cc [buggy]</text>' +
        '<text class="d-tm" x="32" y="234">lr : buggy_write+0xa4/0x1cc [buggy]</text>' +
        '<text class="d-tm" x="32" y="250">x29: … x2 : 000000000000000a … x0 : 0</text>' +
        '<text class="d-tm" x="32" y="276">Call trace:</text>' +
        '<text class="d-tm" x="32" y="292"> buggy_write+0xb4/0x1cc [buggy] (P)</text>' +
        '<text class="d-tm" x="32" y="308"> proc_reg_write+0x9c/0xf0</text>' +
        '<text class="d-tm" x="32" y="324"> vfs_write … el0t_64_sync</text>' +
        '<text class="d-tm" x="32" y="350">Code: … f9424400 (f9400800)</text>' +
        '<rect class="d-box-w" x="510" y="22" width="190" height="34" rx="6"/>' +
        '<text class="d-t" x="522" y="44">1 · Lý do, địa chỉ lỗi</text>' +
        '<rect class="d-box" x="510" y="66" width="190" height="64" rx="6"/>' +
        '<text class="d-t" x="522" y="88">2 · Loại lỗi phần cứng</text>' +
        '<text class="d-ts" x="522" y="106">đọc hay ghi, mức bảng trang</text>' +
        '<rect class="d-box-p" x="510" y="138" width="190" height="20" rx="6"/>' +
        '<text class="d-t" x="522" y="153">3 · Oops số mấy</text>' +
        '<rect class="d-box" x="510" y="166" width="190" height="32" rx="6"/>' +
        '<text class="d-t" x="522" y="187">4 · Bối cảnh: ai, taint</text>' +
        '<rect class="d-box-w" x="510" y="206" width="190" height="50" rx="6"/>' +
        '<text class="d-t" x="522" y="228">5 · Nơi xảy ra</text>' +
        '<text class="d-ts" x="522" y="246">pc, lr, 31 thanh ghi</text>' +
        '<rect class="d-box-a" x="510" y="264" width="190" height="66" rx="6"/>' +
        '<text class="d-t" x="522" y="286">6 · Đường đi</text>' +
        '<text class="d-ts" x="522" y="304">ai gọi ai, từ trên xuống</text>' +
        '<rect class="d-box" x="510" y="338" width="190" height="24" rx="6"/>' +
        '<text class="d-t" x="522" y="355">7 · Mã máy quanh pc</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Phần', 'Đọc thế nào', 'Trong bản ghi của bài này nói gì'],
      rows: [
        ['1 · Lý do', '<code>NULL pointer dereference</code> khi địa chỉ nhỏ hơn một trang (4 KiB); <code>paging request</code> khi địa chỉ khác. Con số là địa chỉ <b>bị truy cập</b>, không phải địa chỉ của lệnh.',
         'Đọc ở <code>0x10</code> = 16: con trỏ là <code>NULL</code>, và field bị đọc nằm ở offset 16 của struct'],
        ['2 · <code>ESR</code>', 'Thanh ghi "Exception Syndrome" của ARM64. <code>EC</code> là loại ngoại lệ, <code>FSC</code> là loại lỗi trang, <code>WnR</code> = 1 nếu là ghi.',
         '<code>EC 0x25</code> = data abort ở chính mức kernel; <code>WnR = 0</code> = <b>đọc</b>; <code>pmd=0</code> ở dòng bảng trang = không có gì được ánh xạ ở đó'],
        ['3 · <code>Internal error</code>', '<code>[#1]</code> là oops thứ mấy kể từ boot. Khi có <code>[#2]</code>, hãy đọc <code>[#1]</code> trước — cái sau thường là hậu quả.',
         'Oops đầu tiên'],
        ['4 · Bối cảnh', '<code>Modules linked in</code> liệt kê module đang nạp, kèm cờ của chúng. <code>Comm</code>/<code>PID</code> là tác vụ đang chạy. <code>Tainted:</code> là các cờ taint (phần sau).',
         '<code>buggy(O)</code>: module ngoài cây (out-of-tree); tác vụ là <code>sh</code>'],
        ['5 · <code>pc</code> / <code>lr</code>', '<code>pc</code> = lệnh gây lỗi; <code>lr</code> = địa chỉ trả về của lần <code>bl</code> gần nhất. Dạng <code>hàm+offset/kích_thước [module]</code>.',
         'Lỗi ở byte <code>0xb4</code> của <code>buggy_write</code> (dài <code>0x1cc</code> = 460 byte). <code>x0 = 0</code>: thanh ghi chứa con trỏ <code>NULL</code>'],
        ['6 · <code>Call trace</code>', 'Hàm trên cùng là nơi lỗi; mỗi dòng dưới là hàm đã gọi dòng trên. <code>(P)</code> = khung lấy từ PC đã lưu, chính xác tuyệt đối.',
         '<code>write()</code> từ userspace → <code>vfs_write</code> → <code>proc_reg_write</code> → hàm <code>.proc_write</code> của bạn'],
        ['7 · <code>Code:</code>', 'Năm lệnh máy quanh <code>pc</code>; lệnh trong ngoặc là lệnh bị bẫy.',
         '<code>f9400800</code> = <code>ldr x0, [x0, #16]</code>: đọc 8 byte ở <code>x0 + 16</code>, với <code>x0 = 0</code>']
      ] },

    { t: 'cal', kind: 'tip', title: 'Thứ tự đọc nhanh khi nhận một oops lạ',
      x: '<ol><li>Dòng đầu: loại lỗi và địa chỉ bị truy cập.</li>' +
         '<li>Dòng <code>pc</code>: hàm nào, module nào.</li>' +
         '<li><code>Tainted:</code> và <code>Modules linked in</code>: có module ngoài cây hoặc độc quyền không? ' +
         'Nếu có, cộng đồng kernel sẽ hỏi bạn tái hiện lại khi không nạp nó.</li>' +
         '<li><code>Call trace</code>: lỗi đi vào từ đâu (một syscall? một ngắt? một workqueue?).</li>' +
         '<li>Mới đến thanh ghi và <code>Code:</code>, khi cần chứng minh chính xác giá trị nào sai.</li></ol>' },

    { t: 'h3', x: 'Cờ taint: kernel tự khai nó đã "không còn sạch"' },

    { t: 'p', x:
      'Taint (vết bẩn) là một số nguyên trong kernel, mỗi bit là một sự kiện làm giảm độ tin cậy của mọi báo ' +
      'cáo lỗi sau đó. Bạn đã thấy bit 12 ở Bài 50 (nạp module ngoài cây → <code>4096</code>). Bảng đầy đủ là ' +
      'một mảng trong <code>kernel/panic.c</code>; bài này gặp ba cờ:' },

    { t: 'table',
      head: ['Bit', 'Giá trị', 'Chữ', 'Nghĩa', 'Gặp ở bước'],
      rows: [
        ['7', '128', '<code>D</code>', '<code>DIE</code>: đã có ít nhất một oops', '2, 5'],
        ['9', '512', '<code>W</code>', '<code>WARN</code>: đã có ít nhất một <code>WARN_ON</code>', '5'],
        ['12', '4096', '<code>O</code>', '<code>OOT_MODULE</code>: đã nạp một module ngoài cây nguồn kernel', '2, 5']
      ] },

    { t: 'p', x:
      'Giá trị trong <code>/proc/sys/kernel/tainted</code> là tổng các bit đang bật. Không cần thuộc bảng: ' +
      'dòng <code>Tainted: [D]=DIE, [W]=WARN, [O]=OOT_MODULE</code> trong chính oops đã giải mã sẵn, và bạn ' +
      'luôn đọc được bảng gốc bằng <code>grep -n "TAINT_FLAG(" ~/bai38/linux-6.18.45/kernel/panic.c</code>. ' +
      'Điều đáng nhớ là <b>nguyên tắc</b>: cờ taint không bao giờ tự tắt cho tới lần boot sau. Một oops có ' +
      '<code>D</code> trong dòng <code>Tainted:</code> nghĩa là nó <i>không phải</i> oops đầu tiên — hãy đi ' +
      'tìm cái trước nó.' },

    /* ============================================================
       3. TỪ ĐỊA CHỈ VỀ DÒNG CODE
       ============================================================ */
    { t: 'h2', x: 'Từ buggy_write+0xb4 về dòng 39: các công cụ dịch địa chỉ' },

    { t: 'p', x:
      'Dòng <code>pc : buggy_write+0xb4/0x1cc [buggy]</code> chưa phải câu trả lời — nó là một <b>toạ độ</b>. ' +
      'Nó nói "byte thứ 0xb4 tính từ đầu hàm <code>buggy_write</code>, một hàm dài 0x1cc byte, trong module ' +
      '<code>buggy</code>". Kernel in toạ độ dạng tương đối này thay vì địa chỉ tuyệt đối ' +
      '<code>0xffff80007afd00bc</code> vì địa chỉ tuyệt đối của module đổi sau mỗi lần <code>insmod</code> ' +
      '(và với KASLR, của cả kernel sau mỗi lần boot), còn khoảng cách tính từ đầu hàm thì không.' },

    { t: 'p', x:
      'Muốn đổi toạ độ đó thành <code>buggy.c:39</code>, bạn cần đúng file đã sinh ra mã đó, <b>còn nguyên ' +
      'debug info</b>: <code>buggy.ko</code> cho module, <code>vmlinux</code> cho kernel. Đây là lý do Bài 63 ' +
      'bảo bạn giữ <code>vmlinux</code> 666 MB, và là lý do quy trình phát hành chuyên nghiệp lưu lại ' +
      '<code>vmlinux</code> và các <code>.ko</code> chưa strip của <b>mỗi</b> bản build gửi cho khách — một ' +
      'oops từ bản 1.4.2 chỉ giải mã được bằng chính <code>vmlinux</code> của bản 1.4.2.' },

    { t: 'table',
      head: ['Công cụ', 'Đầu vào', 'Đầu ra', 'Khi nào dùng'],
      rows: [
        ['<code>scripts/faddr2line</code>', '<code>hàm+offset/size</code> đúng như trong oops', 'Hàm, file:dòng, cả chuỗi inline', 'Cách nhanh nhất cho một dòng; tự kiểm tra <code>size</code> khớp với file bạn đưa'],
        ['<code>addr2line</code>', 'Một địa chỉ số trong file ELF', 'File:dòng (<code>-f</code> thêm tên hàm, <code>-i</code> thêm inline)', 'Khi bạn chỉ có địa chỉ, hoặc muốn hiểu <code>faddr2line</code> làm gì bên trong'],
        ['<code>objdump -dS</code>', 'File ELF + khoảng địa chỉ', 'Mã máy xen dòng C', 'Khi một dòng C sinh nhiều lệnh và bạn cần biết <i>lệnh nào</i> đã bẫy'],
        ['<code>gdb</code> <code>list *(hàm+off)</code>', 'File ELF', 'Đoạn mã nguồn quanh dòng đó', 'Khi muốn thấy ngữ cảnh; <code>ptype /o</code> cho offset từng field'],
        ['<code>scripts/decodecode</code>', 'Dòng <code>Code:</code>', 'Hợp ngữ của 5 lệnh', 'Khi không có file ELF nào khớp — dòng <code>Code:</code> tự mang mã máy'],
        ['<code>scripts/decode_stacktrace.sh</code>', 'Cả oops + <code>vmlinux</code> + thư mục module', 'Oops với file:dòng gắn vào <b>mọi</b> khung', 'Khi viết báo cáo lỗi; luôn dùng trước khi gửi oops cho người khác']
      ] },

    { t: 'cal', kind: 'warn', title: 'Mọi công cụ phải là bản của kiến trúc đích',
      x: '<code>faddr2line</code> và <code>decode_stacktrace.sh</code> gọi <code>${CROSS_COMPILE}addr2line</code>, ' +
         '<code>${CROSS_COMPILE}readelf</code>. Quên <code>CROSS_COMPILE=aarch64-linux-gnu-</code>, chúng dùng ' +
         '<code>addr2line</code> x86-64 của host — vẫn đọc được số dòng (DWARF không phụ thuộc kiến trúc) nhưng ' +
         'không hiểu relocation ARM64, nên in <b>tên hàm sai</b> (<code>mod_plt_sec</code>) mà không báo lỗi. ' +
         'Bước 3 cho bạn thấy đúng điều đó. Đây là cùng bài học "build/host/target" của Bài 25.' },

    { t: 'h3', x: 'git bisect: khi lỗi là một hồi quy' },

    { t: 'p', x:
      'Mọi công cụ trên trả lời "lỗi ở dòng nào". Với một <b>hồi quy</b> — bản tuần trước chạy, bản hôm nay ' +
      'sập — câu hỏi hữu ích hơn thường là "<b>thay đổi nào</b> gây ra nó", vì dòng 39 có thể đã đúng suốt ' +
      'năm năm và chỉ sai khi một commit khác đổi giá trị đầu vào của nó. <code>git bisect</code> tìm commit ' +
      'đó bằng tìm kiếm nhị phân: bạn đánh dấu một commit tốt và một commit xấu, Git checkout commit ở giữa, ' +
      'bạn kiểm thử và trả lời tốt/xấu, Git chia đôi tiếp.' },

    { t: 'p', x:
      'Với 7 commit giữa tốt và xấu, cần tối đa 3 lần kiểm thử (2³ = 8). Với 15 000 commit giữa hai bản kernel ' +
      'phát hành liên tiếp, chỉ cần khoảng 14. Và vì mỗi lần kiểm thử ở đây là "build module, boot QEMU, ' +
      'xem có oops không" — một việc máy làm được — <code>git bisect run script.sh</code> chạy cả quá trình ' +
      'mà không cần bạn. Quy ước mã thoát của script là phần duy nhất phải nhớ:' },

    { t: 'table',
      head: ['Mã thoát của script', 'Git hiểu là', 'Dùng khi'],
      rows: [
        ['<code>0</code>', '<code>good</code>', 'Lỗi không xảy ra'],
        ['<code>1</code> … <code>127</code> (trừ 125)', '<code>bad</code>', 'Lỗi xảy ra'],
        ['<code>125</code>', '<code>skip</code> — không kết luận được, thử commit bên cạnh', 'Commit không build được, hoặc test không chạy tới được chỗ cần xem'],
        ['<code>128</code> trở lên', 'Dừng cả quá trình bisect', 'Script tự hỏng (ví dụ bị tín hiệu giết)']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao mã 125 quan trọng',
      x: 'Nếu script trả <code>1</code> cho một commit không build được, Git coi đó là "xấu" và bisect hội tụ ' +
         'về một commit hoàn toàn vô can — commit làm hỏng build, không phải commit gây oops. Script của bước 6 ' +
         'trả <code>1</code> <b>chỉ khi</b> thấy <code>Unable to handle kernel</code> trong log, <code>0</code> ' +
         'chỉ khi thấy kết quả đúng, và <code>125</code> cho mọi trường hợp còn lại.' },

    /* ============================================================
       4. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: gây oops, đọc nó, rồi truy ra commit gây lỗi' },

    { t: 'p', x:
      'Bài này dùng lại kernel <code>~/bai38/linux-6.18.45</code> đúng như Bài 63 để lại (<code>.version</code> ' +
      '6, <code>vmlinux</code> 666 MB có debug info đầy đủ) và initramfs BusyBox của Bài 32. Không build lại ' +
      'kernel, không đổi <code>.config</code>. Mọi lần boot dùng <code>-cpu cortex-a57</code> và ' +
      '<code>nokaslr</code> như Bài 63, để địa chỉ trong bài khớp với máy bạn.' },

    { t: 'cal', kind: 'danger', title: 'Chỉ gây oops trong máy ảo',
      x: 'Mọi module sập trong bài này chỉ được <code>insmod</code> <b>bên trong QEMU</b>. Không bao giờ nạp nó ' +
         'vào kernel WSL hay vào máy Linux thật của bạn: một oops ở đó có thể để lại lock bị giữ mãi, và ' +
         'bước 5 cho thấy một oops trong PID 1 làm sập cả hệ thống.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Viết một module sập có chủ đích',
        blocks: [
          { t: 'p', x:
            'Module này tạo file <code>/proc/buggy</code>. Ghi một từ vào đó chọn một trong bốn hành vi: ' +
            '<code>ok</code> đọc cảm biến 0 (hợp lệ), <code>null</code> đọc cảm biến 1 (chưa bao giờ được cấp ' +
            'phát — con trỏ <code>NULL</code>), <code>warn</code> kích hoạt <code>WARN_ON</code>, <code>bug</code> ' +
            'kích hoạt <code>BUG_ON</code>. Một module cho cả bài, để bạn so sánh các loại báo cáo trên cùng một ' +
            'hàm. Giao diện <code>/proc</code> họ hàng với <code>/proc/ramdisk</code> của Bài 53: Bài 53 dùng <code>proc_create_single</code> (chỉ đọc), ở đây cần ghi nên ' +
            'dùng <code>proc_create</code> với một <code>struct proc_ops</code> có <code>.proc_write</code>.' },

          { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai64/buggy && cd ~/bai64/buggy' },

          { t: 'code', where: 'file', name: '~/bai64/buggy/buggy.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/* buggy.c - a module that crashes on purpose, to practise reading oops */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/proc_fs.h>\n' +
            '#include <linux/slab.h>\n' +
            '#include <linux/string.h>\n' +
            '#include <linux/uaccess.h>\n' +
            '\n' +
            'struct sensor {\n' +
            '\tint id;\t\t\t/* offset 0x00 */\n' +
            '\tint flags;\t\t/* offset 0x04 */\n' +
            '\tconst char *label;\t/* offset 0x08 */\n' +
            '\tint *reading;\t\t/* offset 0x10 */\n' +
            '};\n' +
            '\n' +
            'static int raw_value = 25000;\n' +
            'static struct sensor *sensors[2];\t/* sensors[1] is never allocated */\n' +
            '\n' +
            'static noinline int sensor_value(struct sensor *s)\n' +
            '{\n' +
            '\treturn *s->reading;\n' +
            '}\n' +
            '\n' +
            'static ssize_t buggy_write(struct file *file, const char __user *ubuf,\n' +
            '\t\t\t   size_t len, loff_t *off)\n' +
            '{\n' +
            '\tchar cmd[16];\n' +
            '\tsize_t n = min(len, sizeof(cmd) - 1);\n' +
            '\n' +
            '\tif (copy_from_user(cmd, ubuf, n))\n' +
            '\t\treturn -EFAULT;\n' +
            '\tcmd[n] = \'\\0\';\n' +
            '\n' +
            '\tif (sysfs_streq(cmd, "ok"))\n' +
            '\t\tpr_info("sensor 0 reads %d\\n", sensor_value(sensors[0]));\n' +
            '\telse if (sysfs_streq(cmd, "null"))\n' +
            '\t\tpr_info("sensor 1 reads %d\\n", sensor_value(sensors[1]));\n' +
            '\telse if (sysfs_streq(cmd, "warn"))\n' +
            '\t\tWARN_ON(raw_value > 20000);\n' +
            '\telse if (sysfs_streq(cmd, "bug"))\n' +
            '\t\tBUG_ON(raw_value > 20000);\n' +
            '\telse\n' +
            '\t\treturn -EINVAL;\n' +
            '\n' +
            '\treturn len;\n' +
            '}\n' +
            '\n' +
            'static const struct proc_ops buggy_ops = {\n' +
            '\t.proc_write = buggy_write,\n' +
            '};\n' +
            '\n' +
            'static int __init buggy_init(void)\n' +
            '{\n' +
            '\tsensors[0] = kzalloc(sizeof(*sensors[0]), GFP_KERNEL);\n' +
            '\tif (!sensors[0])\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tsensors[0]->label = "board";\n' +
            '\tsensors[0]->reading = &raw_value;\n' +
            '\n' +
            '\tif (!proc_create("buggy", 0200, NULL, &buggy_ops)) {\n' +
            '\t\tkfree(sensors[0]);\n' +
            '\t\treturn -ENOMEM;\n' +
            '\t}\n' +
            '\tpr_info("loaded, write ok|null|warn|bug to /proc/buggy\\n");\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit buggy_exit(void)\n' +
            '{\n' +
            '\tremove_proc_entry("buggy", NULL);\n' +
            '\tkfree(sensors[0]);\n' +
            '\tpr_info("unloaded\\n");\n' +
            '}\n' +
            '\n' +
            'module_init(buggy_init);\n' +
            'module_exit(buggy_exit);\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Crashes on purpose to practise reading oops");\n',
            notes: [
              'Dòng 39 (<code>sensor_value(sensors[1])</code>), 41 (<code>WARN_ON</code>) và 43 (<code>BUG_ON</code>) là ba dòng mà oops sẽ chỉ tới. Giữ nguyên số dòng khi gõ lại, để kết quả khớp với bài.',
              '<code>id</code> và <code>flags</code> chỉ có mặt để đẩy <code>reading</code> ra offset <code>0x10</code>: con số 16 đó sẽ hiện nguyên vẹn trong dòng đầu của oops.',
              '<code>noinline</code> giữ <code>sensor_value</code> thành một hàm riêng, để bạn thấy compiler vẫn đọc <code>s-&gt;reading</code> ngay trong <code>buggy_write</code> trước khi gọi nó.',
              'Không đặt tên module là <code>oops</code>: <code>oops_exit</code> trùng với một hàm có thật trong <code>include/linux/panic.h</code> và build thất bại.'
            ] },

          { t: 'p', x: 'Makefile là bản của Bài 50, chỉ đổi tên đối tượng:' },

          { t: 'code', where: 'file', name: '~/bai64/buggy/Makefile', lang: 'makefile', code:
            'obj-m := buggy.o\n' +
            '\n' +
            'KDIR          ?= $(HOME)/bai38/linux-6.18.45\n' +
            'ARCH          ?= arm64\n' +
            'CROSS_COMPILE ?= aarch64-linux-gnu-\n' +
            '\n' +
            'all:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) modules\n' +
            '\n' +
            'clean:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) clean\n' },

          { t: 'p', x: 'Build, rồi kiểm tra rằng <code>buggy.ko</code> mang theo debug info — thứ mà bước 3 cần:' },

          { t: 'code', where: 'wsl', code:
            'make\n' +
            'file buggy.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai64/buggy ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            '  CC [M]  buggy.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  buggy.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  buggy.ko\n' +
            'buggy.ko: ELF 64-bit LSB relocatable, ARM aarch64, version 1 (SYSV), BuildID[sha1]=e2ed09ec2451578cea7e8589bd54eeb3f3f5bbbe, with debug_info, not stripped',
            notes: ['Đã lược các dòng <code>make[1]: Entering/Leaving directory</code>. <code>BuildID</code> và đường dẫn <code>/home/cah8hc</code> sẽ khác trên máy bạn.'] },

          { t: 'p', x:
            '<code>with debug_info, not stripped</code> là điều kiện để mọi công cụ ở bước 3 chạy được. File nặng ' +
            '511 728 byte chính vì phần debug info đó; phần thật sự nạp vào kernel chỉ khoảng 12 KiB (bước 2, ' +
            '<code>lsmod</code>). Tiếp theo, chép initramfs của Bài 32, thêm module và đóng gói lại — cùng cách ' +
            'Bài 50 đã làm:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp buggy/buggy.ko initramfs/\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code: '4871 blocks',
            notes: ['Số khối 512 byte mà <code>cpio</code> ghi ra; lệch vài khối trên máy bạn là bình thường (Bài 50 đã giải thích).'] }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Gây oops và giữ lại bản ghi',
        blocks: [
          { t: 'p', x:
            'Boot như Bài 63, nhưng đẩy toàn bộ cổng nối tiếp qua <code>tee</code>: bạn vẫn gõ lệnh bình thường, ' +
            'đồng thời mọi dòng kernel in ra được ghi vào <code>boot.log</code>. Đây chính là việc một kỹ sư làm ' +
            'với bo mạch thật — để cửa sổ UART ghi log ra file suốt buổi, vì oops không báo trước.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr" | tee boot.log' },

          { t: 'p', x:
            'Khi thấy dấu nhắc <code>~ #</code>, nạp module và thử đường đi hợp lệ trước — để chắc rằng module ' +
            'tự nó không hỏng:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /buggy.ko\n' +
            'echo ok > /proc/buggy' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    3.750902] buggy: loading out-of-tree module taints kernel.\n' +
            '[    3.754933] buggy: loaded, write ok|null|warn|bug to /proc/buggy\n' +
            '[    4.550088] buggy: sensor 0 reads 25000' },

          { t: 'p', x:
            '<code>sensor 0 reads 25000</code>: cảm biến 0 được cấp phát và trỏ tới <code>raw_value</code>, mọi thứ ' +
            'đúng. Dòng <code>taints kernel</code> là bit 12 (<code>O</code>) bạn đã gặp ở Bài 50 — từ giây thứ 3,75 ' +
            'kernel này đã "không sạch", trước cả khi có lỗi nào.' },

          { t: 'p', x:
            'Giờ gây lỗi. Lệnh ghi được chạy trong một shell con <code>sh -c</code> chứ không gõ thẳng: oops sẽ ' +
            'giết tác vụ đang ghi, và nếu tác vụ đó là shell chính — PID 1 của initramfs này — thì kernel panic. ' +
            'Bước 5 sẽ cố ý làm điều đó; ở đây bạn muốn hệ thống sống sót để quan sát tiếp.' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'sh -c "echo null > /proc/buggy"\n' +
            'echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    5.350318] Unable to handle kernel NULL pointer dereference at virtual address 0000000000000010\n' +
            '[    5.350623] Mem abort info:\n' +
            '[    5.350711]   ESR = 0x0000000096000006\n' +
            '[    5.350816]   EC = 0x25: DABT (current EL), IL = 32 bits\n' +
            '[    5.350938]   SET = 0, FnV = 0\n' +
            '[    5.351023]   EA = 0, S1PTW = 0\n' +
            '[    5.351110]   FSC = 0x06: level 2 translation fault\n' +
            '[    5.351226] Data abort info:\n' +
            '[    5.351307]   ISV = 0, ISS = 0x00000006, ISS2 = 0x00000000\n' +
            '[    5.351427]   CM = 0, WnR = 0, TnD = 0, TagAccess = 0\n' +
            '[    5.351542]   GCS = 0, Overlay = 0, DirtyBit = 0, Xs = 0\n' +
            '[    5.351689] user pgtable: 4k pages, 48-bit VAs, pgdp=0000000044684000\n' +
            '[    5.351829] [0000000000000010] pgd=0800000043ef1403, p4d=0800000043ef1403, pud=0800000043eee403, pmd=0000000000000000\n' +
            '[    5.352785] Internal error: Oops: 0000000096000006 [#1]  SMP\n' +
            '[    5.353263] Modules linked in: buggy(O)\n' +
            '[    5.353719] CPU: 0 UID: 0 PID: 56 Comm: sh Tainted: G           O        6.18.45-embedded #6 PREEMPT \n' +
            '[    5.353927] Tainted: [O]=OOT_MODULE\n' +
            '[    5.353990] Hardware name: linux,dummy-virt (DT)\n' +
            '[    5.354168] pstate: 00000005 (nzcv daif -PAN -UAO -TCO -DIT -SSBS BTYPE=--)\n' +
            '[    5.354285] pc : buggy_write+0xb4/0x1cc [buggy]\n' +
            '[    5.354618] lr : buggy_write+0xa4/0x1cc [buggy]\n' +
            '[    5.354713] sp : ffff800083433cc0\n' +
            '[    5.354773] x29: ffff800083433cc0 x28: ffff0000045e91c0 x27: 0000000000000000\n' +
            '[    5.354917] x26: 0000000000000000 x25: 0000000000000000 x24: ffff800083433e10\n' +
            '[    5.355029] x23: ffff0000045e91c0 x22: ffff800083433cf8 x21: ffff0000045e91c0\n' +
            '[    5.355138] x20: 0000000000000005 x19: 0000000000000005 x18: 0000000000000000\n' +
            '[    5.355247] x17: 0000000000000000 x16: 0000000000000000 x15: 000000003f47b840\n' +
            '[    5.355356] x14: 0000000000000000 x13: 0000000000000000 x12: 0000000000000000\n' +
            '[    5.355464] x11: 0000000000000000 x10: 0000000000000000 x9 : 0000000000000000\n' +
            '[    5.355585] x8 : ffff80007afd0008 x7 : ffff800083433e10 x6 : ffff800083433cfd\n' +
            '[    5.355695] x5 : ffff800083433cfd x4 : 0000000000000000 x3 : 0000000000000000\n' +
            '[    5.355803] x2 : 000000000000000a x1 : ffff80007afd408d x0 : 0000000000000000\n' +
            '[    5.355975] Call trace:\n' +
            '[    5.356128]  buggy_write+0xb4/0x1cc [buggy] (P)\n' +
            '[    5.356255]  proc_reg_write+0x9c/0xf0\n' +
            '[    5.356471]  vfs_write+0xd0/0x4c0\n' +
            '[    5.356531]  ksys_write+0x6c/0xfc\n' +
            '[    5.356587]  __arm64_sys_write+0x1c/0x28\n' +
            '[    5.356650]  invoke_syscall+0x44/0xe8\n' +
            '[    5.356711]  el0_svc_common.constprop.0+0x40/0xe0\n' +
            '[    5.356783]  do_el0_svc+0x1c/0x28\n' +
            '[    5.356837]  el0_svc+0x38/0x128\n' +
            '[    5.356895]  el0t_64_sync_handler+0xd0/0xe4\n' +
            '[    5.356961]  el0t_64_sync+0x198/0x19c\n' +
            '[    5.357143] Code: 72001c1f 540005a0 d0000000 f9424400 (f9400800) \n' +
            '[    5.357350] ---[ end trace 0000000000000000 ]---\n' +
            'Segmentation fault\n' +
            'rc=139',
            notes: [
              'Dấu thời gian, <code>PID: 56</code>, <code>pgdp=</code>, <code>sp</code> và các thanh ghi chứa địa chỉ ngăn xếp (<code>x22</code>, <code>x24</code>, <code>x28</code>…) sẽ khác trên máy bạn. Các giá trị lặp lại được: địa chỉ <code>0x10</code>, <code>ESR</code>, <code>+0xb4/0x1cc</code>, <code>x0 = 0</code>, cả <code>Call trace</code> và dòng <code>Code:</code> — miễn là bạn dùng đúng <code>buggy.c</code>, GCC 9.4 và kernel của <code>~/bai38</code>.',
              'Bản ghi này được lấy bằng một script gõ lệnh hộ vào QEMU; các dòng lệnh shell xen giữa đã được bỏ đi.'
            ] },

          { t: 'p', x:
            'Đọc nó theo thứ tự ở phần lý thuyết. <b>Dòng đầu</b>: đọc tại địa chỉ <code>0x10</code> — một con trỏ ' +
            '<code>NULL</code> cộng 16. <b><code>WnR = 0</code></b>: là đọc, không phải ghi. <b><code>pmd=0</code></b>: ' +
            'bảng trang dừng ở mức 2 vì không có gì được ánh xạ quanh địa chỉ 0 — khớp với ' +
            '<code>FSC = 0x06: level 2 translation fault</code>. <b><code>Comm: sh</code>, <code>PID: 56</code></b>: ' +
            'tác vụ là shell con, không phải PID 1. <b><code>pc</code></b>: byte <code>0xb4</code> của ' +
            '<code>buggy_write</code>. <b><code>x0 = 0</code></b>: thanh ghi giữ con trỏ <code>NULL</code>. ' +
            '<b><code>Call trace</code></b> đọc từ dưới lên là đúng thứ tự thời gian: <code>el0t_64_sync</code> ' +
            '(ngoại lệ từ EL0 = userspace gọi syscall) → <code>__arm64_sys_write</code> → <code>vfs_write</code> → ' +
            '<code>proc_reg_write</code> → hàm của bạn.' },

          { t: 'p', x:
            'Hai dòng cuối là phía userspace: <code>Segmentation fault</code> và <code>rc=139</code> = 128 + 11 ' +
            '(<code>SIGSEGV</code>). Kernel giết tác vụ gây oops bằng đúng tín hiệu mà nó gửi cho một chương trình ' +
            'thường đọc <code>NULL</code> — với shell cha, hai trường hợp trông giống hệt nhau.' },

          { t: 'p', x: 'Hệ thống còn sống không, và nó đã ghi lại gì về sự kiện này?' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'cat /proc/sys/kernel/tainted\n' +
            'lsmod\n' +
            'echo ok > /proc/buggy' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4224\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'buggy                  12288  0 \n' +
            '[    8.561421] buggy: sensor 0 reads 25000' },

          { t: 'p', x:
            '<code>4224</code> = 4096 (<code>O</code>) + 128 (<code>D</code>): cờ <code>DIE</code> đã bật và sẽ ' +
            'ở đó tới lần boot sau. <code>lsmod</code> vẫn chạy, module vẫn nạp (<code>12288</code> byte trong ' +
            'kernel, so với 511 728 byte của file), và <code>echo ok</code> vẫn trả lời đúng. Đó là định nghĩa của ' +
            'oops: một tác vụ chết, hệ thống chạy tiếp. Tắt máy bằng <code>poweroff -f</code>.' },

          { t: 'p', x:
            'Cuối cùng, cắt riêng phần oops ra một file — đây là thứ bạn sẽ gửi cho đồng nghiệp hoặc đính vào ' +
            'báo cáo lỗi, và là đầu vào của bước 4. <code>tr -d \'\\r\'</code> bỏ ký tự CR mà cổng nối tiếp thêm ' +
            'vào cuối mỗi dòng:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64\n' +
            'tr -d \'\\r\' < boot.log | sed -n \'/Unable to handle/,/end trace/p\' > oops.txt\n' +
            'wc -l oops.txt' },

          { t: 'code', where: 'out', nocopy: true, code: '46 oops.txt' },

          { t: 'cmdx', cmd: 'sed -n \'/Unable to handle/,/end trace/p\'',
            rows: [
              ['<code>-n</code>', 'Không tự in mọi dòng.', 'Chỉ in những dòng lệnh <code>p</code> chọn'],
              ['<code>/A/,/B/</code>', 'Khoảng dòng: từ dòng đầu tiên khớp A tới dòng kế tiếp khớp B, gồm cả hai.', 'A là dòng đầu mọi oops do lỗi trang; B là dòng cuối mọi oops'],
              ['<code>p</code>', 'In các dòng trong khoảng.', '']
            ] },

          { t: 'p', x:
            '46 dòng, từ <code>Unable to handle</code> tới <code>---[ end trace</code>: đúng một oops trọn vẹn, ' +
            'không lẫn log boot. Với oops do <code>BUG_ON</code> (bước 5) dòng đầu là <code>------------[ cut here ]' +
            '------------</code> — chính kernel in dòng đó để bạn biết cắt từ đâu.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Dịch pc về dòng C, bằng bốn cách',
        blocks: [
          { t: 'p', x:
            'Bắt đầu bằng công cụ ngắn nhất, <code>faddr2line</code>, và cố ý quên <code>CROSS_COMPILE</code> ' +
            'trước để thấy cái bẫy ở phần lý thuyết:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64/buggy\n' +
            '~/bai38/linux-6.18.45/scripts/faddr2line buggy.ko buggy_write+0xb4/0x1cc' },

          { t: 'code', where: 'out', nocopy: true, code:
            'buggy_write+0xb4/0x1cc:\n' +
            'mod_plt_sec at mod_plt_sec/buggy.c:39' },

          { t: 'p', x:
            'Số dòng <code>39</code> đúng, nhưng tên hàm là <code>mod_plt_sec</code> — một tên không có trong ' +
            '<code>buggy.c</code>. Script đã dùng <code>/usr/bin/addr2line</code> của host, bản chỉ hiểu ELF x86 ' +
            '(<code>addr2line --help</code> liệt kê <code>supported targets: elf64-x86-64 …</code>, không có ' +
            '<code>aarch64</code>). Nó vẫn đọc được bảng số dòng, nhưng không áp được relocation ARM64 của ' +
            '<code>.ko</code>, nên gán nhầm tên. Không có cảnh báo nào. Chạy lại với đúng công cụ:' },

          { t: 'code', where: 'wsl', code:
            'CROSS_COMPILE=aarch64-linux-gnu- \\\n' +
            '  ~/bai38/linux-6.18.45/scripts/faddr2line buggy.ko buggy_write+0xb4/0x1cc' },

          { t: 'code', where: 'out', nocopy: true, code:
            'buggy_write+0xb4/0x1cc:\n' +
            'buggy_write at /home/cah8hc/bai64/buggy/buggy.c:39' },

          { t: 'cmdx', cmd: 'CROSS_COMPILE=aarch64-linux-gnu- scripts/faddr2line buggy.ko buggy_write+0xb4/0x1cc',
            rows: [
              ['<code>CROSS_COMPILE=…</code>', 'Biến môi trường chỉ cho lệnh này; script ghép nó trước <code>addr2line</code>, <code>readelf</code>.', 'Bắt buộc khi file là ARM64 còn host là x86-64'],
              ['<code>buggy.ko</code>', 'File chứa hàm. Với hàm của kernel thì đưa <code>vmlinux</code>.', 'Phải là đúng bản build đã chạy'],
              ['<code>buggy_write+0xb4/0x1cc</code>', 'Chép nguyên từ dòng <code>pc</code>.', 'Script so <code>0x1cc</code> với kích thước hàm trong file và báo lỗi nếu lệch — một cách tự kiểm tra rằng bạn đưa đúng bản build']
            ] },

          { t: 'p', x:
            'Giờ tên hàm đúng: <code>buggy_write</code>, dòng 39 — <code>pr_info("sensor 1 reads %d\\n", ' +
            'sensor_value(sensors[1]))</code>. Đó là câu trả lời. Ba cách tiếp theo cho bạn thấy câu trả lời đó ' +
            'đến từ đâu, và cho bạn thêm thông tin mà một số dòng không có.' },

          { t: 'p', x:
            '<b>Cách 2 — <code>addr2line</code> bằng tay.</b> <code>addr2line</code> không hiểu ' +
            '<code>hàm+offset</code>; nó cần một địa chỉ trong file. Trong <code>.ko</code>, hàm ' +
            '<code>buggy_write</code> không bắt đầu ở 0 — hỏi <code>nm</code>:' },

          { t: 'code', where: 'wsl', code: 'aarch64-linux-gnu-nm -S buggy.ko | grep buggy_write' },

          { t: 'code', where: 'out', nocopy: true, code: '0000000000000008 00000000000001cc t buggy_write' },

          { t: 'p', x:
            'Cột 1 là địa chỉ bắt đầu trong section <code>.text</code> (<code>0x8</code>), cột 2 là kích thước ' +
            '(<code>0x1cc</code> — đúng con số sau dấu <code>/</code> trong oops, xác nhận đây là cùng bản build). ' +
            'Vậy lệnh lỗi ở <code>0x8 + 0xb4 = 0xbc</code>:' },

          { t: 'code', where: 'wsl', code: 'aarch64-linux-gnu-addr2line -f -i -e buggy.ko 0xbc' },

          { t: 'code', where: 'out', nocopy: true, code:
            'buggy_write\n' +
            '/home/cah8hc/bai64/buggy/buggy.c:39' },

          { t: 'p', x:
            'Cùng kết quả. Với <code>vmlinux</code> thì không cần cộng tay: <code>System.map</code> cho địa chỉ ' +
            'tuyệt đối của mọi hàm, và nhờ <code>nokaslr</code> địa chỉ đó trùng với lúc chạy. Thử với khung thứ ' +
            'hai của call trace, <code>proc_reg_write+0x9c</code>:' },

          { t: 'code', where: 'wsl', code:
            'K=~/bai38/linux-6.18.45\n' +
            'grep -w proc_reg_write $K/System.map\n' +
            'aarch64-linux-gnu-addr2line -f -i -e $K/vmlinux 0xffff8000803edf0c' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ffff8000803ede70 t proc_reg_write\n' +
            'pde_write\n' +
            '/home/cah8hc/bai38/linux-6.18.45/fs/proc/inode.c:330\n' +
            'proc_reg_write\n' +
            '/home/cah8hc/bai38/linux-6.18.45/fs/proc/inode.c:342' },

          { t: 'p', x:
            '<code>0xffff8000803ede70 + 0x9c = 0xffff8000803edf0c</code>. Kết quả có <b>hai</b> cặp tên–dòng: ' +
            '<code>-i</code> đã mở chuỗi inline. Lệnh gọi hàm của bạn nằm ở <code>fs/proc/inode.c:330</code>, ' +
            'trong hàm <code>pde_write</code> — một hàm nhỏ mà compiler đã chép thẳng vào ' +
            '<code>proc_reg_write</code> (dòng 342). Call trace chỉ in <code>proc_reg_write</code> vì ở mức mã ' +
            'máy, <code>pde_write</code> không còn tồn tại như một hàm riêng. Đây là thông tin mà chỉ debug info ' +
            'đầy đủ của Bài 63 mới cho.' },

          { t: 'p', x:
            '<b>Cách 3 — <code>objdump -dS</code>: lệnh nào trên dòng 39?</b> Một dòng C sinh nhiều lệnh máy; ' +
            'oops nói chính xác lệnh nào. Xem các lệnh từ <code>0xac</code> tới <code>0xc4</code> xen với mã nguồn:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-objdump -d -S --start-address=0xac --stop-address=0xc4 buggy.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'buggy.ko:     file format elf64-littleaarch64\n' +
            '\n' +
            '\n' +
            'Disassembly of section .text:\n' +
            '\n' +
            '00000000000000ac <buggy_write+0xa4>:\n' +
            '\t\treturn -EFAULT;\n' +
            '\tcmd[n] = \'\\0\';\n' +
            '\n' +
            '\tif (sysfs_streq(cmd, "ok"))\n' +
            '\t\tpr_info("sensor 0 reads %d\\n", sensor_value(sensors[0]));\n' +
            '\telse if (sysfs_streq(cmd, "null"))\n' +
            '  ac:\t72001c1f \ttst\tw0, #0xff\n' +
            '  b0:\t540005a0 \tb.eq\t164 <buggy_write+0x15c>  // b.none\n' +
            '\t\tpr_info("sensor 1 reads %d\\n", sensor_value(sensors[1]));\n' +
            '  b4:\t90000000 \tadrp\tx0, 0 <sensor_value.isra.0>\n' +
            '  b8:\tf9400000 \tldr\tx0, [x0]\n' +
            '  bc:\tf9400800 \tldr\tx0, [x0, #16]\n' +
            '  c0:\t97ffffd0 \tbl\t0 <sensor_value.isra.0>' },

          { t: 'cmdx', cmd: 'objdump -d -S --start-address=0xac --stop-address=0xc4 buggy.ko',
            rows: [
              ['<code>-d</code>', 'Dịch ngược các section chứa mã.', ''],
              ['<code>-S</code>', 'Xen dòng C (lấy từ debug info) vào trước các lệnh nó sinh ra.', 'Cần file nguồn còn nằm đúng đường dẫn lúc build'],
              ['<code>--start/stop-address</code>', 'Chỉ in khoảng này.', 'Địa chỉ trong file, tức là đã cộng <code>0x8</code>']
            ] },

          { t: 'p', x:
            'Ba lệnh của dòng 39 kể lại toàn bộ câu chuyện: <code>adrp</code> + <code>ldr x0, [x0]</code> ở ' +
            '<code>0xb4</code>–<code>0xb8</code> nạp <code>sensors[1]</code> vào <code>x0</code> — được ' +
            '<code>NULL</code>. Lệnh ở <code>0xbc</code>, <code>ldr x0, [x0, #16]</code>, đọc ' +
            '<code>s-&gt;reading</code> tại <code>NULL + 16</code> — bẫy. Lệnh <code>bl sensor_value</code> ở ' +
            '<code>0xc0</code> không bao giờ chạy. Đó là vì sao oops chỉ vào <code>buggy_write</code> chứ không ' +
            'phải <code>sensor_value</code>: compiler đã đổi <code>sensor_value</code> thành ' +
            '<code>sensor_value.isra.0</code> (nhận thẳng <code>int *</code>), và việc đọc <code>s-&gt;reading</code> ' +
            'được dời sang phía người gọi. Mã nguồn nói một đằng, mã máy làm một nẻo — chỉ <code>objdump</code> ' +
            'cho bạn thấy.' },

          { t: 'cal', kind: 'info', title: 'pc chỉ vào 0xb4, objdump nói 0xbc — cái nào đúng?',
            x: 'Cả hai, ở hai hệ toạ độ khác nhau. Trong oops, <code>+0xb4</code> tính từ đầu hàm; trong ' +
               '<code>objdump</code>, <code>bc</code> tính từ đầu section <code>.text</code>, mà hàm bắt đầu ở ' +
               '<code>0x8</code>. <code>objdump</code> tự in nhãn <code>&lt;buggy_write+0xa4&gt;</code> ở đầu ' +
               'khối — cộng thêm 0x10 là tới <code>0xb4</code>. Khi các con số "lệch 8", hãy nghĩ tới điều này ' +
               'trước khi nghĩ mình đưa sai file.' },

          { t: 'p', x:
            '<b>Cách 4 — GDB: ngữ cảnh và bố cục struct.</b> <code>gdb-multiarch</code> đọc được ' +
            '<code>.ko</code> mà không cần máy ảo nào chạy. <code>list *(hàm+offset)</code> nhận đúng dạng của ' +
            'oops, còn <code>ptype /o</code> in offset của từng field — để chứng minh <code>0x10</code> là ' +
            '<code>reading</code>:' },

          { t: 'code', where: 'wsl', code:
            'gdb-multiarch -q -batch -ex \'list *(buggy_write+0xb4)\' -ex \'ptype /o struct sensor\' buggy.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0xbc is in buggy_write (buggy.c:39).\n' +
            '34\t\tcmd[n] = \'\\0\';\n' +
            '35\t\n' +
            '36\t\tif (sysfs_streq(cmd, "ok"))\n' +
            '37\t\t\tpr_info("sensor 0 reads %d\\n", sensor_value(sensors[0]));\n' +
            '38\t\telse if (sysfs_streq(cmd, "null"))\n' +
            '39\t\t\tpr_info("sensor 1 reads %d\\n", sensor_value(sensors[1]));\n' +
            '40\t\telse if (sysfs_streq(cmd, "warn"))\n' +
            '41\t\t\tWARN_ON(raw_value > 20000);\n' +
            '42\t\telse if (sysfs_streq(cmd, "bug"))\n' +
            '43\t\t\tBUG_ON(raw_value > 20000);\n' +
            '/* offset    |  size */  type = struct sensor {\n' +
            '/*    0      |     4 */    int id;\n' +
            '/*    4      |     4 */    int flags;\n' +
            '/*    8      |     8 */    const char *label;\n' +
            '/*   16      |     8 */    int *reading;\n' +
            '\n' +
            '                           /* total size (bytes):   24 */\n' +
            '                         }' },

          { t: 'p', x:
            'GDB tự cộng <code>0x8</code> (<code>0xbc is in buggy_write</code>) và in 10 dòng quanh dòng 39. ' +
            '<code>ptype /o</code> chốt lại suy luận: offset <code>16</code> = <code>int *reading</code>. Ghép ' +
            'ba manh mối — địa chỉ lỗi <code>0x10</code>, lệnh <code>ldr x0, [x0, #16]</code>, field ở offset 16 ' +
            '— bạn biết chắc rằng kernel đang đọc <code>-&gt;reading</code> của một <code>struct sensor *</code> ' +
            'bằng <code>NULL</code>. Trong một oops lạ không có mã nguồn đi kèm, đây chính là cách bạn suy ra ' +
            'struct nào và field nào bị hỏng.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Giải mã cả oops một lần: decode_stacktrace.sh',
        blocks: [
          { t: 'p', x:
            'Bước 3 dịch từng dòng một. Khi viết báo cáo lỗi, bạn muốn <b>mọi</b> khung trong call trace có ' +
            'file:dòng, cả trong kernel lẫn trong module. <code>scripts/decode_stacktrace.sh</code> đọc oops từ ' +
            'stdin và làm đúng điều đó. Nó nhận ba tham số: <code>vmlinux</code>, thư mục gốc của mã nguồn kernel ' +
            '(để rút gọn đường dẫn), và thư mục chứa các <code>.ko</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64\n' +
            'K=~/bai38/linux-6.18.45\n' +
            'ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \\\n' +
            '  $K/scripts/decode_stacktrace.sh $K/vmlinux $K ~/bai64/buggy < oops.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    5.354285] pc : buggy_write (/home/cah8hc/bai64/buggy/buggy.c:39) buggy\n' +
            '[    5.354618] lr : buggy_write (/home/cah8hc/bai64/buggy/buggy.c:38) buggy\n' +
            '[    5.354713] sp : ffff800083433cc0\n' +
            '…\n' +
            '[    5.355975] Call trace:\n' +
            '[    5.356128] buggy_write (/home/cah8hc/bai64/buggy/buggy.c:39) buggy (P)\n' +
            '[    5.356255]  proc_reg_write (fs/proc/inode.c:330 fs/proc/inode.c:342)\n' +
            '[    5.356471]  vfs_write (fs/read_write.c:684 fs/read_write.c:666)\n' +
            '[    5.356531]  ksys_write (fs/read_write.c:738)\n' +
            '[    5.356587]  __arm64_sys_write (fs/read_write.c:746)\n' +
            '[    5.356650]  invoke_syscall (./arch/arm64/include/asm/current.h:19 arch/arm64/kernel/syscall.c:54)\n' +
            '[    5.356711]  el0_svc_common.constprop.0 (./include/linux/thread_info.h:135 arch/arm64/kernel/syscall.c:140)\n' +
            '[    5.356783]  do_el0_svc (arch/arm64/kernel/syscall.c:152)\n' +
            '[    5.356837]  el0_svc (./arch/arm64/include/asm/irqflags.h:55 ./arch/arm64/include/asm/irqflags.h:76 arch/arm64/kernel/entry-common.c:104 arch/arm64/kernel/entry-common.c:750)\n' +
            '[    5.356895]  el0t_64_sync_handler (arch/arm64/kernel/entry-common.c:769)\n' +
            '[    5.356961]  el0t_64_sync (arch/arm64/kernel/entry.S:596)\n' +
            '[    5.357143] Code: 72001c1f 540005a0 d0000000 f9424400 (f9400800)\n' +
            'All code\n' +
            '========\n' +
            '   0:\t72001c1f \ttst\tw0, #0xff\n' +
            '   4:\t540005a0 \tb.eq\t0xb8  // b.none\n' +
            '   8:\td0000000 \tadrp\tx0, 0x2000\n' +
            '   c:\tf9424400 \tldr\tx0, [x0, #1160]\n' +
            '  10:*\tf9400800 \tldr\tx0, [x0, #16]\t\t<-- trapping instruction\n' +
            '\n' +
            'Code starting with the faulting instruction\n' +
            '===========================================\n' +
            '   0:\tf9400800 \tldr\tx0, [x0, #16]\n' +
            '[    5.357350] ---[ end trace 0000000000000000 ]---',
            notes: ['Đã lược 15 dòng đầu (lý do, <code>ESR</code>, <code>Modules linked in</code>…) và 11 dòng thanh ghi ở chỗ <code>…</code>: script để nguyên chúng. Lệnh mất khoảng 9 giây trên máy kiểm chứng — gần hết thời gian là <code>addr2line</code> đọc <code>vmlinux</code> 666 MB.'] },

          { t: 'cmdx', cmd: 'ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- decode_stacktrace.sh $K/vmlinux $K ~/bai64/buggy < oops.txt',
            rows: [
              ['<code>ARCH=arm64</code>', 'Cho phần giải mã dòng <code>Code:</code> (script gọi <code>scripts/decodecode</code>) biết đây là mã ARM64.', 'Thiếu nó, năm lệnh chỉ hiện là <code>.word 0xf9400800</code>'],
              ['<code>CROSS_COMPILE=…</code>', 'Dùng <code>aarch64-linux-gnu-addr2line/readelf/nm</code>.', 'Cùng cái bẫy của bước 3'],
              ['<code>$K/vmlinux</code>', 'Debug info cho các hàm của kernel.', 'Phải là đúng bản đã chạy (<code>#6</code> trong dòng <code>CPU:</code>)'],
              ['<code>$K</code>', 'Gốc mã nguồn kernel; bị cắt khỏi đường dẫn in ra.', 'Vì vậy dòng kernel in <code>fs/proc/inode.c</code>, còn dòng module in đường dẫn đầy đủ'],
              ['<code>~/bai64/buggy</code>', 'Nơi tìm <code>buggy.ko</code> khi gặp <code>[buggy]</code>.', 'Bỏ trống thì khung của module không được giải mã'],
              ['<code>&lt; oops.txt</code>', 'Oops đọc từ stdin, giữ nguyên dấu thời gian.', 'File của bước 2']
            ] },

          { t: 'p', x:
            'Ba điều đáng chú ý trong kết quả. Thứ nhất, <code>lr</code> chỉ vào dòng <b>38</b> — lệnh ' +
            '<code>bl sysfs_streq</code> cuối cùng đã chạy là phép so sánh với <code>"null"</code>, nên ' +
            '<code>lr</code> trỏ về ngay sau nó. <code>lr</code> không phải "hàm cha" khi lỗi xảy ra giữa một hàm; ' +
            'nó là "chỗ trả về của lần gọi gần nhất". Thứ hai, khung <code>el0_svc</code> có <b>bốn</b> vị trí: ' +
            'ba hàm inline lồng vào nhau, đúng như <code>addr2line -i</code> đã cho thấy với ' +
            '<code>proc_reg_write</code>. Thứ ba, phần <code>All code</code> là hợp ngữ dịch từ chính dòng ' +
            '<code>Code:</code> — giống hệt <code>objdump</code> ở bước 3 (<code>ldr x0, [x0, #16]</code>), dù ' +
            'script không mở <code>buggy.ko</code> để lấy nó.' },

          { t: 'cal', kind: 'tip', title: 'Khi bạn không có file ELF nào khớp',
            x: 'Dòng <code>Code:</code> tự mang năm lệnh máy, nên ngay cả khi khách hàng chạy một bản build mà ' +
               'bạn không còn giữ <code>vmlinux</code>, <code>ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- ' +
               '~/bai38/linux-6.18.45/scripts/decodecode &lt; oops.txt</code> vẫn cho bạn đúng phần ' +
               '<code>All code</code> ở trên. Cùng với thanh ghi (<code>x0 = 0</code>) và địa chỉ lỗi ' +
               '(<code>0x10</code>), thường thế là đủ để đoán ra "đọc field ở offset 16 của một con trỏ NULL".' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — WARN_ON, BUG_ON, và khi nào oops thành panic',
        blocks: [
          { t: 'p', x:
            'Boot lại máy ảo bằng đúng dòng lệnh của bước 2 (một máy mới, taint về 0). Lần này thử hai macro mà ' +
            'lập trình viên tự đặt vào code, và đọc taint sau mỗi lần:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /buggy.ko\n' +
            'cat /proc/sys/kernel/tainted\n' +
            'echo warn > /proc/buggy\n' +
            'echo "rc=$?"\n' +
            'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4096\n' +
            '[    5.476072] ------------[ cut here ]------------\n' +
            '[    5.476199] WARNING: CPU: 0 PID: 1 at buggy.c:41 buggy_write+0x188/0x1cc [buggy]\n' +
            '[    5.477108] Modules linked in: buggy(O)\n' +
            '[    5.477814] CPU: 0 UID: 0 PID: 1 Comm: sh Tainted: G           O        6.18.45-embedded #6 PREEMPT \n' +
            '[    5.478003] Tainted: [O]=OOT_MODULE\n' +
            '[    5.478064] Hardware name: linux,dummy-virt (DT)\n' +
            '[    5.478219] pstate: 20000005 (nzCv daif -PAN -UAO -TCO -DIT -SSBS BTYPE=--)\n' +
            '[    5.478540] pc : buggy_write+0x188/0x1cc [buggy]\n' +
            '[    5.478628] lr : buggy_write+0x16c/0x1cc [buggy]\n' +
            '…\n' +
            '[    5.480002] x2 : 000000000000000a x1 : 00000000000061a8 x0 : 0000000000004e20\n' +
            '[    5.480229] Call trace:\n' +
            '[    5.480410]  buggy_write+0x188/0x1cc [buggy] (P)\n' +
            '[    5.480530]  proc_reg_write+0x9c/0xf0\n' +
            '…\n' +
            '[    5.481357] ---[ end trace 0000000000000000 ]---\n' +
            'rc=0\n' +
            '4608',
            notes: ['Đã lược 10 dòng thanh ghi và 9 khung cuối của call trace (giống hệt bước 2) ở các chỗ <code>…</code>.'] },

          { t: 'p', x:
            'So với oops ở bước 2: không có dòng <code>Internal error</code>, không có <code>Code:</code>, và ' +
            '<b><code>rc=0</code></b> — lệnh ghi thành công, shell không bị giết. <code>WARNING: … at ' +
            'buggy.c:41</code> đã có sẵn file:dòng (nhờ <code>CONFIG_DEBUG_BUGVERBOSE=y</code>), không cần công cụ ' +
            'nào. Hai thanh ghi cuối là chính phép so sánh: <code>x1 = 0x61a8</code> = 25 000 (<code>raw_value</code>) ' +
            'và <code>x0 = 0x4e20</code> = 20 000 (ngưỡng). Taint từ <code>4096</code> lên <code>4608</code> = ' +
            '4096 + 512: thêm cờ <code>W</code>. Lưu ý <code>PID: 1</code>: cảnh báo xảy ra ngay trong shell chính, ' +
            'và vô hại.' },

          { t: 'p', x: 'Giờ <code>BUG_ON</code> — lại qua <code>sh -c</code>, vì lần này tác vụ sẽ bị giết:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'sh -c "echo bug > /proc/buggy"\n' +
            'echo "rc=$?"\n' +
            'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    8.688830] ------------[ cut here ]------------\n' +
            '[    8.688889] kernel BUG at buggy.c:43!\n' +
            '[    8.689062] Internal error: Oops - BUG: 00000000f2000800 [#1]  SMP\n' +
            '[    8.689595] Modules linked in: buggy(O)\n' +
            '[    8.689742] CPU: 0 UID: 0 PID: 58 Comm: sh Tainted: G        W  O        6.18.45-embedded #6 PREEMPT \n' +
            '[    8.689969] Tainted: [W]=WARN, [O]=OOT_MODULE\n' +
            '…\n' +
            '[    8.690401] pc : buggy_write+0x1bc/0x1cc [buggy]\n' +
            '…\n' +
            '[    8.692583] Code: 5289c400 b9401821 6b00003f 54fff8ad (d4210000) \n' +
            '[    8.692805] ---[ end trace 0000000000000000 ]---\n' +
            '[    8.692952] note: sh[58] exited with irqs disabled\n' +
            '[    8.693106] note: sh[58] exited with preempt_count 1\n' +
            'Segmentation fault\n' +
            '~ # [    8.695143] ------------[ cut here ]------------\n' +
            '[    8.695163] WARNING: CPU: 0 PID: 0 at kernel/context_tracking.c:127 ct_kernel_exit.isra.0.constprop.0+0x98/0xa0\n' +
            '[    8.695395] Modules linked in: buggy(O)\n' +
            '[    8.695474] CPU: 0 UID: 0 PID: 0 Comm: swapper/0 Tainted: G      D W  O        6.18.45-embedded #6 PREEMPT \n' +
            '[    8.695627] Tainted: [D]=DIE, [W]=WARN, [O]=OOT_MODULE\n' +
            '…\n' +
            '[    8.697702] ---[ end trace 0000000000000000 ]---\n' +
            'rc=139\n' +
            '4736',
            notes: [
              'Đã lược thanh ghi và call trace ở các chỗ <code>…</code>. Trong lần chạy kiểm chứng, lệnh <code>warn</code> được gõ hai lần trước <code>bug</code>; dòng <code>Tainted</code> không đổi vì cờ chỉ bật một lần.',
              'Dấu nhắc <code>~ #</code> của shell bị kernel in chen vào giữa — bình thường khi log và shell dùng chung một cổng nối tiếp.'
            ] },

          { t: 'p', x:
            '<code>BUG_ON</code> là oops thật: <code>Internal error: Oops - BUG</code>, tác vụ bị giết, ' +
            '<code>rc=139</code>. <code>ESR = 0xf2000800</code> và lệnh bị bẫy <code>d4210000</code> là ' +
            '<code>brk #0x800</code> — lệnh mà macro <code>BUG()</code> cố ý chèn vào. Dòng <code>Tainted:</code> ' +
            'của oops đã có <code>W</code>: dấu vết của <code>WARN_ON</code> trước đó vẫn còn, đúng như nguyên tắc ' +
            '"taint không tự tắt". Taint cuối: <code>4736</code> = 4096 + 512 + 128 (<code>O</code>, ' +
            '<code>W</code>, <code>D</code>).' },

          { t: 'p', x:
            'Phần đáng giá nhất là bốn dòng sau <code>end trace</code>. Kernel tự báo tác vụ chết khi ' +
            '<b>ngắt đang tắt</b> và <code>preempt_count</code> vẫn là 1 — nó đã rời đi giữa chừng mà không dọn ' +
            'trạng thái. Ngay sau đó tác vụ idle (<code>PID: 0</code>) gặp một <code>WARNING</code> ở ' +
            '<code>kernel/context_tracking.c</code>, một chỗ không liên quan gì tới module của bạn. Đây là bằng ' +
            'chứng cụ thể cho câu "sau oops, kernel không còn đáng tin": một <code>[#2]</code> hoặc một ' +
            'cảnh báo lạ sau oops đầu tiên thường chỉ là hậu quả. Bạn có thể kiểm tra <code>BUG_ON</code> chỉ là ' +
            '<code>if (unlikely(cond)) BUG()</code> bằng <code>grep -n "define BUG_ON" ' +
            '~/bai38/linux-6.18.45/include/asm-generic/bug.h</code>.' },

          { t: 'cal', kind: 'why', title: 'Vì sao code kernel mới gần như không được dùng BUG_ON',
            x: 'Chú thích ngay trên định nghĩa trong <code>bug.h</code> viết: "Don\'t use BUG() or BUG_ON() unless ' +
               'there\'s really no way out". Bạn vừa thấy lý do: <code>WARN_ON</code> báo cùng file:dòng, cùng call ' +
               'trace, mà hệ thống không mất gì; <code>BUG_ON</code> giết tác vụ và có thể để lại kernel nửa hỏng. ' +
               'Một driver gặp dữ liệu sai nên <code>WARN_ON</code> rồi trả <code>-EINVAL</code>, như các driver ' +
               'của Chặng 10 trả mã lỗi từ <code>probe()</code>.' },

          { t: 'p', x:
            '<b>Oops thành panic, cách 1: <code>panic_on_oops</code>.</b> Tắt máy ảo, boot lại với ' +
            '<code>-no-reboot</code> thêm vào dòng QEMU (để QEMU thoát thay vì khởi động lại vô tận), rồi bật ' +
            'chế độ của sản phẩm nhúng lúc chạy. Lần này gõ lệnh ghi thẳng trong shell, không cần ' +
            '<code>sh -c</code> — panic sẽ xảy ra dù tác vụ nào bị giết:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai64\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -no-reboot \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr"' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /buggy.ko\n' +
            'cat /proc/sys/kernel/panic_on_oops /proc/sys/kernel/panic\n' +
            'echo 1 > /proc/sys/kernel/panic_on_oops\n' +
            'echo 3 > /proc/sys/kernel/panic\n' +
            'echo null > /proc/buggy' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0\n' +
            '0\n' +
            '[    7.040171] Unable to handle kernel NULL pointer dereference at virtual address 0000000000000010\n' +
            '…\n' +
            '[    7.044939] CPU: 0 UID: 0 PID: 1 Comm: sh Tainted: G           O        6.18.45-embedded #6 PREEMPT \n' +
            '…\n' +
            '[    7.048497] ---[ end trace 0000000000000000 ]---\n' +
            '[    7.048732] Kernel panic - not syncing: Oops: Fatal exception\n' +
            '[    7.048995] Kernel Offset: disabled\n' +
            '[    7.049114] CPU features: 0x104000,04007800,40004000,0400421b\n' +
            '[    7.049232] Memory Limit: none\n' +
            '[    7.049578] Rebooting in 3 seconds..',
            notes: ['Phần oops ở chỗ <code>…</code> giống bước 2 tới từng offset. Sau dòng cuối, ba giây sau QEMU tự thoát và bạn về dấu nhắc WSL — đó là tác dụng của <code>-no-reboot</code>.'] },

          { t: 'p', x:
            'Hai số <code>0</code> đầu là mặc định của kernel này (khớp <code># CONFIG_PANIC_ON_OOPS is not set</code> ' +
            'và <code>CONFIG_PANIC_TIMEOUT=0</code>). Sau khi đổi, cùng một oops kết thúc bằng ' +
            '<code>Kernel panic - not syncing: Oops: Fatal exception</code> — chuỗi ở dòng 229 của ' +
            '<code>traps.c</code> — và <code>Rebooting in 3 seconds..</code> lấy từ <code>panic=3</code>. ' +
            '<code>Kernel Offset: disabled</code> là KASLR (Bài 63): nếu khác <code>disabled</code>, mọi địa chỉ ' +
            'tuyệt đối trong oops phải trừ đi offset đó trước khi đưa vào <code>addr2line</code>. Trên sản phẩm ' +
            'thật, hai giá trị này đặt cố định bằng <code>oops=panic panic=3</code> trên dòng lệnh kernel.' },

          { t: 'p', x:
            '<b>Oops thành panic, cách 2: tác vụ bị giết là PID 1.</b> Boot lại một lần nữa (vẫn ' +
            '<code>-no-reboot</code>, <code>panic</code> giữ mặc định 0), và lần này không đổi gì, chỉ gõ thẳng ' +
            'trong shell chính:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /buggy.ko\n' +
            'echo $$\n' +
            'echo null > /proc/buggy' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1\n' +
            '[    5.380057] Unable to handle kernel NULL pointer dereference at virtual address 0000000000000010\n' +
            '…\n' +
            '[    5.385918] CPU: 0 UID: 0 PID: 1 Comm: sh Tainted: G           O        6.18.45-embedded #6 PREEMPT \n' +
            '…\n' +
            '[    5.389527] ---[ end trace 0000000000000000 ]---\n' +
            '[    5.389911] Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b\n' +
            '[    5.390216] Kernel Offset: disabled\n' +
            '[    5.390278] CPU features: 0x104000,04007800,40004000,0400421b\n' +
            '[    5.390379] Memory Limit: none\n' +
            '[    5.390623] ---[ end Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b ]---',
            notes: ['Với <code>panic=0</code>, máy ảo đứng yên mãi ở dòng cuối. Thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'] },

          { t: 'p', x:
            '<code>echo $$</code> in <code>1</code>: shell này là PID 1 (script <code>/init</code> của Bài 32 ' +
            '<code>exec /bin/sh</code>). Oops vẫn là oops — <code>panic_on_oops</code> đang là 0 — nhưng tác vụ ' +
            'cần giết là init, và luật Bài 49 đã đọc trong <code>kernel/exit.c</code> biến nó thành panic. ' +
            '<code>exitcode=0x0000000b</code> = 11 = <code>SIGSEGV</code>, cùng tín hiệu đã cho <code>rc=139</code> ' +
            'ở bước 2. Lưu ý thông điệp khác hẳn cách 1: đọc dòng <code>Kernel panic</code> là biết ngay lý do.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — git bisect run: tìm commit gây hồi quy',
        blocks: [
          { t: 'p', x:
            'Tình huống: một module cảm biến chạy tốt ở commit đầu tiên, nhưng bản mới nhất oops ngay lần ghi ' +
            'đầu tiên. Có 7 commit ở giữa, mỗi cái đều trông vô hại. Script dưới đây dựng đúng lịch sử đó trong ' +
            '<code>~/bai64/regress</code> — 8 commit, một trong số chúng gây lỗi. Đừng đọc kỹ các lệnh ' +
            '<code>sed</code>; việc của bạn là để <code>git bisect</code> tìm ra commit nào.' },

          { t: 'code', where: 'file', name: '~/bai64/history.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# history.sh - build a small git history with one regression hidden in it\n' +
            'set -e\n' +
            'mkdir -p ~/bai64/regress && cd ~/bai64/regress\n' +
            'git init -q\n' +
            'git config user.name  "Learner"\n' +
            'git config user.email "learner@example.com"\n' +
            'cp ~/bai64/buggy/Makefile . && sed -i \'s/buggy.o/regress.o/\' Makefile\n' +
            '\n' +
            'commit() { git add -A && git commit -q -m "$1"; }\n' +
            '\n' +
            'cat > regress.c <<\'EOF\'\n' +
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/proc_fs.h>\n' +
            '#include <linux/slab.h>\n' +
            '\n' +
            'struct sensor {\n' +
            '\tconst char *label;\n' +
            '\tint *reading;\n' +
            '};\n' +
            '\n' +
            'static int raw_value = 25000;\n' +
            'static struct sensor *sensors[1];\n' +
            '\n' +
            'static ssize_t regress_write(struct file *file, const char __user *ubuf,\n' +
            '\t\t\t     size_t len, loff_t *off)\n' +
            '{\n' +
            '\tstruct sensor *s = sensors[0];\n' +
            '\n' +
            '\tpr_info("regress: reads %d\\n", *s->reading);\n' +
            '\treturn len;\n' +
            '}\n' +
            '\n' +
            'static const struct proc_ops regress_ops = {\n' +
            '\t.proc_write = regress_write,\n' +
            '};\n' +
            '\n' +
            'static int __init regress_init(void)\n' +
            '{\n' +
            '\tsensors[0] = kzalloc(sizeof(*sensors[0]), GFP_KERNEL);\n' +
            '\tif (!sensors[0])\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tsensors[0]->label = "board";\n' +
            '\tsensors[0]->reading = &raw_value;\n' +
            '\tproc_create("regress", 0200, NULL, &regress_ops);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit regress_exit(void)\n' +
            '{\n' +
            '\tremove_proc_entry("regress", NULL);\n' +
            '\tkfree(sensors[0]);\n' +
            '}\n' +
            '\n' +
            'module_init(regress_init);\n' +
            'module_exit(regress_exit);\n' +
            'MODULE_LICENSE("GPL");\n' +
            'EOF\n' +
            'commit "Add regress module with /proc/regress"\n' +
            '\n' +
            'sed -i \'s/"regress: reads %d\\\\n", \\*s->reading/"regress: %s reads %d\\\\n", s->label, *s->reading/\' regress.c\n' +
            'commit "Print the sensor label"\n' +
            '\n' +
            'echo \'MODULE_DESCRIPTION("Sensor demo for git bisect");\' >> regress.c\n' +
            'commit "Add MODULE_DESCRIPTION"\n' +
            '\n' +
            'sed -i \'s/sensors\\[1\\];/sensors[2];/\' regress.c\n' +
            'commit "Reserve a second sensor slot"\n' +
            '\n' +
            'sed -i \'s/^static int raw_value = 25000;/&\\nstatic int active = 1;\\nmodule_param(active, int, 0444);/\' regress.c\n' +
            'sed -i \'s/struct sensor \\*s = sensors\\[0\\];/struct sensor *s = sensors[active];/\' regress.c\n' +
            'commit "Select the active sensor with a module parameter"\n' +
            '\n' +
            'sed -i \'s/pr_info("regress:/pr_info_ratelimited("regress:/\' regress.c\n' +
            'commit "Rate-limit the read message"\n' +
            '\n' +
            'sed -i \'s/0200, NULL/0220, NULL/\' regress.c\n' +
            'commit "Let the group write /proc/regress"\n' +
            '\n' +
            'sed -i \'1a /* regress.c - one sensor, read through /proc/regress */\' regress.c\n' +
            'commit "Add a file header comment"\n' +
            '\n' +
            'git log --oneline\n',
            notes: ['Tạo file bằng trình soạn thảo (không dán qua một heredoc khác), vì script chứa sẵn một heredoc và nhiều dấu <code>\\</code>.'] },

          { t: 'code', where: 'wsl', code: 'sh ~/bai64/history.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bc221a6 Add a file header comment\n' +
            '34fefa2 Let the group write /proc/regress\n' +
            'e953fe2 Rate-limit the read message\n' +
            '051d0cc Select the active sensor with a module parameter\n' +
            'de0dfa4 Reserve a second sensor slot\n' +
            'a88d001 Add MODULE_DESCRIPTION\n' +
            'acec9eb Print the sensor label\n' +
            'cf1b6ad Add regress module with /proc/regress',
            notes: ['Mã băm commit phụ thuộc vào thời điểm tạo, nên <b>sẽ khác hoàn toàn</b> trên máy bạn. Thứ tự và tiêu đề commit thì giống hệt. Mọi lệnh bên dưới không gõ mã băm nào bằng tay.'] },

          { t: 'p', x:
            '8 commit, dòng trên cùng là <code>HEAD</code>, dòng dưới cùng là commit gốc. Tiếp theo là phần ' +
            'quan trọng nhất của mọi lần bisect: <b>script kiểm thử</b>. Nó build module, đóng một initramfs ' +
            'tạm, boot QEMU, ghi vào <code>/proc/regress</code>, rồi đọc log để trả lời theo quy ước mã thoát ' +
            'ở phần lý thuyết:' },

          { t: 'code', where: 'file', name: '~/bai64/test.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# test.sh - exit 0 if this commit is good, 1 if it oopses, 125 if it does not build\n' +
            'cd ~/bai64/regress\n' +
            'make -s >/dev/null 2>&1 || exit 125\n' +
            '\n' +
            'rm -rf /tmp/rfs && cp -a ~/bai32/initramfs /tmp/rfs\n' +
            'cp regress.ko /tmp/rfs/\n' +
            '(cd /tmp/rfs && find . | cpio -o -H newc 2>/dev/null | gzip > /tmp/rfs.cpio.gz)\n' +
            '\n' +
            '{ sleep 4; echo \'insmod /regress.ko\'; sleep 1\n' +
            '  echo \'sh -c "echo x > /proc/regress"\'; sleep 1\n' +
            '  echo \'poweroff -f\'; sleep 2; } |\n' +
            'timeout 30 qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd /tmp/rfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr" > /tmp/boot.log 2>&1\n' +
            '\n' +
            'grep -q \'Unable to handle kernel\' /tmp/boot.log && exit 1\n' +
            'grep -q \'reads 25000\' /tmp/boot.log && exit 0\n' +
            'exit 125\n' },

          { t: 'cmdx', cmd: 'test.sh — các quyết định thiết kế',
            rows: [
              ['<code>make … || exit 125</code>', 'Commit không build được → "bỏ qua", không phải "xấu".', 'Phần lý thuyết "Vì sao mã 125 quan trọng"'],
              ['<code>{ sleep 4; echo …; } | qemu…</code>', 'Gõ lệnh hộ vào cổng nối tiếp: chờ boot ~4 s, rồi gửi từng lệnh.', 'Không cần người ngồi trước máy ảo'],
              ['<code>sh -c "echo x &gt; …"</code>', 'Ghi trong shell con, để oops giết shell con chứ không phải PID 1.', 'Bước 5: oops trong PID 1 là panic, script sẽ phải đợi <code>timeout</code>'],
              ['<code>timeout 30</code>', 'Nếu máy ảo treo vì lý do khác, giết nó sau 30 s.', 'Khi đó log không có cả hai chuỗi → <code>125</code>'],
              ['Hai <code>grep</code>', 'Chỉ kết luận khi thấy bằng chứng rõ ràng: oops → 1, kết quả đúng → 0.', 'Mọi trường hợp lạ khác → 125']
            ] },

          { t: 'p', x:
            'Trước khi giao script cho Git, thử nó bằng tay trên hai đầu — một script trả lời sai ở hai đầu sẽ ' +
            'dẫn bisect tới một kết luận sai mà trông vẫn rất chắc chắn:' },

          { t: 'code', where: 'wsl', code:
            'chmod +x ~/bai64/test.sh\n' +
            'cd ~/bai64/regress\n' +
            '~/bai64/test.sh; echo "rc=$?"\n' +
            'grep -a -E \'Unable to handle|pc :\' /tmp/boot.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=1\n' +
            '[    4.877785] Unable to handle kernel NULL pointer dereference at virtual address 0000000000000000\n' +
            '[    4.881510] pc : regress_write+0x54/0x7c [regress]' },

          { t: 'p', x:
            '<code>HEAD</code> là xấu (<code>rc=1</code>), và oops là thật. Chú ý địa chỉ lỗi lần này là ' +
            '<code>0x0</code>, không phải <code>0x10</code>: ở <code>HEAD</code>, field đầu tiên được đọc là ' +
            '<code>s-&gt;label</code>, nằm ở offset 0 của struct hai field này. Cùng một con trỏ ' +
            '<code>NULL</code>, field khác, địa chỉ khác — đúng phép suy luận của bước 3. Giờ thử commit gốc:' },

          { t: 'code', where: 'wsl', code:
            'git checkout -q $(git rev-list --max-parents=0 HEAD)\n' +
            '~/bai64/test.sh; echo "rc=$?"\n' +
            'grep -a \'regress:\' /tmp/boot.log\n' +
            'git checkout -q master' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '[    3.905795] regress: loading out-of-tree module taints kernel.\n' +
            '[    4.898567] regress: reads 25000' },

          { t: 'p', x:
            'Commit gốc là tốt (<code>rc=0</code>, <code>reads 25000</code>). <code>git rev-list ' +
            '--max-parents=0 HEAD</code> in mã băm của commit không có cha — commit gốc — để bạn không phải chép ' +
            'mã băm bằng tay. Hai đầu đã chắc chắn; giao phần còn lại cho Git:' },

          { t: 'code', where: 'wsl', code:
            'git bisect start HEAD $(git rev-list --max-parents=0 HEAD)\n' +
            'time git bisect run ~/bai64/test.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Bisecting: 3 revisions left to test after this (roughly 2 steps)\n' +
            '[de0dfa4cc8a701cc49c9e366852409f511120e92] Reserve a second sensor slot\n' +
            '\n' +
            'Bisecting: 1 revision left to test after this (roughly 1 step)\n' +
            '[e953fe24f82e28bf274dfb0b67a584a6d7ebb299] Rate-limit the read message\n' +
            '\n' +
            'Bisecting: 0 revisions left to test after this (roughly 0 steps)\n' +
            '[051d0ccc1747e0b0e99bbc226659b04d7f472b2e] Select the active sensor with a module parameter\n' +
            '\n' +
            '051d0ccc1747e0b0e99bbc226659b04d7f472b2e is the first bad commit\n' +
            'commit 051d0ccc1747e0b0e99bbc226659b04d7f472b2e\n' +
            'Author: Learner <learner@example.com>\n' +
            'Date:   Sat Oct 31 16:59:35 2026 +0700\n' +
            '\n' +
            '    Select the active sensor with a module parameter\n' +
            '\n' +
            ' regress.c | 4 +++-\n' +
            ' 1 file changed, 3 insertions(+), 1 deletion(-)\n' +
            '\n' +
            'real\t0m26.947s\n' +
            'user\t0m4.605s\n' +
            'sys\t0m0.563s',
            notes: [
              'Mã băm và ngày sẽ khác trên máy bạn; ba commit được thử và commit kết luận thì giống.',
              'Trên máy kiểm chứng, mỗi dòng của <code>git bisect</code> còn kèm các cảnh báo <code>envsubst: not found</code> / <code>gettext: not found</code> (máy thiếu gói <code>gettext-base</code>; Git chỉ dùng chúng để dịch thông báo) và <code>hint: … hook was ignored</code> (một cấu hình hook riêng của máy đó). Cả hai vô hại và đã được lọc khỏi bản ghi.'
            ] },

          { t: 'cmdx', cmd: 'git bisect start HEAD $(git rev-list --max-parents=0 HEAD) ; git bisect run ~/bai64/test.sh',
            rows: [
              ['<code>start BAD GOOD</code>', 'Đối số đầu là commit xấu, các đối số sau là commit tốt.', 'Thứ tự ngược sẽ tìm "commit đầu tiên sửa lỗi"'],
              ['<code>run SCRIPT</code>', 'Với mỗi commit Git checkout, chạy script và đọc mã thoát.', 'Script phải chạy được từ bất kỳ commit nào — vì thế nó nằm <b>ngoài</b> repo'],
              ['<code>time</code>', 'Đo cả quá trình.', '']
            ] },

          { t: 'p', x:
            'Git chỉ build và boot <b>3</b> lần cho 7 commit chưa biết: <code>de0dfa4</code> tốt → lỗi nằm phía ' +
            'trên; <code>e953fe2</code> xấu → lỗi ở <code>e953fe2</code> hoặc trước đó; <code>051d0cc</code> xấu, ' +
            'và commit ngay dưới nó (<code>de0dfa4</code>) đã biết là tốt → <code>051d0cc</code> là commit đầu ' +
            'tiên xấu. Tổng cộng 27 giây, khoảng 9 giây mỗi lần thử, không một lần gõ <code>good</code>/' +
            '<code>bad</code> nào. Xem commit đó đổi gì:' },

          { t: 'code', where: 'wsl', code: 'git show --format= refs/bisect/bad' },

          { t: 'code', where: 'out', nocopy: true, code:
            'diff --git a/regress.c b/regress.c\n' +
            'index 4221976..314c381 100644\n' +
            '--- a/regress.c\n' +
            '+++ b/regress.c\n' +
            '@@ -9,12 +9,14 @@ struct sensor {\n' +
            ' };\n' +
            ' \n' +
            ' static int raw_value = 25000;\n' +
            '+static int active = 1;\n' +
            '+module_param(active, int, 0444);\n' +
            ' static struct sensor *sensors[2];\n' +
            ' \n' +
            ' static ssize_t regress_write(struct file *file, const char __user *ubuf,\n' +
            ' \t\t\t     size_t len, loff_t *off)\n' +
            ' {\n' +
            '-\tstruct sensor *s = sensors[0];\n' +
            '+\tstruct sensor *s = sensors[active];\n' +
            ' \n' +
            ' \tpr_info("regress: %s reads %d\\n", s->label, *s->reading);\n' +
            ' \treturn len;',
            notes: ['<code>refs/bisect/bad</code> là tên Git đặt cho commit xấu nhất đã biết — sau <code>bisect run</code> nó chính là commit kết luận, nên lệnh không cần mã băm.'] },

          { t: 'p', x:
            'Lỗi lộ ra ngay: <code>active</code> mặc định là <code>1</code>, nhưng chỉ <code>sensors[0]</code> ' +
            'được cấp phát. Commit <code>de0dfa4</code> ("Reserve a second sensor slot") trước đó tạo ' +
            '<code>sensors[1]</code> nhưng để nó <code>NULL</code> — tự nó vô hại, nên bisect đánh dấu nó tốt. ' +
            'Đó là điển hình của hồi quy: dòng oops chỉ vào (<code>*s-&gt;reading</code>) không hề đổi qua 8 ' +
            'commit; thứ đổi là giá trị chảy vào nó. Kết thúc phiên bisect để Git đưa repo về nhánh chính:' },

          { t: 'code', where: 'wsl', code:
            'git bisect reset\n' +
            'git log --oneline -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Previous HEAD position was 051d0cc Select the active sensor with a module parameter\n' +
            'Switched to branch \'master\'\n' +
            'bc221a6 Add a file header comment' },

          { t: 'p', x:
            'Repo về lại <code>HEAD</code> ban đầu (<code>bc221a6</code>). Với kernel thật, quy trình y hệt, chỉ ' +
            'khác script: build <code>Image</code> thay vì một <code>.ko</code>, và mỗi lần thử mất vài phút thay ' +
            'vì 9 giây — đó là lý do khoảng 14 lần thử cho 15 000 commit vẫn là một buổi chiều chứ không phải ' +
            'một tháng. Nhánh mặc định có thể tên <code>main</code> thay vì <code>master</code> tuỳ cấu hình ' +
            'Git của bạn; <code>git bisect reset</code> tự biết quay về đâu.' },

          { t: 'cal', kind: 'info', title: 'Dọn dẹp',
            x: '<code>~/bai64</code> (~6 MB: <code>buggy/</code>, <code>regress/</code>, <code>initramfs/</code>, ' +
               '<code>oops.txt</code>, <code>boot.log</code>, hai script) không bài nào sau dùng tới — xoá tuỳ ý. ' +
               '<code>test.sh</code> có để lại <code>/tmp/rfs</code>, <code>/tmp/rfs.cpio.gz</code> và ' +
               '<code>/tmp/boot.log</code>; chúng mất khi WSL tắt. Bài này không ghi gì vào <code>~/bai38</code>; ' +
               'giữ nguyên cây đó và <code>~/.gdbinit</code> cho Bài 65.' }
        ] }

    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>faddr2line</code> in <code>mod_plt_sec at mod_plt_sec/buggy.c:39</code> — số dòng đúng, tên hàm lạ',
         'Thiếu <code>CROSS_COMPILE</code>: script dùng <code>addr2line</code> x86-64 của host, không áp được relocation ARM64 của <code>.ko</code>.',
         'Chạy lại với <code>CROSS_COMPILE=aarch64-linux-gnu-</code> (bước 3). Cùng lý do với <code>decode_stacktrace.sh</code>.'],
        ['Phần <code>All code</code> chỉ toàn <code>.word 0xf9400800</code>',
         '<code>decode_stacktrace.sh</code> không biết kiến trúc để dịch ngược dòng <code>Code:</code>.',
         'Thêm <code>ARCH=arm64</code> trước lệnh (bước 4).'],
        ['<code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b</code> ngay sau oops',
         'Lệnh ghi chạy trong shell PID 1 của initramfs; oops giết PID 1 (bước 5).',
         'Gây lỗi trong <code>sh -c "…"</code> để tác vụ bị giết là shell con.'],
        ['<code>sh: write error: Invalid argument</code> khi ghi vào <code>/proc/buggy</code>',
         'Từ ghi vào không phải một trong <code>ok</code>/<code>null</code>/<code>warn</code>/<code>bug</code>; hàm trả <code>-EINVAL</code>.',
         'Kiểm tra chính tả. <code>sysfs_streq</code> bỏ qua ký tự xuống dòng cuối mà <code>echo</code> thêm vào.'],
        ['<code>addr2line</code> trả <code>??:0</code> hoặc một dòng vô lý',
         'Đưa địa chỉ tương đối của oops (<code>0xb4</code>) thẳng vào <code>addr2line</code>, quên cộng địa chỉ bắt đầu của hàm; hoặc dùng <code>.ko</code>/<code>vmlinux</code> của một bản build khác.',
         'Lấy địa chỉ hàm bằng <code>nm -S</code> (hoặc <code>System.map</code>), cộng offset. Kích thước trong <code>nm -S</code> phải bằng số sau <code>/</code> trong oops.'],
        ['Địa chỉ trong oops là <code>0xffffb…</code>, <code>System.map</code> nói <code>0xffff8000…</code>',
         'KASLR đang bật: dòng <code>Kernel Offset:</code> ở cuối panic không phải <code>disabled</code>.',
         'Dùng dạng <code>hàm+offset</code> (không phụ thuộc KASLR) với <code>faddr2line</code>, hoặc trừ <code>Kernel Offset</code> khỏi địa chỉ tuyệt đối.'],
        ['<code>git bisect run</code> kết luận một commit chỉ sửa chú thích hoặc làm hỏng build',
         'Script trả <code>1</code> cho mọi thất bại, kể cả build lỗi hoặc máy ảo treo.',
         'Trả <code>125</code> khi không kết luận được; chỉ trả <code>1</code> khi thấy đúng dấu hiệu lỗi (<code>Unable to handle kernel</code>).'],
        ['<code>envsubst: not found</code>, <code>gettext: not found</code> trên mỗi dòng của <code>git bisect</code>',
         'Thiếu gói <code>gettext-base</code>; <code>git-sh-setup</code> dùng chúng để dịch thông báo.',
         'Vô hại — kết quả bisect vẫn đúng. Muốn tắt: <code>sudo apt-get install gettext-base</code>.']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<b>Oops</b> = kernel giết tác vụ đang chạy mã lỗi, đặt taint <b><code>D</code></b> (128), rồi chạy tiếp; shell thấy <code>Segmentation fault</code>, <b><code>rc=139</code></b>. <b>Panic</b> = dừng hẳn. <code>WARN_ON</code> chỉ báo (taint <b><code>W</code></b>, 512); <code>BUG_ON</code> là một oops cố ý (<code>brk</code>).',
      'Oops thành panic khi: trong ngắt, <b><code>panic_on_oops=1</code></b> (<code>Oops: Fatal exception</code>), hoặc tác vụ là <b>PID 1</b> (<code>Attempted to kill init! exitcode=0x0000000b</code>). <code>panic=3</code> cho <code>Rebooting in 3 seconds..</code>.',
      'Đọc oops theo thứ tự: <b>dòng đầu</b> (loại lỗi, địa chỉ bị truy cập <code>0x10</code>) → <code>ESR</code> (<code>WnR = 0</code> = đọc) → <code>Tainted</code> → <b><code>pc : buggy_write+0xb4/0x1cc [buggy]</code></b> → thanh ghi (<code>x0 = 0</code>) → <code>Call trace</code> (đọc từ dưới lên) → <code>Code:</code>.',
      '<code>hàm+offset/size</code> không phụ thuộc nơi module được nạp hay KASLR. Dịch nó cần đúng <code>.ko</code>/<code>vmlinux</code> <b>còn debug info</b> của chính bản build đó.',
      '<b><code>CROSS_COMPILE=aarch64-linux-gnu- faddr2line</code></b> → <code>buggy.c:39</code>. Thiếu biến đó, <code>addr2line</code> của host vẫn cho dòng 39 nhưng tên hàm <b>sai</b> (<code>mod_plt_sec</code>), không cảnh báo.',
      '<code>addr2line</code> cần địa chỉ tuyệt đối trong file: <code>nm -S</code> cho <code>0x8</code> + <code>0xb4</code> = <b><code>0xbc</code></b>. <code>-i</code> mở chuỗi inline (<code>pde_write</code> trong <code>proc_reg_write</code>). <code>objdump -dS</code> chỉ đúng lệnh bẫy: <b><code>ldr x0, [x0, #16]</code></b>; <code>ptype /o</code>: offset 16 = <code>reading</code>.',
      '<b><code>ARCH=arm64 CROSS_COMPILE=… decode_stacktrace.sh vmlinux SRC MODDIR &lt; oops.txt</code></b> gắn file:dòng vào mọi khung và dịch ngược dòng <code>Code:</code> (~9 s với <code>vmlinux</code> 666 MB).',
      '<b><code>git bisect run</code></b> với script trả <b>0 / 1 / 125</b>: 3 lần build-boot cho 7 commit, <b>27 giây</b>, tìm ra <code>051d0cc</code> — commit đổi giá trị chảy vào dòng lỗi, không phải commit chứa dòng lỗi.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Oops trả lời "kernel chết ở đâu". Nhiều lỗi khó hơn không bao giờ sinh oops: driver chạy đúng nhưng ' +
         'chậm, một ngắt đến trễ, <code>probe()</code> mất 300 ms mà không ai biết vì sao. Bài 53 đã cho thấy ' +
         'chỉ riêng <code>-DDEBUG</code> làm một <code>ioctl</code> chậm 50 lần — <code>printk</code> không phải ' +
         'công cụ đo. <b>Bài 65 — Ftrace và các công cụ theo vết</b> bật dynamic debug cho đúng một hàm lúc ' +
         'chạy, dùng <code>function_graph</code> để thấy toàn bộ cây hàm mà một lệnh <code>write()</code> đi qua ' +
         'kèm thời gian từng hàm, và đo thời gian thực thi trong kernel tới từng micro giây mà không thêm một ' +
         'dòng code nào.' }
  ],

  quiz: [
    { q: 'Một bo mạch gửi về oops có dòng đầu <code>Unable to handle kernel NULL pointer dereference at virtual address 0000000000000018</code>, <code>WnR = 1</code>, và <code>pc : mydrv_irq+0x40/0x120 [mydrv]</code>. Kết luận nào chắc chắn nhất từ riêng ba dòng này?',
      opts: [
        'Hàm <code>mydrv_irq</code> đang <b>ghi</b> vào field ở offset 24 của một con trỏ struct đang là <code>NULL</code>',
        'Hàm <code>mydrv_irq</code> đang đọc địa chỉ 0x18 trong bộ nhớ của thiết bị',
        'Lỗi nằm trong hàm gọi <code>mydrv_irq</code>, vì <code>pc</code> luôn chỉ vào hàm cha',
        'Kernel thiếu bộ nhớ'
      ],
      a: 0,
      why: 'Địa chỉ nhỏ hơn một trang được kernel gọi là <code>NULL pointer dereference</code>: con trỏ là <code>NULL</code>, phần cộng thêm (<code>0x18</code> = 24) là offset của field. <code>WnR = 1</code> nghĩa là truy cập <b>ghi</b> (ở bước 2 là <code>WnR = 0</code>, đọc). <code>pc</code> là chính lệnh gây lỗi, không phải hàm cha — đó là việc của call trace. Bước tiếp theo: <code>faddr2line</code> ra dòng, <code>ptype /o</code> tìm struct nào có field ở offset 24.' },

    { q: 'Sau khi gây lỗi, <code>cat /proc/sys/kernel/tainted</code> in <code>4736</code>. Những gì đã xảy ra từ lúc boot?',
      opts: [
        'Chỉ một oops',
        'Đã nạp một module ngoài cây (4096), đã có ít nhất một <code>WARN</code> (512) và ít nhất một oops (128)',
        'Ba oops liên tiếp',
        'Kernel đã panic và tự khởi động lại'
      ],
      a: 1,
      why: '4736 = 4096 + 512 + 128 = bit 12 (<code>O</code>) + bit 9 (<code>W</code>) + bit 7 (<code>D</code>) — đúng chuỗi ở bước 5: <code>insmod</code> → <code>warn</code> → <code>bug</code>. Taint là tập cờ, không phải bộ đếm: hai lần <code>WARN_ON</code> vẫn chỉ cộng 512 một lần. Nếu kernel đã khởi động lại, mọi cờ về 0. Không cần thuộc bảng — dòng <code>Tainted: [D]=DIE, [W]=WARN, [O]=OOT_MODULE</code> trong chính báo cáo đã giải mã sẵn.' },

    { q: 'Bạn chạy <code>scripts/faddr2line buggy.ko buggy_write+0xb4/0x1cc</code> và nhận <code>mod_plt_sec at mod_plt_sec/buggy.c:39</code>. Nguyên nhân có khả năng nhất?',
      opts: [
        '<code>buggy.ko</code> không có debug info',
        'Lỗi thật sự nằm trong hàm <code>mod_plt_sec</code> của kernel',
        'Script dùng <code>addr2line</code> x86-64 của host vì thiếu <code>CROSS_COMPILE=aarch64-linux-gnu-</code>; nó đọc được số dòng nhưng không áp được relocation ARM64 nên gán nhầm tên hàm',
        'Offset <code>0xb4</code> sai vì KASLR'
      ],
      a: 2,
      why: 'Không có debug info thì sẽ không có cả số dòng 39. Bảng số dòng DWARF độc lập với kiến trúc nên <code>addr2line</code> của host vẫn đọc được, nhưng tên hàm trong một <code>.ko</code> phụ thuộc relocation — thứ chỉ bản <code>aarch64-linux-gnu-</code> hiểu (<code>addr2line --help</code> của host không liệt kê <code>aarch64</code>). Dạng <code>hàm+offset</code> không bị KASLR ảnh hưởng. Đây là cùng lỗi "nhầm host với target" của Chặng 04, và nguy hiểm vì không có cảnh báo nào.' },

    { q: 'Trên một sản phẩm không người trông, đội của bạn muốn mọi oops dẫn tới khởi động lại sạch sau 5 giây thay vì để kernel chạy tiếp. Cấu hình nào đúng?',
      opts: [
        '<code>panic=5</code> là đủ',
        '<code>oops=panic panic=5</code> trên dòng lệnh kernel (hoặc <code>panic_on_oops=1</code> và <code>panic=5</code> qua <code>/proc/sys/kernel/</code>)',
        'Thay mọi <code>WARN_ON</code> bằng <code>BUG_ON</code>',
        '<code>nokaslr</code>'
      ],
      a: 1,
      why: 'Cần cả hai nửa: <code>panic_on_oops</code> biến oops thành panic (bước 5: <code>Oops: Fatal exception</code>), và <code>panic=N</code> cho panic tự khởi động lại sau N giây (<code>Rebooting in 3 seconds..</code> với <code>panic=3</code>). Chỉ <code>panic=5</code> thì một oops thường vẫn chỉ giết một tác vụ và kernel chạy tiếp ở trạng thái không đáng tin. Đổi <code>WARN_ON</code> thành <code>BUG_ON</code> làm hệ thống mong manh hơn mà không giải quyết gì.' },

    { q: 'Script kiểm thử cho <code>git bisect run</code> nên trả gì khi commit đang thử <b>không build được</b>?',
      opts: [
        '<code>0</code>, vì không có oops nào',
        '<code>1</code>, vì commit đó có vấn đề',
        '<code>125</code>, để Git bỏ qua commit này và thử commit bên cạnh',
        '<code>255</code>'
      ],
      a: 2,
      why: '<code>0</code> và <code>1</code> là kết luận "tốt"/"xấu" về <b>đúng lỗi đang tìm</b>. Commit không build được không cho bạn biết gì về oops; trả <code>1</code> sẽ kéo bisect về commit làm hỏng build, trả <code>0</code> có thể bỏ sót commit gây lỗi. <code>125</code> là mã riêng cho "không kết luận được". Mã từ 128 trở lên làm <code>git bisect run</code> dừng hẳn. <code>test.sh</code> ở bước 6 trả 125 cho cả build lỗi lẫn máy ảo treo.' },

    { q: 'Ở bước 6, oops ở <code>HEAD</code> chỉ vào dòng <code>*s-&gt;reading</code>, một dòng không đổi suốt 8 commit. Vì sao <code>git bisect</code> vẫn hữu ích dù bạn đã biết dòng lỗi?',
      opts: [
        'Vì <code>faddr2line</code> có thể sai',
        'Vì dòng lỗi chỉ là nơi hậu quả lộ ra; bisect tìm thay đổi đã đưa giá trị sai vào nó (<code>active = 1</code> trỏ vào <code>sensors[1]</code> chưa cấp phát), tức là thứ cần sửa',
        'Vì <code>git bisect</code> tự sửa lỗi',
        'Không hữu ích; đã biết dòng lỗi thì không cần bisect'
      ],
      a: 1,
      why: 'Sửa ở dòng lỗi (thêm kiểm tra <code>NULL</code>) che triệu chứng nhưng giữ nguyên thiết kế sai. <code>git show</code> commit mà bisect tìm ra (<code>051d0cc</code>) cho thấy ngay ý định của người viết và chỗ đúng để sửa: mặc định <code>active = 0</code>, hoặc kiểm tra <code>active</code> với số cảm biến đã cấp phát. Commit trước đó (<code>de0dfa4</code>) tạo slot <code>NULL</code> nhưng tự nó vô hại — bisect phân biệt được hai điều đó bằng thực nghiệm, không cần đoán.' }
  ]
});

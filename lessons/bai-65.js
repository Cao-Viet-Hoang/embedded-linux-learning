/* Bài 65 — Ftrace và các công cụ theo vết
   Chặng 12 — Debug, đo đạc, tối ưu
   Đo giá thật của printk / pr_debug / trace_printk bằng một module 98 dòng (tdemo.ko), bật dynamic debug
   lúc chạy, rồi dùng ftrace (function, function_graph, function profiler) và trace-cmd để thấy cây hàm và
   thời gian từng hàm mà không thêm một dòng code nào.
   Mọi số liệu đo 2026-10-31 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1 TCG),
   kernel ~/bai38/linux-6.18.45.
   - Bài này ĐỔI .config của ~/bai38: bật FTRACE, FUNCTION_TRACER, FUNCTION_GRAPH_TRACER, DYNAMIC_FTRACE,
     FUNCTION_PROFILER, DYNAMIC_DEBUG (scripts/diffconfig 81 dòng), build lại Image (6m59s) VÀ modules (8m45s),
     .version 6 -> 7. Mọi .ko build trước bài này (Bài 50–64) không nạp được nữa — xem docs/course-notes.md.
   - trace-cmd lấy từ gói Ubuntu focal arm64 2.8.3 (dynamic, chạy nhờ 3 thư viện chép từ toolchain).
   - ~/bai65 (~23M) là nháp, xoá được. */

Lesson.register({
  id: 'bai-65',
  title: 'Ftrace và các công cụ theo vết',
  minutes: 55,
  practice: 'Thực hành 45 phút',
  level: 'Nâng cao',

  intro:
    'Bài 64 dạy bạn đọc một kernel đã chết. Phần lớn lỗi kernel ngoài đời không chết: driver chạy đúng nhưng ' +
    'chậm, một <code>write()</code> lúc mất 50 µs lúc mất 5 ms, và không ai biết thời gian đi đâu. Phản xạ đầu ' +
    'tiên của mọi người là rắc thêm <code>printk</code>. Bài này đo cái giá của phản xạ đó: trong máy ảo của bạn, ' +
    'một <code>pr_info</code> in ra console tốn khoảng <b>114 000 ns</b>, trong khi chính đoạn code nó định ' +
    'quan sát chỉ tốn <b>14–55 ns</b> — dòng log chậm hơn thứ nó đo hàng nghìn lần.<br><br>' +
    'Sau đó bạn học ba công cụ kernel dùng thay cho <code>printk</code>: <b>dynamic debug</b> bật ' +
    '<code>pr_debug</code> cho đúng một dòng lúc đang chạy; <b>ftrace</b> ghi lại mọi hàm mà một lệnh ' +
    '<code>write()</code> đi qua, kèm thời gian từng hàm, mà không cần sửa hay build lại module; và ' +
    '<b><code>trace-cmd</code></b> gói tất cả thành một lệnh. Cuối bài bạn sẽ đọc được từ một bảng số rằng ' +
    '<code>td_compute</code> tốn trung bình 205 µs, và biết vì sao.',

  goals: [
    'Đo và giải thích vì sao <code>printk</code> ra console chậm (đồng bộ qua UART), vì sao nó có thể <b>mất ' +
      'dòng</b> (vòng log 128 KiB), và vì sao <code>trace_printk</code> nhanh hơn khoảng 40 lần.',
    'Bật, tắt và thu hẹp <code>pr_debug</code> lúc chạy qua <code>/proc/dynamic_debug/control</code> ' +
      '(<code>module</code>, <code>file … line</code>, <code>func</code>, cờ <code>p f l</code>), lúc ' +
      '<code>insmod</code> (<code>dyndbg=+p</code>) và lúc boot (<code>dyndbg="…"</code>).',
    'Dùng tracefs bằng tay: <code>current_tracer</code>, <code>set_ftrace_filter</code>, ' +
      '<code>set_graph_function</code>, <code>max_graph_depth</code>, <code>tracing_on</code>, và đọc từng cột ' +
      'của <code>trace</code>.',
    'Đọc một đồ thị <code>function_graph</code>: cột <code>DURATION</code>, các dấu <code>+ ! # * @</code>, ' +
      'và phân biệt thời gian của chính hàm với thời gian của hàm con.',
    'Đo thời gian thực thi trong kernel bằng <code>function_profile_enabled</code> + <code>trace_stat</code>, ' +
      'và ước lượng chi phí mà chính công cụ đo thêm vào.',
    'Ghi và đọc lại một bản theo vết bằng <code>trace-cmd record</code> / <code>report</code>, kết hợp hàm ' +
      'với sự kiện (<code>kmem:kmalloc</code>).'
  ],

  blocks: [

    /* ============================================================
       1. PRINTK CÓ HẠI THẾ NÀO
       ============================================================ */
    { t: 'h2', x: 'printk có hại thế nào' },

    { t: 'p', x:
      'Từ Bài 50 bạn đã dùng <code>pr_info</code> như <code>printf</code> của kernel, và Bài 51 đã chỉ ra các ' +
      'mức log. Điều Bài 51 chưa nói là <code>printk</code> làm <b>hai việc</b> khác nhau về giá: (1) ghi dòng ' +
      'chữ vào <b>vòng log</b> trong RAM — thứ <code>dmesg</code> đọc; (2) nếu mức của dòng nhỏ hơn ' +
      '<code>console_loglevel</code>, <b>đẩy từng ký tự ra console</b> — ở đây là cổng nối tiếp PL011 ' +
      '<code>ttyAMA0</code>. Việc (1) là chép bộ nhớ. Việc (2) là I/O, và trên một bo mạch thật ở 115 200 ' +
      'baud, một dòng 40 ký tự mất khoảng 3,5 ms chỉ để ra khỏi chân TX.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Đường đi của printk so với trace_printk: printk ghi vào vòng log rồi đẩy ra console UART chậm; trace_printk chỉ ghi vào ring buffer của ftrace">' +
        '<rect class="d-box-p" x="20" y="40" width="150" height="50" rx="6"/>' +
        '<text class="d-t" x="95" y="62" text-anchor="middle">pr_info(...)</text>' +
        '<text class="d-ts" x="95" y="80" text-anchor="middle">trong td_step()</text>' +
        '<rect class="d-box" x="240" y="40" width="190" height="50" rx="6"/>' +
        '<text class="d-t" x="335" y="62" text-anchor="middle">vòng log printk</text>' +
        '<text class="d-ts" x="335" y="80" text-anchor="middle">RAM, mặc định 128 KiB</text>' +
        '<rect class="d-box-w" x="500" y="40" width="200" height="50" rx="6"/>' +
        '<text class="d-t" x="600" y="62" text-anchor="middle">console ttyAMA0</text>' +
        '<text class="d-ts" x="600" y="80" text-anchor="middle">I/O từng ký tự — chậm</text>' +
        '<line class="d-line" x1="170" y1="65" x2="234" y2="65"/>' +
        '<path class="d-arrow" d="M240,65 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="430" y1="65" x2="494" y2="65"/>' +
        '<path class="d-arrow" d="M500,65 l-8,-4 v8 z"/>' +
        '<text class="d-ts" x="465" y="110" text-anchor="middle">chỉ khi mức &lt; console_loglevel</text>' +
        '<rect class="d-box" x="240" y="120" width="190" height="34" rx="6"/>' +
        '<text class="d-tm" x="335" y="142" text-anchor="middle">dmesg</text>' +
        '<line class="d-line" x1="335" y1="90" x2="335" y2="114"/>' +
        '<path class="d-arrow" d="M335,120 l-4,-8 h8 z"/>' +
        '<rect class="d-box-a" x="20" y="180" width="150" height="50" rx="6"/>' +
        '<text class="d-t" x="95" y="202" text-anchor="middle">trace_printk(...)</text>' +
        '<text class="d-ts" x="95" y="220" text-anchor="middle">chỉ để debug</text>' +
        '<rect class="d-box-g" x="240" y="180" width="190" height="50" rx="6"/>' +
        '<text class="d-t" x="335" y="202" text-anchor="middle">ring buffer ftrace</text>' +
        '<text class="d-ts" x="335" y="220" text-anchor="middle">mỗi CPU một vùng, lưu nhị phân</text>' +
        '<rect class="d-box" x="500" y="188" width="200" height="34" rx="6"/>' +
        '<text class="d-tm" x="600" y="210" text-anchor="middle">/sys/kernel/tracing/trace</text>' +
        '<line class="d-line" x1="170" y1="205" x2="234" y2="205"/>' +
        '<path class="d-arrow" d="M240,205 l-8,-4 v8 z"/>' +
        '<line class="d-line" x1="430" y1="205" x2="494" y2="205"/>' +
        '<path class="d-arrow" d="M500,205 l-8,-4 v8 z"/>' +
        '<text class="d-ts" x="600" y="244" text-anchor="middle">định dạng thành chữ chỉ khi bạn đọc</text>' +
        '</svg>',
      cap: 'printk trả giá ngay lúc gọi, kể cả phần I/O ra console. trace_printk chỉ chép vài giá trị vào ring ' +
           'buffer; việc định dạng thành chữ hoãn tới lúc bạn cat file trace.' },

    { t: 'p', x:
      'Bước 3 đo bốn biến thể của cùng một vòng lặp 1 000 lần trong module <code>tdemo</code>. Đây là kết quả ' +
      '(ba lần chạy mỗi loại, cùng một lần boot; bước 3 lặp lại phép đo trong một lần boot khác và cho số hơi ' +
      'khác, cùng bậc độ lớn):' },

    { t: 'table',
      head: ['Trong vòng lặp gọi', 'ns mỗi lần lặp', 'So với vòng lặp trống'],
      rows: [
        ['Không gì cả (<code>quiet</code>)', '<b>14 – 48</b>', '1×'],
        ['<code>pr_debug</code> đang <b>tắt</b> (dynamic debug)', '<b>13 – 25</b>', '≈ 1× — không đo được khác biệt'],
        ['<code>trace_printk</code>', '<b>1 521 – 4 126</b>', '~100×'],
        ['<code>pr_info</code>, console bị chặn (<code>dmesg -n 1</code>)', '<b>27 876 – 39 159</b>', '~1 000×'],
        ['<code>pr_debug</code> đang <b>bật</b>, console bị chặn', '<b>29 880 – 38 710</b>', 'như <code>pr_info</code> — nó <i>là</i> printk'],
        ['<code>pr_info</code>, in ra console (mặc định)', '<b>112 443 – 120 706</b>', '~4 000×']
      ] },

    { t: 'p', x:
      'Ba điều đọc được từ bảng. <b>Một</b>: phần đắt nhất là console — cùng <code>pr_info</code>, chặn ' +
      'console giảm từ ~115 µs xuống ~33 µs. <b>Hai</b>: <code>pr_debug</code> đang tắt gần như miễn phí; đó ' +
      'là lý do driver trong kernel được phép rải <code>pr_debug</code>/<code>dev_dbg</code> khắp nơi. ' +
      '<b>Ba</b>: <code>trace_printk</code> rẻ hơn <code>pr_info</code> chặn console khoảng 10 lần và rẻ hơn ' +
      '<code>pr_info</code> ra console khoảng 40 lần. Các con số tuyệt đối đo trong QEMU giả lập (TCG) nên lớn ' +
      'hơn phần cứng thật; tỷ lệ giữa chúng mới là thứ đáng nhớ.' },

    { t: 'cal', kind: 'warn', title: 'printk còn làm mất dữ liệu',
      x: 'Vòng log mặc định của kernel này là 128 KiB (Bài 44 đã gặp). 3 000 dòng <code>step … checksum …</code> ' +
         'đẩy các dòng cũ ra ngoài: ở cuối bước 3, sáu lần ghi chỉ còn ba dòng tổng kết trong ' +
         '<code>dmesg</code>. Muốn giữ lại, boot với <code>log_buf_len=4M</code> — hoặc tốt hơn, đừng dùng printk để ghi hàng ' +
         'nghìn sự kiện.' },

    { t: 'cal', kind: 'why', title: 'Vì sao "thêm printk" làm lỗi biến mất',
      x: 'Một <code>pr_info</code> ra console kéo dài đoạn code thêm ~100 µs. Nếu lỗi là một cuộc đua giữa hai ' +
         'CPU (Bài 56) hoặc giữa driver và một ngắt (Bài 55), chừng đó đủ để thay đổi thứ tự sự kiện — lỗi ' +
         'không còn tái hiện. Dân kernel gọi đó là <i>heisenbug</i>: quan sát làm thay đổi thứ bị quan sát. ' +
         'Công cụ đo tốt là công cụ thêm ít thời gian nhất, và chỉ vào đúng chỗ bạn cần.' },

    /* ============================================================
       2. DYNAMIC DEBUG
       ============================================================ */
    { t: 'h2', x: 'Dynamic debug: pr_debug bật tắt lúc chạy' },

    { t: 'p', x:
      'Ở Bài 51 và 53, kernel của bạn có <code># CONFIG_DYNAMIC_DEBUG is not set</code>. Khi đó ' +
      '<code>pr_debug</code> chỉ có hai trạng thái, chọn lúc <b>biên dịch</b>: không có <code>-DDEBUG</code> thì ' +
      'nó biến mất khỏi file <code>.ko</code>; có <code>-DDEBUG</code> thì nó là một <code>printk</code> thường ' +
      'và luôn chạy — chính cái bẫy làm <code>ioctl</code> ở Bài 53 chậm 50 lần. Muốn đổi phải build lại.' },

    { t: 'p', x:
      'Bật <code>CONFIG_DYNAMIC_DEBUG</code> thì mỗi lời gọi <code>pr_debug</code>/<code>dev_dbg</code> được ' +
      'biên dịch thành <b>một lệnh <code>nop</code></b> đứng trước đoạn gọi <code>printk</code>, cộng một bản ghi ' +
      'mô tả (file, dòng, hàm, chuỗi định dạng) đặt vào section <code>__dyndbg</code>. Khi bạn bật dòng đó, ' +
      'kernel sửa chính lệnh <code>nop</code> trong bộ nhớ thành một lệnh nhảy tới đoạn gọi printk. Cơ chế sửa ' +
      'mã lúc chạy này tên là <b>static key</b> (hay jump label). Bước 2 sẽ cho bạn thấy lệnh ' +
      '<code>nop</code> đó bằng <code>objdump</code>.' },

    { t: 'p', x:
      'Mọi điểm <code>pr_debug</code> của cả kernel và module đã nạp được liệt kê trong một file, mỗi điểm một dòng:' },

    { t: 'code', where: 'out', nocopy: true, code:
      '# filename:lineno [module]function flags format\n' +
      'init/main.c:1143 [main]initcall_blacklisted =p "initcall %s blacklisted\\n"\n' +
      'tdemo.c:19 [tdemo]td_step =_ "step %u checksum %u\\n"',
      notes: ['Trích từ <code>/proc/dynamic_debug/control</code> ở bước 4. Kernel này có 5 955 dòng như vậy.'] },

    { t: 'p', x:
      '<code>=_</code> nghĩa là tắt; <code>=p</code> nghĩa là đang in. Bạn điều khiển bằng cách <b>ghi một câu ' +
      'truy vấn</b> vào chính file đó: phần đầu chọn các dòng, phần cuối là phép đổi cờ.' },

    { t: 'table',
      head: ['Thành phần', 'Ví dụ', 'Ý nghĩa'],
      rows: [
        ['<code>module NAME</code>', '<code>module tdemo</code>', 'Mọi điểm của module <code>tdemo</code>'],
        ['<code>file PATH</code>', '<code>file tdemo.c</code>, <code>file drivers/base/*</code>', 'Theo file nguồn; cho phép <code>*</code>'],
        ['<code>line N</code> hoặc <code>N-M</code>', '<code>file tdemo.c line 19</code>', 'Thu hẹp tới đúng một dòng'],
        ['<code>func NAME</code>', '<code>func td_step</code>', 'Mọi điểm trong một hàm'],
        ['<code>+</code> / <code>-</code> / <code>=</code>', '<code>+p</code>, <code>-p</code>, <code>=_</code>', 'Thêm cờ / bỏ cờ / gán đúng tập cờ này'],
        ['<code>p</code>', '', 'In dòng này (cờ chính)'],
        ['<code>f</code> <code>l</code> <code>m</code> <code>t</code>', '<code>+pfl</code>', 'Thêm tên hàm / số dòng / tên module / thread id vào đầu dòng'],
        ['<code>_</code>', '<code>=_</code>', 'Không cờ nào — tắt hẳn']
      ] },

    { t: 'cal', kind: 'tip', title: 'Ba thời điểm để bật',
      x: '<b>Lúc chạy</b>: <code>echo \'module tdemo +p\' &gt; /proc/dynamic_debug/control</code>. ' +
         '<b>Lúc nạp module</b>: <code>insmod tdemo.ko dyndbg=+p</code> — mọi module tự có tham số ảo ' +
         '<code>dyndbg</code>, cần khi muốn thấy <code>pr_debug</code> trong chính hàm <code>init</code>. ' +
         '<b>Lúc boot</b>: <code>dyndbg="file drivers/base/dd.c +p"</code> trên dòng lệnh kernel, cho mã chạy ' +
         'trước khi bạn có shell. Không cần thuộc cú pháp — ' +
         '<code>Documentation/admin-guide/dynamic-debug-howto.rst</code> trong cây <code>~/bai38</code> có đủ.' },

    /* ============================================================
       3. FTRACE
       ============================================================ */
    { t: 'h2', x: 'Ftrace: kernel tự ghi lại mình đi qua những hàm nào' },

    { t: 'p', x:
      'Dynamic debug chỉ bật được những dòng mà người viết driver đã đặt sẵn. <b>Ftrace</b> trả lời một câu ' +
      'hỏi khác: "kernel đã gọi những hàm nào, theo thứ tự nào, mỗi hàm tốn bao lâu?" — cho <b>mọi hàm</b>, ' +
      'kể cả hàm của module bạn, mà không cần một dòng log nào trong code.' },

    { t: 'p', x:
      'Mẹo nằm ở trình biên dịch. Khi bật <code>CONFIG_FUNCTION_TRACER</code> trên arm64, Kbuild thêm cờ ' +
      '<code>-fpatchable-function-entry=4,2</code> (<code>arch/arm64/Makefile:144</code>): GCC đặt <b>bốn lệnh ' +
      '<code>nop</code></b> quanh cửa vào mọi hàm — hai lệnh ngay <i>trước</i> hàm (chỗ để kernel cất một con trỏ) ' +
      'và hai lệnh là hai lệnh <i>đầu tiên</i> của hàm — rồi ghi địa chỉ vào section ' +
      '<code>__patchable_function_entries</code>. Bình thường các lệnh đó không làm gì (chi phí gần bằng 0 — đó ' +
      'là ý nghĩa của <code>CONFIG_DYNAMIC_FTRACE</code>). Khi bạn bật theo vết một hàm, kernel sửa lệnh thứ hai ' +
      'của hàm thành một lời gọi tới bộ ghi của ftrace; bộ ghi đó lưu "hàm nào, ai gọi, lúc nào" vào ' +
      '<b>ring buffer</b> — một vùng nhớ vòng, mỗi CPU một vùng. Cùng ý tưởng sửa mã như static key của dynamic ' +
      'debug, nhưng áp vào cửa vào của 68 414 hàm.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" aria-label="Hai lệnh nop ở đầu hàm td_step: trong file .ko là nop, khi bật ftrace thì được sửa thành mov x9, x30 và lời gọi tới bộ ghi ftrace, ghi vào ring buffer">' +
        '<text class="d-t" x="170" y="24" text-anchor="middle">Trong file tdemo.ko</text>' +
        '<text class="d-t" x="540" y="24" text-anchor="middle">Bật: echo function &gt; current_tracer</text>' +
        '<rect class="d-box" x="40" y="40" width="260" height="130" rx="6"/>' +
        '<text class="d-tm" x="56" y="64">td_step:</text>' +
        '<text class="d-tm" x="72" y="86">nop</text>' +
        '<text class="d-tm" x="72" y="106">nop</text>' +
        '<text class="d-tm" x="72" y="126">paciasp</text>' +
        '<text class="d-tm" x="72" y="146">stp x29, x30, …</text>' +
        '<text class="d-ts" x="170" y="190" text-anchor="middle">CPU chạy qua hai nop, gần như miễn phí</text>' +
        '<rect class="d-box-p" x="410" y="40" width="260" height="130" rx="6"/>' +
        '<text class="d-tm" x="426" y="64">td_step:</text>' +
        '<text class="d-tm" x="442" y="86">mov x9, x30</text>' +
        '<text class="d-tm" x="442" y="106">bl  ftrace_caller</text>' +
        '<text class="d-tm" x="442" y="126">paciasp</text>' +
        '<text class="d-tm" x="442" y="146">stp x29, x30, …</text>' +
        '<line class="d-line" x1="300" y1="105" x2="404" y2="105"/>' +
        '<path class="d-arrow" d="M410,105 l-8,-4 v8 z"/>' +
        '<text class="d-ts" x="355" y="96" text-anchor="middle">kernel sửa</text>' +
        '<text class="d-ts" x="355" y="122" text-anchor="middle">lúc chạy</text>' +
        '<rect class="d-box-g" x="470" y="186" width="200" height="34" rx="6"/>' +
        '<text class="d-ts" x="570" y="207" text-anchor="middle">ghi vào ring buffer, rồi chạy tiếp</text>' +
        '</svg>',
      cap: 'Hai lệnh nop mà GCC đặt ở đầu mọi hàm là "ổ cắm" của ftrace. Không bật thì gần như không tốn gì; bật ' +
           'thì mỗi lần vào hàm tốn thêm một lời gọi — bước 6 đo đúng chi phí đó.' },

    { t: 'cal', kind: 'info', title: 'Cột phải là mô tả từ mã nguồn, không phải bản chụp',
      x: 'Cột trái là thật — bước 2 chụp nó bằng <code>objdump</code>. Cột phải đọc từ ' +
         '<code>arch/arm64/kernel/ftrace.c</code>: ngay khi nạp module, <code>ftrace_init_nop()</code> (dòng 465) ' +
         'đã đổi lệnh <code>nop</code> thứ nhất thành <code>mov x9, x30</code> (vô hại, chép địa chỉ trả về); ' +
         'lệnh thứ hai chỉ thành <code>bl</code> khi hàm được bật theo vết. Bài này không chụp bộ nhớ của kernel ' +
         'đang chạy. Muốn tự xem, dùng GDB của Bài 63: dừng kernel sau khi bật tracer và <code>x/4i td_step</code>.' },

    { t: 'p', x:
      'Toàn bộ ftrace được điều khiển qua một hệ thống file ảo: <b>tracefs</b>, gắn ở ' +
      '<code>/sys/kernel/tracing</code>. Không có lệnh hay thư viện nào cả — mọi thứ là <code>echo</code> vào ' +
      'file và <code>cat</code> file ra, cùng kiểu với sysfs mà bạn đã viết ở Bài 53.' },

    { t: 'table',
      head: ['File trong /sys/kernel/tracing', 'Bạn ghi / đọc', 'Tác dụng'],
      rows: [
        ['<code>available_tracers</code>', 'đọc', 'Các tracer có trong kernel này: <code>function_graph function nop</code>'],
        ['<code>current_tracer</code>', 'ghi tên tracer', 'Bật tracer. <code>nop</code> = tắt'],
        ['<code>available_filter_functions</code>', 'đọc', 'Mọi hàm có thể theo vết (68 414 dòng, cộng hàm của module đã nạp)'],
        ['<code>set_ftrace_filter</code>', 'ghi tên hàm, cho phép <code>*</code> và <code>:mod:NAME</code>', 'Chỉ theo vết các hàm này. Rỗng = tất cả'],
        ['<code>set_graph_function</code>', 'ghi tên hàm', '<code>function_graph</code> chỉ vẽ cây bắt đầu từ hàm này'],
        ['<code>max_graph_depth</code>', 'ghi số', 'Cắt cây ở độ sâu N. <code>0</code> = không giới hạn'],
        ['<code>tracing_on</code>', '<code>0</code> / <code>1</code>', 'Tạm dừng / tiếp tục ghi, không đổi cấu hình'],
        ['<code>trace</code>', 'đọc; ghi rỗng để xoá', 'Nội dung ring buffer, đã định dạng thành chữ'],
        ['<code>buffer_size_kb</code>', 'đọc / ghi', 'Kích thước ring buffer mỗi CPU'],
        ['<code>function_profile_enabled</code>', '<code>0</code> / <code>1</code>', 'Bật bộ đếm thời gian theo hàm'],
        ['<code>trace_stat/function0</code>', 'đọc', 'Kết quả profiler của CPU 0']
      ] },

    { t: 'p', x: 'Ba tracer mà kernel của bạn có sau bài này, và câu hỏi mỗi cái trả lời:' },

    { t: 'table',
      head: ['Tracer', 'Ghi lại', 'Trả lời câu hỏi'],
      rows: [
        ['<code>function</code>', 'Mỗi lần <b>vào</b> một hàm: tên hàm và hàm đã gọi nó', '"Hàm này có được gọi không, ai gọi, bao nhiêu lần?"'],
        ['<code>function_graph</code>', 'Cả lúc vào <b>và lúc ra</b> mỗi hàm, nên tính được thời gian và vẽ được cây lồng nhau', '"Lệnh này đi qua những hàm nào, mỗi hàm tốn bao lâu?"'],
        ['<code>nop</code>', 'Không gì — chỉ các sự kiện và <code>trace_printk</code>', 'Trạng thái "tắt"']
      ] },

    { t: 'cal', kind: 'info', title: 'Các tracer khác bạn sẽ nghe tên',
      x: '<code>irqsoff</code>, <code>preemptoff</code>, <code>wakeup</code> đo độ trễ tối đa khi ngắt/preempt bị ' +
         'tắt — thứ cần cho hệ thống thời gian thực. <code>defconfig</code> không bật chúng, bài này cũng không ' +
         '(<code>+IRQSOFF_TRACER n</code> trong <code>diffconfig</code> ở bước 1). Ngoài tracer, ftrace còn có hàng ' +
         'nghìn <b>sự kiện</b> (tracepoint) đặt sẵn trong kernel, như <code>kmem:kmalloc</code>; bước 6 dùng một ' +
         'cái. Thế hệ công cụ kế tiếp — eBPF, <code>bpftrace</code>, <code>perf</code> — xây trên cùng các ổ cắm ' +
         'này; chúng nằm ngoài phạm vi bài.' },

    /* ============================================================
       4. ĐỌC FUNCTION_GRAPH VÀ ĐO THỜI GIAN
       ============================================================ */
    { t: 'h2', x: 'Đọc function_graph và đo thời gian trong kernel' },

    { t: 'p', x:
      'Đây là một đoạn thật (bước 5) của <code>function_graph</code> khi bạn ghi <code>"quiet 10"</code> vào ' +
      '<code>/proc/tdemo</code>. Mỗi dòng là một lần vào hoặc ra một hàm; thụt lề thể hiện ai gọi ai, đúng như ' +
      'cách bạn đọc mã C:' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 0)               |  td_write [tdemo]() {\n' +
      ' 0) + 30.560 us   |    td_step [tdemo]();\n' +
      ' 0)   3.280 us    |    td_step [tdemo]();\n' +
      ' 0)               |    td_compute [tdemo]() {\n' +
      ' 0)               |      __delay() {\n' +
      ' 0) + 19.680 us   |        arch_timer_evtstrm_available();\n' +
      ' 0) ! 233.264 us  |      }\n' +
      ' 0) ! 259.088 us  |    }',
      notes: ['Trích, đã bỏ bớt dòng. Bản đầy đủ ở bước 5.'] },

    { t: 'table',
      head: ['Phần', 'Ví dụ', 'Đọc thế nào'],
      rows: [
        ['Cột đầu', '<code>0)</code>', 'CPU chạy dòng này. Máy ảo của bạn chỉ có một CPU'],
        ['<code>hàm() {</code>', '<code>td_compute [tdemo]() {</code>', 'Vào một hàm có gọi hàm con. Thời gian của nó in ở dòng <code>}</code> tương ứng'],
        ['<code>hàm();</code>', '<code>td_step [tdemo]();</code>', 'Hàm lá (không gọi hàm nào được theo vết): vào và ra trên cùng một dòng'],
        ['<code>DURATION</code>', '<code>259.088 us</code>', 'Thời gian từ lúc vào tới lúc ra, <b>gồm cả hàm con</b>'],
        ['Dấu trước số', '<code>+</code> <code>!</code> <code>#</code> <code>*</code> <code>@</code> <code>$</code>', 'Lớn hơn 10 µs / 100 µs / 1 ms / 10 ms / 100 ms / 1 s — để mắt bạn tìm chỗ chậm mà không cần đọc số'],
        ['<code>[tdemo]</code>', '', 'Hàm thuộc module <code>tdemo</code>, không phải <code>vmlinux</code>']
      ] },

    { t: 'p', x:
      'Thời gian <b>riêng</b> của một hàm = thời gian của nó trừ tổng thời gian các hàm con. Ở trên, ' +
      '<code>td_compute</code> tốn 259 µs, trong đó <code>__delay</code> chiếm 233 µs — tức là ' +
      '<code>td_compute</code> chỉ chờ, đúng như <code>udelay(200)</code> trong mã. Dấu <code>!</code> làm hai ' +
      'dòng này nổi lên giữa một trang toàn số nhỏ.' },

    { t: 'cal', kind: 'warn', title: 'Đồ thị càng sâu, con số càng phồng',
      x: 'Mỗi hàm trong cây đều trả chi phí ghi vào và ghi ra. <code>td_write</code> với <code>"quiet 10"</code> ' +
         'đo <b>~5 ms</b> khi vẽ cây đầy đủ, trong khi module tự đo vòng lặp chỉ 50–130 µs. Muốn số gần thật: ' +
         'giới hạn <code>max_graph_depth</code>, lọc đúng vài hàm, hoặc dùng profiler. Và đừng so số đo khi đang ' +
         'theo vết với số đo khi không theo vết — bước 6 cho thấy chính tracer làm vòng lặp chậm 10–50 lần.' },

    { t: 'p', x:
      '<b>Function profiler</b> là cách rẻ nhất để có thời gian theo hàm: nó không ghi từng sự kiện vào ring ' +
      'buffer mà chỉ cộng dồn trong kernel — số lần gọi, tổng thời gian, trung bình, phương sai — cho các hàm ' +
      'trong <code>set_ftrace_filter</code>. Đây là "đo thời gian thực thi trong kernel" theo đúng nghĩa: bạn hỏi ' +
      '<code>td_compute</code> tốn bao lâu và nhận một con số có thống kê, không cần đếm dòng.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: đo printk, bật pr_debug, theo vết một write()' },

    { t: 'p', x:
      'Bạn sẽ bật ftrace và dynamic debug trong kernel <code>~/bai38</code>, viết một module nhỏ có đủ bốn kiểu ' +
      'log, rồi dùng nó làm "bệnh nhân" cho mọi công cụ của bài. Mọi lệnh trong máy ảo chạy với quyền root của ' +
      'initramfs — trên WSL, <code>/sys/kernel/tracing</code> chỉ root đọc được (Bài 37 đã gặp), nên QEMU là chỗ ' +
      'tự nhiên để thực hành.' },

    { t: 'cal', kind: 'danger', title: 'Bài này build lại kernel và toàn bộ module trong ~/bai38',
      x: 'Tổng cộng khoảng <b>16 phút</b> trên 16 CPU (Image 7 phút + modules 9 phút) và <code>.version</code> lên ' +
         '7. Sau đó <b>mọi file <code>.ko</code> bạn build ở Bài 50–64 không nạp được nữa</b> vào kernel mới ' +
         '(bước 1 cho thấy lỗi). Không sao — chỉ cần <code>make</code> lại trong thư mục của bài đó. Không chạy ' +
         '<code>make mrproper</code>.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Bật ftrace và dynamic debug, build lại kernel',
        blocks: [
          { t: 'p', x:
            'Kernel của bạn chưa có công cụ nào trong bài. Kiểm tra trước khi đổi — và cất bản <code>.config</code> ' +
            'hiện tại để lát nữa so sánh:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai65 && cd ~/bai38/linux-6.18.45\n' +
            'grep -E "^# CONFIG_(FTRACE|DYNAMIC_DEBUG) " .config\n' +
            'cp .config ~/bai65/config.before' },

          { t: 'code', where: 'out', nocopy: true, code:
            '# CONFIG_DYNAMIC_DEBUG is not set\n' +
            '# CONFIG_FTRACE is not set' },

          { t: 'p', x:
            'Cả hai đều tắt, đúng như <code>defconfig</code> và đúng như Bài 51/55 đã ghi nhận. ' +
            '<code>FTRACE</code> là menu cha của mọi tracer; tắt nó thì không có <code>/sys/kernel/tracing</code>. ' +
            'Bật sáu tuỳ chọn bằng <code>scripts/config</code> (đã dùng ở Bài 57/58/63), rồi để ' +
            '<code>olddefconfig</code> tự điền phần phụ thuộc:' },

          { t: 'code', where: 'wsl', code:
            'scripts/config --enable FTRACE --enable FUNCTION_TRACER --enable FUNCTION_GRAPH_TRACER \\\n' +
            '  --enable DYNAMIC_FTRACE --enable FUNCTION_PROFILER --enable DYNAMIC_DEBUG\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 olddefconfig\n' +
            'scripts/diffconfig ~/bai65/config.before .config | wc -l\n' +
            'scripts/diffconfig ~/bai65/config.before .config | grep -E "^ |^\\+(FUNCTION_TRACER|FUNCTION_GRAPH_TRACER|DYNAMIC_FTRACE|FUNCTION_PROFILER|TRACING|EVENT_TRACING|RING_BUFFER) "' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '81\n' +
            ' DYNAMIC_DEBUG n -> y\n' +
            ' DYNAMIC_DEBUG_CORE n -> y\n' +
            ' FTRACE n -> y\n' +
            ' FUNCTION_ALIGNMENT 4 -> 8\n' +
            '+DYNAMIC_FTRACE y\n' +
            '+EVENT_TRACING y\n' +
            '+FUNCTION_GRAPH_TRACER y\n' +
            '+FUNCTION_PROFILER y\n' +
            '+FUNCTION_TRACER y\n' +
            '+RING_BUFFER y\n' +
            '+TRACING y' },

          { t: 'cmdx', cmd: 'scripts/config --enable FTRACE … --enable DYNAMIC_DEBUG', rows: [
            ['<code>FTRACE</code>', 'Menu "Tracers". Bật nó mới thấy các tuỳ chọn bên dưới'],
            ['<code>FUNCTION_TRACER</code>', 'Tracer <code>function</code>; thêm cờ <code>-fpatchable-function-entry</code> cho mọi file'],
            ['<code>FUNCTION_GRAPH_TRACER</code>', 'Tracer <code>function_graph</code> (ghi cả lúc ra khỏi hàm)'],
            ['<code>DYNAMIC_FTRACE</code>', 'Giữ các lệnh <code>nop</code> ở dạng nop khi không theo vết — không có nó, mọi hàm luôn gọi vào ftrace'],
            ['<code>FUNCTION_PROFILER</code>', 'File <code>function_profile_enabled</code> và <code>trace_stat/</code> (bước 6)'],
            ['<code>DYNAMIC_DEBUG</code>', '<code>/proc/dynamic_debug/control</code>; biến mọi <code>pr_debug</code> thành điểm bật tắt được (bước 4)']
          ] },

          { t: 'p', x:
            'Sáu dòng bạn yêu cầu kéo theo <b>81</b> dòng thay đổi. Dòng có dấu cách đầu là giá trị đổi (ví dụ ' +
            '<code>FTRACE n -&gt; y</code>); dòng <code>+</code> là tuỳ chọn mới xuất hiện vì menu cha vừa mở. ' +
            '<code>RING_BUFFER</code> và <code>EVENT_TRACING</code> được kéo vào tự động — bạn không yêu cầu, nhưng ' +
            'tracer cần chúng. <code>FUNCTION_ALIGNMENT 4 -&gt; 8</code> cho thấy tracer đổi cả cách xếp hàm trong ' +
            'bộ nhớ: <code>Image</code> sắp to lên. Giờ build <b>cả</b> <code>Image</code> và <code>modules</code>:' },

          { t: 'code', where: 'wsl', code:
            'time make -j$(nproc) ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 Image modules\n' +
            'cat .version; ls -l arch/arm64/boot/Image vmlinux' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t6m58.903s     (Image)\n' +
            'real\t8m44.583s     (modules)\n' +
            '7\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  60430848 Oct 31 17:32 arch/arm64/boot/Image\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 728232616 Oct 31 17:32 vmlinux',
            notes: [
              'Lúc kiểm chứng, <code>Image</code> và <code>modules</code> được build bằng hai lệnh riêng nên có hai dòng <code>real</code>; bản gộp ở trên làm cả hai một lần. Thời gian phụ thuộc số CPU — máy này 16.',
              'Ngày giờ và tên người dùng sẽ khác trên máy bạn; kích thước khớp nếu bạn dùng GCC 9.4 và đúng cây của Bài 63.'
            ] },

          { t: 'p', x:
            '<code>Image</code> tăng từ 49 342 976 lên <b>60 430 848</b> byte (+22 %), <code>vmlinux</code> từ ' +
            '666 MB (Bài 63) lên <b>728 MB</b>. Phần tăng là các lệnh <code>nop</code> ở đầu mỗi hàm, bảng địa chỉ ' +
            'của chúng, mã của ftrace và 5 955 bản ghi <code>__dyndbg</code>. Đó là giá phải trả để có công cụ — ' +
            'sản phẩm thật thường bật ftrace ở bản debug và tắt ở bản phát hành.' },

          { t: 'cal', kind: 'warn', title: 'Vì sao phải build lại cả modules',
            x: 'Lần kiểm chứng đầu tiên chỉ build <code>Image</code>. Module ở bước 2 khi đó thất bại ở ' +
               '<code>modpost</code>: <code>ERROR: modpost: "__dynamic_pr_debug" [tdemo.ko] undefined!</code> và ' +
               '<code>"__trace_bprintk" … undefined!</code>. Danh sách symbol mà module ngoài cây được dùng nằm trong ' +
               '<code>Module.symvers</code>, và file này chỉ được viết lại bởi <code>make modules</code> — lúc đó nó ' +
               'vẫn là bản ngày 30/9 với 20 753 dòng; sau <code>make modules</code> là 21 366 dòng và có cả hai ' +
               'symbol. Ngoài ra, một <code>.ko</code> cũ (như <code>buggy.ko</code> của Bài 64) bị kernel mới từ ' +
               'chối: <code>.gnu.linkonce.this_module section size must match the kernel\'s built struct module size</code>, ' +
               '<code>insmod</code> trả <code>8</code> (<code>ENOEXEC</code>) — <code>struct module</code> đã có thêm ' +
               'trường cho ftrace.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Một module có đủ bốn kiểu log',
        blocks: [
          { t: 'p', x:
            '<code>tdemo</code> tạo <code>/proc/tdemo</code> (cùng kiểu <code>proc_create</code> + ' +
            '<code>.proc_write</code> như <code>buggy</code> ở Bài 64). Ghi <code>"MODE N"</code> vào đó chạy ' +
            '<code>td_step()</code> N lần, đo tổng thời gian vòng lặp bằng <code>ktime_get_ns()</code>, rồi gọi thêm ' +
            '<code>td_compute()</code> (chờ 200 µs, đóng vai phần cứng chậm) và <code>td_store()</code> (một cặp ' +
            '<code>kmalloc</code>/<code>kfree</code>). <code>MODE</code> chọn điều <code>td_step()</code> làm ngoài ' +
            'phép tính: <code>quiet</code> không log, <code>debug</code> gọi <code>pr_debug</code>, ' +
            '<code>info</code> gọi <code>pr_info</code>, <code>trace</code> gọi <code>trace_printk</code>.' },

          { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai65/tdemo && cd ~/bai65/tdemo' },

          { t: 'code', where: 'file', name: '~/bai65/tdemo/tdemo.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/* tdemo.c - measure what logging costs, and give ftrace something to trace */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/delay.h>\n' +
            '#include <linux/kernel.h>\n' +
            '#include <linux/ktime.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/proc_fs.h>\n' +
            '#include <linux/slab.h>\n' +
            '#include <linux/uaccess.h>\n' +
            '\n' +
            'static u32 checksum;\n' +
            '\n' +
            'static noinline void td_step(unsigned int i, int mode)\n' +
            '{\n' +
            '\tchecksum = checksum * 31 + i;\n' +
            '\tif (mode == 1)\n' +
            '\t\tpr_debug("step %u checksum %u\\n", i, checksum);\n' +
            '\telse if (mode == 2)\n' +
            '\t\tpr_info("step %u checksum %u\\n", i, checksum);\n' +
            '\telse if (mode == 3)\n' +
            '\t\ttrace_printk("step %u checksum %u\\n", i, checksum);\n' +
            '}\n' +
            '\n' +
            'static noinline void td_compute(void)\n' +
            '{\n' +
            '\tudelay(200);\t\t\t/* stands in for talking to slow hardware */\n' +
            '}\n' +
            '\n' +
            'static noinline int td_store(unsigned int loops)\n' +
            '{\n' +
            '\tu32 *copy = kmalloc_array(loops ? loops : 1, sizeof(*copy), GFP_KERNEL);\n' +
            '\n' +
            '\tif (!copy)\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tcopy[0] = checksum;\n' +
            '\tkfree(copy);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static ssize_t td_write(struct file *file, const char __user *ubuf,\n' +
            '\t\t\tsize_t len, loff_t *off)\n' +
            '{\n' +
            '\tstatic const char * const names[] = { "quiet", "debug", "info", "trace" };\n' +
            '\tchar cmd[32], name[8];\n' +
            '\tunsigned int loops, i;\n' +
            '\tint mode, ret;\n' +
            '\tu64 t0, ns;\n' +
            '\n' +
            '\tif (len >= sizeof(cmd))\n' +
            '\t\treturn -EINVAL;\n' +
            '\tif (copy_from_user(cmd, ubuf, len))\n' +
            '\t\treturn -EFAULT;\n' +
            '\tcmd[len] = \'\\0\';\n' +
            '\tif (sscanf(cmd, "%7s %u", name, &loops) != 2)\n' +
            '\t\treturn -EINVAL;\n' +
            '\tfor (mode = 0; mode < ARRAY_SIZE(names); mode++)\n' +
            '\t\tif (!strcmp(name, names[mode]))\n' +
            '\t\t\tbreak;\n' +
            '\tif (mode == ARRAY_SIZE(names))\n' +
            '\t\treturn -EINVAL;\n' +
            '\n' +
            '\tt0 = ktime_get_ns();\n' +
            '\tfor (i = 0; i < loops; i++)\n' +
            '\t\ttd_step(i, mode);\n' +
            '\tns = ktime_get_ns() - t0;\n' +
            '\n' +
            '\ttd_compute();\n' +
            '\tret = td_store(loops);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\n' +
            '\tpr_notice("%s x%u: %llu ns total, %llu ns per call\\n",\n' +
            '\t\t  names[mode], loops, ns, loops ? div_u64(ns, loops) : 0);\n' +
            '\treturn len;\n' +
            '}\n' +
            '\n' +
            'static const struct proc_ops td_ops = {\n' +
            '\t.proc_write = td_write,\n' +
            '};\n' +
            '\n' +
            'static int __init td_init(void)\n' +
            '{\n' +
            '\tif (!proc_create("tdemo", 0200, NULL, &td_ops))\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tpr_debug("init done\\n");\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit td_exit(void)\n' +
            '{\n' +
            '\tremove_proc_entry("tdemo", NULL);\n' +
            '}\n' +
            '\n' +
            'module_init(td_init);\n' +
            'module_exit(td_exit);\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Measures the cost of printk, pr_debug and trace_printk");\n',
            notes: [
              'Dòng 19 (<code>pr_debug</code> trong <code>td_step</code>) và dòng 87 (<code>pr_debug</code> trong <code>td_init</code>) là hai điểm dynamic debug của module; bước 4 gọi chúng bằng số dòng.',
              '<code>noinline</code> giữ <code>td_step</code>, <code>td_compute</code>, <code>td_store</code> thành hàm riêng. Không có nó, GCC nhập chúng vào <code>td_write</code> và ftrace không còn hàm nào để theo vết — ftrace chỉ thấy <b>hàm thật</b>, không thấy hàm đã bị inline.',
              '<code>pr_notice</code> (mức 5) ở cuối in dòng tổng kết. Khi bạn chặn console bằng <code>dmesg -n 1</code>, dòng này cũng không hiện ra màn hình nữa, nhưng vẫn nằm trong vòng log — bạn đọc nó bằng <code>dmesg</code>.',
              '<code>ktime_get_ns()</code> đọc bộ đếm thời gian của CPU, độ phân giải nano giây. Hai lần đọc bao quanh vòng lặp, không bao <code>td_compute</code>/<code>td_store</code>.'
            ] },

          { t: 'p', x: 'Makefile là bản của Bài 50, chỉ đổi tên đối tượng:' },

          { t: 'code', where: 'file', name: '~/bai65/tdemo/Makefile', lang: 'makefile', code:
            'obj-m := tdemo.o\n' +
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

          { t: 'code', where: 'wsl', code:
            'make\n' +
            'aarch64-linux-gnu-objdump -h tdemo.ko | grep -E "__dyndbg|__jump_table|__trace_printk_fmt|patchable"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  tdemo.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  tdemo.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  tdemo.ko\n' +
            '  9 __jump_table  00000020  0000000000000000  0000000000000000  000006f0  2**3\n' +
            ' 10 __patchable_function_entries 00000028  0000000000000020  0000000000000020  00000710  2**0\n' +
            ' 14 __dyndbg      00000070  0000000000000000  0000000000000000  00000748  2**3\n' +
            ' 15 __trace_printk_fmt 00000010  0000000000000000  0000000000000000  000007b8  2**3',
            notes: ['Đã lược dòng <code>make -C …</code> và <code>make[1]: Entering/Leaving directory</code>.'] },

          { t: 'p', x:
            'Bốn section này là dấu vết của bốn cơ chế trong phần lý thuyết, và kích thước của chúng đếm được bằng ' +
            'tay. <code>__dyndbg</code> = <code>0x70</code> = 112 byte = <b>2 bản ghi</b> × 56 byte — đúng hai lời gọi ' +
            '<code>pr_debug</code> (dòng 19 và 87). <code>__jump_table</code> = 32 byte = 2 static key × 16 byte — mỗi ' +
            '<code>pr_debug</code> một công tắc. <code>__patchable_function_entries</code> = <code>0x28</code> = 40 ' +
            'byte = <b>5 hàm</b> × 8 byte địa chỉ: <code>td_init</code>, <code>td_step</code>, ' +
            '<code>td_compute</code>, <code>td_store</code>, <code>td_write</code> (<code>readelf -r</code> liệt kê đúng ' +
            'năm relocation). <code>td_exit</code> vắng mặt vì macro <code>__exit</code> có kèm <code>notrace</code> ' +
            '(<code>include/linux/init.h:79</code>). <code>__trace_printk_fmt</code> giữ chuỗi định dạng của ' +
            '<code>trace_printk</code>, để ring buffer chỉ cần lưu con trỏ và hai số.' },

          { t: 'p', x: 'Xem tận mắt các lệnh <code>nop</code> mà phần lý thuyết nói tới:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-objdump -d --no-show-raw-insn tdemo.ko | grep -A12 "<td_step>:"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0000000000000008 <td_step>:\n' +
            '   8:\tnop\n' +
            '   c:\tnop\n' +
            '  10:\tadrp\tx4, 0 <td_step-0x8>\n' +
            '  14:\tpaciasp\n' +
            '  18:\tstp\tx29, x30, [sp, #-16]!\n' +
            '  1c:\tcmp\tw1, #0x1\n' +
            '  20:\tmov\tx29, sp\n' +
            '  24:\tldr\tw2, [x4]\n' +
            '  28:\tadd\tw3, w0, w2, lsl #5\n' +
            '  2c:\tsub\tw3, w3, w2\n' +
            '  30:\tstr\tw3, [x4]\n' +
            '  34:\tb.eq\t54 <td_step+0x4c>  // b.none' },

          { t: 'p', x:
            'Hai <code>nop</code> ở <code>0x8</code> và <code>0xc</code> là ổ cắm của ftrace — mỗi hàm của module đều ' +
            'bắt đầu như vậy (hai <code>nop</code> nữa nằm ở <code>0x0</code>–<code>0x4</code>, ngay trước hàm). ' +
            '<code>add w3, w0, w2, lsl #5</code> rồi <code>sub w3, w3, w2</code> chính là <code>checksum * 31 + i</code> ' +
            '(nhân 32 rồi trừ một lần). Lệnh <code>b.eq 54</code> rẽ sang nhánh <code>mode == 1</code>; nếu đọc tiếp ' +
            'bạn sẽ thấy ở <code>0x54</code> là <b>một <code>nop</code> nữa</b> — đó là static key của ' +
            '<code>pr_debug</code>. Khi tắt, nhánh <code>debug</code> chạy qua <code>nop</code> rồi ' +
            '<code>ret</code>; lời gọi <code>__dynamic_pr_debug</code> ở <code>0x7c</code> chỉ được nhảy tới khi ' +
            'bạn bật dòng 19. Đó là lý do <code>debug</code> và <code>quiet</code> đo bằng nhau trong bảng ở phần ' +
            'lý thuyết.' },

          { t: 'cal', kind: 'info', title: 'Cùng một pr_debug, ba cách biên dịch',
            x: 'Bài 51: không <code>-DDEBUG</code>, không <code>DYNAMIC_DEBUG</code> → chuỗi không có trong ' +
               '<code>.ko</code> (<code>strings | grep -c</code> = 0). Bài 53: <code>-DDEBUG</code> → một ' +
               '<code>printk</code> luôn chạy. Bài này: <code>DYNAMIC_DEBUG=y</code> → chuỗi có trong ' +
               '<code>.ko</code>, mã gọi printk có, nhưng bị chặn bởi một <code>nop</code> có thể sửa lúc chạy.' },

          { t: 'p', x:
            'Cuối cùng đóng gói initramfs: initramfs của Bài 32, thêm <code>tdemo.ko</code> và công cụ ' +
            '<code>trace-cmd</code> cho bước 6. BusyBox không có <code>trace-cmd</code>, và build nó từ mã nguồn kéo ' +
            'theo hai thư viện nữa; ở đây bạn lấy thẳng bản ARM64 đã build sẵn của Ubuntu 20.04 (cùng bản phát hành ' +
            'với WSL của bạn), kiểm tra checksum, rồi giải nén mà không cài:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai65/dl && cd ~/bai65/dl\n' +
            'curl -sSO http://ports.ubuntu.com/ubuntu-ports/pool/universe/t/trace-cmd/trace-cmd_2.8.3-4build1_arm64.deb\n' +
            'echo "9feb6f3e3d9030bd8a4b1d0b59ff8f1b6d9a61971c2090509f4acc75295cb7cc  trace-cmd_2.8.3-4build1_arm64.deb" | sha256sum -c\n' +
            'dpkg-deb -x trace-cmd_2.8.3-4build1_arm64.deb pkg\n' +
            'aarch64-linux-gnu-readelf -d pkg/usr/bin/trace-cmd | grep NEEDED' },

          { t: 'code', where: 'out', nocopy: true, code:
            'trace-cmd_2.8.3-4build1_arm64.deb: OK\n' +
            ' 0x0000000000000001 (NEEDED)             Shared library: [libdl.so.2]\n' +
            ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
            ' 0x0000000000000001 (NEEDED)             Shared library: [ld-linux-aarch64.so.1]' },

          { t: 'cmdx', cmd: 'dpkg-deb -x FILE.deb pkg', rows: [
            ['<code>ports.ubuntu.com/ubuntu-ports</code>', 'Kho Ubuntu cho kiến trúc không phải x86 (arm64, armhf…). <code>archive.ubuntu.com</code> chỉ có amd64/i386'],
            ['<code>sha256sum -c</code>', 'So với checksum trong chỉ mục <code>Packages.gz</code> của kho. Một tải về bị cắt cụt vẫn có thể trông như thành công'],
            ['<code>-x</code>', 'Chỉ giải nén cây file vào <code>pkg/</code>, không chạy script cài đặt, không cần <code>sudo</code>, không đụng vào WSL'],
            ['<code>readelf -d … NEEDED</code>', 'Thư viện động mà chương trình đòi lúc chạy (Bài 17/27)']
          ] },

          { t: 'p', x:
            'Ba thư viện <code>NEEDED</code> đều thuộc glibc. Bạn đã có chúng: gói <code>gcc-aarch64-linux-gnu</code> ' +
            'kéo theo glibc ARM64 ở <code>/usr/aarch64-linux-gnu/lib</code> (Bài 27). Chép ba file đó vào ' +
            '<code>/lib</code> của initramfs là đủ để trình nạp động tìm thấy chúng:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai65\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp tdemo/tdemo.ko initramfs/\n' +
            'mkdir -p initramfs/lib initramfs/usr/bin\n' +
            'cp dl/pkg/usr/bin/trace-cmd initramfs/usr/bin/\n' +
            'for l in ld-linux-aarch64.so.1 libc.so.6 libdl.so.2; do cp -L /usr/aarch64-linux-gnu/lib/$l initramfs/lib/; done\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '8740 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 2141954 Oct 31 17:55 initramfs.cpio.gz',
            notes: ['Kích thước <code>.gz</code> lệch vài byte trên máy bạn là bình thường (Bài 32 đã giải thích vì sao gzip của cpio không tái lập).'] },

          { t: 'p', x:
            '8 740 khối so với 4 871 của Bài 64: <code>libc.so.6</code> (1,4 MB) và <code>trace-cmd</code> (333 KiB) ' +
            'chiếm gần hết phần tăng. <code>cp -L</code> chép file thật thay vì symlink — ' +
            '<code>libc.so.6</code> trong toolchain là symlink tới <code>libc-2.31.so</code>, và một symlink trỏ ra ' +
            'ngoài initramfs sẽ gãy trong máy ảo.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Đo cái giá của printk',
        blocks: [
          { t: 'p', x:
            'Boot kernel mới. So với Bài 64 có thêm <code>log_buf_len=4M</code>: lát nữa bạn sẽ đẩy hàng nghìn dòng ' +
            'vào vòng log, và cần các dòng tổng kết sống sót để đọc lại.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai65\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr log_buf_len=4M"' },

          { t: 'p', x:
            'Ở dấu nhắc <code>~ #</code>, nạp module và chạy mỗi chế độ ba lần. <code>dmesg -n 1</code> đặt ' +
            '<code>console_loglevel</code> = 1: chỉ thông điệp mức 0 (<code>KERN_EMERG</code>) còn ra console, mọi ' +
            'thứ khác chỉ vào vòng log. Nhờ vậy lần đo đầu tiên của <code>info</code> không bị console làm méo; lần ' +
            'cuối cùng bật lại console (<code>dmesg -n 7</code>) để đo đúng phần đó.' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'mount -t tracefs none /sys/kernel/tracing\n' +
            'insmod /tdemo.ko\n' +
            'dmesg -n 1\n' +
            'for m in quiet debug trace info; do\n' +
            '  for i in 1 2 3; do echo "$m 1000" > /proc/tdemo; done\n' +
            'done\n' +
            'dmesg -n 7\n' +
            'echo "info 1000" > /proc/tdemo\n' +
            'dmesg | grep "x1000:"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    7.738683] tdemo: quiet x1000: 45312 ns total, 45 ns per call\n' +
            '[    8.438674] tdemo: quiet x1000: 55280 ns total, 55 ns per call\n' +
            '[    9.138804] tdemo: quiet x1000: 55632 ns total, 55 ns per call\n' +
            '[    9.843464] tdemo: debug x1000: 122448 ns total, 122 ns per call\n' +
            '[   10.543927] tdemo: debug x1000: 56896 ns total, 56 ns per call\n' +
            '[   11.248985] tdemo: debug x1000: 49840 ns total, 49 ns per call\n' +
            '[   11.953751] tdemo: trace x1000: 5053856 ns total, 5053 ns per call\n' +
            '[   12.658791] tdemo: trace x1000: 6034032 ns total, 6034 ns per call\n' +
            '[   13.360951] tdemo: trace x1000: 5255888 ns total, 5255 ns per call\n' +
            '[   14.092151] tdemo: info x1000: 34044544 ns total, 34044 ns per call\n' +
            '[   14.800267] tdemo: info x1000: 39790368 ns total, 39790 ns per call\n' +
            '[   15.492928] tdemo: info x1000: 32462096 ns total, 32462 ns per call\n' +
            '[   16.988222] tdemo: info x1000: 121027200 ns total, 121027 ns per call',
            notes: [
              'Lúc kiểm chứng, vòng <code>for</code> được gõ thành từng lệnh <code>echo</code> riêng; kết quả như nhau. Trước dòng <code>info</code> cuối, console còn in 1 000 dòng <code>tdemo: step … checksum …</code> — đã lược.',
              '<b>Mọi con số ns sẽ khác trên máy bạn</b>, và khác giữa các lần chạy: QEMU giả lập CPU ARM bằng phần mềm (TCG), nên thời gian phụ thuộc tải của máy Windows. Lần chạy để làm bảng ở phần lý thuyết cho <code>quiet</code> 14–48 ns, <code>trace</code> 1 521–4 126 ns. Hãy so <b>bậc độ lớn</b>, không so chữ số.',
              'Mỗi lần nạp <code>tdemo.ko</code>, kernel còn in một khung <code>NOTICE NOTICE … trace_printk() being used. Allocating extra memory.</code> — xem <code>cal</code> bên dưới.'
            ] },

          { t: 'p', x:
            'Đọc theo cột "ns per call". <b><code>quiet</code> 45–55</b>: chi phí của chính phép tính và lời gọi hàm ' +
            '— mốc so sánh. <b><code>debug</code> 49–122</b>: <code>pr_debug</code> đang tắt, cùng bậc với ' +
            '<code>quiet</code>; lần 122 là nhiễu (lần đầu chạy nhánh đó). <b><code>trace</code> ~5 000</b>: ' +
            '<code>trace_printk</code> chép hai số vào ring buffer — đắt gấp ~100 lần vòng lặp trống, nhưng vẫn ' +
            'rẻ. <b><code>info</code> 32 000–40 000</b> khi console bị chặn: chỉ riêng việc định dạng chuỗi và ghi ' +
            'vào vòng log đã đắt gấp ~7 lần <code>trace_printk</code>. <b>Dòng cuối, 121 027 ns</b>: cùng ' +
            '<code>pr_info</code> nhưng có in ra UART — đắt gấp ~3,5 lần lúc chặn console, gấp ~2 400 lần vòng lặp ' +
            'trống. 1 000 lần lặp mất <b>0,12 giây</b> chỉ để in log.' },

          { t: 'p', x: '<code>trace_printk</code> không viết vào <code>dmesg</code>. Dòng của nó nằm ở chỗ khác:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code: 'head -15 /sys/kernel/tracing/trace' },

          { t: 'code', where: 'out', nocopy: true, code:
            '# tracer: nop\n' +
            '#\n' +
            '# entries-in-buffer/entries-written: 3000/3000   #P:1\n' +
            '#\n' +
            '#                                _-----=> irqs-off/BH-disabled\n' +
            '#                               / _----=> need-resched\n' +
            '#                              | / _---=> hardirq/softirq\n' +
            '#                              || / _--=> preempt-depth\n' +
            '#                              ||| / _-=> migrate-disable\n' +
            '#                              |||| /     delay\n' +
            '#           TASK-PID     CPU#  |||||  TIMESTAMP  FUNCTION\n' +
            '#              | |         |   |||||     |         |\n' +
            '              sh-1       [000] .....    11.950193: td_step: step 0 checksum 3430577992\n' +
            '              sh-1       [000] .....    11.951530: td_step: step 1 checksum 3268702649\n' +
            '              sh-1       [000] .....    11.951560: td_step: step 2 checksum 2545534313',
            notes: ['Dấu thời gian và giá trị <code>checksum</code> khác mỗi lần chạy (<code>checksum</code> là biến tĩnh, cộng dồn qua mọi lần ghi).'] },

          { t: 'p', x:
            'Đây là file <code>trace</code> mà mọi tracer của bài đều dùng, nên đáng đọc kỹ một lần. ' +
            '<code># tracer: nop</code>: không tracer nào bật — <code>trace_printk</code> ghi được ngay cả khi ftrace ' +
            '"tắt". <code>3000/3000</code>: ba lần <code>trace 1000</code> = 3 000 dòng, không mất dòng nào. ' +
            '<code>sh-1</code>: tác vụ <code>sh</code>, PID 1 (shell của initramfs). <code>[000]</code>: CPU 0. ' +
            '<code>.....</code>: năm cờ trạng thái theo đúng chú thích ở trên (dấu chấm = không ngắt bị tắt, không ' +
            'trong ngắt, preempt bình thường). <code>11.950193</code>: giây kể từ boot, khớp với dòng ' +
            '<code>trace x1000</code> ở <code>11.953751</code> của <code>dmesg</code>. Cuối cùng là tên hàm gọi ' +
            '<code>trace_printk</code> và nội dung.' },

          { t: 'cal', kind: 'warn', title: 'Khung NOTICE khi nạp module: trace_printk chỉ để debug',
            x: 'Ngay khi một module có <code>trace_printk</code> được nạp, kernel in một khung 14 dòng: ' +
               '<code>** trace_printk() being used. Allocating extra memory. **</code> … <code>** unsafe for ' +
               'production use. **</code>. Đây là chủ ý: <code>trace_printk</code> cấp thêm bộ đệm cho mỗi CPU và ' +
               'ghi đè chung ring buffer với mọi tracer. Dùng nó khi đang săn lỗi, xoá trước khi gửi code đi. ' +
               'Code trong kernel chính thức không có <code>trace_printk</code> nào.' },

          { t: 'p', x:
            'Còn một tác hại nữa, cần boot lại <b>không có</b> <code>log_buf_len=4M</code> (thoát QEMU bằng ' +
            '<code>poweroff -f</code>, rồi chạy lại lệnh boot ở trên nhưng bỏ tham số đó):' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /tdemo.ko\n' +
            'dmesg -n 1\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'for i in 1 2 3; do echo "info 1000" > /proc/tdemo; done\n' +
            'dmesg | grep "x1000:"\n' +
            'dmesg | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    9.219582] tdemo: info x1000: 31515136 ns total, 31515 ns per call\n' +
            '[    9.926890] tdemo: info x1000: 36143440 ns total, 36143 ns per call\n' +
            '[   10.614568] tdemo: info x1000: 28430144 ns total, 28430 ns per call\n' +
            '2441' },

          { t: 'p', x:
            'Bạn đã ghi <b>sáu</b> lần, <code>dmesg</code> chỉ còn <b>ba</b> dòng tổng kết. Ba dòng <code>quiet</code> ' +
            '— và toàn bộ log boot — đã bị đẩy ra khỏi vòng log 128 KiB bởi 3 000 dòng <code>step …</code>. ' +
            '<code>2441</code> dòng là tất cả những gì 128 KiB chứa được. Trên một bo mạch ngoài hiện trường, dòng ' +
            'bị đẩy ra có thể chính là dòng bạn cần.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Dynamic debug: bật đúng một dòng',
        blocks: [
          { t: 'p', x:
            'Vẫn trong máy ảo (boot có hay không có <code>log_buf_len</code> đều được). Trước hết nhìn file điều ' +
            'khiển — tồn tại vì bước 1 đã bật <code>CONFIG_DYNAMIC_DEBUG</code>:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'wc -l /proc/dynamic_debug/control\n' +
            'head -3 /proc/dynamic_debug/control\n' +
            'grep -c "=p" /proc/dynamic_debug/control' },

          { t: 'code', where: 'out', nocopy: true, code:
            '5955 /proc/dynamic_debug/control\n' +
            '# filename:lineno [module]function flags format\n' +
            'init/main.c:1143 [main]initcall_blacklisted =p "initcall %s blacklisted\\n"\n' +
            'init/main.c:1110 [main]initcall_blacklist =p "blacklisting initcall %s\\n"\n' +
            '49',
            notes: ['Toàn bộ bước 4, trừ phần boot với <code>dyndbg=</code> ở cuối, là một lần boot duy nhất có <code>log_buf_len=4M</code>, chạy liền theo thứ tự trong bài.'] },

          { t: 'p', x:
            '<b>5 954</b> điểm <code>pr_debug</code> trong kernel (trừ dòng tiêu đề), và <b>49</b> điểm đang ' +
            '<code>=p</code> ngay từ lúc boot. Hai dòng đầu là ví dụ: <code>init/main.c</code> dòng 13 có ' +
            '<code>#define DEBUG</code>, nên mọi <code>pr_debug</code> trong file đó mặc định bật — dynamic debug ' +
            'tôn trọng <code>-DDEBUG</code>/<code>#define DEBUG</code> như giá trị ban đầu, nhưng vẫn cho bạn tắt. ' +
            'Các điểm còn lại trong 49 đến từ vài file khác có <code>-DDEBUG</code> trong Makefile ' +
            '(<code>drivers/scsi/libsas</code>, <code>kernel/power</code>…). Giờ nạp module:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /tdemo.ko\n' +
            'grep tdemo /proc/dynamic_debug/control' },

          { t: 'code', where: 'out', nocopy: true, code:
            'tdemo.c:19 [tdemo]td_step =_ "step %u checksum %u\\n"\n' +
            'tdemo.c:87 [tdemo]td_init =_ "init done\\n"' },

          { t: 'p', x:
            'Hai dòng xuất hiện ngay khi module nạp — đúng hai bản ghi đã đếm trong section <code>__dyndbg</code> ' +
            'ở bước 2. Cả hai <code>=_</code>: tắt, vì <code>tdemo.c</code> không có <code>-DDEBUG</code>. ' +
            'Bật cả module, đo lại, rồi tắt:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'dmesg -n 1\n' +
            'echo \'module tdemo +p\' > /proc/dynamic_debug/control\n' +
            'grep tdemo /proc/dynamic_debug/control\n' +
            'echo "debug 1000" > /proc/tdemo\n' +
            'echo \'module tdemo -p\' > /proc/dynamic_debug/control\n' +
            'echo "debug 1000" > /proc/tdemo\n' +
            'dmesg | grep "debug x1000"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'tdemo.c:19 [tdemo]td_step =p "step %u checksum %u\\n"\n' +
            'tdemo.c:87 [tdemo]td_init =p "init done\\n"\n' +
            '[   11.181884] tdemo: debug x1000: 34233008 ns total, 34233 ns per call\n' +
            '[   12.552253] tdemo: debug x1000: 114144 ns total, 114 ns per call',
            notes: ['Dấu thời gian và số ns sẽ khác trên máy bạn.'] },

          { t: 'cmdx', cmd: "echo 'module tdemo +p' > /proc/dynamic_debug/control", rows: [
            ['<code>module tdemo</code>', 'Phần chọn: mọi điểm thuộc module <code>tdemo</code> (hai dòng)'],
            ['<code>+p</code>', 'Phép đổi: thêm cờ <code>p</code> (in). <code>-p</code> bỏ cờ'],
            ['<code>\'…\'</code>', 'Nháy đơn để shell không đụng vào khoảng trắng; cả câu truy vấn là một chuỗi'],
            ['<code>&gt; /proc/dynamic_debug/control</code>', 'Ghi vào file điều khiển. Kernel phân tích câu truy vấn, rồi sửa static key của từng dòng khớp']
          ] },

          { t: 'p', x:
            'Cờ đổi từ <code>=_</code> sang <code>=p</code>, và lệnh <code>debug 1000</code> tốn <b>34 233 ns</b> mỗi ' +
            'lần lặp — ngang <code>pr_info</code> chặn console ở bước 3, vì lúc này nó <i>là</i> một printk. Tắt đi ' +
            '(<code>-p</code>), cùng lệnh tốn <b>114 ns</b>: về lại bậc của <code>quiet</code> (lần đầu sau khi đổi ' +
            'thường hơi chậm, như lần 122 ns ở bước 3), không nạp lại module, không build lại. Đây chính là thứ Bài 53 thiếu khi <code>-DDEBUG</code> làm hỏng phép đo ' +
            '<code>ioctl</code>.' },

          { t: 'p', x:
            'Thu hẹp hơn: chỉ dòng 19, và thêm tên hàm (<code>f</code>) cùng số dòng (<code>l</code>) vào đầu mỗi ' +
            'thông điệp — hữu ích khi nhiều hàm in chuỗi giống nhau:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo \'file tdemo.c line 19 +pfl\' > /proc/dynamic_debug/control\n' +
            'grep tdemo /proc/dynamic_debug/control\n' +
            'echo "debug 1000" > /proc/tdemo\n' +
            'dmesg | grep "step 999"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'tdemo.c:19 [tdemo]td_step =pfl "step %u checksum %u\\n"\n' +
            'tdemo.c:87 [tdemo]td_init =_ "init done\\n"\n' +
            '[   11.181564] tdemo: step 999 checksum 562641396\n' +
            '[   15.396358] td_step:19: tdemo: step 999 checksum 1888649692' },

          { t: 'p', x:
            'Chỉ dòng 19 đổi thành <code>=pfl</code>; dòng 87 vẫn <code>=_</code>. Hai dòng <code>step 999</code>: dòng ' +
            'thứ nhất (giây 11,18) từ lần bật bằng <code>+p</code> phía trên, dòng thứ hai (giây 15,40) từ lần này — ' +
            'giờ mở đầu bằng <code>td_step:19:</code> — tên hàm và số dòng do dynamic debug chèn vào, không có trong chuỗi định dạng ' +
            'của bạn. Câu truy vấn <code>func td_step +p</code> cho cùng kết quả theo tên hàm.' },

          { t: 'p', x:
            'Dòng 87 nằm trong <code>td_init</code>, chạy đúng một lần lúc nạp — bật sau khi nạp thì đã muộn. Tham ' +
            'số ảo <code>dyndbg</code> giải quyết việc đó:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo \'module tdemo =_\' > /proc/dynamic_debug/control\n' +
            'rmmod tdemo\n' +
            'insmod /tdemo.ko dyndbg=+p\n' +
            'dmesg | grep "init done"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   18.173291] tdemo: init done' },

          { t: 'p', x:
            '<code>init done</code> xuất hiện — lần nạp đầu tiên ở trên (giây 7,6) không in dòng này: <code>dyndbg=+p</code> được áp vào bảng <code>__dyndbg</code> của ' +
            'module <b>trước</b> khi <code>td_init</code> chạy. <code>modinfo tdemo.ko</code> không liệt kê tham số ' +
            'này — mọi module tự có nó.' },

          { t: 'p', x:
            'Cuối cùng là lúc boot, cho mã chạy trước khi bạn có shell. Boot lại với một câu truy vấn trên dòng lệnh ' +
            'kernel, tắt sáu điểm <code>pr_debug</code> mặc định bật của <code>init/main.c</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append \'console=ttyAMA0 rdinit=/init nokaslr dyndbg="file init/main.c -p"\'' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'grep -c "init/main.c.*=p" /proc/dynamic_debug/control' },

          { t: 'code', where: 'out', nocopy: true, code: '0',
            notes: ['Ở lần boot không có tham số này, cùng lệnh in <code>6</code>.'] },

          { t: 'p', x:
            'Từ <b>6</b> xuống <b>0</b>: câu truy vấn được áp ngay khi kernel đọc dòng lệnh, trước mọi ' +
            '<code>initcall</code>. Đây là cách bật <code>dev_dbg</code> của một driver built-in đang lỗi lúc ' +
            '<code>probe()</code> — ví dụ <code>dyndbg="file drivers/base/dd.c +p"</code> để xem lõi driver ' +
            'model khớp thiết bị với driver (Bài 44).' },

          { t: 'cal', kind: 'warn', title: 'Câu truy vấn khớp 0 dòng không báo lỗi',
            x: '<code>echo \'module nosuch +p\'</code> trả <code>rc=0</code> dù không có module nào tên ' +
               '<code>nosuch</code>. Chỉ lỗi <b>cú pháp</b> mới bị từ chối: <code>echo \'modul tdemo +p\'</code> → ' +
               '<code>sh: write error: Invalid argument</code>, <code>rc=1</code>, và <code>dmesg</code> có ' +
               '<code>dyndbg: unknown keyword "modul"</code>. Sau mỗi lần bật, <code>grep</code> lại file control ' +
               'để chắc rằng cờ đã đổi.' },

          { t: 'cal', kind: 'info', title: 'tdemo.dyndbg=+p trên dòng lệnh kernel không có tác dụng ở đây',
            x: 'Tài liệu (<code>dynamic-debug-howto.rst</code>, dòng 257 và 265) nói dạng ' +
               '<code>MODULE.dyndbg=…</code> trên dòng lệnh kernel được <b><code>modprobe</code></b> đọc từ ' +
               '<code>/proc/cmdline</code> và truyền cho module. Initramfs của bạn dùng <code>insmod</code> của ' +
               'BusyBox, không có <code>modprobe</code> đầy đủ: boot với <code>tdemo.dyndbg=+p</code> rồi ' +
               '<code>insmod /tdemo.ko</code> không in <code>init done</code>. Dùng ' +
               '<code>insmod … dyndbg=+p</code> như ở trên.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Ftrace bằng tay: function rồi function_graph',
        blocks: [
          { t: 'p', x:
            'Boot lại như bước 3 (có hay không có <code>log_buf_len</code> đều được). Initramfs của Bài 32 chỉ gắn ' +
            '<code>/proc</code> và <code>/sys</code>; tracefs phải gắn tay, rồi nhìn quanh:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'mount -t tracefs none /sys/kernel/tracing\n' +
            'ls /sys/kernel/tracing | wc -l\n' +
            'cat /sys/kernel/tracing/available_tracers\n' +
            'cat /sys/kernel/tracing/current_tracer\n' +
            'wc -l /sys/kernel/tracing/available_filter_functions' },

          { t: 'code', where: 'out', nocopy: true, code:
            '48\n' +
            'function_graph function nop\n' +
            'nop\n' +
            '68414 /sys/kernel/tracing/available_filter_functions' },

          { t: 'p', x:
            '<b>48</b> file điều khiển. Ba tracer — đúng ba thứ bước 1 đã bật, không hơn. <code>nop</code> đang ' +
            'chạy, nghĩa là chưa theo vết gì. <b>68 414</b> hàm của <code>vmlinux</code> có ổ cắm ftrace; số này ' +
            'nhỏ hơn số symbol <code>T</code>/<code>t</code> của kernel vì hàm <code>notrace</code>, hàm inline và ' +
            'mã chạy trước khi ftrace sẵn sàng không được tính. Nạp module và xem nó thêm gì vào danh sách:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'insmod /tdemo.ko\n' +
            'cd /sys/kernel/tracing\n' +
            'grep tdemo available_filter_functions' },

          { t: 'code', where: 'out', nocopy: true, code:
            'td_step [tdemo]\n' +
            'td_compute [tdemo]\n' +
            'td_store [tdemo]\n' +
            'td_write [tdemo]' },

          { t: 'p', x:
            'Bốn hàm trong <code>.text</code> của module — khớp bốn trong năm địa chỉ của ' +
            '<code>__patchable_function_entries</code> ở bước 2. Hàm thứ năm, <code>td_init</code>, đã chạy xong ' +
            'và bị giải phóng cùng <code>.init.text</code>. Giờ bật tracer <code>function</code>, nhưng chỉ cho ' +
            '<code>td_write</code>:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo td_write > set_ftrace_filter\n' +
            'cat set_ftrace_filter\n' +
            'echo function > current_tracer\n' +
            'echo "quiet 10" > /proc/tdemo\n' +
            'cat trace' },

          { t: 'code', where: 'out', nocopy: true, code:
            'td_write [tdemo]\n' +
            '[   11.245299] tdemo: quiet x10: 127808 ns total, 12780 ns per call\n' +
            '# tracer: function\n' +
            '#\n' +
            '# entries-in-buffer/entries-written: 1/1   #P:1\n' +
            '#\n' +
            '#                                _-----=> irqs-off/BH-disabled\n' +
            '#                               / _----=> need-resched\n' +
            '#                              | / _---=> hardirq/softirq\n' +
            '#                              || / _--=> preempt-depth\n' +
            '#                              ||| / _-=> migrate-disable\n' +
            '#                              |||| /     delay\n' +
            '#           TASK-PID     CPU#  |||||  TIMESTAMP  FUNCTION\n' +
            '#              | |         |   |||||     |         |\n' +
            '              sh-1       [000] .....    11.242298: td_write <-proc_reg_write',
            notes: ['Dấu thời gian sẽ khác trên máy bạn. <code>12780 ns per call</code> lớn bất thường vì đây là lần ghi đầu tiên sau <code>insmod</code> với chỉ 10 vòng — xem đoạn dưới.'] },

          { t: 'cmdx', cmd: 'echo td_write > set_ftrace_filter; echo function > current_tracer', rows: [
            ['<code>set_ftrace_filter</code>', 'Chỉ sửa ổ cắm của các hàm có tên ở đây. Ghi đè (<code>&gt;</code>) thay danh sách; nối (<code>&gt;&gt;</code>) thêm vào'],
            ['<code>td_write</code>', 'Tên hàm đúng như trong <code>available_filter_functions</code>, không cần <code>[tdemo]</code>'],
            ['<code>current_tracer</code>', 'Ghi tên tracer là bật ngay — kernel sửa lệnh <code>nop</code> thành lời gọi lúc này'],
            ['<code>cat trace</code>', 'Đọc ring buffer. Đọc không xoá; ghi rỗng (<code>echo &gt; trace</code>) mới xoá']
          ] },

          { t: 'p', x:
            '<code>cat set_ftrace_filter</code> xác nhận bộ lọc: <code>td_write [tdemo]</code>. ' +
            '<code>entries-written: 1/1</code>: đúng <b>một</b> sự kiện — một lần vào <code>td_write</code>, dù ' +
            'cả kernel đang chạy hàng trăm hàm. Dòng sự kiện cho biết thêm điều <code>printk</code> không nói: ' +
            '<code>td_write &lt;-proc_reg_write</code> — người gọi là <code>proc_reg_write</code>, lớp ' +
            '<code>/proc</code> chung của kernel, cùng hàm bạn đã thấy trong call trace ở Bài 64. Bạn biết ai gọi ' +
            'hàm của mình mà không đặt breakpoint, không dừng kernel.' },

          { t: 'cal', kind: 'info', title: 'Lần ghi đầu tiên sau insmod luôn chậm',
            x: '<code>12780 ns per call</code> ở trên không phải chi phí của tracer: <code>td_write</code> không ' +
               'nằm trong vòng lặp. Ở mọi lần boot của bài, lần ghi đầu tiên sau <code>insmod</code> đều chậm ' +
               '(7 084 và 12 780 ns với 10 vòng), còn các lần sau với 1 000 vòng về 31–55 ns. Đồ thị bên dưới cho ' +
               'thấy lý do: <code>td_step</code> đầu tiên tốn 30,56 µs, các lần sau 2,5 µs. Mã chạy lần đầu gặp ' +
               'cache lạnh, và trong QEMU còn phải được dịch sang lệnh x86 lần đầu. Khi đo, bỏ lần chạy đầu.' },

          { t: 'p', x:
            'Bây giờ tracer thứ hai. Tắt <code>function</code>, xoá bộ lọc, rồi bảo <code>function_graph</code> ' +
            'vẽ cây bắt đầu từ <code>td_write</code>:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo nop > current_tracer\n' +
            'echo > set_ftrace_filter\n' +
            'echo td_write > set_graph_function\n' +
            'echo function_graph > current_tracer\n' +
            'echo "quiet 10" > /proc/tdemo\n' +
            'cat trace | head -80' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   15.462978] tdemo: quiet x10: 782048 ns total, 78204 ns per call\n' +
            '# tracer: function_graph\n' +
            '#\n' +
            '# CPU  DURATION                  FUNCTION CALLS\n' +
            '# |     |   |                     |   |   |   |\n' +
            ' 0)               |  td_write [tdemo]() {\n' +
            ' 0)               |    ktime_get() {\n' +
            ' 0) ! 256.272 us  |      arch_counter_read();\n' +
            ' 0) ! 713.168 us  |    }\n' +
            ' 0) + 30.560 us   |    td_step [tdemo]();\n' +
            ' 0)   3.280 us    |    td_step [tdemo]();\n' +
            ' 0)   2.528 us    |    td_step [tdemo]();\n' +
            ' 0)   2.528 us    |    td_step [tdemo]();\n' +
            ' 0)   2.576 us    |    td_step [tdemo]();\n' +
            ' 0)   2.480 us    |    td_step [tdemo]();\n' +
            ' 0)   2.432 us    |    td_step [tdemo]();\n' +
            ' 0)   2.592 us    |    td_step [tdemo]();\n' +
            ' 0)   2.480 us    |    td_step [tdemo]();\n' +
            ' 0)   2.464 us    |    td_step [tdemo]();\n' +
            ' 0)               |    ktime_get() {\n' +
            ' 0)   2.960 us    |      arch_counter_read();\n' +
            ' 0)   9.424 us    |    }\n' +
            ' 0)               |    td_compute [tdemo]() {\n' +
            ' 0)               |      __delay() {\n' +
            ' 0) + 19.680 us   |        arch_timer_evtstrm_available();\n' +
            ' 0) ! 233.264 us  |      }\n' +
            ' 0) ! 259.088 us  |    }\n' +
            ' 0)               |    td_store [tdemo]() {\n' +
            ' 0) + 41.872 us   |      __kmalloc_noprof();\n' +
            ' 0) + 35.504 us   |      kfree();\n' +
            ' 0) ! 131.872 us  |    }\n' +
            ' 0)               |    _printk() {\n' +
            ' 0)               |      vprintk() {\n' +
            ' 0)               |        vprintk_default() {\n' +
            ' 0)               |          vprintk_emit() {\n' +
            ' 0)   3.216 us    |            panic_on_other_cpu();\n' +
            '…\n' +
            ' 0)               |            vprintk_store() {\n' +
            ' 0) + 15.056 us   |              printk_parse_prefix();\n' +
            '…\n' +
            ' 0) ! 412.528 us  |              }\n' +
            ' 0) ! 819.040 us  |            }',
            notes: ['Lệnh in 80 dòng; ở đây đã lược hai đoạn bên trong <code>vprintk_emit</code> (đánh dấu <code>…</code>). Các thời gian sẽ khác trên máy bạn, nhưng hình dạng cây giống hệt.'] },

          { t: 'p', x:
            'Đọc cây từ trên xuống, như đọc <code>td_write</code> trong <code>tdemo.c</code>: ' +
            '<code>ktime_get</code> (đọc đồng hồ, <code>t0</code>), mười <code>td_step</code>, ' +
            '<code>ktime_get</code> lần hai, <code>td_compute</code> → <code>__delay</code> (chính là ' +
            '<code>udelay(200)</code>, <b>233 µs</b>), <code>td_store</code> → <code>__kmalloc_noprof</code> + ' +
            '<code>kfree</code>, rồi <code>_printk</code> của dòng <code>pr_notice</code> — một cây sâu 8 tầng mà ' +
            'riêng phần <code>vprintk_store</code> đã <b>819 µs</b>. Mọi thứ <code>td_write</code> làm, kể cả bên ' +
            'trong kernel, hiện ra mà bạn không thêm một dòng code nào.' },

          { t: 'p', x:
            'Nhưng nhìn dòng đầu: module tự đo vòng lặp <b>782 048 ns</b> cho 10 lần, ~78 µs mỗi lần — trong khi ' +
            'không có tracer, 1 000 lần chỉ mất ~50 µs. Đồ thị đầy đủ ghi vào và ra của <i>mọi</i> hàm, kể cả ' +
            '<code>arch_counter_read</code> bên trong <code>ktime_get</code>, nên nó làm chậm đúng thứ đang đo. ' +
            '<code>!</code> trước <code>256.272 us</code> của <code>arch_counter_read</code> — một hàm chỉ đọc một ' +
            'thanh ghi — là chính chi phí đó, không phải sự thật về phần cứng.' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code: 'echo nop > current_tracer' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Đo thời gian trong kernel, chi phí của chính tracer, và trace-cmd',
        blocks: [
          { t: 'p', x:
            'Cách đầu tiên để bớt nhiễu: cắt cây ở độ sâu 1. Đồ thị chỉ còn một dòng mỗi lần gọi <code>td_write</code>, ' +
            'nhưng vẫn có thời gian. Chạy năm lần với các chế độ khác nhau:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo td_write > set_graph_function\n' +
            'echo 1 > max_graph_depth\n' +
            'echo function_graph > current_tracer\n' +
            'echo "quiet 10" > /proc/tdemo\n' +
            'echo "quiet 1000" > /proc/tdemo\n' +
            'echo "debug 1000" > /proc/tdemo\n' +
            'echo "info 1000" > /proc/tdemo\n' +
            'echo "trace 1000" > /proc/tdemo\n' +
            'cat trace' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   10.536476] tdemo: quiet x10: 70848 ns total, 7084 ns per call\n' +
            '[   11.234841] tdemo: quiet x1000: 425808 ns total, 425 ns per call\n' +
            '[   11.936119] tdemo: debug x1000: 422960 ns total, 422 ns per call\n' +
            '[   13.239626] tdemo: info x1000: 603485504 ns total, 603485 ns per call\n' +
            '[   13.340952] tdemo: trace x1000: 2624592 ns total, 2624 ns per call\n' +
            '# tracer: function_graph\n' +
            '#\n' +
            '# CPU  DURATION                  FUNCTION CALLS\n' +
            '# |     |   |                     |   |   |   |\n' +
            ' 0) # 5294.608 us |  td_write [tdemo]();\n' +
            ' 0) # 1777.664 us |  td_write [tdemo]();\n' +
            ' 0) # 1562.656 us |  td_write [tdemo]();\n' +
            ' 0) @ 604467.4 us |  td_write [tdemo]();\n' +
            ' 0)               |  td_write [tdemo]() {\n' +
            ' 0)               |  /* step 0 checksum 2299147583 */\n' +
            ' 0)               |  /* step 1 checksum 2554098338 */\n' +
            '…\n' +
            ' 0) # 3750.656 us |  }',
            notes: [
              'Lần chạy này là một lần boot mới, ngay sau <code>insmod</code>, console <b>không</b> bị chặn — giữa dòng <code>info x1000</code> và dòng trước nó, console còn in 1 000 dòng <code>step …</code> (đã lược). 998 dòng <code>/* step … */</code> trong <code>trace</code> cũng đã lược.',
              'Thời gian sẽ khác trên máy bạn; thứ tự độ lớn của năm dòng thì không.'
            ] },

          { t: 'p', x:
            'Năm dòng <code>td_write</code> tương ứng năm lần ghi, với thời gian <b>toàn bộ</b> lời gọi — thứ ' +
            'module tự đo không bao được (nó chỉ đo vòng lặp). Dấu <code>@</code> (&gt; 100 ms) đánh dấu lần ' +
            '<code>info 1000</code>: <b>0,6 giây</b> trong một lệnh <code>write()</code>, gần như toàn bộ là in ra ' +
            'console. Lần <code>trace 1000</code> có cấu trúc khác: các dòng <code>trace_printk</code> được chèn ' +
            '<b>vào giữa</b> đồ thị thành chú thích <code>/* … */</code>, đúng chỗ chúng xảy ra — đó là lý do ' +
            '<code>trace_printk</code> đi cùng ftrace tốt hơn <code>printk</code>.' },

          { t: 'cal', kind: 'warn', title: 'max_graph_depth bớt dòng ghi, không bớt chi phí',
            x: 'Vòng lặp <code>quiet 1000</code> đo <b>425 ns</b> mỗi lần, gấp ~8 lần lúc không tracer (45–55 ns ở ' +
               'bước 3), dù <code>td_step</code> không xuất hiện trong <code>trace</code>. <code>function_graph</code> ' +
               'vẫn sửa ổ cắm của mọi hàm và chỉ quyết định <i>lúc chạy</i> có ghi hay không theo độ sâu. Tương tự, ' +
               '<code>info 1000</code> đo 603 485 ns mỗi lần, gấp 5 lần bước 3: mọi hàm bên trong printk đều trả phí ' +
               'cửa vào. Muốn số gần thật, dùng profiler bên dưới.' },

          { t: 'p', x:
            'Đó là <b>function profiler</b>: không ghi từng sự kiện, chỉ cộng dồn trong kernel cho những hàm được ' +
            'lọc. Tắt đồ thị, chọn các hàm của module, bật profiler, chạy ba lần, tắt, đọc kết quả:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo nop > current_tracer\n' +
            'echo 0 > max_graph_depth\n' +
            'echo > set_graph_function\n' +
            'echo \'td_*\' > set_ftrace_filter\n' +
            'cat set_ftrace_filter' },

          { t: 'code', where: 'out', nocopy: true, code:
            'td_fill\n' +
            'td_done\n' +
            'td_free\n' +
            'td_alloc\n' +
            'td_to_noop.isra.0\n' +
            'td_step [tdemo]\n' +
            'td_compute [tdemo]\n' +
            'td_store [tdemo]\n' +
            'td_write [tdemo]' },

          { t: 'p', x:
            '<code>td_*</code> khớp <b>chín</b> hàm, không phải bốn: năm hàm đầu không có <code>[tdemo]</code>, tức ' +
            'là hàm của chính kernel có tên bắt đầu bằng <code>td_</code> (<code>td_fill</code>, ' +
            '<code>td_alloc</code>… trong mã USB). Ký tự đại diện áp lên <i>toàn bộ</i> 68 414 hàm. Cách chính xác ' +
            'là lọc theo module:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo \':mod:tdemo\' > set_ftrace_filter\n' +
            'cat set_ftrace_filter' },

          { t: 'code', where: 'out', nocopy: true, code:
            'td_step [tdemo]\n' +
            'td_compute [tdemo]\n' +
            'td_store [tdemo]\n' +
            'td_write [tdemo]',
            notes: ['Kết quả từ một lần boot khác (cùng kernel, cùng module); danh sách không phụ thuộc lần boot. Lúc kiểm chứng, profiler bên dưới chạy với bộ lọc <code>td_*</code>; năm hàm kernel thừa không được gọi nên không có trong bảng.'] },

          { t: 'p', x: 'Giờ đo:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo 1 > function_profile_enabled\n' +
            'echo "quiet 100" > /proc/tdemo\n' +
            'echo "quiet 100" > /proc/tdemo\n' +
            'echo "quiet 100" > /proc/tdemo\n' +
            'echo 0 > function_profile_enabled\n' +
            'cat trace_stat/function0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   21.940417] tdemo: quiet x100: 242896 ns total, 2428 ns per call\n' +
            '[   22.640968] tdemo: quiet x100: 111440 ns total, 1114 ns per call\n' +
            '[   23.341552] tdemo: quiet x100: 138080 ns total, 1380 ns per call\n' +
            '  Function                               Hit    Time            Avg             s^2\n' +
            '  --------                               ---    ----            ---             ---\n' +
            '  td_write                                 3    2749.136 us     916.378 us      165568.3 us \n' +
            '  td_compute                               3    616.528 us      205.509 us      20.752 us   \n' +
            '  td_step                                300    148.576 us      0.495 us        3.047 us    \n' +
            '  td_store                                 3    20.320 us       6.773 us        3.687 us    ',
            notes: ['Thời gian sẽ khác trên máy bạn; số lần gọi (<code>Hit</code>) thì không.'] },

          { t: 'cmdx', cmd: 'cat trace_stat/function0', rows: [
            ['<code>function0</code>', 'Kết quả của CPU 0. Máy có N CPU thì có <code>function0</code> … <code>function(N-1)</code>'],
            ['<code>Hit</code>', 'Số lần gọi. 3 lần ghi × 100 vòng = <b>300</b> <code>td_step</code> — đếm chính xác, không ước lượng'],
            ['<code>Time</code>', 'Tổng thời gian trong hàm, <b>gồm cả hàm con</b> (như <code>DURATION</code> của <code>function_graph</code>)'],
            ['<code>Avg</code>', '<code>Time / Hit</code>'],
            ['<code>s^2</code>', 'Phương sai: lớn nghĩa là thời gian dao động mạnh giữa các lần gọi']
          ] },

          { t: 'p', x:
            'Đây là câu trả lời cho "đo thời gian thực thi trong kernel". <b><code>td_compute</code>: 205,5 µs ' +
            'trung bình, phương sai chỉ 20,75</b> — ổn định, và khớp <code>udelay(200)</code> cộng ~5 µs chi phí ' +
            'gọi. <b><code>td_step</code>: 0,495 µs</b>, nhân 300 lần = 148 µs. <code>td_store</code> ' +
            '(<code>kmalloc</code> + <code>kfree</code>) 6,8 µs. <code>td_write</code> 916 µs trung bình nhưng ' +
            'phương sai 165 568 — lần đầu chậm hơn hẳn hai lần sau (hãy so với 2 428 rồi 1 114 ns mỗi vòng ở các ' +
            'dòng <code>dmesg</code>). Nếu đây là driver thật và ai đó hỏi "<code>write()</code> chậm vì đâu", bạn ' +
            'đã có câu trả lời bằng số: <code>td_compute</code> chiếm 616 trên 2 749 µs, phần còn lại phần lớn là ' +
            '<code>pr_notice</code>.' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code: 'echo > set_ftrace_filter' },

          { t: 'p', x:
            'Mọi công cụ đo đều có giá; câu hỏi là bao nhiêu và trả ở đâu. Thí nghiệm sau đo đúng điều đó: cùng ' +
            '<code>quiet 1000</code>, ba lần mỗi cấu hình, console chặn, trong một lần boot mới:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'mount -t tracefs none /sys/kernel/tracing\n' +
            'insmod /tdemo.ko\n' +
            'dmesg -n 1\n' +
            'cd /sys/kernel/tracing\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'echo td_step > set_ftrace_filter; echo function > current_tracer\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'echo nop > current_tracer; echo td_write > set_ftrace_filter; echo function > current_tracer\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'echo nop > current_tracer; echo > set_ftrace_filter; echo function > current_tracer\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'echo nop > current_tracer\n' +
            'for i in 1 2 3; do echo "quiet 1000" > /proc/tdemo; done\n' +
            'dmesg | grep "quiet x1000"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    8.431569] tdemo: quiet x1000: 45456 ns total, 45 ns per call\n' +
            '[    9.126862] tdemo: quiet x1000: 55360 ns total, 55 ns per call\n' +
            '[    9.829014] tdemo: quiet x1000: 50432 ns total, 50 ns per call\n' +
            '[   11.942193] tdemo: quiet x1000: 5644528 ns total, 5644 ns per call\n' +
            '[   12.641073] tdemo: quiet x1000: 2699280 ns total, 2699 ns per call\n' +
            '[   13.340228] tdemo: quiet x1000: 3166208 ns total, 3166 ns per call\n' +
            '[   16.141284] tdemo: quiet x1000: 31664 ns total, 31 ns per call\n' +
            '[   16.848178] tdemo: quiet x1000: 54848 ns total, 54 ns per call\n' +
            '[   17.551381] tdemo: quiet x1000: 50640 ns total, 50 ns per call\n' +
            '[   20.387934] tdemo: quiet x1000: 678784 ns total, 678 ns per call\n' +
            '[   21.084505] tdemo: quiet x1000: 1531392 ns total, 1531 ns per call\n' +
            '[   21.783727] tdemo: quiet x1000: 1089008 ns total, 1089 ns per call\n' +
            '[   23.177950] tdemo: quiet x1000: 113408 ns total, 113 ns per call\n' +
            '[   23.875906] tdemo: quiet x1000: 56208 ns total, 56 ns per call\n' +
            '[   24.575547] tdemo: quiet x1000: 52320 ns total, 52 ns per call',
            notes: ['Lúc kiểm chứng, mỗi lệnh được gõ riêng một dòng thay vì <code>for</code> và <code>;</code>. Số ns sẽ khác trên máy bạn; hãy so năm nhóm ba dòng với nhau.'] },

          { t: 'table',
            head: ['Cấu hình', 'ns mỗi vòng', 'Giải thích'],
            rows: [
              ['Không tracer', '<b>45 – 55</b>', 'Mốc'],
              ['<code>function</code>, lọc <code>td_step</code>', '<b>2 699 – 5 644</b>', 'Hàm nằm <i>trong</i> vòng lặp: mỗi vòng trả một lời gọi vào ftrace + một bản ghi — chậm 50–100 lần'],
              ['<code>function</code>, lọc <code>td_write</code>', '<b>31 – 54</b>', 'Hàm nằm <i>ngoài</i> vòng lặp: ổ cắm của <code>td_step</code> vẫn là <code>nop</code>, vòng lặp không đổi'],
              ['<code>function</code>, không lọc (mọi hàm)', '<b>678 – 1 531</b>', 'Vòng lặp vẫn chỉ gọi <code>td_step</code> nên cùng bậc với dòng thứ hai; lần chạy này may hơn. Nhưng mỗi <code>write()</code> ghi ~29 700 sự kiện thay vì 1 000'],
              ['Tắt lại (<code>nop</code>)', '<b>52 – 113</b>', 'Về mốc ngay. Không còn dấu vết nào']
            ] },

          { t: 'p', x:
            'Bài học quan trọng nhất của bước này: <b>chi phí của ftrace chỉ phát sinh ở những hàm bạn bật</b>. ' +
            'Lọc đúng hàm ngoài đường nóng thì công cụ gần như vô hình; lọc vào giữa một vòng lặp chặt thì nó làm ' +
            'chậm vòng lặp hàng chục lần. Con số "~29 700 sự kiện" đến từ một lần đo khác:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'echo function > current_tracer\n' +
            'echo "quiet 1000" > /proc/tdemo\n' +
            'echo 0 > tracing_on\n' +
            'head -3 trace | tail -1\n' +
            'grep -c "td_step <-td_write" trace\n' +
            'echo nop > current_tracer; echo 1 > tracing_on' },

          { t: 'code', where: 'out', nocopy: true, code:
            '# entries-in-buffer/entries-written: 29664/29664   #P:1\n' +
            '1000',
            notes: ['Một lần boot mới: <code>mount</code> tracefs, <code>insmod</code>, <code>dmesg -n 1</code>, <code>cd /sys/kernel/tracing</code>, bộ lọc rỗng. Số 29 664 phụ thuộc lần chạy (ngắt timer rơi vào lúc nào); số 1 000 thì không.'] },

          { t: 'p', x:
            'Không lọc gì, một lệnh <code>echo</code> sinh <b>29 664</b> sự kiện; chỉ <b>1 000</b> trong số đó là ' +
            '<code>td_step</code> bạn quan tâm, phần còn lại là shell, syscall, ngắt timer và <code>printk</code>. ' +
            '<code>echo 0 &gt; tracing_on</code> dừng ghi <i>trước khi</i> bạn đọc, để chính lệnh <code>head</code> ' +
            'và <code>grep</code> không chen thêm sự kiện vào. Cùng thí nghiệm với <code>echo td_step &gt; ' +
            'set_ftrace_filter</code> cho <code>1000/1000</code>: bộ lọc giảm 30 lần lượng dữ liệu.' },

          { t: 'p', x:
            'Cuối cùng, <b><code>trace-cmd</code></b> gói mọi thao tác <code>echo</code> ở trên thành một lệnh: ' +
            'cấu hình tracer, chạy chương trình, dừng, chép ring buffer ra file <code>trace.dat</code>, và trả ' +
            'tracefs về trạng thái cũ. Cần một thư mục ghi được — initramfs không có <code>/tmp</code>:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'mkdir -p /tmp && cd /tmp\n' +
            'trace-cmd list -t\n' +
            'trace-cmd record -p function_graph -g td_write --max-graph-depth 2 -F sh -c \'echo "quiet 3" > /proc/tdemo\'\n' +
            'trace-cmd report' },

          { t: 'code', where: 'out', nocopy: true, code:
            'function_graph function nop\n' +
            '  plugin \'function_graph\'\n' +
            '[    9.246723] tdemo: quiet x3: 50704 ns total, 16901 ns per call\n' +
            'CPU0 data recorded at offset=0x953000\n' +
            '    4096 bytes in size\n' +
            'trace-cmd: No such file or directory\n' +
            '  Error: expected type 4 but read 5\n' +
            'cpus=1\n' +
            '              sh-62    [000]     9.244857: funcgraph_entry:                   |  td_write() {\n' +
            '              sh-62    [000]     9.245040: funcgraph_entry:      ! 346.896 us |    irq_enter_rcu();\n' +
            '              sh-62    [000]     9.245582: funcgraph_entry:      ! 197.168 us |    do_interrupt_handler();\n' +
            '              sh-62    [000]     9.245786: funcgraph_entry:      ! 131.168 us |    irq_exit_rcu();\n' +
            '              sh-62    [000]     9.245920: funcgraph_entry:        1.968 us   |    raw_irqentry_exit_cond_resched();\n' +
            '              sh-62    [000]     9.246235: funcgraph_entry:        3.360 us   |    ktime_get();\n' +
            '              sh-62    [000]     9.246249: funcgraph_entry:      + 20.592 us  |    td_step();\n' +
            '              sh-62    [000]     9.246279: funcgraph_entry:        1.376 us   |    td_step();\n' +
            '              sh-62    [000]     9.246282: funcgraph_entry:        1.184 us   |    td_step();\n' +
            '              sh-62    [000]     9.246287: funcgraph_entry:        2.064 us   |    ktime_get();\n' +
            '              sh-62    [000]     9.246295: funcgraph_entry:      ! 243.744 us |    td_compute();\n' +
            '              sh-62    [000]     9.246545: funcgraph_entry:      + 26.128 us  |    td_store();\n' +
            '              sh-62    [000]     9.246587: funcgraph_entry:      # 3161.408 us |    _printk();\n' +
            '              sh-62    [000]     9.249777: funcgraph_exit:       # 5138.192 us |  }',
            notes: ['Dòng đầu (<code>list -t</code>) lấy từ một lần boot khác. Phần còn lại là một lần boot mới, ngay sau <code>insmod /tdemo.ko</code>, không gắn tracefs bằng tay — <code>trace-cmd</code> tự tìm tracefs. PID (<code>sh-62</code>), dấu thời gian và các thời gian sẽ khác trên máy bạn.'] },

          { t: 'cmdx', cmd: 'trace-cmd record -p function_graph -g td_write --max-graph-depth 2 -F sh -c \'…\'', rows: [
            ['<code>record</code>', 'Bật tracer, chạy lệnh, ghi kết quả vào <code>./trace.dat</code>, rồi tắt tracer'],
            ['<code>-p function_graph</code>', 'Tracer (<i>plugin</i>) cần dùng — tương đương <code>echo … &gt; current_tracer</code>'],
            ['<code>-g td_write</code>', 'Tương đương <code>set_graph_function</code>'],
            ['<code>--max-graph-depth 2</code>', 'Tương đương <code>max_graph_depth</code>'],
            ['<code>-F</code>', 'Chỉ theo vết tiến trình của lệnh theo sau (và con của nó) — loại bỏ sự kiện của tiến trình khác'],
            ['<code>sh -c \'…\'</code>', 'Lệnh cần chạy. Bọc trong <code>sh -c</code> vì <code>&gt;</code> là việc của shell, không phải của <code>echo</code>'],
            ['<code>report</code>', 'Đọc <code>trace.dat</code> và in ra dạng chữ. File có thể chép về máy khác để đọc']
          ] },

          { t: 'p', x:
            'Cây ở độ sâu 2 giờ đọc gọn trong 14 dòng: ba <code>td_step</code>, <code>td_compute</code> ' +
            '<b>243,7 µs</b>, <code>td_store</code> 26 µs, và <code>_printk</code> <b>3,16 ms</b> — dòng ' +
            '<code>pr_notice</code> cuối hàm chiếm hơn nửa thời gian của cả <code>td_write</code> (5,14 ms). Ba dòng ' +
            '<code>irq_enter_rcu</code> / <code>do_interrupt_handler</code> / <code>irq_exit_rcu</code> là một ngắt ' +
            'timer rơi đúng vào lúc <code>td_write</code> đang chạy: <code>function_graph</code> vẽ nó lồng bên ' +
            'trong, vì CPU thực sự đã rời <code>td_write</code> để chạy ngắt. Một bản theo vết khác sẽ có ngắt ở chỗ ' +
            'khác hoặc không có. <code>sh-62</code>: lần này tác vụ là <code>sh</code> con do <code>-F</code> chạy, ' +
            'không phải PID 1.' },

          { t: 'cal', kind: 'warn', title: 'Hai dòng lỗi của trace-cmd 2.8.3',
            x: '<code>trace-cmd: No such file or directory</code> / <code>Error: expected type 4 but read 5</code> ' +
               'xuất hiện ở <b>mọi</b> lần <code>report</code> trong bài, nhưng phần còn lại của báo cáo đầy đủ: số ' +
               '<code>td_step</code> khớp với số vòng mỗi lần. <code>trace-cmd</code> 2.8.3 (2020) cũ hơn kernel ' +
               '6.18 nhiều năm; nguyên nhân chính xác chưa được truy tới. Tương tự, <code>trace-cmd reset</code> ' +
               'thất bại (<code>rc=2</code>) vì tìm <code>tracing_max_latency</code> — file chỉ có khi bật các ' +
               'tracer đo độ trễ. Không cần <code>reset</code>: <code>record</code> đã tự trả tracer về ' +
               '<code>nop</code>. Trên máy thật, dùng bản <code>trace-cmd</code> mới hơn (3.x) nếu có.' },

          { t: 'p', x:
            '<code>trace-cmd</code> còn ghép được hàm với <b>sự kiện</b> (tracepoint) — các điểm ghi đặt sẵn ' +
            'trong kernel, như <code>kmem:kmalloc</code> mỗi lần cấp phát. Theo vết bốn hàm của module cùng mọi ' +
            '<code>kmalloc</code>:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
            'trace-cmd record -p function -l \':mod:tdemo\' -e kmem:kmalloc -F sh -c \'echo "quiet 10" > /proc/tdemo\' > /dev/null 2>&1\n' +
            'trace-cmd report 2>/dev/null | grep -E \'td_|tdemo\' | head -20' },

          { t: 'code', where: 'out', nocopy: true, code:
            '              sh-67    [000]    21.968287: function:             td_write <-- proc_reg_write\n' +
            '              sh-67    [000]    21.968309: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968312: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968313: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968314: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968315: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968315: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968316: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968317: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968318: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968318: function:             td_step <-- td_write\n' +
            '              sh-67    [000]    21.968321: function:             td_compute <-- td_write\n' +
            '              sh-67    [000]    21.968532: function:             td_store <-- td_write\n' +
            '              sh-67    [000]    21.968536: kmalloc:              call_site=td_store ptr=0xffff0000055fbd00 bytes_req=40 bytes_alloc=64 gfp_flags=GFP_KERNEL node=-1 accounted=false',
            notes: ['<code>ptr=</code> là địa chỉ thật trong heap kernel, sẽ khác mỗi lần chạy.'] },

          { t: 'cmdx', cmd: 'trace-cmd record -p function -l \':mod:tdemo\' -e kmem:kmalloc …', rows: [
            ['<code>-l \':mod:tdemo\'</code>', 'Tương đương <code>set_ftrace_filter</code>; nháy đơn để shell không đụng vào dấu <code>:</code>'],
            ['<code>-e kmem:kmalloc</code>', 'Bật thêm một sự kiện: <code>hệ thống:tên</code>. <code>trace-cmd list -e</code> liệt kê tất cả'],
            ['<code>&gt; /dev/null 2&gt;&amp;1</code>', 'Giấu các dòng trạng thái của <code>record</code> (đã thấy ở trên)'],
            ['<code>grep -E \'td_|tdemo\'</code>', 'Chỉ giữ dòng của module: <code>-F</code> theo cả <code>execve</code> của <code>sh</code>, nên có thêm hàng chục <code>kmalloc</code> của việc khởi động tiến trình']
          ] },

          { t: 'p', x:
            'Hàm và sự kiện xen kẽ theo đúng thứ tự thời gian: <code>td_write</code> được gọi từ ' +
            '<code>proc_reg_write</code>, mười <code>td_step</code> cách nhau ~1 µs, <code>td_compute</code>, ' +
            '<b>211 µs</b> sau (<code>21.968532 − 21.968321</code>) mới tới <code>td_store</code> — khoảng trống ' +
            'đó chính là <code>udelay(200)</code>. Rồi sự kiện <code>kmalloc</code> với <code>call_site=td_store</code>: ' +
            '<code>bytes_req=40</code> là <code>kmalloc_array(10, 4)</code>, <code>bytes_alloc=64</code> là kích ' +
            'thước lớp gần nhất — đúng quy luật <code>ksize</code> Bài 51 đã đo. Bạn thấy <i>cả</i> luồng điều ' +
            'khiển lẫn dữ liệu của một lời gọi, từ ngoài vào trong, mà module không in một dòng nào.' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>ERROR: modpost: "__dynamic_pr_debug" [tdemo.ko] undefined!</code> (và <code>"__trace_bprintk"</code>)',
         'Đã bật <code>DYNAMIC_DEBUG</code>/<code>FTRACE</code> và build lại <code>Image</code> nhưng chưa <code>make modules</code>, nên <code>Module.symvers</code> vẫn là bản cũ.',
         'Chạy <code>make … modules</code> trong <code>~/bai38</code> (bước 1), rồi build lại module.'],
        ['<code>.gnu.linkonce.this_module section size must match the kernel\'s built struct module size</code>, <code>insmod</code> trả 8',
         'Một <code>.ko</code> build cho kernel trước bài này; <code>struct module</code> đã thêm trường cho ftrace/dynamic debug.',
         '<code>make clean &amp;&amp; make</code> trong thư mục của module đó.'],
        ['<code>cat: can\'t open \'/sys/kernel/tracing/trace\': No such file or directory</code> (thư mục rỗng)',
         'tracefs chưa được gắn — initramfs của Bài 32 chỉ gắn <code>/proc</code> và <code>/sys</code>.',
         '<code>mount -t tracefs none /sys/kernel/tracing</code>.'],
        ['<code>/proc/dynamic_debug/control</code> không tồn tại',
         'Kernel không có <code>CONFIG_DYNAMIC_DEBUG</code> (trước bước 1, hoặc boot nhầm <code>Image</code> cũ).',
         'Kiểm tra <code>uname -v</code> trong máy ảo bắt đầu bằng <code>#7</code> (bản build của bước 1); nếu không, xem lại bước 1.'],
        ['<code>sh: write error: Invalid argument</code> khi ghi vào <code>dynamic_debug/control</code>',
         'Câu truy vấn sai cú pháp; <code>dmesg</code> có <code>dyndbg: unknown keyword …</code>.',
         'Đọc dòng <code>dyndbg:</code> trong <code>dmesg</code>, sửa từ khoá (<code>module</code>, <code>file</code>, <code>func</code>, <code>line</code>).'],
        ['Ghi vào <code>control</code> thành công nhưng không có dòng nào in ra',
         'Câu truy vấn khớp 0 dòng (tên module/hàm sai) — không có lỗi nào báo; hoặc console đang bị chặn (<code>dmesg -n 1</code>).',
         '<code>grep TÊN /proc/dynamic_debug/control</code> và kiểm tra cờ đã thành <code>=p</code>; đọc bằng <code>dmesg</code>.'],
        ['<code>set_ftrace_filter</code> có cả <code>td_fill</code>, <code>td_alloc</code>… không phải của bạn',
         'Ký tự đại diện <code>td_*</code> áp lên mọi hàm của kernel, không chỉ module.',
         'Dùng <code>:mod:tdemo</code>, hoặc liệt kê đúng tên hàm.'],
        ['Hàm của bạn không có trong <code>available_filter_functions</code>',
         'GCC đã inline nó, hoặc nó là <code>__init</code> đã chạy xong, hoặc là <code>__exit</code>/<code>notrace</code>.',
         'Đánh dấu <code>noinline</code> nếu cần theo vết; hàm init chỉ theo vết được bằng <code>trace-cmd</code> khởi động <i>trước</i> <code>insmod</code>.'],
        ['Số đo khi theo vết lớn gấp 10–100 lần bình thường',
         'Chính tracer: mỗi hàm được bật trả một lời gọi vào ftrace, <code>function_graph</code> trả cả lúc vào lẫn lúc ra.',
         'Lọc hàm ngoài vòng lặp nóng, dùng <code>function_profile_enabled</code>, và không so số đo khi theo vết với số đo khi không.'],
        ['<code>dmesg</code> thiếu các dòng tổng kết, log boot biến mất',
         'Vòng log 128 KiB bị hàng nghìn dòng <code>printk</code> đẩy tràn.',
         'Boot với <code>log_buf_len=4M</code>, hoặc dùng <code>trace_printk</code>/ftrace thay cho printk.'],
        ['<code>trace-cmd: No such file or directory</code> / <code>Error: expected type 4 but read 5</code> khi <code>report</code>',
         '<code>trace-cmd</code> 2.8.3 cũ hơn kernel 6.18; cụ thể file nào thiếu chưa được truy tới.',
         'Bỏ qua — phần báo cáo phía dưới vẫn đầy đủ. Dùng <code>trace-cmd</code> 3.x nếu có.'],
        ['<code>trace-cmd reset</code> → <code>opening to \'/sys/kernel/tracing/tracing_max_latency\'</code>, <code>rc=2</code>',
         'File đó chỉ có khi kernel có tracer đo độ trễ (<code>irqsoff</code>…).',
         'Không cần <code>reset</code>; hoặc tắt tay: <code>echo nop &gt; current_tracer; echo &gt; set_ftrace_filter</code>.']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<code>printk</code> = ghi vòng log <b>+</b> đẩy ra console. Đo trong QEMU: vòng lặp trống <b>~50 ns</b>, <code>trace_printk</code> <b>~5 000 ns</b>, <code>pr_info</code> console chặn <b>~35 000 ns</b>, <code>pr_info</code> ra UART <b>~120 000 ns</b>. Và vòng log <b>128 KiB</b> làm mất dòng: 6 dòng tổng kết chỉ còn 3.',
      '<b>Dynamic debug</b> (<code>CONFIG_DYNAMIC_DEBUG</code>): mỗi <code>pr_debug</code> là một <b>static key</b> — một <code>nop</code> sửa được lúc chạy. Tắt thì miễn phí (bằng <code>quiet</code>); bật thì đúng bằng một printk.',
      '<code>echo \'module tdemo +p\' &gt; /proc/dynamic_debug/control</code>; thu hẹp bằng <code>file … line N</code>/<code>func</code>; <code>+pfl</code> thêm hàm và dòng. Lúc nạp: <b><code>insmod X.ko dyndbg=+p</code></b>; lúc boot: <b><code>dyndbg="…"</code></b>. Truy vấn khớp 0 dòng không báo lỗi.',
      '<b>Ftrace</b>: <code>-fpatchable-function-entry</code> đặt <code>nop</code> ở đầu <b>68 414</b> hàm; bật một hàm = sửa <code>nop</code> thành lời gọi. Điều khiển hoàn toàn qua tracefs: <code>current_tracer</code>, <code>set_ftrace_filter</code> (<code>:mod:NAME</code>), <code>set_graph_function</code>, <code>max_graph_depth</code>, <code>tracing_on</code>, <code>trace</code>.',
      '<code>function</code> cho "ai gọi" (<code>td_write &lt;-proc_reg_write</code>); <code>function_graph</code> cho cây và <b><code>DURATION</code></b> gồm cả hàm con, với dấu <code>+ ! # * @</code> = &gt;10 µs / 100 µs / 1 ms / 10 ms / 100 ms.',
      '<b><code>function_profile_enabled</code> + <code>trace_stat/function0</code></b> = đo thời gian trong kernel có thống kê: <code>td_compute</code> <b>205,5 µs</b> trung bình, <code>td_step</code> <b>300</b> lần × 0,495 µs.',
      'Chi phí tracer chỉ ở hàm được bật: lọc <code>td_step</code> (trong vòng lặp) chậm <b>50–100×</b>; lọc <code>td_write</code> (ngoài vòng lặp) <b>không đổi</b>. Không lọc: <b>29 664</b> sự kiện cho một <code>echo</code>.',
      '<b><code>trace-cmd record -p … -g/-l … -e … -F CMD</code></b> rồi <code>report</code>: một lệnh thay mọi <code>echo</code>, ghép hàm với sự kiện (<code>kmalloc: call_site=td_store bytes_req=40 bytes_alloc=64</code>).'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Bài này đo một lời gọi <code>write()</code>. <b>Bài 66 — Đo và tối ưu thời gian boot</b> đo cả một ' +
         'lần khởi động: từ lúc QEMU nạp <code>Image</code> tới dấu nhắc shell. Bạn đã thấy ' +
         '<code>initcall_debug</code> ở Bài 44 và dấu thời gian <code>[    5.6…]</code> trong mọi bản ghi của ' +
         'bài này; Bài 66 dùng chúng cùng <code>bootgraph</code> để tìm ra initcall nào ăn nhiều thời gian nhất, ' +
         'cắt bớt kernel, bootloader và init, và đặt mục tiêu boot dưới 1 giây — với từng mili giây được đo, ' +
         'không đoán.' }
  ],

  quiz: [
    { q: 'Một driver chạy đúng khi bạn thêm vài <code>pr_info</code> vào hàm xử lý ngắt để tìm lỗi, nhưng hỏng lại khi bạn xoá chúng. Giải thích hợp lý nhất?',
      opts: [
        '<code>pr_info</code> sửa một biến toàn cục của driver',
        'Mỗi <code>pr_info</code> ra console thêm hàng chục tới hàng trăm micro giây, đủ để đổi thứ tự sự kiện của một cuộc đua (race) — lỗi bị che đi, không được sửa',
        'Kernel tối ưu bỏ hàm xử lý ngắt khi không có <code>printk</code>',
        '<code>pr_info</code> tự động thêm một spinlock'
      ],
      a: 1,
      why: 'Bước 3 đo một <code>pr_info</code> ra UART ~120 µs. Trong code nhạy thời gian, chừng đó đủ để ngắt khác đến trước/sau, hoặc CPU kia xong việc trước — đúng loại lỗi của Bài 55/56. Đây là "heisenbug": công cụ quan sát thay đổi thứ được quan sát. Công cụ tốt thêm ít thời gian nhất và chỉ ở đúng chỗ: <code>trace_printk</code> (~40× rẻ hơn) hoặc ftrace lọc đúng hàm.' },

    { q: 'Kernel có <code>CONFIG_DYNAMIC_DEBUG=y</code>. Driver có 200 lời gọi <code>dev_dbg</code>, tất cả đang <code>=_</code>. Chi phí của chúng lúc chạy là gì?',
      opts: [
        'Bằng 200 lần <code>printk</code>, vì chuỗi vẫn được định dạng',
        'Gần bằng 0: mỗi lời gọi là một lệnh <code>nop</code> (static key) mà CPU chạy qua; chỉ khi bật, kernel mới sửa nó thành lệnh nhảy tới đoạn gọi printk',
        'Bằng 0 vì chúng đã bị trình biên dịch xoá',
        'Mỗi lời gọi kiểm tra một biến cờ trong RAM, khoảng 1 µs'
      ],
      a: 1,
      why: 'Bước 2 thấy <code>nop</code> tại <code>0x54</code> trong <code>td_step</code>, và bước 3 đo <code>debug</code> bằng <code>quiet</code> (~50 ns cho cả phép tính). Chúng không bị xoá — chuỗi và đoạn gọi <code>__dynamic_pr_debug</code> vẫn có trong <code>.ko</code>, bản ghi nằm trong <code>__dyndbg</code> — nên mới bật được lúc chạy. Đây là lý do code kernel được phép rải <code>dev_dbg</code> khắp nơi.' },

    { q: 'Bạn chạy <code>echo \'func my_probe +p\' &gt; /proc/dynamic_debug/control</code>, lệnh không báo lỗi, nhưng <code>dmesg</code> không có thêm dòng nào khi thiết bị được probe. Nguyên nhân có khả năng nhất?',
      opts: [
        'Kernel đang panic',
        'Câu truy vấn khớp 0 dòng (sai tên hàm, hoặc hàm không có <code>pr_debug</code>/<code>dev_dbg</code>) — dynamic debug không báo lỗi khi không khớp gì; hoặc <code>probe()</code> đã chạy trước khi bạn bật',
        'Cần thêm <code>-DDEBUG</code> và build lại',
        '<code>console_loglevel</code> quá cao'
      ],
      a: 1,
      why: 'Bước 4: <code>module nosuch +p</code> trả <code>rc=0</code>; chỉ lỗi cú pháp mới bị từ chối. Luôn <code>grep</code> lại file control để xem cờ đã thành <code>=p</code>. Nếu <code>probe()</code> chạy lúc nạp module hay lúc boot, bật sau là muộn — dùng <code>insmod … dyndbg=+p</code> hoặc <code>dyndbg="…"</code> trên dòng lệnh kernel. Với <code>DYNAMIC_DEBUG</code> bật thì không cần <code>-DDEBUG</code>.' },

    { q: 'Trong đầu ra <code>function_graph</code> bạn thấy <code> 0) ! 259.088 us  |    }</code> đóng <code>td_compute() {</code>, và bên trong có <code> 0) ! 233.264 us  |      }</code> đóng <code>__delay() {</code>. Kết luận đúng?',
      opts: [
        '<code>td_compute</code> tự nó tốn 259 µs, cộng thêm 233 µs của <code>__delay</code> = 492 µs',
        '<code>td_compute</code> tốn 259 µs tổng cộng, trong đó 233 µs là <code>__delay</code>; thời gian riêng của <code>td_compute</code> chỉ khoảng 26 µs — nó chủ yếu chờ',
        'Dấu <code>!</code> nghĩa là hàm bị lỗi',
        '<code>__delay</code> chạy song song với <code>td_compute</code>'
      ],
      a: 1,
      why: '<code>DURATION</code> ở dòng <code>}</code> là từ lúc vào tới lúc ra, <b>gồm cả hàm con</b>. Thời gian riêng = tổng trừ hàm con. Dấu <code>!</code> chỉ là "lớn hơn 100 µs" (<code>kernel/trace/trace_output.c</code>, mảng <code>mark[]</code>), giúp mắt tìm chỗ chậm. Ở đây nó chỉ thẳng vào <code>udelay(200)</code>.' },

    { q: 'Bạn muốn đo <code>td_step</code>, hàm được gọi 1 000 lần trong một vòng lặp chặt. Bật <code>function</code> tracer chỉ cho <code>td_step</code> làm vòng lặp chậm từ ~50 lên ~3 000 ns mỗi lần. Cách nào cho số gần thật hơn?',
      opts: [
        'Bật <code>function_graph</code> không lọc gì',
        'Dùng <code>function_profile_enabled</code> với <code>set_ftrace_filter</code> = <code>td_step</code>, hoặc đo hàm gọi nó (<code>td_write</code>) và chia — rồi nhớ rằng mọi số đo khi đang theo vết đều đã cộng chi phí của tracer',
        'Thêm <code>pr_info</code> trước và sau <code>td_step</code>',
        'Tăng <code>buffer_size_kb</code>'
      ],
      a: 1,
      why: 'Bước 6: chi phí ftrace chỉ phát sinh ở hàm được bật. Lọc <code>td_step</code> (trong vòng lặp) chậm 50–100×; lọc <code>td_write</code> (ngoài vòng lặp) không đổi. Profiler không ghi từng sự kiện nên rẻ hơn, nhưng vẫn qua cùng ổ cắm — <code>td_step</code> đo 0,495 µs với profiler, so với ~0,05 µs không theo vết. <code>function_graph</code> không lọc còn tệ hơn; <code>pr_info</code> thêm ~120 µs mỗi lần.' },

    { q: 'Sau khi build lại <code>Image</code> với <code>CONFIG_FTRACE=y</code>, module của Bài 64 nạp không được: <code>.gnu.linkonce.this_module section size must match the kernel\'s built struct module size</code>. Vì sao, và sửa thế nào?',
      opts: [
        'Module bị hỏng file; tải lại mã nguồn',
        'Bật ftrace/dynamic debug thêm trường vào <code>struct module</code>, nên một <code>.ko</code> build cho kernel cũ có kích thước khác; build lại module sau khi đã <code>make modules</code> cho cây kernel (để <code>Module.symvers</code> cũng mới)',
        'Cần <code>insmod -f</code>',
        'Module thiếu <code>MODULE_LICENSE</code>'
      ],
      a: 1,
      why: '<code>struct module</code> có các trường chỉ tồn tại khi bật <code>CONFIG_FUNCTION_TRACER</code>/<code>CONFIG_DYNAMIC_DEBUG</code> (bảng ổ cắm ftrace, bảng <code>__dyndbg</code>…). Kernel so kích thước section này để từ chối module không khớp, thay vì đọc sai bộ nhớ. Đây là cùng họ với lỗi vermagic ở Bài 50: module gắn chặt với <i>đúng</i> cấu hình kernel đã build ra nó. Build lại cả <code>modules</code> trong cây kernel vì <code>Module.symvers</code> chỉ được viết lại ở bước đó.' }
  ]
});

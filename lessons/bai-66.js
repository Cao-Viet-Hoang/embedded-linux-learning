/* Bài 66 — Đo và tối ưu thời gian boot
   Chặng 12 — Debug, đo đạc, tối ưu
   Đo một lần boot QEMU bằng hai đồng hồ (stamp.py phía host + printk.time phía kernel), tìm initcall đắt
   nhất bằng initcall_debug + bootgraph, rồi cắt lần lượt kernel (bỏ ftrace, rồi tinyconfig), bootloader
   (U-Boot bootdelay 2 -> 0) và log console (quiet), từ ~4,1 s xuống 0,554–0,558 s tính cả U-Boot.
   Mọi số liệu đo 2026-10-31 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1 TCG, 16 CPU).
   - Bài này KHÔNG đổi ~/bai38: hai kernel nhỏ được build out-of-tree (O=) từ một bản giải nén mới của
     tarball trong ~/bai66/linux-6.18.45, vì ~/bai38 đã build in-tree và make O= từ chối nó.
   - U-Boot là gói Ubuntu focal u-boot-qemu 2021.01 (apt-get download, không cần sudo): U-Boot v2026.07 của
     Bài 34 không build được bằng GCC 9.4 ("Your GCC is older than 10.0").
   - scripts/show_delta của kernel 6.18.45 hỏng với Python 3 (string.split/string.atof) và in lại dòng
     không có delta mà không báo lỗi; bài thay bằng một dòng awk.
   - Image tinyconfig + 17 + PRINTK_TIME = 3 303 432 B, trùng từng byte với số Bài 41 đo trên máy A (GCC 15.2,
     không có PRINTK_TIME). Đã kiểm: Image = _edata - _text = 0x326808 trong System.map. Vì sao trùng: chưa rõ,
     sẽ kiểm lại nếu có dịp build lại trên máy A.
   - ~/bai66 (~2,8 GB: nguồn kernel 1,7G + b-small 902M + b-tiny 74M) là nháp, xoá được. */

Lesson.register({
  id: 'bai-66',
  title: 'Đo và tối ưu thời gian boot',
  minutes: 55,
  practice: 'Thực hành 50 phút',
  level: 'Nâng cao',

  intro:
    'Một camera hành trình phải ghi hình ngay khi xe nổ máy. Một màn hình ô tô phải hiện hình camera lùi trong ' +
    'vòng 2 giây theo quy định. Một thiết bị IoT chạy pin chỉ thức dậy vài giây mỗi giờ, và mỗi mili giây boot ' +
    'là pin. "Boot nhanh" là một yêu cầu sản phẩm có con số, không phải một mong muốn.<br><br>' +
    'Kernel bạn dùng từ Bài 65 cần <b>1,83–1,89 giây</b> để tới dấu nhắc shell trong QEMU, và thêm U-Boot với ' +
    'cấu hình mặc định thì thành <b>4,1 giây</b>. Bài này dạy bạn đo thời gian đó bằng <b>hai đồng hồ</b> khác ' +
    'nhau, dùng <code>initcall_debug</code> và <code>bootgraph</code> để biết từng mili giây đi đâu, rồi cắt ' +
    'lần lượt bootloader, kernel và log — mỗi lần cắt đều đo lại. Cuối bài, cả chuỗi U-Boot → kernel → shell ' +
    'chạy trong <b>0,554–0,558 giây</b>, và bạn biết chính xác phần nào đã mất đi để đổi lấy con số đó.',

  goals: [
    'Đo thời gian boot bằng hai đồng hồ — dấu thời gian <code>printk</code> trong kernel và đồng hồ phía host ' +
      '(<code>stamp.py</code>) — và giải thích vì sao chúng lệch nhau ở đầu boot.',
    'Bật <code>initcall_debug</code> đúng cách (kèm <code>log_buf_len=4M</code>), lấy <code>dmesg</code> ra ' +
      'khỏi máy ảo qua 9p, và xếp hạng initcall theo thời gian.',
    'Vẽ biểu đồ boot bằng <code>scripts/bootgraph.pl</code>, đọc nó, và biết vì sao nó có thể in ra một file ' +
      '"thành công" mà rỗng.',
    'Cắt kernel theo thứ tự có đo: <code>initcall_blacklist</code>, bỏ ftrace/dynamic debug, rồi ' +
      '<code>tinyconfig</code> — và nói được mỗi bước đổi lấy cái gì.',
    'Cắt bootloader (<code>bootdelay</code>, <code>bootcmd</code> trực tiếp) và log console (<code>quiet</code>), ' +
      'rồi tính được log console tốn bao lâu trên một UART thật 115 200 baud.',
    'Đạt mục tiêu boot dưới 1 giây cho cả chuỗi U-Boot → kernel → shell, với bảng số đo của từng bước.'
  ],

  blocks: [

    /* ============================================================
       1. BOOT GỒM NHỮNG GÌ, VÀ ĐO BẰNG ĐỒNG HỒ NÀO
       ============================================================ */
    { t: 'h2', x: 'Một lần boot gồm những đoạn nào' },

    { t: 'p', x:
      'Từ Bài 29 tới Bài 49 bạn đã đi qua từng mắt xích của chuỗi khởi động. Khi nói "thời gian boot", người ta ' +
      'thường muốn nói <b>từ lúc cấp nguồn tới lúc thiết bị làm được việc của nó</b> — ở bài này là lúc shell in ' +
      'dấu nhắc <code>~ #</code>. Khoảng đó chia thành bốn đoạn, và mỗi đoạn có công cụ đo riêng:' },

    { t: 'table',
      head: ['Đoạn', 'Bắt đầu → kết thúc', 'Trong QEMU của bài', 'Đo bằng'],
      rows: [
        ['Firmware + bootloader', 'Cấp nguồn → <code>Starting kernel ...</code>',
         'U-Boot từ flash, hoặc bỏ qua hẳn với <code>-kernel</code>', 'Đồng hồ host; U-Boot không có dấu thời gian'],
        ['Kernel trước <code>sched_clock</code>', 'Lệnh đầu tiên của kernel → đồng hồ kernel bắt đầu chạy',
         'Mọi dòng log đều ghi <code>[    0.000000]</code>', '<b>Chỉ</b> đồng hồ host (với <code>earlycon</code>)'],
        ['Kernel: initcall', '<code>sched_clock</code> → <code>Run /init as init process</code>',
         '~1 900 initcall chạy lần lượt', '<code>printk.time</code>, <code>initcall_debug</code>, <code>bootgraph</code>'],
        ['Userspace', '<code>/init</code> → dịch vụ chính sẵn sàng',
         'Một script 6 dòng rồi <code>exec /bin/sh</code>', 'Đồng hồ host; <code>systemd-analyze</code> nếu có systemd']
      ] },

    { t: 'p', x:
      'Điều quan trọng nhất của bảng này là cột cuối: <b>không có một đồng hồ nào nhìn thấy cả bốn đoạn</b>. Dấu ' +
      'thời gian <code>[    1.402307]</code> mà bạn thấy trong mọi bản ghi kernel từ Bài 41 là số giây kể từ khi ' +
      '<i>đồng hồ của kernel</i> bắt đầu đếm — nó không biết gì về U-Boot đã chạy bao lâu trước đó, và cũng ' +
      'không đếm được chính đoạn đầu của kernel trước khi bộ đếm được khởi tạo. Vì vậy bài này dùng thêm một ' +
      'đồng hồ thứ hai, nằm <b>ngoài</b> máy ảo.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="Dòng thời gian một lần boot với hai đồng hồ: đồng hồ host bắt đầu từ lúc chạy QEMU và thấy cả bốn đoạn; đồng hồ printk chỉ bắt đầu khi kernel khởi tạo sched_clock">' +
        '<text class="d-t" x="20" y="24">Đồng hồ host (stamp.py) — bắt đầu khi bạn gõ lệnh qemu</text>' +
        '<line class="d-line" x1="20" y1="40" x2="700" y2="40"/>' +
        '<path class="d-arrow" d="M706,40 l-8,-4 v8 z"/>' +
        '<rect class="d-box-w" x="20" y="60" width="150" height="56" rx="6"/>' +
        '<text class="d-t" x="95" y="84" text-anchor="middle">U-Boot</text>' +
        '<text class="d-ts" x="95" y="102" text-anchor="middle">bootdelay đếm ngược</text>' +
        '<rect class="d-box-a" x="176" y="60" width="110" height="56" rx="6"/>' +
        '<text class="d-t" x="231" y="84" text-anchor="middle">kernel sớm</text>' +
        '<text class="d-ts" x="231" y="102" text-anchor="middle">log ghi 0.000000</text>' +
        '<rect class="d-box-p" x="292" y="60" width="270" height="56" rx="6"/>' +
        '<text class="d-t" x="427" y="84" text-anchor="middle">initcall (~1 900 hàm)</text>' +
        '<text class="d-ts" x="427" y="102" text-anchor="middle">driver, hệ thống file, mạng, ftrace…</text>' +
        '<rect class="d-box-g" x="568" y="60" width="132" height="56" rx="6"/>' +
        '<text class="d-t" x="634" y="84" text-anchor="middle">/init → shell</text>' +
        '<text class="d-ts" x="634" y="102" text-anchor="middle">userspace</text>' +
        '<text class="d-tm" x="176" y="140" text-anchor="middle">Starting kernel ...</text>' +
        '<line class="d-line" x1="176" y1="120" x2="176" y2="128"/>' +
        '<text class="d-tm" x="292" y="160" text-anchor="middle">sched_clock: 57 bits at 63MHz</text>' +
        '<line class="d-line" x1="292" y1="120" x2="292" y2="148"/>' +
        '<text class="d-tm" x="568" y="140" text-anchor="middle">Run /init as init process</text>' +
        '<line class="d-line" x1="568" y1="120" x2="568" y2="128"/>' +
        '<text class="d-tm" x="700" y="160" text-anchor="end">~ #</text>' +
        '<text class="d-t" x="292" y="204">Đồng hồ printk — chỉ bắt đầu ở đây</text>' +
        '<line class="d-line" x1="292" y1="214" x2="700" y2="214"/>' +
        '<path class="d-arrow" d="M706,214 l-8,-4 v8 z"/>' +
        '<text class="d-ts" x="20" y="214">không thấy U-Boot,</text>' +
        '<text class="d-ts" x="20" y="230">không thấy kernel sớm</text>' +
        '<text class="d-ts" x="292" y="250">[    0.000054] … [    1.402307] Run /init — số giây kể từ sched_clock</text>' +
        '<text class="d-ts" x="20" y="276">Thời gian boot thật = đồng hồ host lúc thấy dấu nhắc. Dấu thời gian printk chỉ là một phần của nó.</text>' +
        '</svg>',
      cap: 'Hai đồng hồ nhìn cùng một lần boot. Đồng hồ printk bắt đầu muộn, nên nó luôn báo thời gian boot ' +
           '<b>ngắn hơn thật</b>: thiếu cả bootloader lẫn đoạn kernel sớm. Muốn biết sản phẩm boot mất bao lâu, ' +
           'phải đo từ bên ngoài.' },

    { t: 'cal', kind: 'why', title: 'Vì sao đầu boot toàn 0.000000',
      x: 'Dấu thời gian của <code>printk</code> lấy từ <code>local_clock()</code>, dựa trên <code>sched_clock</code>. ' +
         'Trên arm64, <code>sched_clock</code> đọc bộ đếm của <b>ARM generic timer</b> (63 MHz trong QEMU, dòng ' +
         '<code>arch_timer: cp15 timer running at 62.50MHz</code>), nhưng phải đợi <code>time_init()</code> chạy ' +
         'xong mới dùng được. Mọi thứ trước đó — phân tích Device Tree, dựng bảng trang, cấp phát bộ nhớ đầu tiên, ' +
         'khởi tạo ftrace — đều ghi <code>0.000000</code>. Bước 1 sẽ cho bạn thấy đoạn "0 giây" đó thực ra dài ' +
         '<b>0,27 giây</b> trên kernel của Bài 65.' },

    /* ============================================================
       2. INITCALL
       ============================================================ */
    { t: 'h2', x: 'initcall: phần lớn thời gian kernel nằm ở đây' },

    { t: 'p', x:
      'Bài 44 đã gặp <code>initcall_debug</code> khi theo dõi driver được <code>probe()</code>. Giờ là lúc hiểu ' +
      'nó đo cái gì. Mỗi đoạn code khởi tạo của kernel — một driver built-in, một hệ thống file, một giao thức ' +
      'mạng — đăng ký một hàm bằng macro như <code>module_init()</code>, <code>subsys_initcall()</code>, ' +
      '<code>late_initcall()</code>. Linker gom các con trỏ hàm đó vào những mảng riêng theo <b>cấp</b> (level), ' +
      'và <code>do_initcalls()</code> trong <code>init/main.c</code> gọi lần lượt từng hàm, cấp này xong mới sang ' +
      'cấp sau. Khi bạn thêm <code>initcall_debug</code> vào dòng lệnh kernel, hai hàm ở ' +
      '<code>init/main.c:1164–1181</code> in một dòng trước và một dòng sau mỗi lần gọi:' },

    { t: 'code', where: 'out', nocopy: true, name: 'init/main.c — hai dòng in ra cho mỗi initcall', code:
      'printk(KERN_DEBUG "calling  %pS @ %i\\n", fn, task_pid_nr(current));\n' +
      '...\n' +
      'printk(KERN_DEBUG "initcall %pS returned %d after %lld usecs\\n",\n' +
      '         fn, ret, (unsigned long long)ktime_us_delta(rettime, *calltime));' },

    { t: 'p', x:
      'Ba điều suy ra ngay từ hai dòng này, và cả ba sẽ quay lại trong phần thực hành. Một: chúng là ' +
      '<code>KERN_DEBUG</code>, mức 7, nên <b>không ra console</b> — bạn chỉ thấy chúng qua <code>dmesg</code>, ' +
      'đúng như Bài 41 đã giải thích về <code>console_loglevel</code>. Hai: với ~1 900 initcall, đó là gần ' +
      '<b>4 000 dòng</b>, quá sức vòng log 128 KiB mặc định — Bài 44 đã gặp và dùng <code>log_buf_len=4M</code>. ' +
      'Ba: con số <code>after … usecs</code> là hiệu của hai lần đọc đồng hồ, tức <b>thời gian trôi qua</b> ' +
      '(wall time), không phải thời gian CPU mà hàm đó thực sự dùng.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 220" width="720" role="img" aria-label="Mười cấp initcall theo thứ tự với thời điểm bắt đầu đo được: console 0.003, early 0.038, pure 0.105, core 0.108, postcore 0.138, arch 0.152, subsys 0.259, fs 0.355, device 0.435, late 1.209 giây; cấp device dài nhất">' +
        '<text class="d-t" x="20" y="24">Thời điểm bắt đầu mỗi cấp (giây, kernel Bài 65, có initcall_debug)</text>' +
        '<line class="d-line" x1="20" y1="120" x2="700" y2="120"/>' +
        '<rect class="d-box" x="20" y="60" width="44" height="40" rx="4"/>' +
        '<text class="d-ts" x="42" y="84" text-anchor="middle">console…</text>' +
        '<rect class="d-box" x="68" y="60" width="60" height="40" rx="4"/>' +
        '<text class="d-ts" x="98" y="78" text-anchor="middle">core</text>' +
        '<text class="d-ts" x="98" y="92" text-anchor="middle">postcore</text>' +
        '<rect class="d-box" x="132" y="60" width="66" height="40" rx="4"/>' +
        '<text class="d-ts" x="165" y="84" text-anchor="middle">arch</text>' +
        '<rect class="d-box" x="202" y="60" width="62" height="40" rx="4"/>' +
        '<text class="d-ts" x="233" y="84" text-anchor="middle">subsys</text>' +
        '<rect class="d-box" x="268" y="60" width="52" height="40" rx="4"/>' +
        '<text class="d-ts" x="294" y="84" text-anchor="middle">fs</text>' +
        '<rect class="d-box-w" x="324" y="60" width="270" height="40" rx="4"/>' +
        '<text class="d-t" x="459" y="84" text-anchor="middle">device — 0,77 s</text>' +
        '<rect class="d-box-a" x="598" y="60" width="102" height="40" rx="4"/>' +
        '<text class="d-t" x="649" y="84" text-anchor="middle">late</text>' +
        '<text class="d-tm" x="20" y="140">0.003</text>' +
        '<text class="d-tm" x="132" y="140">0.152</text>' +
        '<text class="d-tm" x="202" y="156">0.259</text>' +
        '<text class="d-tm" x="268" y="140">0.355</text>' +
        '<text class="d-tm" x="324" y="156">0.435</text>' +
        '<text class="d-tm" x="598" y="140">1.209</text>' +
        '<text class="d-tm" x="700" y="156" text-anchor="end">1.628 Run /init</text>' +
        '<text class="d-ts" x="20" y="184">module_init() của driver built-in rơi vào cấp device; late_initcall_sync chạy sau cùng.</text>' +
        '<text class="d-ts" x="20" y="202">Các ô không vẽ theo đúng tỉ lệ ở những cấp rất ngắn (console, early, pure gộp làm một).</text>' +
        '</svg>',
      cap: 'Các cấp initcall chạy tuần tự. Cấp <code>device</code> — nơi gần như mọi driver built-in khởi tạo — ' +
           'chiếm <b>0,77 s</b> trong 1,63 s tới <code>Run /init</code>. Muốn cắt thời gian kernel, nhìn vào ' +
           'đây trước. Các mốc lấy từ dòng <code>entering initcall level:</code> mà <code>initcall_debug</code> in ra.' },

    { t: 'terms', items: [
      ['initcall', '', 'Một hàm khởi tạo mà kernel gọi đúng một lần lúc boot. Driver built-in đăng ký bằng ' +
        '<code>module_init()</code>; nếu build thành <code>.ko</code>, cũng hàm đó chạy lúc <code>insmod</code>.'],
      ['initcall_debug', '', 'Tham số dòng lệnh kernel: in <code>calling</code>/<code>returned … after N usecs</code> ' +
        'cho mỗi initcall, ở mức <code>KERN_DEBUG</code>.'],
      ['printk.time', '', 'Tham số (và <code>CONFIG_PRINTK_TIME</code>) bật/tắt dấu <code>[giây.micro]</code> đầu ' +
        'mỗi dòng log. Đọc giá trị hiện tại ở <code>/sys/module/printk/parameters/time</code>.'],
      ['bootgraph', '', '<code>scripts/bootgraph.pl</code>: đọc <code>dmesg</code> có <code>initcall_debug</code> ' +
        'và vẽ một file SVG, mỗi initcall đủ lâu là một thanh ngang.'],
      ['initcall_blacklist', '', 'Tham số dòng lệnh: bỏ qua các initcall có tên trong danh sách. Dùng để <b>thử</b> ' +
        'xem bỏ một hàm thì boot nhanh hơn bao nhiêu, trước khi tắt nó hẳn trong <code>.config</code>.'],
      ['bootdelay', '', 'Biến môi trường U-Boot: số giây đếm ngược chờ người dùng nhấn phím trước khi tự chạy ' +
        '<code>bootcmd</code>.']
    ] },

    /* ============================================================
       3. NGUYÊN TẮC TỐI ƯU
       ============================================================ */
    { t: 'h2', x: 'Ba nguyên tắc trước khi cắt bất cứ thứ gì' },

    { t: 'list', ordered: true, items: [
      '<b>Đo trước, cắt sau, đo lại.</b> Mỗi thay đổi phải có số trước và số sau trên cùng một máy, cùng điều ' +
        'kiện. Một thay đổi "chắc chắn nhanh hơn" mà không đo thì không tồn tại — Bước 4 sẽ cho bạn một ví dụ ' +
        'initcall báo 95 ms nhưng bỏ đi chỉ được ~20 ms.',
      '<b>Đo nhiều lần, so khoảng.</b> QEMU giả lập CPU ARM bằng phần mềm; mỗi lần boot lệch nhau vài chục mili ' +
        'giây. Bài này chạy mỗi cấu hình 3 lần và luôn ghi khoảng (1,83–1,89 s), không ghi một số.',
      '<b>Cắt phần lớn nhất trước.</b> Bỏ 2 giây <code>bootdelay</code> đáng giá hơn mọi tối ưu initcall cộng lại. ' +
        'Bảng tổng kết ở Bước 6 xếp các bước theo đúng thứ tự đó.'
    ] },

    { t: 'cal', kind: 'danger', title: 'Không đo khi máy đang build',
      x: 'Lúc kiểm chứng bài này, ba lần boot đầu tiên chạy cùng lúc với một lần <code>make -j16</code> kernel ở ' +
         'nền: <code>Run /init</code> ở <b>4,73–4,82 s</b> và dấu nhắc ở <b>6,07–6,52 s</b>. Cùng lệnh đó, máy ' +
         'rảnh: 1,40 s và 1,83–1,89 s — chậm gấp ba lần chỉ vì CPU host bị chia. QEMU TCG nhạy với tải của máy ' +
         'Windows hơn phần cứng thật rất nhiều. Tắt build, tắt trình duyệt nặng, rồi mới đo.' },

    { t: 'table',
      head: ['Đòn bẩy', 'Tiết kiệm (đo trong bài)', 'Cái giá'],
      rows: [
        ['<code>bootdelay=2</code> → <code>0</code>', '<b>~2,0 s</b>', 'Gần như không còn cơ hội dừng ở dấu nhắc U-Boot'],
        ['Tắt ftrace + dynamic debug', '<b>~0,72 s</b> kernel', 'Mất toàn bộ công cụ của Bài 65 trên sản phẩm'],
        ['<code>tinyconfig</code> + 17 tuỳ chọn', 'thêm <b>~0,46 s</b>', 'Không mạng, không ổ đĩa, không devtmpfs, không <code>KALLSYMS</code>'],
        ['<code>quiet</code>', '~0,02–0,04 s trong QEMU; <b>~1,4 s</b> (tính) trên UART thật', 'Không thấy log boot trên console'],
        ['<code>initcall_blacklist=jent_mod_init</code>', '~0,02 s', 'Bỏ một nguồn entropy của bộ sinh số ngẫu nhiên']
      ] },

    { t: 'p', x:
      'Bảng trên là đích đến của bài, để bạn biết mình đang đi đâu. Mỗi dòng sẽ được đo ở phần thực hành. Lưu ý ' +
      'cột cuối: <b>mọi khoản tiết kiệm đều có giá</b>. Tối ưu boot là chọn những thứ sản phẩm không cần, chứ không ' +
      'phải tìm một công tắc "nhanh hơn" miễn phí.' },

    { t: 'cal', kind: 'info', title: 'Những kỹ thuật bài này chỉ nêu tên',
      x: '<b>Falcon mode</b> của U-Boot (SPL nạp thẳng kernel, bỏ qua U-Boot đầy đủ), <b>XIP</b> (chạy kernel ' +
         'thẳng từ flash), nén kernel bằng LZ4 thay vì gzip, <code>deferred_probe</code> và driver dạng module nạp ' +
         'sau khi ứng dụng chính đã chạy, <b>snapshot/hibernate boot</b>. Chúng phụ thuộc phần cứng hoặc bootloader ' +
         'cụ thể; trên QEMU <code>virt</code> không đo được chúng một cách có ý nghĩa, nên bài không giả vờ đo.' },

    /* ============================================================
       4. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ 4 giây xuống dưới 1 giây' },

    { t: 'p', x:
      'Cả bài làm trong <code>~/bai66</code>. Bạn cần kernel của Bài 65 trong <code>~/bai38</code> (đã có ' +
      '<code>PRINTK_TIME=y</code> sẵn từ <code>defconfig</code>), initramfs BusyBox của Bài 32 trong ' +
      '<code>~/bai32/initramfs</code>, tarball <code>~/bai38/linux-6.18.45.tar.xz</code> của Bài 38, và ' +
      '<code>python3-pexpect</code> (Bài 63 đã dùng). Không bước nào sửa <code>~/bai38</code>.' },

    { t: 'cal', kind: 'warn', title: 'Bài này tốn ~3 GB đĩa và ~6 phút build',
      x: 'Bước 4 giải nén một bản nguồn kernel mới (1,7 GB) và build một kernel đầy đủ out-of-tree (902 MB, ' +
         '<b>5 phút 22 giây</b> với 16 CPU). Bước 5 build thêm một kernel <code>tinyconfig</code> (74 MB, 36 giây). ' +
         'Mọi thứ nằm trong <code>~/bai66</code> và xoá được sau bài.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Hai đồng hồ cho một lần boot',
        blocks: [
          { t: 'p', x:
            'Đầu tiên là đồng hồ phía host. Ý tưởng rất đơn giản: chạy QEMU như một tiến trình con, đọc từng dòng ' +
            'nó in ra cổng nối tiếp, và gắn trước mỗi dòng số giây kể từ lúc bắt đầu chạy lệnh. Khi thấy dấu nhắc ' +
            '<code>~ #</code> thì dừng QEMU. Con số ở dòng dấu nhắc chính là thời gian boot "người dùng thấy". ' +
            'Tạo file <code>~/bai66/stamp.py</code>:' },

          { t: 'code', where: 'file', name: '~/bai66/stamp.py', code:
            '#!/usr/bin/env python3\n' +
            '# stamp.py - run a command, prefix each output line with host time since start,\n' +
            '# stop the command as soon as MARKER shows up in its output.\n' +
            'import os\n' +
            'import subprocess\n' +
            'import sys\n' +
            'import time\n' +
            '\n' +
            '\n' +
            'def emit(start, line):\n' +
            '    text = line.decode(errors="replace").rstrip("\\r")\n' +
            '    print("[%8.3f] %s" % (time.monotonic() - start, text), flush=True)\n' +
            '\n' +
            '\n' +
            'def main():\n' +
            '    if len(sys.argv) < 3:\n' +
            '        sys.exit("usage: stamp.py MARKER COMMAND [ARGS...]")\n' +
            '    marker = sys.argv[1].encode()\n' +
            '    start = time.monotonic()\n' +
            '    proc = subprocess.Popen(sys.argv[2:], stdin=subprocess.PIPE,\n' +
            '                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)\n' +
            '    pending = b""\n' +
            '    found = False\n' +
            '    while not found:\n' +
            '        chunk = os.read(proc.stdout.fileno(), 4096)\n' +
            '        if not chunk:\n' +
            '            break\n' +
            '        pending += chunk\n' +
            '        while b"\\n" in pending:\n' +
            '            line, pending = pending.split(b"\\n", 1)\n' +
            '            emit(start, line)\n' +
            '            if marker in line:\n' +
            '                found = True\n' +
            '        if not found and marker in pending:   # a prompt has no newline\n' +
            '            emit(start, pending)\n' +
            '            found = True\n' +
            '    proc.kill()\n' +
            '    proc.wait()\n' +
            '    print("[%8.3f] %s" % (time.monotonic() - start,\n' +
            '                          "marker seen" if found else "marker NOT seen"))\n' +
            '\n' +
            '\n' +
            'main()' },

          { t: 'cmdx', cmd: './stamp.py MARKER COMMAND [ARGS...]', title: 'stamp.py — bốn quyết định thiết kế',
            rows: [
              ['<code>time.monotonic()</code>', 'Đồng hồ không bao giờ nhảy lùi, kể cả khi giờ hệ thống bị chỉnh. ' +
               'Đo khoảng thời gian thì luôn dùng loại này, không dùng <code>time.time()</code>.'],
              ['<code>os.read(…, 4096)</code>', 'Đọc ngay khi có byte, không đợi đủ dòng. Dấu nhắc <code>~ # </code> ' +
               '<b>không có ký tự xuống dòng</b>; đọc theo dòng thì script sẽ đợi mãi.'],
              ['<code>stdin=subprocess.PIPE</code>', 'QEMU <code>-nographic</code> đọc bàn phím từ stdin. Cho nó một ' +
               'ống riêng để nó không tranh terminal của bạn.'],
              ['<code>proc.kill()</code>', 'Thấy dấu nhắc là xong việc đo; tắt QEMU luôn để lần đo sau bắt đầu sạch.']
            ] },

          { t: 'p', x:
            'Chép initramfs của Bài 32 sang và đóng gói lại. Bài này dùng bản sao để mọi thay đổi về sau không ' +
            'chạm vào <code>~/bai32</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai66\n' +
            'chmod +x stamp.py\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3871 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1030531 Oct 31 19:01 initramfs.cpio.gz' },

          { t: 'p', x:
            '<code>3871 blocks</code> là <code>cpio</code> báo đã ghi 3 871 khối 512 byte (≈1,9 MB chưa nén, gần ' +
            'hết là file <code>busybox</code> 1 980 720 byte); sau <code>gzip -9</code> còn <b>1 030 531 byte</b>. ' +
            'Kích thước nén có thể lệch vài byte giữa các lần đóng gói. Giờ boot kernel của Bài 65 qua ' +
            '<code>stamp.py</code>:' },

          { t: 'code', where: 'wsl', code:
            'K=~/bai38/linux-6.18.45/arch/arm64/boot/Image\n' +
            './stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel $K -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" > base.log\n' +
            'grep -a -E \'Booting Linux|console \\[ttyAMA0\\]|Run /init|~ # |marker\' base.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.579] [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[   0.587] [    0.192860] printk: console [ttyAMA0] enabled\n' +
            '[   1.787] [    1.402307] Run /init as init process\n' +
            '[   1.885] ~ # \n' +
            '[   1.887] marker seen',
            notes: ['Mọi con số thời gian trong bài sẽ khác trên máy bạn: QEMU giả lập CPU bằng phần mềm (TCG) và chạy nhanh hay chậm theo CPU và tải của máy Windows. Hãy so <b>tỉ lệ và bậc độ lớn</b> giữa các bước, không so chữ số.'] },

          { t: 'cmdx', cmd: 'K=… ; ./stamp.py \'~ # \' qemu-system-aarch64 … > base.log',
            title: 'Lệnh boot có đồng hồ',
            rows: [
              ['<code>K=…</code>', 'Một biến shell cho đường dẫn kernel, để các lệnh sau ngắn lại. Biến chỉ sống ' +
               'trong cửa sổ terminal này — mở terminal mới thì gõ lại.'],
              ['<code>\'~ # \'</code>', 'Dấu hiệu để dừng: dấu nhắc của BusyBox <code>sh</code>. Có dấu cách ở cuối, ' +
               'nên phải đặt trong nháy đơn.'],
              ['<code>-M virt -cpu cortex-a57 -m 512 -nographic</code>', 'Đúng máy ảo của Bài 32–65.'],
              ['<code>-append "console=ttyAMA0 rdinit=/init"</code>', 'Dòng lệnh kernel tối thiểu: log ra UART ' +
               'PL011, chạy <code>/init</code> trong initramfs. Bài 41 đã giải thích từng tham số.'],
              ['<code>&gt; base.log</code>', 'Giữ toàn bộ 256 dòng để đọc lại; màn hình chỉ cần vài dòng mốc.'],
              ['<code>grep -a -E \'…\'</code>', '<code>-a</code>: coi file là văn bản dù có byte lạ từ console; ' +
               '<code>\\[</code> vì <code>[</code> là ký tự đặc biệt trong regex.']
            ] },

          { t: 'p', x:
            'Mỗi dòng giờ có <b>hai</b> cột thời gian. Cột trái <code>[   1.885]</code> là đồng hồ host. Cột phải ' +
            '<code>[    1.402307]</code> là đồng hồ <code>printk</code> của kernel. Đọc bốn mốc theo thứ tự:' },

          { t: 'list', items: [
            '<b>0,579 s host</b> trước khi kernel in dòng đầu tiên: QEMU khởi động, nạp <code>Image</code> 60 MB và ' +
              'initramfs vào RAM ảo. Đồng hồ printk không thấy đoạn này — nó ghi <code>0.000000</code>.',
            '<code>console [ttyAMA0] enabled</code> ở <b>0,193 s</b> kernel nhưng <b>0,587 s</b> host — chỉ sau dòng ' +
              'đầu 8 ms. Mọi dòng trước nó được kernel giữ trong vòng log và xả ra một lượt khi console sẵn sàng ' +
              '(Bài 41 gọi đó là <i>replay</i>). Vì vậy đồng hồ host ở đầu log <b>không đo được</b> gì.',
            '<code>Run /init</code> ở <b>1,402 s</b> kernel và <b>1,787 s</b> host: chênh 0,385 s.',
            'Dấu nhắc ở <b>1,885 s</b> host. Userspace (script 6 dòng của Bài 32 rồi <code>exec /bin/sh</code>) mất ' +
              '~0,1 s.'
          ] },

          { t: 'p', x:
            'Một lần đo chưa đủ. Chạy ba lần và chỉ giữ dòng dấu nhắc, sau đó ba lần nữa với <code>quiet</code> — ' +
            'tham số mà Bài 41 đã giới thiệu, đẩy <code>console_loglevel</code> xuống 4 nên gần như không dòng nào ' +
            'ra console:' },

          { t: 'code', where: 'wsl', code:
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '    -kernel $K -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" > base-$i.log\n' +
            '  grep -a \'~ # \' base-$i.log\n' +
            'done\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '    -kernel $K -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init quiet" > quiet-$i.log\n' +
            '  grep -a \'~ # \' quiet-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   1.846] ~ # \n' +
            '[   1.838] ~ # \n' +
            '[   1.827] ~ # \n' +
            '[   1.801] ~ # \n' +
            '[   1.795] ~ # \n' +
            '[   1.838] ~ # ' },

          { t: 'p', x:
            'Ba dòng đầu (không <code>quiet</code>): <b>1,827–1,846 s</b>. Ba dòng sau (<code>quiet</code>): ' +
            '<b>1,795–1,838 s</b>. Hai khoảng <b>chồng lên nhau</b> — trong QEMU, tắt 246 dòng log console gần như ' +
            'không đổi gì. Đây là một kết quả đáng ngờ, và lý do nằm ở cổng nối tiếp ảo.' },

          { t: 'code', where: 'wsl', code:
            'grep -a \'\\] \\[\' base.log | sed \'s/^\\[ *[0-9.]*\\] //\' | wc -c' },

          { t: 'code', where: 'out', nocopy: true, code: '16027' },

          { t: 'p', x:
            'Lệnh lọc ra các dòng kernel (có hai cặp ngoặc vuông), bỏ cột đồng hồ host, rồi đếm byte: kernel in ' +
            '<b>16 027 byte</b> ra console trong lúc boot.' },

          { t: 'cal', kind: 'why', title: 'QEMU nói dối về tốc độ UART — bo mạch thật thì không',
            x: 'PL011 trong QEMU không mô phỏng tốc độ baud: mỗi byte kernel ghi vào thanh ghi dữ liệu được chuyển ' +
               'ngay sang stdout của QEMU. Trên một bo mạch thật ở <b>115 200 baud</b>, khung 8N1 dài 10 bit nên cổng ' +
               'chỉ đẩy được <b>11 520 byte/giây</b>. 16 027 byte ÷ 11 520 ≈ <b>1,39 giây</b> chỉ để in log boot — ' +
               'gần bằng cả thời gian boot kernel trong QEMU. Với console đồng bộ (Bài 65 đã đo <code>pr_info</code> ' +
               'ra UART chậm gấp ~3,5 lần khi chặn console), đó là 1,4 giây kernel đứng chờ. Vì vậy ' +
               '<code>quiet</code> là một trong những tối ưu đầu tiên trên sản phẩm thật, dù QEMU không cho bạn thấy ' +
               'lợi ích của nó.' },

          { t: 'p', x:
            'Còn lại đoạn mà đồng hồ printk ghi <code>0.000000</code>. Để thấy nó, cần console ngay từ lệnh đầu tiên ' +
            'của kernel: <code>earlycon</code> (Bài 41 đã dùng, Bài 42 giải thích cách nó tự tìm PL011 tại <code>0x9000000</code>). Với ' +
            'earlycon, mỗi dòng ra UART <b>ngay lúc được in</b>, không đợi replay, nên đồng hồ host đo được từng đoạn:' },

          { t: 'code', where: 'wsl', code:
            './stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel $K -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init earlycon" > early.log\n' +
            'grep -a -E \'Booting Linux|ftrace: alloc|NR_IRQS|sched_clock|Calibrating|console \\[ttyAMA0\\]|Run /init|~ # \' early.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.098] [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[   0.325] [    0.000000] ftrace: allocating 71822 entries in 282 pages\n' +
            '[   0.325] [    0.000000] ftrace: allocated 282 pages with 4 groups\n' +
            '[   0.352] [    0.000000] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0\n' +
            '[   0.368] [    0.000054] sched_clock: 57 bits at 63MHz, resolution 16ns, wraps every 4398046511096ns\n' +
            '[   0.376] [    0.007716] Calibrating delay loop (skipped), value calculated using timer frequency..\n' +
            '[   0.559] [    0.190486] printk: console [ttyAMA0] enabled\n' +
            '[   0.560] [    0.190486] printk: console [ttyAMA0] enabled\n' +
            '[   1.766] [    1.397751] Run /init as init process\n' +
            '[   1.842] ~ # ',
            notes: ['Dòng <code>Calibrating…</code> bị cắt bớt khi chụp (lệnh gốc có <code>cut -c1-100</code>). Dòng <code>console [ttyAMA0] enabled</code> xuất hiện hai lần là bình thường với earlycon: một lần qua bootconsole, một lần qua console thật — đúng hiện tượng "dòng bàn giao bị nhân đôi" của Bài 41.'] },

          { t: 'p', x:
            'Giờ đoạn "0 giây" hiện rõ. Kernel in dòng đầu ở <b>0,098 s</b> host (sớm hơn nhiều so với 0,579 s ở ' +
            'trên, vì earlycon in ngay thay vì đợi). Đồng hồ kernel bắt đầu chạy ở dòng <code>sched_clock</code>, ' +
            '<b>0,368 s</b> host. Vậy có <b>0,27 giây</b> kernel làm việc mà mọi dấu thời gian đều ghi ' +
            '<code>0.000000</code>. Và phần lớn của nó nằm giữa dòng trước <code>ftrace: allocating</code> (0,126 s ' +
            'trong <code>early.log</code>) và chính dòng đó (0,325 s): <b>~0,2 giây</b> để ftrace ghi lại ' +
            '<b>71 822</b> điểm vá — đúng cơ chế <code>__patchable_function_entries</code> mà Bài 65 đã giải thích, ' +
            'giờ hiện ra với giá của nó.' },

          { t: 'cal', kind: 'tip', title: 'Công thức nhớ: printk.time đếm từ sched_clock, không đếm từ lúc bật nguồn',
            x: 'Mỗi khi ai đó nói "kernel boot trong 1,4 giây" vì thấy <code>[    1.402307] Run /init</code>, hãy hỏi ' +
               'lại: còn bootloader và đoạn trước <code>sched_clock</code> thì sao? Trên kernel này, chỉ riêng đoạn ' +
               'trước <code>sched_clock</code> đã là 0,27 s — gần 20 % so với 1,4 s. Con số duy nhất khách hàng cảm ' +
               'nhận là đồng hồ bên ngoài.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — initcall_debug: xếp hạng ~1 900 hàm khởi tạo',
        blocks: [
          { t: 'p', x:
            'Dòng <code>initcall_debug</code> là <code>KERN_DEBUG</code>, không ra console, nên phải đọc bằng ' +
            '<code>dmesg</code> bên trong máy ảo. Gần 300 KB văn bản thì không nên cuộn trên màn hình QEMU; hãy ' +
            'đưa nó ra máy host qua <b>9p</b> — một thư mục của WSL gắn vào máy ảo như một ổ mạng. Kernel ' +
            '<code>defconfig</code> đã có sẵn <code>NET_9P_VIRTIO=y</code> và <code>9P_FS=y</code>. Script dưới ' +
            'đây boot, chờ dấu nhắc, gắn thư mục <code>share</code>, chép <code>dmesg</code> ra đó rồi tắt máy ảo:' },

          { t: 'code', where: 'file', name: '~/bai66/icd.py', code:
            '#!/usr/bin/env python3\n' +
            '# icd.py KERNEL INITRD LOG "APPEND" -- boot with a 9p share, copy dmesg to share/dmesg.txt\n' +
            'import sys, pexpect\n' +
            'kernel, initrd, log, append = sys.argv[1:5]\n' +
            'args = ["-M", "virt", "-cpu", "cortex-a57", "-m", "512", "-nographic",\n' +
            '        "-kernel", kernel, "-initrd", initrd, "-append", append,\n' +
            '        "-virtfs", "local,path=share,mount_tag=host,security_model=none"]\n' +
            'p = pexpect.spawn("qemu-system-aarch64", args, encoding="utf-8", timeout=60)\n' +
            'p.logfile_read = open(log, "w")\n' +
            'p.expect("~ # ")\n' +
            'for c in ["mkdir -p /mnt", "mount -t 9p -o trans=virtio host /mnt",\n' +
            '          "dmesg > /mnt/dmesg.txt", "umount /mnt"]:\n' +
            '    p.sendline(c)\n' +
            '    p.expect("~ # ")\n' +
            'p.terminate(force=True)' },

          { t: 'cmdx', cmd: '-virtfs local,path=share,mount_tag=host,security_model=none',
            title: 'Chia sẻ một thư mục host với máy ảo',
            rows: [
              ['<code>local,path=share</code>', 'Thư mục <code>~/bai66/share</code> trên WSL là gốc của chia sẻ.'],
              ['<code>mount_tag=host</code>', 'Tên mà máy ảo dùng để gắn: <code>mount -t 9p … host /mnt</code>.'],
              ['<code>security_model=none</code>', 'File máy ảo tạo ra mang quyền của user chạy QEMU (bạn). Đủ cho ' +
               'thư mục nháp; không dùng cho dữ liệu cần phân quyền.'],
              ['<code>mount -t 9p -o trans=virtio</code>', 'Phía khách: giao thức 9P chạy trên thiết bị virtio mà ' +
               '<code>-virtfs</code> tạo ra.']
            ] },

          { t: 'p', x:
            'Thử trước <b>không có</b> <code>log_buf_len</code>, để thấy cái bẫy Bài 44 đã nhắc tới bằng chính mắt ' +
            'mình:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p share\n' +
            'python3 icd.py $K initramfs.cpio.gz icd-small-buf.log "console=ttyAMA0 rdinit=/init initcall_debug"\n' +
            'head -n 2 share/dmesg.txt\n' +
            'grep -c \'initcall .* returned\' share/dmesg.txt\n' +
            'wc -c < share/dmesg.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.767835] initcall clk_mt8195_vdec_drv_init+0x0/0x38 returned 0 after 130 usecs\n' +
            '[    0.767884] calling  clk_mt8195_vdo0_drv_init+0x0/0x38 @ 1\n' +
            '842\n' +
            '125670' },

          { t: 'p', x:
            'Dòng đầu tiên của <code>dmesg</code> không phải <code>Booting Linux</code> mà là một initcall ở ' +
            '<b>0,768 s</b>. Mọi thứ trước đó đã bị ghi đè: vòng log 128 KiB (<code>CONFIG_LOG_BUF_SHIFT=17</code>) ' +
            'chỉ còn giữ <b>125 670 byte</b> cuối và <b>842</b> initcall. Phân tích trên dữ liệu này sẽ bỏ sót ' +
            'toàn bộ nửa đầu boot mà không báo lỗi gì. Giờ làm lại đúng cách:' },

          { t: 'code', where: 'wsl', code:
            'python3 icd.py $K initramfs.cpio.gz icd.log "console=ttyAMA0 rdinit=/init initcall_debug log_buf_len=4M"\n' +
            'cp share/dmesg.txt icd-ftrace.txt\n' +
            'head -n 1 icd-ftrace.txt\n' +
            'grep -c \'calling  \' icd-ftrace.txt\n' +
            'grep -c \'initcall .* returned\' icd-ftrace.txt\n' +
            'grep \'Run /init\' icd-ftrace.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '1916\n' +
            '1915\n' +
            '[    1.628348] Run /init as init process' },

          { t: 'p', x:
            'Lần này <code>dmesg</code> bắt đầu đúng từ <code>Booting Linux</code>, và có <b>1 915</b> initcall ' +
            'trọn vẹn. Số <code>calling</code> nhiều hơn một vì có một dòng PCI quirk cũng chứa chữ đó ' +
            '(<code>pci 0000:00:00.0: calling  quirk_mmio_always_on</code>) — không phải initcall. Chú ý ' +
            '<code>Run /init</code> giờ ở <b>1,628 s</b>, so với 1,40 s ở Bước 1: <b>chính <code>initcall_debug</code> ' +
            'tốn ~0,23 s</b> để in gần 4 000 dòng vào vòng log. Công cụ đo luôn có giá — Bài 65 đã đo điều đó với ' +
            'ftrace; ở đây nó làm các initcall trông chậm hơn một chút so với khi không đo.' },

          { t: 'p', x: 'Ba dòng đầu cho biết định dạng:' },

          { t: 'code', where: 'wsl', code: 'grep -m 3 -E \'calling  |initcall .* returned\' icd-ftrace.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.003172] calling  con_init+0x0/0x230 @ 0\n' +
            '[    0.006792] initcall con_init+0x0/0x230 returned 0 after 4000 usecs\n' +
            '[    0.006843] calling  hvc_console_init+0x0/0x40 @ 0' },

          { t: 'cmdx', cmd: 'initcall con_init+0x0/0x230 returned 0 after 4000 usecs', title: 'Đọc một cặp dòng initcall',
            rows: [
              ['<code>con_init+0x0/0x230</code>', 'Tên hàm, nhờ <code>%pS</code> + <code>KALLSYMS</code>. ' +
               '<code>+0x0</code>: đầu hàm; <code>/0x230</code>: hàm dài 560 byte — cùng ký hiệu bạn đọc trong call ' +
               'trace ở Bài 64.'],
              ['<code>@ 0</code>', 'PID gọi nó. Initcall cấp <code>console</code> chạy từ <code>start_kernel()</code>, ' +
               'trước khi tiến trình 1 tồn tại, nên là PID 0. Mọi initcall khác chạy trong <code>kernel_init</code>, ' +
               'PID 1.'],
              ['<code>returned 0</code>', 'Giá trị trả về. <code>0</code> = thành công; <code>-19</code> = ' +
               '<code>-ENODEV</code>, "không có phần cứng của tôi" (Bài 44).'],
              ['<code>after 4000 usecs</code>', 'Thời gian trôi qua giữa hai lần đọc <code>ktime_get()</code>.']
            ] },

          { t: 'p', x:
            'Giờ xếp hạng. <code>awk</code> lấy trường kế cuối (số micro giây) và trường thứ tư (tên hàm), ' +
            '<code>sort -n -r</code> xếp giảm dần:' },

          { t: 'code', where: 'wsl', code:
            'grep \'initcall .* returned\' icd-ftrace.txt | awk \'{print $(NF-1), $4}\' | sort -n -r | head -n 8' },

          { t: 'code', where: 'out', nocopy: true, code:
            '261232 trace_eval_sync+0x0/0x38\n' +
            '95302 jent_mod_init+0x0/0x100\n' +
            '84000 of_platform_default_populate_init+0x0/0x118\n' +
            '41230 physmap_init+0x0/0x38\n' +
            '38302 param_sysfs_builtin_init+0x0/0x1d0\n' +
            '31636 gen_pci_driver_init+0x0/0x38\n' +
            '30519 chr_dev_init+0x0/0xc8\n' +
            '24952 loop_init+0x0/0x148',
            notes: ['Thứ hạng giữ khá ổn định giữa các lần boot, nhưng từng số lệch vài chục phần trăm: ở lần chạy khác, <code>jent_mod_init</code> là 87 304 µs và <code>physmap_init</code> 32 648 µs.'] },

          { t: 'cmdx', cmd: 'awk \'{print $(NF-1), $4}\' | sort -n -r | head -n 8', title: 'Xếp hạng bằng ba công cụ',
            rows: [
              ['<code>$(NF-1)</code>', '<code>NF</code> = số trường của dòng. Dòng kết thúc bằng <code>… 261232 ' +
               'usecs</code>, nên trường kế cuối luôn là con số, dù tên hàm dài hay ngắn.'],
              ['<code>$4</code>', 'Trường 1–3 là <code>[</code>, <code>1.573397]</code>, <code>initcall</code>; ' +
               'trường 4 là tên hàm. (Với dấu thời gian ≥ 10 giây, <code>[</code> dính liền số và tên hàm thành trường ' +
               '3 — ở đây boot xong trước 2 giây nên không gặp.)'],
              ['<code>sort -n -r</code>', 'So theo giá trị số (<code>-n</code>), lớn trước (<code>-r</code>). Thiếu ' +
               '<code>-n</code> thì <code>95302</code> sẽ đứng trên <code>261232</code> vì "9" &gt; "2".']
            ] },

          { t: 'p', x: 'Tổng thời gian của mọi initcall, và phần của những initcall từ 10 ms trở lên:' },

          { t: 'code', where: 'wsl', code:
            'grep \'initcall .* returned\' icd-ftrace.txt | awk \'{s += $(NF-1)} END {print s, "usecs"}\'\n' +
            'grep \'initcall .* returned\' icd-ftrace.txt | awk \'$(NF-1) >= 10000 {n++; s += $(NF-1)} END {print n, "initcalls >= 10 ms,", s, "usecs"}\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1115068 usecs\n' +
            '17 initcalls >= 10 ms, 730926 usecs' },

          { t: 'p', x:
            '1 915 initcall cộng lại <b>1,115 s</b>, và chỉ <b>17</b> hàm (0,9 %) chiếm <b>0,731 s</b> — 66 %. Đây là ' +
            'hình dạng điển hình của thời gian boot kernel: một cái đuôi dài hàng nghìn hàm vài chục micro giây, ' +
            'và một nhúm hàm đắt. Bạn tối ưu nhúm đó, không tối ưu cái đuôi.' },

          { t: 'p', x:
            'Hàm đứng đầu, <code>trace_eval_sync</code>, chiếm <b>261 ms</b> — gần một phần tư. Tên của nó gợi ý nó ' +
            'thuộc ftrace. Đọc mã nguồn để chắc chắn:' },

          { t: 'code', where: 'wsl', code:
            'grep -E \'trace_eval_(init|sync)\' icd-ftrace.txt\n' +
            'grep -n \'late_initcall_sync(trace_eval_sync)\\|subsys_initcall(trace_eval_init)\' ~/bai38/linux-6.18.45/kernel/trace/trace.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.261655] calling  trace_eval_init+0x0/0xb8 @ 1\n' +
            '[    0.261903] initcall trace_eval_init+0x0/0xb8 returned 0 after 0 usecs\n' +
            '[    1.312139] calling  trace_eval_sync+0x0/0x38 @ 1\n' +
            '[    1.573397] initcall trace_eval_sync+0x0/0x38 returned 0 after 261232 usecs\n' +
            '10521:subsys_initcall(trace_eval_init);\n' +
            '10531:late_initcall_sync(trace_eval_sync);' },

          { t: 'cal', kind: 'info', title: 'trace_eval_sync không làm việc — nó chờ',
            x: 'Mở <code>kernel/trace/trace.c</code> quanh dòng 10505–10531. <code>trace_eval_init</code> (cấp ' +
               '<code>subsys</code>, ở 0,262 s) chỉ <b>xếp một công việc</b> vào hàng đợi <code>eval_map_wq</code> rồi ' +
               'trả về ngay — "after 0 usecs". Công việc đó (<code>eval_map_work_func</code>) cập nhật bảng ánh xạ ' +
               'enum cho mọi sự kiện trace, chạy ở nền trong lúc các initcall khác tiếp tục. ' +
               '<code>trace_eval_sync</code> ở cấp cuối cùng (<code>late_initcall_sync</code>) gọi ' +
               '<code>destroy_workqueue()</code>, tức là <b>đợi công việc nền kia xong</b>. Trên một CPU, công việc ' +
               'nền chỉ chạy được khi luồng initcall nhường CPU, nên phần lớn của nó dồn lại tới đây. 261 ms này là ' +
               'giá của việc có ftrace trong kernel — Bước 4 sẽ đo xem bỏ nó đi được bao nhiêu.' },

          { t: 'p', x:
            'Một chi tiết cuối: <code>con_init</code> là <code>4000</code> và <code>of_platform_default_populate_init' +
            '</code> là <code>84000</code> — tròn một cách đáng ngờ, trong khi các số khác lẻ tới từng micro giây.' },

          { t: 'code', where: 'wsl', code:
            'grep -E \'Switched to clocksource|initcall (con_init|of_platform_default_populate_init)\' icd-ftrace.txt\n' +
            'grep -E \'^CONFIG_HZ=\' ~/bai38/linux-6.18.45/.config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.006792] initcall con_init+0x0/0x230 returned 0 after 4000 usecs\n' +
            '[    0.258465] initcall of_platform_default_populate_init+0x0/0x118 returned 0 after 84000 usecs\n' +
            '[    0.355728] clocksource: Switched to clocksource arch_sys_counter\n' +
            'CONFIG_HZ=250' },

          { t: 'cal', kind: 'warn', title: 'Trước 0,356 s, initcall_debug đo bằng thước 4 ms',
            x: 'Cả hai initcall tròn số đều kết thúc <b>trước</b> dòng <code>Switched to clocksource arch_sys_counter' +
               '</code> ở 0,356 s. Trước thời điểm đó, <code>ktime_get()</code> — đồng hồ mà <code>initcall_debug</code> ' +
               'dùng — chạy trên clocksource <code>jiffies</code>, tăng mỗi tick. <code>CONFIG_HZ=250</code> nghĩa là ' +
               '250 tick mỗi giây, <b>4 ms</b> mỗi tick. Vì thế mọi initcall chạy sớm chỉ đo được bội số của 4 000 µs: ' +
               'một hàm 1 ms có thể báo 0 hoặc 4 000. Dấu thời gian <code>printk</code> (dựa trên ' +
               '<code>sched_clock</code>) không bị giới hạn này. Với initcall sớm, hãy tin hiệu hai dấu thời gian ' +
               '<code>calling</code>/<code>returned</code> hơn con số <code>usecs</code>.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — bootgraph: biến 4 000 dòng thành một hình',
        blocks: [
          { t: 'p', x:
            'Một danh sách xếp hạng cho biết hàm nào đắt, nhưng không cho biết <b>khi nào</b> nó chạy và cái gì ' +
            'chạy song song với nó. <code>scripts/bootgraph.pl</code> (Arjan van de Ven, Intel, 2008) vẽ mỗi ' +
            'initcall thành một thanh ngang trên trục thời gian. Phần đầu file ghi rõ điều kiện: kernel phải có ' +
            '<code>CONFIG_PRINTK_TIME</code> và dòng lệnh có <code>initcall_debug</code>. Thử cố tình vi phạm điều ' +
            'kiện thứ hai trước — đưa cho nó bản ghi console của Bước 1:' },

          { t: 'code', where: 'wsl', code:
            'perl ~/bai38/linux-6.18.45/scripts/bootgraph.pl < base.log > empty.svg; echo "rc=$?"; wc -c < empty.svg' },

          { t: 'code', where: 'out', nocopy: true, code:
            'No data found in the dmesg. Make sure that \'printk.time=1\' and\n' +
            '\'initcall_debug\' are passed on the kernel command line.\n' +
            'Usage:\n' +
            '1) dmesg | perl scripts/bootgraph.pl [OPTION] > output.svg\n' +
            '2) perl scripts/bootgraph.pl -h\n' +
            '\n' +
            'Options:\n' +
            '	-header	Insert kernel version and date\n' +
            'rc=0\n' +
            '0' },

          { t: 'cal', kind: 'warn', title: 'Thất bại nhưng trả về 0',
            x: 'Script in lỗi ra stderr, nhưng <code>rc=0</code> và <code>empty.svg</code> được tạo ra với <b>0 byte</b>. ' +
               'Lý do nằm ở mã nguồn: khi không có dữ liệu, nó gọi <code>help(1)</code>, mà hàm <code>help</code> kết ' +
               'thúc bằng <code>exit;</code> — <code>exit</code> không đối số trong Perl trả mã 0. Một script tự động ' +
               'kiểm tra <code>$?</code> sẽ tưởng thành công. Luôn kiểm tra kích thước file đầu ra. Một biến thể khác ' +
               'của cùng bẫy: đưa vào <code>dmesg</code> lấy <b>không có</b> <code>log_buf_len=4M</code> thì script vẫn ' +
               'vẽ được — nhưng chỉ nửa sau của boot, và hình trông hoàn toàn hợp lý.' },

          { t: 'p', x: 'Giờ đưa đúng dữ liệu — <code>dmesg</code> đầy đủ của Bước 2:' },

          { t: 'code', where: 'wsl', code:
            'perl ~/bai38/linux-6.18.45/scripts/bootgraph.pl < icd-ftrace.txt > boot.svg; echo "rc=$?"\n' +
            'ls -l boot.svg\n' +
            'grep -o \'rotate(90)">[a-z_0-9.]*<\' boot.svg | sed \'s/rotate(90)">//; s/<$//\' | grep -v \'^[0-9.]*$\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 16067 Oct 31 19:02 boot.svg\n' +
            'of_platform_default_populate_init\n' +
            'chr_dev_init\n' +
            'inet_init\n' +
            'jent_mod_init\n' +
            'gen_pci_driver_init\n' +
            'loop_init\n' +
            'physmap_init\n' +
            'virtio_net_driver_init\n' +
            'param_sysfs_builtin_init\n' +
            'slab_sysfs_init\n' +
            'trace_eval_sync',
            notes: ['Lệnh thứ ba lấy ra các nhãn chữ lớn trong SVG (nhãn dọc, xoay 90°) và bỏ các nhãn chỉ toàn số của trục thời gian. Nó chỉ để in danh sách ra terminal; hình thật thì mở bằng trình duyệt như dưới đây.'] },

          { t: 'p', x:
            'File 16 KB, và đúng <b>11</b> initcall đủ dài để được ghi nhãn chữ lớn — theo thứ tự thời gian, từ ' +
            '<code>of_platform_default_populate_init</code> ở đầu tới <code>trace_eval_sync</code> ở cuối. Mở nó ' +
            'trong trình duyệt Windows. <code>wslpath -w</code> đổi đường dẫn WSL sang dạng Windows hiểu:' },

          { t: 'code', where: 'wsl', code: 'wslpath -w boot.svg' },

          { t: 'code', where: 'out', nocopy: true, code: '\\\\wsl.localhost\\OSD\\home\\cah8hc\\bai66\\boot.svg',
            notes: ['<code>OSD</code> là tên distro WSL trên máy kiểm chứng và <code>cah8hc</code> là tên user; trên máy bạn sẽ là tên distro của bạn (thường là <code>Ubuntu</code>) và user của bạn. Dán đường dẫn này vào thanh địa chỉ của Edge hoặc Chrome.'] },

          { t: 'p', x:
            'Trình duyệt hiện một dải ngang rộng 2 000 điểm ảnh. Hình dưới đây là bản vẽ lại theo đúng các mốc ' +
            'thời gian trong <code>icd-ftrace.txt</code> (không phải ảnh chụp — <code>bootgraph</code> dùng màu cố ' +
            'định, không hợp với giao diện tối của trang này):' },

          { t: 'fig',
            svg:
              '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Biểu đồ boot vẽ lại từ initcall_debug: trục 0 đến 1,63 giây; các thanh dài nhất là of_platform_default_populate_init 0,16 đến 0,26, jent_mod_init 0,48 đến 0,58, và trace_eval_sync 1,31 đến 1,57 giây">' +
              '<text class="d-t" x="20" y="22">Initcall ≥ 24 ms trên trục thời gian printk (giây)</text>' +
              '<line class="d-line" x1="40" y1="200" x2="700" y2="200"/>' +
              '<text class="d-tm" x="40" y="218" text-anchor="middle">0</text>' +
              '<text class="d-tm" x="242" y="218" text-anchor="middle">0.5</text>' +
              '<text class="d-tm" x="445" y="218" text-anchor="middle">1.0</text>' +
              '<text class="d-tm" x="647" y="218" text-anchor="middle">1.5</text>' +
              '<rect class="d-box-a" x="105" y="40" width="39" height="22" rx="3"/>' +
              '<text class="d-ts" x="150" y="56">of_platform_default_populate_init 84 ms</text>' +
              '<rect class="d-box" x="190" y="70" width="12" height="22" rx="3"/>' +
              '<text class="d-ts" x="208" y="86">chr_dev_init 31 ms</text>' +
              '<rect class="d-box-w" x="235" y="100" width="39" height="22" rx="3"/>' +
              '<text class="d-ts" x="280" y="116">jent_mod_init 95 ms</text>' +
              '<rect class="d-box" x="307" y="130" width="13" height="22" rx="3"/>' +
              '<text class="d-ts" x="326" y="146">gen_pci 32 ms</text>' +
              '<rect class="d-box" x="407" y="70" width="10" height="22" rx="3"/>' +
              '<text class="d-ts" x="423" y="86">loop_init 25 ms</text>' +
              '<rect class="d-box" x="424" y="100" width="17" height="22" rx="3"/>' +
              '<text class="d-ts" x="447" y="116">physmap_init 41 ms</text>' +
              '<rect class="d-box" x="530" y="130" width="15" height="22" rx="3"/>' +
              '<text class="d-ts" x="460" y="168">param_sysfs_builtin_init 38 ms</text>' +
              '<rect class="d-box-w" x="571" y="40" width="106" height="22" rx="3"/>' +
              '<text class="d-t" x="565" y="56" text-anchor="end">trace_eval_sync 261 ms</text>' +
              '<line class="d-line" x1="699" y1="34" x2="699" y2="200"/>' +
              '<text class="d-tm" x="699" y="236" text-anchor="end">Run /init 1.628</text>' +
              '<text class="d-ts" x="40" y="246">Khoảng trống giữa các thanh = hàng nghìn initcall ngắn, mỗi cái vài chục µs.</text>' +
              '</svg>',
            cap: 'Đọc theo chiều ngang: <code>trace_eval_sync</code> nằm ngay trước <code>Run /init</code> và dài hơn ' +
                 'mọi thanh khác cộng lại trong 0,3 s cuối. Đọc theo chiều dọc: không có hai thanh nào chồng lên ' +
                 'nhau — trên một CPU, initcall chạy tuần tự, nên mỗi mili giây của một initcall là một mili giây ' +
                 'cộng thẳng vào thời gian boot.' },

          { t: 'p', x:
            'Ngoài <code>initcall_debug</code>, còn có thể nhìn khoảng trống giữa hai dòng log liên tiếp. Kernel có ' +
            'sẵn <code>scripts/show_delta</code> cho việc này. Thử nó trên log của Bước 1 (đã bỏ cột đồng hồ host):' },

          { t: 'code', where: 'wsl', code:
            'grep -a \'\\] \\[\' base.log | sed \'s/^\\[ *[0-9.]*\\] //\' > kernel.txt\n' +
            'python3 ~/bai38/linux-6.18.45/scripts/show_delta kernel.txt | head -n 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '\n' +
            '[    0.000000] Linux version 6.18.45-embedded (cah8hc@HC-C-005W7) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #7 SMP PREEMPT Sat Oct 31 17:31:37 +07 2026\n' +
            '' },

          { t: 'cal', kind: 'warn', title: 'show_delta hỏng im lặng với Python 3',
            x: 'Kết quả đúng phải có dạng <code>[0.000000 &lt; 0.000000 &gt;]</code> ở đầu mỗi dòng. Thay vào đó bạn ' +
               'nhận lại chính dòng gốc, thêm một dòng trống, và <b>không có thông báo lỗi nào</b>. Nguyên nhân: hàm ' +
               '<code>get_time()</code> gọi <code>string.split()</code> và <code>string.atof()</code> — hai hàm đã bị ' +
               'xoá khỏi Python 3 — rồi một khối <code>try: … except:</code> trơn nuốt mất <code>AttributeError</code> ' +
               'và in dòng gốc. Máy này không có Python 2. Một dòng <code>awk</code> làm cùng việc:' },

          { t: 'code', where: 'wsl', code:
            'awk -F\'[][]\' \'{t = $2 + 0; if (NR > 1) printf "%.6f %s\\n", t - prev, $3; prev = t}\' kernel.txt | sort -n -r | head -n 5' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0.368052  clk: Disabling unused clocks\n' +
            '0.081225  Freeing initrd memory: 1004K\n' +
            '0.072736  virtio-pci 0000:00:01.0: enabling device (0000 -> 0003)\n' +
            '0.053573  Freeing unused kernel memory: 15936K\n' +
            '0.039444  registered taskstats version 1' },

          { t: 'cmdx', cmd: 'awk -F\'[][]\' \'{t = $2 + 0; if (NR > 1) printf "%.6f %s\\n", t - prev, $3; prev = t}\'',
            title: 'Khoảng cách giữa hai dòng log liên tiếp',
            rows: [
              ['<code>-F\'[][]\'</code>', 'Dấu phân cách là <code>[</code> hoặc <code>]</code>. Viết trong một lớp ký ' +
               'tự, <code>]</code> phải đứng ngay sau <code>[</code> mở. Dòng <code>[    1.402307] Run /init</code> ' +
               'thành <code>$2 = "    1.402307"</code>, <code>$3 = " Run /init…"</code>.'],
              ['<code>t = $2 + 0</code>', 'Cộng 0 ép chuỗi có dấu cách thành số.'],
              ['<code>t - prev</code>', 'Thời gian từ dòng trước tới dòng này; in kèm nội dung dòng này.'],
              ['<code>| sort -n -r | head -n 5</code>', 'Năm khoảng trống lớn nhất.']
            ] },

          { t: 'p', x:
            'Dòng đầu: <b>0,368 s</b> trôi qua trước khi kernel in <code>clk: Disabling unused clocks</code>, nhưng ' +
            'dòng log ngay trước đó (<code>input: gpio-keys …</code> ở 0,979 s) không liên quan gì. Không có log nào ' +
            'trong 0,37 s đó. Bước 2 cho manh mối: trong <code>icd-ftrace.txt</code>, sau <code>trace_eval_sync</code> (kết thúc ở ' +
            '1,573 s) chỉ có bốn initcall vài chục micro giây rồi tới <code>clk_disable_unused</code> — hàm in dòng ' +
            '<code>clk: Disabling unused clocks</code> ở 1,574 s. Vậy khoảng lặng này phần lớn là <code>trace_eval_sync' +
            '</code> đang chờ mà không in gì. Đây là giới hạn của phương pháp "khoảng trống giữa hai dòng": nó cho biết <b>ở đâu</b> ' +
            'mất thời gian, nhưng không cho biết <b>ai</b> — muốn biết ai thì cần <code>initcall_debug</code>.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Cắt kernel: thử bằng blacklist, rồi bỏ ftrace',
        blocks: [
          { t: 'p', x:
            'Ứng viên số hai là <code>jent_mod_init</code>, 95 ms. Đây là gì, và có bỏ được không?' },

          { t: 'code', where: 'wsl', code:
            'grep -E \'jent_mod_init\' icd-ftrace.txt\n' +
            'grep -rn \'module_init(jent_mod_init)\' ~/bai38/linux-6.18.45/crypto/' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.482424] calling  jent_mod_init+0x0/0x100 @ 1\n' +
            '[    0.577744] initcall jent_mod_init+0x0/0x100 returned 0 after 95302 usecs\n' +
            '/home/cah8hc/bai38/linux-6.18.45/crypto/jitterentropy-kcapi.c:372:module_init(jent_mod_init);' },

          { t: 'p', x:
            '<code>crypto/jitterentropy-kcapi.c</code> là <b>Jitter RNG</b>: nó tạo entropy cho bộ sinh số ngẫu nhiên ' +
            'bằng cách đo độ dao động nhỏ trong thời gian thực thi của CPU, và lúc khởi tạo phải tự kiểm tra bằng ' +
            'cách chạy hàng nghìn phép đo — vì thế chậm. Trước khi sửa <code>.config</code> và build lại 5 phút, ' +
            'hãy <b>thử</b> bỏ nó bằng <code>initcall_blacklist</code>, ngay trên dòng lệnh:' },

          { t: 'code', where: 'wsl', code:
            'python3 icd.py $K initramfs.cpio.gz icd-bl.log "console=ttyAMA0 rdinit=/init initcall_debug log_buf_len=4M initcall_blacklist=jent_mod_init"\n' +
            'grep -E \'blacklist|jent\' share/dmesg.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init initcall_debug log_buf_len=4M initcall_blacklist=jent_mod_init\n' +
            '[    0.000000] blacklisting initcall jent_mod_init\n' +
            '[    0.472592] initcall jent_mod_init blacklisted' },

          { t: 'p', x:
            'Hai dòng xác nhận: kernel đọc tham số lúc phân tích dòng lệnh (<code>blacklisting …</code>), và tới lượt ' +
            'hàm ở 0,473 s thì bỏ qua nó (<code>… blacklisted</code>) — không còn dòng <code>calling</code>/' +
            '<code>returned</code>. Giờ đo thời gian thật, không có <code>initcall_debug</code>, ba lần:' },

          { t: 'code', where: 'wsl', code:
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '    -kernel $K -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init initcall_blacklist=jent_mod_init" > bl-$i.log\n' +
            '  grep -a -E \'Run /init|~ # \' bl-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   1.729] [    1.383262] Run /init as init process\n' +
            '[   1.807] ~ # \n' +
            '[   1.727] [    1.371466] Run /init as init process\n' +
            '[   1.804] ~ # \n' +
            '[   1.744] [    1.389572] Run /init as init process\n' +
            '[   1.821] ~ # ' },

          { t: 'p', x:
            '<code>Run /init</code> <b>1,371–1,390 s</b> so với 1,388–1,407 s khi chạy lại ba lần không blacklist ' +
            '(cùng phiên đo); dấu nhắc <b>1,804–1,821 s</b> so với 1,827–1,846 s. Tiết kiệm được <b>~0,02 s</b>, ' +
            'không phải 0,095 s như con số <code>initcall_debug</code> hứa hẹn.' },

          { t: 'cal', kind: 'why', title: 'Vì sao bỏ một hàm 95 ms chỉ được 20 ms',
            x: 'Nhìn lại <code>icd-ftrace.txt</code>: <code>Unpacking initramfs...</code> ở 0,435 s, ' +
               '<code>jent_mod_init</code> bắt đầu ở 0,482 s, <code>Freeing initrd memory</code> ở <b>0,556 s</b> — ' +
               '<i>giữa</i> lúc <code>jent_mod_init</code> đang chạy. Kernel hiện nay giải nén initramfs ' +
               'ở nền (<code>async_schedule_domain</code> trong <code>init/initramfs.c:784</code>, tắt được bằng ' +
               '<code>initramfs_async=0</code>). Một phần trong 95 ms "của" <code>jent_mod_init</code> thực ra là CPU ' +
               'đang giải nén initramfs. Lúc kiểm chứng, một lần boot với <code>initramfs_async=0</code> cho thấy rõ: ' +
               '<code>populate_rootfs</code> tự chiếm 84 ms và <code>jent_mod_init</code> còn 72 ms. Bỏ <code>jent_mod_init</code> thì việc giải nén vẫn phải làm. ' +
               '<b>Con số <code>after … usecs</code> là thời gian trôi qua, không phải thời gian sẽ tiết kiệm được.</b> ' +
               'Đây là lý do nguyên tắc 1 nói "đo lại sau khi cắt".' },

          { t: 'p', x:
            'Ứng viên số một, <code>trace_eval_sync</code>, không thể blacklist cho có ý nghĩa — nó chỉ là chỗ chờ; ' +
            'công việc thật nằm rải rác trong ftrace. Muốn bỏ nó, phải bỏ ftrace khỏi kernel. Đây là lúc build một ' +
            'kernel thứ hai. Không build trong <code>~/bai38</code> — Bài 63, 64, 65 và các bài sau cần cây đó ' +
            'nguyên vẹn. Thử cách tự nhiên nhất, build out-of-tree từ chính <code>~/bai38</code>:' },

          { t: 'code', where: 'wsl', code:
            'make -C ~/bai38/linux-6.18.45 ARCH=arm64 O=$HOME/bai66/b-try defconfig 2>&1 | grep -E \'\\*\\*\\*|Error\' | head -n 5\n' +
            'rm -rf ~/bai66/b-try' },

          { t: 'code', where: 'out', nocopy: true, code:
            '***\n' +
            '*** The source tree is not clean, please run \'make ARCH=arm64 mrproper\'\n' +
            '*** in /home/cah8hc/embedded-course/bai38/linux-6.18.45\n' +
            '***\n' +
            'make[2]: *** [/home/cah8hc/embedded-course/bai38/linux-6.18.45/Makefile:697: outputmakefile] Error 1',
            notes: ['Đường dẫn <code>/home/cah8hc/embedded-course/bai38</code> là vì trên máy kiểm chứng <code>~/bai38</code> là một symlink; trên máy bạn sẽ là <code>/home/&lt;tên bạn&gt;/bai38/linux-6.18.45</code>.'] },

          { t: 'cal', kind: 'danger', title: 'Đừng làm theo lời khuyên mrproper',
            x: 'Kbuild từ chối <code>O=</code> khi cây nguồn đã từng được build tại chỗ (có <code>.config</code> và ' +
               'file <code>.o</code>), vì hai bản build sẽ trộn vào nhau. Nó khuyên <code>mrproper</code> — lệnh đó sẽ ' +
               'xoá <code>.config</code>, <code>Image</code>, <code>vmlinux</code> 728 MB và 1 423 module mà các Bài ' +
               '63–65 đã dựng. <b>Không chạy.</b> Bài 41 cũng build <code>O=</code> từ một bản nguồn sạch riêng ' +
               '(<code>~/bai41/linux-6.18.45</code>); bài này làm y như vậy.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai66\n' +
            'time tar xf ~/bai38/linux-6.18.45.tar.xz\n' +
            'cd linux-6.18.45\n' +
            'mkdir -p ../b-small\n' +
            'cp ~/bai38/linux-6.18.45/.config ../b-small/.config\n' +
            './scripts/config --file ../b-small/.config --disable FTRACE --disable DYNAMIC_DEBUG \\\n' +
            '  --disable DEBUG_INFO_DWARF_TOOLCHAIN_DEFAULT --enable DEBUG_INFO_NONE\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 O=../b-small olddefconfig | tail -n 3\n' +
            './scripts/diffconfig ~/bai38/linux-6.18.45/.config ../b-small/.config | wc -l\n' +
            './scripts/diffconfig ~/bai38/linux-6.18.45/.config ../b-small/.config | grep -E \'^.?(FTRACE|DYNAMIC_DEBUG|DEBUG_INFO|DEBUG_INFO_NONE) \'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real	0m9.657s\n' +
            '# configuration written to .config\n' +
            '#\n' +
            'make[1]: Leaving directory \'/home/cah8hc/bai66/b-small\'\n' +
            '91\n' +
            '-DEBUG_INFO y\n' +
            ' DEBUG_INFO_NONE n -> y\n' +
            ' DYNAMIC_DEBUG y -> n\n' +
            ' FTRACE y -> n',
            notes: ['Dòng <code>real 0m9.657s</code> đo trong một lần chạy riêng (giải nén vào một thư mục tạm) — trên máy bạn, thời gian giải nén phụ thuộc tốc độ đĩa.'] },

          { t: 'cmdx', cmd: './scripts/config --file ../b-small/.config --disable FTRACE --disable DYNAMIC_DEBUG --disable DEBUG_INFO_DWARF_TOOLCHAIN_DEFAULT --enable DEBUG_INFO_NONE',
            title: 'Một kernel "sản phẩm": bắt đầu từ cấu hình đang dùng, bỏ công cụ debug',
            rows: [
              ['<code>cp ~/bai38/…/.config</code>', 'Bắt đầu từ <b>đúng</b> cấu hình đang đo, để mọi khác biệt về ' +
               'thời gian đến từ ba thay đổi dưới đây, không từ thứ gì khác.'],
              ['<code>--disable FTRACE</code>', 'Tắt cả cây ftrace. <code>olddefconfig</code> sẽ tự tắt theo ' +
               '<code>FUNCTION_TRACER</code>, <code>FUNCTION_GRAPH_TRACER</code>… mà Bài 65 đã bật.'],
              ['<code>--disable DYNAMIC_DEBUG</code>', 'Bỏ bảng 5 955 điểm <code>pr_debug</code> của Bài 65.'],
              ['<code>--disable DEBUG_INFO_DWARF_TOOLCHAIN_DEFAULT --enable DEBUG_INFO_NONE</code>', 'Bỏ thông tin ' +
               'debug DWARF. Không làm <code>Image</code> nhỏ đi (Bài 41: debug info chỉ nằm trong ' +
               '<code>vmlinux</code>) nhưng build nhanh hơn và <code>b-small</code> chỉ còn 902 MB.'],
              ['<code>diffconfig … | wc -l</code> → <code>91</code>', 'Ba công tắc kéo theo 91 dòng khác biệt — ' +
               'đúng cơ chế <code>select</code>/<code>depends on</code> Bài 39 đã dạy. Bốn dòng được lọc ra là bốn ' +
               'thay đổi gốc.']
            ] },

          { t: 'code', where: 'wsl', code:
            'time make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 O=../b-small -j$(nproc) Image > ../b-small.build.log 2>&1\n' +
            'cd ..\n' +
            'ls -l b-small/arch/arm64/boot/Image ~/bai38/linux-6.18.45/arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real	5m21.633s\n' +
            'user	74m11.834s\n' +
            'sys	6m58.011s\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 49342976 Oct 31 18:51 b-small/arch/arm64/boot/Image\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 60430848 Oct 31 17:32 /home/cah8hc/bai38/linux-6.18.45/arch/arm64/boot/Image',
            notes: ['<b>5 phút 22 giây</b> với 16 CPU; máy ít lõi hơn sẽ lâu hơn tương ứng.'] },

          { t: 'p', x:
            '<code>Image</code> mới <b>49 342 976 byte</b> — đúng bằng kích thước <code>Image</code> trước khi Bài 65 ' +
            'bật ftrace, tức kernel mà Bài 63 và 64 đã boot. Bỏ ftrace và dynamic debug lấy lại <b>11,1 MB</b>. ' +
            'Giờ đo thời gian:' },

          { t: 'code', where: 'wsl', code:
            'S=~/bai66/b-small/arch/arm64/boot/Image\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '    -kernel $S -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" > small-$i.log\n' +
            '  grep -a -E \'Run /init|~ # \' small-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.938] [    0.678891] Run /init as init process\n' +
            '[   1.012] ~ # \n' +
            '[   0.807] [    0.677009] Run /init as init process\n' +
            '[   0.884] ~ # \n' +
            '[   0.832] [    0.709939] Run /init as init process\n' +
            '[   1.066] ~ # ' },

          { t: 'p', x:
            '<code>Run /init</code> từ ~1,40 s xuống <b>0,68–0,71 s</b> — giảm một nửa. Dấu nhắc từ ~1,84 s xuống ' +
            '<b>0,88–1,07 s</b>. Ở lần thứ ba, dấu nhắc đến 0,234 s sau <code>Run /init</code> thay vì ~0,075 s như hai ' +
            'lần kia, trong khi phần kernel gần như không đổi: một ví dụ về nhiễu của máy Windows — lý do phải đo ba lần. Kiểm tra cả hai nguồn tiết ' +
            'kiệm. Đoạn trước <code>sched_clock</code>:' },

          { t: 'code', where: 'wsl', code:
            './stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel $S -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init earlycon" > early-small.log\n' +
            'grep -a -E \'Booting Linux|NR_IRQS|sched_clock\' early-small.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.077] [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[   0.118] [    0.000000] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0\n' +
            '[   0.137] [    0.000052] sched_clock: 57 bits at 63MHz, resolution 16ns, wraps every 4398046511096ns' },

          { t: 'p', x:
            'Từ dòng đầu tới <code>sched_clock</code>: <b>0,060 s</b> (0,077 → 0,137), so với 0,270 s ở Bước 1. ' +
            'Không còn dòng <code>ftrace: allocating</code>, và ~0,2 s ghi điểm vá đã biến mất. Còn initcall:' },

          { t: 'code', where: 'wsl', code:
            'python3 icd.py $S initramfs.cpio.gz icd-small.log "console=ttyAMA0 rdinit=/init initcall_debug log_buf_len=4M"\n' +
            'cp share/dmesg.txt icd-small.txt\n' +
            'grep -c \'initcall .* returned\' icd-small.txt\n' +
            'grep \'initcall .* returned\' icd-small.txt | awk \'{print $(NF-1), $4}\' | sort -n -r | head -n 5\n' +
            'grep \'initcall .* returned\' icd-small.txt | awk \'{s += $(NF-1)} END {print s, "usecs"}\'\n' +
            'grep -c trace_eval icd-small.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1886\n' +
            '92000 of_platform_default_populate_init+0x0/0x108\n' +
            '55843 jent_mod_init+0x0/0xf0\n' +
            '26385 gen_pci_driver_init+0x0/0x28\n' +
            '18158 param_sysfs_builtin_init+0x0/0x1bc\n' +
            '18110 physmap_init+0x0/0x28\n' +
            '598862 usecs\n' +
            '0' },

          { t: 'p', x:
            'Ít hơn 29 initcall (1 886 so với 1 915), <code>trace_eval</code> không còn (<code>0</code>), và tổng ' +
            'thời gian initcall từ 1,115 s xuống <b>0,599 s</b>. Để ý: không chỉ hàm đứng đầu biến mất — ' +
            '<code>jent_mod_init</code> 95 → 56 ms, <code>physmap_init</code> 41 → 18 ms. Mọi hàm đều nhanh hơn ' +
            'một chút. Đó là chi phí ngầm của <code>FUNCTION_TRACER</code>: mỗi hàm trong kernel có thêm lệnh ở ' +
            'đầu (<code>mov x9, x30</code> + <code>nop</code>, Bài 65), và kernel lớn hơn 11 MB nên ít vừa cache ' +
            'của CPU hơn.' },

          { t: 'cal', kind: 'tip', title: 'Debug kernel và kernel sản phẩm là hai cấu hình',
            x: 'Đây là lý do mọi build system của Chặng 11 cho bạn giữ nhiều defconfig. Kernel bạn dùng để phát triển ' +
               '(Bài 63–65) có GDB scripts, ftrace, dynamic debug, debug info; kernel bạn giao cho khách không cần ' +
               'chúng. Trên sản phẩm này, chỉ riêng việc tách hai cấu hình đã lấy lại <b>~0,72 s</b> và 11 MB. Đừng ' +
               'tối ưu initcall trên một kernel debug — bạn sẽ tối ưu nhầm thứ.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Cắt sâu: tinyconfig, và những gì phải trả',
        blocks: [
          { t: 'p', x:
            'Kernel <code>b-small</code> vẫn mang theo driver cho hàng trăm bo mạch — Qualcomm, MediaTek, Rockchip, ' +
            'NVIDIA — và mạng, PCI, USB, SCSI. Trên một sản phẩm thật, bạn chỉ giữ thứ phần cứng của mình có. Bài 41 ' +
            'đã đi tới cực đó: <code>tinyconfig</code> cộng đúng <b>17</b> tuỳ chọn để có shell. Dựng lại kernel ' +
            'đó, thêm một tuỳ chọn thứ 18 — <code>PRINTK_TIME</code>, vì không có dấu thời gian thì không đo được:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai66/linux-6.18.45\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 O=../b-tiny tinyconfig | tail -n 1\n' +
            './scripts/config --file ../b-tiny/.config -e PRINTK -e TTY -e BINFMT_ELF -e BINFMT_SCRIPT \\\n' +
            '  -e MULTIUSER -e SERIAL_AMBA_PL011 -e SERIAL_AMBA_PL011_CONSOLE -e BLK_DEV_INITRD -e RD_GZIP \\\n' +
            '  -e PROC_FS -e SYSFS -e FUTEX -e EPOLL -e SIGNALFD -e TIMERFD -e EVENTFD -e AIO -e PRINTK_TIME\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 O=../b-tiny olddefconfig | tail -n 1\n' +
            'grep -c \'=y\' ../b-tiny/.config\n' +
            'grep -E \'^CONFIG_PRINTK_TIME|KALLSYMS is\' ../b-tiny/.config\n' +
            'time make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 O=../b-tiny -j$(nproc) Image > ../b-tiny.build.log 2>&1\n' +
            'cd ..\n' +
            'ls -l b-tiny/arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make[1]: Leaving directory \'/home/cah8hc/bai66/b-tiny\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/bai66/b-tiny\'\n' +
            '491\n' +
            '# CONFIG_KALLSYMS is not set\n' +
            'CONFIG_PRINTK_TIME=y\n' +
            '\n' +
            'real	0m35.957s\n' +
            'user	7m35.564s\n' +
            'sys	0m44.316s\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 3303432 Oct 31 18:36 b-tiny/arch/arm64/boot/Image',
            notes: ['Thời gian <code>real 0m35.957s</code> là của lần build đầu tiên. Chạy lại cả khối lệnh trên cùng một <code>b-tiny</code> chỉ mất ~2 s vì không có gì thay đổi; giờ của file <code>Image</code> cũng giữ nguyên.'] },

          { t: 'p', x:
            '<b>491</b> tuỳ chọn <code>=y</code> (so với 3 268 của <code>b-small</code>), build <b>36 giây</b>, ' +
            '<code>Image</code> <b>3 303 432 byte</b> — nhỏ hơn <code>b-small</code> 15 lần. Kích thước này trùng ' +
            'từng byte với số Bài 41 đo trên một máy khác, với GCC khác; bạn có thể kiểm chứng rằng nó đúng bằng ' +
            '<code>_edata − _text</code> trong <code>b-tiny/System.map</code>, nhưng bài này chưa giải thích được vì ' +
            'sao hai lần build lại trùng nhau tới vậy — nếu bạn tò mò, đó là một câu hỏi hay để tự đào. Boot ba lần:' },

          { t: 'code', where: 'wsl', code:
            'T=~/bai66/b-tiny/arch/arm64/boot/Image\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '    -kernel $T -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" > tiny-$i.log\n' +
            '  grep -a -E \'Run /init|~ # \' tiny-$i.log\n' +
            'done\n' +
            'grep -a -c \'\\] \\[\' tiny-1.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.322] [    0.222940] Run /init as init process\n' +
            '[   0.394] ~ # \n' +
            '[   0.298] [    0.213727] Run /init as init process\n' +
            '[   0.368] ~ # \n' +
            '[   0.301] [    0.216991] Run /init as init process\n' +
            '[   0.375] ~ # \n' +
            '71' },

          { t: 'p', x:
            '<code>Run /init</code> ở <b>0,214–0,223 s</b>, dấu nhắc ở <b>0,368–0,394 s</b>. Kernel chỉ in ' +
            '<b>71</b> dòng thay vì 246. So với <code>b-small</code>, bỏ thêm ~0,46 s ở kernel. Thử ' +
            '<code>initcall_debug</code> trên nó:' },

          { t: 'code', where: 'qemu', name: 'Trong máy ảo (boot $T với thêm initcall_debug)', code:
            'dmesg | grep -c \'initcall .* returned\'\n' +
            'dmesg | grep \'initcall .* returned\' | awk \'{print $(NF-1), $4}\' | sort -n -r | head -n 4\n' +
            'dmesg | grep \'initcall .* returned\' | awk \'{s += $(NF-1)} END {print s, "usecs"}\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '163\n' +
            '32000 0xffff80008024db98\n' +
            '24000 0xffff80008025cb0c\n' +
            '22131 0xffff80008025ad64\n' +
            '20073 0xffff80008025913c\n' +
            '157748 usecs',
            notes: ['Chạy kernel <code>$T</code> bằng lệnh QEMU của Bước 1, thêm <code>initcall_debug</code> vào <code>-append</code>, rồi gõ ba lệnh trên ở dấu nhắc. Kernel này nhỏ nên vòng log 128 KiB đủ chứa hết, không cần <code>log_buf_len</code>. Thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'] },

          { t: 'p', x:
            '163 initcall, tổng <b>0,158 s</b>. Nhưng tên hàm đã biến thành địa chỉ: <code>tinyconfig</code> tắt ' +
            '<code>KALLSYMS</code> (Bài 41: bảng ký hiệu tốn 14 % <code>Image</code>), nên <code>%pS</code> không ' +
            'còn gì để tra. Tra bằng tay trong <code>System.map</code> mà build vừa sinh ra:' },

          { t: 'code', where: 'wsl', code:
            'grep -e \'^ffff80008024db98 \' -e \'^ffff80008025cb0c \' b-tiny/System.map' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ffff80008024db98 t oom_init\n' +
            'ffff80008025cb0c t of_platform_default_populate_init' },

          { t: 'p', x:
            'Đó là <b>cái giá đầu tiên</b> của kernel nhỏ: chẩn đoán khó hơn. Mọi oops trên kernel này cũng sẽ in ' +
            'địa chỉ thay vì tên hàm, và kỹ năng <code>addr2line</code>/<code>System.map</code> của Bài 64 trở thành ' +
            'bắt buộc. Danh sách đầy đủ những gì đã mất:' },

          { t: 'table',
            head: ['Mất gì', 'Hệ quả cho sản phẩm'],
            rows: [
              ['<code>KALLSYMS</code>', 'Oops, <code>initcall_debug</code>, <code>/proc/kallsyms</code> chỉ còn địa chỉ'],
              ['Mạng, 9p, virtio', '<code>icd.py</code> của Bước 2 không chạy được trên kernel này — không có ' +
               '<code>-virtfs</code>'],
              ['<code>DEVTMPFS</code>', '<code>/dev</code> rỗng; phải tạo node bằng <code>mknod</code> hoặc bật lại'],
              ['<code>MODULES</code>', 'Không <code>insmod</code> được — mọi driver của Chặng 10 phải built-in'],
              ['Block, ext4, PCI, USB', 'Chỉ boot được từ initramfs; không đọc được ổ đĩa']
            ] },

          { t: 'cal', kind: 'why', title: 'tinyconfig là đích đến để học, không phải để giao hàng',
            x: 'Cách làm thật trên một sản phẩm đi theo chiều ngược lại với bước này: bắt đầu từ cấu hình đang chạy ' +
               '(như <code>b-small</code>), dùng <code>initcall_debug</code> để biết cái gì tốn thời gian, rồi tắt từng ' +
               'nhóm driver mà phần cứng không có — mỗi lần tắt đều boot thử và đo. <code>tinyconfig</code> cho bạn ' +
               'biết <b>sàn</b>: với phần cứng này và toolchain này, kernel không thể boot nhanh hơn ~0,21 s. Mọi thứ ' +
               'giữa 0,21 s và 0,68 s là những tính năng bạn chọn giữ lại.' },

          { t: 'p', x:
            'Một câu hỏi cuối về userspace: <code>/init</code> của Bài 32 chạy <code>busybox --install -s /bin</code>, ' +
            'tạo 280 symlink mỗi lần boot. Có đáng tạo sẵn chúng trong initramfs không? Đọc lại ba bản ghi ' +
            '<code>tiny-*.log</code> ở ba mốc: <code>Run /init</code>, dòng <code>=== init running</code> mà ' +
            'script in sau khi đã <code>--install</code> và <code>mount</code>, và dấu nhắc:' },

          { t: 'code', where: 'wsl', code:
            'for i in 1 2 3; do grep -a -E \'Run /init|=== init|~ # \' tiny-$i.log | cut -c1-12 | tr \'\\n\' \' \'; echo; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.322] [ [   0.387] = [   0.394] ~ \n' +
            '[   0.298] [ [   0.360] = [   0.368] ~ \n' +
            '[   0.301] [ [   0.367] = [   0.375] ~ ' },

          { t: 'p', x:
            'Từ <code>Run /init</code> tới <code>=== init</code> là <b>62–66 ms</b> (gồm cả việc kernel nạp và chạy ' +
            '<code>busybox</code> lần đầu, <code>--install</code> và hai lệnh <code>mount</code>); từ đó tới dấu nhắc ' +
            'chỉ 7–8 ms. Lúc kiểm chứng, một lần thử tạo sẵn 280 symlink trên host và bỏ dòng <code>--install</code> ' +
            'cho dấu nhắc ở 0,351–0,357 s, so với 0,348–0,354 s khi vẫn giữ — không khác nhau. Lệnh ' +
            '<code>time busybox --install -s /bin</code> gõ trong máy ảo báo <code>real 0m 0.00s</code>. Kết luận ' +
            'có số: trên hệ thống này, userspace không phải chỗ để cắt. Trên một sản phẩm có systemd thì khác hẳn — ' +
            'xem <code>cal</code> bên dưới.' },

          { t: 'cal', kind: 'info', title: 'Userspace có systemd: systemd-analyze',
            x: 'Initramfs của bài không có systemd, nhưng WSL thì có (Bài 49 đã dùng <code>systemctl --user</code>). ' +
               'Gõ <code>systemd-analyze</code> trong WSL: máy kiểm chứng in <code>Startup finished in 2.095s ' +
               '(userspace)</code>, và <code>systemd-analyze blame</code> xếp hạng dịch vụ — đứng đầu là ' +
               '<code>xrdp.service</code> 1,084 s, rồi <code>apt-daily-upgrade.service</code> 977 ms. Đó chính là ' +
               '<code>initcall_debug</code> của userspace. <code>systemd-analyze critical-chain</code> cho biết chuỗi ' +
               'phụ thuộc nào quyết định thời gian — tương tự cách bạn đọc <code>bootgraph</code>. Danh sách dịch vụ ' +
               'trên máy bạn sẽ khác hoàn toàn.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Bootloader: U-Boot với bootdelay, rồi cả chuỗi dưới 1 giây',
        blocks: [
          { t: 'p', x:
            'Mọi lần boot ở trên dùng <code>-kernel</code>: QEMU tự nạp kernel, không có bootloader. Sản phẩm thật luôn ' +
            'có. Bài 34 đã build U-Boot v2026.07 — nhưng bản đó không build được với GCC 9.4 của máy này ' +
            '(<code>*** Your GCC is older than 10.0 and is not supported</code>, xem <i>Lỗi thường gặp</i>). Thay vào ' +
            'đó, dùng bản U-Boot dựng sẵn cho QEMU mà Ubuntu đóng gói. <code>apt-get download</code> chỉ tải file ' +
            '<code>.deb</code> về thư mục hiện tại, không cài, không cần <code>sudo</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai66 && mkdir -p dl && cd dl\n' +
            'apt-get download u-boot-qemu\n' +
            'sha256sum u-boot-qemu_*.deb\n' +
            'dpkg-deb -x u-boot-qemu_*.deb pkg\n' +
            'ls -l pkg/usr/lib/u-boot/qemu_arm64/\n' +
            'cd ..\n' +
            'cp dl/pkg/usr/lib/u-boot/qemu_arm64/u-boot.bin .' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Fetched 1,433 kB in 6s (238 kB/s)\n' +
            'e944f5b47da7180193e395ef1b39bcbe3a010f6d1a0c7c08e8f91f9263b317b2  u-boot-qemu_2021.01+dfsg-3ubuntu0~20.04.6_all.deb\n' +
            'total 1528\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 724880 Jan 12  2023 u-boot.bin\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 838944 Jan 12  2023 uboot.elf',
            notes: ['Trên Ubuntu 20.04, gói là <b>2021.01</b> và tổng sha256 phải khớp như trên. Trên bản Ubuntu mới hơn bạn sẽ nhận phiên bản khác, tổng khác, và bản U-Boot mới hơn có thể có <code>bootcmd</code> mặc định khác — các lệnh <code>setenv</code> dưới đây vẫn dùng được.'] },

          { t: 'cmdx', cmd: 'apt-get download u-boot-qemu; dpkg-deb -x … pkg', title: 'Lấy một file từ gói mà không cài gói',
            rows: [
              ['<code>apt-get download</code>', 'Tải đúng file <code>.deb</code> của phiên bản apt đang thấy, kiểm chữ ký ' +
               'kho như khi cài, nhưng không đụng vào hệ thống.'],
              ['<code>dpkg-deb -x … pkg</code>', 'Giải nén phần dữ liệu của gói vào thư mục <code>pkg/</code>. Không ' +
               'chạy script cài đặt nào.'],
              ['<code>qemu_arm64/u-boot.bin</code>', 'Bản build cho máy <code>virt</code> 64-bit — cùng mục tiêu ' +
               '<code>qemu_arm64_defconfig</code> mà Bài 34 dùng. Gói còn có bản cho <code>qemu_arm</code>, ' +
               '<code>qemu-riscv64</code>…']
            ] },

          { t: 'p', x:
            'Bản U-Boot 2021.01 này không có <code>bootflow</code> như U-Boot 2026.07 của Bài 35, và ' +
            '<code>boot_targets</code> mặc định của nó (<code>usb0 scsi0 virtio0 dhcp</code>) không có nguồn ' +
            '<code>qfw</code> để nhận kernel từ QEMU. Vì vậy đặt kernel và initramfs lên một ổ đĩa virtio — đúng cách Bài 35 ' +
            'làm, chỉ khác là <code>mkfs.ext4 -d</code> chép file vào lúc tạo, khỏi cần <code>debugfs</code>. Hai bank ' +
            'flash thì làm như Bài 35 để <code>saveenv</code> giữ được qua các lần boot:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p boot\n' +
            'cp ~/bai38/linux-6.18.45/arch/arm64/boot/Image initramfs.cpio.gz boot/\n' +
            'truncate -s 128M boot.img\n' +
            'mkfs.ext4 -F -q -d boot boot.img\n' +
            'truncate -s 64M flash0.img\n' +
            'dd if=u-boot.bin of=flash0.img conv=notrunc status=none\n' +
            'truncate -s 64M flash1.img\n' +
            'ls -ls boot.img flash0.img flash1.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            '74184 -rw-r--r-- 1 cah8hc cah8hc 134217728 Oct 31 19:30 boot.img\n' +
            '  708 -rw-r--r-- 1 cah8hc cah8hc  67108864 Oct 31 19:05 flash0.img\n' +
            '    0 -rw-r--r-- 1 cah8hc cah8hc  67108864 Oct 31 19:05 flash1.img',
            notes: ['Ba dòng này gộp từ hai lần chạy (đĩa tạo lúc 19:30, flash lúc 19:05) — thời gian trên máy bạn sẽ khác.'] },

          { t: 'p', x:
            'Cột đầu của <code>ls -s</code> là số KiB <b>thật sự</b> chiếm trên đĩa: <code>boot.img</code> 128 MiB ' +
            'nhưng chỉ dùng 74 184 KiB (≈ <code>Image</code> 60 MB + initramfs 1 MB + metadata ext4); ' +
            '<code>flash0.img</code> 64 MiB nhưng chỉ 708 KiB — đúng cỡ <code>u-boot.bin</code>; <code>flash1.img</code> ' +
            '0 — file thưa, chưa có gì. Ổ đĩa này <b>không có bảng phân vùng</b>: <code>mkfs.ext4</code> định dạng ' +
            'toàn bộ, và U-Boot gọi nó là <code>virtio 0</code> (không có <code>:1</code>).' },

          { t: 'p', x:
            'Giờ cần gõ lệnh vào dấu nhắc U-Boot. Bạn có thể làm bằng tay (nhấn một phím trong lúc đếm ngược, như ' +
            'Bài 35). Nhưng ở bước sau, khi <code>bootdelay=0</code>, gần như không kịp nhấn — nên dùng một script ' +
            'nhỏ nhấn phím cách liên tục từ lúc bật máy cho tới khi thấy <code>=&gt;</code>:' },

          { t: 'code', where: 'file', name: '~/bai66/ubshell.py', code:
            '#!/usr/bin/env python3\n' +
            '# ubshell.py LOG CMD... -- keep pressing space from power-on until U-Boot stops at =>,\n' +
            '# then type each CMD and wait for the next prompt. Works with any bootdelay, even 0.\n' +
            'import sys\n' +
            'import time\n' +
            'import pexpect\n' +
            '\n' +
            'log, cmds = sys.argv[1], sys.argv[2:]\n' +
            'args = ("-M virt -cpu cortex-a57 -m 512 -nographic "\n' +
            '        "-drive if=pflash,format=raw,index=0,file=flash0.img,readonly=on "\n' +
            '        "-drive if=pflash,format=raw,index=1,file=flash1.img "\n' +
            '        "-drive file=boot.img,if=none,format=raw,id=hd0 "\n' +
            '        "-device virtio-blk-device,drive=hd0").split()\n' +
            'p = pexpect.spawn("qemu-system-aarch64", args, encoding="utf-8", timeout=30)\n' +
            'p.logfile_read = open(log, "w")\n' +
            'for _ in range(60):\n' +
            '    p.send(" ")\n' +
            '    try:\n' +
            '        p.expect("=> ", timeout=0.05)\n' +
            '        break\n' +
            '    except pexpect.TIMEOUT:\n' +
            '        pass\n' +
            'else:\n' +
            '    print("never reached =>")\n' +
            '    sys.exit(1)\n' +
            'time.sleep(0.5)\n' +
            'p.sendline("")\n' +
            'p.expect("=> ")\n' +
            'for c in cmds:\n' +
            '    p.sendline(c)\n' +
            '    p.expect("=> ")\n' +
            'p.terminate(force=True)' },

          { t: 'p', x:
            'Dạy U-Boot nạp kernel và initramfs từ <code>virtio 0</code> và boot thẳng, rồi lưu vào flash:' },

          { t: 'code', where: 'wsl', code:
            'python3 ubshell.py env.log \\\n' +
            '  "setenv bootargs console=ttyAMA0 rdinit=/init" \\\n' +
            '  "setenv bootcmd \'load virtio 0 \\${kernel_addr_r} Image; load virtio 0 0x48000000 initramfs.cpio.gz; booti \\${kernel_addr_r} 0x48000000:\\${filesize} \\${fdt_addr}\'" \\\n' +
            '  "saveenv" \\\n' +
            '  "printenv bootdelay bootargs bootcmd"\n' +
            'tr -d \'\\r\' < env.log | sed -n \'/Hit any/,$p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Hit any key to stop autoboot:  2  0\n' +
            '=>  \n' +
            '=> setenv bootargs console=ttyAMA0 rdinit=/init\n' +
            '=> setenv bootcmd \'load virtio 0 ${kernel_addr_r} Image; load virtio 0 0x48000000 initramfs.cpio.gz; booti ${kernel_addr_r} 0x48000000:${filesize} ${fdt_addr}\'\n' +
            '=> saveenv\n' +
            'Saving Environment to Flash... Un-Protected 1 sectors\n' +
            'Erasing Flash...\n' +
            '. done\n' +
            'Erased 1 sectors\n' +
            'Writing to Flash... done\n' +
            'Protected 1 sectors\n' +
            'OK\n' +
            '=> printenv bootdelay bootargs bootcmd\n' +
            'bootdelay=2\n' +
            'bootargs=console=ttyAMA0 rdinit=/init\n' +
            'bootcmd=load virtio 0 ${kernel_addr_r} Image; load virtio 0 0x48000000 initramfs.cpio.gz; booti ${kernel_addr_r} 0x48000000:${filesize} ${fdt_addr}' },

          { t: 'cmdx', cmd: 'setenv bootcmd \'load virtio 0 ${kernel_addr_r} Image; load … 0x48000000 initramfs.cpio.gz; booti …\'',
            title: 'Một bootcmd không dò tìm gì cả',
            rows: [
              ['<code>\\${…}</code>', 'Trong shell của WSL, <code>\\$</code> giữ nguyên ký tự <code>$</code> để nó tới ' +
               'được U-Boot. U-Boot thay <code>${kernel_addr_r}</code> lúc chạy lệnh (0x40400000), không phải lúc ' +
               '<code>setenv</code>, nhờ nháy đơn bao quanh.'],
              ['<code>load virtio 0 … Image</code>', 'Đọc file từ hệ thống file trên ổ virtio số 0, vào địa chỉ RAM cho ' +
               'trước. Bài 35 đã dạy <code>load</code> và <code>booti</code>.'],
              ['<code>0x48000000</code>', 'Initramfs đặt ở 0x48000000 thay vì <code>${ramdisk_addr_r}</code> ' +
               '(0x44000000) của bản U-Boot này: <code>Image</code> 60 430 848 byte (0x39A1A00) nạp ở 0x40400000 kéo tới ' +
               '0x43DA1A00, chỉ còn ~2,4 MB trước 0x44000000. Chọn chỗ xa hơn để một kernel lớn hơn chút nữa không đè ' +
               'lên initramfs. (Bài không thử trường hợp đè; đây là phòng ngừa.)'],
              ['<code>${filesize}</code>', '<code>load</code> đặt biến này bằng số byte vừa đọc — ở đây là của ' +
               'initramfs, vì nó được nạp sau cùng.'],
              ['<code>Hit any key…  2  0</code>', 'Script nhấn phím khi đếm tới 2, U-Boot dừng ngay ở 0. ' +
               '<code>bootdelay=2</code> là mặc định của bản này.']
            ] },

          { t: 'p', x: 'Boot ba lần, không chạm phím nào:' },

          { t: 'code', where: 'wsl', code:
            'F="-drive if=pflash,format=raw,index=0,file=flash0.img,readonly=on -drive if=pflash,format=raw,index=1,file=flash1.img"\n' +
            'D="-drive file=boot.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0"\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic $F $D > uboot2-$i.log\n' +
            '  grep -a -E \'Hit any|Starting kernel|Run /init|~ # \' uboot2-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   2.140] Hit any key to stop autoboot:  2  1  0 \n' +
            '[   2.198] Starting kernel ...\n' +
            '[   4.000] [    1.427258] Run /init as init process\n' +
            '[   4.079] ~ # \n' +
            '[   2.158] Hit any key to stop autoboot:  2  1  0 \n' +
            '[   2.221] Starting kernel ...\n' +
            '[   4.108] [    1.494744] Run /init as init process\n' +
            '[   4.188] ~ # \n' +
            '[   2.139] Hit any key to stop autoboot:  2  1  0 \n' +
            '[   2.182] Starting kernel ...\n' +
            '[   4.071] [    1.508663] Run /init as init process\n' +
            '[   4.167] ~ # ' },

          { t: 'p', x:
            'Dấu nhắc ở <b>4,08–4,19 s</b>. Dòng <code>Hit any key</code> được đóng dấu lúc ~2,14 s vì cả dòng đếm ' +
            'ngược chỉ xuống dòng khi đếm xong. Kernel vẫn báo <code>Run /init</code> ở 1,43–1,51 s — <b>nó không ' +
            'biết</b> mình đã chờ hơn 2 giây trước khi được chạy. Đây chính là điều hình đầu bài nói: đồng hồ printk ' +
            'không thấy bootloader. Toàn bộ phần U-Boot:' },

          { t: 'code', where: 'wsl', code:
            'grep -a -v \'\\] \\[\' uboot2-1.log | grep -a -v \'^\\[ *[0-9.]*\\] *$\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.053] U-Boot 2021.01+dfsg-3ubuntu0~20.04.6 (Jan 11 2023 - 18:29:44 +0000)\n' +
            '[   0.054] DRAM:  512 MiB\n' +
            '[   0.129] Flash: 128 MiB\n' +
            '[   0.135] Loading Environment from Flash... OK\n' +
            '[   0.138] In:    pl011@9000000\n' +
            '[   0.138] Out:   pl011@9000000\n' +
            '[   0.138] Err:   pl011@9000000\n' +
            '[   0.138] Net:   No ethernet found.\n' +
            '[   2.140] Hit any key to stop autoboot:  2  1  0 \n' +
            '[   2.185] 60430848 bytes read in 38 ms (1.5 GiB/s)\n' +
            '[   2.187] 1030531 bytes read in 1 ms (982.8 MiB/s)\n' +
            '[   2.188] ## Flattened Device Tree blob at 40000000\n' +
            '[   2.188]    Booting using the fdt blob at 0x40000000\n' +
            '[   2.192]    Loading Ramdisk to 5ecf5000, end 5edf0983 ... OK\n' +
            '[   2.196]    Loading Device Tree to 000000005ebf2000, end 000000005ecf4fff ... OK\n' +
            '[   2.198] Starting kernel ...\n' +
            '[   4.072] === init running as PID 1 ===\n' +
            '[   4.076] BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
            '[   4.077] Enter \'help\' for a list of built-in commands.\n' +
            '[   4.078] /bin/sh: can\'t access tty; job control turned off\n' +
            '[   4.079] ~ # ',
            notes: ['Lệnh lọc bỏ các dòng kernel (có hai cặp ngoặc) và các dòng trống. <code>Loading Environment from Flash... OK</code> — không còn <code>bad CRC</code> — xác nhận <code>saveenv</code> ở trên đã nằm trong <code>flash1.img</code>.'] },

          { t: 'p', x:
            'Đọc từng đoạn. U-Boot khởi tạo xong ở <b>0,138 s</b>, rồi <b>2,0 s</b> chờ đếm ngược. Nạp ' +
            '<code>Image</code> 60 430 848 byte mất <b>38 ms</b> và initramfs 1 ms. Chuyển ramdisk và Device Tree, ' +
            '<code>Starting kernel</code> ở 2,198 s. Phần U-Boot thực sự làm việc chỉ ~0,2 s; <b>90 % thời gian ' +
            'bootloader là chờ một người không có mặt</b>. Đặt <code>bootdelay=0</code>:' },

          { t: 'code', where: 'wsl', code:
            'python3 ubshell.py env0.log "setenv bootdelay 0" "saveenv"\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic $F $D > uboot0-$i.log\n' +
            '  grep -a -E \'Hit any|Starting kernel|Run /init|~ # \' uboot0-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.137] Hit any key to stop autoboot:  0 \n' +
            '[   0.187] Starting kernel ...\n' +
            '[   2.052] [    1.457697] Run /init as init process\n' +
            '[   2.133] ~ # \n' +
            '[   0.141] Hit any key to stop autoboot:  0 \n' +
            '[   0.178] Starting kernel ...\n' +
            '[   2.010] [    1.443456] Run /init as init process\n' +
            '[   2.092] ~ # \n' +
            '[   0.145] Hit any key to stop autoboot:  0 \n' +
            '[   0.181] Starting kernel ...\n' +
            '[   1.971] [    1.414298] Run /init as init process\n' +
            '[   2.056] ~ # ' },

          { t: 'cal', kind: 'warn', title: 'bootdelay=0 vẫn dừng được — bootdelay=-2 thì không',
            x: 'Với <code>bootdelay=0</code>, U-Boot vẫn kiểm tra bàn phím đúng một lần; <code>ubshell.py</code> nhấn ' +
               'phím liên tục nên vẫn bắt được (bản ghi in <code>Hit any key to stop autoboot:  0  0</code>). Một người ' +
               'gõ tay thì gần như không kịp. <code>bootdelay=-2</code> bỏ hẳn bước kiểm tra — boot nhanh hơn thêm vài ' +
               'mili giây, nhưng nếu <code>bootcmd</code> hỏng thì bo mạch không bao giờ dừng ở dấu nhắc. Trên QEMU ' +
               'bạn chỉ cần xoá <code>flash1.img</code>; trên bo mạch thật thì phải nạp lại flash bằng JTAG hoặc chế ' +
               'độ USB recovery. Bài này dừng ở <code>0</code>.' },

          { t: 'p', x:
            '<code>Starting kernel</code> từ 2,18–2,22 s về <b>0,18–0,19 s</b>; dấu nhắc từ 4,08–4,19 s về ' +
            '<b>2,06–2,13 s</b>. Đúng 2 giây, như dự đoán. Phần còn lại giờ là kernel của Bài 65 — thay bằng kernel ' +
            '<code>tinyconfig</code> của Bước 5 và tạo lại <code>boot.img</code>:' },

          { t: 'code', where: 'wsl', code:
            'rm -rf boot && mkdir -p boot\n' +
            'cp b-tiny/arch/arm64/boot/Image initramfs.cpio.gz boot/\n' +
            'rm -f boot.img && truncate -s 128M boot.img && mkfs.ext4 -F -q -d boot boot.img\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic $F $D > ubtiny-$i.log\n' +
            '  grep -a -E \'bytes read|Starting kernel|Run /init|~ # \' ubtiny-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   0.187] 3303432 bytes read in 5 ms (630.1 MiB/s)\n' +
            '[   0.189] 1030531 bytes read in 1 ms (982.8 MiB/s)\n' +
            '[   0.199] Starting kernel ...\n' +
            '[   0.540] [    0.201994] Run /init as init process\n' +
            '[   0.608] ~ # \n' +
            '[   0.180] 3303432 bytes read in 7 ms (450.1 MiB/s)\n' +
            '[   0.182] 1030531 bytes read in 1 ms (982.8 MiB/s)\n' +
            '[   0.191] Starting kernel ...\n' +
            '[   0.529] [    0.200523] Run /init as init process\n' +
            '[   0.598] ~ # \n' +
            '[   0.141] 3303432 bytes read in 4 ms (787.6 MiB/s)\n' +
            '[   0.143] 1030531 bytes read in 1 ms (982.8 MiB/s)\n' +
            '[   0.153] Starting kernel ...\n' +
            '[   0.492] [    0.200033] Run /init as init process\n' +
            '[   0.559] ~ # ' },

          { t: 'p', x:
            '<b>0,56–0,61 s</b> cho cả chuỗi U-Boot → kernel → shell. Mục tiêu dưới 1 giây đã đạt. Thêm một điều: ' +
            'kernel nhỏ cũng làm U-Boot nhanh hơn — nạp 3,3 MB mất 4–7 ms thay vì 38 ms cho 60 MB. Trên một bo mạch ' +
            'đọc từ eMMC hay SPI flash ở vài chục MB/s, khoảng cách đó là hàng giây, không phải mili giây.' },

          { t: 'p', x:
            'Bước cuối: <code>quiet</code>. Trong QEMU nó gần như không đổi gì (Bước 1), nhưng đây là thiết lập mà ' +
            'sản phẩm thật sẽ dùng — và trên UART thật, Bước 1 đã tính nó đáng giá ~1,4 s với kernel lớn. Sửa ' +
            '<code>bootargs</code> và đo lần cuối:' },

          { t: 'code', where: 'wsl', code:
            'python3 ubshell.py envq.log "setenv bootargs console=ttyAMA0 rdinit=/init quiet" "saveenv" "printenv bootdelay bootargs"\n' +
            'tr -d \'\\r\' < envq.log | tail -n 3\n' +
            'for i in 1 2 3; do\n' +
            '  ./stamp.py \'~ # \' qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic $F $D > final-$i.log\n' +
            '  grep -a -E \'Starting kernel|=== init|~ # \' final-$i.log\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bootdelay=0\n' +
            'bootargs=console=ttyAMA0 rdinit=/init quiet\n' +
            '=> \n' +
            '[   0.156] Starting kernel ...\n' +
            '[   0.548] === init running as PID 1 ===\n' +
            '[   0.554] ~ # \n' +
            '[   0.154] Starting kernel ...\n' +
            '[   0.547] === init running as PID 1 ===\n' +
            '[   0.554] ~ # \n' +
            '[   0.160] Starting kernel ...\n' +
            '[   0.551] === init running as PID 1 ===\n' +
            '[   0.558] ~ # ' },

          { t: 'p', x:
            '<b>0,554–0,558 s</b>, và giữa <code>Starting kernel</code> với <code>=== init</code> không còn một dòng ' +
            'kernel nào trên console. So với lần không <code>quiet</code> ở trên (0,56–0,61 s), khoảng mới hẹp hơn và ' +
            'nằm ở đầu dưới của khoảng cũ — đúng bậc 20–50 ms mà 71 dòng log có thể tốn trong QEMU. Tổng kết cả bài:' },

          { t: 'table',
            head: ['Cấu hình', 'Dấu nhắc (host, 3 lần)', '<code>Run /init</code> (printk)', 'Bước'],
            rows: [
              ['U-Boot <code>bootdelay=2</code> + kernel Bài 65', '<b>4,08–4,19 s</b>', '1,43–1,51 s', '6'],
              ['U-Boot <code>bootdelay=0</code> + kernel Bài 65', '2,06–2,13 s', '1,41–1,46 s', '6'],
              ['<code>-kernel</code>, kernel Bài 65', '1,83–1,85 s', '1,39–1,41 s', '1'],
              ['<code>-kernel</code>, + <code>initcall_blacklist=jent_mod_init</code>', '1,80–1,82 s', '1,37–1,39 s', '4'],
              ['<code>-kernel</code>, <code>b-small</code> (bỏ ftrace, dynamic debug)', '0,88–1,07 s', '0,68–0,71 s', '4'],
              ['<code>-kernel</code>, <code>b-tiny</code>', '0,37–0,39 s', '0,21–0,22 s', '5'],
              ['U-Boot <code>bootdelay=0</code> + <code>b-tiny</code>', '0,56–0,61 s', '0,20 s', '6'],
              ['U-Boot <code>bootdelay=0</code> + <code>b-tiny</code> + <code>quiet</code>', '<b>0,554–0,558 s</b>', '— (không in)', '6']
            ] },

          { t: 'cal', kind: 'info', title: 'Hai hàng U-Boot + b-tiny chậm hơn -kernel + b-tiny 0,2 s — vì sao',
            x: 'U-Boot tự nó cần ~0,14 s để khởi tạo (dòng <code>Net: No ethernet found.</code> ở 0,138 s) và ~0,05 s ' +
               'để nạp file và chuyển Device Tree. Với <code>-kernel</code>, QEMU làm những việc đó bằng code C trên ' +
               'host, gần như tức thì. Trên phần cứng thật, không có "QEMU làm hộ" — bootloader là bắt buộc, và ' +
               '<b>Falcon mode</b> (SPL nạp thẳng kernel) là cách người ta cắt nốt 0,1–0,2 s này.' }
        ] }

    ] },

    /* ============================================================
       5. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Dòng đầu của <code>dmesg</code> là một <code>initcall …</code> ở ~0,77 s, không phải <code>Booting Linux</code>; chỉ ~840 initcall',
         'Thiếu <code>log_buf_len=4M</code>: ~4 000 dòng <code>initcall_debug</code> tràn vòng log 128 KiB, phần đầu bị ghi đè.',
         'Thêm <code>log_buf_len=4M</code> vào dòng lệnh kernel. Kiểm tra bằng <code>head -n 1</code>.'],
        ['<code>No data found in the dmesg. Make sure that \'printk.time=1\' and \'initcall_debug\' …</code>, file <code>.svg</code> 0 byte, mã trả về vẫn 0',
         'Đưa cho <code>bootgraph.pl</code> bản ghi console (không có dòng <code>calling</code> vì chúng là <code>KERN_DEBUG</code>) hoặc boot thiếu <code>initcall_debug</code>.',
         'Lấy <code>dmesg</code> từ trong máy ảo (Bước 2, qua 9p). Kiểm tra kích thước file, đừng tin <code>$?</code>.'],
        ['<code>show_delta</code> in lại nguyên dòng log kèm một dòng trống, không có <code>&lt; delta &gt;</code>, không báo lỗi',
         'Script dùng <code>string.split</code>/<code>string.atof</code> của Python 2; <code>except:</code> trơn nuốt lỗi.',
         'Dùng dòng <code>awk -F\'[][]\'</code> của Bước 3.'],
        ['<code>*** The source tree is not clean, please run \'make ARCH=arm64 mrproper\'</code>',
         '<code>make O=…</code> từ một cây nguồn đã build tại chỗ (<code>~/bai38</code>).',
         '<b>Không</b> <code>mrproper</code>. Giải nén một bản nguồn sạch riêng (Bước 4).'],
        ['<code>*** Your GCC is older than 10.0 and is not supported</code> khi build U-Boot',
         'U-Boot v2026.07 (Bài 34) yêu cầu GCC ≥ 10 (<code>arch/arm/config.mk:76</code>); máy này có GCC 9.4.',
         'Dùng <code>u-boot.bin</code> từ gói <code>u-boot-qemu</code> (Bước 6), hoặc một toolchain mới hơn.'],
        ['U-Boot in <code>** No partition table - virtio 0 **</code> rồi thử <code>DHCP</code>/<code>TFTP</code> và <code>TFTP error: \'Access violation\'</code>',
         '<code>bootcmd</code> mặc định (<code>distro_bootcmd</code>) quét <b>phân vùng</b> tìm <code>boot.scr</code>; <code>boot.img</code> không có bảng phân vùng, nên nó bỏ qua ổ đĩa và thử mạng.',
         'Đặt <code>bootcmd</code> trực tiếp như Bước 6, với <code>virtio 0</code> (không <code>:1</code>).'],
        ['Mọi thời gian boot chậm gấp 2–3 lần bình thường (dấu nhắc ~6 s)',
         'Máy host đang bận: một <code>make -j</code>, một trình duyệt nặng. QEMU TCG chia CPU với chúng.',
         'Đợi máy rảnh rồi đo lại; luôn đo 3 lần.'],
        ['<code>initcall_debug</code> trên kernel nhỏ in <code>initcall 0xffff80008024db98 returned …</code> thay vì tên hàm',
         '<code>tinyconfig</code> tắt <code>KALLSYMS</code>, nên <code>%pS</code> không có bảng tên.',
         'Tra địa chỉ trong <code>System.map</code> của đúng bản build đó.'],
        ['Bỏ một initcall "95 ms" nhưng boot chỉ nhanh hơn ~20 ms',
         '<code>after … usecs</code> là thời gian trôi qua; việc nền (giải nén initramfs) chạy chen vào giữa.',
         'Luôn đo lại thời gian boot thật sau mỗi thay đổi, không cộng trừ số <code>initcall_debug</code>.']
      ] },

    { t: 'recap', items: [
      'Thời gian boot thật đo bằng <b>đồng hồ bên ngoài</b>. Dấu thời gian <code>printk</code> bắt đầu ở ' +
        '<code>sched_clock</code>, không thấy bootloader và không thấy <b>0,27 s</b> đầu của kernel Bài 65.',
      'Trong QEMU, console được <i>replay</i> và UART không có tốc độ baud, nên <code>quiet</code> gần như không đổi ' +
        'gì; trên UART thật 115 200 baud, <b>16 027</b> byte log tốn <b>~1,4 s</b>.',
      '<code>initcall_debug</code> cần <b><code>log_buf_len=4M</code></b>; tự nó thêm ~0,23 s. 1 915 initcall cộng ' +
        '1,115 s, trong đó <b>17</b> hàm chiếm 66 %. Trước khi đổi sang <code>arch_sys_counter</code>, con số ' +
        '<code>usecs</code> chỉ chính xác tới <b>4 ms</b> (<code>HZ=250</code>).',
      '<code>bootgraph.pl</code> vẽ initcall theo thời gian; nó trả mã <b>0</b> ngay cả khi in lỗi và tạo file rỗng. ' +
        '<code>show_delta</code> hỏng im lặng với Python 3 — dùng <code>awk</code>.',
      '<code>initcall_blacklist=</code> để <b>thử</b> trước khi build: bỏ <code>jent_mod_init</code> (95 ms) chỉ được ' +
        '<b>~20 ms</b> vì thời gian trôi qua ≠ thời gian tiết kiệm.',
      'Tách kernel debug và kernel sản phẩm: bỏ ftrace + dynamic debug → <code>Run /init</code> <b>1,40 → 0,68 s</b>, ' +
        '<code>Image</code> 60,4 → 49,3 MB. <code>tinyconfig</code> + 18 → <b>0,21 s</b>, 3,3 MB, nhưng mất ' +
        '<code>KALLSYMS</code>, mạng, devtmpfs, module.',
      'U-Boot <code>bootdelay=2</code> là <b>2,0 s</b> trong tổng 4,1 s. Với <code>bootdelay=0</code> + ' +
        '<code>b-tiny</code> + <code>quiet</code>: cả chuỗi <b>0,554–0,558 s</b> — dưới 1 giây, mỗi bước có số đo.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Chặng 12 kết thúc ở đây: bạn đã debug kernel bằng GDB, đọc oops, theo vết bằng ftrace, và giờ đo được từng ' +
         'mili giây của một lần boot. <b>Bài 67 — Dự án tổng hợp</b> mở Chặng 13 bằng việc ghép tất cả lại: U-Boot, ' +
         'một kernel và Device Tree tuỳ biến, driver bạn tự viết ở Chặng 10, rootfs dựng bằng Buildroot, và daemon ' +
         'userspace — đóng gói thành một sản phẩm có tài liệu. Kernel "sản phẩm" tách khỏi kernel debug ở Bước 4 của ' +
         'bài này chính là kiểu cấu hình mà dự án đó sẽ giao.' }
  ],

  quiz: [
    { q: 'Log kernel ghi <code>[    1.402307] Run /init as init process</code>. Đồng nghiệp kết luận "thiết bị boot tới userspace trong 1,4 giây". Vì sao kết luận này sai?',
      opts: [
        'Dấu thời gian tính bằng mili giây, không phải giây',
        'Đồng hồ <code>printk</code> bắt đầu ở <code>sched_clock</code>: nó không đếm thời gian bootloader và đoạn đầu của kernel trước khi bộ đếm được khởi tạo',
        'Dấu thời gian là thời gian CPU, không phải thời gian thật',
        '<code>Run /init</code> in ra trước khi kernel giải nén initramfs'
      ],
      a: 1,
      why: 'Bước 1 đo bằng đồng hồ host: đoạn trước <code>sched_clock</code> đã là 0,27 s trên kernel Bài 65, và Bước 6 cho thấy với U-Boot <code>bootdelay=2</code>, dấu nhắc ở ~4,1 s trong khi kernel vẫn báo <code>Run /init</code> ở ~1,4 s. Thời gian boot người dùng cảm nhận chỉ đo được từ bên ngoài thiết bị.' },

    { q: 'Bạn boot với <code>initcall_debug</code>, chạy <code>dmesg | head -n 1</code> và thấy <code>[    0.767835] initcall clk_mt8195_vdec_drv_init… returned 0 after 130 usecs</code>. Nguyên nhân có khả năng nhất?',
      opts: [
        'Kernel bỏ qua mọi initcall trước 0,77 s',
        '<code>CONFIG_PRINTK_TIME</code> bị tắt',
        'Vòng log mặc định 128 KiB đã tràn; phần đầu bị ghi đè. Cần <code>log_buf_len=4M</code>',
        '<code>dmesg</code> của BusyBox chỉ in 128 KB cuối'
      ],
      a: 2,
      why: 'Mỗi initcall sinh hai dòng; ~1 900 initcall là ~4 000 dòng, ~290 KB. Với <code>CONFIG_LOG_BUF_SHIFT=17</code>, vòng log chỉ giữ ~125 KB cuối (Bước 2 đo được 125 670 byte, 842 initcall). Dữ liệu thiếu mà không có lỗi nào — vì vậy luôn kiểm tra dòng đầu là <code>Booting Linux</code>.' },

    { q: '<code>initcall_debug</code> báo <code>jent_mod_init … after 95302 usecs</code>. Bạn bỏ nó bằng <code>initcall_blacklist</code> và đo lại: dấu nhắc chỉ sớm hơn ~20 ms. Giải thích đúng nhất?',
      opts: [
        '<code>initcall_blacklist</code> không thực sự bỏ hàm',
        'Con số <code>usecs</code> là thời gian trôi qua giữa hai lần đọc đồng hồ; trong lúc đó việc nền (giải nén initramfs) cũng dùng CPU và vẫn phải làm dù bỏ hàm',
        'QEMU luôn thêm 75 ms cố định',
        'Kernel tự chạy lại hàm bị blacklist sau khi boot'
      ],
      a: 1,
      why: 'Bước 4: <code>Freeing initrd memory</code> (kết thúc giải nén initramfs, việc chạy ở nền — <code>init/initramfs.c:784</code>) xuất hiện ở 0,556 s — giữa <code>calling</code> (0,482) và <code>returned</code> (0,578) của <code>jent_mod_init</code>. Bỏ hàm không bỏ được việc giải nén. Nguyên tắc: đo lại thời gian thật sau mỗi thay đổi.' },

    { q: 'Trong QEMU, thêm <code>quiet</code> chỉ làm dấu nhắc sớm hơn vài chục mili giây. Trên một bo mạch thật với console UART 115 200 baud, bạn nên kỳ vọng gì với cùng 16 KB log?',
      opts: [
        'Cũng vài chục mili giây, vì log ghi vào RAM',
        'Khoảng 1,4 giây: 115 200 baud ở khung 8N1 chỉ đẩy ~11 520 byte/giây, và console đồng bộ làm kernel chờ',
        'Không khác gì, vì <code>quiet</code> chỉ ảnh hưởng tới <code>dmesg</code>',
        'Chậm hơn, vì <code>quiet</code> bắt kernel lọc từng dòng'
      ],
      a: 1,
      why: 'PL011 của QEMU chuyển byte ra stdout tức thì, không mô phỏng baud. Bo mạch thật thì có: 16 027 ÷ 11 520 ≈ 1,39 s. <code>quiet</code> không bỏ log khỏi vòng log (vẫn đọc được bằng <code>dmesg</code>), chỉ không đẩy nó ra console — và đó chính là phần chậm, như Bài 65 đã đo với <code>pr_info</code>.' },

    { q: 'Vì sao bỏ <code>FTRACE</code> làm nhanh cả những initcall không liên quan tới tracing (ví dụ <code>physmap_init</code> 41 → 18 ms)?',
      opts: [
        'ftrace khoá CPU trong lúc boot',
        'Với <code>FUNCTION_TRACER</code>, mọi hàm trong kernel có thêm lệnh ở đầu (điểm vá), kernel lớn hơn 11 MB nên ít vừa cache, và việc nền <code>eval_map_work</code> chen vào; bỏ ftrace thì cả ba biến mất',
        'ftrace ghi mọi lời gọi hàm vào ring buffer từ lúc boot',
        '<code>physmap_init</code> gọi trực tiếp ftrace'
      ],
      a: 1,
      why: 'Bài 65 đã cho thấy <code>-fpatchable-function-entry</code> chèn lệnh vào đầu mọi hàm, kể cả khi không tracer nào bật. Bước 1 bài này đo thêm ~0,2 s để ghi 71 822 điểm vá, Bước 2 đo 261 ms chờ <code>trace_eval_sync</code>. Đây là lý do kernel sản phẩm và kernel debug là hai cấu hình khác nhau.' },

    { q: 'Bạn muốn U-Boot boot nhanh nhất nhưng vẫn cứu được bo mạch nếu <code>bootcmd</code> hỏng. Lựa chọn hợp lý?',
      opts: [
        '<code>bootdelay=-2</code>: bỏ hẳn kiểm tra phím',
        '<code>bootdelay=0</code>: không đếm ngược nhưng vẫn kiểm tra phím một lần, nên vẫn dừng được nếu phím được nhấn sẵn lúc bật máy',
        '<code>bootdelay=2</code>, vì 2 giây không đáng kể',
        'Xoá biến <code>bootcmd</code>'
      ],
      a: 1,
      why: 'Bước 6 đo <code>bootdelay=2</code> tốn đúng 2,0 s trên tổng 4,1 s. <code>bootdelay=0</code> lấy lại gần hết, và <code>ubshell.py</code> vẫn dừng được nó (<code>Hit any key to stop autoboot:  0  0</code>). <code>-2</code> nhanh hơn vài mili giây nhưng biến một <code>bootcmd</code> hỏng thành bo mạch phải nạp lại flash bằng JTAG.' }
  ]
});

/* Bài 41 — Kernel cmdline, log và tối ưu kích thước
   Chặng 07 — Linux Kernel
   Dòng lệnh kernel: ai đưa, ai đọc, ba đường đi của một tham số (__setup / early_param /
   argv-envp của init); console= và earlycon; root= / init= / rdinit= / panic= và các kiểu
   panic thật; printk với tám mức log, vòng đệm 128 KiB và /proc/sys/kernel/printk; đọc log
   boot theo giai đoạn; và cắt Image từ 41 089 536 B xuống 3 303 432 B. Mọi số liệu đo trên
   kernel 6.18.45 do Bài 40 build, ARCH=arm64, QEMU virt, máy 6 nhân / 4,8 GiB RAM. */

Lesson.register({
  id: 'bai-41',
  title: 'Kernel cmdline, log và tối ưu kích thước',
  minutes: 60,
  practice: 'Thực hành 90 phút',
  level: 'Trung cấp',

  intro:
    'Bài 40 kết thúc bằng một dòng lệnh QEMU dài, trong đó có đoạn ' +
    '<code>-append "console=ttyAMA0 rdinit=/init"</code>. Bạn đã gõ nó và nó chạy — nhưng ' +
    'chưa ai nói cho bạn biết hai chữ đó làm gì, ai đọc chúng, và điều gì xảy ra nếu gõ sai ' +
    'một ký tự. Đây là bài trả lời. <b>Dòng lệnh kernel là giao diện điều khiển duy nhất bạn ' +
    'có với một kernel đã biên dịch xong</b>: không sửa mã, không build lại, chỉ đổi một ' +
    'chuỗi văn bản là đổi được console, đổi được chương trình đầu tiên, bật tắt được toàn bộ ' +
    'log. Trên máy bàn bạn gần như không bao giờ chạm vào nó; trên một bo mạch nhúng câm ' +
    'lặng, nó là thứ đầu tiên và đôi khi là thứ duy nhất bạn còn có thể vặn.<br><br>' +
    'Bài này chia làm ba phần gắn chặt với nhau. Một: bạn mổ xẻ <code>console=</code>, ' +
    '<code>root=</code>, <code>init=</code>, <code>loglevel=</code> — và cố tình gõ sai từng ' +
    'cái để nhìn tận mắt triệu chứng, vì trên bo mạch thật bạn sẽ chỉ được nhìn thấy triệu ' +
    'chứng. Hai: bạn học đọc chính cái log 247 dòng mà Bài 40 đã in ra, hiểu tám mức ưu tiên ' +
    'của <code>printk</code>, và khám phá ra rằng vòng đệm trong nhân đang giữ ' +
    '<b>nhiều hơn</b> những gì màn hình cho bạn xem. Ba: bạn tấn công con số 41 MB — kích ' +
    'thước file <code>Image</code> của Bài 40 — và ép nó xuống còn <b>3,15 MiB</b> mà vẫn ' +
    'boot được vào shell.',

  goals: [
    'Chỉ ra được đường đi đầy đủ của dòng lệnh kernel: từ <code>-append</code> của QEMU, qua ' +
      'node <code>/chosen</code> của Device Tree, vào nhân, rồi ra <code>/proc/cmdline</code>.',
    'Giải thích được <b>ba</b> số phận khác nhau của một tham số — bị <code>__setup()</code> ' +
      'nuốt, bị <code>early_param()</code> nuốt sớm hơn, hay bị đẩy sang user space làm ' +
      '<i>argv</i>/<i>envp</i> của <code>init</code> — và chứng minh được bằng ' +
      '<code>foo=bar hello</code>.',
    'Chẩn đoán được ba triệu chứng chết người của người mới: kernel im hoàn toàn, ' +
      '<code>VFS: Unable to mount root fs</code>, và vòng lặp reboot bất tận; nói được ' +
      '<code>earlycon</code> cứu cái nào trong ba cái đó.',
    'Đọc được tám mức log của <code>printk</code>, giải thích được bốn con số trong ' +
      '<code>/proc/sys/kernel/printk</code>, và tìm ra <b>10</b> dòng đang nằm trong vòng đệm ' +
      'mà console chưa từng in.',
    'Dùng <code>dmesg</code> để lọc log theo mức và theo hệ thống con, cả bản BusyBox trong ' +
      'máy ảo lẫn bản util-linux đầy đủ trên host.',
    'Cắt kernel từ <b>41 089 536 B</b> xuống <b>3 303 432 B</b> — nhỏ hơn <b>12,44 lần</b> — ' +
      'bằng <code>tinyconfig</code> cộng đúng 17 tuỳ chọn, và giải thích được từng nhóm ' +
      'byte đã biến đi đâu.'
  ],

  blocks: [

    /* ============================================================
       1. Dòng lệnh kernel — ai đưa, ai đọc
       ============================================================ */
    { t: 'h2', x: 'Dòng lệnh kernel: ai đưa, đưa tới đâu, ai đọc' },

    { t: 'p', x:
      '<b>Dòng lệnh kernel</b> (<i>kernel command line</i>, hay <i>cmdline</i>, hay ' +
      '<i>bootargs</i> — ba tên cùng một thứ) là <b>một chuỗi văn bản duy nhất</b> mà ' +
      'bootloader trao cho nhân ngay trước khi nhảy vào nó. Không có cấu trúc gì phức tạp: ' +
      'các <i>token</i> cách nhau bằng dấu cách, mỗi token có dạng <code>tên</code> hoặc ' +
      '<code>tên=giá_trị</code>. Toàn bộ quyền điều khiển một kernel đã đóng gói xong nằm ' +
      'trong chuỗi đó.' },

    { t: 'p', x:
      'Vì sao lại quan trọng đến thế? Vì <b>nó là thứ duy nhất thay đổi được mà không phải ' +
      'build lại</b>. File <code>Image</code> của bạn mất 18 phút 30 giây để dịch (Bài 40 đã ' +
      'đo). Nếu muốn thử tắt log, đổi console, hay chạy <code>/bin/sh</code> thay cho ' +
      '<code>init</code>, mà mỗi lần thử đều phải build lại thì không ai làm việc được. Dòng ' +
      'lệnh kernel cho bạn đổi hành vi trong <b>một giây</b>, và trên bo mạch thật nó nằm ' +
      'trong biến môi trường <code>bootargs</code> của U-Boot — thứ bạn đã gặp ở Chặng 06 và ' +
      'sửa được ngay tại dấu nhắc U-Boot.' },

    { t: 'fig',
      cap: 'Trên QEMU, <code>-append</code> không đi thẳng vào nhân: QEMU ghi chuỗi đó vào ' +
           'node <code>/chosen</code> của Device Tree mà chính nó sinh ra, rồi nhân đọc lại ' +
           'từ đó. Trên bo mạch thật U-Boot làm đúng việc này với biến <code>bootargs</code>. ' +
           'Đầu ra cuối cùng luôn là <code>/proc/cmdline</code>.',
      svg:
      '<svg viewBox="0 0 720 262" width="720" role="img" aria-label="Đường đi của dòng lệnh kernel từ QEMU append qua Device Tree chosen bootargs vào nhân rồi ra proc cmdline">' +
      '<rect class="d-box-a" x="8" y="16" width="196" height="58" rx="8"/>' +
      '<text class="d-t" x="106" y="38" text-anchor="middle">Người dùng gõ</text>' +
      '<text class="d-tm" x="106" y="58" text-anchor="middle">-append "console=ttyAMA0 …"</text>' +

      '<rect class="d-box" x="262" y="16" width="196" height="58" rx="8"/>' +
      '<text class="d-t" x="360" y="38" text-anchor="middle">QEMU sinh Device Tree</text>' +
      '<text class="d-tm" x="360" y="58" text-anchor="middle">/chosen/bootargs</text>' +

      '<rect class="d-box-p" x="516" y="16" width="196" height="58" rx="8"/>' +
      '<text class="d-t" x="614" y="38" text-anchor="middle">Nhân đọc DT</text>' +
      '<text class="d-tm" x="614" y="58" text-anchor="middle">early_init_dt_scan_chosen()</text>' +

      '<line class="d-line" x1="204" y1="45" x2="254" y2="45"/>' +
      '<path class="d-arrow" d="M262 45 l-9 -4.5 v9 z"/>' +
      '<line class="d-line" x1="458" y1="45" x2="508" y2="45"/>' +
      '<path class="d-arrow" d="M516 45 l-9 -4.5 v9 z"/>' +

      '<line class="d-line" x1="614" y1="74" x2="614" y2="104"/>' +
      '<path class="d-arrow" d="M614 112 l-4.5 -9 h9 z"/>' +

      '<rect class="d-box-p" x="262" y="112" width="450" height="52" rx="8"/>' +
      '<text class="d-t" x="487" y="134" text-anchor="middle">parse_args() — quét từng token một</text>' +
      '<text class="d-ts" x="487" y="152" text-anchor="middle">early_param() chạy trước, __setup() chạy sau, phần còn lại bị đẩy sang user space</text>' +

      '<line class="d-line" x1="262" y1="138" x2="212" y2="138"/>' +
      '<path class="d-arrow" d="M204 138 l9 -4.5 v9 z"/>' +
      '<rect class="d-box-g" x="8" y="112" width="196" height="52" rx="8"/>' +
      '<text class="d-t" x="106" y="134" text-anchor="middle">In ra console</text>' +
      '<text class="d-tm" x="106" y="152" text-anchor="middle">Kernel command line: …</text>' +

      '<line class="d-line" x1="487" y1="164" x2="487" y2="196"/>' +
      '<path class="d-arrow" d="M487 204 l-4.5 -9 h9 z"/>' +
      '<rect class="d-box-g" x="262" y="204" width="450" height="46" rx="8"/>' +
      '<text class="d-t" x="487" y="223" text-anchor="middle">User space đọc lại nguyên văn</text>' +
      '<text class="d-tm" x="487" y="241" text-anchor="middle">cat /proc/cmdline</text>' +

      '<line class="d-line" x1="106" y1="164" x2="106" y2="219"/>' +
      '<line class="d-line" x1="106" y1="219" x2="254" y2="219"/>' +
      '<path class="d-arrow" d="M262 219 l-9 -4.5 v9 z"/>' +
      '<text class="d-ts" x="106" y="240" text-anchor="middle">cùng một chuỗi</text>' +
      '</svg>' },

    { t: 'p', x:
      'Ba điểm cần nhớ từ sơ đồ trên. Một: <b>nhân in lại nguyên văn chuỗi nó nhận được</b>, ' +
      'ở dòng <code>Kernel command line:</code> — đây là dòng đầu tiên bạn phải tìm khi debug, ' +
      'vì nó phân biệt "tôi gõ sai" với "bootloader không chuyển được". Hai: ' +
      '<code>/proc/cmdline</code> trong user space chứa <b>đúng</b> chuỗi đó, không thêm không ' +
      'bớt, kể cả những token nhân không hiểu. Ba: giữa hai điểm ấy có một bộ phân tích tên là ' +
      '<code>parse_args()</code>, và nó quyết định số phận của từng token.' },

    { t: 'h3', x: 'Ba số phận của một token' },

    { t: 'p', x:
      'Nhân không có một danh sách tham số tập trung. Thay vào đó, <b>bất kỳ file .c nào ' +
      'trong cây nguồn cũng có thể tự đăng ký một tham số cho mình</b> bằng hai macro. Khi ' +
      'link, các đăng ký này được gom vào một section riêng trong <code>vmlinux</code>, và ' +
      '<code>parse_args()</code> duyệt section đó để tìm chủ nhân cho mỗi token.' },

    { t: 'terms', items: [
      ['early_param()', 'sớm', 'Đăng ký một tham số được xử lý <b>rất sớm</b>, trước cả khi cấp phát bộ nhớ hoạt động đầy đủ. Dùng cho những thứ phải có hiệu lực ngay từ dòng log đầu tiên: <code>loglevel</code>, <code>earlycon</code>, <code>debug</code>, <code>quiet</code>.'],
      ['__setup()', 'thường', 'Đăng ký một tham số được xử lý ở lượt quét thứ hai, muộn hơn. Dùng cho phần lớn tham số còn lại: <code>console=</code>, <code>root=</code>, <code>init=</code>, <code>rdinit=</code>.'],
      ['module_param()', 'module', 'Tham số của một driver, viết dạng <code>tên_module.tên_tham_số=giá_trị</code>. Không nằm trong phạm vi bài này; Chặng 08 sẽ dùng đến khi bạn viết module đầu tiên.'],
      ['unknown_bootoption()', 'còn lại', 'Hàm hứng những token <b>không ai nhận</b>. Nó không báo lỗi — nó đẩy chúng sang user space. Đây là chỗ nhiều người mới hiểu sai nhất.']
    ] },

    { t: 'p', x:
      'Đây là chỗ đăng ký thật của tám tham số bài này dùng, trong cây nguồn 6.18.45 bạn đã ' +
      'tải ở Bài 38. Mỗi dòng là một <code>file:số_dòng</code> bạn mở ra xem được ngay:' },

    { t: 'table',
      head: ['Tham số', 'Macro', 'Đăng ký tại'],
      rows: [
        ['<code>console=</code>', '<code>__setup</code>', '<code>kernel/printk/printk.c:2636</code>'],
        ['<code>loglevel=</code>', '<code>early_param</code>', '<code>init/main.c:265</code>'],
        ['<code>debug</code>', '<code>early_param</code>', '<code>init/main.c:245</code>'],
        ['<code>quiet</code>', '<code>early_param</code>', '<code>init/main.c:246</code>'],
        ['<code>earlycon</code>', '<code>early_param</code>', '<code>drivers/tty/serial/earlycon.c:249</code>'],
        ['<code>init=</code>', '<code>__setup</code>', '<code>init/main.c:574</code>'],
        ['<code>rdinit=</code>', '<code>__setup</code>', '<code>init/main.c:586</code>'],
        ['<code>root=</code>', '<code>__setup</code>', '<code>init/do_mounts.c:69</code>']
      ] },

    { t: 'cal', kind: 'info', title: 'Có bao nhiêu tham số tất cả?',
      x: 'Đếm trên chính cây nguồn của bạn: <b>763</b> chỗ gọi <code>__setup(</code> hoặc ' +
         '<code>early_param(</code> trong toàn bộ file <code>.c</code>. Tài liệu chính thức ' +
         '<code>Documentation/admin-guide/kernel-parameters.txt</code> dài <b>8 418</b> dòng. ' +
         'Không ai thuộc danh sách này, và bạn cũng không cần — nhưng <b>bạn cần biết nó nằm ở ' +
         'đâu</b>: file đó nằm sẵn trong cây nguồn bạn đã tải, tra bằng ' +
         '<code>grep -n "^\\s*loglevel" Documentation/admin-guide/kernel-parameters.txt</code> ' +
         'là ra ngay, không cần mạng.' },

    { t: 'p', x:
      'Số phận thứ ba mới là thứ gây bất ngờ. Nếu bạn gõ một token <b>không ai đăng ký</b>, ' +
      'nhân <b>không báo lỗi và không dừng lại</b>. Nó chia token đó làm đôi theo một quy tắc ' +
      'rất đơn giản — <b>có dấu <code>=</code> thì thành biến môi trường, không có dấu ' +
      '<code>=</code> thì thành tham số dòng lệnh</b> — rồi trao cả hai cho tiến trình ' +
      '<code>init</code> khi khởi động nó.' },

    { t: 'fig',
      cap: 'Quy tắc chỉ dựa vào việc token có dấu <code>=</code> hay không. Đây là lý do gõ ' +
           'nhầm <code>console-ttyAMA0</code> (dấu gạch nối thay vì bằng) không báo lỗi gì cả: ' +
           'nó lặng lẽ trở thành tham số <code>argv[1]</code> của init.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ ba số phận của một token trên dòng lệnh kernel">' +
      '<rect class="d-box-a" x="200" y="10" width="320" height="44" rx="8"/>' +
      '<text class="d-tm" x="360" y="30" text-anchor="middle">console=ttyAMA0 rdinit=/init foo=bar hello</text>' +
      '<text class="d-ts" x="360" y="47" text-anchor="middle">bốn token, cách nhau bằng dấu cách</text>' +

      '<line class="d-line" x1="360" y1="54" x2="360" y2="76"/>' +
      '<rect class="d-box-p" x="200" y="76" width="320" height="38" rx="8"/>' +
      '<text class="d-t" x="360" y="100" text-anchor="middle">parse_args(): token này có ai đăng ký không?</text>' +

      '<line class="d-line" x1="290" y1="114" x2="290" y2="140"/>' +
      '<line class="d-line" x1="290" y1="140" x2="120" y2="140"/>' +
      '<line class="d-line" x1="120" y1="140" x2="120" y2="156"/>' +
      '<path class="d-arrow" d="M120 164 l-4.5 -9 h9 z"/>' +
      '<text class="d-ts" x="196" y="134" text-anchor="middle">có</text>' +
      '<rect class="d-box-g" x="8" y="164" width="224" height="72" rx="8"/>' +
      '<text class="d-t" x="120" y="186" text-anchor="middle">Nhân giữ lại và xử lý</text>' +
      '<text class="d-tm" x="120" y="205" text-anchor="middle">console=ttyAMA0</text>' +
      '<text class="d-tm" x="120" y="222" text-anchor="middle">rdinit=/init</text>' +

      '<line class="d-line" x1="430" y1="114" x2="430" y2="140"/>' +
      '<text class="d-ts" x="524" y="134" text-anchor="middle">không ai nhận → unknown_bootoption()</text>' +
      '<line class="d-line" x1="430" y1="140" x2="620" y2="140"/>' +
      '<line class="d-line" x1="330" y1="140" x2="430" y2="140"/>' +
      '<line class="d-line" x1="330" y1="140" x2="330" y2="156"/>' +
      '<path class="d-arrow" d="M330 164 l-4.5 -9 h9 z"/>' +
      '<line class="d-line" x1="620" y1="140" x2="620" y2="156"/>' +
      '<path class="d-arrow" d="M620 164 l-4.5 -9 h9 z"/>' +

      '<rect class="d-box-w" x="248" y="164" width="212" height="72" rx="8"/>' +
      '<text class="d-t" x="354" y="186" text-anchor="middle">Có dấu = → envp của init</text>' +
      '<text class="d-tm" x="354" y="205" text-anchor="middle">foo=bar</text>' +
      '<text class="d-ts" x="354" y="223" text-anchor="middle">thấy được bằng lệnh env</text>' +

      '<rect class="d-box-w" x="476" y="164" width="236" height="72" rx="8"/>' +
      '<text class="d-t" x="594" y="186" text-anchor="middle">Không dấu = → argv của init</text>' +
      '<text class="d-tm" x="594" y="205" text-anchor="middle">hello</text>' +
      '<text class="d-ts" x="594" y="223" text-anchor="middle">thấy được bằng $* trong init</text>' +
      '</svg>' },

    { t: 'p', x:
      'Mã nguồn của quy tắc này nằm gọn trong <code>init/main.c</code>. Hàm ' +
      '<code>unknown_bootoption()</code> ở <b>dòng 499</b> là nơi phân loại; ' +
      '<code>print_unknown_bootoptions()</code> ở <b>dòng 807</b> là nơi in ra lời cảnh báo bạn ' +
      'sẽ thấy trong phần thực hành. Và hai dòng sau đây, ở <b>dòng 193–194</b>, là giá trị ' +
      'khởi điểm mà mọi tiến trình <code>init</code> trên Linux đều nhận được:' },

    { t: 'code', where: 'file', name: 'init/main.c — dòng 193 và 194', lang: 'c', code:
      'static const char *argv_init[MAX_INIT_ARGS+2] = { "init", NULL, };\n' +
      'const char *envp_init[MAX_INIT_ENVS+2] = { "HOME=/", "TERM=linux", NULL, };' },

    { t: 'cal', kind: 'why', title: 'Vì sao <code>HOME=/</code> và <code>TERM=linux</code> luôn có mặt',
      x: 'Ở Bài 20 bạn học rằng biến môi trường được kế thừa từ tiến trình cha. Nhưng ' +
         '<code>init</code> là PID 1 — <b>nó không có cha</b>. Vậy môi trường đầu tiên của cả ' +
         'hệ thống ở đâu ra? Câu trả lời nằm ngay ở dòng 194 trên: <b>nó được viết cứng trong ' +
         'mã C của nhân</b>. Mỗi biến bạn thêm vào dòng lệnh kernel dạng ' +
         '<code>tên=giá_trị</code> chỉ đơn giản là được nối thêm vào cái mảng hai phần tử đó. ' +
         'Đây không phải chuyện học thuộc — trong phần thực hành bạn sẽ chạy <code>env</code> ' +
         'ngay trong <code>init</code> và nhìn thấy đúng hai biến này, cộng thêm cái bạn tự ' +
         'thêm vào.' },

    { t: 'cal', kind: 'warn', title: 'Không báo lỗi không có nghĩa là đúng',
      x: 'Đây là cái bẫy tốn nhiều giờ nhất trong cả bài. Bạn gõ <code>rdinit=/init</code> ' +
         'thành <code>rd_init=/init</code>, hoặc <code>console=ttyAMA0</code> thành ' +
         '<code>console:ttyAMA0</code>. Nhân <b>không</b> nói gì. Nó im lặng biến token sai ' +
         'thành biến môi trường hoặc tham số cho init, rồi tiếp tục boot như thể bạn chưa hề ' +
         'gõ nó — và bạn ngồi nhìn một triệu chứng hoàn toàn không liên quan (màn hình câm, ' +
         'hoặc panic vì không tìm được init). Manh mối duy nhất là dòng <code>Unknown kernel ' +
         'command line parameters</code> trong log, và nếu console đang hỏng thì bạn cũng ' +
         'không đọc được nó. <b>Luôn đọc lại dòng <code>Kernel command line:</code> trước khi ' +
         'nghi ngờ bất cứ thứ gì khác.</b>' },

    /* ============================================================
       2. console= và earlycon
       ============================================================ */
    { t: 'h2', x: '<code>console=</code>: cửa sổ duy nhất nhìn vào nhân' },

    { t: 'p', x:
      '<code>console=</code> nói cho nhân biết <b>đổ log ra thiết bị nào</b>. Trên máy bàn ' +
      'câu hỏi này vô nghĩa vì đã có màn hình đồ hoạ; trên bo mạch nhúng thì gần như luôn là ' +
      'một cổng UART nối vào máy tính của bạn qua cáp USB-TTL, và nếu tham số này sai thì bạn ' +
      'mất <b>toàn bộ</b> khả năng quan sát. Cú pháp đầy đủ:' },

    { t: 'cmdx', cmd: 'console=ttyAMA0,115200n8', title: 'Bốn phần của một giá trị console=',
      rows: [
        ['<code>ttyAMA0</code>', 'Tên thiết bị, <b>không</b> có tiền tố <code>/dev/</code>.',
         'Đây là tên nhân đặt cho cổng, không phải tên file. <code>ttyAMA<i>n</i></code> = UART PL011 (ARM PrimeCell — thứ máy ảo <code>virt</code> có). <code>ttyS<i>n</i></code> = UART kiểu 8250/16550 (PC và nhiều SoC). <code>ttymxc<i>n</i></code> = i.MX của NXP. <code>ttyO<i>n</i></code> = OMAP của TI.'],
        ['<code>115200</code>', 'Tốc độ, đơn vị baud.',
         'Phải khớp <b>chính xác</b> với thiết lập ở đầu bên kia sợi cáp. Sai tốc độ thì bạn vẫn thấy ký tự — nhưng là ký tự rác. Bỏ trống thì nhân dùng mặc định của driver; QEMU không quan tâm nên bài này bỏ trống được.'],
        ['<code>n</code>', 'Parity: <code>n</code> = none, <code>e</code> = even, <code>o</code> = odd.',
         'Gần như luôn là <code>n</code>. Đây là di sản của thời modem; ngày nay hầu như không ai dùng parity nữa.'],
        ['<code>8</code>', 'Số bit dữ liệu mỗi ký tự.',
         'Gần như luôn là <code>8</code>. Cụm <code>115200n8</code> đọc là "115200 baud, no parity, 8 bit" và bạn sẽ thấy nó lặp lại trong mọi tài liệu bo mạch.']
      ] },

    { t: 'p', x:
      'Có một chi tiết về <b>thời điểm</b> mà hầu hết người mới bỏ qua, và nó giải thích ' +
      'nhiều chuyện. Nhân bắt đầu <code>printk</code> ngay từ dòng đầu tiên, nhưng driver ' +
      'UART là một driver bình thường — nó chỉ được nạp khi hệ thống driver đã sẵn sàng, tức ' +
      'là <b>rất muộn</b>. Trong lần boot mốc chuẩn của Bài 40, ba dòng này đứng cạnh nhau ở ' +
      'vị trí 104, 105 và 106:' },

    { t: 'code', where: 'out', nocopy: true, name: 'f1-baseline.log, dòng 104–106', code:
      '[    1.019068] Serial: AMBA PL011 UART driver\n' +
      '[    1.194841] 9000000.pl011: ttyAMA0 at MMIO 0x9000000 (irq = 13, base_baud = 0) is a PL011 rev1\n' +
      '[    1.205247] printk: console [ttyAMA0] enabled',
      notes: [
        'Dấu thời gian sẽ khác trên máy bạn — nó phụ thuộc tải máy chủ. <b>Số thứ tự dòng thì ổn định</b>, và đó là thứ đáng nhớ.',
        '<code>0x9000000</code> là địa chỉ vật lý của cổng UART trên máy ảo <code>virt</code>; nó đến từ Device Tree, không phải từ dòng lệnh.'
      ] },

    { t: 'cal', kind: 'info', title: '105 dòng đầu tiên là log <i>phát lại</i>, không phải log trực tiếp',
      x: 'Console chỉ thật sự bật ở dòng <b>106</b>. Vậy 105 dòng trước đó đi đâu ra màn hình? ' +
         'Chúng <b>không</b> được in lúc sinh ra — chúng được nhân cất vào một vùng nhớ vòng ' +
         '(bạn sẽ mổ xẻ ở mục sau), rồi ngay khi console sẵn sàng, nhân <b>đổ ngược toàn bộ ' +
         'vùng nhớ đó ra</b>. Đây là lý do bạn thấy mấy chục dòng đầu xuất hiện cùng một lúc, ' +
         'gần như tức thì, rồi sau đó log mới chảy đều đặn. Và cũng là lý do phần tiếp theo — ' +
         '<code>earlycon</code> — tồn tại: nếu nhân chết <i>trước</i> dòng 106 thì vùng nhớ ' +
         'vòng chưa kịp đổ ra, và bạn không thấy một chữ nào.' },

    { t: 'h3', x: 'Ba cách gõ sai, ba triệu chứng khác nhau' },

    { t: 'p', x:
      'Bảng dưới là kết quả thật của bốn lần boot cùng một file <code>Image</code>, chỉ khác ' +
      'nhau ở <code>console=</code>. Phần thực hành sẽ cho bạn tự chạy lại từng dòng; ở đây ' +
      'hãy đọc trước để biết mình đang tìm cái gì:' },

    { t: 'table',
      head: ['Dòng lệnh kernel', 'Số dòng ra màn hình', 'Chuyện gì xảy ra'],
      rows: [
        ['<code>console=ttyAMA0 rdinit=/init</code>', '280',
         '<b>Mốc chuẩn.</b> Console bật ở dòng 106, vào được shell.'],
        ['<code>rdinit=/init</code> (không có <code>console=</code>)', '272',
         'Vẫn chạy. Nhân đọc <code>chosen/stdout-path</code> trong Device Tree và tự chọn ' +
         '<code>ttyAMA0</code>. Xuất hiện thêm <code>legacy console [tty0] enabled</code> ở ' +
         'dòng 66 — một console giả lập màn hình.'],
        ['<code>console=ttyS0 rdinit=/init</code>', '<b>1</b>',
         '<b>Câm hoàn toàn.</b> Máy ảo <code>virt</code> không có <code>ttyS0</code>. Một dòng ' +
         'duy nhất đó là thông báo của <code>timeout</code> giết QEMU, không phải của nhân.'],
        ['<code>console=ttyS0 earlycon rdinit=/init</code>', '273',
         'Thấy <b>toàn bộ</b> log boot — nhưng vẫn không vào được shell: nhân panic vì ' +
         '<code>Attempted to kill init!</code>.']
      ] },

    { t: 'cal', kind: 'danger', title: 'Triệu chứng "bo mạch không boot" nổi tiếng nhất',
      x: 'Dòng thứ ba trong bảng — <b>một dòng duy nhất</b>, không hề có chữ nào của nhân — ' +
         'là thứ bạn sẽ gặp ở dự án thật, và nó là cái bẫy tâm lý lớn nhất của nghề này. Màn ' +
         'hình câm khiến ai cũng nghĩ "kernel không boot". <b>Nó boot hoàn toàn bình thường.</b> ' +
         'Nó chỉ đang nói chuyện với một cổng không tồn tại. Trước khi bạn nghi ngờ file ' +
         '<code>Image</code>, nghi ngờ RAM, nghi ngờ bootloader, hay build lại lần thứ mười — ' +
         'hãy kiểm tra <code>console=</code> và tốc độ baud. Trong phần thực hành bạn sẽ tự ' +
         'gây ra triệu chứng này để nhớ mặt nó.' },

    { t: 'h3', x: '<code>earlycon</code>: cái đèn pin bật sớm hơn console' },

    { t: 'p', x:
      '<code>earlycon</code> là một console <b>tối giản, chỉ ghi, không có driver đầy đủ</b>: ' +
      'nó ghi thẳng ký tự vào thanh ghi phần cứng của UART tại địa chỉ vật lý mà Device Tree ' +
      'khai báo. Vì không cần gì cả, nó bật được <b>ngay từ dòng thứ bảy</b> của lần boot, ' +
      'thay vì dòng 106. Đổi lại, nó chậm, không nhận bàn phím, và nhân sẽ tắt nó ngay khi ' +
      'console thật lên.' },

    { t: 'code', where: 'out', nocopy: true, name: 'e7-earlycon.log — dòng 7 và 8', code:
      '[    0.000000] earlycon: pl11 at MMIO 0x0000000009000000 (options \'\')\n' +
      '[    0.000000] printk: legacy bootconsole [pl11] enabled',
      notes: [
        '<code>pl11</code> là tên trình điều khiển earlycon cho PL011 — nhân tự chọn nó dựa trên <code>compatible</code> trong Device Tree, bạn không phải nói tên cổng.',
        'Dấu thời gian <code>0.000000</code>: đây là những dòng sớm nhất mà cơ chế log có thể in ra.'
      ] },

    { t: 'p', x:
      'Và đây là khoảnh khắc bàn giao, ở bốn dòng 108–111 của cùng lần boot đó. Đọc kỹ vì sao ' +
      'mỗi dòng lại xuất hiện <b>hai lần</b>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'e7-earlycon.log — dòng 108–111', code:
      '[    0.263158] printk: console [ttyAMA0] enabled\n' +
      '[    0.263158] printk: console [ttyAMA0] enabled\n' +
      '[    0.264295] printk: legacy bootconsole [pl11] disabled\n' +
      '[    0.264295] printk: legacy bootconsole [pl11] disabled' },

    { t: 'cal', kind: 'why', title: 'Vì sao nhân bị "nói lắp" đúng bốn dòng này',
      x: 'Vì trong đúng khoảnh khắc đó <b>hai console cùng đang hoạt động</b>. Nhân gọi ' +
         '<code>printk</code> một lần, nhưng thông điệp được đẩy ra <i>mọi</i> console đang ' +
         'bật — mà <code>pl11</code> (earlycon) và <code>ttyAMA0</code> (console thật) lúc này ' +
         'trỏ vào <b>cùng một cổng UART vật lý</b> ở địa chỉ <code>0x9000000</code>. Nên bạn ' +
         'nhìn thấy mỗi dòng hai lần trên cùng một màn hình. Ngay sau dòng cuối, earlycon bị ' +
         'tắt và hiện tượng biến mất. Đây không phải lỗi — thấy nó là <b>bằng chứng ' +
         '<code>earlycon</code> đã làm đúng việc</b>, và trên bo mạch thật đó là dấu hiệu bàn ' +
         'giao thành công bạn nên chủ động tìm.' },

    { t: 'cal', kind: 'warn', title: '<code>earlycon</code> cho bạn <i>nhìn thấy</i>, không cho bạn <i>sửa</i>',
      x: 'Dòng thứ tư trong bảng trên là bài học đắt giá. Với ' +
         '<code>console=ttyS0 earlycon</code>, bạn thấy trọn vẹn 273 dòng log — nhưng ' +
         '<code>/dev/console</code> vẫn trỏ vào một cổng không tồn tại, nên nhân in ' +
         '<code>Warning: unable to open an initial console.</code> ở dòng 247, rồi ' +
         '<code>/bin/sh</code> khởi động mà không có stdin/stdout, thoát ngay, và PID 1 chết → ' +
         '<code>Kernel panic - not syncing: Attempted to kill init!</code>. Nói cách khác: ' +
         '<b><code>earlycon</code> là công cụ chẩn đoán, không phải cách chữa.</b> Nó cho bạn ' +
         'đọc được thông báo lỗi để biết phải sửa <code>console=</code> ở đâu.' },

    /* ============================================================
       3. root= / init= / rdinit= / panic=
       ============================================================ */
    { t: 'h2', x: 'Ba đường vào user space: <code>rdinit=</code>, <code>init=</code>, <code>root=</code>' },

    { t: 'p', x:
      'Bài 32 đã dạy bạn rằng nhân kết thúc phần việc của mình bằng cách chạy tiến trình đầu ' +
      'tiên, và nếu không chạy được thì nó panic. Giờ hãy xem <b>chính xác</b> nhân đi tìm ' +
      'tiến trình đó theo thứ tự nào — vì thứ tự này là nguồn gốc của những màn debug dài ' +
      'nhất. Mã nguồn nằm ở <code>init/main.c</code>, trong hàm ' +
      '<code>kernel_init()</code> quanh dòng 1462:' },

    { t: 'code', where: 'file', name: 'init/main.c — rút gọn từ dòng 1462', lang: 'c', code:
      'if (ramdisk_execute_command) {                 /* mac dinh la "/init" */\n' +
      '        ret = run_init_process(ramdisk_execute_command);\n' +
      '        if (!ret)\n' +
      '                return 0;\n' +
      '        pr_err("Failed to execute %s (error %d)\\n", ramdisk_execute_command, ret);\n' +
      '}\n' +
      '\n' +
      'if (execute_command) {                         /* dat boi init= */\n' +
      '        ret = run_init_process(execute_command);\n' +
      '        if (!ret)\n' +
      '                return 0;\n' +
      '        panic("Requested init %s failed (error %d).", execute_command, ret);\n' +
      '}\n' +
      '\n' +
      'if (!try_to_run_init_process("/sbin/init") ||\n' +
      '    !try_to_run_init_process("/etc/init")  ||\n' +
      '    !try_to_run_init_process("/bin/init")  ||\n' +
      '    !try_to_run_init_process("/bin/sh"))\n' +
      '        return 0;\n' +
      '\n' +
      'panic("No working init found.  Try passing init= option to kernel. "\n' +
      '      "See Linux Documentation/admin-guide/init.rst for guidance.");',
      notes: [
        'Chú thích trong đoạn trên là của bài học, không có trong mã gốc — thêm vào để bạn theo dõi dễ hơn.',
        '<code>ramdisk_execute_command</code> được khởi tạo <code>= "/init"</code> ngay ở <code>init/main.c:164</code>. Đó là lý do initramfs của bạn phải có file tên đúng là <code>/init</code>.'
      ] },

    { t: 'p', x:
      'Đọc đoạn mã trên từ trên xuống là ra ngay bốn kết luận mà bạn sẽ dùng suốt phần còn ' +
      'lại của khoá học:' },

    { t: 'list', ordered: true, items: [
      '<b>initramfs luôn thắng.</b> Nếu có initramfs và trong đó có <code>/init</code> chạy ' +
        'được, nhân dừng ở nhánh đầu tiên và <b>không bao giờ đọc đến <code>root=</code></b>. ' +
        'Bạn có thể gõ <code>root=/dev/vda</code> vào một máy không hề có ổ <code>vda</code> ' +
        'mà vẫn boot ngon lành — bạn sẽ tự kiểm chứng ở phần thực hành.',
      '<b><code>rdinit=</code> và <code>init=</code> là hai biến khác nhau</b>, không phải hai ' +
        'tên của cùng một thứ. <code>rdinit=</code> đổi đường dẫn tìm trong <i>initramfs</i>; ' +
        '<code>init=</code> đổi đường dẫn tìm trong <i>rootfs thật</i> sau khi đã mount xong.',
      '<b>Hai nhánh xử lý thất bại rất khác nhau.</b> <code>rdinit=</code> sai chỉ ' +
        '<code>pr_err</code> rồi <i>đi tiếp</i>; <code>init=</code> sai thì <b>panic ngay</b> ' +
        '(<code>panic("Requested init %s failed…")</code>). Nếu bạn gõ sai <code>init=</code>, ' +
        'bạn mất luôn cả bốn phương án dự phòng phía dưới.',
      '<b><code>/bin/sh</code> là phao cứu sinh cuối cùng.</b> Chú thích trong chính mã nguồn ' +
        'nói thẳng: <i>"The Bourne shell can be used instead of init if we are trying to ' +
        'recover a really broken machine."</i> Khi một bo mạch hỏng đến mức không chạy nổi ' +
        'init, thử <code>init=/bin/sh</code> là nước đi đầu tiên của người có kinh nghiệm.'
    ] },

    { t: 'fig',
      cap: 'Thứ tự tìm tiến trình đầu tiên. Nhánh trái (initramfs) chặn hoàn toàn nhánh phải: ' +
           'chừng nào <code>/init</code> trong initramfs còn chạy được thì <code>root=</code> ' +
           'không hề được đọc tới.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Cây quyết định của nhân khi tìm tiến trình init đầu tiên">' +
      '<rect class="d-box-p" x="230" y="8" width="260" height="40" rx="8"/>' +
      '<text class="d-t" x="360" y="33" text-anchor="middle">kernel_init() — hết việc của nhân</text>' +

      '<line class="d-line" x1="360" y1="48" x2="360" y2="66"/>' +
      '<rect class="d-box" x="196" y="66" width="328" height="40" rx="8"/>' +
      '<text class="d-t" x="360" y="91" text-anchor="middle">Có initramfs và chạy được rdinit (mặc định /init)?</text>' +

      '<line class="d-line" x1="196" y1="86" x2="128" y2="86"/>' +
      '<line class="d-line" x1="128" y1="86" x2="128" y2="126"/>' +
      '<path class="d-arrow" d="M128 134 l-4.5 -9 h9 z"/>' +
      '<text class="d-ts" x="162" y="80" text-anchor="middle">có</text>' +
      '<rect class="d-box-g" x="8" y="134" width="240" height="52" rx="8"/>' +
      '<text class="d-t" x="128" y="156" text-anchor="middle">Chạy nó. Xong.</text>' +
      '<text class="d-ts" x="128" y="175" text-anchor="middle">root= không bao giờ được đọc</text>' +

      '<line class="d-line" x1="360" y1="106" x2="360" y2="126"/>' +
      '<path class="d-arrow" d="M360 134 l-4.5 -9 h9 z"/>' +
      '<text class="d-ts" x="404" y="122" text-anchor="middle">không</text>' +
      '<rect class="d-box" x="262" y="134" width="450" height="40" rx="8"/>' +
      '<text class="d-t" x="487" y="159" text-anchor="middle">Mount thiết bị mà root= chỉ tới</text>' +

      '<line class="d-line" x1="262" y1="154" x2="248" y2="154"/>' +
      '<text class="d-ts" x="255" y="200" text-anchor="middle"> </text>' +

      '<line class="d-line" x1="487" y1="174" x2="487" y2="192"/>' +
      '<rect class="d-box-w" x="262" y="192" width="450" height="40" rx="8"/>' +
      '<text class="d-t" x="487" y="217" text-anchor="middle">Mount hỏng → panic: VFS: Unable to mount root fs</text>' +

      '<line class="d-line" x1="487" y1="232" x2="487" y2="250"/>' +
      '<rect class="d-box" x="262" y="250" width="450" height="44" rx="8"/>' +
      '<text class="d-t" x="487" y="270" text-anchor="middle">Mount xong → init= , rồi /sbin/init /etc/init /bin/init /bin/sh</text>' +
      '<text class="d-ts" x="487" y="287" text-anchor="middle">hết cả bốn → panic: No working init found.</text>' +
      '</svg>' },

    { t: 'h3', x: 'Các dạng giá trị của <code>root=</code>' },

    { t: 'p', x:
      'Bài này <b>không</b> dựng rootfs thật — đó là việc của Chặng 09, nơi bạn sẽ tự tay tạo ' +
      'ảnh ext4, SquashFS và UBIFS rồi boot vào chúng. Ở đây bạn chỉ cần thuộc mặt <i>cú ' +
      'pháp</i> và nhận ra <i>triệu chứng</i> khi nó sai, vì đó là hai thứ đi trước:' },

    { t: 'table',
      head: ['Dạng', 'Ý nghĩa', 'Khi nào dùng'],
      rows: [
        ['<code>root=/dev/mmcblk0p2</code>', 'Phân vùng 2 của thẻ SD/eMMC thứ nhất.',
         'Phổ biến nhất trên bo mạch nhúng có thẻ nhớ (Raspberry Pi, BeagleBone).'],
        ['<code>root=/dev/vda</code>', 'Ổ đĩa virtio thứ nhất — chỉ có trong máy ảo.',
         'QEMU với <code>-drive if=virtio</code>. Bạn sẽ dùng ở Chặng 09.'],
        ['<code>root=/dev/mtdblock3</code>', 'Phân vùng 3 của chip NOR/NAND flash.',
         'Bo mạch chỉ có flash thô, không có thẻ nhớ. Thường đi kèm <code>rootfstype=jffs2</code>.'],
        ['<code>root=PARTUUID=…</code>', 'Chỉ định bằng <b>định danh phân vùng</b> thay vì tên thiết bị.',
         '<b>Cách an toàn nhất.</b> Tên <code>/dev/sda</code> có thể đổi theo thứ tự nhân dò ra thiết bị; PARTUUID thì không.'],
        ['<code>root=/dev/nfs</code>', 'Rootfs nằm trên máy khác, lấy qua NFS.',
         'Khi phát triển: sửa file trên máy bàn, bo mạch thấy ngay, không phải nạp lại flash.']
      ] },

    { t: 'p', x:
      'Hai tham số hay đi kèm: <code>rootfstype=ext4</code> nói thẳng hệ thống tệp là gì (bỏ ' +
      'qua thì nhân thử lần lượt tất cả loại nó biết), và <code>rootwait</code> bảo nhân ' +
      '<b>chờ</b> thiết bị xuất hiện thay vì panic ngay. <code>rootwait</code> gần như bắt ' +
      'buộc với thẻ SD và USB, vì chúng thường được dò ra chậm hơn thời điểm nhân cần mount.' },

    { t: 'h3', x: 'Ba thông báo panic khác nhau — và cách phân biệt' },

    { t: 'p', x:
      'Đây là phần đáng giá nhất của mục này. Cả ba lần boot dưới đây đều kết thúc bằng chữ ' +
      '<code>Kernel panic</code>, nhưng <b>nguyên nhân hoàn toàn khác nhau</b>, và ' +
      'bạn phân biệt được chỉ bằng cách đọc kỹ vài dòng ngay trước dòng panic. Tất cả đều là ' +
      'ảnh chụp thật, bạn sẽ tự tái tạo ở phần thực hành.' },

    { t: 'code', where: 'out', nocopy: true, name: 'Trường hợp 1 — không có thiết bị nào cả', code:
      '[    1.007656] /dev/root: Can\'t open blockdev\n' +
      '[    1.008683] VFS: Cannot open root device "/dev/vda" or unknown-block(0,0): error -6\n' +
      '[    1.008983] Please append a correct "root=" boot option; here are the available partitions:\n' +
      '[    1.009492] 1f00          131072 mtdblock0 \n' +
      '[    1.009717]  (driver?)\n' +
      '[    1.010329] List of all bdev filesystems:\n' +
      '[    1.010508]  ext3\n' +
      '[    1.011350] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' },

    { t: 'cal', kind: 'why', title: 'Manh mối: <code>unknown-block(0,0)</code> và <code>error -6</code>',
      x: '<b><code>(0,0)</code></b> là cặp <i>major, minor</i> — số hiệu thiết bị khối. Cặp ' +
         '<code>0,0</code> nghĩa là <b>nhân không tìm được thiết bị nào khớp với tên bạn đưa</b>, ' +
         'nên nó không có số hiệu để điền. <b><code>error -6</code></b> là ' +
         '<code>-ENXIO</code> — <i>No such device or address</i>. Cộng lại: <b>thiết bị không ' +
         'tồn tại</b>. Nhân còn tử tế in ra danh sách những thứ nó <i>thật sự</i> nhìn thấy: ở ' +
         'đây chỉ có mỗi <code>mtdblock0</code>, không có <code>vda</code> nào. <b>Danh sách ' +
         'đó là câu trả lời</b> — nó nói cho bạn biết nên gõ <code>root=</code> thành gì.' },

    { t: 'code', where: 'out', nocopy: true, name: 'Trường hợp 2 — có đĩa, nhưng đĩa trống', code:
      '[    0.893893] List of all partitions:\n' +
      '[    0.894255] fe00           65536 vda \n' +
      '[    0.894341]  driver: virtio_blk\n' +
      '[    0.894569] 1f00          131072 mtdblock0 \n' +
      '[    0.894651]  (driver?)\n' +
      '[    0.894881] No filesystem could mount root, tried: \n' +
      '[    0.894929]  ext3\n' +
      '[    0.895077]  ext2\n' +
      '[    0.895158]  ext4\n' +
      '[    0.895236]  squashfs\n' +
      '[    0.895313]  vfat\n' +
      '[    0.895715] Kernel panic - not syncing: VFS: Unable to mount root fs on "/dev/vda" or unknown-block(254,0)' },

    { t: 'cal', kind: 'why', title: 'Manh mối: <code>(254,0)</code> và <code>No filesystem could mount root</code>',
      x: 'Lần này cặp major/minor là <b><code>(254,0)</code></b> — <b>một số thật</b>, không ' +
         'phải <code>0,0</code>. Nhân <i>đã tìm thấy</i> ổ đĩa: dòng <code>fe00 65536 vda ' +
         'driver: virtio_blk</code> chứng minh điều đó (<code>0xfe</code> = 254). Câu ' +
         '<code>No filesystem could mount root, tried:</code> thay cho câu <code>Please append ' +
         'a correct "root="</code> ở trường hợp 1 là dấu hiệu quyết định. <b>Bệnh đã đổi: ' +
         'không phải "sai tên thiết bị" nữa, mà là "thiết bị đúng nhưng bên trong không có hệ ' +
         'thống tệp nào nhân đọc được".</b> Sửa bằng cách format đĩa hoặc thêm ' +
         '<code>rootfstype=</code> cho đúng, chứ không phải sửa <code>root=</code>.' },

    { t: 'code', where: 'out', nocopy: true, name: 'Trường hợp 3 — sai đường dẫn rdinit', code:
      '[    3.835923] check access for rdinit=/nosuchfile failed: -2, ignoring',
      notes: [
        '<code>-2</code> là <code>-ENOENT</code> — <i>No such file or directory</i>.',
        'Chữ <b><code>ignoring</code></b> là mấu chốt: nhân <b>không</b> dừng ở đây. Nó bỏ qua rồi rơi xuống nhánh <code>root=</code>, và bạn nhận được một thông báo panic <i>hoàn toàn không nhắc gì đến <code>rdinit</code></i> — điều tra nhầm hướng là chuyện thường gặp.'
      ] },

    { t: 'h3', x: '<code>panic=N</code>: biến một lần chết thành một vòng lặp' },

    { t: 'p', x:
      'Mặc định, khi nhân panic nó <b>đứng im mãi mãi</b> — đó là hành vi bạn muốn khi đang ' +
      'ngồi trước màn hình, vì thông báo lỗi còn nguyên trên đó để đọc. Nhưng một thiết bị ' +
      'đặt trên cột đèn thì không có ai đọc; nó cần <b>tự khởi động lại</b> và thử tiếp. ' +
      '<code>panic=N</code> nói: sau khi panic, chờ <code>N</code> giây rồi reboot.' },

    { t: 'cal', kind: 'warn', title: '<code>panic=5</code> trên một lỗi cố định = vòng lặp bất tận',
      x: 'Đo thật: boot với <code>console=ttyAMA0 panic=5</code> và không có initramfs, trong ' +
         '<b>90 giây</b> máy ảo panic và reboot <b>15 lần</b>, sinh ra <b>4 141</b> dòng log. ' +
         'Vì nguyên nhân (không có rootfs) không tự khỏi sau khi reboot, mỗi vòng lặp lại y ' +
         'hệt vòng trước. <b>Đây chính là triệu chứng "bo mạch cứ khởi động lại liên tục"</b> ' +
         'mà bạn sẽ gặp ở dự án thật, và nó tệ hơn một lần panic đứng im: log lỗi trôi qua quá ' +
         'nhanh để đọc. Mẹo xử lý: nối cáp serial, ghi lại toàn bộ output ra file, rồi đọc ' +
         '<b>vòng lặp đầu tiên</b> — các vòng sau chỉ là bản sao.' },

    /* ============================================================
       4. printk, tám mức log, vòng đệm và dmesg
       ============================================================ */
    { t: 'h2', x: '<code>printk</code>: tám mức log, một vòng đệm, hai đường ra' },

    { t: 'p', x:
      'Nhân không có <code>printf</code>. Nó có <code>printk</code>, và khác biệt quan trọng ' +
      'nhất là: <b>mỗi lời gọi <code>printk</code> đều mang theo một con số ưu tiên từ 0 đến ' +
      '7</b>. Con số đó không phải trang trí — nó quyết định thông điệp có được hiện ra màn ' +
      'hình hay không. Tám mức được định nghĩa trong ' +
      '<code>include/linux/kern_levels.h</code>:' },

    { t: 'table',
      head: ['Số', 'Hằng số', 'Nghĩa gốc', 'Khi nào lập trình viên nhân dùng nó'],
      rows: [
        ['<b>0</b>', '<code>KERN_EMERG</code>', 'system is unusable',
         'Hệ thống sắp chết. Thực tế gần như chỉ có <code>panic()</code> dùng.'],
        ['<b>1</b>', '<code>KERN_ALERT</code>', 'action must be taken immediately',
         'Cần can thiệp ngay lập tức, ví dụ hỏng dữ liệu.'],
        ['<b>2</b>', '<code>KERN_CRIT</code>', 'critical conditions',
         'Lỗi phần cứng nghiêm trọng, hỏng subsystem.'],
        ['<b>3</b>', '<code>KERN_ERR</code>', 'error conditions',
         '<b>Mức bạn sẽ tìm nhiều nhất khi debug.</b> Driver không nạp được, thiết bị không phản hồi.'],
        ['<b>4</b>', '<code>KERN_WARNING</code>', 'warning conditions',
         'Có gì đó bất thường nhưng chạy tiếp được. <b>Đây cũng là mức mặc định</b> khi mã không ghi rõ mức nào.'],
        ['<b>5</b>', '<code>KERN_NOTICE</code>', 'normal but significant condition',
         'Bình thường nhưng đáng chú ý. Dòng <code>Linux version …</code> nằm ở mức này.'],
        ['<b>6</b>', '<code>KERN_INFO</code>', 'informational',
         'Thông tin chạy máy thông thường — phần lớn log boot nằm ở đây.'],
        ['<b>7</b>', '<code>KERN_DEBUG</code>', 'debug-level messages',
         '<b>Mặc định KHÔNG hiện ra console.</b> Đây là chỗ 10 dòng ẩn mà bạn sắp tìm thấy đang nấp.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Mẹo nhớ: số càng nhỏ, chuyện càng to',
      x: 'Thang này <b>ngược</b> với trực giác của hầu hết mọi người — 0 là thảm hoạ, 7 là chi ' +
         'tiết vụn vặt. Hãy nhớ nó như <b>thứ tự ưu tiên trong phòng cấp cứu</b>: bệnh nhân ' +
         '"ưu tiên 0" được đẩy vào trước tiên. Nguyên tắc này đáng thuộc, vì bạn sẽ gõ ' +
         '<code>loglevel=</code> và <code>dmesg -n</code> hàng trăm lần trong đời làm nghề, và ' +
         'mỗi lần gõ nhầm chiều là một lần mất log. Còn <i>tên</i> tám hằng số thì không cần ' +
         'thuộc — <code>sed -n \'1,40p\' include/linux/kern_levels.h</code> trong cây nguồn của ' +
         'bạn in ra đủ cả tám bất cứ lúc nào.' },

    { t: 'h3', x: 'Vòng đệm và console là hai thứ khác nhau' },

    { t: 'p', x:
      'Đây là ý quan trọng nhất của cả mục. Mọi lời gọi <code>printk</code> đều đi vào ' +
      '<b>một vùng nhớ vòng</b> (<i>ring buffer</i>) nằm trong RAM của nhân — <b>không</b> có ' +
      'lọc lựa gì ở bước này. Việc lọc chỉ xảy ra ở bước <i>sau</i>, khi nhân quyết định có ' +
      'đẩy dòng đó ra console hay không. Nghĩa là: <b>những dòng bạn không nhìn thấy vẫn đang ' +
      'nằm đó, chờ bạn đi lấy.</b>' },

    { t: 'p', x:
      'Kích thước vùng nhớ đó do nhân tự khai ở dòng <b>37</b> của mỗi lần boot:' },

    { t: 'code', where: 'out', nocopy: true, name: 'f1-baseline.log, dòng 37', code:
      '[    0.000000] printk: log buffer data + meta data: 131072 + 458752 = 589824 bytes' },

    { t: 'cal', kind: 'info', title: '131 072 byte đến từ đâu, và vì sao đó là con số bạn nên biết',
      x: '<b>131 072 = 2<sup>17</sup></b>, và <code>17</code> chính là giá trị ' +
         '<code>CONFIG_LOG_BUF_SHIFT=17</code> trong <code>.config</code> của Bài 39. Đó là ' +
         'phần <i>dữ liệu</i> — văn bản các dòng log. Con số <b>458 752</b> đi kèm là ' +
         '<i>metadata</i>: mỗi dòng còn phải lưu dấu thời gian, mức log, độ dài. Tổng cộng ' +
         '<b>589 824 byte ≈ 576 KiB</b> RAM bị chiếm vĩnh viễn, boot xong vẫn giữ. Trên thiết ' +
         'bị chỉ có 32 MB RAM thì đây là con số đáng cân nhắc — và giảm ' +
         '<code>LOG_BUF_SHIFT</code> là một trong những cách tiết kiệm dễ nhất. <b>Vòng đệm ' +
         'đầy thì dòng cũ nhất bị ghi đè</b>, đúng nghĩa "vòng": trên hệ thống chạy lâu ngày, ' +
         '<code>dmesg</code> có thể đã mất mất dòng lỗi bạn đang tìm.' },

    { t: 'fig',
      cap: 'Bộ lọc nằm giữa vòng đệm và console, <b>không</b> nằm ở đầu vào. Vì thế ' +
           '<code>dmesg</code> luôn thấy nhiều hơn màn hình, và <code>loglevel=</code> không ' +
           'hề làm mất log — nó chỉ làm im màn hình.',
      svg:
      '<svg viewBox="0 0 720 240" width="720" role="img" aria-label="Sơ đồ printk đi vào vòng đệm rồi qua bộ lọc console_loglevel ra console, trong khi dmesg đọc thẳng từ vòng đệm">' +
      '<rect class="d-box-a" x="8" y="20" width="150" height="112" rx="8"/>' +
      '<text class="d-t" x="83" y="44" text-anchor="middle">Mã nhân gọi</text>' +
      '<text class="d-tm" x="83" y="64" text-anchor="middle">pr_info(...)</text>' +
      '<text class="d-tm" x="83" y="82" text-anchor="middle">pr_err(...)</text>' +
      '<text class="d-tm" x="83" y="100" text-anchor="middle">pr_debug(...)</text>' +
      '<text class="d-ts" x="83" y="121" text-anchor="middle">mỗi dòng mang mức 0–7</text>' +

      '<line class="d-line" x1="158" y1="76" x2="204" y2="76"/>' +
      '<path class="d-arrow" d="M212 76 l-9 -4.5 v9 z"/>' +
      '<text class="d-ts" x="185" y="68" text-anchor="middle">tất cả</text>' +

      '<rect class="d-box-p" x="212" y="20" width="188" height="112" rx="8"/>' +
      '<text class="d-t" x="306" y="46" text-anchor="middle">Vòng đệm trong RAM</text>' +
      '<text class="d-tm" x="306" y="66" text-anchor="middle">__log_buf</text>' +
      '<text class="d-ts" x="306" y="86" text-anchor="middle">131 072 byte dữ liệu</text>' +
      '<text class="d-ts" x="306" y="103" text-anchor="middle">+ 458 752 byte metadata</text>' +
      '<text class="d-ts" x="306" y="121" text-anchor="middle">giữ đủ 257 dòng, không lọc</text>' +

      '<line class="d-line" x1="400" y1="60" x2="446" y2="60"/>' +
      '<path class="d-arrow" d="M454 60 l-9 -4.5 v9 z"/>' +
      '<rect class="d-box-w" x="454" y="20" width="258" height="76" rx="8"/>' +
      '<text class="d-t" x="583" y="44" text-anchor="middle">Bộ lọc: mức &lt; console_loglevel ?</text>' +
      '<text class="d-tm" x="583" y="64" text-anchor="middle">/proc/sys/kernel/printk</text>' +
      '<text class="d-ts" x="583" y="84" text-anchor="middle">mặc định 7 → chỉ mức 0–6 lọt qua</text>' +

      '<line class="d-line" x1="583" y1="96" x2="583" y2="124"/>' +
      '<path class="d-arrow" d="M583 132 l-4.5 -9 h9 z"/>' +
      '<rect class="d-box-g" x="454" y="132" width="258" height="48" rx="8"/>' +
      '<text class="d-t" x="583" y="152" text-anchor="middle">Console (ttyAMA0)</text>' +
      '<text class="d-ts" x="583" y="170" text-anchor="middle">247 dòng — thiếu 10 dòng mức 7</text>' +

      '<line class="d-line" x1="306" y1="132" x2="306" y2="196"/>' +
      '<path class="d-arrow" d="M306 204 l-4.5 -9 h9 z"/>' +
      '<rect class="d-box-g" x="180" y="204" width="252" height="30" rx="8"/>' +
      '<text class="d-tm" x="306" y="224" text-anchor="middle">dmesg → cả 257 dòng</text>' +
      '<text class="d-ts" x="306" y="172" text-anchor="middle">không qua bộ lọc</text>' +
      '</svg>' },

    { t: 'h3', x: 'Bốn con số trong <code>/proc/sys/kernel/printk</code>' },

    { t: 'p', x:
      'Bộ lọc trong sơ đồ trên nằm ở một file duy nhất, và nó chứa đúng bốn số cách nhau bằng ' +
      'tab. Trên kernel của bạn, mặc định là <code>7 4 1 7</code>:' },

    { t: 'table',
      head: ['Vị trí', 'Tên', 'Giá trị', 'Vai trò'],
      rows: [
        ['1', '<code>console_loglevel</code>', '<b>7</b>',
         '<b>Con số duy nhất bạn thường đổi.</b> Chỉ những dòng có mức <b>nhỏ hơn hẳn</b> số ' +
         'này mới ra console. Bằng 7 nghĩa là mức 0–6 lọt, mức 7 (<code>KERN_DEBUG</code>) bị chặn.'],
        ['2', '<code>default_message_loglevel</code>', '4',
         'Mức gán cho một <code>printk</code> không ghi rõ mức. Đến từ ' +
         '<code>CONFIG_MESSAGE_LOGLEVEL_DEFAULT=4</code>.'],
        ['3', '<code>minimum_console_loglevel</code>', '1',
         'Sàn: bạn không hạ <code>console_loglevel</code> xuống 0 được, nên ' +
         '<code>KERN_EMERG</code> luôn có đường ra.'],
        ['4', '<code>default_console_loglevel</code>', '7',
         'Giá trị để khôi phục. Đến từ <code>CONFIG_CONSOLE_LOGLEVEL_DEFAULT=7</code>.']
      ] },

    { t: 'p', x:
      'Bốn tham số dòng lệnh dưới đây chỉ làm đúng một việc: đặt con số <b>thứ nhất</b>. Đây ' +
      'là giá trị thật đọc được bằng <code>cat /proc/sys/kernel/printk</code> ngay trong máy ' +
      'ảo, mỗi dòng là một lần boot riêng:' },

    { t: 'table',
      head: ['Thêm vào dòng lệnh kernel', '<code>/proc/sys/kernel/printk</code>', 'Kết quả trên màn hình'],
      rows: [
        ['(không thêm gì)', '<code>7&nbsp;&nbsp;4&nbsp;&nbsp;1&nbsp;&nbsp;7</code>', '247 dòng nhân — mốc chuẩn.'],
        ['<code>quiet</code>', '<code>4&nbsp;&nbsp;4&nbsp;&nbsp;1&nbsp;&nbsp;7</code>',
         'Chỉ còn mức 0–3. Log boot gần như biến mất, chỉ lỗi thật mới hiện.'],
        ['<code>loglevel=3</code>', '<code>3&nbsp;&nbsp;4&nbsp;&nbsp;1&nbsp;&nbsp;7</code>',
         'Chỉ còn mức 0–2. Chặt hơn cả <code>quiet</code>.'],
        ['<code>loglevel=1</code>', '<code>1&nbsp;&nbsp;4&nbsp;&nbsp;1&nbsp;&nbsp;7</code>',
         '<b>Không một dòng nhân nào</b> trong suốt quá trình boot. Chỉ ' +
         '<code>reboot: Power down</code> (mức 0) lọt qua khi tắt máy.'],
        ['<code>debug</code>', '<code>10&nbsp;&nbsp;4&nbsp;&nbsp;1&nbsp;&nbsp;7</code>',
         'Đặt thành 10 — lớn hơn 7, nên <b>mọi</b> mức đều lọt, kể cả ' +
         '<code>KERN_DEBUG</code>.']
      ] },

    { t: 'cal', kind: 'info', title: 'Điểm mấu chốt: <code>dmesg | wc -l</code> luôn ra <b>257</b>',
      x: 'Cả năm lần boot ở bảng trên, dù màn hình hiện 247 dòng hay 0 dòng, ' +
         '<code>dmesg | wc -l</code> chạy trong máy ảo <b>đều trả về đúng 257</b>. Đó là bằng ' +
         'chứng thực nghiệm cho sơ đồ phía trên: <b><code>loglevel=</code> không hề tắt log — ' +
         'nó chỉ tắt màn hình.</b> Kết quả thực tế cho nghề: trên sản phẩm giao khách bạn cứ ' +
         'yên tâm đặt <code>quiet</code> để boot nhanh và màn hình sạch; khi có sự cố, ' +
         '<code>dmesg</code> vẫn còn nguyên mọi thứ để bạn đọc.' },

    { t: 'h3', x: '<code>dmesg</code>: lấy log ra từ vòng đệm' },

    { t: 'p', x:
      'Có <b>hai bản</b> <code>dmesg</code> và bạn sẽ gặp cả hai. Bản BusyBox trong máy ảo chỉ ' +
      'có bốn tuỳ chọn; bản util-linux trên Ubuntu (host) có hàng chục. Biết mình đang cầm bản ' +
      'nào tránh được nhiều phút bối rối trên bo mạch nhúng:' },

    { t: 'table',
      head: ['Lệnh', 'Có ở đâu', 'Làm gì'],
      rows: [
        ['<code>dmesg</code>', 'cả hai', 'In toàn bộ vòng đệm.'],
        ['<code>dmesg -n 3</code>', 'cả hai',
         'Đặt <code>console_loglevel</code> = 3 <b>ngay lúc chạy</b>, không cần reboot. Tương ' +
         'đương ghi vào <code>/proc/sys/kernel/printk</code>.'],
        ['<code>dmesg -c</code>', 'cả hai', 'In rồi <b>xoá sạch</b> vòng đệm. Hữu ích để tách log của một thao tác cụ thể.'],
        ['<code>dmesg -x</code>', 'chỉ util-linux', 'Hiện tên hệ thống con và tên mức trước mỗi dòng.'],
        ['<code>dmesg --level=err,warn</code>', 'chỉ util-linux', 'Chỉ in những mức bạn chọn. <b>Lệnh tìm lỗi nhanh nhất.</b>'],
        ['<code>dmesg -H</code>', 'chỉ util-linux', 'Định dạng người-đọc-được: giờ thật thay cho giây kể từ lúc boot.'],
        ['<code>dmesg -w</code>', 'chỉ util-linux', 'Theo dõi liên tục, giống <code>tail -f</code>. Rất hợp khi cắm/rút thiết bị USB.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Không cần thuộc — <code>/dev/kmsg</code> cho bạn tự thử',
      x: 'File <code>/dev/kmsg</code> là <b>cửa ghi</b> vào vòng đệm dành cho user space: ' +
         '<code>echo "xin chao" &gt; /dev/kmsg</code> và dòng đó xuất hiện trong ' +
         '<code>dmesg</code> y như một dòng của nhân. Ở bước 3 phần thực hành bạn sẽ dùng đúng ' +
         'mẹo này để <b>tự tay chứng minh</b> vòng đệm và console là hai thứ tách rời — ghi một ' +
         'dòng khi console đang mở, ghi một dòng khi console đang bị bịt, rồi so.' },

    /* ============================================================
       5. Đọc log boot theo giai đoạn
       ============================================================ */
    { t: 'h2', x: 'Đọc 247 dòng log boot mà không hoảng' },

    { t: 'p', x:
      'Bài 40 in ra 247 dòng và bạn đã lướt qua chúng. Giờ hãy học đọc chúng có hệ thống. ' +
      'Bí quyết là <b>không đọc từng dòng — đọc theo mốc</b>. Log boot ARM64 luôn đi qua cùng ' +
      'một chuỗi giai đoạn, mỗi giai đoạn có một dòng dễ nhận ra làm biển báo. Bảng dưới là ' +
      'các mốc thật trong <code>f1-baseline.log</code>, kèm số dòng:' },

    { t: 'table',
      head: ['Dòng', 'Nội dung mốc', 'Giai đoạn vừa kết thúc / bắt đầu'],
      rows: [
        ['1', '<code>Booting Linux on physical CPU 0x0…</code>', 'Nhân vừa nhận quyền điều khiển từ bootloader.'],
        ['2', '<code>Linux version 6.18.45-embedded …</code>',
         '<b>Dòng vàng.</b> Phiên bản, người build, trình biên dịch, số lần build, ngày build.'],
        ['5', '<code>Machine model: linux,dummy-virt</code>', 'Nhân đã đọc được Device Tree và biết mình đang chạy trên bo mạch nào.'],
        ['36', '<code>Kernel command line: …</code>', '<b>Dòng thứ hai phải đọc mỗi lần debug.</b> Chuỗi bạn thật sự đưa vào.'],
        ['37', '<code>printk: log buffer data + meta data: …</code>', 'Vòng đệm log đã sẵn sàng.'],
        ['44', '<code>Built 1 zonelists … Total pages: 131072</code>', 'Bộ quản lý bộ nhớ vật lý đã dựng xong.'],
        ['84', '<code>Memory: 436128K/524288K available (…)</code>', '<b>Bảng kê RAM.</b> Mục sau sẽ mổ xẻ từng con số trong ngoặc.'],
        ['104–106', '<code>Serial: AMBA PL011 … console [ttyAMA0] enabled</code>', 'Driver UART nạp xong, console thật lên, 105 dòng trước được đổ ra.'],
        ['150', '<code>Unpacking initramfs...</code>', 'Bắt đầu giải nén kho cpio mà QEMU nạp bằng <code>-initrd</code>.'],
        ['160', '<code>Freeing initrd memory: 1004K</code>', 'Giải nén xong, vùng RAM chứa file nén được trả lại.'],
        ['246', '<code>Freeing unused kernel memory: 3264K</code>', '<b>Nhân trả lại toàn bộ mã <code>__init</code></b> — code chỉ dùng lúc khởi động.'],
        ['247', '<code>Run /init as init process</code>', '<b>Hết phần nhân.</b> Mọi dòng sau đây đều là của user space.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Bốn mốc đáng thuộc, phần còn lại thì tra',
      x: 'Đừng cố nhớ 247 dòng. Hãy nhớ <b>bốn</b> mốc này, vì chúng chia log thành các đoạn ' +
         'có nghĩa và bạn định vị được lỗi chỉ bằng cách hỏi "chết trước hay sau mốc nào":<br>' +
         '<b>1. <code>Linux version</code></b> — nhân đã chạy (nếu không thấy: lỗi bootloader ' +
         'hoặc lỗi console, chưa chắc lỗi nhân).<br>' +
         '<b>2. <code>Kernel command line</code></b> — tham số đã tới nơi.<br>' +
         '<b>3. <code>console [ttyAMA0] enabled</code></b> — từ đây log là trực tiếp, trước đó ' +
         'là phát lại.<br>' +
         '<b>4. <code>Run /init as init process</code></b> — ranh giới nhân / user space. Chết ' +
         '<i>trước</i> nó là lỗi nhân hoặc lỗi rootfs; chết <i>sau</i> nó là lỗi chương trình ' +
         'của bạn.' },

    { t: 'p', x:
      'Dòng 84 đáng dừng lại lâu hơn, vì nó là bản kê khai RAM đầy đủ nhất mà nhân đưa ra, và ' +
      'mục cuối cùng của bài sẽ so sánh trực tiếp với dòng tương ứng của một kernel tí hon:' },

    { t: 'code', where: 'out', nocopy: true, name: 'f1-baseline.log, dòng 84', code:
      '[    0.476654] Memory: 436128K/524288K available (18304K kernel code, 5438K rwdata, ' +
      '12972K rodata, 3264K init, 691K bss, 53616K reserved, 32768K cma-reserved)' },

    { t: 'cmdx', cmd: 'Memory: 436128K/524288K available (...)', title: 'Đọc từng con số của dòng 84',
      rows: [
        ['<code>524288K</code>', 'Tổng RAM máy ảo được cấp.', 'Đúng bằng <code>-m 512</code> trong lệnh QEMU: 512 × 1024 = 524 288 KiB.'],
        ['<code>436128K</code>', 'RAM còn <b>trống</b> sau khi nhân đã lấy phần của mình.', 'Chênh lệch <b>88 160 KiB ≈ 86 MiB</b> là cái giá của chính kernel này.'],
        ['<code>18304K kernel code</code>', 'Mã máy của nhân — section <code>.text</code>.', '<b>Đây là mục lớn nhất, và là mục mục sau sẽ tấn công đầu tiên.</b>'],
        ['<code>5438K rwdata</code>', 'Biến toàn cục đọc-ghi được — <code>.data</code>.', 'Cấp phát tĩnh lúc build, không giải phóng được.'],
        ['<code>12972K rodata</code>', 'Dữ liệu chỉ đọc: chuỗi ký tự, bảng tra, bảng tên hàm.', 'Lớn bất ngờ. Phần lớn là <code>kallsyms</code> — mục sau sẽ chứng minh.'],
        ['<code>3264K init</code>', 'Mã chỉ chạy một lần lúc khởi động.', '<b>Được trả lại</b> ở dòng 246 — chính là con số <code>Freeing unused kernel memory: 3264K</code>.'],
        ['<code>691K bss</code>', 'Biến toàn cục khởi tạo bằng 0.', 'Không chiếm chỗ trong file <code>Image</code>, chỉ chiếm RAM lúc chạy.'],
        ['<code>53616K reserved</code>', 'RAM nhân giữ riêng: bảng trang, vòng đệm log, DMA…', 'Bao gồm cả 576 KiB vòng đệm <code>printk</code> ở dòng 37.'],
        ['<code>32768K cma-reserved</code>', 'Vùng nhớ liền mạch dành cho thiết bị (Contiguous Memory Allocator).', '32 MiB bị giữ chỗ cho camera/GPU dù máy ảo này không có cái nào. Tắt được bằng <code>CONFIG_CMA</code>.']
      ] },

    /* ============================================================
       6. 41 MB đi đâu và cắt thế nào
       ============================================================ */
    { t: 'h2', x: '41 MB đi đâu — và cắt thế nào' },

    { t: 'p', x:
      'File <code>Image</code> Bài 40 dựng ra nặng <b>41 089 536 byte</b>, tức <b>39,19 MiB</b>. ' +
      'Với một máy tính thì đó là con số vô nghĩa. Với một bo mạch nhúng thì nó có thể là ' +
      '<b>toàn bộ</b> chip flash: rất nhiều thiết bị công nghiệp chỉ có 8 MB hoặc 16 MB NOR ' +
      'flash cho cả kernel <i>lẫn</i> rootfs. Nên câu hỏi "kernel của tôi to bao nhiêu, và tại ' +
      'sao" là câu hỏi nghề nghiệp, không phải câu hỏi tò mò.' },

    { t: 'p', x:
      'Trả lời bằng <code>size -A</code> — công cụ binutils bạn đã dùng ở Bài 17 để soi file ' +
      'ELF. Chạy nó trên <code>vmlinux</code> (ELF, có đủ thông tin section) chứ không phải ' +
      'trên <code>Image</code> (nhị phân thuần, không còn section nào). Đây là các section ' +
      'lớn nhất, đơn vị byte:' },

    { t: 'table',
      head: ['Section', 'defconfig', 'Chứa gì', 'Có nằm trong <code>Image</code> không?'],
      rows: [
        ['<code>.text</code>', '<b>18 681 856</b>', 'Mã máy của nhân.', 'Có — mục lớn nhất.'],
        ['<code>.rodata</code>', '<b>12 795 760</b>', 'Dữ liệu chỉ đọc: chuỗi, bảng tra, bảng tên hàm.', 'Có — mục lớn thứ hai.'],
        ['<code>.data</code>', '5 430 432', 'Biến toàn cục có giá trị khởi tạo.', 'Có.'],
        ['<code>.init.data</code>', '1 293 255', 'Dữ liệu chỉ dùng lúc khởi động.', 'Có, nhưng RAM được trả lại sau khi boot xong.'],
        ['<code>.rela.dyn</code>', '661 488', 'Bảng tái định vị, phục vụ KASLR.', 'Có.'],
        ['<code>.init.text</code>', '576 620', 'Mã chỉ chạy một lần lúc khởi động.', 'Có, RAM cũng được trả lại.'],
        ['<code>.altinstructions</code>', '390 972', 'Bản vá lệnh theo tính năng CPU thực tế phát hiện được.', 'Có.'],
        ['<code>.bss</code>', '707 824', 'Biến toàn cục khởi tạo bằng 0.', '<b>Không</b> — chỉ chiếm RAM lúc chạy, không tốn byte nào trong file.'],
        ['<b>Total</b>', '<b>147 645 916</b>', 'Tổng mọi section, kể cả <code>.debug_*</code>.', 'Đây là <code>vmlinux</code> (157 MB trên đĩa), không phải <code>Image</code>.']
      ] },

    { t: 'cal', kind: 'info', title: 'Vì sao <code>vmlinux</code> 157 MB mà <code>Image</code> chỉ 39 MiB',
      x: 'Vì <code>CONFIG_DEBUG_INFO=y</code>: riêng ba section ' +
         '<code>.debug_info</code> (60 201 232 B), <code>.debug_line</code> (25 626 404 B) và ' +
         '<code>.debug_str</code> (5 851 439 B) đã hơn <b>91 MB</b>. Chúng phục vụ ' +
         '<code>gdb</code> và <code>kgdb</code>, và <code>objcopy</code> vứt hết khi cắt ra ' +
         '<code>Image</code>. <b>Kết luận thực dụng: tắt <code>DEBUG_INFO</code> giúp ' +
         '<code>Image</code> <i>không</i> nhỏ đi một byte nào</b> — nó chỉ tiết kiệm dung ' +
         'lượng đĩa và thời gian build. Đây là hiểu nhầm rất phổ biến; giờ bạn có số liệu để ' +
         'không mắc phải.' },

    { t: 'h3', x: 'Thủ phạm lớn nhất trong <code>.rodata</code>' },

    { t: 'p', x:
      '12,8 MB dữ liệu chỉ đọc là con số đáng ngờ. Dùng <code>nm --size-sort -S</code> để xếp ' +
      'mọi ký hiệu theo kích thước rồi lấy nhóm to nhất, và thủ phạm lộ ngay:' },

    { t: 'table',
      head: ['Ký hiệu', 'Kích thước (hex)', 'Byte', 'Là gì'],
      rows: [
        ['<code>kallsyms_seqs_of_names</code>', '<code>0x2a32d0</code>', '2 765 520', 'Chỉ mục sắp xếp để tra tên hàm nhanh.'],
        ['<code>kallsyms_names</code>', '<code>0x215508</code>', '2 184 456', 'Tên của <b>mọi</b> hàm và biến trong nhân, dạng văn bản nén.'],
        ['<code>kallsyms_offsets</code>', '<code>0xc1d38</code>', '793 912', 'Địa chỉ tương ứng của từng tên.'],
        ['<b>Cộng</b>', '', '<b>5 743 888</b>', '<b>5,48 MiB — 14,0 % của cả file <code>Image</code>.</b>']
      ] },

    { t: 'cal', kind: 'why', title: '5,48 MiB đó mua được gì cho bạn',
      x: 'Mua được <b>call trace đọc hiểu được</b>. Ở mục panic phía trên bạn đã thấy những ' +
         'dòng như <code>mount_root_generic+0x1f0/0x2a8</code>. Nhân biết được cái tên ' +
         '<code>mount_root_generic</code> <i>chỉ vì</i> bảng <code>kallsyms</code> nằm sẵn ' +
         'trong RAM. Tắt <code>CONFIG_KALLSYMS</code> và cùng dòng đó trở thành ' +
         '<code>0xffff8000801d4f30</code> — bạn phải tự tra bằng ' +
         '<code>System.map</code> và <code>addr2line</code>. <b>Đây là một đánh đổi thật, ' +
         'không phải chỗ dọn rác</b>: đổi 5,48 MiB flash lấy khả năng debug tại hiện trường. ' +
         'Sản phẩm đã ổn định, flash chật → tắt. Đang phát triển → giữ.' },

    { t: 'h3', x: '<code>tinyconfig</code>: đi từ đầu kia' },

    { t: 'p', x:
      'Cắt tính năng khỏi <code>defconfig</code> là việc vô vọng: 3 286 tuỳ chọn đang bật, và ' +
      'mỗi lần tắt một cái bạn phải đoán xem nó có phải thứ đang giữ cho máy boot được không. ' +
      'Cách của dân chuyên nghiệp là <b>đi ngược</b>: bắt đầu từ con số không, rồi bật lại ' +
      '<i>đúng</i> những gì cần. Kbuild có sẵn target cho việc đó:' },

    { t: 'cmdx', cmd: 'make ARCH=arm64 tinyconfig', title: 'tinyconfig làm gì',
      rows: [
        ['<code>tinyconfig</code>', 'Sinh ra <code>.config</code> <b>nhỏ nhất mà vẫn dịch được</b>.',
         'Nó là <code>allnoconfig</code> cộng thêm hai thứ: <code>CC_OPTIMIZE_FOR_SIZE=y</code> (bảo gcc dùng <code>-Os</code> thay vì <code>-O2</code>) và tắt hết mã 32-bit thừa.'],
        ['kết quả', '<b>421</b> tuỳ chọn <code>=y</code>, <b>0</b> module.',
         'So với <code>defconfig</code>: 3 286 <code>=y</code> và 1 273 <code>=m</code>. Ít hơn <b>7,8 lần</b> số tuỳ chọn bật.']
      ] },

    { t: 'p', x:
      'Kết quả thật, đo trên chính máy bạn — ba lần build cùng một cây nguồn 6.18.45, cùng ' +
      '<code>-j6</code>:' },

    { t: 'table',
      head: ['Cấu hình', '<code>Image</code> (byte)', '<code>vmlinux</code> (byte)', 'Số <code>=y</code>', 'Thời gian build', 'Boot được?'],
      rows: [
        ['<code>defconfig</code> (Bài 40)', '<b>41 089 536</b>', '157 080 232', '3 286', '<b>18 m 30,8 s</b>', 'Có, vào shell.'],
        ['<code>tinyconfig</code>', '<b>1 961 992</b>', '2 620 480', '421', '<b>2 m 23,7 s</b>', '<b>Không</b> — câm hoàn toàn.'],
        ['<code>tinyconfig</code> + 17 tuỳ chọn', '<b>3 303 432</b>', '4 166 272', '506', '<b>2 m 34,5 s</b>', '<b>Có</b>, vào shell.']
      ] },

    { t: 'cal', kind: 'danger', title: '<code>tinyconfig</code> thuần boot ra... không gì cả',
      x: 'Kernel <code>tinyconfig</code> dịch xong, chạy được, nhưng bạn nhận đúng ' +
         '<b>một dòng</b> output — và dòng đó là của <code>timeout</code> giết QEMU. Thêm ' +
         '<code>earlycon</code> cũng vô ích, vẫn một dòng. Lý do: <code>allnoconfig</code> đã ' +
         'tắt luôn <b><code>CONFIG_PRINTK</code></b>. <b>Không có <code>printk</code> thì ' +
         'không có log, không có console, không có gì cả</b> — kể cả earlycon, vì earlycon ' +
         'cũng chỉ là một console mà <code>printk</code> đẩy dữ liệu vào. Nhớ kỹ triệu chứng ' +
         'này: <i>một kernel câm tuyệt đối ngay cả với <code>earlycon</code></i> nghĩa là lỗi ' +
         'nằm ở <code>.config</code>, không phải ở dòng lệnh kernel.' },

    { t: 'p', x:
      'Vậy phải bật lại những gì? Đúng <b>17</b> tuỳ chọn, và mỗi cái đều có lý do cụ thể. ' +
      'Chia làm bốn nhóm:' },

    { t: 'table',
      head: ['Nhóm', 'Tuỳ chọn', 'Nếu thiếu thì sao'],
      rows: [
        ['Nhìn thấy gì đó', '<code>PRINTK</code>, <code>TTY</code>, <code>SERIAL_AMBA_PL011</code>, <code>SERIAL_AMBA_PL011_CONSOLE</code>',
         'Câm hoàn toàn — đúng như trường hợp <code>tinyconfig</code> thuần ở trên.'],
        ['Chạy được chương trình', '<code>BINFMT_ELF</code>, <code>BINFMT_SCRIPT</code>, <code>MULTIUSER</code>',
         'Không nạp nổi <code>busybox</code> (ELF) hay <code>/init</code> (script <code>#!</code>).'],
        ['Đọc được initramfs', '<code>BLK_DEV_INITRD</code>, <code>RD_GZIP</code>',
         'Nhân bỏ qua hoàn toàn tham số <code>-initrd</code>, rơi thẳng vào panic <code>root=</code>.'],
        ['Shell sống được', '<code>PROC_FS</code>, <code>SYSFS</code>, <code>FUTEX</code>, <code>EPOLL</code>, <code>SIGNALFD</code>, <code>TIMERFD</code>, <code>EVENTFD</code>, <code>AIO</code>',
         'BusyBox và thư viện C cần những syscall này; thiếu thì shell chết ngay khi khởi động.']
      ] },

    { t: 'p', x:
      'Và đây là bằng chứng cuối cùng: kernel 3,15 MiB đó <b>boot thật, vào được shell thật</b>. ' +
      'So sánh trực tiếp hai dòng <code>Memory:</code> — cùng máy ảo, cùng 512 MB RAM, chỉ khác ' +
      '<code>.config</code>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'defconfig — dòng 84', code:
      'Memory: 436128K/524288K available (18304K kernel code, 5438K rwdata, 12972K rodata, ' +
      '3264K init, 691K bss, 53616K reserved, 32768K cma-reserved)' },

    { t: 'code', where: 'out', nocopy: true, name: 'tinyconfig + 17 tuỳ chọn — dòng 60', code:
      'Memory: 507104K/524288K available (1856K kernel code, 602K rwdata, 332K rodata, ' +
      '320K init, 357K bss, 16364K reserved, 0K cma-reserved)' },

    { t: 'table',
      head: ['Hạng mục', 'defconfig', 'Tối giản', 'Giảm'],
      rows: [
        ['<code>kernel code</code>', '18 304 K', '1 856 K', '<b>9,9 lần</b>'],
        ['<code>rodata</code>', '12 972 K', '332 K', '<b>39,1 lần</b> — chính là <code>kallsyms</code> biến mất'],
        ['<code>rwdata</code>', '5 438 K', '602 K', '9,0 lần'],
        ['<code>init</code>', '3 264 K', '320 K', '10,2 lần'],
        ['<code>cma-reserved</code>', '32 768 K', '<b>0 K</b>', 'Tắt hẳn <code>CONFIG_CMA</code>'],
        ['<b>RAM còn trống</b>', '<b>436 128 K</b>', '<b>507 104 K</b>', '<b>Thêm 70 976 K ≈ 69 MiB cho ứng dụng</b>']
      ] },

    { t: 'cal', kind: 'info', title: 'Ba con số đáng nhớ của mục này',
      x: '<b>41 089 536 → 3 303 432 byte: nhỏ hơn 12,44 lần</b>, tiết kiệm 36,0 MiB flash. ' +
         '<b>18 m 30,8 s → 2 m 34,5 s: build nhanh hơn 7,2 lần</b> — thứ này quan trọng hơn ' +
         'bạn tưởng, vì nó đổi hẳn nhịp làm việc từ "đi pha cà phê" sang "ngồi chờ". ' +
         '<b>436 MB → 507 MB RAM trống: thêm 69 MiB</b> cho ứng dụng, trên một máy chỉ có 512 MB.' },

    { t: 'cal', kind: 'warn', title: 'Cái giá không hiện ra trong bảng',
      x: 'Kernel tối giản này <b>không phải</b> bản tốt hơn — nó là bản <i>khác</i>, và bạn đã ' +
         'trả giá bằng tính năng. Bằng chứng nằm ngay trong log boot của nó: ' +
         '<code>mount: mounting none on /dev failed: No such device</code>, vì ' +
         '<code>CONFIG_DEVTMPFS</code> đã tắt — không còn <code>/dev</code> tự động. ' +
         '<code>dmesg</code> chỉ còn <b>80</b> dòng thay vì 257, ' +
         '<code>ls /proc | wc -l</code> ra <b>60</b> mục, và log <b>không còn dấu thời gian</b> ' +
         'vì <code>CONFIG_PRINTK_TIME</code> cũng bị tắt. Không có mạng, không có USB, không có ' +
         'module (<code>CONFIG_MODULES</code> tắt nốt). <b>Quy trình đúng luôn là: bắt đầu từ ' +
         '<code>defconfig</code> cho chạy được đã, rồi mới cắt dần và kiểm tra sau mỗi lần ' +
         'cắt</b> — chứ không phải đi thẳng tới <code>tinyconfig</code> rồi ngồi đoán thiếu gì.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: vặn từng nút một, và nhìn cái gì gãy' },

    { t: 'p', x:
      'Năm bước dưới đây dùng lại đúng file <code>Image</code> Bài 40 đã build — không phải ' +
      'build lại gì cho tới bước 5. Mỗi bước là một nhóm thí nghiệm: đổi <b>một</b> thứ trên ' +
      'dòng lệnh kernel, boot, quan sát, giải thích. Tổng cộng khoảng 90 phút, trong đó riêng ' +
      'bước 5 mất khoảng 25 phút chờ hai lần build.' },

    { t: 'cal', kind: 'tip', title: 'Thoát QEMU thế nào',
      x: 'Trong mọi thí nghiệm dưới đây, khi vào được shell thì gõ <code>poweroff -f</code> để ' +
         'tắt máy ảo sạch sẽ. Khi <b>không</b> vào được shell (panic, hoặc màn hình câm), gõ ' +
         '<kbd>Ctrl</kbd>+<kbd>A</kbd> rồi thả ra và bấm <kbd>X</kbd> — đó là lối thoát của ' +
         'QEMU ở chế độ <code>-nographic</code>, bạn đã dùng từ Bài 32.' },

    { t: 'steps', items: [

      /* ---------------------------------------------------------- BƯỚC 1 */
      { title: 'Dựng initramfs thăm dò và chụp mốc chuẩn',
        blocks: [

          { t: 'p', x:
            'Initramfs của Bài 32 vẫn dùng được, nhưng nó không trả lời được ba câu hỏi bài ' +
            'này cần: <code>init</code> nhận <i>argv</i> gì, nhận <i>envp</i> gì, và ' +
            '<code>/proc/cmdline</code> chứa gì. Nên bước đầu tiên là chép nó ra chỗ mới rồi ' +
            'nâng cấp file <code>/init</code>. Chép chứ không sửa tại chỗ, để initramfs của ' +
            'Bài 32 còn nguyên cho các bài sau:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai41 && cd ~/bai41\n' +
            'cp -a ~/bai32/initramfs ~/bai41/initramfs\n' +
            'ls ~/bai41/initramfs' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin  dev  etc  init  proc  root  sys  usr' },

          { t: 'p', x:
            'Tám thư mục và một file <code>init</code> — đúng bộ khung Bài 32 đã dựng. Giờ ghi ' +
            'đè <code>init</code> bằng bản thăm dò. So với bản cũ, nó thêm <b>hai</b> thứ: ' +
            'dòng <code>mount devtmpfs</code>, và bốn lệnh in ra ba thứ bạn cần nhìn.' },

          { t: 'code', where: 'file', name: '~/bai41/initramfs/init', lang: 'bash', code:
            '#!/bin/sh\n' +
            '/bin/busybox --install -s /bin\n' +
            'mount -t proc     none /proc\n' +
            'mount -t sysfs    none /sys\n' +
            'mount -t devtmpfs none /dev\n' +
            'echo\n' +
            'echo "=== init argv: $0 $* ==="\n' +
            'echo "=== init env ==="\n' +
            'env\n' +
            'echo "=== /proc/cmdline ==="\n' +
            'cat /proc/cmdline\n' +
            'exec /bin/sh' },

          { t: 'cmdx', cmd: 'init', title: 'Ba dòng mới so với Bài 32',
            rows: [
              ['<code>mount -t devtmpfs none /dev</code>',
               'Gắn <code>devtmpfs</code> — hệ thống tệp nhân tự sinh các file thiết bị vào đó.',
               '<b>Bắt buộc cho bước 3.</b> Không có nó thì <code>/dev</code> rỗng, và ' +
               '<code>echo … &gt; /dev/kmsg</code> sẽ lặng lẽ tạo ra một <b>file thường</b> tên ' +
               '<code>kmsg</code> thay vì ghi vào log nhân — sai mà không báo lỗi. Đây là lỗi ' +
               'thật đã mắc phải khi soạn bài này.'],
              ['<code>echo "=== init argv: $0 $* ==="</code>',
               'In tên chương trình và <b>toàn bộ tham số</b> mà nhân truyền cho init.',
               '<code>$0</code> là đường dẫn init, <code>$*</code> là các tham số. Bình thường ' +
               '<code>$*</code> rỗng; bước 4 sẽ làm nó không rỗng.'],
              ['<code>env</code>',
               'In toàn bộ <b>biến môi trường</b> init nhận được.',
               'Đây là bằng chứng trực tiếp cho <code>envp_init[]</code> ở dòng 194 của ' +
               '<code>init/main.c</code> mà bạn đã đọc ở phần lý thuyết.']
            ] },

          { t: 'p', x:
            'Đóng gói lại thành kho cpio nén — cùng câu lệnh Bài 32, chỉ đổi thư mục:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai41\n' +
            '( cd initramfs && find . -print0 | cpio --null --create --format=newc | gzip -9 ) > initramfs.cpio.gz\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '2013 blocks\n' +
            '-rw-r--r-- 1 shinarus shinarus 1030594 Aug 29 11:38 /home/shinarus/bai41/initramfs.cpio.gz',
            notes: [
              'Tên người dùng, ngày giờ và <b>kích thước</b> sẽ khác trên máy bạn — kích thước phụ thuộc phiên bản BusyBox và nội dung <code>init</code>. Con số quan trọng là nó <b>xấp xỉ 1 MB</b>; nếu ra vài KB thì bạn đóng gói nhầm thư mục rỗng.',
              '<code>2013 blocks</code> là <code>cpio</code> báo về, in ra stderr — không phải lỗi.'
            ] },

          { t: 'p', x:
            'Boot mốc chuẩn. Đây là lần boot bạn sẽ so mọi thí nghiệm sau với nó, nên hãy chạy ' +
            'nó nghiêm túc và đọc kỹ:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Log chạy qua, rồi <code>init</code> của bạn tự giới thiệu. Đây là phần ngay sau ' +
            'dòng <code>Run /init as init process</code>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'init tự khai báo', code:
            '[    7.428351] Run /init as init process\n' +
            '\n' +
            '=== init argv: /init  ===\n' +
            '=== init env ===\n' +
            'SHLVL=1\n' +
            'HOME=/\n' +
            'TERM=linux\n' +
            'PATH=/sbin:/usr/sbin:/bin:/usr/bin\n' +
            'PWD=/\n' +
            '=== /proc/cmdline ===\n' +
            'console=ttyAMA0 rdinit=/init',
            notes: [
              'Dấu thời gian <code>7.428351</code> <b>sẽ khác nhiều trên máy bạn và khác giữa các lần chạy</b> — nó phụ thuộc tải máy chủ, đo được từ 0,87 s đến 7,43 s trên cùng một máy.'
            ] },

          { t: 'cal', kind: 'why', title: 'Đọc kỹ khối <code>env</code>: hai biến đến từ mã C của nhân',
            x: '<code>HOME=/</code> và <code>TERM=linux</code> là <b>chính xác</b> hai chuỗi ' +
               'viết cứng trong <code>envp_init[]</code> ở <code>init/main.c:194</code> mà bạn ' +
               'đã đọc ở phần lý thuyết. Đây là bằng chứng tận mắt, không phải lời hứa.<br>' +
               'Ba biến còn lại <b>không</b> phải của nhân: <code>SHLVL</code>, ' +
               '<code>PATH</code> và <code>PWD</code> do chính <code>/bin/sh</code> (BusyBox ' +
               'ash) tự đặt cho mình khi khởi động — bạn đã học cơ chế này ở Bài 20.<br>' +
               'Và <code>=== init argv: /init  ===</code> có <b>hai dấu cách</b> trước ' +
               '<code>===</code>: đó là <code>$0</code> = <code>/init</code>, rồi một dấu cách, ' +
               'rồi <code>$*</code> <b>rỗng</b>, rồi dấu cách nữa. Ghi nhớ khoảng trống này — ' +
               'bước 4 sẽ lấp nó bằng một chữ.' },

          { t: 'p', x:
            'Giờ vào shell và hỏi nhân bốn câu. Gõ từng lệnh một tại dấu nhắc <code>~ #</code>:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/cmdline\n' +
            'cat /proc/sys/kernel/printk\n' +
            'dmesg | wc -l\n' +
            'dmesg | tail -n 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init\n' +
            '~ # cat /proc/sys/kernel/printk\n' +
            '7\t4\t1\t7\n' +
            '~ # dmesg | wc -l\n' +
            '257\n' +
            '~ # dmesg | tail -n 4\n' +
            '[    7.429011]     /init\n' +
            '[    7.429118]   with environment:\n' +
            '[    7.429220]     HOME=/\n' +
            '[    7.429309]     TERM=linux' },

          { t: 'cal', kind: 'info', title: 'Bốn kết quả, bốn kết luận',
            x: '<b><code>/proc/cmdline</code></b> in lại y hệt chuỗi bạn đưa cho ' +
               '<code>-append</code> — xác nhận toàn bộ chuỗi đi qua Device Tree mà không mất ' +
               'chữ nào.<br>' +
               '<b><code>7 4 1 7</code></b> — bốn con số của bảng ở phần lý thuyết. Số đầu là ' +
               '<code>console_loglevel</code> = 7, nên mức 7 (<code>KERN_DEBUG</code>) bị chặn.<br>' +
               '<b><code>257</code></b> — và console vừa in cho bạn <b>247</b> dòng nhân. ' +
               '<b>Vòng đệm đang giữ nhiều hơn màn hình đúng 10 dòng.</b> Đây là con số quan ' +
               'trọng nhất của cả bước này.<br>' +
               '<b><code>dmesg | tail -n 4</code></b> — và bạn vừa tìm thấy 4 trong số 10 dòng ' +
               'đó. Chúng chưa từng xuất hiện trên màn hình, nhưng vẫn nằm trong vòng đệm.' },

          { t: 'p', x:
            'Đọc lại bốn dòng vừa hiện ra: nhân đang tự ghi nhật ký <b>argv và envp mà nó ' +
            'trao cho init</b> — chính là thứ <code>/init</code> của bạn cũng vừa in ra. Hai ' +
            'nguồn độc lập, cùng một dữ liệu. Đây là đủ 10 dòng, tất cả đều mức ' +
            '<code>KERN_DEBUG</code>:' },

          { t: 'code', where: 'out', nocopy: true, name: '10 dòng có trong dmesg, không có trên console', code:
            'pcpu-alloc: s62936 r8192 d31272 u102400 alloc=25*4096\n' +
            'pcpu-alloc: [0] 0\n' +
            'libata version 3.00 loaded.\n' +
            'erase region 0: offset=0x0,size=0x40000,blocks=256\n' +
            'erase region 0: offset=0x0,size=0x40000,blocks=256\n' +
            '  with arguments:\n' +
            '    /init\n' +
            '  with environment:\n' +
            '    HOME=/\n' +
            '    TERM=linux',
            notes: [
              'Danh sách này lấy bằng cách so từng dòng của console với từng dòng của <code>dmesg</code>. Bạn không cần tự làm việc so sánh đó — bước 3 sẽ cho bạn cách nhìn thấy chúng dễ hơn nhiều, chỉ bằng một tham số.'
            ] },

          { t: 'p', x:
            'Cuối cùng, xác nhận đây đúng là kernel bạn build ở Bài 40, rồi tắt máy:' },

          { t: 'code', where: 'qemu', code:
            'uname -r\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # uname -r\n' +
            '6.18.45-embedded\n' +
            '~ # poweroff -f\n' +
            '[   19.635456] Flash device refused suspend due to active operation (state 20)\n' +
            '[   19.635805] Flash device refused suspend due to active operation (state 20)\n' +
            '[   19.636709] reboot: Power down' },

          { t: 'cal', kind: 'info', title: 'Hậu tố <code>-embedded</code> là chữ ký của bạn',
            x: 'Chuỗi <code>6.18.45-embedded</code> đến từ ' +
               '<code>CONFIG_LOCALVERSION="-embedded"</code> bạn tự đặt ở Bài 40. Nhớ nó, vì ở ' +
               'bước 5 bạn sẽ build một kernel <b>khác</b> từ một cây nguồn <b>khác</b>, và ' +
               '<code>uname -r</code> sẽ trả về <code>6.18.45</code> trơn không hậu tố — đó là ' +
               'cách nhanh nhất để biết mình đang boot nhầm file.<br>' +
               'Hai dòng <code>Flash device refused suspend</code> là driver flash giả lập của ' +
               'máy ảo <code>virt</code> càu nhàu lúc tắt máy. <b>Vô hại</b>, xuất hiện ở mọi ' +
               'lần <code>poweroff</code>, không liên quan gì đến bài này.' }
        ] },

      /* ---------------------------------------------------------- BƯỚC 2 */
      { title: 'Nghịch <code>console=</code>: bỏ hẳn, gõ sai, rồi cứu bằng <code>earlycon</code>',
        blocks: [

          { t: 'p', x:
            'Ba lần boot, chỉ đổi <code>console=</code>. Lần đầu: <b>bỏ hẳn</b> tham số đó đi. ' +
            'Đoán trước xem chuyện gì xảy ra rồi hãy chạy — phần lớn người mới đoán là "câm", ' +
            'và họ đoán sai.' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "rdinit=/init"' },

          { t: 'p', x:
            'Nó chạy bình thường. Điều thú vị nằm ở dòng 66 và dòng 107 — hãy cuộn lên tìm:' },

          { t: 'code', where: 'out', nocopy: true, name: 'e4-noconsole.log, dòng 36, 66 và 107', code:
            '[    0.000000] Kernel command line: rdinit=/init\n' +
            '[    0.007651] printk: legacy console [tty0] enabled\n' +
            '[    0.283814] printk: console [ttyAMA0] enabled' },

          { t: 'cal', kind: 'why', title: 'Không nói thì Device Tree nói hộ',
            x: 'Dòng 36 chứng minh nhân thật sự không nhận được <code>console=</code> nào. Vậy ' +
               'vì sao dòng 107 vẫn bật <code>ttyAMA0</code>? Vì Device Tree do QEMU sinh ra có ' +
               'một thuộc tính tên <code>stdout-path</code> trong node <code>/chosen</code>, ' +
               'trỏ sẵn vào cổng PL011. <b>Khi không có <code>console=</code>, nhân dùng ' +
               '<code>stdout-path</code>.</b> Trên bo mạch thật, nhà sản xuất SoC gần như luôn ' +
               'khai sẵn thuộc tính này trong file <code>.dts</code> — đó là lý do rất nhiều ' +
               'bo mạch "tự nhiên có console" mà chẳng ai đặt <code>console=</code>.<br>' +
               'Còn <code>legacy console [tty0]</code> ở dòng 66 là console màn hình giả lập; ' +
               'nó lên sớm hơn vì không cần driver UART. Nó ghi vào bộ nhớ màn hình ảo mà ' +
               '<code>-nographic</code> không hiển thị, nên bạn không thấy gì từ nó.' },

          { t: 'p', x:
            'Trong shell, kiểm tra file thiết bị console — nó tồn tại kể cả khi bạn không khai ' +
            'báo gì:' },

          { t: 'code', where: 'qemu', code:
            'ls -l /dev/console\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls -l /dev/console\n' +
            'crw-------    1 0        0           5,   1 Aug 29 04:30 /dev/console' },

          { t: 'p', x:
            'Chữ <code>c</code> đầu dòng là <i>character device</i>; cặp <code>5, 1</code> là ' +
            'major 5 / minor 1 — số hiệu cố định của <code>/dev/console</code> trên mọi hệ ' +
            'Linux. Ngày giờ sẽ khác trên máy bạn. Điểm cần rút ra: ' +
            '<b><code>/dev/console</code> là một bí danh</b>, nó trỏ tới console mà nhân đã ' +
            'chọn — dù bạn chọn hộ nó hay để Device Tree chọn.' },

          { t: 'p', x:
            'Lần thứ hai: gõ <b>sai</b> tên cổng. <code>ttyS0</code> là UART kiểu PC, còn máy ' +
            'ảo <code>virt</code> chỉ có PL011. Đây là lỗi kinh điển khi copy dòng lệnh của bo ' +
            'mạch này sang bo mạch khác:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyS0 rdinit=/init"' },
          { t: 'p', muted: true, x:
            '<b>Không có gì cả.</b> Con trỏ nhấp nháy và không một ký tự nào hiện ra.' },

          { t: 'cal', kind: 'danger', title: 'Con trỏ nhấp nháy, và không một chữ nào',
            x: 'Máy ảo <b>đang chạy hoàn toàn bình thường</b>. Nhân đã boot, đã giải nén ' +
               'initramfs, <code>/bin/sh</code> có thể đang chờ bạn gõ lệnh. Bạn chỉ không ' +
               'nhìn thấy gì, vì nhân đang nói chuyện với <code>ttyS0</code> — một cổng không ' +
               'tồn tại trên bo mạch này.<br>' +
               '<b>Hãy dừng lại vài giây và nhìn kỹ màn hình trống này.</b> Đây chính xác là ' +
               'thứ bạn sẽ gặp trong ngày đầu tiên cầm một bo mạch mới, và bản năng của mọi ' +
               'người là nghi ngờ file kernel. Bạn giờ biết nghi ngờ <code>console=</code> ' +
               'trước.<br>' +
               'Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.' },

          { t: 'p', x:
            'Lần thứ ba: giữ nguyên cái sai đó, chỉ thêm một chữ <code>earlycon</code>. Không ' +
            'sửa gì khác — mục đích là chứng minh <code>earlycon</code> làm việc <b>độc lập</b> ' +
            'với <code>console=</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyS0 earlycon rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, name: 'f5 — dòng 7, 8 rồi 247–250', code:
            '[    0.000000] earlycon: pl11 at MMIO 0x0000000009000000 (options \'\')\n' +
            '[    0.000000] printk: legacy bootconsole [pl11] enabled\n' +
            '        ⋮\n' +
            '[    0.816017] Warning: unable to open an initial console.\n' +
            '[    0.851707] Freeing unused kernel memory: 3264K\n' +
            '[    0.852644] Run /init as init process\n' +
            '[    0.994835] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000' },

          { t: 'cal', kind: 'why', title: 'Từ 0 dòng lên 273 dòng — nhưng vẫn không vào được shell',
            x: '<b>Thắng lợi:</b> bạn vừa đi từ màn hình trống tuyệt đối sang nhìn thấy trọn ' +
               'vẹn log boot, chỉ bằng <b>một chữ</b>. Đây là lý do <code>earlycon</code> là ' +
               'công cụ đầu tiên phải thử khi một bo mạch câm.<br>' +
               '<b>Nhưng:</b> <code>/dev/console</code> vẫn trỏ vào <code>ttyS0</code> không ' +
               'tồn tại, nên nhân in <code>Warning: unable to open an initial console.</code>. ' +
               '<code>/init</code> vẫn chạy, nhưng <code>exec /bin/sh</code> khởi động một ' +
               'shell <b>không có stdin, stdout, stderr</b>. Shell không đọc được gì nên thoát ' +
               'ngay — và PID 1 thoát thì nhân bắt buộc phải panic: ' +
               '<code>Attempted to kill init!</code> với <code>exitcode=0x00000000</code>, tức ' +
               'là shell thoát <i>bình thường</i>, không hề crash.<br>' +
               '<b>Bài học một câu: <code>earlycon</code> cho bạn đọc được thông báo lỗi, chứ ' +
               'không sửa lỗi hộ bạn.</b> Nó là đèn pin, không phải cờ lê.' },

          { t: 'p', x:
            'Thí nghiệm cuối của bước này: đặt <code>console=</code> <b>đúng</b> <i>và</i> bật ' +
            '<code>earlycon</code>. Đây là cấu hình bạn sẽ thật sự dùng khi debug bo mạch:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 earlycon rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, name: 'e7 — dòng 108–111, khoảnh khắc bàn giao', code:
            '[    0.263158] printk: console [ttyAMA0] enabled\n' +
            '[    0.263158] printk: console [ttyAMA0] enabled\n' +
            '[    0.264295] printk: legacy bootconsole [pl11] disabled\n' +
            '[    0.264295] printk: legacy bootconsole [pl11] disabled' },

          { t: 'p', x:
            'Mỗi dòng in hai lần vì trong đúng khoảnh khắc đó cả <code>pl11</code> (earlycon) ' +
            'lẫn <code>ttyAMA0</code> (console thật) đều đang bật, và cả hai đổ ra <b>cùng một ' +
            'cổng UART vật lý</b> ở <code>0x9000000</code>. Sau dòng cuối, earlycon tắt và ' +
            'hiện tượng biến mất — bạn có thể tự kiểm chứng bằng cách tìm chuỗi ' +
            '<code>pl11</code> trong phần log còn lại, sẽ không còn dòng nào. ' +
            '<b>Nhìn thấy bốn dòng lặp này là dấu hiệu bàn giao thành công</b>, không phải lỗi. ' +
            'Gõ <code>poweroff -f</code> để kết thúc bước 2.' }
        ] },

      /* ---------------------------------------------------------- BƯỚC 3 */
      { title: 'Vặn âm lượng log: <code>loglevel=</code>, <code>quiet</code>, <code>debug</code> và <code>/dev/kmsg</code>',
        blocks: [

          { t: 'p', x:
            'Bước 1 để lại một câu hỏi chưa trả lời: <code>dmesg</code> có 257 dòng còn màn ' +
            'hình chỉ có 247. Bước này giải quyết nó bằng cách vặn <b>một</b> con số — con số ' +
            'đầu tiên trong bốn con số của <code>/proc/sys/kernel/printk</code>. Bắt đầu bằng ' +
            'chiều ngược lại: siết chặt hơn mặc định.' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init loglevel=3"' },

          { t: 'p', x:
            'Log boot ngắn hẳn lại — chỉ còn các dòng mức 0, 1 và 2. Vào shell rồi hỏi hai câu ' +
            'quen thuộc:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/sys/kernel/printk\n' +
            'dmesg | wc -l\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/printk\n' +
            '3\t4\t1\t7\n' +
            '~ # dmesg | wc -l\n' +
            '257' },

          { t: 'cal', kind: 'why', title: 'Đây là câu trả lời cho bí ẩn 257 / 247',
            x: 'Con số đầu đổi từ <code>7</code> thành <code>3</code> — đúng bằng giá trị bạn ' +
               'đưa. Ba con số còn lại <b>không đổi</b>. Nhưng nhìn con số quan trọng: ' +
               '<code>dmesg | wc -l</code> vẫn là <b>257</b>, y hệt mốc chuẩn.<br>' +
               '<b>Vòng đệm không hề bị ảnh hưởng.</b> <code>loglevel=</code> chỉ là một cái ' +
               'van đặt giữa vòng đệm và console. Mọi thông điệp vẫn được ghi đầy đủ vào bộ ' +
               'nhớ; bạn chỉ đang chọn hiển thị ít đi. Đây là lý do phần lý thuyết nhấn mạnh ' +
               'hai lớp lọc riêng biệt, và là lý do trên bo mạch thật bạn có thể chạy ' +
               '<code>quiet</code> cho đẹp mà vẫn không mất một dòng nhật ký nào khi cần điều ' +
               'tra sự cố.' },

          { t: 'p', x:
            'Giờ thử <code>quiet</code> — tham số mà gần như mọi bản phân phối Linux desktop ' +
            'đều đặt sẵn, để người dùng thấy màn hình khởi động đẹp thay vì thác chữ:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init quiet"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/printk\n' +
            '4\t4\t1\t7\n' +
            '~ # dmesg | wc -l\n' +
            '257' },

          { t: 'p', x:
            '<code>quiet</code> chỉ là <code>loglevel=4</code> viết tắt — không hơn. Nó không ' +
            'phải một cơ chế riêng, và nó cũng không "tắt log": lại vẫn 257 dòng trong vòng ' +
            'đệm. Nếu ai đó nói với bạn rằng "bo mạch chạy <code>quiet</code> nên không có log ' +
            'để debug", họ nhầm — log vẫn ở đó, chỉ cần gõ <code>dmesg</code>.' },

          { t: 'p', x:
            'Đẩy tới cực đoan: <code>loglevel=1</code>. Chỉ mức 0 (<code>KERN_EMERG</code>) lọt ' +
            'qua, mà một lần boot bình thường thì không có mức 0 nào cả:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init loglevel=1"' },

          { t: 'code', where: 'out', nocopy: true, name: 'Toàn bộ phiên, đúng 20 dòng', code:
            '\n' +
            '=== init argv: /init  ===\n' +
            '=== init env ===\n' +
            'SHLVL=1\n' +
            'HOME=/\n' +
            'TERM=linux\n' +
            'PATH=/sbin:/usr/sbin:/bin:/usr/bin\n' +
            'PWD=/\n' +
            '=== /proc/cmdline ===\n' +
            'console=ttyAMA0 rdinit=/init loglevel=1\n' +
            '\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
            'Enter \'help\' for a list of built-in commands.\n' +
            '\n' +
            '~ # cat /proc/sys/kernel/printk\n' +
            '1\t4\t1\t7\n' +
            '~ # dmesg | wc -l\n' +
            '257\n' +
            '~ # poweroff -f\n' +
            '[   15.850507] reboot: Power down' },

          { t: 'cal', kind: 'info', title: 'Không một dòng nhân nào trong suốt lần boot',
            x: 'So sánh với mốc chuẩn ở bước 1: 247 dòng nhân, giờ là <b>0</b>. Thứ đầu tiên ' +
               'bạn nhìn thấy là <code>=== init argv:</code> — output của chính ' +
               '<code>/init</code>, đi qua đường <code>write()</code> tới ' +
               '<code>/dev/console</code> chứ không qua <code>printk</code>, nên van log không ' +
               'chặn được nó.<br>' +
               'Riêng dòng cuối <code>reboot: Power down</code> vẫn hiện. Nó là ' +
               '<code>KERN_EMERG</code> — mức 0, mức duy nhất còn lọt qua khi ' +
               '<code>loglevel=1</code>. Một cách kiểm chứng bảng tám mức rất gọn: bạn vừa ' +
               'chứng minh <code>reboot: Power down</code> ở mức 0 mà không cần đọc mã nguồn.<br>' +
               'Và tất nhiên: <code>dmesg</code> vẫn <b>257</b>.' },

          { t: 'p', x:
            'Chiều ngược lại — <code>debug</code>, tức <code>loglevel=10</code>. Số 10 lớn hơn ' +
            'mức cao nhất (7), nghĩa là <b>không chặn gì cả</b>. Đây chính là cách nhìn thấy ' +
            '10 dòng ẩn ở bước 1 mà không phải so sánh thủ công:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init debug"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/printk\n' +
            '10\t4\t1\t7\n' +
            '~ # dmesg | wc -l\n' +
            '257' },

          { t: 'p', x:
            'Cuộn ngược lên gần dòng <code>Run /init as init process</code> và bạn sẽ thấy ' +
            '<code>with arguments: / /init / with environment: / HOME=/ / TERM=linux</code> — ' +
            'năm trong số 10 dòng ẩn, giờ hiện ngay trên màn hình. Bốn con số cho thấy ' +
            '<code>debug</code> đặt van lên <code>10</code>, và <code>dmesg</code> — như mọi ' +
            'lần — vẫn <b>257</b>. Bảng tổng kết cả năm lần boot của bước này:' },

          { t: 'table',
            head: ['Tham số', '<code>/proc/sys/kernel/printk</code>', 'Dòng nhân ra màn hình', '<code>dmesg | wc -l</code>'],
            rows: [
              ['(không đặt gì)', '<code>7 4 1 7</code>', '247', '<b>257</b>'],
              ['<code>loglevel=3</code>', '<code>3 4 1 7</code>', 'ít hơn nhiều', '<b>257</b>'],
              ['<code>quiet</code>', '<code>4 4 1 7</code>', 'ít hơn nhiều', '<b>257</b>'],
              ['<code>loglevel=1</code>', '<code>1 4 1 7</code>', '<b>0</b>', '<b>257</b>'],
              ['<code>debug</code>', '<code>10 4 1 7</code>', '257 — đủ cả', '<b>257</b>']
            ] },

          { t: 'cal', kind: 'tip', title: 'Một cột không bao giờ đổi — hãy nhớ đúng cột đó',
            x: 'Cột cuối cùng bất biến qua cả năm lần boot. Nếu bạn chỉ mang một thứ từ bước ' +
               'này ra khỏi bài, hãy mang câu này: <b>các tham số log điều khiển ' +
               '<i>console</i>, không điều khiển <i>vòng đệm</i>.</b> Khi một bo mạch ngoài ' +
               'hiện trường gặp sự cố mà console đang bị bịt, việc đầu tiên cần làm không phải ' +
               'là reboot với <code>debug</code> (reboot là mất sạch vòng đệm) — mà là ' +
               '<code>dmesg</code>.' },

          { t: 'p', x:
            'Phần cuối của bước này chuyển từ <i>lúc boot</i> sang <i>lúc chạy</i>. Boot lại ' +
            'mốc chuẩn (không tham số log nào) rồi làm bốn việc trong shell: ghi một dòng vào ' +
            'vòng đệm, đọc nó ra, vặn van xuống 1, ghi tiếp một dòng nữa và đọc lại.' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'qemu', code:
            'echo "hello from userspace" > /dev/kmsg\n' +
            'dmesg | tail -n 1\n' +
            'dmesg -n 1\n' +
            'echo "second message" > /dev/kmsg\n' +
            'dmesg | tail -n 1\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo "hello from userspace" > /dev/kmsg\n' +
            '[   11.745098] hello from userspace\n' +
            '~ # dmesg | tail -n 1\n' +
            '[   11.745098] hello from userspace\n' +
            '~ # dmesg -n 1\n' +
            '~ # echo "second message" > /dev/kmsg\n' +
            '~ # dmesg | tail -n 1\n' +
            '[   17.746854] second message\n' +
            '~ # poweroff -f\n' +
            '[   23.792058] reboot: Power down',
            notes: [
              'Các dấu thời gian <code>11.745098</code>, <code>17.746854</code>, <code>23.792058</code> phụ thuộc bạn gõ nhanh hay chậm — chúng chắc chắn khác trên máy bạn. Điều đáng nhìn là <b>dòng nào hiện, dòng nào không</b>.'
            ] },

          { t: 'cal', kind: 'why', title: 'Sáu dòng này chứng minh trọn vẹn kiến trúc hai lớp',
            x: '<b>Lần một:</b> <code>echo … &gt; /dev/kmsg</code> và thông điệp hiện ra ' +
               '<b>ngay lập tức</b> kèm dấu thời gian nhân — bạn vừa chèn một dòng của mình vào ' +
               'nhật ký nhân từ user space. <code>dmesg | tail -n 1</code> đọc lại đúng dòng đó, ' +
               'đúng dấu thời gian: nó đã <b>nằm trong vòng đệm</b>.<br>' +
               '<b><code>dmesg -n 1</code></b> hạ <code>console_loglevel</code> xuống 1 — giống ' +
               'hệt <code>loglevel=1</code>, nhưng làm được lúc đang chạy, không cần reboot.<br>' +
               '<b>Lần hai:</b> <code>echo … &gt; /dev/kmsg</code> và <b>màn hình im lặng</b>. ' +
               'Nhưng <code>dmesg | tail -n 1</code> vẫn lôi ra được <code>second message</code>.<br>' +
               '<b>Cùng một lệnh, hai kết quả khác nhau trên màn hình, cùng một kết quả trong ' +
               'vòng đệm.</b> Van log nằm ở giữa. Đây là toàn bộ mục 4 của phần lý thuyết, gói ' +
               'trong sáu dòng bạn tự gõ.' },

          { t: 'cal', kind: 'warn', title: 'Không có <code>devtmpfs</code> thì thí nghiệm này im lặng mà sai',
            x: 'Nếu bạn bỏ dòng <code>mount -t devtmpfs none /dev</code> ở bước 1, ' +
               '<code>/dev</code> sẽ <b>rỗng</b> và <code>/dev/kmsg</code> không tồn tại. ' +
               'Nhưng <code>echo … &gt; /dev/kmsg</code> <b>vẫn thành công</b> — vì dấu ' +
               '<code>&gt;</code> của shell tạo một <b>file thường</b> tên <code>kmsg</code> ' +
               'trong thư mục <code>/dev</code> và ghi vào đó. Không lỗi, không cảnh báo, và ' +
               '<code>dmesg | tail -n 1</code> sẽ trả về một dòng cũ nào đó (khi soạn bài này ' +
               'nó trả về <code>TERM=linux</code>), khiến bạn tưởng <code>/dev/kmsg</code> không ' +
               'hoạt động. Đây là lỗi <b>thật</b> đã mắc phải khi chuẩn bị bài — và là một ví ' +
               'dụ hoàn hảo cho câu ở mục 1: <i>không báo lỗi không có nghĩa là đúng</i>.' }
        ] },

      /* ---------------------------------------------------------- BƯỚC 4 */
      { title: 'Ba đường vào user space: khi <code>root=</code> bị bỏ qua, khi nó panic',
        blocks: [

          { t: 'p', x:
            'Sáu lần boot, mỗi lần một cách hỏng khác nhau. Mục tiêu không phải là làm cho nó ' +
            'chạy — mà là <b>nhớ mặt sáu thông báo lỗi</b>, vì mỗi thông báo chỉ đúng một ' +
            'nguyên nhân. Bắt đầu bằng một cái bẫy: đưa <code>root=</code> vào <b>cùng lúc</b> ' +
            'với initrd.' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, name: 'e6-rootignored.log, dòng 247', code:
            '[    0.898455] Run /init as init process' },

          { t: 'cal', kind: 'why', title: 'Máy ảo không có ổ <code>/dev/vda</code> nào — mà vẫn boot ngon lành',
            x: 'Bạn vừa yêu cầu nhân dùng <code>/dev/vda</code> làm root, trên một máy ảo ' +
               '<b>không hề có ổ đĩa nào</b>. Không một lời cảnh báo, không một dòng lỗi, và ' +
               'shell mở ra bình thường.<br>' +
               'Vì <code>rdinit=/init</code> tìm thấy <code>/init</code> trong initramfs, nhân ' +
               'chạy nó luôn và <b>không bao giờ chạm tới</b> đoạn mã gắn root. ' +
               '<code>root=</code> nằm đó, được ghi vào <code>/proc/cmdline</code>, và bị ' +
               '<b>bỏ qua hoàn toàn</b>. Đây là thứ tự ưu tiên ở <code>init/main.c:1462</code> ' +
               'mà bạn đã đọc, giờ thành hành vi quan sát được.<br>' +
               '<b>Hệ quả thực tế:</b> khi một bo mạch "boot được nhưng vào nhầm hệ thống ' +
               'tệp", nhìn xem có initramfs đang chen ngang không — sửa <code>root=</code> ' +
               'thêm mười lần cũng vô ích.' },

          { t: 'p', x:
            'Bây giờ phá <code>rdinit=</code>: giữ nguyên initrd nhưng trỏ vào một file không ' +
            'tồn tại. Chú ý nhân <b>không</b> panic ngay:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/nosuchfile"' },

          { t: 'code', where: 'out', nocopy: true, name: 'f3-badrdinit.log, dòng 246 rồi 259', code:
            '[    0.807664] check access for rdinit=/nosuchfile failed: -2, ignoring\n' +
            '        ⋮\n' +
            '[    0.828188] VFS: Cannot open root device "" or unknown-block(0,0): error -6\n' +
            '[    0.829146] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' },

          { t: 'cal', kind: 'why', title: 'Hai mã lỗi, hai câu chuyện khác nhau',
            x: '<code>-2</code> là <code>ENOENT</code> — "không có file đó". Nhân kiểm tra ' +
               '<code>/nosuchfile</code> trong initramfs, không thấy, và chữ quan trọng nhất ' +
               'là <code>ignoring</code>: <b>nó không panic, nó bỏ qua và chuyển sang phương án ' +
               'gắn ổ đĩa.</b> Đây chính là sự khác biệt giữa <code>rdinit=</code> và ' +
               '<code>init=</code> mà mục 3 đã nói — <code>init=</code> sai thì panic ngay tại ' +
               'chỗ, <code>rdinit=</code> sai thì <i>rơi xuống</i> con đường tiếp theo.<br>' +
               'Và con đường tiếp theo cũng hỏng, vì không có <code>root=</code> nào: ' +
               '<code>-6</code> = <code>ENXIO</code>, "không có thiết bị đó". Tên thiết bị in ' +
               'ra là <code>""</code> — chuỗi rỗng — vì bạn chưa bao giờ nói tên nào cả.<br>' +
               '<b>Đọc lỗi theo cặp:</b> dòng 246 nói vì sao nó rời initramfs, dòng 259 nói vì ' +
               'sao chỗ tiếp theo cũng không xong. Chỉ đọc dòng cuối là mất một nửa câu chuyện.' },

          { t: 'p', x:
            'Bỏ hẳn initrd đi để thấy thông báo "không có root" ở dạng đầy đủ nhất của nó. Chú ' +
            'ý là <b>không có</b> <code>-initrd</code> trong lệnh dưới đây:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -append "console=ttyAMA0"' },

          { t: 'code', where: 'out', nocopy: true, name: 'e14-noroot.log — tám dòng cuối', code:
            '[    0.789301] /dev/root: Can\'t open blockdev\n' +
            '[    0.790105] VFS: Cannot open root device "" or unknown-block(0,0): error -6\n' +
            '[    0.790612] Please append a correct "root=" boot option; here are the available partitions:\n' +
            '[    0.791371] 1f00          131072 mtdblock0 \n' +
            '[    0.791604]  (driver?)\n' +
            '[    0.792294] List of all bdev filesystems:\n' +
            '[    0.792552]  ext3 ext2 ext4 squashfs vfat\n' +
            '[    0.792775] \n' +
            '[    0.793474] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' },

          { t: 'cal', kind: 'info', title: 'Nhân đang chủ động giúp bạn — hãy đọc hết, đừng chỉ đọc chữ "panic"',
            x: 'Khối này chứa <b>ba</b> gợi ý mà người mới thường bỏ qua vì bị chữ ' +
               '<code>panic</code> ở dòng cuối làm hoảng:<br>' +
               '<b>1.</b> <code>here are the available partitions:</code> rồi liệt kê ' +
               '<code>mtdblock0</code> — nhân đang <i>nói cho bạn biết</i> nó nhìn thấy thiết ' +
               'bị khối nào. Ở đây chỉ có một: bộ nhớ flash giả lập của máy ảo ' +
               '<code>virt</code>. Nếu ổ đĩa của bạn <b>không</b> có trong danh sách này thì ' +
               'vấn đề là <b>driver</b>, không phải <code>root=</code>.<br>' +
               '<b>2.</b> <code>List of all bdev filesystems: ext3 ext2 ext4 squashfs vfat</b> — ' +
               'đây là <b>toàn bộ</b> hệ thống tệp mà kernel này biết đọc. Muốn dùng ' +
               '<code>btrfs</code> hay <code>f2fs</code>? Phải bật trong Kconfig rồi build lại ' +
               '(Bài 39).<br>' +
               '<b>3.</b> <code>unknown-block(0,0)</code> — cặp major/minor bằng <b>0,0</b> ' +
               'nghĩa là nhân <i>chưa từng phân giải được</i> tên nào thành thiết bị. Ghi nhớ ' +
               'cặp số này, thí nghiệm ngay sau đây sẽ cho ra một cặp khác.' },

          { t: 'p', x:
            'Tạo một ổ đĩa ảo <b>rỗng</b> 64 MiB rồi gắn vào máy — để so sánh: lần trước nhân ' +
            'không tìm thấy thiết bị, lần này nó tìm thấy nhưng không đọc nổi:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai41\n' +
            'qemu-img create -f raw blank.img 64M' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Formatting \'blank.img\', fmt=raw size=67108864' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -drive file=~/bai41/blank.img,format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda"' },

          { t: 'code', where: 'out', nocopy: true, name: 'f6-blankvda.log — dòng 206, rồi phần cuối', code:
            '[    0.712217] virtio_blk virtio1: [vda] 131072 512-byte logical blocks (67.1 MB/64.0 MiB)\n' +
            '        ⋮\n' +
            '[    0.786643] List of all partitions:\n' +
            '[    0.787015] fe00           65536 vda \n' +
            '[    0.787232]  driver: virtio_blk\n' +
            '[    0.787506] 1f00          131072 mtdblock0 \n' +
            '[    0.787737]  (driver?)\n' +
            '[    0.788289] No filesystem could mount root, tried: \n' +
            '[    0.788508]  ext3 ext2 ext4 squashfs vfat\n' +
            '[    0.789259] \n' +
            '[    0.789922] Kernel panic - not syncing: VFS: Unable to mount root fs on "/dev/vda" or unknown-block(254,0)' },

          { t: 'cal', kind: 'why', title: 'Ba điểm khác biệt so với lần trước — mỗi điểm là một manh mối',
            x: '<b>1. <code>unknown-block(254,0)</code> thay vì <code>(0,0)</code>.</b> Nhân ' +
               '<i>đã</i> phân giải được <code>/dev/vda</code> thành major 254, minor 0. Thiết ' +
               'bị có thật, driver có thật.<br>' +
               '<b>2. <code>vda</code> giờ nằm trong danh sách và có <code>driver: ' +
               'virtio_blk</code></b>, khác hẳn <code>mtdblock0</code> vẫn ghi ' +
               '<code>(driver?)</code>. Dòng 206 xác nhận nhân đã nhận đúng ổ 64 MiB.<br>' +
               '<b>3. Thông báo đổi từ <code>Cannot open root device</code> sang <code>No ' +
               'filesystem could mount root</code>.</b> Đây là điểm quan trọng nhất: hai câu ' +
               'này <b>không</b> đồng nghĩa. Câu trước = "không tìm ra thiết bị". Câu sau = ' +
               '"tìm ra rồi, đọc rồi, nhưng 64 MiB toàn số không này không phải hệ thống tệp ' +
               'nào tôi biết".<br>' +
               'Phân biệt được hai câu này là phân biệt được <i>lỗi phần cứng/driver</i> với ' +
               '<i>lỗi nội dung ổ đĩa</i> — và nó tiết kiệm cho bạn hàng giờ tìm sai chỗ.' },

          { t: 'cal', kind: 'info', title: 'Bạn sẽ tạo ra một ổ đĩa <i>có</i> hệ thống tệp ở Chặng 09',
            x: 'Bước hợp lý tiếp theo là định dạng <code>blank.img</code> thành ext4 và cài một ' +
               'rootfs thật vào đó — và đó đúng là nội dung của <b>Chặng 09</b> (Bài 46–49), ' +
               'nơi bạn dựng rootfs bằng BusyBox và học các loại rootfs khác nhau. Bài này dừng ở chỗ ' +
               '<i>đọc hiểu triệu chứng</i>, cố tình không dựng rootfs, để khi tới Chặng 09 bạn ' +
               'đã quen mặt mọi cách nó có thể hỏng.' },

          { t: 'p', x:
            'Thí nghiệm áp chót: <code>panic=5</code>. Nó bảo nhân tự khởi động lại 5 giây sau ' +
            'mỗi lần panic. Kết hợp với một cấu hình chắc chắn panic, bạn được một vòng lặp:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -append "console=ttyAMA0 panic=5"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.793474] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)\n' +
            '[    0.795098] Rebooting in 5 seconds..' },

          { t: 'cal', kind: 'danger', title: '15 lần panic trong 90 giây — và trên bo mạch thật thì là vô hạn',
            x: 'Để nguyên 90 giây rồi thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>X</kbd>, ' +
               'log thu được <b>4 141 dòng</b> và chứa <b>15</b> lần ' +
               '<code>Kernel panic - not syncing: VFS</code>. Đó là vòng lặp khởi động vô tận, ' +
               'chỉ khác là ở đây bạn dừng được nó.<br>' +
               '<code>panic=N</code> là con dao hai lưỡi kinh điển của nghề nhúng. Trên thiết ' +
               'bị đã xuất xưởng, tự reboot là <b>đúng</b>: một lỗi thoáng qua không nên làm ' +
               'chết máy vĩnh viễn. Nhưng nếu lỗi là <i>cố định</i> — sai ' +
               '<code>root=</code>, hỏng rootfs — thì thiết bị reboot mãi mãi, và tệ hơn nữa: ' +
               '<b>mỗi lần reboot xoá sạch vòng đệm log</b>, nên bạn chỉ kịp đọc log của lần ' +
               'panic gần nhất trước khi nó biến mất.<br>' +
               '<b>Quy tắc:</b> khi đang phát triển, đừng đặt <code>panic=</code>. Hãy để nó ' +
               'đứng yên tại chỗ chết để bạn còn đọc được.' },

          { t: 'p', x:
            'Thí nghiệm cuối của bước 4 quay lại mục 1 của phần lý thuyết: cái gì xảy ra với ' +
            'những tham số nhân <b>không</b> hiểu. Thêm hai chữ vô nghĩa vào cuối dòng lệnh — ' +
            'một chữ có dấu <code>=</code>, một chữ không:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init foo=bar hello"' },

          { t: 'code', where: 'out', nocopy: true, name: 'e5-extraargs.log, dòng 36 và 37', code:
            '[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init foo=bar hello\n' +
            '[    0.000000] Unknown kernel command line parameters "hello foo=bar", will be passed to user space.' },

          { t: 'p', x:
            'Nhân thừa nhận nó không hiểu hai chữ đó, và nói rõ nó sẽ chuyển cho user space. ' +
            'Nhưng chuyển <b>thế nào</b>? Câu trả lời nằm trong phần <code>init</code> tự khai ' +
            'báo — so nó với mốc chuẩn ở bước 1:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=== init argv: /init hello ===\n' +
            '=== init env ===\n' +
            'SHLVL=1\n' +
            'HOME=/\n' +
            'foo=bar\n' +
            'TERM=linux\n' +
            'PATH=/sbin:/usr/sbin:/bin:/usr/bin\n' +
            'PWD=/' },

          { t: 'cal', kind: 'why', title: 'Quy tắc một dòng: có dấu <code>=</code> thì thành biến môi trường, không có thì thành tham số',
            x: '<code>hello</code> (không có <code>=</code>) chui vào <b>argv</b> — chỗ khoảng ' +
               'trống bạn được dặn ghi nhớ ở bước 1 giờ đã có chữ.<br>' +
               '<code>foo=bar</code> (có <code>=</code>) chui vào <b>envp</b> — và nhìn kỹ vị ' +
               'trí của nó: nằm <b>giữa</b> <code>HOME=/</code> và <code>TERM=linux</code>, ' +
               'đúng như <code>unknown_bootoption()</code> chèn nó vào mảng ' +
               '<code>envp_init[]</code> ở <code>init/main.c</code>.<br>' +
               'Đây không phải chuyện lý thuyết suông: <b>đây là cách chuẩn để truyền cấu hình ' +
               'từ bootloader vào phần mềm user space của bạn.</b> Một tham số kiểu ' +
               '<code>board_rev=c2</code> đặt trong U-Boot sẽ xuất hiện thẳng trong môi trường ' +
               'của PID 1, không cần thêm bất kỳ cơ chế nào. Gõ <code>poweroff -f</code> để kết ' +
               'thúc bước 4.' } ]
      },

      /* ---------------------------------------------------------- BƯỚC 5 */
      { title: 'Thu nhỏ kernel: từ 41 MB xuống 3,3 MB bằng hai lần build',
        blocks: [

          { t: 'p', x:
            'Bước cuối cùng là bước duy nhất phải build, và nó mất khoảng 25 phút. Nguyên tắc ' +
            'quan trọng nhất: <b>không đụng vào cây nguồn của Bài 38.</b> Cây ' +
            '<code>~/bai38/linux-6.18.45</code> đang giữ <code>Image</code>, ' +
            '<code>vmlinux</code>, 1 423 module và 1 577 file <code>.dtb</code> mà Chặng 08 tới ' +
            'Chặng 10 còn cần. Bung một cây thứ hai từ đúng file <code>.tar.xz</code> bạn đã ' +
            'tải ở Bài 38:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai41\n' +
            'tar -xf ~/bai38/linux-6.18.45.tar.xz\n' +
            'ls -d ~/bai41/linux-6.18.45' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/home/shinarus/bai41/linux-6.18.45',
            notes: [
              'Lệnh <code>tar</code> mất khoảng 2–3 phút và không in gì cả — đó là bình thường, nó đang ghi hơn 1,5 GB ra đĩa.',
              'Đường dẫn in ra sẽ mang tên người dùng của bạn thay vì <code>shinarus</code>.'
            ] },

          { t: 'cal', kind: 'danger', title: 'Đừng thử tiết kiệm bằng cách dùng lại cây Bài 38',
            x: 'Cách "tiết kiệm" hiển nhiên là chạy <code>make mrproper</code> trong ' +
               '<code>~/bai38/linux-6.18.45</code> rồi cấu hình lại. <b>Đừng.</b> ' +
               '<code>mrproper</code> xoá <code>.config</code>, <code>Image</code>, ' +
               '<code>vmlinux</code> và toàn bộ module — bạn sẽ phải build lại 18 phút, và các ' +
               'bài Chặng 08 trở đi lại phải chờ. 1,5 GB đĩa rẻ hơn nhiều so với việc build lại ' +
               'kernel hai lần.' },

          { t: 'p', x:
            'Lần build đầu tiên dùng <code>tinyconfig</code> — cấu hình nhỏ nhất mà hệ thống ' +
            'Kconfig chấp nhận. Chú ý tham số <code>O=</code>, đây là lần đầu bài học dùng nó:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai41/linux-6.18.45\n' +
            'make O=~/bai41/b-tiny ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- tinyconfig' },

          { t: 'cmdx', cmd: 'make O=~/bai41/b-tiny ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- tinyconfig',
            title: 'Bốn tham số, một cái mới hoàn toàn',
            rows: [
              ['<code>O=~/bai41/b-tiny</code>',
               '<b>Out-of-tree build.</b> Mọi thứ sinh ra — <code>.config</code>, file ' +
               '<code>.o</code>, <code>vmlinux</code>, <code>Image</code> — đi vào thư mục đó ' +
               'thay vì nằm lẫn trong cây nguồn.',
               'Đây là lý do bạn build được <b>hai</b> cấu hình khác nhau từ <b>một</b> cây ' +
               'nguồn mà chúng không giẫm lên nhau. Cây nguồn giữ nguyên trạng thái sạch, và ' +
               'bạn không bao giờ phải <code>mrproper</code>. Mọi dự án nhúng nghiêm túc đều ' +
               'build kiểu này — Buildroot và Yocto (Chặng 11) làm đúng thế.'],
              ['<code>ARCH=arm64</code>', 'Kiến trúc đích.',
               'Giống hệt Bài 39 và Bài 40. Thiếu nó thì Kconfig sẽ đưa ra menu của x86.'],
              ['<code>CROSS_COMPILE=aarch64-linux-gnu-</code>', 'Tiền tố bộ biên dịch chéo.',
               'Bài 25 đã dựng. Với riêng <code>tinyconfig</code> thì nó chưa cần dùng tới, ' +
               'nhưng đặt sẵn để lệnh build ngay sau đó không phải gõ khác.'],
              ['<code>tinyconfig</code>', 'Mục tiêu Kconfig: tắt <b>mọi thứ có thể tắt</b>.',
               'Khác hẳn <code>defconfig</code> ở Bài 39 (bật những gì bo mạch thường cần). ' +
               '<code>tinyconfig</code> đi từ đáy đi lên, không phải từ trên đi xuống — đây là ' +
               'điểm xuất phát chuẩn khi bạn muốn biết <i>tối thiểu tuyệt đối</i> là bao nhiêu.']
            ] },

          { t: 'p', x:
            'Đếm xem cấu hình này bật bao nhiêu thứ, rồi build:' },

          { t: 'code', where: 'wsl', code:
            'grep -c \'=y$\'                 ~/bai41/b-tiny/.config\n' +
            'grep -c \'^# .* is not set$\'   ~/bai41/b-tiny/.config\n' +
            'time make O=~/bai41/b-tiny ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            '421\n' +
            '527\n' +
            '        ⋮\n' +
            'real\t2m23.694s',
            notes: [
              'Thời gian build phụ thuộc số nhân CPU và tốc độ đĩa của bạn — con số đo trên máy 6 nhân. Điều đáng so sánh là <b>tỉ lệ</b> với 18 phút của Bài 40, không phải con số tuyệt đối.'
            ] },

          { t: 'p', x:
            'Bài 40 build <code>defconfig</code> mất <b>18 phút 31 giây</b> với <b>3 286</b> ' +
            'tuỳ chọn <code>=y</code> và <b>1 273</b> module. Ở đây: <b>421</b> tuỳ chọn ' +
            '<code>=y</code>, <b>0</b> module, <b>2 phút 24 giây</b>. Xem file ra được:' },

          { t: 'code', where: 'wsl', code:
            'ls -l ~/bai41/b-tiny/arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus 1961992 Aug 29 11:38 /home/shinarus/bai41/b-tiny/arch/arm64/boot/Image' },

          { t: 'p', x:
            '<b>1 961 992 byte</b> — 1,87 MiB, so với 41 089 536 byte của Bài 40. Nhỏ hơn ' +
            '<b>20,9 lần</b>. Boot thử xem nó làm được gì:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai41/b-tiny/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 earlycon rdinit=/init"' },
          { t: 'p', muted: true, x:
            '<b>Vẫn không có gì cả</b> — kể cả khi đã bật <code>earlycon</code>.' },

          { t: 'cal', kind: 'danger', title: 'Câm — nhưng lần này <code>earlycon</code> cũng không cứu nổi',
            x: 'Ở bước 2, <code>earlycon</code> biến màn hình trống thành 273 dòng log. Ở đây ' +
               'nó <b>không làm gì cả</b>, và lý do rất đáng nhớ: <code>tinyconfig</code> tắt ' +
               'luôn <code>CONFIG_PRINTK</code>. <b>Không có <code>printk</code> thì không có ' +
               'thông điệp nào để in</b> — không console nào, không earlycon nào, không ' +
               '<code>loglevel</code> nào cứu được. Cái van bạn vặn suốt bước 3 giờ không còn ' +
               'nước để vặn.<br>' +
               'Nó cũng tắt <code>CONFIG_TTY</code>, <code>CONFIG_BINFMT_ELF</code> và ' +
               '<code>CONFIG_BLK_DEV_INITRD</code> — nghĩa là kernel này ' +
               '<b>không chạy nổi một chương trình ELF nào</b>, chứ đừng nói mở shell. Thoát ' +
               'bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>X</kbd>.<br>' +
               '<b>Đây là mục đích của <code>tinyconfig</code>:</b> không phải để dùng, mà để ' +
               'làm <i>vạch xuất phát</i>. Từ đây bạn bật lên đúng những gì cần, không thừa một ' +
               'thứ.' },

          { t: 'p', x:
            'Lần build thứ hai: bật <b>17</b> tuỳ chọn — số tối thiểu để có một hệ thống chạy ' +
            'được shell. Dùng <code>scripts/config</code>, công cụ sửa <code>.config</code> từ ' +
            'dòng lệnh mà kernel cung cấp sẵn. Chép thẳng cả khối này:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai41/linux-6.18.45\n' +
            'cp -r ~/bai41/b-tiny ~/bai41/b-min\n' +
            './scripts/config --file ~/bai41/b-min/.config \\\n' +
            '  -e PRINTK -e TTY -e BINFMT_ELF -e BINFMT_SCRIPT -e MULTIUSER \\\n' +
            '  -e SERIAL_AMBA_PL011 -e SERIAL_AMBA_PL011_CONSOLE \\\n' +
            '  -e BLK_DEV_INITRD -e RD_GZIP \\\n' +
            '  -e PROC_FS -e SYSFS \\\n' +
            '  -e FUTEX -e EPOLL -e SIGNALFD -e TIMERFD -e EVENTFD -e AIO\n' +
            'make O=~/bai41/b-min ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- olddefconfig' },

          { t: 'cmdx', cmd: './scripts/config --file … -e SYMBOL', title: 'Hai lệnh, và vì sao phải chạy cả hai',
            rows: [
              ['<code>--file ~/bai41/b-min/.config</code>',
               'Chỉ định file cấu hình cần sửa.',
               'Mặc định <code>scripts/config</code> sửa <code>.config</code> trong thư mục ' +
               'hiện tại. Vì bạn build out-of-tree, phải trỏ tay vào file trong thư mục build.'],
              ['<code>-e PRINTK</code>',
               'Đặt <code>CONFIG_PRINTK=y</code>. Viết tắt của <code>--enable</code>.',
               'Không cần gõ tiền tố <code>CONFIG_</code>. Có <code>-d</code> để tắt và ' +
               '<code>-m</code> để đặt thành module.'],
              ['<code>make … olddefconfig</code>',
               '<b>Bắt buộc chạy sau đó.</b> Giải quyết mọi phụ thuộc do 17 tuỳ chọn kia kéo theo.',
               '<code>scripts/config</code> chỉ sửa văn bản, nó <b>không hiểu</b> quan hệ ' +
               '<code>depends on</code> / <code>select</code> mà bạn học ở Bài 39. Bật ' +
               '<code>TTY</code> thì hàng chục tuỳ chọn khác phải bật theo, và chỉ ' +
               '<code>olddefconfig</code> mới làm được việc đó. Bỏ qua bước này thì build sẽ ' +
               'lỗi hoặc cho ra một kernel thiếu mảnh.']
            ] },

          { t: 'p', x:
            'Đếm lại và build:' },

          { t: 'code', where: 'wsl', code:
            'grep -c \'=y$\' ~/bai41/b-min/.config\n' +
            'time make O=~/bai41/b-min ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) Image\n' +
            'ls -l ~/bai41/b-min/arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            '506\n' +
            '        ⋮\n' +
            'real\t2m34.542s\n' +
            '-rw-r--r-- 1 shinarus shinarus 3303432 Aug 29 11:40 /home/shinarus/bai41/b-min/arch/arm64/boot/Image' },

          { t: 'cal', kind: 'info', title: '17 chữ bạn gõ đã kéo theo 85 tuỳ chọn',
            x: '<code>421</code> → <code>506</code> là <b>+85</b>, không phải +17. Đó chính là ' +
               '<code>olddefconfig</code> giải quyết <code>select</code> và ' +
               '<code>depends on</code> hộ bạn — bằng chứng cụ thể cho cơ chế Kconfig của Bài ' +
               '39. Kích thước tăng từ 1 961 992 lên <b>3 303 432</b> byte: 85 tuỳ chọn kia ' +
               'tốn <b>1,34 MB</b>.' },

          { t: 'p', x: 'Boot nó:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai41/b-min/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai41/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, name: 'g3-min.log — dòng 2, 24, 45, 60, 73, 74', code:
            'Linux version 6.18.45 (shinarus@Shinarus) (aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0, GNU ld (GNU Binutils for Ubuntu) 2.46) #1 SMP Sat Aug 29 11:40:57 +07 2026\n' +
            'Kernel command line: console=ttyAMA0 rdinit=/init\n' +
            'Console: colour dummy device 80x25\n' +
            'Memory: 507104K/524288K available (1856K kernel code, 602K rwdata, 332K rodata, 320K init, 357K bss, 16364K reserved, 0K cma-reserved)\n' +
            'Run /init as init process\n' +
            'mount: mounting none on /dev failed: No such device',
            notes: [
              'Tên máy, tên người dùng và ngày giờ build sẽ khác trên máy bạn.'
            ] },

          { t: 'cal', kind: 'why', title: 'Bốn khác biệt so với mốc chuẩn — mỗi cái là một tuỳ chọn bạn <i>không</i> bật',
            x: '<b>1. Không có dấu thời gian.</b> Cả 100 dòng log đều trống phần ' +
               '<code>[    0.xxxxxx]</code>, vì <code>CONFIG_PRINTK_TIME</code> không nằm trong ' +
               'danh sách 17 chữ. Nó không đổi kích thước bao nhiêu, nhưng đổi hẳn cảm giác đọc ' +
               'log — và nếu thiếu nó, bạn không đo được cái gì chậm lúc boot.<br>' +
               '<b>2. <code>uname -r</code> trả về <code>6.18.45</code>, không có ' +
               '<code>-embedded</code></b>, vì đây là cây nguồn sạch chưa đặt ' +
               '<code>CONFIG_LOCALVERSION</code>. Dùng nó để chắc chắn mình đang boot đúng file.<br>' +
               '<b>3. <code>mount … /dev failed: No such device</code>.</b> Đây là dòng ' +
               '<code>mount -t devtmpfs</code> trong <code>/init</code> của bạn thất bại — ' +
               '<code>CONFIG_DEVTMPFS</code> không có trong 17 chữ. Bạn vẫn vào được shell, ' +
               'nhưng <code>/dev</code> rỗng nên thí nghiệm <code>/dev/kmsg</code> ở bước 3 sẽ ' +
               'không chạy được trên kernel này. <b>Một dòng lỗi tự nói ra chính xác tuỳ chọn ' +
               'còn thiếu</b> — đó là cách bạn sẽ bổ sung dần cấu hình cho một sản phẩm thật.<br>' +
               '<b>4. <code>1856K kernel code</code></b> thay vì <code>18304K</code>. Nhìn con ' +
               'số này cạnh nhau là hiểu ngay 41 MB kia đi đâu.' },

          { t: 'p', x:
            'Ba câu hỏi cuối trong shell, rồi tắt máy:' },

          { t: 'code', where: 'qemu', code:
            'uname -r\n' +
            'dmesg | wc -l\n' +
            'ls /proc | wc -l\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # uname -r\n' +
            '6.18.45\n' +
            '~ # dmesg | wc -l\n' +
            '80\n' +
            '~ # ls /proc | wc -l\n' +
            '60' },

          { t: 'p', x:
            'Vòng đệm chỉ còn <b>80</b> dòng thay vì 257 — không phải vì bị lọc, mà vì kernel ' +
            'này thật sự <i>có ít việc để kể</i>: không PCI, không ATA, không MTD, không CMA. ' +
            'Và <code>/proc</code> chỉ còn <b>60</b> mục; con số này thay đổi theo số tiến ' +
            'trình đang chạy nên máy bạn có thể ra khác một hai đơn vị, nhưng nó ở cùng bậc — ' +
            'ít hơn hẳn một hệ <code>defconfig</code>. Bảng tổng kết cả ba lần build:' },

          { t: 'table',
            head: ['', '<code>defconfig</code> (Bài 40)', '<code>tinyconfig</code>', '<code>tinyconfig</code> + 17'],
            rows: [
              ['<code>Image</code>', '41 089 536 B (39,19 MiB)', '1 961 992 B (1,87 MiB)', '<b>3 303 432 B (3,15 MiB)</b>'],
              ['<code>vmlinux</code>', '157 080 232 B', '2 620 480 B', '4 166 272 B'],
              ['Tuỳ chọn <code>=y</code>', '3 286', '421', '506'],
              ['Module <code>=m</code>', '1 273', '0', '0'],
              ['Thời gian build', '18 m 30,8 s', '2 m 23,7 s', '2 m 34,5 s'],
              ['Boot ra shell?', 'Có', '<b>Không — câm hoàn toàn</b>', 'Có'],
              ['Dòng trong <code>dmesg</code>', '257', '0', '80']
            ] },

          { t: 'cal', kind: 'info', title: 'Ba con số đáng mang theo',
            x: '<b>12,44 lần</b> — <code>Image</code> nhỏ hơn bấy nhiêu lần mà vẫn boot ra ' +
               'shell.<br>' +
               '<b>92,0 %</b> — phần trăm dung lượng cắt được, tương đương <b>36,0 MiB</b> tiết ' +
               'kiệm trên mỗi thiết bị. Với một bo mạch có 8 MB flash NOR, đây là khác biệt ' +
               'giữa <i>vừa</i> và <i>không vừa</i>.<br>' +
               '<b>7,2 lần</b> — build nhanh hơn bấy nhiêu lần. Trên một dự án mà bạn build ' +
               'hai chục lần một ngày, 16 phút tiết kiệm mỗi lần là hơn 5 giờ mỗi ngày.' },

          { t: 'cal', kind: 'warn', title: 'Cái giá không xuất hiện trong bảng',
            x: 'Kernel 3,3 MB kia <b>không dùng được cho sản phẩm thật</b>, và điều đó là bình ' +
               'thường — nó thiếu mạng, thiếu USB, thiếu ổ đĩa, thiếu ' +
               '<code>devtmpfs</code>, thiếu module, và thiếu <code>KALLSYMS</code> nên mọi ' +
               'oops sẽ in ra địa chỉ thô thay vì tên hàm. Ý nghĩa của bước này không phải ' +
               '"hãy dùng cấu hình 17 chữ", mà là: <b>bạn vừa nhìn thấy sàn nhà</b>. Từ nay khi ' +
               'ai đó hỏi "kernel tối thiểu bao nhiêu MB", bạn có một con số đo thật, và bạn ' +
               'biết chính xác mỗi MB thêm vào đang mua thứ gì.' }
        ] }

    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây là thông báo <b>thật</b> gặp phải khi chuẩn bị bài này. Cột giữa mới ' +
      'là phần đáng học: cùng một triệu chứng "không boot" có ít nhất sáu nguyên nhân khác ' +
      'hẳn nhau, và thông báo lỗi luôn phân biệt được chúng — nếu bạn chịu đọc quá chữ ' +
      '<code>panic</code>.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<i>(màn hình trống hoàn toàn, không một ký tự)</i>',
         '<code>console=</code> trỏ vào cổng không tồn tại trên bo mạch này — ví dụ ' +
         '<code>ttyS0</code> trên máy ảo <code>virt</code>. Nhân <b>vẫn đang chạy bình thường</b>.',
         'Thêm <code>earlycon</code> để nhìn thấy log, đọc dòng ' +
         '<code>ttyAMA0 at MMIO …</code> để biết tên cổng đúng, rồi sửa ' +
         '<code>console=</code>. Kiểm tra cả tốc độ baud ở đầu bên kia sợi cáp.'],

        ['<code>Warning: unable to open an initial console.</code> rồi ' +
         '<code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000</code>',
         '<code>/dev/console</code> mở không được (sai <code>console=</code>), nên shell khởi ' +
         'động mà không có stdin/stdout và thoát ngay. PID 1 thoát → nhân bắt buộc panic. ' +
         '<code>exitcode</code> bằng 0 nghĩa là nó thoát <i>bình thường</i>, không crash.',
         'Sửa <code>console=</code> cho đúng. <code>earlycon</code> giúp bạn <b>đọc</b> được ' +
         'thông báo này nhưng không sửa hộ.'],

        ['<code>VFS: Cannot open root device "" or unknown-block(0,0): error -6</code>',
         'Không có <code>root=</code> nào và cũng không có initramfs — nhân không biết gắn cái ' +
         'gì. <code>-6</code> = <code>ENXIO</code>; tên thiết bị in ra rỗng vì bạn chưa nói tên.',
         'Thêm <code>-initrd</code> + <code>rdinit=/init</code>, hoặc thêm <code>root=</code> ' +
         'trỏ vào một ổ có hệ thống tệp thật. Đọc danh sách ' +
         '<code>available partitions</code> ngay bên dưới để biết nhân nhìn thấy ổ nào.'],

        ['<code>No filesystem could mount root, tried: ext3 ext2 ext4 squashfs vfat</code> rồi ' +
         '<code>… on "/dev/vda" or unknown-block(254,0)</code>',
         '<b>Khác hẳn dòng trên.</b> Nhân <i>đã</i> tìm thấy ổ (major/minor là 254,0 chứ không ' +
         'phải 0,0) và đọc được nó, nhưng nội dung không phải hệ thống tệp nào nhân biết — ổ ' +
         'rỗng, chưa định dạng, hoặc định dạng bằng fs chưa bật trong Kconfig.',
         'Định dạng ổ (Chặng 09), hoặc thêm <code>rootfstype=</code> cho đúng, hoặc bật fs đó ' +
         'trong <code>menuconfig</code> rồi build lại (Bài 39). Danh sách sau ' +
         '<code>tried:</code> chính là toàn bộ fs kernel này biết đọc.'],

        ['<code>check access for rdinit=/nosuchfile failed: -2, ignoring</code>',
         'File chỉ định bởi <code>rdinit=</code> không có trong initramfs. <code>-2</code> = ' +
         '<code>ENOENT</code>. Chữ <code>ignoring</code> rất quan trọng: nhân <b>không panic</b>, ' +
         'nó bỏ qua và chuyển sang gắn ổ đĩa — nên lỗi thật sự hiện ra vài dòng sau, dưới dạng ' +
         'một lỗi VFS trông chẳng liên quan.',
         'Kiểm tra đường dẫn có tồn tại trong kho cpio: ' +
         '<code>zcat initramfs.cpio.gz | cpio -t | grep init</code>. Kiểm tra cả bit thực thi ' +
         'và dòng <code>#!/bin/sh</code> đầu file.'],

        ['<code>Kernel panic - not syncing: No working init found.  Try passing init= option to kernel.</code>',
         'Nhân đã gắn được root, nhưng không tìm thấy chương trình init nào — cả ' +
         '<code>init=</code> bạn chỉ định lẫn bốn đường dẫn dự phòng ' +
         '<code>/sbin/init</code>, <code>/etc/init</code>, <code>/bin/init</code>, ' +
         '<code>/bin/sh</code> đều không có.',
         'Rootfs gắn nhầm phân vùng, hoặc rootfs thiếu init. Chú ý: gặp được thông báo <i>này</i> ' +
         'là tin tốt — nó chứng minh <code>root=</code> đã <b>đúng</b>, vấn đề nằm ở nội dung ' +
         'rootfs.'],

        ['Đặt <code>root=</code> nhưng nhân hoàn toàn phớt lờ, boot vào một hệ thống tệp khác',
         'Có initramfs kèm <code>rdinit=</code> chen ngang. Nhân chạy ' +
         '<code>/init</code> trong initramfs và <b>không bao giờ chạm tới</b> đoạn mã gắn root ' +
         '(<code>init/main.c:1462</code>).',
         'Bỏ <code>-initrd</code> đi nếu bạn thật sự muốn boot từ ổ đĩa, hoặc sửa ' +
         '<code>/init</code> trong initramfs để nó tự gắn root rồi <code>switch_root</code>. ' +
         'Sửa <code>root=</code> mười lần cũng không có tác dụng gì.'],

        ['<code>echo … &gt; /dev/kmsg</code> chạy êm nhưng <code>dmesg</code> không thấy thông điệp',
         '<code>/dev</code> chưa gắn <code>devtmpfs</code>, nên <code>/dev/kmsg</code> không ' +
         'tồn tại và dấu <code>&gt;</code> của shell lặng lẽ tạo một <b>file thường</b> tên ' +
         '<code>kmsg</code>. Không lỗi, không cảnh báo.',
         'Thêm <code>mount -t devtmpfs none /dev</code> vào <code>/init</code>, và bật ' +
         '<code>CONFIG_DEVTMPFS</code>. Kiểm tra bằng <code>ls -l /dev/kmsg</code> — phải thấy ' +
         'chữ <code>c</code> (character device) ở đầu dòng, không phải <code>-</code>.'],

        ['Bo mạch reboot liên tục, đọc log không kịp',
         'Dòng lệnh có <code>panic=N</code>. Mỗi lần reboot xoá sạch vòng đệm log, nên bạn chỉ ' +
         'thấy được lần panic gần nhất.',
         'Bỏ <code>panic=</code> khi đang phát triển, để máy đứng yên tại chỗ chết. Chỉ bật lại ' +
         'khi xuất xưởng.'],

        ['<code>make</code> báo <code>No rule to make target</code> hoặc build ra kernel thiếu ' +
         'mảnh sau khi sửa <code>.config</code> bằng <code>scripts/config</code>',
         'Quên chạy <code>make olddefconfig</code>. <code>scripts/config</code> chỉ sửa văn bản, ' +
         'nó không hiểu <code>depends on</code> / <code>select</code>.',
         'Luôn chạy <code>make O=… olddefconfig</code> ngay sau mọi lần dùng ' +
         '<code>scripts/config</code>. Ở bước 5, nó biến 17 tuỳ chọn bạn gõ thành 85 tuỳ chọn ' +
         'thật sự bật.'],

        ['Kernel <code>tinyconfig</code> câm dù đã có <code>console=</code> <b>và</b> ' +
         '<code>earlycon</code>',
         '<code>CONFIG_PRINTK</code> bị tắt. Không có <code>printk</code> thì không có thông ' +
         'điệp nào để in — không console nào cứu được.',
         'Bật <code>CONFIG_PRINTK</code> (và <code>CONFIG_TTY</code>, ' +
         '<code>CONFIG_SERIAL_AMBA_PL011_CONSOLE</code>) rồi <code>olddefconfig</code> và build ' +
         'lại.']
      ] },

    /* ============================================================
       TỔNG KẾT
       ============================================================ */
    { t: 'recap', title: 'Tóm tắt bài này', items: [
      'Dòng lệnh kernel đi qua bốn chặng: <b>QEMU <code>-append</code> → ' +
      '<code>/chosen/bootargs</code> trong Device Tree → <code>parse_args()</code> → ' +
      '<code>/proc/cmdline</code></b>. Trên bo mạch thật, U-Boot thay chỗ QEMU.',

      'Tham số nhân không hiểu <b>không phải lỗi</b>: có dấu <code>=</code> thì thành ' +
      '<b>biến môi trường</b> của PID 1, không có <code>=</code> thì thành <b>tham số dòng ' +
      'lệnh</b>. Bạn đã chứng minh bằng <code>foo=bar hello</code>.',

      '<code>console=</code> chỉ bật ở dòng <b>106</b>; <b>105</b> dòng trước đó là log ' +
      '<i>phát lại</i> từ vòng đệm. <code>earlycon</code> bật từ dòng <b>7</b> và là công cụ ' +
      'đầu tiên phải thử khi màn hình câm — nhưng nó chỉ cho <i>nhìn thấy</i>, không cho ' +
      '<i>sửa</i>.',

      'Thứ tự vào user space: <b><code>rdinit=</code> → <code>init=</code> → bốn đường dẫn dự ' +
      'phòng</b>. <code>rdinit=</code> sai thì nhân <b>bỏ qua</b> (<code>-2, ignoring</code>); ' +
      '<code>init=</code> sai thì nhân <b>panic ngay</b>. Có initramfs thì <code>root=</code> ' +
      'bị phớt lờ hoàn toàn.',

      'Ba thông báo VFS <b>không đồng nghĩa</b>: <code>Cannot open root device</code> = không ' +
      'tìm thấy thiết bị (<code>0,0</code>); <code>No filesystem could mount root</code> = tìm ' +
      'thấy rồi nhưng nội dung sai (<code>254,0</code>); <code>No working init found</code> = ' +
      'gắn được rồi nhưng rootfs thiếu init.',

      '<code>printk</code> có <b>tám mức</b>, 0 (<code>KERN_EMERG</code>) tới 7 ' +
      '(<code>KERN_DEBUG</code>) — <b>số càng nhỏ chuyện càng to</b>. Bốn số trong ' +
      '<code>/proc/sys/kernel/printk</code> mặc định là <code>7 4 1 7</code>.',

      '<b>Van log điều khiển console, không điều khiển vòng đệm.</b> Qua năm lần boot với ' +
      '<code>loglevel=3</code>, <code>quiet</code>, <code>loglevel=1</code> và ' +
      '<code>debug</code>, số dòng trên màn hình đi từ 0 tới 257 — nhưng ' +
      '<code>dmesg | wc -l</code> <b>luôn luôn là 257</b>.',

      '<code>defconfig</code> 41 MB → <code>tinyconfig</code> + <b>17</b> tuỳ chọn = ' +
      '<b>3,3 MB</b>: nhỏ hơn <b>12,44 lần</b>, tiết kiệm <b>92 %</b>, build nhanh hơn ' +
      '<b>7,2 lần</b>. Riêng <code>KALLSYMS</code> chiếm <b>5,48 MiB</b> (14 % của ' +
      '<code>Image</code>), còn <code>DEBUG_INFO</code> chiếm 60 MB của <code>vmlinux</code> ' +
      'nhưng <b>0 byte</b> của <code>Image</code>.',

      'Build bằng <code>O=&lt;thư mục&gt;</code> để một cây nguồn nuôi được nhiều cấu hình — ' +
      'và để bạn <b>không bao giờ phải <code>mrproper</code></b> cây đang dùng.'
    ] },

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo',
      x: 'Bài này nhắc tới Device Tree ba lần mà chưa lần nào giải thích: chuỗi ' +
         '<code>-append</code> được QEMU nhét vào <code>/chosen/bootargs</code>; khi bạn bỏ ' +
         '<code>console=</code> thì nhân đọc <code>/chosen/stdout-path</code> và tự tìm ra ' +
         '<code>ttyAMA0</code>; và <code>earlycon</code> biết địa chỉ ' +
         '<code>0x9000000</code> mà không cần ai nói. <b>Bài 42 mở Chặng 08 — Device Tree</b> ' +
         'và trả lời câu hỏi gốc: trước năm 2011 mọi bo mạch ARM phải có một "board file" ' +
         'viết bằng C nằm ngay trong cây nguồn kernel, và điều đó tệ tới mức Linus Torvalds ' +
         'công khai nổi giận. Bạn sẽ thấy vì sao mô tả phần cứng bị tách hẳn ra khỏi mã ' +
         'kernel, vì sao ARM chọn Device Tree còn x86 chọn ACPI — và bắt đầu đọc được cái ' +
         'file mà suốt bốn bài vừa rồi đã âm thầm quyết định hộ bạn.' }
  ],

  /* ============================================================
     QUIZ
     ============================================================ */
  quiz: [
    { q: 'Bạn boot một bo mạch mới và màn hình terminal hoàn toàn trống — không một ký tự nào, ' +
         'kể cả sau 30 giây. Nguyên nhân nào <b>đáng nghi nhất</b> và cách kiểm tra nhanh nhất?',
      opts: [
        'File <code>Image</code> hỏng — build lại kernel',
        '<code>console=</code> sai cổng hoặc sai baud — thêm <code>earlycon</code> vào dòng lệnh để xem có log không',
        'RAM hỏng — thay bo mạch khác',
        'Rootfs thiếu <code>/sbin/init</code> — kiểm tra nội dung thẻ nhớ'
      ],
      a: 1,
      why: 'Màn hình trống <b>tuyệt đối</b> nghĩa là bạn không nhận được cả những dòng sớm nhất ' +
           'của nhân — mà nếu kernel hỏng thật hay rootfs thiếu init thì bạn vẫn sẽ thấy log rồi ' +
           'mới thấy lỗi. Im lặng hoàn toàn gần như luôn là vấn đề đường truyền: sai cổng, sai ' +
           'baud, cáp lỏng. Trong bài bạn đã tự gây ra triệu chứng này bằng ' +
           '<code>console=ttyS0</code>: QEMU chạy hoàn hảo nhưng chỉ in ra <b>1</b> dòng, và đó ' +
           'là dòng của lệnh <code>timeout</code>, không phải của nhân. Thêm <code>earlycon</code> ' +
           'thì cùng lần boot đó cho ra <b>273</b> dòng.' },

    { q: 'Bo mạch của bạn boot với <code>loglevel=1</code>. Một thiết bị USB không nhận, bạn muốn ' +
         'xem nhân đã in gì về nó lúc khởi động. Việc gì nên làm <b>trước</b>?',
      opts: [
        'Reboot với <code>debug</code> rồi đọc lại từ đầu',
        'Sửa <code>console_loglevel</code> bằng <code>dmesg -n 7</code> rồi reboot',
        'Gõ <code>dmesg</code> — toàn bộ log vẫn nằm nguyên trong vòng đệm',
        'Không còn cách nào, <code>loglevel=1</code> đã vứt bỏ các thông điệp đó'
      ],
      a: 2,
      why: '<code>loglevel=</code> là cái van đặt giữa <b>vòng đệm</b> và <b>console</b> — nó chỉ ' +
           'quyết định cái gì được <i>in ra</i>, không quyết định cái gì được <i>ghi lại</i>. ' +
           'Trong bài bạn đã chứng minh điều này năm lần: dù <code>loglevel=1</code> (0 dòng ra ' +
           'màn hình) hay <code>debug</code> (257 dòng), <code>dmesg | wc -l</code> ' +
           '<b>luôn là 257</b>. Và đây không phải chuyện học thuật: reboot sẽ <b>xoá sạch vòng ' +
           'đệm</b>, nên hai phương án reboot kia chính là cách nhanh nhất để mất đúng thứ bạn ' +
           'đang cần tìm.' },

    { q: 'Nhân dừng ở <code>Kernel panic - not syncing: VFS: Unable to mount root fs on ' +
         '"/dev/vda" or unknown-block(254,0)</code>, ngay trên đó là dòng ' +
         '<code>No filesystem could mount root, tried: ext3 ext2 ext4 squashfs vfat</code>. ' +
         'Kết luận đúng là gì?',
      opts: [
        'Nhân không tìm thấy ổ đĩa — thiếu driver, phải bật driver rồi build lại',
        'Nhân tìm thấy ổ và đọc được nó, nhưng nội dung không phải hệ thống tệp nào kernel này biết',
        'Tên thiết bị viết sai, phải là <code>/dev/sda</code>',
        'Rootfs có nhưng thiếu <code>/sbin/init</code>'
      ],
      a: 1,
      why: 'Hai manh mối chốt lại kết luận. Thứ nhất, <code>unknown-block(<b>254,0</b>)</code> ' +
           '— cặp major/minor <b>khác 0,0</b> nghĩa là nhân đã phân giải được tên ' +
           '<code>/dev/vda</code> thành một thiết bị thật; nếu thiếu driver thì bạn sẽ thấy ' +
           '<code>(0,0)</code> và thông báo <code>Cannot open root device</code>. Thứ hai, ' +
           '<code>No filesystem could mount root, <b>tried</b>:</code> nghĩa là nhân đã ' +
           '<i>thử đọc</i> lần lượt năm loại fs và không loại nào khớp. Phân biệt được hai câu ' +
           'này là phân biệt được lỗi driver với lỗi nội dung ổ đĩa.' },

    { q: 'Bạn boot với <code>-initrd initramfs.cpio.gz</code> và ' +
         '<code>-append "root=/dev/vda rdinit=/init"</code>, trên một máy <b>không có ổ đĩa ' +
         'nào</b>. Chuyện gì xảy ra?',
      opts: [
        'Nhân panic vì <code>/dev/vda</code> không tồn tại',
        'Nhân cảnh báo về <code>root=</code> rồi vẫn boot bằng initramfs',
        'Nhân boot bình thường vào shell, <code>root=</code> bị phớt lờ hoàn toàn và không có cảnh báo nào',
        'Nhân thử <code>/dev/vda</code> trước, thất bại, rồi mới quay sang initramfs'
      ],
      a: 2,
      why: 'Vì <code>rdinit=/init</code> tìm thấy <code>/init</code> trong initramfs, nhân chạy ' +
           'nó luôn và <b>không bao giờ chạm tới</b> đoạn mã gắn root ' +
           '(<code>init/main.c:1462</code>). <code>root=</code> vẫn được ghi vào ' +
           '<code>/proc/cmdline</code> nhưng chưa từng có ai đọc nó. Trong bài, lần boot này ra ' +
           'thẳng <code>Run /init as init process</code> ở dòng 247, không một chữ VFS nào. ' +
           'Hệ quả thực tế đáng nhớ: khi một bo mạch "boot được nhưng vào nhầm hệ thống tệp", ' +
           'hãy tìm xem có initramfs đang chen ngang không — sửa <code>root=</code> vô ích.' },

    { q: 'Bạn thêm <code>board_rev=c2</code> vào dòng lệnh kernel. Nhân không có tham số nào tên ' +
         'như vậy. Nó sẽ nằm ở đâu?',
      opts: [
        'Bị bỏ qua hoàn toàn, chỉ còn lại trong <code>/proc/cmdline</code>',
        'Trở thành biến môi trường của tiến trình init — gõ <code>env</code> sẽ thấy',
        'Trở thành tham số dòng lệnh của init — nằm trong <code>$1</code>',
        'Gây lỗi <code>Unknown parameter</code> và nhân từ chối boot'
      ],
      a: 1,
      why: 'Quy tắc một dòng của <code>unknown_bootoption()</code>: <b>có dấu <code>=</code> thì ' +
           'vào <code>envp</code>, không có <code>=</code> thì vào <code>argv</code></b>. Trong ' +
           'bài bạn đã kiểm chứng bằng <code>foo=bar hello</code>: <code>hello</code> hiện ra ' +
           'trong <code>=== init argv: /init hello ===</code>, còn <code>foo=bar</code> hiện ' +
           'trong <code>env</code>, nằm đúng giữa <code>HOME=/</code> và <code>TERM=linux</code>. ' +
           'Đây là cách chuẩn để truyền cấu hình từ bootloader vào phần mềm user space mà không ' +
           'cần thêm cơ chế nào. Lưu ý nhân vẫn in ' +
           '<code>Unknown kernel command line parameters …, will be passed to user space.</code> ' +
           '— đó là thông báo, không phải lỗi.' },

    { q: 'Bạn build <code>tinyconfig</code>, thêm <code>console=ttyAMA0 earlycon</code>, và màn ' +
         'hình vẫn hoàn toàn trống. Vì sao <code>earlycon</code> không cứu được lần này?',
      opts: [
        'Vì <code>tinyconfig</code> tắt <code>CONFIG_PRINTK</code> — không có thông điệp nào để in',
        'Vì <code>earlycon</code> chỉ hoạt động khi <code>console=</code> sai',
        'Vì <code>tinyconfig</code> đặt <code>loglevel=0</code>',
        'Vì kernel quá nhỏ nên boot xong trước khi earlycon kịp bật'
      ],
      a: 0,
      why: '<code>earlycon</code> là một <i>đường ra</i> cho thông điệp, không phải nguồn sinh ra ' +
           'thông điệp. <code>tinyconfig</code> tắt <code>CONFIG_PRINTK</code>, nên toàn bộ cơ ' +
           'chế log — vòng đệm, tám mức, mọi console — không tồn tại trong kernel đó. Vặn ' +
           '<code>loglevel</code> cũng vô nghĩa vì không còn gì để lọc. Kernel ấy cũng tắt ' +
           '<code>CONFIG_TTY</code> và <code>CONFIG_BINFMT_ELF</code>, nghĩa là nó không chạy nổi ' +
           'một chương trình ELF nào — nên nó không dùng được, và đó là <i>đúng ý đồ</i>: ' +
           '<code>tinyconfig</code> là vạch xuất phát để bật lên, không phải cấu hình để dùng.' }
  ]
});

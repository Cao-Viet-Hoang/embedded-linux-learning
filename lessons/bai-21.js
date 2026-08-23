/* Bài 21 — Tín hiệu và tắt máy êm */
Lesson.register({
  id: 'bai-21',
  title: 'Tín hiệu và tắt máy êm',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Thiết bị của bạn đang ghi dữ liệu cảm biến xuống thẻ SD. Người dùng rút điện. Lần khởi ' +
    'động sau, file log cụt ngang giữa một dòng và cơ sở dữ liệu báo hỏng. Đó không phải lỗi ' +
    'phần cứng — đó là một chương trình <b>không biết cách chết</b>. ' +
    '<b>Tín hiệu</b> là cách duy nhất thế giới bên ngoài gõ cửa một tiến trình đang chạy: ' +
    'khi bạn nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd>, khi <code>systemd</code> yêu cầu dừng dịch vụ ' +
    'để cập nhật firmware, khi một đứa con vừa chết. Bài 20 đã dạy bạn tạo ra tiến trình; bài ' +
    'này dạy bạn kết thúc chúng cho tử tế — và giải thích vì sao <code>printf</code> trong một ' +
    'bộ xử lý tín hiệu là lỗi, dù nó thường có vẻ chạy được.',

  goals: [
    'Giải thích được tín hiệu là gì, ai gửi, và nhân chuyển phát nó vào lúc nào',
    'Đăng ký bộ xử lý bằng <code>sigaction</code> và nói được ba lý do không dùng <code>signal</code>',
    'Phân biệt <code>SIGINT</code>, <code>SIGTERM</code>, <code>SIGKILL</code>, <code>SIGCHLD</code>, <code>SIGUSR1</code> và chứng minh <code>SIGKILL</code> không bắt được',
    'Nêu được async-signal-safe nghĩa là gì, và tự tạo ra một lỗi tái nhập để thấy hậu quả',
    'Dùng <code>sigprocmask</code> để bảo vệ vùng tới hạn, và <code>signalfd</code> để nhận tín hiệu như đọc file',
    'Viết một daemon nhận <code>SIGTERM</code>, ghi nốt bản ghi cuối cùng rồi đóng file sạch sẽ'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. TÍN HIỆU LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tín hiệu là gì — ngắt mềm do nhân chuyển phát' },

    { t: 'p', x:
      'Một <b>tín hiệu</b> là thông báo bất đồng bộ mà nhân gửi tới một tiến trình. Nó mang ' +
      'đúng <b>một</b> thông tin: số hiệu. Không kèm dữ liệu, không kèm chuỗi giải thích, không ' +
      'có cơ chế trả lời. Đây là hình thức giao tiếp liên tiến trình <b>nguyên thuỷ nhất</b> ' +
      'trên Unix, có từ trước cả pipe.' },

    { t: 'p', x:
      'Điểm khác biệt căn bản so với mọi thứ bạn đã học: tín hiệu <b>không đợi bạn gọi hàm nào ' +
      'cả</b>. Ở Bài 19 chương trình chủ động gọi <code>read</code> rồi nhân trả lời; ở đây nhân ' +
      'chủ động <b>chen ngang</b> luồng thực thi, ép CPU nhảy vào một hàm bạn đã đăng ký trước, ' +
      'rồi mới trả bạn về đúng chỗ đang dở. Giống hệt ngắt phần cứng trên vi điều khiển, chỉ ' +
      'khác là do phần mềm dựng ra — vì thế người ta hay gọi tín hiệu là <b>ngắt mềm</b>.' },

    { t: 'fig',
      cap: 'Tín hiệu không được chuyển phát ngay lúc gửi. Nó nằm chờ trong bảng "đang treo" của tiến trình đích, và chỉ được xử lý tại thời điểm nhân sắp trả quyền điều khiển về không gian người dùng.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Đường đi của một tín hiệu từ lúc gửi tới lúc bộ xử lý chạy">' +
        '<rect class="d-box-a" x="16" y="24" width="150" height="52" rx="6"/>' +
        '<text class="d-t" x="34" y="46">NGƯỜI GỬI</text>' +
        '<text class="d-ts" x="34" y="66">kill, Ctrl+C, nhân</text>' +

        '<line class="d-line" x1="166" y1="50" x2="236" y2="50"/>' +
        '<path class="d-arrow" d="M244 50 l-10 -6 v12 z"/>' +
        '<text class="d-ts" x="172" y="42">syscall kill()</text>' +

        '<rect class="d-box-p" x="244" y="16" width="460" height="88" rx="6"/>' +
        '<text class="d-t" x="264" y="40">NHÂN — ghi số hiệu vào bảng của tiến trình đích</text>' +
        '<text class="d-ts" x="264" y="62">1. bị chặn (blocked)?  → để nguyên trong "đang treo", chưa làm gì</text>' +
        '<text class="d-ts" x="264" y="82">2. không bị chặn      → đánh dấu cần xử lý ở lần quay về user tiếp theo</text>' +

        '<line class="d-line" x1="474" y1="104" x2="474" y2="136"/>' +
        '<path class="d-arrow" d="M474 144 l-6 -10 h12 z"/>' +

        '<rect class="d-box" x="16" y="144" width="688" height="72" rx="6"/>' +
        '<text class="d-t" x="36" y="168">ĐIỂM CHUYỂN PHÁT — khi nhân sắp trả CPU về cho tiến trình</text>' +
        '<text class="d-ts" x="36" y="190">ra khỏi một syscall · hết lượt lập lịch · quay về từ ngắt phần cứng</text>' +
        '<text class="d-ts" x="36" y="208">Đây là lý do tiến trình đang kẹt trong trạng thái D (uninterruptible) không nhận được tín hiệu nào.</text>' +

        '<line class="d-line" x1="180" y1="216" x2="180" y2="242"/>' +
        '<path class="d-arrow" d="M180 250 l-6 -10 h12 z"/>' +
        '<line class="d-line" x1="540" y1="216" x2="540" y2="242"/>' +
        '<path class="d-arrow" d="M540 250 l-6 -10 h12 z"/>' +

        '<rect class="d-box-g" x="16" y="250" width="330" height="40" rx="6"/>' +
        '<text class="d-t" x="36" y="268">Có handler → nhảy vào handler</text>' +
        '<text class="d-ts" x="36" y="284">chạy xong thì quay lại đúng dòng đang dở</text>' +

        '<rect class="d-box-w" x="374" y="250" width="330" height="40" rx="6"/>' +
        '<text class="d-t" x="394" y="268">Không có handler → hành vi mặc định</text>' +
        '<text class="d-ts" x="394" y="284">Term · Core · Ign · Stop · Cont</text>' +
        '</svg>' },

    { t: 'terms', items: [
      ['Tín hiệu', 'signal', 'Thông báo bất đồng bộ mang một số hiệu, do nhân chuyển phát tới tiến trình'],
      ['Chuyển phát', 'delivery', 'Thời điểm nhân thật sự tác động: chạy handler hoặc thi hành hành vi mặc định'],
      ['Đang treo', 'pending', 'Tín hiệu đã gửi nhưng chưa chuyển phát, vì đang bị chặn'],
      ['Mặt nạ tín hiệu', 'signal mask', 'Tập tín hiệu mà tiến trình đang tạm chặn, xem/sửa bằng <code>sigprocmask</code>'],
      ['Bố trí', 'disposition', 'Cách tiến trình phản ứng với một tín hiệu: mặc định, bỏ qua, hay handler riêng'],
      ['Bộ xử lý', 'handler', 'Hàm C do bạn viết, được nhân gọi khi tín hiệu được chuyển phát'],
      ['An toàn tín hiệu', 'async-signal-safe', 'Tính chất của hàm gọi được an toàn từ trong handler'],
      ['Tắt êm', 'graceful shutdown', 'Kết thúc có kiểm soát: xả đệm, đóng file, nhả tài nguyên, rồi mới thoát']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao tín hiệu nghèo nàn đến thế — và vì sao vẫn không bị thay thế', x:
      '<p>Tín hiệu không mang được dữ liệu, không xếp hàng (gửi <code>SIGUSR1</code> mười lần ' +
      'lúc nó đang bị chặn thì chỉ chuyển phát <b>một</b> lần), không có cách báo lại cho người ' +
      'gửi biết đã xử lý xong. Xét theo mọi tiêu chuẩn hiện đại thì đây là một cơ chế tồi.</p>' +
      '<p>Nhưng nó có một thứ mà không cơ chế nào khác có: <b>hoạt động được với mọi tiến ' +
      'trình, không cần tiến trình đó hợp tác trước</b>. Bạn <code>kill</code> được một chương ' +
      'trình nhị phân đóng, viết từ 1992, không có socket, không có API, không đọc file cấu ' +
      'hình nào. Vì thế toàn bộ hạ tầng quản lý dịch vụ của Linux — <code>systemd</code>, ' +
      '<code>init</code>, trình quản lý container, kể cả lệnh tắt máy — đều đứng trên tín ' +
      'hiệu.</p>' +
      '<p>Với người làm nhúng, điều này rất cụ thể: bản cập nhật firmware chạy được hay không ' +
      'phụ thuộc vào việc dịch vụ của bạn có xử lý <code>SIGTERM</code> đúng hay không.</p>' },

    /* ══════════════════════════════════════════════
       2. DANH MỤC TÍN HIỆU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Danh mục tín hiệu cần thuộc' },

    { t: 'p', x:
      'Linux có 64 tín hiệu. Bạn cần thuộc khoảng mười cái; số còn lại tra khi cần. Xem danh ' +
      'sách đầy đủ trên máy bạn:' },

    { t: 'code', where: 'wsl', code: 'kill -l' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 4) SIGILL\t 5) SIGTRAP\n' +
      ' 6) SIGABRT\t 7) SIGBUS\t 8) SIGFPE\t 9) SIGKILL\t10) SIGUSR1\n' +
      '11) SIGSEGV\t12) SIGUSR2\t13) SIGPIPE\t14) SIGALRM\t15) SIGTERM\n' +
      '16) SIGSTKFLT\t17) SIGCHLD\t18) SIGCONT\t19) SIGSTOP\t20) SIGTSTP\n' +
      '21) SIGTTIN\t22) SIGTTOU\t23) SIGURG\t24) SIGXCPU\t25) SIGXFSZ\n' +
      '26) SIGVTALRM\t27) SIGPROF\t28) SIGWINCH\t29) SIGIO\t30) SIGPWR\n' +
      '31) SIGSYS\t34) SIGRTMIN\t35) SIGRTMIN+1\t36) SIGRTMIN+2\t37) SIGRTMIN+3\n' +
      '...\n' +
      '63) SIGRTMAX-1\t64) SIGRTMAX',
      notes: ['Số 32 và 33 bị bỏ trống — glibc giữ riêng cho phần cài đặt luồng NPTL. Đó là lý ' +
        'do <code>SIGRTMIN</code> trên Linux là <b>34</b> chứ không phải 32.'] },

    { t: 'table',
      head: ['Tín hiệu', 'Số', 'Mặc định', 'Ai gửi và khi nào', 'Bắt được?'],
      rows: [
        ['<code>SIGHUP</code>', '1', 'Term', 'Terminal điều khiển bị đóng. Theo lệ, daemon dùng nó làm lệnh "nạp lại cấu hình"', 'Có'],
        ['<code>SIGINT</code>', '2', 'Term', 'Bạn nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd>', 'Có'],
        ['<code>SIGQUIT</code>', '3', 'Core', '<kbd>Ctrl</kbd>+<kbd>\\</kbd>. Giống <code>SIGINT</code> nhưng sinh file core để mổ xẻ', 'Có'],
        ['<code>SIGKILL</code>', '<b>9</b>', 'Term', '<code>kill -9</code>. Nhân giết thẳng, tiến trình không được chạy thêm một lệnh nào', '<b>KHÔNG</b>'],
        ['<code>SIGUSR1</code>', '10', 'Term', 'Không ai gửi trừ bạn. Dành riêng cho mục đích của ứng dụng', 'Có'],
        ['<code>SIGSEGV</code>', '11', 'Core', 'Nhân gửi khi truy cập bộ nhớ sai — con trỏ NULL, tràn mảng', 'Có (nhưng hiếm khi nên bắt)'],
        ['<code>SIGPIPE</code>', '13', 'Term', 'Ghi vào pipe/socket mà đầu kia đã đóng', 'Có'],
        ['<code>SIGALRM</code>', '14', 'Term', 'Hết giờ đặt bằng <code>alarm()</code>', 'Có'],
        ['<code>SIGTERM</code>', '<b>15</b>', 'Term', '<code>kill</code> không tham số, <code>systemctl stop</code>. <b>Lời đề nghị lịch sự</b>', 'Có'],
        ['<code>SIGCHLD</code>', '17', '<b>Ign</b>', 'Nhân gửi cho cha khi một đứa con chết', 'Có'],
        ['<code>SIGSTOP</code>', '19', 'Stop', 'Tạm dừng tiến trình', '<b>KHÔNG</b>'],
        ['<code>SIGTSTP</code>', '20', 'Stop', '<kbd>Ctrl</kbd>+<kbd>Z</kbd>', 'Có']
      ]},

    { t: 'p', x:
      'Cột "Mặc định" là hành vi khi bạn không đăng ký gì. Có đúng năm giá trị, và ' +
      '<code>man 7 signal</code> ghi rõ từng cái:' },

    { t: 'table',
      head: ['Ký hiệu', 'Nghĩa', 'Ví dụ'],
      rows: [
        ['<code>Term</code>', 'Kết thúc tiến trình', '<code>SIGTERM</code>, <code>SIGINT</code>'],
        ['<code>Core</code>', 'Kết thúc <b>và</b> sinh file core để gỡ lỗi bằng <code>gdb</code>', '<code>SIGSEGV</code>, <code>SIGQUIT</code>'],
        ['<code>Ign</code>', 'Bỏ qua hoàn toàn', '<code>SIGCHLD</code>, <code>SIGWINCH</code>'],
        ['<code>Stop</code>', 'Tạm dừng, chưa chết', '<code>SIGSTOP</code>, <code>SIGTSTP</code>'],
        ['<code>Cont</code>', 'Chạy tiếp sau khi bị dừng', '<code>SIGCONT</code>']
      ]},

    { t: 'code', where: 'wsl', code: 'MANWIDTH=80 man 7 signal | grep -A2 "cannot be caught"' },

    { t: 'code', where: 'out', nocopy: true, code:
      '       The signals SIGKILL and SIGSTOP cannot be caught, blocked, or ignored.' },

    { t: 'cal', kind: 'danger', title: 'SIGKILL và SIGSTOP là hai lỗ hổng cố ý trong hệ thống', x:
      '<p>Nếu mọi tín hiệu đều bắt được, một chương trình lỗi có thể chặn hết và trở nên bất tử ' +
      '— quản trị viên không còn cách nào lấy lại máy. Vì thế POSIX <b>khoét ra hai ngoại ' +
      'lệ</b>: số 9 luôn giết được, số 19 luôn dừng được.</p>' +
      '<p>Hệ quả bạn phải ghi nhớ suốt đời làm nghề: <b>không có cách nào dọn dẹp sau ' +
      '<code>SIGKILL</code></b>. Không xả đệm, không đóng file, không ghi nốt dòng log, không ' +
      'chạy <code>atexit</code>. Nhân đơn giản thu hồi toàn bộ trang nhớ và xoá tên tiến trình ' +
      'khỏi bảng. Mọi byte còn kẹt trong đệm <code>stdio</code> biến mất vĩnh viễn.</p>' +
      '<p>Đó chính là kịch bản mở đầu bài này. Ở phần thực hành bạn sẽ chạy đúng một chương ' +
      'trình hai lần — lần một với <code>SIGTERM</code>, lần hai với <code>SIGKILL</code> — và ' +
      'so sánh hai file log.</p>' },

    { t: 'cal', kind: 'tip', title: 'Đọc mã thoát là biết chương trình chết vì tín hiệu nào', x:
      '<p>Quy ước <b>128 + n</b> ở Bài 20 giờ trở nên rất hữu dụng khi gỡ lỗi ngoài hiện ' +
      'trường. Đo trên máy bạn:</p>' +
      '<ul>' +
      '<li><code>$?</code> = <b>130</b> → 128+2, người dùng nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd></li>' +
      '<li><code>$?</code> = <b>137</b> → 128+9, <b>bị <code>SIGKILL</code></b>. Trên thiết bị ' +
      'thật đây thường là OOM killer vì hết RAM, hoặc systemd hết kiên nhẫn chờ</li>' +
      '<li><code>$?</code> = <b>139</b> → 128+11, <code>SIGSEGV</code> — lỗi con trỏ</li>' +
      '<li><code>$?</code> = <b>141</b> → 128+13, <code>SIGPIPE</code> — ghi vào ống đã đóng</li>' +
      '<li><code>$?</code> = <b>143</b> → 128+15, <code>SIGTERM</code>, tức là bị dừng đàng ' +
      'hoàng</li>' +
      '</ul>' +
      '<p>Thấy <b>137</b> trong log của systemd là biết ngay: dịch vụ đã <i>không</i> chịu ' +
      'dừng theo lời đề nghị và bị cưỡng chế.</p>' },

    /* ══════════════════════════════════════════════
       3. SIGNAL VS SIGACTION
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'signal() hay sigaction() — vì sao câu trả lời luôn là sigaction' },

    { t: 'p', x:
      'Sách vở cũ dạy <code>signal(SIGINT, handler)</code> vì nó ngắn. Đừng dùng. Hàm này là di ' +
      'sản từ Unix những năm 1970, và <b>ngữ nghĩa của nó khác nhau giữa các hệ điều hành</b> — ' +
      'mã chạy đúng trên máy bạn có thể chạy sai trên uClibc của thiết bị.' },

    { t: 'table',
      head: ['Vấn đề', '<code>signal()</code>', '<code>sigaction()</code>'],
      rows: [
        ['Sau khi handler chạy, đăng ký còn giữ không?', 'Tuỳ hệ. Kiểu System V <b>đặt lại về mặc định</b> — tín hiệu thứ hai giết chương trình', 'Luôn giữ nguyên'],
        ['Syscall đang chặn có được khởi động lại không?', 'Tuỳ hệ, bạn không điều khiển được', 'Bạn tự chọn bằng cờ <code>SA_RESTART</code>'],
        ['Chặn thêm tín hiệu khác trong lúc handler chạy', 'Không làm được', '<code>sa_mask</code>'],
        ['Nhận thông tin ai gửi, vì sao gửi', 'Không', '<code>SA_SIGINFO</code> + <code>siginfo_t</code>'],
        ['Chuẩn hoá bởi POSIX', 'Có nhưng hành vi để ngỏ', 'Có, hành vi xác định rõ']
      ]},

    { t: 'code', where: 'file', name: 'catch_sigint.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '\n' +
      'static volatile sig_atomic_t count = 0;\n' +
      '\n' +
      'static void handle_sigint(int sig)\n' +
      '{\n' +
      '    (void)sig;\n' +
      '    count++;\n' +
      '    const char *s = "  [handler] signal received\\n";\n' +
      '    write(STDERR_FILENO, s, strlen(s));   /* write is safe, printf is not */\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct sigaction sa;\n' +
      '    memset(&sa, 0, sizeof sa);            /* zero it out first */\n' +
      '    sa.sa_handler = handle_sigint;\n' +
      '    sigemptyset(&sa.sa_mask);\n' +
      '    sa.sa_flags = SA_RESTART;\n' +
      '\n' +
      '    if (sigaction(SIGINT, &sa, NULL) < 0) { perror("sigaction"); return 1; }\n' +
      '\n' +
      '    printf("pid=%d waiting for signals, press Ctrl+C or run kill -INT %d\\n",\n' +
      '           getpid(), getpid());\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    while (count < 3)\n' +
      '        pause();                          /* sleep until a signal arrives */\n' +
      '\n' +
      '    printf("received %d signals, exiting normally\\n", count);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'cmdx', cmd: 'struct sigaction sa; memset(&sa, 0, sizeof sa);',
      title: 'Từng trường của struct sigaction',
      rows: [
        ['<code>memset(&amp;sa, 0, sizeof sa)</code>', 'Xoá sạch cấu trúc trước khi điền', '<b>Bắt buộc.</b> Cấu trúc có các trường nội bộ không tên; bỏ rác trong đó là hành vi không xác định'],
        ['<code>sa.sa_handler</code>', 'Hàm sẽ chạy. Hoặc <code>SIG_IGN</code> để bỏ qua, <code>SIG_DFL</code> để trả về mặc định', 'Kiểu <code>void f(int)</code> — tham số là số hiệu tín hiệu'],
        ['<code>sigemptyset(&amp;sa.sa_mask)</code>', 'Tập tín hiệu bị chặn <i>thêm</i> trong lúc handler chạy', 'Không được điền <code>sa_mask = 0</code> — đây là kiểu mờ, phải dùng hàm'],
        ['<code>sa.sa_flags = SA_RESTART</code>', 'Tự khởi động lại syscall bị ngắt giữa chừng', 'Không có cờ này, mọi <code>read</code> đang chặn sẽ trả về <code>-1</code>/<code>EINTR</code>'],
        ['<code>sigaction(SIGINT, &amp;sa, NULL)</code>', 'Áp dụng. Tham số 3 nhận lại bố trí cũ nếu bạn muốn khôi phục sau', 'Trả về <code>-1</code> nếu tín hiệu không bắt được — đúng trường hợp số 9 và 19']
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o catch_sigint catch_sigint.c\n' +
      './catch_sigint &\n' +
      'sleep 0.5\n' +
      'kill -INT $!; sleep 0.2\n' +
      'kill -INT $!; sleep 0.2\n' +
      'kill -INT $!' },

    { t: 'code', where: 'out', nocopy: true, code:
      'pid=9325 waiting for signals, press Ctrl+C or run kill -INT 9325\n' +
      '  [handler] signal received\n' +
      '  [handler] signal received\n' +
      '  [handler] signal received\n' +
      'received 3 signals, exiting normally' },

    { t: 'cal', kind: 'info', title: 'Ba lần vẫn chạy — bằng chứng sigaction không tự huỷ đăng ký', x:
      '<p>Handler chạy đủ <b>ba</b> lần rồi chương trình thoát với mã <b>0</b>. Nếu ngữ nghĩa ' +
      'kiểu System V có hiệu lực, lần <code>SIGINT</code> thứ hai đã giết chương trình vì bố ' +
      'trí bị đặt lại về <code>Term</code> ngay sau lần đầu.</p>' +
      '<p>Trên máy bạn, glibc cài <code>signal()</code> theo ngữ nghĩa BSD nên nó <i>cũng</i> ' +
      'giữ đăng ký — nghĩa là bạn <b>không thể phát hiện lỗi này khi test ở đây</b>. Nó chỉ nổ ' +
      'trên thiết bị dùng một thư viện C khác. Đây đúng là loại lỗi mà cách chữa duy nhất là ' +
      'đừng bao giờ tạo ra nó: dùng <code>sigaction</code>, luôn luôn.</p>' },

    { t: 'p', x:
      'Cờ <code>SA_RESTART</code> đáng được nhìn tận mắt, vì nó quyết định mã của bạn có phải ' +
      'xử lý <code>EINTR</code> hay không. Chương trình dưới đây tự đặt chuông báo cho mình ' +
      'trong lúc đang chặn ở <code>read</code>:' },

    { t: 'code', where: 'file', name: 'eintr_demo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '#include <errno.h>\n' +
      '#include <unistd.h>\n' +
      '\n' +
      'static void on_alarm(int s) { (void)s; }\n' +
      '\n' +
      'int main(int argc, char *argv[])\n' +
      '{\n' +
      '    int use_restart = (argc > 1 && argv[1][0] == \'1\');\n' +
      '\n' +
      '    struct sigaction sa;\n' +
      '    memset(&sa, 0, sizeof sa);\n' +
      '    sa.sa_handler = on_alarm;\n' +
      '    sigemptyset(&sa.sa_mask);\n' +
      '    sa.sa_flags = use_restart ? SA_RESTART : 0;\n' +
      '    sigaction(SIGALRM, &sa, NULL);\n' +
      '\n' +
      '    int pipefd[2];\n' +
      '    if (pipe(pipefd) < 0) { perror("pipe"); return 1; }\n' +
      '\n' +
      '    alarm(1);                       /* fire SIGALRM at ourself in 1 second */\n' +
      '\n' +
      '    char buf[16];\n' +
      '    errno = 0;\n' +
      '    ssize_t n = read(pipefd[0], buf, sizeof buf);   /* blocks forever since nobody writes */\n' +
      '\n' +
      '    printf("SA_RESTART=%d  read returned %zd, errno=%d (%s)\\n",\n' +
      '           use_restart, n, errno, errno ? strerror(errno) : "-");\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o eintr_demo eintr_demo.c\n' +
      'timeout 5 ./eintr_demo 0; echo "exit=$?"\n' +
      'timeout 5 ./eintr_demo 1; echo "exit=$?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'SA_RESTART=0  read returned -1, errno=4 (Interrupted system call)\n' +
      'exit=0\n' +
      'exit=124' },

    { t: 'cal', kind: 'why', title: 'Mã thoát 124 ở dòng cuối chính là kết quả', x:
      '<p>Lần đầu, <b>không</b> có <code>SA_RESTART</code>: <code>read</code> bị bỏ dở, trả về ' +
      '<code>-1</code> với <code>errno = EINTR</code> (số 4, "Interrupted system call"). Chương ' +
      'trình in kết quả rồi thoát bình thường.</p>' +
      '<p>Lần thứ hai, <b>có</b> <code>SA_RESTART</code>: sau khi handler chạy xong, nhân âm ' +
      'thầm gọi lại <code>read</code> từ đầu. Không ai ghi vào ống nên nó chặn mãi mãi, và ' +
      '<code>timeout 5</code> phải giết nó — <code>124</code> là mã thoát riêng của lệnh ' +
      '<code>timeout</code> nghĩa là "hết giờ". Chương trình treo ở đây <b>là kết quả đúng</b>, ' +
      'không phải lỗi.</p>' +
      '<p>Rút ra hai điều. Một: nếu bạn <b>không</b> muốn nghĩ tới <code>EINTR</code>, hãy đặt ' +
      '<code>SA_RESTART</code>. Hai: khi bạn <b>cần</b> vòng lặp thoát ngay lúc có tín hiệu ' +
      '(chính là tắt êm), hãy bỏ cờ đó đi và xử lý <code>EINTR</code> tường minh. Bài 24 sẽ gặp ' +
      'lại đúng vấn đề này với <code>epoll_wait</code>.</p>' },

    { t: 'cal', kind: 'warn', title: 'SA_RESTART không cứu được mọi thứ', x:
      '<p>Một số lời gọi <b>không bao giờ</b> được khởi động lại, kể cả khi có ' +
      '<code>SA_RESTART</code>: <code>sleep</code>, <code>nanosleep</code>, <code>poll</code>, ' +
      '<code>select</code>, <code>epoll_wait</code>. Lý do hợp lý — chúng mang theo một mốc thời ' +
      'gian, khởi động lại từ đầu sẽ nhân đôi thời gian chờ.</p>' +
      '<p>Bạn sẽ thấy điều này trong <code>strace</code> ở phần thực hành: dù cờ ' +
      '<code>SA_RESTART</code> có mặt rành rành, dòng <code>clock_nanosleep</code> vẫn kết thúc ' +
      'bằng <code>ERESTART_RESTARTBLOCK (Interrupted by signal)</code> và vòng lặp thoát ngay. ' +
      'Đó chính là thứ làm cho daemon tắt trong <b>vài mili giây</b> thay vì phải chờ hết một ' +
      'giây ngủ.</p>' },

    /* ══════════════════════════════════════════════
       4. AN TOÀN TÍN HIỆU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Quy tắc vàng: trong handler được làm gì và không được làm gì' },

    { t: 'p', x:
      'Đây là phần mà đa số lập trình viên làm sai, và làm sai theo kiểu tệ nhất: <b>chương ' +
      'trình vẫn chạy đúng suốt quá trình phát triển</b>, rồi hỏng ngẫu nhiên sau vài tuần ' +
      'ngoài hiện trường. Nguyên nhân nằm ở một câu hỏi đơn giản: bộ xử lý tín hiệu chen ngang ' +
      'chương trình chính <b>vào bất kỳ dòng nào</b>, kể cả khi chương trình chính đang ở giữa ' +
      'một hàm thư viện chưa làm xong việc.' },

    { t: 'p', x:
      'Một hàm gọi được an toàn từ trong handler gọi là <b>async-signal-safe</b>. POSIX liệt kê ' +
      'danh sách này và Linux ghi lại trong <code>man 7 signal-safety</code>:' },

    { t: 'code', where: 'wsl', code:
      'man 7 signal-safety | grep -c "printf(3)"\n' +
      'man 7 signal-safety | grep -c "malloc(3)"\n' +
      'man 7 signal-safety | grep -oE "[a-z_]+\\([0-9]\\)" | sort -u | wc -l' },

    { t: 'code', where: 'out', nocopy: true, code:
      '3\n' +
      '0\n' +
      '199',
      notes: ['<code>malloc(3)</code> xuất hiện <b>0</b> lần — không hề có trong tài liệu này. ' +
        '<code>printf(3)</code> xuất hiện 3 lần, nhưng cả ba đều nằm trong đoạn giải thích ' +
        '<i>vì sao nó không an toàn</i>, không phải trong danh sách 199 hàm được phép.'] },

    { t: 'p', x:
      'Chính trang man đó viết nguyên văn (tạm dịch): <i>"Giả sử chương trình chính đang ở giữa ' +
      'một lời gọi <code>printf(3)</code>, khi đó đệm và các biến đi kèm mới được cập nhật một ' +
      'phần. Nếu ngay lúc ấy chương trình bị một bộ xử lý tín hiệu chen ngang mà bộ xử lý đó ' +
      '<b>cũng</b> gọi <code>printf(3)</code>, thì lời gọi thứ hai sẽ thao tác trên dữ liệu ' +
      'không nhất quán, với kết quả không đoán trước được."</i>' },

    { t: 'p', x:
      'Nghe trừu tượng. Hãy dựng lại đúng cơ chế đó bằng một hàm <b>của chính bạn</b>, để nhìn ' +
      'thấy hậu quả một cách chắc chắn thay vì trông chờ vào may rủi:' },

    { t: 'code', where: 'file', name: 'reentrancy_bug.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '\n' +
      '/* Uses a STATIC buffer -> not reentrant */\n' +
      'static char *number_to_string(int n)\n' +
      '{\n' +
      '    static char buf[32];            /* shared across EVERY call */\n' +
      '    snprintf(buf, sizeof buf, "number is %d", n);\n' +
      '    sleep(1);                       /* stretch the interrupted window so it is easy to see */\n' +
      '    return buf;\n' +
      '}\n' +
      '\n' +
      'static void handle_sigusr1(int s)\n' +
      '{\n' +
      '    (void)s;\n' +
      '    number_to_string(999);          /* handler overwrites that very buffer */\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct sigaction sa;\n' +
      '    memset(&sa, 0, sizeof sa);\n' +
      '    sa.sa_handler = handle_sigusr1;\n' +
      '    sa.sa_flags = SA_RESTART;\n' +
      '    sigaction(SIGUSR1, &sa, NULL);\n' +
      '\n' +
      '    printf("pid=%d\\n", getpid());\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    char *result = number_to_string(42);   /* signal will arrive while we sleep 1s */\n' +
      '    printf("main expected \\"number is 42\\", actually got: \\"%s\\"\\n", result);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'pid=9433\n' +
      'main expected "number is 42", actually got: "number is 999"' },

    { t: 'cal', kind: 'danger', title: 'Không có lỗi biên dịch, không có cảnh báo, không có crash — chỉ có dữ liệu sai', x:
      '<p>Chương trình chính hỏi số 42 và nhận về 999. Không một công cụ nào báo động: ' +
      '<code>gcc -Wall -Wextra</code> im lặng, chương trình thoát với mã 0, log trông bình ' +
      'thường. Chỉ có <b>giá trị là sai</b>.</p>' +
      '<p>Cơ chế: <code>number_to_string</code> dùng một mảng <code>static</code> — nghĩa là mọi lời ' +
      'gọi dùng chung một vùng nhớ. Handler chen vào giữa lúc <code>main</code> đã ghi xong ' +
      '"so la 42" nhưng chưa kịp đọc ra, và ghi đè lên đó. Đây gọi là hàm <b>không tái nhập</b> ' +
      '(non-reentrant).</p>' +
      '<p>Bây giờ hãy nhớ lại: <code>printf</code> dùng đệm tĩnh. <code>malloc</code> dùng cấu ' +
      'trúc heap dùng chung. <code>strtok</code> dùng con trỏ tĩnh. <code>localtime</code> trả ' +
      'về con trỏ tới một <code>struct tm</code> tĩnh. Tất cả đều có đúng cái bệnh vừa rồi, chỉ ' +
      'khác là bạn không nhìn thấy mã nguồn của chúng.</p>' },

    { t: 'cal', kind: 'warn', title: 'Đo thật: 4000 tín hiệu vẫn không làm treo — và đó mới là điều đáng sợ', x:
      '<p>Trong lúc soạn bài này, một chương trình gọi <code>malloc()</code> trong handler đã ' +
      'bị bắn <b>4000</b> tín hiệu <code>SIGUSR1</code> liên tiếp trong khi vòng lặp chính cũng ' +
      'đang <code>malloc</code> hết tốc lực. Nó <b>không</b> treo, <b>không</b> sập, ' +
      '<code>/proc/&lt;pid&gt;/status</code> vẫn báo <code>State: R (running)</code>.</p>' +
      '<p>Kết luận sai lầm sẽ là "vậy chắc cũng không sao". Kết luận đúng: đây là một ' +
      '<b>cuộc đua</b>, và cửa sổ hỏng chỉ rộng vài chục nano giây. Xác suất trúng rất thấp ' +
      'trên một máy nhàn rỗi — nhưng thiết bị của bạn chạy <b>liên tục nhiều năm</b>, hàng triệu ' +
      'lần một ngày. Một sự kiện xác suất 10⁻⁸ sẽ xảy ra, và nó sẽ xảy ra ở nhà khách hàng, ' +
      'không phải trên bàn bạn.</p>' +
      '<p>Đó là lý do quy tắc này không phải lời khuyên phong cách mà là ràng buộc kỹ thuật: ' +
      'không thể test ra được, nên phải viết đúng ngay từ đầu.</p>' },

    { t: 'h3', x: 'Ba việc handler được phép làm' },

    { t: 'list', ordered: true, items: [
      '<b>Đặt một cờ</b> kiểu <code>volatile sig_atomic_t</code> rồi trả về ngay. Đây là cách ' +
      'dùng đúng trong hơn 90% trường hợp — chính là mẫu tắt êm ở cuối bài.',
      '<b>Gọi <code>write()</code></b> (syscall thuần, có trong danh sách 199 hàm an toàn) để ' +
      'ghi một chuỗi cố định ra <code>stderr</code>. Đó là lý do <code>catch_sigint.c</code> ở trên dùng ' +
      '<code>write</code> chứ không <code>printf</code>.',
      '<b>Gọi <code>waitpid(..., WNOHANG)</code></b> trong vòng lặp để gặt con — cũng an toàn, ' +
      'và là cách chuẩn để dọn zombie.'
    ]},

    { t: 'cmdx', cmd: 'static volatile sig_atomic_t shutdown_requested = 0;',
      title: 'Vì sao khai báo cờ phải đủ cả ba từ khoá',
      rows: [
        ['<code>static</code>', 'Biến toàn cục nội bộ tệp — handler và <code>main</code> phải nhìn chung một ô nhớ', 'Không thể truyền tham số cho handler; đây là kênh liên lạc duy nhất'],
        ['<code>volatile</code>', 'Cấm trình biên dịch tối ưu hoá phép đọc', '<b>Bắt buộc.</b> Không có nó, <code>-O2</code> thấy vòng lặp không sửa biến nên nạp giá trị vào thanh ghi một lần — vòng lặp thành vô hạn thật sự'],
        ['<code>sig_atomic_t</code>', 'Kiểu số nguyên mà chuẩn C bảo đảm đọc/ghi trong <b>một</b> lệnh máy', 'Với <code>int64</code> trên máy 32 bit, handler có thể chen vào giữa hai nửa phép ghi và bạn đọc được nửa giá trị'],
        ['<code>= 0</code>', 'Khởi tạo tường minh', 'Rẻ, và tránh phụ thuộc vào giả định về vùng <code>.bss</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Handler phải giữ nguyên errno', x:
      '<p>Một cái bẫy tinh vi: handler gọi <code>write</code> hoặc <code>waitpid</code>, hai ' +
      'hàm này có thể ghi đè <code>errno</code>. Nhưng chương trình chính có thể vừa bị ngắt ' +
      '<i>ngay sau</i> một syscall thất bại và <i>ngay trước</i> dòng <code>perror()</code> — ' +
      'thế là nó in ra thông báo lỗi hoàn toàn sai.</p>' +
      '<p>Cách chữa gọn trong hai dòng: mở đầu handler bằng ' +
      '<code>int saved_errno = errno;</code> và kết thúc bằng <code>errno = saved_errno;</code>. Bạn sẽ ' +
      'thấy đúng cặp dòng này trong <code>reap_zombies.c</code> ở phần sau.</p>' },

    /* ══════════════════════════════════════════════
       5. SIGPROCMASK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'sigprocmask — chặn tín hiệu để bảo vệ vùng tới hạn' },

    { t: 'p', x:
      'Đôi khi bạn có một đoạn mã <b>không được phép</b> bị chen ngang: đang cập nhật một cấu ' +
      'trúc dữ liệu, đang ghi một bản ghi phải toàn vẹn. Giải pháp không phải là bỏ tín hiệu ' +
      'đi, mà là <b>hoãn</b> nó lại. Tín hiệu bị chặn không mất — nó nằm chờ ở trạng thái ' +
      '<i>đang treo</i> và được chuyển phát ngay khi bạn bỏ chặn.' },

    { t: 'code', where: 'file', name: 'block_signal.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '\n' +
      'static volatile sig_atomic_t flag = 0;\n' +
      'static void handle_usr1(int s) { (void)s; flag = 1; }\n' +
      '\n' +
      'static void print_pending(const char *label)\n' +
      '{\n' +
      '    sigset_t pending;\n' +
      '    sigpending(&pending);\n' +
      '    printf("%-22s SIGUSR1 pending? %s\\n",\n' +
      '           label, sigismember(&pending, SIGUSR1) ? "YES" : "no");\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct sigaction sa;\n' +
      '    memset(&sa, 0, sizeof sa);\n' +
      '    sa.sa_handler = handle_usr1;\n' +
      '    sigaction(SIGUSR1, &sa, NULL);\n' +
      '\n' +
      '    sigset_t blocked, saved;\n' +
      '    sigemptyset(&blocked);\n' +
      '    sigaddset(&blocked, SIGUSR1);\n' +
      '    sigprocmask(SIG_BLOCK, &blocked, &saved);        /* ENTER critical section */\n' +
      '\n' +
      '    printf("blocked SIGUSR1, self-raising it once\\n");\n' +
      '    raise(SIGUSR1);\n' +
      '    print_pending("inside critical section:");\n' +
      '    printf("flag = %d  (handler has NOT run yet)\\n", flag);\n' +
      '\n' +
      '    sigprocmask(SIG_SETMASK, &saved, NULL);          /* LEAVE critical section */\n' +
      '    print_pending("after unblocking:");\n' +
      '    printf("flag = %d  (handler DID run right when unblocked)\\n", flag);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'blocked SIGUSR1, self-raising it once\n' +
      'inside critical section: SIGUSR1 pending? YES\n' +
      'flag = 0  (handler has NOT run yet)\n' +
      'after unblocking:      SIGUSR1 pending? no\n' +
      'flag = 1  (handler DID run right when unblocked)' },

    { t: 'cmdx', cmd: 'sigprocmask(SIG_BLOCK, &blocked, &saved);',
      title: 'Bộ công cụ thao tác trên sigset_t',
      rows: [
        ['<code>sigemptyset(&amp;blocked)</code>', 'Tập rỗng', 'Luôn khởi tạo bằng hàm, đừng <code>memset</code> — <code>sigset_t</code> là kiểu mờ'],
        ['<code>sigfillset(&amp;blocked)</code>', 'Tập chứa tất cả tín hiệu', 'Dùng khi muốn chặn sạch tạm thời'],
        ['<code>sigaddset(&amp;blocked, SIGUSR1)</code>', 'Thêm một tín hiệu vào tập', 'Có <code>sigdelset</code> để bỏ ra'],
        ['<code>SIG_BLOCK</code>', 'Thêm tập này vào mặt nạ hiện có', 'Ba lựa chọn: <code>SIG_BLOCK</code>, <code>SIG_UNBLOCK</code>, <code>SIG_SETMASK</code>'],
        ['<code>SIG_SETMASK</code> + <code>&amp;saved</code>', 'Đặt mặt nạ <b>bằng đúng</b> giá trị đã lưu', 'Cách khôi phục đúng — an toàn hơn <code>SIG_UNBLOCK</code> vì không vô tình mở một tín hiệu vốn đã bị chặn từ trước'],
        ['<code>sigpending(&amp;pending)</code>', 'Hỏi nhân xem tín hiệu nào đang chờ', 'Công cụ gỡ lỗi rất hữu ích']
      ]},

    { t: 'cal', kind: 'why', title: 'Chặn khác hẳn bỏ qua — nhầm hai khái niệm này là mất tín hiệu thật', x:
      '<p><b>Chặn</b> (<code>sigprocmask</code>) là <i>hoãn</i>: tín hiệu vẫn tồn tại, nằm chờ, ' +
      'và được chuyển phát đầy đủ khi bạn mở. Kết quả thực nghiệm ở trên chứng minh rõ: ' +
      '<code>flag</code> chuyển từ 0 sang 1 <b>ngay tại dòng bỏ chặn</b>, không cần gửi lại.</p>' +
      '<p><b>Bỏ qua</b> (<code>SIG_IGN</code>) là <i>vứt</i>: nhân xoá tín hiệu khỏi đời, không ' +
      'bao giờ lấy lại được.</p>' +
      '<p>Một hạn chế cần biết: tín hiệu chuẩn <b>không xếp hàng</b>. Nếu 10 tín hiệu ' +
      '<code>SIGUSR1</code> tới trong lúc bị chặn thì "đang treo" chỉ ghi được <b>một</b> bit — ' +
      'bạn nhận đúng một lần chuyển phát. Đây chính là lý do handler <code>SIGCHLD</code> ở phần ' +
      'sau bắt buộc phải dùng <b>vòng lặp</b> <code>while (waitpid(...) &gt; 0)</code>: một tín ' +
      'hiệu duy nhất có thể đại diện cho năm đứa con đã chết.</p>' },

    /* ══════════════════════════════════════════════
       6. SIGNALFD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'signalfd — biến tín hiệu thành một file descriptor' },

    { t: 'p', x:
      'Mọi rắc rối ở trên đều bắt nguồn từ một điều: handler chạy <b>bất đồng bộ</b>, ngoài ' +
      'luồng điều khiển bình thường. Linux cho một lối thoát: <code>signalfd()</code> trả về ' +
      'một file descriptor mà bạn <code>read()</code> để <b>nhận</b> tín hiệu. Tín hiệu trở ' +
      'thành dữ liệu, đọc ở đúng chỗ bạn muốn, trong luồng chính, nơi mọi hàm đều gọi được ' +
      'thoải mái.' },

    { t: 'code', where: 'file', name: 'signalfd_demo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/signalfd.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    sigset_t mask;\n' +
      '    sigemptyset(&mask);\n' +
      '    sigaddset(&mask, SIGTERM);\n' +
      '    sigaddset(&mask, SIGUSR1);\n' +
      '\n' +
      '    /* MANDATORY: block them first, otherwise the default action still runs */\n' +
      '    if (sigprocmask(SIG_BLOCK, &mask, NULL) < 0) { perror("sigprocmask"); return 1; }\n' +
      '\n' +
      '    int fd = signalfd(-1, &mask, 0);\n' +
      '    if (fd < 0) { perror("signalfd"); return 1; }\n' +
      '\n' +
      '    printf("pid=%d  signalfd = %d\\n", getpid(), fd);\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    for (;;) {\n' +
      '        struct signalfd_siginfo info;\n' +
      '        ssize_t n = read(fd, &info, sizeof info);\n' +
      '        if (n != sizeof info) { perror("read"); return 1; }\n' +
      '\n' +
      '        printf("read signal %d (%s) from pid %u\\n",\n' +
      '               info.ssi_signo, strsignal(info.ssi_signo), info.ssi_pid);\n' +
      '        fflush(stdout);\n' +
      '\n' +
      '        if (info.ssi_signo == SIGTERM) {\n' +
      '            printf("SIGTERM -> cleaning up then exiting normally\\n");\n' +
      '            close(fd);\n' +
      '            return 0;\n' +
      '        }\n' +
      '    }\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'pid=428  signalfd = 3\n' +
      'read signal 10 (User defined signal 1) from pid 317\n' +
      'read signal 15 (Terminated) from pid 317\n' +
      'SIGTERM -> cleaning up then exiting normally' },

    { t: 'cal', kind: 'info', title: 'Hai chi tiết đắt giá trong kết quả này', x:
      '<p><b><code>signalfd = 3</code></b> — đúng như Bài 19 và Bài 20 đã dạy: số nhỏ nhất còn ' +
      'trống sau 0, 1, 2. Tín hiệu giờ là một fd bình thường, nghĩa là nó <b>ghép được vào ' +
      '<code>poll</code>/<code>epoll</code></b> cùng với socket và cảm biến. Đây là lý do thật ' +
      'sự khiến người ta dùng <code>signalfd</code>, và Bài 24 sẽ khai thác đúng điểm này.</p>' +
      '<p><b><code>from pid 317</code></b> — bạn biết <i>ai</i> đã gửi tín hiệu. Với handler kiểu ' +
      'cũ, thông tin này chỉ lấy được qua <code>SA_SIGINFO</code> phức tạp hơn nhiều. ' +
      '<code>struct signalfd_siginfo</code> còn có <code>ssi_uid</code>, <code>ssi_status</code>, ' +
      '<code>ssi_code</code> — rất tiện khi cần biết ai đang cố dừng dịch vụ của bạn.</p>' },

    { t: 'cal', kind: 'danger', title: 'Quên sigprocmask là signalfd vô dụng', x:
      '<p>Dòng <code>sigprocmask(SIG_BLOCK, &amp;mask, NULL)</code> <b>không phải tuỳ chọn</b>. ' +
      '<code>signalfd</code> không thay đổi bố trí của tín hiệu — nó chỉ mở thêm một đường để ' +
      '<i>đọc</i> chúng. Nếu bạn không chặn, hành vi mặc định vẫn thi hành: ' +
      '<code>SIGTERM</code> giết chương trình <b>trước khi</b> bạn kịp <code>read</code> một ' +
      'byte nào.</p>' +
      '<p>Triệu chứng đặc trưng khi quên: chương trình chết ngay mà không in ra dòng nào, ' +
      'mã thoát <b>143</b>. Trông y hệt như bạn chưa hề viết dòng <code>signalfd</code> nào.</p>' },

    { t: 'table',
      head: ['Tiêu chí', 'Handler cổ điển', '<code>signalfd</code>'],
      rows: [
        ['Gọi được hàm gì', 'Chỉ 199 hàm async-signal-safe', '<b>Mọi hàm</b> — bạn đang ở luồng chính'],
        ['Ghép với <code>poll</code>/<code>epoll</code>', 'Phải qua mẹo self-pipe', '<b>Trực tiếp</b>, nó vốn là fd'],
        ['Biết ai gửi', 'Cần <code>SA_SIGINFO</code>', 'Có sẵn trong <code>ssi_pid</code>'],
        ['Điểm xử lý', 'Bất kỳ dòng nào — khó suy luận', 'Đúng dòng <code>read</code> bạn viết'],
        ['Tính khả chuyển', 'POSIX, chạy mọi nơi', '<b>Riêng Linux</b> — không có trên macOS/BSD'],
        ['<code>SIGSEGV</code>, <code>SIGFPE</code>', 'Bắt được', '<b>Không dùng được</b> — lỗi đồng bộ phải xử lý ngay tại chỗ']
      ]},

    /* ══════════════════════════════════════════════
       7. SIGCHLD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'SIGCHLD — lời giải cho bài toán zombie ở Bài 20' },

    { t: 'p', x:
      'Bài 20 để lại một vấn đề chưa chữa: daemon <code>fork</code> ra tiến trình con theo chu ' +
      'kỳ nhưng không thể ngồi chặn ở <code>wait()</code>, vì nó còn phải làm việc khác. Kết ' +
      'quả là zombie tích tụ tới khi cạn bảng PID. <code>SIGCHLD</code> là mảnh ghép còn ' +
      'thiếu: nhân <b>chủ động báo</b> cho bạn mỗi khi có một đứa con chết.' },

    { t: 'code', where: 'file', name: 'reap_zombies.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <signal.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <errno.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'static volatile sig_atomic_t reaped = 0;\n' +
      '\n' +
      'static void reap(int s)\n' +
      '{\n' +
      '    (void)s;\n' +
      '    int saved_errno = errno;             /* handler MUST preserve errno */\n' +
      '    while (waitpid(-1, NULL, WNOHANG) > 0)\n' +
      '        reaped++;                        /* one SIGCHLD may cover MULTIPLE children */\n' +
      '    errno = saved_errno;\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct sigaction sa;\n' +
      '    memset(&sa, 0, sizeof sa);\n' +
      '    sa.sa_handler = reap;\n' +
      '    sigemptyset(&sa.sa_mask);\n' +
      '    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;\n' +
      '    sigaction(SIGCHLD, &sa, NULL);\n' +
      '\n' +
      '    for (int i = 0; i < 5; i++)\n' +
      '        if (fork() == 0) _exit(0);       /* 5 children that die immediately */\n' +
      '\n' +
      '    printf("parent pid=%d, spawned 5 children, NOT calling wait in main\\n", getpid());\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    sleep(4);\n' +
      '    printf("handler reaped %d children\\n", reaped);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'cmdx', cmd: 'while (waitpid(-1, NULL, WNOHANG) > 0) reaped++;',
      title: 'Ba chi tiết bắt buộc trong handler SIGCHLD',
      rows: [
        ['<code>while</code> chứ không <code>if</code>', 'Tín hiệu chuẩn không xếp hàng — 5 con chết gần nhau có thể chỉ sinh <b>1</b> lần chuyển phát', 'Dùng <code>if</code> là gặt được 1, để lại 4 zombie. Lỗi kinh điển'],
        ['<code>waitpid(-1, ...)</code>', 'Bất kỳ đứa con nào', 'Handler không biết đứa nào vừa chết'],
        ['<code>WNOHANG</code>', 'Không chặn: hết con để gặt thì trả về <b>0</b> và thoát vòng lặp', '<b>Sống còn.</b> Không có nó, handler sẽ ngồi chờ đứa con tiếp theo — treo cả chương trình từ trong một bộ xử lý tín hiệu'],
        ['<code>SA_NOCLDSTOP</code>', 'Chỉ báo khi con <b>chết</b>, không báo khi con bị dừng/tiếp tục', 'Tránh handler chạy vô ích mỗi lần con nhận <code>SIGSTOP</code>/<code>SIGCONT</code>'],
        ['<code>SA_RESTART</code>', 'Khởi động lại syscall bị ngắt', 'Con chết là chuyện thường xuyên; không có cờ này thì mọi <code>read</code> trong chương trình đều phải xử lý <code>EINTR</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Cách lười biếng: signal(SIGCHLD, SIG_IGN)', x:
      '<p>Nếu bạn <b>không quan tâm</b> tới mã thoát của con, có một lối tắt hợp chuẩn: đặt bố ' +
      'trí của <code>SIGCHLD</code> thành <code>SIG_IGN</code> tường minh. Khi đó nhân dọn xác ' +
      'con ngay lập tức, không bao giờ sinh zombie.</p>' +
      '<p>Lưu ý điều tinh tế: <code>SIGCHLD</code> vốn <b>đã</b> có mặc định là <code>Ign</code> ' +
      '— nhưng "mặc định là bỏ qua" và "bạn <i>yêu cầu</i> bỏ qua" là hai trạng thái khác nhau ' +
      'với nhân, và chỉ trạng thái thứ hai mới kích hoạt việc tự dọn xác. Đây là ngoại lệ duy ' +
      'nhất kiểu này trong toàn bộ hệ thống tín hiệu.</p>' +
      '<p>Đổi lại, bạn mất khả năng biết con thoát với mã bao nhiêu — <code>wait()</code> sau đó ' +
      'sẽ trả <code>-1</code>/<code>ECHILD</code>. Với một daemon chỉ cần "chạy rồi quên" thì ' +
      'đây là lựa chọn tốt và rẻ nhất.</p>' },

    /* ══════════════════════════════════════════════
       8. TẮT ÊM
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tắt êm — bản hợp đồng giữa SIGTERM và SIGKILL' },

    { t: 'p', x:
      'Đây là phần quan trọng nhất của bài với người làm nhúng. Mọi trình quản lý dịch vụ trên ' +
      'đời — <code>systemd</code>, SysV init, Docker, Kubernetes — đều dừng tiến trình theo ' +
      'đúng một kịch bản hai bước, và bạn cần viết chương trình khớp với kịch bản đó.' },

    { t: 'fig',
      cap: 'Hợp đồng dừng dịch vụ: SIGTERM là lời đề nghị có thời hạn, SIGKILL là cưỡng chế. Toàn bộ khoảng thời gian ở giữa là tất cả những gì chương trình của bạn có để cứu dữ liệu.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Trình tự SIGTERM rồi SIGKILL khi dừng một dịch vụ">' +
        '<line class="d-line" x1="40" y1="60" x2="690" y2="60"/>' +
        '<path class="d-arrow" d="M698 60 l-10 -6 v12 z"/>' +
        '<text class="d-ts" x="620" y="48">thời gian</text>' +

        '<line class="d-line" x1="120" y1="40" x2="120" y2="80"/>' +
        '<rect class="d-box-a" x="60" y="86" width="150" height="46" rx="6"/>' +
        '<text class="d-t" x="78" y="106">systemctl stop</text>' +
        '<text class="d-ts" x="78" y="124">gửi SIGTERM</text>' +

        '<line class="d-line" x1="500" y1="40" x2="500" y2="80"/>' +
        '<rect class="d-box-w" x="430" y="86" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="448" y="106">hết kiên nhẫn</text>' +
        '<text class="d-ts" x="448" y="124">gửi SIGKILL — không bàn</text>' +

        '<rect class="d-box-g" x="120" y="150" width="380" height="44" rx="6"/>' +
        '<text class="d-t" x="140" y="170">CỬA SỔ DỌN DẸP — mặc định 1 phút 30 giây</text>' +
        '<text class="d-ts" x="140" y="188">xả đệm · đóng file · nhả GPIO · ghi bản ghi cuối · thoát 0</text>' +

        '<rect class="d-box" x="516" y="150" width="188" height="44" rx="6"/>' +
        '<text class="d-t" x="534" y="170">KHÔNG CÒN GÌ CẢ</text>' +
        '<text class="d-ts" x="534" y="188">mã thoát 137, đệm mất trắng</text>' +

        '<text class="d-ts" x="40" y="228">Thoát sớm hơn hạn chót là được thưởng: máy tắt nhanh hơn, cập nhật firmware trôi chảy hơn.</text>' +
        '</svg>' },

    { t: 'code', where: 'wsl', code: 'systemctl show -p DefaultTimeoutStopUSec' },

    { t: 'code', where: 'out', nocopy: true, code:
      'DefaultTimeoutStopUSec=1min 30s' },

    { t: 'cal', kind: 'why', title: 'Con số 1 phút 30 giây quyết định thiết kế vòng lặp chính của bạn', x:
      '<p>Đây là giá trị thật trên máy bạn, và cũng là mặc định của systemd trên hầu hết bản ' +
      'phân phối. Nó nói rằng bạn có tối đa 90 giây kể từ lúc nhận <code>SIGTERM</code> để dọn ' +
      'dẹp, sau đó bị <code>SIGKILL</code> không cần biết lý do.</p>' +
      '<p>Nghe thì rộng rãi, nhưng hãy tính lại theo góc nhìn người dùng: <b>90 giây × 12 dịch ' +
      'vụ = 18 phút tắt máy</b> trong trường hợp xấu nhất. Không ai chấp nhận một thiết bị mất ' +
      'ngần ấy thời gian để tắt. Mục tiêu thực tế của một dịch vụ được viết tốt là dừng trong ' +
      '<b>dưới một giây</b>.</p>' +
      '<p>Điều đó ràng buộc trực tiếp cách viết vòng lặp chính: đừng bao giờ ' +
      '<code>sleep(60)</code>. Hãy ngủ từng giây một và kiểm tra cờ sau mỗi nhịp, hoặc dùng ' +
      '<code>poll</code> với thời hạn ngắn. Bạn sẽ đo được ở phần thực hành rằng ' +
      '<code>sleep()</code> <b>không</b> được khởi động lại sau tín hiệu, nên vòng lặp thoát ' +
      'gần như tức thì.</p>' },

    { t: 'list', ordered: true, items: [
      '<b>Handler chỉ đặt cờ.</b> Không đóng file, không ghi log, không <code>exit()</code> ' +
      'trong handler — tất cả những việc đó đều không an toàn tín hiệu.',
      '<b>Vòng lặp chính kiểm tra cờ</b> sau mỗi nhịp và thoát khỏi vòng lặp một cách bình thường.',
      '<b>Dọn dẹp nằm sau vòng lặp</b>, trong luồng chính, nơi mọi hàm đều gọi được: xả đệm, ' +
      '<code>fclose</code>, nhả GPIO, ghi trạng thái cuối.',
      '<b>Thoát với mã 0.</b> systemd hiểu đó là dừng theo yêu cầu, không phải sự cố, nên không ' +
      'ghi dịch vụ vào trạng thái <code>failed</code>.'
    ]},

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ bắt tín hiệu tới một daemon tắt được êm' },

    { t: 'p', x:
      'Năm bước. Bước 1–2 chứng minh các giới hạn của hệ thống, bước 3–4 dựng công cụ, bước 5 ' +
      'là bài kiểm tra thật: cùng một chương trình, hai cách giết, hai file log khác nhau.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai21 && cd ~/embedded/bai21' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Chứng minh SIGKILL và SIGSTOP thật sự không bắt được',
        blocks: [
          { t: 'p', x:
            'Đừng tin vì tài liệu nói vậy. Hãy để <code>sigaction</code> tự từ chối bạn:' },

          { t: 'code', where: 'file', name: 'uncatchable_signals.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <signal.h>\n' +
            '#include <string.h>\n' +
            '#include <errno.h>\n' +
            '\n' +
            'static void handle_noop(int s) { (void)s; }\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    struct sigaction sa;\n' +
            '    memset(&sa, 0, sizeof sa);\n' +
            '    sa.sa_handler = handle_noop;\n' +
            '\n' +
            '    int signals[] = { SIGINT, SIGTERM, SIGUSR1, SIGKILL, SIGSTOP };\n' +
            '    for (unsigned i = 0; i < sizeof signals / sizeof signals[0]; i++) {\n' +
            '        errno = 0;\n' +
            '        if (sigaction(signals[i], &sa, NULL) < 0)\n' +
            '            printf("%-8s (%2d): FAILED - %s\\n",\n' +
            '                   strsignal(signals[i]), signals[i], strerror(errno));\n' +
            '        else\n' +
            '            printf("%-8s (%2d): registered OK\\n", strsignal(signals[i]), signals[i]);\n' +
            '    }\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o uncatchable_signals uncatchable_signals.c && ./uncatchable_signals' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Interrupt ( 2): registered OK\n' +
            'Terminated (15): registered OK\n' +
            'User defined signal 1 (10): registered OK\n' +
            'Killed   ( 9): FAILED - Invalid argument\n' +
            'Stopped (signal) (19): FAILED - Invalid argument' },

          { t: 'cal', kind: 'info', title: 'EINVAL ở đây không phải lỗi lập trình', x:
            '<p><code>Invalid argument</code> (<code>EINVAL</code>) là cách nhân nói "tín hiệu ' +
            'này không thể có bố trí riêng". Nó do chính nhân chặn, không phải do bạn viết sai ' +
            'cú pháp — mã đăng ký <code>SIGKILL</code> giống hệt mã đăng ký ' +
            '<code>SIGTERM</code> ngay bên trên và cái kia thành công.</p>' +
            '<p>Để ý cột căn lề bị lệch ở hai dòng dài: <code>strsignal(9)</code> trả về chuỗi ' +
            '<code>"Killed"</code>, còn <code>strsignal(10)</code> trả về ' +
            '<code>"User defined signal 1"</code> — dài hơn 8 ký tự nên <code>%-8s</code> không ' +
            'cắt bớt được. Đây là hành vi đúng của <code>printf</code>: độ rộng là mức tối ' +
            'thiểu, không phải tối đa.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Tự tạo ra một lỗi tái nhập, và nhìn nó cho ra dữ liệu sai',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>reentrancy_bug.c</code> ở phần lý thuyết. Bước này quan trọng vì nó biến một ' +
            'lời khuyên trừu tượng ("đừng gọi <code>printf</code> trong handler") thành một con ' +
            'số sai bạn tự nhìn thấy.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o reentrancy_bug reentrancy_bug.c\n' +
            './reentrancy_bug &\n' +
            'sleep 0.4\n' +
            'kill -USR1 $!\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=9433\n' +
            'main expected "number is 42", actually got: "number is 999"',
            notes: ['<code>pid=9433</code> chỉ đúng cho lần chạy này trên máy đang viết bài — ' +
              'PID đổi mỗi lần chạy, trên máy bạn sẽ khác.'] },

          { t: 'p', x:
            'Bây giờ sửa lại cho đúng. Chỉ cần <b>một</b> thay đổi: handler không được đụng vào ' +
            'hàm không tái nhập nữa, nó chỉ đặt cờ.' },

          { t: 'code', where: 'wsl', code:
            'sed \'s|    number_to_string(999);.*|    stop = 1;|; s|^static void handle_sigusr1|static volatile sig_atomic_t stop = 0;\\nstatic void handle_sigusr1|\' reentrancy_bug.c > reentrancy_fixed.c\n' +
            'gcc -Wall -Wextra -o reentrancy_fixed reentrancy_fixed.c\n' +
            './reentrancy_fixed &\n' +
            'sleep 0.4\n' +
            'kill -USR1 $!\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=9482\n' +
            'main expected "number is 42", actually got: "number is 42"',
            notes: ['Nếu <code>sed</code> khiến bạn khó chịu, cứ mở <code>reentrancy_bug.c</code> bằng ' +
              '<code>nano</code> và sửa tay — thay dòng <code>number_to_string(999);</code> trong ' +
              'handler bằng <code>stop = 1;</code>, và khai báo <code>static volatile ' +
              'sig_atomic_t stop = 0;</code> ở phía trên.'] },

          { t: 'cal', kind: 'why', title: 'Một dòng, khác biệt giữa đúng và sai', x:
            '<p>So hai lần chạy: bản gốc in ra <b>"number is 999"</b> dù <code>main</code> gọi ' +
            '<code>number_to_string(42)</code>; bản sửa in ra đúng <b>"number is 42"</b> — con ' +
            'số bạn thật sự truyền vào. Chương trình vẫn nhận tín hiệu, handler vẫn chạy, nhưng ' +
            'giờ nó không đụng vào bộ đệm tĩnh nữa nên <code>main</code> đọc được đúng giá trị ' +
            'của mình.</p>' +
            '<p>Hãy khắc sâu hình mẫu này: <b>handler đặt cờ, luồng chính làm việc</b>. Nó giải ' +
            'quyết trọn vẹn cả ba vấn đề cùng lúc — an toàn tín hiệu, tái nhập, và tính suy luận ' +
            'được của mã. Gần như mọi bộ xử lý tín hiệu bạn viết trong đời nên có đúng một dòng ' +
            'thân hàm.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Dọn zombie tự động bằng SIGCHLD',
        blocks: [
          { t: 'p', x:
            'Bước này chữa dứt điểm lỗi rò rỉ PID của Bài 20. Chạy hai chương trình gần như ' +
            'giống hệt nhau, khác đúng một handler, rồi đếm zombie.' },

          { t: 'code', where: 'file', name: 'zombies_unreaped.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    for (int i = 0; i < 5; i++)\n' +
            '        if (fork() == 0) _exit(0);\n' +
            '    printf("parent pid=%d, spawned 5 children, not catching SIGCHLD\\n", getpid());\n' +
            '    fflush(stdout);\n' +
            '    sleep(4);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o zombies_unreaped zombies_unreaped.c\n' +
            './zombies_unreaped &\n' +
            'sleep 1\n' +
            'ps -o pid,ppid,stat,comm --ppid $!\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            'parent pid=9826, spawned 5 children, not catching SIGCHLD\n' +
            '    PID    PPID STAT COMMAND\n' +
            '   9828    9826 Z+   zombies_unreape\n' +
            '   9829    9826 Z+   zombies_unreape\n' +
            '   9830    9826 Z+   zombies_unreape\n' +
            '   9831    9826 Z+   zombies_unreape\n' +
            '   9832    9826 Z+   zombies_unreape',
            notes: ['<code>COMMAND</code> hiện <code>zombies_unreape</code>, cụt so với tên thật ' +
              '<code>zombies_unreaped</code> — nhân chỉ giữ đúng <b>15</b> ký tự cho ' +
              '<code>comm</code> của một tiến trình. Đây là hành vi thật của Linux, không phải ' +
              'lỗi đánh máy trong bài.',
              'Con số <code>pid=9826</code> và các <code>PID</code>/<code>PPID</code> ' +
              '<code>9828</code>–<code>9832</code> trong bảng chỉ đúng cho lần chạy này — trên ' +
              'máy bạn chúng sẽ khác, đổi mỗi lần chạy.'] },

          { t: 'p', x:
            'Năm zombie, đúng như dự đoán. Giờ chạy bản có handler <code>SIGCHLD</code> ' +
            '(<code>reap_zombies.c</code> ở phần lý thuyết):' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o reap_zombies reap_zombies.c\n' +
            './reap_zombies &\n' +
            'sleep 1\n' +
            'ps -o pid,ppid,stat,comm --ppid $!\n' +
            'ps -o stat= --ppid $! | grep -c Z\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            'parent pid=12869, spawned 5 children, NOT calling wait in main\n' +
            '    PID    PPID STAT COMMAND\n' +
            '0\n' +
            'handler reaped 5 children' },

          { t: 'cal', kind: 'info', title: 'Bảng ps rỗng và con số 5 — hai nửa của cùng một bằng chứng', x:
            '<p><code>ps</code> chỉ in ra dòng tiêu đề: không còn tiến trình con nào, ' +
            '<code>grep -c Z</code> đếm được <b>0</b> zombie. Trong khi đó biến đếm trong ' +
            'chương trình báo <b>5</b> — nghĩa là cả năm đứa đều đã được gặt, chứ không phải ' +
            'chúng biến mất bằng cách nào khác.</p>' +
            '<p>Và <code>main</code> vẫn <b>không hề</b> gọi <code>wait</code> lấy một lần. Toàn ' +
            'bộ việc dọn dẹp diễn ra trong handler, xen kẽ vào lúc chương trình đang ngủ. Đó ' +
            'chính xác là thứ một daemon cần: vừa làm việc chính, vừa tự dọn xác con, không ' +
            'chặn ở đâu cả.</p>' +
            '<p>Thử đổi <code>while</code> thành <code>if</code> trong handler rồi chạy lại. ' +
            'Rất có thể bạn sẽ thấy con số nhỏ hơn 5 và vài zombie sót lại — bằng chứng sống ' +
            'cho việc tín hiệu chuẩn không xếp hàng.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Nhận tín hiệu qua signalfd, không cần handler',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>signalfd_demo.c</code> ở phần lý thuyết rồi thử cả hai tín hiệu. Chú ý là ' +
            'chương trình này <b>không có hàm handler nào cả</b>.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o signalfd_demo signalfd_demo.c\n' +
            'echo "shell pid = $$"\n' +
            './signalfd_demo &\n' +
            'sleep 0.4\n' +
            'kill -USR1 $!; sleep 0.3\n' +
            'kill -TERM $!\n' +
            'wait; echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'shell pid = 12918\n' +
            'pid=12919  signalfd = 3\n' +
            'read signal 10 (User defined signal 1) from pid 12918\n' +
            'read signal 15 (Terminated) from pid 12918\n' +
            'SIGTERM -> cleaning up then exiting normally\n' +
            'exit=0' },

          { t: 'cal', kind: 'tip', title: 'Số 12918 xuất hiện hai lần — đó không phải trùng hợp', x:
            '<p>Mọi con số PID trong đầu ra trên (<code>12918</code>, <code>12919</code>) chỉ đúng ' +
            'cho lần chạy này — trên máy bạn chúng sẽ khác, đổi mỗi lần chạy.</p>' +
            '<p><code>ssi_pid</code> trả về <b>12918</b>, đúng bằng <code>$$</code> của shell. ' +
            'Chương trình vừa xác định được chính xác ai đã gửi tín hiệu cho nó.</p>' +
            '<p>Trên thiết bị thật, điều này rất có giá khi gỡ lỗi: một dịch vụ bị dừng bất ' +
            'thường có thể ghi lại <code>ssi_pid</code> vào log, và bạn tra ngược ra thủ phạm — ' +
            'systemd, một script cron, hay OOM killer. Với handler cổ điển bạn chỉ biết "có ' +
            'người giết tôi" mà không biết ai.</p>' },

          { t: 'p', x:
            'Giờ hãy phá nó, để hiểu vì sao dòng <code>sigprocmask</code> là bắt buộc:' },

          { t: 'code', where: 'wsl', code:
            'grep -v sigprocmask signalfd_demo.c > forgot_block.c\n' +
            'gcc -Wall -Wextra -o forgot_block forgot_block.c\n' +
            './forgot_block &\n' +
            'sleep 0.4\n' +
            'kill -TERM $!\n' +
            'wait; echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=13086  signalfd = 3\n' +
            'exit=143',
            notes: ['<code>143 = 128 + 15</code>: chương trình bị <code>SIGTERM</code> giết theo ' +
              'hành vi mặc định, chưa kịp <code>read</code> byte nào từ <code>signalfd</code>.'] },

          { t: 'cal', kind: 'danger', title: 'Triệu chứng này trông y hệt như bạn chưa viết signalfd', x:
            '<p>Không có thông báo lỗi, không có cảnh báo biên dịch, <code>signalfd()</code> vẫn ' +
            'trả về fd 3 thành công. Chỉ là tín hiệu không bao giờ đi vào đó, vì hành vi mặc ' +
            'định đã kết liễu tiến trình trước.</p>' +
            '<p>Ghi nhớ thứ tự bất di bất dịch: <b>chặn trước, tạo signalfd sau</b>. Và nếu ' +
            'chương trình <code>fork</code>, hãy nhớ mặt nạ tín hiệu được thừa hưởng qua cả ' +
            '<code>fork</code> lẫn <code>exec</code> — con của bạn sẽ khởi động với ' +
            '<code>SIGTERM</code> bị chặn sẵn, mà nó thì không hề biết. Hãy gọi ' +
            '<code>sigprocmask(SIG_SETMASK, &amp;cu, NULL)</code> trong nhánh con ngay sau ' +
            '<code>fork</code>. Đây là một lỗi rất khó tìm.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Bài kiểm tra thật: cùng một chương trình, SIGTERM và SIGKILL',
        blocks: [
          { t: 'p', x:
            'Đây là bước trả lời câu chuyện mở đầu bài. Một chương trình đo nhiệt độ ghi log ' +
            'mỗi giây. Bạn sẽ giết nó hai lần bằng hai cách, rồi so hai file log.' },

          { t: 'code', where: 'file', name: 'shutdown.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <signal.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'static volatile sig_atomic_t shutdown_requested = 0;\n' +
            '\n' +
            'static void handle_term(int s)\n' +
            '{\n' +
            '    (void)s;\n' +
            '    shutdown_requested = 1;             /* ONLY sets the flag, nothing else */\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    struct sigaction sa;\n' +
            '    memset(&sa, 0, sizeof sa);\n' +
            '    sa.sa_handler = handle_term;\n' +
            '    sigemptyset(&sa.sa_mask);\n' +
            '    sa.sa_flags = SA_RESTART;\n' +
            '    sigaction(SIGTERM, &sa, NULL);\n' +
            '    sigaction(SIGINT,  &sa, NULL);      /* Ctrl+C also shuts down gracefully */\n' +
            '\n' +
            '    FILE *log = fopen("/tmp/shutdown.log", "w");\n' +
            '    if (!log) { perror("fopen"); return 1; }\n' +
            '    setvbuf(log, NULL, _IOLBF, 0);      /* line-buffered flush */\n' +
            '\n' +
            '    fprintf(log, "startup, pid=%d\\n", getpid());\n' +
            '    printf("pid=%d measuring temperature...\\n", getpid());\n' +
            '    fflush(stdout);\n' +
            '\n' +
            '    int tick = 0;\n' +
            '    while (!shutdown_requested) {       /* main loop */\n' +
            '        fprintf(log, "tick %d: temperature = %d.%d C\\n",\n' +
            '                tick, 25 + tick % 3, tick % 10);\n' +
            '        tick++;\n' +
            '        sleep(1);\n' +
            '    }\n' +
            '\n' +
            '    /* CLEANUP SECTION -- reachable because the handler does not exit itself */\n' +
            '    fprintf(log, "stop signal received, writing final record\\n");\n' +
            '    fprintf(log, "total %d ticks, closing file cleanly\\n", tick);\n' +
            '    fclose(log);\n' +
            '    printf("shut down gracefully after %d ticks\\n", tick);\n' +
            '    return 0;                           /* exit code 0 = stopped as requested */\n' +
            '}' },

          { t: 'code', where: 'wsl', name: 'Lần 1 — SIGTERM', code:
            'gcc -Wall -Wextra -o shutdown shutdown.c\n' +
            'rm -f /tmp/shutdown.log\n' +
            './shutdown &\n' +
            'sleep 3\n' +
            'kill -TERM $!\n' +
            'wait; echo "exit=$?"\n' +
            'cat /tmp/shutdown.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=418 measuring temperature...\n' +
            'shut down gracefully after 4 ticks\n' +
            'exit=0\n' +
            'startup, pid=418\n' +
            'tick 0: temperature = 25.0 C\n' +
            'tick 1: temperature = 26.1 C\n' +
            'tick 2: temperature = 27.2 C\n' +
            'tick 3: temperature = 25.3 C\n' +
            'stop signal received, writing final record\n' +
            'total 4 ticks, closing file cleanly' },

          { t: 'code', where: 'wsl', name: 'Lần 2 — SIGKILL', code:
            'rm -f /tmp/shutdown.log\n' +
            './shutdown &\n' +
            'sleep 3\n' +
            'kill -KILL $!\n' +
            'wait; echo "exit=$?"\n' +
            'cat /tmp/shutdown.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=416 measuring temperature...\n' +
            'Killed\n' +
            'exit=137\n' +
            'startup, pid=416\n' +
            'tick 0: temperature = 25.0 C\n' +
            'tick 1: temperature = 26.1 C\n' +
            'tick 2: temperature = 27.2 C\n' +
            'tick 3: temperature = 25.3 C' },

          { t: 'cal', kind: 'why', title: 'Hai file log, một bài học', x:
            '<p>Bốn dòng dữ liệu là giống hệt nhau. Khác biệt nằm ở phần cuối:</p>' +
            '<ul>' +
            '<li><b><code>SIGTERM</code></b> → có hai dòng kết thúc, file được ' +
            '<code>fclose</code> đúng cách, mã thoát <b>0</b>. Người đọc log biết chắc dịch vụ ' +
            'đã dừng có chủ đích và dữ liệu trọn vẹn tới byte cuối.</li>' +
            '<li><b><code>SIGKILL</code></b> → cụt ngang, không có dòng kết thúc, mã thoát ' +
            '<b>137</b>. Không cách nào phân biệt được đây là "bị giết" hay "mất điện" hay ' +
            '"đang ghi dở thì chết".</li>' +
            '</ul>' +
            '<p>Ở đây log còn <i>tương đối</i> lành vì <code>setvbuf(..., _IOLBF, 0)</code> ép ' +
            'xả theo dòng. Bỏ dòng đó đi, chuyển sang đệm toàn phần 4 KB mặc định, thì bản ' +
            '<code>SIGKILL</code> sẽ cho ra một file <b>rỗng hoàn toàn</b> — bốn nhịp dữ liệu ' +
            'bốc hơi sạch. Hãy thử để tự thấy.</p>' +
            '<p>Đây chính là sự khác nhau giữa một thiết bị mất dữ liệu mỗi lần cúp điện và một ' +
            'thiết bị không.</p>' },

          { t: 'p', x:
            'Cuối cùng, dùng <code>strace</code> để xem chính xác chuyện gì xảy ra ở mức syscall ' +
            'khi tín hiệu tới:' },

          { t: 'code', where: 'wsl', code:
            'strace -e trace=rt_sigaction,clock_nanosleep -o sigterm_trace.txt ./shutdown &\n' +
            'sleep 2.5\n' +
            'pkill -TERM -x shutdown\n' +
            'sleep 1\n' +
            'cat sigterm_trace.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rt_sigaction(SIGTERM, {sa_handler=0x5b8be8ba52e9, sa_mask=[], sa_flags=SA_RESTORER|SA_RESTART, sa_restorer=0x7072b7845cb0}, NULL, 8) = 0\n' +
            'rt_sigaction(SIGINT, {sa_handler=0x5b8be8ba52e9, sa_mask=[], sa_flags=SA_RESTORER|SA_RESTART, sa_restorer=0x7072b7845cb0}, NULL, 8) = 0\n' +
            'clock_nanosleep(CLOCK_REALTIME, 0, {tv_sec=1, tv_nsec=0}, 0x7ffedd5247d0) = 0\n' +
            'clock_nanosleep(CLOCK_REALTIME, 0, {tv_sec=1, tv_nsec=0}, 0x7ffedd5247d0) = 0\n' +
            'clock_nanosleep(CLOCK_REALTIME, 0, {tv_sec=1, tv_nsec=0}, {tv_sec=0, tv_nsec=510044399}) = ? ERESTART_RESTARTBLOCK (Interrupted by signal)\n' +
            '--- SIGTERM {si_signo=SIGTERM, si_code=SI_USER, si_pid=441, si_uid=1000} ---\n' +
            '+++ exited with 0 +++',
            notes: ['Địa chỉ hàm, số hiệu PID, số nhịp <code>clock_nanosleep</code> và phần ' +
              '<code>tv_nsec</code> còn lại trên máy bạn sẽ khác — chúng đổi ở mỗi lần chạy. Ba ' +
              'thứ <b>phải</b> giống là: cờ <code>SA_RESTART</code> có mặt, dòng ngủ cuối cùng ' +
              'kết thúc bằng <code>ERESTART_RESTARTBLOCK</code>, và mã thoát là ' +
              '<code>0</code>.'] },

          { t: 'cmdx', cmd: 'strace -e trace=rt_sigaction,clock_nanosleep -o sigterm_trace.txt ./shutdown &',
            title: 'Vì sao dừng bằng pkill -x shutdown chứ không phải kill -TERM $! như mọi bước trước',
            rows: [
              ['<code>-e trace=rt_sigaction,clock_nanosleep</code>', 'Chỉ ghi lại đúng hai syscall cần xem', 'Không có cờ này, file log dài hàng trăm dòng gồm toàn bộ <code>mmap</code>/<code>openat</code> lúc chương trình nạp thư viện dùng chung — <code>strace --help</code> gọi đây là <code>-e trace=SET</code>, "trace only specified syscalls"'],
              ['<code>-o sigterm_trace.txt</code>', 'Ghi log ra file thay vì in xen vào <code>stderr</code>', 'Không có cờ này, dòng trace sẽ lẫn ngay với chính dòng <code>"SIGTERM -> cleaning up..."</code> mà <code>shutdown</code> in ra'],
              ['<code>./shutdown &amp;</code>', '<code>strace</code> tự <code>fork</code> rồi <code>exec</code> chương trình đích như một tiến trình <b>con của chính nó</b>', '<b><code>$!</code> sau lệnh này là PID của <code>strace</code>, không phải của <code>shutdown</code>.</b> Đo thật: gửi <code>kill -TERM $!</code> tới PID đó không có tác dụng gì — cả hai tiến trình vẫn chạy tiếp sau nửa giây chờ'],
              ['<code>pkill -TERM -x shutdown</code>', 'Gửi tín hiệu tới tiến trình có tên khớp <b>chính xác</b> ("exact match") chuỗi <code>shutdown</code>, bất kể nó là con của ai', 'Đây là lý do bước này đổi cách gửi tín hiệu so với bốn bước trước — mục tiêu thật giờ nằm sau một lớp <code>strace</code>']
            ]},

          { t: 'cal', kind: 'info', title: 'Bốn điều bản ghi này nói ra', x:
            '<ol>' +
            '<li><b>Không có syscall nào tên <code>sigaction</code>.</b> Nhân chỉ có ' +
            '<code>rt_sigaction</code> — bản "real-time" hỗ trợ đủ 64 tín hiệu. Cùng kiểu quan ' +
            'hệ như <code>fork</code> và <code>clone</code> ở Bài 20.</li>' +
            '<li><b><code>SA_RESTORER</code> xuất hiện dù bạn không đặt.</b> glibc tự thêm: đó ' +
            'là địa chỉ đoạn mã sẽ chạy <i>sau khi</i> handler trả về, để gọi ' +
            '<code>rt_sigreturn</code> đưa CPU về đúng chỗ đang dở. Bạn không bao giờ phải viết ' +
            'phần này.</li>' +
            '<li><b><code>ERESTART_RESTARTBLOCK (Interrupted by signal)</code></b> — dù ' +
            '<code>SA_RESTART</code> có mặt rành rành ở dòng trên. Đúng như đã cảnh báo: ' +
            '<code>sleep</code> không nằm trong nhóm được khởi động lại. Nhờ vậy vòng lặp thoát ' +
            '<b>trong 0,5 giây còn lại</b> thay vì ngủ hết nhịp.</li>' +
            '<li><b><code>si_code=SI_USER</code>, <code>si_pid=441</code></b> — nhân ghi rõ tín ' +
            'hiệu do một tiến trình người dùng gửi, và đó là tiến trình nào. So sánh: một ' +
            '<code>SIGSEGV</code> do lỗi con trỏ sẽ hiện <code>si_code=SEGV_MAPERR</code> kèm ' +
            'địa chỉ gây lỗi.</li>' +
            '</ol>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>sigaction: Invalid argument</code> khi đăng ký <code>SIGKILL</code> hoặc <code>SIGSTOP</code>',
         'Hai tín hiệu này bị POSIX cấm bắt, chặn và bỏ qua. Nhân từ chối, không phải bạn viết sai.',
         'Không có cách chữa và cũng không nên chữa. Hãy thiết kế để dọn dẹp xảy ra ở <code>SIGTERM</code>, coi <code>SIGKILL</code> là mất điện.'],

        ['<code>implicit declaration of function \'strsignal\'</code>',
         'Thiếu <code>#include &lt;string.h&gt;</code>. Gặp thật khi biên dịch bài này.',
         'Thêm header. Tương tự, <code>system()</code> cần <code>&lt;stdlib.h&gt;</code>, <code>strerror</code> cần <code>&lt;string.h&gt;</code>.'],

        ['Chương trình treo mãi ở <code>read</code>/<code>poll</code> dù đã gửi tín hiệu',
         'Có <code>SA_RESTART</code>: sau khi handler chạy xong, nhân âm thầm gọi lại syscall từ đầu.',
         'Bỏ <code>SA_RESTART</code> và xử lý <code>errno == EINTR</code> tường minh, hoặc chuyển sang <code>signalfd</code> ghép vào <code>poll</code>.'],

        ['<code>read returned -1, errno=4 (Interrupted system call)</code>',
         '<code>EINTR</code>: syscall bị tín hiệu cắt ngang và <b>không</b> có <code>SA_RESTART</code>.',
         'Đây không phải lỗi thật. Hoặc bọc trong vòng lặp <code>while (n &lt; 0 &amp;&amp; errno == EINTR)</code>, hoặc dùng nó làm tín hiệu thoát vòng lặp — đúng thứ bạn muốn khi tắt êm.'],

        ['Vòng lặp <code>while (!shutdown_requested)</code> không bao giờ thoát dù handler đã chạy',
         'Thiếu <code>volatile</code>. Với <code>-O2</code>, trình biên dịch thấy thân vòng lặp không sửa biến nên nạp nó vào thanh ghi một lần.',
         'Khai báo đủ: <code>static volatile sig_atomic_t shutdown_requested = 0;</code>. Triệu chứng đặc trưng: chạy đúng ở <code>-O0</code>, treo ở <code>-O2</code>.'],

        ['Chương trình dùng <code>signalfd</code> chết ngay, mã thoát <b>143</b>',
         'Quên <code>sigprocmask(SIG_BLOCK, ...)</code>. Hành vi mặc định của <code>SIGTERM</code> thi hành trước khi kịp <code>read</code>.',
         'Luôn chặn tín hiệu <b>trước</b> khi gọi <code>signalfd</code>. Và bỏ chặn lại trong nhánh con sau <code>fork</code>.'],

        ['Zombie vẫn còn dù đã có handler <code>SIGCHLD</code>',
         'Dùng <code>if</code> thay vì <code>while</code>, hoặc quên <code>WNOHANG</code>. Tín hiệu chuẩn không xếp hàng: 5 con chết gần nhau chỉ sinh 1 lần chuyển phát.',
         '<code>while (waitpid(-1, NULL, WNOHANG) &gt; 0) ;</code> — vòng lặp là bắt buộc, <code>WNOHANG</code> cũng vậy.'],

        ['Handler <code>SIGCHLD</code> làm chương trình đứng hình',
         'Quên <code>WNOHANG</code>: <code>waitpid</code> ngồi chờ đứa con tiếp theo, ngay bên trong bộ xử lý tín hiệu.',
         'Thêm <code>WNOHANG</code>. Nguyên tắc chung: handler không bao giờ được gọi thứ gì có thể chặn.'],

        ['<code>perror</code> in ra thông báo lỗi sai hoàn toàn, không liên quan',
         'Handler chạy xen vào giữa một syscall thất bại và dòng <code>perror</code>, rồi ghi đè <code>errno</code>.',
         'Lưu và khôi phục trong handler: <code>int saved_errno = errno;</code> … <code>errno = saved_errno;</code>'],

        ['Chương trình thoát với mã <b>141</b> khi nối qua ống, ví dụ <code>./prog | head -3</code>',
         '<code>SIGPIPE</code> (13): <code>head</code> đọc đủ 3 dòng rồi đóng ống, lần <code>write</code> tiếp theo bị nhân giết. Đo được: <code>141 = 128 + 13</code>.',
         'Với công cụ dòng lệnh thì đây là hành vi <b>đúng</b>, đừng sửa. Với daemon mạng thì phải <code>signal(SIGPIPE, SIG_IGN)</code> — khi đó <code>write</code> trả <code>-1</code>/<code>EPIPE</code> và bạn tự xử lý.'],

        ['Dịch vụ mất 90 giây mới dừng, systemd ghi <code>Killed</code>',
         'Chương trình không bắt <code>SIGTERM</code>, hoặc vòng lặp chính đang <code>sleep</code> quá dài để kịp kiểm tra cờ.',
         'Bắt <code>SIGTERM</code>. Ngủ từng giây một hoặc dùng <code>poll</code> với thời hạn ngắn. Kiểm tra hạn chót bằng <code>systemctl show -p DefaultTimeoutStopUSec</code>.'],

        ['Sau <code>fork</code>, tiến trình con không phản ứng với <code>SIGTERM</code>',
         'Mặt nạ tín hiệu được thừa hưởng qua cả <code>fork</code> lẫn <code>exec</code>. Con khởi động với tín hiệu bị chặn sẵn mà không biết.',
         'Khôi phục mặt nạ trong nhánh con ngay sau <code>fork</code>: <code>sigprocmask(SIG_SETMASK, &amp;cu, NULL);</code>']
      ]},

    /* ══════════════════════════════════════════════
       11. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 21', items: [
      'Tín hiệu là <b>ngắt mềm</b> mang đúng một số hiệu, không dữ liệu, không xếp hàng. Nó được chuyển phát khi nhân sắp trả CPU về cho tiến trình, chứ không phải ngay lúc gửi.',
      'Luôn dùng <code>sigaction</code>, không dùng <code>signal</code>: ngữ nghĩa của <code>signal</code> khác nhau giữa các hệ, và <b>lỗi đó không lộ ra trên glibc</b> — chỉ nổ trên thư viện C của thiết bị.',
      '<code>SIGKILL</code> (9) và <code>SIGSTOP</code> (19) <b>không thể</b> bắt, chặn hay bỏ qua. <code>sigaction</code> từ chối chúng với <code>EINVAL</code>. Sau <code>SIGKILL</code> không có một byte dọn dẹp nào.',
      'Mã thoát nói ra nguyên nhân: <b>130</b> = Ctrl+C, <b>137</b> = <code>SIGKILL</code>, <b>139</b> = <code>SIGSEGV</code>, <b>141</b> = <code>SIGPIPE</code>, <b>143</b> = <code>SIGTERM</code>.',
      'Handler chỉ được gọi hàm <b>async-signal-safe</b> — <code>man 7 signal-safety</code> liệt kê <b>199</b> hàm, trong đó có <code>write</code> và <code>waitpid</code>, <b>không</b> có <code>printf</code> hay <code>malloc</code>.',
      'Lỗi tái nhập không gây crash, chỉ gây <b>dữ liệu sai</b>: chương trình hỏi 42 và nhận về 999, không một cảnh báo nào. Và 4000 tín hiệu vẫn có thể không kích hoạt được lỗi — đó là lý do phải viết đúng chứ không thể test ra.',
      'Hình mẫu chuẩn: <b>handler đặt cờ <code>static volatile sig_atomic_t</code>, luồng chính làm việc</b>. Cả ba từ khoá đều bắt buộc; thiếu <code>volatile</code> là vòng lặp không bao giờ thoát ở <code>-O2</code>.',
      '<code>sigprocmask</code> <b>hoãn</b> tín hiệu (nó nằm ở "đang treo" rồi được chuyển phát khi bỏ chặn), khác hẳn <code>SIG_IGN</code> là <b>vứt</b> hẳn.',
      '<code>signalfd</code> biến tín hiệu thành fd đọc được, cho phép xử lý trong luồng chính với mọi hàm và ghép vào <code>poll</code>/<code>epoll</code>. <b>Bắt buộc</b> <code>sigprocmask</code> trước, nếu không chương trình chết với mã 143.',
      'Handler <code>SIGCHLD</code> với <code>while (waitpid(-1, NULL, WNOHANG) &gt; 0)</code> dọn zombie tự động — đo được: <b>5</b> con được gặt, <b>0</b> zombie, mà <code>main</code> không gọi <code>wait</code> lần nào.',
      'Hợp đồng dừng dịch vụ: <code>SIGTERM</code> là lời đề nghị, <code>SIGKILL</code> là cưỡng chế. Trên máy bạn khoảng chờ mặc định là <b>1 phút 30 giây</b>, nhưng mục tiêu thực tế phải là dưới một giây.',
      '<code>SA_RESTART</code> khởi động lại <code>read</code> nhưng <b>không</b> khởi động lại <code>sleep</code>/<code>poll</code>/<code>select</code> — bằng chứng là <code>ERESTART_RESTARTBLOCK</code> trong <code>strace</code>. Nhờ vậy daemon thoát gần như tức thì.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 22 — Luồng và đồng bộ với pthread.</b> Cả Bài 20 lẫn bài này đều xoay quanh một ' +
      'sự thật: hai tiến trình không dùng chung một biến nào. Bài 22 lật ngược điều đó. Luồng ' +
      'dùng chung <b>toàn bộ</b> không gian địa chỉ — cùng heap, cùng biến toàn cục, cùng bảng ' +
      'file descriptor — và đó vừa là sức mạnh vừa là nguồn gốc của một lớp lỗi mới.</p>' +
      '<p>Bạn sẽ tự tay tạo ra một race condition: hai luồng cùng tăng một biến đếm một triệu ' +
      'lần, rồi in kết quả ra và thấy nó <b>không</b> bằng hai triệu. Sau đó sửa bằng ' +
      '<code>pthread_mutex</code> và <b>đo lại</b> xem khoá tốn bao nhiêu. Bạn cũng sẽ dùng lại ' +
      'con số <b>215–235 µs</b> của <code>fork</code> ở Bài 20 để so với giá tạo một luồng — con ' +
      'số đó quyết định khi nào nên dùng tiến trình, khi nào nên dùng luồng trên một thiết bị ' +
      'chỉ có 64 MB RAM.</p>' }
  ],

  quiz: [
    { q: 'Vì sao <code>sigaction(SIGKILL, &amp;sa, NULL)</code> trả về lỗi <code>EINVAL</code>?',
      opts: [
        'Vì <code>struct sigaction</code> chưa được <code>memset</code> về 0',
        'Vì POSIX cấm bắt, chặn và bỏ qua <code>SIGKILL</code> — nhân từ chối mọi bố trí riêng cho nó',
        'Vì cần quyền root mới đăng ký được tín hiệu số nhỏ hơn 10',
        'Vì phải dùng <code>signal()</code> thay cho <code>sigaction()</code> với <code>SIGKILL</code>'
      ],
      a: 1,
      why: 'Cùng một <code>struct sigaction</code> đó đăng ký thành công cho <code>SIGTERM</code> ngay dòng trên, nên vấn đề không nằm ở cấu trúc hay quyền hạn. <code>SIGKILL</code> (9) và <code>SIGSTOP</code> (19) là hai tín hiệu duy nhất bị cấm — đó là cơ chế bảo đảm quản trị viên luôn có cách dừng một tiến trình bất trị. Hệ quả thực tế: sau <code>SIGKILL</code> không có một dòng mã dọn dẹp nào chạy, nên hãy coi nó tương đương mất điện và dồn toàn bộ việc dọn dẹp vào <code>SIGTERM</code>.' },

    { q: 'Chương trình của bạn có <code>while (!shutdown_requested) { ... }</code> và một handler đặt <code>shutdown_requested = 1</code>. Nó thoát đúng khi biên dịch với <code>-O0</code>, nhưng treo vĩnh viễn với <code>-O2</code>. Nguyên nhân nhiều khả năng nhất?',
      opts: [
        'Thiếu <code>volatile</code> trong khai báo biến cờ',
        '<code>-O2</code> làm handler không được đăng ký kịp trước vòng lặp',
        'Thiếu <code>SA_RESTART</code> nên <code>sleep</code> không được khởi động lại',
        'Tín hiệu bị mất vì tín hiệu chuẩn không xếp hàng'
      ],
      a: 0,
      why: 'Đây là hình mẫu triệu chứng kinh điển: <b>đúng ở -O0, sai ở -O2</b>. Trình tối ưu hoá nhìn thấy thân vòng lặp không hề sửa <code>shutdown_requested</code>, nên nó kết luận rằng đọc lại biến từ bộ nhớ mỗi vòng là thừa và nạp giá trị vào một thanh ghi một lần duy nhất. Handler ghi vào ô nhớ, nhưng vòng lặp đang đọc thanh ghi — hai nơi khác nhau. <code>volatile</code> chính là lời tuyên bố "biến này có thể bị đổi bởi thứ mà anh không thấy được, hãy đọc lại từ bộ nhớ mỗi lần". Khai báo đủ phải là <code>static volatile sig_atomic_t</code>.' },

    { q: 'Handler bắt <code>SIGCHLD</code> của bạn viết <code>if (waitpid(-1, NULL, WNOHANG) &gt; 0) reaped++;</code>. Tiến trình sinh 5 con chết gần như cùng lúc. Kết quả có thể xảy ra là gì?',
      opts: [
        'Luôn gặt đủ 5 con, vì mỗi con chết sinh ra một <code>SIGCHLD</code> riêng',
        'Gặt được ít hơn 5 con và còn zombie sót lại, vì tín hiệu chuẩn không xếp hàng',
        'Chương trình đứng hình vì <code>waitpid</code> chặn trong handler',
        'Handler không bao giờ chạy vì thiếu <code>SA_NOCLDSTOP</code>'
      ],
      a: 1,
      why: 'Tín hiệu chuẩn (1–31) chỉ có một bit "đang treo" cho mỗi số hiệu. Nếu ba con chết trong lúc handler đang chạy, ba lần <code>SIGCHLD</code> đó gộp thành <b>một</b> lần chuyển phát duy nhất — nhân không đếm, chỉ bật cờ. Với <code>if</code>, handler gặt đúng một xác rồi trả về, hai xác kia nằm lại vĩnh viễn. Vì vậy dạng đúng bắt buộc là <code>while (waitpid(-1, NULL, WNOHANG) &gt; 0) ;</code> — vòng lặp vét sạch mọi xác sẵn có, và <code>WNOHANG</code> bảo đảm nó không chặn khi đã hết.' },

    { q: 'Một chương trình dùng <code>signalfd</code> nhưng quên gọi <code>sigprocmask(SIG_BLOCK, ...)</code>. Chuyện gì xảy ra khi nó nhận <code>SIGTERM</code>?',
      opts: [
        '<code>signalfd()</code> trả về <code>-1</code> với <code>errno = EINVAL</code> ngay khi khởi tạo',
        '<code>read()</code> trên fd trả về 0, chương trình chạy tiếp bình thường',
        'Chương trình chết ngay theo hành vi mặc định, mã thoát 143, không đọc được byte nào',
        'Tín hiệu nằm lại ở trạng thái đang treo cho tới khi chương trình tự thoát'
      ],
      a: 2,
      why: 'Đây là bẫy nguy hiểm vì <b>không có dấu hiệu báo lỗi nào cả</b>: <code>signalfd()</code> vẫn trả về một fd hợp lệ, trình biên dịch không cảnh báo. <code>signalfd</code> không thay đổi bố trí của tín hiệu — nó chỉ mở một cửa để đọc những tín hiệu <i>đang bị chặn</i>. Nếu tín hiệu không bị chặn, hành vi mặc định (kết liễu) thi hành trước, và <code>128 + 15 = 143</code>. Quy tắc bất di bất dịch: <b>chặn trước, tạo signalfd sau</b>.' },

    { q: 'Vì sao gọi <code>printf</code> trong bộ xử lý tín hiệu là sai, dù bạn chạy thử hàng nghìn lần mà chương trình không hề crash?',
      opts: [
        'Vì <code>printf</code> chậm, làm handler chạy quá lâu và tín hiệu tiếp theo bị mất',
        'Vì <code>printf</code> dùng cấu trúc dữ liệu dùng chung có khoá; ngắt vào giữa gây hỏng dữ liệu âm thầm với cửa sổ rủi ro chỉ vài nano giây',
        'Vì <code>printf</code> luôn gây deadlock ngay lần gọi đầu tiên trong handler',
        'Vì <code>printf</code> ghi ra <code>stdout</code> mà <code>stdout</code> bị đóng trong handler'
      ],
      a: 1,
      why: 'Câu hỏi đã nói rõ phần khó: <b>test không phát hiện được lỗi này</b>. Bài thực hành gửi 4000 tín hiệu mà không treo lần nào. Lý do là cửa sổ nguy hiểm — khoảng thời gian giữa lúc <code>printf</code> giành khoá bộ đệm và lúc nó nhả ra — chỉ rộng vài nano giây, nên xác suất tín hiệu rơi trúng gần bằng không trên máy để bàn nhàn rỗi. Nhưng "gần bằng không" trên một thiết bị chạy liên tục ba năm là <i>sẽ xảy ra</i>, và khi xảy ra thì hiện ra dưới dạng dữ liệu sai hoặc treo không tái hiện được. Đó là lý do phải viết đúng ngay từ đầu chứ không thể dựa vào việc chạy thử: dùng <code>write(2)</code>, hoặc chỉ đặt cờ.' },

    { q: 'Cùng một chương trình ghi log, giết bằng <code>SIGTERM</code> thì file log có dòng kết thúc và mã thoát 0; giết bằng <code>SIGKILL</code> thì log cụt và mã thoát 137. Điều gì giải thích sự khác biệt?',
      opts: [
        '<code>SIGKILL</code> xoá dữ liệu chưa được ghi ra đĩa của tiến trình trước khi giết',
        '<code>SIGTERM</code> có độ ưu tiên thấp hơn nên nhân cho tiến trình thêm 90 giây',
        '<code>SIGTERM</code> chạy handler nên đoạn mã dọn dẹp sau vòng lặp được thực thi; <code>SIGKILL</code> không cho chạy một lệnh nào nữa',
        '<code>SIGKILL</code> làm hỏng hệ thống file nên phần cuối log bị mất'
      ],
      a: 2,
      why: 'Bốn dòng dữ liệu giống hệt nhau ở cả hai lần, khác biệt nằm trọn ở phần sau vòng lặp. Với <code>SIGTERM</code>, handler chỉ đặt cờ rồi trả về, vòng lặp thoát, và <code>main</code> chạy tiếp tới <code>fprintf</code> kết thúc và <code>fclose</code>. Với <code>SIGKILL</code>, nhân gỡ bỏ tiến trình mà không trả CPU lại cho nó lần nào nữa. Điểm đáng nhớ: trong ví dụ này log chỉ <i>cụt</i> chứ chưa <i>rỗng</i> là nhờ <code>setvbuf(..., _IOLBF, 0)</code> ép xả theo dòng — với đệm 4 KB mặc định thì bản <code>SIGKILL</code> cho ra file rỗng hoàn toàn.' },

    { q: 'Trong bản ghi <code>strace</code>, lời gọi <code>clock_nanosleep</code> kết thúc bằng <code>ERESTART_RESTARTBLOCK (Interrupted by signal)</code> mặc dù handler đã đăng ký với <code>SA_RESTART</code>. Nên hiểu thế nào?',
      opts: [
        '<code>strace</code> hiển thị sai, thực tế syscall đã được khởi động lại',
        '<code>SA_RESTART</code> chỉ có tác dụng khi dùng <code>signal()</code> chứ không phải <code>sigaction()</code>',
        '<code>SA_RESTART</code> không áp dụng cho <code>sleep</code>/<code>poll</code>/<code>select</code> — và đó là điều tốt, vì nhờ vậy vòng lặp thoát ngay thay vì ngủ nốt',
        'Đăng ký thiếu <code>SA_RESTORER</code> nên cờ <code>SA_RESTART</code> bị bỏ qua'
      ],
      a: 2,
      why: '<code>SA_RESTART</code> chỉ khởi động lại một nhóm syscall nhất định — chủ yếu là các thao tác vào/ra "chậm" như <code>read</code> trên terminal hay socket. Các syscall có thời hạn (<code>sleep</code>, <code>poll</code>, <code>select</code>, <code>clock_nanosleep</code>) không nằm trong nhóm đó, vì khởi động lại chúng sẽ nhân đôi thời gian chờ một cách sai lệch. Đây không phải khiếm khuyết mà là thứ khiến tắt êm nhanh: chương trình đang ngủ dở 0,5 giây thì thoát ngay khoảng thời gian đó, chứ không đợi hết nhịp. Còn <code>SA_RESTORER</code> là chi tiết do glibc tự thêm, không liên quan.' }
  ]
});

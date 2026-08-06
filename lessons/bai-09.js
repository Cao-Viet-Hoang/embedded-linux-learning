/* ═══════════════════════════════════════════════════════════════
   BÀI 9 — Tiến trình, job và tín hiệu
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-09',
  title: 'Tiến trình, job và tín hiệu',
  minutes: 50,
  practice: 'Thực hành 30 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Bài 8 trả lời câu hỏi <i>ai được phép làm gì</i>. Bài này trả lời câu hỏi ' +
    '<i>cái gì đang chạy</i>. Ngay lúc này máy WSL2 của bạn có <b>56</b> tiến trình, tất cả mọc ' +
    'lên từ một gốc duy nhất là PID 1 — và bạn sẽ tự đếm con số đó trong phần thực hành. Bạn ' +
    'cũng sẽ học cách nói chuyện với một tiến trình đang chạy bằng <b>tín hiệu</b>: vì sao ' +
    '<kbd>Ctrl</kbd>+<kbd>C</kbd> là một lời đề nghị lịch sự, vì sao <code>kill -9</code> là một ' +
    'phát súng, và vì sao dùng phát súng đó quá sớm sẽ khiến thiết bị nhúng của bạn mất dữ liệu ' +
    'chưa kịp ghi xuống flash. Đây là bài đầu tiên bạn nhìn thấy Linux như một hệ thống ' +
    '<i>đang sống</i> chứ không phải một đống file.',

  goals: [
    'Phân biệt chương trình, tiến trình, PID và PPID',
    'Đọc trôi chảy kết quả của <code>ps aux</code>, <code>ps -ef</code> và <code>top</code>',
    'Vẽ lại được cây tiến trình từ PID 1 và giải thích vì sao nó là một cây',
    'Đưa lệnh xuống chạy nền bằng <code>&amp;</code>, quản lý bằng <code>jobs</code>, <code>fg</code>, <code>bg</code>',
    'Chọn đúng tín hiệu cho từng tình huống và giải thích khác biệt giữa SIGTERM và SIGKILL',
    'Nhận ra tiến trình zombie, tiến trình mồ côi và biết chúng nguy hiểm ở mức nào'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. TIẾN TRÌNH LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chương trình nằm yên, tiến trình thì sống' },

    { t: 'p', x:
      'Ở Bài 6 bạn đã thấy <code>/bin/ls</code> là một file 11 MB nằm trên đĩa. File đó là ' +
      '<b>chương trình</b> — nó không làm gì cả, nó chỉ chiếm chỗ. Khi bạn gõ <code>ls</code>, ' +
      'kernel tạo ra một <b>tiến trình</b>: một bản sao chương trình được nạp vào RAM, có bộ nhớ ' +
      'riêng, có số định danh riêng, có chủ sở hữu riêng. Một chương trình có thể sinh ra hàng ' +
      'trăm tiến trình cùng lúc và chúng hoàn toàn độc lập.' },

    { t: 'terms', items: [
      ['Tiến trình', 'process', 'Một chương trình <b>đang chạy</b>: mã lệnh + bộ nhớ + các file ' +
       'đang mở + danh tính (UID/GID của Bài 8) + trạng thái.'],
      ['PID', 'process ID', 'Số định danh tiến trình. Kernel cấp theo thứ tự tăng dần, quay vòng ' +
       'lại khi chạm trần. <b>PID 1</b> là tiến trình đầu tiên, cha của tất cả.'],
      ['PPID', 'parent process ID', 'PID của tiến trình đã sinh ra nó. Đây là thứ biến tập hợp ' +
       'tiến trình thành một <b>cây</b> chứ không phải một danh sách.'],
      ['fork', '', 'Lời gọi hệ thống tạo tiến trình mới bằng cách <b>nhân đôi</b> tiến trình hiện ' +
       'tại. Con giống hệt cha, chỉ khác PID.'],
      ['exec', '', 'Lời gọi hệ thống <b>thay ruột</b> tiến trình bằng một chương trình khác, giữ ' +
       'nguyên PID. Bạn đã gặp <code>Exec format error</code> ở Bài 3 — chính là lúc bước này ' +
       'thất bại.'],
      ['Job', 'công việc', 'Khái niệm của <b>shell</b>, không phải của kernel. Một job là một ' +
       'đường ống lệnh mà shell của bạn đang theo dõi.']
    ]},

    { t: 'fig',
      cap: 'Mọi tiến trình mới đều sinh ra bằng fork rồi exec. Đây là lý do PID luôn có cha, và vì sao tập hợp tiến trình là một cây.',
      svg:
        '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="Sơ đồ cặp lời gọi fork và exec tạo ra một tiến trình mới từ shell">' +
        '<rect class="d-box-p" x="40" y="30" width="150" height="52" rx="6"/>' +
        '<text class="d-t" x="115" y="52" text-anchor="middle">bash</text>' +
        '<text class="d-tm" x="115" y="70" text-anchor="middle">PID 314</text>' +

        '<line class="d-line" x1="190" y1="56" x2="248" y2="56"/>' +
        '<path class="d-arrow" d="M248 56 l-8 -4 v8 z"/>' +
        '<text class="d-ts" x="219" y="46" text-anchor="middle">fork()</text>' +

        '<rect class="d-box" x="252" y="30" width="180" height="52" rx="6"/>' +
        '<text class="d-t" x="342" y="52" text-anchor="middle">bản sao của bash</text>' +
        '<text class="d-tm" x="342" y="70" text-anchor="middle">PID 425 · PPID 314</text>' +

        '<line class="d-line" x1="432" y1="56" x2="490" y2="56"/>' +
        '<path class="d-arrow" d="M490 56 l-8 -4 v8 z"/>' +
        '<text class="d-ts" x="461" y="46" text-anchor="middle">exec()</text>' +

        '<rect class="d-box-g" x="494" y="30" width="180" height="52" rx="6"/>' +
        '<text class="d-t" x="584" y="52" text-anchor="middle">/bin/ls đang chạy</text>' +
        '<text class="d-tm" x="584" y="70" text-anchor="middle">PID 425 · PPID 314</text>' +

        '<text class="d-ts" x="252" y="108">Nhân đôi: cùng bộ nhớ, cùng file đang mở,</text>' +
        '<text class="d-ts" x="252" y="124">chỉ khác PID. Kernel chưa chép RAM thật.</text>' +
        '<text class="d-ts" x="494" y="108">Thay ruột: mã lệnh mới đè lên mã cũ.</text>' +
        '<text class="d-ts" x="494" y="124">PID KHÔNG đổi — đây là chi tiết mấu chốt.</text>' +

        '<line class="d-line" x1="115" y1="82" x2="115" y2="176"/>' +
        '<path class="d-arrow" d="M115 176 l-4 -8 h8 z"/>' +
        '<rect class="d-box-a" x="40" y="180" width="290" height="48" rx="6"/>' +
        '<text class="d-t" x="185" y="200" text-anchor="middle">bash chờ: wait()</text>' +
        '<text class="d-ts" x="185" y="218" text-anchor="middle">nếu có dấu &amp; thì không chờ — đó là chạy nền</text>' +

        '<line class="d-line" x1="584" y1="82" x2="584" y2="176"/>' +
        '<path class="d-arrow" d="M584 176 l-4 -8 h8 z"/>' +
        '<rect class="d-box-w" x="380" y="180" width="290" height="48" rx="6"/>' +
        '<text class="d-t" x="525" y="200" text-anchor="middle">ls chạy xong: exit(0)</text>' +
        '<text class="d-ts" x="525" y="218" text-anchor="middle">mã thoát đi ngược lên cha — chính là $? của Bài 4</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao Linux tách làm hai bước fork rồi exec thay vì một lệnh "chạy chương trình"', x:
      '<p>Vì khoảng trống giữa hai bước là nơi mọi thứ hay ho xảy ra. Sau <code>fork()</code>, ' +
      'tiến trình con đã tồn tại nhưng <b>chưa</b> biến thành chương trình mới. Trong khoảnh khắc ' +
      'đó, shell kịp làm rất nhiều việc:</p>' +
      '<ul>' +
      '<li>Mở file và gắn nó vào đầu ra — đây chính là cách <code>&gt;</code> hoạt động, Bài 10 ' +
      'sẽ dựng lại chi tiết.</li>' +
      '<li>Nối hai tiến trình bằng ống dẫn cho toán tử <code>|</code>.</li>' +
      '<li>Hạ quyền: bỏ bớt đặc quyền trước khi chạy chương trình. Đây là cách đúng để chạy dịch ' +
      'vụ trên thiết bị nhúng mà không cần root suốt đời.</li>' +
      '</ul>' +
      '<p>Nếu chỉ có một lệnh "chạy chương trình" gộp cả hai, mọi tuỳ biến trên phải được nhồi ' +
      'vào tham số của nó. Cách tách đôi này là một trong những quyết định thiết kế đẹp nhất của ' +
      'Unix.</p>' },

    { t: 'cal', kind: 'info', title: 'PID được cấp phát ra sao và vì sao nó bị dùng lại', x:
      '<p>Kernel cấp PID tăng dần tới trần <code>/proc/sys/kernel/pid_max</code> rồi quay về đầu ' +
      'và tìm số còn trống. Nghĩa là <b>PID không phải danh tính vĩnh viễn</b> — sau khi tiến ' +
      'trình chết, số đó có thể thuộc về tiến trình khác.</p>' +
      '<p>Hệ quả thực tế: script kiểu "lưu PID vào file rồi lát nữa <code>kill</code> số đó" là ' +
      'một cái bẫy nếu tiến trình đã chết và PID đã bị tái sử dụng — bạn sẽ giết nhầm. Đó là lý ' +
      'do systemd theo dõi dịch vụ bằng <i>cgroup</i> chứ không bằng file PID.</p>' },

    /* ══════════════════════════════════════════════
       2. CÂY TIẾN TRÌNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cây tiến trình mọc lên từ PID 1' },

    { t: 'p', x:
      'Mỗi tiến trình có đúng một cha. Truy ngược lên đủ lâu, bạn luôn về tới PID 1. Đây không ' +
      'phải quy ước cho đẹp — kernel chỉ tự tay tạo ra <b>một</b> tiến trình duy nhất khi khởi ' +
      'động, còn lại mọi thứ đều là con cháu của nó.' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'ps -ef | head -8' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'UID          PID    PPID  C STIME TTY          TIME CMD\n' +
      'root           1       0 17 16:32 ?        00:00:00 /sbin/init\n' +
      'root           2       1  0 16:32 hvc0     00:00:00 /init\n' +
      'root           6       2  0 16:32 hvc0     00:00:00 plan9 --control-socket 7 --log-level 4\n' +
      'root          46       1  6 16:32 ?        00:00:00 /usr/lib/systemd/systemd-journald\n' +
      'systemd+      77       1  3 16:32 ?        00:00:00 /usr/lib/systemd/systemd-resolved\n' +
      'root          87       1  9 16:32 ?        00:00:00 /usr/lib/systemd/systemd-udevd\n' +
      'root         109      87  0 16:32 ?        00:00:00 (udev-worker)' },

    { t: 'cal', kind: 'info', title: 'Đọc cột PPID là đủ để dựng lại toàn bộ cây', x:
      '<p>PID 1 có <code>PPID = 0</code> — số 0 không phải một tiến trình, nó là cách nói "không ' +
      'có cha, tôi là gốc".</p>' +
      '<p>PID 46, 77, 87 đều có <code>PPID = 1</code>: các dịch vụ hệ thống, con trực tiếp của ' +
      'systemd. PID 109 có <code>PPID = 87</code>: nó là con của <code>systemd-udevd</code>, một ' +
      'tiến trình thợ được đẻ ra để xử lý sự kiện thiết bị.</p>' +
      '<p>Nhớ lại Bài 1: bạn đã đo được userspace của WSL2 khởi động xong trong <b>2,456 s</b>. ' +
      'Toàn bộ cây này chính là thứ được dựng lên trong hai giây rưỡi đó.</p>' },

    { t: 'p', x:
      '<code>pstree</code> vẽ luôn cái cây đó cho bạn. Đây là một phần thật của cây trên máy bạn:' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'pstree -p 1 | head -12' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'systemd(1)-+-agetty(273)\n' +
      '           |-chronyd-starter(137)---chronyd(220)---chronyd(226)\n' +
      '           |-cron(139)\n' +
      '           |-dbus-daemon(140)\n' +
      '           |-init-systemd(Ub(2)-+-SessionLeader(312)---Relay(314)(313)---bash(314)-+-head(438)\n' +
      '           |                    |                                                  `-pstree(437)\n' +
      '           |                    |-init(6)---{init}(7)\n' +
      '           |                    |-login(315)---bash(387)\n' +
      '           |                    `-{init-systemd(Ub}(8)\n' +
      '           |-networkd-dispat(144)\n' +
      '           |-rsyslogd(194)-+-{rsyslogd}(237)\n' +
      '           |               `-{rsyslogd}(238)' },

    { t: 'cal', kind: 'tip', title: 'Bạn đang ở đúng dòng thứ năm', x:
      '<p><code>bash(314)-+-head(438)</code> và <code>`-pstree(437)</code> — đó là terminal của ' +
      'bạn. Shell PID 314 vừa đẻ ra hai tiến trình con: <code>pstree</code> và <code>head</code>, ' +
      'nối với nhau bằng dấu <code>|</code>.</p>' +
      '<p>Tên trong dấu ngoặc nhọn như <code>{rsyslogd}(237)</code> <b>không phải</b> tiến trình ' +
      'con — đó là <b>luồng</b> (<i>thread</i>) bên trong cùng một tiến trình. Chúng dùng chung bộ ' +
      'nhớ, và <code>ps</code> mặc định không hiện chúng.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao PID 1 là tiến trình quan trọng nhất trên một thiết bị nhúng', x:
      '<p>PID 1 gánh ba việc mà không ai làm thay được:</p>' +
      '<ol>' +
      '<li><b>Khởi động mọi thứ còn lại.</b> Trên máy bạn là systemd; trên rootfs BusyBox tối ' +
      'giản thường là <code>/sbin/init</code> của BusyBox đọc <code>/etc/inittab</code>.</li>' +
      '<li><b>Nhận nuôi trẻ mồ côi.</b> Khi một tiến trình chết trong lúc con nó còn sống, đứa ' +
      'con được gán lại cho PID 1. Phần cuối bài sẽ cho bạn thấy điều này xảy ra thật.</li>' +
      '<li><b>Dọn xác.</b> PID 1 phải gọi <code>wait()</code> để thu hồi mục tiến trình đã chết, ' +
      'nếu không bảng tiến trình của kernel sẽ đầy dần.</li>' +
      '</ol>' +
      '<p>Và một luật sắt: <b>nếu PID 1 chết, kernel panic ngay lập tức.</b> Trên máy để bàn bạn ' +
      'gần như không bao giờ gặp; trên thiết bị nhúng, một <code>init</code> tự viết bị lỗi là ' +
      'nguyên nhân kinh điển của vòng lặp khởi động vô tận. Chặng 06 sẽ dựng init từ đầu và bạn ' +
      'sẽ tự tay gây ra sự cố này để nhìn thấy nó.</p>' },

    /* ══════════════════════════════════════════════
       3. PS
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'ps: một lệnh, ba bộ cú pháp lịch sử' },

    { t: 'p', x:
      '<code>ps</code> là lệnh lạ nhất trong Unix vì nó chấp nhận ba kiểu tham số hoàn toàn khác ' +
      'nhau, di sản của cuộc chia rẽ giữa các dòng Unix. Bạn không cần nhớ hết — chỉ cần nhận ra ' +
      'chúng khi đọc tài liệu người khác viết.' },

    { t: 'table',
      head: ['Kiểu', 'Dấu hiệu', 'Ví dụ', 'Nghĩa'],
      rows: [
        ['BSD', '<b>Không</b> có dấu gạch ngang', '<code>ps aux</code>', 'Mọi tiến trình, kèm người dùng và %CPU/%RAM'],
        ['UNIX', 'Có <b>một</b> dấu gạch ngang', '<code>ps -ef</code>', 'Mọi tiến trình, kèm PPID và dòng lệnh đầy đủ'],
        ['GNU', 'Có <b>hai</b> dấu gạch ngang', '<code>ps --forest</code>', 'Các mở rộng riêng của Linux']
      ]},

    { t: 'cal', kind: 'warn', title: 'ps aux và ps -aux không giống nhau', x:
      '<p><code>ps aux</code> là cú pháp BSD, đúng. <code>ps -aux</code> theo chuẩn UNIX nghĩa là ' +
      '"tiến trình của người dùng tên <b>x</b>" — chỉ vì Linux dễ tính nên nó đoán ý bạn và vẫn ' +
      'chạy. Hãy gõ đúng <code>ps aux</code>, không có gạch ngang.</p>' },

    { t: 'cmdx', cmd: 'ps aux', title: 'Chín cột của cú pháp BSD',
      rows: [
        ['<code>a</code>', 'Mọi tiến trình có gắn terminal, kể cả của người khác', 'Bỏ <code>a</code> thì chỉ thấy tiến trình của bạn'],
        ['<code>u</code>', 'Định dạng "hướng người dùng": thêm USER, %CPU, %MEM', ''],
        ['<code>x</code>', 'Cả tiến trình <b>không</b> gắn terminal — tức là mọi dịch vụ nền',
         'Thiếu <code>x</code> thì bạn không thấy systemd hay sshd'],
        ['<code>VSZ</code>', 'Bộ nhớ ảo đã <b>xin</b>, tính bằng KB', 'Luôn lớn hơn thực tế rất nhiều — đừng lo lắng vì nó'],
        ['<code>RSS</code>', 'Bộ nhớ vật lý <b>thật sự đang chiếm</b>, tính bằng KB',
         'Đây mới là con số cần theo dõi trên thiết bị ít RAM'],
        ['<code>STAT</code>', 'Trạng thái, xem bảng bên dưới', ''],
        ['<code>TIME</code>', 'Tổng thời gian <b>CPU</b> đã dùng, không phải thời gian đã sống', 'Một tiến trình ngủ 10 ngày vẫn có TIME gần bằng 0']
      ]},

    { t: 'cmdx', cmd: 'ps -ef', title: 'Cú pháp UNIX — dùng khi cần cột PPID',
      rows: [
        ['<code>-e</code>', 'Mọi tiến trình (<i>every</i>)', 'Tương đương <code>-A</code>'],
        ['<code>-f</code>', 'Đầy đủ (<i>full</i>): thêm PPID và dòng lệnh nguyên vẹn', ''],
        ['<code>-p PID</code>', 'Chỉ một tiến trình cụ thể', '<code>ps -p 1</code>'],
        ['<code>-o cot,cot</code>', 'Tự chọn cột, y như <code>stat -c</code> ở Bài 8',
         '<code>ps -e -o pid,ppid,stat,comm</code>'],
        ['<code>--no-headers</code>', 'Bỏ dòng tiêu đề', 'Bắt buộc khi đưa kết quả vào script'],
        ['<code>--forest</code>', 'Vẽ cây bằng ký tự', 'Thay thế <code>pstree</code> khi thiết bị không có nó']
      ]},

    { t: 'cal', kind: 'tip', title: 'Hai câu lệnh đáng thuộc lòng', x:
      '<p><code>ps aux</code> khi bạn muốn biết <b>cái gì đang ăn CPU và RAM</b>.</p>' +
      '<p><code>ps -e -o pid,ppid,stat,comm --forest</code> khi bạn muốn biết <b>ai đẻ ra ai</b>. ' +
      'Câu thứ hai chạy được cả trên BusyBox tối giản nơi <code>pstree</code> không tồn tại — và ' +
      'đó chính là hoàn cảnh bạn sẽ ở trong Chặng 06.</p>' },

    /* ══════════════════════════════════════════════
       4. TRẠNG THÁI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cột STAT: tiến trình đang làm gì lúc này' },

    { t: 'p', x:
      'Một tiến trình hầu như không bao giờ "đang chạy". Trên máy sáu nhân của bạn, nhiều nhất ' +
      'là sáu tiến trình thật sự chiếm CPU tại một thời điểm; tất cả những cái còn lại đang ' +
      '<b>ngủ chờ</b> một cái gì đó — gõ phím, gói tin mạng, dữ liệu từ đĩa.' },

    { t: 'table',
      head: ['Ký tự', 'Tên', 'Nghĩa'],
      rows: [
        ['<b>R</b>', 'running / runnable', 'Đang chạy trên CPU hoặc đang xếp hàng chờ tới lượt'],
        ['<b>S</b>', 'interruptible sleep', '<b>Trạng thái phổ biến nhất.</b> Đang ngủ chờ một sự kiện, và có thể bị tín hiệu đánh thức'],
        ['<b>D</b>', 'uninterruptible sleep', 'Đang chờ vào/ra ở mức thấp. <b>Không thể bị giết</b>, kể cả bằng <code>kill -9</code>'],
        ['<b>T</b>', 'stopped', 'Đã bị dừng bằng SIGSTOP hoặc <kbd>Ctrl</kbd>+<kbd>Z</kbd>. Vẫn còn nguyên trong RAM'],
        ['<b>Z</b>', 'zombie', 'Đã chết nhưng cha chưa thu hồi mã thoát. Xem phần cuối bài'],
        ['<b>I</b>', 'idle', 'Luồng nhân đang rỗi — chỉ thấy với tiến trình của kernel']
      ]},

    { t: 'table',
      head: ['Ký tự thêm', 'Nghĩa'],
      rows: [
        ['<code>s</code>', 'Trưởng phiên (<i>session leader</i>) — thường là shell đăng nhập của bạn'],
        ['<code>+</code>', 'Đang ở <b>tiền cảnh</b>, tức đang giữ bàn phím. Phần sau sẽ nói kỹ'],
        ['<code>l</code>', 'Có nhiều luồng'],
        ['<code>&lt;</code>', 'Độ ưu tiên cao (<code>nice</code> âm)'],
        ['<code>N</code>', 'Độ ưu tiên thấp (<code>nice</code> dương)']
      ]},

    { t: 'p', x:
      'Đếm xem máy bạn đang ở những trạng thái nào. Đây là kết quả thật, và nó nói rất nhiều:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'ps -e -o stat --no-headers | sort | uniq -c | sort -rn' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '     32 S\n' +
      '     12 Ss\n' +
      '      4 Ssl\n' +
      '      3 Ss+\n' +
      '      3 R+\n' +
      '      2 Sl+\n' +
      '      1 S<s\n' +
      '      1 S+' },

    { t: 'cal', kind: 'info', title: 'Gần như toàn bộ hệ thống đang ngủ', x:
      '<p>52 trên 58 tiến trình bắt đầu bằng <code>S</code>. Chỉ có <b>3</b> ở trạng thái ' +
      '<code>R+</code> — và ba cái đó chính là <code>ps</code>, <code>sort</code>, ' +
      '<code>uniq</code> mà bạn vừa gõ ra.</p>' +
      '<p>Đây là bản chất của một hệ điều hành đa nhiệm: CPU rỗi phần lớn thời gian, và mọi tiến ' +
      'trình đều đang chờ. Con số <code>load average 0.00</code> ở phần <code>top</code> bên dưới ' +
      'nói cùng một điều.</p>' },

    { t: 'cal', kind: 'warn', title: 'Trạng thái D là cơn ác mộng riêng của người làm nhúng', x:
      '<p>Tiến trình ở <code>D</code> đang kẹt trong một lời gọi vào/ra mà driver chưa trả lời. ' +
      'Kernel <b>từ chối</b> chuyển tín hiệu tới nó — đây là trạng thái duy nhất mà ' +
      '<code>kill -9</code> vô hiệu.</p>' +
      '<p>Trên máy để bàn nguyên nhân thường là ổ NFS mất mạng. Trên thiết bị nhúng, đó là driver ' +
      'bạn vừa viết: một lệnh đọc I2C không bao giờ trả về, một thao tác ghi flash treo. Thấy ' +
      '<code>D</code> kéo dài nghĩa là lỗi nằm <b>trong kernel</b>, không phải trong ứng dụng, và ' +
      'cách duy nhất thoát ra thường là khởi động lại.</p>' },

    /* ══════════════════════════════════════════════
       5. TOP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'top: bảng điều khiển thời gian thực' },

    { t: 'p', x:
      '<code>ps</code> chụp một tấm ảnh. <code>top</code> quay video: nó vẽ lại màn hình mỗi vài ' +
      'giây và sắp xếp tiến trình theo mức tiêu thụ CPU. Đây là lệnh đầu tiên bạn gõ khi một máy ' +
      'bỗng chậm bất thường.' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'top -b -n 1 | head -12' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'top - 16:32:40 up 0 min,  1 user,  load average: 0.00, 0.00, 0.00\n' +
      'Tasks:  56 total,   1 running,  55 sleeping,   0 stopped,   0 zombie\n' +
      '%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n' +
      'MiB Mem :   4918.1 total,   3230.4 free,    567.5 used,   1260.5 buff/cache\n' +
      'MiB Swap:   8192.0 total,   8192.0 free,      0.0 used.   4350.6 avail Mem\n' +
      '\n' +
      '    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n' +
      '      1 root      20   0   24112  15416  11636 S   0.0   0.3   0:00.55 systemd\n' +
      '      2 root      20   0    3180   2204   2072 S   0.0   0.0   0:00.00 init-sy+\n' +
      '      6 root      20   0    3180   2048   1940 S   0.0   0.0   0:00.00 init\n' +
      '     46 root      19  -1   42076  16560  15324 S   0.0   0.3   0:00.15 systemd+\n' +
      '     77 systemd+  20   0   22416  14504  12008 S   0.0   0.3   0:00.09 systemd+' },

    { t: 'cmdx', cmd: 'top -b -n 1', title: 'Vì sao thêm hai tuỳ chọn này',
      rows: [
        ['<code>-b</code>', '<i>batch</i> — in ra dạng văn bản thuần thay vì vẽ màn hình',
         'Bắt buộc khi muốn <code>| head</code> hay ghi vào file'],
        ['<code>-n 1</code>', 'Chỉ lấy <b>một</b> lần rồi thoát', 'Không có nó thì <code>top</code> chạy mãi'],
        ['<code>-o %MEM</code>', 'Sắp xếp theo RAM thay vì CPU', 'Rất hay dùng để truy tìm rò rỉ bộ nhớ'],
        ['<code>-p PID</code>', 'Chỉ theo dõi vài tiến trình', 'Tối đa 20 PID']
      ]},

    { t: 'table',
      head: ['Dòng', 'Đọc thế nào'],
      rows: [
        ['<code>up 0 min, 1 user</code>', 'Máy vừa bật, có một phiên đăng nhập'],
        ['<code>load average: 0.00, 0.00, 0.00</code>',
         'Số tiến trình trung bình đang chờ CPU, trong 1 · 5 · 15 phút gần nhất. Máy bạn có <b>6</b> nhân nên chỉ đáng lo khi vượt 6'],
        ['<code>Tasks: 56 total … 0 zombie</code>', 'Đúng con số bạn sẽ tự đếm bằng <code>ps -e | wc -l</code> ở phần thực hành'],
        ['<code>%Cpu(s): … 100.0 id</code>', '<b>id</b> = rỗi. <b>us</b> = mã người dùng, <b>sy</b> = mã kernel, <b>wa</b> = chờ vào/ra'],
        ['<code>MiB Mem: 4918.1 total</code>', 'RAM WSL2 cấp cho Ubuntu ở thời điểm này — WSL2 co giãn theo nhu cầu'],
        ['<code>PR</code> và <code>NI</code>', 'Độ ưu tiên. <code>NI</code> mặc định là <b>0</b>; systemd-journald được ưu tiên hơn với <code>-1</code>'],
        ['<code>TIME+</code>', 'Thời gian CPU tích luỹ. systemd mới dùng hết <b>0,55 giây</b> để dựng cả hệ thống']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao load average 4.0 có thể vô hại còn 0.5 lại là thảm hoạ', x:
      '<p>Con số đó là <b>số tiến trình trung bình đang tranh nhau CPU</b>, không phải phần trăm. ' +
      'Trên máy 6 nhân của bạn, load 4.0 nghĩa là còn dư chỗ. Trên một bo mạch nhúng một nhân, ' +
      'load 4.0 nghĩa là mỗi tiến trình chờ gấp bốn lần bình thường.</p>' +
      '<p>Vì thế luôn chia load cho <code>nproc</code>. Và trên Linux, load còn cộng cả tiến trình ' +
      'ở trạng thái <code>D</code> — nên một ổ flash hỏng có thể đẩy load lên 20 trong khi CPU ' +
      'rỗi hoàn toàn.</p>' },

    { t: 'cal', kind: 'tip', title: 'htop dễ nhìn hơn nhiều, nhưng máy bạn chưa có', x:
      '<p><code>htop</code> cho màu sắc, cuộn chuột, cây tiến trình và giết tiến trình bằng phím. ' +
      'Gõ <code>which htop</code> trên máy bạn sẽ không ra gì cả — nó chưa được cài.</p>' +
      '<p>Bài 12 sẽ dạy bạn cài nó. Nhưng hãy tập thành thạo <code>top</code> trước: ' +
      '<code>htop</code> gần như không bao giờ có mặt trên rootfs nhúng, còn ' +
      '<code>top</code> thì BusyBox có sẵn.</p>' },

    /* ══════════════════════════════════════════════
       6. JOB
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tiền cảnh, hậu cảnh và ai đang giữ bàn phím' },

    { t: 'p', x:
      'Khi bạn gõ <code>sleep 60</code>, terminal đứng im 60 giây. Không phải vì shell bận — mà ' +
      'vì shell đã <b>trao bàn phím</b> cho tiến trình con và ngồi chờ. Đó là chạy ở ' +
      '<b>tiền cảnh</b>. Thêm một ký tự <code>&amp;</code> vào cuối là mọi thứ đổi khác.' },

    { t: 'fig',
      cap: 'Chỉ một nhóm tiến trình được sở hữu bàn phím tại một thời điểm. Ctrl+Z, bg và fg là ba đường chuyển giữa ba trạng thái.',
      svg:
        '<svg viewBox="0 0 720 280" width="720" role="img" aria-label="Sơ đồ ba trạng thái job: tiền cảnh, hậu cảnh đang chạy, và bị dừng, cùng các lệnh chuyển đổi">' +
        '<rect class="d-box-p" x="270" y="20" width="180" height="56" rx="6"/>' +
        '<text class="d-t" x="360" y="42" text-anchor="middle">TIỀN CẢNH</text>' +
        '<text class="d-ts" x="360" y="60" text-anchor="middle">giữ bàn phím · STAT có dấu +</text>' +

        '<rect class="d-box-g" x="30" y="160" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="130" y="182" text-anchor="middle">HẬU CẢNH, ĐANG CHẠY</text>' +
        '<text class="d-ts" x="130" y="200" text-anchor="middle">jobs báo Running · STAT = S</text>' +

        '<rect class="d-box-w" x="490" y="160" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="590" y="182" text-anchor="middle">BỊ DỪNG</text>' +
        '<text class="d-ts" x="590" y="200" text-anchor="middle">jobs báo Stopped · STAT = T</text>' +

        '<line class="d-line" x1="290" y1="76" x2="150" y2="158"/>' +
        '<path class="d-arrow" d="M150 158 l1 -9 l6 5 z"/>' +
        '<text class="d-tm" x="150" y="112">&amp;  khi gõ lệnh</text>' +

        '<line class="d-line" x1="430" y1="76" x2="570" y2="158"/>' +
        '<path class="d-arrow" d="M570 158 l-7 -6 l-1 9 z"/>' +
        '<text class="d-t" x="450" y="112">Ctrl+Z</text>' +
        '<text class="d-ts" x="450" y="128">gửi SIGTSTP</text>' +

        '<line class="d-line" x1="530" y1="188" x2="240" y2="188"/>' +
        '<path class="d-arrow" d="M240 188 l8 -4 v8 z"/>' +
        '<text class="d-tm" x="330" y="180">bg %1</text>' +

        '<line class="d-line" x1="200" y1="158" x2="330" y2="80"/>' +
        '<path class="d-arrow" d="M330 80 l-7 6 l8 3 z"/>' +
        '<text class="d-tm" x="215" y="140">fg %1</text>' +

        '<line class="d-line" x1="620" y1="158" x2="620" y2="90"/>' +
        '<line class="d-line" x1="620" y1="90" x2="440" y2="60"/>' +
        '<path class="d-arrow" d="M440 60 l9 -1 l-5 -7 z"/>' +
        '<text class="d-tm" x="628" y="128">fg %2</text>' +

        '<text class="d-ts" x="30" y="252">Tiến trình hậu cảnh vẫn in ra terminal, nhưng nếu nó cố ĐỌC bàn phím thì bị dừng ngay (STAT = T, lý do là SIGTTIN).</text>' +
        '<text class="d-ts" x="30" y="270">Job là khái niệm của shell: đóng terminal đi thì bảng job biến mất, dù tiến trình có thể vẫn sống.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Thao tác', 'Làm gì', 'Ghi nhớ'],
      rows: [
        ['<code>lenh &amp;</code>', 'Chạy ngay ở hậu cảnh, shell trả prompt lại lập tức', 'In ra <code>[1] 412</code>: số job và PID'],
        ['<kbd>Ctrl</kbd>+<kbd>Z</kbd>', 'Dừng job tiền cảnh, đóng băng nó lại', 'Gửi SIGTSTP. Tiến trình <b>chưa chết</b>'],
        ['<kbd>Ctrl</kbd>+<kbd>C</kbd>', 'Yêu cầu job tiền cảnh thoát', 'Gửi SIGINT. Chương trình có quyền từ chối'],
        ['<code>jobs</code>', 'Liệt kê job của shell hiện tại', '<code>jobs -l</code> để thấy luôn PID'],
        ['<code>bg %1</code>', 'Cho job đang dừng chạy tiếp, ở hậu cảnh', 'Tương đương gửi SIGCONT'],
        ['<code>fg %1</code>', 'Kéo job lên tiền cảnh, trả bàn phím cho nó', 'Gõ <code>fg</code> không tham số là lấy job hiện tại'],
        ['<code>disown %1</code>', 'Xoá job khỏi bảng của shell', 'Tiến trình vẫn sống, chỉ là shell thôi theo dõi'],
        ['<code>nohup lenh &amp;</code>', 'Chạy nền và miễn nhiễm với SIGHUP khi đóng terminal', 'Ghi đầu ra vào <code>nohup.out</code> nếu đầu ra là terminal'],
        ['<code>$!</code>', 'Biến chứa PID của lệnh nền vừa chạy', 'Cách chuẩn để lưu PID trong script']
      ]},

    { t: 'cal', kind: 'info', title: 'Ký hiệu %: cách gọi tên job', x:
      '<ul>' +
      '<li><code>%1</code> <code>%2</code> — theo số job trong ngoặc vuông</li>' +
      '<li><code>%+</code> hoặc <code>%%</code> — job <b>hiện tại</b>, cái có dấu <code>+</code> ' +
      'trong <code>jobs</code></li>' +
      '<li><code>%-</code> — job trước đó, cái có dấu <code>-</code></li>' +
      '<li><code>%?chuoi</code> — job nào có dòng lệnh chứa chuỗi này</li>' +
      '</ul>' +
      '<p>Đừng nhầm <b>số job</b> với <b>PID</b>. <code>kill %1</code> giết job số 1; ' +
      '<code>kill 1</code> cố giết PID 1, tức systemd. Bạn sẽ bị từ chối, nhưng thói quen sai này ' +
      'có ngày sẽ đắt giá.</p>' },

    { t: 'cal', kind: 'warn', title: 'Job chết theo terminal, tiến trình thì không nhất thiết', x:
      '<p>Đóng cửa sổ terminal, kernel gửi <b>SIGHUP</b> cho cả nhóm tiến trình — hầu hết chương ' +
      'trình phản ứng bằng cách thoát. Đây là lý do một lệnh biên dịch chạy nền bốc hơi khi bạn ' +
      'đóng nhầm cửa sổ.</p>' +
      '<p>Muốn nó sống sót thì dùng <code>nohup</code>, <code>disown</code>, hoặc tốt hơn cả là ' +
      '<code>tmux</code>. Với lệnh <code>make</code> biên dịch kernel kéo dài 40 phút ở Chặng 04, ' +
      'đây không phải chi tiết nhỏ.</p>' },

    /* ══════════════════════════════════════════════
       7. TÍN HIỆU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tín hiệu: cách duy nhất để nói chuyện với tiến trình đang chạy' },

    { t: 'p', x:
      'Tín hiệu (<i>signal</i>) là một con số kernel gửi tới tiến trình để ngắt lời nó. Chương ' +
      'trình có thể <b>bắt</b> tín hiệu và tự quyết định phản ứng — hoặc mặc kệ và nhận hành vi ' +
      'mặc định, thường là chết. Linux có 64 tín hiệu; bạn chỉ cần nhớ bảy.' },

    { t: 'table',
      head: ['Số', 'Tên', 'Gửi bằng', 'Mặc định làm gì', 'Bắt được?'],
      rows: [
        ['<b>1</b>', '<code>SIGHUP</code>', 'Đóng terminal', 'Thoát', 'Có — dịch vụ thường dùng nó để <b>nạp lại cấu hình</b>'],
        ['<b>2</b>', '<code>SIGINT</code>', '<kbd>Ctrl</kbd>+<kbd>C</kbd>', 'Thoát', 'Có'],
        ['<b>9</b>', '<code>SIGKILL</code>', '<code>kill -9</code>', 'Chết ngay lập tức', '<b>KHÔNG</b>'],
        ['<b>15</b>', '<code>SIGTERM</code>', '<code>kill</code> không tham số', 'Thoát', 'Có — đây là <b>mặc định</b>'],
        ['<b>18</b>', '<code>SIGCONT</code>', '<code>bg</code>, <code>fg</code>', 'Chạy tiếp', 'Có'],
        ['<b>19</b>', '<code>SIGSTOP</code>', '<code>kill -STOP</code>', 'Dừng đóng băng', '<b>KHÔNG</b>'],
        ['<b>20</b>', '<code>SIGTSTP</code>', '<kbd>Ctrl</kbd>+<kbd>Z</kbd>', 'Dừng đóng băng', 'Có']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao SIGKILL và SIGSTOP không thể bắt được', x:
      '<p>Vì hệ thống cần <b>hai tín hiệu mà không chương trình nào chống lại được</b>. Nếu mọi ' +
      'tín hiệu đều bắt được thì một chương trình lỗi hoặc độc hại chỉ cần bắt hết là bất tử, và ' +
      'quản trị viên hết cách ngoài rút điện.</p>' +
      '<p>Cái giá phải trả là <code>SIGKILL</code> <b>không cho tiến trình một mili-giây nào để ' +
      'dọn dẹp</b>. Nó không đóng file, không ghi nốt bộ đệm, không lưu trạng thái. Kernel đơn ' +
      'giản là gỡ nó khỏi bảng.</p>' },

    { t: 'fig',
      cap: 'Thứ tự đúng luôn là TERM trước, chờ, rồi mới KILL. Đây chính là điều systemd làm khi bạn dừng một dịch vụ.',
      svg:
        '<svg viewBox="0 0 720 240" width="720" role="img" aria-label="So sánh quy trình dừng tiến trình bằng SIGTERM lịch sự và SIGKILL cưỡng bức">' +
        '<rect class="d-box-g" x="20" y="16" width="320" height="24" rx="4"/>' +
        '<text class="d-t" x="180" y="33" text-anchor="middle">kill -TERM  (tín hiệu 15)</text>' +
        '<rect class="d-box-w" x="380" y="16" width="320" height="24" rx="4"/>' +
        '<text class="d-t" x="540" y="33" text-anchor="middle">kill -KILL  (tín hiệu 9)</text>' +

        '<rect class="d-box" x="20" y="54" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="30" y="73">1. Chương trình nhận được tín hiệu</text>' +
        '<rect class="d-box" x="380" y="54" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="390" y="73">1. Kernel không báo cho chương trình biết gì cả</text>' +

        '<rect class="d-box" x="20" y="90" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="30" y="109">2. Ghi nốt bộ đệm xuống đĩa, đóng file</text>' +
        '<rect class="d-box" x="380" y="90" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="390" y="109">2. Bộ đệm trong RAM mất trắng</text>' +

        '<rect class="d-box" x="20" y="126" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="30" y="145">3. Xoá file khoá, ngắt kết nối gọn gàng</text>' +
        '<rect class="d-box" x="380" y="126" width="320" height="30" rx="4"/>' +
        '<text class="d-ts" x="390" y="145">3. File khoá ở lại — lần chạy sau báo lỗi</text>' +

        '<rect class="d-box-g" x="20" y="162" width="320" height="30" rx="4"/>' +
        '<text class="d-t" x="30" y="181">4. Thoát sạch · mã 143</text>' +
        '<rect class="d-box-w" x="380" y="162" width="320" height="30" rx="4"/>' +
        '<text class="d-t" x="390" y="181">4. Biến mất · mã 137</text>' +

        '<text class="d-ts" x="20" y="216">Nếu sau 5–10 giây tiến trình vẫn còn, LÚC ĐÓ mới dùng -9. Trên thiết bị nhúng, bước "ghi nốt bộ đệm" là thứ</text>' +
        '<text class="d-ts" x="20" y="232">quyết định dữ liệu của bạn nằm trên flash hay bốc hơi.</text>' +
        '</svg>' },

    { t: 'cmdx', cmd: 'kill [-TÍN_HIỆU] PID... | %JOB...', title: 'Các cách gọi kill',
      rows: [
        ['<code>kill 412</code>', 'Gửi SIGTERM — <b>mặc định</b>, và là lựa chọn đúng 95% thời gian', ''],
        ['<code>kill -9 412</code>', 'Gửi SIGKILL', 'Chỉ khi TERM đã thất bại'],
        ['<code>kill -TERM 412</code>', 'Dùng tên thay số — dễ đọc hơn trong script', 'Cũng viết được <code>-SIGTERM</code>'],
        ['<code>kill %1</code>', 'Gửi theo <b>số job</b> chứ không phải PID', 'Chỉ dùng được trong shell đã tạo job đó'],
        ['<code>kill -0 412</code>', '<b>Không gửi gì cả</b>, chỉ kiểm tra tiến trình còn sống không',
         'Mã thoát 0 = còn sống. Mẹo chuẩn trong script'],
        ['<code>kill -l</code>', 'Liệt kê toàn bộ tên tín hiệu', '<code>kill -l 9</code> in ra <code>KILL</code>'],
        ['<code>pkill -f "chuoi"</code>', 'Giết theo <b>dòng lệnh đầy đủ</b>', 'Cẩn thận: khớp rộng thì giết nhầm'],
        ['<code>pgrep -a ten</code>', 'Tìm PID theo tên, <code>-a</code> hiện luôn dòng lệnh', 'Luôn <code>pgrep</code> kiểm tra trước khi <code>pkill</code>']
      ]},

    { t: 'cal', kind: 'info', title: 'Mã thoát 128 + số tín hiệu', x:
      '<p>Khi một tiến trình chết vì tín hiệu, mã thoát của nó là <b>128 cộng số tín hiệu</b>:</p>' +
      '<ul>' +
      '<li><code>128 + 15</code> = <b>143</b> → chết vì SIGTERM</li>' +
      '<li><code>128 + 9</code> = <b>137</b> → chết vì SIGKILL</li>' +
      '<li><code>128 + 2</code> = <b>130</b> → bạn vừa bấm <kbd>Ctrl</kbd>+<kbd>C</kbd></li>' +
      '<li><code>128 + 11</code> = <b>139</b> → SIGSEGV, lỗi truy cập bộ nhớ sai</li>' +
      '</ul>' +
      '<p>Con số <b>137</b> đặc biệt đáng nhớ: khi một tiến trình biến mất và log ghi 137, thủ ' +
      'phạm hầu như luôn là kernel OOM killer — hết RAM. Trên bo mạch 512 MB, bạn sẽ gặp nó ' +
      'nhiều.</p>' +
      '<p>Bạn đã dùng <code>$?</code> từ Bài 4 để đọc mã thoát; đây là lớp ý nghĩa cuối cùng ' +
      'của nó.</p>' },

    { t: 'cal', kind: 'danger', title: 'Thói quen kill -9 là thứ phá hỏng thiết bị nhúng', x:
      '<p>Trên máy để bàn, <code>kill -9</code> một trình duyệt treo thì tệ nhất là mất vài tab. ' +
      'Trên thiết bị:</p>' +
      '<ul>' +
      '<li>Dữ liệu đo còn trong bộ đệm chưa <code>fsync()</code> xuống flash — <b>mất</b>.</li>' +
      '<li>File cấu hình đang ghi dở — hỏng, và lần khởi động sau thiết bị không lên được.</li>' +
      '<li>Thao tác xoá khối flash bị cắt giữa chừng — khối đó thành rác vĩnh viễn.</li>' +
      '</ul>' +
      '<p>Quy tắc: <code>kill</code> trước, đếm tới mười, <b>rồi</b> mới <code>kill -9</code>. ' +
      'Đó chính xác là điều systemd làm — biến <code>TimeoutStopSec</code> mặc định 90 giây, và ' +
      'bạn sẽ tự tay đặt nó ở Chặng 07.</p>' },

    /* ══════════════════════════════════════════════
       8. ZOMBIE & MỒ CÔI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Zombie và trẻ mồ côi' },

    { t: 'p', x:
      'Khi một tiến trình thoát, kernel <b>không</b> xoá nó ngay. Nó giữ lại một mục nhỏ chứa mã ' +
      'thoát, chờ tiến trình cha gọi <code>wait()</code> để nhận. Khoảng thời gian giữa "đã chết" ' +
      'và "cha đã nhận xác" chính là trạng thái <b>zombie</b>.' },

    { t: 'terms', items: [
      ['Zombie', 'defunct', 'Tiến trình <b>đã chết</b> nhưng cha chưa thu hồi mã thoát. Nó không ' +
       'chiếm RAM, không chiếm CPU — chỉ chiếm một dòng trong bảng tiến trình và <b>một số PID</b>.'],
      ['Mồ côi', 'orphan', 'Tiến trình <b>còn sống</b> nhưng cha đã chết. Kernel gán nó cho một ' +
       'tiến trình nhận nuôi, thường là PID 1.'],
      ['Thu hoạch', 'reap', 'Việc cha gọi <code>wait()</code> để nhận mã thoát, nhờ đó zombie biến mất.']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao zombie tồn tại thay vì kernel dọn luôn cho gọn', x:
      '<p>Vì mã thoát là <b>thông tin thuộc về cha</b>. Ở Bài 4 bạn dùng <code>$?</code> để biết ' +
      'lệnh vừa rồi thành công hay không — con số đó phải được giữ ở đâu đó cho tới khi bạn hỏi. ' +
      'Nếu kernel xoá sạch ngay khi tiến trình chết, mọi script kiểm tra kết quả sẽ vô nghĩa.</p>' +
      '<p>Một hoặc hai zombie thoáng qua là hoàn toàn bình thường. Vấn đề chỉ xuất hiện khi ' +
      'chúng <b>tích tụ</b>: một daemon viết ẩu đẻ con liên tục mà không bao giờ ' +
      '<code>wait()</code> sẽ vắt cạn kho PID, và rồi <code>fork</code> thất bại trên toàn hệ ' +
      'thống. Triệu chứng: máy còn đầy RAM nhưng không chạy nổi lệnh nào.</p>' },

    { t: 'cal', kind: 'warn', title: 'Không thể "giết" một zombie — nó đã chết rồi', x:
      '<p><code>kill -9</code> một zombie hoàn toàn vô tác dụng. Cách duy nhất là làm ' +
      '<b>cha</b> của nó gọi <code>wait()</code> — hoặc giết luôn người cha, để zombie được PID 1 ' +
      'nhận nuôi và dọn hộ.</p>' +
      '<p>Vì thế khi thấy zombie chồng chất, đừng nhìn vào zombie. Hãy nhìn vào cột ' +
      '<code>PPID</code> của chúng: <b>đó mới là chương trình có lỗi.</b></p>' },

    /* ══════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: điều khiển tiến trình bằng tay' },

    { t: 'cal', kind: 'warn', title: 'Số PID trên máy bạn sẽ khác', x:
      '<p>Mọi PID trong phần này đều là số thật lấy từ máy bạn, nhưng chúng đổi sau mỗi lần khởi ' +
      'động. Đừng gõ lại con số — hãy đọc con số của <b>chính bạn</b> và làm theo. Bố cục và ' +
      'chữ nghĩa của đầu ra thì luôn giống hệt.</p>' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Tìm chính bạn trong danh sách 56 tiến trình',
        blocks: [
          { t: 'p', x:
            '<code>ps</code> không tham số chỉ hiện tiến trình của <b>terminal hiện tại</b>. Đó là ' +
            'danh sách ngắn nhất và cũng là điểm khởi đầu dễ hiểu nhất.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'mkdir -p ~/embedded/bai09 && cd ~/embedded/bai09\nps\nps -f' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '    PID TTY          TIME CMD\n' +
            '    314 pts/0    00:00:00 bash\n' +
            '    425 pts/0    00:00:00 ps\n' +
            'UID          PID    PPID  C STIME TTY          TIME CMD\n' +
            'shinarus     314     313  0 16:32 pts/0    00:00:00 bash\n' +
            'shinarus     426     314  0 16:32 pts/0    00:00:00 ps -f' },
          { t: 'cal', kind: 'info', title: 'Hai dòng này kể trọn câu chuyện fork và exec', x:
            '<p><code>bash</code> là PID <b>314</b>. <code>ps -f</code> là PID <b>426</b> với ' +
            '<code>PPID = 314</code> — nó là <b>con của shell</b>, đúng như sơ đồ ở đầu bài.</p>' +
            '<p>Chú ý PID của <code>ps</code> đổi từ 425 sang 426 giữa hai lệnh: mỗi lần gõ, shell ' +
            '<code>fork</code> một tiến trình <b>hoàn toàn mới</b>. Chương trình <code>/bin/ps</code> ' +
            'trên đĩa thì vẫn chỉ có một.</p>' +
            '<p><code>pts/0</code> là terminal giả bạn đang gõ vào. Tiến trình nào hiện ' +
            '<code>?</code> ở cột này là dịch vụ nền, không gắn với bàn phím nào.</p>' },
          { t: 'p', x: 'Shell cũng tự biết PID của mình qua hai biến dựng sẵn:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'echo "shell PID = $$"\necho "PPID = $PPID"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'shell PID = 314\n' +
            'PPID = 313' },
          { t: 'p', x: 'Bây giờ đếm toàn bộ máy:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'ps -e --no-headers | wc -l' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code: '56' },
          { t: 'cal', kind: 'tip', title: '56 tiến trình cho một máy chưa làm gì cả', x:
            '<p>Con số này là thước đo tốt để so sánh. Một rootfs BusyBox tối giản mà bạn dựng ở ' +
            'Chặng 06 sẽ chạy với khoảng <b>10</b> tiến trình. Một máy để bàn Ubuntu đầy đủ có thể ' +
            'vượt 300.</p>' +
            '<p>Mỗi tiến trình là RAM, là công chuyển ngữ cảnh, là bề mặt tấn công. Trên thiết bị ' +
            '128 MB RAM, <b>biết tại sao từng tiến trình có mặt</b> là một phần công việc.</p>' } ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Dựng lại cây tiến trình từ gốc',
        blocks: [
          { t: 'p', x: 'Trước hết, nhìn tận mặt PID 1:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ps -p 1 -o pid,ppid,user,comm,args --no-headers\ncat /proc/1/comm' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '      1       0 root     systemd         /sbin/init\n' +
            'systemd' },
          { t: 'cal', kind: 'info', title: 'PPID bằng 0 — dấu hiệu của gốc cây', x:
            '<p>Không có tiến trình nào mang PID 0, nên số 0 ở đây nghĩa là "không có cha". PID 1 ' +
            'là tiến trình duy nhất trên máy có tính chất đó.</p>' +
            '<p><code>comm</code> là <code>systemd</code> nhưng <code>args</code> là ' +
            '<code>/sbin/init</code> — hai cột khác nhau: <code>comm</code> là tên tiến trình ' +
            '(tối đa 15 ký tự), <code>args</code> là dòng lệnh thật. Trên Ubuntu, ' +
            '<code>/sbin/init</code> là liên kết mềm trỏ tới systemd, đúng như kiểu liên kết bạn ' +
            'đã mổ xẻ ở Bài 6.</p>' },
          { t: 'p', x: 'Vẽ cây bằng <code>pstree</code>:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'pstree -p 1 | head -9' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'systemd(1)-+-agetty(273)\n' +
            '           |-chronyd-starter(137)---chronyd(220)---chronyd(226)\n' +
            '           |-cron(139)\n' +
            '           |-dbus-daemon(140)\n' +
            '           |-init-systemd(Ub(2)-+-SessionLeader(312)---Relay(314)(313)---bash(314)-+-head(438)\n' +
            '           |                    |                                                  `-pstree(437)\n' +
            '           |                    |-init(6)---{init}(7)\n' +
            '           |                    |-login(315)---bash(387)\n' +
            '           |                    `-{init-systemd(Ub}(8)' },
          { t: 'p', x:
            'Và cách làm không cần <code>pstree</code> — quan trọng vì thiết bị nhúng thường không ' +
            'có lệnh đó:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ps -e -o pid,ppid,comm --forest | head -14' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '    PID    PPID COMMAND\n' +
            '      1       0 systemd\n' +
            '      2       1 init-systemd(Ub\n' +
            '      6       2  \\_ init\n' +
            '    312       2  \\_ SessionLeader\n' +
            '    313     312  |   \\_ Relay(314)\n' +
            '    314     313  |       \\_ bash\n' +
            '    439     314  |           \\_ ps\n' +
            '    440     314  |           \\_ head\n' +
            '    315       2  \\_ login\n' +
            '    387     315      \\_ bash\n' +
            '     46       1 systemd-journal\n' +
            '     77       1 systemd-resolve\n' +
            '     87       1 systemd-udevd' },
          { t: 'cal', kind: 'why', title: 'Chuỗi SessionLeader → Relay → bash là dấu vân tay của WSL2', x:
            '<p>Trên một máy Linux thật, cây sẽ là <code>systemd → sshd → bash</code> hoặc ' +
            '<code>systemd → getty → login → bash</code>. Trên WSL2 có thêm hai mắt xích: ' +
            '<code>SessionLeader</code> và <code>Relay</code> — đó là cầu nối chuyển dữ liệu bàn ' +
            'phím và màn hình giữa Windows và máy ảo Linux.</p>' +
            '<p>Bạn <b>thấy được</b> ranh giới kiến trúc mà Bài 2 đã mô tả, ngay trong cột PPID. ' +
            'Đây là điểm mạnh của việc học bằng WSL2: mọi lớp trừu tượng đều lộ ra thay vì bị giấu.</p>' } ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Đọc top và đếm trạng thái toàn hệ thống',
        blocks: [
          { t: 'p', x:
            'Chạy <code>top</code> ở chế độ một-lần để đầu ra nằm yên cho bạn đọc kỹ. Khi nào ' +
            'muốn xem thời gian thực thì gõ <code>top</code> trần và bấm <kbd>q</kbd> để thoát.' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'top -b -n 1 | head -5' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'top - 16:32:40 up 0 min,  1 user,  load average: 0.00, 0.00, 0.00\n' +
            'Tasks:  56 total,   1 running,  55 sleeping,   0 stopped,   0 zombie\n' +
            '%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n' +
            'MiB Mem :   4918.1 total,   3230.4 free,    567.5 used,   1260.5 buff/cache\n' +
            'MiB Swap:   8192.0 total,   8192.0 free,      0.0 used.   4350.6 avail Mem' },
          { t: 'cal', kind: 'info', title: 'Số 56 xuất hiện ở hai chỗ độc lập', x:
            '<p><code>Tasks: 56 total</code> khớp chính xác với <code>ps -e | wc -l</code> ở bước ' +
            '1. Hai lệnh hoàn toàn khác nhau, cùng đọc từ một nguồn: thư mục <code>/proc</code> mà ' +
            'bạn đã khám phá ở Bài 5.</p>' +
            '<p><code>0 zombie</code> — lát nữa bạn sẽ tự tạo ra một con và nhìn con số này nhảy ' +
            'lên 1.</p>' },
          { t: 'p', x: 'Đối chiếu load average với số nhân của máy:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'cat /proc/loadavg\nnproc' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '0.00 0.00 0.00 1/241 445\n' +
            '6' },
          { t: 'cal', kind: 'tip', title: 'Đọc dòng /proc/loadavg', x:
            '<p>Ba số đầu là load 1 · 5 · 15 phút. Rồi <code>1/241</code> nghĩa là ' +
            '<b>1 tiến trình đang chạy trên tổng 241 luồng</b> — con số 241 lớn hơn 56 vì nó đếm ' +
            'cả luồng, tức những mục <code>{tên}</code> bạn thấy trong <code>pstree</code>. Số ' +
            'cuối <code>445</code> là PID được cấp gần nhất.</p>' +
            '<p><code>nproc</code> cho <b>6</b> — đúng cấu hình <code>nr_cpus=6</code> mà bạn đã ' +
            'đọc từ <code>/proc/cmdline</code> ở Bài 5. Load 0.00 trên 6 nhân là máy đang rỗi hoàn ' +
            'toàn.</p>' },
          { t: 'p', x: 'Cuối cùng, thống kê trạng thái:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ps -e -o stat --no-headers | sort | uniq -c | sort -rn' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '     32 S\n' +
            '     12 Ss\n' +
            '      4 Ssl\n' +
            '      3 Ss+\n' +
            '      3 R+\n' +
            '      2 Sl+\n' +
            '      1 S<s\n' +
            '      1 S+' },
          { t: 'cal', kind: 'info', title: 'Ba tiến trình R+ chính là câu lệnh bạn vừa gõ', x:
            '<p><code>ps</code>, <code>sort</code>, <code>uniq</code> — ba lệnh nối bằng ' +
            '<code>|</code> chạy <b>đồng thời</b>, không phải lần lượt. Đây là lần đầu bạn nhìn ' +
            'thấy bằng chứng của điều đó, và Bài 10 sẽ giải thích cặn kẽ vì sao đường ống hoạt ' +
            'động như vậy.</p>' +
            '<p><code>S&lt;s</code> duy nhất là <code>systemd-journald</code> — dấu ' +
            '<code>&lt;</code> nghĩa là nó được ưu tiên cao hơn bình thường, khớp với ' +
            '<code>NI = -1</code> trong bảng <code>top</code>.</p>' } ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Đưa lệnh xuống hậu cảnh và quản lý bằng jobs',
        blocks: [
          { t: 'p', x:
            'Chạy ba lệnh <code>sleep</code> ở hậu cảnh. Mỗi lệnh trả prompt về ngay lập tức — ' +
            'đó chính là điểm khác biệt.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'sleep 60 &\n' +
            'echo "background PID = $!"\n' +
            'sleep 30 &\n' +
            'sleep 45 &\n' +
            'jobs' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'background PID = 2884\n' +
            '[1]   Running                    sleep 60 &\n' +
            '[2]-  Running                    sleep 30 &\n' +
            '[3]+  Running                    sleep 45 &' },
          { t: 'cal', kind: 'info', title: 'Dấu + và - trong bảng job', x:
            '<p><code>[3]+</code> là job <b>hiện tại</b> — cái mà <code>fg</code> và ' +
            '<code>bg</code> không tham số sẽ nhắm tới. <code>[2]-</code> là job liền trước. Job ' +
            '<code>[1]</code> không có dấu gì.</p>' +
            '<p>Biến <code>$!</code> giữ PID của lệnh nền <b>vừa</b> chạy. Trong script thật, đây ' +
            'là cách duy nhất đúng để lưu lại PID: <code>PID=$!</code> ngay dòng sau lệnh.</p>' },
          { t: 'p', x: 'Xem PID và đối chiếu với <code>ps</code>:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'jobs -l\nps -o pid,ppid,stat,comm' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[1]   2884 Running                    sleep 60 &\n' +
            '[2]-  2885 Running                    sleep 30 &\n' +
            '[3]+  2886 Running                    sleep 45 &\n' +
            '    PID    PPID STAT COMMAND\n' +
            '   2878    2876 Ss+  bash\n' +
            '   2884    2878 S    sleep\n' +
            '   2885    2878 S    sleep\n' +
            '   2886    2878 S    sleep\n' +
            '   2887    2878 R    ps' },
          { t: 'cal', kind: 'why', title: 'Đọc cột STAT ở đây là hiểu toàn bộ job control', x:
            '<p>Ba tiến trình <code>sleep</code> ở <code>S</code> — <b>không</b> có dấu ' +
            '<code>+</code>. Chỉ <code>bash</code> mang <code>Ss+</code>: dấu <code>+</code> nghĩa ' +
            'là <b>nó đang giữ bàn phím</b>.</p>' +
            '<p>Cả bốn tiến trình con đều có <code>PPID = 2878</code>, tức shell của bạn. Bảng ' +
            '<code>jobs</code> chỉ là cách shell ghi chép về chính những đứa con này — kernel ' +
            'không biết gì về khái niệm "job số 1".</p>' },
          { t: 'p', x: 'Giết một job bằng <b>số job</b>, không phải PID:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'kill %2\nsleep 1\njobs\njobs' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[1]   Running                    sleep 60 &\n' +
            '[2]-  Terminated                 sleep 30\n' +
            '[3]+  Running                    sleep 45 &\n' +
            '[1]-  Running                    sleep 60 &\n' +
            '[3]+  Running                    sleep 45 &' },
          { t: 'cal', kind: 'tip', title: 'Vì sao phải gõ jobs hai lần', x:
            '<p>Lần đầu, shell <b>báo cáo</b> job số 2 đã chết rồi mới xoá nó khỏi bảng. Lần thứ ' +
            'hai, nó đã biến mất — và job <code>[1]</code> lên làm job trước đó nên nhận dấu ' +
            '<code>-</code>.</p>' +
            '<p>Đây là lý do trong terminal thật, thông báo <code>[2]- Done</code> thường chỉ hiện ' +
            'ra khi bạn bấm Enter lần tiếp theo: shell đợi tới lúc in prompt mới báo tin.</p>' } ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Dừng, chạy tiếp, rồi giết bằng đúng tín hiệu',
        blocks: [
          { t: 'p', x:
            'Bấm <kbd>Ctrl</kbd>+<kbd>Z</kbd> chính là gửi <b>SIGTSTP</b>. Bạn có thể gửi thẳng ' +
            'tín hiệu đó để thấy kết quả giống hệt mà không cần lệnh nào chạy ở tiền cảnh:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'sleep 100 &\n' +
            'kill -TSTP %1\n' +
            'sleep 1\n' +
            'jobs -l\n' +
            'ps -o pid,stat,comm -p $(jobs -p) --no-headers' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[1]+  Stopped                    sleep 100\n' +
            '[1]+   411 Stopped                    sleep 100\n' +
            '    411 T    sleep' },
          { t: 'cal', kind: 'info', title: 'Trạng thái T: còn nguyên trong RAM nhưng không được cấp CPU', x:
            '<p>Tiến trình <b>không chết</b>. Nó vẫn giữ bộ nhớ, vẫn giữ file đang mở, chỉ là bộ ' +
            'lập lịch không bao giờ chọn nó nữa. Đồng hồ <code>sleep</code> cũng đứng theo.</p>' +
            '<p>Đây là cách bạn tạm treo một tiến trình ngốn CPU để làm việc khác, rồi thả ra ' +
            'sau.</p>' },
          { t: 'p', x: 'Thả cho nó chạy tiếp ở hậu cảnh — đây chính là việc <code>bg</code> làm:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'bg %1\nsleep 1\njobs\nps -o pid,stat,comm -p $(jobs -p) --no-headers' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[1]+ sleep 100 &\n' +
            '[1]+  Running                    sleep 100 &\n' +
            '    411 S    sleep' },
          { t: 'p', x: 'Cùng PID <b>411</b>, trạng thái quay từ <code>T</code> về <code>S</code>. Giờ giết nó:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'kill %1\nsleep 1\njobs' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[1]+  Terminated                 sleep 100' },
          { t: 'h4', x: 'Mã thoát nói cho bạn biết tín hiệu nào đã hạ nó' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'sleep 30 &\nP=$!\nkill -TERM $P\nwait $P\necho "exit code after SIGTERM = $?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'exit code after SIGTERM = 143' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'sleep 30 &\nP=$!\nkill -KILL $P\nwait $P\necho "exit code after SIGKILL = $?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: line 5:  2831 Killed                     sleep 30\n' +
            'exit code after SIGKILL = 137' },
          { t: 'cal', kind: 'info', title: '143 và 137 — hai con số bạn sẽ gặp suốt sự nghiệp', x:
            '<p><code>128 + 15 = 143</code> và <code>128 + 9 = 137</code>. Để ý bash còn in thêm ' +
            'chữ <code>Killed</code> cho trường hợp thứ hai nhưng không in gì cho trường hợp đầu: ' +
            'nó coi SIGTERM là kết cục bình thường, còn SIGKILL là bất thường đáng báo.</p>' +
            '<p>Khi container hoặc dịch vụ của bạn biến mất và log ghi <b>exit code 137</b>, hãy ' +
            'nghĩ ngay tới hết RAM — kernel OOM killer gửi SIGKILL.</p>' },
          { t: 'h4', x: 'Kiểm tra một tiến trình còn sống mà không đụng vào nó' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'sleep 20 &\nQ=$!\nkill -0 $Q; echo "process alive: rc=$?"\n' +
            'kill -9 $Q; sleep 1\nkill -0 $Q; echo "process dead: rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'process alive: rc=0\n' +
            'bash: line 6:  2806 Killed                     sleep 20\n' +
            'bash: line 6: kill: (2806) - No such process\n' +
            'process dead: rc=1' },
          { t: 'cal', kind: 'tip', title: 'kill -0 là cách chuẩn để hỏi "còn sống không"', x:
            '<p>Tín hiệu số 0 không tồn tại. <code>kill</code> chỉ thực hiện <b>kiểm tra quyền và ' +
            'kiểm tra tồn tại</b> rồi dừng lại — không gửi gì cả. Mã thoát 0 nghĩa là "có, và bạn ' +
            'được phép gửi tín hiệu cho nó".</p>' +
            '<p>Bạn sẽ dùng đúng mẫu này ở Bài 13 khi viết script giám sát, và ở Chặng 07 khi viết ' +
            'script khởi động dịch vụ.</p>' } ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Viết một chương trình từ chối chết, rồi buộc nó phải chết',
        blocks: [
          { t: 'p', x:
            'Bảng tín hiệu nói SIGTERM bắt được còn SIGKILL thì không. Bước này chứng minh điều ' +
            'đó bằng một script mười dòng. Lệnh <code>trap</code> đăng ký hàm xử lý cho một tín ' +
            'hiệu — Bài 13 sẽ dùng nó nghiêm túc, ở đây chỉ cần biết nó "bắt" tín hiệu.' },
          { t: 'code', where: 'file', lang: 'bash', name: '~/embedded/bai09/stubborn.sh', code:
            '#!/bin/bash\n' +
            "trap 'echo \"[stubborn] received SIGTERM, not going anywhere\"' TERM\n" +
            "trap 'echo \"[stubborn] received SIGINT, not that either\"' INT\n" +
            'echo "[stubborn] starting, PID=$$"\n' +
            'while true; do sleep 1; done' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod +x stubborn.sh\n./stubborn.sh &\nB=$!\nsleep 1' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[stubborn] starting, PID=4312' },
          { t: 'p', x: 'Gửi SIGTERM — tín hiệu mà <code>kill</code> dùng mặc định:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'kill -TERM $B\nsleep 1\nps -o pid,stat,comm -p $B' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[stubborn] received SIGTERM, not going anywhere\n' +
            '    PID STAT COMMAND\n' +
            '   4312 S    stubborn.sh' },
          { t: 'p', x: 'Thử SIGINT, tức <kbd>Ctrl</kbd>+<kbd>C</kbd>:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'kill -INT $B\nsleep 1\nps -o pid,stat,comm -p $B --no-headers' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[stubborn] received SIGINT, not that either\n' +
            '   4312 S    stubborn.sh' },
          { t: 'p', x: 'Bây giờ tín hiệu không ai chống được:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'kill -KILL $B\nsleep 1\nps -o pid,stat,comm -p $B --no-headers\necho "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: line 32:  4312 Killed                     ./stubborn.sh\n' +
            'rc=1' },
          { t: 'cal', kind: 'why', title: 'Bạn vừa chứng minh vì sao Ctrl+C đôi khi không có tác dụng', x:
            '<p>Không phải terminal treo. Chương trình <b>đã nhận</b> tín hiệu và <b>chọn</b> ' +
            'không thoát. Rất nhiều chương trình làm thế một cách chính đáng: trình soạn thảo hỏi ' +
            '"lưu chưa?", trình cài đặt từ chối bỏ dở giữa chừng, dịch vụ ghi nốt dữ liệu.</p>' +
            '<p>Đó cũng là lý do <code>SIGHUP</code> được các daemon dùng lại thành lệnh "nạp lại ' +
            'cấu hình": tín hiệu là một kênh liên lạc, không nhất thiết là án tử.</p>' +
            '<p>Và đây là lý do <code>kill -9</code> tồn tại. Nhưng để ý thứ tự bạn vừa làm: TERM ' +
            'trước, quan sát, rồi mới KILL. Đừng đảo ngược nó thành thói quen.</p>' } ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Tạo một zombie thật và một đứa trẻ mồ côi',
        blocks: [
          { t: 'p', x:
            'Bash tự động thu hoạch con rất nhanh nên khó bắt quả tang zombie bằng shell. ' +
            '<code>perl</code> thì không — nó <code>fork</code> ra một con, con chết ngay, còn cha ' +
            'thì đi ngủ mà không thèm gọi <code>wait()</code>.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "perl -e 'my $p=fork(); if($p==0){ exit 0 } print \"parent=$$ child=$p\\n\"; sleep 6;' &\n" +
            'sleep 1\n' +
            'ps -e -o pid,ppid,stat,comm,args | grep -i defunct' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '    412     410 Z    perl            [perl] <defunct>' },
          { t: 'p', x: 'Đối chiếu với hai bộ đếm toàn hệ thống:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ps -e -o stat --no-headers | sort | uniq -c | sort -rn | head -8\n' +
            'top -b -n 1 | head -2' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '     34 S\n' +
            '     12 Ss\n' +
            '      4 Ssl\n' +
            '      3 Ss+\n' +
            '      2 Sl+\n' +
            '      2 Sl\n' +
            '      1 Z\n' +
            '      1 S<s\n' +
            'top - 16:34:30 up 1 min,  1 user,  load average: 0.16, 0.08, 0.02\n' +
            'Tasks:  58 total,   1 running,  56 sleeping,   0 stopped,   1 zombie' },
          { t: 'cal', kind: 'info', title: 'Con số 0 zombie ở bước 3 vừa nhảy lên 1', x:
            '<p>Ba nguồn độc lập cùng nói một điều: dòng <code>Z</code> trong <code>ps</code>, ' +
            'chữ <code>&lt;defunct&gt;</code> ở cột lệnh, và bộ đếm <code>1 zombie</code> của ' +
            '<code>top</code>.</p>' +
            '<p>Cột <code>PPID = 410</code> chỉ thẳng vào kẻ có lỗi: tiến trình perl cha. Zombie ' +
            'không phải vấn đề — <b>người cha lười gọi <code>wait()</code></b> mới là vấn đề.</p>' },
          { t: 'p', x: 'Chờ tiến trình cha thoát rồi kiểm tra lại:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'wait\nps -e -o pid,ppid,stat,comm | grep -i defunct\necho "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'rc=1' },
          { t: 'cal', kind: 'why', title: 'Zombie biến mất khi cha chết, không phải khi ta giết zombie', x:
            '<p>Cha thoát → zombie thành mồ côi → tiến trình nhận nuôi lập tức gọi ' +
            '<code>wait()</code> và dọn sạch. <code>grep</code> không tìm thấy gì nên trả mã ' +
            '<b>1</b>.</p>' +
            '<p>Ghi nhớ quy trình xử lý khi gặp zombie chồng chất trên thiết bị: tìm PPID → khởi ' +
            'động lại <b>tiến trình cha</b> → zombie tự tan.</p>' },
          { t: 'h4', x: 'Và bây giờ là đứa trẻ mồ côi' },
          { t: 'code', where: 'file', lang: 'bash', name: '~/embedded/bai09/orphan.sh', code:
            '#!/bin/bash\n' +
            'sleep 8 &\n' +
            'echo "child PID=$! ; parent PID=$$"' },
          { t: 'p', x:
            'Script này chạy <code>sleep 8</code> ở hậu cảnh rồi <b>thoát ngay</b>. Đứa con còn ' +
            'sống thêm tám giây nữa trong khi cha nó đã chết.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod +x orphan.sh\n./orphan.sh\nsleep 1\npgrep -af "sleep 8"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'child PID=4327 ; parent PID=4326\n' +
            '4327 sleep 8' },
          { t: 'p', x: 'Cha là PID 4326 và nó đã chết. Vậy giờ ai là cha của 4327?' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ps -o pid,ppid,stat,comm -p 4327 --no-headers\n' +
            'ps -o pid,ppid,user,comm,args -p 4299 --no-headers' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '   4327    4299 S    sleep\n' +
            '   4299    4298 root     Relay(4301)      /init' },
          { t: 'cal', kind: 'info', title: 'Trên WSL2, kẻ nhận nuôi không phải PID 1', x:
            '<p>PPID của đứa trẻ đổi từ <b>4326</b> sang <b>4299</b> — tiến trình <code>/init</code> ' +
            'của WSL. Linux hiện đại cho phép một tiến trình tự đăng ký làm <i>subreaper</i>, tức ' +
            '"người nhận nuôi con cháu trong nhánh của tôi". WSL dùng cơ chế này, systemd cũng ' +
            'dùng nó cho từng dịch vụ.</p>' +
            '<p>Trên rootfs nhúng đơn giản không có subreaper, PPID sẽ đổi thẳng thành <b>1</b>. ' +
            'Nguyên tắc thì không đổi: <b>trẻ mồ côi luôn được ai đó nhận nuôi</b>, và nhờ vậy ' +
            'chúng luôn có người dọn xác.</p>' },
          { t: 'p', x: 'Dọn dẹp:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'pkill -9 -f stubborn\npkill -9 sleep\ncd ~\nrm -rf ~/embedded/bai09\nls ~/embedded' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bai03\nbai04\nbai05\nbai07\nbai19\nbai20\nbai21\nbai22\nbai23\nbai24\nimages' },
          { t: 'cal', kind: 'warn', title: 'pkill -9 sleep giết MỌI tiến trình tên sleep', x:
            '<p>Ở đây vô hại vì chỉ có tiến trình của bạn. Trên máy chủ dùng chung hoặc trên thiết ' +
            'bị đang chạy dịch vụ, một khuôn khớp quá rộng sẽ hạ luôn thứ bạn không định đụng tới.</p>' +
            '<p>Thói quen an toàn: chạy <code>pgrep -a khuon</code> <b>trước</b> để nhìn danh sách ' +
            'nạn nhân, rồi mới đổi thành <code>pkill</code>.</p>' } ]}
    ]},

    /* ══════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: kill: (435) - No such process</code>',
         'Tiến trình đã chết trước khi tín hiệu tới nơi, hoặc PID gõ sai',
         'Kiểm tra bằng <code>kill -0 PID</code> trước. Trong script luôn dùng <code>$!</code> thay vì gõ số'],
        ['<code>bash: kill: (1) - Operation not permitted</code>',
         'Bạn cố gửi tín hiệu cho tiến trình của người dùng khác',
         'Chỉ chủ sở hữu tiến trình hoặc root mới gửi được. Dùng <code>sudo kill</code> — xem lại Bài 8'],
        ['<code>bash: bg: current: no such job</code>',
         'Không có job nào đang dừng, hoặc bạn đang ở một shell khác với shell đã tạo job',
         'Gõ <code>jobs</code> để xem bảng thật. Bảng job <b>không</b> chia sẻ giữa các terminal'],
        ['<code>kill %1</code> báo <code>no such job</code> dù <code>ps</code> vẫn thấy tiến trình',
         'Job đã bị <code>disown</code>, hoặc tiến trình do shell khác tạo ra',
         'Chuyển sang dùng PID: <code>kill $(pgrep -f "khuon")</code>'],
        ['<code>kill -9</code> không có tác dụng, tiến trình vẫn còn',
         'Tiến trình đang ở trạng thái <b>D</b> — kẹt trong vào/ra không thể ngắt',
         '<code>ps -o pid,stat,wchan -p PID</code> để xem nó kẹt ở hàm nào của kernel. Thường phải khởi động lại'],
        ['Zombie không chết dù đã <code>kill -9</code>',
         'Zombie đã chết rồi, tín hiệu vô nghĩa với nó',
         'Xem cột <code>PPID</code>, khởi động lại tiến trình <b>cha</b>'],
        ['Lệnh chạy nền biến mất khi đóng terminal',
         'Kernel gửi SIGHUP cho cả nhóm tiến trình khi terminal đóng',
         '<code>nohup lenh &amp;</code>, hoặc <code>disown</code> sau khi đã chạy, hoặc dùng <code>tmux</code>'],
        ['<code>nohup: ignoring input and appending output to \'nohup.out\'</code>',
         'Không phải lỗi — <code>nohup</code> đang báo nó chuyển hướng đầu ra giúp bạn',
         'Muốn chọn chỗ khác thì <code>nohup lenh &gt; log.txt 2&gt;&amp;1 &amp;</code>'],
        ['Tiến trình nền in chữ đè lên prompt của bạn',
         'Job hậu cảnh vẫn được ghi vào terminal, chỉ bị cấm <b>đọc</b>',
         'Chuyển hướng đầu ra vào file ngay khi chạy: <code>lenh &gt; out.txt 2&gt;&amp;1 &amp;</code>'],
        ['Job hậu cảnh tự nhiên chuyển sang trạng thái <code>T</code>',
         'Nó cố đọc bàn phím và bị kernel dừng lại bằng SIGTTIN',
         '<code>fg %1</code> để kéo lên tiền cảnh và trả lời nó, hoặc cấp dữ liệu qua file'],
        ['<code>ps: command not found</code> trên thiết bị nhúng',
         'Rootfs tối giản, BusyBox chưa bật applet <code>ps</code>',
         'Đọc thẳng <code>/proc</code>: <code>cat /proc/*/comm</code> — kỹ thuật của Bài 5 luôn dùng được']
      ]},

    /* ══════════════════════════════════════════════
       RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 9', items: [
      'Chương trình là file trên đĩa; <b>tiến trình</b> là chương trình đang chạy, có PID riêng, bộ nhớ riêng và danh tính riêng.',
      'Mọi tiến trình sinh ra bằng cặp <code>fork()</code> rồi <code>exec()</code>. Khoảng trống giữa hai bước là nơi shell cài đặt chuyển hướng, đường ống và hạ quyền.',
      'Mỗi tiến trình có đúng một cha, nên tập hợp tiến trình là một <b>cây</b> gốc ở PID 1. Máy bạn có <b>56</b> tiến trình và <b>6</b> nhân CPU.',
      'Nếu <b>PID 1 chết, kernel panic</b>. Nó còn có hai nhiệm vụ nữa: nhận nuôi trẻ mồ côi và dọn xác zombie.',
      '<code>ps aux</code> để xem ai ăn CPU và RAM; <code>ps -e -o pid,ppid,stat,comm --forest</code> để xem ai đẻ ra ai — câu thứ hai chạy được cả trên BusyBox.',
      'Cột <code>STAT</code>: <b>S</b> ngủ (phổ biến nhất, 52/58 trên máy bạn), <b>R</b> chạy, <b>T</b> bị dừng, <b>Z</b> zombie, <b>D</b> kẹt vào/ra và <b>không thể giết được</b>.',
      'Load average là <b>số tiến trình chờ CPU</b>, không phải phần trăm. Luôn chia cho <code>nproc</code>.',
      'Dấu <code>&amp;</code> đưa lệnh xuống hậu cảnh, <code>$!</code> giữ PID của nó. <kbd>Ctrl</kbd>+<kbd>Z</kbd> dừng, <code>bg</code> chạy tiếp ở hậu cảnh, <code>fg</code> kéo lên tiền cảnh. Dấu <code>+</code> trong <code>STAT</code> đánh dấu ai đang giữ bàn phím.',
      'Job là khái niệm của <b>shell</b>, PID là của <b>kernel</b>. <code>kill %1</code> khác hoàn toàn <code>kill 1</code>.',
      '<code>kill</code> mặc định gửi <b>SIGTERM (15)</b> — bắt được, cho phép dọn dẹp. <b>SIGKILL (9)</b> và <b>SIGSTOP (19)</b> là hai tín hiệu duy nhất không thể bắt hay bỏ qua.',
      'Chết vì tín hiệu cho mã thoát <b>128 + số tín hiệu</b>: <b>143</b> = SIGTERM, <b>137</b> = SIGKILL (thường là OOM killer), <b>130</b> = <kbd>Ctrl</kbd>+<kbd>C</kbd>.',
      'Trên thiết bị nhúng, <code>kill -9</code> quá sớm đồng nghĩa với mất dữ liệu chưa kịp ghi xuống flash. Luôn TERM trước, chờ, rồi mới KILL.',
      '<b>Zombie</b> đã chết nhưng cha chưa <code>wait()</code>; giết nó vô nghĩa, phải xử lý người <b>cha</b>. <b>Mồ côi</b> còn sống nhưng cha đã chết; nó được PID 1 (hoặc một subreaper như <code>/init</code> của WSL) nhận nuôi.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Ở bước 3 bạn thấy <code>ps</code>, <code>sort</code> và <code>uniq</code> cùng ở trạng ' +
      'thái <code>R+</code> một lúc — ba tiến trình chạy <b>song song</b>, dữ liệu chảy từ cái ' +
      'này sang cái kia. Bài 10 mổ xẻ đúng cơ chế đó: ba dòng chảy <code>stdin</code>, ' +
      '<code>stdout</code>, <code>stderr</code> mang số hiệu <b>0, 1, 2</b>, các toán tử ' +
      '<code>&gt;</code> <code>&gt;&gt;</code> <code>2&gt;</code> <code>&amp;&gt;</code> ' +
      '<code>|</code> và lệnh <code>tee</code>. Bạn sẽ hiểu vì sao ' +
      '<code>sudo echo x &gt; /etc/hosts</code> ở Bài 8 thất bại, và vì sao ' +
      '<code>2&gt;/dev/null</code> mà bạn đã gõ theo quán tính lại có tác dụng đúng như vậy. ' +
      'Cuối bài là triết lý Unix — lý do vì sao Linux có hàng trăm lệnh nhỏ thay vì mười lệnh ' +
      'khổng lồ.</p>' },

    { t: 'hr' }
  ],

  quiz: [
    { q: 'Bạn gõ <code>ls</code> trong bash. Điều gì xảy ra với PID?',
      opts: ['bash đổi thành ls rồi đổi ngược lại, PID không đổi',
             'bash <code>fork()</code> ra một tiến trình con có PID mới, rồi con đó <code>exec()</code> thành ls mà vẫn giữ PID vừa được cấp',
             'Kernel tạo ls với PID 1',
             'ls dùng chung PID với bash'],
      a: 1,
      why: '<code>fork()</code> tạo <b>PID mới</b> cho tiến trình con; <code>exec()</code> thay mã ' +
           'lệnh bên trong nhưng <b>giữ nguyên</b> PID đó. Vì thế trong <code>ps -f</code> bạn thấy ' +
           '<code>ls</code> có <code>PPID</code> bằng PID của bash. Nếu bash tự biến thành ls thì ' +
           'shell của bạn sẽ biến mất sau mỗi lệnh — chính là điều xảy ra khi bạn gõ ' +
           '<code>exec ls</code>.' },

    { q: 'Cột <code>STAT</code> của một tiến trình là <code>D</code>. Bạn chạy <code>kill -9</code> nhiều lần nhưng nó không chết. Vì sao?',
      opts: ['PID sai',
             'Cần quyền root',
             'Tiến trình đang kẹt trong một thao tác vào/ra không thể ngắt, kernel không chuyển tín hiệu tới nó',
             'Nó đã là zombie'],
      a: 2,
      why: '<code>D</code> là <i>uninterruptible sleep</i> — tiến trình đang chờ driver trả lời và ' +
           'kernel <b>không giao</b> tín hiệu nào cho nó, kể cả SIGKILL. Đây là trạng thái duy nhất ' +
           'khiến <code>kill -9</code> vô hiệu. Nguyên nhân thường là tầng lưu trữ hoặc driver có ' +
           'vấn đề; trên thiết bị nhúng đó thường là driver do chính bạn viết. Cách duy nhất thoát ' +
           'ra thường là khởi động lại.' },

    { q: 'Trong log của thiết bị, một dịch vụ biến mất với mã thoát <b>137</b>. Kết luận đầu tiên nên là gì?',
      opts: ['Nó thoát bình thường',
             'Nó bị SIGKILL — rất nhiều khả năng là OOM killer vì hết RAM',
             'Nó bị SIGTERM và đã dọn dẹp sạch sẽ',
             'Người dùng bấm Ctrl+C'],
      a: 1,
      why: 'Mã thoát khi chết vì tín hiệu là <b>128 cộng số tín hiệu</b>. <code>137 = 128 + 9</code> ' +
           'nên thủ phạm là SIGKILL. Không ai gõ <code>kill -9</code> trên một thiết bị không người ' +
           'trực, nên nghi phạm số một là <b>OOM killer</b> của kernel khi hết bộ nhớ. So sánh: ' +
           '<code>143 = 128 + 15</code> là SIGTERM (dừng có trật tự), <code>130 = 128 + 2</code> là ' +
           '<kbd>Ctrl</kbd>+<kbd>C</kbd>.' },

    { q: 'Bạn chạy <code>sleep 300 &amp;</code> rồi đóng cửa sổ terminal. Điều gì xảy ra và vì sao?',
      opts: ['Tiến trình chạy tiếp vì nó ở hậu cảnh',
             'Kernel gửi SIGHUP cho cả nhóm tiến trình, và mặc định là thoát — nên nó chết theo',
             'Nó trở thành zombie',
             'Nó được PID 1 nhận nuôi và chạy mãi mãi'],
      a: 1,
      why: 'Chạy nền chỉ có nghĩa là <b>shell không chờ nó</b>; tiến trình vẫn thuộc phiên của ' +
           'terminal. Khi terminal đóng, kernel gửi <b>SIGHUP</b> cho cả nhóm và hành vi mặc định ' +
           'của tín hiệu này là thoát. Muốn nó sống sót thì <code>nohup</code>, <code>disown</code> ' +
           'hoặc <code>tmux</code>. Đây là điều bạn phải nhớ trước khi để lệnh biên dịch kernel chạy ' +
           'bốn mươi phút ở Chặng 04.' },

    { q: '<code>ps</code> cho thấy một tiến trình ở trạng thái <b>Z</b> với <code>PPID = 1420</code>. Cách xử lý đúng là gì?',
      opts: ['<code>kill -9</code> tiến trình Z đó',
             '<code>kill -9 1420</code> ngay lập tức',
             'Xem PID 1420 là chương trình gì rồi khởi động lại <b>nó</b>, vì lỗi nằm ở người cha không gọi <code>wait()</code>',
             'Khởi động lại toàn máy'],
      a: 2,
      why: 'Zombie <b>đã chết rồi</b> — gửi tín hiệu cho nó hoàn toàn vô nghĩa. Nó tồn tại chỉ vì ' +
           'tiến trình cha chưa gọi <code>wait()</code> để nhận mã thoát. Sửa đúng chỗ là xử lý ' +
           'chương trình cha (PID 1420). Nếu bắt buộc, giết cha cũng làm zombie biến mất vì nó sẽ ' +
           'thành mồ côi và được PID 1 nhận nuôi rồi dọn hộ — nhưng đó là chữa triệu chứng, không ' +
           'phải chữa bệnh.' },

    { q: 'Vì sao SIGKILL và SIGSTOP là hai tín hiệu duy nhất chương trình không được phép bắt?',
      opts: ['Vì chúng có số nhỏ nhất',
             'Vì chúng do kernel gửi chứ không phải người dùng',
             'Vì hệ thống cần ít nhất một cách dừng và một cách giết mà không chương trình nào chống lại được',
             'Vì chúng nhanh hơn các tín hiệu khác'],
      a: 2,
      why: 'Nếu <b>mọi</b> tín hiệu đều bắt được, một chương trình lỗi hoặc độc hại chỉ cần bắt hết ' +
           'là trở nên bất tử và quản trị viên hết cách. Hai tín hiệu này là lối thoát cuối cùng ' +
           'của hệ thống. Cái giá phải trả là chúng <b>không cho tiến trình một mili-giây nào để ' +
           'dọn dẹp</b> — không ghi nốt bộ đệm, không đóng file, không xoá file khoá. Đó chính là lý ' +
           'do phải thử SIGTERM trước và chỉ dùng SIGKILL khi đã hết cách.' }
  ]
});

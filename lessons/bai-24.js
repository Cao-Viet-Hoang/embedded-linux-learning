/* Bài 24 — Socket và I/O đa kênh
   Chặng 03 — Lập trình hệ thống Linux (bài cuối chặng) */

Lesson.register({
  id: 'bai-24',
  title: 'Socket và I/O đa kênh',
  minutes: 70,
  practice: 'Thực hành 55 phút',
  level: 'Trung cấp',

  intro:
    '<p>Bảng chọn cơ chế ở cuối Bài 23 có một dòng bạn chưa dùng tới. Cả năm cơ chế IPC bạn ' +
    'vừa dựng — pipe, FIFO, bộ nhớ chia sẻ, hàng đợi thông điệp, semaphore — đều <b>dừng lại ' +
    'ở ranh giới cái máy</b>. Chúng đi qua nhân, mà nhân thì chỉ quản lý đúng một máy.</p>' +
    '<p>Nhưng một thiết bị nhúng gần như luôn phải báo cáo đi xa: cảm biến gắn trong tủ điện, ' +
    'người vận hành ngồi ở phòng điều khiển; bộ đo trên cột đèn, máy chủ thu thập ở trung tâm ' +
    'dữ liệu. Thứ vượt được ranh giới đó là <b>socket</b> — và điều dễ chịu là nó vẫn chỉ là ' +
    'một mô tả file, đúng cái khái niệm bạn đã dùng từ Bài 19.</p>' +
    '<p>Rồi tới bài toán thứ hai, khó hơn: một tiến trình phải theo dõi <b>nhiều</b> kênh cùng ' +
    'lúc — vài socket khách, một FIFO, một tín hiệu — nhưng <code>read()</code> chỉ biết chặn ' +
    'ở đúng một kênh. Bạn sẽ tự tay đo cái giá của việc chọn sai: <b>1697,0 ms</b> so với ' +
    '<b>0,4 ms</b> cho cùng một yêu cầu. Rồi so <code>select</code>, <code>poll</code> và ' +
    '<code>epoll</code> trên tới 2000 kênh.</p>' +
    '<p>Đây là bài khép lại <b>Chặng 03</b>. Phần thực hành ghép mọi thứ bốn bài vừa rồi đã ' +
    'chuẩn bị thành một sản phẩm duy nhất: một daemon đa luồng, đọc dữ liệu, tắt êm bằng ' +
    '<code>SIGTERM</code>, phục vụ qua TCP.</p>',

  goals: [
    'Giải thích được socket là gì trong hệ thống mô tả file, và vì sao <code>bind</code>, <code>listen</code>, <code>accept</code>, <code>connect</code> phải xuất hiện đúng thứ tự đó',
    'Dùng đúng <code>htons</code>/<code>htonl</code>, và mô tả được chuyện gì xảy ra khi quên — bằng con số hex đo được',
    'Chứng minh bằng thực nghiệm rằng TCP <b>không có ranh giới thông điệp</b> còn UDP thì có, rồi rút ra quy tắc đóng khung dữ liệu',
    'Đo được cái giá của máy chủ tuần tự: một khách chậm làm khách khác phải chờ bao lâu',
    'So sánh <code>select</code>, <code>poll</code>, <code>epoll</code> bằng số đo trên 10 → 2000 kênh, và nêu được vì sao <code>epoll</code> phẳng',
    'Phân biệt level-triggered với edge-triggered, và giải thích vì sao edge-triggered <b>bắt buộc</b> đi kèm I/O không chặn',
    'Viết được một daemon hoàn chỉnh: luồng đọc dữ liệu + <code>signalfd</code> + <code>epoll</code> + socket không chặn, thoát với mã 0 khi nhận <code>SIGTERM</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. SOCKET LÀ MÔ TẢ FILE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Socket — mô tả file biết đi xa' },

    { t: 'p', x:
      'Từ Bài 19 tới giờ bạn đã gặp mô tả file ở đủ hình dạng: file thường, thiết bị trong ' +
      '<code>/dev</code>, pipe, FIFO, hàng đợi thông điệp, <code>signalfd</code>. Socket là ' +
      'thành viên tiếp theo của họ đó, và nó không đòi bạn học lại gì cả — vẫn ' +
      '<code>read()</code>, vẫn <code>write()</code>, vẫn <code>close()</code>.' },

    { t: 'p', x:
      'Khác biệt duy nhất nằm ở lúc <i>tạo</i>. Một file thì bạn <code>open()</code> theo đường ' +
      'dẫn. Một socket thì không có đường dẫn để mở — nó phải được dựng từ ba mảnh thông tin, và ' +
      'đó chính là ba tham số của <code>socket()</code>.' },

    { t: 'cmdx', cmd: 'int s = socket(AF_INET, SOCK_STREAM, 0);',
      title: 'Ba tham số dựng nên một socket',
      rows: [
        ['AF_INET', 'Họ địa chỉ: IPv4. Quyết định <i>hình dạng của địa chỉ</i> — với IPv4 là 4 byte IP + 2 byte cổng',
         '<code>AF_INET6</code> cho IPv6, <code>AF_UNIX</code> cho socket nội bộ máy (nhanh hơn TCP loopback, dùng đường dẫn thay cho IP)'],
        ['SOCK_STREAM', 'Kiểu: dòng byte, tin cậy, đúng thứ tự. Ghép với <code>AF_INET</code> nghĩa là <b>TCP</b>',
         '<code>SOCK_DGRAM</code> = gói rời rạc, không bảo đảm — ghép với <code>AF_INET</code> là <b>UDP</b>'],
        ['0', 'Giao thức cụ thể. Số 0 nghĩa là "cái mặc định cho cặp trên"',
         'Viết <code>IPPROTO_TCP</code> hay <code>IPPROTO_UDP</code> cũng được, nhưng gần như không ai viết vì 0 đã đúng'],
        ['s', 'Trả về một mô tả file — số nguyên nhỏ, cùng bảng với mọi fd khác',
         'Trong bài thực hành bạn sẽ thấy nó nhận số <b>3</b>, ngay sau 0/1/2, đúng như <code>open()</code> ở Bài 19']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao máy chủ và máy khách gọi hàm khác nhau?',
      x: '<p>Cả hai đều bắt đầu bằng <code>socket()</code>, nhưng sau đó tách đôi. Lý do là ' +
         '<b>tính bất đối xứng của việc gặp gỡ</b>: một bên phải đứng yên ở chỗ ai cũng biết, ' +
         'bên kia mới tìm tới được.</p>' +
         '<p>Máy chủ phải làm ba việc trước khi chờ: <code>bind()</code> để tự gắn mình vào một ' +
         'địa chỉ cố định (nếu không, nhân sẽ cấp cho nó một cổng ngẫu nhiên và chẳng ai biết ' +
         'đường tìm), <code>listen()</code> để nói với nhân "hãy nhận giúp tôi các kết nối tới ' +
         'cổng này", và <code>accept()</code> để lấy về từng kết nối một.</p>' +
         '<p>Máy khách chỉ cần <code>connect()</code>, vì nó không cần ai tìm tới mình. Nhân tự ' +
         'cấp cho nó một cổng tạm — trong bài thực hành bạn sẽ thấy những số như ' +
         '<b>54202</b>, <b>42818</b>, lấy từ dải <code>ip_local_port_range</code> mà trên máy ' +
         'này là <b>32768–60999</b>.</p>' },

    { t: 'fig', cap:
      '<code>accept()</code> trả về một mô tả file <b>mới</b>. Socket nghe không bao giờ được ' +
      'dùng để đọc-ghi dữ liệu — nó chỉ đẻ ra các socket con.',
      svg:
      '<svg viewBox="0 0 720 336" width="720" role="img" aria-label="Sơ đồ trình tự các lời gọi socket giữa máy chủ và máy khách">' +
      '<rect class="d-box-p" x="40" y="16" width="250" height="30" rx="6"/>' +
      '<text class="d-t" x="165" y="36" text-anchor="middle">MÁY CHỦ</text>' +
      '<rect class="d-box-a" x="430" y="16" width="250" height="30" rx="6"/>' +
      '<text class="d-t" x="555" y="36" text-anchor="middle">MÁY KHÁCH</text>' +

      '<rect class="d-box" x="40" y="60" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="78" text-anchor="middle">socket()  → fd 3</text>' +
      '<rect class="d-box" x="40" y="96" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="114" text-anchor="middle">bind()  gắn vào 0.0.0.0:9000</text>' +
      '<rect class="d-box" x="40" y="132" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="150" text-anchor="middle">listen(fd, 16)</text>' +
      '<rect class="d-box-w" x="40" y="168" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="186" text-anchor="middle">accept()  — CHẶN ở đây</text>' +

      '<rect class="d-box" x="430" y="168" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="555" y="186" text-anchor="middle">socket() → fd 3, connect()</text>' +
      '<line class="d-line" x1="430" y1="182" x2="300" y2="182"/>' +
      '<path class="d-arrow" d="M300 182 L310 177 L310 187 Z"/>' +

      '<rect class="d-box-g" x="40" y="212" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="230" text-anchor="middle">accept() → fd 4 MỚI</text>' +
      '<text class="d-ts" x="165" y="256" text-anchor="middle">fd 3 vẫn nghe tiếp cho khách sau</text>' +

      '<rect class="d-box" x="430" y="212" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="555" y="230" text-anchor="middle">write(fd, "XIN NHIET DO")</text>' +
      '<line class="d-line" x1="430" y1="226" x2="300" y2="226"/>' +
      '<path class="d-arrow" d="M300 226 L310 221 L310 231 Z"/>' +

      '<rect class="d-box" x="40" y="276" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="294" text-anchor="middle">read(fd 4) → write(fd 4)</text>' +
      '<rect class="d-box" x="430" y="276" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="555" y="294" text-anchor="middle">read(fd) → "nhiet do 42.5"</text>' +
      '<line class="d-line" x1="290" y1="290" x2="420" y2="290"/>' +
      '<path class="d-arrow" d="M420 290 L410 285 L410 295 Z"/>' +
      '<text class="d-ts" x="360" y="322" text-anchor="middle">Từ lúc này trở đi cả hai bên chỉ còn dùng read/write như với file thường</text>' +
      '</svg>' },

    { t: 'terms', items: [
      ['Socket', '', 'Một đầu mút của kênh giao tiếp. Trong chương trình nó chỉ là một số nguyên fd.'],
      ['Cổng (port)', '', 'Số 16 bit phân biệt các dịch vụ trên cùng một máy. 0–1023 cần quyền root; bài này dùng 9000–9008.'],
      ['Socket nghe', 'listening socket', 'Socket đã <code>listen()</code>. Chỉ dùng để <code>accept()</code>, không bao giờ đọc-ghi dữ liệu.'],
      ['Socket kết nối', 'connected socket', 'Cái <code>accept()</code> trả về, hoặc cái máy khách đã <code>connect()</code>. Đây mới là nơi dữ liệu chảy qua.'],
      ['Backlog', '', 'Tham số thứ hai của <code>listen()</code>: số kết nối nhân giữ hộ khi bạn chưa kịp <code>accept()</code>. Trần hệ thống ở <code>/proc/sys/net/core/somaxconn</code> = <b>4096</b>.'],
      ['Ephemeral port', 'cổng tạm', 'Cổng nhân tự cấp cho máy khách, lấy từ dải <code>ip_local_port_range</code> = <b>32768–60999</b> trên máy này.'],
      ['TCP', 'Transmission Control Protocol', 'Dòng byte tin cậy, đúng thứ tự, có kiểm soát tắc nghẽn. Phải bắt tay trước khi gửi.'],
      ['UDP', 'User Datagram Protocol', 'Gói rời rạc. Không bắt tay, không bảo đảm tới nơi, không bảo đảm thứ tự — nhưng giữ nguyên ranh giới gói.'],
      ['MTU', 'Maximum Transmission Unit', 'Kích thước khung lớn nhất đường truyền chở được, thường 1500 byte trên Ethernet.'],
      ['I/O đa kênh', 'I/O multiplexing', 'Một luồng theo dõi nhiều fd cùng lúc, ngủ cho tới khi <i>bất kỳ</i> fd nào sẵn sàng.']
    ]},

    /* ══════════════════════════════════════════════
       2. THỨ TỰ BYTE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thứ tự byte — vì sao phải có htons' },

    { t: 'p', x:
      'Trước khi viết dòng mạng đầu tiên, có một cái bẫy phải gỡ. Số <code>9000</code> nằm ' +
      'trong RAM máy bạn theo một thứ tự byte, còn trên đường truyền nó phải nằm theo một thứ ' +
      'tự khác. Nếu bạn không đổi, chương trình vẫn biên dịch sạch, vẫn chạy, và vẫn ' +
      '<b>sai</b>.' },

    { t: 'code', where: 'file', name: 'thutu.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdint.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    union { uint32_t i; unsigned char c[4]; } u = { .i = 1 };\n' +
      '    printf("kien truc nay : %s-endian\\n", u.c[0] ? "little" : "big");\n' +
      '\n' +
      '    uint16_t cong_may  = 9000;\n' +
      '    uint16_t cong_mang = htons(cong_may);\n' +
      '    printf("cong  9000 tren may  = 0x%04X\\n", cong_may);\n' +
      '    printf("cong  9000 tren mang = 0x%04X  (= %u neu doc nham)\\n",\n' +
      '           cong_mang, cong_mang);\n' +
      '\n' +
      '    unsigned char *p = (unsigned char *)&cong_may;\n' +
      '    printf("byte trong RAM (may) : %02X %02X\\n", p[0], p[1]);\n' +
      '    p = (unsigned char *)&cong_mang;\n' +
      '    printf("byte trong RAM (mang): %02X %02X\\n", p[0], p[1]);\n' +
      '\n' +
      '    uint32_t ip = 0xC0A80105;                 /* 192.168.1.5 */\n' +
      '    printf("ip 192.168.1.5 tren may  = 0x%08X\\n", ip);\n' +
      '    printf("ip 192.168.1.5 tren mang = 0x%08X\\n", htonl(ip));\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        'Mẹo <code>union</code> ở dòng đầu là cách chuẩn để hỏi kiến trúc mà không cần macro của trình biên dịch: ghi số 1 vào 4 byte rồi xem byte thấp nhất nằm ở đâu.'
      ]},

    { t: 'code', where: 'wsl', code: 'gcc -Wall -Wextra -o thutu thutu.c\n./thutu' },

    { t: 'code', where: 'out', nocopy: true, code:
      'kien truc nay : little-endian\n' +
      'cong  9000 tren may  = 0x2328\n' +
      'cong  9000 tren mang = 0x2823  (= 10275 neu doc nham)\n' +
      'byte trong RAM (may) : 28 23\n' +
      'byte trong RAM (mang): 23 28\n' +
      'ip 192.168.1.5 tren may  = 0xC0A80105\n' +
      'ip 192.168.1.5 tren mang = 0x0501A8C0\n' },

    { t: 'p', x:
      'Đọc hai dòng <code>byte trong RAM</code> cho kỹ, vì đó là toàn bộ vấn đề. Số ' +
      '<code>0x2328</code> gồm byte cao <code>23</code> và byte thấp <code>28</code>. Máy x86 ' +
      'này là <b>little-endian</b> nên nó xếp byte <i>thấp trước</i>: trong RAM là ' +
      '<code>28 23</code>. Còn giao thức mạng quy định phải truyền byte <i>cao trước</i> — ' +
      '<code>23 28</code>. Đó chính là việc <code>htons</code> làm: đảo hai byte.' },

    { t: 'cmdx', cmd: 'htons / htonl / ntohs / ntohl',
      title: 'Bốn hàm, đọc theo tên là nhớ được',
      rows: [
        ['h', '<b>h</b>ost — thứ tự byte của máy đang chạy', 'Trên x86 và ARM thông dụng là little-endian'],
        ['n', '<b>n</b>etwork — thứ tự byte trên đường truyền, luôn là big-endian', 'Còn gọi là "network byte order", quy ước từ RFC 1700'],
        ['s', '<b>s</b>hort — 16 bit. Dùng cho <b>cổng</b>', '<code>sin_port = htons(9000)</code>'],
        ['l', '<b>l</b>ong — 32 bit. Dùng cho <b>địa chỉ IPv4</b>', '<code>sin_addr.s_addr = htonl(INADDR_ANY)</code>'],
        ['htons(9000)', 'host-to-network-short: 0x2328 → 0x2823', 'Bắt buộc cho <code>sin_port</code> ở cả hai bên'],
        ['ntohs(x)', 'network-to-host-short: chiều ngược lại', 'Dùng khi <b>in ra</b> cổng của khách lấy từ <code>accept()</code>']
      ]},

    { t: 'p', x:
      'Trên máy big-endian bốn hàm này không làm gì cả — chúng biên dịch thành lệnh rỗng. Đó là ' +
      'lý do bạn <b>luôn</b> phải viết chúng dù đang ở kiến trúc nào: chúng miễn phí ở nơi ' +
      'không cần, và cứu bạn ở nơi cần. Một số dòng SoC nhúng (PowerPC, một vài cấu hình MIPS) ' +
      'chạy big-endian, và mã quên <code>htons</code> sẽ chạy đúng trên bàn làm việc rồi hỏng ' +
      'khi cross-compile sang thiết bị — đúng loại lỗi <b>Chặng 04</b> sẽ nói kỹ.' },

    { t: 'h3', x: 'Quên htons thì chuyện gì xảy ra?' },

    { t: 'code', where: 'file', name: 'khach_quen.c (bản hỏng, cố ý)', lang: 'c', code:
      '    struct sockaddr_in dc;\n' +
      '    memset(&dc, 0, sizeof dc);\n' +
      '    dc.sin_family = AF_INET;\n' +
      '    dc.sin_port   = 9000;                 /* QUEN htons() */\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &dc.sin_addr);\n' +
      '\n' +
      '    printf("[khach] sin_port trong RAM = 0x%04X -> may chu se doc thanh cong %u\\n",\n' +
      '           dc.sin_port, ntohs(dc.sin_port));\n' +
      '    if (connect(s, (struct sockaddr *)&dc, sizeof dc) == -1) { perror("connect"); exit(1); }\n' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[khach] sin_port trong RAM = 0x2328 -> may chu se doc thanh cong 10275\n' +
      'connect: Connection refused\n' +
      'ma thoat = 1\n' },

    { t: 'cal', kind: 'warn', title: 'Lỗi này không bao giờ tự nói tên nó ra',
      x: '<p>Thông báo bạn nhận được là <code>Connection refused</code> — y hệt thông báo khi ' +
         'máy chủ chưa chạy, khi sai địa chỉ IP, hay khi tường lửa chặn. Không có một chữ nào ' +
         'nhắc tới thứ tự byte.</p>' +
         '<p>Chương trình đã lặng lẽ gõ cửa cổng <b>10275</b> thay vì <b>9000</b>, vì nhân đọc ' +
         'hai byte <code>28 23</code> trong RAM theo thứ tự mạng và ra số đó. Cách nhận ra: nếu ' +
         '<code>ss -tln</code> khẳng định máy chủ <i>đang</i> nghe đúng cổng mà máy khách vẫn ' +
         'bị từ chối, hãy in <code>dc.sin_port</code> ra dạng hex trước khi nghi ngờ bất cứ thứ ' +
         'gì khác.</p>' },

    /* ══════════════════════════════════════════════
       3. BỘ KHUNG MÁY CHỦ TCP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bộ khung của một máy chủ TCP' },

    { t: 'p', x:
      'Đây là chương trình mạng đầu tiên của bạn. Nó nghe trên cổng 9000, nhận một khách, đọc ' +
      'yêu cầu, trả về một số đo, rồi đóng. Ngắn, nhưng chứa <b>đủ</b> bộ khung mà mọi máy chủ ' +
      'TCP trên đời đều dùng.' },

    { t: 'code', where: 'file', name: 'may_tcp.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <signal.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      '#define CONG 9000\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int solan = (argc > 1) ? atoi(argv[1]) : 1;\n' +
      '    signal(SIGPIPE, SIG_IGN);                 /* bai hoc tu Bai 23 */\n' +
      '\n' +
      '    int ls = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    if (ls == -1) { perror("socket"); exit(1); }\n' +
      '\n' +
      '    int mot = 1;\n' +
      '    setsockopt(ls, SOL_SOCKET, SO_REUSEADDR, &mot, sizeof mot);\n' +
      '\n' +
      '    struct sockaddr_in dc;\n' +
      '    memset(&dc, 0, sizeof dc);                /* PHAI xoa sach truoc */\n' +
      '    dc.sin_family      = AF_INET;\n' +
      '    dc.sin_addr.s_addr = htonl(INADDR_ANY);   /* moi giao dien mang */\n' +
      '    dc.sin_port        = htons(CONG);\n' +
      '\n' +
      '    if (bind(ls, (struct sockaddr *)&dc, sizeof dc) == -1) { perror("bind"); exit(1); }\n' +
      '    if (listen(ls, 16) == -1) { perror("listen"); exit(1); }\n' +
      '    printf("[may] fd nghe = %d, cho khach tren cong %d\\n", ls, CONG);\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    for (int i = 0; i < solan; i++) {\n' +
      '        struct sockaddr_in kdc;\n' +
      '        socklen_t klen = sizeof kdc;\n' +
      '        int cs = accept(ls, (struct sockaddr *)&kdc, &klen);\n' +
      '        if (cs == -1) { perror("accept"); break; }\n' +
      '\n' +
      '        char ip[INET_ADDRSTRLEN];\n' +
      '        inet_ntop(AF_INET, &kdc.sin_addr, ip, sizeof ip);\n' +
      '        printf("[may] khach %s:%u  ->  fd moi = %d\\n", ip, ntohs(kdc.sin_port), cs);\n' +
      '        fflush(stdout);\n' +
      '\n' +
      '        char dem[128];\n' +
      '        ssize_t n = read(cs, dem, sizeof dem - 1);\n' +
      '        if (n > 0) {\n' +
      '            dem[n] = \'\\0\';\n' +
      '            printf("[may] nhan %zd byte: %s", n, dem);\n' +
      '            fflush(stdout);\n' +
      '            const char *tl = "nhiet do 42.5 do C\\n";\n' +
      '            if (write(cs, tl, strlen(tl)) == -1) perror("write");\n' +
      '        }\n' +
      '        close(cs);\n' +
      '        printf("[may] dong fd %d\\n", cs);\n' +
      '        fflush(stdout);\n' +
      '    }\n' +
      '    close(ls);\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        '<code>memset(&amp;dc, 0, sizeof dc)</code> không phải thói quen thừa: <code>struct sockaddr_in</code> có trường đệm <code>sin_zero</code>, và bỏ rác trong đó là nguồn của những lỗi rất khó tái hiện.',
        '<code>fflush(stdout)</code> sau mỗi dòng là vì bạn sẽ chạy chương trình này ở nền và chuyển hướng ra file — cái bẫy đệm khối bạn đã gặp ở Bài 19, Bài 20 và Bài 23.'
      ]},

    { t: 'cmdx', cmd: 'bind / listen / accept',
      title: 'Ba lời gọi, ba nhiệm vụ hoàn toàn khác nhau',
      rows: [
        ['bind(ls, &amp;dc, sizeof dc)',
         'Gắn socket vào địa chỉ + cổng cụ thể. Từ đây nhân biết gói tới cổng 9000 thuộc về ai',
         'Thiếu bước này thì nhân cấp cổng ngẫu nhiên — chấp nhận được với máy khách, vô dụng với máy chủ'],
        ['htonl(INADDR_ANY)',
         '<code>INADDR_ANY</code> = 0.0.0.0 = "nghe trên <b>mọi</b> giao diện mạng"',
         'Máy này có <code>lo</code> (127.0.0.1) và <code>eth0</code> (172.30.153.178). Muốn chỉ nghe nội bộ thì <code>inet_pton</code> vào "127.0.0.1"'],
        ['listen(ls, 16)',
         'Chuyển socket sang trạng thái <i>bị động</i>. Từ giờ nhân tự bắt tay ba bước hộ bạn và xếp kết nối vào hàng chờ',
         'Số 16 là <b>backlog</b>: hàng chờ sâu 16. Vượt trần <code>somaxconn</code> = <b>4096</b> thì bị cắt xuống'],
        ['accept(ls, &amp;kdc, &amp;klen)',
         'Lấy <b>một</b> kết nối ra khỏi hàng chờ và trả về mô tả file mới cho riêng nó',
         'Chặn nếu hàng chờ rỗng. <code>ls</code> vẫn tiếp tục nghe — đây là chỗ người mới hay nhầm nhất'],
        ['&amp;klen',
         'Tham số vừa vào vừa ra: bạn đưa vào kích thước bộ đệm, nhân ghi lại kích thước thật của địa chỉ',
         'Kiểu <code>socklen_t</code>, không phải <code>int</code>. Quên khởi tạo nó là lỗi kinh điển'],
        ['inet_ntop / ntohs',
         'Đổi địa chỉ nhị phân của khách sang chuỗi đọc được, và đổi cổng từ thứ tự mạng về thứ tự máy',
         '<code>inet_ntop</code> thay cho <code>inet_ntoa</code> cũ vì nó an toàn với luồng và dùng được cả IPv6']
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o may_tcp may_tcp.c\n' +
      'gcc -Wall -Wextra -o khach_tcp khach_tcp.c\n' +
      './may_tcp 1 &\n' +
      'sleep 0.4\n' +
      './khach_tcp\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[may] fd nghe = 3, cho khach tren cong 9000\n' +
      '[khach] noi duoc toi 127.0.0.1:9000, fd = 3\n' +
      '[may] khach 127.0.0.1:54202  ->  fd moi = 4\n' +
      '[may] nhan 13 byte: XIN NHIET DO\n' +
      '[khach] tra loi: nhiet do 42.5 do C\n' +
      '[may] dong fd 4\n' },

    { t: 'cal', kind: 'info', title: 'Ba con số đáng để ý trong output',
      x: '<ul>' +
         '<li><b>fd nghe = 3</b> — socket lấy đúng số fd nhỏ nhất còn trống, sau 0/1/2. Nó không ' +
         'khác gì một fd của <code>open()</code>.</li>' +
         '<li><b>fd moi = 4</b> — <code>accept()</code> đẻ ra fd thứ hai. Máy chủ giờ giữ ' +
         '<i>hai</i> socket: fd 3 để nghe tiếp, fd 4 để nói chuyện với khách này.</li>' +
         '<li><b>127.0.0.1:54202</b> — cổng tạm nhân cấp cho máy khách, nằm trong dải ' +
         '32768–60999. Chạy lại lần nữa bạn sẽ thấy số khác.</li>' +
         '</ul>' },

    { t: 'h3', x: 'SO_REUSEADDR và TIME_WAIT — dòng code nhìn như thừa' },

    { t: 'p', x:
      'Dòng <code>setsockopt(..., SO_REUSEADDR, ...)</code> trông như một chi tiết vặt có cũng ' +
      'được. Hãy thử bỏ nó ra, rồi khởi động lại máy chủ ngay sau khi nó vừa thoát.' },

    { t: 'code', where: 'wsl', code:
      '# may_khong_reuse.c giong het may_tcp.c nhung KHONG co dong setsockopt\n' +
      './may_khong_reuse &\n' +
      'sleep 0.3\n' +
      'nc -w1 127.0.0.1 9003 <<< "chao" > /dev/null\n' +
      'wait\n' +
      'ss -tan | grep 9003\n' +
      './may_khong_reuse' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[may] bind cong 9003 thanh cong\n' +
      '[may] da dong, thoat\n' +
      'TIME-WAIT 0      0           127.0.0.1:9003     127.0.0.1:57766\n' +
      'bind: Address already in use\n' },

    { t: 'p', x:
      'Máy chủ đã thoát hẳn. Không tiến trình nào đang giữ cổng 9003. Vậy mà ' +
      '<code>bind</code> vẫn bị từ chối — và bốn lần chạy liên tiếp đều cho đúng kết quả đó. ' +
      'Thủ phạm là dòng <code>TIME-WAIT</code> ở giữa: <b>nhân</b> vẫn đang giữ chỗ, dù ' +
      'chương trình đã chết.' },

    { t: 'cal', kind: 'why', title: 'TIME_WAIT tồn tại để bảo vệ kết nối sau nó',
      x: '<p>Bên nào <b>đóng trước</b> thì bên đó phải ở lại trạng thái <code>TIME_WAIT</code> ' +
         'khoảng hai lần tuổi thọ gói tin — trên Linux là 60 giây, xem ' +
         '<code>/proc/sys/net/ipv4/tcp_fin_timeout</code>.</p>' +
         '<p>Lý do rất thực tế: một gói tin đi lạc của kết nối vừa rồi có thể còn lang thang ' +
         'trên đường truyền. Nếu cổng được cấp lại ngay và một kết nối mới trùng đúng bộ bốn ' +
         '(IP nguồn, cổng nguồn, IP đích, cổng đích), gói lạc kia sẽ chui vào kết nối mới và ' +
         'trộn dữ liệu cũ vào dữ liệu mới. <code>TIME_WAIT</code> là khoảng lặng để mọi gói lạc ' +
         'kịp chết.</p>' +
         '<p>Trong output ở trên, máy chủ là bên gọi <code>close()</code> trước, nên ' +
         '<code>TIME_WAIT</code> rơi vào phía máy chủ — chính là phía cần <code>bind</code> lại. ' +
         'Đây là lý do <b>mọi</b> máy chủ đều đặt <code>SO_REUSEADDR</code>: nó bảo nhân "cho ' +
         'tôi bind dù còn TIME_WAIT trên cổng này". Với thiết bị nhúng thì nó thiết yếu, vì một ' +
         'daemon bị systemd khởi động lại sau khi sập mà phải chờ 60 giây là 60 giây thiết bị ' +
         'không phục vụ ai.</p>' },

    { t: 'code', where: 'wsl', code:
      '# may_tcp.c CO SO_REUSEADDR: lam lai dung kich ban tren\n' +
      './may_tcp 1 & sleep 0.3\n' +
      'nc -w1 127.0.0.1 9000 <<< "chao" > /dev/null\n' +
      'wait\n' +
      'ss -tan | grep 9000\n' +
      './may_tcp 1 &\n' +
      'sleep 0.5\n' +
      'ss -tln | grep 9000' },

    { t: 'code', where: 'out', nocopy: true, code:
      'TIME-WAIT 0      0           127.0.0.1:9000     127.0.0.1:42818\n' +
      '[may] fd nghe = 3, cho khach tren cong 9000\n' +
      'LISTEN 0      16            0.0.0.0:9000      0.0.0.0:*\n' },

    { t: 'p', x:
      '<code>TIME-WAIT</code> vẫn còn nguyên đó — nhưng máy chủ đã <code>bind</code> lại được ' +
      'ngay lập tức và đang <code>LISTEN</code>. Một dòng <code>setsockopt</code>, khác biệt ' +
      '<b>60 giây</b> mỗi lần khởi động lại.' },

    /* ══════════════════════════════════════════════
       4. MÁY KHÁCH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Máy khách TCP' },

    { t: 'p', x:
      'Phía khách ngắn hơn hẳn vì nó không cần ai tìm tới mình: chỉ <code>socket()</code> rồi ' +
      '<code>connect()</code>, sau đó là <code>read</code>/<code>write</code> như với file.' },

    { t: 'code', where: 'file', name: 'khach_tcp.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    const char *dia_chi = (argc > 1) ? argv[1] : "127.0.0.1";\n' +
      '    int          cong    = (argc > 2) ? atoi(argv[2]) : 9000;\n' +
      '\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    if (s == -1) { perror("socket"); exit(1); }\n' +
      '\n' +
      '    struct sockaddr_in dc;\n' +
      '    memset(&dc, 0, sizeof dc);\n' +
      '    dc.sin_family = AF_INET;\n' +
      '    dc.sin_port   = htons(cong);\n' +
      '    if (inet_pton(AF_INET, dia_chi, &dc.sin_addr) != 1) {\n' +
      '        fprintf(stderr, "dia chi khong hop le: %s\\n", dia_chi); exit(1);\n' +
      '    }\n' +
      '\n' +
      '    if (connect(s, (struct sockaddr *)&dc, sizeof dc) == -1) { perror("connect"); exit(1); }\n' +
      '    printf("[khach] noi duoc toi %s:%d, fd = %d\\n", dia_chi, cong, s);\n' +
      '\n' +
      '    const char *xin = "XIN NHIET DO\\n";\n' +
      '    if (write(s, xin, strlen(xin)) == -1) { perror("write"); exit(1); }\n' +
      '\n' +
      '    char dem[128];\n' +
      '    ssize_t n = read(s, dem, sizeof dem - 1);\n' +
      '    if (n > 0) { dem[n] = \'\\0\'; printf("[khach] tra loi: %s", dem); }\n' +
      '    else if (n == 0) printf("[khach] may chu dong ket noi\\n");\n' +
      '\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        '<code>inet_pton</code> trả về <b>1</b> khi thành công, 0 khi chuỗi sai định dạng, −1 khi họ địa chỉ sai. So sánh với 1 chứ đừng so sánh với −1.'
      ]},

    { t: 'cal', kind: 'tip', title: 'Máy khách cũng bind được — và đôi khi nên bind',
      x: '<p>Mặc định nhân tự chọn cổng tạm cho máy khách. Nhưng bạn hoàn toàn có thể gọi ' +
         '<code>bind()</code> trước <code>connect()</code> để ép cổng nguồn hoặc ép giao diện ' +
         'mạng ra.</p>' +
         '<p>Trên thiết bị nhúng có nhiều đường ra — Ethernet và 4G chẳng hạn — đây là cách bạn ' +
         'buộc lưu lượng đo đạc đi qua đúng đường rẻ tiền, thay vì để bảng định tuyến quyết ' +
         'định hộ.</p>' },

    /* ══════════════════════════════════════════════
       5. TCP LÀ DÒNG BYTE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'TCP là dòng byte, không phải dòng thông điệp' },

    { t: 'p', x:
      'Đây là hiểu lầm tốn nhiều giờ gỡ lỗi nhất trong lập trình mạng, và nó tốn nhiều giờ ' +
      'chính vì mã sai <b>chạy đúng</b> trong lúc thử. Chữ "STREAM" trong ' +
      '<code>SOCK_STREAM</code> nói thẳng ra vấn đề: TCP bảo đảm mọi byte tới nơi, đúng thứ ' +
      'tự, không sót — nhưng nó <b>không</b> bảo đảm rằng ba lần <code>write()</code> sẽ thành ' +
      'ba lần <code>read()</code>.' },

    { t: 'p', x:
      'Hãy tự chứng minh. Máy khách gửi ba dòng, mỗi dòng 11 byte. Máy chủ đếm xem ' +
      '<code>read()</code> phải gọi bao nhiêu lần và mỗi lần trả về bao nhiêu byte.' },

    { t: 'code', where: 'wsl', code:
      '# lan 1: ba lan write lien tiep, khong nghi\n' +
      './may_ranhgioi & sleep 0.4; ./khach_ranhgioi 0; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[may] read() lan 1 tra ve 11 byte: "do 1: 41.5|"\n' +
      '[khach] write() lan 1 gui 11 byte\n' +
      '[khach] write() lan 2 gui 11 byte\n' +
      '[khach] write() lan 3 gui 11 byte\n' +
      '[may] read() lan 2 tra ve 22 byte: "do 2: 42.0|do 3: 42.5|"\n' +
      '[may] read() tra ve 0 -> khach da dong. Tong so lan read = 2\n' },

    { t: 'code', where: 'wsl', code:
      '# lan 2: cung chuong trinh, nhung nghi 300 ms giua cac lan write\n' +
      './may_ranhgioi & sleep 0.4; ./khach_ranhgioi 300; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[may] read() lan 1 tra ve 11 byte: "do 1: 41.5|"\n' +
      '[may] read() lan 2 tra ve 11 byte: "do 2: 42.0|"\n' +
      '[may] read() lan 3 tra ve 11 byte: "do 3: 42.5|"\n' +
      '[khach] write() lan 1 gui 11 byte\n' +
      '[khach] write() lan 2 gui 11 byte\n' +
      '[khach] write() lan 3 gui 11 byte\n' +
      '[may] read() tra ve 0 -> khach da dong. Tong so lan read = 3\n',
      notes: [
        'Ký tự <code>|</code> trong output là ký tự xuống dòng, được máy chủ in thay thế để bạn nhìn rõ ranh giới.'
      ]},

    { t: 'cal', kind: 'danger', title: 'Cùng một chương trình, hai kết quả khác nhau',
      x: '<p>Không dòng mã nào thay đổi giữa hai lần chạy. Chỉ có <b>thời điểm</b> gửi thay đổi ' +
         '— và số lần <code>read()</code> nhảy từ <b>3</b> xuống <b>2</b>, với một lần trả về ' +
         '<b>22 byte</b> chứa gọn hai thông điệp dính nhau.</p>' +
         '<p>Đây là lý do lỗi này sống sót qua mọi vòng kiểm thử. Trên bàn làm việc, máy khách ' +
         'gửi thong thả, mỗi <code>write</code> thành một <code>read</code>, mã sai chạy hoàn ' +
         'hảo. Ra hiện trường, mạng nghẽn một chút, hai gói dồn lại — và thiết bị bắt đầu đọc ' +
         'ra những số đo vô nghĩa. Chiều ngược lại cũng xảy ra: một thông điệp dài bị cắt làm ' +
         'đôi qua hai lần <code>read</code>.</p>' },

    { t: 'p', x:
      'Cách chữa không nằm ở socket mà ở <b>giao thức bạn tự định nghĩa</b>. Có đúng ba cách ' +
      'đóng khung, và bạn phải chọn một:' },

    { t: 'table',
      head: ['Cách đóng khung', 'Cách làm', 'Ưu / nhược'],
      rows: [
        ['Ký tự phân cách', 'Kết thúc mỗi thông điệp bằng <code>\\n</code>. Bên nhận đọc vào bộ đệm tích luỹ, cắt tại mỗi <code>\\n</code>',
         'Đơn giản, dễ soi bằng <code>nc</code>. Nhưng dữ liệu <b>không</b> được phép chứa ký tự đó — hỏng ngay với dữ liệu nhị phân'],
        ['Tiền tố độ dài', 'Gửi 4 byte độ dài (nhớ <code>htonl</code>!) rồi mới gửi thân thông điệp',
         'Chạy được với mọi dữ liệu kể cả nhị phân, bên nhận biết chính xác cần đọc bao nhiêu. Là cách phổ biến nhất trong giao thức nhị phân'],
        ['Kích thước cố định', 'Mọi thông điệp đúng N byte, ví dụ một <code>struct</code> đã đóng gói',
         'Nhanh nhất, không cần phân tích. Nhưng cứng nhắc, và phải cẩn thận với padding cùng thứ tự byte của từng trường']
      ]},

    { t: 'cal', kind: 'why', title: 'Quy tắc vàng: luôn lặp quanh read và write',
      x: '<p>Dù chọn cách đóng khung nào, mã đọc-ghi vẫn phải nằm trong vòng lặp. ' +
         '<code>read()</code> trả về "số byte tôi có <i>ngay lúc này</i>", ' +
         '<code>write()</code> trả về "số byte tôi <i>nhận được</i> ngay lúc này". Không cái ' +
         'nào hứa hẹn con số bạn yêu cầu.</p>' +
         '<p>Bạn đã đo cái này bằng con số ở phần I/O không chặn phía dưới: một lệnh ' +
         '<code>write()</code> 100 000 byte chỉ ghi được <b>65 536</b> byte. Cùng quy tắc đó, ' +
         'cùng lý do đó — bộ đệm của nhân có hạn.</p>' },

    /* ══════════════════════════════════════════════
       6. UDP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'UDP — gói rời rạc, không lời hứa nào' },

    { t: 'p', x:
      'Đổi <code>SOCK_STREAM</code> thành <code>SOCK_DGRAM</code> và bạn được một giao thức có ' +
      'tính cách gần như trái ngược. Không bắt tay, không <code>listen</code>, không ' +
      '<code>accept</code>, không <code>connect</code> — chỉ <code>sendto()</code> và ' +
      '<code>recvfrom()</code>, mỗi lời gọi mang theo địa chỉ của bên kia.' },

    { t: 'code', where: 'wsl', code:
      './may_udp 256 & sleep 0.4; ./khach_udp; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[udp] cho goi tren cong 9002, bo dem nhan = 256 byte\n' +
      '[udp] recvfrom() lan 1: 10 byte tu 127.0.0.1:45321 -> "do 1: 41.5"\n' +
      '[khach] sendto() lan 1 gui 10 byte, khong can connect()\n' +
      '[khach] sendto() lan 2 gui 10 byte, khong can connect()\n' +
      '[udp] recvfrom() lan 2: 10 byte tu 127.0.0.1:45321 -> "do 2: 42.0"\n' +
      '[khach] sendto() lan 3 gui 10 byte, khong can connect()\n' +
      '[udp] recvfrom() lan 3: 10 byte tu 127.0.0.1:45321 -> "do 3: 42.5"\n' },

    { t: 'p', x:
      'Ba lần gửi, ba lần nhận, mỗi lần đúng 10 byte. Ranh giới gói được giữ nguyên vẹn — đúng ' +
      'thứ TCP không cho bạn. Nhưng cái giá phải trả xuất hiện ngay khi bộ đệm nhận hơi nhỏ.' },

    { t: 'code', where: 'wsl', code:
      '# cung khach gui 10 byte, nhung ben nhan chi dua bo dem 6 byte\n' +
      './may_udp 6 & sleep 0.4; ./khach_udp; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[udp] cho goi tren cong 9002, bo dem nhan = 6 byte\n' +
      '[udp] recvfrom() lan 1: 6 byte tu 127.0.0.1:55936 -> "do 1: "\n' +
      '[khach] sendto() lan 1 gui 10 byte, khong can connect()\n' +
      '[khach] sendto() lan 2 gui 10 byte, khong can connect()\n' +
      '[udp] recvfrom() lan 2: 6 byte tu 127.0.0.1:55936 -> "do 2: "\n' +
      '[khach] sendto() lan 3 gui 10 byte, khong can connect()\n' +
      '[udp] recvfrom() lan 3: 6 byte tu 127.0.0.1:55936 -> "do 3: "\n' },

    { t: 'cal', kind: 'warn', title: 'UDP cắt cụt trong im lặng',
      x: '<p>Bốn byte cuối của mỗi gói biến mất và <code>recvfrom</code> <b>không</b> báo lỗi ' +
         '— nó trả về 6, đúng bằng bộ đệm bạn đưa, y như một lần đọc thành công. Khác hẳn hàng ' +
         'đợi thông điệp POSIX ở Bài 23, nơi bộ đệm nhỏ hơn <code>mq_msgsize</code> sẽ cho ' +
         '<code>EMSGSIZE</code> ngay.</p>' +
         '<p>Vì vậy với UDP hãy luôn cấp bộ đệm nhận <b>lớn hơn</b> gói lớn nhất có thể tới — ' +
         '65 507 byte là trần lý thuyết của payload UDP trên IPv4. Muốn biết mình có bị cắt hay ' +
         'không thì gọi <code>recvfrom</code> với cờ <code>MSG_TRUNC</code>: khi đó giá trị trả ' +
         'về là độ dài <i>thật</i> của gói, kể cả phần đã mất.</p>' },

    { t: 'h3', x: 'UDP gửi vào hư không mà vẫn báo thành công' },

    { t: 'code', where: 'wsl', code: './udp_khong_ai' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sendto lan 1: THANH CONG, gui 4 byte — khong ai nhan\n' +
      'sendto lan 2: THANH CONG, gui 4 byte — khong ai nhan\n' +
      'sendto lan 3: THANH CONG, gui 4 byte — khong ai nhan\n' +
      'connect TCP cung cong: LOI ngay lap tuc — Connection refused\n' },

    { t: 'p', x:
      'Cổng 9999 không có ai nghe. TCP phát hiện điều đó <b>ngay trong lời gọi</b> ' +
      '<code>connect()</code>, vì bắt tay ba bước cần bên kia trả lời. UDP thì không có bắt ' +
      'tay: <code>sendto</code> chỉ có nghĩa "tôi đã trao gói cho nhân", và nó trả về thành ' +
      'công cả ba lần. Với UDP, <b>bạn</b> là người phải tự phát hiện mất mát — bằng số thứ tự ' +
      'gói, bằng biên nhận, bằng thời hạn chờ.' },

    { t: 'h3', x: 'Đo thử: TCP chậm hơn UDP bao nhiêu?' },

    { t: 'code', where: 'wsl', code:
      '# 10 000 luot khu hoi 16 byte tren loopback, ba lan moi giao thuc\n' +
      'for i in 1 2 3; do ./rtt tcp; done\n' +
      'for i in 1 2 3; do ./rtt udp; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'TCP  : 10000/10000 luot,  90.05 us moi luot khu hoi\n' +
      'TCP  : 10000/10000 luot,  92.15 us moi luot khu hoi\n' +
      'TCP  : 10000/10000 luot,  88.82 us moi luot khu hoi\n' +
      'UDP  : 10000/10000 luot,  73.67 us moi luot khu hoi\n' +
      'UDP  : 10000/10000 luot,  77.19 us moi luot khu hoi\n' +
      'UDP  : 10000/10000 luot,  75.30 us moi luot khu hoi\n' },

    { t: 'cal', kind: 'info', title: 'Chênh lệch nhỏ hơn bạn tưởng — và đó là điều nên nhớ',
      x: '<p>TCP <b>88,82–92,15 µs</b>, UDP <b>73,67–77,19 µs</b>: UDP nhanh hơn khoảng ' +
         '<b>17 %</b>. Không phải một trời một vực.</p>' +
         '<p>Lý do là phép đo này chạy trên loopback, nơi không có mất gói và không có tắc ' +
         'nghẽn, nên phần lớn cơ chế đắt tiền của TCP không phải làm gì. Trong 10 000 lượt UDP, ' +
         '<b>không gói nào</b> mất — con số <code>10000/10000</code> nói đúng điều đó.</p>' +
         '<p>Bài học: đừng chọn UDP vì "nó nhanh hơn". Hãy chọn nó khi bạn thật sự không cần ' +
         'bảo đảm — số đo nhiệt độ mỗi giây, mất một mẫu cũng không sao vì mẫu sau tới ngay. ' +
         'Còn khi cần bảo đảm mà lại dùng UDP, bạn sẽ phải tự viết lại đúng những gì TCP đã ' +
         'làm sẵn, và bản của bạn gần như chắc chắn tệ hơn.</p>' },

    { t: 'table',
      head: ['Tiêu chí', 'TCP', 'UDP'],
      rows: [
        ['Kiểu socket', '<code>SOCK_STREAM</code>', '<code>SOCK_DGRAM</code>'],
        ['Bắt tay trước khi gửi', 'Có — ba bước, tốn một vòng khứ hồi', 'Không'],
        ['Bảo đảm tới nơi', 'Có: gửi lại khi mất, có biên nhận', 'Không, và không báo cho bạn biết'],
        ['Bảo đảm thứ tự', 'Có', 'Không'],
        ['Ranh giới thông điệp', '<b>Không</b> — bạn phải tự đóng khung', '<b>Có</b> — một <code>sendto</code> = một <code>recvfrom</code>'],
        ['Gửi tới cổng chết', '<code>connect</code> lỗi ngay: <i>Connection refused</i>', '<code>sendto</code> báo thành công'],
        ['Khứ hồi 16 byte, loopback', '<b>88,82–92,15 µs</b>', '<b>73,67–77,19 µs</b>'],
        ['Gửi nhiều nơi cùng lúc', 'Không — mỗi kết nối một cặp', 'Có: broadcast và multicast'],
        ['Hợp với', 'Cấu hình, cập nhật firmware, lệnh điều khiển, log', 'Luồng số đo định kỳ, phát hiện thiết bị trong LAN, đồng bộ thời gian']
      ]},

    { t: 'fig', cap:
      'Cùng ba lần gửi 11 byte: TCP giao cho bạn một <i>dòng</i> byte có thể dính hoặc đứt tuỳ ' +
      'thời điểm, UDP giao đúng ba gói rời — nhưng có thể thiếu gói mà không báo.',
      svg:
      '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="So sánh ranh giới thông điệp giữa TCP và UDP">' +
      '<text class="d-t" x="20" y="24">Bên gửi: write/sendto ba lần, mỗi lần 11 byte</text>' +
      '<rect class="d-box-a" x="20" y="36" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="80" y="56" text-anchor="middle">do 1: 41.5</text>' +
      '<rect class="d-box-a" x="150" y="36" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="210" y="56" text-anchor="middle">do 2: 42.0</text>' +
      '<rect class="d-box-a" x="280" y="36" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="340" y="56" text-anchor="middle">do 3: 42.5</text>' +

      '<line class="d-line" x1="210" y1="70" x2="210" y2="100"/>' +
      '<path class="d-arrow" d="M210 100 L205 90 L215 90 Z"/>' +

      '<text class="d-t" x="20" y="126">TCP — bên nhận thấy 2 lần read</text>' +
      '<rect class="d-box-w" x="20" y="136" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="80" y="156" text-anchor="middle">11 byte</text>' +
      '<rect class="d-box-w" x="150" y="136" width="250" height="30" rx="6"/>' +
      '<text class="d-tm" x="275" y="156" text-anchor="middle">22 byte — hai thông điệp dính nhau</text>' +
      '<text class="d-ts" x="410" y="156">ranh giới đã mất</text>' +

      '<text class="d-t" x="20" y="202">UDP — bên nhận thấy 3 lần recvfrom</text>' +
      '<rect class="d-box-g" x="20" y="212" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="80" y="232" text-anchor="middle">10 byte</text>' +
      '<rect class="d-box-g" x="150" y="212" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="210" y="232" text-anchor="middle">10 byte</text>' +
      '<rect class="d-box-g" x="280" y="212" width="120" height="30" rx="6"/>' +
      '<text class="d-tm" x="340" y="232" text-anchor="middle">10 byte</text>' +
      '<text class="d-ts" x="410" y="232">ranh giới nguyên vẹn, nhưng gói có thể thiếu</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       7. BÀI TOÁN NHIỀU KÊNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một luồng, nhiều kênh — bài toán thật sự của bài này' },

    { t: 'p', x:
      'Máy chủ ở trên phục vụ đúng một khách rồi mới quay lại <code>accept()</code>. Nghe có vẻ ' +
      'chấp nhận được, cho tới khi bạn đo. Kịch bản: một khách chậm nối vào rồi im lặng 2 giây ' +
      '(mạng kém, hoặc chỉ là một cảm biến chậm), rồi một khách nhanh nối vào và hỏi ngay.' },

    { t: 'code', where: 'wsl', code:
      './may_tuan_tu 2 & sleep 0.4\n' +
      './khach_cham 2000 & sleep 0.3\n' +
      './khach_do\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[tuantu] nghe cong 9004\n' +
      '[tuantu] nhan khach fd 4 — tu gio KHONG accept ai khac\n' +
      '[cham] da noi, co y im lang 2000 ms\n' +
      '[tuantu] da tra loi fd 4\n' +
      '[cham] tra loi: nhiet do 42.5 do C\n' +
      '[tuantu] nhan khach fd 4 — tu gio KHONG accept ai khac\n' +
      '[tuantu] da tra loi fd 4\n' +
      '[do] cho 1697.0 ms moi nhan duoc tra loi\n' },

    { t: 'p', x:
      '<b>1697,0 ms</b> để trả lời một yêu cầu mà bản thân nó chỉ tốn dưới một phần nghìn giây. ' +
      'Toàn bộ thời gian đó là ngồi trong hàng chờ <code>listen</code> vì máy chủ đang bị ' +
      '<code>read()</code> giữ chân ở kênh của khách chậm. Một khách hỏng, chậm hoặc cố ý ác ý ' +
      'là đủ làm chết cả dịch vụ.' },

    { t: 'p', x:
      'Bài 22 đã cho bạn một lời giải: mỗi khách một luồng. Nó chạy được, và với vài chục kết ' +
      'nối thì hoàn toàn hợp lý. Nhưng mỗi luồng ăn một vùng stack — mặc định <b>8 MB</b> vùng ' +
      'địa chỉ, như bạn đã kiểm chứng — và bộ lập lịch phải chuyển ngữ cảnh giữa chúng. Trên ' +
      'thiết bị nhúng 64 MB RAM phục vụ hàng trăm kết nối, cách đó không sống nổi.' },

    { t: 'p', x:
      'Lời giải thứ hai là <b>I/O đa kênh</b>: một luồng duy nhất, hỏi nhân "trong đống mô tả ' +
      'file này, cái nào đã sẵn sàng?", rồi chỉ chạm vào những cái đó. Không có ' +
      '<code>read()</code> nào bị chặn, vì bạn chỉ đọc khi đã biết chắc có dữ liệu.' },

    { t: 'fig', cap:
      'Máy chủ tuần tự chặn ở một kênh nên mọi kênh khác phải chờ. I/O đa kênh chặn ở ' +
      '<i>tập hợp</i> kênh, nên nó thức dậy vì bất kỳ kênh nào có việc.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="So sánh máy chủ tuần tự với máy chủ dùng I/O đa kênh">' +
      '<rect class="d-box-w" x="20" y="16" width="320" height="130" rx="8"/>' +
      '<text class="d-t" x="180" y="40" text-anchor="middle">TUẦN TỰ — read() chặn ở một kênh</text>' +
      '<rect class="d-box" x="40" y="54" width="90" height="26" rx="5"/>' +
      '<text class="d-tm" x="85" y="72" text-anchor="middle">fd 4</text>' +
      '<rect class="d-box" x="140" y="54" width="90" height="26" rx="5"/>' +
      '<text class="d-tm" x="185" y="72" text-anchor="middle">fd 5</text>' +
      '<rect class="d-box" x="240" y="54" width="80" height="26" rx="5"/>' +
      '<text class="d-tm" x="280" y="72" text-anchor="middle">nghe</text>' +
      '<line class="d-line" x1="85" y1="84" x2="85" y2="108"/>' +
      '<path class="d-arrow" d="M85 108 L80 98 L90 98 Z"/>' +
      '<rect class="d-box-w" x="40" y="112" width="90" height="26" rx="5"/>' +
      '<text class="d-tm" x="85" y="130" text-anchor="middle">read()</text>' +
      '<text class="d-ts" x="145" y="130">fd 5 và fd nghe không ai đoái hoài</text>' +

      '<rect class="d-box-g" x="380" y="16" width="320" height="130" rx="8"/>' +
      '<text class="d-t" x="540" y="40" text-anchor="middle">ĐA KÊNH — chặn ở cả tập hợp</text>' +
      '<rect class="d-box" x="400" y="54" width="90" height="26" rx="5"/>' +
      '<text class="d-tm" x="445" y="72" text-anchor="middle">fd 4</text>' +
      '<rect class="d-box" x="500" y="54" width="90" height="26" rx="5"/>' +
      '<text class="d-tm" x="545" y="72" text-anchor="middle">fd 5</text>' +
      '<rect class="d-box" x="600" y="54" width="80" height="26" rx="5"/>' +
      '<text class="d-tm" x="640" y="72" text-anchor="middle">nghe</text>' +
      '<line class="d-line" x1="445" y1="84" x2="540" y2="108"/>' +
      '<line class="d-line" x1="545" y1="84" x2="540" y2="108"/>' +
      '<line class="d-line" x1="640" y1="84" x2="540" y2="108"/>' +
      '<path class="d-arrow" d="M540 108 L534 98 L546 99 Z"/>' +
      '<rect class="d-box-g" x="470" y="112" width="140" height="26" rx="5"/>' +
      '<text class="d-tm" x="540" y="130" text-anchor="middle">epoll_wait()</text>' +

      '<rect class="d-box-w" x="20" y="176" width="320" height="90" rx="8"/>' +
      '<text class="d-t" x="180" y="204" text-anchor="middle">Khách nhanh phải chờ</text>' +
      '<text class="d-t" x="180" y="240" text-anchor="middle">1697,0 ms</text>' +
      '<rect class="d-box-g" x="380" y="176" width="320" height="90" rx="8"/>' +
      '<text class="d-t" x="540" y="204" text-anchor="middle">Khách nhanh được phục vụ ngay</text>' +
      '<text class="d-t" x="540" y="240" text-anchor="middle">0,4 ms</text>' +
      '<text class="d-ts" x="360" y="288" text-anchor="middle">Cùng một kịch bản, cùng một máy — khác nhau 4000 lần</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       8. SELECT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'select — người đầu tiên, và giới hạn 1024' },

    { t: 'p', x:
      '<code>select()</code> có mặt từ BSD năm 1983 và vẫn còn trong mọi hệ thống POSIX. Ý ' +
      'tưởng: bạn đưa cho nhân một <b>bảng bit</b> đánh dấu những fd cần theo dõi, nhân đánh ' +
      'dấu lại những cái đã sẵn sàng.' },

    { t: 'code', where: 'file', name: 'may_select.c — phần vòng lặp chính', lang: 'c', code:
      '    int khach[TOI_DA];\n' +
      '    for (int i = 0; i < TOI_DA; i++) khach[i] = -1;\n' +
      '\n' +
      '    while (xong < can) {\n' +
      '        fd_set doc;\n' +
      '        FD_ZERO(&doc);                 /* PHAI dung lai moi vong */\n' +
      '        FD_SET(ls, &doc);\n' +
      '        int maxfd = ls;\n' +
      '        for (int i = 0; i < TOI_DA; i++)\n' +
      '            if (khach[i] != -1) {\n' +
      '                FD_SET(khach[i], &doc);\n' +
      '                if (khach[i] > maxfd) maxfd = khach[i];\n' +
      '            }\n' +
      '\n' +
      '        if (select(maxfd + 1, &doc, NULL, NULL, NULL) == -1) { perror("select"); break; }\n' +
      '\n' +
      '        if (FD_ISSET(ls, &doc)) {              /* co khach moi */\n' +
      '            int cs = accept(ls, NULL, NULL);\n' +
      '            if (cs != -1)\n' +
      '                for (int i = 0; i < TOI_DA; i++)\n' +
      '                    if (khach[i] == -1) { khach[i] = cs; break; }\n' +
      '        }\n' +
      '        for (int i = 0; i < TOI_DA; i++) {     /* khach cu co du lieu */\n' +
      '            int fd = khach[i];\n' +
      '            if (fd == -1 || !FD_ISSET(fd, &doc)) continue;\n' +
      '            char dem[128];\n' +
      '            ssize_t n = read(fd, dem, sizeof dem - 1);\n' +
      '            if (n <= 0) { close(fd); khach[i] = -1; continue; }\n' +
      '            const char *tl = "nhiet do 42.5 do C\\n";\n' +
      '            if (write(fd, tl, strlen(tl)) == -1) perror("write");\n' +
      '            close(fd); khach[i] = -1; xong++;\n' +
      '        }\n' +
      '    }\n' },

    { t: 'cmdx', cmd: 'select(nfds, &doc, &ghi, &loi, &hetgio)',
      title: 'Năm tham số và bốn macro đi kèm',
      rows: [
        ['nfds', 'Số fd <b>lớn nhất cộng 1</b> — không phải số lượng fd', 'Sai chỗ này là lỗi kinh điển. Nhân quét bảng bit từ 0 tới <code>nfds-1</code>'],
        ['&amp;doc', 'Tập fd cần theo dõi <i>đọc được</i>. Nhân <b>sửa</b> tập này tại chỗ', 'Đây là lý do phải <code>FD_ZERO</code> + <code>FD_SET</code> lại từ đầu mỗi vòng'],
        ['&amp;ghi, &amp;loi', 'Tập <i>ghi được</i> và tập <i>có ngoại lệ</i>. Truyền <code>NULL</code> nếu không cần', 'Tập ghi có ích khi <code>connect</code> không chặn hoặc khi bộ đệm gửi đã đầy'],
        ['&amp;hetgio', '<code>struct timeval</code> thời hạn chờ. <code>NULL</code> = chờ mãi mãi', 'Trên Linux nhân <b>ghi đè</b> struct này bằng thời gian còn lại — đừng tái dùng nó'],
        ['FD_ZERO / FD_SET', 'Xoá sạch tập / thêm một fd vào tập', 'Hai macro này bạn phải gọi lại <b>mỗi vòng lặp</b>'],
        ['FD_ISSET', 'Hỏi xem fd có được nhân đánh dấu sẵn sàng không', 'Phải duyệt qua <b>tất cả</b> fd để hỏi — không có cách nào lấy thẳng danh sách']
      ]},

    { t: 'code', where: 'wsl', code:
      '# cung kich ban khach cham + khach nhanh, nhung dung may_select\n' +
      './may_select 2 & sleep 0.4\n' +
      './khach_cham 2000 & sleep 0.3\n' +
      './khach_do\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[select] nghe cong 9004\n' +
      '[cham] da noi, co y im lang 2000 ms\n' +
      '[select] khach moi fd 4 — van tiep tuc theo doi moi kenh\n' +
      '[select] khach moi fd 5 — van tiep tuc theo doi moi kenh\n' +
      '[select] da tra loi fd 5\n' +
      '[do] cho 0.4 ms moi nhan duoc tra loi\n' +
      '[select] da tra loi fd 4\n' +
      '[select] phuc vu xong 2 khach\n' },

    { t: 'cal', kind: 'info', title: '1697,0 ms → 0,4 ms',
      x: '<p>Cùng hai máy khách, cùng cái máy, khác mỗi cách chờ. Khách nhanh được trả lời trong ' +
         '<b>0,4 ms</b> thay vì <b>1697,0 ms</b> — nhanh hơn khoảng <b>4000 lần</b> — trong khi ' +
         'khách chậm vẫn được phục vụ đầy đủ ngay khi nó chịu gửi.</p>' +
         '<p>Để ý thứ tự trong output: máy chủ <code>accept</code> cả hai khách <i>trước</i> khi ' +
         'trả lời ai. Nó không còn bị trói vào một kênh nữa.</p>' },

    { t: 'h3', x: 'Giới hạn cứng của select: FD_SETSIZE' },

    { t: 'p', x:
      '<code>fd_set</code> là một bảng bit có kích thước cố định, quyết định lúc biên dịch. Trên ' +
      'máy này nó là <b>128 byte</b> = <b>1024 bit</b> = <code>FD_SETSIZE</code>. Nghĩa là ' +
      '<code>select</code> không thể theo dõi fd số <b>1024</b> trở lên — mà một máy chủ chỉ ' +
      'cần hơn 1024 kết nối là chạm ngay vào đó.' },

    { t: 'code', where: 'wsl', code:
      '# mo /dev/null 1500 lan de day so fd len cao, roi thu FD_SET\n' +
      './select_vo\n' +
      'echo "ma thoat = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'fd cao nhat = 1502, FD_SETSIZE = 1024, sizeof(fd_set) = 128 byte\n' +
      'sap goi FD_SET(1502, &r) — vuot bang 1024 bit...\n' +
      '*** bit out of range 0 - FD_SETSIZE on fd_set ***: terminated\n' +
      'ma thoat = 134\n' },

    { t: 'cal', kind: 'danger', title: 'Ngày xưa nó âm thầm phá bộ nhớ, ngày nay nó giết tiến trình',
      x: '<p><code>FD_SET(1502, &amp;r)</code> đang ghi bit thứ 1502 vào một vùng chỉ có 1024 ' +
         'bit — tức là ghi đè lên bất cứ biến nào nằm sau <code>fd_set</code> trên stack. Trong ' +
         'nhiều năm đó là một lỗi hỏng bộ nhớ hoàn toàn im lặng, hậu quả xuất hiện ở nơi khác, ' +
         'lúc khác.</p>' +
         '<p>glibc hiện đại đã chèn kiểm tra vào chính macro: chương trình bị <code>abort()</code> ' +
         'ngay với thông báo <code>bit out of range</code>. Mã thoát <b>134 = 128 + 6</b>, mà ' +
         '6 là <code>SIGABRT</code> — đúng công thức mã thoát của Bài 21. Đáng chú ý: điều này ' +
         'xảy ra <b>kể cả khi không bật</b> <code>-D_FORTIFY_SOURCE</code>.</p>' +
         '<p>Chết ngay thì tốt hơn hỏng ngầm, nhưng vẫn là chết. Trên hệ thống có ' +
         '<code>ulimit -n</code> = <b>10240</b> như máy này, một daemon dùng <code>select</code> ' +
         'là quả bom hẹn giờ. Đó là lý do <code>poll</code> ra đời.</p>' },

    /* ══════════════════════════════════════════════
       9. POLL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'poll — bỏ bảng bit, dùng mảng' },

    { t: 'p', x:
      '<code>poll()</code> giữ nguyên ý tưởng nhưng đổi cấu trúc dữ liệu: thay bảng bit cố định ' +
      'bằng một <b>mảng</b> do bạn cấp phát. Hết giới hạn 1024, và tiện hơn ở một điểm quan ' +
      'trọng — nó tách <i>cái bạn hỏi</i> khỏi <i>cái nhân trả lời</i>.' },

    { t: 'code', where: 'file', name: 'may_poll.c — phần vòng lặp chính', lang: 'c', code:
      '    struct pollfd pf[TOI_DA];\n' +
      '    pf[0].fd = ls; pf[0].events = POLLIN;\n' +
      '    int so = 1;\n' +
      '\n' +
      '    while (xong < can) {\n' +
      '        int n = poll(pf, (nfds_t)so, -1);       /* KHONG phai dung lai mang */\n' +
      '        if (n == -1) { perror("poll"); break; }\n' +
      '\n' +
      '        if (pf[0].revents & POLLIN) {\n' +
      '            int cs = accept(ls, NULL, NULL);\n' +
      '            if (cs != -1 && so < TOI_DA) {\n' +
      '                pf[so].fd = cs; pf[so].events = POLLIN; pf[so].revents = 0;\n' +
      '                so++;\n' +
      '            }\n' +
      '        }\n' +
      '        for (int i = 1; i < so; i++) {\n' +
      '            if (!(pf[i].revents & (POLLIN | POLLHUP))) continue;\n' +
      '            char dem[128];\n' +
      '            ssize_t r = read(pf[i].fd, dem, sizeof dem - 1);\n' +
      '            if (r > 0) {\n' +
      '                const char *tl = "nhiet do 42.5 do C\\n";\n' +
      '                if (write(pf[i].fd, tl, strlen(tl)) == -1) perror("write");\n' +
      '                xong++;\n' +
      '            }\n' +
      '            close(pf[i].fd);\n' +
      '            pf[i] = pf[so - 1];                 /* lap o trong bang phan tu cuoi */\n' +
      '            so--; i--;\n' +
      '        }\n' +
      '    }\n',
      notes: [
        'Mẹo <code>pf[i] = pf[so-1]; so--; i--;</code> là cách xoá một phần tử khỏi mảng trong O(1) khi thứ tự không quan trọng: kéo phần tử cuối vào chỗ trống. Nhớ <code>i--</code>, nếu không bạn bỏ sót phần tử vừa kéo về.'
      ]},

    { t: 'cmdx', cmd: 'struct pollfd { int fd; short events; short revents; }',
      title: 'Ba trường, và vì sao tách events khỏi revents lại quan trọng',
      rows: [
        ['fd', 'Mô tả file cần theo dõi. Đặt số <b>âm</b> để nhân bỏ qua ô này',
         'Mẹo hữu ích: tạm ngừng theo dõi một kênh mà không phải xáo lại mảng — đổi <code>fd</code> thành <code>-fd</code>'],
        ['events', 'Cái bạn <b>hỏi</b>: <code>POLLIN</code> (đọc được), <code>POLLOUT</code> (ghi được)',
         'Bạn ghi, nhân chỉ đọc. Vì vậy mảng <b>không</b> bị phá — đây là ưu điểm lớn nhất so với <code>select</code>'],
        ['revents', 'Cái nhân <b>trả lời</b>. Nhân ghi, bạn đọc',
         'Luôn kiểm tra bằng phép AND bit: <code>if (pf[i].revents &amp; POLLIN)</code>'],
        ['POLLHUP', 'Bên kia đã đóng. Nhân đặt cờ này <b>dù bạn không hỏi</b>',
         'Cùng nhóm với <code>POLLERR</code> và <code>POLLNVAL</code> (fd không hợp lệ) — ba cờ luôn được báo'],
        ['poll(pf, so, -1)', 'Tham số hai là <b>số phần tử</b> — trực giác hơn <code>maxfd+1</code> của select',
         'Tham số ba là thời hạn tính bằng <b>mili giây</b>; −1 nghĩa là chờ mãi, 0 nghĩa là hỏi rồi về ngay']
      ]},

    { t: 'code', where: 'wsl', code:
      './may_poll 2 & sleep 0.4\n' +
      './khach_cham 2000 & sleep 0.3\n' +
      './khach_do\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[poll] nghe cong 9004, mang pollfd co 16 o\n' +
      '[cham] da noi, co y im lang 2000 ms\n' +
      '[poll] khach moi fd 4, dang theo doi 2 kenh\n' +
      '[poll] khach moi fd 5, dang theo doi 3 kenh\n' +
      '[poll] da tra loi fd 5\n' +
      '[do] cho 0.3 ms moi nhan duoc tra loi\n' +
      '[poll] da tra loi fd 4\n' +
      '[poll] phuc vu xong 2 khach\n' },

    { t: 'p', x:
      '<b>0,3 ms</b> — ngang với <code>select</code>. Với ba kênh thì hai cách không khác nhau ' +
      'về tốc độ; cái <code>poll</code> mua được là bỏ giới hạn 1024 và không phải dựng lại tập ' +
      'mỗi vòng. Khác biệt về <i>tốc độ</i> chỉ lộ ra khi số kênh lớn — và khi đó cả hai đều ' +
      'thua.' },

    /* ══════════════════════════════════════════════
       10. EPOLL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'epoll — để nhân nhớ hộ danh sách' },

    { t: 'p', x:
      '<code>select</code> và <code>poll</code> có chung một khuyết tật cấu trúc: <b>mỗi lần ' +
      'gọi</b>, bạn chép toàn bộ danh sách fd vào nhân, nhân duyệt hết cả danh sách, rồi bạn ' +
      'duyệt hết cả danh sách lần nữa để tìm cái sẵn sàng. Với 2000 kênh mà chỉ 1 kênh có dữ ' +
      'liệu, bạn trả giá cho 2000 kênh để lấy về 1.' },

    { t: 'p', x:
      '<code>epoll</code> — riêng của Linux, có từ kernel 2.5.44 — lật ngược cách làm. Bạn khai ' +
      'báo danh sách <b>một lần</b>, nhân giữ nó trong một cấu trúc dữ liệu của riêng nó, và ' +
      'mỗi lần gọi bạn chỉ nhận về đúng những fd đã sẵn sàng.' },

    { t: 'cmdx', cmd: 'epoll_create1 / epoll_ctl / epoll_wait',
      title: 'Ba lời gọi thay cho một',
      rows: [
        ['epoll_create1(0)', 'Tạo một <b>đối tượng epoll</b> trong nhân và trả về mô tả file trỏ tới nó',
         'Đúng, bản thân nó cũng là một fd — nên bạn lồng được epoll trong epoll. Truyền <code>EPOLL_CLOEXEC</code> để nó tự đóng khi <code>exec</code>'],
        ['epoll_ctl(ep, ADD, fd, &amp;ev)', 'Thêm / sửa / xoá một fd khỏi danh sách nhân đang giữ',
         'Ba lệnh: <code>EPOLL_CTL_ADD</code>, <code>EPOLL_CTL_MOD</code>, <code>EPOLL_CTL_DEL</code>. Gọi <b>một lần</b> cho mỗi kết nối, không phải mỗi vòng lặp'],
        ['ev.events', 'Cờ quan tâm: <code>EPOLLIN</code>, <code>EPOLLOUT</code>, <code>EPOLLET</code>, <code>EPOLLONESHOT</code>',
         '<code>EPOLLHUP</code> và <code>EPOLLERR</code> luôn được báo dù bạn không xin'],
        ['ev.data', 'Một union 64 bit <b>của bạn</b>. Nhân giữ nguyên và trả lại y hệt',
         'Dùng <code>.fd</code> cho đơn giản, hoặc <code>.ptr</code> trỏ tới struct trạng thái của kết nối — mẹo này xoá luôn việc tra bảng'],
        ['epoll_wait(ep, sk, 16, -1)', 'Trả về <b>số fd sẵn sàng</b> và điền chúng vào mảng <code>sk</code>',
         'Đây là điểm mấu chốt: bạn chỉ duyệt <code>n</code> phần tử, không phải toàn bộ danh sách. Tham số cuối là thời hạn mili giây'],
        ['-1 / 0 / 1500', 'Thời hạn: chờ mãi / hỏi rồi về ngay / chờ tối đa 1,5 giây',
         'Thời hạn hữu hạn rất hợp với daemon nhúng: nó cho bạn một nhịp đều để kiểm tra watchdog hay ghi log định kỳ']
      ]},

    { t: 'code', where: 'file', name: 'may_epoll.c — bộ khung', lang: 'c', code:
      '    int ep = epoll_create1(0);\n' +
      '    if (ep == -1) { perror("epoll_create1"); exit(1); }\n' +
      '\n' +
      '    struct epoll_event ev;\n' +
      '    ev.events  = EPOLLIN;\n' +
      '    ev.data.fd = ls;\n' +
      '    if (epoll_ctl(ep, EPOLL_CTL_ADD, ls, &ev) == -1) { perror("epoll_ctl"); exit(1); }\n' +
      '\n' +
      '    struct epoll_event sk[16];\n' +
      '    for (;;) {\n' +
      '        int n = epoll_wait(ep, sk, 16, 1500);\n' +
      '        if (n == -1) { perror("epoll_wait"); break; }\n' +
      '        if (n == 0)  { printf("het gio, khong con su kien\\n"); break; }\n' +
      '\n' +
      '        for (int i = 0; i < n; i++) {          /* CHI duyet n, khong duyet ca danh sach */\n' +
      '            if (sk[i].data.fd == ls) {\n' +
      '                int cs = accept(ls, NULL, NULL);\n' +
      '                if (cs == -1) continue;\n' +
      '                struct epoll_event e2;\n' +
      '                e2.events  = EPOLLIN | (et ? EPOLLET : 0);\n' +
      '                e2.data.fd = cs;\n' +
      '                epoll_ctl(ep, EPOLL_CTL_ADD, cs, &e2);\n' +
      '            } else {\n' +
      '                char b[8];\n' +
      '                ssize_t r = read(sk[i].data.fd, b, 5);   /* CO Y doc it */\n' +
      '                if (r <= 0) {\n' +
      '                    epoll_ctl(ep, EPOLL_CTL_DEL, sk[i].data.fd, NULL);\n' +
      '                    close(sk[i].data.fd);\n' +
      '                    continue;\n' +
      '                }\n' +
      '                /* ... xu ly r byte ... */\n' +
      '            }\n' +
      '        }\n' +
      '    }\n' },

    { t: 'h3', x: 'Đo thật: ba cách chờ trên 10 → 2000 kênh' },

    { t: 'p', x:
      'Chương trình <code>dosuc_io.c</code> tạo N pipe, đưa hết vào tập theo dõi, rồi lặp ' +
      '10 000 lần: ghi 1 byte vào <b>một</b> pipe, gọi hàm chờ, đọc byte đó ra. Nghĩa là mỗi ' +
      'vòng luôn có đúng một kênh sẵn sàng, còn lại đều rỗi — mô phỏng đúng một máy chủ có ' +
      'nhiều kết nối nhàn rỗi.' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -O2 -o dosuc_io dosuc_io.c\n' +
      'for N in 10 100 500 2000; do ./dosuc_io $N; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'N = 10    kenh, fd doc lon nhat = 21    (FD_SETSIZE = 1024)\n' +
      '  select :    2.49 us/lan\n' +
      '  poll   :    2.51 us/lan\n' +
      '  epoll  :    1.04 us/lan\n' +
      'N = 100   kenh, fd doc lon nhat = 201   (FD_SETSIZE = 1024)\n' +
      '  select :   13.28 us/lan\n' +
      '  poll   :   15.44 us/lan\n' +
      '  epoll  :    0.98 us/lan\n' +
      'N = 500   kenh, fd doc lon nhat = 1001  (FD_SETSIZE = 1024)\n' +
      '  select :   62.73 us/lan\n' +
      '  poll   :   59.19 us/lan\n' +
      '  epoll  :    0.88 us/lan\n' +
      'N = 2000  kenh, fd doc lon nhat = 4001  (FD_SETSIZE = 1024)\n' +
      '  select : KHONG DUNG DUOC (fd 4001 >= FD_SETSIZE 1024)\n' +
      '  poll   :  270.23 us/lan\n' +
      '  epoll  :    0.77 us/lan\n',
      notes: [
        'Đây là kết quả một lượt chạy tiêu biểu. Ba lượt liên tiếp cho khoảng: select 2,49–3,71 · 13,28–17,05 · 62,73–70,68 µs; poll 2,51–2,82 · 15,44–17,74 · 59,19–65,54 µs; epoll 0,88–1,83 µs ở mọi N.'
      ]},

    { t: 'table',
      head: ['Số kênh', 'select', 'poll', 'epoll', 'epoll nhanh hơn'],
      rows: [
        ['10',   '2,49 µs',       '2,51 µs',   '1,04 µs', '<b>2,4×</b>'],
        ['100',  '13,28 µs',      '15,44 µs',  '0,98 µs', '<b>14×</b>'],
        ['500',  '62,73 µs',      '59,19 µs',  '0,88 µs', '<b>67×</b>'],
        ['2000', 'không dùng được', '270,23 µs', '0,77 µs', '<b>351×</b>']
      ]},

    { t: 'cal', kind: 'why', title: 'Hãy nhìn cột epoll theo chiều dọc, không phải chiều ngang',
      x: '<p>Điều đáng nhớ không phải "epoll nhanh hơn 351 lần". Đó chỉ là hệ quả. Điều đáng nhớ ' +
         'là <b>cột epoll không đổi</b>: 1,04 → 0,98 → 0,88 → 0,77 µs khi số kênh tăng ' +
         '<b>200 lần</b>. Nó thậm chí còn nhích xuống, do dao động đo.</p>' +
         '<p>Đó là khác biệt giữa <b>O(n)</b> và <b>O(1)</b>. <code>select</code> và ' +
         '<code>poll</code> tốn công tỉ lệ với số kênh <i>bạn đang theo dõi</i>; ' +
         '<code>epoll</code> tốn công tỉ lệ với số kênh <i>đang có việc</i>. Nhân duy trì sẵn ' +
         'một danh sách "đã sẵn sàng" và mỗi fd tự đăng ký vào đó khi có dữ liệu, nên ' +
         '<code>epoll_wait</code> chỉ việc múc danh sách ấy ra.</p>' +
         '<p>Với máy chủ nhúng, đây đúng là hình dạng tải thật: hàng trăm kết nối mở, mỗi giây ' +
         'chỉ vài cái nói. <code>poll</code> sẽ quét cả trăm cái để tìm ra vài cái đó, mỗi lần, ' +
         'mãi mãi.</p>' },

    { t: 'p', x:
      '<code>strace -c</code> cho thấy chi phí nằm ở đâu. Cùng 10 000 lời gọi trên 500 kênh, ' +
      'thời gian trung bình mỗi syscall (số đã bị <code>strace</code> làm chậm, chỉ dùng để so ' +
      'tương đối):' },

    { t: 'code', where: 'out', nocopy: true, code:
      '% time     seconds  usecs/call     calls    errors syscall\n' +
      '------ ----------- ----------- --------- --------- ----------------\n' +
      ' 44.91    1.037390         103     10000           poll\n' +
      ' 44.29    1.023023         102     10000           pselect6\n' +
      ' 10.24    0.236521          23     10000           epoll_wait\n' +
      '  0.56    0.012989          25       500           epoll_ctl\n' },

    { t: 'cal', kind: 'info', title: 'Hai chi tiết nhỏ trong bảng strace',
      x: '<ul>' +
         '<li><code>select()</code> hiện ra dưới tên <b><code>pselect6</code></b>. Hàm thư viện ' +
         '<code>select</code> gọi syscall <code>pselect6</code> — cùng kiểu "hàm thư viện ≠ ' +
         'syscall" bạn gặp với <code>shm_open</code> ở Bài 23.</li>' +
         '<li><code>epoll_ctl</code> chỉ bị gọi <b>500</b> lần cho 500 kênh, tức <b>một lần mỗi ' +
         'kênh</b>, trong khi <code>epoll_wait</code> gọi 10 000 lần. Đó chính là hình ảnh của ' +
         'việc "khai báo một lần, dùng mãi".</li>' +
         '</ul>' },

    { t: 'fig', cap:
      'Chi phí mỗi lời gọi tăng tuyến tính với <code>select</code>/<code>poll</code> nhưng nằm ' +
      'ngang với <code>epoll</code> — vì nhân giữ sẵn danh sách kênh đã sẵn sàng.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Biểu đồ cột so sánh chi phí mỗi lời gọi của select, poll và epoll theo số kênh">' +
      '<line class="d-line" x1="70" y1="250" x2="700" y2="250"/>' +
      '<line class="d-line" x1="70" y1="30" x2="70" y2="250"/>' +
      '<text class="d-ts" x="24" y="40">µs</text>' +
      '<text class="d-ts" x="24" y="254">0</text>' +

      '<text class="d-t" x="140" y="272" text-anchor="middle">10 kênh</text>' +
      '<rect class="d-box-w" x="100" y="240" width="24" height="10"/>' +
      '<rect class="d-box-w" x="128" y="240" width="24" height="10"/>' +
      '<rect class="d-box-g" x="156" y="246" width="24" height="4"/>' +
      '<text class="d-ts" x="140" y="232" text-anchor="middle">2,5 · 2,5 · 1,0</text>' +

      '<text class="d-t" x="290" y="272" text-anchor="middle">100 kênh</text>' +
      '<rect class="d-box-w" x="250" y="197" width="24" height="53"/>' +
      '<rect class="d-box-w" x="278" y="188" width="24" height="62"/>' +
      '<rect class="d-box-g" x="306" y="246" width="24" height="4"/>' +
      '<text class="d-ts" x="290" y="180" text-anchor="middle">13,3 · 15,4 · 1,0</text>' +

      '<text class="d-t" x="440" y="272" text-anchor="middle">500 kênh</text>' +
      '<rect class="d-box-w" x="400" y="99" width="24" height="151"/>' +
      '<rect class="d-box-w" x="428" y="108" width="24" height="142"/>' +
      '<rect class="d-box-g" x="456" y="247" width="24" height="3"/>' +
      '<text class="d-ts" x="440" y="91" text-anchor="middle">62,7 · 59,2 · 0,9</text>' +

      '<text class="d-t" x="590" y="272" text-anchor="middle">2000 kênh</text>' +
      '<rect class="d-box" x="550" y="230" width="24" height="20"/>' +
      '<text class="d-ts" x="562" y="224" text-anchor="middle">×</text>' +
      '<rect class="d-box-w" x="578" y="40" width="24" height="210"/>' +
      '<rect class="d-box-g" x="606" y="247" width="24" height="3"/>' +
      '<text class="d-ts" x="600" y="32" text-anchor="middle">270,2 · 0,8</text>' +

      '<rect class="d-box-w" x="72" y="34" width="14" height="10"/>' +
      '<text class="d-ts" x="92" y="43">select / poll (O(n))</text>' +
      '<rect class="d-box-g" x="220" y="34" width="14" height="10"/>' +
      '<text class="d-ts" x="240" y="43">epoll (O(1))</text>' +
      '<text class="d-ts" x="340" y="43">× = select không dùng được khi fd ≥ 1024</text>' +
      '</svg>' },

    { t: 'h3', x: 'Level-triggered và edge-triggered' },

    { t: 'p', x:
      'Mặc định <code>epoll</code> chạy <b>level-triggered</b>, giống hệt ' +
      '<code>select</code>/<code>poll</code>: chừng nào còn dữ liệu chưa đọc, ' +
      '<code>epoll_wait</code> còn báo. Thêm cờ <code>EPOLLET</code> thì nó chuyển sang ' +
      '<b>edge-triggered</b>: chỉ báo khi trạng thái <i>thay đổi</i>. Hãy đo sự khác nhau bằng ' +
      'một máy chủ cố tình chỉ đọc 5 byte mỗi lần, trong khi khách gửi 20 byte một lượt.' },

    { t: 'code', where: 'wsl', code:
      './may_epoll lt & sleep 0.4; ./khach_gui 9005 "0123456789ABCDEFGHIJ" 3; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[epoll] che do LEVEL-triggered (mac dinh), doc TOI DA 5 byte moi su kien\n' +
      '[khach] gui MOT LAN 20 byte roi giu ket noi 3 giay\n' +
      '[epoll] them fd 5 vao tap theo doi\n' +
      '[epoll] su kien 1: doc 5 byte -> "01234"  (tong 5)\n' +
      '[epoll] su kien 2: doc 5 byte -> "56789"  (tong 10)\n' +
      '[epoll] su kien 3: doc 5 byte -> "ABCDE"  (tong 15)\n' +
      '[epoll] su kien 4: doc 5 byte -> "FGHIJ"  (tong 20)\n' +
      '[epoll] 1500 ms troi qua, khong con su kien -> thoat\n' +
      '[epoll] tong cong 4 su kien doc, 20 byte lay ve\n' },

    { t: 'code', where: 'wsl', code:
      './may_epoll et & sleep 0.4; ./khach_gui 9005 "0123456789ABCDEFGHIJ" 3; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[epoll] che do EDGE-triggered (EPOLLET), doc TOI DA 5 byte moi su kien\n' +
      '[khach] gui MOT LAN 20 byte roi giu ket noi 3 giay\n' +
      '[epoll] them fd 5 vao tap theo doi\n' +
      '[epoll] su kien 1: doc 5 byte -> "01234"  (tong 5)\n' +
      '[epoll] 1500 ms troi qua, khong con su kien -> thoat\n' +
      '[epoll] tong cong 1 su kien doc, 5 byte lay ve\n' },

    { t: 'cal', kind: 'danger', title: '15 byte biến mất và không có lỗi nào được báo',
      x: '<p>Cùng một máy khách gửi cùng 20 byte. Level-triggered: <b>4 sự kiện, 20 byte</b>. ' +
         'Edge-triggered: <b>1 sự kiện, 5 byte</b>. Mười lăm byte còn nằm nguyên trong bộ đệm ' +
         'nhận của nhân, nhưng chương trình sẽ không bao giờ được đánh thức để lấy chúng — vì ' +
         'không có <i>cạnh</i> mới nào xuất hiện. Với edge-triggered, "có dữ liệu mới tới" mới ' +
         'là sự kiện; "vẫn còn dữ liệu chưa đọc" thì không.</p>' +
         '<p>Đây là một trong những lỗi khó tái hiện nhất trong mã mạng, vì nó chỉ xuất hiện khi ' +
         'thông điệp dài hơn bộ đệm bạn đọc mỗi lần. Test với thông điệp ngắn thì mọi thứ hoàn ' +
         'hảo.</p>' +
         '<p><b>Quy tắc bất di bất dịch của EPOLLET</b>: đã dùng edge-triggered thì fd ' +
         '<b>phải</b> ở chế độ không chặn, và mỗi lần có sự kiện bạn phải <code>read()</code> ' +
         'trong vòng lặp tới khi nhận <code>EAGAIN</code>. Không có đường tắt.</p>' },

    { t: 'table',
      head: ['', 'Level-triggered (mặc định)', 'Edge-triggered (<code>EPOLLET</code>)'],
      rows: [
        ['Khi nào báo', 'Chừng nào còn dữ liệu chưa đọc', 'Chỉ khi có dữ liệu <b>mới</b> tới'],
        ['Đọc hết trong một lần?', 'Không bắt buộc — lần sau nó nhắc lại', '<b>Bắt buộc</b>, tới khi <code>EAGAIN</code>'],
        ['Cần O_NONBLOCK?', 'Không bắt buộc', '<b>Bắt buộc</b> — nếu không vòng đọc sẽ treo ở byte cuối'],
        ['Số lần đánh thức (đo được)', '<b>4</b> sự kiện cho 20 byte', '<b>1</b> sự kiện'],
        ['Khi nào chọn', 'Mặc định. Chọn cái này trừ khi có lý do rõ ràng', 'Rất nhiều kết nối, muốn giảm số lần đánh thức — và đội của bạn đủ kỷ luật']
      ]},

    /* ══════════════════════════════════════════════
       11. I/O KHÔNG CHẶN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'I/O không chặn và EAGAIN' },

    { t: 'p', x:
      'Mảnh cuối cùng. Đặt cờ <code>O_NONBLOCK</code> lên một fd và mọi lời gọi lẽ ra phải chờ ' +
      'sẽ lập tức trả về <b>−1</b> với <code>errno = EAGAIN</code>, nghĩa là "chưa có gì, thử ' +
      'lại sau". Đây không phải lỗi — đây là câu trả lời.' },

    { t: 'code', where: 'wsl', code: './khongchan' },

    { t: 'code', where: 'out', nocopy: true, code:
      'EAGAIN = 11, EWOULDBLOCK = 11 -> cung mot gia tri tren Linux\n' +
      'read()  tren ong RONG   : tra ve -1, errno = 11 (Resource temporarily unavailable)\n' +
      'write() 100000 byte     : tra ve 65536  -> ghi THIEU 34464 byte\n' +
      'write() khi ong DAY     : tra ve -1, errno = 11 (Resource temporarily unavailable)\n' +
      'read()  sau khi co data : tra ve 16\n' },

    { t: 'cal', kind: 'why', title: 'Con số 65536 này bạn đã gặp rồi',
      x: '<p>Ở Bài 23 bạn đo được sức chứa của một pipe: <b>65 536</b> byte. Giờ nó quay lại ' +
         'đúng vị trí ấy — một lệnh <code>write()</code> xin ghi 100 000 byte chỉ ghi được ' +
         '<b>65 536</b>, đúng bằng chỗ trống trong bộ đệm của nhân, rồi trả về.</p>' +
         '<p>Điều quan trọng: <b>đây không phải hành vi riêng của chế độ không chặn</b>. Ở chế ' +
         'độ chặn, <code>write()</code> cũng có thể ghi thiếu — nó chỉ chặn khi <i>chưa ghi ' +
         'được byte nào</i>. Chế độ không chặn chỉ làm cho hiện tượng lộ ra sớm và thường xuyên ' +
         'hơn, nên bạn buộc phải viết đúng.</p>' +
         '<p>Vì vậy quy tắc lặp quanh <code>read</code>/<code>write</code> từ phần TCP là bắt ' +
         'buộc ở mọi chế độ. Trong daemon phần thực hành, vòng ghi được viết đúng như vậy.</p>' },

    { t: 'code', where: 'file', name: 'Khuôn mẫu ghi đủ byte trên socket không chặn', lang: 'c', code:
      '    int len = snprintf(tl, sizeof tl, "nhiet=%.1f mau=%lu\\n", d, m);\n' +
      '    int da = 0;\n' +
      '    while (da < len) {\n' +
      '        ssize_t k = write(fd, tl + da, (size_t)(len - da));\n' +
      '        if (k == -1) {\n' +
      '            if (errno == EAGAIN || errno == EWOULDBLOCK) continue;  /* chua ghi duoc, thu lai */\n' +
      '            perror("write"); break;                                 /* loi that */\n' +
      '        }\n' +
      '        da += (int)k;\n' +
      '    }\n',
      notes: [
        '<code>continue</code> ở đây là vòng bận, chấp nhận được vì thông điệp chỉ vài chục byte. Với dữ liệu lớn, cách đúng là đăng ký <code>EPOLLOUT</code> rồi quay lại <code>epoll_wait</code> — đừng quay vòng đốt CPU.'
      ]},

    { t: 'cal', kind: 'tip', title: 'EAGAIN và EWOULDBLOCK là cùng một số trên Linux',
      x: '<p>Cả hai đều bằng <b>11</b>, như output ở trên xác nhận. POSIX cho phép chúng khác ' +
         'nhau nên mã có tính di động vẫn kiểm tra cả hai — <code>if (errno == EAGAIN || ' +
         'errno == EWOULDBLOCK)</code>. Trên Linux bạn chỉ cần một, nhưng viết cả hai không tốn ' +
         'gì và giúp mã dịch được trên các Unix khác.</p>' +
         '<p>Đừng nhầm <code>EAGAIN</code> với <code>EINTR</code>. <code>EAGAIN</code> = "chưa ' +
         'có dữ liệu". <code>EINTR</code> = "một tín hiệu vừa cắt ngang lời gọi của bạn" — cái ' +
         'bạn đã xử lý ở Bài 21. Daemon phần thực hành xử lý cả hai, ở hai chỗ khác nhau.</p>' },

    /* ══════════════════════════════════════════════
       12. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ socket đầu tiên tới daemon đa kênh' },

    { t: 'p', x:
      'Sáu bước, khoảng 55 phút. Bước 1–3 dựng và quan sát; bước 4–5 đo; bước 6 là bài tổng ' +
      'kết cả Chặng 03 — một daemon nhúng thật, gộp <code>epoll</code>, <code>signalfd</code> ' +
      'của Bài 21, luồng và mutex của Bài 22, socket của bài này.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Dựng thư mục và biên dịch sạch',
        blocks: [
          { t: 'p', x:
            'Tất cả mã của bài này nằm trong một thư mục riêng. Hãy biên dịch với ' +
            '<code>-Wall -Wextra</code> ngay từ đầu: mã mạng có nhiều chỗ ép kiểu con trỏ và ' +
            'nếu bạn để cảnh báo tích lại thì cảnh báo thật sẽ chìm mất giữa đám cảnh báo vặt.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai24 && cd ~/embedded/bai24\n' +
            'gcc -Wall -Wextra -O2 -o may_tcp   may_tcp.c\n' +
            'gcc -Wall -Wextra -O2 -o khach_tcp khach_tcp.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bien dich: 0 canh bao\n' },

          { t: 'cal', kind: 'tip', title: 'Một Makefile ba dòng đỡ mỏi tay',
            x: '<p>Bài 16 đã dạy quy tắc mẫu. Đặt file <code>Makefile</code> với nội dung ' +
               '<code>CFLAGS = -Wall -Wextra -O2</code>, <code>LDLIBS =</code> và ' +
               '<code>all: may_tcp khach_tcp may_udp ...</code> rồi chỉ cần gõ ' +
               '<code>make</code>. Riêng daemon ở bước 6 cần thêm <code>-pthread</code>, khai ' +
               'báo bằng một dòng <code>daemon_nhietdo: LDFLAGS += -pthread</code>.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Máy chủ TCP đầu tiên, và nhìn nó bằng ss',
        blocks: [
          { t: 'p', x:
            'Chạy máy chủ ở nền, cho nó 0,4 giây để kịp <code>bind</code> và ' +
            '<code>listen</code>, rồi cho máy khách nối vào. Đây là toàn bộ vòng đời của một ' +
            'kết nối TCP, gói trong một dòng lệnh.' },

          { t: 'code', where: 'wsl', code:
            './may_tcp 1 & sleep 0.4; ./khach_tcp 127.0.0.1 9000; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[may] fd nghe = 3, cho khach tren cong 9000\n' +
            '[khach] noi duoc toi 127.0.0.1:9000, fd = 3\n' +
            '[may] khach 127.0.0.1:59150  ->  fd moi = 4\n' +
            '[may] nhan 13 byte: XIN NHIET DO\n' +
            '[khach] tra loi: nhiet do 42.5 do C\n' +
            '[may] dong fd 4\n' },

          { t: 'p', x:
            'Bây giờ nhìn socket nghe từ bên ngoài. Chạy lại máy chủ ở nền rồi hỏi hệ thống ' +
            'xem ai đang giữ cổng 9000:' },

          { t: 'code', where: 'wsl', code:
            './may_tcp 1 >/dev/null 2>&1 & sleep 0.4\n' +
            'ss -tlnp | grep \':9000\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'LISTEN 0      16            0.0.0.0:9000      0.0.0.0:*    users:(("may_tcp",pid=472,fd=3))\n' },

          { t: 'cmdx', cmd: 'ss -tlnp', title: 'Đọc từng cột',
            rows: [
              ['-t', 'Chỉ TCP', 'Đổi thành <code>-u</code> cho UDP, <code>-x</code> cho Unix socket của Bài 23'],
              ['-l', 'Chỉ socket đang <b>nghe</b>', 'Bỏ <code>-l</code> đi để thấy cả kết nối đang mở và cả <code>TIME-WAIT</code>'],
              ['-n', 'Không tra tên dịch vụ', 'Không có nó, 9000 sẽ hiện thành <code>cslistener</code> — vô ích và chậm'],
              ['-p', 'Hiện tiến trình đang giữ socket', 'Đây là cột quý nhất khi gỡ lỗi: nó nối thẳng cổng ↔ pid ↔ fd'],
              ['LISTEN 0 16', 'Hàng đợi đang có <b>0</b>, sức chứa <b>16</b>', 'Đúng bằng đối số <code>listen(ls, 16)</code> trong mã'],
              ['0.0.0.0:9000', 'Nghe trên <b>mọi</b> giao diện', 'Hệ quả trực tiếp của <code>INADDR_ANY</code>. Muốn chỉ loopback thì dùng <code>inet_pton(AF_INET, "127.0.0.1", …)</code>'],
              ['fd=3', 'Socket nghe là mô tả file số 3 của tiến trình', 'Khớp với dòng <code>fd nghe = 3</code> chương trình tự in ra']
            ]},

          { t: 'cal', kind: 'info', title: 'ss là công cụ bạn sẽ dùng nhiều nhất',
            x: '<p><code>ss</code> ("socket statistics") thay cho <code>netstat</code> cũ và ' +
               'đọc thẳng từ netlink nên nhanh hơn nhiều. Trên board nhúng chạy BusyBox ' +
               '(Chặng 09) có thể chỉ có <code>netstat</code> — cú pháp gần như y hệt: ' +
               '<code>netstat -tlnp</code>.</p>' +
               '<p>Nhớ <code>pkill -f may_tcp</code> để dọn tiến trình nền trước khi sang bước ' +
               'sau, nếu không cổng 9000 vẫn bị giữ.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Tự chứng minh: TCP mất ranh giới, UDP giữ ranh giới',
        blocks: [
          { t: 'p', x:
            'Đây là bước quan trọng nhất về nhận thức. Máy khách gửi <b>ba</b> lệnh ' +
            '<code>write()</code>, mỗi lệnh 11 byte. Đếm xem máy chủ cần bao nhiêu lệnh ' +
            '<code>read()</code>.' },

          { t: 'code', where: 'wsl', code:
            './may_ranhgioi 0 & sleep 0.4; ./khach_ranhgioi 0; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[khach] write() lan 1 gui 11 byte\n' +
            '[may] read() lan 1 tra ve 11 byte: "do 1: 41.5|"\n' +
            '[khach] write() lan 2 gui 11 byte\n' +
            '[may] read() lan 2 tra ve 11 byte: "do 2: 42.0|"\n' +
            '[khach] write() lan 3 gui 11 byte\n' +
            '[may] read() lan 3 tra ve 11 byte: "do 3: 42.5|"\n' +
            '[may] read() tra ve 0 -> khach da dong. Tong so lan read = 3\n' },

          { t: 'cal', kind: 'warn', title: 'Lần chạy này ra 3 — và đó chính là cái bẫy',
            x: '<p>Ba <code>write</code>, ba <code>read</code>, khớp hoàn hảo. Nếu bạn dừng ở ' +
               'đây, bạn sẽ tin rằng TCP giữ ranh giới thông điệp và sẽ viết mã dựa trên niềm ' +
               'tin đó.</p>' +
               '<p>Hãy chạy lại vài lần liên tiếp. Ở phần lý thuyết trên, cùng chương trình này ' +
               'đã cho <b>2</b> lần <code>read</code> — lần đầu 11 byte, lần sau <b>22</b> byte ' +
               'gộp của hai <code>write</code>. Kết quả phụ thuộc vào việc nhân ' +
               '<i>kịp</i> chuyển gói đi trước khi lệnh ghi sau tới hay không, tức là phụ thuộc ' +
               'vào lịch chạy của CPU, tải máy và độ trễ đường truyền.</p>' +
               '<p>Trên loopback nhàn rỗi bạn hầu như luôn thấy 3. Trên Ethernet thật, với một ' +
               'board đang bận, bạn sẽ thấy 2, hoặc 1, hoặc 5. <b>Một lỗi chỉ xuất hiện ngoài ' +
               'hiện trường là loại lỗi đắt nhất.</b></p>' },

          { t: 'p', x: 'Giờ làm y hệt bằng UDP:' },

          { t: 'code', where: 'wsl', code:
            './may_udp 256 & sleep 0.4; ./khach_udp; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[udp] cho goi tren cong 9002, bo dem nhan = 256 byte\n' +
            '[udp] recvfrom() lan 1: 10 byte tu 127.0.0.1:48461 -> "do 1: 41.5"\n' +
            '[khach] sendto() lan 1 gui 10 byte, khong can connect()\n' +
            '[khach] sendto() lan 2 gui 10 byte, khong can connect()\n' +
            '[khach] sendto() lan 3 gui 10 byte, khong can connect()\n' +
            '[udp] recvfrom() lan 2: 10 byte tu 127.0.0.1:48461 -> "do 2: 42.0"\n' +
            '[udp] recvfrom() lan 3: 10 byte tu 127.0.0.1:48461 -> "do 3: 42.5"\n' },

          { t: 'cal', kind: 'why', title: 'Chú ý thứ tự các dòng, không chỉ nội dung',
            x: '<p>Máy khách in ba dòng <code>sendto</code> gần như liền nhau, còn máy chủ vẫn ' +
               'lấy ra <b>đúng ba gói 10 byte</b>, không gộp, không tách. Ba gói đã nằm xếp ' +
               'hàng trong bộ đệm nhận của nhân từ trước; <code>recvfrom</code> lấy ra ' +
               '<i>từng gói một</i>, dù chúng đã có sẵn cùng lúc.</p>' +
               '<p>Đó là toàn bộ khác biệt: TCP là một ống nước, UDP là một chồng phong bì. Với ' +
               'TCP bạn phải tự dán nhãn lên dòng byte; với UDP nhãn đã có sẵn — đổi lại phong ' +
               'bì có thể mất, có thể tới sai thứ tự, và không ai báo cho bạn.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Đo cái giá của mô hình tuần tự',
        blocks: [
          { t: 'p', x:
            'Kịch bản giống hệt nhau cho cả ba máy chủ: một khách "chậm" nối vào rồi im lặng ' +
            '2 giây, ngay sau đó một khách "đo" nối vào và hỏi một câu. Con số cần nhìn là dòng ' +
            'cuối — <code>[do] cho … ms</code>.' },

          { t: 'code', where: 'wsl', code:
            './may_tuan_tu 2 & sleep 0.4; ./khach_cham 2000 & sleep 0.3; ./khach_do; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[tuantu] nghe cong 9004\n' +
            '[tuantu] nhan khach fd 4 — tu gio KHONG accept ai khac\n' +
            '[cham] da noi, co y im lang 2000 ms\n' +
            '[tuantu] da tra loi fd 4\n' +
            '[cham] tra loi: nhiet do 42.5 do C\n' +
            '[tuantu] nhan khach fd 4 — tu gio KHONG accept ai khac\n' +
            '[tuantu] da tra loi fd 4\n' +
            '[do] cho 1692.8 ms moi nhan duoc tra loi\n' },

          { t: 'code', where: 'wsl', code:
            './may_select 2 & sleep 0.4; ./khach_cham 2000 & sleep 0.3; ./khach_do; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[select] nghe cong 9004\n' +
            '[cham] da noi, co y im lang 2000 ms\n' +
            '[select] khach moi fd 4 — van tiep tuc theo doi moi kenh\n' +
            '[select] khach moi fd 5 — van tiep tuc theo doi moi kenh\n' +
            '[select] da tra loi fd 5\n' +
            '[do] cho 0.3 ms moi nhan duoc tra loi\n' +
            '[cham] tra loi: nhiet do 42.5 do C\n' +
            '[select] da tra loi fd 4\n' +
            '[select] phuc vu xong 2 khach\n' },

          { t: 'p', x:
            '<b>1692,8 ms</b> so với <b>0,3 ms</b>. Hai chương trình cùng một luồng, cùng một ' +
            'CPU, cùng một kịch bản; khác nhau đúng ở chỗ một cái gọi <code>accept</code> rồi ' +
            '<code>read</code> theo lối chặn, còn cái kia hỏi <code>select</code> trước.' },

          { t: 'p', x:
            'Chạy tiếp bản <code>poll</code>. Kết quả lần chạy này khác hẳn hai lần trước, và ' +
            'nó dạy bạn một điều về đo đạc:' },

          { t: 'code', where: 'wsl', code:
            './may_poll 2 & sleep 0.4; ./khach_cham 2000 & sleep 0.3; ./khach_do; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[poll] nghe cong 9004, mang pollfd co 16 o\n' +
            '[cham] da noi, co y im lang 2000 ms\n' +
            '[poll] khach moi fd 4, dang theo doi 2 kenh\n' +
            '[poll] khach moi fd 5, dang theo doi 3 kenh\n' +
            '[poll] da tra loi fd 5\n' +
            '[do] cho 1.6 ms moi nhan duoc tra loi\n' +
            '[poll] da tra loi fd 4\n' +
            '[cham] tra loi: nhiet do 42.5 do C\n' +
            '[poll] phuc vu xong 2 khach\n' },

          { t: 'cal', kind: 'warn', title: '1,6 ms không có nghĩa là poll chậm hơn select 5 lần',
            x: '<p>Ở phần lý thuyết, cùng chương trình này đo được <b>0,3 ms</b>. Lần chạy trên ' +
               'ra <b>1,6 ms</b>. Chênh lệch đó <i>không</i> đến từ <code>poll</code> — nó đến ' +
               'từ bộ lập lịch: khoảng thời gian tiến trình <code>khach_do</code> phải chờ để ' +
               'được cấp CPU sau khi dữ liệu đã sẵn sàng.</p>' +
               '<p><b>Bài học đo đạc:</b> ở thang mili giây, một phép đo đơn lẻ nói lên rất ít. ' +
               'Cái đáng tin trong bảng số này là <b>bậc độ lớn</b> — 1700 ms so với "dưới ' +
               '2 ms" — chứ không phải chữ số thập phân. Muốn so <code>select</code> với ' +
               '<code>poll</code> cho ra kết quả có nghĩa, bạn phải lặp hàng nghìn lần và lấy ' +
               'trung bình. Đó chính xác là cái <code>dosuc_io</code> làm ở bước sau.</p>' +
               '<p>Hãy chạy mỗi lệnh trên vài lần. Bạn sẽ thấy cột "tuần tự" luôn quanh 1700 ms ' +
               '— vì nó bị chặn <i>bởi thiết kế</i>, không phải bởi may rủi.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Đo sức ba cơ chế trên 500 kênh',
        blocks: [
          { t: 'p', x:
            'Bước 4 đo <i>độ trễ do thiết kế sai</i>. Bước này đo <i>chi phí của chính cơ chế ' +
            'chờ</i>. <code>dosuc_io</code> mở N pipe, theo dõi hết, rồi lặp 10 000 lần: đánh ' +
            'thức đúng một kênh và đo thời gian trung bình mỗi lời gọi.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o dosuc_io dosuc_io.c\n' +
            './dosuc_io 500' },

          { t: 'code', where: 'out', nocopy: true, code:
            'N = 500   kenh, fd doc lon nhat = 1001  (FD_SETSIZE = 1024)\n' +
            '  select :   64.24 us/lan\n' +
            '  poll   :   69.51 us/lan\n' +
            '  epoll  :    0.79 us/lan\n' },

          { t: 'p', x:
            'Lặp lại với <code>./dosuc_io 10</code>, <code>100</code> và <code>2000</code>. ' +
            'Bạn sẽ dựng lại được đúng bảng ở phần lý thuyết — và ở N = 2000, chương trình sẽ ' +
            'từ chối chạy <code>select</code>, vì fd lớn nhất là <b>4001</b> còn ' +
            '<code>FD_SETSIZE</code> là <b>1024</b>.' },

          { t: 'cal', kind: 'why', title: 'Vì sao 500 kênh chỉ tốn 0,79 µs với epoll',
            x: '<p>Vì <code>epoll_wait</code> không hỏi "trong 500 kênh này, cái nào sẵn ' +
               'sàng?". Nhân đã tự duy trì một danh sách <i>đã sẵn sàng</i> từ trước: mỗi lần ' +
               'dữ liệu tới một pipe, chính thao tác ghi đó móc pipe vào danh sách. ' +
               '<code>epoll_wait</code> chỉ việc lấy phần tử đầu danh sách ra và trả về.</p>' +
               '<p>Con số <b>0,79 µs</b> = <b>790 ns</b> nằm cùng bậc với chi phí tối thiểu của ' +
               'một lần vào/ra nhân — Bài 19 đo một syscall trần trụi hết <b>139–317 ns</b>. ' +
               'Nghĩa là <code>epoll</code> gần như không thêm gì lên trên cái giá bắt buộc ' +
               'phải trả. Còn 64 µs của <code>select</code> là 500 lần kiểm tra, mỗi lần một ' +
               'chút, cộng lại.</p>' }
        ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Tổng kết Chặng 03: daemon nhiệt độ đa kênh',
        blocks: [
          { t: 'p', x:
            'Bài cuối cùng của chặng gộp mọi thứ bạn đã học vào một chương trình có hình dạng ' +
            'của phần mềm nhúng thật: một luồng đo cảm biến 5 lần mỗi giây, một vòng ' +
            '<code>epoll</code> phục vụ khách qua TCP, và một <code>signalfd</code> để tắt máy ' +
            'sạch sẽ khi <code>systemd</code> gửi <code>SIGTERM</code>.' },

          { t: 'table',
            head: ['Thành phần', 'Đến từ', 'Vai trò trong daemon'],
            rows: [
              ['<code>pthread_create</code> + mutex', 'Bài 22', 'Luồng <code>luong_doc</code> cập nhật <code>cb.nhiet</code> mỗi 200 ms'],
              ['<code>pthread_sigmask</code> + <code>signalfd</code>', 'Bài 21', 'Biến <code>SIGTERM</code> thành một fd, để nó xếp hàng cùng socket'],
              ['<code>socket</code>/<code>bind</code>/<code>listen</code>', 'Bài này', 'Cổng 9006, hàng đợi 64'],
              ['<code>epoll</code> + <code>O_NONBLOCK</code>', 'Bài này', 'Một luồng phục vụ mọi khách, không chặn ở đâu'],
              ['Vòng ghi tới khi đủ byte', 'Bài này', 'Chống ghi thiếu — <code>write</code> có thể trả về ít hơn số xin']
            ]},

          { t: 'code', where: 'file', name: '~/embedded/bai24/daemon_nhietdo.c — phần khởi tạo', lang: 'c', code:
            '#define _GNU_SOURCE\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '#include <errno.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <signal.h>\n' +
            '#include <pthread.h>\n' +
            '#include <sys/epoll.h>\n' +
            '#include <sys/signalfd.h>\n' +
            '#include <arpa/inet.h>\n' +
            '\n' +
            '#define CONG   9006\n' +
            '#define MAX_SK 32\n' +
            '\n' +
            'static struct {\n' +
            '    pthread_mutex_t khoa;\n' +
            '    double          nhiet;\n' +
            '    unsigned long   so_mau;\n' +
            '} cb = { PTHREAD_MUTEX_INITIALIZER, 0.0, 0 };\n' +
            '\n' +
            'static volatile sig_atomic_t chay = 1;\n' +
            '\n' +
            'static void *luong_doc(void *kh)          /* luong \'cam bien\' */\n' +
            '{\n' +
            '    (void)kh;\n' +
            '    unsigned long i = 0;\n' +
            '    while (chay) {\n' +
            '        double d = 40.0 + (double)(i % 50) / 10.0;\n' +
            '        pthread_mutex_lock(&cb.khoa);\n' +
            '        cb.nhiet  = d;\n' +
            '        cb.so_mau = ++i;\n' +
            '        pthread_mutex_unlock(&cb.khoa);\n' +
            '        usleep(200000);                   /* 5 mau moi giay */\n' +
            '    }\n' +
            '    return NULL;\n' +
            '}\n' +
            '\n' +
            'static int dat_khong_chan(int fd)\n' +
            '{\n' +
            '    int co = fcntl(fd, F_GETFL);\n' +
            '    if (co == -1) return -1;\n' +
            '    return fcntl(fd, F_SETFL, co | O_NONBLOCK);\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    signal(SIGPIPE, SIG_IGN);             /* khach dong som != giet daemon */\n' +
            '\n' +
            '    sigset_t tap;\n' +
            '    sigemptyset(&tap);\n' +
            '    sigaddset(&tap, SIGTERM);\n' +
            '    sigaddset(&tap, SIGINT);\n' +
            '    if (pthread_sigmask(SIG_BLOCK, &tap, NULL)) { perror("pthread_sigmask"); exit(1); }\n' +
            '    int sfd = signalfd(-1, &tap, SFD_CLOEXEC);\n' +
            '    if (sfd == -1) { perror("signalfd"); exit(1); }\n' +
            '\n' +
            '    pthread_t th;\n' +
            '    if (pthread_create(&th, NULL, luong_doc, NULL)) { perror("pthread_create"); exit(1); }\n' +
            '\n' +
            '    int ls = socket(AF_INET, SOCK_STREAM, 0);\n' +
            '    if (ls == -1) { perror("socket"); exit(1); }\n' +
            '    int mot = 1;\n' +
            '    setsockopt(ls, SOL_SOCKET, SO_REUSEADDR, &mot, sizeof mot);\n' +
            '    struct sockaddr_in dc;\n' +
            '    memset(&dc, 0, sizeof dc);\n' +
            '    dc.sin_family      = AF_INET;\n' +
            '    dc.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
            '    dc.sin_port        = htons(CONG);\n' +
            '    if (bind(ls, (struct sockaddr *)&dc, sizeof dc) == -1) { perror("bind"); exit(1); }\n' +
            '    if (listen(ls, 64) == -1) { perror("listen"); exit(1); }\n' +
            '    dat_khong_chan(ls);                   /* BAT BUOC: accept trong vong lap */\n' +
            '\n' +
            '    int ep = epoll_create1(EPOLL_CLOEXEC);\n' +
            '    if (ep == -1) { perror("epoll_create1"); exit(1); }\n' +
            '    struct epoll_event ev;\n' +
            '    ev.events = EPOLLIN; ev.data.fd = ls;\n' +
            '    if (epoll_ctl(ep, EPOLL_CTL_ADD, ls,  &ev) == -1) { perror("epoll_ctl ls");  exit(1); }\n' +
            '    ev.events = EPOLLIN; ev.data.fd = sfd;\n' +
            '    if (epoll_ctl(ep, EPOLL_CTL_ADD, sfd, &ev) == -1) { perror("epoll_ctl sfd"); exit(1); }\n' +
            '\n' +
            '    printf("[daemon] pid %d — nghe cong %d, epoll fd %d, signalfd %d\\n",\n' +
            '           getpid(), CONG, ep, sfd);\n' +
            '    fflush(stdout);\n',
            notes: [
              'Hai fd hoàn toàn khác bản chất — một socket nghe và một nguồn tín hiệu — được nạp vào cùng một tập <code>epoll</code>. Đây chính là giá trị lớn nhất của triết lý "mọi thứ là file" mà Bài 19 mở đầu.',
              '<code>signal(SIGPIPE, SIG_IGN)</code> phải có. Nếu khách đóng kết nối trước khi daemon kịp trả lời, <code>write()</code> sẽ sinh <code>SIGPIPE</code> và mặc định tín hiệu này <b>giết tiến trình</b>. Bỏ qua nó thì <code>write()</code> chỉ trả về <code>EPIPE</code> — một lỗi bình thường xử lý được.'
            ]},

          { t: 'code', where: 'file', name: '~/embedded/bai24/daemon_nhietdo.c — vòng lặp chính', lang: 'c', code:
            '    unsigned long phuc_vu = 0;\n' +
            '    struct epoll_event sk[MAX_SK];\n' +
            '    while (chay) {\n' +
            '        int n = epoll_wait(ep, sk, MAX_SK, -1);\n' +
            '        if (n == -1) { if (errno == EINTR) continue; perror("epoll_wait"); break; }\n' +
            '\n' +
            '        for (int i = 0; i < n; i++) {\n' +
            '            int fd = sk[i].data.fd;\n' +
            '\n' +
            '            if (fd == sfd) {                       /* --- TIN HIEU --- */\n' +
            '                struct signalfd_siginfo tt;\n' +
            '                if (read(sfd, &tt, sizeof tt) != (ssize_t)sizeof tt) continue;\n' +
            '                printf("[daemon] tin hieu %u (%s) qua signalfd — bat dau tat em\\n",\n' +
            '                       tt.ssi_signo, strsignal((int)tt.ssi_signo));\n' +
            '                chay = 0;\n' +
            '\n' +
            '            } else if (fd == ls) {                 /* --- KHACH MOI --- */\n' +
            '                for (;;) {                         /* accept toi khi EAGAIN */\n' +
            '                    int cs = accept(ls, NULL, NULL);\n' +
            '                    if (cs == -1) {\n' +
            '                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;\n' +
            '                        perror("accept"); break;\n' +
            '                    }\n' +
            '                    dat_khong_chan(cs);\n' +
            '                    struct epoll_event e2;\n' +
            '                    e2.events = EPOLLIN; e2.data.fd = cs;\n' +
            '                    epoll_ctl(ep, EPOLL_CTL_ADD, cs, &e2);\n' +
            '                }\n' +
            '\n' +
            '            } else {                               /* --- YEU CAU --- */\n' +
            '                char yc[128];\n' +
            '                ssize_t r = read(fd, yc, sizeof yc - 1);\n' +
            '                if (r <= 0) {\n' +
            '                    epoll_ctl(ep, EPOLL_CTL_DEL, fd, NULL);\n' +
            '                    close(fd);\n' +
            '                    continue;\n' +
            '                }\n' +
            '                double d; unsigned long m;\n' +
            '                pthread_mutex_lock(&cb.khoa);      /* chi giu khoa 2 dong */\n' +
            '                d = cb.nhiet; m = cb.so_mau;\n' +
            '                pthread_mutex_unlock(&cb.khoa);\n' +
            '\n' +
            '                char tl[128];\n' +
            '                int len = snprintf(tl, sizeof tl, "nhiet=%.1f mau=%lu\\n", d, m);\n' +
            '                int da = 0;\n' +
            '                while (da < len) {                 /* ghi TOI KHI du byte */\n' +
            '                    ssize_t k = write(fd, tl + da, (size_t)(len - da));\n' +
            '                    if (k == -1) {\n' +
            '                        if (errno == EAGAIN || errno == EWOULDBLOCK) continue;\n' +
            '                        perror("write"); break;\n' +
            '                    }\n' +
            '                    da += (int)k;\n' +
            '                }\n' +
            '                phuc_vu++;\n' +
            '                printf("[daemon] phuc vu yeu cau #%lu tren fd %d\\n", phuc_vu, fd);\n' +
            '                fflush(stdout);\n' +
            '                epoll_ctl(ep, EPOLL_CTL_DEL, fd, NULL);\n' +
            '                close(fd);\n' +
            '            }\n' +
            '        }\n' +
            '    }\n' +
            '\n' +
            '    pthread_join(th, NULL);\n' +
            '    close(ls); close(sfd); close(ep);\n' +
            '    printf("[daemon] da phuc vu %lu yeu cau, dong sach moi mo ta file, thoat 0\\n", phuc_vu);\n' +
            '    return 0;\n' +
            '}\n',
            notes: [
              'Vòng <code>accept</code> chạy tới khi gặp <code>EAGAIN</code>, không phải một lần. Nếu ba khách tới cùng lúc, <code>epoll</code> chỉ báo <b>một</b> sự kiện trên <code>ls</code>; <code>accept</code> một lần thì hai khách còn lại nằm chờ trong hàng đợi cho tới sự kiện kế tiếp — có thể là mãi mãi.',
              'Mutex chỉ ôm đúng hai dòng gán. Bài 22 gọi đây là giữ vùng găng ngắn nhất có thể: luồng đo không bao giờ phải chờ một lệnh <code>write()</code> lên mạng.'
            ]},

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -pthread -o daemon_nhietdo daemon_nhietdo.c\n' +
            './daemon_nhietdo & DP=$!\n' +
            'sleep 0.5; ss -tlnp | grep 9006\n' +
            'for i in 1 2 3 4 5; do echo XIN | nc -q1 127.0.0.1 9006; sleep 0.3; done\n' +
            'ls /proc/$DP/fd | tr "\\n" " "; echo\n' +
            'kill -TERM $DP; wait $DP; echo "ma thoat = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bien dich daemon: 0 canh bao\n' +
            '[daemon] pid 534 — nghe cong 9006, epoll fd 5, signalfd 3\n' +
            'LISTEN 0      64            0.0.0.0:9006      0.0.0.0:*    users:(("daemon_nhietdo",pid=534,fd=4))\n' +
            '[daemon] phuc vu yeu cau #1 tren fd 6\n' +
            'nhiet=40.2 mau=3\n' +
            '[daemon] phuc vu yeu cau #2 tren fd 6\n' +
            'nhiet=40.9 mau=10\n' +
            '[daemon] phuc vu yeu cau #3 tren fd 6\n' +
            'nhiet=41.5 mau=16\n' +
            '[daemon] phuc vu yeu cau #4 tren fd 6\n' +
            'nhiet=42.2 mau=23\n' +
            '[daemon] phuc vu yeu cau #5 tren fd 6\n' +
            'nhiet=42.8 mau=29\n' +
            '--- mo ta file dang mo ---\n' +
            '0 1 2 3 4 5 \n' +
            '[daemon] tin hieu 15 (Terminated) qua signalfd — bat dau tat em\n' +
            '[daemon] da phuc vu 5 yeu cau, dong sach moi mo ta file, thoat 0\n' +
            'ma thoat = 0\n' },

          { t: 'cal', kind: 'info', title: 'Ba bằng chứng nằm trong output này',
            x: '<ul>' +
               '<li><b>Luồng đo chạy độc lập.</b> Năm yêu cầu cách nhau 0,3 s cho ' +
               '<code>mau=3, 10, 16, 23, 29</code> — tăng đều 6–7 mẫu, đúng nhịp 200 ms. Luồng ' +
               'không hề bị vòng <code>epoll</code> làm chậm, và ngược lại.</li>' +
               '<li><b>Không rò mô tả file.</b> <code>/proc/534/fd</code> chỉ có ' +
               '<code>0 1 2 3 4 5</code> — stdin/stdout/stderr, signalfd 3, socket nghe 4, ' +
               'epoll 5. Năm khách đã tới rồi đi mà con số không nhích. So với Bài 19: mỗi lần ' +
               'quên <code>close</code>, danh sách này sẽ dài thêm một dòng, và ' +
               '<code>ulimit -n</code> = 10240 sẽ hết sau vài giờ chạy.</li>' +
               '<li><b>Tắt sạch.</b> <code>SIGTERM</code> đi qua <code>signalfd</code> như một ' +
               'sự kiện bình thường, vòng lặp thoát theo đúng luồng điều khiển, ' +
               '<code>pthread_join</code> chờ luồng đo, mọi fd được đóng, mã thoát ' +
               '<b>0</b>. Đây chính là hành vi <code>systemd</code> mong đợi ở Chặng 09 — nếu ' +
               'không, nó sẽ chờ hết <code>TimeoutStopSec</code> rồi bắn ' +
               '<code>SIGKILL</code>.</li>' +
               '</ul>' },

          { t: 'cal', kind: 'tip', title: 'Ba việc để tự làm tiếp',
            x: '<ul>' +
               '<li>Thay <code>epoll_wait(ep, sk, MAX_SK, -1)</code> bằng thời hạn ' +
               '<code>1500</code> và in một dòng nhịp tim mỗi lần hết giờ. Đó là khung của mọi ' +
               'daemon có watchdog.</li>' +
               '<li>Bỏ <code>dat_khong_chan(ls)</code> đi rồi mở hai kết nối cùng lúc bằng ' +
               '<code>nc</code>. Vòng <code>accept</code> sẽ treo ở lần gọi thứ hai — cả daemon ' +
               'đứng im, dù không có lỗi nào.</li>' +
               '<li>Đổi <code>EPOLLIN</code> của socket khách thành ' +
               '<code>EPOLLIN | EPOLLET</code> mà <b>không</b> sửa vòng đọc, rồi gửi một yêu ' +
               'cầu dài hơn 128 byte. Bạn sẽ tự tay tái hiện lỗi mất byte ở phần lý thuyết.</li>' +
               '</ul>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       13. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Toàn bộ bảng này là lỗi thật, gặp trong lúc kiểm chứng các chương trình của bài. Nửa ' +
      'dưới nguy hiểm hơn nửa trên: đó là những lỗi <b>không in ra gì cả</b>.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bind: Address already in use</code>',
         'Cổng đang bị tiến trình khác giữ, hoặc kết nối cũ còn ở <code>TIME-WAIT</code> vì máy chủ đóng trước',
         '<code>ss -tanp | grep :9000</code> để biết là trường hợp nào. Nếu là <code>TIME-WAIT</code>, thêm <code>setsockopt(s, SOL_SOCKET, SO_REUSEADDR, …)</code> <b>trước</b> <code>bind</code>'],

        ['<code>connect: Connection refused</code>',
         'Không có ai <code>listen</code> trên cổng đó — hoặc bạn đang gõ nhầm cổng vì <b>quên <code>htons()</code></b>: 9000 thành 10275',
         'Kiểm tra bằng <code>ss -tln</code>. In <code>ntohs(dc.sin_port)</code> ra để xác nhận số cổng thật sự gửi đi'],

        ['<code>accept: Invalid argument</code>',
         'Gọi <code>accept()</code> trên socket chưa qua <code>listen()</code>',
         'Thứ tự bắt buộc: <code>socket → bind → listen → accept</code>. Thiếu một bước là hỏng'],

        ['<code>*** bit out of range 0 - FD_SETSIZE on fd_set ***: terminated</code>, thoát <b>134</b>',
         '<code>FD_SET()</code> với mô tả file ≥ <b>1024</b>. Thoát 134 = 128 + 6 (<code>SIGABRT</code>)',
         'Không có cách vá. Chuyển sang <code>poll</code> hoặc <code>epoll</code>. Biên dịch lại glibc với <code>FD_SETSIZE</code> khác là điều <b>không</b> làm được'],

        ['<code>epoll_ctl: Operation not permitted</code>',
         'Bạn thêm một <b>file thường</b> vào tập <code>epoll</code>. File thường luôn "sẵn sàng" nên không có gì để chờ',
         '<code>epoll</code> chỉ nhận socket, pipe, FIFO, terminal, <code>signalfd</code>, <code>timerfd</code>, <code>inotify</code>, <code>eventfd</code>. Muốn theo dõi file thường thì dùng <code>inotify</code>'],

        ['<code>epoll_ctl: File exists</code>',
         '<code>EPOLL_CTL_ADD</code> hai lần cho cùng một fd',
         'Lần sau dùng <code>EPOLL_CTL_MOD</code>. Thường xảy ra khi <code>accept</code> trả lại một số fd vừa được tái sử dụng mà bạn quên <code>DEL</code>'],

        ['<code>epoll_ctl: No such file or directory</code>',
         '<code>EPOLL_CTL_DEL</code> một fd không có trong tập, hoặc đã <code>close()</code> rồi',
         'Đóng một fd sẽ <b>tự động</b> gỡ nó khỏi tập epoll. Vậy nên thứ tự đúng là <code>DEL</code> rồi mới <code>close</code> — hoặc chỉ <code>close</code>, đừng làm cả hai theo thứ tự ngược'],

        ['<code>epoll_wait: Interrupted system call</code>',
         '<code>EINTR</code>: một tín hiệu tới trong lúc đang chờ (Bài 21)',
         '<code>if (errno == EINTR) continue;</code> — không phải lỗi, chỉ là bị cắt ngang'],

        ['<code>read: Resource temporarily unavailable</code>',
         '<code>EAGAIN</code> = <b>11</b> trên fd đã đặt <code>O_NONBLOCK</code>',
         '<b>Không phải lỗi.</b> Nó nghĩa là "chưa có dữ liệu". Đây là điều kiện dừng của vòng đọc, hãy <code>break</code>, đừng <code>perror</code>'],

        ['<code>write: Broken pipe</code>, hoặc chương trình chết lặng lẽ với mã thoát <b>141</b>',
         '<code>SIGPIPE</code>: ghi vào socket mà đầu kia đã đóng. Mặc định tín hiệu này <b>giết tiến trình</b>. 141 = 128 + 13',
         '<code>signal(SIGPIPE, SIG_IGN)</code> ở đầu <code>main</code>. Sau đó <code>write()</code> chỉ trả về −1 với <code>EPIPE</code> — đã đo: lần ghi 1 trả về 65536, lần 2 trả về −1'],

        ['<i>Không lỗi:</i> <code>write(fd, buf, 100000)</code> trả về <b>65536</b>',
         'Bộ đệm nhân chỉ còn chừng đó chỗ. Ghi thiếu <b>34 464</b> byte',
         'Luôn lặp: <code>while (da &lt; len) { k = write(fd, buf+da, len-da); … da += k; }</code>. Đúng cho cả chế độ chặn lẫn không chặn'],

        ['<i>Không lỗi:</i> <code>read()</code> trả về <b>22</b> byte khi máy khách gửi hai lần 11 byte',
         'TCP là dòng byte. Ranh giới thông điệp <b>không tồn tại</b> ở tầng này',
         'Tự đóng khung: ký tự phân cách, tiền tố độ dài, hoặc bản ghi cố định. Lỗi này hầu như không tái hiện được trên loopback nhàn rỗi'],

        ['<i>Không lỗi:</i> <code>recvfrom()</code> trả về <b>6</b> byte khi máy khách gửi <b>10</b>',
         'Bộ đệm nhận nhỏ hơn gói UDP. Phần dư bị <b>vứt lặng lẽ</b>',
         'Cấp bộ đệm ≥ MTU (1500) hoặc ≥ kích thước gói lớn nhất bạn định nghĩa. So sánh: <code>mq_send</code> ở Bài 23 báo <code>EMSGSIZE</code>, UDP thì không'],

        ['<i>Không lỗi:</i> <code>EPOLLET</code> chỉ nhận <b>1</b> sự kiện, lấy được <b>5</b>/20 byte',
         'Edge-triggered chỉ báo khi có dữ liệu <i>mới</i>. 15 byte còn lại nằm im trong bộ đệm nhân',
         'Với <code>EPOLLET</code>: fd <b>phải</b> <code>O_NONBLOCK</code> và phải <code>read()</code> trong vòng lặp tới khi <code>EAGAIN</code>. Nếu chưa chắc, bỏ <code>EPOLLET</code> đi'],

        ['<i>Không lỗi:</i> daemon đứng im ở khách thứ hai',
         'Socket nghe vẫn ở chế độ chặn nhưng bạn <code>accept</code> trong vòng lặp — lần gọi thứ hai chặn cả tiến trình',
         '<code>dat_khong_chan(ls)</code> ngay sau <code>listen()</code>, rồi thoát vòng lặp khi <code>accept</code> trả <code>EAGAIN</code>'],

        ['<i>Không lỗi:</i> máy chủ tuần tự "chạy đúng" trên bàn làm việc, chết ngoài hiện trường',
         'Kịch bản test chỉ có một khách. Một khách chậm là đủ chặn tất cả — đã đo <b>1692,8 ms</b>',
         'Luôn test với ít nhất hai khách, trong đó một cái cố tình im lặng vài giây, đúng như <code>khach_cham</code> ở bước 4']
      ]},

    /* ══════════════════════════════════════════════
       14. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 24', items: [
      'Socket là <b>mô tả file</b> nhưng không có tên trong hệ thống file: nó được định danh bằng <b>địa chỉ IP + số cổng</b>, nên nói được tới máy khác. Vì vẫn là fd, nó dùng chung <code>read</code>/<code>write</code>/<code>close</code>/<code>epoll</code> với mọi thứ khác.',
      'Máy chủ đi <code>socket → bind → listen → accept</code>, máy khách đi <code>socket → connect</code>. <code>accept()</code> trả về một fd <b>mới</b> cho từng khách; fd nghe vẫn giữ nguyên vai trò nghe.',
      'Mọi số nhiều byte đặt vào <code>struct sockaddr_in</code> phải qua <code>htons</code>/<code>htonl</code>. Quên nó thì cổng <b>9000</b> (<code>0x2328</code>) thành <b>10275</b> (<code>0x2823</code>), và bạn nhận <code>Connection refused</code>.',
      '<code>SO_REUSEADDR</code> cho phép <code>bind</code> lại cổng trong lúc kết nối cũ còn ở <code>TIME-WAIT</code>. Không có nó, <b>4/4</b> lần thử khởi động lại đều cho <code>Address already in use</code>.',
      'TCP là <b>dòng byte</b>: 3 lần <code>write</code> 11 byte có thể thành 2 lần <code>read</code> — 11 rồi <b>22</b>. Ranh giới thông điệp là việc của bạn: ký tự phân cách, tiền tố độ dài, hoặc bản ghi cố định.',
      'UDP giữ ranh giới gói nhưng không hứa gì: gói tới cổng không ai nghe vẫn <code>sendto</code> thành công <b>3/3</b>, còn TCP <code>connect</code> báo <code>Connection refused</code> ngay. Bộ đệm nhỏ hơn gói thì phần dư bị vứt <b>không báo lỗi</b>.',
      'Đo trên loopback, 10 000 lượt khứ hồi 16 byte: TCP <b>90,05 µs</b>, UDP <b>73,67 µs</b> — UDP nhanh hơn khoảng <b>17 %</b>, mất gói <b>0/10000</b>. Con số này quá nhỏ để đánh đổi lấy độ tin cậy trên mạng thật.',
      'Máy chủ một luồng kiểu chặn bị một khách im lặng làm tê liệt: <b>1697,0 ms</b> so với <b>0,4 ms</b> của bản <code>select</code> — chênh khoảng <b>4000 lần</b>, cùng CPU, cùng kịch bản.',
      '<code>select</code> bị chặn cứng ở <code>FD_SETSIZE</code> = <b>1024</b>. Vượt qua là <code>abort()</code>, thoát <b>134</b> — không phải hỏng bộ nhớ âm thầm như tài liệu cũ hay nói.',
      '<code>poll</code> bỏ giới hạn 1024 và tách <code>events</code> khỏi <code>revents</code> nên không phải dựng lại tập mỗi vòng, nhưng vẫn là <b>O(n)</b>.',
      '<code>epoll</code> là <b>O(1)</b>: 1,04 → 0,98 → 0,88 → <b>0,77 µs</b> khi số kênh tăng từ 10 lên 2000. Cùng lúc đó <code>poll</code> đi từ 2,51 lên <b>270,23 µs</b>. Ở 2000 kênh, epoll nhanh hơn <b>351×</b>.',
      'Bí quyết của <code>epoll</code>: khai báo <b>một lần</b> bằng <code>epoll_ctl</code> (strace đếm đúng <b>500</b> lần cho 500 kênh), rồi <code>epoll_wait</code> chỉ trả về những fd <i>đang có việc</i>.',
      'Level-triggered báo chừng nào còn dữ liệu; edge-triggered chỉ báo khi có dữ liệu mới. Cùng 20 byte: LT cho <b>4 sự kiện / 20 byte</b>, ET cho <b>1 sự kiện / 5 byte</b>. Dùng <code>EPOLLET</code> thì bắt buộc <code>O_NONBLOCK</code> + đọc tới <code>EAGAIN</code>.',
      '<code>O_NONBLOCK</code> biến "chờ" thành <code>EAGAIN</code> = <code>EWOULDBLOCK</code> = <b>11</b>. Đó là câu trả lời, không phải lỗi.',
      '<code>write()</code> có thể ghi thiếu ở <b>mọi</b> chế độ — đã đo 100 000 byte chỉ ghi <b>65 536</b>. Luôn lặp cho tới khi đủ.',
      'Bỏ qua <code>SIGPIPE</code> là bắt buộc với mọi máy chủ. Không bỏ qua, tiến trình chết lặng lẽ với mã thoát <b>141</b> khi khách đóng sớm.',
      'Daemon tổng kết gộp <code>epoll</code> + <code>signalfd</code> (Bài 21) + luồng và mutex (Bài 22) + socket: phục vụ <b>5</b> yêu cầu, giữ đúng <b>6</b> mô tả file mở, nhận <code>SIGTERM</code> như một sự kiện bình thường và thoát <b>0</b>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Chặng 03 kết thúc ở đây. Mười lăm bài vừa qua — từ <code>open</code>/<code>read</code> ' +
         'của Bài 19 tới daemon <code>epoll</code> của bài này — đều được biên dịch bằng ' +
         '<code>gcc</code> và chạy ngay tại chỗ, trên chính con x86 bạn đang ngồi. Từ ' +
         '<b>Bài 25</b>, điều đó chấm dứt.</p>' +
         '<p><b>Bài 25 — Vì sao phải cross-compile</b> mở <b>Chặng 04</b>. Bạn đã chạm vào câu ' +
         'trả lời ở Bài 3, khi chạy một tệp nhị phân ARM64 trên x86 và nhận ' +
         '<code>Exec format error</code>, mã thoát <b>126</b>. Bài 25 sẽ đo cái giá thật của ' +
         'con đường ngược lại — biên dịch <i>trên</i> board thay vì biên dịch <i>cho</i> board: ' +
         'thời gian dịch cùng một chương trình bằng <code>gcc</code> bản địa so với ' +
         '<code>aarch64-linux-gnu-gcc</code>, dung lượng đĩa mà một toolchain đầy đủ chiếm trên ' +
         'rootfs, và vì sao <code>qemu-system-aarch64</code> trên máy bạn chỉ liệt kê ' +
         '<code>tcg</code> — tức là <b>luôn luôn</b> mô phỏng, không bao giờ tăng tốc phần ' +
         'cứng.</p>' +
         '<p>Nói cách khác: bạn vừa học xong cách viết phần mềm cho Linux. Chặng 04 dạy cách ' +
         'đưa nó sang một con chip khác.</p>' }
  ],

  quiz: [
    { q: 'Máy khách gọi <code>write()</code> ba lần, mỗi lần 11 byte, qua một kết nối TCP. Máy chủ có thể nhận được kết quả nào?',
      opts: [
        'Luôn luôn ba lần <code>read()</code>, mỗi lần đúng 11 byte',
        'Bất kỳ tổ hợp nào cộng lại đủ 33 byte — ví dụ 11 rồi 22, hoặc 33 một lần',
        'Ba lần <code>read()</code>, trừ khi mạng bị mất gói',
        'Một lần <code>read()</code> duy nhất trả về 33 byte, vì TCP luôn gộp'],
      a: 1,
      why: 'TCP không có khái niệm thông điệp — nó chỉ hứa rằng các byte tới <b>đủ</b> và <b>đúng thứ tự</b>. Cách chúng được nhóm lại trong từng lệnh <code>read()</code> phụ thuộc vào lịch chạy của CPU và độ trễ đường truyền, không phải vào cách bạn gọi <code>write()</code>. Trong bài, cùng một chương trình cho 3 lần <code>read</code> ở lần chạy này và 2 lần (11 rồi 22 byte) ở lần chạy khác. Vì thế đóng khung thông điệp là trách nhiệm của tầng ứng dụng.' },

    { q: 'Bạn khởi động lại máy chủ ngay sau khi tắt nó và nhận <code>bind: Address already in use</code>, nhưng <code>ss -tlnp</code> không hiện tiến trình nào đang giữ cổng. Nguyên nhân nhiều khả năng nhất là gì?',
      opts: [
        'Tường lửa đang chặn cổng đó',
        'Bạn quên <code>htons()</code> nên đang bind nhầm cổng khác',
        'Kết nối cũ còn ở trạng thái <code>TIME-WAIT</code> — không còn tiến trình nào nhưng cặp địa chỉ vẫn bị nhân giữ',
        'Cổng nằm dưới 1024 nên cần quyền root'],
      a: 2,
      why: '<code>TIME-WAIT</code> là trạng thái của <i>kết nối</i>, không phải của tiến trình, nên <code>ss -tlnp</code> với cờ <code>-l</code> (chỉ socket đang nghe) không thấy nó — phải bỏ <code>-l</code> hoặc dùng <code>ss -tan</code>. Nhân giữ cặp địa chỉ khoảng 60 giây để những gói lạc của kết nối cũ không lọt vào kết nối mới trùng cổng. Cách xử lý là <code>SO_REUSEADDR</code>, đặt <b>trước</b> <code>bind</code>; trong bài, không có nó thì 4/4 lần thử đều thất bại, có nó thì bind lại được ngay.' },

    { q: 'Vì sao chi phí mỗi lời gọi <code>epoll_wait</code> gần như không đổi khi số kênh tăng từ 10 lên 2000, trong khi <code>poll</code> đi từ 2,51 µs lên 270,23 µs?',
      opts: [
        'Vì <code>epoll_wait</code> chạy trong nhân còn <code>poll</code> chạy trong không gian người dùng',
        'Vì nhân duy trì sẵn danh sách các fd đã sẵn sàng, nên <code>epoll_wait</code> chỉ tốn công theo số kênh <b>đang có việc</b>, không theo số kênh đang theo dõi',
        'Vì <code>epoll</code> dùng bảng bit nên nhanh hơn mảng struct của <code>poll</code>',
        'Vì <code>epoll</code> tự động chuyển sang chế độ edge-triggered khi số kênh lớn'],
      a: 1,
      why: 'Cả hai đều là syscall, đều chạy trong nhân — khác biệt nằm ở <i>ai giữ danh sách</i>. Với <code>poll</code>, bạn nộp lại toàn bộ mảng mỗi lần gọi và nhân phải duyệt hết: O(n). Với <code>epoll</code>, danh sách nằm sẵn trong nhân (khai báo một lần bằng <code>epoll_ctl</code> — strace đếm đúng 500 lời gọi cho 500 kênh), và mỗi fd tự móc mình vào danh sách "đã sẵn sàng" khi có dữ liệu. <code>epoll_wait</code> chỉ việc múc danh sách đó ra: O(1) theo số kênh sẵn sàng.' },

    { q: 'Một máy chủ dùng <code>EPOLLET</code> và mỗi sự kiện chỉ gọi <code>read()</code> một lần với bộ đệm 512 byte. Điều gì xảy ra khi máy khách gửi một yêu cầu 2000 byte?',
      opts: [
        'Máy chủ nhận 512 byte và <code>epoll_wait</code> sẽ báo lại ba lần nữa cho phần còn lại',
        'Máy chủ nhận 512 byte; 1488 byte còn lại nằm im trong bộ đệm nhân và không sinh ra sự kiện nào nữa',
        '<code>read()</code> trả về −1 với <code>EMSGSIZE</code> vì bộ đệm nhỏ hơn thông điệp',
        'Nhân tự động cắt yêu cầu thành bốn sự kiện 512 byte'],
      a: 1,
      why: 'Edge-triggered chỉ báo khi trạng thái <i>thay đổi</i> — tức khi có dữ liệu <b>mới</b> tới. "Vẫn còn dữ liệu chưa đọc" không phải là một cạnh mới, nên <code>epoll_wait</code> im lặng và phần dư bị bỏ quên. Bài đã đo đúng hiện tượng này: cùng 20 byte, level-triggered cho 4 sự kiện / 20 byte, còn edge-triggered cho 1 sự kiện / 5 byte. Quy tắc bắt buộc của <code>EPOLLET</code> là đặt <code>O_NONBLOCK</code> rồi <code>read()</code> trong vòng lặp tới khi nhận <code>EAGAIN</code>. Đáp án 3 sai vì <code>EMSGSIZE</code> thuộc về hàng thông điệp POSIX ở Bài 23, không phải socket TCP.' },

    { q: 'Trên một fd đã đặt <code>O_NONBLOCK</code>, <code>read()</code> trả về −1 và <code>errno</code> bằng 11. Bạn nên làm gì?',
      opts: [
        'Gọi <code>perror()</code> rồi đóng kết nối, vì đây là lỗi vào/ra',
        'Coi đây là "tạm thời chưa có dữ liệu": thoát khỏi vòng đọc và quay lại chờ sự kiện',
        'Gọi lại <code>read()</code> ngay lập tức trong vòng lặp cho tới khi có dữ liệu',
        'Bỏ cờ <code>O_NONBLOCK</code> đi rồi đọc lại theo lối chặn'],
      a: 1,
      why: '11 là <code>EAGAIN</code> (bằng <code>EWOULDBLOCK</code> trên Linux — bài đã in ra để xác nhận). Nó <b>không phải lỗi</b>: nó là câu trả lời "chưa có gì, quay lại sau", đúng thứ mà chế độ không chặn tồn tại để nói. Đây chính là điều kiện dừng đúng của vòng đọc trong mô hình edge-triggered, và cũng là điều kiện dừng của vòng <code>accept</code> trong daemon ở bước 6. Đáp án 3 biến chương trình thành vòng bận đốt 100 % CPU; đáp án 4 phá hỏng toàn bộ mô hình đa kênh.' },

    { q: 'Máy chủ của bạn chạy nhiều ngày rồi bỗng chết, không in ra bất kỳ thông báo lỗi nào; <code>echo $?</code> trong script giám sát cho <b>141</b>. Chẩn đoán đúng nhất là gì?',
      opts: [
        'Hết bộ nhớ, bị OOM killer giết',
        'Rò mô tả file, đã chạm trần <code>ulimit -n</code>',
        '<code>SIGPIPE</code>: ghi vào socket mà máy khách đã đóng, và tiến trình không bỏ qua tín hiệu này',
        'Tràn ngăn xếp trong luồng phụ'],
      a: 2,
      why: 'Mã thoát trên 128 nghĩa là tiến trình bị một tín hiệu giết: <b>141 = 128 + 13</b>, và 13 là <code>SIGPIPE</code>. Hành vi mặc định của <code>SIGPIPE</code> là kết thúc tiến trình, nên không có thông báo nào được in ra — đó là lý do lỗi này rất khó chẩn đoán nếu không thuộc phép cộng 128. Bài đã tái hiện: không bỏ qua thì thoát 141 ngay ở lần <code>write</code> thứ hai; có <code>signal(SIGPIPE, SIG_IGN)</code> thì <code>write</code> chỉ trả về −1 với <code>Broken pipe</code> và chương trình sống tiếp. Đối chiếu: OOM killer dùng <code>SIGKILL</code> → 137; rò fd cho <code>EMFILE</code> chứ không giết tiến trình.' },

    { q: 'Bạn cần gửi số đo cảm biến 5 lần mỗi giây từ một board tới máy chủ thu thập trong cùng mạng LAN, chấp nhận mất vài mẫu nhưng không chấp nhận độ trễ tích tụ. Lựa chọn hợp lý nhất là gì?',
      opts: [
        'TCP, vì nó đảm bảo không mất dữ liệu',
        'UDP, vì mỗi mẫu là một gói độc lập và một mẫu mất đi sẽ bị mẫu sau thay thế ngay',
        'TCP với <code>TCP_NODELAY</code>, vì như thế vừa tin cậy vừa không có độ trễ',
        'Unix domain socket, vì nó nhanh hơn cả hai'],
      a: 1,
      why: 'Đây là bài toán mà mất mát rẻ hơn chờ đợi. Với TCP, một gói mất sẽ khiến toàn bộ dòng byte <b>dừng lại</b> chờ truyền lại — số đo cũ chặn đường số đo mới, và độ trễ tích tụ đúng thứ bạn không chấp nhận được. Với UDP, mẫu mất thì mẫu kế tiếp tới sau 200 ms là xong. Chỉ số RTT đo được (73,67 µs so với 90,05 µs) <b>không</b> phải lý do chính — chênh 17 % trên loopback là quá nhỏ. Lý do là ngữ nghĩa: dữ liệu có vòng đời ngắn thì truyền lại một mẫu đã cũ là vô nghĩa. Đáp án 4 sai vì Unix domain socket không đi ra khỏi một máy, như Bài 23 đã chỉ rõ.' }
  ]
});

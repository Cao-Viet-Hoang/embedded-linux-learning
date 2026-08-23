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
    'ở đúng một kênh. Bạn sẽ tự tay đo cái giá của việc chọn sai: <b>1695,7 ms</b> so với ' +
    '<b>0,5 ms</b> cho cùng một yêu cầu. Rồi so <code>select</code>, <code>poll</code> và ' +
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
         '<b>42392</b>, <b>38096</b>, lấy từ dải <code>ip_local_port_range</code> mà trên máy ' +
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
      '<text class="d-tm" x="555" y="230" text-anchor="middle">write(fd, "GET TEMPERATURE")</text>' +
      '<line class="d-line" x1="430" y1="226" x2="300" y2="226"/>' +
      '<path class="d-arrow" d="M300 226 L310 221 L310 231 Z"/>' +

      '<rect class="d-box" x="40" y="276" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="165" y="294" text-anchor="middle">read(fd 4) → write(fd 4)</text>' +
      '<rect class="d-box" x="430" y="276" width="250" height="28" rx="6"/>' +
      '<text class="d-tm" x="555" y="294" text-anchor="middle">read(fd) → "temperature 42.5"</text>' +
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

    { t: 'code', where: 'file', name: 'byte_order.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdint.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    union { uint32_t i; unsigned char c[4]; } u = { .i = 1 };\n' +
      '    printf("this architecture      : %s-endian\\n", u.c[0] ? "little" : "big");\n' +
      '\n' +
      '    uint16_t host_port = 9000;\n' +
      '    uint16_t net_port  = htons(host_port);\n' +
      '    printf("port 9000 on host      = 0x%04X\\n", host_port);\n' +
      '    printf("port 9000 on network   = 0x%04X  (= %u if misread)\\n",\n' +
      '           net_port, net_port);\n' +
      '\n' +
      '    unsigned char *p = (unsigned char *)&host_port;\n' +
      '    printf("bytes in RAM (host)    : %02X %02X\\n", p[0], p[1]);\n' +
      '    p = (unsigned char *)&net_port;\n' +
      '    printf("bytes in RAM (network) : %02X %02X\\n", p[0], p[1]);\n' +
      '\n' +
      '    uint32_t ip = 0xC0A80105;                 /* 192.168.1.5 */\n' +
      '    printf("ip 192.168.1.5 on host    = 0x%08X\\n", ip);\n' +
      '    printf("ip 192.168.1.5 on network = 0x%08X\\n", htonl(ip));\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        'Mẹo <code>union</code> ở dòng đầu là cách chuẩn để hỏi kiến trúc mà không cần macro của trình biên dịch: ghi số 1 vào 4 byte rồi xem byte thấp nhất nằm ở đâu.'
      ]},

    { t: 'code', where: 'wsl', code: 'gcc -Wall -Wextra -o byte_order byte_order.c\n./byte_order' },

    { t: 'code', where: 'out', nocopy: true, code:
      'this architecture      : little-endian\n' +
      'port 9000 on host      = 0x2328\n' +
      'port 9000 on network   = 0x2823  (= 10275 if misread)\n' +
      'bytes in RAM (host)    : 28 23\n' +
      'bytes in RAM (network) : 23 28\n' +
      'ip 192.168.1.5 on host    = 0xC0A80105\n' +
      'ip 192.168.1.5 on network = 0x0501A8C0\n' },

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

    { t: 'code', where: 'file', name: 'client_forgot_htons.c (bản hỏng, cố ý)', lang: 'c', code:
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port   = 9000;                 /* FORGOT htons() */\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '\n' +
      '    printf("[client] sin_port in RAM = 0x%04X -> server will read it as port %u\\n",\n' +
      '           addr.sin_port, ntohs(addr.sin_port));\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[client] sin_port in RAM = 0x2328 -> server will read it as port 10275\n' +
      'connect: Connection refused\n' +
      'exit code = 1\n' },

    { t: 'cal', kind: 'warn', title: 'Lỗi này không bao giờ tự nói tên nó ra',
      x: '<p>Thông báo bạn nhận được là <code>Connection refused</code> — y hệt thông báo khi ' +
         'máy chủ chưa chạy, khi sai địa chỉ IP, hay khi tường lửa chặn. Không có một chữ nào ' +
         'nhắc tới thứ tự byte.</p>' +
         '<p>Chương trình đã lặng lẽ gõ cửa cổng <b>10275</b> thay vì <b>9000</b>, vì nhân đọc ' +
         'hai byte <code>28 23</code> trong RAM theo thứ tự mạng và ra số đó. Cách nhận ra: nếu ' +
         '<code>ss -tln</code> khẳng định máy chủ <i>đang</i> nghe đúng cổng mà máy khách vẫn ' +
         'bị từ chối, hãy in <code>addr.sin_port</code> ra dạng hex trước khi nghi ngờ bất cứ thứ ' +
         'gì khác.</p>' },

    /* ══════════════════════════════════════════════
       3. BỘ KHUNG MÁY CHỦ TCP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bộ khung của một máy chủ TCP' },

    { t: 'p', x:
      'Đây là chương trình mạng đầu tiên của bạn. Nó nghe trên cổng 9000, nhận một khách, đọc ' +
      'yêu cầu, trả về một số đo, rồi đóng. Ngắn, nhưng chứa <b>đủ</b> bộ khung mà mọi máy chủ ' +
      'TCP trên đời đều dùng.' },

    { t: 'code', where: 'file', name: 'tcp_server.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <signal.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      '#define PORT 9000\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int times = (argc > 1) ? atoi(argv[1]) : 1;\n' +
      '    signal(SIGPIPE, SIG_IGN);                 /* lesson learned from Bai 23 */\n' +
      '\n' +
      '    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    if (listen_fd == -1) { perror("socket"); exit(1); }\n' +
      '\n' +
      '    int one = 1;\n' +
      '    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);\n' +
      '\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);                /* MUST zero it out first */\n' +
      '    addr.sin_family      = AF_INET;\n' +
      '    addr.sin_addr.s_addr = htonl(INADDR_ANY);     /* every network interface */\n' +
      '    addr.sin_port        = htons(PORT);\n' +
      '\n' +
      '    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
      '    if (listen(listen_fd, 16) == -1) { perror("listen"); exit(1); }\n' +
      '    printf("[server] listen fd = %d, waiting for clients on port %d\\n", listen_fd, PORT);\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    for (int i = 0; i < times; i++) {\n' +
      '        struct sockaddr_in client_addr;\n' +
      '        socklen_t client_len = sizeof client_addr;\n' +
      '        int conn_fd = accept(listen_fd, (struct sockaddr *)&client_addr, &client_len);\n' +
      '        if (conn_fd == -1) { perror("accept"); break; }\n' +
      '\n' +
      '        char ip[INET_ADDRSTRLEN];\n' +
      '        inet_ntop(AF_INET, &client_addr.sin_addr, ip, sizeof ip);\n' +
      '        printf("[server] client %s:%u  ->  new fd = %d\\n", ip, ntohs(client_addr.sin_port), conn_fd);\n' +
      '        fflush(stdout);\n' +
      '\n' +
      '        char buf[128];\n' +
      '        ssize_t n = read(conn_fd, buf, sizeof buf - 1);\n' +
      '        if (n > 0) {\n' +
      '            buf[n] = \'\\0\';\n' +
      '            printf("[server] received %zd bytes: %s", n, buf);\n' +
      '            fflush(stdout);\n' +
      '            const char *reply = "temperature 42.5 C\\n";\n' +
      '            if (write(conn_fd, reply, strlen(reply)) == -1) perror("write");\n' +
      '        }\n' +
      '        close(conn_fd);\n' +
      '        printf("[server] closed fd %d\\n", conn_fd);\n' +
      '        fflush(stdout);\n' +
      '    }\n' +
      '    close(listen_fd);\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        '<code>memset(&amp;addr, 0, sizeof addr)</code> không phải thói quen thừa: <code>struct sockaddr_in</code> có trường đệm <code>sin_zero</code>, và bỏ rác trong đó là nguồn của những lỗi rất khó tái hiện.',
        '<code>fflush(stdout)</code> sau mỗi dòng là vì bạn sẽ chạy chương trình này ở nền và chuyển hướng ra file — cái bẫy đệm khối bạn đã gặp ở Bài 19, Bài 20 và Bài 23.'
      ]},

    { t: 'cmdx', cmd: 'bind / listen / accept',
      title: 'Ba lời gọi, ba nhiệm vụ hoàn toàn khác nhau',
      rows: [
        ['bind(listen_fd, &amp;addr, sizeof addr)',
         'Gắn socket vào địa chỉ + cổng cụ thể. Từ đây nhân biết gói tới cổng 9000 thuộc về ai',
         'Thiếu bước này thì nhân cấp cổng ngẫu nhiên — chấp nhận được với máy khách, vô dụng với máy chủ'],
        ['htonl(INADDR_ANY)',
         '<code>INADDR_ANY</code> = 0.0.0.0 = "nghe trên <b>mọi</b> giao diện mạng"',
         'Máy này có <code>lo</code> (127.0.0.1) và <code>eth0</code> (172.30.153.178). Muốn chỉ nghe nội bộ thì <code>inet_pton</code> vào "127.0.0.1"'],
        ['listen(listen_fd, 16)',
         'Chuyển socket sang trạng thái <i>bị động</i>. Từ giờ nhân tự bắt tay ba bước hộ bạn và xếp kết nối vào hàng chờ',
         'Số 16 là <b>backlog</b>: hàng chờ sâu 16. Vượt trần <code>somaxconn</code> = <b>4096</b> thì bị cắt xuống'],
        ['accept(listen_fd, &amp;client_addr, &amp;client_len)',
         'Lấy <b>một</b> kết nối ra khỏi hàng chờ và trả về mô tả file mới cho riêng nó',
         'Chặn nếu hàng chờ rỗng. <code>listen_fd</code> vẫn tiếp tục nghe — đây là chỗ người mới hay nhầm nhất'],
        ['&amp;client_len',
         'Tham số vừa vào vừa ra: bạn đưa vào kích thước bộ đệm, nhân ghi lại kích thước thật của địa chỉ',
         'Kiểu <code>socklen_t</code>, không phải <code>int</code>. Quên khởi tạo nó là lỗi kinh điển'],
        ['inet_ntop / ntohs',
         'Đổi địa chỉ nhị phân của khách sang chuỗi đọc được, và đổi cổng từ thứ tự mạng về thứ tự máy',
         '<code>inet_ntop</code> thay cho <code>inet_ntoa</code> cũ vì nó an toàn với luồng và dùng được cả IPv6']
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o tcp_server tcp_server.c\n' +
      'gcc -Wall -Wextra -o tcp_client tcp_client.c\n' +
      './tcp_server 1 &\n' +
      'sleep 0.4\n' +
      './tcp_client\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[server] listen fd = 3, waiting for clients on port 9000\n' +
      '[client] connected to 127.0.0.1:9000, fd = 3\n' +
      '[server] client 127.0.0.1:42392  ->  new fd = 4\n' +
      '[server] received 16 bytes: GET TEMPERATURE\n' +
      '[client] reply: temperature 42.5 C\n' +
      '[server] closed fd 4\n' },

    { t: 'cal', kind: 'info', title: 'Ba con số đáng để ý trong output',
      x: '<ul>' +
         '<li><b>listen fd = 3</b> — socket lấy đúng số fd nhỏ nhất còn trống, sau 0/1/2. Nó không ' +
         'khác gì một fd của <code>open()</code>.</li>' +
         '<li><b>new fd = 4</b> — <code>accept()</code> đẻ ra fd thứ hai. Máy chủ giờ giữ ' +
         '<i>hai</i> socket: fd 3 để nghe tiếp, fd 4 để nói chuyện với khách này.</li>' +
         '<li><b>127.0.0.1:42392</b> — cổng tạm nhân cấp cho máy khách, nằm trong dải ' +
         '32768–60999. Chạy lại lần nữa bạn sẽ thấy số khác.</li>' +
         '</ul>' },

    { t: 'h3', x: 'SO_REUSEADDR và TIME_WAIT — dòng code nhìn như thừa' },

    { t: 'p', x:
      'Dòng <code>setsockopt(..., SO_REUSEADDR, ...)</code> trông như một chi tiết vặt có cũng ' +
      'được. Hãy thử bỏ nó ra, rồi khởi động lại máy chủ ngay sau khi nó vừa thoát.' },

    { t: 'code', where: 'wsl', code:
      '# tcp_server_no_reuse.c giong het tcp_server.c nhung KHONG co dong setsockopt\n' +
      './tcp_server_no_reuse 1 &\n' +
      'sleep 0.4\n' +
      './tcp_client 127.0.0.1 9003 > /dev/null\n' +
      'wait\n' +
      'ss -tan | grep 9003\n' +
      './tcp_server_no_reuse 1' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[server] bind port 9003 succeeded\n' +
      '[server] closed, exiting\n' +
      'TIME-WAIT 0      0           127.0.0.1:9003     127.0.0.1:35334\n' +
      'bind: Address already in use\n' },

    { t: 'p', x:
      'Máy chủ đã thoát hẳn. Không tiến trình nào đang giữ cổng 9003. Vậy mà ' +
      '<code>bind</code> vẫn bị từ chối — và ba lần chạy liên tiếp đều cho đúng kết quả đó. ' +
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
      '# tcp_server.c CO SO_REUSEADDR: lam lai dung kich ban tren\n' +
      './tcp_server 1 & sleep 0.4\n' +
      './tcp_client 127.0.0.1 9000 > /dev/null\n' +
      'wait\n' +
      'ss -tan | grep 9000\n' +
      './tcp_server 1 &\n' +
      'sleep 0.5\n' +
      'ss -tln | grep 9000' },

    { t: 'code', where: 'out', nocopy: true, code:
      'TIME-WAIT 0      0           127.0.0.1:9000     127.0.0.1:38096\n' +
      '[server] listen fd = 3, waiting for clients on port 9000\n' +
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

    { t: 'code', where: 'file', name: 'tcp_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    const char *address = (argc > 1) ? argv[1] : "127.0.0.1";\n' +
      '    int         port    = (argc > 2) ? atoi(argv[2]) : 9000;\n' +
      '\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    if (s == -1) { perror("socket"); exit(1); }\n' +
      '\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port   = htons(port);\n' +
      '    if (inet_pton(AF_INET, address, &addr.sin_addr) != 1) {\n' +
      '        fprintf(stderr, "invalid address: %s\\n", address); exit(1);\n' +
      '    }\n' +
      '\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' +
      '    printf("[client] connected to %s:%d, fd = %d\\n", address, port, s);\n' +
      '\n' +
      '    const char *request = "GET TEMPERATURE\\n";\n' +
      '    if (write(s, request, strlen(request)) == -1) { perror("write"); exit(1); }\n' +
      '\n' +
      '    char buf[128];\n' +
      '    ssize_t n = read(s, buf, sizeof buf - 1);\n' +
      '    if (n > 0) { buf[n] = \'\\0\'; printf("[client] reply: %s", buf); }\n' +
      '    else if (n == 0) printf("[client] server closed the connection\\n");\n' +
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

    { t: 'code', where: 'file', name: 'boundary_server.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      '#define PORT 9001\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    int one = 1;\n' +
      '    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);\n' +
      '\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
      '    addr.sin_port = htons(PORT);\n' +
      '    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
      '    listen(listen_fd, 8);\n' +
      '\n' +
      '    int conn_fd = accept(listen_fd, NULL, NULL);\n' +
      '    int count = 0;\n' +
      '    char buf[256];\n' +
      '    ssize_t n;\n' +
      '    while ((n = read(conn_fd, buf, sizeof buf - 1)) > 0) {\n' +
      '        buf[n] = \'\\0\';\n' +
      '        printf("[server] read() call %d returned %zd bytes: \\"", ++count, n);\n' +
      '        for (ssize_t i = 0; i < n; i++)\n' +
      '            putchar(buf[i] == \'\\n\' ? \'|\' : buf[i]);\n' +
      '        printf("\\"\\n");\n' +
      '        fflush(stdout);\n' +
      '    }\n' +
      '    printf("[server] read() returned 0 -> client closed. Total read() calls = %d\\n", count);\n' +
      '    close(conn_fd); close(listen_fd);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'file', name: 'boundary_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int sleep_ms = (argc > 1) ? atoi(argv[1]) : 0;\n' +
      '\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port   = htons(9001);\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' +
      '\n' +
      '    const char *messages[3] = { "meas1:41.5\\n", "meas2:42.0\\n", "meas3:42.5\\n" };\n' +
      '    for (int i = 0; i < 3; i++) {\n' +
      '        if (write(s, messages[i], strlen(messages[i])) == -1) { perror("write"); exit(1); }\n' +
      '        printf("[client] write() call %d sent %zu bytes\\n", i + 1, strlen(messages[i]));\n' +
      '        if (sleep_ms) usleep(sleep_ms * 1000);\n' +
      '    }\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n',
      notes: [
        'Mỗi thông điệp <code>"measN:xx.x\\n"</code> dài đúng 11 byte — con số này là điều bạn sẽ theo dõi trong output bên dưới, không phải nội dung chữ.'
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o boundary_server boundary_server.c\n' +
      'gcc -Wall -Wextra -o boundary_client boundary_client.c\n' +
      '# lan 1: ba lan write lien tiep, khong nghi\n' +
      './boundary_server & sleep 0.4; ./boundary_client 0; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[client] write() call 1 sent 11 bytes\n' +
      '[client] write() call 2 sent 11 bytes\n' +
      '[client] write() call 3 sent 11 bytes\n' +
      '[server] read() call 1 returned 11 bytes: "meas1:41.5|"\n' +
      '[server] read() call 2 returned 22 bytes: "meas2:42.0|meas3:42.5|"\n' +
      '[server] read() returned 0 -> client closed. Total read() calls = 2\n' },

    { t: 'code', where: 'wsl', code:
      '# lan 2: cung chuong trinh, nhung nghi 300 ms giua cac lan write\n' +
      './boundary_server & sleep 0.4; ./boundary_client 300; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[server] read() call 1 returned 11 bytes: "meas1:41.5|"\n' +
      '[server] read() call 2 returned 11 bytes: "meas2:42.0|"\n' +
      '[server] read() call 3 returned 11 bytes: "meas3:42.5|"\n' +
      '[client] write() call 1 sent 11 bytes\n' +
      '[client] write() call 2 sent 11 bytes\n' +
      '[client] write() call 3 sent 11 bytes\n' +
      '[server] read() returned 0 -> client closed. Total read() calls = 3\n',
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

    { t: 'code', where: 'file', name: 'udp_server.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      '#define PORT 9002\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    size_t buf_size = (argc > 1) ? (size_t)atoi(argv[1]) : 256;\n' +
      '    int s = socket(AF_INET, SOCK_DGRAM, 0);\n' +
      '    if (s == -1) { perror("socket"); exit(1); }\n' +
      '\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
      '    addr.sin_port = htons(PORT);\n' +
      '    if (bind(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
      '    printf("[udp] waiting for packets on port %d, recv buffer = %zu bytes\\n", PORT, buf_size);\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    char *buf = malloc(buf_size + 1);\n' +
      '    for (int i = 0; i < 3; i++) {\n' +
      '        struct sockaddr_in client_addr;\n' +
      '        socklen_t client_len = sizeof client_addr;\n' +
      '        ssize_t n = recvfrom(s, buf, buf_size, 0, (struct sockaddr *)&client_addr, &client_len);\n' +
      '        if (n == -1) { perror("recvfrom"); break; }\n' +
      '        buf[n] = \'\\0\';\n' +
      '        char ip[INET_ADDRSTRLEN];\n' +
      '        inet_ntop(AF_INET, &client_addr.sin_addr, ip, sizeof ip);\n' +
      '        printf("[udp] recvfrom() call %d: %zd bytes from %s:%u -> \\"%s\\"\\n",\n' +
      '               i + 1, n, ip, ntohs(client_addr.sin_port), buf);\n' +
      '        fflush(stdout);\n' +
      '    }\n' +
      '    free(buf); close(s);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'file', name: 'udp_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int s = socket(AF_INET, SOCK_DGRAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port   = htons(9002);\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '\n' +
      '    const char *messages[3] = { "meas1:41.5", "meas2:42.0", "meas3:42.5" };\n' +
      '    for (int i = 0; i < 3; i++) {\n' +
      '        ssize_t n = sendto(s, messages[i], strlen(messages[i]), 0,\n' +
      '                           (struct sockaddr *)&addr, sizeof addr);\n' +
      '        printf("[client] sendto() call %d sent %zd bytes, no connect() needed\\n", i + 1, n);\n' +
      '    }\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o udp_server udp_server.c\n' +
      'gcc -Wall -Wextra -o udp_client udp_client.c\n' +
      './udp_server 256 & sleep 0.4; ./udp_client; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[udp] waiting for packets on port 9002, recv buffer = 256 bytes\n' +
      '[client] sendto() call 1 sent 10 bytes, no connect() needed\n' +
      '[client] sendto() call 2 sent 10 bytes, no connect() needed\n' +
      '[client] sendto() call 3 sent 10 bytes, no connect() needed\n' +
      '[udp] recvfrom() call 1: 10 bytes from 127.0.0.1:46824 -> "meas1:41.5"\n' +
      '[udp] recvfrom() call 2: 10 bytes from 127.0.0.1:46824 -> "meas2:42.0"\n' +
      '[udp] recvfrom() call 3: 10 bytes from 127.0.0.1:46824 -> "meas3:42.5"\n' },

    { t: 'p', x:
      'Ba lần gửi, ba lần nhận, mỗi lần đúng 10 byte. Ranh giới gói được giữ nguyên vẹn — đúng ' +
      'thứ TCP không cho bạn. Nhưng cái giá phải trả xuất hiện ngay khi bộ đệm nhận hơi nhỏ.' },

    { t: 'code', where: 'wsl', code:
      '# cung khach gui 10 byte, nhung ben nhan chi dua bo dem 6 byte\n' +
      './udp_server 6 & sleep 0.4; ./udp_client; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[udp] waiting for packets on port 9002, recv buffer = 6 bytes\n' +
      '[udp] recvfrom() call 1: 6 bytes from 127.0.0.1:53747 -> "meas1:"\n' +
      '[client] sendto() call 1 sent 10 bytes, no connect() needed\n' +
      '[client] sendto() call 2 sent 10 bytes, no connect() needed\n' +
      '[udp] recvfrom() call 2: 6 bytes from 127.0.0.1:53747 -> "meas2:"\n' +
      '[client] sendto() call 3 sent 10 bytes, no connect() needed\n' +
      '[udp] recvfrom() call 3: 6 bytes from 127.0.0.1:53747 -> "meas3:"\n' },

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

    { t: 'code', where: 'file', name: 'udp_no_listener.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <errno.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int s = socket(AF_INET, SOCK_DGRAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port   = htons(9999);          /* nobody is listening here */\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '\n' +
      '    for (int i = 1; i <= 3; i++) {\n' +
      '        ssize_t n = sendto(s, "ping", 4, 0, (struct sockaddr *)&addr, sizeof addr);\n' +
      '        if (n == -1)\n' +
      '            printf("sendto call %d: ERROR %zd, errno = %d (%s)\\n", i, n, errno, strerror(errno));\n' +
      '        else\n' +
      '            printf("sendto call %d: SUCCESS, sent %zd bytes — no one received it\\n", i, n);\n' +
      '        usleep(200000);\n' +
      '    }\n' +
      '    close(s);\n' +
      '\n' +
      '    int t = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    if (connect(t, (struct sockaddr *)&addr, sizeof addr) == -1)\n' +
      '        printf("TCP connect to same port: IMMEDIATE ERROR — %s\\n", strerror(errno));\n' +
      '    close(t);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o udp_no_listener udp_no_listener.c\n' +
      './udp_no_listener' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sendto call 1: SUCCESS, sent 4 bytes — no one received it\n' +
      'sendto call 2: SUCCESS, sent 4 bytes — no one received it\n' +
      'sendto call 3: SUCCESS, sent 4 bytes — no one received it\n' +
      'TCP connect to same port: IMMEDIATE ERROR — Connection refused\n' },

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
      'TCP  : 10000/10000 round trips,  76.15 us/round trip\n' +
      'TCP  : 10000/10000 round trips,  65.75 us/round trip\n' +
      'TCP  : 10000/10000 round trips,  71.08 us/round trip\n' +
      'UDP  : 10000/10000 round trips,  63.33 us/round trip\n' +
      'UDP  : 10000/10000 round trips,  58.41 us/round trip\n' +
      'UDP  : 10000/10000 round trips,  58.91 us/round trip\n' },

    { t: 'cal', kind: 'info', title: 'Chênh lệch nhỏ hơn bạn tưởng — và đó là điều nên nhớ',
      x: '<p>TCP <b>65,75–76,15 µs</b>, UDP <b>58,41–63,33 µs</b>: UDP nhanh hơn khoảng ' +
         '<b>15 %</b>. Không phải một trời một vực.</p>' +
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
        ['Khứ hồi 16 byte, loopback', '<b>65,75–76,15 µs</b>', '<b>58,41–63,33 µs</b>'],
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

    { t: 'code', where: 'file', name: 'sequential_server.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <signal.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      '#define PORT 9004\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int target = (argc > 1) ? atoi(argv[1]) : 2;\n' +
      '    signal(SIGPIPE, SIG_IGN);\n' +
      '\n' +
      '    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    int one = 1;\n' +
      '    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
      '    addr.sin_port = htons(PORT);\n' +
      '    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
      '    listen(listen_fd, 16);\n' +
      '    printf("[sequential] listening on port %d\\n", PORT);\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    for (int i = 0; i < target; i++) {\n' +
      '        int conn_fd = accept(listen_fd, NULL, NULL);\n' +
      '        if (conn_fd == -1) { perror("accept"); break; }\n' +
      '        printf("[sequential] accepted client fd %d — will NOT accept anyone else until this one is done\\n", conn_fd);\n' +
      '        fflush(stdout);\n' +
      '\n' +
      '        char buf[128];\n' +
      '        ssize_t n = read(conn_fd, buf, sizeof buf - 1);      /* BLOCKS here */\n' +
      '        if (n > 0) {\n' +
      '            buf[n] = \'\\0\';\n' +
      '            const char *reply = "temperature 42.5 C\\n";\n' +
      '            if (write(conn_fd, reply, strlen(reply)) == -1) perror("write");\n' +
      '            printf("[sequential] replied to fd %d\\n", conn_fd);\n' +
      '            fflush(stdout);\n' +
      '        }\n' +
      '        close(conn_fd);\n' +
      '    }\n' +
      '    close(listen_fd);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'file', name: 'slow_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int wait_ms = (argc > 1) ? atoi(argv[1]) : 2000;\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port = htons(9004);\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' +
      '    printf("[slow] connected, deliberately silent for %d ms\\n", wait_ms);\n' +
      '    fflush(stdout);\n' +
      '    usleep(wait_ms * 1000);\n' +
      '    const char *request = "GET TEMPERATURE\\n";\n' +
      '    if (write(s, request, strlen(request)) == -1) perror("write");\n' +
      '    char buf[128];\n' +
      '    ssize_t n = read(s, buf, sizeof buf - 1);\n' +
      '    if (n > 0) { buf[n] = \'\\0\'; printf("[slow] reply: %s", buf); }\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'file', name: 'probe_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <time.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct timespec t0, t1;\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t0);\n' +
      '\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port = htons(9004);\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' +
      '\n' +
      '    const char *request = "GET TEMPERATURE\\n";\n' +
      '    if (write(s, request, strlen(request)) == -1) perror("write");\n' +
      '    char buf[128];\n' +
      '    ssize_t n = read(s, buf, sizeof buf - 1);\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
      '    if (n > 0) buf[n] = \'\\0\';\n' +
      '    double ms = (t1.tv_sec - t0.tv_sec) * 1e3 + (t1.tv_nsec - t0.tv_nsec) / 1e6;\n' +
      '    printf("[probe] waited %.1f ms to get a reply\\n", ms);\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o sequential_server sequential_server.c\n' +
      'gcc -Wall -Wextra -o slow_client slow_client.c\n' +
      'gcc -Wall -Wextra -o probe_client probe_client.c\n' +
      './sequential_server 2 & sleep 0.4\n' +
      './slow_client 2000 & sleep 0.3\n' +
      './probe_client\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[sequential] listening on port 9004\n' +
      '[slow] connected, deliberately silent for 2000 ms\n' +
      '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
      '[sequential] replied to fd 4\n' +
      '[slow] reply: temperature 42.5 C\n' +
      '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
      '[sequential] replied to fd 4\n' +
      '[probe] waited 1695.7 ms to get a reply\n' },

    { t: 'p', x:
      '<b>1695,7 ms</b> để trả lời một yêu cầu mà bản thân nó chỉ tốn dưới một phần nghìn giây. ' +
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
      '<text class="d-t" x="180" y="240" text-anchor="middle">1695,7 ms</text>' +
      '<rect class="d-box-g" x="380" y="176" width="320" height="90" rx="8"/>' +
      '<text class="d-t" x="540" y="204" text-anchor="middle">Khách nhanh được phục vụ ngay</text>' +
      '<text class="d-t" x="540" y="240" text-anchor="middle">0,5 ms</text>' +
      '<text class="d-ts" x="360" y="288" text-anchor="middle">Cùng một kịch bản, cùng một máy — khác nhau khoảng 3400 lần</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       8. SELECT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'select — người đầu tiên, và giới hạn 1024' },

    { t: 'p', x:
      '<code>select()</code> có mặt từ BSD năm 1983 và vẫn còn trong mọi hệ thống POSIX. Ý ' +
      'tưởng: bạn đưa cho nhân một <b>bảng bit</b> đánh dấu những fd cần theo dõi, nhân đánh ' +
      'dấu lại những cái đã sẵn sàng.' },

    { t: 'code', where: 'file', name: 'select_server.c — phần vòng lặp chính', lang: 'c', code:
      '    int clients[MAX_CLIENTS];\n' +
      '    for (int i = 0; i < MAX_CLIENTS; i++) clients[i] = -1;\n' +
      '\n' +
      '    while (done < target) {\n' +
      '        fd_set read_set;\n' +
      '        FD_ZERO(&read_set);            /* MUST rebuild every round */\n' +
      '        FD_SET(listen_fd, &read_set);\n' +
      '        int maxfd = listen_fd;\n' +
      '        for (int i = 0; i < MAX_CLIENTS; i++)\n' +
      '            if (clients[i] != -1) {\n' +
      '                FD_SET(clients[i], &read_set);\n' +
      '                if (clients[i] > maxfd) maxfd = clients[i];\n' +
      '            }\n' +
      '\n' +
      '        if (select(maxfd + 1, &read_set, NULL, NULL, NULL) == -1) { perror("select"); break; }\n' +
      '\n' +
      '        if (FD_ISSET(listen_fd, &read_set)) {  /* new client */\n' +
      '            int conn_fd = accept(listen_fd, NULL, NULL);\n' +
      '            if (conn_fd != -1)\n' +
      '                for (int i = 0; i < MAX_CLIENTS; i++)\n' +
      '                    if (clients[i] == -1) { clients[i] = conn_fd; break; }\n' +
      '        }\n' +
      '        for (int i = 0; i < MAX_CLIENTS; i++) { /* existing client has data */\n' +
      '            int fd = clients[i];\n' +
      '            if (fd == -1 || !FD_ISSET(fd, &read_set)) continue;\n' +
      '            char buf[128];\n' +
      '            ssize_t n = read(fd, buf, sizeof buf - 1);\n' +
      '            if (n <= 0) { close(fd); clients[i] = -1; continue; }\n' +
      '            const char *reply = "temperature 42.5 C\\n";\n' +
      '            if (write(fd, reply, strlen(reply)) == -1) perror("write");\n' +
      '            close(fd); clients[i] = -1; done++;\n' +
      '        }\n' +
      '    }\n' },

    { t: 'cmdx', cmd: 'select(nfds, &read_set, &write_set, &err_set, &timeout)',
      title: 'Năm tham số và bốn macro đi kèm',
      rows: [
        ['nfds', 'Số fd <b>lớn nhất cộng 1</b> — không phải số lượng fd', 'Sai chỗ này là lỗi kinh điển. Nhân quét bảng bit từ 0 tới <code>nfds-1</code>'],
        ['&amp;read_set', 'Tập fd cần theo dõi <i>đọc được</i>. Nhân <b>sửa</b> tập này tại chỗ', 'Đây là lý do phải <code>FD_ZERO</code> + <code>FD_SET</code> lại từ đầu mỗi vòng'],
        ['&amp;write_set, &amp;err_set', 'Tập <i>ghi được</i> và tập <i>có ngoại lệ</i>. Truyền <code>NULL</code> nếu không cần', 'Tập ghi có ích khi <code>connect</code> không chặn hoặc khi bộ đệm gửi đã đầy'],
        ['&amp;timeout', '<code>struct timeval</code> thời hạn chờ. <code>NULL</code> = chờ mãi mãi', 'Trên Linux nhân <b>ghi đè</b> struct này bằng thời gian còn lại — đừng tái dùng nó'],
        ['FD_ZERO / FD_SET', 'Xoá sạch tập / thêm một fd vào tập', 'Hai macro này bạn phải gọi lại <b>mỗi vòng lặp</b>'],
        ['FD_ISSET', 'Hỏi xem fd có được nhân đánh dấu sẵn sàng không', 'Phải duyệt qua <b>tất cả</b> fd để hỏi — không có cách nào lấy thẳng danh sách']
      ]},

    { t: 'code', where: 'wsl', code:
      '# cung kich ban khach cham + khach nhanh, nhung dung select_server\n' +
      'gcc -Wall -Wextra -o select_server select_server.c\n' +
      './select_server 2 & sleep 0.4\n' +
      './slow_client 2000 & sleep 0.3\n' +
      './probe_client\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[select] listening on port 9004\n' +
      '[slow] connected, deliberately silent for 2000 ms\n' +
      '[select] new client fd 4 — still watching every channel\n' +
      '[select] new client fd 5 — still watching every channel\n' +
      '[select] replied to fd 5\n' +
      '[probe] waited 0.5 ms to get a reply\n' +
      '[select] replied to fd 4\n' +
      '[slow] reply: temperature 42.5 C\n' +
      '[select] served 2 clients, done\n' },

    { t: 'cal', kind: 'info', title: '1695,7 ms → 0,5 ms',
      x: '<p>Cùng hai máy khách, cùng cái máy, khác mỗi cách chờ. Khách nhanh được trả lời trong ' +
         '<b>0,5 ms</b> thay vì <b>1695,7 ms</b> — nhanh hơn khoảng <b>3400 lần</b> — trong khi ' +
         'khách chậm vẫn được phục vụ đầy đủ ngay khi nó chịu gửi.</p>' +
         '<p>Để ý thứ tự trong output: máy chủ <code>accept</code> cả hai khách <i>trước</i> khi ' +
         'trả lời ai. Nó không còn bị trói vào một kênh nữa.</p>' },

    { t: 'h3', x: 'Giới hạn cứng của select: FD_SETSIZE' },

    { t: 'p', x:
      '<code>fd_set</code> là một bảng bit có kích thước cố định, quyết định lúc biên dịch. Trên ' +
      'máy này nó là <b>128 byte</b> = <b>1024 bit</b> = <code>FD_SETSIZE</code>. Nghĩa là ' +
      '<code>select</code> không thể theo dõi fd số <b>1024</b> trở lên — mà một máy chủ chỉ ' +
      'cần hơn 1024 kết nối là chạm ngay vào đó.' },

    { t: 'code', where: 'file', name: 'select_overflow.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <sys/select.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd = -1;\n' +
      '    for (int i = 0; i < 1500; i++) {\n' +
      '        int f = open("/dev/null", O_RDONLY);\n' +
      '        if (f == -1) break;\n' +
      '        fd = f;\n' +
      '    }\n' +
      '    printf("highest fd = %d, FD_SETSIZE = %d, sizeof(fd_set) = %zu bytes\\n",\n' +
      '           fd, FD_SETSIZE, sizeof(fd_set));\n' +
      '    fd_set read_set;\n' +
      '    FD_ZERO(&read_set);\n' +
      '    printf("about to call FD_SET(%d, &read_set) — exceeds the %d-bit table...\\n", fd, FD_SETSIZE);\n' +
      '    fflush(stdout);\n' +
      '    FD_SET(fd, &read_set);\n' +
      '    printf("FD_SET returned normally. No warning at all.\\n");\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      '# mo /dev/null 1500 lan de day so fd len cao, roi thu FD_SET\n' +
      'gcc -Wall -Wextra -o select_overflow select_overflow.c\n' +
      './select_overflow\n' +
      'echo "exit code = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'highest fd = 1503, FD_SETSIZE = 1024, sizeof(fd_set) = 128 bytes\n' +
      'about to call FD_SET(1503, &read_set) — exceeds the 1024-bit table...\n' +
      '*** bit out of range 0 - FD_SETSIZE on fd_set ***: terminated\n' +
      'exit code = 134\n' },

    { t: 'cal', kind: 'danger', title: 'Ngày xưa nó âm thầm phá bộ nhớ, ngày nay nó giết tiến trình',
      x: '<p><code>FD_SET(1503, &amp;read_set)</code> đang ghi bit thứ 1503 vào một vùng chỉ có 1024 ' +
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

    { t: 'code', where: 'file', name: 'poll_server.c — phần vòng lặp chính', lang: 'c', code:
      '    struct pollfd pf[MAX_CLIENTS];\n' +
      '    pf[0].fd = listen_fd; pf[0].events = POLLIN;\n' +
      '    int count = 1;\n' +
      '\n' +
      '    while (done < target) {\n' +
      '        int n = poll(pf, (nfds_t)count, -1);    /* array is NOT rebuilt */\n' +
      '        if (n == -1) { perror("poll"); break; }\n' +
      '\n' +
      '        if (pf[0].revents & POLLIN) {\n' +
      '            int conn_fd = accept(listen_fd, NULL, NULL);\n' +
      '            if (conn_fd != -1 && count < MAX_CLIENTS) {\n' +
      '                pf[count].fd = conn_fd; pf[count].events = POLLIN; pf[count].revents = 0;\n' +
      '                count++;\n' +
      '            }\n' +
      '        }\n' +
      '        for (int i = 1; i < count; i++) {\n' +
      '            if (!(pf[i].revents & (POLLIN | POLLHUP))) continue;\n' +
      '            char buf[128];\n' +
      '            ssize_t r = read(pf[i].fd, buf, sizeof buf - 1);\n' +
      '            if (r > 0) {\n' +
      '                const char *reply = "temperature 42.5 C\\n";\n' +
      '                if (write(pf[i].fd, reply, strlen(reply)) == -1) perror("write");\n' +
      '                done++;\n' +
      '            }\n' +
      '            close(pf[i].fd);\n' +
      '            pf[i] = pf[count - 1];               /* fill the gap with the last element */\n' +
      '            count--; i--;\n' +
      '        }\n' +
      '    }\n',
      notes: [
        'Mẹo <code>pf[i] = pf[count-1]; count--; i--;</code> là cách xoá một phần tử khỏi mảng trong O(1) khi thứ tự không quan trọng: kéo phần tử cuối vào chỗ trống. Nhớ <code>i--</code>, nếu không bạn bỏ sót phần tử vừa kéo về.'
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
        ['poll(pf, count, -1)', 'Tham số hai là <b>số phần tử</b> — trực giác hơn <code>maxfd+1</code> của select',
         'Tham số ba là thời hạn tính bằng <b>mili giây</b>; −1 nghĩa là chờ mãi, 0 nghĩa là hỏi rồi về ngay']
      ]},

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o poll_server poll_server.c\n' +
      './poll_server 2 & sleep 0.4\n' +
      './slow_client 2000 & sleep 0.3\n' +
      './probe_client\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[poll] listening on port 9004, pollfd array has 16 slots\n' +
      '[slow] connected, deliberately silent for 2000 ms\n' +
      '[poll] new client fd 4, now watching 2 channels\n' +
      '[poll] new client fd 5, now watching 3 channels\n' +
      '[poll] replied to fd 5\n' +
      '[probe] waited 0.3 ms to get a reply\n' +
      '[poll] replied to fd 4\n' +
      '[slow] reply: temperature 42.5 C\n' +
      '[poll] served 2 clients, done\n' },

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
        ['epoll_wait(ep, events, 16, -1)', 'Trả về <b>số fd sẵn sàng</b> và điền chúng vào mảng <code>events</code>',
         'Đây là điểm mấu chốt: bạn chỉ duyệt <code>n</code> phần tử, không phải toàn bộ danh sách. Tham số cuối là thời hạn mili giây'],
        ['-1 / 0 / 1500', 'Thời hạn: chờ mãi / hỏi rồi về ngay / chờ tối đa 1,5 giây',
         'Thời hạn hữu hạn rất hợp với daemon nhúng: nó cho bạn một nhịp đều để kiểm tra watchdog hay ghi log định kỳ']
      ]},

    { t: 'code', where: 'file', name: 'epoll_server.c — bộ khung', lang: 'c', code:
      '    int epoll_fd = epoll_create1(0);\n' +
      '    if (epoll_fd == -1) { perror("epoll_create1"); exit(1); }\n' +
      '\n' +
      '    struct epoll_event ev;\n' +
      '    ev.events  = EPOLLIN;\n' +
      '    ev.data.fd = listen_fd;\n' +
      '    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, listen_fd, &ev) == -1) { perror("epoll_ctl"); exit(1); }\n' +
      '\n' +
      '    struct epoll_event events[16];\n' +
      '    for (;;) {\n' +
      '        int n = epoll_wait(epoll_fd, events, 16, 1500);\n' +
      '        if (n == -1) { perror("epoll_wait"); break; }\n' +
      '        if (n == 0)  { printf("timed out, no more events\\n"); break; }\n' +
      '\n' +
      '        for (int i = 0; i < n; i++) {          /* only walk n, not the whole list */\n' +
      '            if (events[i].data.fd == listen_fd) {\n' +
      '                int conn_fd = accept(listen_fd, NULL, NULL);\n' +
      '                if (conn_fd == -1) continue;\n' +
      '                struct epoll_event e2;\n' +
      '                e2.events  = EPOLLIN | (et ? EPOLLET : 0);\n' +
      '                e2.data.fd = conn_fd;\n' +
      '                epoll_ctl(epoll_fd, EPOLL_CTL_ADD, conn_fd, &e2);\n' +
      '            } else {\n' +
      '                char b[8];\n' +
      '                ssize_t r = read(events[i].data.fd, b, 5);   /* deliberately reads little */\n' +
      '                if (r <= 0) {\n' +
      '                    epoll_ctl(epoll_fd, EPOLL_CTL_DEL, events[i].data.fd, NULL);\n' +
      '                    close(events[i].data.fd);\n' +
      '                    continue;\n' +
      '                }\n' +
      '                /* ... handle the r bytes ... */\n' +
      '            }\n' +
      '        }\n' +
      '    }\n' },

    { t: 'h3', x: 'Đo thật: ba cách chờ trên 10 → 2000 kênh' },

    { t: 'p', x:
      'Chương trình <code>io_bench.c</code> tạo N pipe, đưa hết vào tập theo dõi, rồi lặp ' +
      '10 000 lần: ghi 1 byte vào <b>một</b> pipe, gọi hàm chờ, đọc byte đó ra. Nghĩa là mỗi ' +
      'vòng luôn có đúng một kênh sẵn sàng, còn lại đều rỗi — mô phỏng đúng một máy chủ có ' +
      'nhiều kết nối nhàn rỗi.' },

    { t: 'code', where: 'file', name: 'io_bench.c', lang: 'c', code:
      '#define _GNU_SOURCE\n' +
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <time.h>\n' +
      '#include <poll.h>\n' +
      '#include <sys/select.h>\n' +
      '#include <sys/epoll.h>\n' +
      '\n' +
      '#define LAP 10000\n' +
      '\n' +
      'static double now(void)\n' +
      '{\n' +
      '    struct timespec t;\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t);\n' +
      '    return t.tv_sec + t.tv_nsec / 1e9;\n' +
      '}\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int N = (argc > 1) ? atoi(argv[1]) : 100;\n' +
      '    int (*pipes)[2] = malloc((size_t)N * sizeof *pipes);\n' +
      '    int maxfd = 0;\n' +
      '    for (int i = 0; i < N; i++) {\n' +
      '        if (pipe(pipes[i])) { perror("pipe"); return 1; }\n' +
      '        if (pipes[i][0] > maxfd) maxfd = pipes[i][0];\n' +
      '    }\n' +
      '    int active = N - 1;\n' +
      '    char b = \'x\';\n' +
      '    double t0, t1;\n' +
      '    printf("N = %-5d channels, highest read fd = %-5d (FD_SETSIZE = %d)\\n",\n' +
      '           N, maxfd, FD_SETSIZE);\n' +
      '\n' +
      '    if (maxfd < FD_SETSIZE) {\n' +
      '        t0 = now();\n' +
      '        for (int k = 0; k < LAP; k++) {\n' +
      '            fd_set r;\n' +
      '            FD_ZERO(&r);\n' +
      '            for (int i = 0; i < N; i++) FD_SET(pipes[i][0], &r);\n' +
      '            if (write(pipes[active][1], &b, 1) != 1) return 1;\n' +
      '            if (select(maxfd + 1, &r, NULL, NULL, NULL) == -1) { perror("select"); return 1; }\n' +
      '            if (read(pipes[active][0], &b, 1) != 1) return 1;\n' +
      '        }\n' +
      '        t1 = now();\n' +
      '        printf("  select : %7.2f us/call\\n", (t1 - t0) * 1e6 / LAP);\n' +
      '    } else {\n' +
      '        printf("  select : NOT USABLE (fd %d >= FD_SETSIZE %d)\\n", maxfd, FD_SETSIZE);\n' +
      '    }\n' +
      '\n' +
      '    struct pollfd *pf = malloc((size_t)N * sizeof *pf);\n' +
      '    for (int i = 0; i < N; i++) { pf[i].fd = pipes[i][0]; pf[i].events = POLLIN; }\n' +
      '    t0 = now();\n' +
      '    for (int k = 0; k < LAP; k++) {\n' +
      '        if (write(pipes[active][1], &b, 1) != 1) return 1;\n' +
      '        if (poll(pf, (nfds_t)N, -1) == -1) { perror("poll"); return 1; }\n' +
      '        if (read(pipes[active][0], &b, 1) != 1) return 1;\n' +
      '    }\n' +
      '    t1 = now();\n' +
      '    printf("  poll   : %7.2f us/call\\n", (t1 - t0) * 1e6 / LAP);\n' +
      '\n' +
      '    int ep = epoll_create1(0);\n' +
      '    if (ep == -1) { perror("epoll_create1"); return 1; }\n' +
      '    for (int i = 0; i < N; i++) {\n' +
      '        struct epoll_event ev;\n' +
      '        ev.events = EPOLLIN;\n' +
      '        ev.data.fd = pipes[i][0];\n' +
      '        if (epoll_ctl(ep, EPOLL_CTL_ADD, pipes[i][0], &ev)) { perror("epoll_ctl"); return 1; }\n' +
      '    }\n' +
      '    struct epoll_event sk[8];\n' +
      '    t0 = now();\n' +
      '    for (int k = 0; k < LAP; k++) {\n' +
      '        if (write(pipes[active][1], &b, 1) != 1) return 1;\n' +
      '        if (epoll_wait(ep, sk, 8, -1) == -1) { perror("epoll_wait"); return 1; }\n' +
      '        if (read(pipes[active][0], &b, 1) != 1) return 1;\n' +
      '    }\n' +
      '    t1 = now();\n' +
      '    printf("  epoll  : %7.2f us/call\\n", (t1 - t0) * 1e6 / LAP);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -O2 -o io_bench io_bench.c\n' +
      'for N in 10 100 500 2000; do ./io_bench $N; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'N = 10    channels, highest read fd = 22    (FD_SETSIZE = 1024)\n' +
      '  select :    1.83 us/call\n' +
      '  poll   :    2.61 us/call\n' +
      '  epoll  :    1.31 us/call\n' +
      'N = 100   channels, highest read fd = 202   (FD_SETSIZE = 1024)\n' +
      '  select :   13.53 us/call\n' +
      '  poll   :   12.48 us/call\n' +
      '  epoll  :    0.85 us/call\n' +
      'N = 500   channels, highest read fd = 1002  (FD_SETSIZE = 1024)\n' +
      '  select :   63.71 us/call\n' +
      '  poll   :   59.32 us/call\n' +
      '  epoll  :    0.90 us/call\n' +
      'N = 2000  channels, highest read fd = 4002  (FD_SETSIZE = 1024)\n' +
      '  select : NOT USABLE (fd 4002 >= FD_SETSIZE 1024)\n' +
      '  poll   :  286.54 us/call\n' +
      '  epoll  :    0.72 us/call\n',
      notes: [
        'Đây là kết quả một lượt chạy tiêu biểu. Ba lượt liên tiếp cho khoảng: select 1,83–2,26 · 12,11–13,53 · 63,71–72,33 µs; poll 2,27–3,07 · 11,09–13,62 · 59,32–63,39 · 264,58–286,54 µs; epoll 0,72–1,31 µs ở mọi N.'
      ]},

    { t: 'table',
      head: ['Số kênh', 'select', 'poll', 'epoll', 'epoll nhanh hơn'],
      rows: [
        ['10',   '1,83 µs',       '2,61 µs',   '1,31 µs', '<b>2,0×</b>'],
        ['100',  '13,53 µs',      '12,48 µs',  '0,85 µs', '<b>15×</b>'],
        ['500',  '63,71 µs',      '59,32 µs',  '0,90 µs', '<b>66×</b>'],
        ['2000', 'không dùng được', '286,54 µs', '0,72 µs', '<b>398×</b>']
      ]},

    { t: 'cal', kind: 'why', title: 'Hãy nhìn cột epoll theo chiều dọc, không phải chiều ngang',
      x: '<p>Điều đáng nhớ không phải "epoll nhanh hơn 398 lần". Đó chỉ là hệ quả. Điều đáng nhớ ' +
         'là <b>cột epoll gần như không đổi</b>: 1,31 → 0,85 → 0,90 → 0,72 µs khi số kênh tăng ' +
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
      ' 27.42    0.963911          96     10000           poll\n' +
      ' 27.72    0.974311          97     10000           pselect6\n' +
      '  6.18    0.217287          21     10000           epoll_wait\n' +
      '  0.39    0.013770          27       500           epoll_ctl\n' },

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
      '<text class="d-ts" x="140" y="232" text-anchor="middle">1,8 · 2,6 · 1,3</text>' +

      '<text class="d-t" x="290" y="272" text-anchor="middle">100 kênh</text>' +
      '<rect class="d-box-w" x="250" y="197" width="24" height="53"/>' +
      '<rect class="d-box-w" x="278" y="188" width="24" height="62"/>' +
      '<rect class="d-box-g" x="306" y="246" width="24" height="4"/>' +
      '<text class="d-ts" x="290" y="180" text-anchor="middle">13,5 · 12,5 · 0,9</text>' +

      '<text class="d-t" x="440" y="272" text-anchor="middle">500 kênh</text>' +
      '<rect class="d-box-w" x="400" y="99" width="24" height="151"/>' +
      '<rect class="d-box-w" x="428" y="108" width="24" height="142"/>' +
      '<rect class="d-box-g" x="456" y="247" width="24" height="3"/>' +
      '<text class="d-ts" x="440" y="91" text-anchor="middle">63,7 · 59,3 · 0,9</text>' +

      '<text class="d-t" x="590" y="272" text-anchor="middle">2000 kênh</text>' +
      '<rect class="d-box" x="550" y="230" width="24" height="20"/>' +
      '<text class="d-ts" x="562" y="224" text-anchor="middle">×</text>' +
      '<rect class="d-box-w" x="578" y="40" width="24" height="210"/>' +
      '<rect class="d-box-g" x="606" y="247" width="24" height="3"/>' +
      '<text class="d-ts" x="600" y="32" text-anchor="middle">286,5 · 0,7</text>' +

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

    { t: 'code', where: 'file', name: 'epoll_test_client.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <arpa/inet.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    int port = (argc > 1) ? atoi(argv[1]) : 9005;\n' +
      '    const char *message = (argc > 2) ? argv[2] : "0123456789ABCDEFGHIJ";\n' +
      '    int hold_s = (argc > 3) ? atoi(argv[3]) : 3;\n' +
      '\n' +
      '    int s = socket(AF_INET, SOCK_STREAM, 0);\n' +
      '    struct sockaddr_in addr;\n' +
      '    memset(&addr, 0, sizeof addr);\n' +
      '    addr.sin_family = AF_INET;\n' +
      '    addr.sin_port = htons(port);\n' +
      '    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);\n' +
      '    if (connect(s, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("connect"); exit(1); }\n' +
      '    if (write(s, message, strlen(message)) == -1) perror("write");\n' +
      '    printf("[client] sent %zu bytes IN ONE CALL then holds the connection for %d s\\n", strlen(message), hold_s);\n' +
      '    fflush(stdout);\n' +
      '    sleep(hold_s);\n' +
      '    close(s);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o epoll_server epoll_server.c\n' +
      'gcc -Wall -Wextra -o epoll_test_client epoll_test_client.c\n' +
      './epoll_server lt & sleep 0.4; ./epoll_test_client 9005 "0123456789ABCDEFGHIJ" 3; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[epoll] mode LEVEL-triggered (default), reading AT MOST 5 bytes per event\n' +
      '[epoll] added fd 5 to the watch set\n' +
      '[epoll] event 1: read 5 bytes -> "01234"  (total 5)\n' +
      '[epoll] event 2: read 5 bytes -> "56789"  (total 10)\n' +
      '[epoll] event 3: read 5 bytes -> "ABCDE"  (total 15)\n' +
      '[epoll] event 4: read 5 bytes -> "FGHIJ"  (total 20)\n' +
      '[client] sent 20 bytes IN ONE CALL then holds the connection for 3 s\n' +
      '[epoll] 1500 ms elapsed, no more events -> exiting\n' +
      '[epoll] total 4 read events, 20 bytes retrieved\n' },

    { t: 'code', where: 'wsl', code:
      './epoll_server et & sleep 0.4; ./epoll_test_client 9005 "0123456789ABCDEFGHIJ" 3; wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[epoll] mode EDGE-triggered (EPOLLET), reading AT MOST 5 bytes per event\n' +
      '[epoll] added fd 5 to the watch set\n' +
      '[client] sent 20 bytes IN ONE CALL then holds the connection for 3 s\n' +
      '[epoll] event 1: read 5 bytes -> "01234"  (total 5)\n' +
      '[epoll] 1500 ms elapsed, no more events -> exiting\n' +
      '[epoll] total 1 read events, 5 bytes retrieved\n' },

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

    { t: 'code', where: 'file', name: 'nonblocking_demo.c', lang: 'c', code:
      '#define _GNU_SOURCE\n' +
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <errno.h>\n' +
      '#include <fcntl.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("EAGAIN = %d, EWOULDBLOCK = %d -> %s\\n", EAGAIN, EWOULDBLOCK,\n' +
      '           EAGAIN == EWOULDBLOCK ? "same value on Linux" : "different values");\n' +
      '\n' +
      '    int fd[2];\n' +
      '    if (pipe(fd)) { perror("pipe"); exit(1); }\n' +
      '\n' +
      '    int flags = fcntl(fd[0], F_GETFL);\n' +
      '    if (fcntl(fd[0], F_SETFL, flags | O_NONBLOCK) == -1) { perror("fcntl"); exit(1); }\n' +
      '    if (fcntl(fd[1], F_SETFL, fcntl(fd[1], F_GETFL) | O_NONBLOCK) == -1) { perror("fcntl"); exit(1); }\n' +
      '\n' +
      '    char b[16];\n' +
      '    ssize_t n = read(fd[0], b, sizeof b);\n' +
      '    printf("read()  on an EMPTY pipe : returned %zd, errno = %d (%s)\\n",\n' +
      '           n, errno, strerror(errno));\n' +
      '\n' +
      '    char *data = malloc(100000);\n' +
      '    memset(data, \'x\', 100000);\n' +
      '    n = write(fd[1], data, 100000);\n' +
      '    printf("write() of 100000 bytes  : returned %zd  -> SHORT by %zd bytes\\n",\n' +
      '           n, (ssize_t)100000 - n);\n' +
      '    n = write(fd[1], data, 100000);\n' +
      '    printf("write() on a FULL pipe   : returned %zd, errno = %d (%s)\\n",\n' +
      '           n, errno, strerror(errno));\n' +
      '\n' +
      '    n = read(fd[0], b, sizeof b);\n' +
      '    printf("read()  once data exists : returned %zd\\n", n);\n' +
      '    free(data);\n' +
      '    return 0;\n' +
      '}\n' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o nonblocking_demo nonblocking_demo.c\n' +
      './nonblocking_demo' },

    { t: 'code', where: 'out', nocopy: true, code:
      'EAGAIN = 11, EWOULDBLOCK = 11 -> same value on Linux\n' +
      'read()  on an EMPTY pipe : returned -1, errno = 11 (Resource temporarily unavailable)\n' +
      'write() of 100000 bytes  : returned 65536  -> SHORT by 34464 bytes\n' +
      'write() on a FULL pipe   : returned -1, errno = 11 (Resource temporarily unavailable)\n' +
      'read()  once data exists : returned 16\n' },

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
      '    int len = snprintf(reply, sizeof reply, "temperature=%.1f samples=%lu\\n", temp, count);\n' +
      '    int written = 0;\n' +
      '    while (written < len) {\n' +
      '        ssize_t k = write(fd, reply + written, (size_t)(len - written));\n' +
      '        if (k == -1) {\n' +
      '            if (errno == EAGAIN || errno == EWOULDBLOCK) continue;  /* not written yet, retry */\n' +
      '            perror("write"); break;                                 /* real error */\n' +
      '        }\n' +
      '        written += (int)k;\n' +
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
            'gcc -Wall -Wextra -O2 -o tcp_server tcp_server.c\n' +
            'gcc -Wall -Wextra -O2 -o tcp_client tcp_client.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            'compiled: 0 warnings\n' },

          { t: 'cal', kind: 'info', title: '0 cảnh báo — vì sao con số này đáng kiểm tra ngay',
            x: '<p>Mã socket đầy những phép ép kiểu con trỏ dạng ' +
               '<code>(struct sockaddr *)&amp;addr</code>, như bạn thấy trong <code>tcp_server.c</code> ' +
               'và <code>tcp_client.c</code>. Viết sai kiểu, quên dấu <code>&amp;</code>, hay lẫn ' +
               '<code>struct sockaddr_in</code> với <code>struct sockaddr</code> là những lỗi ' +
               '<code>-Wall -Wextra</code> bắt được ngay ở bước biên dịch, dưới dạng ' +
               '<code>incompatible pointer type</code> — thay vì để nó trồi lên thành một lỗi runtime ' +
               'khó dò ở các bước đo đạc phía sau.</p>' +
               '<p><b>0 cảnh báo</b> nghĩa là không phép ép kiểu nào bị nghi ngờ. Nếu bước này của bạn ' +
               'ra bất kỳ dòng <code>warning:</code> nào, hãy dừng lại và đọc kỹ trước khi sang bước 2 ' +
               '— đừng mang một cảnh báo chưa hiểu vào phần đo thời gian, nơi bạn cần tin vào số đo chứ ' +
               'không phải đoán xem chương trình có đang làm đúng hay không.</p>' },

          { t: 'cal', kind: 'tip', title: 'Một Makefile ba dòng đỡ mỏi tay',
            x: '<p>Bài 16 đã dạy quy tắc mẫu. Đặt file <code>Makefile</code> với nội dung ' +
               '<code>CFLAGS = -Wall -Wextra -O2</code>, <code>LDLIBS =</code> và ' +
               '<code>all: tcp_server tcp_client select_server poll_server epoll_server udp_server ' +
               'udp_client ...</code> rồi chỉ cần gõ <code>make</code>. Riêng daemon ở bước 6 cần ' +
               'thêm <code>-pthread</code>, khai báo bằng một dòng ' +
               '<code>temp_daemon: LDFLAGS += -pthread</code>.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Máy chủ TCP đầu tiên, và nhìn nó bằng ss',
        blocks: [
          { t: 'p', x:
            'Chạy máy chủ ở nền, cho nó 0,4 giây để kịp <code>bind</code> và ' +
            '<code>listen</code>, rồi cho máy khách nối vào. Đây là toàn bộ vòng đời của một ' +
            'kết nối TCP, gói trong một dòng lệnh.' },

          { t: 'code', where: 'wsl', code:
            './tcp_server 1 & sleep 0.4; ./tcp_client 127.0.0.1 9000; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[server] listen fd = 3, waiting for clients on port 9000\n' +
            '[client] connected to 127.0.0.1:9000, fd = 3\n' +
            '[server] client 127.0.0.1:42404  ->  new fd = 4\n' +
            '[server] received 16 bytes: GET TEMPERATURE\n' +
            '[client] reply: temperature 42.5 C\n' +
            '[server] closed fd 4\n' },

          { t: 'cal', kind: 'info', title: 'Đọc lại đúng ba con số đã học ở phần lý thuyết',
            x: '<p>Đây là lần đầu <i>bạn</i> tự chạy đúng trình tự <code>socket → bind → listen → ' +
               'accept</code>, không chỉ đọc mã người khác viết. Ba con số cần khớp với phần lý ' +
               'thuyết ở trên: <b>listen fd = 3</b> (socket nghe, lấy đúng số nhỏ nhất còn trống sau ' +
               '0/1/2), <b>new fd = 4</b> (mô tả file <i>riêng</i> mà <code>accept()</code> sinh ra ' +
               'cho khách này — <code>listen_fd</code> vẫn còn đó để nghe khách sau), và ' +
               '<b>received 16 bytes</b> — đúng bằng độ dài chuỗi <code>"GET TEMPERATURE\\n"</code> ' +
               '(15 ký tự cộng 1 ký tự xuống dòng).</p>' +
               '<p>Cổng tạm lần này là <b>42404</b>, khác với <b>42392</b> ở ví dụ trong phần lý ' +
               'thuyết. Đó không phải sai lệch — nhân cấp một cổng mới từ dải 32768–60999 mỗi lần ' +
               '<code>connect()</code>, nên số này sẽ khác cả trên máy bạn lẫn giữa các lần bạn chạy ' +
               'lại chính lệnh trên.</p>' },

          { t: 'p', x:
            'Bây giờ nhìn socket nghe từ bên ngoài. Chạy lại máy chủ ở nền rồi hỏi hệ thống ' +
            'xem ai đang giữ cổng 9000:' },

          { t: 'code', where: 'wsl', code:
            './tcp_server 1 >/dev/null 2>&1 & sleep 0.4\n' +
            'ss -tlnp | grep \':9000\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'LISTEN 0      16            0.0.0.0:9000      0.0.0.0:*    users:(("tcp_server",pid=1331,fd=3))\n' },

          { t: 'cmdx', cmd: 'ss -tlnp', title: 'Đọc từng cột',
            rows: [
              ['-t', 'Chỉ TCP', 'Đổi thành <code>-u</code> cho UDP, <code>-x</code> cho Unix socket của Bài 23'],
              ['-l', 'Chỉ socket đang <b>nghe</b>', 'Bỏ <code>-l</code> đi để thấy cả kết nối đang mở và cả <code>TIME-WAIT</code>'],
              ['-n', 'Không tra tên dịch vụ', 'Không có nó, 9000 sẽ hiện thành <code>cslistener</code> — vô ích và chậm'],
              ['-p', 'Hiện tiến trình đang giữ socket', 'Đây là cột quý nhất khi gỡ lỗi: nó nối thẳng cổng ↔ pid ↔ fd'],
              ['LISTEN 0 16', 'Hàng đợi đang có <b>0</b>, sức chứa <b>16</b>', 'Đúng bằng đối số <code>listen(listen_fd, 16)</code> trong mã'],
              ['0.0.0.0:9000', 'Nghe trên <b>mọi</b> giao diện', 'Hệ quả trực tiếp của <code>INADDR_ANY</code>. Muốn chỉ loopback thì dùng <code>inet_pton(AF_INET, "127.0.0.1", …)</code>'],
              ['fd=3', 'Socket nghe là mô tả file số 3 của tiến trình', 'Khớp với dòng <code>listen fd = 3</code> chương trình tự in ra']
            ]},

          { t: 'cal', kind: 'info', title: 'ss là công cụ bạn sẽ dùng nhiều nhất',
            x: '<p><code>ss</code> ("socket statistics") thay cho <code>netstat</code> cũ và ' +
               'đọc thẳng từ netlink nên nhanh hơn nhiều. Trên board nhúng chạy BusyBox ' +
               '(Chặng 09) có thể chỉ có <code>netstat</code> — cú pháp gần như y hệt: ' +
               '<code>netstat -tlnp</code>.</p>' +
               '<p>Nhớ <code>pkill -f tcp_server</code> để dọn tiến trình nền trước khi sang bước ' +
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
            './boundary_server & sleep 0.4; ./boundary_client 0; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[client] write() call 1 sent 11 bytes\n' +
            '[client] write() call 2 sent 11 bytes\n' +
            '[client] write() call 3 sent 11 bytes\n' +
            '[server] read() call 1 returned 33 bytes: "meas1:41.5|meas2:42.0|meas3:42.5|"\n' +
            '[server] read() returned 0 -> client closed. Total read() calls = 1\n' },

          { t: 'cal', kind: 'warn', title: 'Lần chạy này ra 1 — còn xa hơn cả 2 của phần lý thuyết',
            x: '<p>Ba <code>write()</code>, nhưng chỉ <b>một</b> <code>read()</code> duy nhất, gộp ' +
               'đủ cả 33 byte. Nếu bạn chỉ chạy đúng một lần, bạn sẽ đoán ngược lại hoàn toàn so ' +
               'với niềm tin "mỗi write là một read" — và cả hai phỏng đoán đều sai như nhau.</p>' +
               '<p>Hãy chạy lại lệnh trên khoảng chục lần liên tiếp. Trên chính máy này, kết quả ' +
               'dao động giữa <b>1</b> lần <code>read</code> (gộp cả ba), <b>2</b> lần (11 rồi ' +
               '<b>22</b> byte — đúng như phần lý thuyết đã cho), và rất hiếm khi đủ <b>3</b>. Ba ' +
               'lệnh <code>write()</code> liên tiếp trên loopback của WSL2 cách nhau chỉ vài micro ' +
               'giây, đủ ngắn để nhân gần như luôn kịp gộp ít nhất hai gói trước khi tiến trình ' +
               'đọc được lập lịch trở lại.</p>' +
               '<p>Kết quả phụ thuộc vào việc nhân <i>kịp</i> chuyển gói đi trước khi lệnh ghi sau ' +
               'tới hay không, tức là phụ thuộc vào lịch chạy của CPU, tải máy và độ trễ đường ' +
               'truyền — kể cả khi "đường truyền" chỉ là loopback nội bộ. <b>Một lỗi chỉ xuất ' +
               'hiện ngoài hiện trường là loại lỗi đắt nhất.</b></p>' },

          { t: 'p', x: 'Giờ làm y hệt bằng UDP:' },

          { t: 'code', where: 'wsl', code:
            './udp_server 256 & sleep 0.4; ./udp_client; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[udp] waiting for packets on port 9002, recv buffer = 256 bytes\n' +
            '[udp] recvfrom() call 1: 10 bytes from 127.0.0.1:41115 -> "meas1:41.5"\n' +
            '[client] sendto() call 1 sent 10 bytes, no connect() needed\n' +
            '[client] sendto() call 2 sent 10 bytes, no connect() needed\n' +
            '[client] sendto() call 3 sent 10 bytes, no connect() needed\n' +
            '[udp] recvfrom() call 2: 10 bytes from 127.0.0.1:41115 -> "meas2:42.0"\n' +
            '[udp] recvfrom() call 3: 10 bytes from 127.0.0.1:41115 -> "meas3:42.5"\n' },

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
            './sequential_server 2 & sleep 0.4; ./slow_client 2000 & sleep 0.3; ./probe_client; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[sequential] listening on port 9004\n' +
            '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
            '[slow] connected, deliberately silent for 2000 ms\n' +
            '[sequential] replied to fd 4\n' +
            '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
            '[sequential] replied to fd 4\n' +
            '[slow] reply: temperature 42.5 C\n' +
            '[probe] waited 1697.7 ms to get a reply\n' },

          { t: 'code', where: 'wsl', code:
            './select_server 2 & sleep 0.4; ./slow_client 2000 & sleep 0.3; ./probe_client; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[select] listening on port 9004\n' +
            '[select] new client fd 4 — still watching every channel\n' +
            '[slow] connected, deliberately silent for 2000 ms\n' +
            '[select] new client fd 5 — still watching every channel\n' +
            '[select] replied to fd 5\n' +
            '[probe] waited 0.3 ms to get a reply\n' +
            '[select] replied to fd 4\n' +
            '[slow] reply: temperature 42.5 C\n' +
            '[select] served 2 clients, done\n' },

          { t: 'p', x:
            '<b>1697,7 ms</b> so với <b>0,3 ms</b>. Hai chương trình cùng một luồng, cùng một ' +
            'CPU, cùng một kịch bản; khác nhau đúng ở chỗ một cái gọi <code>accept</code> rồi ' +
            '<code>read</code> theo lối chặn, còn cái kia hỏi <code>select</code> trước.' },

          { t: 'p', x:
            'Chạy tiếp bản <code>poll</code>. Kết quả lần chạy này khác hẳn hai lần trước, và ' +
            'nó dạy bạn một điều về đo đạc:' },

          { t: 'code', where: 'wsl', code:
            './poll_server 2 & sleep 0.4; ./slow_client 2000 & sleep 0.3; ./probe_client; wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[poll] listening on port 9004, pollfd array has 16 slots\n' +
            '[slow] connected, deliberately silent for 2000 ms\n' +
            '[poll] new client fd 4, now watching 2 channels\n' +
            '[poll] new client fd 5, now watching 3 channels\n' +
            '[poll] replied to fd 5\n' +
            '[probe] waited 1.3 ms to get a reply\n' +
            '[poll] replied to fd 4\n' +
            '[poll] served 2 clients, done\n' +
            '[slow] reply: temperature 42.5 C\n' },

          { t: 'cal', kind: 'warn', title: '1,3 ms không có nghĩa là poll chậm hơn select 4 lần',
            x: '<p>Ở phần lý thuyết, cùng chương trình này đo được <b>0,3 ms</b>. Lần chạy trên ' +
               'ra <b>1,3 ms</b>. Chênh lệch đó <i>không</i> đến từ <code>poll</code> — nó đến ' +
               'từ bộ lập lịch: khoảng thời gian tiến trình <code>probe_client</code> phải chờ để ' +
               'được cấp CPU sau khi dữ liệu đã sẵn sàng.</p>' +
               '<p><b>Bài học đo đạc:</b> ở thang mili giây, một phép đo đơn lẻ nói lên rất ít. ' +
               'Cái đáng tin trong bảng số này là <b>bậc độ lớn</b> — 1700 ms so với "dưới ' +
               '2 ms" — chứ không phải chữ số thập phân. Muốn so <code>select</code> với ' +
               '<code>poll</code> cho ra kết quả có nghĩa, bạn phải lặp hàng nghìn lần và lấy ' +
               'trung bình. Đó chính xác là cái <code>io_bench</code> làm ở bước sau.</p>' +
               '<p>Hãy chạy mỗi lệnh trên vài lần. Bạn sẽ thấy cột "tuần tự" luôn quanh 1700 ms ' +
               '— vì nó bị chặn <i>bởi thiết kế</i>, không phải bởi may rủi.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Đo sức ba cơ chế trên 500 kênh',
        blocks: [
          { t: 'p', x:
            'Bước 4 đo <i>độ trễ do thiết kế sai</i>. Bước này đo <i>chi phí của chính cơ chế ' +
            'chờ</i>. <code>io_bench</code> mở N pipe, theo dõi hết, rồi lặp 10 000 lần: đánh ' +
            'thức đúng một kênh và đo thời gian trung bình mỗi lời gọi.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o io_bench io_bench.c\n' +
            './io_bench 500' },

          { t: 'code', where: 'out', nocopy: true, code:
            'N = 500   channels, highest read fd = 1002  (FD_SETSIZE = 1024)\n' +
            '  select :   68.66 us/call\n' +
            '  poll   :   68.93 us/call\n' +
            '  epoll  :    0.94 us/call\n' },

          { t: 'p', x:
            'Lặp lại với <code>./io_bench 10</code>, <code>100</code> và <code>2000</code>. ' +
            'Bạn sẽ dựng lại được đúng bảng ở phần lý thuyết — và ở N = 2000, chương trình sẽ ' +
            'từ chối chạy <code>select</code>, vì fd lớn nhất là <b>4002</b> còn ' +
            '<code>FD_SETSIZE</code> là <b>1024</b>.' },

          { t: 'cal', kind: 'why', title: 'Vì sao 500 kênh chỉ tốn 0,94 µs với epoll',
            x: '<p>Vì <code>epoll_wait</code> không hỏi "trong 500 kênh này, cái nào sẵn ' +
               'sàng?". Nhân đã tự duy trì một danh sách <i>đã sẵn sàng</i> từ trước: mỗi lần ' +
               'dữ liệu tới một pipe, chính thao tác ghi đó móc pipe vào danh sách. ' +
               '<code>epoll_wait</code> chỉ việc lấy phần tử đầu danh sách ra và trả về.</p>' +
               '<p>Con số <b>0,94 µs</b> = <b>940 ns</b> nằm cùng bậc với chi phí tối thiểu của ' +
               'một lần vào/ra nhân — Bài 19 đo một syscall trần trụi hết <b>139–317 ns</b>. ' +
               'Nghĩa là <code>epoll</code> gần như không thêm gì lên trên cái giá bắt buộc ' +
               'phải trả. Còn gần 69 µs của <code>select</code>/<code>poll</code> là 500 lần ' +
               'kiểm tra, mỗi lần một chút, cộng lại.</p>' +
               '<p><b>select 68,66 µs</b> và <b>poll 68,93 µs</b> ở lần chạy này gần như bằng ' +
               'nhau — đúng tinh thần "nhìn cột epoll theo chiều dọc, đừng so <code>select</code> ' +
               'với <code>poll</code> theo chiều ngang" mà phần lý thuyết đã nói. Cả hai đều cao ' +
               'hơn đôi chút so với bảng lý thuyết (<b>63,71</b> và <b>59,32 µs</b>) — chênh lệch ' +
               'đó là dao động giữa các lần đo ở thang micro giây, cùng loại nhiễu bạn vừa thấy ở ' +
               'bước 4 với con số 1,3 ms, không phải bằng chứng cho một cơ chế nào khác nhau giữa ' +
               'hai lần chạy.</p>' }
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
              ['<code>pthread_create</code> + mutex', 'Bài 22', 'Luồng <code>sensor_thread</code> cập nhật <code>state.temperature</code> mỗi 200 ms'],
              ['<code>pthread_sigmask</code> + <code>signalfd</code>', 'Bài 21', 'Biến <code>SIGTERM</code> thành một fd, để nó xếp hàng cùng socket'],
              ['<code>socket</code>/<code>bind</code>/<code>listen</code>', 'Bài này', 'Cổng 9006, hàng đợi 64'],
              ['<code>epoll</code> + <code>O_NONBLOCK</code>', 'Bài này', 'Một luồng phục vụ mọi khách, không chặn ở đâu'],
              ['Vòng ghi tới khi đủ byte', 'Bài này', 'Chống ghi thiếu — <code>write</code> có thể trả về ít hơn số xin']
            ]},

          { t: 'code', where: 'file', name: 'temp_daemon.c — phần khởi tạo', lang: 'c', code:
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
            '#define PORT       9006\n' +
            '#define MAX_EVENTS 32\n' +
            '\n' +
            'static struct {\n' +
            '    pthread_mutex_t lock;\n' +
            '    double          temperature;\n' +
            '    unsigned long   sample_count;\n' +
            '} state = { PTHREAD_MUTEX_INITIALIZER, 0.0, 0 };\n' +
            '\n' +
            'static volatile sig_atomic_t running = 1;\n' +
            '\n' +
            'static void *sensor_thread(void *arg)\n' +
            '{\n' +
            '    (void)arg;\n' +
            '    unsigned long i = 0;\n' +
            '    while (running) {\n' +
            '        double d = 40.0 + (double)(i % 50) / 10.0;\n' +
            '        pthread_mutex_lock(&state.lock);\n' +
            '        state.temperature  = d;\n' +
            '        state.sample_count = ++i;\n' +
            '        pthread_mutex_unlock(&state.lock);\n' +
            '        usleep(200000);                   /* 5 samples per second */\n' +
            '    }\n' +
            '    return NULL;\n' +
            '}\n' +
            '\n' +
            'static int set_nonblocking(int fd)\n' +
            '{\n' +
            '    int flags = fcntl(fd, F_GETFL);\n' +
            '    if (flags == -1) return -1;\n' +
            '    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    signal(SIGPIPE, SIG_IGN);             /* early client close != killing the daemon */\n' +
            '\n' +
            '    sigset_t mask;\n' +
            '    sigemptyset(&mask);\n' +
            '    sigaddset(&mask, SIGTERM);\n' +
            '    sigaddset(&mask, SIGINT);\n' +
            '    if (pthread_sigmask(SIG_BLOCK, &mask, NULL)) { perror("pthread_sigmask"); exit(1); }\n' +
            '    int sig_fd = signalfd(-1, &mask, SFD_CLOEXEC);\n' +
            '    if (sig_fd == -1) { perror("signalfd"); exit(1); }\n' +
            '\n' +
            '    pthread_t thread;\n' +
            '    if (pthread_create(&thread, NULL, sensor_thread, NULL)) { perror("pthread_create"); exit(1); }\n' +
            '\n' +
            '    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);\n' +
            '    if (listen_fd == -1) { perror("socket"); exit(1); }\n' +
            '    int one = 1;\n' +
            '    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);\n' +
            '    struct sockaddr_in addr;\n' +
            '    memset(&addr, 0, sizeof addr);\n' +
            '    addr.sin_family      = AF_INET;\n' +
            '    addr.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
            '    addr.sin_port        = htons(PORT);\n' +
            '    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
            '    if (listen(listen_fd, 64) == -1) { perror("listen"); exit(1); }\n' +
            '    set_nonblocking(listen_fd);            /* MANDATORY: accept() runs in a loop */\n' +
            '\n' +
            '    int epoll_fd = epoll_create1(EPOLL_CLOEXEC);\n' +
            '    if (epoll_fd == -1) { perror("epoll_create1"); exit(1); }\n' +
            '    struct epoll_event ev;\n' +
            '    ev.events = EPOLLIN; ev.data.fd = listen_fd;\n' +
            '    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, listen_fd, &ev) == -1) { perror("epoll_ctl listen_fd"); exit(1); }\n' +
            '    ev.events = EPOLLIN; ev.data.fd = sig_fd;\n' +
            '    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, sig_fd, &ev) == -1) { perror("epoll_ctl sig_fd"); exit(1); }\n' +
            '\n' +
            '    printf("[daemon] pid %d — listening on port %d, epoll fd %d, signalfd %d\\n",\n' +
            '           getpid(), PORT, epoll_fd, sig_fd);\n' +
            '    fflush(stdout);\n',
            notes: [
              'Hai fd hoàn toàn khác bản chất — một socket nghe và một nguồn tín hiệu — được nạp vào cùng một tập <code>epoll</code>. Đây chính là giá trị lớn nhất của triết lý "mọi thứ là file" mà Bài 19 mở đầu.',
              '<code>signal(SIGPIPE, SIG_IGN)</code> phải có. Nếu khách đóng kết nối trước khi daemon kịp trả lời, <code>write()</code> sẽ sinh <code>SIGPIPE</code> và mặc định tín hiệu này <b>giết tiến trình</b>. Bỏ qua nó thì <code>write()</code> chỉ trả về <code>EPIPE</code> — một lỗi bình thường xử lý được.'
            ]},

          { t: 'code', where: 'file', name: 'temp_daemon.c — vòng lặp chính', lang: 'c', code:
            '    unsigned long served = 0;\n' +
            '    struct epoll_event events[MAX_EVENTS];\n' +
            '    while (running) {\n' +
            '        int n = epoll_wait(epoll_fd, events, MAX_EVENTS, -1);\n' +
            '        if (n == -1) { if (errno == EINTR) continue; perror("epoll_wait"); break; }\n' +
            '\n' +
            '        for (int i = 0; i < n; i++) {\n' +
            '            int fd = events[i].data.fd;\n' +
            '\n' +
            '            if (fd == sig_fd) {                    /* --- SIGNAL --- */\n' +
            '                struct signalfd_siginfo info;\n' +
            '                if (read(sig_fd, &info, sizeof info) != (ssize_t)sizeof info) continue;\n' +
            '                printf("[daemon] signal %u (%s) via signalfd — beginning graceful shutdown\\n",\n' +
            '                       info.ssi_signo, strsignal((int)info.ssi_signo));\n' +
            '                running = 0;\n' +
            '\n' +
            '            } else if (fd == listen_fd) {          /* --- NEW CLIENT --- */\n' +
            '                for (;;) {                         /* accept until EAGAIN */\n' +
            '                    int conn_fd = accept(listen_fd, NULL, NULL);\n' +
            '                    if (conn_fd == -1) {\n' +
            '                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;\n' +
            '                        perror("accept"); break;\n' +
            '                    }\n' +
            '                    set_nonblocking(conn_fd);\n' +
            '                    struct epoll_event e2;\n' +
            '                    e2.events = EPOLLIN; e2.data.fd = conn_fd;\n' +
            '                    epoll_ctl(epoll_fd, EPOLL_CTL_ADD, conn_fd, &e2);\n' +
            '                }\n' +
            '\n' +
            '            } else {                               /* --- REQUEST --- */\n' +
            '                char req[128];\n' +
            '                ssize_t r = read(fd, req, sizeof req - 1);\n' +
            '                if (r <= 0) {\n' +
            '                    epoll_ctl(epoll_fd, EPOLL_CTL_DEL, fd, NULL);\n' +
            '                    close(fd);\n' +
            '                    continue;\n' +
            '                }\n' +
            '                double temp; unsigned long count;\n' +
            '                pthread_mutex_lock(&state.lock);   /* hold the lock for 2 lines only */\n' +
            '                temp = state.temperature; count = state.sample_count;\n' +
            '                pthread_mutex_unlock(&state.lock);\n' +
            '\n' +
            '                char reply[128];\n' +
            '                int len = snprintf(reply, sizeof reply, "temperature=%.1f samples=%lu\\n", temp, count);\n' +
            '                int written = 0;\n' +
            '                while (written < len) {            /* write UNTIL enough bytes */\n' +
            '                    ssize_t k = write(fd, reply + written, (size_t)(len - written));\n' +
            '                    if (k == -1) {\n' +
            '                        if (errno == EAGAIN || errno == EWOULDBLOCK) continue;\n' +
            '                        perror("write"); break;\n' +
            '                    }\n' +
            '                    written += (int)k;\n' +
            '                }\n' +
            '                served++;\n' +
            '                printf("[daemon] served request #%lu on fd %d\\n", served, fd);\n' +
            '                fflush(stdout);\n' +
            '                epoll_ctl(epoll_fd, EPOLL_CTL_DEL, fd, NULL);\n' +
            '                close(fd);\n' +
            '            }\n' +
            '        }\n' +
            '    }\n' +
            '\n' +
            '    pthread_join(thread, NULL);\n' +
            '    close(listen_fd); close(sig_fd); close(epoll_fd);\n' +
            '    printf("[daemon] served %lu requests, closed every file descriptor cleanly, exiting 0\\n", served);\n' +
            '    return 0;\n' +
            '}\n',
            notes: [
              'Vòng <code>accept</code> chạy tới khi gặp <code>EAGAIN</code>, không phải một lần. Nếu ba khách tới cùng lúc, <code>epoll</code> chỉ báo <b>một</b> sự kiện trên <code>listen_fd</code>; <code>accept</code> một lần thì hai khách còn lại nằm chờ trong hàng đợi cho tới sự kiện kế tiếp — có thể là mãi mãi.',
              'Mutex chỉ ôm đúng hai dòng gán. Bài 22 gọi đây là giữ vùng găng ngắn nhất có thể: luồng đo không bao giờ phải chờ một lệnh <code>write()</code> lên mạng.'
            ]},

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -pthread -o temp_daemon temp_daemon.c\n' +
            './temp_daemon & DP=$!\n' +
            'sleep 0.5; ss -tlnp | grep 9006\n' +
            'for i in 1 2 3 4 5; do echo GET | nc -q1 127.0.0.1 9006; sleep 0.3; done\n' +
            'echo "--- open file descriptors ---"\n' +
            'ls /proc/$DP/fd | tr "\\n" " "; echo\n' +
            'kill -TERM $DP; wait $DP; echo "exit code = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'compiled daemon: 0 warnings\n' +
            '[daemon] pid 436 — listening on port 9006, epoll fd 5, signalfd 3\n' +
            'LISTEN 0      64            0.0.0.0:9006      0.0.0.0:*    users:(("temp_daemon",pid=436,fd=4))\n' +
            '[daemon] served request #1 on fd 6\n' +
            'temperature=40.2 samples=3\n' +
            '[daemon] served request #2 on fd 6\n' +
            'temperature=40.9 samples=10\n' +
            '[daemon] served request #3 on fd 6\n' +
            'temperature=41.5 samples=16\n' +
            '[daemon] served request #4 on fd 6\n' +
            'temperature=42.2 samples=23\n' +
            '[daemon] served request #5 on fd 6\n' +
            'temperature=42.8 samples=29\n' +
            '--- open file descriptors ---\n' +
            '0 1 2 3 4 5 \n' +
            '[daemon] signal 15 (Terminated) via signalfd — beginning graceful shutdown\n' +
            '[daemon] served 5 requests, closed every file descriptor cleanly, exiting 0\n' +
            'exit code = 0\n' },

          { t: 'cmdx', cmd: 'echo GET | nc -q1 127.0.0.1 9006',
            title: 'nc — dò một máy chủ TCP từ dòng lệnh, không cần viết client riêng',
            rows: [
              ['nc', 'Netcat, xuất hiện lần đầu trong khoá học: mở một kết nối TCP/UDP từ dòng lệnh ' +
               'rồi nối <code>stdin</code>/<code>stdout</code> với nó — dùng để dò nhanh một máy chủ ' +
               'mà không cần biên dịch một <code>tcp_client</code> riêng',
               'Bản trên máy này là <code>netcat-openbsd</code>; cờ có thể khác trên bản GNU hay ' +
               'BusyBox <code>nc</code> thường thấy trên rootfs nhúng ở <b>Chặng 09</b>'],
              ['echo GET |', 'Gửi đúng chuỗi <code>"GET\\n"</code> làm toàn bộ dữ liệu client gửi',
               'Daemon không phân biệt "GET" với "GET TEMPERATURE" vì vòng đọc của nó chỉ cần ' +
               '<code>read()</code> trả về nhiều hơn 0 byte — nội dung yêu cầu không hề được kiểm tra'],
              ['127.0.0.1 9006', 'Cú pháp <code>nc &lt;host&gt; &lt;port&gt;</code>: địa chỉ và cổng ' +
               'của daemon vừa khởi động', ''],
              ['-q1', 'Sau khi <code>stdin</code> gặp EOF (khi <code>echo</code> đã ghi xong và ' +
               'đóng ống), đợi thêm <b>1 giây</b> rồi tự đóng kết nối và thoát',
               'Không có <code>-q</code>, <code>nc</code> mặc định treo chờ vô thời hạn sau khi ' +
               'stdin đóng — script sẽ không bao giờ chạy tới vòng lặp kế tiếp. Các dòng ' +
               '<code>temperature=... samples=...</code> trong output chính là những gì <code>nc</code> ' +
               'nhận về từ daemon rồi in ra trước khi thoát']
            ]},

          { t: 'cal', kind: 'info', title: 'Ba bằng chứng nằm trong output này',
            x: '<ul>' +
               '<li><b>Luồng đo chạy độc lập.</b> Năm yêu cầu cách nhau 0,3 s cho ' +
               '<code>samples=3, 10, 16, 23, 29</code> — tăng đều 6–7 mẫu, đúng nhịp 200 ms. Luồng ' +
               'không hề bị vòng <code>epoll</code> làm chậm, và ngược lại.</li>' +
               '<li><b>Không rò mô tả file.</b> <code>/proc/436/fd</code> chỉ có ' +
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
               '<li>Thay <code>epoll_wait(epoll_fd, events, MAX_EVENTS, -1)</code> bằng thời hạn ' +
               '<code>1500</code> và in một dòng nhịp tim mỗi lần hết giờ. Đó là khung của mọi ' +
               'daemon có watchdog.</li>' +
               '<li>Bỏ <code>set_nonblocking(listen_fd)</code> đi rồi mở hai kết nối cùng lúc bằng ' +
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
         'Kiểm tra bằng <code>ss -tln</code>. In <code>ntohs(addr.sin_port)</code> ra để xác nhận số cổng thật sự gửi đi'],

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
         'Luôn lặp: <code>while (written &lt; len) { k = write(fd, buf+written, len-written); … written += k; }</code>. Đúng cho cả chế độ chặn lẫn không chặn'],

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
         '<code>set_nonblocking(listen_fd)</code> ngay sau <code>listen()</code>, rồi thoát vòng lặp khi <code>accept</code> trả <code>EAGAIN</code>'],

        ['<i>Không lỗi:</i> máy chủ tuần tự "chạy đúng" trên bàn làm việc, chết ngoài hiện trường',
         'Kịch bản test chỉ có một khách. Một khách chậm là đủ chặn tất cả — đã đo <b>1697,7 ms</b>',
         'Luôn test với ít nhất hai khách, trong đó một cái cố tình im lặng vài giây, đúng như <code>slow_client</code> ở bước 4']
      ]},

    /* ══════════════════════════════════════════════
       14. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 24', items: [
      'Socket là <b>mô tả file</b> nhưng không có tên trong hệ thống file: nó được định danh bằng <b>địa chỉ IP + số cổng</b>, nên nói được tới máy khác. Vì vẫn là fd, nó dùng chung <code>read</code>/<code>write</code>/<code>close</code>/<code>epoll</code> với mọi thứ khác.',
      'Máy chủ đi <code>socket → bind → listen → accept</code>, máy khách đi <code>socket → connect</code>. <code>accept()</code> trả về một fd <b>mới</b> cho từng khách; fd nghe vẫn giữ nguyên vai trò nghe.',
      'Mọi số nhiều byte đặt vào <code>struct sockaddr_in</code> phải qua <code>htons</code>/<code>htonl</code>. Quên nó thì cổng <b>9000</b> (<code>0x2328</code>) thành <b>10275</b> (<code>0x2823</code>), và bạn nhận <code>Connection refused</code>.',
      '<code>SO_REUSEADDR</code> cho phép <code>bind</code> lại cổng trong lúc kết nối cũ còn ở <code>TIME-WAIT</code>. Không có nó, <b>3/3</b> lần thử khởi động lại đều cho <code>Address already in use</code>.',
      'TCP là <b>dòng byte</b>: 3 lần <code>write</code> 11 byte có thể thành 2 lần <code>read</code> — 11 rồi <b>22</b>. Ranh giới thông điệp là việc của bạn: ký tự phân cách, tiền tố độ dài, hoặc bản ghi cố định.',
      'UDP giữ ranh giới gói nhưng không hứa gì: gói tới cổng không ai nghe vẫn <code>sendto</code> thành công <b>3/3</b>, còn TCP <code>connect</code> báo <code>Connection refused</code> ngay. Bộ đệm nhỏ hơn gói thì phần dư bị vứt <b>không báo lỗi</b>.',
      'Đo trên loopback, 10 000 lượt khứ hồi 16 byte: TCP <b>71,08 µs</b>, UDP <b>58,91 µs</b> — UDP nhanh hơn khoảng <b>15 %</b>, mất gói <b>0/10000</b>. Con số này quá nhỏ để đánh đổi lấy độ tin cậy trên mạng thật.',
      'Máy chủ một luồng kiểu chặn bị một khách im lặng làm tê liệt: <b>1695,7 ms</b> so với <b>0,5 ms</b> của bản <code>select</code> — chênh khoảng <b>3400 lần</b>, cùng CPU, cùng kịch bản.',
      '<code>select</code> bị chặn cứng ở <code>FD_SETSIZE</code> = <b>1024</b>. Vượt qua là <code>abort()</code>, thoát <b>134</b> — không phải hỏng bộ nhớ âm thầm như tài liệu cũ hay nói.',
      '<code>poll</code> bỏ giới hạn 1024 và tách <code>events</code> khỏi <code>revents</code> nên không phải dựng lại tập mỗi vòng, nhưng vẫn là <b>O(n)</b>.',
      '<code>epoll</code> là <b>O(1)</b>: 1,31 → 0,85 → 0,90 → <b>0,72 µs</b> khi số kênh tăng từ 10 lên 2000. Cùng lúc đó <code>poll</code> đi từ 2,61 lên <b>286,54 µs</b>. Ở 2000 kênh, epoll nhanh hơn <b>398×</b>.',
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
      why: '<code>TIME-WAIT</code> là trạng thái của <i>kết nối</i>, không phải của tiến trình, nên <code>ss -tlnp</code> với cờ <code>-l</code> (chỉ socket đang nghe) không thấy nó — phải bỏ <code>-l</code> hoặc dùng <code>ss -tan</code>. Nhân giữ cặp địa chỉ khoảng 60 giây để những gói lạc của kết nối cũ không lọt vào kết nối mới trùng cổng. Cách xử lý là <code>SO_REUSEADDR</code>, đặt <b>trước</b> <code>bind</code>; trong bài, không có nó thì 3/3 lần thử đều thất bại, có nó thì bind lại được ngay.' },

    { q: 'Vì sao chi phí mỗi lời gọi <code>epoll_wait</code> gần như không đổi khi số kênh tăng từ 10 lên 2000, trong khi <code>poll</code> đi từ 2,61 µs lên 286,54 µs?',
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
      why: 'Đây là bài toán mà mất mát rẻ hơn chờ đợi. Với TCP, một gói mất sẽ khiến toàn bộ dòng byte <b>dừng lại</b> chờ truyền lại — số đo cũ chặn đường số đo mới, và độ trễ tích tụ đúng thứ bạn không chấp nhận được. Với UDP, mẫu mất thì mẫu kế tiếp tới sau 200 ms là xong. Chỉ số RTT đo được (58,91 µs so với 71,08 µs) <b>không</b> phải lý do chính — chênh 15 % trên loopback là quá nhỏ. Lý do là ngữ nghĩa: dữ liệu có vòng đời ngắn thì truyền lại một mẫu đã cũ là vô nghĩa. Đáp án 4 sai vì Unix domain socket không đi ra khỏi một máy, như Bài 23 đã chỉ rõ.' }
  ]
});

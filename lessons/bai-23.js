/* ═══════════════════════════════════════════════════════════════
   BÀI 23 — Giao tiếp liên tiến trình (IPC)
   Chặng 03 · Lập trình hệ thống Linux
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-23',
  title: 'Giao tiếp liên tiến trình (IPC)',
  minutes: 65,
  practice: 'Thực hành 50 phút',
  level: 'Trung cấp',

  intro:
    'Bài 22 kết thúc bằng một lời khuyên dứt khoát: trong nhúng, hãy mặc định chọn ' +
    '<b>tiến trình</b> chứ không phải luồng, vì tiến trình có ranh giới lỗi thật do MMU cưỡng ' +
    'chế. Nhưng lời khuyên đó lập tức đẻ ra một vấn đề. Nếu hai tiến trình không dùng chung ' +
    'một byte nào — và đó chính là điều làm nên giá trị của chúng — thì làm sao tiến trình đọc ' +
    'cảm biến báo cho tiến trình gửi mạng biết nhiệt độ vừa đo được là bao nhiêu? ' +
    'Bài này trả lời bằng năm cơ chế mà nhân Linux cung cấp, và quan trọng hơn: bạn sẽ ' +
    '<b>đo</b> chúng để biết cơ chế nào nhanh gấp bao nhiêu lần cơ chế nào, rồi rút ra một ' +
    'bảng chọn dùng được cho mọi dự án về sau.',

  goals: [
    'Giải thích được vì sao MMU khiến hai tiến trình không thể chỉ đơn giản đọc biến của nhau',
    'Dùng <code>pipe()</code> với <code>fork()</code>, và biết vì sao mỗi bên phải đóng đầu ống không dùng',
    'Tạo FIFO bằng <code>mkfifo</code> để hai chương trình không họ hàng nói chuyện với nhau',
    'Lập một vùng bộ nhớ chia sẻ POSIX bằng <code>shm_open</code> + <code>ftruncate</code> + <code>mmap</code>',
    'Dùng hàng đợi thông điệp <code>mq_*</code> và chứng minh rằng thông điệp ưu tiên cao vượt lên trước',
    'Đo thông lượng của bốn cơ chế và giải thích chênh lệch bằng số syscall thực tế',
    'Chọn đúng cơ chế cho từng tình huống, và biết bộ nhớ chia sẻ kéo theo nghĩa vụ tự đồng bộ'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VÌ SAO CẦN IPC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bức tường mà chính bạn đã dựng lên' },

    { t: 'p', x:
      'Ở Bài 20 bạn dùng <code>fork()</code> và thấy tiến trình con nhận một <i>bản sao</i> của ' +
      'mọi biến. Sửa biến trong con, cha không hề hay biết. Lúc đó điều này có vẻ chỉ là một ' +
      'chi tiết kỹ thuật thú vị. Ở Bài 22 nó trở thành lý lẽ mạnh nhất để chọn tiến trình: ' +
      '<code>conchet</code> sập mà cha vẫn in đủ 3/3 dòng và thoát mã <b>0</b>, trong khi ' +
      '<code>luongchet</code> kéo cả tiến trình xuống mồ với mã <b>139</b>.' },

    { t: 'p', x:
      'Bức tường đó không phải quy ước phần mềm, không phải thoả thuận giữa các lập trình ' +
      'viên lịch sự. Nó là <b>phần cứng</b>. Đơn vị quản lý bộ nhớ (MMU) dịch địa chỉ ảo sang ' +
      'địa chỉ vật lý bằng bảng trang riêng của từng tiến trình. Địa chỉ ' +
      '<code>0x5555a4c01000</code> trong tiến trình A và cùng con số đó trong tiến trình B trỏ ' +
      'tới hai khung trang vật lý hoàn toàn khác nhau. Không có mẹo lập trình nào phá được — ' +
      'thử ghi vào bộ nhớ của tiến trình khác thì bạn nhận <code>SIGSEGV</code>, đúng như ' +
      '<code>luongchet</code> đã minh hoạ.' },

    { t: 'cal', kind: 'why', title: 'Vậy IPC thực chất là gì?', x:
      '<p>Nếu không tiến trình nào chọc thủng được tường, thì <b>chỉ còn một bên có thể mở ' +
      'cửa</b>: nhân. Nhân nhìn thấy toàn bộ bộ nhớ vật lý và không bị bảng trang của bất cứ ai ' +
      'ràng buộc.</p>' +
      '<p>Vì vậy mọi cơ chế IPC trong bài này, không trừ cơ chế nào, đều quy về một trong hai ' +
      'kiểu:</p>' +
      '<ul>' +
      '<li><b>Nhân làm người đưa thư</b> — bạn <code>write</code> vào một đối tượng của nhân, ' +
      'nhân chép dữ liệu vào bộ đệm của mình, bên kia <code>read</code> ra. Pipe, FIFO, hàng ' +
      'đợi thông điệp và socket đều theo kiểu này. Trả giá bằng <b>hai lần chép</b> và ' +
      '<b>hai syscall</b> cho mỗi khối dữ liệu.</li>' +
      '<li><b>Nhân làm người mai mối</b> — bạn nhờ nhân ánh xạ <i>cùng một</i> khung trang vật ' +
      'lý vào bảng trang của cả hai tiến trình. Sau đó nhân rút lui hoàn toàn. Bộ nhớ chia sẻ ' +
      'theo kiểu này: <b>không chép lần nào</b>, <b>không syscall nào</b> sau lúc thiết lập.</li>' +
      '</ul>' +
      '<p>Toàn bộ chênh lệch tốc độ mà bạn sắp đo được nằm gọn trong câu vừa rồi. Hãy giữ nó ' +
      'trong đầu suốt bài.</p>' },

    { t: 'fig', cap:
      'Hai kiểu IPC. Kiểu "người đưa thư" tốn hai lần chép và hai syscall mỗi khối; kiểu ' +
      '"người mai mối" chỉ tốn chi phí một lần lúc thiết lập, sau đó dữ liệu đi thẳng.',
      svg:
      '<svg viewBox="0 0 720 330" width="720" role="img" ' +
      'aria-label="So sánh hai kiểu IPC: nhân chép dữ liệu qua bộ đệm, và nhân ánh xạ chung một khung trang vật lý">' +
      '<text class="d-t" x="12" y="18">Kiểu 1 — nhân làm người đưa thư (pipe, FIFO, hàng đợi, socket)</text>' +
      '<rect class="d-box" x="12" y="30" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="87" y="55" text-anchor="middle">Tiến trình A</text>' +
      '<text class="d-tm" x="87" y="74" text-anchor="middle">buf[4096]</text>' +
      '<rect class="d-box-w" x="285" y="30" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="360" y="55" text-anchor="middle">Bộ đệm của nhân</text>' +
      '<text class="d-ts" x="360" y="74" text-anchor="middle">64 KB, trong không gian nhân</text>' +
      '<rect class="d-box" x="558" y="30" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="633" y="55" text-anchor="middle">Tiến trình B</text>' +
      '<text class="d-tm" x="633" y="74" text-anchor="middle">buf[4096]</text>' +
      '<line class="d-line" x1="162" y1="60" x2="278" y2="60"/>' +
      '<path class="d-arrow" d="M285 60 l-8 -4 v8 z"/>' +
      '<line class="d-line" x1="435" y1="60" x2="551" y2="60"/>' +
      '<path class="d-arrow" d="M558 60 l-8 -4 v8 z"/>' +
      '<text class="d-tm" x="220" y="52" text-anchor="middle">write()</text>' +
      '<text class="d-ts" x="220" y="80" text-anchor="middle">chép lần 1</text>' +
      '<text class="d-tm" x="493" y="52" text-anchor="middle">read()</text>' +
      '<text class="d-ts" x="493" y="80" text-anchor="middle">chép lần 2</text>' +
      '<text class="d-ts" x="360" y="112" text-anchor="middle">Mỗi khối 4 KB: 2 syscall + 2 lần chép — trả giá mãi mãi, khối nào cũng vậy</text>' +

      '<line class="d-line" x1="12" y1="140" x2="708" y2="140"/>' +

      '<text class="d-t" x="12" y="170">Kiểu 2 — nhân làm người mai mối (bộ nhớ chia sẻ)</text>' +
      '<rect class="d-box" x="12" y="182" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="87" y="207" text-anchor="middle">Tiến trình A</text>' +
      '<text class="d-tm" x="87" y="226" text-anchor="middle">0x7f1a…000</text>' +
      '<rect class="d-box" x="558" y="182" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="633" y="207" text-anchor="middle">Tiến trình B</text>' +
      '<text class="d-tm" x="633" y="226" text-anchor="middle">0x758e…000</text>' +
      '<rect class="d-box-g" x="285" y="182" width="150" height="60" rx="6"/>' +
      '<text class="d-t" x="360" y="207" text-anchor="middle">Một khung trang</text>' +
      '<text class="d-ts" x="360" y="226" text-anchor="middle">bộ nhớ vật lý thật</text>' +
      '<line class="d-line" x1="162" y1="212" x2="278" y2="212"/>' +
      '<path class="d-arrow" d="M285 212 l-8 -4 v8 z"/>' +
      '<line class="d-line" x1="435" y1="212" x2="551" y2="212"/>' +
      '<path class="d-arrow" d="M435 212 l8 -4 v8 z"/>' +
      '<text class="d-ts" x="220" y="204" text-anchor="middle">bảng trang</text>' +
      '<text class="d-ts" x="493" y="204" text-anchor="middle">bảng trang</text>' +
      '<text class="d-ts" x="360" y="266" text-anchor="middle">Hai địa chỉ ảo khác nhau, cùng một khung trang vật lý</text>' +
      '<rect class="d-box-g" x="150" y="282" width="420" height="34" rx="6"/>' +
      '<text class="d-t" x="360" y="304" text-anchor="middle">Sau khi mmap: 0 syscall, 0 lần chép — ghi là thấy ngay</text>' +
      '</svg>' },

    { t: 'terms', items: [
      ['IPC', 'Inter-Process Communication', 'Giao tiếp liên tiến trình. Tên gọi chung cho mọi cơ chế giúp các tiến trình trao đổi dữ liệu hoặc đồng bộ với nhau'],
      ['Pipe', '', 'Ống một chiều do nhân giữ. Bên ghi đẩy byte vào, bên đọc lấy ra theo đúng thứ tự. Không có ranh giới thông điệp — chỉ là một dòng byte'],
      ['FIFO', 'named pipe', 'Pipe có tên trên hệ thống tập tin, nên hai chương trình <b>không</b> họ hàng vẫn mở được. Chữ FIFO nghĩa là "vào trước ra trước"'],
      ['Bộ nhớ chia sẻ', 'shared memory', 'Một vùng nhớ được ánh xạ vào không gian địa chỉ của nhiều tiến trình. Nhanh nhất, nhưng bạn phải tự lo đồng bộ'],
      ['Hàng đợi thông điệp', 'message queue', 'Nhân giữ một danh sách các thông điệp <b>rời rạc</b>, mỗi cái có độ ưu tiên. Thông điệp ưu tiên cao được lấy ra trước'],
      ['Semaphore', '', 'Một bộ đếm nguyên do nhân giữ, dùng để giới hạn số tiến trình cùng vào một vùng tới hạn. Khởi tạo bằng 1 thì nó hoạt động như mutex liên tiến trình'],
      ['Vùng tới hạn', 'critical section', 'Đoạn mã chạm vào dữ liệu chung, chỉ được phép có một bên chạy tại một thời điểm. Khái niệm này bạn đã gặp ở Bài 22'],
      ['tmpfs', '', 'Hệ thống tập tin nằm hoàn toàn trong RAM. <code>/dev/shm</code> và <code>/dev/mqueue</code> đều là tmpfs — đó là lý do chúng nhanh và mất sạch khi tắt máy'],
      ['Zero-copy', '', 'Chuyển dữ liệu mà không chép qua bộ đệm trung gian. Bộ nhớ chia sẻ là dạng zero-copy đơn giản nhất'],
      ['Kiên trì', 'persistence', 'Đối tượng IPC POSIX sống đến khi bị <code>unlink</code> hoặc đến khi khởi động lại máy — <b>không</b> chết theo tiến trình tạo ra nó']
    ]},

    /* ══════════════════════════════════════════════
       2. PIPE VÔ DANH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Pipe vô danh: cơ chế đơn giản nhất, và bạn đã dùng nó hàng trăm lần' },

    { t: 'p', x:
      'Mỗi lần bạn gõ <code>ls | grep txt</code> từ Bài 6 đến giờ, shell đã gọi ' +
      '<code>pipe()</code> giúp bạn. Giờ bạn tự gọi nó.' },

    { t: 'code', where: 'file', name: 'ong.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd[2];\n' +
      '    if (pipe(fd) == -1) { perror("pipe"); exit(1); }\n' +
      '    printf("pipe() tao ra fd[0]=%d (doc), fd[1]=%d (ghi)\\n", fd[0], fd[1]);\n' +
      '\n' +
      '    pid_t p = fork();\n' +
      '    if (p == -1) { perror("fork"); exit(1); }\n' +
      '\n' +
      '    if (p == 0) {                       /* con: chi doc */\n' +
      '        close(fd[1]);\n' +
      '        char buf[128];\n' +
      '        ssize_t n;\n' +
      '        while ((n = read(fd[0], buf, sizeof buf - 1)) > 0) {\n' +
      '            buf[n] = \'\\0\';\n' +
      '            printf("  [con  pid=%d] nhan %zd byte: %s", getpid(), n, buf);\n' +
      '            fflush(stdout);\n' +
      '        }\n' +
      '        printf("  [con  pid=%d] read tra ve %zd -> ben ghi da dong\\n", getpid(), n);\n' +
      '        fflush(stdout);\n' +
      '        close(fd[0]);\n' +
      '        _exit(0);\n' +
      '    }\n' +
      '\n' +
      '    close(fd[0]);                       /* cha: chi ghi */\n' +
      '    const char *m1 = "nhiet do 42.5\\n";\n' +
      '    const char *m2 = "nhiet do 43.1\\n";\n' +
      '    write(fd[1], m1, strlen(m1));\n' +
      '    usleep(200000);\n' +
      '    write(fd[1], m2, strlen(m2));\n' +
      '    usleep(200000);\n' +
      '    printf("[cha  pid=%d] dong dau ghi\\n", getpid());\n' +
      '    close(fd[1]);\n' +
      '    waitpid(p, NULL, 0);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai23 && cd ~/embedded/bai23\n' +
      'gcc -Wall -Wextra -o ong ong.c && ./ong' },

    { t: 'code', where: 'out', nocopy: true, code:
      'pipe() tao ra fd[0]=3 (doc), fd[1]=4 (ghi)\n' +
      '  [con  pid=430] nhan 14 byte: nhiet do 42.5\n' +
      '  [con  pid=430] nhan 14 byte: nhiet do 43.1\n' +
      '[cha  pid=429] dong dau ghi\n' +
      '  [con  pid=430] read tra ve 0 -> ben ghi da dong' },

    { t: 'cmdx', cmd: 'int fd[2]; pipe(fd);',
      title: 'Một lời gọi, hai mô tả file',
      rows: [
        ['<code>fd[0]</code>', 'Đầu <b>đọc</b>. Nhớ mẹo: 0 giống <code>stdin</code>, mà stdin là để đọc', 'Ở đây nhận số 3 — số nhỏ nhất còn trống, vì 0/1/2 đã bị stdin/stdout/stderr chiếm'],
        ['<code>fd[1]</code>', 'Đầu <b>ghi</b>. 1 giống <code>stdout</code>, mà stdout là để ghi', 'Nhận số 4'],
        ['giá trị trả về', '<code>0</code> nếu thành công, <code>-1</code> nếu hỏng', 'Hỏng khi hết mô tả file (<code>EMFILE</code>) hoặc hết bộ nhớ nhân'],
        ['chiều dữ liệu', '<b>Một chiều</b>: chỉ đi từ <code>fd[1]</code> sang <code>fd[0]</code>', 'Muốn nói chuyện hai chiều phải tạo <b>hai</b> pipe. Đây là lỗi thiết kế phổ biến nhất của người mới']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao mỗi bên bắt buộc phải đóng đầu ống không dùng?', x:
      '<p>Sau <code>fork()</code>, bảng mô tả file được sao chép, nên <b>cả bốn</b> đầu ống ' +
      'đang mở: cha giữ fd[0]+fd[1], con cũng giữ fd[0]+fd[1]. Nhân đếm số tiến trình còn giữ ' +
      'mỗi đầu.</p>' +
      '<p>Đầu đọc chỉ nhận được tín hiệu "hết dữ liệu" — tức <code>read()</code> trả về ' +
      '<b>0</b> — khi <b>mọi</b> bản sao của đầu ghi đã đóng. Nếu tiến trình con quên ' +
      '<code>close(fd[1])</code>, thì chính nó vẫn đang giữ một đầu ghi. Vòng ' +
      '<code>while (read(...) &gt; 0)</code> sẽ chờ vĩnh viễn dữ liệu từ chính mình.</p>' +
      '<p>Đây là một trong những cách treo chương trình khó chẩn đoán nhất, vì không có thông ' +
      'báo lỗi nào — chương trình chỉ đứng im. Quy tắc để không bao giờ sai: <b>ngay sau ' +
      '<code>fork</code>, mỗi bên đóng đầu mà mình không dùng, dòng đầu tiên, trước mọi thứ ' +
      'khác.</b></p>' },

    { t: 'cal', kind: 'info', title: 'Dòng cuối cùng đến sau — và đó là điều đúng', x:
      '<p>Để ý thứ tự output: <code>[cha] dong dau ghi</code> in ra <i>trước</i> ' +
      '<code>[con] read tra ve 0</code>. Đúng như vậy: chừng nào cha chưa ' +
      '<code>close(fd[1])</code>, <code>read()</code> trong con vẫn <b>chặn</b>, chờ có thể còn ' +
      'dữ liệu nữa. Chỉ khi đầu ghi cuối cùng đóng lại, nhân mới trả về 0.</p>' +
      '<p><code>read()</code> trả về <b>0</b> nghĩa là "hết file" (EOF), không phải lỗi. Đây là ' +
      'cùng một quy ước bạn đã gặp khi đọc file thường ở Bài 19 — nhất quán tuyệt đối, và đó ' +
      'chính là sức mạnh của triết lý "mọi thứ đều là file" trong Unix.</p>' },

    /* ══════════════════════════════════════════════
       3. SỨC CHỨA VÀ SIGPIPE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Pipe chứa được bao nhiêu, và chuyện gì xảy ra khi nó đầy' },

    { t: 'p', x:
      'Pipe không phải cái ống vô hạn. Nhân cấp cho nó một bộ đệm có kích thước cố định. Biết ' +
      'con số đó rất quan trọng, vì nó quyết định lúc nào <code>write()</code> sẽ <b>chặn</b> ' +
      'chương trình của bạn lại.' },

    { t: 'code', where: 'file', name: 'succhua.c', lang: 'c', code:
      '#define _GNU_SOURCE                 /* can cho F_GETPIPE_SZ */\n' +
      '#include <stdio.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd[2];\n' +
      '    if (pipe(fd) == -1) { perror("pipe"); return 1; }\n' +
      '    printf("F_GETPIPE_SZ = %d byte = %d KB\\n",\n' +
      '           fcntl(fd[1], F_GETPIPE_SZ), fcntl(fd[1], F_GETPIPE_SZ) / 1024);\n' +
      '\n' +
      '    /* do bang cach ghi khong chan cho den khi day */\n' +
      '    fcntl(fd[1], F_SETFL, O_NONBLOCK);\n' +
      '    char c = \'x\';\n' +
      '    long tong = 0;\n' +
      '    while (write(fd[1], &c, 1) == 1) tong++;\n' +
      '    printf("ghi duoc %ld byte thi pipe day (EAGAIN)\\n", tong);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o succhua succhua.c && ./succhua\n' +
      'cat /proc/sys/fs/pipe-max-size' },

    { t: 'code', where: 'out', nocopy: true, code:
      'F_GETPIPE_SZ = 65536 byte = 64 KB\n' +
      'ghi duoc 65536 byte thi pipe day (EAGAIN)\n' +
      '1048576' },

    { t: 'cal', kind: 'info', title: 'Hai con số cần nhớ: 64 KB và 4096 byte', x:
      '<p><b>65 536 byte</b> là sức chứa mặc định. Phép đo bằng cách ghi từng byte một xác nhận ' +
      'đúng con số mà <code>F_GETPIPE_SZ</code> báo — không sai một byte nào.</p>' +
      '<p>Khi bộ đệm đầy, <code>write()</code> hành xử theo một trong hai cách:</p>' +
      '<ul>' +
      '<li><b>Chế độ chặn</b> (mặc định): tiến trình ghi <i>ngủ</i> cho tới khi bên kia đọc bớt ' +
      'ra. Đây thường là điều bạn muốn — nó tạo ra <i>backpressure</i> tự nhiên, ngăn bên gửi ' +
      'nhanh làm ngập bên nhận chậm.</li>' +
      '<li><b>Chế độ không chặn</b> (<code>O_NONBLOCK</code>): <code>write()</code> trả về ' +
      '<code>-1</code> với <code>errno = EAGAIN</code>. Bạn sẽ dùng chế độ này ở Bài 24 khi ' +
      'một tiến trình phải phục vụ nhiều kênh cùng lúc.</li>' +
      '</ul>' +
      '<p>Con số thứ hai, <b>4096 byte</b> (hằng <code>PIPE_BUF</code>), là lời hứa về tính ' +
      'nguyên tử: ghi <b>không quá</b> 4096 byte một lần thì nhân bảo đảm khối đó không bị xen ' +
      'kẽ với khối của tiến trình khác. Ghi lớn hơn thì mất bảo đảm, và nhiều tiến trình cùng ' +
      'ghi vào một pipe sẽ cho ra dữ liệu trộn lẫn. Trần trên mà bạn được phép nâng sức chứa ' +
      'lên là <b>1 048 576</b> byte, đọc từ <code>/proc/sys/fs/pipe-max-size</code>.</p>' },

    { t: 'p', x:
      'Bây giờ tình huống ngược lại — ghi vào một pipe mà <b>không còn ai đọc</b>:' },

    { t: 'code', where: 'file', name: 'vo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <string.h>                 /* strerror */\n' +
      '#include <unistd.h>\n' +
      '#include <signal.h>\n' +
      '#include <errno.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd[2];\n' +
      '    if (pipe(fd) == -1) { perror("pipe"); return 1; }\n' +
      '\n' +
      '    pid_t p = fork();\n' +
      '    if (p == 0) { close(fd[0]); close(fd[1]); _exit(0); }   /* con dong ngay */\n' +
      '    close(fd[0]);                                            /* cha cung dong dau doc */\n' +
      '    waitpid(p, NULL, 0);\n' +
      '    sleep(1);\n' +
      '\n' +
      '    signal(SIGPIPE, SIG_IGN);          /* bo qua de nhin thay errno */\n' +
      '    ssize_t n = write(fd[1], "abc", 3);\n' +
      '    printf("write tra ve %zd, errno = %d (%s)\\n", n, errno, strerror(errno));\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o vo vo.c && ./vo\n' +
      'sed \'s|signal(SIGPIPE, SIG_IGN);|/* khong bo qua */|\' vo.c > vo2.c\n' +
      'gcc -Wall -Wextra -o vo2 vo2.c && ./vo2\n' +
      'echo "ma thoat = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'write tra ve -1, errno = 32 (Broken pipe)\n' +
      'ma thoat = 141' },

    { t: 'cal', kind: 'danger', title: 'Mã 141: chương trình của bạn vừa bị giết mà không hề báo lỗi', x:
      '<p>Hai lần chạy, hai kết cục hoàn toàn khác nhau, từ <b>cùng một mã nguồn</b> trừ một ' +
      'dòng:</p>' +
      '<ul>' +
      '<li>Có <code>signal(SIGPIPE, SIG_IGN)</code>: <code>write</code> trả <code>-1</code>, ' +
      '<code>errno = 32</code> (<code>EPIPE</code>). Bạn xử lý được.</li>' +
      '<li>Không có: tiến trình <b>chết</b>, mã thoát <b>141</b> = 128 + 13 = ' +
      '<code>SIGPIPE</code> — đúng công thức bạn đã lập ở Bài 21. Dòng <code>printf</code> ' +
      'không bao giờ chạy.</li>' +
      '</ul>' +
      '<p>Hành vi mặc định của <code>SIGPIPE</code> là <i>giết tiến trình</i>. Với công cụ dòng ' +
      'lệnh thì đó là điều hợp lý — <code>yes | head -1</code> phải dừng lại chứ không nên chạy ' +
      'mãi. Nhưng với một daemon trên thiết bị, đây là thảm hoạ: client rút dây mạng, daemon ' +
      'của bạn chết theo, thiết bị ngừng đo. Log không có dòng nào vì chết trước khi kịp ghi.</p>' +
      '<p><b>Mọi daemon dùng pipe, FIFO hoặc socket đều phải mở đầu bằng ' +
      '<code>signal(SIGPIPE, SIG_IGN);</code></b> rồi kiểm tra <code>EPIPE</code> sau mỗi ' +
      '<code>write</code>. Bạn sẽ áp dụng đúng quy tắc này cho socket ở Bài 24.</p>' },

    /* ══════════════════════════════════════════════
       4. FIFO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'FIFO: pipe có tên, cho hai chương trình xa lạ' },

    { t: 'p', x:
      'Pipe vô danh có một giới hạn nghiêm trọng: nó chỉ truyền được qua <code>fork()</code>, ' +
      'nghĩa là hai bên phải có quan hệ họ hàng. Nhưng trên thiết bị thật, tiến trình đọc cảm ' +
      'biến và tiến trình gửi mạng thường do systemd khởi động độc lập — chúng không phải cha ' +
      'con của nhau.' },

    { t: 'p', x:
      '<b>FIFO</b> giải quyết đúng chuyện đó: đặt cho ống một cái tên trên hệ thống tập tin, ' +
      'thế là bất cứ ai có quyền cũng mở được.' },

    { t: 'code', where: 'wsl', code:
      'mkfifo /tmp/ongcoten\n' +
      'ls -l /tmp/ongcoten\n' +
      'stat -c \'kieu=%F  quyen=%A  kich thuoc=%s\' /tmp/ongcoten' },

    { t: 'code', where: 'out', nocopy: true, code:
      'prw-r--r-- 1 shinarus shinarus 0 Aug  3 21:57 /tmp/ongcoten\n' +
      'kieu=fifo  quyen=prw-r--r--  kich thuoc=0' },

    { t: 'cmdx', cmd: 'prw-r--r-- 1 shinarus shinarus 0',
      title: 'Đọc kỹ dòng ls: hai chi tiết tiết lộ toàn bộ bản chất',
      rows: [
        ['<code>p</code>', 'Ký tự đầu là <b>p</b> = pipe', 'So với <code>-</code> (file thường), <code>d</code> (thư mục), <code>c</code> (thiết bị ký tự) mà bạn đã học ở Bài 7'],
        ['<code>rw-r--r--</code>', 'Quyền như file thường, và <b>có tác dụng thật</b>', 'Đây là ưu điểm lớn của FIFO: bạn dùng quyền Unix để kiểm soát ai được gửi, ai được nhận'],
        ['<code>0</code>', 'Kích thước <b>luôn</b> bằng 0', 'Dữ liệu <b>không</b> nằm trên đĩa. Cái tên chỉ là điểm hẹn; dữ liệu vẫn ở bộ đệm 64 KB trong RAM của nhân'],
        ['<code>/tmp/ongcoten</code>', 'Chỗ đặt tên', 'Trên thiết bị thật hãy đặt trong <code>/run</code> — đó là tmpfs, đúng chuẩn FHS cho dữ liệu thời gian chạy, và sạch sau mỗi lần khởi động']
      ]},

    { t: 'p', x:
      'Thử ngay bằng hai lệnh shell, không cần viết chương trình nào:' },

    { t: 'code', where: 'wsl', code:
      '( sleep 0.3; echo "cam bien 1: 42.5" > /tmp/ongcoten ) &\n' +
      'timeout 3 cat /tmp/ongcoten\n' +
      'rm -f /tmp/ongcoten' },

    { t: 'code', where: 'out', nocopy: true, code:
      'cam bien 1: 42.5' },

    { t: 'cal', kind: 'warn', title: 'Mở FIFO là một hành động chặn — và điều này làm nhiều người mất buổi chiều', x:
      '<p><code>open("/tmp/ongcoten", O_RDONLY)</code> sẽ <b>đứng im</b> cho tới khi có ai đó ' +
      'mở cùng FIFO đó để ghi. Chiều ngược lại cũng vậy. Đó là lý do lệnh trên phải đẩy phần ' +
      'ghi vào nền bằng <code>&amp;</code> — chạy tuần tự thì lệnh đầu treo mãi.</p>' +
      '<p>Hành vi này thực ra là một tính năng: nó tự đồng bộ hai bên, bên nào tới trước thì ' +
      'chờ. Nhưng nếu bạn không biết, triệu chứng sẽ là "daemon của tôi treo lúc khởi động, ' +
      'không log dòng nào" — và bạn sẽ đi tìm lỗi ở khắp nơi trừ chỗ đúng.</p>' +
      '<p>Muốn tránh: mở với <code>O_RDONLY | O_NONBLOCK</code>. Lúc đó ' +
      '<code>open</code> trả về ngay. Lưu ý bất đối xứng: mở <i>đọc</i> không chặn thì thành ' +
      'công ngay cả khi chưa có người ghi, nhưng mở <i>ghi</i> không chặn mà chưa có người đọc ' +
      'thì thất bại với <code>ENXIO</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. BỘ NHỚ CHIA SẺ POSIX
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bộ nhớ chia sẻ POSIX: ba lời gọi rồi nhân rút lui' },

    { t: 'p', x:
      'Đây là cơ chế nhanh nhất, và cũng là cơ chế đòi hỏi bạn nhiều nhất. Công thức luôn gồm ' +
      'ba bước, không bao giờ khác: <code>shm_open</code> để tạo/mở đối tượng, ' +
      '<code>ftruncate</code> để định kích thước, <code>mmap</code> để đưa nó vào không gian ' +
      'địa chỉ của mình.' },

    { t: 'code', where: 'file', name: 'ghi_shm.c — bên ghi', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <sys/mman.h>\n' +
      '\n' +
      '#define TEN  "/dulieu_cambien"        /* PHAI bat dau bang mot dau / */\n' +
      '\n' +
      'struct goi {\n' +
      '    unsigned long dem;\n' +
      '    double nhiet_do;\n' +
      '    char  ten[32];\n' +
      '};\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd = shm_open(TEN, O_CREAT | O_RDWR, 0600);\n' +
      '    if (fd == -1) { perror("shm_open"); exit(1); }\n' +
      '    printf("shm_open(\\"%s\\") -> fd=%d\\n", TEN, fd);\n' +
      '\n' +
      '    if (ftruncate(fd, sizeof(struct goi)) == -1) { perror("ftruncate"); exit(1); }\n' +
      '    printf("ftruncate -> %zu byte\\n", sizeof(struct goi));\n' +
      '\n' +
      '    struct goi *g = mmap(NULL, sizeof *g, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);\n' +
      '    if (g == MAP_FAILED) { perror("mmap"); exit(1); }\n' +
      '    printf("mmap -> dia chi %p\\n", (void *)g);\n' +
      '\n' +
      '    close(fd);                       /* fd khong con can sau khi da mmap */\n' +
      '\n' +
      '    for (int i = 1; i <= 3; i++) {\n' +
      '        g->dem = i;\n' +
      '        g->nhiet_do = 42.0 + i * 0.5;\n' +
      '        snprintf(g->ten, sizeof g->ten, "cam bien %d", i);\n' +
      '        printf("  [ghi] dem=%lu nhiet=%.1f ten=%s\\n", g->dem, g->nhiet_do, g->ten);\n' +
      '        fflush(stdout);\n' +
      '        sleep(1);\n' +
      '    }\n' +
      '    munmap(g, sizeof *g);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'file', name: 'doc_shm.c — bên đọc', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <sys/mman.h>\n' +
      '\n' +
      '#define TEN  "/dulieu_cambien"\n' +
      '\n' +
      'struct goi { unsigned long dem; double nhiet_do; char ten[32]; };\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd = shm_open(TEN, O_RDONLY, 0);\n' +
      '    if (fd == -1) { perror("shm_open"); exit(1); }\n' +
      '\n' +
      '    struct goi *g = mmap(NULL, sizeof *g, PROT_READ, MAP_SHARED, fd, 0);\n' +
      '    if (g == MAP_FAILED) { perror("mmap"); exit(1); }\n' +
      '    close(fd);\n' +
      '\n' +
      '    for (int i = 0; i < 3; i++) {\n' +
      '        printf("             [doc] dem=%lu nhiet=%.1f ten=%s\\n",\n' +
      '               g->dem, g->nhiet_do, g->ten);\n' +
      '        fflush(stdout);\n' +
      '        sleep(1);\n' +
      '    }\n' +
      '    munmap(g, sizeof *g);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o ghi_shm ghi_shm.c\n' +
      'gcc -Wall -Wextra -o doc_shm doc_shm.c\n' +
      './ghi_shm &\n' +
      'sleep 0.4\n' +
      './doc_shm\n' +
      'wait' },

    { t: 'code', where: 'out', nocopy: true, code:
      'shm_open("/dulieu_cambien") -> fd=3\n' +
      'ftruncate -> 48 byte\n' +
      'mmap -> dia chi 0x758e38471000\n' +
      '  [ghi] dem=1 nhiet=42.5 ten=cam bien 1\n' +
      '             [doc] dem=1 nhiet=42.5 ten=cam bien 1\n' +
      '  [ghi] dem=2 nhiet=43.0 ten=cam bien 2\n' +
      '             [doc] dem=2 nhiet=43.0 ten=cam bien 2\n' +
      '  [ghi] dem=3 nhiet=43.5 ten=cam bien 3\n' +
      '             [doc] dem=3 nhiet=43.5 ten=cam bien 3' },

    { t: 'cmdx', cmd: 'shm_open(TEN, O_CREAT | O_RDWR, 0600) → ftruncate(fd, n) → mmap(...)',
      title: 'Ba bước, và vì sao thiếu bước nào cũng hỏng',
      rows: [
        ['<code>shm_open</code>', 'Tạo hoặc mở một đối tượng bộ nhớ chia sẻ, trả về một mô tả file thường', 'Tên <b>bắt buộc</b> bắt đầu bằng <code>/</code> và không được chứa dấu <code>/</code> nào khác'],
        ['<code>O_CREAT | O_RDWR</code>', 'Tạo nếu chưa có, mở để đọc lẫn ghi', 'Bên đọc chỉ cần <code>O_RDONLY</code> — hãy dùng đúng quyền tối thiểu'],
        ['<code>0600</code>', 'Quyền của đối tượng, y hệt quyền file', 'Chỉ chủ sở hữu đọc/ghi được. Đây là hàng rào an ninh duy nhất của bộ nhớ chia sẻ'],
        ['<code>ftruncate</code>', 'Định kích thước. Đối tượng mới <b>luôn</b> dài 0 byte', 'Bỏ qua bước này thì <code>mmap</code> vẫn thành công nhưng chạm vào vùng đó cho <code>SIGBUS</code> — một lỗi rất khó đoán'],
        ['<code>MAP_SHARED</code>', 'Mọi thay đổi <b>thấy được</b> bởi các tiến trình khác', 'Đây là cờ mấu chốt. Nếu viết nhầm <code>MAP_PRIVATE</code>, mỗi bên nhận một bản sao copy-on-write và không ai thấy gì của ai'],
        ['<code>close(fd)</code>', 'Đóng mô tả file sau khi đã ánh xạ', 'Ánh xạ vẫn sống. Nó chỉ mất khi bạn gọi <code>munmap</code> hoặc tiến trình thoát']
      ]},

    { t: 'p', x:
      'Đối tượng đó nằm ở đâu trên máy? Câu trả lời khiến mọi thứ trở nên rất cụ thể:' },

    { t: 'code', where: 'wsl', code:
      'ls -l /dev/shm/\n' +
      'df -h /dev/shm | tail -1' },

    { t: 'code', where: 'out', nocopy: true, code:
      'total 4\n' +
      '-rw------- 1 shinarus shinarus 48 Aug  3 21:57 dulieu_cambien\n' +
      'none            2.5G  4.0K  2.5G   1% /dev/shm' },

    { t: 'cal', kind: 'why', title: 'Nó chỉ là một file trong RAM — và điều đó giải thích tất cả', x:
      '<p><code>/dev/shm</code> là một <b>tmpfs</b>: hệ thống tập tin sống hoàn toàn trong RAM. ' +
      '<code>shm_open</code> thực chất chỉ là <code>open("/dev/shm/&lt;ten&gt;")</code> — bạn ' +
      'sẽ tự thấy điều đó bằng <code>strace</code> ở phần thực hành.</p>' +
      '<p>Ba hệ quả rất thực tế:</p>' +
      '<ol>' +
      '<li><b>Bạn gỡ lỗi được bằng công cụ thường.</b> <code>ls -l</code>, <code>rm</code>, ' +
      '<code>hexdump -C /dev/shm/dulieu_cambien</code> đều hoạt động. Không cần công cụ đặc ' +
      'biệt nào để soi bộ nhớ chia sẻ.</li>' +
      '<li><b>Nó chiếm RAM thật.</b> Ở đây <code>/dev/shm</code> được cấp <b>2,5 GB</b> — bằng ' +
      'một nửa RAM, đúng mặc định của Linux. Trên thiết bị 64 MB, một vùng chia sẻ 8 MB là một ' +
      'quyết định lớn, không phải chi tiết nhỏ.</li>' +
      '<li><b>Nó không chết theo tiến trình.</b> Cả hai chương trình đã thoát, file 48 byte vẫn ' +
      'nằm đó. Đây là điểm khác biệt căn bản so với pipe.</li>' +
      '</ol>' },

    { t: 'cal', kind: 'warn', title: 'Kiên trì là con dao hai lưỡi — nhớ shm_unlink', x:
      '<p>Đối tượng chia sẻ sống tới khi có ai gọi <code>shm_unlink("/dulieu_cambien")</code> ' +
      'hoặc tới khi khởi động lại máy. Nghe thì tiện: daemon khởi động lại vẫn thấy dữ liệu cũ.</p>' +
      '<p>Nhưng nó cũng có nghĩa là một daemon sập giữa chừng sẽ để lại rác trong RAM ' +
      '<b>vĩnh viễn</b>. Chạy đi chạy lại một chương trình lỗi trên thiết bị 64 MB là cách rất ' +
      'hiệu quả để ngốn sạch bộ nhớ mà <code>ps</code> không cho thấy thủ phạm — vì không tiến ' +
      'trình nào đang giữ nó cả.</p>' +
      '<p>Thói quen đúng: gọi <code>shm_unlink</code> trong tay xử lý <code>SIGTERM</code> mà ' +
      'bạn đã học viết ở Bài 21. Và khi gỡ lỗi, <code>ls -l /dev/shm/</code> là lệnh đầu tiên ' +
      'nên gõ.</p>' },

    /* ══════════════════════════════════════════════
       6. HÀNG ĐỢI THÔNG ĐIỆP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hàng đợi thông điệp: khi thứ tự không phải là thứ tự đến' },

    { t: 'p', x:
      'Pipe cho bạn một <i>dòng byte</i> — muốn biết thông điệp bắt đầu và kết thúc ở đâu, bạn ' +
      'phải tự quy ước. Hàng đợi thông điệp POSIX cho bạn thứ khác hẳn: các gói <b>rời rạc</b>, ' +
      'mỗi gói mang một <b>độ ưu tiên</b>, và gói ưu tiên cao được lấy ra trước bất kể đến sau.' },

    { t: 'code', where: 'file', name: 'mq_gui.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <mqueue.h>\n' +
      '\n' +
      '#define TEN "/hang_canh_bao"\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct mq_attr at = { .mq_flags = 0, .mq_maxmsg = 10,\n' +
      '                          .mq_msgsize = 64, .mq_curmsgs = 0 };\n' +
      '    mqd_t q = mq_open(TEN, O_CREAT | O_WRONLY, 0600, &at);\n' +
      '    if (q == (mqd_t)-1) { perror("mq_open"); exit(1); }\n' +
      '\n' +
      '    struct { const char *t; unsigned p; } ds[] = {\n' +
      '        { "nhiet do binh thuong 42.5", 1 },\n' +
      '        { "CANH BAO qua nhiet 91.0",   9 },      /* gui THU HAI, uu tien cao */\n' +
      '        { "nhiet do binh thuong 43.0", 1 },\n' +
      '    };\n' +
      '    for (unsigned i = 0; i < 3; i++) {\n' +
      '        if (mq_send(q, ds[i].t, strlen(ds[i].t) + 1, ds[i].p) == -1) perror("mq_send");\n' +
      '        printf("  [gui] uu tien %u: %s\\n", ds[i].p, ds[i].t);\n' +
      '    }\n' +
      '    mq_getattr(q, &at);\n' +
      '    printf("  hang dang chua %ld thong diep\\n", at.mq_curmsgs);\n' +
      '    mq_close(q);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'file', name: 'mq_nhan.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <mqueue.h>\n' +
      '\n' +
      '#define TEN "/hang_canh_bao"\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    mqd_t q = mq_open(TEN, O_RDONLY);\n' +
      '    if (q == (mqd_t)-1) { perror("mq_open"); exit(1); }\n' +
      '\n' +
      '    struct mq_attr at;\n' +
      '    mq_getattr(q, &at);\n' +
      '    char *buf = malloc(at.mq_msgsize);      /* PHAI du lon bang mq_msgsize */\n' +
      '\n' +
      '    for (int i = 0; i < 3; i++) {\n' +
      '        unsigned p;\n' +
      '        ssize_t n = mq_receive(q, buf, at.mq_msgsize, &p);\n' +
      '        if (n == -1) { perror("mq_receive"); exit(1); }\n' +
      '        printf("             [nhan] uu tien %u (%zd byte): %s\\n", p, n, buf);\n' +
      '    }\n' +
      '    mq_close(q);\n' +
      '    mq_unlink(TEN);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o mq_gui mq_gui.c\n' +
      'gcc -Wall -Wextra -o mq_nhan mq_nhan.c\n' +
      './mq_gui\n' +
      'ls -l /dev/mqueue/\n' +
      'cat /dev/mqueue/hang_canh_bao\n' +
      './mq_nhan' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  [gui] uu tien 1: nhiet do binh thuong 42.5\n' +
      '  [gui] uu tien 9: CANH BAO qua nhiet 91.0\n' +
      '  [gui] uu tien 1: nhiet do binh thuong 43.0\n' +
      '  hang dang chua 3 thong diep\n' +
      'total 0\n' +
      '-rw------- 1 shinarus shinarus 80 Aug  3 21:58 hang_canh_bao\n' +
      'QSIZE:76         NOTIFY:0     SIGNO:0     NOTIFY_PID:0\n' +
      '             [nhan] uu tien 9 (24 byte): CANH BAO qua nhiet 91.0\n' +
      '             [nhan] uu tien 1 (26 byte): nhiet do binh thuong 42.5\n' +
      '             [nhan] uu tien 1 (26 byte): nhiet do binh thuong 43.0' },

    { t: 'cal', kind: 'why', title: 'Cảnh báo được gửi thứ hai nhưng nhận ra đầu tiên', x:
      '<p>Đây là tính chất khiến hàng đợi thông điệp đáng dùng. Thông điệp ' +
      '<code>CANH BAO qua nhiet 91.0</code> vào hàng ở vị trí thứ <b>2</b>, nhưng vì mang ưu ' +
      'tiên <b>9</b> nên nó ra <b>đầu tiên</b>. Hai thông điệp ưu tiên 1 giữ nguyên thứ tự đến ' +
      'giữa chúng với nhau — trong cùng một mức ưu tiên thì đúng là vào trước ra trước.</p>' +
      '<p>Với pipe, muốn có hành vi này bạn phải tự viết bộ đệm sắp xếp, tự đánh dấu ranh giới ' +
      'gói, tự khoá. Với hàng đợi, nhân làm hộ.</p>' +
      '<p>Tình huống điển hình trong nhúng: một daemon giám sát nhận cả số đo định kỳ lẫn báo ' +
      'động. Số đo đến liên tục và có thể xếp hàng; báo động quá nhiệt <b>không được</b> chờ ' +
      'sau 200 số đo bình thường. Ưu tiên giải quyết chuyện đó gọn gàng, không cần thêm một ' +
      'kênh riêng.</p>' },

    { t: 'code', where: 'wsl', code:
      'for f in msg_max msgsize_max queues_max; do\n' +
      '  printf "%-14s = %s\\n" "$f" "$(cat /proc/sys/fs/mqueue/$f)"\n' +
      'done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'msg_max        = 10\n' +
      'msgsize_max    = 8192\n' +
      'queues_max     = 256' },

    { t: 'cal', kind: 'warn', title: 'Ba con trần rất thấp, và chúng gây lỗi lúc chạy chứ không lúc dịch', x:
      '<p>Mặc định một hàng đợi chỉ chứa <b>10</b> thông điệp, mỗi cái tối đa <b>8192</b> byte, ' +
      'toàn hệ thống tối đa <b>256</b> hàng. Xin quá <code>msg_max</code> thì ' +
      '<code>mq_open</code> trả <code>EINVAL</code>; hàng đầy mà vẫn ' +
      '<code>mq_send</code> thì lời gọi <b>chặn</b> — hoặc trả <code>EAGAIN</code> nếu bạn mở ' +
      'với <code>O_NONBLOCK</code>.</p>' +
      '<p>Hai lỗi hay gặp nữa, cả hai đều là <code>EMSGSIZE</code>:</p>' +
      '<ul>' +
      '<li>Gửi thông điệp dài hơn <code>mq_msgsize</code> đã khai báo.</li>' +
      '<li><b>Nhận</b> với bộ đệm nhỏ hơn <code>mq_msgsize</code> — kể cả khi thông điệp thực ' +
      'tế rất ngắn. Đó là lý do <code>mq_nhan.c</code> phải hỏi <code>mq_getattr</code> rồi mới ' +
      '<code>malloc</code>, chứ không dùng <code>char buf[64]</code> đoán bừa.</li>' +
      '</ul>' +
      '<p>Trên thiết bị thật, hãy nâng trần trong <code>/etc/sysctl.d/</code> chứ đừng sửa bằng ' +
      'tay vào <code>/proc</code> — sửa tay mất sau khi khởi động lại.</p>' },

    { t: 'cal', kind: 'info', title: '-lrt: lại một thư viện nữa đã biến mất', x:
      '<p>Sách và bài viết trên mạng đều dặn phải thêm <code>-lrt</code> khi dùng ' +
      '<code>shm_open</code> hoặc <code>mq_*</code>. Trên máy này thì không cần — ' +
      '<code>ldd ghi_shm</code> chỉ liệt kê <code>libc.so.6</code>, không có ' +
      '<code>librt.so.1</code> nào.</p>' +
      '<p>Nguyên nhân giống hệt chuyện <code>libpthread</code> ở Bài 22: từ glibc <b>2.34</b>, ' +
      '<code>librt</code> đã được gộp thẳng vào <code>libc.so.6</code>. Máy này chạy glibc ' +
      '<b>2.43</b> nên viết <code>-lrt</code> vẫn được chấp nhận, chỉ là thừa.</p>' +
      '<p>Và kết luận cũng giống hệt: <b>vẫn cứ viết <code>-lrt</code></b> trong Makefile. Nó ' +
      'vô hại ở đây, nhưng bắt buộc khi bạn biên dịch chéo cho thiết bị chạy glibc cũ hơn — ' +
      'chuyện bạn sẽ làm ở <b>Chặng 04</b>.</p>' },

    /* ══════════════════════════════════════════════
       7. SEMAPHORE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Semaphore: đếm số chỗ, không chuyển dữ liệu' },

    { t: 'p', x:
      'Bốn cơ chế trên đều <b>chuyển dữ liệu</b>. Semaphore thì không — nó chỉ là một bộ đếm ' +
      'nguyên do nhân giữ, dùng để <b>điều phối</b>. Hãy hình dung nó như số chìa khoá treo ở ' +
      'quầy: ai lấy được chìa mới vào được phòng, hết chìa thì đứng chờ.' },

    { t: 'code', where: 'file', name: 'sem_demo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <semaphore.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      '#define TEN "/khoa_uart"\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    sem_unlink(TEN);                                 /* don rac lan chay truoc */\n' +
      '    sem_t *s = sem_open(TEN, O_CREAT, 0600, 1);      /* dem = 1 -> nhu mot mutex */\n' +
      '    if (s == SEM_FAILED) { perror("sem_open"); exit(1); }\n' +
      '\n' +
      '    for (int i = 0; i < 3; i++)\n' +
      '        if (fork() == 0) {\n' +
      '            sem_wait(s);                             /* giam 1; neu dang 0 thi ngu cho */\n' +
      '            int v; sem_getvalue(s, &v);\n' +
      '            printf("  [con %d] vao vung toi han, sem = %d\\n", i, v);\n' +
      '            fflush(stdout);\n' +
      '            usleep(300000);                          /* gia vo dung UART */\n' +
      '            printf("  [con %d] roi vung toi han\\n", i);\n' +
      '            fflush(stdout);\n' +
      '            sem_post(s);                             /* tang 1; danh thuc nguoi cho */\n' +
      '            sem_close(s);\n' +
      '            _exit(0);\n' +
      '        }\n' +
      '\n' +
      '    for (int i = 0; i < 3; i++) wait(NULL);\n' +
      '    int v; sem_getvalue(s, &v);\n' +
      '    printf("cuoi cung sem = %d\\n", v);\n' +
      '    sem_close(s);\n' +
      '    sem_unlink(TEN);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o sem_demo sem_demo.c && ./sem_demo' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  [con 0] vao vung toi han, sem = 0\n' +
      '  [con 0] roi vung toi han\n' +
      '  [con 1] vao vung toi han, sem = 0\n' +
      '  [con 1] roi vung toi han\n' +
      '  [con 2] vao vung toi han, sem = 0\n' +
      '  [con 2] roi vung toi han\n' +
      'cuoi cung sem = 1' },

    { t: 'cal', kind: 'info', title: 'Đọc output theo cặp — không cặp nào lồng vào cặp nào', x:
      '<p>Mỗi "vào" luôn đi liền với "rời" của <b>cùng</b> tiến trình trước khi tiến trình khác ' +
      'vào. Ba tiến trình chạy song song thật, nhưng vùng tới hạn thì tuần tự tuyệt đối. Đó ' +
      'chính xác là điều bạn muốn khi ba tiến trình cùng cần một cổng UART hoặc một chân GPIO.</p>' +
      '<p>Giá trị in ra luôn là <b>0</b> vì tiến trình vừa <code>sem_wait</code> xong đã lấy ' +
      'mất chiếc chìa duy nhất. Cuối cùng bộ đếm trở về <b>1</b> — cân bằng, không rò rỉ.</p>' +
      '<p>Semaphore khởi tạo bằng 1 gọi là <i>nhị phân</i> và hoạt động như mutex. Khởi tạo ' +
      'bằng N thì cho phép tối đa N bên cùng vào — ví dụ giới hạn số kết nối đồng thời tới một ' +
      'daemon.</p>' },

    { t: 'code', where: 'wsl', code:
      'ls -l /dev/shm/' },

    { t: 'code', where: 'out', nocopy: true, code:
      'total 4\n' +
      '-rw------- 1 shinarus shinarus 32 Aug  3 21:58 sem.khoa_uart' },

    { t: 'cal', kind: 'tip', title: 'sem.khoa_uart — semaphore cũng chỉ là một file 32 byte trong RAM', x:
      '<p>Semaphore POSIX có tên được cài đặt ngay trên <code>/dev/shm</code>, với tiền tố ' +
      '<code>sem.</code> thêm vào tên bạn đặt. Nó cũng <b>kiên trì</b> đúng như bộ nhớ chia sẻ ' +
      '— và đó là nguồn gốc của một lỗi kinh điển.</p>' +
      '<p>Hãy tưởng tượng: daemon lấy semaphore rồi sập trước khi kịp <code>sem_post</code>. Bộ ' +
      'đếm mắc kẹt ở 0 <b>vĩnh viễn</b>. Khởi động lại daemon cũng vô ích — nó ' +
      '<code>sem_open</code> đúng cái semaphore cũ, thấy 0, và treo ngay lập tức. Trên thiết ' +
      'bị, triệu chứng là "dịch vụ không khởi động lại được sau khi crash, phải reboot mới ' +
      'chạy".</p>' +
      '<p>Cách chữa chính là dòng đầu tiên trong chương trình trên: <code>sem_unlink(TEN)</code> ' +
      '<b>trước</b> khi <code>sem_open</code>. Và <code>rm /dev/shm/sem.*</code> là mẹo cấp cứu ' +
      'đáng nhớ khi gỡ lỗi tại hiện trường.</p>' },

    /* ══════════════════════════════════════════════
       8. ĐO TỐC ĐỘ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đo thật: cơ chế nào nhanh hơn cơ chế nào, và nhanh hơn bao nhiêu' },

    { t: 'p', x:
      'Lý thuyết đã nói bộ nhớ chia sẻ phải nhanh nhất. Giờ hãy bắt nó chứng minh. Bài đo ' +
      'chuyển <b>20 000</b> khối × <b>4096</b> byte = <b>78,1 MB</b> qua từng cơ chế, giữa hai ' +
      'tiến trình thật.' },

    { t: 'code', where: 'wsl', code:
      './dosuc' },

    { t: 'code', where: 'out', nocopy: true, code:
      'chuyen 20000 khoi x 4096 byte = 78.1 MB\n' +
      '\n' +
      'co che           thoi gian   thong luong      do tre\n' +
      '---------------------------------------------------------\n' +
      'pipe               0.031 s     2490.2 MB/s     1.57 us/khoi\n' +
      'FIFO               0.033 s     2383.8 MB/s     1.64 us/khoi\n' +
      'message queue      0.045 s     1741.6 MB/s     2.24 us/khoi\n' +
      'shared memory      0.007 s    10533.0 MB/s     0.37 us/khoi',
      notes: ['Mã nguồn đầy đủ của <code>dosuc.c</code> nằm ở bước 3 phần thực hành.',
        'Chạy 5 lần rồi lấy khoảng, đừng tin một lần chạy — bạn sẽ thấy ngay vì sao ở bảng dưới.'] },

    { t: 'table', head: ['Cơ chế', 'Thông lượng (5 lần chạy)', 'Độ trễ mỗi khối', 'Số syscall / 1000 khối'],
      rows: [
        ['<b>Bộ nhớ chia sẻ</b>', '<b>8 177 – 10 533 MB/s</b>', '<b>0,37 – 0,48 µs</b>', '<b>1</b>'],
        ['pipe', '670 – 2 490 MB/s', '1,57 – 5,83 µs', '2 001'],
        ['FIFO', '1 372 – 2 711 MB/s', '1,44 – 2,85 µs', '2 001'],
        ['message queue', '928 – 2 131 MB/s', '1,83 – 4,21 µs', '2 000']
      ]},

    { t: 'p', x:
      'Con số cuối cùng — số syscall — không phải suy đoán. <code>strace -c</code> đếm hộ:' },

    { t: 'code', where: 'wsl', code:
      'strace -f -c -e trace=read,write ./n_pipe 2>&1 | tail -6\n' +
      'strace -f -c -e trace=read,write ./n_shm  2>&1 | tail -6' },

    { t: 'code', where: 'out', nocopy: true, code:
      '% time     seconds  usecs/call     calls    errors syscall\n' +
      '------ ----------- ----------- --------- --------- ----------------\n' +
      ' 66.36    0.028646          28      1001           read\n' +
      ' 33.64    0.014519          14      1000           write\n' +
      '------ ----------- ----------- --------- --------- ----------------\n' +
      '100.00    0.043165          21      2001           total\n' +
      '\n' +
      '% time     seconds  usecs/call     calls    errors syscall\n' +
      '------ ----------- ----------- --------- --------- ----------------\n' +
      '  0.00    0.000000           0         1           read\n' +
      '------ ----------- ----------- --------- --------- ----------------\n' +
      '100.00    0.000000           0         1           total' },

    { t: 'cal', kind: 'why', title: '2001 so với 1 — cả bảng tốc độ nằm trong hai con số này', x:
      '<p>Cùng chuyển 1000 khối 4 KB. Pipe tốn <b>2001</b> lần vượt ranh giới user/kernel — ' +
      'chính cái ranh giới bạn đã mổ xẻ ở Bài 19. Bộ nhớ chia sẻ tốn <b>1</b> (đó là lần ' +
      '<code>read</code> lúc nạp chương trình, không liên quan gì tới truyền dữ liệu).</p>' +
      '<p>Sau <code>mmap</code>, chép dữ liệu qua bộ nhớ chia sẻ chỉ là <code>memcpy</code> ' +
      'thuần tuý trong không gian người dùng. Nhân <b>hoàn toàn không biết</b> chuyện đó đang ' +
      'xảy ra. Đó là lý do nó nhanh hơn khoảng <b>4–5 lần</b> về thông lượng.</p>' +
      '<p>Nhưng hãy nhìn cột "thông lượng" kỹ hơn — có một điều còn quan trọng hơn tốc độ.</p>' },

    { t: 'cal', kind: 'tip', title: 'Với hệ thời gian thực, tính ổn định quan trọng hơn tốc độ', x:
      '<p>Qua 5 lần chạy, pipe dao động từ <b>670</b> tới <b>2 490 MB/s</b> — chênh nhau ' +
      '<b>3,7 lần</b>. Bộ nhớ chia sẻ dao động từ <b>8 177</b> tới <b>10 533 MB/s</b> — chỉ ' +
      '<b>1,3 lần</b>.</p>' +
      '<p>Vì sao? Mỗi syscall là một cơ hội để bộ lập lịch cướp CPU của bạn. 2001 syscall = ' +
      '2001 cơ hội. Độ trễ mỗi khối của pipe vì thế trải từ 1,57 tới 5,83 µs tuỳ lúc máy bận ' +
      'hay rảnh.</p>' +
      '<p>Trong điều khiển thời gian thực, câu hỏi không phải "trung bình nhanh bao nhiêu" mà ' +
      '<b>"lần chậm nhất chậm đến đâu"</b>. Một vòng điều khiển động cơ chấp nhận được 5 µs ổn ' +
      'định, nhưng không chấp nhận được 1 µs mà thỉnh thoảng vọt lên 50 µs. Đây là lý do sâu xa ' +
      'nhất khiến bộ nhớ chia sẻ vẫn được dùng dù nó phiền phức — và <b>độ jitter</b> sẽ là chủ ' +
      'đề trung tâm của <b>Chặng 12</b>.</p>' },

    /* ══════════════════════════════════════════════
       9. CÁI GIÁ CỦA BỘ NHỚ CHIA SẺ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cái giá của tốc độ: race condition quay trở lại, lần này giữa hai tiến trình' },

    { t: 'p', x:
      'Bốn cơ chế kia đều <b>tự đồng bộ</b>: nhân bảo đảm một lời <code>read</code> lấy đúng ' +
      'những gì một lời <code>write</code> đặt vào, không lẫn lộn. Bộ nhớ chia sẻ vứt bỏ bảo ' +
      'đảm đó cùng với việc vứt bỏ nhân. Kết quả: mọi bài học ở Bài 22 quay lại nguyên vẹn.' },

    { t: 'code', where: 'file', name: 'dua_lien.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <sys/mman.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      '#define N 200000\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    shm_unlink("/dua_lien");\n' +
      '    int fd = shm_open("/dua_lien", O_CREAT | O_RDWR, 0600);\n' +
      '    if (ftruncate(fd, sizeof(long))) { perror("ftruncate"); exit(1); }\n' +
      '    long *dem = mmap(NULL, sizeof(long), PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);\n' +
      '    close(fd);\n' +
      '    *dem = 0;\n' +
      '\n' +
      '    for (int i = 0; i < 2; i++)\n' +
      '        if (fork() == 0) {\n' +
      '            for (int j = 0; j < N; j++) (*dem)++;      /* KHONG bao ve */\n' +
      '            _exit(0);\n' +
      '        }\n' +
      '    for (int i = 0; i < 2; i++) wait(NULL);\n' +
      '\n' +
      '    printf("mong doi %d, thuc te %ld, mat %ld\\n", 2 * N, *dem, 2L * N - *dem);\n' +
      '    munmap(dem, sizeof(long));\n' +
      '    shm_unlink("/dua_lien");\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -O0 -o dua_lien dua_lien.c\n' +
      'for i in 1 2 3; do ./dua_lien; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'mong doi 400000, thuc te 220650, mat 179350\n' +
      'mong doi 400000, thuc te 400000, mat 0\n' +
      'mong doi 400000, thuc te 301309, mat 98691' },

    { t: 'cal', kind: 'danger', title: 'Lần chạy thứ hai ra đúng — và đó là lần đáng sợ nhất', x:
      '<p>Ba lần chạy: sai, <b>đúng</b>, sai. Nếu bạn xui và chỉ chạy đúng một lần — lần thứ ' +
      'hai — bạn sẽ kết luận chương trình không có lỗi và mang nó ra sản xuất.</p>' +
      '<p>Đây chính xác là cái bẫy <code>-O2</code> ở Bài 22, khoác một bộ áo khác. Bài học ' +
      'lặp lại y nguyên: <b>một lần chạy đúng không chứng minh được gì cả về race condition.</b> ' +
      'Chỉ có phân tích mã và công cụ mới chứng minh được.</p>' +
      '<p>Và lưu ý điều mới ở đây: hai <b>tiến trình</b> riêng biệt, mỗi cái có không gian địa ' +
      'chỉ độc lập, MMU vẫn canh gác đầy đủ — nhưng vẫn tranh nhau. Vì <code>(*dem)++</code> ' +
      'trỏ vào <b>cùng một khung trang vật lý</b>, nên nó vẫn là <code>mov</code> / ' +
      '<code>add</code> / <code>mov</code> không nguyên tử, y hệt như hai luồng.</p>' },

    { t: 'p', x:
      'Cách sửa đẹp nhất: đặt luôn một <code>pthread_mutex_t</code> <b>bên trong</b> vùng chia ' +
      'sẻ, và khai báo nó thuộc loại dùng chung giữa các tiến trình.' },

    { t: 'code', where: 'file', name: 'khoa_lien.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <pthread.h>\n' +
      '#include <sys/mman.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      '#define N 200000\n' +
      '\n' +
      'struct vung {\n' +
      '    pthread_mutex_t khoa;        /* khoa nam NGAY TRONG vung chia se */\n' +
      '    long dem;\n' +
      '};\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    shm_unlink("/khoa_lien");\n' +
      '    int fd = shm_open("/khoa_lien", O_CREAT | O_RDWR, 0600);\n' +
      '    if (ftruncate(fd, sizeof(struct vung))) { perror("ftruncate"); exit(1); }\n' +
      '    struct vung *v = mmap(NULL, sizeof *v, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);\n' +
      '    close(fd);\n' +
      '\n' +
      '    pthread_mutexattr_t at;\n' +
      '    pthread_mutexattr_init(&at);\n' +
      '    pthread_mutexattr_setpshared(&at, PTHREAD_PROCESS_SHARED);   /* <-- mau chot */\n' +
      '    pthread_mutex_init(&v->khoa, &at);\n' +
      '    pthread_mutexattr_destroy(&at);\n' +
      '    v->dem = 0;\n' +
      '\n' +
      '    for (int i = 0; i < 2; i++)\n' +
      '        if (fork() == 0) {\n' +
      '            for (int j = 0; j < N; j++) {\n' +
      '                pthread_mutex_lock(&v->khoa);\n' +
      '                v->dem++;\n' +
      '                pthread_mutex_unlock(&v->khoa);\n' +
      '            }\n' +
      '            _exit(0);\n' +
      '        }\n' +
      '    for (int i = 0; i < 2; i++) wait(NULL);\n' +
      '\n' +
      '    printf("mong doi %d, thuc te %ld\\n", 2 * N, v->dem);\n' +
      '    pthread_mutex_destroy(&v->khoa);\n' +
      '    munmap(v, sizeof *v);\n' +
      '    shm_unlink("/khoa_lien");\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -O0 -o khoa_lien khoa_lien.c\n' +
      'for i in 1 2 3; do ./khoa_lien; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'mong doi 400000, thuc te 400000\n' +
      'mong doi 400000, thuc te 400000\n' +
      'mong doi 400000, thuc te 400000' },

    { t: 'p', x:
      'Bỏ đúng một dòng — dòng <code>setpshared</code> — rồi chạy lại:' },

    { t: 'code', where: 'wsl', code:
      'sed \'s|pthread_mutexattr_setpshared(&at, PTHREAD_PROCESS_SHARED);|/* quen dong nay */|\' khoa_lien.c > quen.c\n' +
      'gcc -Wall -Wextra -pthread -O0 -o quen quen.c\n' +
      './quen' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Fatal glibc error: pthread_mutex_lock.c:88 (___pthread_mutex_lock): assertion failed: mutex->__data.__owner == 0\n' +
      'mong doi 400000, thuc te 204703' },

    { t: 'cal', kind: 'why', title: 'Vì sao mutex "bình thường" không dùng được giữa hai tiến trình?', x:
      '<p>Mutex mặc định là <code>PTHREAD_PROCESS_PRIVATE</code>. glibc được phép tối ưu dựa ' +
      'trên giả định "chỉ các luồng trong tiến trình này chạm vào" — ví dụ lưu trong đó định ' +
      'danh luồng sở hữu, thứ chỉ có ý nghĩa nội bộ, và đặt cờ futex ở chế độ riêng tư.</p>' +
      '<p>Khi hai tiến trình khác nhau cùng dùng nó, các giả định đó vỡ. glibc phát hiện ra và ' +
      'bắn ra <code>Fatal glibc error … assertion failed</code>, rồi kết quả sai luôn: ' +
      '<b>204 703</b> thay vì 400 000.</p>' +
      '<p><code>pthread_mutexattr_setpshared(&amp;at, PTHREAD_PROCESS_SHARED)</code> báo cho ' +
      'glibc biết sự thật, để nó dùng futex chia sẻ và bỏ mọi tối ưu riêng tư. Đây là dòng dễ ' +
      'quên nhất trong toàn bộ lập trình IPC — và nó không sinh cảnh báo lúc biên dịch, chỉ nổ ' +
      'lúc chạy, đôi khi chỉ nổ trên thiết bị chứ không nổ trên máy phát triển.</p>' +
      '<p>Cùng ý tưởng áp dụng cho biến điều kiện: <code>pthread_condattr_setpshared</code>. ' +
      'Ngoài ra, semaphore POSIX có tên vốn <b>đã</b> là liên tiến trình sẵn — đó là lý do người ' +
      'ta hay chọn nó khi không muốn nghĩ nhiều.</p>' },

    /* ══════════════════════════════════════════════
       10. BẢNG CHỌN CƠ CHẾ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bảng chọn cơ chế: câu hỏi nào dẫn tới câu trả lời nào' },

    { t: 'p', x:
      'Đây là phần đáng chép ra sổ tay nhất của bài. Đừng chọn cơ chế theo thói quen hay theo ' +
      'cái bạn nhớ tên; hãy chọn theo tình huống.' },

    { t: 'table',
      head: ['Tình huống', 'Chọn', 'Vì sao'],
      rows: [
        ['Cha đẻ ra con rồi truyền dữ liệu một chiều cho nó',
         '<b>pipe</b>',
         'Đơn giản nhất, không để lại rác trên hệ thống tập tin, tự chết khi cả hai đóng'],

        ['Hai dịch vụ độc lập do systemd khởi động, luồng dữ liệu một chiều',
         '<b>FIFO</b>',
         'Có tên nên không cần họ hàng; quyền Unix kiểm soát được ai gửi ai nhận'],

        ['Truyền khối lớn, thường xuyên, cần độ trễ thấp và <b>ổn định</b>',
         '<b>Bộ nhớ chia sẻ</b>',
         '<b>0,37–0,48 µs</b> mỗi khối 4 KB, jitter chỉ 1,3× so với 3,7× của pipe. Đổi lại bạn phải tự đồng bộ'],

        ['Gói tin rời rạc, có loại quan trọng phải vượt lên trước',
         '<b>Hàng đợi thông điệp</b>',
         'Nhân lo giữ ranh giới gói và sắp xếp theo ưu tiên; bạn không phải viết bộ đệm nào'],

        ['Nhiều tiến trình tranh nhau một tài nguyên (UART, GPIO, thẻ nhớ)',
         '<b>Semaphore</b>',
         'Không chuyển dữ liệu, chỉ đếm chỗ. Khởi tạo 1 thì như mutex, khởi tạo N thì giới hạn N bên'],

        ['Bảo vệ dữ liệu <i>bên trong</i> một vùng nhớ chia sẻ',
         '<b>mutex có <code>PTHREAD_PROCESS_SHARED</code></b>',
         'Đặt khoá ngay trong vùng chia sẻ, cùng vòng đời với dữ liệu nó bảo vệ'],

        ['Hai bên nằm trên <b>hai máy khác nhau</b>',
         '<b>Socket</b>',
         'Cơ chế duy nhất trong danh sách vượt được ranh giới máy. Nội dung của Bài 24'],

        ['Chỉ cần báo "có chuyện xảy ra", không kèm dữ liệu',
         '<b>Tín hiệu</b> hoặc <code>eventfd</code>',
         'Bạn đã học tín hiệu ở Bài 21. Nhẹ nhất, nhưng không mang được thông tin gì ngoài "đã xảy ra"']
      ]},

    { t: 'cal', kind: 'tip', title: 'Quy tắc thực dụng: bắt đầu từ cơ chế đơn giản nhất còn dùng được', x:
      '<p>Bộ nhớ chia sẻ nhanh hơn <b>4–5 lần</b>. Nhưng nhìn lại xem nó đòi bạn những gì: ' +
      '<code>shm_open</code> + <code>ftruncate</code> + <code>mmap</code>, mutex ' +
      '<code>PTHREAD_PROCESS_SHARED</code>, nhớ <code>shm_unlink</code> lúc tắt, và một lớp ' +
      'race condition mà lần chạy đúng không chứng minh được gì.</p>' +
      '<p>Pipe thì: <code>pipe()</code>, hết.</p>' +
      '<p>Nếu daemon của bạn gửi một dòng đo mỗi giây, chênh lệch giữa 1,57 µs và 0,37 µs là ' +
      '<b>một phần triệu</b> của mỗi chu kỳ. Chọn bộ nhớ chia sẻ lúc đó là mua rắc rối bằng ' +
      'tiền mặt mà không nhận được gì.</p>' +
      '<p>Bộ nhớ chia sẻ xứng đáng khi dữ liệu <b>lớn</b> (khung hình, khối ADC), ' +
      '<b>dày</b> (hàng nghìn lần mỗi giây), hoặc khi bạn cần <b>độ trễ ổn định</b>. Ba trường ' +
      'hợp đó thôi. Ngoài ra thì pipe hoặc FIFO gần như luôn là câu trả lời đúng.</p>' },

    { t: 'fig', cap:
      'Cây quyết định. Câu hỏi đầu tiên luôn là "hai bên có cùng máy không" — nếu không, mọi ' +
      'cơ chế trong bài này đều vô dụng và bạn cần socket ở Bài 24.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" ' +
      'aria-label="Cây quyết định chọn cơ chế IPC theo bốn câu hỏi">' +
      '<rect class="d-box-p" x="240" y="10" width="240" height="34" rx="6"/>' +
      '<text class="d-t" x="360" y="32" text-anchor="middle">Hai bên có cùng một máy?</text>' +
      '<line class="d-line" x1="240" y1="27" x2="150" y2="27"/>' +
      '<line class="d-line" x1="150" y1="27" x2="150" y2="52"/>' +
      '<path class="d-arrow" d="M150 60 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="186" y="22" text-anchor="middle">không</text>' +
      '<rect class="d-box-a" x="80" y="62" width="140" height="34" rx="6"/>' +
      '<text class="d-t" x="150" y="84" text-anchor="middle">Socket → Bài 24</text>' +
      '<line class="d-line" x1="360" y1="44" x2="360" y2="66"/>' +
      '<path class="d-arrow" d="M360 74 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="392" y="60" text-anchor="middle">có</text>' +

      '<rect class="d-box-p" x="240" y="76" width="240" height="34" rx="6"/>' +
      '<text class="d-t" x="360" y="98" text-anchor="middle">Cần chuyển dữ liệu, hay chỉ điều phối?</text>' +
      '<line class="d-line" x1="480" y1="93" x2="570" y2="93"/>' +
      '<line class="d-line" x1="570" y1="93" x2="570" y2="118"/>' +
      '<path class="d-arrow" d="M570 126 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="534" y="88" text-anchor="middle">điều phối</text>' +
      '<rect class="d-box-a" x="500" y="128" width="140" height="34" rx="6"/>' +
      '<text class="d-t" x="570" y="150" text-anchor="middle">Semaphore</text>' +
      '<line class="d-line" x1="360" y1="110" x2="360" y2="132"/>' +
      '<path class="d-arrow" d="M360 140 l-4 -8 h8 z"/>' +

      '<rect class="d-box-p" x="240" y="142" width="240" height="34" rx="6"/>' +
      '<text class="d-t" x="360" y="164" text-anchor="middle">Khối lớn và dày, cần trễ ổn định?</text>' +
      '<line class="d-line" x1="240" y1="159" x2="150" y2="159"/>' +
      '<line class="d-line" x1="150" y1="159" x2="150" y2="184"/>' +
      '<path class="d-arrow" d="M150 192 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="192" y="154" text-anchor="middle">có</text>' +
      '<rect class="d-box-g" x="60" y="194" width="180" height="46" rx="6"/>' +
      '<text class="d-t" x="150" y="214" text-anchor="middle">Bộ nhớ chia sẻ</text>' +
      '<text class="d-ts" x="150" y="231" text-anchor="middle">+ mutex PROCESS_SHARED</text>' +
      '<line class="d-line" x1="360" y1="176" x2="360" y2="198"/>' +
      '<path class="d-arrow" d="M360 206 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="396" y="192" text-anchor="middle">không</text>' +

      '<rect class="d-box-p" x="240" y="208" width="240" height="34" rx="6"/>' +
      '<text class="d-t" x="360" y="230" text-anchor="middle">Gói rời rạc, có mức ưu tiên?</text>' +
      '<line class="d-line" x1="480" y1="225" x2="570" y2="225"/>' +
      '<line class="d-line" x1="570" y1="225" x2="570" y2="250"/>' +
      '<path class="d-arrow" d="M570 258 l-4 -8 h8 z"/>' +
      '<text class="d-ts" x="530" y="220" text-anchor="middle">có</text>' +
      '<rect class="d-box-a" x="490" y="260" width="160" height="34" rx="6"/>' +
      '<text class="d-t" x="570" y="282" text-anchor="middle">Hàng đợi thông điệp</text>' +
      '<line class="d-line" x1="360" y1="242" x2="360" y2="258"/>' +
      '<path class="d-arrow" d="M360 264 l-4 -8 h8 z"/>' +
      '<rect class="d-box-g" x="230" y="264" width="200" height="32" rx="6"/>' +
      '<text class="d-t" x="330" y="285" text-anchor="middle">pipe (họ hàng) / FIFO (không)</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       11. /dev/mem
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'mmap trên /dev/mem: chạm thẳng vào thanh ghi phần cứng' },

    { t: 'p', x:
      'Bạn vừa dùng <code>mmap</code> để hai tiến trình cùng nhìn vào một khung trang RAM. Nhưng ' +
      '<code>mmap</code> không quan tâm phía sau khung trang đó là cái gì. Nếu thứ nằm phía sau ' +
      'không phải RAM mà là <b>thanh ghi của một ngoại vi</b>, thì bạn vừa có được cách điều ' +
      'khiển phần cứng thẳng từ không gian người dùng.' },

    { t: 'p', x:
      'Đó là công dụng của <code>/dev/mem</code>: một file đại diện cho <b>toàn bộ không gian ' +
      'địa chỉ vật lý</b> của máy. Byte thứ <code>0x3F200000</code> của file này chính là ô nhớ ' +
      'vật lý <code>0x3F200000</code> — trên Raspberry Pi 2/3 đó là thanh ghi điều khiển GPIO.' },

    { t: 'code', where: 'file', name: 'docmem.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <fcntl.h>\n' +
      '#include <errno.h>\n' +
      '#include <sys/mman.h>\n' +
      '\n' +
      'int main(int argc, char **argv)\n' +
      '{\n' +
      '    off_t dc = (argc > 1) ? strtoull(argv[1], NULL, 0) : 0x0;\n' +
      '    long  ts = sysconf(_SC_PAGESIZE);\n' +
      '\n' +
      '    int fd = open("/dev/mem", O_RDONLY | O_SYNC);   /* O_SYNC: khong dung cache */\n' +
      '    if (fd == -1) { printf("open(/dev/mem) that bai: %s\\n", strerror(errno)); return 1; }\n' +
      '    printf("mo /dev/mem thanh cong, fd=%d, trang = %ld byte\\n", fd, ts);\n' +
      '\n' +
      '    off_t nen = dc & ~(off_t)(ts - 1);              /* lam tron xuong bien trang */\n' +
      '    void *m = mmap(NULL, ts, PROT_READ, MAP_SHARED, fd, nen);\n' +
      '    if (m == MAP_FAILED) {\n' +
      '        printf("mmap tai 0x%llx that bai: %s\\n",\n' +
      '               (unsigned long long)nen, strerror(errno));\n' +
      '        close(fd); return 2;\n' +
      '    }\n' +
      '\n' +
      '    volatile unsigned int *r = (unsigned int *)((char *)m + (dc - nen));\n' +
      '    printf("dia chi vat ly 0x%08llx = 0x%08x\\n", (unsigned long long)dc, *r);\n' +
      '\n' +
      '    munmap(m, ts);\n' +
      '    close(fd);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o docmem docmem.c\n' +
      'ls -l /dev/mem\n' +
      './docmem 0x0\n' +
      'echo "ma thoat = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'crw-r----- 1 root kmem 1, 1 Aug  4 21:36 /dev/mem\n' +
      'open(/dev/mem) that bai: Permission denied\n' +
      'ma thoat = 1' },

    { t: 'cal', kind: 'info', title: 'Thất bại này là kết quả đúng, và nó dạy được ba điều', x:
      '<p>Chương trình không chạy được trên máy của bạn — hãy đọc kỹ vì sao, vì mỗi lý do đều ' +
      'sẽ gặp lại trên thiết bị thật:</p>' +
      '<ol>' +
      '<li><b>Quyền.</b> <code>crw-r----- root kmem</code> — chỉ <code>root</code> và nhóm ' +
      '<code>kmem</code> đọc được. Tài khoản <code>shinarus</code> không thuộc nhóm nào trong ' +
      'hai nhóm đó. Trên thiết bị nhúng, ứng dụng thường chạy bằng <code>root</code> nên bước ' +
      'này qua được — và đó vừa là tiện lợi vừa là rủi ro an ninh.</li>' +
      '<li><b><code>CONFIG_STRICT_DEVMEM=y</code>.</b> Nhân này bật tuỳ chọn đó, nghĩa là dù có ' +
      'quyền root bạn <i>vẫn</i> không đọc được vùng RAM thường — chỉ vùng I/O ánh xạ được ' +
      'phép. Đây là hàng rào ngăn một tiến trình root moi khoá mật mã ra khỏi RAM của tiến ' +
      'trình khác.</li>' +
      '<li><b>WSL2 không có ngoại vi.</b> Máy ảo này không có GPIO, không có I2C, không có ' +
      'thanh ghi ngoại vi nào để chạm vào. Bạn sẽ chạy được <code>docmem</code> thật khi có ' +
      'thiết bị hoặc khi dùng máy QEMU có mô phỏng ngoại vi ở <b>Chặng 05</b>.</li>' +
      '</ol>' +
      '<p>Cũng thử <code>head -12 /proc/iomem</code> — bạn sẽ thấy mọi địa chỉ đều là ' +
      '<code>00000000-00000000</code>. Nhân cố tình giấu địa chỉ vật lý thật với người dùng ' +
      'không đặc quyền, cùng một lý do bảo mật.</p>' },

    { t: 'cmdx', cmd: 'open("/dev/mem", O_RDONLY | O_SYNC) → mmap(NULL, ts, PROT_READ, MAP_SHARED, fd, nen)',
      title: 'Bốn chi tiết bắt buộc khi ánh xạ thanh ghi (và vì sao)',
      rows: [
        ['<code>O_SYNC</code>', 'Yêu cầu ánh xạ <b>không qua cache</b>', 'Bắt buộc. Thanh ghi phần cứng đổi giá trị mà CPU không hay; đọc qua cache sẽ trả về giá trị cũ vĩnh viễn'],
        ['<code>nen = dc &amp; ~(ts-1)</code>', 'Làm tròn địa chỉ xuống biên trang 4096 byte', '<code>mmap</code> <b>bắt buộc</b> offset chia hết cho kích thước trang, nếu không trả <code>EINVAL</code>'],
        ['<code>m + (dc - nen)</code>', 'Cộng lại phần dư để trỏ đúng thanh ghi', 'Bạn ánh xạ cả trang chứa thanh ghi, rồi tự đi tới vị trí trong trang'],
        ['<code>volatile unsigned int *</code>', 'Cấm trình biên dịch tối ưu các lần đọc/ghi', 'Đây là một trong số rất ít chỗ <code>volatile</code> <b>thật sự</b> đúng — khác hẳn việc dùng nó chống race ở Bài 22, vốn là sai']
      ]},

    { t: 'cal', kind: 'warn', title: '/dev/mem là cách làm của thời trước — và nó có tuổi', x:
      '<p>Ánh xạ <code>/dev/mem</code> từng là cách phổ biến để điều khiển GPIO trên Raspberry ' +
      'Pi. Nó vẫn chạy, nhưng ngày nay bị coi là lối tắt tạm bợ, vì ba lý do:</p>' +
      '<ul>' +
      '<li>Đòi <b>root</b> cho toàn bộ ứng dụng, chỉ để chạm một chân GPIO.</li>' +
      '<li>Nhân <b>không biết</b> bạn đang dùng thanh ghi đó, nên nếu có driver cũng đang dùng, ' +
      'hai bên giẫm lên nhau không ai phát hiện.</li>' +
      '<li>Địa chỉ vật lý <b>gắn cứng</b> vào mã. Đổi sang bo mạch khác là phải sửa mã và dịch ' +
      'lại — trái ngược hoàn toàn với tinh thần Device Tree ở <b>Chặng 08</b>.</li>' +
      '</ul>' +
      '<p>Cách làm đúng ngày nay: dùng giao diện của nhân — <code>/sys/class/gpio</code> (đã cũ) ' +
      'hoặc <code>libgpiod</code> qua <code>/dev/gpiochipN</code> (hiện hành, và ' +
      '<code>gpiod</code> đã được cài sẵn trên máy này), hoặc viết hẳn một driver kernel ở ' +
      '<b>Chặng 10</b>.</p>' +
      '<p>Vẫn nên biết <code>/dev/mem</code>, vì nó là công cụ <b>chẩn đoán</b> vô giá: khi ' +
      'driver của bạn không hoạt động, đọc thẳng thanh ghi bằng ' +
      '<code>devmem2</code> hay <code>busybox devmem</code> sẽ cho biết vấn đề nằm ở phần cứng ' +
      'hay ở phần mềm của bạn.</p>' },

    /* ══════════════════════════════════════════════
       12. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: dựng bốn kênh, đo cả bốn, rồi chọn một' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai23 && cd ~/embedded/bai23' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Pipe: chứng minh vì sao phải đóng đầu ống không dùng',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>ong.c</code> ở phần lý thuyết và chạy để có bản chuẩn. Sau đó cố tình ' +
            'phá nó theo đúng cách mà người mới hay phá.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o ong ong.c && ./ong\n' +
            'echo "--- ban HONG: con quen close(fd[1]) ---"\n' +
            'sed \'s|        close(fd\\[1\\]);|        /* QUEN close(fd[1]) */|\' ong.c > ong_hong.c\n' +
            'gcc -Wall -Wextra -o ong_hong ong_hong.c\n' +
            'timeout 5 ./ong_hong\n' +
            'echo "ma thoat = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pipe() tao ra fd[0]=3 (doc), fd[1]=4 (ghi)\n' +
            '  [con  pid=430] nhan 14 byte: nhiet do 42.5\n' +
            '  [con  pid=430] nhan 14 byte: nhiet do 43.1\n' +
            '[cha  pid=429] dong dau ghi\n' +
            '  [con  pid=430] read tra ve 0 -> ben ghi da dong\n' +
            '--- ban HONG: con quen close(fd[1]) ---\n' +
            'pipe() tao ra fd[0]=3 (doc), fd[1]=4 (ghi)\n' +
            '  [con  pid=465] nhan 14 byte: nhiet do 42.5\n' +
            '  [con  pid=465] nhan 14 byte: nhiet do 43.1\n' +
            '[cha  pid=464] dong dau ghi\n' +
            'ma thoat = 124',
            notes: ['Bản hỏng nhận đủ dữ liệu rồi <b>treo</b>: dòng "read tra ve 0" không bao ' +
              'giờ xuất hiện, và <code>timeout</code> phải giết nó — mã <b>124</b>, đúng con ' +
              'số bạn đã gặp khi gây deadlock ở Bài 22.',
              'Con số PID trên máy bạn sẽ khác. Điều cần đối chiếu là <i>số dòng</i> và ' +
              '<i>mã thoát</i>.'] },

          { t: 'cal', kind: 'why', title: 'Không lỗi, không log, chỉ treo — vì sao đây là lỗi khó nhất', x:
            '<p>Tiến trình con vẫn đang giữ một bản sao của đầu ghi. Nhân đếm thấy còn <b>1</b> ' +
            'đầu ghi đang mở, nên nó tuyệt đối đúng khi giữ <code>read()</code> lại: có thể sẽ ' +
            'còn dữ liệu tới. Con đang chờ chính nó.</p>' +
            '<p>Chú ý là dữ liệu đã tới nơi <b>đầy đủ</b> — hai dòng đo hiện ra bình thường. ' +
            'Chỉ mỗi việc kết thúc là không xảy ra. Loại lỗi này rất dễ lọt qua test, vì test ' +
            'thường kiểm tra "dữ liệu có đúng không" chứ ít khi kiểm tra "chương trình có ' +
            'thoát không".</p>' +
            '<p>Trên thiết bị, triệu chứng là "dịch vụ chạy đúng nhưng không bao giờ tắt được, ' +
            'systemd phải chờ 90 giây rồi <code>SIGKILL</code>". Nghe quen chứ? Đúng là triệu ' +
            'chứng bạn đã gặp với deadlock ở Bài 22 — hai nguyên nhân khác nhau, một biểu ' +
            'hiện. Đó là lý do phải chẩn đoán bằng <code>wchan</code> chứ không đoán mò.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — FIFO: nối hai chương trình xa lạ, và bắt gặp lỗi mất dữ liệu do bộ đệm',
        blocks: [
          { t: 'p', x:
            'Dựng một đường ống thật giữa hai tiến trình không họ hàng: một bên "đo nhiệt độ", ' +
            'một bên "ghi log". Chúng chỉ biết nhau qua cái tên <code>/tmp/dolieu</code>.' },

          { t: 'code', where: 'file', name: 'ghi_fifo.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <errno.h>\n' +
            '#include <signal.h>\n' +
            '#include <sys/stat.h>\n' +
            '\n' +
            '#define TEN "/tmp/dolieu"\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    signal(SIGPIPE, SIG_IGN);            /* bat buoc, xem phan ly thuyet */\n' +
            '\n' +
            '    if (mkfifo(TEN, 0600) == -1 && errno != EEXIST) { perror("mkfifo"); exit(1); }\n' +
            '    printf("[ghi] cho ben doc mo FIFO...\\n");\n' +
            '    fflush(stdout);\n' +
            '\n' +
            '    int fd = open(TEN, O_WRONLY);        /* CHAN cho toi khi co nguoi doc */\n' +
            '    if (fd == -1) { perror("open"); exit(1); }\n' +
            '    printf("[ghi] da noi duoc, bat dau gui\\n");\n' +
            '    fflush(stdout);\n' +
            '\n' +
            '    for (int i = 1; i <= 5; i++) {\n' +
            '        char dong[64];\n' +
            '        int n = snprintf(dong, sizeof dong, "do %d: %.1f do C\\n", i, 41.0 + i * 0.5);\n' +
            '        if (write(fd, dong, n) == -1) { perror("write"); break; }\n' +
            '        printf("[ghi] gui: %s", dong);\n' +
            '        fflush(stdout);\n' +
            '        usleep(300000);\n' +
            '    }\n' +
            '    close(fd);\n' +
            '    unlink(TEN);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o ghi_fifo ghi_fifo.c\n' +
            './ghi_fifo &\n' +
            'sleep 1\n' +
            'echo "--- ben doc chi la mot lenh cat ---"\n' +
            'cat /tmp/dolieu\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[ghi] cho ben doc mo FIFO...\n' +
            '--- ben doc chi la mot lenh cat ---\n' +
            '[ghi] da noi duoc, bat dau gui\n' +
            '[ghi] gui: do 1: 41.5 do C\n' +
            'do 1: 41.5 do C\n' +
            '[ghi] gui: do 2: 42.0 do C\n' +
            'do 2: 42.0 do C\n' +
            '[ghi] gui: do 3: 42.5 do C\n' +
            'do 3: 42.5 do C\n' +
            '[ghi] gui: do 4: 43.0 do C\n' +
            'do 4: 43.0 do C\n' +
            '[ghi] gui: do 5: 43.5 do C\n' +
            'do 5: 43.5 do C',
            notes: ['Thứ tự xen kẽ giữa hai tiến trình có thể khác chút trên máy bạn — chúng ' +
              'chạy song song thật.',
              'Điểm cần thấy: dòng <code>[ghi] da noi duoc</code> chỉ xuất hiện <b>sau</b> khi ' +
              '<code>cat</code> chạy. Đó là <code>open()</code> đang chặn, đúng như phần lý ' +
              'thuyết đã cảnh báo.'] },

          { t: 'cal', kind: 'tip', title: 'Bên nhận không cần là chương trình C', x:
            '<p>Bên đọc ở đây chỉ là <code>cat</code>. Điều đó minh hoạ đúng sức mạnh của ' +
            'FIFO: nó là một <b>file</b>, nên mọi công cụ biết đọc file đều dùng được — ' +
            '<code>cat</code>, <code>grep</code>, <code>tee</code>, một script Python, hay ' +
            'thậm chí <code>systemd-cat</code> để đẩy thẳng vào journal.</p>' +
            '<p>Trên thiết bị, đây là mẹo gỡ lỗi rất tiện: khi daemon đang chạy và bạn muốn ' +
            'xem nó gửi gì mà không dừng nó lại, chỉ cần <code>cat</code> vào cái FIFO. Không ' +
            'cần trình gỡ lỗi, không cần dựng lại chương trình.</p>' +
            '<p>Thử thêm: thay <code>cat</code> bằng <code>grep 43</code> và xem chuyện gì xảy ' +
            'ra khi bên đọc thoát sớm — bạn sẽ thấy <code>EPIPE</code> mà ' +
            '<code>signal(SIGPIPE, SIG_IGN)</code> đã cứu bạn khỏi cái chết.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Đo bốn cơ chế, và đếm syscall để giải thích kết quả',
        blocks: [
          { t: 'p', x:
            'Đây là bước quan trọng nhất của bài. Chương trình đo hơi dài, nhưng nó chỉ là bốn ' +
            'hàm cùng khuôn: tạo kênh, <code>fork</code>, cha gửi 20 000 khối, con nhận đủ ' +
            '20 000 khối, đo thời gian.' },

          { t: 'code', where: 'file', name: 'dosuc.c — phần khung', lang: 'c', code:
            '#define _GNU_SOURCE\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <time.h>\n' +
            '#include <mqueue.h>\n' +
            '#include <sys/mman.h>\n' +
            '#include <sys/wait.h>\n' +
            '#include <sys/stat.h>\n' +
            '\n' +
            '#define KHOI   4096          /* moi lan chuyen 4 KB */\n' +
            '#define LAN    20000         /* 20000 lan -> ~78 MB */\n' +
            '\n' +
            'static double giay(void)\n' +
            '{\n' +
            '    struct timespec t;\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t);\n' +
            '    return t.tv_sec + t.tv_nsec / 1e9;\n' +
            '}\n' +
            '\n' +
            'static void bao(const char *ten, double dt)\n' +
            '{\n' +
            '    double mb = (double)KHOI * LAN / (1024.0 * 1024.0);\n' +
            '    printf("%-16s %7.3f s   %8.1f MB/s   %6.2f us/khoi\\n",\n' +
            '           ten, dt, mb / dt, dt / LAN * 1e6);\n' +
            '    fflush(stdout);\n' +
            '}' },

          { t: 'code', where: 'file', name: 'dosuc.c — pipe và bộ nhớ chia sẻ', lang: 'c', code:
            'static void thu_pipe(void)\n' +
            '{\n' +
            '    int fd[2];\n' +
            '    if (pipe(fd)) { perror("pipe"); return; }\n' +
            '    char *buf = malloc(KHOI);\n' +
            '    memset(buf, \'A\', KHOI);\n' +
            '\n' +
            '    double t0 = giay();\n' +
            '    pid_t p = fork();\n' +
            '    if (p == 0) {\n' +
            '        close(fd[1]);\n' +
            '        char *r = malloc(KHOI);\n' +
            '        for (int i = 0; i < LAN; i++) {\n' +
            '            size_t con = KHOI;\n' +
            '            while (con) {                       /* read co the tra ve it hon */\n' +
            '                ssize_t n = read(fd[0], r, con);\n' +
            '                if (n <= 0) _exit(1);\n' +
            '                con -= n;\n' +
            '            }\n' +
            '        }\n' +
            '        _exit(0);\n' +
            '    }\n' +
            '    close(fd[0]);\n' +
            '    for (int i = 0; i < LAN; i++) {\n' +
            '        size_t con = KHOI; char *q = buf;\n' +
            '        while (con) {\n' +
            '            ssize_t n = write(fd[1], q, con);\n' +
            '            if (n <= 0) exit(1);\n' +
            '            con -= n; q += n;\n' +
            '        }\n' +
            '    }\n' +
            '    close(fd[1]);\n' +
            '    waitpid(p, NULL, 0);\n' +
            '    bao("pipe", giay() - t0);\n' +
            '    free(buf);\n' +
            '}\n' +
            '\n' +
            'struct vung { volatile int co; char data[KHOI]; };\n' +
            '\n' +
            'static void thu_shm(void)\n' +
            '{\n' +
            '    shm_unlink("/bench_shm");\n' +
            '    int fd = shm_open("/bench_shm", O_CREAT | O_RDWR, 0600);\n' +
            '    if (ftruncate(fd, sizeof(struct vung))) { perror("ftruncate"); return; }\n' +
            '    struct vung *v = mmap(NULL, sizeof *v, PROT_READ | PROT_WRITE,\n' +
            '                          MAP_SHARED, fd, 0);\n' +
            '    close(fd);\n' +
            '    v->co = 0;\n' +
            '\n' +
            '    double t0 = giay();\n' +
            '    pid_t p = fork();\n' +
            '    if (p == 0) {                               /* con: doi co roi ha co */\n' +
            '        for (int i = 0; i < LAN; i++) {\n' +
            '            while (__atomic_load_n(&v->co, __ATOMIC_ACQUIRE) == 0) ;\n' +
            '            __atomic_store_n(&v->co, 0, __ATOMIC_RELEASE);\n' +
            '        }\n' +
            '        _exit(0);\n' +
            '    }\n' +
            '    for (int i = 0; i < LAN; i++) {             /* cha: ghi roi dung co */\n' +
            '        memset(v->data, \'A\', KHOI);\n' +
            '        __atomic_store_n(&v->co, 1, __ATOMIC_RELEASE);\n' +
            '        while (__atomic_load_n(&v->co, __ATOMIC_ACQUIRE) == 1) ;\n' +
            '    }\n' +
            '    waitpid(p, NULL, 0);\n' +
            '    bao("shared memory", giay() - t0);\n' +
            '    munmap(v, sizeof *v);\n' +
            '    shm_unlink("/bench_shm");\n' +
            '}',
            notes: ['Hai hàm còn lại, <code>thu_fifo</code> và <code>thu_mq</code>, viết theo ' +
              'đúng khuôn này — hãy tự viết trước khi đọc gợi ý ở phần "Lỗi thường gặp".',
              'Hàm <code>main</code> chỉ gọi lần lượt bốn hàm rồi in tiêu đề bảng.'] },

          { t: 'cal', kind: 'why', title: 'Vì sao vòng while quanh mỗi read và write?', x:
            '<p><code>read()</code> và <code>write()</code> <b>không hứa</b> chuyển đủ số byte ' +
            'bạn yêu cầu. Chúng trả về số byte <i>thực sự</i> chuyển được, có thể ít hơn — ' +
            'nhất là khi bộ đệm 64 KB của pipe gần đầy hoặc gần cạn.</p>' +
            '<p>Bỏ vòng <code>while</code> đi thì bài đo vẫn <i>chạy</i> và vẫn in ra con số ' +
            'đẹp, chỉ có điều nó đo sai — vì hai bên lệch pha nhau. Đây là loại lỗi âm thầm ' +
            'nguy hiểm nhất trong lập trình I/O, và nó cũng chính là lỗi đứng sau vô số bug ' +
            '"mất dữ liệu ngẫu nhiên" trong mã mạng.</p>' +
            '<p>Ghi nhớ quy tắc: <b>mọi <code>read</code> và <code>write</code> trên pipe, FIFO ' +
            'hay socket đều phải nằm trong vòng lặp cho tới khi đủ số byte.</b> Bài 24 sẽ dùng ' +
            'lại quy tắc này ngay từ dòng đầu.</p>' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o dosuc dosuc.c\n' +
            'for i in 1 2 3 4 5; do ./dosuc | tail -4; echo "  ---"; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pipe               0.041 s     1894.4 MB/s     2.06 us/khoi\n' +
            'FIFO               0.032 s     2424.6 MB/s     1.61 us/khoi\n' +
            'message queue      0.037 s     2130.5 MB/s     1.83 us/khoi\n' +
            'shared memory      0.008 s     9877.9 MB/s     0.40 us/khoi\n' +
            '  ---\n' +
            'pipe               0.031 s     2490.2 MB/s     1.57 us/khoi\n' +
            'FIFO               0.033 s     2383.8 MB/s     1.64 us/khoi\n' +
            'message queue      0.045 s     1741.6 MB/s     2.24 us/khoi\n' +
            'shared memory      0.007 s    10533.0 MB/s     0.37 us/khoi\n' +
            '  ---\n' +
            'pipe               0.117 s      670.5 MB/s     5.83 us/khoi\n' +
            'FIFO               0.043 s     1823.2 MB/s     2.14 us/khoi\n' +
            'message queue      0.046 s     1682.5 MB/s     2.32 us/khoi\n' +
            'shared memory      0.008 s     9835.5 MB/s     0.40 us/khoi',
            notes: ['Rút gọn còn 3/5 lần chạy. Hãy ghi lại <b>khoảng</b> của máy bạn, đừng ghi ' +
              'một con số duy nhất.',
              'Để ý lần chạy thứ ba: pipe tụt xuống 670 MB/s trong khi bộ nhớ chia sẻ gần như ' +
              'không đổi. Đó là bài học thật của bước này.'] },

          { t: 'p', x:
            'Giờ chứng minh nguyên nhân bằng cách <b>đếm</b> chứ không phỏng đoán:' },

          { t: 'code', where: 'wsl', code:
            'strace -f -c -e trace=read,write ./n_pipe 2>&1 | tail -3\n' +
            'strace -f -c -e trace=read,write ./n_shm  2>&1 | tail -3\n' +
            'echo "--- shm_open thuc chat la gi? ---"\n' +
            'strace -e trace=openat,ftruncate,mmap ./n_shm 2>&1 | grep -E "n_shm|ftruncate" | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '------ ----------- ----------- --------- --------- ----------------\n' +
            '100.00    0.043165          21      2001           total\n' +
            '------ ----------- ----------- --------- --------- ----------------\n' +
            '100.00    0.000000           0         1           total\n' +
            '--- shm_open thuc chat la gi? ---\n' +
            'openat(AT_FDCWD, "/dev/shm/n_shm", O_RDWR|O_CREAT|O_NOFOLLOW|O_CLOEXEC, 0600) = 3\n' +
            'ftruncate(3, 4100)                      = 0\n' +
            'mmap(NULL, 4100, PROT_READ|PROT_WRITE, MAP_SHARED, 3, 0) = 0x71cda56c2000',
            notes: ['<code>n_pipe</code> và <code>n_shm</code> là hai bản rút gọn chỉ chuyển ' +
              '1000 khối — bạn tự viết bằng cách cắt <code>thu_pipe</code> và ' +
              '<code>thu_shm</code> ra khỏi <code>dosuc.c</code>.'] },

          { t: 'cal', kind: 'info', title: 'shm_open không phải syscall — nó là openat trên /dev/shm', x:
            '<p>Dòng <code>strace</code> cuối cùng phơi bày toàn bộ bí mật: ' +
            '<code>shm_open("/n_shm", ...)</code> chỉ là ' +
            '<code>openat(AT_FDCWD, "/dev/shm/n_shm", ...)</code>. Không có syscall nào tên ' +
            '<code>shm_open</code> cả — nếu bạn thử <code>strace -e trace=shm_open</code> thì ' +
            '<code>strace</code> sẽ báo <code>invalid system call</code>.</p>' +
            '<p>Cờ <code>O_NOFOLLOW</code> đáng chú ý: nó ngăn kẻ tấn công đặt một symlink ở ' +
            '<code>/dev/shm</code> để lừa chương trình của bạn ghi ra chỗ khác. glibc thêm hộ ' +
            'bạn.</p>' +
            '<p>Và <b>2001 so với 1</b> là toàn bộ lời giải thích cho bảng tốc độ. Không cần ' +
            'lý thuyết nào thêm.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Bộ nhớ chia sẻ: tự gây race giữa hai tiến trình, rồi sửa đúng cách',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>dua_lien.c</code> và <code>khoa_lien.c</code> ở phần lý thuyết. Chạy ' +
            'bản chưa khoá <b>ít nhất 5 lần</b> — đây là điểm mấu chốt của bước này.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O0 -o dua_lien dua_lien.c\n' +
            'gcc -Wall -Wextra -pthread -O0 -o khoa_lien khoa_lien.c\n' +
            'echo "=== chua khoa ==="\n' +
            'for i in 1 2 3 4 5; do ./dua_lien; done\n' +
            'echo "=== co mutex PROCESS_SHARED ==="\n' +
            'for i in 1 2 3; do ./khoa_lien; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=== chua khoa ===\n' +
            'mong doi 400000, thuc te 264823, mat 135177\n' +
            'mong doi 400000, thuc te 260204, mat 139796\n' +
            'mong doi 400000, thuc te 310452, mat 89548\n' +
            'mong doi 400000, thuc te 327319, mat 72681\n' +
            'mong doi 400000, thuc te 247353, mat 152647\n' +
            '=== co mutex PROCESS_SHARED ===\n' +
            'mong doi 400000, thuc te 400000\n' +
            'mong doi 400000, thuc te 400000\n' +
            'mong doi 400000, thuc te 400000',
            notes: ['Số của bạn sẽ khác — miễn là chúng <i>khác nhau giữa các lần chạy</i>, ' +
              'bạn đã tái hiện đúng hiện tượng.',
              'Trong loạt 5 lần này không lần nào tình cờ ra đúng. Nhưng ở loạt chạy tại phần ' +
              'lý thuyết phía trên, <b>cùng chương trình đó</b> đã ra đúng <code>400000</code> ' +
              'ở lần thứ hai. Chạy thêm vài loạt nữa rồi bạn sẽ tự gặp. Đó chính là điều khiến ' +
              'race condition đáng sợ.'] },

          { t: 'p', x:
            'Bây giờ bỏ đúng một dòng để thấy glibc bắt lỗi tận tay:' },

          { t: 'code', where: 'wsl', code:
            'sed \'s|pthread_mutexattr_setpshared(&at, PTHREAD_PROCESS_SHARED);|/* quen dong nay */|\' khoa_lien.c > quen.c\n' +
            'gcc -Wall -Wextra -pthread -O0 -o quen quen.c\n' +
            'for i in 1 2 3; do ./quen; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Fatal glibc error: pthread_mutex_lock.c:88 (___pthread_mutex_lock): assertion failed: mutex->__data.__owner == 0\n' +
            'mong doi 400000, thuc te 204703\n' +
            'Fatal glibc error: pthread_mutex_lock.c:88 (___pthread_mutex_lock): assertion failed: mutex->__data.__owner == 0\n' +
            'mong doi 400000, thuc te 222049\n' +
            'Fatal glibc error: pthread_mutex_lock.c:88 (___pthread_mutex_lock): assertion failed: mutex->__data.__owner == 0\n' +
            'mong doi 400000, thuc te 231430' },

          { t: 'cal', kind: 'danger', title: 'Chương trình biên dịch sạch, không cảnh báo, và vẫn sai', x:
            '<p><code>gcc -Wall -Wextra</code> không nói một lời. Không thể nói được: một ' +
            '<code>pthread_mutex_t</code> đặt trong bộ nhớ chia sẻ trông y hệt một cái đặt ' +
            'trong bộ nhớ thường. Chỉ lúc chạy glibc mới phát hiện chủ sở hữu vô lý và kêu ' +
            'lên.</p>' +
            '<p>Và hãy để ý thứ nguy hiểm nhất: dù có dòng <code>Fatal glibc error</code>, ' +
            'chương trình <b>vẫn chạy tiếp</b>, vẫn in kết quả, vẫn thoát mã 0. Nếu stderr của ' +
            'daemon bị đổ vào <code>/dev/null</code> — chuyện rất hay xảy ra trong file ' +
            'systemd unit viết cẩu thả — bạn sẽ không bao giờ thấy dòng cảnh báo đó. Chỉ thấy ' +
            'số liệu sai lệch dần theo thời gian.</p>' +
            '<p>Đây là lý do <b>không bao giờ</b> vứt stderr của một dịch vụ đi. Hãy để nó chảy ' +
            'vào journal.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Hàng đợi ưu tiên, semaphore, và dọn rác',
        blocks: [
          { t: 'p', x:
            '<b>5a.</b> Gõ lại <code>mq_gui.c</code> và <code>mq_nhan.c</code>, rồi kiểm chứng ' +
            'điều quan trọng nhất: thông điệp ưu tiên cao <b>vượt lên trước</b>.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o mq_gui mq_gui.c && gcc -Wall -Wextra -o mq_nhan mq_nhan.c\n' +
            './mq_gui\n' +
            'ls -l /dev/mqueue/ && cat /dev/mqueue/hang_canh_bao\n' +
            './mq_nhan' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  [gui] uu tien 1: nhiet do binh thuong 42.5\n' +
            '  [gui] uu tien 9: CANH BAO qua nhiet 91.0\n' +
            '  [gui] uu tien 1: nhiet do binh thuong 43.0\n' +
            '  hang dang chua 3 thong diep\n' +
            '-rw------- 1 shinarus shinarus 80 Aug  3 21:58 hang_canh_bao\n' +
            'QSIZE:76         NOTIFY:0     SIGNO:0     NOTIFY_PID:0\n' +
            '             [nhan] uu tien 9 (24 byte): CANH BAO qua nhiet 91.0\n' +
            '             [nhan] uu tien 1 (26 byte): nhiet do binh thuong 42.5\n' +
            '             [nhan] uu tien 1 (26 byte): nhiet do binh thuong 43.0' },

          { t: 'cmdx', cmd: 'cat /dev/mqueue/hang_canh_bao',
            title: 'Một file "nội dung" không phải nội dung, mà là bảng trạng thái',
            rows: [
              ['<code>QSIZE:76</code>', 'Tổng số byte đang nằm trong hàng', '76 = 24 + 26 + 26, đúng bằng ba thông điệp cộng lại. Kiểm tra được bằng tay'],
              ['<code>NOTIFY:0</code>', 'Chưa ai đăng ký nhận thông báo bất đồng bộ', 'Đặt bằng <code>mq_notify()</code> — cách để được đánh thức bằng tín hiệu khi có thông điệp mới, thay vì ngồi chặn'],
              ['<code>NOTIFY_PID:0</code>', 'PID của tiến trình đã đăng ký nhận thông báo', 'Rất hữu ích khi gỡ lỗi: cho biết ai đang lắng nghe hàng đợi này'],
              ['kích thước 80', 'Kích thước file mà <code>ls</code> báo', 'Không liên quan tới dữ liệu — chỉ là độ dài của chính dòng trạng thái ở trên']
            ]},

          { t: 'p', x:
            '<b>5b.</b> Gõ lại <code>sem_demo.c</code> và quan sát ba tiến trình xếp hàng vào ' +
            'vùng tới hạn.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o sem_demo sem_demo.c && ./sem_demo' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  [con 0] vao vung toi han, sem = 0\n' +
            '  [con 0] roi vung toi han\n' +
            '  [con 1] vao vung toi han, sem = 0\n' +
            '  [con 1] roi vung toi han\n' +
            '  [con 2] vao vung toi han, sem = 0\n' +
            '  [con 2] roi vung toi han\n' +
            'cuoi cung sem = 1' },

          { t: 'p', x:
            '<b>5c.</b> Bước cuối cùng, và là thói quen quan trọng nhất mà bài này muốn bạn ' +
            'mang theo: <b>kiểm tra rác</b>.' },

          { t: 'code', where: 'wsl', code:
            'echo "--- bo nho chia se va semaphore con sot lai ---"\n' +
            'ls -l /dev/shm/\n' +
            'echo "--- hang doi thong diep con sot lai ---"\n' +
            'ls -l /dev/mqueue/\n' +
            'echo "--- FIFO con sot lai ---"\n' +
            'ls -l /tmp/*.fifo /tmp/dolieu /tmp/ongcoten 2>/dev/null || echo "  (khong con cai nao)"\n' +
            'echo "--- don sach ---"\n' +
            'rm -f /dev/shm/* /dev/mqueue/* 2>/dev/null\n' +
            'ls -l /dev/shm/ /dev/mqueue/' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- bo nho chia se va semaphore con sot lai ---\n' +
            'total 4\n' +
            '-rw------- 1 shinarus shinarus 32 Aug  3 21:58 sem.khoa_uart\n' +
            '--- hang doi thong diep con sot lai ---\n' +
            'total 0\n' +
            '--- FIFO con sot lai ---\n' +
            '  (khong con cai nao)\n' +
            '--- don sach ---\n' +
            'total 0\n' +
            'total 0',
            notes: ['Nếu máy bạn còn sót nhiều hơn, đó là vì một lần chạy nào đó đã bị ' +
              '<code>Ctrl-C</code> giữa chừng — chính xác là kịch bản mà lý thuyết đã cảnh ' +
              'báo.'] },

          { t: 'cal', kind: 'why', title: 'Ba thư mục đáng nhớ suốt đời làm nghề', x:
            '<p>Khi một thiết bị báo "hết bộ nhớ" mà <code>ps</code> không chỉ ra thủ phạm nào, ' +
            'ba lệnh này thường tìm ra kẻ trốn:</p>' +
            '<ul>' +
            '<li><code>ls -l /dev/shm/</code> — bộ nhớ chia sẻ và semaphore ' +
            '(<code>sem.*</code>) bị bỏ quên.</li>' +
            '<li><code>ls -l /dev/mqueue/</code> — hàng đợi thông điệp bị bỏ quên.</li>' +
            '<li><code>ls -l /run/</code> — FIFO và socket Unix bị bỏ quên.</li>' +
            '</ul>' +
            '<p>Tất cả đều là tmpfs, tức là <b>RAM thật</b> bị chiếm, và tất cả đều ' +
            '<b>không</b> thuộc về tiến trình nào nên không hiện ra trong ' +
            '<code>ps</code> hay <code>top</code>.</p>' +
            '<p>Cách phòng bệnh, dùng lại đúng thứ bạn viết ở Bài 21: gọi ' +
            '<code>shm_unlink</code> / <code>mq_unlink</code> / <code>sem_unlink</code> / ' +
            '<code>unlink</code> trong đường tắt êm khi nhận <code>SIGTERM</code>. Và như bạn ' +
            'đã biết, <code>SIGKILL</code> thì không cứu được — nên thêm một lần ' +
            '<code>unlink</code> ngay lúc <b>khởi động</b>, trước khi tạo mới, là lớp bảo hiểm ' +
            'thứ hai.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       13. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Toàn bộ bảng này là lỗi thật, gặp trong lúc dựng và đo các chương trình của bài. Nhóm ' +
      'cuối — bốn dòng dưới cùng — là loại không có thông báo lỗi nào.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>error: \'F_GETPIPE_SZ\' undeclared</code>',
         'Hằng này là mở rộng của Linux, chỉ lộ ra khi bật macro tính năng',
         'Thêm <code>#define _GNU_SOURCE</code> ở <b>dòng đầu tiên</b>, trước mọi <code>#include</code>'],

        ['<code>implicit declaration of function \'strerror\'</code>',
         'Thiếu <code>#include &lt;string.h&gt;</code>',
         '<code>errno.h</code> chỉ khai báo <code>errno</code> và các mã lỗi; hàm dịch mã lỗi ra chữ nằm ở <code>string.h</code>'],

        ['<code>error: \'errno\' undeclared</code> khi kiểm tra <code>mkfifo</code>',
         'Thiếu <code>#include &lt;errno.h&gt;</code>',
         'Rất dễ quên vì <code>perror()</code> vẫn dùng được mà không cần header này — chỉ khi bạn đọc thẳng <code>errno</code> mới cần'],

        ['<code>warning: missing initializer for field \'__pad\' of \'struct mq_attr\'</code>',
         'Khởi tạo <code>struct mq_attr</code> theo thứ tự, nhưng struct có thêm trường đệm nội bộ',
         'Dùng khởi tạo có tên: <code>{ .mq_flags = 0, .mq_maxmsg = 10, .mq_msgsize = 64, .mq_curmsgs = 0 }</code>'],

        ['<code>mq_open: Invalid argument</code> (<code>EINVAL</code>)',
         'Xin <code>mq_maxmsg</code> lớn hơn <code>/proc/sys/fs/mqueue/msg_max</code>, mặc định chỉ <b>10</b>',
         'Hạ tham số xuống, hoặc nâng trần hệ thống bằng file trong <code>/etc/sysctl.d/</code>'],

        ['<code>mq_receive: Message too long</code> (<code>EMSGSIZE</code>)',
         'Bộ đệm nhận <b>nhỏ hơn</b> <code>mq_msgsize</code> — kể cả khi thông điệp thực tế rất ngắn',
         'Gọi <code>mq_getattr</code> trước rồi <code>malloc(at.mq_msgsize)</code>. Đừng bao giờ đoán kích thước bằng một hằng số'],

        ['<code>mq_open: No such file or directory</code> (<code>ENOENT</code>)',
         'Bên nhận mở hàng đợi trước khi bên gửi kịp tạo nó',
         'Bên nhận cũng nên mở với <code>O_CREAT</code> kèm <code>&amp;at</code>, hoặc thử lại vài lần. Trên thiết bị hãy dùng <code>After=</code> trong file systemd unit'],

        ['<code>Fatal glibc error: … assertion failed: mutex-&gt;__data.__owner == 0</code>',
         'Đặt <code>pthread_mutex_t</code> vào bộ nhớ chia sẻ nhưng quên <code>PTHREAD_PROCESS_SHARED</code>',
         'Thêm <code>pthread_mutexattr_setpshared(&amp;at, PTHREAD_PROCESS_SHARED)</code>. Lưu ý chương trình <b>vẫn chạy tiếp</b> sau dòng này và cho kết quả sai'],

        ['<code>open(/dev/mem) that bai: Permission denied</code>',
         '<code>/dev/mem</code> thuộc <code>root:kmem</code>, chế độ <code>crw-r-----</code>',
         'Trên thiết bị thật thì chạy bằng <code>root</code>. Nhưng hãy cân nhắc <code>libgpiod</code> thay thế — xem cảnh báo ở phần lý thuyết'],

        ['<code>strace: invalid system call \'shm_open\'</code>',
         '<code>shm_open</code> là hàm thư viện, không phải syscall',
         'Theo dõi bằng <code>strace -e trace=openat</code> — bạn sẽ thấy nó mở <code>/dev/shm/&lt;ten&gt;</code>'],

        ['<code>Segmentation fault</code> hoặc <code>Bus error</code> ngay khi chạm vùng chia sẻ',
         'Quên <code>ftruncate</code>: đối tượng mới <b>luôn</b> dài 0 byte, nên <code>mmap</code> thành công nhưng vùng đó rỗng',
         '<code>ftruncate(fd, sizeof(struct ...))</code> ngay sau <code>shm_open</code>. Đây là bước dễ quên nhất trong ba bước'],

        ['<i>Không báo gì.</i> Nhận đủ dữ liệu nhưng chương trình <b>không bao giờ thoát</b>',
         'Sau <code>fork</code>, bên đọc quên <code>close(fd[1])</code> nên đang chờ chính mình',
         'Ngay sau <code>fork</code>, mỗi bên đóng đầu ống mình không dùng — dòng đầu tiên. Chẩn đoán bằng <code>timeout</code>: mã <b>124</b> nghĩa là treo'],

        ['<i>Không báo gì.</i> Chương trình đứng im ở <code>open()</code> trên FIFO',
         'Mở FIFO là hành động <b>chặn</b> cho tới khi phía bên kia cũng mở',
         'Đây là tính năng, không phải lỗi. Muốn tránh thì mở với <code>O_NONBLOCK</code> — nhưng nhớ mở ghi khi chưa có người đọc sẽ hỏng với <code>ENXIO</code>'],

        ['<i>Không báo gì.</i> Output của tiến trình con <b>biến mất</b> khi chuyển hướng ra file',
         '<code>_exit()</code> không xả bộ đệm stdio. Ra terminal thì đệm theo dòng nên không thấy lỗi, ra file thì đệm cả khối',
         '<code>fflush(stdout)</code> trước <code>_exit()</code>, hoặc sau mỗi <code>printf</code> quan trọng. Cùng cái bẫy đệm bạn đã gặp ở Bài 19 và Bài 20'],

        ['<i>Không báo gì.</i> Thiết bị dần hết RAM, <code>ps</code> không chỉ ra thủ phạm',
         'Đối tượng IPC POSIX <b>kiên trì</b>: chúng không chết theo tiến trình tạo ra',
         'Kiểm tra <code>ls -l /dev/shm/</code>, <code>/dev/mqueue/</code> và <code>/run/</code>. Gọi <code>*_unlink</code> cả lúc khởi động lẫn trong tay xử lý <code>SIGTERM</code>']
      ]},

    /* ══════════════════════════════════════════════
       14. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 23', items: [
      'MMU khiến hai tiến trình không thể chạm vào bộ nhớ của nhau. Vì vậy <b>mọi</b> cơ chế IPC đều phải đi qua nhân — hoặc nhân làm <b>người đưa thư</b> (chép hai lần), hoặc nhân làm <b>người mai mối</b> (ánh xạ chung một khung trang rồi rút lui).',
      '<code>pipe()</code> trả về hai mô tả file: <code>fd[0]</code> đọc, <code>fd[1]</code> ghi, <b>một chiều</b>. Muốn hai chiều phải tạo hai pipe.',
      'Sau <code>fork</code>, mỗi bên <b>phải</b> đóng đầu ống mình không dùng. Quên thì <code>read()</code> không bao giờ trả về 0 và chương trình treo im lặng — <code>timeout</code> trả <b>124</b>.',
      'Sức chứa pipe mặc định <b>65 536</b> byte, đo được chính xác bằng cách ghi từng byte tới khi <code>EAGAIN</code>. Trần nâng được là <b>1 048 576</b>. Ghi ≤ <b>4096</b> byte (<code>PIPE_BUF</code>) thì nhân bảo đảm nguyên tử.',
      'Ghi vào pipe không còn người đọc: mặc định <code>SIGPIPE</code> <b>giết</b> tiến trình, mã thoát <b>141</b>. Mọi daemon phải mở đầu bằng <code>signal(SIGPIPE, SIG_IGN)</code> rồi kiểm tra <code>EPIPE</code>.',
      'FIFO là pipe có tên: <code>ls -l</code> hiện <code>p</code> ở đầu, kích thước <b>luôn 0</b> vì dữ liệu ở RAM của nhân chứ không trên đĩa. Bên nhận có thể là bất cứ công cụ nào — kể cả <code>cat</code>.',
      'Bộ nhớ chia sẻ luôn gồm ba bước: <code>shm_open</code> → <code>ftruncate</code> → <code>mmap</code> với <code>MAP_SHARED</code>. Bỏ <code>ftruncate</code> thì chạm vào vùng đó cho <code>SIGBUS</code>.',
      '<code>shm_open</code> không phải syscall — <code>strace</code> cho thấy nó là <code>openat("/dev/shm/&lt;ten&gt;")</code>. Nhờ vậy bạn gỡ lỗi bộ nhớ chia sẻ bằng <code>ls</code>, <code>rm</code>, <code>hexdump</code> như file thường.',
      'Hàng đợi thông điệp giữ <b>gói rời rạc</b> có ưu tiên. Thông điệp ưu tiên <b>9</b> gửi thứ hai vẫn được nhận <b>đầu tiên</b>. Trần mặc định rất thấp: <b>10</b> thông điệp, <b>8192</b> byte, <b>256</b> hàng.',
      'Semaphore không chuyển dữ liệu, chỉ đếm chỗ. Khởi tạo 1 thì như mutex liên tiến trình. Nó nằm ở <code>/dev/shm/sem.&lt;ten&gt;</code>, chỉ <b>32</b> byte.',
      'Đo thật, 78,1 MB qua mỗi kênh: bộ nhớ chia sẻ <b>8 177–10 533 MB/s</b>, pipe <b>670–2 490</b>, FIFO <b>1 372–2 711</b>, hàng đợi <b>928–2 131</b>.',
      'Nguyên nhân nằm gọn trong hai con số do <code>strace -c</code> đếm: 1000 khối qua pipe tốn <b>2001</b> syscall, qua bộ nhớ chia sẻ tốn <b>1</b>.',
      'Quan trọng hơn tốc độ là <b>độ ổn định</b>: pipe dao động <b>3,7×</b> giữa các lần chạy, bộ nhớ chia sẻ chỉ <b>1,3×</b>. Với điều khiển thời gian thực, lần chậm nhất mới là con số đáng lo.',
      'Bộ nhớ chia sẻ trả lại toàn bộ vấn đề của Bài 22: <code>(*dem)++</code> từ hai <b>tiến trình</b> mất 18–38 % số lần tăng, và <b>đôi khi tình cờ ra đúng</b> — lần chạy nguy hiểm nhất.',
      'Mutex đặt trong vùng chia sẻ <b>bắt buộc</b> có <code>pthread_mutexattr_setpshared(&amp;at, PTHREAD_PROCESS_SHARED)</code>. Quên thì glibc bắn <code>Fatal glibc error</code> nhưng <b>vẫn chạy tiếp</b> và cho kết quả sai.',
      'Đối tượng IPC POSIX <b>kiên trì</b> — chúng sống qua cái chết của tiến trình. Ba lệnh cần nhớ khi gỡ lỗi thiết bị hết RAM: <code>ls -l /dev/shm/</code>, <code>/dev/mqueue/</code>, <code>/run/</code>.',
      '<code>mmap</code> trên <code>/dev/mem</code> chạm thẳng địa chỉ vật lý — cần <code>O_SYNC</code>, cần làm tròn xuống biên trang, cần <code>volatile</code>. Trên máy này nó bị chặn bởi cả quyền <code>root:kmem</code> lẫn <code>CONFIG_STRICT_DEVMEM=y</code>. Ngày nay hãy ưu tiên <code>libgpiod</code> hoặc một driver thật.'
    ]},

    /* ══════════════════════════════════════════════
       15. BÀI TIẾP THEO
       ══════════════════════════════════════════════ */
    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Bảng chọn cơ chế ở trên có một dòng bạn chưa dùng được: <i>"Hai bên nằm trên hai máy ' +
      'khác nhau → Socket"</i>. Cả năm cơ chế của bài hôm nay đều dừng lại ở ranh giới cái ' +
      'máy — pipe, FIFO, bộ nhớ chia sẻ, hàng đợi, semaphore, không cái nào ra khỏi được. ' +
      'Nhưng một thiết bị nhúng gần như luôn phải báo cáo số liệu đi <b>xa</b>.</p>' +
      '<p><b>Bài 24 — Socket và I/O đa kênh</b> gỡ nút thắt đó, và nó là bài khép lại ' +
      '<b>Chặng 03</b>. Bạn sẽ dựng một client–server TCP, hiểu vì sao <code>htons</code> tồn ' +
      'tại và điều gì xảy ra nếu quên nó, so TCP với UDP bằng phép đo chứ không bằng bảng lý ' +
      'thuyết.</p>' +
      '<p>Rồi tới câu hỏi lớn của bài: một tiến trình duy nhất phải theo dõi <b>nhiều</b> kênh ' +
      'cùng lúc — hai socket, một FIFO, một timer — mà <code>read()</code> thì chặn ở đúng một ' +
      'kênh. Câu trả lời là <code>select</code>, <code>poll</code> và <code>epoll</code>. Bạn ' +
      'sẽ đo cả ba trên hàng nghìn kết nối để thấy vì sao <code>epoll</code> thắng, và vì sao ' +
      'chênh lệch đó chỉ hiện ra khi số kênh đủ lớn.</p>' +
      '<p>Sản phẩm cuối chặng chính là thứ mà bốn bài vừa rồi đã chuẩn bị từng mảnh: một daemon ' +
      'đa luồng (Bài 22), tắt êm bằng <code>SIGTERM</code> (Bài 21), lấy dữ liệu qua IPC (bài ' +
      'này), và phục vụ nó qua TCP.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    { q: 'Sau <code>pipe()</code> và <code>fork()</code>, tiến trình con chỉ đọc nhưng quên ' +
         '<code>close(fd[1])</code>. Hậu quả là gì?',
      opts: ['Con nhận dữ liệu sai lệch',
             'Con nhận đủ dữ liệu nhưng vòng đọc không bao giờ kết thúc',
             'Chương trình sập với SIGSEGV',
             'Cha nhận SIGPIPE'],
      a: 1,
      why: 'Nhân đếm số đầu ghi đang mở. <code>read()</code> chỉ trả về <b>0</b> khi ' +
           '<b>mọi</b> bản sao của đầu ghi đã đóng — mà con vẫn đang giữ một bản sao của chính ' +
           'nó. Nó đang chờ dữ liệu từ bản thân mình. Dữ liệu đã tới <i>đầy đủ và đúng</i>, chỉ ' +
           'mỗi việc kết thúc là không xảy ra. Đây là loại lỗi dễ lọt qua test nhất, vì test ' +
           'thường kiểm tra dữ liệu có đúng không chứ ít khi kiểm tra chương trình có thoát ' +
           'không. Chẩn đoán bằng <code>timeout</code>: mã <b>124</b>.' },

    { q: 'Một daemon của bạn ghi kết quả ra socket cho client. Client rút dây mạng. Daemon ' +
         '<b>chết</b> với mã thoát 141 và không để lại dòng log nào. Chuyện gì đã xảy ra?',
      opts: ['Hết bộ nhớ, bị OOM killer giết',
             'write() gặp SIGPIPE, hành vi mặc định là giết tiến trình',
             'Deadlock giữa các luồng',
             'Nhân đóng socket và gửi SIGKILL'],
      a: 1,
      why: '<b>141 = 128 + 13</b>, mà 13 là <code>SIGPIPE</code> — đúng công thức mã thoát bạn ' +
           'lập ở Bài 21. Ghi vào một pipe, FIFO hoặc socket không còn ai đọc sẽ sinh ' +
           '<code>SIGPIPE</code>, và hành vi mặc định của nó là <i>giết tiến trình ngay</i>. Vì ' +
           'chết trước khi kịp chạy dòng nào nên không có log — đó là lý do triệu chứng khó ' +
           'lần. Cách chữa là <code>signal(SIGPIPE, SIG_IGN)</code> ngay đầu <code>main</code>; ' +
           'sau đó <code>write</code> trả về <code>-1</code> với <code>errno = 32</code> ' +
           '(<code>EPIPE</code>) và bạn xử lý được.' },

    { q: 'Vì sao bộ nhớ chia sẻ nhanh hơn pipe khoảng 4–5 lần?',
      opts: ['Vì nhân dùng thuật toán chép nhanh hơn cho nó',
             'Vì sau mmap không còn syscall nào: 1 syscall so với 2001 cho mỗi 1000 khối',
             'Vì nó bỏ qua MMU',
             'Vì nó được cấp mức ưu tiên cao hơn trong bộ lập lịch'],
      a: 1,
      why: '<code>strace -c</code> đếm hộ, không cần suy đoán: chuyển 1000 khối 4 KB qua pipe ' +
           'tốn <b>2001</b> lần vượt ranh giới user/kernel, qua bộ nhớ chia sẻ tốn <b>1</b> — ' +
           'và cái 1 đó chỉ là lần đọc lúc nạp chương trình. Sau <code>mmap</code>, chuyển dữ ' +
           'liệu chỉ còn là <code>memcpy</code> trong không gian người dùng và nhân hoàn toàn ' +
           'không biết. MMU vẫn hoạt động đầy đủ — thực ra chính MMU là thứ làm nên bộ nhớ chia ' +
           'sẻ, bằng cách trỏ hai bảng trang khác nhau vào cùng một khung trang vật lý.' },

    { q: 'Bạn đặt một <code>pthread_mutex_t</code> vào vùng bộ nhớ chia sẻ để hai tiến trình ' +
         'cùng dùng. Chương trình biên dịch sạch với <code>-Wall -Wextra</code>, nhưng lúc chạy ' +
         'in ra <code>Fatal glibc error: … assertion failed</code> và cho kết quả sai. Thiếu gì?',
      opts: ['Thiếu cờ -pthread',
             'Thiếu pthread_mutexattr_setpshared(&at, PTHREAD_PROCESS_SHARED)',
             'Mutex phải nằm ngoài vùng chia sẻ',
             'Thiếu volatile trên biến được bảo vệ'],
      a: 1,
      why: 'Mutex mặc định là <code>PTHREAD_PROCESS_PRIVATE</code>, nên glibc được phép tối ưu ' +
           'dựa trên giả định "chỉ các luồng trong tiến trình này chạm vào" — ví dụ lưu định ' +
           'danh luồng sở hữu và dùng futex ở chế độ riêng tư. Hai tiến trình khác nhau làm vỡ ' +
           'giả định đó. Trình biên dịch không thể cảnh báo, vì một <code>pthread_mutex_t</code> ' +
           'trong bộ nhớ chia sẻ trông y hệt một cái trong bộ nhớ thường. Nguy hiểm nhất: ' +
           'chương trình <b>vẫn chạy tiếp</b> sau dòng lỗi đó — nếu stderr bị đổ vào ' +
           '<code>/dev/null</code> thì bạn chỉ thấy số liệu sai chứ không thấy nguyên nhân.' },

    { q: 'Thiết bị của bạn dần hết RAM sau vài ngày. <code>ps</code> và <code>top</code> không ' +
         'chỉ ra tiến trình nào chiếm nhiều. Nơi nào đáng kiểm tra trước tiên?',
      opts: ['/tmp và /var/log',
             '/dev/shm, /dev/mqueue và /run',
             '/proc/meminfo và swap',
             '/sys/fs/cgroup'],
      a: 1,
      why: 'Cả ba thư mục đó đều là <b>tmpfs</b> — nằm hoàn toàn trong RAM. Đối tượng IPC POSIX ' +
           '<b>kiên trì</b>: chúng sống tới khi bị <code>unlink</code> hoặc tới khi khởi động ' +
           'lại máy, chứ <i>không</i> chết theo tiến trình tạo ra. Một daemon sập trước khi kịp ' +
           '<code>shm_unlink</code> sẽ để lại rác vĩnh viễn, và vì không tiến trình nào đang ' +
           'giữ nó nên <code>ps</code> không thể chỉ mặt. Phòng bệnh bằng hai lớp: ' +
           '<code>*_unlink</code> trong tay xử lý <code>SIGTERM</code>, và <code>*_unlink</code> ' +
           'thêm một lần lúc khởi động trước khi tạo mới — vì <code>SIGKILL</code> thì không tay ' +
           'xử lý nào cứu được.' },

    { q: 'Một daemon giám sát nhận số đo định kỳ và cả cảnh báo quá nhiệt. Cảnh báo ' +
         '<b>không được</b> chờ sau hàng trăm số đo bình thường đang xếp hàng. Cơ chế nào phù ' +
         'hợp nhất?',
      opts: ['Bộ nhớ chia sẻ, vì nó nhanh nhất',
             'Hàng đợi thông điệp, vì nhân sắp xếp theo độ ưu tiên',
             'Hai FIFO riêng, một cho số đo một cho cảnh báo',
             'Semaphore, vì nó điều phối được thứ tự'],
      a: 1,
      why: 'Đây đúng là bài toán mà hàng đợi thông điệp POSIX sinh ra để giải. Phép thử trong ' +
           'bài chứng minh: thông điệp ưu tiên <b>9</b> được gửi <i>thứ hai</i> nhưng ' +
           '<code>mq_receive</code> lấy nó ra <b>đầu tiên</b>, còn hai thông điệp cùng ưu tiên 1 ' +
           'giữ nguyên thứ tự đến giữa chúng với nhau. Bộ nhớ chia sẻ nhanh hơn nhưng không có ' +
           'khái niệm hàng đợi hay ưu tiên — bạn phải tự viết hết. Hai FIFO riêng thì chạy được ' +
           'nhưng đẩy gánh nặng sang bên nhận: nó phải theo dõi hai kênh cùng lúc, mà đó chính ' +
           'là bài toán <code>select</code>/<code>poll</code>/<code>epoll</code> của Bài 24.' },

    { q: 'Trong bài đo, mọi <code>read</code> và <code>write</code> đều nằm trong một vòng ' +
         '<code>while</code> cho tới khi đủ số byte. Bỏ vòng lặp đó đi thì sao?',
      opts: ['Chương trình không biên dịch được',
             'Chương trình vẫn chạy và vẫn in ra con số đẹp, nhưng con số đó sai',
             'Chương trình sập ngay với SIGSEGV',
             'Không sao cả, read và write luôn chuyển đủ số byte yêu cầu'],
      a: 1,
      why: '<code>read()</code> và <code>write()</code> <b>không hứa</b> chuyển đủ số byte bạn ' +
           'yêu cầu — chúng trả về số byte <i>thực sự</i> chuyển được, có thể ít hơn, nhất là ' +
           'khi bộ đệm 64 KB của pipe gần đầy hoặc gần cạn. Bỏ vòng lặp thì hai bên lệch pha ' +
           'nhau và phép đo sai, nhưng chương trình vẫn chạy trót lọt và vẫn in ra bảng số liệu ' +
           'trông rất thuyết phục. Đây là loại lỗi âm thầm đứng sau vô số bug "mất dữ liệu ngẫu ' +
           'nhiên" trong mã mạng — và Bài 24 sẽ dùng lại quy tắc này ngay từ dòng đầu tiên.' }
  ]
});

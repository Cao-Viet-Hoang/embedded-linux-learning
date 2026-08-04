/* ═══════════════════════════════════════════════════════════════
   BÀI 22 — Luồng và đồng bộ với pthread
   Chặng 03 · Lập trình hệ thống Linux
   ═══════════════════════════════════════════════════════════════ */
Lesson.register({
  id: 'bai-22',
  title: 'Luồng và đồng bộ với pthread',
  minutes: 65,
  practice: 'Thực hành 50 phút',
  level: 'Trung cấp',

  intro:
    'Hai bài vừa rồi dựng lên một thế giới rất an toàn: mỗi tiến trình có không gian địa chỉ ' +
    'riêng, con sửa biến gì cũng không ảnh hưởng tới cha. Bài này phá bỏ bức tường đó. Luồng ' +
    'dùng chung <b>toàn bộ</b> bộ nhớ với nhau — cùng heap, cùng biến toàn cục, cùng bảng file ' +
    'descriptor. Đổi lại tốc độ và sự tiện lợi, bạn nhận về một lớp lỗi hoàn toàn mới: mã ' +
    'chạy đúng chín mươi chín lần rồi sai ở lần thứ một trăm, và sai theo cách khác nhau mỗi ' +
    'lần. Trong bài này bạn sẽ <b>tự tay tạo ra</b> một lỗi như vậy, nhìn nó ăn mất gần một ' +
    'triệu phép cộng, mổ mã máy để hiểu vì sao, rồi sửa bằng ba cách và đo giá của từng cách.',

  goals: [
    'Giải thích được luồng khác tiến trình ở chỗ nào, và kiểm chứng bằng một biến toàn cục',
    'Dùng thành thạo <code>pthread_create</code>, <code>pthread_join</code> và cờ <code>-pthread</code>',
    'Tạo ra một race condition rồi đọc mã máy để chỉ đúng chỗ nó phát sinh',
    'Sửa race condition bằng <code>pthread_mutex</code> và bằng biến nguyên tử, đo được giá của mỗi cách',
    'Dùng <code>pthread_cond</code> để chờ mà không đốt CPU, và giải thích vì sao phải dùng <code>while</code> chứ không phải <code>if</code>',
    'Nhận diện deadlock qua <code>ps -L</code>, và phòng nó bằng quy tắc thứ tự khoá',
    'Quyết định được khi nào dùng luồng, khi nào dùng tiến trình trên thiết bị ít RAM'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. LUỒNG LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Luồng là gì — cùng một ngôi nhà, nhiều người ở' },

    { t: 'p', x:
      'Ở Bài 20, <code>fork</code> tạo ra một tiến trình <b>bản sao</b>: cùng mã, nhưng không ' +
      'gian địa chỉ riêng. Luồng thì ngược lại — <code>pthread_create</code> tạo thêm một ' +
      '<b>dòng thực thi</b> bên trong chính tiến trình đang chạy. Có thêm một con trỏ lệnh, ' +
      'thêm một ngăn xếp, thêm một bộ thanh ghi. Còn lại dùng chung tất.' },

    { t: 'p', x:
      'Cách nhớ dễ nhất: tiến trình là <b>ngôi nhà</b>, luồng là <b>người sống trong nhà</b>. ' +
      'Hai ngôi nhà thì mỗi nhà có tủ lạnh riêng, muốn đưa đồ cho nhau phải mang qua cổng ' +
      '(đó là IPC — Bài 23). Hai người trong cùng một nhà thì dùng chung một tủ lạnh: lấy đồ ' +
      'tức thì, không phải đi đâu cả — nhưng nếu cả hai cùng thò tay vào một lúc thì đổ vỡ.' },

    { t: 'fig', cap:
      'Điều quyết định mọi thứ trong bài này: vùng tô đậm là phần dùng chung. Với luồng, đó là ' +
      'gần như toàn bộ tiến trình — chỉ ngăn xếp và thanh ghi là riêng.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="So sánh hai tiến trình tách biệt với một tiến trình có ba luồng dùng chung bộ nhớ">' +

      '<text class="d-t" x="10" y="18">fork() — hai tiến trình</text>' +
      '<text class="d-t" x="380" y="18">pthread_create() — một tiến trình, ba luồng</text>' +

      /* --- fork side --- */
      '<rect class="d-box" x="10" y="30" width="160" height="250" rx="6"/>' +
      '<text class="d-ts" x="20" y="50">Tiến trình A (PID 436)</text>' +
      '<rect class="d-box-p" x="22" y="60" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="32" y="81">mã + biến toàn cục</text>' +
      '<rect class="d-box-a" x="22" y="102" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="32" y="123">heap riêng</text>' +
      '<rect class="d-box" x="22" y="144" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="32" y="165">ngăn xếp</text>' +
      '<rect class="d-box-g" x="22" y="200" width="136" height="30" rx="4"/>' +
      '<text class="d-tm" x="32" y="220">bien = 100</text>' +

      '<rect class="d-box" x="190" y="30" width="160" height="250" rx="6"/>' +
      '<text class="d-ts" x="200" y="50">Tiến trình B (PID 437)</text>' +
      '<rect class="d-box-p" x="202" y="60" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="212" y="81">mã + biến toàn cục</text>' +
      '<rect class="d-box-a" x="202" y="102" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="212" y="123">heap riêng</text>' +
      '<rect class="d-box" x="202" y="144" width="136" height="34" rx="4"/>' +
      '<text class="d-ts" x="212" y="165">ngăn xếp</text>' +
      '<rect class="d-box-w" x="202" y="200" width="136" height="30" rx="4"/>' +
      '<text class="d-tm" x="212" y="220">bien = 999</text>' +
      '<text class="d-ts" x="60" y="255">hai bản sao — không</text>' +
      '<text class="d-ts" x="60" y="270">ảnh hưởng lẫn nhau</text>' +

      /* --- thread side --- */
      '<rect class="d-box" x="380" y="30" width="330" height="250" rx="6"/>' +
      '<text class="d-ts" x="390" y="50">Tiến trình (PID 436)</text>' +

      '<rect class="d-box-p" x="392" y="60" width="306" height="34" rx="4"/>' +
      '<text class="d-ts" x="402" y="81">mã + biến toàn cục — DÙNG CHUNG</text>' +
      '<rect class="d-box-a" x="392" y="102" width="306" height="34" rx="4"/>' +
      '<text class="d-ts" x="402" y="123">heap + bảng fd — DÙNG CHUNG</text>' +

      '<rect class="d-box" x="392" y="144" width="96" height="34" rx="4"/>' +
      '<text class="d-ts" x="402" y="165">ngăn xếp 1</text>' +
      '<rect class="d-box" x="497" y="144" width="96" height="34" rx="4"/>' +
      '<text class="d-ts" x="507" y="165">ngăn xếp 2</text>' +
      '<rect class="d-box" x="602" y="144" width="96" height="34" rx="4"/>' +
      '<text class="d-ts" x="612" y="165">ngăn xếp 3</text>' +

      '<rect class="d-box-w" x="470" y="200" width="150" height="30" rx="4"/>' +
      '<text class="d-tm" x="480" y="220">bien = 999</text>' +
      '<path class="d-arrow" d="M436 190 L444 200 L428 200 Z"/>' +
      '<line class="d-line" x1="436" y1="178" x2="436" y2="192"/>' +
      '<path class="d-arrow" d="M545 190 L553 200 L537 200 Z"/>' +
      '<line class="d-line" x1="545" y1="178" x2="545" y2="192"/>' +
      '<path class="d-arrow" d="M650 190 L658 200 L642 200 Z"/>' +
      '<line class="d-line" x1="650" y1="178" x2="650" y2="192"/>' +
      '<text class="d-ts" x="440" y="255">một biến duy nhất — ba luồng cùng ghi vào đó</text>' +
      '<text class="d-ts" x="440" y="270">đây là nơi race condition sinh ra</text>' +
      '</svg>' },

    { t: 'terms', items: [
      ['Luồng', 'thread', 'Một dòng thực thi trong tiến trình. Có ngăn xếp và thanh ghi riêng, dùng chung mọi thứ còn lại.'],
      ['pthread', 'POSIX threads', 'Chuẩn API luồng của POSIX. Trên Linux do glibc (hoặc musl) cài đặt, bên dưới gọi <code>clone()</code>.'],
      ['LWP', 'Light-Weight Process', 'Tên nhân Linux gọi một luồng. Với nhân, luồng và tiến trình đều là "task" — chỉ khác ở chỗ chia sẻ bao nhiêu.'],
      ['TID', 'Thread ID', 'Số hiệu luồng do nhân cấp. Luồng chính có TID bằng đúng PID. Xem bằng <code>ps -L</code>.'],
      ['Race condition', 'điều kiện tranh đoạt', 'Kết quả phụ thuộc vào thứ tự tình cờ mà các luồng được xếp lịch. Cùng một chương trình cho ra kết quả khác nhau mỗi lần chạy.'],
      ['Vùng tới hạn', 'critical section', 'Đoạn mã đụng tới dữ liệu dùng chung, chỉ được cho <b>một</b> luồng vào tại một thời điểm.'],
      ['Mutex', 'MUTual EXclusion', 'Khoá loại trừ lẫn nhau. Ai khoá thì người đó phải mở — khác semaphore ở điểm này.'],
      ['Nguyên tử', 'atomic', 'Thao tác không thể bị cắt ngang giữa chừng. Hoặc chưa xảy ra, hoặc đã xong hẳn — không có trạng thái ở giữa.'],
      ['Deadlock', 'kẹt cứng / bế tắc', 'Hai luồng cùng chờ khoá mà luồng kia đang giữ. Không ai nhả, chương trình đứng vĩnh viễn.'],
      ['Biến điều kiện', 'condition variable', 'Cơ chế để một luồng ngủ cho tới khi luồng khác báo "điều kiện đã đúng rồi". Ngủ thật, không tốn CPU.']
    ]},

    { t: 'cal', kind: 'info', title: 'Với nhân Linux, luồng và tiến trình là cùng một thứ', x:
      '<p>Đây là chỗ Linux khác các hệ điều hành khác và rất đáng nhớ. Nhân không có khái niệm ' +
      '"luồng" tách biệt — nó chỉ có <b>task</b>. Cả <code>fork()</code> lẫn ' +
      '<code>pthread_create()</code> đều gọi xuống cùng một syscall: <code>clone()</code>. Khác ' +
      'biệt duy nhất là các cờ truyền vào.</p>' +
      '<p><code>fork</code> gọi <code>clone</code> gần như không cờ chia sẻ nào. ' +
      '<code>pthread_create</code> gọi <code>clone</code> với <code>CLONE_VM</code> (chung ' +
      'không gian địa chỉ), <code>CLONE_FILES</code> (chung bảng fd), <code>CLONE_FS</code>, ' +
      '<code>CLONE_SIGHAND</code> và vài cờ nữa. Đó là toàn bộ sự khác nhau giữa "tiến trình ' +
      'mới" và "luồng mới" ở mức nhân.</p>' +
      '<p>Bạn đã thấy <code>clone</code> xuất hiện thay cho <code>fork</code> trong ' +
      '<code>strace</code> ở Bài 20 — giờ thì lý do đã rõ.</p>' },

    /* ══════════════════════════════════════════════
       2. CHƯƠNG TRÌNH ĐA LUỒNG ĐẦU TIÊN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chương trình đa luồng đầu tiên, và một phép so sánh quyết định' },

    { t: 'p', x:
      'Chương trình dưới đây làm đúng một việc, hai lần: đặt biến toàn cục thành 999 — lần đầu ' +
      'bằng một <b>luồng</b>, lần sau bằng một <b>tiến trình con</b>. Rồi in ra giá trị biến để ' +
      'xem ai ảnh hưởng được tới ai.' },

    { t: 'code', where: 'file', name: 'chungrieng.c', lang: 'c', code:
      '#define _GNU_SOURCE                  /* can cho gettid() */\n' +
      '#include <stdio.h>\n' +
      '#include <pthread.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'int bien_toan_cuc = 100;\n' +
      '\n' +
      'static void *than_luong(void *arg)          /* than luong: void* -> void* */\n' +
      '{\n' +
      '    (void)arg;\n' +
      '    bien_toan_cuc = 999;\n' +
      '    printf("  [luong ] tid=%ld  da dat bien = %d\\n",\n' +
      '           (long)gettid(), bien_toan_cuc);\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("main    pid=%d tid=%ld  bien = %d\\n",\n' +
      '           getpid(), (long)gettid(), bien_toan_cuc);\n' +
      '\n' +
      '    /* --- CACH 1: luong --- */\n' +
      '    pthread_t t;\n' +
      '    pthread_create(&t, NULL, than_luong, NULL);\n' +
      '    pthread_join(t, NULL);                  /* doi luong xong hang */\n' +
      '    printf("sau pthread_join : bien = %d\\n", bien_toan_cuc);\n' +
      '\n' +
      '    /* --- CACH 2: tien trinh con --- */\n' +
      '    bien_toan_cuc = 100;                    /* dat lai ve moc ban dau */\n' +
      '    pid_t con = fork();\n' +
      '    if (con == 0) {\n' +
      '        bien_toan_cuc = 999;\n' +
      '        printf("  [con   ] pid=%d  da dat bien = %d\\n", getpid(), bien_toan_cuc);\n' +
      '        _exit(0);\n' +
      '    }\n' +
      '    waitpid(con, NULL, 0);\n' +
      '    printf("sau waitpid      : bien = %d\\n", bien_toan_cuc);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai22 && cd ~/embedded/bai22\n' +
      'gcc -Wall -Wextra -pthread -o chungrieng chungrieng.c && ./chungrieng' },

    { t: 'code', where: 'out', nocopy: true, code:
      'main    pid=436 tid=436  bien = 100\n' +
      '  [luong ] tid=437  da dat bien = 999\n' +
      'sau pthread_join : bien = 999\n' +
      '  [con   ] pid=446  da dat bien = 999\n' +
      'sau waitpid      : bien = 100',
      notes: ['Các số PID/TID trên máy bạn sẽ khác. Hai giá trị <b>phải</b> giống là ' +
        '<code>999</code> ở dòng thứ ba và <code>100</code> ở dòng cuối.'] },

    { t: 'cal', kind: 'why', title: 'Hai dòng cuối là toàn bộ bài học của Chặng 03', x:
      '<p><b><code>sau pthread_join : bien = 999</code></b> — luồng ghi vào <i>chính</i> biến ' +
      'của <code>main</code>. Không có bản sao nào cả. Truyền dữ liệu giữa hai luồng chỉ đơn ' +
      'giản là gán một biến.</p>' +
      '<p><b><code>sau waitpid : bien = 100</code></b> — tiến trình con ghi vào <i>bản sao</i> ' +
      'của nó, rồi chết mang theo bản sao đó. Cha không hề hay biết. Đây chính là điều bạn đã ' +
      'kiểm chứng ở Bài 20, giờ đặt cạnh nhau để thấy rõ.</p>' +
      '<p>Toàn bộ Bài 23 (IPC) tồn tại là để giải quyết dòng thứ hai. Toàn bộ phần còn lại của ' +
      'bài này tồn tại là để dọn dẹp hậu quả của dòng thứ nhất.</p>' },

    { t: 'cmdx', cmd: 'pthread_create(&t, NULL, than_luong, NULL)',
      title: 'Bốn tham số của pthread_create',
      rows: [
        ['<code>&amp;t</code>', 'Địa chỉ một biến <code>pthread_t</code> để hàm ghi định danh luồng vào', 'Bạn cần nó về sau để <code>join</code>. Đây là tham số <i>ra</i>, không phải vào'],
        ['<code>NULL</code>', 'Thuộc tính luồng (<code>pthread_attr_t</code>)', '<code>NULL</code> = mặc định. Đây là chỗ đặt kích thước ngăn xếp — rất quan trọng trên thiết bị nhúng, xem phần sau'],
        ['<code>than_luong</code>', 'Hàm luồng sẽ chạy. Chữ ký bắt buộc <code>void *f(void *)</code>', 'Chỉ tên hàm, không có dấu ngoặc — đây là con trỏ hàm'],
        ['<code>NULL</code>', 'Đối số truyền cho hàm đó', 'Muốn truyền số hay struct thì truyền địa chỉ, ép kiểu về <code>void *</code>'],
        ['<i>giá trị trả về</i>', '<b>0</b> nếu thành công, <b>số dương</b> là mã lỗi nếu thất bại', '<b>Không</b> trả về <code>-1</code> và <b>không</b> đặt <code>errno</code>. Đây là điểm khác biệt của cả họ <code>pthread_*</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Họ pthread_* không dùng errno — đừng gọi perror', x:
      '<p>Mọi syscall bạn học từ Bài 19 tới giờ đều theo lối "trả về <code>-1</code>, đặt ' +
      '<code>errno</code>". Họ <code>pthread_*</code> làm khác: chúng <b>trả thẳng mã lỗi</b> ' +
      'và không đụng tới <code>errno</code>.</p>' +
      '<p>Vì vậy <code>if (pthread_create(...) &lt; 0) perror("...")</code> là <b>sai hai lần</b>: ' +
      'điều kiện không bao giờ đúng, và <code>perror</code> in ra <code>errno</code> của một ' +
      'lời gọi nào khác. Cách đúng:</p>' +
      '<ul><li><code>int rc = pthread_create(&amp;t, NULL, f, NULL);</code></li>' +
      '<li><code>if (rc != 0) fprintf(stderr, "pthread_create: %s\\n", strerror(rc));</code></li></ul>' +
      '<p>Lý do lịch sử: <code>errno</code> phải là biến riêng của từng luồng mới dùng được ' +
      'trong môi trường đa luồng, và khi pthread được thiết kế thì điều đó chưa chắc chắn. ' +
      'Ngày nay <code>errno</code> đã là biến cục bộ luồng — bạn sẽ kiểm chứng ở phần thực ' +
      'hành — nhưng API thì đã trót định hình như vậy.</p>' },

    /* ══════════════════════════════════════════════
       3. CỜ -pthread
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cờ -pthread: vì sao vẫn phải viết dù chương trình có vẻ chạy được' },

    { t: 'p', x:
      'Sách vở nói "quên <code>-pthread</code> thì lỗi liên kết". Hãy kiểm chứng trên máy bạn — ' +
      'kết quả sẽ bất ngờ:' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -o khongco chungrieng.c && echo "LIEN KET THANH CONG" && ./khongco | head -3' },

    { t: 'code', where: 'out', nocopy: true, code:
      'LIEN KET THANH CONG\n' +
      'main    pid=446 tid=446  bien = 100\n' +
      '  [luong ] tid=447  da dat bien = 999\n' +
      'sau pthread_join : bien = 999' },

    { t: 'p', x:
      'Chạy tốt, không một lời cảnh báo. Lý do nằm ở đây:' },

    { t: 'code', where: 'wsl', code:
      'nm -D /lib/x86_64-linux-gnu/libc.so.6 | grep -w pthread_create\n' +
      'ls -l /lib/x86_64-linux-gnu/libpthread.so.0' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000000a42d0 T pthread_create@GLIBC_2.2.5\n' +
      '00000000000a42d0 T pthread_create@@GLIBC_2.34\n' +
      '-rw-r--r-- 1 root root 14408 Jul 23 00:24 /lib/x86_64-linux-gnu/libpthread.so.0' },

    { t: 'cal', kind: 'info', title: 'Từ glibc 2.34, libpthread đã bị gộp vào libc', x:
      '<p><code>pthread_create</code> nay <b>nằm ngay trong <code>libc.so.6</code></b> — bạn ' +
      'thấy hai phiên bản ký hiệu ở cùng một địa chỉ <code>0xa42d0</code>. Còn ' +
      '<code>libpthread.so.0</code> chỉ còn là một cái vỏ rỗng <b>14 408 byte</b>, giữ lại cho ' +
      'các chương trình cũ liên kết được. So sánh với <code>libc.so.6</code> nặng ' +
      '<b>2 186 512 byte</b> mà bạn đã đo ở Bài 17 — tỷ lệ nói lên tất cả.</p>' +
      '<p>Máy này chạy glibc <b>2.43</b>, nên mọi thứ đã gộp xong từ lâu. Đó là lý do lệnh ' +
      'liên kết thiếu <code>-pthread</code> vẫn thành công.</p>' },

    { t: 'p', x:
      'Nhưng <code>-pthread</code> <b>không chỉ</b> là <code>-lpthread</code>. Xem gcc thật sự ' +
      'làm gì với nó:' },

    { t: 'code', where: 'wsl', code:
      'gcc -### -pthread -o /dev/null chungrieng.c 2>&1 | grep -o "\\-D_REENTRANT\\|\\-lpthread" | sort -u' },

    { t: 'code', where: 'out', nocopy: true, code:
      '-D_REENTRANT\n' +
      '-lpthread' },

    { t: 'cal', kind: 'why', title: 'Vì sao vẫn phải viết -pthread, cho tới hết đời', x:
      '<ol>' +
      '<li><b><code>-D_REENTRANT</code></b> là phần quan trọng và nó xảy ra ở <i>giai đoạn tiền ' +
      'xử lý</i>, không phải liên kết (Bài 15). Macro này bật các phiên bản an toàn-đa-luồng ' +
      'của một số macro và hàm trong header. Không có nó, mã có thể biên dịch ra khác đi một ' +
      'cách âm thầm.</li>' +
      '<li><b>Máy bạn không phải máy đích.</b> Thiết bị nhúng có thể chạy glibc 2.28 hoặc musl. ' +
      'Trên glibc cũ, thiếu <code>-pthread</code> là lỗi <code>undefined reference to ' +
      '\'pthread_create\'</code> ngay lập tức. Bạn sẽ gặp đúng tình huống này khi biên dịch chéo ' +
      'ở Chặng 04.</li>' +
      '<li><b>Nguy hiểm nhất là trường hợp ở giữa:</b> liên kết được nhưng một phần cơ chế luồng ' +
      'chưa khởi tạo đầy đủ. Chương trình chạy sai một cách khó hiểu thay vì báo lỗi thẳng.</li>' +
      '</ol>' +
      '<p>Nguyên tắc: <b>viết <code>-pthread</code> ở cả bước biên dịch lẫn bước liên kết</b>. ' +
      'Trong Makefile (Bài 16) hãy thêm vào <code>CFLAGS</code> <i>và</i> <code>LDFLAGS</code>, ' +
      'chứ không phải thêm <code>-lpthread</code> vào <code>LDLIBS</code>.</p>' },

    /* ══════════════════════════════════════════════
       4. NHÌN THẤY LUỒNG TỪ BÊN NGOÀI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Nhìn thấy luồng từ bên ngoài: ps -L và /proc' },

    { t: 'p', x:
      '<code>ps</code> thường chỉ hiện tiến trình. Thêm cờ <code>-L</code> để nó hiện từng ' +
      'luồng. Chạy một chương trình tạo 3 luồng rồi ngủ:' },

    { t: 'code', where: 'wsl', code:
      'ps -L -o pid,tid,nlwp,stat,comm -p <PID>' },

    { t: 'code', where: 'out', nocopy: true, code:
      '    PID     TID NLWP STAT COMMAND\n' +
      '    468     468    4 Sl+  ngu\n' +
      '    468     470    4 Sl+  ngu\n' +
      '    468     471    4 Sl+  ngu\n' +
      '    468     472    4 Sl+  ngu' },

    { t: 'cmdx', cmd: 'ps -L -o pid,tid,nlwp,stat,comm -p 468',
      title: 'Đọc bảng luồng',
      rows: [
        ['<code>-L</code>', 'Hiện từng luồng thay vì gộp thành một dòng tiến trình', 'Không có cờ này, cả 4 luồng chỉ hiện ra một dòng duy nhất'],
        ['<code>PID</code>', 'Số hiệu tiến trình — <b>giống nhau ở cả 4 dòng</b>', 'Bốn luồng, một tiến trình. Đây là điều cần nhìn thấy'],
        ['<code>TID</code>', 'Số hiệu luồng. Luồng chính có TID <b>468 = PID</b>, ba luồng con là 470–472', 'Chính là số <code>gettid()</code> trả về'],
        ['<code>NLWP</code>', 'Number of Light-Weight Processes = tổng số luồng', 'Bằng 4 = 1 luồng chính + 3 luồng tạo thêm'],
        ['<code>STAT</code>', '<code>S</code> = đang ngủ, <code>l</code> = <b>đa luồng</b>, <code>+</code> = chạy ở tiền cảnh', 'Chữ <code>l</code> thường ở đây là dấu hiệu nhanh nhất để biết một tiến trình có nhiều luồng']
      ]},

    { t: 'p', x:
      'Nhân cũng phơi bày điều này ra hệ thống file, đúng theo tinh thần "mọi thứ là file" ' +
      'của Bài 19:' },

    { t: 'code', where: 'wsl', code:
      'ls /proc/<PID>/task\n' +
      'grep -E "^(Name|Pid|Threads)" /proc/<PID>/status' },

    { t: 'code', where: 'out', nocopy: true, code:
      '468\n470\n471\n472\n' +
      'Name:\tngu\n' +
      'Pid:\t468\n' +
      'Threads:\t4' },

    { t: 'cal', kind: 'tip', title: 'Mẹo gỡ lỗi trên thiết bị thật', x:
      '<p>Khi một daemon trên thiết bị ăn hết CPU, câu hỏi đầu tiên là <i>luồng nào</i> ăn. ' +
      '<code>top -H -p &lt;pid&gt;</code> hiện mức CPU của <b>từng luồng</b> thay vì gộp lại — ' +
      'thường lộ ra ngay một luồng đang quay vòng lặp bận (bạn sẽ đo hiện tượng này ở phần ' +
      'thực hành).</p>' +
      '<p>Sâu hơn nữa: <code>cat /proc/&lt;pid&gt;/task/&lt;tid&gt;/wchan</code> cho biết luồng ' +
      'đó đang ngủ chờ ở đúng hàm nào trong nhân. Ở bước deadlock bạn sẽ thấy nó in ra ' +
      '<code>futex_do_wait</code> — bằng chứng trực tiếp và không thể chối cãi.</p>' },

    /* ══════════════════════════════════════════════
       5. RACE CONDITION
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Race condition: tự tay tạo ra một lỗi ăn mất một triệu phép cộng' },

    { t: 'p', x:
      'Đây là phần quan trọng nhất của bài. Chương trình dưới đây đơn giản tới mức không thể ' +
      'sai: hai luồng, mỗi luồng cộng thêm 1 vào biến <code>dem</code> đúng một triệu lần. ' +
      'Kết quả hiển nhiên phải là hai triệu.' },

    { t: 'code', where: 'file', name: 'dua.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <pthread.h>\n' +
      '\n' +
      '#define SO_LAN 1000000\n' +
      'static long dem = 0;                  /* hai luong cung ghi vao day */\n' +
      '\n' +
      'static void *tang(void *a)\n' +
      '{\n' +
      '    (void)a;\n' +
      '    for (int i = 0; i < SO_LAN; i++)\n' +
      '        dem++;                        /* KHONG nguyen tu */\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    pthread_t t1, t2;\n' +
      '    pthread_create(&t1, NULL, tang, NULL);\n' +
      '    pthread_create(&t2, NULL, tang, NULL);\n' +
      '    pthread_join(t1, NULL);\n' +
      '    pthread_join(t2, NULL);\n' +
      '\n' +
      '    printf("mong doi %d, thuc te %ld, mat %ld lan tang (%.1f%%)\\n",\n' +
      '           2 * SO_LAN, dem, 2L * SO_LAN - dem,\n' +
      '           100.0 * (2L * SO_LAN - dem) / (2.0 * SO_LAN));\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -O0 -o dua_o0 dua.c\n' +
      'for i in 1 2 3; do ./dua_o0; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'mong doi 2000000, thuc te 1102554, mat 897446 lan tang (44.9%)\n' +
      'mong doi 2000000, thuc te 1229642, mat 770358 lan tang (38.5%)\n' +
      'mong doi 2000000, thuc te 1264184, mat 735816 lan tang (36.8%)',
      notes: ['Con số của bạn sẽ khác — và đó chính là điểm mấu chốt. <b>Mỗi lần chạy một kết ' +
        'quả khác nhau</b>, không lần nào ra 2 000 000.'] },

    { t: 'p', x:
      'Gần <b>một nửa</b> số phép cộng biến mất. Chương trình không crash, không cảnh báo, ' +
      'không có gì báo hiệu là nó sai — chỉ có con số cuối cùng là láo.' },

    { t: 'cal', kind: 'danger', title: 'Đây là loại lỗi tệ nhất trong nghề', x:
      '<p>Trình biên dịch không bắt được. <code>-Wall -Wextra</code> im lặng hoàn toàn. Chương ' +
      'trình không sập nên không có core dump để mổ. Và vì kết quả khác nhau mỗi lần chạy, bạn ' +
      'không thể tái hiện nó một cách đáng tin cậy để gỡ.</p>' +
      '<p>Trên thiết bị thật, dạng lỗi này hiện ra là: bộ đếm sản lượng lệch dần sau vài ngày, ' +
      'một gói tin thỉnh thoảng mất, một cấu trúc danh sách liên kết bị đứt trỏ sau ba tuần ' +
      'chạy liên tục. Đội phần cứng sẽ bị đổ lỗi trước, và sẽ mất vài tuần trước khi có người ' +
      'nghĩ tới cái vòng <code>for</code> này.</p>' },

    /* --- vì sao --- */
    { t: 'h3', x: 'Vì sao dem++ không phải một thao tác' },

    { t: 'p', x:
      'Trong mã nguồn C, <code>dem++</code> là một biểu thức. Trong CPU thì không. Hãy tự nhìn ' +
      'bằng <code>objdump</code> — công cụ bạn đã học ở Bài 18:' },

    { t: 'code', where: 'wsl', code:
      'objdump -d --no-show-raw-insn dua_o0 | sed -n "/<tang>:/,/^$/p"' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000000011a9 <tang>:\n' +
      '    11a9:\tendbr64\n' +
      '    11ad:\tpush   %rbp\n' +
      '    11ae:\tmov    %rsp,%rbp\n' +
      '    11b1:\tmov    %rdi,-0x18(%rbp)\n' +
      '    11b5:\tmovl   $0x0,-0x4(%rbp)\n' +
      '    11bc:\tjmp    11d4 <tang+0x2b>\n' +
      '    11be:\tmov    0x2e53(%rip),%rax        # 4018 <dem>\n' +
      '    11c5:\tadd    $0x1,%rax\n' +
      '    11c9:\tmov    %rax,0x2e48(%rip)        # 4018 <dem>\n' +
      '    11d0:\taddl   $0x1,-0x4(%rbp)\n' +
      '    11d4:\tcmpl   $0xf423f,-0x4(%rbp)\n' +
      '    11db:\tjle    11be <tang+0x15>\n' +
      '    11dd:\tmov    $0x0,%eax\n' +
      '    11e2:\tpop    %rbp\n' +
      '    11e3:\tret' },

    { t: 'p', x:
      'Ba dòng ở địa chỉ <code>11be</code>, <code>11c5</code> và <code>11c9</code> là toàn bộ ' +
      'câu chuyện. Một dòng C đã nở thành <b>ba lệnh máy</b>: <b>đọc</b> biến vào thanh ghi, ' +
      '<b>cộng</b> 1 trong thanh ghi, <b>ghi</b> thanh ghi trở lại biến.' },

    { t: 'fig', cap:
      'Bộ xếp lịch có thể cắt ngang ở bất kỳ khe nào giữa ba lệnh. Ở đây cả hai luồng cùng đọc ' +
      '5, cùng ghi 6 — hai phép cộng chỉ còn lại một.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ thời gian cho thấy hai luồng đọc cùng giá trị 5, mỗi luồng cộng 1, cả hai ghi 6, làm mất một phép cộng">' +
      '<text class="d-t" x="10" y="18">Luồng 1</text>' +
      '<text class="d-t" x="10" y="118">Luồng 2</text>' +
      '<text class="d-t" x="10" y="205">Biến dem</text>' +

      '<line class="d-line" x1="100" y1="60" x2="700" y2="60"/>' +
      '<line class="d-line" x1="100" y1="160" x2="700" y2="160"/>' +

      '<rect class="d-box-p" x="120" y="30" width="110" height="30" rx="4"/>' +
      '<text class="d-tm" x="130" y="50">mov dem,%rax</text>' +
      '<text class="d-ts" x="130" y="24">đọc → 5</text>' +

      '<rect class="d-box-p" x="380" y="30" width="90" height="30" rx="4"/>' +
      '<text class="d-tm" x="390" y="50">add $1</text>' +
      '<text class="d-ts" x="390" y="24">%rax = 6</text>' +

      '<rect class="d-box-w" x="500" y="30" width="110" height="30" rx="4"/>' +
      '<text class="d-tm" x="510" y="50">mov %rax,dem</text>' +
      '<text class="d-ts" x="510" y="24">ghi 6</text>' +

      '<rect class="d-box-a" x="250" y="130" width="110" height="30" rx="4"/>' +
      '<text class="d-tm" x="260" y="150">mov dem,%rax</text>' +
      '<text class="d-ts" x="260" y="124">đọc → 5  (vẫn là 5!)</text>' +

      '<rect class="d-box-a" x="380" y="130" width="90" height="30" rx="4"/>' +
      '<text class="d-tm" x="390" y="150">add $1</text>' +

      '<rect class="d-box-w" x="620" y="130" width="80" height="30" rx="4"/>' +
      '<text class="d-tm" x="628" y="150">ghi 6</text>' +

      '<rect class="d-box-g" x="120" y="185" width="380" height="26" rx="4"/>' +
      '<text class="d-tm" x="130" y="203">dem = 5</text>' +
      '<rect class="d-box-w" x="500" y="185" width="200" height="26" rx="4"/>' +
      '<text class="d-tm" x="510" y="203">dem = 6   ← lẽ ra phải là 7</text>' +

      '<line class="d-line" x1="305" y1="60" x2="305" y2="130"/>' +
      '<path class="d-arrow" d="M305 128 L311 118 L299 118 Z"/>' +
      '<text class="d-ts" x="312" y="100">bộ xếp lịch cắt ngang ở đây</text>' +
      '</svg>' },

    { t: 'cal', kind: 'why', title: 'Cửa sổ nguy hiểm nằm giữa "đọc" và "ghi"', x:
      '<p>Nếu bộ xếp lịch cắt luồng 1 ra sau lệnh <code>mov</code> đọc mà trước lệnh ' +
      '<code>mov</code> ghi, thì luồng 2 nhìn thấy một giá trị <b>đã cũ</b>. Cả hai cùng tính ' +
      'ra 6, cả hai cùng ghi 6. Hai phép cộng đã diễn ra nhưng biến chỉ tăng một.</p>' +
      '<p>Với 6 CPU (bạn đã đo ở Bài 1), tình huống còn thẳng thừng hơn: hai luồng chạy ' +
      '<b>thật sự song song</b> trên hai lõi khác nhau, không cần bộ xếp lịch cắt gì cả. Hai ' +
      'lệnh <code>mov</code> có thể xảy ra cùng một chu kỳ.</p>' +
      '<p>Đây là lý do vì sao mất tới ~40%: cửa sổ nguy hiểm không phải vài nano giây hiếm hoi ' +
      'như lỗi tái nhập ở Bài 21 — nó là <b>hai phần ba</b> thời gian thực thi của vòng lặp.</p>' },

    /* --- mức tối ưu --- */
    { t: 'h3', x: 'Bẫy chết người: cùng mã nguồn, ba mức tối ưu, ba kiểu sai khác nhau' },

    { t: 'p', x:
      'Biên dịch <i>đúng file đó</i> ở ba mức tối ưu rồi chạy. Kết quả là bài học đắt giá nhất ' +
      'trong bài này:' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -O1 -o dua_o1 dua.c\n' +
      'gcc -Wall -Wextra -pthread -O2 -o dua_o2 dua.c\n' +
      'echo "--- -O1, 5 lan ---"; for i in 1 2 3 4 5; do ./dua_o1; done\n' +
      'echo "--- -O2, 3 lan ---"; for i in 1 2 3; do ./dua_o2; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      '--- -O1, 5 lan ---\n' +
      'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
      'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
      'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
      'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
      'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
      '--- -O2, 3 lan ---\n' +
      'mong doi 2000000, thuc te 2000000, mat 0 lan tang (0.0%)\n' +
      'mong doi 2000000, thuc te 2000000, mat 0 lan tang (0.0%)\n' +
      'mong doi 2000000, thuc te 2000000, mat 0 lan tang (0.0%)' },

    { t: 'p', x:
      'Ba hành vi hoàn toàn khác nhau từ <b>một</b> file nguồn. Mổ mã máy sẽ thấy vì sao — ' +
      'trình tối ưu hoá viết lại vòng lặp mỗi mức một kiểu:' },

    { t: 'code', where: 'wsl', code:
      'objdump -d --no-show-raw-insn dua_o1 | sed -n "/<tang>:/,/^$/p"' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000000011b0 <tang>:\n' +
      '    11b0:\tendbr64\n' +
      '    11b4:\tmov    0x2e5d(%rip),%rdx        # 4018 <dem>\n' +
      '    11bb:\tlea    0x1(%rdx),%rax\n' +
      '    11bf:\tadd    $0xf4241,%rdx\n' +
      '    11c6:\tcs nopw 0x0(%rax,%rax,1)\n' +
      '    11d0:\tmov    %rax,%rcx\n' +
      '    11d3:\tadd    $0x1,%rax\n' +
      '    11d7:\tcmp    %rdx,%rax\n' +
      '    11da:\tjne    11d0 <tang+0x20>\n' +
      '    11dc:\tmov    %rcx,0x2e35(%rip)        # 4018 <dem>\n' +
      '    11e3:\tmov    $0x0,%eax\n' +
      '    11e8:\tret' },

    { t: 'code', where: 'wsl', code:
      'objdump -d --no-show-raw-insn dua_o2 | sed -n "/<tang>:/,/^$/p"' },

    { t: 'code', where: 'out', nocopy: true, code:
      '0000000000001270 <tang>:\n' +
      '    1270:\tendbr64\n' +
      '    1274:\taddq   $0xf4240,0x2d99(%rip)        # 4018 <dem>\n' +
      '    127f:\txor    %eax,%eax\n' +
      '    1281:\tret' },

    { t: 'table',
      head: ['Mức', 'Trình tối ưu làm gì', 'Số lần chạm bộ nhớ', 'Kết quả đo được'],
      rows: [
        ['<code>-O0</code>', 'Dịch thẳng: đọc–cộng–ghi mỗi vòng', '2 000 000 lần đọc + 2 000 000 lần ghi', 'Mất <b>36,8–44,9 %</b>, khác nhau mỗi lần chạy'],
        ['<code>-O1</code>', 'Giữ <code>dem</code> trong thanh ghi suốt vòng lặp, chỉ ghi trả lại <b>một lần</b> ở cuối (<code>mov %rcx,dem</code>)', '1 lần đọc + 1 lần ghi mỗi luồng', 'Mất <b>đúng 1 000 000</b> = <b>50,0 %</b>, giống hệt nhau <b>10/10</b> lần chạy'],
        ['<code>-O2</code>', 'Xoá sổ cả vòng lặp, thay bằng <b>một lệnh</b> <code>addq $0xf4240, dem</code> (cộng thẳng 1 000 000)', '1 lệnh đọc-sửa-ghi', 'Luôn ra <b>2 000 000</b> — trông như đã đúng']
      ]},

    { t: 'cal', kind: 'danger', title: '-O2 cho kết quả đúng, và đó là điều nguy hiểm nhất', x:
      '<p>Hãy đọc kỹ dòng cuối bảng. Ở <code>-O2</code> chương trình cho ra <b>đúng đáp án</b> ' +
      'trong mọi lần chạy. Nhưng nó vẫn <b>sai</b> — lệnh <code>addq</code> tuy chỉ có một, ' +
      'nhưng CPU vẫn phải đọc bộ nhớ, cộng, rồi ghi lại. Vẫn không nguyên tử. Chỉ là cửa sổ ' +
      'nguy hiểm đã co lại còn một lệnh nên hai luồng gần như không bao giờ va nhau.</p>' +
      '<p>Hãy hình dung: bạn viết mã, thử ở <code>-O0</code> thấy sai, sửa lung tung, rồi bật ' +
      '<code>-O2</code> để phát hành và thấy "hết lỗi rồi". Sáu tháng sau thiết bị ngoài hiện ' +
      'trường bắt đầu lệch số. Hoặc bạn đổi CPU đích, hoặc nâng phiên bản gcc, và cửa sổ mở ' +
      'rộng ra lần nữa.</p>' +
      '<p><b>Bài học:</b> đúng đắn của mã đa luồng <b>không được phép</b> phụ thuộc vào mức tối ' +
      'ưu, vào tốc độ CPU, hay vào số lõi. Nếu bạn không thể chỉ ra <i>cơ chế</i> nào bảo đảm ' +
      'tính đúng, thì mã đó sai — kể cả khi nó vừa chạy đúng một triệu lần.</p>' },

    { t: 'cal', kind: 'tip', title: 'Bốn dòng ở -O1 giải thích con số 50 % chằn chặn', x:
      '<p>Vì sao <code>-O1</code> mất <i>chính xác</i> một triệu, không xê dịch, 10/10 lần?</p>' +
      '<p>Nhìn mã máy: <code>mov dem,%rdx</code> đọc <b>một lần</b> lúc vào hàm, vòng lặp quay ' +
      'hoàn toàn trong thanh ghi <code>%rax</code>/<code>%rcx</code>, rồi <code>mov ' +
      '%rcx,dem</code> ghi <b>một lần</b> lúc ra. Cả hai luồng đều đọc 0 lúc đầu, đều tính ra ' +
      '1 000 000, đều ghi 1 000 000. Công của một luồng bị xoá sổ trọn vẹn.</p>' +
      '<p>Đây cũng chính là cơ chế đã gây ra lỗi "vòng lặp không bao giờ thoát" ở Bài 21 — ' +
      'trình biên dịch giữ biến trong thanh ghi. Ở đó <code>volatile</code> là lời chữa. Ở đây ' +
      '<b>không phải</b>: <code>volatile</code> ép đọc lại bộ nhớ nhưng <i>không</i> làm ' +
      '<code>dem++</code> trở nên nguyên tử. Nó sẽ đưa bạn về đúng hành vi sai kiểu ' +
      '<code>-O0</code>. Đừng bao giờ dùng <code>volatile</code> để chống race condition.</p>' },

    /* ══════════════════════════════════════════════
       6. MUTEX
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cách sửa thứ nhất: pthread_mutex' },

    { t: 'p', x:
      'Mutex là một cái khoá cửa. Trước khi vào vùng tới hạn thì khoá lại; ra thì mở. Luồng nào ' +
      'tới mà thấy cửa khoá thì <b>ngủ</b> cho tới khi được đánh thức — không quay vòng chờ, ' +
      'không tốn CPU.' },

    { t: 'code', where: 'file', name: 'khoa.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <pthread.h>\n' +
      '\n' +
      '#define SO_LAN 1000000\n' +
      'static long dem = 0;\n' +
      'static pthread_mutex_t khoa = PTHREAD_MUTEX_INITIALIZER;\n' +
      '\n' +
      'static void *tang(void *a)\n' +
      '{\n' +
      '    (void)a;\n' +
      '    for (int i = 0; i < SO_LAN; i++) {\n' +
      '        pthread_mutex_lock(&khoa);\n' +
      '        dem++;                        /* vung toi han */\n' +
      '        pthread_mutex_unlock(&khoa);\n' +
      '    }\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    pthread_t t1, t2;\n' +
      '    pthread_create(&t1, NULL, tang, NULL);\n' +
      '    pthread_create(&t2, NULL, tang, NULL);\n' +
      '    pthread_join(t1, NULL);\n' +
      '    pthread_join(t2, NULL);\n' +
      '    printf("mong doi %d, thuc te %ld\\n", 2 * SO_LAN, dem);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -O1 -o khoa khoa.c\n' +
      'for i in 1 2 3 4 5; do ./khoa; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'mong doi 2000000, thuc te 2000000\n' +
      'mong doi 2000000, thuc te 2000000\n' +
      'mong doi 2000000, thuc te 2000000\n' +
      'mong doi 2000000, thuc te 2000000\n' +
      'mong doi 2000000, thuc te 2000000' },

    { t: 'cal', kind: 'why', title: 'Vì sao mutex đúng còn -O2 chỉ may mắn', x:
      '<p>Điểm khác biệt không nằm ở kết quả — cả hai đều in ra 2 000 000. Nó nằm ở chỗ ' +
      '<b>vì sao</b>.</p>' +
      '<p>Với <code>-O2</code>, kết quả đúng vì cửa sổ va chạm quá hẹp. Đổi CPU, đổi trình biên ' +
      'dịch, thêm luồng thứ ba — nó có thể sai lại.</p>' +
      '<p>Với mutex, kết quả đúng vì nhân <b>bảo đảm</b> chỉ một luồng nằm giữa ' +
      '<code>lock</code> và <code>unlock</code> tại một thời điểm. Điều đó không phụ thuộc vào ' +
      'mức tối ưu, số lõi, tốc độ CPU hay vận may. Chạy trên máy 64 lõi vẫn đúng.</p>' +
      '<p>Đó là khác biệt giữa <i>quan sát thấy đúng</i> và <i>chứng minh được đúng</i>.</p>' },

    { t: 'cmdx', cmd: 'pthread_mutex_t khoa = PTHREAD_MUTEX_INITIALIZER;',
      title: 'Bốn hàm mutex cần thuộc',
      rows: [
        ['<code>PTHREAD_MUTEX_INITIALIZER</code>', 'Khởi tạo tĩnh cho mutex là biến toàn cục/static', 'Gọn nhất. Với mutex nằm trong <code>malloc</code> thì phải dùng <code>pthread_mutex_init(&amp;m, NULL)</code>'],
        ['<code>pthread_mutex_lock(&amp;m)</code>', 'Khoá. Nếu đang bị giữ thì <b>ngủ</b> cho tới khi được nhả', 'Không đốt CPU khi chờ — bên dưới là futex, bạn sẽ thấy tên nó trong <code>wchan</code>'],
        ['<code>pthread_mutex_trylock(&amp;m)</code>', 'Thử khoá; đang bị giữ thì trả về <code>EBUSY</code> ngay chứ không chờ', 'Dùng khi luồng có việc khác để làm thay vì ngồi chờ'],
        ['<code>pthread_mutex_unlock(&amp;m)</code>', 'Mở khoá. <b>Chỉ luồng đang giữ mới được mở</b>', 'Đây là điểm phân biệt mutex với semaphore — semaphore thì ai tăng cũng được'],
        ['<code>pthread_mutex_destroy(&amp;m)</code>', 'Giải phóng khi không dùng nữa', 'Bắt buộc với mutex tạo bằng <code>init</code>; không cần với <code>INITIALIZER</code>']
      ]},

    { t: 'p', x:
      'Nhưng khoá không miễn phí. Đo bằng đồng hồ thật:' },

    { t: 'code', where: 'wsl', code:
      'for p in dua_o0 khoa; do\n' +
      '  S=$(date +%s%N); ./$p > /dev/null; E=$(date +%s%N)\n' +
      '  echo "$p: $(( (E-S)/1000000 )) ms"\n' +
      'done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'dua_o0: 14 ms\n' +
      'khoa: 170 ms' },

    { t: 'cal', kind: 'info', title: 'Khoá đắt gấp khoảng 12 lần — và đó là con số cần nhớ', x:
      '<p>Đo ba lần mỗi bên trên máy này: không khoá <b>13–15 ms</b>, có mutex ' +
      '<b>160–173 ms</b>. Chênh khoảng <b>12 lần</b>.</p>' +
      '<p>Lý do: mỗi vòng lặp giờ có thêm hai lời gọi hàm, và khi hai luồng va nhau thì phải ' +
      'xuống nhân qua <code>futex</code> để ngủ rồi đánh thức. Bạn đang khoá/mở <b>hai triệu ' +
      'lần</b> chỉ để bảo vệ một phép cộng — tỷ lệ chi phí trên công việc hữu ích tệ nhất có ' +
      'thể.</p>' +
      '<p><b>Bài học thiết kế:</b> đừng khoá quá nhỏ và quá thường xuyên. Nếu mỗi luồng cộng ' +
      'vào biến cục bộ của riêng nó rồi chỉ khoá <b>một lần</b> lúc cuối để cộng gộp, chi phí ' +
      'khoá gần như biến mất. Vùng tới hạn nên <i>hiếm và ngắn</i>, chứ không phải chỉ ' +
      'ngắn.</p>' },

    /* ══════════════════════════════════════════════
       7. BIẾN NGUYÊN TỬ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cách sửa thứ hai: biến nguyên tử của C11' },

    { t: 'p', x:
      'Nếu vùng tới hạn chỉ là <b>một phép toán trên một biến</b>, có cách rẻ hơn mutex nhiều: ' +
      'nhờ chính CPU làm cho phép toán đó không thể bị cắt ngang.' },

    { t: 'code', where: 'file', name: 'nguyentu.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <pthread.h>\n' +
      '#include <stdatomic.h>                /* chuan C11 */\n' +
      '\n' +
      '#define SO_LAN 1000000\n' +
      'static atomic_long dem = 0;\n' +
      '\n' +
      'static void *tang(void *a)\n' +
      '{\n' +
      '    (void)a;\n' +
      '    for (int i = 0; i < SO_LAN; i++)\n' +
      '        atomic_fetch_add(&dem, 1);     /* mot lenh may co khoa bus */\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    pthread_t t1, t2;\n' +
      '    pthread_create(&t1, NULL, tang, NULL);\n' +
      '    pthread_create(&t2, NULL, tang, NULL);\n' +
      '    pthread_join(t1, NULL);\n' +
      '    pthread_join(t2, NULL);\n' +
      '    printf("mong doi %d, thuc te %ld\\n", 2 * SO_LAN, (long)dem);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -O0 -o nguyentu nguyentu.c\n' +
      './nguyentu\n' +
      'objdump -d --no-show-raw-insn nguyentu | sed -n "/<tang>:/,/^$/p" | grep -i lock' },

    { t: 'code', where: 'out', nocopy: true, code:
      'mong doi 2000000, thuc te 2000000\n' +
      '    11be:\tlock addq $0x1,0x2e51(%rip)        # 4018 <dem>' },

    { t: 'cal', kind: 'why', title: 'Tiền tố lock — một chữ làm nên toàn bộ khác biệt', x:
      '<p>So ba đoạn mã máy đã gặp trong bài, tất cả đều cộng vào cùng một biến:</p>' +
      '<ul>' +
      '<li><code>-O0</code>: <code>mov</code> / <code>add</code> / <code>mov</code> — ba lệnh, ' +
      'sai nặng.</li>' +
      '<li><code>-O2</code>: <code>addq $0xf4240,dem</code> — một lệnh, vẫn có thể sai.</li>' +
      '<li>nguyên tử: <code><b>lock</b> addq $0x1,dem</code> — một lệnh, <b>không thể</b> ' +
      'sai.</li>' +
      '</ul>' +
      '<p>Khác biệt giữa dòng hai và dòng ba chỉ là bốn chữ cái <code>lock</code>. Tiền tố này ' +
      'ra lệnh cho CPU giữ độc quyền dòng cache chứa <code>dem</code> trong suốt lệnh đó, nên ' +
      'không lõi nào khác chen vào giữa được. Đây là bảo đảm ở mức <b>phần cứng</b>, không phải ' +
      'ở mức thư viện.</p>' +
      '<p>Nhắc lại điểm mấu chốt: dòng hai và dòng ba <i>nhìn giống nhau</i> và <i>cho kết quả ' +
      'như nhau khi bạn thử</i>. Chỉ một trong hai là đúng.</p>' },

    { t: 'code', where: 'wsl', code:
      'for p in dua_o0 nguyentu khoa; do\n' +
      '  S=$(date +%s%N); ./$p > /dev/null; E=$(date +%s%N)\n' +
      '  echo "$p: $(( (E-S)/1000000 )) ms"\n' +
      'done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'dua_o0: 14 ms\n' +
      'nguyentu: 54 ms\n' +
      'khoa: 170 ms' },

    { t: 'table',
      head: ['Cách', 'Kết quả', 'Thời gian đo được', 'So với không khoá', 'Dùng khi nào'],
      rows: [
        ['Không bảo vệ', '<b>Sai</b> (mất 36–50 %)', '13–15 ms', '1×', 'Không bao giờ, nếu có nhiều hơn một luồng ghi'],
        ['<code>atomic_fetch_add</code>', 'Đúng', '47–63 ms', '~<b>4×</b>', 'Bộ đếm, cờ, một biến đơn. Rẻ nhất trong các cách đúng'],
        ['<code>pthread_mutex</code>', 'Đúng', '160–173 ms', '~<b>12×</b>', 'Nhiều biến phải nhất quán với nhau, hoặc vùng tới hạn dài hơn một phép toán']
      ]},

    { t: 'cal', kind: 'tip', title: 'Chọn thế nào cho đúng', x:
      '<p>Nguyên tử <b>rẻ hơn mutex khoảng 3 lần</b> nhưng chỉ bảo vệ được <i>một</i> biến. Ngay ' +
      'khi bạn cần hai biến nhất quán với nhau — ví dụ vừa thêm phần tử vào mảng vừa tăng biến ' +
      'đếm — thì nguyên tử không đủ, vì giữa hai thao tác nguyên tử vẫn có khe hở.</p>' +
      '<p>Quy tắc thực dụng: <b>bộ đếm và cờ thì dùng nguyên tử; cấu trúc dữ liệu thì dùng ' +
      'mutex.</b></p>' +
      '<p>Trên vi điều khiển 32-bit, còn một cái bẫy nữa: đọc/ghi một biến <code>long long</code> ' +
      '64-bit vốn đã cần hai lệnh, nên nó <i>không</i> nguyên tử ngay cả khi bạn chỉ gán. ' +
      'Đây là chỗ mã chạy tốt trên máy x86 64-bit của bạn rồi hỏng khi mang sang thiết bị ARM ' +
      '32-bit ở Chặng 04.</p>' },

    /* ══════════════════════════════════════════════
       8. BIẾN ĐIỀU KIỆN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Biến điều kiện: chờ mà không đốt CPU' },

    { t: 'p', x:
      'Mutex trả lời câu "ai được vào". Nó không trả lời câu "chờ tới khi có việc". Nếu luồng ' +
      'tiêu thụ phải đợi luồng sản xuất bỏ hàng vào kho, cách ngây thơ là quay vòng kiểm tra:' },

    { t: 'code', where: 'file', name: 'vòng lặp bận — cách SAI', lang: 'c', code:
      'while (!san_sang) { }          /* quay vong kiem tra lien tuc */' },

    { t: 'p', x:
      'Đo xem cách này tốn gì. Hai chương trình cùng chờ đúng 2 giây, một dùng vòng lặp bận, ' +
      'một dùng <code>pthread_cond_wait</code>:' },

    { t: 'code', where: 'wsl', code:
      '/usr/bin/time -f "  thuc te %e s | CPU nguoi dung %U s | dung CPU %P" ./banroi\n' +
      '/usr/bin/time -f "  thuc te %e s | CPU nguoi dung %U s | dung CPU %P" ./ngoannho' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  thuc te 2.00 s | CPU nguoi dung 1.99 s | dung CPU 99%\n' +
      '  thuc te 2.00 s | CPU nguoi dung 0.00 s | dung CPU 0%' },

    { t: 'cal', kind: 'why', title: '99 % CPU so với 0 %, cùng một kết quả', x:
      '<p>Cả hai chờ đúng 2,00 giây và cùng hoàn thành công việc. Nhưng một cái ngốn ' +
      '<b>1,99 giây CPU</b> còn cái kia ngốn <b>0,00 giây</b>.</p>' +
      '<p>Vòng lặp bận đang bắt CPU quay vòng vô nghĩa hai tỷ lần. <code>pthread_cond_wait</code> ' +
      'đưa luồng vào trạng thái ngủ (<code>S</code> trong <code>ps</code>), nhân tháo nó ra khỏi ' +
      'hàng đợi chạy hoàn toàn — nó <b>không tiêu thụ một chu kỳ nào</b> cho tới khi được đánh ' +
      'thức.</p>' +
      '<p><b>Vì sao điều này quan trọng gấp bội trên thiết bị nhúng:</b> một lõi quay 100 % ' +
      'nghĩa là CPU không bao giờ vào được trạng thái tiết kiệm điện. Trên thiết bị chạy pin, ' +
      'một vòng lặp bận duy nhất có thể biến thời lượng ba ngày thành sáu tiếng. Nó cũng làm ' +
      'thiết bị nóng lên và tranh CPU với những luồng thật sự có việc.</p>' },

    { t: 'p', x:
      'Mẫu chuẩn sản xuất – tiêu thụ với kho có sức chứa hữu hạn. Đây là bộ khung bạn sẽ dùng ' +
      'lại rất nhiều: một luồng đọc cảm biến, một luồng ghi ra mạng.' },

    { t: 'code', where: 'file', name: 'sanxuat.c (phần cốt lõi)', lang: 'c', code:
      '#define SUC_CHUA 4\n' +
      'static int kho[SUC_CHUA];\n' +
      'static int so_mon = 0;\n' +
      '\n' +
      'static pthread_mutex_t khoa    = PTHREAD_MUTEX_INITIALIZER;\n' +
      'static pthread_cond_t  co_hang = PTHREAD_COND_INITIALIZER;   /* kho khong rong */\n' +
      'static pthread_cond_t  co_cho  = PTHREAD_COND_INITIALIZER;   /* kho khong day  */\n' +
      '\n' +
      'static void *nguoi_san_xuat(void *a)\n' +
      '{\n' +
      '    (void)a;\n' +
      '    for (int i = 1; i <= 8; i++) {\n' +
      '        pthread_mutex_lock(&khoa);\n' +
      '        while (so_mon == SUC_CHUA)              /* WHILE, khong phai IF */\n' +
      '            pthread_cond_wait(&co_cho, &khoa);\n' +
      '        kho[so_mon++] = i;\n' +
      '        printf("  [san xuat] bo vao mon %d, kho co %d\\n", i, so_mon);\n' +
      '        fflush(stdout);\n' +
      '        pthread_cond_signal(&co_hang);          /* danh thuc nguoi tieu thu */\n' +
      '        pthread_mutex_unlock(&khoa);\n' +
      '        usleep(50000);\n' +
      '    }\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'static void *nguoi_tieu_thu(void *a)\n' +
      '{\n' +
      '    (void)a;\n' +
      '    for (int i = 0; i < 8; i++) {\n' +
      '        pthread_mutex_lock(&khoa);\n' +
      '        while (so_mon == 0)\n' +
      '            pthread_cond_wait(&co_hang, &khoa);\n' +
      '        int mon = kho[--so_mon];\n' +
      '        printf("             [tieu thu] lay mon %d, kho con %d\\n", mon, so_mon);\n' +
      '        fflush(stdout);\n' +
      '        pthread_cond_signal(&co_cho);\n' +
      '        pthread_mutex_unlock(&khoa);\n' +
      '        usleep(120000);\n' +
      '    }\n' +
      '    return NULL;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -o sanxuat sanxuat.c && ./sanxuat' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  [san xuat] bo vao mon 1, kho co 1\n' +
      '             [tieu thu] lay mon 1, kho con 0\n' +
      '  [san xuat] bo vao mon 2, kho co 1\n' +
      '  [san xuat] bo vao mon 3, kho co 2\n' +
      '             [tieu thu] lay mon 3, kho con 1\n' +
      '  [san xuat] bo vao mon 4, kho co 2\n' +
      '  [san xuat] bo vao mon 5, kho co 3\n' +
      '             [tieu thu] lay mon 5, kho con 2\n' +
      '  [san xuat] bo vao mon 6, kho co 3\n' +
      '  [san xuat] bo vao mon 7, kho co 4\n' +
      '             [tieu thu] lay mon 7, kho con 3\n' +
      '  [san xuat] bo vao mon 8, kho co 4\n' +
      '             [tieu thu] lay mon 8, kho con 3\n' +
      '             [tieu thu] lay mon 6, kho con 2\n' +
      '             [tieu thu] lay mon 4, kho con 1\n' +
      '             [tieu thu] lay mon 2, kho con 0\n' +
      'xong, kho con 0 mon',
      notes: ['Thứ tự đan xen trên máy bạn có thể khác. Điều <b>phải</b> giống: ' +
        '<code>kho co</code> không bao giờ vượt quá <b>4</b>, không bao giờ âm, và dòng cuối ' +
        'là <code>kho con 0 mon</code>.'] },

    { t: 'cmdx', cmd: 'pthread_cond_wait(&co_hang, &khoa)',
      title: 'Ba việc pthread_cond_wait làm trong một lời gọi',
      rows: [
        ['① mở khoá <code>khoa</code>', 'Nhả mutex ra, nếu không luồng kia không bao giờ vào được để đổi điều kiện', 'Đây là lý do phải truyền mutex vào — hàm cần quyền nhả nó'],
        ['② ngủ', 'Đưa luồng ra khỏi hàng đợi chạy cho tới khi có <code>signal</code>/<code>broadcast</code>', 'Ba việc ①② này là <b>nguyên tử</b> với nhau, nên không có khe hở làm mất tín hiệu'],
        ['③ khoá lại <code>khoa</code>', 'Khi tỉnh dậy, tự giành lại mutex trước khi trả về', 'Vì vậy sau khi <code>wait</code> trả về, bạn <b>đang giữ khoá</b> — đừng khoá lại lần nữa'],
        ['<code>pthread_cond_signal</code>', 'Đánh thức <b>một</b> luồng đang chờ', 'Đủ dùng khi mọi luồng chờ đều làm cùng một việc'],
        ['<code>pthread_cond_broadcast</code>', 'Đánh thức <b>tất cả</b> luồng đang chờ', 'Cần khi các luồng chờ những điều kiện khác nhau trên cùng một biến điều kiện']
      ]},

    { t: 'cal', kind: 'danger', title: 'while chứ không phải if — đây là lỗi kinh điển nhất', x:
      '<p>Rất nhiều người viết <code>if (so_mon == 0) pthread_cond_wait(...)</code>. Nó chạy ' +
      'đúng trong hầu hết các lần thử, rồi hỏng ngoài hiện trường. Hai lý do:</p>' +
      '<ol>' +
      '<li><b>Đánh thức giả</b> (<i>spurious wakeup</i>). POSIX cho phép ' +
      '<code>pthread_cond_wait</code> trả về mà <b>không</b> có ai gọi <code>signal</code>. Đây ' +
      'là điều được đặc tả cho phép, không phải lỗi cài đặt — nó đánh đổi để cơ chế đánh thức ' +
      'chạy nhanh hơn.</li>' +
      '<li><b>Bị cướp cò.</b> Có hai luồng tiêu thụ cùng chờ. Một món hàng tới, ' +
      '<code>signal</code> đánh thức luồng A, nhưng luồng B đang chạy sẵn chộp mất món đó ' +
      'trước. Luồng A tỉnh dậy, thấy kho rỗng.</li>' +
      '</ol>' +
      '<p>Với <code>if</code>, luồng A chạy tiếp và làm <code>kho[--so_mon]</code> khi ' +
      '<code>so_mon</code> đang là 0 — đọc ra ngoài mảng, <code>so_mon</code> thành <b>-1</b>. ' +
      'Với <code>while</code>, nó kiểm tra lại, thấy vẫn rỗng, và ngủ tiếp. Đúng đắn.</p>' +
      '<p><b>Quy tắc không có ngoại lệ: <code>pthread_cond_wait</code> luôn nằm trong một vòng ' +
      '<code>while</code> kiểm tra lại điều kiện.</b></p>' },

    /* ══════════════════════════════════════════════
       9. DEADLOCK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Deadlock: khi khoá quay lại cắn bạn' },

    { t: 'p', x:
      'Mutex sửa được race condition, nhưng đẻ ra một lỗi mới. Hai luồng, hai khoá, mỗi luồng ' +
      'lấy khoá theo một thứ tự khác nhau:' },

    { t: 'code', where: 'file', name: 'ketcung.c (phần cốt lõi)', lang: 'c', code:
      'static pthread_mutex_t A = PTHREAD_MUTEX_INITIALIZER;\n' +
      'static pthread_mutex_t B = PTHREAD_MUTEX_INITIALIZER;\n' +
      '\n' +
      'static void *luong1(void *x)\n' +
      '{\n' +
      '    (void)x;\n' +
      '    pthread_mutex_lock(&A);  printf("  [luong1] giu A, xin B\\n"); fflush(stdout);\n' +
      '    sleep(1);                            /* keo dai cua so de chac chan ket */\n' +
      '    pthread_mutex_lock(&B);  printf("  [luong1] giu ca A va B\\n");\n' +
      '    pthread_mutex_unlock(&B); pthread_mutex_unlock(&A);\n' +
      '    return NULL;\n' +
      '}\n' +
      '\n' +
      'static void *luong2(void *x)\n' +
      '{\n' +
      '    (void)x;\n' +
      '    pthread_mutex_lock(&B);  printf("  [luong2] giu B, xin A\\n"); fflush(stdout);\n' +
      '    sleep(1);\n' +
      '    pthread_mutex_lock(&A);  printf("  [luong2] giu ca B va A\\n");\n' +
      '    pthread_mutex_unlock(&A); pthread_mutex_unlock(&B);\n' +
      '    return NULL;\n' +
      '}' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -Wextra -pthread -o ketcung ketcung.c\n' +
      'timeout 5 ./ketcung\n' +
      'echo "ma thoat = $?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'pid=5434\n' +
      '  [luong2] giu B, xin A\n' +
      '  [luong1] giu A, xin B\n' +
      'ma thoat = 124',
      notes: ['<b>124</b> là mã <code>timeout</code> dùng để báo "đã hết giờ, tôi phải giết nó" ' +
        '— bạn đã gặp ở Bài 21. Chương trình không tự thoát: dòng <code>giu ca A va B</code> ' +
        'không bao giờ được in.'] },

    { t: 'fig', cap:
      'Deadlock là một vòng tròn chờ đợi. Phá vỡ vòng tròn đó là cách duy nhất — và cách rẻ ' +
      'nhất để phá là bắt mọi luồng lấy khoá theo cùng một thứ tự.',
      svg:
      '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Sơ đồ vòng tròn chờ: luồng 1 giữ khoá A xin khoá B, luồng 2 giữ khoá B xin khoá A">' +
      '<rect class="d-box-p" x="90" y="40" width="150" height="50" rx="6"/>' +
      '<text class="d-t" x="128" y="70">Luồng 1</text>' +
      '<rect class="d-box-a" x="480" y="40" width="150" height="50" rx="6"/>' +
      '<text class="d-t" x="518" y="70">Luồng 2</text>' +

      '<rect class="d-box-g" x="90" y="140" width="150" height="45" rx="6"/>' +
      '<text class="d-t" x="132" y="168">Khoá A</text>' +
      '<rect class="d-box-g" x="480" y="140" width="150" height="45" rx="6"/>' +
      '<text class="d-t" x="522" y="168">Khoá B</text>' +

      '<line class="d-line" x1="165" y1="90" x2="165" y2="134"/>' +
      '<path class="d-arrow" d="M165 140 L171 130 L159 130 Z"/>' +
      '<text class="d-ts" x="175" y="118">đang giữ</text>' +

      '<line class="d-line" x1="555" y1="90" x2="555" y2="134"/>' +
      '<path class="d-arrow" d="M555 140 L561 130 L549 130 Z"/>' +
      '<text class="d-ts" x="565" y="118">đang giữ</text>' +

      '<line class="d-line" x1="240" y1="55" x2="474" y2="150"/>' +
      '<path class="d-arrow" d="M480 152 L468 152 L474 142 Z"/>' +
      '<text class="d-ts" x="300" y="88">luồng 1 xin B — phải chờ</text>' +

      '<line class="d-line" x1="480" y1="78" x2="246" y2="152"/>' +
      '<path class="d-arrow" d="M240 154 L252 154 L246 144 Z"/>' +
      '<text class="d-ts" x="300" y="140">luồng 2 xin A — phải chờ</text>' +

      '<text class="d-t" x="255" y="25">Vòng tròn chờ đợi — không ai nhả, không ai đi tiếp</text>' +
      '</svg>' },

    { t: 'p', x:
      'Deadlock không sập, không báo lỗi — chương trình chỉ đơn giản là <b>đứng im mãi mãi</b>. ' +
      'Đây là cách nhìn ra nó từ bên ngoài:' },

    { t: 'code', where: 'wsl', code:
      'ps -L -o pid,tid,stat,wchan:20,comm -p <PID>\n' +
      'grep -E "^(State|Threads)" /proc/<PID>/status' },

    { t: 'code', where: 'out', nocopy: true, code:
      '    PID     TID STAT WCHAN                COMMAND\n' +
      '   5440    5440 Sl+  futex_do_wait        ketcung\n' +
      '   5440    5442 Sl+  futex_do_wait        ketcung\n' +
      '   5440    5443 Sl+  futex_do_wait        ketcung\n' +
      'State:\tS (sleeping)\n' +
      'Threads:\t3' },

    { t: 'cal', kind: 'tip', title: 'futex_do_wait ở mọi luồng = chẩn đoán deadlock', x:
      '<p><b>Cả ba</b> luồng — kể cả luồng chính đang kẹt trong <code>pthread_join</code> — đều ' +
      'nằm ở <code>futex_do_wait</code>, và trạng thái là <code>S (sleeping)</code>.</p>' +
      '<p>Hãy nhớ hình mẫu này: <b>tiến trình dùng 0 % CPU nhưng không tiến triển, mọi luồng ' +
      'đều ở <code>futex_do_wait</code></b> — gần như chắc chắn là deadlock. Nếu ngược lại nó ' +
      'ngốn 100 % CPU mà không tiến triển thì là vòng lặp bận hoặc livelock, một chứng bệnh ' +
      'khác.</p>' +
      '<p><code>futex</code> (fast userspace mutex) là cơ chế nhân nằm dưới ' +
      '<code>pthread_mutex</code>. Tên nó xuất hiện trong <code>wchan</code> chính là dấu vân ' +
      'tay của việc "đang chờ một khoá".</p>' },

    { t: 'h3', x: 'Cách phòng: quy tắc thứ tự khoá' },

    { t: 'p', x:
      'Deadlock cần <b>bốn</b> điều kiện xảy ra cùng lúc: loại trừ lẫn nhau, giữ-và-chờ, không ' +
      'cướp được, và <b>vòng tròn chờ đợi</b>. Ba cái đầu là bản chất của mutex, không bỏ được. ' +
      'Cái thứ tư thì bỏ được — và rất rẻ.' },

    { t: 'cal', kind: 'why', title: 'Quy tắc một dòng đáng giá cả bài', x:
      '<p><b>Mọi luồng phải lấy khoá theo cùng một thứ tự toàn cục.</b></p>' +
      '<p>Trong ví dụ trên, chỉ cần sửa <code>luong2</code> lấy A trước rồi mới tới B — giống ' +
      '<code>luong1</code>. Vòng tròn biến mất, và deadlock trở nên <i>không thể xảy ra về mặt ' +
      'cấu trúc</i>, chứ không phải "khó xảy ra".</p>' +
      '<p>Kiểm chứng: sau khi sửa, chương trình in đủ bốn dòng và thoát với mã <b>0</b> thay vì ' +
      '124. Bạn sẽ tự làm ở bước 4 phần thực hành.</p>' +
      '<p>Trong dự án thật, thứ tự đó phải được <b>ghi ra thành văn</b> — ví dụ một dòng chú ' +
      'thích ở đầu file: <code>/* thu tu khoa: cau_hinh -&gt; hang_doi -&gt; ket_noi */</code>. ' +
      'Đây là loại tài liệu đáng giá nhất trong mã đa luồng.</p>' },

    { t: 'table',
      head: ['Cách phòng deadlock', 'Làm thế nào', 'Đánh giá'],
      rows: [
        ['<b>Thứ tự khoá</b>', 'Đánh số các khoá, luôn lấy theo thứ tự tăng dần', 'Đơn giản nhất, hiệu quả nhất. <b>Nên dùng mặc định</b>'],
        ['<code>pthread_mutex_trylock</code>', 'Lấy được thì đi tiếp; không thì nhả hết khoá đang giữ rồi thử lại từ đầu', 'Dùng khi không thể áp đặt thứ tự. Coi chừng livelock: hai luồng cứ nhả rồi thử mãi'],
        ['Giảm số khoá', 'Một khoá lớn thay vì hai khoá nhỏ', 'Không thể deadlock với một khoá duy nhất. Đổi lại mất tính song song'],
        ['<code>pthread_mutex_timedlock</code>', 'Chờ có hạn, hết hạn thì bỏ cuộc và báo lỗi', 'Là mạng lưới an toàn, không phải cách sửa. Ít nhất thì thiết bị không treo cứng']
      ]},

    /* ══════════════════════════════════════════════
       10. LUỒNG HAY TIẾN TRÌNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Luồng hay tiến trình: quyết định thế nào trên thiết bị 64 MB RAM' },

    { t: 'p', x:
      'Bạn đã có đủ dữ liệu đo được để quyết định chứ không phải đoán. Ba con số quyết định.' },

    { t: 'h3', x: 'Con số 1 — giá tạo ra' },

    { t: 'code', where: 'out', nocopy: true, code:
      'tao+doi 1 luong :  137.3 us | fork+doi 1 con  :  413.1 us | luong nhanh hon : 3.0 lan\n' +
      'tao+doi 1 luong :  126.6 us | fork+doi 1 con  :  393.3 us | luong nhanh hon : 3.1 lan\n' +
      'tao+doi 1 luong :  125.0 us | fork+doi 1 con  :  303.7 us | luong nhanh hon : 2.4 lan',
      notes: ['Cả hai con số đo trong <b>cùng một chương trình</b> nên so được với nhau trực ' +
        'tiếp. Lưu ý đây là <code>fork</code> + <code>waitpid</code> trọn gói, nên lớn hơn con ' +
        'số <b>215–235 µs</b> chỉ tính riêng <code>fork</code> ở Bài 20.',
        'Lần chạy <b>đầu tiên</b> luôn cho số cao bất thường (đo được 860 µs) vì trang nhớ chưa ' +
        'được nạp. Hãy chạy nóng một lần rồi mới lấy số — thói quen bắt buộc khi đo đạc.'] },

    { t: 'h3', x: 'Con số 2 — giá bộ nhớ' },

    { t: 'code', where: 'wsl', code:
      './nganxep\n' +
      'grep -E "^(VmSize|VmRSS|Threads)" /proc/<PID cua tramluong>/status' },

    { t: 'code', where: 'out', nocopy: true, code:
      'ngan xep mac dinh moi luong = 8388608 byte = 8192 KB = 8 MB\n' +
      'sau khi dat lai              = 65536 byte = 64 KB\n' +
      'PTHREAD_STACK_MIN            = 16384 byte\n' +
      'VmSize:\t  822368 kB\n' +
      'VmRSS:\t    2768 kB\n' +
      'Threads:\t101' },

    { t: 'cal', kind: 'danger', title: '100 luồng = 803 MB bộ nhớ ảo. Trên thiết bị 64 MB thì sao?', x:
      '<p>Mỗi luồng nhận ngăn xếp mặc định <b>8 MB</b> — bằng đúng <code>ulimit -s</code> của ' +
      'luồng chính. Một trăm luồng chiếm <b>822 368 kB ≈ 803 MB</b> bộ nhớ ảo.</p>' +
      '<p>Nhưng <code>VmRSS</code> chỉ có <b>2 768 kB ≈ 2,7 MB</b>. Vì sao? Vì đó là bộ nhớ ' +
      '<i>ảo</i> — nhân mới chỉ hứa hẹn, chưa cấp trang nào cho tới khi luồng thật sự chạm tới. ' +
      'Đây chính là cơ chế cấp phát lười mà bạn đã gặp qua copy-on-write ở Bài 20.</p>' +
      '<p><b>Nhưng đừng yên tâm.</b> Trên hệ thống 64 MB RAM và <b>không có swap</b> — tình ' +
      'huống mặc định của thiết bị nhúng — việc đặt trước 803 MB không gian địa chỉ có thể bị ' +
      'từ chối thẳng nếu <code>overcommit_memory</code> được siết. Và trên nhân 32-bit, không ' +
      'gian địa chỉ người dùng chỉ có ~3 GB, nên khoảng 380 luồng là chạm trần bất kể còn bao ' +
      'nhiêu RAM thật.</p>' +
      '<p><b>Cách chữa:</b> <code>pthread_attr_setstacksize(&amp;at, 64*1024)</code> hạ xuống ' +
      '64 KB — nhỏ hơn <b>128 lần</b>, đủ dùng cho luồng không đệ quy sâu. Sàn cứng là ' +
      '<code>PTHREAD_STACK_MIN</code> = <b>16 384 byte</b> trên máy này.</p>' },

    { t: 'h3', x: 'Con số 3 — giá của một lỗi' },

    { t: 'p', x:
      'Đây là con số ít ai nhắc tới nhưng lại quyết định kiến trúc. Cho một luồng cố tình ghi ' +
      'vào con trỏ NULL, rồi làm điều y hệt với một tiến trình con:' },

    { t: 'code', where: 'out', nocopy: true, code:
      '$ ./luongchet\n' +
      'main van song, giay 0\n' +
      'main van song, giay 1\n' +
      'Segmentation fault\n' +
      'ma thoat = 139\n' +
      '\n' +
      '$ ./conchet\n' +
      'cha van song, giay 0\n' +
      'cha van song, giay 1\n' +
      'cha van song, giay 2\n' +
      'con chet vi tin hieu 11, cha VAN CHAY BINH THUONG\n' +
      'ma thoat cha = 0' },

    { t: 'cal', kind: 'why', title: 'Một luồng chết kéo theo cả tiến trình — không có ngoại lệ', x:
      '<p><code>luongchet</code> lẽ ra in 5 dòng, nhưng chỉ in được <b>2</b> rồi cả tiến trình ' +
      'bốc hơi với mã <b>139</b> (= 128 + 11 = <code>SIGSEGV</code>, đúng bảng mã thoát ở Bài ' +
      '21). Luồng chính không hề làm gì sai — nó chết chỉ vì ở chung nhà.</p>' +
      '<p><code>conchet</code> thì tiến trình con chết vì tín hiệu 11, cha <b>đọc được nguyên ' +
      'nhân</b> qua <code>WTERMSIG</code>, chạy tiếp và thoát bình thường với mã 0. Cha có thể ' +
      'ghi log, khởi động lại con, hoặc chuyển sang chế độ dự phòng.</p>' +
      '<p>Đây là lý do <b>kiến trúc</b> khiến nhiều hệ thống nhúng quan trọng chọn tiến trình ' +
      'chứ không phải luồng: <b>ranh giới cách ly lỗi</b>. systemd, trình duyệt web, và hầu hết ' +
      'các bộ giám sát thiết bị đều tách phần dễ sập thành tiến trình riêng có thể chết và hồi ' +
      'sinh mà không kéo theo phần còn lại.</p>' },

    { t: 'table',
      head: ['Tiêu chí', 'Luồng', 'Tiến trình'],
      rows: [
        ['Giá tạo (đo trên máy này)', '<b>125–137 µs</b>', '<b>304–413 µs</b> — chậm hơn ~3×'],
        ['Chia sẻ dữ liệu', 'Gán một biến là xong', 'Phải qua IPC — pipe, shared memory (Bài 23)'],
        ['Bộ nhớ mỗi đơn vị', '8 MB ngăn xếp ảo (hạ được xuống 64 KB)', 'Cả một không gian địa chỉ, nhưng copy-on-write nên rẻ hơn vẻ ngoài'],
        ['Một đơn vị sập', '<b>Cả tiến trình chết</b>, mã 139', 'Chỉ con chết, cha đọc được nguyên nhân và xử lý'],
        ['Rủi ro lập trình', 'Race condition, deadlock — lỗi âm thầm, khó tái hiện', 'Gần như không có; bộ nhớ tách biệt sẵn'],
        ['Gỡ lỗi', 'Khó. Thêm <code>gdb</code> vào là thời điểm thay đổi, lỗi biến mất', 'Dễ hơn nhiều — mỗi tiến trình gỡ độc lập'],
        ['<b>Nên chọn khi</b>', 'Cần chia sẻ nhiều dữ liệu, tạo/huỷ liên tục, dữ liệu lớn không muốn chép', 'Cần cách ly lỗi, chạy chương trình khác, quyền hạn khác nhau, hoặc muốn ngủ ngon']
      ]},

    { t: 'cal', kind: 'tip', title: 'Lời khuyên thực dụng cho embedded', x:
      '<p><b>Mặc định hãy chọn tiến trình.</b> Chỉ chuyển sang luồng khi bạn có lý do đo được — ' +
      'thường là "cần chia sẻ một khối dữ liệu lớn" hoặc "tạo/huỷ quá thường xuyên".</p>' +
      '<p>Con số ~3× ở trên nghe to, nhưng hãy đặt vào bối cảnh: nếu bạn tạo một đơn vị làm ' +
      'việc mỗi giây, khoản chênh <b>276 µs</b> là <b>0,03 %</b> thời gian. Hoàn toàn vô nghĩa. ' +
      'Nó chỉ thành vấn đề khi bạn tạo hàng nghìn đơn vị mỗi giây — và lúc đó câu trả lời đúng ' +
      'thường không phải "dùng luồng" mà là "dùng <b>hồ luồng</b>", tạo sẵn N luồng rồi tái sử ' +
      'dụng, để giá tạo về gần bằng không.</p>' +
      '<p>Nếu bạn không chắc, hãy hỏi: <i>chương trình này sập thì chuyện gì xảy ra?</i> Nếu ' +
      'câu trả lời là "thiết bị ngừng đo nhiệt độ lò và lò cháy" thì hãy dùng tiến trình.</p>' },

    /* ══════════════════════════════════════════════
       11. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: tạo lỗi, mổ lỗi, sửa lỗi, đo giá của cách sửa' },

    { t: 'p', x:
      'Năm bước. Bước 2 là bước quan trọng nhất trong cả bài — hãy làm chậm và ghi lại con số ' +
      'của chính máy bạn, vì chúng sẽ khác con số ở đây và <i>sự khác nhau đó chính là điều cần ' +
      'thấy</i>.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai22 && cd ~/embedded/bai22' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Nhìn thấy luồng bằng ps -L và top -H',
        blocks: [
          { t: 'p', x:
            'Một chương trình tạo 3 luồng rồi cùng ngủ, đủ lâu để bạn quan sát từ cửa sổ khác.' },

          { t: 'code', where: 'file', name: 'ngu.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <pthread.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'static void *ngu(void *a) { (void)a; sleep(5); return NULL; }\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pthread_t t[3];\n' +
            '    for (int i = 0; i < 3; i++) pthread_create(&t[i], NULL, ngu, NULL);\n' +
            '    printf("pid=%d, da tao 3 luong\\n", getpid());\n' +
            '    fflush(stdout);\n' +
            '    for (int i = 0; i < 3; i++) pthread_join(t[i], NULL);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -o ngu ngu.c\n' +
            './ngu &\n' +
            'sleep 1\n' +
            'ps -L -o pid,tid,nlwp,stat,comm -p $!\n' +
            'ls /proc/$!/task\n' +
            'grep -E "^(Name|Pid|Threads)" /proc/$!/status\n' +
            'wait' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=468, da tao 3 luong\n' +
            '    PID     TID NLWP STAT COMMAND\n' +
            '    468     468    4 Sl+  ngu\n' +
            '    468     470    4 Sl+  ngu\n' +
            '    468     471    4 Sl+  ngu\n' +
            '    468     472    4 Sl+  ngu\n' +
            '468\n470\n471\n472\n' +
            'Name:\tngu\n' +
            'Pid:\t468\n' +
            'Threads:\t4' },

          { t: 'cal', kind: 'info', title: 'Ba điều bảng này nói ra', x:
            '<ol>' +
            '<li><b>Cột PID giống hệt nhau ở cả bốn dòng.</b> Bốn dòng thực thi, một tiến ' +
            'trình. Không có <code>ps -L</code>, bạn chỉ thấy một dòng và không biết bên trong ' +
            'có gì.</li>' +
            '<li><b>TID của luồng chính bằng đúng PID</b> (468). Ba luồng con lấy số tiếp theo. ' +
            'Đây là quy ước cố định của Linux, không phải trùng hợp.</li>' +
            '<li><b>Chữ <code>l</code> trong <code>Sl+</code></b> là dấu hiệu "đa luồng". Khi ' +
            'gỡ lỗi trên thiết bị lạ, đây là cách nhanh nhất để biết một daemon có bao nhiêu ' +
            'luồng mà không cần đọc mã nguồn.</li>' +
            '</ol>' +
            '<p>Thử thêm: chạy <code>./ngu &amp;</code> rồi <code>top -H -p $!</code> ở cửa sổ ' +
            'khác — <code>top</code> sẽ liệt kê từng luồng thành từng dòng riêng, kèm mức CPU ' +
            'của <i>từng</i> luồng. Bạn sẽ cần đúng khung nhìn này ở bước 5.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Tự tay tạo race condition, rồi mổ mã máy tìm thủ phạm',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>dua.c</code> ở phần lý thuyết. Biên dịch ở cả ba mức tối ưu và chạy ' +
            'mỗi bản năm lần.' },

          { t: 'code', where: 'wsl', code:
            'for M in 0 1 2; do\n' +
            '  gcc -Wall -Wextra -pthread -O$M -o dua_o$M dua.c\n' +
            '  echo "===== -O$M ====="\n' +
            '  for i in 1 2 3 4 5; do ./dua_o$M; done\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '===== -O0 =====\n' +
            'mong doi 2000000, thuc te 1102554, mat 897446 lan tang (44.9%)\n' +
            'mong doi 2000000, thuc te 1229642, mat 770358 lan tang (38.5%)\n' +
            'mong doi 2000000, thuc te 1264184, mat 735816 lan tang (36.8%)\n' +
            '===== -O1 =====\n' +
            'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
            'mong doi 2000000, thuc te 1000000, mat 1000000 lan tang (50.0%)\n' +
            '===== -O2 =====\n' +
            'mong doi 2000000, thuc te 2000000, mat 0 lan tang (0.0%)\n' +
            'mong doi 2000000, thuc te 2000000, mat 0 lan tang (0.0%)',
            notes: ['Rút gọn để dễ đọc. Điều cần ghi lại: <code>-O0</code> mỗi lần một số ' +
              'khác, <code>-O1</code> <b>luôn</b> mất đúng một nửa, <code>-O2</code> ' +
              '<b>luôn</b> ra đáp án đúng.'] },

          { t: 'p', x:
            'Giờ hỏi mã máy xem vì sao ba mức lại khác nhau đến thế:' },

          { t: 'code', where: 'wsl', code:
            'for M in 0 1 2; do\n' +
            '  echo "===== -O$M ====="\n' +
            '  objdump -d --no-show-raw-insn dua_o$M | sed -n "/<tang>:/,/^$/p" | grep -E "dem|add"\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '===== -O0 =====\n' +
            '    11be:\tmov    0x2e53(%rip),%rax        # 4018 <dem>\n' +
            '    11c5:\tadd    $0x1,%rax\n' +
            '    11c9:\tmov    %rax,0x2e48(%rip)        # 4018 <dem>\n' +
            '    11d0:\taddl   $0x1,-0x4(%rbp)\n' +
            '===== -O1 =====\n' +
            '    11b4:\tmov    0x2e5d(%rip),%rdx        # 4018 <dem>\n' +
            '    11bf:\tadd    $0xf4241,%rdx\n' +
            '    11d3:\tadd    $0x1,%rax\n' +
            '    11dc:\tmov    %rcx,0x2e35(%rip)        # 4018 <dem>\n' +
            '===== -O2 =====\n' +
            '    1274:\taddq   $0xf4240,0x2d99(%rip)        # 4018 <dem>' },

          { t: 'cal', kind: 'why', title: 'Đếm số lần chạm vào <dem> — đó là toàn bộ lời giải', x:
            '<ul>' +
            '<li><b><code>-O0</code>: hai lần chạm mỗi vòng</b> (một <code>mov</code> đọc, một ' +
            '<code>mov</code> ghi), tức 2 000 000 lần đọc và 2 000 000 lần ghi. Cửa sổ va chạm ' +
            'mở suốt → mất 36–45 %, ngẫu nhiên.</li>' +
            '<li><b><code>-O1</code>: hai lần chạm cả hàm</b> — đọc một lần ở ' +
            '<code>11b4</code>, ghi một lần ở <code>11dc</code>. Cả hai luồng đọc 0, cả hai ghi ' +
            '1 000 000 → mất chính xác một nửa, mọi lần chạy.</li>' +
            '<li><b><code>-O2</code>: một lệnh duy nhất</b>. Trình biên dịch nhận ra vòng lặp ' +
            'chỉ là "cộng 1 000 000" nên viết thẳng <code>addq $0xf4240</code>.</li>' +
            '</ul>' +
            '<p>Nếu con số của bạn khác con số ở đây thì <b>đó là bằng chứng ủng hộ bài học</b>, ' +
            'không phải bạn làm sai. Một chương trình chạy ra kết quả khác nhau trên máy khác ' +
            'nhau, ngày khác nhau, chính là định nghĩa của race condition.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Sửa bằng hai cách, đo giá của từng cách',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>khoa.c</code> (mutex) và <code>nguyentu.c</code> (biến nguyên tử) ở ' +
            'phần lý thuyết. Biên dịch cả hai ở <b>cùng mức <code>-O0</code></b> với ' +
            '<code>dua_o0</code> để so sánh công bằng.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -O0 -o khoa khoa.c\n' +
            'gcc -Wall -Wextra -pthread -O0 -o nguyentu nguyentu.c\n' +
            'echo "--- tinh dung dan ---"\n' +
            'for p in dua_o0 nguyentu khoa; do printf "%-9s " $p; ./$p; done\n' +
            'echo "--- thoi gian ---"\n' +
            'for p in dua_o0 nguyentu khoa; do\n' +
            '  S=$(date +%s%N); ./$p > /dev/null; E=$(date +%s%N)\n' +
            '  echo "$p: $(( (E-S)/1000000 )) ms"\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- tinh dung dan ---\n' +
            'dua_o0    mong doi 2000000, thuc te 1264184, mat 735816 lan tang (36.8%)\n' +
            'nguyentu  mong doi 2000000, thuc te 2000000\n' +
            'khoa      mong doi 2000000, thuc te 2000000\n' +
            '--- thoi gian ---\n' +
            'dua_o0: 14 ms\n' +
            'nguyentu: 54 ms\n' +
            'khoa: 170 ms' },

          { t: 'code', where: 'wsl', code:
            'objdump -d --no-show-raw-insn nguyentu | sed -n "/<tang>:/,/^$/p" | grep -i lock' },

          { t: 'code', where: 'out', nocopy: true, code:
            '    11be:\tlock addq $0x1,0x2e51(%rip)        # 4018 <dem>' },

          { t: 'cmdx', cmd: 'lock addq $0x1,0x2e51(%rip)',
            title: 'Vì sao một lệnh này đủ để đúng',
            rows: [
              ['<code>lock</code>', 'Tiền tố ra lệnh cho CPU giữ độc quyền dòng cache chứa biến trong suốt lệnh', 'Đây là bảo đảm <b>phần cứng</b>. Không lõi nào chen vào giữa được'],
              ['<code>addq</code>', 'Cộng 64-bit thẳng vào toán hạng bộ nhớ', 'Không cần thanh ghi trung gian, nên không có khe hở đọc–ghi'],
              ['<code>$0x1</code>', 'Cộng thêm 1', 'Đúng một đơn vị mỗi vòng — trái với <code>$0xf4240</code> ở <code>-O2</code>'],
              ['<code>0x2e51(%rip)</code>', 'Địa chỉ của <code>dem</code>, tính tương đối theo con trỏ lệnh', 'Kiểu định địa chỉ độc lập vị trí của mã PIE — bạn đã gặp ở Bài 18']
            ]},

          { t: 'cal', kind: 'info', title: 'Ba con số cần chép vào sổ tay', x:
            '<p><b>1× / ~4× / ~12×</b> — sai-nhưng-nhanh, nguyên tử, mutex. Đo lại ba lần mỗi ' +
            'bên thì được 13–15 ms, 47–63 ms, 160–173 ms.</p>' +
            '<p>Hãy hiểu đúng ý nghĩa: con số này là <b>trường hợp xấu nhất</b>, vì chương trình ' +
            'không làm gì ngoài khoá và cộng. Trong mã thật, mỗi vùng tới hạn làm nhiều việc ' +
            'hơn nên tỷ lệ chi phí khoá tụt xuống rất nhanh.</p>' +
            '<p>Thử tự chứng minh: sửa <code>khoa.c</code> cho mỗi luồng cộng vào một biến cục ' +
            'bộ trong vòng lặp, rồi chỉ khoá <b>một lần duy nhất</b> ở cuối để cộng gộp vào ' +
            '<code>dem</code>. Kết quả vẫn đúng 2 000 000, nhưng thời gian sẽ về gần bằng bản ' +
            'không khoá. Đó là bài học thiết kế thật sự của bước này.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Gây deadlock, chẩn đoán nó, rồi sửa bằng thứ tự khoá',
        blocks: [
          { t: 'p', x:
            'Gõ lại <code>ketcung.c</code> ở phần lý thuyết. Dùng <code>timeout</code> để nó ' +
            'không treo terminal của bạn vĩnh viễn.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -o ketcung ketcung.c\n' +
            'timeout 5 ./ketcung\n' +
            'echo "ma thoat = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=5434\n' +
            '  [luong2] giu B, xin A\n' +
            '  [luong1] giu A, xin B\n' +
            'ma thoat = 124' },

          { t: 'p', x:
            'Giờ khám nghiệm tại chỗ: chạy nền, để nó kẹt, rồi hỏi nhân từng luồng đang ở đâu.' },

          { t: 'code', where: 'wsl', code:
            './ketcung > /dev/null 2>&1 &\n' +
            'KP=$!\n' +
            'sleep 2\n' +
            'ps -L -o pid,tid,stat,wchan:20,comm -p $KP\n' +
            'grep -E "^(State|Threads)" /proc/$KP/status\n' +
            'kill -9 $KP' },

          { t: 'code', where: 'out', nocopy: true, code:
            '    PID     TID STAT WCHAN                COMMAND\n' +
            '   5440    5440 Sl+  futex_do_wait        ketcung\n' +
            '   5440    5442 Sl+  futex_do_wait        ketcung\n' +
            '   5440    5443 Sl+  futex_do_wait        ketcung\n' +
            'State:\tS (sleeping)\n' +
            'Threads:\t3' },

          { t: 'cal', kind: 'tip', title: 'Cần SIGKILL, vì SIGTERM cũng không cứu được', x:
            '<p>Để ý dòng cuối phải dùng <code>kill -9</code>. Vì sao <code>SIGTERM</code> ' +
            'không đủ? Vì chương trình này không đăng ký handler nào, nên đúng ra ' +
            '<code>SIGTERM</code> phải giết được nó theo hành vi mặc định — và thật vậy, nó ' +
            'giết được.</p>' +
            '<p>Nhưng hãy hình dung một daemon <i>có</i> bắt <code>SIGTERM</code> đàng hoàng ' +
            'như <code>tatem.c</code> ở Bài 21, rồi bị deadlock. Handler đặt cờ, nhưng vòng lặp ' +
            'chính đang kẹt ở <code>futex_do_wait</code> và <b>không bao giờ quay lại kiểm tra ' +
            'cờ</b>. Tắt êm thất bại, systemd chờ hết <b>1 phút 30 giây</b> rồi ' +
            '<code>SIGKILL</code>.</p>' +
            '<p>Đó là lý do deadlock trên thiết bị hiện ra dưới dạng "thiết bị mất 90 giây mỗi ' +
            'lần tắt nguồn" — một triệu chứng nghe chẳng liên quan gì tới khoá.</p>' },

          { t: 'p', x:
            'Sửa: bắt <code>luong2</code> lấy khoá theo <b>cùng thứ tự</b> với ' +
            '<code>luong1</code> — A trước, B sau.' },

          { t: 'code', where: 'wsl', code:
            'sed \'s|pthread_mutex_lock(&B);  printf("  \\[luong2\\] giu B, xin A|pthread_mutex_lock(\\&A);  printf("  [luong2] giu A, xin B|; s|pthread_mutex_lock(&A);  printf("  \\[luong2\\] giu ca B va A|pthread_mutex_lock(\\&B);  printf("  [luong2] giu ca A va B|\' ketcung.c > thutu.c\n' +
            'gcc -Wall -Wextra -pthread -o thutu thutu.c\n' +
            'timeout 5 ./thutu\n' +
            'echo "ma thoat = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pid=5464\n' +
            '  [luong1] giu A, xin B\n' +
            '  [luong1] giu ca A va B\n' +
            '  [luong2] giu A, xin B\n' +
            '  [luong2] giu ca A va B\n' +
            'khong bao gio in ra dong nay\n' +
            'ma thoat = 0',
            notes: ['Nếu <code>sed</code> khó chịu, cứ mở <code>ketcung.c</code> bằng ' +
              '<code>nano</code> và đổi tay hai dòng trong <code>luong2</code>: khoá ' +
              '<code>A</code> trước, <code>B</code> sau.',
              'Dòng "khong bao gio in ra dong nay" giờ <i>có</i> in ra — đó là bằng chứng ' +
              '<code>main</code> đã qua được cả hai <code>pthread_join</code>.'] },

          { t: 'cal', kind: 'why', title: 'Không phải "giảm xác suất" mà là "loại bỏ khả năng"', x:
            '<p>Chú ý bản sửa <b>không</b> thêm khoá, không thêm <code>trylock</code>, không ' +
            'thêm hạn chờ. Nó chỉ đổi <b>thứ tự</b> hai dòng.</p>' +
            '<p>Và deadlock không "hiếm đi" — nó trở nên <b>không thể xảy ra</b>. Muốn có vòng ' +
            'tròn chờ đợi thì phải có luồng giữ A xin B <i>và</i> luồng giữ B xin A. Nếu mọi ' +
            'luồng đều lấy A trước, vế thứ hai không tồn tại.</p>' +
            '<p>Hãy so với cách "sửa" bằng <code>sleep</code> hay bằng <code>timedlock</code> — ' +
            'những cách đó chỉ làm lỗi hiếm hơn, tức là <b>khó tìm hơn</b>. Đây là mẫu mực của ' +
            'sửa lỗi đúng: đổi cấu trúc để lỗi không có chỗ tồn tại.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Ba phép đo quyết định kiến trúc: CPU, errno, và cái chết',
        blocks: [
          { t: 'p', x:
            '<b>5a.</b> Vòng lặp bận đốt bao nhiêu CPU so với <code>pthread_cond_wait</code>? ' +
            'Hai chương trình cùng chờ đúng 2 giây.' },

          { t: 'code', where: 'file', name: 'banroi.c — cách SAI', lang: 'c', code:
            '#include <pthread.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'static volatile int san_sang = 0;\n' +
            'static void *doi(void *a) { (void)a; while (!san_sang) { } return NULL; }\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pthread_t t;\n' +
            '    pthread_create(&t, NULL, doi, NULL);\n' +
            '    sleep(2);\n' +
            '    san_sang = 1;\n' +
            '    pthread_join(t, NULL);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'file', name: 'ngoannho.c — cách ĐÚNG', lang: 'c', code:
            '#include <pthread.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'static int san_sang = 0;\n' +
            'static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;\n' +
            'static pthread_cond_t  c = PTHREAD_COND_INITIALIZER;\n' +
            '\n' +
            'static void *doi(void *a)\n' +
            '{\n' +
            '    (void)a;\n' +
            '    pthread_mutex_lock(&m);\n' +
            '    while (!san_sang) pthread_cond_wait(&c, &m);\n' +
            '    pthread_mutex_unlock(&m);\n' +
            '    return NULL;\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pthread_t t;\n' +
            '    pthread_create(&t, NULL, doi, NULL);\n' +
            '    sleep(2);\n' +
            '    pthread_mutex_lock(&m);\n' +
            '    san_sang = 1;\n' +
            '    pthread_cond_signal(&c);\n' +
            '    pthread_mutex_unlock(&m);\n' +
            '    pthread_join(t, NULL);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -O1 -o banroi banroi.c\n' +
            'gcc -Wall -Wextra -pthread -O1 -o ngoannho ngoannho.c\n' +
            '/usr/bin/time -f "banroi   : thuc te %e s | CPU %U s | dung CPU %P" ./banroi\n' +
            '/usr/bin/time -f "ngoannho : thuc te %e s | CPU %U s | dung CPU %P" ./ngoannho' },

          { t: 'code', where: 'out', nocopy: true, code:
            'banroi   : thuc te 2.00 s | CPU 1.99 s | dung CPU 99%\n' +
            'ngoannho : thuc te 2.00 s | CPU 0.00 s | dung CPU 0%' },

          { t: 'p', x:
            '<b>5b.</b> <code>errno</code> có bị các luồng giẫm lên nhau không? Đặt ' +
            '<code>errno</code> của luồng chính thành <code>EBADF</code>, rồi cho luồng khác ' +
            'gây một lỗi hoàn toàn khác.' },

          { t: 'code', where: 'file', name: 'errno_rieng.c', lang: 'c', code:
            '#define _GNU_SOURCE\n' +
            '#include <stdio.h>\n' +
            '#include <pthread.h>\n' +
            '#include <errno.h>\n' +
            '#include <string.h>                 /* strerror */\n' +
            '#include <unistd.h>\n' +
            '#include <fcntl.h>\n' +
            '\n' +
            'static void *mo_hong(void *a)\n' +
            '{\n' +
            '    (void)a;\n' +
            '    open("/khong/he/ton/tai", O_RDONLY);       /* -> ENOENT (2) */\n' +
            '    printf("  [luong tid=%ld] errno = %d (%s)\\n",\n' +
            '           (long)gettid(), errno, strerror(errno));\n' +
            '    return NULL;\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    errno = 0;\n' +
            '    close(9999);                               /* -> EBADF (9) */\n' +
            '    printf("main  tid=%ld  errno = %d truoc khi tao luong\\n",\n' +
            '           (long)gettid(), errno);\n' +
            '\n' +
            '    pthread_t t;\n' +
            '    pthread_create(&t, NULL, mo_hong, NULL);\n' +
            '    pthread_join(t, NULL);\n' +
            '\n' +
            '    printf("main  tid=%ld  errno = %d SAU khi luong kia doi errno cua no\\n",\n' +
            '           (long)gettid(), errno);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -o errno_rieng errno_rieng.c && ./errno_rieng' },

          { t: 'code', where: 'out', nocopy: true, code:
            'main  tid=506  errno = 9 truoc khi tao luong\n' +
            '  [luong tid=513] errno = 2 (No such file or directory)\n' +
            'main  tid=506  errno = 9 SAU khi luong kia doi errno cua no' },

          { t: 'cal', kind: 'info', title: 'errno là biến cục bộ luồng, không phải biến toàn cục', x:
            '<p>Luồng chính giữ nguyên <b>9</b> (<code>EBADF</code>) trong khi luồng kia mang ' +
            '<b>2</b> (<code>ENOENT</code>). Hai giá trị cùng tồn tại, không giẫm lên nhau.</p>' +
            '<p>Đây là một ngoại lệ đáng chú ý với quy tắc "luồng dùng chung mọi biến toàn ' +
            'cục". <code>errno</code> thật ra <b>không phải</b> biến — nó là một macro nở ra ' +
            'thành lời gọi trả về con trỏ tới ô nhớ riêng của <i>luồng hiện tại</i>, đặt trong ' +
            'vùng TLS (<i>thread-local storage</i>). Bạn có thể tự tạo biến như vậy bằng từ ' +
            'khoá <code>_Thread_local</code> của C11.</p>' +
            '<p>Nếu không có cơ chế này, mọi hàm thư viện C đều không dùng nổi trong chương ' +
            'trình đa luồng — và đó chính là một trong những thứ mà <code>-D_REENTRANT</code> ' +
            'từng phải bật lên.</p>' },

          { t: 'p', x:
            '<b>5c.</b> Phép đo quan trọng nhất: một luồng sập thì ai chết? Cho luồng ghi vào ' +
            'con trỏ NULL, và làm điều y hệt bằng tiến trình con để so.' },

          { t: 'code', where: 'file', name: 'luongchet.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <pthread.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'static void *pha(void *a)\n' +
            '{\n' +
            '    (void)a;\n' +
            '    sleep(1);\n' +
            '    int *p = NULL;\n' +
            '    *p = 1;                        /* co tinh gay SIGSEGV */\n' +
            '    return NULL;\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pthread_t t;\n' +
            '    pthread_create(&t, NULL, pha, NULL);\n' +
            '    for (int i = 0; i < 5; i++) {\n' +
            '        printf("main van song, giay %d\\n", i);\n' +
            '        fflush(stdout);\n' +
            '        sleep(1);\n' +
            '    }\n' +
            '    pthread_join(t, NULL);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'file', name: 'conchet.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <unistd.h>\n' +
            '#include <sys/wait.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pid_t p = fork();\n' +
            '    if (p == 0) { sleep(1); int *q = NULL; *q = 1; _exit(0); }\n' +
            '\n' +
            '    for (int i = 0; i < 3; i++) {\n' +
            '        printf("cha van song, giay %d\\n", i);\n' +
            '        fflush(stdout);\n' +
            '        sleep(1);\n' +
            '    }\n' +
            '    int tt;\n' +
            '    waitpid(p, &tt, 0);\n' +
            '    printf("con chet vi tin hieu %d, cha VAN CHAY BINH THUONG\\n", WTERMSIG(tt));\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -pthread -o luongchet luongchet.c\n' +
            'gcc -Wall -Wextra -o conchet conchet.c\n' +
            './luongchet; echo "ma thoat = $?"\n' +
            'echo "-----"\n' +
            './conchet;   echo "ma thoat = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'main van song, giay 0\n' +
            'main van song, giay 1\n' +
            'Segmentation fault\n' +
            'ma thoat = 139\n' +
            '-----\n' +
            'cha van song, giay 0\n' +
            'cha van song, giay 1\n' +
            'cha van song, giay 2\n' +
            'con chet vi tin hieu 11, cha VAN CHAY BINH THUONG\n' +
            'ma thoat = 0' },

          { t: 'cal', kind: 'danger', title: 'Đếm số dòng: 2 trên 5, và 3 trên 3', x:
            '<p><code>luongchet</code> lẽ ra in <b>5</b> dòng, chỉ in được <b>2</b>. Luồng ' +
            'chính đang chạy đúng hoàn toàn, không đụng con trỏ nào, vẫn bị xoá sổ cùng với kẻ ' +
            'gây lỗi. Mã thoát <b>139</b> = 128 + 11 = <code>SIGSEGV</code> — đúng bảng bạn đã ' +
            'lập ở Bài 21.</p>' +
            '<p><code>conchet</code> in đủ <b>3</b> dòng, đọc được nguyên nhân cái chết của con ' +
            '(tín hiệu 11), rồi thoát bình thường với mã <b>0</b>.</p>' +
            '<p>Hãy để phép đo này định hình cách bạn thiết kế. Với luồng, <b>mọi</b> dòng mã ' +
            'trong <b>mọi</b> luồng đều có quyền giết cả tiến trình — kể cả một thư viện của ' +
            'bên thứ ba mà bạn không đọc mã. Với tiến trình, ranh giới lỗi là ranh giới thật, ' +
            'do nhân cưỡng chế bằng MMU.</p>' +
            '<p>Đây là lý do vì sao khi được hỏi "luồng hay tiến trình", câu trả lời mặc định ' +
            'trong nhúng nên là <b>tiến trình</b>, và luồng phải tự chứng minh mình xứng ' +
            'đáng.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       12. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mười ba dòng dưới đây đều là lỗi <b>thật</b>, gặp trong lúc dựng và đo các chương trình ' +
      'của chính bài này. Bốn dòng cuối là loại nguy hiểm nhất: chương trình <i>không</i> báo ' +
      'lỗi gì cả.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>implicit declaration of function \'gettid\'; did you mean \'getgid\'?</code>',
         '<code>gettid()</code> là mở rộng của GNU, chỉ lộ ra khi bật macro tính năng',
         'Thêm <code>#define _GNU_SOURCE</code> <b>trên dòng đầu tiên</b>, trước mọi <code>#include</code>. Đặt sau một <code>#include</code> nào đó là vô tác dụng'],

        ['<code>implicit declaration of function \'strerror\'</code>',
         'Thiếu <code>#include &lt;string.h&gt;</code>',
         '<code>errno.h</code> chỉ khai báo <code>errno</code> và các mã lỗi; hàm dịch mã lỗi ra chữ nằm ở <code>string.h</code>'],

        ['<code>undefined reference to `pthread_create\'</code>',
         'Thiếu <code>-pthread</code> khi liên kết',
         'Trên máy này glibc 2.43 đã gộp libpthread vào libc nên lỗi không xuất hiện — nhưng nó <b>sẽ</b> xuất hiện ngay khi bạn biên dịch chéo cho thiết bị dùng glibc cũ hoặc uClibc-ng. Luôn viết <code>-pthread</code>'],

        ['<code>warning: unused parameter \'a\'</code>',
         '<code>-Wextra</code> phàn nàn vì hàm luồng bắt buộc nhận <code>void *</code> mà bạn không dùng',
         'Viết <code>(void)a;</code> ở dòng đầu thân hàm. Đừng bỏ <code>-Wextra</code> để khỏi thấy cảnh báo'],

        ['<code>error: \'PTHREAD_STACK_MIN\' undeclared</code>',
         'Hằng này nằm sau <code>_GNU_SOURCE</code> ở một số phiên bản glibc',
         'Thêm <code>#define _GNU_SOURCE</code>, hoặc dùng <code>sysconf(_SC_THREAD_STACK_MIN)</code> cho khả chuyển'],

        ['<code>pthread_create</code> trả về <b>11</b> (<code>EAGAIN</code>)',
         'Chạm trần số luồng: <code>ulimit -u</code> = <b>19629</b> trên máy này, hoặc hết bộ nhớ ảo cho ngăn xếp',
         'Giảm ngăn xếp mỗi luồng bằng <code>pthread_attr_setstacksize()</code>, hoặc dùng nhóm luồng cố định thay vì tạo luồng mỗi yêu cầu'],

        ['<code>pthread_join</code> trả về <b>35</b> (<code>EDEADLK</code>)',
         'Luồng tự <code>join</code> chính nó, hoặc <code>join</code> hai lần cùng một luồng',
         'Mỗi <code>pthread_t</code> chỉ được <code>join</code> đúng một lần. Nếu không cần giá trị trả về, hãy <code>pthread_detach()</code> ngay sau khi tạo'],

        ['<code>pthread_mutex_lock</code> trả về <b>22</b> (<code>EINVAL</code>)',
         'Mutex chưa khởi tạo, hoặc đã bị <code>pthread_mutex_destroy</code>, hoặc nằm trong vùng nhớ đã <code>free</code>',
         'Khởi tạo tĩnh bằng <code>PTHREAD_MUTEX_INITIALIZER</code> khi có thể. Nhớ rằng khoá phải sống lâu hơn mọi luồng dùng nó'],

        ['<code>perror()</code> in ra <code>Success</code> ngay sau khi một hàm <code>pthread_*</code> hỏng',
         'Họ <code>pthread_*</code> <b>trả về</b> mã lỗi chứ không đặt <code>errno</code>',
         'Dùng <code>int rc = pthread_...(); if (rc) fprintf(stderr, "%s\\n", strerror(rc));</code>. Đây là ngoại lệ duy nhất trong toàn bộ API POSIX bạn đã học'],

        ['<i>Không báo gì.</i> Kết quả sai và <b>khác nhau mỗi lần chạy</b>',
         'Race condition kinh điển: đọc–sửa–ghi không được bảo vệ',
         'Tìm mọi biến toàn cục bị nhiều luồng ghi. Bọc bằng mutex, hoặc đổi sang <code>_Atomic</code>. Kiểm chứng bằng <code>gcc -fsanitize=thread</code>'],

        ['<i>Không báo gì.</i> Kết quả sai <b>chính xác một nửa</b>, ổn định mọi lần chạy',
         'Trình biên dịch đã nâng biến vào thanh ghi ở <code>-O1</code>; mỗi luồng chỉ ghi về bộ nhớ đúng một lần',
         'Không phải lỗi của trình biên dịch. Race chưa được sửa; thêm khoá thật. <b>Không</b> dùng <code>volatile</code> — nó chặn tối ưu nhưng không tạo tính nguyên tử'],

        ['<i>Không báo gì.</i> Chạy đúng ở <code>-O2</code> nhưng sai ở <code>-O0</code>',
         'Tối ưu đã gộp cả vòng lặp thành một lệnh, tình cờ che mất lỗi',
         'Nguy hiểm nhất trong bảng này. Đừng bao giờ kết luận "sửa xong" dựa trên một mức tối ưu. Test ở đúng mức <code>-O</code> mà bạn sẽ giao hàng'],

        ['<i>Không báo gì.</i> Chương trình treo; <code>timeout 5</code> trả mã <b>124</b>',
         'Deadlock — kiểm tra bằng <code>ps -L -o tid,stat,wchan</code>: mọi luồng đều <code>S</code> ở <code>futex_do_wait</code>',
         'Vẽ đồ thị "luồng nào giữ khoá nào, xin khoá nào". Áp một <b>thứ tự khoá toàn cục</b> rồi tuân thủ tuyệt đối']
      ]},

    /* ══════════════════════════════════════════════
       13. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 22', items: [
      'Luồng là các dòng thực thi <b>dùng chung một không gian địa chỉ</b>. Cùng heap, cùng biến toàn cục, cùng bảng mô tả file — chỉ riêng ngăn xếp, thanh ghi, <code>errno</code> và TID.',
      'Nhân Linux không phân biệt luồng với tiến trình: cả hai là <b>task</b>, cùng sinh ra từ <code>clone()</code>, chỉ khác các cờ chia sẻ. Vì vậy TID của luồng chính luôn bằng PID.',
      'Nhìn thấy luồng bằng <code>ps -L</code>, <code>top -H</code>, <code>ls /proc/&lt;pid&gt;/task</code> hoặc dòng <code>Threads:</code> trong <code>/proc/&lt;pid&gt;/status</code>. Chữ <code>l</code> trong cột <code>STAT</code> nghĩa là đa luồng.',
      'Trên glibc <b>2.34</b> trở lên (máy này: <b>2.43</b>) <code>libpthread</code> đã gộp vào <code>libc.so.6</code>, nên quên <code>-pthread</code> vẫn liên kết được. <b>Vẫn phải viết <code>-pthread</code></b> — vì <code>-D_REENTRANT</code> và vì toolchain biên dịch chéo của bạn có thể là glibc cũ.',
      'Họ hàm <code>pthread_*</code> <b>trả về</b> mã lỗi, không đặt <code>errno</code>. <code>perror</code> sau một lời gọi <code>pthread_*</code> hỏng là một lỗi thầm lặng.',
      '<code>dem++</code> <b>không</b> là một thao tác nguyên tử. Ở <code>-O0</code> nó là <code>mov</code>/<code>add</code>/<code>mov</code> — ba lệnh, hai lần chạm bộ nhớ, một cửa sổ va chạm mở toang.',
      'Cùng một mã nguồn cho <b>ba kết quả khác nhau</b> ở ba mức tối ưu: <code>-O0</code> mất <b>36–45 %</b> ngẫu nhiên, <code>-O1</code> mất <b>đúng 50 %</b> ổn định, <code>-O2</code> ra <b>kết quả đúng</b>. Trường hợp thứ ba nguy hiểm nhất vì nó khiến bạn tin là mã đã đúng.',
      'Giá của tính đúng đắn, đo trên máy này: không khoá <b>~14 ms</b> (sai), <code>_Atomic</code> <b>~54 ms</b> (<b>~4×</b>), mutex <b>~170 ms</b> (<b>~12×</b>). Đây là cận trên; vùng tới hạn càng làm nhiều việc, tỷ lệ này càng nhỏ.',
      '<code>_Atomic</code> biên dịch thành một lệnh <code>lock addq</code> — phần cứng bảo đảm. Nó chỉ dùng được cho <b>một</b> biến; hai biến phải nhất quán với nhau thì bắt buộc dùng mutex.',
      'Chờ bằng vòng lặp bận đốt <b>99 % CPU</b>; <code>pthread_cond_wait</code> đốt <b>0 %</b>. Trên thiết bị chạy pin, đây là khác biệt giữa vài giờ và vài ngày.',
      '<code>pthread_cond_wait</code> làm ba việc <b>nguyên tử</b>: mở khoá, ngủ, và khoá lại khi thức. Luôn gọi trong <code>while</code>, không bao giờ trong <code>if</code> — vì có thức giả (<i>spurious wakeup</i>).',
      'Deadlock không sập, nó <b>treo</b>: <code>timeout</code> trả <b>124</b>, mọi luồng đứng ở <code>futex_do_wait</code>. Cách chữa duy nhất đáng tin là áp một <b>thứ tự khoá toàn cục</b> — nó khiến deadlock <i>không thể</i> xảy ra, chứ không phải hiếm hơn.',
      'Tạo luồng nhanh hơn <code>fork</code> <b>2,4–3,1×</b> (<b>125–137 µs</b> so với <b>304–413 µs</b>) — nhưng chỉ khi máy đã nóng; lần chạy đầu tiên tốn <b>860 µs</b>.',
      'Mỗi luồng lấy <b>8 MB</b> ngăn xếp ảo mặc định. 100 luồng = <b>822 368 kB</b> ảo nhưng chỉ <b>2 768 kB</b> RSS thật. Trên thiết bị 64 MB không có swap, hãy hạ xuống bằng <code>pthread_attr_setstacksize()</code>.',
      '<b>Một luồng sập là cả tiến trình sập</b>: <code>luongchet</code> in 2/5 dòng rồi thoát mã <b>139</b>. Tiến trình con sập thì cha in đủ 3/3 dòng và thoát mã <b>0</b>. Cách ly lỗi là lý do mạnh nhất để chọn tiến trình.'
    ]},

    /* ══════════════════════════════════════════════
       14. BÀI TIẾP THEO
       ══════════════════════════════════════════════ */
    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Bài này kết luận rằng trong nhúng, <b>tiến trình</b> nên là lựa chọn mặc định vì nó ' +
      'cách ly lỗi. Nhưng kết luận đó để lại ngay một câu hỏi: nếu hai tiến trình không dùng ' +
      'chung một byte nào, làm sao chúng nói chuyện được với nhau?</p>' +
      '<p><b>Bài 23 — Giao tiếp liên tiến trình (IPC)</b> trả lời bằng năm cơ chế của nhân: ' +
      '<code>pipe</code>, FIFO, bộ nhớ chia sẻ POSIX (<code>shm_open</code> + <code>mmap</code>), ' +
      'hàng đợi thông điệp (<code>mq_*</code>) và semaphore. Bạn sẽ <b>đo</b> chúng chứ không ' +
      'chỉ đọc: cùng chuyển một khối dữ liệu, cơ chế nào nhanh nhất và nhanh hơn bao nhiêu lần? ' +
      'Câu trả lời sẽ giải thích vì sao bộ nhớ chia sẻ tồn tại dù nó là cơ chế phiền phức ' +
      'nhất — và vì sao nó lại kéo mutex của bài hôm nay quay trở lại, lần này với thuộc tính ' +
      '<code>PTHREAD_PROCESS_SHARED</code>.</p>' +
      '<p>Bài đó cũng chạm lần đầu vào <code>mmap</code> trên <code>/dev/mem</code> — cách một ' +
      'chương trình không gian người dùng đọc thẳng thanh ghi phần cứng. Đó là bước chân đầu ' +
      'tiên của bạn vào lãnh địa driver ở <b>Chặng 10</b>.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    { q: 'Hai luồng trong cùng một tiến trình <b>không</b> dùng chung thứ nào sau đây?',
      opts: ['Biến toàn cục', 'Bộ nhớ cấp phát bằng malloc', 'Ngăn xếp', 'Bảng mô tả file'],
      a: 2,
      why: 'Mỗi luồng có ngăn xếp riêng (mặc định 8 MB ảo trên máy này) để giữ biến cục bộ và ' +
           'khung hàm của riêng nó. Ba thứ còn lại đều nằm trong không gian địa chỉ chung, và ' +
           'chính sự chung đụng đó vừa là sức mạnh vừa là nguồn gốc mọi lỗi của lập trình đa ' +
           'luồng. Ngoài ngăn xếp, chỉ có thanh ghi, TID và các biến cục bộ luồng như ' +
           '<code>errno</code> là riêng.' },

    { q: 'Bạn viết <code>dem++</code> cho một biến toàn cục, hai luồng cùng chạy, và biên dịch ' +
         'ở <code>-O1</code>. Kết quả sai <b>chính xác 50 %</b>, ổn định qua cả 10 lần chạy. ' +
         'Nguyên nhân đúng nhất là gì?',
      opts: ['Trình biên dịch có lỗi ở mức -O1',
             'Trình biên dịch nâng biến vào thanh ghi, nên mỗi luồng chỉ ghi về bộ nhớ đúng một lần',
             'Bộ lập lịch luôn chuyển luồng ở đúng giữa vòng lặp',
             'Biến cần được khai báo volatile'],
      a: 1,
      why: 'Đĩa mã cho thấy ở <code>-O1</code> hàm chỉ chạm <code>dem</code> hai lần trong cả ' +
           'hàm: một <code>mov</code> đọc lúc vào, một <code>mov</code> ghi lúc ra. Cả hai luồng ' +
           'đọc 0, cộng dồn trong thanh ghi, rồi cùng ghi 1 000 000 — mất đúng một nửa, không ' +
           'phụ thuộc lịch chạy nên rất ổn định. Trình biên dịch hoàn toàn đúng theo chuẩn: ' +
           'chuẩn C cho phép giả định không có luồng khác chạm vào biến khi không có cơ chế ' +
           'đồng bộ. <code>volatile</code> chặn được tối ưu này nhưng <b>không</b> tạo tính ' +
           'nguyên tử, nên nó chỉ đổi triệu chứng chứ không sửa lỗi.' },

    { q: 'Vì sao <code>pthread_cond_wait()</code> bắt buộc phải nhận cả mutex làm tham số?',
      opts: ['Để thư viện biết luồng nào đang gọi',
             'Vì nó phải mở khoá, ngủ và khoá lại như một thao tác nguyên tử, nếu không sẽ bỏ lỡ tín hiệu',
             'Vì chuẩn POSIX quy định như vậy, không có lý do kỹ thuật',
             'Để tránh deadlock với các mutex khác'],
      a: 1,
      why: 'Điều kiện được kiểm tra khi đang giữ khoá. Nếu việc mở khoá và việc đi ngủ tách rời ' +
           'nhau, sẽ có một khe hở: luồng vừa mở khoá, chưa kịp ngủ, thì luồng kia phát ' +
           '<code>signal</code> — tín hiệu đó bay vào hư không và luồng đầu ngủ mãi mãi. ' +
           '<code>pthread_cond_wait</code> đóng khe hở đó bằng cách làm cả ba việc nguyên tử. Đây ' +
           'cũng là lý do phải gọi nó trong <code>while</code> chứ không phải <code>if</code>: ' +
           'khi thức dậy và giành lại khoá, tình hình có thể đã bị luồng thứ ba thay đổi.' },

    { q: 'Một daemon trên thiết bị của bạn ngừng phản hồi. Bạn chạy ' +
         '<code>ps -L -o tid,stat,wchan -p &lt;pid&gt;</code> và thấy <b>tất cả</b> luồng ở ' +
         'trạng thái <code>S</code> với <code>wchan</code> = <code>futex_do_wait</code>. ' +
         'Chẩn đoán khả dĩ nhất là gì?',
      opts: ['Tiến trình đang kẹt trong vòng lặp vô hạn tốn CPU',
             'Tiến trình đang chờ I/O từ thiết bị chậm',
             'Deadlock — các luồng đang chờ khoá của nhau theo vòng tròn',
             'Tiến trình đã bị treo bởi SIGSTOP'],
      a: 2,
      why: '<code>futex</code> là cơ chế nhân mà mutex của glibc dùng khi phải ngủ chờ khoá. ' +
           'Trạng thái <code>S</code> loại trừ vòng lặp bận (đó sẽ là <code>R</code> và 100 % ' +
           'CPU); chờ I/O thường hiện <code>wchan</code> của tầng khối hoặc mạng, không phải ' +
           '<code>futex_do_wait</code>; <code>SIGSTOP</code> cho trạng thái <code>T</code>. ' +
           'Điểm quan trọng cần nhớ: deadlock <b>không sập</b>, nó treo im lặng — nên nó không ' +
           'sinh core dump và không có dòng log nào. Dấu vân tay của nó là ' +
           '<code>futex_do_wait</code> trên mọi luồng.' },

    { q: 'Vì sao vẫn phải viết <code>-pthread</code> dù trên máy này (glibc 2.43) chương trình ' +
         'liên kết được ngay cả khi thiếu cờ đó?',
      opts: ['Để trình biên dịch tạo mã nhanh hơn',
             'Vì -pthread còn bật -D_REENTRANT, và vì toolchain biên dịch chéo của bạn có thể dùng glibc cũ hơn 2.34',
             'Vì không có nó thì pthread_create sẽ trả về EAGAIN',
             'Vì nó bắt buộc theo chuẩn C23'],
      a: 1,
      why: 'Từ glibc 2.34, <code>libpthread</code> đã gộp vào <code>libc.so.6</code> — trên máy ' +
           'này cả <code>pthread_create@GLIBC_2.2.5</code> lẫn <code>@@GLIBC_2.34</code> đều nằm ' +
           'ở địa chỉ <code>0xa42d0</code> trong <code>libc.so.6</code>, còn ' +
           '<code>libpthread.so.0</code> chỉ là cái vỏ 14 408 byte. Nhưng ' +
           '<code>-pthread</code> không chỉ là <code>-lpthread</code>: nó còn định nghĩa ' +
           '<code>_REENTRANT</code> cho giai đoạn tiền xử lý. Và điều quyết định với người làm ' +
           'nhúng: thiết bị đích của bạn thường chạy glibc cũ hơn hoặc uClibc-ng — ở đó thiếu ' +
           'cờ này là lỗi liên kết ngay. Bạn sẽ dựng toolchain đó ở <b>Chặng 04</b>.' },

    { q: 'Trên một thiết bị nhúng chạy pin, bạn cần một luồng chờ dữ liệu từ cảm biến. So với ' +
         '<code>while (!co_du_lieu) { }</code>, dùng biến điều kiện tiết kiệm được gì — theo ' +
         'đúng con số đã đo trong bài?',
      opts: ['Khoảng 10 % CPU', 'Từ 99 % CPU xuống 0 %', 'Khoảng 4 lần bộ nhớ', 'Không tiết kiệm gì, chỉ dễ đọc hơn'],
      a: 1,
      why: 'Hai chương trình cùng chờ đúng 2,00 giây: bản vòng lặp bận tiêu <b>1,99 s</b> thời ' +
           'gian CPU (<b>99 %</b>), bản dùng <code>pthread_cond_wait</code> tiêu <b>0,00 s</b> ' +
           '(<b>0 %</b>). Khác biệt nằm ở chỗ luồng chờ bằng biến điều kiện <i>rời khỏi hàng ' +
           'đợi chạy</i> của bộ lập lịch, nên CPU có thể hạ tần số hoặc vào trạng thái ngủ sâu. ' +
           'Trên thiết bị chạy pin đây thường là khác biệt giữa vài giờ và vài ngày dùng.' },

    { q: 'Một thư viện của bên thứ ba mà bạn không có mã nguồn đôi khi gây <code>SIGSEGV</code>. ' +
         'Bạn cần chương trình chính vẫn sống sót. Kiến trúc nào bảo đảm điều đó?',
      opts: ['Chạy thư viện trong một luồng riêng và bắt SIGSEGV bằng handler',
             'Chạy thư viện trong một tiến trình riêng và theo dõi bằng waitpid',
             'Chạy thư viện trong luồng riêng với ngăn xếp lớn hơn',
             'Bọc mọi lời gọi tới thư viện bằng mutex'],
      a: 1,
      why: 'Phép đo trong bài rất dứt khoát: <code>luongchet</code> lẽ ra in 5 dòng, chỉ in được ' +
           '<b>2</b> rồi cả tiến trình thoát với mã <b>139</b> — luồng chính hoàn toàn vô tội ' +
           'vẫn bị xoá sổ, vì <code>SIGSEGV</code> mặc định giết cả tiến trình. Ngược lại ' +
           '<code>conchet</code> in đủ <b>3/3</b> dòng, đọc được tín hiệu 11 từ ' +
           '<code>waitpid</code>, rồi thoát mã <b>0</b>. Ranh giới tiến trình do MMU cưỡng chế ' +
           'là ranh giới lỗi thật; luồng không có ranh giới nào. Bắt <code>SIGSEGV</code> bằng ' +
           'handler càng tệ hơn: sau khi handler chạy xong, chương trình quay lại đúng lệnh gây ' +
           'lỗi và lặp vô hạn.' }
  ]
});

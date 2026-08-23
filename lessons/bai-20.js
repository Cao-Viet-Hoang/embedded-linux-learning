/* Bài 20 — Tiến trình: fork, exec, wait */
Lesson.register({
  id: 'bai-20',
  title: 'Tiến trình: fork, exec, wait',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Bài 19 cho bạn điều khiển được một luồng thực thi duy nhất. Nhưng một thiết bị nhúng thật ' +
    'không bao giờ chỉ chạy một chương trình: có tiến trình đọc cảm biến, tiến trình gửi dữ ' +
    'liệu lên mạng, tiến trình giám sát xem hai cái kia còn sống không. Bài này dạy bạn cách ' +
    'Linux sinh ra tiến trình mới — và cách đó kỳ lạ đến mức người mới học thường không tin: ' +
    'Linux <b>không có</b> lệnh "chạy chương trình này". Nó có <code>fork()</code>, một hàm ' +
    '<b>trả về hai lần</b>, và <code>exec()</code>, một hàm <b>không bao giờ trả về</b>. Ghép ' +
    'hai thứ đó lại là ra toàn bộ cơ chế mà shell dùng mỗi lần bạn gõ một câu lệnh — và cuối ' +
    'bài bạn sẽ dựng được một <b>daemon</b> chạy nền thật sự, tách hẳn khỏi terminal.',

  goals: [
    'Giải thích được vì sao <code>fork()</code> trả về hai lần và dùng giá trị trả về để tách nhánh cha/con',
    'Chứng minh được cha và con <b>không</b> dùng chung biến, dù địa chỉ in ra giống hệt nhau',
    'Dùng <code>exec*()</code> đúng cách và biết chọn hàm nào trong sáu biến thể',
    'Đọc được mã thoát bằng <code>waitpid</code> + <code>WIFEXITED</code>/<code>WEXITSTATUS</code>/<code>WIFSIGNALED</code>',
    'Tạo ra rồi dọn sạch một tiến trình <b>zombie</b>, và giải thích tiến trình <b>mồ côi</b> được ai nhận nuôi',
    'Biến một chương trình thành <b>daemon</b> bằng double-fork và kiểm chứng qua <code>/proc/&lt;pid&gt;</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. TIẾN TRÌNH LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tiến trình là gì, dưới góc nhìn của nhân' },

    { t: 'p', x:
      'Ở Bài 9 bạn đã dùng <code>ps</code>, <code>top</code>, <code>kill</code> từ phía người ' +
      'dùng. Giờ nhìn từ phía nhân: một <b>tiến trình</b> là một cấu trúc dữ liệu trong nhân ' +
      '(<code>task_struct</code>) gom lại tất cả những gì cần để một chương trình chạy được — ' +
      'và quan trọng hơn, để nó <i>bị dừng lại rồi chạy tiếp</i> mà không hay biết gì.' },

    { t: 'table',
      head: ['Thành phần', 'Nội dung', 'Sau <code>fork</code>', 'Sau <code>exec</code>'],
      rows: [
        ['PID', 'Số định danh tiến trình', 'Con nhận PID <b>mới</b>', '<b>Giữ nguyên</b>'],
        ['Không gian địa chỉ', 'Mã, dữ liệu, heap, stack', 'Bản sao logic (copy-on-write)', '<b>Bị vứt bỏ hoàn toàn</b>, thay bằng file ELF mới'],
        ['Bảng file descriptor', 'Các fd đang mở', 'Bản sao — cha con dùng chung file đang mở', 'Giữ nguyên, trừ fd có cờ <code>O_CLOEXEC</code>'],
        ['Biến môi trường', '<code>PATH</code>, <code>HOME</code>…', 'Bản sao', 'Thay bằng bộ mới nếu dùng <code>execle</code>/<code>execve</code>'],
        ['Thư mục hiện tại', '<code>cwd</code>', 'Bản sao', 'Giữ nguyên'],
        ['Bộ xử lý tín hiệu', 'Hàm bạn đăng ký', 'Bản sao', '<b>Bị xoá về mặc định</b> — Bài 21 sẽ khai thác điều này'],
        ['Cha', 'PPID', 'Cha là tiến trình gọi <code>fork</code>', 'Giữ nguyên']
      ]},

    { t: 'cal', kind: 'tip', title: 'Cột thứ ba và thứ tư là toàn bộ nội dung bài học', x:
      '<p>Nhớ một câu: <b><code>fork</code> nhân đôi tiến trình, <code>exec</code> thay ruột nó.</b></p>' +
      '<p><code>fork</code> tạo tiến trình mới nhưng <i>vẫn chạy cùng chương trình</i>. ' +
      '<code>exec</code> chạy chương trình mới nhưng <i>vẫn trong tiến trình cũ</i>. Muốn "chạy ' +
      'một chương trình khác trong một tiến trình khác" — việc mà shell làm mỗi giây — bạn phải ' +
      'ghép cả hai. Không có syscall nào làm gộp một lần.</p>' },

    { t: 'p', x:
      'Toàn bộ bảng trên đọc được từ user space qua <code>/proc/&lt;pid&gt;</code> — cùng cơ chế ' +
      'hệ thống file ảo bạn đã gặp ở Bài 19. Đây là công cụ chẩn đoán số một trên thiết bị không ' +
      'có debugger:' },

    { t: 'table',
      head: ['Đường dẫn', 'Cho biết', 'Dùng khi'],
      rows: [
        ['<code>/proc/&lt;pid&gt;/cmdline</code>', 'Dòng lệnh đầy đủ, các tham số cách nhau bởi byte <code>\\0</code>', '<code>ps</code> cắt cụt tên lệnh'],
        ['<code>/proc/&lt;pid&gt;/exe</code>', 'Liên kết mềm tới file nhị phân thật đang chạy', 'Biết chính xác bản build nào đang chạy'],
        ['<code>/proc/&lt;pid&gt;/cwd</code>', 'Thư mục làm việc hiện tại', 'Tìm ra vì sao nó không thấy file cấu hình'],
        ['<code>/proc/&lt;pid&gt;/fd/</code>', 'Mọi file descriptor đang mở', 'Rò rỉ fd, hoặc "nó đang ghi vào đâu?"'],
        ['<code>/proc/&lt;pid&gt;/status</code>', 'Trạng thái, PPID, số luồng, bộ nhớ', 'Ảnh chụp tổng quát — bắt đầu từ đây'],
        ['<code>/proc/&lt;pid&gt;/environ</code>', 'Biến môi trường lúc khởi động', 'Daemon chạy sai vì thiếu biến môi trường']
      ]},

    /* ══════════════════════════════════════════════
       2. FORK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'fork() — hàm duy nhất trả về hai lần' },

    { t: 'p', x:
      'Bạn gọi <code>fork()</code> <b>một</b> lần. Nó trả về <b>hai</b> lần — một lần trong tiến ' +
      'trình cũ, một lần trong tiến trình mới vừa được nhân tạo ra. Câu đó nghe vô lý cho tới ' +
      'khi bạn nhớ rằng sau lời gọi đó đã có <i>hai</i> tiến trình, và cả hai đều đang đứng ở ' +
      'đúng dòng lệnh ngay sau <code>fork</code>.' },

    { t: 'table',
      head: ['Giá trị <code>fork()</code> trả về', 'Nghĩa là', 'Bạn đang ở'],
      rows: [
        ['<b>&gt; 0</b>', 'Đây là PID của con vừa sinh', 'Tiến trình <b>cha</b>'],
        ['<b>== 0</b>', 'Không phải PID của ai cả — quy ước báo hiệu', 'Tiến trình <b>con</b>'],
        ['<b>&lt; 0</b>', 'Thất bại, không có con nào được sinh ra', 'Vẫn là tiến trình gốc']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao con nhận số 0 chứ không nhận PID của chính nó', x:
      '<p>Vì con đã tự biết PID của mình rồi — chỉ cần gọi <code>getpid()</code>. Còn cha thì ' +
      '<b>không có cách nào khác</b> để biết PID của đứa con vừa sinh, nên giá trị trả về phải ' +
      'dành cho cha.</p>' +
      '<p>Số 0 được chọn vì không tiến trình nào có PID 0 (PID 0 là scheduler của nhân, không ' +
      'nhìn thấy từ user space), nên nó là một giá trị báo hiệu an toàn.</p>' },

    { t: 'fig',
      cap: 'Một lần gọi, hai đường về. Từ dòng lệnh ngay sau fork trở đi, mọi lệnh đều được chạy hai lần — trong hai tiến trình độc lập.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ fork tách một luồng thực thi thành hai, cha nhận PID con và con nhận số 0">' +
        '<rect class="d-box-p" x="250" y="16" width="220" height="42" rx="6"/>' +
        '<text class="d-t" x="288" y="42">một tiến trình, pid = 448</text>' +
        '<line class="d-line" x1="360" y1="58" x2="360" y2="84"/>' +
        '<path class="d-arrow" d="M360 92 l-6 -10 h12 z"/>' +

        '<rect class="d-box-w" x="272" y="92" width="176" height="38" rx="6"/>' +
        '<text class="d-tm" x="308" y="116">pid_t rc = fork();</text>' +

        '<line class="d-line" x1="300" y1="130" x2="180" y2="164"/>' +
        '<path class="d-arrow" d="M172 166 l12 -3 l-3 12 z"/>' +
        '<line class="d-line" x1="420" y1="130" x2="540" y2="164"/>' +
        '<path class="d-arrow" d="M548 166 l-12 -3 l3 12 z"/>' +

        '<rect class="d-box-a" x="40" y="168" width="270" height="82" rx="6"/>' +
        '<text class="d-t" x="58" y="190">CHA — pid vẫn là 448</text>' +
        '<text class="d-tm" x="58" y="212">rc == 449</text>' +
        '<text class="d-ts" x="58" y="232">nhận PID của con; thường gọi wait()</text>' +

        '<rect class="d-box-g" x="410" y="168" width="270" height="82" rx="6"/>' +
        '<text class="d-t" x="428" y="190">CON — pid mới là 449</text>' +
        '<text class="d-tm" x="428" y="212">rc == 0</text>' +
        '<text class="d-ts" x="428" y="232">ppid = 448; thường gọi exec()</text>' +

        '<text class="d-ts" x="40" y="278">Ai chạy trước là không xác định — bộ lập lịch quyết định. Mã của bạn không được phép giả định thứ tự.</text>' +
        '</svg>' },

    { t: 'code', where: 'file', name: 'fork_twice.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("before fork: pid=%d\\n", getpid());\n' +
      '    fflush(stdout);                     /* flush buffer BEFORE fork */\n' +
      '\n' +
      '    pid_t rc = fork();\n' +
      '\n' +
      '    if (rc < 0) {\n' +
      '        perror("fork");\n' +
      '        return 1;\n' +
      '    } else if (rc == 0) {\n' +
      '        printf("  CHILD : fork returned %d, pid=%d, ppid=%d\\n",\n' +
      '               rc, getpid(), getppid());\n' +
      '    } else {\n' +
      '        printf("  PARENT: fork returned %d, pid=%d, ppid=%d\\n",\n' +
      '               rc, getpid(), getppid());\n' +
      '        wait(NULL);                     /* wait for child to finish */\n' +
      '    }\n' +
      '    printf("  both run this line (pid=%d)\\n", getpid());\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'before fork: pid=13341\n' +
      '  CHILD : fork returned 0, pid=13342, ppid=13341\n' +
      '  both run this line (pid=13342)\n' +
      '  PARENT: fork returned 13342, pid=13341, ppid=13330\n' +
      '  both run this line (pid=13341)',
      notes: [
        'Số PID trên máy bạn sẽ khác. Điều phải giống là: <b>giá trị fork trả về ở nhánh cha đúng bằng pid của con</b>, và dòng cuối in ra <b>hai</b> lần.',
        'Thứ tự hai dòng PARENT/CHILD có thể đảo — bộ lập lịch quyết định, không phải mã của bạn.'
      ]},

    { t: 'cal', kind: 'info', title: 'Đọc kỹ ba con số này', x:
      '<p><b>13341</b> là cha, <b>13342</b> là con. Ở nhánh cha, <code>fork</code> trả về ' +
      '<b>13342</b> — đúng bằng PID của con. Ở nhánh con, nó trả về <b>0</b>, và ' +
      '<code>getppid()</code> của con trả về <b>13341</b> — đúng bằng cha. Ba con số này khớp ' +
      'nhau chính là bằng chứng quan hệ cha–con được nhân thiết lập thật.</p>' +
      '<p>PID <b>13330</b> là ông nội — chính là <code>bash</code> hoặc <code>script</code> đã ' +
      'chạy chương trình của bạn.</p>' +
      '<p>Dòng cuối in ra <b>hai lần</b> vì sau <code>fork</code> có hai tiến trình cùng chạy ' +
      'tiếp từ đúng chỗ đó. Đây là điểm người mới hay quên nhất: <b>mọi dòng lệnh sau ' +
      '<code>fork</code> đều thuộc về cả hai</b>, trừ khi bạn tách nhánh bằng <code>if</code>.</p>' },

    { t: 'cal', kind: 'danger', title: 'fflush trước fork — bỏ đi là chương trình in ra hai lần', x:
      '<p>Thử bỏ dòng <code>fflush(stdout)</code> rồi chạy <code>./buffer_trap &gt; ' +
      'buffer_trap.txt</code>. Bạn sẽ thấy dòng <i>in trước khi fork</i> xuất hiện <b>hai ' +
      'lần</b> trong file.</p>' +
      '<p>Nguyên nhân nằm gọn trong Bài 19: khi <code>stdout</code> trỏ vào file, nó chuyển sang ' +
      'chế độ <b>đệm toàn phần</b>. Dòng đó chưa được ghi thật, nó còn nằm trong đệm ' +
      '<code>stdio</code> — <b>mà đệm nằm trong bộ nhớ tiến trình</b>. <code>fork</code> nhân đôi ' +
      'bộ nhớ, nên nhân đôi luôn cả đệm chưa xả. Khi hai tiến trình cùng thoát, mỗi đứa xả đệm ' +
      'của mình một lần.</p>' +
      '<p>Ra terminal thì không thấy lỗi, vì lúc đó <code>stdout</code> đệm theo dòng và đã xả ' +
      'sạch tại ký tự xuống dòng. <b>Lỗi chỉ hiện ra khi chuyển hướng</b> — nghĩa là chỉ hiện ra ' +
      'khi chạy thật trên thiết bị, dưới systemd, log vào file. Quy tắc: <b>luôn ' +
      '<code>fflush</code> trước <code>fork</code></b>.</p>' },

    /* ══════════════════════════════════════════════
       3. COPY-ON-WRITE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Sau fork, cha và con không dùng chung một biến nào' },

    { t: 'p', x:
      'Đây là điểm phân biệt tiến trình với luồng (Bài 22). Con là một <b>bản sao</b>, không phải ' +
      'một cái nhìn chung vào cùng dữ liệu. Sửa biến ở con thì cha không thấy gì cả.' },

    { t: 'code', where: 'file', name: 'separate_memory.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'int global_var = 100;\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int local_var = 200;\n' +
      '\n' +
      '    if (fork() == 0) {\n' +
      '        global_var += 1;\n' +
      '        local_var  += 1;\n' +
      '        printf("  CHILD : global_var=%d local_var=%d  (address %p)\\n",\n' +
      '               global_var, local_var, (void *)&global_var);\n' +
      '        return 0;\n' +
      '    }\n' +
      '    wait(NULL);\n' +
      '    printf("  PARENT: global_var=%d local_var=%d  (address %p)\\n",\n' +
      '           global_var, local_var, (void *)&global_var);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  CHILD : global_var=101 local_var=201  (address 0x5e06c6e64010)\n' +
      '  PARENT: global_var=100 local_var=200  (address 0x5e06c6e64010)' },

    { t: 'cal', kind: 'why', title: 'Cùng một địa chỉ, hai giá trị khác nhau — vì đó là địa chỉ ảo', x:
      '<p>Đây là kết quả quan trọng nhất của cả bài. Hai tiến trình in ra <b>cùng một địa chỉ</b> ' +
      '<code>0x5e06c6e64010</code> nhưng đọc được <b>hai giá trị khác nhau</b>. Không có gì mâu ' +
      'thuẫn: đó là <b>địa chỉ ảo</b>, và mỗi tiến trình có bảng ánh xạ riêng từ địa chỉ ảo sang ' +
      'khung trang vật lý. Cùng số nhà, khác thành phố.</p>' +
      '<p><b>Copy-on-write.</b> Nhân không thật sự chép bộ nhớ lúc <code>fork</code> — chép 8 MB ' +
      'heap mỗi lần thì quá đắt. Nó chỉ đánh dấu mọi trang của cả hai bên là <i>chỉ đọc</i> và ' +
      'cho hai bảng trang cùng trỏ tới một khung vật lý. Khi một bên <b>ghi</b>, CPU sinh lỗi ' +
      'trang, nhân mới chép <i>riêng trang đó</i> rồi cho ghi tiếp. Trang không bị sửa thì dùng ' +
      'chung mãi mãi.</p>' +
      '<p>Hệ quả đo được ở phần thực hành: <code>fork</code> tốn khoảng <b>215–235 µs</b> trên máy ' +
      'bạn <i>bất kể</i> tiến trình đang dùng bao nhiêu RAM — bởi vì gần như không có byte nào ' +
      'thật sự được chép.</p>' },

    /* ══════════════════════════════════════════════
       4. EXEC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'exec() — thay ruột, giữ nguyên vỏ' },

    { t: 'p', x:
      '<code>exec</code> vứt bỏ toàn bộ không gian địa chỉ hiện tại và nạp một file ELF khác vào ' +
      'đúng tiến trình đó. Vì mã cũ đã bị xoá, <b>lệnh ngay sau <code>exec</code> không bao giờ ' +
      'chạy</b> — trừ khi <code>exec</code> thất bại. Đây là hàm duy nhất trong C mà "chạy tới ' +
      'dòng tiếp theo" đồng nghĩa với "có lỗi".' },

    { t: 'code', where: 'file', name: 'exec_demo.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <unistd.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("before exec: pid=%d\\n", getpid());\n' +
      '    fflush(stdout);\n' +
      '\n' +
      '    execl("/bin/sh", "sh", "-c", "echo \\"after  exec: pid=$$\\"", (char *)NULL);\n' +
      '\n' +
      '    perror("execl");                    /* only reached if exec FAILS */\n' +
      '    printf("this line never prints\\n");\n' +
      '    return 1;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'before exec: pid=13375\n' +
      'after  exec: pid=13375' },

    { t: 'cal', kind: 'info', title: 'Cùng một PID — bằng chứng exec không tạo tiến trình mới', x:
      '<p><b>13375</b> trước và <b>13375</b> sau. Chương trình đã bị thay hoàn toàn — mã, dữ liệu, ' +
      'ngăn xếp, tất cả — nhưng vỏ tiến trình thì nguyên vẹn: cùng PID, cùng PPID, cùng thư mục ' +
      'làm việc, cùng bảng file descriptor.</p>' +
      '<p>Chính vì bảng fd được giữ nguyên mà thủ thuật ở Bước 4 phần thực hành hoạt động: con ' +
      'đổi fd 1 <b>trước</b> khi <code>exec</code>, và chương trình mới thừa hưởng luôn phép ' +
      'chuyển hướng đó mà không hề biết. Đó chính xác là cách shell thực hiện ' +
      '<code>lệnh &gt; file</code>.</p>' +
      '<p>Cũng vì thế mà <code>exec</code> được dùng làm mẹo tối ưu: một init script kết thúc ' +
      'bằng <code>exec /usr/bin/ung_dung</code> sẽ không để lại tiến trình shell thừa nào — điều ' +
      'đáng giá khi RAM chỉ có 64 MB. Bạn sẽ dùng lại mẹo này ở Chặng 09.</p>' },

    { t: 'table',
      head: ['Hàm', 'Chữ cái cuối nghĩa là', 'Truyền tham số kiểu', 'Tìm theo <code>PATH</code>?'],
      rows: [
        ['<code>execl</code>', '<b>l</b>ist — danh sách', 'Từng tham số rời, kết thúc bằng <code>(char *)NULL</code>', 'Không — phải ghi đường dẫn đầy đủ'],
        ['<code>execlp</code>', 'l + <b>p</b>ath', 'Như trên', '<b>Có</b>'],
        ['<code>execle</code>', 'l + <b>e</b>nvironment', 'Như trên, thêm mảng <code>envp</code> ở cuối', 'Không'],
        ['<code>execv</code>', '<b>v</b>ector — mảng', 'Một mảng <code>char *argv[]</code>', 'Không'],
        ['<code>execvp</code>', 'v + <b>p</b>ath', 'Mảng', '<b>Có</b> — dùng nhiều nhất khi viết shell'],
        ['<code>execve</code>', 'v + e', 'Mảng + <code>envp</code>', 'Không — <b>đây là syscall thật</b>, năm hàm trên đều gọi xuống nó']
      ]},

    { t: 'cal', kind: 'warn', title: 'argv[0] phải do bạn tự truyền, và nó không nhất thiết là tên file', x:
      '<p>Trong <code>execl("/bin/sh", "sh", "-c", …)</code>, chuỗi <code>"sh"</code> thứ hai ' +
      'chính là <code>argv[0]</code> mà chương trình mới nhận được. Nó là một tham số bình ' +
      'thường, không phải tên file — nhân không tự điền hộ.</p>' +
      '<p>Quên nó là lỗi rất hay gặp: <code>execl("/bin/echo", "xin chao", NULL)</code> sẽ ' +
      '<b>không</b> in ra gì, vì <code>echo</code> tưởng <code>"xin chao"</code> là tên của chính ' +
      'nó và thấy danh sách tham số rỗng.</p>' +
      '<p>Danh sách <b>bắt buộc</b> kết thúc bằng <code>(char *)NULL</code> — ép kiểu là cần ' +
      'thiết vì <code>NULL</code> trần có thể được truyền dưới dạng <code>int</code> 4 byte trong ' +
      'hàm biến đối số, và trên máy 64 bit thì bốn byte đó không đủ để tạo thành con trỏ NULL.</p>' },

    { t: 'cal', kind: 'tip', title: 'Chữ p là một lời gọi tới PATH — và strace nhìn thấy nó', x:
      '<p><code>execvp("echo", …)</code> không gọi một lần <code>execve</code>. Nó thử lần lượt ' +
      'từng thư mục trong <code>PATH</code> cho tới khi có một lần thành công. Bạn sẽ thấy tận ' +
      'mắt trong <code>strace</code> ở phần thực hành: bốn lần <code>execve</code> thất bại với ' +
      '<code>ENOENT</code> trước khi <code>/usr/bin/echo</code> khớp.</p>' +
      '<p>Trên thiết bị nhúng, hãy dùng đường dẫn tuyệt đối với <code>execv</code> cho các tiến ' +
      'trình quan trọng: nhanh hơn, và quan trọng hơn là không thể bị đánh lừa bằng cách chèn ' +
      'một file cùng tên vào một thư mục đứng trước trong <code>PATH</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. WAIT VÀ MÃ THOÁT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'wait, waitpid và cách đọc mã thoát cho đúng' },

    { t: 'p', x:
      'Khi con kết thúc, nhân <b>không</b> xoá sạch nó ngay. Nhân giữ lại một mẩu thông tin — mã ' +
      'thoát, thời gian CPU đã dùng, có bị tín hiệu giết không — và chờ cha tới nhận. Hành động ' +
      'nhận đó gọi là <b>gặt</b> (<i>reap</i>), và nó là việc của <code>wait</code> hoặc ' +
      '<code>waitpid</code>.' },

    { t: 'table',
      head: ['Lời gọi', 'Chờ ai', 'Ghi chú'],
      rows: [
        ['<code>wait(&amp;status)</code>', 'Bất kỳ đứa con nào kết thúc trước', 'Chặn tới khi có một đứa xong'],
        ['<code>waitpid(pid, &amp;status, 0)</code>', 'Đúng đứa con có PID đó', 'Cách dùng thông thường'],
        ['<code>waitpid(-1, &amp;status, WNOHANG)</code>', 'Bất kỳ đứa nào, <b>không chờ</b>', 'Trả về 0 ngay nếu chưa đứa nào xong. Dùng trong vòng lặp sự kiện và trong bộ xử lý <code>SIGCHLD</code> — Bài 21'],
        ['<code>waitpid(pid, NULL, 0)</code>', 'Đúng đứa đó, không cần biết mã thoát', 'Chỉ để dọn xác']
      ]},

    { t: 'cal', kind: 'danger', title: 'Biến trạng thái KHÔNG phải là mã thoát — đừng in nó ra rồi tin', x:
      '<p>Giá trị mà <code>waitpid</code> điền vào <code>status</code> là một <b>số nguyên đã ' +
      'đóng gói</b>, chứa nhiều thông tin nhồi vào các bit khác nhau. Bạn <b>phải</b> giải mã nó ' +
      'bằng các macro. Đo được ở phần thực hành:</p>' +
      '<ul>' +
      '<li><code>echo hello</code> thoát 0 → <code>status = 0</code> (<code>0x0000</code>)</li>' +
      '<li><code>false</code> thoát 1 → <code>status = 256</code> (<code>0x0100</code>)</li>' +
      '<li>lệnh không tồn tại, con <code>_exit(127)</code> → <code>status = 32512</code> (<code>0x7f00</code>)</li>' +
      '<li><code>sleep 30</code> bị <code>kill -9</code> → <code>status = 9</code> (<code>0x0009</code>)</li>' +
      '</ul>' +
      '<p>Nhìn dạng thập lục phân là hiểu ngay quy ước: <b>byte cao chứa mã thoát, byte thấp ' +
      'chứa số hiệu tín hiệu đã giết tiến trình</b>. Nhưng đừng tự dịch bit — bố cục này khác ' +
      'nhau giữa các hệ, và đó chính là lý do POSIX cấp cho bạn bộ macro dưới đây.</p>' },

    { t: 'cmdx', cmd: 'if (WIFEXITED(status)) printf("exit code = %d\\n", WEXITSTATUS(status));',
      title: 'Bộ macro giải mã trạng thái — luôn hỏi WIF… trước, rồi mới lấy giá trị',
      rows: [
        ['<code>WIFEXITED(status)</code>', 'Đúng nếu con tự thoát bình thường', 'Qua <code>return</code> từ <code>main</code>, <code>exit()</code> hoặc <code>_exit()</code>'],
        ['<code>WEXITSTATUS(status)</code>', 'Mã thoát 0–255', '<b>Chỉ có nghĩa</b> khi <code>WIFEXITED</code> đúng'],
        ['<code>WIFSIGNALED(status)</code>', 'Đúng nếu con bị tín hiệu giết', 'Trường hợp <code>kill -9</code>, hoặc chương trình sập vì <code>SIGSEGV</code>'],
        ['<code>WTERMSIG(status)</code>', 'Số hiệu tín hiệu đã giết nó', '9 = <code>SIGKILL</code>, 11 = <code>SIGSEGV</code>, 15 = <code>SIGTERM</code>'],
        ['<code>WCOREDUMP(status)</code>', 'Đúng nếu có sinh file core', 'Cần <code>ulimit -c unlimited</code> mới bật'],
        ['<code>WIFSTOPPED(status)</code>', 'Đúng nếu con bị <b>tạm dừng</b>, chưa chết', 'Chỉ thấy khi truyền cờ <code>WUNTRACED</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao mã thoát chỉ được nằm trong 0–255 và vì sao 127 có nghĩa riêng', x:
      '<p>Chỉ một byte được dành cho mã thoát, nên <code>return 256</code> từ <code>main</code> ' +
      'sẽ tới tay cha dưới dạng <b>0</b> — trông y hệt thành công. Đây là lỗi đau đớn vì nó biến ' +
      'một thất bại thành một thành công giả.</p>' +
      '<p>Quy ước được cả hệ sinh thái Unix tôn trọng, bạn nên theo:</p>' +
      '<ul>' +
      '<li><b>0</b> — thành công. Mọi giá trị khác là thất bại.</li>' +
      '<li><b>1–125</b> — lỗi của chính chương trình, ý nghĩa do bạn định nghĩa.</li>' +
      '<li><b>126</b> — tìm thấy lệnh nhưng không chạy được (Bài 3 bạn đã gặp đúng mã này với ' +
      '<code>Exec format error</code>).</li>' +
      '<li><b>127</b> — không tìm thấy lệnh. Vì thế nhánh sau <code>execvp</code> thất bại nên ' +
      '<code>_exit(127)</code>.</li>' +
      '<li><b>128 + n</b> — shell quy ước rằng tiến trình bị tín hiệu <code>n</code> giết. Đó là ' +
      'lý do <code>$?</code> bằng <b>137</b> sau <code>kill -9</code> (128 + 9).</li>' +
      '</ul>' },

    { t: 'cal', kind: 'warn', title: 'Trong tiến trình con dùng _exit chứ không dùng exit', x:
      '<p>Sau khi <code>execvp</code> thất bại, mã đúng là <code>_exit(127)</code>, không phải ' +
      '<code>exit(127)</code> và tuyệt đối không phải <code>return</code>.</p>' +
      '<p><code>exit()</code> chạy các hàm đăng ký qua <code>atexit</code> và <b>xả đệm ' +
      '<code>stdio</code></b> — mà đệm đó là bản sao của đệm cha, nên nó sẽ ghi lại lần thứ hai ' +
      'những gì cha đã ghi. <code>_exit()</code> là lớp bọc mỏng quanh syscall, kết thúc ngay, ' +
      'không đụng gì tới đệm. Đây là cùng một lỗi với chuyện <code>fflush</code> trước ' +
      '<code>fork</code>, chỉ ở phía bên kia.</p>' },

    /* ══════════════════════════════════════════════
       6. ZOMBIE VÀ MỒ CÔI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Zombie và mồ côi — hai kết cục khi quan hệ cha con đứt gãy' },

    { t: 'p', x:
      'Hai từ này nghe như đùa nhưng là thuật ngữ chính thức trong tài liệu nhân, và cả hai đều ' +
      'là nguyên nhân thật khiến thiết bị nhúng chết sau vài tuần chạy liên tục.' },

    { t: 'fig',
      cap: 'Zombie là con chết mà cha còn sống và chưa gặt; mồ côi là cha chết trước còn con vẫn sống. Chỉ zombie mới là vấn đề — mồ côi luôn có người nhận nuôi.',
      svg:
        '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="So sánh tiến trình zombie và tiến trình mồ côi">' +
        '<rect class="d-box" x="16" y="16" width="336" height="228" rx="8"/>' +
        '<text class="d-t" x="34" y="42">ZOMBIE — trạng thái Z</text>' +
        '<rect class="d-box-p" x="40" y="56" width="130" height="40" rx="6"/>' +
        '<text class="d-t" x="70" y="80">CHA còn sống</text>' +
        '<text class="d-ts" x="46" y="112">không gọi wait()</text>' +
        '<line class="d-line" x1="105" y1="120" x2="105" y2="146"/>' +
        '<path class="d-arrow" d="M105 154 l-6 -10 h12 z"/>' +
        '<rect class="d-box-w" x="40" y="154" width="270" height="44" rx="6"/>' +
        '<text class="d-t" x="58" y="172">CON đã chết nhưng chưa được gặt</text>' +
        '<text class="d-ts" x="58" y="190">giữ lại: PID, mã thoát. Đã trả: RAM, fd</text>' +
        '<text class="d-ts" x="40" y="222">Nguy hiểm: cạn bảng PID nếu tích tụ</text>' +

        '<rect class="d-box" x="368" y="16" width="336" height="228" rx="8"/>' +
        '<text class="d-t" x="386" y="42">MỒ CÔI — vẫn chạy bình thường</text>' +
        '<rect class="d-box-w" x="392" y="56" width="130" height="40" rx="6"/>' +
        '<text class="d-t" x="418" y="80">CHA đã thoát</text>' +
        '<rect class="d-box-g" x="392" y="112" width="290" height="40" rx="6"/>' +
        '<text class="d-t" x="410" y="137">CON vẫn đang chạy</text>' +
        '<line class="d-line" x1="537" y1="152" x2="537" y2="178"/>' +
        '<path class="d-arrow" d="M537 186 l-6 -10 h12 z"/>' +
        '<rect class="d-box-a" x="392" y="186" width="290" height="40" rx="6"/>' +
        '<text class="d-t" x="410" y="204">nhân đổi PPID sang tiến trình nhận nuôi</text>' +
        '<text class="d-ts" x="410" y="220">systemd, hoặc subreaper gần nhất</text>' +
        '</svg>' },

    { t: 'p', x:
      '<b>Zombie</b> đã trả lại toàn bộ bộ nhớ và file descriptor. Thứ duy nhất nó còn chiếm là ' +
      '<b>một ô trong bảng PID</b> và mẩu thông tin trạng thái. Bạn sẽ kiểm chứng điều đó bằng ' +
      '<code>/proc</code>: mục <code>VmSize</code> biến mất hoàn toàn, và <code>cmdline</code> ' +
      'rỗng đúng <b>0</b> byte.' },

    { t: 'cal', kind: 'danger', title: 'Vì sao một zombie vô hại nhưng mười nghìn zombie giết thiết bị', x:
      '<p>Số PID tối đa mặc định là <code>4194304</code> trên hệ 64 bit, nhưng trên nhiều nhân ' +
      'nhúng nó chỉ là <b>32768</b>. Xem giá trị máy bạn bằng ' +
      '<code>cat /proc/sys/kernel/pid_max</code>.</p>' +
      '<p>Hình dung một daemon giám sát <code>fork</code> ra một tiến trình con mỗi 10 giây để ' +
      'kiểm tra cảm biến, nhưng lập trình viên quên <code>wait</code>. Mỗi 10 giây thêm một ' +
      'zombie. Sau <b>ba ngày rưỡi</b> là 30 000 zombie, bảng PID cạn, và từ đó ' +
      '<b><code>fork</code> trả về <code>-1</code> với <code>EAGAIN</code> cho toàn bộ hệ ' +
      'thống</b> — kể cả <code>ssh</code>, kể cả shell của bạn. Thiết bị vẫn "chạy" nhưng không ' +
      'khởi động nổi một tiến trình nào nữa.</p>' +
      '<p>Đây là một trong những lỗi kinh điển nhất của phần mềm nhúng, và nó chỉ lộ ra sau ' +
      'nhiều ngày chạy — nghĩa là không bao giờ lộ ra khi test trên bàn. Cách chữa ở Bài 21: ' +
      'bắt <code>SIGCHLD</code> và gặt bằng <code>waitpid(-1, NULL, WNOHANG)</code> trong vòng ' +
      'lặp.</p>' },

    { t: 'p', x:
      '<b>Mồ côi</b> thì ngược lại: con còn sống, cha chết trước. Nhân lập tức tìm cho nó một ' +
      'cha nuôi để sau này vẫn có người gặt. Trên máy bạn, cha nuôi <b>không phải PID 1</b>:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'parent pid=13442 exits immediately\n' +
      'child pid=13443  initial ppid=13442\n' +
      'child pid=13443  ppid after parent died=13328\n' +
      '-- who is the adoptive parent --\n' +
      '    PID    PPID COMMAND\n' +
      '  13328   13327 Relay(13330)\n' +
      '-- who is PID 1 --\n' +
      '    PID COMMAND\n' +
      '      1 systemd',
      notes: ['Ba con số PID trên máy bạn sẽ khác, và <b>khác cả giữa hai lần chạy</b> — điều ' +
        'phải giống là quan hệ: PPID đổi sau khi cha chết, và giá trị mới <b>không phải 1</b>.'] },

    { t: 'cal', kind: 'info', title: 'Cha nuôi là ai, và vì sao không phải PID 1', x:
      '<p>Sách vở cũ nói mồ côi luôn được <code>init</code> (PID 1) nhận nuôi. Trên Linux hiện ' +
      'đại điều đó chỉ còn đúng một nửa. Nhân đi ngược lên cây tiến trình tìm <b>subreaper gần ' +
      'nhất</b> — một tiến trình đã tự đăng ký nhận vai đó bằng ' +
      '<code>prctl(PR_SET_CHILD_SUBREAPER, 1)</code> — và chỉ khi không tìm được ai mới giao cho ' +
      'PID 1.</p>' +
      '<p>Ở lần chạy trên, kẻ nhận nuôi là <code>Relay(13330)</code>, một tiến trình nội bộ của ' +
      'WSL; ở một lần chạy khác nó hiện ra là <code>SessionLeader</code>. Cả hai đều là bộ khung ' +
      'quản lý phiên của WSL, và PID của chúng đổi theo mỗi phiên — nên hãy tra bằng ' +
      '<code>ps -o pid,ppid,comm -p &lt;ppid vừa in ra&gt;</code> chứ đừng chép cứng con số. ' +
      'Trong khi đó <code>ps -o pid,comm -p 1</code> vẫn luôn cho <code>systemd</code>.</p>' +
      '<p>Cơ chế này (<code>prctl(PR_SET_CHILD_SUBREAPER, 1)</code>) sinh ra để trình quản lý ' +
      'dịch vụ có thể theo dõi trọn vẹn cây tiến trình của một dịch vụ, kể cả khi dịch vụ đó ' +
      'daemon hoá bằng double-fork. Đó là lý do <code>systemd</code> quản lý được các daemon ' +
      'kiểu cũ mà không mất dấu chúng — kiến thức bạn sẽ cần ở <b>Chặng 09</b>.</p>' },

    /* ══════════════════════════════════════════════
       7. BIẾN MÔI TRƯỜNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Biến môi trường — bộ cấu hình đi theo tiến trình' },

    { t: 'p', x:
      'Mỗi tiến trình mang theo một mảng chuỗi dạng <code>TÊN=giá trị</code>, kết thúc bằng con ' +
      'trỏ NULL. Nó được <b>sao chép</b> sang con khi <code>fork</code>, và được truyền tiếp qua ' +
      '<code>exec</code>. Đây là kênh cấu hình đơn giản nhất giữa các tiến trình — và là cách ' +
      'chuẩn để cấu hình một dịch vụ dưới systemd.' },

    { t: 'table',
      head: ['Hàm', 'Việc', 'Bẫy'],
      rows: [
        ['<code>getenv("PATH")</code>', 'Đọc giá trị, trả <code>NULL</code> nếu chưa đặt', '<b>Luôn kiểm tra NULL</b> — quên là <code>SIGSEGV</code> ngay khi biến chưa được đặt'],
        ['<code>setenv("TEN", "gt", 1)</code>', 'Đặt; tham số cuối là "ghi đè nếu đã có"', 'Chỉ ảnh hưởng tiến trình này và <b>con sinh ra sau đó</b>'],
        ['<code>unsetenv("TEN")</code>', 'Xoá hẳn', ''],
        ['<code>extern char **environ;</code>', 'Truy cập cả mảng để duyệt', 'Con trỏ có thể đổi sau <code>setenv</code> — đừng lưu lại']
      ]},

    { t: 'code', where: 'file', name: 'environment.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <stdlib.h>\n' +
      '#include <string.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/wait.h>\n' +
      '\n' +
      'extern char **environ;                  /* environment array, terminated by NULL */\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("HOME      = %s\\n", getenv("HOME"));\n' +
      '    printf("SHELL     = %s\\n", getenv("SHELL"));\n' +
      '    printf("PATH len  = %zu chars\\n", strlen(getenv("PATH")));\n' +
      '    printf("UNSET_VAR = %s\\n", getenv("UNSET_VAR") ? getenv("UNSET_VAR") : "(NULL)");\n' +
      '\n' +
      '    int n = 0;\n' +
      '    while (environ[n]) n++;             /* count until NULL pointer */\n' +
      '    printf("total vars = %d, first var = %s\\n", n, environ[0]);\n' +
      '\n' +
      '    setenv("DEVICE", "temp-sensor", 1);\n' +
      '    printf("after setenv: DEVICE = %s\\n", getenv("DEVICE"));\n' +
      '\n' +
      '    if (fork() == 0) {                  /* child inherits a copy of the environment */\n' +
      '        execlp("sh", "sh", "-c", "echo \\"  [child] DEVICE=$DEVICE\\"", (char *)NULL);\n' +
      '        _exit(127);\n' +
      '    }\n' +
      '    wait(NULL);\n' +
      '    printf("[parent] child exited; parent\'s environment unchanged\\n");\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'HOME      = /home/shinarus\n' +
      'SHELL     = /bin/bash\n' +
      'PATH len  = 1396 chars\n' +
      'UNSET_VAR = (NULL)\n' +
      'total vars = 24, first var = DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus\n' +
      'after setenv: DEVICE = temp-sensor\n' +
      '  [child] DEVICE=temp-sensor\n' +
      '[parent] child exited; parent\'s environment unchanged' },

    { t: 'cal', kind: 'why', title: 'Môi trường chảy một chiều: từ cha xuống con, không bao giờ ngược lại', x:
      '<p>Con thấy được <code>DEVICE</code> vì cha đặt nó <b>trước</b> khi <code>fork</code>. ' +
      'Nhưng nếu con gọi <code>setenv</code> thì cha vĩnh viễn không biết — vì đó là bản sao ' +
      'riêng, hệt như biến <code>global_var</code> ở phần trước.</p>' +
      '<p>Đây chính là lý do <code>cd</code> phải là <i>lệnh dựng sẵn</i> của shell chứ không ' +
      'thể là một chương trình rời. Nếu <code>/bin/cd</code> tồn tại, shell sẽ <code>fork</code> ' +
      'ra nó, nó đổi thư mục của <b>chính nó</b> rồi chết — shell cha vẫn đứng nguyên chỗ cũ. ' +
      'Bạn đã gặp <code>cd</code> như một lệnh dựng sẵn từ Bài 4; giờ mới có lời giải thích đầy ' +
      'đủ vì sao nó buộc phải như vậy.</p>' +
      '<p>Trên thiết bị nhúng, đây là mô hình cấu hình được dùng nhiều nhất: file service của ' +
      'systemd khai <code>Environment="LOG_PATH=/var/log/x"</code>, tiến trình đọc bằng ' +
      '<code>getenv</code>. Khi daemon chạy sai, việc đầu tiên nên làm là ' +
      '<code>tr \'\\0\' \'\\n\' &lt; /proc/&lt;pid&gt;/environ</code> để xem nó <i>thật sự</i> nhận ' +
      'được những biến gì.</p>' },

    /* ══════════════════════════════════════════════
       8. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: viết một shell tí hon rồi biến nó thành daemon' },

    { t: 'p', x:
      'Năm bước dưới đây dựng dần từ <code>fork</code> trần tới một daemon hoàn chỉnh. Làm tuần ' +
      'tự, đừng nhảy cóc — mỗi bước dùng lại thứ bước trước vừa chứng minh. Toàn bộ chạy trong ' +
      'WSL, không cần phần cứng.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/embedded/bai20 && cd ~/embedded/bai20' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Nhìn tận mắt "một lời gọi, hai giá trị trả về"',
        blocks: [
          { t: 'p', x:
            'Bạn đã đọc mã <code>fork_twice.c</code> ở phần lý thuyết. Giờ gõ lại nó và chạy, vì ' +
            'ba con số PID chỉ thuyết phục khi chính máy bạn in ra.' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o fork_twice fork_twice.c && ./fork_twice' },

          { t: 'code', where: 'out', nocopy: true, code:
            'before fork: pid=13383\n' +
            '  CHILD : fork returned 0, pid=13384, ppid=13383\n' +
            '  both run this line (pid=13384)\n' +
            '  PARENT: fork returned 13384, pid=13383, ppid=13330\n' +
            '  both run this line (pid=13383)',
            notes: ['Chạy lại vài lần. Thứ tự hai dòng PARENT/CHILD có thể đảo — đó là bộ lập ' +
              'lịch, không phải lỗi của bạn.'] },

          { t: 'cal', kind: 'tip', title: 'Đối chiếu ba con số của chính bạn, đừng chỉ tin lời giải thích ở trên', x:
            '<p>Trên máy bạn ba con số là <b>13383</b>/<b>13384</b>/<b>13330</b> thay vì ' +
            '<b>13341</b>/<b>13342</b>/<b>13330</b> ở phần lý thuyết, nhưng quan hệ giữa chúng ' +
            'giữ nguyên: ở nhánh cha, <code>fork</code> trả về <b>13384</b> — đúng bằng PID vừa ' +
            'in ra ở nhánh con; ở nhánh con, <code>getppid()</code> trả về <b>13383</b> — đúng ' +
            'bằng PID của cha. Dòng <code>both run this line</code> in ra đúng <b>hai lần</b>, ' +
            'mỗi lần với một PID khác nhau. Đó là lý do bài yêu cầu bạn tự chạy lại thay vì đọc ' +
            'transcript ở trên — ba con số của bạn khác, quan hệ giữa chúng thì không.</p>' },

          { t: 'p', x:
            'Bây giờ dựng lại cái bẫy đệm, để bạn thấy nó bằng mắt chứ không chỉ tin lời cảnh ' +
            'báo. Chép <code>fork_twice.c</code> thành <code>buffer_trap.c</code> rồi <b>xoá ' +
            'dòng <code>fflush(stdout);</code></b>:' },

          { t: 'code', where: 'wsl', code:
            'sed \'/fflush(stdout)/d\' fork_twice.c > buffer_trap.c\n' +
            'gcc -Wall -Wextra -o buffer_trap buffer_trap.c\n' +
            './buffer_trap | cat     # piped to terminal: fine\n' +
            'echo "----- now redirect into a file -----"\n' +
            './buffer_trap > buffer_trap.txt\n' +
            'grep -c "before fork" buffer_trap.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '----- now redirect into a file -----\n' +
            '2' },

          { t: 'cal', kind: 'why', title: 'Con số 2 chính là lỗi', x:
            '<p><code>grep -c</code> đếm được <b>hai</b> dòng <code>before fork</code>, dù trong ' +
            'mã chỉ có <b>một</b> lệnh <code>printf</code>. Dòng đó vẫn còn nằm trong đệm ' +
            '<code>stdio</code> lúc <code>fork</code> chạy, nên nó bị nhân đôi cùng bộ nhớ, và ' +
            'mỗi tiến trình xả một bản khi thoát.</p>' +
            '<p>Hãy để ý: <b>lỗi này ẩn hoàn toàn khi bạn test trên terminal</b> và chỉ lộ ra ' +
            'khi chuyển hướng vào file — tức là đúng lúc chương trình chạy thật dưới systemd trên ' +
            'thiết bị. Đây là lý do <code>fflush</code> trước <code>fork</code> không phải chuyện ' +
            'sạch sẽ mà là chuyện đúng sai.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Viết shell tí hon và giải mã đủ bốn kiểu kết thúc',
        blocks: [
          { t: 'p', x:
            'Đây là bước quan trọng nhất của bài. Chương trình dưới đây gói trọn bộ ba ' +
            '<code>fork</code> → <code>exec</code> → <code>wait</code> trong 30 dòng. Về bản ' +
            'chất, <code>bash</code> làm đúng như vậy mỗi lần bạn gõ một lệnh.' },

          { t: 'code', where: 'file', name: 'runcmd.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <string.h>              /* strsignal */\n' +
            '#include <unistd.h>\n' +
            '#include <sys/wait.h>\n' +
            '\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '    if (argc < 2) {\n' +
            '        fprintf(stderr, "Usage: %s <command> [args...]\\n", argv[0]);\n' +
            '        return 1;\n' +
            '    }\n' +
            '\n' +
            '    pid_t child = fork();\n' +
            '    if (child < 0) { perror("fork"); return 1; }\n' +
            '\n' +
            '    if (child == 0) {                     /* child process */\n' +
            '        execvp(argv[1], &argv[1]);\n' +
            '        perror("execvp");                 /* only reached if exec fails */\n' +
            '        _exit(127);\n' +
            '    }\n' +
            '\n' +
            '    int status;                           /* parent process */\n' +
            '    if (waitpid(child, &status, 0) < 0) { perror("waitpid"); return 1; }\n' +
            '\n' +
            '    printf("[parent] child pid=%d exited, raw status = %d (0x%04x)\\n", child, status, status);\n' +
            '    if (WIFEXITED(status))\n' +
            '        printf("[parent] exited normally, exit code = %d\\n", WEXITSTATUS(status));\n' +
            '    else if (WIFSIGNALED(status))\n' +
            '        printf("[parent] killed by signal %d (%s)\\n",\n' +
            '               WTERMSIG(status), strsignal(WTERMSIG(status)));\n' +
            '    return 0;\n' +
            '}' },

          { t: 'cmdx', cmd: 'execvp(argv[1], &argv[1]);',
            title: 'Vì sao lại là &argv[1] chứ không phải argv',
            rows: [
              ['<code>argv[0]</code>', 'là <code>./runcmd</code> — tên của chính chương trình bao ngoài', 'Không được truyền xuống'],
              ['<code>argv[1]</code>', 'là tên lệnh cần chạy, ví dụ <code>echo</code>', 'Vừa là đường dẫn tìm kiếm, vừa là <code>argv[0]</code> của chương trình mới'],
              ['<code>&amp;argv[1]</code>', 'địa chỉ của phần tử thứ 1 = một mảng con bắt đầu từ đó', 'Mảng <code>argv</code> luôn kết thúc bằng <code>NULL</code>, nên mảng con cũng vậy — đúng thứ <code>execvp</code> cần'],
              ['<code>_exit(127)</code>', 'Con báo "không tìm thấy lệnh" theo đúng quy ước shell', 'Dùng <code>_exit</code> để không xả lại đệm thừa hưởng từ cha']
            ]},

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o runcmd runcmd.c\n' +
            './runcmd echo hello\n' +
            './runcmd false\n' +
            './runcmd nonexistent_command_xyz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello\n' +
            '[parent] child pid=13400 exited, raw status = 0 (0x0000)\n' +
            '[parent] exited normally, exit code = 0\n' +
            '[parent] child pid=13402 exited, raw status = 256 (0x0100)\n' +
            '[parent] exited normally, exit code = 1\n' +
            'execvp: No such file or directory\n' +
            '[parent] child pid=13404 exited, raw status = 32512 (0x7f00)\n' +
            '[parent] exited normally, exit code = 127' },

          { t: 'p', x:
            'Kiểu kết thúc thứ tư cần hai cửa sổ. Ở cửa sổ thứ nhất chạy một lệnh ngủ lâu, ở cửa ' +
            'sổ thứ hai giết nó bằng <code>SIGKILL</code>:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1', code:
            './runcmd sleep 30' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2', code:
            'pkill -9 -x sleep' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[parent] child pid=13409 exited, raw status = 9 (0x0009)\n' +
            '[parent] killed by signal 9 (Killed)' },

          { t: 'cal', kind: 'info', title: 'Bốn con số, một quy luật', x:
            '<p>Xếp cạnh nhau là thấy ngay bố cục bit:</p>' +
            '<ul>' +
            '<li><code>0x0000</code> — thoát 0. Byte cao = 0, byte thấp = 0.</li>' +
            '<li><code>0x0100</code> — thoát 1. Byte cao = <code>0x01</code>.</li>' +
            '<li><code>0x7f00</code> — thoát 127. Byte cao = <code>0x7f</code> = 127.</li>' +
            '<li><code>0x0009</code> — bị tín hiệu 9 giết. Byte cao = 0, byte thấp = 9.</li>' +
            '</ul>' +
            '<p>Nếu bạn từng "tối ưu" bằng cách viết <code>exit_code = status &gt;&gt; 8</code> ' +
            'thì ba trường hợp đầu vẫn đúng và trường hợp thứ tư cho <b>0</b> — chương trình bị ' +
            'giết thẳng tay mà báo cáo là thành công. Đó là lý do phải hỏi <code>WIFEXITED</code> ' +
            'trước tiên, luôn luôn.</p>' },

          { t: 'p', x:
            'Cuối cùng, hãy xem nhân thật sự làm gì. <code>strace -f</code> theo dõi cả tiến ' +
            'trình con sinh ra sau <code>fork</code>:' },

          { t: 'code', where: 'wsl', code:
            'strace -f -e trace=clone,execve,wait4 -o trace.txt ./runcmd echo hi\n' +
            'cat trace.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '13414 execve("./runcmd", ["./runcmd", "echo", "hi"], 0x7ffe2c12ea88 /* 22 vars */) = 0\n' +
            '13414 clone(child_stack=NULL, flags=CLONE_CHILD_CLEARTID|CLONE_CHILD_SETTID|SIGCHLD, child_tidptr=0x717659195a10) = 13415\n' +
            '13414 wait4(13415 <unfinished ...>\n' +
            '13415 execve("/usr/local/sbin/echo", ["echo", "hi"], 0x7ffc39a75f68 /* 22 vars */) = -1 ENOENT (No such file or directory)\n' +
            '13415 execve("/usr/local/bin/echo", ["echo", "hi"], 0x7ffc39a75f68 /* 22 vars */) = -1 ENOENT (No such file or directory)\n' +
            '13415 execve("/usr/sbin/echo", ["echo", "hi"], 0x7ffc39a75f68 /* 22 vars */) = -1 ENOENT (No such file or directory)\n' +
            '13415 execve("/usr/bin/echo", ["echo", "hi"], 0x7ffc39a75f68 /* 22 vars */) = 0\n' +
            '13415 +++ exited with 0 +++\n' +
            '13414 <... wait4 resumed>, [{WIFEXITED(s) && WEXITSTATUS(s) == 0}], 0, NULL) = 13415\n' +
            '13414 --- SIGCHLD {si_signo=SIGCHLD, si_code=CLD_EXITED, si_pid=13415, si_uid=1000, si_status=0, si_utime=0, si_stime=1 /* 0.01 s */} ---\n' +
            '13414 +++ exited with 0 +++',
            notes: [
              'Cột đầu là PID, xuất hiện vì có <code>-f</code>. Không có <code>-f</code> thì strace bỏ qua toàn bộ đời sống của con.',
              'Vẫn phải dùng <code>-o</code> như Bài 19: nếu để vết ra màn hình, nó sẽ trộn lẫn với chữ <code>hi</code> mà chương trình in ra.'
            ]},

          { t: 'cmdx', cmd: 'strace -f -e trace=clone,execve,wait4 -o trace.txt ./runcmd echo hi',
            title: 'Ba cờ quyết định bạn nhìn thấy gì trong trace.txt',
            rows: [
              ['<code>-f</code>', 'Theo dõi luôn các tiến trình con sinh ra bằng <code>fork</code>/<code>vfork</code>/<code>clone</code>', 'Thiếu cờ này, dòng <code>13415 execve(...)</code> của con sẽ không xuất hiện — strace mặc định chỉ nhìn tiến trình gốc'],
              ['<code>-e trace=clone,execve,wait4</code>', 'Chỉ ghi vết đúng ba syscall này, bỏ qua hàng trăm syscall khác (đọc bộ nhớ, mmap, ioctl…)', 'Không có bộ lọc, <code>trace.txt</code> sẽ dài hàng trăm dòng nhiễu không liên quan tới fork/exec/wait'],
              ['<code>-o trace.txt</code>', 'Ghi vết ra file thay vì in thẳng ra <code>stderr</code>', 'Bắt buộc ở đây vì chương trình đích tự in ra <code>stdout</code> — không tách riêng sẽ lẫn lộn hai luồng']
            ]},

          { t: 'cal', kind: 'why', title: 'Bốn điều bản ghi này chứng minh', x:
            '<ol>' +
            '<li><b>Không có syscall nào tên <code>fork</code>.</b> Nhân chỉ có ' +
            '<code>clone</code>; <code>fork()</code> của thư viện C gọi xuống nó với bộ cờ tối ' +
            'thiểu. Cùng syscall đó, với nhiều cờ <code>CLONE_*</code> hơn, sẽ tạo ra <b>luồng</b> ' +
            '— Bài 22.</li>' +
            '<li><b><code>clone</code> trả về 13415 trong dòng của tiến trình 13414.</b> Bạn đang ' +
            'nhìn đúng nhánh cha. Nhánh con không có dòng trả về nào vì với nó lời gọi ' +
            '"bắt đầu" từ giá trị 0.</li>' +
            '<li><b>Chữ <code>p</code> trong <code>execvp</code> tốn bốn syscall thất bại.</b> ' +
            'Bốn <code>ENOENT</code> chính là bốn thư mục đầu trong <code>PATH</code> bị thử lần ' +
            'lượt. Dùng đường dẫn tuyệt đối là tiết kiệm đúng bốn lần chuyển vùng nhân.</li>' +
            '<li><b><code>wait4</code> bị cắt làm hai</b> (<code>unfinished</code> … ' +
            '<code>resumed</code>) vì cha ngủ trong đó suốt thời gian con chạy. Ngay trước khi ' +
            'nó tỉnh, có một dòng <code>SIGCHLD</code> — nhân báo cho cha rằng con đã chết. Bài ' +
            '21 sẽ biến chính tín hiệu này thành công cụ chính để dọn zombie.</li>' +
            '</ol>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Tạo một zombie, mổ nó ra xem, rồi tạo một đứa mồ côi',
        blocks: [
          { t: 'p', x:
            'Muốn hiểu zombie thì phải nuôi một con. Chương trình dưới đây <b>cố tình</b> quên ' +
            '<code>wait</code>, đúng như lỗi thật ngoài đời.' },

          { t: 'code', where: 'file', name: 'zombie.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pid_t child = fork();\n' +
            '    if (child == 0) {\n' +
            '        printf("child pid=%d exits immediately\\n", getpid());\n' +
            '        return 0;                      /* child dies, parent never reaps it */\n' +
            '    }\n' +
            '    printf("parent pid=%d does NOT call wait, sleeping 10s\\n", getpid());\n' +
            '    printf("run:  ps -o pid,ppid,stat,comm -p %d\\n", child);\n' +
            '    fflush(stdout);\n' +
            '    sleep(10);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o zombie zombie.c\n' +
            './zombie &\n' +
            'sleep 1\n' +
            'ps -o pid,ppid,stat,comm --ppid $!' },

          { t: 'code', where: 'out', nocopy: true, code:
            'parent pid=13424 does NOT call wait, sleeping 10s\n' +
            'run:  ps -o pid,ppid,stat,comm -p 13425\n' +
            'child pid=13425 exits immediately\n' +
            '    PID    PPID STAT COMMAND\n' +
            '  13425   13424 Z+   zombie' },

          { t: 'cmdx', cmd: 'ps -o pid,ppid,stat,comm --ppid $!',
            title: 'Đọc dòng ps này',
            rows: [
              ['<code>-o pid,ppid,stat,comm</code>', 'Chọn đúng bốn cột cần xem', 'Không có <code>-o</code>, <code>ps</code> in bộ cột mặc định thiếu <code>stat</code>'],
              ['<code>--ppid $!</code>', 'Chỉ liệt kê con của tiến trình vừa chạy nền', '<code>$!</code> là PID của lệnh <code>&amp;</code> gần nhất — biến dựng sẵn của bash'],
              ['<code>Z</code>', 'Trạng thái zombie — đã chết, chưa được gặt', 'Các trạng thái khác: <code>R</code> chạy, <code>S</code> ngủ, <code>D</code> ngủ không ngắt được, <code>T</code> bị dừng'],
              ['<code>+</code>', 'Thuộc nhóm tiến trình tiền cảnh', 'Không liên quan tới zombie, chỉ là thông tin nhóm']
            ]},

          { t: 'p', x:
            'Giờ mổ con zombie qua <code>/proc</code>, đúng kỹ thuật bạn đã dùng ở Bài 19. Thay ' +
            '<code>13425</code> bằng số của máy bạn:' },

          { t: 'code', where: 'wsl', code:
            'grep -E \'^(Name|State|Tgid|Pid|PPid|VmSize)\' /proc/13425/status\n' +
            'wc -c < /proc/13425/cmdline' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Name:\tzombie\n' +
            'State:\tZ (zombie)\n' +
            'Tgid:\t13425\n' +
            'Pid:\t13425\n' +
            'PPid:\t13424\n' +
            '0' },

          { t: 'cal', kind: 'info', title: 'Hai bằng chứng zombie không còn giữ tài nguyên nào', x:
            '<p><b>Không có dòng <code>VmSize</code>.</b> Bạn lọc nó trong <code>grep</code> mà ' +
            'nó không hiện ra — vì tiến trình đã trả lại toàn bộ không gian địa chỉ. Không còn ' +
            'byte RAM nào của nó cả.</p>' +
            '<p><b><code>cmdline</code> dài đúng 0 byte.</b> Chuỗi dòng lệnh nằm trong ngăn xếp ' +
            'của tiến trình, mà ngăn xếp đã bị giải phóng. Cái tên <code>zombie</code> ở ' +
            '<code>Name</code> còn đọc được vì nó nằm trong cấu trúc <code>task_struct</code> của ' +
            'nhân, chứ không nằm trong bộ nhớ tiến trình.</p>' +
            '<p>Thứ duy nhất zombie còn chiếm là <b>một ô PID</b>. Vô hại với một con, chết máy ' +
            'với ba vạn con.</p>' },

          { t: 'code', where: 'wsl', code:
            'kill -9 %1\n' +
            'sleep 1\n' +
            'ps -o pid,stat,comm -p 13425' },

          { t: 'code', where: 'out', nocopy: true, code:
            '    PID STAT COMMAND' },

          { t: 'cal', kind: 'why', title: 'Giết cha là zombie biến mất — và đó là cách chữa cháy tạm thời', x:
            '<p>Bảng chỉ còn dòng tiêu đề: zombie đã sạch. Khi cha chết, đứa con zombie được ' +
            'giao cho subreaper, mà subreaper <b>gặt ngay lập tức</b>. Đó là toàn bộ nhiệm vụ ' +
            'của nó.</p>' +
            '<p>Vì thế bạn <b>không thể</b> giết một zombie bằng <code>kill -9</code> — nó đã ' +
            'chết rồi, không còn gì để giết. Muốn dọn thì phải tác động vào <b>cha</b>: hoặc sửa ' +
            'cha cho gọi <code>wait</code>, hoặc khởi động lại cha. Đây là câu hỏi phỏng vấn kinh ' +
            'điển, và cũng là tình huống thật khi một dịch vụ trên thiết bị bắt đầu rò rỉ PID.</p>' },

          { t: 'p', x:
            'Đứa mồ côi thì ngược lại. Cho cha thoát trước, rồi hỏi con xem cha mới của nó là ai:' },

          { t: 'code', where: 'file', name: 'orphan.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    if (fork() == 0) {\n' +
            '        printf("child pid=%d  initial ppid=%d\\n", getpid(), getppid());\n' +
            '        fflush(stdout);\n' +
            '        sleep(2);                       /* long enough for the parent to die first */\n' +
            '        printf("child pid=%d  ppid after parent died=%d\\n", getpid(), getppid());\n' +
            '        return 0;\n' +
            '    }\n' +
            '    printf("parent pid=%d exits immediately\\n", getpid());\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o orphan orphan.c\n' +
            './orphan\n' +
            'sleep 3' },

          { t: 'code', where: 'out', nocopy: true, code:
            'parent pid=13442 exits immediately\n' +
            'child pid=13443  initial ppid=13442\n' +
            'child pid=13443  ppid after parent died=13328' },

          { t: 'code', where: 'wsl', code:
            'ps -o pid,ppid,comm -p 13328\n' +
            'ps -o pid,comm -p 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '    PID    PPID COMMAND\n' +
            '  13328   13327 Relay(13330)\n' +
            '    PID COMMAND\n' +
            '      1 systemd',
            notes: ['Thay <code>13328</code> bằng con số máy bạn vừa in ra. Tên tiến trình có ' +
              'thể là <code>Relay(...)</code> hoặc <code>SessionLeader</code> tuỳ phiên WSL — ' +
              'điểm chung là nó <b>không phải PID 1</b>.'] },

          { t: 'cal', kind: 'info', title: 'Đọc đúng thứ tự đổi PPID trong ba dòng đầu tiên', x:
            '<p>Dòng đầu <code>initial ppid=13442</code> khớp đúng cha ruột vừa <code>fork</code> ' +
            'ra nó. Dòng thứ hai, chụp lại <b>sau khi cha đã thoát</b>, cho ' +
            '<code>ppid after parent died=13328</code> — một số hoàn toàn khác 13442, và quan ' +
            'trọng hơn: <b>không phải 1</b>. Truy tiếp bằng <code>ps</code> ở trên cho thấy 13328 ' +
            'chính là <code>Relay(13330)</code> — đúng khái niệm subreaper đã nêu ở phần lý ' +
            'thuyết: nhân đi tìm subreaper gần nhất trong cây tiến trình của phiên WSL, chứ ' +
            'không giao thẳng mồ côi cho PID 1.</p>' },

          { t: 'cal', kind: 'tip', title: 'Mồ côi không phải lỗi', x:
            '<p>Khác zombie, mồ côi hoàn toàn bình thường và còn là <b>kỹ thuật cố ý</b> — bạn ' +
            'sẽ dùng đúng nó ở Bước 5 để daemon hoá. Chương trình mồ côi vẫn chạy, vẫn ghi log, ' +
            'vẫn có người gặt khi nó chết. Không mất gì cả.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Tự tay dựng lại phép chuyển hướng > của shell, và đo giá của fork',
        blocks: [
          { t: 'p', x:
            'Khi bạn gõ <code>ls -l /etc/hostname &gt; result.txt</code>, shell không hề đưa tên ' +
            'file cho <code>ls</code>. Nó làm ba việc <b>giữa</b> <code>fork</code> và ' +
            '<code>exec</code>. Đây là ba việc đó, viết bằng tay.' },

          { t: 'code', where: 'file', name: 'redirect.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <unistd.h>\n' +
            '#include <sys/wait.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    pid_t child = fork();\n' +
            '    if (child == 0) {\n' +
            '        int fd = open("result.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
            '        if (fd < 0) { perror("open"); _exit(1); }\n' +
            '\n' +
            '        dup2(fd, STDOUT_FILENO);        /* fd 1 now points to result.txt */\n' +
            '        close(fd);                      /* the original copy is no longer needed */\n' +
            '\n' +
            '        execlp("ls", "ls", "-l", "/etc/hostname", (char *)NULL);\n' +
            '        perror("execlp");\n' +
            '        _exit(127);\n' +
            '    }\n' +
            '    wait(NULL);\n' +
            '    printf("[parent] contents of result.txt:\\n");\n' +
            '    fflush(stdout);\n' +
            '    execlp("cat", "cat", "result.txt", (char *)NULL);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'cmdx', cmd: 'dup2(fd, STDOUT_FILENO);',
            title: 'Ba dòng làm nên toàn bộ phép chuyển hướng',
            rows: [
              ['<code>open(...)</code>', 'Mở file, nhận về số nhỏ nhất còn trống — thường là <b>3</b>', 'Bài 19: 0, 1, 2 đã bị chiếm'],
              ['<code>dup2(fd, 1)</code>', 'Đóng fd 1 rồi làm cho fd 1 trỏ tới <b>cùng open file description</b> với fd 3', 'Khác <code>dup</code> ở chỗ bạn <b>chọn</b> được số đích. Nếu đích đang mở, nó tự đóng trước'],
              ['<code>close(fd)</code>', 'Bỏ bản sao ở số 3 cho gọn', 'File vẫn mở vì fd 1 còn trỏ tới nó — bộ đếm tham chiếu chưa về 0'],
              ['<code>execlp("ls", ...)</code>', 'Nạp <code>ls</code>. Nó in ra fd 1 như mọi khi', '<code>ls</code> hoàn toàn không biết mình đang ghi vào file']
            ]},

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o redirect redirect.c && ./redirect' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[parent] contents of result.txt:\n' +
            '-rw-r--r-- 1 root root 9 Aug  4 22:42 /etc/hostname',
            notes: ['Ngày giờ và kích thước trên máy bạn sẽ khác.'] },

          { t: 'cal', kind: 'why', title: 'Vì sao thứ tự bắt buộc phải là fork → dup2 → exec', x:
            '<p><b>Sau <code>fork</code></b> vì nếu <code>dup2</code> trước, chính tiến trình cha ' +
            'sẽ mất <code>stdout</code> — shell của bạn sẽ câm luôn từ đó.</p>' +
            '<p><b>Trước <code>exec</code></b> vì bảng file descriptor <b>sống sót qua ' +
            '<code>exec</code></b> (đó là điều bạn đã kiểm chứng ở mục "cùng một PID"). Chương ' +
            'trình mới thừa hưởng một fd 1 đã bị đánh tráo và cứ thế ghi vào file.</p>' +
            '<p>Đây chính là đáp án cho một câu hỏi có thể bạn đã thắc mắc từ Bài 10: vì sao ' +
            '<code>lệnh &gt; file</code> hoạt động với <b>mọi</b> chương trình, kể cả chương ' +
            'trình bạn tự viết hôm nay và chương trình viết từ 1985? Vì không chương trình nào ' +
            'phải hợp tác cả — phép chuyển hướng xảy ra hoàn toàn bên ngoài nó.</p>' +
            '<p>Bổ sung: dòng cuối cùng của <code>main</code> dùng <code>execlp("cat", …)</code> ' +
            'thay vì <code>system()</code>. Tiến trình cha tự biến mình thành <code>cat</code> — ' +
            'không tốn thêm một <code>fork</code> nào. Đúng mẹo tiết kiệm đã nói ở phần lý ' +
            'thuyết.</p>' +
            '<p>Bằng chứng nằm ngay trong <code>out</code> ở trên: dòng <code>-rw-r--r-- ...</code> ' +
            'chỉ xuất hiện <b>sau</b> dòng "contents of result.txt", do chính <code>cat</code> ' +
            'đọc lại từ file mà in ra. Nếu <code>dup2</code> làm sai thứ tự hoặc thất bại thì ' +
            '<code>ls</code> đã in thẳng ra terminal ngay khi con chạy — tức là <b>trước</b> dòng ' +
            'dẫn của cha, và bạn sẽ thấy dòng đó xuất hiện <b>hai lần</b> (một lần từ chính ' +
            '<code>ls</code>, một lần từ <code>cat</code> đọc lại file). Chỉ thấy đúng một dòng, ' +
            'đúng vị trí, là bằng chứng toàn bộ output của <code>ls</code> đã đi thẳng vào ' +
            '<code>result.txt</code>, chưa từng chạm terminal.</p>' },

          { t: 'p', x:
            'Việc cuối của bước này: <b>đo</b> giá của <code>fork</code> và <code>exec</code>, ' +
            'thay vì đoán. Con số này quyết định kiến trúc phần mềm của bạn trên thiết bị yếu.' },

          { t: 'code', where: 'file', name: 'fork_cost.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <time.h>\n' +
            '#include <unistd.h>\n' +
            '#include <sys/wait.h>\n' +
            '\n' +
            '#define N 500\n' +
            '\n' +
            'static double run_trial(int with_exec)\n' +
            '{\n' +
            '    struct timespec t1, t2;\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
            '    for (int i = 0; i < N; i++) {\n' +
            '        pid_t p = fork();\n' +
            '        if (p == 0) {\n' +
            '            if (with_exec) { execl("/bin/true", "true", (char *)NULL); _exit(127); }\n' +
            '            _exit(0);\n' +
            '        }\n' +
            '        waitpid(p, NULL, 0);\n' +
            '    }\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t2);\n' +
            '    return ((t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec)) / N / 1000.0;\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("fork + exit        : %7.1f us/call\\n", run_trial(0));\n' +
            '    printf("fork + exec + exit : %7.1f us/call\\n", run_trial(1));\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o fork_cost fork_cost.c\n' +
            'for i in 1 2 3; do ./fork_cost; echo ---; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'fork + exit        :   250.9 us/call\n' +
            'fork + exec + exit :   832.2 us/call\n' +
            '---\n' +
            'fork + exit        :   383.2 us/call\n' +
            'fork + exec + exit :   882.2 us/call\n' +
            '---\n' +
            'fork + exit        :   215.6 us/call\n' +
            'fork + exec + exit :   841.9 us/call\n' +
            '---' },

          { t: 'cal', kind: 'info', title: 'Đọc hai con số này cho đúng nghề', x:
            '<p><b>fork + wait ≈ 215–385 µs. Thêm exec ≈ 830–885 µs</b>, tức <code>exec</code> ' +
            'đắt gấp khoảng <b>2 đến 4 lần</b> bản thân <code>fork</code>. Hợp lý: <code>exec</code> ' +
            'phải mở file ELF, ánh xạ các đoạn vào bộ nhớ, nạp <code>ld-linux</code>, liên kết ' +
            'động các thư viện — trong khi <code>fork</code> chỉ chép bảng trang nhờ ' +
            'copy-on-write.</p>' +
            '<p>Đây là số đo trên máy bạn, dưới WSL2, với 6 CPU. Trên một SoC ARM Cortex-A7 ' +
            '800 MHz, con số này thường lớn hơn <b>5 đến 10 lần</b>. Hệ quả thiết kế rất cụ ' +
            'thể: một tiến trình <code>fork</code> ra <code>/bin/sh</code> mỗi 100 ms để đọc ' +
            'cảm biến sẽ <b>ăn hết vài phần trăm CPU chỉ để tạo tiến trình</b>, chưa làm gì ' +
            'hữu ích. Đó là lý do phần mềm nhúng nghiêm túc đọc <code>/sys</code> trực tiếp ' +
            '(Bài 19) thay vì gọi <code>system("cat /sys/...")</code>.</p>' +
            '<p>Con số của bạn sẽ dao động vài chục phần trăm giữa các lần chạy — WSL2 là máy ' +
            'ảo và các biện pháp giảm thiểu Spectre làm mọi chuyển vùng nhân đắt lên thất ' +
            'thường. Điều cần nhớ là <b>bậc độ lớn</b>: hàng trăm micro giây, không phải hàng ' +
            'nano giây.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Daemon hoá bằng double-fork, rồi soi tác phẩm qua /proc',
        blocks: [
          { t: 'p', x:
            'Bước cuối gom tất cả lại. Một <b>daemon</b> là tiến trình chạy nền, không gắn với ' +
            'terminal nào, sống sót khi bạn đóng cửa sổ, ghi log ra file. Mọi dịch vụ trên thiết ' +
            'bị nhúng đều có hình dạng này.' },

          { t: 'code', where: 'file', name: 'daemon.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <unistd.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <sys/stat.h>\n' +
            '\n' +
            'static void daemonize(void)\n' +
            '{\n' +
            '    pid_t p = fork();                 /* fork #1 */\n' +
            '    if (p < 0) exit(1);\n' +
            '    if (p > 0) exit(0);               /* parent exits -> child becomes an orphan */\n' +
            '\n' +
            '    if (setsid() < 0) exit(1);        /* create new session, detach from terminal */\n' +
            '\n' +
            '    p = fork();                       /* fork #2 */\n' +
            '    if (p < 0) exit(1);\n' +
            '    if (p > 0) exit(0);               /* no longer session leader */\n' +
            '\n' +
            '    umask(0);\n' +
            '    if (chdir("/") < 0) exit(1);\n' +
            '\n' +
            '    close(0); close(1); close(2);\n' +
            '    open("/dev/null", O_RDONLY);      /* fd 0 */\n' +
            '    open("/dev/null", O_WRONLY);      /* fd 1 */\n' +
            '    open("/dev/null", O_WRONLY);      /* fd 2 */\n' +
            '}\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    daemonize();\n' +
            '\n' +
            '    FILE *log = fopen("/tmp/sensor.log", "a");\n' +
            '    if (!log) return 1;\n' +
            '    setvbuf(log, NULL, _IOLBF, 0);    /* line-buffered, no lost log lines */\n' +
            '\n' +
            '    for (int i = 0; i < 5; i++) {\n' +
            '        fprintf(log, "pid=%d ppid=%d tick %d\\n", getpid(), getppid(), i);\n' +
            '        sleep(1);\n' +
            '    }\n' +
            '    fclose(log);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'cmdx', cmd: 'fork(); setsid(); fork(); umask(0); chdir("/"); close(0,1,2);',
            title: 'Sáu bước của nghi thức daemon hoá — mỗi bước chữa một vấn đề cụ thể',
            rows: [
              ['<code>fork</code> lần 1, cha <code>exit</code>', 'Trả quyền điều khiển lại cho shell ngay lập tức', 'Nhờ vậy <code>./daemon</code> không treo terminal. Con thành mồ côi và được subreaper nhận'],
              ['<code>setsid()</code>', 'Tạo <b>phiên</b> mới và <b>nhóm tiến trình</b> mới, cắt đứt terminal điều khiển', 'Chỉ chạy được nếu chưa là trưởng nhóm — đó là lý do phải <code>fork</code> trước. Sau bước này, <kbd>Ctrl</kbd>+<kbd>C</kbd> không giết được nó'],
              ['<code>fork</code> lần 2', 'Từ bỏ vai trưởng phiên', 'Tiến trình không phải trưởng phiên thì <b>không thể</b> vô tình chiếm lại một terminal điều khiển'],
              ['<code>umask(0)</code>', 'Xoá mặt nạ quyền thừa hưởng từ shell', 'Để file daemon tạo ra có đúng quyền mà nó chỉ định trong <code>open</code>, không bị shell can thiệp'],
              ['<code>chdir("/")</code>', 'Rời khỏi thư mục hiện tại', 'Nếu ở lại, thư mục đó không thể tháo (unmount) được — chí mạng khi daemon đứng trong thẻ SD'],
              ['<code>close</code> 0,1,2 rồi mở <code>/dev/null</code>', 'Ba fd chuẩn phải hợp lệ nhưng vô hại', 'Bỏ trống là nguy hiểm: một <code>open</code> sau đó sẽ nhận số 1, và mọi <code>printf</code> vô tình sẽ ghi đè vào file dữ liệu']
            ]},

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -o daemon daemon.c\n' +
            'rm -f /tmp/sensor.log\n' +
            './daemon\n' +
            'echo "./daemon returned immediately, exit=$?"\n' +
            'sleep 1\n' +
            'DPID=$(pgrep -x daemon | head -1)\n' +
            'ps -o pid,ppid,pgid,sid,tty,stat,comm -p $DPID' },

          { t: 'code', where: 'out', nocopy: true, code:
            './daemon returned immediately, exit=0\n' +
            '    PID    PPID    PGID     SID TT       STAT COMMAND\n' +
            '  16499   13328   16498   16498 ?        S    daemon' },

          { t: 'cal', kind: 'why', title: 'Dấu ? ở cột TT là bằng chứng bạn đã daemon hoá thành công', x:
            '<p>Cột <code>TT</code> là terminal điều khiển. Mọi chương trình bạn chạy từ shell ' +
            'đều hiện <code>pts/0</code> hoặc tương tự. Daemon hiện <b><code>?</code></b> — nó ' +
            'không thuộc về terminal nào. Đóng cửa sổ WSL, nó vẫn chạy tiếp.</p>' +
            '<p>Hai cột <code>PGID</code> và <code>SID</code> đều bằng <b>16498</b> nhưng ' +
            '<code>PID</code> là <b>16499</b>. Đọc ngược lại được cả câu chuyện: 16498 là tiến ' +
            'trình đã gọi <code>setsid()</code> — nó lập ra phiên 16498 và nhóm 16498 rồi ' +
            '<code>fork</code> lần hai ra 16499 và tự thoát. 16499 <b>ở trong</b> phiên đó nhưng ' +
            '<b>không phải trưởng phiên</b>. Đúng ý đồ.</p>' +
            '<p><code>PPID = 13328</code> chính là subreaper của Bước 3, không phải shell đã chạy ' +
            'nó. Shell đã quên nó từ lâu.</p>' },

          { t: 'code', where: 'wsl', code:
            'ls -l /proc/$DPID/fd\n' +
            'ls -l /proc/$DPID/cwd\n' +
            'sleep 5\n' +
            'cat /tmp/sensor.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 0\n' +
            'lr-x------ 1 shinarus shinarus 64 Aug  5 22:18 0 -> /dev/null\n' +
            'l-wx------ 1 shinarus shinarus 64 Aug  5 22:18 1 -> /dev/null\n' +
            'l-wx------ 1 shinarus shinarus 64 Aug  5 22:18 2 -> /dev/null\n' +
            'l-wx------ 1 shinarus shinarus 64 Aug  5 22:18 3 -> /tmp/sensor.log\n' +
            'lrwx------ 1 shinarus shinarus 64 Aug  5 22:18 7 -> /dev/ptmx\n' +
            'lrwxrwxrwx 1 shinarus shinarus 0 Aug  5 22:18 /proc/16499/cwd -> /\n' +
            'pid=16499 ppid=13328 tick 0\n' +
            'pid=16499 ppid=13328 tick 1\n' +
            'pid=16499 ppid=13328 tick 2\n' +
            'pid=16499 ppid=13328 tick 3\n' +
            'pid=16499 ppid=13328 tick 4',
            notes: ['fd <b>7</b> trỏ tới <code>/dev/ptmx</code> — một descriptor thừa hưởng từ ' +
              'phiên WSL đang chạy lệnh này, <b>không</b> phải do <code>daemon.c</code> mở. Nghi ' +
              'thức sáu bước chỉ đóng fd 0,1,2; nó <i>không</i> đóng các fd khác đang mở sẵn — ' +
              'một daemon viết cẩn thận trong thực tế nên đóng mọi fd tới <code>sysconf(_SC_OPEN_MAX)</code> ' +
              'hoặc dùng <code>close_range()</code> để không rò rỉ chúng vào tiến trình sau khi mồ côi.'] },

          { t: 'cal', kind: 'info', title: 'Ba chi tiết đáng dừng lại trong log này', x:
            '<p><b>fd 0, 1, 2 đều là <code>/dev/null</code>, fd 3 là file log.</b> Đúng như thiết ' +
            'kế: <code>fopen</code> nhận số nhỏ nhất còn trống là 3, vì ba số dưới đã bị chiếm ' +
            'sẵn bằng <code>/dev/null</code>.</p>' +
            '<p><b><code>cwd -&gt; /</code></b> — <code>chdir("/")</code> đã có hiệu lực, dù bạn ' +
            'chạy lệnh từ <code>~/embedded/bai20</code>.</p>' +
            '<p><b>Mọi dòng log đều ghi cùng <code>ppid=13328</code>, từ nhịp 0.</b> Ở lần chạy ' +
            'này, tiến trình trung gian đã kịp thoát và daemon đã được subreaper nhận nuôi ' +
            '<i>trước khi</i> nhịp 0 chạy tới — bộ lập lịch quyết định việc này, nên máy bạn có ' +
            'thể thấy PPID khác nhau ở nhịp 0 rồi ổn định từ nhịp 1, giống ví dụ gốc của bài. Cả ' +
            'hai kết quả đều đúng.</p>' },

          { t: 'cal', kind: 'tip', title: 'Ngoài đời bạn sẽ không viết đoạn mã này nữa', x:
            '<p>Nghi thức sáu bước trên là cách làm <b>truyền thống</b>, và bạn cần hiểu nó vì ' +
            'kho phần mềm nhúng đầy chương trình viết theo lối đó. Nhưng với systemd (Chặng 09), ' +
            'cách đúng là <b>không</b> daemon hoá: viết chương trình chạy tiền cảnh bình thường, ' +
            'ghi log ra <code>stdout</code>, và khai <code>Type=simple</code> trong file service. ' +
            'systemd tự lo phiên, thư mục làm việc, chuyển hướng log và khởi động lại khi chết.</p>' +
            '<p>Chương trình vì thế đơn giản hơn hẳn <i>và</i> giám sát được tốt hơn — systemd ' +
            'không bao giờ mất dấu PID. Bài 21 sẽ bổ nốt mảnh còn thiếu: làm sao chương trình ' +
            'tiền cảnh đó nhận <code>SIGTERM</code> và tắt cho êm.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       9. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>implicit declaration of function \'strsignal\'</code>',
         'Thiếu <code>#include &lt;string.h&gt;</code> trong <code>runcmd.c</code>. Gặp thật khi biên dịch bài này.',
         'Thêm <code>#include &lt;string.h&gt;</code>. Đừng chữa bằng <code>-D_GNU_SOURCE</code> — hàm này thuộc POSIX chuẩn, chỉ là bạn quên header.'],

        ['<code>ignoring return value of \'write\' declared with attribute \'warn_unused_result\'</code>',
         'Gọi <code>write</code> mà không kiểm tra giá trị trả về, với <code>-Wall -Wextra</code>.',
         'Kiểm tra giá trị trả về thật sự, hoặc gói vào vòng lặp ghi hết như <code>ghi_het()</code> ở Bài 19. Đừng ép kiểu <code>(void)</code> để bịt cảnh báo.'],

        ['Dòng in <b>trước</b> <code>fork</code> xuất hiện hai lần trong file log',
         'Đệm <code>stdio</code> chưa xả bị <code>fork</code> nhân đôi. Chỉ xảy ra khi <code>stdout</code> là file (đệm toàn phần).',
         'Gọi <code>fflush(stdout)</code> ngay trước <code>fork</code>, và dùng <code>_exit</code> chứ không dùng <code>exit</code> trong nhánh con.'],

        ['<code>ps</code> hiện trạng thái <code>Z</code>, <code>kill -9</code> không diệt được',
         'Zombie: con đã chết, cha còn sống nhưng không gọi <code>wait</code>.',
         'Không thể giết cái đã chết. Sửa <b>cha</b>: gọi <code>waitpid</code>, hoặc bắt <code>SIGCHLD</code> (Bài 21). Chữa cháy tạm: khởi động lại tiến trình cha.'],

        ['<code>fork: Resource temporarily unavailable</code> (<code>EAGAIN</code>)',
         'Cạn PID hoặc chạm giới hạn <code>RLIMIT_NPROC</code> — thường do zombie tích tụ nhiều ngày.',
         '<code>ps -eo stat | grep -c Z</code> để đếm zombie. So với <code>cat /proc/sys/kernel/pid_max</code>. Nguyên nhân gốc luôn là một vòng lặp <code>fork</code> thiếu <code>wait</code>.'],

        ['Chương trình chạy tiếp sau <code>exec</code>, in ra dòng lẽ ra không bao giờ tới',
         '<code>exec</code> đã <b>thất bại</b>. Sai đường dẫn, không có quyền thực thi, hoặc sai kiến trúc ELF.',
         'Luôn đặt <code>perror("execvp")</code> ngay sau <code>exec</code>. Đọc thông báo: <code>No such file or directory</code> là sai đường dẫn, <code>Permission denied</code> là thiếu bit <code>x</code>, <code>Exec format error</code> là sai kiến trúc (Bài 3).'],

        ['<code>execl("/bin/echo", "xin chao", NULL)</code> không in ra gì',
         'Quên <code>argv[0]</code>. Chuỗi <code>"xin chao"</code> bị hiểu là tên chương trình, danh sách tham số rỗng.',
         'Viết <code>execl("/bin/echo", "echo", "xin chao", (char *)NULL)</code>. Tham số thứ hai <b>luôn</b> là <code>argv[0]</code>.'],

        ['Chương trình sập ngay tại <code>getenv</code>',
         '<code>getenv</code> trả <code>NULL</code> khi biến chưa được đặt, và bạn đưa thẳng <code>NULL</code> cho <code>strlen</code> hoặc <code>%s</code>.',
         'Luôn kiểm tra: <code>const char *v = getenv("X"); if (!v) v = "mac-dinh";</code>'],

        ['Mã thoát của con luôn bằng 0 dù chương trình rõ ràng thất bại',
         'Hoặc <code>return</code> một số lớn hơn 255 (chỉ một byte được giữ), hoặc tự dịch bit <code>status &gt;&gt; 8</code> mà không hỏi <code>WIFEXITED</code> trước.',
         'Giữ mã thoát trong 1–125. Luôn hỏi <code>WIFEXITED</code>/<code>WIFSIGNALED</code> trước khi lấy giá trị.'],

        ['<code>./daemon</code> treo terminal, không trả lại dấu nhắc',
         'Thiếu <code>fork</code> lần 1, hoặc nhánh cha quên <code>exit(0)</code>.',
         'Cha <b>phải</b> thoát ngay sau <code>fork</code> lần 1. Kiểm tra bằng <code>ps -o tty</code>: daemon đúng phải hiện <code>?</code>.'],

        ['Daemon chạy nhưng file log rỗng, dù chương trình vẫn sống',
         'Đệm <code>stdio</code> ở chế độ toàn phần (4 KB) vì đích là file — log chỉ hiện khi đầy đệm hoặc khi <code>fclose</code>.',
         '<code>setvbuf(log, NULL, _IOLBF, 0)</code> để xả theo dòng, như trong <code>daemon.c</code>. Cùng cơ chế đã phân tích ở Bài 19.'],

        ['<code>strace</code> không thấy gì sau khi tiến trình <code>fork</code>',
         'Thiếu cờ <code>-f</code>. Mặc định <code>strace</code> chỉ theo dõi tiến trình gốc.',
         'Dùng <code>strace -f</code>. Kèm <code>-o file</code> để vết không trộn với kết xuất của chương trình.']
      ]},

    /* ══════════════════════════════════════════════
       10. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 20', items: [
      'Trên Linux, <b>tạo tiến trình</b> và <b>chạy chương trình</b> là hai việc tách rời: <code>fork</code> nhân bản, <code>exec</code> thay ruột. Mọi shell đều là vòng lặp <code>fork</code> → <code>exec</code> → <code>wait</code>.',
      '<code>fork()</code> trả về <b>hai lần</b>: <b>0</b> cho con, <b>PID của con</b> cho cha, <b>-1</b> khi lỗi. Mọi dòng sau <code>fork</code> đều thuộc về cả hai tiến trình.',
      'Cha và con in ra <b>cùng một địa chỉ</b> <code>0x5e06c6e64010</code> nhưng đọc được <b>hai giá trị khác nhau</b> — bằng chứng của địa chỉ ảo và <b>copy-on-write</b>. Không có biến nào dùng chung.',
      '<code>exec</code> <b>giữ nguyên PID</b>, giữ nguyên bảng file descriptor, và <b>không bao giờ trả về</b> khi thành công. Chạy tới dòng sau nó nghĩa là đã lỗi.',
      'Biến trạng thái của <code>waitpid</code> là số <b>đã đóng gói</b>: <code>0x0100</code> = thoát 1, <code>0x7f00</code> = thoát 127, <code>0x0009</code> = bị tín hiệu 9 giết. Luôn giải mã bằng <code>WIFEXITED</code>/<code>WEXITSTATUS</code>/<code>WIFSIGNALED</code>/<code>WTERMSIG</code>.',
      'Mã thoát chỉ có <b>1 byte</b> (0–255). Quy ước: <b>0</b> thành công, <b>126</b> không chạy được, <b>127</b> không tìm thấy lệnh, <b>128+n</b> bị tín hiệu <i>n</i> giết.',
      '<b>Zombie</b> = con chết chưa được gặt: mất hết <code>VmSize</code>, <code>cmdline</code> còn <b>0</b> byte, chỉ chiếm một ô PID. Vô hại một con, cạn bảng PID với hàng vạn con.',
      '<b>Mồ côi</b> = cha chết trước; nhân giao con cho <b>subreaper gần nhất</b> — trên WSL là <code>Relay(...)</code>/<code>SessionLeader</code>, <b>không phải PID 1</b>.',
      'Phép chuyển hướng <code>&gt;</code> của shell chính là <code>fork</code> → <code>open</code> → <code>dup2(fd, 1)</code> → <code>close</code> → <code>exec</code>. Chương trình được chạy hoàn toàn không biết gì.',
      'Đo được trên máy bạn: <code>fork</code>+<code>wait</code> ≈ <b>215–385 µs</b>; thêm <code>exec</code> ≈ <b>830–885 µs</b>, đắt hơn khoảng <b>2–4 lần</b>. Trên SoC ARM còn chậm hơn 5–10 lần — đừng <code>fork</code> trong vòng lặp nóng.',
      'Nghi thức daemon hoá: <code>fork</code> → <code>setsid</code> → <code>fork</code> → <code>umask(0)</code> → <code>chdir("/")</code> → nối 0/1/2 vào <code>/dev/null</code>. Dấu <b><code>?</code></b> ở cột <code>TT</code> của <code>ps</code> là bằng chứng đã thành công.',
      '<code>strace -f</code> cho thấy không có syscall nào tên <code>fork</code> — chỉ có <b><code>clone</code></b>; và <code>execvp</code> tốn <b>4</b> lần <code>execve</code> thất bại vì phải dò <code>PATH</code>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 21 — Tín hiệu và tắt máy êm.</b> Trong bản ghi <code>strace</code> ở Bước 2 có ' +
      'một dòng bạn đã lướt qua: <code>--- SIGCHLD {si_code=CLD_EXITED, si_pid=13415} ---</code>. ' +
      'Đó là nhân gõ cửa tiến trình cha để báo con đã chết. Bài 21 sẽ dạy bạn mở cửa: bắt ' +
      '<code>SIGCHLD</code> để dọn zombie tự động, phân biệt <code>SIGTERM</code> (xin phép) với ' +
      '<code>SIGKILL</code> (không thương lượng), và hiểu vì sao gọi <code>printf</code> trong ' +
      'một bộ xử lý tín hiệu có thể làm treo cứng chương trình.</p>' +
      '<p>Bạn sẽ đo trên máy mình khoảng thời gian systemd chờ giữa <code>SIGTERM</code> và ' +
      '<code>SIGKILL</code>, và viết lại chính con <code>daemon.c</code> hôm nay để nó ghi nốt ' +
      'dòng log cuối cùng, đóng file rồi mới chết — thay vì bị cắt ngang giữa chừng. Đó là khác ' +
      'biệt giữa một thiết bị mất dữ liệu mỗi lần cúp điện và một thiết bị không.</p>' }
  ],

  quiz: [
    { q: 'Trong tiến trình con, <code>fork()</code> trả về giá trị nào?',
      opts: ['PID của chính tiến trình con', 'PID của tiến trình cha', '0', '-1'],
      a: 2,
      why: 'Con nhận <b>0</b>, cha nhận PID của con. Lý do bất đối xứng: con muốn biết PID của mình đã có <code>getpid()</code>, muốn biết cha đã có <code>getppid()</code> — nên giá trị trả về ở nhánh con là dư thừa và được dùng làm cờ nhận biết. Ngược lại, cha <b>không có cách nào khác</b> để biết PID của đứa con vừa sinh, nên giá trị đó bắt buộc phải đi qua đường trả về.' },

    { q: 'Cha in địa chỉ của biến toàn cục ra <code>0x5e06c6e64010</code>, con cũng in ra đúng <code>0x5e06c6e64010</code>, nhưng hai bên đọc được hai giá trị khác nhau. Vì sao?',
      opts: [
        'Vì có lỗi trong chương trình, hai tiến trình đang ghi đè lên nhau',
        'Vì đó là địa chỉ ảo; mỗi tiến trình có bảng trang riêng ánh xạ tới khung vật lý khác nhau',
        'Vì <code>printf</code> in sai địa chỉ sau khi <code>fork</code>',
        'Vì con phải gọi <code>wait()</code> thì giá trị mới đồng bộ lại'
      ],
      a: 1,
      why: 'Mọi con trỏ trong chương trình người dùng đều là <b>địa chỉ ảo</b>. Nhân duy trì cho mỗi tiến trình một bảng trang riêng, nên cùng một số địa chỉ có thể trỏ tới hai khung bộ nhớ vật lý hoàn toàn khác nhau. Đây cũng là điểm phân biệt tiến trình với luồng: hai luồng dùng chung bảng trang nên thấy chung biến, còn hai tiến trình thì không bao giờ.' },

    { q: 'Sau <code>waitpid(child, &status, 0)</code>, biến <code>status</code> bằng <code>32512</code> (<code>0x7f00</code>). Điều này nghĩa là gì?',
      opts: [
        'Con bị giết bởi tín hiệu số 32512',
        'Con thoát bình thường với mã thoát 127 — theo quy ước là "không tìm thấy lệnh"',
        'Đã xảy ra lỗi, <code>waitpid</code> thất bại',
        'Con vẫn đang chạy, phải gọi lại <code>waitpid</code>'
      ],
      a: 1,
      why: '<code>0x7f00</code> có byte cao là <code>0x7f</code> = 127 và byte thấp bằng 0, tức <code>WIFEXITED</code> đúng và <code>WEXITSTATUS</code> = 127 — đúng giá trị mà nhánh con <code>_exit(127)</code> sau khi <code>execvp</code> thất bại. Nhưng đừng bao giờ tự dịch bit như vậy trong mã thật: bố cục này không được chuẩn hoá, hãy dùng macro.' },

    { q: 'Một thiết bị chạy được ba ngày rồi bắt đầu báo <code>fork: Resource temporarily unavailable</code> cho mọi tiến trình, kể cả <code>ssh</code>. <code>free -m</code> cho thấy RAM vẫn còn nhiều. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Rò rỉ bộ nhớ trong một dịch vụ',
        'Thẻ SD đầy',
        'Một dịch vụ <code>fork</code> theo chu kỳ nhưng không gọi <code>wait</code>, khiến zombie tích tụ và cạn bảng PID',
        'CPU quá tải nên nhân từ chối tạo tiến trình mới'
      ],
      a: 2,
      why: 'Hai manh mối chỉ thẳng vào zombie. Thứ nhất, <b>RAM còn nhiều</b> — zombie đã trả hết bộ nhớ, thứ duy nhất chúng chiếm là ô PID, nên rò rỉ PID không hề làm RAM giảm. Thứ hai, <b>chỉ lộ ra sau ba ngày</b> — đặc trưng của một lỗi tích tụ chậm theo chu kỳ, không bao giờ bắt được khi test vài phút trên bàn. Xác nhận bằng <code>ps -eo stat | grep -c Z</code>.' },

    { q: 'Vì sao <code>dup2(fd, STDOUT_FILENO)</code> phải nằm <b>giữa</b> <code>fork</code> và <code>exec</code>, không được đặt trước <code>fork</code> hay sau <code>exec</code>?',
      opts: [
        'Vì <code>dup2</code> chỉ hoạt động trong tiến trình con',
        'Vì đặt trước <code>fork</code> sẽ làm chính tiến trình cha mất <code>stdout</code>; còn sau <code>exec</code> thì không còn mã nào của bạn để chạy',
        'Vì <code>exec</code> xoá sạch bảng file descriptor nên phải làm lại sau',
        'Vì <code>fork</code> đặt lại fd 1 về mặc định'
      ],
      a: 1,
      why: 'Chuyển hướng là thao tác chỉ được phép ảnh hưởng tới tiến trình sắp bị thay thế. Trước <code>fork</code> thì cha lãnh đủ. Sau <code>exec</code> thì không tồn tại "sau" — mã của bạn đã bị xoá khỏi bộ nhớ. Cửa sổ duy nhất là khoảng giữa, và nó hoạt động chính vì <code>exec</code> <b>giữ nguyên</b> bảng file descriptor.' },

    { q: 'Trong <code>daemon.c</code>, vì sao phải <code>fork</code> <b>lần thứ hai</b> ngay sau <code>setsid()</code>?',
      opts: [
        'Để có hai tiến trình chạy song song cho nhanh hơn',
        'Vì <code>setsid()</code> chỉ có hiệu lực sau khi <code>fork</code> thêm một lần',
        'Để tiến trình không còn là trưởng phiên, nhờ đó không thể vô tình chiếm lại một terminal điều khiển',
        'Để tiến trình được PID 1 nhận nuôi'
      ],
      a: 2,
      why: '<code>setsid()</code> biến tiến trình thành <b>trưởng phiên</b>, và chỉ trưởng phiên mới có khả năng mở một thiết bị terminal rồi biến nó thành terminal điều khiển của mình — kéo theo việc lại nhận <code>SIGHUP</code>/<code>SIGINT</code> từ terminal đó. <code>fork</code> lần hai sinh ra một tiến trình <i>ở trong</i> phiên nhưng <i>không phải</i> trưởng phiên, nên khả năng đó bị đóng vĩnh viễn. Bạn kiểm chứng được bằng <code>ps</code>: <code>SID</code> = 16498 nhưng <code>PID</code> = 16499.' },

    { q: 'Bản ghi <code>strace -f</code> của <code>./runcmd echo hi</code> cho thấy <b>bốn</b> lời gọi <code>execve</code> trả về <code>ENOENT</code> trước khi <code>/usr/bin/echo</code> thành công. Vì sao?',
      opts: [
        'Vì <code>strace</code> ghi lặp lại cùng một lời gọi',
        'Vì <code>execvp</code> có chữ <code>p</code> nên phải thử lần lượt từng thư mục trong <code>PATH</code> cho tới khi tìm thấy file',
        'Vì file <code>echo</code> bị hỏng nên nhân phải thử lại',
        'Vì có bốn tiến trình con được tạo ra'
      ],
      a: 1,
      why: 'Syscall <code>execve</code> chỉ nhận đường dẫn tuyệt đối và không biết <code>PATH</code> là gì. Chữ <code>p</code> trong <code>execvp</code> là một vòng lặp <b>trong thư viện C</b>, ghép tên lệnh vào từng thư mục của <code>PATH</code> rồi gọi <code>execve</code> cho tới khi hết <code>ENOENT</code>. Vì thế dùng <code>execv</code> với đường dẫn tuyệt đối vừa nhanh hơn vừa an toàn hơn trên thiết bị nhúng.' }
  ]
});

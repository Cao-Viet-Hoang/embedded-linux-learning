/* Bài 49 — init: từ /init đến systemd
   Chặng 09 — Root filesystem
   Nối tiếp Bài 46–48: trả lời câu hỏi cả ba bài đã né — PID 1 có gì đặc biệt mà kernel không cho nó
   chết? Đọc ba luật của kernel trong mã nguồn (panic khi PID 1 thoát, SIGNAL_UNKILLABLE, nhận nuôi mồ
   côi), nhìn tận mắt chúng trong QEMU, viết một PID 1 cố tình thiếu (noreap_init) để thấy zombie tích
   lại và tín hiệu bị nuốt. Rồi giữ temp_daemon (Bài 24) sống bằng ba cách: respawn của BusyBox init,
   script kiểu SysV với start-stop-daemon, và một unit systemd (--user, trên chính WSL của bạn).
   Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   systemd 245), kernel ~/bai38/linux-6.18.45, rootfs chép từ ~/bai47/rootfs, BusyBox 1.38.0.
   Không dạy module (Bài 50), không build lại kernel hay BusyBox, không dựng systemd trong rootfs nhúng
   (Chặng 11 — Buildroot/Yocto chọn init bằng một dòng cấu hình). */

Lesson.register({
  id: 'bai-49',
  title: 'init: từ /init đến systemd',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Ba bài vừa qua, câu <code>Kernel panic - not syncing: Attempted to kill init!</code> xuất hiện ' +
    'ba lần. Bài 46 thấy nó khi shell PID 1 thoát. Bài 47 thấy <code>respawn</code> hồi sinh một ' +
    'shell vừa chết. Bài 48 thấy <code>switch_root</code> từ chối chạy nếu không phải PID 1. Cả ba ' +
    'lần, bài học đều nói \"Bài 49 sẽ giải thích\". Đây là Bài 49.<br><br>' +
    'Bạn sẽ đọc đúng ba đoạn mã trong kernel khiến PID 1 khác mọi tiến trình khác, rồi thấy chúng ' +
    'hoạt động: <code>kill -9 1</code> trả về thành công mà không có gì xảy ra, một tiến trình mồ ' +
    'côi được PID 1 nhận nuôi và gặt. Sau đó bạn tự viết một PID 1 \"lười\" — nó chỉ chạy một shell ' +
    'rồi ngủ — và xem hệ thống hỏng dần theo cách rất cụ thể: zombie chất đống, ' +
    '<code>kill -TERM 1</code> không có tác dụng.<br><br>' +
    'Nửa sau của bài giải quyết lời hứa từ Chặng 03: daemon <code>temp_daemon</code> bạn viết ở ' +
    'Bài 24 sẽ tự chạy khi boot và <b>sống lại mỗi khi bị giết</b>. Bạn sẽ làm việc đó ba lần, ' +
    'bằng ba thế hệ init — BusyBox init, SysV, systemd — và giết nó bằng ' +
    '<code>kill -9</code> sau mỗi lần để thấy thế hệ nào thật sự trông chừng nó.',

  goals: [
    'Chỉ ra ba luật kernel áp riêng cho PID 1 (panic khi thoát, bỏ qua tín hiệu không có handler, ' +
      'nhận nuôi mồ côi) trong mã nguồn <code>kernel/exit.c</code>, <code>kernel/signal.c</code>, ' +
      '<code>kernel/fork.c</code>, và chứng minh từng luật bằng một lệnh trong QEMU.',
    'Giải thích hai nhiệm vụ mà mọi chương trình init phải tự làm — gặt tiến trình mồ côi và phản ' +
      'hồi tín hiệu tắt máy — và nhận ra triệu chứng khi một PID 1 bỏ qua chúng.',
    'Đọc bảng tín hiệu của BusyBox init (<code>HUP</code>, <code>INT</code>, <code>USR1</code>, ' +
      '<code>USR2</code>, <code>TERM</code>, <code>QUIT</code>) và biết lệnh <code>poweroff</code> ' +
      'thật ra làm gì.',
    'Giữ một daemon sống bằng <code>respawn</code> trong <code>inittab</code>, bằng script ' +
      '<code>/etc/init.d</code> kiểu SysV với <code>start-stop-daemon</code>, và bằng một unit ' +
      'systemd có <code>Restart=always</code> — rồi so sánh ba cách khi daemon bị ' +
      '<code>kill -9</code>.',
    'Dùng <code>systemctl</code> và <code>journalctl</code> để khởi động, kiểm tra, dừng, bật tự ' +
      'chạy một service, và đọc được thông báo <code>Start request repeated too quickly</code>.',
    'Chọn init phù hợp cho một thiết bị nhúng dựa trên số liệu: kích thước, thời gian boot, tính ' +
      'năng giám sát, và những gì kernel phải bật.'
  ],

  blocks: [

    /* ============================================================
       1. BA LUẬT CỦA KERNEL
       ============================================================ */
    { t: 'h2', x: 'PID 1 — tiến trình duy nhất kernel đối xử khác' },

    { t: 'p', x:
      'Với kernel, PID 1 là một tiến trình bình thường ở gần như mọi mặt: nó có bảng trang, có ' +
      'file descriptor, được lập lịch như ai. Chỉ khác ở <b>ba</b> điểm, và cả ba đều là những dòng ' +
      'mã cụ thể trong cây <code>~/bai38/linux-6.18.45</code> bạn đã dùng từ Bài 38. Muốn hiểu vì ' +
      'sao chương trình init lại được viết theo cách nó được viết, bạn cần biết đúng ba điểm này — ' +
      'không hơn.' },

    { t: 'table',
      head: ['Luật', 'Ở đâu trong kernel 6.18.45', 'Nghĩa là gì'],
      rows: [
        ['<b>1. PID 1 thoát → panic</b>',
         '<code>kernel/exit.c:935–937</code>: <code>if (unlikely(is_global_init(tsk))) panic(\"Attempted to kill init! …\")</code>',
         'Khi luồng cuối cùng của PID 1 kết thúc — dù do <code>exit()</code>, do lỗi, hay do bị ' +
         'giết — kernel dừng toàn hệ thống. Chú thích ngay trên dòng đó nói lý do: \"panic ngay ' +
         'để có một coredump dùng được\".'],
        ['<b>2. Tín hiệu không ai chờ → bị bỏ</b>',
         '<code>kernel/fork.c:2385–2387</code> gắn cờ <code>SIGNAL_UNKILLABLE</code> cho PID 1; ' +
         '<code>kernel/signal.c:90–96</code> đọc cờ đó',
         'Một tín hiệu gửi tới PID 1 mà PID 1 vừa không cài handler (<code>SIG_DFL</code>) vừa ' +
         'không chặn để chờ nó, sẽ bị vứt đi ngay khi gửi. <code>SIGKILL</code> và ' +
         '<code>SIGSTOP</code> — hai tín hiệu không ai chặn được — luôn bị vứt, nếu đến từ userspace.'],
        ['<b>3. Mồ côi → về tay PID 1</b>',
         '<code>kernel/exit.c:642</code> <code>find_new_reaper()</code>',
         'Khi một tiến trình chết mà con nó còn sống, kernel tìm cha mới cho các con: một luồng ' +
         'khác cùng tiến trình, rồi một <i>subreaper</i> gần nhất (Bài 20), cuối cùng là PID 1.']
      ] },

    { t: 'fig',
      cap: 'Ba luật đều nói cùng một điều: kernel <b>tin</b> PID 1 sẽ không bao giờ biến mất và ' +
           'giao cho nó mọi thứ vô chủ. Đổi lại, kernel bảo vệ nó khỏi mọi tín hiệu nó không tự ' +
           'xử lý. Phần còn lại — gặt các con được giao, làm gì khi có tín hiệu — kernel không làm ' +
           'thay; đó là việc của chương trình init.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Ba luật kernel áp cho PID 1: thoát thì panic, tín hiệu không có handler bị bỏ, tiến trình mồ côi được giao cho PID 1; và hai nhiệm vụ init phải tự làm: gặt con và xử lý tín hiệu">' +
        '<rect class="d-box-p" x="260" y="16" width="200" height="56" rx="6"/>' +
        '<text class="d-t" x="360" y="40" text-anchor="middle">PID 1</text>' +
        '<text class="d-ts" x="360" y="60" text-anchor="middle">SIGNAL_UNKILLABLE</text>' +
        '<rect class="d-box-w" x="20" y="110" width="210" height="80" rx="6"/>' +
        '<text class="d-t" x="34" y="134">1. Thoát</text>' +
        '<text class="d-ts" x="34" y="156">exit(), lỗi, bị giết…</text>' +
        '<text class="d-tm" x="34" y="176">→ panic()</text>' +
        '<rect class="d-box-a" x="255" y="110" width="210" height="80" rx="6"/>' +
        '<text class="d-t" x="269" y="134">2. Nhận tín hiệu</text>' +
        '<text class="d-ts" x="269" y="156">handler = SIG_DFL, hoặc</text>' +
        '<text class="d-ts" x="269" y="176">SIGKILL/SIGSTOP → bị bỏ</text>' +
        '<rect class="d-box-g" x="490" y="110" width="210" height="80" rx="6"/>' +
        '<text class="d-t" x="504" y="134">3. Nhận mồ côi</text>' +
        '<text class="d-ts" x="504" y="156">cha chết, không có</text>' +
        '<text class="d-ts" x="504" y="176">subreaper → PPID = 1</text>' +
        '<line class="d-line" x1="300" y1="72" x2="125" y2="102"/>' +
        '<path class="d-arrow" d="M 125 110 l 1 -9 l 7 5 z"/>' +
        '<line class="d-line" x1="360" y1="72" x2="360" y2="102"/>' +
        '<path class="d-arrow" d="M 360 110 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="420" y1="72" x2="595" y2="102"/>' +
        '<path class="d-arrow" d="M 595 110 l -8 -4 l 7 -4 z"/>' +
        '<rect class="d-box" x="20" y="220" width="680" height="64" rx="6"/>' +
        '<text class="d-t" x="34" y="244">Kernel không làm thay — chương trình init phải tự làm:</text>' +
        '<text class="d-ts" x="34" y="266">(a) gọi wait() cho mọi con nó được giao, nếu không chúng thành zombie mãi mãi;</text>' +
        '<text class="d-ts" x="34" y="280">(b) cài handler cho tín hiệu tắt máy, nếu không kill -TERM 1 chẳng có tác dụng gì.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Luật 2 là luật dễ hiểu nhầm nhất. Nó <b>không</b> nói \"PID 1 miễn nhiễm mọi tín hiệu\". Nó ' +
      'nói: kernel chỉ giao cho PID 1 những tín hiệu PID 1 <b>đã tuyên bố muốn nhận</b> — bằng ' +
      'một trong hai cách: cài handler, hoặc chặn (block) tín hiệu đó để lấy ra sau bằng ' +
      '<code>sigtimedwait()</code> / <code>signalfd()</code>. Cách thứ hai bạn đã dùng ở Bài 21 và ' +
      'trong chính <code>temp_daemon</code> ở Bài 24. Đây là đoạn kiểm tra, trong hàm ' +
      '<code>sig_task_ignored()</code> (<code>kernel/signal.c:84</code>) — kernel gọi nó ngay lúc ' +
      'gửi tín hiệu, trước khi xếp tín hiệu vào hàng đợi:' },

    { t: 'code', where: 'file', name: 'kernel/signal.c:90–96 (6.18.45)', lang: 'c', nocopy: true, code:
      '\t/* SIGKILL and SIGSTOP may not be sent to the global init */\n' +
      '\tif (unlikely(is_global_init(t) && sig_kernel_only(sig)))\n' +
      '\t\treturn true;\n' +
      '\n' +
      '\tif (unlikely(t->signal->flags & SIGNAL_UNKILLABLE) &&\n' +
      '\t    handler == SIG_DFL && !(force && sig_kernel_only(sig)))\n' +
      '\t\treturn true;',
      notes: [
        '<code>return true</code> ở đây nghĩa là \"tín hiệu này bị bỏ qua\" — nó không bao giờ tới hàng đợi của PID 1. Tiến trình gửi <b>không</b> nhận lỗi nào: <code>kill()</code> vẫn trả về 0. Bước 2 phần Thực hành sẽ cho bạn thấy chính điều đó.',
        'Hàm gọi nó, <code>sig_ignored()</code>, kiểm tra một điều <b>trước</b>: <code>if (sigismember(&amp;t-&gt;blocked, sig) || sigismember(&amp;t-&gt;real_blocked, sig)) return false;</code> (<code>kernel/signal.c:113</code>) — \"tín hiệu đang bị chặn thì không bao giờ bị bỏ\". Đó là cánh cửa thứ hai để một PID 1 không có handler vẫn nhận được tín hiệu.',
        '<code>force</code> chỉ đúng khi tín hiệu do chính kernel sinh ra (ví dụ một lỗi truy cập bộ nhớ trong PID 1). Tức là PID 1 vẫn có thể chết — vì lỗi của chính nó — và khi đó luật 1 kích hoạt: panic.',
        'Bạn có thể tự mở file này: <code>sed -n 84,100p ~/bai38/linux-6.18.45/kernel/signal.c</code>.'
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao kernel thiết kế như vậy',
      x: '<p>Hãy nghĩ ngược lại: nếu <code>kill -9 1</code> giết được PID 1, thì một lệnh gõ nhầm của ' +
         'root — hoặc một script <code>kill -9 -1</code> (\"giết mọi tiến trình tôi có quyền\") — ' +
         'sẽ panic cả máy. Và nếu PID 1 để <code>SIGTERM</code> ở hành vi mặc định (\"kết thúc ' +
         'tiến trình\"), mọi lệnh <code>killall</code> quét rộng đều có thể hạ nó.</p>' +
         '<p>Nên kernel chọn một hợp đồng đơn giản: <b>PID 1 chỉ nghe những gì nó tuyên bố muốn ' +
         'nghe.</b> Một chương trình init muốn phản ứng với <code>SIGTERM</code> (khởi động lại) ' +
         'thì cài handler cho <code>SIGTERM</code>; chưa cài thì tín hiệu đó không tồn tại với nó. ' +
         'Đây cũng là lý do một chương trình bình thường chạy làm PID 1 trong container Docker ' +
         '\"không chịu tắt\" khi bạn <code>docker stop</code> — nó chưa bao giờ cài handler cho ' +
         '<code>SIGTERM</code>, và giờ kernel không còn giết hộ nó nữa.</p>' },

    /* ============================================================
       2. HAI NHIỆM VỤ CỦA INIT, VÀ BUSYBOX INIT LÀM CHÚNG RA SAO
       ============================================================ */
    { t: 'h2', x: 'Hai việc kernel để lại cho init — và BusyBox init làm chúng ra sao' },

    { t: 'p', x:
      'Luật 1 và luật 3 cộng lại tạo ra nhiệm vụ thứ nhất. Mọi tiến trình mồ côi trong hệ thống ' +
      'cuối cùng đều thành con của PID 1. Khi chúng chết, chúng thành <b>zombie</b> — đúng như Bài ' +
      '20 đã mổ xẻ — và chỉ cha của chúng mới gặt được bằng <code>wait()</code>. Nếu PID 1 không ' +
      'gặt, không còn ai khác: zombie nằm đó tới khi tắt máy, mỗi con giữ một ô PID. Bài 20 đã tính: ' +
      'trên một nhân nhúng <code>pid_max = 32768</code>, rò một zombie mỗi 10 giây là cạn bảng PID ' +
      'sau <b>ba ngày rưỡi</b> — và từ đó <code>fork()</code> thất bại cho toàn hệ thống.' },

    { t: 'p', x:
      'Luật 2 tạo ra nhiệm vụ thứ hai. Lệnh <code>poweroff</code>, <code>reboot</code>, nút nguồn ' +
      'ACPI, tổ hợp Ctrl-Alt-Del — tất cả đều được chuyển thành <b>một tín hiệu gửi tới PID 1</b>. ' +
      'Nếu PID 1 không tuyên bố muốn nhận tín hiệu đó, kernel vứt nó đi và máy không bao giờ tắt ' +
      'êm. Nói cách khác: kernel không có khái niệm \"tắt máy êm\". Việc gửi <code>SIGTERM</code> ' +
      'cho mọi tiến trình, chờ, gỡ các hệ thống file, rồi mới gọi syscall <code>reboot()</code> — ' +
      'toàn bộ là việc của init.' },

    { t: 'p', x:
      'BusyBox init làm cả hai việc trong một file C 1 371 dòng (<code>init/init.c</code>). Đây là ' +
      'vòng lặp chính của nó, rút gọn — bạn có thể mở bản đầy đủ tại ' +
      '<code>~/bai47/busybox-1.38.0/init/init.c:1190–1229</code>:' },

    { t: 'code', where: 'file', name: 'busybox-1.38.0/init/init.c — vòng lặp chính (rút gọn)', lang: 'c', nocopy: true, code:
      '/* at start-up (line 1049-1061): block every signal init cares about */\n' +
      'sigaddset(&G.delayed_sigset, SIGINT);  /* Ctrl-Alt-Del */\n' +
      'sigaddset(&G.delayed_sigset, SIGQUIT); /* re-exec another init */\n' +
      'sigaddset(&G.delayed_sigset, SIGUSR1); /* halt */\n' +
      'sigaddset(&G.delayed_sigset, SIGTERM); /* reboot */\n' +
      'sigaddset(&G.delayed_sigset, SIGUSR2); /* poweroff */\n' +
      'sigaddset(&G.delayed_sigset, SIGHUP);  /* reread /etc/inittab */\n' +
      'sigaddset(&G.delayed_sigset, SIGCHLD); /* make sigtimedwait() exit on SIGCHLD */\n' +
      'sigprocmask(SIG_BLOCK, &G.delayed_sigset, NULL);\n' +
      '...\n' +
      'while (1) {\n' +
      '    run_actions(RESPAWN | ASKFIRST);     /* start whatever is not running */\n' +
      '    check_delayed_sigs(NULL);            /* sigtimedwait(): sleep until a signal */\n' +
      '    while (1) {                          /* reap EVERY dead child, not just one */\n' +
      '        pid_t wpid = wait_any_nohang(&status);\n' +
      '        if (wpid <= 0)\n' +
      '            break;\n' +
      '        mark_terminated(wpid);           /* respawn entry? schedule it again */\n' +
      '    }\n' +
      '    sleep1();                            /* at most one respawn per second */\n' +
      '}',
      notes: [
        'BusyBox init không cài handler cho những tín hiệu này — nó <b>chặn</b> chúng rồi ngủ trong <code>sigtimedwait()</code>, đúng kỹ thuật \"biến tín hiệu thành sự kiện\" của Bài 21. Theo đoạn <code>kernel/signal.c:113</code> ở trên, tín hiệu đang bị chặn không bao giờ bị kernel vứt, nên chúng tới được PID 1.',
        'Vòng <code>while</code> bên trong gặt <b>tất cả</b> con đã chết, không chỉ một — đúng quy tắc <code>while (waitpid(-1, NULL, WNOHANG) &gt; 0)</code> của Bài 21, vì nhiều <code>SIGCHLD</code> có thể gộp thành một lần báo (bài tập <code>bad_reaper</code> ở <code>bt-21</code> đã cho bạn thấy hậu quả khi dùng <code>if</code>).',
        '<code>sleep1()</code> cuối vòng là lý do <code>respawn</code> không bao giờ hồi sinh một chương trình nhanh hơn <b>một lần mỗi giây</b> — Bài 47 đã thấy điều này với <code>ttyS0</code>.'
      ] },

    { t: 'p', x:
      'Mỗi tín hiệu trong danh sách trên là một lệnh bạn có thể ra cho init. Đây là toàn bộ \"giao ' +
      'diện điều khiển\" của BusyBox init — không có socket, không có file cấu hình động, chỉ có ' +
      'tín hiệu:' },

    { t: 'table',
      head: ['Tín hiệu tới PID 1', 'BusyBox init làm gì', 'Ai thường gửi'],
      rows: [
        ['<code>SIGUSR2</code>', 'Chạy các dòng <code>::shutdown:</code>, gửi <code>SIGTERM</code> cho mọi tiến trình, chờ 1 giây, gửi <code>SIGKILL</code>, rồi <b>tắt nguồn</b>', 'Lệnh <code>poweroff</code> (<code>init/halt.c:172</code>: <code>{ SIGUSR1, SIGUSR2, SIGTERM }</code>)'],
        ['<code>SIGTERM</code>', 'Như trên, nhưng <b>khởi động lại</b>', 'Lệnh <code>reboot</code>'],
        ['<code>SIGUSR1</code>', 'Như trên, nhưng <b>dừng</b> (halt) — CPU đứng, nguồn vẫn cấp', 'Lệnh <code>halt</code>'],
        ['<code>SIGINT</code>', 'Chạy các dòng <code>::ctrlaltdel:</code>', 'Kernel, khi bấm Ctrl-Alt-Del trên console'],
        ['<code>SIGHUP</code>', 'Đọc lại <code>/etc/inittab</code>; dòng <code>respawn</code> mới được chạy', 'Bạn, sau khi sửa <code>inittab</code>'],
        ['<code>SIGQUIT</code>', 'Chạy dòng <code>::restart:</code> — <code>exec</code> sang một chương trình init khác, giữ nguyên PID 1', 'Bạn, khi thay init không cần reboot'],
        ['<code>SIGCHLD</code>', 'Thức dậy để gặt con', 'Kernel, mỗi khi một con của PID 1 chết']
      ] },

    { t: 'cal', kind: 'tip', title: 'poweroff không tắt máy — init mới tắt',
      x: 'Lệnh <code>poweroff</code> của BusyBox chỉ làm đúng một việc: <code>kill(1, SIGUSR2)</code>. ' +
         'Mọi thứ bạn thấy in ra sau đó — <code>The system is going down NOW!</code>, ' +
         '<code>Sent SIGTERM to all processes</code>, <code>reboot: Power down</code> — là PID 1 ' +
         'đang làm việc. Vì vậy <code>kill -USR2 1</code> tắt máy y hệt <code>poweroff</code>, và ' +
         'bước 3 phần Thực hành sẽ dùng chính lệnh đó. Muốn kiểm tra bảng tín hiệu của một bản ' +
         'BusyBox cụ thể, đừng học thuộc — đọc <code>init/halt.c</code> và phần ' +
         '<code>check_delayed_sigs()</code> của <code>init/init.c</code>.' },

    /* ============================================================
       3. BA THẾ HỆ INIT
       ============================================================ */
    { t: 'h2', x: 'Ba thế hệ init: BusyBox, SysV, systemd' },

    { t: 'p', x:
      'Hai nhiệm vụ kia là mức tối thiểu. Trên đó, mỗi thế hệ init trả lời thêm một câu hỏi: ' +
      '<b>làm sao khởi động và trông chừng hàng chục dịch vụ?</b> Ba câu trả lời khác nhau rất ' +
      'xa, và cả ba đều đang chạy trên thiết bị thật hôm nay.' },

    { t: 'h3', x: 'BusyBox init: một bảng, không có khái niệm \"dịch vụ\"' },

    { t: 'p', x:
      'Bạn đã dùng nó từ Bài 47. Mọi thứ nằm trong <code>/etc/inittab</code>: một dòng ' +
      '<code>sysinit</code> chạy <code>rcS</code> một lần, các dòng <code>respawn</code> được hồi ' +
      'sinh mỗi khi chết. Không có thứ tự phụ thuộc, không có trạng thái \"dịch vụ X đang chạy\", ' +
      'không có log riêng. Đổi lại, nó nằm sẵn trong binary BusyBox bạn đã có — cả ' +
      '<b>2 094 192</b> byte của <code>~/bai47/rootfs/bin/busybox</code> chứa init <b>và</b> 407 ' +
      'lệnh khác.' },

    { t: 'h3', x: 'SysV init: thư mục script và runlevel' },

    { t: 'p', x:
      'Từ thập niên 1980 tới khoảng 2015, hầu hết Linux dùng mô hình của UNIX System V. Ý tưởng: ' +
      'mỗi dịch vụ là <b>một script shell</b> trong <code>/etc/init.d/</code> nhận tham số ' +
      '<code>start</code> / <code>stop</code>. Thứ tự khởi động được mã hoá vào <b>tên file</b>: ' +
      'một thư mục <code>/etc/rcN.d/</code> cho mỗi <i>runlevel</i> N, chứa các symlink tên ' +
      '<code>S</code> + hai chữ số + tên dịch vụ (start) hoặc <code>K</code> + hai chữ số (kill). ' +
      'Shell mở rộng <code>S??*</code> theo thứ tự chữ cái, nên <code>S10network</code> luôn chạy ' +
      'trước <code>S50temp_daemon</code> — toàn bộ \"hệ thống phụ thuộc\" chỉ có vậy.' },

    { t: 'p', x:
      'Máy WSL của bạn vẫn còn dấu vết của mô hình này, dù PID 1 của nó là systemd. Nhìn thẳng vào ' +
      'nó:' },

    { t: 'code', where: 'wsl', code:
      'ls -l /etc/rc2.d | tail -n +2 | awk \'{print $9, $10, $11}\'\n' +
      'runlevel' },

    { t: 'code', where: 'out', nocopy: true, code:
      'K01cntlm -> ../init.d/cntlm\n' +
      'S01apport -> ../init.d/apport\n' +
      'S01console-setup.sh -> ../init.d/console-setup.sh\n' +
      'S01cron -> ../init.d/cron\n' +
      'S01dbus -> ../init.d/dbus\n' +
      'S01rsyslog -> ../init.d/rsyslog\n' +
      'S01xrdp -> ../init.d/xrdp\n' +
      'N 5',
      notes: [
        'Danh sách dịch vụ phụ thuộc vào những gì đã cài trên máy bạn — một Ubuntu 20.04 khác sẽ có tên khác. <code>K01cntlm</code> ở đây là một proxy đã bị tắt trên máy viết bài.'
      ] },

    { t: 'p', x:
      'Mỗi dòng là một symlink từ <code>rc2.d</code> trỏ về script thật trong <code>init.d</code> — ' +
      'đúng cơ chế vừa mô tả: <code>S</code> = chạy với <code>start</code>, <code>K</code> = chạy ' +
      'với <code>stop</code>, <code>01</code> = thứ tự. <code>runlevel</code> in <code>N 5</code>: ' +
      '\"không có runlevel trước đó (N), runlevel hiện tại là 5\". Trên SysV, runlevel 5 nghĩa là ' +
      '\"nhiều người dùng, có giao diện đồ hoạ\", 3 là \"nhiều người dùng, không đồ hoạ\", 1 là ' +
      '\"một người dùng\" để sửa chữa, 0 và 6 là tắt và khởi động lại. Trên máy này, systemd chỉ ' +
      '<b>giả lập</b> câu trả lời đó cho các script cũ.' },

    { t: 'cal', kind: 'info', title: 'Điểm yếu của SysV mà bước 5 sẽ cho bạn thấy',
      x: 'Script <code>start</code> khởi động daemon rồi <b>thoát</b>. Từ giây đó, không còn ai ' +
         'trông chừng daemon: nó thành con của PID 1, và nếu nó chết, PID 1 chỉ gặt xác. Script chỉ ' +
         'để lại một <b>pidfile</b> (<code>/var/run/tên.pid</code>) ghi số PID lúc khởi động — một ' +
         'con số có thể đã cũ. Toàn bộ systemd, về cơ bản, là câu trả lời cho điểm yếu này.' },

    { t: 'h3', x: 'systemd: unit, phụ thuộc, cgroup, journal' },

    { t: 'p', x:
      'systemd (2010) thay script bằng file khai báo gọi là <b>unit</b>. Một unit dịch vụ nói ' +
      '\"chạy lệnh này, khởi động lại khi nó chết, sau unit kia\" — không nói <i>làm thế nào</i>. ' +
      'systemd tự làm phần \"làm thế nào\", và vì daemon là <b>con trực tiếp</b> của nó chứ không ' +
      'phải con của một script đã thoát, nó biết ngay khi daemon chết. Đây là một unit thật trên ' +
      'máy bạn:' },

    { t: 'code', where: 'wsl', code:
      'systemctl cat cron.service' },

    { t: 'code', where: 'out', nocopy: true, code:
      '# /lib/systemd/system/cron.service\n' +
      '[Unit]\n' +
      'Description=Regular background program processing daemon\n' +
      'Documentation=man:cron(8)\n' +
      'After=remote-fs.target nss-user-lookup.target\n' +
      '\n' +
      '[Service]\n' +
      'EnvironmentFile=-/etc/default/cron\n' +
      'ExecStart=/usr/sbin/cron -f $EXTRA_OPTS\n' +
      'IgnoreSIGPIPE=false\n' +
      'KillMode=process\n' +
      'Restart=on-failure\n' +
      '\n' +
      '[Install]\n' +
      'WantedBy=multi-user.target' },

    { t: 'p', x:
      'So với script SysV cùng tên (<code>/etc/init.d/cron</code>, vẫn còn trên máy bạn), file này ' +
      'không có <code>case</code>, không có pidfile, không có <code>start-stop-daemon</code>. Ba ' +
      'dòng làm phần lớn công việc: <code>ExecStart</code> (chạy gì — chú ý cờ <code>-f</code>, ' +
      '<i>foreground</i>: daemon <b>không</b> tự tách nền, vì systemd muốn nó là con trực tiếp), ' +
      '<code>Restart=on-failure</code> (chết bất thường thì chạy lại), và ' +
      '<code>WantedBy=multi-user.target</code> (bật lên thì chạy khi hệ thống tới ' +
      '<code>multi-user.target</code>).' },

    { t: 'terms', items: [
      ['Unit', '', 'Một file khai báo một đối tượng systemd quản lý. Phần mở rộng cho biết loại: <code>.service</code> (tiến trình), <code>.target</code> (nhóm unit), <code>.socket</code>, <code>.mount</code>, <code>.timer</code>… Máy WSL của bạn có <b>124</b> unit <code>.service</code>.'],
      ['Target', '', 'Unit không chạy gì, chỉ là một điểm hẹn: \"mọi unit muốn có mặt ở đây\". Thay cho runlevel — <code>/lib/systemd/system/runlevel5.target</code> là symlink tới <code>graphical.target</code>, <code>runlevel3.target</code> tới <code>multi-user.target</code>.'],
      ['<code>WantedBy=</code> / <code>enable</code>', '', '<code>systemctl enable X</code> tạo một symlink tới X trong thư mục <code>&lt;target&gt;.wants/</code>. Tức là \"tự chạy khi boot\" vẫn là symlink — như SysV — chỉ là symlink mang nghĩa phụ thuộc chứ không mang số thứ tự.'],
      ['cgroup', 'control group', 'Nhóm tiến trình do kernel theo dõi. Mỗi service một cgroup, nên mọi tiến trình con cháu của daemon — kể cả con đã tự <code>fork</code> hai lần để \"tách nền\" — vẫn bị systemd tìm thấy và dừng. Pidfile không làm được việc này.'],
      ['Journal', '', 'Kho log nhị phân của systemd. Mọi thứ daemon in ra <code>stdout</code>/<code>stderr</code> được thu lại, gắn tên unit và PID; đọc bằng <code>journalctl -u tên</code>. Daemon không cần biết gì về syslog.']
    ] },

    { t: 'p', x:
      'Máy WSL này boot bằng systemd, và bạn có thể xem nó đã làm gì:' },

    { t: 'code', where: 'wsl', code:
      'ps -p 1 -o pid,comm\n' +
      'ls -l /sbin/init\n' +
      'systemctl get-default\n' +
      'systemd-analyze' },

    { t: 'code', where: 'out', nocopy: true, code:
      '    PID COMMAND\n' +
      '      1 systemd\n' +
      'lrwxrwxrwx 1 root root 20 Nov 22  2023 /sbin/init -> /lib/systemd/systemd\n' +
      'graphical.target\n' +
      'Startup finished in 1.315s (userspace) \n' +
      'graphical.target reached after 1.309s in userspace',
      notes: [
        'Thời gian khởi động và ngày của symlink khác trên máy bạn. Trên machine B, <code>ps</code> còn in thêm một dòng <code>your 131072x1 screen size is bogus. expect trouble</code> trước kết quả khi chạy qua một script không có terminal — đó là <code>ps</code> phàn nàn về kích thước cửa sổ, không liên quan tới bài.',
        'Nếu <code>ps -p 1</code> của bạn in <code>init</code> thay vì <code>systemd</code>, WSL của bạn chưa bật systemd (thiếu <code>[boot] systemd=true</code> trong <code>/etc/wsl.conf</code>). Bước 6 cần systemd; hãy bật nó và chạy <code>wsl --shutdown</code> từ PowerShell trước khi làm bước đó.'
      ] },

    { t: 'p', x:
      '<code>/sbin/init</code> — đường dẫn kernel thử đầu tiên theo Bài 41 — chỉ là symlink tới ' +
      '<code>/lib/systemd/systemd</code>. Kernel không biết và không quan tâm PID 1 là BusyBox hay ' +
      'systemd; nó chỉ <code>exec</code> file đó. <code>graphical.target</code> là \"runlevel 5\" của ' +
      'systemd, và toàn bộ userspace của máy tới được đó trong <b>1,3 giây</b>.' },

    /* ============================================================
       4. CHỌN INIT CHO THIẾT BỊ NHÚNG
       ============================================================ */
    { t: 'h2', x: 'Chọn init nào cho thiết bị nhúng' },

    { t: 'fig',
      cap: 'Cùng một daemon, ba cách khởi động. Điểm khác quyết định nằm ở mũi tên cuối: với ' +
           'BusyBox <code>respawn</code> và systemd, daemon là <b>con trực tiếp</b> của trình ' +
           'quản lý, nên cái chết của nó đánh thức trình quản lý qua <code>SIGCHLD</code>. Với ' +
           'SysV, script cha đã thoát, daemon bị giao cho PID 1 như một đứa mồ côi — PID 1 gặt nó ' +
           'nhưng không biết phải chạy lại.',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="So sánh ba cách khởi động daemon: BusyBox respawn, SysV script với start-stop-daemon, systemd unit; chỉ respawn và systemd giữ daemon là con trực tiếp">' +
        '<rect class="d-box-g" x="20" y="16" width="210" height="56" rx="6"/>' +
        '<text class="d-t" x="125" y="40" text-anchor="middle">BusyBox init</text>' +
        '<text class="d-tm" x="125" y="60" text-anchor="middle">::respawn:</text>' +
        '<rect class="d-box-w" x="255" y="16" width="210" height="56" rx="6"/>' +
        '<text class="d-t" x="360" y="40" text-anchor="middle">BusyBox init</text>' +
        '<text class="d-tm" x="360" y="60" text-anchor="middle">::sysinit: rcS</text>' +
        '<rect class="d-box-g" x="490" y="16" width="210" height="56" rx="6"/>' +
        '<text class="d-t" x="595" y="40" text-anchor="middle">systemd</text>' +
        '<text class="d-tm" x="595" y="60" text-anchor="middle">Restart=always</text>' +
        '<line class="d-line" x1="125" y1="72" x2="125" y2="192"/>' +
        '<path class="d-arrow" d="M 125 200 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="135" y="136">fork + exec</text>' +
        '<line class="d-line" x1="360" y1="72" x2="360" y2="94"/>' +
        '<path class="d-arrow" d="M 360 102 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box" x="275" y="102" width="170" height="68" rx="6"/>' +
        '<text class="d-tm" x="360" y="124" text-anchor="middle">S50temp_daemon start</text>' +
        '<text class="d-tm" x="360" y="142" text-anchor="middle">start-stop-daemon -b</text>' +
        '<text class="d-ts" x="360" y="160" text-anchor="middle">ghi pidfile rồi THOÁT</text>' +
        '<line class="d-line" x1="360" y1="170" x2="360" y2="192"/>' +
        '<path class="d-arrow" d="M 360 200 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="595" y1="72" x2="595" y2="192"/>' +
        '<path class="d-arrow" d="M 595 200 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="605" y="136">fork + exec</text>' +
        '<rect class="d-box-p" x="20" y="200" width="210" height="72" rx="6"/>' +
        '<text class="d-t" x="125" y="224" text-anchor="middle">temp_daemon</text>' +
        '<text class="d-ts" x="125" y="244" text-anchor="middle">cha = init</text>' +
        '<text class="d-ts" x="125" y="262" text-anchor="middle">kill -9 → chạy lại sau ≤ 1 s</text>' +
        '<rect class="d-box-p" x="255" y="200" width="210" height="72" rx="6"/>' +
        '<text class="d-t" x="360" y="224" text-anchor="middle">temp_daemon</text>' +
        '<text class="d-ts" x="360" y="244" text-anchor="middle">cha = init (mồ côi)</text>' +
        '<text class="d-ts" x="360" y="262" text-anchor="middle">kill -9 → chết hẳn</text>' +
        '<rect class="d-box-p" x="490" y="200" width="210" height="72" rx="6"/>' +
        '<text class="d-t" x="595" y="224" text-anchor="middle">temp_daemon</text>' +
        '<text class="d-ts" x="595" y="244" text-anchor="middle">cha = systemd, trong cgroup</text>' +
        '<text class="d-ts" x="595" y="262" text-anchor="middle">kill -9 → chạy lại + ghi log</text>' +
        '</svg>' },

    { t: 'table',
      head: ['', 'BusyBox init', 'SysV init (sysvinit)', 'systemd'],
      rows: [
        ['Kích thước', 'Nằm trong binary BusyBox — <b>2 094 192</b> B cho init và 407 lệnh khác', 'Vài chục KB cho <code>init</code>, cộng script shell (cần một shell)', '<code>systemd</code> <b>1 624 320</b> B + <code>libsystemd-shared-245.so</code> <b>2 462 664</b> B + 33 thư viện động khác (số đo trên Ubuntu 20.04, x86-64)'],
        ['Cấu hình', 'Một file <code>/etc/inittab</code>', 'Script trong <code>/etc/init.d</code> + symlink <code>rcN.d</code>', 'File unit khai báo'],
        ['Thứ tự khởi động', 'Thứ tự dòng trong file', 'Số trong tên file (<code>S10</code> trước <code>S50</code>)', 'Đồ thị phụ thuộc (<code>After=</code>, <code>Wants=</code>), chạy song song'],
        ['Daemon chết', '<code>respawn</code>: chạy lại, tối đa 1 lần/giây, không giới hạn số lần', 'Không ai biết', '<code>Restart=</code>: chạy lại; quá 5 lần trong 10 s thì dừng hẳn và báo lỗi'],
        ['Log', 'Không có; stdout đổ ra console', 'Mỗi daemon tự lo (syslog)', 'Journal thu mọi stdout/stderr'],
        ['Kernel cần gì', 'Gần như không gì', 'Gần như không gì', '<code>CGROUPS</code>, <code>INOTIFY_USER</code>, <code>SIGNALFD</code>, <code>TIMERFD</code>, <code>EPOLL</code>, <code>FHANDLE</code>, <code>DEVTMPFS</code>… (defconfig ARM64 của bạn có đủ)'],
        ['C library', 'glibc, musl, uClibc-ng', 'glibc, musl', '<b>glibc</b> (musl chỉ được hỗ trợ gần đây và có giới hạn)'],
        ['Dùng ở đâu', 'Router, camera IP, initramfs, bo mạch vài MB flash', 'Distro cũ, hệ thống kế thừa', 'Distro desktop/server; thiết bị nhúng lớn (xe hơi, TV, gateway) có RAM tính bằng trăm MB']
      ] },

    { t: 'p', x:
      'Hàng \"Kích thước\" không so sánh công bằng từng byte — systemd trên máy bạn là bản x86-64 ' +
      'build cho desktop, bản cho ARM64 do Buildroot hay Yocto dựng sẽ nhỏ hơn — nhưng bậc độ lớn ' +
      'thì đúng: BusyBox init là một phần nhỏ của một binary 2 MB bạn vốn đã cần, còn systemd kéo ' +
      'theo hơn 4 MB chỉ riêng file chính và thư viện lõi, chưa kể 33 thư viện động khác nó liên kết tới.' },

    { t: 'cal', kind: 'tip', title: 'Quy tắc chọn, rút gọn thành ba câu hỏi',
      x: '<ol>' +
         '<li><b>Flash và RAM tính bằng MB hay trăm MB?</b> Vài MB flash, vài chục MB RAM → BusyBox ' +
         'init. Hệ thống của bạn ở cuối bài này boot tới shell trong <b>0,76–0,83 s</b> tính từ ' +
         'lúc bật kernel, chạy <code>rcS</code> xong và daemon đã nghe cổng.</li>' +
         '<li><b>Có bao nhiêu dịch vụ, và chúng phụ thuộc nhau ra sao?</b> Một hai daemon → ' +
         '<code>respawn</code> là đủ. Hàng chục dịch vụ với mạng, D-Bus, cập nhật OTA → systemd ' +
         'tiết kiệm hàng nghìn dòng script.</li>' +
         '<li><b>Cần biết chính xác vì sao một dịch vụ chết, lúc nào, bao nhiêu lần?</b> Có → ' +
         'systemd (journal + <code>NRestarts</code>). Không, hoặc có watchdog phần cứng lo phần đó ' +
         '→ BusyBox init.</li>' +
         '</ol>' +
         'SysV hiếm khi là câu trả lời cho thiết bị mới: nó tốn công viết script như systemd mà ' +
         'không có khả năng giám sát. Bạn vẫn cần đọc được nó, vì rất nhiều hệ thống kế thừa và ' +
         'chính Buildroot dùng kiểu <code>/etc/init.d/S??*</code> mặc định (Chặng 11).' },

    /* ============================================================
       5. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: PID 1 dưới kính hiển vi, rồi giữ temp_daemon sống ba cách' },

    { t: 'p', x:
      'Bạn sẽ làm việc trong <code>~/bai49</code>, trên một bản sao của rootfs Bài 47 — bản gốc ' +
      'trong <code>~/bai47</code> không bị đụng tới. Năm bước đầu chạy trong QEMU; bước 6 chạy ' +
      'systemd trên chính WSL của bạn, vì dựng systemd vào một rootfs nhúng cần glibc động và hàng ' +
      'chục thư viện — việc của Buildroot/Yocto ở Chặng 11, không phải việc chép tay.' },

    { t: 'cal', kind: 'info', title: 'Cách gõ lệnh trong QEMU ở bài này',
      x: 'Các khối có nhãn <b>QEMU</b> được gõ tại dấu nhắc <code>~ #</code> của shell bên trong máy ' +
         'ảo, sau khi <code>./run.sh</code> đã boot xong. Khi bài in lại kết quả, dòng lệnh dài có ' +
         'thể bị console QEMU ngắt xuống dòng ở cột 80 — đó là terminal 80 cột của máy ảo, không ' +
         'phải lỗi. Thoát QEMU bằng <code>poweroff</code>, hoặc <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi ' +
         '<kbd>X</kbd> nếu máy ảo treo.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Chuẩn bị: rootfs mới và temp_daemon cho ARM64',
        blocks: [
          { t: 'p', x:
            'Chép rootfs và hai script <code>run.sh</code> / <code>mkimg.sh</code> từ Bài 47. Nếu ' +
            'bạn đã xoá <code>~/bai47</code>, hãy làm lại bước 4–5 của Bài 47 trước.' },

          { t: 'code', where: 'wsl', code:
            'mkdir ~/bai49 && cd ~/bai49\n' +
            'cp -a ~/bai47/rootfs rootfs\n' +
            'cp ~/bai47/run.sh ~/bai47/mkimg.sh .\n' +
            'cat run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#!/bin/sh\n' +
            '# Boot rootfs.img under QEMU; any arguments are appended to the kernel command line.\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -drive file=rootfs.img,format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda $*"' },

          { t: 'p', x:
            '<code>run.sh</code> vẫn là script Bài 46 viết: boot <code>rootfs.img</code> qua ' +
            '<code>root=/dev/vda</code>, và mọi tham số bạn đưa thêm được nối vào dòng lệnh kernel ' +
            '(<code>$*</code>). Bước 3 sẽ dùng đúng cơ chế đó để truyền <code>init=</code>.' },

          { t: 'p', x:
            'Giờ đến <code>temp_daemon.c</code> — chương trình 152 dòng bạn viết ở cuối Bài 24, ' +
            'không sửa một dòng. Chép nó vào <code>~/bai49</code> (từ <code>~/embedded/bai24</code> ' +
            'nếu còn, hoặc gõ lại từ hai khối mã <code>temp_daemon.c</code> của Bài 24), rồi dịch ' +
            '<b>tĩnh</b> cho ARM64:' },

          { t: 'code', where: 'wsl', code:
            'cp ~/embedded/bai24/temp_daemon.c .\n' +
            'wc -l temp_daemon.c\n' +
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -static -pthread -o temp_daemon temp_daemon.c\n' +
            'aarch64-linux-gnu-strip -o rootfs/usr/bin/temp_daemon temp_daemon\n' +
            'ls -l temp_daemon rootfs/usr/bin/temp_daemon\n' +
            'file rootfs/usr/bin/temp_daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            '152 temp_daemon.c\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 1173896 Sep 29 13:31 temp_daemon\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  573960 Sep 29 13:31 rootfs/usr/bin/temp_daemon\n' +
            'rootfs/usr/bin/temp_daemon: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=08a5d14bc2943aefb3394da4b2449708d702e1b0, for GNU/Linux 3.7.0, stripped' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-strip -o rootfs/usr/bin/temp_daemon temp_daemon',
            title: 'Dịch tĩnh rồi strip thẳng vào rootfs',
            rows: [
              ['<code>-static</code>', 'Liên kết glibc vào trong binary.', 'Rootfs Bài 47 là BusyBox tĩnh, <b>không có</b> <code>/lib/ld-linux-aarch64.so.1</code>. Bản động sẽ báo <code>not found</code> dù file nằm đó — Bài 46 đã gặp đúng lỗi này.'],
              ['<code>-pthread</code>', 'Bật thư viện luồng.', '<code>temp_daemon</code> có luồng cảm biến (Bài 22).'],
              ['<code>strip -o ĐÍCH NGUỒN</code>', 'Ghi bản đã bỏ bảng ký hiệu vào <code>ĐÍCH</code>, giữ nguyên <code>NGUỒN</code>.', 'Bản trong <code>~/bai49</code> còn debug info để gỡ lỗi; bản trong rootfs nhỏ hơn một nửa. Phải dùng <code>strip</code> có tiền tố — Bài 26.']
            ]},

          { t: 'p', x:
            '<code>-Wall -Wextra</code> không in cảnh báo nào, như ở Bài 27. <code>file</code> xác ' +
            'nhận ba điều bạn cần: <code>ARM aarch64</code>, <code>statically linked</code>, ' +
            '<code>stripped</code>. Strip giảm từ <b>1 173 896</b> xuống <b>573 960</b> byte — mất ' +
            '51 %, phần lớn là debug info của glibc tĩnh. BuildID sẽ khác trên máy bạn.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Nhìn ba luật của kernel trên PID 1 thật',
        blocks: [
          { t: 'p', x:
            'Boot rootfs chưa sửa gì — vẫn là BusyBox init với <code>inittab</code> của Bài 47:' },

          { t: 'code', where: 'wsl', code:
            './mkimg.sh && ./run.sh' },

          { t: 'p', x:
            'Khi thấy <code>rcS: done</code> và dấu nhắc <code>~ #</code>, xem ai đang chạy. ' +
            '<code>awk \'$2 != 2\'</code> bỏ qua các luồng kernel (cha của chúng là PID 2, ' +
            '<code>kthreadd</code>):' },

          { t: 'code', where: 'qemu', code:
            'ps -o pid,ppid,stat,comm | awk \'$2 != 2\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'PID   PPID  STAT COMMAND\n' +
            '    1     0 S    init\n' +
            '    2     0 SW   kthreadd\n' +
            '   60     1 S    sh\n' +
            '   61    60 R    ps\n' +
            '   62    60 S    awk' },

          { t: 'p', x:
            'Chỉ có <b>hai</b> tiến trình có cha là 0: <code>init</code> (PID 1) và ' +
            '<code>kthreadd</code> (PID 2) — cả hai do kernel tự tạo. Shell 60 là con của init, ' +
            'nhờ dòng <code>ttyAMA0::respawn:-/bin/sh</code>. Số 60–62 phụ thuộc thứ tự khởi tạo và ' +
            'có thể lệch vài đơn vị trên máy bạn.' },

          { t: 'p', x:
            'Luật 2 nói PID 1 chỉ nhận tín hiệu nó đã tuyên bố muốn nhận. <code>/proc/1/status</code> ' +
            'cho bạn đọc thẳng lời tuyên bố đó:' },

          { t: 'code', where: 'qemu', code:
            'grep -E \'^(PPid|SigBlk|SigIgn|SigCgt)\' /proc/1/status' },

          { t: 'code', where: 'out', nocopy: true, code:
            'PPid:\t0\n' +
            'SigBlk:\t0000000000000000\n' +
            'SigIgn:\t0000000000000000\n' +
            'SigCgt:\t0000000000080000' },

          { t: 'cal', kind: 'info', title: 'Đọc ba mặt nạ tín hiệu',
            x: '<p>Mỗi mặt nạ là 64 bit, bit <i>n</i> ứng với tín hiệu <i>n</i>+1 — cách đọc Bài 21 ' +
               'đã dạy. <code>SigCgt</code> (<i>caught</i> — có handler) = <code>0x80000</code> = bit ' +
               '19 = tín hiệu <b>20</b>, <code>SIGTSTP</code>: đúng handler \"tạm dừng respawn\" ' +
               'BusyBox cài ở <code>init.c:1173</code>. Không có handler nào cho ' +
               '<code>SIGTERM</code> hay <code>SIGUSR2</code>.</p>' +
               '<p>Nhưng <code>SigBlk</code> = 0 — trong khi mã nguồn nói init chặn 8 tín hiệu. Lý do: ' +
               'lúc bạn đọc, init đang ngủ trong <code>sigtimedwait()</code>, và hàm đó tạm ' +
               '<b>bỏ chặn</b> đúng những tín hiệu nó chờ, cất mặt nạ cũ vào ' +
               '<code>real_blocked</code> (<code>kernel/signal.c:3785–3786</code>). <code>/proc</code> ' +
               'chỉ in <code>blocked</code>. Đây là lý do <code>sig_ignored()</code> kiểm tra ' +
               '<b>cả hai</b> trường — nếu không, tín hiệu gửi tới một init đang ngủ sẽ bị vứt.</p>' },

          { t: 'p', x:
            'Giờ thử giết PID 1. Trên máy thật đây là lệnh không bao giờ nên gõ; trong QEMU, tệ ' +
            'nhất bạn chỉ phải boot lại:' },

          { t: 'code', where: 'qemu', code:
            'kill -9 1; echo "rc=$?"\n' +
            'kill -STOP 1; echo "rc=$?"; grep State /proc/1/status' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            'rc=0\n' +
            'State:\tS (sleeping)' },

          { t: 'cal', kind: 'why', title: 'rc=0 và không có gì xảy ra — đó là luật 2',
            x: 'Cả hai <code>kill</code> đều <b>thành công</b> theo nghĩa syscall: bạn là root, PID 1 ' +
               'tồn tại, <code>kill()</code> trả về 0. Nhưng <code>sig_task_ignored()</code> vứt ' +
               '<code>SIGKILL</code> và <code>SIGSTOP</code> ngay tại dòng 91 vì đích là ' +
               '<code>is_global_init</code>. Không panic, không dừng: <code>State: S (sleeping)</code> ' +
               '— init vẫn ngủ trong <code>sigtimedwait()</code>, chứ không phải <code>T (stopped)</code>. ' +
               'Kernel không báo lỗi cho bên gửi; bạn chỉ biết tín hiệu bị bỏ khi kiểm tra kết quả.' },

          { t: 'p', x:
            'Luật 3: tạo một đứa mồ côi. <code>sh -c \'sleep 3 &amp; …\'</code> chạy một shell con, ' +
            'shell con đó đẩy <code>sleep 3</code> xuống nền rồi thoát ngay — <code>sleep</code> mất ' +
            'cha khi mới được vài mili giây:' },

          { t: 'code', where: 'qemu', code:
            'sh -c \'sleep 3 & echo "orphan pid $!"\'; ps -o pid,ppid,stat,comm | grep -E \'PID|sleep\'\n' +
            'sleep 4; ps -o pid,ppid,stat,comm | grep -E \'PID|sleep\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'orphan pid 66\n' +
            'PID   PPID  STAT COMMAND\n' +
            '   66     1 S    sleep\n' +
            'PID   PPID  STAT COMMAND' },

          { t: 'p', x:
            'Lần <code>ps</code> đầu: <code>sleep</code> 66 có <code>PPID 1</code>, không phải PID ' +
            'của shell <code>sh -c</code> (đã chết) — kernel đã giao nó cho init qua ' +
            '<code>find_new_reaper()</code>. Rootfs này không có subreaper nào, nên đi thẳng tới PID ' +
            '1. Bốn giây sau, <code>ps</code> chỉ còn dòng tiêu đề: <code>sleep</code> đã hết 3 giây, ' +
            'chết, và <b>không để lại zombie</b> — BusyBox init đã thức dậy vì <code>SIGCHLD</code> ' +
            'và gặt nó. Nhiệm vụ (a) được làm đúng.' },

          { t: 'code', where: 'qemu', code:
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            'umount: devtmpfs busy - remounted read-only\n' +
            '[   15.925286] EXT4-fs (vda): re-mounted 3b899cd3-5f6e-4d9e-b52b-73b89978b524 ro.\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            '[   17.933153] Flash device refused suspend due to active operation (state 20)\n' +
            '[   17.933543] Flash device refused suspend due to active operation (state 20)\n' +
            '[   17.934408] reboot: Power down',
            notes: [
              'UUID của ext4 và các mốc thời gian khác mỗi lần tạo ảnh và mỗi lần boot. Hai dòng <code>Flash device refused suspend</code> xuất hiện ở mọi lần tắt QEMU <code>virt</code> từ Bài 41 — vô hại.'
            ] },

          { t: 'p', x:
            'Và nhiệm vụ (b): <code>poweroff</code> gửi <code>SIGUSR2</code>, init chạy dòng ' +
            '<code>::shutdown:/bin/umount -a -r</code> (hai dòng đầu), in <code>The system is going ' +
            'down NOW!</code>, gửi <code>SIGTERM</code> cho mọi tiến trình, rồi mới gọi syscall ' +
            '<code>reboot()</code> → <code>reboot: Power down</code>. Mọi dòng từ ' +
            '<code>umount</code> trở đi là PID 1 làm việc.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Viết một PID 1 lười và xem hệ thống hỏng dần',
        blocks: [
          { t: 'p', x:
            'Bước 2 cho thấy BusyBox init làm đúng hai nhiệm vụ. Cách tốt nhất để hiểu vì sao hai ' +
            'nhiệm vụ đó quan trọng là bỏ chúng đi. Chương trình dưới đây chạy một shell rồi ngủ ' +
            'mãi: không <code>wait()</code>, không handler, không chặn tín hiệu nào. Nó <b>không</b> ' +
            'thoát, nên kernel không panic — nó chỉ \"không làm gì\":' },

          { t: 'code', where: 'file', name: '~/bai49/noreap_init.c', lang: 'c', code:
            '/* noreap_init.c - a deliberately incomplete PID 1: starts a shell, never reaps, handles no signals */\n' +
            '#include <stdio.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("noreap_init: running as PID %d\\n", getpid());\n' +
            '    fflush(stdout);\n' +
            '\n' +
            '    pid_t pid = fork();\n' +
            '    if (pid == 0) {\n' +
            '        execl("/bin/sh", "-sh", (char *)NULL);\n' +
            '        perror("execl /bin/sh");\n' +
            '        _exit(127);\n' +
            '    }\n' +
            '    printf("noreap_init: started shell as PID %d, now sleeping forever\\n", pid);\n' +
            '    fflush(stdout);\n' +
            '\n' +
            '    for (;;)\n' +
            '        pause();          /* no wait(), no signal handler: two duties of PID 1 left undone */\n' +
            '}\n',
            notes: [
              'Tên <code>\"-sh\"</code> (có gạch đầu) làm shell tưởng nó là login shell — cùng quy ước với dấu <code>-</code> trong <code>inittab</code> của Bài 47.',
              '<code>pause()</code> ngủ tới khi có một tín hiệu <b>được giao</b>. Theo luật 2, không tín hiệu nào sẽ được giao, nên vòng lặp này ngủ thật sự mãi mãi.'
            ] },

          { t: 'p', x:
            'Dịch tĩnh thẳng vào <code>/sbin</code> của rootfs, rồi boot với <code>init=</code> để ' +
            'kernel chạy nó thay cho BusyBox init (Bài 41: <code>init=</code> chọn chương trình PID ' +
            '1 khi boot từ đĩa):' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -Wall -Wextra -O2 -static -o rootfs/sbin/noreap_init noreap_init.c\n' +
            './mkimg.sh && ./run.sh init=/sbin/noreap_init' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.702294] Run /sbin/noreap_init as init process\n' +
            'noreap_init: running as PID 1\n' +
            'noreap_init: started shell as PID 53, now sleeping forever\n' +
            '-sh: can\'t access tty; job control turned off\n' +
            '~ #' },

          { t: 'p', x:
            'Không có dòng <code>rcS:</code> nào — <code>rcS</code> là việc của BusyBox init, và giờ ' +
            'không ai chạy nó. Nên cũng không có <code>/proc</code>. Câu <code>can\'t access tty</code> ' +
            'là shell than không có terminal điều khiển; BusyBox init thường lo việc đó ' +
            '(<code>setsid</code> + mở tty), chương trình của bạn thì không. Gắn <code>/proc</code> ' +
            'bằng tay rồi nhìn:' },

          { t: 'code', where: 'qemu', code:
            'mount -t proc proc /proc\n' +
            'ps -o pid,ppid,stat,comm | awk \'$2 != 2\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'PID   PPID  STAT COMMAND\n' +
            '    1     0 S    noreap_init\n' +
            '    2     0 SW   kthreadd\n' +
            '   53     1 S    sh\n' +
            '   55    53 R    ps\n' +
            '   56    53 S    awk' },

          { t: 'p', x:
            'PID 1 giờ tên <code>noreap_init</code>. Kernel không phân biệt: nó vẫn gắn ' +
            '<code>SIGNAL_UNKILLABLE</code>, vẫn giao mồ côi cho PID 1. Giờ lặp lại thí nghiệm mồ ' +
            'côi của bước 2:' },

          { t: 'code', where: 'qemu', code:
            'sh -c \'sleep 1 & echo "child pid $!"\'; sleep 2; ps -o pid,ppid,stat,comm | grep -E \'PID|sleep\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'child pid 58\n' +
            'PID   PPID  STAT COMMAND\n' +
            '   58     1 Z    sleep' },

          { t: 'p', x:
            '<code>sleep 1</code> đã chạy xong từ một giây trước, nhưng vẫn còn trong bảng tiến trình ' +
            'với <code>STAT Z</code> — zombie. Cha của nó là PID 1, và PID 1 không bao giờ gọi ' +
            '<code>wait()</code>. Ở bước 2, cùng lệnh này để lại một bảng trống. Thêm năm con nữa:' },

          { t: 'code', where: 'qemu', code:
            'for i in 1 2 3 4 5; do sh -c \'sleep 1 &\'; done; sleep 2; ps -o stat | grep -c Z' },

          { t: 'code', where: 'out', nocopy: true, code:
            '6' },

          { t: 'p', x:
            '<b>Sáu</b> zombie: năm con mới cộng con từ lệnh trước. Con số chỉ tăng, không bao giờ ' +
            'giảm — mọi tiến trình mồ côi từ giờ tới lúc tắt máy sẽ nằm lại đây. Đây chính là kịch ' +
            'bản \"ba ngày rưỡi\" của Bài 20, nhưng lần này thủ phạm không phải một daemon quên ' +
            '<code>wait</code> mà chính PID 1 — thứ bạn không thể <code>kill</code> để chữa cháy.' },

          { t: 'p', x:
            'Nhiệm vụ (b). So <code>SigCgt</code> với bước 2, rồi thử cả ba cách tắt máy của ' +
            'BusyBox — <code>reboot</code> (<code>TERM</code>), Ctrl-Alt-Del (<code>INT</code>), ' +
            '<code>poweroff</code> (<code>USR2</code>):' },

          { t: 'code', where: 'qemu', code:
            'grep -E \'^(SigIgn|SigCgt)\' /proc/1/status\n' +
            'kill -TERM 1; kill -INT 1; kill -USR2 1; sleep 1; ps -o pid,stat,comm | grep -E "PID|noreap"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'SigIgn:\t0000000000000000\n' +
            'SigCgt:\t0000000000000000\n' +
            'PID   STAT COMMAND\n' +
            '    1 S    noreap_init' },

          { t: 'cal', kind: 'why', title: 'Ba tín hiệu biến mất không dấu vết',
            x: '<p><code>SigCgt</code> = 0: không một handler nào. Ba lệnh <code>kill</code> đều thành ' +
               'công, và <code>noreap_init</code> vẫn nằm đó ở trạng thái <code>S</code>. Trên một ' +
               'tiến trình bình thường, <code>SIGTERM</code> với <code>SIG_DFL</code> nghĩa là ' +
               '\"chết\"; trên PID 1, luật 2 biến nó thành \"không có gì\".</p>' +
               '<p>Hãy nghĩ tới thiết bị thật: nút nguồn không làm gì, lệnh <code>reboot</code> qua ' +
               'SSH không làm gì, hệ thống file không bao giờ được gỡ sạch trước khi mất điện. Đây ' +
               'là lỗi thường gặp nhất khi ai đó đặt một chương trình tự viết — hoặc một script shell ' +
               '— làm PID 1 trong initramfs hay container.</p>' },

          { t: 'p', x:
            'Lối thoát duy nhất còn lại là làm PID 1 chết — tức là panic. Gõ <code>exit</code> chỉ ' +
            'kết thúc shell 53, <code>noreap_init</code> vẫn ngủ, và console đứng im vì không còn ' +
            'ai mở shell mới. Tắt QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>, sau đó ' +
            'xoá chương trình khỏi rootfs để không nhầm ở các bước sau:' },

          { t: 'code', where: 'wsl', code:
            'rm rootfs/sbin/noreap_init' },

          { t: 'cal', kind: 'tip', title: 'Hai nhiệm vụ, hai triệu chứng — học thuộc cặp này',
            x: '<b>Zombie mang <code>PPID 1</code> tích dần → PID 1 không gặt.</b> ' +
               '<b><code>poweroff</code>/<code>reboot</code> không có tác dụng → PID 1 không nhận tín ' +
               'hiệu.</b> Khi gặp một trong hai trên thiết bị hay trong container, đừng tìm lỗi ở ' +
               'daemon; nhìn vào PID 1 trước, và đọc <code>SigCgt</code> / <code>SigBlk</code> của nó. ' +
               'Đó cũng là lý do Docker có cờ <code>--init</code>: nó chèn một init tí hon ' +
               '(<code>tini</code>) làm PID 1 chỉ để làm đúng hai việc này.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Giữ temp_daemon sống bằng respawn',
        blocks: [
          { t: 'p', x:
            'Quay lại BusyBox init. Cách đơn giản nhất để một daemon tự chạy khi boot và sống lại ' +
            'khi chết là cho nó một dòng <code>respawn</code> — cùng cơ chế giữ shell sống từ Bài ' +
            '47. Daemon nghe trên <code>127.0.0.1:9006</code>, nên rootfs cũng cần giao diện ' +
            '<i>loopback</i> <code>lo</code> được bật. Chưa ai bật nó: kernel tạo <code>lo</code> ' +
            'nhưng để ở trạng thái tắt. Thêm một dòng vào <code>rcS</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat > rootfs/etc/init.d/rcS << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Run once by init at boot, before any shell is started.\n' +
            'echo "rcS: mounting filesystems from /etc/fstab"\n' +
            'mount -a\n' +
            'mount -o remount,rw /\n' +
            'hostname -F /etc/hostname\n' +
            'ifconfig lo 127.0.0.1 up\n' +
            'echo "rcS: done at $(cut -d \' \' -f 1 /proc/uptime) s, hostname is $(hostname)"\n' +
            'EOF\n' +
            'cat > rootfs/etc/inittab << \'EOF\'\n' +
            '# /etc/inittab for BusyBox init.  Format: <tty>:<runlevels>:<action>:<process>\n' +
            '::sysinit:/etc/init.d/rcS\n' +
            '::respawn:/usr/bin/temp_daemon\n' +
            'ttyAMA0::respawn:-/bin/sh\n' +
            '::ctrlaltdel:/sbin/reboot\n' +
            '::shutdown:/bin/umount -a -r\n' +
            'EOF\n' +
            './mkimg.sh && ./run.sh' },

          { t: 'cmdx', cmd: '::respawn:/usr/bin/temp_daemon',
            title: 'Một dòng inittab thay cho một script khởi động',
            rows: [
              ['(trống)', 'Trường <code>tty</code> để trống: chạy với stdin/stdout/stderr là console mà init đang dùng.', 'Nhờ vậy các dòng <code>[daemon] …</code> in thẳng ra màn hình QEMU. Trên thiết bị thật, thường chuyển hướng sang một file log hoặc <code>logger</code>.'],
              ['<code>respawn</code>', 'Chạy khi init vào vòng lặp chính; khi tiến trình chết — vì bất kỳ lý do gì — chạy lại.', 'Không phân biệt chết do lỗi hay thoát êm: <code>exit 0</code> cũng bị hồi sinh. Tối đa một lần mỗi giây (<code>sleep1()</code>).'],
              ['<code>/usr/bin/temp_daemon</code>', 'Chạy <b>trực tiếp</b>, không qua shell, không <code>&amp;</code>.', '<b>Daemon phải chạy ở tiền cảnh.</b> Nếu nó tự <code>fork</code> rồi để cha thoát, init thấy \"tiến trình đã chết\" và chạy thêm một bản — mỗi giây một bản mới, tất cả tranh nhau cổng 9006. <code>temp_daemon</code> vốn chạy tiền cảnh nên không có vấn đề này.'],
              ['<code>ifconfig lo 127.0.0.1 up</code>', 'Gán địa chỉ và bật giao diện loopback.', 'Thiếu dòng này, daemon vẫn <code>bind</code> được vào <code>0.0.0.0</code>, nhưng <code>nc 127.0.0.1</code> không tới được nó — xem bảng Lỗi thường gặp.']
            ]},

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.658152] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            '[    0.755349] EXT4-fs (vda): re-mounted 4ac540fc-c1cd-465f-adb1-36ed0da7176f r/w.\n' +
            '[    0.755879] ext4 filesystem being remounted at / supports timestamps until 2038-01-19 (0x7fffffff)\n' +
            'rcS: done at 0.76 s, hostname is embedded\n' +
            '~ # [daemon] pid 61 — listening on port 9006, epoll fd 5, signalfd 3' },

          { t: 'p', x:
            '<code>rcS</code> xong ở <b>0,76 s</b>, rồi init chạy cả hai dòng <code>respawn</code> ' +
            'gần như cùng lúc — dấu nhắc <code>~ #</code> và dòng chào của daemon in chồng lên nhau. ' +
            'Đó là một hệ Linux ARM64 do bạn tự lắp, đã tự chạy daemon của bạn, trong chưa tới một ' +
            'giây kể từ khi kernel bắt đầu. Kiểm tra cây tiến trình và hỏi daemon một câu:' },

          { t: 'code', where: 'qemu', code:
            'ps -o pid,ppid,stat,comm | awk \'$2 != 2\'\n' +
            'echo GET | nc 127.0.0.1 9006' },

          { t: 'code', where: 'out', nocopy: true, code:
            'PID   PPID  STAT COMMAND\n' +
            '    1     0 S    init\n' +
            '    2     0 SW   kthreadd\n' +
            '   61     1 S    temp_daemon\n' +
            '   62     1 S    sh\n' +
            '   64    62 R    ps\n' +
            '   65    62 S    awk\n' +
            '[daemon] served request #1 on fd 6\n' +
            'temperature=43.0 samples=31' },

          { t: 'p', x:
            '<code>temp_daemon</code> (61) và shell (62) là hai anh em, cùng là con trực tiếp của ' +
            'init. <code>nc</code> của BusyBox không cần cờ <code>-q1</code> như bản OpenBSD ở Bài ' +
            '24: nó thoát khi phía bên kia đóng kết nối. <code>samples=31</code> nghĩa là luồng cảm ' +
            'biến đã lấy 31 mẫu, khoảng 6 giây với nhịp 200 ms — con số phụ thuộc bạn gõ nhanh hay ' +
            'chậm. Giờ giết daemon theo cách tàn nhẫn nhất:' },

          { t: 'code', where: 'qemu', code:
            'kill -9 $(pidof temp_daemon); sleep 2; pidof temp_daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[daemon] pid 70 — listening on port 9006, epoll fd 5, signalfd 3\n' +
            '70' },

          { t: 'p', x:
            '<code>SIGKILL</code> không cho daemon in lời trăn trối nào. Nhưng init nhận ' +
            '<code>SIGCHLD</code>, gặt PID 61, thấy nó thuộc một dòng <code>respawn</code>, và chạy ' +
            'lại — daemon mới mang PID <b>70</b>. Thử cách tắt êm:' },

          { t: 'code', where: 'qemu', code:
            'kill -TERM $(pidof temp_daemon); sleep 2; pidof temp_daemon\n' +
            'echo GET | nc 127.0.0.1 9006' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[daemon] signal 15 (Terminated) via signalfd — beginning graceful shutdown\n' +
            '[daemon] served 0 requests, closed every file descriptor cleanly, exiting 0\n' +
            '[daemon] pid 75 — listening on port 9006, epoll fd 5, signalfd 3\n' +
            '75\n' +
            'temperature=41.4 samples=15\n' +
            '[daemon] served request #1 on fd 6' },

          { t: 'cal', kind: 'warn', title: 'respawn không phân biệt \"chết\" với \"xong việc\"',
            x: '<code>SIGTERM</code> đi qua <code>signalfd</code> đúng như Bài 24 thiết kế, daemon ' +
               'đóng mọi fd và <code>exit 0</code> — một lần tắt hoàn hảo. Và init chạy lại nó ngay ' +
               '(PID <b>75</b>), vì <code>respawn</code> chỉ biết \"tiến trình đã biến mất\". ' +
               '<code>samples=15</code> (thay vì 31+) là bằng chứng đây là một bản mới, luồng cảm ' +
               'biến đếm lại từ 0. Muốn dừng hẳn một daemon dưới <code>respawn</code>, bạn phải sửa ' +
               '<code>inittab</code> — không có lệnh \"stop\".' },

          { t: 'p', x:
            'Vậy thử đúng cách đó: xoá dòng daemon khỏi <code>inittab</code>, gửi <code>SIGHUP</code> ' +
            'để init đọc lại:' },

          { t: 'code', where: 'qemu', code:
            'sed -i \'/temp_daemon/d\' /etc/inittab; kill -HUP 1; sleep 2; pidof temp_daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            '75' },

          { t: 'p', x:
            'Daemon <b>vẫn sống</b>, cùng PID 75. <code>SIGHUP</code> làm init quên dòng đó — lần sau ' +
            'daemon chết sẽ không ai chạy lại — nhưng không giết bản đang chạy. Giết nó khi đọc lại ' +
            '<code>inittab</code> là tuỳ chọn <code>CONFIG_FEATURE_KILL_REMOVED</code>, và ' +
            '<code>defconfig</code> của BusyBox để nó tắt (<code>.config:519</code>). Cuối cùng, tắt ' +
            'máy bằng đúng tín hiệu <code>poweroff</code> gửi đi:' },

          { t: 'code', where: 'qemu', code:
            'kill -USR2 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'umount: devtmpfs busy - remounted read-only\n' +
            '[   22.929871] EXT4-fs (vda): re-mounted 4ac540fc-c1cd-465f-adb1-36ed0da7176f ro.\n' +
            'The system is going down NOW!\n' +
            '[daemon] signal 15 (Terminated) via signalfd — beginning graceful shutdown\n' +
            'Sent SIGTERM to all processes\n' +
            '[daemon] served 1 requests, closed every file descriptor cleanly, exiting 0\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   24.944433] Flash device refused suspend due to active operation (state 20)\n' +
            '[   24.944988] Flash device refused suspend due to active operation (state 20)\n' +
            '[   24.946222] reboot: Power down' },

          { t: 'p', x:
            '<code>kill -USR2 1</code> cho đúng chuỗi của <code>poweroff</code>. Lần này có thêm hai ' +
            'dòng <code>[daemon]</code>: khi init gửi <code>SIGTERM</code> cho mọi tiến trình, ' +
            '<code>temp_daemon</code> nhận được và tắt êm — <code>served 1 requests</code> là yêu cầu ' +
            'bạn gửi tới PID 75. Giữa <code>SIGTERM</code> và <code>SIGKILL</code>, init chỉ chờ ' +
            '<b>một giây</b> (<code>kill(-1, SIGTERM)</code> → <code>sync()</code> → ' +
            '<code>sleep1()</code> → <code>kill(-1, SIGKILL)</code>, <code>init/init.c:768–774</code>). ' +
            'Daemon nào cần lâu hơn để ghi dữ liệu xuống flash sẽ bị giết giữa chừng — một lý do nữa ' +
            'để viết daemon tắt nhanh như của Bài 24.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Kiểu SysV: /etc/init.d, start-stop-daemon và pidfile',
        blocks: [
          { t: 'p', x:
            'Giờ dựng lại cùng hệ thống theo mô hình SysV — đúng kiểu Buildroot sinh ra mặc định. ' +
            '<code>inittab</code> không còn dòng daemon; thay vào đó <code>rcS</code> chạy mọi ' +
            'script <code>/etc/init.d/S??*</code> theo thứ tự tên với tham số <code>start</code>, và ' +
            'một script <code>rcK</code> mới chạy chúng theo thứ tự ngược với <code>stop</code> lúc ' +
            'tắt máy. Việc bật <code>lo</code> tách ra thành script riêng <code>S10network</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat > rootfs/etc/inittab << \'EOF\'\n' +
            '# /etc/inittab for BusyBox init.  Format: <tty>:<runlevels>:<action>:<process>\n' +
            '::sysinit:/etc/init.d/rcS\n' +
            'ttyAMA0::respawn:-/bin/sh\n' +
            '::ctrlaltdel:/sbin/reboot\n' +
            '::shutdown:/etc/init.d/rcK\n' +
            '::shutdown:/bin/umount -a -r\n' +
            'EOF\n' +
            'cat > rootfs/etc/init.d/rcS << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Run once by init at boot, before any shell is started.\n' +
            'echo "rcS: mounting filesystems from /etc/fstab"\n' +
            'mount -a\n' +
            'mount -o remount,rw /\n' +
            'hostname -F /etc/hostname\n' +
            '# SysV style: run every /etc/init.d/S??* script in name order with "start"\n' +
            'for s in /etc/init.d/S??*; do\n' +
            '    [ -x "$s" ] && "$s" start\n' +
            'done\n' +
            'echo "rcS: done at $(cut -d \' \' -f 1 /proc/uptime) s, hostname is $(hostname)"\n' +
            'EOF\n' +
            'cat > rootfs/etc/init.d/rcK << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Run by init at shutdown: every /etc/init.d/S??* script in reverse order with "stop"\n' +
            'for s in $(ls -r /etc/init.d/S??*); do\n' +
            '    [ -x "$s" ] && "$s" stop\n' +
            'done\n' +
            'EOF\n' +
            'cat > rootfs/etc/init.d/S10network << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Bring up the loopback interface so local clients can reach 127.0.0.1\n' +
            'case "$1" in\n' +
            '    start) echo "S10network: lo up";   ifconfig lo 127.0.0.1 up ;;\n' +
            '    stop)  echo "S10network: lo down"; ifconfig lo down ;;\n' +
            '    *)     echo "usage: $0 {start|stop}"; exit 1 ;;\n' +
            'esac\n' +
            'EOF' },

          { t: 'p', x:
            'Và script của daemon. Nó dùng <code>start-stop-daemon</code> — một applet BusyBox (và ' +
            'một chương trình Debian) chuyên khởi động daemon ở nền và ghi lại PID của nó:' },

          { t: 'code', where: 'wsl', code:
            'cat > rootfs/etc/init.d/S50temp_daemon << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Start/stop temp_daemon in the background, SysV style\n' +
            'DAEMON=/usr/bin/temp_daemon\n' +
            'PIDFILE=/var/run/temp_daemon.pid\n' +
            'case "$1" in\n' +
            '    start)\n' +
            '        echo "S50temp_daemon: starting"\n' +
            '        start-stop-daemon -S -b -m -p "$PIDFILE" -x "$DAEMON"\n' +
            '        ;;\n' +
            '    stop)\n' +
            '        echo "S50temp_daemon: stopping"\n' +
            '        start-stop-daemon -K -p "$PIDFILE" -s TERM\n' +
            '        rm -f "$PIDFILE"\n' +
            '        ;;\n' +
            '    *)\n' +
            '        echo "usage: $0 {start|stop}"; exit 1\n' +
            '        ;;\n' +
            'esac\n' +
            'EOF\n' +
            'chmod +x rootfs/etc/init.d/rcK rootfs/etc/init.d/S10network rootfs/etc/init.d/S50temp_daemon\n' +
            'mkdir -p rootfs/var/run\n' +
            'ls -l rootfs/etc/init.d' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 16\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 169 Sep 29 13:35 rcK\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 392 Sep 29 13:35 rcS\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 277 Sep 29 13:35 S10network\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 469 Sep 29 13:35 S50temp_daemon' },

          { t: 'p', x:
            'Bốn script, cả bốn có bit <code>x</code> — thiếu nó, vòng <code>[ -x "$s" ]</code> sẽ ' +
            'lặng lẽ bỏ qua script đó. <code>ls</code> xếp <code>rcK</code>, <code>rcS</code> trước ' +
            '<code>S10…</code> vì locale của WSL so sánh không phân biệt hoa thường; mẫu ' +
            '<code>S??*</code> trong rootfs thì chỉ khớp hai file bắt đầu bằng chữ <code>S</code> ' +
            'hoa và theo đúng thứ tự <code>S10</code> → <code>S50</code>.' },

          { t: 'cmdx', cmd: 'start-stop-daemon -S -b -m -p "$PIDFILE" -x "$DAEMON"',
            title: 'start-stop-daemon — làm hộ daemon việc tách nền',
            rows: [
              ['<code>-S</code>', '<i>start</i>: khởi động, nếu chưa có bản nào đang chạy.', 'Kiểm tra \"đang chạy\" bằng cách tìm tiến trình có executable là <code>-x</code>. Có rồi thì in <code>… is already running</code> và trả về 1.'],
              ['<code>-b</code>', '<i>background</i>: <code>fork</code>, để con chạy daemon, cha thoát ngay.', 'Cần thiết vì <code>temp_daemon</code> chạy tiền cảnh; không có <code>-b</code>, <code>rcS</code> sẽ đứng ở đây mãi và không bao giờ tới dấu nhắc.'],
              ['<code>-m -p FILE</code>', '<i>make pidfile</i>: ghi PID của daemon vào <code>FILE</code>.', 'Đây là \"trí nhớ\" duy nhất của SysV về daemon. <code>-K -p FILE</code> đọc lại nó để biết giết ai.'],
              ['<code>-x FILE</code>', 'Chương trình cần chạy.', 'Cũng là khoá để nhận ra bản đang chạy.'],
              ['<code>-K -s TERM</code>', '<i>kill</i>: gửi tín hiệu cho PID trong pidfile.', 'Dùng trong nhánh <code>stop</code>, được <code>rcK</code> gọi lúc tắt máy.']
            ]},

          { t: 'code', where: 'wsl', code:
            './mkimg.sh && ./run.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.699150] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            '[    0.793329] EXT4-fs (vda): re-mounted 689dc2a7-c592-43a1-8a2c-0551f4ce7ec9 r/w.\n' +
            '[    0.793709] ext4 filesystem being remounted at / supports timestamps until 2038-01-19 (0x7fffffff)\n' +
            'S10network: lo up\n' +
            'S50temp_daemon: starting\n' +
            'rcS: done at 0.83 s, hostname is embedded' },

          { t: 'p', x:
            'Hai script chạy đúng thứ tự tên: <code>S10network</code> rồi <code>S50temp_daemon</code>. ' +
            'Dòng chào <code>[daemon] pid …</code> <b>không</b> xuất hiện: <code>start-stop-daemon ' +
            '-b</code> nối stdout của daemon vào <code>/dev/null</code>. Từ giờ, daemon im lặng — ' +
            'một hệ quả nữa của việc không có trình quản lý nào thu log. Kiểm tra pidfile và cây ' +
            'tiến trình:' },

          { t: 'code', where: 'qemu', code:
            'echo /etc/init.d/*; cat /var/run/temp_daemon.pid; ps -o pid,ppid,stat,comm | grep -E "PID|temp"\n' +
            'echo GET | nc 127.0.0.1 9006' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/etc/init.d/S10network /etc/init.d/S50temp_daemon /etc/init.d/rcK /etc/init.d/rcS\n' +
            '63\n' +
            'PID   PPID  STAT COMMAND\n' +
            '   63     1 S    temp_daemon\n' +
            'temperature=42.9 samples=30' },

          { t: 'p', x:
            'Pidfile ghi <b>63</b>, khớp với <code>ps</code>. <code>PPID 1</code> trông giống hệt ' +
            'bước 4 — nhưng lý do khác hẳn: ở bước 4 init tự <code>fork</code> daemon; ở đây cha ' +
            'thật của nó là <code>start-stop-daemon</code>, đã thoát, và daemon được giao cho init như ' +
            'một đứa <b>mồ côi</b> (luật 3). Init có nuôi nó, nhưng không có dòng ' +
            '<code>inittab</code> nào nói phải làm gì khi nó chết. Thử xem:' },

          { t: 'code', where: 'qemu', code:
            'kill -9 $(cat /var/run/temp_daemon.pid); sleep 3; pidof temp_daemon; echo "pidof rc=$?"\n' +
            'echo GET | nc 127.0.0.1 9006; echo "nc rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'pidof rc=1\n' +
            'nc rc=1' },

          { t: 'cal', kind: 'danger', title: 'Daemon chết, và không ai biết',
            x: '<p><code>pidof</code> không in gì và trả về <b>1</b>: không còn <code>temp_daemon</code> ' +
               'nào. <code>nc</code> trả về 1 vì cổng 9006 không còn ai nghe. Không một dòng nào in ' +
               'ra console, không log, không cảnh báo. Ba giây sau — hay ba tháng sau — hệ thống vẫn ' +
               'chạy, shell vẫn chạy, chỉ riêng chức năng chính của thiết bị đã mất.</p>' +
               '<p>Init đã gặt xác PID 63 (không có zombie), vì đó là nhiệm vụ (a). Nhưng gặt không ' +
               'phải là giám sát. Đây là điểm yếu của SysV mà bảng so sánh ghi \"Không ai biết\".</p>' },

          { t: 'p', x:
            'Pidfile còn một cái bẫy nữa. Đọc nó sau khi daemon đã chết, rồi khởi động lại bằng tay ' +
            'và thử khởi động lần thứ hai:' },

          { t: 'code', where: 'qemu', code:
            'cat /var/run/temp_daemon.pid; /etc/init.d/S50temp_daemon start; sleep 1; cat /var/run/temp_daemon.pid\n' +
            '/etc/init.d/S50temp_daemon start; echo "second start rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '63\n' +
            'S50temp_daemon: starting\n' +
            '82\n' +
            'S50temp_daemon: starting\n' +
            '/usr/bin/temp_daemon is already running\n' +
            'second start rc=1' },

          { t: 'p', x:
            'Trước khi khởi động lại, pidfile vẫn ghi <b>63</b> — PID của một tiến trình đã chết. ' +
            'Nếu kernel tình cờ cấp số 63 cho một chương trình khác, lệnh <code>stop</code> sẽ giết ' +
            'nhầm nó. Sau <code>start</code>, pidfile được ghi lại thành <b>82</b>. Lần ' +
            '<code>start</code> thứ hai bị từ chối đúng cách: <code>start-stop-daemon</code> tìm theo ' +
            'tên executable, thấy PID 82 và trả về <b>1</b> thay vì chạy bản thứ hai tranh cổng 9006.' },

          { t: 'code', where: 'qemu', code:
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            'S50temp_daemon: stopping\n' +
            'stopped process in pidfile \'/var/run/temp_daemon.pid\' (pid 82)\n' +
            'S10network: lo down\n' +
            'umount: devtmpfs busy - remounted read-only\n' +
            '[   20.961064] EXT4-fs (vda): re-mounted 689dc2a7-c592-43a1-8a2c-0551f4ce7ec9 ro.\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   22.971575] Flash device refused suspend due to active operation (state 20)\n' +
            '[   22.972308] Flash device refused suspend due to active operation (state 20)\n' +
            '[   22.973199] reboot: Power down' },

          { t: 'p', x:
            'Dòng <code>::shutdown:/etc/init.d/rcK</code> chạy trước dòng <code>umount</code> vì init ' +
            'chạy các dòng <code>shutdown</code> theo thứ tự trong file. <code>rcK</code> gọi ' +
            '<code>S50</code> trước <code>S10</code> — ngược thứ tự khởi động, để daemon dừng trước ' +
            'khi mạng của nó bị gỡ. Lần này không có dòng <code>[daemon] signal 15</code> như bước ' +
            '4: daemon vẫn tắt êm, nhưng stdout của nó đang trỏ vào <code>/dev/null</code>.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — systemd: cùng daemon, một unit, trên WSL của bạn',
        blocks: [
          { t: 'p', x:
            'Bước cuối chạy trên máy WSL, nơi PID 1 là systemd. Bạn không cần <code>sudo</code>: mỗi ' +
            'người dùng đăng nhập có một <b>systemd riêng</b> (<code>systemd --user</code>) quản lý ' +
            'dịch vụ của riêng họ, đọc unit từ <code>~/.config/systemd/user/</code>. Mọi lệnh ' +
            'dưới đây đều có <code>--user</code> — bỏ nó đi là bạn đang nói với systemd của hệ thống, ' +
            'và sẽ bị hỏi mật khẩu.' },

          { t: 'p', x:
            'Dịch <code>temp_daemon</code> cho x86-64 (đây là máy host, không phải QEMU) và viết ' +
            'unit:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai49\n' +
            'gcc -Wall -Wextra -O2 -pthread -o temp_daemon_x86 temp_daemon.c\n' +
            'mkdir -p ~/.config/systemd/user\n' +
            'cat > ~/.config/systemd/user/temp-daemon.service << \'EOF\'\n' +
            '[Unit]\n' +
            'Description=Temperature daemon from lesson 24\n' +
            '\n' +
            '[Service]\n' +
            'ExecStart=%h/bai49/temp_daemon_x86\n' +
            'Restart=always\n' +
            'RestartSec=1\n' +
            '\n' +
            '[Install]\n' +
            'WantedBy=default.target\n' +
            'EOF' },

          { t: 'cmdx', cmd: 'temp-daemon.service',
            title: 'Bốn dòng thay cho script S50temp_daemon',
            rows: [
              ['<code>ExecStart=%h/…</code>', 'Lệnh chạy daemon. <code>%h</code> là thư mục home của bạn.', '<b>Phải là đường dẫn tuyệt đối</b> (hoặc tên có trong <code>PATH</code> mặc định của systemd). Không <code>&amp;</code>, không <code>-b</code>: daemon chạy tiền cảnh, làm con trực tiếp của systemd.'],
              ['<code>Restart=always</code>', 'Chạy lại mỗi khi tiến trình kết thúc, kể cả <code>exit 0</code> — trừ khi chính bạn ra lệnh <code>stop</code>.', 'Tương đương <code>respawn</code>, nhưng phân biệt được \"bạn dừng nó\" với \"nó chết\". <code>on-failure</code> (như <code>cron.service</code>) thì bỏ qua lần thoát mã 0.'],
              ['<code>RestartSec=1</code>', 'Chờ 1 giây trước khi chạy lại.', 'Mặc định là 100 ms.'],
              ['<code>WantedBy=default.target</code>', 'Khi <code>enable</code>, gắn unit vào <code>default.target</code> của systemd người dùng.', 'Tức là \"tự chạy khi bạn đăng nhập\". Unit hệ thống thường dùng <code>multi-user.target</code>.']
            ]},

          { t: 'p', x:
            'Báo systemd đọc file mới, khởi động, và hỏi trạng thái:' },

          { t: 'code', where: 'wsl', code:
            'systemctl --user daemon-reload\n' +
            'systemctl --user start temp-daemon\n' +
            'systemctl --user status temp-daemon --no-pager' },

          { t: 'code', where: 'out', nocopy: true, code:
            '● temp-daemon.service - Temperature daemon from lesson 24\n' +
            '     Loaded: loaded (/home/cah8hc/.config/systemd/user/temp-daemon.service; disabled; vendor preset: enabled)\n' +
            '     Active: active (running) since Tue 2026-09-29 13:35:57 +07; 1s ago\n' +
            '   Main PID: 191820 (temp_daemon_x86)\n' +
            '     CGroup: /user.slice/user-1000.slice/user@1000.service/temp-daemon.service\n' +
            '             └─191820 /home/cah8hc/bai49/temp_daemon_x86\n' +
            '\n' +
            'Sep 29 13:35:57 HC-C-005W7 systemd[718]: Started Temperature daemon from lesson 24.\n' +
            'Sep 29 13:35:57 HC-C-005W7 temp_daemon_x86[191820]: [daemon] pid 191820 — listening on port 9006, epoll fd 5, signalfd 3',
            notes: [
              'PID, tên máy (<code>HC-C-005W7</code>), đường dẫn home, <code>user-1000</code> và <code>systemd[718]</code> (PID của systemd người dùng) đều khác trên máy bạn.'
            ] },

          { t: 'p', x:
            'Bốn dòng đáng đọc. <code>Loaded: … disabled</code>: file được nạp, nhưng chưa bật tự ' +
            'chạy. <code>Main PID: 191820</code>: systemd biết chính xác PID — không cần pidfile, vì ' +
            'chính nó <code>fork</code> ra tiến trình này. <code>CGroup:</code>: daemon nằm trong một ' +
            'cgroup riêng mang tên unit. Và hai dòng cuối là <b>journal</b>: dòng chào ' +
            '<code>[daemon] pid …</code> mà bước 5 đã mất vào <code>/dev/null</code> ở đây được thu ' +
            'lại, gắn tên và PID. Hỏi daemon, rồi giết nó:' },

          { t: 'code', where: 'wsl', code:
            'echo GET | nc -q1 127.0.0.1 9006\n' +
            'systemctl --user show -p MainPID -p NRestarts temp-daemon\n' +
            'kill -9 $(systemctl --user show -p MainPID --value temp-daemon)\n' +
            'sleep 2\n' +
            'systemctl --user show -p MainPID -p NRestarts temp-daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            'temperature=40.5 samples=6\n' +
            'MainPID=191820\n' +
            'NRestarts=0\n' +
            'MainPID=191829\n' +
            'NRestarts=1' },

          { t: 'p', x:
            '<code>nc</code> ở đây là bản OpenBSD của Ubuntu, nên cần lại <code>-q1</code> như Bài 24. ' +
            'Sau <code>kill -9</code>, <code>MainPID</code> đổi từ 191820 sang <b>191829</b> và ' +
            '<code>NRestarts</code> từ 0 lên <b>1</b>: systemd không chỉ chạy lại daemon mà còn ' +
            '<b>đếm</b>. Nó ghi cả lý do:' },

          { t: 'code', where: 'wsl', code:
            'journalctl --user -u temp-daemon --no-pager -n 8' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-- Logs begin at Fri 2025-09-26 16:45:24 +07, end at Tue 2026-09-29 13:36:00 +07. --\n' +
            'Sep 29 13:35:57 HC-C-005W7 temp_daemon_x86[191820]: [daemon] pid 191820 — listening on port 9006, epoll fd 5, signalfd 3\n' +
            'Sep 29 13:35:58 HC-C-005W7 temp_daemon_x86[191820]: [daemon] served request #1 on fd 6\n' +
            'Sep 29 13:35:59 HC-C-005W7 systemd[718]: temp-daemon.service: Main process exited, code=killed, status=9/KILL\n' +
            'Sep 29 13:35:59 HC-C-005W7 systemd[718]: temp-daemon.service: Failed with result \'signal\'.\n' +
            'Sep 29 13:36:00 HC-C-005W7 systemd[718]: temp-daemon.service: Scheduled restart job, restart counter is at 1.\n' +
            'Sep 29 13:36:00 HC-C-005W7 systemd[718]: Stopped Temperature daemon from lesson 24.\n' +
            'Sep 29 13:36:00 HC-C-005W7 systemd[718]: Started Temperature daemon from lesson 24.\n' +
            'Sep 29 13:36:00 HC-C-005W7 temp_daemon_x86[191829]: [daemon] pid 191829 — listening on port 9006, epoll fd 5, signalfd 3' },

          { t: 'cal', kind: 'info', title: 'Cả câu chuyện, trong tám dòng',
            x: 'Đọc từ trên xuống: daemon khởi động (13:35:57), phục vụ yêu cầu của bạn (:58), bị giết ' +
               'bằng <code>status=9/KILL</code> (:59), systemd lên lịch chạy lại sau đúng ' +
               '<code>RestartSec=1</code> (13:36:00), và bản mới 191829 lên sóng. So với bước 5, nơi ' +
               'cùng cái chết không để lại một byte nào: đây là thứ bạn cần khi một thiết bị ngoài ' +
               'hiện trường \"thỉnh thoảng mất kết nối\". Dòng <code>-- Logs begin …</code> là ngày bắt ' +
               'đầu journal trên máy bạn.' },

          { t: 'p', x:
            'Dừng có chủ đích — thứ <code>respawn</code> không làm được:' },

          { t: 'code', where: 'wsl', code:
            'systemctl --user stop temp-daemon\n' +
            'journalctl --user -u temp-daemon --no-pager -n 5' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-- Logs begin at Fri 2025-09-26 16:45:24 +07, end at Tue 2026-09-29 13:36:01 +07. --\n' +
            'Sep 29 13:36:01 HC-C-005W7 systemd[718]: Stopping Temperature daemon from lesson 24...\n' +
            'Sep 29 13:36:01 HC-C-005W7 temp_daemon_x86[191829]: [daemon] signal 15 (Terminated) via signalfd — beginning graceful shutdown\n' +
            'Sep 29 13:36:01 HC-C-005W7 temp_daemon_x86[191829]: [daemon] served 0 requests, closed every file descriptor cleanly, exiting 0\n' +
            'Sep 29 13:36:01 HC-C-005W7 systemd[718]: temp-daemon.service: Succeeded.\n' +
            'Sep 29 13:36:01 HC-C-005W7 systemd[718]: Stopped Temperature daemon from lesson 24.' },

          { t: 'p', x:
            '<code>stop</code> gửi <code>SIGTERM</code> (mặc định của systemd), daemon tắt êm qua ' +
            '<code>signalfd</code> đúng như Bài 24 hứa, systemd ghi <code>Succeeded</code> — và ' +
            '<b>không</b> chạy lại, dù có <code>Restart=always</code>. Nó biết lần thoát này là do ' +
            'bạn yêu cầu. Nếu daemon không thoát trong <code>TimeoutStopSec</code> (mặc định 90 s), ' +
            'systemd mới bắn <code>SIGKILL</code> — so với 1 giây của BusyBox init ở bước 4.' },

          { t: 'p', x:
            'Bật tự chạy, rồi thử một điều cuối: giết daemon liên tục, nhanh hơn mức bình thường:' },

          { t: 'code', where: 'wsl', code:
            'systemctl --user enable temp-daemon\n' +
            'systemctl --user start temp-daemon; sleep 1.5\n' +
            'for i in 1 2 3 4 5 6; do\n' +
            '  P=$(systemctl --user show -p MainPID --value temp-daemon)\n' +
            '  echo "round $i: MainPID=$P"\n' +
            '  [ "$P" -gt 0 ] && kill -9 "$P"\n' +
            '  sleep 1.5\n' +
            'done\n' +
            'systemctl --user is-active temp-daemon\n' +
            'journalctl --user -u temp-daemon --no-pager -n 3\n' +
            'systemctl --user show -p StartLimitBurst -p StartLimitIntervalUSec -p NRestarts temp-daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Created symlink /home/cah8hc/.config/systemd/user/default.target.wants/temp-daemon.service → /home/cah8hc/.config/systemd/user/temp-daemon.service.\n' +
            'round 1: MainPID=192168\n' +
            'round 2: MainPID=192173\n' +
            'round 3: MainPID=192177\n' +
            'round 4: MainPID=192181\n' +
            'round 5: MainPID=192185\n' +
            'round 6: MainPID=0\n' +
            'failed\n' +
            '-- Logs begin at Fri 2025-09-26 16:45:24 +07, end at Tue 2026-09-29 13:49:24 +07. --\n' +
            'Sep 29 13:49:24 HC-C-005W7 systemd[718]: temp-daemon.service: Start request repeated too quickly.\n' +
            'Sep 29 13:49:24 HC-C-005W7 systemd[718]: temp-daemon.service: Failed with result \'signal\'.\n' +
            'Sep 29 13:49:24 HC-C-005W7 systemd[718]: Failed to start Temperature daemon from lesson 24.\n' +
            'NRestarts=5\n' +
            'StartLimitIntervalUSec=10s\n' +
            'StartLimitBurst=5' },

          { t: 'cal', kind: 'danger', title: 'Vì sao phải có [ "$P" -gt 0 ]',
            x: 'Khi unit đã <code>failed</code>, <code>MainPID</code> là <b>0</b> — vòng 6 ở trên cho ' +
               'thấy đúng điều đó. <code>kill -9 0</code> không có nghĩa \"không giết ai\": với ' +
               '<code>kill()</code>, PID 0 là <b>cả nhóm tiến trình của chính bạn</b> — shell đang ' +
               'chạy vòng lặp, và mọi thứ cùng nhóm với nó. Dòng kiểm tra chặn đúng trường hợp đó. ' +
               'Bất kỳ script nào đọc một PID từ file hay từ lệnh khác rồi đưa cho <code>kill</code> ' +
               'đều cần một phép kiểm tra như vậy.' },

          { t: 'cal', kind: 'why', title: 'Start request repeated too quickly — một tính năng, không phải lỗi',
            x: '<p>Vòng 1–5 đều tìm thấy một daemon sống, mỗi lần một PID mới (192168 → 192173 → … → ' +
               '192185). Sau lần giết thứ năm, lần khởi động kế tiếp sẽ là lần thứ <b>sáu</b> trong ' +
               'chưa đầy 10 giây (1 lần <code>start</code> tay + 5 lần chạy lại) — vượt ' +
               '<code>StartLimitBurst=5</code> trong <code>StartLimitIntervalUSec=10s</code>. systemd ' +
               'từ chối, đánh dấu unit <code>failed</code>, ghi lý do vào journal, và vòng 6 đọc ' +
               'được <code>MainPID=0</code>: không còn tiến trình nào. <code>NRestarts=5</code> đếm ' +
               'cả lần chạy lại bị từ chối đó.</p>' +
               '<p>Lý do tồn tại: một daemon chết ngay khi khởi động — thiếu file cấu hình, cổng bị ' +
               'chiếm — sẽ bị <code>respawn</code> chạy lại mãi mãi, mỗi giây một lần, đổ log và đốt ' +
               'CPU (Bài 47 đã thấy điều này với <code>ttyS0</code>). systemd dừng lại và để trạng ' +
               'thái <code>failed</code> cho bạn hoặc hệ thống giám sát nhìn thấy. Khởi động lại bằng ' +
               'tay: <code>systemctl --user reset-failed temp-daemon</code> rồi <code>start</code>.</p>' },

          { t: 'p', x:
            'Dọn dẹp — không để lại unit nào trên máy thật của bạn:' },

          { t: 'code', where: 'wsl', code:
            'systemctl --user disable --now temp-daemon\n' +
            'systemctl --user reset-failed temp-daemon\n' +
            'rm ~/.config/systemd/user/temp-daemon.service\n' +
            'systemctl --user daemon-reload\n' +
            'systemctl --user status temp-daemon --no-pager' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Removed /home/cah8hc/.config/systemd/user/default.target.wants/temp-daemon.service.\n' +
            'Unit temp-daemon.service could not be found.' },

          { t: 'p', x:
            '<code>disable</code> xoá đúng symlink mà <code>enable</code> đã tạo — \"tự chạy khi boot\" ' +
            'của systemd, như của SysV, chỉ là một symlink. <code>could not be found</code> xác nhận ' +
            'unit đã biến mất hoàn toàn. Nếu <code>~/.config/systemd</code> chưa từng tồn tại trước ' +
            'bài này, bạn có thể xoá luôn bằng <code>rmdir ~/.config/systemd/user ~/.config/systemd</code>.' }
        ] }
    ] },

    /* ============================================================
       6. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>kill -9 1</code> trả về 0 nhưng init vẫn chạy',
         'Không phải lỗi: luật 2. Kernel vứt <code>SIGKILL</code>/<code>SIGSTOP</code> gửi tới PID 1 từ userspace, và không báo lỗi cho bên gửi.',
         'Muốn tắt máy, gửi tín hiệu init <b>đã tuyên bố</b>: <code>poweroff</code> / <code>kill -USR2 1</code> với BusyBox init.'],

        ['<code>poweroff</code>, <code>reboot</code> không có tác dụng; <code>ps</code> hiện ngày càng nhiều dòng <code>Z</code> với <code>PPID 1</code>',
         'PID 1 là một chương trình không làm hai nhiệm vụ của init — như <code>noreap_init</code> ở bước 3, một script shell tự viết, hoặc một ứng dụng chạy làm PID 1 trong container.',
         'Đọc <code>SigCgt</code>/<code>SigBlk</code> trong <code>/proc/1/status</code>. Dùng một init thật (BusyBox init, <code>tini</code>, systemd), hoặc thêm handler + vòng <code>waitpid(-1, …, WNOHANG)</code> vào chương trình của bạn.'],

        ['<code>-sh: can\'t access tty; job control turned off</code>',
         'Shell không có terminal điều khiển: chương trình PID 1 đã <code>exec</code> shell mà không <code>setsid()</code> và mở tty.',
         'Vô hại cho các lệnh bình thường; chỉ mất Ctrl-C/Ctrl-Z. BusyBox init tự lo việc này cho các dòng có trường <code>tty</code>.'],

        ['<code>nc 127.0.0.1 9006</code> trả về 1 ngay, dù <code>pidof temp_daemon</code> có PID',
         'Giao diện loopback <code>lo</code> chưa bật. Daemon <code>bind</code> vào <code>0.0.0.0</code> vẫn thành công, nhưng không gói tin nào tới được <code>127.0.0.1</code>. Đã thử: bỏ dòng <code>ifconfig lo</code> khỏi <code>rcS</code> → <code>nc rc=1</code>; gõ tay <code>ifconfig lo 127.0.0.1 up</code> → trả lời ngay.',
         'Thêm <code>ifconfig lo 127.0.0.1 up</code> vào <code>rcS</code> (bước 4) hoặc <code>S10network</code> (bước 5). Kiểm tra: <code>ifconfig</code> không tham số chỉ liệt kê giao diện đang bật.'],

        ['<code>bind: Address already in use</code> lặp mỗi giây trên console',
         'Hai bản daemon tranh một cổng: một dòng <code>respawn</code> chạy daemon trong khi một script <code>S50…</code> hay một lần chạy tay đã giữ cổng 9006. Bản của <code>respawn</code> chết ngay, bị chạy lại, chết lại — mãi mãi.',
         'Chỉ để <b>một</b> cơ chế quản lý mỗi daemon. <code>ps | grep temp_daemon</code> để xem ai đang giữ cổng; xoá dòng <code>respawn</code> hoặc script thừa.'],

        ['Script <code>S50…</code> không chạy lúc boot, không có dòng nào in ra',
         'Thiếu bit thực thi: vòng <code>[ -x "$s" ] &amp;&amp; …</code> trong <code>rcS</code> lặng lẽ bỏ qua nó. Hoặc tên file không khớp <code>S??*</code> (ví dụ <code>s50…</code> chữ thường).',
         '<code>chmod +x rootfs/etc/init.d/S*</code> rồi <code>./mkimg.sh</code> lại. Kiểm tra bằng <code>ls -l</code>.'],

        ['Pidfile ghi một PID, nhưng <code>ps</code> không có tiến trình đó (hoặc có, mà là chương trình khác)',
         'Daemon đã chết sau khi <code>start-stop-daemon</code> ghi pidfile; không ai cập nhật nó. PID có thể đã được cấp lại.',
         'Đừng tin pidfile một mình — <code>start-stop-daemon</code> đối chiếu thêm tên executable (<code>-x</code>). Nếu cần giám sát thật, dùng <code>respawn</code> hoặc systemd.'],

        ['<code>Failed to connect to bus: No such file or directory</code> khi chạy <code>systemctl --user</code>',
         'Phiên của bạn không có systemd người dùng: <code>XDG_RUNTIME_DIR</code>/<code>DBUS_SESSION_BUS_ADDRESS</code> không được đặt, hoặc WSL chưa bật systemd. Đã tái hiện bằng <code>env -u XDG_RUNTIME_DIR -u DBUS_SESSION_BUS_ADDRESS systemctl --user status</code>.',
         'Mở một terminal WSL mới (đăng nhập thật). Nếu <code>ps -p 1</code> không phải <code>systemd</code>: thêm <code>[boot] systemd=true</code> vào <code>/etc/wsl.conf</code> rồi <code>wsl --shutdown</code>.'],

        ['<code>Failed to start temp-daemon.service: Unit temp-daemon.service has a bad unit file setting.</code>',
         '<code>ExecStart=</code> không phải đường dẫn tuyệt đối và không tìm thấy trong <code>PATH</code> của systemd. Journal nói rõ: <code>Executable "temp_daemon_x86" not found in path "/usr/local/sbin:…:/bin"</code>.',
         'Viết đường dẫn đầy đủ, dùng <code>%h</code> cho home: <code>ExecStart=%h/bai49/temp_daemon_x86</code>. Rồi <code>daemon-reload</code>.'],

        ['<code>Warning: The unit file, source configuration file or drop-ins of temp-daemon.service changed on disk. Run \'systemctl --user daemon-reload\' to reload units.</code>',
         'Bạn sửa file unit mà chưa báo systemd. Nó vẫn dùng bản cũ trong bộ nhớ.',
         '<code>systemctl --user daemon-reload</code> sau <b>mỗi</b> lần sửa, rồi <code>restart</code> service.'],

        ['<code>Start request repeated too quickly.</code>, unit ở trạng thái <code>failed</code>',
         'Quá <code>StartLimitBurst</code> (mặc định 5) lần khởi động trong <code>StartLimitIntervalSec</code> (10 s) — thường vì daemon chết ngay khi vừa chạy.',
         'Đọc <code>journalctl -u tên</code> để tìm lý do chết thật. Sửa xong: <code>systemctl reset-failed tên</code> rồi <code>start</code>.']
      ] },

    /* ============================================================
       7. TÓM TẮT, BÀI TIẾP THEO
       ============================================================ */
    { t: 'recap', title: 'Tóm tắt', items: [
      'Kernel áp đúng <b>ba</b> luật riêng cho PID 1: thoát → <b>panic</b> (<code>kernel/exit.c:935</code>); tín hiệu PID 1 không cài handler và không chặn → <b>bị vứt</b>, kể cả <code>SIGKILL</code> (<code>SIGNAL_UNKILLABLE</code>, <code>kernel/signal.c:90–96</code>); tiến trình mồ côi → <b>giao cho PID 1</b> (<code>find_new_reaper()</code>).',
      'Hai nhiệm vụ init phải tự làm: <b>gặt</b> mọi con bằng <code>wait()</code> trong vòng lặp, và <b>nhận tín hiệu</b> tắt máy. <code>noreap_init</code> bỏ cả hai: <b>6</b> zombie <code>PPID 1</code> sau hai lệnh, <code>kill -TERM/-INT/-USR2 1</code> không có tác dụng.',
      'BusyBox init chặn 8 tín hiệu và chờ chúng bằng <code>sigtimedwait()</code>. <code>poweroff</code> = <code>kill(1, SIGUSR2)</code>, <code>reboot</code> = <code>SIGTERM</code>, <code>halt</code> = <code>SIGUSR1</code>, <code>SIGHUP</code> = đọc lại <code>inittab</code>. Giữa <code>SIGTERM</code> và <code>SIGKILL</code> lúc tắt máy chỉ có <b>1 giây</b>.',
      '<code>::respawn:/usr/bin/temp_daemon</code>: daemon là con trực tiếp của init, <code>kill -9</code> → PID mới trong ≤ 1 s. Nhưng <code>respawn</code> cũng hồi sinh một lần <code>exit 0</code> êm, và <code>SIGHUP</code> sau khi xoá dòng <b>không</b> giết bản đang chạy.',
      'SysV: script <code>/etc/init.d/S??*</code> chạy theo thứ tự tên, <code>start-stop-daemon -S -b -m -p</code> tách nền và ghi pidfile, rồi thoát. Daemon thành mồ côi của PID 1 — <code>kill -9</code> và nó <b>chết hẳn</b>, không một dòng log. Pidfile vẫn ghi PID cũ.',
      'systemd: unit khai báo, daemon là con trực tiếp trong một <b>cgroup</b>; <code>Restart=always</code> chạy lại và đếm <code>NRestarts</code>; journal ghi <code>status=9/KILL</code>; <code>stop</code> không bị hồi sinh; quá <b>5</b> lần trong <b>10 s</b> → <code>Start request repeated too quickly</code>.',
      '<code>enable</code> của systemd và <code>S50…</code> của SysV đều chỉ là <b>symlink</b>; <code>runlevel5.target</code> → <code>graphical.target</code>.',
      'Chọn init theo tài nguyên và nhu cầu giám sát: BusyBox init nằm trong <b>2 094 192</b> B BusyBox bạn đã có và cho hệ thống này tới shell + daemon trong <b>0,76–0,83 s</b>; systemd cần glibc, cgroup và hơn <b>4 MB</b> cho file chính và thư viện lõi.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Chặng 09 khép lại ở đây: bạn đã lắp một hệ Linux ARM64 từ kernel tự build, rootfs tự dựng, ' +
         'init tự cấu hình, tới daemon tự viết — boot dưới một giây và tự hồi sinh khi bị giết. Mọi ' +
         'thứ bạn chạm vào suốt ba chặng qua đều ở <b>userspace</b> hoặc là cấu hình của kernel. ' +
         '<b>Bài 50 — Module đầu tiên</b> mở Chặng 10 bằng cách viết mã chạy <b>bên trong</b> kernel: ' +
         'một file C vài chục dòng với <code>module_init</code> / <code>module_exit</code>, dịch chéo ' +
         'thành <code>.ko</code> bằng chính cây <code>~/bai38/linux-6.18.45</code>, rồi ' +
         '<code>insmod</code> vào QEMU và thấy dòng <code>printk</code> của bạn xuất hiện trong ' +
         '<code>dmesg</code>. Bạn sẽ đo được một <code>.ko</code> nhỏ tới mức nào, và thấy ' +
         '<code>rmmod</code> gọi hàm dọn dẹp của bạn — thứ mà không một chương trình userspace nào ' +
         'có thể làm hộ kernel.' }
  ],

  quiz: [
    { q: 'Trong QEMU, bạn gõ <code>kill -9 1; echo $?</code> và thấy <code>0</code>. <code>ps</code> vẫn cho thấy <code>init</code> là PID 1, trạng thái <code>S</code>. Giải thích nào đúng?',
      opts: [
        '<code>kill</code> của BusyBox bị lỗi: lẽ ra phải trả về khác 0.',
        'Kernel đã giết init và khởi động lại nó ngay lập tức với cùng PID.',
        'Kernel vứt <code>SIGKILL</code> gửi từ userspace tới PID 1 ngay lúc gửi (<code>sig_task_ignored()</code>); syscall <code>kill()</code> vẫn thành công vì đích tồn tại và bạn có quyền.',
        'Init đã cài một handler cho <code>SIGKILL</code> để bỏ qua nó.'
      ],
      a: 2,
      why: 'Luật 2: <code>is_global_init(t) &amp;&amp; sig_kernel_only(sig)</code> → tín hiệu bị bỏ qua, không bao giờ vào hàng đợi. Mã trả về của <code>kill()</code> chỉ nói \"được phép gửi\", không nói \"đã có tác dụng\". Không chương trình nào cài được handler cho <code>SIGKILL</code> — <code>sigaction</code> từ chối (<code>kernel/signal.c:4317</code>). Nếu init thật sự chết, kernel đã panic theo luật 1, không có chuyện \"khởi động lại\".' },

    { q: 'Một đồng nghiệp thay BusyBox init bằng script <code>/init</code> tự viết: mount vài thứ, chạy <code>my_app &amp;</code>, rồi <code>while true; do sleep 60; done</code>. Sau vài ngày, <code>ps</code> có hàng trăm dòng <code>Z</code> với <code>PPID 1</code>, và <code>reboot</code> không làm gì. Nguyên nhân gốc?',
      opts: [
        '<code>my_app</code> rò bộ nhớ.',
        'PID 1 (vòng <code>while</code> của shell) không gặt các tiến trình mồ côi được giao cho nó, và không có handler cho tín hiệu <code>reboot</code> gửi tới — hai nhiệm vụ của init bị bỏ trống.',
        'Kernel thiếu <code>CONFIG_DEVTMPFS</code>.',
        '<code>sleep 60</code> chặn mọi tín hiệu trong 60 giây.'
      ],
      a: 1,
      why: 'Đây chính là <code>noreap_init</code> của bước 3, viết bằng shell. Zombie <code>PPID 1</code> tích dần = PID 1 không gọi <code>wait()</code> cho mồ côi (luật 3 giao chúng cho nó). <code>reboot</code> không tác dụng = PID 1 không cài handler cho tín hiệu tương ứng, nên luật 2 vứt nó. Cách chữa: dùng một init thật (BusyBox init, <code>tini</code>) hoặc <code>exec</code> một chương trình biết làm hai việc đó. Rò bộ nhớ không tạo zombie; <code>sleep</code> không chặn tín hiệu.' },

    { q: 'Rootfs của bạn khởi động <code>temp_daemon</code> bằng script <code>/etc/init.d/S50temp_daemon</code> gọi <code>start-stop-daemon -S -b -m -p …</code>. Daemon bị <code>kill -9</code>. Chuyện gì xảy ra, và vì sao?',
      opts: [
        'BusyBox init chạy lại nó trong vòng 1 giây, vì nó là con của init.',
        '<code>start-stop-daemon</code> phát hiện qua pidfile và chạy lại nó.',
        'Daemon chết hẳn và không ai biết: cha thật của nó (<code>start-stop-daemon</code>) đã thoát, init chỉ nhận nó như một mồ côi và gặt xác, không có dòng <code>respawn</code> nào cho nó.',
        'Kernel panic, vì daemon có <code>PPID 1</code>.'
      ],
      a: 2,
      why: 'Bước 5 đo đúng điều này: <code>pidof rc=1</code>, <code>nc rc=1</code>, không một dòng log. <code>PPID 1</code> ở đây là do luật 3 (nhận nuôi mồ côi), khác hẳn bước 4 nơi init tự <code>fork</code> daemon từ dòng <code>respawn</code>. <code>start-stop-daemon</code> đã thoát từ lúc boot; pidfile chỉ là một file tĩnh. Chỉ cái chết của PID 1 mới gây panic.' },

    { q: 'Bạn thêm <code>::respawn:/usr/bin/temp_daemon</code> vào <code>inittab</code>. Sau đó bạn xoá dòng đó, lưu file, và chạy <code>kill -HUP 1</code>. <code>pidof temp_daemon</code> in ra gì?',
      opts: [
        'Không in gì — <code>SIGHUP</code> làm init giết mọi tiến trình không còn trong <code>inittab</code>.',
        'Vẫn in PID cũ: init đọc lại <code>inittab</code> và sẽ không chạy lại daemon khi nó chết, nhưng không giết bản đang chạy (<code>CONFIG_FEATURE_KILL_REMOVED</code> tắt trong <code>defconfig</code>).',
        'Một PID mới — <code>SIGHUP</code> khởi động lại mọi dòng <code>respawn</code>.',
        'Kernel panic, vì <code>SIGHUP</code> mặc định kết thúc tiến trình.'
      ],
      a: 1,
      why: 'Bước 4 đo được: vẫn là <code>75</code>. Giết tiến trình bị xoá khỏi <code>inittab</code> là một tuỳ chọn build riêng, mặc định tắt (<code>.config:519</code>). Init có tuyên bố nhận <code>SIGHUP</code> (nó chặn và chờ tín hiệu này), nên luật 2 không vứt nó, và init không chết.' },

    { q: 'Với <code>Restart=always</code>, vì sao <code>systemctl stop temp-daemon</code> không làm daemon bị chạy lại, trong khi <code>kill -TERM</code> gửi thẳng tới daemon dưới BusyBox <code>respawn</code> thì có?',
      opts: [
        'systemd gửi <code>SIGKILL</code> thay vì <code>SIGTERM</code>, nên daemon không kịp báo.',
        'systemd tự khởi tạo việc dừng nên biết lần thoát này là theo yêu cầu; <code>respawn</code> chỉ thấy \"tiến trình đã biến mất\" và không phân biệt lý do.',
        '<code>Restart=always</code> chỉ áp dụng khi daemon bị <code>SIGKILL</code>.',
        'Daemon thoát với mã khác nhau trong hai trường hợp.'
      ],
      a: 1,
      why: 'Cả hai lần daemon đều nhận <code>SIGTERM</code>, tắt êm qua <code>signalfd</code> và <code>exit 0</code> — bước 4 và bước 6 in cùng hai dòng <code>[daemon]</code>. Khác biệt nằm ở trình quản lý: systemd ghi nhận \"đang dừng theo lệnh\" (<code>Stopping …</code> → <code>Succeeded</code>), còn BusyBox init không có khái niệm \"dừng dịch vụ\", chỉ có dòng <code>respawn</code>. <code>Restart=always</code> áp dụng cho mọi lần thoát không do bạn yêu cầu, kể cả <code>exit 0</code>.' },

    { q: 'Unit của bạn báo <code>failed</code> với <code>Start request repeated too quickly</code>. Bước nên làm <b>đầu tiên</b> là gì?',
      opts: [
        'Tăng <code>StartLimitBurst</code> lên 1000 để systemd không bỏ cuộc nữa.',
        'Đổi <code>Restart=always</code> thành <code>Restart=no</code>.',
        'Đọc <code>journalctl -u tên</code> để tìm vì sao daemon chết liên tục ngay sau khi chạy; sửa nguyên nhân rồi mới <code>reset-failed</code> và <code>start</code>.',
        'Khởi động lại toàn bộ máy.'
      ],
      a: 2,
      why: 'Giới hạn khởi động tồn tại chính để dừng một vòng chết–sống vô ích và giữ bằng chứng lại cho bạn. Nguyên nhân thật (cổng bị chiếm, file cấu hình thiếu, <code>ExecStart</code> sai) nằm trong journal, ngay trước dòng <code>repeated too quickly</code>. Nâng giới hạn chỉ biến systemd thành <code>respawn</code> — đốt CPU và log mãi mãi. Tắt <code>Restart</code> hay reboot không sửa được gì.' }
  ]
});

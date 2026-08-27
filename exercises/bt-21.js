/* ══════════════════════════════════════════════════════════════════════════
   Bài tập 21 — Tín hiệu và tắt máy êm
   ══════════════════════════════════════════════════════════════════════════

   ── §13.4 BƯỚC 1–2: KIỂM KÊ VÀ CHẤM ĐIỂM ─────────────────────────────────
   Nguồn: goals, 11 h2/h3, các khối cal kind why|danger|warn, terms (8 mục),
   recap (12 ý) của lessons/bai-21.js.

   D = phụ thuộc về sau · C = giá của hiểu sai · K = phản trực giác  (0/1/2)

   #   Ứng viên                                              D  C  K   Σ
   ──────────────────────────────────────────────────────────────────────
   1   Handler chen ngang bất kỳ đâu, chỉ được gọi hàm
       async-signal-safe; vi phạm cho DỮ LIỆU SAI, không sập  2  2  2   6  <= TRỤC 0
   2   Chặn = HOÃN (nằm treo, chuyển phát khi bỏ chặn);
       SIG_IGN = VỨT hẳn                                      2  2  2   6  <= TRỤC 1
   3   Tín hiệu chuẩn KHÔNG xếp hàng: 1 bit treo / số hiệu    2  2  2   6  <= TRỤC 2
   4   Hợp đồng SIGTERM (đề nghị) vs SIGKILL (cưỡng chế)      2  2  1   5
   5   static volatile sig_atomic_t — hình mẫu cờ             1  2  2   5
   6   signal() vs sigaction() — ngữ nghĩa khác nhau          1  2  1   4
   7   signalfd BẮT BUỘC chặn trước, nếu không chết 143       1  2  1   4
   8   SIGCHLD + while (waitpid WNOHANG) dọn zombie           1  2  1   4
   9   SA_RESTART khởi động lại read, KHÔNG khởi động lại
       sleep/poll/select                                      1  1  2   4
   10  Thời điểm chuyển phát: khi nhân sắp trả CPU về
       không gian người dùng, không phải lúc gửi              1  1  1   3
   11  errno phải lưu và khôi phục trong handler              0  1  2   3
   12  SIGKILL và SIGSTOP không bắt/chặn/bỏ qua được          1  1  1   3
   13  Mã thoát 128+n: 130 / 137 / 139 / 141 / 143            1  0  1   2
   14  Danh mục tín hiệu (INT/TERM/KILL/CHLD/USR1/PIPE/SEGV)  1  0  0   1

   ── BƯỚC 3: CẮT ──────────────────────────────────────────────────────────
   Ba ứng viên đạt Σ = 6, cả ba đều được điểm 2 ở cả ba axis. Lấy #1, #2, #3.

   ── BƯỚC 4: LOẠI ─────────────────────────────────────────────────────────
   #4  ĐÃ LÀ TRỤC CỦA bt-09 ("kill là lời đề nghị, kill -9 là mệnh lệnh").
       Theo §13.4 bước 4, một khái niệm chỉ được xoáy MỘT lần trong cả khoá,
       nên ở đây nó chỉ được một câu đơn (C4) và bảng chẩn đoán.
   #5  ĐÃ LÀ TRỤC CỦA bt-14 (volatile vô hình ở -O0) -> đưa xuống phần D.
   #13 Tra cứu được trong mười giây (§13.3 cấm) -> tối đa một câu ở phần A.
   #14 Danh mục thuần trí nhớ -> một câu ghép nối, không hơn.

   ── BƯỚC 5: BA CÂU CÓ THỂ SAI ────────────────────────────────────────────
   T0  Handler chen vào GIỮA HAI LỆNH BẤT KỲ của luồng chính, nên nó chỉ được
       gọi các hàm async-signal-safe; vi phạm không làm chương trình chết mà
       làm dữ liệu sai một cách âm thầm, và test không bắt được.
   T1  sigprocmask chỉ HOÃN: tín hiệu nằm ở trạng thái đang treo và được
       chuyển phát ngay khi bỏ chặn. SIG_IGN thì VỨT hẳn, bỏ chặn cũng không
       có gì quay lại.
   T2  Tín hiệu chuẩn (1–31) chỉ có ĐÚNG MỘT bit "đang treo" cho mỗi số hiệu,
       nên gửi N lần trong lúc bị chặn thì chỉ được chuyển phát MỘT lần.

   ── BƯỚC 6: HIỂU LẦM ĐỐI ỨNG ─────────────────────────────────────────────
   M0  "Tôi bắn 4000 tín hiệu mà không sao, vậy printf trong handler là được."
   M1  "Chặn với bỏ qua thì khác gì nhau, cả hai đều làm tín hiệu biến mất."
   M2  "Gửi 10 tín hiệu thì handler chạy 10 lần, nhân xếp hàng hộ tôi."

   ── BƯỚC 7: LƯỚI 3 × 1 ───────────────────────────────────────────────────
          A (nhớ lại)              B (giải thích số liệu)      C (quyết định)
   T0     a1 hàm nào gọi được      b1 bắt lỗi phát biểu        c1 data-logger
          trong handler            "4000 phát không sao"       64 MB ngoài
          (phát biểu)              (bằng chứng đo được)        hiện trường
   T1     a5 đúng/sai: chặn có     b2 đọc output               c2 chẩn đoán
          phải là bỏ qua không     ignore_vs_block             OTA bị giết ở
          (phát biểu)              (số liệu thật)              giây thứ 90
   T2     a7 điền số bit treo      b3 đọc output ShdPnd        c3 chẩn đoán
          (quan hệ)                4 phát vẫn một bit          mất sự kiện
                                   (số liệu thật)              cảm biến

   Kiểm tra: C1/C2/C3 đều KHÔNG trả lời được nếu chưa nắm trục; ba mức dùng
   ba loại kích thích khác nhau (phát biểu / số liệu đo / tình huống có ràng
   buộc mới); không câu nào lộ đáp án cho câu sau — b3 nói về bit treo còn
   c3 hỏi về mất sự kiện ở tầng ứng dụng, hai từ vựng khác hẳn.

   ── XUẤT XỨ SỐ LIỆU ──────────────────────────────────────────────────────
   Mọi bản ghi terminal trong file này là output THẬT, chạy ngày 26/08/2026
   trên WSL2 Ubuntu 26.04, gcc 15.2.0, 6 nhân, loadavg 0.00, từ các chương
   trình trong ~/bt21 của phần Thực hành Bài 21.
   Riêng bản ghi reentrancy_bug (câu B1) lấy nguyên văn từ Bài 21, đã được
   kiểm chứng khi soạn bài đó.
   Ba điểm cần ghi chú:
     · bad_reaper KHÔNG tất định — 5 lần chạy cho "reaped 2" hoặc "reaped 3",
       zombie còn lại 3 hoặc 2. Chính sự dao động đó là nội dung câu B4.
     · /proc/PID/status: phải đọc CẢ SigPnd LẪN ShdPnd. kill(pid) là gửi tới
       TIẾN TRÌNH nên chỉ ShdPnd đổi; SigPnd (của riêng luồng) vẫn là 0.
       Đọc thiếu ShdPnd sẽ ra kết luận sai "không có gì đang treo".
     · Mã thoát và từ trạng thái đo lại cùng ngày: TERM 143 / INT 130 /
       KILL 137, và từ trạng thái thô của con bị giết bằng tín hiệu đúng
       bằng SỐ HIỆU tín hiệu (15 / 9 / 2), không dịch trái 8 bit.
   ══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-21',
  minutes: 85,

  intro:
    '<p>Bài 21 dạy bạn cách một chương trình <b>chết cho tử tế</b>. Bộ bài tập này kiểm tra ' +
    'ba điều mà người học thường tưởng đã hiểu nhưng chưa: <b>(1)</b> vì sao một handler chỉ ' +
    'được gọi vài hàm nhất định, và vì sao vi phạm điều đó <i>không</i> làm chương trình sập; ' +
    '<b>(2)</b> chặn và bỏ qua khác nhau ở đâu — hai thứ trông giống hệt nhau từ bên ngoài ' +
    'nhưng cho hai kết cục trái ngược; <b>(3)</b> vì sao gửi mười tín hiệu chỉ nhận được một.</p>' +
    '<p><b>Chia làm hai lượt, và khoảng nghỉ giữa hai lượt là một thành phần của bài tập, ' +
    'không phải sự trì hoãn.</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1</b> — ngay sau khi đọc xong Bài 21: phần <b>A</b> và <b>B</b> (~23 phút).</li>' +
    '<li><b>Lượt 2</b> — sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b> (~60 phút). Nhớ lại ' +
    'sau khi đã quên một phần thì bền hơn nhớ lại lúc còn nóng.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần các chương trình trong <code>~/bt21</code> mà bạn đã viết ở phần ' +
    'Thực hành Bài 21. Nếu đã xoá, hãy gõ lại — gõ lại chính là bài tập.</p>',

  truc: [
    { id: 'safety', name: 'Handler chen ngang giữa hai lệnh bất kỳ',
      x: 'Bộ xử lý tín hiệu chạy chen vào giữa hai lệnh bất kỳ của luồng chính, nên nó chỉ ' +
         'được gọi các hàm async-signal-safe. Vi phạm không làm chương trình sập — nó làm ' +
         'dữ liệu sai một cách âm thầm.',
      mis: 'Bắn thử vài nghìn tín hiệu không thấy sao thì tức là dùng được.' },

    { id: 'deferignore', name: 'Chặn là hoãn, bỏ qua là vứt',
      x: 'sigprocmask chỉ hoãn: tín hiệu nằm ở trạng thái đang treo rồi được chuyển phát ' +
         'ngay khi bỏ chặn. SIG_IGN thì vứt hẳn — bỏ chặn cũng không có gì quay lại.',
      mis: 'Chặn với bỏ qua là hai cách nói của cùng một việc.' },

    { id: 'noqueue', name: 'Tín hiệu chuẩn không xếp hàng',
      x: 'Nhân giữ đúng một bit "đang treo" cho mỗi số hiệu, nên gửi N lần trong lúc bị ' +
         'chặn thì chỉ được chuyển phát một lần.',
      mis: 'Gửi mười tín hiệu thì handler chạy mười lần.' }
  ],

  A: [
    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Trong bốn hàm dưới đây, hàm nào <b>được phép</b> gọi từ bên trong một bộ xử lý ' +
         'tín hiệu?',
      opts: [
        '<code>printf("da nhan tin hieu\\n")</code>',
        '<code>write(1, "da nhan tin hieu\\n", 18)</code>',
        '<code>malloc(64)</code> để cấp chỗ ghi lại sự kiện',
        '<code>snprintf(buf, sizeof buf, "%d", sig)</code> với <code>buf</code> là biến <code>static</code>'
      ],
      a: 1,
      why: 'Chỉ <code>write(2)</code> nằm trong danh sách async-signal-safe. Đếm lại trên ' +
           'máy bạn: <code>man 7 signal-safety | grep -oE "[a-z_]+\\([0-9]\\)" | sort -u | ' +
           'wc -l</code> cho <b>199</b> hàm — <code>printf</code> và <code>malloc</code> ' +
           'không có trong đó. Điểm chung của ba lựa chọn sai: cả ba đều dùng một tài nguyên ' +
           '<b>dùng chung</b> mà luồng chính có thể đang sửa dở — đệm stdio, cấu trúc heap, ' +
           'và một mảng <code>static</code>. Handler chen vào giữa lúc tài nguyên đó mới ' +
           'nhất quán một nửa.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một tiến trình bị giết bằng <code>kill -TERM</code>. Shell in ra <code>$?</code> ' +
         'bằng bao nhiêu, và con số đó được ghép từ đâu?',
      opts: [
        '<b>15</b> — chính là số hiệu tín hiệu',
        '<b>143</b> — vì <code>128 + 15</code>, quy ước của shell để phân biệt "chết vì tín hiệu" với "tự thoát"',
        '<b>1</b> — mọi cái chết bất thường đều quy về 1',
        '<b>3840</b> — vì <code>15 &lt;&lt; 8</code>, đúng như từ trạng thái của <code>waitpid</code>'
      ],
      a: 1,
      why: 'Đo lại được bằng ba dòng: <code>sleep 30 &amp; P=$!; kill -TERM $P; wait $P; ' +
           'echo $?</code> cho <b>143</b>; đổi sang <code>-INT</code> cho <b>130</b>; ' +
           '<code>-KILL</code> cho <b>137</b>. Vì mã thoát bình thường chỉ đi từ 0 đến 127, ' +
           'shell dùng khoảng 128–192 để nói "nó không tự thoát, nó bị giết". ' +
           '<b>Đừng nhầm với từ trạng thái thô</b> của <code>waitpid</code>: từ đó lại bằng ' +
           'đúng <b>15</b> (xem câu D1) — hai con số khác nhau cho cùng một sự kiện, và đó ' +
           'chính là bài học của Bài 20.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gọi <code>kill(pid, SIGUSR1)</code>. Nhân chuyển phát tín hiệu đó vào ' +
         '<b>thời điểm</b> nào?',
      opts: [
        'Ngay lập tức: nhân dừng CPU đang chạy tiến trình đích và nhảy thẳng vào handler',
        'Khi tiến trình đích gọi lời gọi hệ thống tiếp theo, và chỉ khi đó',
        'Khi nhân sắp trả quyền điều khiển về không gian người dùng cho tiến trình đích — trước đó tín hiệu chỉ nằm ở trạng thái "đang treo"',
        'Sau đúng một lượt lập lịch (một tick), do bộ định thời của nhân quyết định'
      ],
      a: 2,
      why: '<code>kill</code> chỉ <b>bật một bit</b> trong bảng "đang treo" của tiến trình ' +
           'đích rồi trả về ngay — nó không chạy handler và không đợi. Việc chuyển phát xảy ' +
           'ra ở ranh giới nhân → người dùng: khi tiến trình đích được lập lịch chạy lại, ' +
           'hoặc khi nó vừa xong một lời gọi hệ thống. Đây là lý do một tiến trình đang ở ' +
           'trạng thái <code>D</code> (uninterruptible) <b>không</b> nhận tín hiệu, kể cả ' +
           '<code>SIGKILL</code> — nó chưa quay về không gian người dùng lần nào.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Vì sao một handler viết đúng chuẩn luôn mở đầu bằng <code>int saved = errno;</code> ' +
         'và kết thúc bằng <code>errno = saved;</code>?',
      opts: [
        'Để handler biết được tín hiệu nào vừa tới, vì số hiệu được nhân đặt vào <code>errno</code>',
        'Vì <code>errno</code> là biến toàn cục dùng chung: nếu handler gọi một hàm thất bại, nó ghi đè <code>errno</code> của luồng chính, và luồng chính sẽ báo cáo một lỗi hoàn toàn khác',
        'Vì <code>errno</code> không phải <code>volatile</code> nên trình biên dịch có thể tối ưu mất',
        'Vì POSIX bắt buộc, nếu thiếu thì <code>sigaction</code> trả về <code>EINVAL</code>'
      ],
      a: 1,
      why: 'Triệu chứng ngoài đời: <code>perror()</code> in ra một thông báo lỗi ' +
           '<b>không liên quan gì</b> tới lời gọi vừa hỏng. Kịch bản: luồng chính gọi ' +
           '<code>read</code>, <code>read</code> thất bại và đặt <code>errno</code>, rồi ' +
           'handler chen vào <i>trước</i> dòng <code>perror</code> và gọi ' +
           '<code>waitpid</code> — <code>waitpid</code> hỏng nhẹ, ghi đè <code>errno</code>. ' +
           'Luồng chính quay lại, in ra lỗi của <code>waitpid</code> và bạn đi tìm nhầm chỗ ' +
           'suốt buổi chiều. Đây là <i>đúng</i> căn bệnh của trục "handler chen ngang", chỉ ' +
           'khác là nạn nhân là một biến toàn cục của thư viện C.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 1,
      q: 'Xét phát biểu: <i>"Chặn <code>SIGTERM</code> bằng <code>sigprocmask</code> và đặt ' +
         '<code>SIG_IGN</code> cho <code>SIGTERM</code> là hai cách viết khác nhau của cùng ' +
         'một việc — tín hiệu không được xử lý."</i>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nói rõ hai cách khác nhau ở <b>thời điểm nào</b>.',
      why: 'Hai cơ chế trông giống nhau trong lúc đang bật, nhưng khác nhau hoàn toàn ở lúc ' +
           'tắt. <b>Chặn là hoãn</b>: tín hiệu nằm lại trong bảng "đang treo", và giây phút ' +
           'bạn gọi <code>sigprocmask(SIG_UNBLOCK, ...)</code> nó được chuyển phát ngay lập ' +
           'tức. <b>SIG_IGN là vứt</b>: nhân thấy bố trí là "bỏ qua" và loại bỏ tín hiệu tại ' +
           'chỗ, không ghi lại gì; sau này đặt handler lại cũng không có gì quay về.',
      crit: [
        'Nói đúng chữ <b>hoãn</b> cho <code>sigprocmask</code> và chữ <b>vứt / loại bỏ vĩnh viễn</b> cho <code>SIG_IGN</code>',
        'Nêu được nơi tín hiệu bị chặn nằm chờ: trạng thái <b>đang treo</b> (pending) của tiến trình',
        'Nêu đúng thời điểm phân biệt hai cái: <b>lúc bỏ chặn / lúc đặt lại handler</b>',
        'Không dùng chữ "mất" cho trường hợp chặn — với chặn thì không có gì mất cả'
      ],
      sol: '<p><b>Phát biểu sai.</b> Viết lại: <i>"Chặn <code>SIGTERM</code> bằng ' +
           '<code>sigprocmask</code> chỉ <b>hoãn</b> nó — tín hiệu được ghi vào bảng đang ' +
           'treo và sẽ được chuyển phát ngay khi bỏ chặn. Đặt <code>SIG_IGN</code> thì nhân ' +
           '<b>vứt hẳn</b> tín hiệu, không ghi lại dấu vết nào, nên về sau có đặt handler ' +
           'cũng không có gì để chuyển phát."</i></p>' +
           '<p><b>Vì sao đây là khác biệt sống còn.</b> Trong một trình cập nhật firmware, ' +
           'bạn <i>chặn</i> <code>SIGTERM</code> trong lúc ghi flash để không bị cắt ngang ' +
           'giữa chừng, rồi bỏ chặn ngay sau đó — yêu cầu dừng vẫn tới nơi, chỉ muộn vài ' +
           'giây. Nếu bạn <i>bỏ qua</i> nó thay vì chặn, yêu cầu dừng biến mất; ' +
           '<code>systemd</code> chờ hết thời hạn rồi bắn <code>SIGKILL</code>, và lần này ' +
           'thì bạn <b>thật sự</b> bị cắt ngang giữa lúc ghi flash. Cùng một ý định "đừng ' +
           'làm phiền tôi lúc này", hai kết cục ngược nhau.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu: <i>"Sau khi một handler đăng ký bằng <code>sigaction</code> chạy ' +
         'xong lần đầu, bố trí của tín hiệu đó bị đặt lại về mặc định, nên trong handler ' +
         'phải đăng ký lại nếu muốn bắt tiếp."</i>',
      a: 1,
      rw: 'Viết lại cho đúng, và cho biết phát biểu trên <b>đúng</b> với thứ gì.',
      why: 'Đây là ngữ nghĩa của <code>signal()</code> kiểu System V cổ, không phải của ' +
           '<code>sigaction</code>. Với <code>sigaction</code>, handler ở nguyên đó cho tới ' +
           'khi bạn đổi — trừ khi bạn tự yêu cầu hành vi cũ bằng cờ ' +
           '<code>SA_RESETHAND</code>. Thói quen đăng ký lại bên trong handler là di sản của ' +
           'thời <code>signal()</code>, và nó còn tệ hơn vô ích: giữa lúc bố trí bị đặt về ' +
           'mặc định và lúc bạn đăng ký lại có một khe hở, tín hiệu rơi vào đó sẽ giết ' +
           'chương trình.',
      crit: [
        'Khẳng định <code>sigaction</code> <b>giữ nguyên</b> handler qua các lần chuyển phát',
        'Chỉ ra phát biểu đúng với <code>signal()</code> kiểu System V (hoặc với cờ <code>SA_RESETHAND</code>)',
        'Nêu được lý do phải dùng <code>sigaction</code>: <code>signal()</code> có ngữ nghĩa khác nhau giữa các hệ, và <b>trên glibc thì nó lại chạy đúng</b> nên lỗi chỉ lộ ra trên thư viện C của thiết bị',
        'Nhắc được khe hở nguy hiểm khi phải đăng ký lại giữa chừng'
      ],
      sol: '<p><b>Phát biểu sai với <code>sigaction</code>, nhưng đúng với ' +
           '<code>signal()</code> kiểu System V.</b> Viết lại: <i>"Handler đăng ký bằng ' +
           '<code>sigaction</code> giữ nguyên qua mọi lần chuyển phát; chỉ khi bạn đặt cờ ' +
           '<code>SA_RESETHAND</code> thì nó mới bị đặt lại về mặc định sau lần đầu."</i></p>' +
           '<p><b>Vì sao đây là cái bẫy tồi tệ nhất trong cả bài.</b> Trên Linux + glibc, ' +
           '<code>signal()</code> được cài đặt theo ngữ nghĩa BSD — nghĩa là nó <i>cũng</i> ' +
           'giữ handler, <i>cũng</i> tự chặn tín hiệu cùng loại trong lúc handler chạy. Vậy ' +
           'nên chương trình dùng <code>signal()</code> chạy hoàn hảo trên máy phát triển ' +
           'của bạn. Đem sang một thư viện C khác trên thiết bị — uClibc cũ, hoặc một Unix ' +
           'thương mại — ngữ nghĩa System V trở lại, và chương trình chết ở tín hiệu thứ ' +
           'hai. Đây là lý do quy tắc "luôn dùng <code>sigaction</code>" là tuyệt đối chứ ' +
           'không phải sở thích: <b>lỗi này không tái hiện được ở nơi bạn có thể gỡ.</b></p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết', truc: 2,
      q: 'Với tín hiệu chuẩn (số 1–31), nhân giữ cho mỗi <b>số hiệu</b> đúng ' +
         '<b>____</b> bit "đang treo". Vì thế gửi <code>SIGUSR1</code> mười lần trong lúc nó ' +
         'đang bị chặn thì khi bỏ chặn, handler chạy đúng <b>____</b> lần.',
      a: ['1', 'một', '1 / 1', 'một / một', '1, 1', 'một, một', '1 va 1', '1 và 1'],
      ph: 'ví dụ: 1',
      why: 'Bảng "đang treo" là một <b>tập bit</b>, không phải hàng đợi. Bật một bit đã bật ' +
           'sẵn thì không có gì xảy ra — nhân không đếm. Chương trình ' +
           '<code>no_queue</code> in ra đúng điều đó: <code>sent 10 while blocked, hits = ' +
           '0</code> rồi <code>after unblocking, hits = 1</code>. Đây cũng là lý do handler ' +
           '<code>SIGCHLD</code> bắt buộc phải là <code>while</code> chứ không phải ' +
           '<code>if</code>: năm đứa con chết gần nhau chỉ sinh ra một lần chuyển phát. ' +
           '(Tín hiệu thời gian thực 32–64 <i>có</i> xếp hàng, nhưng bài này không dùng.)' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi tín hiệu với mô tả đúng của nó.',
      left: ['SIGINT', 'SIGTERM', 'SIGKILL', 'SIGCHLD', 'SIGPIPE', 'SIGSEGV'],
      right: [
        'Ghi vào một ống mà đầu đọc đã đóng — mặc định là chết im lặng, mã thoát 141',
        'Nhân phát khi tiến trình chạm vào địa chỉ không hợp lệ — mặc định sinh core dump',
        'Yêu cầu dừng lịch sự, bắt được; là tín hiệu mặc định của lệnh <code>kill</code> và của <code>systemd</code>',
        'Cưỡng chế dừng, không bắt / chặn / bỏ qua được, mã thoát 137',
        'Nhân báo cho tiến trình cha biết một đứa con vừa đổi trạng thái — mặc định bị bỏ qua',
        'Terminal gửi tới cả nhóm tiền cảnh khi bạn nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd>'
      ],
      a: [5, 2, 3, 4, 0, 1],
      why: 'Ba cặp hay bị lẫn. <b>SIGINT và SIGTERM</b>: cả hai đều bắt được và đều là "lời ' +
           'đề nghị", nhưng SIGINT đến từ <i>terminal</i> và đi tới cả nhóm tiền cảnh, còn ' +
           'SIGTERM đến từ một tiến trình khác và chỉ đi tới đúng PID bạn chỉ định. ' +
           '<b>SIGCHLD</b> là tín hiệu duy nhất trong danh sách có hành vi mặc định là ' +
           '<i>bỏ qua</i> — đó là lý do zombie tích lại mà chương trình không hề bị làm ' +
           'phiền. <b>SIGPIPE</b> là thứ khiến một daemon mạng "tự nhiên biến mất" khi phía ' +
           'bên kia ngắt kết nối: không log, không lỗi, chỉ có mã thoát 141.' }
  ],
  B: [
    { id: 'b1', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 6, truc: 0,
      q: 'Một đồng nghiệp gửi bạn đoạn tin nhắn dưới đây để bảo vệ việc anh ấy gọi ' +
         '<code>printf</code> trong handler. <b>Mọi số liệu anh ấy đưa ra đều đúng và đều ' +
         'đo thật.</b> Hãy chỉ ra chỗ <b>suy luận</b> hỏng, và nói xem kết luận đúng phải là ' +
         'gì.',
      blocks: [
        { t: 'cal', kind: 'info', title: 'Tin nhắn của đồng nghiệp', x:
          '"Tôi biết sách bảo không được gọi <code>printf</code> trong handler. Nhưng tôi đã ' +
          'thử: một chương trình gọi <code>malloc</code> trong handler, bắn <b>4000</b> tín ' +
          'hiệu <code>SIGUSR1</code> liên tiếp trong lúc vòng lặp chính cũng ' +
          '<code>malloc</code> hết tốc lực. Không treo, không sập, ' +
          '<code>/proc/&lt;pid&gt;/status</code> vẫn báo <code>State: R (running)</code>. ' +
          'Bốn nghìn lần không lỗi thì tôi coi là an toàn — chúng ta có deadline."' }
      ],
      hint: 'Câu hỏi không phải "anh ấy đo có đúng không" mà là "từ 4000 lần không lỗi thì ' +
            'suy ra được điều gì". Hãy nghĩ tới độ rộng của cửa sổ nguy hiểm, và tới số lần ' +
            'thiết bị chạy trong ba năm.',
      crit: [
        'Chỉ đúng lỗi suy luận: <b>không quan sát thấy lỗi ≠ không có lỗi</b> — đây là suy luận từ vắng mặt bằng chứng',
        'Giải thích được vì sao xác suất thấp: cửa sổ hỏng chỉ rộng <b>vài chục nano giây</b> (khoảng thời gian giữa lúc hàm giành tài nguyên dùng chung và lúc nhả ra)',
        'Đổi được sang thang thời gian của thiết bị: một sự kiện xác suất rất nhỏ nhân với hàng triệu lần mỗi ngày trong nhiều năm là <b>sẽ xảy ra</b>',
        'Nêu được rằng hậu quả là <b>dữ liệu sai / treo không tái hiện được</b>, chứ không phải một crash có thể tìm ra',
        'Kết luận đúng: đây là lỗi <b>không test ra được</b>, nên phải viết đúng ngay từ đầu — dùng <code>write(2)</code> hoặc chỉ đặt cờ'
      ],
      sol: '<p><b>Số liệu đúng, suy luận sai.</b> Anh ấy đang dùng "không thấy lỗi" làm bằng ' +
           'chứng cho "không có lỗi". Nhưng đây là một <b>cuộc đua</b>, và cái được đo là ' +
           '<i>xác suất trúng</i>, không phải <i>sự tồn tại của lỗi</i>.</p>' +
           '<p><b>Vì sao 4000 lần là quá ít.</b> Cửa sổ nguy hiểm là khoảng thời gian giữa ' +
           'lúc <code>malloc</code> giành lấy cấu trúc heap dùng chung và lúc nó nhả ra — ' +
           'vài chục nano giây trên tổng số vài trăm nano giây của cả lời gọi. Xác suất một ' +
           'tín hiệu rơi đúng vào đó cỡ 10⁻² tới 10⁻³ cho <i>mỗi lần trùng</i>, và trên một ' +
           'máy để bàn nhàn rỗi thì hai luồng thậm chí hiếm khi ở trong hàm cùng lúc. Bốn ' +
           'nghìn phép thử trên một sự kiện như thế không nói lên gì cả.</p>' +
           '<p><b>Đổi sang thang thời gian của sản phẩm.</b> Một thiết bị chạy liên tục ba ' +
           'năm, xử lý một sự kiện mỗi giây, là gần <b>10⁸</b> lần. Một sự kiện xác suất ' +
           '10⁻⁸ mỗi lần thì <i>sẽ</i> xảy ra — và nó xảy ra ở nhà khách hàng, không phải ' +
           'trên bàn bạn.</p>' +
           '<p><b>Và hậu quả không phải là crash.</b> Đây là phần đáng sợ nhất. Nếu nó sập ' +
           'thì còn có core dump để đọc. Cái thực tế xảy ra là bộ nhớ hỏng âm thầm hoặc dữ ' +
           'liệu sai — Bài 21 dựng lại đúng cơ chế đó bằng một hàm tự viết dùng mảng ' +
           '<code>static</code>:</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: 'pid=9433\n' +
                'main expected "number is 42", actually got: "number is 999"',
          notes: ['<code>gcc -Wall -Wextra</code> im lặng, mã thoát 0, log trông bình thường. ' +
                  'Chỉ có giá trị là sai. Không công cụ nào báo động.'] },
        { t: 'cal', kind: 'danger', title: 'Kết luận đúng',
          x: '<p>Vì lỗi này <b>không test ra được</b>, "đã thử rồi không sao" không bao giờ ' +
             'là lập luận hợp lệ. Chỉ có hai cách viết đúng: gọi <code>write(2)</code> (nằm ' +
             'trong danh sách 199 hàm an toàn), hoặc — tốt hơn — handler chỉ đặt một cờ ' +
             '<code>static volatile sig_atomic_t</code> rồi trả về, và để luồng chính làm ' +
             'mọi việc thật với đầy đủ mọi hàm nó muốn.</p>' }
      ] },

    { id: 'b2', k: 'free', tag: 'Đọc output', rows: 6, truc: 1,
      q: 'Chương trình <code>ignore_vs_block</code> làm ba việc theo thứ tự: ' +
         '<b>(1)</b> đặt <code>SIG_IGN</code> cho <code>SIGUSR1</code> rồi tự gửi cho mình ' +
         '<b>5</b> lần; <b>(2)</b> cài một handler thật (đếm vào biến <code>hits</code>) và ' +
         'kiểm tra lại trạng thái treo; <b>(3)</b> gửi thêm <b>1</b> lần nữa trong lúc không ' +
         'chặn gì. Đây là output thật:',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '5 sent while SIG_IGN:      pending=no  hits=0\n' +
                'handler installed:         pending=no  hits=0\n' +
                '1 more sent, unblocked:    pending=no  hits=1' }
      ],
      hint: 'Chú ý dòng thứ hai. Handler vừa được cài xong — nếu 5 tín hiệu kia còn ở đâu ' +
            'đó thì đây chính là lúc chúng phải xuất hiện.',
      crit: [
        'Giải thích dòng 1: <code>SIG_IGN</code> khiến nhân <b>loại bỏ tại chỗ</b>, nên không có gì treo và <code>hits</code> đứng ở 0',
        'Giải thích dòng 2 là dòng quan trọng nhất: cài handler xong mà <code>hits</code> <b>vẫn</b> 0 và <code>pending</code> <b>vẫn</b> no ⇒ 5 tín hiệu kia đã <b>mất vĩnh viễn</b>, không được cất giữ ở đâu cả',
        'Giải thích dòng 3: khi bố trí là handler và không bị chặn, tín hiệu được chuyển phát ngay, <code>hits</code> lên 1',
        'Nói được kết quả sẽ khác thế nào nếu thay <code>SIG_IGN</code> bằng <code>sigprocmask(SIG_BLOCK, ...)</code>: <code>pending=yes</code> ở dòng 1–2, và <code>hits</code> nhảy lên <b>1</b> ngay khi bỏ chặn',
        'Không nói "chặn và bỏ qua giống nhau vì hits cuối cùng đều nhỏ"'
      ],
      sol: '<p><b>Dòng 2 là toàn bộ nội dung của thí nghiệm.</b> Handler vừa được cài xong. ' +
           'Nếu năm tín hiệu ở bước 1 được cất ở đâu đó, đây đúng là lúc chúng phải được ' +
           'chuyển phát. <code>hits=0</code> và <code>pending=no</code> nói rằng chúng ' +
           '<b>không tồn tại nữa</b>: khi bố trí là <code>SIG_IGN</code>, nhân nhìn thấy ' +
           'tín hiệu, thấy bố trí là "bỏ qua", và <b>vứt ngay tại chỗ</b> — không ghi vào ' +
           'bảng đang treo, không đếm, không để lại dấu vết.</p>' +
           '<p><b>Đối chiếu với bản chặn.</b> Nếu bước 1 dùng ' +
           '<code>sigprocmask(SIG_BLOCK, ...)</code> thay cho <code>SIG_IGN</code>, hai dòng ' +
           'đầu sẽ là <code>pending=<b>yes</b></code>: tín hiệu <i>có</i> nằm đó, trong bảng ' +
           'đang treo. Và giây phút bạn bỏ chặn, handler chạy — <code>hits</code> lên ' +
           '<b>1</b>, không phải 5 (đó là trục thứ ba, câu B3).</p>' +
           '<p><b>Bảng phân biệt cần thuộc:</b></p>' +
           '<table><thead><tr><th></th><th><code>sigprocmask</code> (chặn)</th>' +
           '<th><code>SIG_IGN</code> (bỏ qua)</th></tr></thead><tbody>' +
           '<tr><td>Tín hiệu đi đâu</td><td>Vào bảng <b>đang treo</b></td>' +
           '<td><b>Bị vứt</b> ngay</td></tr>' +
           '<tr><td>Lấy lại được không</td><td><b>Có</b> — bỏ chặn là nó tới</td>' +
           '<td><b>Không</b> — vĩnh viễn</td></tr>' +
           '<tr><td>Dùng khi nào</td><td>Bảo vệ một vùng tới hạn <b>ngắn</b></td>' +
           '<td>Khi bạn thật sự không quan tâm, ví dụ <code>SIGPIPE</code></td></tr>' +
           '<tr><td>Con của <code>fork</code></td><td>Kế thừa mặt nạ ⇒ <b>phải bỏ chặn</b> sau <code>fork</code></td>' +
           '<td>Kế thừa <code>SIG_IGN</code> qua cả <code>exec</code></td></tr>' +
           '</tbody></table>' +
           '<p><b>Hệ quả thực tế của dòng cuối bảng</b>: một tiến trình đặt ' +
           '<code>SIG_IGN</code> cho <code>SIGINT</code> rồi <code>exec</code> chương trình ' +
           'khác thì chương trình mới cũng không nhận được <kbd>Ctrl</kbd>+<kbd>C</kbd> — nó ' +
           '"thừa kế" sự điếc đó mà không hề biết.</p>' },

    { id: 'b3', k: 'free', tag: 'Đọc output', rows: 6, truc: 2,
      q: 'Một tiến trình đang chặn <code>SIGUSR1</code> và ngủ trong <code>sleep(30)</code>. ' +
         'Bạn đọc <code>/proc/&lt;pid&gt;/status</code> ở ba thời điểm: trước khi gửi gì, sau ' +
         'khi gửi <b>1</b> lần <code>SIGUSR1</code>, và sau khi gửi thêm <b>3</b> lần nữa ' +
         '(tổng 4). Đây là bản ghi thật:',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '--- A. nothing sent yet:\n' +
                'State:\tS (sleeping)\n' +
                'SigPnd:\t0000000000000000\n' +
                'ShdPnd:\t0000000000000000\n' +
                'SigBlk:\t0000000000000200\n' +
                'SigIgn:\t0000000000000004\n' +
                'SigCgt:\t0000000000004002\n' +
                '\n' +
                '--- B. after 1 SIGUSR1:\n' +
                'SigPnd:\t0000000000000000\n' +
                'ShdPnd:\t0000000000000200\n' +
                '\n' +
                '--- C. after 3 more (4 total):\n' +
                'ShdPnd:\t0000000000000200' }
      ],
      hint: 'Bit thứ <i>n</i> (đếm từ 0) của mỗi từ tương ứng với tín hiệu số <i>n</i>+1. ' +
            'Và hãy so kỹ hai dòng cuối cùng với nhau.',
      crit: [
        'Giải mã đúng ít nhất hai mặt nạ: <code>0x200</code> = bit 9 = tín hiệu <b>10 = SIGUSR1</b>; <code>0x4002</code> = bit 1 + bit 14 = tín hiệu <b>2 (SIGINT)</b> + <b>15 (SIGTERM)</b>',
        'Đọc đúng ý nghĩa hàng: <code>SigBlk</code> = đang chặn, <code>SigCgt</code> = có handler riêng, <code>SigIgn</code> = đang bỏ qua, <code>ShdPnd</code> = đang treo',
        'Nêu được kết luận chính: <b>C giống hệt B</b> — gửi 4 lần và gửi 1 lần cho <i>cùng một</i> giá trị, vì đây là một <b>tập bit</b> chứ không phải hàng đợi',
        'Giải thích được vì sao <code>SigPnd</code> vẫn là 0 dù rõ ràng có tín hiệu đang treo: <code>kill(pid)</code> gửi tới <b>tiến trình</b> nên nằm ở <code>ShdPnd</code> (shared); <code>SigPnd</code> chỉ chứa tín hiệu gửi riêng cho <b>một luồng</b>',
        'Rút ra quy tắc kiểm tra: phải <code>grep</code> cả <code>SigPnd</code> lẫn <code>ShdPnd</code>, đọc thiếu một hàng sẽ kết luận sai "không có gì đang treo"'
      ],
      sol: '<p><b>Giải mã mặt nạ.</b> Mỗi từ là 64 bit ở dạng hex; bit thứ <i>n</i> đếm từ 0 ' +
           'ứng với tín hiệu số <i>n</i>+1.</p>' +
           '<ul>' +
           '<li><code>SigBlk: …0200</code> = bit 9 ⇒ tín hiệu <b>10 = SIGUSR1</b> đang bị chặn. Khớp với <code>sigprocmask(SIG_BLOCK, ...)</code> trong mã.</li>' +
           '<li><code>SigCgt: …4002</code> = bit 1 + bit 14 ⇒ tín hiệu <b>2 = SIGINT</b> và <b>15 = SIGTERM</b> có handler riêng.</li>' +
           '<li><code>SigIgn: …0004</code> = bit 2 ⇒ tín hiệu <b>3 = SIGQUIT</b> đang bị bỏ qua. <b>Chương trình không hề đặt cái này</b> — nó thừa hưởng từ bash, vì bash đặt <code>SIGINT</code> và <code>SIGQUIT</code> thành bỏ qua cho các tiến trình chạy nền. Một minh hoạ sống cho dòng cuối bảng ở câu B2.</li>' +
           '</ul>' +
           '<p><b>Kết luận thứ nhất — không xếp hàng.</b> Bản ghi B (một lần gửi) và bản ghi ' +
           'C (bốn lần gửi) <b>giống nhau từng ký tự</b>: <code>0000000000000200</code>. ' +
           'Bảng đang treo là một <i>tập bit</i>. Bật một bit đã bật thì không có gì xảy ra, ' +
           'nhân không có chỗ nào để đếm và cũng không cố đếm. Bỏ chặn lúc này thì handler ' +
           'chạy <b>một</b> lần, ba tín hiệu kia không tồn tại.</p>' +
           '<p><b>Kết luận thứ hai — cái bẫy <code>SigPnd</code>.</b> ' +
           '<code>SigPnd</code> vẫn là 0 dù rõ ràng đang có tín hiệu treo. Lý do: một tiến ' +
           'trình Linux có <b>hai</b> hàng chờ tín hiệu — một hàng riêng cho mỗi luồng ' +
           '(<code>SigPnd</code>) và một hàng dùng chung cho cả tiến trình ' +
           '(<code>ShdPnd</code>). <code>kill(pid, sig)</code> là gửi tới <i>tiến trình</i>, ' +
           'nên nó luôn rơi vào hàng chung; chỉ <code>pthread_kill()</code> mới đặt vào hàng ' +
           'riêng của một luồng. Ai chỉ <code>grep SigPnd</code> sẽ nhận một câu trả lời ' +
           '<b>sai mà trông rất giống câu trả lời đúng</b>: "không có gì đang treo". Luôn ' +
           'đọc cả hai:</p>' +
           '<pre><code>grep -E \'^(SigPnd|ShdPnd|SigBlk|SigIgn|SigCgt)\' /proc/$PID/status</code></pre>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: 'Chương trình <code>bad_reaper</code> sinh <b>5</b> con rồi dọn xác bằng một handler ' +
         '<code>SIGCHLD</code> viết <code>if (waitpid(-1, NULL, WNOHANG) &gt; 0) reaped++;</code>. ' +
         'Chạy <b>cùng một binary</b> hai lần liên tiếp cho hai kết quả khác nhau:',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '--- bad_reaper: parent_pid=419  zombies_at_t=2s = 2\n' +
                '    424     419 Z+   bad_reaper\n' +
                '    425     419 Z+   bad_reaper\n' +
                '   | parent pid=419, spawned 5 children\n' +
                '   | handler reaped 3 children\n' +
                '\n' +
                '--- bad_reaper: parent_pid=434  zombies_at_t=2s = 3\n' +
                '    438     434 Z+   bad_reaper\n' +
                '    439     434 Z+   bad_reaper\n' +
                '    440     434 Z+   bad_reaper\n' +
                '   | parent pid=434, spawned 5 children\n' +
                '   | handler reaped 2 children\n' +
                '\n' +
                '--- good_reaper: parent_pid=448  zombies_at_t=2s = 0\n' +
                '   | parent pid=448, spawned 5 children\n' +
                '   | handler reaped 5 children' },
        { t: 'p', x: '<code>good_reaper</code> khác <code>bad_reaper</code> đúng <b>một</b> ' +
                     'từ: <code>while</code> thay cho <code>if</code>.' }
      ],
      hint: 'Đừng chỉ trả lời "vì thiếu while". Câu hỏi là vì sao con số <b>dao động</b>, và ' +
            'vì sao nó không bao giờ là 5, cũng không bao giờ là 0.',
      crit: [
        'Giải thích được vì sao <b>không bao giờ đủ 5</b>: nhiều <code>SIGCHLD</code> gộp lại thành một lần chuyển phát, mà <code>if</code> chỉ gặt một xác cho mỗi lần chuyển phát',
        'Giải thích được vì sao <b>không bao giờ là 0</b>: ít nhất một lần chuyển phát chắc chắn xảy ra, và mỗi lần chuyển phát gặt được một xác',
        'Giải thích được <b>vì sao con số dao động</b>: số lần chuyển phát phụ thuộc vào việc bao nhiêu con kịp chết trong lúc handler đang chạy — đó là một cuộc đua do bộ lập lịch quyết định, khác nhau mỗi lần chạy',
        'Nêu đúng tổng bất biến: <code>reaped</code> + <code>zombie còn lại</code> = <b>5</b> ở cả hai lần chạy',
        'Nói được vì sao <code>while</code> chữa được: nó vét sạch mọi xác <i>sẵn có</i> trong một lần chuyển phát, và <code>WNOHANG</code> bảo đảm vòng lặp thoát khi hết'
      ],
      sol: '<p><b>Bất biến trước đã.</b> Lần 1: gặt 3 + còn 2 = 5. Lần 2: gặt 2 + còn 3 = 5. ' +
           'Không con nào biến mất, chỉ là ai dọn hay không dọn.</p>' +
           '<p><b>Vì sao không bao giờ đủ 5.</b> Tín hiệu chuẩn không xếp hàng. Năm đứa con ' +
           'chết gần như cùng lúc sinh ra năm <code>SIGCHLD</code>, nhưng nhân chỉ có một ' +
           'bit treo cho số hiệu 17 — những cái tới trong lúc bit đã bật sẽ tan biến. Handler ' +
           'chạy <i>k</i> lần với <i>k</i> &lt; 5, và với <code>if</code> thì mỗi lần chỉ gặt ' +
           'đúng một xác.</p>' +
           '<p><b>Vì sao không bao giờ là 0.</b> Ít nhất một lần chuyển phát luôn xảy ra, nên ' +
           'luôn gặt được ít nhất một.</p>' +
           '<p><b>Vì sao con số nhảy giữa 2 và 3.</b> Đây là phần đáng giá nhất. Số lần ' +
           'chuyển phát <i>k</i> bằng số "đợt" mà bit treo được bật rồi tiêu thụ, và điều đó ' +
           'phụ thuộc hoàn toàn vào việc <b>bao nhiêu đứa con kịp chết trong lúc handler ' +
           'đang chạy</b> — một cuộc đua giữa năm tiến trình và bộ lập lịch trên máy sáu ' +
           'nhân. Không có gì trong mã quyết định điều đó. Đây chính là dấu hiệu nhận dạng ' +
           'của <b>race condition</b>: cùng mã, cùng đầu vào, kết quả khác nhau. Nếu bạn viết ' +
           'test khẳng định <code>reaped == 3</code>, nó sẽ đỏ ngẫu nhiên trong CI và bạn sẽ ' +
           'đi đổ lỗi cho CI.</p>' +
           '<p><b>Vì sao <code>while</code> chữa được triệt để.</b> Handler không hỏi "có ' +
           'đúng một xác không" mà hỏi "còn xác nào không" cho tới khi hết:</p>' +
           '<pre><code>while (waitpid(-1, NULL, WNOHANG) &gt; 0)\n' +
           '    reaped++;</code></pre>' +
           '<p>Bây giờ số <i>lần</i> chuyển phát không còn quan trọng: dù handler chỉ chạy ' +
           'một lần, nó vẫn dọn hết những gì đã chết tính tới thời điểm đó. <b>Đo được: 5 ' +
           'gặt, 0 zombie, ổn định 4/4 lần chạy.</b> <code>WNOHANG</code> là phần không thể ' +
           'thiếu — không có nó, <code>waitpid</code> sẽ ngồi <i>chờ</i> đứa con tiếp theo ' +
           'ngay bên trong handler, và chương trình đứng hình.</p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Một chương trình gọi <code>alarm(1)</code> rồi <code>sleep(5)</code>, và có handler ' +
         'cho <code>SIGALRM</code>. Nó đo thời gian thực tế đã ngủ và giá trị ' +
         '<code>sleep</code> trả về:',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./sleepret\n' +
                'sleep(5) interrupted after 1.000 s, returned 3\n' +
                '$ ./sleepret\n' +
                'sleep(5) interrupted after 1.000 s, returned 3' }
      ],
      hint: 'Hai câu hỏi tách rời nhau: <b>(a)</b> vì sao <code>sleep</code> thoát sớm dù ' +
            'handler đã đăng ký với <code>SA_RESTART</code>; <b>(b)</b> vì sao trả về 3 chứ ' +
            'không phải 4.',
      crit: [
        'Nêu đúng: <code>SA_RESTART</code> <b>không</b> áp dụng cho <code>sleep</code>/<code>poll</code>/<code>select</code>/<code>clock_nanosleep</code> — chỉ cho nhóm vào/ra "chậm" như <code>read</code> trên terminal hay socket',
        'Nêu đúng vì sao đó là điều <b>tốt</b>: nhờ vậy chương trình đang ngủ dở thoát ngay khi có tín hiệu, thay vì ngủ nốt',
        'Trả lời được vế (b): ngủ 1,000 s trong tổng 5 s thì còn <b>4</b> s, nhưng hàm trả về <b>3</b>',
        'Giải thích được chênh lệch: <code>sleep()</code> của glibc trả về số giây còn lại đã bị <b>cắt phần lẻ</b> (làm tròn xuống), nên 3,999… s thành 3',
        'Rút ra hệ quả: không được dùng giá trị trả về của <code>sleep()</code> để ngủ tiếp cho đủ — sẽ hụt gần một giây mỗi lần bị ngắt'
      ],
      sol: '<p><b>(a) Vì sao thoát sớm.</b> <code>SA_RESTART</code> chỉ khởi động lại một ' +
           'nhóm lời gọi hệ thống nhất định — chủ yếu là vào/ra "chậm" như <code>read</code> ' +
           'trên terminal hay socket. Các lời gọi <b>có thời hạn</b> (<code>sleep</code>, ' +
           '<code>poll</code>, <code>select</code>, <code>clock_nanosleep</code>) cố tình ' +
           'nằm ngoài, vì khởi động lại chúng sẽ nhân đôi thời gian chờ một cách sai lệch. ' +
           'Trong <code>strace</code> bạn thấy đúng dấu vết đó: ' +
           '<code>ERESTART_RESTARTBLOCK (Interrupted by signal)</code>.</p>' +
           '<p><b>Và đây là tính năng, không phải khiếm khuyết.</b> Chính nhờ nó mà một ' +
           'daemon đang ở giữa nhịp nghỉ 10 giây thoát <i>ngay</i> khi nhận ' +
           '<code>SIGTERM</code>, thay vì bắt <code>systemd</code> đợi hết nhịp. Đây là nền ' +
           'tảng của "tắt êm mà vẫn nhanh".</p>' +
           '<p><b>(b) Vì sao trả về 3 chứ không phải 4.</b> Ngủ đúng 1,000 s trong tổng 5 s ' +
           'thì phần còn lại là ~3,999 s. <code>sleep()</code> của glibc khai báo trả về ' +
           '<code>unsigned int</code> <b>giây</b>, và nó <b>cắt phần lẻ</b> chứ không làm ' +
           'tròn — 3,999 thành 3.</p>' +
           '<p><b>Hệ quả bạn phải nhớ.</b> Mẫu quen tay <code>unsigned left = sleep(5); if ' +
           '(left) sleep(left);</code> <b>hụt gần một giây mỗi lần bị ngắt</b>. Nếu vòng lặp ' +
           'của bạn bị tín hiệu ngắt thường xuyên, sai số này cộng dồn không giới hạn. Cần ' +
           'chính xác thì dùng <code>clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, ...)</code> ' +
           'với một mốc <b>tuyệt đối</b>: bị ngắt bao nhiêu lần cũng vẫn thức dậy đúng lúc.</p>' },

    { id: 'b6', k: 'free', tag: 'So sánh cặp', rows: 5,
      q: 'Cả <code>signal()</code> lẫn <code>sigaction()</code> đều đăng ký được một bộ xử ' +
         'lý, và trên máy WSL2 của bạn cả hai <b>đều chạy đúng như nhau</b>. Vậy trong tất ' +
         'cả các khác biệt giữa chúng, <b>khác biệt nào là khác biệt đáng kể</b> đối với ' +
         'người viết phần mềm nhúng? Nêu một, và nói vì sao nó quan trọng hơn những cái còn ' +
         'lại.',
      hint: 'Câu hỏi đã cho bạn manh mối lớn nhất: "trên máy của bạn cả hai đều chạy đúng ' +
            'như nhau". Hãy hỏi tiếp: còn trên thiết bị thì sao?',
      crit: [
        'Chọn đúng khác biệt cốt lõi: <code>signal()</code> có <b>ngữ nghĩa không xác định giữa các hệ</b> (BSD giữ handler và tự chặn; System V đặt lại về mặc định và không chặn), còn <code>sigaction</code> được POSIX định nghĩa chính xác',
        'Nói rõ vì sao điều đó nguy hiểm <i>hơn</i> mọi khác biệt khác: trên Linux + glibc thì <code>signal()</code> chạy <b>đúng</b>, nên lỗi <b>không lộ ra ở nơi bạn có thể gỡ</b>',
        'Mô tả được hậu quả cụ thể trên thiết bị dùng thư viện C khác: handler bị đặt lại sau lần đầu, tín hiệu thứ hai giết chương trình',
        'Nhắc được ít nhất một khác biệt kỹ thuật khác và nói rõ nó <b>ít quan trọng hơn</b>: <code>sa_mask</code> (chặn thêm tín hiệu khác trong lúc handler chạy), các cờ <code>SA_RESTART</code>/<code>SA_NOCLDSTOP</code>/<code>SA_SIGINFO</code>',
        'Kết luận thành một quy tắc: dùng <code>sigaction</code> <b>luôn</b>, kể cả cho trường hợp đơn giản nhất'
      ],
      sol: '<p><b>Khác biệt đáng kể: <code>signal()</code> không có một ngữ nghĩa duy nhất, ' +
           'và cái sai của nó vô hình trên máy phát triển.</b></p>' +
           '<p>Có hai truyền thống. <b>BSD</b>: handler ở nguyên sau lần chuyển phát đầu, và ' +
           'tín hiệu cùng loại tự động bị chặn trong lúc handler chạy. <b>System V</b>: bố ' +
           'trí bị đặt lại về mặc định ngay trước khi handler chạy, và không chặn gì cả. ' +
           'Cùng một dòng <code>signal(SIGTERM, h)</code>, hai hành vi khác hẳn.</p>' +
           '<p><b>Vì sao đây là khác biệt nguy hiểm nhất chứ không chỉ là khác biệt lớn ' +
           'nhất.</b> Linux + glibc chọn ngữ nghĩa BSD. Nghĩa là chương trình dùng ' +
           '<code>signal()</code> chạy <i>hoàn hảo</i> trên WSL2 của bạn, qua hết mọi test, ' +
           'qua hết code review. Nạp lên thiết bị chạy một thư viện C khác — uClibc cũ, hoặc ' +
           'một Unix thương mại — ngữ nghĩa System V trở lại và:</p>' +
           '<ul>' +
           '<li>Tín hiệu <b>thứ hai</b> giết chương trình, vì bố trí đã về mặc định.</li>' +
           '<li>Nếu bạn đăng ký lại trong handler để chữa, vẫn còn một <b>khe hở</b> giữa ' +
           'lúc bị đặt lại và lúc đăng ký xong — tín hiệu rơi vào đó vẫn giết chương trình, ' +
           'chỉ là hiếm hơn.</li>' +
           '</ul>' +
           '<p>Một lỗi chỉ xuất hiện trên phần cứng đích, không tái hiện được trên bàn, và ' +
           'phụ thuộc thời điểm. Đó là loại lỗi đắt nhất trong nghề.</p>' +
           '<p><b>Những khác biệt khác — có thật, nhưng nhỏ hơn</b> vì chúng chỉ là tiện ' +
           'nghi, còn cái trên là tính đúng đắn: <code>sa_mask</code> cho phép chặn thêm ' +
           'những tín hiệu khác trong lúc handler chạy; <code>SA_RESTART</code> chọn có khởi ' +
           'động lại syscall hay không; <code>SA_NOCLDSTOP</code> lọc bớt ' +
           '<code>SIGCHLD</code> khi con chỉ bị dừng chứ không chết; ' +
           '<code>SA_SIGINFO</code> cho handler biết ai gửi. Đều hữu ích, đều không cứu bạn ' +
           'khỏi vấn đề trên.</p>' +
           '<p><b>Quy tắc:</b> dùng <code>sigaction</code> cho mọi trường hợp, kể cả ' +
           '"chỉ bắt <kbd>Ctrl</kbd>+<kbd>C</kbd> thôi mà". Ba dòng dài hơn, và bạn không ' +
           'bao giờ phải quay lại nghĩ về nó nữa.</p>' }
  ],
  C: [
    { id: 'c1', k: 'free', tag: 'Tình huống mới', rows: 7, truc: 0,
      q: 'Bạn tiếp quản firmware của một <b>bộ ghi dữ liệu ngoài đồng</b>: SoC ARM Cortex-A7, ' +
         '<b>64 MB</b> RAM, thẻ SD công nghiệp, chạy liên tục nhiều tháng không ai đụng tới. ' +
         'Nó ghi một mẫu cảm biến mỗi 100 ms vào một tệp qua <code>fprintf</code> (stdio có ' +
         'đệm). Người viết trước để lại handler <code>SIGTERM</code> dưới đây, kèm bình luận ' +
         '<i>"đã chạy tốt hai năm nay"</i>. Hãy đánh giá nó, rồi <b>viết lại</b> phần khung ' +
         'cho đúng.',
      blocks: [
        { t: 'code', where: 'wsl', nocopy: true,
          code: 'static FILE *log_fp;\n' +
                '\n' +
                'static void on_term(int sig)\n' +
                '{\n' +
                '    fprintf(log_fp, "shutdown requested by signal %d\\n", sig);\n' +
                '    fflush(log_fp);\n' +
                '    fclose(log_fp);\n' +
                '    syslog(LOG_INFO, "logger stopped cleanly");\n' +
                '    exit(0);\n' +
                '}' }
      ],
      hint: 'Ba trong bốn lời gọi trong handler này nằm ngoài danh sách 199 hàm ' +
            'async-signal-safe. Hãy nghĩ kỹ về việc <b>vòng lặp chính đang ở đâu</b> khi ' +
            'tín hiệu tới.',
      crit: [
        'Chỉ ra <code>fprintf</code>/<code>fflush</code>/<code>fclose</code>/<code>syslog</code>/<code>exit</code> đều <b>không</b> async-signal-safe',
        'Nêu đúng kịch bản hỏng cụ thể: vòng lặp chính đang ở giữa <code>fprintf</code> và giữ khoá của <code>FILE*</code> ⇒ handler gọi <code>fprintf</code> trên <b>cùng</b> luồng ⇒ <b>deadlock</b>, hoặc bộ đệm bị ghi lẫn / ghi hai lần',
        'Nói được vì sao "hai năm không sao" không chứng minh gì (nối lại với B1): cửa sổ hẹp, và thiết bị ngoài đồng thì rất hiếm khi nhận <code>SIGTERM</code>',
        'Nêu được hậu quả riêng của tình huống này: <code>SIGTERM</code> gần như chỉ đến lúc <b>mất điện / tắt máy</b> — đúng lúc treo là mất luôn dữ liệu chưa flush, và không ai ở đó để xem',
        'Viết lại đúng khung: handler chỉ đặt <code>static volatile sig_atomic_t stop = 1;</code> (có thể kèm <code>write(2)</code>), vòng lặp chính kiểm tra cờ rồi mới <code>fflush</code>/<code>fclose</code>/thoát',
        'Đặt <code>SA_RESTART</code> hoặc xử lý <code>EINTR</code> cho lời gọi vào/ra trong vòng lặp chính'
      ],
      sol: '<p><b>Bốn trong năm lời gọi là bất hợp pháp trong handler.</b> ' +
           '<code>fprintf</code>, <code>fflush</code>, <code>fclose</code> đều thao tác trên ' +
           'cấu trúc <code>FILE*</code> có khoá và bộ đệm dùng chung; <code>syslog</code> giữ ' +
           'trạng thái tĩnh riêng và có thể gọi <code>malloc</code>; <code>exit()</code> chạy ' +
           'các hàm <code>atexit</code> và xả mọi luồng stdio. Chỉ mình ' +
           '<code>_exit()</code> là an toàn — và nó không có trong mã.</p>' +
           '<p><b>Kịch bản hỏng, cụ thể.</b> Vòng lặp chính gọi <code>fprintf</code> mỗi ' +
           '100 ms. Giả sử <code>SIGTERM</code> tới đúng lúc nó đang ở <i>bên trong</i> ' +
           '<code>fprintf</code> và đã giành khoá của <code>log_fp</code>. Handler chạy ' +
           '<b>trên chính luồng đó</b>, gọi <code>fprintf</code>, đòi cái khoá mà chính nó ' +
           'đang giữ, và ngồi chờ mãi mãi một luồng không bao giờ chạy tiếp được. ' +
           '<b>Deadlock trong tiến trình tắt máy.</b> Biến thể nhẹ hơn nhưng khó chịu hơn: ' +
           'bộ đệm bị hai bên ghi xen ⇒ dòng log rách đôi hoặc một mẫu bị ghi hai lần vào thẻ ' +
           'SD.</p>' +
           '<p><b>Vì sao "hai năm nay không sao".</b> Vòng lặp chỉ ở trong ' +
           '<code>fprintf</code> vài chục micro giây trong mỗi 100 ms — cửa sổ hỏng rộng ' +
           'khoảng 0,05 %. Mà thiết bị ngoài đồng thì mấy khi nhận <code>SIGTERM</code>. Số ' +
           'phép thử gần như bằng không, nên "không thấy lỗi" hoàn toàn không nói lên điều ' +
           'gì — đúng như câu B1.</p>' +
           '<p><b>Và đây là chỗ nó cắn.</b> <code>SIGTERM</code> đến gần như chỉ vào lúc ' +
           'nguồn sắp mất hoặc hệ thống đang tắt. Nếu treo lúc đó thì watchdog hoặc ' +
           '<code>SIGKILL</code> sẽ dứt tiến trình sau vài giây, <b>bộ đệm chưa xả bị mất</b> ' +
           '— và không có ai ngoài đồng để nhìn thấy chuyện gì đã xảy ra. Bạn phát hiện khi ' +
           'thu thẻ SD về, thấy tệp cụt.</p>' +
           '<p><b>Khung viết lại:</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: 'static volatile sig_atomic_t stop_requested = 0;\n' +
                '\n' +
                'static void on_term(int sig)\n' +
                '{\n' +
                '    (void)sig;\n' +
                '    stop_requested = 1;          /* the only thing a handler should do */\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    struct sigaction sa;\n' +
                '    memset(&sa, 0, sizeof sa);\n' +
                '    sa.sa_handler = on_term;\n' +
                '    sigemptyset(&sa.sa_mask);\n' +
                '    sa.sa_flags = SA_RESTART;\n' +
                '    sigaction(SIGTERM, &sa, NULL);\n' +
                '    sigaction(SIGINT,  &sa, NULL);\n' +
                '\n' +
                '    while (!stop_requested) {\n' +
                '        read_sensor_and_log();   /* fprintf lives here, in normal context */\n' +
                '        sleep_100ms();\n' +
                '    }\n' +
                '\n' +
                '    /* normal context again: every libc function is legal here */\n' +
                '    fflush(log_fp);\n' +
                '    fclose(log_fp);\n' +
                '    syslog(LOG_INFO, "logger stopped cleanly");\n' +
                '    return 0;\n' +
                '}',
          notes: ['Handler còn <b>một</b> dòng. Mọi việc thật diễn ra ở ngữ cảnh bình thường, ' +
                  'nơi không có hàm nào bị cấm.',
                  '<code>sleep_100ms()</code> bị ngắt sẽ trả về sớm — đó chính là điều ta ' +
                  'muốn: thiết bị phản hồi lệnh tắt trong vài mili giây thay vì tối đa 100 ms.'] }
      ] },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', rows: 7, truc: 1,
      q: 'Một bộ cập nhật firmware OTA nhận gói qua mạng rồi ghi vào flash. Người viết muốn ' +
         '<b>không bị làm phiền trong lúc ghi</b>, nên đặt như dưới đây. Hệ thống ' +
         '<code>systemd</code> gửi <code>SIGTERM</code>, chờ <b>90 s</b>, rồi gửi ' +
         '<code>SIGKILL</code>. Triệu chứng ngoài hiện trường: <b>thỉnh thoảng thiết bị ' +
         'không khởi động lại được sau khi người dùng bấm "Restart" trên giao diện web</b>, ' +
         'và log cuối cùng luôn dừng giữa chừng.',
      blocks: [
        { t: 'code', where: 'wsl', nocopy: true,
          code: 'signal(SIGTERM, SIG_IGN);        /* do not disturb */\n' +
                'signal(SIGINT,  SIG_IGN);\n' +
                '\n' +
                'write_firmware_to_flash();       /* takes 20 to 180 seconds */\n' +
                '\n' +
                'signal(SIGTERM, SIG_DFL);        /* ok, you may disturb me now */\n' +
                'signal(SIGINT,  SIG_DFL);' },
        { t: 'p', x: 'Hãy nói <b>vì sao</b> hỏng, vì sao triệu chứng lại là "thỉnh thoảng", ' +
                     'và sửa lại.' }
      ],
      hint: 'Ý định của tác giả (hoãn việc tắt tới khi ghi xong) là đúng. Công cụ anh ấy ' +
            'chọn làm một việc khác hẳn. Chuyện gì xảy ra với <code>SIGTERM</code> đến vào ' +
            'giây thứ 40?',
      crit: [
        'Chẩn đoán đúng: <code>SIG_IGN</code> khiến nhân <b>vứt</b> tín hiệu, nên yêu cầu tắt <b>biến mất vĩnh viễn</b>; khi đặt lại <code>SIG_DFL</code> thì không có gì được chuyển phát',
        'Nói rõ tác giả cần <b>hoãn</b> (chặn) chứ không phải <b>vứt</b> (bỏ qua)',
        'Giải thích được vì sao "thỉnh thoảng": chỉ hỏng khi <code>SIGTERM</code> rơi đúng vào cửa sổ 20–180 s đang ghi; tới trước hoặc sau cửa sổ đó thì mọi thứ bình thường',
        'Nối được với triệu chứng thật: <code>systemd</code> không thấy tiến trình thoát ⇒ hết 90 s ⇒ <code>SIGKILL</code> ⇒ <b>cắt ngang giữa lúc ghi flash</b> ⇒ ảnh firmware hỏng, log cụt',
        'Sửa đúng bằng <code>sigprocmask(SIG_BLOCK, ...)</code> quanh vùng ghi, rồi <code>SIG_UNBLOCK</code> — tín hiệu treo được chuyển phát ngay lúc bỏ chặn',
        'Nêu thêm được rằng nếu vùng tới hạn dài hơn thời hạn của <code>systemd</code> thì phải nới <code>TimeoutStopSec</code> hoặc chia nhỏ việc ghi — chặn không làm cho thời hạn dài ra'
      ],
      sol: '<p><b>Chẩn đoán.</b> Tác giả muốn <i>hoãn</i> việc tắt, nhưng ' +
           '<code>SIG_IGN</code> không hoãn — nó <b>vứt</b>. Nhân nhìn thấy ' +
           '<code>SIGTERM</code>, thấy bố trí là "bỏ qua", và loại bỏ ngay tại chỗ, không ghi ' +
           'vào bảng đang treo. Đến khi mã đặt lại <code>SIG_DFL</code>, <b>không còn gì để ' +
           'chuyển phát</b>. Yêu cầu tắt của người dùng đã bốc hơi. Đúng như dòng thứ hai của ' +
           'transcript ở câu B2: cài lại bố trí xong, <code>hits</code> vẫn bằng 0.</p>' +
           '<p><b>Vì sao "thỉnh thoảng".</b> Cửa sổ nguy hiểm là 20–180 s ghi flash. ' +
           '<code>SIGTERM</code> tới <i>trước</i> khi vào vùng đó thì tiến trình thoát bình ' +
           'thường; tới <i>sau</i> khi ra khỏi vùng đó cũng vậy. Chỉ tín hiệu rơi đúng vào ' +
           'giữa mới mất. Người dùng bấm "Restart" ngay lúc thanh tiến trình đang chạy thì ' +
           'trúng — nên bug này tương quan với hành vi người dùng chứ không phải với thời ' +
           'gian, và đó là lý do nó khó tái hiện trong phòng lab.</p>' +
           '<p><b>Vì sao hậu quả nặng đến thế.</b> Đây mới là phần đắt. ' +
           '<code>systemd</code> gửi <code>SIGTERM</code> rồi <i>đợi</i>. Tiến trình không ' +
           'bao giờ thoát vì nó không hề biết có ai yêu cầu. Hết 90 s, ' +
           '<code>systemd</code> gửi <code>SIGKILL</code> — không thể bắt, không thể chặn, ' +
           'không có một dòng mã nào chạy thêm. Nếu lúc đó đang ở giữa một chu kỳ xoá/ghi ' +
           'flash thì <b>ảnh firmware hỏng dở dang</b> và thiết bị không boot lên được. Log ' +
           'cụt vì bộ đệm chưa kịp xả. Nghịch lý cay đắng: dòng mã viết ra để ' +
           '<i>bảo vệ</i> việc ghi flash chính là dòng làm hỏng nó.</p>' +
           '<p><b>Sửa — chặn, không bỏ qua:</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: 'sigset_t block, old;\n' +
                '\n' +
                'sigemptyset(&block);\n' +
                'sigaddset(&block, SIGTERM);\n' +
                'sigaddset(&block, SIGINT);\n' +
                '\n' +
                'sigprocmask(SIG_BLOCK, &block, &old);   /* defer, do not discard */\n' +
                'write_firmware_to_flash();\n' +
                'sigprocmask(SIG_SETMASK, &old, NULL);   /* pending signal fires right here */',
          notes: ['Dòng cuối là chỗ handler (hoặc hành vi mặc định) chạy — <b>ngay tại lúc bỏ ' +
                  'chặn</b>, không sớm hơn một chỉ thị nào, không muộn hơn một chỉ thị nào.',
                  '<code>SIG_SETMASK</code> với <code>old</code> tốt hơn ' +
                  '<code>SIG_UNBLOCK</code>: nó khôi phục đúng mặt nạ trước đó, nên hàm này ' +
                  'lồng vào hàm khác cũng không phá mặt nạ của người gọi.'] },
        { t: 'cal', kind: 'warn', title: 'Chặn không làm thời hạn dài ra',
          x: '<p>Nếu <code>write_firmware_to_flash()</code> có thể chạy 180 s mà ' +
             '<code>TimeoutStopSec</code> của <code>systemd</code> là 90 s, thì bản sửa trên ' +
             '<i>vẫn</i> ăn <code>SIGKILL</code> — chỉ khác là bây giờ nó ăn một cách trung ' +
             'thực. Vùng tới hạn dài hơn thời hạn là một vấn đề <b>thiết kế</b>: hoặc nới ' +
             '<code>TimeoutStopSec</code> trong unit file, hoặc chia việc ghi thành từng khối ' +
             'và kiểm tra cờ dừng giữa các khối. Quy tắc chung của <code>sigprocmask</code> ' +
             'vẫn đứng: <b>vùng chặn phải ngắn</b>.</p>' }
      ] },

    { id: 'c3', k: 'free', tag: 'Chẩn đoán', rows: 6, truc: 2,
      q: 'Một bộ đếm sự kiện công nghiệp: mạch phần cứng phát hiện mỗi lần sản phẩm đi qua ' +
         'băng chuyền và một tiến trình nhỏ gửi <code>SIGUSR1</code> tới tiến trình ghi log; ' +
         'handler của nó tăng biến đếm và ghi một dòng. Ở tốc độ chậm (vài sản phẩm mỗi ' +
         'giây) số liệu <b>khớp tuyệt đối</b> với máy đếm cơ. Khi nhà máy tăng tốc lên vài ' +
         'trăm sản phẩm mỗi giây, log báo <b>ít hơn hẳn</b> — có ca thiếu tới hơn một nửa. ' +
         'Không có thông báo lỗi nào, <code>kill</code> luôn trả về 0, CPU chỉ 12 %.',
      hint: 'CPU 12 % nghĩa là không phải quá tải. <code>kill</code> trả về 0 nghĩa là gửi ' +
            'thành công. Vậy tín hiệu đi đâu?',
      crit: [
        'Chẩn đoán đúng: tín hiệu chuẩn <b>không xếp hàng</b> — bảng đang treo chỉ là một tập bit, tín hiệu thứ hai tới khi bit đã bật sẽ <b>bị gộp mất</b>',
        'Giải thích được vì sao tốc độ chậm thì đúng: khoảng cách giữa hai sự kiện lớn hơn thời gian chuyển phát ⇒ bit kịp được tiêu thụ trước lần bật tiếp theo',
        'Giải thích được vì sao <code>kill</code> vẫn trả về 0: giá trị trả về chỉ xác nhận <b>gửi được</b>, hoàn toàn không nói gì về chuyện có được chuyển phát hay không',
        'Loại trừ được các giả thuyết sai và nói rõ lý do: không phải quá tải CPU (12 %), không phải mất quyền, không phải sai PID',
        'Đề xuất ít nhất một cách sửa <b>không dùng tín hiệu để đếm</b>: pipe/FIFO, socket, bộ đếm chia sẻ trong shared memory, hoặc <code>signalfd</code> + một bộ đếm mà bên gửi tự tăng',
        'Nêu được rằng tín hiệu thời gian thực (<code>SIGRTMIN</code>…<code>SIGRTMAX</code>) <b>có</b> xếp hàng, nhưng hàng đợi vẫn hữu hạn (<code>RLIMIT_SIGPENDING</code>) nên vẫn không phải là kênh truyền dữ liệu'
      ],
      sol: '<p><b>Chẩn đoán: tín hiệu bị gộp.</b> Bảng tín hiệu đang treo của một tiến trình ' +
           'là một <b>tập bit</b>, không phải một hàng đợi. Với tín hiệu chuẩn, bật một bit ' +
           'đã bật là một phép toán vô hiệu — nhân không có ô nhớ nào để tăng và cũng không ' +
           'cố đếm. Mười sự kiện tới trong lúc <code>SIGUSR1</code> đang treo cho ra ' +
           '<b>một</b> lần chạy handler.</p>' +
           '<p><b>Vì sao tốc độ chậm lại đúng.</b> Ở vài sản phẩm mỗi giây, khoảng cách giữa ' +
           'hai sự kiện (hàng trăm mili giây) lớn hơn rất nhiều so với thời gian nhân cần để ' +
           'chuyển phát và chạy handler (vài micro giây). Bit luôn kịp được tiêu thụ trước ' +
           'lần bật kế tiếp, nên không mất gì. Ở vài trăm sản phẩm mỗi giây, hai sự kiện có ' +
           'thể cách nhau vài mili giây và rơi vào cùng một cửa sổ treo — <b>hệ thống đúng ' +
           'trong lúc test và sai trong lúc sản xuất</b>, đúng cái hình dạng bug tệ nhất.</p>' +
           '<p><b>Vì sao không có thông báo lỗi nào.</b> <code>kill()</code> trả về 0 nghĩa ' +
           'là "tôi đã gửi được": PID hợp lệ, có quyền, bit đã bật. Nó tuyệt đối không hứa ' +
           'rằng tín hiệu sẽ được chuyển phát <i>một lần cho mỗi lần gọi</i>. Không có giá ' +
           'trị trả về nào, không có <code>errno</code> nào báo cho bạn biết một tín hiệu vừa ' +
           'bị gộp mất. Đây là loại mất mát <b>im lặng theo thiết kế</b>.</p>' +
           '<p>Đối chiếu với số đo trong bài: gửi 10 lần lúc đang chặn cho ' +
           '<code>hits = 1</code>; và bảng <code>/proc</code> ở câu B3 cho ' +
           '<code>ShdPnd</code> <b>y hệt nhau</b> sau 1 lần gửi và sau 4 lần gửi.</p>' +
           '<p><b>Loại trừ.</b> CPU 12 % ⇒ không phải quá tải, tiến trình không hề bị đói ' +
           'lịch. <code>kill</code> trả 0 ⇒ không sai PID, không thiếu quyền. Không có lỗi ' +
           'ghi tệp ⇒ không phải đầy đĩa. Mọi giả thuyết "hệ thống quá tải" đều sai; đây là ' +
           'giới hạn <b>ngữ nghĩa</b> của cơ chế, không phải giới hạn hiệu năng.</p>' +
           '<p><b>Sửa: đừng dùng tín hiệu để đếm.</b> Tín hiệu là cơ chế <i>thông báo</i>, ' +
           'trả lời câu hỏi "có chuyện gì đó đã xảy ra chưa?", không phải "đã xảy ra bao ' +
           'nhiêu lần?".</p>' +
           '<ul>' +
           '<li><b>Pipe hoặc FIFO</b>: bên phát ghi một byte cho mỗi sự kiện, bên nhận đọc và ' +
           'đếm số byte. Byte thì xếp hàng thật, và pipe đầy sẽ chặn bên ghi — mất mát trở ' +
           'thành <b>hữu hình</b> thay vì im lặng.</li>' +
           '<li><b>Bộ đếm trong shared memory</b> (Bài 23): bên phát tăng một biến nguyên tử, ' +
           'bên ghi log đọc định kỳ. Rẻ nhất, và chịu được tốc độ cao nhất.</li>' +
           '<li><b>Vẫn dùng tín hiệu, nhưng chỉ để đánh thức</b>: bên phát tăng bộ đếm chia ' +
           'sẻ <i>rồi mới</i> gửi <code>SIGUSR1</code>; handler (hoặc ' +
           '<code>signalfd</code>) chỉ có nhiệm vụ đánh thức luồng chính, còn số liệu lấy từ ' +
           'bộ đếm. Gộp bao nhiêu tín hiệu cũng không mất số nào.</li>' +
           '</ul>' +
           '<p><b>Còn tín hiệu thời gian thực?</b> <code>SIGRTMIN</code>–' +
           '<code>SIGRTMAX</code> <i>có</i> xếp hàng và giữ đúng thứ tự, nên chúng chữa được ' +
           'triệu chứng. Nhưng hàng đợi bị giới hạn bởi <code>RLIMIT_SIGPENDING</code>, và ' +
           'khi tràn thì <code>kill</code> trả về <code>EAGAIN</code> — bạn lại phải xử lý ' +
           'mất mát, chỉ khác là lần này nó lộ ra. Cho một luồng sự kiện tốc độ cao, pipe ' +
           'hoặc shared memory vẫn là câu trả lời đúng.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Một daemon mạng trên thiết bị của bạn thỉnh thoảng <b>biến mất không để lại dòng ' +
         'log nào</b>. <code>systemd</code> ghi <code>Main process exited, code=killed, ' +
         'status=13/PIPE</code>. Không ai gửi <code>kill</code> cả, và bạn tái hiện được hiện ' +
         'tượng tương tự ngay trên WSL2:',
      blocks: [
        { t: 'code', where: 'wsl', nocopy: true,
          code: '$ bash -c \'seq 1 100000000 | head -1; echo "PIPESTATUS = ${PIPESTATUS[0]} ${PIPESTATUS[1]}"\'\n' +
                '1\n' +
                'PIPESTATUS = 141 0\n' +
                '$ echo $?\n' +
                '0' },
        { t: 'p', x: 'Giải thích cơ chế, giải thích vì sao <code>$?</code> của cả đường ống ' +
                     'lại là <b>0</b> trong khi một thành phần của nó bị giết, và nói bạn sẽ ' +
                     'làm gì trong daemon.' }
      ],
      hint: '141 = 128 + 13. Tín hiệu số 13 là gì, và ai gửi nó?',
      crit: [
        'Giải mã đúng: 141 = 128 + 13 ⇒ bị giết bởi tín hiệu <b>13 = SIGPIPE</b>; hành vi mặc định là <b>chết ngay</b>',
        'Nêu đúng ai gửi: <b>nhân</b> gửi, tự động, khi tiến trình ghi vào một pipe/socket mà đầu đọc đã đóng — không phải người, không phải <code>systemd</code>',
        'Giải thích được vì sao <code>$?</code> = 0: bash trả về mã thoát của <b>lệnh cuối cùng</b> trong đường ống (<code>head</code> thoát 0); mã 141 của <code>seq</code> chỉ nhìn thấy qua <code>PIPESTATUS[0]</code>',
        'Nối được sang daemon: khách hàng đóng kết nối rồi daemon còn <code>write</code> ⇒ <code>SIGPIPE</code> ⇒ chết trước khi kịp ghi log, nên "không để lại dòng nào"',
        'Đưa ra cách sửa: <code>signal(SIGPIPE, SIG_IGN)</code> (hoặc <code>sigaction</code>) rồi kiểm tra <code>write</code> trả về <code>-1</code> với <code>errno == EPIPE</code>; hoặc dùng cờ <code>MSG_NOSIGNAL</code> khi <code>send()</code>',
        'Nêu được vì sao đây là <b>đúng một</b> trường hợp <code>SIG_IGN</code> hợp lý (nối lại với B2/C2): ở đây ta thật sự muốn <b>vứt</b> tín hiệu, vì thông tin đã có sẵn trong <code>errno</code>'
      ],
      sol: '<p><b>Giải mã.</b> 141 = 128 + 13. Quy ước của shell: một tiến trình bị tín hiệu ' +
           '<i>n</i> giết được báo lại bằng mã <b>128 + <i>n</i></b>. Tín hiệu 13 là ' +
           '<code>SIGPIPE</code>, và bố trí mặc định của nó là <b>chấm dứt tiến trình</b>. ' +
           'Chuỗi <code>13/PIPE</code> trong log <code>systemd</code> nói đúng điều đó.</p>' +
           '<p><b>Ai gửi.</b> <b>Nhân</b>, tự động. Khi một tiến trình gọi ' +
           '<code>write()</code> lên pipe hoặc socket mà <i>đầu đọc đã đóng</i>, nhân gửi ' +
           '<code>SIGPIPE</code> cho bên ghi. Ở ví dụ trên, <code>head -1</code> in một dòng ' +
           'rồi thoát và đóng đầu đọc; <code>seq</code> vẫn còn 99 999 999 dòng để ghi, lần ' +
           'ghi kế tiếp làm nó chết ngay. Không có ai "kill" cả — đây là cơ chế của hệ điều ' +
           'hành báo cho bạn biết chẳng còn ai nghe nữa.</p>' +
           '<p><b>Vì sao <code>$?</code> = 0 dù rõ ràng có tiến trình bị giết.</b> Mã thoát ' +
           'của một <i>đường ống</i> trong bash là mã thoát của <b>lệnh cuối cùng</b>. ' +
           '<code>head</code> làm xong việc và thoát 0, nên cả đường ống báo 0. Cái chết của ' +
           '<code>seq</code> chỉ lộ ra ở <code>PIPESTATUS[0] = 141</code>. Đây là một cái ' +
           'bẫy có thật trong script build: <code>make 2&gt;&amp;1 | tee build.log</code> ' +
           'trả về mã của <code>tee</code>, nên build hỏng vẫn "thành công" — ' +
           '<code>set -o pipefail</code> sinh ra chính là để chữa việc này.</p>' +
           '<p><b>Trong daemon của bạn.</b> Khách hàng đóng kết nối (rút mạng, đóng app, hết ' +
           'thời hạn) trong lúc daemon đang gửi trả lời. Lời gọi <code>write</code>/' +
           '<code>send</code> kế tiếp làm nhân bắn <code>SIGPIPE</code>, và vì không ai bắt, ' +
           'tiến trình <b>chết ngay tại chỉ thị đó</b> — trước khi chạy được dòng ghi log, ' +
           'trước khi xả bộ đệm. Đó chính xác là lý do "biến mất không để lại dòng nào".</p>' +
           '<p><b>Sửa:</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: '/* once, at startup */\n' +
                'struct sigaction sa;\n' +
                'memset(&sa, 0, sizeof sa);\n' +
                'sa.sa_handler = SIG_IGN;\n' +
                'sigaction(SIGPIPE, &sa, NULL);\n' +
                '\n' +
                '/* now every write reports the problem instead of killing us */\n' +
                'ssize_t n = write(fd, buf, len);\n' +
                'if (n < 0 && errno == EPIPE) {\n' +
                '    syslog(LOG_INFO, "peer closed the connection, dropping client");\n' +
                '    close(fd);\n' +
                '    return;                     /* the daemon stays alive */\n' +
                '}',
          notes: ['Với socket còn một cách gọn hơn, chỉ ảnh hưởng đúng lời gọi đó: ' +
                  '<code>send(fd, buf, len, MSG_NOSIGNAL)</code>.'] },
        { t: 'cal', kind: 'info', title: 'Vì sao ở đây SIG_IGN lại đúng',
          x: '<p>Câu B2 và C2 vừa dạy rằng <code>SIG_IGN</code> <b>vứt</b> tín hiệu, và đó ' +
             'thường là tai hoạ. Ở đây vứt lại đúng — vì thông tin không hề mất: nó xuất hiện ' +
             'lại ngay lập tức dưới dạng <code>write()</code> trả về <code>-1</code> với ' +
             '<code>errno == EPIPE</code>, ở đúng dòng mã có đủ ngữ cảnh để xử lý. Ta không ' +
             'bỏ qua sự kiện, ta chỉ từ chối nhận nó dưới dạng một cái chết đột ngột. Đây ' +
             'gần như là trường hợp <code>SIG_IGN</code> chính đáng duy nhất bạn gặp thường ' +
             'xuyên.</p>' }
      ] },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 7,
      q: 'Bạn thiết kế phần tắt máy cho một thiết bị lưu trữ video. Ràng buộc:' +
         '<ul>' +
         '<li>Watchdog phần cứng reset bo mạch nếu không được vỗ trong <b>10 s</b>. Trong ' +
         'lúc tắt máy thì không ai vỗ nó nữa.</li>' +
         '<li>Khi nhận <code>SIGTERM</code>, cần xả <b>32 MB</b> bộ đệm video xuống eMMC.</li>' +
         '<li>Tốc độ ghi tuần tự đo được trên thiết bị: <b>6 MB/s</b>.</li>' +
         '<li>Ngoài ra cần đóng 3 kết nối mạng và ghi 1 tệp trạng thái nhỏ: cộng lại ' +
         '<b>~0,3 s</b>.</li>' +
         '</ul>' +
         'Hãy tính, rồi <b>chọn</b> một trong ba phương án và biện minh: ' +
         '<b>(1)</b> giữ nguyên, xả hết 32 MB trong lúc tắt; ' +
         '<b>(2)</b> giảm bộ đệm xuống mức xả kịp; ' +
         '<b>(3)</b> ghi liên tục trong lúc chạy, lúc tắt chỉ xả phần dư.',
      blocks: [
        { t: 'p', x: 'Để so sánh: độ trễ đo được từ lúc <code>kill</code> tới lúc tiến ' +
                     'trình thoát, với một handler chỉ đặt cờ và vòng lặp chính kiểm tra cờ, ' +
                     'là <b>0,0046 s</b> trên máy học.' }
      ],
      hint: 'Tính thời gian xả trước, so với 10 s, rồi mới chọn. Và đừng quên cộng phần ' +
            '0,3 s cùng một biên an toàn.',
      crit: [
        'Tính đúng thời gian xả: 32 MB ÷ 6 MB/s ≈ <b>5,3 s</b>',
        'Cộng đúng tổng: 5,3 + 0,3 ≈ <b>5,6 s</b>, so với hạn 10 s ⇒ biên còn ~4,4 s',
        'Nhận ra biên đó <b>không an toàn</b>, và nêu ít nhất một lý do cụ thể: eMMC ghi chậm lại khi phải xoá khối / gom rác, thẻ mòn theo tuổi, hoặc hệ thống đang bận lúc tắt máy — 6 MB/s là số đo trên máy mới và rảnh',
        'Chọn phương án <b>(3)</b> và biện minh bằng con số: giữ bộ đệm ở mức nhỏ (ví dụ ≤ 4 MB ⇒ ~0,67 s) thì thời gian tắt hầu như không phụ thuộc vào tải',
        'Bác bỏ (1) và (2) có lý lẽ: (1) đặt cược sản phẩm vào một biên mỏng; (2) đúng hướng nhưng hy sinh hiệu quả ghi trong suốt thời gian chạy để chỉ tối ưu cho một sự kiện hiếm',
        'Nêu được rằng <b>0,0046 s</b> chứng minh phần khung tín hiệu là miễn phí — toàn bộ ngân sách bị tiêu bởi việc <b>ghi dữ liệu</b>, nên tối ưu đúng chỗ là ở lượng dữ liệu, không phải ở cách bắt tín hiệu',
        'Nhắc tới việc đặt <code>TimeoutStopSec</code> của <code>systemd</code> <b>nhỏ hơn</b> 10 s để <code>SIGKILL</code> đến trước watchdog — thoát bẩn còn hơn bị reset giữa lúc ghi'
      ],
      sol: '<p><b>Tính.</b></p>' +
           '<table><thead><tr><th>Khoản</th><th>Thời gian</th></tr></thead><tbody>' +
           '<tr><td>Xả 32 MB ÷ 6 MB/s</td><td><b>5,33 s</b></td></tr>' +
           '<tr><td>Đóng 3 kết nối + ghi tệp trạng thái</td><td>0,30 s</td></tr>' +
           '<tr><td>Bắt tín hiệu, thoát vòng lặp (đo được)</td><td>0,005 s</td></tr>' +
           '<tr><td><b>Tổng</b></td><td><b>≈ 5,64 s</b></td></tr>' +
           '<tr><td>Hạn watchdog</td><td>10 s</td></tr>' +
           '<tr><td><b>Biên còn lại</b></td><td><b>≈ 4,4 s (44 %)</b></td></tr>' +
           '</tbody></table>' +
           '<p><b>Điều đầu tiên con số nói ra.</b> Phần khung tín hiệu — chuyển phát, chạy ' +
           'handler, đặt cờ, thoát vòng lặp — tốn <b>0,005 s</b>, tức là <b>khoảng một phần ' +
           'nghìn</b> ngân sách. Toàn bộ thời gian nằm ở việc <i>đẩy byte xuống eMMC</i>. Vậy ' +
           'mọi nỗ lực tối ưu "cách bắt tín hiệu" đều vô nghĩa; đòn bẩy duy nhất là <b>số ' +
           'byte phải ghi lúc tắt</b>.</p>' +
           '<p><b>Vì sao biên 44 % không đủ.</b> Nghe thì rộng, nhưng 6 MB/s là số đo trên ' +
           'một thiết bị <i>mới</i>, ở trạng thái <i>rảnh</i>, với vùng flash <i>đã xoá ' +
           'sẵn</i>. Trong đời thật cả ba giả định đều đổ:</p>' +
           '<ul>' +
           '<li>eMMC phải xoá khối trước khi ghi khi thẻ gần đầy; tốc độ có thể tụt xuống ' +
           'một nửa hoặc hơn.</li>' +
           '<li>Bộ nhớ mòn theo tuổi, controller phải thử lại và ánh xạ lại khối hỏng.</li>' +
           '<li>Lúc tắt máy, mọi tiến trình khác cũng đang xả dữ liệu — bạn không có eMMC ' +
           'cho riêng mình.</li>' +
           '</ul>' +
           '<p>Chỉ cần tốc độ tụt còn 3,5 MB/s là tổng vượt 9,4 s và bạn ở ngay mép vực. Hậu ' +
           'quả không phải là "tắt chậm" mà là <b>watchdog reset giữa lúc đang ghi</b> — ' +
           'nghĩa là hỏng đúng dữ liệu mà bạn đang cố cứu.</p>' +
           '<p><b>Chọn (3), và đây là lý do.</b></p>' +
           '<ul>' +
           '<li><b>(1) Giữ nguyên</b> — đặt cược cả sản phẩm vào giả định "6 MB/s luôn đúng ' +
           'trong ba năm tới". Một biên an toàn phụ thuộc vào một tham số bạn không kiểm soát ' +
           'thì không phải là biên an toàn.</li>' +
           '<li><b>(2) Giảm bộ đệm</b> — đúng hướng, nhưng trả giá <b>suốt thời gian chạy</b> ' +
           '(ghi vụn nhiều hơn, mòn flash nhanh hơn, thông lượng thấp hơn) để tối ưu cho một ' +
           'sự kiện xảy ra vài lần một tháng. Sai chỗ.</li>' +
           '<li><b>(3) Ghi liên tục, lúc tắt chỉ xả phần dư</b> — bộ đệm vẫn đủ lớn để ghi ' +
           'hiệu quả, nhưng một luồng nền đẩy dữ liệu xuống đều đặn nên lượng tồn đọng ' +
           '<i>luôn</i> nhỏ. Với trần 4 MB: 4 ÷ 6 ≈ <b>0,67 s</b>, cộng 0,3 s là <b>~1 s</b>, ' +
           'biên <b>90 %</b>. Và quan trọng hơn con số: thời gian tắt bây giờ <b>gần như ' +
           'không phụ thuộc</b> vào tốc độ eMMC — kể cả khi nó tụt còn một phần ba, bạn vẫn ' +
           'xong trong 2,3 s.</li>' +
           '</ul>' +
           '<p><b>Một hàng rào nữa, bắt buộc.</b> Đặt ' +
           '<code>TimeoutStopSec=6</code> trong unit file <code>systemd</code>. Nếu vì lý do ' +
           'gì đó việc xả kẹt, <code>SIGKILL</code> đến ở giây thứ 6 — thiết bị mất phần dữ ' +
           'liệu chưa ghi nhưng <b>vào lại trạng thái sạch</b>. Để watchdog reset ở giây thứ ' +
           '10 giữa lúc controller eMMC đang thao tác thì tệ hơn nhiều: có thể hỏng cả hệ ' +
           'thống tệp. Luôn để thời hạn phần mềm đến <i>trước</i> thời hạn phần cứng.</p>' }
  ],
  D: [
    { id: 'd1', k: 'num', tag: 'Nhắc lại bài cũ', unit: '', tol: 0,
      q: '<b>Bài 20.</b> Một tiến trình cha gọi <code>waitpid(pid, &amp;status, 0)</code> cho ' +
         'một đứa con bị <code>kill -9</code> giết. Cha in ra giá trị <b>thô</b> của biến ' +
         '<code>status</code> (không dùng macro nào cả). Con số in ra là bao nhiêu?',
      a: 9,
      why: '<p><b>9.</b> Từ trạng thái là một số nguyên đóng gói nhiều thông tin vào các ' +
           'vùng bit khác nhau, và <b>hai trường hợp nằm ở hai chỗ khác nhau</b>:</p>' +
           '<ul>' +
           '<li>Con <b>tự thoát</b> với mã <i>n</i> ⇒ mã nằm ở <b>byte cao</b>: ' +
           '<code>status = n &lt;&lt; 8</code>. Thoát 3 cho <code>status = 768</code>.</li>' +
           '<li>Con <b>bị tín hiệu giết</b> ⇒ số hiệu tín hiệu nằm ở <b>7 bit thấp</b>: ' +
           '<code>status = sig</code>. Bị <code>SIGKILL</code> (9) cho ' +
           '<code>status = <b>9</b></code>.</li>' +
           '</ul>' +
           '<p>Đo thật trên máy học, ba trường hợp:</p>' +
           '<pre><code>signal 15 -&gt; raw status word = 15  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=15 WCOREDUMP=0\n' +
           'signal  9 -&gt; raw status word =  9  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=9  WCOREDUMP=0\n' +
           'signal  2 -&gt; raw status word =  2  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=2  WCOREDUMP=0</code></pre>' +
           '<p><b>Đừng nhầm với 137.</b> Con số <b>137 = 128 + 9</b> là thứ <i>shell</i> ' +
           'trình bày cho bạn qua <code>$?</code>, không phải thứ nằm trong biến ' +
           '<code>status</code>. Shell đọc từ trạng thái, thấy <code>WIFSIGNALED</code>, rồi ' +
           '<i>tự</i> cộng 128 vào số hiệu tín hiệu để nhét vừa một mã thoát 8 bit. Trong ' +
           'chương trình C bạn không bao giờ thấy 137; bạn thấy 9, và bạn phải hỏi qua ' +
           '<code>WIFEXITED</code> / <code>WIFSIGNALED</code> để biết nên đọc vùng bit nào. ' +
           'Đọc thẳng <code>status</code> mà không hỏi macro là cách chắc chắn nhất để nhầm ' +
           '"bị SIGKILL" thành "thoát bình thường với mã 9".</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 14.</b> Một vòng lặp <code>while (!done) { }</code> chờ cờ <code>done</code> ' +
         'do handler đặt. Biên dịch với <code>gcc -O0</code> thì chương trình dừng đúng khi ' +
         'nhận tín hiệu; biên dịch với <code>gcc -O2</code> thì nó <b>treo vĩnh viễn</b>, dù ' +
         'không đổi một dòng mã nào. Nguyên nhân là gì?',
      opts: [
        'Ở <code>-O2</code> trình biên dịch sinh mã chạy nhanh hơn nên handler không kịp chạy trước khi vòng lặp quay lại',
        'Trình biên dịch thấy vòng lặp không sửa <code>done</code> nên nạp nó vào thanh ghi <b>một lần trước vòng lặp</b> và không đọc lại bộ nhớ nữa; khai báo <code>static volatile sig_atomic_t</code> buộc nó đọc lại mỗi vòng',
        'Ở <code>-O2</code> handler được gọi trên một ngăn xếp riêng nên nó ghi vào một bản sao khác của <code>done</code>',
        'Cần thêm <code>-pthread</code>; không có nó thì việc ghi từ handler không hiển thị sang luồng chính'
      ],
      a: 1,
      why: '<p><b>Đáp án B.</b> Trình biên dịch phân tích thân vòng lặp, thấy không có gì ' +
           'ghi vào <code>done</code>, và kết luận hoàn toàn hợp lệ theo tiêu chuẩn C rằng ' +
           'giá trị đó không thể đổi. Nó nạp <code>done</code> vào một thanh ghi <b>một lần ' +
           'trước vòng lặp</b>, rồi sinh ra một vòng lặp vô tận không hề chạm vào bộ nhớ. ' +
           'Handler ghi vào ô nhớ thật, nhưng vòng lặp không còn đọc ô nhớ đó nữa.</p>' +
           '<p><code>volatile</code> nói với trình biên dịch: "biến này có thể đổi vì một lý ' +
           'do nằm ngoài tầm nhìn của anh — đọc lại từ bộ nhớ mỗi lần". ' +
           '<code>sig_atomic_t</code> bảo đảm việc đọc/ghi diễn ra bằng <b>một chỉ thị duy ' +
           'nhất</b>, nên tín hiệu không thể chen vào giữa và thấy nửa giá trị. Cả cụm ' +
           '<code>static volatile sig_atomic_t</code> mới là câu trả lời đầy đủ.</p>' +
           '<p><b>A sai</b> — đây không phải chuyện nhanh chậm; vòng lặp treo <i>vĩnh viễn</i>, ' +
           'không phải "chậm phản hồi". <b>C sai</b> — handler chạy trên cùng không gian địa ' +
           'chỉ và <code>done</code> chỉ có một bản. <b>D sai</b> — không có luồng nào ở đây, ' +
           'handler chạy trên chính luồng chính; và <code>-pthread</code> không sinh ra hàng ' +
           'rào bộ nhớ cho biến toàn cục thường.</p>' +
           '<p><b>Bài học rộng hơn:</b> <code>-O0</code> "chạy đúng" không phải bằng chứng ' +
           'chương trình đúng. Nó chỉ có nghĩa là trình biên dịch chưa dùng tới cái quyền mà ' +
           'bạn đã trao cho nó. Luôn kiểm tra ở mức tối ưu bạn thật sự xuất xưởng.</p>' },

    { id: 'd3', k: 'free', tag: 'Nhắc lại bài cũ', rows: 5,
      q: '<b>Bài 19.</b> Bài 21 nói rằng cách in ấn hợp lệ duy nhất bên trong handler là ' +
         '<code>write(2)</code>. Nhưng <code>write</code> có một đặc tính mà ' +
         '<code>printf</code> không có, và nếu bỏ qua thì mã của bạn sai một cách âm thầm. ' +
         'Hãy nói: <b>(a)</b> <code>write</code> trả về cái gì; <b>(b)</b> vì sao giá trị đó ' +
         'có thể <i>nhỏ hơn</i> số byte bạn yêu cầu mà <b>không</b> phải là lỗi; <b>(c)</b> ' +
         'trong handler thì nên xử lý ra sao.',
      hint: 'Hãy phân biệt ba khả năng của giá trị trả về: âm, bằng <code>count</code>, và ' +
            'nằm giữa 0 và <code>count</code>.',
      crit: [
        'Nêu đúng (a): trả về <b>số byte thực sự đã ghi</b>, hoặc <code>-1</code> kèm <code>errno</code> khi lỗi',
        'Nêu đúng (b): ghi thiếu (<i>short write</i>) là hợp lệ — pipe/socket đầy, bị tín hiệu ngắt giữa chừng, hoặc thiết bị nhận ít hơn; giá trị dương nhỏ hơn <code>count</code> <b>không</b> phải lỗi và <code>errno</code> lúc đó vô nghĩa',
        'Nêu được rằng bỏ qua giá trị trả về là <b>mất dữ liệu âm thầm</b> — không có thông báo nào, và <code>gcc</code> chỉ cảnh báo nếu bật <code>-Wunused-result</code>',
        'Trả lời (c) hợp lý: vòng lặp ghi tiếp phần còn lại, và xử lý <code>errno == EINTR</code> bằng cách thử lại',
        'Nêu được lý do vì sao trong handler việc này quan trọng hơn bình thường: handler <b>không được</b> gọi <code>printf</code>/<code>perror</code> để báo lỗi, nên nếu không tự xử thì thông tin mất hoàn toàn',
        'Nhắc được rằng phải <b>lưu và khôi phục <code>errno</code></b> quanh mọi lời gọi hệ thống trong handler'
      ],
      sol: '<p><b>(a)</b> <code>write(fd, buf, count)</code> trả về <code>ssize_t</code>: số ' +
           'byte <b>thực sự đã ghi</b> (từ 0 tới <code>count</code>), hoặc <code>-1</code> ' +
           'kèm <code>errno</code> khi thật sự lỗi.</p>' +
           '<p><b>(b)</b> Một giá trị dương nhỏ hơn <code>count</code> gọi là <i>short ' +
           'write</i> và hoàn toàn hợp lệ. Nguyên nhân thường gặp: pipe hoặc socket chỉ còn ' +
           'chỗ cho một phần; một tín hiệu tới giữa chừng sau khi đã ghi được vài byte; thiết ' +
           'bị ký tự nhận ít hơn mức yêu cầu. <b>Không có lỗi nào xảy ra</b> — hệ thống đang ' +
           'nói thật: "tôi nhận được chừng này thôi, phần còn lại là việc của anh". Kiểm tra ' +
           '<code>errno</code> lúc này là vô nghĩa, vì <code>errno</code> chỉ có ý nghĩa khi ' +
           'giá trị trả về là <code>-1</code>.</p>' +
           '<p><b>Vì sao đây là lỗi âm thầm.</b> ' +
           '<code>write(2, "shutting down\\n", 14);</code> mà bỏ giá trị trả về thì khi nó ' +
           'chỉ ghi được 9 byte, bạn mất 5 byte cuối và <b>không có bất kỳ dấu hiệu nào</b>: ' +
           'không exception, không mã lỗi, chương trình chạy tiếp bình thường. Bạn chỉ phát ' +
           'hiện khi đọc log thấy một dòng cụt — hoặc không phát hiện gì cả.</p>' +
           '<p><b>(c)</b> Trong handler, chuyện này nghiêm trọng hơn bình thường vì bạn ' +
           '<b>không được phép</b> gọi <code>printf</code> hay <code>perror</code> để kêu ' +
           'lên. Không tự xử thì thông tin mất hẳn. Mẫu đúng:</p>' +
           '<pre><code>static void safe_write(int fd, const char *s, size_t n)\n' +
           '{\n' +
           '    size_t off = 0;\n' +
           '    while (off &lt; n) {\n' +
           '        ssize_t w = write(fd, s + off, n - off);\n' +
           '        if (w &lt; 0) {\n' +
           '            if (errno == EINTR) continue;   /* interrupted, just retry */\n' +
           '            break;                          /* real error, give up quietly */\n' +
           '        }\n' +
           '        off += (size_t)w;\n' +
           '    }\n' +
           '}\n' +
           '\n' +
           'static void on_term(int sig)\n' +
           '{\n' +
           '    int saved = errno;                      /* mandatory in any handler */\n' +
           '    (void)sig;\n' +
           '    safe_write(2, "SIGTERM received\\n", 17);\n' +
           '    stop_requested = 1;\n' +
           '    errno = saved;\n' +
           '}</code></pre>' +
           '<p><b>Dòng <code>saved</code> không phải là trang trí.</b> Luồng chính có thể ' +
           'đang ở giữa đoạn "gọi syscall xong, chuẩn bị đọc <code>errno</code>". Nếu handler ' +
           'chen vào và gọi <code>write</code>, <code>errno</code> bị ghi đè, và luồng chính ' +
           'đọc phải mã lỗi của <i>handler</i> thay vì của chính nó. Lưu và khôi phục ' +
           '<code>errno</code> là bắt buộc trong mọi handler có gọi lời gọi hệ thống.</p>' }
  ],
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 4,
      q: 'Chép chương trình dưới đây thành <code>~/bt21/no_queue.c</code>. <b>Trước khi biên ' +
         'dịch</b>, hãy viết ra hai con số bạn nghĩ nó sẽ in — rồi mới chạy.',
      blocks: [
        { t: 'code', where: 'wsl',
          code: '#include <stdio.h>\n' +
                '#include <signal.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                'static volatile sig_atomic_t hits = 0;\n' +
                '\n' +
                'static void on_usr1(int sig)\n' +
                '{\n' +
                '    (void)sig;\n' +
                '    hits++;\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    struct sigaction sa = {0};\n' +
                '    sigset_t block, old;\n' +
                '    int i;\n' +
                '\n' +
                '    sa.sa_handler = on_usr1;\n' +
                '    sigemptyset(&sa.sa_mask);\n' +
                '    sigaction(SIGUSR1, &sa, NULL);\n' +
                '\n' +
                '    sigemptyset(&block);\n' +
                '    sigaddset(&block, SIGUSR1);\n' +
                '    sigprocmask(SIG_BLOCK, &block, &old);\n' +
                '\n' +
                '    for (i = 0; i < 10; i++)\n' +
                '        kill(getpid(), SIGUSR1);\n' +
                '\n' +
                '    printf("sent 10 while blocked, hits = %d\\n", hits);\n' +
                '\n' +
                '    sigprocmask(SIG_SETMASK, &old, NULL);\n' +
                '    printf("after unblocking,      hits = %d\\n", hits);\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: 'mkdir -p ~/bt21 && cd ~/bt21\n' +
                'gcc -Wall -Wextra -O2 -o no_queue no_queue.c\n' +
                './no_queue' }
      ],
      hint: 'Con số thứ nhất dễ. Con số thứ hai mới là bài kiểm tra: nó là 10, hay 1, hay 0?',
      crit: [
        'Dự đoán đúng dòng 1: <code>hits = 0</code> — tín hiệu đang bị chặn nên handler chưa hề chạy',
        'Dự đoán đúng dòng 2: <code>hits = <b>1</b></code>, không phải 10',
        'Giải thích được vì sao là 1: 10 lần gửi bật <b>cùng một bit</b> trong bảng đang treo; bật lại bit đã bật là phép toán vô hiệu',
        'Nêu đúng thời điểm handler chạy: <b>ngay bên trong</b> lời gọi <code>sigprocmask</code> bỏ chặn, trước khi nó trả về — nên <code>printf</code> dòng 2 đã thấy giá trị mới',
        'Nếu bạn đoán 10: ghi lại rõ ràng bạn đã đoán sai chỗ nào, và vì sao trực giác "gửi n lần thì chạy n lần" hỏng'
      ],
      sol: '<p><b>Output thật trên máy học:</b></p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: 'sent 10 while blocked, hits = 0\n' +
                'after unblocking,      hits = 1' },
        { t: 'p', x: '<b>Dòng 1 — <code>hits = 0</code>.</b> Chặn nghĩa là hoãn. Nhân bật bit ' +
                     '<code>SIGUSR1</code> trong bảng đang treo của tiến trình và dừng ở đó; ' +
                     'handler chưa được gọi lần nào.' },
        { t: 'p', x: '<b>Dòng 2 — <code>hits = 1</code>, và đây là toàn bộ nội dung bài ' +
                     'tập.</b> Bảng đang treo là một <b>tập bit</b>, không phải hàng đợi. Lần ' +
                     'gửi đầu bật bit số 9; chín lần sau bật một bit đã bật, tức là không làm ' +
                     'gì cả. Nhân không có ô nhớ nào để đếm, và cũng không cố đếm. Chín tín ' +
                     'hiệu <b>không bị hoãn</b> — chúng <b>không tồn tại</b>.' },
        { t: 'p', x: '<b>Chi tiết đáng để ý về thời điểm.</b> Handler chạy <i>bên trong</i> ' +
                     'lời gọi <code>sigprocmask</code> ở dòng bỏ chặn, trước khi hàm đó kịp ' +
                     'trả về. Vì vậy <code>printf</code> ngay sau nó đã đọc được ' +
                     '<code>hits = 1</code>. Tín hiệu được chuyển phát ở điểm sớm nhất có ' +
                     'thể, không phải "lúc nào đó sau này".' },
        { t: 'cal', kind: 'danger', title: 'Hệ quả bạn phải mang theo suốt phần còn lại của khoá',
          x: '<p>Số lần handler chạy <b>không</b> bằng số tín hiệu được gửi. Mọi thiết kế ' +
             'kiểu "mỗi sự kiện một tín hiệu, đếm số lần handler chạy" đều sai từ gốc, và nó ' +
             'sai <b>im lặng</b> — không lỗi, không cảnh báo, chỉ là con số thiếu. Đây chính ' +
             'là bug ở câu C3.</p>' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Chương trình <code>catcher</code> dưới đây cài handler cho <code>SIGINT</code> và ' +
         '<code>SIGTERM</code>, <b>chặn</b> <code>SIGUSR1</code>, rồi ngủ. Bạn sẽ chạy nó ' +
         '<b>ở nền</b> rồi đọc <code>/proc/&lt;pid&gt;/status</code> ở ba thời điểm. ' +
         '<b>Trước khi chạy</b>, hãy viết ra giá trị hex bạn dự đoán cho ' +
         '<code>SigBlk</code>, <code>SigCgt</code>, và cho <code>SigPnd</code>/' +
         '<code>ShdPnd</code> ở mốc B.',
      blocks: [
        { t: 'code', where: 'wsl',
          code: '#include <stdio.h>\n' +
                '#include <signal.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                'static void noop(int sig) { (void)sig; }\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    struct sigaction sa = {0};\n' +
                '    sigset_t block;\n' +
                '\n' +
                '    sa.sa_handler = noop;\n' +
                '    sigemptyset(&sa.sa_mask);\n' +
                '    sigaction(SIGINT,  &sa, NULL);\n' +
                '    sigaction(SIGTERM, &sa, NULL);\n' +
                '\n' +
                '    sigemptyset(&block);\n' +
                '    sigaddset(&block, SIGUSR1);\n' +
                '    sigprocmask(SIG_BLOCK, &block, NULL);\n' +
                '\n' +
                '    printf("pid=%d\\n", (int)getpid());\n' +
                '    fflush(stdout);\n' +
                '    sleep(30);\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: 'cd ~/bt21\n' +
                'gcc -Wall -Wextra -O2 -o catcher catcher.c\n' +
                './catcher & sleep 0.3; P=$!\n' +
                'echo "--- A. nothing sent yet:"\n' +
                'grep -E \'^(State|SigPnd|ShdPnd|SigBlk|SigIgn|SigCgt)\' /proc/$P/status\n' +
                'kill -USR1 $P; sleep 0.2\n' +
                'echo "--- B. after 1 SIGUSR1:"\n' +
                'grep -E \'^(SigPnd|ShdPnd)\' /proc/$P/status\n' +
                'kill -USR1 $P; kill -USR1 $P; kill -USR1 $P; sleep 0.2\n' +
                'echo "--- C. after 3 more (4 total):"\n' +
                'grep -E \'^(SigPnd|ShdPnd)\' /proc/$P/status\n' +
                'kill -TERM $P; wait $P; echo "exit code = $?"' }
      ],
      hint: 'Bit thứ <i>n</i> đếm từ 0 ứng với tín hiệu <i>n</i>+1. <code>SIGUSR1</code> là ' +
            '10, <code>SIGINT</code> là 2, <code>SIGTERM</code> là 15. Và hãy dự đoán riêng ' +
            '<code>SigPnd</code> với <code>ShdPnd</code> — đừng cho rằng chúng bằng nhau.',
      crit: [
        'Dự đoán đúng <code>SigBlk = 0000000000000200</code> (bit 9 ⇒ tín hiệu 10)',
        'Dự đoán đúng <code>SigCgt = 0000000000004002</code> (bit 1 + bit 14 ⇒ tín hiệu 2 và 15)',
        'Ở mốc B: <code>ShdPnd = 0000000000000200</code> và <code>SigPnd = 0000000000000000</code> — nếu bạn đoán <code>SigPnd</code> khác 0 thì ghi lại là đã đoán sai',
        'Mốc C <b>giống hệt</b> mốc B — gửi 4 lần không khác gì gửi 1 lần',
        'Giải thích được dòng <code>SigIgn: 0000000000000004</code> mà bạn không hề đặt: <code>SIGQUIT</code> (3) bị bash đặt <code>SIG_IGN</code> cho tiến trình chạy nền và tiến trình con <b>thừa hưởng</b> qua <code>fork</code>',
        'Nêu đúng mã thoát cuối: <b>0</b>, vì <code>SIGTERM</code> đã có handler (<code>noop</code>) nên nó chỉ ngắt <code>sleep</code>, chương trình chạy tiếp tới <code>return 0</code>'
      ],
      sol: '<p><b>Output thật trên máy học</b> (<code>pid=415</code>):</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '--- A. nothing sent yet:\n' +
                'State:\tS (sleeping)\n' +
                'SigPnd:\t0000000000000000\n' +
                'ShdPnd:\t0000000000000000\n' +
                'SigBlk:\t0000000000000200\n' +
                'SigIgn:\t0000000000000004\n' +
                'SigCgt:\t0000000000004002\n' +
                '--- B. after 1 SIGUSR1:\n' +
                'SigPnd:\t0000000000000000\n' +
                'ShdPnd:\t0000000000000200\n' +
                '--- C. after 3 more (4 total):\n' +
                'SigPnd:\t0000000000000000\n' +
                'ShdPnd:\t0000000000000200\n' +
                'exit code = 0' },
        { t: 'p', x: '<b>Ba cái bẫy, theo thứ tự khó dần.</b>' },
        { t: 'p', x: '<b>1. <code>SigPnd</code> vẫn là 0.</b> Đây là bẫy chính. Một tiến ' +
                     'trình Linux có <b>hai</b> tập tín hiệu đang treo: ' +
                     '<code>SigPnd</code> riêng cho từng <i>luồng</i>, và ' +
                     '<code>ShdPnd</code> dùng chung cho cả <i>tiến trình</i>. ' +
                     '<code>kill(pid, sig)</code> gửi tới tiến trình nên luôn rơi vào ' +
                     '<code>ShdPnd</code>; chỉ <code>pthread_kill()</code> mới đặt vào ' +
                     '<code>SigPnd</code>. Ai chỉ <code>grep SigPnd</code> sẽ kết luận "không ' +
                     'có gì đang treo" — <b>sai, mà trông hoàn toàn hợp lý</b>. Luôn đọc cả ' +
                     'hai hàng.' },
        { t: 'p', x: '<b>2. Mốc C giống hệt mốc B.</b> Bốn lần gửi cho đúng cái giá trị mà ' +
                     'một lần gửi cho: <code>0000000000000200</code>. Tập bit, không phải ' +
                     'hàng đợi — cùng một sự thật mà câu E1 đo bằng bộ đếm, ở đây nhìn thấy ' +
                     'trực tiếp trong cấu trúc dữ liệu của nhân.' },
        { t: 'p', x: '<b>3. <code>SigIgn: …0004</code> mà chương trình không hề đặt.</b> ' +
                     'Bit 2 ⇒ tín hiệu 3 = <code>SIGQUIT</code>. Bash đặt ' +
                     '<code>SIGINT</code> và <code>SIGQUIT</code> thành <code>SIG_IGN</code> ' +
                     'cho các tiến trình chạy nền, và bố trí <code>SIG_IGN</code> được ' +
                     '<b>thừa hưởng qua <code>fork</code> và cả <code>exec</code></b>. ' +
                     '<code>SIGINT</code> không xuất hiện ở đây vì chương trình đã ghi đè nó ' +
                     'bằng <code>sigaction</code> — nên nó nằm ở <code>SigCgt</code>. Đây là ' +
                     'lý do một chương trình đôi khi "điếc" với ' +
                     '<kbd>Ctrl</kbd>+<kbd>C</kbd> mà không có dòng mã nào giải thích được.' },
        { t: 'p', x: '<b>Và mã thoát 0.</b> <code>SIGTERM</code> có handler ' +
                     '(<code>noop</code>), nên nó không giết tiến trình — nó chỉ ngắt ' +
                     '<code>sleep(30)</code>. Chương trình chạy tiếp tới ' +
                     '<code>return 0</code>. Nếu bạn xoá dòng ' +
                     '<code>sigaction(SIGTERM, ...)</code>, mã thoát sẽ thành <b>143</b>.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Không dùng mã nguồn, chỉ dùng shell: cho một PID bất kỳ đang chạy, hãy dựng một ' +
         'lệnh (hoặc một dòng lệnh ghép) <b>in ra tên</b> của mọi tín hiệu mà tiến trình đó ' +
         'đang <b>chặn</b>. Nghĩa là: đọc <code>SigBlk</code> từ ' +
         '<code>/proc/&lt;pid&gt;/status</code>, giải mã mặt nạ hex thành danh sách số hiệu, ' +
         'rồi đổi số hiệu thành tên bằng <code>kill -l</code>. Thử trên tiến trình ' +
         '<code>catcher</code> ở câu E2 và trên một tiến trình hệ thống bất kỳ.',
      hint: 'Bit thứ <i>i</i> (đếm từ 0) của mặt nạ ứng với tín hiệu số <i>i</i>+1. Trong ' +
            'bash, <code>$(( 0x200 &gt;&gt; i &amp; 1 ))</code> lấy được bit thứ <i>i</i>, và ' +
            '<code>kill -l 10</code> in ra tên tín hiệu số 10.',
      crit: [
        'Lấy đúng giá trị: <code>awk \'/^SigBlk:/ {print $2}\' /proc/$P/status</code> (hoặc tương đương)',
        'Chuyển hex sang số đúng cách: đặt tiền tố <code>0x</code> rồi dùng số học của bash, ví dụ <code>M=$((16#$hex))</code> hoặc <code>$((0x$hex))</code>',
        'Duyệt bit đúng và <b>lệch chỉ số đúng</b>: bit <i>i</i> ⇒ tín hiệu <i>i</i>+1 (sai chỗ này là ra lệch một, ví dụ báo SIGUSR2 thay vì SIGUSR1)',
        'Đổi được số hiệu thành tên bằng <code>kill -l &lt;n&gt;</code>',
        'Chạy được trên <code>catcher</code> và ra đúng <b>USR1</b>',
        'Chạy được trên một tiến trình hệ thống và kết quả nhất quán với <code>SigBlk</code> đọc bằng mắt'
      ],
      sol: '<p><b>Một cách viết (thuần bash, không cần công cụ ngoài):</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: 'blocked() {\n' +
                '    local pid=$1 hex mask i\n' +
                '    hex=$(awk \'/^SigBlk:/ {print $2}\' /proc/$pid/status) || return 1\n' +
                '    mask=$((16#$hex))\n' +
                '    for ((i = 0; i < 64; i++)); do\n' +
                '        if (( (mask >> i) & 1 )); then\n' +
                '            printf \'%2d  SIG%s\\n\' $((i + 1)) "$(kill -l $((i + 1)))"\n' +
                '        fi\n' +
                '    done\n' +
                '}' },
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./catcher & sleep 0.3; blocked $!\n' +
                'pid=422\n' +
                '10  SIGUSR1' },
        { t: 'p', x: '<b>Ba chỗ dễ sai.</b>' },
        { t: 'p', x: '<b>1. Lệch một.</b> Bit 0 là tín hiệu <b>1</b>, không phải 0 — tín hiệu ' +
                     'số 0 không tồn tại (<code>kill -0</code> là phép thử "tiến trình còn ' +
                     'sống không", không gửi gì cả). Quên <code>+1</code> thì mọi tên đều lệch ' +
                     'một bậc và kết quả vẫn <i>trông</i> hợp lý — đúng loại lỗi tệ nhất.' },
        { t: 'p', x: '<b>2. Hex phải được nói rõ là hex.</b> <code>$((16#$hex))</code> hoặc ' +
                     '<code>$((0x$hex))</code>. Bỏ qua bước này thì bash đọc ' +
                     '<code>0000000000000200</code> như một số bát phân (vì có số 0 đứng ' +
                     'đầu) và bạn được 128 thay vì 512.' },
        { t: 'p', x: '<b>3. Đọc thiếu hàng.</b> Đổi <code>SigBlk</code> thành ' +
                     '<code>ShdPnd</code> để xem cái gì đang treo, <code>SigCgt</code> để xem ' +
                     'tín hiệu nào có handler riêng, <code>SigIgn</code> để xem cái nào đang ' +
                     'bị bỏ qua. Với tín hiệu đang treo phải xem <b>cả</b> ' +
                     '<code>SigPnd</code> lẫn <code>ShdPnd</code> (câu E2).' },
        { t: 'cal', kind: 'info', title: 'Vì sao kỹ năng này đáng giá',
          x: '<p>Trên thiết bị nhúng thường không có <code>gdb</code>, không có ' +
             '<code>strace</code>, đôi khi chỉ có busybox. Nhưng ' +
             '<code>/proc/&lt;pid&gt;/status</code> thì <b>luôn</b> có. Khi một daemon ' +
             '"không phản hồi <code>SIGTERM</code>", ba hàng <code>SigBlk</code>, ' +
             '<code>SigIgn</code>, <code>SigCgt</code> trả lời ngay câu hỏi quan trọng nhất: ' +
             'nó đang <i>hoãn</i>, đang <i>vứt</i>, hay thật sự có <i>bắt</i> mà xử lý ' +
             'sai.</p>' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Hãy chứng minh bằng thực nghiệm quy tắc <b>mã thoát = 128 + số hiệu tín hiệu</b>. ' +
         'Cho ba tín hiệu <code>SIGTERM</code> (15), <code>SIGINT</code> (2), ' +
         '<code>SIGKILL</code> (9): khởi một tiến trình <code>sleep</code> ở nền, giết nó ' +
         'bằng từng tín hiệu, và in mã thoát mà shell báo. Sau đó trả lời: cùng thí nghiệm ' +
         'đó nhưng đọc <code>status</code> trong C thì con số sẽ khác thế nào?',
      hint: '<code>wait $!</code> rồi <code>echo $?</code>. Nhớ rằng <code>$?</code> bị ghi ' +
            'đè bởi <i>mọi</i> lệnh, kể cả <code>echo</code> — nên phải lấy nó ngay lập tức.',
      crit: [
        'Dựng đúng thí nghiệm: <code>sleep 30 &amp; P=$!; kill -TERM $P; wait $P; echo $?</code> (hoặc tương đương)',
        'Thu được đúng ba con số: <b>143</b>, <b>130</b>, <b>137</b>',
        'Kiểm chứng được phép cộng: 128+15, 128+2, 128+9',
        'Nêu được vì sao shell phải cộng 128: mã thoát chỉ có <b>8 bit</b>, cần một cách phân biệt "thoát với mã <i>n</i>" và "bị tín hiệu <i>n</i> giết" trong cùng một con số',
        'Trả lời đúng vế C: <code>status</code> thô chứa <b>số hiệu tín hiệu ở 7 bit thấp</b> (15, 2, 9) — <b>không</b> có 128; con số 128+n là quy ước của shell chứ không phải của nhân',
        'Nêu được rằng trong C phải hỏi <code>WIFEXITED</code>/<code>WIFSIGNALED</code> trước rồi mới đọc <code>WEXITSTATUS</code>/<code>WTERMSIG</code>'
      ],
      sol: '<p><b>Thí nghiệm và output thật:</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: 'for S in TERM INT KILL; do\n' +
                '    sleep 30 &\n' +
                '    P=$!\n' +
                '    kill -$S $P\n' +
                '    wait $P 2>/dev/null\n' +
                '    echo "$S -> $?"\n' +
                'done' },
        { t: 'code', where: 'out', nocopy: true,
          code: 'TERM -> 143\n' +
                'INT -> 130\n' +
                'KILL -> 137' },
        { t: 'p', x: '143 = 128 + 15, 130 = 128 + 2, 137 = 128 + 9. Quy tắc đứng vững cho cả ' +
                     'ba.' },
        { t: 'p', x: '<b>Vì sao shell phải cộng 128.</b> Mã thoát chỉ rộng <b>8 bit</b> ' +
                     '(0–255) nhưng phải diễn đạt hai chuyện khác hẳn nhau: "chương trình tự ' +
                     'thoát với mã <i>n</i>" và "chương trình bị tín hiệu <i>n</i> giết". Quy ' +
                     'ước dồn tín hiệu lên vùng 128–192, để lại 0–127 cho mã thoát thật. Nhờ ' +
                     'đó nhìn <code>$?</code> là biết ngay chuyện gì đã xảy ra — và đó cũng là ' +
                     'lý do bạn nên tránh <code>exit(137)</code> trong chương trình của mình.' },
        { t: 'p', x: '<b>Vế C — con số hoàn toàn khác.</b> Trong chương trình C, biến ' +
                     '<code>status</code> mà <code>waitpid</code> điền chứa số hiệu tín hiệu ' +
                     'ở <b>7 bit thấp</b>, <i>không</i> cộng 128. Đo thật:' },
        { t: 'code', where: 'out', nocopy: true,
          code: 'signal 15 -> raw status word = 15  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=15 WCOREDUMP=0\n' +
                'signal  9 -> raw status word =  9  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=9  WCOREDUMP=0\n' +
                'signal  2 -> raw status word =  2  WIFEXITED=0 WIFSIGNALED=1 WTERMSIG=2  WCOREDUMP=0' },
        { t: 'cal', kind: 'warn', title: '128 là tầng shell, không phải tầng nhân',
          x: '<p>Nhân đưa cho bạn một từ trạng thái đóng gói. Shell <i>đọc</i> từ đó, thấy ' +
             '<code>WIFSIGNALED</code>, rồi tự cộng 128 để trình bày. Trong C bạn không bao ' +
             'giờ thấy 143 — bạn thấy 15, và nếu đọc thẳng <code>status</code> mà không hỏi ' +
             '<code>WIFEXITED</code>/<code>WIFSIGNALED</code> trước thì bạn sẽ tưởng chương ' +
             'trình "thoát bình thường với mã 15". Đây đúng là câu D1.</p>' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 5,
      q: 'Chương trình <code>bad_reaper</code> sinh 5 con rồi dọn xác trong handler ' +
         '<code>SIGCHLD</code>. Nó <b>biên dịch sạch</b>, không cảnh báo, và vẫn để lại ' +
         'zombie. Hãy chạy nó, quan sát, tìm lỗi, sửa, rồi chạy lại <b>ít nhất bốn lần</b> ' +
         'để chứng minh bản sửa ổn định.',
      blocks: [
        { t: 'code', where: 'wsl',
          code: '#include <stdio.h>\n' +
                '#include <stdlib.h>\n' +
                '#include <signal.h>\n' +
                '#include <unistd.h>\n' +
                '#include <sys/wait.h>\n' +
                '\n' +
                'static volatile sig_atomic_t reaped = 0;\n' +
                '\n' +
                'static void on_chld(int sig)\n' +
                '{\n' +
                '    (void)sig;\n' +
                '    if (waitpid(-1, NULL, WNOHANG) > 0)\n' +
                '        reaped++;\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    struct sigaction sa = {0};\n' +
                '    int i;\n' +
                '\n' +
                '    sa.sa_handler = on_chld;\n' +
                '    sigemptyset(&sa.sa_mask);\n' +
                '    sa.sa_flags = SA_RESTART;\n' +
                '    sigaction(SIGCHLD, &sa, NULL);\n' +
                '\n' +
                '    printf("parent pid=%d, spawned 5 children\\n", (int)getpid());\n' +
                '    fflush(stdout);\n' +
                '\n' +
                '    for (i = 0; i < 5; i++)\n' +
                '        if (fork() == 0)\n' +
                '            _exit(0);\n' +
                '\n' +
                '    sleep(3);\n' +
                '    printf("handler reaped %d children\\n", reaped);\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: 'cd ~/bt21\n' +
                'gcc -Wall -Wextra -O2 -o bad_reaper bad_reaper.c\n' +
                './bad_reaper & sleep 2; ps -o pid,ppid,stat,comm --ppid $! ; wait' }
      ],
      hint: 'Chạy hai lần và so hai con số với nhau. Nếu chúng khác nhau thì lỗi không nằm ở ' +
            'một phép tính sai — nó nằm ở một giả định về <b>số lần</b> một việc xảy ra.',
      crit: [
        'Quan sát được rằng con số <b>thay đổi giữa các lần chạy</b> (đo được 3 rồi 2), và nhận ra đó là dấu hiệu của một cuộc đua chứ không phải một phép tính sai',
        'Kiểm được bất biến: <code>reaped</code> + số zombie = <b>5</b> ở mọi lần chạy',
        'Chẩn đoán đúng: <code>SIGCHLD</code> bị gộp, nên handler chạy ít hơn 5 lần; <code>if</code> chỉ gặt <b>một</b> xác cho mỗi lần chạy',
        'Sửa đúng bằng <b>một từ</b>: <code>if</code> → <code>while</code>',
        'Giải thích được vì sao <code>WNOHANG</code> là bắt buộc: không có nó, vòng <code>while</code> sẽ <b>chờ</b> đứa con tiếp theo ngay trong handler và chương trình đứng hình',
        'Chạy lại ít nhất 4 lần và ghi lại kết quả: <b>5 gặt, 0 zombie, mọi lần</b> — chứng minh bản sửa <b>tất định</b>, chứ không phải "may hơn"'
      ],
      sol: '<p><b>Quan sát trước, kết luận sau.</b> Chạy hai lần trên máy học:</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '--- bad_reaper: parent_pid=419  zombies_at_t=2s = 2\n' +
                '    424     419 Z+   bad_reaper\n' +
                '    425     419 Z+   bad_reaper\n' +
                '   | parent pid=419, spawned 5 children\n' +
                '   | handler reaped 3 children\n' +
                '\n' +
                '--- bad_reaper: parent_pid=434  zombies_at_t=2s = 3\n' +
                '    438     434 Z+   bad_reaper\n' +
                '    439     434 Z+   bad_reaper\n' +
                '    440     434 Z+   bad_reaper\n' +
                '   | parent pid=434, spawned 5 children\n' +
                '   | handler reaped 2 children' },
        { t: 'p', x: '<b>Hai con số khác nhau từ cùng một binary.</b> Đó là thông tin quan ' +
                     'trọng nhất bạn có, trước cả khi đọc mã: một phép tính sai thì sai giống ' +
                     'nhau mọi lần; chỉ một <b>cuộc đua</b> mới cho kết quả nhảy. Và bất biến ' +
                     'thì giữ nguyên: 3+2 = 5, 2+3 = 5. Không đứa con nào biến mất, chỉ là ai ' +
                     'dọn hay không dọn.' },
        { t: 'p', x: '<b>Chẩn đoán.</b> Năm đứa con chết gần như đồng thời, nhưng ' +
                     '<code>SIGCHLD</code> là tín hiệu chuẩn nên các lần tới trùng nhau bị ' +
                     'gộp. Handler chạy <i>k</i> lần với <i>k</i> &lt; 5, và ' +
                     '<code>if</code> gặt đúng một xác mỗi lần. <i>k</i> phụ thuộc vào việc ' +
                     'bao nhiêu con kịp chết trong lúc handler đang chạy — bộ lập lịch quyết ' +
                     'định, không phải mã của bạn.' },
        { t: 'p', x: '<b>Bản sửa — đúng một từ:</b>' },
        { t: 'code', where: 'wsl',
          code: 'static void on_chld(int sig)\n' +
                '{\n' +
                '    (void)sig;\n' +
                '    while (waitpid(-1, NULL, WNOHANG) > 0)   /* if -> while */\n' +
                '        reaped++;\n' +
                '}' },
        { t: 'code', where: 'out', nocopy: true,
          code: '--- good_reaper: parent_pid=448  zombies_at_t=2s = 0\n' +
                '   | parent pid=448, spawned 5 children\n' +
                '   | handler reaped 5 children' },
        { t: 'p', x: '<b>Vì sao nó chữa được triệt để.</b> Handler thôi hỏi "có đúng một xác ' +
                     'không" và chuyển sang hỏi "còn xác nào không" cho tới khi hết. Bây giờ ' +
                     'số <i>lần</i> chuyển phát không còn quan trọng: dù chỉ chạy một lần, ' +
                     'handler vẫn vét sạch mọi con đã chết tính tới thời điểm đó. Đo được ' +
                     '<b>5 gặt · 0 zombie, ổn định 4/4 lần chạy</b> — bản sửa là <b>tất ' +
                     'định</b>, không phải may mắn.' },
        { t: 'cal', kind: 'danger', title: 'WNOHANG không phải tuỳ chọn',
          x: '<p>Bỏ <code>WNOHANG</code> đi thì sau khi gặt hết, ' +
             '<code>waitpid</code> sẽ <b>ngồi chờ</b> đứa con tiếp theo — ngay bên trong ' +
             'handler, ngay trên luồng chính. Chương trình đứng hình và bạn đã đổi một lỗi ' +
             'rò rỉ zombie lấy một lỗi treo. <code>WNOHANG</code> là thứ biến ' +
             '<code>waitpid</code> từ "chờ" thành "hỏi", và chỉ có dạng "hỏi" mới hợp lệ ' +
             'trong handler.</p>' },
        { t: 'cal', kind: 'info', title: 'Cách còn ngắn hơn nữa',
          x: '<p>Nếu bạn hoàn toàn không quan tâm tới mã thoát của con, một dòng duy nhất — ' +
             '<code>signal(SIGCHLD, SIG_IGN);</code> — bảo nhân tự dọn xác, không zombie nào ' +
             'sinh ra cả. Đây là trường hợp <code>SIG_IGN</code> hợp lệ thứ hai bạn gặp trong ' +
             'bài (sau <code>SIGPIPE</code> ở câu C4). Cái giá: bạn <b>mất luôn</b> khả năng ' +
             'biết con thoát mã mấy hay chết vì tín hiệu nào — <code>wait()</code> sau đó sẽ ' +
             'trả <code>-1</code> với <code>ECHILD</code>. Chỉ dùng khi thật sự không cần ' +
             'thông tin đó.</p>' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Viết một daemon nhỏ <code>~/bt21/svc.c</code> gộp mọi thứ trong bài lại. Yêu cầu:' +
         '<ol>' +
         '<li>Chặn <code>SIGTERM</code>, <code>SIGINT</code>, <code>SIGHUP</code> ' +
         '<b>trước</b> khi tạo <code>signalfd</code>, rồi dùng <code>poll()</code> chờ đồng ' +
         'thời trên <b>hai</b> nguồn: fd tín hiệu và <code>STDIN_FILENO</code>.</li>' +
         '<li><code>SIGHUP</code> ⇒ in <code>"config reloaded"</code> và <b>chạy tiếp</b>.</li>' +
         '<li><code>SIGTERM</code>/<code>SIGINT</code> ⇒ xả một bộ đệm giả (ghi 1 MB ra ' +
         'tệp), in <code>"clean shutdown"</code>, thoát mã <b>0</b>.</li>' +
         '<li>Đo <b>độ trễ</b> từ lúc <code>kill</code> tới lúc tiến trình thoát, so với ' +
         '<b>0,005 s</b> đã đo được trong bài.</li>' +
         '<li>Chứng minh <code>SIGKILL</code> đi xuyên qua tất cả: gửi ' +
         '<code>kill -9</code> và cho thấy không có dòng <code>"clean shutdown"</code> nào, ' +
         'mã thoát <b>137</b>.</li>' +
         '</ol>' +
         'Câu để ngỏ, dành cho Bài 22: nếu daemon này có <b>bốn luồng</b>, ' +
         '<code>kill -TERM &lt;pid&gt;</code> sẽ đánh thức <code>signalfd</code> của luồng ' +
         'nào? Hãy đoán, ghi lại phỏng đoán của bạn, và đối chiếu ở bài sau.',
      hint: 'Thứ tự bắt buộc: <code>sigprocmask(SIG_BLOCK, ...)</code> <b>trước</b>, ' +
            '<code>signalfd()</code> sau. Đảo lại thì hành vi mặc định giết tiến trình trước ' +
            'khi fd kịp thấy gì — mã thoát 143, không một dòng log.',
      crit: [
        'Chặn ba tín hiệu <b>trước</b> khi gọi <code>signalfd()</code>, và giải thích được vì sao thứ tự này bắt buộc',
        '<code>poll()</code> chờ <b>cả hai</b> fd cùng lúc, và một sự kiện trên fd này không làm bỏ lỡ fd kia',
        'Đọc đúng một <code>struct signalfd_siginfo</code> mỗi lần và dùng <code>ssi_signo</code> để phân nhánh',
        '<code>SIGHUP</code> không làm thoát; gửi nó nhiều lần thì daemon vẫn sống — chứng minh được bằng log',
        'Thoát êm: có tệp 1 MB trên đĩa, có dòng <code>"clean shutdown"</code>, mã thoát <b>0</b>',
        'Đo được độ trễ và so sánh với 0,005 s; nếu chậm hơn nhiều thì <b>giải thích được vì sao</b> (thường là do 1 MB kia, không phải do tín hiệu)',
        '<code>kill -9</code> cho mã thoát <b>137</b>, <b>không</b> có tệp hoàn chỉnh và <b>không</b> có dòng <code>"clean shutdown"</code>',
        'Ghi lại phỏng đoán cho câu hỏi bốn luồng — <b>trước</b> khi học Bài 22'
      ],
      sol: '<p><b>Ba chỗ quyết định thành bại.</b></p>' +
           '<p><b>1. Thứ tự chặn rồi mới <code>signalfd</code>.</b> Nếu gọi ' +
           '<code>signalfd()</code> mà chưa chặn, tín hiệu vẫn đi con đường bình thường: bố ' +
           'trí mặc định của <code>SIGTERM</code> là chấm dứt, nên tiến trình chết ' +
           '<i>trước</i> khi <code>poll()</code> kịp trả về. Bạn được mã thoát <b>143</b> và ' +
           'không một dòng log. <code>signalfd</code> không tự bảo vệ bạn — nó chỉ là một cách ' +
           '<i>đọc</i> những tín hiệu mà bạn <i>đã</i> chặn.</p>' +
           '<p><b>2. Vì sao <code>signalfd</code> đáng dùng ở đây.</b> Toàn bộ vấn đề ' +
           'async-signal-safe biến mất. Không có handler nào chạy ở ngữ cảnh ngắt; ' +
           '<code>poll()</code> trả về ở ngữ cảnh <i>bình thường</i>, nơi mọi hàm libc đều ' +
           'hợp lệ. Bạn được phép gọi <code>fprintf</code>, <code>malloc</code>, ' +
           '<code>syslog</code> — những thứ mà câu C1 vừa cấm tiệt trong handler. Đổi lại: ' +
           'thêm một fd, thêm một vòng lặp sự kiện, và không dùng được nếu chương trình của ' +
           'bạn không có sẵn cấu trúc <code>poll</code>/<code>epoll</code>.</p>' +
           '<p><b>3. Đọc con số cho đúng.</b> Nếu độ trễ đo được là ~0,17 s thay vì 0,005 s, ' +
           '<b>đừng đổ cho tín hiệu</b>. Phần tín hiệu vẫn tốn vài mili giây; phần còn lại là ' +
           '1 MB ghi xuống đĩa. Đây chính là bài học của câu C5: khung tín hiệu gần như miễn ' +
           'phí, ngân sách tắt máy bị tiêu bởi <b>lượng dữ liệu</b>. Muốn biết chắc, chạy lại ' +
           'với bộ đệm 0 byte và so hai con số.</p>' +
           '<p><b>Và <code>SIGKILL</code>.</b> Không có gì cứu được: nó không vào ' +
           '<code>signalfd</code>, không có handler, không chặn được. ' +
           '<code>sigaddset(&amp;mask, SIGKILL)</code> thậm chí không báo lỗi — nhân chỉ lặng ' +
           'lẽ bỏ qua yêu cầu đó. Kết quả: mã thoát 137, tệp cụt, không log. Đó là toàn bộ lý ' +
           'do vì sao <code>SIGTERM</code> tồn tại và vì sao bạn phải xử lý nó cho tử tế.</p>' +
           '<p><b>Câu để ngỏ — phỏng đoán trước khi học Bài 22.</b> Với bốn luồng, ' +
           '<code>kill -TERM &lt;pid&gt;</code> là tín hiệu <i>hướng tiến trình</i>: nó vào ' +
           '<code>ShdPnd</code> (chính cái hàng dùng chung ở câu E2), và nhân chọn ' +
           '<b>bất kỳ</b> luồng nào <i>không chặn</i> tín hiệu đó để chuyển phát — bạn không ' +
           'điều khiển được luồng nào. Hệ quả thiết kế cho chương trình đa luồng: chặn tín ' +
           'hiệu ở <b>mọi</b> luồng, rồi dành <b>một</b> luồng chuyên trách gọi ' +
           '<code>sigwait()</code> hoặc đọc <code>signalfd</code>. Bài 22 sẽ dựng lại chuyện ' +
           'này bằng đo đạc; hãy giữ phỏng đoán của bạn để đối chiếu.</p>' }
  ],
  diag: [
    ['A1, B1, C1',
     'Bạn chưa phân biệt được <b>ngữ cảnh handler</b> với ngữ cảnh bình thường: chưa thấy vì ' +
     'sao <code>printf</code> hợp lệ ở một chỗ và là lỗi ở chỗ kia, và chưa nhớ ba việc duy ' +
     'nhất handler được phép làm.',
     '<a href="#/bai-21#quy-tac-vang-trong-handler-duoc-lam-gi-va-khong-duoc-lam-gi">Đọc lại Bài 21 — Quy tắc vàng: trong handler được làm gì và không được làm gì</a>, ' +
     'đặc biệt mục <a href="#/bai-21#ba-viec-handler-duoc-phep-lam">Ba việc handler được phép làm</a>'],

    ['A5, B2, C2',
     'Bạn còn lẫn <b>chặn</b> (hoãn) với <b>bỏ qua</b> (vứt). Đây là nhầm lẫn đắt nhất trong ' +
     'bài: nó biến một yêu cầu tắt máy thành im lặng, và bạn chỉ phát hiện khi thiết bị đã ' +
     'hỏng dữ liệu.',
     '<a href="#/bai-21#sigprocmask-chan-tin-hieu-de-bao-ve-vung-toi-han">Đọc lại Bài 21 — sigprocmask: chặn tín hiệu để bảo vệ vùng tới hạn</a>'],

    ['A7, B3, C3, E1, E2',
     'Bạn còn tin rằng gửi <i>n</i> tín hiệu thì handler chạy <i>n</i> lần. Tín hiệu chuẩn ' +
     'nằm trong một <b>tập bit</b>, không phải hàng đợi — và mất mát này hoàn toàn im lặng.',
     '<a href="#/bai-21#tin-hieu-la-gi-ngat-mem-do-nhan-chuyen-phat">Đọc lại Bài 21 — Tín hiệu là gì: ngắt mềm do nhân chuyển phát</a>'],

    ['A2, E4, D1',
     'Bạn chưa nắm quy ước mã thoát: <b>128 + số hiệu tín hiệu</b> là cách <i>shell</i> trình ' +
     'bày, còn từ trạng thái trong C chứa số hiệu ở 7 bit thấp. Hai con số khác nhau cho cùng ' +
     'một sự việc.',
     '<a href="#/bai-21#tat-em-ban-hop-dong-giua-sigterm-va-sigkill">Đọc lại Bài 21 — Tắt êm: bản hợp đồng giữa SIGTERM và SIGKILL</a> · ' +
     '<a href="#/bai-20#wait-waitpid-va-cach-doc-ma-thoat-cho-dung">Bài 20 — wait, waitpid và cách đọc mã thoát cho đúng</a>'],

    ['A3, A4',
     'Bạn chưa rõ <b>thời điểm</b> tín hiệu được chuyển phát (khi nhân quay về không gian ' +
     'người dùng) và vì sao phải lưu/khôi phục <code>errno</code> trong handler.',
     '<a href="#/bai-21#tin-hieu-la-gi-ngat-mem-do-nhan-chuyen-phat">Đọc lại Bài 21 — Tín hiệu là gì: ngắt mềm do nhân chuyển phát</a>'],

    ['A6, B6',
     'Bạn chưa thấy vì sao <code>sigaction</code> là lựa chọn bắt buộc, kể cả khi ' +
     '<code>signal()</code> chạy đúng trên máy của bạn. Cái sai của <code>signal()</code> chỉ ' +
     'lộ ra trên thiết bị đích.',
     '<a href="#/bai-21#signal-hay-sigaction-vi-sao-cau-tra-loi-luon-la-sigaction">Đọc lại Bài 21 — signal() hay sigaction(): vì sao câu trả lời luôn là sigaction</a>'],

    ['A8, C4',
     'Bạn chưa thuộc danh mục tín hiệu và bố trí mặc định của từng cái — nên một mã thoát ' +
     '141 hay một tiến trình biến mất không log vẫn còn là điều bí ẩn.',
     '<a href="#/bai-21#danh-muc-tin-hieu-can-thuoc">Đọc lại Bài 21 — Danh mục tín hiệu cần thuộc</a>'],

    ['B4, E5',
     'Bạn chưa thấy vì sao <code>if</code> trong handler <code>SIGCHLD</code> để lọt zombie, ' +
     'và vì sao con số lại <b>nhảy</b> giữa các lần chạy. Đây là mẫu <code>while</code> + ' +
     '<code>WNOHANG</code> mà mọi daemon sinh tiến trình con đều cần.',
     '<a href="#/bai-21#sigchld-loi-giai-cho-bai-toan-zombie-o-bai-20">Đọc lại Bài 21 — SIGCHLD: lời giải cho bài toán zombie ở Bài 20</a> · ' +
     '<a href="#/bai-20#zombie-va-mo-coi-hai-ket-cuc-khi-quan-he-cha-con-dut-gay">Bài 20 — Zombie và mồ côi</a>'],

    ['B5',
     'Bạn còn nghĩ <code>SA_RESTART</code> khởi động lại <i>mọi</i> lời gọi hệ thống, hoặc ' +
     'chưa biết <code>sleep()</code> cắt phần lẻ khi trả về số giây còn lại.',
     '<a href="#/bai-21#loi-thuong-gap">Đọc lại Bài 21 — Lỗi thường gặp</a> (hàng về EINTR và SA_RESTART)'],

    ['C5, E6',
     'Bạn chưa quy được thiết kế tắt máy thành một <b>bài toán ngân sách thời gian</b>: bao ' +
     'nhiêu dữ liệu, bao nhiêu giây, hạn chót là ai đặt ra.',
     '<a href="#/bai-21#tat-em-ban-hop-dong-giua-sigterm-va-sigkill">Đọc lại Bài 21 — Tắt êm: bản hợp đồng giữa SIGTERM và SIGKILL</a> · ' +
     '<a href="#/bai-21#signalfd-bien-tin-hieu-thanh-mot-file-descriptor">signalfd: biến tín hiệu thành một file descriptor</a>'],

    ['E2, E3',
     'Bạn chưa đọc được trạng thái tín hiệu của một tiến trình đang chạy từ ' +
     '<code>/proc</code> — kỹ năng gỡ lỗi quan trọng nhất khi trên thiết bị không có ' +
     '<code>gdb</code> lẫn <code>strace</code>. Nhớ đọc <b>cả</b> <code>SigPnd</code> lẫn ' +
     '<code>ShdPnd</code>.',
     '<a href="#/bai-21#sigprocmask-chan-tin-hieu-de-bao-ve-vung-toi-han">Đọc lại Bài 21 — sigprocmask: chặn tín hiệu để bảo vệ vùng tới hạn</a> · ' +
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Bài 5 — /proc và /sys: hai thư mục không nằm trên đĩa</a>'],

    ['D2',
     'Bạn chưa nắm <code>volatile</code>: vì sao vòng lặp chờ cờ chạy đúng ở <code>-O0</code> ' +
     'và treo ở <code>-O2</code>.',
     '<a href="#/bai-14#volatile-tu-khoa-cuu-ban-khoi-chinh-trinh-bien-dich">Đọc lại Bài 14 — volatile: từ khoá cứu bạn khỏi chính trình biên dịch</a>'],

    ['D3',
     'Bạn chưa xử lý đúng giá trị trả về của <code>write()</code>: ghi thiếu không phải lỗi, ' +
     'và bỏ qua nó là mất dữ liệu âm thầm.',
     '<a href="#/bai-19#nam-lenh-goi-nen-tang-open-read-write-close-lseek">Đọc lại Bài 19 — Năm lệnh gọi nền tảng: open, read, write, close, lseek</a> · ' +
     '<a href="#/bai-19#errno-nhan-noi-loi-gi-va-khi-nao-duoc-phep-tin-no">errno: nhân nói lỗi gì, và khi nào được phép tin nó</a>']
  ]
});

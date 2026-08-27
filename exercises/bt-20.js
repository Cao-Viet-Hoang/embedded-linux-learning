/* ═══════════════════════════════════════════════════════════════════════════
   bt-20 — Bài tập cho Bài 20: Tiến trình — fork, exec, wait
   ═══════════════════════════════════════════════════════════════════════════

   CHỌN TRỤC XOÁY — bảy bước của CLAUDE.md §13.4 (skill write-exercise).
   Ghi lại ở đây để một phiên sau kiểm toán được lựa chọn thay vì phải suy lại.

   ── Bước 1 · Kiểm kê ────────────────────────────────────────────────────────
   Nguồn: goals, mọi h2/h3, mọi cal kind:'why', mọi tiêu đề cmdx, terms, recap
   của lessons/bai-20.js. 14 ứng viên:

     1  tiến trình dưới góc nhìn của nhân: task_struct, PID là chỉ số vào đó
     2  fork() là hàm duy nhất trả về HAI lần — một lời gọi, hai tiến trình
     3  sau fork, cha và con thấy cùng địa chỉ ảo nhưng không chung một byte
     4  exec thay toàn bộ ảnh chương trình nhưng GIỮ NGUYÊN PID
     5  execvp dò PATH (bảy execve ENOENT liên tiếp), execl thì không
     6  status của wait là một TỪ ĐÓNG GÓI, phải giải mã bằng WIFxxx + WEXITSTATUS
     7  zombie: đã chết, vẫn còn một dòng trong bảng tiến trình
     8  mồ côi: được subreaper GẦN NHẤT nhận nuôi, không nhất thiết là PID 1
     9  biến môi trường là bộ cấu hình đi theo tiến trình qua exec
    10  dup2 chuyển hướng đầu ra bằng cách thay một ô trong bảng fd
    11  daemon hoá: fork hai lần, setsid, cột TT thành '?'
    12  quy ước mã thoát 0 / 1-125 / 126 / 127 / 128+n
    13  giá thật của fork+exec tính bằng micro giây
    14  không hề có lời gọi hệ thống tên fork — chỉ có clone

   ── Bước 2 · Chấm điểm 0/1/2 trên ba trục ───────────────────────────────────
   D = phụ thuộc về sau · M = giá của hiểu sai · C = phản trực giác

     #   D  M  C  tổng   ghi chú
     ──────────────────────────────────────────────────────────────────────────
     1   2  0  1   3     nền tảng, nhưng hiểu sai gần như không tốn gì
     2   2  2  2   6     Bài 21-24, init, mọi daemon; "gọi một lần chạy hai lần"
     3   2  2  2   6     hỏng dữ liệu ÂM THẦM; ai cũng tưởng cha con chung biến
     4   2  2  2   6     Bài 21 (tín hiệu theo PID), Chặng 06-13 (init, initramfs)
     5   1  1  1   3     là hành vi tra cứu được, không phải nguyên lý
     6   2  2  2   6     if (status == 3) chạy đúng cú pháp và trả lời SAI
     7   1  2  1   4     Bài 21 sẽ giải; hết slot PID trên board là lỗi thật
     8   1  1  2   4     "PID 1 nhận nuôi" là câu ai cũng thuộc và đã cũ
     9   2  1  1   4     Chặng 09-12 (systemd, initramfs) dùng liên tục
    10   2  1  1   4     nền cho pipe, cho log của daemon, cho Chặng 08
    11   1  1  2   4     cột TT '?' là bằng chứng, không phải nguyên lý
    12   1  2  1   4     127 vs 126 vs 128+n — đọc sai thì chẩn đoán sai hướng
    13   0  1  1   2     là số đo môi trường, không phải nguyên lý
    14   0  0  2   2     tra cứu được trong 10 giây (§13.3 cấm làm trục)

   ── Bước 3 · Cắt (tổng ≥ 4 VÀ ≥ 2 trục ≥ 1) ─────────────────────────────────
   Qua vòng: #2 (6) · #3 (6) · #4 (6) · #6 (6) · #7 (4) · #8 (4) · #9 (4) ·
             #10 (4) · #11 (4) · #12 (4)

   ── Bước 4 · Loại ───────────────────────────────────────────────────────────
   #3   LOẠI, dù 6 điểm. Bước 7 cấm hai trục dùng chung từ vựng, mà #3 và #2
        cùng bắt đầu bằng "sau fork…" và cùng lấy bằng chứng từ MỘT chương
        trình có fork. Ba câu của #3 sẽ nghe như ba câu của #2 nói lại. Giữ #2
        (nó là điều kiện để hiểu #3, không phải ngược lại); #3 xuống làm câu
        thường A3 + B5.
   #7   LOẠI — 4 điểm, và Bài 21 mới là nơi zombie được GIẢI (SIGCHLD). Xoáy
        nó ở đây thì bt-21 không còn gì để xoáy, mà §13.4 bước 4 chỉ cho phép
        một khái niệm được xoáy đúng một lần trong cả khoá. Làm câu thường
        A7 + E4.
   #8 #9 #10 #11 #12  LOẠI — đều 4 điểm, thua ba câu 6 điểm còn lại. Xuống làm
        câu thường: #8 → A6, #9 → C4, #10 → B6 + E6, #11 → C5, #12 → A4.

   ── Kiểm tra chồng lấn với §13.8 (trục đã tiêu) ─────────────────────────────
   bt-01…bt-19 đã rà. Ba điểm cần chú ý:
   · bt-19 đã tiêu "printf ghi vào một vùng đệm NẰM TRONG tiến trình". Ở đây
     bằng chứng của #2 (buffer_fork in "line B" hai lần khi ghi ra file) NHÌN
     thì giống hệt. Ranh giới: bt-19 hỏi "dữ liệu đang nằm ở đâu", bt-20 hỏi
     "vì sao có HAI bản". Vùng đệm chỉ là vật chứng; điều được xoáy là việc
     fork nhân đôi cả tiến trình lẫn mọi thứ trong nó. Để không lấn, câu B2 ở
     đây dùng chương trình fork_tree (KHÔNG có printf trước fork) làm bằng
     chứng chính, còn buffer_fork chỉ xuất hiện ở D1 — đúng chỗ ôn bài cũ.
   · bt-04 đã tiêu "$? là câu trả lời duy nhất của máy cho câu hỏi có chạy
     được không". #6 ở đây là tầng dưới của chính $?: shell lấy $? bằng
     WEXITSTATUS. Nên $? đi vào D2 (ôn bài cũ), còn trục chỉ nói về từ đóng
     gói trong C, không nhắc $? một lần nào ở A/B/C.
   · bt-09 đã tiêu "kill -9 là mệnh lệnh". Ở đây signal chỉ xuất hiện như một
     GIÁ TRỊ trong status word (WTERMSIG), không phải như cơ chế — cơ chế là
     việc của Bài 21.

   ── Bước 5 · Ba câu có thể sai ──────────────────────────────────────────────
   T0  fork() là hàm duy nhất trả về HAI lần: sau nó có hai tiến trình cùng
       chạy tiếp từ đúng dòng đó, và giá trị trả về — 0 cho con, PID của con
       cho cha — là thứ DUY NHẤT phân biệt được ai đang chạy.
   T1  exec thay toàn bộ ảnh chương trình nhưng giữ nguyên PID, các file
       descriptor đang mở và môi trường; dòng lệnh nằm ngay sau một exec
       THÀNH CÔNG không bao giờ được chạy.
   T2  status mà wait() ghi ra KHÔNG phải mã thoát: nó là một từ đóng gói
       nhiều thông tin, phải hỏi WIFEXITED trước rồi mới bóc WEXITSTATUS —
       một tiến trình exit 3 cho status = 768.

   ── Bước 6 · Hiểu sai đối lập ───────────────────────────────────────────────
   M0  "fork() gọi sang một hàm khác / sinh ra một luồng. Code sau fork chạy
       một lần, trong tiến trình con."
   M1  "exec sinh ra một tiến trình con để chạy chương trình mới, còn chương
       trình cũ chạy tiếp dòng bên dưới."
   M2  "status CHÍNH LÀ mã thoát. Cứ so sánh if (status == 3) là biết con
       thoát với mã 3."

   ── Bước 7 · Lưới 3 × 1 và kiểm tra ─────────────────────────────────────────
          A (phát biểu)              B (dữ liệu thật đo được)      C (tình huống mới)
   T0     a1 fork trả về mấy lần     b1 fork_tree: 3 fork ra       c1 board 64 MB, vòng
          và giá trị nói gì             8 dòng, 8 PID khác nhau       lặp fork thiếu _exit
   T1     a2 dòng ngay sau một       b3 myexec: 4 ca, execvp dò    c2 watchdog: chọn
          execlp thành công             PATH rồi ENOENT               exec hay fork+exec
   T2     a5 status có phải mã       b4 runner_broken in ra        c3 CI báo PASS trong
          thoát không (đúng/sai)        "child exit code = 768"       khi test đã fail

   Kiểm tra: c3 không trả lời được nếu không biết status là từ đóng gói (mọi
   phương án sai đều "hợp lý" nếu tin M2). Ba loại kích thích khác nhau: phát
   biểu / transcript thật / tình huống có ràng buộc mới. Không câu nào lộ đáp
   án cho câu sau — b4 giải thích 768 nhưng E5 sửa một lỗi KHÁC hẳn (rơi
   xuyên qua exec thất bại), không phải lỗi của runner_broken.

   ═══════════════════════════════════════════════════════════════════════════
   XUẤT XỨ SỐ LIỆU
   Mọi transcript trong file này chạy thật ngày 26/08/2026 trên WSL2 Ubuntu
   26.04 "resolute", gcc 15.2.0, strace 6.16, 6 lõi. Chương trình dùng ở đây
   (fork_tree.c, buffer_fork.c, myexec.c, runner_broken.c, runner_fixed.c,
   leaky.c, fallthrough.c) KHÁC hoàn toàn với chương trình của
   lessons/bai-20.js, để người học không trả lời được bằng cách nhớ output cũ.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-20',
  minutes: 85,

  intro:
    '<p>Bài 20 là bài đầu tiên bạn <b>tạo ra</b> một tiến trình thay vì chỉ quan sát nó. Ba ' +
    'thứ trong bài này gây ra nhiều lỗi hơn tất cả những thứ còn lại cộng lại, và cả ba đều ' +
    'có chung một đặc điểm khó chịu: <b>chương trình biên dịch sạch, chạy không báo lỗi, và ' +
    'trả lời sai</b>. Bộ bài tập này xoáy vào đúng ba thứ đó.</p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài</b> (khoảng 23 phút): phần <b>A</b> và ' +
    '<b>B</b>. Củng cố khi kiến thức còn nóng.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (khoảng 60 phút): phần <b>C</b>, <b>D</b> và ' +
    '<b>E</b>. Khoảng nghỉ không phải là sự trì hoãn — nhớ lại sau khi đã quên một phần ' +
    'thì bám chắc hơn nhiều so với nhớ lại ngay.</li>' +
    '</ul>' +
    '<p><b>Lưu ý về số liệu.</b> Mọi output trong bộ này được đo lại trên một bộ chương ' +
    'trình <b>mới</b>, không phải chương trình bạn đã chạy trong bài học. Bạn không thể trả ' +
    'lời bằng cách nhớ con số cũ — phải đọc và hiểu output trước mắt. PID sẽ khác trên máy ' +
    'bạn; thứ phải giữ nguyên là các <b>quan hệ</b> giữa những con số đó.</p>',

  truc: [
    { id: 'forktwice',
      name: '<code>fork()</code> là hàm duy nhất trả về <b>hai lần</b> — sau nó có hai tiến ' +
            'trình cùng chạy tiếp từ đúng dòng đó, và giá trị trả về là thứ duy nhất phân ' +
            'biệt được ai đang chạy',
      x: 'Mọi hàm bạn từng gọi đều trả về đúng một lần, cho đúng một luồng thực thi. ' +
         '<code>fork()</code> phá vỡ quy tắc đó: nhân tạo thêm một bản sao của cả tiến trình, ' +
         'rồi cho <b>cả hai</b> bản chạy tiếp từ cùng một chỗ. Không có "code của con" và ' +
         '"code của cha" — chỉ có một đoạn mã và hai tiến trình đang đi qua nó.',
      mis: 'Người mới đọc <code>fork()</code> như một lời gọi hàm bình thường: "nó nhảy đi ' +
           'đâu đó, sinh ra một thứ gì đó, rồi quay về". Từ đó họ tin rằng những dòng bên ' +
           'dưới chỉ chạy một lần — và ngạc nhiên khi thấy mọi thứ in ra hai bản, hoặc khi ' +
           'một vòng lặp có <code>fork</code> bên trong nhân ra cấp số nhân.' },

    { id: 'execkeepspid',
      name: '<code>exec</code> thay toàn bộ ảnh chương trình nhưng <b>giữ nguyên PID</b>, các ' +
            'file descriptor đang mở và môi trường — dòng lệnh ngay sau một <code>exec</code> ' +
            'thành công không bao giờ được chạy',
      x: '<code>exec</code> không tạo ra gì cả. Nó lấy đúng tiến trình đang gọi, vứt bỏ toàn ' +
         'bộ mã và dữ liệu cũ, nạp chương trình mới vào chỗ đó rồi nhảy tới điểm vào của nó. ' +
         'Cái vỏ — số PID, cha là ai, bảng file descriptor, thư mục hiện hành, môi trường — ' +
         'ở nguyên. Đó chính là lý do <code>fork</code> và <code>exec</code> là hai hàm chứ ' +
         'không phải một.',
      mis: 'Người mới tin <code>exec</code> "chạy một chương trình" giống như gõ tên nó trong ' +
           'shell: chương trình mới chạy xong thì quay về dòng bên dưới. Hậu quả là họ viết ' +
           'mã dọn dẹp, mã ghi log, mã <code>return</code> ngay sau <code>execlp</code> — và ' +
           'không hiểu vì sao nó chỉ chạy khi chương trình <b>không</b> tồn tại.' },

    { id: 'packedstatus',
      name: '<code>status</code> mà <code>wait()</code> ghi ra <b>không phải</b> mã thoát: nó ' +
            'là một từ đóng gói nhiều thông tin, phải hỏi <code>WIFEXITED</code> trước rồi ' +
            'mới bóc <code>WEXITSTATUS</code>',
      x: 'Một tiến trình con có thể kết thúc theo nhiều kiểu khác nhau — tự thoát, bị tín ' +
         'hiệu giết, bị dừng — và mỗi kiểu mang theo một con số riêng. Nhân nhét tất cả vào ' +
         'một <code>int</code> duy nhất. Bộ macro <code>WIF*</code> tồn tại để bạn hỏi ' +
         '<i>kiểu nào</i> trước, rồi mới bóc <i>con số nào</i>.',
      mis: 'Người mới thấy tham số tên là <code>status</code> và kết luận nó chứa mã thoát, ' +
           'nên viết <code>if (status == 3)</code>. Câu lệnh đó biên dịch sạch, chạy không ' +
           'báo lỗi, và <b>luôn</b> cho kết quả sai — vì mã thoát 3 nằm ở byte thứ hai, khiến ' +
           '<code>status</code> bằng 768 chứ không phải 3.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Trong một tiến trình đang chạy, bạn gọi <code>pid_t p = fork();</code> và lời gọi ' +
         'thành công. Ngay sau đó, điều gì đúng?',
      opts: [
        'Một tiến trình con được tạo ra và chạy từ đầu hàm <code>main</code>; tiến trình cha chạy tiếp dòng dưới',
        'Có <b>hai</b> tiến trình cùng chạy tiếp từ đúng dòng dưới <code>fork</code>; trong cha <code>p</code> là PID của con, trong con <code>p</code> bằng <b>0</b>',
        'Một luồng (thread) mới được tạo trong cùng tiến trình; hai luồng dùng chung biến <code>p</code>',
        'Tiến trình cha tạm dừng cho tới khi tiến trình con kết thúc, rồi mới chạy tiếp'
      ],
      a: 1,
      why: '<code>fork()</code> là <b>hàm duy nhất trả về hai lần</b>. Nhân nhân bản toàn bộ ' +
           'tiến trình — kể cả con trỏ lệnh đang trỏ vào giữa <code>fork</code> — nên cả hai ' +
           'bản sao đều tiếp tục từ <i>cùng một dòng</i>. Phương án A sai ở chỗ "chạy từ đầu ' +
           '<code>main</code>": con <b>không</b> khởi động lại, nó thừa hưởng nguyên trạng ' +
           'thái. Phương án C nhầm với <code>pthread_create</code>: hai tiến trình có hai ' +
           'không gian địa chỉ riêng, không chung một biến nào. Phương án D nhầm với ' +
           '<code>system()</code>: <code>fork</code> không hề chờ, muốn chờ thì phải gọi ' +
           '<code>wait</code>. Giá trị trả về là <b>thứ duy nhất</b> khác nhau giữa hai bản, ' +
           'và vì thế nó là thứ duy nhất bạn có để rẽ nhánh.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn viết đoạn này trong tiến trình con:<br>' +
         '<code>execlp("ls", "ls", NULL);</code><br>' +
         '<code>printf("da chay xong ls\\n");</code><br>' +
         'Khi <code>ls</code> <b>có</b> trên máy, dòng <code>printf</code> in ra khi nào?',
      opts: [
        'Ngay sau khi <code>ls</code> chạy xong, vì <code>execlp</code> trả về sau khi chương trình con kết thúc',
        '<b>Không bao giờ</b> — <code>execlp</code> thành công thì mã của chương trình cũ đã bị xoá khỏi bộ nhớ, không còn dòng nào để chạy',
        'Trước khi <code>ls</code> in ra, vì <code>execlp</code> trả về ngay lập tức và <code>ls</code> chạy song song',
        'Ngẫu nhiên trước hoặc sau output của <code>ls</code>, tuỳ bộ lập lịch'
      ],
      a: 1,
      why: 'Đây là chỗ trực giác đánh lừa mạnh nhất trong cả bài. <code>exec</code> ' +
           '<b>không tạo ra tiến trình nào</b> và <b>không chạy song song</b>: nó ghi đè ' +
           'chính tiến trình đang gọi. Toàn bộ đoạn mã chứa dòng <code>printf</code> kia đã ' +
           'bị vứt khỏi bộ nhớ trước khi <code>ls</code> chạy dòng đầu tiên. ' +
           'Hệ quả thực dụng: <b>một dòng lệnh nằm sau <code>exec</code> chỉ chạy khi ' +
           '<code>exec</code> đã thất bại</b> — nên chỗ đó là nơi duy nhất đúng để đặt ' +
           '<code>perror("execlp")</code> và <code>_exit(127)</code>. Nếu bạn quên, tiến ' +
           'trình con sẽ rơi xuyên xuống và chạy tiếp mã của tiến trình cha (bài E5 cho bạn ' +
           'xem chuyện đó trông như thế nào).' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Sau <code>fork()</code>, cả cha lẫn con cùng in địa chỉ của một biến toàn cục ' +
         '<code>counter</code> và cùng thấy <code>0x55f3c2a04010</code>. Con gán ' +
         '<code>counter = 99</code>. Cha in <code>counter</code> ra thì thấy gì?',
      opts: [
        '<b>99</b> — cùng một địa chỉ thì cùng một ô nhớ',
        '<b>Giá trị cũ</b> — hai địa chỉ ảo giống nhau được MMU ánh xạ tới hai khung vật lý khác nhau ngay khi con ghi vào',
        'Không xác định — tuỳ tiến trình nào chạy trước',
        '<b>99</b>, nhưng chỉ khi cha đọc sau khi con đã kết thúc'
      ],
      a: 1,
      why: 'Địa chỉ mà chương trình nhìn thấy là <b>địa chỉ ảo</b>, và mỗi tiến trình có bảng ' +
           'ánh xạ riêng — cùng một con số hoàn toàn có thể trỏ tới hai chỗ khác nhau trong ' +
           'RAM. Ngay sau <code>fork</code>, nhân tiết kiệm bằng <b>copy-on-write</b>: hai ' +
           'bên tạm dùng chung khung vật lý, đánh dấu chỉ-đọc. Lần ghi đầu tiên sinh ra một ' +
           'lỗi trang, nhân chép khung ra một bản riêng rồi mới cho ghi. Từ giây phút đó hai ' +
           'bên hoàn toàn độc lập. Đây là lý do <code>fork</code> rẻ hơn nhiều so với "chép ' +
           'toàn bộ bộ nhớ", <i>và</i> là lý do bạn không thể dùng biến để cha con nói ' +
           'chuyện với nhau — muốn nói chuyện thì phải dùng ống, file, hoặc tín hiệu ' +
           '(Bài 21).' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trong shell, bạn chạy một lệnh và <code>echo $?</code> in ra <b>127</b>. Điều đó ' +
         'nói lên gì, theo quy ước mã thoát?',
      opts: [
        'Chương trình đã chạy và tự thoát với mã lỗi 127 do chính nó định nghĩa',
        '<b>Không tìm thấy lệnh</b> — shell đã không exec được gì cả',
        'Lệnh bị giết bởi tín hiệu số 127',
        'Lệnh tìm thấy nhưng không có quyền thực thi'
      ],
      a: 1,
      why: 'Quy ước này có thật và bạn sẽ đọc nó mỗi ngày: <b>0</b> thành công; ' +
           '<b>1–125</b> lỗi do chính chương trình định nghĩa; <b>126</b> tìm thấy file ' +
           'nhưng <i>không thực thi được</i> (thiếu bit <code>x</code>, hoặc là thư mục); ' +
           '<b>127</b> <i>không tìm thấy lệnh</i>; <b>128+n</b> bị giết bởi tín hiệu ' +
           '<code>n</code> — nên <code>137</code> là <code>128+9</code>, tức ' +
           '<code>SIGKILL</code>. Phân biệt 126 với 127 là việc đáng giá: 127 bảo bạn đi sửa ' +
           '<code>PATH</code> hoặc tên lệnh, còn 126 bảo bạn đi sửa quyền — hai hướng chẩn ' +
           'đoán hoàn toàn khác nhau.' },

    { id: 'a5', k: 'tf', truc: 2, tag: 'Đúng/Sai kèm sửa',
      q: 'Sau <code>wait(&amp;status)</code>, biến <code>status</code> chứa mã thoát của tiến ' +
         'trình con, nên <code>if (status == 3)</code> là cách hợp lệ để biết con đã thoát ' +
         'với mã 3.',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nêu trình tự hai bước bắt buộc để đọc ' +
          '<code>status</code>.',
      why: '<b>Sai.</b> <code>status</code> là một <b>từ đóng gói</b>: nhân nhồi nhiều thông ' +
           'tin khác nhau vào một <code>int</code>. Với một tiến trình tự thoát, mã thoát nằm ' +
           'ở <b>byte thứ hai</b> — nên <code>exit(3)</code> cho <code>status = 768</code> ' +
           '(vì 3 × 256 = 768), chứ không phải 3. Với một tiến trình bị giết, số hiệu tín ' +
           'hiệu nằm ở byte thấp. Hai kiểu kết thúc đó không thể phân biệt bằng cách nhìn ' +
           'con số thô.',
      crit: [
        'Nói rõ <code>status</code> là một <b>từ đóng gói</b>, không phải mã thoát',
        'Nêu đúng trình tự hai bước: (1) <code>WIFEXITED(status)</code> hỏi <i>kiểu</i> kết thúc; (2) chỉ khi nó đúng mới bóc <code>WEXITSTATUS(status)</code>',
        'Nêu được nhánh còn lại: <code>WIFSIGNALED</code> → <code>WTERMSIG</code> cho tiến trình bị tín hiệu giết',
        'Nêu được con số cụ thể: <code>exit(3)</code> cho <code>status = 768</code>'
      ],
      sol: '<p><b>Phát biểu đúng:</b> "Sau <code>wait(&amp;status)</code>, biến ' +
           '<code>status</code> chứa một từ đóng gói mô tả <i>tiến trình con kết thúc như thế ' +
           'nào</i>. Muốn lấy mã thoát thì phải giải mã nó bằng macro, không được so sánh ' +
           'trực tiếp."</p>' +
           '<p><b>Trình tự đúng, hai bước, không được đảo:</b></p>' +
           '<ol>' +
           '<li>Hỏi <b>kiểu</b> kết thúc trước: <code>WIFEXITED(status)</code> đúng nghĩa là ' +
           'con tự thoát; <code>WIFSIGNALED(status)</code> đúng nghĩa là con bị một tín hiệu ' +
           'giết.</li>' +
           '<li>Chỉ khi bước 1 trả lời rồi mới được bóc con số: <code>WEXITSTATUS(status)</code> ' +
           'cho mã thoát 0–255, hoặc <code>WTERMSIG(status)</code> cho số hiệu tín hiệu.</li>' +
           '</ol>' +
           '<p><b>Vì sao 768.</b> Với một tiến trình tự thoát, nhân đặt mã thoát vào byte thứ ' +
           'hai: <code>status = ma_thoat &lt;&lt; 8</code>. Nên <code>exit(3)</code> cho ' +
           '<code>3 &lt;&lt; 8 = 768</code>, <code>exit(1)</code> cho <code>256</code>, và ' +
           '<code>exit(0)</code> cho <code>0</code> — con số 0 này chính là lý do lỗi ' +
           '<code>status == 0</code> sống sót qua mọi bài test "trường hợp thành công" rồi ' +
           'mới nổ trên máy khách.</p>' +
           '<p>Còn một tiến trình bị <code>SIGKILL</code> giết cho <code>status = 9</code> — ' +
           'byte thấp. Đó là lý do bạn <b>không thể</b> đoán kiểu kết thúc từ con số: 9 vừa ' +
           'có thể là "bị tín hiệu 9 giết", vừa trông như một con số nhỏ vô hại.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Khi tiến trình cha chết trước con, tiến trình con mồ côi luôn được <b>PID 1</b> ' +
         'nhận nuôi.',
      a: 1,
      rw: 'Viết lại cho đúng, và nói rõ làm thế nào để biết ai thực sự đã nhận nuôi một tiến ' +
          'trình mồ côi trên máy bạn.',
      why: '<b>Sai</b> trên mọi bản Linux hiện đại. Câu "PID 1 nhận nuôi" đúng với Unix cổ, ' +
           'nhưng từ Linux 3.4 có cơ chế <b>subreaper</b>: một tiến trình có thể tự đăng ký ' +
           'làm "cha nuôi khu vực" bằng <code>prctl(PR_SET_CHILD_SUBREAPER, 1)</code>. Khi đó ' +
           'con mồ côi được giao cho <b>subreaper gần nhất phía trên</b>, và chỉ khi không có ' +
           'subreaper nào thì mới lên tới PID 1.',
      crit: [
        'Nói rõ con mồ côi được giao cho <b>subreaper gần nhất</b>, PID 1 chỉ là trường hợp mặc định khi không có subreaper nào',
        'Nhắc tới <code>prctl(PR_SET_CHILD_SUBREAPER, 1)</code> hoặc nêu ví dụ thực tế (<code>systemd --user</code>, một trình quản lý dịch vụ)',
        'Nêu được cách kiểm chứng: đọc dòng <code>PPid:</code> trong <code>/proc/&lt;pid&gt;/status</code>, hoặc <code>ps -o ppid= -p &lt;pid&gt;</code>',
        'Nói được vì sao chuyện này quan trọng: nếu bạn viết trình giám sát, con mồ côi có thể <b>không</b> rơi về PID 1 mà rơi về bạn'
      ],
      sol: '<p><b>Phát biểu đúng:</b> "Khi cha chết trước, con mồ côi được nhân giao cho ' +
           '<b>subreaper gần nhất</b> trong cây tổ tiên của nó. PID 1 chỉ nhận nuôi khi trên ' +
           'đường đi không có subreaper nào."</p>' +
           '<p><b>Cách kiểm chứng trên máy bạn.</b> Cho một tiến trình con sống lâu hơn cha, ' +
           'rồi đọc lại quan hệ cha con từ nguồn duy nhất đáng tin — bảng tiến trình của ' +
           'nhân:</p>' +
           '<ul>' +
           '<li><code>grep PPid /proc/&lt;pid&gt;/status</code> — số hiện ra là cha ' +
           '<i>hiện tại</i>, đã được cập nhật sau khi nhận nuôi.</li>' +
           '<li><code>ps -o pid,ppid,comm -p &lt;pid&gt;</code> — cùng một thông tin, ngắn hơn.</li>' +
           '</ul>' +
           '<p>Trên WSL2 hoặc trên một phiên đăng nhập có <code>systemd --user</code>, con số ' +
           'bạn thấy thường <b>không</b> phải 1: nó là PID của tiến trình quản lý phiên. Đó ' +
           'chính là subreaper.</p>' +
           '<p><b>Vì sao phải nhớ.</b> Nhiều tài liệu vẫn viết "PID 1 sẽ dọn hộ". Nếu bạn ' +
           'viết một trình giám sát và tin câu đó, bạn sẽ không cài <code>wait</code> — rồi ' +
           'zombie tích tụ dưới chính tiến trình của bạn, không phải dưới PID 1. Bài 21 sẽ ' +
           'cho bạn công cụ đúng để dọn chúng.</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Một tiến trình con đã kết thúc nhưng tiến trình cha <b>chưa</b> gọi ' +
         '<code>wait</code>. Nó không còn mã, không còn bộ nhớ, chỉ còn lại một dòng trong ' +
         'bảng tiến trình của nhân để giữ mã thoát. Trạng thái đó tên là ' +
         '<code>________</code> (một từ tiếng Anh).',
      ph: 'tên trạng thái',
      a: ['zombie', 'zombie (Z)', 'defunct', 'zombi'],
      why: '<b>Zombie</b> — trong cột <code>STAT</code> của <code>ps</code> nó hiện là ' +
           '<code>Z</code>, và trong cột lệnh thường kèm chữ <code>&lt;defunct&gt;</code>. ' +
           'Dòng đó tồn tại vì <b>một</b> lý do duy nhất: nhân phải giữ mã thoát lại cho tới ' +
           'khi có người hỏi. Nó không tốn RAM, nhưng nó tốn một <b>slot PID</b> — và số slot ' +
           'là hữu hạn. Trên một board nhúng chạy liên tục hàng tháng, một tiến trình cha ' +
           'quên <code>wait</code> sẽ làm cạn bảng PID và từ đó <b>không tiến trình nào</b> ' +
           'trên máy tạo được nữa. Bài E4 cho bạn nhìn tận mắt một zombie trong ' +
           '<code>/proc</code>; Bài 21 cho bạn cách dọn tự động.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi lời gọi với việc nó thực sự làm. Bốn trong sáu cái này thường bị nhầm với ' +
         'nhau — đó là lý do chúng được xếp cạnh nhau ở đây.',
      left: [
        '<code>fork()</code>',
        '<code>execvp()</code>',
        '<code>waitpid()</code>',
        '<code>_exit()</code>',
        '<code>setsid()</code>',
        '<code>dup2()</code>'
      ],
      right: [
        'Chép giá trị một ô trong bảng file descriptor sang một ô khác, đóng ô đích nếu đang mở',
        'Tạo một bản sao của tiến trình hiện tại; trả về hai lần',
        'Tách tiến trình khỏi terminal điều khiển và cho nó làm trưởng một phiên mới',
        'Chặn tiến trình gọi cho tới khi một tiến trình con xác định kết thúc, rồi lấy về từ trạng thái của nó',
        'Kết thúc tiến trình ngay lập tức, <b>không</b> xả vùng đệm của thư viện C',
        'Thay toàn bộ ảnh chương trình của tiến trình hiện tại, dò tên trong <code>PATH</code>'
      ],
      a: [1, 5, 3, 4, 2, 0],
      why: 'Hai cặp hay bị nhầm nhất: ' +
           '<b>(1) <code>fork</code> và <code>execvp</code></b> — một cái tạo tiến trình mà ' +
           '<i>không</i> đổi chương trình, cái kia đổi chương trình mà <i>không</i> tạo tiến ' +
           'trình. Muốn "chạy một chương trình khác rồi quay về" thì bắt buộc phải dùng cả ' +
           'hai, đúng theo thứ tự đó. ' +
           '<b>(2) <code>_exit</code> và <code>exit</code></b> — chỉ khác một dấu gạch dưới, ' +
           'nhưng <code>exit</code> xả vùng đệm của thư viện C còn <code>_exit</code> thì ' +
           'không. Trong tiến trình con sau <code>fork</code>, vùng đệm đó là <b>bản sao</b> ' +
           'của vùng đệm cha — gọi <code>exit</code> ở đó sẽ in lại những dòng mà cha đã in ' +
           'rồi. Đó là lý do nhánh con sau một <code>exec</code> thất bại phải kết thúc bằng ' +
           '<code>_exit(127)</code>, không phải <code>exit(127)</code>.' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 6,
      q: 'Chương trình <code>fork_tree.c</code> dưới đây gọi <code>fork()</code> ba lần trong ' +
         'một vòng lặp, rồi in PID của chính nó <b>một</b> lần. Output thật khi chạy trên máy ' +
         'cũng ở dưới. <b>Giải thích vì sao có tám dòng</b>, và vì sao tám PID đều khác nhau.',
      blocks: [
        { t: 'code', where: 'file', name: 'fork_tree.c', lang: 'c',
          code: '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    for (int i = 0; i < 3; i++)\n' +
                '        fork();\n' +
                '    printf("hello from pid %d\\n", getpid());\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./fork_tree\n' +
                'hello from pid 436\n' +
                'hello from pid 440\n' +
                'hello from pid 437\n' +
                'hello from pid 438\n' +
                'hello from pid 439\n' +
                'hello from pid 443\n' +
                'hello from pid 442\n' +
                'hello from pid 441\n' +
                '$ ./fork_tree | wc -l\n' +
                '8' }
      ],
      hint: 'Đừng đếm số lời gọi <code>fork</code>. Hãy đếm xem <b>sau mỗi vòng lặp</b> có bao ' +
            'nhiêu tiến trình đang đứng ở đầu vòng tiếp theo.',
      crit: [
        'Nói rõ <code>fork()</code> trả về <b>hai lần</b>, nên sau nó cả cha lẫn con đều chạy tiếp <b>cùng một dòng</b> — kể cả dòng <code>fork()</code> của vòng lặp sau',
        'Đếm đúng theo cấp số nhân: 1 → 2 → 4 → <b>8</b> (tức 2³), <b>không</b> phải 3 hay 4',
        'Nói rõ dòng <code>printf</code> chỉ có một bản trong mã nguồn, nhưng có <b>tám tiến trình</b> đi qua nó',
        'Giải thích PID khác nhau: mỗi <code>fork</code> tạo một tiến trình <b>mới</b>, và PID là định danh riêng của từng tiến trình trong bảng của nhân',
        'Nhận ra thứ tự các dòng <b>không</b> theo thứ tự PID (436, 440, 437, …) và nói được vì sao: tám tiến trình chạy độc lập, bộ lập lịch quyết định ai in trước'
      ],
      sol: '<p><b>Vì sao tám.</b> Sai lầm phổ biến là đếm số lời gọi <code>fork</code>: ba lời ' +
           'gọi thì phải ra bốn tiến trình chứ? Không — vì <b>tiến trình con cũng đang đứng ' +
           'trong vòng lặp</b>. Nó thừa hưởng cả biến <code>i</code>, cả con trỏ lệnh, nên nó ' +
           'cũng chạy nốt những vòng còn lại.</p>' +
           '<ul>' +
           '<li>Trước vòng lặp: <b>1</b> tiến trình.</li>' +
           '<li>Sau <code>i = 0</code>: mỗi tiến trình đang có tách làm hai → <b>2</b>.</li>' +
           '<li>Sau <code>i = 1</code>: cả hai đều tách → <b>4</b>.</li>' +
           '<li>Sau <code>i = 2</code>: cả bốn đều tách → <b>8</b> = 2³.</li>' +
           '</ul>' +
           '<p>Tám tiến trình đó cùng đi tới dòng <code>printf</code>, nên có tám dòng. ' +
           '<code>wc -l</code> xác nhận: <b>8</b>.</p>' +
           '<p><b>Vì sao PID khác nhau.</b> <code>fork</code> không nhân bản PID — PID là chỉ ' +
           'số vào bảng tiến trình của nhân, và mỗi tiến trình mới phải có một ô riêng. Đây ' +
           'chính là điểm mà <code>fork</code> khác <code>exec</code>: <code>fork</code> ' +
           'thêm một PID, <code>exec</code> giữ nguyên PID (câu B2).</p>' +
           '<p><b>Vì sao thứ tự lộn xộn.</b> 436, 440, 437, 438, 439, 443, 442, 441 — dãy này ' +
           'không tăng dần, và trên máy bạn nó sẽ lộn xộn theo kiểu khác. Tám tiến trình đó ' +
           'hoàn toàn độc lập; ai được bộ lập lịch cho chạy trước thì in trước. <b>Không có ' +
           'thứ tự nào được bảo đảm</b> giữa cha và con — và một chương trình nhúng nào tin ' +
           'vào thứ tự đó là một chương trình sẽ hỏng vào một ngày tải nặng.</p>' +
           '<p><b>Cảnh báo thực dụng.</b> Con số là 2ⁿ. Một vòng lặp <code>fork</code> viết ' +
           'sai — quên <code>_exit</code> trong nhánh con — không sinh ra "thêm vài tiến ' +
           'trình", nó sinh ra một cấp số nhân. Câu C1 hỏi đúng chuyện đó trên một board ' +
           '64 MB.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 6,
      q: 'Chương trình <code>pidcheck.c</code> cho tiến trình con in PID của nó ' +
         '<b>trước</b> khi gọi <code>exec</code>, rồi chương trình được nạp vào ' +
         '(<code>sh</code>) in PID của <i>nó</i> ra bằng <code>$$</code>. Ba lần chạy đều cho ' +
         'cùng một hình. <b>Ba con số trong mỗi lần chạy nói lên điều gì về <code>exec</code>?</b> ' +
         'Và vì sao dòng của tiến trình cha lại nằm cuối?',
      blocks: [
        { t: 'code', where: 'file', name: 'pidcheck.c', lang: 'c',
          code: 'pid_t pid = fork();\n' +
                'if (pid == 0) {\n' +
                '    printf("child: before exec, my pid = %d\\n", getpid());\n' +
                '    fflush(stdout);\n' +
                '    execlp("sh", "sh", "-c", "echo \\"child: after  exec, my pid = $$\\"", NULL);\n' +
                '    _exit(127);\n' +
                '}\n' +
                'printf("parent: fork() returned %d\\n", pid);\n' +
                'waitpid(pid, NULL, 0);' },
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./pidcheck | cat\n' +
                'child: before exec, my pid = 445\n' +
                'child: after  exec, my pid = 445\n' +
                'parent: fork() returned 445\n' +
                '\n' +
                '$ ./pidcheck | cat\n' +
                'child: before exec, my pid = 447\n' +
                'child: after  exec, my pid = 447\n' +
                'parent: fork() returned 447' }
      ],
      hint: 'Ba con số trong một lần chạy bằng nhau. Nếu <code>exec</code> tạo ra tiến trình ' +
            'mới thì con số thứ hai phải khác — nó có khác không?',
      crit: [
        'Nói rõ ba con số <b>bằng nhau</b>, nên <code>exec</code> <b>không</b> tạo ra tiến trình mới',
        'Nói được <code>exec</code> thay <b>toàn bộ ảnh chương trình</b> (mã, dữ liệu, ngăn xếp) của chính tiến trình đang gọi, còn cái vỏ thì giữ nguyên',
        'Kể được ít nhất hai thứ sống sót qua <code>exec</code> ngoài PID: file descriptor đang mở, biến môi trường, thư mục hiện hành, PPID',
        'Nói rõ <code>_exit(127)</code> chỉ chạy khi <code>execlp</code> <b>thất bại</b>',
        'Giải thích dòng của cha nằm cuối là do <b>đệm của stdio</b>: đầu ra đi qua ống nên bị đệm theo khối, dòng của cha chỉ được xả khi tiến trình kết thúc — <b>không</b> phải vì cha chạy sau'
      ],
      sol: '<p><b>Ba con số bằng nhau, và đó là toàn bộ câu trả lời.</b> 445 = 445 = 445. Tiến ' +
           'trình mà <code>fork</code> tạo ra, tiến trình in dòng "before exec", và tiến ' +
           'trình đang chạy <code>sh</code> — cả ba là <b>một</b>. <code>exec</code> không ' +
           'sinh ra gì cả: nó vứt bỏ mã và dữ liệu của <code>pidcheck</code>, nạp ' +
           '<code>/bin/sh</code> vào đúng chỗ đó, rồi nhảy tới điểm vào của <code>sh</code>.</p>' +
           '<p><b>Cái gì bị thay, cái gì ở lại.</b></p>' +
           '<ul>' +
           '<li><b>Bị thay sạch:</b> vùng mã, vùng dữ liệu, heap, ngăn xếp, mọi biến, mọi ' +
           'hàm — kể cả dòng <code>_exit(127)</code> nằm ngay bên dưới.</li>' +
           '<li><b>Ở lại nguyên:</b> PID, PPID, bảng file descriptor đang mở, thư mục hiện ' +
           'hành, mặt nạ <code>umask</code>, biến môi trường. Chính vì bảng fd ở lại mà ' +
           '<code>dup2</code> + <code>exec</code> chuyển hướng được đầu ra của một chương ' +
           'trình bạn không có mã nguồn — xem câu B6.</li>' +
           '</ul>' +
           '<p><b>Vì sao <code>_exit(127)</code> vẫn phải viết.</b> Nó là dòng chết — trừ khi ' +
           '<code>execlp</code> thất bại. Khi đó <code>execlp</code> trả về <code>-1</code> ' +
           'và tiến trình con <i>vẫn là</i> <code>pidcheck</code>, đang đứng giữa nhánh ' +
           '<code>if</code>. Không chặn lại thì nó rơi xuyên xuống và chạy tiếp mã của cha. ' +
           'Bài E5 cho bạn xem hậu quả.</p>' +
           '<p><b>Vì sao dòng của cha nằm cuối.</b> Không phải vì cha chạy sau — bẫy ở đây là ' +
           'đọc thứ tự dòng như thứ tự thời gian. Đầu ra được đưa qua <code>| cat</code>, tức ' +
           'là một <b>ống</b>, nên <code>stdout</code> của cha bị đệm <i>theo khối</i> chứ ' +
           'không theo dòng; nó chỉ xuống tới nhân khi tiến trình kết thúc. Tiến trình con thì ' +
           'gọi <code>fflush</code> tay trước khi <code>exec</code> (bắt buộc — ' +
           '<code>exec</code> xoá luôn vùng đệm chưa xả), còn <code>sh</code> thì tự xả. Đây ' +
           'đúng là chuyện bạn đã đo ở Bài 19, và nó quay lại ở D1 dưới dạng khó chịu hơn.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp gửi bạn <code>runner_broken.c</code> kèm lời nhắn: ' +
         '<i>"Tớ chạy <code>sh -c \'exit 3\'</code> nên con phải thoát với mã 3. Nhưng ' +
         '<code>wait</code> trả về 768. Chắc <code>wait</code> bị lỗi, hoặc ' +
         '<code>sh</code> trên WSL2 trả mã sai."</i> ' +
         '<b>Chỉ ra chỗ sai trong lập luận đó</b>, nói rõ 768 từ đâu ra, và viết lại đúng ' +
         'hai dòng cần sửa.',
      blocks: [
        { t: 'code', where: 'file', name: 'runner_broken.c', lang: 'c',
          code: 'pid_t pid = fork();\n' +
                'if (pid == 0)\n' +
                '    execlp("sh", "sh", "-c", "exit 3", NULL);\n' +
                '\n' +
                'int status;\n' +
                'wait(&status);\n' +
                'printf("child exit code = %d\\n", status);\n' +
                'if (status == 3)\n' +
                '    printf("child reported error 3\\n");\n' +
                'else\n' +
                '    printf("child reported something else\\n");' },
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./runner_broken\n' +
                'child exit code = 768\n' +
                'child reported something else' }
      ],
      hint: '768 = 3 × 256. Con số 256 nói cho bạn biết mã thoát 3 đang nằm ở đâu trong ' +
            'từ 32 bit đó.',
      crit: [
        'Bác bỏ đúng chỗ: <b>không</b> phải <code>wait</code> hay <code>sh</code> sai — cả hai đều đúng; sai là ở cách <b>đọc</b> <code>status</code>',
        'Nói rõ <code>status</code> là <b>từ đóng gói</b>, mã thoát nằm ở byte thứ hai',
        'Tính đúng: <code>3 &lt;&lt; 8 = 3 × 256 = 768</code>',
        'Viết ra hai dòng sửa: <code>if (WIFEXITED(status))</code> rồi <code>WEXITSTATUS(status)</code>',
        'Nêu được nhánh còn lại phải xử lý: <code>WIFSIGNALED</code> → <code>WTERMSIG</code>',
        'Chỉ ra thêm ít nhất một lỗi nữa trong đoạn mã (không kiểm tra <code>fork() &lt; 0</code>; không có <code>perror</code> + <code>_exit(127)</code> sau <code>execlp</code>)'
      ],
      sol: '<p><b>Chỗ sai trong lập luận.</b> Cả <code>wait</code> lẫn <code>sh</code> đều làm ' +
           'đúng việc của mình. Tiến trình con <i>thật sự</i> đã thoát với mã 3. Cái sai nằm ở ' +
           'giả định rằng biến tên <code>status</code> thì chứa mã thoát — nó không chứa.</p>' +
           '<p><b>768 từ đâu ra.</b> Nhân nhồi nhiều thứ vào một <code>int</code>. Với một ' +
           'tiến trình <i>tự thoát</i>, mã thoát được đặt ở <b>byte thứ hai</b>:</p>' +
           '<ul>' +
           '<li><code>status = 3 &lt;&lt; 8 = 3 × 256 = <b>768</b></code></li>' +
           '<li>Nếu con <code>exit(1)</code> thì <code>status = 256</code>.</li>' +
           '<li>Nếu con bị <code>SIGKILL</code> giết thì <code>status = 9</code> — số hiệu ' +
           'tín hiệu nằm ở byte <i>thấp</i>.</li>' +
           '</ul>' +
           '<p><b>Vì sao lỗi này sống lâu.</b> Với con thoát bình thường, ' +
           '<code>exit(0)</code> → <code>status = 0</code>. Nghĩa là ' +
           '<code>if (status == 0)</code> chạy <b>đúng</b> trong mọi trường hợp thành công, ' +
           'và chỉ sai khi có lỗi thật — tức là đúng lúc bạn cần nó nhất.</p>' +
           '<p><b>Hai dòng phải sửa:</b></p>' +
           '<pre><code>if (WIFEXITED(status))\n' +
           '    printf("child exit code = %d\\n", WEXITSTATUS(status));\n' +
           'else if (WIFSIGNALED(status))\n' +
           '    printf("child killed by signal %d\\n", WTERMSIG(status));</code></pre>' +
           '<p>Bản đã sửa in ra <code>child exit code = 3</code>, đúng như đồng nghiệp bạn ' +
           'mong đợi ngay từ đầu.</p>' +
           '<p><b>Hai lỗi nữa trong cùng đoạn mã đó</b> (đồng nghiệp bạn chưa thấy):</p>' +
           '<ol>' +
           '<li>Không kiểm tra <code>pid &lt; 0</code>. Khi <code>fork</code> thất bại nó trả ' +
           'về <code>-1</code>, mà <code>-1 != 0</code>, nên nhánh cha chạy và ' +
           '<code>wait</code> chờ một đứa con không tồn tại.</li>' +
           '<li>Sau <code>execlp</code> không có <code>perror</code> và ' +
           '<code>_exit(127)</code>. Nếu <code>sh</code> không có trên hệ thống — chuyện rất ' +
           'thật trên một rootfs nhúng tối giản — tiến trình con sẽ rơi xuống và chạy tiếp mã ' +
           'của cha (bài E5).</li>' +
           '</ol>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Đo thật trên máy: chạy <code>/bin/true</code> 500 lần mất khoảng <b>0,44 giây</b>, ' +
         'còn chạy builtin <code>:</code> của shell 500 lần mất <b>0,003 giây</b> — chênh nhau ' +
         'khoảng <b>145 lần</b>, dù cả hai đều "không làm gì cả". ' +
         '<b>Số thời gian kia bị tiêu vào đâu?</b> Hãy kể ra công việc mà nhân phải làm trong ' +
         'trường hợp thứ nhất mà trường hợp thứ hai không có.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '$ time ( for i in $(seq 500); do /bin/true; done )\n' +
                'real\t0m0.428s\n' +
                '\n' +
                '$ time ( for i in $(seq 500); do : ; done )\n' +
                'real\t0m0.003s' }
      ],
      hint: '<code>:</code> không rời khỏi tiến trình shell. <code>/bin/true</code> thì phải ' +
            'đi qua ba lời gọi hệ thống trước khi in được cái gì.',
      crit: [
        'Nêu đúng ba việc: <b>fork</b> (tạo tiến trình + bảng trang), <b>exec</b> (mở file, đọc ELF, ánh xạ, chạy trình nạp động), <b>wait</b> + dọn dẹp',
        'Nói rõ builtin <code>:</code> <b>không</b> tạo tiến trình nào — nó chỉ là một nhánh <code>if</code> bên trong shell',
        'Nhắc tới trình nạp động (<code>ld-linux</code>) phải nạp và định vị lại <code>libc</code> cho mỗi lần chạy',
        'Rút ra kết luận thực dụng: trong script, mỗi lần gọi một lệnh ngoài là gần <b>một mili giây</b>; một vòng lặp 100 000 lần thì đó là gần hai phút'
      ],
      sol: '<p><b>Cái giá không nằm ở "công việc" — cả hai đều không làm gì. Nó nằm ở việc ' +
           'dựng và phá một tiến trình.</b> Mỗi lần <code>/bin/true</code> chạy, nhân phải:</p>' +
           '<ol>' +
           '<li><b><code>fork</code></b> — cấp một <code>task_struct</code>, một PID, chép ' +
           'bảng trang, chép bảng file descriptor, đánh dấu mọi trang là copy-on-write.</li>' +
           '<li><b><code>execve</code></b> — mở file, đọc và kiểm tra tiêu đề ELF, tháo bỏ ' +
           'toàn bộ ánh xạ bộ nhớ vừa chép ở bước 1 (chép xong rồi vứt!), ánh xạ các đoạn ' +
           'mới, nạp trình nạp động, và để trình nạp động đó tìm rồi định vị lại ' +
           '<code>libc</code>.</li>' +
           '<li><b>Thoát và <code>wait</code></b> — thu hồi bộ nhớ, giữ lại mã thoát, đánh ' +
           'thức cha, xoá dòng khỏi bảng tiến trình.</li>' +
           '</ol>' +
           '<p>Builtin <code>:</code> không có bước nào trong ba bước đó. Shell nhận ra tên ' +
           'này nằm trong bảng builtin của chính nó và rẽ nhánh — chi phí ngang một lời gọi ' +
           'hàm.</p>' +
           '<p><b>Con số cần nhớ.</b> Cỡ <b>nửa mili giây đến một mili giây cho một ' +
           'fork + exec</b> trên máy này. Đo bằng C (<code>fork_cost.c</code> ở phần thực ' +
           'hành Bài 20) thì tách được thành hai phần — và đây là số đo thật của <b>hai ' +
           'phiên khác nhau</b>, để bạn thấy trước biên độ dao động:</p>' +
           '<table><thead><tr><th>Phép đo</th><th>Phiên A</th><th>Phiên B (6 lần liên tiếp)</th>' +
           '</tr></thead><tbody>' +
           '<tr><td><code>fork + exit</code></td><td>≈ 230 µs</td><td>120 – 165 µs</td></tr>' +
           '<tr><td><code>fork + exec + exit</code></td><td>≈ 830 µs</td><td>428 – 491 µs</td></tr>' +
           '<tr><td><b>tỉ lệ exec / fork</b></td><td><b>≈ 3,6×</b></td><td><b>≈ 3,3×</b></td></tr>' +
           '</tbody></table>' +
           '<p>Con số tuyệt đối lệch nhau gần <b>hai lần</b> giữa hai phiên, dù cùng một máy ' +
           'và cùng một binary. Nhưng <b>tỉ lệ thì đứng yên</b>: riêng <code>exec</code> ' +
           'đắt hơn <code>fork</code> khoảng <b>ba lần</b>. Đó mới là điều đáng nhớ. Điều đó ' +
           'ngược với trực giác: ai cũng tưởng "chép cả tiến trình" mới là phần đắt, nhưng ' +
           'copy-on-write làm <code>fork</code> rẻ đi rất nhiều, còn <code>exec</code> thì ' +
           'phải chạm đĩa và chạy trình nạp động thật.</p>' +
           '<p><b>Vì sao đáng quan tâm.</b> Một script sinh 100 000 tiến trình con — chuyện ' +
           'hoàn toàn bình thường với một vòng lặp gọi <code>grep</code> mỗi dòng — tiêu gần ' +
           '<b>hai phút</b> chỉ cho phần dựng/phá tiến trình. Đó là lý do <code>xargs</code>, ' +
           '<code>awk</code> và các builtin tồn tại.</p>' +
           '<p><b>Lưu ý khi bạn tự đo lại.</b> Lần chạy đầu tiên sau khi khởi động WSL2 cho ' +
           'khoảng <b>0,7–0,8 s</b>, vì <code>/bin/true</code> và <code>libc</code> chưa nằm ' +
           'trong bộ đệm trang. Ngay cả khi đã nóng, vòng 500 lần này đo được ' +
           '<b>0,26 s đến 0,43 s</b> tuỳ phiên làm việc — cùng một máy, cùng một binary. ' +
           'Con số tuyệt đối sẽ nhảy; <b>tỉ lệ</b> giữa hai cột thì ổn định quanh 130–150 ' +
           'lần, và tỉ lệ exec/fork ổn định quanh 3 lần. Khi báo cáo một phép đo hiệu năng, ' +
           'luôn nói rõ đó là lần chạy nóng hay nguội — và <b>đừng bao giờ trích một con số ' +
           'tuyệt đối mà không kèm điều kiện đo</b>.</p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Một tiến trình đang giữ <b>1 GiB</b> dữ liệu trong heap gọi <code>fork()</code>. ' +
         'Lời gọi trả về sau khoảng <b>vài trăm micro giây</b>, và ' +
         '<code>free -m</code> hầu như không nhúc nhích. ' +
         '<b>Vì sao không có 1 GiB nào bị chép?</b> Và trong tình huống nào thì máy ' +
         '<i>thật sự</i> phải bỏ ra 1 GiB đó?',
      hint: 'Nhân không chép dữ liệu — nó chép <b>bảng ánh xạ</b>, rồi đánh dấu một cờ.',
      crit: [
        'Gọi đúng tên cơ chế: <b>copy-on-write</b> (COW)',
        'Nói rõ cái được chép là <b>bảng trang</b>, không phải nội dung; hai tiến trình tạm trỏ vào <b>cùng</b> khung vật lý',
        'Nói rõ các trang được đánh dấu <b>chỉ đọc</b> ở cả hai bên, kể cả bên cha',
        'Mô tả đúng thời điểm chép thật: lần <b>ghi</b> đầu tiên sinh lỗi trang, nhân chép <b>một trang</b> (4 KiB) rồi cho ghi tiếp',
        'Trả lời được vế hai: chỉ khi cha hoặc con lần lượt <b>ghi vào toàn bộ</b> 1 GiB thì mới tốn thật 1 GiB'
      ],
      sol: '<p><b>Copy-on-write.</b> <code>fork</code> không chép dữ liệu, nó chép <i>bản đồ</i>. ' +
           'Nhân dựng cho tiến trình con một bộ bảng trang mới, nhưng mọi mục trong đó trỏ ' +
           'vào đúng những khung vật lý mà cha đang dùng. Sau đó nhân bỏ quyền ghi ở ' +
           '<b>cả hai bên</b> — kể cả bên cha, và đây là chi tiết hay bị bỏ sót.</p>' +
           '<p><b>Chuyện gì xảy ra khi có người ghi.</b> Bên nào ghi trước cũng vậy: CPU sinh ' +
           'một lỗi trang vì trang đang chỉ-đọc. Nhân bắt được, nhận ra đây là trang COW, cấp ' +
           'một khung mới, chép <b>đúng một trang 4 KiB</b>, sửa bảng trang của kẻ ghi, trả ' +
           'lại quyền ghi, rồi cho lệnh đó chạy lại. Chương trình không biết gì đã xảy ra.</p>' +
           '<p><b>Khi nào tốn thật 1 GiB.</b> Chỉ khi một bên lần lượt ghi vào <i>tất cả</i> ' +
           'các trang của vùng 1 GiB đó — ví dụ chạy một vòng lặp quét qua toàn bộ mảng và ' +
           'sửa từng phần tử. Lúc đó 262 144 trang lần lượt bị tách, và bộ nhớ thật sự nhân ' +
           'đôi. Nếu con chỉ <b>đọc</b>, hoặc con gọi <code>exec</code> ngay (trường hợp phổ ' +
           'biến nhất), thì không byte nào bị chép.</p>' +
           '<p><b>Hệ quả bạn phải nhớ khi lập trình.</b> Vì mỗi bên có bảng ánh xạ riêng, ' +
           '<b>không có biến nào dùng chung</b> — dù <code>printf("%p")</code> ở hai bên in ' +
           'ra cùng một địa chỉ (câu A3). Muốn cha con trao đổi dữ liệu thì phải dùng ống, ' +
           'file, bộ nhớ chia sẻ, hoặc tín hiệu — và tín hiệu là Bài 21.</p>' +
           '<p><b>Hệ quả trên board nhúng.</b> Nhiều hệ thống nhúng bật ' +
           '<code>overcommit_memory=0</code> hoặc chạy không có swap. Một tiến trình 200 MB ' +
           'gọi <code>fork</code> để chạy một lệnh nhỏ vẫn có thể bị từ chối nếu nhân tính ' +
           'theo trường hợp xấu nhất. Đó là lý do <code>posix_spawn</code> và ' +
           '<code>vfork</code> tồn tại.</p>' },

    { id: 'b6', k: 'free', tag: 'So sánh cặp', rows: 5,
      q: 'Hai cách cùng đưa đầu ra của một chương trình vào file <code>log.txt</code>:<br>' +
         '<b>(1)</b> trong shell: <code>./tool &gt; log.txt</code><br>' +
         '<b>(2)</b> trong C: <code>fork()</code>, rồi trong con mở file, gọi ' +
         '<code>dup2(fd, 1)</code>, rồi <code>execlp("./tool", "tool", NULL)</code>.<br>' +
         '<b>Khác biệt nào giữa hai cách là khác biệt <i>đáng kể</i>?</b> Nói rõ ai làm việc ' +
         'gì, và vì sao <code>tool</code> — vốn không có dòng mã nào biết tới ' +
         '<code>log.txt</code> — vẫn ghi đúng chỗ.',
      hint: 'Cách (1) không phải là một cơ chế khác. Hãy hỏi: shell làm gì <i>giữa</i> ' +
            '<code>fork</code> và <code>exec</code>?',
      crit: [
        'Nhận ra khác biệt đáng kể <b>không</b> phải là cơ chế: cách (1) chính là cách (2), do shell làm hộ',
        'Mô tả đúng trình tự của shell: <code>fork</code> → (trong con) <code>open</code> + <code>dup2</code> → <code>exec</code>',
        'Nói rõ <code>dup2(fd, 1)</code> làm gì với bảng fd: đóng ô 1 nếu đang mở, rồi cho ô 1 trỏ tới cùng chỗ với ô <code>fd</code>',
        'Trả lời được vì sao <code>tool</code> không cần biết gì: nó chỉ ghi vào <b>fd số 1</b>, và ô số 1 đã bị đổi hướng <b>trước khi</b> <code>exec</code> chạy — bảng fd sống sót qua <code>exec</code>',
        'Nêu được khác biệt thật sự đáng kể: cách (2) cho bạn kiểm soát mà shell không có (chọn cờ khi <code>open</code>, chuyển hướng có điều kiện, dựng nhiều fd, giữ lại fd khác để giao tiếp)'
      ],
      sol: '<p><b>Câu trả lời gây bất ngờ: hai cách <i>là một</i>.</b> Dấu <code>&gt;</code> ' +
           'không phải một tính năng của hệ điều hành — nó là cú pháp của shell, và thứ shell ' +
           'làm bên dưới đúng là cách (2), từng bước một.</p>' +
           '<p><b>Trình tự của shell khi bạn gõ <code>./tool &gt; log.txt</code>:</b></p>' +
           '<ol>' +
           '<li><code>fork()</code> — giờ có một tiến trình con, vẫn đang là shell.</li>' +
           '<li><b>Trong tiến trình con</b>, <i>trước</i> khi exec: ' +
           '<code>open("log.txt", O_WRONLY|O_CREAT|O_TRUNC, 0644)</code> → được, ví dụ, ' +
           'fd 3.</li>' +
           '<li><code>dup2(3, 1)</code> — đóng ô 1 (đang trỏ tới terminal), rồi cho ô 1 trỏ ' +
           'tới đúng chỗ ô 3 đang trỏ. Từ giờ "ghi vào fd 1" nghĩa là ghi vào ' +
           '<code>log.txt</code>.</li>' +
           '<li><code>close(3)</code> — ô 3 không cần nữa, ô 1 đã giữ tham chiếu.</li>' +
           '<li><code>execlp("./tool", …)</code>.</li>' +
           '</ol>' +
           '<p><b>Vì sao <code>tool</code> không cần biết gì.</b> Vì <code>exec</code> ' +
           '<b>không</b> đụng tới bảng file descriptor. Mã, dữ liệu, ngăn xếp bị xoá sạch; ' +
           'bảng fd ở nguyên. <code>tool</code> khởi động, gọi <code>printf</code>, dữ liệu ' +
           'đi xuống <code>write(1, …)</code> — và ô số 1 đã được đổi hướng từ bước 3, trước ' +
           'khi dòng mã đầu tiên của <code>tool</code> chạy. Đây là chỗ trục "exec giữ ' +
           'nguyên cái vỏ" trả cổ tức: nó là <b>lý do</b> chuyển hướng hoạt động được với ' +
           'mọi chương trình, kể cả chương trình bạn không có mã nguồn.</p>' +
           '<p><b>Vậy khác biệt đáng kể là gì?</b> Không phải cơ chế — mà là <b>mức độ kiểm ' +
           'soát</b>. Viết tay cho bạn những thứ cú pháp shell không có:</p>' +
           '<ul>' +
           '<li>Chọn cờ khi <code>open</code>: <code>O_APPEND</code> thay vì ' +
           '<code>O_TRUNC</code>, quyền khác 0644, <code>O_CLOEXEC</code> cho các fd khác.</li>' +
           '<li>Chuyển hướng <b>có điều kiện</b>, quyết định lúc chạy.</li>' +
           '<li>Dựng nhiều fd cùng lúc, hoặc giữ lại một fd riêng để nói chuyện với con.</li>' +
           '<li>Không cần có shell trên hệ thống — đáng kể trên rootfs nhúng tối giản.</li>' +
           '</ul>' +
           '<p>Đổi lại, bạn phải tự làm mọi thứ shell vẫn làm hộ, kể cả những thứ dễ quên: ' +
           'kiểm tra <code>open</code> thất bại, đóng fd thừa, và <code>_exit(127)</code> ' +
           'sau <code>exec</code>.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán/biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Tình huống mới', rows: 6,
      q: 'Bạn nhận bàn giao firmware của một gateway chạy Linux, RAM <b>64 MB</b>, không có ' +
         'swap. Trong trình quản lý cổng có đoạn dưới đây, nhiệm vụ là mở bốn tiến trình con, ' +
         'mỗi con phục vụ một cổng. Trên bàn làm việc nó "chạy được"; ngoài hiện trường, sau ' +
         'khoảng một phút thiết bị treo cứng và <code>dmesg</code> đầy dòng ' +
         '<code>Out of memory: Killed process</code>.<br>' +
         '<b>(a)</b> Đoạn mã tạo ra bao nhiêu tiến trình, không phải bốn? ' +
         '<b>(b)</b> Vì sao trên bàn làm việc nó có vẻ chạy được? ' +
         '<b>(c)</b> Sửa lại cho đúng, bằng một dòng.',
      blocks: [
        { t: 'code', where: 'file', name: 'portmgr.c (trích)', lang: 'c',
          code: 'for (int port = 0; port < 4; port++) {\n' +
                '    pid_t p = fork();\n' +
                '    if (p == 0)\n' +
                '        serve_port(port);      /* ham nay chay mai, khong bao gio tra ve */\n' +
                '}\n' +
                '\n' +
                'for (int i = 0; i < 4; i++)\n' +
                '    wait(NULL);',
          notes: [
            ['Đừng chạy', 'Đây là bài đọc trên giấy. Đoạn này là một quả bom fork — ' +
             'biên dịch và chạy để "xem thử" sẽ làm treo cả phiên WSL của bạn.'],
            ['serve_port', 'Được thiết kế để chạy mãi. Câu hỏi là: nếu cổng lỗi và nó ' +
             '<i>trả về</i> thì sao?']
          ] }
      ],
      hint: '<code>serve_port</code> không bao giờ trả về. Nhưng nó chỉ được gọi trong nhánh ' +
            '<code>p == 0</code>. Vậy tiến trình nào <i>quay lại</i> đầu vòng lặp?',
      crit: [
        '(a) Trả lời <b>16</b> tiến trình (2⁴), không phải 5, và giải thích được bằng cấp số nhân 1 → 2 → 4 → 8 → 16',
        '(a) Chỉ đúng nguyên nhân: tiến trình <b>con</b> cũng chạy tiếp vòng lặp, vì <code>fork</code> trả về hai lần và không có gì chặn nhánh con lại',
        '(b) Giải thích được vì sao trên bàn làm việc không lộ: máy để bàn có hàng GiB RAM nên 16 tiến trình vẫn sống; 64 MB thì không',
        '(c) Nêu đúng một dòng sửa: cho nhánh con <b>thoát khỏi vòng lặp</b> — thêm <code>_exit()</code> sau <code>serve_port(port)</code>, hoặc chuyển thành <code>if (p == 0) { serve_port(port); _exit(0); }</code>',
        'Nói rõ vì sao <code>break</code> trong nhánh con cũng đúng về logic nhưng <code>_exit</code> an toàn hơn (con không được rơi vào mã dọn dẹp của cha)'
      ],
      sol: '<p><b>(a) Mười sáu, không phải năm.</b> Cái bẫy nằm ở chỗ ' +
           '<code>serve_port(port)</code> <i>không bao giờ trả về</i> — nghe thì có vẻ đủ để ' +
           'chặn con lại. Nhưng hãy đọc kỹ: nếu <code>serve_port</code> thật sự chạy mãi, ' +
           'thì đúng, mỗi con dừng ở đó. Vấn đề là câu "chạy mãi" chỉ đúng khi cổng mở được. ' +
           'Khi cổng lỗi và <code>serve_port</code> trả về — điều mà tác giả không tính tới — ' +
           'tiến trình con rơi xuống, quay lại đầu vòng lặp, và bắt đầu <code>fork</code> ' +
           'tiếp.</p>' +
           '<p>Từ đó nó là cấp số nhân, giống hệt <code>fork_tree</code> ở câu B1:</p>' +
           '<ul>' +
           '<li><code>port = 0</code>: 1 → 2</li>' +
           '<li><code>port = 1</code>: 2 → 4</li>' +
           '<li><code>port = 2</code>: 4 → 8</li>' +
           '<li><code>port = 3</code>: 8 → <b>16</b></li>' +
           '</ul>' +
           '<p>Và <code>wait(NULL)</code> gọi bốn lần thì chỉ dọn được bốn — mười một đứa còn ' +
           'lại thành zombie hoặc mồ côi.</p>' +
           '<p><b>(b) Vì sao bàn làm việc không lộ ra.</b> Hai lý do cộng lại. Thứ nhất, trên ' +
           'máy để bàn cổng thường mở được, nên <code>serve_port</code> không trả về và ' +
           'không ai thấy gì. Thứ hai, ngay cả khi nó nhân ra 16 bản, một máy 16 GiB nuốt ' +
           'trôi — mỗi bản chỉ tốn vài trăm KiB nhờ copy-on-write. Trên 64 MB không swap, ' +
           '16 tiến trình lần lượt ghi vào bộ nhớ của mình, COW tách trang thật, và OOM ' +
           'killer vào cuộc. <b>Đây là dạng lỗi chỉ xuất hiện ở nơi khó gỡ nhất.</b></p>' +
           '<p><b>(c) Một dòng sửa.</b> Nhánh con <b>phải</b> có lối ra riêng:</p>' +
           '<pre><code>for (int port = 0; port &lt; 4; port++) {\n' +
           '    pid_t p = fork();\n' +
           '    if (p &lt; 0) { perror("fork"); break; }\n' +
           '    if (p == 0) {\n' +
           '        serve_port(port);\n' +
           '        _exit(0);          /* &lt;-- dong bat buoc */\n' +
           '    }\n' +
           '}</code></pre>' +
           '<p><b>Vì sao <code>_exit</code> chứ không phải <code>break</code>.</b> ' +
           '<code>break</code> đưa con ra khỏi vòng lặp, nhưng nó vẫn rơi vào bốn ' +
           '<code>wait(NULL)</code> phía dưới — mã dọn dẹp của <b>cha</b>, mà con không có ' +
           'quyền chạy. <code>_exit</code> kết thúc dứt điểm, và không xả vùng đệm stdio đã ' +
           'thừa hưởng từ cha (nếu không, những dòng cha in trước <code>fork</code> sẽ được ' +
           'in lại lần nữa — chuyện bạn nhìn thấy ở D1).</p>' +
           '<p><b>Quy tắc mang theo.</b> Mọi nhánh <code>if (pid == 0)</code> phải kết thúc ' +
           'bằng một trong hai thứ: <code>exec…</code> hoặc <code>_exit…</code>. Không có ' +
           'trường hợp thứ ba đúng.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Tình huống mới', rows: 6,
      q: 'Trên một board công nghiệp, bạn viết <code>supervisor</code>: nó khởi động ' +
         '<code>modbusd</code>, và nếu <code>modbusd</code> chết thì phải khởi động lại. ' +
         'Board có <b>watchdog phần cứng</b>: nếu tiến trình mang PID đã đăng ký không vỗ ' +
         'watchdog trong 30 giây, board tự reset. Bạn đã đăng ký PID của ' +
         '<code>supervisor</code> với watchdog lúc khởi động.<br>' +
         'Một đồng nghiệp đề nghị: <i>"Cho gọn thì trong <code>supervisor</code> cứ gọi thẳng ' +
         '<code>execlp(\\"modbusd\\", …)</code> là xong, khỏi <code>fork</code>."</i><br>' +
         '<b>Điều gì sẽ xảy ra?</b> Trả lời cụ thể về PID, về watchdog, và về khả năng khởi ' +
         'động lại. Rồi nói đúng phải làm thế nào.',
      hint: 'PID nào chạy <code>modbusd</code> sau lời gọi đó? Và ai còn lại để phát hiện ' +
            '<code>modbusd</code> chết?',
      crit: [
        'Nói rõ <code>exec</code> <b>giữ nguyên PID</b>: <code>modbusd</code> sẽ chạy dưới đúng PID mà watchdog đã đăng ký',
        'Nói rõ <code>supervisor</code> <b>không còn tồn tại</b> — mã của nó đã bị xoá khỏi bộ nhớ, nên không còn ai giám sát và không còn ai khởi động lại',
        'Suy ra hậu quả của watchdog: <code>modbusd</code> không biết phải vỗ watchdog, nên sau 30 giây <b>board tự reset</b> — và lặp lại vô hạn',
        'Nêu đúng cách làm: <code>fork()</code> trước, <b>con</b> gọi <code>exec</code>, <b>cha</b> ở lại vỗ watchdog và <code>waitpid</code> trong vòng lặp',
        'Nói được vì sao PID của <code>supervisor</code> phải là PID đăng ký với watchdog, không phải PID của <code>modbusd</code>'
      ],
      sol: '<p><b>Chuyện gì xảy ra.</b> <code>execlp</code> thành công, và ba việc xảy ra cùng ' +
           'lúc:</p>' +
           '<ol>' +
           '<li><b>PID không đổi.</b> <code>modbusd</code> chạy dưới đúng con số mà bạn đã ' +
           'đăng ký với watchdog. Không có tiến trình mới nào được tạo ra.</li>' +
           '<li><b><code>supervisor</code> biến mất.</b> Toàn bộ mã của nó — vòng lặp giám ' +
           'sát, hàm vỗ watchdog, mã khởi động lại — đã bị <code>exec</code> vứt khỏi bộ ' +
           'nhớ. Không còn ai để "khởi động lại khi <code>modbusd</code> chết".</li>' +
           '<li><b>Watchdog không được vỗ.</b> <code>modbusd</code> không có dòng mã nào biết ' +
           'tới watchdog. Sau 30 giây, board reset.</li>' +
           '</ol>' +
           '<p>Kết quả ngoài hiện trường: board khởi động, chạy được 30 giây, reset; lặp lại ' +
           'mãi mãi. Và triệu chứng này <b>trông giống hệt một lỗi phần cứng</b> — đây là ' +
           'kiểu lỗi ngốn nhiều ngày công nhất.</p>' +
           '<p><b>Vì sao đề nghị kia nghe có lý.</b> Vì trong shell, gõ ' +
           '<code>modbusd</code> rồi quay lại dấu nhắc là chuyện bình thường. Trực giác đó ' +
           'đến từ shell, mà shell thì <b>fork trước</b>. <code>exec</code> trần không phải ' +
           '"chạy một chương trình", nó là "trở thành một chương trình khác".</p>' +
           '<p><b>Cách đúng:</b></p>' +
           '<pre><code>for (;;) {\n' +
           '    pid_t p = fork();\n' +
           '    if (p &lt; 0) { perror("fork"); sleep(1); continue; }\n' +
           '    if (p == 0) {\n' +
           '        execlp("modbusd", "modbusd", NULL);\n' +
           '        perror("execlp");\n' +
           '        _exit(127);\n' +
           '    }\n' +
           '    /* cha: van la supervisor, van giu PID da dang ky */\n' +
           '    int status;\n' +
           '    while (waitpid(p, &amp;status, WNOHANG) == 0) {\n' +
           '        pet_watchdog();\n' +
           '        sleep(5);\n' +
           '    }\n' +
           '    log_exit(status);      /* WIFEXITED / WIFSIGNALED — xem cau c3 */\n' +
           '}</code></pre>' +
           '<p><b>Điểm mấu chốt.</b> Watchdog phải theo dõi <b>tiến trình biết vỗ nó</b>, và ' +
           'đó là <code>supervisor</code>. Nhờ <code>fork</code>, PID của ' +
           '<code>supervisor</code> đứng yên qua bao nhiêu lần <code>modbusd</code> chết và ' +
           'sống lại cũng được — trong khi <code>modbusd</code> nhận một PID mới mỗi lần. Sự ' +
           'phân vai đó chính là lý do <code>fork</code> và <code>exec</code> là hai hàm ' +
           'riêng.</p>' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Chẩn đoán', rows: 6,
      q: 'Đường ống CI của nhóm bạn báo <b>PASS</b> suốt ba tuần, rồi khách hàng phát hiện ' +
         'một lỗi mà bộ test <i>có</i> bắt được. Chạy tay bộ test thì nó thật sự thất bại. ' +
         'Trình chạy test là một chương trình C nhỏ, phần cốt lõi ở dưới.<br>' +
         '<b>Chỉ ra lỗi</b>, giải thích vì sao ba tuần qua nó vẫn báo PASS được, và nói rõ ' +
         'vì sao lỗi này <i>không thể</i> bị bắt bởi một bài test "trường hợp thành công".',
      blocks: [
        { t: 'code', where: 'file', name: 'ci_runner.c (trích)', lang: 'c',
          code: 'pid_t p = fork();\n' +
                'if (p == 0) {\n' +
                '    execlp("./run_tests.sh", "run_tests.sh", NULL);\n' +
                '    perror("execlp");\n' +
                '    _exit(127);\n' +
                '}\n' +
                '\n' +
                'int status;\n' +
                'waitpid(p, &status, 0);\n' +
                '\n' +
                'if (status == 0)\n' +
                '    puts("PASS");\n' +
                'else\n' +
                '    puts("FAIL");\n' +
                '\n' +
                'return status;' }
      ],
      hint: 'Thử điền vào bảng: <code>run_tests.sh</code> thoát với 0 thì <code>status</code> ' +
            'bằng mấy? Thoát với 1 thì bằng mấy? Bị <code>SIGKILL</code> giết thì bằng mấy?',
      crit: [
        'Chỉ đúng lỗi: <code>status</code> là <b>từ đóng gói</b>, không được so sánh trực tiếp; phải dùng <code>WIFEXITED</code> + <code>WEXITSTATUS</code>',
        'Giải thích được vì sao vẫn PASS đúng: khi test thành công, mã thoát 0 cho <code>status = 0</code> — <b>trùng khớp ngẫu nhiên</b>',
        'Chỉ ra hậu quả cụ thể: test thất bại với mã 1 cho <code>status = 256</code>, nên nhánh <code>else</code> chạy… ',
        'Nhận ra lỗi thứ hai, nặng hơn: <code>return status;</code> trả về <code>256</code>, mà mã thoát chỉ giữ <b>8 bit thấp</b> — 256 &amp; 0xFF = <b>0</b>, nên CI nhìn thấy "thành công" dù dòng chữ in ra là FAIL',
        'Nói rõ vì sao test "trường hợp thành công" không bắt được: đường thành công là đường <b>duy nhất</b> mà lỗi này cho kết quả đúng'
      ],
      sol: '<p><b>Lỗi.</b> <code>status</code> không phải mã thoát. Với ' +
           '<code>run_tests.sh</code>:</p>' +
           '<table><thead><tr><th>Test</th><th>Mã thoát của script</th>' +
           '<th><code>status</code></th><th>Nhánh chạy</th></tr></thead><tbody>' +
           '<tr><td>Thành công</td><td>0</td><td><b>0</b></td><td>PASS ✓ đúng</td></tr>' +
           '<tr><td>Thất bại</td><td>1</td><td><b>256</b></td><td>FAIL ✓ đúng chữ</td></tr>' +
           '<tr><td>Bị OOM giết</td><td>—</td><td><b>9</b></td><td>FAIL ✓ đúng chữ</td></tr>' +
           '</tbody></table>' +
           '<p><b>Vì sao ba tuần vẫn "đúng".</b> Mã thoát 0 cho <code>status = 0</code>. Đó ' +
           'là một <b>trùng khớp ngẫu nhiên</b>, không phải mã đúng — nhưng nó khiến mọi lần ' +
           'chạy thành công cho kết quả đúng, và ai cũng tin đường ống lành lặn.</p>' +
           '<p><b>Lỗi thứ hai, và nó mới là lỗi giết người.</b> Dòng chữ in ra thật sự có đổi ' +
           'thành FAIL — nhưng CI không đọc chữ, nó đọc <b>mã thoát</b> của ' +
           '<code>ci_runner</code>. Và <code>return status;</code> trả về ' +
           '<code>256</code>. Mã thoát của một tiến trình chỉ giữ <b>8 bit thấp</b>: ' +
           '<code>256 &amp; 0xFF = 0</code>. CI nhận về <b>0</b> và ghi PASS.</p>' +
           '<p>Nghĩa là log có chữ FAIL, mà bảng điều khiển màu xanh. Nếu chưa từng gặp, đây ' +
           'là kiểu lỗi bạn có thể nhìn thẳng vào mà không thấy.</p>' +
           '<p><b>Bản sửa:</b></p>' +
           '<pre><code>int code;\n' +
           'if (WIFEXITED(status))        code = WEXITSTATUS(status);\n' +
           'else if (WIFSIGNALED(status)) code = 128 + WTERMSIG(status);\n' +
           'else                          code = 1;\n' +
           '\n' +
           'puts(code == 0 ? "PASS" : "FAIL");\n' +
           'return code;</code></pre>' +
           '<p><b>Vì sao test "trường hợp thành công" bất lực.</b> Một bài test như vậy chạy ' +
           'đúng con đường duy nhất mà lỗi này <i>không</i> lộ ra. Muốn bắt được, bài test ' +
           'phải cố tình cho <code>run_tests.sh</code> thoát với mã khác 0 rồi kiểm tra ' +
           '<code>$?</code> của <code>ci_runner</code>. Quy tắc rút ra: ' +
           '<b>mọi đường xử lý lỗi đều phải có bài test riêng của nó</b> — vì đó chính là ' +
           'đoạn mã chưa bao giờ chạy.</p>' },

    { id: 'c4', k: 'free', tag: 'Chẩn đoán', rows: 5,
      q: 'Trình khởi chạy của bạn dùng <code>execvp</code> để chạy một công cụ tên ' +
         '<code>mytool</code>, cài trong <code>/opt/app/bin</code>. Gõ tay trong shell thì ' +
         'chạy tốt. Cũng đúng binary đó, cũng đúng trình khởi chạy đó, khi được ' +
         '<code>init</code> gọi lúc boot thì thất bại. Transcript thật ở dưới ' +
         '(<code>env -i</code> mô phỏng môi trường trống mà <code>init</code> cấp).<br>' +
         '<b>Nguyên nhân là gì?</b> Nêu <b>hai</b> cách sửa và nói rõ cách nào bền hơn, vì sao.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '$ PATH="$HOME/bt20/opt-bin:$PATH" ./myexec mytool\n' +
                'tool v1 running\n' +
                '[myexec] mytool exited with code 0\n' +
                '\n' +
                '$ env -i ./myexec mytool\n' +
                'execvp: No such file or directory\n' +
                '[myexec] mytool exited with code 127\n' +
                '\n' +
                '$ getconf PATH\n' +
                '/bin:/usr/bin' }
      ],
      hint: 'Chữ <b>p</b> trong <code>execvp</code> là <code>PATH</code>. Câu hỏi thật sự ' +
            'là: <i>PATH nào?</i>',
      crit: [
        'Chỉ đúng nguyên nhân: <code>execvp</code> dò tên trong biến môi trường <code>PATH</code>, mà biến môi trường <b>đi theo tiến trình</b> — <code>init</code> cấp một môi trường gần như trống',
        'Đọc đúng dòng <code>getconf PATH</code>: khi không có <code>PATH</code>, <code>execvp</code> lùi về mặc định <code>/bin:/usr/bin</code>, và <code>/opt/app/bin</code> không nằm trong đó',
        'Nói đúng ý nghĩa của <b>127</b>: không tìm thấy lệnh (do <code>_exit(127)</code> sau <code>perror</code>)',
        'Cách sửa 1: dùng đường dẫn tuyệt đối với <code>execv</code>/<code>execl</code> — không dò <code>PATH</code> nữa',
        'Cách sửa 2: tự đặt <code>PATH</code> trước khi exec (<code>setenv</code>, <code>execvpe</code>, hoặc <code>Environment=</code> trong unit systemd)',
        'Chọn được cách bền hơn — đường dẫn tuyệt đối — và biện minh: kết quả không phụ thuộc vào thứ mà người gọi kiểm soát'
      ],
      sol: '<p><b>Nguyên nhân.</b> Chữ <code>p</code> trong <code>execvp</code> nghĩa là "dò ' +
           'trong <code>PATH</code>". <code>PATH</code> là một <b>biến môi trường</b>, mà môi ' +
           'trường thì đi theo tiến trình: mỗi tiến trình con nhận một bản sao từ cha. Shell ' +
           'đăng nhập của bạn có một <code>PATH</code> dài và đã được cấu hình; ' +
           '<code>init</code> thì cấp cho dịch vụ một môi trường gần như trống.</p>' +
           '<p>Transcript cho thấy đúng ranh giới đó. Cùng một binary, cùng một trình khởi ' +
           'chạy: có <code>PATH</code> thì <code>tool v1 running</code>; ' +
           '<code>env -i</code> thì <code>execvp: No such file or directory</code> và mã ' +
           'thoát <b>127</b>.</p>' +
           '<p><b>Chi tiết dễ bỏ sót.</b> Khi hoàn toàn không có biến <code>PATH</code>, ' +
           '<code>execvp</code> không bỏ cuộc — nó lùi về một danh sách mặc định do hệ thống ' +
           'quy định. <code>getconf PATH</code> cho biết danh sách đó là ' +
           '<code>/bin:/usr/bin</code>. Vì thế công cụ nằm trong <code>/bin</code> vẫn chạy ' +
           'được, còn công cụ trong <code>/opt/app/bin</code> thì không — và bạn nhận được ' +
           'một lỗi <i>chọn lọc</i>, chỉ vài lệnh hỏng. Kiểu lỗi này đặc biệt khó nghi ngờ ' +
           'đúng chỗ.</p>' +
           '<p><b>Hai cách sửa.</b></p>' +
           '<ol>' +
           '<li><b>Đường dẫn tuyệt đối:</b> ' +
           '<code>execl("/opt/app/bin/mytool", "mytool", NULL)</code> — bỏ hẳn việc dò tìm.</li>' +
           '<li><b>Tự dựng môi trường:</b> <code>setenv("PATH", "/opt/app/bin:/usr/bin", 1)</code> ' +
           'trước khi exec; hoặc dùng <code>execvpe</code>/<code>execle</code> để truyền ' +
           'thẳng mảng môi trường; hoặc khai báo ' +
           '<code>Environment=PATH=…</code> trong unit systemd.</li>' +
           '</ol>' +
           '<p><b>Cách nào bền hơn.</b> <b>Đường dẫn tuyệt đối.</b> Lý do không phải là nó ' +
           'ngắn hơn, mà là nó <b>xoá bỏ một phụ thuộc vào thứ do người gọi kiểm soát</b>. ' +
           'Với cách 2, dịch vụ vẫn chạy đúng — cho tới ngày ai đó sửa unit file, đổi ' +
           'shell đăng nhập, hay chạy nó từ <code>cron</code>. Với cách 1, không có gì để ' +
           'sửa sai. Trên hệ thống nhúng nguyên tắc này còn mạnh hơn: script khởi động ' +
           'thường chạy dưới BusyBox <code>ash</code> với môi trường tối thiểu, và ' +
           '"chạy được trên bàn làm việc" chẳng chứng minh được gì.</p>' +
           '<p>Trong thực tế người ta làm cả hai: đường dẫn tuyệt đối để chạy, ' +
           '<code>Environment=</code> để những gì <i>bên trong</i> công cụ cần (ngôn ngữ, ' +
           'thư mục cấu hình, <code>LD_LIBRARY_PATH</code>) cũng có mặt.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán và biện minh', rows: 5,
      q: 'Một board điều khiển chạy liên tục, không bao giờ khởi động lại theo lịch. ' +
         '<code>cat /proc/sys/kernel/pid_max</code> trên board cho <b>32768</b>. ' +
         'Trình giám sát của bạn sinh một tiến trình con mỗi <b>5 giây</b> để đọc cảm biến, ' +
         'nhưng <b>quên gọi <code>wait</code></b>.<br>' +
         '<b>(a)</b> Sau bao lâu board không tạo được tiến trình nào nữa? Đưa ra con số bằng ' +
         'giờ hoặc ngày. ' +
         '<b>(b)</b> Triệu chứng người vận hành nhìn thấy là gì? ' +
         '<b>(c)</b> Chọn giữa "gọi <code>waitpid</code> trong vòng lặp chính" và "đặt lịch ' +
         'khởi động lại board mỗi đêm", rồi biện minh.',
      hint: 'Mỗi zombie giữ một slot PID cho tới khi có người gọi <code>wait</code>. Không ai ' +
            'gọi thì không slot nào được trả lại.',
      crit: [
        '(a) Tính đúng: 32768 slot ÷ 1 slot mỗi 5 s = 163 840 s ≈ <b>45,5 giờ</b> ≈ <b>1,9 ngày</b>',
        '(a) Nói rõ zombie <b>không</b> tốn RAM đáng kể — thứ cạn kiệt là <b>slot PID</b>, không phải bộ nhớ',
        '(b) Mô tả triệu chứng đúng: mọi <code>fork</code> trả về <code>-1</code> với <code>errno = EAGAIN</code>; không đăng nhập được, không chạy được lệnh nào, kể cả <code>ps</code> hay <code>reboot</code>',
        '(c) Chọn <code>waitpid</code> và nêu lý do bản chất: khởi động lại hằng đêm chỉ <b>đặt lại đồng hồ</b>, lỗi vẫn còn và sẽ nổ khi chu kỳ đọc cảm biến nhanh lên hoặc khi lịch reboot bị bỏ',
        'Nói được rằng khởi động lại còn tự tạo ra rủi ro mới (mất dữ liệu chưa ghi, thời gian chết định kỳ) — chữa triệu chứng đắt hơn chữa nguyên nhân'
      ],
      sol: '<p><b>(a) Phép tính.</b></p>' +
           '<ul>' +
           '<li>Một slot PID bị giữ mỗi 5 giây.</li>' +
           '<li>32 768 slot × 5 s = <b>163 840 giây</b>.</li>' +
           '<li>163 840 ÷ 3 600 ≈ <b>45,5 giờ</b> ≈ <b>1,9 ngày</b>.</li>' +
           '</ul>' +
           '<p>Con số này giải thích một triệu chứng rất đặc trưng: <b>thiết bị chết sau gần ' +
           'hai ngày</b>. Đủ lâu để qua hết mọi bài test trên bàn, đủ ngắn để khách hàng gặp ' +
           'trong tuần đầu.</p>' +
           '<p><b>Đối chiếu với máy bạn:</b> <code>cat /proc/sys/kernel/pid_max</code> trên ' +
           'WSL2 cho <code>4194304</code> — gấp 128 lần. Cùng một lỗi ở đó cần khoảng ' +
           '<b>243 ngày</b> mới lộ ra. Đó là lý do bạn <b>không thể</b> tìm ra lỗi kiểu này ' +
           'bằng cách chạy thử trên máy phát triển.</p>' +
           '<p><b>(b) Triệu chứng.</b> Khi bảng PID cạn, <code>fork()</code> trả về ' +
           '<code>-1</code> với <code>errno = EAGAIN</code>. Hậu quả không phải "chương trình ' +
           'chậm" mà là <b>toàn hệ thống đứng</b>: shell không chạy được lệnh nào (mỗi lệnh ' +
           'ngoài đều cần một <code>fork</code>), SSH không nhận phiên mới, ' +
           'ngay cả <code>ps</code> và <code>reboot</code> cũng không chạy. Người vận hành ' +
           'mô tả là "treo", dù nhân vẫn hoàn toàn khoẻ. Cách vào duy nhất còn lại thường là ' +
           'cổng serial với một shell đang mở sẵn và các builtin của nó.</p>' +
           '<p><b>(c) Chọn <code>waitpid</code>.</b> Lý do không phải "sạch hơn" mà là: khởi ' +
           'động lại hằng đêm <b>không sửa gì cả</b>, nó chỉ đặt lại đồng hồ đếm ngược. Ba ' +
           'điều sẽ xảy ra:</p>' +
           '<ul>' +
           '<li>Ngày nào đó chu kỳ đọc cảm biến đổi từ 5 s xuống 1 s. Thời gian sống tụt còn ' +
           '<b>9 giờ</b> — ngắn hơn một đêm, và lịch reboot không cứu nổi nữa.</li>' +
           '<li>Một lần lịch reboot bị bỏ (bảo trì, mất điện lệch giờ, ai đó tắt cron job) là ' +
           'thiết bị chết.</li>' +
           '<li>Bản thân việc reboot định kỳ tạo rủi ro mới: mất dữ liệu chưa ghi xuống flash, ' +
           'thời gian chết định kỳ, và ẩn đi mọi lỗi rò rỉ khác cùng loại.</li>' +
           '</ul>' +
           '<p><b>Cách sửa gọn nhất</b> nằm ngay trong vòng lặp chính:</p>' +
           '<pre><code>while (waitpid(-1, NULL, WNOHANG) &gt; 0)\n' +
           '    ;   /* thu hoi moi zombie dang cho, khong chan */</code></pre>' +
           '<p>Một dòng, không chặn, gọi mỗi vòng. Bài 21 cho bạn cách tốt hơn nữa — để nhân ' +
           'báo cho bạn bằng <code>SIGCHLD</code> thay vì phải tự hỏi.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về các bài TRƯỚC mà bài 20 đứng lên trên ═══ */
  D: [
    { id: 'd1', k: 'free', tag: 'Nhắc lại bài cũ', rows: 5,
      q: '<b>Nhắc lại bài 19 — vùng đệm của stdio.</b> Chương trình dưới đây in hai dòng và ' +
         'gọi <code>fork()</code> ở giữa. Cả hai lần chạy đều đi qua một <code>pipe</code> ' +
         '(<code>| cat</code>), nên khác biệt duy nhất giữa chúng là <b>chế độ đệm</b>: ' +
         '<code>stdbuf -oL</code> ép <code>stdout</code> về đệm theo dòng.<br>' +
         'Vì sao lần chạy thứ nhất in <b>bốn</b> dòng còn lần thứ hai chỉ in <b>ba</b>? ' +
         'Chương trình chỉ có hai lệnh <code>printf</code>.',
      blocks: [
        { t: 'code', where: 'file', name: 'buffer_fork.c', lang: 'c',
          code: '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    printf("line A\\n");\n' +
                '    fork();\n' +
                '    printf("line B\\n");\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'out', nocopy: true, name: 'Kết quả thật, mỗi lệnh chạy 6 lần đều ra đúng như vậy',
          code: '$ ./buffer_fork | cat\n' +
                'line A\n' +
                'line B\n' +
                'line A\n' +
                'line B\n' +
                '\n' +
                '$ stdbuf -oL ./buffer_fork | cat\n' +
                'line A\n' +
                'line B\n' +
                'line B' }
      ],
      hint: '<code>fork()</code> sao chép <i>toàn bộ</i> không gian địa chỉ của tiến trình. ' +
            'Vùng đệm của <code>stdout</code> nằm ở đâu — trong nhân, hay trong không gian ' +
            'địa chỉ đó?',
      crit: [
        'Nói rõ vùng đệm stdio nằm <b>trong tiến trình</b> (thư viện C), không nằm trong nhân — nên <code>fork</code> <b>sao chép cả nó</b>',
        'Lần 1: đường ra là pipe ⇒ đệm <b>đầy khối</b> ⇒ lúc <code>fork</code>, <code>"line A\\n"</code> <b>vẫn còn trong đệm</b>, và cả hai tiến trình cùng thừa hưởng một bản',
        'Lần 1: mỗi tiến trình xả đệm của mình khi thoát ⇒ <code>line A</code> ra <b>hai lần</b> ⇒ 4 dòng',
        'Lần 2: <code>stdbuf -oL</code> ⇒ đệm theo dòng ⇒ <code>"line A\\n"</code> đã ra khỏi tiến trình <b>trước</b> <code>fork</code>, đệm rỗng khi nhân bản ⇒ chỉ <code>line B</code> nhân đôi ⇒ 3 dòng',
        'Nêu được cách phòng: <code>fflush(NULL)</code> ngay trước <code>fork</code>, và dùng <code>_exit()</code> chứ không <code>exit()</code> trong tiến trình con'
      ],
      sol: '<p>Bài 19 đã dạy rằng <code>printf</code> không ghi thẳng ra đâu cả — nó ghi vào ' +
           'một <b>vùng đệm nằm trong chính tiến trình</b>, do thư viện C quản lý, và chỉ ' +
           'gọi <code>write()</code> khi đệm đầy hoặc đến lúc xả. Bài 20 thêm một mảnh nữa: ' +
           '<code>fork()</code> sao chép <b>toàn bộ</b> không gian địa chỉ. Ghép hai điều đó ' +
           'lại thì <b>vùng đệm cũng bị nhân đôi</b>.</p>' +
           '<p><b>Lần 1 — đệm đầy khối (mặc định khi ra pipe).</b></p>' +
           '<ol>' +
           '<li><code>printf("line A\\n")</code> chép 7 byte vào đệm. Đệm còn cả 4 KiB trống, ' +
           'chưa xả. <b>Chưa có gì rời khỏi tiến trình.</b></li>' +
           '<li><code>fork()</code> — bây giờ có <b>hai</b> tiến trình, mỗi tiến trình mang ' +
           'một đệm chứa <code>"line A\\n"</code>.</li>' +
           '<li>Mỗi tiến trình thêm <code>"line B\\n"</code>, rồi <code>return 0</code> khiến ' +
           'thư viện C xả đệm.</li>' +
           '<li>Hai lần xả × 2 dòng = <b>4 dòng</b>, và <code>line A</code> — dòng được ' +
           '<code>printf</code> <i>một lần duy nhất</i> — hiện ra hai lần.</li>' +
           '</ol>' +
           '<p><b>Lần 2 — đệm theo dòng.</b> <code>stdbuf -oL</code> bảo thư viện C xả mỗi ' +
           'khi gặp <code>\\n</code>. Vậy <code>"line A\\n"</code> đã đi qua ' +
           '<code>write()</code> ra khỏi tiến trình <b>trước</b> lúc <code>fork</code>. Đệm ' +
           'rỗng khi bị nhân bản, nên chỉ <code>line B</code> xuất hiện hai lần: ' +
           '<b>3 dòng</b>.</p>' +
           '<p><b>Vì sao đây là bẫy thật, không phải câu đố.</b> Chạy trong terminal, ' +
           '<code>stdout</code> mặc định là đệm theo dòng — bạn thấy 3 dòng và tưởng chương ' +
           'trình đúng. Chuyển hướng vào file hoặc pipe (nghĩa là: mọi log của mọi dịch vụ ' +
           'trên board) thì thành đệm đầy khối, và log bắt đầu có <b>dòng lặp</b> mà không ' +
           'ai giải thích được. Cùng một binary, hai hành vi, và chỉ khác nhau ở nơi bạn ' +
           'đổ đầu ra.</p>' +
           '<p><b>Hai quy tắc mang theo.</b> <code>fflush(NULL)</code> ngay trước ' +
           '<code>fork()</code> khi đầu ra có thể bị chuyển hướng; và trong nhánh con, dùng ' +
           '<code>_exit()</code> chứ không <code>exit()</code> — <code>_exit</code> ' +
           '<b>không</b> xả các đệm stdio thừa hưởng từ cha.</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Nhắc lại bài 5 — <code>/proc</code>.</b> Tiến trình 417 đang là zombie. Đọc hai ' +
         'file trong thư mục của nó cho kết quả dưới đây: <code>status</code> vẫn còn tên và ' +
         'trạng thái, còn <code>cmdline</code> thì <b>0 byte</b>.<br>' +
         'Kết luận nào dưới đây <b>đúng</b>?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '$ head -4 /proc/417/status\n' +
                'Name:\tleaky\n' +
                'State:\tZ (zombie)\n' +
                'Tgid:\t417\n' +
                'Ngid:\t0\n' +
                '\n' +
                '$ wc -c < /proc/417/cmdline\n' +
                '0' },
      ],
      opts: [
        'File <code>cmdline</code> đã bị nhân xoá khỏi đĩa khi tiến trình chết, còn ' +
          '<code>status</code> thì chưa bị xoá',
        'Cả hai file đều được nhân <b>sinh ra lúc bạn đọc</b>; <code>cmdline</code> rỗng vì ' +
          'nó phải lấy dữ liệu từ <b>bộ nhớ của tiến trình</b>, mà zombie đã trả lại toàn bộ ' +
          'bộ nhớ — trong khi <code>status</code> lấy từ bảng tiến trình vẫn còn trong nhân',
        '<code>cmdline</code> rỗng vì tiến trình được gọi không kèm tham số nào',
        'Đây là lỗi của <code>wc</code>: nó không đọc được file có kích thước báo là 0'
      ],
      a: 1,
      why: '<p><b>Bài 5:</b> <code>/proc</code> không nằm trên đĩa. Không có byte nào được ' +
           'lưu sẵn; mỗi lần bạn <code>open</code> + <code>read</code>, nhân <b>sinh nội ' +
           'dung ngay lúc đó</b> từ cấu trúc dữ liệu sống của nó. Vì thế ' +
           '<code>ls -l /proc/417/status</code> luôn báo kích thước 0 dù đọc ra hàng chục ' +
           'dòng.</p>' +
           '<p><b>Bài 20 bổ sung nửa còn lại.</b> Zombie đã trả lại <i>gần như mọi thứ</i>: ' +
           'bộ nhớ, file đang mở, mã chương trình. Cái duy nhất còn giữ là <b>một mục trong ' +
           'bảng tiến trình</b>, đủ để lưu PID, tên, và mã thoát cho tới khi cha gọi ' +
           '<code>wait</code>.</p>' +
           '<p>Hai file rơi đúng hai bên của ranh giới đó:</p>' +
           '<ul>' +
           '<li><code>status</code> — sinh từ mục bảng tiến trình. <b>Còn.</b></li>' +
           '<li><code>cmdline</code> — sinh bằng cách đọc vùng stack ban đầu của tiến trình, ' +
           'nơi cất chuỗi <code>argv</code>. Vùng nhớ đó đã bị thu hồi. <b>0 byte.</b></li>' +
           '</ul>' +
           '<p>Đây cũng là mẹo nhận zombie nhanh nhất khi không có <code>ps</code>: thư mục ' +
           '<code>/proc/PID</code> tồn tại, nhưng <code>cmdline</code> rỗng.</p>' +
           '<p><i>Phương án A</i> giả định <code>/proc</code> là file thật trên đĩa — sai từ ' +
           'gốc. <i>Phương án C</i> sai vì <code>leaky</code> chạy không tham số thì ' +
           '<code>cmdline</code> vẫn phải chứa <code>"leaky\\0"</code>, tức 6 byte, không ' +
           'phải 0. <i>Phương án D</i> sai vì <code>wc -c</code> đếm byte <b>đọc được</b>, ' +
           'không tin vào kích thước báo trước — chính vì thế nó là công cụ đúng để hỏi ' +
           '<code>/proc</code>.</p>' },

    { id: 'd3', k: 'num', tag: 'Nhắc lại bài cũ', tol: 0,
      q: '<b>Nhắc lại bài 4 — <code>$?</code>.</b> <code>myexec</code> là chương trình bạn ' +
         'gặp suốt bộ bài tập này: nó <code>fork</code>, <code>exec</code> lệnh bạn đưa, ' +
         '<code>waitpid</code>, in kết quả rồi <code>return 0;</code> ở cuối ' +
         '<code>main</code>.<br>' +
         'Chạy hai lệnh dưới đây. <b><code>echo $?</code> in ra số mấy?</b> (Cả hai lần đều ' +
         'ra cùng một số — điền số đó.)',
      blocks: [
        { t: 'code', where: 'wsl', nocopy: true,
          code: './myexec nosuchprog        # in: [myexec] nosuchprog exited with code 127\n' +
                'echo $?\n' +
                '\n' +
                './myexec sh -c \'exit 7\'    # in: [myexec] sh exited with code 7\n' +
                'echo $?' }
      ],
      a: 0,
      unit: '',
      why: '<p><b>Đáp án: 0 — cả hai lần.</b></p>' +
           '<p>Bài 4 nói rằng <code>$?</code> là câu trả lời duy nhất của máy cho câu hỏi ' +
           '"lệnh vừa rồi có chạy được không". Nhưng <code>$?</code> chứa mã thoát của ' +
           '<b><code>myexec</code></b>, không phải của chương trình mà <code>myexec</code> ' +
           'chạy hộ. Và <code>myexec</code> kết thúc bằng <code>return 0;</code> — vô điều ' +
           'kiện.</p>' +
           '<p>Nói cách khác: <code>myexec</code> <b>biết</b> con thoát với 127 (nó vừa in ra ' +
           'con số đó), rồi <b>vứt đi</b> và tự báo cáo thành công. Dòng chữ và mã thoát nói ' +
           'hai điều trái ngược nhau.</p>' +
           '<p><b>Vì sao điều này quan trọng.</b> Con người đọc dòng chữ; script đọc ' +
           '<code>$?</code>. Cắm <code>myexec</code> vào một <code>Makefile</code>, một job ' +
           'CI, hay một script khởi động với <code>set -e</code>, và mọi thất bại đều đi qua ' +
           'êm ru. Đây <b>chính xác</b> là lỗi bạn vừa mổ xẻ ở câu C3, lần này nằm trong ' +
           'chương trình mà bạn tưởng là đúng.</p>' +
           '<p><b>Bản sửa</b> cho một chương trình bao bọc (wrapper) đúng chuẩn:</p>' +
           '<pre><code>if (WIFEXITED(status))   return WEXITSTATUS(status);\n' +
           'if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);\n' +
           'return 1;</code></pre>' +
           '<p>Đó chính là quy ước mà shell dùng, và là lý do <code>sh -c \'kill -TERM $$\'</code> ' +
           'cho <code>$?</code> bằng <b>143</b> = 128 + 15.</p>' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══
     Mọi transcript dưới đây là output THẬT, chạy trên máy người học
     (WSL2 · Ubuntu 26.04 · gcc 15.2.0 · 6 core) ngày 26/08/2026 — xem
     khối XUẤT XỨ SỐ LIỆU ở đầu file.                                        */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Tạo <code>~/bt20/myexec.c</code> với nội dung dưới đây rồi dịch:<br>' +
         '<code>mkdir -p ~/bt20 &amp;&amp; cd ~/bt20</code> · ' +
         '<code>gcc -Wall -Wextra -o myexec myexec.c</code><br><br>' +
         '<b>Trước khi chạy</b>, viết ra <b>từng dòng</b> bạn nghĩ bốn lệnh sau sẽ in ra — ' +
         'kể cả dòng nào đi ra <code>stderr</code>, và <b>theo đúng thứ tự</b>. Rồi mới chạy.',
      blocks: [
        { t: 'code', where: 'file', name: 'myexec.c', lang: 'c',
          code: '#include <stdio.h>\n' +
                '#include <stdlib.h>\n' +
                '#include <unistd.h>\n' +
                '#include <sys/wait.h>\n' +
                '\n' +
                'int main(int argc, char *argv[])\n' +
                '{\n' +
                '    if (argc < 2) { fprintf(stderr, "usage: myexec CMD [ARG...]\\n"); return 2; }\n' +
                '\n' +
                '    pid_t pid = fork();\n' +
                '    if (pid < 0) { perror("fork"); return 1; }\n' +
                '    if (pid == 0) {\n' +
                '        execvp(argv[1], &argv[1]);\n' +
                '        perror("execvp");\n' +
                '        _exit(127);\n' +
                '    }\n' +
                '\n' +
                '    int status;\n' +
                '    waitpid(pid, &status, 0);\n' +
                '    if (WIFEXITED(status))\n' +
                '        printf("[myexec] %s exited with code %d\\n", argv[1], WEXITSTATUS(status));\n' +
                '    else if (WIFSIGNALED(status))\n' +
                '        printf("[myexec] %s killed by signal %d\\n", argv[1], WTERMSIG(status));\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: './myexec true\n' +
                './myexec sh -c \'exit 7\'\n' +
                './myexec nosuchprog\n' +
                './myexec sh -c \'kill -9 $$\'' }
      ],
      hint: 'Với lệnh thứ ba: <code>execvp</code> thất bại thì dòng ngay <i>sau</i> nó có ' +
            'chạy không? Với lệnh thứ tư: nhánh <code>WIFEXITED</code> hay nhánh ' +
            '<code>WIFSIGNALED</code> sẽ đúng?',
      crit: [
        'Lệnh 1 → <code>[myexec] true exited with code 0</code>',
        'Lệnh 2 → <code>[myexec] sh exited with code 7</code> (mã thoát của <code>sh</code>, không phải của <code>myexec</code>)',
        'Lệnh 3 → <b>hai</b> dòng, đúng thứ tự: <code>execvp: No such file or directory</code> (từ <code>perror</code>, ra stderr) rồi <code>[myexec] nosuchprog exited with code 127</code>',
        'Lệnh 4 → <code>[myexec] sh killed by signal 9</code> — nhánh <code>WIFSIGNALED</code>, <b>không</b> có chữ "exited with code"',
        'Dự đoán được rằng lệnh 3 in dòng <code>perror</code> <b>trước</b>, vì đó là tiến trình con nói, và cha còn đang chờ trong <code>waitpid</code>',
        'Nhận ra: khi bị giết bởi tín hiệu thì <b>không có mã thoát nào cả</b> — 137 là con số shell <i>bịa ra</i> theo quy ước 128+9, chứ tiến trình không hề trả về nó'
      ],
      sol: '<p><b>Kết quả thật:</b></p>' +
           '<pre><code>$ ./myexec true\n' +
           '[myexec] true exited with code 0\n' +
           '\n' +
           '$ ./myexec sh -c \'exit 7\'\n' +
           '[myexec] sh exited with code 7\n' +
           '\n' +
           '$ ./myexec nosuchprog\n' +
           'execvp: No such file or directory\n' +
           '[myexec] nosuchprog exited with code 127\n' +
           '\n' +
           '$ ./myexec sh -c \'kill -9 $$\'\n' +
           '[myexec] sh killed by signal 9</code></pre>' +
           '<p><b>Lệnh 3 — hai dòng, và thứ tự không phải ngẫu nhiên.</b> ' +
           '<code>execvp</code> thất bại nên <b>không</b> thay ruột; tiến trình con vẫn là ' +
           '<code>myexec</code> và chạy tiếp dòng <code>perror</code>. Cha lúc đó còn nằm ' +
           'trong <code>waitpid</code>, chưa in gì. Vì thế dòng của con luôn ra trước. Đây ' +
           'là bằng chứng trực tiếp cho một câu bạn đã gặp ở A2: <b>dòng sau ' +
           '<code>exec</code> chỉ chạy khi <code>exec</code> hỏng</b>.</p>' +
           '<p><b>Lệnh 4 — không có mã thoát.</b> <code>sh</code> tự giết mình bằng ' +
           '<code>SIGKILL</code>. Nó không bao giờ chạy tới <code>exit()</code>, nên ' +
           '<i>không có</i> mã thoát nào để trả. <code>WIFEXITED(status)</code> sai, ' +
           '<code>WIFSIGNALED(status)</code> đúng, và <code>WTERMSIG</code> cho 9.</p>' +
           '<p>Nếu bạn dự đoán <code>exited with code 137</code> thì bạn vừa gặp đúng ngộ ' +
           'nhận mà trục 3 của bộ này nhắm tới. 137 = 128 + 9 là con số <b>shell tự tổng ' +
           'hợp</b> để nhồi cả hai loại kết cục vào một byte <code>$?</code>. Ở tầng C bạn ' +
           'thấy sự thật: hai loại kết cục là hai thứ khác nhau, và từ đóng gói ' +
           '<code>status</code> phân biệt được chúng.</p>' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Tạo và dịch <code>leaky.c</code> dưới đây. Nó sinh ba con, mỗi con thoát ngay, rồi ' +
         'cha ngủ 3 giây — và <b>không hề gọi <code>wait</code></b>.<br>' +
         '<b>Trước khi chạy</b>, dự đoán: <b>(a)</b> cột <code>STAT</code> của ba con sẽ là ' +
         'gì; <b>(b)</b> <code>grep -c Z</code> ra số mấy trong lúc cha còn sống; ' +
         '<b>(c)</b> ra số mấy <i>sau khi</i> cha thoát; <b>(d)</b> ' +
         '<code>wc -c &lt; /proc/&lt;pid con&gt;/cmdline</code> ra bao nhiêu byte.',
      blocks: [
        { t: 'code', where: 'file', name: 'leaky.c', lang: 'c',
          code: '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    for (int i = 0; i < 3; i++)\n' +
                '        if (fork() == 0) _exit(i);\n' +
                '    printf("parent pid=%d\\n", getpid());\n' +
                '    fflush(stdout);\n' +
                '    sleep(3);\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: 'gcc -Wall -Wextra -o leaky leaky.c\n' +
                './leaky &\n' +
                'LP=$!\n' +
                'sleep 1\n' +
                'ps -o pid,ppid,stat,comm --ppid $LP\n' +
                'ps --ppid $LP -o stat= | grep -c Z\n' +
                'wait $LP\n' +
                'ps --ppid $LP -o stat= | grep -c Z' }
      ],
      hint: 'Ai là người phải gọi <code>wait</code> để zombie biến mất? Và khi <i>người đó</i> ' +
            'chết trước thì ai nhận nhiệm vụ ấy?',
      crit: [
        '(a) <code>STAT</code> = <b><code>Z+</code></b> — <code>Z</code> là zombie, <code>+</code> nghĩa là nằm trong nhóm tiến trình foreground',
        '(b) Trong lúc cha còn sống: <b>3</b> zombie',
        '(c) Sau khi cha thoát: <b>0</b> — và giải thích đúng lý do: ba đứa trở thành <b>mồ côi</b>, được nhận nuôi bởi <code>init</code>/subreaper, và <i>người đó</i> gọi <code>wait</code> ngay lập tức',
        '(d) <code>/proc/&lt;pid&gt;/cmdline</code> ra <b>0 byte</b> vì zombie đã trả lại toàn bộ bộ nhớ (đã gặp ở D2)',
        'Nhận ra ý chính: cái chết của tiến trình cha <b>chữa</b> rò rỉ zombie — nên một chương trình chạy-rồi-thoát <b>không bao giờ</b> lộ ra lỗi này; chỉ dịch vụ chạy suốt đời mới lộ (đã tính ở C5)'
      ],
      sol: '<p><b>Kết quả thật:</b></p>' +
           '<pre><code>parent pid=415\n' +
           '$ ps -o pid,ppid,stat,comm --ppid $LP\n' +
           '    PID    PPID STAT COMMAND\n' +
           '    417     415 Z+   leaky\n' +
           '    418     415 Z+   leaky\n' +
           '    419     415 Z+   leaky\n' +
           '\n' +
           '$ ps --ppid $LP -o stat= | grep -c Z\n' +
           '3\n' +
           '\n' +
           '$ head -2 /proc/417/status\n' +
           'Name:\tleaky\n' +
           'State:\tZ (zombie)\n' +
           '\n' +
           '$ wc -c &lt; /proc/417/cmdline\n' +
           '0\n' +
           '\n' +
           '$ wait $LP\n' +
           '$ ps --ppid $LP -o stat= | grep -c Z\n' +
           '0</code></pre>' +
           '<p><b>Vì sao có zombie.</b> Ba con gọi <code>_exit(i)</code> và chết ngay. Nhưng ' +
           'nhân <b>không</b> được phép xoá sạch chúng: mã thoát <code>i</code> là một thông ' +
           'tin thuộc về tiến trình cha, và cha có quyền hỏi bất cứ lúc nào. Nên nhân giữ ' +
           'lại một mục trong bảng tiến trình — <b>chỉ mục đó thôi</b> — và đánh dấu ' +
           '<code>Z</code>. Bằng chứng là <code>cmdline</code> đã 0 byte: bộ nhớ đi rồi, ' +
           'chỉ còn cái biên lai.</p>' +
           '<p><b>Vì sao chúng biến mất khi cha chết — và đây mới là phần nguy hiểm.</b> Cha ' +
           'thoát, ba zombie thành mồ côi. Nhân lập tức gán chúng cho subreaper gần nhất ' +
           '(trên WSL2 thường là <code>init</code> của phiên), mà một <code>init</code> ' +
           'đúng nghĩa thì <code>wait</code> trong vòng lặp vô hạn. Ba biên lai được thu ' +
           'ngay, đếm về <b>0</b>.</p>' +
           '<p>Kết luận cay đắng: <b>cái chết của cha chữa lành mọi rò rỉ zombie</b>. Vì thế ' +
           'không một lần chạy thử nào của một chương trình ngắn có thể phát hiện lỗi này. ' +
           'Nó chỉ tích tụ ở nơi cha <i>không bao giờ</i> chết — tức là ở đúng cái dịch vụ ' +
           'bạn viết cho board, và bạn đã tính ở C5 rằng nó cần <b>45 giờ</b> để giết ' +
           'thiết bị.</p>' +
           '<p><b>Ghi chú về <code>Z+</code>:</b> chữ <code>Z</code> là trạng thái, dấu ' +
           '<code>+</code> chỉ nói tiến trình thuộc nhóm foreground của terminal. Đừng nhầm ' +
           '<code>+</code> thành một loại zombie khác.</p>' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 4,
      q: 'Trên board đang chạy, bạn nghi có rò rỉ zombie nhưng <b>không biết tiến trình cha ' +
         'là ai</b>. Hãy viết <b>một</b> dòng lệnh dùng <code>ps</code> để liệt kê ' +
         '<b>mọi</b> zombie trên toàn hệ thống, in ra <code>PID</code>, <code>PPID</code>, ' +
         '<code>STAT</code> và tên — vì <code>PPID</code> mới là thứ chỉ đích danh thủ ' +
         'phạm.<br>Viết thêm một dòng nữa chỉ <b>đếm</b> số zombie (dùng được trong script ' +
         'giám sát).',
      hint: 'Cột <code>STAT</code> của zombie <b>bắt đầu</b> bằng <code>Z</code> nhưng có thể ' +
            'có hậu tố (<code>Z+</code>). Lọc theo "bắt đầu bằng Z", đừng lọc theo bằng đúng ' +
            '<code>Z</code>.',
      crit: [
        'Dùng <code>ps -e</code> (hoặc <code>ps ax</code>) để quét <b>toàn hệ thống</b>, không giới hạn theo <code>--ppid</code>',
        'Chọn đúng các cột: <code>-o pid,ppid,stat,comm</code>',
        'Lọc đúng "bắt đầu bằng Z", ví dụ <code>awk \'$3 ~ /^Z/\'</code> hoặc <code>grep -E \'^ *[0-9]+ +[0-9]+ +Z\'</code> — <b>không</b> dùng <code>grep Z</code> trần (sẽ dính mọi tên lệnh có chữ Z)',
        'Dòng đếm dùng <code>-o stat=</code> (có dấu <code>=</code> để bỏ tiêu đề) rồi <code>grep -c \'^Z\'</code>',
        'Giải thích được vì sao cần <code>PPID</code>: zombie tự nó vô hại, thứ phải sửa là <b>tiến trình cha</b> quên <code>wait</code>'
      ],
      sol: '<p><b>Liệt kê:</b></p>' +
           '<pre><code>ps -eo pid,ppid,stat,comm | awk \'$3 ~ /^Z/\'</code></pre>' +
           '<p><b>Đếm:</b></p>' +
           '<pre><code>ps -eo stat= | grep -c \'^Z\'</code></pre>' +
           '<p><b>Kết quả thật</b> trong lúc <code>leaky</code> đang chạy:</p>' +
           '<pre><code>$ ps -eo stat= | grep -c \'^Z\'\n' +
           '3\n' +
           '\n' +
           '$ ps -eo pid,ppid,stat,comm | awk \'$3 ~ /^Z/\'\n' +
           '    415     413 Z+   leaky\n' +
           '    416     413 Z+   leaky\n' +
           '    417     413 Z+   leaky\n' +
           '\n' +
           '$ ps -eo stat= | grep -c \'^Z\'      # sau khi cha thoat\n' +
           '0</code></pre>' +
           '<p><b>Ba chi tiết đáng giá.</b></p>' +
           '<ul>' +
           '<li><b>Dấu <code>=</code> trong <code>-o stat=</code></b> bỏ dòng tiêu đề. Không ' +
           'có nó, <code>grep -c Z</code> sẽ đếm luôn chữ <code>STAT</code> và bạn nhận ' +
           '"1 zombie" trên một hệ thống hoàn toàn sạch — một cảnh báo giả chạy suốt đời ' +
           'script giám sát.</li>' +
           '<li><b><code>^Z</code>, không phải <code>Z</code>.</b> <code>grep Z</code> trần ' +
           'sẽ khớp mọi tiến trình có chữ Z trong tên (<code>zsh</code>, ' +
           '<code>zramctl</code>). Neo vào đầu chuỗi.</li>' +
           '<li><b>Cột <code>PPID</code> là câu trả lời thật.</b> Zombie không tốn CPU, ' +
           'không tốn RAM, và <code>kill -9</code> lên nó <b>không có tác dụng</b> — nó ' +
           'chết rồi. Thứ duy nhất sửa được là tiến trình mang cái <code>PPID</code> kia. ' +
           'Cùng lắm bạn <code>kill</code> <i>người cha</i>, để đám con được ' +
           'subreaper nhận nuôi và thu dọn.</li>' +
           '</ul>' +
           '<p>Trên board dùng BusyBox <code>ps</code> (không có <code>-o</code>), cách ' +
           'tương đương là đọc thẳng <code>/proc</code>:</p>' +
           '<pre><code>grep -l \'^State:.Z\' /proc/[0-9]*/status 2>/dev/null</code></pre>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Bạn phải thuyết phục đồng nghiệp rằng "viết bằng shell script cho nhanh" là một ' +
         'quyết định <b>có giá</b> trên board yếu. Hãy tự <b>đo</b> giá đó.<br>' +
         'Viết hai lệnh <code>time</code>: một chạy <b>500 lần một chương trình ngoài</b> ' +
         '(mỗi lần là một <code>fork</code> + một <code>exec</code>), một chạy ' +
         '<b>500 lần một builtin của shell</b> (không <code>fork</code> lần nào). Rồi tính ' +
         'tỉ lệ và nói xem con số đó có ý nghĩa gì.',
      hint: '<code>/bin/true</code> là một file thật trên đĩa. <code>:</code> là builtin của ' +
            'shell và không làm gì cả. Hai thứ này "làm cùng một việc" — chính xác là ' +
            'không việc gì — nên chênh lệch <b>chỉ còn</b> là giá của <code>fork</code>+' +
            '<code>exec</code>.',
      crit: [
        'Hai lệnh đúng ý: <code>time (for i in $(seq 500); do /bin/true; done)</code> và <code>time (for i in $(seq 500); do :; done)</code>',
        'Dùng đường dẫn <b>tuyệt đối</b> <code>/bin/true</code> — gõ <code>true</code> trần thì bash dùng builtin và phép đo mất sạch ý nghĩa',
        'Đọc dòng <code>real</code>, không phải <code>user</code>/<code>sys</code>',
        'Chạy <b>ít nhất hai lần</b> và bỏ lần đầu, vì lần đầu sau khi WSL2 nguội đắt hơn hẳn',
        'Ra tỉ lệ cỡ <b>hai bậc</b> (~100–200 lần); con số tuyệt đối ~0,3 s/500 ≈ <b>0,6 ms mỗi lần</b> fork+exec',
        'Kết luận đúng: giá này <b>không đáng kể</b> khi chạy tay, nhưng một vòng lặp gọi lệnh ngoài mỗi 10 ms trên board yếu thì fork+exec chiếm hết CPU'
      ],
      sol: '<p><b>Hai lệnh:</b></p>' +
           '<pre><code>time ( for i in $(seq 500); do /bin/true; done )   # 500 x fork + exec\n' +
           'time ( for i in $(seq 500); do :;         done )   # 500 x builtin, khong fork</code></pre>' +
           '<p><b>Kết quả thật</b> (đã chạy một lượt làm nóng trước, rồi đo 3 lần):</p>' +
           '<pre><code>500 x /bin/true    real 0m0.329s\n' +
           '                   real 0m0.279s\n' +
           '                   real 0m0.322s\n' +
           '\n' +
           '500 x :            real 0m0.002s\n' +
           '                   real 0m0.002s\n' +
           '                   real 0m0.002s</code></pre>' +
           '<p><b>Đọc con số.</b> Khoảng <b>0,31 s cho 500 lần</b> ⇒ <b>≈ 0,6 ms</b> cho mỗi ' +
           'cặp <code>fork</code>+<code>exec</code>+<code>wait</code>. Builtin gần như bằng ' +
           '0. Tỉ lệ <b>~150 lần</b>.</p>' +
           '<p><b>Vì sao phải là <code>/bin/true</code>, không phải <code>true</code>.</b> ' +
           'Bash có builtin tên <code>true</code>. Gõ <code>true</code> trần thì bạn đo ' +
           'builtin so với builtin, ra tỉ lệ 1× và kết luận "fork miễn phí". Dấu gạch chéo ' +
           'đầu tiên là toàn bộ phép đo.</p>' +
           '<p><b>Vì sao phải làm nóng.</b> Lần chạy đầu tiên sau khi WSL2 vừa khởi động mất ' +
           '~0,7–0,8 s cho cùng vòng lặp — hơn gấp đôi. Nguyên nhân là page cache và ' +
           'chi phí khởi động của lớp ảo hoá, không phải <code>fork</code> đắt hơn. Khi báo ' +
           'cáo một phép đo, luôn nói rõ <b>nóng hay nguội</b>; nếu không, con số của bạn ' +
           'không tái lập được. Số của bạn sẽ khác số ở trên — điều phải trùng là ' +
           '<b>bậc độ lớn</b> và cách lập luận.</p>' +
           '<p><b>Ý nghĩa kỹ thuật.</b> 0,6 ms là rẻ khi bạn gõ tay. Nó thành đắt ở ba chỗ ' +
           'rất cụ thể trong nghề: một script khởi động gọi 300 lệnh ngoài ⇒ ~0,2 s thời ' +
           'gian boot chỉ để <code>fork</code>; một vòng lặp giám sát gọi ' +
           '<code>cat /sys/...</code> mỗi 10 ms ⇒ 6 % CPU tan biến; và trên CPU nhúng chậm ' +
           'hơn máy này 5–10 lần, mọi con số trên nhân lên tương ứng. Đây là lý do người ta ' +
           'viết lại vòng lặp nóng bằng C, hoặc thay <code>cat</code> bằng ' +
           '<code>$(&lt; file)</code> của bash — thứ không <code>fork</code>.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Chương trình dưới đây phải in <b>ba</b> dòng: <code>starting</code>, một dòng kết ' +
         'quả, rồi <code>done</code>. Chạy thật thì nó in <b>năm</b> dòng, và một dòng có ' +
         '<code>status word = -1</code>. Không có thông báo lỗi nào.<br>' +
         'Dịch, chạy, rồi trả lời: <b>(a)</b> vì sao <b>năm</b> dòng; <b>(b)</b> vì sao ' +
         '<code>-1</code>; <b>(c)</b> vì sao <b>không</b> có thông báo lỗi dù ' +
         '<code>nosuchtool</code> rõ ràng không tồn tại; <b>(d)</b> sửa lại — cần thêm mấy ' +
         'dòng?',
      blocks: [
        { t: 'code', where: 'file', name: 'fallthrough.c', lang: 'c',
          code: '#include <stdio.h>\n' +
                '#include <stdlib.h>\n' +
                '#include <unistd.h>\n' +
                '#include <sys/wait.h>\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    printf("launcher: starting\\n");\n' +
                '    fflush(stdout);\n' +
                '\n' +
                '    pid_t pid = fork();\n' +
                '    if (pid == 0)\n' +
                '        execlp("nosuchtool", "nosuchtool", NULL);\n' +
                '\n' +
                '    int status = -1;\n' +
                '    waitpid(pid, &status, 0);\n' +
                '    printf("launcher: pid=%d, status word = %d\\n", getpid(), status);\n' +
                '    printf("launcher: done\\n");\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl',
          code: 'gcc -Wall -Wextra -o fallthrough fallthrough.c\n' +
                './fallthrough' }
      ],
      hint: 'Trong tiến trình <b>con</b>, biến <code>pid</code> mang giá trị bao nhiêu? Rồi ' +
            'thử đọc dòng <code>waitpid(pid, …)</code> với giá trị đó.',
      crit: [
        '(a) <code>execlp</code> <b>thất bại</b> nên không thay ruột; con không có lối thoát nào và <b>chạy tiếp mã của cha</b> — hai tiến trình cùng in 2 dòng cuối ⇒ 1 + 2 + 2 = <b>5</b>',
        '(a) Nhận ra hai <code>pid</code> khác nhau trong output chính là bằng chứng có hai tiến trình',
        '(b) Trong con, <code>pid == 0</code>, nên <code>waitpid(0, …)</code> nghĩa là "chờ con bất kỳ trong nhóm" — mà con <b>không có con nào</b> ⇒ trả về <code>-1</code>, <code>errno = ECHILD</code>, và <b>không đụng vào</b> <code>status</code>, nên <code>status</code> giữ nguyên giá trị khởi tạo <code>-1</code>',
        '(c) Vì mã <b>không kiểm tra giá trị trả về</b> của <code>execlp</code> và không gọi <code>perror</code> — <code>exec</code> thất bại là im lặng nếu bạn không hỏi',
        '(d) Sửa bằng <b>hai</b> dòng thêm vào nhánh con: <code>perror("execlp");</code> và <code>_exit(127);</code>, đồng thời bọc thân nhánh trong <code>{ }</code>',
        'Nói được quy tắc tổng quát: nhánh <code>if (pid == 0)</code> <b>bắt buộc</b> kết thúc bằng <code>exec</code> thành công hoặc <code>_exit</code> — không có khả năng thứ ba'
      ],
      sol: '<p><b>Kết quả thật</b> (chạy 4 lần, giống hệt nhau cả 4):</p>' +
           '<pre><code>$ ./fallthrough\n' +
           'launcher: starting\n' +
           'launcher: pid=1438, status word = -1\n' +
           'launcher: done\n' +
           'launcher: pid=1437, status word = 0\n' +
           'launcher: done\n' +
           '\n' +
           '$ ./fallthrough | wc -l\n' +
           '5</code></pre>' +
           '<p><b>(a) Năm dòng.</b> Hai <code>pid</code> khác nhau — 1438 và 1437 — nói thẳng ' +
           'ra rằng có <b>hai</b> tiến trình cùng chạy hai dòng cuối. Con (1438) gọi ' +
           '<code>execlp("nosuchtool", …)</code>, thất bại, và <code>exec</code> thất bại ' +
           'thì <b>trả về</b>. Nhánh <code>if</code> không có ngoặc nhọn nên chỉ bao đúng ' +
           'lời gọi đó; con rơi thẳng xuống <code>waitpid</code> và hai ' +
           '<code>printf</code> — mã của <b>cha</b>. Tổng: 1 dòng trước fork + 2 dòng × 2 ' +
           'tiến trình = <b>5</b>.</p>' +
           '<p><b>Thứ tự cũng có lý do:</b> con in trước, vì cha đang bị chặn trong ' +
           '<code>waitpid</code> chờ chính con đó.</p>' +
           '<p><b>(b) <code>-1</code>.</b> Trong con, <code>fork()</code> đã trả về ' +
           '<code>0</code>, nên dòng đó thật ra là <code>waitpid(0, &amp;status, 0)</code>. ' +
           'Số <code>0</code> đối với <code>waitpid</code> không phải "không chờ ai" — nó ' +
           'nghĩa là <b>"chờ con bất kỳ cùng nhóm tiến trình"</b>. Con không có con nào, ' +
           'nên lời gọi trả về <code>-1</code> với <code>errno = ECHILD</code> và ' +
           '<b>không ghi gì vào <code>status</code></b>. Bạn thấy đúng giá trị đã khởi ' +
           'tạo.</p>' +
           '<p>Đây là lúc để trân trọng dòng <code>int status = -1;</code>. Nếu tác giả viết ' +
           '<code>int status;</code> thì con sẽ in một giá trị rác — thường là 0, và bạn ' +
           'nhận được <i>"status word = 0"</i>, tức <b>báo cáo thành công</b> từ một tiến ' +
           'trình chưa từng chạy được gì. Khởi tạo biến biến một lỗi vô hình thành một lỗi ' +
           'nhìn thấy được.</p>' +
           '<p><b>(c) Vì sao im lặng.</b> <code>execlp</code> có trả về mã lỗi và có đặt ' +
           '<code>errno</code> — nhưng mã này không hỏi. Không <code>perror</code>, không ' +
           '<code>if</code>. <b><code>exec</code> thất bại không tự la lên.</b> Trên board, ' +
           'triệu chứng bạn nhận được sẽ là "dịch vụ khởi động xong, log trông bình thường, ' +
           'nhưng chẳng có gì hoạt động".</p>' +
           '<p><b>(d) Bản sửa — hai dòng:</b></p>' +
           '<pre><code>    pid_t pid = fork();\n' +
           '    if (pid &lt; 0) { perror("fork"); return 1; }\n' +
           '    if (pid == 0) {\n' +
           '        execlp("nosuchtool", "nosuchtool", NULL);\n' +
           '        perror("execlp");     /* &lt;-- them */\n' +
           '        _exit(127);           /* &lt;-- them */\n' +
           '    }</code></pre>' +
           '<p>Sau khi sửa, chương trình in đúng 3 dòng, dòng giữa cho ' +
           '<code>status word = 32512</code> (= 127 &lt;&lt; 8), và <code>stderr</code> có ' +
           '<code>execlp: No such file or directory</code>.</p>' +
           '<p><b>Vì sao trình biên dịch không cứu bạn:</b> <code>-Wall -Wextra</code> không ' +
           'kêu một tiếng nào. Không có cảnh báo nào cho "nhánh con thiếu lối thoát" — ' +
           'đây là lỗi <b>logic</b>, và người duy nhất bắt được nó là bạn.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: '<b>Được phép chưa xong.</b> Mở rộng <code>myexec</code> thành ' +
         '<code>myshell</code>: đọc từng dòng từ <code>stdin</code>, tách theo khoảng ' +
         'trắng, rồi <code>fork</code>+<code>exec</code>+<code>wait</code>. Thêm ' +
         '<b>ba</b> tính năng:<br>' +
         '<b>(1)</b> chuyển hướng <code>&gt; file</code> bằng <code>open</code> + ' +
         '<code>dup2</code> trong tiến trình con (<b>trước</b> <code>exec</code>);<br>' +
         '<b>(2)</b> lệnh nội trú <code>cd</code> — và tự giải thích được vì sao ' +
         '<code>cd</code> <b>không thể</b> là chương trình ngoài;<br>' +
         '<b>(3)</b> chạy nền bằng <code>&amp;</code> — cha không <code>wait</code>, in ngay ' +
         'dấu nhắc mới.<br><br>' +
         'Làm xong, chạy khoảng hai mươi lệnh nền rồi gõ ' +
         '<code>ps -eo pid,ppid,stat,comm | awk \'$3 ~ /^Z/\'</code>. ' +
         '<b>Ghi lại điều bạn thấy và câu hỏi nó đặt ra.</b>',
      hint: 'Với (2): <code>chdir()</code> đổi thư mục làm việc <b>của tiến trình gọi nó</b>. ' +
            'Nếu <code>cd</code> chạy trong một tiến trình con thì ai đổi thư mục, và ai ' +
            'chết ngay sau đó?',
      crit: [
        '(1) <code>open(file, O_WRONLY|O_CREAT|O_TRUNC, 0644)</code> rồi <code>dup2(fd, 1)</code> rồi <code>close(fd)</code> — và tất cả nằm <b>trong nhánh con, trước <code>exec</code></b>',
        '(1) Giải thích được vì sao nó sống sót qua <code>exec</code>: bảng file descriptor thuộc về <b>tiến trình</b>, không thuộc về ảnh chương trình — <code>exec</code> thay ruột nhưng giữ nguyên bảng fd',
        '(2) <code>cd</code> phải chạy <b>trong chính tiến trình shell</b> bằng <code>chdir()</code>; nếu <code>fork</code> rồi <code>chdir</code>, con đổi thư mục của <b>con</b> rồi chết — shell không nhúc nhích',
        '(3) Với <code>&amp;</code>: bỏ <code>waitpid</code>, in PID rồi quay lại vòng lặp',
        '(3) Quan sát được <b>zombie tích tụ</b> sau vài chục lệnh nền — đúng bằng số lệnh đã chạy',
        'Đặt được đúng câu hỏi: <i>"làm sao thu hoạch con mà không phải chặn ở <code>waitpid</code>?"</i> — và biết rằng <code>WNOHANG</code> chỉ là nửa câu trả lời, vì shell còn đang chặn ở <code>read</code> chờ bạn gõ'
      ],
      sol: '<p><b>Câu này không có một lời giải "đúng" duy nhất</b> — nó có mục đích riêng. ' +
           'Dưới đây là các mốc, và cái bẫy cuối cùng chính là món quà.</p>' +
           '<p><b>(1) Chuyển hướng.</b> Ba dòng, đặt trong nhánh con, ngay trước ' +
           '<code>exec</code>:</p>' +
           '<pre><code>int fd = open(outfile, O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
           'if (fd &lt; 0) { perror("open"); _exit(1); }\n' +
           'dup2(fd, STDOUT_FILENO);\n' +
           'close(fd);\n' +
           'execvp(argv[0], argv);</code></pre>' +
           '<p>Điều đáng ngạc nhiên là nó <b>sống sót qua <code>exec</code></b>. Lý do nằm ' +
           'đúng ở ẩn dụ của trục 2: <code>exec</code> <b>thay ruột, giữ nguyên vỏ</b>. Bảng ' +
           'file descriptor là tài sản của <i>tiến trình</i>, không phải của ảnh chương ' +
           'trình bị thay. Chương trình mới khởi động và thấy fd 1 đã trỏ vào file — nó ' +
           'không hề biết, không cần biết, và không có cách nào biết. Đây chính xác là cơ ' +
           'chế mà <code>ls &gt; out.txt</code> dùng, và <code>ls</code> không có một dòng ' +
           'mã nào về chuyển hướng.</p>' +
           '<p><b>(2) Vì sao <code>cd</code> phải là nội trú.</b> Giả sử nó là chương trình ' +
           'ngoài <code>/bin/cd</code>. Shell <code>fork</code>, con gọi ' +
           '<code>chdir("/tmp")</code> — đổi thư mục làm việc <b>của con</b> — rồi thoát. ' +
           'Thư mục làm việc là thuộc tính riêng của mỗi tiến trình, và tiến trình vừa đổi ' +
           'nó thì đã chết. Shell không nhúc nhích một milimet. Không có cách nào để một ' +
           'tiến trình con đổi thư mục của cha, và đó là lý do <code>cd</code>, ' +
           '<code>export</code>, <code>umask</code> đều <b>bắt buộc</b> phải là builtin — ' +
           'nối thẳng vào điều bạn học ở bài 4 và ở A8 của bộ này.</p>' +
           '<p><b>(3) Và đây là cái bẫy — nó cố ý.</b> Bỏ <code>waitpid</code> đi thì lệnh ' +
           'nền chạy ngon lành. Rồi:</p>' +
           '<pre><code>$ ps -eo pid,ppid,stat,comm | awk \'$3 ~ /^Z/\'\n' +
           '   ...   ...  Z+   sleep\n' +
           '   ...   ...  Z+   sleep\n' +
           '   ...   ...  Z+   sleep        &lt;- dung bang so lenh nen ban da chay\n' +
           '</code></pre>' +
           '<p>Bạn vừa <b>tự tay viết lại lỗi của <code>leaky.c</code></b>, lần này trong ' +
           'một chương trình mà bạn hiểu từng dòng. Và bạn không thể sửa nó bằng cách ' +
           'thêm <code>waitpid</code> vào — làm thế thì <code>&amp;</code> mất nghĩa.</p>' +
           '<p><b>Câu hỏi mà bạn nên viết ra:</b> <i>làm sao biết một đứa con đã chết, mà ' +
           'không phải ngồi chờ nó?</i></p>' +
           '<p>Nửa câu trả lời là <code>waitpid(-1, &amp;st, WNOHANG)</code> gọi mỗi vòng ' +
           'lặp — không chặn, thu hết những đứa đã chết. Nhưng nó chỉ chạy khi vòng lặp ' +
           '<i>quay</i>, mà shell của bạn đang nằm chặn trong <code>read()</code> chờ bạn ' +
           'gõ phím. Con chết lúc 10:00, mà bạn gõ lệnh kế lúc 10:05 thì zombie tồn tại ' +
           'năm phút.</p>' +
           '<p>Nửa còn lại là thứ bạn chưa có: một cách để <b>nhân chủ động gõ vai bạn</b> ' +
           'khi có con chết, dù bạn đang chặn ở đâu. Tên nó là <code>SIGCHLD</code>, và ' +
           'toàn bộ <b>bài 21</b> dành cho nó. Hãy giữ <code>myshell</code> lại — bạn sẽ ' +
           'sửa chính nó ở bộ bài tập sau.</p>' },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══
     Mỗi slug dưới đây được tính bằng Render.slug() trên đúng chuỗi `x` của khối
     h2 đích, không gõ tay — Render.slug() kết thúc bằng .slice(0, 60) nên tiêu đề
     dài bị cắt giữa chừng (xem hàng bài 19). §13.7.                            */
  diag: [
    ['A1 · B1 · C1',
     'Bạn còn nghĩ <code>fork()</code> "tạo ra một tiến trình rồi trả về nó". Nó trả về ' +
     '<b>hai lần, trong hai tiến trình khác nhau</b> — và giá trị trả về là cách duy nhất ' +
     'để mỗi bên biết mình là ai. Chưa nắm điều này thì mọi lỗi nhân bản (C1) đều vô hình.',
     '<a href="#/bai-20#fork-ham-duy-nhat-tra-ve-hai-lan">Đọc lại Bài 20 — <i>fork() — hàm duy nhất trả về hai lần</i></a>'],

    ['A3 · B5',
     'Bạn còn lẫn giữa "cùng địa chỉ" và "cùng ô nhớ". Sau <code>fork</code>, hai tiến ' +
     'trình thấy <b>cùng một địa chỉ ảo</b> trỏ vào <b>hai trang vật lý khác nhau</b> — ' +
     'copy-on-write chỉ hoãn việc tách ra, không bỏ nó.',
     '<a href="#/bai-20#sau-fork-cha-va-con-khong-dung-chung-mot-bien-nao">Đọc lại Bài 20 — <i>Sau fork, cha và con không dùng chung một biến nào</i></a>'],

    ['A2 · B2 · C2 · E1',
     'Bạn còn coi <code>exec</code> là "chạy một chương trình". Nó là ' +
     '<b>trở thành</b> một chương trình khác: <b>PID không đổi</b>, tiến trình gọi nó ' +
     '<b>biến mất</b>, và dòng ngay sau nó chỉ chạy khi nó <b>thất bại</b>.',
     '<a href="#/bai-20#exec-thay-ruot-giu-nguyen-vo">Đọc lại Bài 20 — <i>exec() — thay ruột, giữ nguyên vỏ</i></a>'],

    ['A5 · B3 · C3 · E5',
     'Bạn còn so sánh thẳng <code>status</code> với 0. Nó là <b>từ đóng gói</b>: mã thoát ' +
     'nằm ở 8 bit cao, số hiệu tín hiệu ở 7 bit thấp. Bỏ qua <code>WIFEXITED</code> / ' +
     '<code>WEXITSTATUS</code> là cách tạo ra một lỗi <i>im lặng và luôn báo thành ' +
     'công</i>.',
     '<a href="#/bai-20#wait-waitpid-va-cach-doc-ma-thoat-cho-dung">Đọc lại Bài 20 — <i>wait, waitpid và cách đọc mã thoát cho đúng</i></a>'],

    ['A6 · A7 · C5 · E2 · E3',
     'Bạn chưa phân biệt được <b>zombie</b> (con chết, cha chưa <code>wait</code>) với ' +
     '<b>mồ côi</b> (cha chết trước), và chưa thấy vì sao zombie tích tụ giết được thiết ' +
     'bị dù không tốn một byte RAM nào.',
     '<a href="#/bai-20#zombie-va-mo-coi-hai-ket-cuc-khi-quan-he-cha-con-dut-gay">Đọc lại Bài 20 — <i>Zombie và mồ côi — hai kết cục khi quan hệ cha con đứt gãy</i></a>'],

    ['C4',
     'Bạn chưa coi môi trường là <b>tài sản riêng đi theo từng tiến trình</b>. ' +
     '<code>PATH</code> mà shell đăng nhập của bạn có, dịch vụ do <code>init</code> khởi ' +
     'động <b>không</b> có — và đó là nguồn gốc của cả một họ lỗi "chạy tay thì được".',
     '<a href="#/bai-20#bien-moi-truong-bo-cau-hinh-di-theo-tien-trinh">Đọc lại Bài 20 — <i>Biến môi trường — bộ cấu hình đi theo tiến trình</i></a>'],

    ['A8 · B4 · B6 · E4 · E6',
     'Bạn chưa ghép được bộ ba <code>fork</code> → <code>exec</code> → <code>wait</code> ' +
     'thành một chương trình chạy được, hoặc chưa thấy <code>dup2</code> đặt trước ' +
     '<code>exec</code> thì sống sót qua <code>exec</code>. Phần thực hành của bài dựng ' +
     'đúng những mảnh này, kể cả phép đo giá <code>fork</code> và bước ' +
     '<code>setsid</code> để thành daemon.',
     '<a href="#/bai-20#thuc-hanh-viet-mot-shell-ti-hon-roi-bien-no-thanh-daemon">Đọc lại Bài 20 — <i>Thực hành: viết một shell tí hon rồi biến nó thành daemon</i></a>'],

    ['D1',
     '<b>Ôn lại bài cũ.</b> Bạn quên rằng vùng đệm của <code>printf</code> nằm ' +
     '<b>trong tiến trình</b>, nên <code>fork</code> nhân đôi cả nó — và log của bạn bắt ' +
     'đầu có dòng lặp khi bị chuyển hướng.',
     '<a href="#/bai-19#syscall-thuan-va-stdio-co-dem-cung-ket-qua-khac-358-lan-so-s">Đọc lại Bài 19 — <i>Syscall thuần và stdio có đệm</i></a>'],

    ['D2',
     '<b>Ôn lại bài cũ.</b> Bạn còn nghĩ <code>/proc</code> là file trên đĩa. Nó được nhân ' +
     '<b>sinh ra lúc bạn đọc</b> — đó là lý do <code>status</code> của một zombie vẫn có ' +
     'nội dung còn <code>cmdline</code> thì rỗng.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại Bài 5 — <i>/proc và /sys — hai thư mục không nằm trên đĩa</i></a>'],

    ['A4 · D3',
     '<b>Ôn lại bài cũ.</b> Bạn còn tin dòng chữ chương trình in ra thay vì tin ' +
     '<code>$?</code>. Quy ước 0 / 1–125 / 126 / 127 / 128+n là hợp đồng duy nhất giữa một ' +
     'chương trình và mọi script gọi nó.',
     '<a href="#/bai-04#ma-thoat-cach-may-tra-loi-co-duoc-khong">Đọc lại Bài 4 — <i>Mã thoát — cách máy trả lời "có được không"</i></a>'],

    ['Sai nhiều câu ở phần E',
     'Không phải bạn không hiểu lý thuyết — bạn chưa <b>gõ</b> đủ. Bảng lỗi thường gặp ' +
     'cuối Bài 20 liệt kê đúng những cái bẫy mà phần E dựng lại: quên ' +
     '<code>_exit</code> trong nhánh con, quên <code>perror</code> sau ' +
     '<code>exec</code>, đọc <code>status</code> sai, quên <code>wait</code>.',
     '<a href="#/bai-20#loi-thuong-gap">Đọc lại Bài 20 — <i>Lỗi thường gặp</i></a>']
  ]
});

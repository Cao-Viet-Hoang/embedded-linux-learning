/* ══════════════════════════════════════════════════════════════════════════
   Bài tập 23 — Giao tiếp liên tiến trình (IPC)
   ══════════════════════════════════════════════════════════════════════════

   ── §13.4 BƯỚC 1–2: KIỂM KÊ VÀ CHẤM ĐIỂM ─────────────────────────────────
   Nguồn: 7 goals, 13 h2, các khối cal kind why|danger|warn|tip|info, bảng
   chọn cơ chế, bảng 16 lần chạy, recap (17 ý) và bảng lỗi thường gặp
   (15 dòng) của lessons/bai-23.js.

   D = phụ thuộc về sau · C = giá của hiểu sai · K = phản trực giác  (0/1/2)

   #   Ứng viên                                              D  C  K   Σ
   ──────────────────────────────────────────────────────────────────────
   1   Tốc độ IPC là con số ĐẾM được (2001 so với 1 syscall),
       không phải con số ĐO được — thông lượng dao động 7,7×
       giữa các lần chạy, số syscall không đổi một đơn vị     2  2  2   6  <= TRỤC 0
   2   Bốn cơ chế kia tự đồng bộ vì nhân nằm trên đường đi;
       bộ nhớ chia sẻ nhanh CHÍNH VÌ nhân rút lui, và bảo
       đảm đồng bộ rút lui theo. Nghĩa vụ không tự chọn       2  2  2   6  <= TRỤC 1
   3   Đối tượng IPC POSIX KIÊN TRÌ: sống qua cái chết của
       tiến trình, kể cả SIGKILL. ps/top không chỉ mặt được
       vì không tiến trình nào đang giữ chúng                 2  2  2   6  <= TRỤC 2
   4   Quên close(fd[1]) sau fork: read() không bao giờ trả
       0, treo im lặng, timeout cho mã 124                    1  2  2   5
   5   SIGPIPE giết tiến trình theo mặc định, mã thoát 141,
       không để lại dòng log nào                              1  2  2   5
   6   Mở FIFO là hành động CHẶN cho tới khi phía kia mở;
       O_NONBLOCK bất đối xứng — mở ghi khi chưa có người
       đọc thì hỏng với ENXIO                                 1  1  2   4
   7   shm_open không phải syscall — nó là openat trên
       /dev/shm, nên gỡ lỗi được bằng ls/rm/hexdump           1  1  2   4
   8   Quên ftruncate: mmap THÀNH CÔNG, trả về địa chỉ hợp
       lệ, nhưng chạm vào thì Bus error                       1  2  1   4
   9   Ba trần mặc định của hàng đợi (10 / 8192 / 256) chỉ
       nổ lúc chạy: EINVAL và EMSGSIZE                        1  1  1   3
   10  Sức chứa pipe 65536 byte; ghi ≤ PIPE_BUF = 4096 byte
       thì nhân bảo đảm nguyên tử                             1  1  1   3
   11  Ưu tiên 9 gửi thứ hai vẫn được nhận đầu tiên           1  0  1   2
   12  Semaphore không chuyển dữ liệu, chỉ đếm chỗ            1  0  0   1
   13  read/write có thể chuyển ÍT hơn số byte yêu cầu, nên
       mọi lời gọi phải nằm trong vòng while                  2  2  1   5
   14  mmap trên /dev/mem cần O_SYNC, làm tròn xuống biên
       trang, và volatile                                     1  1  1   3
   15  Với hệ thời gian thực, jitter quan trọng hơn thông
       lượng: pipe dao động 7,7×, bộ nhớ chia sẻ 2,5×         2  1  2   5

   ── BƯỚC 3: CẮT ──────────────────────────────────────────────────────────
   Ba ứng viên đạt Σ = 6, và chỉ ba ứng viên đó được điểm 2 ở cả ba axis.
   Lấy #1, #2, #3.

   ── BƯỚC 4: LOẠI ─────────────────────────────────────────────────────────
   #13 ĐÃ LÀ TRỤC CỦA bt-19 ("write() trả về số byte thực sự ghi được — nhỏ
       hơn số yêu cầu vẫn là thành công"). Một khái niệm chỉ được xoáy MỘT
       lần trong cả khoá, nên ở đây nó chỉ được một dòng trong bảng chẩn
       đoán và một tiêu chí trong E3.
   #15 Không phải trục riêng: cơ chế của nó chính là trục 0 nhìn từ phía
       thời gian — mỗi syscall là một cơ hội để bộ lập lịch cướp CPU. Nó là
       phần lõi của B1 và C1, không đứng riêng được.
   #4  #5  Rất mạnh, nhưng cả hai đã là câu hỏi của quiz Bài 23. Theo §13.1
       bộ bài tập không được là một quiz thứ hai, nên chúng chỉ xuất hiện ở
       dạng khác hẳn: #4 thành một câu dự đoán mã thoát phải chạy thật (E1),
       #5 thành một nhánh trong câu chẩn đoán đa nguyên nhân (C4).
   #10 #11 #12 Tra cứu được trong mười giây (§13.3 cấm làm trục) -> tối đa
       một câu ở phần A.
   #14 volatile đã là trục của bt-14; phần /dev/mem trên máy này còn không
       chạy được, nên nó chỉ đáng một dòng trong bảng ghép nối.

   ── BƯỚC 5: BA CÂU CÓ THỂ SAI ────────────────────────────────────────────
   T0  Tốc độ của một cơ chế IPC được quyết định bởi SỐ LẦN vượt ranh giới
       user/kernel, và con số đó ĐẾM được chứ không phải ĐO: 1000 khối qua
       pipe tốn 2001 syscall, qua bộ nhớ chia sẻ tốn 1. Thông lượng đo bằng
       đồng hồ dao động tới 7,7 lần giữa các lần chạy; số syscall không đổi
       một đơn vị nào.
   T1  Bốn cơ chế kia tự đồng bộ vì nhân nằm trên đường đi của từng byte.
       Bộ nhớ chia sẻ nhanh chính vì nhân đã rút lui sau mmap — và bảo đảm
       đồng bộ rút lui cùng nó. Tốc độ và nghĩa vụ tự khoá là HAI MẶT CỦA
       CÙNG MỘT SỰ THẬT, không phải hai lựa chọn tách rời.
   T2  Đối tượng IPC POSIX kiên trì: chúng sống tới khi bị unlink hoặc tới
       khi khởi động lại máy, chứ không chết theo tiến trình tạo ra. Vì
       không tiến trình nào đang giữ chúng, ps và top không thể chỉ mặt.

   ── BƯỚC 6: HIỂU LẦM ĐỐI ỨNG ─────────────────────────────────────────────
   M0  "Muốn biết cơ chế nào nhanh hơn thì chạy bench rồi so con số thông
        lượng — đo là bằng chứng."
   M1  "MMU vẫn canh gác đầy đủ, nên hai tiến trình dùng bộ nhớ chia sẻ
        không thể phá nhau như hai luồng được."
   M2  "Tiến trình chết thì nhân dọn hết tài nguyên nó tạo ra, giống như
        đóng file descriptor vậy."

   ── BƯỚC 7: LƯỚI 3 × 1 ───────────────────────────────────────────────────
          A (nhớ lại)              B (giải thích số liệu)      C (quyết định)
   T0     a1 hai lần bench cho     b1 đọc strace -c 2001/1     c1 chỉ được
          hai tỉ số khác nhau —    cạnh hai lần bench mâu      nộp MỘT bảng
          con số nào không đổi     thuẫn nhau                  để chứng minh
   T1     a4 đúng/sai: MMU canh    b2 đọc output forgot_       c2 khung hình
          gác nên shm an toàn      pshared: Fatal glibc rồi    30 fps × 2 MB
          ngang pipe               vẫn chạy tiếp, 217666       trên bo 512 MB
   T2     a7 điền: SIGKILL thì     b3 giải thích vì sao ps     c3 gateway rò
          phải unlink thêm vào     không chỉ mặt được, và vì   4 MB RAM mỗi
          lúc nào                  sao tay SIGTERM chưa đủ     ngày, ps sạch

   Kiểm tra: C1/C2/C3 đều KHÔNG trả lời được nếu chưa nắm trục; ba mức dùng
   ba loại kích thích khác nhau (phát biểu / output thật / tình huống có
   ràng buộc mới); không câu nào lộ đáp án cho câu sau — b1 nói về hai con
   số đếm được còn c1 hỏi phải trình bày cái gì cho một người không đọc bài.

   ── RANH GIỚI VỚI QUIZ BÀI 23 (§13.1) ────────────────────────────────────
   Quiz đã hỏi: quên close(fd[1]); mã 141; vì sao shm nhanh hơn; thiếu
   setpshared; ba thư mục tmpfs; ưu tiên hàng đợi; vòng while quanh
   read/write. Không câu nào trong bộ này lặp lại một trong bảy câu đó ở
   cùng một dạng — mỗi câu đổi hoặc thao tác (đọc số liệu, chẩn đoán, gõ
   lệnh) hoặc đổi hẳn góc hỏi.

   ── XUẤT XỨ SỐ LIỆU ──────────────────────────────────────────────────────
   Mọi bản ghi terminal trong file này là output THẬT đã được kiểm chứng khi
   soạn Bài 23, trên WSL2 Ubuntu 26.04, gcc 15.2.0, glibc 2.43, 6 nhân, từ
   các chương trình trong ~/embedded/bai23 của phần Thực hành Bài 23.
   Bốn điểm cần ghi chú:
     · Thông lượng KHÔNG tất định. Bảng một lần chạy cho pipe 3044 MB/s và
       shm 10832 MB/s; nhưng qua 16 lần chạy pipe trải 518–3 969 và shm
       trải 4 826–11 874, cộng một lần vọt lên 32 912 MB/s. Chính sự dao
       động đó là nội dung câu B1, C1 và E3.
     · Số syscall thì tất định: 2001 và 1, không đổi giữa các lần chạy. Đây
       là lý do trục 0 được phát biểu theo hướng "đếm, không đo".
     · race_unsafe cũng không tất định — ba lần chạy mất 127 354 / 195 854 /
       196 835 trên 400 000, tức 32 % tới 49 %. Câu E2 bắt người học tự gặp
       lại điều đó và tự so với bt-22 E1, nơi bản -O1 cho kết quả GIỐNG HỆT
       nhau mọi lần.
     · Mốc thời gian, tên người dùng shinarus và địa chỉ mmap (ASLR) trong
       mọi output đều là của máy tham chiếu và sẽ khác trên máy người học —
       các tiêu chí tự chấm không được đòi khớp những giá trị đó.
   ══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-23',
  minutes: 85,

  intro:
    '<p>Bài 23 đưa cho bạn năm cơ chế và một bảng số liệu, và cái bẫy nằm ngay ở chỗ đó: ' +
    'bảng số liệu <b>trông</b> như bằng chứng. Bộ bài tập này xoáy vào ba điều mà người học ' +
    'thường tưởng đã hiểu sau khi đọc xong: <b>(1)</b> con số nào trong bài mới thực sự ' +
    'chứng minh được cơ chế nào nhanh hơn — và vì sao đó <i>không</i> phải con số thông ' +
    'lượng; <b>(2)</b> vì sao nghĩa vụ tự đồng bộ của bộ nhớ chia sẻ không phải một khoản ' +
    'phụ thu mà là <i>chính</i> cái làm nó nhanh; <b>(3)</b> vì sao một thiết bị có thể rò ' +
    'RAM suốt nhiều ngày trong khi <code>ps</code> hoàn toàn sạch.</p>' +
    '<p><b>Chia làm hai lượt, và khoảng nghỉ giữa hai lượt là một thành phần của bài tập, ' +
    'không phải sự trì hoãn.</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1</b> — ngay sau khi đọc xong Bài 23: phần <b>A</b> và <b>B</b> (~23 phút).</li>' +
    '<li><b>Lượt 2</b> — sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b> (~60 phút). Nhớ lại ' +
    'sau khi đã quên một phần thì bền hơn nhớ lại lúc còn nóng.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần các chương trình trong <code>~/embedded/bai23</code> mà bạn đã viết ' +
    'ở phần Thực hành Bài 23. Nếu đã xoá, hãy gõ lại — gõ lại chính là bài tập.</p>',

  truc: [
    { id: 'count', name: 'Tốc độ IPC là con số đếm được, không phải con số đo được',
      x: 'Chuyển 1000 khối qua pipe tốn <b>2001</b> lần vượt ranh giới user/kernel; qua bộ nhớ ' +
         'chia sẻ tốn <b>1</b>. Hai con số ấy do <code>strace -c</code> <b>đếm</b> và chúng ' +
         'không đổi giữa các lần chạy. Thông lượng thì ngược lại: cùng một chương trình, pipe ' +
         'trải từ 518 tới 3 969 MB/s qua 16 lần chạy. Muốn chứng minh một cơ chế nhanh hơn, ' +
         'hãy trình ra thứ <i>đếm</i> được và thứ <i>tệ nhất</i> đo được — đừng trình số trung bình.',
      mis: 'Muốn biết cơ chế nào nhanh hơn thì chạy bench rồi so con số thông lượng.' },

    { id: 'tradeoff', name: 'Nhân rút lui thì bảo đảm đồng bộ rút lui theo',
      x: 'Pipe, FIFO, hàng đợi và semaphore <b>tự đồng bộ</b> vì nhân nằm trên đường đi của ' +
         'từng byte — nó bảo đảm một lời <code>read</code> lấy đúng thứ một lời ' +
         '<code>write</code> đặt vào. Bộ nhớ chia sẻ nhanh <b>chính vì</b> nhân đã rút lui sau ' +
         '<code>mmap</code>, và bảo đảm ấy rút lui cùng nó. MMU vẫn canh gác đầy đủ, nhưng nó ' +
         'chỉ ngăn bạn chạm vào vùng <i>chưa</i> được ánh xạ; vùng đã ánh xạ chung thì nó ' +
         'không có ý kiến gì. Tốc độ và nghĩa vụ tự khoá là hai mặt của cùng một sự thật.',
      mis: 'MMU vẫn canh gác đầy đủ, nên hai tiến trình dùng bộ nhớ chia sẻ không phá nhau được.' },

    { id: 'persist', name: 'Đối tượng IPC POSIX kiên trì — chúng sống qua cái chết của tiến trình',
      x: 'Một vùng <code>shm</code>, một hàng đợi, một semaphore sống tới khi bị ' +
         '<code>*_unlink</code> hoặc tới khi khởi động lại máy. Chúng <b>không</b> chết theo ' +
         'tiến trình tạo ra — và vì không tiến trình nào đang giữ chúng, <code>ps</code> cùng ' +
         '<code>top</code> không thể chỉ mặt. Chỉ ba lệnh <code>ls</code> trên ' +
         '<code>/dev/shm/</code>, <code>/dev/mqueue/</code> và <code>/run/</code> mới thấy. ' +
         'Và vì <code>SIGKILL</code> không bắt được, một tay xử lý <code>SIGTERM</code> ' +
         '<b>không đủ</b>: phải dọn thêm một lần nữa lúc khởi động.',
      mis: 'Tiến trình chết thì nhân dọn hết, giống như đóng file descriptor vậy.' }
  ],

  A: [
    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Bạn chạy <code>./ipc_bench</code> hai lần trong hai buổi khác nhau. Lần đầu: pipe ' +
         '3 044 MB/s, bộ nhớ chia sẻ 10 832 MB/s — chênh <b>3,6×</b>. Lần sau: pipe ' +
         '3 969 MB/s, bộ nhớ chia sẻ 4 826 MB/s — chênh <b>1,2×</b>. Đại lượng nào trong bài ' +
         '<b>không hề đổi</b> giữa hai lần chạy đó?',
      opts: [
        'Độ trễ mỗi khối, vì nó được tính ra từ thông lượng nên ổn định hơn',
        'Số byte mỗi khối, vì <code>PIPE_BUF</code> cố định ở 4096',
        'Số syscall cho mỗi 1000 khối: 2 001 với pipe, 1 với bộ nhớ chia sẻ',
        'Không đại lượng nào — mọi phép đo trên WSL2 đều dao động'
      ],
      a: 2,
      why: '<p>Thông lượng và độ trễ là hai cách viết của <b>cùng một</b> phép đo bằng đồng hồ, ' +
           'nên chúng dao động y như nhau: qua 16 lần chạy, pipe trải từ 518 tới 3 969 MB/s ' +
           '(chênh <b>7,7×</b>), bộ nhớ chia sẻ trải 4 826–11 874 MB/s. Kích thước khối thì ' +
           'do <i>bạn</i> chọn trong mã nguồn (4096 ở đây), không phải một đại lượng đo được — ' +
           'và <code>PIPE_BUF</code> là ngưỡng bảo đảm nguyên tử, không phải kích thước khối ' +
           'bắt buộc.</p>' +
           '<p>Còn lại đúng một thứ: <code>strace -c</code> <b>đếm</b> được 2 001 lần vượt ' +
           'ranh giới cho pipe và <b>1</b> cho bộ nhớ chia sẻ, và con số này chỉ phụ thuộc mã ' +
           'nguồn chứ không phụ thuộc tải máy. Đây là khác biệt căn bản giữa một đại lượng ' +
           '<i>đếm</i> và một đại lượng <i>đo</i> — và nó quyết định bạn nên trình cái gì khi ' +
           'phải bảo vệ một quyết định thiết kế.</p>' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Ba tiến trình cùng ghi log vào <b>một</b> FIFO, một tiến trình đọc ra. Bạn muốn ' +
         'chắc chắn không có dòng log nào bị xé đôi rồi trộn lẫn với dòng của tiến trình khác. ' +
         'Điều kiện nào là đủ?',
      opts: [
        'Mỗi lần <code>write</code> không quá <b>4096</b> byte — nhân bảo đảm nguyên tử dưới ngưỡng <code>PIPE_BUF</code>',
        'Mỗi lần <code>write</code> không quá <b>65 536</b> byte — tức không vượt sức chứa của FIFO',
        'Không có điều kiện nào đủ; phải dùng một semaphore để ba bên ghi lần lượt',
        'Mở FIFO với <code>O_APPEND</code>, giống như khi ghi vào file log thường'
      ],
      a: 0,
      why: '<p><b>65 536</b> và <b>4 096</b> là hai con số trả lời hai câu hỏi khác nhau, và ' +
           'lẫn chúng là một lỗi rất phổ biến. 65 536 byte là <b>sức chứa</b>: ghi quá thì ' +
           'người ghi bị chặn (hoặc nhận <code>EAGAIN</code>). 4 096 byte là ' +
           '<code>PIPE_BUF</code>, <b>ngưỡng nguyên tử</b>: dưới ngưỡng này nhân bảo đảm một ' +
           'lời <code>write</code> vào trọn vẹn, không bị lời <code>write</code> của tiến ' +
           'trình khác chen vào giữa.</p>' +
           '<p>Đây chính là lý do <code>syslog</code> và hầu hết thư viện log đều giới hạn độ ' +
           'dài một bản ghi. <code>O_APPEND</code> thì vô nghĩa với FIFO — không có con trỏ ' +
           'file nào để nối vào cuối, dữ liệu nằm trong bộ đệm RAM của nhân chứ không trên ' +
           'đĩa (đó là lý do <code>ls -l</code> luôn báo kích thước <b>0</b>).</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một daemon mở FIFO để <b>ghi</b> với <code>O_WRONLY | O_NONBLOCK</code> ngay lúc ' +
         'khởi động, lúc chưa có tiến trình nào mở đầu đọc. Chuyện gì xảy ra?',
      opts: [
        '<code>open</code> trả về ngay với một mô tả file hợp lệ; dữ liệu ghi vào sẽ nằm chờ trong bộ đệm nhân',
        '<code>open</code> đứng im cho tới khi có người mở đầu đọc — <code>O_NONBLOCK</code> không áp dụng cho FIFO',
        '<code>open</code> hỏng ngay với <code>ENXIO</code>',
        '<code>open</code> thành công nhưng lời <code>write</code> đầu tiên sinh <code>SIGPIPE</code>'
      ],
      a: 2,
      why: '<p><code>O_NONBLOCK</code> trên FIFO <b>bất đối xứng</b>, và đây là chi tiết làm ' +
           'mất buổi chiều của rất nhiều người:</p>' +
           '<ul>' +
           '<li>Mở <b>đọc</b> không chặn: <b>thành công ngay</b>, kể cả khi chưa có người ghi. ' +
           '<code>read</code> sau đó trả <code>EAGAIN</code> cho tới khi có dữ liệu.</li>' +
           '<li>Mở <b>ghi</b> không chặn mà chưa có người đọc: <b>hỏng ngay</b> với ' +
           '<code>ENXIO</code>.</li>' +
           '</ul>' +
           '<p>Lý do hợp lý: nhân từ chối cấp cho bạn một đầu ghi mà chắc chắn không ai nhận ' +
           'được gì. Không có <code>O_NONBLOCK</code> thì <code>open</code> <b>chặn</b> cho tới ' +
           'khi phía kia mở — đó là tính năng tự đồng bộ, nhưng nếu bạn không biết thì triệu ' +
           'chứng sẽ là "daemon treo lúc khởi động, không log dòng nào".</p>' +
           '<p>Cách làm đúng trên thiết bị: bên <i>đọc</i> khởi động trước (hoặc dùng ' +
           '<code>After=</code> trong file systemd unit), hoặc bên ghi thử lại ' +
           '<code>ENXIO</code> theo chu kỳ.</p>' },

    { id: 'a4', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 1,
      q: '<b>Phát biểu:</b> "Bộ nhớ chia sẻ nhanh hơn hẳn nhưng vẫn an toàn ngang pipe, vì đây ' +
         'là hai <i>tiến trình</i> chứ không phải hai luồng — MMU vẫn canh gác đầy đủ, mỗi bên ' +
         'vẫn có bảng trang riêng, nên chúng không thể phá dữ liệu của nhau như hai luồng ' +
         'được."',
      a: 1,
      rw: 'Viết lại cho đúng, và nói rõ MMU thực sự bảo vệ cái gì trong tình huống này.',
      crit: [
        'Nói rõ MMU <b>vẫn hoạt động</b> — phát biểu không sai ở chỗ đó, nên đừng bác bỏ cả câu',
        'Chỉ ra chỗ sai: MMU chỉ ngăn chạm vào vùng <b>chưa</b> được ánh xạ; vùng đã ánh xạ chung thì nó không có ý kiến gì',
        'Nêu được cơ chế: <code>(*counter)++</code> từ hai tiến trình trỏ vào <b>cùng một khung trang vật lý</b>, nên vẫn là <code>mov</code>/<code>add</code>/<code>mov</code> không nguyên tử',
        'Dẫn được số liệu: <code>race_unsafe</code> mất <b>127 354 / 195 854 / 196 835</b> trên 400 000 qua ba lần chạy',
        'Nêu được mối liên hệ nhân quả: bốn cơ chế kia tự đồng bộ vì nhân nằm trên đường đi; bộ nhớ chia sẻ nhanh <b>chính vì</b> nhân rút lui, nên bảo đảm đó rút lui theo'
      ],
      why: '<p>Phát biểu này sai ở một chỗ rất tinh vi: <b>tiền đề đúng, kết luận sai</b>. MMU ' +
           'thật sự vẫn canh gác, hai tiến trình thật sự vẫn có bảng trang riêng. Nhưng ' +
           '<code>mmap</code> với <code>MAP_SHARED</code> làm đúng một việc: trỏ <i>hai</i> ' +
           'bảng trang khác nhau vào <i>cùng một</i> khung trang vật lý. Từ giây phút đó, MMU ' +
           'đã làm xong việc của nó và không còn gì để nói.</p>' +
           '<p>Ba lần chạy <code>race_unsafe</code> cho <b>272 646</b>, <b>204 146</b>, ' +
           '<b>203 165</b> trên mong đợi 400 000 — tức mất từ 32 % tới gần 49 %, thất thường, ' +
           'từ cùng một mã nguồn. Đúng những gì hai <i>luồng</i> đã làm ở Bài 22.</p>' +
           '<p>Điều đáng nhớ hơn cả: nghĩa vụ tự đồng bộ không phải một khoản phụ thu bạn có ' +
           'thể thương lượng. Nó <b>chính là</b> cái làm bộ nhớ chia sẻ nhanh. Bốn cơ chế kia ' +
           'tự đồng bộ vì mỗi byte phải đi qua nhân — 2 001 syscall cho 1000 khối. Bộ nhớ chia ' +
           'sẻ tốn <b>1</b> syscall vì nhân đã rút lui. Tốc độ và nghĩa vụ là hai mặt của cùng ' +
           'một sự thật.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<b>Phát biểu:</b> "Muốn xem chương trình của mình gọi bộ nhớ chia sẻ lúc nào, cứ ' +
         'chạy <code>strace -e trace=shm_open ./prog</code> là thấy hết."',
      a: 1,
      rw: 'Viết lại cho đúng, và cho biết lệnh nào mới thực sự theo dõi được.',
      crit: [
        'Nói đúng <code>shm_open</code> <b>không phải syscall</b> mà là hàm thư viện của glibc',
        'Nêu đúng lệnh thay thế: <code>strace -e trace=openat</code>',
        'Nói được nó thực chất mở cái gì: <code>/dev/shm/&lt;tên&gt;</code>',
        'Rút ra hệ quả thực dụng: vì vùng chia sẻ chỉ là một file trên tmpfs nên gỡ lỗi được bằng <code>ls</code>, <code>rm</code>, <code>hexdump</code> như file thường'
      ],
      why: '<p><code>strace</code> chỉ biết <b>syscall</b>. Gõ tên một hàm thư viện vào ' +
           '<code>-e trace=</code> thì nó từ chối thẳng: <code>strace: invalid system call ' +
           '&#39;shm_open&#39;</code>.</p>' +
           '<p><code>shm_open</code> là một hàm nhỏ trong glibc, và tất cả việc nó làm là ghép ' +
           'tên bạn đưa vào sau <code>/dev/shm/</code> rồi gọi <code>openat</code>. Theo dõi ' +
           'bằng <code>strace -e trace=openat</code> là thấy ngay.</p>' +
           '<p>Điều này không phải mẹo vặt — nó là <b>toàn bộ bản chất</b> của bộ nhớ chia sẻ ' +
           'POSIX. <code>/dev/shm</code> là một tmpfs (<code>df</code> báo ' +
           '<code>none 2.5G 4.0K 2.5G 1% /dev/shm</code>), vùng chia sẻ của bạn là một file ' +
           'trong đó (<code>-rw------- … 48 … sensor_data</code>), và mọi công cụ file thường ' +
           'đều dùng được với nó. Đó cũng là lý do nó <b>kiên trì</b>.</p>' },

    { id: 'a6', k: 'num', tag: 'Trắc nghiệm nhanh', unit: 'byte', tol: 0,
      q: 'Sức chứa mặc định của một pipe trên máy học là bao nhiêu <b>byte</b>? (Con số mà ' +
         '<code>fcntl(fd, F_GETPIPE_SZ)</code> trả về, và cũng là con số mà phép ghi từng byte ' +
         'tới khi <code>EAGAIN</code> xác nhận.)',
      a: 65536,
      why: '<b>65 536</b> byte = 64 KB, và hai cách đo cho <i>đúng</i> cùng con số, không sai ' +
           'một byte: <code>F_GETPIPE_SZ</code> hỏi thẳng nhân, còn vòng ghi từng byte đếm ' +
           'được <code>wrote 65536 bytes before the pipe filled (EAGAIN)</code>. Trần nâng ' +
           'được cho một tiến trình thường là <b>1 048 576</b> byte, đọc ở ' +
           '<code>/proc/sys/fs/pipe-max-size</code>. Đừng lẫn nó với ' +
           '<code>PIPE_BUF = 4096</code>, con số trả lời câu hỏi hoàn toàn khác — xem A2.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết', truc: 2,
      q: 'Daemon của bạn gọi <code>shm_unlink</code> trong tay xử lý <code>SIGTERM</code>. ' +
         'Nhưng người vận hành có thể gõ <code>kill -9</code>, và <code>SIGKILL</code> thì ' +
         'không bắt được — tay xử lý sẽ không bao giờ chạy. Để vẫn không rò rỉ, chương trình ' +
         'phải gọi <code>shm_unlink</code> thêm một lần nữa vào lúc __________.',
      a: ['khởi động', 'lúc khởi động', 'khởi động chương trình', 'lúc khởi động chương trình',
          'bắt đầu chạy', 'lúc bắt đầu chạy', 'bắt đầu', 'lúc bắt đầu', 'khởi động lần sau',
          'lần khởi động sau', 'startup', 'lúc start', 'trước khi tạo mới'],
      ph: 'một thời điểm trong vòng đời chương trình',
      why: '<p>Đáp án: <b>lúc khởi động</b> — cụ thể là ngay trước khi tạo vùng mới. Đây là ' +
           'lý do bạn thấy <code>shm_unlink("/race_unsafe");</code> đứng ở dòng <i>đầu tiên</i> ' +
           'của <code>main</code> trong bài, trước cả <code>shm_open</code>.</p>' +
           '<p>Phòng bệnh phải có <b>hai lớp</b>, và lớp thứ hai mới là lớp thật:</p>' +
           '<ul>' +
           '<li><b>Lớp 1 — dọn lúc tắt:</b> <code>*_unlink</code> trong tay xử lý ' +
           '<code>SIGTERM</code>. Chỉ có tác dụng khi được tắt <i>tử tế</i>.</li>' +
           '<li><b>Lớp 2 — dọn lúc bật:</b> <code>*_unlink</code> trước khi tạo mới. Lớp này ' +
           'sống sót qua <code>SIGKILL</code>, qua mất điện, qua sập nguồn — mọi kịch bản mà ' +
           'lớp 1 bó tay.</li>' +
           '</ul>' +
           '<p>Ba con số cần biết vì sao lớp 2 bắt buộc: <code>SIGKILL</code> (9) và ' +
           '<code>SIGSTOP</code> (19) là hai tín hiệu duy nhất không chặn được, không bắt ' +
           'được, không bỏ qua được — bạn đã lập bảng này ở Bài 21.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi tình huống với cơ chế IPC phù hợp nhất. Đây là bảng chọn cơ chế của bài, ' +
         'đảo thứ tự — hãy chọn theo <i>ràng buộc</i> của tình huống, đừng chọn theo cái tên ' +
         'bạn nhớ rõ nhất.',
      left: [
        'Tiến trình cha <code>fork</code> ra con rồi đẩy dữ liệu một chiều xuống cho nó',
        'Hai dịch vụ độc lập do systemd khởi động, không họ hàng, cần một kênh một chiều có kiểm soát quyền',
        'Gói tin rời rạc, trong đó loại "cảnh báo quá nhiệt" phải vượt lên trước hàng trăm số đo thường',
        'Ba tiến trình tranh nhau một cổng UART; không cần trao đổi dữ liệu, chỉ cần lần lượt',
        'Khung hình 2 MB, 30 lần mỗi giây, từ tiến trình thu sang tiến trình mã hoá, cần độ trễ ổn định',
        'Chỉ cần báo "đã có chuyện xảy ra", không mang theo một byte dữ liệu nào'
      ],
      right: [
        'Semaphore POSIX có tên',
        'Bộ nhớ chia sẻ + mutex <code>PTHREAD_PROCESS_SHARED</code>',
        'pipe vô danh',
        'Tín hiệu hoặc <code>eventfd</code>',
        'Hàng đợi thông điệp POSIX',
        'FIFO'
      ],
      a: [2, 5, 4, 0, 1, 3],
      why: '<p>Ba cặp dễ lẫn nhất, và ranh giới giữa chúng:</p>' +
           '<ul>' +
           '<li><b>pipe so với FIFO.</b> Tốc độ gần như nhau (3 044 so với 2 216 MB/s trong ' +
           'phép đo của bài) nên đó <i>không</i> phải tiêu chí. Khác biệt duy nhất đáng kể: ' +
           'FIFO có <b>tên</b> trên hệ thống tập tin, nên hai bên không cần họ hàng và bạn ' +
           'kiểm soát được ai gửi ai nhận bằng quyền Unix. Đổi lại nó để rác lại và bạn phải ' +
           'nhớ xoá.</li>' +
           '<li><b>Hàng đợi so với bộ nhớ chia sẻ.</b> Bộ nhớ chia sẻ nhanh hơn 4–5 lần nhưng ' +
           'không biết gì về "gói" hay "ưu tiên" — bạn phải tự viết hết. Khi ràng buộc là ' +
           '<i>thứ tự</i> chứ không phải <i>tốc độ</i>, hàng đợi thắng.</li>' +
           '<li><b>Semaphore so với mutex trong vùng chia sẻ.</b> Semaphore điều phối việc ' +
           'truy cập một tài nguyên <i>bên ngoài</i> (UART, GPIO, thẻ nhớ). Mutex ' +
           '<code>PROCESS_SHARED</code> bảo vệ dữ liệu <i>bên trong</i> vùng chia sẻ, và nên ' +
           'nằm ngay trong vùng đó để cùng vòng đời với thứ nó bảo vệ.</li>' +
           '</ul>' +
           '<p>Dòng khung hình 2 MB là dòng duy nhất hội đủ <b>cả ba</b> điều kiện khiến bộ ' +
           'nhớ chia sẻ xứng đáng: dữ liệu lớn, tần suất dày, cần trễ ổn định. Thiếu một trong ' +
           'ba thì pipe hoặc FIFO gần như luôn là câu trả lời đúng.</p>' }
  ],

  B: [
    { id: 'b1', k: 'free', tag: 'Đọc output', rows: 7, truc: 0,
      q: 'Dưới đây là hai lần chạy <code>ipc_bench</code> thật, cách nhau vài ngày, cùng một ' +
         'file thực thi, cùng một máy. Một đồng nghiệp nhìn bảng và kết luận: <i>"Lần sau bộ ' +
         'nhớ chia sẻ chỉ hơn pipe có 1,2 lần thôi — chênh lệch đâu đáng kể, thôi dùng pipe ' +
         'cho gọn."</i> Hãy chỉ ra <b>chỗ hỏng trong lập luận</b>, rồi cho biết bạn sẽ trình ' +
         'con số nào để phản bác.',
      blocks: [
        { t: 'table',
          head: ['Cơ chế', 'Lần A — MB/s', 'Lần B — MB/s', 'Lần A — µs/khối', 'Lần B — µs/khối'],
          rows: [
            ['pipe', '3 044,0', '3 969', '1,28', '0,98'],
            ['FIFO', '2 215,8', '3 105', '1,76', '1,26'],
            ['Hàng đợi thông điệp', '1 957,9', '2 239', '2,00', '1,74'],
            ['Bộ nhớ chia sẻ', '10 832,2', '4 826', '0,36', '0,81']
          ] }
      ],
      hint: 'Cột nào cũng đổi giữa hai lần chạy. Vậy trong toàn bộ bài có đại lượng nào ' +
            '<i>không</i> đổi không? Đại lượng đó được sinh ra bằng cách nào — đọc đồng hồ, ' +
            'hay đếm sự kiện?',
      crit: [
        'Nhận ra <b>cả bốn cột số</b> đều là cùng một phép đo bằng đồng hồ viết theo hai cách (MB/s và µs là nghịch đảo của nhau)',
        'Chỉ ra rằng chọn <i>một</i> cặp lần chạy để so là chọn mẫu — qua 16 lần, pipe trải <b>518–3 969</b> MB/s và bộ nhớ chia sẻ trải <b>4 826–11 874</b> MB/s, hai dải này gần như không giao nhau',
        'Nêu được nguyên nhân dao động: WSL2 chia CPU với Windows, không có bảo đảm thời gian thực; jitter <b>7,7×</b> với pipe so với <b>2,5×</b> với bộ nhớ chia sẻ',
        'Trình đúng con số phản bác: <b>số syscall</b> — 2 001 cho pipe so với <b>1</b> cho bộ nhớ chia sẻ trên 1000 khối, đo bằng <code>strace -f -c -e trace=read,write</code>',
        'Nói rõ vì sao con số đó thuyết phục hơn: nó do <b>mã nguồn</b> quyết định, không do tải máy, nên chạy lại bao nhiêu lần cũng ra đúng như vậy',
        'Không kết luận ngược lại rằng "phải dùng bộ nhớ chia sẻ" — nếu 3 000 MB/s đã dư cho bài toán thì pipe vẫn là lựa chọn đúng, chỉ là <i>lý do</i> phải khác'
      ],
      sol: 'Chỗ hỏng: đồng nghiệp đang so <b>hai mẫu ngẫu nhiên</b> rồi coi tỉ số giữa chúng ' +
           'là một hằng số của hệ thống. Cả bốn cột trong bảng đều sinh ra từ một cái đồng hồ, ' +
           'và MB/s với µs/khối chỉ là hai cách viết của cùng một phép đo — thấy chúng "đồng ý ' +
           'với nhau" không phải là hai bằng chứng độc lập.\n\n' +
           'Qua 16 lần chạy, pipe cho từ 518 tới 3 969 MB/s. Nghĩa là chỉ cần bốc đúng lần chạy ' +
           'tệ nhất của bộ nhớ chia sẻ (4 826) và lần tốt nhất của pipe (3 969), tôi "chứng ' +
           'minh" được chúng ngang nhau; bốc ngược lại thì "chứng minh" được chênh 23 lần. Cả ' +
           'hai đều là số thật, cả hai đều vô nghĩa. Nguyên nhân là WSL2 chia CPU với Windows: ' +
           'các cơ chế phải đi qua nhân chịu jitter 7,7 lần, còn bộ nhớ chia sẻ chỉ 2,5 lần vì ' +
           'nó gần như không phụ thuộc bộ lập lịch.\n\n' +
           'Con số tôi sẽ trình là <b>số syscall</b>: 2 001 cho pipe (1001 lần <code>read</code> ' +
           '+ 1000 lần <code>write</code>) so với <b>1</b> cho bộ nhớ chia sẻ, trên cùng 1000 ' +
           'khối. Đây là con số <i>đếm</i> chứ không phải <i>đo</i> — nó suy ra được từ mã ' +
           'nguồn trước cả khi chạy, và chạy lại lúc nào cũng đúng như thế.\n\n' +
           'Nhưng lưu ý: điều này <i>không</i> tự động kết luận phải chọn bộ nhớ chia sẻ. Nếu ' +
           'bài toán chỉ cần 50 MB/s thì cả hai đều thừa, và pipe thắng vì nó tự đồng bộ. Cái ' +
           'sai của đồng nghiệp là <i>lý do</i>, không nhất thiết là <i>kết luận</i>.' },

    { id: 'b2', k: 'free', tag: 'Đọc output', rows: 7, truc: 1,
      q: 'Chương trình <code>forgot_pshared</code> tạo mutex trong vùng nhớ chia sẻ nhưng quên ' +
         'gọi <code>pthread_mutexattr_setpshared</code>. Nó in ra output dưới đây. Hãy giải ' +
         'thích <b>vì sao có tới hai triệu chứng khác nhau</b> trong cùng một lần chạy, và ' +
         'chúng nói gì về cách mutex được cài đặt.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: 'Fatal glibc error: pthread_mutex_lock.c:88 (___pthread_mutex_lock): assertion failed: mutex->__data.__owner == 0\n' +
                'expected 400000, actual 217666' }
      ],
      hint: 'Một mutex bình thường lưu <i>chủ sở hữu</i> của nó bằng cái gì — và giá trị đó có ' +
            'ý nghĩa như nhau ở hai tiến trình khác nhau không?',
      crit: [
        'Nhận ra mutex chỉ là <b>một cấu trúc dữ liệu trong bộ nhớ</b> — đặt nó vào vùng chia sẻ thì cả hai tiến trình <i>đều nhìn thấy</i> nó, đó không phải chỗ hỏng',
        'Chỉ ra chỗ hỏng: mặc định là <code>PTHREAD_PROCESS_PRIVATE</code>, nên glibc giả định mọi người tranh chấp đều nằm trong <b>cùng một</b> không gian địa chỉ',
        'Giải thích trường <code>__owner</code>: nó lưu một định danh chỉ có ý nghĩa <i>bên trong</i> một tiến trình, nên tiến trình kia diễn giải sai và assertion nổ',
        'Giải thích vì sao vẫn ra một con số (<b>217 666</b>) chứ không dừng hẳn: chỉ <i>một</i> tiến trình chết vì assertion, tiến trình còn lại vẫn chạy tiếp tới hết',
        'Nêu được điều nguy hiểm nhất: nếu glibc <i>không</i> có assertion đó thì lỗi này sẽ im lặng hoàn toàn và chỉ hiện ra dưới dạng số liệu sai',
        'Nêu đúng cách sửa: <code>pthread_mutexattr_init</code> → <code>pthread_mutexattr_setpshared(&amp;attr, PTHREAD_PROCESS_SHARED)</code> → <code>pthread_mutex_init(mtx, &amp;attr)</code>, và bản thân mutex phải nằm <i>trong</i> vùng chia sẻ'
      ],
      sol: 'Hai triệu chứng đến từ hai tiến trình khác nhau, và đó chính là manh mối.\n\n' +
           'Một mutex không phải phép màu của nhân — nó là một cấu trúc dữ liệu bình thường ' +
           '(<code>pthread_mutex_t</code>) với vài trường bên trong, trong đó có ' +
           '<code>__owner</code>. Đặt nó vào vùng <code>MAP_SHARED</code> là đủ để cả hai tiến ' +
           'trình <i>nhìn thấy</i> cùng các byte đó. Vấn đề không nằm ở tầm nhìn.\n\n' +
           'Vấn đề là thuộc tính mặc định <code>PTHREAD_PROCESS_PRIVATE</code>. Với nó, glibc ' +
           'được phép giả định mọi bên tranh chấp đều ở trong cùng một không gian địa chỉ, và ' +
           'nó tận dụng giả định đó để chạy nhanh hơn — trong đó có việc lưu vào ' +
           '<code>__owner</code> một định danh chỉ có nghĩa <i>bên trong</i> một tiến trình. ' +
           'Khi tiến trình thứ hai đọc trường ấy, nó thấy một giá trị không giải thích được và ' +
           'assertion ở <code>pthread_mutex_lock.c:88</code> nổ.\n\n' +
           'Tiến trình bị assertion chết ngay. Tiến trình còn lại không biết gì, chạy tiếp và ' +
           'in ra <code>actual 217666</code>. Đó là lý do bạn thấy cả lỗi <i>và</i> kết quả ' +
           'trong cùng một output.\n\n' +
           'Điều đáng sợ nhất ở đây không phải cái assertion — mà là việc nó <i>có mặt</i> chỉ ' +
           'vì glibc tử tế. Không có nó, sai lầm này sẽ hoàn toàn im lặng, và triệu chứng duy ' +
           'nhất là những con số hơi lệch mà không ai giải thích được. Sửa: khai báo ' +
           '<code>pthread_mutexattr_t attr</code>, gọi <code>pthread_mutexattr_init</code>, ' +
           '<code>pthread_mutexattr_setpshared(&amp;attr, PTHREAD_PROCESS_SHARED)</code>, rồi ' +
           'mới <code>pthread_mutex_init</code> — và nhớ để bản thân mutex nằm trong vùng chia ' +
           'sẻ, cùng vòng đời với dữ liệu mà nó bảo vệ.' },

    { id: 'b3', k: 'free', tag: 'Giải thích vì sao', rows: 6, truc: 2,
      q: 'Bốn cơ chế trong bài để lại dấu vết ở ba nơi khác nhau trên hệ thống tập tin: ' +
         '<code>/dev/shm/</code>, <code>/dev/mqueue/</code> và <code>/run/</code>. Giải thích ' +
         '<b>vì sao</b> chúng được thiết kế để tồn tại lâu hơn tiến trình tạo ra chúng, thay vì ' +
         'biến mất như một mô tả file bị đóng. Nêu một tình huống mà tính chất này là <i>tính ' +
         'năng</i>, và một tình huống mà nó là <i>tai hoạ</i>.',
      hint: 'Nếu đối tượng biến mất ngay khi người tạo thoát, thì hai tiến trình muốn gặp nhau ' +
            'phải thoả thuận điều gì? Và nếu một bên khởi động lại thì sao?',
      crit: [
        'Nêu đúng bản chất: chúng là <b>tên trong một không gian tên</b>, giống file — vòng đời gắn với cái tên, không gắn với tiến trình',
        'Giải thích lợi ích: nhờ vậy hai tiến trình <b>không cần chạy cùng lúc</b>, không cần họ hàng, và bên khởi động lại vẫn tìm được kênh cũ',
        'Nêu đúng cặp gọi: <code>*_open</code> tạo tên, chỉ <code>*_unlink</code> mới xoá tên — <code>close</code> chỉ bỏ tham chiếu của riêng mình',
        'Nêu một tình huống tính năng: ví dụ dịch vụ đọc cảm biến khởi động lại mà tiến trình ghi log không phải khởi động theo, hoặc dữ liệu còn nguyên để chẩn đoán sau sự cố',
        'Nêu một tình huống tai hoạ: rò rỉ tích luỹ trên thiết bị nhúng — mỗi lần khởi động lại để lại một vùng, <code>/dev/shm</code> nằm trên tmpfs nên <b>ăn thẳng vào RAM</b>',
        'Nêu được cách phòng: <code>*_unlink</code> ở <b>cả hai</b> đầu vòng đời (lúc tắt và lúc khởi động), vì <code>SIGKILL</code> vô hiệu hoá lớp thứ nhất'
      ],
      sol: 'Lý do gốc: những đối tượng này là <b>tên trong một không gian tên</b>, không phải ' +
           'tài nguyên riêng của một tiến trình. Vòng đời gắn với cái tên. Cặp gọi phản ánh ' +
           'đúng điều đó: <code>shm_open</code> / <code>mq_open</code> / <code>sem_open</code> ' +
           'tạo tên, và chỉ <code>shm_unlink</code> / <code>mq_unlink</code> / ' +
           '<code>sem_unlink</code> mới xoá được nó. <code>close</code> chỉ bỏ tham chiếu của ' +
           'riêng bạn — y hệt file thường: đóng file không xoá file.\n\n' +
           'Nếu thiết kế ngược lại, IPC có tên sẽ mất hết ý nghĩa. Hai tiến trình muốn gặp nhau ' +
           'sẽ phải khởi động đồng thời và không bên nào được phép khởi động lại. Chính vì đối ' +
           'tượng kiên trì mà một dịch vụ có thể sập, được systemd bật lại, và tìm thấy nguyên ' +
           'vẹn kênh cũ.\n\n' +
           '<b>Là tính năng:</b> tiến trình đọc cảm biến crash lúc 3 giờ sáng. systemd bật lại ' +
           'nó. Vùng <code>/dev/shm/sensor_data</code> vẫn còn, tiến trình ghi log chưa hề biết ' +
           'có chuyện gì, không mất một mẫu nào. Thêm nữa, dữ liệu cuối cùng vẫn nằm đó để bạn ' +
           '<code>hexdump</code> ra mà chẩn đoán.\n\n' +
           '<b>Là tai hoạ:</b> daemon tạo vùng 4 MB mỗi lần khởi động, tên có kèm PID, và ' +
           'không bao giờ <code>unlink</code>. Watchdog bật lại nó vài lần mỗi ngày. ' +
           '<code>/dev/shm</code> nằm trên tmpfs, tức <b>ăn thẳng vào RAM</b>. Trên một board ' +
           '512 MB, vài tuần là hết bộ nhớ — mà <code>ps</code> thì sạch bong, vì không tiến ' +
           'trình nào đang giữ chỗ đó cả.\n\n' +
           'Phòng bệnh phải có hai lớp, và lớp thứ hai mới là lớp thật: ' +
           '<code>*_unlink</code> trong tay xử lý <code>SIGTERM</code>, <b>và</b> ' +
           '<code>*_unlink</code> ngay lúc khởi động trước khi tạo mới. Lớp một vô dụng trước ' +
           '<code>kill -9</code> và trước mất điện; lớp hai sống sót qua cả hai.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp', rows: 6,
      q: 'pipe vô danh và FIFO. Trong phép đo của bài, chúng cho <b>3 044</b> và <b>2 216</b> ' +
         'MB/s — chênh chưa tới 1,4 lần, và cả hai đều dao động rộng hơn khoảng cách đó. Vậy ' +
         'khi phải chọn giữa hai cái, tiêu chí thật sự là gì? Nêu <b>ba</b> khác biệt có ảnh ' +
         'hưởng tới thiết kế, và với mỗi cái, một tình huống mà nó quyết định lựa chọn.',
      hint: 'Cả hai đều là cùng một bộ đệm vòng trong nhân. Khác biệt duy nhất ở tầng dưới là ' +
            'cách <i>tìm ra</i> nó. Từ khác biệt đó suy ra được cả ba hệ quả.',
      crit: [
        'Nói rõ tốc độ <b>không phải</b> tiêu chí — hai dải đo chồng lên nhau, và cả hai đều là bộ đệm vòng của nhân với cùng cách hoạt động',
        'Khác biệt 1 — <b>quan hệ họ hàng</b>: pipe truyền qua <code>fork</code> nên chỉ dùng được giữa cha–con; FIFO có tên nên hai chương trình xa lạ dùng được',
        'Khác biệt 2 — <b>quyền truy cập</b>: FIFO là một mục trên hệ thống tập tin nên có chủ sở hữu, nhóm và bit quyền (<code>prw-r--r--</code>); pipe không có bề mặt nào để đặt chính sách',
        'Khác biệt 3 — <b>dọn dẹp và vòng đời</b>: pipe biến mất khi mọi mô tả file đóng; FIFO phải <code>unlink</code> thủ công, đổi lại nó chờ được người dùng tới sau',
        'Có ít nhất một tình huống cụ thể cho mỗi khác biệt',
        'Nêu được điểm chung dễ quên: <code>open</code> trên FIFO <b>chặn</b> cho tới khi phía kia mở — hành vi mà pipe không có, và là nguyên nhân của nhiều vụ "treo lúc khởi động"'
      ],
      sol: 'Trước hết, gạt tốc độ ra: 3 044 so với 2 216 MB/s nghe như một khác biệt, nhưng ' +
           'qua 16 lần chạy pipe trải 518–3 969 và FIFO trải 447–3 105 — hai dải chồng lên nhau ' +
           'gần hết. Bên dưới chúng là <i>cùng một</i> bộ đệm vòng trong nhân; khác biệt duy ' +
           'nhất là cách tìm ra nó.\n\n' +
           '<b>1. Quan hệ họ hàng.</b> pipe không có tên, nên cách duy nhất để bên thứ hai có ' +
           'được nó là thừa hưởng mô tả file qua <code>fork</code>. FIFO có một đường dẫn, nên ' +
           'bất kỳ ai biết đường dẫn đó đều mở được. <i>Tình huống:</i> tiến trình thu dữ liệu ' +
           'và tiến trình ghi log do systemd khởi động độc lập, không bên nào là cha bên nào — ' +
           'pipe hết cửa, chỉ còn FIFO.\n\n' +
           '<b>2. Quyền truy cập.</b> FIFO là một mục trên hệ thống tập tin, nên nó có ' +
           '<code>prw-r--r-- 1 shinarus shinarus</code> — chủ sở hữu, nhóm, bit quyền. Bạn đặt ' +
           'được chính sách "chỉ nhóm <code>sensor</code> mới được ghi". pipe không có bề mặt ' +
           'nào để gắn chính sách. <i>Tình huống:</i> một dịch vụ chạy dưới người dùng ít đặc ' +
           'quyền chỉ được phép <i>đọc</i> luồng dữ liệu, tuyệt đối không được chèn dữ liệu ' +
           'giả.\n\n' +
           '<b>3. Dọn dẹp và vòng đời.</b> pipe tự biến mất khi mô tả file cuối cùng đóng — ' +
           'không rò rỉ được. FIFO tồn tại tới khi có người <code>unlink</code>, nên nó là một ' +
           'thứ bạn phải nhớ dọn; đổi lại nó chờ được người dùng tới sau. <i>Tình huống:</i> ' +
           'một chương trình chạy đi chạy lại nhiều lần trong ngày — với FIFO bạn phải quyết ' +
           'định ai tạo, ai xoá, và điều gì xảy ra nếu file cũ còn sót lại.\n\n' +
           'Một điểm chung dễ quên: <code>open</code> trên FIFO <b>chặn</b> cho tới khi đầu kia ' +
           'mở. Đó là tính năng tự đồng bộ, nhưng nếu không biết thì triệu chứng là "chương ' +
           'trình treo lúc khởi động và không in gì cả" — và ' +
           '<code>O_NONBLOCK</code> chỉ cứu được phía đọc, phía ghi sẽ nhận ' +
           '<code>ENXIO</code>.' },

    { id: 'b5', k: 'multi', tag: 'Bắt lỗi phát biểu',
      q: 'Một bản thiết kế cho thiết bị nhúng viết như dưới đây. Chọn <b>tất cả</b> những câu ' +
         'chứa lỗi kỹ thuật.',
      opts: [
        '"Đặt <code>mq_maxmsg = 1000</code> để hàng đợi chịu được lúc dồn tải" — trên máy này <code>msg_max</code> mặc định là <b>10</b>, nên <code>mq_open</code> sẽ hỏng với <code>EINVAL</code>',
        '"Bên nhận cấp <code>char buf[64]</code> vì thông điệp của ta chỉ dài 32 byte" — <code>mq_receive</code> đòi bộ đệm ít nhất bằng <code>mq_msgsize</code> (mặc định <b>8192</b>), nếu không thì <code>EMSGSIZE</code>',
        '"Thông điệp ưu tiên cao chen lên trước thông điệp đang chờ" — đúng như bài đã đo: gói ưu tiên 9 gửi <i>sau</i> nhưng được nhận <i>trước</i>',
        '"Hàng đợi giữ dữ liệu qua lần khởi động lại của tiến trình" — đúng, <code>/dev/mqueue/alert_queue</code> vẫn còn với kích thước 80 byte và <code>QSIZE:71</code>',
        '"Vì hàng đợi nằm trong nhân nên nó nhanh hơn pipe" — thực tế nó là cơ chế <b>chậm nhất</b> trong bốn cái đo được, 1 958 so với 3 044 MB/s',
        '"Tăng <code>msg_max</code> lên được bằng cách ghi vào <code>/proc/sys/fs/mqueue/msg_max</code>, cần quyền root" — đúng'
      ],
      a: [0, 1, 4],
      why: '<p>Ba câu sai là ba lỗi <i>khác loại</i>, và đó là điều đáng học:</p>' +
           '<ul>' +
           '<li><b>Câu 1 — vượt giới hạn hệ thống.</b> <code>msg_max</code> mặc định là ' +
           '<b>10</b>, <code>msgsize_max</code> là <b>8192</b>, <code>queues_max</code> là ' +
           '<b>256</b>. Xin 1000 thì <code>mq_open</code> trả <code>EINVAL</code> ngay. Lỗi ' +
           'này <i>tốt</i>: nó nổ lúc khởi động, ngay dòng đầu, không thể bỏ sót.</li>' +
           '<li><b>Câu 2 — nhầm "thông điệp dài bao nhiêu" với "bộ đệm phải to bao nhiêu".</b> ' +
           '<code>mq_receive</code> từ chối nếu bộ đệm nhỏ hơn <code>mq_msgsize</code> của hàng ' +
           'đợi, bất kể thông điệp thật dài bao nhiêu. Với mặc định 8192, ' +
           '<code>char buf[64]</code> luôn hỏng với <code>EMSGSIZE</code>. Cách viết đúng: gọi ' +
           '<code>mq_getattr</code> rồi <code>malloc(attr.mq_msgsize)</code> — đừng bao giờ đoán ' +
           'con số này.</li>' +
           '<li><b>Câu 5 — lý luận sai <i>và</i> kết luận sai.</b> "Nằm trong nhân" không phải ' +
           'lý do để nhanh; pipe và FIFO cũng nằm trong nhân. Hàng đợi thông điệp làm nhiều ' +
           'việc hơn (ranh giới gói, ưu tiên, siêu dữ liệu) nên nó là cơ chế chậm nhất trong ' +
           'bốn cái: 1 958 MB/s, 2,00 µs mỗi khối. Bạn chọn nó khi cần <i>thứ tự</i>, không ' +
           'phải khi cần tốc độ.</li>' +
           '</ul>' +
           '<p>Ba câu còn lại đều đúng. Câu 3 và 4 lặp lại đúng những gì đo được trong bài; câu ' +
           '6 là cách nới giới hạn hợp lệ, nhưng nhớ rằng nó chỉ có hiệu lực tới lần khởi động ' +
           'lại tiếp theo trừ khi bạn ghi vào <code>/etc/sysctl.d/</code>.</p>' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: 'Một đồng nghiệp bỏ lời gọi <code>ftruncate</code> giữa <code>shm_open</code> và ' +
         '<code>mmap</code>, lý do: <i>"Kích thước đã có trong tham số <code>length</code> của ' +
         '<code>mmap</code> rồi, gọi hai lần làm gì."</i> Chương trình biên dịch sạch, ' +
         '<code>mmap</code> trả về một địa chỉ hợp lệ, rồi chết bằng <b>Bus error</b> ở lần ghi ' +
         'đầu tiên. Giải thích vì sao — và vì sao triệu chứng lại là <code>SIGBUS</code> chứ ' +
         'không phải <code>SIGSEGV</code>.',
      hint: 'Một vùng nhớ chia sẻ POSIX thực chất là một file trên tmpfs. Một file vừa được tạo ' +
            'ra thì dài bao nhiêu byte? Và <code>mmap</code> ánh xạ cái gì vào đâu?',
      crit: [
        'Nói đúng <code>shm_open</code> tạo ra một file <b>dài 0 byte</b> trên <code>/dev/shm</code>',
        'Phân biệt được hai vai trò: <code>length</code> của <code>mmap</code> khai báo <b>cửa sổ địa chỉ ảo</b>; <code>ftruncate</code> mới cấp <b>chỗ chứa thật</b> cho file',
        'Giải thích vì sao <code>mmap</code> vẫn thành công: nó chỉ dựng ánh xạ, chưa hề chạm vào trang nào — lỗi bị hoãn tới lần truy cập đầu tiên',
        'Phân biệt đúng <code>SIGBUS</code> với <code>SIGSEGV</code>: SEGV là địa chỉ <b>không được ánh xạ</b>; BUS là địa chỉ <b>đã được ánh xạ</b> nhưng không có nội dung sao lưu phía sau',
        'Nêu được cách xác minh: <code>ls -l /dev/shm/</code> phải thấy đúng kích thước (ví dụ <code>48</code>), thấy <code>0</code> là biết ngay thiếu <code>ftruncate</code>',
        'Nói được vì sao lỗi này khó chịu: nó không hiện lúc biên dịch, không hiện ở giá trị trả về của <code>mmap</code>, chỉ hiện lúc chạy — và chỉ ở tiến trình <i>tạo</i> vùng'
      ],
      sol: '<code>shm_open</code> tạo ra một file trên tmpfs, và file mới tạo dài <b>0 byte</b>. ' +
           'Đó là toàn bộ câu chuyện.\n\n' +
           'Tham số <code>length</code> của <code>mmap</code> và <code>ftruncate</code> nói về ' +
           'hai thứ khác nhau, chỉ tình cờ nhận cùng một con số. <code>length</code> khai báo ' +
           '<i>cửa sổ trong không gian địa chỉ ảo</i> của bạn — "hãy dành cho tôi 48 byte địa ' +
           'chỉ để nhìn vào file này". <code>ftruncate</code> mới là lời yêu cầu <i>cấp chỗ ' +
           'chứa thật</i> cho file. Xin một cửa sổ nhìn vào một file rỗng thì cửa sổ vẫn dựng ' +
           'được — chỉ là phía sau nó không có gì.\n\n' +
           'Vì thế <code>mmap</code> trả về địa chỉ hợp lệ (kiểu ' +
           '<code>0x7ceb34afa000</code>). Nó chỉ ghi vào bảng trang, chưa chạm tới byte nào. ' +
           'Lỗi bị hoãn tới lần đầu bạn thật sự truy cập.\n\n' +
           'Và lúc đó tín hiệu là <code>SIGBUS</code>, không phải <code>SIGSEGV</code> — khác ' +
           'biệt này chính là manh mối chẩn đoán:\n' +
           '<ul>' +
           '<li><code>SIGSEGV</code>: bạn chạm vào một địa chỉ <b>không được ánh xạ</b>. Con ' +
           'trỏ hỏng, tràn mảng, dùng bộ nhớ đã giải phóng.</li>' +
           '<li><code>SIGBUS</code>: địa chỉ <b>đã được ánh xạ</b> hợp lệ, nhưng nhân không tìm ' +
           'ra nội dung để đặt vào trang đó — bạn đang nhìn quá đuôi file.</li>' +
           '</ul>' +
           'Nên khi gặp <code>SIGBUS</code> ngay sau một <code>mmap</code>, hãy nghĩ tới kích ' +
           'thước file trước tiên. Xác minh trong một giây: <code>ls -l /dev/shm/</code>. Thấy ' +
           '<code>-rw------- 1 shinarus shinarus 48 … sensor_data</code> là ổn; thấy ' +
           '<code>0</code> là biết ngay thiếu <code>ftruncate</code>.\n\n' +
           'Điều làm lỗi này khó chịu: nó không hiện lúc biên dịch, không hiện ở giá trị trả ' +
           'về, và chỉ tiến trình <i>tạo</i> vùng mới gặp — tiến trình gắn vào sau đó thấy file ' +
           'đã đủ kích thước nên chạy bình thường.' }
  ],

  C: [
    { id: 'c1', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 9, truc: 0,
      q: 'Bạn phải chọn cơ chế cho một liên kết mới trên thiết bị: <b>gói 2 KB, 200 lần mỗi ' +
         'giây</b>, từ tiến trình đọc cảm biến sang tiến trình gửi mạng. Trưởng nhóm yêu cầu ' +
         '"đo rồi báo cáo". Hãy (a) tính lưu lượng cần thiết, (b) đối chiếu với số liệu của ' +
         'bài để chọn, và (c) viết <b>hai câu</b> biện minh mà bạn dám bảo vệ trong một buổi ' +
         'review — trong đó ít nhất một câu dựa trên đại lượng <i>không</i> dao động giữa các ' +
         'lần chạy.',
      hint: 'Tính ra MB/s trước, rồi so với dải <i>thấp nhất</i> đã đo được chứ không phải giá ' +
            'trị trung bình. Sau đó tự hỏi: nếu người review chạy lại bench và ra số khác, câu ' +
            'biện minh của bạn có còn đứng được không?',
      crit: [
        'Tính đúng lưu lượng: 2 KB × 200 = <b>400 KB/s ≈ 0,4 MB/s</b>',
        'So với dải đo <b>thấp nhất</b> chứ không phải trung bình: pipe tệ nhất trong 16 lần vẫn là <b>518 MB/s</b> — dư hơn 1 200 lần',
        'Kết luận đúng: chọn pipe (hoặc FIFO nếu hai tiến trình không họ hàng); bộ nhớ chia sẻ ở đây là tối ưu hoá vô ích và mua thêm nghĩa vụ đồng bộ',
        'Nhắc tới ràng buộc <b>quan hệ họ hàng</b> như tiêu chí thật sự phân định pipe với FIFO, không phải tốc độ',
        'Có ít nhất một câu biện minh dựa trên đại lượng <b>đếm được</b>: 2 001 syscall cho 1000 gói, tức khoảng <b>400 syscall/giây</b> ở tần suất này — một con số vô nghĩa với CPU hiện đại',
        'Nói rõ vì sao câu biện minh đó bền: nó suy ra từ mã nguồn, nên người review chạy lại bench ra số khác cũng không lật được nó',
        'Cân nhắc tới cái giá của lựa chọn kia: bộ nhớ chia sẻ đòi mutex <code>PROCESS_SHARED</code>, đòi dọn dẹp lúc khởi động, và mất khả năng tự đồng bộ — đổi lấy một tốc độ không ai cần',
        'Nếu có nêu <code>PIPE_BUF</code>: đúng, gói 2 KB &lt; 4 096 nên mỗi lần ghi là nguyên tử, kể cả khi sau này có thêm bên ghi thứ hai'
      ],
      sol: '<b>(a) Lưu lượng.</b> 2 KB × 200/s = 400 KB/s, tức khoảng <b>0,4 MB/s</b>.\n\n' +
           '<b>(b) Đối chiếu.</b> Không lấy giá trị trung bình — lấy giá trị <i>tệ nhất</i> đã ' +
           'đo được, vì đó mới là thứ phải chịu được. Qua 16 lần chạy, lần tệ nhất của pipe là ' +
           '<b>518 MB/s</b>. Ta cần 0,4. Dư <b>hơn 1 200 lần</b>. Ngay cả hàng đợi thông điệp, ' +
           'cơ chế chậm nhất, tệ nhất cũng còn 965 MB/s.\n\n' +
           'Nghĩa là <i>mọi</i> cơ chế trong bài đều thừa sức. Tốc độ đã bị loại khỏi danh sách ' +
           'tiêu chí. Cái còn lại là: hai tiến trình có quan hệ cha–con không? Có ' +
           '(<code>fork</code>) thì pipe; không (systemd khởi động độc lập) thì FIFO. Bộ nhớ ' +
           'chia sẻ bị loại — nó chỉ xứng đáng khi hội đủ dữ liệu lớn, tần suất dày và cần trễ ' +
           'ổn định; ở đây không có điều nào.\n\n' +
           '<b>(c) Hai câu biện minh.</b>\n\n' +
           '<i>"Liên kết này cần 0,4 MB/s. Lần chạy tệ nhất trong 16 lần đo của pipe là 518 ' +
           'MB/s, tức biên an toàn hơn ba bậc độ lớn — nên tốc độ không phải tiêu chí chọn ở ' +
           'đây."</i>\n\n' +
           '<i>"Ở 200 gói mỗi giây, pipe tốn khoảng 400 syscall mỗi giây — con số này suy ra ' +
           'từ mã nguồn (2 001 syscall cho 1000 gói) chứ không phải từ một lần chạy bench, nên ' +
           'nó đúng bất kể máy đang tải thế nào. Đổi lấy bộ nhớ chia sẻ là mua thêm mutex ' +
           'PROCESS_SHARED và nghĩa vụ dọn dẹp lúc khởi động, để tiết kiệm một thứ ta không ' +
           'thiếu."</i>\n\n' +
           'Câu thứ hai mới là câu đáng giá. Nếu bạn chỉ nói "bench cho thấy pipe đủ nhanh", ' +
           'người review chạy lại và ra 518 MB/s thay vì 3 044 sẽ hỏi ngay "sao lần này khác?" ' +
           '— và bạn không có gì để trả lời. Con số đếm được thì không có chuyện đó.\n\n' +
           'Một điểm cộng nếu bạn nghĩ ra: gói 2 KB nhỏ hơn <code>PIPE_BUF</code> (4 096), nên ' +
           'mỗi lần ghi là nguyên tử — nếu sau này có thêm một nguồn cảm biến thứ hai ghi vào ' +
           'cùng liên kết, các gói vẫn không bị xé trộn.' },

    { id: 'c2', k: 'free', tag: 'Tình huống mới', rows: 9, truc: 1,
      q: 'Đổi bối cảnh: một board ARM 512 MB RAM, camera cho <b>khung hình 2 MB ở 30 fps</b> ' +
         '(60 MB/s), tiến trình thu đẩy sang tiến trình mã hoá. Lần này bộ nhớ chia sẻ ' +
         '<i>thật sự</i> xứng đáng. Hãy thiết kế: (a) vùng chia sẻ chứa những gì, (b) đồng bộ ' +
         'bằng cách nào và tại sao không thể bỏ qua, (c) nêu <b>hai</b> thứ có thể hỏng mà ' +
         'không hề hỏng nếu bạn dùng pipe.',
      hint: 'Ở 60 MB/s bạn không được phép sao chép khung hình thêm lần nào. Vậy tiến trình mã ' +
            'hoá làm sao biết khung hình <i>nào</i> đã sẵn sàng, mà không hỏi liên tục?',
      crit: [
        'Thiết kế vùng chứa nhiều hơn một khung hình — vòng đệm vài slot, để bên thu ghi slot sau trong khi bên mã hoá còn đọc slot trước',
        'Đặt <b>siêu dữ liệu ngay trong vùng chia sẻ</b>: chỉ số slot đang ghi, số thứ tự khung, dấu thời gian, cờ sẵn sàng — không dùng biến toàn cục của từng tiến trình',
        'Đồng bộ bằng mutex <code>PTHREAD_PROCESS_SHARED</code> đặt <b>bên trong</b> vùng chia sẻ, cùng vòng đời với dữ liệu nó bảo vệ',
        'Có cơ chế báo hiệu, không quay vòng hỏi: <code>pthread_cond_t</code> cũng đặt <code>PROCESS_SHARED</code>, hoặc semaphore POSIX, hoặc một pipe nhỏ chỉ để gửi tín hiệu 1 byte',
        'Nêu rõ vì sao không bỏ qua được đồng bộ: nhân đã rút lui khỏi đường truyền dữ liệu, nên nó cũng không còn tuần tự hoá gì hộ bạn — đúng như <code>race_unsafe</code> mất 127 354 tới 196 835 trên 400 000',
        'Hỏng 1 — <b>khung hình xé đôi</b>: bên mã hoá đọc một slot mà bên thu đang ghi dở, ra ảnh nửa cũ nửa mới; với pipe điều này không xảy ra vì dữ liệu chỉ hiện ra sau khi ghi xong',
        'Hỏng 2 — <b>rò rỉ hoặc kẹt cứng</b>: tiến trình chết giữa lúc giữ mutex thì mutex kẹt vĩnh viễn (cân nhắc <code>PTHREAD_MUTEX_ROBUST</code>), và vùng nhớ ở lại trong <code>/dev/shm</code> ăn RAM của board 512 MB',
        'Có ước lượng bộ nhớ: mỗi slot 2 MB, ví dụ 4 slot = 8 MB trên tổng 512 MB — chấp nhận được, nhưng không thể để rò rỉ tích luỹ'
      ],
      sol: '<b>(a) Vùng chia sẻ.</b> Không phải một khung hình mà là một <b>vòng đệm</b> vài ' +
           'slot — 4 slot × 2 MB = 8 MB là hợp lý trên board 512 MB. Nhờ đó bên thu ghi slot ' +
           'kế tiếp trong khi bên mã hoá còn đang đọc slot trước, không ai phải đợi ai.\n\n' +
           'Ngay đầu vùng, trước vùng dữ liệu, đặt một khối siêu dữ liệu: chỉ số slot đang ghi, ' +
           'số thứ tự khung, dấu thời gian, cờ "slot này đã sẵn sàng". Tất cả phải nằm ' +
           '<i>trong</i> vùng chia sẻ — biến toàn cục của một tiến trình thì tiến trình kia ' +
           'không nhìn thấy.\n\n' +
           '<b>(b) Đồng bộ.</b> Một <code>pthread_mutex_t</code> với ' +
           '<code>PTHREAD_PROCESS_SHARED</code>, đặt ngay trong vùng, bảo vệ khối siêu dữ liệu ' +
           '(không phải bảo vệ 2 MB dữ liệu — chỉ giữ khoá trong vài chục nano giây để đổi chỉ ' +
           'số slot). Thêm một cơ chế báo hiệu để bên mã hoá không phải quay vòng hỏi: ' +
           '<code>pthread_cond_t</code> cũng đặt <code>PROCESS_SHARED</code>, hoặc đơn giản hơn ' +
           'là một pipe nhỏ chỉ dùng để gửi 1 byte "có khung mới".\n\n' +
           'Không bỏ qua được, vì lý do rất cụ thể: bốn cơ chế kia tự đồng bộ nhờ nhân nằm trên ' +
           'đường đi của từng byte. Bạn chọn bộ nhớ chia sẻ <i>chính vì</i> muốn nhân rút lui — ' +
           'và khi nó rút lui, nó mang theo cả việc tuần tự hoá. MMU vẫn canh gác, nhưng nó chỉ ' +
           'ngăn bạn chạm vào vùng chưa được ánh xạ; vùng đã ánh xạ chung thì nó không có ý ' +
           'kiến. <code>race_unsafe</code> đã chứng minh: ba lần chạy mất 127 354, 195 854, ' +
           '196 835 trên 400 000.\n\n' +
           '<b>(c) Hai thứ hỏng mà pipe không bao giờ hỏng.</b>\n\n' +
           '<i>1. Khung hình xé đôi.</i> Bên mã hoá đọc slot 2 đúng lúc bên thu đang ghi đè ' +
           'slot 2 — nửa trên là khung mới, nửa dưới là khung cũ. Không crash, không log, chỉ ' +
           'là ảnh sai, thỉnh thoảng. Với pipe điều này bất khả: dữ liệu chỉ xuất hiện với bên ' +
           'đọc sau khi bên ghi đã ghi xong.\n\n' +
           '<i>2. Kẹt cứng và rò rỉ.</i> Tiến trình thu bị <code>SIGKILL</code> đúng lúc đang ' +
           'giữ mutex — mutex kẹt vĩnh viễn, bên mã hoá đợi mãi (cân nhắc ' +
           '<code>PTHREAD_MUTEX_ROBUST</code>). Và 8 MB trong <code>/dev/shm</code> ở lại, ăn ' +
           'RAM của board cho tới lần khởi động sau. Với pipe, mọi thứ biến mất khi mô tả file ' +
           'cuối cùng đóng — không có gì để kẹt và không có gì để rò rỉ.\n\n' +
           'Đó là cái giá thật của 60 MB/s. Ở bài toán này nó đáng, vì 60 MB/s qua pipe nghĩa ' +
           'là 2 lần sao chép mỗi khung hình trên một CPU ARM không dư dả. Nhưng đáng không có ' +
           'nghĩa là miễn phí.' },

    { id: 'c3', k: 'free', tag: 'Chẩn đoán', rows: 8, truc: 2,
      q: 'Triệu chứng: một gateway chạy nhiều ngày thì <code>free -m</code> báo bộ nhớ khả ' +
         'dụng tụt đều, khoảng <b>4 MB mỗi ngày</b>. Nhưng <code>ps aux</code> chỉ thấy đúng ' +
         'ba tiến trình dịch vụ như thiết kế, RSS của cả ba đều ổn định, và ' +
         '<code>valgrind</code> chạy trên từng cái đều sạch. Hãy đưa ra <b>giả thuyết</b>, nêu ' +
         '<b>lệnh xác minh</b>, và nói vì sao <code>ps</code> lẫn <code>valgrind</code> đều mù ' +
         'trước loại rò rỉ này.',
      hint: 'Cả <code>ps</code> lẫn <code>valgrind</code> đều nhìn <i>bên trong</i> một tiến ' +
            'trình. Có loại tài nguyên nào tiêu tốn RAM mà không thuộc về tiến trình nào cả ' +
            'không?',
      crit: [
        'Giả thuyết đúng: rò rỉ <b>đối tượng IPC POSIX</b> — vùng nhớ chia sẻ, hàng đợi thông điệp hoặc semaphore không được <code>unlink</code>',
        'Nói đúng vì sao nó ăn RAM: <code>/dev/shm</code> và <code>/dev/mqueue</code> nằm trên <b>tmpfs</b>, tức nội dung nằm thẳng trong RAM',
        'Nói đúng vì sao <code>ps</code> mù: <code>ps</code> liệt kê <i>tiến trình</i>, mà những đối tượng này không thuộc tiến trình nào — chúng sống độc lập sau khi bên tạo đã chết',
        'Nói đúng vì sao <code>valgrind</code> mù: nó theo dõi cấp phát <b>trong heap</b> của một tiến trình; ở đây tiến trình <i>không</i> quên giải phóng gì cả — nó chỉ quên <code>unlink</code> một cái tên trên hệ thống tập tin',
        'Nêu đúng lệnh xác minh: <code>ls -l /dev/shm/</code>, <code>ls -l /dev/mqueue/</code>, <code>ls -l /run/</code> (tìm <code>sem.*</code>), và <code>df -h /dev/shm</code>',
        'Chỉ ra manh mối trong kết quả: nhiều đối tượng cùng tiền tố, tên có kèm PID hoặc dấu thời gian, ngày tạo trải dài — đó là dấu hiệu "mỗi lần khởi động lại để lại một cái"',
        'Suy ra nguyên nhân gốc hợp lý: một dịch vụ bị watchdog hoặc systemd bật lại nhiều lần, chỉ <code>unlink</code> trong tay xử lý <code>SIGTERM</code> nên <code>SIGKILL</code> vô hiệu hoá nó',
        'Nêu đúng cách sửa lâu dài: <code>*_unlink</code> ở <b>cả hai</b> đầu vòng đời — lúc tắt và lúc khởi động, trước khi tạo mới'
      ],
      sol: '<b>Giả thuyết:</b> rò rỉ đối tượng IPC POSIX. Vùng nhớ chia sẻ, hàng đợi thông điệp ' +
           'hoặc semaphore được tạo ra rồi không ai <code>unlink</code>. Chúng nằm trên tmpfs, ' +
           'nên mỗi đối tượng còn sót là RAM còn bị chiếm.\n\n' +
           '<b>Xác minh — bốn lệnh, một phút:</b>\n\n' +
           '<code>ls -l /dev/shm/</code>\n' +
           '<code>ls -l /dev/mqueue/</code>\n' +
           '<code>ls -l /run/ | grep sem</code>\n' +
           '<code>df -h /dev/shm</code>\n\n' +
           'Cái cần tìm không phải "có file" mà là <b>hình thù</b> của danh sách: nhiều mục ' +
           'cùng một tiền tố, tên có kèm PID hoặc dấu thời gian, ngày tạo trải dài qua nhiều ' +
           'ngày. Đó là chữ ký của "mỗi lần khởi động lại để lại một cái". Chia tổng dung lượng ' +
           'cho số ngày, nếu ra xấp xỉ 4 MB/ngày thì bạn đã tìm đúng.\n\n' +
           '<b>Vì sao <code>ps</code> mù.</b> <code>ps</code> liệt kê tiến trình và bộ nhớ ' +
           '<i>của</i> tiến trình. Nhưng đối tượng IPC POSIX không thuộc về tiến trình nào — ' +
           'đó chính là điểm mạnh của chúng, và ở đây là điểm chết. Cái tạo ra chúng đã chết từ ' +
           'lâu; chúng vẫn ở lại. Không có dòng nào trong <code>ps</code> để mà nhìn.\n\n' +
           '<b>Vì sao <code>valgrind</code> mù.</b> Nó theo dõi <code>malloc</code>/' +
           '<code>free</code> trong heap của một tiến trình. Ở đây tiến trình <i>không hề</i> ' +
           'quên giải phóng gì: nó <code>munmap</code> đàng hoàng, <code>close</code> đàng ' +
           'hoàng, thoát sạch sẽ. Cái nó quên là <code>shm_unlink</code> — một lời gọi xoá ' +
           '<i>tên</i> trên hệ thống tập tin, không liên quan gì tới heap. Với ' +
           '<code>valgrind</code>, chương trình này hoàn hảo.\n\n' +
           '<b>Nguyên nhân gốc gần như chắc chắn:</b> một dịch vụ chỉ gọi <code>*_unlink</code> ' +
           'trong tay xử lý <code>SIGTERM</code>, và nó bị watchdog hoặc <code>kill -9</code> ' +
           'kết liễu. <code>SIGKILL</code> không bắt được — tay xử lý không bao giờ chạy.\n\n' +
           '<b>Sửa:</b> giữ nguyên lớp <code>SIGTERM</code>, nhưng thêm lớp thứ hai và đó mới ' +
           'là lớp thật — gọi <code>shm_unlink(TEN)</code> ngay dòng đầu <code>main</code>, ' +
           'trước <code>shm_open</code>. Lớp này sống sót qua <code>SIGKILL</code>, qua mất ' +
           'điện, qua mọi kịch bản mà lớp một bó tay.' },

    { id: 'c4', k: 'free', tag: 'Chẩn đoán', rows: 8,
      q: 'Triệu chứng: một daemon chạy hoàn hảo trên máy phát triển, nhưng trên thiết bị nó ' +
         '<b>treo lúc khởi động</b> — không log dòng nào, không chiếm CPU, không thoát. ' +
         'Nó ghi dữ liệu vào một FIFO. Hãy nêu <b>ít nhất ba</b> nguyên nhân có thể, và với mỗi ' +
         'cái, một cách phân biệt nó với hai cái kia.',
      hint: 'Một trong ba nguyên nhân không phải là lỗi chút nào — đó là hành vi mặc định được ' +
            'thiết kế có chủ ý. Bắt đầu từ đó.',
      crit: [
        'Nguyên nhân 1 — <code>open</code> trên FIFO <b>chặn</b> cho tới khi đầu kia mở; trên máy phát triển bạn luôn chạy tay bên đọc trước nên chưa bao giờ gặp',
        'Nguyên nhân 2 — <b>thứ tự khởi động</b>: trên thiết bị systemd bật hai dịch vụ song song hoặc sai thứ tự, nên bên đọc chưa sẵn sàng',
        'Nguyên nhân 3 — FIFO <b>không tồn tại</b> hoặc sai quyền: <code>open</code> hỏng với <code>ENOENT</code>/<code>EACCES</code>, và nếu mã không kiểm tra giá trị trả về thì triệu chứng có thể trông giống treo',
        'Có nêu ít nhất một cách phân biệt cho mỗi nguyên nhân',
        'Dùng <code>strace -p &lt;pid&gt;</code> hoặc <code>cat /proc/&lt;pid&gt;/stack</code>, hoặc <code>cat /proc/&lt;pid&gt;/wchan</code> — nếu thấy nó đứng trong <code>openat</code> thì đó là nguyên nhân 1 hoặc 2',
        'Dùng <code>ls -l</code> đường dẫn FIFO: không có mục nào → nguyên nhân 3; có <code>prw-…</code> → không phải',
        'Phân biệt 1 với 2 bằng cách mở tay đầu đọc (<code>cat /tmp/&lt;fifo&gt;</code>) — nếu daemon chạy tiếp ngay lập tức thì nó đang đợi người đọc',
        'Nêu được cách sửa đúng cho từng cái: <code>After=</code>/<code>Requires=</code> trong unit systemd, hoặc mở với <code>O_NONBLOCK</code> và thử lại khi gặp <code>ENXIO</code>, hoặc <code>mkfifo</code> lúc cài đặt kèm quyền đúng'
      ],
      sol: '<b>Nguyên nhân 1 — hành vi chặn của <code>open</code>, và đây không phải lỗi.</b>\n' +
           'Mở FIFO để ghi sẽ <i>đứng im</i> cho tới khi có tiến trình mở đầu đọc. Đó là tính ' +
           'năng tự đồng bộ, cố ý. Trên máy phát triển bạn luôn mở một terminal chạy ' +
           '<code>cat</code> trước rồi mới chạy daemon, nên chưa bao giờ thấy. Trên thiết bị ' +
           'không ai làm việc đó hộ bạn.\n\n' +
           '<b>Nguyên nhân 2 — thứ tự khởi động.</b> systemd bật các dịch vụ song song trừ khi ' +
           'bạn nói khác. Bên ghi thắng cuộc đua, gọi <code>open</code>, và chặn — trong khi ' +
           'bên đọc còn chưa tới lượt. Kết quả trông y hệt nguyên nhân 1, nhưng nguyên nhân gốc ' +
           'khác nên cách sửa cũng khác.\n\n' +
           '<b>Nguyên nhân 3 — FIFO không có ở đó, hoặc sai quyền.</b> Trên máy phát triển bạn ' +
           'đã <code>mkfifo</code> bằng tay từ lâu và quên mất. Trên thiết bị, gói cài đặt ' +
           'không tạo nó, hoặc tạo với chủ sở hữu khác. <code>open</code> hỏng ngay với ' +
           '<code>ENOENT</code> hoặc <code>EACCES</code> — và nếu mã không kiểm tra giá trị trả ' +
           'về mà đi thẳng vào một vòng lặp, triệu chứng bên ngoài vẫn là "treo, không log".\n\n' +
           '<b>Phân biệt — ba phép thử, theo thứ tự rẻ dần:</b>\n\n' +
           '<i>Thử 1:</i> <code>ls -l /duong/dan/fifo</code>. Không có mục nào, hoặc có nhưng ' +
           'quyền không cho phép người dùng của daemon ghi → <b>nguyên nhân 3</b>, xong. Thấy ' +
           '<code>prw-r--r--</code> đúng chủ sở hữu → loại 3, đi tiếp.\n\n' +
           '<i>Thử 2:</i> <code>strace -p &lt;pid&gt;</code>, hoặc rẻ hơn là ' +
           '<code>cat /proc/&lt;pid&gt;/wchan</code>. Nếu tiến trình đang nằm trong ' +
           '<code>openat</code> thì nó <i>đang đợi</i>, không phải đang hỏng → nguyên nhân 1 ' +
           'hoặc 2.\n\n' +
           '<i>Thử 3:</i> mở tay đầu đọc — <code>cat /duong/dan/fifo</code>. Daemon chạy tiếp ' +
           '<b>ngay lập tức</b> → xác nhận nó đang đợi người đọc. Còn phân biệt 1 với 2: xem ' +
           'bên đọc có được thiết kế để tự khởi động không. Có mà không chạy → vấn đề thứ tự ' +
           '(nguyên nhân 2). Không hề có bên đọc nào trong thiết kế → nguyên nhân 1, và giả ' +
           'định của bạn về vòng đời đã sai từ đầu.\n\n' +
           '<b>Sửa:</b> với nguyên nhân 2, thêm <code>After=</code> và ' +
           '<code>Requires=</code> vào unit. Với nguyên nhân 1, mở bằng ' +
           '<code>O_WRONLY | O_NONBLOCK</code> rồi thử lại theo chu kỳ khi gặp ' +
           '<code>ENXIO</code> — nhớ rằng <code>O_NONBLOCK</code> bất đối xứng, phía ghi không ' +
           'chặn thì <i>hỏng</i> chứ không thành công. Với nguyên nhân 3, <code>mkfifo</code> ' +
           'lúc cài đặt kèm đúng chủ sở hữu và quyền, hoặc để daemon tự tạo nếu chưa có.' },

    { id: 'c5', k: 'free', tag: 'Tình huống mới', rows: 8,
      q: 'Một liên kết pipe đang chạy êm với dòng dữ liệu đều 5 MB/s. Yêu cầu mới: nguồn đổi ' +
         'sang phát <b>từng đợt 1 MB, 20 lần mỗi giây</b> — vẫn 20 MB/s trung bình, nhưng dồn ' +
         'thành cục. Bên nhận thỉnh thoảng bận 200 ms để ghi thẻ nhớ. Pipe chứa <b>65 536</b> ' +
         'byte. Chuyện gì sẽ xảy ra, và bạn sửa thế nào?',
      hint: 'Trong 200 ms bên nhận bận, nguồn phát ra bao nhiêu byte? So với 65 536.',
      crit: [
        'Tính đúng lượng dồn: 200 ms × 20 MB/s = <b>4 MB</b>, gấp khoảng <b>64 lần</b> sức chứa 65 536 byte của pipe',
        'Nêu đúng hậu quả: bên ghi bị <b>chặn</b> trong <code>write</code> (hoặc nhận <code>EAGAIN</code> nếu <code>O_NONBLOCK</code>) — pipe tạo ra <i>áp lực ngược</i>, đó là thiết kế chứ không phải lỗi',
        'Nói được vì sao áp lực ngược ở đây là vấn đề: nếu nguồn là phần cứng theo thời gian thực (camera, ADC) thì nó không đợi được, dữ liệu <b>mất</b> ở tầng driver chứ không xếp hàng',
        'Loại bỏ giải pháp sai: nâng <code>F_SETPIPE_SZ</code> lên tối đa <b>1 048 576</b> byte cũng chỉ được 1 MB, vẫn thiếu 4 lần — và cần root để vượt trần đó',
        'Nêu ít nhất một hướng đúng: vòng đệm trong bộ nhớ chia sẻ nhiều slot, hoặc một luồng đệm trung gian đọc pipe liên tục và xếp hàng trong RAM tiến trình',
        'Nêu quyết định phải làm rõ khi đệm đầy: <b>bỏ khung cũ hay bỏ khung mới</b> — im lặng chặn là câu trả lời tệ nhất',
        'Chỉ ra rằng trung bình 20 MB/s không phải vấn đề — mọi cơ chế trong bài đều thừa sức; vấn đề là <b>đỉnh tức thời</b>, và đó là bài học chính',
        'Nếu có nêu <code>PIPE_BUF</code>: đúng, đợt 1 MB &gt; 4 096 nên lời ghi không nguyên tử và sẽ bị chia nhỏ — thêm một lý do phải xử lý ghi từng phần bằng vòng lặp'
      ],
      sol: '<b>Phép tính quyết định mọi thứ.</b> Bên nhận bận 200 ms. Trong 200 ms đó nguồn ' +
           'phát ra 0,2 × 20 = <b>4 MB</b>. Pipe chứa được 65 536 byte, tức 0,0655 MB. Thiếu ' +
           'khoảng <b>64 lần</b>.\n\n' +
           '<b>Chuyện xảy ra:</b> pipe đầy sau chưa tới 4 ms, rồi <code>write</code> của bên ' +
           'ghi <b>chặn</b> — hoặc trả <code>EAGAIN</code> nếu bạn dùng ' +
           '<code>O_NONBLOCK</code>. Đây không phải lỗi; đó chính là <i>áp lực ngược</i>, cơ ' +
           'chế mà pipe cố tình có: nó bắt bên nhanh phải chờ bên chậm.\n\n' +
           'Áp lực ngược là thứ tốt khi nguồn <i>chờ được</i>. Nó là thảm hoạ khi nguồn là phần ' +
           'cứng theo thời gian thực. Camera không đợi bạn; đến kỳ nó ghi vào bộ đệm DMA tiếp ' +
           'theo dù bạn đã đọc hay chưa. Dữ liệu không xếp hàng — nó <b>mất</b>, ở tầng driver, ' +
           'thường là im lặng hoặc chỉ một dòng "frame dropped" trong ' +
           '<code>dmesg</code>.\n\n' +
           '<b>Giải pháp sai mà ai cũng thử trước:</b> nâng sức chứa pipe. Trần cho tiến trình ' +
           'thường là <code>/proc/sys/fs/pipe-max-size</code> = <b>1 048 576</b> byte, và vượt ' +
           'nó thì cần root. Ngay cả khi nâng hết cỡ, 1 MB vẫn thiếu 4 lần so với 4 MB cần ' +
           'đệm. Hướng này không cứu được — và điều đó tự nó nói rằng vấn đề nằm ở chỗ ' +
           'khác.\n\n' +
           '<b>Hướng đúng — chọn một, hoặc kết hợp:</b>\n\n' +
           '<i>1. Tách việc đệm ra khỏi pipe.</i> Một luồng chuyên đọc pipe liên tục, không bao ' +
           'giờ để nó đầy, và xếp hàng trong bộ nhớ tiến trình. Luồng kia lo ghi thẻ nhớ. Pipe ' +
           'trở lại đúng vai trò của nó: một kênh truyền, không phải một kho.\n\n' +
           '<i>2. Vòng đệm trong bộ nhớ chia sẻ.</i> Nhiều slot, đủ chứa vài đợt — ví dụ 8 slot ' +
           '× 1 MB. Bên nhận bận 200 ms thì mất 4 slot rồi bắt kịp. Đổi lại bạn nhận toàn bộ ' +
           'nghĩa vụ đồng bộ, đúng như c2.\n\n' +
           '<i>3. Quyết định chính sách khi đệm đầy.</i> Dù chọn hướng nào, phải trả lời rõ ' +
           'ràng: đầy thì <b>bỏ khung cũ nhất</b> (tốt cho luồng trực tiếp — người xem cần ảnh ' +
           'mới nhất) hay <b>bỏ khung mới nhất</b> (tốt cho ghi hình — không được thủng giữa ' +
           'chừng)? Không quyết định gì và để nó chặn im lặng là câu trả lời tệ nhất, vì lúc đó ' +
           'chính sách vẫn tồn tại — chỉ là do bộ lập lịch quyết định thay bạn.\n\n' +
           '<b>Bài học chính:</b> 20 MB/s trung bình chẳng là gì — pipe tệ nhất trong 16 lần đo ' +
           'vẫn cho 518 MB/s. Cái giết bạn là <i>đỉnh tức thời</i> và <i>độ sâu bộ đệm</i>, hai ' +
           'đại lượng mà không cột nào trong bảng thông lượng nói cho bạn biết.\n\n' +
           'Một chi tiết phụ đáng nhớ: đợt 1 MB lớn hơn <code>PIPE_BUF</code> = 4 096 rất ' +
           'nhiều, nên lời <code>write</code> đó <b>không nguyên tử</b> và nhân được phép chỉ ' +
           'nhận một phần. Mã của bạn bắt buộc phải có vòng lặp quanh <code>write</code>, xử lý ' +
           'giá trị trả về nhỏ hơn số byte yêu cầu.' }
  ],

  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại Bài 19',
      q: 'Một tiến trình con ghi <code>printf("done\\n")</code> vào đầu ghi của pipe rồi gọi ' +
         '<code>_exit(0)</code>. Tiến trình cha đọc pipe tới khi <code>read</code> trả 0, ' +
         'nhưng không nhận được chữ nào. Vì sao?',
      opts: [
        'Pipe chỉ chuyển được dữ liệu nhị phân; <code>printf</code> ghi văn bản nên bị nhân loại bỏ',
        '<code>printf</code> ghi vào bộ đệm của thư viện C, và <code>_exit</code> kết thúc tiến trình mà <b>không</b> xả bộ đệm đó',
        '<code>_exit(0)</code> đóng đầu ghi trước khi nhân kịp chuyển dữ liệu sang bên đọc',
        'Cha phải gọi <code>fflush</code> trên đầu đọc trước khi <code>read</code>'
      ],
      a: 1,
      why: '<p>Bài 19 đã tách rõ hai tầng: <code>write</code> là <b>syscall</b> — dữ liệu vào ' +
           'thẳng nhân. <code>printf</code> là <b>hàm thư viện</b> — dữ liệu vào một bộ đệm ' +
           'trong không gian người dùng, và chỉ được xả xuống <code>write</code> khi bộ đệm ' +
           'đầy, khi gặp dòng mới lúc xuất ra terminal, hoặc khi tiến trình thoát <i>tử ' +
           'tế</i>.</p>' +
           '<p>Hai điều cộng lại thành cái bẫy này: (1) khi đầu ra <b>không</b> phải terminal — ' +
           'và pipe thì không phải — glibc chuyển sang đệm theo khối 4 KB, nên ' +
           '<code>\\n</code> không còn kích hoạt xả nữa; (2) <code>_exit</code> là syscall thô, ' +
           'nó <i>không</i> chạy các hàm dọn dẹp mà <code>exit</code> chạy, nên bộ đệm chết ' +
           'theo tiến trình.</p>' +
           '<p>Sửa: dùng <code>exit(0)</code> thay <code>_exit(0)</code>, hoặc gọi ' +
           '<code>fflush(stdout)</code> trước, hoặc bỏ hẳn <code>printf</code> mà ghi bằng ' +
           '<code>write</code> — cách cuối là cách nên dùng khi đang nói chuyện với một mô tả ' +
           'file.</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại Bài 21',
      q: 'Daemon của bạn đăng ký tay xử lý cho <code>SIGTERM</code>, <code>SIGINT</code> và ' +
         '<code>SIGHUP</code> để dọn dẹp trước khi thoát. Người vận hành gõ ' +
         '<code>kill -9 &lt;pid&gt;</code>. Chuyện gì xảy ra với phần dọn dẹp?',
      opts: [
        'Nó vẫn chạy — <code>SIGKILL</code> chỉ ép thoát <i>sau khi</i> tay xử lý hoàn tất',
        'Nó chạy nếu daemon kịp; <code>SIGKILL</code> cho một khoảng ân hạn mặc định 5 giây',
        'Nó <b>không</b> chạy — <code>SIGKILL</code> không bắt được, không chặn được, không bỏ qua được',
        'Nó chạy nếu bạn đã đăng ký thêm tay xử lý cho <code>SIGKILL</code> bằng <code>sigaction</code>'
      ],
      a: 2,
      why: '<p>Bảng ở Bài 21 có đúng hai dòng đặc biệt: <code>SIGKILL</code> (9) và ' +
           '<code>SIGSTOP</code> (19). Đây là hai tín hiệu duy nhất mà tiến trình không có ' +
           'tiếng nói nào — <code>sigaction</code> trên chúng trả <code>EINVAL</code>, ' +
           '<code>sigprocmask</code> lờ chúng đi. Nhân kết liễu tiến trình mà không hỏi han. ' +
           'Đó là chủ ý: phải luôn tồn tại một cách giết một tiến trình bất hợp tác.</p>' +
           '<p>Vì sao câu này nằm ở đây: nó là <b>lý do kỹ thuật</b> khiến A7, B3 và C3 đều dẫn ' +
           'về cùng một kết luận. Nếu dọn dẹp IPC chỉ nằm trong tay xử lý <code>SIGTERM</code>, ' +
           'thì <code>kill -9</code>, mất điện hay OOM killer đều vô hiệu hoá nó — và ' +
           '<code>/dev/shm</code> tích rác từng chút một.</p>' +
           '<p>Ngoài lề đáng biết: <code>systemctl stop</code> gửi <code>SIGTERM</code> trước, ' +
           'đợi <code>TimeoutStopSec</code> (mặc định 90 giây), rồi mới gửi ' +
           '<code>SIGKILL</code>. Khoảng ân hạn đó là của <b>systemd</b>, không phải của ' +
           '<code>SIGKILL</code> — <code>kill -9</code> gõ tay thì không có ân hạn nào.</p>' },

    { id: 'd3', k: 'tf', tag: 'Nhắc lại Bài 22',
      q: '<b>Phát biểu:</b> "Race condition ở Bài 22 xảy ra vì hai <i>luồng</i> dùng chung một ' +
         'không gian địa chỉ. Hai <i>tiến trình</i> thì mỗi bên có không gian địa chỉ riêng, ' +
         'nên bài toán mất tăng biến đếm không thể lặp lại được."',
      a: 1,
      rw: 'Viết lại cho đúng, và nêu điều kiện thật sự sinh ra race condition.',
      crit: [
        'Nói rõ điều kiện thật sự không phải "chung không gian địa chỉ" mà là <b>hai luồng thực thi cùng ghi vào một ô nhớ vật lý mà không tuần tự hoá</b>',
        'Chỉ ra <code>mmap</code> với <code>MAP_SHARED</code> tạo ra đúng điều kiện đó giữa hai tiến trình: hai bảng trang khác nhau, cùng một khung trang vật lý',
        'Dẫn số liệu Bài 23: <code>race_unsafe</code> mất <b>127 354 / 195 854 / 196 835</b> trên 400 000 qua ba lần chạy',
        'Nêu được rằng cách sửa cũng giống nhau về bản chất — mutex — chỉ khác ở một thuộc tính: <code>PTHREAD_PROCESS_SHARED</code>',
        'Không kết luận quá tay rằng "tiến trình và luồng là như nhau": chúng vẫn khác về cô lập bộ nhớ mặc định, chi phí tạo và bán kính thiệt hại khi một bên chết'
      ],
      why: '<p>Phát biểu này bắt đầu bằng một sự thật rồi rút ra kết luận sai — dạng nguy hiểm ' +
           'nhất, vì nửa đầu nghe rất thuyết phục.</p>' +
           '<p>Điều kiện thật sự sinh ra race condition không phải "chung không gian địa chỉ". ' +
           'Nó là: <b>hai luồng thực thi cùng ghi vào một ô nhớ vật lý mà không có gì tuần tự ' +
           'hoá</b>. Chung không gian địa chỉ chỉ là <i>một</i> cách để có điều kiện đó — cách ' +
           'quen thuộc nhất, không phải cách duy nhất.</p>' +
           '<p><code>mmap</code> với <code>MAP_SHARED</code> dựng lại đúng điều kiện ấy giữa ' +
           'hai tiến trình: hai bảng trang riêng biệt, trỏ vào <i>cùng một</i> khung trang vật ' +
           'lý. Từ đó <code>(*counter)++</code> vẫn là ba lệnh máy không nguyên tử, y hệt Bài ' +
           '22. Bằng chứng: ba lần chạy <code>race_unsafe</code> cho 272 646, 204 146, 203 165 ' +
           'trên mong đợi 400 000 — mất 32 % tới 49 %, thất thường.</p>' +
           '<p>Cách sửa cũng là cùng một cách sửa: một mutex. Khác biệt duy nhất là phải nói ' +
           'thêm một câu với glibc — <code>pthread_mutexattr_setpshared(&amp;attr, ' +
           'PTHREAD_PROCESS_SHARED)</code> — và đặt mutex <i>bên trong</i> vùng chia sẻ. Quên ' +
           'câu đó thì assertion ở <code>pthread_mutex_lock.c:88</code> nổ.</p>' +
           '<p>Nói vậy không có nghĩa tiến trình và luồng là một. Chúng vẫn khác ở cô lập bộ ' +
           'nhớ <i>mặc định</i>, ở chi phí tạo, và ở bán kính thiệt hại khi một bên chết. Chỗ ' +
           'sai của phát biểu là coi cô lập mặc định như một bảo đảm không thể từ bỏ — trong ' +
           'khi <code>MAP_SHARED</code> chính là lời từ bỏ đó, do bạn chủ động viết ra.</p>' }
  ],

  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 5,
      q: 'Trong <code>~/embedded/bai23</code>, tạo một FIFO rồi thử ghi vào nó khi <b>chưa có ' +
         'ai đọc</b>. Trước khi gõ <code>Enter</code> ở lệnh thứ ba, hãy <b>viết ra</b> dự đoán ' +
         'của bạn: lệnh sẽ in gì, và nó sẽ kết thúc sau bao lâu?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cd ~/embedded/bai23\n' +
                'mkfifo /tmp/predict_fifo\n' +
                'timeout 3 sh -c \'echo hello > /tmp/predict_fifo\'; echo "exit code = $?"' }
      ],
      hint: 'Bản thân <code>echo</code> không phải phần thú vị. Phần thú vị là chuyện gì xảy ra ' +
            '<i>trước khi</i> <code>echo</code> được chạy — shell phải mở tệp đích trước.',
      crit: [
        'Dự đoán được viết ra <b>trước</b> khi chạy — đây là toàn bộ giá trị của bài này',
        'Dự đoán đúng: không in ra <code>hello</code>, lệnh <b>treo</b> đủ 3 giây',
        'Dự đoán đúng mã thoát: <code>exit code = 124</code>, mã riêng của <code>timeout</code> báo "đã hết giờ và phải giết tiến trình"',
        'Giải thích đúng chỗ treo: shell mở <code>/tmp/predict_fifo</code> để chuyển hướng <b>trước khi</b> chạy <code>echo</code>, và <code>open</code> chặn cho tới khi có người đọc',
        'Có chạy phép thử đối chứng: mở terminal thứ hai, gõ <code>cat /tmp/predict_fifo</code>, rồi chạy lại — lần này <code>hello</code> hiện ra ngay ở terminal kia và mã thoát là 0',
        'Dọn dẹp: <code>rm /tmp/predict_fifo</code>'
      ],
      sol: 'Dự đoán đúng: <b>không in gì cả</b>, treo trọn 3 giây, rồi ' +
           '<code>exit code = 124</code>.\n\n' +
           'Chỗ dễ đoán sai: người ta nhìn <code>echo hello</code> và nghĩ về ' +
           '<code>echo</code>. Nhưng <code>echo</code> <i>chưa bao giờ chạy</i>. Shell phải ' +
           'thiết lập chuyển hướng <code>&gt;</code> trước đã, tức gọi <code>open</code> trên ' +
           'FIFO — và lời gọi đó chặn cho tới khi có tiến trình mở đầu đọc. Không có ai đọc, ' +
           'nên shell đứng im mãi mãi ở đó.\n\n' +
           '<code>124</code> là mã riêng của <code>timeout</code>, nghĩa "đã hết giờ và tôi ' +
           'phải giết nó". Con số này đáng nhớ vì nó nói rõ tiến trình <b>không</b> tự kết ' +
           'thúc.\n\n' +
           'Phép thử đối chứng làm rõ mọi thứ — mở terminal thứ hai:\n\n' +
           '<code>cat /tmp/predict_fifo</code>\n\n' +
           'rồi chạy lại lệnh ở terminal thứ nhất. Lần này <code>open</code> trả về ngay, ' +
           '<code>hello</code> hiện ra ở terminal thứ hai, mã thoát <code>0</code>. Cùng một ' +
           'lệnh, hai kết quả trái ngược, khác nhau đúng ở chỗ có ai đang mở đầu kia hay ' +
           'không.\n\n' +
           'Đây chính là "daemon treo lúc khởi động" của C4, thu nhỏ lại thành một dòng. Dọn: ' +
           '<code>rm /tmp/predict_fifo</code>.',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: 'exit code = 124' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Chạy <code>./race_unsafe</code> <b>mười</b> lần liên tiếp và chép lại cả mười dòng ' +
         'kết quả. Trước khi chạy, hãy viết ra dự đoán: mười con số đó sẽ <i>giống nhau</i>, ' +
         'hay <i>khác nhau</i>? Nếu khác thì lệch nhau cỡ bao nhiêu? Và câu hỏi khó nhất: ' +
         'trong mười lần đó, có thể có lần nào ra <b>đúng</b> 400000 không? Sau đó đối chiếu ' +
         'với thí nghiệm hai <b>luồng</b> ở Bài 22 và nói xem có gì khác về bản chất không.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cd ~/embedded/bai23\n' +
                'for i in $(seq 10); do ./race_unsafe; done' }
      ],
      hint: 'Cái quyết định bao nhiêu lần tăng bị mất là bộ lập lịch chen vào <i>đúng lúc nào</i> ' +
            '— và đó không phải thứ chương trình của bạn kiểm soát được. Một chuỗi ngẫu nhiên ' +
            'thì không có gì cấm nó ngẫu nhiên ra con số đẹp.',
      crit: [
        'Dự đoán được viết ra <b>trước</b> khi chạy',
        'Dự đoán đúng: các con số <b>khác nhau</b>, và khác nhiều — không chỉ lệch vài đơn vị',
        'Có chép lại đủ mười dòng thật, kèm <code>expected</code>, <code>actual</code> và <code>lost</code>',
        'Nhận xét được biên độ: nó rất rộng — mười lăm lần chạy trên máy viết bài cho <code>lost</code> từ <b>0</b> tới <b>200 000</b>, tức từ 0 % tới 50 %',
        'Trả lời đúng câu hỏi khó: <b>có thể</b>. Một lần chạy ra đúng <code>actual 400000, lost 0</code> là chuyện hoàn toàn có thật, và trên máy viết bài nó đã xảy ra',
        'Hiểu đúng ý nghĩa của lần chạy đúng đó: nó <b>không</b> chứng minh chương trình đúng — đây chính là bài học <i>chạy thấy đúng không phải bằng chứng</i> của Bài tập 22, lần này tự mình gặp',
        'Nêu đúng nguyên nhân dao động: điểm chen của bộ lập lịch khác nhau mỗi lần, và trên WSL2 còn phụ thuộc cả tải phía Windows',
        'Đối chiếu đúng với Bài 22: <b>không</b> khác gì về bản chất — cùng một cơ chế mất tăng biến đếm, chỉ khác là hai bên tranh chấp giờ là hai tiến trình chứ không phải hai luồng',
        'Rút ra kết luận đúng: <code>MAP_SHARED</code> đã xoá đi đúng cái bảo đảm mà người ta hay viện dẫn ("tiến trình thì cô lập"), và MMU không có ý kiến gì về vùng đã ánh xạ chung',
        'Nếu có chạy <code>./race_locked</code> để so: đúng <b>400000</b> mọi lần, không dao động một đơn vị'
      ],
      sol: 'Dự đoán đúng: các con số <b>khác nhau</b>, và khác rất nhiều. Năm lần chạy đầu trên ' +
           'máy viết bài cho <code>lost</code> lần lượt là 103 099 · <b>0</b> · 40 304 · ' +
           '70 038 · 52 583; mười lần sau cho từ 75 624 tới 200 000. Cùng một file thực thi, ' +
           'chạy cách nhau vài giây, biên độ trải từ 0 % tới 50 %.\n\n' +
           '<b>Và vâng — lần chạy thứ hai ra đúng <code>actual 400000, lost 0</code>.</b> Đó ' +
           'là chỗ đáng dừng lại. Nếu bạn chỉ chạy một lần và gặp đúng lần đó, bạn sẽ kết luận ' +
           'chương trình không có lỗi, và bạn sẽ sai. Bài tập 22 đã nói điều này bằng lời; ở ' +
           'đây bạn tự tay tạo ra phản ví dụ. Một lần chạy đúng của mã có tranh chấp không ' +
           'chứng minh gì cả — nó chỉ nói rằng lần này bộ lập lịch tình cờ không chen vào giữa ' +
           'lệnh đọc và lệnh ghi.\n\n' +
           'Nguyên nhân dao động: kết quả phụ thuộc vào việc bộ lập lịch chen vào <i>giữa</i> ' +
           'lệnh đọc và lệnh ghi bao nhiêu lần, ở những chỗ nào. Đó không phải thứ chương trình ' +
           'quyết định được, và trên WSL2 còn phụ thuộc cả tải phía Windows. Cùng một mã nguồn, ' +
           'mỗi lần một câu trả lời — kể cả câu trả lời đúng.\n\n' +
           '<b>So với Bài 22: không khác gì về bản chất.</b> Đó mới là điều đáng giật mình. Ở ' +
           'Bài 22 hai <i>luồng</i> tranh nhau một biến và làm mất số đếm; ở đây hai ' +
           '<i>tiến trình</i> tranh nhau một ô nhớ và làm mất số đếm theo đúng cùng một cách. ' +
           'Lập luận "tiến trình thì cô lập nên an toàn" không cứu được gì, vì ' +
           '<code>MAP_SHARED</code> chính là lời từ bỏ sự cô lập đó — do bạn tự viết ra. MMU ' +
           'vẫn hoạt động đầy đủ, nó chỉ không có ý kiến gì về một vùng đã được ánh xạ chung có ' +
           'chủ ý.\n\n' +
           'Chạy thêm <code>./race_locked</code> để thấy mặt kia: <code>actual 400000</code>, ' +
           'mọi lần, không lệch một đơn vị. Khác biệt giữa "đúng vì có bảo đảm" và "đúng vì ' +
           'may" nằm ở đó, và từ ngoài nhìn vào một dòng output thì hai thứ đó giống hệt nhau.',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: 'expected 400000, actual 296901, lost 103099\n' +
                'expected 400000, actual 400000, lost 0\n' +
                'expected 400000, actual 359696, lost 40304\n' +
                'expected 400000, actual 329962, lost 70038\n' +
                'expected 400000, actual 347417, lost 52583' }
      ] },
    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Bạn cần <b>một con số</b> để bảo vệ quyết định thiết kế trong buổi review — con số ' +
         'không đổi giữa các lần chạy. Hãy gõ lệnh đo <b>số lần vượt ranh giới người dùng ↔ ' +
         'nhân</b> của <code>pipe_1k</code> và <code>shm_1k</code>, chép lại kết quả, và viết ' +
         'một câu giải thích vì sao hai con số này lại chênh nhau tới ba bậc độ lớn.',
      hint: 'Bạn cần <i>đếm</i> syscall chứ không cần xem từng lời gọi. <code>strace</code> có ' +
            'một cờ làm đúng việc đó, và một cờ nữa để không bỏ sót tiến trình con.',
      crit: [
        'Gõ đúng lệnh: <code>strace -f -c -e trace=read,write ./pipe_1k</code> và tương tự cho <code>./shm_1k</code>',
        'Giải thích được từng cờ: <code>-c</code> tổng hợp thành bảng đếm thay vì in từng dòng, <code>-f</code> theo cả tiến trình con (thiếu nó là bỏ sót một nửa), <code>-e trace=</code> lọc bớt nhiễu lúc khởi động',
        'Chép lại đúng kết quả: <code>pipe_1k</code> có <b>1001</b> lần <code>read</code> + <b>1000</b> lần <code>write</code> = <b>2 001</b>; <code>shm_1k</code> có <b>1</b> lần <code>read</code>',
        'Giải thích được con số lẻ 1001: lần <code>read</code> cuối trả về <b>0</b> để báo hết dữ liệu (bên ghi đã đóng), nên nhiều hơn số lần ghi đúng một',
        'Giải thích đúng vì sao chênh ba bậc: với pipe, <b>mỗi khối</b> phải đi qua nhân nên tốn hai lần chuyển ngữ cảnh; với bộ nhớ chia sẻ, nhân chỉ tham gia lúc <code>mmap</code> ban đầu rồi rút hẳn — sau đó là lệnh <code>mov</code> thuần tuý',
        'Nêu được vì sao con số này đáng tin hơn thông lượng: nó do <b>mã nguồn</b> quyết định, chạy lại lúc nào cũng đúng như vậy — khác hẳn 518–3 969 MB/s'
      ],
      sol: 'Lệnh:\n\n' +
           '<code>strace -f -c -e trace=read,write ./pipe_1k</code>\n' +
           '<code>strace -f -c -e trace=read,write ./shm_1k</code>\n\n' +
           'Từng cờ có việc của nó: <code>-c</code> gộp thành bảng đếm thay vì in ra hàng nghìn ' +
           'dòng; <code>-f</code> theo cả tiến trình con — thiếu nó thì bạn chỉ đếm được một ' +
           'nửa cuộc trò chuyện; <code>-e trace=read,write</code> loại bỏ hàng chục syscall nạp ' +
           'thư viện lúc khởi động, thứ chẳng liên quan gì tới cái ta đang đo.\n\n' +
           'Kết quả: <code>pipe_1k</code> cho <b>1001</b> lần <code>read</code> và <b>1000</b> ' +
           'lần <code>write</code>, tổng <b>2 001</b>. <code>shm_1k</code> cho đúng <b>1</b> lần ' +
           '<code>read</code>.\n\n' +
           'Con số lẻ 1001 có lý do: lần <code>read</code> cuối cùng trả về <b>0</b> — đó là ' +
           'cách nhân báo "bên ghi đã đóng, hết dữ liệu". Bên đọc buộc phải gọi thêm một lần ' +
           'nữa mới biết được điều đó.\n\n' +
           'Vì sao chênh ba bậc: với pipe, <i>mỗi</i> khối 4 KB phải được chép từ không gian ' +
           'người dùng vào bộ đệm nhân rồi chép ngược ra — hai lần chuyển ngữ cảnh cho mỗi ' +
           'khối, một nghìn khối. Với bộ nhớ chia sẻ, nhân chỉ tham gia đúng lúc ' +
           '<code>mmap</code> dựng ánh xạ, rồi rút hẳn; từ đó về sau việc truyền dữ liệu là ' +
           'lệnh <code>mov</code> thuần tuý, nhân không hề biết có chuyện gì đang xảy ra. Lần ' +
           '<code>read</code> duy nhất còn sót lại thậm chí không phải để truyền dữ liệu.\n\n' +
           'Và đây là lý do con số này thắng thông lượng trong một buổi review: nó suy ra được ' +
           'từ mã nguồn <i>trước khi</i> chạy, nên không ai lật được nó bằng một lần chạy bench ' +
           'khác. Thông lượng thì trải 518–3 969 MB/s và ai cũng có thể chạy ra một con số bác ' +
           'bỏ bạn.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Tự tạo ra một vụ rò rỉ rồi tự tìm ra nó. Biên dịch chương trình dưới đây: nó mở một ' +
         'vùng nhớ chia sẻ 64 MB, chạm vào từng trang để vùng đó thật sự tốn RAM, rồi nằm chờ ' +
         'ở <code>pause()</code>. Chạy nó ở nền, giết bằng <code>SIGKILL</code> để dòng ' +
         '<code>shm_unlink</code> không bao giờ chạy tới, rồi dùng <b>ba lệnh</b> để chứng minh ' +
         'vùng nhớ vẫn còn, đo xem nó chiếm bao nhiêu, và dọn sạch. Nhớ chạy ' +
         '<code>df -h /dev/shm</code> một lần <i>trước</i> tất cả để có mốc so sánh.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'c',
          code: '#define _GNU_SOURCE\n' +
                '#include <fcntl.h>\n' +
                '#include <stdio.h>\n' +
                '#include <string.h>\n' +
                '#include <sys/mman.h>\n' +
                '#include <unistd.h>\n' +
                '\n' +
                '#define SIZE (64 * 1024 * 1024)\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    int fd = shm_open("/leaky", O_CREAT | O_RDWR, 0600);\n' +
                '    if (fd < 0)              { perror("shm_open");  return 1; }\n' +
                '    if (ftruncate(fd, SIZE)) { perror("ftruncate"); return 1; }\n' +
                '\n' +
                '    char *p = mmap(NULL, SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);\n' +
                '    if (p == MAP_FAILED)     { perror("mmap");      return 1; }\n' +
                '    memset(p, \'A\', SIZE);    /* touch every page so it really costs RAM */\n' +
                '\n' +
                '    printf("created /leaky, %d MB touched, pid = %d\n",\n' +
                '           SIZE / (1024 * 1024), getpid());\n' +
                '    fflush(stdout);\n' +
                '\n' +
                '    pause();              /* wait here until someone kills us */\n' +
                '    shm_unlink("/leaky"); /* never reached under SIGKILL */\n' +
                '    return 0;\n' +
                '}' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cd ~/embedded/bai23\n' +
                'gcc -Wall -o leaker leaker.c -lrt' }
      ],
      hint: 'Vùng nhớ chia sẻ POSIX chỉ là một file trên tmpfs. Vậy công cụ tìm nó cũng là công ' +
            'cụ bạn dùng với file thường. Chạy nền bằng <code>&amp;</code> thì <code>$!</code> ' +
            'giữ PID của tiến trình vừa chạy.',
      crit: [
        'Có chạy <code>df -h /dev/shm</code> <b>trước</b> để lấy mốc: trên máy sạch là <code>none 2.5G 0 2.5G 0%</code>',
        'Có giết bằng <code>SIGKILL</code> chứ không phải <kbd>Ctrl</kbd>+<kbd>C</kbd> — ví dụ <code>./leaker &amp;</code> rồi <code>kill -9 $!</code>',
        'Lệnh 1 — chứng minh còn sót: <code>ls -l /dev/shm/</code>, thấy mục <code>leaky</code> với chủ sở hữu, quyền và kích thước <code>67108864</code>',
        'Lệnh 2 — đo: <code>df -h /dev/shm</code>, cột <code>Used</code> nhảy từ <code>0</code> lên <code>64M</code> và <b>ở nguyên đó</b> sau khi tiến trình chết',
        'Lệnh 3 — dọn: <code>rm /dev/shm/leaky</code>, rồi <code>df</code> trả về <code>0</code>',
        'Nhận ra được điều quan trọng: <code>ps -p &lt;pid&gt;</code> báo tiến trình đã biến mất mà 64 MB vẫn bị chiếm',
        'Giải thích đúng vì sao <code>rm</code> làm được việc của <code>shm_unlink</code>: cả hai đều chỉ xoá một tên trên tmpfs, vì <code>/dev/shm</code> là một hệ thống tập tin thật',
        'Giải thích đúng vì sao phải <code>memset</code>: <code>ftruncate</code> mới chỉ đặt <i>kích thước</i>, chưa cấp trang nào, nên nếu không chạm vào bộ nhớ thì <code>df</code> vẫn báo <code>0</code> và vụ rò rỉ trông như không tốn gì',
        'Rút ra kết luận đúng: đây chính là cơ chế của vụ rò rỉ 4 MB/ngày ở C3, chỉ khác quy mô'
      ],
      sol: 'Chạy nền rồi bắn <code>SIGKILL</code> vào PID mà <code>$!</code> vừa giữ. Đừng dùng ' +
           '<code>timeout -s KILL 0.1 ./race_unsafe</code> cho việc này: <code>race_unsafe</code> ' +
           'chạy xong trong khoảng <b>3 ms</b>, nên nó tự kết thúc và tự dọn dẹp trước khi tín ' +
           'hiệu kịp tới — thử với <code>0.002</code> cũng vậy. Muốn bắt được một tiến trình ' +
           'giữa chừng thì tiến trình đó phải chịu <i>đứng yên</i>, và đó là việc của ' +
           '<code>pause()</code>.\n\n' +
           'Ba lệnh tìm và dọn:\n\n' +
           '<code>ls -l /dev/shm/</code> — vùng nhớ vẫn nằm đó, đầy đủ chủ sở hữu, quyền và ' +
           'kích thước, y như một file thường.\n\n' +
           '<code>df -h /dev/shm</code> — cột <code>Used</code> nhảy lên <code>64M</code> lúc ' +
           'chương trình chạy, và <b>vẫn là 64M</b> sau khi nó chết. Đó là toàn bộ nội dung của ' +
           'bài tập này gói trong một con số.\n\n' +
           '<code>rm /dev/shm/leaky</code> — xong, <code>df</code> về lại <code>0</code>. Chính ' +
           'xác là việc mà <code>shm_unlink</code> làm, chỉ khác là gõ từ dòng lệnh.\n\n' +
           'Chi tiết dễ bỏ qua: <code>memset</code> không phải để trang trí. ' +
           '<code>ftruncate</code> mới chỉ khai báo kích thước, tmpfs chưa cấp trang nào cả — ' +
           'bỏ <code>memset</code> đi thì <code>ls -l</code> vẫn báo 64 MB nhưng <code>df</code> ' +
           'vẫn báo <code>0</code>, và vụ rò rỉ trông như vô hại. Bộ nhớ chỉ bị chiếm thật khi ' +
           'có ai đó chạm vào trang.\n\n' +
           'Phép thử quan trọng nhất lại là phép thử <i>không</i> tìm thấy gì: ' +
           '<code>ps -p $pid</code> không còn dòng nào. Tiến trình đã chết hẳn, nhưng bộ nhớ ' +
           'của nó vẫn bị chiếm. Đây là loại rò rỉ mà <code>ps</code> không nhìn thấy và ' +
           '<code>valgrind</code> cũng không — vì không có tiến trình nào để nhìn, và không có ' +
           '<code>malloc</code> nào bị quên giải phóng.\n\n' +
           'Bạn vừa tái hiện đúng vụ rò rỉ 4 MB/ngày ở C3, phóng to lên cho dễ thấy. Trên ' +
           'gateway thật, thứ đóng vai <code>kill -9</code> là watchdog, OOM killer hoặc một ' +
           'lần mất điện.',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: '=== truoc ===\n' +
                'none            2.5G     0  2.5G   0% /dev/shm\n' +
                'created /leaky, 64 MB touched, pid = 441\n' +
                '=== dang chay ===\n' +
                'none            2.5G   64M  2.4G   3% /dev/shm\n' +
                '=== sau kill -9 ===\n' +
                'process gone\n' +
                'total 65536\n' +
                '-rw------- 1 shinarus shinarus 67108864 Aug 27 20:30 leaky\n' +
                'none            2.5G   64M  2.4G   3% /dev/shm\n' +
                '=== don dep ===\n' +
                'none            2.5G     0  2.5G   0% /dev/shm' }
      ] },
    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 7,
      q: 'Chương trình dưới đây định gửi và nhận qua hàng đợi thông điệp. Nó biên dịch sạch ' +
         'nhưng hỏng ở <b>hai</b> chỗ khi chạy. Tìm cả hai, nói mỗi chỗ trả về lỗi gì, sửa lại ' +
         'và chạy để xác nhận.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'c',
          code: '#include <fcntl.h>\n' +
                '#include <mqueue.h>\n' +
                '#include <stdio.h>\n' +
                '#include <string.h>\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    struct mq_attr attr;\n' +
                '    attr.mq_flags   = 0;\n' +
                '    attr.mq_maxmsg  = 1000;      /* deep queue for burst traffic */\n' +
                '    attr.mq_msgsize = 256;       /* plenty for our 16-byte messages */\n' +
                '    attr.mq_curmsgs = 0;\n' +
                '\n' +
                '    mqd_t mq = mq_open("/fix_me", O_CREAT | O_RDWR, 0600, &attr);\n' +
                '    if (mq == (mqd_t)-1) { perror("mq_open"); return 1; }\n' +
                '\n' +
                '    mq_send(mq, "temperature 42.5", 16, 0);\n' +
                '\n' +
                '    char buf[64];\n' +
                '    ssize_t n = mq_receive(mq, buf, sizeof(buf), NULL);\n' +
                '    if (n == -1) { perror("mq_receive"); return 1; }\n' +
                '\n' +
                '    buf[n] = 0;\n' +
                '    printf("got: %s\\n", buf);\n' +
                '\n' +
                '    mq_close(mq);\n' +
                '    mq_unlink("/fix_me");\n' +
                '    return 0;\n' +
                '}' }
      ],
      hint: 'Cả hai lỗi đều là cùng một loại sai lầm: đoán một giới hạn của hệ thống thay vì ' +
            'hỏi nó. Hai giới hạn đó đọc được ở <code>/proc/sys/fs/mqueue/</code>.',
      crit: [
        'Lỗi 1 — <code>mq_maxmsg = 1000</code> vượt <code>msg_max</code> mặc định là <b>10</b>, nên <code>mq_open</code> hỏng với <code>EINVAL</code> ("Invalid argument")',
        'Lỗi 2 — <code>char buf[64]</code> nhỏ hơn <code>mq_msgsize</code> = <b>256</b> mà chính chương trình khai báo, nên <code>mq_receive</code> hỏng với <code>EMSGSIZE</code> ("Message too long")',
        'Hiểu đúng bản chất lỗi 2: <code>mq_receive</code> đòi bộ đệm ít nhất bằng <b>kích thước tối đa khai báo</b> của hàng đợi, không phải bằng độ dài thông điệp thật — thông điệp chỉ dài 16 byte mà vẫn hỏng',
        'Sửa lỗi 1 đúng cách: hạ <code>mq_maxmsg</code> xuống ≤ 10, hoặc đọc <code>/proc/sys/fs/mqueue/msg_max</code> để biết trần thật',
        'Sửa lỗi 2 đúng cách: gọi <code>mq_getattr(mq, &amp;at)</code> rồi cấp bộ đệm <code>at.mq_msgsize</code> byte bằng <code>malloc</code> — không đoán con số',
        'Có biên dịch với <code>-lrt</code> và chạy để xác nhận, chép lại output thật',
        'Có kiểm tra giá trị trả về của <code>mq_send</code> — bản gốc bỏ qua nó, và đó là lý do lỗi thứ hai khó lần ra',
        'Nhận ra hàng đợi <b>ở lại</b> sau lần chạy hỏng: <code>mq_receive</code> trả về sớm nên <code>mq_unlink</code> không bao giờ chạy, và <code>ls -l /dev/mqueue/</code> vẫn thấy <code>fix_me</code>',
        'Nêu được nguyên tắc chung rút ra: <b>hỏi hệ thống, đừng đoán</b> — <code>mq_getattr</code>, <code>fcntl(F_GETPIPE_SZ)</code>, <code>sysconf</code> đều tồn tại chính vì lý do này'
      ],
      sol: 'Hai lỗi, và cả hai đều là cùng một sai lầm ở hai chỗ khác nhau: <b>đoán một giới ' +
           'hạn của hệ thống thay vì hỏi nó</b>.\n\n' +
           '<b>Lỗi 1 — <code>mq_maxmsg = 1000</code>.</b> Trần mặc định đọc ở ' +
           '<code>/proc/sys/fs/mqueue/msg_max</code> là <b>10</b>. Xin 1000 thì ' +
           '<code>mq_open</code> trả <code>EINVAL</code> và <code>perror</code> in ' +
           '<code>mq_open: Invalid argument</code>. Lỗi này còn <i>tử tế</i>: nó nổ ngay dòng ' +
           'đầu, không thể bỏ sót. Sửa bằng cách hạ xuống ≤ 10, hoặc nếu thật sự cần hàng đợi ' +
           'sâu thì nâng trần bằng ' +
           '<code>echo 1000 | sudo tee /proc/sys/fs/mqueue/msg_max</code> — nhưng nhớ rằng nó ' +
           'trở về mặc định sau khi khởi động lại, trừ khi ghi vào ' +
           '<code>/etc/sysctl.d/</code>.\n\n' +
           '<b>Lỗi 2 — <code>char buf[64]</code>.</b> Đây mới là lỗi thú vị, và nó chỉ lộ ra ' +
           '<i>sau khi</i> bạn sửa lỗi 1. Thông điệp thật dài 16 byte, bộ đệm 64 byte, nghe rất ' +
           'dư. Nhưng <code>mq_receive</code> không quan tâm thông điệp dài bao nhiêu — nó đòi ' +
           'bộ đệm ít nhất bằng <code>mq_msgsize</code> mà hàng đợi <i>khai báo</i>, ở đây là ' +
           '<b>256</b> (do chính dòng <code>attr.mq_msgsize = 256</code> đặt ra, kèm lời bình ' +
           '"plenty for our 16-byte messages" — lời bình ấy đúng về thông điệp và sai về bộ ' +
           'đệm). Kết quả: <code>mq_receive: Message too long</code>, tức ' +
           '<code>EMSGSIZE</code>.\n\n' +
           'Chi tiết đáng chú ý: lần chạy hỏng này <b>để lại rác</b>. ' +
           '<code>mq_receive</code> trả về sớm nên <code>mq_unlink</code> không bao giờ chạy, ' +
           'và <code>ls -l /dev/mqueue/</code> vẫn thấy <code>fix_me</code>. Đúng trục xoáy của ' +
           'A7, B3 và C3, gặp lại lần nữa ở nơi bạn không ngờ.\n\n' +
           'Cách sửa đúng là không đoán:\n\n' +
           '<code>struct mq_attr at;</code>\n' +
           '<code>mq_getattr(mq, &amp;at);</code>\n' +
           '<code>char *buf = malloc(at.mq_msgsize);</code>\n\n' +
           'Thêm một điểm nữa: bản gốc bỏ qua giá trị trả về của <code>mq_send</code>. Đó là lý ' +
           'do lỗi thứ hai khó lần ra — nếu <code>mq_send</code> cũng hỏng, bạn sẽ không biết, ' +
           'và triệu chứng duy nhất là <code>mq_receive</code> treo hoặc báo lỗi khó hiểu.\n\n' +
           'Biên dịch và chạy để xác nhận: <code>gcc -Wall -o fix_me fix_me.c -lrt</code>, rồi ' +
           '<code>./fix_me</code>. Nguyên tắc rút ra dùng được ở khắp nơi: ' +
           '<code>mq_getattr</code>, <code>fcntl(F_GETPIPE_SZ)</code> và <code>sysconf</code> ' +
           'tồn tại chính vì con số đúng phụ thuộc hệ thống, và hệ thống thì sẵn sàng trả lời ' +
           'nếu bạn chịu hỏi.',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: '$ cat /proc/sys/fs/mqueue/msg_max\n' +
                '10\n' +
                '$ cat /proc/sys/fs/mqueue/msgsize_max\n' +
                '8192\n' +
                '\n' +
                '$ ./fix_me                  # nguyên bản\n' +
                'mq_open: Invalid argument\n' +
                '\n' +
                '$ ./fix_me                  # sau khi hạ mq_maxmsg xuống 10\n' +
                'mq_receive: Message too long\n' +
                '\n' +
                '$ ls -l /dev/mqueue/        # lần chạy hỏng để lại hàng đợi\n' +
                'total 0\n' +
                '-rw------- 1 shinarus shinarus 80 Aug 27 20:25 fix_me' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Một tiến trình phải theo dõi <b>hai</b> FIFO cùng lúc: <code>/tmp/sensor_a</code> và ' +
         '<code>/tmp/sensor_b</code>, dữ liệu tới bất chợt ở cả hai. Hãy tạo hai FIFO đó, viết ' +
         'một chương trình mở và đọc cả hai bằng <code>open()</code> + <code>read()</code> ' +
         'chặn thông thường, và <b>chứng minh bằng thí nghiệm</b> rằng cách này hỏng. Đặt ' +
         '<code>printf</code> trước mỗi lời <code>open</code> — bạn sẽ cần biết chương trình ' +
         'đứng lại ở đâu, và chỗ đó có thể không phải chỗ bạn đoán. Sau đó nêu — chưa cần cài ' +
         'đặt — hai hướng giải quyết và cái giá của mỗi hướng.',
      hint: 'Trước khi lo <code>read()</code> chặn ở đâu, hãy hỏi: mở một FIFO để đọc trong khi ' +
            'chưa có ai mở đầu kia để ghi thì <code>open()</code> làm gì?',
      crit: [
        'Tạo được hai FIFO và một chương trình mở tuần tự <code>open(sensor_a)</code> rồi <code>open(sensor_b)</code>, sau đó đọc tuần tự trong một vòng lặp',
        'Có đặt <code>printf</code> + <code>fflush</code> quanh mỗi lời <code>open</code> để nhìn thấy chỗ chương trình đứng lại',
        'Phát hiện được chỗ hỏng <b>thật sự</b>: chương trình dừng ngay ở <code>open("/tmp/sensor_a")</code> và <b>chưa từng chạy tới</b> <code>open</code> của b, chứ không phải dừng ở <code>read</code> như thường đoán',
        'Giải thích đúng vì sao: mở FIFO với <code>O_RDONLY</code> sẽ chặn cho tới khi có tiến trình khác mở đầu ghi — đây là cơ chế bắt tay của FIFO, không phải lỗi',
        'Thí nghiệm chứng minh đúng: chỉ ghi vào <code>sensor_b</code> — <b>không có gì xảy ra cả</b>; cả người đọc lẫn <code>echo</code> ghi vào b đều đang chặn, và b thì chưa được mở',
        'Ghi tiếp vào <code>sensor_a</code> thì mọi thứ bung ra một lượt: hai dòng <code>opened</code> và cả <code>from a</code> lẫn <code>from b</code> cùng hiện — bằng chứng rằng dòng của b đã nằm chờ ở đó suốt',
        'Nói đúng bản chất vấn đề: cả <code>open()</code> lẫn <code>read()</code> chặn đều chỉ theo dõi được <i>một</i> mô tả file, nên thứ tự phục vụ do <b>mã nguồn</b> quyết định chứ không do dữ liệu tới trước sau',
        'Nêu hướng 1 — <b>một luồng hoặc tiến trình cho mỗi FIFO</b>: đơn giản, nhưng cái giá là đồng bộ giữa các luồng, chi phí tạo, và không mở rộng được lên hàng trăm nguồn',
        'Nêu hướng 2 — <b>một cơ chế đợi nhiều mô tả file cùng lúc</b>: <code>select</code>, <code>poll</code> hoặc <code>epoll</code>; một luồng, không tranh chấp, mở rộng tốt. Có nêu được rằng hướng này phải mở sao cho <code>open</code> không chặn trước đã',
        'Nêu được vì sao <code>O_NONBLOCK</code> + quay vòng hỏi <b>không</b> phải câu trả lời tốt: nó ngốn CPU liên tục và trên thiết bị chạy pin thì đó là lỗi thiết kế',
        'Có nêu ít nhất một cái giá cụ thể cho mỗi hướng, không chỉ liệt kê tên'
      ],
      sol: 'Thí nghiệm chỉ cần ba bước, và bước đầu đã cho một bất ngờ.\n\n' +
           'Tạo hai FIFO: <code>mkfifo /tmp/sensor_a /tmp/sensor_b</code>. Viết chương trình mở ' +
           'cả hai — <code>open(sensor_a)</code> trước, <code>open(sensor_b)</code> sau — rồi ' +
           'vào vòng lặp <code>read(fd_a)</code> · <code>read(fd_b)</code>. Chạy nó ở nền và ' +
           'xem output.\n\n' +
           '<b>Chương trình in ra đúng một dòng: <code>opening sensor_a...</code></b> Rồi đứng ' +
           'im. Nó chưa hề tới được <code>read</code>, thậm chí chưa tới được lời ' +
           '<code>open</code> thứ hai. Mở một FIFO với <code>O_RDONLY</code> sẽ <i>chặn</i> cho ' +
           'tới khi có ai đó mở đầu ghi — đó là cơ chế bắt tay của FIFO, đúng như thiết kế, và ' +
           'ở đây nó biến thành cái bẫy.\n\n' +
           'Bây giờ chỉ ghi vào <b>b</b>: <code>echo "b1" &gt; /tmp/sensor_b &amp;</code>. ' +
           'Tuyệt đối không có gì xảy ra. Output không thêm một ký tự nào. Cái ' +
           '<code>echo</code> đó cũng đang chặn nốt — nó đợi một người đọc mà người đọc thì ' +
           'đang mắc kẹt ở FIFO khác.\n\n' +
           'Ghi vào <b>a</b>: <code>echo "a1" &gt; /tmp/sensor_a &amp;</code>. Mọi thứ bung ra ' +
           'một lượt — <code>opened a = 3</code>, <code>opened b = 4</code>, ' +
           '<code>from a: a1</code>, <code>from b: b1</code>. Dòng của b đã nằm sẵn chờ suốt ' +
           'từ nãy; nó chỉ được phục vụ khi a chịu tới trước.\n\n' +
           '<b>Bản chất:</b> một lời gọi chặn — <code>open</code> hay <code>read</code>, không ' +
           'khác nhau — chỉ theo dõi được <i>một</i> mô tả file. Thứ tự bạn phục vụ chúng là ' +
           'thứ tự bạn viết trong mã nguồn, và dữ liệu thì không thèm biết tới thứ tự đó. Điểm ' +
           'đáng nhớ là chỗ hỏng xuất hiện sớm hơn ta tưởng một bước: người ta thường dự đoán ' +
           '"nó sẽ kẹt ở <code>read(fd_a)</code>", còn thực tế nó kẹt ngay ở ' +
           '<code>open(fd_a)</code>.\n\n' +
           '<b>Hướng 1 — một luồng cho mỗi FIFO.</b> Mỗi luồng chặn trên mô tả file của riêng ' +
           'nó, nên không ai chặn ai. Dễ hiểu, dễ viết. Cái giá: mọi thứ chúng chia sẻ giờ phải ' +
           'có mutex; mỗi luồng tốn ngăn xếp riêng; và với hai nguồn thì ổn, với hai trăm nguồn ' +
           'thì đây là một thiết kế tồi.\n\n' +
           '<b>Hướng 2 — một cơ chế đợi nhiều mô tả file cùng lúc.</b> Bảo nhân "đánh thức tôi ' +
           'khi <i>bất kỳ</i> cái nào trong danh sách này có dữ liệu". Một luồng, không tranh ' +
           'chấp, mở rộng tốt. Cái giá: cấu trúc chương trình đổi hẳn sang hướng sự kiện; mỗi ' +
           'lời gọi trả về một tập mô tả file sẵn sàng mà bạn phải tự phân phối; và bạn vẫn ' +
           'phải xử lý cái bẫy <code>open</code> ở trên — mở bằng <code>O_RDWR</code> hoặc ' +
           '<code>O_NONBLOCK</code> để tới được vòng lặp đã. Đây là cách gần như mọi máy chủ và ' +
           'daemon thật đều dùng.\n\n' +
           '<b>Cái không phải câu trả lời:</b> mở với <code>O_NONBLOCK</code> rồi quay vòng hỏi ' +
           'liên tục. Nó "chạy được", nhưng ngốn 100 % một lõi CPU để chờ những thứ hầu như ' +
           'không xảy ra. Trên thiết bị chạy pin thì đó không phải giải pháp, đó là lỗi thiết ' +
           'kế. Dùng <code>O_NONBLOCK</code> để <i>mở</i> rồi đi ngủ trong <code>poll</code> ' +
           'thì đúng; dùng nó để hỏi vòng thì sai.\n\n' +
           'Ba cái tên bạn cần cho hướng 2 là <code>select</code>, <code>poll</code> và ' +
           '<code>epoll</code> — chúng khác nhau ở giới hạn số mô tả file và ở chi phí mỗi lời ' +
           'gọi. Đó là toàn bộ nội dung Bài 24. Dọn dẹp trước khi rời đi: ' +
           '<code>rm /tmp/sensor_a /tmp/sensor_b</code>.',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'text',
          code: '--- sau khi chay chuong trinh, chua ai ghi gi ---\n' +
                'opening sensor_a...\n' +
                '--- chi ghi vao b ---\n' +
                'opening sensor_a...\n' +
                '--- gio ghi vao a ---\n' +
                'opening sensor_a...\n' +
                'opened a = 3\n' +
                'opening sensor_b...\n' +
                'opened b = 4\n' +
                'from a: a1\n' +
                'from b: b1' }
      ] },
  ],

  diag: [
    ['A1, B1, C1, E3',
     'Bạn còn coi <b>bảng thông lượng là bằng chứng</b>. MB/s và µs/khối là hai cách viết của ' +
     'cùng một phép đo bằng đồng hồ, nên chúng dao động cùng nhau — pipe trải 518–3 969 MB/s ' +
     'qua 16 lần chạy. Đại lượng <b>đếm</b> được (2 001 syscall so với 1) mới là thứ bảo vệ ' +
     'được một quyết định thiết kế.',
     '<a href="#/bai-23#do-that-co-che-nao-nhanh-hon-co-che-nao-va-nhanh-hon-bao-nhi">Đọc lại Bài 23 — Đo thật: cơ chế nào nhanh hơn cơ chế nào</a> · ' +
     '<a href="#/bai-23#bang-chon-co-che-cau-hoi-nao-dan-toi-cau-tra-loi-nao">Bảng chọn cơ chế</a>'],

    ['A4, B2, C2, D3, E2',
     'Bạn còn tin <b>MMU bảo vệ hộ bạn</b>. Nó vẫn canh gác — nhưng chỉ ngăn bạn chạm vào ' +
     'vùng <i>chưa</i> được ánh xạ. Vùng đã ánh xạ chung thì nó không có ý kiến, và ' +
     '<code>race_unsafe</code> mất 127 354 tới 196 835 trên 400 000 để chứng minh điều đó.',
     '<a href="#/bai-23#cai-gia-cua-toc-do-race-condition-quay-tro-lai-lan-nay-giua-">Đọc lại Bài 23 — Cái giá của tốc độ: race condition quay trở lại</a> · ' +
     '<a href="#/bai-23#bo-nho-chia-se-posix-ba-loi-goi-roi-nhan-rut-lui">Bộ nhớ chia sẻ POSIX: ba lời gọi rồi nhân rút lui</a>'],

    ['A7, B3, C3, E4',
     'Bạn còn nghĩ <b>tiến trình chết thì nhân dọn hết</b>. Đối tượng IPC POSIX gắn vòng đời ' +
     'với cái <i>tên</i>, không với tiến trình — và vì <code>SIGKILL</code> không bắt được, ' +
     'dọn dẹp trong tay xử lý <code>SIGTERM</code> là lớp phòng bệnh <i>thứ hai</i>, không ' +
     'phải lớp thật.',
     '<a href="#/bai-23#bo-nho-chia-se-posix-ba-loi-goi-roi-nhan-rut-lui">Đọc lại Bài 23 — Bộ nhớ chia sẻ POSIX</a> · ' +
     '<a href="#/bai-23#loi-thuong-gap">Lỗi thường gặp</a>'],

    ['A2',
     'Bạn còn lẫn <b>65 536 với 4 096</b>. Chúng trả lời hai câu hỏi khác nhau: 65 536 là sức ' +
     'chứa (ghi quá thì bị chặn), 4 096 là <code>PIPE_BUF</code> — ngưỡng dưới đó nhân bảo ' +
     'đảm một lời <code>write</code> vào trọn vẹn, không bị ai chen giữa.',
     '<a href="#/bai-23#pipe-chua-duoc-bao-nhieu-va-chuyen-gi-xay-ra-khi-no-day">Đọc lại Bài 23 — Pipe chứa được bao nhiêu, và chuyện gì xảy ra khi nó đầy</a>'],

    ['A3, C4, E1',
     'Bạn chưa nắm <b>hành vi chặn của <code>open</code> trên FIFO</b>, và chưa nắm tính bất ' +
     'đối xứng của <code>O_NONBLOCK</code>: mở đọc thì thành công ngay, mở ghi mà chưa có ' +
     'người đọc thì hỏng với <code>ENXIO</code>. Đây là nguyên nhân số một của "daemon treo ' +
     'lúc khởi động".',
     '<a href="#/bai-23#fifo-pipe-co-ten-cho-hai-chuong-trinh-xa-la">Đọc lại Bài 23 — FIFO: pipe có tên cho hai chương trình xa lạ</a>'],

    ['A5, B6',
     'Bạn còn coi vùng nhớ chia sẻ là một <b>thứ trừu tượng của nhân</b>. Nó là một file trên ' +
     'tmpfs: <code>shm_open</code> chỉ gọi <code>openat</code> trên ' +
     '<code>/dev/shm/&lt;tên&gt;</code>, nên <code>ls</code>, <code>df</code>, ' +
     '<code>hexdump</code> và <code>rm</code> đều dùng được — và <code>ftruncate</code> là bắt ' +
     'buộc vì file mới tạo dài 0 byte.',
     '<a href="#/bai-23#bo-nho-chia-se-posix-ba-loi-goi-roi-nhan-rut-lui">Đọc lại Bài 23 — Bộ nhớ chia sẻ POSIX: ba lời gọi rồi nhân rút lui</a>'],

    ['A6, C5',
     'Bạn còn đọc sức chứa pipe như một con số vô hại. 65 536 byte quyết định <b>chịu được ' +
     'bao lâu</b> khi bên nhận bận: ở 20 MB/s, pipe đầy sau chưa tới 4 ms. Đỉnh tức thời và ' +
     'độ sâu bộ đệm mới là thứ giết bạn, không phải thông lượng trung bình.',
     '<a href="#/bai-23#pipe-chua-duoc-bao-nhieu-va-chuyen-gi-xay-ra-khi-no-day">Đọc lại Bài 23 — Pipe chứa được bao nhiêu</a> · ' +
     '<a href="#/bai-23#pipe-vo-danh-co-che-don-gian-nhat-va-ban-da-dung-no-hang-tra">Pipe vô danh</a>'],

    ['A8, B4, C1',
     'Bạn còn chọn cơ chế theo <b>tốc độ</b>. pipe và FIFO chênh chưa tới 1,4 lần và hai dải ' +
     'đo chồng lên nhau — tiêu chí thật là quan hệ họ hàng, quyền truy cập và vòng đời. Tốc độ ' +
     'chỉ trở thành tiêu chí khi hội đủ dữ liệu lớn, tần suất dày và cần trễ ổn định.',
     '<a href="#/bai-23#bang-chon-co-che-cau-hoi-nao-dan-toi-cau-tra-loi-nao">Đọc lại Bài 23 — Bảng chọn cơ chế: câu hỏi nào dẫn tới câu trả lời nào</a> · ' +
     '<a href="#/bai-23#fifo-pipe-co-ten-cho-hai-chuong-trinh-xa-la">FIFO: pipe có tên</a>'],

    ['B5, E5',
     'Bạn còn <b>đoán giới hạn của hệ thống thay vì hỏi nó</b>. <code>msg_max</code> là 10, ' +
     '<code>msgsize_max</code> là 8192 — đoán sai thì <code>mq_open</code> trả ' +
     '<code>EINVAL</code> và <code>mq_receive</code> trả <code>EMSGSIZE</code>. ' +
     '<code>mq_getattr</code> tồn tại chính vì lý do đó.',
     '<a href="#/bai-23#hang-doi-thong-diep-khi-thu-tu-khong-phai-la-thu-tu-den">Đọc lại Bài 23 — Hàng đợi thông điệp: khi thứ tự không phải là thứ tự đến</a>'],

    ['B2, C2',
     'Bạn còn nghĩ đặt mutex vào vùng chia sẻ là <b>đủ</b>. Mặc định là ' +
     '<code>PTHREAD_PROCESS_PRIVATE</code>, và glibc dựa vào giả định đó — triệu chứng là ' +
     'assertion ở <code>pthread_mutex_lock.c:88</code>, hoặc tệ hơn, không triệu chứng gì cả.',
     '<a href="#/bai-23#cai-gia-cua-toc-do-race-condition-quay-tro-lai-lan-nay-giua-">Đọc lại Bài 23 — Cái giá của tốc độ</a> · ' +
     '<a href="#/bai-23#loi-thuong-gap">Lỗi thường gặp</a>'],

    ['C3, E4',
     'Bạn chưa có <b>phản xạ tìm rò rỉ IPC</b>. <code>ps</code> và <code>valgrind</code> đều ' +
     'mù trước loại rò rỉ này vì cả hai chỉ nhìn bên trong một tiến trình. Ba lệnh cần thuộc: ' +
     '<code>ls -l /dev/shm/</code>, <code>ls -l /dev/mqueue/</code>, ' +
     '<code>df -h /dev/shm</code>.',
     '<a href="#/bai-23#bo-nho-chia-se-posix-ba-loi-goi-roi-nhan-rut-lui">Đọc lại Bài 23 — Bộ nhớ chia sẻ POSIX</a> · ' +
     '<a href="#/bai-23#semaphore-dem-so-cho-khong-chuyen-du-lieu">Semaphore: đếm số chỗ, không chuyển dữ liệu</a>'],

    ['D1',
     'Bạn còn lẫn <code>printf</code> với <code>write</code>. Một cái ghi vào bộ đệm của thư ' +
     'viện C, một cái là syscall — và khi đầu ra là pipe chứ không phải terminal, ' +
     '<code>\\n</code> không còn kích hoạt xả bộ đệm nữa.',
     '<a href="#/bai-19#syscall-thuan-va-stdio-co-dem-cung-ket-qua-khac-358-lan-so-s">Đọc lại Bài 19 — Syscall thuần và stdio có đệm</a> · ' +
     '<a href="#/bai-19#nam-lenh-goi-nen-tang-open-read-write-close-lseek">Năm lệnh gọi nền tảng: open, read, write, close, lseek</a>'],

    ['D2, A7',
     'Bạn còn tin có cách bắt được <code>SIGKILL</code>. Nó và <code>SIGSTOP</code> là hai ' +
     'tín hiệu duy nhất không chặn, không bắt, không bỏ qua được — và đó là lý do kỹ thuật ' +
     'khiến dọn dẹp IPC phải nằm ở <b>cả hai</b> đầu vòng đời.',
     '<a href="#/bai-21#danh-muc-tin-hieu-can-thuoc">Đọc lại Bài 21 — Danh mục tín hiệu cần thuộc</a> · ' +
     '<a href="#/bai-21#tat-em-ban-hop-dong-giua-sigterm-va-sigkill">Tắt êm — bản hợp đồng giữa SIGTERM và SIGKILL</a>'],

    ['E6',
     'Bạn chưa thấy giới hạn của <code>read()</code> chặn: nó chỉ đợi được <b>một</b> mô tả ' +
     'file, nên thứ tự phản ứng do mã nguồn quyết định chứ không do dữ liệu. Đây đúng là câu ' +
     'hỏi mà Bài 24 trả lời.',
     '<a href="#/bai-23#fifo-pipe-co-ten-cho-hai-chuong-trinh-xa-la">Đọc lại Bài 23 — FIFO: pipe có tên cho hai chương trình xa lạ</a>']
  ]
});

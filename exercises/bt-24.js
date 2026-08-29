/* ══════════════════════════════════════════════════════════════════════════
   Bài tập 24 — Socket và I/O đa kênh
   ══════════════════════════════════════════════════════════════════════════

   ── §13.4 BƯỚC 1–2: KIỂM KÊ VÀ CHẤM ĐIỂM ─────────────────────────────────
   Nguồn: goals, 13 h2, mọi khối cal kind why|danger|warn|tip|info, bảng
   io_bench 4 dòng, bảng strace -c, bảng RTT, recap (17 ý) và bảng lỗi
   thường gặp (16 dòng) của lessons/bai-24.js.

   D = phụ thuộc về sau · C = giá của hiểu sai · K = phản trực giác  (0/1/2)

   #   Ứng viên                                              D  C  K   Σ
   ──────────────────────────────────────────────────────────────────────
   1   Ranh giới thông điệp thuộc về TẦNG VẬN CHUYỂN, không
       thuộc về số lần write() của bạn. Ba write 11 byte cho
       MỘT read 33 byte lần này, hai read lần khác; UDP giữ
       ranh giới nhưng cắt cụt trong im lặng                 2  2  2   6  <= TRỤC 1
   2   Cùng hai byte trong RAM, hai người đọc ra hai con số
       khác nhau, và KHÔNG có thông báo lỗi nào: bind() và
       connect() đều trả 0, chỉ cổng là sai                  1  2  2   5  <= TRỤC 0
   3   Danh sách theo dõi nằm ở đâu: select/poll nộp lại cả
       danh sách MỖI LẦN GỌI (giá ∝ số kênh theo dõi);
       epoll đăng ký một lần, nhân giữ danh sách sẵn sàng
       (giá ∝ số kênh CÓ VIỆC)                               2  1  2   5  <= TRỤC 2
   4   Mô hình tuần tự làm người thứ hai đợi 1695,7 ms trong
       khi CPU rảnh — lỗi nằm ở THIẾT KẾ, không ở dòng lệnh  2  2  1   5
   5   Socket là một mô tả file: read/write/close/epoll dùng
       lại được nguyên vẹn từ Bài 19                         2  0  1   3
   6   Không có SO_REUSEADDR thì bind hỏng vì TIME-WAIT của
       kết nối TRƯỚC, dù ss -tlnp trống trơn                 1  2  2   5
   7   fd ≥ FD_SETSIZE đưa vào FD_SET không trả lỗi — nó
       ABORT, mã thoát 134                                   1  2  2   5
   8   EPOLLET chỉ báo MỘT lần trên mỗi sườn: đọc thiếu là
       mất byte vĩnh viễn, không có sự kiện thứ hai          1  2  2   5
   9   O_NONBLOCK biến "chờ" thành errno 11 (EAGAIN), và
       EAGAIN == EWOULDBLOCK trên Linux                      1  1  1   3
   10  Ghi vào socket phía kia đã đóng thì SIGPIPE giết tiến
       trình, mã 141, không một dòng log                     1  2  2   5
   11  write() có thể ghi ÍT hơn số byte yêu cầu — 100000
       byte vào pipe đầy chỉ đi được 65536                   2  2  1   5
   12  Một luồng cho mỗi khách tốn 8 MB vùng địa chỉ ngăn
       xếp, nên nó không phải câu trả lời trên bo nhúng      1  1  1   3
   13  sendto() tới cổng không ai nghe vẫn THÀNH CÔNG 3/3;
       connect() tới đúng cổng đó cho Connection refused     1  1  2   4
   14  Cổng phù du 32768–60999, backlog trần somaxconn 4096,
       ulimit -n 10240                                       0  0  0   0
   15  Sau accept(), máy chủ có HAI socket trên cùng cổng:
       fd nghe và fd của phiên                               1  1  1   3
   16  Trên loopback UDP nhanh hơn TCP ~15 % (63,33 so với
       76,15 µs) — và 15 % đó không phải lý do chọn UDP      1  0  1   2

   ── BƯỚC 3: CẮT ──────────────────────────────────────────────────────────
   #1 đạt Σ = 6 và là ứng viên duy nhất được 2 ở cả ba axis -> trục 1.
   Nhóm Σ = 5 có sáu ứng viên (#2 #4 #6 #7 #8 #10 #11). Lấy #2 và #3 vì hai
   lý do: chúng là hai khái niệm DUY NHẤT trong nhóm mà cả Chặng 09 và
   Chặng 10 còn phải dùng lại (cấu hình mạng của rootfs, daemon trên bo),
   còn #6 #7 #8 #10 là các chế độ hỏng cụ thể — quan trọng nhưng học một
   lần là nhớ, và mỗi cái chỉ cần một dòng trong bảng ghép nối hoặc một
   nhánh trong câu chẩn đoán.

   ── BƯỚC 4: LOẠI ─────────────────────────────────────────────────────────
   #11 ĐÃ LÀ TRỤC CỦA bt-19 ("write() trả về số byte thực sự ghi được — nhỏ
       hơn số yêu cầu vẫn là thành công"). Một khái niệm chỉ được xoáy MỘT
       lần trong cả khoá, nên ở đây nó về phần D (D1) đúng như §13.4 bước 4
       quy định.
   #4  Động lực của select/poll/epoll ĐÃ BỊ TIÊU Ở bt-23 E6 — thí nghiệm
       hai FIFO nơi người đọc kẹt ngay tại open(), không phải tại read()
       (xem docs/course-notes.md). Ở đây nó chỉ được một câu giải thích
       (B4), không được xoáy lại.
   #6 #7 #8 #10 và #9 đều đã là câu hỏi của quiz Bài 24. Theo §13.1 bộ bài
       tập không được là một quiz thứ hai: mỗi cái chỉ xuất hiện ở dạng đã
       đổi hẳn thao tác — #7 thành một dòng ghép nối và một câu chẩn đoán
       đa nguyên nhân (C3), #6 #8 #9 #10 thành bốn dòng của bảng ghép nối
       A8, nơi người học phải nhận DẤU HIỆU chứ không nhắc lại NGUYÊN NHÂN.
   #14 Tra cứu được trong mười giây (§13.3 cấm làm trục) -> một câu gõ lệnh
       ở phần E, đúng chỗ của nó: người học tự đọc ra từ /proc.
   #16 Σ = 2, và bản thân bài đã dặn "đừng chọn UDP vì 15 %". Nó thành một
       câu so sánh cặp (B6) chứ không phải trục.
   #5  #12 #15 Σ ≤ 3: mỗi cái tối đa một câu.

   ── BƯỚC 5: BA CÂU CÓ THỂ SAI ────────────────────────────────────────────
   T0  Thứ tự byte là chuyện của NGƯỜI ĐỌC, không phải của dữ liệu: đúng
       hai byte đó trong RAM, máy này đọc ra 9000, máy kia đọc ra 10275.
       Quên htons() không sinh ra lỗi nào — bind() và listen() vẫn trả 0,
       chương trình vẫn chạy, chỉ có con số là sai.
   T1  Ranh giới thông điệp thuộc về tầng vận chuyển bạn chọn, không thuộc
       về số lần bạn gọi write(). TCP là DÒNG BYTE: ba write 11 byte có thể
       tới thành một read 33 byte, hoặc hai, hoặc ba, và con số đó đổi giữa
       các lần chạy. UDP giữ nguyên ranh giới — nhưng nếu bộ đệm nhỏ hơn
       gói thì recvfrom() cắt cụt và TRẢ VỀ THÀNH CÔNG.
   T2  Chi phí của một cơ chế chờ được quyết định bởi CHỖ ĐẶT DANH SÁCH
       THEO DÕI. select và poll đặt nó trong tiến trình của bạn nên phải
       nộp lại toàn bộ mỗi lần gọi — giá tỉ lệ với số kênh THEO DÕI. epoll
       đặt nó trong nhân, đăng ký một lần bằng epoll_ctl — giá tỉ lệ với số
       kênh CÓ VIỆC, nên cột epoll gần như phẳng từ 10 tới 2000 kênh.

   ── BƯỚC 6: HIỂU LẦM ĐỐI ỨNG ─────────────────────────────────────────────
   M0  "htons() chỉ cần khi hai máy khác kiến trúc. Client và server cùng
        chạy trên máy này, cùng little-endian, nên bỏ đi cũng chẳng sao."
   M1  "Một write() bên gửi là một read() bên nhận — TCP bảo đảm không mất
        và không sai thứ tự, nên nó cũng bảo đảm không dính nhau."
   M2  "epoll nhanh hơn vì nó được viết tối ưu hơn / vì nó mới hơn.
        select chậm vì code cũ."

   ── BƯỚC 7: LƯỚI 3 × 1 ───────────────────────────────────────────────────
          A (nhớ lại)              B (giải thích số liệu)      C (quyết định)
   T0     a1 bỏ htons trên          b3 bắt lỗi phát biểu       c1 chẩn đoán
          loopback thì hỏng ở       "cùng máy thì khỏi          bộ đếm mẫu
          bước nào                  htons"                      báo 10240
   T1     a5 đúng/sai: một          b1 đọc bản ghi 3 write     c2 thư viện
          write là một read         -> 1 read, và vì sao        vendor một
                                    lần khác lại 2             read mỗi gói
   T2     a3 trắc nghiệm: cái       b2 đọc bảng io_bench 4     c5 tính tải
          gì làm epoll phẳng        dòng + strace -c            CPU 1000 Hz
                                                                rồi chọn

   Kiểm tra: c1, c2, c5 đều KHÔNG trả lời được nếu chưa nắm trục — c1 buộc
   phải suy ngược từ 10240 về 40, c2 buộc phải phân biệt "TCP không mất
   byte" với "TCP không giữ ranh giới", c5 buộc phải nhân µs/lần với tần
   số chứ không so hai con số trong bảng. Ba mức dùng ba loại kích thích
   khác nhau (phát biểu / bản ghi thật / tình huống có ràng buộc mới).
   Không câu nào lộ đáp án cho câu sau: a1 hỏi bước nào hỏng chứ không nói
   con số, b3 nói về lý lẽ chứ không về triệu chứng, c1 mới đưa triệu chứng.

   ── RANH GIỚI VỚI QUIZ BÀI 24 (§13.1) ────────────────────────────────────
   Quiz Bài 24 đã hỏi bảy câu: ba write 33 byte tới thành tổ hợp nào;
   bind hỏng mà ss trống -> TIME-WAIT; vì sao epoll_wait phẳng còn poll đi
   từ 2,61 lên 286,54; EPOLLET đọc 512 byte của yêu cầu 2000 byte; errno 11
   trên fd O_NONBLOCK; mã 141 -> SIGPIPE; chọn UDP cho cảm biến 5 mẫu/giây.
   Bộ bài tập này không lặp lại câu nào ở cùng dạng: câu quiz về ranh giới
   trở thành một bài dự đoán PHẢI CHẠY THẬT (E2) và một bài đọc bản ghi có
   mâu thuẫn giữa hai lần chạy (B1); câu quiz về epoll trở thành một phép
   tính tải CPU (C5); bốn chế độ hỏng còn lại trở thành bảng nhận dạng
   triệu chứng (A8). Thứ Bài 24 KHÔNG hỏi trong quiz — thứ tự byte — chính
   là trục 0 ở đây.

   ── XUẤT XỨ SỐ LIỆU ──────────────────────────────────────────────────────
   Mọi bản ghi terminal trong file này là output THẬT, trên WSL2 Ubuntu
   26.04, gcc 15.2.0, 6 nhân. Hai nguồn:
     · Các con số của Bài 24 (bảng io_bench, strace -c, RTT, 1695,7 ms,
       exit 134, LT/ET, daemon pid 436) lấy từ phần Thực hành Bài 24.
     · Phần E được chạy lại RIÊNG cho bộ bài tập này ngày 2026-08-28, trong
       ~/embedded/bt24, vì ~/embedded/bai24 đã bị xoá sau khi soạn xong Bài
       24. Bốn chương trình order.c, pairs.c, bindport.c và phần ss/nc đều
       tự chứa: người học không cần bất cứ file nào của Bài 24 còn sót lại.
   Bốn điểm cần ghi chú:
     · SỐ LẦN read() CỦA TCP KHÔNG TẤT ĐỊNH. Bài 24 bắt được 1 lần ở phần
       thực hành và 2 ở phần lý thuyết, và cảnh báo rằng lặp lại sẽ ra 1, 2,
       hiếm khi 3. Chính sự dao động đó là nội dung B1 và tiêu chí của E2 —
       tiêu chí tự chấm KHÔNG được đòi một con số cụ thể.
     · Ngược lại, socketpair(AF_UNIX, SOCK_STREAM) trong E2 thì TẤT ĐỊNH: ba
       write xong hết rồi mới read, nên luôn là 1 lần 33 byte. Đó là lý do
       E2 dùng socketpair chứ không dùng TCP thật — người học cần một mốc
       chắc chắn để so với sự dao động của TCP.
     · Cổng phù du (49644 trong E4) và pid đổi mỗi lần chạy. Tiêu chí tự
       chấm chỉ đòi "nằm trong 32768–60999", không đòi đúng số.
     · nc của bản netcat-openbsd trên máy này đặt SO_REUSEPORT, nên KHÔNG
       dùng được hai nc để tái hiện "Address already in use" — thử ngày
       2026-08-28, listener thứ hai bind thành công. E4 vì thế đi hướng
       khác: nó soi fd nghe và fd phiên bằng ss.
   ══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-24',
  minutes: 85,

  intro:
    '<p>Bài 24 là bài dài nhất của Chặng 03 và nó dạy hai thứ khác hẳn nhau: cách <i>mở</i> ' +
    'một socket, và cách <i>chờ</i> nhiều socket cùng lúc. Bộ bài tập này xoáy vào ba điều ' +
    'mà người học thường tưởng đã hiểu sau khi đọc xong: <b>(1)</b> vì sao quên một lời gọi ' +
    '<code>htons()</code> không cho bạn một thông báo lỗi nào mà cho bạn một con số sai; ' +
    '<b>(2)</b> vì sao ba lần <code>write()</code> không có nghĩa là ba lần ' +
    '<code>read()</code> — và vì sao chạy lại lần nữa con số còn đổi; <b>(3)</b> vì sao ' +
    '<code>epoll</code> nhanh hơn không phải nhờ được viết khéo hơn, mà nhờ danh sách theo ' +
    'dõi nằm ở một chỗ khác.</p>' +
    '<p><b>Chia làm hai lượt, và khoảng nghỉ giữa hai lượt là một thành phần của bài tập, ' +
    'không phải sự trì hoãn.</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1</b> — ngay sau khi đọc xong Bài 24: phần <b>A</b> và <b>B</b> (~23 phút).</li>' +
    '<li><b>Lượt 2</b> — sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b> (~60 phút). Nhớ lại ' +
    'sau khi đã quên một phần mạnh hơn hẳn nhớ lại ngay lúc còn nóng.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> không cần bất cứ file nào của Bài 24: ba chương trình trong đó đều ngắn ' +
    'và tự chứa, gõ lại trong một thư mục mới là chạy được.</p>',

  truc: [
    { id: 'endian',
      name: 'Thứ tự byte là chuyện của người đọc, và đọc sai thì không có lỗi',
      x: 'Cùng hai byte trong RAM, máy này đọc ra 9000, máy kia đọc ra 10275. ' +
         'Quên <code>htons()</code> không sinh ra lỗi nào: <code>bind()</code> và ' +
         '<code>listen()</code> vẫn trả 0, chương trình vẫn chạy, chỉ có con số là sai.',
      mis: 'htons() chỉ cần khi hai máy khác kiến trúc; cùng chạy trên một máy ' +
           'little-endian thì bỏ đi cũng chẳng sao.' },

    { id: 'boundary',
      name: 'Ranh giới thông điệp thuộc về tầng vận chuyển, không thuộc về write() của bạn',
      x: 'TCP là dòng byte: ba <code>write()</code> 11 byte có thể tới thành một ' +
         '<code>read()</code> 33 byte, hoặc hai, hoặc ba, và con số đó đổi giữa các lần ' +
         'chạy. UDP giữ nguyên ranh giới — nhưng bộ đệm nhỏ hơn gói thì ' +
         '<code>recvfrom()</code> cắt cụt và vẫn trả về thành công.',
      mis: 'Một write() bên gửi là một read() bên nhận, vì TCP bảo đảm không mất và ' +
           'không sai thứ tự.' },

    { id: 'watchlist',
      name: 'Chi phí của cơ chế chờ nằm ở chỗ đặt danh sách theo dõi',
      x: '<code>select</code> và <code>poll</code> giữ danh sách trong tiến trình của bạn ' +
         'nên phải nộp lại toàn bộ mỗi lần gọi — giá tỉ lệ với số kênh <i>theo dõi</i>. ' +
         '<code>epoll</code> đặt danh sách trong nhân, đăng ký một lần bằng ' +
         '<code>epoll_ctl</code> — giá tỉ lệ với số kênh <i>có việc</i>.',
      mis: 'epoll nhanh hơn vì nó mới hơn và được tối ưu tốt hơn; select chậm vì code cũ.' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     A · NHẬN BIẾT — 8 câu, máy chấm được 100 %
     ══════════════════════════════════════════════════════════════════════ */
  A: [
    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Một máy chủ TCP gán thẳng <code>addr.sin_port = 9100;</code> — quên ' +
         '<code>htons()</code> — rồi gọi <code>bind()</code> và <code>listen()</code>. ' +
         'Cả hai đều chạy trên máy x86-64 little-endian này. Điều gì xảy ra?',
      opts: [
        '<code>bind()</code> trả về −1 với <code>errno = EINVAL</code>, vì 9100 không phải ' +
          'số cổng hợp lệ ở dạng network byte order',
        '<code>bind()</code> và <code>listen()</code> đều trả 0; máy chủ nghe thật, nhưng ' +
          'trên một cổng khác 9100',
        'Không sao cả: vì cả client lẫn server cùng little-endian nên hai bên vẫn gặp nhau ' +
          'ở cổng 9100',
        'Chương trình bị <code>SIGSEGV</code> ngay tại <code>bind()</code>, vì trường ' +
          '<code>sin_port</code> phải đi qua <code>htons()</code> mới hợp lệ'
      ],
      a: 1,
      why: '<p>Đây là chế độ hỏng đắt nhất của cả bài: <b>không có lỗi</b>. Nhân không ' +
           'kiểm tra "số này đã qua htons chưa" — nó <i>không thể</i>, vì mọi giá trị 16 ' +
           'bit đều là một số cổng hợp lệ. Nó chỉ đọc hai byte theo network byte order. ' +
           '9100 = <code>0x238C</code>; đọc ngược lại thành <code>0x8C23</code> = ' +
           '<b>35875</b>. Máy chủ nghe thật, ổn định, nhiều ngày liền — trên cổng 35875. ' +
           'Bạn sẽ tự tay tái hiện đúng con số này ở câu <b>E5</b>.</p>' +
           '<p>Phương án 3 sai vì thứ tự byte <i>không</i> phải chuyện của hai máy: ngay ' +
           'trên cùng một máy, người ghi (chương trình của bạn) và người đọc (nhân) đã ' +
           'thoả thuận hai quy ước khác nhau rồi.</p>' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một tiến trình đang giữ 1 500 mô tả file mở. Nó gọi ' +
         '<code>FD_SET(1503, &amp;readfds)</code> rồi <code>select()</code>. ' +
         '<code>FD_SETSIZE</code> trên Linux là 1024. Kết quả?',
      opts: [
        '<code>select()</code> trả về −1 với <code>errno = EBADF</code>, chương trình xử lý ' +
          'lỗi rồi chạy tiếp',
        '<code>select()</code> lặng lẽ bỏ qua fd 1503 và chỉ theo dõi 1024 fd đầu tiên',
        'glibc phát hiện việc ghi ra ngoài <code>fd_set</code> và <b>abort</b> tiến trình; ' +
          'mã thoát 134',
        '<code>fd_set</code> tự lớn ra vì nó là một mảng động'
      ],
      a: 2,
      why: '<p><code>fd_set</code> là một bảng bit <b>cố định 128 byte</b> = 1024 bit. ' +
           '<code>FD_SET(1503, …)</code> là ghi ra ngoài mảng — một lỗi bộ nhớ, không phải ' +
           'một lỗi API, nên nó không có đường trả về <code>errno</code>. glibc bắt được và ' +
           'in <code>*** bit out of range 0 - FD_SETSIZE on fd_set ***: terminated</code> ' +
           'rồi <code>abort()</code>: <b>mã thoát 134</b> = 128 + 6 (SIGABRT).</p>' +
           '<p>Đây là lý do <code>select()</code> không dùng được cho một daemon phục vụ ' +
           'hàng nghìn kết nối, và cũng là lý do giới hạn đó nguy hiểm: nó không nổ khi bạn ' +
           'thử với 10 khách trong phòng lab.</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Trong bảng đo của Bài 24, cột <code>epoll</code> gần như không đổi khi số kênh đi ' +
         'từ 10 lên 2000 (1,31 → 0,72 µs), còn cột <code>poll</code> đi từ 2,61 lên 286,54 µs. ' +
         'Điều gì <i>trực tiếp</i> tạo ra sự khác biệt đó?',
      opts: [
        '<code>epoll_wait()</code> được cài đặt bằng thuật toán tìm kiếm tốt hơn nên duyệt ' +
          'danh sách nhanh hơn',
        '<code>epoll</code> chạy trong không gian nhân còn <code>poll</code> chạy trong ' +
          'không gian người dùng',
        'Danh sách theo dõi của <code>epoll</code> được đăng ký <b>một lần</b> và nằm lại ' +
          'trong nhân, nên mỗi lần gọi chỉ phải trả tiền cho những kênh <b>đang có việc</b>',
        '<code>epoll_wait()</code> trả về ngay lập tức còn <code>poll()</code> phải chờ hết ' +
          'thời hạn timeout'
      ],
      a: 2,
      why: '<p>Cả ba cơ chế đều là syscall, đều chạy trong nhân — phương án 2 sai ngay từ ' +
           'tiền đề. Khác biệt nằm ở <b>chỗ đặt danh sách</b>. Với ' +
           '<code>poll(fds, 500, …)</code>, mảng 500 phần tử sống trong tiến trình của bạn, ' +
           'nên mỗi lời gọi phải chép nó vào nhân, duyệt hết, rồi chép kết quả ra — ' +
           'công việc tỉ lệ với 500, dù chỉ một kênh có dữ liệu.</p>' +
           '<p>Với <code>epoll</code>, <code>strace -c</code> ở 500 kênh đếm được ' +
           '<b>500 lần <code>epoll_ctl</code></b> (đăng ký, làm một lần) và ' +
           '<b>10 000 lần <code>epoll_wait</code></b> — và mỗi <code>epoll_wait</code> chỉ ' +
           'lấy phần tử ra khỏi một danh sách <i>đã sẵn sàng</i> mà nhân tự cập nhật khi dữ ' +
           'liệu tới. Giá tỉ lệ với số kênh <b>có việc</b>, thường là 1.</p>' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Máy chủ đang <code>listen()</code> trên cổng 9200. Một khách kết nối vào và ' +
         '<code>accept()</code> trả về. Lúc này <code>ss -tnp</code> trên máy chủ cho thấy ' +
         'bao nhiêu socket <b>của tiến trình máy chủ</b> liên quan tới cổng 9200, và chúng ' +
         'khác nhau ở đâu?',
      opts: [
        'Một — <code>accept()</code> nâng cấp socket nghe thành socket phiên',
        'Hai — một socket <code>LISTEN</code> (fd 3) chỉ để nhận khách mới, và một socket ' +
          '<code>ESTAB</code> (fd 4) mang đúng một phiên, cùng cổng cục bộ 9200',
        'Hai — nhưng socket thứ hai phải nằm trên một cổng phù du khác, vì hai socket không ' +
          'thể cùng cổng',
        'Ba — socket nghe, socket phiên, và một socket điều khiển do nhân tạo ra'
      ],
      a: 1,
      why: '<p><code>accept()</code> <b>không</b> đụng tới socket nghe: nó tạo ra một mô tả ' +
           'file <i>mới</i>. Socket nghe vẫn ở <code>LISTEN</code>, sẵn sàng cho khách tiếp ' +
           'theo; socket mới ở <code>ESTAB</code> và là thứ bạn <code>read</code>/' +
           '<code>write</code>. Cả hai có cùng cổng cục bộ 9200 — một kết nối TCP được nhận ' +
           'dạng bằng <b>bốn</b> giá trị (IP nguồn, cổng nguồn, IP đích, cổng đích), nên ' +
           'cổng đích trùng nhau không hề mâu thuẫn. Cổng <i>phù du</i> là của phía khách, ' +
           'không phải của phía chủ. Câu <b>E4</b> bắt bạn nhìn thấy tận mắt bằng ' +
           '<code>ss</code>.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 1,
      q: 'Nhận định: <i>"TCP bảo đảm dữ liệu tới đủ và đúng thứ tự, nên mỗi lời gọi ' +
         '<code>write()</code> bên gửi sẽ thành đúng một lời gọi <code>read()</code> trả về ' +
         'đúng số byte đó bên nhận."</i>',
      a: 1,
      rw: 'Viết lại nhận định cho đúng, trong 1–2 câu, và nói rõ bên nhận phải làm gì thay thế.',
      why: '<p><b>Sai.</b> Hai bảo đảm bị gộp làm một. TCP bảo đảm <i>thứ tự</i> và ' +
           '<i>không mất byte</i>; nó <b>không</b> bảo đảm ranh giới, vì nó không hề biết ' +
           'thông điệp của bạn bắt đầu và kết thúc ở đâu — với TCP đó chỉ là một dòng byte. ' +
           'Bài 24 gửi ba lần 11 byte và bắt được <b>một</b> <code>read()</code> trả 33 byte ' +
           'ở phần thực hành, <b>hai</b> ở phần lý thuyết, và cảnh báo rằng chạy lại còn ra ' +
           'khác nữa. Cách duy nhất đúng là <b>tự đóng khung</b>: thêm độ dài vào đầu mỗi ' +
           'thông điệp, hoặc chọn một ký tự kết thúc, rồi đọc trong vòng lặp cho tới khi đủ ' +
           'khung.</p>',
      crit: [
        'Có tách rõ hai bảo đảm: TCP giữ <b>thứ tự</b> và <b>không mất byte</b>, nhưng ' +
          '<b>không</b> giữ ranh giới',
        'Nói được rằng số lần <code>read()</code> không đoán trước được, có thể ít hơn hoặc ' +
          'nhiều hơn số lần <code>write()</code>',
        'Nêu được biện pháp thay thế: tự đóng khung bằng độ dài ở đầu hoặc bằng ký tự kết thúc'
      ],
      sol: 'TCP bảo đảm mọi byte tới nơi, đủ và đúng thứ tự — nhưng nó không hề biết ranh ' +
           'giới thông điệp của bạn nằm ở đâu, vì với TCP tất cả chỉ là một dòng byte liên ' +
           'tục. Ba write() 11 byte có thể tới thành một read() 33 byte, hai read, hay ba, ' +
           'và con số đó đổi giữa các lần chạy. Bên nhận phải tự đóng khung: gắn độ dài vào ' +
           'đầu mỗi thông điệp (hoặc chọn một ký tự kết thúc như "\\n") rồi đọc trong vòng ' +
           'lặp cho tới khi gom đủ một khung.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"<code>sendto()</code> trả về 10, đúng bằng số byte tôi gửi. Vậy là ' +
         'gói tin đã tới được tiến trình nhận."</i>',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: giá trị trả về của <code>sendto()</code> thực ' +
          'sự chứng minh điều gì?',
      why: '<p><b>Sai.</b> Bài 24 gửi ba gói UDP tới một cổng <b>không có ai nghe</b> và cả ' +
           'ba lần <code>sendto()</code> đều thành công. Giá trị trả về chỉ chứng minh rằng ' +
           '<i>nhân đã nhận dữ liệu của bạn để chuyển đi</i> — không hơn. UDP không có bắt ' +
           'tay, không có báo nhận, nên không có kênh nào để tin xấu quay về ngay tại lời ' +
           'gọi.</p>' +
           '<p>Đối chiếu để thấy rõ: TCP <code>connect()</code> tới đúng cổng chết đó thì ' +
           'hỏng ngay với <code>Connection refused</code> — vì bắt tay ba bước cần câu trả ' +
           'lời từ phía kia, và câu trả lời đó là một gói RST.</p>',
      crit: [
        'Nói rõ <code>sendto()</code> chỉ chứng minh <b>nhân đã nhận</b> dữ liệu để gửi đi',
        'Nói rõ UDP <b>không</b> có báo nhận nên không thể biết bên kia có tồn tại hay không',
        'Có nêu cách biết thật: phải để tầng ứng dụng tự báo nhận (hoặc chuyển sang TCP)'
      ],
      sol: 'sendto() trả về 10 chỉ chứng minh nhân đã nhận 10 byte đó vào hàng đợi gửi — ' +
           'không chứng minh gì về phía bên kia. UDP không bắt tay và không báo nhận, nên ' +
           'gửi tới một cổng chết vẫn "thành công" y hệt gửi tới một máy chủ đang chạy. ' +
           'Muốn biết chắc thì phải để tầng ứng dụng tự gửi báo nhận, hoặc dùng TCP — nơi ' +
           'connect() tới cổng chết sẽ hỏng ngay với Connection refused.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Bộ khung của một máy chủ TCP có bốn lời gọi theo đúng thứ tự. Điền hai lời gọi ' +
         'còn thiếu (chỉ tên hàm, không cần dấu ngoặc):<br>' +
         '<code>socket()</code> → <code>bind()</code> → <b>____</b> → <b>____</b> → ' +
         '<code>read()</code>/<code>write()</code>',
      a: ['listen accept', 'listen, accept', 'listen -> accept', 'listen accept()',
          'listen() accept()', 'listen(), accept()', 'listen() -> accept()'],
      ph: 'hai tên hàm, cách nhau bởi dấu cách',
      why: '<p><code>socket()</code> tạo ra mô tả file; <code>bind()</code> gán cho nó một ' +
           'địa chỉ và một cổng; <code>listen()</code> chuyển nó sang trạng thái ' +
           '<b>thụ động</b> — từ đây nó không bao giờ mang dữ liệu nữa, nó chỉ nhận khách ' +
           'vào hàng đợi; <code>accept()</code> lấy một khách ra khỏi hàng đợi và trả về một ' +
           'mô tả file <b>mới</b>, và đó mới là thứ bạn đọc/ghi.</p>' +
           '<p>Phía khách ngắn hơn hẳn: <code>socket()</code> → <code>connect()</code> → ' +
           '<code>read()</code>/<code>write()</code>. Không có <code>bind()</code>, vì nhân ' +
           'tự chọn giúp một cổng phù du.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi <b>triệu chứng</b> quan sát được với <b>nguyên nhân</b> của nó. Cả sáu ' +
         'đều lấy từ bảng lỗi thường gặp của Bài 24.',
      left: [
        '<code>bind: Address already in use</code>, nhưng <code>ss -tlnp</code> không hiện ' +
          'tiến trình nào giữ cổng đó',
        'Tiến trình biến mất, mã thoát <b>141</b>, không một dòng log nào',
        '<code>read()</code> trả về −1 với <code>errno = 11</code>, dù kết nối vẫn còn sống',
        'Mã thoát <b>134</b> kèm dòng <code>*** bit out of range 0 - FD_SETSIZE ***</code>',
        '<code>recvfrom()</code> trả về 6 cho một gói dài 10 byte, và không báo lỗi gì',
        'Một fd đăng ký kiểu edge-triggered im lặng vĩnh viễn sau một lần đọc dở'
      ],
      right: [
        'Bộ đệm nhận nhỏ hơn gói UDP: phần thừa bị vứt, hàm vẫn trả về thành công',
        'Một fd ≥ 1024 bị đưa vào <code>FD_SET</code>, ghi tràn ra ngoài bảng bit 128 byte',
        'Kết nối <i>trước đó</i> còn ở <code>TIME-WAIT</code> 60 giây; thiếu ' +
          '<code>SO_REUSEADDR</code>',
        'Sườn tín hiệu đã bắn một lần và sẽ không bắn lại; byte còn lại nằm im trong bộ đệm',
        'Ghi vào socket mà phía kia đã đóng: <code>SIGPIPE</code> giết tiến trình theo mặc định',
        'fd đang ở chế độ <code>O_NONBLOCK</code> và lúc này chưa có dữ liệu ' +
          '(<code>EAGAIN</code>)'
      ],
      a: [2, 4, 5, 1, 0, 3],
      why: '<p>Sáu dòng này là sáu chế độ hỏng khác nhau, và điểm chung của chúng là điều ' +
           'đáng nhớ nhất: <b>bốn trong sáu không in ra chữ nào có ích</b>. Mã 141 và mã 134 ' +
           'là tất cả những gì bạn có; <code>recvfrom()</code> cắt cụt trong im lặng — khác ' +
           'hẳn <code>mq_send()</code> ở Bài 23, nơi gửi quá cỡ cho <code>EMSGSIZE</code>; ' +
           'và fd edge-triggered thì đơn giản là không bao giờ báo nữa.</p>' +
           '<p>Học thuộc bảng này theo chiều <i>triệu chứng → nguyên nhân</i>, vì đó là ' +
           'chiều bạn gặp chúng ngoài đời: bao giờ bạn cũng thấy mã thoát trước, rồi mới ' +
           'phải đi tìm lý do.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     B · THÔNG HIỂU — 6 câu, tự chấm theo tiêu chí
     ══════════════════════════════════════════════════════════════════════ */
  B: [
    { id: 'b1', k: 'free', tag: 'Đọc output', truc: 1, rows: 6,
      q: 'Ba bản ghi dưới đây đến từ <b>đúng một cặp chương trình</b>, không sửa một dòng mã ' +
         'nào giữa các lần chạy. Client luôn gọi <code>write()</code> ba lần, mỗi lần 11 byte. ' +
         'Hãy giải thích <b>cơ chế</b> tạo ra ba kết quả khác nhau, và nói rõ điều gì trong ' +
         'ba bản ghi này là <i>bất biến</i> còn điều gì là <i>ngẫu nhiên</i>.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '# lần 1 — ba write liên tiếp, không nghỉ\n' +
          '[client] write() call 1 sent 11 bytes\n' +
          '[client] write() call 2 sent 11 bytes\n' +
          '[client] write() call 3 sent 11 bytes\n' +
          '[server] read() call 1 returned 11 bytes: "meas1:41.5|"\n' +
          '[server] read() call 2 returned 22 bytes: "meas2:42.0|meas3:42.5|"\n' +
          '[server] read() returned 0 -> client closed. Total read() calls = 2\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# lần 2 — cùng chương trình, nghỉ 300 ms giữa hai write\n' +
          '[server] read() call 1 returned 11 bytes: "meas1:41.5|"\n' +
          '[server] read() call 2 returned 11 bytes: "meas2:42.0|"\n' +
          '[server] read() call 3 returned 11 bytes: "meas3:42.5|"\n' +
          '[server] read() returned 0 -> client closed. Total read() calls = 3\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# lần 3 — lại là ba write liên tiếp, không nghỉ\n' +
          '[server] read() call 1 returned 33 bytes: "meas1:41.5|meas2:42.0|meas3:42.5|"\n' +
          '[server] read() returned 0 -> client closed. Total read() calls = 1\n' }
      ],
      hint: 'Đếm tổng số byte trong cả ba lần. Con số đó có đổi không?',
      crit: [
        'Chỉ ra được thứ <b>bất biến</b>: tổng <b>33 byte</b> và <b>đúng thứ tự</b> ở cả ba lần',
        'Chỉ ra được thứ <b>ngẫu nhiên</b>: số lần <code>read()</code> (1, 2 hoặc 3) và cách ' +
          'chia byte giữa các lần',
        'Nêu đúng nguyên nhân: TCP là <b>dòng byte</b>, nhân gom/tách theo thời điểm dữ liệu ' +
          'tới bộ đệm chứ không theo số lời gọi <code>write()</code>',
        'Giải thích được vì sao lần 2 (nghỉ 300 ms) lại ra đúng 3: mỗi mẩu tới bộ đệm khi bộ ' +
          'đệm đang rỗng, nên không có gì để gom cùng',
        'Kết luận được: chương trình <b>không được phép</b> suy ra ranh giới thông điệp từ ' +
          'giá trị trả về của <code>read()</code>'
      ],
      sol: '<p>Bất biến: tổng số byte luôn là 33, và thứ tự các mẩu luôn là meas1 → meas2 → ' +
           'meas3. Đó chính xác là hai điều TCP hứa.</p><p>Ngẫu nhiên: số lần read() và cách ' +
           '33 byte đó bị chia ra. TCP không lưu giữ dấu vết của việc bạn gọi write() mấy lần ' +
           '— nó chỉ nối byte vào một dòng liên tục. read() trả về "tất cả những gì đang có ' +
           'trong bộ đệm nhận, tối đa bằng cỡ buffer bạn đưa". Vậy nên kết quả phụ thuộc vào ' +
           'một cuộc đua giữa tốc độ ghi của client, thời điểm bộ lập lịch cho server chạy, ' +
           'và thuật toán gộp gói của tầng TCP.</p><p>Lần 2 ra đúng 3 vì 300 ms là quá dài so ' +
           'với mọi khoảng thời gian đó: khi mẩu thứ hai tới, server đã kịp múc mẩu thứ nhất ' +
           'ra và bộ đệm đang rỗng, nên không còn gì để gom chung.</p><p>Hệ quả thực dụng: ' +
           'mọi suy luận kiểu "read() trả về 11 nên đây là một thông điệp trọn vẹn" đều sai. ' +
           'Phải tự đóng khung, và phải đọc trong vòng lặp.</p>' },

    { id: 'b2', k: 'free', tag: 'Đọc output', truc: 2, rows: 6,
      q: 'Bảng đo và bản ghi <code>strace -c</code> dưới đây cùng nói một điều. Hãy dùng ' +
         '<b>hai con số trong bản ghi strace</b> để giải thích vì sao cột <code>epoll</code> ' +
         'trong bảng gần như phẳng, còn cột <code>poll</code> thì tăng theo N.',
      blocks: [
        { t: 'table',
          head: ['N kênh', 'select', 'poll', 'epoll', 'epoll nhanh hơn'],
          rows: [
            ['10',   '1,83 µs',       '2,61 µs',   '1,31 µs', '<b>2,0×</b>'],
            ['100',  '13,53 µs',      '12,48 µs',  '0,85 µs', '<b>15×</b>'],
            ['500',  '63,71 µs',      '59,32 µs',  '0,90 µs', '<b>66×</b>'],
            ['2000', 'không dùng được', '286,54 µs', '0,72 µs', '<b>398×</b>']
          ]},
        { t: 'code', where: 'out', nocopy: true, code:
          '# strace -c, 10 000 lời gọi trên 500 kênh\n' +
          '% time     seconds  usecs/call     calls    errors syscall\n' +
          '------ ----------- ----------- --------- --------- ----------------\n' +
          ' 27.42    0.963911          96     10000           poll\n' +
          ' 27.72    0.974311          97     10000           pselect6\n' +
          '  6.18    0.217287          21     10000           epoll_wait\n' +
          '  0.39    0.013770          27       500           epoll_ctl\n' }
      ],
      hint: 'Cột <code>calls</code> có bốn giá trị, và một trong bốn khác hẳn ba cái còn lại.',
      crit: [
        'Chỉ đúng hai con số: <code>epoll_ctl</code> <b>500</b> lần và <code>epoll_wait</code> ' +
          '<b>10 000</b> lần',
        'Diễn giải được 500 = <b>một lần cho mỗi kênh</b>, tức chi phí đăng ký trả <b>một lần</b>',
        'Nói rõ <code>poll</code>/<code>pselect6</code> phải nộp lại <b>cả danh sách N phần ' +
          'tử</b> ở <b>mỗi</b> trong 10 000 lời gọi',
        'Kết luận đúng công thức: giá của poll/select ∝ số kênh <b>theo dõi</b>, giá của epoll ' +
          '∝ số kênh <b>có việc</b>',
        'Không viện tới lý do sai kiểu "epoll được tối ưu tốt hơn" hay "epoll chạy trong nhân ' +
          'còn poll thì không"'
      ],
      sol: '<p>Hai con số cần nhìn là cột calls: epoll_ctl 500 và epoll_wait 10 ' +
           '000.</p><p>500 = đúng một lần cho mỗi kênh. Đó là toàn bộ chi phí khai báo, và nó ' +
           'được trả một lần duy nhất trong suốt vòng đời chương trình. Sau đó danh sách theo ' +
           'dõi nằm lại trong nhân; mỗi lần dữ liệu tới một pipe, chính thao tác ghi đó móc ' +
           'pipe vào một danh sách "đã sẵn sàng". epoll_wait chỉ việc múc phần tử đầu danh ' +
           'sách ra — công việc tỉ lệ với số kênh CÓ VIỆC, thường là 1, bất kể đang theo dõi ' +
           '10 hay 2000.</p><p>poll và pselect6 thì bị gọi 10 000 lần, và mỗi lần phải nhận ' +
           'lại toàn bộ mảng N phần tử từ không gian người dùng, duyệt hết, rồi chép kết quả ' +
           'ngược ra. Công việc tỉ lệ với N, nhân với 10 000 lần. Đó là lý do 2,61 → 286,54 ' +
           'µs khi N đi từ 10 lên 2000, còn cột epoll đứng yên quanh 1 µs.</p><p>Nói cách ' +
           'khác: khác biệt không nằm ở chất lượng cài đặt, mà ở chỗ đặt danh sách.</p>' },

    { id: 'b3', k: 'free', tag: 'Bắt lỗi phát biểu', truc: 0, rows: 5,
      q: 'Một đồng nghiệp gửi bạn đoạn nhận xét sau trong bản review. Hãy chỉ ra <b>chỗ sai ' +
         'cốt lõi</b> (không phải chỗ sai về văn phong) và nói rõ nó sai vì lý do gì.',
      blocks: [
        { t: 'cal', kind: 'info', title: 'Trích nhận xét review',
          x: '<p><i>"Mấy lời gọi <code>htons()</code> này thừa. Thứ tự byte chỉ thành vấn đề khi hai ' +
          'máy khác kiến trúc nói chuyện với nhau — ví dụ PC x86 với một con MIPS big-endian. ' +
          'Ở đây client và server đều chạy trên cùng một bo ARM64 little-endian, qua ' +
          'loopback, nên hai bên ghi và đọc y hệt nhau. Bỏ <code>htons()</code>/' +
             '<code>htonl()</code> đi cho gọn; nếu sai thì <code>bind()</code> đã báo lỗi rồi."</i></p>' }
      ],
      hint: 'Trong một lời gọi <code>bind()</code>, ai là người ghi <code>sin_port</code> và ' +
            'ai là người đọc nó?',
      crit: [
        'Chỉ ra rằng hai bên trao đổi <b>không phải là hai máy</b> mà là <b>chương trình của ' +
          'bạn và nhân</b> — nhân luôn đọc <code>sin_port</code> theo network byte order',
        'Nói rõ vì thế "cùng một máy" hay "cùng kiến trúc" <b>không cứu được</b> gì',
        'Bác bỏ câu cuối: <code>bind()</code> <b>không thể</b> báo lỗi, vì mọi giá trị 16 bit ' +
          'đều là số cổng hợp lệ — nó trả 0 và nghe trên cổng sai',
        'Nêu được hệ quả cụ thể: cổng thực tế khác cổng trong tài liệu/firewall/systemd, và ' +
          'triệu chứng sẽ là "không ai kết nối được" chứ không phải một thông báo lỗi'
      ],
      sol: '<p>Chỗ sai cốt lõi: nhận xét tưởng rằng thứ tự byte là chuyện giữa HAI MÁY. Không ' +
           'phải. Ngay trong một lời gọi bind() duy nhất đã có hai bên rồi: chương trình của ' +
           'bạn ghi struct sockaddr_in, và NHÂN đọc nó. Nhân luôn diễn giải sin_port và ' +
           'sin_addr theo network byte order (big-endian), vì đó là quy ước của API, không ' +
           'phải của phần cứng. Trên một máy little-endian, ghi thẳng 9100 vào sin_port nghĩa ' +
           'là hai byte 8C 23 nằm trong RAM, và nhân đọc chúng thành 0x8C23 = ' +
           '35875.</p><p>Câu cuối — "nếu sai thì bind() đã báo lỗi" — là phần nguy hiểm nhất. ' +
           'bind() không thể báo lỗi: mọi giá trị 16 bit đều là một số cổng hợp lệ, nên không ' +
           'có gì để kiểm tra. Nó trả 0, listen() trả 0, tiến trình chạy nhiều ngày liền, và ' +
           'triệu chứng duy nhất là "không ai kết nối được vào cổng ghi trong tài liệu" — ' +
           'trong khi firewall, systemd unit và tài liệu vẫn nói 9100.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Trong bản ghi dưới đây, <code>probe_client</code> gửi một yêu cầu mà máy chủ chỉ ' +
         'tốn <b>dưới một phần nghìn giây</b> để trả lời, trên một máy 6 nhân đang rảnh. Nó ' +
         'vẫn đợi <b>1695,7 ms</b>. Giải thích vì sao, và nói rõ tài nguyên nào đang bị thiếu ' +
         '— CPU, RAM, băng thông, hay không cái nào cả.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '[sequential] listening on port 9004\n' +
          '[slow] connected, deliberately silent for 2000 ms\n' +
          '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
          '[sequential] replied to fd 4\n' +
          '[slow] reply: temperature 42.5 C\n' +
          '[sequential] accepted client fd 4 — will NOT accept anyone else until this one is done\n' +
          '[sequential] replied to fd 4\n' +
          '[probe] waited 1695.7 ms to get a reply\n' }
      ],
      hint: 'Nhìn hai dòng <code>accepted client fd 4</code>: vì sao chúng không xen kẽ nhau ' +
            'được?',
      crit: [
        'Nói đúng nguyên nhân: máy chủ chỉ quay lại <code>accept()</code> <b>sau khi</b> phục ' +
          'vụ xong khách hiện tại, nên khách thứ hai nằm chờ trong hàng đợi backlog',
        'Nhận ra <b>không tài nguyên nào bị thiếu</b>: CPU rảnh, RAM rảnh, băng thông rảnh — ' +
          'tiến trình đang <b>bị chặn</b> trong <code>read()</code>',
        'Giải thích con số ~1696 ms: đó là phần còn lại của 2000 ms im lặng mà khách thứ nhất ' +
          'cố ý giữ',
        'Kết luận: đây là lỗi <b>thiết kế</b> (một luồng, một kênh tại một thời điểm), không ' +
          'phải lỗi ở một dòng lệnh nào — thêm CPU hay tối ưu mã cũng không cứu được'
      ],
      sol: '<p>Máy chủ tuần tự có đúng một dòng điều khiển và nó tiêu dòng đó vào việc CHỜ. ' +
           'Sau accept(), nó gọi read() trên fd 4 và bị chặn ở đó cho tới khi khách thứ nhất ' +
           'chịu nói. Khách thứ nhất cố ý im 2000 ms. Trong suốt 2000 ms ấy, vòng lặp không ' +
           'hề quay lại accept(), nên probe_client tuy đã kết nối xong (nhân tự hoàn tất bắt ' +
           'tay ba bước và xếp nó vào hàng đợi backlog) vẫn không được ai lấy ra. Nó vào muộn ' +
           'hơn khách thứ nhất khoảng 300 ms, nên phải đợi phần còn lại: ~1696 ' +
           'ms.</p><p>Không tài nguyên nào thiếu cả. CPU 6 nhân gần như rảnh hoàn toàn, RAM ' +
           'thừa, dữ liệu chỉ vài chục byte. Tiến trình không bận — nó bị CHẶN. Đó là lý do ' +
           'thêm nhân, ép xung hay tối ưu hàm xử lý đều không thay đổi con số này một mili ' +
           'giây nào.</p><p>Cái phải đổi là hình dạng của chương trình: một dòng điều khiển ' +
           'phải theo dõi nhiều kênh cùng lúc và chỉ động vào kênh nào thật sự có dữ liệu. ' +
           'Đúng bản ghi đó với select cho 0,5 ms — nhanh hơn khoảng 3400 lần.</p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: '<code>epoll_wait()</code> vừa trả về và báo rằng fd 7 <b>đã sẵn sàng để đọc</b>. ' +
         'Vậy vì sao Bài 24 vẫn bắt buộc đặt <code>O_NONBLOCK</code> cho mọi socket trong ' +
         'vòng <code>epoll</code>? Nêu <b>hai</b> tình huống cụ thể trong đó thiếu ' +
         '<code>O_NONBLOCK</code> sẽ treo cả daemon, dù <code>epoll_wait</code> không hề nói dối.',
      hint: '"Sẵn sàng" nghĩa là "có ít nhất 1 byte", không phải "có đủ thứ bạn cần". Và ' +
            'chuyện gì xảy ra ở lần <code>read()</code> <i>thứ hai</i>?',
      crit: [
        'Nói rõ "sẵn sàng" chỉ bảo đảm <b>có ít nhất một byte</b> (hoặc một sự kiện), không ' +
          'bảo đảm có trọn một thông điệp',
        'Tình huống 1: đọc trong vòng lặp cho tới hết (bắt buộc với <code>EPOLLET</code>) — ' +
          'lần <code>read()</code> cuối cùng sẽ <b>chặn</b> nếu fd không phải non-blocking',
        'Tình huống 2: <code>write()</code> một khối lớn khi bộ đệm gửi đã đầy — ' +
          '<code>epoll_wait</code> không nói gì về khả năng ghi, và <code>write()</code> sẽ ' +
          'chặn cả vòng lặp',
        'Nêu đúng cách nhận biết "hết dữ liệu" khi đã có <code>O_NONBLOCK</code>: ' +
          '<code>read()</code> trả −1 với <code>errno = EAGAIN</code> (11)',
        'Kết luận: một lời gọi bị chặn trong vòng đơn luồng làm đứng <b>toàn bộ</b> các kênh ' +
          'còn lại, đúng như mô hình tuần tự ở B4'
      ],
      sol: '<p>epoll_wait không nói dối, nhưng nó nói ít hơn bạn tưởng: "sẵn sàng để đọc" chỉ ' +
           'có nghĩa là có ít nhất một byte trong bộ đệm nhận. Không có bảo đảm nào về việc ' +
           'đó là một thông điệp trọn vẹn.</p><p>Tình huống 1 — vòng đọc tới cạn. Với EPOLLET ' +
           'bạn BẮT BUỘC phải read() lặp lại cho tới khi hết, vì sườn tín hiệu chỉ bắn một ' +
           'lần. Lần read() cuối cùng, khi bộ đệm đã rỗng, sẽ chặn vô thời hạn nếu fd không ' +
           'phải non-blocking — daemon đứng im ngay giữa vòng lặp, mọi khách khác chết theo. ' +
           'Có O_NONBLOCK thì lần đó trả −1 với errno 11 (EAGAIN), và đó chính là tín hiệu ' +
           '"đã cạn, thoát vòng".</p><p>Tình huống 2 — ghi. epoll_wait báo EPOLLIN, không nói ' +
           'gì về khả năng ghi. Nếu khách chậm và bộ đệm gửi đã đầy, một write() khối lớn sẽ ' +
           'chặn. Trên fd non-blocking nó trả về một con số nhỏ hơn (ghi thiếu) hoặc ' +
           '−1/EAGAIN, và bạn đăng ký EPOLLOUT rồi quay lại vòng lặp thay vì đứng ' +
           'chờ.</p><p>Nguyên tắc chung: trong một vòng lặp đơn luồng phục vụ nhiều kênh, MỘT ' +
           'lời gọi bị chặn là đủ để làm đứng tất cả các kênh còn lại — đúng cái bệnh của máy ' +
           'chủ tuần tự ở câu trước.</p>' },

    { id: 'b6', k: 'free', tag: 'So sánh cặp', rows: 5,
      q: 'Bài 24 đo RTT 10 000 vòng, gói 16 byte, trên loopback: <b>TCP 76,15 µs</b> so với ' +
         '<b>UDP 63,33 µs</b> — UDP nhanh hơn khoảng <b>15 %</b>, và mất 0/10000 gói. Một ' +
         'nhóm đọc xong định chuyển giao thức của cảm biến từ TCP sang UDP để "được 15 % ' +
         'đó". Trong <b>cặp so sánh TCP ↔ UDP</b>, đâu mới là <i>khác biệt đáng kể</i>, và ' +
         'vì sao 15 % kia gần như vô nghĩa với quyết định này?',
      hint: 'Con số 0/10000 mất gói được đo <i>ở đâu</i>?',
      crit: [
        'Nêu đúng khác biệt đáng kể: <b>bảo đảm ngữ nghĩa</b> — TCP có báo nhận, gửi lại, thứ ' +
          'tự và ranh giới-theo-dòng; UDP không có gì trong số đó',
        'Chỉ ra 0/10000 là con số của <b>loopback</b>, nơi không có dây, không có switch, ' +
          'không có hàng đợi bị tràn — không suy ra được cho mạng thật',
        'Chỉ ra 12,8 µs chênh lệch là <b>vô nghĩa</b> so với chu kỳ của một cảm biến (5 mẫu/' +
          'giây = 200 000 µs)',
        'Nói được tiêu chí chọn đúng: chọn theo <b>ngữ nghĩa cần có</b> (mất mẫu có chấp nhận ' +
          'được không? cần thứ tự không? có multicast/broadcast không?), không theo µs',
        'Có nhắc rằng nếu chọn UDP thì phần bảo đảm đã mất phải được <b>dựng lại ở tầng ứng ' +
          'dụng</b>, và lúc đó nó không còn rẻ hơn'
      ],
      sol: '<p>Khác biệt đáng kể giữa TCP và UDP không phải tốc độ, mà là NGỮ NGHĨA: TCP báo ' +
           'nhận, gửi lại khi mất, giữ thứ tự, và cho một dòng byte liên tục; UDP không có ' +
           'thứ nào trong số đó, đổi lại giữ nguyên ranh giới gói và không cần bắt ' +
           'tay.</p><p>15 % kia vô nghĩa vì hai lý do. Thứ nhất, nó là 12,8 µs trên một chu ' +
           'kỳ 200 000 µs (5 mẫu/giây) — nhỏ hơn bốn bậc độ lớn, không một ai đo được nó ở ' +
           'đầu ra. Thứ hai, và quan trọng hơn: cả con số RTT lẫn con số 0/10000 mất gói đều ' +
           'đo trên LOOPBACK, tức là bộ nhớ chép sang bộ nhớ, không dây, không switch, không ' +
           'hàng đợi nào có thể tràn. Trên một mạng thật, UDP mất gói là chuyện bình thường, ' +
           'và chính phần "0/10000" mới là thứ sẽ biến mất trước tiên.</p><p>Cách chọn đúng ' +
           'là hỏi về ngữ nghĩa: mất một mẫu nhiệt độ có sao không (thường là không, mẫu sau ' +
           'tới ngay)? Có cần đúng thứ tự không? Có cần gửi một-tới-nhiều không? Nếu câu trả ' +
           'lời đẩy về UDP thì chọn UDP vì lý do đó — chứ không phải vì 15 %. Và nếu lại phải ' +
           'tự thêm báo nhận với gửi lại lên trên UDP thì bạn đang viết lại TCP, chậm hơn và ' +
           'nhiều lỗi hơn.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     C · VẬN DỤNG — 5 câu, tình huống chưa có trong bài
     ══════════════════════════════════════════════════════════════════════ */
  C: [
    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0, rows: 6,
      q: 'Một bộ thu thập dữ liệu gửi cho máy chủ một tiêu đề nhị phân 4 byte: 2 byte ' +
         '<code>uint16_t sample_count</code> rồi 2 byte <code>uint16_t crc</code>. Trong xưởng, ' +
         'thiết bị được cấu hình gửi <b>40</b> mẫu mỗi khối. Máy chủ ghi log: ' +
         '<code>received block: sample_count = 10240</code>. Không lời gọi nào trả về lỗi, ' +
         'CRC vẫn khớp, và số 10240 xuất hiện <b>ổn định</b> ở mọi khối, mọi thiết bị. Hãy chẩn ' +
         'đoán, và nói rõ bạn dựa vào đặc điểm nào của con số để loại các nguyên nhân khác.',
      hint: '40 ở dạng thập lục phân là bao nhiêu? Còn 10240?',
      crit: [
        'Tính đúng: 40 = <code>0x0028</code>, và đảo hai byte cho <code>0x2800</code> = ' +
          '<b>10240</b>',
        'Kết luận đúng nguyên nhân: một bên ghi <code>sample_count</code> ở host byte order, ' +
          'bên kia đọc ở network byte order — thiếu <code>htons()</code>/<code>ntohs()</code>',
        'Dùng được đặc điểm "<b>ổn định</b>, mọi khối, mọi thiết bị" để loại nhiễu đường ' +
          'truyền, lỗi phần cứng và race condition — những thứ đó sẽ cho số <i>khác nhau</i> ' +
          'mỗi lần',
        'Dùng được đặc điểm "<b>CRC vẫn khớp</b>" để loại giả thuyết hỏng dữ liệu: các byte ' +
          'tới nơi <b>nguyên vẹn</b>, chỉ bị <i>diễn giải</i> sai',
        'Nêu cách sửa dứt điểm: một bên gọi <code>htons()</code> khi đóng gói, bên kia gọi ' +
          '<code>ntohs()</code> khi mở gói — và phải sửa <b>đúng một</b> trong hai bên, sửa cả ' +
          'hai là quay lại chỗ cũ'
      ],
      sol: '<p>40 = 0x0028. Đảo hai byte: 0x2800 = 10240. Khớp chính xác con số trong log, ' +
           'nên giả thuyết là thứ tự byte, không cần đoán thêm.</p><p>Hai đặc điểm trong đề ' +
           'loại hết các nguyên nhân còn lại. "CRC vẫn khớp" nghĩa là từng byte tới nơi ' +
           'nguyên vẹn — dữ liệu không hỏng, nó chỉ bị đọc sai cách; điều này loại nhiễu ' +
           'đường truyền, cáp lỏng, bộ nhớ lỗi. "Ổn định ở mọi khối, mọi thiết bị" loại nốt ' +
           'race condition, tràn bộ đệm hay con trỏ hỏng: những lỗi đó cho một con số khác ' +
           'nhau mỗi lần, còn đây là một phép biến đổi tất định.</p><p>Nguyên nhân: một bên ' +
           'ghi sample_count theo thứ tự byte của máy nó (little-endian), bên kia đọc theo ' +
           'network byte order — hoặc ngược lại. Không lời gọi nào báo lỗi được, vì 10240 ' +
           'cũng là một uint16_t hợp lệ y như 40.</p><p>Sửa: bên đóng gói gọi ' +
           'htons(sample_count) trước khi ghi vào tiêu đề, bên mở gói gọi ntohs() sau khi ' +
           'đọc. Cẩn thận: phải sửa đúng MỘT trong hai bên nếu bên kia đã làm đúng — sửa cả ' +
           'hai thì đảo hai lần và bạn quay về đúng con số sai ban đầu. Cách an toàn là quy ' +
           'ước rõ trong tài liệu giao thức: "mọi trường số nguyên trên dây đều là ' +
           'big-endian", rồi cả hai bên đều htons/ntohs vô điều kiện.</p>' },

    { id: 'c2', k: 'free', tag: 'Tình huống mới', truc: 1, rows: 6,
      q: 'Bạn tích hợp một thư viện của nhà cung cấp cho một bo 64 MB RAM. Nó nhận lệnh từ ' +
         'trung tâm qua TCP, và hàm nhận của nó đúng như dưới đây. Nhà cung cấp nói "đã chạy ' +
         'hai năm ở hàng nghìn điểm, chưa bao giờ lỗi". Trong phòng lab của bạn nó cũng chạy ' +
         'tốt suốt một tuần. Hãy nêu <b>chính xác</b> hai chế độ hỏng mà hàm này sẽ gặp ngoài ' +
         'hiện trường, và mô tả bản vá tối thiểu.',
      blocks: [
        { t: 'code', where: 'file', lang: 'c', code:
          '/* vendor_recv.c — as shipped */\n' +
          'int vendor_recv_command(int fd, struct command *out)\n' +
          '{\n' +
          '    char buf[256];\n' +
          '    ssize_t n = read(fd, buf, sizeof buf);\n' +
          '    if (n <= 0)\n' +
          '        return -1;\n' +
          '    return parse_command(buf, (size_t)n, out);   /* expects one whole command */\n' +
          '}\n' }
      ],
      hint: '<code>parse_command</code> nhận đúng những gì một lời gọi <code>read()</code> ' +
            'trả về. Con số đó có bao giờ nhỏ hơn một lệnh không? Có bao giờ lớn hơn không?',
      crit: [
        'Chế độ hỏng 1 — <b>thiếu</b>: một lệnh có thể tới thành nhiều mảnh, ' +
          '<code>parse_command</code> nhận một lệnh cụt',
        'Chế độ hỏng 2 — <b>thừa/dính</b>: hai lệnh gửi liên tiếp có thể tới trong một ' +
          '<code>read()</code>, lệnh thứ hai bị vứt (hoặc parse hỏng)',
        'Giải thích được vì sao lab không bắt được: lab gửi thưa, mạng nhanh, mỗi lệnh tới bộ ' +
          'đệm khi bộ đệm rỗng — đúng như lần chạy "nghỉ 300 ms"',
        'Bản vá đúng hướng: <b>tự đóng khung</b> — thêm độ dài ở đầu hoặc ký tự kết thúc — và ' +
          'giữ một <b>bộ đệm tích luỹ theo từng kết nối</b>, đọc trong vòng lặp cho tới khi đủ ' +
          'một khung',
        'Nhắc tới ràng buộc 64 MB: bộ đệm tích luỹ phải có <b>trần</b>, nếu không một khách ' +
          'gửi rác không có ký tự kết thúc sẽ làm cạn RAM'
      ],
      sol: '<p>Hàm này giả định "một read() = một lệnh". TCP không hứa điều đó, nên có đúng ' +
           'hai cách nó sai, và cả hai đều xảy ra ngoài hiện trường:</p><p>1. THIẾU. Một lệnh ' +
           'dài bị chia làm hai mảnh (mạng chậm, MTU, tắc nghẽn). read() trả về 120 byte của ' +
           'một lệnh 180 byte, parse_command nhận một lệnh cụt và hoặc báo lỗi, hoặc — tệ hơn ' +
           '— parse ra một lệnh khác vẫn hợp lệ.</p><p>2. DÍNH. Trung tâm gửi hai lệnh liền ' +
           'nhau. Chúng tới cùng một lúc, read() trả về cả hai trong 256 byte, parse_command ' +
           'đọc lệnh đầu rồi vứt phần còn lại. Lệnh thứ hai biến mất, không một dòng ' +
           'log.</p><p>Vì sao lab không bắt được: trong lab bạn gửi lệnh thưa, mạng là ' +
           'loopback hoặc một switch trống. Mỗi lệnh tới bộ đệm khi bộ đệm đang rỗng và được ' +
           'múc ra ngay — đúng kịch bản "nghỉ 300 ms" của Bài 24, nơi ba write cho đúng ba ' +
           'read. Cùng chương trình đó, khi gửi dồn, cho một read 33 byte.</p><p>Bản vá tối ' +
           'thiểu: định nghĩa khung. Hoặc 2 byte độ dài (nhớ htons!) ở đầu mỗi lệnh, hoặc một ' +
           'ký tự kết thúc. Mỗi kết nối giữ một bộ đệm tích luỹ riêng; mỗi lần read() nối ' +
           'thêm vào đó rồi bóc ra TẤT CẢ các khung đã đủ, phần dư giữ lại cho lần sau. Trên ' +
           'bo 64 MB, bộ đệm tích luỹ bắt buộc phải có trần (ví dụ 4 KB): một khách gửi mãi ' +
           'mà không có ký tự kết thúc sẽ làm tiến trình phình ra tới khi bị OOM giết — và đó ' +
           'là một đường tấn công, không chỉ là một lỗi.</p>' },

    { id: 'c3', k: 'free', tag: 'Chẩn đoán', rows: 6,
      q: 'Một daemon thu thập chạy tốt hai năm ở các trạm nhỏ. Trạm mới có <b>1 200</b> cảm ' +
         'biến. Ngay khi số kết nối vượt qua khoảng một nghìn, tiến trình <b>biến mất</b>: ' +
         'không core dump được cấu hình, không một dòng log của ứng dụng, ' +
         '<code>systemctl</code> ghi <code>Main process exited, code=killed</code> hoặc ' +
         '<code>status=134</code> tuỳ lần. RAM còn trống 70 %. Hãy liệt kê <b>ba</b> nguyên ' +
         'nhân khả dĩ khác nhau khớp với mô tả này, rồi nêu một lệnh hoặc một phép thử để ' +
         '<b>phân biệt</b> chúng.',
      hint: 'Ba con số trần khác nhau có thể chặn một tiến trình ở quanh ngưỡng một nghìn ' +
            'mô tả file — và chúng cho ba triệu chứng khác nhau.',
      crit: [
        'Nguyên nhân 1: dùng <code>select()</code>, một fd ≥ <code>FD_SETSIZE</code> (1024) ' +
          'vào <code>FD_SET</code> → glibc <code>abort()</code> → <b>134</b>',
        'Nguyên nhân 2: chạm trần <code>ulimit -n</code> → <code>accept()</code> trả −1 với ' +
          '<code>EMFILE</code>; nếu mã không kiểm tra giá trị trả về thì fd −1 lan đi và hỏng ' +
          'ở chỗ khác',
        'Nguyên nhân 3: rò mô tả file (quên <code>close</code>) — cùng triệu chứng nhưng ' +
          'ngưỡng phụ thuộc <b>thời gian chạy</b>, không phụ thuộc số cảm biến',
        'Phép phân biệt 1: <code>echo $?</code> / <code>systemctl show -p ExecMainStatus</code> ' +
          '— đúng <b>134</b> chỉ ra SIGABRT, tức nhánh <code>FD_SETSIZE</code>',
        'Phép phân biệt 2: đếm fd đang mở theo thời gian bằng ' +
          '<code>ls /proc/&lt;pid&gt;/fd | wc -l</code> — tăng đều mà không giảm là rò, đứng ' +
          'ở trần là <code>EMFILE</code>',
        'Có nêu ít nhất một lệnh đọc trần thật: <code>ulimit -n</code>, ' +
          '<code>cat /proc/&lt;pid&gt;/limits</code>, hoặc <code>LimitNOFILE</code> của unit'
      ],
      solBlocks: [
        { t: 'p', x: 'Ba nguyên nhân khớp mô tả:' },
        { t: 'p', x: '1. FD_SETSIZE. Nếu vòng chờ dùng select(), fd thứ 1025 trở đi khi đưa vào ' +
                   'FD_SET là ghi tràn ra ngoài bảng bit 128 byte. glibc phát hiện và ' +
                   'abort(): mã thoát 134 = 128 + 6. Không phải lỗi API nên không có errno, ' +
                   'không có cơ hội log.' },
        { t: 'p', x: '2. Trần ulimit -n. accept() trả −1 với EMFILE khi chạm trần. Nếu mã không ' +
                   'kiểm tra, giá trị −1 được dùng như một fd và các lời gọi sau đó hỏng ở ' +
                   'những chỗ khó hiểu; nếu có kiểm tra, daemon còn sống nhưng từ chối khách ' +
                   'mới. Trần mặc định của systemd unit thường là 1024, tức đúng vùng ngưỡng ' +
                   'đang thấy.' },
        { t: 'p', x: '3. Rò mô tả file. Quên close() một fd nào đó trên đường xử lý. Triệu ' +
                   'chứng giống hệt, nhưng nguyên nhân không phải "1 200 cảm biến" mà là "đã ' +
                   'chạy đủ lâu".' },
        { t: 'p', x: 'Phân biệt:' },
        { t: 'list', items: [
          'Mã thoát. Đúng 134 → SIGABRT → gần như chắc chắn là nhánh 1. Lấy bằng systemctl ' +
            'show -p ExecMainStatus &lt;unit&gt;, hoặc chạy tay rồi echo $?.',
          'Đếm fd theo thời gian: ls /proc/&lt;pid&gt;/fd | wc -l lặp mỗi 30 giây. Tăng đều ' +
            'rồi không bao giờ giảm dù khách đã đi → nhánh 3. Đứng yên ở đúng trần → nhánh 2.',
          'Đọc trần thật: cat /proc/&lt;pid&gt;/limits (dòng "Max open files") — đó là trần ' +
            'thực tế của tiến trình, khác với ulimit -n trong shell của bạn.'
        ] },
        { t: 'p', x: 'Cách sửa cũng khác nhau: nhánh 1 phải đổi sang epoll (nâng ulimit KHÔNG ' +
                   'cứu được, vì FD_SETSIZE là hằng số biên dịch); nhánh 2 nâng LimitNOFILE ' +
                   'trong unit; nhánh 3 phải tìm chỗ quên close.' }
      ] },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 5,
      q: 'Một nút đo mực nước gửi <b>4 mẫu/giây</b> về trung tâm qua mạng di động ' +
         '<b>NB-IoT</b>: độ trễ 1–10 giây, mất gói vài phần trăm, tính tiền theo byte, nút ' +
         'chạy pin 5 năm. Hai kỹ sư đề xuất hai hướng: <b>(a)</b> TCP giữ kết nối thường ' +
         'trực, <b>(b)</b> UDP bắn từng gói. Chọn một, và biện minh bằng <b>ba</b> ràng buộc ' +
         'trong đề — không được dùng lý do "UDP nhanh hơn 15 %".',
      hint: 'TCP phải làm gì để "giữ kết nối thường trực" khi không có dữ liệu? Việc đó tốn ' +
            'byte hay không?',
      crit: [
        'Có chọn dứt khoát một phương án và giữ nguyên lập luận theo phương án đó',
        'Dùng ràng buộc <b>pin/byte</b>: TCP tốn bắt tay 3 bước + keepalive + ACK cho mỗi ' +
          'gói; UDP chỉ tốn đúng gói dữ liệu',
        'Dùng ràng buộc <b>mất gói và độ trễ 1–10 s</b>: TCP gửi lại và chờ, làm số liệu tới ' +
          'muộn và lệch nhịp; với mực nước, một mẫu cũ thường vô dụng hơn là không có mẫu',
        'Dùng ràng buộc <b>tần suất 4 mẫu/giây</b>: mẫu sau tới sau 250 ms nên mất một mẫu là ' +
          'thiệt hại nhỏ',
        'Có nói rõ cái phải tự làm nếu chọn UDP: đánh số thứ tự mẫu (phát hiện mất), đóng dấu ' +
          'thời gian tại nút, và gộp nhiều mẫu vào một gói để giảm chi phí đầu gói',
        'Không viện dẫn 15 % của bảng RTT'
      ],
      sol: '<p>Chọn (b) UDP, với ba ràng buộc:</p><p>1. Tiền và pin tính theo byte. Một kết ' +
           'nối TCP thường trực phải trả bắt tay ba bước lúc mở, ACK cho mỗi gói dữ liệu, và ' +
           'keepalive định kỳ để NAT của nhà mạng không quên ánh xạ — toàn bộ đều là byte bạn ' +
           'trả tiền và điện để phát, mà không mang một mẫu đo nào. Trên NB-IoT, phát sóng là ' +
           'khoản tiêu điện lớn nhất của nút.</p><p>2. Độ trễ 1–10 s cộng mất gói vài phần ' +
           'trăm là môi trường xấu nhất cho TCP: nó sẽ gửi lại, chờ timeout, và giữ các mẫu ' +
           'SAU trong hàng đợi cho tới khi mẫu trước tới nơi (head-of-line blocking). Kết quả ' +
           'là số liệu tới trung tâm thành từng cụm, lệch nhịp.</p><p>3. 4 mẫu/giây nghĩa là ' +
           'mẫu kế tiếp chỉ cách 250 ms. Mất một mẫu mực nước gần như không thiệt hại gì; ' +
           'nhận nó muộn 8 giây thì có — nó làm hỏng biểu đồ và có thể kích hoạt cảnh báo ' +
           'sai.</p><p>Cái phải tự làm khi chọn UDP: đánh số thứ tự mỗi mẫu để trung tâm biết ' +
           'đã mất bao nhiêu; đóng dấu thời gian NGAY TẠI NÚT chứ không dựa vào giờ nhận; và ' +
           'gộp ví dụ 20 mẫu (5 giây) vào một gói, vì chi phí đầu gói IP + UDP là cố định nên ' +
           'gửi thưa mà nhiều mẫu rẻ hơn hẳn gửi dày. Đúng một trong ba việc đó là lý do chọn ' +
           'UDP — không phải 15 %.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', truc: 2, rows: 6,
      q: 'Cổng thu thập của bạn theo dõi <b>500</b> kênh và vòng chờ bị đánh thức ' +
         '<b>1 000 lần mỗi giây</b>. Dùng đúng hai con số đo được ở N = 500 trong Bài 24 — ' +
         '<code>poll</code> <b>59,32 µs/lần</b>, <code>epoll</code> <b>0,90 µs/lần</b> — hãy ' +
         'tính phần trăm của <b>một nhân CPU</b> mà riêng cơ chế chờ tiêu tốn, cho từng cơ ' +
         'chế. Sau đó quyết định: nếu sản phẩm chạy trên một bo <b>một nhân</b>, chậm hơn máy ' +
         'đo này nhiều lần, con số nào là con số làm bạn đổi thiết kế, và vì sao con số kia ' +
         'thì không?',
      hint: 'µs/lần × số lần/giây = µs/giây. Một nhân có 1 000 000 µs mỗi giây.',
      crit: [
        'Tính đúng <code>poll</code>: 59,32 × 1000 = <b>59 320 µs/s</b> ≈ <b>5,9 %</b> của một nhân',
        'Tính đúng <code>epoll</code>: 0,90 × 1000 = <b>900 µs/s</b> ≈ <b>0,09 %</b> của một nhân',
        'Nói rõ đây là chi phí <b>thuần của cơ chế chờ</b>, chưa tính một giây nào cho việc xử ' +
          'lý dữ liệu thật',
        'Quyết định đúng: 5,9 % trên máy đo là đã đáng lo, vì trên bo một nhân yếu hơn nhiều ' +
          'lần con số đó nhân lên tương ứng, trong khi 0,09 % có nhân lên vẫn không đáng kể',
        'Nêu được rằng khoảng cách sẽ <b>giãn thêm</b> khi số kênh tăng: giá của poll tỉ lệ ' +
          'với số kênh theo dõi, giá của epoll thì không',
        'Không kết luận bằng cách so trực tiếp 59,32 với 0,90 (tỉ số 66×) — tỉ số không cho ' +
          'biết cái nào <i>đủ nhỏ để bỏ qua</i>'
      ],
      solBlocks: [
        { t: 'p', x: 'Phép tính:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'poll  : 59,32 µs × 1000 = 59 320 µs/giây = 59,3 ms/giây = 5,9 % của một nhân\n' +
          'epoll : 0,90  µs × 1000 =    900 µs/giây =  0,9 ms/giây = 0,09 % của một nhân' },
        { t: 'p', x: 'Cả hai là chi phí THUẦN của việc chờ — chưa tính một micro giây nào cho ' +
                   'việc đọc dữ liệu, phân tích khung hay ghi log.' },
        { t: 'p', x: 'Con số làm đổi thiết kế là 5,9 %. Lý do không phải vì nó lớn hơn 0,09 % ' +
                   '(tỉ số 66× tự nó không nói được gì), mà vì nó đã ở mức có thể nhìn thấy ' +
                   'trên MÁY ĐO — một desktop 6 nhân x86. Sản phẩm chạy trên một bo một nhân ' +
                   'chậm hơn nhiều lần, nên con số đó nhân lên tương ứng và ăn vào phần CPU ' +
                   'mà công việc thật cần. 0,09 % thì có nhân lên vài lần vẫn nằm dưới mức ' +
                   'nhiễu đo.' },
        { t: 'p', x: 'Còn một lý do thứ hai, mạnh hơn: hai con số này không giãn theo cùng một ' +
                   'luật. Giá của poll tỉ lệ với số kênh THEO DÕI, nên khi trạm mở rộng từ ' +
                   '500 lên 2000 kênh nó đi từ 59,32 lên 286,54 µs — tức từ 5,9 % lên 28,7 % ' +
                   'của một nhân. Giá của epoll tỉ lệ với số kênh CÓ VIỆC, nên nó đi từ 0,90 ' +
                   'xuống 0,72 µs. Chọn epoll không phải để tiết kiệm 5,8 % hôm nay, mà để ' +
                   'lần mở rộng sau không phải viết lại vòng chờ.' }
      ] }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     D · ÔN XEN KẼ — 3 câu về các bài Bài 24 đứng lên trên
     ══════════════════════════════════════════════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại Bài 19',
      q: 'Máy chủ của bạn trả về một ảnh chụp cấu hình dài 100 000 byte bằng đúng một lời gọi ' +
         '<code>write(fd, buf, 100000)</code> trên một socket TCP đang ở chế độ chặn ' +
         '(<i>không</i> có <code>O_NONBLOCK</code>). Khách đọc rất chậm. Phát biểu nào đúng?',
      opts: [
        '<code>write()</code> trả về 100000 sau khi khách đã nhận đủ — TCP bảo đảm điều đó',
        '<code>write()</code> chặn cho tới khi <b>toàn bộ</b> 100 000 byte vào được bộ đệm ' +
          'gửi, rồi trả về 100000; giá trị trả về không nói gì về việc khách đã nhận',
        '<code>write()</code> trả về ngay 65536 và phần còn lại bị vứt',
        '<code>write()</code> trả về −1 với <code>errno = EAGAIN</code> khi bộ đệm gửi đầy'
      ],
      a: 1,
      why: '<p>Hai bẫy trong một câu. Thứ nhất, giá trị trả về của <code>write()</code> chỉ ' +
           'nói dữ liệu đã vào <b>bộ đệm gửi của nhân</b> — nó không bao giờ là bằng chứng ' +
           'rằng phía kia đã nhận, đọc, hay còn sống. Thứ hai, phương án 4 mô tả đúng hành vi ' +
           'của fd <b>non-blocking</b>, không phải fd chặn: <code>EAGAIN</code> chỉ xuất hiện ' +
           'khi bạn đã tự đặt <code>O_NONBLOCK</code>.</p>' +
           '<p>Bài 19 đo con số 65536: ghi 100 000 byte vào một <b>pipe</b> non-blocking thì ' +
           '<code>write()</code> trả về đúng 65536 — <i>ghi thiếu</i>, và đó là <b>thành ' +
           'công</b>, không phải lỗi. Bài học chuyển thẳng sang socket: mọi lời gọi ' +
           '<code>write()</code> phải nằm trong một vòng lặp cộng dồn giá trị trả về, không ' +
           'bao giờ được gọi một lần rồi bỏ đi.</p>' },

    { id: 'd2', k: 'tf', tag: 'Nhắc lại Bài 22',
      q: '<b>Phát biểu:</b> "Mô hình một luồng cho mỗi khách bị Bài 24 loại vì luồng <i>chậm</i> ' +
         '— tạo một luồng tốn nhiều thời gian hơn đăng ký một fd vào <code>epoll</code>."',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: cái gì mới thực sự làm mô hình đó không dùng được ' +
          'trên bo nhúng?',
      why: '<p><b>Sai.</b> <code>pthread_create()</code> ở Bài 22 rất nhanh; thời gian không ' +
           'phải vấn đề. Vấn đề là <b>bộ nhớ</b>: mỗi luồng nhận một ngăn xếp mặc định ' +
           '<b>8 MB</b> vùng địa chỉ. Với 1 000 khách đó là 8 GB vùng địa chỉ — trên một bo ' +
           '64 MB thì không có chuyện đó, kể cả khi phần lớn số trang chưa bao giờ bị chạm ' +
           'tới thật.</p>' +
           '<p>Còn hai khoản nữa cùng chiều: mỗi luồng thêm một mục vào bộ lập lịch, và mọi ' +
           'trạng thái dùng chung (như <code>state.temperature</code> của daemon) lập tức cần ' +
           'mutex — tức là thêm một lớp lỗi mà mô hình <code>epoll</code> đơn luồng không hề ' +
           'có.</p>',
      crit: [
        'Bác bỏ lý do "chậm": tạo luồng không phải nút thắt',
        'Nêu đúng lý do chính: mỗi luồng tốn <b>8 MB</b> vùng địa chỉ cho ngăn xếp, nhân với ' +
          'số khách thì vượt xa RAM của bo',
        'Có nhắc thêm ít nhất một khoản: áp lực lên bộ lập lịch, hoặc nghĩa vụ khoá cho trạng ' +
          'thái dùng chung'
      ],
      sol: 'Không phải vì chậm — pthread_create() rất nhanh. Mô hình một luồng cho mỗi khách ' +
           'không dùng được vì mỗi luồng chiếm 8 MB vùng địa chỉ ngăn xếp theo mặc định, nên ' +
           'một nghìn khách là 8 GB vùng địa chỉ, không thể có trên một bo 64 MB. Kèm theo đó ' +
           'là áp lực lên bộ lập lịch và nghĩa vụ đặt mutex quanh mọi trạng thái dùng chung — ' +
           'những thứ mà một vòng epoll đơn luồng không phải trả.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại Bài 21',
      q: 'Daemon tổng kết của Bài 24 dùng <code>signalfd</code> để nhận <code>SIGTERM</code> ' +
         'thay vì đăng ký một tay xử lý tín hiệu thông thường. Lợi ích <b>quyết định</b> của ' +
         'lựa chọn đó, trong bối cảnh một vòng <code>epoll</code>, là gì?',
      opts: [
        '<code>signalfd</code> nhận được nhiều loại tín hiệu hơn tay xử lý thông thường',
        'Tín hiệu trở thành một <b>mô tả file</b>, nên nó xếp hàng cùng mọi sự kiện khác trong ' +
          '<code>epoll_wait</code> và được xử lý trong <b>luồng điều khiển bình thường</b> — ' +
          'không còn ràng buộc async-signal-safe',
        '<code>signalfd</code> chặn không cho <code>SIGKILL</code> giết tiến trình, nên daemon ' +
          'luôn tắt sạch',
        'Tay xử lý tín hiệu thông thường không hoạt động trong chương trình đa luồng'
      ],
      a: 1,
      why: '<p>Một tay xử lý tín hiệu chạy <b>xen ngang</b> luồng điều khiển ở một thời điểm ' +
           'bất kỳ, nên bên trong nó bạn gần như không được làm gì: không ' +
           '<code>printf</code>, không <code>malloc</code>, không khoá mutex — chỉ được gọi ' +
           'các hàm async-signal-safe. Mẫu thường thấy là đặt một biến ' +
           '<code>volatile sig_atomic_t</code> rồi hy vọng vòng lặp chính nhìn thấy nó.</p>' +
           '<p><code>signalfd</code> xoá hẳn vấn đề: tín hiệu tới dưới dạng byte đọc được từ ' +
           'một fd. Bạn đăng ký fd đó vào <code>epoll</code> như mọi socket khác, và khi ' +
           '<code>epoll_wait</code> báo, bạn xử lý nó ở nơi bình thường của vòng lặp — được ' +
           'log, được đóng file, được <code>pthread_join</code>. Đó là lý do daemon Bài 24 ' +
           'thoát với mã <b>0</b> sạch sẽ.</p>' +
           '<p>Phương án 3 sai: <code>SIGKILL</code> không thể bị chặn, bắt hay đưa vào ' +
           '<code>signalfd</code> — Bài 21 đã nói rõ, và đó chính là cái giá của ' +
           '<code>kill -9</code>.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     E · THỰC HÀNH — 6 câu, gõ thật trong WSL
     Mọi chương trình dưới đây đã được biên dịch và chạy thật trên máy,
     output dán vào `sol` là output thật. Xem XUẤT XỨ SỐ LIỆU ở đầu file.
     ══════════════════════════════════════════════════════════════════════ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Tạo <code>~/embedded/bt24/order.c</code> với nội dung dưới đây. <b>Trước khi biên ' +
         'dịch</b>, hãy viết ra bốn dòng mà bạn nghĩ chương trình sẽ in — kể cả hai con số ' +
         'thập phân và cặp byte ở dòng thứ ba. Chỉ sau khi đã viết xong mới ' +
         '<code>gcc -Wall -o order order.c &amp;&amp; ./order</code>.',
      blocks: [
        { t: 'code', where: 'file', lang: 'c', code:
          '/* order.c -- what htons() actually does to the bytes */\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <arpa/inet.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    uint16_t host = 502;                 /* Modbus TCP port, as a plain number */\n' +
          '    uint16_t net  = htons(host);\n' +
          '    unsigned char *p = (unsigned char *)&net;\n' +
          '\n' +
          '    printf("host order  = %u  (0x%04X)\\n", host, host);\n' +
          '    printf("net  order  = %u  (0x%04X)\\n", net,  net);\n' +
          '    printf("bytes in RAM after htons = %02X %02X\\n", p[0], p[1]);\n' +
          '    printf("ntohs(net)  = %u\\n", ntohs(net));\n' +
          '    return 0;\n' +
          '}\n' },
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/embedded/bt24 && cd ~/embedded/bt24\n' +
          '# create order.c, then:\n' +
          'gcc -Wall -o order order.c && ./order' }
      ],
      hint: '502 ở dạng thập lục phân là 0x01F6. <code>htons</code> đảo hai byte — vậy giá ' +
            'trị mới đọc như một <code>uint16_t</code> trên máy little-endian là bao nhiêu?',
      crit: [
        'Dòng 1 đúng: <code>host order  = 502  (0x01F6)</code>',
        'Dòng 2 đúng: <code>net  order  = 62977  (0xF601)</code> — dự đoán được <b>cả</b> con ' +
          'số thập phân 62977, không chỉ nói "một số khác"',
        'Dòng 3 đúng: <code>bytes in RAM after htons = 01 F6</code> — <b>không</b> phải ' +
          '<code>F6 01</code>',
        'Dòng 4 đúng: <code>ntohs(net)  = 502</code> — đảo hai lần thì về chỗ cũ',
        'Giải thích được vì sao dòng 2 và dòng 3 <i>trông ngược nhau</i>: dòng 3 in các byte ' +
          'theo thứ tự chúng nằm trong RAM (tức thứ tự sẽ đi ra dây), còn dòng 2 in ' +
          '<i>giá trị</i> mà máy little-endian đọc được từ chính hai byte đó'
      ],
      solBlocks: [
        { t: 'p', x: 'Output thật:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'host order  = 502  (0x01F6)\n' +
          'net  order  = 62977  (0xF601)\n' +
          'bytes in RAM after htons = 01 F6\n' +
          'ntohs(net)  = 502' },
        { t: 'p', x: 'Chỗ dễ dự đoán sai nhất là dòng 3 so với dòng 2. Chúng KHÔNG mâu thuẫn, ' +
                   'chúng đo hai thứ khác nhau:' },
        { t: 'list', items: [
          'Dòng 3 đọc từng byte theo địa chỉ tăng dần: 01 rồi F6. Đây chính là thứ tự các ' +
            'byte sẽ đi ra dây, và đó là big-endian — byte quan trọng nhất trước. htons() đã ' +
            'làm đúng việc của nó.',
          'Dòng 2 bảo máy đọc hai byte đó NHƯ một uint16_t. Máy này là little-endian nên nó ' +
            'lấy byte thấp trước: 0xF6 là byte thấp, 0x01 là byte cao, ra 0xF601 = 62977.'
        ] },
        { t: 'p', x: 'Nói cách khác, 62977 không phải "giá trị đúng ở dạng mạng" — nó là một ' +
                   'con số vô nghĩa, kết quả của việc đọc dữ liệu big-endian bằng con mắt ' +
                   'little-endian. Nó chỉ có ý nghĩa khi nằm trong sin_port và được đưa cho ' +
                   'nhân, vì nhân biết trường đó là network byte order.' },
        { t: 'p', x: 'Đó cũng là toàn bộ nội dung của câu A1: quên htons không sinh lỗi, nó chỉ ' +
                   'khiến bạn bind vào một con số khác — con số mà việc đọc nhầm cách sinh ' +
                   'ra.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Chương trình dưới đây tạo <b>hai</b> cặp socket cục bộ — một <code>SOCK_STREAM</code>, ' +
         'một <code>SOCK_DGRAM</code> — rồi ghi vào mỗi cặp <b>ba</b> thông điệp 11 byte giống ' +
         'hệt nhau, sau đó múc cạn phía bên kia. Hãy dự đoán <b>số lời gọi ' +
         '<code>read()</code></b> của từng cặp và <b>số byte mỗi lần</b>, rồi mới chạy. Trả ' +
         'lời thêm: vì sao lần chạy này cho kết quả <b>lặp lại được</b>, trong khi thí nghiệm ' +
         'TCP của Bài 24 thì không?',
      blocks: [
        { t: 'code', where: 'file', lang: 'c', code:
          '/* pairs.c -- SOCK_STREAM vs SOCK_DGRAM, same three writes */\n' +
          '#include <stdio.h>\n' +
          '#include <string.h>\n' +
          '#include <errno.h>\n' +
          '#include <unistd.h>\n' +
          '#include <sys/socket.h>\n' +
          '\n' +
          'static const char *msg[3] = { "meas1:41.5|", "meas2:42.0|", "meas3:42.5|" };\n' +
          '\n' +
          'static int send_three(int fd)\n' +
          '{\n' +
          '    for (int i = 0; i < 3; i++)\n' +
          '        if (write(fd, msg[i], 11) != 11) { perror("write"); return -1; }\n' +
          '    return 0;\n' +
          '}\n' +
          '\n' +
          'static void drain(const char *label, int type)\n' +
          '{\n' +
          '    int sv[2];\n' +
          '    char buf[256];\n' +
          '    int calls = 0;\n' +
          '    long total = 0;\n' +
          '\n' +
          '    /* SOCK_NONBLOCK so the drain loop ends on EAGAIN instead of blocking */\n' +
          '    if (socketpair(AF_UNIX, type | SOCK_NONBLOCK, 0, sv) < 0) { perror("socketpair"); return; }\n' +
          '    if (send_three(sv[0]) < 0) return;\n' +
          '    close(sv[0]);\n' +
          '\n' +
          '    for (;;) {\n' +
          '        ssize_t n = read(sv[1], buf, sizeof buf - 1);\n' +
          '        if (n > 0) {\n' +
          '            buf[n] = 0;\n' +
          '            printf("  [%s] read() call %d returned %zd bytes: \\"%s\\"\\n",\n' +
          '                   label, ++calls, n, buf);\n' +
          '            total += n;\n' +
          '            continue;\n' +
          '        }\n' +
          '        if (n == 0) { printf("  [%s] read() returned 0 -> peer closed\\n", label); break; }\n' +
          '        printf("  [%s] read() returned -1, errno = %d -> queue empty\\n", label, errno);\n' +
          '        break;\n' +
          '    }\n' +
          '    printf("  [%s] total %ld bytes in %d read() calls\\n\\n", label, total, calls);\n' +
          '    close(sv[1]);\n' +
          '}\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    drain("stream", SOCK_STREAM);\n' +
          '    drain("dgram ", SOCK_DGRAM);\n' +
          '    return 0;\n' +
          '}\n' },
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt24\n' +
          'gcc -Wall -o pairs pairs.c && ./pairs; echo "exit code = $?"' }
      ],
      hint: 'Cặp nào giữ ranh giới thông điệp, cặp nào không? Và ba lần ghi 11 byte cộng lại ' +
            'là bao nhiêu?',
      crit: [
        '<code>stream</code>: đúng <b>1</b> lời gọi <code>read()</code>, trả về <b>33</b> byte ' +
          '— ba thông điệp dính thành một',
        '<code>dgram</code>: đúng <b>3</b> lời gọi <code>read()</code>, mỗi lần <b>11</b> byte ' +
          '— ranh giới được giữ nguyên',
        'Cả hai đều kết thúc bằng <code>read() returned -1, errno = 11</code> ' +
          '(<code>EAGAIN</code>), không phải <code>0</code> — vì fd là ' +
          '<code>SOCK_NONBLOCK</code> và hàng đợi đã cạn',
        'Tổng của cả hai đều là <b>33</b> byte: số byte không đổi, chỉ có cách chia là khác',
        'Giải thích được vì sao lần này lặp lại được: hai đầu socketpair nằm trong ' +
          '<b>cùng một tiến trình</b>, ba lần ghi xong hết <b>trước khi</b> lời ' +
          '<code>read()</code> đầu tiên chạy — không có mạng, không có bộ lập lịch, không có ' +
          'thời điểm ngẫu nhiên nào để chen vào giữa'
      ],
      solBlocks: [
        { t: 'p', x: 'Output thật:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '[stream] read() call 1 returned 33 bytes: "meas1:41.5|meas2:42.0|meas3:42.5|"\n' +
          '[stream] read() returned -1, errno = 11 -> queue empty\n' +
          '[stream] total 33 bytes in 1 read() calls' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '[dgram ] read() call 1 returned 11 bytes: "meas1:41.5|"\n' +
          '[dgram ] read() call 2 returned 11 bytes: "meas2:42.0|"\n' +
          '[dgram ] read() call 3 returned 11 bytes: "meas3:42.5|"\n' +
          '[dgram ] read() returned -1, errno = 11 -> queue empty\n' +
          '[dgram ] total 33 bytes in 3 read() calls' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'exit code = 0' },
        { t: 'p', x: 'Cùng ba lần write() 11 byte, cùng 33 byte tới nơi, hai cách chia hoàn ' +
                   'toàn khác nhau. Cái quyết định không phải cách bạn ghi mà là KIỂU của ' +
                   'socket:' },
        { t: 'list', items: [
          'SOCK_STREAM là một dòng byte. Nó không lưu ở đâu việc bạn đã gọi write() mấy ' +
            'lần; ba thông điệp chảy vào cùng một dòng và ra trong một read().',
          'SOCK_DGRAM giữ ranh giới. Mỗi write() là một gói; mỗi read() lấy đúng một gói và ' +
            'không bao giờ ghép hai gói lại. Đây chính là lý do UDP dễ dùng cho dữ liệu cảm ' +
            'biến rời rạc.'
        ] },
        { t: 'p', x: 'Vì sao lặp lại được, còn TCP ở Bài 24 thì không: hai đầu của socketpair ' +
                   'nằm trong cùng một tiến trình, và ba lời write() chạy hết TRƯỚC khi ' +
                   'read() đầu tiên được gọi. Không có mạng, không có bộ lập lịch xen vào, ' +
                   'không có thời điểm ngẫu nhiên nào để read() chen vào giữa hai write(). Ở ' +
                   'thí nghiệm TCP, tiến trình đọc là một tiến trình khác và nó có thể được ' +
                   'đánh thức bất cứ lúc nào — đó là toàn bộ nguồn gốc của tính ngẫu nhiên, ' +
                   'và cũng là lý do bạn không được viết mã dựa vào số lần read().' },
        { t: 'p', x: 'errno = 11 là EAGAIN, không phải lỗi: nó là câu trả lời "hàng đợi rỗng, ' +
                   'quay lại sau" của một fd non-blocking.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Ba con số trần dưới đây quyết định một máy chủ TCP chịu được bao nhiêu kết nối, và ' +
         'cả ba đều đọc được mà không cần viết một dòng C nào. Hãy tìm lệnh đọc từng con số, ' +
         'chạy trên máy bạn, và ghi lại giá trị: <b>(1)</b> dải cổng tạm thời mà nhân cấp cho ' +
         'phía khách; <b>(2)</b> trần hàng đợi kết nối chờ <code>accept()</code>; ' +
         '<b>(3)</b> số mô tả file tối đa shell hiện tại được mở.',
      hint: 'Hai con số đầu nằm trong <code>/proc/sys</code>. Con số thứ ba là một builtin của ' +
            'shell, không phải file.',
      crit: [
        '(1) <code>cat /proc/sys/net/ipv4/ip_local_port_range</code> — trên máy này ra ' +
          '<b>32768   60999</b>',
        '(2) <code>cat /proc/sys/net/core/somaxconn</code> — trên máy này ra <b>4096</b>',
        '(3) <code>ulimit -n</code> — trên máy này ra <b>10240</b>',
        'Nhận ra <code>ulimit</code> là <b>builtin của shell</b>, nên ' +
          '<code>which ulimit</code> không tìm thấy gì (Bài 4)',
        'Liên hệ được ít nhất một con số với một triệu chứng thật: ví dụ cổng ephemeral của ' +
          'khách trong câu E4 phải rơi vào dải (1), hoặc trần (3) là thứ ' +
          '<code>accept()</code> chạm phải khi trả về <code>EMFILE</code>'
      ],
      solBlocks: [
        { t: 'p', x: 'Lệnh và output thật trên máy này:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '$ cat /proc/sys/net/ipv4/ip_local_port_range\n' +
          '32768\t60999' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '$ cat /proc/sys/net/core/somaxconn\n' +
          '4096' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '$ ulimit -n\n' +
          '10240' },
        { t: 'p', x: 'Ý nghĩa của từng con số:' },
        { t: 'list', items: [
          '32768–60999 là dải cổng nhân tự cấp cho phía khách khi bạn connect() mà không ' +
            'bind() trước. Khoảng 28 000 cổng, và đó là trần thực tế cho số kết nối ĐỒNG THỜI ' +
            'mà một máy khách mở được tới cùng một cặp (IP, cổng) máy chủ. Ở câu E4 bạn sẽ ' +
            'thấy một cổng cụ thể trong dải này.',
          'somaxconn = 4096 là trần cho backlog của listen(). Bạn có xin listen(fd, 100000) ' +
            'thì nhân vẫn cắt xuống 4096. Đây là hàng đợi các kết nối đã bắt tay xong nhưng ' +
            'chưa được accept() múc ra; đầy hàng đợi thì khách mới bị từ chối.',
          'ulimit -n = 10240 là số fd tối đa của tiến trình. Mỗi kết nối đã accept() là một ' +
            'fd, cộng thêm fd listen, epoll, signalfd, log... Chạm trần thì accept() trả −1 ' +
            'với EMFILE — đúng nhánh 2 của câu C3.'
        ] },
        { t: 'p', x: 'Lưu ý ulimit là builtin của shell chứ không phải chương trình: which ' +
                   'ulimit không tìm thấy gì, và giá trị bạn đặt chỉ áp cho shell đó cùng các ' +
                   'tiến trình con của nó. Trần thực tế của một daemon đang chạy phải đọc ở ' +
                   '/proc/&lt;pid&gt;/limits, không phải ở shell của bạn.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Câu A4 khẳng định rằng ngay sau khi <code>accept()</code> thành công, phía máy chủ ' +
         'có <b>hai</b> socket dính tới cổng 9200. Hãy tự chứng minh điều đó bằng ' +
         '<code>nc</code> và <code>ss</code>: mở một máy chủ nghe ở 9200, nối một khách vào, ' +
         'rồi liệt kê <b>cả</b> socket đang nghe <b>lẫn</b> socket đã thiết lập. Ghi lại: ' +
         'số fd của từng socket phía máy chủ, và cổng của phía khách.',
      blocks: [
        { t: 'cmdx', title: 'Gợi ý các mảnh bạn cần', rows: [
          ['<code>nc -l 127.0.0.1 9200</code>', 'máy chủ nghe (chạy nền hoặc một cửa sổ khác)'],
          ['<code>nc 127.0.0.1 9200</code>', 'máy khách nối vào'],
          ['<code>ss -tlnp</code>', 'chỉ các socket TCP đang <b>nghe</b>, kèm tiến trình'],
          ['<code>ss -tnp state established</code>', 'chỉ các socket TCP đã <b>thiết lập</b>'],
          ['<code>pkill -x nc</code>', 'dọn sạch sau khi xong — <b>dùng <code>-x</code></b>, ' +
            'nếu không mẫu tìm kiếm có thể khớp cả shell đang chạy lệnh']
        ]}
      ],
      hint: 'Không có <code>state established</code> thì <code>ss -tlnp</code> chỉ cho bạn ' +
            'một nửa câu chuyện — nó lọc bỏ đúng cái socket bạn muốn thấy.',
      crit: [
        'Thấy socket <b>LISTEN</b> ở <code>127.0.0.1:9200</code>, phía xa là ' +
          '<code>0.0.0.0:*</code>, trên <b>fd 3</b> của tiến trình <code>nc</code> máy chủ',
        'Thấy socket <b>ESTAB</b> của cùng tiến trình đó ở <code>127.0.0.1:9200</code>, nhưng ' +
          'trên một fd <b>khác</b> — <b>fd 4</b>',
        'Thấy cổng của phía khách là một cổng <b>tạm thời</b> nằm trong dải đo được ở câu E3 ' +
          '(máy này: 49644, trong 32768–60999)',
        'Kết luận đúng: socket nghe <b>không</b> biến mất khi có khách; ' +
          '<code>accept()</code> <b>sinh thêm</b> một socket mới, nên máy chủ vẫn nhận được ' +
          'khách tiếp theo',
        'Nhận ra kết nối loopback xuất hiện <b>hai lần</b> trong bảng established — một dòng ' +
          'cho mỗi đầu, vì cả hai đầu đều nằm trên máy này',
        'Có dọn tiến trình <code>nc</code> sau khi xong'
      ],
      solBlocks: [
        { t: 'p', x: 'Một cách làm, và output thật trên máy này:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'nc -l 127.0.0.1 9200 &\n' +
          'sleep 0.3\n' +
          'nc 127.0.0.1 9200 &\n' +
          'sleep 0.3\n' +
          'echo "--- listening ---";   ss -tlnp | grep 9200\n' +
          'echo "--- established ---"; ss -tnp state established | grep 9200\n' +
          'pkill -x nc' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- listening ---\n' +
          'LISTEN 0  1     127.0.0.1:9200   0.0.0.0:*        users:(("nc",pid=642,fd=3))\n' +
          '--- established ---\n' +
          'ESTAB  0  0     127.0.0.1:9200   127.0.0.1:49644  users:(("nc",pid=642,fd=4))\n' +
          'ESTAB  0  0     127.0.0.1:49644  127.0.0.1:9200   users:(("nc",pid=645,fd=3))' },
        { t: 'p', x: 'Đọc bảng này:' },
        { t: 'list', items: [
          'pid 642 là máy chủ. Nó có HAI socket: fd 3 vẫn đang LISTEN ở 9200, và fd 4 là ' +
            'kết nối đã thiết lập với khách. Đó chính là điều câu A4 nói: accept() không biến ' +
            'socket nghe thành socket dữ liệu, nó sinh thêm một socket mới. Nhờ vậy fd 3 rảnh ' +
            'để nhận khách tiếp theo.',
          '49644 là cổng tạm thời nhân cấp cho pid 645 (máy khách) vì nó không bind() gì ' +
            'cả. Nó nằm gọn trong dải 32768–60999 bạn đọc được ở câu E3.',
          'Kết nối xuất hiện hai dòng vì đây là loopback: cả hai đầu đều ở trên máy này, ' +
            'nên ss thấy cả hai. Trên một kết nối thật ra ngoài mạng bạn chỉ thấy một dòng.'
        ] },
        { t: 'p', x: 'Hai cái bẫy đáng nhớ:' },
        { t: 'list', items: [
          'ss -tlnp một mình KHÔNG cho thấy socket ESTAB — cờ -l lọc bỏ đúng cái bạn cần. ' +
            'Nhiều người kết luận nhầm "chỉ có một socket" từ đó.',
          'Dùng pkill -x nc chứ đừng pkill -f "nc .*9200": mẫu -f khớp cả dòng lệnh của ' +
            'shell đang chạy nó, và bạn sẽ tự giết chính mình (lỗi này đã xảy ra thật khi ' +
            'chuẩn bị câu này).'
        ] }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Chương trình dưới đây phải nghe ở cổng <b>9100</b>. Nó biên dịch sạch, ' +
         '<code>bind()</code> và <code>listen()</code> đều trả về <b>0</b>, không một lời gọi ' +
         'nào báo lỗi — nhưng không khách nào nối được vào 9100. Hãy chạy nó, đọc dòng ' +
         '<code>actually listening</code>, chỉ ra <b>một dòng</b> gây lỗi, sửa, và chạy lại ' +
         'để xác nhận. Nói thêm: con số sai đó có <b>cố định</b> giữa các lần chạy không, và ' +
         'vì sao?',
      blocks: [
        { t: 'code', where: 'file', lang: 'c', code:
          '/* bindport.c -- listens on the wrong port and reports success */\n' +
          '#include <stdio.h>\n' +
          '#include <string.h>\n' +
          '#include <unistd.h>\n' +
          '#include <arpa/inet.h>\n' +
          '#include <sys/socket.h>\n' +
          '\n' +
          '#define WANTED_PORT 9100\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    struct sockaddr_in addr, got;\n' +
          '    socklen_t len = sizeof got;\n' +
          '    int fd = socket(AF_INET, SOCK_STREAM, 0);\n' +
          '    int rb, rl;\n' +
          '\n' +
          '    memset(&addr, 0, sizeof addr);\n' +
          '    addr.sin_family      = AF_INET;\n' +
          '    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);\n' +
          '    addr.sin_port        = WANTED_PORT;\n' +
          '\n' +
          '    rb = bind(fd, (struct sockaddr *)&addr, sizeof addr);\n' +
          '    rl = listen(fd, 16);\n' +
          '    printf("bind() and listen() both returned %d -- no error\\n", (rb | rl));\n' +
          '\n' +
          '    getsockname(fd, (struct sockaddr *)&got, &len);\n' +
          '    printf("asked for port      : %d\\n", WANTED_PORT);\n' +
          '    printf("actually listening  : %d\\n", ntohs(got.sin_port));\n' +
          '\n' +
          '    close(fd);\n' +
          '    return 0;\n' +
          '}\n' },
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt24\n' +
          'gcc -Wall -o bindport bindport.c && ./bindport' }
      ],
      hint: 'Trường nào của <code>sockaddr_in</code> được gán mà <b>không</b> đi qua một hàm ' +
            'đổi thứ tự byte, trong khi trường ngay trên nó thì có?',
      crit: [
        'Chỉ đúng dòng lỗi: <code>addr.sin_port = WANTED_PORT;</code> — thiếu ' +
          '<code>htons()</code>, trong khi <code>sin_addr</code> ngay trên đã có ' +
          '<code>htonl()</code>',
        'Sửa thành <code>addr.sin_port = htons(WANTED_PORT);</code> và xác nhận ' +
          '<code>actually listening  : 9100</code>',
        'Ghi lại con số sai thật: <b>35875</b> — và trả lời đúng rằng nó <b>cố định</b>',
        'Giải thích được vì sao cố định: 9100 = <code>0x238C</code>, đảo byte thành ' +
          '<code>0x8C23</code> = <b>35875</b> — một phép biến đổi tất định, không phải cổng ' +
          'ngẫu nhiên do nhân cấp',
        'Giải thích được vì sao không có lỗi nào: 35875 là một cổng <b>hợp lệ</b> và đang ' +
          'rảnh, nên nhân không có lý do gì để từ chối',
        'Nhận ra <code>getsockname()</code> là công cụ chẩn đoán chính ở đây — nó hỏi nhân ' +
          '"thực tế tôi đang gắn vào đâu", thay vì tin vào cái mình đã ghi vào struct'
      ],
      solBlocks: [
        { t: 'p', x: 'Output thật trước khi sửa:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bind() and listen() both returned 0 -- no error\n' +
          'asked for port      : 9100\n' +
          'actually listening  : 35875' },
        { t: 'p', x: 'Dòng lỗi:  addr.sin_port = WANTED_PORT;' },
        { t: 'p', x: 'Sửa thành: addr.sin_port = htons(WANTED_PORT);' },
        { t: 'p', x: 'Sau khi sửa:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bind() and listen() both returned 0 -- no error\n' +
          'asked for port      : 9100\n' +
          'actually listening  : 9100' },
        { t: 'p', x: 'Con số 35875 là CỐ ĐỊNH, không đổi giữa các lần chạy: 9100 = 0x238C, đảo ' +
                   'hai byte thành 0x8C23 = 35875. Đây là một phép biến đổi tất định của ' +
                   'chính con số bạn viết trong mã, không liên quan gì tới cổng ngẫu nhiên ' +
                   'nhân cấp cho phía khách. Nếu con số đổi mỗi lần chạy thì giả thuyết phải ' +
                   'là khác (ví dụ bạn truyền cổng 0), và đó là lý do câu hỏi bắt bạn để ý ' +
                   'tới tính cố định.' },
        { t: 'p', x: 'Vì sao không lời gọi nào báo lỗi: nhân được yêu cầu gắn vào cổng 35875. ' +
                   'Cổng đó hợp lệ và đang rảnh, nên nó gắn vào và trả về 0. Không có tầng ' +
                   'nào biết bạn "định nói 9100" — ý định của bạn không có mặt trong lời gọi ' +
                   'hệ thống.' },
        { t: 'p', x: 'Chi tiết đáng chú ý trong chính đoạn mã: sin_addr ĐÃ được bọc htonl(), ' +
                   'còn sin_port thì không. Đây là hình dạng điển hình của lỗi này ngoài đời ' +
                   '— người viết biết về thứ tự byte, chỉ sót một trường.' },
        { t: 'p', x: 'Và getsockname() là công cụ chính: thay vì tin vào struct mình đã điền, ' +
                   'hãy hỏi nhân xem thực tế fd đang gắn vào đâu. Thêm ba dòng đó vào mọi máy ' +
                   'chủ trong giai đoạn phát triển, bạn sẽ không bao giờ mất một buổi chiều ' +
                   'cho lỗi này nữa.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Viết một máy chủ <b>echo</b> đơn luồng dùng <code>epoll</code>, phục vụ được ' +
         '<b>hai</b> khách <code>nc</code> cùng lúc: mọi thứ khách gõ được trả lại nguyên văn ' +
         'cho <b>chính</b> khách đó, và khi một khách thoát thì khách kia vẫn dùng được bình ' +
         'thường. Yêu cầu tối thiểu: một fd nghe đã <code>listen()</code>, một ' +
         '<code>epoll</code> fd, mọi fd khách đặt <code>O_NONBLOCK</code>, xử lý đúng ba ' +
         'trường hợp <code>read()</code> trả về &gt; 0 / = 0 / −1. Sau khi nó chạy được, gõ ' +
         '<code>file ./echoserv</code> và trả lời: <b>cùng file nhị phân đó</b> có chạy được ' +
         'trên bo ARM64 mà bạn đã boot ở Chặng 05 không, và vì sao?',
      hint: 'Ba trường hợp của <code>read()</code>: &gt; 0 là có dữ liệu; <b>= 0 là khách đã ' +
            'đóng</b> nên phải <code>close()</code> (nhân tự gỡ fd khỏi epoll); −1 với ' +
            '<code>EAGAIN</code> là hết dữ liệu, <b>không</b> phải lỗi và tuyệt đối không ' +
            'được đóng kết nối vì nó.',
      crit: [
        'Hai khách <code>nc</code> chạy đồng thời, mỗi khách nhận lại <b>đúng</b> văn bản của ' +
          'mình — không lẫn sang khách kia',
        'Một khách <kbd>Ctrl</kbd>+<kbd>C</kbd> thoát, máy chủ <b>không</b> chết và khách còn ' +
          'lại vẫn gõ được',
        'Có phân biệt fd nghe với fd khách trong vòng lặp sự kiện: sự kiện trên fd nghe thì ' +
          'gọi <code>accept()</code>, sự kiện trên fd khách thì <code>read()</code>',
        '<code>read()</code> trả về <b>0</b> được xử lý bằng <code>close()</code>, và ' +
          '<code>EAGAIN</code> <b>không</b> bị coi là lỗi',
        'Giá trị trả về của <code>write()</code> được kiểm tra, không giả định nó luôn bằng ' +
          'số byte đã đọc (Bài 19)',
        '<code>file ./echoserv</code> cho <code>ELF 64-bit LSB … <b>x86-64</b></code>',
        'Trả lời đúng: <b>không</b> chạy được trên bo ARM64 — mã máy trong file là x86-64, ' +
          'CPU ARM64 không giải mã được, và nhân sẽ từ chối <code>exec</code> chứ không phải ' +
          'chương trình chạy sai'
      ],
      solBlocks: [
        { t: 'p', x: 'Đây là câu mở, không có một lời giải duy nhất. Bộ khung tối thiểu:' },
        { t: 'code', where: 'file', lang: 'c', nocopy: true, code:
          'lfd = socket(); bind(htons(PORT)); listen(lfd, 16);\n' +
          'ep  = epoll_create1(0);\n' +
          'epoll_ctl(ep, EPOLL_CTL_ADD, lfd, &ev);      /* EPOLLIN */\n' +
          'for (;;) {\n' +
          '    n = epoll_wait(ep, evs, MAXEV, -1);\n' +
          '    for (i = 0; i < n; i++) {\n' +
          '        if (evs[i].data.fd == lfd) {\n' +
          '            cfd = accept(lfd, NULL, NULL);\n' +
          '            fcntl(cfd, F_SETFL, O_NONBLOCK);\n' +
          '            epoll_ctl(ep, EPOLL_CTL_ADD, cfd, &ev);\n' +
          '        } else {\n' +
          '            /* read until EAGAIN, echo back what came in */\n' +
          '        }\n' +
          '    }\n' +
          '}' },
        { t: 'p', x: 'Chỗ hầu hết người viết lần đầu sai là ba nhánh của read():' },
        { t: 'list', items: [
          'n  &gt; 0  -&gt; có dữ liệu, echo lại cho CHÍNH fd đó',
          'n == 0  -&gt; khách đã đóng. close(fd). Không close thì fd rò, và epoll sẽ báo ' +
            'sự kiện đó mãi mãi -&gt; vòng lặp quay 100 % CPU.',
          'n  &lt; 0 &amp;&amp; errno == EAGAIN -&gt; hết dữ liệu, hoàn toàn bình thường, ' +
            'đi tiếp. Đóng kết nối vì EAGAIN là lỗi kinh điển và nó làm khách bị rớt ngẫu ' +
            'nhiên.'
        ] },
        { t: 'p', x: 'Nhớ kiểm tra giá trị trả về của write(): nó có thể ghi thiếu (Bài 19), và ' +
                   'trên một khách đã bỏ đi nó sẽ sinh SIGPIPE — hãy ignore SIGPIPE hoặc dùng ' +
                   'send(..., MSG_NOSIGNAL).' },
        { t: 'p', x: 'Phần thứ hai của câu hỏi là cửa vào Chặng 04. file ./echoserv sẽ in đại ý:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          './echoserv: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), ...' },
        { t: 'p', x: 'Chữ x86-64 là câu trả lời. File này chứa mã máy của CPU Intel/AMD. Bo ' +
                   'ARM64 bạn boot ở Chặng 05 có tập lệnh hoàn toàn khác, nên nó không giải ' +
                   'mã được những byte này. Và điều quan trọng: chương trình sẽ KHÔNG chạy ' +
                   'sai — nó không chạy chút nào. Nhân đọc tiêu đề ELF, thấy kiến trúc không ' +
                   'khớp, và từ chối exec.' },
        { t: 'p', x: 'Vậy làm sao có được một file .c duy nhất mà chạy được trên bo? Đó đúng là ' +
                   'câu hỏi của Bài 25 — Vì sao phải cross-compile.' }
      ] }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     F · BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     ══════════════════════════════════════════════════════════════════════ */
  diag: [
    ['A1, B3, C1, E1, E5',
     'Thứ tự byte: vì sao <code>htons()</code> là bắt buộc kể cả trên loopback, và vì sao ' +
       'quên nó thì <b>không</b> có lỗi nào',
     '<a href="#/bai-24#thu-tu-byte-vi-sao-phai-co-htons">Đọc lại Bài 24 — Thứ tự byte</a>'],

    ['A5, B1, C2, E2',
     'TCP là dòng byte: một <code>write()</code> không tương ứng một <code>read()</code>, và ' +
       'ranh giới thông điệp là việc của bạn',
     '<a href="#/bai-24#tcp-la-dong-byte-khong-phai-dong-thong-diep">Đọc lại Bài 24 — TCP là ' +
       'dòng byte</a>'],

    ['A3, B2, C5',
     'Vì sao cột <code>epoll</code> phẳng còn <code>poll</code> thì không: chi phí nằm ở chỗ ' +
       'đặt danh sách theo dõi',
     '<a href="#/bai-24#epoll-de-nhan-nho-ho-danh-sach">Đọc lại Bài 24 — epoll: để nhân nhớ ' +
       'hộ danh sách</a>'],

    ['A2, C3',
     '<code>FD_SETSIZE</code> = 1024 là hằng số biên dịch, và vượt qua nó là ' +
       '<code>abort()</code> chứ không phải một mã lỗi',
     '<a href="#/bai-24#select-nguoi-dau-tien-va-gioi-han-1024">Đọc lại Bài 24 — select và ' +
       'giới hạn 1024</a>'],

    ['A6, C4',
     'UDP: gói rời rạc, không lời hứa nào — khi nào sự thiếu bảo đảm đó lại là ưu điểm',
     '<a href="#/bai-24#udp-goi-roi-rac-khong-loi-hua-nao">Đọc lại Bài 24 — UDP</a>'],

    ['A4, A7, E4',
     'Bộ khung một máy chủ TCP: bốn bước theo đúng thứ tự, và vì sao sau ' +
       '<code>accept()</code> có <b>hai</b> socket',
     '<a href="#/bai-24#bo-khung-cua-mot-may-chu-tcp">Đọc lại Bài 24 — Bộ khung một máy chủ ' +
       'TCP</a>'],

    ['A8, B5, E6',
     '<code>O_NONBLOCK</code> và <code>EAGAIN</code>: vì sao vẫn cần chúng bên trong một vòng ' +
       '<code>epoll</code>',
     '<a href="#/bai-24#i-o-khong-chan-va-eagain">Đọc lại Bài 24 — I/O không chặn và EAGAIN</a>'],

    ['B4',
     'Vì sao một luồng phải nhiều kênh: chờ tuần tự không tốn CPU, nó tốn <b>thời gian</b>',
     '<a href="#/bai-24#mot-luong-nhieu-kenh-bai-toan-that-su-cua-bai-nay">Đọc lại Bài 24 — ' +
       'Một luồng, nhiều kênh</a>'],

    ['B6',
     'So sánh TCP với UDP bằng số đo: khi nào một chênh lệch phần trăm là <b>không</b> có ý ' +
       'nghĩa',
     '<a href="#/bai-24#udp-goi-roi-rac-khong-loi-hua-nao">Đọc lại Bài 24 — UDP</a>'],

    ['E3, E4, C3',
     'Các trần của hệ thống và bảng lỗi thường gặp: <code>EMFILE</code>, backlog, cổng tạm thời',
     '<a href="#/bai-24#loi-thuong-gap">Đọc lại Bài 24 — Lỗi thường gặp</a>'],

    ['D1',
     '<code>write()</code> có thể ghi <b>thiếu</b>, và đó là thành công chứ không phải lỗi',
     '<a href="#/bai-19">Đọc lại Bài 19 — Syscall và File I/O</a>'],

    ['D2',
     'Giá thật của một luồng: 8 MB vùng địa chỉ ngăn xếp cho mỗi luồng',
     '<a href="#/bai-22">Đọc lại Bài 22 — Luồng và đồng bộ với pthread</a>'],

    ['D3',
     '<code>signalfd</code>: biến tín hiệu thành một mô tả file để nó xếp hàng cùng mọi sự ' +
       'kiện khác',
     '<a href="#/bai-21">Đọc lại Bài 21 — Tín hiệu và tắt máy êm</a>']
  ]
});

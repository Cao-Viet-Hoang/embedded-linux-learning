/* ═══════════════════════════════════════════════════════════════════════════
   bt-19 — Bài tập cho Bài 19: Syscall và File I/O
   ═══════════════════════════════════════════════════════════════════════════

   CHỌN TRỤC XOÁY — bảy bước của CLAUDE.md §13.4 (skill write-exercise).
   Ghi lại ở đây để một phiên sau kiểm toán được lựa chọn thay vì phải suy lại.

   ── Bước 1 · Kiểm kê ────────────────────────────────────────────────────────
   Nguồn: goals, mọi h2/h3, mọi cal kind:'why', mọi tiêu đề cmdx, terms, recap
   của lessons/bai-19.js. 17 ứng viên:

     1  user space không được chạm phần cứng — ranh giới đặc quyền
     2  một syscall diễn ra thế nào (số hiệu vào thanh ghi, chuyển chế độ)
     3  số hiệu syscall khác nhau theo kiến trúc
     4  file descriptor là chỉ số vào một bảng RIÊNG của tiến trình
     5  0/1/2 là stdin/stdout/stderr
     6  năm lời gọi nền tảng open/read/write/close/lseek
     7  errno chỉ có nghĩa ngay sau một lời gọi ĐÃ báo lỗi; không bị xoá về 0
     8  read()/write() có thể chuyển ÍT hơn số byte yêu cầu mà không hề có lỗi
     9  một syscall đắt hơn một lời gọi hàm bao nhiêu
    10  stdio có đệm vs syscall thuần — số lời gọi write chênh nhau hàng trăm lần
    11  glibc lấy kích thước đệm từ st_blksize
    12  chế độ đệm phụ thuộc stdout là terminal hay không
    13  strace nhìn xuyên qua chương trình không có mã nguồn
    14  lseek quá cuối file tạo ra file thưa (sparse)
    15  ghi vào /dev/full cho ENOSPC — một write thất bại thật
    16  O_CREAT bắt buộc phải có tham số mode
    17  viết lại cp bằng năm syscall

   ── Bước 2 · Chấm điểm 0/1/2 trên ba trục ───────────────────────────────────
   D = phụ thuộc về sau · M = giá của hiểu sai · C = phản trực giác

     #   D  M  C  tổng   ghi chú
     ──────────────────────────────────────────────────────────────────────────
     1   2  1  1   4     nền cho cả Chặng 07-13
     2   2  0  1   3     cơ chế, nhưng hiểu sai gần như không tốn gì
     3   1  1  1   3     và là loại tra cứu được trong 10 giây
     4   2  1  1   4     Bài 20 (fork/exec), pipe, driver Chặng 08
     5   1  0  0   1
     6   2  0  0   2     danh sách, không phải nguyên lý
     7   1  2  2   5     errno != 0 KHÔNG phải bằng chứng của lỗi
     8   2  2  2   6     hỏng dữ liệu ÂM THẦM; ai cũng tưởng write ghi hết
     9   1  1  1   3
    10   2  2  2   6     mất log khi mất điện; printf trông như tức thì
    11   0  0  1   1     là dữ kiện môi trường, không phải nguyên lý
    12   1  2  2   5     "chạy đúng trên terminal, sai khi ghi ra file"
    13   2  0  0   2     công cụ, không phải nguyên lý
    14   1  1  2   4
    15   0  1  1   2
    16   0  1  1   2     tra cứu được
    17   —  —  —   —     là bài thực hành, không phải khái niệm

   ── Bước 3 · Cắt (tổng ≥ 4 VÀ ≥ 2 trục ≥ 1) ─────────────────────────────────
   Qua vòng: #8 (6) · #10 (6) · #7 (5) · #12 (5) · #1 (4) · #4 (4) · #14 (4)

   ── Bước 4 · Loại ───────────────────────────────────────────────────────────
   #12  LOẠI — nó là một trường hợp con của #10 (cùng là "đệm của stdio").
        Để cả hai làm trục thì bước 7 hỏng: hai trục sẽ dùng chung từ vựng và
        chung loại bằng chứng. Giữ #10, #12 xuống làm câu thường (B5, E2).
   #1   LOẠI — quá gần trục đã tiêu của bt-01 ("MMU là ranh giới cứng, không
        phải dung lượng RAM"). §13.4 bước 4: một khái niệm chỉ được xoáy MỘT
        lần trong cả khoá. Xuống phần D không được (D dành cho bài cũ), nên nó
        làm câu thường A4 + B6.
   #14  LOẠI — điểm thấp nhất trong nhóm qua vòng, và nghiêng về hành vi của hệ
        thống file hơn là nguyên lý của lời gọi hệ thống. Làm câu thường E4.
   #4   GIỮ LẠI DỰ BỊ — 4 điểm, nhưng #7 hơn một điểm và giá của hiểu sai cao
        hơn hẳn. #4 thành câu thường A2 + D (Bài 20 sẽ dùng nó nhiều).

   ── Kiểm tra chồng lấn với §13.8 (trục đã tiêu) ─────────────────────────────
   bt-01…bt-17 đã rà. Điểm cần chú ý duy nhất: bt-10 đã tiêu trục
   "ống dẫn chỉ mang fd 1 — fd 2 đi vòng qua nó". Bằng chứng của trục #10 ở đây
   (chương trình mix.c trộn printf với write(2,...)) NHÌN thì giống, nên câu B2
   cố tình gộp CẢ HAI luồng vào CÙNG một file (2>&1). Làm vậy thì biến "fd nào
   đi đường nào" bị triệt tiêu hoàn toàn, và thứ duy nhất còn lại giải thích
   được thứ tự đảo là THỜI ĐIỂM xả đệm. Đó là ranh giới giữa bt-10 và bt-19.

   ── Bước 5 · Ba câu có thể sai ──────────────────────────────────────────────
   T0  write() trả về số byte nó THỰC SỰ ghi được, và con số đó có thể nhỏ hơn
       số byte bạn yêu cầu mà KHÔNG có lỗi nào xảy ra — nên mọi lời gọi write
       đúng đắn đều phải nằm trong một vòng lặp.
   T1  printf không ghi ra thiết bị: nó ghi vào một vùng đệm nằm TRONG tiến
       trình của bạn, và vùng đệm đó chỉ đi xuống nhân khi đầy, khi gặp '\n'
       trên terminal, hoặc khi chương trình kết thúc êm.
   T2  errno chỉ có nghĩa NGAY SAU một lời gọi đã báo lỗi qua giá trị trả về;
       không lời gọi nào đặt nó về 0 khi thành công, nên errno != 0 không phải
       là bằng chứng của lỗi.

   ── Bước 6 · Hiểu sai đối lập ───────────────────────────────────────────────
   M0  "write() ghi hết, hoặc thất bại. Kiểm tra if (write(...) < 0) là đủ."
   M1  "printf in ra ngay. Thấy dòng chữ trên màn hình tức là nó đã được ghi."
   M2  "Sau mỗi lời gọi cứ nhìn errno. errno == 0 nghĩa là mọi thứ ổn."

   ── Bước 7 · Lưới 3 × 1 và kiểm tra ─────────────────────────────────────────
          A (phát biểu)              B (dữ liệu thật đo được)        C (tình huống mới)
   T0     a1 giá trị trả về          b1 65536/1048576 trên ống       c1 UART 115200 trên board
          của write nghĩa là gì         không chặn, errno = 0           gửi thiếu, không báo lỗi
   T1     a3 printf ghi vào đâu      b2 mix.c: cùng một file,        c2 mất điện giữa chừng,
                                        thứ tự vẫn đảo                  log mất ba dòng cuối
   T2     a5 errno được đặt về 0     b4 errno = 2 SAU một open       c3 thiết kế API thư viện:
          khi nào                       THÀNH CÔNG                      báo lỗi thế nào cho đúng

   Kiểm tra: C1 không trả lời được nếu không hiểu T0 (phải biết giá trị trả về
   mới nói được "gửi thiếu mà không có lỗi"). Ba loại kích thích khác nhau:
   phát biểu / số đo thật / tình huống có ràng buộc mới. Không câu nào lộ đáp
   án cho câu sau: b1 dùng ống, c1 dùng UART; b2 dùng file, c2 dùng mất điện.

   ═══════════════════════════════════════════════════════════════════════════
   XUẤT XỨ SỐ LIỆU
   Mọi transcript trong file này chạy thật ngày 25/08/2026 trên WSL2 Ubuntu
   26.04 "resolute", gcc 15.2.0, binutils 2.46, strace 6.16, 6 lõi. Chương
   trình dùng ở đây (shortw.c, loopw.c, errnodemo.c, lines.c, mix.c, crashy.c,
   sparse.c, tofull.c, readcost.c) KHÁC hoàn toàn với chương trình của
   lessons/bai-19.js, để người học không trả lời được bằng cách nhớ output cũ.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-19',
  minutes: 85,

  intro:
    '<p>Bài 19 là bài đầu tiên bạn nói chuyện trực tiếp với nhân. Ba thứ trong bài này gây ' +
    'ra nhiều lỗi âm thầm hơn tất cả những thứ còn lại cộng lại, và cả ba đều có chung một ' +
    'đặc điểm: <b>chương trình vẫn chạy, vẫn không báo lỗi, chỉ là kết quả sai</b>. Bộ bài ' +
    'tập này xoáy vào đúng ba thứ đó.</p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài</b> (khoảng 23 phút): phần <b>A</b> và ' +
    '<b>B</b>. Củng cố khi kiến thức còn nóng.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (khoảng 60 phút): phần <b>C</b>, <b>D</b> và ' +
    '<b>E</b>. Khoảng nghỉ không phải là sự trì hoãn — nhớ lại sau khi đã quên một phần ' +
    'thì bám chắc hơn nhiều so với nhớ lại ngay.</li>' +
    '</ul>' +
    '<p><b>Lưu ý về số liệu.</b> Mọi output trong bộ này được đo lại trên một bộ chương ' +
    'trình <b>mới</b>, không phải chương trình bạn đã chạy trong bài học. Bạn không thể trả ' +
    'lời bằng cách nhớ con số cũ — phải đọc và hiểu output trước mắt. Nếu bạn tự chạy lại ' +
    'trên máy mình, vài con số có thể lệch chút ít theo phiên bản glibc; thứ phải giữ ' +
    'nguyên là các <b>quan hệ</b> giữa những con số đó.</p>',

  truc: [
    { id: 'shortwrite',
      name: '<code>write()</code> trả về số byte nó THỰC SỰ ghi được — con số đó có thể nhỏ ' +
            'hơn số byte bạn yêu cầu mà không hề có lỗi nào',
      x: 'Giá trị trả về của <code>write()</code>/<code>read()</code> là một <b>số byte</b>, ' +
         'không phải một cờ thành công. Chỉ <code>-1</code> mới là lỗi; mọi số dương nhỏ hơn ' +
         'số bạn yêu cầu đều là "đã làm được một phần, phần còn lại là việc của bạn".',
      mis: 'Người mới tin rằng <code>write()</code> hoặc ghi hết, hoặc thất bại — nên viết ' +
           '<code>if (write(fd, buf, n) &lt; 0)</code> rồi coi như xong. Trên file thường thì ' +
           'quả thật không bao giờ sai; trên socket, UART hay ống không chặn thì mất dữ liệu, ' +
           'im lặng.' },

    { id: 'buffering',
      name: '<code>printf</code> không ghi ra thiết bị — nó ghi vào một vùng đệm nằm TRONG ' +
            'tiến trình của bạn, và vùng đệm đó chỉ xuống tới nhân khi đầy, khi gặp xuống ' +
            'dòng trên terminal, hoặc khi chương trình kết thúc êm',
      x: 'Giữa <code>printf</code> và <code>write</code> có một lớp trung gian nằm hoàn toàn ' +
         'trong không gian người dùng. Lớp đó tồn tại để <b>gộp</b> hàng trăm nghìn lời gọi ' +
         'thành vài chục syscall — và cái giá phải trả là dữ liệu tồn tại một khoảng thời ' +
         'gian ở nơi mà nhân không nhìn thấy.',
      mis: 'Người mới tin rằng <code>printf</code> in ra ngay lập tức, nên dùng nó để lần vết ' +
           'chương trình. Khi chương trình chết đột ngột, đúng những dòng gần chỗ chết nhất ' +
           'lại là những dòng bị mất — và họ kết luận sai về chỗ chương trình dừng.' },

    { id: 'errno',
      name: '<code>errno</code> chỉ có nghĩa NGAY SAU một lời gọi đã báo lỗi qua giá trị trả ' +
            'về; không lời gọi nào đặt nó về 0 khi thành công',
      x: '<code>errno</code> là một biến toàn cục chỉ được <b>ghi vào</b>, không bao giờ được ' +
         '<b>dọn</b>. Trình tự đúng luôn là: xem giá trị trả về trước, chỉ khi nó báo lỗi mới ' +
         'được đọc <code>errno</code>.',
      mis: 'Người mới coi <code>errno</code> là "trạng thái hiện tại của hệ thống" và viết ' +
           '<code>if (errno != 0)</code> để phát hiện lỗi. Kết quả: báo lỗi cho những lời gọi ' +
           'hoàn toàn thành công, vì giá trị cũ từ vài chục lời gọi trước vẫn còn nằm đó.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gọi <code>ssize_t n = write(fd, buf, 1048576);</code> và nhận được ' +
         '<code>n == 65536</code>. Kết luận nào đúng?',
      opts: [
        'Lời gọi thất bại; phải đọc <code>errno</code> để biết vì sao',
        'Lời gọi đã ghi <b>65 536 byte</b>; 983 040 byte còn lại <b>chưa</b> được ghi và bạn phải tự gọi tiếp',
        'Bộ đệm của nhân chỉ nhận được 65 536 byte, phần còn lại sẽ được ghi nốt trong nền',
        'Đây là hành vi sai của nhân; <code>write()</code> phải ghi đủ hoặc trả về <code>-1</code>'
      ],
      a: 1,
      why: 'Giá trị trả về của <code>write()</code> là <b>số byte đã ghi</b>, không phải cờ ' +
           'thành công/thất bại. Chỉ <code>-1</code> mới là lỗi, và chỉ khi đó ' +
           '<code>errno</code> mới có nghĩa (phương án A sai vì lý do đó). ' +
           'Phương án C là hiểu sai nguy hiểm nhất: <b>không có</b> chuyện "ghi nốt trong ' +
           'nền" — nhân đã trả quyền điều khiển lại cho bạn và nó sẽ không bao giờ đụng tới ' +
           '983 040 byte kia nữa. Phương án D nhầm hành vi đúng theo chuẩn POSIX thành lỗi. ' +
           'Cách viết đúng luôn là một vòng lặp: cộng dồn con trỏ, trừ dần số byte còn lại, ' +
           'gọi lại cho tới khi hết.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Hai tiến trình cùng đang mở file và cùng có một file descriptor mang số ' +
         '<b>3</b>. Điều đó có nghĩa gì?',
      opts: [
        'Hai tiến trình đang mở cùng một file — số 3 định danh file đó trên toàn hệ thống',
        'Không có nghĩa gì cả: mỗi tiến trình có bảng descriptor <b>riêng</b>, số 3 của tiến trình này không liên quan gì tới số 3 của tiến trình kia',
        'Xung đột — nhân sẽ cấp số khác cho tiến trình mở sau',
        'Hai tiến trình cùng chia sẻ một vị trí đọc/ghi trong file'
      ],
      a: 1,
      why: 'File descriptor là <b>chỉ số vào một mảng riêng của từng tiến trình</b>. Nhân giữ ' +
           'một bảng cho mỗi tiến trình, và luôn cấp số nhỏ nhất còn trống — nên số 3 xuất ' +
           'hiện ở khắp nơi mà chẳng nói lên điều gì chung. Đây cũng là lý do bạn không thể ' +
           '"gửi một fd" cho chương trình khác bằng cách in con số đó ra. ' +
           'Phương án D mô tả một tình huống có thật nhưng chỉ xảy ra sau ' +
           '<code>fork()</code> — hai tiến trình <b>thừa hưởng</b> cùng một mục trong bảng ' +
           'file mở của nhân, và Bài 20 sẽ mổ đúng chuyện đó.' },

    { id: 'a3', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Ngay sau khi <code>printf("xong\\n")</code> trả về, dữ liệu đó đang nằm ở đâu?',
      opts: [
        'Đã ra tới thiết bị — màn hình hoặc file — vì <code>printf</code> là lời gọi hệ thống',
        'Trong hàng đợi của nhân, chờ được ghi xuống đĩa',
        'Trong một vùng đệm nằm <b>trong bộ nhớ của chính tiến trình bạn</b>; nhân có thể chưa hề biết tới nó',
        'Trong bộ nhớ đệm của ổ đĩa, đã qua nhân và đang chờ ghi vật lý'
      ],
      a: 2,
      why: '<code>printf</code> <b>không phải</b> lời gọi hệ thống — nó là hàm của thư viện C, ' +
           'và việc đầu tiên nó làm là chép chuỗi vào một vùng đệm do <code>glibc</code> cấp ' +
           'phát trong tiến trình của bạn. Nhân chỉ biết tới dữ liệu ấy khi đệm đầy, khi gặp ' +
           'xuống dòng <i>và</i> đầu ra là terminal, khi bạn gọi <code>fflush</code>, hoặc khi ' +
           'chương trình kết thúc êm. Phương án B và D mô tả những tầng đệm có thật, nhưng ' +
           'chúng nằm <b>sau</b> tầng bạn đang bị vướng — dữ liệu còn chưa tới được đó. Sự ' +
           'khác biệt này là toàn bộ lý do một chương trình bị <code>kill -9</code> mất mấy ' +
           'dòng log cuối.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Vì sao chương trình của bạn <b>không thể</b> tự ghi thẳng vào thanh ghi của một ' +
         'con chip UART, mà bắt buộc phải đi qua lời gọi hệ thống?',
      opts: [
        'Vì thư viện C không cung cấp hàm nào làm việc đó',
        'Vì mã của bạn chạy ở mức đặc quyền thấp; lệnh chạm phần cứng chỉ hợp lệ ở mức đặc quyền của nhân, và CPU chặn ngay tại chỗ',
        'Vì địa chỉ của thanh ghi thay đổi mỗi lần khởi động nên không thể biết trước',
        'Vì như vậy chương trình sẽ chậm hơn nhiều'
      ],
      a: 1,
      why: 'Đây là ranh giới do <b>CPU</b> áp đặt, không phải một quy ước phần mềm. Mã người ' +
           'dùng chạy ở mức đặc quyền thấp; những lệnh chạm phần cứng chỉ hợp lệ ở mức của ' +
           'nhân. Cố tình vi phạm thì CPU sinh ngoại lệ và nhân giết tiến trình — bạn không ' +
           '"lách" được bằng cách viết assembly. Lời gọi hệ thống là <b>cánh cửa duy nhất</b> ' +
           'có kiểm soát xuyên qua ranh giới đó: nó chuyển CPU sang chế độ nhân tại một địa ' +
           'chỉ do nhân chọn trước, chứ không phải địa chỉ bạn chọn.' },

    { id: 'a5', k: 'tf', truc: 2, tag: 'Đúng/Sai kèm sửa',
      q: 'Một lời gọi hệ thống <b>thành công</b> sẽ đặt <code>errno</code> về 0, nên kiểm tra ' +
         '<code>errno == 0</code> là cách hợp lệ để xác nhận mọi thứ đã ổn.',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nêu rõ trình tự kiểm tra lỗi đúng đắn gồm mấy bước.',
      why: '<b>Sai.</b> Chuẩn C và POSIX chỉ bảo đảm một chiều: khi một lời gọi báo lỗi, nó ' +
           '<b>đặt</b> <code>errno</code>. Không có chiều ngược lại — không lời gọi nào có ' +
           'nghĩa vụ dọn <code>errno</code> khi thành công, và trên thực tế thì không dọn. ' +
           'Tệ hơn: nhiều hàm thư viện <i>thành công</i> vẫn để lại <code>errno</code> khác 0, ' +
           'vì bên trong chúng có thử vài lời gọi và một trong số đó thất bại một cách vô ' +
           'hại.',
      crit: [
        'Nói rõ <code>errno</code> chỉ được <b>ghi vào</b> khi có lỗi, không bao giờ được dọn về 0',
        'Nêu đúng trình tự hai bước: (1) xem <b>giá trị trả về</b>; (2) <b>chỉ khi</b> nó báo lỗi mới đọc <code>errno</code>',
        'Nói được rằng <code>errno</code> phải đọc <b>ngay</b>, trước bất kỳ lời gọi nào khác — kể cả <code>printf</code>',
        'Nêu được cách làm đúng nếu buộc phải dùng <code>errno</code> để phân biệt (ví dụ với <code>strtol</code>): tự đặt <code>errno = 0</code> trước khi gọi'
      ],
      sol: '<p><b>Phát biểu đúng:</b> "Khi một lời gọi báo lỗi qua giá trị trả về, nó đặt ' +
           '<code>errno</code> cho biết lỗi gì. Khi nó thành công, <code>errno</code> giữ ' +
           'nguyên giá trị cũ — có thể là bất cứ thứ gì còn sót lại từ trước."</p>' +
           '<p><b>Trình tự đúng, hai bước, không được đảo:</b></p>' +
           '<ol>' +
           '<li>Xem <b>giá trị trả về</b>. Đây là nguồn sự thật duy nhất về việc lời gọi có ' +
           'thất bại hay không: <code>-1</code> với hầu hết syscall, <code>NULL</code> với ' +
           '<code>fopen</code>/<code>malloc</code>.</li>' +
           '<li><b>Chỉ khi</b> bước 1 báo lỗi mới đọc <code>errno</code>, và phải đọc ' +
           '<b>ngay lập tức</b> — một lời gọi <code>printf</code> chen vào giữa cũng đủ ghi ' +
           'đè nó.</li>' +
           '</ol>' +
           '<p><b>Ngoại lệ đáng nhớ.</b> Vài hàm — <code>strtol</code>, <code>strtod</code> — ' +
           'không có giá trị trả về nào dành riêng cho lỗi, nên chúng bắt buộc phải dùng ' +
           '<code>errno</code>. Với những hàm đó, cách dùng đúng là <b>tự đặt ' +
           '<code>errno = 0</code> ngay trước khi gọi</b>, rồi mới kiểm tra sau. Chính việc ' +
           'phải làm thủ công như vậy là bằng chứng rằng không ai dọn hộ bạn.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<code>read()</code> trả về <b>0</b> nghĩa là đã xảy ra lỗi và không đọc được gì.',
      a: 1,
      rw: 'Viết lại cho đúng, và nêu ba giá trị trả về khác nhau của <code>read()</code> cùng ' +
          'ý nghĩa của từng giá trị.',
      why: '<b>Sai.</b> <code>read()</code> trả về 0 nghĩa là <b>hết file</b> — một kết quả ' +
           'hoàn toàn bình thường, và là cách duy nhất để biết bạn đã đọc tới cuối. Nhầm nó ' +
           'với lỗi thì vòng lặp đọc của bạn hoặc không bao giờ dừng, hoặc dừng rồi báo một ' +
           'lỗi không tồn tại.',
      crit: [
        'Nói rõ 0 = <b>hết file (EOF)</b>, không phải lỗi',
        'Nêu đủ ba nhóm: <b>&gt; 0</b> = số byte đọc được (có thể ít hơn yêu cầu); <b>0</b> = hết file; <b>−1</b> = lỗi, lúc đó mới đọc <code>errno</code>',
        'Nhận ra "&gt; 0 nhưng ít hơn yêu cầu" <b>không</b> phải hết file — đây đúng là trục thứ nhất của bộ bài tập này',
        'Viết được điều kiện dừng đúng của vòng lặp đọc: dừng khi trả về 0, thoát-báo-lỗi khi trả về −1'
      ],
      sol: '<p><b>Phát biểu đúng:</b> "<code>read()</code> trả về 0 khi không còn gì để đọc — ' +
           'đã tới cuối file. Đó là kết thúc bình thường, không phải lỗi."</p>' +
           '<p><b>Ba nhóm giá trị:</b></p>' +
           '<ul>' +
           '<li><b>&gt; 0</b> — số byte thật sự đọc được. Có thể <b>nhỏ hơn</b> số bạn yêu cầu ' +
           'mà vẫn chưa hết file: đọc từ ống, từ socket, từ terminal thì chuyện đó là bình ' +
           'thường.</li>' +
           '<li><b>0</b> — hết file. Với socket thì nghĩa là đầu kia đã đóng kết nối.</li>' +
           '<li><b>−1</b> — lỗi thật. Chỉ đến lúc này <code>errno</code> mới có nghĩa (câu ' +
           'A5).</li>' +
           '</ul>' +
           '<p><b>Vòng lặp đọc đúng:</b></p>' +
           '<pre><code>while ((n = read(fd, buf, sizeof buf)) &gt; 0) {\n' +
           '    /* xử lý đúng n byte, không phải sizeof buf */\n' +
           '}\n' +
           'if (n &lt; 0) { /* lỗi thật */ }</code></pre>' +
           '<p>Lỗi kinh điển là xử lý <code>sizeof buf</code> byte thay vì <code>n</code> ' +
           'byte ở lần lặp cuối — và đó là cách bạn thêm rác vào cuối mỗi file mình chép.</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Điền tên lời gọi hệ thống còn thiếu. Dù bạn dùng <code>printf</code>, ' +
         '<code>fputs</code>, <code>fwrite</code> hay <code>std::cout</code>, cuối cùng dữ ' +
         'liệu vẫn phải rời khỏi tiến trình qua đúng <b>một</b> lời gọi hệ thống, tên là ' +
         '<code>________</code>.',
      ph: 'tên lời gọi hệ thống',
      a: ['write', 'write()', 'sys_write'],
      why: 'Mọi tầng định dạng, mọi lớp bọc, mọi thư viện đều hội tụ về ' +
           '<code>write</code>. Đó là lý do <code>strace -e trace=write</code> đo được ' +
           '<b>bất kỳ</b> chương trình nào, viết bằng bất kỳ ngôn ngữ nào, kể cả khi bạn ' +
           'không có mã nguồn của nó. Đếm số lời gọi <code>write</code> là cách nhanh nhất ' +
           'để biết một chương trình có đệm hay không.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi tình huống với mã lỗi mà nhân trả về trong <code>errno</code>.',
      left: [
        'Mở một file không tồn tại bằng <code>open()</code> mà không có <code>O_CREAT</code>',
        'Ghi vào một file descriptor đã bị <code>close()</code> trước đó',
        'Ghi vào <code>/dev/full</code>, hoặc vào một phân vùng đã hết chỗ',
        'Đọc từ một ống <b>không chặn</b> mà ngay lúc đó chưa có dữ liệu nào',
        'Mở một file mà tiến trình không có quyền theo bộ ba <code>rwx</code>',
        'Một tín hiệu đến giữa lúc <code>read()</code> đang chờ, trước khi đọc được byte nào'
      ],
      right: [
        '<code>EAGAIN</code> — "thử lại sau"; đây <b>không</b> phải hỏng, chỉ là "chưa có gì"',
        '<code>ENOSPC</code> — hết chỗ lưu trữ',
        '<code>ENOENT</code> — không có đường dẫn đó',
        '<code>EINTR</code> — bị tín hiệu cắt ngang; gọi lại là được',
        '<code>EBADF</code> — số descriptor không trỏ tới file đang mở nào',
        '<code>EACCES</code> — quyền truy cập không cho phép'
      ],
      a: [2, 4, 1, 0, 5, 3],
      why: 'Sáu mã này chiếm phần lớn lỗi bạn sẽ gặp trong đời làm nhúng, và ranh giới giữa ' +
           'chúng mới là thứ đáng nhớ. <code>ENOENT</code> và <code>EACCES</code> ' +
           'trông giống nhau từ phía người dùng ("không mở được file") nhưng nguyên nhân khác ' +
           'hẳn — một cái là file không có, một cái là file có mà bạn không được vào (Bài 8). ' +
           '<code>EAGAIN</code> và <code>EINTR</code> đặc biệt quan trọng: <b>cả hai đều ' +
           'không phải lỗi thật</b>. Một chương trình đúng đắn phải <i>gọi lại</i>, không phải ' +
           '<i>báo lỗi rồi thoát</i>. Bỏ qua <code>EINTR</code> là nguyên nhân kinh điển của ' +
           'những chương trình "thỉnh thoảng hỏng" mà không ai tái hiện được — vì nó chỉ xảy ' +
           'ra khi đúng lúc có tín hiệu đến (Bài 21).' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Giải thích vì sao', rows: 7,
      q: 'Hai chương trình, cùng ghi <b>1 MiB</b> (1 048 576 byte) vào một cái ống. ' +
         '<code>shortw</code> đặt ống ở chế độ <b>không chặn</b>; <code>loopw</code> để ống ở ' +
         'chế độ mặc định (<b>chặn</b>) và bọc <code>write()</code> trong vòng lặp. Kết quả ' +
         'đo được ở dưới.<br><br>' +
         'Giải thích <b>ba</b> điều: (1) vì sao lời gọi đầu của <code>shortw</code> trả về ' +
         'đúng 65 536; (2) vì sao <code>errno</code> lúc đó vẫn là <b>0 — Success</b>, trong ' +
         'khi rõ ràng có 983 040 byte chưa được ghi; (3) vì sao <code>loopw</code> chỉ cần ' +
         '<b>một</b> lời gọi cho cả 1 MiB, dù ống vẫn chỉ chứa được 64 KiB.',
      blocks: [
        { t: 'code', where: 'wsl', name: './shortw — ống KHÔNG CHẶN', nocopy: true, code:
          'pipe capacity (F_GETPIPE_SZ) = 65536 bytes\n' +
          'asking write() for            1048576 bytes\n' +
          'call 1: write() returned      65536\n' +
          '        errno = 0 (Success)\n' +
          'call 2: write() returned      -1\n' +
          '        errno = 11 (Resource temporarily unavailable)' },
        { t: 'code', where: 'wsl', name: './loopw | cat > /dev/null — ống CHẶN, có vòng lặp', nocopy: true, code:
          'wrote 1048576 bytes using 1 write() calls' },
      ],
      crit: [
        '(1) 65 536 đúng bằng sức chứa của ống — <code>write()</code> ghi được bao nhiêu thì trả về bấy nhiêu, rồi trả quyền điều khiển lại ngay',
        '(2) Nói rõ <b>không có lỗi nào xảy ra</b>: ghi được 65 536 byte là một <b>thành công một phần</b>, và <code>errno</code> chỉ được đặt khi lời gọi trả về −1',
        '(2) Nhận ra <code>errno = 0</code> ở đây chỉ vì chưa lời gọi nào thất bại từ đầu chương trình — không phải vì <code>write()</code> "báo ổn"',
        '(3) Giải thích đúng ống <b>chặn</b>: nhân <b>ngủ</b> tiến trình cho tới khi ghi hết, nên một lời gọi duy nhất đã chuyển đủ 1 MiB',
        'Rút ra được kết luận đúng về vòng lặp: nó thừa trên ống chặn nhưng <b>bắt buộc</b> ở mọi nơi khác, và bạn không phải lúc nào cũng chọn được chế độ',
        'Nêu được ít nhất hai chỗ mà ghi thiếu xảy ra thật: descriptor không chặn, socket, cổng nối tiếp, hoặc bị tín hiệu cắt ngang'
      ],
      sol: '<p><b>(1) 65 536 là sức chứa của ống</b>, in ra ngay ở dòng đầu. Nhân chép được ' +
           'bấy nhiêu byte thì hết chỗ. Ống ở chế độ <b>không chặn</b> nên nó không được phép ' +
           'ngủ chờ; nó làm được bao nhiêu thì báo bấy nhiêu và trả quyền điều khiển lại cho ' +
           'bạn ngay. Giá trị trả về là <b>số byte</b>, không phải cờ thành công.</p>' +
           '<p><b>(2) Vì không có lỗi nào xảy ra cả.</b> Đây là chỗ trực giác đánh lừa: ' +
           '"983 040 byte chưa ghi" nghe như một thất bại, nhưng theo POSIX thì ghi được một ' +
           'phần là <b>thành công</b>. <code>errno</code> chỉ được đặt khi lời gọi trả về ' +
           '<code>-1</code>, và ở đây nó trả về 65 536. Giá trị 0 mà bạn thấy đơn giản là giá ' +
           'trị <code>errno</code> vẫn mang từ lúc chương trình khởi động — chưa ai ghi vào nó ' +
           '(đúng nội dung câu A5). Đối chiếu với <b>lời gọi 2</b>: lúc đó ống đã đầy, không ' +
           'ghi được byte nào, nên mới trả về <code>-1</code> và <b>bây giờ</b> ' +
           '<code>errno</code> mới có nghĩa: <code>EAGAIN</code> — "chưa được, thử lại sau". ' +
           'Hai lời gọi liền nhau, hai kiểu kết quả hoàn toàn khác nhau.</p>' +
           '<p><b>(3) Vì ống chặn thì nhân được phép cho bạn ngủ.</b> ' +
           '<code>write()</code> vào một descriptor chặn sẽ không quay lại cho tới khi chuyển ' +
           'xong toàn bộ: nhân nhét 64 KiB vào ống, treo tiến trình lại, đợi ' +
           '<code>cat</code> đọc bớt ra, nhét tiếp, lặp lại — tất cả <b>bên trong một lời gọi ' +
           'duy nhất</b>. Từ phía chương trình chỉ thấy một lần gọi và một con số 1 048 576.</p>' +
           '<p><b>Và đây chính là cái bẫy.</b> Trên file thường và trên ống chặn — hai thứ ' +
           'chiếm 99 % số lần bạn dùng <code>write()</code> khi học — vòng lặp trông như thừa ' +
           'thãi. Bạn viết <code>write(fd, buf, n);</code> không kiểm tra gì, và nó chạy đúng ' +
           'hàng nghìn lần. Rồi một ngày bạn ghi ra <b>cổng nối tiếp</b>, ra <b>socket</b>, ra ' +
           'một descriptor mà thư viện khác đã đặt <code>O_NONBLOCK</code> — và mất dữ liệu, ' +
           'im lặng, không một thông báo. Vòng lặp không phải để phòng lỗi; nó là ' +
           '<b>cách dùng đúng</b> của một hàm trả về số byte.</p>' +
           '<p><b>Ghi thiếu xảy ra thật ở đâu:</b> descriptor không chặn (như trên); socket ' +
           'khi bộ đệm gửi đầy; UART khi hàng đợi phần cứng đầy; và trên <i>bất kỳ</i> ' +
           'descriptor nào khi một tín hiệu đến giữa chừng sau khi đã ghi được một phần ' +
           '(Bài 21).</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 7,
      q: 'Chương trình <code>mix.c</code> in bốn dòng, đánh số theo <b>đúng thứ tự trong mã ' +
         'nguồn</b>: dòng 1 và 3 qua <code>printf</code>, dòng 2 và 4 qua ' +
         '<code>write(2, …)</code>. Chạy ba lần, chỉ khác nhau ở chỗ đầu ra đi đâu.<br><br>' +
         'Hãy giải thích vì sao thứ tự đảo. <b>Chú ý trường hợp C</b>: ở đó cả hai luồng cùng ' +
         'chảy vào <b>một file duy nhất</b>, nên "hai đường khác nhau" không còn là lời giải ' +
         'thích được nữa — vậy thì cái gì còn lại?',
      blocks: [
        { t: 'code', where: 'file', name: 'mix.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '#include <unistd.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("1 printf to stdout\\n");\n' +
          '    write(2, "2 write(2) straight to stderr\\n", 30);\n' +
          '    printf("3 printf to stdout\\n");\n' +
          '    write(2, "4 write(2) straight to stderr\\n", 30);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', name: 'A — stdout là terminal thật', nocopy: true, code:
          '1 printf to stdout\n' +
          '2 write(2) straight to stderr\n' +
          '3 printf to stdout\n' +
          '4 write(2) straight to stderr' },
        { t: 'code', where: 'wsl', name: 'B — ./mix | cat  (stdout là ống)', nocopy: true, code:
          '2 write(2) straight to stderr\n' +
          '4 write(2) straight to stderr\n' +
          '1 printf to stdout\n' +
          '3 printf to stdout' },
        { t: 'code', where: 'wsl', name: 'C — ./mix > mixed.txt 2>&1  rồi cat mixed.txt', nocopy: true, code:
          '2 write(2) straight to stderr\n' +
          '4 write(2) straight to stderr\n' +
          '1 printf to stdout\n' +
          '3 printf to stdout' },
      ],
      crit: [
        'Nói rõ <code>write(2, …)</code> là syscall — dữ liệu ra khỏi tiến trình <b>ngay</b>; <code>printf</code> chỉ chép vào đệm trong tiến trình',
        'Giải thích A: stdout là terminal nên glibc chọn chế độ <b>đệm theo dòng</b>, gặp <code>\\n</code> là xả ngay — thứ tự trùng với mã nguồn',
        'Giải thích B và C: stdout <b>không</b> phải terminal nên glibc chuyển sang <b>đệm đầy</b>; hai dòng 1 và 3 nằm im trong đệm tới tận lúc chương trình kết thúc',
        'Trả lời đúng câu hỏi về trường hợp C: cùng một file, cùng một đường — thứ duy nhất còn khác là <b>THỜI ĐIỂM</b> dữ liệu rời khỏi tiến trình',
        'Nhận ra chương trình <b>không đổi một dòng nào</b> giữa ba lần chạy — chính glibc tự đổi hành vi dựa trên kết quả kiểm tra đầu ra có phải terminal không',
        'Nêu được hệ quả: "chạy đúng trên terminal, sai khi ghi ra file" là một lớp lỗi có thật, và cách chữa là <code>fflush</code> hoặc <code>setvbuf</code>'
      ],
      sol: '<p><b>Cơ chế.</b> <code>write(2, …)</code> là lời gọi hệ thống: byte rời khỏi tiến ' +
           'trình <b>ngay tại dòng đó</b>. <code>printf</code> thì không — nó chép chuỗi vào ' +
           'một vùng đệm của <code>glibc</code> nằm trong tiến trình bạn, rồi trả về. Hai ' +
           'đường đi có <b>độ trễ khác nhau</b>, nên thứ tự đến đích không nhất thiết là thứ ' +
           'tự trong mã nguồn.</p>' +
           '<p><b>Vì sao A đúng thứ tự.</b> Khi stdout là terminal, <code>glibc</code> chọn ' +
           'chế độ <b>đệm theo dòng</b>: gặp <code>\\n</code> là xả ngay lập tức. Mỗi dòng ' +
           '<code>printf</code> thành một <code>write</code> đúng lúc, nên bốn dòng ra theo ' +
           'đúng 1-2-3-4.</p>' +
           '<p><b>Vì sao B và C đảo.</b> Khi stdout <b>không</b> phải terminal, ' +
           '<code>glibc</code> chuyển sang <b>đệm đầy</b>: nó chỉ xả khi đệm đầy (4 096 byte ' +
           'trên máy này) hoặc khi chương trình kết thúc êm. Hai dòng của bạn có 38 byte, còn ' +
           'xa mới đầy — nên chúng nằm im trong bộ nhớ tiến trình suốt cả chương trình, trong ' +
           'khi dòng 2 và 4 đã ra ngoài từ lâu. Tới lúc <code>return 0</code>, thư viện C xả ' +
           'đệm, và hai dòng ấy mới xuất hiện — <b>ở cuối</b>.</p>' +
           '<p><b>Trường hợp C là câu trả lời cho câu hỏi.</b> Với <code>2&gt;&amp;1</code>, ' +
           'fd 1 và fd 2 trỏ vào <i>cùng một file</i>: cùng một đích, cùng một đường, không ' +
           'còn "ống chỉ mang fd 1" hay "hai nơi khác nhau" để mà đổ lỗi. Thứ tự vẫn đảo. ' +
           'Vậy biến duy nhất còn lại — và là nguyên nhân thật — là <b>thời điểm</b> dữ liệu ' +
           'rời khỏi tiến trình. Đây là ranh giới giữa bài này và Bài 10: Bài 10 nói về ' +
           '<i>fd nào đi đường nào</i>, còn ở đây là <i>khi nào byte đi</i>.</p>' +
           '<p><b>Chi tiết đáng sợ nhất:</b> mã nguồn <b>không đổi một ký tự</b> giữa ba lần ' +
           'chạy. Chính <code>glibc</code> gọi <code>isatty()</code> lúc khởi tạo luồng và tự ' +
           'chọn chế độ đệm. Nghĩa là chương trình của bạn cư xử khác nhau tuỳ theo ai đang ' +
           'chạy nó và chạy thế nào — bạn thử tay trên terminal thì đúng, CI ghi log ra file ' +
           'thì thứ tự lộn xộn, và bạn không tài nào tái hiện được.</p>' +
           '<p><b>Cách chữa</b> khi thứ tự thật sự quan trọng: <code>fflush(stdout)</code> ' +
           'trước mỗi lần ghi qua đường khác, hoặc <code>setvbuf(stdout, NULL, _IONBF, 0)</code> ' +
           'ngay đầu <code>main</code> để tắt đệm hẳn — trả bằng tốc độ, xem câu E1.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp gửi bạn quy ước xử lý lỗi của nhóm:<br>' +
         '<i>"Sau mỗi lời gọi hệ thống, hãy kiểm tra <code>errno</code>. Nếu ' +
         '<code>errno != 0</code> thì có lỗi, ghi log rồi thoát. Nếu <code>errno == 0</code> ' +
         'thì lời gọi đã thành công và bạn đi tiếp."</i><br><br>' +
         'Quy ước này hỏng ở <b>hai</b> hướng ngược nhau — nó vừa <b>báo lỗi khi không có ' +
         'lỗi</b>, vừa <b>bỏ sót lỗi thật</b>. Dùng output bên dưới làm bằng chứng cho hướng ' +
         'thứ nhất, rồi tự nghĩ ra một trường hợp cho hướng thứ hai.',
      blocks: [
        { t: 'code', where: 'wsl', name: './errnodemo', nocopy: true, code:
          'before anything                    ret=0    errno=0 (Success)\n' +
          'open("/no/such/path") FAILED       ret=-1   errno=2 (No such file or directory)\n' +
          'open("/etc/hostname") OK           ret=3    errno=2 (No such file or directory)\n' +
          'isatty(fd) on a regular file       ret=0    errno=25 (Inappropriate ioctl for device)\n' +
          'close(fd) OK                       ret=0    errno=25 (Inappropriate ioctl for device)' },
      ],
      crit: [
        'Chỉ đúng bằng chứng dòng 3: <code>open</code> <b>thành công</b> (ret=3) nhưng <code>errno</code> vẫn là 2 — giá trị sót lại từ lời gọi thất bại ở dòng 2',
        'Nói rõ nguyên nhân: không lời gọi nào dọn <code>errno</code> về 0 khi thành công',
        'Chỉ ra dòng 4 và 5 là bằng chứng thứ hai, mạnh hơn: <code>isatty</code> <b>thành công</b> theo đúng nghĩa của nó (trả lời "không phải terminal") mà vẫn đặt <code>errno</code> = 25',
        'Hướng ngược lại: một lời gọi thất bại có thể để lại <code>errno</code> mang giá trị mà quy ước này coi là bình thường — hoặc đơn giản là quy ước không hề nhìn giá trị trả về, nên <code>read()</code> trả về ít hơn yêu cầu sẽ lọt qua hoàn toàn',
        'Viết lại quy ước cho đúng: xem <b>giá trị trả về</b> trước; chỉ khi nó báo lỗi mới đọc <code>errno</code>, và phải đọc ngay',
        'Nêu được hệ quả thực tế của quy ước sai: chương trình thoát giữa chừng ở một chỗ hoàn toàn lành, và người sửa đi tìm lỗi ở nơi không có lỗi'
      ],
      sol: '<p><b>Hướng thứ nhất — báo lỗi khi không có lỗi. Bằng chứng nằm ngay trên ' +
           'trang.</b></p>' +
           '<p>Dòng 3: <code>open("/etc/hostname")</code> <b>thành công</b>, trả về descriptor ' +
           '3. Nhưng <code>errno</code> vẫn là 2 — <code>ENOENT</code> — giá trị mà lời gọi ' +
           'thất bại ở dòng 2 để lại. Không ai dọn nó. Theo quy ước của đồng nghiệp bạn, ' +
           'chương trình sẽ ghi log <i>"No such file or directory"</i> rồi thoát, ngay sau khi ' +
           'mở file <b>thành công</b>.</p>' +
           '<p>Dòng 4 còn tệ hơn, vì ở đây không cần lời gọi nào thất bại trước: ' +
           '<code>isatty()</code> làm <b>đúng việc của nó</b> — trả lời "descriptor này không ' +
           'phải terminal" — nhưng cách nó biết điều đó là thử một lệnh ' +
           '<code>ioctl</code> chỉ terminal mới hiểu, và lệnh đó thất bại với ' +
           '<code>ENOTTY</code>. Một hàm hoàn toàn thành công vẫn đặt <code>errno</code> = 25. ' +
           'Dòng 5 cho thấy nó còn nằm đó sau cả <code>close()</code> thành công.</p>' +
           '<p><b>Hướng thứ hai — bỏ sót lỗi thật.</b> Quy ước này <b>không hề nhìn giá trị ' +
           'trả về</b>, mà giá trị trả về mới là nguồn sự thật. Vài cách nó bỏ sót:</p>' +
           '<ul>' +
           '<li><code>write()</code> trả về 65 536 thay vì 1 048 576 (câu B1): không có lỗi, ' +
           '<code>errno</code> không đổi, quy ước cho qua — và bạn mất 983 040 byte.</li>' +
           '<li><code>read()</code> trả về 0 (hết file, câu A6) trông y hệt "không có lỗi", ' +
           'nên vòng lặp nào dựa vào <code>errno</code> để dừng sẽ chạy mãi.</li>' +
           '<li>Một lời gọi thất bại thật nhưng <code>errno</code> vô tình vẫn mang giá trị ' +
           'cũ giống hệt — quy ước báo sai nguyên nhân, và bạn đi sửa nhầm chỗ.</li>' +
           '</ul>' +
           '<p><b>Quy ước viết lại cho đúng:</b></p>' +
           '<p>"Sau mỗi lời gọi, kiểm tra <b>giá trị trả về</b> theo đúng đặc tả của lời gọi ' +
           'đó (<code>-1</code>, <code>NULL</code>, hoặc số byte nhỏ hơn số yêu cầu). ' +
           '<b>Chỉ khi</b> giá trị trả về báo lỗi mới được đọc <code>errno</code>, và phải đọc ' +
           '<b>ngay lập tức</b> — trước cả <code>printf</code>. Đừng bao giờ suy ra trạng thái ' +
           'thành công từ <code>errno</code>."</p>' +
           '<p><b>Vì sao lỗi này đắt.</b> Nó làm chương trình chết ở một chỗ hoàn toàn lành ' +
           'lặn, với một thông báo lỗi <i>có thật</i> nhưng thuộc về một sự kiện khác, xảy ra ' +
           'ở chỗ khác, có khi từ rất lâu trước đó. Người đi sửa sẽ đọc log, tin nó, và tìm ' +
           'lỗi ở nơi không hề có lỗi.</p>' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp', rows: 6,
      q: 'Chương trình dưới đây mở <b>một</b> file rồi ghi vào nó bằng <b>hai</b> tay cầm ' +
         'khác nhau: <code>FILE *f</code> và <code>int fd</code>. Chú ý ' +
         '<code>fd = fileno(f)</code> — chúng trỏ tới <b>cùng một file đang mở</b>, không ' +
         'phải hai file.<br><br>' +
         'Trong tất cả những khác biệt giữa <code>FILE *</code> và <code>int fd</code>, ' +
         '<b>khác biệt nào là khác biệt quan trọng</b> — cái giải thích được kết quả bên dưới?',
      blocks: [
        { t: 'code', where: 'file', name: 'twohandles.c (phần thân)', lang: 'c', code:
          'FILE *f = fopen("two.txt", "w");\n' +
          'int   fd = fileno(f);\n' +
          '\n' +
          'fprintf(f, "A via fprintf (buffered)\\n");\n' +
          'write(fd, "B via write   (raw)\\n", 20);\n' +
          'fprintf(f, "C via fprintf (buffered)\\n");\n' +
          'write(fd, "D via write   (raw)\\n", 20);\n' +
          'fclose(f);' },
        { t: 'code', where: 'wsl', name: 'cat two.txt', nocopy: true, code:
          'B via write   (raw)\n' +
          'D via write   (raw)\n' +
          'A via fprintf (buffered)\n' +
          'C via fprintf (buffered)' },
        { t: 'code', where: 'wsl', name: 'strace -e trace=write ./twohandles', nocopy: true, code:
          'write(3, "B via write   (raw)\\n", 20)   = 20\n' +
          'write(3, "D via write   (raw)\\n", 20)   = 20\n' +
          'write(3, "A via fprintf (buffered)\\nC via f"..., 50) = 50' },
      ],
      crit: [
        'Khác biệt <b>không</b> quan trọng: kiểu dữ liệu, tên hàm, chuyện một cái là con trỏ còn cái kia là số nguyên',
        'Khác biệt quan trọng: <code>int fd</code> là <b>tay cầm của nhân</b>; <code>FILE *</code> là một <b>struct trong tiến trình bạn</b> có chứa fd đó cộng thêm một vùng đệm',
        'Nói rõ quan hệ chứa đựng: <code>FILE *</code> nằm <b>trên</b> fd, không song song với nó — <code>fileno()</code> lấy fd ra từ bên trong',
        'Đọc đúng dòng thứ ba của strace: A và C được gộp thành <b>một</b> lời gọi 50 byte, xảy ra lúc <code>fclose</code>',
        'Kết luận đúng: thứ tự trong file là thứ tự các <b>syscall</b>, không phải thứ tự các dòng lệnh trong mã nguồn',
        'Nêu đúng cách chữa (<code>fflush(f)</code> sau mỗi <code>fprintf</code>) và kết luận thực hành: <b>không trộn hai tay cầm</b> trên cùng một file'
      ],
      sol: '<p><b>Khác biệt không quan trọng:</b> một cái là <code>int</code>, một cái là con ' +
           'trỏ; một bên dùng <code>write</code>, một bên dùng <code>fprintf</code>; một bên ' +
           'có định dạng <code>%d</code>, bên kia không. Toàn những thứ đúng mà vô dụng ở ' +
           'đây.</p>' +
           '<p><b>Khác biệt quan trọng: chúng nằm ở hai phía của ranh giới nhân — và một cái ' +
           'CHỨA cái kia.</b></p>' +
           '<ul>' +
           '<li><code>int fd</code> là <b>tay cầm của nhân</b>: một chỉ số vào bảng file mở ' +
           'của tiến trình. Ghi qua nó là một syscall, byte đi ngay.</li>' +
           '<li><code>FILE *</code> là một <b>struct nằm trong bộ nhớ tiến trình bạn</b>, do ' +
           '<code>glibc</code> cấp phát. Bên trong nó có đúng con số <code>fd</code> kia, ' +
           '<b>cộng thêm một vùng đệm</b> và trạng thái định dạng. Nhân không biết gì về ' +
           'struct này.</li>' +
           '</ul>' +
           '<p>Nói cách khác đây không phải hai tay cầm ngang hàng: <code>FILE *</code> là một ' +
           'lớp <b>nằm trên</b> fd, và <code>fileno()</code> chỉ moi con số ở bên trong nó ' +
           'ra.</p>' +
           '<p><b>Vì sao kết quả như vậy.</b> Dòng thứ ba của <code>strace</code> nói hết: ' +
           'A và C không bao giờ đi riêng lẻ — chúng nằm trong đệm cho tới ' +
           '<code>fclose()</code>, rồi đi cùng nhau trong <b>một</b> lời gọi 50 byte ' +
           '(25 + 25). Còn B và D đã là syscall ngay từ lúc gọi. Ba lời gọi ' +
           '<code>write</code> đó xảy ra theo thứ tự B, D, rồi A+C — và <b>thứ tự trong file ' +
           'là thứ tự của syscall</b>, không phải thứ tự các dòng bạn viết.</p>' +
           '<p><b>Kiểm chứng:</b> thêm <code>fflush(f)</code> ngay sau mỗi ' +
           '<code>fprintf</code> thì file ra đúng A, B, C, D. Chèn <code>fflush</code> tức là ' +
           'ép struct đó đẩy đệm xuống nhân ngay tại chỗ, và hai tay cầm lại đồng bộ.</p>' +
           '<p><b>Quy tắc mang đi:</b> đừng trộn <code>FILE *</code> với ' +
           '<code>write(fileno(f), …)</code> trên cùng một file. Chọn một tay cầm rồi dùng ' +
           'nhất quán. Với đọc thì còn tệ hơn: cả hai bên đều có thể đọc trước vào đệm riêng, ' +
           'nên bạn có thể mất hẳn dữ liệu chứ không chỉ đảo thứ tự.</p>' },

    { id: 'b5', k: 'free', tag: 'Đọc output', rows: 6,
      q: 'Bạn <code>strace</code> lệnh <code>cat /etc/hostname &gt; o.txt</code> — một file ' +
         'chỉ có <b>9 byte</b>. Dưới đây là phần cuối của trace, từ lúc ' +
         '<code>cat</code> mở file nguồn. Bên cạnh là bảng thống kê của ' +
         '<code>dd</code> làm đúng công việc ấy.<br><br>' +
         'Đọc và trả lời: (1) vì sao <b>không có một lời gọi <code>write</code> nào</b>? ' +
         '(2) lời gọi <code>splice</code> đầu tiên thất bại — vì sao, và ' +
         '<code>cat</code> xử lý ra sao? (3) hai file descriptor <b>4</b> và <b>5</b> ở đâu ra, ' +
         'khi chương trình chỉ mở đúng một file?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'strace -e trace=openat,read,write,close,splice cat /etc/hostname > o.txt', nocopy: true, code:
          'openat(AT_FDCWD, "/etc/hostname", O_RDONLY|O_CLOEXEC) = 3\n' +
          'splice(3, NULL, 1, NULL, 1048576, 0)    = -1 EINVAL (Invalid argument)\n' +
          'splice(3, NULL, 5, NULL, 1048576, 0)    = 9\n' +
          'splice(4, NULL, 1, NULL, 9, 0)          = 9\n' +
          'splice(3, NULL, 5, NULL, 1048576, 0)    = 0\n' +
          'close(5)                                = 0\n' +
          'close(4)                                = 0\n' +
          'close(3)                                = 0\n' +
          '+++ exited with 0 +++' },
        { t: 'code', where: 'wsl', name: 'strace -c -e trace=read,write dd if=/etc/hostname of=o2.txt bs=4096', nocopy: true, code:
          '% time     seconds  usecs/call     calls    errors syscall\n' +
          '------ ----------- ----------- --------- --------- ----------------\n' +
          ' 84.27    0.000150           7        20           read\n' +
          ' 15.73    0.000028          28         1           write\n' +
          '------ ----------- ----------- --------- --------- ----------------\n' +
          '100.00    0.000178           8        21           total' },
      ],
      hint: '<code>splice</code> chuyển byte giữa hai descriptor mà <b>không</b> chép chúng ' +
            'lên không gian người dùng. Nó có một ràng buộc cứng: <b>ít nhất một</b> trong hai ' +
            'đầu phải là một cái ống.',
      crit: [
        '(1) Trả lời đúng: <code>cat</code> dùng <code>splice</code> — chuyển byte thẳng giữa hai descriptor trong nhân, dữ liệu <b>không bao giờ đi vào bộ nhớ tiến trình</b>, nên không cần <code>read</code> lẫn <code>write</code>',
        '(2) <code>splice</code> đòi ít nhất một đầu là ống; ở đây cả nguồn (file thường) lẫn đích (fd 1, đang là file thường) đều không phải ống → <code>EINVAL</code>',
        '(2) Nói rõ <code>cat</code> <b>không thoát</b> mà chuyển sang phương án dự phòng — một lời gọi thất bại nằm trong kế hoạch, không phải sự cố',
        '(3) fd 4 và 5 là hai đầu của một <b>ống</b> mà <code>cat</code> tự tạo để làm trạm trung chuyển: file → ống (fd 5 ghi), ống → đích (fd 4 đọc)',
        'Đọc đúng ba con số 9, 9, 0: chuyển 9 byte vào ống, 9 byte ra khỏi ống, rồi 0 = hết file',
        'Nêu được bài học phương pháp: <code>strace</code> cho bạn thấy chương trình <b>thật sự</b> làm gì, chứ không phải điều bạn đoán nó làm'
      ],
      sol: '<p><b>(1) Vì <code>cat</code> không chép dữ liệu qua tiến trình của nó.</b> ' +
           '<code>read</code> + <code>write</code> nghĩa là: nhân chép byte lên bộ nhớ người ' +
           'dùng, rồi chép ngược trở xuống — hai lần chép cho dữ liệu mà chương trình chẳng ' +
           'hề nhìn tới. <code>splice()</code> nối thẳng hai descriptor <b>bên trong nhân</b>; ' +
           'byte không bao giờ rời khỏi không gian nhân. Đó là lý do bảng trace không có ' +
           '<code>write</code> nào cả.</p>' +
           '<p>Đối chiếu với <code>dd</code>, làm đúng theo lối cũ: <b>1</b> lời gọi ' +
           '<code>write</code>, đúng như bạn mong đợi.</p>' +
           '<p><b>(2) <code>splice</code> đòi ít nhất một đầu phải là ống.</b> Đó là ràng buộc ' +
           'thiết kế: cơ chế này dựa trên bộ đệm vòng của ống trong nhân. Lời gọi đầu tiên ' +
           'nối file thường (fd 3) với fd 1 — mà fd 1 lúc này cũng là file thường vì bạn đã ' +
           '<code>&gt; o.txt</code>. Không đầu nào là ống → <code>EINVAL</code>.</p>' +
           '<p>Điều đáng học nằm ở chỗ <code>cat</code> <b>không thoát</b>. Lời gọi thất bại ' +
           'ấy là một phép <b>thăm dò có chủ ý</b>: "thử đường nhanh trước; không được thì ' +
           'thôi". Rất nhiều lỗi <code>ENOENT</code>, <code>EINVAL</code>, ' +
           '<code>EACCES</code> bạn thấy trong một trace là chuyện bình thường của chương ' +
           'trình đang dò đường — thấy lỗi trong <code>strace</code> <b>không</b> có nghĩa là ' +
           'có gì hỏng.</p>' +
           '<p><b>(3) fd 4 và 5 là hai đầu của một cái ống do <code>cat</code> tự tạo</b> để ' +
           'thoả mãn đúng ràng buộc ở trên. Nó dùng ống ấy làm trạm trung chuyển, thành hai ' +
           'chặng:</p>' +
           '<ul>' +
           '<li><code>splice(3, …, 5, …)</code> = 9 — chuyển 9 byte từ file vào ống (fd 5 là ' +
           'đầu ghi);</li>' +
           '<li><code>splice(4, …, 1, …)</code> = 9 — chuyển 9 byte từ ống (fd 4 là đầu đọc) ' +
           'ra file đích;</li>' +
           '<li><code>splice(3, …, 5, …)</code> = 0 — thử lấy tiếp, được 0 byte, tức là hết ' +
           'file (đúng nghĩa của số 0 ở câu A6).</li>' +
           '</ul>' +
           '<p>Suốt cả quá trình, 9 byte đó chưa từng nằm trong bộ nhớ của ' +
           '<code>cat</code>.</p>' +
           '<p><b>Bài học phương pháp.</b> Nếu bạn được hỏi "<code>cat</code> hoạt động thế ' +
           'nào" thì hầu như ai cũng vẽ ra một vòng lặp <code>read</code>/<code>write</code>. ' +
           '<code>strace</code> vừa cho thấy điều đó <b>sai</b> trên chính máy này — và bạn ' +
           'không cần một dòng mã nguồn nào để biết. Đó là toàn bộ giá trị của công cụ: nó nói ' +
           'chương trình <i>đã làm gì</i>, không phải điều bạn <i>tin rằng</i> nó làm.</p>' +
           '<p><b>Ghi chú về máy này:</b> <code>cat --version</code> báo ' +
           '<code>cat (uutils coreutils) 0.8.0</code> — Ubuntu 26.04 dùng bộ coreutils viết ' +
           'lại bằng Rust. Bản GNU cổ điển dùng <code>read</code>/<code>write</code>, nên trên ' +
           'một bản phân phối khác bạn sẽ thấy trace khác hẳn. Điều này chỉ củng cố thêm bài ' +
           'học: <b>hãy đo, đừng đoán</b>.</p>' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Linux có một thiết bị tên <code>/dev/full</code>: ghi vào nó thì <b>luôn luôn</b> ' +
         'thất bại như một phân vùng đã hết chỗ. Nó tồn tại để bạn thử được nhánh xử lý lỗi mà ' +
         'bình thường rất khó tái hiện.<br><br>' +
         'Giải thích: (1) vì sao <code>write()</code> ở đây trả về <code>-1</code> chứ không ' +
         'phải một số nhỏ hơn 5, trong khi câu B1 vừa nói ghi thiếu là chuyện bình thường? ' +
         '(2) Lệnh <code>echo</code> của shell phát hiện được lỗi này và thoát với mã 1 — hãy ' +
         'chỉ ra <b>chính xác</b> chỗ mà một chương trình C ngây thơ dùng <code>printf</code> ' +
         'sẽ <b>không</b> phát hiện được.',
      blocks: [
        { t: 'code', where: 'wsl', name: './tofull — write(fd, "hello", 5) vào /dev/full', nocopy: true, code:
          'write() returned -1, errno = 28 (No space left on device)' },
        { t: 'code', where: 'wsl', name: 'echo hello > /dev/full ; echo $?', nocopy: true, code:
          'bash: echo: write error: No space left on device\n' +
          '1' },
      ],
      crit: [
        '(1) Phân biệt đúng: ghi được <b>0</b> byte không phải là "ghi thiếu" mà là <b>thất bại</b> — <code>write()</code> chỉ trả về số dương khi đã chuyển được ít nhất một byte',
        '(1) Nêu đúng <code>ENOSPC</code> = 28, và nói được rằng chỉ lúc này <code>errno</code> mới có nghĩa (câu A5)',
        '(2) Chỉ đúng chỗ mất dấu vết: <code>printf</code> chỉ chép vào đệm nên nó trả về bình thường; lỗi thật xảy ra <b>lúc xả đệm</b>, thường là bên trong <code>exit()</code>',
        '(2) Nói rõ hệ quả: chương trình có thể thoát với mã <b>0</b> trong khi <b>không byte nào</b> tới được đích',
        'Nêu được cách viết đúng: kiểm tra giá trị trả về của <code>fflush</code>/<code>fclose</code>, hoặc dùng <code>ferror(stdout)</code> trước khi thoát',
        'Liên hệ được với nhúng: thẻ nhớ đầy hoặc hỏng là chuyện thường ngày, và đây đúng là cách thiết bị "vẫn chạy" mà chẳng ghi được gì'
      ],
      sol: '<p><b>(1) Vì không byte nào được ghi cả.</b> Ranh giới rất rõ: ' +
           '<code>write()</code> trả về một <b>số dương</b> khi đã chuyển được ít nhất một ' +
           'byte — đó là "thành công một phần" của câu B1. Khi nó không chuyển được ' +
           '<i>byte nào</i>, không còn con số dương nào để trả về, nên nó trả ' +
           '<code>-1</code> và <b>lúc này</b> mới đặt <code>errno</code> — ở đây là ' +
           '<code>ENOSPC</code> (28). Hai tình huống nghe giống nhau ("không ghi đủ") nhưng ' +
           'thuộc hai hạng mục hoàn toàn khác, và chương trình của bạn phải xử lý khác nhau: ' +
           'một cái thì <b>gọi lại</b>, một cái thì <b>báo lỗi</b>.</p>' +
           '<p><b>(2) Chương trình C ngây thơ mất dấu vết ở đâu.</b> Xét:</p>' +
           '<pre><code>printf("hello\\n");\n' +
           'return 0;</code></pre>' +
           '<p><code>printf</code> chỉ chép 6 byte vào đệm của <code>glibc</code> và trả về ' +
           '6 — <b>hoàn toàn thành công</b>, vì ở thời điểm đó chưa có syscall nào xảy ra. ' +
           'Lời gọi <code>write</code> thật chỉ diễn ra lúc xả đệm, mà chỗ xả đệm lại nằm bên ' +
           'trong <code>exit()</code>, <b>sau</b> khi <code>main</code> đã trả về 0. Không còn ' +
           'ai để nhận thông báo lỗi nữa.</p>' +
           '<p><b>Kết quả:</b> chương trình thoát với mã <b>0</b>, không in cảnh báo nào, và ' +
           '<b>không một byte nào</b> tới được đích. Đây chính là trục thứ hai của bộ bài tập ' +
           'này quay lại cắn bạn ở một góc khác: đệm không chỉ làm <i>trễ</i> dữ liệu, nó còn ' +
           'làm trễ cả <b>tin báo lỗi</b> — trễ tới mức không ai đọc được nữa.</p>' +
           '<p><b>Vì sao <code>echo</code> của bash phát hiện được:</b> nó kiểm tra giá trị ' +
           'trả về ở đúng chỗ và báo <code>write error</code> rồi thoát 1.</p>' +
           '<p><b>Cách viết đúng trong C:</b></p>' +
           '<pre><code>if (fflush(stdout) != 0 || ferror(stdout)) {\n' +
           '    /* dữ liệu KHÔNG tới đích — thoát khác 0 */\n' +
           '}</code></pre>' +
           '<p>Hoặc <code>fclose()</code> và kiểm tra giá trị trả về của nó. Nguyên tắc: ' +
           '<b>lời gọi cuối cùng chạm tới đệm cũng là một lời gọi có thể thất bại</b>, và nó ' +
           'phải được kiểm tra như mọi lời gọi khác.</p>' +
           '<p><b>Vì sao chuyện này quan trọng với nhúng.</b> Thẻ nhớ đầy, thẻ hỏng, phân ' +
           'vùng chỉ đọc sau một lần treo — đều là chuyện thường ngày ngoài hiện trường. Thiết ' +
           'bị vẫn chạy, đèn vẫn nháy, <code>main</code> vẫn trả về 0, và log thì trống trơn. ' +
           '<code>/dev/full</code> là cách bạn thử trước nhánh đó trên bàn làm việc.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán/biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 7,
      q: 'Bạn viết firmware cho một board công nghiệp. Nó gửi bản tin trạng thái ra ' +
         '<b>cổng nối tiếp</b> (<code>/dev/ttyS1</code>, 115200 baud) cho một máy tính giám ' +
         'sát. Hàm gửi:<br><br>' +
         'Trên bàn làm việc, mọi bản tin đều tới đủ, hàng nghìn lần. Ngoài hiện trường, ' +
         'khoảng <b>1 trong 200</b> bản tin tới nơi <b>bị cụt đuôi</b> — mất vài chục ký tự ' +
         'cuối, không theo quy luật nào. Không có log lỗi. <code>dmesg</code> sạch. Thay cáp, ' +
         'thay board, đổi máy giám sát: y nguyên.<br><br>' +
         'Nêu <b>nguyên nhân</b>, giải thích vì sao nó chỉ lộ ra ngoài hiện trường, và viết ' +
         'lại hàm cho đúng.',
      blocks: [
        { t: 'code', where: 'file', name: 'send_status() — bản đang chạy', lang: 'c', code:
          'void send_status(int fd, const char *msg, size_t len)\n' +
          '{\n' +
          '    write(fd, msg, len);\n' +
          '}' },
      ],
      hint: 'Câu hỏi không phải "vì sao <code>write()</code> lỗi" — nó <b>không</b> lỗi. Hãy ' +
            'hỏi: hàm này đã <b>bỏ đi</b> thứ gì?',
      crit: [
        'Chỉ đúng: giá trị trả về của <code>write()</code> bị vứt bỏ, nên một lần <b>ghi thiếu</b> đi qua mà không ai biết',
        'Nói rõ đây <b>không phải lỗi</b>: <code>write()</code> trả về một số dương hợp lệ, <code>errno</code> không đổi, nên không có gì để mà log',
        'Giải thích vì sao trên bàn làm việc không thấy: hàng đợi truyền của UART còn rỗng nên gần như luôn nuốt trọn bản tin trong một lần',
        'Giải thích vì sao ngoài hiện trường mới thấy: bản tin dày hơn / dài hơn, hàng đợi đầy, và 115200 baud ≈ 11,5 KB/s — phần cứng <b>chậm hơn nhiều</b> so với tốc độ sinh dữ liệu',
        'Nêu đúng vì sao lỗi có vẻ ngẫu nhiên: nó phụ thuộc trạng thái hàng đợi tại đúng thời điểm gọi, tức là phụ thuộc thời gian, không phụ thuộc dữ liệu',
        'Viết lại bằng <b>vòng lặp</b> cộng dồn số byte đã ghi, và xử lý riêng <code>-1</code> (kể cả <code>EINTR</code> thì gọi lại)',
        'Nhận ra ba thứ bị thay (cáp, board, máy giám sát) đều không liên quan — lỗi nằm trong <b>phần mềm</b>, ở đúng dòng đó'
      ],
      sol: '<p><b>Nguyên nhân: hàm vứt giá trị trả về của <code>write()</code>.</b> Khi hàng ' +
           'đợi truyền của UART không còn đủ chỗ cho cả bản tin, nhân nhận phần vừa với chỗ ' +
           'trống và trả về <b>số byte thật sự nhận</b>. Phần còn lại không đi đâu cả — nó ' +
           'nằm trong bộ nhớ của bạn và bị bỏ lại khi hàm trả về.</p>' +
           '<p><b>Vì sao không có log lỗi.</b> Vì <b>không có lỗi</b>. Đây đúng là kết luận ' +
           'của câu B1: ghi được một phần là <b>thành công</b>. <code>write()</code> trả về ' +
           'một số dương hoàn toàn hợp lệ, <code>errno</code> không bị đụng tới, ' +
           '<code>dmesg</code> chẳng có gì để nói. Mọi công cụ đều báo bình thường, vì theo ' +
           'đúng đặc tả thì mọi thứ <b>đang</b> bình thường. Chỉ có ý định của bạn là sai.</p>' +
           '<p><b>Vì sao chỉ lộ ra ngoài hiện trường.</b> Hãy nhìn con số: 115200 baud ≈ ' +
           '<b>11,5 KB mỗi giây</b>. Một dòng 100 byte mất gần <b>9 mili-giây</b> để bò ra ' +
           'khỏi cổng. Trên bàn làm việc bạn gửi thưa, hàng đợi luôn rỗng, nên nó nuốt trọn ' +
           'bản tin ngay — hàng nghìn lần liền, không sai lần nào. Ngoài hiện trường, bản tin ' +
           'dày hơn hoặc dài hơn, hàng đợi chưa kịp cạn thì lần gửi sau đã tới; lúc đó chỗ ' +
           'trống chỉ còn một phần và bạn mất phần đuôi.</p>' +
           '<p>Tỉ lệ 1/200 nghe như lỗi phần cứng chập chờn, nhưng nó <b>phụ thuộc thời ' +
           'gian</b>, không phụ thuộc dữ liệu: nó hỏi "lúc gọi thì hàng đợi còn bao nhiêu ' +
           'chỗ". Đó là lý do thay cáp, thay board, đổi máy giám sát đều vô ích — cả ba đều ' +
           'không phải nơi có lỗi.</p>' +
           '<p><b>Viết lại cho đúng:</b></p>' +
           '<pre><code>int send_status(int fd, const char *msg, size_t len)\n' +
           '{\n' +
           '    size_t sent = 0;\n' +
           '\n' +
           '    while (sent &lt; len) {\n' +
           '        ssize_t n = write(fd, msg + sent, len - sent);\n' +
           '        if (n &lt; 0) {\n' +
           '            if (errno == EINTR)  continue;   /* bị tín hiệu cắt: gọi lại */\n' +
           '            return -1;                       /* lỗi thật: bây giờ errno mới có nghĩa */\n' +
           '        }\n' +
           '        sent += (size_t)n;\n' +
           '    }\n' +
           '    return 0;\n' +
           '}</code></pre>' +
           '<p><b>Vì sao đây là bài học của cả bộ này.</b> Cổng nối tiếp là nơi ghi thiếu ' +
           'xảy ra <i>bình thường</i>, chứ không phải ngoại lệ hiếm — và cổng nối tiếp lại ' +
           'đúng là thứ mọi board nhúng đều có. Cùng đoạn mã ấy chạy đúng nhiều năm khi ghi ' +
           'ra file rồi hỏng trong tuần đầu tiên khi ghi ra UART.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 7,
      q: 'Một bộ ghi dữ liệu (data logger) chạy trên board, ghi mỗi giây một dòng vào ' +
         '<code>/var/log/sensor.log</code> bằng <code>fprintf</code>. Thiết bị đặt ngoài ' +
         'trời và <b>thỉnh thoảng bị cắt điện đột ngột</b>.<br><br>' +
         'Sau mỗi lần mất điện, khách hàng báo: log <b>mất khoảng 3–6 phút cuối</b>. Không ' +
         'phải mất một hai dòng — mất hẳn vài trăm dòng, và luôn là những dòng ' +
         '<b>sát ngay trước</b> thời điểm mất điện (đúng những dòng cần nhất). Đĩa còn trống. ' +
         'Filesystem không hỏng. Chạy trong phòng lab rồi <code>kill</code> tiến trình thì ' +
         'log <b>đủ</b>.<br><br>' +
         'Giải thích cơ chế, chỉ ra vì sao trong lab không tái hiện được, và đề xuất cách ' +
         'chữa cùng cái giá phải trả.',
      hint: 'Trong lab bạn dùng <code>kill</code>, tức là <code>SIGTERM</code>. Ngoài hiện ' +
            'trường thì <b>không ai gửi tín hiệu gì cả</b>. Khác biệt đó nằm ở đâu?',
      crit: [
        'Chỉ đúng: các dòng nằm trong <b>đệm stdio bên trong tiến trình</b>, chưa từng đi xuống nhân — mất điện là mất luôn RAM',
        'Nêu đúng lý do stdout/file dùng <b>đệm đầy</b> chứ không phải đệm theo dòng: đích không phải terminal',
        'Ước lượng được thứ tự độ lớn: đệm 4 KiB chia cho cỡ một dòng ≈ vài trăm dòng ≈ vài phút — khớp với báo cáo',
        'Giải thích vì sao lab không tái hiện: <code>kill</code> gửi <code>SIGTERM</code>, chương trình thoát êm nên <b>đệm được xả</b>',
        'Nêu đúng phép thử để tái hiện: <code>kill -9</code> (không có cơ hội xả) hoặc rút điện thật',
        'Đề xuất được ít nhất hai mức chữa: <code>fflush</code> sau mỗi dòng / <code>setvbuf</code> chế độ dòng, và <code>fsync</code> nếu cần chống mất điện thật',
        'Nói được cái giá: nhiều syscall hơn, và với <code>fsync</code> là ghi thật xuống flash mỗi giây — hao tuổi thọ thẻ nhớ'
      ],
      solBlocks: [
        { t: 'p', x: '<b>Cơ chế: những dòng đó chưa bao giờ rời khỏi tiến trình.</b> ' +
             '<code>fprintf</code> chép chuỗi vào vùng đệm của <code>glibc</code> nằm trong ' +
             'RAM của tiến trình bạn. Vì đích là một file (không phải terminal), ' +
             '<code>glibc</code> chọn <b>đệm đầy</b>: nó chỉ gọi <code>write()</code> khi đệm ' +
             'đầy. Mất điện xoá sạch RAM, nên mọi thứ còn nằm trong đệm biến mất — chưa từng ' +
             'có một byte nào tới nhân, chứ đừng nói tới đĩa.' },
        { t: 'p', x: '<b>Vì sao khớp với "3–6 phút".</b> Đệm mặc định trên máy này là ' +
             '<b>4 096 byte</b>. Một dòng log cỡ 10–20 byte, mỗi giây một dòng — nghĩa là đệm ' +
             'chỉ đầy sau khoảng <b>200–400 giây</b>, tức là 3–7 phút. Con số khách hàng báo ' +
             'không phải chuyện ngẫu nhiên; nó chính là sức chứa của cái đệm chia cho tốc độ ' +
             'sinh dữ liệu.' },
        { t: 'p', x: '<b>Vì sao trong lab không tái hiện được — và đây mới là phần đắt giá ' +
             'nhất.</b> <code>kill</code> gửi <code>SIGTERM</code>. Nếu chương trình thoát ' +
             'qua <code>exit()</code>, thư viện C <b>xả hết đệm</b> trên đường ra, và log đủ. ' +
             'Ngoài hiện trường thì không có tín hiệu nào, không có đường ra nào, không có ' +
             'đoạn mã nào chạy nữa — điện tắt là hết. Cách bạn dừng chương trình trong lab ' +
             '<b>đã che mất</b> đúng cái lỗi bạn đang đi tìm.' },
        { t: 'code', where: 'wsl', name: 'Phép thử tái hiện được: SIGKILL, không có cơ hội xả đệm', nocopy: true, code:
          '$ ./crashy          # ghi "line A", "line B", "line C" rồi raise(SIGKILL)\n' +
          'Killed\n' +
          '$ echo $?\n' +
          '137\n' +
          '$ ls -l crash.log\n' +
          '14 crash.log\n' +
          '$ cat crash.log\n' +
          'line A\n' +
          'line B' },
        { t: 'p', x: '14 byte = đúng hai dòng <code>line A\\n</code> + <code>line B\\n</code>. ' +
             'Chúng có mặt vì chương trình đã gọi <code>fflush(NULL)</code> sau dòng B. ' +
             '<b>"line C"</b> viết sau đó thì mất hẳn — nó còn trong đệm khi ' +
             '<code>SIGKILL</code> tới. Ba lần <code>fprintf</code>, hai dòng sống sót, và ' +
             'ranh giới nằm đúng ở lời gọi <code>fflush</code>.' },
        { t: 'cal', kind: 'warn', title: 'Ba mức chữa, ba cái giá',
          x: '<b>1. <code>fflush(f)</code> sau mỗi dòng</b> (hoặc ' +
             '<code>setvbuf(f, NULL, _IOLBF, 0)</code>): mỗi dòng thành một ' +
             '<code>write()</code>. Đủ chống <b>crash tiến trình</b>, vì dữ liệu đã sang nhân. ' +
             'Giá: nhiều syscall hơn — với 1 dòng/giây thì hoàn toàn không đáng kể.<br>' +
             '<b>2. <code>fflush(f)</code> rồi <code>fsync(fileno(f))</code></b>: ép nhân đẩy ' +
             'thật xuống thiết bị. Đây mới là thứ chống được <b>mất điện</b>, vì mức 1 chỉ ' +
             'đưa dữ liệu tới page cache của nhân — cũng là RAM. Giá: một lần ghi thật xuống ' +
             'flash mỗi giây, ăn vào tuổi thọ thẻ nhớ.<br>' +
             '<b>3. Thoả hiệp</b>: <code>fflush</code> mỗi dòng, <code>fsync</code> mỗi 30–60 ' +
             'giây. Mất điện thì mất tối đa một cửa sổ ngắn đã biết trước, thay vì mất một ' +
             'lượng <b>không đoán được</b> phụ thuộc kích thước đệm.' },
        { t: 'p', x: '<b>Điểm mấu chốt để mang đi:</b> "đã ghi" có <b>ba</b> nghĩa khác nhau ' +
             '— nằm trong đệm thư viện, nằm trong page cache của nhân, và nằm thật trên thiết ' +
             'bị. Mỗi mức chống được một loại tai nạn khác nhau, và <code>fprintf</code> ' +
             'không cho bạn mức nào cả.' },
      ] },

    { id: 'c3', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 6,
      q: 'Bạn viết một thư viện C nhỏ cho nhóm: <code>sensor_read()</code> đọc một cảm biến ' +
         'qua I²C. Nó có thể hỏng vì nhiều lý do khác nhau (không mở được thiết bị, cảm biến ' +
         'không trả lời, dữ liệu sai checksum, tham số người gọi sai).<br><br>' +
         'Một thành viên đề xuất: <i>"Cứ trả về <code>-1</code> rồi để người gọi đọc ' +
         '<code>errno</code>, y như syscall. Vừa quen thuộc vừa không phải nghĩ."</i><br><br>' +
         'Đề xuất này <b>đúng một phần</b>. Hãy chỉ ra chính xác chỗ đúng, chỗ hỏng, và thiết ' +
         'kế cách báo lỗi của bạn. Chú ý: đây là <b>thư viện</b>, không phải chương trình — ' +
         'nó nằm giữa nhân và người gọi.',
      hint: 'Bạn <b>không</b> phải nhân. <code>errno</code> là một biến toàn cục (mỗi luồng ' +
            'một bản) mà <i>ai cũng</i> ghi được — kể cả những lời gọi bạn dùng bên trong sau ' +
            'khi lỗi đã xảy ra.',
      crit: [
        'Chỗ đúng: quy ước "giá trị trả về báo có lỗi hay không" là đúng và nên giữ — nó khớp với thói quen của người dùng C',
        'Chỗ hỏng 1: bốn loại lỗi khác nhau không ánh xạ tự nhiên sang các mã <code>errno</code> có sẵn, nên bạn phải bịa (dùng <code>EIO</code> cho mọi thứ) và người gọi mất thông tin',
        'Chỗ hỏng 2: <b>chính bạn</b> có thể làm hỏng <code>errno</code> — mọi lời gọi bạn thực hiện sau khi phát hiện lỗi (kể cả <code>close</code>, <code>printf</code>, ghi log) đều có thể ghi đè nó',
        'Nêu đúng nguyên tắc: nếu vẫn dùng <code>errno</code> thì phải <b>lưu lại ngay</b> (<code>int saved = errno;</code>) rồi khôi phục trước khi trả về',
        'Thiết kế thay thế hợp lý: trả về mã lỗi <b>của riêng thư viện</b> (enum <code>SENSOR_*</code>) hoặc trả <code>-1</code> kèm một hàm <code>sensor_last_error()</code>',
        'Có tách bạch được lỗi <b>người gọi dùng sai</b> (tham số NULL) với lỗi <b>môi trường</b> (cảm biến im lặng) — hai loại này cần phản ứng khác nhau',
        'Nói được là quyết định phải <b>ghi vào tài liệu hàm</b>: người gọi không đoán được quy ước nếu bạn không viết ra'
      ],
      sol: '<p><b>Chỗ đúng — và nên giữ.</b> Quy ước "<b>giá trị trả về</b> nói có lỗi hay ' +
           'không" là đúng hoàn toàn. Nó khớp với toàn bộ thói quen của lập trình viên C, và ' +
           'nó tránh đúng cái bẫy của câu B3: đừng bao giờ để người gọi suy ra trạng thái từ ' +
           '<code>errno</code>.</p>' +
           '<p><b>Chỗ hỏng 1 — bốn loại lỗi của bạn không phải lỗi của nhân.</b> ' +
           '<code>errno</code> là một tập <i>đóng</i> gồm những mã mà <b>nhân</b> định nghĩa. ' +
           '"Checksum sai" và "cảm biến không trả lời" không có mã nào cả, nên bạn sẽ nhét ' +
           'tất cả vào <code>EIO</code> — và người gọi nhận được đúng một thông tin: "hỏng ' +
           'gì đó". Trong khi bốn nguyên nhân ấy đòi bốn phản ứng khác nhau: sửa mã nguồn, ' +
           'thử lại, đọc lại, hay báo người dùng kiểm tra dây.</p>' +
           '<p><b>Chỗ hỏng 2 — bạn nằm giữa, nên chính bạn làm hỏng <code>errno</code>.</b> ' +
           'Đây là chỗ đề xuất kia sập thật sự. Xét:</p>' +
           '<pre><code>if (ioctl(fd, ...) &lt; 0) {\n' +
           '    close(fd);                 /* &lt;-- có thể ghi đè errno */\n' +
           '    log_debug("sensor failed"); /* &lt;-- printf cũng gọi write, cũng ghi đè */\n' +
           '    return -1;                 /* người gọi đọc errno: đã là giá trị KHÁC */\n' +
           '}</code></pre>' +
           '<p>Người gọi làm đúng mọi thứ — kiểm tra giá trị trả về trước, đọc ' +
           '<code>errno</code> ngay sau — mà vẫn nhận nhầm nguyên nhân, vì <b>thư viện của ' +
           'bạn</b> đã đạp lên nó trên đường ra. Cùng một cơ chế "<code>errno</code> chỉ mang ' +
           'giá trị của lời gọi <i>gần nhất</i>" mà câu B3 đã cho thấy, chỉ khác là lần này ' +
           'thủ phạm là chính bạn.</p>' +
           '<p><b>Nếu vẫn muốn dùng <code>errno</code>, luật là:</b></p>' +
           '<pre><code>if (ioctl(fd, ...) &lt; 0) {\n' +
           '    int saved = errno;      /* chụp lại NGAY */\n' +
           '    close(fd);\n' +
           '    log_debug("sensor failed");\n' +
           '    errno = saved;          /* trả lại đúng giá trị trước khi return */\n' +
           '    return -1;\n' +
           '}</code></pre>' +
           '<p><b>Thiết kế tôi chọn — mã lỗi của riêng thư viện:</b></p>' +
           '<pre><code>typedef enum {\n' +
           '    SENSOR_OK = 0,\n' +
           '    SENSOR_EBADARG,    /* người gọi dùng sai: lỗi lập trình */\n' +
           '    SENSOR_ENODEV,     /* không mở được thiết bị */\n' +
           '    SENSOR_ETIMEOUT,   /* cảm biến không trả lời: thử lại được */\n' +
           '    SENSOR_ECHECKSUM   /* nhiễu trên đường truyền: đọc lại */\n' +
           '} sensor_err_t;\n' +
           '\n' +
           'sensor_err_t sensor_read(int bus, float *out);</code></pre>' +
           '<p>Mỗi mã ứng với <b>một hành động khác nhau</b> của người gọi — đó là tiêu chuẩn ' +
           'để biết một tập mã lỗi có đáng tồn tại hay không. Nếu vẫn muốn giữ ' +
           '<code>-1</code>, hãy kèm <code>sensor_last_error()</code> trả về một giá trị ' +
           '<b>của riêng bạn</b>, không dùng chung biến toàn cục với cả hệ thống.</p>' +
           '<p><b>Tách lỗi lập trình khỏi lỗi môi trường.</b> Tham số <code>NULL</code> là ' +
           '<i>bug</i> — nó luôn xảy ra, ở mọi lần chạy, và cách chữa là sửa mã nguồn. Cảm ' +
           'biến im lặng là <i>sự kiện</i> — nó thoáng qua, và cách chữa là thử lại. Trộn hai ' +
           'thứ vào một mã lỗi buộc người gọi phải đoán xem nên retry hay nên báo lỗi.</p>' +
           '<p><b>Và viết vào tài liệu hàm.</b> Quy ước báo lỗi nào cũng được, miễn là người ' +
           'gọi biết. Quy ước không được viết ra thì <b>không tồn tại</b>.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Một daemon giám sát chạy liên tục nhiều tháng trên board. Mỗi phút nó mở file cấu ' +
         'hình để xem có ai sửa không:<br><br>' +
         'Sau khoảng <b>bảy ngày</b> chạy, daemon bắt đầu ghi log ' +
         '<code>open failed: Too many open files</code> và không bao giờ đọc được cấu hình ' +
         'nữa. Khởi động lại thì hết — rồi bảy ngày sau lại y như vậy.<br><br>' +
         'Chỉ ra lỗi, tính xem <b>vì sao lại là bảy ngày</b>, và nêu <b>hai</b> lệnh bạn dùng ' +
         'để xác nhận chẩn đoán trên một tiến trình <b>đang chạy</b> mà không được phép dừng ' +
         'nó.',
      blocks: [
        { t: 'code', where: 'file', name: 'check_config() — chạy mỗi 60 giây', lang: 'c', code:
          'void check_config(void)\n' +
          '{\n' +
          '    int fd = open("/etc/monitor.conf", O_RDONLY);\n' +
          '    if (fd < 0) {\n' +
          '        log_error("open failed: %s", strerror(errno));\n' +
          '        return;\n' +
          '    }\n' +
          '    read_settings(fd);\n' +
          '}' },
      ],
      crit: [
        'Chỉ đúng lỗi: <b>không có <code>close(fd)</code></b> — mỗi lần gọi tiêu một ô trong bảng file mở, và ô đó không bao giờ được trả lại',
        'Nêu đúng hệ quả: bảng descriptor của tiến trình đầy → <code>open</code> thất bại với <code>EMFILE</code>',
        'Tính đúng thứ tự độ lớn: 1 fd/phút = 1440/ngày; giới hạn mặc định 1024 (hoặc vài nghìn) chia cho 1440 ≈ khoảng một tuần',
        'Giải thích được vì sao khởi động lại thì hết: bảng descriptor <b>thuộc về tiến trình</b>, tiến trình chết là nhân thu hồi sạch',
        'Lệnh 1: <code>ls -l /proc/&lt;pid&gt;/fd | wc -l</code> (hoặc <code>lsof -p</code>) — đếm số fd đang mở, và thấy hàng nghìn dòng trỏ cùng một file',
        'Lệnh 2: <code>cat /proc/&lt;pid&gt;/limits</code> (hoặc <code>ulimit -n</code>) — đọc giới hạn để so sánh; hoặc theo dõi số fd tăng dần theo thời gian',
        'Nói rõ nâng giới hạn <b>không phải cách chữa</b> — nó chỉ dời ngày hỏng ra xa hơn'
      ],
      sol: '<p><b>Lỗi: thiếu <code>close(fd)</code>.</b> Mỗi <code>open()</code> thành công ' +
           'lấy một ô trong <b>bảng file mở</b> của tiến trình. Ô đó chỉ được trả lại khi bạn ' +
           '<code>close()</code>, hoặc khi tiến trình chết. Hàm này không bao giờ đóng, nên ' +
           'mỗi phút nó tiêu vĩnh viễn một descriptor.</p>' +
           '<p>Chú ý là hàm <b>có</b> xử lý lỗi và <b>có</b> ghi log rất tử tế — nó chỉ thiếu ' +
           'phần dọn dẹp. Rò rỉ descriptor gần như luôn trông như thế: mã nguồn nhìn ' +
           '<i>cẩn thận</i>.</p>' +
           '<p><b>Vì sao là bảy ngày.</b> Một fd mỗi phút = 60 mỗi giờ = <b>1 440 mỗi ngày</b>. ' +
           'Giới hạn mềm mặc định thường là 1 024 (một số bản phân phối để cao hơn):</p>' +
           '<pre><code>1024 fd / 1440 fd mỗi ngày ≈ 0,7 ngày\n' +
           '8192 fd / 1440 fd mỗi ngày ≈ 5,7 ngày\n' +
           '10240 fd / 1440 fd mỗi ngày ≈ 7,1 ngày</code></pre>' +
           '<p>Con số "bảy ngày" không phải điều bí ẩn — nó là <b>giới hạn chia cho tốc độ ' +
           'rò</b>. Và đây là dấu hiệu nhận dạng của cả lớp lỗi này: thời gian tới lúc hỏng ' +
           '<b>ổn định đến kỳ lạ</b>. Một lỗi thật sự ngẫu nhiên không đợi đúng một tuần rồi ' +
           'mới xuất hiện.</p>' +
           '<p><b>Vì sao khởi động lại thì hết:</b> bảng descriptor thuộc về <b>tiến ' +
           'trình</b>. Tiến trình chết, nhân đóng sạch mọi fd. Đó cũng là lý do "cứ khởi động ' +
           'lại hằng đêm cho chắc" có tác dụng — và là lý do rất nhiều rò rỉ như thế này sống ' +
           'sót nhiều năm trong sản phẩm mà không ai phát hiện.</p>' +
           '<p><b>Hai lệnh xác nhận, trên tiến trình đang chạy:</b></p>' +
           '<pre><code>$ ls -l /proc/&lt;pid&gt;/fd | wc -l      # đếm fd đang mở\n' +
           '$ ls -l /proc/&lt;pid&gt;/fd | tail -n 5     # xem chúng trỏ vào đâu\n' +
           '$ cat /proc/&lt;pid&gt;/limits | grep files  # giới hạn của CHÍNH tiến trình đó</code></pre>' +
           '<p>Bằng chứng quyết định là hàng nghìn dòng cùng trỏ tới ' +
           '<code>/etc/monitor.conf</code>. Chạy lệnh đếm hai lần cách nhau vài phút: nếu con ' +
           'số tăng đều, bạn đã chứng minh được tốc độ rò mà không cần dừng daemon. Đây đúng ' +
           'là thứ <code>/proc</code> sinh ra để làm (Bài 5) — trạng thái của nhân, đọc được ' +
           'ngay, trên một tiến trình đang sống.</p>' +
           '<p><b>Chữa:</b> thêm <code>close(fd);</code> sau <code>read_settings(fd)</code> — ' +
           'và cả trên mọi đường thoát sớm, đó là chỗ mà rò rỉ thật hay nấp. Nâng ' +
           '<code>ulimit -n</code> <b>không</b> phải cách chữa: nó chỉ đổi bảy ngày thành bảy ' +
           'mươi ngày, và biến một lỗi tái hiện được thành một lỗi mỗi quý mới gặp một ' +
           'lần.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 7,
      q: 'Quay lại bộ ghi dữ liệu ở câu C2, lần này với yêu cầu rõ ràng:<br>' +
         '<ul>' +
         '<li>Ghi <b>1 000 dòng mỗi giây</b>, mỗi dòng <b>50 byte</b> → 50 KB/s.</li>' +
         '<li>Chạy trên board dùng <b>thẻ nhớ eMMC</b>; ghi càng ít càng tốt cho tuổi thọ.</li>' +
         '<li>Mất điện có thể xảy ra bất cứ lúc nào. Hợp đồng cho phép mất tối đa ' +
         '<b>2 giây</b> dữ liệu cuối.</li>' +
         '</ul>' +
         'Hãy <b>chọn kích thước đệm</b> và <b>chiến lược xả</b>, rồi biện minh bằng số. Bạn ' +
         'có hai dữ kiện đo được ở dưới. Phần được chấm là phần <b>biện minh</b>, không phải ' +
         'con số bạn chọn.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Đo được: 2 288 890 byte, đổi kích thước đệm stdio', nocopy: true, code:
          'buffer=4096      559 write() calls\n' +
          'buffer=65536      35 write() calls\n' +
          'buffer=1048576     3 write() calls\n' +
          'buffer=_IONBF 200000 write() calls   (wall 0.09 s vs 0.01 s)' },
        { t: 'code', where: 'wsl', name: 'Đo được: giá của một syscall (đọc 2 288 890 byte)', nocopy: true, code:
          'chunk=1      read() calls=2288890   wall 0.45 s\n' +
          'chunk=4096   read() calls=559       wall 0.00 s\n' +
          'chunk=65536  read() calls=35        wall 0.00 s' },
      ],
      hint: 'Ràng buộc "mất tối đa 2 giây" quyết định <b>lượng dữ liệu trong đệm</b>, không ' +
            'phải kích thước đệm. Hai thứ đó chỉ trùng nhau nếu bạn để đệm tự đầy.',
      crit: [
        'Tính đúng ngân sách mất mát: 2 giây × 50 KB/s = <b>100 KB</b> là lượng tối đa được phép nằm trong đệm',
        'Nhận ra ràng buộc thời gian không tự động thoả mãn bởi kích thước đệm: đệm 100 KB chỉ đúng khi tốc độ ghi <b>đúng</b> như dự kiến — tốc độ giảm thì thời gian nằm trong đệm dài ra',
        'Kết luận đúng: phải xả <b>theo đồng hồ</b> (mỗi 1–2 giây), không phải chờ đệm đầy',
        'Tính được số syscall của phương án chọn và so với phương án ngây thơ: 1 000 write/s (không đệm) so với ~1 write/s (xả theo đồng hồ) — chênh <b>ba bậc độ lớn</b>',
        'Dùng đúng số đo: ~196 ns cho một syscall rỗng (0,45 s / 2 288 890), nên 1 000 syscall/giây ≈ 0,2 ms/giây ≈ 0,02 % CPU — <b>chi phí CPU không phải lý do chính</b>',
        'Nêu đúng lý do thật để gộp ghi trên nhúng: <b>số lần ghi xuống flash</b> (wear) chứ không phải thời gian CPU',
        'Phân biệt <code>fflush</code> (tới nhân) với <code>fsync</code> (tới thiết bị), và nói rõ chỉ <code>fsync</code> mới thoả được yêu cầu chống mất điện',
        'Chốt được một phương án cụ thể có số kèm theo, thay vì liệt kê các lựa chọn'
      ],
      sol: '<p><b>Bước 1 — ngân sách mất mát, tính bằng byte.</b><br>' +
           '2 giây × 50 KB/s = <b>100 KB</b>. Đó là lượng dữ liệu tối đa được phép còn nằm ' +
           'trong đệm ở bất kỳ thời điểm nào.</p>' +
           '<p><b>Bước 2 — và đây là chỗ hầu hết mọi người sai:</b> ràng buộc là ' +
           '<b>thời gian</b>, còn kích thước đệm chỉ giới hạn <b>byte</b>. Đặt đệm 100 KB rồi ' +
           'để nó tự đầy thì bạn <i>đúng</i> — nhưng chỉ khi tốc độ đúng bằng 50 KB/s. Nếu ' +
           'cảm biến chậm lại còn 5 KB/s, cùng cái đệm ấy giữ dữ liệu tới <b>20 giây</b>, và ' +
           'bạn vi phạm hợp đồng đúng vào lúc hệ thống đang rảnh nhất. Đệm đầy là một ngưỡng ' +
           '<b>theo byte</b>; yêu cầu của bạn là <b>theo thời gian</b>. Hai thứ đó phải được ' +
           'thoả mãn bằng hai cơ chế khác nhau.</p>' +
           '<p><b>Bước 3 — phương án tôi chọn:</b></p>' +
           '<ul>' +
           '<li>Đệm <b>64 KiB</b> (<code>setvbuf(f, buf, _IOFBF, 65536)</code>) — chặn trần ' +
           'theo byte, luôn dưới ngân sách 100 KB.</li>' +
           '<li><code>fflush(f)</code> + <code>fsync(fileno(f))</code> <b>mỗi 1 giây</b> theo ' +
           'đồng hồ — chặn trần theo thời gian, với biên an toàn gấp đôi so với hợp đồng.</li>' +
           '</ul>' +
           '<p><b>Bước 4 — biện minh bằng số.</b></p>' +
           '<p><i>Số syscall.</i> Không đệm: <b>1 000</b> <code>write()</code> mỗi giây. Xả ' +
           'theo đồng hồ: <b>1</b> lời gọi ~50 KB mỗi giây. Chênh <b>ba bậc độ lớn</b> — đúng ' +
           'hình dạng của bảng đo (200 000 lời gọi khi <code>_IONBF</code>, còn 35 khi đệm ' +
           '64 KiB).</p>' +
           '<p><i>Chi phí CPU — và nó KHÔNG phải lý do.</i> Từ số đo: 0,45 s cho 2 288 890 ' +
           'lời gọi ≈ <b>196 ns</b> mỗi syscall. Vậy 1 000 syscall/giây ≈ <b>0,2 ms</b> mỗi ' +
           'giây ≈ <b>0,02 %</b> CPU. Nếu chỉ nhìn CPU thì phương án không đệm hoàn toàn chấp ' +
           'nhận được, và ai lập luận "gộp ghi để tiết kiệm CPU" là đang bảo vệ đúng quyết ' +
           'định bằng sai lý do.</p>' +
           '<p><i>Lý do thật: tuổi thọ flash.</i> eMMC xoá theo <b>khối</b>, thường 128 KiB ' +
           'hoặc lớn hơn, và mỗi khối chỉ chịu được một số lần xoá hữu hạn. 1 000 lần ' +
           '<code>write</code> nhỏ mỗi giây, mỗi lần kéo theo một chu kỳ đọc-sửa-ghi cả khối, ' +
           'là công thức giết thẻ trong vài tháng. Gộp thành <b>một</b> lần ghi ~50 KB mỗi ' +
           'giây giảm số chu kỳ xoá xuống hàng nghìn lần. <b>Trên nhúng, đơn vị tính giá của ' +
           'việc ghi là số lần chạm vào flash, không phải mili-giây CPU.</b></p>' +
           '<p><b>Bước 5 — vì sao phải có <code>fsync</code>, không chỉ <code>fflush</code>.</b> ' +
           '<code>fflush</code> mới đưa dữ liệu từ đệm thư viện sang <b>page cache của ' +
           'nhân</b> — vẫn là RAM, và mất điện vẫn mất. Chỉ <code>fsync</code> mới bắt nhân ' +
           'đẩy thật xuống thiết bị. Yêu cầu ở đây nói "mất điện", nên ' +
           '<code>fsync</code> là bắt buộc; nếu yêu cầu chỉ là "chương trình crash" thì ' +
           '<code>fflush</code> đã đủ và rẻ hơn nhiều.</p>' +
           '<p><b>Chốt lại:</b> đệm 64 KiB + <code>fsync</code> mỗi giây → mất tối đa ' +
           '<b>50 KB ≈ 1 giây</b> dữ liệu (hợp đồng cho 2), tốn <b>1</b> lần ghi flash mỗi ' +
           'giây thay vì 1 000, và chi phí CPU coi như bằng 0. Cả ba ràng buộc đều được thoả ' +
           'mãn bằng số, không phải bằng cảm giác.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về bài cũ mà bài này đứng lên trên ═══ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Nhắc lại Bài 5.</b> Ở câu C4 bạn đếm file descriptor đang mở của một tiến trình ' +
         'bằng <code>ls -l /proc/&lt;pid&gt;/fd</code>. Vì sao con số đó ' +
         '<b>luôn luôn đúng tại thời điểm đọc</b>, kể cả khi tiến trình vừa mở thêm một file ' +
         'một phần nghìn giây trước?',
      opts: [
        'Vì nhân ghi lại số fd vào một file trong <code>/proc</code> mỗi khi có thay đổi',
        'Vì <code>/proc</code> không phải file trên đĩa — nội dung được <b>nhân sinh ra ngay lúc bạn đọc</b>, từ chính cấu trúc dữ liệu đang sống',
        'Vì <code>ls</code> có cơ chế riêng để hỏi trực tiếp nhân, khác với khi nó đọc thư mục thường',
        'Vì <code>/proc</code> nằm trong RAM nên nó được cập nhật nhanh hơn đĩa rất nhiều'
      ],
      a: 1,
      why: '<code>/proc</code> là một <b>pseudo-filesystem</b>: không có byte nào của nó nằm ' +
           'trên bất kỳ thiết bị lưu trữ nào. Khi bạn đọc <code>/proc/&lt;pid&gt;/fd</code>, ' +
           'nhân <b>duyệt bảng file mở thật</b> của tiến trình đó ngay tại thời điểm ấy và ' +
           'dựng câu trả lời. Không có bản sao, nên không có chuyện lệch bản sao.<br><br>' +
           'Đáp án A và D đều giả định có một bản chép nào đó phải được cập nhật — đó chính ' +
           'là hiểu lầm mà Bài 5 nhắm vào. Đáp án C sai vì <code>ls</code> chẳng làm gì đặc ' +
           'biệt: nó gọi <code>openat</code>/<code>getdents64</code> y như với mọi thư mục ' +
           'khác. Cái đặc biệt nằm ở phía <b>filesystem</b>, không phải phía chương trình.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Nhắc lại Bài 10.</b> Chương trình <code>build</code> in tiến độ ra ' +
         '<b>stdout</b> và thông báo lỗi ra <b>stderr</b>. Bạn chạy:' +
         '<br><br><code>./build | grep -c error</code><br><br>' +
         'Lệnh in ra <code>0</code>, nhưng trên màn hình bạn <b>vẫn nhìn thấy</b> vài dòng ' +
         '<code>error:</code>. Vì sao?',
      opts: [
        '<code>grep -c</code> chỉ đếm trong 1000 dòng đầu tiên, phần sau bị bỏ qua',
        'Đệm của <code>./build</code> chưa được xả nên <code>grep</code> chưa nhìn thấy các dòng đó',
        'Ống chỉ mang <b>fd 1</b>; các dòng lỗi đi qua <b>fd 2</b> nên chúng đi thẳng ra terminal, không hề vào <code>grep</code>',
        '<code>grep</code> tìm phân biệt hoa thường nên nó không khớp <code>Error:</code>'
      ],
      a: 2,
      why: 'Ký tự <code>|</code> chỉ nối <b>fd 1</b> của bên trái vào fd 0 của bên phải. ' +
           'fd 2 không bị đụng tới, nên nó vẫn trỏ vào terminal — bạn <i>thấy</i> các dòng ' +
           'lỗi, còn <code>grep</code> thì <i>không</i>. Cách chữa: ' +
           '<code>./build 2&gt;&amp;1 | grep -c error</code>.<br><br>' +
           '<b>Ranh giới cần nhớ giữa Bài 10 và Bài 19:</b> đây là câu hỏi ' +
           '"<b>fd nào đi đường nào</b>" — chuyện định tuyến, quyết định bởi shell trước khi ' +
           'chương trình chạy. Câu B2 của bộ này hỏi một chuyện khác hẳn: ' +
           '"<b>khi nào byte rời khỏi tiến trình</b>" — chuyện thời điểm, quyết định bởi đệm ' +
           'của <code>glibc</code>. Đáp án B mô tả đúng cơ chế của B2 nhưng sai ở đây: đệm ' +
           'làm dữ liệu tới <b>muộn</b>, chứ không làm nó tới <b>nhầm chỗ</b>.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Nhắc lại Bài 8.</b> File <code>/etc/shadow</code> có quyền ' +
         '<code>-rw-r----- root shadow</code>. Bạn đăng nhập bằng tài khoản ' +
         '<code>shinarus</code>, <b>có</b> nằm trong nhóm <code>shadow</code>. Chương trình ' +
         'của bạn gọi <code>open("/etc/shadow", O_RDWR)</code>. Chuyện gì xảy ra?',
      opts: [
        'Thành công — bạn thuộc nhóm <code>shadow</code>, mà nhóm có quyền đọc, nên mở được',
        'Thất bại, trả về <code>-1</code> với <code>errno = EACCES</code> — nhân dừng ở triplet <b>nhóm</b> và triplet đó không có <code>w</code>',
        'Thành công nhưng mọi lần <code>write()</code> sau đó sẽ trả về <code>-1</code>',
        'Thất bại với <code>errno = EPERM</code>, vì chỉ <code>root</code> mới được mở file này'
      ],
      a: 1,
      why: 'Nhân kiểm tra <b>đúng một</b> triplet rồi dừng: là chủ sở hữu thì xét triplet ' +
           'chủ, thuộc nhóm thì xét triplet nhóm, còn lại thì xét triplet other. Bạn thuộc ' +
           'nhóm <code>shadow</code> → xét <code>r--</code> → có <code>r</code>, ' +
           '<b>không</b> có <code>w</code>. Bạn xin <code>O_RDWR</code>, nên lời gọi hỏng ' +
           'ngay tại <code>open</code> với <code>EACCES</code>.<br><br>' +
           'Đáp án C là hiểu lầm phổ biến và đáng nói: quyền được kiểm tra <b>một lần, lúc ' +
           'mở</b>. Sau khi <code>open</code> thành công thì <code>write()</code> ' +
           '<b>không</b> kiểm tra lại quyền — đó là lý do đổi quyền một file đang mở không ' +
           'ảnh hưởng gì tới tiến trình đang giữ nó. Đáp án D dùng nhầm mã lỗi: ' +
           '<code>EPERM</code> là "thao tác này chỉ dành cho tiến trình có đặc quyền", còn ' +
           '<code>EACCES</code> mới là "quyền trên file không cho phép".' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: '<b>Dự đoán TRƯỚC, chạy SAU.</b> Chương trình dưới đây ghi <b>200 000</b> dòng dạng ' +
         '<code>line 0</code>, <code>line 1</code>, … vào một file. Tổng cộng file dài ' +
         '<b>2 288 890</b> byte.<br><br>' +
         'Viết ra <b>số lời gọi <code>write()</code></b> mà bạn dự đoán, cho từng kích thước ' +
         'đệm: <b>4096</b>, <b>65536</b>, <b>1048576</b>, và <b><code>_IONBF</code></b> ' +
         '(không đệm). Ghi cả <b>cách bạn tính</b>. Rồi mới chạy và so.',
      blocks: [
        { t: 'code', where: 'file', name: 'lines.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '#include <stdlib.h>\n' +
          '\n' +
          '#define LINE_COUNT 200000\n' +
          '\n' +
          'static char big[1048576];\n' +
          '\n' +
          'int main(int argc, char *argv[])\n' +
          '{\n' +
          '    FILE *f;\n' +
          '    long size;\n' +
          '\n' +
          '    if (argc != 3) return 1;\n' +
          '    size = strtol(argv[1], NULL, 10);\n' +
          '    f = fopen(argv[2], "w");\n' +
          '    if (f == NULL) return 1;\n' +
          '    if (size > 0) setvbuf(f, big, _IOFBF, (size_t)size);\n' +
          '    if (size < 0) setvbuf(f, NULL, _IONBF, 0);\n' +
          '    for (int i = 0; i < LINE_COUNT; i++)\n' +
          '        fprintf(f, "line %d\\n", i);\n' +
          '    fclose(f);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', name: 'Biên dịch và chạy — strace -c chỉ đếm write', code:
          'mkdir -p ~/bai19 && cd ~/bai19\n' +
          'gcc -Wall -O2 -o lines lines.c\n' +
          'for s in 4096 65536 1048576 -1; do\n' +
          '  printf \'buffer=%-9s \' "$s"\n' +
          '  strace -c -e trace=write ./lines "$s" "out-$s.txt" 2>&1 | sed -n \'3p\'\n' +
          'done\n' +
          'stat -c \'%n = %s bytes\' out-4096.txt' },
      ],
      hint: 'Với đệm cỡ <i>N</i>, mỗi lần đệm đầy là một <code>write()</code>. Vậy số lời gọi ' +
            '≈ tổng byte chia cho <i>N</i>, cộng thêm <b>một</b> lần cuối cho phần dư lúc ' +
            '<code>fclose</code>.',
      crit: [
        'Có ghi dự đoán ra <b>trước khi chạy</b> (nếu không thì cả câu này vô nghĩa)',
        'Công thức đúng: số lời gọi = ⌈tổng byte / kích thước đệm⌉',
        '4096 → <b>559</b> (2 288 890 / 4 096 = 558 dư 3 322, cộng 1 lần cuối)',
        '65536 → <b>35</b> (34 dư 60 666, cộng 1)',
        '1048576 → <b>3</b> (2 dư 191 738, cộng 1)',
        '<code>_IONBF</code> → <b>200 000</b> — đúng bằng số lần <code>fprintf</code>, một lời gọi cho mỗi dòng',
        'Nhận ra file sinh ra <b>giống hệt nhau</b> ở cả bốn trường hợp: đệm đổi <i>số syscall</i>, không đổi <i>nội dung</i>'
      ],
      sol: '<p><b>Kết quả thật trên máy này:</b></p>' +
           '<pre><code>buffer=4096      559 write() calls\n' +
           'buffer=65536      35 write() calls\n' +
           'buffer=1048576     3 write() calls\n' +
           'buffer=_IONBF 200000 write() calls</code></pre>' +
           '<p><b>Số học khớp chính xác:</b></p>' +
           '<pre><code>2288890 / 4096    = 558 dư 3322     -> 558 + 1 = 559\n' +
           '2288890 / 65536   =  34 dư 60666    ->  34 + 1 = 35\n' +
           '2288890 / 1048576 =   2 dư 191738   ->   2 + 1 = 3</code></pre>' +
           '<p>Cái "+1" là lần xả cuối cùng lúc <code>fclose()</code>, đẩy nốt phần dư. Đây ' +
           'là loại dự đoán nên <b>tính ra được</b> chứ không phải đoán: cơ chế đơn giản tới ' +
           'mức một phép chia là đủ.</p>' +
           '<p><b>Cột <code>_IONBF</code> mới là cột đáng nhìn.</b> 200 000 lời gọi — đúng ' +
           'bằng số lần <code>fprintf</code>. Tắt đệm nghĩa là mỗi lời gọi thư viện thành ' +
           'đúng một lời gọi hệ thống. So với 35, đó là gấp <b>5 700 lần</b>. Thời gian đo ' +
           'được: <b>0,09 s</b> so với <b>0,01 s</b>.</p>' +
           '<p><b>Và điều quan trọng nhất:</b> <code>cmp out-4096.txt out-65536.txt</code> ' +
           'báo hai file <b>giống hệt nhau</b> tới từng byte. Đệm không đổi ' +
           '<i>cái gì được ghi</i>, chỉ đổi <i>ghi bằng bao nhiêu lần</i> và ' +
           '<i>vào lúc nào</i> — mà "vào lúc nào" chính là thứ đã giết bộ ghi dữ liệu ở câu ' +
           'C2.</p>' +
           '<p><b>⚠ Cái bẫy trong chính đoạn mã này.</b> ' +
           'Chú ý <code>setvbuf(f, <b>big</b>, _IOFBF, size)</code> — nó đưa một vùng đệm ' +
           '<b>thật</b>. Nếu bạn viết <code>setvbuf(f, NULL, _IOFBF, size)</code> thì ' +
           '<code>glibc</code> tự cấp phát đệm, và nó <b>bỏ qua kích thước bạn xin</b>, dùng ' +
           '<code>st_blksize</code> của filesystem (4 096 ở đây). Bảng số của bạn sẽ ra 559 ' +
           'cho <i>cả bốn</i> cỡ và bạn sẽ ngồi tìm lỗi ở nhầm chỗ. Muốn kiểm soát kích thước ' +
           'đệm, hãy tự cấp bộ nhớ cho nó.</p>' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: '<b>Dự đoán TRƯỚC, chạy SAU.</b> Chương trình dưới đây đọc hết một file bằng ' +
         '<code>read()</code> trần (không qua <code>stdio</code>), mỗi lần ' +
         '<code>chunk</code> byte, và đếm số lời gọi. File dùng để thử là ' +
         '<code>out-4096.txt</code> từ câu E1 — <b>2 288 890</b> byte.<br><br>' +
         'Dự đoán <b>số lời gọi</b> và <b>thời gian chạy</b> cho ' +
         '<code>chunk = 1</code>, <code>4096</code>, <code>65536</code>. Với ' +
         '<code>chunk = 1</code>, hãy ước lượng thời gian <b>bằng cách nhân</b>, đừng đoán.',
      blocks: [
        { t: 'code', where: 'file', name: 'readcost.c', lang: 'c', code:
          '#include <fcntl.h>\n' +
          '#include <stdio.h>\n' +
          '#include <stdlib.h>\n' +
          '#include <unistd.h>\n' +
          '\n' +
          'int main(int argc, char *argv[])\n' +
          '{\n' +
          '    static char buf[65536];\n' +
          '    size_t chunk;\n' +
          '    long calls = 0;\n' +
          '    ssize_t n;\n' +
          '    int fd;\n' +
          '\n' +
          '    if (argc != 3) return 1;\n' +
          '    chunk = (size_t)strtol(argv[1], NULL, 10);\n' +
          '    fd = open(argv[2], O_RDONLY);\n' +
          '    if (fd < 0) return 1;\n' +
          '    while ((n = read(fd, buf, chunk)) > 0) calls++;\n' +
          '    close(fd);\n' +
          '    fprintf(stderr, "chunk=%-6zu read() calls=%ld\\n", chunk, calls);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', name: 'Biên dịch và đo', code:
          'cd ~/bai19\n' +
          'gcc -Wall -O2 -o readcost readcost.c\n' +
          '/usr/bin/time -f \'  wall %e s\' ./readcost 1     out-4096.txt\n' +
          '/usr/bin/time -f \'  wall %e s\' ./readcost 4096  out-4096.txt\n' +
          '/usr/bin/time -f \'  wall %e s\' ./readcost 65536 out-4096.txt' },
      ],
      crit: [
        'Có ghi dự đoán ra trước khi chạy',
        'chunk=1 → <b>2 288 890</b> lời gọi (một lời gọi cho mỗi byte, cộng lần cuối trả về 0 để thoát vòng lặp)',
        'chunk=4096 → <b>559</b>; chunk=65536 → <b>35</b> — cùng công thức chia như câu E1',
        'Đo được thời gian: chunk=1 ≈ <b>0,45 s</b>; hai cỡ còn lại làm tròn về <b>0,00 s</b>',
        'Tính ngược ra giá của một syscall: 0,45 s / 2 288 890 ≈ <b>200 ns</b> — và nhận ra <b>đây là toàn bộ thời gian chạy</b>, vì công việc thật (chép 1 byte) gần như bằng 0',
        'Nhận ra dữ liệu <b>không hề đi ra đĩa</b>: file nằm sẵn trong page cache, nên 0,45 s là giá của việc <b>vượt ranh giới nhân</b>, không phải giá của I/O',
        'Kết luận đúng: lời gọi hệ thống không đắt <i>tuyệt đối</i>, nó đắt khi bạn gọi hàng triệu lần — và đó chính là lý do đệm tồn tại'
      ],
      sol: '<p><b>Kết quả thật:</b></p>' +
           '<pre><code>chunk=1      read() calls=2288890   wall 0.45 s\n' +
           'chunk=4096   read() calls=559       wall 0.00 s\n' +
           'chunk=65536  read() calls=35        wall 0.00 s</code></pre>' +
           '<p><b>Giá của một lời gọi hệ thống:</b> 0,45 s / 2 288 890 ≈ <b>196 ns</b>. Đây ' +
           'là con số cần nhớ theo <i>bậc độ lớn</i>: một syscall tốn ' +
           '<b>khoảng vài trăm nano-giây</b> — chuyển sang chế độ nhân, kiểm tra tham số, ' +
           'chép dữ liệu, quay về.</p>' +
           '<p><b>Điểm dễ hiểu nhầm nhất:</b> 0,45 giây ấy <b>không</b> phải thời gian đọc ' +
           'đĩa. File vừa được ghi ở câu E1 nên nó nằm gọn trong <b>page cache</b> của nhân — ' +
           'không có một lần truy cập đĩa nào. Toàn bộ 0,45 s là giá của việc ' +
           '<b>vượt qua ranh giới nhân 2,3 triệu lần</b>. Công việc thật sự (chép một byte) ' +
           'gần như miễn phí; cái đắt là <i>chuyện đi qua cửa</i>.</p>' +
           '<p><b>Kết luận đúng — và nó tinh tế hơn "syscall đắt".</b> 196 ns là ' +
           '<i>rẻ</i>. Gọi một nghìn lần mỗi giây thì hết 0,2 ms, không ai nhận ra. Gọi hai ' +
           'triệu lần thì hết nửa giây. Lời gọi hệ thống không đắt tuyệt đối — nó đắt ' +
           '<b>theo số lượng</b>. Và toàn bộ lý do <code>stdio</code> tồn tại là để biến ' +
           'hàng triệu lời gọi nhỏ thành vài chục lời gọi lớn, đúng như bảng ở câu E1.</p>' +
           '<p><b>Vì sao 4096 và 65536 đều ra 0,00 s:</b> 559 và 35 lời gọi, nhân với 196 ns, ' +
           'là khoảng 110 µs và 7 µs — dưới ngưỡng phân giải của phép đo. Nói cách khác, kể ' +
           'từ cỡ vài KiB trở lên thì chi phí syscall <b>biến mất khỏi bức tranh</b>. Đó là ' +
           'lý do 4 KiB (đúng bằng <code>st_blksize</code>) là mặc định hợp lý, và tăng lên ' +
           '64 KiB gần như không mua thêm được gì.</p>' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Không được xem mã nguồn, không được đoán. Hãy dùng <code>strace</code> để trả lời ' +
         'ba câu hỏi sau về một chương trình <b>đã biên dịch sẵn</b> — lấy ' +
         '<code>./lines 4096 probe.txt</code> ở câu E1 làm ví dụ:<br>' +
         '<ol>' +
         '<li>Nó gọi <code>write()</code> <b>bao nhiêu lần</b>, và tổng bao nhiêu byte?</li>' +
         '<li>File nó mở nằm ở <b>đường dẫn nào</b>, và với cờ gì?</li>' +
         '<li>Có lời gọi nào <b>thất bại</b> không, và thất bại đó có phải chuyện bất thường ' +
         'không?</li>' +
         '</ol>' +
         'Viết ra <b>lệnh chính xác</b> bạn dùng cho từng câu, kèm output thật bạn nhận được.',
      hint: '<code>-c</code> cho bảng tổng kết đếm số lần; bỏ <code>-c</code> thì thấy từng ' +
            'lời gọi kèm tham số. <code>-e trace=</code> lọc bớt cho dễ đọc, và ' +
            '<code>-o file</code> tách output của <code>strace</code> ra khỏi output của ' +
            'chương trình.',
      crit: [
        'Câu 1 dùng <code>strace -c -e trace=write ./lines 4096 probe.txt</code> và đọc đúng cột <code>calls</code> → <b>559</b>',
        'Biết cách xem tổng byte: bỏ <code>-c</code> và đọc giá trị trả về của từng <code>write</code>, hoặc đơn giản là <code>stat -c %s</code> trên file kết quả',
        'Câu 2 dùng <code>strace -e trace=openat ./lines …</code> và đọc được cả <b>đường dẫn</b> lẫn <b>cờ</b> (<code>O_WRONLY|O_CREAT|O_TRUNC</code>)',
        'Câu 3 nhận ra có những lời gọi thất bại nhưng <b>hoàn toàn bình thường</b> — <code>openat</code> dò thư viện qua nhiều thư mục và nhận <code>ENOENT</code> ở những chỗ không có',
        'Nói được vì sao thất bại ấy không phải sự cố: đó là chương trình (hoặc trình liên kết động) đang <b>dò đường</b>, y như <code>splice</code> ở câu B5',
        'Biết tách output: <code>2&gt;&amp;1 &gt;/dev/null</code> hoặc <code>-o trace.txt</code> — nếu không, output của chương trình trộn lẫn với trace'
      ],
      sol: '<p><b>Câu 1 — đếm lời gọi:</b></p>' +
           '<pre><code>$ strace -c -e trace=write ./lines 4096 probe.txt\n' +
           '% time     seconds  usecs/call     calls    errors syscall\n' +
           '------ ----------- ----------- --------- --------- ----------------\n' +
           '100.00    0.000897           1       559           write\n' +
           '------ ----------- ----------- --------- --------- ----------------\n' +
           '100.00    0.000897           1       559           total</code></pre>' +
           '<p>Tổng byte thì không cần <code>strace</code>: <code>stat -c \'%s\' probe.txt</code> ' +
           '→ <code>2288890</code>. Dùng công cụ rẻ nhất trả lời được câu hỏi.</p>' +
           '<p><b>Câu 2 — file nào, cờ gì:</b></p>' +
           '<pre><code>$ strace -e trace=openat ./lines 4096 probe.txt 2>&1 >/dev/null | tail -n 3\n' +
           'openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3\n' +
           'openat(AT_FDCWD, "probe.txt", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 3</code></pre>' +
           '<p>Dòng cuối là file của bạn. Cờ <code>O_WRONLY|O_CREAT|O_TRUNC</code> chính là ' +
           'thứ mà <code>fopen(…, "w")</code> dịch ra — bạn vừa <b>đọc được ý nghĩa của một ' +
           'chuỗi chế độ</b> mà không cần tra tài liệu. Chú ý cả ' +
           '<code>libc.so.6</code>: một chương trình "chỉ ghi một file" vẫn mở vài file khác ' +
           'trước khi <code>main</code> chạy.</p>' +
           '<p><b>Câu 3 — thất bại có bình thường không:</b></p>' +
           '<pre><code>$ strace -e trace=openat ./lines 4096 probe.txt 2>&1 >/dev/null | grep ENOENT | head -n 2\n' +
           'openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3</code></pre>' +
           '<p>Tuỳ máy, bạn sẽ thấy trình liên kết động thử vài đường dẫn và nhận ' +
           '<code>ENOENT</code> ở những chỗ không có thư viện. <b>Hoàn toàn bình thường</b> — ' +
           'đó là cơ chế tìm kiếm, không phải sự cố. Cùng bài học của câu B5: một lời gọi ' +
           'thất bại trong <code>strace</code> thường là chương trình đang dò đường, và ' +
           '<b>số lượng lỗi trong trace không phải thước đo sức khoẻ</b>.</p>' +
           '<p><b>Mẹo quan trọng nhất:</b> <code>strace</code> ghi ra <b>stderr</b>. Nếu ' +
           'không tách bằng <code>2&gt;&amp;1 &gt;/dev/null</code> (hoặc ' +
           '<code>-o trace.txt</code>), trace của bạn sẽ trộn lẫn với output của chương ' +
           'trình. Đúng câu hỏi "fd nào đi đường nào" của Bài 10, dùng vào việc thật.</p>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Tạo một file <b>thưa</b> (sparse): một file mà hệ thống báo là ' +
         '<b>100 MiB</b> nhưng thật ra chỉ chiếm <b>vài KB</b> trên đĩa. Cách làm: ghi vài ' +
         'byte ở đầu, <code>lseek()</code> nhảy tới mốc 100 MiB, ghi thêm vài byte nữa.<br><br>' +
         'Viết chương trình, rồi <b>chứng minh</b> nó thưa bằng ít nhất hai lệnh cho ra hai ' +
         'con số khác nhau. Giải thích vì sao hai con số ấy được phép khác nhau.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Khung để bắt đầu', code:
          'cd ~/bai19\n' +
          'cat > sparse.c <<\'EOF\'\n' +
          '#include <fcntl.h>\n' +
          '#include <unistd.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    int fd = open("sparse.bin", O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
          '    if (fd < 0) return 1;\n' +
          '    write(fd, "HEAD", 4);\n' +
          '    lseek(fd, 100 * 1024 * 1024, SEEK_SET);\n' +
          '    write(fd, "TAIL", 4);\n' +
          '    close(fd);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -o sparse sparse.c && ./sparse' },
      ],
      crit: [
        '<code>ls -l sparse.bin</code> báo <b>104857604</b> byte (100 MiB + 4) — đây là <i>kích thước biểu kiến</i>',
        '<code>du -h sparse.bin</code> báo <b>8.0K</b> — đây là <i>số block thật sự đã cấp</i>',
        'Có dùng thêm ít nhất một lệnh xác nhận: <code>du --apparent-size -h</code> → <b>101M</b>, hoặc <code>stat</code> → <code>blocks=16</code> (16 × 512 = 8 192 byte)',
        'Giải thích đúng: <code>lseek</code> ra ngoài phần đã ghi <b>không cấp phát gì cả</b> — nó chỉ đổi vị trí con trỏ',
        'Nói rõ khoảng trống ở giữa là <b>lỗ</b>: filesystem chỉ ghi nhận "chỗ này chưa có dữ liệu", và khi đọc thì nhân trả về byte 0 mà không đụng tới đĩa',
        'Nêu được một hệ quả thực tế: <code>cp</code> thường hoặc <code>tar</code> không có cờ giữ lỗ sẽ biến file 8 KB thành file 100 MB thật'
      ],
      sol: '<p><b>Bằng chứng — hai lệnh, hai con số:</b></p>' +
           '<pre><code>$ ls -l sparse.bin\n' +
           '104857604 sparse.bin          &lt;- kích thước biểu kiến: 100 MiB + 4\n' +
           '\n' +
           '$ du -h sparse.bin\n' +
           '8.0K    sparse.bin            &lt;- block thật sự đã cấp\n' +
           '\n' +
           '$ du -h --apparent-size sparse.bin\n' +
           '101M    sparse.bin\n' +
           '\n' +
           '$ stat -c \'%n blocks=%b\' sparse.bin\n' +
           'sparse.bin blocks=16          &lt;- 16 x 512 = 8192 byte</code></pre>' +
           '<p><b>Vì sao được phép khác nhau.</b> <code>lseek()</code> chỉ đổi ' +
           '<b>vị trí đọc/ghi</b> của descriptor. Nhảy ra ngoài phần đã ghi ' +
           '<b>không cấp phát byte nào</b> — không có gì để cấp phát, vì bạn chưa đưa dữ liệu ' +
           'nào cả. Khi bạn ghi "TAIL" ở mốc 100 MiB, filesystem cấp block cho <i>đúng chỗ ' +
           'đó</i>, và ghi vào metadata rằng "từ byte 4 tới byte 104857600 là một ' +
           '<b>lỗ</b>".</p>' +
           '<p>Đọc vào vùng lỗ vẫn ra dữ liệu — toàn byte 0 — nhưng nhân sinh ra chúng ' +
           '<b>tại chỗ</b>, không đụng tới đĩa. Đúng tinh thần <code>/proc</code> của Bài 5: ' +
           'nội dung file không nhất thiết là byte có thật ở đâu đó.</p>' +
           '<p><b>Vì sao 8 KB chứ không phải 8 byte:</b> đơn vị cấp phát nhỏ nhất là một ' +
           'block (4 096 byte ở đây). Hai lần ghi rơi vào hai vùng cách xa nhau → hai block → ' +
           '8 192 byte. Bạn không thể xin filesystem cấp ít hơn một block.</p>' +
           '<p><b>⚠ Cái bẫy thực tế.</b> File thưa chỉ thưa <b>tại ' +
           'chỗ</b>. Chép nó bằng <code>cp</code> thường, <code>tar</code> không có ' +
           '<code>--sparse</code>, hay gửi qua <code>scp</code>, và bạn nhận về một file ' +
           '<b>100 MB thật</b> ở đầu bên kia. Ảnh đĩa và ảnh rootfs trong nhúng gần như luôn ' +
           'là file thưa — đó là lý do một ảnh "8 GB" chép sang máy khác đột nhiên chiếm ' +
           'đúng 8 GB. Dùng <code>cp --sparse=always</code> hoặc ' +
           '<code>tar --sparse</code>.</p>' +
           '<p><b>Dọn dẹp:</b> <code>rm -f ~/bai19/sparse.bin</code> — và nhớ là ' +
           '<code>ls</code> báo 100 MiB nhưng bạn chỉ lấy lại được 8 KB.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Hàm chép file dưới đây <b>chạy đúng</b> trên máy bàn, hàng nghìn lần. Nó chứa ' +
         '<b>bốn</b> lỗi riêng biệt liên quan tới bài này. Tìm cả bốn, nói rõ mỗi lỗi gây hậu ' +
         'quả gì, rồi viết lại cho đúng.',
      blocks: [
        { t: 'code', where: 'file', name: 'copy.c — bản hỏng', lang: 'c', code:
          'int copy_file(const char *src, const char *dst)\n' +
          '{\n' +
          '    char buf[4096];\n' +
          '    int  in, out;\n' +
          '    int  n;\n' +
          '\n' +
          '    in  = open(src, O_RDONLY);\n' +
          '    out = open(dst, O_WRONLY | O_CREAT, 0644);\n' +
          '    if (errno != 0)\n' +
          '        return -1;\n' +
          '\n' +
          '    while ((n = read(in, buf, sizeof buf)) != -1) {\n' +
          '        write(out, buf, n);\n' +
          '    }\n' +
          '\n' +
          '    close(in);\n' +
          '    close(out);\n' +
          '    return 0;\n' +
          '}' },
      ],
      hint: 'Ba lỗi nằm ở ba dòng khác nhau bạn nhìn thấy. Lỗi thứ tư là một dòng ' +
            '<b>không có mặt</b> ở đâu cả.',
      crit: [
        'Lỗi 1 — <code>if (errno != 0)</code>: kiểm tra sai nguồn sự thật. Phải kiểm tra <code>in &lt; 0</code> và <code>out &lt; 0</code> riêng; <code>errno</code> có thể mang giá trị cũ (câu B3) nên hàm vừa báo lỗi giả vừa bỏ sót lỗi thật',
        'Lỗi 2 — <code>read(...) != -1</code>: vòng lặp không bao giờ dừng ở cuối file. <code>read</code> trả về <b>0</b> khi hết file, mà 0 khác −1, nên vòng lặp chạy mãi và ghi ra vô hạn 0 byte',
        'Lỗi 3 — <code>write(out, buf, n)</code> không kiểm tra giá trị trả về: ghi thiếu là mất dữ liệu <b>im lặng</b>; phải bọc trong vòng lặp cộng dồn (câu C1)',
        'Lỗi 4 — thiếu <code>O_TRUNC</code>: chép đè lên file cũ dài hơn sẽ để lại <b>phần đuôi của file cũ</b>, tạo ra một file lai hoàn toàn hợp lệ về hình thức',
        'Có nói được vì sao trên máy bàn không lộ: nguồn thường nhỏ hơn hoặc bằng đích, ghi vào file thường thì không ghi thiếu, và <code>errno</code> tình cờ đang là 0',
        'Bản viết lại: kiểm tra từng giá trị trả về, dừng vòng lặp khi <code>n == 0</code>, xử lý <code>EINTR</code>, ghi bằng vòng lặp, đóng cả hai fd trên <b>mọi</b> đường thoát',
        'Có nhắc tới việc kiểm tra giá trị trả về của <code>close(out)</code> — lỗi ghi trễ có thể lộ ra đúng lúc đó'
      ],
      sol: '<p><b>Lỗi 1 — <code>if (errno != 0)</code>.</b> Đây là quy ước sai của câu B3, ' +
           'viết thành mã. Nó hỏng hai chiều: nếu trước đó có lời gọi nào thất bại (kể cả ' +
           'trong thư viện) thì hàm trả <code>-1</code> dù <b>cả hai file đều mở thành ' +
           'công</b>; ngược lại nếu <code>open</code> hỏng mà <code>errno</code> tình cờ là ' +
           '0 — hoặc chỉ một trong hai hỏng — thì nó đi tiếp và dùng một descriptor ' +
           '<code>-1</code>. Phải kiểm tra <b>giá trị trả về</b> của <b>từng</b> lời gọi, ' +
           'ngay tại chỗ.</p>' +
           '<p><b>Lỗi 2 — <code>while ((n = read(...)) != -1)</code>.</b> Hết file thì ' +
           '<code>read</code> trả về <b>0</b>, không phải <code>-1</code> (câu A6). Mà ' +
           '<code>0 != -1</code> là đúng, nên vòng lặp <b>chạy mãi</b>, gọi ' +
           '<code>write(out, buf, 0)</code> vô số lần. Chương trình không crash, không báo ' +
           'lỗi, chỉ treo và ăn 100 % một lõi CPU. Điều kiện đúng là ' +
           '<code>&gt; 0</code>.</p>' +
           '<p><b>Lỗi 3 — <code>write</code> không kiểm tra giá trị trả về.</b> Đúng lỗi của ' +
           'câu C1: ghi thiếu đi qua im lặng. Trên file thường thì gần như không bao giờ xảy ' +
           'ra, nên nó ngủ yên cho tới ngày ai đó gọi <code>copy_file()</code> với đích là ' +
           'một ống, một socket hay một cổng nối tiếp.</p>' +
           '<p><b>Lỗi 4 — dòng không có mặt: thiếu <code>O_TRUNC</code>.</b> Với ' +
           '<code>O_WRONLY | O_CREAT</code>, nếu <code>dst</code> đã tồn tại và ' +
           '<b>dài hơn</b> <code>src</code>, hàm ghi đè từ đầu rồi dừng — phần đuôi của file ' +
           'cũ <b>vẫn còn đó</b>. Kết quả là một file lai: nửa đầu là nội dung mới, nửa sau là ' +
           'rác cũ, kích thước sai, và <b>không có bất kỳ dấu hiệu lỗi nào</b>. Đây là loại ' +
           'hỏng tệ nhất trong cả bốn, vì file trông hoàn toàn bình thường.</p>' +
           '<p><b>Vì sao máy bàn không lộ ra:</b> đích thường là file mới (nên ' +
           '<code>O_TRUNC</code> không quan trọng), đích là file thường (nên không ghi ' +
           'thiếu), <code>errno</code> tình cờ đang là 0, và vòng lặp vô hạn chỉ lộ khi ai đó ' +
           'thật sự chép tới cuối file — mà nếu bạn chỉ thử với file rỗng thì ngay cả lỗi ' +
           'đó cũng nấp được.</p>' +
           '<p><b>Bản viết lại:</b></p>' +
           '<pre><code>int copy_file(const char *src, const char *dst)\n' +
           '{\n' +
           '    char    buf[4096];\n' +
           '    int     in, out, rc = -1;\n' +
           '    ssize_t n;\n' +
           '\n' +
           '    in = open(src, O_RDONLY);\n' +
           '    if (in &lt; 0)\n' +
           '        return -1;\n' +
           '\n' +
           '    out = open(dst, O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
           '    if (out &lt; 0) {\n' +
           '        close(in);\n' +
           '        return -1;\n' +
           '    }\n' +
           '\n' +
           '    while ((n = read(in, buf, sizeof buf)) &gt; 0) {\n' +
           '        ssize_t sent = 0;\n' +
           '        while (sent &lt; n) {\n' +
           '            ssize_t w = write(out, buf + sent, (size_t)(n - sent));\n' +
           '            if (w &lt; 0) {\n' +
           '                if (errno == EINTR) continue;\n' +
           '                goto done;\n' +
           '            }\n' +
           '            sent += w;\n' +
           '        }\n' +
           '    }\n' +
           '    if (n &lt; 0 &amp;&amp; errno != EINTR)\n' +
           '        goto done;\n' +
           '\n' +
           '    rc = 0;\n' +
           'done:\n' +
           '    close(in);\n' +
           '    if (close(out) &lt; 0)   /* lỗi ghi trễ có thể lộ ra ĐÚNG ở đây */\n' +
           '        rc = -1;\n' +
           '    return rc;\n' +
           '}</code></pre>' +
           '<p><b>Chi tiết cuối cùng đáng nhớ:</b> <code>close()</code> ' +
           '<b>cũng có thể thất bại</b>. Trên một số filesystem, lỗi ghi thật sự chỉ được báo ' +
           'lúc đóng. Bỏ qua giá trị trả về của <code>close(out)</code> là bỏ qua thông báo ' +
           'lỗi cuối cùng bạn còn cơ hội nhận được — đúng cùng cơ chế với ' +
           '<code>fflush</code>/<code>fclose</code> ở câu B6.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: '<b>Câu này không có lời giải đóng.</b> Cả bài học nói về ' +
         '<b>một</b> tiến trình gọi <code>write()</code>. Bây giờ thử hai tiến trình.<br><br>' +
         'Viết một chương trình mở cùng một file bằng <code>O_WRONLY | O_APPEND</code>, rồi ' +
         'chạy <b>hai bản cùng lúc</b>, mỗi bản ghi 10 000 dòng có đánh dấu ai ghi. Sau đó ' +
         'thử lại <b>không</b> có <code>O_APPEND</code> (dùng <code>lseek</code> tới cuối rồi ' +
         'ghi). Đếm số dòng thu được, và tìm xem có dòng nào bị <b>trộn lẫn vào nhau</b> ' +
         'không.<br><br>' +
         'Sau đó thử tiếp: dòng dài bao nhiêu thì kết quả bắt đầu hỏng?',
      hint: '<code>wc -l</code> cho biết mất dòng hay không. <code>grep -c</code> theo dấu ' +
            'hiệu của từng tiến trình cho biết mất của ai. Còn "trộn lẫn" thì phải tìm bằng ' +
            'một biểu thức khớp <b>dòng không hợp lệ</b> — hãy nghĩ xem dòng hợp lệ trông thế ' +
            'nào trước đã.',
      crit: [
        'Có thật sự chạy cả hai phiên bản và ghi lại số dòng đếm được của từng phiên bản',
        'Nhận ra <b>có</b> khác biệt: bản <code>O_APPEND</code> giữ đủ 20 000 dòng, bản <code>lseek</code> + <code>write</code> mất dòng',
        'Giải thích được vì sao: <code>O_APPEND</code> gộp "nhảy tới cuối" và "ghi" thành <b>một thao tác không thể bị chen ngang</b>; tách làm hai lời gọi thì tiến trình kia có thể chen vào giữa',
        'Có thử với dòng dài dần và tìm được ngưỡng mà ngay cả <code>O_APPEND</code> cũng bắt đầu cho ra dòng lẫn lộn',
        'Liên hệ được ngưỡng đó với một con số của hệ thống (kích thước trang / kích thước bộ đệm ống <b>65 536</b> mà bạn đã thấy ở câu B1)',
        'Nêu được ít nhất một câu hỏi mới mà thí nghiệm này mở ra và bạn chưa trả lời được'
      ],
      sol: '<p><b>Không có đáp án chuẩn — dưới đây là bản đồ.</b></p>' +
           '<p><b>Cái bạn sẽ thấy.</b> Với <code>O_APPEND</code>, ' +
           '<code>wc -l</code> cho đủ 20 000 dòng và mỗi dòng nguyên vẹn. Với ' +
           '<code>lseek(fd, 0, SEEK_END)</code> rồi <code>write()</code>, bạn sẽ ' +
           '<b>mất dòng</b> — hai tiến trình cùng hỏi "cuối file ở đâu", nhận cùng một câu ' +
           'trả lời, rồi cùng ghi đè lên nhau.</p>' +
           '<p><b>Khác biệt nằm ở đâu.</b> Hai lời gọi tách rời tạo ra một khe hở: giữa lúc ' +
           'bạn hỏi vị trí và lúc bạn ghi, tiến trình kia có thể chen vào. ' +
           '<code>O_APPEND</code> nói với nhân "hãy tự nhảy tới cuối rồi ghi, trong ' +
           '<b>cùng một</b> thao tác" — và nhân bảo đảm không ai chen được vào giữa. Từ khoá ' +
           'để tra cứu là <b>atomicity</b>.</p>' +
           '<p><b>Rồi bạn sẽ đâm vào cái tường thứ hai.</b> Tăng độ dài dòng lên vài chục ' +
           'KB và ngay cả <code>O_APPEND</code> cũng bắt đầu cho ra những dòng lai — nửa đầu ' +
           'của tiến trình A, nửa sau của B. Bảo đảm nguyên tử chỉ đúng ' +
           '<b>tới một kích thước nhất định</b>, và con số ấy có họ hàng với 65 536 mà bạn đã ' +
           'gặp ở câu B1. Vượt ngưỡng đó thì "một lời gọi <code>write</code>" không còn là ' +
           '"một thao tác không chia cắt" nữa.</p>' +
           '<p><b>Vì sao chuyện này quan trọng.</b> Đây đúng là cơ chế mà mọi hệ thống log ' +
           'nhiều tiến trình dựa vào — và cũng đúng là lý do log của bạn thỉnh thoảng có một ' +
           'dòng rác mà không ai giải thích nổi. Trên board nhúng, nơi vài daemon cùng ghi ' +
           'vào một file trên thẻ nhớ, nó không phải chuyện lý thuyết.</p>' +
           '<p><b>Những câu hỏi thí nghiệm này mở ra — bài sau trả lời:</b></p>' +
           '<ul>' +
           '<li>Nếu hai <b>luồng</b> trong <i>cùng</i> một tiến trình cùng ghi thì sao? Chúng ' +
           'dùng chung bảng descriptor, vậy có gì khác không?</li>' +
           '<li>Nếu tiến trình <code>fork()</code> sau khi đã mở file, hai bên có dùng chung ' +
           '<b>vị trí đọc/ghi</b> không, hay mỗi bên một bản? (Bài 20)</li>' +
           '<li>Một tín hiệu đến <b>đúng giữa</b> một lời gọi <code>write()</code> dài thì ' +
           'chuyện gì xảy ra? Đây chính là chỗ <code>EINTR</code> ở câu E5 thôi là chi tiết ' +
           'thừa và trở thành thứ bạn phải xử lý thật. (Bài 21)</li>' +
           '</ul>' +
           '<p>Chưa trả lời được là bình thường. Hãy ghi lại số đo và câu hỏi của bạn, rồi ' +
           'quay lại đối chiếu sau khi học xong Bài 20 và Bài 21.</p>' },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══ */
  diag: [
    ['A1, B1, C1',
     'Bạn coi <code>write()</code> như một lệnh "ghi hết hoặc báo lỗi". Nó là một hàm ' +
     '<b>trả về số byte</b>, và một số nhỏ hơn số bạn xin không phải lỗi.',
     '<a href="#/bai-19#nam-lenh-goi-nen-tang-open-read-write-close-lseek">Bài 19 — Năm lệnh gọi nền tảng: open, read, write, close, lseek</a>'],

    ['A3, B2, C2',
     'Bạn nghĩ <code>printf</code> ghi ra ngay. Nó chỉ chép vào một vùng đệm ' +
     '<b>trong tiến trình bạn</b>, và thời điểm dữ liệu thật sự đi phụ thuộc vào đầu ra là ' +
     'terminal hay file.',
     '<a href="#/bai-19#syscall-thuan-va-stdio-co-dem-cung-ket-qua-khac-358-lan-so-s">Bài 19 — Syscall thuần và stdio có đệm</a>'],

    ['A5, B3, C3',
     '<code>errno</code> chỉ có nghĩa <b>ngay sau</b> một lời gọi đã báo lỗi qua giá trị trả ' +
     'về. Không lời gọi nào dọn nó về 0 khi thành công.',
     '<a href="#/bai-19#errno-nhan-noi-loi-gi-va-khi-nao-duoc-phep-tin-no">Bài 19 — errno: nhân nói lỗi gì, và khi nào được phép tin nó</a>'],

    ['A2, B4, C4',
     'Bạn chưa nắm file descriptor là <b>chỉ số vào bảng file mở của tiến trình</b>: nó ' +
     'không mang dữ liệu, nó hết chỗ được, và nó chết cùng tiến trình.',
     '<a href="#/bai-19#file-descriptor-mot-con-so-dai-dien-cho-moi-thu">Bài 19 — File descriptor: một con số đại diện cho mọi thứ</a>'],

    ['A4',
     'Chưa rõ vì sao chương trình không được tự chạm vào phần cứng, và syscall là cánh cửa ' +
     'duy nhất đi qua ranh giới đó.',
     '<a href="#/bai-19#vi-sao-chuong-trinh-cua-ban-khong-duoc-phep-cham-vao-phan-cu">Bài 19 — Vì sao chương trình của bạn không được phép chạm vào phần cứng</a>'],

    ['A7',
     'Chưa hình dung được một syscall <b>thực sự</b> diễn ra thế nào: số hiệu, chuyển chế độ, ' +
     'quay về — và vì sao chuyện đó tốn thời gian.',
     '<a href="#/bai-19#mot-syscall-thuc-su-dien-ra-the-nao">Bài 19 — Một syscall thực sự diễn ra thế nào</a>'],

    ['A6, E5',
     'Nhầm ba kết quả khác nhau của <code>read()</code>: số dương (đọc được), ' +
     '<b>0</b> (hết file), <code>-1</code> (lỗi). Nhầm chỗ này thì vòng lặp của bạn hoặc dừng ' +
     'sớm hoặc chạy mãi.',
     '<a href="#/bai-19#nam-lenh-goi-nen-tang-open-read-write-close-lseek">Bài 19 — Năm lệnh gọi nền tảng: open, read, write, close, lseek</a>'],

    ['A8',
     'Chưa quen các mã lỗi hay gặp (<code>ENOENT</code>, <code>EACCES</code>, ' +
     '<code>EMFILE</code>, <code>ENOSPC</code>, <code>EAGAIN</code>, <code>EINTR</code>) và ' +
     'mỗi mã đòi một phản ứng khác nhau.',
     '<a href="#/bai-19#errno-nhan-noi-loi-gi-va-khi-nao-duoc-phep-tin-no">Bài 19 — errno: nhân nói lỗi gì, và khi nào được phép tin nó</a>'],

    ['B5, E3',
     'Chưa dùng được <code>strace</code> để trả lời một câu hỏi cụ thể về chương trình ' +
     '<b>không có mã nguồn</b> — và chưa quen với việc trace có lỗi vẫn là chuyện bình thường.',
     '<a href="#/bai-19#strace-nhin-xuyen-qua-mot-chuong-trinh-khong-co-ma-nguon">Bài 19 — strace: nhìn xuyên qua một chương trình không có mã nguồn</a>'],

    ['B6',
     'Chưa thấy được rằng đệm làm trễ cả <b>thông báo lỗi</b>: chương trình thoát với mã 0 ' +
     'trong khi không byte nào tới đích.',
     '<a href="#/bai-19#loi-thuong-gap">Bài 19 — Lỗi thường gặp</a>'],

    ['C5, E1, E2',
     'Chưa có con số trong đầu về giá của một syscall, nên không quyết định được kích thước ' +
     'đệm bằng lập luận thay vì bằng cảm giác.',
     '<a href="#/bai-19#mot-syscall-dat-hon-mot-loi-goi-ham-bao-nhieu">Bài 19 — Một syscall đắt hơn một lời gọi hàm bao nhiêu?</a>'],

    ['E4',
     'Chưa nắm <code>lseek()</code>: nó chỉ đổi vị trí đọc/ghi, không cấp phát gì — đó là ' +
     'toàn bộ cơ chế của file thưa.',
     '<a href="#/bai-19#nam-lenh-goi-nen-tang-open-read-write-close-lseek">Bài 19 — Năm lệnh gọi nền tảng: open, read, write, close, lseek</a>'],

    ['E5',
     'Viết được vòng lặp chép file nhưng chưa xử lý đủ bốn thứ: kiểm tra từng ' +
     '<code>open</code>, dừng đúng ở <code>0</code>, ghi bằng vòng lặp, và đóng trên mọi ' +
     'đường thoát.',
     '<a href="#/bai-19#thuc-hanh-viet-lai-lenh-cp-bang-nam-syscall">Bài 19 — Thực hành: viết lại lệnh cp bằng năm syscall</a>'],

    ['D1',
     'Quên mất <code>/proc</code> không phải file trên đĩa — nội dung được nhân sinh ra ngay ' +
     'lúc bạn đọc.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Bài 5 — /proc và /sys: hai thư mục không nằm trên đĩa</a>'],

    ['D2',
     'Quên mất <code>|</code> chỉ nối <b>fd 1</b>; fd 2 đi thẳng ra terminal và không bao giờ ' +
     'vào lệnh bên phải.',
     '<a href="#/bai-10#duong-ong-noi-stdout-cua-lenh-nay-vao-stdin-cua-lenh-kia">Bài 10 — Đường ống: nối stdout của lệnh này vào stdin của lệnh kia</a>'],

    ['D3',
     'Quên mất nhân chỉ xét <b>một</b> triplet quyền rồi dừng, và quyền được kiểm tra một ' +
     'lần duy nhất lúc <code>open</code>.',
     '<a href="#/bai-08#r-w-x-nghia-khac-nhau-voi-file-va-voi-thu-muc">Bài 8 — r, w, x nghĩa khác nhau với file và với thư mục</a>'],
  ],
});

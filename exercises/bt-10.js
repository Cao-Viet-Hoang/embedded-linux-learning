/* ═══════════════════════════════════════════════════════════════════════════
   BT-10 — Bài tập cho Bài 10: "Pipe, redirect và triết lý Unix"
   ═══════════════════════════════════════════════════════════════════════════

   §13.4 — CHỌN TRỤC XOÁY. Bảy bước, ghi lại để phiên sau soi được lựa chọn
   thay vì phải suy lại từ đầu.

   BƯỚC 1–2. Kiểm kê rồi chấm điểm. PT = phụ thuộc về sau, GIA = giá phải trả
   khi hiểu sai, NGC = ngược trực giác. Thang 0/1/2.

   Khái niệm                                            | PT | GIA | NGC | Tổng
   -----------------------------------------------------|----|-----|-----|-----
   Shell cắt file về 0 TRƯỚC khi lệnh chạy (sudo vô ích) |  2 |  2  |  2  |  6
   Đường ống chỉ mang fd 1; stderr đi vòng qua ống       |  2 |  2  |  2  |  6
   Không phải lệnh nào cũng đọc stdin — xargs là cầu nối |  2 |  1  |  2  |  5
   Mã thoát của ống là của tầng cuối; pipefail           |  2 |  2  |  1  |  5
   2>&1 là một BẢN CHỤP, không phải sợi dây → thứ tự     |  1 |  2  |  2  |  5
   Các tầng chạy SONG SONG; SIGPIPE truyền ngược         |  2 |  1  |  2  |  5
   Giá thật của file trung gian là số byte ghi xuống đĩa |  2 |  1  |  2  |  5
   Here-doc: <<'EOF' giữ nguyên, <<EOF thay biến         |  1 |  2  |  1  |  4
   <(lenh) là một đường ống đội lốt tên file             |  1 |  0  |  2  |  3
   tee rẽ dòng làm hai                                   |  1 |  1  |  1  |  3
   Bốn file thiết bị /dev/null · zero · full · urandom   |  1 |  0  |  1  |  2
   FIFO: loại file p, luôn 0 byte                        |  1 |  0  |  1  |  2
   exec 3> — tự mở fd cho riêng mình                     |  1 |  0  |  1  |  2
   Triết lý Unix → BusyBox, bash-only vs POSIX           |  2 |  1  |  0  |  3
   Ba fd 0/1/2 đọc được ở /proc/self/fd                  |  1 |  0  |  1  |  2
   noclobber                                             |  0 |  0  |  0  |  0

   BƯỚC 3. Ngưỡng: tổng ≥ 4 và ít nhất hai trục ≥ 1. Tám khái niệm đạt ngưỡng.
   Trần cứng là 3, nên năm cái phải rơi xuống mức "hỏi đúng một lần".

   BƯỚC 4. Loại. Bộ này bị cắt nhiều hơn bt-09, vì quiz của chính Bài 10 hỏi
   thẳng bốn trong bảy khái niệm điểm cao nhất:

     (a) §13.1 cấm biến bộ bài tập thành quiz thứ hai. Quiz Bài 10 đã hỏi
         head-on:
           · ai xoá file khi `grep x f > f`      (quiz câu 1)  → 6 điểm, LOẠI
           · `sudo lenh > /etc/f` vì sao hỏng     (quiz câu 5)  → cùng khái niệm
           · dạng nào ghi được cả hai vào log     (quiz câu 2)  → 2>&1, LOẠI
           · vì sao seq|head xong trong 0,004 s   (quiz câu 3)  → SIGPIPE, LOẠI
           · CI báo dựng thành công dù make hỏng  (quiz câu 4)  → mã thoát, LOẠI
           · here-doc không nháy thì $PATH bị gì  (quiz câu 6)  → LOẠI
         Năm khái niệm này KHÔNG biến mất — mỗi cái xuất hiện đúng một lần, và
         luôn ở một thao tác khác thao tác mà quiz đòi hỏi. Cụ thể:
           · "shell cắt file trước khi lệnh chạy" → B4, đòi giải thích cơ chế
             fork/exec chứ không đòi chỉ mặt thủ phạm.
           · "2>&1 là bản chụp"                   → B5, đòi giải thích vì sao
             chứ không đòi chọn dạng đúng trong bốn dạng.
           · "SIGPIPE / mã 141"                   → C2, lần này SIGPIPE là
             THỦ PHẠM làm hỏng CI chứ không phải tính năng làm nhanh.
           · "mã thoát của ống là của tầng cuối"  → A7, chỉ ở mức gọi tên.
           · "here-doc quoting"                   → B6, dạng bắt lỗi phát biểu.

     (b) "Shell cắt file trước khi lệnh chạy" còn một lý do thứ hai để bị loại,
         và nó nặng hơn lý do (a). bt-04 đã xoáy "shell cắt dòng lệnh theo
         khoảng trắng TRƯỚC khi lệnh nhìn thấy đối số"; bt-06 đã xoáy "shell mở
         rộng dấu sao, lệnh không bao giờ thấy nó"; bt-09 bước 4(b) đã từ chối
         biến thể thứ ba. Đây sẽ là biến thể thứ tư của cùng một mệnh đề. §13.3
         gọi đúng tên kiểu lạm dụng ấy.

     (c) "Ba fd đọc được ở /proc/self/fd" là một sự thật về môi trường hơn là
         một nguyên lý, và nó lookup được trong mười giây. Không làm trục; nó
         thành nguyên liệu cho E6.

     (d) noclobber, FIFO, bốn file thiết bị, exec 3> đều dưới ngưỡng. Mỗi cái
         đúng một câu: A4 (thiết bị), A6 (FIFO), E4 (exec 3>).

   Ba cái còn lại đứng vững, và cả ba đều KHÔNG bị quiz đụng tới:

   BƯỚC 5–6. Ba mệnh đề sai được và ngộ nhận đối lập nằm ở trường `x` và `mis`
   của mảng `truc` ngay dưới đây.

   Đối chiếu §13.8 (trục đã tiêu): bt-01 MMU · bốn mảnh nối tiếp · Device Tree;
   bt-02 DRAM chết lúc reset · mỗi tầng biến mất · bootargs; bt-03 ảo hoá cùng
   kiến trúc · hai họ QEMU · /mnt/c; bt-04 $? · builtin không phải file · shell
   cắt khoảng trắng; bt-05 /proc sinh lúc đọc · file /dev không chứa dữ liệu ·
   thư mục rỗng là điểm gắn; bt-06 shell mở rộng * · tên không phải file ·
   metadata là một hệ thống; bt-07 Ctrl+S đóng băng terminal · vim có chế độ ·
   lệnh : mặc định một dòng; bt-08 một bộ ba · thư mục là bảng tên · quyền phần
   cứng là nhóm; bt-09 TERM rồi mới KILL · load là số đếm · bảng job của shell.
   Không trục nào của bt-10 trùng.

   BƯỚC 7. Lưới 3×1, kiểm bằng mắt trước khi để tools/check.js kiểm bằng máy:

     Trục 1 (ống chỉ mang fd 1)   A1 mệnh đề → B1 số đo thật → C1 chẩn đoán
     Trục 2 (không ai cũng đọc stdin) A2 mệnh đề → B2 số đo thật → C3 tình huống
     Trục 3 (giá thật là byte ghi đĩa) A3 mệnh đề → B3 hai cột số → C5 tính toán

   Ba mức, ba loại kích thích khác nhau:
   · A hỏi bằng một phát biểu trần trụi, trả lời được bằng trí nhớ.
   · B đặt trước mặt học viên một bản ghi thật — wc đếm 1 rồi đếm 2, `echo`
     nhận về một dòng trống, hai cột thời gian kèm hai cột số byte — và đòi
     giải thích cơ chế.
   · C đưa ràng buộc chưa từng có trong bài: một CI báo "0 lỗi" trên bản dựng
     hỏng, một bo mạch có 200 000 file log phải xoá, một eMMC 3 000 chu kỳ ghi.

   Không câu nào đoán được từ câu kia: C1 hỏi *phải sửa dòng lệnh thế nào* và
   đưa ba nghi phạm cùng lúc, thứ A1/B1 không hề dạy; C3 đưa một giới hạn
   (ARG_MAX) chưa từng xuất hiện ở A2/B2; C5 đòi một con số và một quyết định,
   còn A3/B3 chỉ mô tả hiện tượng.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT

   Máy: WSL2 · Ubuntu 26.04 LTS "resolute" · coreutils là bản **uutils 0.8.0**
   (Rust), không phải GNU · bash 5.3.9 · shinarus, uid 1000 · 6 nhân
   (11th Gen Intel Core i7-1165G7 @ 2.80GHz) · ngày 2026-08-15.
   Chạy trong ~/embedded/bt10, đã xoá sạch sau khi đo.

   Những chỗ số đo khác điều người ta hay đoán, hoặc khác chính Bài 10:

   · `tee /dev/full` in ra `/dev/full: No space left on device (os error 28)`.
     Cụm `(os error 28)` là chữ ký của uutils viết bằng Rust; bản GNU không in
     nó. Đã kiểm: `tee --version` → `tee (uutils coreutils) 0.8.0`, và
     `readlink -f /usr/bin/tee` → `/usr/lib/cargo/bin/coreutils/tee`. Đây là
     máy của người học, không phải sai số — xem §10 (docs/environment.md).
     Lưu ý cho phiên sau: header của bt-09 ghi "Ubuntu 24.04" là ghi nhầm;
     docs/environment.md đã ghi đúng 26.04 + uutils từ trước.
   · CHỖ NÀY PHẢI ĐỌC KỸ — nó sửa một con số của chính Bài 10. Bài 10 viết
     "đường ống nhanh hơn 1,4 lần" dựa trên **0,324 s** so với **0,232 s**.
     Chạy lại đúng thí nghiệm ấy **ba lần liên tiếp** trong cùng một phiên thì
     con số 1,4 lần KHÔNG lặp lại:

         lần 1   file trung gian 0,324 s   đường ống 0,316 s   (nhanh hơn 2,5 %)
         lần 2   file trung gian 0,234 s   đường ống 0,211 s   (nhanh hơn 11 %)
         lần 3   file trung gian 0,192 s   đường ống 0,181 s   (nhanh hơn 6 %)

     Nguyên nhân đã truy ra: 0,324 s của Bài 10 là lần chạy **nguội**, còn
     0,232 s là lần chạy ngay sau đó khi page cache đã ấm. So một lần nguội với
     một lần ấm thì ra 1,4 lần; so cùng trạng thái thì chỉ còn 2–11 %, và bản
     thân con số cứ trôi dần xuống qua từng lần chạy.
     Trong khi đó số byte ghi xuống đĩa ra **28 856 304** — giống hệt nhau
     **cả ba lần**, không lệch một byte.
     Đây chính là bằng chứng đắt nhất cho trục 3, nên B3 dùng nguyên ba lần đo
     này: đại lượng mà người ta hay viện dẫn thì không lặp lại được, đại lượng
     đáng viện dẫn thì lặp lại chính xác tuyệt đối. Bộ bài tập KHÔNG nhắc lại
     con số "1,4 lần" ở bất kỳ đâu.
   · Vì lý do trên, bộ này cũng KHÔNG đưa ra bất kỳ con số thời gian nào cho
     cặp `grep f` với `cat f | grep`. Đo cặp đó bốn lần theo bốn cách thì ra
     bốn kết quả mâu thuẫn nhau (từ "bằng nhau" tới "chênh 3,5 lần" tuỳ chỗ
     hứng stdout và tuỳ vòng lặp), tức là dưới ngưỡng nhiễu của máy này. Bài 10
     đã có một hộp cảnh báo về cặp ấy rồi; §13.3 chỉ cho hỏi một lần, và lần ấy
     Bài 10 đã dùng. Nguyên tắc chung rút ra: chỉ in vào bài tập con số nào
     **lặp lại được**.
   · ARG_MAX = **2 097 152**. Nhưng 40 000 file tên ngắn KHÔNG làm `rm $(ls)`
     hỏng — đã thử, rc=0. Phải lên **200 000** file tên dài
     (`sensor-2026-08-15-N.log`) mới nhận `Argument list too long`. Con số
     trong C3 là con số đã thật sự làm lệnh hỏng, không phải con số đoán.
   · `sudo` trên máy này **đòi mật khẩu tương tác** (`sudo: interactive
     authentication is required`, rồi `sudo: timed out`). Vì thế bộ này không
     có câu nào cần sudo — nửa `| sudo tee` của Bài 10 không kiểm chứng được
     nên không được đưa vào, và §13.1 cũng đã loại nó vì quiz câu 5 hỏi rồi.
   · Sức chứa mặc định của một đường ống đo bằng `fcntl(F_GETPIPE_SZ)` là
     **65 536 byte**; `/proc/sys/fs/pipe-max-size` là **1 048 576**. Dùng cho E6.
   · E6 bắt được bằng chứng đẹp nhất của cả bộ: `sleep 300 | cat` cho
     `/proc/<sleep>/fd/1 -> pipe:[20583]` và `/proc/<cat>/fd/0 -> pipe:[20583]`
     — **cùng một số inode**. Hai tiến trình, một cái ống.
   · Script `rotate-bad.sh` chạy thật: `app.log` còn **0 byte**, `rotate.log`
     chỉ có **3** dòng thay vì 5, và script vẫn thoát với mã **0** trong khi
     bản dựng bên trong nó hỏng với mã 2. Ba lỗi, một lần chạy. Dùng cho E5.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-10',
  minutes: 85,

  intro:
    '<p>Bài 10 là bài đầu tiên dạy bạn <b>lắp ráp</b>. Cho tới giờ bạn học từng lệnh một; ' +
    'từ bài này trở đi bạn nối chúng lại, và chỗ hỏng sẽ không còn nằm trong một lệnh nào cả ' +
    'mà nằm ở <b>mối nối</b>. Đó là loại lỗi khó nhất để nhìn thấy: mọi thành phần đều đúng, ' +
    'câu lệnh chạy trót lọt, không có thông báo nào — và kết quả vẫn sai. Bộ bài tập này vì ' +
    'thế xoáy vào <b>những gì đường ống không mang theo</b>, chứ không vào cú pháp của nó.</p>' +
    '<p>Ba trục đều nằm ở chỗ trực giác đánh lừa: dấu <code>|</code> <b>không</b> chuyển mọi ' +
    'thứ lệnh trái in ra — nó bỏ lại toàn bộ thông báo lỗi; lệnh đứng sau <code>|</code> ' +
    '<b>không</b> chắc đã đọc dữ liệu — rất nhiều lệnh không đọc stdin một byte nào; và cái ' +
    'giá của file trung gian <b>không</b> phải thời gian — đo được thì chênh nhau vài phần ' +
    'trăm giây, còn thứ chênh nhau thật là <b>27,5 MB ghi xuống đĩa so với 0 byte</b>. Mỗi ' +
    'trục được hỏi đúng ba lần — một lần nhớ lại, một lần trước số đo thật, một lần trong ' +
    'tình huống chưa từng gặp.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong Bài 10: phần <b>A</b> và <b>B</b>, khoảng ' +
    '23 phút. <b>Lượt 2</b> — quay lại sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, ' +
    'khoảng 62 phút. Khoảng nghỉ đó là thành phần có tác dụng, không phải thời gian chết. ' +
    'Phần <b>D</b> lần này lật lại Bài 5 (file thiết bị và cặp major/minor), Bài 8 (kernel ' +
    'chỉ xét <b>một</b> bộ ba quyền) và Bài 4 (builtin không phải file trên đĩa — và ' +
    '<code>&gt;</code> thì thậm chí không phải một lệnh).</p>' +
    '<p>Mọi kết quả in trong bộ này đều chạy thật trên máy bạn, ngày 15/08/2026. Máy này ' +
    'dùng <b>uutils coreutils 0.8.0</b> chứ không phải GNU coreutils, nên vài thông báo lỗi ' +
    'có đuôi lạ như <code>(os error 28)</code> — đó là bản coreutils viết bằng Rust, không ' +
    'phải máy bạn hỏng.</p>',

  /* Chỉ trường `name` được hiển thị; `x` và `mis` là ghi chú cho người viết đề. */
  truc: [
    { id: 'ong-chi-mang-fd-1',
      name: 'Đường ống chỉ mang <b>fd 1</b>. Mọi thông báo lỗi đi ở fd 2, <b>vòng qua</b> đường ống và rơi thẳng ra terminal — nên thứ bạn lọc được không phải là tất cả những gì lệnh đã in',
      x: 'Dấu | nối fd 1 của lệnh trái vào fd 0 của lệnh phải, và chỉ có thế. fd 2 của mọi ' +
         'tầng vẫn trỏ nguyên vào terminal. Hệ quả đo được: `ls a.txt missing.txt | wc -l` ' +
         'cho 1, còn `|& wc -l` cho 2. Hệ quả nghề nghiệp: `make | grep error` là một câu ' +
         'lệnh vô dụng, vì gcc và make in lỗi ra fd 2. Muốn ống mang cả lỗi thì phải viết ' +
         '`2>&1 |` hoặc `|&` của bash.',
      mis: '"Dấu | chuyển mọi thứ lệnh trái in ra màn hình sang cho lệnh phải" — và hệ quả ' +
           'của ngộ nhận đó: "grep không tìm thấy chữ error, vậy là không có lỗi."' },

    { id: 'khong-phai-ai-cung-doc-stdin',
      name: 'Không phải lệnh nào đứng sau <code>|</code> cũng <b>đọc</b> stdin. Rất nhiều lệnh chỉ nhận <b>tham số</b>, và với chúng thì đường ống im lặng không làm gì cả — <code>xargs</code> là cầu nối',
      x: 'grep, sort, wc, sed, awk, cat đọc stdin. echo, rm, mkdir, kill, cp, mv, touch thì ' +
         'không — chúng chỉ nhìn argv. `seq 1 5 | echo` in ra một dòng trống và không báo ' +
         'lỗi gì; `echo junk.txt | rm` báo `rm: missing operand`. xargs đứng giữa: nó gom ' +
         'stdin lại rồi GỌI lệnh với những dòng đó làm tham số. Nó cũng là lời giải cho ' +
         'giới hạn ARG_MAX, vì nó tự chia thành nhiều lượt gọi.',
      mis: '"Bất cứ lệnh nào đứng sau dấu | cũng nhận được dữ liệu từ ống" — ngộ nhận này ' +
           'nguy hiểm vì phần lớn trường hợp nó thất bại **im lặng**, không có thông báo.' },

    { id: 'gia-that-la-byte-ghi-dia',
      name: 'Cái giá thật của file trung gian không phải <b>thời gian</b> mà là <b>số byte ghi xuống đĩa</b> — và trên bộ nhớ flash, số byte ấy chính là tuổi thọ sản phẩm',
      x: 'Chạy cùng một thí nghiệm ba lần: file trung gian mất 0,324 / 0,234 / 0,192 s, ' +
         'đường ống mất 0,316 / 0,211 / 0,181 s. Đường ống nhanh hơn 2,5 %, rồi 11 %, rồi ' +
         '6 % — con số nhảy nhót và cứ trôi dần xuống, tức là nó đo trạng thái page cache ' +
         'nhiều hơn đo hai cách viết. Nhưng số byte ghi xuống đĩa thì ra 28 856 304 byte ' +
         'ĐÚNG BẰNG NHAU cả ba lần, còn đường ống ghi 0. Một đại lượng không lặp lại được, ' +
         'một đại lượng lặp lại tuyệt đối — và người ta thường viện dẫn đúng cái không lặp ' +
         'lại được. Trên SSD máy bàn, 27,5 MB là không có gì; trên eMMC hoặc NAND, mỗi khối ' +
         'chỉ chịu được vài nghìn chu kỳ xoá-ghi nên số byte ấy quy thẳng ra tuổi thọ.',
      mis: '"Đường ống đáng dùng vì nó nhanh hơn file tạm" — người tin điều này sẽ bỏ qua ' +
           'đường ống ngay khi thấy chênh lệch thời gian không đáng kể, tức là bỏ qua đúng ' +
           'lúc lý do thật vẫn còn nguyên giá trị.' },
  ],

  /* ═══ A · Nhận biết — 4 mcq + 2 tf + 1 fill + 1 match ═══════════════════ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Phát biểu nào mô tả <b>đúng</b> thứ mà dấu <code>|</code> chuyển từ lệnh bên trái ' +
         'sang lệnh bên phải?',
      opts: [
        'Mọi thứ lệnh bên trái in ra màn hình — cả kết quả lẫn thông báo lỗi.',
        'Chỉ <b>fd 1</b> (stdout). fd 2 (stderr) không đi vào ống mà rơi thẳng ra terminal.',
        'Chỉ fd 2. Kết quả bình thường được ghi ra một file tạm và lệnh bên phải đọc file đó.',
        'Cả fd 1 lẫn fd 2, nhưng fd 2 luôn được xếp xuống cuối dòng chảy.'
      ],
      a: 1,
      why: 'Đường ống là một bộ đệm trong kernel nối <b>fd 1</b> của tầng trái vào ' +
           '<b>fd 0</b> của tầng phải. Nó không biết fd 2 tồn tại. fd 2 của <i>mọi</i> tầng ' +
           'trong ống vẫn trỏ nguyên vào terminal — đó là lý do bạn vẫn thấy thông báo lỗi ' +
           'hiện ra màn hình dù đã <code>| grep</code> hay <code>| wc</code>. Đáp án 3 sai ' +
           'thêm một ý nữa: đường ống <b>không</b> tạo file tạm nào cả, không byte nào chạm ' +
           'đĩa. Muốn ống mang cả lỗi thì viết <code>2&gt;&amp;1 |</code>, hoặc dạng viết ' +
           'tắt riêng của bash là <code>|&amp;</code>.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Câu nào đúng về những gì xảy ra khi bạn viết <code>lenh_trai | lenh_phai</code>?',
      opts: [
        'Shell nối stdout của lệnh trái vào stdin của lệnh phải. Nhưng lệnh phải chỉ nhận được dữ liệu nếu bản thân nó có <b>đọc stdin</b> — và rất nhiều lệnh thì không.',
        'Bash tự động biến dữ liệu bên trái thành các tham số dòng lệnh cho lệnh phải.',
        'Mọi chương trình trên Linux đều đọc stdin, nên lệnh phải luôn nhận được dữ liệu.',
        'Lệnh phải đọc dữ liệu qua một biến môi trường tên <code>$STDIN</code> do shell đặt sẵn.'
      ],
      a: 0,
      why: 'Shell chỉ làm đúng một việc: nối hai đầu dây. Nó <b>không</b> ép lệnh bên phải ' +
           'phải đọc. <code>grep</code>, <code>sort</code>, <code>wc</code>, <code>sed</code>, ' +
           '<code>awk</code>, <code>cat</code> có đọc stdin; <code>echo</code>, ' +
           '<code>rm</code>, <code>mkdir</code>, <code>kill</code>, <code>cp</code>, ' +
           '<code>touch</code> thì không — chúng chỉ nhìn vào tham số. Điều làm cho ngộ ' +
           'nhận này nguy hiểm là nó thất bại <b>im lặng</b>: <code>seq 1 5 | echo</code> in ' +
           'ra một dòng trống, mã thoát 0, không một lời cảnh báo. Cầu nối giữa hai thế giới ' +
           'là <code>xargs</code>: nó gom stdin rồi <i>gọi</i> lệnh với những dòng ấy làm ' +
           'tham số.' },

    { id: 'a3', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Cùng một bài toán viết theo hai cách: ba lệnh nối nhau qua ba file trung gian, ' +
         'hoặc một đường ống bốn tầng. Khác biệt <b>quan trọng nhất</b> khi chạy trên một ' +
         'thiết bị nhúng dùng bộ nhớ flash là gì?',
      opts: [
        'Đường ống nhanh hơn nhiều lần; tốc độ là lý do đáng kể duy nhất.',
        'Đường ống tốn ít RAM hơn, vì nó không cần bộ đệm nào cả.',
        'Cách dùng file trung gian <b>ghi hàng chục MB xuống flash</b>; đường ống ghi <b>0 byte</b>. Chênh lệch thời gian thì nhỏ đến mức không đáng nói.',
        'Không khác gì nhau — kernel tự nhận ra và chuyển file trung gian thành đường ống.'
      ],
      a: 2,
      why: 'Đo thật trên máy này, ba lần liên tiếp: 0,324/0,234/0,192 s so với ' +
           '0,316/0,211/0,181 s. Đường ống nhanh hơn từ 2,5 % tới 11 % tuỳ lần chạy — quá ' +
           'nhỏ và quá thất thường để dựa vào. Nhưng cách thứ nhất ghi <b>28 856 304 byte</b> ' +
           '≈ 27,5 MB xuống đĩa, và con số ấy <b>giống hệt nhau cả ba lần</b>, còn cách thứ ' +
           'hai ghi <b>0</b>. Mỗi khối của eMMC hay NAND chỉ chịu được vài nghìn chu kỳ ' +
           'xoá-ghi, nên số byte ấy quy thẳng ra tuổi thọ sản phẩm. Đáp án 2 sai: đường ống ' +
           '<i>có</i> bộ đệm — 65 536 byte trong kernel — nó chỉ không đặt bộ đệm ấy lên đĩa.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn cần kiểm tra xem chương trình của mình xử lý lỗi <i>hết chỗ trên đĩa</i> ra ' +
         'sao, mà không phải làm đầy ổ đĩa thật. Cho nó ghi vào file nào?',
      opts: [
        '<code>/dev/null</code>', '<code>/dev/zero</code>',
        '<code>/dev/full</code>', '<code>/dev/urandom</code>'
      ],
      a: 2,
      why: '<code>/dev/full</code> sinh ra đúng để làm việc này: mọi lần ghi vào nó đều trả ' +
           'về <code>ENOSPC</code>. Đo thật: <code>echo hi &gt; /dev/full</code> cho ' +
           '<code>bash: echo: write error: No space left on device</code> và mã thoát 1. Ba ' +
           'file kia đều <b>nuốt sạch</b> và báo thành công khi bị ghi vào; chúng chỉ khác ' +
           'nhau ở chỗ <i>đọc</i> ra gì — rỗng, byte 0 vô tận, byte ngẫu nhiên vô tận. Với ' +
           'người làm nhúng, <code>/dev/full</code> là cách rẻ nhất để tập dượt cho tình ' +
           'huống chắc chắn sẽ xảy ra trên một thẻ nhớ 4 GB.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Cú pháp <code>&lt;(lenh)</code> chạy lệnh, hứng kết quả vào một file tạm trong ' +
         '<code>/tmp</code>, đưa tên file tạm đó cho lệnh bên ngoài, rồi xoá file khi ' +
         'xong."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: <code>&lt;(lenh)</code> thật ra tạo ra cái gì, và cái tên mà ' +
          'lệnh bên ngoài nhận được trỏ tới đâu?',
      why: 'Sai — và sai ở chỗ quan trọng nhất: <b>không có file tạm nào cả</b>. Đo thật: ' +
           '<code>ls -l &lt;(echo hi)</code> cho ' +
           '<code>lr-x------ … /dev/fd/63 -&gt; pipe:[12639]</code>. Bash tạo một <b>đường ' +
           'ống</b>, gán cho nó fd 63, rồi truyền chuỗi <code>/dev/fd/63</code> vào cho ' +
           '<code>ls</code> như một tên file bình thường. Không byte nào chạm đĩa, không có ' +
           'gì để xoá. Đây là ý "mọi thứ đều là file" của Bài 5 dùng ngược lại: bất cứ dòng ' +
           'dữ liệu nào cũng có thể mang một cái tên trong hệ thống file.',
      crit: [
        'Nói rõ <b>không</b> có file tạm nào được tạo trong <code>/tmp</code> hay bất cứ đâu trên đĩa',
        'Nói cái được tạo là một <b>đường ống</b> (pipe)',
        'Nói cái tên truyền cho lệnh ngoài là <code>/dev/fd/&lt;số&gt;</code>, trỏ tới đường ống đó',
        'Nêu được lý do cú pháp này tồn tại: có lệnh (như <code>diff</code>) chỉ nhận tên file chứ không đọc stdin, và có lệnh cần <b>hai</b> nguồn cùng lúc'
      ],
      sol: '<code>&lt;(lenh)</code> tạo một <b>đường ống</b>, không tạo file. Bash chạy ' +
           '<code>lenh</code>, nối đầu ra của nó vào một đầu ống, gán đầu kia cho một file ' +
           'descriptor (thường là 63), rồi truyền chuỗi <code>/dev/fd/63</code> cho lệnh bên ' +
           'ngoài như thể đó là một tên file. Lệnh bên ngoài mở cái tên ấy và đọc bình ' +
           'thường, hoàn toàn không biết mình đang đọc một đường ống. Không có gì chạm đĩa ' +
           'và không có gì phải dọn. Cú pháp này tồn tại vì nhiều lệnh — ' +
           '<code>diff</code> là ví dụ kinh điển — chỉ nhận <b>tên file</b> và cần ' +
           '<b>hai</b> nguồn cùng lúc, thứ mà một đường ống <code>|</code> không cung cấp ' +
           'được.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"File FIFO do <code>mkfifo</code> tạo ra hiện 0 byte vì chưa ai ghi gì vào nó. ' +
         'Khi dữ liệu bắt đầu chảy qua, <code>ls -l</code> sẽ hiện đúng số byte đang nằm ' +
         'trong đó."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: vì sao một FIFO <b>luôn</b> 0 byte, và dữ liệu chảy qua nó nằm ' +
          'ở đâu?',
      why: 'Sai. FIFO <b>không bao giờ</b> có kích thước khác 0, dù có bao nhiêu dữ liệu ' +
           'đang chảy qua. Thứ nằm trên đĩa chỉ là một <b>mục trong thư mục</b> và một ' +
           'inode ghi "đây là loại p" — ' +
           '<code>prw-r--r-- 1 shinarus shinarus 0 mypipe</code>. Dữ liệu thật đi qua một bộ ' +
           'đệm trong RAM của kernel, đúng như đường ống vô danh, và biến mất ngay khi được ' +
           'đọc. Chữ <code>p</code> ở đầu dòng là loại file thứ năm bạn gặp, sau ' +
           '<code>-</code>, <code>d</code>, <code>l</code>, <code>c</code> của Bài 5 và ' +
           'Bài 8.',
      crit: [
        'Nói FIFO <b>luôn</b> 0 byte, không phải "chưa có ai ghi nên mới 0"',
        'Nói dữ liệu chảy qua một bộ đệm trong <b>RAM của kernel</b>, không nằm trên đĩa',
        'Nêu thứ thật sự nằm trên đĩa: một mục tên trong thư mục cộng một inode đánh dấu loại <code>p</code>',
        'Nêu điểm khác biệt so với <code>|</code>: FIFO có <b>tên</b> nên hai chương trình không họ hàng gì với nhau vẫn nối được'
      ],
      sol: 'Một FIFO luôn hiện 0 byte, kể cả lúc dữ liệu đang chảy qua nó. Thứ nằm trên đĩa ' +
           'chỉ là cái <b>tên</b> — một mục trong thư mục trỏ tới một inode có đánh dấu ' +
           '"loại p" — chứ không phải nội dung. Dữ liệu thật đi qua một bộ đệm trong RAM do ' +
           'kernel giữ, y hệt đường ống <code>|</code>, và biến mất khỏi bộ đệm ngay khi bên ' +
           'kia đọc xong. Khác biệt duy nhất so với <code>|</code> là FIFO có một cái tên ' +
           'trên hệ thống file, nên hai chương trình được khởi động độc lập — không phải cha ' +
           'con, không cùng một câu lệnh — vẫn tìm được nhau.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Mặc định, mã thoát của <b>cả</b> một đường ống là mã thoát của <b>tầng cuối ' +
         'cùng</b> — nên một tầng ở giữa chết mà tầng cuối chạy trót lọt thì cả câu lệnh vẫn ' +
         'báo thành công. Để đường ống trả về mã thoát khác 0 <b>cuối cùng</b> mà nó gặp, ' +
         'thay vì che đi, hãy bật <code>set -o ________</code>.',
      a: ['pipefail'],
      ph: 'một từ',
      why: 'Đo thật với một script dựng cố tình hỏng (thoát mã 2): ' +
           '<code>./build.sh 2&gt;&amp;1 | tee build.log | grep -c error</code> cho ' +
           '<code>${PIPESTATUS[@]}</code> = <b>2 0 0</b> — tầng đầu đã chết với mã 2, hai ' +
           'tầng sau thành công — và <code>$?</code> của cả ống là <b>0</b>. Bật ' +
           '<code>set -o pipefail</code> rồi chạy đúng câu ấy: <code>$?</code> thành ' +
           '<b>2</b>. Đây là dòng đầu tiên của mọi script CI đáng tin, và Bài 13 sẽ đưa nó ' +
           'vào bộ ba <code>set -euo pipefail</code>. Cách thứ hai là đọc mảng ' +
           '<code>${PIPESTATUS[@]}</code>, nhưng phải đọc <b>ngay</b> dòng liền sau — lệnh ' +
           'kế tiếp sẽ ghi đè nó.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi toán tử chuyển hướng với đúng tác dụng của nó.',
      left: [
        '<code>&gt; f</code>',
        '<code>&gt;&gt; f</code>',
        '<code>2&gt; f</code>',
        '<code>&amp;&gt; f</code>',
        '<code>&lt; f</code>',
        '<code>&gt;| f</code>'
      ],
      right: [
        'Chỉ dòng lỗi vào <b>f</b>; kết quả vẫn ra màn hình như thường',
        'Lệnh đọc dữ liệu vào từ <b>f</b> thay vì từ bàn phím',
        'Kết quả vào <b>f</b>, nội dung cũ của f bị <b>xoá sạch</b>',
        'Ghi đè <b>f</b> kể cả khi <code>noclobber</code> đang bật',
        'Kết quả <b>nối thêm</b> vào cuối f, giữ nguyên nội dung cũ',
        'Cả kết quả lẫn lỗi cùng vào <b>f</b> — viết tắt của <code>&gt; f 2&gt;&amp;1</code>'
      ],
      a: [2, 4, 0, 5, 1, 3],
      why: 'Bốn cặp dễ lẫn nhất nằm cạnh nhau ở đây. <code>&gt;</code> và ' +
           '<code>&gt;&gt;</code> chỉ khác nhau một ký tự nhưng một cái <b>huỷ</b> nội dung ' +
           'cũ còn một cái giữ — đây là lý do file log phải dùng <code>&gt;&gt;</code>. ' +
           '<code>2&gt;</code> và <code>&amp;&gt;</code> trông gần giống nhau nhưng một cái ' +
           'bắt <i>chỉ</i> lỗi, một cái bắt <i>cả hai</i>. <code>&gt;</code> và ' +
           '<code>&lt;</code> là hai chiều ngược nhau và người mới rất hay viết nhầm chiều. ' +
           'Còn <code>&gt;|</code> chỉ có ý nghĩa khi <code>noclobber</code> đang bật — nó ' +
           'là cách nói "tôi biết mình đang làm gì, cứ đè đi".' },
  ],

  /* ═══ B · Giải thích — 2 đọc output + 1 so sánh cặp + 2 vì sao + 1 bắt lỗi ═ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 9,
      q: 'Tôi có một script dựng giả, cố tình hỏng: nó in bốn dòng tiến độ ra stdout, hai ' +
         'dòng lỗi ra stderr, rồi thoát với mã 2. Đây là bốn cách lọc nó, chạy thật, kết quả ' +
         'thật. Hãy giải thích <b>từng con số</b> — vì sao 1, vì sao 0, vì sao 2 — và nói cho ' +
         'tôi biết dòng nào trong bốn dòng lệnh này là dòng nguy hiểm nhất khi đưa vào CI.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat build.sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '#!/bin/bash\n' +
                'echo "CC   main.c"\n' +
                'echo "CC   driver.c"\n' +
                'echo "main.c:14: error: expected \';\' before \'}\' token" >&2\n' +
                'echo "CC   util.c"\n' +
                'echo "make: *** [Makefile:7: main.o] Error 1" >&2\n' +
                'exit 2' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls a.txt missing.txt | wc -l\nls a.txt missing.txt |& wc -l' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: "ls: cannot access 'missing.txt': No such file or directory\n" +
                '1\n' +
                '2' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './build.sh | grep -c error\n./build.sh 2>&1 | grep -c error' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: "main.c:14: error: expected ';' before '}' token\n" +
                'make: *** [Makefile:7: main.o] Error 1\n' +
                '0\n' +
                '1' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './build.sh 2>&1 | tee build.log | grep -c error\necho "PIPESTATUS = ${PIPESTATUS[@]}"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1\n' +
                'PIPESTATUS = 2 0 0' },
        { t: 'cal', kind: 'info',
          x: '<code>|&amp;</code> là cách viết tắt của bash cho <code>2&gt;&amp;1 |</code>. ' +
             '<code>grep -c</code> đếm <b>số dòng khớp</b>, không đếm số lần chữ xuất hiện.' }
      ],
      hint: 'Đếm bằng tay xem mỗi lệnh <i>gửi được</i> mấy dòng vào ống, chứ đừng đếm mấy ' +
            'dòng bạn nhìn thấy trên màn hình. Hai thứ đó khác nhau, và đó là toàn bộ câu ' +
            'chuyện.',
      crit: [
        'Giải thích <code>wc -l</code> ra <b>1</b>: chỉ dòng <code>a.txt</code> (stdout) đi vào ống; dòng <code>cannot access</code> ở fd 2 không vào ống mà in thẳng ra terminal',
        'Giải thích <code>|&amp;</code> ra <b>2</b>: nó gộp fd 2 vào fd 1 trước, nên ống nhận cả hai dòng',
        'Giải thích <code>grep -c error</code> ra <b>0</b>: bốn dòng đi vào ống đều là dòng <code>CC</code>; hai dòng có chữ <code>error</code> nằm ở fd 2 nên grep không hề thấy chúng',
        'Nhận ra hai dòng lỗi <b>vẫn hiện trên màn hình</b> ở lệnh đó — chúng chưa mất đi, chỉ là không đi qua ống',
        'Giải thích <code>2&gt;&amp;1 | grep -c error</code> ra <b>1</b> chứ không phải 2: chỉ một trong hai dòng lỗi có chữ <code>error</code> (dòng kia là <code>Error</code> viết hoa)',
        'Đọc <code>PIPESTATUS = 2 0 0</code>: tầng đầu chết mã 2, hai tầng sau thành công',
        'Chỉ ra dòng nguy hiểm nhất là <code>./build.sh | grep -c error</code> — nó báo "0 lỗi" trên một bản dựng hỏng, tức là <b>sai một cách yên lặng</b>'
      ],
      sol: '<p><b>1 và 2.</b> <code>ls a.txt missing.txt</code> in hai thứ ra hai đường khác ' +
           'nhau: tên file tìm thấy ra fd 1, câu <code>cannot access</code> ra fd 2. Dấu ' +
           '<code>|</code> chỉ nối fd 1, nên <code>wc -l</code> nhận đúng <b>một</b> dòng. ' +
           'Câu lỗi vẫn hiện trên màn hình — bạn thấy nó ngay phía trên số 1 — vì fd 2 của ' +
           'nó vẫn trỏ vào terminal. Đổi sang <code>|&amp;</code>, bash gộp fd 2 vào fd 1 ' +
           '<i>trước khi</i> nối ống, nên <code>wc -l</code> nhận <b>hai</b> dòng.</p>' +
           '<p><b>Số 0 là con số đáng sợ nhất trong cả bộ bài tập này.</b> ' +
           '<code>./build.sh | grep -c error</code> cho <b>0</b> trên một bản dựng hỏng thật. ' +
           'Bốn dòng lọt vào ống đều là <code>CC main.c</code>, <code>CC driver.c</code>, ' +
           '<code>CC util.c</code> — không dòng nào chứa chữ <code>error</code>. Hai dòng ' +
           'thật sự báo lỗi đi ở fd 2, vòng qua ống, rơi thẳng ra terminal. Nếu bạn đọc số 0 ' +
           'ấy trong một script CI, bạn vừa kết luận "không có lỗi" về đúng cái bản dựng vừa ' +
           'chết.</p>' +
           '<p><b>Vì sao 1 chứ không phải 2.</b> Thêm <code>2&gt;&amp;1</code> thì cả sáu ' +
           'dòng vào ống, nhưng <code>grep -c error</code> vẫn chỉ đếm được <b>1</b>: dòng ' +
           'thứ hai viết <code>Error 1</code> — chữ <b>E</b> hoa. grep phân biệt hoa thường ' +
           'trừ khi có <code>-i</code>. Chi tiết này đáng nhớ hơn nó có vẻ, vì nó là kiểu bẫy ' +
           'thứ hai chồng lên kiểu bẫy thứ nhất.</p>' +
           '<p><b><code>PIPESTATUS = 2 0 0</code></b> đọc từ trái sang phải theo đúng thứ tự ' +
           'các tầng: <code>build.sh</code> thoát <b>2</b>, <code>tee</code> thoát 0, ' +
           '<code>grep</code> thoát 0. Cả đường ống trả về mã thoát của tầng cuối, tức ' +
           '<b>0</b> — thành công. Một script CI viết như thế sẽ báo xanh trên một bản dựng ' +
           'hỏng, vì hai lý do độc lập cùng lúc: ống không mang lỗi, và mã thoát không mang ' +
           'lỗi.</p>' +
           '<p><b>Cách viết đúng</b> gộp cả hai bản vá: ' +
           '<code>set -o pipefail</code> rồi ' +
           '<code>./build.sh 2&gt;&amp;1 | tee build.log</code>.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 8,
      q: 'Ba lệnh dưới đây đều có dấu <code>|</code>, đều chạy xong, và <b>không lệnh nào ' +
         'báo rằng nó không nhận được dữ liệu</b>. Nhưng chỉ một trong ba làm đúng việc bạn ' +
         'muốn. Hãy nói rõ mỗi lệnh thực sự đã làm gì, và vì sao hai lệnh đầu thất bại theo ' +
         'hai kiểu <i>khác nhau</i>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'seq 1 5 | echo\necho "[het lenh 1]"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '\n[het lenh 1]' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'touch junk.txt\necho junk.txt | rm\necho "rc_rm=$?"\nls junk.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rm: missing operand\n' +
                "Try 'rm --help' for more information.\n" +
                'rc_rm=1\n' +
                'junk.txt' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'echo junk.txt | xargs rm\necho "rc_xargs=$?"\nls junk.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc_xargs=0\n' +
                "ls: cannot access 'junk.txt': No such file or directory" },
      ],
      hint: 'Lệnh đầu tiên in ra một dòng trống rồi thoát với mã 0. Hãy hỏi: dòng trống đó ở ' +
            'đâu ra, và năm con số kia đi đâu mất?',
      crit: [
        'Nói <code>echo</code> <b>không đọc stdin</b> — nó chỉ in các <b>tham số</b> của nó, mà ở đây nó không có tham số nào, nên in một dòng trống',
        'Nói năm dòng do <code>seq</code> sinh ra đã đi vào ống rồi bị <b>vứt bỏ</b> khi echo thoát mà không đọc',
        'Chỉ ra kiểu thất bại của lệnh 1 là <b>im lặng</b>: mã thoát 0, không thông báo gì',
        'Nói <code>rm</code> cũng không đọc stdin, nhưng nó <b>bắt buộc</b> phải có tham số nên còn kêu lên được <code>missing operand</code> và trả mã 1',
        'Nêu <code>xargs</code> làm gì khác hai lệnh kia: nó <b>đọc</b> stdin, rồi <b>gọi</b> <code>rm</code> với những dòng đọc được đặt vào vị trí tham số',
        'Rút ra quy tắc dùng được: lệnh nhận dữ liệu qua <b>stdin</b> thì nối thẳng bằng <code>|</code>; lệnh chỉ nhận <b>tham số</b> thì phải chèn <code>xargs</code>'
      ],
      sol: '<p><b>Lệnh 1 — thất bại im lặng, kiểu nguy hiểm nhất.</b> ' +
           '<code>echo</code> không bao giờ đọc stdin; nó in ra những gì nằm trong ' +
           '<code>argv</code> của nó. Ở đây <code>argv</code> rỗng, nên nó in một dòng trống ' +
           'và thoát <b>0</b>. Shell vẫn dựng ống đàng hoàng, <code>seq</code> vẫn viết năm ' +
           'dòng vào đó, và năm dòng ấy bị vứt đi khi echo đóng đầu đọc. Không thông báo, ' +
           'không mã lỗi, không dấu vết. Đây là lý do trục này quan trọng: bạn sẽ không được ' +
           'báo động.</p>' +
           '<p><b>Lệnh 2 — thất bại ồn ào.</b> <code>rm</code> cũng không đọc stdin, nhưng ' +
           'khác <code>echo</code> ở chỗ nó <i>không thể</i> làm gì khi thiếu tham số, nên nó ' +
           'kêu <code>missing operand</code> và trả mã <b>1</b>. Và ' +
           '<code>ls junk.txt</code> chứng minh file vẫn còn nguyên. Cùng một ngộ nhận, hai ' +
           'kiểu hậu quả — cái ồn ào thực ra là cái may mắn.</p>' +
           '<p><b>Lệnh 3 — cây cầu.</b> <code>xargs</code> là một trong số ít lệnh sinh ra ' +
           'để đứng giữa hai thế giới: nó <b>đọc</b> stdin, cắt thành từng mục theo khoảng ' +
           'trắng và xuống dòng, rồi <b>chạy</b> <code>rm junk.txt</code> — tức là biến dòng ' +
           'chảy thành tham số. <code>rc_xargs=0</code> và ' +
           '<code>ls: cannot access</code> xác nhận file đã bị xoá thật.</p>' +
           '<p><b>Cách kiểm tra trước khi viết:</b> hỏi <code>man</code> xem lệnh có đọc ' +
           'stdin không, hoặc thử chạy nó một mình không tham số — nếu nó ngồi im chờ bạn gõ, ' +
           'nó đọc stdin; nếu nó thoát ngay hoặc kêu thiếu tham số, nó không đọc, và bạn cần ' +
           '<code>xargs</code>.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'So sánh cặp', rows: 9,
      q: 'Cùng một bài toán, hai cách viết, đo <b>ba lần liên tiếp</b> trong cùng một phiên ' +
         'làm việc. Nhìn kỹ hai loại đại lượng trong bảng này và trả lời: đại lượng nào ' +
         '<b>lặp lại được</b>, đại lượng nào không, và vì sao người ta lại hay viện dẫn đúng ' +
         'cái không lặp lại được?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# cach 1 — ba file trung gian\n' +
                'time ( seq 1 2000000 > t1.txt\n' +
                '       grep 7 t1.txt > t2.txt\n' +
                '       sort -rn t2.txt > t3.txt\n' +
                '       wc -l < t3.txt )\n' +
                'stat -c \'%s  %n\' t1.txt t2.txt t3.txt\n\n' +
                '# cach 2 — mot duong ong\n' +
                'time ( seq 1 2000000 | grep 7 | sort -rn | wc -l )' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'lan 1   cach 1: real 0m0.324s      cach 2: real 0m0.316s\n' +
                'lan 2   cach 1: real 0m0.234s      cach 2: real 0m0.211s\n' +
                'lan 3   cach 1: real 0m0.192s      cach 2: real 0m0.181s\n' +
                '\n' +
                'so byte ghi xuong dia, ca ba lan giong het nhau:\n' +
                '  14888896  t1.txt\n' +
                '   6983704  t2.txt\n' +
                '   6983704  t3.txt\n' +
                '  --------\n' +
                '  28856304  tong cong   (cach 2 ghi 0 byte)' },
        { t: 'cal', kind: 'info',
          x: 'Cả ba lần đều cho cùng một kết quả tính toán: <code>937118</code>. Hai cách ' +
             'viết làm đúng một việc như nhau.' }
      ],
      hint: 'Tính phần trăm chênh lệch thời gian của từng lần: 2,5 %, 11 %, 6 %. Rồi so ba ' +
            'con số ấy với nhau chứ đừng so với 0.',
      crit: [
        'Chỉ ra thời gian <b>không lặp lại</b>: chênh lệch nhảy từ 2,5 % tới 11 % rồi về 6 %, và cả hai cột đều <b>trôi dần xuống</b> qua ba lần chạy',
        'Nêu được lý do trôi xuống: lần đầu đọc từ đĩa, những lần sau dữ liệu đã nằm sẵn trong <b>page cache</b> của kernel — nên phép đo đang đo trạng thái cache nhiều hơn đo hai cách viết',
        'Chỉ ra số byte <b>lặp lại chính xác tuyệt đối</b>: 28 856 304 byte, cả ba lần, không lệch một byte — vì nó do kích thước dữ liệu quyết định, không do máy hay thời điểm',
        'Kết luận đúng chiều: lý do dùng đường ống <b>không phải</b> tốc độ, mà là 28 856 304 byte so với 0',
        'Giải thích vì sao người ta hay viện dẫn thời gian: nó dễ đo, dễ thấy, và một lần đo nguội so với một lần đo ấm cho ra tỷ số nghe rất kêu',
        'Chuyển sang bối cảnh nhúng: trên eMMC/NAND số byte ghi là <b>tuổi thọ</b>, còn 0,02 giây thì không ai để ý'
      ],
      sol: '<p><b>Đại lượng không lặp lại được: thời gian.</b> Ba lần đo cho ba tỷ lệ khác ' +
           'nhau — 2,5 %, 11 %, 6 % — và quan trọng hơn, <i>cả hai cột đều trôi xuống</i>: ' +
           '0,324 → 0,234 → 0,192 và 0,316 → 0,211 → 0,181. Thứ đang thay đổi giữa các lần ' +
           'chạy không phải hai cách viết, mà là <b>page cache</b>: lần đầu kernel phải đọc ' +
           'từ đĩa, những lần sau dữ liệu đã nằm sẵn trong RAM. Phép đo này đo cache nhiều ' +
           'hơn đo cái nó tưởng đang đo.</p>' +
           '<p><b>Đại lượng lặp lại tuyệt đối: số byte.</b> ' +
           '<code>14888896 + 6983704 + 6983704 = 28856304</code>, giống hệt cả ba lần, không ' +
           'lệch một byte — vì nó là hàm của dữ liệu, không phải hàm của máy hay thời điểm. ' +
           'Đường ống ghi <b>0</b>. Đó là một sự thật, không phải một phép đo.</p>' +
           '<p><b>Vì sao người ta viện dẫn nhầm.</b> Thời gian dễ đo và dễ kể. Nếu bạn chạy ' +
           'cách 1 một lần (nguội, 0,324 s) rồi chạy cách 2 ngay sau đó (ấm, 0,232 s), bạn ra ' +
           '"nhanh hơn 1,4 lần" — một con số nghe rất thuyết phục mà không lần chạy công bằng ' +
           'nào tái lập được. Bài học chung: <b>so hai thứ ở cùng một trạng thái</b>, và chạy ' +
           'lại ít nhất ba lần trước khi tin.</p>' +
           '<p><b>Vì sao vẫn phải dùng đường ống.</b> Lý do không hề mất đi khi con số thời ' +
           'gian tan biến — nó chỉ đổi tên. Trên thiết bị nhúng, 27,5 MB ghi thừa cho <i>một ' +
           'lần</i> chạy, nhân với một script chạy mỗi phút, là hàng chục GB mỗi ngày trên ' +
           'một con chip chịu được vài nghìn chu kỳ ghi mỗi khối. Đường ống không nhanh hơn ' +
           'đáng kể; nó <b>không ăn mòn phần cứng</b>. Và nó cũng không cần chỗ trống trên ' +
           'một rootfs chỉ có vài chục MB.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 7,
      q: 'Trước khi chương trình của bạn chạy được một dòng lệnh nào, việc chuyển hướng đã ' +
         'xong từ lâu — <b>shell</b> làm nó, không phải chương trình. Hãy giải thích cơ chế ' +
         'đó theo trình tự <code>fork</code> → mở file → <code>exec</code>, rồi rút ra ' +
         '<b>hai</b> hệ quả mà một người không biết cơ chế sẽ không đoán được.',
      hint: 'Mấu chốt: giữa <code>fork</code> và <code>exec</code> có một khoảng thời gian, ' +
            'và mọi chuyển hướng xảy ra trong khoảng đó. Chương trình sinh ra đã thấy fd 1 ' +
            'trỏ sẵn vào chỗ mới.',
      crit: [
        'Kể đúng trình tự: shell <code>fork</code> ra tiến trình con → tiến trình con <b>mở file</b> và gắn vào fd tương ứng → rồi mới <code>exec</code> chương trình',
        'Nói rõ chương trình được nạp <b>sau</b> khi fd đã bị đổi, nên nó hoàn toàn không biết mình đang ghi vào file hay ra terminal',
        'Hệ quả 1: với <code>&gt;</code>, file bị <b>cắt về 0 byte ngay lúc mở</b> — trước khi chương trình chạy. Nên <code>grep x f &gt; f</code> làm mất sạch f',
        'Hệ quả 2: <code>sudo</code> chỉ nâng quyền cho <b>chương trình</b>, còn việc mở file để chuyển hướng do <b>shell</b> làm với quyền người dùng thường — nên <code>sudo lenh &gt; /etc/f</code> vẫn bị từ chối',
        'Nêu cách sửa hệ quả 2 (chuyển việc ghi cho một chương trình chạy dưới sudo, ví dụ <code>| sudo tee</code>) hoặc cách sửa hệ quả 1 (ghi ra file tạm rồi <code>mv</code>)',
        'Nêu được lợi ích của thiết kế này: chương trình không cần biết gì về chuyển hướng, nên <b>mọi</b> chương trình đều chuyển hướng được mà không phải viết thêm một dòng mã nào'
      ],
      sol: '<p><b>Trình tự.</b> Khi bạn gõ <code>lenh &gt; out.txt</code>, shell ' +
           '<code>fork</code> ra một tiến trình con. Tiến trình con ấy — vẫn còn là bản sao ' +
           'của shell, chưa phải <code>lenh</code> — <b>mở</b> <code>out.txt</code>, rồi đặt ' +
           'file vừa mở vào đúng vị trí fd 1. Chỉ sau khi mọi chuyển hướng đã xếp chỗ xong, ' +
           'nó mới gọi <code>exec</code> để nạp <code>lenh</code> đè lên chính mình. Chương ' +
           'trình mở mắt ra đã thấy fd 1 trỏ vào file, và nó không có cách nào biết điều đó — ' +
           'nó chỉ ghi vào fd 1 như mọi khi.</p>' +
           '<p><b>Hệ quả 1: file bị xoá trước khi ai kịp đọc nó.</b> Mở bằng ' +
           '<code>&gt;</code> nghĩa là mở với cờ <i>truncate</i>: nội dung cũ biến mất ngay ' +
           'tại thời điểm mở, tức là <i>trước</i> khi chương trình chạy. Vì thế ' +
           '<code>grep pattern f &gt; f</code> không lọc file mà <b>huỷ</b> nó: shell cắt ' +
           '<code>f</code> về 0 byte, rồi grep mới được nạp và mở một file rỗng để đọc. Muốn ' +
           'lọc tại chỗ thì phải qua file tạm: ' +
           '<code>grep pattern f &gt; f.tmp &amp;&amp; mv f.tmp f</code>.</p>' +
           '<p><b>Hệ quả 2: sudo không với tới được chỗ ấy.</b> Trong ' +
           '<code>sudo lenh &gt; /etc/config</code>, chữ <code>sudo</code> chỉ áp dụng cho ' +
           '<code>lenh</code>. Việc mở <code>/etc/config</code> do <b>shell của bạn</b> làm, ' +
           'với uid thường của bạn, và nó xảy ra <i>trước</i> khi sudo kịp nâng quyền cho bất ' +
           'cứ thứ gì. Kết quả là <code>Permission denied</code>, và người mới thường kết ' +
           'luận nhầm rằng sudo hỏng. Cách đi vòng là giao việc <i>ghi</i> cho một chương ' +
           'trình chạy dưới sudo: <code>lenh | sudo tee /etc/config</code>.</p>' +
           '<p><b>Vì sao thiết kế như vậy lại đáng giá.</b> Vì nó tách bạch triệt để: chương ' +
           'trình chỉ biết đọc fd 0 và ghi fd 1, còn <i>fd ấy nối vào đâu</i> là chuyện của ' +
           'người gọi. Nhờ thế mọi chương trình từng viết ra — kể cả những cái viết trước khi ' +
           'bạn sinh ra — đều chuyển hướng được, ghép ống được, mà không ai phải sửa một dòng ' +
           'mã nào. Đây chính là nền móng của cả triết lý Unix.</p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: 'Hai dòng dưới đây chỉ khác nhau ở thứ tự, và chúng cho hai kết quả hoàn toàn khác ' +
         'nhau. Hãy giải thích <b>vì sao</b> thứ tự lại quan trọng — nói cho đúng cái mà ' +
         '<code>2&gt;&amp;1</code> thực sự làm.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './build.sh > run.log 2>&1     # ca hai vao run.log\n' +
                './build.sh 2>&1 > run.log     # loi van ra man hinh' },
        { t: 'cal', kind: 'info',
          x: 'Gợi ý đọc: <code>2&gt;&amp;1</code> hãy đọc thành "cho fd 2 trỏ vào <b>chỗ mà ' +
             'fd 1 đang trỏ tới lúc này</b>", chứ đừng đọc thành "nối fd 2 vào fd 1".' }
      ],
      hint: 'Shell xử lý các chuyển hướng theo thứ tự từ trái sang phải. Hãy vẽ ra fd 1 và ' +
            'fd 2 đang trỏ vào đâu sau <b>từng</b> bước.',
      crit: [
        'Nói rõ shell xử lý chuyển hướng <b>từ trái sang phải</b>',
        'Mô tả đúng <code>2&gt;&amp;1</code>: nó <b>chép</b> chỗ-đang-trỏ của fd 1 sang fd 2 — một <b>bản chụp</b> tại thời điểm đó, không phải một sợi dây nối vĩnh viễn',
        'Lần vết dòng 1: <code>&gt; run.log</code> làm fd 1 trỏ vào file, rồi <code>2&gt;&amp;1</code> chép chỗ ấy sang fd 2 → cả hai vào file',
        'Lần vết dòng 2: <code>2&gt;&amp;1</code> chép chỗ hiện tại của fd 1 (vẫn là <b>terminal</b>) sang fd 2, rồi <code>&gt; run.log</code> mới đổi fd 1 → fd 2 ở lại terminal',
        'Nêu hệ quả với đường ống: <code>lenh 2&gt;&amp;1 | grep</code> đúng, còn <code>lenh | grep 2&gt;&amp;1</code> thì không làm điều bạn muốn'
      ],
      sol: '<p><b>Điều <code>2&gt;&amp;1</code> thực sự làm.</b> Nó <b>không</b> nối fd 2 vào ' +
           'fd 2 vĩnh viễn. Nó chép <i>giá trị hiện tại</i> của fd 1 — tức là "fd 1 đang trỏ ' +
           'vào đâu <b>ngay lúc này</b>" — sang fd 2. Một bản chụp. Sau đó fd 1 có đổi đi đâu ' +
           'thì fd 2 cũng không đổi theo.</p>' +
           '<p><b>Dòng 1: <code>&gt; run.log 2&gt;&amp;1</code>.</b> Bước một, ' +
           '<code>&gt; run.log</code> làm fd 1 trỏ vào file. Bước hai, ' +
           '<code>2&gt;&amp;1</code> chụp lấy chỗ fd 1 đang trỏ — chính là file — và cho fd 2 ' +
           'trỏ vào đó. Kết quả: <b>cả hai</b> chảy vào <code>run.log</code>.</p>' +
           '<p><b>Dòng 2: <code>2&gt;&amp;1 &gt; run.log</code>.</b> Bước một, ' +
           '<code>2&gt;&amp;1</code> chụp lấy chỗ fd 1 đang trỏ — lúc này fd 1 <i>vẫn là ' +
           'terminal</i>, vì chưa có chuyển hướng nào xảy ra — nên fd 2 trỏ vào terminal. ' +
           'Bước hai, <code>&gt; run.log</code> đổi fd 1 sang file. Nhưng fd 2 giữ nguyên bản ' +
           'chụp cũ. Kết quả: kết quả vào file, <b>lỗi vẫn ra màn hình</b>. Nghịch lý ở chỗ ' +
           'nó trông giống hệt dòng 1 nếu bạn đọc <code>2&gt;&amp;1</code> là "gộp hai luồng ' +
           'lại".</p>' +
           '<p><b>Quy tắc để nhớ:</b> đổi fd 1 trước, chụp sang fd 2 sau. Với đường ống thì ' +
           'ngược lại về hình thức nhưng cùng một nguyên tắc — ống thay fd 1 <i>trước</i> khi ' +
           'các chuyển hướng của tầng ấy chạy, nên <code>lenh 2&gt;&amp;1 | grep</code> mới ' +
           'là dạng đúng.</p>' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ: <i>"Here-doc chỉ là cách nhét văn bản ' +
         'vào stdin cho tiện, khỏi phải tạo file. Viết <code>&lt;&lt;EOF</code> hay ' +
         '<code>&lt;&lt;\'EOF\'</code> đều như nhau, dấu nháy chỉ cho dễ đọc thôi."</i> Câu ' +
         'này sai ở đâu? Chỉ ra chỗ sai và nêu một tình huống mà cái sai ấy gây hậu quả thật.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'NAME="shinarus"\n' +
                'cat <<EOF > with-subst.txt\n' +
                'PATH=$PATH:/opt/bin\n' +
                'hello $NAME\n' +
                'EOF\n' +
                "cat <<'EOF' > no-subst.txt\n" +
                'PATH=$PATH:/opt/bin\n' +
                'hello $NAME\n' +
                'EOF\n' +
                'head -c 130 with-subst.txt; echo\n' +
                'cat no-subst.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:' +
                '/usr/local/games:/usr/lib/wsl/lib:/mnt/c/Users/DELL/b\n' +
                'PATH=$PATH:/opt/bin\n' +
                'hello $NAME' },
        { t: 'cal', kind: 'info',
          x: 'Dòng đầu bị cắt ở 130 byte cho vừa màn hình — thực tế nó còn dài hơn nhiều.' }
      ],
      hint: 'Đọc kỹ file thứ nhất: chữ <code>$PATH</code> có còn trong đó không?',
      crit: [
        'Chỉ ra chỗ sai: hai dạng <b>không</b> như nhau, và dấu nháy <b>không</b> phải để cho dễ đọc',
        'Nói đúng khác biệt: <code>&lt;&lt;EOF</code> cho shell <b>thay biến</b> và chạy <code>$(...)</code> bên trong; <code>&lt;&lt;\'EOF\'</code> giữ nguyên từng ký tự',
        'Đọc được bằng chứng trong output: file thứ nhất chứa PATH đã bị bung ra thành một chuỗi dài, file thứ hai vẫn giữ nguyên chữ <code>$PATH</code> và <code>$NAME</code>',
        'Nêu một tình huống hậu quả thật — ví dụ sinh file cấu hình, script khởi động hay Dockerfile có chứa <code>$VAR</code> mà bạn muốn <b>giữ nguyên</b> để chạy trên máy đích',
        'Nêu cách chọn: cần chèn giá trị từ máy đang chạy thì dùng <code>&lt;&lt;EOF</code>; cần chép văn bản y nguyên thì dùng <code>&lt;&lt;\'EOF\'</code>'
      ],
      sol: '<p><b>Chỗ sai.</b> Dấu nháy quanh <code>EOF</code> đổi hẳn ý nghĩa của khối văn ' +
           'bản, không liên quan gì tới thẩm mỹ. Không nháy, shell coi nội dung như một chuỗi ' +
           'trong ngoặc kép: nó thay mọi <code>$BIEN</code> bằng giá trị và chạy mọi ' +
           '<code>$(lenh)</code>. Có nháy, shell coi nội dung là văn bản chết và chép nguyên ' +
           'từng ký tự.</p>' +
           '<p><b>Bằng chứng ngay trong output.</b> <code>with-subst.txt</code> mở đầu bằng ' +
           '<code>PATH=/usr/local/sbin:/usr/local/bin:…</code> — chữ <code>$PATH</code> đã bị ' +
           'thay bằng biến PATH <i>của máy đang chạy script</i>, dài hơn 130 byte. ' +
           '<code>no-subst.txt</code> thì vẫn đúng hai dòng bạn gõ: ' +
           '<code>PATH=$PATH:/opt/bin</code> và <code>hello $NAME</code>.</p>' +
           '<p><b>Hậu quả thật.</b> Giả sử bạn sinh một script khởi động cho board ARM và ' +
           'trong đó có dòng <code>export PATH=$PATH:/opt/app/bin</code>. Nếu bạn dùng ' +
           '<code>&lt;&lt;EOF</code>, cái ghi xuống board sẽ là PATH của <b>máy build</b> — ' +
           'đầy những <code>/mnt/c/Users/DELL/...</code> vô nghĩa trên board, và biến PATH ' +
           'thật của board bị đè mất. Board sẽ khởi động rồi không tìm thấy lệnh nào. Cùng ' +
           'kiểu lỗi ấy xảy ra với file cấu hình systemd, Dockerfile, template nginx — bất cứ ' +
           'chỗ nào <code>$</code> phải sống sót tới máy đích.</p>' +
           '<p><b>Cách chọn:</b> muốn chèn giá trị của máy đang chạy thì để trần ' +
           '<code>&lt;&lt;EOF</code>; muốn chép y nguyên thì nháy ' +
           '<code>&lt;&lt;\'EOF\'</code>. Khi phân vân, chọn dạng có nháy — nó không bao giờ ' +
           'làm bạn bất ngờ.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán ═══════ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 9,
      q: 'Một thiết bị đã bán ra chạy <code>backup.sh</code> mỗi đêm qua cron. Ba tuần liền ' +
         '<code>/var/log/backup.log</code> đêm nào cũng đẹp đẽ, dòng cuối luôn là ' +
         '<code>[backup] done</code>. Hôm nay khách báo mất dữ liệu, và hoá ra bản sao lưu ' +
         'đã hỏng từ tuần đầu. Nhóm trực đã thử ba dòng cron dưới đây; <b>cả ba đều để lọt ' +
         'thông báo lỗi</b>. Hãy giải thích từng dòng hỏng ở đâu, rồi viết dòng đúng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# dong 1 — ban dau\n' +
                '0 2 * * *  /opt/backup.sh > /var/log/backup.log\n\n' +
                '# dong 2 — "sua" lan mot: dung tee de vua xem vua luu\n' +
                '0 2 * * *  /opt/backup.sh | tee /var/log/backup.log\n\n' +
                '# dong 3 — "sua" lan hai: them mot tang loc\n' +
                '0 2 * * *  /opt/backup.sh | grep -v DEBUG > /var/log/backup.log' },
        { t: 'cal', kind: 'info',
          x: '<code>backup.sh</code> in tiến độ ra stdout và mọi thông báo lỗi ra stderr — ' +
             'đúng quy ước Unix. Nó cũng trả về mã thoát khác 0 khi hỏng.' }
      ],
      hint: 'Ba dòng trông rất khác nhau nhưng hỏng vì <b>cùng một</b> lý do. Hỏi ở mỗi ' +
            'dòng: fd 2 của <code>backup.sh</code> cuối cùng trỏ vào đâu?',
      crit: [
        'Chỉ ra lý do chung: cả <code>&gt;</code> lẫn <code>|</code> đều chỉ động tới <b>fd 1</b>; fd 2 của <code>backup.sh</code> không bị đụng tới trong cả ba dòng',
        'Dòng 1: chỉ stdout vào file; stderr đi đường khác',
        'Dòng 2: <code>tee</code> chỉ ghi được những gì <b>đi qua ống</b>, mà ống không mang fd 2 — nên tee không cứu được gì',
        'Dòng 3: thêm <code>grep -v</code> cũng vậy, và tệ hơn — nó còn nuốt luôn mã thoát của <code>backup.sh</code>',
        'Nói rõ dưới cron thì stderr <b>không</b> hiện ra màn hình nào cả: cron gom nó lại và gửi mail nội bộ, mà trên thiết bị nhúng thường không có ai đọc — nên lỗi biến mất hoàn toàn',
        'Viết được dòng đúng, có <code>2&gt;&amp;1</code> đặt <b>sau</b> phần chuyển hướng stdout',
        'Nêu thêm việc phải ghi lại <b>mã thoát</b>, vì log đẹp không chứng minh được thành công'
      ],
      sol: '<p><b>Cả ba hỏng vì cùng một lý do.</b> <code>&gt;</code> đổi chỗ của fd 1. ' +
           '<code>|</code> cũng chỉ đổi chỗ của fd 1. Không dòng nào trong ba dòng đụng tới ' +
           'fd 2, nên mọi thông báo lỗi của <code>backup.sh</code> vẫn đi con đường riêng của ' +
           'nó, hoàn toàn không dính dáng gì tới <code>/var/log/backup.log</code>.</p>' +
           '<p><b>Vì sao dòng 2 nhìn "chắc ăn" mà vẫn hỏng.</b> <code>tee</code> mang tiếng ' +
           'là "ghi lại mọi thứ", nhưng nó chỉ ghi được cái <i>đi qua nó</i>, mà cái đi qua ' +
           'nó là nội dung của ống, mà ống thì chỉ mang fd 1. tee không có cách nào nhìn thấy ' +
           'stderr của tầng trước.</p>' +
           '<p><b>Dòng 3 tệ hơn cả hai dòng kia.</b> Nó vẫn để lọt stderr, và còn thêm một ' +
           'khuyết tật nữa: mã thoát của cả đường ống bây giờ là mã thoát của ' +
           '<code>grep</code>. <code>backup.sh</code> có chết với mã 1 thì cron vẫn thấy 0. ' +
           'Hai lớp che lỗi chồng lên nhau.</p>' +
           '<p><b>Vì sao ba tuần không ai biết.</b> Ở terminal, stderr rơi ra màn hình nên ' +
           'bạn vẫn <i>nhìn thấy</i> lỗi — đó là cái làm người ta chủ quan. Dưới <b>cron</b> ' +
           'thì không có màn hình: cron gom stderr lại rồi gửi mail cho chủ job. Trên một ' +
           'thiết bị nhúng không cấu hình MTA, cái mail ấy rơi vào hư không. Lỗi không bị ẩn ' +
           'đi — nó bị <b>gửi tới một nơi không tồn tại</b>.</p>' +
           '<p><b>Dòng đúng:</b></p>' +
           '<p><code>0 2 * * * /opt/backup.sh &gt;&gt; /var/log/backup.log 2&gt;&amp;1 || ' +
           'echo "[backup] FAILED rc=$?" &gt;&gt; /var/log/backup.log</code></p>' +
           '<p>Ba chi tiết đáng nói: <code>2&gt;&amp;1</code> đặt <b>sau</b> ' +
           '<code>&gt;&gt;</code> (xem lại B5 nếu bạn chưa chắc về thứ tự); ' +
           '<code>&gt;&gt;</code> thay vì <code>&gt;</code> để không xoá lịch sử mỗi đêm; và ' +
           'quan trọng nhất là ghi lại <b>mã thoát</b>. Một file log không có lỗi không chứng ' +
           'minh được rằng công việc đã thành công — nó chỉ chứng minh rằng không có gì được ' +
           'ghi vào file ấy.</p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', rows: 8,
      q: 'Một pipeline CI vừa được siết lại: người ta thêm <code>set -o pipefail</code> vào ' +
         'đầu mọi script cho an toàn. Ngay hôm sau, bước lấy mẫu log bắt đầu <b>hỏng mỗi ' +
         'lần chạy</b> với mã thoát 141 — trong khi file <code>sample.txt</code> nó tạo ra ' +
         'thì hoàn toàn đúng. Đây là số đo thật. Hãy giải thích 141 từ đâu ra, vì sao nó chỉ ' +
         'xuất hiện sau khi bật pipefail, và đề xuất cách sửa.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls -l huge.log.gz\n' +
                'zcat huge.log.gz | head -3 > sample.txt\n' +
                'echo "rc=$?  PIPESTATUS=${PIPESTATUS[@]}"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '-rw-r--r-- 1 shinarus shinarus 7918982 Aug 15 16:30 huge.log.gz\n' +
                'rc=0  PIPESTATUS=141 0' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'set -o pipefail\nzcat huge.log.gz | head -3 > sample.txt\n' +
                'echo "rc=$?  PIPESTATUS=${PIPESTATUS[@]}"\ncat sample.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc=141  PIPESTATUS=141 0\n' +
                '2026-08-15 sensor 1\n' +
                '2026-08-15 sensor 2\n' +
                '2026-08-15 sensor 3' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'kill -l 13' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'PIPE' },
      ],
      hint: 'Tách 141 thành <code>128 + 13</code>. Rồi hỏi: ai giết <code>zcat</code>, và tại ' +
            'sao việc giết nó lại là chuyện <b>bình thường</b> chứ không phải sự cố.',
      crit: [
        'Tách đúng: <code>141 = 128 + 13</code>, và 13 là <code>SIGPIPE</code> — xác nhận bằng <code>kill -l 13</code> → <code>PIPE</code>',
        'Kể đúng chuỗi sự kiện: <code>head -3</code> lấy đủ ba dòng rồi <b>đóng đầu đọc</b> của ống và thoát',
        'Nói kernel gửi <code>SIGPIPE</code> cho <code>zcat</code> khi nó ghi vào một cái ống không còn ai đọc, và <code>zcat</code> chết vì tín hiệu đó',
        'Chỉ ra <code>PIPESTATUS=141 0</code> có <b>trước</b> khi bật pipefail — hành vi không hề đổi, chỉ có việc <b>báo cáo</b> là đổi',
        'Nói rõ đây là cơ chế <b>đúng như thiết kế</b>, chính là thứ làm cho <code>| head</code> không phải đọc hết 76 MB',
        'Đề xuất một cách sửa dùng được — ví dụ cho tầng cuối đọc hết dữ liệu, hoặc chấp nhận riêng mã 141 ở bước này thay vì bỏ pipefail toàn cục'
      ],
      sol: '<p><b>141 là gì.</b> Khi một tiến trình chết vì tín hiệu, shell báo mã thoát ' +
           '<code>128 + số hiệu tín hiệu</code>. <code>141 − 128 = 13</code>, và ' +
           '<code>kill -l 13</code> trả lời <code>PIPE</code>. Vậy <code>zcat</code> bị giết ' +
           'bởi <b>SIGPIPE</b>.</p>' +
           '<p><b>Ai giết nó, và vì sao đó là chuyện tốt.</b> <code>head -3</code> đọc đủ ba ' +
           'dòng thì xong việc: nó thoát và đóng đầu đọc của ống. <code>zcat</code> lúc ấy ' +
           'mới giải nén được vài chục KB trong tổng số 76 MB và vẫn đang hí hoáy ghi tiếp. ' +
           'Ghi vào một cái ống không còn ai đọc là vô nghĩa, nên kernel bắn ' +
           '<code>SIGPIPE</code> để dừng nó lại ngay. Đây chính xác là cơ chế làm cho ' +
           '<code>| head</code> trả lời tức thì trên một file khổng lồ thay vì phải giải nén ' +
           'hết. Nếu <b>không</b> có nó, bước CI này sẽ ngốn 76 MB công giải nén mỗi lần chạy ' +
           'chỉ để lấy ba dòng.</p>' +
           '<p><b>Vì sao chỉ lộ ra sau khi bật pipefail.</b> Hãy nhìn dòng đầu: ' +
           '<code>PIPESTATUS=141 0</code> đã có <b>từ trước</b>, khi chưa bật gì cả. Hành vi ' +
           'của hệ thống không đổi một chút nào. Cái đổi là <i>cách báo cáo</i>: mặc định, cả ' +
           'ống lấy mã của tầng cuối (<code>head</code>, mã 0) nên 141 bị che; bật pipefail ' +
           'thì mã khác 0 cuối cùng được đưa lên, và 141 lộ ra. pipefail không tạo ra lỗi ' +
           'mới, nó chỉ thôi giấu một mã thoát vẫn luôn ở đó.</p>' +
           '<p><b>Cách sửa.</b> Đừng tắt pipefail — nó đang làm đúng việc của nó, và nó bảo ' +
           'vệ bạn ở mọi bước khác. Hai lối đi gọn gàng:</p>' +
           '<p>1. Cho tầng cuối <b>đọc hết</b> ống, để không ai phải chết giữa chừng. Đo thật ' +
           'với <code>zcat huge.log.gz | { head -3; cat &gt; /dev/null; } &gt; sample.txt</code> ' +
           '→ <code>rc=0 PIPESTATUS=0 0</code>, và file kết quả giống hệt. Đổi lại, bạn mất ' +
           'đúng cái lợi ích ban đầu: giờ nó phải giải nén cả 76 MB.<br>' +
           '2. Hoặc giữ nguyên tốc độ và <b>chấp nhận riêng mã 141</b> ở đúng bước này: ' +
           '<code>rc=$?; [ "$rc" = 141 ] || exit "$rc"</code>. Cách này giữ được cả pipefail ' +
           'lẫn tốc độ, và nói rõ ý định cho người đọc script sau này.</p>' },

    { id: 'c3', k: 'free', truc: 1, tag: 'Tình huống mới', rows: 9,
      q: 'Một thiết bị ngoài hiện trường có phân vùng dữ liệu đầy ứ vì trình ghi log bị lỗi: ' +
         'nó đẻ ra <b>200 000</b> file <code>sensor-YYYY-MM-DD-N.log</code> trong một thư ' +
         'mục. Bạn ssh vào để dọn. Dưới đây là kết quả thật của hai cách. Hãy giải thích ' +
         'giới hạn nào chặn cách thứ nhất, vì sao cách thứ hai không bị chặn, và ' +
         '<code>-print0</code> giải quyết chuyện gì.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls -1 | wc -l\ndu -sh .\ngetconf ARG_MAX' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '200000\n9.9M\t.\n2097152' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'rm $(ls)\nls -1 | wc -l' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'bash: /usr/bin/rm: Argument list too long\n200000' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find . -name '*.log' -print0 | xargs -0 rm\necho \"rc=$?\"\nls -1 | wc -l" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'rc=0\n0' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# thu muc khac, chi co hai file, ten co dau cach\n' +
                'ls -1\n' +
                "find . -name '*.log' | xargs rm\necho \"rc=$?\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'my report.log\n' +
                'other file.log\n' +
                "rm: cannot remove './my': No such file or directory\n" +
                "rm: cannot remove 'report.log': No such file or directory\n" +
                "rm: cannot remove './other': No such file or directory\n" +
                "rm: cannot remove 'file.log': No such file or directory\n" +
                'rc=123' },
      ],
      hint: 'Ở cách 1, hãy hỏi <b>ai</b> nhận 200 000 cái tên đó và nhận vào đâu. Ở cách 2, ' +
            'hãy hỏi <code>rm</code> được gọi <b>mấy lần</b>.',
      crit: [
        'Chỉ ra <code>$(ls)</code> được shell bung ra thành 200 000 tham số và nhét hết vào <b>một</b> lần gọi <code>rm</code>',
        'Nêu giới hạn bị chạm là <code>ARG_MAX</code> (ở đây 2 097 152 byte) — tổng độ dài dòng lệnh cộng môi trường, do kernel áp khi <code>exec</code>',
        'Nói rõ thông báo đến từ chính <b>kernel</b> khi <code>exec</code> bị từ chối, nên <code>rm</code> chưa hề chạy — bằng chứng là vẫn còn đủ 200 000 file',
        'Giải thích <code>xargs</code> né được: nó <b>chia nhỏ</b> danh sách và gọi <code>rm</code> nhiều lượt, mỗi lượt nằm dưới giới hạn',
        'Nêu vai trò thứ hai của <code>xargs</code>: <code>rm</code> không đọc stdin, nên nếu không có xargs thì <code>find … | rm</code> chẳng xoá gì cả',
        'Giải thích <code>-print0</code>/<code>-0</code>: ngăn cách bằng byte <b>NUL</b> thay vì xuống dòng và khoảng trắng, vì NUL là ký tự duy nhất không thể có trong tên file',
        'Đọc được ví dụ tên có dấu cách: <code>my report.log</code> bị cắt thành <code>./my</code> và <code>report.log</code> — hai cái tên không tồn tại'
      ],
      sol: '<p><b>Cách 1 bị chặn ở <code>ARG_MAX</code>.</b> Shell bung ' +
           '<code>$(ls)</code> thành 200 000 chuỗi rồi cố gọi <code>rm</code> <i>một lần</i> ' +
           'với cả 200 000 tham số. Khi <code>exec</code> chạy, kernel so tổng độ dài dòng ' +
           'lệnh cộng biến môi trường với <code>ARG_MAX</code> — trên máy này là ' +
           '<b>2 097 152</b> byte — thấy vượt, và từ chối thẳng: ' +
           '<code>Argument list too long</code>. Chú ý ai nói câu đó: <b>kernel</b>, không ' +
           'phải <code>rm</code>. <code>rm</code> chưa bao giờ được nạp, và ' +
           '<code>ls -1 | wc -l</code> ngay sau đó vẫn cho <b>200 000</b> — không file nào ' +
           'bị xoá. Chi tiết đáng nhớ: 9,9 MB dữ liệu mà không xoá nổi, vì cái vượt giới hạn ' +
           'là tổng độ dài <i>tên</i> chứ không phải kích thước nội dung.</p>' +
           '<p><b>Vì sao cách 2 thoát.</b> <code>xargs</code> làm đúng một việc thông minh: ' +
           'nó đọc danh sách từ stdin rồi <b>tự chia thành nhiều lượt gọi</b>, mỗi lượt nhồi ' +
           'vừa đủ tham số để nằm dưới giới hạn. Thay vì một lần <code>rm</code> với 200 000 ' +
           'tên, bạn có vài chục lần <code>rm</code>, mỗi lần vài nghìn tên. Kết quả ' +
           '<code>rc=0</code> và thư mục sạch trơn.</p>' +
           '<p><b>Và vai trò thứ hai, quan trọng ngang thế.</b> ' +
           '<code>rm</code> không đọc stdin. Nếu bạn viết <code>find . -name \'*.log\' | ' +
           'rm</code> thì <code>rm</code> sẽ kêu <code>missing operand</code> và không xoá gì. ' +
           '<code>xargs</code> là thứ biến dòng chảy thành tham số — không có nó, cái ống này ' +
           'vô nghĩa.</p>' +
           '<p><b><code>-print0</code> và <code>-0</code> đi thành cặp.</b> Mặc định, ' +
           '<code>find</code> ngăn các tên bằng ký tự xuống dòng và <code>xargs</code> cắt ' +
           'theo cả xuống dòng lẫn khoảng trắng. Mà tên file thì được phép chứa khoảng trắng, ' +
           'thậm chí chứa cả xuống dòng. Ví dụ đo thật cho thấy hậu quả: ' +
           '<code>my report.log</code> bị cắt đôi thành <code>./my</code> và ' +
           '<code>report.log</code> — hai cái tên không tồn tại — nên ' +
           '<code>rm</code> báo lỗi bốn lần và hai file thật vẫn nằm nguyên đó. ' +
           '<code>-print0</code> đổi dấu ngăn sang byte <b>NUL</b>, và <code>-0</code> bảo ' +
           'xargs cắt theo NUL. NUL là ký tự <i>duy nhất</i> không bao giờ xuất hiện được ' +
           'trong một tên file, nên cặp này không có ngoại lệ nào.</p>' +
           '<p><b>Kết luận dùng được ngoài hiện trường:</b> ' +
           '<code>find . -name \'*.log\' -print0 | xargs -0 rm</code> là dạng chuẩn — nó vượt ' +
           'được ARG_MAX, nó bắc cầu cho một lệnh không đọc stdin, và nó không sợ tên file kỳ ' +
           'quặc. Gọn hơn nữa thì dùng thẳng <code>find . -name \'*.log\' -delete</code>, ' +
           'nhưng khi việc cần làm không phải xoá thì <code>xargs</code> vẫn là công cụ ' +
           'chung.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 8,
      q: 'Script <code>collect.sh</code> của bạn chạy hoàn hảo trên WSL. Bạn chép nó sang ' +
         'một board có rootfs BusyBox — ở đó <code>/bin/sh</code> <b>không phải</b> bash — và ' +
         'nó chết ngay dòng đầu. Dưới đây là kết quả thật khi chạy đúng những cấu trúc ấy ' +
         'bằng <code>dash</code>, tức <code>/bin/sh</code> của chính Ubuntu này và cũng là ' +
         'một shell POSIX thuần như <code>ash</code> của BusyBox. Hãy giải thích vì sao mỗi ' +
         'cấu trúc hỏng, rồi viết lại chúng bằng thứ chạy được ở mọi nơi.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code: 'ls -l /bin/sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'lrwxrwxrwx 1 root root 4 Feb  3  2026 /bin/sh -> dash' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'dash -c \'true | true; echo "${PIPESTATUS[@]}"\'\n' +
                'dash -c \'wc -l < <(seq 1 3)\'\n' +
                'dash -c \'wc -c <<< hello\'\n' +
                'dash -c \'ls /nope |& wc -l\'' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'dash: 1: Bad substitution                      (rc=2)\n' +
                'dash: 1: Syntax error: redirection unexpected  (rc=2)\n' +
                'dash: 1: Syntax error: redirection unexpected  (rc=2)\n' +
                'dash: 1: Syntax error: "&" unexpected          (rc=2)' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# nhung thu VAN chay binh thuong duoi dash\n' +
                'dash -c \'seq 1 5 | grep 3\'\n' +
                'dash -c \'ls /nope 2>&1 | wc -l\'\n' +
                'dash -c \'mkfifo /tmp/p9 && echo ok-fifo && rm -f /tmp/p9\'' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '3\n1\nok-fifo' },
        { t: 'cal', kind: 'warn',
          x: 'Một cái bẫy riêng: <code>set -o pipefail</code> <b>chạy được</b> trên dash ' +
             '0.5.12 của Ubuntu này (đã thử: <code>(exit 2) | true</code> cho ' +
             '<code>rc=2</code>). Nhưng nó là phần mở rộng mới, và ' +
             '<code>ash</code> của BusyBox thì <b>không</b> có. Đừng suy từ dash sang ash ở ' +
             'điểm này.' }
      ],
      hint: 'Chia bốn cấu trúc hỏng thành hai nhóm: nhóm bash bịa thêm <b>cú pháp mới</b>, ' +
            'và nhóm bash bịa thêm <b>biến mới</b>. Cách viết lại của hai nhóm khác nhau.',
      crit: [
        'Nói rõ nguyên nhân chung: cả bốn đều là <b>phần mở rộng riêng của bash</b>, không nằm trong POSIX — nên shell POSIX thuần không hiểu',
        'Phân biệt được hai kiểu báo lỗi: <code>Bad substitution</code> là biến không tồn tại, còn <code>Syntax error</code> là shell không phân tích nổi dòng lệnh',
        'Viết lại <code>${PIPESTATUS[@]}</code>: bỏ ống đi và chạy từng bước, kiểm <code>$?</code> sau mỗi bước; hoặc dùng file tạm giữ mã thoát',
        'Viết lại <code>&lt;(...)</code> bằng file tạm (<code>mktemp</code>) hoặc bằng FIFO — <code>mkfifo</code> có sẵn và chạy được, như output đã chứng minh',
        'Viết lại <code>&lt;&lt;&lt; chuoi</code> bằng <code>echo chuoi |</code> hoặc bằng here-doc',
        'Viết lại <code>|&amp;</code> bằng <code>2&gt;&amp;1 |</code> — dạng POSIX này chạy tốt dưới dash, output đã chứng minh',
        'Nêu cách phòng ngừa: viết <code>#!/bin/sh</code> và <b>thử bằng dash</b> ngay trên máy phát triển, đừng đợi tới lúc chép sang board'
      ],
      sol: '<p><b>Nguyên nhân chung.</b> Cả bốn cấu trúc đều là hàng bash tự thêm, không có ' +
           'trong chuẩn POSIX. BusyBox <code>ash</code> được viết để nhỏ — cả shell chỉ vài ' +
           'chục KB — nên nó cài đúng phần chuẩn và bỏ hết phần mở rộng. Chuyện này không ' +
           'phải "board thiếu tính năng", mà là bạn đã vô tình phụ thuộc vào một phương ngữ.</p>' +
           '<p><b>Hai kiểu báo lỗi, hai ý nghĩa.</b> ' +
           '<code>${PIPESTATUS[@]}</code> cho <code>Bad substitution</code>: dash hiểu cú ' +
           'pháp <code>${...}</code> nhưng không có mảng và không có biến tên ấy. Ba cái còn ' +
           'lại cho <code>Syntax error</code>: dash không <i>phân tích</i> nổi dòng lệnh, tức ' +
           'là script chết ngay khi đọc chứ chưa chạy được dòng nào. Kiểu thứ hai nguy hiểm ' +
           'hơn vì nó làm hỏng cả file, kể cả những dòng phía dưới hoàn toàn hợp lệ.</p>' +
           '<p><b>Viết lại từng cái:</b></p>' +
           '<p>· <code>${PIPESTATUS[@]}</code> → bỏ ống ra, chạy tuần tự và kiểm sau mỗi ' +
           'bước: <code>lenh_a &gt; tmp.txt || exit 1</code> rồi ' +
           '<code>lenh_b &lt; tmp.txt</code>. Mất tính song song, nhưng biết chính xác ai ' +
           'chết.<br>' +
           '· <code>&lt;(lenh)</code> → <code>tmp=$(mktemp); lenh &gt; "$tmp"; ' +
           'lenh_ngoai "$tmp"; rm -f "$tmp"</code>. Hoặc dùng FIFO — output ở trên cho thấy ' +
           '<code>mkfifo</code> chạy tốt dưới dash, và nó giữ được ưu điểm không chạm đĩa.<br>' +
           '· <code>&lt;&lt;&lt; "chuoi"</code> → <code>echo "chuoi" | lenh</code>, hoặc một ' +
           'here-doc <code>&lt;&lt;EOF</code> (here-doc là chuẩn POSIX, vẫn dùng được).<br>' +
           '· <code>lenh |&amp; loc</code> → <code>lenh 2&gt;&amp;1 | loc</code>. Đây là dạng ' +
           'gốc, và output đã chứng minh nó chạy: <code>ls /nope 2&gt;&amp;1 | wc -l</code> ' +
           'cho <b>1</b>.</p>' +
           '<p><b>Thứ vẫn chạy ở mọi nơi</b> — và đó là phần lớn những gì Bài 10 dạy: ' +
           '<code>|</code>, <code>&gt;</code>, <code>&gt;&gt;</code>, <code>&lt;</code>, ' +
           '<code>2&gt;</code>, <code>2&gt;&amp;1</code>, here-doc, <code>mkfifo</code>, ' +
           '<code>xargs</code>, <code>tee</code>. Đây chính là ý của triết lý Unix: phần lõi ' +
           'nhỏ, cũ và có mặt khắp nơi, nên script viết bằng phần lõi ấy chạy được từ máy ' +
           'chủ tới board 16 MB.</p>' +
           '<p><b>Cách phòng ngừa rẻ nhất:</b> ghi <code>#!/bin/sh</code> ở đầu file và thử ' +
           'ngay bằng <code>dash ./collect.sh</code> trên máy phát triển. Nó tìm ra đúng ' +
           'những lỗi này trong hai giây, thay vì để bạn phát hiện lúc đã ở ngoài hiện ' +
           'trường.</p>' },

    { id: 'c5', k: 'free', truc: 2, tag: 'Tính toán và biện minh', rows: 9,
      q: 'Một thiết bị dùng eMMC <b>4 GB</b>, chip chịu được <b>3 000</b> chu kỳ xoá-ghi mỗi ' +
         'khối, và giả sử cân bằng hao mòn hoàn hảo. Script gom số liệu chạy <b>mỗi 60 ' +
         'giây</b>; mỗi lần chạy nó ghi ra một file trung gian <b>20 MB</b> rồi xoá đi. ' +
         'Hãy tính: (a) tổng số byte thiết bị chịu được trong đời; (b) mỗi ngày script ghi ' +
         'bao nhiêu; (c) thiết bị sống được bao lâu; (d) nếu hợp đồng bảo hành <b>5 năm</b> ' +
         'thì mỗi lần chạy được phép ghi tối đa bao nhiêu. Rồi <b>biện minh</b> cho quyết ' +
         'định kỹ thuật của bạn.',
      hint: 'Tổng dung lượng ghi được = dung lượng × số chu kỳ. Lấy 1 ngày = 1 440 phút, ' +
            '1 năm = 365 ngày, và cứ dùng 1 GB = 1 000 MB cho gọn.',
      crit: [
        '(a) <b>4 GB × 3 000 = 12 000 GB = 12 TB</b> tổng lượng ghi chịu được',
        '(b) <b>20 MB × 1 440 lần/ngày = 28 800 MB = 28,8 GB mỗi ngày</b>',
        '(c) <b>12 000 ÷ 28,8 ≈ 417 ngày ≈ 1 năm 2 tháng</b> — và nhận ra con số này ngắn hơn hầu hết vòng đời sản phẩm',
        '(d) 12 000 GB ÷ (5 × 365 ngày) ≈ <b>6,58 GB/ngày</b> ÷ 1 440 ≈ <b>4,6 MB mỗi lần chạy</b> — tức là phải cắt file trung gian đi hơn bốn lần',
        'Đưa ra quyết định đúng: thay file trung gian bằng <b>đường ống</b>, đưa lượng ghi của bước đó về <b>0</b>',
        'Biện minh không dựa vào tốc độ — nhắc lại rằng chênh lệch thời gian đo được chỉ vài phần trăm và không lặp lại được, còn số byte thì lặp lại chính xác',
        'Nêu ít nhất một yếu tố làm con số thực tế còn <b>xấu hơn</b> tính toán này: hệ số khuếch đại ghi của FTL, cân bằng hao mòn không hoàn hảo, hoặc các nguồn ghi khác trên cùng chip'
      ],
      sol: '<p><b>(a) Ngân sách ghi cả đời.</b> ' +
           '<code>4 GB × 3 000 chu kỳ = 12 000 GB = 12 TB</code>. Đây là toàn bộ số byte ' +
           'được phép ghi xuống chip, tính từ lúc xuất xưởng cho tới lúc nó bắt đầu hỏng ' +
           'khối.</p>' +
           '<p><b>(b) Mức tiêu thụ mỗi ngày.</b> Một ngày có ' +
           '<code>24 × 60 = 1 440</code> phút, nên script chạy 1 440 lần: ' +
           '<code>20 MB × 1 440 = 28 800 MB = 28,8 GB/ngày</code>. Chỉ riêng cái file tạm ' +
           'ấy.</p>' +
           '<p><b>(c) Tuổi thọ.</b> <code>12 000 ÷ 28,8 ≈ 417 ngày</code>, tức khoảng ' +
           '<b>1 năm 2 tháng</b>. Một dòng <code>&gt; /tmp/step1.txt</code> vô hại trong ' +
           'script vừa ấn định tuổi thọ phần cứng ngắn hơn cả thời gian bảo hành thông ' +
           'thường.</p>' +
           '<p><b>(d) Ngân sách để sống đủ 5 năm.</b> ' +
           '<code>12 000 GB ÷ 1 825 ngày ≈ 6,58 GB/ngày</code>, chia cho 1 440 lần chạy ' +
           '≈ <b>4,6 MB mỗi lần</b>. Nghĩa là file trung gian 20 MB phải co lại còn dưới một ' +
           'phần tư — và đó là giả định script này là <i>nguồn ghi duy nhất</i> trên thiết ' +
           'bị, điều gần như không bao giờ đúng.</p>' +
           '<p><b>Quyết định: bỏ file trung gian, dùng đường ống.</b> Lượng ghi của bước đó ' +
           'về <b>0</b>, và bài toán ngân sách biến mất chứ không phải được nới ra. Dữ liệu ' +
           'chảy qua một bộ đệm 64 KB trong RAM của kernel, không byte nào chạm chip nhớ.</p>' +
           '<p><b>Biện minh — và chú ý nó <i>không</i> dựa vào tốc độ.</b> Đo trên máy phát ' +
           'triển, đường ống chỉ nhanh hơn 2,5–11 % tuỳ lần chạy, và con số ấy không lặp lại ' +
           'được vì nó phụ thuộc page cache. Nếu bạn đi thuyết phục ai đó bằng lý do tốc độ, ' +
           'người ta đo lại, thấy chênh 3 %, và bác bỏ bạn — đúng lý. Lý do thật thì lặp lại ' +
           'chính xác tuyệt đối và quy được ra tiền: <b>28,8 GB mỗi ngày so với 0</b>, ' +
           '<b>417 ngày so với vòng đời thiết kế</b>. Đó là ngôn ngữ mà cả người làm phần ' +
           'cứng lẫn người ký hợp đồng bảo hành đều hiểu.</p>' +
           '<p><b>Thực tế còn xấu hơn con số này.</b> Ba lý do: FTL bên trong eMMC có ' +
           '<i>hệ số khuếch đại ghi</i> — ghi 20 MB dữ liệu có thể thành 25–40 MB thật sự ' +
           'chạm ô nhớ; cân bằng hao mòn không bao giờ hoàn hảo, nên vài khối mòn trước; và ' +
           'trên thiết bị còn có log hệ thống, cập nhật cấu hình, journal của filesystem cùng ' +
           'ăn chung ngân sách 12 TB ấy. Vì vậy <b>417 ngày là ước lượng lạc quan</b>, không ' +
           'phải bi quan.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — Bài 5, Bài 8, Bài 4 ══════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 5.</b> Đây là số đo thật. Cặp số <code>1, 3</code> ở chỗ đáng lẽ là kích ' +
         'thước file nói lên điều gì?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "ls -l /dev/null /dev/zero /dev/full\nstat -c '%n  %F  major=%t minor=%T  size=%s' /dev/null /dev/zero" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'crw-rw-rw- 1 root root 1, 7 Aug 15 16:21 /dev/full\n' +
                'crw-rw-rw- 1 root root 1, 3 Aug 15 16:21 /dev/null\n' +
                'crw-rw-rw- 1 root root 1, 5 Aug 15 16:21 /dev/zero\n' +
                '/dev/null  character special file  major=1 minor=3  size=0\n' +
                '/dev/zero  character special file  major=1 minor=5  size=0' }
      ],
      opts: [
        '<code>/dev/null</code> đang chứa 1 thư mục con và 3 byte dữ liệu.',
        'Đó là <b>major, minor</b> — địa chỉ của trình điều khiển trong kernel. Chữ <code>c</code> đầu dòng nói đây là thiết bị ký tự, và nó <b>không có kích thước</b> vì nó không chứa dữ liệu: mọi thao tác đọc/ghi được chuyển thẳng cho kernel.',
        'Số phiên bản trình điều khiển: bản 1.3, 1.5 và 1.7.',
        'Số inode và số liên kết cứng của file thiết bị trên đĩa.'
      ],
      a: 1,
      why: 'Bài 5 dạy "mọi thứ là file", và đây là chỗ câu ấy được kiểm chứng cụ thể nhất. ' +
           'Chữ <code>c</code> ở đầu <code>crw-rw-rw-</code> nói đây là <b>character ' +
           'device</b>, một loại file khác hẳn <code>-</code> (file thường) và <code>d</code> ' +
           '(thư mục). Với loại này, <code>ls</code> in <b>major, minor</b> vào đúng chỗ ' +
           'thường in kích thước, vì kích thước không có nghĩa gì: file không chứa byte nào. ' +
           'Major <b>1</b> chỉ ra trình điều khiển "mem" trong kernel, minor phân biệt các ' +
           'cửa của trình điều khiển ấy — 3 là <code>null</code>, 5 là <code>zero</code>, ' +
           '7 là <code>full</code>. Ba file, một trình điều khiển. Nối được điều này với ' +
           'Bài 10: khi bạn viết <code>2&gt; /dev/null</code>, dữ liệu không hề được ghi vào ' +
           'đâu cả — nó đi thẳng vào một hàm trong kernel và hàm ấy trả về "đã ghi xong" mà ' +
           'không làm gì. Hệ quả nghề nghiệp: rootfs nhúng nào quên tạo ' +
           '<code>/dev/null</code> thì mọi script có <code>2&gt; /dev/null</code> đều gãy, ' +
           'dù chúng không đụng tới đĩa.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 8.</b> Bạn là <code>shinarus</code> (uid 1000, có trong nhóm ' +
         '<code>sudo</code>). Đây là số đo thật:',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'id\nls -l /etc/hosts\necho "# probe" >> /etc/hosts' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'uid=1000(shinarus) gid=1000(shinarus) groups=1000(shinarus),4(adm),24(cdrom),' +
                '27(sudo),30(dip),46(plugdev),100(users)\n' +
                '-rw-r--r-- 1 root root 413 Aug 15 16:36 /etc/hosts\n' +
                'bash: /etc/hosts: Permission denied' }
      ],
      opts: [
        'Vì bạn có trong nhóm <code>sudo</code>, kernel lẽ ra phải cho phép; đây là lỗi cấu hình của WSL.',
        'Kernel xét <b>đúng một</b> bộ ba: bạn không phải chủ (chủ là root), không thuộc nhóm root, nên nó dùng bộ ba <code>other</code> = <code>r--</code> — không có <code>w</code>, từ chối. Việc bạn nằm trong nhóm <code>sudo</code> hoàn toàn không liên quan.',
        'Kernel cộng gộp cả ba bộ ba lại; vì bộ ba chủ có <code>w</code> nên đáng lẽ phải ghi được.',
        'Thất bại là vì <code>&gt;&gt;</code> — dùng <code>&gt;</code> thì sẽ ghi được.'
      ],
      a: 1,
      why: 'Bài 8 nhấn mạnh đúng chỗ này: kernel <b>không</b> cộng gộp các bộ ba. Nó chọn ' +
           '<b>một</b> bộ ba theo thứ tự — bạn là chủ? dùng bộ ba chủ, dừng. Không phải chủ ' +
           'nhưng cùng nhóm? dùng bộ ba nhóm, dừng. Đều không? dùng ' +
           '<code>other</code>. Ở đây <code>/etc/hosts</code> thuộc <code>root:root</code>, ' +
           'bạn không phải root và không ở nhóm root, nên bộ ba được dùng là ' +
           '<code>r--</code>. Không có <code>w</code>, và mọi quyền hạn khác của bạn không ' +
           'được xét tới. Có tên trong nhóm <code>sudo</code> chỉ nghĩa là bạn ' +
           '<i>được phép chạy lệnh <code>sudo</code></i>, chứ không tự động nâng uid của ' +
           'shell hiện tại. Nối với Bài 10: câu này còn hỏng thêm một tầng nữa mà B4 đã mổ ' +
           'xẻ — người mở <code>/etc/hosts</code> là <b>shell</b> chứ không phải lệnh, nên ' +
           'ngay cả <code>sudo echo x &gt;&gt; /etc/hosts</code> cũng nhận đúng thông báo ' +
           'này.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 4.</b> Đây là số đo thật. Nó chứng minh điều gì về <code>&gt;</code> và ' +
         '<code>|</code>?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "type -a echo\ntype -a tee\ntype '>'\nls '/bin/|' '/bin/>'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'echo is a shell builtin\n' +
                'echo is /usr/bin/echo\n' +
                'echo is /bin/echo\n' +
                'tee is /usr/bin/tee\n' +
                'tee is /bin/tee\n' +
                'bash: type: >: not found\n' +
                "ls: cannot access '/bin/|': No such file or directory\n" +
                "ls: cannot access '/bin/>': No such file or directory" }
      ],
      opts: [
        '<code>&gt;</code> và <code>|</code> là những chương trình đặc biệt được kernel cài sẵn, nên không nằm trong <code>/bin</code>.',
        'Chúng là builtin của bash, giống <code>echo</code> — <code>type</code> chỉ không in ra được vì tên chúng có ký tự lạ.',
        'Chúng không phải lệnh gì cả mà là <b>cú pháp</b> của shell. Shell đọc chúng lúc phân tích dòng lệnh và tự dựng chuyển hướng; không có chương trình nào tên như vậy để mà gọi.',
        'Chúng là lệnh của <code>coreutils</code>, chỉ có điều đã bị gỡ khỏi máy này.'
      ],
      a: 2,
      why: 'Bài 4 chia thế giới làm hai: builtin nằm trong bash, chương trình nằm trên đĩa. ' +
           '<code>echo</code> minh hoạ cả hai cùng lúc — có bản builtin <i>và</i> có file ' +
           '<code>/bin/echo</code>. <code>tee</code> thì chỉ có bản trên đĩa. Nhưng ' +
           '<code>&gt;</code> và <code>|</code> thuộc loại <b>thứ ba</b> mà Bài 4 đã hé ra và ' +
           'Bài 10 làm rõ: chúng là <b>cú pháp</b>. Bash gặp chúng ở bước <i>phân tích</i> ' +
           'dòng lệnh, trước cả khi nghĩ tới việc chạy cái gì, rồi tự tay mở file hoặc gọi ' +
           '<code>pipe()</code>. Không có gì để tra và không có gì để gọi — ' +
           '<code>type</code> báo <code>not found</code>, và <code>/bin</code> không có file ' +
           'nào tên như thế. Đây chính là lý do sâu xa cho B4: nếu <code>&gt;</code> là một ' +
           'chương trình thì <code>sudo</code> đã có thể nâng quyền cho nó; vì nó là cú pháp ' +
           'của shell, <code>sudo</code> không bao giờ với tới.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: 'Bảy dòng lệnh dưới đây. <b>Trước khi chạy</b>, hãy viết ra kết quả bạn dự đoán cho ' +
         'từng dòng — kể cả mã thoát ở dòng 1. Rồi chạy thật và đối chiếu. Chỗ nào bạn đoán ' +
         'sai, ghi lại <i>vì sao</i> bạn đoán như thế; đó mới là phần có giá trị.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '1)  echo hi > /dev/full ; echo "rc=$?"\n' +
                '2)  head -c 20 /dev/zero | wc -c\n' +
                "3)  printf 'a\\nb\\nc\\n' | tee copy.txt | wc -l ; wc -l copy.txt\n" +
                '4)  seq 1 5 | echo\n' +
                '5)  ls /nope 2>/dev/null | wc -l\n' +
                '6)  ls /nope 2>&1 | wc -l\n' +
                '7)  head -c 8 /dev/urandom | wc -c' }
      ],
      hint: 'Dòng 4 và dòng 5 là hai cái bẫy khác nhau, và cả hai đều in ra thứ trông như ' +
            '"không có gì". Hãy phân biệt <b>một dòng trống</b> với <b>số 0</b>.',
      crit: [
        '1) <code>bash: echo: write error: No space left on device</code> và <code>rc=1</code> — <code>/dev/full</code> từ chối mọi lần ghi',
        '2) <code>20</code> — <code>/dev/zero</code> cho vô hạn byte 0, <code>head -c</code> cắt đúng 20',
        '3) <code>3</code> rồi <code>3 copy.txt</code> — <code>tee</code> vừa ghi ra file vừa chuyển tiếp nguyên vẹn xuống ống',
        '4) một <b>dòng trống</b>, không phải số 0: <code>echo</code> không đọc stdin, năm dòng của <code>seq</code> bị vứt',
        '5) <code>0</code> — thông báo lỗi bị nuốt vào <code>/dev/null</code>, ống không nhận được dòng nào',
        '6) <code>1</code> — <code>2&gt;&amp;1</code> đưa dòng lỗi vào ống, giờ <code>wc</code> đếm được nó',
        '7) <code>8</code> — <code>/dev/urandom</code> cũng là nguồn vô hạn, chỉ khác nội dung'
      ],
      sol: '<p>Kết quả thật, chạy trên máy bạn:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1)  bash: echo: write error: No space left on device\n' +
                '    rc=1\n' +
                '2)  20\n' +
                '3)  3\n' +
                '    3 copy.txt\n' +
                '4)  \n' +
                '5)  0\n' +
                '6)  1\n' +
                '7)  8' },
        { t: 'p',
          x: '<b>Bốn và năm là cặp đáng suy nghĩ nhất.</b> Cả hai đều trông như "chẳng ra ' +
             'gì", nhưng là hai loại "chẳng ra gì" khác hẳn nhau. Dòng 4 in ra một ' +
             '<b>dòng trống</b> — đó là <code>echo</code> đang in danh sách tham số rỗng của ' +
             'nó, hoàn toàn không liên quan tới năm con số mà <code>seq</code> đã đổ vào ' +
             'ống. Dòng 5 in ra <b>số 0</b> — đó là <code>wc -l</code> đã chạy đàng hoàng và ' +
             'báo cáo trung thực rằng nó nhận được 0 dòng.' },
        { t: 'p',
          x: '<b>Năm và sáu là cặp trục 1 của bộ này thu nhỏ lại thành hai ký tự.</b> Cùng ' +
             'một lệnh <code>ls /nope</code>, cùng một <code>wc -l</code>, khác nhau đúng ở ' +
             'chỗ fd 2 được nối đi đâu — và kết quả là 0 với 1. Nếu bạn đang viết một script ' +
             'giám sát đếm số lỗi, hai ký tự ấy là toàn bộ khác biệt giữa "báo động đúng" và ' +
             '"im lặng suốt ba tuần".' },
        { t: 'cal', kind: 'tip',
          x: '<code>/dev/zero</code> và <code>/dev/urandom</code> đều là <b>nguồn vô hạn</b>: ' +
             'đọc bao nhiêu cũng có. Vì thế lúc nào cũng phải có <code>head -c</code> hoặc ' +
             '<code>dd count=</code> chặn lại — <code>cat /dev/zero &gt; file.bin</code> sẽ ' +
             'chạy cho tới khi đầy đĩa.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 7,
      q: 'Bốn đường ống. Với <b>mỗi</b> cái, hãy dự đoán ba thứ: nó in ra gì, ' +
         '<code>$?</code> bằng bao nhiêu, và <code>${PIPESTATUS[@]}</code> gồm những số nào. ' +
         'Script <code>build.sh</code> in một dòng ra stdout, một dòng lỗi ra stderr, và ' +
         'thoát với mã <b>2</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'p1)  true | true | true\n' +
                'p2)  ./build.sh 2>/dev/null | wc -l\n' +
                'p3)  seq 1 1000000 | head -2\n' +
                'p4)  ./build.sh 2>&1 | grep nothing_here | wc -l' },
        { t: 'cal', kind: 'info',
          x: '<code>${PIPESTATUS[@]}</code> phải đọc <b>ngay dòng liền sau</b> đường ống — ' +
             'bất kỳ lệnh nào chạy sau đó cũng ghi đè lên nó.' }
      ],
      hint: 'Ở p3, hãy hỏi chuyện gì xảy ra với <code>seq</code> khi <code>head</code> lấy đủ ' +
            'hai dòng rồi bỏ đi. Ở p4, đếm xem <code>grep</code> tìm thấy mấy dòng.',
      crit: [
        'p1: không in gì, <code>$?</code> = 0, <code>PIPESTATUS = 0 0 0</code>',
        'p2: in <code>1</code>, <code>$?</code> = 0, <code>PIPESTATUS = 2 0</code> — mã 2 của build.sh bị che hoàn toàn',
        'p3: in <code>1</code> và <code>2</code>, <code>$?</code> = 0, <code>PIPESTATUS = 141 0</code>',
        'Giải thích được 141 ở p3: <code>head</code> thoát sớm, <code>seq</code> nhận <code>SIGPIPE</code> (13), 128 + 13 = 141 — và đây là <b>tính năng</b>, nó là lý do lệnh trả lời tức thì',
        'p4: in <code>0</code>, <code>$?</code> = 0, <code>PIPESTATUS = 2 1 0</code>',
        'Đọc được ý nghĩa của p4: <b>hai</b> tầng thất bại (build.sh mã 2, grep mã 1 vì không tìm thấy) mà cả ống vẫn báo thành công'
      ],
      sol: '<p>Kết quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'p1)  (khong in gi)\n' +
                '     rc=0  PIPESTATUS=0 0 0\n\n' +
                'p2)  1\n' +
                '     rc=0  PIPESTATUS=2 0\n\n' +
                'p3)  1\n' +
                '     2\n' +
                '     rc=0  PIPESTATUS=141 0\n\n' +
                'p4)  0\n' +
                '     rc=0  PIPESTATUS=2 1 0' },
        { t: 'p',
          x: '<b>Cả bốn đều cho <code>rc=0</code>.</b> Ba trong bốn cái có tầng chết ở bên ' +
             'trong. Nếu bạn chỉ nhìn <code>$?</code>, bạn sẽ kết luận "cả bốn đều ổn" — và ' +
             'sai ba lần.' },
        { t: 'p',
          x: '<b>p4 là trường hợp tệ nhất</b> vì nó thất bại ở <i>hai</i> tầng độc lập: ' +
             '<code>build.sh</code> chết với mã 2, rồi <code>grep</code> trả mã 1 vì không ' +
             'tìm thấy dòng nào khớp. Cả hai thông tin ấy đều bị <code>wc -l</code> — một ' +
             'lệnh gần như không bao giờ thất bại — đè lên bằng mã 0. Đây là lý do mọi tầng ' +
             'kết thúc bằng <code>wc</code>, <code>tee</code> hay <code>cat</code> đều đáng ' +
             'ngờ trong script CI.' },
        { t: 'p',
          x: '<b>p3 thì ngược lại: 141 ở đây là dấu hiệu mọi thứ đang chạy đúng.</b> ' +
             '<code>head -2</code> lấy đủ hai dòng rồi đóng ống; <code>seq</code> — đang trên ' +
             'đường đếm tới một triệu — nhận <code>SIGPIPE</code> và dừng ngay. Nhờ thế lệnh ' +
             'trả lời tức thì thay vì sinh đủ một triệu dòng. Câu C2 cho thấy chính con số ' +
             '141 này làm hỏng một pipeline CI khi người ta bật <code>pipefail</code> mà ' +
             'không hiểu nó.' },
        { t: 'cal', kind: 'tip',
          x: 'Quy tắc rút gọn: <code>$?</code> trả lời "tầng cuối thế nào", ' +
             '<code>${PIPESTATUS[@]}</code> trả lời "cả dây chuyền thế nào". Trong script ' +
             'nghiêm túc, hãy dùng <code>set -o pipefail</code> để câu hỏi thứ hai được trả ' +
             'lời tự động.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Viết <b>một</b> dòng lệnh chạy <code>./build.sh</code> sao cho đồng thời: (a) ' +
         '<b>toàn bộ</b> output — cả tiến độ lẫn lỗi — được lưu vào <code>build.log</code>; ' +
         '(b) trên màn hình <b>chỉ</b> hiện những dòng chứa chữ <code>error</code> (không ' +
         'phân biệt hoa thường); (c) nếu <code>build.sh</code> hỏng thì cả dòng lệnh phải ' +
         'trả về mã thoát khác 0. Nói rõ mỗi mảnh giải quyết yêu cầu nào.',
      hint: 'Ba yêu cầu, ba mảnh riêng biệt. Yêu cầu (c) không giải được bằng cách sắp xếp ' +
            'lại đường ống — nó cần một dòng khác đứng trước.',
      crit: [
        '(a) Có <code>2&gt;&amp;1</code> đặt <b>ngay sau</b> <code>./build.sh</code>, trước dấu <code>|</code>',
        '(a) Dùng <code>tee build.log</code> để vừa lưu vừa chuyển tiếp — không dùng <code>&gt; build.log</code> vì như thế màn hình sẽ không còn gì',
        '(b) Tầng cuối là <code>grep -i error</code>, có <code>-i</code> để bắt được cả <code>Error</code> viết hoa',
        '(c) Có <code>set -o pipefail</code> ở dòng trước, hoặc đọc <code>${PIPESTATUS[0]}</code> ngay sau đó',
        'Giải thích được vì sao thiếu <code>2&gt;&amp;1</code> thì cả (a) lẫn (b) đều hỏng: lỗi không vào file, và grep cũng không thấy lỗi để in',
        'Giải thích được vì sao thiếu <code>pipefail</code> thì (c) hỏng: mã thoát của ống là mã của <code>grep</code>'
      ],
      sol: '<p>Dòng lệnh, và kết quả thật với một bản dựng hỏng:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'set -o pipefail\n./build.sh 2>&1 | tee build.log | grep -i error\necho "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: "main.c:14: error: expected ';' before '}' token\n" +
                'make: *** [Makefile:7: main.o] Error 1\n' +
                'rc=2' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'cat build.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'CC   main.c\n' +
                'CC   driver.c\n' +
                "main.c:14: error: expected ';' before '}' token\n" +
                'CC   util.c\n' +
                'make: *** [Makefile:7: main.o] Error 1' },
        { t: 'cmdx', title: 'Từng mảnh và yêu cầu nó giải quyết',
          rows: [
            ['<code>set -o pipefail</code>', 'Yêu cầu (c). Không có nó, mã thoát của cả ống là mã của <code>grep</code> — mà grep tìm thấy chữ error nên trả 0, tức là "thành công". Có nó, mã khác 0 cuối cùng được đưa lên và bạn nhận đúng <code>rc=2</code> của build.sh.'],
            ['<code>2&gt;&amp;1</code>', 'Yêu cầu (a) <b>và</b> (b) cùng lúc. Nó gộp fd 2 vào fd 1 <i>trước</i> khi ống được nối, nên hai dòng lỗi mới đi vào được dây chuyền. Bỏ nó ra thì <code>build.log</code> mất hai dòng lỗi và màn hình không hiện gì cả.'],
            ['<code>| tee build.log</code>', 'Yêu cầu (a). <code>tee</code> ghi mọi thứ nhận được vào file <b>và</b> chuyển tiếp nguyên vẹn xuống tầng sau. Nếu dùng <code>&gt; build.log</code> thì dòng chảy dừng lại ở đó, không còn gì cho grep.'],
            ['<code>| grep -i error</code>', 'Yêu cầu (b). Chữ <code>-i</code> là bắt buộc: một dòng viết <code>error</code> thường, dòng kia viết <code>Error 1</code> hoa. Thiếu <code>-i</code>, bạn mất một nửa số cảnh báo.'],
            ['<code>${PIPESTATUS[0]}</code>', 'Cách thay thế cho <code>pipefail</code> khi bạn cần chính xác mã của tầng đầu chứ không phải mã khác 0 cuối cùng. Phải đọc ngay dòng liền sau đường ống.']
          ] },
        { t: 'cal', kind: 'warn',
          x: 'Thứ tự các tầng không đổi được: <code>tee</code> phải đứng <b>trước</b> ' +
             '<code>grep</code>. Đảo lại thành <code>| grep -i error | tee build.log</code> ' +
             'thì file chỉ còn hai dòng lỗi và bạn mất sạch phần tiến độ — đúng thứ bạn cần ' +
             'để biết bản dựng đã đi được tới đâu.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Viết một script chuyển hướng <b>toàn bộ</b> output của chính nó vào ' +
         '<code>run.log</code> ngay từ đầu — không phải gắn <code>&gt; run.log</code> ở ngoài ' +
         'lúc gọi — nhưng vẫn giữ lại <b>một đường riêng</b> để in vài dòng trạng thái thẳng ' +
         'ra terminal cho người đang ngồi xem. Gợi ý: bạn cần <code>exec</code> và một file ' +
         'descriptor tự mở.',
      hint: '<code>exec</code> không kèm tên chương trình thì nó không thay thế tiến trình mà ' +
            '<b>chỉ</b> áp dụng các chuyển hướng — cho chính shell đang chạy, và cho mọi lệnh ' +
            'sau đó. Bạn được phép dùng các số fd từ 3 trở lên.',
      crit: [
        'Dùng <code>exec 3&gt;&amp;1</code> để <b>cất giữ</b> terminal vào fd 3 <b>trước</b> khi đổi fd 1',
        'Dùng <code>exec &gt; run.log 2&gt;&amp;1</code> để chuyển hướng mọi thứ từ điểm đó trở đi',
        'Nêu đúng thứ tự: cất trước, đổi sau — làm ngược lại thì fd 3 sẽ trỏ vào file chứ không phải terminal',
        'In dòng trạng thái bằng <code>&gt;&amp;3</code>',
        'Đóng lại bằng <code>exec 3&gt;&amp;-</code> khi xong',
        'Giải thích được vì sao đây là dạng đáng dùng: mọi lệnh phía sau tự động được ghi log mà không phải gắn <code>&gt;&gt; run.log 2&gt;&amp;1</code> vào từng dòng'
      ],
      sol: '<p>Script, và kết quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '#!/bin/bash\n' +
                'exec 3>&1                 # save the real terminal into fd 3\n' +
                'exec > run.log 2>&1       # everything from here on goes to the file\n' +
                '\n' +
                'echo "[status] build starting" >&3\n' +
                './build.sh\n' +
                'rc=$?\n' +
                'echo "this line lands in run.log, not on the terminal"\n' +
                'echo "[status] build finished, rc=$rc" >&3\n' +
                'exec 3>&-                 # close the saved descriptor' },
        { t: 'p', x: 'Những gì <b>terminal</b> nhìn thấy:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[status] build starting\n' +
                '[status] build finished, rc=2' },
        { t: 'p', x: 'Và toàn bộ nội dung <code>run.log</code>:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'CC   main.c\n' +
                'CC   driver.c\n' +
                "main.c:14: error: expected ';' before '}' token\n" +
                'CC   util.c\n' +
                'make: *** [Makefile:7: main.o] Error 1\n' +
                'this line lands in run.log, not on the terminal' },
        { t: 'cmdx', title: 'Ba dòng exec làm gì',
          rows: [
            ['<code>exec 3&gt;&amp;1</code>', 'Chép chỗ-đang-trỏ của fd 1 — lúc này vẫn là terminal — sang fd 3. Đây là bản chụp mà B5 nói tới, và ở đây ta dùng nó một cách có chủ đích: cất giữ một đường thoát trước khi khoá cửa chính.'],
            ['<code>exec &gt; run.log 2&gt;&amp;1</code>', '<code>exec</code> không kèm chương trình nghĩa là "chỉ áp dụng chuyển hướng, đừng thay thế tiến trình". Từ dòng này trở đi, fd 1 và fd 2 của <b>chính shell</b> — và của mọi lệnh nó sinh ra — đều trỏ vào <code>run.log</code>.'],
            ['<code>&gt;&amp;3</code>', 'Ghi vào fd 3, tức là ra terminal. Đây là lý do phải cất fd 3 <i>trước</i>: làm ngược thứ tự thì fd 3 sẽ chép lấy file chứ không phải terminal, và mọi dòng trạng thái sẽ chui hết vào log.'],
            ['<code>exec 3&gt;&amp;-</code>', 'Đóng fd 3. Không bắt buộc với script ngắn vì fd tự đóng khi tiến trình thoát, nhưng là thói quen tốt — nó nói rõ với người đọc rằng từ đây không còn đường ra terminal nữa.']
          ] },
        { t: 'cal', kind: 'tip',
          x: 'Đây là dạng chuẩn của script chạy trên thiết bị: mọi thứ vào log để về sau còn ' +
             'truy được, riêng vài dòng trạng thái ra terminal cho người đang cắm cáp ngồi ' +
             'nhìn. Nó cũng gọn hơn hẳn việc gắn <code>&gt;&gt; run.log 2&gt;&amp;1</code> ' +
             'vào cuối từng dòng — và không sót dòng nào.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 8,
      q: 'Script xoay vòng log dưới đây được chạy thật. Kết quả: <code>app.log</code> ' +
         '<b>mất sạch dữ liệu</b>, <code>rotate.log</code> thiếu mất hai dòng quan trọng, và ' +
         'script báo thành công dù bản dựng bên trong nó hỏng. Ba lỗi độc lập trong bốn ' +
         'dòng. Hãy chỉ ra từng lỗi và viết lại script cho đúng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '#!/bin/bash\n' +
                'grep -v DEBUG app.log > app.log\n' +
                './build.sh 2>&1 > rotate.log\n' +
                'echo "[rotate] finished, rc=$?"' },
        { t: 'p', x: 'Trước khi chạy, <code>app.log</code> có 11 dòng. Sau khi chạy:' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './rotate-bad.sh\necho "rc_script=$?"\nwc -c app.log\nwc -l rotate.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'grep: app.log: input file is also the output\n' +
                "main.c:14: error: expected ';' before '}' token\n" +
                'make: *** [Makefile:7: main.o] Error 1\n' +
                '[rotate] finished, rc=2\n' +
                'rc_script=0\n' +
                '0 app.log\n' +
                '3 rotate.log' }
      ],
      hint: 'Ba lỗi nằm ở ba dòng khác nhau và không liên quan gì nhau. Dòng 2: ai mở ' +
            '<code>app.log</code> để ghi, và vào lúc nào? Dòng 3: thứ tự. Dòng 4: ' +
            '<code>$?</code> lúc ấy đang là mã thoát của lệnh nào?',
      crit: [
        'Lỗi 1 (dòng 2): shell mở <code>app.log</code> với <code>&gt;</code> và cắt nó về <b>0 byte trước khi grep chạy</b> — bằng chứng là <code>wc -c</code> cho <code>0</code>',
        'Sửa lỗi 1 bằng file tạm: <code>grep -v DEBUG app.log &gt; app.log.tmp &amp;&amp; mv app.log.tmp app.log</code>',
        'Lỗi 2 (dòng 3): <code>2&gt;&amp;1</code> đứng <b>trước</b> <code>&gt; rotate.log</code> nên nó chụp lấy terminal, không phải file — hai dòng lỗi rơi ra màn hình, <code>rotate.log</code> chỉ còn 3 dòng thay vì 5',
        'Sửa lỗi 2 bằng cách đảo thứ tự: <code>./build.sh &gt; rotate.log 2&gt;&amp;1</code>',
        'Lỗi 3 (dòng 4): <code>$?</code> bên trong chuỗi <code>echo</code> vẫn là mã của <code>build.sh</code>, nhưng <b>mã thoát của cả script</b> lại là mã của <code>echo</code> — luôn 0. Bằng chứng: <code>[rotate] finished, rc=2</code> mà <code>rc_script=0</code>',
        'Sửa lỗi 3 bằng cách lưu mã thoát vào biến rồi <code>exit "$rc"</code> ở cuối',
        'Nhận ra lỗi 3 là lỗi nguy hiểm nhất: hai lỗi kia để lại dấu vết nhìn thấy được, còn lỗi này làm hệ thống giám sát bên ngoài kết luận sai'
      ],
      sol: '<p><b>Lỗi 1 — dòng 2 huỷ chính file nó đang lọc.</b> Shell xử lý ' +
           '<code>&gt; app.log</code> <i>trước</i> khi nạp <code>grep</code>: nó mở file với ' +
           'cờ truncate, và nội dung biến mất ngay tại đó. Khi <code>grep</code> mở ' +
           '<code>app.log</code> để đọc thì file đã rỗng. Trên máy này GNU grep còn kịp phát ' +
           'hiện và kêu <code>input file is also the output</code>, nhưng lời cảnh báo ấy ' +
           'đến <b>sau</b> khi dữ liệu đã mất — <code>wc -c</code> cho <code>0</code>. Nhiều ' +
           'lệnh khác không cảnh báo gì cả.</p>' +
           '<p><b>Lỗi 2 — dòng 3 sai thứ tự.</b> <code>2&gt;&amp;1 &gt; rotate.log</code> ' +
           'chụp chỗ của fd 1 <i>khi nó còn là terminal</i>, rồi mới đổi fd 1 sang file. Kết ' +
           'quả: tiến độ vào file, lỗi ra màn hình. Bạn thấy hai dòng lỗi hiện lên trong ' +
           'output ở trên, và <code>rotate.log</code> chỉ có <b>3</b> dòng thay vì 5.</p>' +
           '<p><b>Lỗi 3 — dòng 4 nuốt mã thoát, và đây là lỗi nguy hiểm nhất.</b> Chuỗi ' +
           '<code>"[rotate] finished, rc=$?"</code> có đọc đúng mã 2 của ' +
           '<code>build.sh</code> — bạn thấy nó in ra <code>rc=2</code>. Nhưng lệnh ' +
           '<i>cuối cùng</i> của script là <code>echo</code>, và <code>echo</code> luôn thành ' +
           'công, nên script thoát với mã <b>0</b>. Cron, systemd hay CI ở bên ngoài chỉ nhìn ' +
           'mã thoát ấy và kết luận "xong tốt". Hai lỗi trên còn để lại dấu vết cho bạn thấy; ' +
           'lỗi này thì báo cáo sai sự thật ra bên ngoài.</p>' +
           '<p>Bản sửa, đã chạy thật:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '#!/bin/bash\n' +
                'set -o pipefail\n' +
                'grep -v DEBUG app.log > app.log.tmp && mv app.log.tmp app.log\n' +
                './build.sh > rotate.log 2>&1\n' +
                'rc=$?\n' +
                'echo "[rotate] finished, rc=$rc"\n' +
                'exit "$rc"' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './rotate-good.sh\nwc -l app.log\ntail -1 app.log\nwc -l rotate.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[rotate] finished, rc=2\n' +
                '10 app.log\n' +
                '2026-08-15 INFO line 10\n' +
                '5 rotate.log' },
        { t: 'p',
          x: 'Ba con số chứng minh ba lỗi đã hết: <code>app.log</code> còn <b>10</b> dòng ' +
             '(11 dòng ban đầu trừ đúng một dòng DEBUG) và nội dung vẫn nguyên vẹn; ' +
             '<code>rotate.log</code> có đủ <b>5</b> dòng, kể cả hai dòng lỗi; và script trả ' +
             'về mã <b>2</b> nên hệ thống bên ngoài biết bản dựng đã hỏng.' },
        { t: 'cal', kind: 'tip',
          x: 'Dấu <code>&amp;&amp;</code> trong dòng 3 không phải để cho đẹp: nếu ' +
             '<code>grep</code> hỏng giữa chừng, <code>mv</code> sẽ không chạy và ' +
             '<code>app.log</code> gốc còn nguyên. Đây là dạng "ghi ra file tạm rồi đổi tên", ' +
             'và nó là cách an toàn duy nhất để sửa một file tại chỗ bằng shell.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Hãy tự chứng minh — không tin lời ai — rằng hai tiến trình trong một đường ống ' +
         'đang <b>dùng chung đúng một</b> cái ống, và rằng cái ống ấy có sức chứa hữu hạn. ' +
         'Chạy một pipeline sống lâu, tìm hai PID của nó, rồi đọc <code>/proc</code> để lấy ' +
         'bằng chứng. Sau đó tìm ra sức chứa mặc định của một đường ống trên máy này, tính ' +
         'bằng byte.',
      hint: 'Mỗi tiến trình có <code>/proc/&lt;PID&gt;/fd/</code>, và các mục trong đó là ' +
            'liên kết tượng trưng. Nhìn kỹ cái mà fd 1 của tiến trình trái và fd 0 của tiến ' +
            'trình phải trỏ tới. Sức chứa thì hỏi <code>/proc/sys/fs/</code>.',
      crit: [
        'Khởi động được một pipeline sống lâu ở chế độ nền, ví dụ <code>sleep 300 | cat &gt; /dev/null &amp;</code>',
        'Tìm được hai PID (bằng <code>pgrep</code>, <code>jobs -l</code> hoặc <code>ps</code>)',
        'Đọc <code>ls -l /proc/&lt;PID&gt;/fd</code> cho <b>cả hai</b> tiến trình',
        'Chỉ ra bằng chứng quyết định: fd <b>1</b> của tiến trình trái và fd <b>0</b> của tiến trình phải cùng trỏ tới <code>pipe:[N]</code> với <b>cùng một số N</b> — đó là số inode của cái ống',
        'Nhận ra fd 2 của cả hai <b>không</b> trỏ vào ống, mà vẫn trỏ ra ngoài — bằng chứng trực quan cho trục 1 của bộ này',
        'Tìm được sức chứa: <code>/proc/sys/fs/pipe-max-size</code> cho trần <b>1 048 576</b> byte, còn mặc định là <b>65 536</b> byte (64 KB)',
        'Giải thích được ý nghĩa của sức chứa hữu hạn: khi ống đầy, tiến trình ghi bị <b>chặn lại</b> — đó là cơ chế tự điều tiết, không phải lỗi'
      ],
      sol: '<p>Bằng chứng thật, chạy trên máy bạn:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '( sleep 300 | cat > /dev/null ) &\nsleep 1\nLEFT=$(pgrep -x sleep | tail -1)\nRIGHT=$(pgrep -x cat | tail -1)\n' +
                'echo "sleep=$LEFT   cat=$RIGHT"\nls -l /proc/$LEFT/fd\nls -l /proc/$RIGHT/fd' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'sleep=412   cat=413\n' +
                '\n' +
                '/proc/412/fd:\n' +
                'lr-x------ 1 shinarus shinarus 64 Aug 15 16:12 0 -> /dev/null\n' +
                'l-wx------ 1 shinarus shinarus 64 Aug 15 16:12 1 -> pipe:[20583]\n' +
                'l-wx------ 1 shinarus shinarus 64 Aug 15 16:12 2 -> /dev/null\n' +
                '\n' +
                '/proc/413/fd:\n' +
                'lr-x------ 1 shinarus shinarus 64 Aug 15 16:12 0 -> pipe:[20583]\n' +
                'l-wx------ 1 shinarus shinarus 64 Aug 15 16:12 1 -> /dev/null\n' +
                'l-wx------ 1 shinarus shinarus 64 Aug 15 16:12 2 -> /dev/null' },
        { t: 'p',
          x: '<b>Đây là bằng chứng.</b> fd <b>1</b> của <code>sleep</code> và fd <b>0</b> của ' +
             '<code>cat</code> cùng trỏ tới <code>pipe:[20583]</code> — <i>cùng một con ' +
             'số</i>. Con số ấy là inode của cái ống trong kernel. Hai tiến trình riêng biệt, ' +
             'mỗi cái có bảng fd riêng, nhưng cả hai cùng cầm hai đầu của đúng một vật. Để ý ' +
             'thêm chiều của liên kết: <code>l-wx</code> ở phía <code>sleep</code> nghĩa là ' +
             'chỉ-ghi, <code>lr-x</code> ở phía <code>cat</code> nghĩa là chỉ-đọc. Đường ống ' +
             'là một chiều, và <code>/proc</code> nói thẳng điều đó ra.' },
        { t: 'p',
          x: '<b>Và một quan sát nữa, đúng bằng trục 1 của bộ bài tập này.</b> fd <b>2</b> ' +
             'của cả hai tiến trình <i>không</i> trỏ vào ống — ở lần chạy này chúng trỏ vào ' +
             '<code>/dev/null</code>, còn ở terminal bình thường chúng sẽ trỏ vào ' +
             '<code>/dev/pts/0</code>. Bạn không cần tin lời ai về chuyện "ống chỉ mang ' +
             'fd 1"; nó nằm ngay trong bảng fd, đọc được bằng mắt.' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat /proc/sys/fs/pipe-max-size\npython3 -c "import fcntl, os; r, w = os.pipe(); print(fcntl.fcntl(w, 1032), \'bytes\')"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1048576\n65536 bytes' },
        { t: 'p',
          x: 'Sức chứa mặc định là <b>65 536 byte</b> = 64 KB (số 1032 là mã của lệnh ' +
             '<code>F_GETPIPE_SZ</code>), và trần mà người dùng thường được phép nâng lên là ' +
             '<b>1 048 576</b> byte = 1 MB.' },
        { t: 'cal', kind: 'tip', title: 'Vì sao 64 KB lại là con số quan trọng',
          x: '<p>Sức chứa hữu hạn chính là thứ làm cho đường ống <b>tự điều tiết</b>. Khi ' +
             'tầng trái chạy nhanh hơn tầng phải, ống đầy dần; đầy rồi thì lời gọi ghi tiếp ' +
             'theo bị kernel <b>chặn lại</b> cho tới khi tầng phải đọc bớt. Không có tín ' +
             'hiệu, không có lỗi, không cần ai lập trình gì thêm.</p>' +
             '<p>Nhờ vậy <code>seq 1 1000000000 | head -3</code> không bao giờ ngốn hết RAM: ' +
             'ống chỉ giữ tối đa 64 KB, còn <code>seq</code> thì nằm chờ. Và khi ' +
             '<code>head</code> bỏ đi, <code>seq</code> nhận <code>SIGPIPE</code> — cơ chế ' +
             'mà câu C2 và E2 đã mổ xẻ. Hai cơ chế ấy cộng lại là lý do một đường ống xử lý ' +
             'được luồng dữ liệu lớn hơn RAM nhiều lần mà không cần một dòng mã quản lý bộ ' +
             'nhớ nào.</p>' }
      ] },
  ],

  /* ═══ F · Bảng chẩn đoán ═══════════════════════════════════════════════ */
  diag: [
    ['A1, B1, C1',
     'Bạn tin rằng dấu <code>|</code> chuyển <b>mọi thứ</b> lệnh bên trái in ra sang cho ' +
     'lệnh bên phải. Nó chỉ chuyển fd 1; mọi thông báo lỗi đi ở fd 2, vòng qua ống và rơi ' +
     'thẳng ra terminal — nên <code>make | grep error</code> có thể báo "0 lỗi" trên một bản ' +
     'dựng vừa chết.',
     '<a href="#/bai-10#duong-ong-noi-stdout-cua-lenh-nay-vao-stdin-cua-lenh-kia">Đọc lại ' +
     'Bài 10 — <i>Đường ống: nối stdout của lệnh này vào stdin của lệnh kia</i></a>'],

    ['A2, B2, C3',
     'Bạn tin rằng bất cứ lệnh nào đứng sau <code>|</code> cũng nhận được dữ liệu. Rất nhiều ' +
     'lệnh — <code>echo</code>, <code>rm</code>, <code>mkdir</code>, <code>kill</code> — ' +
     'không đọc stdin, và chúng thất bại <b>im lặng</b>. <code>xargs</code> là cầu nối biến ' +
     'dòng chảy thành tham số.',
     '<a href="#/bai-10#thuc-hanh-tu-tay-noi-lai-tung-soi-day">Đọc lại Bài 10 — <i>Thực ' +
     'hành</i>, bước <i>Here-doc, noclobber, process substitution, xargs</i></a>'],

    ['A3, B3, C5',
     'Bạn tin rằng lý do dùng đường ống là vì nó <b>nhanh hơn</b>. Đo ba lần thì chênh lệch ' +
     'thời gian nhảy từ 2,5 % tới 11 % và không lặp lại được; thứ lặp lại chính xác tuyệt đối ' +
     'là 28 856 304 byte ghi xuống đĩa so với 0 — và trên flash, đó là tuổi thọ sản phẩm.',
     '<a href="#/bai-10#do-thu-duong-ong-so-voi-file-trung-gian">Đọc lại Bài 10 — <i>Đo thử: ' +
     'đường ống so với file trung gian</i></a>'],

    ['A8, B4, B5, C1, E5',
     'Bạn lẫn giữa các toán tử chuyển hướng, hoặc chưa nắm được rằng <b>shell</b> mới là kẻ ' +
     'mở file — trước khi lệnh chạy. Đó là lý do <code>grep x f &gt; f</code> huỷ mất f, ' +
     '<code>sudo lenh &gt; /etc/f</code> vẫn bị từ chối, và <code>2&gt;&amp;1</code> đặt sai ' +
     'chỗ thì vô tác dụng.',
     '<a href="#/bai-10#thu-tu-viet-quyet-dinh-ket-qua">Đọc lại Bài 10 — <i>Thứ tự viết quyết ' +
     'định kết quả</i></a>'],

    ['A7, C2, E2',
     'Bạn đọc <code>$?</code> của một đường ống và tưởng nó nói về cả dây chuyền. Nó chỉ nói ' +
     'về <b>tầng cuối</b>. Cần <code>set -o pipefail</code> hoặc ' +
     '<code>${PIPESTATUS[@]}</code> — và cần hiểu mã 141 = 128 + 13 là SIGPIPE, một tính năng ' +
     'chứ không phải sự cố.',
     '<a href="#/bai-10#ma-thoat-cua-mot-duong-ong-la-ma-thoat-cua-lenh-cuoi-cung">Đọc lại ' +
     'Bài 10 — <i>Mã thoát của một đường ống là mã thoát của lệnh cuối cùng</i></a>'],

    ['A5, A6, B6, C4',
     'Bạn chưa phân biệt được các cách đưa dữ liệu vào một lệnh khi nguồn không phải file: ' +
     'here-doc có nháy hay không nháy, <code>&lt;(...)</code> là ống chứ không phải file tạm, ' +
     'FIFO luôn 0 byte. Và một phần trong số đó là hàng riêng của bash, không chạy trên board ' +
     'BusyBox.',
     '<a href="#/bai-10#khi-nguon-du-lieu-khong-phai-file-here-doc-va">Đọc lại Bài 10 — ' +
     '<i>Khi nguồn dữ liệu không phải file: here-doc và &lt;(...)</i></a>'],

    ['A4, E1, E6',
     'Bạn chưa vững về bốn file thiết bị và về việc một đường ống thật sự là cái gì trong ' +
     'kernel: <code>/dev/null</code> nuốt, <code>/dev/full</code> luôn báo hết chỗ, ' +
     '<code>/dev/zero</code> và <code>/dev/urandom</code> là nguồn vô hạn — còn ống là một bộ ' +
     'đệm 64 KB có inode riêng, đọc được qua <code>/proc</code>.',
     '<a href="#/bai-10#bon-file-thiet-bi-dung-lam-nguon-va-thung-rac">Đọc lại Bài 10 — ' +
     '<i>Bốn file thiết bị dùng làm nguồn và thùng rác</i></a>'],

    ['D1',
     'Bạn quên rằng file thiết bị không chứa dữ liệu: cặp <code>1, 3</code> là major/minor — ' +
     'địa chỉ của trình điều khiển trong kernel — chứ không phải kích thước.',
     '<a href="#/bai-05#moi-thu-la-file-cau-nay-nghia-la-gi">Đọc lại Bài 5 — <i>Mọi thứ là ' +
     'file — câu này nghĩa là gì</i></a>'],

    ['D2',
     'Bạn tưởng kernel cộng gộp cả ba bộ ba quyền, hoặc tưởng có tên trong nhóm ' +
     '<code>sudo</code> là tự động ghi được file của root. Kernel chọn <b>đúng một</b> bộ ba ' +
     'rồi dừng.',
     '<a href="#/bai-08#chin-ky-tu-va-con-so-tuong-duong">Đọc lại Bài 8 — <i>Chín ký tự và ' +
     'con số tương đương</i></a>'],

    ['D3',
     'Bạn xếp <code>&gt;</code> và <code>|</code> vào cùng loại với <code>echo</code> hay ' +
     '<code>tee</code>. Chúng không phải chương trình, cũng không phải builtin — chúng là ' +
     '<b>cú pháp</b> mà shell xử lý lúc phân tích dòng lệnh.',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại Bài 4 — <i>Một lệnh thật sự đến ' +
     'từ đâu</i></a>'],
  ],
});

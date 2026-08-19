/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 15 — Trình biên dịch làm gì: bốn giai đoạn của gcc
   Cặp với lessons/bai-15.js · Chặng 02 · C và công cụ build

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (18 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 15):
     bốn giai đoạn và bốn chương trình (cc1 -E / cc1 / as / ld) · cờ dừng
     -E, -S, -c và -save-temps · bộ tiền xử lý chỉ thay VĂN BẢN · #include
     chép nguyên văn nội dung file · ba cái bẫy macro · #ifdef xoá hẳn khối
     mã · header guard · quy tắc một định nghĩa (ODR) · khai báo so với định
     nghĩa · bảng ký hiệu và nm (U / T / t) · undefined reference ·
     multiple definition · thứ tự file .o và thư viện trên dòng lệnh · -lm ·
     biên dịch riêng từng file (tiền đề của make) · gcc -H và cây header ·
     .i phình ra bao nhiêu lần · mỗi thông báo lỗi tố cáo giai đoạn của nó

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                    PT  GIÁ  PTG  TỔNG
     tiền xử lý chỉ thay văn bản, không hiểu C    2    2    2     6   ← trục 0
     khai báo đủ cho gđ 2, định nghĩa mới cần gđ4 2    2    2     6   ← trục 1
     mỗi thông báo lỗi tố cáo giai đoạn của nó    2    2    1     5   ← trục 2
     thứ tự .o và thư viện trên dòng lệnh, -lm    1    2    2     5   ✗ xếp sau
     header guard và quy tắc một định nghĩa       1    2    1     4   ✗ nhập trục 1
     #ifdef xoá hẳn khối mã trước giai đoạn 2     1    1    2     4   ✗ cắt
     ba cái bẫy macro                             1    2    2     5   ✗ nhập trục 0
     biên dịch riêng từng file                    2    1    0     3   ✗ cắt (†)
     bảng ký hiệu và nm (U / T / t)               1    1    1     3   ✗ cắt (‡)
     bốn giai đoạn và bốn chương trình            1    1    1     3   ✗ cắt
     gcc -H và cây header                         0    0    1     1   ✗ cắt
     .i phình ra bao nhiêu lần                    0    0    2     2   ✗ cắt
     cờ -E / -S / -c / -save-temps                1    0    0     1   ✗ cắt (§)

     (†) "biên dịch riêng từng file" là lý do make tồn tại → để BÀI 16 sở
         hữu. Ở đây chỉ lấy đúng một câu điền khuyết (a7) làm bắc cầu.
     (‡) nm đã được bt-14 (a8) dùng làm câu ghép nối. §13.4 bước 4 cấm xoáy
         lại một khái niệm đã xoáy; ở đây nm chỉ đóng vai DỮ LIỆU cho trục 1
         (b2, c4), không phải chủ đề được hỏi.
     (§) tên cờ là thứ tra được trong mười giây → §13.3 cấm làm trục. Đúng
         một câu mức A (a8 ghép nối).

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Hai ứng viên đầu đạt 6,
   ứng viên thứ ba đạt 5 và có cả ba trục con ≥ 1 → lấy đúng ba. Ứng viên
   "thứ tự .o và thư viện" cũng đạt 5 nhưng bị xếp sau, lý do ở bước 4.

   Bước 4 · Loại và điều phối:
     · Không ứng viên nào trùng trục đã tiêu của bt-01…bt-14 (§13.8 ở dưới).
     · "thứ tự .o và thư viện trên dòng lệnh" (5 điểm) KHÔNG làm trục mà được
       hai câu bề rộng: c2 và e4. Lý do: nó rất phản trực giác và rất đắt,
       nhưng cả ba tầng câu hỏi của nó đều rơi vào cùng một thao tác — "đọc
       thông báo undefined reference rồi thêm -lm vào cuối". Không có tầng
       "giải thích cơ chế" nào khác tầng "chẩn đoán", nên làm trục sẽ phải
       bịa ra một tầng. Ghi lại để lần sau khỏi suy lại.
     · "header guard / ODR" gộp vào trục 1 (cùng một cơ chế: chỗ nào được
       phép có ĐỊNH NGHĨA), xuất hiện ở a6, b4 và c5.
     · "ba cái bẫy macro" gộp vào trục 0, xuất hiện ở a1, b1, b5, b6, e2.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · Bộ tiền xử lý chỉ thay VĂN BẢN — nó không biết C, không biết ưu
         tiên toán tử, không biết kiểu. Vì vậy 100 / HALF(10) với
         #define HALF(x) (x)/2 cho ra 5 chứ không phải 20, và trình biên dịch
         KHÔNG cảnh báo gì cả.
     1 · Một KHAI BÁO là đủ để giai đoạn 2 và 3 chạy sạch; ĐỊNH NGHĨA chỉ bị
         đòi ở giai đoạn 4. Vì vậy `gcc -c` không báo lỗi KHÔNG chứng minh
         hàm bạn gọi tồn tại ở bất cứ đâu.
     2 · Mỗi thông báo lỗi tự tố cáo giai đoạn sinh ra nó: header
         "No such file or directory" = giai đoạn 1; "error:" kèm
         file.c:dòng:cột = giai đoạn 2; "undefined reference" /
         "multiple definition" kèm tên ld = giai đoạn 4.

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng ở C):
     0 · "macro là một hàm, chỉ nhanh hơn — thêm ngoặc chỉ cho đẹp."
     1 · "biên dịch xong không lỗi nghĩa là chương trình đã đầy đủ."
     2 · "lỗi build nào cũng là lỗi trình biên dịch, cứ mở file .c ra sửa."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (phát biểu)   B1 (file .i thật + kết quả chạy thật)   C3 (tình huống mới: macro không cứu được bằng ngoặc)
     trục 1 → A5 (đúng/sai)    B2 (transcript nm thật của .o và file thực thi)  C2 (tình huống mới: -lm với tham số lúc chạy)
     trục 2 → A2 (phát biểu)   B3 (giải thích vì sao gđ 2 không thể báo undefined reference)  C1 (chẩn đoán ba thông báo)
     · C1/C2/C3 đều KHÔNG trả lời được nếu không nắm trục — mỗi câu buộc phải
       quyết định trên một ràng buộc không có trong bài.
     · Ba mức dùng ba loại kích thích khác nhau: phát biểu / dữ liệu thật /
       tình huống có ràng buộc. Không mức nào lặp từ vựng của mức kia.

   ───────────────────────────────────────────────────────────────────────────
   §13.8 · ĐỐI CHIẾU TRỤC ĐÃ TIÊU — không trục nào dưới đây được lặp lại:
     bt-01 MMU · bốn mảnh chạy tuần tự · Device Tree khai báo phần cứng
     bt-02 DRAM chưa dùng được lúc reset · mỗi tầng bàn giao rồi biến mất · bootargs
     bt-03 ảo hoá cần cùng kiến trúc · hai họ QEMU · /mnt/c là ranh giới chậm
     bt-04 shell tách từ trước khi lệnh thấy tham số · $? · builtin ≠ file
     bt-05 /proc sinh lúc đọc · file trong /dev không chứa dữ liệu · thư mục rỗng là điểm gắn
     bt-06 shell bung dấu * · tên không phải là file, inode mới là · metadata là một hệ thống
     bt-07 Ctrl+S đóng băng terminal · vim có chế độ · lệnh : mặc định một dòng
     bt-08 kernel xét MỘT bộ ba · rwx của thư mục là bảng tên · quyền chạm phần cứng đến từ nhóm
     bt-09 kill là lời đề nghị · load average là số đếm · jobs là sổ của shell
     bt-10 đường ống chỉ mang fd 1 · không phải lệnh nào cũng đọc stdin · giá thật của file tạm
     bt-11 uniq chỉ so với dòng liền trước · sed -i thay inode · BRE đổi nghĩa
     bt-12 chỉ mục là bản chụp trên đĩa · bao đóng phụ thuộc · .deb là thứ phái sinh
     bt-13 shebang chỉ có hiệu lực khi kernel khởi chạy · set -e ngoảnh mặt · hàm trả về trạng thái
     bt-14 int/long không có độ rộng cố định · byte đệm và thứ tự trường · volatile
   Ba trục của bt-15 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 19/08/2026, gcc 15.2.0 (Ubuntu
   15.2.0-16ubuntu1), __STDC_VERSION__ = 202311. Bốn điều đo được nằm ngoài
   dự đoán và đã được điều tra tới tận gốc trước khi dùng (§2 quy tắc 2):

   1 · `implicit declaration of function` là LỖI, không phải cảnh báo, trên
       gcc 15 — kể cả khi ép -std=gnu17. Câu chuyện hai bước quen thuộc
       ("cảnh báo ở giai đoạn 2, rồi chết ở giai đoạn 4 với undefined
       reference") KHÔNG tái hiện được trên máy này: build dừng ngay ở giai
       đoạn 2. Dòng `Lỗi thường gặp` tương ứng trong lessons/bai-15.js đã
       được sửa cùng ngày. Hệ quả cho bộ này: mọi câu về undefined reference
       phải có KHAI BÁO đầy đủ (prototype), nếu không nó chết sớm hơn một
       giai đoạn.
   2 · Demo "quên -lm" KHÔNG tái hiện nếu tham số là hằng số: `sqrt(2.0)` bị
       gấp hằng ngay ở giai đoạn 2, `nm root_const.o` không có `U sqrt` nào
       và bản build liên kết trót lọt mà không cần -lm. Phải đưa giá trị vào
       lúc chạy (`atof(argv[1])`) thì `U sqrt` mới xuất hiện và liên kết mới
       hỏng. Đây là lõi của C2.
   3 · Demo "static giấu ký hiệu" KHÔNG chạy được nếu header khai báo hàm
       đó: gcc 15 báo thẳng `error: static declaration of 'scale' follows
       non-static declaration` ở giai đoạn 2 và không bao giờ tới được giai
       đoạn 4. Khai báo phải nằm ở file GỌI, không nằm trong header dùng
       chung. Đây là lõi của C4.
   4 · Trong ba cái bẫy macro, gcc -Wall -Wextra chỉ bắt được ĐÚNG MỘT: bẫy
       tính nhiều lần (`-Wsequence-point`). Hai bẫy thiếu ngoặc chạy ra kết
       quả sai HOÀN TOÀN IM LẶNG. Vì vậy B6 hỏi "build sạch có chứng minh
       được gì không" chứ không dạy rằng trình biên dịch sẽ nhắc bạn.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-15',
  minutes: 90,

  intro:
    '<p>Bài 14 dạy bạn viết C. Bài 15 dạy bạn thứ mà <b>mọi</b> giờ debug sau này đều cần: ' +
    'một lệnh <code>gcc</code> thực ra là <b>bốn chương trình chạy nối tiếp</b>, và mỗi ' +
    'chương trình báo lỗi bằng một giọng riêng. Người mới thấy "build lỗi" là một khối duy ' +
    'nhất và mở file <code>.c</code> ra sửa mò. Người biết nghề đọc dòng đầu tiên của thông ' +
    'báo, biết ngay lỗi sinh ra ở giai đoạn nào, và đã khoanh vùng xong một nửa.</p>' +
    '<p>Bộ bài tập này xoáy vào ba câu hỏi mà bạn sẽ dùng lại ở mọi bài còn lại của khoá ' +
    'học — từ <code>make</code> ở bài 16 tới build kernel ở Chặng 07: ' +
    '<b>bộ tiền xử lý thực sự sinh ra văn bản gì?</b> · ' +
    '<b>biên dịch sạch chứng minh được điều gì, và KHÔNG chứng minh được điều gì?</b> · ' +
    '<b>thông báo này đến từ giai đoạn nào?</b></p>' +
    '<p><b>Chia làm hai lượt, và khoảng cách giữa hai lượt là một thành phần của bài, ' +
    'không phải sự trì hoãn:</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài 15</b> (~25 phút): phần <b>A</b> và <b>B</b>. ' +
    'Củng cố lúc kiến thức còn nóng.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (~65 phút): phần <b>C</b>, <b>D</b> và <b>E</b>. ' +
    'Nhớ lại sau khi đã quên một phần mạnh hơn nhớ lại ngay rất nhiều.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần một terminal WSL. Mọi con số và mọi transcript trong bộ này đều đã ' +
    'được đo thật trên chính máy bạn — nếu bạn chạy lại và ra số khác, con số của bạn mới là ' +
    'đúng, và chênh lệch đó đáng để tìm hiểu.</p>',

  truc: [
    { id: 'preprocess',
      name: 'Bộ tiền xử lý chỉ thay văn bản — nó không biết C, không biết ưu tiên toán tử',
      x: 'Macro không phải hàm. Nó là phép thay chuỗi thuần tuý, xảy ra trước khi bất kỳ ' +
         'thứ gì hiểu C nhìn vào mã, nên kết quả có thể sai hoàn toàn mà không một cảnh ' +
         'báo nào được phát ra.',
      mis: 'Macro là một hàm, chỉ nhanh hơn — thêm ngoặc chỉ cho đẹp.' },

    { id: 'decl-def',
      name: 'Khai báo đủ cho giai đoạn 2; định nghĩa chỉ bị đòi ở giai đoạn 4',
      x: 'gcc -c chạy sạch chỉ chứng minh trình biên dịch biết KIỂU của thứ bạn gọi. Việc ' +
         'mã máy của nó có tồn tại ở đâu đó hay không là câu hỏi của bộ liên kết, và câu ' +
         'hỏi ấy chỉ được đặt ra ở giai đoạn cuối cùng.',
      mis: 'Biên dịch xong không lỗi nghĩa là chương trình đã đầy đủ.' },

    { id: 'stage',
      name: 'Mỗi thông báo lỗi tự tố cáo giai đoạn đã sinh ra nó',
      x: 'header "No such file or directory" luôn là giai đoạn 1; "error:" kèm ' +
         'file.c:dòng:cột là giai đoạn 2; "undefined reference" và "multiple definition" ' +
         'kèm tên ld luôn là giai đoạn 4. Đọc đúng dòng đầu là khoanh vùng xong một nửa.',
      mis: 'Lỗi build nào cũng là lỗi trình biên dịch, cứ mở file .c ra sửa.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Một file có hai dòng sau:<br><br>' +
         '<code>#define HALF_BAD(x) (x)/2</code><br>' +
         '<code>printf("%d\\n", 100 / HALF_BAD(10));</code><br><br>' +
         'Chương trình in ra số nào?',
      opts: [
        '<b>20</b> — vì <code>HALF_BAD(10)</code> cho 5, và <code>100 / 5 = 20</code>.',
        '<b>5</b> — vì sau khi thay văn bản, dòng đó là <code>100 / (10) / 2</code>, tính từ trái sang phải.',
        'Không in gì: trình biên dịch báo lỗi vì macro thiếu ngoặc bao ngoài.',
        '<b>50</b> — vì tham số <code>x</code> được thay bằng <code>100</code>.'
      ],
      a: 1,
      why: '<b>In ra 5.</b> Đây là toàn bộ bài học của giai đoạn 1 gói trong một dòng: ' +
           'bộ tiền xử lý <b>không tính toán gì cả</b>, nó chỉ dán chuỗi. Sau khi dán, ' +
           'giai đoạn 2 nhìn thấy đúng văn bản <code>100 / (10) / 2</code> — và ' +
           '<code>/</code> kết hợp từ trái sang phải, nên nó là <code>(100 / 10) / 2 = 5</code>. ' +
           'Ngoặc quanh <code>x</code> có đủ, nhưng ngoặc quanh <b>toàn bộ biểu thức</b> thì ' +
           'không: viết <code>#define HALF_GOOD(x) ((x)/2)</code> mới ra 20.<br>' +
           'Điều đáng sợ hơn cả kết quả sai: <b>không có cảnh báo nào</b>. Đã đo trên máy ' +
           'bạn với <code>gcc -Wall -Wextra</code> — im lặng tuyệt đối. Nếu ' +
           '<code>HALF_BAD</code> là một macro tính chu kỳ timer, firmware của bạn chạy sai ' +
           'gấp bốn lần và không ai được báo.<br>' +
           'Cách kiểm chứng trong hai giây thay vì đoán: <code>gcc -E file.c | tail -20</code> ' +
           'in ra chính xác văn bản mà trình biên dịch nhìn thấy.' },

    { id: 'a2', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn chạy <code>gcc -o app app.o util.o</code> và nhận về:<br><br>' +
         '<code>/usr/bin/x86_64-linux-gnu-ld.bfd: app.o: in function `main\':</code><br>' +
         '<code>app.c:(.text+0x30): undefined reference to `scale\'</code><br>' +
         '<code>collect2: error: ld returned 1 exit status</code><br><br>' +
         'Thông báo này sinh ra ở giai đoạn nào, và điều đó nói gì về file <code>app.c</code>?',
      opts: [
        'Giai đoạn 2 (biên dịch) — <code>app.c</code> có lỗi cú pháp ở dòng chứa <code>scale</code>.',
        'Giai đoạn 1 (tiền xử lý) — thiếu một <code>#include</code> khai báo <code>scale</code>.',
        'Giai đoạn 4 (liên kết) — <code>app.c</code> đã biên dịch <b>thành công</b>; cái thiếu là <b>định nghĩa</b> của <code>scale</code>, phải tìm ở file khác chứ không phải ở <code>app.c</code>.',
        'Giai đoạn 3 (hợp dịch) — <code>as</code> không mã hoá được lời gọi hàm.'
      ],
      a: 2,
      why: '<b>Giai đoạn 4.</b> Ba dấu hiệu, mỗi dấu hiệu tự nó đã đủ kết luận: tên chương ' +
           'trình <code>ld.bfd</code> (bộ liên kết), cụm <code>undefined reference</code> — ' +
           'chỉ bộ liên kết mới nói câu này — và <code>collect2</code>, cái vỏ mà gcc dùng ' +
           'để gọi <code>ld</code>.<br>' +
           'Điều quan trọng hơn là <b>suy ra ngược</b>: nếu giai đoạn 4 đã chạy thì giai ' +
           'đoạn 1, 2, 3 đều đã xong sạch. <code>app.c</code> <b>không có lỗi</b>. Mở nó ra ' +
           'sửa cú pháp là đang tìm ở sai chỗ. Việc cần làm là hỏi: định nghĩa của ' +
           '<code>scale</code> nằm ở file nào, file đó đã có mặt trên dòng lệnh chưa, và nếu ' +
           'có rồi thì vì sao ký hiệu vẫn không thấy (xem C4).<br>' +
           'Cả đoạn <code>app.c:(.text+0x30)</code> cũng không phải số dòng — đó là ' +
           '<b>độ lệch byte</b> trong section <code>.text</code> của <code>app.o</code>. ' +
           'Giai đoạn 4 không còn nhìn thấy mã C nữa, nó chỉ còn thấy byte và tên ký hiệu.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trong bốn chương trình mà <code>gcc</code> gọi lần lượt, chương trình nào biến file ' +
         '<code>.s</code> thành file <code>.o</code>?',
      opts: [
        '<code>cc1</code> — trình biên dịch C thực sự.',
        '<code>as</code> — trình hợp dịch.',
        '<code>ld</code> — bộ liên kết.',
        '<code>collect2</code> — bộ điều phối của gcc.'
      ],
      a: 1,
      why: '<b><code>as</code> (assembler, trình hợp dịch).</b> Chuỗi đầy đủ: ' +
           '<code>cc1 -E</code> làm <code>.c</code> → <code>.i</code>, <code>cc1</code> làm ' +
           '<code>.i</code> → <code>.s</code>, <code>as</code> làm <code>.s</code> → ' +
           '<code>.o</code>, <code>ld</code> (qua <code>collect2</code>) làm ' +
           '<code>.o</code> + thư viện → file thực thi.<br>' +
           'Vì sao đáng nhớ chứ không phải là chuyện thuộc lòng vô ích: ba giai đoạn đầu ' +
           '<b>chỉ nhìn thấy một file</b>, giai đoạn 4 mới nhìn thấy toàn bộ chương trình. ' +
           'Đó là lý do bạn biên dịch được từng file riêng lẻ, là lý do <code>make</code> ở ' +
           '<b>Bài 16</b> có ý nghĩa, và là lý do <code>undefined reference</code> không thể ' +
           'xuất hiện sớm hơn giai đoạn 4.<br>' +
           'Đây cũng là ranh giới mà kernel khai thác: bạn có thể viết assembly bằng tay rồi ' +
           'đưa thẳng cho <code>as</code>, bỏ qua hai giai đoạn đầu — Chặng 07 sẽ cho bạn ' +
           'thấy những file <code>.S</code> làm đúng việc đó.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một file <code>.c</code> có một khối bị vô hiệu hoá, và <b>bên trong khối đó có lỗi ' +
         'cú pháp nặng</b>:<br><br>' +
         '<code>#if 0</code><br>' +
         '<code>    this is not C at all ((( ;</code><br>' +
         '<code>#endif</code><br><br>' +
         'Biên dịch file này bằng <code>gcc -Wall -Wextra -c</code> thì sao?',
      opts: [
        'Lỗi ở giai đoạn 2: trình biên dịch vẫn phải phân tích cú pháp mọi dòng trong file.',
        'Không lỗi, nhưng có cảnh báo báo rằng khối mã bị vô hiệu hoá không hợp lệ.',
        'Không lỗi và không cảnh báo: giai đoạn 1 <b>xoá hẳn</b> khối đó, nên giai đoạn 2 chưa từng nhìn thấy nó.',
        'Lỗi ở giai đoạn 1: bộ tiền xử lý phát hiện văn bản không phải C.'
      ],
      a: 2,
      why: '<b>Không lỗi, không cảnh báo.</b> <code>#if</code> / <code>#ifdef</code> không ' +
           '"bỏ qua lúc chạy" — chúng <b>cắt bỏ văn bản</b>. Sau giai đoạn 1, những dòng đó ' +
           'không còn tồn tại trong file <code>.i</code>, và giai đoạn 2 chỉ đọc ' +
           '<code>.i</code>.<br>' +
           'Hệ quả thực dụng, và nó cắn người ta thật: <b>mã nằm trong một nhánh cấu hình ' +
           'bạn không bật thì không bao giờ được kiểm tra</b>. Trong kernel, một driver nằm ' +
           'sau <code>#ifdef CONFIG_FOO</code> có thể mục ruỗng hàng năm trời mà không ai ' +
           'biết, cho tới ngày có người bật <code>CONFIG_FOO</code> lên và nhận về ba mươi ' +
           'lỗi cú pháp. Đây là lý do các bản build tự động của kernel chạy nhiều cấu hình ' +
           'khác nhau chứ không chỉ một.<br>' +
           'Muốn thấy tận mắt: <code>gcc -E file.c | grep -c .</code> trước và sau khi đổi ' +
           '<code>#if 0</code> thành <code>#if 1</code>.' },

    { id: 'a5', k: 'tf', truc: 1, tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"<code>gcc -c app.c</code> chạy xong, không một lỗi nào, không một ' +
         'cảnh báo nào. Vậy là mọi hàm mà <code>app.c</code> gọi đều đã tồn tại ở đâu đó ' +
         'trong dự án."</i></blockquote>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng — nói rõ <code>gcc -c</code> sạch thì chứng minh được ' +
          'điều gì và KHÔNG chứng minh được điều gì.',
      why: '<b>Sai.</b> Cờ <code>-c</code> nghĩa là "chạy tới hết giai đoạn 3 rồi ' +
           '<b>dừng</b>" — nó cố tình <b>không</b> liên kết. Mà câu hỏi "hàm này có định ' +
           'nghĩa ở đâu không" chỉ được đặt ra ở giai đoạn 4. Thứ giai đoạn 2 cần chỉ là ' +
           '<b>khai báo</b>: tên, kiểu trả về, kiểu tham số — đủ để sinh ra một lời gọi đúng ' +
           'quy ước, với địa chỉ đích để trống kèm ghi chú "chỗ này cần ký hiệu tên X".<br>' +
           'Đây không phải chuyện lý thuyết: <code>nm calc.o</code> trên một file vừa biên ' +
           'dịch <b>hoàn toàn sạch</b> vẫn liệt kê bốn ký hiệu chưa định nghĩa ' +
           '(<code>U printf</code>, <code>U snprintf</code>, <code>U strlen</code>, ' +
           '<code>U __stack_chk_fail</code>). Nếu <code>gcc -c</code> đòi hỏi định nghĩa thì ' +
           'không file <code>.c</code> nào dùng <code>printf</code> biên dịch nổi.',
      crit: [
        'Nói rõ <code>-c</code> chỉ chạy tới hết giai đoạn 3 và <b>dừng lại</b>, chưa liên kết',
        'Nói rằng cái mà giai đoạn 2 cần là <b>khai báo</b> (prototype): tên, kiểu trả về, kiểu tham số',
        'Nói rằng <b>định nghĩa</b> (thân hàm, mã máy) chỉ bị đòi ở giai đoạn 4',
        'Nêu được thông báo sẽ xuất hiện nếu định nghĩa không tồn tại: <code>undefined reference</code>'
      ],
      sol: '<b>Sai.</b> Cách viết lại đúng: <i>"<code>gcc -c app.c</code> sạch chứng minh ' +
           'rằng mọi hàm <code>app.c</code> gọi đều đã được <b>khai báo</b> — trình biên dịch ' +
           'biết tên, kiểu trả về và kiểu tham số của chúng, đủ để sinh ra lời gọi đúng. Nó ' +
           '<b>không</b> chứng minh được rằng định nghĩa của các hàm đó tồn tại ở bất cứ đâu; ' +
           'câu hỏi ấy chỉ được đặt ra ở giai đoạn 4, và nếu câu trả lời là không thì bạn ' +
           'nhận <code>undefined reference</code>."</i><br><br>' +
           'Bằng chứng đo được trên máy bạn: <code>nm calc.o | grep \' U \'</code> liệt kê ' +
           '<code>__stack_chk_fail</code>, <code>printf</code>, <code>snprintf</code>, ' +
           '<code>strlen</code> — bốn ký hiệu <b>chưa có định nghĩa</b>, trong một file ' +
           '<code>.o</code> vừa biên dịch hoàn toàn sạch. Chữ <code>U</code> chính là câu ' +
           '"tôi không biết cái này ở đâu, người sau lo".<br>' +
           'Đây không phải chi tiết vụn: nó là lý do bạn chia được chương trình thành nhiều ' +
           'file, là lý do <code>printf</code> không cần nằm trong mã nguồn của bạn, và là ' +
           'lý do <b>Bài 16</b> có thể biên dịch lại đúng một file khi bạn sửa một file.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"Header guard (<code>#ifndef UTIL_H</code> / ' +
         '<code>#define UTIL_H</code> / <code>#endif</code>) đảm bảo rằng nội dung header ' +
         'chỉ được đưa vào chương trình <b>một lần duy nhất</b>, nên nó cũng ngăn được lỗi ' +
         '<code>multiple definition</code> khi hai file <code>.c</code> cùng ' +
         '<code>#include</code> header đó."</i></blockquote>',
      a: 1,
      rw: 'Viết lại cho đúng — nói rõ header guard bảo vệ phạm vi nào, và cái gì mới ngăn ' +
          'được <code>multiple definition</code>.',
      why: '<b>Sai.</b> Chữ "một lần duy nhất" đúng, nhưng thiếu mất phạm vi: một lần duy ' +
           'nhất <b>trong một đơn vị biên dịch</b>, chứ không phải trong cả chương trình. ' +
           'Macro <code>UTIL_H</code> chỉ tồn tại trong lần chạy giai đoạn 1 của đúng một ' +
           'file <code>.c</code>; sang file <code>.c</code> kế tiếp, giai đoạn 1 khởi động ' +
           'lại từ con số không và <code>UTIL_H</code> lại chưa được định nghĩa.<br>' +
           'Vậy nên nếu header chứa một <b>định nghĩa</b>, mỗi file <code>.o</code> có ' +
           'include header đó đều mang theo một bản của định nghĩa ấy — và giai đoạn 4 báo ' +
           '<code>multiple definition</code>, dù header guard hoàn toàn đầy đủ. Header guard ' +
           'chống lỗi <b>giai đoạn 2</b> (chép hai lần vào cùng một file thì khai báo trùng ' +
           'nhau); thứ chống lỗi <b>giai đoạn 4</b> là kỷ luật nội dung — header chỉ chứa ' +
           'khai báo, định nghĩa nằm ở đúng một file <code>.c</code>.',
      crit: [
        'Nói rõ header guard chỉ có tác dụng <b>trong một đơn vị biên dịch</b> (một file <code>.c</code> và toàn bộ header nó kéo theo)',
        'Nói rằng mỗi file <code>.c</code> được tiền xử lý <b>độc lập</b>, macro <code>UTIL_H</code> không sống sót qua file khác',
        'Nói rằng cách ngăn <code>multiple definition</code> là header chỉ chứa <b>khai báo</b>, còn định nghĩa nằm ở đúng một file <code>.c</code>',
        'Gắn được lỗi <code>multiple definition</code> vào <b>giai đoạn 4</b>, không phải giai đoạn 1'
      ],
      sol: '<b>Sai.</b> Cách viết lại đúng: <i>"Header guard chỉ ngăn header bị chép hai lần ' +
           '<b>vào cùng một đơn vị biên dịch</b>. Mỗi file <code>.c</code> chạy giai đoạn 1 ' +
           'riêng, và macro <code>UTIL_H</code> biến mất khi giai đoạn 1 của file đó kết ' +
           'thúc — nên nếu header chứa một <b>định nghĩa</b>, định nghĩa ấy sẽ có mặt trong ' +
           'mọi file <code>.o</code> đã include nó, và giai đoạn 4 báo ' +
           '<code>multiple definition</code>. Thứ ngăn được lỗi đó là kỷ luật nội dung: ' +
           'header chỉ chứa khai báo, định nghĩa nằm ở đúng một file <code>.c</code>."</i>' +
           '<br><br>' +
           'Transcript thật, đo trên máy bạn với một header chứa ' +
           '<code>int helper(int x) { return x + 1; }</code> và hai file cùng include nó — ' +
           'header guard đầy đủ, cả ba file biên dịch sạch:<br>' +
           '<code>/usr/bin/x86_64-linux-gnu-ld.bfd: two.o: in function `helper\':</code><br>' +
           '<code>two.c:(.text+0x0): multiple definition of `helper\'; ' +
           'one.o:one.c:(.text+0x0): first defined here</code><br>' +
           'Chuyển định nghĩa sang <code>helper.c</code> và để lại đúng dòng khai báo ' +
           '<code>int helper(int x);</code> trong header: chương trình liên kết được và in ' +
           '<code>2 3</code>.<br>' +
           'Ngoại lệ duy nhất đáng nhớ: <code>static inline</code> — bài 15 dùng ' +
           '<code>static inline int twice(int x)</code> đúng vì <code>static</code> làm mỗi ' +
           'file có bản riêng của mình, và các bản riêng thì không đụng nhau.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Một dự án có <b>3</b> file <code>.c</code> và đã build xong một lần. Bạn sửa đúng ' +
         '<b>một</b> file rồi build lại. Nếu công cụ build đủ khôn để chỉ làm phần việc cần ' +
         'thiết, số file <code>.c</code> phải chạy lại giai đoạn 1–3 là bao nhiêu?',
      a: ['1', 'mot', 'một', '1 file', 'một file'],
      ph: 'một con số',
      why: '<b>1.</b> Đây là hệ quả trực tiếp và quan trọng nhất của việc gcc tách làm bốn ' +
           'giai đoạn: <b>ba giai đoạn đầu chỉ nhìn thấy một file</b>. Hai file ' +
           '<code>.c</code> kia không đổi, nên hai file <code>.o</code> của chúng vẫn còn ' +
           'nguyên giá trị. Chỉ giai đoạn 4 buộc phải chạy lại, vì nó là giai đoạn duy nhất ' +
           'nhìn thấy toàn bộ chương trình — và nó chạy lại với <b>3</b> file ' +
           '<code>.o</code>, trong đó 1 file mới và 2 file cũ.<br>' +
           'Toàn bộ lý do <code>make</code> tồn tại nằm ở câu trên, và đó là ' +
           '<b>Bài 16</b>. Với 3 file thì tiết kiệm được 2/3 công sức — nghe không nhiều. ' +
           'Với kernel Linux, khoảng ba mươi nghìn file <code>.c</code>, sửa một dòng mà ' +
           'phải build lại tất cả là chênh lệch giữa <b>vài giây</b> và <b>gần một giờ</b>.<br>' +
           'Nếu bạn trả lời 3, rất có thể bạn đang nghĩ tới lệnh <code>gcc a.c b.c c.c -o ' +
           'app</code> — lệnh đó đúng là chạy lại cả ba, vì nó không lưu file ' +
           '<code>.o</code> nào để tái dùng.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi cờ của <code>gcc</code> với đúng việc nó làm. Bốn cờ đầu là bốn điểm ' +
         'dừng khác nhau trên cùng một dây chuyền — chú ý dừng ở đâu thì còn lại file gì.',
      left: [
        '<code>gcc -E</code>', '<code>gcc -S</code>', '<code>gcc -c</code>',
        '<code>gcc</code> (không cờ)', '<code>gcc -save-temps</code>', '<code>gcc -H</code>'
      ],
      right: [
        'Chạy hết cả bốn giai đoạn và <b>giữ lại</b> mọi file trung gian (<code>.i</code>, <code>.s</code>, <code>.o</code>) thay vì xoá chúng',
        'Dừng sau giai đoạn <b>2</b> — cho ra file <code>.s</code>, mã assembly còn đọc được bằng mắt',
        'Chạy hết cả bốn giai đoạn, xoá mọi file trung gian, chỉ để lại file thực thi',
        'Dừng sau giai đoạn <b>1</b> — cho ra văn bản đã ghép hết header và thay hết macro',
        'In ra <b>cây header</b>: file nào kéo theo file nào, mỗi mức lồng thêm một dấu chấm',
        'Dừng sau giai đoạn <b>3</b> — cho ra file <code>.o</code>, đã là mã máy nhưng chưa liên kết'
      ],
      a: [3, 1, 5, 2, 0, 4],
      why: '<b>Bốn điểm dừng, theo thứ tự dây chuyền: <code>-E</code> → <code>-S</code> → ' +
           '<code>-c</code> → không cờ.</b> Cách nhớ không cần học thuộc: mỗi cờ dừng sớm ' +
           'hơn thì file còn lại "gần mã nguồn" hơn.<br>' +
           'Hai cờ còn lại không phải điểm dừng mà là <b>ống nhòm</b>: ' +
           '<code>-save-temps</code> chạy hết dây chuyền nhưng không dọn dẹp, nên bạn có cả ' +
           'bốn file để so sánh cạnh nhau; <code>-H</code> trả lời câu hỏi "vì sao file ' +
           '<code>.i</code> của tôi phình lên 63 KB" bằng cách in ra cây header.<br>' +
           'Trong ba cờ dừng thì <code>-c</code> là cờ bạn sẽ gõ nhiều nhất suốt phần đời ' +
           'còn lại của khoá học, vì nó chính là bước mà <code>make</code> lặp lại cho từng ' +
           'file. Hai cờ kia là công cụ gỡ lỗi: <code>-E</code> khi macro cư xử lạ, ' +
           '<code>-S</code> khi bạn nghi trình biên dịch tối ưu mất thứ gì đó (đúng tình ' +
           'huống <code>volatile</code> của bài 14).' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output',
      q: 'Dưới đây là dữ liệu thật, đo trên máy bạn ngày 19/08/2026. Khối thứ nhất là ' +
         'phần đuôi file <code>mac.i</code> — tức là <b>chính xác</b> văn bản mà giai đoạn 2 ' +
         'nhìn thấy sau khi giai đoạn 1 làm xong việc. Khối thứ hai là kết quả chạy. Khối ' +
         'thứ ba là <b>toàn bộ</b> cảnh báo mà <code>gcc -Wall -Wextra</code> phát ra.<br><br>' +
         'Ba macro gốc là:<br>' +
         '<code>#define AREA_BAD(w,h)  w*h</code><br>' +
         '<code>#define AREA_GOOD(w,h) ((w)*(h))</code><br>' +
         '<code>#define HALF_BAD(x)    (x)/2</code><br>' +
         '<code>#define HALF_GOOD(x)   ((x)/2)</code><br>' +
         '<code>#define TWICE(x)       ((x)+(x))</code><br><br>' +
         'Trả lời ba câu: <b>(1)</b> ứng với mỗi trong ba kết quả sai, hãy chỉ ra dòng ' +
         'trong <code>mac.i</code> giải thích nó; <b>(2)</b> vì sao ' +
         '<code>TWICE(n++)</code> để lại <code>n = 5</code> chứ không phải 4; ' +
         '<b>(3)</b> vì sao gcc chỉ cảnh báo <b>một</b> trong ba cái bẫy, và điều đó nói gì ' +
         'về mức độ tin cậy của "build sạch"?',
      blocks: [
        { t: 'code', env: 'wsl', label: 'mac.i — dòng 851–856 (đã bỏ thụt đầu dòng cho gọn)',
          code:
            'printf("AREA_BAD(1+1, 2+2)  = %d\\n", 1 + 1 * 2 + 2);\n' +
            'printf("AREA_GOOD(1+1, 2+2) = %d\\n", ((1 + 1) * (2 + 2)));\n' +
            'printf("100 / HALF_BAD(10)  = %d\\n", 100 / (10) / 2);\n' +
            'printf("100 / HALF_GOOD(10) = %d\\n", 100 / ((10) / 2));\n' +
            'printf("TWICE(n++)          = %d\\n", ((n++) + (n++)));\n' +
            'printf("n is now            = %d\\n", n);' },
        { t: 'code', env: 'wsl', label: './mac — kết quả chạy thật (n khởi tạo = 3)',
          code:
            'AREA_BAD(1+1, 2+2)  = 5\n' +
            'AREA_GOOD(1+1, 2+2) = 8\n' +
            '100 / HALF_BAD(10)  = 5\n' +
            '100 / HALF_GOOD(10) = 20\n' +
            'TWICE(n++)          = 7\n' +
            'n is now            = 5' },
        { t: 'code', env: 'wsl', label: 'gcc -Wall -Wextra -o mac mac.c — toàn bộ cảnh báo',
          code:
            'mac.c:17:49: warning: operation on \'n\' may be undefined [-Wsequence-point]\n' +
            '   17 |     printf("TWICE(n++)          = %d\\n", TWICE(n++));\n' +
            '      |                                                 ^~~\n' +
            'mac.c:7:28: note: in definition of macro \'TWICE\'\n' +
            '    7 | #define TWICE(x)       ((x)+(x))\n' +
            '      |                            ^' } ],
      rows: 8,
      crit: [
        'Gắn <code>AREA_BAD(1+1, 2+2) = 5</code> với dòng <code>1 + 1 * 2 + 2</code> — thiếu ngoặc quanh <b>tham số</b>',
        'Gắn <code>100 / HALF_BAD(10) = 5</code> với dòng <code>100 / (10) / 2</code> — thiếu ngoặc quanh <b>toàn bộ biểu thức</b>',
        'Gắn <code>TWICE(n++) = 7</code> với dòng <code>((n++) + (n++))</code> — tham số bị chép <b>hai lần</b> nên <code>n++</code> chạy hai lần',
        'Nói rõ <code>n</code> đi từ 3 lên 5 vì tăng hai lần (3 → 4 → 5), và 7 = 3 + 4',
        'Nói rằng gcc chỉ bắt bẫy thứ ba vì đó là hành vi <b>không xác định</b> của C, còn hai bẫy kia là biểu thức hoàn toàn hợp lệ — chỉ là không phải cái bạn định viết',
        'Kết luận được: build sạch <b>không</b> chứng minh macro của bạn đúng'
      ],
      sol: '<b>(1) Ba dòng <code>.i</code>, ba cơ chế khác nhau.</b><br>' +
           '· <code>AREA_BAD(1+1, 2+2)</code> nở thành <code>1 + 1 * 2 + 2</code>. Bộ tiền ' +
           'xử lý dán <code>1+1</code> vào chỗ <code>w</code> và <code>2+2</code> vào chỗ ' +
           '<code>h</code>, không thêm một dấu ngoặc nào — vì nó <b>không biết</b> ' +
           '<code>w</code> là một biểu thức, nó chỉ thấy văn bản. Giai đoạn 2 mới đọc dòng ' +
           'đó và áp dụng ưu tiên toán tử: <code>1 + 2 + 2 = 5</code>. Bản đúng ' +
           '<code>((1 + 1) * (2 + 2))</code> cho 8.<br>' +
           '· <code>100 / HALF_BAD(10)</code> nở thành <code>100 / (10) / 2</code>. Ngoặc ' +
           'quanh <code>x</code> có, nhưng ngoặc quanh cả biểu thức thì không, nên phép chia ' +
           'thứ hai rơi ra ngoài và <code>/</code> kết hợp trái sang phải: ' +
           '<code>(100/10)/2 = 5</code>. Bản đúng <code>100 / ((10) / 2) = 100 / 5 = 20</code>.<br>' +
           '· <code>TWICE(n++)</code> nở thành <code>((n++) + (n++))</code>. Macro này ' +
           '<b>đã ngoặc đầy đủ</b> — không sửa được bằng ngoặc nữa. Vấn đề là tham số xuất ' +
           'hiện hai lần trong thân macro, nên văn bản <code>n++</code> bị chép hai lần.<br><br>' +
           '<b>(2)</b> <code>n</code> bắt đầu ở 3. Hai lần <code>n++</code> đẩy nó lên 5. ' +
           'Tổng in ra là 7, khớp với 3 + 4 — tức là lần đọc thứ hai đã thấy giá trị mới. ' +
           'Nhưng đừng học thuộc con số 7: thứ tự tính hai vế của <code>+</code> là ' +
           '<b>không xác định</b>, một trình biên dịch khác hoàn toàn có quyền cho 6, hoặc ' +
           'làm chuyện khác hẳn. "7" là kết quả của <i>gcc 15.2.0, hôm nay, ở mức tối ưu ' +
           'này</i>, không phải một quy tắc.<br><br>' +
           '<b>(3)</b> Đây là phần quan trọng nhất và cũng là phần dễ dạy sai nhất. Hai bẫy ' +
           'đầu tạo ra <b>mã hoàn toàn hợp lệ</b>: <code>1 + 1 * 2 + 2</code> là một biểu ' +
           'thức C đúng chuẩn, chỉ là nó không tính cái bạn tưởng. Trình biên dịch không có ' +
           'cách nào biết ý định của bạn, nên nó im lặng — và đã đo thật: ' +
           '<b>không một cảnh báo nào</b> cho cả hai. Bẫy thứ ba thì khác về bản chất: sửa ' +
           'cùng một biến hai lần giữa hai điểm tuần tự là <b>hành vi không xác định</b>, ' +
           'tức là vi phạm chuẩn C, nên gcc bắt được và gọi tên: ' +
           '<code>-Wsequence-point</code>.<br>' +
           'Kết luận phải rút ra: <b>"build sạch" chứng minh mã của bạn hợp lệ, không chứng ' +
           'minh mã của bạn đúng.</b> Với macro thì công cụ kiểm chứng duy nhất là ' +
           '<code>gcc -E</code> — nhìn thẳng vào văn bản đã nở, đúng như ba khối trên.' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output',
      q: 'Cùng một chương trình <code>calc.c</code>, đo thật trên máy bạn. Khối 1 là các ký ' +
         'hiệu <b>chưa được định nghĩa</b> trong file <code>.o</code> vừa biên dịch sạch. ' +
         'Khối 2 là hai ký hiệu trong file thực thi đã liên kết xong. Khối 3 là kích thước.' +
         '<br><br>' +
         'Trả lời: <b>(1)</b> chữ <code>U</code> nghĩa là gì, và vì sao nó xuất hiện trong ' +
         'một file <code>.o</code> mà trình biên dịch <b>không hề báo lỗi</b>? ' +
         '<b>(2)</b> <code>_start</code> đến từ đâu, khi <code>calc.c</code> không hề có ' +
         'hàm nào tên như vậy? <b>(3)</b> chênh lệch 1 800 → 16 072 byte gồm những gì?',
      blocks: [
        { t: 'code', env: 'wsl', label: "nm calc.o | grep ' U '",
          code:
            '                 U __stack_chk_fail\n' +
            '                 U printf\n' +
            '                 U snprintf\n' +
            '                 U strlen' },
        { t: 'code', env: 'wsl', label: 'nm calc | grep -E " T (_start|main)$"',
          code:
            '00000000000010c0 T _start\n' +
            '00000000000011a9 T main' },
        { t: 'code', env: 'wsl', label: 'ls -l calc.o calc  ·  ldd calc',
          code:
            '1800    calc.o\n' +
            '16072   calc\n' +
            '\n' +
            'linux-vdso.so.1 (0x00007ffd...)\n' +
            'libc.so.6 => /usr/lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)\n' +
            '/lib64/ld-linux-x86-64.so.2 (0x00007f...)' } ],
      rows: 8,
      crit: [
        '<code>U</code> = <b>undefined</b>: file này <b>dùng</b> ký hiệu đó nhưng không định nghĩa nó',
        'Nói rõ giai đoạn 2 chỉ cần <b>khai báo</b> (từ <code>stdio.h</code>, <code>string.h</code>) để sinh lời gọi đúng kiểu — nên không có gì để báo lỗi',
        'Nói rằng bốn ký hiệu này được giải quyết ở <b>giai đoạn 4</b>, từ libc',
        '<code>_start</code> đến từ mã khởi động của C (<code>crt1.o</code>/libc) mà <code>ld</code> tự thêm vào — nó mới là điểm vào thật, <code>main</code> chỉ là hàm nó gọi',
        'Chênh lệch gồm mã khởi động, bảng liên kết động, header ELF/section — <b>không</b> gồm mã của <code>printf</code>, vì libc được nạp lúc chạy (thấy qua <code>ldd</code>)'
      ],
      sol: '<b>(1)</b> <code>U</code> là <b>undefined</b>. File <code>calc.o</code> chứa các ' +
           'lời gọi <code>printf</code>, <code>snprintf</code>, <code>strlen</code> — mã máy ' +
           'của lời gọi đã sinh xong, nhưng địa chỉ đích còn để trống, kèm một mẩu ghi chú ' +
           '"chỗ này cần ký hiệu tên <code>printf</code>". Vì sao trình biên dịch không kêu: ' +
           'nó chỉ cần <b>khai báo</b>. <code>#include &lt;stdio.h&gt;</code> đã cho nó biết ' +
           '<code>printf</code> nhận <code>const char *</code> và trả <code>int</code> — đủ ' +
           'để sinh lời gọi đúng quy ước. Câu hỏi "mã của <code>printf</code> ở đâu" thuộc ' +
           'về giai đoạn 4, và ở giai đoạn 3 chưa ai hỏi nó cả. Đây chính là trục 1 hiện ra ' +
           'dưới dạng dữ liệu.<br>' +
           '<code>__stack_chk_fail</code> là kẻ lạ mặt thú vị: bạn không gọi nó bao giờ. ' +
           'Trình biên dịch <b>tự thêm</b> mã kiểm tra tràn ngăn xếp (bật mặc định trên ' +
           'Ubuntu) và mã đó gọi hàm này khi phát hiện hỏng. Bài học phụ: file ' +
           '<code>.o</code> chứa nhiều thứ hơn những gì bạn viết.<br><br>' +
           '<b>(2)</b> <code>_start</code> là <b>điểm vào thật</b> của chương trình — thứ mà ' +
           'kernel nhảy tới sau khi nạp file thực thi. Nó không có trong ' +
           '<code>calc.o</code>; <code>ld</code> tự thêm một file đối tượng khởi động của ' +
           'libc (<code>crt1.o</code> và bạn bè) vào lúc liên kết. Nhiệm vụ của ' +
           '<code>_start</code>: dựng ngăn xếp, gom <code>argc</code>/<code>argv</code>/môi ' +
           'trường, khởi tạo libc, <b>rồi mới gọi <code>main</code></b>, và khi ' +
           '<code>main</code> trả về thì gọi <code>exit()</code> với giá trị đó. Câu ' +
           '"<code>main</code> là nơi chương trình bắt đầu" là cách nói tiện, không phải ' +
           'sự thật — <code>main</code> chỉ là một hàm bình thường được gọi từ chỗ khác.<br><br>' +
           '<b>(3)</b> 1 800 → 16 072 byte, chênh <b>14 272 byte</b>, và điều đáng nói nhất ' +
           'là <b>trong đó không có mã của <code>printf</code></b>. <code>ldd</code> chứng ' +
           'minh: <code>libc.so.6</code> vẫn nằm ngoài, được nạp lúc chạy bởi ' +
           '<code>/lib64/ld-linux-x86-64.so.2</code>. Chênh lệch là mã khởi động, bảng để ' +
           'liên kết động lúc chạy (danh sách "tôi cần <code>printf</code> từ ' +
           '<code>libc.so.6</code>"), header ELF và các section quản lý.<br>' +
           'Bằng chứng đối chứng đã đo: cùng chương trình đó build với <code>-static</code> ' +
           'cho <b>816 856 byte</b> — gấp 51 lần. Đó mới là kích thước khi mã libc thật sự ' +
           'bị nhét vào trong file. Ranh giới này là chủ đề của <b>Bài 17</b>, và trên một bo ' +
           'mạch nhúng chỉ có vài MB flash thì nó là quyết định thiết kế, không phải chi ' +
           'tiết kỹ thuật.' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Giải thích vì sao',
      q: 'Một đồng nghiệp nói: <i>"Tôi gọi một hàm không tồn tại ở đâu cả, vậy mà ' +
         '<code>gcc -c</code> không kêu gì. Trình biên dịch dở quá."</i><br><br>' +
         'Hãy giải thích trong 4–6 câu: <b>vì sao</b> giai đoạn 2 <b>về nguyên tắc</b> không ' +
         'thể phát hiện được chuyện đó, dù trình biên dịch có giỏi đến đâu. Sau đó nói rõ ' +
         'một chi tiết đã đo được trên máy này: nếu hàm đó <b>chưa hề được khai báo</b> thì ' +
         'gcc 15 <b>có</b> báo lỗi ngay ở giai đoạn 2 — nêu thông báo và giải thích vì sao ' +
         'trường hợp này khác.',
      rows: 7,
      crit: [
        'Nói rõ giai đoạn 2 <b>chỉ nhìn thấy một đơn vị biên dịch</b>, không biết dự án có bao nhiêu file khác',
        'Nói rằng định nghĩa hoàn toàn có thể nằm ở file <code>.c</code> khác hoặc trong một thư viện — nếu giai đoạn 2 báo lỗi thì việc chia file sẽ bất khả thi',
        'Kết luận: chỉ giai đoạn 4 mới có <b>toàn cảnh</b>, nên chỉ nó mới nói được <code>undefined reference</code>',
        'Nêu đúng thông báo khi thiếu khai báo: <code>error: implicit declaration of function \'nowhere\' [-Wimplicit-function-declaration]</code>',
        'Phân biệt được hai chuyện: <b>thiếu khai báo</b> = lỗi giai đoạn 2 (thiếu thông tin về KIỂU) · <b>thiếu định nghĩa</b> = lỗi giai đoạn 4 (thiếu mã máy)'
      ],
      sol: '<b>Vì sao giai đoạn 2 không thể biết.</b> Ba giai đoạn đầu chạy trên <b>đúng một ' +
           'đơn vị biên dịch</b>: một file <code>.c</code> cộng với mọi header nó kéo theo. ' +
           'Trình biên dịch không biết dự án có 3 file hay 30 000 file, không biết bạn sẽ ' +
           'liên kết với thư viện nào, thậm chí không biết có bao giờ liên kết hay không. ' +
           'Khi nó thấy một lời gọi tới <code>scale()</code> đã được khai báo, câu trả lời ' +
           'duy nhất đúng là: "định nghĩa có thể nằm ở nơi khác — chưa phải việc của tôi". ' +
           'Nếu nó báo lỗi ở đây, việc biên dịch từng file riêng lẻ sẽ <b>không thể tồn ' +
           'tại</b>, và cùng với nó là <code>make</code>, thư viện, và toàn bộ cách người ta ' +
           'xây phần mềm C. Chỉ giai đoạn 4 có toàn cảnh, nên chỉ nó nói được ' +
           '<code>undefined reference</code>. Đây không phải khiếm khuyết, đây là thiết kế.' +
           '<br><br>' +
           '<b>Chi tiết đã đo trên máy này, và nó tinh tế.</b> Nếu hàm chưa hề được khai ' +
           'báo, gcc 15 dừng ngay ở giai đoạn 2:<br>' +
           '<code>imp.c:2:33: error: implicit declaration of function \'nowhere\' ' +
           '[-Wimplicit-function-declaration]</code> (mã thoát 1, và vẫn là <b>lỗi</b> ngay ' +
           'cả khi ép <code>-std=gnu17</code>).<br>' +
           'Hai trường hợp khác nhau ở <b>loại thông tin bị thiếu</b>: thiếu <b>khai báo</b> ' +
           'là thiếu thông tin về <b>kiểu</b> — trình biên dịch không biết truyền tham số ' +
           'thế nào, không biết giá trị trả về rộng bao nhiêu, nên nó <i>không thể sinh mã</i> ' +
           'và phải dừng. Thiếu <b>định nghĩa</b> là thiếu <b>mã máy</b> — trình biên dịch ' +
           'sinh mã được hoàn hảo, chỉ để trống địa chỉ đích, và người phải lấp chỗ trống đó ' +
           'là bộ liên kết.<br>' +
           'Lưu ý cho ai đọc tài liệu cũ: sách và blog nhiều năm trước mô tả ' +
           '<code>implicit declaration</code> là <i>cảnh báo</i>, build vẫn đi tiếp rồi chết ' +
           'ở giai đoạn 4. Điều đó đúng với các trình biên dịch cũ; C23 đã bỏ hẳn khai báo ' +
           'ngầm, và trên gcc 15 nó là lỗi thẳng. Thấy cả hai kiểu hành xử là chuyện bình ' +
           'thường — cái không đổi là <b>lý do</b>.' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao',
      q: 'Hai file <code>one.c</code> và <code>two.c</code> cùng ' +
         '<code>#include "bad_util.h"</code>. Header có header guard <b>đầy đủ và đúng</b>, ' +
         'và chứa dòng:<br><br>' +
         '<code>int helper(int x) { return x + 1; }</code><br><br>' +
         'Cả ba file biên dịch sạch, không một cảnh báo. Khi liên kết thì nhận về:<br><br>' +
         '<code>two.c:(.text+0x0): multiple definition of `helper\'; ' +
         'one.o:one.c:(.text+0x0): first defined here</code><br><br>' +
         'Giải thích <b>vì sao header guard không cứu được</b>, và nêu quy tắc chung rút ra ' +
         'về việc cái gì được phép nằm trong header.',
      rows: 6,
      crit: [
        'Nói rõ mỗi file <code>.c</code> chạy giai đoạn 1 <b>độc lập</b>, macro guard không sống sót sang file khác',
        'Nói rằng header guard chống việc chép <b>hai lần vào cùng một</b> đơn vị biên dịch, không phải chống hai đơn vị khác nhau',
        'Chỉ ra hậu quả: <code>one.o</code> và <code>two.o</code> mỗi file đều chứa một bản <code>helper</code> đầy đủ',
        'Nêu quy tắc: header chứa <b>khai báo</b> (và macro, kiểu, <code>static inline</code>); <b>định nghĩa</b> nằm ở đúng một file <code>.c</code>',
        'Gắn lỗi vào <b>giai đoạn 4</b>, và nêu cách sửa: chuyển thân hàm sang <code>helper.c</code>'
      ],
      sol: '<b>Header guard làm đúng việc của nó — chỉ là việc đó không phải việc này.</b> ' +
           'Giai đoạn 1 chạy <b>một lần cho mỗi file <code>.c</code></b>, trong một thế giới ' +
           'hoàn toàn riêng. Khi tiền xử lý <code>one.c</code>, macro <code>BAD_UTIL_H</code> ' +
           'được định nghĩa, và nếu <code>bad_util.h</code> bị include lần thứ hai <i>trong ' +
           'chính lần chạy đó</i> thì nó bị bỏ qua — đó là toàn bộ công dụng của guard. ' +
           'Nhưng khi giai đoạn 1 của <code>one.c</code> kết thúc, mọi macro của nó ' +
           '<b>biến mất</b>. Lần chạy cho <code>two.c</code> bắt đầu từ con số không, ' +
           '<code>BAD_UTIL_H</code> lại chưa được định nghĩa, header lại được chép vào.<br>' +
           'Kết quả: <code>one.o</code> chứa một bản mã máy đầy đủ của <code>helper</code>, ' +
           '<code>two.o</code> chứa một bản nữa. Giai đoạn 2 không thể phàn nàn — mỗi file ' +
           'nhìn riêng đều hoàn toàn hợp lệ. Chỉ giai đoạn 4, khi <code>ld</code> đặt hai ' +
           'file cạnh nhau, mới thấy hai định nghĩa cùng tên và phải dừng: nó không có quyền ' +
           'chọn hộ bạn bản nào.<br><br>' +
           '<b>Quy tắc chung, và nó là một trong những quy tắc đáng nhớ nhất của C:</b> ' +
           'header là nơi để <b>hứa</b>, file <code>.c</code> là nơi để <b>thực hiện lời ' +
           'hứa</b>. Trong header được phép có: khai báo hàm (<code>int helper(int x);</code>), ' +
           'định nghĩa kiểu (<code>struct</code>, <code>typedef</code>), macro, hằng số, và ' +
           '<code>static inline</code>. Không được phép có: thân hàm, và biến toàn cục không ' +
           '<code>extern</code>.<br>' +
           'Đã kiểm chứng cách sửa trên máy bạn: để lại đúng dòng khai báo trong header, ' +
           'chuyển thân hàm sang <code>helper.c</code>, liên kết bốn file <code>.o</code> — ' +
           'chương trình chạy và in <code>2 3</code>.<br>' +
           '<code>static inline</code> là ngoại lệ được phép, và lý do khớp hoàn toàn với ' +
           'phân tích trên: <code>static</code> làm mỗi đơn vị biên dịch có bản <b>riêng</b> ' +
           'của mình, không xuất ra ngoài, nên hai bản không bao giờ gặp nhau ở giai đoạn 4.' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp',
      q: 'Đặt cạnh nhau hai cách viết cùng một ý:<br><br>' +
         '<b>A.</b> <code>#define TWICE(x) ((x)+(x))</code><br>' +
         '<b>B.</b> <code>static inline int twice(int x) { return x + x; }</code><br><br>' +
         'Chúng cho cùng kết quả với <code>twice(5)</code>. Câu hỏi không phải "cái nào tốt ' +
         'hơn" mà là: <b>khác biệt nào là khác biệt QUAN TRỌNG?</b> Nêu đúng một khác biệt ' +
         'quyết định, chứng minh bằng một lời gọi cụ thể mà hai cách cho kết quả khác nhau, ' +
         'rồi nói khi nào bạn vẫn buộc phải chọn A.',
      rows: 7,
      crit: [
        'Chỉ ra khác biệt quyết định: A thay <b>văn bản</b> nên tham số bị đánh giá <b>hai lần</b>; B là hàm nên tham số được đánh giá <b>đúng một lần</b>',
        'Đưa được lời gọi cụ thể phân biệt: <code>TWICE(n++)</code> so với <code>twice(n++)</code>',
        'Nêu số đo: với <code>n = 3</code>, A cho <b>7</b> và để lại <code>n = 5</code>; B cho <b>6</b> và để lại <code>n = 4</code>',
        'Nêu được ít nhất một điểm mạnh khác của B: có <b>kiểu</b>, nên gcc kiểm tra tham số và giá trị trả về',
        'Nêu một tình huống buộc phải dùng A: cần hoạt động trên <b>nhiều kiểu</b>, hoặc cần ghép chuỗi / <code>__FILE__</code> / <code>#</code>, hoặc dùng làm hằng số ở nơi đòi hằng biên dịch'
      ],
      sol: '<b>Khác biệt quyết định: số lần tham số được đánh giá.</b> Mọi thứ khác ' +
           '(tốc độ, kiểu, gỡ lỗi) đều là hệ quả hoặc thứ yếu so với điều này, vì đây là ' +
           'khác biệt duy nhất làm <b>đổi kết quả</b> của chương trình.<br>' +
           'A là phép thay văn bản: <code>TWICE(n++)</code> trở thành ' +
           '<code>((n++)+(n++))</code> — <code>n++</code> nằm đó <b>hai lần</b> và chạy hai ' +
           'lần. B là một hàm thật: <code>twice(n++)</code> tính <code>n++</code> đúng một ' +
           'lần, lấy giá trị đó truyền vào, cộng nó với chính nó.<br>' +
           'Số đo thật trên máy bạn với <code>n = 3</code>: A in <b>7</b> và để lại ' +
           '<code>n = 5</code>. B in <b>6</b> và để lại <code>n = 4</code>. Hai chương trình ' +
           'nhìn giống hệt nhau trong mã nguồn, cho hai kết quả khác nhau, và ' +
           '<b>chỉ một trong hai được gcc cảnh báo</b> (<code>-Wsequence-point</code> cho A).<br>' +
           'Lợi thế phụ nhưng đáng kể của B: nó có <b>kiểu</b>. Truyền một con trỏ vào ' +
           '<code>twice()</code> thì gcc kêu ngay; truyền vào <code>TWICE()</code> thì bộ ' +
           'tiền xử lý dán vào vui vẻ và lỗi hiện ra ở một dòng bạn không viết. B cũng đặt ' +
           'được điểm dừng khi gỡ lỗi, còn macro thì không tồn tại với trình gỡ lỗi. Còn ' +
           '"macro nhanh hơn" thì gần như luôn sai: <code>static inline</code> cho trình ' +
           'biên dịch quyền nhúng thẳng mã vào, kết quả thường giống hệt nhau.<br>' +
           '<b>Khi nào vẫn phải chọn A:</b> khi cần làm việc với nhiều kiểu cùng lúc ' +
           '(<code>MAX</code> cho cả <code>int</code> lẫn <code>float</code> — C không có ' +
           'hàm tổng quát), khi cần đến thứ chỉ bộ tiền xử lý làm được (ghép tên, ' +
           '<code>#x</code> biến tham số thành chuỗi, <code>__FILE__</code>/' +
           '<code>__LINE__</code> trong macro log), hoặc khi cần một hằng số biên dịch ' +
           '(cỡ mảng, <code>case</code>). Kernel Linux dùng cả hai, rất nhiều, và <b>Chặng ' +
           '07</b> sẽ cho bạn thấy những macro ba tầng lồng nhau — lúc đó ' +
           '<code>gcc -E</code> là bạn thân của bạn.' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một hướng dẫn nội bộ viết:<br><br>' +
         '<blockquote><i>"Quy trình của nhóm: build bằng <code>gcc -Wall -Wextra</code>, ' +
         'nếu không có cảnh báo nào thì mã đã an toàn để nạp lên bo mạch. Riêng macro thì ' +
         'khỏi lo — trình biên dịch sẽ báo nếu macro có vấn đề."</i></blockquote>' +
         'Câu này sai ở đâu? Chỉ ra chỗ sai, giải thích cơ chế, và đề xuất một bước kiểm tra ' +
         'cụ thể thay thế cho niềm tin đó.',
      rows: 6,
      crit: [
        'Chỉ đúng chỗ sai: cảnh báo bắt được mã <b>không hợp lệ</b>, không bắt được mã hợp lệ nhưng <b>sai ý định</b>',
        'Nêu bằng chứng đo được: hai bẫy thiếu ngoặc (<code>AREA_BAD</code>, <code>HALF_BAD</code>) chạy sai mà <b>không có cảnh báo nào</b>',
        'Nêu ngoại lệ đúng: chỉ bẫy đánh giá nhiều lần bị bắt, vì nó là <b>hành vi không xác định</b>',
        'Giải thích cơ chế: bộ tiền xử lý xong việc <b>trước khi</b> phần biết C của gcc nhìn vào — khi cảnh báo được sinh ra thì macro đã biến mất',
        'Đề xuất bước kiểm tra cụ thể: đọc <code>gcc -E</code> (hoặc <code>-save-temps</code> rồi mở <code>.i</code>), và/hoặc chuyển sang <code>static inline</code>'
      ],
      sol: '<b>Có hai câu sai, và câu thứ hai sai nặng hơn.</b><br><br>' +
           '<b>Sai 1 — "không cảnh báo nghĩa là an toàn".</b> Cảnh báo của trình biên dịch ' +
           'bắt được những thứ <i>không hợp lệ hoặc đáng ngờ về mặt ngôn ngữ</i>. Nó không ' +
           'có cách nào biết bạn <i>định</i> tính gì. <code>1 + 1 * 2 + 2</code> là C hoàn ' +
           'hảo.<br><br>' +
           '<b>Sai 2 — "macro thì khỏi lo".</b> Đây là chỗ ngược hẳn với sự thật: macro là ' +
           'nơi <b>ít</b> được bảo vệ nhất trong cả ngôn ngữ, chính xác vì bộ tiền xử lý ' +
           'chạy <b>trước</b> và không biết gì về C. Khi phần biết C của gcc bắt đầu nhìn ' +
           'vào mã, macro <b>đã không còn tồn tại</b> — chỉ còn lại văn bản đã nở. Không có ' +
           'ai để cảnh báo về.<br>' +
           'Bằng chứng đo trên chính máy bạn, với đầy đủ <code>-Wall -Wextra</code>: ' +
           '<code>AREA_BAD(1+1, 2+2)</code> cho <b>5</b> thay vì 8 — <b>không cảnh báo</b>. ' +
           '<code>100 / HALF_BAD(10)</code> cho <b>5</b> thay vì 20 — <b>không cảnh báo</b>. ' +
           'Hai trên ba cái bẫy đi lọt hoàn toàn im lặng. Cái thứ ba, ' +
           '<code>TWICE(n++)</code>, bị bắt — nhưng chỉ vì nó vi phạm chuẩn C ' +
           '(<code>-Wsequence-point</code>), không phải vì gcc hiểu ý định của bạn.<br><br>' +
           '<b>Bước kiểm tra thay thế:</b> với bất kỳ macro nào có tham số và có phép toán, ' +
           'chạy <code>gcc -E file.c | tail -30</code> (hoặc <code>-save-temps</code> rồi mở ' +
           '<code>.i</code>) và <b>đọc bằng mắt</b> dòng đã nở. Mất năm giây và nó là bằng ' +
           'chứng, không phải niềm tin. Biện pháp phòng ngừa dài hạn: ngoặc mọi tham số ' +
           '<i>và</i> ngoặc cả biểu thức, và khi macro không cần làm việc với nhiều kiểu thì ' +
           'dùng <code>static inline</code> — nó lấy lại toàn bộ hệ thống kiểm tra kiểu mà ' +
           'macro đã vứt bỏ.' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 chọn và biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 2, tag: 'Chẩn đoán',
      q: 'Ba đồng nghiệp gửi cho bạn ba thông báo lỗi, mỗi người một dòng đầu tiên, không ' +
         'kèm mã nguồn, không kèm dòng lệnh. Cả ba đều nói "gcc báo lỗi". Bạn <b>không</b> ' +
         'được hỏi thêm gì.<br><br>' +
         'Với <b>mỗi</b> thông báo, trả lời ba ý: <b>(a)</b> giai đoạn nào sinh ra nó và ' +
         'bạn nhận ra bằng dấu hiệu gì trong chính dòng đó; <b>(b)</b> những giai đoạn nào ' +
         'chắc chắn đã chạy <b>thành công</b> trước đó; <b>(c)</b> việc đầu tiên bạn bảo họ ' +
         'làm — và nói rõ việc đó <b>không</b> phải là gì.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'Người 1',
          code: 'miss.c:1:10: fatal error: not_a_real_header.h: No such file or directory\ncompilation terminated.' },
        { t: 'code', env: 'wsl', label: 'Người 2',
          code: 'imp.c:2:33: error: implicit declaration of function \'nowhere\' [-Wimplicit-function-declaration]' },
        { t: 'code', env: 'wsl', label: 'Người 3',
          code: '/usr/bin/x86_64-linux-gnu-ld.bfd: two.o: in function \'helper\':\ntwo.c:(.text+0x0): multiple definition of \'helper\'; one.o:one.c:(.text+0x0): first defined here\ncollect2: error: ld returned 1 exit status' } ],
      rows: 10,
      hint: 'Ba dấu hiệu để đọc: tên chương trình có xuất hiện không (<code>ld.bfd</code>, ' +
            '<code>collect2</code>) · toạ độ là <code>file:dòng:cột</code> hay ' +
            '<code>(.text+0x…)</code> · từ khoá đặc trưng (<code>No such file</code>, ' +
            '<code>implicit declaration</code>, <code>multiple definition</code>).',
      crit: [
        'Người 1 → <b>giai đoạn 1</b>, nhận ra vì đó là một <b>header</b> không mở được và có <code>compilation terminated</code>; <b>không</b> giai đoạn nào chạy xong trước đó',
        'Người 2 → <b>giai đoạn 2</b>, nhận ra vì toạ độ là <code>file.c:dòng:cột</code> và nội dung là chuyện <b>kiểu</b>; giai đoạn 1 đã xong',
        'Người 3 → <b>giai đoạn 4</b>, nhận ra vì có <code>ld.bfd</code>/<code>collect2</code> và toạ độ là <code>(.text+0x0)</code>; giai đoạn 1–3 đã xong cho <b>cả hai</b> file',
        'Việc cần làm 1: sửa tên header hoặc thêm đường tìm kiếm / cài gói <code>-dev</code> — <b>không</b> phải sửa mã C',
        'Việc cần làm 2: thêm <code>#include</code> hoặc khai báo nguyên mẫu — <b>không</b> phải đi tìm định nghĩa hàm',
        'Việc cần làm 3: chuyển <b>định nghĩa</b> ra khỏi header — <b>không</b> phải thêm header guard, và <b>không</b> phải mở <code>two.c</code> ra sửa cú pháp'
      ],
      sol: '<b>Người 1 — giai đoạn 1 (tiền xử lý).</b> Dấu hiệu: thứ không tìm thấy là một ' +
           '<b>file header</b>, và <code>compilation terminated</code> nghĩa là dây chuyền ' +
           'dừng ngay tại chỗ. Không giai đoạn nào chạy xong trước đó — đây là cửa đầu tiên. ' +
           'Việc cần làm: kiểm tra tên file, kiểm tra <code>&lt;&gt;</code> hay ' +
           '<code>""</code>, thêm <code>-I&lt;thư mục&gt;</code>, hoặc cài gói ' +
           '<code>-dev</code> chứa header đó (đúng kỹ năng của bài 12). ' +
           '<b>Không phải</b> mở mã C ra sửa logic: chưa một dòng C nào được đọc cả.<br><br>' +
           '<b>Người 2 — giai đoạn 2 (biên dịch).</b> Dấu hiệu: toạ độ ' +
           '<code>imp.c:2:33</code> là <code>file:dòng:cột</code> — chỉ giai đoạn 2 còn biết ' +
           'mã nguồn nằm ở dòng nào; và nội dung là chuyện <b>kiểu</b>, thứ chỉ có phần ' +
           'biết C của gcc quan tâm. Giai đoạn 1 đã xong sạch. Việc cần làm: thêm ' +
           '<code>#include</code> đúng, hoặc viết nguyên mẫu ' +
           '<code>int nowhere(int);</code>. <b>Không phải</b> đi tìm xem hàm ' +
           '<code>nowhere</code> được định nghĩa ở file nào — ở giai đoạn này gcc chưa hỏi ' +
           'câu đó, nó chỉ cần biết <b>kiểu</b>. Trên gcc 15 đây là <b>lỗi</b>, không phải ' +
           'cảnh báo: chuẩn C23 đã bỏ khai báo ngầm, và điều đó vẫn đúng ngay cả khi ép ' +
           '<code>-std=gnu17</code>.<br><br>' +
           '<b>Người 3 — giai đoạn 4 (liên kết).</b> Ba dấu hiệu độc lập, mỗi cái đủ để kết ' +
           'luận: tên <code>ld.bfd</code>, tên <code>collect2</code>, và toạ độ ' +
           '<code>(.text+0x0)</code> — <b>độ lệch byte</b>, không phải số dòng, vì giai đoạn ' +
           '4 không còn nhìn thấy mã C. Suy ra ngược: giai đoạn 1, 2, 3 đã chạy sạch cho ' +
           '<b>cả hai</b> file, nên <code>one.c</code> và <code>two.c</code> đều không có ' +
           'lỗi. Việc cần làm: một định nghĩa hàm đang nằm trong header — chuyển thân hàm ' +
           'sang một file <code>.c</code> riêng, để lại khai báo. <b>Không phải</b> thêm ' +
           'header guard (chuyện này đã đo: guard đầy đủ mà vẫn hỏng, xem B4), và ' +
           '<b>không phải</b> mở <code>two.c</code> ra sửa cú pháp.<br><br>' +
           '<b>Quy tắc gói gọn — dùng được suốt phần đời còn lại của khoá học:</b> đọc dòng ' +
           'đầu tiên và hỏi ba câu theo thứ tự. <i>Có tên <code>ld</code>/<code>collect2</code> ' +
           'không?</i> → giai đoạn 4, vấn đề nằm giữa các file hoặc ở dòng lệnh liên kết. ' +
           '<i>Có <code>file:dòng:cột</code> không?</i> → giai đoạn 2, vấn đề nằm trong đúng ' +
           'file đó. <i>Nói tới một header không mở được?</i> → giai đoạn 1, vấn đề nằm ở ' +
           'đường dẫn hoặc ở gói phần mềm. Giai đoạn 3 hầu như không bao giờ báo lỗi với mã ' +
           'C do gcc sinh ra — nếu nó báo, bạn đang viết assembly bằng tay.' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Tình huống mới',
      q: 'Bạn viết một công cụ hiệu chuẩn cảm biến. Nó dùng <code>sqrt()</code> từ ' +
         '<code>&lt;math.h&gt;</code>.<br><br>' +
         'Bản đầu tiên bạn thử nhanh với hằng số để xem in ra có đúng không:<br>' +
         '<code>printf("%f\\n", sqrt(2.0));</code> — biên dịch và liên kết ' +
         '<b>trót lọt</b> bằng <code>gcc -o cal cal.c</code>, chạy đúng.<br><br>' +
         'Hôm sau bạn đổi để đọc giá trị từ tham số dòng lệnh:<br>' +
         '<code>double x = atof(argv[1]);  printf("%f\\n", sqrt(x));</code> — ' +
         '<b>đúng lệnh gcc đó</b>, không sửa gì khác, và giờ nó hỏng:<br>' +
         '<code>cal.c:(.text+0x4e): undefined reference to `sqrt\'</code><br><br>' +
         'Trả lời bốn ý: <b>(1)</b> vì sao bản hằng số liên kết được mà bản kia không; ' +
         '<b>(2)</b> lệnh nào cho bạn thấy khác biệt đó <b>trước khi</b> liên kết, và bạn ' +
         'mong thấy gì; <b>(3)</b> cách sửa; <b>(4)</b> bài học tổng quát — vì sao "hôm qua ' +
         'nó build được" là một lập luận yếu.',
      rows: 9,
      hint: 'Câu hỏi cốt lõi: file <code>.o</code> có <b>yêu cầu</b> ký hiệu ' +
            '<code>sqrt</code> hay không? Bài 14 đã cho bạn công cụ để nhìn vào bảng ký hiệu.',
      crit: [
        'Nói rằng với hằng số, giai đoạn 2 <b>tính sẵn</b> kết quả (gấp hằng) nên lời gọi <code>sqrt</code> <b>biến mất</b> khỏi mã',
        'Nói rằng không có lời gọi thì file <code>.o</code> không có ký hiệu chưa định nghĩa nào tên <code>sqrt</code> — giai đoạn 4 không phải đi tìm gì',
        'Nêu lệnh kiểm chứng: <code>gcc -c cal.c</code> rồi <code>nm cal.o</code> (hoặc <code>nm cal.o | grep sqrt</code>)',
        'Nêu kết quả mong đợi: bản hằng số <b>không có</b> <code>U sqrt</code>; bản dùng <code>argv</code> <b>có</b> <code>U sqrt</code>',
        'Cách sửa: thêm <code>-lm</code>, và đặt nó <b>sau</b> các file <code>.o</code> trên dòng lệnh',
        'Bài học: build thành công chỉ chứng minh <b>tập ký hiệu của lần build đó</b> đã đủ; đổi mã có thể sinh ra yêu cầu mới mà dòng lệnh cũ không đáp ứng'
      ],
      sol: '<b>(1)</b> Với <code>sqrt(2.0)</code>, cả tham số lẫn hàm đều đã biết ở lúc biên ' +
           'dịch, nên giai đoạn 2 <b>tự tính luôn</b> — gcc biết <code>sqrt</code> là hàm ' +
           'toán học thuần tuý và thay cả biểu thức bằng hằng số ' +
           '<code>1.414213…</code>. Sau bước đó, trong mã <b>không còn lời gọi ' +
           '<code>sqrt</code> nào</b>. Giai đoạn 4 không phải tìm gì, nên không thiếu gì, ' +
           'nên không cần <code>-lm</code>. Với <code>atof(argv[1])</code> thì giá trị chỉ ' +
           'biết lúc chạy, gcc buộc phải sinh một lời gọi thật, và lời gọi đó cần mã máy của ' +
           '<code>sqrt</code> — mã ấy nằm trong <code>libm</code>, thư viện mà gcc ' +
           '<b>không</b> tự liên kết.<br><br>' +
           '<b>(2)</b> <code>gcc -c cal.c</code> rồi <code>nm cal.o</code>. Đo thật trên máy ' +
           'bạn:<br>' +
           '· bản hằng số → chỉ có <code>T main</code> và <code>U printf</code>. ' +
           '<b>Không có <code>U sqrt</code>.</b><br>' +
           '· bản dùng <code>argv</code> → <code>U atof</code>, <code>T main</code>, ' +
           '<code>U printf</code>, <b><code>U sqrt</code></b>.<br>' +
           'Đó là toàn bộ câu chuyện, hiện ra thành một dòng. <code>nm</code> trả lời được ' +
           'câu "giai đoạn 4 sắp phải đi tìm những gì" <b>trước khi</b> giai đoạn 4 chạy — ' +
           'và đó là kỹ năng chẩn đoán đắt giá nhất của cả bài này.<br><br>' +
           '<b>(3)</b> <code>gcc -o cal cal.o -lm</code>. Vị trí quan trọng: ' +
           '<code>-lm</code> phải đứng <b>sau</b> file cần nó. Bộ liên kết đọc dòng lệnh từ ' +
           'trái sang phải và chỉ lấy từ thư viện những ký hiệu <i>đang còn thiếu tại thời ' +
           'điểm nó đọc tới đó</i>; viết <code>gcc -lm cal.o</code> thì lúc đọc ' +
           '<code>-lm</code> chưa ai thiếu <code>sqrt</code> cả, nên nó bỏ qua và bạn nhận ' +
           'lại đúng thông báo cũ. Đã kiểm chứng cách sửa: liên kết thành công, ' +
           '<code>./cal 9</code> in <code>sqrt(9.000000) = 3.000000</code>.<br><br>' +
           '<b>(4)</b> "Hôm qua nó build được" chỉ chứng minh rằng <b>tập ký hiệu chưa định ' +
           'nghĩa của hôm qua</b> đã được dòng lệnh hôm qua đáp ứng. Sửa mã là sửa tập ký ' +
           'hiệu đó — thêm một lời gọi, bỏ một hằng số, đổi mức tối ưu, và tập ấy thay đổi. ' +
           'Đây là lý do các hệ thống build thật (bài 16 trở đi) khai báo thư viện ' +
           '<b>một cách tường minh</b> ngay từ đầu thay vì thêm dần mỗi khi liên kết hỏng. ' +
           'Và ghi nhớ trường hợp ngược lại, nó bẫy nhiều người hơn: mã <b>tốt hơn</b> ' +
           '(dùng hằng số, hoặc bật <code>-O2</code> để gcc tính sẵn) có thể làm một thư ' +
           'viện thiếu <b>trở nên vô hình</b> — cho tới lần build sau.' },

    { id: 'c3', k: 'free', truc: 0, tag: 'Tình huống mới',
      q: 'Bạn nhận bàn giao mã firmware của một bo mạch. Trong đó có macro ghi log:<br><br>' +
         '<code>#define LOG_ADC(ch) printf("ch%d = %d\\n", ch, read_adc(ch))</code><br><br>' +
         'Nó được gọi ở nhiều nơi, và ở một chỗ người ta viết ' +
         '<code>LOG_ADC(next_channel())</code>, với <code>next_channel()</code> là hàm mỗi ' +
         'lần gọi lại nhảy sang kênh kế tiếp. Log in ra <code>ch3 = …</code> nhưng giá trị ' +
         'lại là của kênh 4, và một kênh bị bỏ qua hoàn toàn ở mỗi vòng.<br><br>' +
         '<b>Ràng buộc:</b> bạn <b>không được đổi</b> chỗ gọi (mã đó nằm ở 40 file khác nhau ' +
         'và không thuộc quyền bạn), và tên <code>LOG_ADC</code> phải giữ nguyên.<br><br>' +
         'Trả lời: <b>(1)</b> giải thích chính xác chuyện gì xảy ra, dùng văn bản sau khi ' +
         'nở; <b>(2)</b> thêm ngoặc có cứu được không, vì sao; <b>(3)</b> đưa ra một bản ' +
         'sửa <b>thoả cả hai ràng buộc</b> và giải thích vì sao nó đúng; <b>(4)</b> nêu lệnh ' +
         'bạn sẽ chạy để chứng minh bản sửa đã đúng, trước khi nạp lên bo mạch.',
      rows: 10,
      crit: [
        'Viết ra được văn bản đã nở: <code>printf("ch%d = %d\\n", next_channel(), read_adc(next_channel()))</code>',
        'Nói rõ <code>next_channel()</code> chạy <b>hai lần</b>, nên số kênh in ra và kênh được đọc là <b>hai kênh khác nhau</b>',
        'Trả lời dứt khoát: <b>ngoặc không cứu được</b> — vấn đề là tham số bị chép hai lần, không phải ưu tiên toán tử',
        'Bản sửa: biến <code>LOG_ADC</code> thành <code>static inline void LOG_ADC(int ch)</code>, hoặc macro gọi vào một hàm nhận tham số đúng một lần',
        'Giải thích vì sao đúng: hàm đánh giá tham số <b>đúng một lần</b>, và chỗ gọi <b>không phải sửa</b> vì cú pháp gọi giống hệt',
        'Lệnh chứng minh: <code>gcc -E</code> (hoặc <code>-save-temps</code>) rồi đọc dòng đã nở tại chỗ gọi'
      ],
      sol: '<b>(1)</b> Sau giai đoạn 1, chỗ gọi trở thành:<br>' +
           '<code>printf("ch%d = %d\\n", next_channel(), read_adc(next_channel()));</code><br>' +
           'Tham số <code>ch</code> xuất hiện <b>hai lần</b> trong thân macro, nên văn bản ' +
           '<code>next_channel()</code> được chép vào hai chỗ và <b>chạy hai lần</b>. Lần ' +
           'thứ nhất trả về 3 và in ra; lần thứ hai đã nhảy sang 4 và đó mới là kênh được ' +
           'đọc. Kênh bị "bỏ qua" mỗi vòng chính là hệ quả số học của việc bộ đếm nhảy hai ' +
           'bước cho mỗi lần log.<br>' +
           'Lưu ý cách hỏng: <b>hoàn toàn im lặng</b>. Không lỗi, không cảnh báo — ' +
           '<code>-Wsequence-point</code> không áp dụng ở đây vì các tham số của ' +
           '<code>printf</code> có điểm tuần tự phân cách. Chỉ có một cột số liệu sai trong ' +
           'log, và người ta thường đổ cho phần cứng trước khi nghi ngờ macro.<br><br>' +
           '<b>(2) Không.</b> Ngoặc chữa được hai cái bẫy <i>khác</i> — thiếu ngoặc quanh ' +
           'tham số và thiếu ngoặc quanh biểu thức, cả hai đều là chuyện ưu tiên toán tử. ' +
           'Ở đây biểu thức không hề bị hiểu sai; vấn đề là nó <b>có mặt hai lần</b>. ' +
           'Viết <code>((ch))</code> thì vẫn có hai lần. Đây là bẫy thứ ba, và nó ' +
           '<b>không có cách chữa nào bên trong bộ tiền xử lý</b>.<br><br>' +
           '<b>(3) Bản sửa: đổi macro thành hàm.</b><br>' +
           '<code>static inline void LOG_ADC(int ch) { printf("ch%d = %d\\n", ch, ' +
           'read_adc(ch)); }</code><br>' +
           'Vì sao thoả ràng buộc: cú pháp tại 40 chỗ gọi <b>không đổi một ký tự nào</b> — ' +
           '<code>LOG_ADC(next_channel())</code> vẫn viết y hệt. Vì sao đúng: C đánh giá ' +
           'tham số của một hàm <b>đúng một lần</b>, trước khi vào thân hàm; ' +
           '<code>next_channel()</code> chạy một lần, giá trị đó vào biến <code>ch</code>, ' +
           'và cả hai chỗ dùng <code>ch</code> đều thấy cùng một số. ' +
           '<code>static inline</code> giữ nguyên hai tính chất mà bản macro có: đặt được ' +
           'trong header (mỗi đơn vị biên dịch có bản riêng, không gây ' +
           '<code>multiple definition</code>) và cho phép trình biên dịch nhúng thẳng mã, ' +
           'nên chi phí thường bằng không. Phần thưởng kèm theo: giờ nó có <b>kiểu</b>, nên ' +
           'truyền nhầm con trỏ vào sẽ bị gcc chặn ngay.<br>' +
           'Nếu bắt buộc phải giữ là macro (ví dụ cần <code>__LINE__</code>), cách còn lại ' +
           'là macro gọi vào một hàm: <code>#define LOG_ADC(ch) log_adc_impl(ch)</code> — ' +
           'tham số vẫn chỉ được đánh giá một lần, vì việc chép hai lần đã bị đẩy vào trong ' +
           'hàm.<br><br>' +
           '<b>(4)</b> <code>gcc -E firmware.c | grep -n LOG_ADC</code> — sau khi sửa, ' +
           'chỗ gọi phải hiện ra là <code>LOG_ADC(next_channel())</code> (một lời gọi hàm ' +
           'bình thường, macro không còn nở ra gì), thay vì hai lần ' +
           '<code>next_channel()</code> như trước. Hoặc <code>gcc -save-temps -c ' +
           'firmware.c</code> rồi mở <code>firmware.i</code> đọc thẳng. Nguyên tắc chung cho ' +
           'macro: <b>đừng suy luận, hãy nhìn văn bản đã nở.</b>' },

    { id: 'c4', k: 'free', tag: 'Chẩn đoán',
      q: 'Dự án hai file. Bạn <b>đã</b> đặt cả hai file <code>.o</code> lên dòng lệnh liên ' +
         'kết, cả hai đều biên dịch sạch, và hàm bị kêu thiếu <b>rõ ràng có mặt</b> trong ' +
         '<code>util.c</code>. Vậy mà:<br><br>' +
         '<code>app.c:(.text+0x30): undefined reference to `scale\'</code><br><br>' +
         'Dưới đây là bảng ký hiệu thật của hai file. Trả lời: <b>(1)</b> nguyên nhân — ' +
         'chỉ ra <b>đúng một ký tự</b> trong output giải thích tất cả; <b>(2)</b> từ khoá ' +
         'nào trong <code>util.c</code> gây ra chuyện này và nó thực sự làm gì; ' +
         '<b>(3)</b> hai cách sửa, và bạn chọn cách nào trong một dự án firmware thật, vì ' +
         'sao; <b>(4)</b> vì sao <b>không</b> thể sửa bằng cách khai báo ' +
         '<code>int scale(int);</code> trong <code>util.h</code>.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'nm util.o',
          code: '0000000000000019 T boost\n0000000000000000 t scale' },
        { t: 'code', env: 'wsl', label: 'nm app.o',
          code: '                 U boost\n0000000000000000 T main\n                 U printf\n                 U scale' } ],
      rows: 9,
      hint: 'So sánh <code>T boost</code> với <code>t scale</code>. Bài 14 đã nói chữ hoa ' +
            'và chữ thường khác nhau đúng một điều.',
      crit: [
        'Chỉ ra ký tự quyết định: <code>scale</code> mang chữ <b>thường</b> <code>t</code>, còn <code>boost</code> mang chữ <b>hoa</b> <code>T</code>',
        'Nói rõ chữ thường = ký hiệu <b>cục bộ</b>, chỉ file này thấy; bộ liên kết <b>không</b> được phép dùng nó để lấp <code>U scale</code> của <code>app.o</code>',
        'Chỉ đúng từ khoá: <code>static</code> trước định nghĩa <code>scale</code> trong <code>util.c</code>',
        'Cách sửa 1: bỏ <code>static</code> và khai báo <code>scale</code> trong <code>util.h</code>',
        'Cách sửa 2: giữ <code>static</code> và <b>không gọi</b> <code>scale</code> từ ngoài — dùng qua <code>boost()</code>',
        'Nêu được lý do chọn: giữ <code>static</code> giữ nguyên ranh giới nội bộ của module, chỉ mở ra khi thật sự là một phần của giao diện',
        'Trả lời (4): khai báo non-static sau/trước một định nghĩa <code>static</code> làm gcc 15 báo lỗi ngay ở <b>giai đoạn 2</b>: <code>static declaration of \'scale\' follows non-static declaration</code>'
      ],
      sol: '<b>(1) Đúng một ký tự: chữ <code>t</code> thường trong <code>t scale</code>.</b> ' +
           'Đặt cạnh <code>T boost</code> là thấy ngay. Quy tắc của <code>nm</code>: ' +
           '<b>chữ HOA = cả thế giới thấy, chữ thường = chỉ file này thấy</b>. Ký hiệu ' +
           '<code>scale</code> <i>có tồn tại</i> trong <code>util.o</code>, mã máy của nó ' +
           'nằm ở đó hẳn hoi, nhưng nó được đánh dấu <b>cục bộ</b>. Khi ' +
           '<code>ld</code> đi tìm thứ lấp vào <code>U scale</code> của <code>app.o</code>, ' +
           'nó chỉ được phép nhìn các ký hiệu <b>toàn cục</b>, nên nó không thấy gì và báo ' +
           'thiếu. Đây là một trong những kiểu lỗi gây hoang mang nhất với người mới: file ' +
           'đúng, hàm đúng, dòng lệnh đúng, mà vẫn thiếu.<br><br>' +
           '<b>(2) Từ khoá <code>static</code></b>, đặt trước định nghĩa trong ' +
           '<code>util.c</code>: <code>static int scale(int x) { … }</code>. Ở cấp file, ' +
           '<code>static</code> <b>không</b> có nghĩa gì về bộ nhớ hay về tuổi thọ — nó có ' +
           'nghĩa về <b>tầm nhìn</b>: "ký hiệu này không xuất ra ngoài file". Đây là cơ chế ' +
           'đóng gói duy nhất mà C có, và nó rất được dùng: nó cho phép hai file khác nhau ' +
           'cùng có một hàm <code>helper()</code> mà không đụng nhau, và cho biết ngay hàm ' +
           'nào là chi tiết nội bộ của module.<br><br>' +
           '<b>(3) Hai cách sửa.</b><br>' +
           '· <b>Mở ra:</b> bỏ <code>static</code> trong <code>util.c</code>, và thêm ' +
           '<code>int scale(int x);</code> vào <code>util.h</code>. Sau đó ' +
           '<code>nm util.o</code> sẽ cho <code>T scale</code> và liên kết chạy.<br>' +
           '· <b>Đóng lại:</b> giữ <code>static</code>, và sửa <code>app.c</code> để không ' +
           'gọi thẳng <code>scale</code> nữa — dùng <code>boost()</code>, hàm công khai đã ' +
           'gọi <code>scale</code> hộ bạn. Đã kiểm chứng trên máy bạn: bỏ lời gọi ' +
           '<code>scale</code> khỏi <code>app.c</code>, liên kết thành công, chạy ra ' +
           '<code>boost(4) = 41</code>.<br>' +
           '<b>Trong firmware thật, mặc định nên chọn cách thứ hai.</b> Lý do: ' +
           '<code>static</code> nằm đó là có chủ đích của người viết module — ' +
           '<code>scale</code> là chi tiết nội bộ. Bỏ <code>static</code> đi là biến nó ' +
           'thành một phần của giao diện công khai mà tất cả mọi người được phép gọi, và ' +
           'từ đó nó không sửa được nữa mà không làm hỏng ai đó. Chỉ mở ra khi bạn thật sự ' +
           'quyết định rằng nó <i>nên</i> là giao diện, và khi đó phải khai báo nó trong ' +
           'header một cách tường minh.<br><br>' +
           '<b>(4)</b> Vì cách "sửa" đó tạo ra một mâu thuẫn mà gcc 15 chặn ngay ở giai ' +
           'đoạn 2. Nếu <code>util.h</code> khai báo <code>int scale(int);</code> (không ' +
           '<code>static</code>) và <code>util.c</code> vẫn định nghĩa ' +
           '<code>static int scale(int x)</code>, thì lúc biên dịch <code>util.c</code> bạn ' +
           'nhận:<br>' +
           '<code>error: static declaration of \'scale\' follows non-static declaration</code><br>' +
           'và build <b>không bao giờ tới được giai đoạn 4</b>. Đây là điều đã đo được, và ' +
           'nó dạy một chuyện tổng quát hơn: <code>static</code> phải nhất quán giữa khai ' +
           'báo và định nghĩa. Muốn giấu thì giấu hoàn toàn — <b>không</b> nhắc tới hàm đó ' +
           'trong header dùng chung; muốn công khai thì công khai cả hai chỗ.' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Bạn viết một module dùng chung cho firmware. Cần một phép "kẹp giá trị vào khoảng" ' +
         'dùng ở rất nhiều nơi, kể cả trong các vòng lặp nóng, và có nơi cần dùng nó cho ' +
         '<code>int</code>, có nơi cho <code>float</code>.<br><br>' +
         'Ba lựa chọn:<br>' +
         '<b>A.</b> Macro trong header: <code>#define CLAMP(v,lo,hi) …</code><br>' +
         '<b>B.</b> <code>static inline int clamp_i(int v, int lo, int hi) { … }</code> đặt ' +
         'trong header<br>' +
         '<b>C.</b> <code>int clamp_i(int v, int lo, int hi);</code> khai báo trong header, ' +
         'định nghĩa trong <code>util.c</code><br><br>' +
         'Chọn <b>một</b> và biện minh. Bắt buộc nêu: <b>(1)</b> điều gì xảy ra ở giai đoạn ' +
         'nào với mỗi lựa chọn; <b>(2)</b> lựa chọn nào <b>không thể</b> đặt định nghĩa vào ' +
         'header nếu bỏ một từ khoá, và từ khoá đó là gì; <b>(3)</b> lý do bạn loại hai ' +
         'lựa chọn kia, viết dưới dạng một hậu quả cụ thể chứ không phải "kém hơn". ' +
         'Phần biện minh mới là phần được chấm.',
      rows: 10,
      crit: [
        'Nêu rõ với A: nở ra ở <b>giai đoạn 1</b>, tham số bị đánh giá <b>nhiều lần</b> (<code>CLAMP(next())</code> hỏng), không kiểm tra kiểu',
        'Nêu rõ với B: là hàm thật, tham số đánh giá <b>một lần</b>, có kiểm tra kiểu; <code>static</code> làm mỗi đơn vị biên dịch có bản riêng nên <b>không</b> có <code>multiple definition</code> ở giai đoạn 4',
        'Nêu rõ với C: định nghĩa chỉ nằm ở một <code>.o</code>; mọi nơi gọi sẽ có <code>U clamp_i</code> và được lấp ở <b>giai đoạn 4</b>',
        'Trả lời (2): bỏ <code>static</code> khỏi B thì mọi file include header sẽ có một định nghĩa toàn cục → <code>multiple definition</code> ở giai đoạn 4',
        'Loại A bằng một hậu quả cụ thể (giá trị sai im lặng khi tham số có tác dụng phụ), không phải bằng "khó đọc"',
        'Nói rõ yêu cầu "dùng cho cả <code>int</code> lẫn <code>float</code>" được xử lý thế nào trong lựa chọn đã chọn (hai hàm <code>clamp_i</code>/<code>clamp_f</code>)',
        'Kết luận là một lựa chọn duy nhất, không phải "tuỳ trường hợp"'
      ],
      sol: '<b>Chọn B</b> — <code>static inline</code> trong header, một hàm cho mỗi kiểu ' +
           '(<code>clamp_i</code> và <code>clamp_f</code>). Đây là mẫu mà kernel Linux dùng ' +
           'cho đúng loại nhu cầu này, và lý do rất cụ thể.<br><br>' +
           '<b>(1) Chuyện gì xảy ra ở giai đoạn nào.</b><br>' +
           '· <b>A</b> — hết đời ở <b>giai đoạn 1</b>. Macro biến thành văn bản, mọi tham số ' +
           'bị chép vào thân bao nhiêu lần thì được đánh giá bấy nhiêu lần. ' +
           '<code>CLAMP</code> dùng tham số <code>v</code> ít nhất hai lần (so sánh rồi trả ' +
           'về), nên <code>CLAMP(read_adc(), 0, 100)</code> đọc ADC <b>hai lần</b>. Giai ' +
           'đoạn 2 không còn thấy macro để mà cảnh báo.<br>' +
           '· <b>B</b> — là hàm thật ở <b>giai đoạn 2</b>: tham số đánh giá một lần, kiểu ' +
           'được kiểm tra. Ở <b>giai đoạn 4</b> không có gì xảy ra cả, vì <code>static</code> ' +
           'giữ mỗi bản trong file của nó. Ở mức <code>-O2</code>, trình biên dịch thường ' +
           'nhúng thẳng mã vào chỗ gọi — chi phí bằng đúng bản macro.<br>' +
           '· <b>C</b> — mỗi nơi gọi sinh ra một <code>U clamp_i</code> trong file ' +
           '<code>.o</code> của nó, và <b>giai đoạn 4</b> lấp tất cả bằng bản duy nhất trong ' +
           '<code>util.o</code>. Đúng đắn, nhưng lời gọi là lời gọi thật qua ranh giới file, ' +
           'nên trong vòng lặp nóng nó tốn hơn.<br><br>' +
           '<b>(2) Từ khoá đó là <code>static</code>.</b> Bỏ nó khỏi B thì mỗi file ' +
           '<code>.c</code> include header sẽ mang trong mình một định nghĩa ' +
           '<b>toàn cục</b> của <code>clamp_i</code>, và giai đoạn 4 báo ' +
           '<code>multiple definition of \'clamp_i\'</code> — đúng cơ chế của B4, và header ' +
           'guard không cứu được, vì các file được tiền xử lý độc lập với nhau.<br><br>' +
           '<b>(3) Vì sao loại hai cái kia — bằng hậu quả cụ thể.</b><br>' +
           '· <b>Loại A</b> vì hậu quả của nó là <b>giá trị sai, im lặng, ở nơi tệ nhất</b>: ' +
           '<code>CLAMP(read_adc(), lo, hi)</code> đọc cảm biến hai lần, hai lần đọc trả về ' +
           'hai giá trị khác nhau, kết quả kẹp trở nên vô nghĩa — và không có cảnh báo nào, ' +
           'đúng như đã đo ở B1/B6. Trong một vòng lặp nóng, nó còn <b>chậm hơn</b> B chứ ' +
           'không nhanh hơn, vì nó thật sự làm việc hai lần.<br>' +
           '· <b>Loại C</b> vì hậu quả của nó là <b>một lời gọi hàm không thể tránh trong ' +
           'vòng lặp nóng</b>: trình biên dịch không nhìn thấy thân hàm khi biên dịch file ' +
           'gọi (thân hàm nằm ở đơn vị biên dịch khác), nên nó không nhúng vào được. Trên ' +
           'MCU, một phép kẹp ba dòng biến thành lệnh gọi, đẩy tham số, nhảy, trả về. C vẫn ' +
           'là lựa chọn đúng cho những hàm <i>lớn</i> hoặc ít gọi — chỉ là không đúng cho ' +
           '<i>hàm ba dòng gọi ở khắp nơi</i>.<br><br>' +
           '<b>Còn yêu cầu "dùng cho cả <code>int</code> lẫn <code>float</code>":</b> ' +
           'đây là điểm duy nhất mà A thắng về hình thức, vì một macro chạy với mọi kiểu. ' +
           'Cách của B là viết hai hàm — <code>clamp_i</code> và <code>clamp_f</code>. Đổi ' +
           'lại, chỗ gọi phải chọn đúng tên, và <b>đó là điều tốt</b>: nó biến việc kẹp một ' +
           '<code>float</code> bằng biên <code>int</code> từ một lỗi âm thầm thành một lỗi ' +
           'trình biên dịch. Trả giá bằng một chút lặp để mua lấy hệ thống kiểu là món hời ' +
           'trong firmware.' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về bài cũ mà bài 15 đứng lên trên ═══ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ · Bài 14',
      q: '<b>Bài 14</b> kết thúc bằng một câu hỏi bỏ ngỏ: <code>sizeof</code> do ai tính, và ' +
         'tính lúc nào? Giờ bạn đã biết dây chuyền bốn giai đoạn, hãy chọn câu đúng.',
      opts: [
        'Bộ tiền xử lý tính ở giai đoạn 1 — đó là lý do <code>sizeof</code> viết được trong <code>#if</code>.',
        'Trình biên dịch tính ở <b>giai đoạn 2</b>: trong file <code>.s</code> nó đã là một <b>hằng số</b>, chương trình lúc chạy không đo gì cả.',
        'Chương trình tính lúc chạy, bằng cách đo khoảng cách giữa hai địa chỉ.',
        'Bộ liên kết tính ở giai đoạn 4, vì chỉ nó mới biết kiến trúc đích.'
      ],
      a: 1,
      why: '<b>Giai đoạn 2.</b> <code>sizeof</code> là toán tử của <b>ngôn ngữ C</b>, và bộ ' +
           'tiền xử lý không biết C — nó không biết <code>struct</code> là gì, không biết ' +
           '<code>uint32_t</code> là gì. Nó chỉ thay văn bản. Trình biên dịch mới là thứ ' +
           'biết ABI của đích, biết quy tắc căn lề, biết byte đệm, nên nó tính ra con số và ' +
           '<b>viết thẳng con số đó</b> vào assembly. Bài 14 đã cho bạn thấy tận mắt kiểu ' +
           'này rồi: <code>.s</code> chứa <code>movl $49, %esi</code> chứ không chứa phép ' +
           'nhân nào.<br>' +
           'Hệ quả nối thẳng với trục 0 của bài này: cùng một file <code>.c</code>, đổi ' +
           'trình biên dịch đích (x86-64 so với armhf) là <code>sizeof(long)</code> đổi từ ' +
           '8 sang 4 — vì <b>giai đoạn 2 mới là nơi ABI đích lên tiếng</b>, không phải giai ' +
           'đoạn 1, không phải lúc chạy. Đây cũng là lý do <code>#if sizeof(int) == 4</code> ' +
           '<b>không</b> biên dịch được: ở giai đoạn 1 chưa có ai biết <code>int</code> là ' +
           'gì. Muốn kiểm tra kích thước lúc biên dịch, dùng ' +
           '<code>_Static_assert</code> — đúng công cụ của bài 14.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ · Bài 11',
      q: 'File <code>calc.i</code> có <b>2 333</b> dòng. Bạn muốn biết ' +
         '<b>dòng số mấy</b> chứa định nghĩa cuối cùng của <code>uint32_t</code>, và bạn ' +
         'chưa biết trước con số đó. Dùng công cụ nào của <b>bài 11</b>?',
      opts: [
        '<code>sed -n \'194p\' calc.i</code> — in ra dòng chứa nó.',
        '<code>grep -n \'uint32_t\' calc.i</code> — <code>-n</code> in kèm <b>số dòng</b> của mỗi dòng khớp.',
        '<code>grep -c \'uint32_t\' calc.i</code> — đếm rồi suy ra vị trí.',
        '<code>sort calc.i | uniq -c | grep uint32_t</code> — gom nhóm rồi đếm.'
      ],
      a: 1,
      why: '<b><code>grep -n</code>.</b> Cờ <code>-n</code> đúng là để trả lời câu hỏi ' +
           '"<i>ở đâu</i>", còn <code>-c</code> trả lời "<i>bao nhiêu</i>". Ba phương án kia ' +
           'sai theo ba kiểu đáng nhớ:<br>' +
           '· <code>sed -n \'194p\'</code> đòi bạn <b>đã biết</b> số dòng — đó chính là cái ' +
           'bạn đang đi tìm. Nó là công cụ để <i>xem lại</i> sau khi <code>grep -n</code> đã ' +
           'nói cho bạn số dòng, và cặp đôi đó dùng chung rất hợp: ' +
           '<code>grep -n</code> để tìm, <code>sed -n \'a,bp\'</code> để đọc vùng quanh nó.<br>' +
           '· <code>grep -c</code> cho một con số duy nhất và <b>vứt mất</b> mọi vị trí.<br>' +
           '· <code>sort | uniq -c</code> phá huỷ thứ tự dòng — mà thứ tự chính là thông tin ' +
           'bạn cần; bài 11 cũng đã cảnh báo rằng <code>uniq</code> chỉ so mỗi dòng với dòng ' +
           '<b>liền trước</b>.<br>' +
           'Chạy thật trên máy bạn, kết quả có ba dòng đáng chú ý: dòng <b>65</b> ' +
           '<code>typedef unsigned int __uint32_t;</code>, dòng <b>80</b> ' +
           '<code>typedef __uint32_t __uint_least32_t;</code>, dòng <b>194</b> ' +
           '<code>typedef __uint32_t uint32_t;</code>. Ba tầng typedef cho một kiểu — và ' +
           'đó chính là thứ E3 sẽ bảo bạn tự truy ra.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ · Bài 12',
      q: 'Bạn build mã của người khác và nhận:<br><br>' +
         '<code>db.c:4:10: fatal error: sqlite3.h: No such file or directory</code><br><br>' +
         'Theo <b>bài 12</b>, việc đúng phải làm là gì?',
      opts: [
        'Tải file <code>sqlite3.h</code> từ Internet và chép vào cùng thư mục với <code>db.c</code>.',
        'Cài gói <b>phát triển</b>: <code>sudo apt-get install libsqlite3-dev</code> — trên Debian/Ubuntu, header nằm ở gói đuôi <code>-dev</code>, tách khỏi gói thư viện lúc chạy.',
        'Chạy <code>sudo apt-get install sqlite3</code> — cài chương trình sqlite3 là có đủ mọi thứ.',
        'Thêm <code>#include "sqlite3.h"</code> thay cho <code>#include &lt;sqlite3.h&gt;</code>.'
      ],
      a: 1,
      why: '<b>Cài gói <code>-dev</code>.</b> Bài 12 giải thích lý do của cách chia này: ' +
           'một máy <i>chạy</i> phần mềm chỉ cần file <code>.so</code> ' +
           '(<code>libsqlite3-0</code>), còn header và file để liên kết chỉ cần thiết khi ' +
           '<i>build</i>, nên chúng được tách ra gói riêng đuôi <code>-dev</code>. Trên một ' +
           'thiết bị nhúng có 64 MB flash, chênh lệch đó là thật.<br>' +
           'Ba phương án kia sai theo ba kiểu bạn sẽ gặp lại:<br>' +
           '· Chép tay header về là cách chắc chắn nhất để có một header ' +
           '<b>lệch phiên bản</b> với thư viện <code>.so</code> trên máy — mã build được, ' +
           'rồi hỏng lúc chạy theo kiểu rất khó tìm.<br>' +
           '· <code>apt-get install sqlite3</code> cài <i>chương trình dòng lệnh</i>, không ' +
           'phải bộ công cụ phát triển. Đây là nhầm lẫn kinh điển giữa "dùng phần mềm" và ' +
           '"lập trình với phần mềm".<br>' +
           '· Đổi <code>&lt;&gt;</code> thành <code>""</code> chỉ đổi <b>thứ tự tìm kiếm</b> ' +
           '— tìm cạnh file nguồn trước rồi mới tới đường dẫn hệ thống. File vẫn không có ở ' +
           'đâu cả, nên vẫn cùng một lỗi. Đây là lỗi giai đoạn 1, và cách khoanh vùng nhanh: ' +
           '<code>apt-file search sqlite3.h</code> cho biết gói nào chứa nó.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output',
      q: 'Tạo <code>~/bt15/calc.c</code> đúng như dưới đây (11 dòng, <b>223 byte</b>). ' +
         '<b>Trước khi chạy bất cứ lệnh nào</b>, hãy viết dự đoán của bạn cho bốn con số: ' +
         'kích thước <code>calc.i</code>, <code>calc.s</code>, <code>calc.o</code> và ' +
         '<code>calc</code>. Chỉ cần đúng <b>bậc độ lớn</b> (hàng trăm byte / hàng KB / hàng ' +
         'chục KB).<br><br>' +
         'Sau đó chạy hai lệnh dưới và ghi lại số thật. Cuối cùng trả lời: ' +
         '<b>số nào lệch xa dự đoán của bạn nhất, và cơ chế nào giải thích nó?</b>',
      blocks: [
        { t: 'code', env: 'wsl', label: '~/bt15/calc.c',
          code:
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    char buf[32];\n' +
            '    snprintf(buf, sizeof buf, "%d", 6 * 7);\n' +
            '    printf("answer = %s (len %zu)\\n", buf, strlen(buf));\n' +
            '    return EXIT_SUCCESS;\n' +
            '}' },
        { t: 'code', env: 'wsl', label: 'Chạy sau khi đã viết xong dự đoán',
          code:
            'cd ~/bt15\n' +
            'gcc -save-temps -o calc calc.c\n' +
            'wc -c calc.c calc.i calc.s calc.o calc\n' +
            'wc -l calc.c calc.i calc.s' } ],
      rows: 8,
      crit: [
        'Đã viết dự đoán <b>trước</b> khi chạy (không có bước này thì cả câu vô nghĩa)',
        '<code>calc.i</code> ở hàng <b>chục KB</b> — số thật <b>63 588</b> byte, <b>2 333</b> dòng',
        '<code>calc.s</code> nhỏ hơn <code>calc.i</code> rất nhiều — số thật <b>1 096</b> byte, <b>70</b> dòng',
        '<code>calc.o</code> vào khoảng <b>1 800</b> byte, <code>calc</code> khoảng <b>16 072</b> byte',
        'Giải thích được vì sao <code>.i</code> phình rồi <code>.s</code> teo lại: ba <code>#include</code> kéo về hàng chục header, nhưng <b>hầu hết chỉ là khai báo</b> và không sinh ra mã nào'
      ],
      sol: '<b>Số thật, đo trên máy bạn ngày 19/08/2026:</b><br>' +
           '<code>calc.c</code> <b>223</b> B · 11 dòng<br>' +
           '<code>calc.i</code> <b>63 588</b> B · <b>2 333</b> dòng — phình <b>285 lần</b> ' +
           'theo byte<br>' +
           '<code>calc.s</code> <b>1 096</b> B · <b>70</b> dòng<br>' +
           '<code>calc.o</code> <b>1 800</b> B<br>' +
           '<code>calc</code> <b>16 072</b> B<br><br>' +
           '<b>Đường cong này là cả bài học.</b> Nó <b>không</b> đi lên đều: nó vọt lên ' +
           '63 KB rồi rơi xuống 1 KB rồi lại lên 16 KB. Ba chuyển động, ba cơ chế khác nhau.' +
           '<br>' +
           '· <b>Vọt lên (giai đoạn 1).</b> Ba dòng <code>#include</code> kéo về ' +
           '<b>73 header</b> (đếm bằng <code>gcc -H</code>, xem E2). Toàn bộ nội dung của ' +
           'chúng bị chép nguyên văn vào. Đây là lý do trực tiếp làm biên dịch C chậm, và là ' +
           'lý do mọi hướng dẫn đều bảo chỉ <code>#include</code> thứ thật sự cần.<br>' +
           '· <b>Rơi xuống (giai đoạn 2).</b> 63 KB đó gần như toàn <b>khai báo</b>: nguyên ' +
           'mẫu hàm, <code>typedef</code>, <code>struct</code>, macro. Khai báo ' +
           '<b>không sinh ra một byte mã máy nào</b> — chúng chỉ dạy trình biên dịch về ' +
           'kiểu. Chương trình của bạn thật sự chỉ có bốn lệnh gọi, nên assembly còn 70 ' +
           'dòng. Đây chính là trục 1 của bài này hiện ra dưới dạng con số: khai báo nhiều ' +
           'bao nhiêu cũng được, nó không làm chương trình to lên.<br>' +
           '· <b>Lên lại (giai đoạn 4).</b> 1 800 → 16 072 B. Phần thêm vào <b>không phải</b> ' +
           'mã của <code>printf</code> — đó là mã khởi động (<code>_start</code>), bảng liên ' +
           'kết động, header ELF. Xem B2 và E6.<br><br>' +
           'Nếu dự đoán của bạn lệch nhiều nhất ở <code>calc.i</code>, bạn đang ở cùng chỗ ' +
           'với hầu hết người học — và đó đúng là con số nên gây sốc. Đối chiếu với bài 15: ' +
           '<code>hello.c</code> chỉ có <b>một</b> <code>#include &lt;stdio.h&gt;</code> và ' +
           'cho <code>hello.i</code> <b>21 500</b> byte. Thêm hai header nữa là gấp ba. ' +
           'Trong kernel, con số đó nhân với ba mươi nghìn file.' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output',
      q: 'Vẫn ở <code>~/bt15</code> với <code>calc.c</code> của E1. Trước khi chạy, hãy ' +
         'dự đoán <b>ba</b> con số: <b>(a)</b> ba dòng <code>#include</code> kia kéo về tổng ' +
         'cộng bao nhiêu file header? <b>(b)</b> trong <code>calc.i</code> có bao nhiêu dòng ' +
         'bắt đầu bằng ký tự <code>#</code>? <b>(c)</b> những dòng <code>#</code> đó là gì — ' +
         'chúng có phải chỉ dẫn tiền xử lý còn sót lại không?<br><br>' +
         'Rồi chạy ba lệnh dưới và đối chiếu.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'Chạy sau khi đã viết xong dự đoán',
          code:
            'cd ~/bt15\n' +
            'gcc -H -E calc.c -o /dev/null 2>&1 | grep -c \'^\\.\'\n' +
            'grep -c \'^#\' calc.i\n' +
            'grep -n \'^#\' calc.i | head -n 5' } ],
      rows: 7,
      crit: [
        'Đã viết dự đoán <b>trước</b> khi chạy',
        'Số header thật: <b>73</b> (mỗi dấu chấm đầu dòng của <code>gcc -H</code> là một mức lồng)',
        'Số dòng bắt đầu bằng <code>#</code> trong <code>calc.i</code>: <b>284</b>',
        'Nhận ra chúng <b>không</b> phải chỉ dẫn tiền xử lý mà là <b>chỉ dẫn dòng</b> dạng <code># 1 "/usr/include/stdio.h" 1 3 4</code>',
        'Nói được công dụng của chúng: để thông báo lỗi ở giai đoạn 2 trỏ đúng <b>file gốc và số dòng gốc</b>, chứ không phải dòng trong <code>.i</code>'
      ],
      sol: '<b>Số thật:</b> <code>gcc -H</code> đếm được <b>73</b> header; ' +
           '<code>grep -c \'^#\' calc.i</code> cho <b>284</b>.<br><br>' +
           '<b>(c) là phần thú vị nhất, và hầu hết mọi người đoán sai.</b> Sau giai đoạn 1, ' +
           '<b>mọi</b> chỉ dẫn tiền xử lý đã biến mất — không còn một <code>#include</code>, ' +
           'một <code>#define</code>, một <code>#ifdef</code> nào. 284 dòng <code>#</code> ' +
           'còn lại là thứ khác hẳn: <b>chỉ dẫn dòng</b> (line marker), dạng<br>' +
           '<code># 1 "/usr/include/stdc-predef.h" 1 3 4</code><br>' +
           '(năm dòng <code>#</code> đầu tiên trong <code>calc.i</code> của bạn là ' +
           '<code># 0 "calc.c"</code>, <code># 0 "&lt;built-in&gt;"</code>, ' +
           '<code># 0 "&lt;command-line&gt;"</code>, dòng vừa nêu, rồi ' +
           '<code># 0 "&lt;command-line&gt;" 2</code>.)<br>' +
           'Chúng nói với giai đoạn 2: <i>"những dòng tiếp theo vốn đến từ file này, bắt ' +
           'đầu từ dòng số kia"</i>. Nhờ vậy khi bạn viết sai ở dòng 9 của ' +
           '<code>calc.c</code>, gcc báo <code>calc.c:9:…</code> chứ không báo ' +
           '<code>calc.i:2287:…</code> — một con số hoàn toàn vô dụng với bạn.<br>' +
           'Đây cũng là lời giải thích cho một chuyện bạn đã thấy nhiều lần mà chưa để ý: ' +
           'lỗi trong một macro của kernel đôi khi báo ở một file bạn chưa từng mở. Chỉ dẫn ' +
           'dòng đang làm đúng việc của nó — nó trỏ về nơi văn bản ấy <b>thật sự</b> được ' +
           'viết ra.<br><br>' +
           '<b>Về con số 73:</b> bạn chỉ viết ba dòng <code>#include</code>. Bảy mươi ba ' +
           'file là do các header tự include lẫn nhau, nhiều tầng. <code>gcc -H</code> in ' +
           'cây này ra, mỗi dấu chấm là một mức sâu: <code>.</code> là header bạn gọi trực ' +
           'tiếp, <code>....</code> là header ở tầng thứ tư. Bài 15 đã cho bạn thấy ' +
           '<code>bits/wordsize.h</code> được <b>yêu cầu 6 lần</b> nhưng chỉ được ' +
           '<b>vào 1 lần</b> — sáu lần kia bị header guard chặn lại. Nếu không có header ' +
           'guard, con số 63 588 byte kia sẽ là bao nhiêu, và nó có kết thúc được không?' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Câu hỏi: <b><code>uint32_t</code> thật ra là kiểu gì, và ai định nghĩa nó?</b> ' +
         'Bài 14 bảo bạn dùng <code>uint32_t</code> nhưng chưa bao giờ cho bạn thấy nó đến ' +
         'từ đâu. Giờ bạn có công cụ.<br><br>' +
         'Viết ra <b>dãy lệnh</b> bạn sẽ gõ để trả lời trọn vẹn, rồi chạy thật. Yêu cầu: ' +
         '<b>(1)</b> tạo một file <code>u.c</code> tối thiểu chỉ include ' +
         '<code>&lt;stdint.h&gt;</code> và dùng một biến <code>uint32_t</code>; ' +
         '<b>(2)</b> in ra <b>cây header</b> để thấy <code>stdint.h</code> kéo theo những ' +
         'file nào; <b>(3)</b> tìm trong file đã tiền xử lý <b>mọi</b> dòng định nghĩa ' +
         '<code>uint32_t</code>, kèm số dòng. Chép lại chuỗi <code>typedef</code> bạn tìm ' +
         'được, từ kiểu cơ sở tới cái tên bạn dùng.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'Gợi ý về hình dạng — bạn phải tự viết phần còn lại',
          code:
            'cd ~/bt15\n' +
            'cat > u.c <<\'EOF\'\n' +
            '#include <stdint.h>\n' +
            'int main(void) { uint32_t v = 7; return (int)v; }\n' +
            'EOF\n' +
            '# 2) cây header:  gcc -H ...\n' +
            '# 3) truy typedef: gcc -E ... rồi grep -n ...' } ],
      rows: 8,
      crit: [
        'Lệnh (2) đúng dạng <code>gcc -H -E u.c -o /dev/null</code> (hoặc <code>gcc -H -c u.c</code>) và có gộp <code>2&gt;&amp;1</code> nếu muốn lọc, vì <code>-H</code> in ra <b>stderr</b>',
        'Lệnh (3) đúng dạng <code>gcc -E u.c -o u.i</code> rồi <code>grep -n \'uint32_t\' u.i</code>',
        'Tìm ra được cả <b>ba</b> tầng: <code>typedef unsigned int __uint32_t;</code> → <code>typedef __uint32_t uint32_t;</code> (và <code>__uint_least32_t</code> ở giữa)',
        'Nêu được kiểu cơ sở thật trên máy này: <code>unsigned int</code>',
        'Cây header cho thấy <code>stdint.h</code> của gcc gọi tới <code>/usr/include/stdint.h</code>, rồi tới <code>bits/types.h</code>, <code>bits/stdint-uintn.h</code>…'
      ],
      sol: '<b>Dãy lệnh đầy đủ:</b><br>' +
           '<code>gcc -H -E u.c -o /dev/null</code> — cờ <code>-H</code> in cây header ra ' +
           '<b>stderr</b>, nên muốn lọc thì phải <code>2&gt;&amp;1 | …</code> (đúng bài học ' +
           'của bài 10: đường ống chỉ mang fd 1).<br>' +
           '<code>gcc -E u.c -o u.i &amp;&amp; grep -n \'uint32_t\' u.i</code><br><br>' +
           '<b>Cây header thật, đo trên máy bạn</b> (mỗi dấu chấm là một mức lồng):<br>' +
           '<code>. /usr/lib/gcc/x86_64-linux-gnu/15/include/stdint.h</code><br>' +
           '<code>.. /usr/include/stdint.h</code><br>' +
           '<code>... /usr/include/x86_64-linux-gnu/bits/types.h</code><br>' +
           '<code>.... /usr/include/x86_64-linux-gnu/bits/typesizes.h</code><br>' +
           '<code>... /usr/include/x86_64-linux-gnu/bits/stdint-intn.h</code><br>' +
           '<code>... /usr/include/x86_64-linux-gnu/bits/stdint-uintn.h</code><br>' +
           '<code>... /usr/include/x86_64-linux-gnu/bits/stdint-least.h</code><br>' +
           'Để ý mức đầu tiên: <code>stdint.h</code> bạn gọi <b>không</b> phải của hệ thống ' +
           'mà là của <b>gcc</b>, và nó mới gọi tiếp tới của hệ thống. Đó là cách trình biên ' +
           'dịch chèn phần của riêng nó vào trước thư viện C.<br><br>' +
           '<b>Chuỗi typedef trong <code>u.i</code>:</b><br>' +
           'dòng <b>65</b> · <code>typedef unsigned int __uint32_t;</code><br>' +
           'dòng <b>80</b> · <code>typedef __uint32_t __uint_least32_t;</code><br>' +
           'dòng <b>194</b> · <code>typedef __uint32_t uint32_t;</code><br>' +
           'dòng <b>242</b> · <code>uint32_t v = 7;</code> ← mã của bạn<br><br>' +
           '<b>Vậy trên máy này <code>uint32_t</code> chính là <code>unsigned int</code></b> ' +
           '— nhưng đó là kết luận về <i>máy này</i>, không phải về ngôn ngữ. Đây chính là ' +
           'lý do bạn dùng <code>uint32_t</code> chứ không dùng <code>unsigned int</code>: ' +
           'trên một kiến trúc khác, tầng typedef này ánh xạ sang kiểu khác, và mã của bạn ' +
           '<b>không phải sửa một chữ</b>. Trục 0 của bt-14 nói đúng câu này bằng lời; giờ ' +
           'bạn đã thấy cơ chế thật, và nó chỉ là ba dòng <code>typedef</code> trong một ' +
           'header.<br>' +
           'Kỹ thuật vừa dùng — <code>gcc -E</code> + <code>grep -n</code> để truy một cái ' +
           'tên về tận định nghĩa gốc — là kỹ thuật bạn sẽ dùng liên tục ở <b>Chặng 07</b> ' +
           'khi đọc kernel, nơi một cái tên có thể đi qua bốn tầng macro trước khi thành mã.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Dựng lại tình huống của C2 bằng tay để <b>tự mắt thấy</b> bảng ký hiệu thay đổi. ' +
         'Trong <code>~/bt15</code>, tạo hai chương trình chỉ khác nhau một điểm: một bản ' +
         'gọi <code>sqrt(2.0)</code> với hằng số, một bản gọi ' +
         '<code>sqrt(atof(argv[1]))</code>.<br><br>' +
         'Viết và chạy dãy lệnh trả lời ba câu: <b>(1)</b> file <code>.o</code> nào có ' +
         '<code>U sqrt</code>, file nào không? <b>(2)</b> liên kết <b>không</b> có ' +
         '<code>-lm</code> thì bản nào hỏng, thông báo ra sao, mã thoát bằng mấy? ' +
         '<b>(3)</b> thử đặt <code>-lm</code> ở <b>trước</b> file <code>.o</code> trên dòng ' +
         'lệnh — kết quả có khác không, và vì sao?',
      blocks: [
        { t: 'code', env: 'wsl', label: 'Khung — phần còn lại bạn tự viết',
          code:
            'cd ~/bt15\n' +
            'cat > root_const.c <<\'EOF\'\n' +
            '#include <stdio.h>\n' +
            '#include <math.h>\n' +
            'int main(void) { printf("%f\\n", sqrt(2.0)); return 0; }\n' +
            'EOF\n' +
            '# root_var.c: doc gia tri tu argv[1] bang atof()\n' +
            '# rồi: gcc -c ... ; nm ... ; gcc -o ... ; echo "exit=$?"' } ],
      rows: 8,
      hint: 'Cẩn thận khi lấy mã thoát: viết <code>gcc … | head</code> rồi ' +
            '<code>echo $?</code> thì con số đó là của <code>head</code>, không phải của ' +
            '<code>gcc</code>. Lấy <code>$?</code> ngay dòng sau lệnh gcc.',
      crit: [
        'Đã tạo được cả hai bản và biên dịch bằng <code>gcc -c</code>',
        '<code>nm root_const.o</code> → chỉ <code>T main</code> và <code>U printf</code>, <b>không có</b> <code>U sqrt</code>',
        '<code>nm root_var.o</code> → có <code>U atof</code>, <code>T main</code>, <code>U printf</code>, <b><code>U sqrt</code></b>',
        'Liên kết không <code>-lm</code>: bản hằng số <b>thành công</b> (exit=0), bản kia hỏng với <code>undefined reference to \'sqrt\'</code> (exit=1)',
        'Đặt <code>-lm</code> trước file <code>.o</code> thì <b>vẫn hỏng</b> — nêu được lý do: <code>ld</code> đọc dòng lệnh từ trái sang phải và chỉ lấy từ thư viện thứ <b>đang thiếu tại lúc đọc tới đó</b>',
        'Lấy mã thoát <b>ngay dòng sau</b> lệnh gcc, không qua đường ống'
      ],
      sol: '<b>Kết quả thật, đo trên máy bạn:</b><br><br>' +
           '<b>(1)</b> <code>nm root_const.o</code> → chỉ <code>T main</code> và ' +
           '<code>U printf</code>. Không có <code>U sqrt</code> — lời gọi đã bị giai đoạn 2 ' +
           'thay bằng hằng số. <code>nm root_var.o</code> → <code>U atof</code>, ' +
           '<code>T main</code>, <code>U printf</code>, <code>U sqrt</code>.<br><br>' +
           '<b>(2)</b> <code>gcc -o root_var root_var.o</code> (không <code>-lm</code>) → ' +
           '<code>root_var.c:(.text+0x4e): undefined reference to \'sqrt\'</code>, ' +
           '<code>collect2: error: ld returned 1 exit status</code>, <b>exit=1</b>. Với ' +
           '<code>-lm</code>: <b>exit=0</b>, và <code>./root_var 9</code> in ' +
           '<code>sqrt(9.000000) = 3.000000</code>. Bản hằng số liên kết trót lọt không cần ' +
           '<code>-lm</code>.<br><br>' +
           '<b>(3) Vẫn hỏng — và đây là bài học đắt nhất của câu này.</b> ' +
           '<code>ld</code> xử lý dòng lệnh <b>tuần tự từ trái sang phải</b> và giữ một danh ' +
           'sách "những ký hiệu đang còn thiếu". Khi nó gặp một thư viện, nó chỉ lấy ra ' +
           'những thành viên giải quyết được các ký hiệu <b>đang thiếu ngay lúc đó</b>. Viết ' +
           '<code>gcc -lm root_var.o</code> thì lúc đọc <code>-lm</code>, danh sách còn ' +
           'rỗng — chưa ai cần <code>sqrt</code> cả — nên nó bỏ qua toàn bộ ' +
           '<code>libm</code>; mãi sau mới đọc <code>root_var.o</code> và ghi nhận ' +
           '<code>sqrt</code> đang thiếu, nhưng thư viện thì đã đi qua rồi.<br>' +
           '<b>Quy tắc: thư viện đứng SAU thứ cần nó.</b> Đây là nguồn gốc của một loại lỗi ' +
           'liên kết rất khó hiểu với người mới — cùng một tập file, cùng một tập thư viện, ' +
           'chỉ đổi thứ tự là build được hay không. Khi bạn viết Makefile ở <b>Bài 16</b>, ' +
           'đây là lý do biến <code>LDLIBS</code> luôn được đặt ở cuối dòng liên kết chứ ' +
           'không phải chỗ nào cũng được.<br><br>' +
           '<b>Về mã thoát:</b> nếu bạn viết <code>gcc … 2&gt;&amp;1 | head -n 5</code> rồi ' +
           '<code>echo $?</code>, con số nhận được là của <code>head</code> — gần như luôn ' +
           'bằng 0, kể cả khi gcc vừa chết. Chính cái bẫy này đã suýt đưa một dòng ' +
           '"exit=0" sai vào bộ bài tập 14. Bài 10 đã dạy cơ chế; đây là lần nó cắn thật.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Dựng dự án dưới đây trong <code>~/bt15/broken</code> đúng như đã cho. Nó có ' +
         '<b>ba</b> khuyết tật: một ở giai đoạn 2 và hai ở giai đoạn 4. Chúng ' +
         '<b>không</b> hiện ra cùng lúc — giai đoạn 4 chỉ chạy sau khi giai đoạn 2 xong ' +
         'sạch, nên bạn phải sửa cái đầu tiên rồi build lại mới thấy hai cái sau.<br><br>' +
         'Với mỗi khuyết tật, ghi lại: thông báo nguyên văn · giai đoạn sinh ra nó · dấu ' +
         'hiệu nhận biết trong chính dòng đó · cách sửa. Không được sửa mò: phải nói được ' +
         'vì sao bản sửa đúng <b>trước</b> khi build lại.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'geo.h',
          code:
            '#ifndef GEO_H\n' +
            '#define GEO_H\n' +
            '\n' +
            'double area(double r) { return 3.14159 * r * r; }\n' +
            '\n' +
            '#endif' },
        { t: 'code', env: 'wsl', label: 'geo.c',
          code:
            '#include "geo.h"\n' +
            '#include <math.h>\n' +
            '\n' +
            'double diag(double a, double b)\n' +
            '{\n' +
            '    return sqrt(a * a + b * b);\n' +
            '}' },
        { t: 'code', env: 'wsl', label: 'main.c',
          code:
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include "geo.h"\n' +
            '\n' +
            'int main(int argc, char **argv)\n' +
            '{\n' +
            '    double r = (argc > 1) ? atof(argv[1]) : 2.0;\n' +
            '    printf("area = %f\\n", area(r));\n' +
            '    printf("diag = %f\\n", diag(r, r));\n' +
            '    return 0;\n' +
            '}' },
        { t: 'code', env: 'wsl', label: 'Cách build',
          code:
            'cd ~/bt15/broken\n' +
            'gcc -Wall -Wextra -c geo.c\n' +
            'gcc -Wall -Wextra -c main.c\n' +
            'gcc -o app main.o geo.o\n' +
            'echo "exit=$?"' } ],
      rows: 12,
      hint: 'Khuyết tật đầu tiên lộ ra khi biên dịch <code>main.c</code>, và vì ' +
            '<code>main.o</code> không được tạo ra nên bước liên kết chỉ kêu ' +
            '<code>cannot find main.o</code> — đừng nhầm đó là khuyết tật thứ hai. Hai ' +
            'khuyết tật còn lại cùng hiện ra ở bước liên kết, sau khi bạn sửa xong cái đầu.',
      crit: [
        'Khuyết tật 1 — <b>giai đoạn 2</b>: <code>main.c</code> gọi <code>diag()</code> mà không có khai báo nào → <code>error: implicit declaration of function \'diag\'</code>. Sửa: thêm <code>double diag(double a, double b);</code> vào <code>geo.h</code>',
        'Khuyết tật 2 và 3 hiện ra <b>cùng lúc</b> ở lần liên kết đầu tiên thành công tới được giai đoạn 4',
        'Khuyết tật 2 — <b>giai đoạn 4</b>: <code>area()</code> được <b>định nghĩa</b> trong header nên có mặt trong cả hai file <code>.o</code> → <code>multiple definition of \'area\'</code>. Sửa: để lại khai báo trong header, chuyển thân hàm sang <code>geo.c</code>',
        'Khuyết tật 3 — <b>giai đoạn 4</b>: <code>geo.c:(.text+0x60): undefined reference to \'sqrt\'</code>. Sửa: thêm <code>-lm</code> vào <b>cuối</b> dòng liên kết',
        'Giải thích được vì sao khuyết tật 3 <b>không</b> xuất hiện nếu <code>diag()</code> bị gọi với hằng số',
        'Nói rõ vì sao <b>header guard không cứu</b> khuyết tật 2',
        'Sau khi sửa cả ba: build sạch, <code>./app 3</code> chạy được'
      ],
      sol: '<b>Lượt build 1 — khuyết tật 1 chặn ở giai đoạn 2.</b> Transcript thật:<br>' +
           '<code>main.c:9:27: error: implicit declaration of function \'diag\' ' +
           '[-Wimplicit-function-declaration]</code><br>' +
           '<code>main.c:9:21: warning: format \'%f\' expects argument of type ' +
           '\'double\', but argument 2 has type \'int\' [-Wformat=]</code><br>' +
           'Dấu hiệu: toạ độ <code>file.c:dòng:cột</code> và nội dung nói về <b>kiểu</b>. ' +
           '<code>geo.h</code> định nghĩa <code>area</code> nhưng chưa bao giờ nhắc tới ' +
           '<code>diag</code>, nên <code>main.c</code> không biết gì về nó. Trên gcc 15 đây ' +
           'là <b>lỗi</b>, không phải cảnh báo.<br>' +
           'Cảnh báo <code>-Wformat=</code> đi kèm là một món quà: khi không có khai báo, C ' +
           'buộc phải <i>giả định</i> hàm trả về <code>int</code> — và gcc phát hiện ngay ' +
           'rằng <code>%f</code> đang nhận một <code>int</code>. Nó cho bạn thấy chính xác ' +
           '<b>vì sao</b> khai báo là bắt buộc: không có nó, trình biên dịch không biết ' +
           'giá trị trả về rộng bao nhiêu byte.<br>' +
           'Vì <code>main.o</code> không được tạo ra, bước liên kết ngay sau đó kêu ' +
           '<code>ld.bfd: cannot find main.o: No such file or directory</code>. ' +
           '<b>Đó không phải khuyết tật thứ hai</b> — nó chỉ là hệ quả của việc bạn vẫn cố ' +
           'liên kết sau khi giai đoạn 2 đã chết. Nhận ra điều này là một kỹ năng thật: ' +
           'trong một bản build dài, luôn đọc thông báo <b>đầu tiên</b>, không phải thông ' +
           'báo cuối cùng.<br>' +
           'Sửa: thêm <code>double diag(double a, double b);</code> vào ' +
           '<code>geo.h</code>.<br><br>' +
           '<b>Lượt build 2 — giai đoạn 2 sạch, và giai đoạn 4 tố cáo HAI khuyết tật cùng ' +
           'lúc:</b><br>' +
           '<code>/usr/bin/x86_64-linux-gnu-ld.bfd: geo.o: in function `area\':</code><br>' +
           '<code>geo.c:(.text+0x0): multiple definition of `area\'; ' +
           'main.o:main.c:(.text+0x0): first defined here</code><br>' +
           '<code>/usr/bin/x86_64-linux-gnu-ld.bfd: geo.o: in function `diag\':</code><br>' +
           '<code>geo.c:(.text+0x60): undefined reference to `sqrt\'</code><br>' +
           'Đây là chi tiết đáng học nhất của cả câu, và nó khác với dự đoán tự nhiên: ' +
           '<code>ld</code> <b>không</b> dừng ở lỗi đầu tiên — nó quét hết rồi báo tất cả ' +
           'những gì nó tìm được. Giai đoạn 2 thì ngược lại, nó chết ngay. Vì vậy ' +
           '"sửa từng lỗi một" là đúng với giai đoạn 2 và lãng phí với giai đoạn 4.<br><br>' +
           '<b>Khuyết tật 2 — <code>multiple definition of \'area\'</code>.</b> ' +
           'Dấu hiệu: tên <code>ld.bfd</code>, và toạ độ là độ lệch byte ' +
           '<code>(.text+0x0)</code>, không phải số dòng. Nguyên nhân: <code>geo.h</code> ' +
           'chứa một <b>định nghĩa</b>, và cả hai file <code>.c</code> đều include nó, nên ' +
           'cả <code>geo.o</code> lẫn <code>main.o</code> đều mang một bản mã máy đầy đủ ' +
           'của <code>area</code>. Header guard <b>không cứu được</b> vì mỗi file ' +
           '<code>.c</code> chạy giai đoạn 1 riêng và macro <code>GEO_H</code> không sống ' +
           'sót qua ranh giới file. Sửa: <code>geo.h</code> để lại đúng ' +
           '<code>double area(double r);</code>, chuyển thân hàm sang ' +
           '<code>geo.c</code>.<br><br>' +
           '<b>Khuyết tật 3 — <code>undefined reference to \'sqrt\'</code> tại ' +
           '<code>geo.c:(.text+0x60)</code>.</b> ' +
           'Sửa: <code>gcc -o app main.o geo.o -lm</code>, và <code>-lm</code> phải ở ' +
           '<b>cuối</b>. Đã kiểm chứng: đặt nó trước ' +
           '(<code>gcc -o app -lm main.o geo.o</code>) thì nhận lại <b>đúng thông báo cũ</b>, ' +
           'mã thoát vẫn 1 — xem E4.<br>' +
           'Vì sao khuyết tật này sẽ <b>không</b> xuất hiện nếu <code>diag()</code> chỉ được ' +
           'gọi với hằng số: khi cả hai tham số biết trước, gcc tính sẵn ' +
           '<code>sqrt</code> ở giai đoạn 2 và lời gọi biến mất, nên ' +
           '<code>nm geo.o</code> không có <code>U sqrt</code> nào để mà thiếu. Ở đây ' +
           '<code>main.c</code> lấy giá trị từ <code>atof(argv[1])</code>, nên lời gọi là ' +
           'thật.<br><br>' +
           '<b>Sau khi sửa cả ba:</b> build sạch, <code>./app 3</code> in ' +
           '<code>area = 28.274310</code> và <code>diag = 4.242641</code>.<br><br>' +
           '<b>Điều đáng rút ra không phải ba bản sửa mà là ba dòng đầu tiên.</b> Ba thông ' +
           'báo trông "cùng loại" với người mới — đều là "gcc kêu" — nhưng chúng đến từ ba ' +
           'chỗ khác nhau và đòi ba hành động khác nhau: sửa <b>header</b>, sửa ' +
           '<b>cấu trúc dự án</b>, sửa <b>dòng lệnh</b>. Không cái nào trong ba cái đó là ' +
           '"mở file .c ra sửa logic". Đây là trục 2, ở dạng bạn sẽ gặp thật trong đời.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Bạn đã đo được: <code>calc.o</code> <b>1 800</b> byte → <code>calc</code> ' +
         '<b>16 072</b> byte. Thêm một phép đo nữa:<br><br>' +
         '<code>gcc -static -o calc_static calc.c</code> cho ra <b>816 856</b> byte — ' +
         'gấp <b>51 lần</b> bản thường.<br><br>' +
         'Câu hỏi mở, và bạn <b>không cần</b> trả lời hết: <b>(1)</b> 14 272 byte thêm vào ở ' +
         'bản thường gồm những gì, nếu mã của <code>printf</code> <b>không</b> nằm trong đó? ' +
         '<b>(2)</b> vậy lúc chạy, mã của <code>printf</code> đến từ đâu và ai đưa nó vào? ' +
         '<b>(3)</b> nếu bo mạch của bạn chỉ có <b>4 MB</b> flash cho toàn bộ rootfs, và ' +
         'bạn có <b>30</b> chương trình như thế này, bạn chọn bản thường hay bản ' +
         '<code>-static</code>? Tính thử cả hai con số trước khi trả lời.<br><br>' +
         'Hãy tự chạy các lệnh khảo sát mà bạn nghĩ ra (<code>ldd</code>, ' +
         '<code>nm</code>, <code>size</code>, <code>file</code>) và ghi lại điều bạn tìm ' +
         'được — kể cả những chỗ bạn chưa lý giải nổi.',
      rows: 10,
      hint: 'Bắt đầu bằng <code>ldd calc</code> và <code>ldd calc_static</code>. Sự khác ' +
            'nhau giữa hai output đó là gần như toàn bộ câu trả lời cho (2).',
      crit: [
        'Nêu được ít nhất hai thành phần của 14 272 byte: mã khởi động (<code>_start</code>/<code>crt1.o</code>), bảng liên kết động, header ELF và các section',
        '<code>ldd calc</code> liệt kê <code>libc.so.6</code> và <code>/lib64/ld-linux-x86-64.so.2</code>; <code>ldd calc_static</code> <b>không</b> liệt kê thư viện nào',
        'Nhận ra <code>ld-linux</code> là <b>bộ nạp động</b> — nó chạy TRƯỚC chương trình của bạn và đi nạp <code>libc.so.6</code> vào bộ nhớ',
        'Tính được hai con số: 30 × 16 072 ≈ <b>0,48 MB</b> cộng một bản <code>libc.so.6</code> dùng chung (~2 MB) so với 30 × 816 856 ≈ <b>24,5 MB</b>',
        'Kết luận đúng cho ràng buộc 4 MB: bản <b>động</b>, vì <code>libc</code> được trả tiền <b>một lần</b> cho cả hệ thống',
        'Ghi lại ít nhất một điều bạn chưa lý giải được (câu này được phép còn dở dang)'
      ],
      sol: '<b>Đây là câu để lại dang dở có chủ đích — Bài 17 sẽ trả lời trọn vẹn.</b> ' +
           'Dưới đây là phần đủ để bạn tự kiểm tra hướng suy nghĩ.<br><br>' +
           '<b>(1)</b> 14 272 byte thêm vào <b>không</b> chứa mã của <code>printf</code>. ' +
           'Chúng gồm: mã khởi động của C (<code>_start</code> và bạn bè, đến từ ' +
           '<code>crt1.o</code> mà <code>ld</code> tự thêm vào) — chính là ký hiệu ' +
           '<code>T _start</code> ở địa chỉ <code>0x10c0</code> bạn thấy ở B2; các bảng để ' +
           'liên kết động lúc chạy (danh sách "tôi cần <code>printf</code>, ' +
           '<code>strlen</code>, <code>snprintf</code> từ <code>libc.so.6</code>"); header ' +
           'ELF và bộ máy quản lý section. Nói cách khác: phần lớn 14 KB đó là ' +
           '<b>thủ tục</b>, không phải mã làm việc.<br><br>' +
           '<b>(2)</b> <code>ldd calc</code> đã trả lời:<br>' +
           '<code>linux-vdso.so.1</code> · <code>libc.so.6 =&gt; ' +
           '/usr/lib/x86_64-linux-gnu/libc.so.6</code> · ' +
           '<code>/lib64/ld-linux-x86-64.so.2</code><br>' +
           'File thứ ba mới là nhân vật chính: <b>bộ nạp động</b> (dynamic loader). Khi bạn ' +
           'gõ <code>./calc</code>, kernel <b>không</b> nhảy thẳng vào ' +
           '<code>_start</code> của bạn — nó nạp <code>ld-linux</code> trước, và ' +
           '<code>ld-linux</code> đi mở <code>libc.so.6</code>, ánh xạ vào bộ nhớ, lấp mọi ' +
           'địa chỉ còn trống, <i>rồi mới</i> trao quyền cho chương trình của bạn. Tức là ' +
           '<b>giai đoạn 4 chưa kết thúc lúc build — một phần của nó được hoãn tới lúc ' +
           'chạy</b>. Câu đó là toàn bộ nội dung của <b>Bài 17</b>.<br>' +
           '<code>ldd calc_static</code> thì trả lời <i>not a dynamic executable</i>: mọi ' +
           'thứ đã nằm sẵn trong file, không cần ai nạp thêm gì.<br><br>' +
           '<b>(3) Hai con số.</b><br>' +
           '· Bản động: 30 × 16 072 ≈ <b>482 KB</b>, cộng <b>một</b> bản ' +
           '<code>libc.so.6</code> dùng chung cho cả hệ thống (~2 MB trên máy này) ≈ ' +
           '<b>2,5 MB</b>. Vừa 4 MB, còn chỗ thở.<br>' +
           '· Bản tĩnh: 30 × 816 856 ≈ <b>24,5 MB</b>. <b>Vượt 6 lần</b> dung lượng flash. ' +
           'Không nạp được.<br>' +
           'Nên câu trả lời cho ràng buộc này là <b>bản động</b>, và lý do gọn: với thư viện ' +
           'chia sẻ bạn trả tiền cho <code>libc</code> <b>một lần</b>, còn với liên kết tĩnh ' +
           'bạn trả tiền <b>mỗi chương trình một lần</b>.<br>' +
           'Nhưng đừng vội kết luận "động luôn thắng". Có <b>ba</b> tình huống mà liên kết ' +
           'tĩnh đúng, và bạn sẽ gặp cả ba trong khoá này: khi hệ thống chỉ có ' +
           '<i>một</i> chương trình (thì chẳng chia sẻ với ai); khi chương trình phải chạy ' +
           '<b>trước khi</b> rootfs được gắn — đúng trường hợp <code>init</code> ở ' +
           'Chặng 05; và khi bạn cần chắc chắn tuyệt đối rằng nó chạy được trên một hệ thống ' +
           'có phiên bản <code>libc</code> khác. Đây là một quyết định kỹ thuật có hai chiều, ' +
           'không phải một quy tắc.<br><br>' +
           '<b>Nếu bạn chưa lý giải được điều gì đó khi khảo sát, đừng xoá nó đi — hãy ghi ' +
           'lại.</b> Đọc Bài 17 với một câu hỏi cụ thể trong đầu hiệu quả hơn nhiều so với ' +
           'đọc để "biết thêm".' },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══ */
  diag: [
    ['A1, B1, C3, E2, B6',
     'Bạn còn coi macro là "một hàm nhanh hơn". Bộ tiền xử lý <b>chỉ thay văn bản</b>: nó ' +
     'không biết ưu tiên toán tử, không biết kiểu, và không cảnh báo. Hai trong ba cái bẫy ' +
     'macro chạy sai <b>hoàn toàn im lặng</b> ngay cả với <code>-Wall -Wextra</code>.',
     '<a href="#/bai-15#giai-doan-1-tien-xu-ly-mot-cong-cu-thay-the-van-ban">Đọc lại Bài 15 · Giai đoạn 1 — Tiền xử lý: một công cụ thay thế văn bản</a>'],

    ['A5, B2, C2, E4',
     'Bạn còn tin "biên dịch xong không lỗi nghĩa là chương trình đã đầy đủ". Giai đoạn 2 ' +
     'chỉ cần <b>khai báo</b>; <b>định nghĩa</b> mãi tới giai đoạn 4 mới bị đòi. Công cụ ' +
     'kiểm chứng là <code>nm</code>: chữ <code>U</code> là danh sách những gì bộ liên kết ' +
     'sắp phải đi tìm.',
     '<a href="#/bai-15#giai-doan-4-lien-ket-khai-bao-dinh-nghia-va-ky-hieu">Đọc lại Bài 15 · Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu</a>'],

    ['A2, B3, C1, E5',
     'Bạn chưa đọc được <b>giai đoạn</b> từ dòng đầu của thông báo lỗi. Ba dấu hiệu, theo ' +
     'thứ tự: có tên <code>ld</code>/<code>collect2</code> → giai đoạn 4 · có ' +
     '<code>file.c:dòng:cột</code> → giai đoạn 2 · nói về header không mở được → giai ' +
     'đoạn 1.',
     '<a href="#/bai-15#mot-lenh-gcc-that-ra-la-bon-chuong-trinh">Đọc lại Bài 15 · Một lệnh gcc thật ra là bốn chương trình</a>'],

    ['A3, A8, E1',
     'Bạn chưa thuộc dây chuyền bốn giai đoạn và bốn điểm dừng. Nắm được ' +
     '<code>-E</code> / <code>-S</code> / <code>-c</code> / không cờ là nắm được cách ' +
     '<b>cô lập</b> mọi lỗi build về đúng một giai đoạn.',
     '<a href="#/bai-15#thuc-hanh-dung-lai-sau-tung-giai-doan">Đọc lại Bài 15 · Thực hành: dừng lại sau từng giai đoạn</a>'],

    ['A6, B4, C5, E5 (khuyết tật 2)',
     'Bạn còn nghĩ header guard ngăn được <code>multiple definition</code>. Guard chỉ có ' +
     'hiệu lực <b>trong một đơn vị biên dịch</b>. Quy tắc phải thuộc: header là nơi ' +
     '<b>khai báo</b>, file <code>.c</code> là nơi <b>định nghĩa</b> — trừ ' +
     '<code>static inline</code>.',
     '<a href="#/bai-15#header-header-guard-va-quy-tac-mot-dinh-nghia">Đọc lại Bài 15 · Header, header guard và quy tắc một định nghĩa</a>'],

    ['A4, E2',
     'Bạn chưa nắm rằng <code>#if</code>/<code>#ifdef</code> <b>xoá hẳn văn bản</b> ở giai ' +
     'đoạn 1, nên mã trong nhánh bị tắt không bao giờ được kiểm tra cú pháp — và chỉ dẫn ' +
     'dòng <code># 1 "file.h"</code> trong <code>.i</code> là thứ giữ cho thông báo lỗi trỏ ' +
     'đúng file gốc.',
     '<a href="#/bai-15#giai-doan-1-tien-xu-ly-mot-cong-cu-thay-the-van-ban">Đọc lại Bài 15 · Giai đoạn 1 — Tiền xử lý: một công cụ thay thế văn bản</a>'],

    ['C4',
     'Bạn chưa đọc được bảng ký hiệu. Chữ <b>HOA</b> = cả thế giới thấy, chữ <b>thường</b> ' +
     '= chỉ file này thấy. Một hàm <code>static</code> hiện ra là <code>t</code> và bộ liên ' +
     'kết <b>không được phép</b> dùng nó cho file khác — đó là cả lời giải cho một lỗi ' +
     '<code>undefined reference</code> rất khó hiểu.',
     '<a href="#/bai-14#static-mot-tu-khoa-ba-nghia-hoan-toan-khac-nhau">Đọc lại Bài 14 · static: một từ khoá, ba nghĩa hoàn toàn khác nhau</a>'],

    ['B5, C3, C5',
     'Bạn chưa quyết được lúc nào dùng macro, lúc nào dùng <code>static inline</code>. ' +
     'Khác biệt <b>quyết định</b> chỉ có một: macro đánh giá tham số <b>nhiều lần</b>, hàm ' +
     'đánh giá <b>đúng một lần</b>. Mọi lý lẽ về tốc độ đều đứng sau điều đó.',
     '<a href="#/bai-15#giai-doan-1-tien-xu-ly-mot-cong-cu-thay-the-van-ban">Đọc lại Bài 15 · Giai đoạn 1 — Tiền xử lý: một công cụ thay thế văn bản</a>'],

    ['C2, E4, E5 (khuyết tật 3)',
     'Bạn chưa nắm luật thứ tự trên dòng lệnh liên kết: <b>thư viện phải đứng sau thứ cần ' +
     'nó</b>. Và nhớ cái bẫy đi kèm: <code>sqrt(2.0)</code> với hằng số bị gấp hằng ở giai ' +
     'đoạn 2, nên <code>-lm</code> thiếu mà vẫn build được — cho tới lần sửa mã sau.',
     '<a href="#/bai-15#giai-doan-4-lien-ket-khai-bao-dinh-nghia-va-ky-hieu">Đọc lại Bài 15 · Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu</a>'],

    ['E1, E3',
     'Bạn còn bất ngờ với việc <code>.i</code> phình lên hàng chục KB rồi <code>.s</code> ' +
     'teo lại còn 1 KB. Lý do: header gần như toàn <b>khai báo</b>, và khai báo không sinh ' +
     'ra một byte mã máy nào. Đây là trục 1 hiện ra dưới dạng con số.',
     '<a href="#/bai-15#giai-doan-2-va-3-tu-c-xuong-assembly-roi-xuong-byte">Đọc lại Bài 15 · Giai đoạn 2 và 3 — từ C xuống assembly rồi xuống byte</a>'],

    ['D1',
     'Bạn chưa chắc <code>sizeof</code> do ai tính. Nó là toán tử của <b>ngôn ngữ C</b>, ' +
     'nên bộ tiền xử lý không đụng tới được; trình biên dịch tính ở giai đoạn 2 và viết ' +
     'thẳng hằng số vào assembly. Đó cũng là lý do <code>#if sizeof(int)==4</code> không ' +
     'biên dịch được.',
     '<a href="#/bai-14#kieu-du-lieu-bo-int-di-dung-uint32-t">Đọc lại Bài 14 · Kiểu dữ liệu: bỏ int đi, dùng uint32_t</a>'],

    ['D2, E2, E3',
     'Bạn chưa dùng thành thạo <code>grep -n</code> để định vị trong file lớn. ' +
     '<code>-n</code> trả lời "<i>ở đâu</i>", <code>-c</code> trả lời "<i>bao nhiêu</i>" — ' +
     'và <code>gcc -E</code> + <code>grep -n</code> là cặp công cụ bạn sẽ dùng suốt Chặng 07.',
     '<a href="#/bai-11#grep-tim-dong-khop-mau">Đọc lại Bài 11 · grep: tìm dòng khớp mẫu</a>'],

    ['D3',
     'Bạn chưa quen rằng header nằm ở gói <code>-dev</code> riêng, tách khỏi gói thư viện ' +
     'lúc chạy. <code>fatal error: xyz.h: No such file</code> gần như luôn là "thiếu gói ' +
     '<code>-dev</code>", không phải "thiếu file cần tải về".',
     '<a href="#/bai-12#kho-phan-mem-chi-muc-va-chuoi-tin-cay">Đọc lại Bài 12 · Kho phần mềm, chỉ mục và chuỗi tin cậy</a>'],

    ['E4 (mã thoát), E5 (dòng đầu)',
     'Bạn còn đọc nhầm thông báo nào là nguyên nhân. Hai kỷ luật: lấy <code>$?</code> ' +
     '<b>ngay dòng sau</b> lệnh, không qua đường ống (nếu không bạn đang đo mã thoát của ' +
     '<code>head</code>); và đọc thông báo <b>đầu tiên</b>, vì mọi thông báo sau có thể chỉ ' +
     'là hệ quả.',
     '<a href="#/bai-10#duong-ong-noi-stdout-cua-lenh-nay-vao-stdin-cua-lenh-kia">Đọc lại Bài 10 · Đường ống: nối stdout của lệnh này vào stdin của lệnh kia</a>'],

    ['E6',
     'Bạn chưa hình dung được cái gì nằm trong file thực thi mà không nằm trong ' +
     '<code>.o</code>: mã khởi động <code>_start</code>, bảng liên kết động, header ELF — ' +
     'và <b>không</b> có mã của <code>printf</code>. Câu này cố tình để dở: Bài 17 trả lời ' +
     'nốt.',
     '<a href="#/bai-15#giai-doan-4-lien-ket-khai-bao-dinh-nghia-va-ky-hieu">Đọc lại Bài 15 · Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu</a>'],
  ],
});

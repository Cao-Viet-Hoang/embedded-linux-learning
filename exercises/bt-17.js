/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 17 — Thư viện tĩnh và động
   Cặp với lessons/bai-17.js · Chặng 02 · C và công cụ build

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (16 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 17):
     ba cách một hàm đến chương trình, mã copy hay chỉ ghi tên · .so không
     copy mã, chỉ ghi NEEDED, resolve lúc chạy · người tìm lúc build (ld) và
     người tìm lúc chạy (ld.so) khác nhau, khác cả nơi tìm · thứ tự tham số
     liên kết, thư viện phải đứng sau · -fPIC vì .so không biết trước địa chỉ
     nạp (đa tiến trình + ASLR), giá là một lần đọc GOT thêm · đơn vị nhỏ
     nhất trình liên kết tĩnh lấy ra là một file .o, không phải một hàm ·
     ld.so tìm theo thứ tự RPATH → LD_LIBRARY_PATH → RUNPATH → cache →
     mặc định · $ORIGIN là ký hiệu ld.so hiểu, thay bằng thư mục chứa file
     thực thi lúc chạy · soname là hợp đồng ABI, NEEDED ghi soname chứ không
     ghi tên file mở · ba tầng tên linker/soname/real name · khi cả .a và
     .so cùng tên đều có mặt, trình liên kết luôn ưu tiên .so · ép tĩnh một
     thư viện cụ thể bằng cặp -Bstatic/-Bdynamic · quyết định tĩnh/động dựa
     trên tổng dung lượng CẢ HỆ THỐNG, điểm hoà vốn khoảng 3 chương trình ·
     glibc tĩnh vẫn cần .so lúc chạy nếu dùng NSS (getaddrinfo…) · ar rcs và
     mục lục ký hiệu · ar tv timestamp 1970 vì build tái lập được · nm -D đọc
     được cả khi đã strip

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                        PT  GIÁ  PTG  TỔNG
     .so không copy mã; người tìm lúc build (ld) và  2    2    2     6   ← trục 0
       người tìm lúc chạy (ld.so) là hai hệ khác nhau
     đơn vị nhỏ nhất trình liên kết tĩnh lấy ra là     2    1    2     5   ← trục 1
       MỘT FILE .o, không phải một hàm
     cả .a và .so cùng tên → luôn ưu tiên .so; ép      1    2    2     5   ← trục 2
       tĩnh một thư viện cụ thể cần cặp -Bstatic/
       -Bdynamic
     soname là hợp đồng ABI, NEEDED ghi soname chứ    1    2    2     5   ✗ xếp sau (†)
       không ghi tên file mở
     -fPIC vì .so không biết trước địa chỉ nạp         1    1    2     4   ✗ xếp sau
     glibc tĩnh vẫn cần .so nếu dùng NSS               1    2    2     5   ✗ xếp sau (‡)
     quyết định tĩnh/động dựa trên TOÀN HỆ THỐNG       1    1    2     4   ✗ xếp sau
     thứ tự tham số liên kết, thư viện đứng sau         1    1    1     3   ✗ cắt
     $ORIGIN thay bằng thư mục chứa file thực thi       1    1    1     3   ✗ cắt
     ar rcs và mục lục ký hiệu                          1    0    0     1   ✗ cắt
     ar timestamp 1970 vì build tái lập được            0    1    1     2   ✗ cắt
     nm -D đọc được cả khi đã strip                     0    1    1     2   ✗ cắt

     (†) đạt 5 điểm và cả ba trục con ≥ 1, NHƯNG bị xếp sau vì trùng loại
         "hợp đồng đặt tên" quá gần trục 2 (cả hai đều là "cơ chế đặt tên
         quyết định cái gì được ghi vào NEEDED") — chọn cả hai sẽ làm hai
         trục dùng chung một loại dữ liệu minh chứng (readelf -d | grep
         NEEDED). Dùng làm bề rộng ở A8 (ghép nối ba tầng tên) và C4 (tình
         huống mới: quyết định tăng soname hay không).
     (‡) đạt 5 điểm nhưng là một CẢNH BÁO cụ thể (một danh sách hàm NSS),
         không phải một cơ chế tổng quát có thể hỏi ở cả ba tầng A/B/C mà
         không lặp từ vựng — tầng C của nó sẽ luôn quy về "dùng musl". Dùng
         làm bề rộng ở B5 (bắt lỗi phát biểu).

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Ba ứng viên đầu đạt
   6/5/5, đều có cả ba trục con ≥ 1 → lấy đúng ba.

   Bước 4 · Loại và điều phối:
     · Không ứng viên nào trùng trục đã tiêu của bt-01…bt-16 (§13.8 ở dưới).
     · Trục 0 và trục 2 CÙNG nói về "quyết định lúc chạy", nhưng khác điều:
       trục 0 là hai HỆ THỐNG tìm kiếm khác nhau (build-time vs run-time);
       trục 2 là LUẬT ƯU TIÊN khi cả hai định dạng cùng tồn tại. Khác câu
       hỏi, không xoáy lại cùng một điều — kiểm tra bằng cách hỏi "nếu chỉ
       có .so, không có .a, trục 2 còn áp dụng không?" — không, vì trục 2
       cần CẢ HAI cùng tồn tại; trục 0 áp dụng bất kể có .a hay không.
     · "-fPIC" (4 điểm) bị xếp sau vì cả ba tầng câu hỏi của nó đều quy về
       một phép so sánh mã máy (đối chiếu objdump) — không có tầng "quyết
       định trong tình huống mới" tách biệt khỏi tầng "đọc dữ liệu thật",
       nên làm trục sẽ phải bịa. Dùng làm bề rộng ở B6 (đọc output đối chiếu
       mã máy) và A5.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · Thư viện ĐỘNG không được trình liên kết chép mã vào — nó chỉ ghi
         lại một cái TÊN. Có HAI hệ thống tìm thư viện, ở hai thời điểm khác
         nhau, không chia sẻ quy tắc: <code>ld</code> lúc build (chỉ nghe
         <code>-L</code>) và <code>ld.so</code> lúc chạy (chỉ nghe RPATH →
         LD_LIBRARY_PATH → RUNPATH → cache → mặc định). Build thành công
         KHÔNG chứng minh chương trình chạy được.
     1 · Trình liên kết lấy thư viện tĩnh theo đơn vị THÀNH VIÊN — nguyên
         một file .o — không theo từng hàm riêng lẻ. Gọi một hàm trong một
         file .o kéo theo MỌI hàm khác cùng nằm trong file đó, dù chúng
         không được gọi tới.
     2 · Khi cả .a và .so cùng tên đều có mặt trong đường tìm, trình liên
         kết LUÔN ưu tiên bản động — không quan tâm file nào mới hơn, không
         quan tâm ý định của người viết Makefile. Muốn ép tĩnh một thư viện
         cụ thể phải bọc nó giữa <code>-Wl,-Bstatic</code> và
         <code>-Wl,-Bdynamic</code>.

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng
   ở C):
     0 · "gcc build thành công với -L. -lops thì lúc chạy chương trình chắc
         chắn cũng tìm ra thư viện — build đã tìm thấy thì chạy cũng vậy."
     1 · "Trình liên kết tĩnh chỉ lấy đúng những hàm được gọi tới, nên nhét
         bao nhiêu hàm vào một file .c cũng không ảnh hưởng dung lượng
         chương trình cuối."
     2 · "Có sẵn libfoo.a trong thư mục là đủ để chắc chắn chương trình build
         ra đã liên kết tĩnh với nó."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (phát biểu, tình huống khác lesson)  B1 (ba transcript thật
              MỚI: đổi tên .so khiến build-time fail khác hẳn run-time fail,
              cộng chứng minh biến môi trường tồn tại xuyên thư mục)
              C1 (tình huống mới: thiết bị chỉ có /opt/myapp read-only,
              không chạy được ldconfig, quyết định cơ chế đúng)
     trục 1 → A2 (phát biểu)  B2 (transcript thật MỚI: 5 hàm trong 1 file,
              gọi 1 hàm, cả 5 xuất hiện trong nm)  C2 (chẩn đoán: firmware
              phình ra sau khi thêm một file .c chứa nhiều hàm, số đo thật)
     trục 2 → A3 (phát biểu)  B3 (transcript thật MỚI: cùng thư mục có cả
              hai, NEEDED luôn ghi .so; ép -Bstatic/-Bdynamic đổi NEEDED)
              C3 (chẩn đoán: "chỉ gửi .a nhưng ldd trên thiết bị vẫn liệt kê
              .so" — suy luận từ cơ chế đã học ở B, không chạy lại)
     · Ba mức dùng ba loại kích thích khác nhau: phát biểu (A) · transcript
       thật, MỚI dựng riêng cho bộ này (B) · tình huống có ràng buộc mới
       không trả lời được nếu không nắm trục (C).

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
     bt-15 tiền xử lý chỉ thay văn bản · khai báo đủ cho gđ2, định nghĩa cần gđ4 ·
           mỗi thông báo lỗi tố cáo giai đoạn của nó
     bt-16 make chỉ so mtime của phụ thuộc đã khai báo · .PHONY vì mọi mục tiêu là tên
           file · obj-$(CONFIG_X) ghép tên biến từ giá trị cấu hình
   Ba trục của bt-17 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 23/08/2026, gcc 15.2.0
   (Ubuntu 15.2.0-16ubuntu1), máy 6 lõi (nproc = 6). Các transcript trong B,
   C và E là dữ liệu MỚI, dựng riêng cho bộ bài tập này (tên file, tên hàm và
   kịch bản khác với lessons/bai-17.js), để người học không thể trả lời chỉ
   bằng cách nhớ lại đúng dòng trong bài học.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-17',
  minutes: 85,

  intro:
    '<p>Bài 17 dạy một sự thật khó chịu: <b>build thành công không có nghĩa là chương trình ' +
    'chạy được.</b> Với thư viện động, có <b>hai</b> chương trình đi tìm nó, ở hai thời điểm ' +
    'khác nhau, không hề chia sẻ quy tắc. Bộ bài tập này đặt bạn vào những tình huống lesson ' +
    'chưa từng diễn ra: đổi tên một file <code>.so</code>, một thư mục chỉ đọc trên thiết bị ' +
    'nhúng, một file <code>.c</code> nhét quá nhiều hàm, một chỗ giao <code>.a</code> lẫn ' +
    '<code>.so</code> gây hiểu lầm. Nếu bạn hiểu <b>cơ chế</b>, bạn giải được cả bốn; nếu chỉ ' +
    'nhớ ví dụ trong bài, bốn tình huống này sẽ chặn bạn lại.</p>' +
    '<p><b>Chia làm hai lượt:</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài 17</b> (~25 phút): phần <b>A</b> và <b>B</b>.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (~60 phút): phần <b>C</b>, <b>D</b> và <b>E</b>.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần một terminal WSL. Mọi transcript trong B, C và E là số đo thật, mới, ' +
    'dựng riêng cho bộ này — nếu máy bạn ra kết quả khác, hãy tìm hiểu vì sao trước khi kết ' +
    'luận bộ bài tập sai.</p>',

  truc: [
    { id: 'runtime-search',
      name: '.so không copy mã, chỉ ghi TÊN — người tìm lúc build (ld) và người tìm lúc chạy (ld.so) là hai hệ thống khác nhau',
      x: 'Trình liên kết không chép mã của thư viện động vào file thực thi — nó chỉ ghi một cái ' +
         'TÊN vào mục NEEDED. Việc tìm ra file thật, nạp nó, và nối các lời gọi hàm bị hoãn lại ' +
         'tới mỗi lần chương trình khởi động, và người thực hiện việc đó — ld.so — dùng một bộ ' +
         'quy tắc tìm kiếm (RPATH → LD_LIBRARY_PATH → RUNPATH → cache → mặc định) hoàn toàn khác ' +
         'với cờ <code>-L</code> mà trình liên kết lúc build từng nghe theo.',
      mis: 'gcc build thành công với -L. -lops thì lúc chạy chương trình chắc chắn cũng tìm ra thư viện — build đã tìm thấy thì chạy cũng vậy.' },

    { id: 'whole-member',
      name: 'Trình liên kết tĩnh lấy thư viện theo đơn vị THÀNH VIÊN (một file .o), không theo từng hàm',
      x: 'Khi liên kết với một thư viện tĩnh, trình liên kết tìm thành viên nào cung cấp ký hiệu ' +
         'đang thiếu, rồi lấy nguyên VẸN file .o đó — không tách riêng từng hàm bên trong. Gọi ' +
         'một hàm trong một file .o kéo theo mọi hàm khác cùng nằm trong file đó vào chương trình ' +
         'cuối cùng, dù chúng chưa từng được gọi tới ở đâu cả.',
      mis: 'Trình liên kết tĩnh chỉ lấy đúng những hàm được gọi tới, nên nhét bao nhiêu hàm vào một file .c cũng không ảnh hưởng dung lượng chương trình cuối.' },

    { id: 'so-wins',
      name: 'Khi cả .a và .so cùng tên đều có mặt, trình liên kết LUÔN ưu tiên bản động',
      x: 'Đây là một luật cố định của trình liên kết, không phụ thuộc file nào mới hơn, không ' +
         'phụ thuộc ý định của người viết lệnh build: nếu cả libfoo.a và libfoo.so cùng nằm trong ' +
         'đường tìm (-L), -lfoo luôn chọn bản .so. Muốn ép tĩnh một thư viện cụ thể trong khi các ' +
         'thư viện khác (như libc) vẫn động, phải bọc nó giữa -Wl,-Bstatic và -Wl,-Bdynamic.',
      mis: 'Có sẵn libfoo.a trong thư mục là đủ để chắc chắn chương trình build ra đã liên kết tĩnh với nó.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn build thành công <code>gcc main.c -L/opt/libs -lfoo -o app</code> — không một ' +
         'cảnh báo nào. Bạn copy <b>chỉ file <code>app</code></b> (không copy ' +
         '<code>/opt/libs</code>) sang một máy khác rồi chạy <code>./app</code>. Điều gì đúng?',
      opts: [
        'Chạy được — vì build đã tìm thấy <code>libfoo</code> nên thông tin đó được lưu vào <code>app</code>',
        'Chắc chắn lỗi cú pháp, vì thiếu <code>-L/opt/libs</code> lúc chạy',
        'Có thể lỗi <code>cannot open shared object file</code> — <code>-L</code> chỉ có tác dụng lúc build; lúc chạy, <code>ld.so</code> không hề biết gì về đường dẫn đó',
        'Chạy được nếu máy đích cũng cài gcc'
      ],
      a: 2,
      why: '<b>Build thành công không đảm bảo chạy được.</b> <code>-L/opt/libs</code> chỉ là ' +
           'chỉ dẫn cho trình liên kết LÚC BUILD tìm ra <code>libfoo.so</code> để xác nhận ký ' +
           'hiệu tồn tại — nó không được ghi vào file <code>app</code> theo cách ' +
           '<code>ld.so</code> đọc được. <code>ld.so</code> lúc chạy chỉ nghe RPATH, ' +
           '<code>LD_LIBRARY_PATH</code>, RUNPATH, bộ nhớ đệm hệ thống, và đường mặc định — nếu ' +
           'không cái nào trỏ tới đúng chỗ, kết quả là ' +
           '<code>error while loading shared libraries</code>, thoát mã 127.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Thư viện tĩnh <code>libtext.a</code> có đúng MỘT file thành viên ' +
         '<code>text_utils.o</code>, được biên dịch từ một file <code>text_utils.c</code> chứa ' +
         '<b>tám</b> hàm xử lý chuỗi. Chương trình của bạn chỉ gọi một hàm trong số đó: ' +
         '<code>trim_spaces()</code>. Sau khi liên kết tĩnh, file thực thi chứa gì?',
      opts: [
        'Chỉ đúng hàm <code>trim_spaces()</code> — trình liên kết tách được từng hàm trong một file .o',
        'Cả tám hàm — vì đơn vị nhỏ nhất được lấy ra là nguyên một file .o (thành viên), không phải một hàm',
        'Không hàm nào — thư viện chỉ có một thành viên nên trình liên kết bỏ qua nó',
        'Chỉ bốn hàm — trình liên kết lấy một nửa file theo kích thước'
      ],
      a: 1,
      why: '<b>Cả tám hàm.</b> Trình liên kết tĩnh quyết định lấy hay không lấy một thành viên, ' +
           'không quyết định lấy hay không lấy một hàm bên trong thành viên đó. Vì cả tám hàm ' +
           'cùng nằm trong <code>text_utils.o</code>, gọi một trong số chúng kéo theo bảy hàm ' +
           'còn lại vào chương trình cuối cùng, dù không ai gọi tới chúng. Đây là lý do các thư ' +
           'viện thật chia nhỏ mã nguồn thành nhiều file <code>.c</code>, mỗi file một nhóm hàm ' +
           'có liên quan.' },

    { id: 'a3', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Thư mục build có cả <code>libnet.a</code> và <code>libnet.so</code>. Bạn chạy ' +
         '<code>gcc app.o -L. -lnet -o app</code> — không cờ <code>-Wl,-Bstatic</code> hay ' +
         '<code>-Wl,-Bdynamic</code> nào. <code>readelf -d app | grep NEEDED</code> sẽ cho thấy ' +
         'gì?',
      opts: [
        'Không có <code>libnet</code> nào trong NEEDED — vì cả hai định dạng cùng tồn tại nên trình liên kết bỏ qua',
        '<code>libnet.a</code> được chọn vì nó đứng trước trong thứ tự chữ cái',
        '<code>libnet.so</code> (hoặc soname của nó) — trình liên kết luôn ưu tiên bản động khi cả hai cùng có mặt, bất kể file nào mới hơn',
        'Trình liên kết báo lỗi mơ hồ vì tên trùng giữa hai định dạng'
      ],
      a: 2,
      why: '<b>Luôn chọn bản động</b> khi không có công tắc ép buộc. Đây là luật cố định của ' +
           'trình liên kết, không phụ thuộc mtime hay chủ ý — nó không "so sánh" hai file, nó chỉ ' +
           'có một thứ tự ưu tiên cố định. Hệ quả thực dụng: một dự án tưởng đã build tĩnh vì ' +
           'thư mục có <code>.a</code> hoàn toàn có thể đang chạy động, và chỉ lộ ra khi copy ' +
           'sang một thiết bị thiếu <code>libnet.so</code>.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gõ <code>gcc -lm quad.c -o quad</code> (thư viện đặt TRƯỚC file nguồn) và nhận ' +
         '<code>undefined reference to \'sqrt\'</code>. Vì sao?',
      opts: [
        'Vì <code>-lm</code> không tồn tại trên hệ thống này',
        'Vì trình liên kết đọc tham số một lượt từ trái sang phải; lúc gặp <code>-lm</code> chưa ai cần <code>sqrt</code>, nên nó bị bỏ qua, và tới lúc <code>quad.c</code> cần thì thư viện đã "trôi qua"',
        'Vì <code>sqrt</code> chỉ tồn tại trong <code>libc</code>, không phải <code>libm</code>',
        'Vì thiếu <code>#include &lt;math.h&gt;</code>'
      ],
      a: 1,
      why: 'Trình liên kết xử lý tham số dòng lệnh <b>đúng một lượt, từ trái sang phải</b>. Gặp ' +
           '<code>-lm</code> khi danh sách ký hiệu thiếu còn rỗng, nó không lấy gì từ ' +
           '<code>libm</code>. Đến khi đọc <code>quad.c</code> và phát hiện cần <code>sqrt</code>, ' +
           'thư viện đã bị bỏ qua. Quy tắc thực dụng, đúng cho mọi <code>-l…</code>: đặt SAU thứ ' +
           'dùng nó — <code>gcc quad.c -lm -o quad</code>.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"<code>-fPIC</code> chỉ là một cờ tối ưu tốc độ — bật nó lên làm mã ' +
         'chạy nhanh hơn một chút, tương tự <code>-O2</code>."</i></blockquote>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng — nói rõ <code>-fPIC</code> giải quyết vấn đề gì, và ' +
          'chi phí thật của nó.',
      why: '<b>Sai.</b> <code>-fPIC</code> giải quyết vấn đề <b>đúng đắn</b> (mã phải chạy được ' +
           'ở mọi địa chỉ nạp, vì nhiều tiến trình dùng chung một <code>.so</code> và ASLR ngẫu ' +
           'nhiên hoá địa chỉ mỗi lần chạy), không phải vấn đề tốc độ. Chi phí thật là ' +
           '<b>ngược</b> với "nhanh hơn": mỗi lần truy cập biến toàn cục phải qua bảng GOT — ' +
           'thêm một lần đọc bộ nhớ so với mã không PIC.',
      crit: [
        'Nói rõ <code>-fPIC</code> giải quyết vấn đề ĐÚNG ĐẮN (mã chạy được ở địa chỉ nạp bất kỳ), không phải vấn đề tốc độ',
        'Nêu được lý do cần: nhiều tiến trình dùng chung một .so, cộng ASLR ngẫu nhiên hoá địa chỉ',
        'Nói rõ chi phí thật là CHẬM HƠN một chút (một lần đọc GOT thêm), không phải nhanh hơn'
      ],
      sol: '<b>Sai.</b> Viết lại đúng: <i>"<code>-fPIC</code> làm mã không chứa địa chỉ tuyệt ' +
           'đối nào, để nó chạy đúng dù được nạp ở bất kỳ địa chỉ nào trong bộ nhớ — điều bắt ' +
           'buộc với thư viện động vì nhiều tiến trình dùng chung một bản mã và ASLR đổi địa chỉ ' +
           'nạp mỗi lần chạy. Cái giá là mỗi lần truy cập biến toàn cục phải đọc GOT trước, tức ' +
           'là CHẬM HƠN một chút, không phải nhanh hơn."</i>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"<code>ar rcs libfoo.a foo.o</code> và ' +
         '<code>gcc -shared -o libfoo.so foo.o</code> chỉ khác nhau ở CÔNG CỤ dùng để gói — cả ' +
         'hai đều cần <code>foo.o</code> được biên dịch giống nhau."</i></blockquote>',
      a: 1,
      rw: 'Viết lại cho đúng — nói rõ sự khác biệt bắt buộc trong cách BIÊN DỊCH ' +
          '<code>foo.o</code> cho từng loại thư viện.',
      why: '<b>Sai.</b> Thư viện <b>động</b> đòi <code>foo.o</code> phải được biên dịch với ' +
           '<code>-fPIC</code> — thiếu cờ này, <code>gcc -shared</code> có thể báo lỗi ' +
           'relocation thẳng (hoặc, tệ hơn, "vô tình chạy được" nhờ <code>-fPIE</code> mặc định ' +
           'của Ubuntu, che giấu vấn đề tới khi cross-compile cho ARM). Thư viện <b>tĩnh</b> thì ' +
           'không cần <code>-fPIC</code> — <code>foo.o</code> biên dịch bình thường là đủ.',
      crit: [
        'Nói rõ thư viện động đòi biên dịch <code>foo.o</code> với <code>-fPIC</code>, thư viện tĩnh không cần',
        'Nêu được hậu quả nếu thiếu <code>-fPIC</code> khi làm .so: lỗi relocation lúc liên kết, hoặc "vô tình chạy được" nhờ -fPIE mặc định của Ubuntu che giấu vấn đề',
        'Kết luận: hai lệnh không chỉ khác "công cụ gói", chúng đòi hỏi ĐẦU VÀO khác nhau'
      ],
      sol: '<b>Sai.</b> Viết lại đúng: <i>"<code>ar rcs</code> đóng gói <code>foo.o</code> biên ' +
           'dịch bình thường thành thư viện tĩnh. <code>gcc -shared</code> đòi <code>foo.o</code> ' +
           'phải được biên dịch với <code>-fPIC</code> từ trước — thiếu nó, liên kết có thể thất ' +
           'bại với lỗi relocation, hoặc trên Ubuntu hiện đại đôi khi vẫn "chạy được" nhờ ' +
           '<code>-fPIE</code> mặc định, che giấu vấn đề tới khi build trên toolchain khác không ' +
           'bật PIE."</i> Hai lệnh không chỉ khác công cụ — chúng đặt yêu cầu khác nhau ngay từ ' +
           'bước biên dịch <code>.o</code>.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Thư viện <code>libcamera.so.2.1.0</code> có soname <code>libcamera.so.2</code>. Một ' +
         'chương trình đã build từ trước khai <code>NEEDED: libcamera.so.2</code>. Đội phát ' +
         'triển sửa một lỗi bên trong <b>mà không đổi bất kỳ khai báo hàm/struct nào</b>, rồi ' +
         'phát hành bản mới với tên file thật <code>libcamera.so.2.1.<b>1</b></code>, vẫn giữ ' +
         'soname <code>libcamera.so.2</code>. Chương trình cũ (không build lại) có chạy được ' +
         'với bản vá này không? (trả lời "có" hoặc "không")',
      a: ['có', 'co', 'chạy được', 'chay duoc'],
      ph: 'có / không',
      why: '<b>Có.</b> Chương trình cũ chỉ khai <code>NEEDED: libcamera.so.2</code> — đúng bằng ' +
           'soname, không phải tên file thật. Miễn liên kết mềm <code>libcamera.so.2</code> vẫn ' +
           'trỏ tới bản mới nhất (<code>libcamera.so.2.1.1</code>), <code>ld.so</code> nạp đúng ' +
           'bản đã vá mà chương trình cũ không cần build lại — đây chính xác là lý do soname tồn ' +
           'tại: tăng số minor/patch của real name không phá vỡ hợp đồng ABI đã hứa với các ' +
           'chương trình cũ. Nếu bản vá đó lại đổi kích thước một struct đã công khai (một thay ' +
           'đổi ABI thật), giữ nguyên soname <code>.so.2</code> sẽ là <b>sai</b> — phải tăng lên ' +
           '<code>.so.3</code>.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi tên với đúng vai trò của nó trong bộ ba tên chuẩn của một thư viện động.',
      left: [
        '<code>libcamera.so</code>', '<code>libcamera.so.2</code>',
        '<code>libcamera.so.2.1.0</code>', '<code>readelf -d … | grep SONAME</code>',
        '<code>readelf -d … | grep NEEDED</code>', '<code>ldconfig -l</code>'
      ],
      right: [
        'Cách đọc trực tiếp soname được ghi bên trong chính thư viện',
        'linker name — liên kết mềm chỉ dùng lúc build (<code>-lcamera</code>), do gói <code>-dev</code> cung cấp; trên thiết bị chạy thật thường không có',
        'real name — file thật chứa mã máy; hai số sau cùng đổi tự do miễn ABI không đổi',
        'Cách đọc tên mà MỘT CHƯƠNG TRÌNH KHÁC khai là cần, sau khi trình liên kết đã chép soname vào',
        'soname — cái tên được chép vào NEEDED của mọi chương trình liên kết tới nó; tăng số này nghĩa là phá vỡ tương thích',
        'Lệnh thủ công cập nhật/kiểm tra các liên kết mềm trong bộ nhớ đệm hệ thống'
      ],
      a: [1, 4, 2, 0, 3, 5],
      why: '<b>Ba tầng, ba vai trò.</b> <code>libcamera.so</code> (không số) chỉ tồn tại để ' +
           '<code>-lcamera</code> lúc build có cái để mở — nó là liên kết mềm, và thiết bị chạy ' +
           'thật thường không cần cài nó. <code>libcamera.so.2</code> là soname, cái tên DUY ' +
           'NHẤT được ghi vào NEEDED của mọi chương trình — đây là hợp đồng ABI. ' +
           '<code>libcamera.so.2.1.0</code> là file thật chứa mã, tự do đổi số theo mỗi lần vá ' +
           'lỗi miễn không đổi ABI. Hai công cụ <code>readelf -d</code> đọc hai phía của hợp đồng ' +
           'này: <code>SONAME</code> là "tôi tên gì", <code>NEEDED</code> là "tôi cần ai".' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output',
      q: 'Dữ liệu thật, mới đo riêng cho bộ này (khác kịch bản trong lesson). Thư viện ' +
         '<code>libops.so</code> đã build và <code>prog</code> đã liên kết thành công với nó ' +
         'bằng <code>-L. -lops</code>.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'mv libops.so libops2.so; rồi thử liên kết LẠI một chương trình mới', code:
          '/usr/bin/x86_64-linux-gnu-ld.bfd: cannot find -lops: No such file or directory\n' +
          'collect2: error: ld returned 1 exit status' },
        { t: 'code', env: 'wsl', label: 'đổi tên trả lại libops.so, copy prog sang /tmp/bt17-run rồi chạy ở đó', code:
          './prog: error while loading shared libraries: libops.so: cannot open shared object file: No such file or directory' },
        { t: 'code', env: 'wsl', label: 'export LD_LIBRARY_PATH=/home/shinarus/bt17chk; cd /tmp; chạy prog bằng đường dẫn tuyệt đối', code:
          '5 5' } ],
      rows: 7,
      crit: [
        'Giải thích lỗi thứ nhất: đây là lỗi LÚC BUILD — trình liên kết tìm theo đúng tên file <code>libops.so</code> mà -lops quy ước, đổi tên là nó "biến mất" với ld',
        'Giải thích lỗi thứ hai: prog đã build xong từ trước (không liên quan gì tới việc đổi tên ở trên), nhưng chạy ở một thư mục KHÁC không có LD_LIBRARY_PATH thì ld.so (chương trình khác hẳn ld) không tìm ra thư viện',
        'Giải thích vì sao lệnh thứ ba chạy được dù đứng ở /tmp và gọi prog bằng đường dẫn tuyệt đối: LD_LIBRARY_PATH là một biến môi trường, tồn tại xuyên suốt phiên shell, không gắn với thư mục hiện tại',
        'Kết luận đúng trục: hai lỗi đầu là HAI THẤT BẠI Ở HAI HỆ THỐNG KHÁC NHAU (ld lúc build, ld.so lúc chạy) — không phải cùng một lỗi lặp lại hai lần'
      ],
      sol: '<b>Ba mảnh dữ liệu, hai hệ thống.</b> Đổi tên <code>libops.so</code> → ' +
           '<code>libops2.so</code> làm việc LIÊN KẾT LẠI thất bại — đây là lỗi của <code>ld</code>, ' +
           'chương trình chạy LÚC BUILD, và nó tìm chính xác theo quy ước tên ' +
           '<code>lib</code> + tên + <code>.so</code> mà <code>-lops</code> quy định; đổi tên là ' +
           'nó "không tồn tại" với <code>ld</code>.<br>' +
           'Copy <code>prog</code> (đã build từ trước, không đổi gì) sang thư mục khác rồi chạy ' +
           'lại thất bại theo cách hoàn toàn khác: đây là lỗi của <code>ld.so</code>, chương ' +
           'trình chạy LÚC KHỞI ĐỘNG chương trình, và nó không hề biết gì về <code>-L.</code> đã ' +
           'dùng lúc build — nó chỉ tìm theo RPATH/LD_LIBRARY_PATH/RUNPATH/cache/mặc định.<br>' +
           'Lệnh thứ ba thành công dù đứng ở <code>/tmp</code>, vì <code>export</code> đặt ' +
           '<code>LD_LIBRARY_PATH</code> vào MÔI TRƯỜNG của shell, không phải vào thư mục hiện ' +
           'tại — nó tồn tại xuyên suốt phiên, bất kể bạn <code>cd</code> đi đâu. Ba mảnh dữ liệu ' +
           'này cùng chứng minh: build-time và run-time là hai hệ thống tách biệt hoàn toàn, mỗi ' +
           'hệ có logic tìm kiếm và phạm vi hoạt động riêng.' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output',
      q: 'Dữ liệu thật, mới đo cho bộ này. File <code>mathops.c</code> chứa BA hàm: ' +
         '<code>square</code>, <code>cube</code>, <code>double_it</code>. Chương trình chính ' +
         'chỉ gọi <code>square(5)</code>.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'ar rcs libmathops.a mathops.o; gcc main.c -L. -lmathops -o prog', code:
          '(không cảnh báo, không lỗi)' },
        { t: 'code', env: 'wsl', label: 'nm prog | grep -E \' T (cube|double_it|square)$\'', code:
          '000000000000118d T cube\n' +
          '00000000000011a4 T double_it\n' +
          '000000000000117a T square' },
        { t: 'code', env: 'wsl', label: 'stat -c \'%s %n\' prog', code: '16080 prog' } ],
      rows: 6,
      crit: [
        'Nói rõ CẢ BA hàm có mặt trong prog, không chỉ square — dù main() chỉ gọi square()',
        'Giải thích đúng nguyên nhân: mathops.o là MỘT thành viên của libmathops.a chứa cả ba hàm; trình liên kết lấy nguyên thành viên đó, không tách được cube/double_it ra khỏi square',
        'Không đổ lỗi cho ar hay cho cờ liên kết — đây là hành vi ĐÚNG và có chủ đích của cơ chế liên kết tĩnh theo thành viên'
      ],
      sol: 'Cả <code>cube</code> và <code>double_it</code> có mặt trong <code>prog</code>, dù ' +
           '<code>main()</code> chỉ gọi <code>square(5)</code>. Nguyên nhân không phải lỗi ở đâu ' +
           'cả: cả ba hàm cùng được biên dịch vào <b>một</b> file <code>mathops.o</code>, và đó ' +
           'là MỘT thành viên duy nhất của <code>libmathops.a</code>. Trình liên kết quyết định ' +
           'lấy hay bỏ theo đơn vị thành viên — nó thấy <code>square</code> cần, lấy ' +
           '<code>mathops.o</code>, và cả ba hàm trong đó đi theo cùng một lượt, không có cách ' +
           'nào tách riêng <code>square</code> ra khỏi hai hàm còn lại khi chúng nằm chung một ' +
           'file <code>.o</code>. Nếu ba hàm nằm trong ba file <code>.c</code> riêng (ba thành ' +
           'viên riêng trong <code>.a</code>), <code>prog</code> sẽ chỉ chứa <code>square</code>.' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Đọc output',
      q: 'Dữ liệu thật, mới đo cho bộ này. Thư mục có cả <code>libmathops.a</code> và ' +
         '<code>libmathops.so</code> (cùng tên, khác đuôi).',
      blocks: [
        { t: 'code', env: 'wsl', label: 'gcc main.c -L. -lmathops -o prog_default; readelf -d prog_default | grep NEEDED', code:
          ' 0x0000000000000001 (NEEDED)             Shared library: [libmathops.so]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]' },
        { t: 'code', env: 'wsl', label: 'gcc main.c -L. -Wl,-Bstatic -lmathops -Wl,-Bdynamic -o prog_forced; readelf -d prog_forced | grep NEEDED', code:
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]' } ],
      rows: 6,
      crit: [
        'Nói rõ lệnh thứ nhất chọn bản ĐỘNG (NEEDED có libmathops.so) mặc dù cả .a và .so cùng có mặt và không ai ra lệnh ưu tiên bên nào',
        'Nói rõ lệnh thứ hai KHÔNG còn libmathops trong NEEDED — nó đã được liên kết TĨNH, chỉ còn libc.so.6 (chính libc) là phụ thuộc động',
        'Giải thích đúng vai trò của cặp -Wl,-Bstatic/-Wl,-Bdynamic: công tắc bật/tắt "chỉ nhận .a" cho các -l phía sau nó, và phải tắt lại bằng -Bdynamic trước khi tới các thư viện hệ thống khác'
      ],
      sol: 'Lệnh không có công tắc nào cho ra <code>NEEDED: libmathops.so</code> — bằng chứng ' +
           'trực tiếp rằng trình liên kết ưu tiên bản động một cách <b>vô điều kiện</b> khi cả ' +
           'hai định dạng cùng có mặt, dù <code>libmathops.a</code> vẫn nằm ngay đó. Thêm cặp ' +
           '<code>-Wl,-Bstatic -lmathops -Wl,-Bdynamic</code> đổi hẳn kết quả: ' +
           '<code>libmathops</code> biến mất khỏi <code>NEEDED</code> vì nó đã được CHÉP vào ' +
           'file thực thi, chỉ còn <code>libc.so.6</code> — công tắc <code>-Bdynamic</code> đặt ' +
           'ngay sau đảm bảo <code>libc</code> (được liên kết ngầm sau <code>-lmathops</code>) ' +
           'không bị ép tĩnh theo. Đây đúng là cấu hình phổ biến trong nhúng: thư viện của bạn ' +
           'tĩnh, thư viện hệ thống vẫn động.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp',
      q: 'Bài học đo được: soname bảo vệ chương trình cũ khi vá lỗi bên trong một thư viện ' +
         '(chỉ đổi <i>real name</i>, giữ nguyên soname). Còn <code>-Wl,-Bstatic/-Bdynamic</code> ' +
         'lại cho phép TRỘN — một phần chương trình tĩnh, một phần động, trong CÙNG một file ' +
         'thực thi. Đây có phải hai cách giải quyết CÙNG một vấn đề không? Chỉ ra sự khác biệt ' +
         'về BẢN CHẤT vấn đề mà mỗi kỹ thuật giải quyết.',
      rows: 5,
      crit: [
        'Nhận ra soname giải quyết vấn đề THEO THỜI GIAN: làm sao nâng cấp một thư viện đã phát hành mà không phá vỡ chương trình cũ đã build từ trước',
        'Nhận ra -Bstatic/-Bdynamic giải quyết vấn đề TẠI MỘT THỜI ĐIỂM BUILD: chọn, cho từng thư viện, xem nó nên nằm trong file thực thi hay chỉ được tham chiếu tới',
        'Kết luận đúng: không phải hai giải pháp cho cùng một vấn đề — chúng vận hành ở hai chiều khác nhau (thời gian vs. thành phần) và có thể dùng ĐỒNG THỜI: một chương trình có thể liên kết tĩnh với libfoo (qua -Bstatic) và vẫn tôn trọng soname của libc (qua NEEDED động)'
      ],
      sol: '<b>Không phải hai giải pháp cho cùng một vấn đề.</b> soname giải quyết một vấn đề ' +
           'THEO THỜI GIAN: một thư viện phát hành hôm nay phải còn dùng được bởi chương trình ' +
           'build hôm nay, sau khi thư viện đó được vá lỗi và phát hành lại ngày mai — mà không ' +
           'ai phải build lại gì. <code>-Bstatic</code>/<code>-Bdynamic</code> giải quyết một ' +
           'vấn đề khác hẳn, TẠI MỘT THỜI ĐIỂM BUILD duy nhất: với từng thư viện cụ thể, bạn ' +
           'chọn nó nằm hẳn trong file thực thi (tĩnh) hay chỉ được ghi tên lại (động).<br>' +
           'Hai kỹ thuật này không cạnh tranh — chúng <b>cộng tác</b>. Một chương trình hoàn ' +
           'toàn có thể liên kết TĨNH với thư viện riêng của dự án (qua ' +
           '<code>-Bstatic … -lmylib</code>) trong khi vẫn liên kết ĐỘNG với ' +
           '<code>libc.so.6</code>, và nếu <code>libc</code> có bản vá bảo mật, hệ thống vẫn ' +
           'nâng cấp được nhờ đúng cơ chế soname — dù thư viện riêng của bạn đã "đóng băng" ' +
           'trong file thực thi.' },

    { id: 'b5', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một tài liệu nội bộ viết: <i>"Chúng ta build hoàn toàn tĩnh (<code>gcc -static</code>) ' +
         'để chương trình không bao giờ phụ thuộc vào bất kỳ file <code>.so</code> nào lúc ' +
         'chạy — vậy nên không cần lo gì về thư viện thiếu trên thiết bị đích."</i> Câu này ' +
         'đúng với PHẦN LỚN trường hợp nhưng có một lỗ hổng cụ thể. Chỉ ra lỗ hổng đó.',
      rows: 5,
      crit: [
        'Nêu đúng lỗ hổng: nếu chương trình dùng các hàm NSS của glibc (ví dụ getaddrinfo, gethostbyname, getpwnam), liên kết tĩnh vẫn cần các module libnss_*.so nạp lúc chạy',
        'Giải thích được vì sao: cơ chế NSS đọc /etc/nsswitch.conf và dlopen() các module cần thiết lúc chạy — không có cách nào nhét sẵn vào file tĩnh',
        'Nêu được cách xử lý thực dụng: chấp nhận mang theo libnss_*.so, hoặc chuyển sang musl/uClibc-ng nếu cần một file thật sự độc lập'
      ],
      sol: '<b>Lỗ hổng: các hàm tra cứu tên của glibc (NSS).</b> Nếu chương trình gọi ' +
           '<code>getaddrinfo</code>, <code>gethostbyname</code>, <code>getpwnam</code> …, liên ' +
           'kết tĩnh với glibc <b>không</b> loại bỏ được phụ thuộc lúc chạy: cơ chế NSS đọc ' +
           '<code>/etc/nsswitch.conf</code> rồi <code>dlopen()</code> các module ' +
           '<code>libnss_files.so</code>, <code>libnss_dns.so</code> — việc này xảy ra LÚC ' +
           'CHẠY, không có cách nào chép sẵn vào file tĩnh. Hậu quả trên thiết bị: chương trình ' +
           'chạy được, nhưng phân giải tên máy thất bại một cách im lặng. Đây là lý do ngành ' +
           'nhúng thường chuyển sang <b>musl</b> hoặc <b>uClibc-ng</b> khi thực sự cần một file ' +
           'độc lập tuyệt đối.' },

    { id: 'b6', k: 'free', tag: 'Đọc output',
      q: 'Cùng hàm <code>increment()</code> tăng một biến toàn cục, biên dịch hai kiểu. Đọc hai ' +
         'đoạn assembly và trả lời: đoạn nào là PIC, và bằng chứng cụ thể nào (không phải "trông ' +
         'dài hơn") cho biết điều đó?',
      blocks: [
        { t: 'code', env: 'wsl', label: 'đoạn 1', code:
          '   8:\tmov    0x0(%rip),%eax        # e <increment+0xe>\n' +
          '   e:\tadd    $0x1,%eax\n' +
          '  11:\tmov    %eax,0x0(%rip)        # 17 <increment+0x17>' },
        { t: 'code', env: 'wsl', label: 'đoạn 2', code:
          '   8:\tmov    0x0(%rip),%rax        # f <increment+0xf>\n' +
          '   f:\tmov    (%rax),%eax\n' +
          '  11:\tlea    0x1(%rax),%edx\n' +
          '  14:\tmov    0x0(%rip),%rax        # 1b <increment+0x1b>\n' +
          '  1b:\tmov    %edx,(%rax)' } ],
      rows: 5,
      crit: [
        'Xác định đúng đoạn 2 là PIC',
        'Chỉ ra bằng chứng cụ thể: đoạn 2 có một bước NẠP ĐỊA CHỈ riêng (mov …,%rax rồi mov (%rax),%eax — hai lệnh) trước khi đọc/viết giá trị, thay vì đọc/viết trực tiếp bằng một lệnh như đoạn 1',
        'Không dùng lý do mơ hồ như "dài hơn" hay "phức tạp hơn" làm bằng chứng chính'
      ],
      sol: '<b>Đoạn 2 là PIC.</b> Bằng chứng cụ thể: đoạn 1 đọc/viết biến toàn cục bằng ĐÚNG MỘT ' +
           'lệnh — <code>mov 0x0(%rip),%eax</code> nạp thẳng giá trị, số dịch chuyển được trình ' +
           'liên kết điền cố định. Đoạn 2 cần HAI lệnh cho mỗi lần truy cập: một lệnh lấy ĐỊA CHỈ ' +
           'của biến từ bảng GOT (<code>mov 0x0(%rip),%rax</code>), rồi một lệnh khác mới đọc ' +
           'hoặc viết giá trị tại địa chỉ đó (<code>mov (%rax),%eax</code> / ' +
           '<code>mov %edx,(%rax)</code>). Sự gián tiếp qua một bảng có thể điền lúc nạp — không ' +
           'phải "trông dài hơn" — chính là dấu hiệu của mã độc lập vị trí.' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán/biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Tình huống mới',
      q: 'Thiết bị nhúng của bạn cài chương trình vào <code>/opt/myapp/bin/controller</code>, ' +
         'thư viện riêng ở <code>/opt/myapp/lib/libcontrol.so</code>. Toàn bộ hệ thống file ' +
         'ngoài <code>/opt/myapp</code> và <code>/tmp</code> đều <b>chỉ đọc</b> (read-only), và ' +
         'không có quyền chạy <code>ldconfig</code> (nó cần ghi vào <code>/etc</code>). Bạn ' +
         'không được sửa script khởi động để chèn biến môi trường. Quyết định cơ chế tìm thư ' +
         'viện đúng để dùng, và biện minh bằng cách loại từng cơ chế còn lại.',
      rows: 6,
      crit: [
        'Loại đúng LD_LIBRARY_PATH: bị cấm bởi ràng buộc "không sửa script khởi động để chèn biến môi trường"',
        'Loại đúng ldconfig/cache hệ thống: bị cấm bởi ràng buộc "không có quyền ghi /etc"',
        'Loại đúng đường mặc định /lib, /usr/lib: /opt/myapp không nằm trong đó và không được thêm vào (read-only, không ldconfig)',
        'Chọn đúng: RPATH/RUNPATH ghi cứng vào chính file thực thi lúc BUILD, dùng $ORIGIN (hoặc $ORIGIN/../lib) — cơ chế duy nhất còn hợp lệ, vì nó không cần sửa gì lúc chạy và không cần quyền ghi ngoài /opt/myapp'
      ],
      sol: '<b>Chỉ còn một cơ chế hợp lệ: RPATH/RUNPATH ghi vào chính file thực thi lúc build, ' +
           'dùng <code>$ORIGIN</code>.</b> Loại lần lượt: <code>LD_LIBRARY_PATH</code> cần một ' +
           'biến môi trường được đặt mỗi lần chạy — bị cấm bởi ràng buộc không sửa script khởi ' +
           'động. Bộ nhớ đệm <code>/etc/ld.so.cache</code> cần <code>ldconfig</code>, mà lệnh đó ' +
           'cần ghi vào <code>/etc</code> — bị cấm. Đường tìm mặc định (<code>/lib</code>, ' +
           '<code>/usr/lib</code>) không chứa <code>/opt/myapp/lib</code> và không thể thêm vào ' +
           'vì không chạy được <code>ldconfig</code>.<br>' +
           'Còn lại đúng một cơ chế: biên dịch <code>controller</code> với ' +
           '<code>-Wl,-rpath,\'$ORIGIN/../lib\'</code>. <code>$ORIGIN</code> được ' +
           '<code>ld.so</code> thay bằng thư mục chứa chính file thực thi <b>lúc chạy</b> — ' +
           'không cần biến môi trường, không cần quyền ghi ngoài <code>/opt/myapp</code>, và ' +
           'hoạt động dù toàn bộ hệ thống file khác là chỉ đọc. Đây đúng là lý do lesson gọi nó ' +
           'là "mẹo quan trọng nhất trong cả bài" — nó là cơ chế duy nhất sống sót qua các ràng ' +
           'buộc khắc nghiệt kiểu nhúng.' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán',
      q: 'Dữ liệu thật, mới đo cho bộ này. Đội firmware thêm một thư viện tiện ích nhỏ: NĂM hàm ' +
         'trong một file <code>utils.c</code> duy nhất, đóng gói thành <code>.a</code>. Chương ' +
         'trình chỉ gọi một hàm (<code>util_a</code>).',
      blocks: [
        { t: 'code', env: 'wsl', label: 'Cách 1 — cả 5 hàm trong một file utils.c', code:
          'stat -c \'%s %n\' prog_onefile\n16144 prog_onefile' },
        { t: 'code', env: 'wsl', label: 'nm prog_onefile | grep -E \' T util_\'', code:
          '000000000000115d T util_a\n' +
          '000000000000118d T util_b\n' +
          '00000000000011bd T util_c\n' +
          '00000000000011ed T util_d\n' +
          '000000000000121d T util_e' },
        { t: 'code', env: 'wsl', label: 'Cách 2 — 5 file .c riêng, mỗi file một hàm', code:
          'stat -c \'%s %n\' prog_split\n16016 prog_split' },
        { t: 'code', env: 'wsl', label: 'nm prog_split | grep -E \' T util_\'', code:
          '000000000000115d T util_a' } ],
      rows: 6,
      crit: [
        'Chẩn đoán đúng nguyên nhân chênh lệch kích thước: cách 1 nhét cả 5 hàm vào MỘT file .o, nên gọi util_a kéo theo cả util_b..util_e; cách 2 tách mỗi hàm vào một file .o riêng nên chỉ util_a được lấy',
        'Không đổ lỗi cho ar, cho cờ liên kết, hay cho trình biên dịch — đây đúng là hệ quả của trục "đơn vị nhỏ nhất là một file .o"',
        'Đề xuất đúng hướng khắc phục cho firmware: tách các hàm không liên quan chặt vào các file .c riêng, đặc biệt với các hàm hiếm dùng — quy mô nhỏ ở đây (128 byte) nhưng nguyên tắc mở rộng tuyến tính theo số hàm/kích thước hàm không dùng tới'
      ],
      sol: 'Chênh lệch (16 144 so với 16 016 byte, khoảng 128 byte trong ví dụ nhỏ này) xuất phát ' +
           'đúng từ trục "đơn vị nhỏ nhất là một file <code>.o</code>". Ở cách 1, cả năm hàm nằm ' +
           'trong một file <code>utils.c</code>, nên biên dịch ra một <code>utils.o</code> duy ' +
           'nhất — và <code>nm</code> xác nhận cả năm hàm có mặt trong <code>prog_onefile</code>, ' +
           'dù chỉ <code>util_a</code> được gọi. Ở cách 2, mỗi hàm nằm trong file riêng, tương ứng ' +
           'với năm thành viên riêng trong <code>.a</code> — trình liên kết chỉ lấy đúng thành ' +
           'viên chứa <code>util_a</code>.<br>' +
           'Với một tiện ích nhỏ trong ví dụ này, 128 byte không đáng kể. Nhưng nguyên tắc mở ' +
           'rộng: một "thư viện tiện ích" thực tế có thể có vài chục hàm hiếm dùng (xử lý lỗi ' +
           'hiếm, định dạng debug, …) nằm chung một file — nếu chương trình chỉ dùng 2–3 hàm ' +
           'trong số đó, toàn bộ phần còn lại vẫn bị kéo vào, có thể chiếm hàng chục KB trên một ' +
           'thiết bị chỉ có vài trăm KB flash. Khắc phục: tách theo nhóm chức năng, mỗi file một ' +
           'nhóm hàm thật sự đi cùng nhau.' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Chẩn đoán',
      q: 'Một kỹ sư khẳng định: "Chúng tôi chỉ đóng gói và gửi <code>libsensor.a</code> trong ' +
         'bản firmware — không có file <code>.so</code> nào trong gói cả." Nhưng khi chạy ' +
         '<code>ldd controller</code> trên chính thiết bị đó, kết quả liệt kê ' +
         '<code>libsensor.so => not found</code>, và chương trình chết ngay lúc khởi động. ' +
         'Chẩn đoán nguyên nhân xảy ra Ở BƯỚC BUILD (không phải ở bước đóng gói), dựa trên cơ ' +
         'chế đã học ở phần B.',
      rows: 6,
      crit: [
        'Chẩn đoán đúng: lúc build (trên máy phát triển, không phải trên thiết bị), thư mục build có CẢ HAI libsensor.a và một libsensor.so nào đó (có thể để lại từ một lần build thử nghiệm, hoặc lấy từ một gói hệ thống)',
        'Áp dụng đúng luật đã học ở B3: khi cả hai cùng có mặt, trình liên kết luôn ưu tiên bản .so, kể cả khi kỹ sư đó "chỉ định" dùng .a bằng -lsensor mà không ép -Bstatic',
        'Kết luận: kỹ sư đã build ra một binary khai NEEDED: libsensor.so mà không hề biết, nên việc "chỉ gửi .a" là không liên quan — vấn đề đã xảy ra từ lúc build, trước khi đóng gói'
      ],
      sol: '<b>Vấn đề nằm ở lúc BUILD, không nằm ở lúc đóng gói.</b> "Chỉ gửi <code>.a</code> ' +
           'trong gói firmware" là đúng, nhưng không liên quan — cái quyết định chương trình có ' +
           'phụ thuộc động hay không là những gì có mặt trong thư mục lúc <code>gcc … -lsensor</code> ' +
           'được chạy, KHÔNG phải những gì được đóng gói sau đó.<br>' +
           'Theo đúng luật đã đo ở B3: nếu máy build (máy phát triển) có CẢ ' +
           '<code>libsensor.a</code> lẫn một <code>libsensor.so</code> nào đó trong đường tìm ' +
           '<code>-L</code> — có thể để lại từ một lần build thử nghiệm cũ, hoặc vô tình lấy từ ' +
           'một gói hệ thống trùng tên — trình liên kết sẽ CHỌN bản động một cách vô điều kiện, ' +
           'dù kỹ sư chỉ gõ <code>-lsensor</code> không kèm cờ nào khác. Kết quả: ' +
           '<code>controller</code> khai <code>NEEDED: libsensor.so</code> mà không ai chủ ý, và ' +
           'gói firmware — chỉ chứa <code>.a</code> theo đúng kế hoạch — thiếu đúng file mà ' +
           'chương trình đòi lúc chạy.<br>' +
           'Cách xác minh: chạy <code>readelf -d controller | grep NEEDED</code> ngay trên máy ' +
           'build, TRƯỚC khi đóng gói. Cách sửa gốc: dọn thư mục build sạch ' +
           '<code>libsensor.so</code> trước khi liên kết, hoặc ép rõ ràng bằng ' +
           '<code>-Wl,-Bstatic -lsensor -Wl,-Bdynamic</code> để không phụ thuộc vào việc thư mục ' +
           'có sạch hay không.' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Thư viện <code>libparser.so.3</code> xuất một hàm ' +
         '<code>int parse(const char *s)</code>. Đội phát triển muốn thêm một tham số ' +
         'TÙY CHỌN để hỗ trợ một chế độ mới, và đổi chữ ký thành ' +
         '<code>int parse(const char *s, int flags)</code> — giữ nguyên TÊN hàm. Mọi chương ' +
         'trình cũ gọi <code>parse(s)</code> (một tham số) mà không build lại. Soname có cần ' +
         'tăng lên <code>libparser.so.4</code> không? Biện minh bằng cơ chế ABI, không chỉ bằng ' +
         'cảm tính "thêm tham số thì nên tăng version".',
      rows: 5,
      crit: [
        'Nhận ra đây LÀ một thay đổi ABI thật: quy ước gọi hàm (calling convention) ở mức nhị phân đã đổi — hàm cũ nhận đúng 1 tham số qua register/stack theo cách cố định, hàm mới cần 2',
        'Giải thích hệ quả cụ thể: chương trình cũ (không build lại) sẽ gọi hàm mới nhưng chỉ đẩy 1 tham số — tham số flags còn lại đọc từ vùng nhớ/rác không xác định, hành vi không định trước, có thể sập hoặc sai âm thầm',
        'Kết luận đúng: PHẢI tăng soname lên .so.4 — đây đúng là trường hợp soname được thiết kế để bảo vệ: chương trình cũ tiếp tục tìm .so.3 (không tồn tại nữa, hoặc vẫn giữ song song), không bị nạp nhầm bản .so.4 không tương thích'
      ],
      sol: '<b>Phải tăng soname lên <code>libparser.so.4</code>.</b> "Thêm một tham số" nghe nhẹ ' +
           'nhàng ở mức mã nguồn C, nhưng ở mức NHỊ PHÂN nó đổi hẳn quy ước gọi hàm: hàm cũ nhận ' +
           'một giá trị theo một vị trí cố định (thanh ghi/stack theo ABI), hàm mới cần một giá ' +
           'trị thứ hai. Một chương trình cũ, không build lại, sẽ gọi đúng TÊN <code>parse</code> ' +
           'nhưng chỉ đẩy một tham số — hàm mới đọc tham số <code>flags</code> từ một vị trí mà ' +
           'chương trình cũ chưa từng ghi gì vào, cho ra hành vi không xác định: có thể là rác, ' +
           'có thể tình cờ đúng, có thể sập.<br>' +
           'Đây chính xác là loại thay đổi mà soname được thiết kế để chặn: nếu giữ nguyên ' +
           '<code>.so.3</code>, mọi chương trình cũ (khai <code>NEEDED: libparser.so.3</code>) sẽ ' +
           'tiếp tục nạp một bản không tương thích mà không có cách nào biết trước. Tăng lên ' +
           '<code>.so.4</code> buộc chương trình cũ tiếp tục dùng bản <code>.so.3</code> (nếu còn ' +
           'giữ) và chỉ chương trình MỚI, build lại, khai <code>NEEDED: libparser.so.4</code> ' +
           'mới dùng API mới — đúng với định nghĩa "soname tăng khi phá vỡ tương thích".' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh',
      q: 'Thiết bị của bạn sẽ chạy <b>4</b> chương trình ứng dụng độc lập trên nền một rootfs ' +
         'tối giản. Dùng đúng những số đo trong bài học: một chương trình <code>hello</code> ' +
         'liên kết ĐỘNG nặng <b>15 952 B</b>, liên kết TĨNH nặng <b>816 912 B</b>, và ' +
         '<code>libc.so.6</code> nặng <b>2 186 512 B</b>. TÍNH tổng dung lượng cho cả hai cách ' +
         '(giả định cả 4 chương trình có kích thước tương đương <code>hello</code>), và CHỌN ' +
         'cách nào cho thiết bị này, kèm biện minh.',
      rows: 5,
      crit: [
        'Tính đúng tổng liên kết động: 4 × 15 952 + 2 186 512 = 2 250 320 B (≈ 2,15 MB)',
        'Tính đúng tổng liên kết tĩnh: 4 × 816 912 = 3 267 648 B (≈ 3,12 MB)',
        'Chọn đúng: liên kết ĐỘNG nhỏ hơn ở quy mô 4 chương trình (đã vượt điểm hoà vốn ~3 chương trình mà bài học đã chỉ ra)',
        'Biện minh bằng đúng cơ chế: chi phí cố định của libc.so.6 chỉ trả MỘT LẦN khi liên kết động, còn liên kết tĩnh nhân chi phí đó theo từng chương trình'
      ],
      sol: '<b>Liên kết động: 4 × 15 952 + 2 186 512 = 2 250 320 B ≈ 2,15 MB.</b><br>' +
           '<b>Liên kết tĩnh: 4 × 816 912 = 3 267 648 B ≈ 3,12 MB.</b><br>' +
           'Ở quy mô <b>4 chương trình</b>, liên kết động nhỏ hơn khoảng <b>1,45 lần</b>. Đây ' +
           'khớp với điểm hoà vốn khoảng 3 chương trình mà bài học đã chỉ ra: dưới ngưỡng đó tĩnh ' +
           'thắng (chi phí mang <code>libc.so.6</code> riêng lớn hơn phần dôi của tĩnh), từ ngưỡng ' +
           'đó trở lên động thắng, và khoảng cách càng lớn khi số chương trình càng tăng.<br>' +
           'Biện minh bằng cơ chế: <code>libc.so.6</code> là một chi phí <b>cố định</b>, trả đúng ' +
           'MỘT LẦN dù có bao nhiêu chương trình dùng chung nó (liên kết động). Liên kết tĩnh thì ' +
           'KHÔNG chia sẻ được — mỗi chương trình mang một bản sao riêng của toàn bộ phần glibc nó ' +
           'dùng, nên chi phí đó bị NHÂN theo số chương trình. Với 4 chương trình, phần nhân đó đã ' +
           'vượt qua phần cố định phải trả cho bản động — nên với thiết bị chạy nhiều hơn một vài ' +
           'chương trình ứng dụng, câu trả lời hợp lý hơn là liên kết động (đồng thời nhớ lại cạm ' +
           'bẫy NSS ở B5 nếu các chương trình đó dùng <code>getaddrinfo</code> và cần chọn glibc ' +
           'hay musl).' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về các bài trước mà Bài 17 dựa vào ═══ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 15</b>, ký hiệu mang chữ <code>U</code> trong output của <code>nm</code> ' +
         'nghĩa là gì — và vì sao cả file <code>.o</code> lẫn file thực thi liên kết động trong ' +
         'Bài 17 đều có thể mang ký hiệu <code>U</code> mà không hề là lỗi?',
      opts: [
        '<code>U</code> nghĩa là "unused" — ký hiệu tồn tại nhưng không được dùng',
        '<code>U</code> nghĩa là "undefined" — ký hiệu được THAM CHIẾU nhưng ĐỊNH NGHĨA của nó nằm ở nơi khác; với file liên kết động, "nơi khác" chỉ được xác định lúc chạy',
        '<code>U</code> nghĩa là "unstripped" — file chưa bị cắt bảng ký hiệu',
        '<code>U</code> luôn là dấu hiệu của lỗi biên dịch cần sửa'
      ],
      a: 1,
      why: '<code>U</code> = <i>undefined</i>. Bài 15 dạy rằng một file <code>.o</code> sạch vẫn ' +
           'có thể mang nhiều ký hiệu <code>U</code> (như <code>printf</code>) — điều đó chỉ ' +
           'chứng minh đã có KHAI BÁO đủ để biên dịch, chưa chứng minh định nghĩa tồn tại ở đâu. ' +
           'Bài 17 mở rộng đúng ý đó: một file thực thi liên kết động vẫn giữ ' +
           '<code>printf</code> ở dạng <code>U</code> (thấy bằng <code>nm -D</code>) mãi cho tới ' +
           'lúc chạy, khi <code>ld.so</code> mới thật sự nối nó với định nghĩa trong ' +
           '<code>libc.so.6</code>.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 4</b>, mã thoát <b>127</b> theo quy ước có nghĩa gì — và vì sao đây đúng là ' +
         'mã bạn nhận được khi chạy một chương trình liên kết động thiếu file ' +
         '<code>.so</code>?',
      opts: [
        '"Không tìm thấy thứ cần chạy" — với một lệnh gõ sai tên, hoặc (ở Bài 17) với một chương trình mà ld.so không tìm ra thư viện nó cần',
        '"Lệnh chạy nhưng trả về giá trị âm"',
        '"Quyền bị từ chối" — giống mã 126',
        '127 chỉ áp dụng cho lệnh shell, không áp dụng cho chương trình C tự viết'
      ],
      a: 0,
      why: 'Mã <b>127</b> là quy ước "không tìm thấy thứ cần chạy" — Bài 4 dạy nó ở ngữ cảnh ' +
           '<code>command not found</code>. Bài 17 cho thấy đúng mã đó xuất hiện ở một ngữ cảnh ' +
           'khác hẳn: chương trình <code>./prog</code> có thật, có quyền thực thi, nhưng ' +
           '<code>ld.so</code> — thứ kernel chạy TRƯỚC khi tới <code>main()</code> của bạn — ' +
           'không tìm ra <code>libops.so</code> nó cần, nên toàn bộ việc khởi động chương trình ' +
           'thất bại với đúng ý nghĩa "thứ cần chạy không có ở đó".' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 13</b>, vì sao dấu nháy đơn quanh một chuỗi (ví dụ <code>\'EOF\'</code> hay ' +
         '<code>\'$ORIGIN\'</code>) lại bắt buộc trong một số trường hợp — và điều gì xảy ra ở ' +
         'Bài 17 nếu bạn viết <code>-Wl,-rpath,$ORIGIN</code> mà quên cặp nháy đơn đó?',
      opts: [
        'Không có gì khác biệt — nháy đơn chỉ để dễ đọc',
        'Nháy đơn ngăn SHELL diễn giải các ký tự đặc biệt (như <code>$</code>) bên trong chuỗi; quên nó, shell thay <code>$ORIGIN</code> bằng chuỗi RỖNG trước khi gcc kịp nhìn thấy, cho ra RUNPATH rỗng',
        'Nháy đơn chỉ cần khi chuỗi chứa dấu cách',
        'Nháy đơn làm chương trình build chậm hơn'
      ],
      a: 1,
      why: 'Bài 13 dạy: nháy đơn ngăn shell diễn giải mọi ký tự đặc biệt bên trong, kể cả ' +
           '<code>$</code>. <code>$ORIGIN</code> không phải biến shell — nó là một ký hiệu ' +
           'riêng mà CHỈ <code>ld.so</code> hiểu, lúc chạy. Nếu viết không nháy đơn, <b>shell</b> ' +
           'sẽ thấy <code>$ORIGIN</code> trước tiên, không tìm ra biến môi trường tên ' +
           '<code>ORIGIN</code>, và thay nó bằng chuỗi rỗng — kết quả ' +
           '<code>readelf -d</code> cho thấy <code>RUNPATH</code> rỗng, và chương trình vẫn lỗi ' +
           '<code>cannot open shared object file</code> dù bạn "đã" thêm rpath.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output',
      q: '<code>libops.so</code> đã build, chưa <code>strip</code>. <b>Dự đoán trước</b>: sau ' +
         'khi chạy <code>strip libops.so</code>, lệnh <code>nm libops.so</code> (không có ' +
         '<code>-D</code>) có còn liệt kê được hàm <code>add</code> không? Và ' +
         '<code>nm -D libops.so</code> thì sao? Sau đó tự tay tái tạo và kiểm tra.',
      rows: 5,
      crit: [
        'Dự đoán đúng: nm (không -D) SAU KHI strip báo "no symbols" — không còn liệt kê được add',
        'Dự đoán đúng: nm -D SAU KHI strip vẫn liệt kê được add bình thường',
        'Giải thích được lý do trước khi xem đáp án: bảng ký hiệu THƯỜNG (.symtab) bị strip cắt bỏ, nhưng bảng ký hiệu ĐỘNG (.dynsym) không bị cắt vì ld.so cần nó lúc chạy'
      ],
      sol: '<b>Đúng như dự đoán nếu bạn suy luận từ vai trò của từng bảng.</b> Trước strip, ' +
           '<code>nm libops.so | grep \' T add\'</code> cho <code>0000000000000000 T add</code>. ' +
           'Sau <code>strip libops.so</code>, <code>nm libops.so</code> báo ' +
           '<code>nm: libops.so: no symbols</code> — bảng ký hiệu thường đã bị cắt. Nhưng ' +
           '<code>nm -D libops.so</code> vẫn cho ra <code>0000000000000000 T add</code> — bảng ' +
           'ký hiệu ĐỘNG không bị strip đụng tới, vì <code>ld.so</code> cần nó để nối ký hiệu lúc ' +
           'chương trình khác nạp thư viện này. Đây là lý do lệnh chẩn đoán đúng cho một ' +
           '<code>.so</code> đã strip luôn phải là <code>nm -D</code>, không phải <code>nm</code> ' +
           'trần.' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output',
      q: 'Bạn có một chương trình liên kết HOÀN TOÀN tĩnh (<code>gcc -static</code>). <b>Dự ' +
         'đoán trước</b>: chạy <code>ldd</code> trên file đó cho ra gì, và mã thoát của ' +
         '<code>ldd</code> là bao nhiêu? Sau đó tự tay tái tạo và kiểm tra.',
      rows: 4,
      crit: [
        'Dự đoán đúng: ldd in ra "not a dynamic executable"',
        'Dự đoán đúng mã thoát: 1 (không phải 0)',
        'Không nhầm đây là một LỖI của ldd hay của file — đây là câu trả lời chính xác cho một file không có phụ thuộc động nào'
      ],
      sol: '<code>ldd prog_static</code> in ra <code>not a dynamic executable</code>, thoát mã ' +
           '<b>1</b>. Đây không phải lỗi — đó chính là câu trả lời đúng: file không có mục ' +
           '<code>NEEDED</code> nào để <code>ldd</code> giải quyết, vì mọi mã cần thiết (kể cả ' +
           'phần glibc) đã được chép thẳng vào file lúc liên kết tĩnh. Đây là cách nhanh nhất để ' +
           'xác nhận một file đã liên kết tĩnh hoàn toàn, nhanh hơn cả đọc <code>size</code> hay ' +
           '<code>readelf -d</code>.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Bạn đã có <code>foo.o</code> (biên dịch với <code>-fPIC</code> từ trước). Viết đúng ' +
         'MỘT lệnh <code>gcc</code> để LIÊN KẾT (không biên dịch lại) nó thành thư viện động có ' +
         '<b>soname</b> <code>libfoo.so.1</code>, với tên file thật ' +
         '<code>libfoo.so.1.0.0</code>.',
      rows: 3,
      crit: [
        'Dùng <code>-shared</code>',
        'Dùng <code>-Wl,-soname,libfoo.so.1</code> để đặt soname khác với tên file output',
        'Tên file output (-o) đúng là <code>libfoo.so.1.0.0</code>, không phải <code>libfoo.so</code> hay <code>libfoo.so.1</code>'
      ],
      sol: '<code>gcc -shared -Wl,-soname,libfoo.so.1 -o libfoo.so.1.0.0 foo.o</code>. Sau lệnh ' +
           'này, bạn còn cần tạo hai liên kết mềm để bộ ba tên hoàn chỉnh: ' +
           '<code>ln -sf libfoo.so.1.0.0 libfoo.so.1</code> và ' +
           '<code>ln -sf libfoo.so.1 libfoo.so</code> — nhưng bản thân việc SINH RA file có ' +
           'soname đúng chỉ cần đúng một lệnh <code>gcc -shared -Wl,-soname,…</code> này.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Bạn đã có <code>app.o</code> và một thư viện riêng tên <code>libcustom</code> (có cả ' +
         '<code>.a</code> và <code>.so</code> trong <code>-L.</code>). Viết đúng MỘT lệnh ' +
         '<code>gcc</code> để liên kết <code>app.o</code> sao cho <code>libcustom</code> được ' +
         'ép TĨNH, còn <code>libc</code> (và mọi thư viện hệ thống khác) vẫn ĐỘNG.',
      rows: 3,
      crit: [
        'Dùng cặp <code>-Wl,-Bstatic</code> ngay trước <code>-lcustom</code> và <code>-Wl,-Bdynamic</code> ngay sau nó',
        'KHÔNG đặt <code>-Wl,-Bstatic</code> mà quên đóng lại bằng <code>-Wl,-Bdynamic</code> trước khi kết thúc lệnh (nếu không, libc cũng bị ép tĩnh hoặc lỗi cannot find -lgcc_s)'
      ],
      sol: '<code>gcc app.o -L. -Wl,-Bstatic -lcustom -Wl,-Bdynamic -o app</code>. Cặp công tắc ' +
           'phải BAO ĐÚNG <code>-lcustom</code> — thiếu <code>-Wl,-Bdynamic</code> sau đó (để nó ' +
           'mở lại cho các thư viện tiếp theo, ở đây là <code>libc</code> được liên kết ngầm) sẽ ' +
           'cho lỗi kiểu <code>cannot find -lgcc_s: … have you installed the static version</code>, ' +
           'vì <code>libgcc_s</code> cũng bị ép tĩnh mà bản tĩnh của nó có thể không có trên máy.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Lệnh sau được viết để ép thư viện riêng liên kết tĩnh, thư viện hệ thống vẫn động. ' +
         'Chạy lại cho lỗi. Tìm và sửa.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'lệnh gõ', code:
          'gcc main.c -L. -Wl,-Bstatic -lops -o prog_bad' },
        { t: 'code', env: 'wsl', label: 'transcript thật', code:
          '/usr/bin/x86_64-linux-gnu-ld.bfd: cannot find -lgcc_s: No such file or directory\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: have you installed the static version of the gcc_s library ?\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: cannot find -lgcc_s: No such file or directory\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: have you installed the static version of the gcc_s library ?\n' +
          'collect2: error: ld returned 1 exit status' },
      ],
      rows: 5,
      crit: [
        'Xác định đúng lỗi: thiếu -Wl,-Bdynamic sau -lops — công tắc -Bstatic vẫn "bật" khi trình liên kết xử lý các thư viện ngầm tiếp theo (như libgcc_s)',
        'Giải thích đúng vì sao thông báo nhắc tới libgcc_s trong khi lệnh chỉ gõ -lops: gcc tự thêm các thư viện runtime ngầm (libgcc_s…) SAU những gì bạn gõ, và chúng vẫn nằm trong vùng công tắc -Bstatic vì chưa được tắt',
        'Đưa ra bản sửa đúng: thêm -Wl,-Bdynamic ngay sau -lops'
      ],
      sol: '<b>Lỗi:</b> thiếu <code>-Wl,-Bdynamic</code> sau <code>-lops</code>. Công tắc ' +
           '<code>-Bstatic</code> có hiệu lực với MỌI <code>-l…</code> đứng sau nó, không chỉ ' +
           'thư viện ngay kế tiếp — và <code>gcc</code> tự thêm các thư viện runtime ngầm (như ' +
           '<code>libgcc_s</code>, dùng cho xử lý ngoại lệ/unwind ở mức thấp) vào cuối dòng liên ' +
           'kết một cách vô hình. Vì công tắc chưa được tắt lại, trình liên kết cũng đi tìm bản ' +
           'TĨNH của <code>libgcc_s</code> — thứ máy này không cài (chỉ có bản động), nên báo lỗi.<br>' +
           '<b>Sửa:</b> <code>gcc main.c -L. -Wl,-Bstatic -lops -Wl,-Bdynamic -o prog</code>. ' +
           'Quy tắc cần nhớ: cặp <code>-Bstatic</code>/<code>-Bdynamic</code> luôn phải đóng lại ' +
           'ngay sau thư viện bạn muốn ép, trước khi dòng lệnh tiếp tục — không bao giờ để nó mở ' +
           '"lửng" tới cuối lệnh.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Bạn build một chương trình <code>hello world</code> HOÀN TOÀN tĩnh bằng ' +
         '<code>gcc -static -O2</code>. Đo <code>stat -c \'%s %n\'</code> (kích thước file thật ' +
         'trên đĩa) và <code>size</code> (tổng text+data+bss mà nó báo). Hai con số có khớp ' +
         'nhau không? Sau đó chạy <code>strip</code> trên chính file đó và đo lại kích thước ' +
         'file. <b>Không cần giải thích trọn vẹn TẠI SAO có ba con số khác nhau này ở đây</b> — ' +
         'đó chính là câu hỏi mà <b>Bài 18 — Giải phẫu file ELF</b> sẽ mổ xẻ, bằng cách phân ' +
         'biệt <i>section</i> (dành cho trình liên kết) với <i>segment</i> (dành cho kernel lúc ' +
         'nạp).',
      rows: 5,
      crit: [
        'Đo được và ghi lại đúng ba con số (kích thước file trước strip, tổng size trước strip, kích thước file sau strip) — không cần khớp với số ví dụ dưới, miễn đo thật trên máy mình',
        'Nhận ra và phát biểu đúng: kích thước file KHÔNG khớp với tổng mà size báo — có một khoảng chênh chưa được giải thích',
        'Nhận ra strip cắt giảm kích thước file đáng kể, nhưng không tự bịa ra lý do chi tiết section/segment — chấp nhận để ngỏ cho Bài 18'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', label: 'trước strip', code:
          'stat -c \'%s %n\' prog_full\n816896 prog_full\n\n' +
          'size prog_full\n' +
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          ' 699299\t  22824\t  22592\t 744715\t  b5d0b\tprog_full' },
        { t: 'code', where: 'wsl', label: 'sau strip', code:
          'strip prog_full\nstat -c \'%s %n\' prog_full\n735512 prog_full' },
        { t: 'p', x:
          'Ba con số, ba câu hỏi còn mở: <b>816 896 B</b> là kích thước thật trên đĩa. ' +
          '<code>size</code> cộng text+data+bss chỉ ra <b>744 715 B</b> — nhỏ hơn kích thước file ' +
          'gần <b>72 KB</b>. Sau <code>strip</code>, file co về <b>735 512 B</b> — mất thêm hơn ' +
          '<b>81 KB</b> nữa, nhiều hơn cả khoảng chênh ban đầu. Ba con số này không trùng nhau vì ' +
          'chúng đang đo BA THỨ khác nhau: dung lượng trên đĩa, tổng các phần được NẠP VÀO BỘ NHỚ ' +
          'lúc chạy, và những gì còn lại sau khi cắt bảng ký hiệu/thông tin gỡ lỗi. Bài 18 sẽ chỉ ' +
          'chính xác byte nào thuộc phần nào, và vì sao "kích thước file" và "kích thước chiếm ' +
          'dụng bộ nhớ" là hai câu hỏi hoàn toàn khác nhau đối với một file ELF.' }
      ]
    },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══ */
  diag: [
    ['A1, B1, C1',
     'Bạn còn tin build thành công là đủ để chương trình chạy được ở bất cứ đâu. Có HAI hệ ' +
     'thống tìm thư viện tách biệt: <code>ld</code> lúc build (nghe <code>-L</code>) và ' +
     '<code>ld.so</code> lúc chạy (nghe RPATH → LD_LIBRARY_PATH → RUNPATH → cache → mặc định).',
     '<a href="#/bai-17#trinh-thong-dich-dong-tim-thu-vien-o-dau">Đọc lại Bài 17 · Trình thông dịch động tìm thư viện ở đâu</a>'],

    ['A2, B2, C2',
     'Bạn còn tin trình liên kết tĩnh chỉ lấy đúng hàm được gọi. Nó lấy nguyên một file ' +
     '<code>.o</code> — MỌI hàm trong file đó đi theo cùng nhau, dù không được gọi tới.',
     '<a href="#/bai-17#thu-vien-tinh-a-chi-la-mot-cai-tui-dung-o">Đọc lại Bài 17 · Thư viện tĩnh .a — chỉ là một cái túi đựng .o</a>'],

    ['A3, B3, C3',
     'Bạn chưa nắm luật ưu tiên: khi cả <code>.a</code> và <code>.so</code> cùng tên có mặt, ' +
     'trình liên kết LUÔN chọn bản động, bất kể ý định hay file nào mới hơn.',
     '<a href="#/bai-17#khi-thu-muc-co-ca-a-lan-so-ai-thang">Đọc lại Bài 17 · Khi thư mục có cả .a lẫn .so — ai thắng?</a>'],

    ['A4',
     'Bạn quên thứ tự tham số liên kết có ý nghĩa: thư viện luôn phải đứng SAU thứ dùng nó, vì ' +
     'trình liên kết đọc dòng lệnh một lượt từ trái sang phải.',
     '<a href="#/bai-17#thu-vien-tinh-a-chi-la-mot-cai-tui-dung-o">Đọc lại Bài 17 · Thư viện tĩnh .a — chỉ là một cái túi đựng .o</a>'],

    ['A5, B6',
     'Bạn còn nghĩ <code>-fPIC</code> là một cờ tối ưu tốc độ. Nó giải quyết vấn đề ĐỊA CHỈ ' +
     '(mã phải chạy đúng ở mọi nơi được nạp), với cái giá là chậm hơn một chút, không phải ' +
     'nhanh hơn.',
     '<a href="#/bai-17#vi-sao-so-bat-buoc-phai-co-fpic">Đọc lại Bài 17 · Vì sao .so bắt buộc phải có -fPIC</a>'],

    ['A6',
     'Bạn chưa phân biệt yêu cầu ĐẦU VÀO của <code>ar rcs</code> (file .o biên dịch bình ' +
     'thường) với <code>gcc -shared</code> (file .o phải biên dịch bằng <code>-fPIC</code>).',
     '<a href="#/bai-17#vi-sao-so-bat-buoc-phai-co-fpic">Đọc lại Bài 17 · Vì sao .so bắt buộc phải có -fPIC</a>'],

    ['A7, C4',
     'Bạn chưa nắm cơ chế soname làm hợp đồng ABI: NEEDED ghi soname, không ghi tên file mở, ' +
     'nên vá lỗi (đổi real name) không cần build lại chương trình cũ — nhưng đổi ABI thật thì ' +
     'PHẢI tăng soname.',
     '<a href="#/bai-17#soname-cach-danh-so-phien-ban-thu-vien">Đọc lại Bài 17 · soname — cách đánh số phiên bản thư viện</a>'],

    ['A8, B4',
     'Bạn chưa phân biệt ba tầng tên (linker name / soname / real name) và vai trò riêng của ' +
     'mỗi tầng — cũng như chưa thấy soname và cặp -Bstatic/-Bdynamic giải quyết hai vấn đề khác ' +
     'nhau (thời gian vs. thành phần), không phải cùng một vấn đề.',
     '<a href="#/bai-17#soname-cach-danh-so-phien-ban-thu-vien">Đọc lại Bài 17 · soname — cách đánh số phiên bản thư viện</a>'],

    ['B5',
     'Bạn chưa biết cạm bẫy NSS: liên kết tĩnh với glibc vẫn cần <code>libnss_*.so</code> lúc ' +
     'chạy nếu dùng <code>getaddrinfo</code>/<code>gethostbyname</code>/<code>getpwnam</code>.',
     '<a href="#/bai-17#tinh-hay-dong-quyet-dinh-bang-so-do">Đọc lại Bài 17 · Tĩnh hay động — quyết định bằng số đo</a>'],

    ['C5',
     'Bạn quyết định tĩnh/động dựa trên MỘT chương trình. Luôn tính theo TỔNG hệ thống — điểm ' +
     'hoà vốn nằm ở khoảng 3 chương trình, và khoảng cách nới rộng theo số chương trình tăng ' +
     'thêm.',
     '<a href="#/bai-17#tinh-hay-dong-quyet-dinh-bang-so-do">Đọc lại Bài 17 · Tĩnh hay động — quyết định bằng số đo</a>'],

    ['D1',
     'Bạn quên ý nghĩa ký hiệu <code>U</code> của <code>nm</code> — được THAM CHIẾU nhưng ' +
     'ĐỊNH NGHĨA nằm ở nơi khác. Với liên kết động, "nơi khác" chỉ xác định lúc chạy.',
     '<a href="#/bai-15#giai-doan-4-lien-ket-khai-bao-dinh-nghia-va-ky-hieu">Đọc lại Bài 15 · Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu</a>'],

    ['D2',
     'Bạn quên quy ước mã thoát 127 = "không tìm thấy thứ cần chạy". Đúng mã này xuất hiện khi ' +
     '<code>ld.so</code> không tìm ra một thư viện động cần thiết.',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại Bài 4 · Một lệnh thật sự đến từ đâu</a>'],

    ['D3',
     'Bạn quên vì sao nháy đơn quanh một chuỗi bắt buộc khi chuỗi chứa ký tự shell đặc biệt. ' +
     'Thiếu nó, <code>$ORIGIN</code> bị SHELL nuốt mất trước khi <code>gcc</code> kịp thấy.',
     '<a href="#/bai-13#bien-va-dau-nhay-noi-90-loi-script-sinh-ra">Đọc lại Bài 13 · Biến và dấu nháy — nơi 90% lỗi script sinh ra</a>'],

    ['E6',
     'Câu thử thách này cố ý bỏ ngỏ. Nếu bạn muốn câu trả lời đầy đủ cho việc vì sao kích thước ' +
     'file, tổng size, và kích thước sau strip là ba con số khác nhau, đó chính là nội dung của ' +
     'bài kế tiếp.',
     '<a href="#/bai-18#section-ban-do-danh-cho-trinh-lien-ket">Đọc tiếp Bài 18 · Section — bản đồ dành cho trình liên kết</a>'],
  ],
});


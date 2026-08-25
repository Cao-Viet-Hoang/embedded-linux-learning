/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 18 — Giải phẫu file ELF
   Cặp với lessons/bai-18.js · Chặng 02 · C và công cụ build

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (15 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 18):
     ELF là MỘT định dạng dùng cho năm loại file (REL/EXEC/DYN/CORE/…),
     trường Type mới phân biệt · ELF header 64 byte, magic 7f 45 4c 46 ·
     trường Machine ở byte 18–19, chạy nhầm kiến trúc → Exec format error,
     mã 126 · section là bản đồ cho TRÌNH LIÊN KẾT lúc build · segment
     (program header) là bản đồ cho NHÂN lúc nạp · NOBITS: .bss chiếm RAM
     nhưng 0 byte trong file · MemSiz − FileSiz của segment RW = đúng .bss ·
     cờ section A/W/X và luật W^X · Off của một section NOBITS là vô nghĩa
     (trùng với section kế tiếp) · ký hiệu nm: chữ hoa = toàn cục, thường =
     cục bộ; B/b/D/d/R/T/U · điểm vào là _start chứ không phải main;
     __libc_start_main nhận main làm THAM SỐ · strip xoá bảng ký hiệu →
     file nhỏ đi, RAM không đổi · -ffunction-sections + --gc-sections cắt
     theo đơn vị section · mảng khởi tạo `= { 1 }` chuyển cả mảng từ .bss
     sang .data, file phình đúng bằng đó · -O2 xoá hẳn biến static không
     dùng tới

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                         PT  GIÁ  PTG  TỔNG
     .bss (NOBITS) chiếm RAM lúc chạy nhưng KHÔNG      2    2    2     6   ← trục 0
       chiếm byte nào trong file; MemSiz − FileSiz
       của segment RW đúng bằng nó
     section và segment là HAI CÁCH NHÌN trên cùng     2    2    2     6   ← trục 1
       một dãy byte — section cho trình liên kết lúc
       build, segment cho nhân lúc nạp
     điểm vào là _start, KHÔNG phải main; main chỉ     2    1    2     5   ← trục 2
       là một tham số truyền cho __libc_start_main
     strip làm file nhỏ đi nhưng RAM lúc chạy KHÔNG    1    2    2     5   ✗ xếp sau (†)
       đổi một byte
     cờ W^X: không section thường nào vừa ghi được     1    1    1     3   ✗ cắt
       vừa chạy được
     ELF là một định dạng cho năm loại file            1    1    1     3   ✗ cắt
     Machine ở byte 18–19, Exec format error 126       1    1    1     3   ✗ cắt (‡)
     ký hiệu nm hoa/thường = toàn cục/cục bộ           1    1    1     3   ✗ cắt
     -ffunction-sections + --gc-sections               1    1    1     3   ✗ cắt
     `= { 1 }` đẩy mảng từ .bss sang .data             1    2    2     5   ✗ xếp sau (†)
     magic 7f 45 4c 46                                 0    0    0     0   ✗ cắt
     Off của section NOBITS là vô nghĩa                 0    1    2     3   ✗ cắt
     -O2 xoá biến static không dùng                     0    1    1     2   ✗ cắt

     (†) "strip: file nhỏ, RAM không đổi" và "= { 1 } đẩy mảng sang .data"
         đều đạt 5 điểm và đều có ≥ 2 trục con ≥ 1 — nhưng cả hai đều là
         MỘT HỆ QUẢ của trục 0 ("kích thước file và kích thước bộ nhớ là hai
         câu hỏi khác nhau"). Chọn chúng làm trục sẽ khiến hai trong ba trục
         dùng chung một từ vựng và chung một loại dữ liệu minh chứng (đối
         chiếu `ls -l` với `size`), vi phạm Bước 7. Dùng làm bề rộng:
         strip ở A6, B2, E?; `= { 1 }` ở E2 và C5.
     (‡) Machine/Exec format error là một SỰ KIỆN TRA ĐƯỢC trong mười giây
         (§13.3 cấm lấy tên cờ, số byte, số hiệu làm trục). Cho đúng một câu
         ở tầng A — chính là A7 và C2.

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Ba ứng viên đầu đạt
   6/6/5, cả ba đều có cả ba trục con ≥ 1 → lấy đúng ba.

   Bước 4 · Loại và điều phối:
     · Không ứng viên nào trùng trục đã tiêu của bt-01…bt-17 (§13.8 dưới).
       Điểm cần soi kỹ nhất là bt-17 trục 1 ("trình liên kết tĩnh lấy theo
       đơn vị THÀNH VIÊN .o"): nó nói về ĐƠN VỊ mà trình liên kết gắp ra từ
       một kho .a. Trục 1 ở đây nói về HAI BẢNG MÔ TẢ khác nhau trong cùng
       một file đã liên kết xong. Kiểm tra bằng câu hỏi "nếu chương trình
       không dùng thư viện nào cả, trục nào còn áp dụng?" — trục 1 của bt-18
       vẫn áp dụng nguyên vẹn, trục 1 của bt-17 thì không còn gì để nói.
     · Trục 0 và trục 1 đều đọc từ `readelf`, nhưng khác câu hỏi: trục 0 hỏi
       "bao nhiêu byte, ở đâu — đĩa hay RAM"; trục 1 hỏi "ai đọc bảng nào,
       vào lúc nào". Kiểm tra: một file `.o` (REL) không có segment nào —
       trục 1 vẫn có chuyện để nói (chính là C3/E5), trục 0 thì không.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · Một section kiểu NOBITS — điển hình là `.bss` — được khai báo trong
         file ELF nhưng KHÔNG chiếm một byte nội dung nào trên đĩa. Nó chỉ
         tồn tại như một lời hứa: "lúc nạp, hãy cấp cho tôi ngần này byte và
         điền số 0". Bằng chứng đo được: với một segment LOAD ghi được,
         MemSiz − FileSiz đúng bằng kích thước .bss.
     1 · Cùng một dãy byte trong file ELF được mô tả bởi HAI bảng độc lập.
         Bảng section (`readelf -S`) là bản đồ cho TRÌNH LIÊN KẾT lúc build.
         Bảng segment / program header (`readelf -l`) là bản đồ cho NHÂN lúc
         nạp. Nhân không đọc tên section; trình liên kết không quan tâm
         segment. Một file `.o` có bảng thứ nhất mà KHÔNG có bảng thứ hai —
         và đó chính là lý do `.o` không chạy được.
     2 · Lệnh đầu tiên chương trình chạy KHÔNG nằm trong `main`. Trường
         `Entry point address` của ELF header trỏ tới `_start` — mã khởi động
         do thư viện C cung cấp. `_start` dựng ngăn xếp, gom `argc`/`argv`,
         rồi gọi `__libc_start_main`, TRUYỀN ĐỊA CHỈ CỦA `main` VÀO NHƯ MỘT
         THAM SỐ. `main` chỉ là một hàm bình thường được người khác gọi.

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng
   ở C):
     0 · "Khai báo một mảng 256 KB trong chương trình thì file firmware nạp
         xuống flash sẽ to thêm 256 KB." (và mặt kia của cùng ngộ nhận: "file
         chỉ có 40 KB thì chạy chỉ tốn 40 KB RAM").
     1 · "Section và segment là hai tên gọi của cùng một thứ — `readelf -S`
         và `readelf -l` chỉ là hai cách in ra cùng một bảng."
     2 · "Chương trình bắt đầu chạy ở `main`; mọi thứ trước `main` là chuyện
         của hệ điều hành, không nằm trong file của tôi."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (phát biểu: mảng 256 KB có làm file to thêm không)
              B1 (dữ liệu thật MỚI: `size probe` + dòng LOAD RW của
              `readelf -lW probe`, tự tính MemSiz − FileSiz)
              C1 (chẩn đoán tình huống mới: board 64 MB RAM bị OOM killer
              giết một chương trình mà `ls -l` báo 17 KB)
     trục 1 → A2 (phát biểu: nhân dùng bảng nào để nạp)
              B3 (so sánh cặp: bảng "Section to Segment mapping" thật của
              probe — cùng .data và .bss nằm chung một segment 05)
              C3 (tình huống mới: bootloader không phân tích được ELF, phải
              tự dựng ảnh nhị phân — bảng nào là bảng phải đọc)
     trục 2 → A3 (phát biểu: Entry point trỏ tới đâu)
              B4 (bắt lỗi phát biểu, kèm `readelf -h` + `nm` thật của probe:
              Entry 0x1060 nhưng main 0x1149)
              C4 (tình huống mới: bare-metal không có libc — phải tự cung
              cấp cái gì, và điều gì KHÔNG còn chạy trước main nữa)
     · Ba mức dùng ba loại kích thích khác nhau: phát biểu không kèm dữ liệu
       (A) · transcript thật, MỚI dựng riêng cho bộ này (B) · tình huống có
       ràng buộc mới, không trả lời được nếu không nắm trục (C).

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
     bt-17 .so chỉ ghi TÊN vào NEEDED, hai hệ thống tìm kiếm · trình liên kết tĩnh lấy
           theo đơn vị THÀNH VIÊN .o · cả .a lẫn .so thì .so luôn thắng
   Ba trục của bt-18 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 25/08/2026, gcc 15.2.0
   (Ubuntu 15.2.0-16ubuntu1), GNU readelf 2.46, máy 6 lõi (nproc = 6).
   Chương trình mẫu của bộ này là `probe.c` / `probe2.c` — KHÁC hẳn
   `sample.c` của lessons/bai-18.js (khác tên biến, khác kích thước, khác con
   số), để người học không thể trả lời chỉ bằng cách nhớ lại đúng dòng output
   trong bài học.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-18',
  minutes: 85,

  intro:
    '<p>Bài 18 tách rời hai câu hỏi mà người mới luôn gộp làm một: <b>"file này nặng bao ' +
    'nhiêu"</b> và <b>"chương trình này ăn bao nhiêu RAM"</b>. Trên máy bàn, gộp chúng lại ' +
    'chẳng chết ai. Trên một board 8 MB flash và 64 MB RAM thì gộp nhầm là hỏng sản phẩm — ' +
    'theo cả hai chiều: một mảng vô hình làm cạn RAM, hoặc một lần <code>strip</code> ' +
    '"tiết kiệm bộ nhớ" thực ra không tiết kiệm được byte RAM nào.</p>' +
    '<p>Bộ bài tập này dùng một chương trình mẫu <b>mới</b> tên <code>probe.c</code>, không ' +
    'phải <code>sample.c</code> của bài học. Mọi con số dưới đây là số đo thật trên máy bạn, ' +
    'chạy ngày 25/08/2026 — nếu bạn chỉ học thuộc output của bài 18, các con số ở đây sẽ ' +
    'không khớp và bạn buộc phải suy luận từ cơ chế.</p>' +
    '<p><b>Chia làm hai lượt:</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài 18</b> (~25 phút): phần <b>A</b> và <b>B</b>.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (~60 phút): phần <b>C</b>, <b>D</b> và <b>E</b>.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần một terminal WSL. Nếu máy bạn ra con số khác với bộ này, hãy tìm ' +
    'hiểu <i>vì sao</i> trước khi kết luận bộ bài tập sai — phiên bản gcc và glibc khác nhau ' +
    'sẽ cho kích thước khác nhau, nhưng <b>quan hệ</b> giữa các con số thì không đổi.</p>',

  truc: [
    { id: 'nobits',
      name: '.bss chiếm RAM lúc chạy nhưng KHÔNG chiếm một byte nào trong file — MemSiz trừ FileSiz đúng bằng nó',
      x: 'Một section kiểu NOBITS được khai báo trong bảng section nhưng không có nội dung trên ' +
         'đĩa. Nó chỉ là một lời hứa gửi cho nhân: "lúc nạp, cấp cho tôi ngần này byte và điền ' +
         'số 0 vào". Bằng chứng đo được nằm ở dòng LOAD ghi được của program header: ' +
         'MemSiz − FileSiz đúng bằng kích thước .bss. Vì vậy kích thước file và lượng bộ nhớ ' +
         'chương trình chiếm lúc chạy là HAI câu hỏi khác nhau, và không suy ra được nhau.',
      mis: 'Khai báo một mảng 256 KB trong chương trình thì file firmware nạp xuống flash sẽ to thêm 256 KB — và ngược lại, file chỉ 40 KB thì chạy chỉ tốn 40 KB RAM.' },

    { id: 'two-maps',
      name: 'Section và segment là HAI bản đồ độc lập trên cùng một dãy byte — một cho trình liên kết lúc build, một cho nhân lúc nạp',
      x: 'Bảng section (readelf -S) chia file theo VAI TRÒ để trình liên kết ghép và cắt lúc ' +
         'build. Bảng segment / program header (readelf -l) gộp các section lại theo QUYỀN ' +
         'TRUY CẬP để nhân ánh xạ vào bộ nhớ lúc nạp. Nhân không đọc tên section bao giờ; ' +
         'trình liên kết không quan tâm segment. Một file .o có bảng thứ nhất mà không có ' +
         'bảng thứ hai — đó chính là lý do .o không chạy được.',
      mis: 'Section và segment là hai tên gọi của cùng một thứ; readelf -S và readelf -l chỉ là hai cách in ra cùng một bảng.' },

    { id: 'entry',
      name: 'Điểm vào là _start, không phải main — main chỉ là một tham số truyền cho __libc_start_main',
      x: 'Trường Entry point address trong ELF header trỏ tới _start, đoạn mã khởi động do thư ' +
         'viện C cung cấp và được liên kết vào chính file của bạn. _start dựng ngăn xếp, gom ' +
         'argc/argv/envp, rồi gọi __libc_start_main và truyền ĐỊA CHỈ của main vào như một ' +
         'tham số. main không đặc biệt với nhân, cũng không đặc biệt với CPU — nó chỉ đặc biệt ' +
         'với đoạn mã khởi động đó.',
      mis: 'Chương trình bắt đầu chạy ở main; mọi thứ trước main là chuyện của hệ điều hành, không nằm trong file của tôi.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Trong một dự án firmware, bạn thêm một dòng khai báo ở phạm vi file: ' +
         '<code>static uint8_t frame_buffer[262144];</code> — không có giá trị khởi tạo. ' +
         'Trưởng nhóm nói: <i>"Đừng thêm, file <code>.bin</code> nạp xuống flash sẽ phình thêm ' +
         '256 KB."</i> Nhận định đó đúng hay sai?',
      opts: [
        'Đúng — mọi biến ở phạm vi file đều phải có chỗ trong file thực thi',
        'Sai — mảng này rơi vào <code>.bss</code> (kiểu NOBITS), file không tăng thêm một byte nội dung nào; 256 KB đó chỉ bị chiếm trong RAM lúc chạy',
        'Sai — file có tăng 256 KB nhưng trình biên dịch nén lại nên chỉ còn vài KB',
        'Đúng, nhưng chỉ khi biên dịch với <code>-O0</code>; bật <code>-O2</code> thì mảng biến mất'
      ],
      a: 1,
      why: 'Trưởng nhóm lo <b>nhầm chỗ</b>. Biến chưa khởi tạo ở phạm vi file đi vào ' +
           '<code>.bss</code>, mà <code>.bss</code> có <code>Type</code> là <b>NOBITS</b> — ' +
           'nghĩa là "có địa chỉ, có kích thước, nhưng không có nội dung trên đĩa". File không ' +
           'phình. <b>RAM thì phình thật, đúng 256 KB.</b> Trên một board 64 MB RAM đó mới là ' +
           'con số đáng lo, và nó sẽ không hiện ra ở bất kỳ chỗ nào trong <code>ls -l</code>. ' +
           'Đáp án D sai vì <code>-O2</code> chỉ xoá được biến <code>static</code> mà ' +
           '<b>không ai dùng tới</b>; một frame buffer thì chắc chắn có nơi dùng.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Khi nhân Linux nạp một file thực thi vào bộ nhớ để chạy, nó đọc bảng nào trong file ELF?',
      opts: [
        'Bảng section — vì chỉ bảng section mới ghi rõ tên <code>.text</code>, <code>.data</code>, <code>.bss</code>',
        'Bảng segment (program header) — nhân không cần biết tên section nào cả; bảng section là bản đồ dành cho trình liên kết lúc build',
        'Cả hai bảng, lần lượt: bảng section trước để biết tên, bảng segment sau để biết quyền',
        'Không bảng nào — nhân chép toàn bộ file vào RAM từ byte 0 rồi nhảy tới byte đầu tiên'
      ],
      a: 1,
      why: 'Hai bảng, hai độc giả, hai thời điểm. <b>Bảng section</b> chia file theo ' +
           '<i>vai trò</i> để trình liên kết ghép và cắt <b>lúc build</b>. <b>Bảng segment</b> ' +
           'gộp các section lại theo <i>quyền truy cập</i> để nhân ánh xạ <b>lúc nạp</b> — nhân ' +
           'chỉ cần biết "chép ngần này byte từ offset này vào địa chỉ này, với quyền RW hay ' +
           'R E". Bằng chứng dứt điểm: bạn có thể <code>strip</code> sạch bảng ký hiệu, chương ' +
           'trình vẫn chạy y hệt; và một file <code>.o</code> có đầy đủ bảng section nhưng ' +
           '<b>không có program header nào</b> — nên nhân không có gì để đọc, và ' +
           '<code>.o</code> không chạy được.' },

    { id: 'a3', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Trường <code>Entry point address</code> trong ELF header của một file thực thi trỏ ' +
         'tới đâu?',
      opts: [
        'Tới hàm <code>main</code> — đó là định nghĩa của "điểm vào" trong C',
        'Tới <code>_start</code>, đoạn mã khởi động của thư viện C được liên kết vào chính file này; nó dựng ngăn xếp rồi gọi <code>__libc_start_main</code>, truyền địa chỉ <code>main</code> vào như một tham số',
        'Tới byte đầu tiên của section <code>.text</code>, và địa chỉ đó luôn trùng với <code>main</code>',
        'Tới <code>printf</code> hoặc hàm thư viện nào được gọi sớm nhất'
      ],
      a: 1,
      why: '<code>main</code> không hề đặc biệt với nhân, cũng không đặc biệt với CPU. Nó chỉ ' +
           'đặc biệt với <code>_start</code> — đoạn mã <b>nằm trong file của bạn</b>, do thư ' +
           'viện C đưa vào lúc liên kết. Trước khi <code>main</code> chạy, đoạn mã đó còn phải ' +
           'gọi các hàm khởi tạo trong <code>.init_array</code> (hàm mang thuộc tính ' +
           '<code>constructor</code>, khởi tạo của C++). Đáp án C là cái bẫy tinh vi: trên phép ' +
           'đo trong bộ này, <code>_start</code> <b>đúng là</b> nằm ngay đầu ' +
           '<code>.text</code> (0x1060) — nhưng <code>main</code> lại ở tận 0x1149, nên vế sau ' +
           'của câu C sai.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn chạy <code>file</code> lên bốn thứ khác hẳn nhau: một file <code>.o</code> vừa ' +
         'biên dịch, một chương trình chạy được, một thư viện <code>libm.so.6</code>, và một ' +
         'file <code>core</code> do chương trình sập sinh ra. Cả bốn đều được báo là ' +
         '<b>"ELF 64-bit LSB"</b>. Kết luận đúng là gì?',
      opts: [
        '<code>file</code> đoán nhầm — chỉ file chạy được mới thật sự là ELF',
        'ELF là một định dạng chung dùng cho nhiều loại file khác nhau; trường <code>Type</code> trong ELF header (<code>REL</code> / <code>EXEC</code> / <code>DYN</code> / <code>CORE</code>) mới là thứ phân biệt chúng',
        'Cả bốn đều chạy được, vì đã là ELF thì nhân đều nạp được',
        'Chỉ đúng trên x86-64; trên ARM64 bốn thứ này có bốn định dạng khác nhau'
      ],
      a: 1,
      why: 'ELF là cái <b>hộp</b>, không phải cái ruột. Cùng một cấu trúc header 64 byte được ' +
           'dùng cho file trung gian (<code>REL</code>), chương trình chạy được ' +
           '(<code>EXEC</code> hoặc <code>DYN</code> nếu là PIE), thư viện động ' +
           '(<code>DYN</code>) và ảnh chụp bộ nhớ lúc sập (<code>CORE</code>). Cách nhìn ra ' +
           'ngay là <code>readelf -h &lt;file&gt; | grep Type</code>. Đáp án D sai theo hướng ' +
           'khác: ARM64 vẫn dùng ELF, chỉ khác giá trị trường <code>Machine</code>.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Trong bảng section, cờ <code>A</code> nghĩa là được nạp vào bộ nhớ, <code>W</code> ' +
         'là ghi được, <code>X</code> là chạy được. Vì <code>.text</code> cần chạy và ' +
         '<code>.data</code> cần ghi, một chương trình bình thường sẽ có ít nhất một section ' +
         'mang cả ba cờ <code>WAX</code>.',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nói rõ vì sao tổ hợp đó bị tránh.',
      why: 'Trong toàn bộ 31 section của <code>probe</code>, <b>không một section nào</b> mang ' +
           'đồng thời <code>W</code> và <code>X</code>. <code>.init</code>, <code>.plt</code>, ' +
           '<code>.text</code>, <code>.fini</code> là <code>AX</code>; <code>.data</code>, ' +
           '<code>.bss</code>, <code>.got</code>, <code>.dynamic</code> là <code>WA</code>. Đây ' +
           'là quy tắc <b>W^X</b> ("write xor execute"): một vùng nhớ vừa ghi được vừa chạy ' +
           'được cho phép kẻ tấn công ghi mã của họ vào rồi nhảy tới. Cách tách đúng là dùng ' +
           '<b>hai section riêng</b> nằm trong <b>hai segment riêng</b> — và đó chính là lý do ' +
           'program header liệt kê nhiều dòng <code>LOAD</code> chứ không phải một.',
      crit: [
        'Nói rõ: không có section thường nào mang đồng thời <code>W</code> và <code>X</code>',
        'Gọi tên hoặc mô tả đúng quy tắc W^X, hoặc nêu lý do bảo mật (ghi được + chạy được = tiêm mã)',
        'Chỉ ra <code>.text</code> là <code>AX</code> còn <code>.data</code>/<code>.bss</code> là <code>WA</code> — hai section tách biệt, không gộp'
      ],
      sol: 'Một chương trình bình thường <b>không</b> có section nào mang cả <code>W</code> lẫn ' +
           '<code>X</code>. Mã máy nằm ở các section <code>AX</code> (được nạp, chạy được, ' +
           '<b>không</b> ghi được); dữ liệu nằm ở các section <code>WA</code> (được nạp, ghi ' +
           'được, <b>không</b> chạy được). Tách như vậy là có chủ đích — quy tắc W^X — vì một ' +
           'vùng vừa ghi vừa chạy là con đường kinh điển để tiêm mã độc.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Thiết bị của bạn chỉ có 64 MB RAM và hay bị hết bộ nhớ. Đồng nghiệp đề xuất: ' +
         '<i>"Chạy <code>strip</code> lên tất cả chương trình đi — file nhỏ lại thì lúc chạy ' +
         'cũng chiếm ít RAM hơn, đây là cách rẻ nhất."</i>',
      a: 1,
      rw: 'Viết lại lời khuyên cho đúng: <code>strip</code> tiết kiệm được cái gì, và không tiết kiệm được cái gì.',
      why: 'Đo thật trên <code>probe</code>: file từ <b>17 120</b> xuống <b>15 504</b> byte ' +
           '(bớt 1 616 B, ≈ 9,4 %). Nhưng <code>size</code> in ra <b>y hệt</b> trước và sau — ' +
           'text 1 421, data 1 640, bss 4 160. Lý do: những gì <code>strip</code> cắt bỏ ' +
           '(<code>.symtab</code>, <code>.strtab</code>, thông tin gỡ lỗi) đều <b>không có cờ ' +
           '<code>A</code></b>, tức là chưa bao giờ được nạp vào bộ nhớ. <code>strip</code> là ' +
           'công cụ tiết kiệm <b>flash/đĩa</b>, không phải công cụ tiết kiệm <b>RAM</b> — và ' +
           'cái giá phải trả là mọi vết sập sau đó sẽ không còn tên hàm.',
      crit: [
        'Nói rõ <code>strip</code> làm file nhỏ đi (nêu được một con số đo thật của mình cũng được)',
        'Nói rõ RAM lúc chạy <b>không</b> thay đổi',
        'Nêu đúng lý do: phần bị cắt (bảng ký hiệu / thông tin gỡ lỗi) không có cờ <code>A</code>, không được nạp',
        'Nhắc tới cái giá: mất tên hàm khi phân tích sự cố'
      ],
      sol: '<code>strip</code> tiết kiệm <b>dung lượng flash</b>, không tiết kiệm <b>RAM</b>. ' +
           'Nó xoá <code>.symtab</code>/<code>.strtab</code> và thông tin gỡ lỗi — toàn những ' +
           'section không mang cờ <code>A</code>, nghĩa là nhân chưa bao giờ nạp chúng. ' +
           '<code>size</code> trước và sau <code>strip</code> giống hệt nhau, và đó là bằng ' +
           'chứng. Muốn giảm RAM thì phải giảm <code>.bss</code> và <code>.data</code> — tức ' +
           'là giảm kích thước các mảng và bộ đệm — hoặc giảm ngăn xếp và vùng cấp phát động. ' +
           'Ngoài ra <code>strip</code> có giá: sau đó backtrace chỉ còn địa chỉ, không còn tên ' +
           'hàm, nên hãy giữ lại một bản chưa strip để tra cứu.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Trong output của <code>nm</code>, một biến toàn cục nằm ở <code>.bss</code> được ' +
         'đánh chữ <b>hoa</b> <code>B</code>. Nếu đúng biến đó được khai báo thêm từ khoá ' +
         '<code>static</code>, <code>nm</code> sẽ đánh chữ gì? (điền đúng một ký tự)',
      a: ['b', 'B thường', 'chữ b thường', 'b thường'],
      ph: 'một ký tự',
      why: 'Quy tắc của <code>nm</code> gọn đúng một câu: <b>chữ hoa = ký hiệu toàn cục</b> ' +
           '(nhìn thấy được từ file <code>.o</code> khác), <b>chữ thường = ký hiệu cục bộ</b> ' +
           '(chỉ nhìn thấy trong đơn vị biên dịch này). Chữ cái cho biết <i>section</i>, còn ' +
           'hoa/thường cho biết <i>tầm nhìn</i>. Đo thật trên <code>probe</code>: ' +
           '<code>0000000000004440 B counter</code> (toàn cục, <code>.bss</code>) đứng cạnh ' +
           '<code>0000000000004460 b log_buf</code> (<code>static</code>, cũng ' +
           '<code>.bss</code>). Cùng section, khác tầm nhìn, khác đúng một chữ.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi section với thứ nằm trong nó:',
      left: ['<code>.text</code>', '<code>.rodata</code>', '<code>.data</code>',
             '<code>.bss</code>', '<code>.symtab</code>', '<code>.interp</code>'],
      right: [
        'Bảng tên và địa chỉ của mọi hàm/biến — bị <code>strip</code> xoá, không mang cờ <code>A</code> nên không bao giờ được nạp',
        'Đường dẫn tới trình thông dịch động sẽ nạp chương trình này (<code>/lib64/ld-linux-x86-64.so.2</code>)',
        'Biến toàn cục có giá trị khởi tạo khác 0 — chiếm chỗ cả trong file lẫn trong RAM',
        'Mã máy chạy được — mang cờ <code>AX</code>, không ghi được',
        'Biến toàn cục chưa khởi tạo — kiểu <code>NOBITS</code>, 0 byte nội dung trong file',
        'Hằng số và chuỗi ký tự — được nạp nhưng không ghi được (cờ <code>A</code> trơn)'
      ],
      a: [3, 5, 2, 4, 0, 1],
      why: 'Sáu section này trả lời sáu câu hỏi khác nhau, và ranh giới giữa chúng là thứ đáng ' +
           'nhớ. <code>.rodata</code> và <code>.data</code> chỉ khác nhau ở <b>một cờ</b> ' +
           '(<code>W</code>) — cùng nằm trong file, cùng được nạp. <code>.data</code> và ' +
           '<code>.bss</code> chỉ khác nhau ở <b>giá trị khởi tạo có phải 0 hay không</b>, mà ' +
           'khác biệt đó lại quyết định chuyện file có phình lên hay không. ' +
           '<code>.symtab</code> là section duy nhất trong sáu cái <b>không được nạp</b>. Còn ' +
           '<code>.interp</code> chỉ là một chuỗi ký tự — nhưng thiếu nó thì chương trình liên ' +
           'kết động không khởi động được.' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══
     Mọi transcript dưới đây đo trên probe.c/probe2.c, ngày 25/08/2026 — dữ liệu MỚI,
     không trùng một dòng nào với sample.c của lessons/bai-18.js. */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Giải thích vì sao', rows: 7,
      q: 'Đây là chương trình mẫu của bộ bài tập này và hai phép đo trên nó. Hãy ' +
         '<b>tự tính</b> hiệu <code>MemSiz − FileSiz</code> của dòng <code>LOAD</code> ghi được ' +
         '(cờ <code>RW</code>), rồi giải thích: những byte chênh lệch đó <b>đến từ đâu</b>, ' +
         '<b>ai</b> tạo ra chúng, và <b>vào lúc nào</b>?',
      blocks: [
        { t: 'code', where: 'file', name: 'probe.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '\n' +
          'static char log_buf[4096];        /* uninitialised, file scope */\n' +
          'char table[1024] = { 1 };         /* initialised */\n' +
          'const char version[] = "v1.0";    /* read only */\n' +
          'int counter;                      /* uninitialised */\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("%s %d\\n", version, counter + table[0] + log_buf[0]);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', name: 'gcc -Wall -o probe probe.c ; size probe', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1421\t   1640\t   4160\t   7221\t   1c35\tprobe' },
        { t: 'code', where: 'wsl', name: 'readelf -lW probe | grep LOAD', nocopy: true, code:
          '  LOAD   0x000000 0x0000000000000000 0x0000000000000000 0x000608 0x000608 R   0x1000\n' +
          '  LOAD   0x001000 0x0000000000001000 0x0000000000001000 0x0001a1 0x0001a1 R E 0x1000\n' +
          '  LOAD   0x002000 0x0000000000002000 0x0000000000002000 0x000148 0x000148 R   0x1000\n' +
          '  LOAD   0x002db8 0x0000000000003db8 0x0000000000003db8 0x000668 0x0016a8 RW  0x1000' },
        { t: 'code', where: 'wsl', name: 'readelf -SW probe | grep -E \'\\.data|\\.bss\'', nocopy: true, code:
          '  [25] .data   PROGBITS  0000000000004000 003000 000420 00  WA  0   0 32\n' +
          '  [26] .bss    NOBITS    0000000000004420 003420 001040 00  WA  0   0 32' },
      ],
      crit: [
        'Tính đúng: 0x16a8 = 5800, 0x668 = 1640, hiệu = <b>4160</b>',
        'Nhận ra 4160 <b>đúng bằng</b> cột <code>bss</code> của <code>size</code>, và đúng bằng 0x1040 của section <code>.bss</code>',
        'Nói được vì sao chỉ dòng <code>RW</code> có hiệu khác 0, còn ba dòng kia có <code>FileSiz</code> = <code>MemSiz</code>',
        'Trả lời đúng "ai và lúc nào": <b>nhân</b> cấp và điền số 0, <b>lúc nạp chương trình</b> — không phải trình biên dịch, không phải lúc build',
        'Nêu được lý do thiết kế: 4160 byte toàn số 0 thì lưu trên đĩa là lãng phí, chỉ cần ghi lại con số'
      ],
      sol: '<p><b>Phép tính.</b> 0x16a8 = 5800; 0x668 = 1640; hiệu = <b>4160</b>. Con số này ' +
           'xuất hiện thêm hai lần nữa trong cùng trang: nó là cột <code>bss</code> của ' +
           '<code>size</code> (4160), và là cột <code>Size</code> của section ' +
           '<code>.bss</code> (0x1040 = 4160). Ba phép đo độc lập, cùng một con số — đó là ' +
           'cách bạn biết mình đọc đúng chứ không phải trùng hợp.</p>' +
           '<p><b>Chúng đến từ đâu.</b> Từ <code>log_buf[4096]</code> và ' +
           '<code>counter</code> — hai biến chưa khởi tạo, cộng thêm vài chục byte đệm căn lề ' +
           'và biến nội bộ của thư viện C. Chúng <b>không có mặt trên đĩa</b>: ' +
           '<code>.bss</code> có <code>Type</code> là <code>NOBITS</code>, nghĩa là section này ' +
           'khai báo địa chỉ và kích thước nhưng không mang theo nội dung.</p>' +
           '<p><b>Ai và lúc nào.</b> <b>Nhân</b> tạo ra chúng, <b>lúc nạp chương trình</b>. ' +
           'Nhân đọc dòng <code>LOAD</code> đó, thấy <code>MemSiz</code> lớn hơn ' +
           '<code>FileSiz</code>, nên sau khi ánh xạ 1640 byte có thật từ file, nó cấp thêm ' +
           '4160 byte nữa và <b>điền toàn số 0</b>. Đó là lý do chuẩn C bảo đảm biến toàn cục ' +
           'chưa khởi tạo luôn bằng 0 — không phải trình biên dịch làm, mà nhân làm.</p>' +
           '<p><b>Vì sao chỉ dòng RW.</b> Ba segment kia chứa mã và dữ liệu chỉ đọc: mọi byte ' +
           'của chúng đều phải có sẵn trong file, nên <code>FileSiz</code> = ' +
           '<code>MemSiz</code>. Chỉ vùng ghi được mới có thể chứa "chỗ trống hứa hẹn".</p>' +
           '<p><b>Vì sao thiết kế như vậy.</b> Lưu 4160 byte số 0 vào file là trả tiền đĩa cho ' +
           'thông tin bằng không. Ghi một con số rồi để nhân điền thì rẻ hơn nhiều — và với ' +
           'firmware nhúng, chênh lệch đó có thể là hàng trăm KB flash.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao', rows: 7,
      q: '<code>size probe</code> cộng ba cột lại ra <b>7 221</b> byte. Nhưng ' +
         '<code>ls -l</code> báo file nặng <b>17 120</b> byte — hơn gấp đôi. Hãy giải thích ' +
         'khoảng chênh này. Cảnh báo: có <b>hai</b> sai lệch đi ngược chiều nhau, và một câu ' +
         'trả lời đầy đủ phải nêu cả hai.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'size probe ; ls -l probe', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1421\t   1640\t   4160\t   7221\t   1c35\tprobe\n' +
          '-rwxr-xr-x 1 shinarus shinarus 17120 Aug 25 21:30 probe' },
        { t: 'code', where: 'wsl', name: 'readelf -SW probe | head -n 2 ; readelf -lW probe | sed -n \'4p\'', nocopy: true, code:
          'There are 31 section headers, starting at offset 0x3b20:\n' +
          'There are 14 program headers, starting at offset 64' },
        { t: 'code', where: 'wsl', name: 'bốn section không được nạp (không có cờ A)', nocopy: true, code:
          '  [27] .comment   PROGBITS  0000000000000000 003420 000026 01  MS  0   0  1\n' +
          '  [28] .symtab    SYMTAB    0000000000000000 003448 0003c0 18     29  19  8\n' +
          '  [29] .strtab    STRTAB    0000000000000000 003808 0001fb 00      0   0  1\n' +
          '  [30] .shstrtab  STRTAB    0000000000000000 003a03 00011a 00      0   0  1' },
      ],
      crit: [
        'Sai lệch thứ nhất, làm <code>size</code> <b>thừa</b>: cột <code>bss</code> (4160) đếm byte KHÔNG có trong file',
        'Sai lệch thứ hai, làm <code>size</code> <b>thiếu</b>: file còn chứa nhiều thứ <code>size</code> không đếm — bảng section, bảng ký hiệu, chuỗi tên, phần đệm căn trang',
        'Nêu được ít nhất ba thứ cụ thể có trong file mà không nằm trong text/data/bss',
        'Nhận ra bảng section nằm ở <b>cuối</b> file: 0x3b20 = 15 136, cộng 31 × 64 = 1 984, ra đúng 17 120',
        'Kết luận đúng: <code>size</code> trả lời câu hỏi "chiếm bao nhiêu BỘ NHỚ lúc chạy", <code>ls -l</code> trả lời "chiếm bao nhiêu ĐĨA" — hai câu hỏi khác nhau'
      ],
      sol: '<p><b>Sai lệch 1 — <code>size</code> đếm thừa.</b> Cột <code>bss</code> = 4 160 là ' +
           'bộ nhớ lúc chạy, <b>không</b> phải byte trên đĩa. Vậy phần file mà ' +
           '<code>size</code> thật sự nói tới chỉ là text + data = 1 421 + 1 640 = ' +
           '<b>3 061</b> byte.</p>' +
           '<p><b>Sai lệch 2 — <code>size</code> đếm thiếu, và thiếu rất nhiều.</b> ' +
           '17 120 − 3 061 = <b>14 059</b> byte trong file mà <code>size</code> không bao giờ ' +
           'nhắc tới:</p>' +
           '<ul>' +
           '<li><b>Bảng section</b>: 31 × 64 = <b>1 984</b> byte, bắt đầu ở 0x3b20 = 15 136. ' +
           'Cộng lại: 15 136 + 1 984 = <b>17 120</b> — đúng bằng kích thước file. Bảng section ' +
           'nằm ở <b>tận cuối</b> file, và đó chính là lý do <code>strip</code> cắt nó đi được ' +
           'rẻ đến vậy.</li>' +
           '<li><b>ELF header</b> 64 byte + <b>bảng program header</b> 14 × 56 = 784 byte, ' +
           'ngay đầu file.</li>' +
           '<li><b><code>.symtab</code></b> 0x3c0 = 960 byte, <b><code>.strtab</code></b> ' +
           '0x1fb = 507 byte, <b><code>.shstrtab</code></b> 0x11a = 282 byte, ' +
           '<b><code>.comment</code></b> 0x26 = 38 byte — cả bốn đều <b>không có cờ ' +
           '<code>A</code></b>, tức không bao giờ được nạp vào bộ nhớ, nên ' +
           '<code>size</code> bỏ qua chúng.</li>' +
           '<li><b>Phần đệm căn trang</b>, và đây mới là phần lớn nhất. Mỗi segment ' +
           '<code>LOAD</code> phải bắt đầu ở bội số của 0x1000 trong file. Segment thứ nhất ' +
           'kết thúc ở 0x608 nhưng segment thứ hai phải đợi tới 0x1000 — <b>2 552 byte trống</b> ' +
           'chen vào giữa. Tương tự giữa 0x11a1 và 0x2000, rồi giữa 0x2148 và 0x2db8.</li>' +
           '</ul>' +
           '<p><b>Kết luận.</b> <code>size</code> và <code>ls -l</code> không hề mâu thuẫn — ' +
           'chúng trả lời hai câu hỏi khác nhau. <code>size</code> nói "chương trình này chiếm ' +
           'bao nhiêu <b>bộ nhớ</b> lúc chạy". <code>ls -l</code> nói "file này chiếm bao nhiêu ' +
           '<b>đĩa</b>". Đây chính xác là ba con số mà bài tập 17 (câu E6) cố tình để ngỏ.</p>' },

    { id: 'b3', k: 'free', truc: 1, tag: 'So sánh cặp', rows: 6,
      q: 'Dưới đây là <b>hai</b> bảng mô tả cùng một file <code>probe</code>. Chúng liệt kê ' +
         'cùng những cái tên, cùng những địa chỉ. Trong tất cả những khác biệt giữa hai bảng, ' +
         '<b>khác biệt nào là khác biệt quan trọng</b> — cái khiến bạn không thể bỏ một bảng đi ' +
         'và chỉ dùng bảng kia?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'readelf -SW probe — trích 6 section cuối cùng được nạp', nocopy: true, code:
          '  [Nr] Name         Type      Address           Off    Size   ES Flg Lk Inf Al\n' +
          '  [21] .init_array INIT_ARRAY 0000000000003db8 002db8 000008 08  WA  0   0  8\n' +
          '  [22] .fini_array FINI_ARRAY 0000000000003dc0 002dc0 000008 08  WA  0   0  8\n' +
          '  [23] .dynamic    DYNAMIC    0000000000003dc8 002dc8 0001f0 10  WA  5   0  8\n' +
          '  [24] .got        PROGBITS   0000000000003fb8 002fb8 000048 08  WA  0   0  8\n' +
          '  [25] .data       PROGBITS   0000000000004000 003000 000420 00  WA  0   0 32\n' +
          '  [26] .bss        NOBITS     0000000000004420 003420 001040 00  WA  0   0 32' },
        { t: 'code', where: 'wsl', name: 'readelf -lW probe — phần "Section to Segment mapping"', nocopy: true, code:
          ' Segment Sections...\n' +
          '   03     .init .plt .plt.got .plt.sec .text .fini\n' +
          '   04     .rodata .eh_frame_hdr .eh_frame .note.gnu.property .note.ABI-tag\n' +
          '   05     .init_array .fini_array .dynamic .got .data .bss\n' +
          '   13     .init_array .fini_array .dynamic .got' },
      ],
      crit: [
        'Nói rõ hai bảng có <b>hai độc giả</b> khác nhau: trình liên kết (lúc build) và nhân (lúc nạp)',
        'Nói rõ tiêu chí gom nhóm khác nhau: section chia theo <b>vai trò</b>, segment gom theo <b>quyền truy cập</b>',
        'Chỉ ra sáu section rời rạc ở bảng trên gộp thành <b>một</b> segment 05 ở bảng dưới, vì cùng cần quyền RW',
        'Nhận ra bốn section xuất hiện ở <b>cả</b> segment 05 lẫn segment 13 — một section có thể thuộc nhiều segment, nên hai bảng không thể là một',
        'Nêu bằng chứng dứt điểm: một file <code>.o</code> có bảng section nhưng không có bảng segment nào'
      ],
      sol: '<p><b>Khác biệt không quan trọng:</b> tên gọi, thứ tự in ra, cách trình bày cột. ' +
           'Cả hai bảng đều nhắc tới <code>.data</code>, <code>.bss</code>, ' +
           '<code>.got</code>… nên rất dễ tưởng chúng là một.</p>' +
           '<p><b>Khác biệt quan trọng: hai bảng có hai độc giả, ở hai thời điểm.</b></p>' +
           '<ul>' +
           '<li>Bảng <b>section</b> chia file theo <b>vai trò</b>: cái này là mảng hàm khởi ' +
           'tạo, cái kia là bảng địa chỉ toàn cục, cái nọ là dữ liệu người dùng. Trình liên ' +
           'kết cần độ chi tiết đó để ghép, để sắp xếp, để cắt bằng ' +
           '<code>--gc-sections</code> — <b>lúc build</b>.</li>' +
           '<li>Bảng <b>segment</b> gom chúng lại theo <b>quyền truy cập</b>. Nhân không quan ' +
           'tâm cái nào tên gì; nó chỉ cần biết "ánh xạ ngần này byte với quyền RW". Sáu ' +
           'section rời rạc ở bảng trên trở thành <b>đúng một</b> dòng <code>LOAD</code> ở ' +
           'bảng dưới, vì cả sáu đều mang cờ <code>WA</code> — và bộ quản lý bộ nhớ đặt quyền ' +
           'theo <b>trang</b>, không đặt theo section được.</li>' +
           '</ul>' +
           '<p><b>Bằng chứng hai bảng không thể quy về một:</b> bốn section ' +
           '<code>.init_array .fini_array .dynamic .got</code> xuất hiện ở <b>cả</b> segment 05 ' +
           '<b>lẫn</b> segment 13. Một section thuộc nhiều segment cùng lúc — quan hệ giữa hai ' +
           'bảng là nhiều–nhiều, không phải một–một. (Segment 13 là ' +
           '<code>GNU_RELRO</code>: sau khi <code>ld.so</code> nối xong các địa chỉ, nó xin ' +
           'nhân chuyển riêng vùng này sang chỉ đọc, để không ai vá được bảng ' +
           '<code>.got</code> nữa.)</p>' +
           '<p><b>Bằng chứng dứt điểm:</b> một file <code>.o</code> có bảng section đầy đủ ' +
           'nhưng <b>không có một program header nào</b>. Trình liên kết vẫn dùng được nó; nhân ' +
           'thì không có gì để đọc. Đó là lý do <code>.o</code> không chạy được — bạn sẽ tự ' +
           'kiểm chứng ở câu E5.</p>' },

    { id: 'b4', k: 'free', truc: 2, tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ:<br>' +
         '<i>"Chương trình C bắt đầu chạy ở <code>main</code>. Mọi thứ diễn ra trước ' +
         '<code>main</code> đều là việc của hệ điều hành và nằm ngoài file thực thi của chúng ' +
         'ta, nên không cần quan tâm khi làm firmware."</i><br>' +
         'Phát biểu này sai ở <b>mấy chỗ</b>? Chỉ ra từng chỗ, dùng số liệu bên dưới làm bằng chứng.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'readelf -hW probe | grep -E \'Type:|Entry\'', nocopy: true, code:
          '  Type:                              DYN (Position-Independent Executable file)\n' +
          '  Entry point address:               0x1060' },
        { t: 'code', where: 'wsl', name: 'nm probe | grep -E \' _start$| main$|__libc_start_main\'', nocopy: true, code:
          '                 U __libc_start_main@GLIBC_2.34\n' +
          '0000000000001060 T _start\n' +
          '0000000000001149 T main' },
        { t: 'code', where: 'wsl', name: 'readelf -SW probe | grep init_array', nocopy: true, code:
          '  [21] .init_array   INIT_ARRAY  0000000000003db8 002db8 000008 08  WA  0   0  8' },
      ],
      crit: [
        'Chỗ sai 1: điểm vào là <b>0x1060 = <code>_start</code></b>, không phải <code>main</code> (0x1149) — hai địa chỉ khác nhau, in ngay trên trang',
        'Chỗ sai 2: <code>_start</code> <b>nằm trong chính file này</b> (<code>nm</code> đánh chữ <code>T</code>, có địa chỉ) — không phải "việc của hệ điều hành"',
        'Chỗ sai 3: giữa <code>_start</code> và <code>main</code> còn có <code>.init_array</code> chạy — hàm <code>constructor</code>, khởi tạo C++',
        'Nói được vai trò của <code>main</code>: một tham số truyền cho <code>__libc_start_main</code>, chỉ là một hàm bình thường',
        'Nêu được hệ quả cho firmware: bare-metal không có libc thì phải tự viết <code>_start</code>'
      ],
      sol: '<p><b>Sai ba chỗ, và chỗ thứ ba mới là chỗ đắt tiền.</b></p>' +
           '<p><b>1. Điểm vào không phải <code>main</code>.</b> ELF header ghi ' +
           '<code>Entry point address: 0x1060</code>. <code>nm</code> cho biết 0x1060 là ' +
           '<code>_start</code>, còn <code>main</code> ở tận <b>0x1149</b> — cách nhau 233 ' +
           'byte. Nhân nhảy tới 0x1060, không phải 0x1149.</p>' +
           '<p><b>2. <code>_start</code> nằm trong chính file này.</b> ' +
           '<code>nm</code> đánh nó chữ <code>T</code> và cho nó một địa chỉ cụ thể — nghĩa là ' +
           'mã của nó có mặt trong section <code>.text</code> của <code>probe</code>. Trình ' +
           'liên kết đã lấy nó từ <code>crt1.o</code> của thư viện C và ghép vào. Trái lại, ' +
           '<code>__libc_start_main</code> mang chữ <code>U</code> — <i>undefined</i>, sẽ được ' +
           '<code>ld.so</code> nối lúc chạy. Ba chữ cái <code>T</code>/<code>T</code>/' +
           '<code>U</code> trên ba dòng liền nhau kể đúng câu chuyện này.</p>' +
           '<p><b>3. Giữa <code>_start</code> và <code>main</code> có việc thật sự xảy ra.</b> ' +
           '<code>_start</code> dựng ngăn xếp, gom <code>argc</code>/<code>argv</code>/' +
           '<code>envp</code>, rồi gọi <code>__libc_start_main</code> và <b>truyền địa chỉ ' +
           '<code>main</code> vào như một tham số</b>. Trước khi gọi <code>main</code>, hàm đó ' +
           'còn chạy hết <code>.init_array</code> — mảng con trỏ hàm ở địa chỉ 0x3db8. Đây là ' +
           'nơi hàm mang thuộc tính <code>constructor</code> và mọi khởi tạo đối tượng toàn ' +
           'cục của C++ được thực thi. Một biến toàn cục C++ khởi tạo lỗi sẽ làm chương trình ' +
           'chết <b>trước khi</b> dòng đầu tiên của <code>main</code> chạy — và người tin vào ' +
           'phát biểu trên sẽ không biết tìm ở đâu.</p>' +
           '<p><b>Hệ quả cho firmware.</b> Trên bare-metal không có libc, <b>không ai</b> viết ' +
           'sẵn <code>_start</code> cho bạn: bạn phải tự đặt con trỏ ngăn xếp, tự chép ' +
           '<code>.data</code> từ flash sang RAM, tự điền 0 cho <code>.bss</code> — chính là ' +
           'những việc mà nhân Linux đã làm hộ ở câu B1 — rồi mới gọi được ' +
           '<code>main</code>.</p>' },

    { id: 'b5', k: 'free', tag: 'Đọc output', rows: 5,
      q: 'Bạn lọc bảng section, chỉ giữ những section mang cờ <code>AX</code> (được nạp và chạy ' +
         'được). Kết quả ra <b>sáu</b> section, không phải một. Hãy đọc output và trả lời: ' +
         'vì sao mã máy không nằm gọn trong <code>.text</code>, và ba section ' +
         '<code>.plt*</code> có mặt ở đây là do đâu?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'readelf -SW probe | grep \' AX \'', nocopy: true, code:
          '  [10] .init     PROGBITS  0000000000001000 001000 00001b 00  AX  0   0  4\n' +
          '  [11] .plt      PROGBITS  0000000000001020 001020 000020 10  AX  0   0 16\n' +
          '  [12] .plt.got  PROGBITS  0000000000001040 001040 000010 10  AX  0   0 16\n' +
          '  [13] .plt.sec  PROGBITS  0000000000001050 001050 000010 10  AX  0   0 16\n' +
          '  [14] .text     PROGBITS  0000000000001060 001060 000134 00  AX  0   0 16\n' +
          '  [15] .fini     PROGBITS  0000000000001194 001194 00000d 00  AX  0   0  4' },
      ],
      crit: [
        'Nhận ra sáu section này nằm <b>liền nhau</b>, địa chỉ nối tiếp từ 0x1000 tới 0x11a1 — và cả sáu gộp thành một segment <code>R E</code> duy nhất',
        'Giải thích <code>.init</code>/<code>.fini</code>: mã chạy trước và sau <code>main</code>, tách riêng vì được gọi ở thời điểm khác',
        'Giải thích <code>.plt*</code>: bàn đạp cho lời gọi hàm thư viện <b>động</b> (<code>printf</code>) — địa chỉ thật chỉ biết lúc chạy',
        'Nhận ra <code>.text</code> chỉ 0x134 = <b>308</b> byte, nhỏ hơn cả tổng phần còn lại',
        'Kết luận: không cần <code>.plt</code> nếu liên kết hoàn toàn tĩnh'
      ],
      sol: '<p><b>Vì sao sáu chứ không phải một.</b> Cờ <code>AX</code> là câu trả lời cho câu ' +
           'hỏi "có được nạp và có chạy được không". Nhiều đoạn mã khác nhau cùng trả lời ' +
           '"có", nhưng chúng được <b>gọi vào những thời điểm khác nhau</b>, nên trình liên ' +
           'kết giữ chúng ở sáu section riêng — <i>vai trò</i> là tiêu chí chia section.</p>' +
           '<ul>' +
           '<li><code>.init</code> (27 byte) và <code>.fini</code> (13 byte): mã chạy khi ' +
           'chương trình khởi động và khi kết thúc.</li>' +
           '<li><code>.plt</code>, <code>.plt.got</code>, <code>.plt.sec</code> (tổng 64 byte): ' +
           '<b>Procedure Linkage Table</b> — những đoạn bàn đạp nhỏ. Khi mã của bạn gọi ' +
           '<code>printf</code>, nó không nhảy thẳng tới <code>printf</code>, vì lúc build ' +
           '<b>chưa ai biết</b> <code>printf</code> sẽ nằm ở đâu trong bộ nhớ. Nó nhảy vào bàn ' +
           'đạp, bàn đạp đọc địa chỉ thật từ bảng <code>.got</code> mà ' +
           '<code>ld.so</code> đã điền lúc nạp. Đây chính là cơ chế liên kết động của Bài 17, ' +
           'nhìn từ phía bên trong file.</li>' +
           '<li><code>.text</code>: mã của bạn — <b>0x134 = 308 byte</b>, ít hơn tổng năm ' +
           'section kia cộng lại.</li>' +
           '</ul>' +
           '<p><b>Nhưng nhân thì không thấy sáu.</b> Địa chỉ chạy liền một mạch từ 0x1000 tới ' +
           '0x11a1, và ở bảng program header cả sáu gộp thành đúng một dòng ' +
           '<code>LOAD … 0x0001a1 0x0001a1 R E</code>. Sáu vai trò, một quyền truy cập, một ' +
           'segment.</p>' +
           '<p><b>Kiểm chứng được:</b> liên kết hoàn toàn tĩnh (<code>-static</code>) thì ba ' +
           'section <code>.plt*</code> không còn lý do tồn tại — không còn lời gọi nào phải ' +
           'hoãn tới lúc chạy.</p>' },

    { id: 'b6', k: 'free', tag: 'Đọc output', rows: 5,
      q: 'Hai dòng đầu của ELF header. Trả lời hai câu: (1) <code>probe</code> là một chương ' +
         'trình chạy được bình thường, vậy vì sao <code>Type</code> lại là <code>DYN</code> — ' +
         'chữ vẫn dùng cho <b>thư viện động</b> — chứ không phải <code>EXEC</code>? ' +
         '(2) Nếu bạn <code>scp</code> đúng file này sang một board ARM64 chạy Linux rồi gõ ' +
         '<code>./probe</code>, chuyện gì xảy ra, và <b>ai</b> là người từ chối?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'readelf -hW probe | grep -E \'Type:|Machine:\'', nocopy: true, code:
          '  Type:                              DYN (Position-Independent Executable file)\n' +
          '  Machine:                           Advanced Micro Devices X86-64' },
      ],
      crit: [
        'Câu 1: nhắc tới <b>PIE</b> — chương trình được dịch để nạp ở địa chỉ bất kỳ, giống thư viện động, nên dùng chung kiểu <code>DYN</code>',
        'Câu 1: nêu lý do PIE là mặc định — <b>ASLR</b>, ngẫu nhiên hoá địa chỉ để chống khai thác lỗi',
        'Câu 1: nhận ra bằng chứng trong chính output đã dùng ở câu trước — mọi <code>Address</code> đều bắt đầu từ 0x0, tức là <b>offset</b> chứ không phải địa chỉ tuyệt đối',
        'Câu 2: trả lời <b>nhân</b> từ chối, ngay lúc <code>execve</code>, trước khi một lệnh nào của chương trình chạy',
        'Câu 2: nêu đúng thông báo <code>Exec format error</code> và mã thoát <b>126</b>'
      ],
      sol: '<p><b>(1) <code>DYN</code> vì đây là một PIE.</b> ' +
           '<i>Position-Independent Executable</i>: file được dịch sao cho nạp ở ' +
           '<b>bất kỳ</b> địa chỉ nào cũng chạy đúng — chính là yêu cầu vốn dành cho thư viện ' +
           'động, nên nó dùng chung kiểu <code>DYN</code>. Bằng chứng nằm ngay trong những ' +
           'bảng bạn vừa đọc: cột <code>Address</code> của <code>.text</code> là 0x1060, của ' +
           '<code>.data</code> là 0x4000 — những con số nhỏ xíu bắt đầu từ 0. Đó không phải ' +
           'địa chỉ thật, mà là <b>độ lệch</b> so với chỗ nhân quyết định nạp. Ubuntu bật PIE ' +
           'mặc định từ nhiều năm nay để <b>ASLR</b> hoạt động: mỗi lần chạy, chương trình nằm ' +
           'ở một địa chỉ khác, nên kẻ tấn công không đoán trước được địa chỉ nào để nhảy tới. ' +
           'Muốn thấy <code>EXEC</code> thật thì phải dịch với <code>-no-pie</code>.</p>' +
           '<p><b>(2) Nhân từ chối ngay lập tức.</b> Trường <code>Machine</code> nằm ở byte ' +
           '18–19 của file — trong 64 byte đầu tiên, nghĩa là nhân đọc được nó trước khi làm ' +
           'bất cứ việc gì khác. x86-64 là giá trị 0x3e, AArch64 là 0xb7. Nhân trên board đọc ' +
           '0x3e, thấy không phải kiến trúc của mình, và <code>execve</code> thất bại với ' +
           '<code>Exec format error</code>; shell in ra thông báo đó và trả về mã thoát ' +
           '<b>126</b>.</p>' +
           '<p><b>Điểm cần nhớ:</b> không có lệnh nào của <code>probe</code> được chạy — kể cả ' +
           '<code>_start</code>. Nó bị chặn ở cửa. Đây cũng là lý do Chặng 04 phải dựng cả một ' +
           'bộ công cụ biên dịch chéo riêng: không có cách nào "chạy tạm" một file x86-64 trên ' +
           'ARM64, vì thứ từ chối là <b>nhân</b>, không phải shell.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán ═══
     Cả năm câu đặt ngoài môi trường của bài học: bare-metal, không MMU, không libc,
     flash tính bằng KB. Đây là chỗ kiểm tra xem người học giữ được NGUYÊN LÝ hay chỉ
     nhớ được output của readelf trên máy mình. */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 7,
      q: '<b>Triệu chứng.</b> Bạn làm firmware cho một vi điều khiển: <b>512 KB flash</b>, ' +
         '<b>96 KB RAM</b>, không MMU, không hệ điều hành. Ảnh <code>.bin</code> nạp vào flash ' +
         'nặng <b>141 KB</b> — thừa chỗ. Nhưng sau khi một đồng nghiệp thêm một tính năng ghi ' +
         'log, thiết bị <b>treo ngay khi khởi động</b>, chưa in được ký tự nào ra UART. ' +
         'Ảnh <code>.bin</code> vẫn chỉ <b>141 KB</b> — <i>không tăng một byte nào</i>. Diff ' +
         'của commit đó chỉ có đúng một dòng thêm vào:' +
         '<br><code>static char log_buffer[65536];</code>' +
         '<br><br>Hãy nêu <b>ít nhất ba</b> giả thuyết có thể gây treo lúc khởi động trong một ' +
         'hệ bare-metal, rồi chỉ ra giả thuyết nào <b>khớp với toàn bộ bằng chứng</b> ở trên và ' +
         'giải thích vì sao hai bằng chứng "ảnh không tăng" và "treo ngay lập tức" lại là ' +
         '<b>cùng một nguyên nhân</b>.',
      hint: 'Con số 96 và con số 64 nằm trong cùng một đơn vị. Và hãy tự hỏi: mảng đó ' +
            'nằm ở section nào?',
      crit: [
        'Nêu được ít nhất ba giả thuyết khác nhau (ví dụ: tràn RAM, hỏng bảng vector, sai cấu hình xung nhịp, tràn ngăn xếp, treo trong hàm khởi tạo)',
        'Chọn đúng nguyên nhân: <code>log_buffer</code> chưa khởi tạo nên vào <code>.bss</code>, <b>65 536 byte RAM</b> trên tổng số 96 KB',
        'Giải thích "ảnh không tăng": <code>.bss</code> là <code>NOBITS</code> — nó chỉ là một con số trong bảng, không có byte nào để ghi vào flash',
        'Giải thích "treo ngay lập tức": mã khởi động điền 0 cho <code>.bss</code> <b>trước</b> khi gọi <code>main</code>, nên nó ghi đè ra ngoài RAM / đè lên ngăn xếp trước cả dòng lệnh đầu tiên của bạn',
        'Nêu đúng công cụ để xác nhận: <code>size</code> (cột <code>bss</code> phình lên) hoặc <code>nm --size-sort -S</code>, <b>không</b> phải <code>ls -l</code> trên file <code>.bin</code>',
        'Nêu được cách sửa hoặc cách phòng: cấp phát tĩnh nhỏ hơn, hoặc thêm kiểm tra kích thước RAM vào linker script'
      ],
      sol: '<p><b>Ba giả thuyết hợp lý</b> khi một board bare-metal treo trước cả ký tự UART ' +
           'đầu tiên: (1) cấu hình xung nhịp/PLL sai nên CPU chết trước khi UART chạy; ' +
           '(2) bảng vector ngắt sai địa chỉ nên exception đầu tiên nhảy vào chỗ vô nghĩa; ' +
           '(3) hết RAM — ngăn xếp hoặc <code>.bss</code> tràn ra ngoài vùng nhớ có thật. ' +
           'Cả ba đều gây đúng triệu chứng "treo, im lặng, tức thì".</p>' +
           '<p><b>Nhưng chỉ giả thuyết (3) giải thích được bằng chứng thứ hai.</b> Commit chỉ ' +
           'thêm một khai báo dữ liệu — nó không đụng tới xung nhịp và không đụng tới bảng ' +
           'vector. Và bằng chứng "ảnh <code>.bin</code> không tăng một byte nào" thì không ' +
           'phải là bằng chứng ngoại phạm, mà chính là <b>dấu vân tay</b> của thủ phạm.</p>' +
           '<p><b>Vì sao hai bằng chứng đó là một.</b> ' +
           '<code>log_buffer</code> không có bộ khởi tạo, nên trình biên dịch đặt nó vào ' +
           '<code>.bss</code>. <code>.bss</code> có kiểu <code>NOBITS</code>: nó khai báo ' +
           '"tôi cần 65 536 byte" nhưng <b>không mang theo byte nào</b>. Ảnh flash được sinh ra ' +
           'từ nội dung có thật của file, nên nó đứng yên ở 141 KB — <i>chính xác vì</i> mảng ' +
           'này chỉ tồn tại lúc chạy.</p>' +
           '<p>Còn lúc chạy thì 65 536 byte đó là <b>thật</b>. Trên Linux, nhân là bên cấp và ' +
           'điền 0 cho vùng này (câu B1). Trên bare-metal <b>không có nhân</b> — chính đoạn mã ' +
           'khởi động của bạn phải làm, bằng một vòng lặp <code>memset</code> chạy từ ' +
           '<code>__bss_start</code> tới <code>__bss_end</code>, <b>trước khi</b> ' +
           '<code>main</code> được gọi. 64 KB <code>.bss</code> mới cộng với phần cũ vượt quá ' +
           '96 KB RAM, nên vòng lặp đó ghi ra ngoài vùng nhớ có thật hoặc đè lên ngăn xếp. Đó ' +
           'là lý do thiết bị chết <b>trước</b> ký tự UART đầu tiên: nó chưa bao giờ tới được ' +
           '<code>main</code>.</p>' +
           '<p><b>Công cụ xác nhận.</b> <code>size firmware.elf</code> — cột ' +
           '<code>bss</code> nhảy vọt trong khi <code>text</code> và <code>data</code> đứng ' +
           'yên; rồi <code>nm --size-sort -S firmware.elf | tail</code> để chỉ đích danh biến. ' +
           'Đo <code>ls -l</code> trên file <code>.bin</code> sẽ <b>không bao giờ</b> tìm ra ' +
           'lỗi này, và đó chính là cái bẫy.</p>' +
           '<p><b>Bài học chung.</b> Trên hệ có MMU, tràn RAM cho bạn một ' +
           '<code>Killed</code> hoặc một <code>Segmentation fault</code> — một thông báo. Trên ' +
           'bare-metal không MMU, bạn không được thông báo nào cả: bạn được một thiết bị im ' +
           'lặng. Vì vậy ngân sách RAM phải được kiểm tra <b>lúc build</b> — linker script có ' +
           'thể khai báo dung lượng vùng nhớ và trình liên kết sẽ báo lỗi ' +
           '<code>region RAM overflowed</code> ngay tại chỗ.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 6,
      q: '<b>Triệu chứng.</b> Để tiết kiệm flash, nhóm bạn thêm ' +
         '<code>-ffunction-sections -fdata-sections -Wl,--gc-sections</code> vào bản build ' +
         'bare-metal. Ảnh nhỏ đi <b>18 %</b>, và mọi hàm được gọi từ <code>main</code> vẫn chạy ' +
         'đúng như cũ. Nhưng ngay lần ngắt timer đầu tiên, thiết bị <b>nhảy vào vòng lặp lỗi ' +
         'vô hạn</b>. Trình liên kết <b>không báo một cảnh báo nào</b>.<br><br>' +
         'Giải thích chuyện gì đã bị cắt, và <b>vì sao trình liên kết cho rằng cắt nó là ' +
         'đúng</b>. Trả lời phải nói rõ <code>--gc-sections</code> làm việc trên ' +
         '<b>bản đồ nào</b> trong hai bản đồ của file ELF, và vì sao chính điều đó tạo ra ' +
         'điểm mù.',
      hint: 'Ai là người "gọi" bảng vector ngắt? Người đó có phải là một dòng mã trong ' +
            'file của bạn không?',
      crit: [
        'Chỉ đúng thứ bị cắt: bảng vector ngắt (hoặc trình phục vụ ngắt), section riêng do <code>-ffunction-sections</code> tạo ra',
        'Nói rõ <code>--gc-sections</code> làm việc trên bản đồ <b>section</b> — bản đồ của trình liên kết, lúc build',
        'Nêu đúng thuật toán: bắt đầu từ điểm vào, đi theo các <b>tham chiếu ký hiệu</b>, giữ những gì với tới được, vứt phần còn lại',
        'Nêu đúng điểm mù: bảng vector chỉ được <b>phần cứng</b> đọc, ở một địa chỉ cố định — không có dòng mã nào tham chiếu tới nó, nên nó "không với tới được"',
        'Nêu được cách sửa: <code>KEEP()</code> trong linker script, hoặc <code>__attribute__((used))</code>',
        'Giải thích được vì sao không có cảnh báo: cắt một section không ai tham chiếu <b>là</b> hành vi đúng theo định nghĩa'
      ],
      sol: '<p><b>Thứ bị cắt là bảng vector ngắt</b> (hoặc hàm phục vụ ngắt của timer). ' +
           '<code>-ffunction-sections</code> đặt <i>mỗi</i> hàm vào một section riêng — ' +
           '<code>.text.timer_isr</code>, <code>.text.main</code>… — đúng để ' +
           '<code>--gc-sections</code> có thể vứt từng cái một. Rồi nó vứt thật.</p>' +
           '<p><b><code>--gc-sections</code> làm việc trên bản đồ section</b> — bản đồ dành cho ' +
           'trình liên kết, ở thời điểm build. Nó không hề biết gì về segment, về địa chỉ ' +
           'lúc chạy, và tuyệt đối không biết gì về phần cứng. Thuật toán rất đơn giản: ' +
           'bắt đầu từ <b>điểm vào</b>, đi theo mọi tham chiếu ký hiệu, đánh dấu section nào ' +
           'với tới được, rồi <b>xoá</b> tất cả những section không được đánh dấu.</p>' +
           '<p><b>Đây chính là điểm mù.</b> Trong toàn bộ mã nguồn của bạn, ' +
           '<b>không có một dòng nào gọi <code>timer_isr</code></b>. Người gọi nó là ' +
           '<b>phần cứng</b>: khi timer hết hạn, CPU tự đọc một địa chỉ cố định trong bảng ' +
           'vector và nhảy tới đó. Quan hệ đó tồn tại trong <i>datasheet</i>, không tồn tại ' +
           'trong đồ thị tham chiếu ký hiệu. Với trình liên kết, section ấy là rác — và cắt rác ' +
           'là <b>đúng việc nó được giao</b>, nên không có gì để cảnh báo.</p>' +
           '<p><b>Vì sao đây là bằng chứng cho "hai bản đồ".</b> Nếu section và segment là một ' +
           'thứ, câu hỏi này vô nghĩa. Nhưng chúng không phải: ' +
           '<code>--gc-sections</code> chỉ đọc được bản đồ <b>build-time</b>, nơi mọi liên kết ' +
           'là liên kết ký hiệu. Cái ràng buộc thật của bảng vector là ràng buộc ' +
           '<b>địa chỉ lúc chạy</b> — thứ chỉ xuất hiện ở bản đồ kia. Không bản đồ nào nhìn ' +
           'thấy cả hai, và đó là lý do bạn phải nói với trình liên kết bằng tay.</p>' +
           '<p><b>Cách sửa.</b> Trong linker script, bọc section đó trong ' +
           '<code>KEEP(*(.isr_vector))</code> — <code>KEEP</code> tồn tại đúng vì lý do này. ' +
           'Ở mức C, <code>__attribute__((used))</code> lên hàm cũng chặn được. Hai công cụ ' +
           'khác nhau, cùng một thông điệp: "cái này có người dùng, chỉ là bạn không thấy ' +
           'người đó".</p>' +
           '<p><b>Cách phòng.</b> So sánh <code>nm</code> của bản trước và bản sau khi bật ' +
           '<code>--gc-sections</code>, hoặc thêm <code>-Wl,--print-gc-sections</code> để ' +
           'trình liên kết in ra <b>từng section nó cắt</b>. Đọc danh sách đó một lần là đủ để ' +
           'không bao giờ dính lỗi này nữa.</p>' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 6,
      q: 'Bạn viết chương trình đầu tiên cho một board ARM64 <b>không có hệ điều hành và không ' +
         'có thư viện C</b>. Mã nguồn chỉ có <code>int main(void) { return 0; }</code>. Bạn dịch ' +
         'bằng <code>aarch64-linux-gnu-gcc -nostdlib</code> và nhận được cảnh báo bên dưới — ' +
         'file <b>vẫn được tạo ra</b>.<br><br>' +
         '(1) Vì sao lại thiếu <code>_start</code>, trong khi ở bài học nó luôn có sẵn? ' +
         '(2) Nếu cứ nạp file này lên board, chuyện gì xảy ra? ' +
         '(3) Liệt kê những việc bạn <b>phải tự viết</b> trong <code>_start</code>, ' +
         '<b>theo đúng thứ tự</b>, trước khi gọi được <code>main</code>.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'aarch64-linux-gnu-gcc -nostdlib -o bare-arm bare.c', nocopy: true, code:
          '/usr/bin/aarch64-linux-gnu-ld.bfd: warning: cannot find entry symbol _start; defaulting to 00000000000002b4' },
        { t: 'code', where: 'wsl', name: 'readelf -hW bare-arm | grep -E \'Machine:|Entry point\'', nocopy: true, code:
          '  Machine:                           AArch64\n' +
          '  Entry point address:               0x2b4' },
      ],
      crit: [
        '(1) Trả lời đúng: <code>_start</code> không đến từ trình biên dịch mà từ <code>crt1.o</code> của thư viện C — <code>-nostdlib</code> vừa bỏ đúng file đó đi',
        '(1) Nhận ra 0x2b4 là địa chỉ <b>bịa ra</b> để trình liên kết có cái mà ghi vào ELF header, không phải một hàm khởi động thật',
        '(2) Nói rõ nó vẫn "chạy" — CPU nhảy vào 0x2b4 và thực thi bất cứ byte nào ở đó; hỏng <b>im lặng</b>, không có thông báo lỗi nào',
        '(3) Nêu được ít nhất ba việc, đúng thứ tự: đặt con trỏ <b>ngăn xếp</b> trước tiên; chép <code>.data</code> từ flash sang RAM; điền 0 cho <code>.bss</code>; rồi mới gọi <code>main</code>',
        '(3) Nêu được việc phải làm sau khi <code>main</code> trả về: không được <code>return</code> vào hư không — phải có vòng lặp vô hạn hoặc reset',
        'Nói được vì sao ngăn xếp phải đứng đầu danh sách'
      ],
      sol: '<p><b>(1) <code>_start</code> chưa bao giờ do trình biên dịch sinh ra.</b> Nó nằm ' +
           'trong <code>crt1.o</code>, một file <code>.o</code> nhỏ thuộc thư viện C mà ' +
           '<code>gcc</code> vẫn <i>lặng lẽ</i> ghép vào mọi lần liên kết. Cờ ' +
           '<code>-nostdlib</code> bảo nó đừng ghép nữa — và thứ đầu tiên biến mất chính là ' +
           'điểm vào. Đây là lời khẳng định mạnh nhất cho ý ở câu B4: ' +
           '<code>_start</code> là <b>mã của thư viện C nằm trong file của bạn</b>, không phải ' +
           'dịch vụ của hệ điều hành.</p>' +
           '<p><b>Con số 0x2b4 là con số bịa.</b> ELF header <b>bắt buộc</b> phải có một trường ' +
           '<code>Entry point address</code>, nên khi không tìm thấy <code>_start</code>, ' +
           'trình liên kết điền đại địa chỉ đầu tiên của phần mã. Nó cảnh báo, rồi tạo file ' +
           'bình thường.</p>' +
           '<p><b>(2) Board sẽ chạy — và đó mới là điều tệ.</b> CPU không kiểm tra gì cả; nó ' +
           'nhảy tới 0x2b4 và thực thi bất kể byte nào nằm ở đó. Ngăn xếp chưa được đặt, ' +
           '<code>.bss</code> chứa rác từ lần cấp nguồn trước, <code>.data</code> vẫn còn nằm ' +
           'trong flash. Kết quả là treo, reset lặp, hoặc — tệ nhất — <b>chạy gần đúng</b> và ' +
           'sai ở đâu đó ba tuần sau. Không có <code>Segmentation fault</code> nào ở đây: bắt ' +
           'lỗi truy cập bộ nhớ là việc của MMU, mà bạn không có MMU.</p>' +
           '<p><b>(3) Những việc <code>_start</code> phải làm, đúng thứ tự:</b></p>' +
           '<ul>' +
           '<li><b>Đặt con trỏ ngăn xếp</b> (<code>sp</code>) tới đỉnh vùng RAM dành cho ngăn ' +
           'xếp. <b>Phải đứng đầu tiên</b>, vì mọi lời gọi hàm — kể cả hàm chép ' +
           '<code>.data</code> ở bước sau — đều cần ngăn xếp để lưu địa chỉ trở về. Bước này ' +
           'phải viết bằng assembly, vì C không chạy được khi chưa có ngăn xếp.</li>' +
           '<li><b>Chép <code>.data</code> từ flash sang RAM.</b> Biến toàn cục có khởi tạo phải ' +
           'nằm trong flash để sống sót qua lần mất điện, nhưng phải ghi được nên lúc chạy phải ' +
           'ở RAM. Linker script cấp cho bạn hai địa chỉ — nguồn trong flash và đích trong RAM ' +
           '— và bạn tự chép.</li>' +
           '<li><b>Điền 0 cho toàn bộ <code>.bss</code></b>, từ <code>__bss_start</code> tới ' +
           '<code>__bss_end</code>. Chính là việc nhân Linux làm hộ ở câu B1 — bây giờ không ai ' +
           'làm hộ nữa. Bỏ bước này thì biến toàn cục chưa khởi tạo mang giá trị rác, và ' +
           'chương trình chạy sai chỉ trong <i>một số</i> lần cấp nguồn.</li>' +
           '<li><b>Gọi <code>main</code></b> — bây giờ nó mới thật sự chỉ là một hàm bình ' +
           'thường.</li>' +
           '<li><b>Và không được để <code>main</code> trả về vào hư không.</b> Không có hệ điều ' +
           'hành để quay về; phải là <code>while (1) { }</code> hoặc một lệnh reset.</li>' +
           '</ul>' +
           '<p><b>Điểm cần rút ra.</b> Ba trong năm bước trên là ba việc mà trên Linux ' +
           '<i>nhân</i> hoặc <i>thư viện C</i> đã âm thầm làm cho bạn trong mọi chương trình ' +
           'bạn từng viết. Chúng không hề miễn phí — chúng chỉ được trả tiền ở chỗ khác. ' +
           'Chặng 06 và Chặng 07 sẽ cho bạn thấy đúng đoạn mã này trong U-Boot và trong nhân ' +
           'Linux.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Công ty bạn giao hai yêu cầu <b>mâu thuẫn nhau</b> cho cùng một sản phẩm:<br>' +
         '<b>(a)</b> Firmware gửi cho khách <b>không được chứa tên hàm và tên biến</b> — chống ' +
         'dịch ngược, và tiết kiệm flash.<br>' +
         '<b>(b)</b> Khi thiết bị ngoài hiện trường crash, khách gửi về một báo cáo chỉ có ' +
         '<b>địa chỉ</b> (ví dụ <code>PC = 0x080114a2</code>), và bạn phải chỉ ra được lỗi nằm ở ' +
         'hàm nào, dòng nào.<br><br>' +
         'Thiết kế quy trình build thoả mãn <b>cả hai</b>. Nêu rõ: bạn tạo ra ' +
         '<b>mấy file</b>, file nào gửi khách, file nào giữ lại, giữ ở đâu, và ' +
         '<b>ràng buộc bắt buộc</b> nào phải được tôn trọng để (b) hoạt động.',
      hint: '<code>strip</code> không sửa file gốc — nó tạo ra một file khác. Điều đó gợi ý ' +
            'ngay số file bạn cần.',
      crit: [
        'Nêu rõ có <b>hai</b> file (hoặc ba, nếu tách riêng file debug): bản đầy đủ giữ lại, bản đã <code>strip</code> gửi đi',
        'Nói rõ hai file phải sinh ra từ <b>cùng một lần build</b> — build lại có thể cho địa chỉ khác',
        'Nêu được cách tra ngược địa chỉ: <code>addr2line -e</code> trên bản chưa strip, hoặc <code>nm</code>/<code>objdump -d</code>',
        'Nhận ra phải dịch kèm <code>-g</code> mới có số dòng, và <code>-g</code> <b>không</b> làm ảnh chạy to lên vì thông tin debug không có cờ <code>A</code>',
        'Nêu được nơi lưu: kho artefact có phiên bản, gắn với đúng số hiệu phát hành trên nhãn thiết bị',
        'Cảnh báo đúng về PIE/ASLR hoặc về chênh lệch địa chỉ nạp: địa chỉ báo về phải quy đổi về địa chỉ trong file'
      ],
      sol: '<p><b>Hai yêu cầu chỉ mâu thuẫn nếu bạn tin rằng chỉ có một file.</b> ' +
           '<code>strip</code> không sửa file gốc mà tạo ra một file mới — nên lời giải là ' +
           'giữ cả hai.</p>' +
           '<p><b>Quy trình.</b></p>' +
           '<ul>' +
           '<li>Dịch <b>một lần</b>, có <code>-g</code>, ra <code>fw-v2.4.1.elf</code>. Cờ ' +
           '<code>-g</code> nhét các section <code>.debug_*</code> vào file, và ' +
           'chúng <b>không mang cờ <code>A</code></b> — không bao giờ được nạp, không tốn một ' +
           'byte RAM nào. Nó chỉ làm file <code>.elf</code> trên máy build to ra.</li>' +
           '<li><code>objcopy --only-keep-debug fw-v2.4.1.elf fw-v2.4.1.debug</code> rồi ' +
           '<code>strip</code> ra <code>fw-v2.4.1-release.elf</code>, và từ bản này mới sinh ' +
           'ảnh <code>.bin</code> nạp máy. Bản release không còn <code>.symtab</code> lẫn ' +
           '<code>.strtab</code>: <code>nm</code> trả lời <code>no symbols</code>, ' +
           '<code>objdump -d</code> chỉ còn nhãn <code>&lt;.text&gt;:</code>.</li>' +
           '<li>Đẩy <code>fw-v2.4.1.elf</code> và <code>fw-v2.4.1.debug</code> lên kho artefact, ' +
           'gắn nhãn <b>đúng chuỗi phiên bản in trên thiết bị</b>.</li>' +
           '</ul>' +
           '<p><b>Khi có báo cáo crash:</b> ' +
           '<code>addr2line -e fw-v2.4.1.elf -f -C 0x080114a2</code> → tên hàm và ' +
           '<code>file.c:dòng</code>. Địa chỉ vẫn nằm trong ảnh gửi cho khách, còn cái tên thì ' +
           'chỉ nằm trên máy bạn.</p>' +
           '<p><b>Ràng buộc bắt buộc — và đây là chỗ mọi người trượt:</b></p>' +
           '<ul>' +
           '<li><b>Cùng một lần build.</b> Dịch lại từ cùng mã nguồn <i>không</i> bảo đảm cùng ' +
           'địa chỉ: đổi phiên bản trình biên dịch, đổi thứ tự file <code>.o</code>, hay chỉ ' +
           'một macro <code>__DATE__</code> cũng đủ làm mọi thứ xê dịch. Bản chưa strip phải ' +
           'được <b>lưu lại</b>, không được <b>dựng lại</b>.</li>' +
           '<li><b>Phải khớp phiên bản.</b> Tra một địa chỉ v2.4.1 trên file v2.4.2 vẫn ra một ' +
           'cái tên — chỉ là <b>tên sai</b>, và không có gì báo cho bạn biết. Đây là kiểu sai ' +
           'im lặng đắt nhất trong cả quy trình.</li>' +
           '<li><b>Phải quy đổi địa chỉ.</b> Trên bare-metal thì địa chỉ trong ELF là địa chỉ ' +
           'thật, tra thẳng được. Trên Linux với PIE (câu B6), địa chỉ lúc chạy = địa chỉ nạp + ' +
           'độ lệch, nên phải trừ đi địa chỉ gốc của vùng nhớ trước khi tra.</li>' +
           '</ul>' +
           '<p><b>Về yêu cầu (a).</b> Nói thẳng với người đề xuất: <code>strip</code> ' +
           '<b>không</b> làm ảnh chạy nhỏ đi — <code>.symtab</code> vốn không có cờ ' +
           '<code>A</code> nên chưa bao giờ được nạp. Nó chỉ làm file <code>.elf</code> nhỏ ' +
           'đi. Và nó cũng không xoá được chuỗi ký tự trong <code>.rodata</code>: ' +
           '<code>strings</code> vẫn đọc ra mọi thông báo lỗi trong firmware của bạn.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 7,
      q: 'Board của bạn có <b>256 KB flash</b> và <b>384 KB RAM</b> (1 KB = 1024 byte). ' +
         '<code>size</code> trên firmware hiện tại cho ra bảng dưới; ngoài ra ' +
         '<code>.symtab</code> + <code>.strtab</code> + <code>.debug_*</code> cộng lại ' +
         '<b>310 KB</b> nữa trong file <code>.elf</code>. Đặc tả yêu cầu chừa tối thiểu ' +
         '<b>64 KB</b> RAM cho ngăn xếp và heap.<br><br>' +
         'Tính <b>hai</b> con số: (1) firmware chiếm bao nhiêu <b>flash</b>, (2) chiếm bao nhiêu ' +
         '<b>RAM</b> lúc chạy. Rồi trả lời: sản phẩm này có xuất xưởng được không? Nếu phải cắt, ' +
         'bạn cắt cái gì, và <b>vì sao cắt cái đó chứ không phải cái kia</b>?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'size firmware.elf (giá trị byte)', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          ' 143360\t  18432\t 317440\t 479232\t  75000\tfirmware.elf' },
      ],
      hint: '143360 = 140 KB, 18432 = 18 KB, 317440 = 310 KB. Một trong ba con số này ' +
            'được tính <b>hai lần</b> — và đúng một con số <b>không</b> được tính vào flash.',
      crit: [
        'Flash = text + data = 140 + 18 = <b>158 KB</b> (còn dư 98 KB trên 256 KB)',
        'Nêu đúng lý do <code>.data</code> phải nằm trong flash <b>và</b> trong RAM: giá trị khởi tạo phải sống sót qua mất điện, nhưng lúc chạy phải ghi được',
        'Nêu đúng lý do <code>.bss</code> <b>không</b> tính vào flash: <code>NOBITS</code>, không có byte nào để ghi',
        'RAM = data + bss = 18 + 310 = <b>328 KB</b>',
        'Kết luận đúng: 328 + 64 = 392 KB > 384 KB — <b>thiếu 8 KB</b>, không xuất xưởng được',
        'Chỉ đúng chỗ phải cắt: <code>.bss</code> (310 KB), tức cấp phát tĩnh — vì đó là cột duy nhất đủ lớn để cắt có ý nghĩa',
        'Bác bỏ đúng phương án sai: <code>strip</code> / bỏ <code>-g</code> tiết kiệm 310 KB <b>trên đĩa máy build</b> nhưng <b>0 byte</b> flash và <b>0 byte</b> RAM'
      ],
      sol: '<p><b>(1) Flash = 140 + 18 = <b>158 KB</b>.</b> Trên tổng 256 KB, còn dư 98 KB. ' +
           'Flash chứa <code>.text</code> (mã) và <code>.data</code> (giá trị khởi tạo). ' +
           '<code>.bss</code> <b>không</b> có mặt: nó là <code>NOBITS</code>, không có byte nào ' +
           'để nạp. Và 310 KB thông tin gỡ lỗi cũng không có mặt — chúng nằm trong file ' +
           '<code>.elf</code> trên máy build, không nằm trong ảnh <code>.bin</code>.</p>' +
           '<p><b>(2) RAM = 18 + 310 = <b>328 KB</b>.</b> ' +
           '<code>.data</code> bị tính <b>hai lần</b>, và đây là chỗ dễ sai nhất trong cả bài: ' +
           'nó chiếm 18 KB flash (để giá trị khởi tạo sống sót qua mất điện) <i>và</i> 18 KB ' +
           'RAM (vì lúc chạy nó phải ghi được). Mã khởi động chép nó từ chỗ này sang chỗ kia — ' +
           'đúng bước thứ hai trong danh sách ở câu C3.</p>' +
           '<p><b>Kết luận: không xuất xưởng được.</b> 328 + 64 = <b>392 KB</b> trên 384 KB ' +
           'RAM — <b>thiếu 8 KB</b>. Đáng chú ý: flash còn dư 98 KB, tức là nếu chỉ nhìn "ảnh ' +
           'có vừa flash không" thì mọi thứ trông rất ổn. Ràng buộc thật nằm ở chỗ khác.</p>' +
           '<p><b>Cắt cái gì.</b> <code>.bss</code> chiếm <b>94 %</b> nhu cầu RAM (310 trên ' +
           '328 KB), nên đó là chỗ duy nhất có gì để cắt. Chạy ' +
           '<code>nm --size-sort -S firmware.elf | tail -n 20</code> để xem hai mươi biến to ' +
           'nhất; trong firmware thực tế, thủ phạm gần như luôn là một vài bộ đệm cấp phát tĩnh ' +
           'quá tay. Cắt một bộ đệm 8 KB xuống 4 KB là đủ qua ngưỡng; cắt bốn cái thì có biên ' +
           'an toàn.</p>' +
           '<p><b>Vì sao không cắt cái kia.</b></p>' +
           '<ul>' +
           '<li><b><code>strip</code> hoặc bỏ <code>-g</code></b>: xoá đúng 310 KB… <b>trên ổ ' +
           'đĩa máy build</b>. Flash không đổi một byte, RAM không đổi một byte, vì các section ' +
           'đó chưa bao giờ có cờ <code>A</code>. Đây là phương án ai cũng đề xuất đầu tiên vì ' +
           'con số 310 KB trùng khớp một cách quyến rũ với con số 310 KB của ' +
           '<code>.bss</code> — và nó tiết kiệm được <b>đúng 0 byte</b> thứ bạn đang thiếu.</li>' +
           '<li><b>Tối ưu <code>.text</code></b> bằng <code>-Os</code> hay ' +
           '<code>--gc-sections</code>: có thật, nhưng nhắm sai chỗ. Cắt được 20 % ' +
           '<code>.text</code> là 28 KB <i>flash</i> — thứ bạn đang thừa 98 KB. RAM chỉ giảm ' +
           '0 byte.</li>' +
           '<li><b>Cắt <code>.data</code></b>: chỉ có 18 KB để cắt, và cắt nó thì thường chỉ ' +
           'đẩy biến sang <code>.bss</code> — RAM y nguyên.</li>' +
           '</ul>' +
           '<p><b>Nguyên tắc mang đi.</b> Trước khi tối ưu, hãy hỏi <b>tài nguyên nào đang ' +
           'thiếu</b>, rồi mới hỏi cột nào của <code>size</code> tương ứng với tài nguyên đó. ' +
           'Flash = <code>text</code> + <code>data</code>. RAM = <code>data</code> + ' +
           '<code>bss</code>. Kích thước file <code>.elf</code> = <b>không tương ứng với tài ' +
           'nguyên nào trên board cả</b>.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về BÀI CŨ mà bài 18 đứng lên trên ═══
     Bài 15 (bốn giai đoạn biên dịch), 16 (make), 17 (thư viện tĩnh/động).
     Không câu nào mang trục: đây là chống quên, không phải xoáy. */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 15 — Bốn giai đoạn biên dịch.</b> Trong bốn giai đoạn, ' +
         '<code>.text</code> và <code>.data</code> lần đầu tồn tại như <b>section ELF thật ' +
         'sự</b> (có kiểu, có cờ, có kích thước trong bảng section) ở giai đoạn nào?',
      opts: [
        'Tiền xử lý (<code>gcc -E</code>) — vì đó là lúc mọi <code>#include</code> được gộp lại',
        'Biên dịch ra assembly (<code>gcc -S</code>) — vì file <code>.s</code> đã có dòng <code>.text</code> và <code>.data</code>',
        'Hợp dịch (<code>gcc -c</code>, ra file <code>.o</code>)',
        'Liên kết (<code>gcc</code> ra file chạy được) — vì trước đó chưa có địa chỉ nào'
      ],
      a: 2,
      why: 'File <code>.s</code> <b>có</b> viết <code>.text</code> và <code>.data</code>, nên ' +
           'phương án B rất dễ chọn — nhưng đó là <b>chỉ thị</b> cho trình hợp dịch, tức là ' +
           'văn bản thuần, không phải section. Trình hợp dịch mới là kẻ biến chúng thành cấu ' +
           'trúc nhị phân: file <code>.o</code> đã là ELF đầy đủ, có bảng section, có cờ ' +
           '<code>AX</code>/<code>WA</code>, có <code>.symtab</code>. ' +
           'Phương án D sai vì nhầm <b>section</b> với <b>địa chỉ cuối cùng</b> — file ' +
           '<code>.o</code> có đủ section nhưng mọi địa chỉ đều là 0, và nó cũng không có một ' +
           'program header nào (câu B3). Trình liên kết chỉ <b>gộp và đánh địa chỉ</b> những ' +
           'section đã có sẵn.' },

    { id: 'd2', k: 'multi', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 17 — Thư viện tĩnh và động.</b> Chọn <b>tất cả</b> phát biểu đúng.',
      opts: [
        'Một chương trình liên kết tĩnh hoàn toàn thì <b>không có</b> section <code>.interp</code>',
        '<code>ldd</code> chạy trên chương trình liên kết tĩnh sẽ báo <code>not a dynamic executable</code>',
        'Một thư viện dùng chung <code>.so</code> cũng là file ELF, và <code>readelf -h</code> báo <code>Type: DYN</code>',
        'Liên kết tĩnh chép <b>toàn bộ</b> nội dung file <code>.a</code> vào chương trình',
        'Vá một lỗ hổng bảo mật trong <code>libc</code> rồi cài lại gói sẽ tự động sửa cả những chương trình đã liên kết <b>tĩnh</b> với nó'
      ],
      a: [0, 1, 2],
      why: '<b>A đúng</b> — <code>.interp</code> chỉ chứa đường dẫn tới trình thông dịch động; ' +
           'không cần <code>ld.so</code> thì không cần section đó, và ' +
           '<code>readelf -x .interp</code> sẽ báo <i>does not exist</i>. Đây là cách nhanh ' +
           'nhất để xác nhận một file đã tĩnh hoàn toàn. ' +
           '<b>B đúng</b>, và là cách kiểm tra thứ hai, độc lập với cách trên. ' +
           '<b>C đúng</b> — và đó chính là lý do câu B6 nói <code>DYN</code> được dùng cho ' +
           '<i>cả</i> thư viện động lẫn PIE: cùng một yêu cầu "nạp ở địa chỉ nào cũng chạy". ' +
           '<b>D sai</b>: file <code>.a</code> chỉ là một cái túi chứa nhiều file ' +
           '<code>.o</code>, và trình liên kết chỉ lấy <b>những <code>.o</code> nào thật sự ' +
           'cần</b> — đó là lý do liên kết tĩnh không phình to bằng kích thước thư viện. ' +
           '<b>E sai</b>, và đây là cái giá thật của liên kết tĩnh: mã libc đã <b>nằm sẵn ' +
           'trong file của bạn</b> từ lúc build, nên vá gói không đụng tới nó. Phải build lại ' +
           'và nạp lại toàn bộ firmware — một cân nhắc lớn với thiết bị đã bán ra.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 16 — Make và Makefile.</b> Makefile dưới đây không sinh phụ thuộc tự động. ' +
         'Bạn <b>chỉ</b> sửa <code>config.h</code> (được cả hai file <code>.c</code> ' +
         '<code>#include</code>), rồi gõ <code>make</code>. Chuyện gì xảy ra?',
      blocks: [
        { t: 'code', where: 'file', name: 'Makefile', lang: 'text', code:
          'prog: main.o util.o\n' +
          '\tgcc -o prog main.o util.o\n' +
          '\n' +
          '%.o: %.c\n' +
          '\tgcc -c -o $@ $<' },
      ],
      opts: [
        'Dịch lại cả <code>main.o</code> lẫn <code>util.o</code>, rồi liên kết lại',
        'Chỉ liên kết lại, không dịch lại file <code>.o</code> nào',
        'Không làm gì cả — <code>make</code> báo <code>\'prog\' is up to date.</code>',
        'Báo lỗi vì <code>config.h</code> không có luật nào sinh ra nó'
      ],
      a: 2,
      why: '<code>make</code> chỉ biết đúng những phụ thuộc bạn <b>viết ra</b>. Ở đây luật ' +
           '<code>%.o: %.c</code> nói rằng <code>main.o</code> phụ thuộc ' +
           '<code>main.c</code> — <b>hết</b>. <code>config.h</code> không xuất hiện trong đồ ' +
           'thị phụ thuộc, nên sửa nó cũng như không: cả hai <code>.o</code> vẫn mới hơn ' +
           '<code>.c</code> của chúng, <code>prog</code> vẫn mới hơn cả hai <code>.o</code>, ' +
           'và <code>make</code> tuyên bố mọi thứ đã cập nhật. ' +
           '<b>Đây là kiểu lỗi tệ nhất</b>: không có thông báo, chương trình vẫn chạy, chỉ là ' +
           'nó chạy bằng định nghĩa cũ của <code>config.h</code>. Cách sửa là ' +
           '<code>-MMD -MP</code> để trình biên dịch tự sinh file <code>.d</code> liệt kê mọi ' +
           'header, rồi <code>-include $(OBJ:.o=.d)</code> trong Makefile. Đó cũng là lý do ' +
           '"khi bí thì <code>make clean</code>" là một mẹo phổ biến — nó che giấu đúng lỗi ' +
           'này.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══
     Mọi transcript trong phần này đã chạy thật trên WSL2 Ubuntu 26.04, gcc 15.2.0,
     binutils 2.46, ngày 25/08/2026. Người học sẽ ra ĐÚNG những con số này nếu dùng
     cùng mã nguồn. Số cụ thể có thể lệch vài byte với phiên bản gcc khác — điều phải
     giữ nguyên là các QUAN HỆ giữa các con số, và đó mới là thứ được chấm. */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Tạo <code>probe.c</code> đúng như bên dưới, dịch bằng ' +
         '<code>gcc -Wall -o probe probe.c</code>, chạy <code>size probe</code> và ' +
         '<code>ls -l probe</code>. Sau đó chép thành <code>probe2.c</code> và ' +
         '<b>xoá bộ khởi tạo</b> của <code>table</code> — đổi ' +
         '<code>char table[1024] = { 1 };</code> thành <code>char table[1024];</code> — rồi ' +
         'dịch và đo lại.<br><br>' +
         '<b>Viết dự đoán ra trước khi chạy lệnh thứ hai.</b> Dự đoán bốn con số của ' +
         '<code>probe2</code>: cột <code>text</code>, cột <code>data</code>, cột ' +
         '<code>bss</code>, và kích thước file. Sau khi chạy, đối chiếu — rồi giải thích ' +
         '<b>chỗ mà dự đoán của bạn lệch</b>.',
      blocks: [
        { t: 'code', where: 'file', name: 'probe.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '\n' +
          'static char log_buf[4096];        /* uninitialised, file scope */\n' +
          'char table[1024] = { 1 };         /* initialised */\n' +
          'const char version[] = "v1.0";    /* read only */\n' +
          'int counter;                      /* uninitialised */\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("%s %d\\n", version, counter + table[0] + log_buf[0]);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', name: 'kết quả của probe, để bạn có mốc so sánh', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1421\t   1640\t   4160\t   7221\t   1c35\tprobe\n' +
          '17120 probe' },
      ],
      crit: [
        'Dự đoán <code>text</code> <b>không đổi</b> (1421) — chỉ dữ liệu thay đổi chỗ ở, mã không đổi',
        'Dự đoán <code>data</code> <b>giảm</b> khoảng 1024 và <code>bss</code> <b>tăng</b> khoảng 1024',
        'Dự đoán kích thước file <b>giảm</b> khoảng 1024, không phải giữ nguyên',
        'Đo được số thật: 1421 / <b>600</b> / <b>5184</b> / <b>16080</b>',
        'Phát hiện chỗ lệch: <code>data</code> giảm <b>1040</b> nhưng <code>bss</code> chỉ tăng <b>1024</b> — hai con số này KHÔNG bằng nhau',
        'Giải thích được 16 byte chênh: đó là phần đệm căn lề đi kèm mảng (<code>Al</code> = 32), biến mất cùng nó',
        'Nhận ra file giảm đúng <b>1040</b>, khớp với mức giảm của <code>data</code> chứ không khớp với mức tăng của <code>bss</code>'
      ],
      sol: '<p><b>Số thật:</b></p>' +
           '<pre><code>   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
           '   1421\t    600\t   5184\t   7205\t   1c25\tprobe2\n' +
           '16080 probe2</code></pre>' +
           '<p><b>Ba dự đoán dễ nhất đều đúng.</b> <code>text</code> đứng yên ở 1 421: bạn ' +
           'không đổi một dòng mã nào, chỉ đổi <i>chỗ ở</i> của một mảng. ' +
           '<code>data</code> tụt, <code>bss</code> phình, file nhỏ đi. Cơ chế đúng như câu A1: ' +
           'mảng có bộ khởi tạo phải nằm trong file để mang theo giá trị; mảng không có bộ khởi ' +
           'tạo chỉ cần một con số.</p>' +
           '<p><b>Nhưng con số thì không khớp — và đây mới là phần đáng học.</b> ' +
           '<code>data</code> giảm 1 640 − 600 = <b>1 040</b>. <code>bss</code> tăng ' +
           '5 184 − 4 160 = <b>1 024</b>. Chênh nhau <b>16 byte</b>. Nếu chỉ nghĩ "mảng chuyển ' +
           'từ cột này sang cột kia" thì hai số phải bằng nhau.</p>' +
           '<p><b>16 byte đó là phần đệm căn lề.</b> Xem bảng section của ' +
           '<code>probe</code>: <code>.data</code> có <code>Al 32</code> vì mảng 1 024 byte đòi ' +
           'căn theo 32 byte. <code>.data</code> bắt đầu ở 0x4000 với ' +
           '<code>__dso_handle</code> chiếm 8 byte, nên trình liên kết phải chèn 24 byte trống ' +
           'để đẩy mảng tới 0x4020: 8 + 24 + 1 024 = <b>1 056</b> = 0x420, đúng cột ' +
           '<code>Size</code> của <code>.data</code>. Khi mảng ra đi, phần đệm cũng ra đi theo ' +
           'nó, và <code>.data</code> co lại còn 16 byte. Mảng mang theo <b>nhiều hơn kích ' +
           'thước của chính nó</b>.</p>' +
           '<p><b>File giảm đúng 1 040</b>, khớp với <code>data</code> chứ không khớp với ' +
           '<code>bss</code> — thêm một lần khẳng định <code>.bss</code> không tồn tại trên ' +
           'đĩa.</p>' +
           '<p><b>Nếu số của bạn lệch vài byte</b> so với ở đây thì không sao: phiên bản gcc ' +
           'khác nhau xếp <code>.data</code> khác nhau. Ba quan hệ phải giữ nguyên là: ' +
           '<code>text</code> không đổi, mức giảm của <code>data</code> = mức giảm của file, ' +
           'và mức tăng của <code>bss</code> = đúng 1 024.</p>' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Vẫn với <code>probe</code> ở câu E1. Chạy ' +
         '<code>cp probe probe-stripped &amp;&amp; strip probe-stripped</code>, rồi đo lại.<br><br>' +
         '<b>Dự đoán trước bốn thứ</b>, sau đó chạy để đối chiếu: ' +
         '(1) <code>ls -l</code> của <code>probe-stripped</code>; ' +
         '(2) <code>size probe-stripped</code> — <b>ba cột có đổi không</b>; ' +
         '(3) <code>nm probe-stripped</code> in ra gì; ' +
         '(4) số section giảm từ 31 xuống bao nhiêu, và <b>section nào</b> biến mất.',
      hint: 'Trước khi đoán, hãy tự hỏi: những section mà <code>strip</code> cắt đi có cờ ' +
            '<code>A</code> không?',
      crit: [
        'Dự đoán đúng <b>hướng</b>: file nhỏ đi, nhưng ba cột của <code>size</code> <b>không đổi một byte nào</b>',
        'Số thật: 17 120 → <b>15 504</b>, giảm <b>1 616</b> byte',
        'Ba cột vẫn đúng 1421 / 1640 / 4160 — vì <code>strip</code> không đụng tới section nào có cờ <code>A</code>',
        '<code>nm</code> báo <code>nm: probe-stripped: no symbols</code>',
        'Số section 31 → <b>29</b>; hai section mất là <code>.symtab</code> và <code>.strtab</code>',
        'Kết luận đúng: <code>strip</code> tiết kiệm <b>đĩa</b> (hoặc flash chứa file ELF), <b>không</b> tiết kiệm RAM lúc chạy'
      ],
      sol: '<p><b>Số thật.</b> File: 17 120 → <b>15 504</b>, giảm <b>1 616</b> byte (9,4 %). ' +
           '<code>size</code>: <b>1421 / 1640 / 4160</b> — giống hệt bản chưa strip, không lệch ' +
           'một byte. <code>nm</code>: <code>nm: probe-stripped: no symbols</code>. Số section ' +
           'header: 31 → <b>29</b>, hai kẻ vắng mặt là <code>.symtab</code> và ' +
           '<code>.strtab</code>.</p>' +
           '<p><b>1 616 byte đó gồm những gì</b> — cộng lại vừa khít:</p>' +
           '<ul>' +
           '<li><code>.symtab</code> 960 byte và <code>.strtab</code> 507 byte — bảng ký hiệu ' +
           'và kho tên của nó;</li>' +
           '<li>hai dòng trong bảng section, 2 × 64 = 128 byte;</li>' +
           '<li>16 byte tên <code>.symtab\\0</code> và <code>.strtab\\0</code> trong ' +
           '<code>.shstrtab</code> (0x11a → 0x10a);</li>' +
           '<li>5 byte đệm căn lề không còn cần nữa.</li>' +
           '</ul>' +
           '<p>960 + 507 + 128 + 16 + 5 = <b>1 616</b>. Kiểm chứng độc lập: bảng section của ' +
           'bản đã strip bắt đầu ở byte 13 648, cộng 29 × 64 = 1 856, ra đúng <b>15 504</b> — ' +
           'kích thước file. Bảng section nằm ở tận cuối, đúng như câu B2 nói.</p>' +
           '<p><b>Vì sao <code>size</code> đứng yên</b> — và đây là điểm phải mang đi: ' +
           '<code>.symtab</code>, <code>.strtab</code> và <code>.shstrtab</code> đều ' +
           '<b>không có cờ <code>A</code></b>. Chúng chưa bao giờ được nạp vào bộ nhớ, nên xoá ' +
           'chúng không thay đổi một byte nào của bộ nhớ lúc chạy. <code>strip</code> ' +
           '<b>không</b> làm chương trình nhẹ hơn khi chạy; nó chỉ làm file nhỏ hơn.</p>' +
           '<p><b>Khi nào điều đó có giá trị thật.</b> Khi rootfs của bạn nằm trong flash và ' +
           '<i>bản thân file ELF</i> chiếm chỗ ở đó — một rootfs vài trăm binary có thể nhẹ đi ' +
           'hàng chục MB. Còn nếu bạn đang thiếu <b>RAM</b>, <code>strip</code> không giúp gì ' +
           'cả (câu C5).</p>' +
           '<p><b>Và nhớ giữ lại bản chưa strip</b> — đó là toàn bộ nội dung câu C4.</p>' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 4,
      q: 'Viết <b>hai lệnh</b> trả lời câu hỏi: <i>"lệnh đầu tiên mà CPU thực thi trong file ' +
         '<code>probe</code> nằm ở hàm nào?"</i> Lệnh thứ nhất lấy địa chỉ điểm vào từ ELF ' +
         'header; lệnh thứ hai tra xem <b>ký hiệu nào</b> nằm đúng ở địa chỉ đó. Không được ' +
         'đoán tên hàm rồi đi tìm nó — phải đi <b>từ địa chỉ ra tên</b>.',
      crit: [
        'Lệnh 1 dùng <code>readelf -h</code> (có thể kèm <code>grep</code>) và lấy ra <code>Entry point address</code>',
        'Lệnh 2 dùng <code>nm</code> (hoặc <code>objdump -d --start-address=</code>) và tra theo <b>địa chỉ</b>, không tra theo tên',
        'Kết quả đúng: điểm vào <code>0x1060</code>, ký hiệu ở đó là <code>_start</code>',
        'Nhận ra <code>main</code> nằm ở một địa chỉ khác (0x1149)',
        'Biết rằng cách này <b>không dùng được</b> trên file đã <code>strip</code>, và nói được vì sao'
      ],
      sol: '<pre><code>readelf -hW probe | grep \'Entry point\'\n' +
           'nm probe | grep -i \' 1060\'</code></pre>' +
           '<p>Kết quả:</p>' +
           '<pre><code>  Entry point address:               0x1060\n' +
           '0000000000001060 T _start</code></pre>' +
           '<p><b>Vì sao phải đi từ địa chỉ ra tên.</b> Nếu bạn gõ ' +
           '<code>nm probe | grep _start</code> thì bạn đã <i>giả định</i> đáp án rồi mới đi ' +
           'tìm bằng chứng cho nó. Cách trên thì ngược lại: ELF header nói một con số, và bạn ' +
           'hỏi xem con số đó là ai. Trên một binary lạ — firmware của nhà cung cấp, một ' +
           'bootloader — bạn không có sẵn cái tên để mà đoán, nên đây là cách duy nhất dùng ' +
           'được.</p>' +
           '<p><b>Cách khác, không cần <code>nm</code>:</b> ' +
           '<code>objdump -d --start-address=0x1060 --stop-address=0x1080 probe</code> — dịch ' +
           'ngược thẳng từ điểm vào. Cách này vẫn chạy được trên file đã <code>strip</code>, ' +
           'chỉ khác là không còn nhãn tên hàm (nó in ' +
           '<code>&lt;.text&gt;:</code> thay vì <code>&lt;_start&gt;:</code>) — vì ' +
           '<code>.symtab</code> đã bị cắt ở câu E2. Mã máy thì vẫn còn nguyên; chỉ có tên là ' +
           'mất.</p>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Tạo <code>many.c</code> như bên dưới. Hãy dịch nó <b>hai lần</b> — một bản thường, ' +
         'một bản bật thu gom section — rồi dùng <b>hai công cụ khác nhau</b> để chứng minh ' +
         'ba hàm không được gọi đã thật sự biến mất: một công cụ <b>đo</b> (byte tiết kiệm ' +
         'được), một công cụ <b>chỉ tên</b> (hàm nào còn, hàm nào mất). Viết ra cả bốn lệnh.',
      blocks: [
        { t: 'code', where: 'file', name: 'many.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '\n' +
          'int helper_a(int x) { return x + 1; }\n' +
          'int helper_b(int x) { return x * 2; }\n' +
          'int helper_c(int x) { return x - 3; }\n' +
          'int helper_d(int x) { return x / 5; }\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("%d\\n", helper_a(41));\n' +
          '    return 0;\n' +
          '}' },
      ],
      crit: [
        'Bản thu gom dùng đủ <b>ba</b> cờ: <code>-ffunction-sections -fdata-sections -Wl,--gc-sections</code>',
        'Nói được vì sao cần <code>-ffunction-sections</code>: không có nó thì cả bốn hàm nằm chung một section, cắt không được',
        'Công cụ đo: <code>size</code> — <code>text</code> 1603 → <b>1408</b>, tiết kiệm 195 byte',
        'Công cụ chỉ tên: <code>nm</code> — bản thường có đủ <code>helper_a</code>…<code>helper_d</code>, bản thu gom <b>không còn cái nào</b>',
        'Nhận ra <code>helper_a</code> cũng biến mất dù <b>có</b> được gọi, và giải thích được: <code>-O2</code> đã nội tuyến nó'
      ],
      sol: '<pre><code>gcc -Wall -O2 -o many-plain many.c\n' +
           'gcc -Wall -O2 -ffunction-sections -fdata-sections -Wl,--gc-sections -o many-gc many.c\n' +
           'size many-plain many-gc\n' +
           'nm many-plain | grep helper_ ; nm many-gc | grep helper_</code></pre>' +
           '<p>Kết quả:</p>' +
           '<pre><code>   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
           '   1603\t    600\t      8\t   2211\t    8a3\tmany-plain\n' +
           '   1408\t    592\t      8\t   2008\t    7d8\tmany-gc\n' +
           '\n' +
           '0000000000001180 T helper_a\n' +
           '0000000000001190 T helper_b\n' +
           '00000000000011a0 T helper_c\n' +
           '00000000000011b0 T helper_d</code></pre>' +
           '<p>Lệnh <code>nm many-gc | grep helper_</code> <b>không in ra gì cả</b>. File: ' +
           '16 088 → 15 848 byte.</p>' +
           '<p><b>Vì sao cần <code>-ffunction-sections</code>.</b> Mặc định, trình biên dịch ' +
           'dồn <i>mọi</i> hàm vào chung section <code>.text</code>. ' +
           '<code>--gc-sections</code> cắt theo đơn vị <b>section</b>, nên với một section duy ' +
           'nhất nó chỉ có hai lựa chọn: giữ tất cả hoặc vứt tất cả. Cờ ' +
           '<code>-ffunction-sections</code> tách mỗi hàm ra ' +
           '<code>.text.helper_b</code>, <code>.text.main</code>… để trình liên kết cắt được ' +
           'từng cái. Đây cũng chính là cơ chế đã cắt nhầm bảng vector ở câu C2.</p>' +
           '<p><b>Chi tiết đáng chú ý: <code>helper_a</code> cũng biến mất.</b> Nó ' +
           '<i>được</i> gọi, đáng lẽ phải được giữ. Nhưng ở <code>-O2</code>, trình biên dịch ' +
           'đã <b>nội tuyến</b> phép <code>x + 1</code> thẳng vào <code>main</code>; bản ' +
           'ngoài dòng của hàm vẫn được sinh ra (vì nó có liên kết ngoài, biết đâu file khác ' +
           'gọi tới), nhưng trong chương trình này không còn ai tham chiếu tới nó nữa — nên ' +
           'trình liên kết vứt luôn. Đó là hai giai đoạn tối ưu hoàn toàn khác nhau, một ở ' +
           'trình biên dịch và một ở trình liên kết, cùng góp vào một con số cuối cùng.</p>' +
           '<p><b>195 byte cho bốn hàm tí hon</b> nghe không nhiều. Trên một rootfs nhúng thật ' +
           'với hàng nghìn hàm thư viện không dùng tới, cùng cơ chế này cắt được hàng chục ' +
           'phần trăm.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 5,
      q: 'Một đồng nghiệp viết script kiểm tra ngân sách flash trong CI. Nó chạy trơn tru, ' +
         'không báo lỗi bao giờ, và <b>luôn cho ra con số sai</b> — sai theo hướng nguy hiểm ' +
         'nhất có thể. Hãy chỉ ra dòng sai, giải thích <b>sai theo hướng nào</b> (báo thừa hay ' +
         'báo thiếu), và viết lại lệnh cho đúng.',
      blocks: [
        { t: 'code', where: 'file', name: 'check-flash.sh', lang: 'bash', code:
          '#!/bin/bash\n' +
          '# Fail the build if the firmware no longer fits in flash.\n' +
          'set -eu\n' +
          'FLASH_LIMIT=262144          # 256 KB\n' +
          '\n' +
          'used=$(size firmware.elf | tail -n 1 | awk \'{ print $4 }\')\n' +
          '\n' +
          'if [ "$used" -gt "$FLASH_LIMIT" ]; then\n' +
          '    echo "FAIL: firmware uses $used bytes of $FLASH_LIMIT"\n' +
          '    exit 1\n' +
          'fi\n' +
          'echo "OK: $used bytes"' },
      ],
      hint: 'Cột thứ tư của <code>size</code> tên là <code>dec</code>. Nó là tổng của ' +
            '<b>mấy</b> cột?',
      crit: [
        'Chỉ đúng dòng sai: <code>awk \'{ print $4 }\'</code> lấy cột <code>dec</code>',
        'Nói rõ <code>dec</code> = text + data + <b>bss</b>, mà <code>.bss</code> không chiếm byte flash nào',
        'Xác định đúng hướng sai: script <b>báo thừa</b>, tức là làm hỏng build đáng lẽ chạy được',
        'Nêu được vì sao đó là hướng nguy hiểm: một con số sai mà <i>không ai nghi ngờ</i>, và nó dạy cả nhóm phản xạ nới <code>FLASH_LIMIT</code> lên',
        'Sửa đúng: <code>awk \'{ print $1 + $2 }\'</code>',
        'Kiểm chứng bằng con số cụ thể trên <code>probe</code>: <code>dec</code> = 7 221 nhưng flash thật = 1421 + 1640 = <b>3 061</b>'
      ],
      sol: '<p><b>Dòng sai:</b> <code>awk \'{ print $4 }\'</code>. Cột thứ tư của ' +
           '<code>size</code> là <code>dec</code>, và <code>dec</code> = ' +
           '<code>text</code> + <code>data</code> + <b><code>bss</code></b>. Nhưng ' +
           '<code>.bss</code> có kiểu <code>NOBITS</code>: nó <b>không chiếm một byte flash ' +
           'nào</b>. Script đang cộng bộ nhớ lúc chạy vào ngân sách lưu trữ.</p>' +
           '<p><b>Sửa:</b></p>' +
           '<pre><code>used=$(size firmware.elf | tail -n 1 | awk \'{ print $1 + $2 }\')</code></pre>' +
           '<p><b>Kiểm chứng ngay trên <code>probe</code>:</b> script cũ báo <b>7 221</b> byte, ' +
           'script mới báo <b>3 061</b> byte. Sai lệch <b>2,4 lần</b> — và với một firmware ' +
           'thật, nơi <code>.bss</code> thường lớn hơn <code>.text</code>, tỉ lệ đó còn tệ ' +
           'hơn.</p>' +
           '<p><b>Sai theo hướng nào, và vì sao đó là hướng nguy hiểm.</b> Script ' +
           '<b>báo thừa</b>: nó làm hỏng những bản build hoàn toàn vừa flash. Nghe thì có vẻ ' +
           '"an toàn" — thà chặt còn hơn lỏng. Nhưng hậu quả thật là thế này: một ngày nào đó ' +
           'CI đỏ với thông báo "dùng 270 KB trên 256 KB", cả nhóm nhìn con số, tin nó, và ' +
           '<b>nới <code>FLASH_LIMIT</code> lên</b> cho qua. Từ giây phút đó cái chốt an toàn ' +
           'không còn ý nghĩa gì nữa, và không ai biết ngân sách flash thật đang ở đâu. Một ' +
           'phép đo sai <i>không bao giờ báo lỗi</i> thì nguy hiểm hơn một phép đo không tồn ' +
           'tại, vì nó được tin.</p>' +
           '<p><b>Nên làm thêm.</b> Kiểm tra flash và kiểm tra RAM là <b>hai</b> ngưỡng khác ' +
           'nhau (câu C5): flash = <code>$1 + $2</code>, RAM = <code>$2 + $3</code>. Script này ' +
           'chỉ có một, và cái nó thiếu — RAM — lại đúng là cái đã giết thiết bị ở câu C1.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: '<b>Câu này được phép chưa giải xong.</b> U-Boot và nhân Linux không nạp file ELF ' +
         'lên board — chúng nạp một <b>ảnh nhị phân thô</b>, không header, không bảng section: ' +
         'đúng những byte sẽ nằm trong bộ nhớ. Lệnh tạo ra nó là ' +
         '<code>objcopy -O binary</code>. Hãy chạy nó trên <code>probe</code> rồi giải thích ' +
         'con số bạn nhận được.<br><br>' +
         'Cụ thể: <code>size</code> nói text + data chỉ có <b>3 061</b> byte. Vậy vì sao ảnh ' +
         'thô lại là <b>16 592</b> byte — gấp hơn năm lần? Và vì sao nó vẫn ' +
         '<b>nhỏ hơn</b> file ELF gốc (17 120)?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'objcopy -O binary probe probe.bin ; ls -l probe.bin', nocopy: true, code:
          '16592 probe.bin' },
        { t: 'code', where: 'wsl', name: 'hai địa chỉ đáng để ý (readelf -SW probe)', nocopy: true, code:
          '  [ 1] .note.gnu.build-id NOTE    0000000000000350 000350 000024 00   A  0   0  4\n' +
          '  [25] .data              PROGBITS 0000000000004000 003000 000420 00  WA  0   0 32' },
      ],
      hint: 'Ảnh thô là một dải byte <b>liên tục</b> theo địa chỉ bộ nhớ. Thử lấy địa chỉ kết ' +
            'thúc của <code>.data</code> trừ đi địa chỉ bắt đầu của section được nạp đầu tiên.',
      crit: [
        'Chạy được lệnh và ra con số 16 592 (hoặc rất gần)',
        'Tính đúng: <code>.data</code> kết thúc ở 0x4000 + 0x420 = <b>0x4420</b>; section được nạp đầu tiên bắt đầu ở <b>0x350</b>; 0x4420 − 0x350 = <b>16 592</b>',
        'Giải thích đúng nguyên nhân phình: ảnh thô phải <b>đệm đầy khoảng trống</b> giữa các vùng địa chỉ, vì nó là dải byte liên tục',
        'Giải thích được vì sao vẫn nhỏ hơn ELF: mọi thứ không được nạp (bảng section, <code>.symtab</code>, <code>.strtab</code>, header) đều bị bỏ',
        'Nhận ra <code>.bss</code> <b>không</b> có trong ảnh thô, dù nó nằm sau <code>.data</code> về địa chỉ',
        'Nêu được hệ quả thực tế: một section đặt ở địa chỉ rất cao sẽ tạo ra ảnh <code>.bin</code> khổng lồ toàn số 0'
      ],
      sol: '<p><b>Phép tính.</b> Section được nạp đầu tiên là ' +
           '<code>.note.gnu.build-id</code> ở địa chỉ <b>0x350</b>. Nội dung được nạp cuối cùng ' +
           'là <code>.data</code>, kết thúc ở 0x4000 + 0x420 = <b>0x4420</b>. ' +
           '0x4420 − 0x350 = 17 440 − 848 = <b>16 592</b>. Khớp chính xác.</p>' +
           '<p><b>Vì sao phình so với 3 061 byte.</b> Ảnh thô không có cách nào nói "nhảy tới ' +
           'địa chỉ 0x4000" — nó <i>là</i> bộ nhớ, một dải byte liên tục. Mọi khoảng trống giữa ' +
           'các vùng được nạp đều phải <b>đệm bằng số 0</b>: khoảng trống căn trang giữa các ' +
           'segment (câu B2), khoảng cách từ cuối mã ở 0x11a1 tới <code>.rodata</code> ở ' +
           '0x2000, và cứ thế. File ELF không cần đệm vì mỗi section mang theo địa chỉ đích ' +
           'của mình; ảnh thô thì phải trả tiền cho từng byte trống một.</p>' +
           '<p><b>Vì sao vẫn nhỏ hơn ELF.</b> Vì nó vứt <i>toàn bộ</i> phần không được nạp: ' +
           'ELF header, bảng program header, bảng section (1 984 byte), <code>.symtab</code>, ' +
           '<code>.strtab</code>, <code>.shstrtab</code>, <code>.comment</code>. Đúng những ' +
           'thứ câu B2 đã đếm. Ảnh thô chỉ giữ những gì thật sự vào bộ nhớ.</p>' +
           '<p><b>Và <code>.bss</code> không có mặt</b>, dù về địa chỉ nó nằm ngay sau ' +
           '<code>.data</code>. <code>objcopy</code> bỏ qua <code>NOBITS</code> vì không có gì ' +
           'để chép. Trên bare-metal, hệ quả trực tiếp là: mã khởi động của bạn ' +
           '<b>phải</b> tự điền 0 cho nó (câu C3) — ảnh nạp vào flash không mang theo những số ' +
           '0 đó.</p>' +
           '<p><b>Câu để ngỏ, dành cho Chặng 07.</b> Nếu một section bị đặt ở địa chỉ rất cao ' +
           '— chẳng hạn 0x80000000 trên một SoC — thì <code>objcopy -O binary</code> sẽ sinh ra ' +
           'một file <b>2 GB</b> toàn số 0. Đó là lý do quy trình build firmware thật gần như ' +
           'luôn dùng <code>--only-section</code> hoặc một linker script đặt mọi thứ liền ' +
           'nhau. Khi bạn build nhân ở Bài 40 và nhìn thấy ' +
           '<code>arch/arm64/boot/Image</code>, hãy nhớ lại câu này: đó chính là ' +
           '<code>vmlinux</code> sau khi đi qua đúng <code>objcopy -O binary</code>. Hãy thử ' +
           'đoán trước xem <code>Image</code> sẽ lớn hơn hay nhỏ hơn <code>vmlinux</code>, và ' +
           'giữ câu trả lời của bạn tới lúc đó.</p>' },
  ],

  /* ═══ F · Bảng chẩn đoán ═══
     Mọi slug dưới đây được tính bằng Render.slug() trên đúng chuỗi x của block h2,
     không gõ tay — xem §13.7. Hai slug bị .slice(0,60) cắt ngắn thì đã kiểm tra lại. */
  diag: [
    ['A1, B1, C1, E1',
     'Bạn còn nghĩ <code>.bss</code> tốn chỗ trong file, hoặc chưa tự tính được hiệu ' +
     '<code>MemSiz − FileSiz</code>. Đây là trục quan trọng nhất của cả bài — đọc lại tới khi ' +
     'giải thích được cho người khác mà không nhìn sách.',
     '<a href="#/bai-18#nobits-vi-sao-bss-khong-ton-mot-byte-nao-tren-dia">Đọc lại Bài 18 — <i>NOBITS: vì sao .bss không tốn một byte nào trên đĩa</i></a>'],

    ['A2, B3',
     'Bạn chưa tách được <b>hai bản đồ</b>: section là bản đồ của trình liên kết lúc build, ' +
     'segment là bản đồ của nhân lúc nạp. Đọc <b>cả hai</b> mục, liền nhau, rồi mở lại phần ' +
     '<code>Section to Segment mapping</code> trên máy mình.',
     '<a href="#/bai-18#section-ban-do-danh-cho-trinh-lien-ket">Đọc lại Bài 18 — <i>Section: bản đồ dành cho trình liên kết</i></a> và <a href="#/bai-18#segment-ban-do-danh-cho-kernel"><i>Segment: bản đồ dành cho kernel</i></a>'],

    ['C2, E4',
     'Bạn chưa nắm cách <code>--gc-sections</code> quyết định cái gì là rác — nó đi từ điểm ' +
     'vào theo tham chiếu ký hiệu, và <b>chỉ</b> nhìn bản đồ section.',
     '<a href="#/bai-18#cat-bot-strip-va-gc-sections">Đọc lại Bài 18 — <i>Cắt bớt: strip và --gc-sections</i></a>'],

    ['A3, B4, C3, E3',
     'Bạn vẫn tin chương trình bắt đầu ở <code>main</code>. Chú ý ba chữ cái ' +
     '<code>T</code>/<code>T</code>/<code>U</code> mà <code>nm</code> in ra, và ý nghĩa của ' +
     '<code>.init_array</code>.',
     '<a href="#/bai-18#chuong-trinh-khong-bat-dau-o-main">Đọc lại Bài 18 — <i>Chương trình không bắt đầu ở main</i></a>'],

    ['A4, B6',
     'Bạn chưa phân biệt được năm loại file ELF, hoặc chưa biết trường nào trong header quyết ' +
     'định file chạy được trên CPU nào. Đây là kiến thức nền cho toàn bộ phần cross-compile.',
     '<a href="#/bai-18#elf-mot-dinh-dang-cho-nam-loai-file-khac-nhau">Đọc lại Bài 18 — <i>ELF: một định dạng cho năm loại file khác nhau</i></a> và <a href="#/bai-18#elf-header-64-byte-dau-tien-chua-tam-ban-do"><i>ELF header: 64 byte đầu tiên</i></a>'],

    ['A5, A8, B5',
     'Bạn chưa đọc trôi cột <code>Flg</code>. Ba chữ <code>A</code>, <code>W</code>, ' +
     '<code>X</code> trả lời ba câu hỏi độc lập, và tổ hợp của chúng giải thích gần hết bảng ' +
     'section.',
     '<a href="#/bai-18#section-ban-do-danh-cho-trinh-lien-ket">Đọc lại Bài 18 — <i>Section: bản đồ dành cho trình liên kết</i></a>'],

    ['A6, C4, E2',
     'Bạn còn tưởng <code>strip</code> làm chương trình nhẹ hơn <b>lúc chạy</b>. Nó cắt đúng ' +
     'hai section, và cả hai đều không có cờ <code>A</code>.',
     '<a href="#/bai-18#cat-bot-strip-va-gc-sections">Đọc lại Bài 18 — <i>Cắt bớt: strip và --gc-sections</i></a>'],

    ['A7',
     'Bạn chưa thuộc bảng chữ cái của <code>nm</code>. Chỉ cần nhớ một quy tắc: ' +
     '<b>hoa = nhìn thấy từ ngoài file, thường = chỉ trong file này</b>; chữ cái nào thì cho ' +
     'biết section nào.',
     '<a href="#/bai-18#ky-hieu-moi-bien-nam-o-section-nao">Đọc lại Bài 18 — <i>Ký hiệu: mỗi biến nằm ở section nào</i></a>'],

    ['B2, C5, E5, E6',
     'Bạn chưa tách được ba con số khác nhau: <b>kích thước file</b>, <b>flash chiếm</b> và ' +
     '<b>RAM chiếm</b>. Ba con số này không bằng nhau và không suy ra được từ nhau. Làm lại ' +
     'phần mổ file từ đầu đến cuối, tự tay cộng từng section.',
     '<a href="#/bai-18#thuc-hanh-mo-mot-file-elf-tu-dau-den-cuoi">Đọc lại Bài 18 — <i>Thực hành: mổ một file ELF từ đầu đến cuối</i></a>'],

    ['Câu nào cũng thấy <code>readelf</code> báo lỗi lạ',
     'Phần lớn "lỗi" của <code>readelf</code> là <b>câu trả lời</b>, không phải thất bại — ' +
     '<code>has no data to dump</code> chính là bằng chứng cho trục thứ nhất.',
     '<a href="#/bai-18#loi-thuong-gap">Đọc lại Bài 18 — <i>Lỗi thường gặp</i></a>'],

    ['D1',
     'Bạn chưa phân biệt được chỉ thị <code>.text</code> trong file <code>.s</code> với ' +
     'section <code>.text</code> trong file <code>.o</code>. Dừng lại sau từng giai đoạn và ' +
     'mở từng file trung gian ra xem.',
     '<a href="#/bai-15#giai-doan-2-va-3-tu-c-xuong-assembly-roi-xuong-byte">Đọc lại Bài 15 — <i>Giai đoạn 2 và 3: từ C xuống assembly rồi xuống byte</i></a>'],

    ['D2',
     'Bạn chưa nắm cái giá thật của liên kết tĩnh, hoặc còn nghĩ <code>.a</code> được chép ' +
     'nguyên khối vào chương trình.',
     '<a href="#/bai-17#thu-vien-tinh-a-chi-la-mot-cai-tui-dung-o">Đọc lại Bài 17 — <i>Thư viện tĩnh .a: chỉ là một cái túi đựng .o</i></a>'],

    ['D3',
     'Bạn quên rằng <code>make</code> chỉ biết những phụ thuộc bạn viết ra. Đây là lỗi im lặng ' +
     'sẽ theo bạn suốt phần build kernel.',
     '<a href="#/bai-16#cai-bay-lon-nhat-phu-thuoc-header">Đọc lại Bài 16 — <i>Cái bẫy lớn nhất: phụ thuộc header</i></a>'],
  ],
});

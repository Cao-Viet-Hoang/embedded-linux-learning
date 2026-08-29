/* Bài tập 27 — Cross-compile chương trình đầu tiên cho ARM64
   Ghép với lessons/bai-27.js · Chặng 04 — Cross-compilation

   ════════════════════════════════════════════════════════════════════════════
   CHỌN TRỤC XOÁY — bảy bước của CLAUDE.md §13.4 (skill write-exercise)
   Ghi lại ở đây để một phiên sau audit được lựa chọn thay vì phải suy lại.
   ════════════════════════════════════════════════════════════════════════════

   ── BƯỚC 1 · KIỂM KÊ ─────────────────────────────────────────────────────────
   Nguồn: goals (7 mục), 12 heading h2/h3, 9 callout kind:'why', 3 cmdx,
   bảng Lỗi thường gặp (12 dòng), recap (11 mục), quiz (7 câu).

    1. Cùng một mã nguồn dịch được cho hai kiến trúc vì nó chỉ nói chuyện qua
       C chuẩn + POSIX, không nói thẳng với phần cứng
    2. e_machine 62 vs 183 là bằng chứng đọc được từ chính file
    3. Nhân từ chối nạp file lạ kiến trúc bằng ENOEXEC; bash trả 126
    4. qemu-user mô phỏng MỘT TIẾN TRÌNH, qemu-system mô phỏng CẢ MỘT MÁY
    5. Syscall của tiến trình được mô phỏng đi thẳng vào nhân của máy build,
       nên socket cổng 9006 là socket thật và nc bản x86 nối được
    6. binfmt_misc: luật magic → interpreter; 31 luật qemu-*; WSLInterop
    7. Đường dẫn trong .interp là đường dẫn TRÊN TARGET, máy build không có
    8. Ba lối ra khi thiếu trình thông dịch: -L, QEMU_LD_PREFIX, -static
    9. -L của qemu (lúc chạy) khác hẳn -L của trình liên kết (lúc dịch)
   10. Bốn con số kích thước; chênh lệch do đệm căn lề khác hẳn chênh lệch do
       nội dung, và size phân biệt được ngay
   11. max-page-size=4096 là một LỜI HỨA về nhân của board
   12. strip phải có tiền tố; bản native thất bại và trả mã thoát khác 0
   13. CROSS_COMPILE là tiền tố cho MỌI công cụ, không riêng CC
   14. Mỗi kiến trúc một thư mục build/ riêng, nếu không make bỏ qua
   15. 49 thư viện trong sysroot target so với 858 trên máy build
   16. Staging sysroot: sysroot thứ hai do người học làm chủ
   17. Kiểm chứng bằng phép tính có kết quả xác định (CRC-32 = 181eeda1)
   18. Một lần chạy xanh dưới qemu-user CHỨNG MINH ĐƯỢC GÌ và không chứng
       minh được gì (1,46× chỉ đúng cho qemu-user, mã thuần tính toán)
   19. Mã thoát 126 (bash từ chối exec) khác 255 (qemu tự thoát exit(-1))
   20. ldd trên file lạ kiến trúc nói dối: "not a dynamic executable"

   ── BƯỚC 2 · CHẤM ĐIỂM (phụ thuộc / giá của hiểu sai / phản trực giác) ──────

   | # | Ứng viên                                   | PT | GIÁ | PTG | Tổng |
   |---|--------------------------------------------|----|-----|-----|------|
   | 18| Chạy xanh dưới qemu-user chứng minh được gì|  2 |  2  |  2  |  6   |
   |  7| .interp giữ đường dẫn CỦA TARGET           |  2 |  2  |  2  |  6   |
   | 10| File to hơn ≠ nhiều mã hơn                 |  2 |  2  |  2  |  6   |
   | 13| CROSS_COMPILE phủ MỌI công cụ              |  2 |  2  |  2  |  6   |
   | 15| 49 so với 858 — sysroot target gần như rỗng|  2 |  2  |  1  |  5   |
   |  6| binfmt_misc khớp magic rồi trao cho QEMU   |  1 |  1  |  2  |  4   |
   | 20| ldd mù với file lạ kiến trúc               |  1 |  1  |  2  |  4   |
   | 14| make bỏ qua vì hai kiến trúc chung đích    |  1 |  2  |  1  |  4   |
   |  1| Mã nguồn không cần đổi                     |  1 |  1  |  1  |  3   |
   | 17| Kiểm bằng phép tính xác định               |  1 |  1  |  1  |  3   |
   | 11| max-page-size là một lời hứa               |  1 |  2  |  0  |  3   |
   |  4| qemu-user khác qemu-system                 |  1 |  1  |  1  |  3   |
   |  5| Syscall đi thẳng vào nhân máy build        |  1 |  1  |  1  |  3   |
   |  9| Hai chữ -L khác nghĩa                      |  0 |  1  |  1  |  2   |
   | 19| 126 khác 255                               |  0 |  1  |  1  |  2   |
   |  2| e_machine 62/183                           |  1 |  0  |  0  |  1   |
   |  3| ENOEXEC                                    |  0 |  0  |  1  |  1   |
   |  8| Ba lối ra                                  |  0 |  1  |  0  |  1   |
   | 12| strip phải có tiền tố                      |  0 |  1  |  1  |  2   |
   | 16| Staging sysroot                            |  1 |  1  |  0  |  2   |

   ── BƯỚC 3 · CẮT ────────────────────────────────────────────────────────────
   Đạt ngưỡng (tổng ≥ 4 và ≥ 2 trục ≥ 1): #18, #7, #10, #13, #15, #6, #20, #14.
   Tám ứng viên cho ba chỗ — phải dùng bước 4 để loại.

   ── BƯỚC 4 · LOẠI (đối chiếu §13.8 "Trục đã tiêu") ──────────────────────────
   · #6 binfmt_misc → LOẠI. bt-25 đã tiêu đúng ý này: "chạy được hay không là
     thuộc tính của hệ thống nạp nó, không phải của file — nhân tra binfmt_misc
     trước khi kết luận". Ở bộ này binfmt_misc chỉ được hỏi MỘT lần (A2).
   · #15 sysroot target gần như rỗng → LOẠI. bt-26 đã tiêu "trình biên dịch
     cross tìm header và thư viện trong cây thư mục của target". 49-so-với-858
     là con số minh hoạ cho đúng trục ấy. Ở bộ này nó thành một câu B (B6) và
     một câu C (C3), không thành trục.
   · #13 CROSS_COMPILE phủ mọi công cụ → LOẠI, dù 6 điểm. bt-26 đã tiêu
     "công cụ đọc vỏ ELF chạy được với mọi kiến trúc, công cụ giải mã lệnh thì
     không" — mà thất bại kinh điển của trục ấy chính là strip native. Xoáy
     tiếp ở đây là xoáy lần hai cùng một ý. Giữ lại làm B3 (Bắt lỗi phát biểu)
     và E5 (Sửa lỗi), là chỗ nó xứng đáng.
   · #20 ldd mù → giữ làm A4 và E2, không đủ tầm làm trục.
   · #14 make bỏ qua → giữ làm E5 phần hai; giá cao nhưng là một cái bẫy cụ
     thể của make, không phải nguyên lý của cross-compilation.

   ── BƯỚC 5 · BA TRỤC, MỖI TRỤC MỘT CÂU CÓ THỂ SAI ───────────────────────────
   T0 `emu`
     Một lần chạy xanh dưới qemu-user chỉ chứng minh MÃ LỆNH đúng: nó mượn
     nhân và hệ thống file của máy build, nên nó mù với mọi khác biệt thuộc
     về MÔI TRƯỜNG của board.
     Ranh giới với bt-03 (đã tiêu "hai họ QEMU giải hai bài toán khác nhau"):
     bt-03 hỏi PHẢI DÙNG CÁI NÀO. Đây hỏi MỘT KẾT QUẢ XANH CHỨNG MINH ĐƯỢC GÌ
     — một câu hỏi về giá trị của bằng chứng, không phải về phân loại công cụ.

   T1 `interp`
     Nhị phân cross mang trong nó những đường dẫn CỦA TARGET —
     .interp ghi /lib/ld-linux-aarch64.so.1, đúng trên board và sai trên máy
     build — và đó là chủ ý của trình biên dịch, không phải lỗi.
     Ranh giới với bt-17 (đã tiêu "người tìm lúc build và người tìm lúc chạy
     là hai hệ thống khác nhau"): bt-17 nói về hai bộ tìm kiếm trên CÙNG một
     máy. Đây nói về một chuỗi ký tự trỏ vào một hệ thống file CHƯA TỒN TẠI.
     Ranh giới với bt-26 `sysroot`: bt-26 là nơi TRÌNH BIÊN DỊCH tìm lúc dịch;
     đây là thứ NHỊ PHÂN mang theo và cần lúc chạy.

   T2 `padding`
     File to hơn không có nghĩa là nhiều mã hơn. Khi text/data/bss của hai bản
     build giống hệt nhau thì toàn bộ chênh lệch kích thước là phần đệm căn lề
     — nó tốn flash nhưng không tốn thêm RAM lúc chạy.
     Ranh giới với bt-18 (đã tiêu ".bss chiếm RAM nhưng không chiếm byte nào
     trong file" và "section và segment là hai bản đồ độc lập"): bt-18 mổ MỘT
     file. Đây SO HAI BẢN BUILD và hỏi phép so sánh nào là phép so sánh lương
     thiện.

   ── BƯỚC 6 · NGỘ NHẬN ĐỐI LẬP ───────────────────────────────────────────────
   T0: "Nó chạy đúng dưới QEMU cả tuần rồi, nạp lên board là xong."
   T1: "gcc ghi sai đường dẫn / cài thiếu gói — cứ tạo symlink /lib/… là hết."
   T2: "Bản ARM64 nặng gấp 4,1 lần, vậy trình biên dịch ARM64 sinh mã kém."

   ── BƯỚC 7 · LƯỚI 3 × 1 ─────────────────────────────────────────────────────

   | Trục   | A (nhớ lại)        | B (giải thích số liệu)  | C (quyết định)       |
   |--------|--------------------|-------------------------|----------------------|
   | emu    | A5 tf — phát biểu  | B1 đọc -strace + ps     | C2 quy trình CI mới  |
   | interp | A1 mcq — trường ELF| B2 đọc cặp ls + readelf | C1 chẩn đoán trên bo |
   | padding| A6 tf — phát biểu  | B5 so cặp số đã đo      | C5 chọn theo 8 MB    |

   Kiểm tra bước 7:
   · C trả lời được mà không cần trục? Không. C1 buộc phải biết .interp là
     đường dẫn của target thì mới nghĩ tới rootfs thiếu file; C2 buộc phải biết
     qemu-user mượn nhân máy build; C5 buộc phải tách đệm khỏi nội dung.
   · Ba câu dùng chung từ vựng? Không: A5 nói "board", B1 nói "syscall/ENOSYS",
     C2 nói "quy trình kiểm thử"; A1 nói "trường .interp", B2 nói "hai lệnh ls",
     C1 nói "No such file or directory"; A6 nói "mã lệnh", B5 nói "size",
     C5 nói "phân vùng flash".
   · Câu trước lộ đáp án câu sau? A6 nêu nguyên lý nhưng không nêu con số nào,
     B5 mới đưa số; C5 cần cả số lẫn nguyên lý nên vẫn phải nghĩ.

   ════════════════════════════════════════════════════════════════════════════
   RANH GIỚI VỚI QUIZ BÀI 27
   Quiz cuối bài có 7 câu. Chúng chạm vào cùng chủ đề với ba trục, nên các câu
   ở đây phải hỏi khác — nếu không bộ bài tập chỉ là quiz thứ hai (§13.1).

   Q1 "dịch sạch không suy ra được gì"      → A5/C2 hỏi ngược: MỘT LẦN CHẠY
                                              XANH (không phải dịch sạch) suy
                                              ra được gì.
   Q2 "lỗi đổi từ Exec format sang Could
       not open — chứng minh gì"            → A2 hỏi về nội dung luật binfmt
                                              (magic, cờ F), không hỏi lại về
                                              chuyển biến của thông báo lỗi.
   Q3 "72 072 vs 18 824, text giống nhau"   → A6 là phát biểu KHÔNG kèm số;
                                              B5 dùng CẶP SỐ KHÁC (bản đã strip
                                              và số byte 0 đếm được bằng tr -d);
                                              C5 đưa ràng buộc flash mới.
   Q4 "vì sao nc x86 nối được"              → KHÔNG hỏi lại. B1 dùng dòng ps và
                                              -strace, hỏi ranh giới mô phỏng.
   Q5 "-lssl: cách xử lý đúng"              → B6 hỏi về dòng đầu của configure
                                              (dấu hiệu sớm), C3 là chẩn đoán
                                              nhiều nguyên nhân sau khi đã dựng
                                              staging sysroot — chứ không hỏi
                                              lại "phải làm gì".
   Q6 "STRIP không qua biến"                → B3 là Bắt lỗi phát biểu (phải
                                              viết lại câu sai), E5 là bản build
                                              thật đã chạy, có mã thoát.
   Q7 "giả thuyết nào ít hợp lý nhất"       → C2 không cho sẵn danh sách giả
                                              thuyết; nó bắt thiết kế quy trình.

   ════════════════════════════════════════════════════════════════════════════
   XUẤT XỨ SỐ LIỆU
   Mọi con số trong bộ này đến từ một trong hai nguồn, không có số nào bịa:

   (a) Đã đo trong Bài 27 và đã nằm trong lesson:
       17 512 / 72 072 / 18 824 / 795 224 B; text 6 694 / 6 992 / 6 992 /
       626 361; chênh 53 248 B; strip → 14 368 và 663 480 B; 14 472 B bản x86
       đã strip; e_machine 62 và 183; mã thoát 126 / 255 / 0; 200 688 B của
       ld-linux-aarch64.so.1; 49 so với 858 thư viện; 31 luật qemu-*;
       crc32("embedded linux") = 181eeda1; 216 816 số nguyên tố; 0,730 s so
       với 1,067 s (1,46×).

   (b) Đo riêng cho bộ bài tập này, ngày 2026-08-29, trên chính máy người học,
       với hello.c in "hello from arm64" (KHÁC chương trình hello của Bài 26,
       nên các con số cũng khác — đừng lẫn):
       15 960 / 70 456 / 9 016 B;  size 1429 600 8 (x86) và 1692 640 8 (cả hai
       bản ARM64);  chênh 70 456 − 9 016 = 61 440 B = đúng 60 KiB;
       số byte khác 0: 2 652 và 2 604 → số byte 0: 67 804 và 6 412;
       ldd → "not a dynamic executable", mã thoát 1;
       readelf -d → chỉ một dòng NEEDED: libc.so.6;
       .interp = /lib/ld-linux-aarch64.so.1 và /lib64/ld-linux-x86-64.so.2;
       31 mục qemu-* trong /proc/sys/fs/binfmt_misc, bốn mục còn lại là
       WSLInterop, python3.14, register, status;
       Makefile với STRIP native → "strip: Unable to recognise the architecture
       of the input file", make: *** [Makefile:13: …] Error 1, make thoát 2,
       file còn nguyên 9 016 B chưa strip;  sửa lại thành $(CROSS_COMPILE)strip
       → 6 168 B, make thoát 0;  bản native đã strip 14 464 B;
       bẫy "Nothing to be done": build native trước rồi gọi
       make CROSS_COMPILE=aarch64-linux-gnu- → make thoát 0 và file vẫn là
       x86-64; chỉ sau khi touch hello.c mới dịch lại thành ARM aarch64.
   ════════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-27',
  minutes: 85,

  intro:
    '<p>Bài 27 là bài đầu tiên bạn <i>làm</i> cross-compilation thật chứ không chỉ đọc về nó. ' +
    'Bộ bài tập này không kiểm tra bạn có nhớ bốn con số kích thước hay không — con số nào cũng ' +
    'đo lại được bằng một lệnh. Nó kiểm tra ba thứ khó hơn: một kết quả chạy thành công dưới ' +
    '<code>qemu-user</code> <b>chứng minh được gì</b>, vì sao một nhị phân đúng lại đòi một file ' +
    '<b>không tồn tại trên máy bạn</b>, và khi nào một file to hơn thật sự là <b>nhiều mã hơn</b>.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong bài: phần <b>A</b> và <b>B</b>, khoảng 23 phút. ' +
    '<b>Lượt 2</b> — làm sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, khoảng 60 phút. ' +
    'Khoảng nghỉ giữa hai lượt không phải để bạn rảnh; nó là thành phần chính của phương pháp.</p>' +
    '<p>Phần <b>E</b> cần WSL và bộ toolchain đã cài từ Bài 26. Mọi output trong lời giải đều là ' +
    'output thật, chạy trên chính cấu hình máy bạn đang dùng.</p>',

  truc: [
    { id: 'emu',
      name: 'Chạy xanh dưới qemu-user chỉ chứng minh mã lệnh đúng, không chứng minh môi trường đúng',
      x: 'qemu-user mượn nhân và hệ thống file của máy build. Nó kiểm được tính đúng của mã ' +
         'ARM64, và mù với mọi khác biệt thuộc về nhân, driver hay rootfs của board.',
      mis: 'Daemon chạy ngon dưới qemu-aarch64 cả tuần rồi, nạp lên board là xong — chỉ còn ' +
           'chuyện chép file.' },

    { id: 'interp',
      name: 'Nhị phân cross mang trong nó đường dẫn của target, không phải của máy build',
      x: 'Section .interp ghi /lib/ld-linux-aarch64.so.1 — đúng trên board, sai trên máy build. ' +
         'Trình biên dịch cố ý làm vậy, và ba cách bắc cầu đều là chuyện của lúc chạy.',
      mis: 'gcc ghi nhầm đường dẫn, hoặc cài thiếu gói. Tạo một symlink /lib/ld-linux-aarch64.so.1 ' +
           'là xong.' },

    { id: 'padding',
      name: 'File to hơn không có nghĩa là nhiều mã hơn — text/data/bss mới trả lời câu đó',
      x: 'Hai bản build có text, data, bss giống hệt nhau thì toàn bộ chênh lệch kích thước là ' +
         'phần đệm căn lề: tốn flash, không tốn thêm RAM lúc chạy.',
      mis: 'Bản ARM64 nặng gấp 4,1 lần bản x86, vậy trình biên dịch ARM64 sinh mã kém hơn.' }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     A · NHẬN BIẾT — 8 câu, mỗi câu dưới 60 giây
     ══════════════════════════════════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: '<code>aarch64-linux-gnu-readelf -p .interp temp_daemon_arm64</code> in ra ' +
         '<code>/lib/ld-linux-aarch64.so.1</code>. Trên máy WSL của bạn <b>không có</b> file ' +
         'nào ở đường dẫn đó. Kết luận nào đúng?',
      opts: [
        'Bản build hỏng — phải dịch lại và khai báo <code>--sysroot</code> cho đúng',
        'Chuỗi đó là đường dẫn <b>trên target</b>. Trình biên dịch ghi nó có chủ ý: trên board ARM64 thư viện C nằm ở <code>/lib</code>. Máy build cất bộ ARM64 ở chỗ khác để không đè lên bộ x86-64 của chính nó',
        'Trình liên kết động sẽ tự sửa đường dẫn ấy lúc chạy, nên không cần bận tâm',
        'Chỉ nhị phân PIE mới ghi đường dẫn tuyệt đối; dịch lại với <code>-no-pie</code> là hết'
      ], a: 1,
      why: '<p>Một nhị phân cross là <b>hàng gửi đi nơi khác</b>. Mọi đường dẫn nó mang theo — ' +
           '<code>.interp</code>, <code>RPATH</code>, đường dẫn plugin bạn tự nhúng — đều nói ' +
           'về hệ thống file của <i>target</i>, một hệ thống có thể còn chưa tồn tại lúc bạn ' +
           'dịch.</p>' +
           '<p>Máy build của bạn cất bộ ARM64 ở <code>/usr/aarch64-linux-gnu/lib/</code> vì hai ' +
           'file cùng tên <code>libc.so.6</code> mà khác kiến trúc thì không thể ở chung một thư ' +
           'mục. Đó là lý do bạn phải bắc cầu <b>lúc chạy</b> bằng <code>-L</code>, ' +
           '<code>QEMU_LD_PREFIX</code> hoặc <code>-static</code> — chứ không phải sửa lúc dịch.</p>' +
           '<p>Phương án D sai theo cách đáng nhớ: <code>-no-pie</code> đổi <i>cách nạp</i> ' +
           'chương trình, không đổi <i>đường dẫn trình thông dịch</i>. File <code>-no-pie</code> ' +
           'vẫn ghi đúng chuỗi <code>/lib/ld-linux-aarch64.so.1</code>.</p>' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Luật <code>binfmt_misc</code> của <code>qemu-aarch64</code> có ' +
         '<code>magic 7f454c460201010000000000000000000200b700</code> và ' +
         '<code>mask ffffffffffffff00fffffffffffffffffeffffff</code>. Vì sao <code>mask</code> ' +
         'lại có những byte <b>không</b> phải <code>ff</code>?',
      opts: [
        'Để luật khớp được cả nhị phân ARM 32-bit lẫn ARM64 bằng một mục duy nhất',
        'Để nhân chỉ phải đọc một phần header, cho nhanh',
        'Những vị trí đó trong ELF header <b>không liên quan tới kiến trúc</b> — phiên bản ABI, số hiệu hệ điều hành — nên luật cố ý bỏ qua chúng để vẫn khớp khi chúng khác nhau',
        'Vì <code>magic</code> dài hơn 16 byte nên phần dư bắt buộc phải bị che'
      ], a: 2,
      why: '<p><code>mask</code> trả lời câu "byte nào <i>thật sự</i> phải khớp". Chỗ ' +
           '<code>ff</code> là bắt buộc, chỗ <code>00</code> là bỏ qua. Byte thứ 8 của ELF ' +
           'header là <code>EI_OSABI</code> và byte kế là <code>EI_ABIVERSION</code> — hai giá ' +
           'trị có thể khác nhau giữa các bản phân phối mà chẳng ảnh hưởng gì tới việc file có ' +
           'phải AArch64 hay không, nên mask cho chúng <code>00</code>.</p>' +
           '<p>Hai byte thật sự quyết định nằm ở cuối: <code>b7 00</code> — số <b>183</b> ' +
           'little-endian, đúng <code>e_machine</code> của AArch64. Nếu chúng bị che thì luật sẽ ' +
           'khớp <i>mọi</i> file ELF 64-bit và mọi chương trình x86 trên máy bạn cũng bị đẩy qua ' +
           'QEMU.</p>' +
           '<p>Phương án A sai vì ARM 32-bit có <code>e_machine = 40</code>, cần một luật riêng ' +
           '— đó chính là mục <code>qemu-arm</code>, một trong 31 mục trên máy bạn.</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Cùng một file <code>temp_daemon_arm64</code>, hai lần chạy cho hai mã thoát khác ' +
         'nhau: <b>126</b> rồi <b>255</b>. <b>Ai</b> in ra thông báo trong mỗi trường hợp?',
      opts: [
        'Cả hai lần đều là nhân Linux, chỉ khác mã lỗi',
        '<b>126</b>: <code>bash</code>, sau khi <code>execve()</code> trả về <code>ENOEXEC</code>. <b>255</b>: chính <code>qemu-aarch64</code> — nó <i>đã</i> khởi chạy rồi mới thất bại',
        '<b>126</b>: <code>qemu-aarch64</code>. <b>255</b>: <code>bash</code>',
        'Cả hai lần đều là <code>qemu-aarch64</code>, lần đầu nó chưa được <code>binfmt_misc</code> gọi đúng cách'
      ], a: 1,
      why: '<p>"Ai là người báo lỗi" là câu hỏi rẻ nhất và có giá trị nhất khi gỡ lỗi build. ' +
           'Lần đầu, dòng lỗi mở đầu bằng <code>bash:</code> — vỏ shell nói rằng nhân từ chối ' +
           'nạp file. <b>126</b> là mã riêng <code>bash</code> dùng cho "tìm thấy lệnh nhưng ' +
           'không thực thi được".</p>' +
           '<p>Lần sau, dòng lỗi mở đầu bằng <code>qemu-aarch64:</code>. Nghĩa là nhân đã nạp ' +
           'QEMU thành công và trao file cho nó; QEMU chạy, đi tìm trình thông dịch, không thấy, ' +
           'rồi tự thoát. Mã thoát Unix chỉ có 8 bit nên <code>exit(-1)</code> về tới shell ' +
           'thành <b>255</b>.</p>' +
           '<p>Đây là <i>tiến bộ</i>, không phải một lỗi mới: bạn vừa đi được thêm một tầng.</p>' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: '<code>ldd temp_daemon_arm64</code> in <code>not a dynamic executable</code> và thoát ' +
         'với mã <b>1</b>. Nhưng <code>file</code> nói rõ file này ' +
         '<code>dynamically linked</code>. Ai đúng?',
      opts: [
        '<code>file</code> sai — nó chỉ đoán theo magic, còn <code>ldd</code> thật sự nạp file',
        'Cả hai đúng: file được liên kết động nhưng thiếu <code>libc.so.6</code> nên coi như tĩnh',
        '<code>file</code> đúng. <code>ldd</code> làm việc bằng trình liên kết động <b>native</b> nên nó mù với nhị phân lạ kiến trúc — dùng <code>aarch64-linux-gnu-readelf -d</code> thay cho nó',
        'Phải cài gói <code>ldd</code> bản ARM64 thì mới đọc được'
      ], a: 2,
      why: '<p><code>ldd</code> không phải một trình phân tích file — nó là một script gọi ' +
           '<b>trình liên kết động của chính máy bạn</b> ở chế độ chỉ liệt kê. Trình liên kết ' +
           'động x86-64 mở file ARM64, không nhận ra, và trả lời câu duy nhất nó biết trả lời: ' +
           '"đây không phải nhị phân động".</p>' +
           '<p>Đây đúng là ranh giới mà Bài 26 đã vạch: công cụ nào chỉ <i>đọc vỏ ELF</i> ' +
           '(<code>file</code>, <code>readelf</code>) thì làm việc được với mọi kiến trúc; công ' +
           'cụ nào phải <i>thực thi hoặc giải mã lệnh</i> thì bắt buộc phải có bản đúng kiến ' +
           'trúc.</p>' +
           '<p>Nguy hiểm nằm ở chỗ <code>ldd</code> không nói "tôi không biết" — nó đưa ra một ' +
           'câu trả lời <b>nghe có nghĩa</b> và <b>sai</b>. Một script build tin vào nó sẽ kết ' +
           'luận nhầm rằng bạn đã liên kết tĩnh.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 0,
      q: '<b>Phát biểu:</b> "Daemon của tôi chạy dưới <code>qemu-aarch64</code> suốt một tuần, ' +
         'phục vụ hàng nghìn yêu cầu, không rò bộ nhớ, không sập lần nào. Vậy nó sẽ chạy đúng ' +
         'trên board ARM64 dùng cùng dòng CPU."',
      a: 1,
      rw: 'Viết lại cho đúng trong 2–3 câu: <code>qemu-user</code> <b>mượn</b> những gì của máy ' +
          'build, và hãy kể ít nhất hai loại khác biệt mà nó <b>không thể</b> phát hiện.',
      why: '<p><b>Sai</b> — và đây là ngộ nhận đắt nhất của cả bài. ' +
           '<code>qemu-user</code> chỉ mô phỏng <b>lệnh CPU ở chế độ người dùng</b>. Nó không có ' +
           'nhân riêng, không có rootfs riêng, không có thiết bị riêng: mỗi lời gọi hệ thống ' +
           'được chuyển đổi tham số rồi giao thẳng cho <b>nhân WSL</b>, và mỗi lần mở file là mở ' +
           'trên <b>hệ thống file của máy build</b>.</p>' +
           '<p>Vậy một tuần chạy xanh chứng minh: mã ARM64 mà trình biên dịch sinh ra là đúng, ' +
           'thuật toán đúng, không có giả định thứ tự byte hay độ rộng kiểu nào bị vỡ. Nó ' +
           '<b>không</b> chứng minh gì về:</p>' +
           '<ul>' +
           '<li><b>Nhân của board</b> — thiếu một tuỳ chọn cấu hình, thiếu một syscall, cỡ trang ' +
           'nhớ khác;</li>' +
           '<li><b>Rootfs của board</b> — thiếu <code>libc.so.6</code>, sai phiên bản glibc, ' +
           'hoặc dùng musl;</li>' +
           '<li><b>Phần cứng và thời gian</b> — CPU chậm hơn nhiều lần, RAM ít hơn, thiết bị ' +
           'thật có độ trễ thật.</li>' +
           '</ul>' +
           '<p>Có một chiều nữa dễ quên: sai lệch cũng đi <i>ngược lại</i>. ' +
           '<code>set_robust_list</code> và <code>rseq</code> trả <code>ENOSYS</code> dưới QEMU ' +
           'nhưng chạy tốt trên board thật — nên một chương trình phụ thuộc syscall hiếm có thể ' +
           'hỏng dưới QEMU mà lành trên phần cứng.</p>',
      crit: [
        'Nói rõ <code>qemu-user</code> dùng <b>nhân</b> của máy build (syscall đi thẳng vào đó)',
        'Nói rõ nó dùng <b>hệ thống file</b> của máy build, không phải rootfs của board',
        'Kể được ít nhất <b>hai</b> loại khác biệt nó không phát hiện được (nhân / rootfs / thư viện C / phần cứng / thời gian)',
        'Kết luận đúng phạm vi: chạy xanh chỉ chứng minh <b>mã lệnh</b> đúng'
      ] },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 2,
      q: '<b>Phát biểu:</b> "Giữa hai bản build của cùng một chương trình, bản nào có file nhỏ ' +
         'hơn thì chắc chắn chứa ít mã lệnh hơn."',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: <b>lệnh nào</b> mới trả lời được câu "bản nào nhiều ' +
          'mã hơn", và nêu một trường hợp file to hơn hẳn mà lượng mã <b>không</b> đổi.',
      why: '<p><b>Sai.</b> Kích thước file là tổng của ba thứ rất khác nhau: nội dung thật ' +
           '(mã lệnh, hằng số), phần phục vụ gỡ lỗi (bảng ký hiệu, thông tin DWARF), và ' +
           '<b>phần đệm căn lề</b> — những vùng toàn số 0 mà trình liên kết chèn vào để mỗi ' +
           'segment bắt đầu ở ranh giới trang nhớ.</p>' +
           '<p>Lệnh trả lời đúng câu hỏi là <code>size</code>: nó in <code>text</code>, ' +
           '<code>data</code>, <code>bss</code> — tức là <i>nội dung</i>, không tính đệm và ' +
           'không tính ký hiệu. Nếu ba con số ấy giống nhau thì hai bản build chứa đúng cùng một ' +
           'lượng mã, dù file chênh nhau bao nhiêu đi nữa.</p>' +
           '<p>Trường hợp kinh điển ngay trong bài: <b>72 072</b> byte so với <b>18 824</b> byte, ' +
           'cả hai đều <code>text</code> = 6 992, <code>data</code> = 916, <code>bss</code> = 72. ' +
           'Chênh <b>53 248</b> byte và toàn bộ là số 0.</p>' +
           '<p>Chiều ngược lại cũng cần cẩn thận: bản <code>-static</code> có ' +
           '<code>text</code> = 626 361 — <i>ở đó</i> thì phình lên là thật, vì phần glibc được ' +
           'chép hẳn vào file.</p>',
      crit: [
        'Nêu đúng công cụ: <code>size</code> (và/hoặc ba con số <code>text</code>/<code>data</code>/<code>bss</code>)',
        'Nói rõ kích thước file còn gồm <b>phần đệm căn lề</b> và/hoặc bảng ký hiệu',
        'Nêu được một ví dụ file to hơn mà lượng mã không đổi (đệm 64 KB, hoặc bản chưa <code>strip</code>)'
      ] },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Bạn không muốn gõ <code>-L /usr/aarch64-linux-gnu</code> ở mỗi lần chạy, và khi chương ' +
         'trình được gọi <i>gián tiếp</i> qua <code>binfmt_misc</code> thì cũng không chen được ' +
         'tham số nào vào. Biến môi trường làm đúng việc đó tên là __________ .',
      ph: 'tên biến môi trường',
      a: ['QEMU_LD_PREFIX', 'qemu_ld_prefix', '$QEMU_LD_PREFIX', 'Qemu_ld_prefix', 'QEMU LD PREFIX'],
      why: '<p><code>QEMU_LD_PREFIX</code> đặt <b>gốc hệ thống file giả</b> cho mọi tiến trình ' +
           'chạy dưới <code>qemu-user</code>: mỗi đường dẫn tuyệt đối mà chương trình mở sẽ được ' +
           'thử ghép vào tiền tố này trước. Nhờ vậy <code>/lib/ld-linux-aarch64.so.1</code> ' +
           'thành <code>/usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1</code> và mở được.</p>' +
           '<p>Vì sao phải nhớ tên biến này chứ không chỉ nhớ <code>-L</code>: khi ' +
           '<code>binfmt_misc</code> đang bật, bạn gõ <code>./prog</code> và <b>nhân</b> mới là ' +
           'người dựng dòng lệnh cho QEMU — bạn không có chỗ nào để thêm <code>-L</code>. Biến ' +
           'môi trường là kênh duy nhất còn lại. Đúng tình huống ấy xảy ra trong mọi ' +
           '<code>Makefile</code> hay script CI chạy chương trình đã cross-compile.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi thông báo lỗi với <b>nguyên nhân</b> của nó. Cả sáu dòng đều xuất hiện thật ' +
         'khi kiểm chứng Bài 27 — hãy ghép theo <i>ai đang nói và nói về cái gì</i>, đừng ghép ' +
         'theo từ khoá trông quen.',
      left: [
        '<code>bash: ./p: cannot execute binary file: Exec format error</code>',
        '<code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\'</code>',
        '<code>strip: Unable to recognise the architecture of the input file</code>',
        '<code>ld.bfd: cannot find -lz</code> — trong khi bản x86 vẫn dịch xong',
        '<code>make: Nothing to be done for \'all\'.</code> ngay sau khi đổi <code>CROSS_COMPILE</code>',
        '<code>ldd prog_arm64</code> → <code>not a dynamic executable</code>'
      ],
      right: [
        'Một công cụ <b>native</b> được gọi trên file lạ kiến trúc; nó phải giải mã từng byte lệnh nên mù hẳn và dừng lại',
        'Hai kiến trúc dùng chung một file đích; <code>make</code> thấy đích mới hơn mã nguồn nên bỏ qua, và thoát với mã <b>0</b>',
        'Nhân không có trình nạp nào cho kiến trúc này, và chưa luật <code>binfmt_misc</code> nào khớp với file',
        'Sysroot của target không chứa thư viện đó — máy build có, nhưng bản của máy build là x86-64',
        'Công cụ này chạy chương trình bằng trình liên kết động <b>native</b>, nên nó trả lời sai mà không hề báo là mình không biết',
        'Trình mô phỏng <b>đã</b> khởi chạy, chỉ chưa biết gốc hệ thống file của target nằm ở đâu'
      ],
      a: [2, 5, 0, 3, 1, 4],
      why: '<p>Ba cặp đầu tách nhau ở câu hỏi "ai đang nói". <code>bash:</code> nghĩa là nhân ' +
           'từ chối trước khi có bất cứ thứ gì chạy. <code>qemu-aarch64:</code> nghĩa là lớp mô ' +
           'phỏng <i>đã</i> chạy — bạn tiến được một tầng. <code>strip:</code> nghĩa là bản build ' +
           'đã đi tới bước cuối rồi mới gãy vì một công cụ sót tiền tố.</p>' +
           '<p>Ba cặp sau là ba kiểu <b>im lặng</b> khác nhau, và đó mới là phần đáng nhớ. ' +
           '<code>cannot find -lz</code> ồn ào nhưng chỉ ồn ào ở bản ARM64, nên rất dễ đổ oan ' +
           'cho trình biên dịch chứ không nghĩ tới sysroot. <code>Nothing to be done</code> thoát ' +
           'với mã <b>0</b> và để lại nguyên file của kiến trúc cũ — bản build "thành công" mà ' +
           'sản phẩm sai kiến trúc. Còn <code>ldd</code> thì đưa ra một câu trả lời nghe hợp lý ' +
           'và sai hẳn.</p>' +
           '<p>Xếp hạng theo mức nguy hiểm: <code>Nothing to be done</code> đứng đầu, vì nó là ' +
           'trường hợp duy nhất mà <b>không có thông báo lỗi nào</b> và mã thoát bằng 0.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     B · THÔNG HIỂU — 6 câu tự luận ngắn, tự chấm theo tiêu chí
     ══════════════════════════════════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Đọc output', truc: 0, rows: 7,
      q: 'Ba khối dưới đây cắt ra từ <b>cùng một</b> lần chạy <code>temp_daemon_arm64</code> ' +
         'dưới <code>qemu-user</code> trên máy WSL. Hãy trả lời hai câu, mỗi câu 2–3 dòng: ' +
         '(1) <b>Ai</b> là tiến trình mà nhân thật sự đang chạy, và bằng chứng nào trong ba khối ' +
         'nói lên điều đó? (2) Nếu daemon này chạy xanh như vậy suốt một tuần, bạn được phép kết ' +
         'luận <b>điều gì</b> về nó — và <b>không</b> được phép kết luận điều gì?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          'LISTEN 0  64  0.0.0.0:9006  0.0.0.0:*  users:(("temp_daemon_arm",pid=410,fd=4))' },
        { t: 'code', where: 'out', nocopy: true, code:
          '    410 temp_daemon_arm /usr/bin/qemu-aarch64 ./temp_daemon_arm64 ./temp_daemon_arm64' },
        { t: 'code', where: 'out', nocopy: true, code:
          '422 set_robust_list(0x4a7100,24) = -1 errno=38 (Function not implemented)\n' +
          '422 rseq(0x4a77a0,32,0,0xd428bc00) = -1 errno=38 (Function not implemented)' }
      ],
      hint: 'Cột <code>ARGS</code> của <code>ps</code> khác cột <code>COMM</code>. Và hãy hỏi: ' +
            'cái socket cổng 9006 kia là socket của <i>nhân nào</i>?',
      solBlocks: [
        { t: 'p', x:
          '<b>(1) Tiến trình mà nhân đang chạy là <code>qemu-aarch64</code> — một nhị phân ' +
          'x86-64.</b> Cột <code>ARGS</code> nói thẳng: ' +
          '<code>/usr/bin/qemu-aarch64 ./temp_daemon_arm64 ./temp_daemon_arm64</code>. Không ai gõ ' +
          'tên đó cả; <code>binfmt_misc</code> chèn vào sau khi khớp magic của file. Đường dẫn ' +
          'lặp hai lần vì cờ <code>P</code> giữ nguyên <code>argv[0]</code> cho chương trình được ' +
          'mô phỏng, trong khi QEMU vẫn cần biết nạp file nào.' },
        { t: 'p', x:
          'Cột <code>COMM</code> ghi <code>temp_daemon_arm</code> — bị cắt ở 15 ký tự — và đây ' +
          'chính là cái bẫy: nhìn <code>ps</code> ai cũng tưởng daemon đang chạy trực tiếp. Dòng ' +
          '<code>ss</code> cũng góp phần đánh lừa, vì cổng 9006 là <b>thật</b>: socket ấy do nhân ' +
          'WSL cấp, không phải socket mô phỏng.' },
        { t: 'p', x:
          '<b>(2) Được phép kết luận:</b> mã lệnh ARM64 mà trình biên dịch sinh ra là đúng — ' +
          'thuật toán chạy đúng, không có giả định nào về thứ tự byte hay độ rộng kiểu bị vỡ khi ' +
          'đổi kiến trúc, luồng và đồng bộ hoá không hỏng. Đó là một kết quả có giá trị và nên ' +
          'đưa vào CI.' },
        { t: 'p', x: '<b>Không</b> được phép kết luận bất cứ điều gì về:' },
        { t: 'list', items: [
          '<b>Nhân của board</b> — mọi lời gọi hệ thống ở đây đi thẳng vào nhân WSL. Khối thứ ba ' +
          'chứng minh điều đó rõ nhất: <code>errno=38</code> là QEMU nói "tôi không mô phỏng lời ' +
          'gọi này". Cùng chương trình ấy trên board thật sẽ đi một đường mã khác của glibc.',
          '<b>Rootfs của board</b> — file mở ra là file trên máy build, qua ' +
          '<code>QEMU_LD_PREFIX</code>. Thiếu <code>libc.so.6</code>, sai phiên bản glibc, hay ' +
          'board dùng musl: không lộ ra ở đây.',
          '<b>Phần cứng và thời gian</b> — CPU thật chậm hơn, RAM ít hơn, thiết bị thật có độ trễ ' +
          'thật. Một lỗi tranh chấp phụ thuộc thời gian có thể ngủ yên suốt một tuần dưới QEMU.'
        ]},
        { t: 'p', x:
          'Nói gọn: <code>qemu-user</code> kiểm được <b>tính đúng của mã</b>, và mù với ' +
          '<b>môi trường</b>.' }
      ],
      crit: [
        'Chỉ ra <code>ps</code> cột <code>ARGS</code> cho thấy tiến trình thật là <code>qemu-aarch64</code>',
        'Nói được rằng <code>COMM</code> bị cắt / gây hiểu nhầm, hoặc rằng người dùng không hề gõ tên QEMU',
        'Kết luận đúng phạm vi: chạy xanh chứng minh <b>mã lệnh</b> ARM64 đúng',
        'Nêu ít nhất <b>hai</b> thứ không được kết luận (nhân của board / rootfs / thư viện C / phần cứng / thời gian)',
        'Dùng được khối <code>errno=38</code> làm bằng chứng rằng syscall đang do nhân của máy build phục vụ'
      ] },

    { id: 'b2', k: 'free', tag: 'Đọc output', truc: 1, rows: 6,
      q: 'Hai khối dưới đây nói về cùng một file <code>temp_daemon_arm64</code>. Khối trên cho ' +
         'thấy trên máy build <b>không có</b> <code>/lib/ld-linux-aarch64.so.1</code>; khối dưới ' +
         'cho thấy file lại <b>đòi</b> đúng thư viện đó. Giải thích trong 3–4 câu: đây là lỗi của ' +
         'trình biên dịch hay là hành vi đúng? Và <b>đường dẫn ấy nói về hệ thống file của máy ' +
         'nào</b>?',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'ls -l /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1\n' +
          'ls /lib/ld-linux-aarch64.so.1' },
        { t: 'code', where: 'out', nocopy: true, code:
          '-rwxr-xr-x 1 root root 200688 Apr 11 13:34 /usr/aarch64-linux-gnu/lib/ld-linux-aarch64.so.1\n' +
          'ls: cannot access \'/lib/ld-linux-aarch64.so.1\': No such file or directory' },
        { t: 'code', where: 'out', nocopy: true, code:
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [ld-linux-aarch64.so.1]' }
      ],
      hint: 'Chương trình này sinh ra để chạy ở đâu? Trên <i>đó</i>, thư viện C nằm ở thư mục nào?',
      solBlocks: [
        { t: 'p', x:
          '<b>Hành vi đúng, hoàn toàn có chủ ý.</b> Trình biên dịch cross ghi vào ' +
          '<code>.interp</code> đường dẫn của <b>target</b>, không phải của máy build. Trên một ' +
          'board ARM64 thật, thư viện C nằm ở <code>/lib</code> — đúng như trong file. Nếu gcc ghi ' +
          'đường dẫn của máy build vào đó thì nhị phân sẽ chạy được dưới mô phỏng và <i>hỏng ngay</i> ' +
          'trên board, tức là sai theo cách tệ hơn nhiều.' },
        { t: 'p', x:
          'Máy WSL cất bộ ARM64 ở <code>/usr/aarch64-linux-gnu/lib/</code> vì lý do rất đời ' +
          'thường: hai file cùng tên <code>libc.so.6</code> mà khác kiến trúc thì không thể nằm ' +
          'chung một thư mục. Đó chính là <b>sysroot</b> của Bài 26 — cây thư mục mô phỏng gốc ' +
          'của target, nằm nhờ trên máy build.' },
        { t: 'p', x:
          'Vậy việc còn lại là chuyện của <b>lúc chạy</b>, không phải lúc dịch, và có đúng ba ' +
          'cách bắc cầu:' },
        { t: 'list', ordered: true, items: [
          '<code>qemu-aarch64 -L /usr/aarch64-linux-gnu ./temp_daemon_arm64</code> — tường minh, ' +
          'thấy rõ lớp mô phỏng;',
          '<code>export QEMU_LD_PREFIX=/usr/aarch64-linux-gnu</code> — cách duy nhất còn dùng ' +
          'được khi <code>binfmt_misc</code> gọi QEMU thay bạn;',
          '<code>-static</code> lúc dịch — bỏ hẳn trình thông dịch, đổi lại file phình lên nhiều lần.'
        ]},
        { t: 'p', x:
          'Cách <b>không</b> nên làm: tạo <code>/lib/ld-linux-aarch64.so.1</code> trên máy build. ' +
          'Nó vá được một máy, giấu mất bản chất, và vỡ ngay ở máy CI kế tiếp.' }
      ],
      crit: [
        'Khẳng định đây là hành vi <b>đúng</b>, không phải lỗi build',
        'Nói rõ đường dẫn trong <code>.interp</code> là đường dẫn <b>trên target</b>',
        'Giải thích vì sao máy build phải cất bộ ARM64 ở nơi khác (trùng tên, khác kiến trúc)',
        'Nêu được ít nhất <b>hai</b> trong ba cách bắc cầu (<code>-L</code>, <code>QEMU_LD_PREFIX</code>, <code>-static</code>)',
        'Nhận ra đây là chuyện của <b>lúc chạy</b>, không sửa bằng cách dịch lại'
      ] },

    { id: 'b3', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ: <i>"Muốn cross-compile một dự án dùng ' +
         '<code>make</code>, chỉ cần đặt <code>CC=aarch64-linux-gnu-gcc</code>. Trình biên dịch ' +
         'là thứ duy nhất phụ thuộc kiến trúc; những thứ còn lại — <code>ld</code>, ' +
         '<code>ar</code>, <code>strip</code>, <code>objcopy</code> — chỉ thao tác trên file nên ' +
         'dùng bản của máy nào cũng được."</i> Chỉ ra <b>chỗ sai</b> và mô tả một lần build hỏng ' +
         'mà phát biểu này gây ra.',
      hint: 'Bài 26 đã chia công cụ thành hai nhóm. <code>strip</code> nằm nhóm nào?',
      solBlocks: [
        { t: 'p', x:
          '<b>Sai ở vế thứ hai.</b> Bài 26 chia công cụ thành hai nhóm rất rạch ròi: nhóm chỉ đọc ' +
          '<i>vỏ ELF</i> (<code>file</code>, <code>readelf</code>, phần lớn ' +
          '<code>objdump -h</code>) thì độc lập kiến trúc, còn nhóm phải <b>giải mã hoặc sinh mã ' +
          'lệnh</b> thì bắt buộc phải đúng kiến trúc. <code>ld</code>, <code>as</code>, ' +
          '<code>strip</code>, <code>objcopy</code>, <code>objdump -d</code> đều nằm ở nhóm thứ ' +
          'hai — chúng phải hiểu bảng relocation và cách mã hoá lệnh của kiến trúc đích.' },
        { t: 'p', x: 'Lần build hỏng cụ thể, chạy được trên máy thật:' },
        { t: 'code', where: 'wsl', code:
          'make CROSS_COMPILE=aarch64-linux-gnu-' },
        { t: 'code', where: 'out', nocopy: true, code:
          'mkdir -p build/aarch64-linux-gnu\n' +
          'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 -o build/aarch64-linux-gnu/hello hello.c\n' +
          'strip build/aarch64-linux-gnu/hello\n' +
          'strip: Unable to recognise the architecture of the input file `build/aarch64-linux-gnu/hello\'\n' +
          'make: *** [Makefile:13: build/aarch64-linux-gnu/hello] Error 1' },
        { t: 'p', x:
          'Trình biên dịch làm đúng phần của nó; <code>strip</code> bản x86-64 mới là chỗ gãy, và ' +
          '<code>make</code> thoát với mã <b>2</b>. Ở đây còn là kịch bản <i>may mắn</i>: lỗi hiện ' +
          'ra ngay. Với <code>ar</code> hoặc <code>objcopy</code> sai kiến trúc, bạn có thể nhận ' +
          'một file <i>trông</i> bình thường và chỉ vỡ khi nạp lên bo.' },
        { t: 'p', x:
          'Cách viết đúng là dùng đúng quy ước mà cả ngành dùng — một biến ' +
          '<code>CROSS_COMPILE</code> làm tiền tố cho <b>mọi</b> công cụ: ' +
          '<code>CC = $(CROSS_COMPILE)gcc</code>, <code>STRIP = $(CROSS_COMPILE)strip</code>, ' +
          '<code>AR = $(CROSS_COMPILE)ar</code>. Đổi một biến là đổi cả bộ; để trống thì Makefile ' +
          'quay về build native mà không cần sửa dòng nào.' }
      ],
      crit: [
        'Chỉ đúng vế sai: các công cụ khác <b>cũng</b> phụ thuộc kiến trúc',
        'Phân biệt được nhóm "chỉ đọc vỏ ELF" với nhóm "giải mã / sinh mã lệnh"',
        'Nêu một lỗi cụ thể — <code>strip: Unable to recognise the architecture</code> là ví dụ chuẩn',
        'Đề xuất quy ước <code>CROSS_COMPILE</code> làm tiền tố cho mọi công cụ'
      ] },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: '<code>temp_daemon.c</code> của Bài 24 được cross-compile sang ARM64 mà <b>không sửa một ' +
         'dòng nào</b> — dù nó dùng luồng, socket, <code>epoll</code> và <code>signalfd</code>. ' +
         'Giải thích trong 3–4 câu <b>vì sao</b> điều đó khả thi, rồi kể <b>hai loại</b> mã nguồn ' +
         'C mà đổi kiến trúc <i>là</i> phải sửa.',
      hint: 'Cái gì được giữ nguyên khi đổi kiến trúc: cú pháp C, hay giao diện thư viện, hay cả hai?',
      solBlocks: [
        { t: 'p', x:
          'Vì <code>temp_daemon.c</code> chỉ nói chuyện với <b>giao diện</b>, không nói chuyện ' +
          'với phần cứng. POSIX và glibc trình bày cùng một API — <code>pthread_create</code>, ' +
          '<code>socket</code>, <code>epoll_wait</code>, <code>signalfd</code> — trên mọi kiến ' +
          'trúc Linux. Việc chuyển tên hàm ấy thành lệnh máy và thành số hiệu syscall là phần ' +
          'của trình biên dịch và của glibc bản ARM64, không phải phần của bạn.' },
        { t: 'p', x:
          'Nói cách khác: mã nguồn chỉ cần <b>không giả định</b> gì về kiến trúc. Nếu nó có giả ' +
          'định, giả định ấy sẽ vỡ. Hai loại kinh điển:' },
        { t: 'list', ordered: true, items: [
          '<b>Giả định về độ rộng kiểu.</b> Viết <code>int</code> rồi ép sang con trỏ, hoặc ' +
          '<code>long</code> đúng 4 byte, hoặc quên rằng <code>char</code> mặc định là ' +
          '<b>không dấu</b> trên ARM và <b>có dấu</b> trên x86. Cách chữa: ' +
          '<code>&lt;stdint.h&gt;</code> — <code>uint32_t</code>, <code>int64_t</code>, ' +
          '<code>uintptr_t</code> — và ghi rõ <code>signed char</code> khi bạn thật sự cần dấu.',
          '<b>Mã phụ thuộc kiến trúc.</b> Assembly nội tuyến, hàm nội tại (intrinsic) của SSE/AVX, ' +
          'thao tác nguyên tử tự chế bằng lệnh riêng của x86, hoặc mã đọc/ghi bộ nhớ không căn lề ' +
          '— ARM64 khắt khe hơn x86 ở khoản này.'
        ]},
        { t: 'p', x:
          'Loại thứ ba đáng nhắc: giả định về <b>thứ tự byte</b>. Ở đây nó không lộ ra vì ARM64 ' +
          'trên Linux cũng chạy little-endian như x86-64, và vì Bài 24 đã dùng ' +
          '<code>htons()</code> đúng chỗ. Trên một target big-endian như MIPS, mã bỏ qua ' +
          '<code>htons()</code> sẽ hỏng ngay.' }
      ],
      crit: [
        'Nói rõ mã nguồn chỉ dùng <b>API POSIX/glibc</b>, thứ có mặt trên mọi kiến trúc',
        'Nói rõ trình biên dịch + glibc của target lo phần chuyển sang lệnh máy / syscall',
        'Nêu <b>hai</b> loại mã phải sửa (độ rộng kiểu · assembly hoặc intrinsic · căn lề · thứ tự byte)',
        'Nhắc được một cách phòng ngừa cụ thể, ví dụ <code>&lt;stdint.h&gt;</code>'
      ] },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', truc: 2, rows: 6,
      q: 'Bốn bản build của <b>cùng một</b> <code>temp_daemon.c</code>. Nhìn hai bảng và trả lời: ' +
         '(1) Vì sao <code>temp_daemon_arm64</code> lớn hơn <code>temp_daemon_arm64_4k</code> tới ' +
         '<b>53 248</b> byte trong khi ba con số <code>text</code>/<code>data</code>/<code>bss</code> ' +
         'của chúng <b>giống hệt nhau</b>? (2) Khoản chênh ấy tốn của bạn <i>flash</i> hay ' +
         '<i>RAM lúc chạy</i>? (3) Vì sao bản <code>_static</code> lại là một câu chuyện <b>khác ' +
         'hẳn</b> hai bản kia?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '17512 temp_daemon_x86\n' +
          '72072 temp_daemon_arm64\n' +
          '18824 temp_daemon_arm64_4k\n' +
          '795224 temp_daemon_arm64_static' },
        { t: 'code', where: 'out', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   6694\t    844\t     88\t   7626\t   1dca\ttemp_daemon_x86\n' +
          '   6992\t    916\t     72\t   7980\t   1f2c\ttemp_daemon_arm64\n' +
          '   6992\t    916\t     72\t   7980\t   1f2c\ttemp_daemon_arm64_4k\n' +
          ' 626361\t  24440\t  22680\t 673481\t  a46c9\ttemp_daemon_arm64_static' }
      ],
      hint: '53 248 = 52 × 1 024. Con số đó gợi tới cỡ trang nhớ nào?',
      solBlocks: [
        { t: 'p', x:
          '<b>(1)</b> Ba con số giống hệt nhau đã <i>chứng minh</i> rằng hai file chứa đúng cùng ' +
          'một lượng nội dung: cùng 6 992 byte mã lệnh, cùng 916 byte dữ liệu khởi tạo, cùng 72 ' +
          'byte <code>.bss</code>. Vậy toàn bộ 53 248 byte chênh lệch <b>không phải nội dung</b> ' +
          '— đó là <b>đệm căn lề</b>.' },
        { t: 'p', x:
          'Trình liên kết ARM64 mặc định căn mỗi segment theo trang <b>64 KiB</b>, vì Linux ARM64 ' +
          'có thể được cấu hình với cỡ trang 4 KiB, 16 KiB hoặc 64 KiB, và một nhị phân căn theo ' +
          '64 KiB thì chạy được trên cả ba. Đó là một <b>lời hứa tương thích</b>, không phải sự ' +
          'lãng phí ngẫu nhiên. Cờ <code>-Wl,-z,max-page-size=4096</code> là bạn nói "target của ' +
          'tôi dùng trang 4 KiB, tôi chịu trách nhiệm" — và đổi lại 52 KiB flash.' },
        { t: 'p', x:
          '<b>(2) Tốn flash, không tốn RAM lúc chạy.</b> Phần đệm toàn số 0 và không được nạp vào ' +
          'bộ nhớ như dữ liệu; nó chỉ chiếm chỗ trong file, tức là chiếm chỗ trong ảnh rootfs và ' +
          'trong mỗi lần cập nhật firmware qua mạng. Trên bo có 8 MB flash thì 52 KiB mỗi nhị ' +
          'phân là con số phải quan tâm; trên máy chủ thì không ai để ý.' },
        { t: 'p', x:
          '<b>(3)</b> Bản <code>_static</code> phình theo một cơ chế hoàn toàn khác, và bảng ' +
          '<code>size</code> chỉ thẳng vào đó: <code>text</code> nhảy từ 6 992 lên <b>626 361</b>. ' +
          'Đây là <i>nội dung thật</i> — toàn bộ phần glibc mà chương trình dùng đã được chép hẳn ' +
          'vào file, nên nó tốn cả flash <b>lẫn</b> RAM lúc chạy. Bù lại, nó không cần ' +
          '<code>.interp</code>, không cần <code>libc.so.6</code>, và chạy trên một rootfs trống ' +
          'trơn.' },
        { t: 'p', x:
          'Bài học chung: <b>kích thước file không trả lời câu "bản nào nhiều mã hơn"</b> — ' +
          '<code>size</code> trả lời. Luôn xem cả hai bảng trước khi kết luận.' }
      ],
      crit: [
        'Kết luận đúng: ba con số giống nhau ⇒ phần chênh là <b>đệm căn lề</b>, không phải mã',
        'Nhắc được cỡ trang 64 KiB (và/hoặc cờ <code>max-page-size=4096</code>) là nguyên nhân',
        'Trả lời đúng câu (2): tốn <b>flash</b>, không tốn RAM lúc chạy',
        'Trả lời đúng câu (3): bản <code>_static</code> tăng <code>text</code> lên 626 361 — nội dung thật, không phải đệm',
        'Nêu được đánh đổi của <code>-static</code>: không cần trình thông dịch / chạy trên rootfs trống'
      ] },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Bạn cross-compile một thư viện của bên thứ ba. Bước <code>./configure</code> chạy trơn ' +
         'tru, không một cảnh báo, và trong log có dòng <code>checking for gcc... gcc</code>. ' +
         'Vì sao dòng <b>thành công</b> đó lại là tín hiệu phải <b>dừng ngay</b>? Nếu cứ chạy ' +
         'tiếp thì hỏng ở đâu?',
      hint: 'Đọc kỹ chữ sau dấu ba chấm. Nó là tên công cụ nào?',
      solBlocks: [
        { t: 'p', x:
          'Vì <code>gcc</code> trần — không tiền tố — là trình biên dịch <b>native</b>. Dòng đó ' +
          'nghĩa là <code>configure</code> đã chọn bộ công cụ x86-64 và sẽ dò toàn bộ đặc điểm ' +
          'của <b>máy build</b>: độ rộng kiểu, thứ tự byte, hàm nào có sẵn trong libc. Kết quả dò ' +
          'được ghi vào <code>config.h</code> và <code>Makefile</code>, rồi dùng cho một sản phẩm ' +
          'đáng lẽ dành cho ARM64.' },
        { t: 'p', x:
          'Dòng bạn <i>muốn</i> thấy là <code>checking for aarch64-linux-gnu-gcc... ' +
          'aarch64-linux-gnu-gcc</code>, và nó chỉ xuất hiện khi bạn khai báo target:' },
        { t: 'code', where: 'wsl', code:
          './configure --host=aarch64-linux-gnu --prefix=/usr' },
        { t: 'p', x:
          'Hỏng ở đâu thì tuỳ vào mức độ may mắn, xếp từ nhẹ tới nặng:' },
        { t: 'list', items: [
          '<b>May</b> — link gãy ngay với <code>architecture of input file is incompatible</code>: ' +
          'bạn mất 10 phút.',
          '<b>Không may</b> — build ra một thư viện <b>x86-64</b> nằm gọn trong staging sysroot, ' +
          'và mọi thứ nối vào nó sau đó đều gãy với thông báo trông chẳng liên quan.',
          '<b>Tệ nhất</b> — build xong, nạp lên bo, và sai <i>lặng lẽ</i>: một ' +
          '<code>#define</code> trong <code>config.h</code> mô tả máy build chứ không mô tả ' +
          'target, ví dụ một tối ưu bật theo đặc điểm CPU x86.'
        ]},
        { t: 'p', x:
          'Đây cũng là lý do <code>--host</code> quan trọng hơn vẻ ngoài của nó: nó không chỉ đổi ' +
          'trình biên dịch, nó chuyển <code>configure</code> sang <b>chế độ cross</b>, trong đó ' +
          'mọi phép thử "biên dịch rồi chạy thử" đều bị cấm — vì trên máy build không thể chạy ' +
          'kết quả để mà thử.' }
      ],
      crit: [
        'Nhận ra <code>gcc</code> trần là trình biên dịch <b>native</b>, không phải bản cross',
        'Nói rõ <code>configure</code> sẽ dò đặc điểm của <b>máy build</b> và ghi nhầm vào cấu hình',
        'Nêu đúng cách chữa: <code>--host=aarch64-linux-gnu</code>',
        'Kể được ít nhất một hậu quả cụ thể (link gãy · thư viện sai kiến trúc trong sysroot · sai lặng lẽ trên bo)'
      ] }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     C · VẬN DỤNG — 5 câu, tình huống chưa có trong bài
     ══════════════════════════════════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 1, rows: 7,
      q: 'Bạn chép <code>temp_daemon_arm64</code> lên một board ARM64 thật. Trên board, ' +
         '<code>ls -l</code> thấy file, <code>chmod +x</code> đã làm, ' +
         '<code>readelf -h</code> xác nhận <code>Machine: AArch64</code>. Chạy nó thì board trả ' +
         'lời:' +
         '<p><code>-sh: ./temp_daemon_arm64: not found</code></p>' +
         'File <b>có</b> ở đó, bạn vừa <code>ls</code> xong. Vậy thứ gì "not found"? Nêu ' +
         '<b>nguyên nhân</b>, <b>một lệnh</b> xác nhận nó, và <b>hai cách chữa</b> khác hẳn nhau ' +
         'về bản chất.',
      hint: 'Thông báo này đến từ shell của board, và nó không nói về file bạn vừa gõ tên.',
      solBlocks: [
        { t: 'p', x:
          '<b>Nguyên nhân:</b> thứ "not found" là <b>trình thông dịch động</b>, không phải chương ' +
          'trình. Nhân đọc đoạn <code>INTERP</code>, thấy ' +
          '<code>/lib/ld-linux-aarch64.so.1</code>, mở không được, và trả về ' +
          '<code>ENOENT</code>. Shell dịch <code>ENOENT</code> thành câu duy nhất nó biết nói: ' +
          '<code>not found</code> — nói về một file mà bạn chưa từng gõ tên.' },
        { t: 'p', x:
          'Đây đúng là cùng một cơ chế đã làm <code>qemu-aarch64</code> báo ' +
          '<code>Could not open \'/lib/ld-linux-aarch64.so.1\'</code> trên máy build. Khác chỗ ' +
          'nào: trên máy build QEMU nói rõ tên file thiếu, còn shell của board thì <b>không</b> — ' +
          'nó giấu mất manh mối quan trọng nhất. Đó là lý do phải nhớ triệu chứng này.' },
        { t: 'p', x: '<b>Lệnh xác nhận</b> — chạy trên máy build, không cần board:' },
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-readelf -p .interp temp_daemon_arm64' },
        { t: 'p', x:
          'rồi trên board kiểm đúng đường dẫn ấy: <code>ls -l /lib/ld-linux-aarch64.so.1</code>. ' +
          'Bổ sung: <code>aarch64-linux-gnu-readelf -d temp_daemon_arm64 | grep NEEDED</code> ' +
          'liệt kê nốt các thư viện chia sẻ có thể cũng thiếu.' },
        { t: 'p', x: '<b>Hai cách chữa khác hẳn nhau về bản chất:</b>' },
        { t: 'list', ordered: true, items: [
          '<b>Sửa rootfs của target.</b> Cài glibc bản ARM64 lên board, hoặc chép ' +
          '<code>ld-linux-aarch64.so.1</code> và <code>libc.so.6</code> vào đúng chỗ. Đây là cách ' +
          'đúng khi board sẽ chạy nhiều chương trình — chi phí trả một lần, dùng chung.',
          '<b>Bỏ hẳn phụ thuộc.</b> Dịch lại với <code>-static</code>: không còn ' +
          '<code>.interp</code>, không cần thư viện nào trên board. Đúng khi board chạy đúng một ' +
          'daemon, hoặc khi bạn phải đưa một công cụ cứu hộ vào một rootfs mà bạn không kiểm soát.'
        ]},
        { t: 'p', x:
          'Cách <b>thứ ba, nên tránh</b>: tạo symlink từ <code>/lib/ld-linux-aarch64.so.1</code> ' +
          'sang một glibc phiên bản khác đang có trên board. Nó có thể khởi động được rồi sập ' +
          'giữa chừng vì lệch ký hiệu, và triệu chứng lúc đó khó lần hơn hẳn triệu chứng ban đầu.' }
      ],
      crit: [
        'Xác định đúng: thứ thiếu là <b>trình thông dịch động</b>, không phải chương trình',
        'Giải thích được vì sao shell nói <code>not found</code> (nhân trả <code>ENOENT</code> cho file trong <code>.interp</code>)',
        'Nêu một lệnh xác nhận: <code>readelf -p .interp</code> hoặc <code>readelf -d … NEEDED</code>',
        'Cách chữa 1: bổ sung glibc / trình thông dịch vào <b>rootfs của target</b>',
        'Cách chữa 2: dịch lại <code>-static</code> để bỏ hẳn trình thông dịch'
      ] },

    { id: 'c2', k: 'free', tag: 'Tình huống mới', truc: 0, rows: 8,
      q: 'Nhóm bạn đang chạy CI như sau: mỗi commit được cross-compile sang ARM64, rồi toàn bộ ' +
         'bộ kiểm thử chạy dưới <code>qemu-aarch64</code> trên runner x86-64. Suốt sáu tháng CI ' +
         'luôn xanh. Tuần này lô thiết bị đầu tiên ra hiện trường và <b>17 % số máy</b> sập trong ' +
         'giờ đầu. Bạn được giao thiết kế lại quy trình. Hãy trả lời: ' +
         '(1) CI hiện tại <b>vẫn</b> đáng giữ vì nó bắt được loại lỗi nào? ' +
         '(2) Nó <b>cấu trúc</b> không thể bắt được loại lỗi nào — kể ba loại? ' +
         '(3) Đề xuất một quy trình nhiều tầng, nói rõ mỗi tầng <b>chốt</b> điều gì và vì sao ' +
         'không thể bỏ tầng nào.',
      hint: 'Ba tầng, ba thứ khác nhau được kiểm: mã lệnh, nhân + rootfs, phần cứng thật. Bài 3 ' +
            'đã cho bạn tầng giữa.',
      solBlocks: [
        { t: 'p', x:
          '<b>(1) Giữ lại, vì nó rẻ và nó chốt một thứ thật:</b> mã ARM64 sinh ra là đúng. Lỗi ' +
          'thuật toán, lỗi giả định độ rộng kiểu, lỗi thứ tự byte, lỗi tranh chấp luồng ở mức ' +
          'logic, rò bộ nhớ — tất cả đều lộ ra dưới <code>qemu-user</code>, trong vài giây, trên ' +
          'mỗi commit. Không có tầng nào khác rẻ như vậy.' },
        { t: 'p', x:
          '<b>(2) Ba loại lỗi nó không thể bắt</b>, và lý do là <i>cấu trúc</i> chứ không phải ' +
          'thiếu công sức: <code>qemu-user</code> mượn nhân và hệ thống file của runner.' },
        { t: 'list', ordered: true, items: [
          '<b>Nhân của target.</b> Thiếu một tuỳ chọn cấu hình, thiếu driver, cỡ trang nhớ khác, ' +
          'hành vi <code>cgroup</code>/<code>seccomp</code> khác. Dưới QEMU mọi syscall đi vào ' +
          'nhân WSL/runner, nên nhân của board chưa từng được chạy thử.',
          '<b>Rootfs của target.</b> Thiếu <code>libc.so.6</code>, sai phiên bản glibc, board ' +
          'dùng musl, thiếu file cấu hình, sai quyền, sai điểm gắn. Dưới QEMU chương trình mở ' +
          'file của runner.',
          '<b>Phần cứng và thời gian thật.</b> CPU chậm hơn nhiều lần, RAM ít hơn, flash chậm, ' +
          'thiết bị thật có độ trễ và có lỗi. Lỗi tranh chấp phụ thuộc thời gian, hết bộ nhớ, ' +
          'watchdog kích hoạt — đúng nhóm sinh ra con số 17 %.'
        ]},
        { t: 'p', x: '<b>(3) Quy trình ba tầng:</b>' },
        { t: 'list', ordered: true, items: [
          '<b>Tầng 1 — mỗi commit, <code>qemu-user</code>, vài giây.</b> Chốt: <i>mã lệnh đúng</i>. ' +
          'Giữ nguyên bộ kiểm thử hiện có. Không bỏ được vì đây là tầng duy nhất đủ nhanh để chặn ' +
          'lỗi ngay khi lập trình viên còn nhớ mình vừa sửa gì.',
          '<b>Tầng 2 — mỗi lần gộp nhánh, <code>qemu-system-aarch64</code>, vài phút.</b> Boot ' +
          '<b>nhân của chính bạn</b> và <b>rootfs của chính bạn</b>, rồi chạy bộ kiểm thử ở bên ' +
          'trong. Chốt: <i>nhân + rootfs đúng</i> — thiếu thư viện, sai init, thiếu tuỳ chọn ' +
          'kernel đều lộ ra ở đây. Không bỏ được vì đây là tầng rẻ nhất bắt được nhóm lỗi (2).',
          '<b>Tầng 3 — mỗi bản phát hành, bo thật, hàng giờ.</b> Chạy tải thật, đo nhiệt, đo ' +
          'điện, để chạy qua đêm. Chốt: <i>phần cứng và thời gian</i>. Không bỏ được vì không có ' +
          'phần mềm nào mô phỏng được một tụ điện già đi hay một thẻ nhớ ghi chậm.'
        ]},
        { t: 'p', x:
          'Một điều chỉnh nhỏ mà rất đáng giá: <b>gọi <code>qemu-aarch64</code> tường minh</b> ' +
          'trong script CI thay vì để <code>binfmt_misc</code> gọi ngầm. Khi lệnh trong log ghi rõ ' +
          '<code>qemu-aarch64 ./test_suite</code>, không ai còn tưởng nhầm rằng bộ kiểm thử đang ' +
          'chạy "trên ARM64 thật". Sáu tháng CI xanh vừa rồi có một phần là hiểu nhầm đó.' }
      ],
      crit: [
        'Giữ tầng qemu-user và nói đúng nó chốt cái gì: <b>tính đúng của mã lệnh</b>',
        'Nêu <b>ba</b> loại lỗi nó không bắt được, gồm cả nhân của target và rootfs của target',
        'Giải thích lý do cấu trúc: qemu-user mượn nhân + hệ thống file của máy build',
        'Đề xuất tầng <code>qemu-system</code> (nhân + rootfs của bạn) làm tầng giữa',
        'Đề xuất tầng phần cứng thật và nói rõ nó chốt thứ không mô phỏng được',
        'Nêu ít nhất một biện pháp làm lớp mô phỏng <b>hiện rõ</b> (gọi QEMU tường minh, ghi vào log…)'
      ] },

    { id: 'c3', k: 'free', tag: 'Chẩn đoán', rows: 7,
      q: 'Bạn cross-compile <code>zlib</code> vào staging sysroot, <code>make install</code> ' +
         'chạy xong không lỗi, và <code>ls "$STAGING/lib/libz.a"</code> cho thấy file <b>có thật</b>. ' +
         'Nhưng lệnh liên kết vẫn chết:' +
         '<p><code>/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lz: No such file or directory</code></p>' +
         'Nêu <b>ba nguyên nhân</b> có thể, và với mỗi nguyên nhân nêu <b>bằng chứng</b> phân biệt ' +
         'nó với hai cái kia.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-gcc -O2 -I"$STAGING/include" -o crc_demo_arm64 crc_demo.c \\\n' +
          '    -L"$STAGING/lib" -lz' }
      ],
      hint: '"Có file" và "dùng được file" là hai chuyện. Cái <code>.a</code> đó do trình biên ' +
            'dịch <i>nào</i> tạo ra?',
      solBlocks: [
        { t: 'p', x:
          '<b>Nguyên nhân 1 — <code>libz.a</code> là archive của x86-64.</b> Đây là trường hợp ' +
          'hay gặp nhất: <code>./configure</code> chạy mà quên đặt <code>CC</code> (hoặc quên ' +
          '<code>--host</code>), nên zlib được build native rồi cài vào staging sysroot. ' +
          'Trình liên kết <i>có</i> mở file, thấy sai kiến trúc, bỏ qua, rồi báo "không tìm thấy".' },
        { t: 'p', x:
          '<b>Bằng chứng:</b> chính <code>ld</code> nói ra, ở dòng ngay <i>trên</i> dòng bạn đang ' +
          'đọc. Kiểm chứng trên máy thật với một archive x86-64 và một lệnh liên kết ARM64:' },
        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/aarch64-linux-gnu-ld.bfd: skipping incompatible stage/lib/libfoo.a when searching for -lfoo\n' +
          '/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lfoo: No such file or directory\n' +
          'collect2: error: ld returned 1 exit status' },
        { t: 'p', x:
          'Từ khoá là <b><code>skipping incompatible</code></b>. Lưu ý một cái bẫy: ' +
          '<code>file libz.a</code> chỉ nói <code>current ar archive</code> — nó <b>không</b> cho ' +
          'biết kiến trúc. Muốn tự kiểm thì lấy một thành viên ra rồi soi:' },
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-ar t "$STAGING/lib/libz.a" | head -1\n' +
          'aarch64-linux-gnu-ar x "$STAGING/lib/libz.a" adler32.o\n' +
          'aarch64-linux-gnu-readelf -h adler32.o | grep Machine' },
        { t: 'p', x:
          '<b>Nguyên nhân 2 — <code>-L</code> không trỏ vào thư mục thật sự chứa file.</b> Hai ' +
          'biến thể: biến <code>$STAGING</code> rỗng hoặc sai vì lỗi quoting (khi đó ' +
          '<code>-L</code> thành <code>-L/lib</code> hay <code>-L</code> trống), hoặc gói đã cài ' +
          'vào <code>lib64/</code>, <code>lib/aarch64-linux-gnu/</code> thay vì <code>lib/</code>.' },
        { t: 'p', x:
          '<b>Bằng chứng:</b> in thẳng ra xem trình liên kết nhìn thấy gì, và tìm file ở mọi chỗ:' },
        { t: 'code', where: 'wsl', code:
          'echo "STAGING=[$STAGING]"\n' +
          'find "$STAGING" -name \'libz.*\'\n' +
          'aarch64-linux-gnu-gcc -O2 -L"$STAGING/lib" -lz crc_demo.c -Wl,--verbose 2>&1 | grep -i \'attempt to open\' | head' },
        { t: 'p', x:
          'Điểm phân biệt sắc nhất: ở nguyên nhân 1 <b>có</b> dòng ' +
          '<code>skipping incompatible</code>; ở nguyên nhân 2 <b>không có</b> dòng nào cả, vì ' +
          '<code>ld</code> chưa hề mở được file nào để mà bỏ qua.' },
        { t: 'p', x:
          '<b>Nguyên nhân 3 — có file nhưng không phải file mà <code>-lz</code> tìm.</b> ' +
          '<code>-lz</code> chỉ tìm đúng hai tên: <code>libz.so</code> rồi <code>libz.a</code>. ' +
          'Nếu <code>make install</code> chỉ để lại <code>libz.so.1.3.1</code> mà thiếu symlink ' +
          '<code>libz.so</code>, hoặc file bị đổi tên, hoặc quyền đọc bị thiếu, thì ' +
          '<code>ld</code> vẫn nói y hệt như vậy.' },
        { t: 'p', x:
          '<b>Bằng chứng:</b> <code>ls -l "$STAGING/lib/"</code> — nhìn <i>tên đầy đủ</i> và ' +
          '<i>cột quyền</i>, đừng chỉ nhìn "có hay không".' },
        { t: 'p', x:
          'Thứ tự nên thử: đọc lại toàn bộ stderr tìm <code>skipping incompatible</code> (1 giây) → ' +
          '<code>echo</code> biến và <code>find</code> (5 giây) → <code>ls -l</code> (5 giây). ' +
          'Đừng bắt đầu bằng việc build lại zlib.' }
      ],
      crit: [
        'Nguyên nhân "archive sai kiến trúc" — và nêu <code>skipping incompatible</code> làm bằng chứng',
        'Nguyên nhân "<code>-L</code> trỏ sai chỗ" (biến rỗng / lỗi quoting / cài vào <code>lib64</code>) — bằng chứng là <code>echo</code>, <code>find</code> hoặc <code>--verbose</code>',
        'Nguyên nhân "tên hoặc quyền không khớp thứ <code>-lz</code> tìm" — bằng chứng là <code>ls -l</code>',
        'Mỗi nguyên nhân có một bằng chứng <b>phân biệt được</b> với hai cái kia',
        'Không đề xuất sửa bằng cách chép thư viện vào <code>/usr/aarch64-linux-gnu/</code> (tài sản của <code>apt</code>)'
      ] },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Trên máy WSL, <code>./temp_daemon_arm64</code> chạy được nhờ <code>binfmt_misc</code>. ' +
         'Bạn đóng gói quy trình build vào một container CI: bên trong container ' +
         '<b>không có</b> <code>/usr/bin/qemu-aarch64</code>, và bạn cũng không được cài thêm gì. ' +
         'Vậy mà lệnh <code>./temp_daemon_arm64</code> bên trong container <b>vẫn</b> chạy. ' +
         'Giải thích cơ chế, chỉ ra <b>trường nào</b> của luật <code>binfmt_misc</code> làm được ' +
         'điều đó, và mô tả triệu chứng nếu trường ấy <b>không</b> được bật.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          'enabled\n' +
          'interpreter /usr/bin/qemu-aarch64\n' +
          'flags: POF\n' +
          'offset 0\n' +
          'magic 7f454c460201010000000000000000000200b700\n' +
          'mask ffffffffffffff00fffffffffffffffffeffffff' },
      ],
      hint: '<code>binfmt_misc</code> là cơ chế của <b>nhân</b>, và nhân thì container dùng chung ' +
            'với máy chủ. Ba chữ trong <code>flags</code>, chữ nào nói về thời điểm nạp?',
      solBlocks: [
        { t: 'p', x:
          '<b>Cơ chế:</b> container chia sẻ <b>nhân</b> với máy chủ, nên nó cũng chia sẻ luôn ' +
          'bảng luật <code>binfmt_misc</code>. Nhưng chỉ vậy thì chưa đủ: luật ghi ' +
          '<code>interpreter /usr/bin/qemu-aarch64</code>, và đường dẫn ấy được hiểu trong ' +
          '<b>không gian tên hệ thống file của tiến trình</b> — tức là bên trong container, nơi ' +
          'file đó không tồn tại.' },
        { t: 'p', x:
          '<b>Trường làm được điều đó là cờ <code>F</code></b> (fix-binary) trong ' +
          '<code>flags: POF</code>. Với <code>F</code>, nhân mở và <b>nạp sẵn trình thông dịch ' +
          'vào bộ nhớ ngay lúc đăng ký luật</b>, chứ không mở lại lúc chạy. Từ đó trở đi mọi ' +
          'container, mọi <code>chroot</code>, mọi mount namespace đều dùng được luật này mà ' +
          'không cần thấy file QEMU.' },
        { t: 'p', x: 'Hai chữ còn lại, để không nhầm:' },
        { t: 'list', items: [
          '<code>P</code> (preserve-argv0) giữ nguyên <code>argv[0]</code> mà chương trình được ' +
          'mô phỏng nhìn thấy — đây là lý do <code>ps</code> in đường dẫn <b>hai lần</b>.',
          '<code>O</code> (open-binary) mở sẵn file cần chạy rồi truyền file mô tả cho trình ' +
          'thông dịch, thay vì đưa tên file.'
        ]},
        { t: 'p', x:
          '<b>Nếu <code>F</code> không được bật</b>, triệu chứng rất dễ nhận ra khi bạn biết ' +
          'trước, và rất khó chịu khi không biết:' },
        { t: 'list', items: [
          'Trên máy chủ: chạy tốt. Bên trong container: <code>./temp_daemon_arm64</code> báo ' +
          '<code>No such file or directory</code> — mà file thì rõ ràng có. Nhân đang than về ' +
          '<i>trình thông dịch</i>, y hệt triệu chứng của câu C1, chỉ khác là lần này thứ thiếu ' +
          'là <code>qemu-aarch64</code> chứ không phải <code>ld-linux-aarch64.so.1</code>.',
          'Cách chữa nếu không đăng ký lại được luật: cài <code>qemu-user-static</code> rồi ' +
          '<b>chép bản tĩnh</b> của QEMU vào đúng đường dẫn ấy bên trong ảnh container. Bản tĩnh ' +
          'là bắt buộc — bản động sẽ lại đi tìm thư viện của máy chủ và thiếu tiếp.'
        ]},
        { t: 'p', x:
          'Đây là lý do gói tên là <code>qemu-user-<b>static</b></code>, và là lý do mọi hướng ' +
          'dẫn build ảnh Docker đa kiến trúc đều bắt đầu bằng việc đăng ký luật với cờ ' +
          '<code>F</code>.' }
      ],
      crit: [
        'Nói rõ container dùng chung <b>nhân</b> nên dùng chung bảng luật <code>binfmt_misc</code>',
        'Chỉ đúng cờ <b><code>F</code></b> và giải thích nó nạp sẵn trình thông dịch <b>lúc đăng ký</b>',
        'Nêu đúng triệu chứng khi thiếu <code>F</code>: <code>No such file or directory</code> dù file có mặt',
        'Nêu cách chữa: dùng bản QEMU <b>tĩnh</b> chép vào ảnh container',
        'Không nhầm <code>F</code> với <code>P</code> hay <code>O</code>'
      ] },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', truc: 2, rows: 8,
      q: 'Thiết bị của bạn có <b>8 MB</b> flash; sau nhân và Device Tree còn <b>6 MB</b> cho ' +
         'toàn bộ userspace. Mỗi chương trình của bạn có kích thước tương đương ' +
         '<code>temp_daemon</code>. Dùng đúng các con số đã đo trong bài, hãy <b>tính</b> và ' +
         '<b>chọn</b> cấu hình liên kết cho ba kịch bản: thiết bị chạy <b>1</b> chương trình, ' +
         '<b>3</b> chương trình, <b>12</b> chương trình. Trình bày phép tính, rồi nói rõ bạn phải ' +
         '<b>xác nhận điều gì về bo</b> trước khi được phép dùng ' +
         '<code>-Wl,-z,max-page-size=4096</code>.',
      blocks: [
        { t: 'table',
          head: ['Khoản chi', 'Kích thước (byte)', 'Trả bao nhiêu lần?'],
          rows: [
            ['Mỗi chương trình, bản <b>động</b> + trang 4 KiB + <code>strip</code>',
             '<code>14 368</code>', 'Mỗi chương trình một lần'],
            ['Mỗi chương trình, bản <b>tĩnh</b> + <code>strip</code>',
             '<code>663 480</code>', 'Mỗi chương trình một lần'],
            ['<code>libc.so.6</code>', '<code>1 781 952</code>',
             'Một lần cho cả máy — <b>chỉ</b> khi có bản động'],
            ['<code>ld-linux-aarch64.so.1</code>', '<code>200 688</code>',
             'Một lần cho cả máy — <b>chỉ</b> khi có bản động']
          ] },
      ],
      hint: 'Bản động có một khoản <b>cố định</b> phải trả trước, rồi mới rẻ dần. Điểm hoà vốn ' +
            'nằm ở đâu?',
      solBlocks: [
        { t: 'p', x:
          'Khoản cố định của phương án động: <code>1 781 952 + 200 688 = <b>1 982 640</b></code> ' +
          'byte, trả một lần bất kể có bao nhiêu chương trình. Sau đó mỗi chương trình chỉ thêm ' +
          '14 368 byte. Phương án tĩnh không có khoản cố định, nhưng mỗi chương trình tốn ' +
          '663 480 byte.' },
        { t: 'p', x: '<b>1 chương trình</b>' },
        { t: 'list', items: [
          'Động: 1 982 640 + 14 368 = <b>1 997 008</b> byte',
          'Tĩnh: <b>663 480</b> byte → <b>tĩnh thắng</b>, nhỏ hơn 3 lần'
        ]},
        { t: 'p', x: '<b>3 chương trình</b>' },
        { t: 'list', items: [
          'Động: 1 982 640 + 3 × 14 368 = <b>2 025 744</b> byte',
          'Tĩnh: 3 × 663 480 = <b>1 990 440</b> byte → <b>tĩnh vẫn thắng</b>, nhưng chỉ 35 304 byte'
        ]},
        { t: 'p', x:
          'Đây chính là <b>điểm hoà vốn</b>, và nó nằm giữa 3 và 4: với 4 chương trình, động là ' +
          '2 040 112 byte còn tĩnh là 2 653 920 byte — động thắng. Con số này khớp với ước lượng ' +
          '"khoảng ba chương trình" của Bài 17.' },
        { t: 'p', x: '<b>12 chương trình</b>' },
        { t: 'list', items: [
          'Động: 1 982 640 + 12 × 14 368 = <b>2 155 056</b> byte — vừa thoải mái trong 6 MB',
          'Tĩnh: 12 × 663 480 = <b>7 961 760</b> byte — <b>không lắp vừa</b>, vượt cả dung lượng flash'
        ]},
        { t: 'p', x:
          '<b>Kết luận:</b> 1 và 3 chương trình → liên kết tĩnh, còn được thêm cái lợi là rootfs ' +
          'không cần glibc, đơn giản hơn hẳn khi cập nhật. 12 chương trình → bắt buộc liên kết ' +
          'động, không còn lựa chọn. Điều đáng nhớ: câu trả lời <b>đảo chiều</b> theo số chương ' +
          'trình, nên "tĩnh nhỏ hơn" hay "động nhỏ hơn" đều là câu nói sai nếu không kèm bối cảnh.' },
        { t: 'p', x:
          '<b>Trước khi dùng <code>-Wl,-z,max-page-size=4096</code></b> bạn phải xác nhận nhân ' +
          'của bo thật sự chạy với cỡ trang <b>4 KiB</b> — <code>CONFIG_ARM64_4K_PAGES</code>, ' +
          'kiểm bằng <code>getconf PAGESIZE</code> trên bo. Cỡ trang mặc định 64 KiB của trình ' +
          'liên kết không phải sự lãng phí vô cớ: nó là <b>lời hứa</b> rằng nhị phân chạy được ' +
          'trên nhân cấu hình 4 KiB, 16 KiB hay 64 KiB. Ép xuống 4 KiB là bạn đổi lời hứa ấy lấy ' +
          '52 KiB flash mỗi chương trình, và tự nhận trách nhiệm.' },
        { t: 'p', x:
          'Với 12 chương trình thì 12 × 52 KiB ≈ <b>624 KiB</b> — hơn 10 % của 6 MB. Đáng làm, ' +
          'miễn là bạn đã kiểm cỡ trang chứ không đoán.' }
      ],
      crit: [
        'Tính đúng khoản cố định của bản động: 1 781 952 + 200 688 = <b>1 982 640</b> byte',
        'Kịch bản 1 chương trình: chọn <b>tĩnh</b>, có số kèm theo',
        'Kịch bản 3 chương trình: chọn <b>tĩnh</b>, và nhận ra khoảng cách đã rất hẹp / gần điểm hoà vốn',
        'Kịch bản 12 chương trình: chọn <b>động</b>, và chỉ ra bản tĩnh <b>không lắp vừa</b> 6 MB',
        'Nêu đúng điều phải xác nhận: cỡ trang của nhân trên bo là <b>4 KiB</b>',
        'Giải thích được 64 KiB mặc định là lời hứa tương thích, không phải lãng phí'
      ] }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     D · ÔN XEN KẼ — 3 câu về các bài Bài 27 đứng lên trên
        Bài 24 (mạng · thứ tự byte) · Bài 18 (ELF · strip) · Bài 13 (biến môi trường)
        Cố ý không trùng ba bài mà bt-26 đã ôn (Bài 25, Bài 16, Bài 17).
     ══════════════════════════════════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'free', tag: 'Nhắc lại bài cũ', rows: 5,
      q: '<b>Bài 24.</b> <code>temp_daemon.c</code> gọi <code>htons(9006)</code> trước khi gán ' +
         'vào <code>sin_port</code>. Máy build là x86-64 little-endian, bo ARM64 chạy Linux cũng ' +
         'little-endian — vậy <code>htons()</code> ở đây có phải thừa không? Trả lời trong 2–3 ' +
         'câu, và nói rõ nếu bỏ nó đi thì hỏng ở <b>đâu</b> và <b>khi nào</b>.',
      hint: 'Số cổng đi ra ngoài dây mạng, và trên dây mạng thì thứ tự byte do <i>ai</i> quy định?',
      solBlocks: [
        { t: 'p', x:
          '<b>Không thừa.</b> <code>htons()</code> không chuyển đổi giữa "máy build" và "bo" — nó ' +
          'chuyển từ thứ tự byte của <b>máy</b> sang thứ tự byte của <b>mạng</b>, và thứ tự mạng ' +
          'là big-endian theo quy định của giao thức, không phụ thuộc kiến trúc nào cả. Trên một ' +
          'máy little-endian, <code>htons()</code> thật sự có đảo byte; trên máy big-endian nó là ' +
          'lệnh rỗng.' },
        { t: 'p', x:
          '<b>Bỏ đi thì hỏng ở đâu:</b> không phải lúc dịch, không phải lúc chạy nội bộ — mà ở ' +
          '<i>số cổng</i>. <code>9006</code> = <code>0x232E</code>; bỏ <code>htons()</code> thì ' +
          'hai byte đi ra ngoài theo thứ tự <code>2E 23</code>, và daemon rốt cuộc nghe ở cổng ' +
          '<code>0x2E23</code> = <b>11 811</b>. Chương trình vẫn khởi động, vẫn in log bình ' +
          'thường, chỉ là không ai kết nối được vào cổng bạn tưởng.' },
        { t: 'p', x:
          '<b>Khi nào lộ ra:</b> ngay lần đầu có client thật kết nối — nhưng chỉ nếu bạn kiểm ' +
          'bằng client thật. Nếu bộ kiểm thử của bạn cũng quên <code>htons()</code> ở phía ' +
          'client, hai bên sai giống nhau và mọi thứ xanh mượt. Đây đúng loại lỗi mà <b>lớp mô ' +
          'phỏng không giúp gì</b>: <code>qemu-user</code> dùng ngăn xếp mạng thật của nhân, nên ' +
          'nó tái hiện lỗi trung thực — và cũng che giấu nó trung thực nếu bài kiểm thử sai theo.' },
        { t: 'p', x:
          'Người anh em của nó cũng thuộc Bài 24: <code>&lt;stdint.h&gt;</code>. ' +
          '<code>uint16_t</code>, <code>uint32_t</code>, <code>uintptr_t</code> là cách nói "tôi ' +
          'cần đúng ngần này bit" thay vì tin vào độ rộng của <code>int</code> hay ' +
          '<code>long</code> trên kiến trúc hiện tại.' }
      ],
      crit: [
        'Trả lời <b>không thừa</b>',
        'Nói đúng bản chất: đổi từ thứ tự byte của <b>máy</b> sang thứ tự byte của <b>mạng</b> (big-endian), không phải giữa hai kiến trúc',
        'Chỉ ra hậu quả cụ thể: <b>sai số cổng</b> (và chương trình vẫn chạy, không báo lỗi)',
        'Nhận ra lỗi có thể bị che nếu client kiểm thử cũng sai giống hệt'
      ] },

    { id: 'd2', k: 'multi', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 18.</b> Bạn chạy <code>aarch64-linux-gnu-strip</code> lên một nhị phân ARM64 ' +
         'liên kết động, dịch với <code>-g</code>. Chọn <b>mọi</b> thứ bị lấy khỏi file.',
      opts: [
        '<code>.symtab</code> — bảng ký hiệu tĩnh',
        '<code>.strtab</code> — bảng chuỗi đi kèm bảng ký hiệu tĩnh',
        'Các section DWARF: <code>.debug_info</code>, <code>.debug_line</code>, <code>.debug_str</code>…',
        '<code>.dynsym</code> — bảng ký hiệu động',
        'Những hàm trong <code>.text</code> mà không nơi nào gọi tới'
      ],
      a: [0, 1, 2],
      why: '<p>Chạy thật trên máy bạn, danh sách section trước và sau ' +
           '<code>aarch64-linux-gnu-strip</code> khác nhau đúng ở ba nhóm: ' +
           '<code>.symtab</code>, <code>.strtab</code> và toàn bộ họ <code>.debug_*</code>. File ' +
           'từ 72 488 xuống 67 608 byte.</p>' +
           '<p><b><code>.dynsym</code> ở lại, và bắt buộc phải ở lại.</b> Đó là bảng ký hiệu mà ' +
           '<i>trình liên kết động</i> đọc lúc chạy để nối <code>printf</code> của bạn với ' +
           '<code>libc.so.6</code>. Gỡ nó đi thì chương trình không nạp được nữa. Đây là ranh ' +
           'giới dễ nhầm nhất giữa hai bảng ký hiệu: một bảng dành cho <b>con người và trình gỡ ' +
           'lỗi</b>, một bảng dành cho <b>máy lúc chạy</b>.</p>' +
           '<p>Phương án E là việc của <b>lúc liên kết</b>, không phải của <code>strip</code>: ' +
           '<code>-ffunction-sections -fdata-sections</code> khi dịch cộng với ' +
           '<code>-Wl,--gc-sections</code> khi liên kết. <code>strip</code> chạy sau khi file đã ' +
           'thành hình và không hề biết hàm nào được gọi.</p>' +
           '<p>Nhắc lại tình huống của chính Bài 27: dùng <code>strip</code> <b>native</b> lên ' +
           'file ARM64 thì không có section nào bị gỡ cả — lệnh thất bại với mã thoát <b>1</b> và ' +
           'để file y nguyên.</p>' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 13.</b> Trong bài này bạn gõ ' +
         '<code>CC=aarch64-linux-gnu-gcc ./configure --prefix="$STAGING" --static</code>. ' +
         'Phần <code>CC=…</code> đặt <b>trước</b> tên lệnh làm gì?',
      opts: [
        'Đặt <code>CC</code> trong shell hiện tại; biến tồn tại tới khi bạn đóng terminal',
        'Đặt <code>CC</code> <b>chỉ trong môi trường của lệnh đó</b>; lệnh kết thúc là shell không còn biến ấy',
        'Không khác gì gõ <code>export CC=…</code> ở dòng trước rồi chạy lệnh',
        'Truyền chuỗi <code>CC=aarch64-linux-gnu-gcc</code> làm tham số dòng lệnh cho <code>configure</code>'
      ], a: 1,
      why: '<p>Cú pháp <code>VAR=value lenh</code> là một tính năng của shell: nó dựng môi trường ' +
           'cho <i>đúng một</i> tiến trình con. Gõ <code>echo "$CC"</code> ngay sau đó, bạn được ' +
           'một dòng trống.</p>' +
           '<p>Vì sao chi tiết này quan trọng ở đây chứ không chỉ là mẹo vặt: khi cross-compile ' +
           'bạn <b>không</b> muốn <code>CC</code> dính lại trong shell. Lệnh kế tiếp bạn gõ có thể ' +
           'là build một công cụ chạy trên máy build — và nếu <code>CC</code> vẫn còn trỏ vào ' +
           'trình biên dịch ARM64, bạn nhận về một công cụ không chạy được trên chính máy mình, ' +
           'với thông báo lỗi chẳng liên quan gì tới nguyên nhân.</p>' +
           '<p>Phương án C sai ở đúng chỗ đó: <code>export</code> làm biến <b>tồn tại tiếp</b> cho ' +
           'mọi lệnh sau. Nó hợp lý khi bạn cố ý mở một phiên làm việc cross-compile — đúng như ' +
           'cách bài này dùng <code>export QEMU_LD_PREFIX=…</code> — nhưng phải là một quyết định ' +
           'có ý thức, không phải hệ quả tình cờ.</p>' +
           '<p>Phương án D cũng có thật, nhưng ở chỗ khác: <code>make CC=…</code> <i>là</i> tham ' +
           'số của <code>make</code>, và nó còn <b>đè lên</b> giá trị gán trong <code>Makefile</code> ' +
           '— một quy tắc ưu tiên hoàn toàn riêng, không dính gì tới môi trường.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     E · THỰC HÀNH — 6 câu. Mọi output dưới đây được đo thật ngày 2026-08-29
        trong ~/bai27bt trên máy WSL của bạn, với hello.c riêng của bộ bài tập
        (nên các con số KHÁC với temp_daemon của Bài 27 — đó là chủ ý).
     ══════════════════════════════════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Chuẩn bị thư mục làm việc rồi <b>dự đoán trước khi chạy</b>. Với ba lệnh dịch dưới ' +
         'đây, hãy viết ra: (1) thứ tự ba file từ nhỏ tới lớn; (2) <code>hello_arm64</code> lớn ' +
         'hơn <code>hello_arm64_4k</code> khoảng bao nhiêu byte, và con số đó là <i>số tròn</i> ' +
         'của cái gì; (3) ba cột <code>text</code>/<code>data</code>/<code>bss</code> của hai bản ' +
         'ARM64 <b>có</b> hay <b>không</b> khác nhau. Ghi dự đoán ra giấy, rồi chạy.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai27bt && cd ~/bai27bt\n' +
          'cat > hello.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("hello from arm64\\n");\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF' },
        { t: 'code', where: 'wsl', code:
          'gcc                   -O2 -o hello_x86      hello.c\n' +
          'aarch64-linux-gnu-gcc -O2 -o hello_arm64    hello.c\n' +
          'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 -o hello_arm64_4k hello.c\n' +
          'stat -c \'%s %n\' hello_x86 hello_arm64 hello_arm64_4k\n' +
          'size hello_x86 hello_arm64 hello_arm64_4k' }
      ],
      hint: 'Đừng đoán theo cảm giác "ARM64 gọn hơn". Hãy hỏi: cỡ trang mặc định của trình liên ' +
            'kết ARM64 là bao nhiêu?',
      solBlocks: [
        { t: 'p', x: 'Kết quả đo thật trên máy bạn:' },
        { t: 'code', where: 'out', nocopy: true, code:
          '15952 hello_x86\n' +
          '70448 hello_arm64\n' +
          '9008 hello_arm64_4k' },
        { t: 'code', where: 'out', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1373\t    600\t      8\t   1981\t    7bd\thello_x86\n' +
          '   1678\t    640\t      8\t   2326\t    916\thello_arm64\n' +
          '   1678\t    640\t      8\t   2326\t    916\thello_arm64_4k' },
        { t: 'p', x:
          '<b>(1)</b> Thứ tự: <code>hello_arm64_4k</code> (9 008) &lt; <code>hello_x86</code> ' +
          '(15 952) &lt; <code>hello_arm64</code> (70 448). Rất dễ đoán sai, vì bản ARM64 vừa là ' +
          'file <b>nhỏ nhất</b> vừa là file <b>lớn nhất</b> — chỉ khác nhau một cờ liên kết.' },
        { t: 'p', x:
          '<b>(2)</b> <code>70 448 − 9 008 = <b>61 440</b></code> byte, đúng bằng ' +
          '<b>60 KiB</b> = 60 × 1 024. Con số tròn ấy là dấu hiệu không thể nhầm của ' +
          '<b>đệm căn lề</b>: trình liên kết ARM64 mặc định căn segment theo trang 64 KiB, còn ' +
          '<code>max-page-size=4096</code> hạ xuống 4 KiB.' },
        { t: 'p', x:
          '<b>(3) Không khác một byte nào.</b> Cả hai bản ARM64 đều là <code>1678 / 640 / 8</code>. ' +
          'Đây là bằng chứng trực tiếp cho trục xoáy của bài: hai file chênh nhau 61 440 byte mà ' +
          'chứa <b>đúng cùng một lượng nội dung</b>.' },
        { t: 'p', x:
          'Đối chiếu thêm: bản x86 có <code>text</code> = 1 373 so với 1 678 của ARM64. ARM64 ' +
          'sinh nhiều byte mã hơn khoảng 22 % cho cùng chương trình này — lệnh ARM64 dài cố định ' +
          '4 byte, còn x86-64 mã hoá độ dài thay đổi. Đó mới là so sánh "nhiều mã hơn" <i>hợp lệ</i>, ' +
          'và nó nhỏ hơn hẳn con số 4,4 lần mà kích thước file gợi ra.' },
        { t: 'p', x:
          'Nếu bạn đoán sai câu (1) hoặc (2), đừng bỏ qua: đó chính là ngộ nhận mà A6 và B5 nhắm ' +
          'tới, và nó lặp lại mỗi lần bạn nhìn một bảng kích thước.' }
      ],
      crit: [
        'Dự đoán (1) đúng thứ tự: <code>_4k</code> &lt; <code>x86</code> &lt; <code>arm64</code>',
        'Dự đoán (2) nhận ra chênh lệch là một bội số tròn của KiB (61 440 = 60 KiB)',
        'Giải thích được nguồn gốc: đệm căn lề theo cỡ trang 64 KiB',
        'Dự đoán (3) đúng: ba cột <b>giống hệt nhau</b>',
        'Đã ghi dự đoán ra <b>trước</b> khi chạy (không có bước này thì bài mất tác dụng)'
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 5,
      q: 'Hai lệnh dưới đây cùng hỏi một câu: "<code>hello_arm64_4k</code> cần thư viện chia sẻ ' +
         'nào?". Dự đoán <b>từng lệnh in ra gì</b> và <b>mã thoát</b> của lệnh đầu, rồi chạy. Sau ' +
         'đó trả lời: nếu một script build chỉ dùng lệnh thứ nhất để kiểm tra, nó sẽ kết luận ' +
         'nhầm điều gì?',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'ldd hello_arm64_4k\n' +
          'echo "exit code = $?"\n' +
          'aarch64-linux-gnu-readelf -d hello_arm64_4k | grep NEEDED' }
      ],
      hint: '<code>ldd</code> không đọc file — nó nhờ một chương trình khác chạy thử. Chương ' +
            'trình đó thuộc kiến trúc nào?',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '\tnot a dynamic executable\n' +
          'exit code = 1\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]' },
        { t: 'p', x:
          '<code>ldd</code> trả lời <b>sai</b>, và trả lời một cách rất tự tin. Nó không phải ' +
          'trình phân tích ELF: nó gọi <b>trình liên kết động của máy bạn</b> — bản x86-64 — ở ' +
          'chế độ chỉ liệt kê. Bản x86-64 mở file ARM64, không nhận ra, và nói câu duy nhất nó ' +
          'biết nói.' },
        { t: 'p', x:
          '<code>aarch64-linux-gnu-readelf -d</code> chỉ <i>đọc bảng</i> trong file nên nó trả ' +
          'lời đúng: chương trình cần <code>libc.so.6</code>.' },
        { t: 'p', x:
          '<b>Script build sẽ kết luận nhầm rằng file đã được liên kết tĩnh</b> — vì ' +
          '<code>not a dynamic executable</code> đúng là câu <code>ldd</code> in ra cho một nhị ' +
          'phân tĩnh thật. Hậu quả: kiểm thử "rootfs có đủ thư viện chưa" bỏ qua file này, và ' +
          'thiếu sót chỉ lộ ra khi board khởi động.' },
        { t: 'p', x:
          'Mã thoát <b>1</b> là chi tiết đáng nhớ: <code>ldd</code> <i>có</i> báo thất bại. Một ' +
          'script viết cẩn thận với <code>set -e</code> hoặc có kiểm <code>$?</code> sẽ dừng lại ' +
          'thay vì tin vào dòng chữ. Đây là lý do §2 của dự án bắt kiểm mã thoát chứ không chỉ ' +
          'nhìn màn hình.' },
        { t: 'p', x:
          'Quy tắc mang theo: với nhị phân cross, mọi câu hỏi về thư viện đều hỏi bằng ' +
          '<code>$(CROSS_COMPILE)readelf -d</code>, không bao giờ hỏi bằng <code>ldd</code>.' }
      ],
      crit: [
        'Dự đoán đúng <code>ldd</code> in <code>not a dynamic executable</code>',
        'Dự đoán đúng mã thoát của <code>ldd</code> là <b>1</b>',
        'Dự đoán <code>readelf -d</code> liệt kê <code>libc.so.6</code>',
        'Nêu đúng kết luận nhầm: script tưởng file được liên kết <b>tĩnh</b>',
        'Nêu được cách làm đúng: dùng <code>$(CROSS_COMPILE)readelf</code>'
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Chạy <code>hello_arm64_4k</code> dưới <code>qemu-user</code> theo <b>hai</b> cách và in ' +
         'mã thoát của cả hai: (a) chỉ rõ sysroot ngay trên dòng lệnh; (b) cố tình <b>không</b> ' +
         'chỉ sysroot. Viết đủ hai lệnh. Sau đó giải thích vì sao mã thoát của cách (b) là con số ' +
         'đó, chứ không phải <b>126</b>.',
      hint: 'Sysroot ARM64 của máy bạn nằm ở <code>/usr/aarch64-linux-gnu</code>. Tham số một chữ ' +
            'cái của QEMU tên là gì?',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
          'qemu-aarch64 -L /usr/aarch64-linux-gnu ./hello_arm64_4k\n' +
          'echo "exit code = $?"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'hello from arm64\n' +
          'exit code = 0' },
        { t: 'code', where: 'wsl', code:
          'qemu-aarch64 ./hello_arm64_4k\n' +
          'echo "exit code = $?"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or directory\n' +
          'exit code = 255' },
        { t: 'p', x:
          '<b>Vì sao 255 chứ không phải 126:</b> hai con số thuộc hai giai đoạn khác nhau. ' +
          '<b>126</b> là mã <code>bash</code> tự sinh ra khi <code>execve()</code> thất bại — ' +
          'nghĩa là <i>chưa có gì chạy cả</i>. Ở đây bạn gọi thẳng <code>qemu-aarch64</code>, một ' +
          'nhị phân x86-64 hoàn toàn hợp lệ, nên <code>execve()</code> thành công và QEMU ' +
          '<b>đã chạy</b>. Nó chỉ thất bại <i>sau đó</i>, lúc đi tìm trình thông dịch, rồi tự ' +
          'thoát bằng mã lỗi chung của mình. Mã thoát Unix chỉ có 8 bit nên <code>-1</code> về ' +
          'tới shell thành <b>255</b>.' },
        { t: 'p', x:
          'Cách (a) có một biến thể bạn sẽ dùng nhiều hơn trong thực tế, vì nó còn sống sót khi ' +
          '<code>binfmt_misc</code> gọi QEMU thay bạn:' },
        { t: 'code', where: 'wsl', code:
          'export QEMU_LD_PREFIX=/usr/aarch64-linux-gnu\n' +
          './hello_arm64_4k\n' +
          'echo "exit code = $?"' },
        { t: 'p', x:
          'Nhưng hãy để ý cái giá của nó: dòng lệnh không còn chữ <code>qemu</code> nào. Trong ' +
          'log CI, <code>./hello_arm64_4k</code> trông y hệt một chương trình chạy tự nhiên. Đó ' +
          'chính là cái bẫy mà B1 và C2 nói tới.' }
      ],
      crit: [
        'Lệnh (a) đúng: <code>qemu-aarch64 -L /usr/aarch64-linux-gnu ./hello_arm64_4k</code>',
        'Có in mã thoát (<code>echo $?</code>) cho cả hai cách',
        'Ghi đúng kết quả: (a) in <code>hello from arm64</code>, mã <b>0</b>; (b) mã <b>255</b>',
        'Giải thích được 126 xảy ra khi <code>execve()</code> thất bại, còn 255 là QEMU <b>đã chạy</b> rồi mới hỏng'
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Viết lệnh <b>đếm</b> số luật <code>binfmt_misc</code> do QEMU đăng ký trên máy bạn, và ' +
         'một lệnh nữa <b>liệt kê những mục không phải của QEMU</b>. Chạy cả hai, ghi lại con số ' +
         'và danh sách. Rồi trả lời: trong danh sách "không phải QEMU" đó, mục nào giải thích vì ' +
         'sao bạn gõ được <code>notepad.exe</code> ngay trong shell Ubuntu?',
      hint: 'Thư mục là <code>/proc/sys/fs/binfmt_misc/</code>. Mọi luật của QEMU đều mở đầu bằng ' +
            'cùng một tiền tố.',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
          'ls /proc/sys/fs/binfmt_misc/ | grep -c \'^qemu-\'\n' +
          'ls /proc/sys/fs/binfmt_misc/ | grep -v \'^qemu-\'' },
        { t: 'code', where: 'out', nocopy: true, code:
          '31\n' +
          'WSLInterop\n' +
          'python3.14\n' +
          'register\n' +
          'status' },
        { t: 'p', x:
          '<b>31</b> luật QEMU — máy WSL của bạn biết nạp nhị phân của 31 kiến trúc, từ ' +
          '<code>qemu-aarch64</code> tới <code>qemu-riscv64</code>, <code>qemu-s390x</code>, ' +
          '<code>qemu-m68k</code>. Không có luật nào trong số đó do bạn tạo ra: gói ' +
          '<code>qemu-user-binfmt</code> đăng ký hết khi được cài.' },
        { t: 'p', x: 'Bốn mục còn lại chia làm ba loại rất khác nhau:' },
        { t: 'list', items: [
          '<b><code>WSLInterop</code></b> — đây là câu trả lời. Microsoft đăng ký một luật khớp ' +
          'magic <code>MZ</code> của file thực thi Windows và trỏ tới lớp cầu nối của WSL. Cùng ' +
          '<i>một</i> cơ chế nhân, hai mục đích hoàn toàn khác nhau: một bên chạy nhị phân lạ ' +
          '<b>kiến trúc</b>, một bên chạy nhị phân lạ <b>hệ điều hành</b>.',
          '<b><code>python3.14</code></b> — luật khớp file <code>.pyc</code> đã biên dịch sẵn. ' +
          'Bằng chứng rằng <code>binfmt_misc</code> chẳng liên quan gì riêng tới cross-compilation.',
          '<b><code>register</code></b> và <b><code>status</code></b> — không phải luật. ' +
          '<code>register</code> là file bạn <i>ghi</i> vào để thêm luật mới; ' +
          '<code>status</code> bật/tắt toàn bộ cơ chế. Nhầm hai thứ này là luật sẽ làm bạn đếm ' +
          'nhầm — nên câu hỏi mới yêu cầu đếm theo tiền tố <code>qemu-</code> thay vì đếm tất cả.'
        ]},
        { t: 'p', x:
          'Muốn xem chi tiết một luật thì <code>cat</code> thẳng vào nó — mỗi luật là một file ' +
          'văn bản do nhân sinh ra lúc bạn đọc:' },
        { t: 'code', where: 'wsl', code:
          'cat /proc/sys/fs/binfmt_misc/qemu-aarch64' }
      ],
      crit: [
        'Lệnh đếm đúng ý: lọc theo tiền tố <code>qemu-</code> trong <code>/proc/sys/fs/binfmt_misc/</code>',
        'Ghi đúng con số <b>31</b>',
        'Liệt kê được bốn mục còn lại (<code>WSLInterop</code>, <code>python3.14</code>, <code>register</code>, <code>status</code>)',
        'Chỉ đúng <code>WSLInterop</code> là mục cho phép chạy file <code>.exe</code>',
        'Nhận ra <code>register</code> và <code>status</code> không phải luật'
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 7,
      q: 'Dựng lại <b>hai</b> lỗi <code>Makefile</code> dưới đây trên máy bạn, rồi sửa. Với mỗi ' +
         'lỗi hãy ghi: <b>mã thoát của <code>make</code></b>, <b>trạng thái file sản phẩm</b> ' +
         '(kiến trúc nào, đã strip chưa), và <b>vì sao lỗi thứ hai nguy hiểm hơn</b> lỗi thứ nhất ' +
         'rất nhiều.',
      blocks: [
        { t: 'p', x: '<b>Lỗi 1</b> — một dòng thiếu tiền tố:' },
        { t: 'code', where: 'file', name: '~/bai27bt/b1/Makefile', lang: 'make', code:
          'CROSS_COMPILE ?=\n' +
          'CC     = $(CROSS_COMPILE)gcc\n' +
          'STRIP  = strip\n' +
          'CFLAGS = -O2 -Wl,-z,max-page-size=4096\n' +
          'BUILD  = build/$(if $(CROSS_COMPILE),$(CROSS_COMPILE:%-=%),native)\n' +
          '\n' +
          'all: $(BUILD)/hello\n' +
          '\n' +
          '$(BUILD)/hello: hello.c\n' +
          '\tmkdir -p $(BUILD)\n' +
          '\t$(CC) $(CFLAGS) -o $@ $<\n' +
          '\t$(STRIP) $@\n' +
          '\n' +
          'clean:\n' +
          '\trm -rf build' },
        { t: 'code', where: 'wsl', code:
          'make CROSS_COMPILE=aarch64-linux-gnu-\n' +
          'echo "make exit = $?"' },
        { t: 'p', x:
          '<b>Lỗi 2</b> — một <code>Makefile</code> ngắn hơn, không có gì sai về cú pháp. Chạy ' +
          'native trước, rồi đổi sang cross <b>mà không</b> <code>make clean</code>:' },
        { t: 'code', where: 'file', name: '~/bai27bt/b2/Makefile', lang: 'make', code:
          'CROSS_COMPILE ?=\n' +
          'CC     = $(CROSS_COMPILE)gcc\n' +
          'CFLAGS = -O2\n' +
          '\n' +
          'all: hello\n' +
          '\n' +
          'hello: hello.c\n' +
          '\t$(CC) $(CFLAGS) -o $@ $<' },
        { t: 'code', where: 'wsl', code:
          'make\n'  +
          'file hello\n' +
          'make CROSS_COMPILE=aarch64-linux-gnu-\n' +
          'echo "make exit = $?"\n' +
          'file hello' }
      ],
      hint: 'Lỗi thứ hai không in ra chữ <code>error</code> nào. Hãy nhìn mã thoát, rồi nhìn ' +
            '<code>file</code>.',
      solBlocks: [
        { t: 'p', x: '<b>Lỗi 1 — kết quả thật:</b>' },
        { t: 'code', where: 'out', nocopy: true, code:
          'mkdir -p build/aarch64-linux-gnu\n' +
          'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 -o build/aarch64-linux-gnu/hello hello.c\n' +
          'strip build/aarch64-linux-gnu/hello\n' +
          'strip: Unable to recognise the architecture of the input file `build/aarch64-linux-gnu/hello\'\n' +
          'make: *** [Makefile:12: build/aarch64-linux-gnu/hello] Error 1\n' +
          'make exit = 2' },
        { t: 'p', x:
          'File sản phẩm: <b>9 008 byte, ARM aarch64, chưa strip</b>. Trình biên dịch đã làm đúng ' +
          'phần của nó; chỉ mỗi <code>strip</code> bản x86-64 là gãy. Sửa một dòng:' },
        { t: 'code', where: 'file', name: 'Makefile — dòng 3', lang: 'make', code:
          'STRIP  = $(CROSS_COMPILE)strip' },
        { t: 'code', where: 'out', nocopy: true, code:
          'mkdir -p build/aarch64-linux-gnu\n' +
          'aarch64-linux-gnu-gcc -O2 -Wl,-z,max-page-size=4096 -o build/aarch64-linux-gnu/hello hello.c\n' +
          'aarch64-linux-gnu-strip build/aarch64-linux-gnu/hello\n' +
          'make exit = 0\n' +
          '6168 build/aarch64-linux-gnu/hello' },
        { t: 'p', x:
          'Kiểm luôn rằng bản native không bị hỏng theo: <code>make clean &amp;&amp; make</code> ' +
          'cho <code>CROSS_COMPILE</code> rỗng, nên <code>$(CROSS_COMPILE)strip</code> rút gọn về ' +
          '<code>strip</code>, và sản phẩm là <b>14 464 byte</b> trong <code>build/native/</code>. ' +
          'Một biến, hai kiến trúc, không sửa dòng nào — đó là toàn bộ giá trị của quy ước ' +
          '<code>CROSS_COMPILE</code>.' },
        { t: 'p', x: '<b>Lỗi 2 — kết quả thật:</b>' },
        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -O2 -o hello hello.c\n' +
          'hello: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), ...\n' +
          'make: Nothing to be done for \'all\'.\n' +
          'make exit = 0\n' +
          'hello: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), ...' },
        { t: 'p', x:
          '<b>Vì sao nguy hiểm hơn hẳn:</b> không có thông báo lỗi, <code>make</code> thoát với ' +
          'mã <b>0</b>, và mọi bước sau trong quy trình build đều coi như thành công. Nhưng sản ' +
          'phẩm vẫn là nhị phân <b>x86-64</b>. Nó sẽ được đóng gói, ký, đẩy lên máy chủ cập ' +
          'nhật, và chỉ vỡ khi bo thật cố chạy nó.' },
        { t: 'p', x:
          'Nguyên nhân: <code>make</code> quyết định bằng <b>đồng hồ</b>, không bằng nội dung — ' +
          'đúng điều Bài 16 dạy. Đích tên <code>hello</code> mới hơn <code>hello.c</code>, nên ' +
          'không có việc gì để làm. Việc bạn đổi <code>CROSS_COMPILE</code> hoàn toàn vô hình đối ' +
          'với luật phụ thuộc.' },
        { t: 'p', x: 'Chứng minh nhanh, và cũng là cách chữa tệ nhất:' },
        { t: 'code', where: 'out', nocopy: true, code:
          'touch hello.c\n' +
          'aarch64-linux-gnu-gcc -O2 -o hello hello.c\n' +
          'cross make exit = 0\n' +
          'hello: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), ...' },
        { t: 'p', x: 'Ba cách chữa, xếp từ tạm bợ tới đúng:' },
        { t: 'list', ordered: true, items: [
          '<code>make clean</code> mỗi lần đổi kiến trúc — dựa vào trí nhớ con người, sẽ quên.',
          '<b>Thư mục build riêng cho mỗi kiến trúc</b>, đúng như <code>Makefile</code> của lỗi 1: ' +
          '<code>build/aarch64-linux-gnu/</code> và <code>build/native/</code> không bao giờ đụng ' +
          'nhau, và bạn giữ được cả hai bản mà không phải dịch lại.',
          'Thêm một file dấu ghi cấu hình đang dùng và cho nó làm phụ thuộc của đích — cách các ' +
          'hệ thống build lớn dùng, thừa với quy mô ở đây.'
        ]},
        { t: 'p', x:
          'Nhớ theo hình dạng của triệu chứng: <b>lỗi ồn ào là lỗi rẻ</b>. Lỗi đắt là lỗi thoát ' +
          'với mã 0.' }
      ],
      crit: [
        'Lỗi 1: ghi đúng <code>make</code> thoát với mã <b>2</b>, file để lại là ARM64 <b>chưa strip</b>',
        'Lỗi 1: sửa đúng thành <code>STRIP = $(CROSS_COMPILE)strip</code>',
        'Lỗi 2: ghi đúng <code>Nothing to be done</code>, mã thoát <b>0</b>, file vẫn là <b>x86-64</b>',
        'Giải thích được nguyên nhân: <code>make</code> so <b>thời gian</b>, không biết kiến trúc đã đổi',
        'Nêu đúng vì sao lỗi 2 nguy hiểm hơn: không lỗi, mã thoát 0, sản phẩm sai đi tiếp',
        'Đề xuất cách chữa có tính hệ thống (thư mục build riêng theo kiến trúc), không chỉ <code>make clean</code>'
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: 'Dịch <code>hello.c</code> với <code>-static</code>, <code>strip</code> nó bằng công cụ ' +
         'đúng, rồi đo. Bạn sẽ thấy một chương trình in <b>một dòng chữ</b> mà nặng gần ' +
         '<b>600 KB</b>. Hãy dùng <code>size</code> để chỉ ra <b>phần nào</b> phình lên, rồi ước ' +
         'lượng: nếu thay glibc bằng một thư viện C nhỏ hơn, con số ấy còn khoảng bao nhiêu? Ghi ' +
         'lại dự đoán của bạn — Bài 28 sẽ đo thật.',
      hint: 'So <code>text</code> của bản tĩnh với <code>text</code> = 1 678 của bản động. Chênh ' +
            'lệch ấy là gì, và có bao nhiêu phần trong đó chương trình của bạn thật sự gọi tới?',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-gcc -O2 -static -o hello_static hello.c\n' +
          'cp hello_static hs && aarch64-linux-gnu-strip hs\n' +
          'stat -c \'%s %n\' hello_static hs\n' +
          'size hello_static' },
        { t: 'code', where: 'out', nocopy: true, code:
          '705256 hello_static\n' +
          '597920 hs\n' +
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          ' 530865\t  21532\t  21744\t 574141\t  8c2bd\thello_static' },
        { t: 'p', x:
          '<code>text</code> nhảy từ <b>1 678</b> lên <b>530 865</b> byte — gấp <b>316</b> lần. ' +
          'Lần này phình lên là <i>nội dung thật</i>, không phải đệm: toàn bộ phần glibc mà bản ' +
          'động vay mượn lúc chạy nay nằm hẳn trong file. Nó tốn cả flash <b>lẫn</b> RAM khi ' +
          'chương trình được nạp — khác hẳn 61 440 byte đệm của E1.' },
        { t: 'p', x:
          'Chương trình của bạn gọi đúng <b>một</b> hàm thư viện. Vậy 530 KB kia là gì? Là phần ' +
          'glibc <i>không tách rời được</i>: khởi tạo locale, xử lý định dạng đầy đủ của ' +
          '<code>printf</code> (mọi kiểu, mọi cờ, số dấu phẩy động), stdio có đệm, khởi động ' +
          'runtime, xử lý ngoại lệ. Trình liên kết đã cắt theo đơn vị nó cắt được và đây là phần ' +
          'còn lại.' },
        { t: 'p', x:
          '<b>Ước lượng để đối chiếu ở Bài 28:</b> musl được thiết kế cho đúng bài toán này — ' +
          'không hỗ trợ locale nặng, <code>printf</code> gọn hơn, ít phụ thuộc chéo hơn. Một dự ' +
          'đoán hợp lý cho <code>hello.c</code> tĩnh + strip là <b>khoảng 10–50 KB</b>, tức nhỏ ' +
          'hơn một tới hai bậc độ lớn. Hãy ghi con số bạn đoán vào ô trả lời ngay bây giờ, trước ' +
          'khi đọc Bài 28.' },
        { t: 'p', x:
          'Câu hỏi mở, không có đáp án đúng, đáng nghĩ trước: nếu musl nhỏ hơn tới mức đó, vì sao ' +
          'các bản phân phối máy để bàn vẫn dùng glibc? Gợi ý để tự tra: khả năng tương thích ' +
          'nhị phân, phần mở rộng GNU, hiệu năng của một số hàm, và hệ sinh thái phần mềm đóng.' },
        { t: 'p', x:
          'Một biến thể đáng thử nếu bạn còn thời gian: dịch lại với ' +
          '<code>-ffunction-sections -fdata-sections -Wl,--gc-sections</code> và đo lại. Nó cắt ' +
          'được bao nhiêu? Kết quả có thể làm bạn ngạc nhiên — và câu <i>vì sao lại ít đến vậy</i> ' +
          'chính là điểm bắt đầu của Bài 28.' }
      ],
      crit: [
        'Đo được và ghi lại: bản tĩnh đã strip khoảng <b>597 920</b> byte',
        'Chỉ đúng phần phình lên là <code>text</code> (từ 1 678 lên 530 865)',
        'Phân biệt được với E1: đây là <b>nội dung thật</b>, tốn cả RAM, không phải đệm căn lề',
        'Ghi ra một con số dự đoán cụ thể cho bản musl <b>trước</b> khi đọc Bài 28'
      ] }
  ],

  /* ══════════════════════════════════════════════════════════════════════════
     F · BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU — phủ đủ 28 câu
     ══════════════════════════════════════════════════════════════════════════ */
  diag: [

    ['A5, B1, C2',
     'Bạn còn coi "chạy được dưới <code>qemu-user</code>" là bằng chứng "chạy được ' +
     'trên bo". Dấu hiệu: không tách được <i>mã lệnh đúng</i> khỏi <i>môi trường ' +
     'đúng</i>, và không kể ra được thứ mà lớp mô phỏng mượn của máy build.',
     '<a href="#/bai-27#dich-xong-roi-chay-thu-o-dau">Đọc lại — Dịch xong rồi, chạy thử ở đâu?</a>'],

    ['A1, B2, C1, E3',
     'Bạn còn đọc đường dẫn trong <code>.interp</code> như đường dẫn trên máy mình. ' +
     'Hệ quả thực tế: gặp <code>No such file or directory</code> mà file rõ ràng có ' +
     'mặt, rồi đi tạo symlink thay vì sửa rootfs hoặc dịch tĩnh.',
     '<a href="#/bai-27#trinh-thong-dich-dong-file-dau-tien-bi-thieu">Đọc lại — Trình thông dịch động: file đầu tiên bị thiếu</a>'],

    ['A6, B5, C5, E1, E6',
     'Bạn còn đọc kích thước file như thước đo lượng mã. Dấu hiệu: không phản xạ ' +
     'chạy <code>size</code>, và không phân biệt được 61 440 byte <b>đệm căn lề</b> ' +
     'với 530 KB <b>nội dung thật</b> của bản tĩnh.',
     '<a href="#/bai-27#bon-con-so-kich-thuoc-va-cach-doc-chung">Đọc lại — Bốn con số kích thước, và cách đọc chúng</a>'],

    ['A2, A3, C4, E4',
     'Bạn chưa nắm <code>binfmt_misc</code> là cơ chế của <b>nhân</b>: ai gọi QEMU, ' +
     'ba cờ <code>POF</code> làm gì, và vì sao mã thoát <b>126</b> khác hẳn ' +
     '<b>255</b>. Đây là phần trả lời câu "ai đang nói" khi đọc thông báo lỗi.',
     '<a href="#/bai-27#code-binfmt-misc-code-day-nhan-nhan-ra-file-la">Đọc lại — <code>binfmt_misc</code>: dạy nhân nhận ra file lạ</a>'],

    ['A4, E2',
     'Bạn còn tin <code>ldd</code> khi nó nói về một nhị phân lạ kiến trúc. Ranh giới ' +
     'cần thuộc: công cụ chỉ <b>đọc vỏ ELF</b> thì dùng chung được, công cụ phải ' +
     '<b>chạy hoặc giải mã lệnh</b> thì bắt buộc có bản đúng kiến trúc.',
     '<a href="#/bai-26#binutils-vi-sao-moi-thu-deu-phai-co-tien-to">Đọc lại Bài 26 — Binutils: vì sao mọi thứ đều phải có tiền tố</a>'],

    ['A8, B3, E5',
     'Bạn còn nghĩ đổi mỗi <code>CC</code> là đủ để cross-compile. Triệu chứng kinh ' +
     'điển: <code>strip: Unable to recognise the architecture</code> ở dòng cuối một ' +
     'bản build vốn đã sắp xong.',
     '<a href="#/bai-27#code-cross-compile-code-quy-uoc-cua-ca-nganh">Đọc lại — <code>CROSS_COMPILE=</code>, quy ước của cả ngành</a>'],

    ['B6, C3',
     'Bạn chưa thấy sysroot của target nghèo đến mức nào so với máy build (49 so với ' +
     '858 thư viện), nên chưa có phản xạ dựng staging sysroot và chưa đọc được ' +
     '<code>cannot find -lz</code> đúng cách.',
     '<a href="#/bai-27#staging-sysroot-sysroot-thu-hai-do-ban-lam-chu">Đọc lại — Staging sysroot: sysroot thứ hai do bạn làm chủ</a>'],

    ['B4',
     'Bạn chưa nói rõ được <i>vì sao</i> mã nguồn không phải sửa, nên cũng chưa nêu ' +
     'được hai loại mã <b>phải</b> sửa. Đây là ranh giới giữa "dùng API POSIX" và ' +
     '"giả định về kiến trúc".',
     '<a href="#/bai-27#mot-ma-nguon-hai-kien-truc">Đọc lại — Một mã nguồn, hai kiến trúc</a>'],

    ['D1',
     'Ôn xen kẽ Bài 24: <code>htons()</code> đổi thứ tự byte của <b>máy</b> sang thứ ' +
     'tự byte của <b>mạng</b>, không phải giữa hai kiến trúc. Bỏ nó đi thì chương ' +
     'trình vẫn chạy — chỉ nghe nhầm cổng.',
     '<a href="#/bai-24#thu-tu-byte-vi-sao-phai-co-htons">Đọc lại Bài 24 — Thứ tự byte: vì sao phải có htons</a>'],

    ['D2',
     'Ôn xen kẽ Bài 18: <code>strip</code> lấy đi <code>.symtab</code>, ' +
     '<code>.strtab</code> và họ <code>.debug_*</code>, nhưng <b>giữ</b> ' +
     '<code>.dynsym</code> — bảng mà trình liên kết động cần lúc chạy.',
     '<a href="#/bai-18#cat-bot-strip-va-gc-sections">Đọc lại Bài 18 — Cắt bớt: strip và --gc-sections</a>'],

    ['D3',
     'Ôn xen kẽ Bài 13: <code>VAR=value lenh</code> đặt biến <b>chỉ cho một lệnh</b>, ' +
     'khác hẳn <code>export</code>. Nhầm hai thứ này là <code>CC</code> dính lại ' +
     'trong shell và bản build kế tiếp sai kiến trúc mà không rõ vì sao.',
     '<a href="#/bai-13#bien-va-dau-nhay-noi-90-loi-script-sinh-ra">Đọc lại Bài 13 — Biến và dấu nháy</a>'],

    ['E5 (nửa sau: <code>Nothing to be done</code>)',
     'Bạn chưa thấy <code>make</code> so <b>thời gian sửa file</b> chứ không biết gì ' +
     'về kiến trúc. Đây là lỗi duy nhất trong cả bộ thoát với mã <b>0</b> mà sản phẩm ' +
     'vẫn sai — nên nó cũng là lỗi đắt nhất.',
     '<a href="#/bai-16#make-quyet-dinh-bang-dong-ho-khong-bang-noi-dung">Đọc lại Bài 16 — make quyết định bằng đồng hồ</a>']
  ]
});

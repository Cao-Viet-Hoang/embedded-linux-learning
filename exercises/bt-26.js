/* Bài tập 26 — Giải phẫu một toolchain
   Cặp với lessons/bai-26.js · Chặng 04 — Cross-compilation

   ══════════════════════════════════════════════════════════════════════
   CHỌN TRỤC XOÁY — CLAUDE.md §13.4, bảy bước
   ══════════════════════════════════════════════════════════════════════

   BƯỚC 1 — Kiểm kê khái niệm (từ goals, 12 h2/h3, các cal kind:'why',
   tiêu đề cmdx, terms, recap của Bài 26):

     1.  gcc là trình điều phối, không dịch gì cả (cc1 / as / collect2)
     2.  Vì sao tách thành nhiều chương trình rời (ba lý do)
     3.  -### chỉ in kế hoạch rồi dừng
     4.  Năm file crt*.o — điểm vào thật là _start, không phải main
     5.  Bốn thành phần: binutils · GCC+libgcc · thư viện C · sysroot
     6.  Bốn thành phần = bốn gói Debian, đánh số phiên bản độc lập
     7.  Thư viện C bị tách làm hai gói: runtime vs dev (header)
     8.  Mọi công cụ binutils phải có tiền tố kiến trúc
     9.  Vài công cụ native VẪN chạy được trên file lạ kiến trúc — cái bẫy
     10. libgcc ≠ thư viện C; __aeabi_ldivmod; luôn được liên kết vào
     11. Chọn thư viện C: glibc / musl / uClibc-ng
     12. Sysroot — cây thư mục gốc của target; multiarch; -print-sysroot = /
     13. Đọc bộ ba: kiến trúc – nhà cung cấp – hệ điều hành – môi trường
     14. ABI hard-float vs softfp; cùng kiến trúc vẫn không ghép được
     15. LP64 vs ILP32 — lỗi im lặng
     16. ABI khác API
     17. max-page-size: mặc định của trình liên kết chi phối kích thước

   BƯỚC 2 — Chấm điểm 0/1/2 trên ba trục
     D = phụ thuộc xuôi dòng · C = giá của hiểu sai · K = phản trực giác

     #   Khái niệm                                      D  C  K  Σ
     ─────────────────────────────────────────────────────────────
     8+9 Tiền tố binutils · vài công cụ vẫn chạy được   2  2  2  6  ← T1
     14  ABI, không phải kiến trúc, quyết định ghép nối 2  2  2  6  ← T0
     12  Sysroot — cây thư mục của target               2  2  1  5  ← T2
     15  LP64 vs ILP32                                  1  2  2  5
     1   gcc là trình điều phối                         1  1  2  4
     6   Bốn thành phần = bốn gói độc lập               2  1  1  4
     10  libgcc ≠ thư viện C                            1  1  2  4
     13  Đọc bộ ba tên máy                              2  1  1  4
     17  max-page-size chi phối kích thước              1  1  2  4
     11  Chọn glibc / musl / uClibc-ng                  2  1  0  3
     7   Thư viện C tách runtime / dev                  1  1  1  3
     16  ABI khác API                                   1  1  1  3
     4   crt*.o và _start                               1  1  1  3
     2   Vì sao tách thành nhiều chương trình           0  1  1  2
     3   -### in kế hoạch rồi dừng                      0  0  1  1
     5   Bốn thành phần (kể tên)                        1  0  0  1

   BƯỚC 3 — Cắt. Ngưỡng: Σ ≥ 4 và ít nhất 2 trục ≥ 1. Bốn ứng viên đạt
   mức cao nhất: #8+9 (6), #14 (6), #12 (5), #15 (5). Lấy ba: T0 = #14,
   T1 = #8+9, T2 = #12.

   BƯỚC 4 — Loại.
     · #15 (LP64/ILP32) bị loại dù Σ = 5: nó là một *trường hợp riêng*
       của #14 — cũng là ABI. Xoáy cả hai thì ba câu của T0 và ba câu của
       #15 sẽ dùng chung từ vựng, vi phạm bước 7. #15 xuống một câu ở A.
     · #17 (max-page-size) và #13 (bộ ba) là kiến thức tra được trong mười
       giây ở mức "con số / tên gọi", nên theo §13.3 không được làm trục.
       #17 giữ một câu chẩn đoán ở C vì hệ quả của nó (nhị phân không nạp
       được trên board) mới là phần đáng giá.
     · Đối chiếu §13.8 — bt-25 đã tiêu ba trục: (a) nhị phân thuộc đúng
       một kiến trúc, còn "chạy được" là thuộc tính của hệ thống nạp nó;
       (b) rào cản build trên board là *tài nguyên*, chủ yếu là kích thước
       toolchain; (c) target là thuộc tính của một *công cụ*, không phải
       của sản phẩm. Không trục nào ở đây trùng.
       Ranh giới cần nói rõ với (a): T1 nói về *công cụ đọc/ghi* một file
       lạ kiến trúc, không phải về *chạy* nó. bt-25 hỏi "nhân có nạp được
       không"; T1 hỏi "objdump có giải mã được không". Khác câu hỏi, khác
       cơ chế, khác hệ quả.

   BƯỚC 5 — Mỗi trục là một câu có thể sai
     T0 abi     Hai file .o CÙNG một kiến trúc vẫn có thể không liên kết
                được với nhau, vì ABI — chứ không phải kiến trúc — quy
                định tham số đi qua thanh ghi nào và kiểu dữ liệu rộng
                bao nhiêu byte.
     T1 prefix  Công cụ binutils chỉ đọc phần vỏ ELF (nm, readelf) chạy
                đúng trên mọi kiến trúc; công cụ phải giải mã từng byte
                lệnh (objdump -d, strip, ld) thì bản native mù hẳn.
     T2 sysroot Trình biên dịch cross tìm header và thư viện trong cây thư
                mục của TARGET, nên một thư viện đang nằm sẵn trên máy
                build vẫn là "không tồn tại" đối với nó.

   BƯỚC 6 — Hiểu lầm đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu
   hỏng ở C)
     T0  "Cùng kiến trúc ARM thì file nào ghép với file nào cũng được;
          kiến trúc là thứ duy nhất phải khớp."
     T1  "nm chạy được trên file ARM64, vậy cả bộ binutils native đều
          dùng được — tiền tố chỉ là thói quen gõ cho đẹp."
     T2  "Máy build đã cài zlib rồi thì -lz phải tìm thấy; trình biên dịch
          dùng chung thư viện của máy."

   BƯỚC 7 — Lưới 3 × 1 và kiểm tra

     Trục    A (nhớ lại)          B (dữ liệu thật)        C (tình huống có ràng buộc)
     ───────────────────────────────────────────────────────────────────────────────
     T0 abi  A3 · ABI quy định    B3 · readelf -A của     C2 · vendor giao .a softfp,
             những gì             hai file + lỗi ld       dự án là hf, không xin
                                                          build lại được
     T1 pre  A1 · điều gì quyết   B1 · nm in đúng bảng    C1 · Makefile CC có tiền tố
             định công cụ native  ký hiệu, objdump và     nhưng STRIP thì không, build
             có xử lý được không  strip cùng file thì     "xanh" mà sản phẩm hỏng
                                  từ chối
     T2 sys  A2 · sysroot là gì   B2 · -print-sysroot in  C3 · vendor giao tarball
                                  "/" nhưng -E -v lại     sysroot, phải dịch chương
                                  chỉ vào .../include     trình cần libssl, máy build
                                                          không có mạng

     · C có trả lời được mà không hiểu trục không? C1 không — phải biết
       *tại sao* các bước trước im lặng. C2 không — phải biết ABI là
       thuộc tính ghi trong file, đọc được bằng readelf -A. C3 không —
       phải biết cây thư mục nào mới là cây đúng.
     · Ba câu có dùng chung từ vựng không? Không: A dùng "công cụ /
       ABI / sysroot" ở mức định nghĩa, B dùng đúng chuỗi lỗi đã bắt
       được, C dùng ngôn ngữ tình huống (vendor, Makefile, tarball).
     · Câu trước có lộ câu sau không? A3 định nghĩa ABI nhưng không nhắc
       VFP; B3 mới đưa VFP; C2 mới đưa quyết định. Không lộ.

   ══════════════════════════════════════════════════════════════════════
   RANH GIỚI VỚI QUIZ BÀI 26 (7 câu — không được hỏi lại)
   ══════════════════════════════════════════════════════════════════════
     Q1  -### in ba đường dẫn → chứng minh gcc là trình điều phối
     Q2  nm native đọc được .o ARM64 → kết luận nào đúng
     Q3  chữ gnu trong arm-linux-gnueabihf mang thông tin gì
     Q4  lỗi "mixed uses VFP register arguments" — vì sao không ghép được
     Q5  con trỏ sai trên ARM32, không cảnh báo → LP64 vs ILP32
     Q6  70 448 → 9 008 byte mà text vẫn 1 642 → phần đệm căn lề
     Q7  undefined reference to __aeabi_ldivmod → libgcc cung cấp

   Cách tránh trùng, theo từng trục:
     · T1 — quiz Q2 đưa *tình huống* (nm chạy được) rồi hỏi kết luận. A1 ở
       đây hỏi ngược lên mức *nguyên lý*: điều gì quyết định. B1 đưa cả ba
       chuỗi lỗi thật để giải thích *cơ chế*. C1 chuyển sang Makefile.
     · T0 — quiz Q4 đưa sẵn thông báo lỗi VFP. A3 hỏi ABI *bao gồm những
       gì* (không nhắc VFP). C2 đổi ràng buộc: không được build lại.
     · #15 LP64 — quiz Q5 đã hỏi chẩn đoán, nên A7 chỉ còn bắt gọi *tên*
       mô hình kiểu dữ liệu.
     · #17 max-page-size — quiz Q6 đã giải thích phần đệm, nên C4 hỏi hệ
       quả ngược lại: ép 4096 rồi board không nạp được.
     · #10 libgcc — quiz Q7 đã hỏi nguồn gốc __aeabi_ldivmod, nên B5 đổi
       sang so sánh cặp libgcc vs thư viện C bằng số đo thật.

   Phạm vi quy tắc "mỗi khái niệm ngoài trục chỉ hỏi một lần" (§13.3) được
   áp cho A + B + C. Phần E có bốn kiểu cố định (dự đoán · gõ lệnh · sửa
   lỗi · thử thách) và bắt buộc phải chạm lại nội dung bài, nên không tính
   vào hạn mức ấy — giống bt-01 … bt-25.

   ══════════════════════════════════════════════════════════════════════
   XUẤT XỨ SỐ LIỆU — đo lại trên máy người dùng ngày 2026-08-29
   (WSL2 Ubuntu, x86-64; thư mục ~/bai26ex)
   ══════════════════════════════════════════════════════════════════════
     · aarch64-linux-gnu-ld --version   → GNU ld (GNU Binutils for Ubuntu) 2.46
     · aarch64-linux-gnu-gcc --version  → (Ubuntu 15.2.0-16ubuntu1) 15.2.0
     · nm sum-arm64.o (native)          → in đúng 4 dòng, rc = 0
       objdump -d sum-arm64.o (native)  → objdump: can't disassemble for
                                          architecture UNKNOWN!, rc = 1
       strip s2.o (native)              → strip: Unable to recognise the
                                          architecture of the input file `s2.o'
       ld hello.o (native)              → Relocations in generic ELF (EM: 183)
                                          … file in wrong format
     · aarch64-linux-gnu-gcc -E -v -    → 3 đường dẫn:
         /usr/lib/gcc-cross/aarch64-linux-gnu/15/include
         /usr/lib/gcc-cross/aarch64-linux-gnu/15/../../../../aarch64-linux-gnu/include
         /usr/include
       gcc -E -v - (native)             → 4 đường dẫn, có /usr/include/x86_64-linux-gnu
     · -print-sysroot → /  ·  -print-multiarch → aarch64-linux-gnu
       -print-prog-name=cc1 → /usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1
       -print-libgcc-file-name → /usr/lib/gcc-cross/aarch64-linux-gnu/15/libgcc.a
     · dpkg -S: cc1 → cpp-15-aarch64-linux-gnu · ld → binutils-aarch64-linux-gnu
       libc.so.6 → libc6-arm64-cross · stdio.h → libc6-dev-arm64-cross
     · /usr/aarch64-linux-gnu/include → 142 mục · .../lib → 72 mục
     · libgcc.a 3 210 472 B, 398 thành viên (ar t)
       libc.so.6 (ARM64) 1 781 952 B, 3 078 ký hiệu (nm -D --defined-only)
     · hello64k 70 448 B · hello4k 9 008 B · size: text 1 635 cả hai
       (Bài 26 ghi text 1 642 vì hello.c của bài dài hơn vài byte — khi
        làm phần E người học sẽ ra con số của chính mình, đừng bắt khớp)
       readelf -l: căn lề 0x10000 so với 0x1000
       byte 0 trong file: 67 841 so với 6 449
     · aarch64-linux-gnu-ld hello.o -o hello-ld →
         warning: cannot find entry symbol _start; defaulting to 00000000004000b0
         hello.c:(.text+0x10): undefined reference to `puts'   rc = 1
       readelf -h hello64k → Entry point address: 0x680, và nm cho thấy
         0000000000000680 T _start · 00000000000007a8 T main
     · aarch64-linux-gnu-gcc hello.c -lz →
         cannot find -lz: No such file or directory
       trong khi /usr/lib/x86_64-linux-gnu/libz.so.1.3.1 (121 272 B) có thật
       và /usr/aarch64-linux-gnu/lib/ không có file libz nào.
   ══════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-26',
  minutes: 85,

  intro:
    '<p>Bài 26 mở hộp đen <code>aarch64-linux-gnu-gcc</code>. Bộ bài tập này kiểm tra xem bạn ' +
    'có thật sự cầm được từng mảnh trong hộp hay không — và quan trọng hơn, có phân biệt được ' +
    '<b>kiến trúc</b> với <b>ABI</b>, và <b>cây thư mục của máy build</b> với <b>cây thư mục ' +
    'của target</b> hay không. Hai nhầm lẫn đó là nguồn gốc của gần như mọi giờ bị mất trong ' +
    'Chặng 04.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong bài: phần <b>A</b> và <b>B</b>, khoảng ' +
    '<b>23 phút</b>.<br>' +
    '<b>Lượt 2</b> — làm sau <b>2–3 ngày</b>: phần <b>C</b>, <b>D</b> và <b>E</b>, khoảng ' +
    '<b>60 phút</b>. Khoảng cách giữa hai lượt không phải là sự trì hoãn: nhớ lại sau khi đã ' +
    'quên một phần thì bền hơn hẳn nhớ lại ngay.</p>' +
    '<p>Phần <b>E</b> cần một máy có WSL2 và gói <code>gcc-aarch64-linux-gnu</code>. Hãy ' +
    '<b>viết dự đoán ra trước</b> rồi mới gõ lệnh — chỗ dự đoán lệch với thực tế mới là chỗ ' +
    'bạn học được nhiều nhất.</p>',

  truc: [
    { id: 'abi',
      name: 'ABI — chứ không phải kiến trúc — quyết định hai file có ghép được không',
      x: 'Hai file .o cùng một kiến trúc vẫn có thể không liên kết được với nhau, vì ABI quy ' +
         'định tham số đi qua thanh ghi nào và kiểu dữ liệu rộng bao nhiêu byte.',
      mis: 'Cùng kiến trúc ARM thì file nào ghép với file nào cũng được; kiến trúc là thứ duy ' +
           'nhất phải khớp.' },

    { id: 'prefix',
      name: 'Công cụ đọc vỏ ELF thì chạy được với mọi kiến trúc, công cụ giải mã lệnh thì không',
      x: 'nm và readelf chỉ đọc metadata nên chạy đúng trên file lạ kiến trúc; objdump -d, ' +
         'strip và ld phải hiểu từng byte lệnh nên bản native mù hẳn.',
      mis: 'nm chạy được trên file ARM64, vậy cả bộ binutils native đều dùng được — tiền tố ' +
           'chỉ là thói quen gõ cho đẹp.' },

    { id: 'sysroot',
      name: 'Trình biên dịch cross tìm header và thư viện trong cây thư mục của target',
      x: 'Sysroot là cây thư mục gốc của target. Một thư viện đang nằm sẵn trên máy build vẫn ' +
         'là "không tồn tại" đối với trình biên dịch cross.',
      mis: 'Máy build đã cài zlib rồi thì -lz phải tìm thấy; trình biên dịch dùng chung thư ' +
           'viện của máy.' }
  ],

  /* ══════════════════════════════════════════════
     A · NHẬN BIẾT — 8 câu, máy chấm được hết
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Bạn có một file <code>.o</code> ARM64 và chỉ có bộ binutils <b>native</b> (x86-64). ' +
         'Điều gì quyết định một công cụ trong bộ đó có xử lý được file này hay không?',
      opts: [
        'Kích thước file — công cụ native chỉ đọc được file nhỏ hơn một ngưỡng nhất định',
        'Công cụ ấy chỉ cần đọc <b>metadata</b> của ELF, hay phải <b>giải mã từng byte lệnh</b> của kiến trúc lạ',
        'File đó được liên kết tĩnh hay động',
        'File đó còn bảng ký hiệu hay đã bị <code>strip</code>'
      ], a: 1,
      why: '<p>Khuôn dạng ELF — header, danh sách section, bảng ký hiệu, bảng relocation — ' +
           'giống hệt nhau ở mọi kiến trúc. Đọc những phần ấy không cần biết ISA, nên ' +
           '<code>nm</code> và <code>readelf</code> bản native trả lời đúng.</p>' +
           '<p>Ngược lại, <code>objdump -d</code> phải dịch ngược opcode, <code>strip</code> ' +
           'phải viết lại file cho đúng khuôn của kiến trúc, còn <code>ld</code> phải áp dụng ' +
           'relocation theo đúng luật của kiến trúc. Ba việc đó đòi hiểu ISA, và bản x86-64 ' +
           'không hiểu ISA của ARM64 — nó trả lời thẳng ' +
           '<code>architecture UNKNOWN</code> hoặc <code>file in wrong format</code>.</p>' +
           '<p>Vì vậy quy tắc thực dụng là: <b>không phân loại theo công cụ, phân loại theo ' +
           'việc</b>. Đọc metadata thì bản nào cũng được; đụng tới mã lệnh thì bắt buộc có ' +
           'tiền tố.</p>' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Định nghĩa nào mô tả đúng <b>sysroot</b>?',
      opts: [
        'Thư mục cài đặt của bộ toolchain chéo, nơi chứa các chương trình có tiền tố',
        'Một cây thư mục mô phỏng thư mục gốc của <b>target</b>, chứa header và thư viện của target — nơi trình biên dịch tìm <code>&lt;stdio.h&gt;</code> và <code>-lc</code> thay vì tìm trong <code>/usr</code> của máy build',
        'Thư mục gốc mà bạn <code>chroot</code> vào để build cho an toàn',
        'Thư mục chứa mã nguồn nhân Linux mà toolchain lấy header hệ thống từ đó'
      ], a: 1,
      why: '<p>Sysroot trả lời đúng một câu hỏi: <b>khi trình biên dịch cần một header hay một ' +
           'thư viện, nó phải nhìn vào cây thư mục nào?</b> Câu trả lời không thể là ' +
           '<code>/usr/include</code> của máy build, vì những file đó mô tả x86-64.</p>' +
           '<p>Phương án 1 sai vì đó là nơi chứa <i>công cụ</i>, không phải nơi chứa ' +
           '<i>vật liệu</i>. Phương án 3 mô tả một kỹ thuật khác (build trong chroot, có thật ' +
           'nhưng là chuyện khác). Phương án 4 nhầm sysroot với <code>KERNEL_HEADERS</code>: ' +
           'header của nhân chỉ là một phần nhỏ trong sysroot, phần lớn còn lại đến từ thư ' +
           'viện C.</p>' +
           '<p>Trên máy bạn, sysroot của <code>aarch64-linux-gnu-</code> là ' +
           '<code>/usr/aarch64-linux-gnu/</code>: <b>142</b> mục trong <code>include/</code> ' +
           'và <b>72</b> mục trong <code>lib/</code>.</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Mô tả nào bao đúng phạm vi của <b>ABI</b>?',
      opts: [
        'Tên hàm và kiểu tham số mà mã nguồn của bạn nhìn thấy',
        'Tham số đi qua thanh ghi nào, giá trị trả về ở đâu, kiểu dữ liệu rộng bao nhiêu byte, cấu trúc xếp byte ra sao, syscall gọi thế nào — toàn bộ ở mức <b>nhị phân</b>',
        'Tập lệnh mà CPU hiểu được',
        'Khuôn dạng file thực thi: ELF trên Linux, PE trên Windows'
      ], a: 1,
      why: '<p>Phương án 0 là <b>API</b>, không phải ABI. Khác biệt này rất thực tế: hai thư ' +
           'viện C có cùng API nghĩa là bạn <i>dịch lại</i> là chạy; cùng ABI mới nghĩa là ' +
           'nhị phân <i>dịch sẵn</i> dùng lại được.</p>' +
           '<p>Phương án 2 là <b>kiến trúc</b> (ISA) — và nhầm ABI với kiến trúc chính là ' +
           'hiểu lầm mà cả bộ bài tập này nhắm vào. Cùng một tập lệnh ARM 32-bit vẫn có ít ' +
           'nhất hai ABI số thực khác nhau, và hai file thuộc hai ABI ấy không ghép được ' +
           'với nhau.</p>' +
           '<p>Phương án 3 là khuôn dạng file: cần thiết nhưng không đủ. Hai file ELF hợp lệ, ' +
           'cùng <code>e_machine</code>, vẫn có thể xung khắc ABI.</p>' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trên máy bạn, <code>aarch64-linux-gnu-ld --version</code> báo <b>2.46</b> còn ' +
         '<code>aarch64-linux-gnu-gcc --version</code> báo <b>15.2.0</b>. Vì sao hai con số ' +
         'chẳng liên quan gì tới nhau?',
      opts: [
        'Cài đặt bị lệch phiên bản — nên gỡ ra cài lại cho khớp',
        'Vì <b>binutils</b> và <b>GCC</b> là hai dự án hoàn toàn độc lập, đóng gói riêng, đánh số riêng: một "toolchain" là mấy mảnh rời ghép lại chứ không phải một sản phẩm duy nhất',
        '<b>2.46</b> là số hiệu bản vá của GCC 15.2.0 dành riêng cho phần liên kết',
        '<code>ld</code> cũ hơn vì Ubuntu chưa cập nhật gói đó'
      ], a: 1,
      why: '<p>Bốn thành phần, bốn nguồn gốc khác nhau — và trên Ubuntu là bốn <b>gói</b> khác ' +
           'nhau, tra được bằng <code>dpkg -S</code>:</p>' +
           '<p><code>/usr/bin/aarch64-linux-gnu-ld</code> → ' +
           '<code>binutils-aarch64-linux-gnu</code> · ' +
           '<code>/usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1</code> → ' +
           '<code>cpp-15-aarch64-linux-gnu</code> · ' +
           '<code>/usr/aarch64-linux-gnu/lib/libc.so.6</code> → ' +
           '<code>libc6-arm64-cross</code> · ' +
           '<code>/usr/aarch64-linux-gnu/include/stdio.h</code> → ' +
           '<code>libc6-dev-arm64-cross</code>.</p>' +
           '<p>Hệ quả bạn sẽ gặp thật: khi một máy CI thiếu <i>một</i> trong bốn gói, thông ' +
           'báo lỗi chỉ tố cáo đúng mảnh thiếu, không nói gì về ba mảnh còn lại. Biết bộ đồ ' +
           'nghề gồm bốn mảnh là biết chỗ để nhìn.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<b>Phát biểu:</b> "Máy CI của tôi đã cài <code>binutils-aarch64-linux-gnu</code>, ' +
         '<code>gcc-aarch64-linux-gnu</code> và <code>libc6-arm64-cross</code>. Vậy là đủ để ' +
         'dịch một chương trình C cho ARM64."',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: còn thiếu gói nào, gói đó mang thứ gì, và vì sao ' +
          'thư viện C lại bị tách làm hai gói?',
      why: '<p><b>Sai.</b> <code>libc6-arm64-cross</code> chỉ mang phần <b>lúc chạy</b>: ' +
           '<code>libc.so.6</code>, <code>ld-linux-aarch64.so.1</code>. Muốn <i>dịch</i> thì ' +
           'còn cần <code>libc6-dev-arm64-cross</code> — gói mang <b>header</b> ' +
           '(<code>/usr/aarch64-linux-gnu/include/stdio.h</code>) và các file ' +
           '<code>crt*.o</code>.</p>' +
           '<p>Lý do tách: hai phần ấy đi tới hai nơi khác nhau. Phần runtime phải nằm trên ' +
           '<b>target</b> — trong rootfs của board, chiếm flash thật. Phần dev chỉ cần nằm ' +
           'trên <b>máy build</b> và không bao giờ được chép sang board. Gộp làm một thì mọi ' +
           'thiết bị đều phải mang theo hàng chục MB header mà nó không bao giờ đọc.</p>' +
           '<p>Triệu chứng khi thiếu gói dev: <code>fatal error: stdio.h: No such file or ' +
           'directory</code> — trong khi <code>aarch64-linux-gnu-gcc --version</code> vẫn ' +
           'chạy ngon lành, nên rất dễ đổ oan cho trình biên dịch.</p>',
      crit: [
        'Chỉ ra gói còn thiếu là <code>libc6-dev-arm64-cross</code> (hoặc nói rõ "gói -dev / gói header")',
        'Nói gói đó mang <b>header</b> (và/hoặc các file <code>crt*.o</code>)',
        'Giải thích lý do tách: phần runtime đi lên target, phần dev chỉ ở lại máy build'
      ] },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<b>Phát biểu:</b> "Khi tôi liên kết bằng <code>aarch64-linux-gnu-gcc</code>, điểm ' +
         'vào của chương trình là hàm <code>main</code> tôi viết."',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: điểm vào thật tên là gì, nó từ đâu ra, và ai đã ' +
          'lặng lẽ thêm nó vào?',
      why: '<p><b>Sai.</b> Trên máy bạn, <code>readelf -h hello</code> in ' +
           '<code>Entry point address: 0x680</code>, còn ' +
           '<code>aarch64-linux-gnu-nm hello</code> cho thấy ' +
           '<code>0000000000000680 T _start</code> và ' +
           '<code>00000000000007a8 T main</code>. Nhân nhảy vào <code>_start</code>, không ' +
           'phải vào <code>main</code>.</p>' +
           '<p><code>_start</code> nằm trong <code>crt1.o</code> — một trong năm file ' +
           '<code>crt*.o</code> mà <b>driver <code>gcc</code></b> tự thêm vào dòng lệnh liên ' +
           'kết mà không nói với bạn. Nó dựng <code>argc</code>/<code>argv</code>/' +
           '<code>environ</code>, gọi phần khởi tạo của thư viện C, rồi mới gọi ' +
           '<code>main</code>, và khi <code>main</code> trả về thì nó gọi <code>exit()</code>.</p>' +
           '<p>Bằng chứng trực tiếp: gọi thẳng trình liên kết ' +
           '(<code>aarch64-linux-gnu-ld hello.o -o hello-ld</code>) thì bạn nhận được ' +
           '<code>warning: cannot find entry symbol _start; defaulting to ' +
           '00000000004000b0</code> — vì không có driver nào thêm <code>crt1.o</code> hộ bạn ' +
           'nữa. Bạn sẽ gặp lại đúng cảnh này ở phần E.</p>',
      crit: [
        'Nêu đúng tên điểm vào: <code>_start</code>',
        'Chỉ ra nó đến từ <code>crt1.o</code> (hoặc "một file crt*.o của thư viện C")',
        'Nói rõ chính <b>driver gcc</b> tự thêm file đó vào dòng liên kết, không phải bạn'
      ] },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Trên ARM64 Linux, <code>int</code> rộng 4 byte còn <code>long</code> và con trỏ đều ' +
         'rộng 8 byte. Mô hình kiểu dữ liệu này có tên viết tắt là __________ . ' +
         '(ARM 32-bit dùng mô hình còn lại, '   +
         '<code>long</code> chỉ 4 byte.)',
      ph: 'viết tắt 4 ký tự',
      a: ['LP64', 'lp64', 'Lp64', 'LP 64', 'lp 64'],
      why: '<p><b>LP64</b>: <b>L</b>ong và <b>P</b>ointer là <b>64</b> bit. ARM 32-bit dùng ' +
           '<b>ILP32</b>: <b>I</b>nt, <b>L</b>ong và <b>P</b>ointer đều <b>32</b> bit.</p>' +
           '<p>Cái tên đáng nhớ vì nó cho bạn biết ngay <i>cái gì</i> đổi khi chuyển kiến ' +
           'trúc: không phải <code>int</code> (4 byte ở cả hai), mà là <code>long</code> và ' +
           'con trỏ. Mọi dòng mã ngầm giả định "<code>long</code> chứa vừa một con trỏ" đều ' +
           'đúng trên máy bàn và sai trên ARM32 — và trình biên dịch <b>không</b> có gì để ' +
           'cảnh báo, vì <code>sizeof(long)</code> vẫn hợp lệ, chỉ là bằng 4.</p>' +
           '<p>Cách phòng: dùng <code>uintptr_t</code>, <code>int32_t</code>, ' +
           '<code>int64_t</code> trong <code>&lt;stdint.h&gt;</code> thay cho ' +
           '<code>long</code> trần.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi thành phần với <b>vai trò</b> của nó trong một lần dịch. Cả sáu đều là ' +
         'đường dẫn hoặc file có thật trên máy bạn — hãy ghép theo <i>việc nó làm</i>, đừng ' +
         'ghép theo cái tên trông quen.',
      left: [
        '<code>cc1</code>',
        '<code>as</code>',
        '<code>collect2</code>',
        '<code>libgcc.a</code> (3 210 472 byte, 398 thành viên)',
        '<code>libc.so.6</code> (1 781 952 byte, 3 078 ký hiệu)',
        '<code>/usr/aarch64-linux-gnu/include/</code> (142 mục)'
      ],
      right: [
        'Lắp ráp mã assembly thành file <code>.o</code>',
        'Header của target — phần sysroot mà trình biên dịch đọc <b>lúc dịch</b>',
        'Dịch C thành assembly — đây mới là trình biên dịch thật sự, phần còn lại chỉ điều phối',
        'Cung cấp những phép toán mà CPU đích <b>không có lệnh</b> để làm, ví dụ chia 64-bit trên ARM32',
        'Lớp bọc gọi <code>ld</code> để liên kết, đồng thời lo phần khởi tạo của C++',
        'Hiện thực <code>printf</code>, <code>malloc</code> và lớp bọc syscall — nạp <b>lúc chạy</b> trên target'
      ],
      a: [2, 0, 4, 3, 5, 1],
      why: '<p>Hai cặp dễ lẫn nhất nằm ở đây, và ranh giới giữa chúng chính là điều bài học ' +
           'muốn bạn cầm được.</p>' +
           '<p><b><code>libgcc.a</code> và <code>libc.so.6</code>.</b> Cả hai đều "tự động ' +
           'được liên kết vào", nhưng khác nhau ở <i>ai sinh ra lời gọi</i>: hàm trong ' +
           '<code>libc</code> là hàm <b>bạn</b> gọi (<code>printf</code>, ' +
           '<code>malloc</code>); hàm trong <code>libgcc</code> là hàm <b>trình biên dịch</b> ' +
           'gọi thay bạn khi CPU thiếu lệnh (<code>__aeabi_ldivmod</code> cho một dấu ' +
           '<code>/</code> giữa hai <code>long long</code>).</p>' +
           '<p><b><code>as</code> và <code>collect2</code>.</b> Cả hai đều thuộc "phần sau" ' +
           'của quá trình, nhưng <code>as</code> làm việc trên <i>một</i> file, còn ' +
           '<code>collect2</code> (bọc <code>ld</code>) làm việc trên <i>toàn bộ</i> tập file ' +
           'cộng với các thư viện. Đó là lý do lỗi ABI nổ ra ở ' +
           '<code>collect2</code>/<code>ld</code> chứ không bao giờ ở <code>as</code>: chỉ ' +
           'lúc ghép mới có hai bên để mà so.</p>' }
  ],

  /* ══════════════════════════════════════════════
     B · THÔNG HIỂU — 6 câu tự luận, tự chấm theo tiêu chí
     Nhắc: sol/why/crit là HTML thô, xuống dòng bị nuốt.
     Dùng <p>…</p>, và mọi transcript phải nằm trong solBlocks.
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Đọc output', truc: 1, rows: 6,
      q: 'Bốn lệnh dưới đây chạy trên <b>cùng một file</b> <code>sum-arm64.o</code> ' +
         '(ELF 64-bit, ARM aarch64), bằng bộ binutils <b>native x86-64</b>. Một lệnh thành ' +
         'công, ba lệnh thất bại — và ba lỗi lại nói ba kiểu khác nhau. Giải thích cơ chế: ' +
         '<b>vì sao lệnh thứ nhất qua được</b>, và <b>ba lệnh kia vấp phải cái gì mà lệnh ' +
         'thứ nhất không phải vấp</b>?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ nm sum-arm64.o\n' +
            '0000000000000014 r $d\n' +
            '0000000000000000 t $x\n' +
            '0000000000000000 T f\n' +
            '0000000000000020 T sum\n' +
            '$ echo $?\n' +
            '0\n' +
            '\n' +
            '$ objdump -d sum-arm64.o\n' +
            '\n' +
            'sum-arm64.o:     file format elf64-little\n' +
            '\n' +
            'objdump: can\'t disassemble for architecture UNKNOWN!\n' +
            '$ echo $?\n' +
            '1\n' +
            '\n' +
            '$ strip sum-arm64.o\n' +
            'strip: Unable to recognise the architecture of the input file `sum-arm64.o\'\n' +
            '\n' +
            '$ ld hello.o -o hello\n' +
            '/usr/bin/x86_64-linux-gnu-ld.bfd: hello.o: Relocations in generic ELF (EM: 183)\n' +
            '/usr/bin/x86_64-linux-gnu-ld.bfd: hello.o: error adding symbols: file in wrong format' }
      ],
      hint: 'Hỏi từng lệnh một: nó cần biết <i>khuôn dạng file</i>, hay cần biết <i>bảng lệnh ' +
            'của CPU</i>? Và để ý <code>objdump</code> vẫn in được dòng ' +
            '<code>file format elf64-little</code> <b>trước khi</b> báo lỗi.',
      crit: [
        'Nói được <code>nm</code> chỉ đọc <b>metadata / bảng ký hiệu</b> của ELF, mà phần đó có khuôn dạng giống nhau ở mọi kiến trúc',
        'Nói được ba lệnh kia cần <b>hiểu tập lệnh</b> của kiến trúc: <code>objdump -d</code> để dịch ngược opcode, <code>strip</code> để viết lại file đúng khuôn, <code>ld</code> để áp dụng relocation',
        'Chỉ ra <code>objdump</code> nhận ra <b>khuôn dạng</b> (<code>elf64-little</code>) nhưng không nhận ra <b>kiến trúc</b> — hai tầng khác nhau',
        'Nhận ra <code>EM: 183</code> là mã kiến trúc AArch64, tức <code>ld</code> đọc được file nhưng từ chối vì luật relocation là của kiến trúc khác',
        'Rút ra quy tắc dùng được: đọc metadata thì công cụ nào cũng xong, đụng tới mã lệnh thì bắt buộc dùng bản có tiền tố'
      ],
      sol:
        '<p>Có <b>hai tầng</b> trong một file ELF, và bốn lệnh này rơi vào hai tầng khác nhau.</p>' +
        '<p><b>Tầng vỏ</b> — ELF header, bảng section, bảng ký hiệu, bảng relocation — được ' +
        'chuẩn hoá <i>giống hệt nhau</i> cho mọi kiến trúc. Muốn liệt kê tên hàm thì chỉ cần ' +
        'đi theo con trỏ trong các bảng ấy; không cần biết một byte opcode nào. Vì thế ' +
        '<code>nm</code> bản x86-64 in ra bảng ký hiệu đúng và thoát 0. <code>readelf</code> ' +
        'cũng vậy.</p>' +
        '<p><b>Tầng ruột</b> — nội dung của <code>.text</code>, và ý nghĩa của từng kiểu ' +
        'relocation — thì hoàn toàn phụ thuộc kiến trúc. Ba lệnh còn lại đều phải bước vào ' +
        'tầng này:</p>' +
        '<p><code>objdump -d</code> phải <b>dịch ngược</b> từng byte thành lệnh. Hãy để ý nó ' +
        'in được <code>file format elf64-little</code> trước rồi mới gãy: nó nhận ra khuôn ' +
        'dạng, chỉ không nhận ra <i>bảng lệnh</i> — đúng chữ <code>architecture ' +
        'UNKNOWN</code>.</p>' +
        '<p><code>strip</code> phải <b>viết lại</b> file: bỏ section, dồn offset, sửa lại ' +
        'header. Viết sai một trường là hỏng file, nên nó từ chối ngay khi không nhận ra kiến ' +
        'trúc thay vì làm bừa.</p>' +
        '<p><code>ld</code> phải <b>áp dụng relocation</b>. <code>EM: 183</code> chính là ' +
        '<code>e_machine</code> của AArch64: <code>ld</code> đọc được con số đó, hiểu rằng ' +
        'đây là kiến trúc nó không có luật relocation, và gọi thẳng là <code>file in wrong ' +
        'format</code>.</p>' +
        '<p>Quy tắc mang đi: <b>đừng phân loại theo công cụ, phân loại theo việc</b>. Đọc ' +
        'metadata thì bản native cũng xong; đụng tới mã lệnh thì bắt buộc có tiền tố. Cái bẫy ' +
        'nằm ở chỗ vế đầu chạy được — nó khiến bạn tin cả bộ đều dùng được, rồi Makefile hỏng ' +
        'ở đúng giữa chừng.</p>' },

    { id: 'b2', k: 'free', tag: 'Đọc output', truc: 2, rows: 6,
      q: 'Hai output dưới đây <b>mâu thuẫn nhau</b> nếu đọc theo nghĩa đen: lệnh thứ nhất nói ' +
         'toolchain chéo không có sysroot riêng (nó trả về <code>/</code>), lệnh thứ hai lại ' +
         'cho thấy nó tìm header trong một cây thư mục dành riêng cho ARM64. Hãy giải thích ' +
         'cả hai cùng đúng như thế nào — và nói xem <b>dòng cuối</b> trong danh sách của bản ' +
         'chéo (<code>/usr/include</code>) là bình thường hay đáng lo.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-gcc -print-sysroot\n' +
            '/\n' +
            '$ aarch64-linux-gnu-gcc -print-multiarch\n' +
            'aarch64-linux-gnu' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-gcc -E -v - < /dev/null 2>&1 | \\\n' +
            '      sed -n \'/#include <...>/,/End of search list/p\'\n' +
            '#include <...> search starts here:\n' +
            ' /usr/lib/gcc-cross/aarch64-linux-gnu/15/include\n' +
            ' /usr/lib/gcc-cross/aarch64-linux-gnu/15/../../../../aarch64-linux-gnu/include\n' +
            ' /usr/include\n' +
            'End of search list.' }
      ],
      hint: 'Rút gọn đường dẫn thứ hai đi (bốn lần <code>..</code> từ ' +
            '<code>…/aarch64-linux-gnu/15/</code>) rồi xem nó thật ra trỏ vào đâu. Và nhớ ' +
            'rằng <code>/usr/include</code> chứa hai loại header rất khác nhau.',
      crit: [
        'Rút gọn được đường dẫn thứ hai thành <code>/usr/aarch64-linux-gnu/include</code> và nhận ra đó chính là sysroot thật',
        'Giải thích <code>-print-sysroot</code> trả về <code>/</code> vì gói cross của Debian/Ubuntu dùng <b>multiarch</b>: không có một thư mục sysroot tách rời, đường dẫn được biên dịch sẵn vào driver',
        'Kết luận cách tra đúng là <code>gcc -E -v -</code> (hoặc <code>-print-search-dirs</code>), không phải <code>-print-sysroot</code>',
        'Giải thích <code>/usr/include</code> ở cuối danh sách là <b>bình thường</b> vì nơi đó chứa header <i>không phụ thuộc kiến trúc</i>; phần phụ thuộc kiến trúc nằm trong <code>bits/</code> của cây ARM64 và được tìm thấy <b>trước</b>',
        'Nêu được điều kiện an toàn: thứ tự tìm kiếm phải giữ nguyên — thêm <code>-I/usr/include</code> bằng tay sẽ đẩy header của máy build lên trước và làm hỏng đúng chỗ đó'
      ],
      sol:
        '<p>Đường dẫn thứ hai trông rối vì có bốn lần <code>..</code>. Rút gọn: từ ' +
        '<code>/usr/lib/gcc-cross/aarch64-linux-gnu/15/</code> lùi bốn cấp về ' +
        '<code>/usr/</code>, rồi đi tiếp <code>aarch64-linux-gnu/include</code> — tức là ' +
        '<code>/usr/aarch64-linux-gnu/include</code>. Đó chính là <b>sysroot</b>: 142 mục, ' +
        'header của ARM64.</p>' +
        '<p>Vậy sysroot có tồn tại. <code>-print-sysroot</code> trả về <code>/</code> không ' +
        'phải vì thiếu nó, mà vì gói cross của Debian/Ubuntu được dựng theo kiểu ' +
        '<b>multiarch</b>: thay vì gom mọi thứ vào một thư mục rồi khai báo thư mục ấy là ' +
        '"gốc giả", họ đặt từng phần vào chỗ chuẩn của hệ thống và <b>biên dịch sẵn đường ' +
        'dẫn vào driver</b>. Với driver, gốc vẫn là <code>/</code>; cái nó biết thêm là phải ' +
        'ghé <code>/usr/aarch64-linux-gnu</code> trước.</p>' +
        '<p>Kết luận thực dụng: <code>-print-sysroot</code> là câu hỏi sai. Muốn biết trình ' +
        'biên dịch thật sự nhìn vào đâu thì hỏi chính nó bằng <code>gcc -E -v -</code>. Đây ' +
        'là thói quen bạn nên giữ suốt chặng: <b>hỏi công cụ, đừng suy đoán</b>.</p>' +
        '<p>Còn <code>/usr/include</code> ở cuối danh sách thì <b>bình thường</b>, và lý do ' +
        'khá đẹp: phần lớn header chuẩn — <code>stdio.h</code>, <code>string.h</code> — ' +
        'không hề phụ thuộc kiến trúc. Phần phụ thuộc kiến trúc bị dồn hết vào ' +
        '<code>bits/</code>, và cây ARM64 đứng <b>trước</b> trong danh sách nên bản ARM64 của ' +
        '<code>bits/</code> luôn thắng.</p>' +
        '<p>Thứ tự ấy mới là thứ mong manh. Tự thêm <code>-I/usr/include</code> là đẩy cây ' +
        'của máy build lên đầu; khi đó <code>bits/</code> của x86-64 thắng, và bạn nhận về ' +
        'những lỗi vô nghĩa kiểu <code>gnu/stubs-32.h: No such file or directory</code>. ' +
        'Đừng chen tay vào danh sách này — để driver tự chọn.</p>' },

    { id: 'b3', k: 'free', tag: 'Bắt lỗi phát biểu', truc: 0, rows: 6,
      q: '<b>Phát biểu cần bắt lỗi:</b> "Board của tôi chạy CPU ARM Cortex-A7, 32-bit. Vậy ' +
         'thư viện <code>.a</code> nào được dịch cho ARM 32-bit tôi cũng dùng được — chỉ cần ' +
         'đúng kiến trúc là ghép được, còn lại là chuyện của trình liên kết." ' +
         'Chỉ ra chỗ sai, và dùng ba khối dữ liệu dưới đây làm bằng chứng.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ arm-linux-gnueabihf-readelf -A fadd-hf.o\n' +
            'File Attributes\n' +
            '  Tag_FP_arch: VFPv3-D16\n' +
            '  Tag_ABI_VFP_args: VFP registers\n' +
            '\n' +
            '$ arm-linux-gnueabihf-readelf -A fadd-soft.o\n' +
            'File Attributes\n' +
            '  Tag_FP_arch: VFPv3-D16' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ arm-linux-gnueabihf-objdump -d fadd-hf.o | sed -n \'/<fadd>:/,$p\'\n' +
            '00000000 <fadd>:\n' +
            '   0:\tee30 0a20 \tvadd.f32\ts0, s0, s1\n' +
            '   4:\t4770      \tbx\tlr\n' +
            '\n' +
            '$ arm-linux-gnueabihf-objdump -d fadd-soft.o | sed -n \'/<fadd>:/,$p\'\n' +
            '00000000 <fadd>:\n' +
            '   0:\tee07 0a10 \tvmov\ts14, r0\n' +
            '   4:\tee07 1a90 \tvmov\ts15, r1\n' +
            '   8:\tee77 7a27 \tvadd.f32\ts15, s14, s15\n' +
            '   c:\tee17 0a90 \tvmov\tr0, s15\n' +
            '  10:\t4770      \tbx\tlr' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ arm-linux-gnueabihf-gcc usefadd.o fadd-soft.o -o mixed\n' +
            '/usr/bin/arm-linux-gnueabihf-ld.bfd: error: mixed uses VFP register arguments, fadd-soft.o does not\n' +
            '/usr/bin/arm-linux-gnueabihf-ld.bfd: failed to merge target specific data of file fadd-soft.o\n' +
            'collect2: error: ld returned 1 exit status\n' +
            '$ echo $?\n' +
            '1' },
        { t: 'p', x: 'Chú ý: cả hai file <code>.o</code> đều là ARM 32-bit hợp lệ, đều dùng ' +
                    'cùng một lệnh <code>vadd.f32</code>, đều do cùng một trình biên dịch ' +
                    'sinh ra.' }
      ],
      hint: 'Cả hai file đều <i>tính toán</i> giống hệt nhau. Khác nhau ở chỗ giá trị đi vào ' +
            'hàm <b>bằng đường nào</b>. Đối chiếu <code>s0/s1</code> với <code>r0/r1</code>, ' +
            'rồi hỏi: nếu trình liên kết cứ ghép bừa thì chuyện gì xảy ra lúc chạy?',
      crit: [
        'Chỉ ra chỗ sai: kiến trúc giống nhau <b>không</b> đủ — còn phải cùng <b>ABI</b>',
        'Dùng <code>Tag_ABI_VFP_args: VFP registers</code> làm bằng chứng: thuộc tính đó có ở bản hard-float và <b>vắng</b> ở bản softfp, tức ABI được ghi thẳng trong file',
        'Đọc được hai đoạn mã: bản hf nhận tham số sẵn trong <code>s0</code>/<code>s1</code>, bản softfp nhận trong <code>r0</code>/<code>r1</code> rồi phải <code>vmov</code> sang thanh ghi VFP — <b>4 lệnh <code>vmov</code></b> thừa mỗi lời gọi',
        'Nói được nếu ghép bừa thì chương trình <b>không sập</b> mà đọc nhầm thanh ghi và cho kết quả rác — nên <code>ld</code> chặn lúc liên kết là hành vi đúng, không phải phiền hà',
        'Nêu cách tự kiểm tra trước khi nhận một <code>.a</code> từ vendor: <code>readelf -A</code> để so <code>Tag_ABI_VFP_args</code>'
      ],
      sol:
        '<p>Chỗ sai nằm gọn trong bốn chữ "chỉ cần đúng kiến trúc". <b>Kiến trúc</b> nói CPU ' +
        'hiểu được những lệnh nào. <b>ABI</b> nói hai hàm trao đổi dữ liệu với nhau ra sao. ' +
        'Hai file có thể trùng vế đầu và lệch vế sau — và đó chính là trường hợp ở đây.</p>' +
        '<p><code>readelf -A</code> cho thấy ABI không phải chuyện suy đoán: nó được ' +
        '<b>ghi thẳng vào file</b>. Bản hard-float mang <code>Tag_ABI_VFP_args: VFP ' +
        'registers</code>; bản softfp không mang thuộc tính ấy. Đó là hai giá trị khác nhau ' +
        'của cùng một trường, và trình liên kết đọc đúng trường đó.</p>' +
        '<p>Đoạn mã giải thích tại sao sự khác biệt lại nghiêm trọng. Bản hard-float coi tham ' +
        'số đã nằm sẵn trong <code>s0</code> và <code>s1</code>, nên cộng một lệnh là xong. ' +
        'Bản softfp coi tham số nằm trong <code>r0</code> và <code>r1</code>, nên phải chép ' +
        'sang VFP, cộng, rồi chép ngược lại — <b>4 lệnh <code>vmov</code></b> thừa cho mỗi ' +
        'lời gọi. Cùng một phép cộng, cùng một lệnh <code>vadd.f32</code>, hai giao ước khác ' +
        'nhau.</p>' +
        '<p>Bây giờ hình dung trình liên kết cứ ghép bừa: bên gọi đặt <code>1.5</code> vào ' +
        '<code>s0</code>, bên bị gọi đi đọc <code>r0</code>. Chương trình <b>không sập</b>. ' +
        'Nó chạy, in ra một con số rác, và bạn mất vài ngày. Vì vậy ' +
        '<code>failed to merge target specific data</code> là một thông báo <i>đáng mừng</i>: ' +
        'lỗi bị đẩy từ lúc chạy về lúc liên kết, từ chỗ khó tìm về chỗ dễ tìm.</p>' +
        '<p>Thói quen nên có: mỗi lần nhận một <code>.a</code> hay một <code>.so</code> từ ' +
        'nhà cung cấp board, chạy <code>readelf -A</code> trước khi tin cái tên file.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Khi bạn gõ <code>aarch64-linux-gnu-gcc hello.c -o hello</code>, thứ chạy không phải ' +
         'một chương trình mà là <b>bốn</b>: driver <code>gcc</code> lần lượt gọi ' +
         '<code>cc1</code>, <code>as</code>, rồi <code>collect2</code>. Giải thích ' +
         '<b>vì sao</b> người ta tách như vậy thay vì gộp tất cả vào một chương trình duy ' +
         'nhất. Nêu ít nhất hai lý do, và với mỗi lý do hãy chỉ ra một hệ quả bạn nhìn thấy ' +
         'được trong công việc hằng ngày.',
      hint: 'Nghĩ về việc GCC hỗ trợ nhiều <i>ngôn ngữ</i>, và về việc binutils với GCC là hai ' +
            'dự án khác nhau, phát hành theo hai lịch khác nhau. Và hỏi: nếu gộp làm một thì ' +
            'lệnh <code>-c</code> hay <code>-S</code> còn ý nghĩa gì?',
      crit: [
        'Lý do <b>nhiều ngôn ngữ, một hậu kỳ chung</b>: C, C++, Fortran, Go đều có phần đầu riêng (<code>cc1</code>, <code>cc1plus</code>…) nhưng dùng chung <code>as</code> và <code>ld</code> — hệ quả: cài thêm một ngôn ngữ chỉ tốn một gói <code>cc1*</code>',
        'Lý do <b>hai dự án độc lập</b>: binutils (2.46) và GCC (15.2.0) phát hành riêng — hệ quả: nâng cấp binutils không phải dựng lại GCC, và hai số phiên bản không cần khớp nhau',
        'Lý do <b>dừng được ở giữa</b>: mỗi giai đoạn có sản phẩm trung gian có thật, nên <code>-E</code>, <code>-S</code>, <code>-c</code> mới có nghĩa — hệ quả: gỡ lỗi được từng bước, và biết chính xác lỗi rơi vào giai đoạn nào',
        'Nêu vai trò còn lại của driver: nó không dịch, nó <b>ráp dòng lệnh</b> — chọn đường dẫn header, thêm các <code>crt*.o</code>, thêm <code>-lgcc</code> và <code>-lc</code>',
        'Chỉ ra cách tự kiểm chứng: <code>-###</code> in ra kế hoạch rồi dừng, không chạy gì'
      ],
      sol:
        '<p><b>Một: một hậu kỳ dùng chung cho nhiều ngôn ngữ.</b> GCC không chỉ dịch C. Mỗi ' +
        'ngôn ngữ có một phần đầu riêng — <code>cc1</code> cho C, <code>cc1plus</code> cho ' +
        'C++, <code>f951</code> cho Fortran — nhưng từ chỗ đã ra assembly trở đi thì mọi ' +
        'ngôn ngữ giống nhau, nên tất cả cùng dùng <code>as</code> và <code>ld</code>. Hệ ' +
        'quả bạn thấy được: thêm một ngôn ngữ chỉ là cài thêm một gói <code>cc1*</code>, phần ' +
        'còn lại của bộ đồ nghề không đụng tới.</p>' +
        '<p><b>Hai: binutils và GCC là hai dự án khác nhau.</b> Trên máy bạn chúng đang ở ' +
        '<b>2.46</b> và <b>15.2.0</b> — hai lịch phát hành, hai đội, hai gói Debian. Tách ' +
        'rời nghĩa là vá một lỗi trong trình liên kết không kéo theo việc dựng lại cả trình ' +
        'biên dịch. Hệ quả: đừng bao giờ hoảng khi thấy hai số phiên bản chẳng liên quan gì ' +
        'tới nhau.</p>' +
        '<p><b>Ba: dừng được ở giữa.</b> Vì mỗi giai đoạn kết thúc bằng một sản phẩm có thật ' +
        '(file <code>.i</code>, file <code>.s</code>, file <code>.o</code>) nên ' +
        '<code>-E</code>, <code>-S</code>, <code>-c</code> mới có nghĩa. Hệ quả rất thực tế ' +
        'khi gỡ lỗi: bạn khoanh được lỗi vào <i>một</i> giai đoạn — lỗi cú pháp là ' +
        '<code>cc1</code>, <code>undefined reference</code> là <code>ld</code> — thay vì đứng ' +
        'trước một hộp đen.</p>' +
        '<p>Vậy bản thân <code>gcc</code> làm gì? Nó <b>ráp dòng lệnh</b>: quyết định thư mục ' +
        'header nào được tìm và theo thứ tự nào, tự thêm năm file <code>crt*.o</code>, tự ' +
        'thêm <code>-lgcc</code> và <code>-lc</code> vào cuối. Đó là lượng công việc lặt vặt ' +
        'mà không ai muốn gõ tay — và cũng là lý do gọi thẳng <code>ld</code> gần như luôn ' +
        'hỏng.</p>' +
        '<p>Muốn xem tận mắt: <code>aarch64-linux-gnu-gcc -### hello.c -o hello</code> in ra ' +
        'toàn bộ kế hoạch rồi <b>dừng</b>, không chạy chương trình nào cả.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 5,
      q: 'Hai thư viện dưới đây đều "tự động được liên kết vào" mà bạn không viết cờ nào. ' +
         'Trong tất cả những điểm khác nhau giữa chúng, <b>điểm khác biệt nào là điểm quyết ' +
         'định</b> — nghĩa là điểm mà nếu bạn nắm sai thì sẽ chẩn đoán sai một lỗi thật? ' +
         'Trình bày trong 3–5 câu.',
      blocks: [
        { t: 'table',
          head: ['', '<code>libgcc.a</code>', '<code>libc.so.6</code> (ARM64)'],
          rows: [
            ['Kích thước đo trên máy bạn', '3 210 472 byte', '1 781 952 byte'],
            ['Số thành viên / ký hiệu', '398 thành viên <code>.o</code>', '3 078 ký hiệu'],
            ['Gói Debian', '<code>libgcc-15-dev-arm64-cross</code> (đi cùng GCC)',
             '<code>libc6-arm64-cross</code>'],
            ['Ví dụ một ký hiệu bên trong', '<code>__aeabi_ldivmod</code>',
             '<code>printf</code>, <code>malloc</code>']
          ]}
      ],
      hint: 'Đừng so kích thước. Hỏi: <b>ai</b> viết ra lời gọi tới hàm trong mỗi thư viện — ' +
            'bạn, hay trình biên dịch?',
      crit: [
        'Nêu đúng điểm quyết định: hàm trong <code>libc</code> là hàm <b>bạn</b> gọi trong mã nguồn; hàm trong <code>libgcc</code> là hàm <b>trình biên dịch</b> sinh ra thay bạn',
        'Giải thích lý do tồn tại của <code>libgcc</code>: CPU đích thiếu lệnh cho một phép toán (chia 64-bit, số thực trên CPU không có FPU…), nên trình biên dịch thay phép toán bằng một lời gọi hàm',
        'Nói được hệ quả chẩn đoán: gặp <code>undefined reference</code> tới một ký hiệu <b>không có trong mã nguồn của bạn</b> (<code>__aeabi_…</code>, <code>__udivdi3</code>) thì thủ phạm là <code>libgcc</code>, thêm <code>-lc</code> vô ích',
        'Nêu điều kiện gặp lỗi này trong thực tế: khi tự gọi <code>ld</code> hoặc dùng <code>-nostdlib</code>, tức là bỏ qua driver — vì chính driver mới là chỗ tự thêm <code>-lgcc</code>',
        'Không lấy kích thước hay số ký hiệu làm điểm khác biệt chính (đó là hệ quả, không phải nguyên nhân)'
      ],
      sol:
        '<p>Kích thước, số ký hiệu, tên gói — đều là hệ quả. Điểm khác biệt quyết định là ' +
        '<b>ai sinh ra lời gọi</b>.</p>' +
        '<p>Hàm trong <code>libc.so.6</code> là hàm <b>bạn</b> gõ: bạn viết ' +
        '<code>printf</code>, bạn viết <code>malloc</code>. Tìm ngược từ ký hiệu về mã nguồn ' +
        'là chuyện dễ — nó nằm ngay trong file <code>.c</code> của bạn.</p>' +
        '<p>Hàm trong <code>libgcc.a</code> thì <b>không ai gõ cả</b>. Bạn viết một dấu ' +
        '<code>/</code> giữa hai biến <code>long long</code>; trình biên dịch nhìn vào ARM32, ' +
        'thấy CPU không có lệnh chia 64-bit, nên nó âm thầm thay phép chia ấy bằng ' +
        '<code>bl __aeabi_ldivmod</code>. Ký hiệu đó là do <i>trình biên dịch</i> tạo ra, nên ' +
        '<i>trình biên dịch</i> phải mang theo phần hiện thực — và nó mang trong ' +
        '<code>libgcc</code>.</p>' +
        '<p>Nắm sai điểm này thì bạn chẩn đoán sai đúng một lỗi rất hay gặp: ' +
        '<code>undefined reference to `__aeabi_ldivmod\'</code>. Phản xạ tự nhiên là "thiếu ' +
        'thư viện C, thêm <code>-lc</code>" — và nó không giúp gì, vì thư viện C không hề ' +
        'chứa hàm ấy. Dấu hiệu nhận ra loại lỗi này: <b>ký hiệu không có trong mã nguồn của ' +
        'bạn</b>, thường bắt đầu bằng hai gạch dưới (<code>__aeabi_…</code>, ' +
        '<code>__udivdi3</code>, <code>__clzsi2</code>).</p>' +
        '<p>Và vì sao bình thường không ai gặp? Vì driver <code>gcc</code> tự thêm ' +
        '<code>-lgcc</code> vào cuối dòng liên kết. Lỗi chỉ nổ ra khi bạn bỏ qua driver — ' +
        'gọi thẳng <code>ld</code>, hoặc dùng <code>-nostdlib</code>. Bạn sẽ gặp lại nguyên ' +
        'cảnh này khi build module nhân ở Chặng 10.</p>' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Trong bốn thành phần của một toolchain, <b>thư viện C</b> là thành phần duy nhất mà ' +
         'người làm nhúng thật sự có quyền chọn (glibc / musl / uClibc-ng). Giải thích ' +
         '<b>vì sao</b> nó lại là chỗ có quyền chọn, và <b>vì sao</b> đổi lựa chọn ấy giữa ' +
         'chừng dự án lại đắt đến thế — dù cả ba đều là thư viện C và đều theo cùng một ' +
         'chuẩn ngôn ngữ.',
      hint: 'Ba thành phần kia đều bị kiến trúc và khuôn dạng file ép cứng. Còn với thư viện ' +
            'C, hãy tách hai chữ: cùng <b>API</b> có nghĩa gì, và cùng <b>ABI</b> có nghĩa gì?',
      crit: [
        'Giải thích vì sao ba thành phần kia không có chỗ để chọn: kiến trúc quyết định binutils và phần sinh mã của GCC, còn <code>libgcc</code> đi liền với GCC',
        'Nêu tiêu chí chọn thật: dung lượng flash, giấy phép (LGPL vs MIT), mức tương thích với phần mềm sẵn có, chất lượng liên kết tĩnh',
        'Phân biệt được <b>API</b> (mức mã nguồn — nên chỉ cần dịch lại) với <b>ABI</b> (mức nhị phân — nên phải dịch lại <b>toàn bộ</b>)',
        'Kết luận cái giá: đổi thư viện C là dịch lại mọi thứ trong rootfs, không chỉ chương trình của bạn; nhị phân do vendor cung cấp mà không có mã nguồn thì coi như mất',
        'Chỉ ra lựa chọn ấy được ghi ngay trong tên bộ ba: <code>gnu</code> = glibc, <code>musl</code> = musl, <code>uclibc</code> = uClibc-ng — nên đối chiếu tên toolchain với rootfs trước khi dùng'
      ],
      sol:
        '<p>Ba thành phần kia không cho bạn chỗ nào để chọn. <b>Binutils</b> phải biết đúng ' +
        'tập lệnh của kiến trúc; <b>phần sinh mã của GCC</b> cũng vậy; <b>libgcc</b> thì đi ' +
        'liền với GCC như hình với bóng. Kiến trúc đã chốt rồi thì cả ba đều bị chốt theo.</p>' +
        '<p><b>Thư viện C</b> thì khác: cùng một tập hàm chuẩn có thể được hiện thực nhiều ' +
        'cách. Nên ở đây mới có đánh đổi thật — dung lượng flash, giấy phép (LGPL của glibc ' +
        'so với MIT của musl), mức tương thích với phần mềm cũ, và chất lượng của liên kết ' +
        'tĩnh. Một thiết bị có 8 MB flash và một máy chủ có 8 GB RAM sẽ chọn khác nhau, và cả ' +
        'hai đều đúng.</p>' +
        '<p>Cái giá của việc đổi giữa chừng nằm ở khoảng cách giữa hai chữ. Ba thư viện có ' +
        '<b>API</b> gần như nhau: cùng <code>&lt;stdio.h&gt;</code>, cùng ' +
        '<code>printf()</code>. Nghĩa là <i>mã nguồn</i> của bạn hầu như không phải sửa.</p>' +
        '<p>Nhưng <b>ABI</b> của chúng khác nhau: cấu trúc <code>FILE</code> xếp byte khác, ' +
        'tên và phiên bản ký hiệu khác, trình nạp động khác ' +
        '(<code>/lib/ld-linux-aarch64.so.1</code> so với ' +
        '<code>/lib/ld-musl-aarch64.so.1</code>). Nên mọi <b>nhị phân</b> đã dịch sẵn đều ' +
        'phải dịch lại — không chỉ chương trình của bạn mà <i>toàn bộ</i> rootfs. Và nếu ' +
        'vendor giao cho bạn một <code>.so</code> không kèm mã nguồn thì coi như mất luôn ' +
        'thư viện đó.</p>' +
        '<p>May là lựa chọn này được ghi ngay trong tên: phần cuối bộ ba nói thẳng ' +
        '<code>gnu</code> = glibc, <code>musl</code> = musl, <code>uclibc</code> = ' +
        'uClibc-ng. Việc đầu tiên khi nhận một toolchain từ nhà sản xuất board là đối chiếu ' +
        'phần đuôi ấy với rootfs mà board đang chạy.</p>' }
  ],

  /* ══════════════════════════════════════════════
     C · VẬN DỤNG — 5 câu, tình huống KHÔNG có trong bài
     c1 T1 · c2 T0 · c3 T2 · c4, c5 không trục
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 1, rows: 6,
      q: 'Một đồng nghiệp đưa bạn Makefile dưới đây và nói: "Lạ lắm, biên dịch thì ngon, ' +
         'link cũng ngon, chạy <code>make</code> tới bước cuối mới gãy — mà mình có sửa gì ' +
         'bước cuối đâu." Hãy chỉ ra <b>chính xác dòng nào sai</b>, giải thích ' +
         '<b>vì sao ba bước đầu vẫn qua được</b>, và sửa lại.',
      blocks: [
        { t: 'code', where: 'file', nocopy: true, code:
            'CROSS = aarch64-linux-gnu-\n' +
            'CC    = $(CROSS)gcc\n' +
            'OBJCOPY = $(CROSS)objcopy\n' +
            'STRIP = strip\n' +
            'SIZE  = size\n' +
            '\n' +
            'app: main.o util.o\n' +
            '\t$(CC) $^ -o $@\n' +
            '\t$(SIZE) $@\n' +
            '\t$(STRIP) $@\n' +
            '\n' +
            '%.o: %.c\n' +
            '\t$(CC) -c $< -o $@' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ make\n' +
            'aarch64-linux-gnu-gcc -c main.c -o main.o\n' +
            'aarch64-linux-gnu-gcc -c util.c -o util.o\n' +
            'aarch64-linux-gnu-gcc main.o util.o -o app\n' +
            'size app\n' +
            '   text    data     bss     dec     hex filename\n' +
            '   1715     640       8    2363     93b app\n' +
            'strip app\n' +
            'strip: Unable to recognise the architecture of the input file `app\'\n' +
            'make: *** [Makefile:10: app] Error 1' },
        { t: 'p', x: 'Gợi ý đọc: hãy để ý dòng <code>size</code> ngay phía trên <b>vẫn in ra ' +
                     'số liệu đúng</b>.' }
      ],
      hint: 'Hai dòng <code>STRIP</code> và <code>SIZE</code> đều thiếu ' +
            '<code>$(CROSS)</code>, nhưng chỉ một dòng gãy. Vì sao dòng kia thoát?',
      crit: [
        'Chỉ đúng dòng sai: <code>STRIP = strip</code> thiếu <code>$(CROSS)</code> (và <code>SIZE = size</code> cũng thiếu, chỉ là chưa gãy)',
        'Giải thích ba bước đầu qua được vì chúng dùng <code>$(CC)</code>, mà <code>CC</code> có tiền tố',
        'Giải thích vì sao <code>size</code> không gãy còn <code>strip</code> gãy: <code>size</code> chỉ <b>đọc</b> bảng section (tầng vỏ), <code>strip</code> phải <b>viết lại</b> file nên cần hiểu kiến trúc',
        'Nhận ra đây là lỗi <b>ẩn</b>: <code>size</code> in ra số đúng nên không có dấu hiệu nào báo rằng nó cũng đang sai quy tắc',
        'Sửa đúng: <code>STRIP = $(CROSS)strip</code> và <code>SIZE = $(CROSS)size</code> — mọi công cụ đều lấy tiền tố từ một biến duy nhất'
      ],
      sol:
        '<p>Dòng sai là <code>STRIP = strip</code>. Nhưng câu chuyện thú vị hơn thế: ' +
        '<code>SIZE = size</code> <b>cũng</b> sai, mà nó không gãy — và chính chỗ đó mới là ' +
        'bài học.</p>' +
        '<p>Ba bước đầu qua được là vì cả ba đều đi qua <code>$(CC)</code>, và ' +
        '<code>CC = $(CROSS)gcc</code> có tiền tố đầy đủ. Bốn thao tác đó — dịch, dịch, ' +
        'link — không hề chạm vào <code>strip</code> hay <code>size</code>. Nói cách khác, ' +
        'khuyết tật đã nằm sẵn trong Makefile từ đầu; nó chỉ chưa được gọi tới.</p>' +
        '<p>Vì sao <code>size</code> thoát? Vì <code>size</code> chỉ <b>đọc</b> bảng section: ' +
        'cộng độ dài của <code>.text</code>, <code>.data</code>, <code>.bss</code> rồi in ' +
        'ra. Bảng section thì kiến trúc nào cũng cùng khuôn, nên bản x86-64 làm được ngon ' +
        'lành — và in ra <code>text 1715</code> hoàn toàn đúng.</p>' +
        '<p><code>strip</code> thì phải <b>viết lại</b> file: bỏ section, dồn offset, sửa lại ' +
        'header. Sai một byte là hỏng nhị phân, nên nó từ chối ngay khi không nhận ra kiến ' +
        'trúc.</p>' +
        '<p>Đó là kiểu lỗi khó chịu nhất: <b>một nửa số công cụ sai mà vẫn cho kết quả trông ' +
        'như đúng</b>. Nếu dự án chỉ dừng ở <code>size</code>, không ai phát hiện gì, cho tới ' +
        'ngày có người thêm một bước <code>objcopy</code> hay <code>strip</code>. Đừng vá ' +
        'riêng dòng gãy — sửa cả hai:</p>',
      solBlocks: [
        { t: 'code', where: 'file', code:
            'CROSS   ?= aarch64-linux-gnu-\n' +
            'CC       = $(CROSS)gcc\n' +
            'OBJCOPY  = $(CROSS)objcopy\n' +
            'STRIP    = $(CROSS)strip\n' +
            'SIZE     = $(CROSS)size' },
        { t: 'cal', kind: 'tip', title: 'Quy tắc kiểm tra Makefile chéo',
          x: 'Mọi công cụ nhị phân phải lấy tiền tố từ <b>một biến duy nhất</b>. Quét nhanh: ' +
             'grep tên các công cụ binutils trong Makefile, cái nào không đi kèm biến tiền ' +
             'tố là một quả mìn chưa nổ. Dùng <code>?=</code> để người khác đổi được tiền tố ' +
             'từ dòng lệnh — Bài 27 sẽ dùng đúng cách viết này.' }
      ] },

    { id: 'c2', k: 'free', tag: 'Tình huống mới', truc: 0, rows: 6,
      q: 'Bạn làm firmware cho một board ARM 32-bit có FPU. Toàn bộ dự án đang dùng ' +
         '<code>arm-linux-gnueabihf-gcc</code>. Nhà cung cấp cảm biến giao cho bạn ' +
         '<code>libsensor.a</code> — <b>không kèm mã nguồn</b> — và ' +
         '<code>readelf -A libsensor.a</code> cho thấy các thành viên bên trong ' +
         '<b>không có</b> dòng <code>Tag_ABI_VFP_args</code>. Bạn đã email hỏi, họ trả lời ' +
         'rằng bản dựng lại phải chờ ba tháng. Deadline của bạn là hai tuần. ' +
         'Hãy nêu <b>các phương án khả thi</b>, và chọn một phương án kèm lý do. ' +
         'Nói rõ phương án nào <b>không</b> làm được và vì sao.',
      hint: 'Trước hết xác định thư viện đó thuộc ABI nào. Rồi hỏi: ABI là thuộc tính của ' +
            'một <i>file</i>, hay của <i>toàn bộ chương trình</i>? Và có thứ gì đứng giữa hai ' +
            'ABI được không?',
      crit: [
        'Xác định đúng: thiếu <code>Tag_ABI_VFP_args</code> nghĩa là thư viện dùng ABI <b>softfp</b>, còn dự án đang là <b>hard-float</b> — hai bên không link được',
        'Loại bỏ phương án sai và nói được vì sao: không thể "ép" bằng cờ liên kết, không thể chỉ dịch lại một file, và <b>không thể</b> trộn hai ABI trong cùng một tiến trình',
        'Nêu phương án dựng lại toàn bộ dự án theo softfp (<code>arm-linux-gnueabi-</code> hoặc <code>-mfloat-abi=softfp</code>) — kèm cái giá: mọi thư viện khác, kể cả libc trong rootfs, cũng phải là softfp',
        'Nêu phương án tách tiến trình: chạy phần dùng <code>libsensor</code> thành một chương trình softfp riêng, giao tiếp qua pipe/socket — ABI chỉ ràng buộc bên trong một tiến trình',
        'Chọn một phương án và biện minh bằng ràng buộc thật (hai tuần, không có mã nguồn), không chỉ nói "tuỳ tình huống"'
      ],
      sol:
        '<p><b>Chẩn đoán trước.</b> Thiếu <code>Tag_ABI_VFP_args</code> nghĩa là thư viện ' +
        'được dịch theo <b>softfp</b>: tham số số thực đi qua thanh ghi số nguyên. Dự án của ' +
        'bạn là <b>hard-float</b>: tham số đi thẳng trong thanh ghi VFP. Cùng kiến trúc ARM, ' +
        'cùng có FPU, nhưng hai giao ước khác nhau — và trình liên kết sẽ chặn.</p>' +
        '<p><b>Ba thứ không làm được, nói ngay cho gọn:</b></p>',
      solBlocks: [
        { t: 'list', ordered: false, items: [
            '<b>Không có cờ nào "ép" hai bên hoà nhau.</b> <code>Tag_ABI_VFP_args</code> ' +
            'không phải một lời khuyên — nó mô tả mã máy đã sinh ra rồi. Muốn đổi thì phải ' +
            'sinh lại mã, tức là phải có mã nguồn.',
            '<b>Không thể chỉ dịch lại phần của bạn cho khớp một file.</b> ABI ràng buộc ' +
            '<i>mọi</i> ranh giới hàm trong tiến trình, kể cả ranh giới với libc.',
            '<b>Không thể trộn hai ABI trong một tiến trình.</b> Đây là ranh giới cứng, và ' +
            'nó cũng chính là gợi ý cho phương án hay nhất bên dưới.'
          ]},
        { t: 'p', x: '<b>Phương án 1 — dựng lại toàn bộ theo softfp.</b> Đổi sang ' +
                     '<code>arm-linux-gnueabi-</code> (hoặc thêm ' +
                     '<code>-mfloat-abi=softfp</code>) cho mọi thứ. Về lý thuyết thì sạch, ' +
                     'nhưng cái giá là <i>mọi</i> nhị phân trong rootfs — kể cả libc — cũng ' +
                     'phải là softfp. Nếu vendor board giao rootfs dựng sẵn theo hf thì bạn ' +
                     'phải dựng lại cả rootfs. Hai tuần thì không kịp, và bạn còn phải trả ' +
                     'thêm chi phí hiệu năng của những lệnh <code>vmov</code> thừa ở mọi lời ' +
                     'gọi số thực.' },
        { t: 'p', x: '<b>Phương án 2 — tách tiến trình.</b> Vì ABI chỉ ràng buộc ' +
                     '<i>bên trong</i> một tiến trình, hãy dựng một chương trình nhỏ ' +
                     '<code>sensord</code> theo softfp, chỉ chứa <code>libsensor.a</code> và ' +
                     'vài trăm dòng bọc quanh nó. Ứng dụng chính giữ nguyên hard-float và ' +
                     'nói chuyện với nó qua pipe hoặc Unix socket. Số liệu đi qua ranh giới ' +
                     'ấy là <i>byte</i>, không phải tham số hàm, nên không có ABI nào bị vi ' +
                     'phạm.' },
        { t: 'p', x: '<b>Chọn phương án 2</b>, vì nó khớp với ràng buộc thật: hai tuần, ' +
                     'không có mã nguồn, rootfs hard-float đã có sẵn. Nó cô lập vấn đề vào ' +
                     'một tiến trình nhỏ, và ba tháng nữa khi vendor giao bản hf thì bạn ' +
                     'nuốt <code>sensord</code> trở lại vào ứng dụng chính, xoá luôn lớp ' +
                     'giao tiếp. Phương án 1 chỉ đáng làm nếu dự án còn ở giai đoạn rất sớm ' +
                     'và bạn kiểm soát cả rootfs.' },
        { t: 'cal', kind: 'info', title: 'Điều đáng nhớ hơn cả câu trả lời',
          x: 'Bạn phát hiện ra vấn đề bằng <code>readelf -A</code> <b>trước khi</b> viết dòng ' +
             'mã nào. Nếu để tới lúc liên kết mới biết thì cũng vẫn kịp — nhưng nếu ' +
             '<code>ld</code> không chặn và bạn chỉ thấy cảm biến trả về số rác, ba tháng ' +
             'chờ vendor sẽ thành ba tháng nghi ngờ phần cứng.' }
      ] },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 2, rows: 6,
      q: 'Board mới của bạn đến kèm một tarball <code>sdk-rootfs.tar.gz</code> giải nén ra ' +
         'thành <code>/opt/vendor/sysroot/</code> — có <code>usr/include/openssl/ssl.h</code> ' +
         'và <code>usr/lib/libssl.so.3</code>. Máy build của bạn <b>không có mạng</b>, và ' +
         'trên máy chỉ có <code>aarch64-linux-gnu-gcc</code> của Ubuntu (gói cross, ' +
         'multiarch — như bạn đã đo ở phần B). Ứng dụng của bạn cần liên kết với OpenSSL. ' +
         'Trình bày cách làm, và giải thích <b>vì sao <code>-I/opt/vendor/sysroot/usr/include ' +
         '-L/opt/vendor/sysroot/usr/lib</code> là một cách làm dở</b> dù nó có thể chạy được.',
      hint: 'Có một cờ nói với driver "đổi gốc đi", khác hẳn với việc thêm vài thư mục vào ' +
            'cuối danh sách. Nghĩ xem hai cách khác nhau ở chỗ nào khi header của vendor ' +
            'lại <code>#include &lt;stdio.h&gt;</code>.',
      crit: [
        'Nêu đúng cách làm: dùng <code>--sysroot=/opt/vendor/sysroot</code> (và nếu cần, <code>-Wl,-rpath-link</code> để trình liên kết tìm được thư viện phụ thuộc)',
        'Giải thích <code>--sysroot</code> đổi <b>gốc</b> của toàn bộ quá trình tìm kiếm, còn <code>-I</code>/<code>-L</code> chỉ <b>thêm</b> vài thư mục vào một danh sách đã có',
        'Chỉ ra hậu quả cụ thể của cách dở: header của vendor <code>#include</code> tiếp các header hệ thống, và những cái đó vẫn bị tìm trong cây cũ — dễ trộn hai phiên bản libc',
        'Nêu rủi ro nghiêm trọng hơn: <b>trộn được mà không báo lỗi</b> — biên dịch xong, link xong, hỏng lúc chạy',
        'Nêu cách tự kiểm chứng bằng <code>gcc --sysroot=… -E -v -</code> để xem danh sách tìm kiếm đã đổi gốc thật chưa'
      ],
      sol:
        '<p><b>Cách làm:</b> nói với driver rằng gốc đã đổi.</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc --sysroot=/opt/vendor/sysroot \\\n' +
            '    app.c -lssl -lcrypto -o app\n' +
            '\n' +
            '# check that the driver really moved its search root:\n' +
            'aarch64-linux-gnu-gcc --sysroot=/opt/vendor/sysroot -E -v - < /dev/null 2>&1 | \\\n' +
            '    sed -n \'/#include <...>/,/End of search list/p\'' },
        { t: 'p', x: 'Nếu <code>libssl.so.3</code> lại phụ thuộc một thư viện khác trong ' +
                     'cùng sysroot, thêm ' +
                     '<code>-Wl,-rpath-link=/opt/vendor/sysroot/usr/lib</code> để trình liên ' +
                     'kết lần được chuỗi phụ thuộc.' },
        { t: 'p', x: '<b>Vì sao <code>-I</code> và <code>-L</code> là cách dở?</b> Vì hai cờ ' +
                     'ấy chỉ <i>thêm</i> thư mục vào đầu một danh sách vốn đã có sẵn ba mục ' +
                     '(bạn vừa in ra ở phần B) — chúng không <i>bỏ</i> mục nào cả. Còn ' +
                     '<code>--sysroot</code> thì đổi <b>gốc</b>: mọi đường dẫn mặc định được ' +
                     'tính lại từ chỗ mới.' },
        { t: 'p', x: 'Khác biệt ấy nổ ra ở chỗ bạn không nhìn thấy. ' +
                     '<code>openssl/ssl.h</code> của vendor sẽ ' +
                     '<code>#include &lt;stddef.h&gt;</code>, ' +
                     '<code>&lt;sys/types.h&gt;</code>… Với <code>-I</code>, những header ' +
                     'con ấy <i>vẫn</i> được tìm trong cây cũ — tức là header OpenSSL của ' +
                     'vendor đang ghép với header libc của Ubuntu. Hai bên có thể lệch phiên ' +
                     'bản, lệch cấu hình, lệch cả kích thước struct.' },
        { t: 'cal', kind: 'warn', title: 'Vì sao đây là loại lỗi tệ nhất',
          x: 'Trộn hai cây header thường <b>không</b> báo lỗi. Nó biên dịch sạch, liên kết ' +
             'sạch, rồi hỏng lúc chạy — một struct lệch vài byte, một hằng số khác giá trị. ' +
             'Bạn sẽ đi tìm bug trong mã của mình, trong khi thủ phạm nằm ở dòng lệnh biên ' +
             'dịch. Nguyên tắc: <b>một sysroot, một nguồn header</b>. Cần đổi cây thì đổi ' +
             'gốc, đừng chắp vá.' }
      ] },

    { id: 'c4', k: 'free', tag: 'Chẩn đoán', rows: 5,
      q: 'Một dự án thấy nhị phân ARM64 "phình vô lý" (70 KB cho một chương trình in ' +
         '<code>hello</code>) nên thêm <code>-Wl,-z,max-page-size=4096</code> vào cờ liên ' +
         'kết. File tụt xuống 9 KB, chạy thử trên QEMU thì tốt. Nhưng nạp lên board thật thì ' +
         'chương trình không khởi động được. Dựa vào hai output dưới đây, giải thích ' +
         '<b>cơ chế</b> đứng sau cả hai hiện tượng — vì sao file to, và vì sao bản nhỏ lại ' +
         'chết trên board.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-readelf -l hello64k | grep -A1 \'LOAD\' | head -4\n' +
            '  LOAD           0x0000000000000000 0x0000000000000000 0x0000000000000000\n' +
            '                 0x0000000000000904 0x0000000000000904  R E    0x10000\n' +
            '  LOAD           0x000000000000fd90 0x000000000001fd90 0x000000000001fd90\n' +
            '                 0x0000000000000280 0x0000000000000288  RW     0x10000\n' +
            '\n' +
            '$ aarch64-linux-gnu-readelf -l hello4k | grep -A1 \'LOAD\' | head -4\n' +
            '  LOAD           0x0000000000000000 0x0000000000000000 0x0000000000000000\n' +
            '                 0x0000000000000904 0x0000000000000904  R E    0x1000\n' +
            '  LOAD           0x0000000000000d90 0x0000000000001d90 0x0000000000001d90\n' +
            '                 0x0000000000000280 0x0000000000000288  RW     0x1000' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ ls -l hello64k hello4k\n' +
            '-rwxr-xr-x 1 user user 70448 hello64k\n' +
            '-rwxr-xr-x 1 user user  9008 hello4k\n' +
            '$ aarch64-linux-gnu-size hello64k hello4k\n' +
            '   text    data     bss     dec     hex filename\n' +
            '   1635     640       8    2283     8eb hello64k\n' +
            '   1635     640       8    2283     8eb hello4k' }
      ],
      hint: 'Cột <code>text</code> giống hệt nhau ở cả hai file — vậy 61 KB chênh lệch là ' +
            'cái gì? Và con số <code>0x10000</code> nói lên điều gì về <i>giả định</i> mà ' +
            'trình liên kết đang đặt ra với nhân?',
      crit: [
        'Nhận ra <code>text</code>/<code>data</code>/<code>bss</code> <b>giống hệt nhau</b>, nên 61 KB chênh lệch không phải là mã lệnh',
        'Giải thích phần chênh lệch là <b>byte đệm 0</b>: mỗi segment <code>LOAD</code> phải bắt đầu ở bội số của <code>align</code>, và <code>0x10000</code> = 65 536',
        'Giải thích vì sao mặc định lại là 64 K: ARM64 cho phép nhân dùng trang 4 K, 16 K hoặc 64 K, nên trình liên kết chọn giá trị <b>lớn nhất</b> để file chạy được với mọi cấu hình',
        'Giải thích vì sao bản 4 K chết trên board: nhân của board dùng trang 16 K hoặc 64 K, segment không còn thẳng hàng với trang nên không ánh xạ được',
        'Giải thích vì sao QEMU không phát hiện ra: nhân dùng để thử có kích thước trang khác với nhân trên board — thử trên máy giả lập không thay được việc thử đúng cấu hình đích'
      ],
      sol:
        '<p><b>Vì sao file to.</b> So ba cột của <code>size</code>: ' +
        '<code>1635 / 640 / 8</code> — <b>giống hệt nhau</b> ở cả hai file. Nội dung thật y ' +
        'nguyên. Vậy 61 KB chênh lệch không phải mã lệnh mà là <b>byte 0 đệm vào</b>.</p>' +
        '<p>Lý do nằm ở con số <code>0x10000</code> trong cột <code>align</code>: 65 536. ' +
        'Nhân ánh xạ file vào bộ nhớ theo từng <i>trang</i>, nên mỗi segment ' +
        '<code>LOAD</code> phải bắt đầu tại một offset là bội số của kích thước trang. Với ' +
        'align 64 K, khoảng trống giữa các segment được nhồi đầy số 0 cho tròn — đó là 61 KB ' +
        'kia.</p>' +
        '<p>Vì sao mặc định lại là 64 K chứ không phải 4 K? Vì ARM64 <b>không quy định một ' +
        'kích thước trang duy nhất</b>: nhân có thể được cấu hình 4 K, 16 K hoặc 64 K. Trình ' +
        'liên kết không biết board của bạn chọn cái nào, nên nó chọn giá trị <i>lớn nhất</i> ' +
        '— file thẳng hàng theo 64 K thì cũng tự động thẳng hàng theo 16 K và 4 K. Đây là ' +
        'sự đánh đổi có chủ ý: <b>đổi dung lượng lấy tính di động</b>.</p>' +
        '<p><b>Vì sao bản nhỏ chết trên board.</b> Ép <code>max-page-size=4096</code> là ' +
        'khai với trình liên kết rằng nhân đích dùng trang 4 K. Nếu nhân của board thật ' +
        'dùng 16 K hoặc 64 K, segment không còn nằm đúng biên trang, và nhân không ánh xạ ' +
        'được — chương trình chết trước khi chạy được lệnh đầu tiên.</p>' +
        '<p><b>Vì sao QEMU không bắt được.</b> Vì bạn thử với một nhân khác. Nhân trên QEMU ' +
        'có thể là 4 K, board là 64 K; cả hai đều là ARM64 nên phần kiến trúc không sai chỗ ' +
        'nào. Kích thước trang là thuộc tính của <b>cấu hình nhân</b>, không phải của kiến ' +
        'trúc — bạn sẽ đặt đúng tuỳ chọn ấy bằng tay ở Chặng 07 khi cấu hình nhân.</p>' +
        '<p>Kết luận thực dụng: cờ này <i>được phép</i> dùng, nhưng chỉ khi bạn biết chắc ' +
        'kích thước trang của nhân đích (<code>getconf PAGESIZE</code> trên board). Và nếu ' +
        'mục tiêu chỉ là làm file nhỏ đi, đây không phải công cụ đúng — 61 KB số 0 sẽ biến ' +
        'mất gần hết khi nén rootfs.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', rows: 5,
      q: 'Bạn nhận một board đã có sẵn rootfs, không có tài liệu. Bạn chạy được lệnh trên ' +
         'board và thu được ba dòng dưới đây. Trong ba bộ toolchain mà công ty đang có, ' +
         '<b>chọn một</b> và biện minh; với hai bộ còn lại, nói rõ nó sai ở điểm nào và triệu ' +
         'chứng bạn sẽ gặp nếu lỡ dùng nó.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '# uname -m\n' +
            'aarch64\n' +
            '# ls -l /lib/ld-*\n' +
            'lrwxrwxrwx 1 root root 27 /lib/ld-linux-aarch64.so.1 -> /lib/libc.so.6\n' +
            '# getconf LONG_BIT\n' +
            '64' },
        { t: 'table',
          head: ['Bộ', 'Tiền tố', 'Ghi chú trên nhãn'],
          rows: [
            ['①', '<code>aarch64-linux-musl-</code>', 'nhỏ gọn, hay dùng cho thiết bị ít flash'],
            ['②', '<code>aarch64-linux-gnu-</code>', 'bộ chuẩn của Ubuntu, đang có sẵn trên máy'],
            ['③', '<code>arm-linux-gnueabihf-</code>', 'đã dùng cho dự án board cũ']
          ]}
      ],
      hint: 'Đọc bộ ba từ phải sang trái. Trường nào trong ba dòng output trả lời cho ' +
            '<i>trường nào</i> của bộ ba?',
      crit: [
        'Chọn ② <code>aarch64-linux-gnu-</code> và ghép được từng trường: <code>uname -m</code> → <code>aarch64</code>, tên loader <code>ld-linux-aarch64.so.1</code> → glibc → <code>gnu</code>',
        'Loại ③ vì sai <b>kiến trúc</b>: <code>arm-</code> là ARM 32-bit, không khớp <code>aarch64</code> và <code>LONG_BIT 64</code>',
        'Loại ① vì sai <b>thư viện C</b>: musl dùng loader tên <code>ld-musl-aarch64.so.1</code>, khác với cái đang có trên board',
        'Nêu triệu chứng khác nhau của hai lỗi: dùng ③ thì lỗi sớm và rõ (<code>Exec format error</code> hoặc trình liên kết từ chối); dùng ① thì <b>build sạch</b> rồi chết lúc chạy vì không tìm thấy trình nạp động',
        'Nêu cách xác nhận sau khi build: <code>readelf -l</code> để xem <code>program interpreter</code> có trùng với đường dẫn loader trên board không'
      ],
      sol:
        '<p><b>Chọn ② <code>aarch64-linux-gnu-</code>.</b> Cách ghép là đọc bộ ba từ phải ' +
        'sang trái, mỗi trường tìm một bằng chứng:</p>',
      solBlocks: [
        { t: 'table',
          head: ['Trường trong bộ ba', 'Bằng chứng trên board', 'Kết luận'],
          rows: [
            ['kiến trúc — <code>aarch64</code>', '<code>uname -m</code> → <code>aarch64</code>, ' +
             '<code>getconf LONG_BIT</code> → <code>64</code>', 'ARM 64-bit, mô hình LP64'],
            ['hệ điều hành — <code>linux</code>', 'có <code>/lib</code>, có <code>uname</code>',
             'Linux'],
            ['thư viện C — <code>gnu</code>', '<code>ld-linux-aarch64.so.1</code>',
             'đây là tên trình nạp động của <b>glibc</b>; musl sẽ là ' +
             '<code>ld-musl-aarch64.so.1</code>']
          ]},
        { t: 'p', x: '<b>Vì sao loại ③.</b> <code>arm-</code> là ARM 32-bit — sai ngay ở ' +
                     'trường đầu tiên. Đây là loại lỗi <i>dễ chịu</i>: nó lộ ra sớm và ồn ' +
                     'ào. Trình liên kết sẽ từ chối trộn object 32-bit với thư viện 64-bit, ' +
                     'hoặc nếu bạn dựng được cả một nhị phân 32-bit thuần thì board trả về ' +
                     '<code>Exec format error</code> ngay lần chạy đầu.' },
        { t: 'p', x: '<b>Vì sao loại ①.</b> musl cũng là ARM64, cũng là Linux — chỉ khác ' +
                     'thư viện C. Và đây mới là loại lỗi <i>khó chịu</i>: trên máy build mọi ' +
                     'thứ <b>sạch sẽ</b>, biên dịch xong, liên kết xong, không một cảnh báo. ' +
                     'Chép sang board thì gặp một thông báo trông rất vô lý — kiểu ' +
                     '<code>No such file or directory</code> cho một file rõ ràng đang nằm ' +
                     'đó. "File không tồn tại" ấy không nói về chương trình của bạn, nó nói ' +
                     'về <b>trình nạp động</b> ghi bên trong chương trình: board không có ' +
                     '<code>/lib/ld-musl-aarch64.so.1</code>.' },
        { t: 'cal', kind: 'tip', title: 'Xác nhận trước khi chép sang board',
          x: 'Sau khi build, chạy <code>aarch64-linux-gnu-readelf -l app | grep ' +
             'interpreter</code>. Chuỗi in ra phải trùng <i>từng ký tự</i> với đường dẫn ' +
             'loader bạn thấy trên board. Một lệnh, năm giây, tránh được nguyên buổi chiều ' +
             'ngờ vực. Bài 27 sẽ mổ xẻ kỹ chuỗi này.' }
      ] },
  ],

  /* ══════════════════════════════════════════════
     D · ÔN XEN KẼ — 3 câu về bài CŨ mà Bài 26 đứng lên trên
     d1 Bài 25 (trục cũ của bt-25, nay chỉ được nhắc lại) · d2 Bài 16 · d3 Bài 17
     ══════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại Bài 25',
      q: 'Bài 25 giải thích vì sao không mang trình biên dịch lên board. Bài 26 vừa cho bạn ' +
         'một con số cụ thể để chống lưng cho lập luận ấy: riêng hai file ' +
         '<code>libgcc.a</code> (3,2 MB) và <code>libc.so.6</code> (1,8 MB) của phần ARM64 ' +
         'đã ngốn 5 MB, chưa kể <code>cc1</code>, <code>as</code>, <code>ld</code> và 142 ' +
         'header. Trong bốn phát biểu dưới đây, phát biểu nào <b>đúng với lý do thật</b> mà ' +
         'Bài 25 đưa ra?',
      opts: [
        'CPU ARM không có khả năng chạy trình biên dịch — kiến trúc ấy thiếu lệnh cần thiết',
        'Trình biên dịch chỉ tồn tại ở bản x86-64, không ai dựng bản chạy trên ARM',
        'Chạy được, nhưng <b>tài nguyên</b> mới là rào cản: thiết bị nhúng thường thiếu ' +
          'flash, RAM và thời gian CPU cho một bộ toolchain vài trăm MB',
        'Nhân Linux trên thiết bị nhúng chặn không cho chạy trình biên dịch vì lý do bảo mật'
      ],
      a: 2,
      why: '<p>Lý do là <b>tài nguyên</b>, không phải khả năng. GCC chạy được trên ARM — máy ' +
           'chủ ARM64 vẫn tự dịch nhân của chúng mỗi ngày. Nhưng một board có 64 MB flash và ' +
           '128 MB RAM thì không chứa nổi bộ toolchain, và nếu có chứa nổi thì cũng dịch ' +
           'chậm tới mức không dùng được.</p>' +
           '<p>Bài 26 vừa đóng đinh con số cho lập luận ấy. Bạn <i>đo</i> được, chứ không ' +
           'phải nghe kể: 3 210 472 byte cho <code>libgcc.a</code>, 1 781 952 byte cho ' +
           '<code>libc.so.6</code>, 142 mục trong <code>/usr/aarch64-linux-gnu/include</code>, ' +
           '72 mục trong thư mục <code>lib</code> tương ứng. Đó mới là <i>một phần</i> của bộ ' +
           'đồ nghề, và nó đã lớn hơn cả rootfs của nhiều thiết bị.</p>' +
           '<p>Phương án 4 nghe hợp lý nhưng sai hoàn toàn: nhân Linux không quan tâm chương ' +
           'trình bạn chạy là trình biên dịch hay không. Ràng buộc duy nhất mà nhân đặt ra là ' +
           'thứ Bài 25 gọi tên — nó kiểm tra <code>e_machine</code> rồi nạp, thế thôi.</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại Bài 16',
      q: 'Makefile ở câu <b>c1</b> dùng ba ký hiệu <code>$@</code>, <code>$^</code>, ' +
         '<code>$&lt;</code>. Bài 16 gọi chúng là <i>biến tự động</i>. Trong quy tắc dưới ' +
         'đây, ba ký hiệu ấy lần lượt mang giá trị gì?',
      blocks: [
        { t: 'code', where: 'file', nocopy: true, code:
            'app: main.o util.o\n' +
            '\t$(CC) $^ -o $@' }
      ],
      opts: [
        '<code>$@</code> = <code>main.o util.o</code>, <code>$^</code> = <code>app</code>, ' +
          '<code>$&lt;</code> = <code>main.o</code>',
        '<code>$@</code> = <code>app</code>, <code>$^</code> = <code>main.o util.o</code>, ' +
          '<code>$&lt;</code> = <code>main.o</code>',
        '<code>$@</code> = <code>app</code>, <code>$^</code> = <code>main.o</code>, ' +
          '<code>$&lt;</code> = <code>util.o</code>',
        'Cả ba đều là biến do người viết Makefile tự đặt, giá trị tuỳ dự án'
      ],
      a: 1,
      why: '<p>Ba ký hiệu ấy là của <code>make</code>, không phải của bạn:</p>' +
           '<ul>' +
           '<li><code>$@</code> — <b>mục tiêu</b> (bên trái dấu hai chấm): <code>app</code>.</li>' +
           '<li><code>$^</code> — <b>toàn bộ</b> danh sách phụ thuộc: ' +
           '<code>main.o util.o</code>.</li>' +
           '<li><code>$&lt;</code> — chỉ phụ thuộc <b>đầu tiên</b>: <code>main.o</code>. Đây ' +
           'là cái dùng trong quy tắc mẫu <code>%.o: %.c</code>, nơi mỗi lần chỉ có một file ' +
           'nguồn.</li>' +
           '</ul>' +
           '<p>Vì sao câu này nằm ở đây: c1 đòi bạn đọc một Makefile chéo và tìm ra dòng ' +
           'thiếu tiền tố. Muốn làm được thì phải đọc trôi chảy phần cú pháp, để mắt còn rảnh ' +
           'mà soi phần <i>tên công cụ</i>. Từ Chặng 07 trở đi bạn sẽ đọc Makefile của nhân ' +
           'Linux, nơi những ký hiệu này xuất hiện dày đặc.</p>' },

    { id: 'd3', k: 'tf', tag: 'Nhắc lại Bài 17',
      q: '<b>Phát biểu:</b> "<code>libgcc.a</code> nặng 3,2 MB, nên chương trình ' +
         '<code>hello</code> của tôi liên kết với nó sẽ phình thêm khoảng 3,2 MB."',
      a: 1,
      rw: 'Viết lại cho đúng trong 2–3 câu: nói rõ <code>.a</code> thật ra là <b>cái gì</b>, ' +
          'và trình liên kết lấy <b>bao nhiêu</b> từ nó.',
      why: '<p><b>Sai.</b> Bài 17 gọi <code>.a</code> là "một cái túi đựng <code>.o</code>" — ' +
           'và đó là mô tả chính xác về mặt kỹ thuật: một <i>archive</i>, tạo bằng ' +
           '<code>ar</code>, chứa các file <code>.o</code> rời cùng một bảng mục lục ký ' +
           'hiệu. <code>libgcc.a</code> trên máy bạn có <b>398 thành viên</b>.</p>' +
           '<p>Trình liên kết không nhét cả cái túi vào. Nó tra bảng mục lục, tìm xem ký hiệu ' +
           'nào còn thiếu, rồi <b>chỉ lôi ra những thành viên <code>.o</code> có chứa ký hiệu ' +
           'đó</b>. Với <code>hello</code>, số thành viên được lôi ra thường là <b>không</b>: ' +
           'chương trình chỉ gọi <code>puts</code>, chẳng dùng phép toán nào cần hàm trợ giúp ' +
           'của <code>libgcc</code>.</p>' +
           '<p>Chính đặc tính "lôi từng phần" này là lý do <code>hello64k</code> chỉ nặng ' +
           '70 KB dù đứng cạnh một thư viện 3,2 MB — và 61 KB trong số đó lại là byte đệm 0 ' +
           'chứ không phải mã (câu <b>c4</b>).</p>',
      crit: [
        'Nói được <code>.a</code> là một <b>archive</b> — cái túi chứa nhiều file <code>.o</code> rời (398 thành viên trong trường hợp này)',
        'Nói được trình liên kết chỉ lấy <b>những thành viên chứa ký hiệu đang thiếu</b>, không lấy cả file',
        'Nêu hệ quả đúng: kích thước tăng thêm phụ thuộc vào <i>chương trình dùng gì</i>, không phụ thuộc kích thước thư viện'
      ] }
  ],

  /* ══════════════════════════════════════════════
     E · THỰC HÀNH — 6 câu. Mọi output dưới đây đã chạy thật
     trên máy người học ngày 2026-08-29 (WSL2 Ubuntu, ~/bai26ex).
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 5,
      q: '<b>Trước khi chạy</b>, hãy viết ra dự đoán của bạn: hai lệnh dưới đây in ra hai số ' +
         'phiên bản. Bạn nghĩ hai số ấy có <b>gần nhau</b> không? Rồi chạy, đối chiếu, và ' +
         'giải thích kết quả bằng kiến thức Bài 26 về bốn thành phần của một toolchain.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-ld --version | head -1\n' +
            'aarch64-linux-gnu-gcc -dumpversion' }
      ],
      hint: 'Hai chương trình ấy thuộc <b>hai thành phần khác nhau</b> trong bốn thành phần. ' +
            'Hai thành phần ấy do ai phát hành?',
      crit: [
        'Ghi lại dự đoán <b>trước khi</b> chạy (dù dự đoán sai cũng phải ghi — đó là điểm của bài này)',
        'Kết quả thật: <code>GNU ld (GNU Binutils for Ubuntu) 2.46</code> và <code>15</code>',
        'Giải thích hai số cách xa nhau vì <b>binutils</b> và <b>GCC</b> là hai dự án độc lập, hai lịch phát hành, hai gói Debian khác nhau',
        'Kết luận: <b>không</b> có yêu cầu nào bắt hai số này phải khớp; thấy chúng khác nhau là bình thường',
        'Nêu được cách tra đúng gói của từng công cụ: <code>dpkg -S $(which aarch64-linux-gnu-ld)</code>'
      ],
      sol:
        '<p>Rất nhiều người mới dự đoán hai số sẽ gần nhau, vì cả hai lệnh đều bắt đầu bằng ' +
        'cùng một tiền tố <code>aarch64-linux-gnu-</code>. Tiền tố giống nhau tạo cảm giác ' +
        '"cùng một bộ, cùng một phiên bản". Kết quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-ld --version | head -1\n' +
            'GNU ld (GNU Binutils for Ubuntu) 2.46\n' +
            '$ aarch64-linux-gnu-gcc -dumpversion\n' +
            '15' },
        { t: 'p', x: '<b>2.46</b> và <b>15</b> — không những khác nhau mà còn thuộc hai hệ ' +
                     'đánh số hoàn toàn khác. Lý do nằm ở bốn thành phần: <code>ld</code> ' +
                     'thuộc <b>binutils</b>, <code>gcc</code> thuộc <b>GCC</b>. Hai dự án ' +
                     'riêng, hai đội phát triển, hai lịch phát hành, hai gói Debian.' },
        { t: 'p', x: 'Muốn thấy tận mắt thì hỏi thẳng hệ thống gói: ' +
                     '<code>dpkg -S $(which aarch64-linux-gnu-ld)</code> trả về ' +
                     '<code>binutils-aarch64-linux-gnu</code>, còn ' +
                     '<code>dpkg -S $(which aarch64-linux-gnu-gcc)</code> trả về một gói ' +
                     'thuộc họ <code>gcc-15-*</code>.' },
        { t: 'cal', kind: 'tip', title: 'Vì sao đáng nhớ',
          x: 'Khi vendor giao "toolchain 12.2", con số ấy hầu như luôn là số của <b>GCC</b>. ' +
             'Nó không nói gì về binutils, không nói gì về phiên bản glibc — mà glibc mới là ' +
             'thứ phải khớp với rootfs trên board. Đừng để một con số duy nhất đại diện cho ' +
             'cả bốn thành phần.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Trên máy bạn <b>có</b> thư viện nén zlib: ' +
         '<code>/usr/lib/x86_64-linux-gnu/libz.so.1.3.1</code>, 121 272 byte. ' +
         '<b>Trước khi chạy</b>, dự đoán: lệnh dưới đây thành công hay thất bại, và nếu thất ' +
         'bại thì thông báo sẽ nói gì? Rồi chạy và đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'cat > z.c <<\'EOF\'\n' +
            '#include <stdio.h>\n' +
            'int main(void) { printf("hi\\n"); return 0; }\n' +
            'EOF\n' +
            'aarch64-linux-gnu-gcc z.c -lz -o z' }
      ],
      hint: 'Thư mục chứa <code>libz</code> có tên là gì? So tên thư mục ấy với bộ ba của ' +
            'trình biên dịch bạn đang gọi.',
      crit: [
        'Ghi lại dự đoán trước khi chạy',
        'Kết quả thật: <b>thất bại</b>, với <code>cannot find -lz: No such file or directory</code> và <code>collect2: error: ld returned 1 exit status</code>',
        'Giải thích: <code>libz</code> có trên máy nhưng nó nằm trong <code>/usr/lib/x86_64-linux-gnu/</code> — thư viện của <b>máy build</b>, không phải của target',
        'Nói được trình liên kết chéo chỉ tìm trong sysroot của target, nên với nó thư viện ấy <b>không tồn tại</b>',
        'Nêu cách khắc phục đúng: cài gói <code>-dev</code> phiên bản cross cho ARM64 (hoặc trỏ <code>--sysroot</code> tới một sysroot có sẵn libz), <b>không phải</b> thêm <code>-L/usr/lib/x86_64-linux-gnu</code>'
      ],
      sol:
        '<p>Câu này bẫy đúng một phản xạ: "thư viện có trên máy rồi, chắc là link được". Kết ' +
        'quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-gcc z.c -lz -o z\n' +
            '/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lz: No such file or directory\n' +
            'collect2: error: ld returned 1 exit status\n' +
            '$ echo $?\n' +
            '1\n' +
            '\n' +
            '$ ls -l /usr/lib/x86_64-linux-gnu/libz.so.1.3.1\n' +
            '-rw-r--r-- 1 root root 121272 /usr/lib/x86_64-linux-gnu/libz.so.1.3.1' },
        { t: 'p', x: '<code>libz</code> <b>có</b> trên máy, và trình liên kết vẫn nói ' +
                     '<code>No such file or directory</code>. Hai câu ấy không mâu thuẫn, vì ' +
                     'chúng nói về hai không gian khác nhau. Hãy đọc tên thư mục: ' +
                     '<code>/usr/lib/<b>x86_64-linux-gnu</b>/</code> — đó là kho thư viện của ' +
                     '<b>máy build</b>. Trình liên kết chéo chỉ tìm trong sysroot của target ' +
                     '(<code>/usr/aarch64-linux-gnu/lib</code>, 72 mục), và ở đó không có ' +
                     'zlib.' },
        { t: 'p', x: 'Để ý cả <b>tên của trình liên kết</b> trong thông báo: nó là ' +
                     '<code>aarch64-linux-gnu-ld.bfd</code>, tức driver đã gọi đúng ' +
                     'bản <code>ld</code> có tiền tố. Chuỗi công cụ hoàn toàn đúng; chỉ thiếu ' +
                     'nguyên liệu.' },
        { t: 'cal', kind: 'warn', title: 'Cách chữa sai mà rất nhiều người thử',
          x: 'Thêm <code>-L/usr/lib/x86_64-linux-gnu</code>. Khi đó trình liên kết ' +
             '<i>tìm thấy</i> file — rồi từ chối nó vì sai kiến trúc, và bạn đổi một thông ' +
             'báo rõ ràng lấy một thông báo khó hiểu hơn. Cách đúng là cài gói ' +
             '<code>-dev</code> bản cross cho ARM64, hoặc dùng một sysroot đã có sẵn thư viện ' +
             'ấy (đúng tình huống câu <b>c3</b>).' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Ai đó đưa bạn một file <code>mystery.o</code> và không nói nó dịch cho kiến trúc ' +
         'nào. Trên máy chỉ có binutils <b>native</b> (không có bản tiền tố nào cho kiến trúc ' +
         'đó). Hãy viết <b>một</b> lệnh trả lời được câu hỏi "kiến trúc gì?", và giải thích ' +
         'vì sao lệnh ấy chạy được trong khi <code>objdump -d mystery.o</code> thì không.',
      hint: 'Câu trả lời nằm trong ELF header, ở trường <code>e_machine</code> — và bạn đã ' +
            'biết từ phần B rằng đọc header thì công cụ nào cũng làm được.',
      crit: [
        'Đưa ra một lệnh chạy được, ví dụ <code>readelf -h mystery.o | grep Machine</code> (hoặc <code>file mystery.o</code>)',
        'Chỉ ra thông tin nằm ở <b>ELF header</b>, trường <code>e_machine</code> — phần vỏ, khuôn dạng giống nhau ở mọi kiến trúc',
        'Giải thích <code>objdump -d</code> thất bại vì nó phải <b>giải mã lệnh</b>, tức bước vào phần phụ thuộc kiến trúc',
        'Chỉ ra <code>readelf</code> gần như không bao giờ cần tiền tố, nên nó là công cụ đầu tiên nên với tới khi chưa biết gì về file'
      ],
      sol:
        '<p>Một lệnh là đủ, và nó chạy với binutils native:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
            'readelf -h mystery.o | grep Machine\n' +
            '\n' +
            '# or, shorter but less detailed:\n' +
            'file mystery.o' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ readelf -h sum-arm64.o | grep Machine\n' +
            '  Machine:                           AArch64' },
        { t: 'p', x: 'Vì sao được phép: <code>e_machine</code> nằm trong <b>ELF header</b>, ' +
                     'ở một offset cố định gần đầu file, và khuôn dạng header giống hệt nhau ' +
                     'với mọi kiến trúc. <code>readelf</code> chỉ việc đọc hai byte rồi tra ' +
                     'bảng tên — không có gì phụ thuộc kiến trúc trong việc đó.' },
        { t: 'p', x: '<code>objdump -d</code> thì phải dịch từng byte trong ' +
                     '<code>.text</code> thành lệnh, mà bảng lệnh là của riêng từng kiến ' +
                     'trúc. Không có bảng thì nó dừng ở <code>can\'t disassemble for ' +
                     'architecture UNKNOWN!</code> — dù vẫn nhận ra khuôn dạng ' +
                     '<code>elf64-little</code>.' },
        { t: 'cal', kind: 'tip', title: 'Thói quen nên có',
          x: 'Đứng trước một file nhị phân lạ, <code>readelf -h</code> là lệnh đầu tiên. Nó ' +
             'gần như không bao giờ cần tiền tố, nó không sửa gì, và nó trả lời một lượt: ' +
             'kiến trúc, 32 hay 64 bit, thứ tự byte, loại file (<code>REL</code> / ' +
             '<code>EXEC</code> / <code>DYN</code>), điểm vào.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Bài 26 nói <code>gcc</code> chỉ là người điều phối, còn phần dịch C thật sự nằm ở ' +
         '<code>cc1</code>. Hãy <b>chứng minh</b> bằng hai lệnh: một lệnh tìm ra đường dẫn ' +
         'tuyệt đối của <code>cc1</code> mà bản chéo đang dùng, một lệnh cho biết ' +
         '<b>gói Debian nào</b> đã cài file đó. Sau đó nói xem tên gói ấy có gì đáng chú ý.',
      hint: 'Có một họ cờ <code>-print-…</code> hỏi thẳng driver. Và <code>dpkg</code> có một ' +
            'cờ đi ngược từ file về gói.',
      crit: [
        'Lệnh 1 đúng: <code>aarch64-linux-gnu-gcc -print-prog-name=cc1</code>',
        'Lệnh 2 đúng: <code>dpkg -S</code> áp lên đường dẫn thu được (ghép hai lệnh bằng <code>$( )</code> cũng được)',
        'Đường dẫn thật: <code>/usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1</code>',
        'Gói thật: <code>cpp-15-aarch64-linux-gnu</code>',
        'Nhận xét được điều đáng chú ý: <code>cc1</code> nằm trong <code>libexec</code> (không nằm trong <code>PATH</code>, nên bạn không gọi trực tiếp), và tên gói bắt đầu bằng <code>cpp-</code> chứ không phải <code>gcc-</code>'
      ],
      sol: '<p>Hai lệnh, ghép được thành một:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -print-prog-name=cc1\n' +
            'dpkg -S $(aarch64-linux-gnu-gcc -print-prog-name=cc1)' },
        { t: 'code', where: 'out', nocopy: true, code:
            '$ aarch64-linux-gnu-gcc -print-prog-name=cc1\n' +
            '/usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1\n' +
            '$ dpkg -S $(aarch64-linux-gnu-gcc -print-prog-name=cc1)\n' +
            'cpp-15-aarch64-linux-gnu: /usr/libexec/gcc-cross/aarch64-linux-gnu/15/cc1' },
        { t: 'list', ordered: false, items: [
            '<b><code>/usr/libexec/</code>, không phải <code>/usr/bin/</code>.</b> Đó là chỗ ' +
            'dành cho chương trình mà <i>chương trình khác</i> gọi, không phải người gõ. Vì ' +
            'thế <code>cc1</code> không nằm trong <code>PATH</code>: gõ <code>cc1</code> ở ' +
            'shell sẽ ra <code>command not found</code> dù file rõ ràng đang tồn tại.',
            '<b>Tên gói là <code>cpp-15-…</code>, không phải <code>gcc-15-…</code>.</b> Với ' +
            'Debian, phần đầu của trình biên dịch C được đóng gói cùng với bộ tiền xử lý. ' +
            'Đây là một ví dụ nữa cho thấy ranh giới gói và ranh giới khái niệm không trùng ' +
            'nhau — càng phải hỏi công cụ thay vì suy từ tên.',
            '<b>Có cả số 15 trong đường dẫn.</b> Nhiều phiên bản GCC sống chung được trên ' +
            'một máy, mỗi bản một cây <code>libexec</code> riêng.'
          ]},
        { t: 'p', x: 'Cùng họ cờ ấy còn vài cái đáng thuộc: ' +
                     '<code>-print-libgcc-file-name</code>, <code>-print-multiarch</code>, ' +
                     '<code>-print-search-dirs</code>. Tất cả đều là cách <i>hỏi</i> thay vì ' +
                     '<i>đoán</i>.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Một người muốn "bỏ qua cái driver rườm rà" và gọi thẳng trình liên kết. Họ chạy hai ' +
         'lệnh dưới đây và nhận về hai thông báo. Hãy giải thích <b>từng thông báo một</b> ' +
         'nói lên điều gì đang thiếu, rồi đưa ra cách sửa đúng.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -c hello.c -o hello.o\n' +
            'aarch64-linux-gnu-ld hello.o -o hello-ld' },
        { t: 'code', where: 'out', nocopy: true, code:
            '/usr/bin/aarch64-linux-gnu-ld.bfd: warning: cannot find entry symbol _start; defaulting to 00000000004000b0\n' +
            '/usr/bin/aarch64-linux-gnu-ld.bfd: hello.o: in function `main\':\n' +
            'hello.c:(.text+0x10): undefined reference to `puts\'\n' +
            '$ echo $?\n' +
            '1' }
      ],
      hint: 'Hai thông báo tố cáo hai thứ <b>khác nhau</b> mà driver vẫn thường tự thêm vào ' +
            'sau lưng bạn. Một thứ là file, một thứ là thư viện. Và tại sao lại là ' +
            '<code>puts</code> trong khi mã nguồn viết <code>printf</code>?',
      crit: [
        'Thông báo 1: thiếu <b>mã khởi động</b> — các file <code>crt1.o</code> / <code>crti.o</code> / <code>crtn.o</code> chứa <code>_start</code>, tức điểm vào thật của chương trình; <code>main</code> <b>không</b> là điểm vào',
        'Thông báo 2: thiếu <b>thư viện C</b> — không có <code>-lc</code> thì không ai định nghĩa <code>puts</code>',
        'Giải thích được vì sao là <code>puts</code> chứ không phải <code>printf</code>: trình biên dịch tối ưu một lời gọi <code>printf</code> chỉ có chuỗi cố định kết thúc bằng <code>\\n</code> thành <code>puts</code>',
        'Nêu cách sửa đúng và thực tế: <b>để driver làm việc của nó</b> — <code>aarch64-linux-gnu-gcc hello.o -o hello</code>',
        'Nói được vì sao gọi thẳng <code>ld</code> hầu như luôn sai: driver còn tự thêm <code>-lgcc</code>, chọn trình nạp động, chọn đường dẫn thư viện — sao chép đủ bằng tay là rất dễ sót'
      ],
      sol:
        '<p>Hai thông báo, hai thứ thiếu khác nhau — và cả hai đều là thứ driver vẫn âm thầm ' +
        'thêm vào.</p>' +
        '<p><b>1. <code>cannot find entry symbol _start</code>.</b> Điểm vào của một chương ' +
        'trình Linux <i>không</i> phải <code>main</code>. Nhân trao quyền điều khiển cho ' +
        '<code>_start</code>; <code>_start</code> dựng ngăn xếp, sắp xếp ' +
        '<code>argc</code>/<code>argv</code>/<code>envp</code>, gọi các hàm khởi tạo, rồi mới ' +
        'gọi <code>main</code> — và khi <code>main</code> trả về, nó gọi ' +
        '<code>exit()</code>. Mã ấy nằm trong <code>crt1.o</code>, <code>crti.o</code>, ' +
        '<code>crtn.o</code>. Bạn không đưa file nào cả, nên <code>ld</code> đành lấy đại một ' +
        'địa chỉ.</p>' +
        '<p><b>2. <code>undefined reference to `puts\'</code>.</b> Thiếu thư viện C. Bạn ' +
        'không viết <code>-lc</code>, nên chẳng có nơi nào định nghĩa hàm đó.</p>' +
        '<p>Vì sao lại là <code>puts</code> trong khi mã nguồn viết <code>printf</code>? Đây ' +
        'là một tối ưu quen thuộc của GCC: một lời gọi <code>printf</code> chỉ có duy nhất ' +
        'một chuỗi cố định, không có tham số định dạng, và kết thúc bằng ' +
        '<code>\\n</code>, được thay bằng <code>puts</code> — nhẹ hơn nhiều vì không phải ' +
        'phân tích chuỗi định dạng. Đừng hoảng khi thấy trong thông báo lỗi một tên hàm bạn ' +
        'không hề gõ.</p>' +
        '<p><b>Cách sửa.</b> Về lý thuyết bạn có thể đưa tay đủ <code>crt*.o</code>, thêm ' +
        '<code>-lc -lgcc</code>, chỉ định trình nạp động bằng ' +
        '<code>-dynamic-linker</code>, trỏ đường dẫn thư viện… Nhưng đó chính xác là danh ' +
        'sách việc mà driver sinh ra để làm hộ bạn. Cách sửa đúng chỉ có một dòng:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc hello.o -o hello' },
        { t: 'cal', kind: 'info', title: 'Khi nào thì gọi thẳng ld là hợp lý?',
          x: 'Khi bạn <i>không</i> muốn thứ gì trong danh sách trên: firmware bare-metal, ' +
             'SPL của U-Boot, mã khởi động sớm. Lúc ấy bạn tự viết <code>_start</code>, tự ' +
             'viết script liên kết, và <code>-nostdlib</code> là chủ ý chứ không phải tai ' +
             'nạn. Còn với chương trình chạy trên Linux thì luôn để driver làm việc của nó.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 7,
      q: 'Câu <b>c4</b> nói 61 KB chênh lệch giữa <code>hello64k</code> và ' +
         '<code>hello4k</code> là byte đệm 0. Đó là một khẳng định — hãy ' +
         '<b>đo để kiểm chứng nó</b>. Dựng hai file, rồi <i>đếm</i> xem mỗi file chứa bao ' +
         'nhiêu byte 0. Con số bạn đếm được có khớp với chênh lệch kích thước không? Nếu lệch ' +
         'thì lệch bao nhiêu, và phần lệch ấy là gì?',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai26ex && cd ~/bai26ex\n' +
            'cat > hello.c <<\'EOF\'\n' +
            '#include <stdio.h>\n' +
            'int main(void) { printf("hello\\n"); return 0; }\n' +
            'EOF\n' +
            'aarch64-linux-gnu-gcc hello.c -o hello64k\n' +
            'aarch64-linux-gnu-gcc -Wl,-z,max-page-size=4096 hello.c -o hello4k' }
      ],
      hint: 'Có nhiều cách đếm byte 0. Một cách dễ nhớ: <code>tr -d</code> xoá hết byte 0 rồi ' +
            '<code>wc -c</code> đếm phần còn lại — lấy tổng trừ đi là ra. Nhớ dùng ' +
            '<code>tr -d \'\\0\'</code>.',
      crit: [
        'Dựng được hai file và ghi lại kích thước: <b>70 448</b> và <b>9 008</b> byte (chênh <b>61 440</b>)',
        'Đếm được số byte 0: <b>67 841</b> trong <code>hello64k</code>, <b>6 449</b> trong <code>hello4k</code>',
        'Tính được chênh lệch số byte 0: 67 841 − 6 449 = <b>61 392</b>',
        'Đối chiếu: 61 392 so với 61 440 — lệch <b>48 byte</b>, tức phần đệm giải thích được <b>99,92 %</b> chênh lệch',
        'Giải thích được phần lệch nhỏ ấy: một ít byte khác 0 trong header và bảng program header cũng thay đổi khi đổi cách căn lề — nên hai con số không bắt buộc trùng khít'
      ],
      sol:
        '<p>Đây là kiểu việc bạn sẽ làm suốt đời nghề nhúng: nghe một lời giải thích, rồi ' +
        '<b>tự đo lại</b>. Một cách đếm:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', code:
            'for f in hello64k hello4k; do\n' +
            '  total=$(stat -c %s "$f")\n' +
            '  nonzero=$(tr -d \'\\0\' < "$f" | wc -c)\n' +
            '  echo "$f: total=$total nonzero=$nonzero zero=$((total - nonzero))"\n' +
            'done' },
        { t: 'code', where: 'out', nocopy: true, code:
            'hello64k: total=70448 nonzero=2607 zero=67841\n' +
            'hello4k: total=9008 nonzero=2559 zero=6449' },
        { t: 'table',
          head: ['Phép so', 'Con số'],
          rows: [
            ['Chênh lệch kích thước file', '70 448 − 9 008 = <b>61 440</b> byte'],
            ['Chênh lệch số byte 0', '67 841 − 6 449 = <b>61 392</b> byte'],
            ['Phần chưa giải thích', '<b>48</b> byte — 0,08 %'],
            ['Byte khác 0 trong mỗi file', '2 607 so với 2 559']
          ]},
        { t: 'p', x: 'Kết luận: <b>99,92 %</b> chênh lệch là byte 0. Khẳng định của c4 đứng ' +
                     'vững. Nhưng con số không trùng khít, và chỗ không trùng ấy mới thú ' +
                     'vị: 48 byte khác 0 cũng biến mất. Đó là vì đổi cách căn lề còn làm đổi ' +
                     'nội dung header và bảng program header — địa chỉ, offset, kích thước ' +
                     'segment đều là những số <i>khác 0</i> và chúng khác nhau giữa hai bản.' },
        { t: 'p', x: 'Con số 61 440 cũng không ngẫu nhiên: <code>61440 = 65536 − 4096</code>, ' +
                     'đúng bằng hiệu của hai kích thước trang. Đó là dấu hiệu rõ nhất cho ' +
                     'thấy bạn đang nhìn vào một hiệu ứng căn lề chứ không phải một hiệu ứng ' +
                     'nội dung.' },
        { t: 'cal', kind: 'tip', title: 'Câu hỏi để ngỏ cho Bài 27',
          x: 'Bạn vừa dùng <code>-static</code>. Thử bỏ nó đi rồi đo lại: file tụt xuống dưới ' +
             '20 KB, nhưng nó không còn tự chạy được nữa — nó cần một thứ nằm <b>trên ' +
             'board</b>. Thứ đó tên là gì, và làm sao chạy thử được trên máy x86-64 mà không ' +
             'cần board? Đó chính là nội dung Bài 27.' }
      ] },
  ],

  /* ══════════════════════════════════════════════
     F · BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Mọi slug dưới đây được tính bằng Render.slug() trên đúng chuỗi x của
     heading trong lessons/bai-26.js — KHÔNG gõ tay (§13.7: slug bị cắt ở 60
     ký tự, gõ tay là ra neo chết mà tools/check.js không bắt được).
     ══════════════════════════════════════════════ */
  diag: [
    ['A2, B1, C1, E3',
     'Bạn còn coi cả bộ binutils là "một khối": hoặc dùng được tất, hoặc hỏng ' +
     'tất. Thứ cần tách ra là <b>đọc metadata</b> (công cụ nào cũng xong) so với ' +
     '<b>đụng vào mã lệnh</b> (bắt buộc có tiền tố).',
     '<a href="#/bai-26#binutils-vi-sao-moi-thu-deu-phai-co-tien-to">Đọc lại — Binutils: vì sao mọi thứ đều phải có tiền tố</a>'],

    ['A1, A5, B4, E1, E4',
     'Bạn còn hình dung <code>gcc</code> là <i>một</i> chương trình biên dịch. ' +
     'Nó là người điều phối, và bốn thành phần đứng sau nó thuộc những dự án khác ' +
     'nhau — đó là lý do hai số phiên bản không khớp và <code>cc1</code> nằm ngoài ' +
     '<code>PATH</code>.',
     '<a href="#/bai-26#code-gcc-code-khong-bien-dich-gi-ca">Đọc lại — <code>gcc</code> không biên dịch gì cả</a>'],

    ['A4, B5, D3',
     'Bạn chưa tách được <code>libgcc</code> khỏi thư viện C. Dấu hiệu: gặp ' +
     '<code>undefined reference</code> tới một ký hiệu <b>không có trong mã nguồn ' +
     'của mình</b> mà lại đi thêm <code>-lc</code>.',
     '<a href="#/bai-26#gcc-va-nguoi-ban-it-ai-biet-ten-code-libgcc-code">Đọc lại — GCC và người bạn ít ai biết tên: <code>libgcc</code></a>'],

    ['A6, B6, C5',
     'Bạn chưa thấy thư viện C là chỗ <i>duy nhất</i> có quyền chọn, và chưa thấy ' +
     'cái giá của việc đổi lựa chọn ấy. Hệ quả thực tế: nhận nhầm toolchain musl cho ' +
     'một rootfs glibc, build sạch rồi chết lúc chạy.',
     '<a href="#/bai-26#thu-vien-c-cho-ban-that-su-co-quyen-chon">Đọc lại — Thư viện C: chỗ bạn thật sự có quyền chọn</a>'],

    ['A3, B2, C3, E2',
     'Bạn còn nghĩ trình biên dịch chéo dùng chung header và thư viện với máy build. ' +
     'Dấu hiệu: thấy <code>libz</code> nằm trên máy mà không hiểu vì sao ' +
     '<code>-lz</code> vẫn báo <i>không tìm thấy</i>, hoặc định chữa bằng ' +
     '<code>-I</code>/<code>-L</code> thay vì <code>--sysroot</code>.',
     '<a href="#/bai-26#sysroot-cay-thu-muc-gia-cua-target">Đọc lại — Sysroot: cây thư mục giả của target</a>'],

    ['A8, B3, C2',
     'Bạn còn coi "cùng kiến trúc" là đủ để hai file ghép được. Thứ còn thiếu là ' +
     '<b>ABI</b> — và nó được ghi thẳng trong file, đọc bằng ' +
     '<code>readelf -A</code>.',
     '<a href="#/bai-26#abi-va-chu-code-hf-code-khi-hai-file-cung-kien-truc-van-khon">Đọc lại — ABI và chữ <code>hf</code></a>'],

    ['A7',
     'Bạn chưa nhớ tên mô hình dữ liệu của ARM64. Đây là chỗ duy nhất trong bộ này ' +
     'chỉ cần thuộc tên — nhưng gọi sai tên thì không tra cứu tiếp được.',
     '<a href="#/bai-26#con-mot-abi-nua-ban-phai-nho-do-rong-cua-code-long-code">Đọc lại — Còn một ABI nữa: độ rộng của <code>long</code></a>'],

    ['C4, E6',
     'Bạn chưa nắm vì sao nhị phân ARM64 mặc định phình lên, và vì sao ép nó nhỏ lại ' +
     'là một canh bạc. Đây là chỗ kích thước trang của <b>nhân</b> quyết định, không ' +
     'phải kiến trúc.',
     '<a href="#/bai-26#mot-khac-biet-nua-ma-khong-cai-ten-nao-nhac-toi-kich-thuoc-t">Đọc lại — Kích thước trang nhớ</a>'],

    ['C1, D2',
     'Bạn đọc được Makefile nhưng chưa soi được <i>tên công cụ</i> bên trong nó. Từ ' +
     'Chặng 07 trở đi bạn sẽ đọc Makefile của nhân Linux — kỹ năng này phải thành ' +
     'phản xạ trước đó.',
     '<a href="#/bai-16#doc-makefile-kieu-kernel">Đọc lại Bài 16 — Đọc Makefile kiểu kernel</a>'],

    ['D1',
     'Bạn nhớ kết luận của Bài 25 nhưng chưa nhớ <i>lý do</i>. Lý do là tài nguyên, ' +
     'không phải khả năng — và Bài 26 vừa cho bạn những con số để chống lưng cho nó.',
     '<a href="#/bai-25#vi-sao-khong-mang-trinh-bien-dich-len-board">Đọc lại Bài 25 — Vì sao không mang trình biên dịch lên board?</a>'],

    ['E5',
     'Bạn chưa biết driver âm thầm thêm những gì vào dòng liên kết: các ' +
     '<code>crt*.o</code> chứa <code>_start</code>, rồi <code>-lc</code> và ' +
     '<code>-lgcc</code>. Bỏ qua driver là phải tự làm hết.',
     '<a href="#/bai-26#thuc-hanh-mo-bo-toolchain-dang-co-tren-may-ban">Đọc lại — Thực hành: mổ bộ toolchain đang có trên máy bạn</a>'],

    ['Nhiều câu ở phần E',
     'Nếu phần lớn phần E làm bạn bí, đừng làm tiếp — quay lại bảng lỗi ở cuối bài. ' +
     'Mỗi dòng trong đó là một thông báo thật kèm nguyên nhân thật.',
     '<a href="#/bai-26#loi-thuong-gap">Đọc lại — Lỗi thường gặp</a>']
  ]
});

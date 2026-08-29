/* ══════════════════════════════════════════════════════════════════════════════
   bt-25 — Bài tập cho Bài 25 "Vì sao phải cross-compile"
   CLAUDE.md §13. Phân tích chọn trục theo §13.4, bảy bước, ghi lại đầy đủ.
   ══════════════════════════════════════════════════════════════════════════════

   BƯỚC 1–2 · KIỂM KÊ VÀ CHẤM ĐIỂM
   Nguồn: goals, mọi h2/h3, mọi cal kind:'why', mọi cmdx title, terms, recap của
   lessons/bai-25.js.  D = phụ thuộc xuôi dòng, C = giá của hiểu sai, K = phản trực giác.

   #   Ứng viên                                                        D  C  K  Σ
   ──────────────────────────────────────────────────────────────────────────────
   1   Cùng một file .c cho hai bộ mã máy khác hẳn nhau
       (x86-64: 17 lệnh / 51 B · ARM64: 15 lệnh / 60 B)                 2  1  2  5
   2   Kiến trúc nằm trong ELF header (e_machine 62 / 183); ai chạy
       được file đó là chuyện của HỆ THỐNG nạp nó, không phải của file  2  2  2  6  ← T0
   3   Rào cản build trên bo là TÀI NGUYÊN và kích thước của chính
       bộ công cụ, không phải tốc độ (111 MB compiler cho rootfs 8–64
       MB; 33 MB RSS để dịch một file 11 KB; chết ở ulimit -v 32 MB)    2  2  2  6  ← T1
   4   Cross chỉ chậm hơn native ~30 % (0,30–0,33 s vs 0,23–0,25 s),
       không phải nhiều lần — và nó KHÔNG "dịch" gì cả              1  1  2  4
   5   build / host / target — target là thuộc tính của CÔNG CỤ, không
       phải của sản phẩm; chỉ trình biên dịch mới có target             2  2  2  6  ← T2
   6   gcc -dumpmachine ≠ uname -m                                      1  1  2  4
   7   __SIZEOF_LONG__ = 4 trên armhf → cắt cụt âm thầm                 2  2  1  5
   8   Lệch kiến trúc bị chặn ở LINK time (EM: 183), sớm hơn nhân       1  2  1  4
   9   Đường dẫn bộ nạp động khác nhau → kéo theo cả một sysroot        2  1  1  4
   10  RISC load-store, độ dài lệnh cố định 4 byte                      1  0  2  3
   11  --program-prefix và vì sao tên công cụ có tiền tố                0  0  1  1

   BƯỚC 3 · CẮT.  Ngưỡng §13.4: Σ ≥ 4 và ít nhất 2 trục ≥ 1.
   Ba ứng viên đạt Σ = 6: #2, #3, #5.  Lấy đúng ba, không cần nới ngưỡng.

   BƯỚC 4 · LOẠI TRỪ (kể cả ứng viên điểm cao)
   - #10 là số liệu tra cứu được (§13.3 cấm làm trục) → tối đa một câu mức A. Ở đây bỏ hẳn,
     vì quiz Bài 25 câu 2 đã hỏi đúng con số 60 B / 15 lệnh rồi.
   - #11 là trivia.
   - #4, #6, #7 đều đã là câu quiz của Bài 25 (câu 4, 7, 6). Không loại khỏi bộ bài tập,
     nhưng chỉ được xuất hiện MỘT lần, ở phần B/C, và phải đổi hẳn góc hỏi — xem
     RANH GIỚI VỚI QUIZ bên dưới.
   - #8 giữ lại làm một câu E (Sửa lỗi), không làm trục: nó là một thông báo lỗi cụ thể,
     tra được, và quiz câu 5 đã hỏi nó ở mức nhận biết.
   - #1 và #9 là chất liệu tốt cho phần B/C nhưng #1 trùng phần lớn với #2, còn #9 thuộc về
     Bài 26 (Giải phẫu một toolchain) — để dành, không tiêu ở đây.
   - Không trục nào trùng với các trục đã tiêu ở §13.8. `bt-24` tiêu ba trục về socket;
     không giao nhau.

   BƯỚC 5 · PHÁT BIỂU MỖI TRỤC THÀNH MỘT CÂU CÓ THỂ SAI
   T0  Một file thực thi chứa mã máy của ĐÚNG MỘT kiến trúc; việc nó chạy được hay không
       là thuộc tính của HỆ THỐNG đang nạp nó, chứ không phải thuộc tính của file.
   T1  Cái chặn bạn build ngay trên bo không phải tốc độ mà là tài nguyên — và khoản lớn
       nhất là kích thước của chính bộ công cụ, thứ chẳng liên quan gì tới chương trình.
   T2  `target` là thuộc tính của một CÔNG CỤ, không phải của một sản phẩm; chỉ những
       chương trình sinh ra mã cho máy khác mới có target.

   BƯỚC 6 · HIỂU SAI ĐỐI LẬP (dùng làm mồi nhử cho A, làm câu "Bắt lỗi" ở B, làm chế độ
   hỏng ở C)
   T0  "Biên dịch xong là ra một chương trình Linux; Linux nào cũng chạy được." Và biến
       thể nguy hiểm hơn, sinh ra bởi chính máy này: "Nó chạy trên máy tôi, vậy nó là file
       của máy tôi."
   T1  "Bo chỉ chậm thôi. Cứ để nó build qua đêm là xong."
   T2  "target là con bo, host là máy tôi, build là… cũng máy tôi? Ba cái tên cho hai chỗ."

   BƯỚC 7 · LƯỚI 3 × 1 VÀ KIỂM TRA
        A (nhớ lại)                B (giải thích số liệu thật)      C (quyết định)
   T0   A1  một .c → cái gì?       B1  đọc trọn bản ghi: file +     C1  một artefact CI
        A5  "chạy được ⇒ của tôi"      readelf + nó CHẠY + handler      đem sang gateway x86
            (Đúng/Sai + viết lại)      → ai đã chạy, chứng minh gì      và bo ARM64
   T1   A2  cái nào KHÔNG phải     B2  đọc RSS 33/43 MB + sàn       C3  bo 512 MB RAM,
            rào cản thật               ulimit -v 32/64 MB               8 GB eMMC — được chưa?
   T2   A4  target của gcc và      B4  đọc dòng configure của       C5  gdb chạy trên PC,
            target của busybox         aarch64-linux-gnu-gcc -v         gỡ lỗi bo ARM64

   Kiểm tra §13.4 bước 7:
   - C1 có trả lời được mà không hiểu T0 không?  Không: phải biết "chạy được ở đây" và
     "chạy được ở kia" là hai câu hỏi về hai hệ thống khác nhau, mới xử lý được cái bẫy
     gateway-x86-cũng-là-Linux.
   - C3 có trả lời được mà không hiểu T1 không?  Không: đề cố tình cho RAM và eMMC rộng
     rãi, nên ai nghĩ rào cản là "bo yếu" sẽ trả lời sai ngay.
   - C5 có trả lời được mà không hiểu T2 không?  Không: gdb là trường hợp duy nhất mà
     host ≠ target một cách hiển nhiên, và nó phá luôn cách nhớ vẹt "target = con bo".
   - Ba lần xuất hiện của mỗi trục có dùng chung từ vựng không?  Không — A nói bằng lời,
     B nói bằng bản ghi thật, C nói bằng ràng buộc phần cứng.
   - Câu trước có lộ đáp án câu sau không?  A5 có nhắc tới việc "chạy được", nhưng không
     nêu tên binfmt_misc; B1 mới là chỗ learner tự tìm ra. Giữ nguyên thứ tự.

   ══════════════════════════════════════════════════════════════════════════════
   RANH GIỚI VỚI QUIZ BÀI 25 — bảy câu quiz đã hỏi những gì
   ══════════════════════════════════════════════════════════════════════════════
   Q1  ARM64 trên x86 → Exec format error / 126 → chuyện gì ở mức nhân?
   Q2  .o ARM64 60 B / 15 lệnh → số byte nào là bất khả thi?
   Q3  build busybox cho bo ARM64 → host của busybox là gì?
   Q4  vì sao cross KHÔNG chậm hơn native đáng kể?
   Q5  ld: Relocations in generic ELF (EM: 183) → nguyên nhân?
   Q6  aarch64 thì tốt, armhf thì con trỏ cắt cụt → vì sao?
   Q7  vì sao uname -m và gcc -dumpmachine cho hai câu trả lời khác nhau?

   Bảy câu này chạm cả ba trục ở mức trắc nghiệm nhận biết. Nên phần A của bt-25 KHÔNG
   được hỏi lại theo cùng khuôn:
   - A1 không đưa ra thông báo lỗi nào (Q1 đưa sẵn) và hỏi về BẢN CHẤT của thứ gcc sinh ra.
   - A4 hỏi target của HAI thứ, trong đó một thứ không có target (Q3 chỉ hỏi host của một).
   - A5 là Đúng/Sai kèm viết lại, và nó hỏi chiều ngược của Q1: không phải "vì sao nó
     hỏng", mà "nếu nó KHÔNG hỏng thì suy ra được gì" — câu hỏi mà quiz không thể hỏi, vì
     lúc Bài 25 được viết máy này chưa cài qemu-user-binfmt.
   - Q2 (60 B / 15 lệnh) và Q5 (EM: 183) không được lặp ở A. Q5 quay lại ở E5 dưới dạng
     một lỗi phải TỰ tạo ra và tự sửa, không phải một câu hỏi.
   - Q4, Q6, Q7 mỗi cái xuất hiện đúng một lần, ở B hoặc E, và luôn kèm số đo thật để
     learner phải đọc số chứ không nhớ đáp án.

   ══════════════════════════════════════════════════════════════════════════════
   XUẤT XỨ SỐ LIỆU — đọc trước khi sửa bất cứ con số nào trong file này
   ══════════════════════════════════════════════════════════════════════════════
   Tất cả đo lại trên máy người dùng ngày 2026-08-28, ghi trong docs/environment.md.
   Thư mục làm việc của bộ này là ~/embedded/bt25 (KHÔNG phải ~/lab25 của Bài 25 — thư
   mục đó đã bị xoá cuối Bài 25, nên mọi câu ở phần E đều tự dựng lại từ đầu).

   1. ĐIỀU QUAN TRỌNG NHẤT: `./hello-arm64` trên máy x86-64 này CHẠY ĐƯỢC và thoát 0.
      Máy đã cài qemu-user-binfmt 1:10.2.1+ds-1ubuntu3.2; /proc/sys/fs/binfmt_misc/ có 28
      handler, trong đó có qemu-arm, qemu-aarch64, qemu-armeb. Nhân khớp magic của ELF rồi
      giao file cho /usr/bin/qemu-aarch64 (flags: POF) thay vì từ chối.
      → Bản ghi `cannot execute binary file: Exec format error` / `exit=126` mà Bài 25 in
        ra (lessons/bai-25.js ~dòng 682) KHÔNG còn tái lập được. Bài học đúng vào lúc nó
        được chụp; môi trường đã đổi bên dưới nó, gần như chắc chắn là do phần QEMU của
        Chặng 05 (bài 29–32), viết SAU Bài 25. Đã ghi vào docs/course-notes.md như một
        defect; sửa Bài 25 hay không là quyết định của người dùng, bt-25 không tự sửa.
      → bt-25 xử lý thẳng chuyện này: E1 bắt learner dự đoán thất bại, gặp thành công, đi
        tìm thủ phạm, rồi mới tới nguyên lý. Mạnh hơn bài tập gốc.
   2. Muốn thấy ENOEXEC thật mà KHÔNG cần sudo: vá e_machine (2 byte little-endian ở
      offset 0x12) thành 250 — không handler nào nhận. `file` gọi nó là "Netronome Flow
      Processor", chạy thì được đúng `cannot execute binary file: Exec format error`,
      exit 126. Bắt buộc phải làm cách này vì handler không tắt được nếu không có root, mà
      sudo trên máy này ĐÒI MẬT KHẨU (sudo -n true thất bại; một script có sudo chạy qua
      `bash -s <file` sẽ TREO).
   3. Thời gian biên dịch phải là số đo NÓNG. Lần gcc đầu tiên sau khi WSL nghỉ mất
      11,19 s; ba lần sau 0,61 / 0,76 / 0,92 s với cùng peak RSS. Mọi con số thời gian
      trong file này lấy từ vòng lặp ≥ 3 lần, sau khi đã hâm nóng cả hai trình biên dịch.
      SỬA MỘT SỐ LIỆU CŨ: một phiên trước ghi "cross không chậm hơn native". Đo lại kỹ —
      năm cặp xen kẽ, rồi đảo thứ tự để loại trừ hiệu ứng thứ tự — thì cross chậm hơn
      ĐỀU ĐẶN ~30 %: 0,30–0,33 s so với 0,23–0,25 s, cùng sinh ra .o gần bằng nhau
      (19 424 vs 19 320 B). Con số cũ là nhiễu do cache lạnh, đã sửa trong
      docs/environment.md. Cách nói đúng: khoảng cách là 0,07 s và đến từ backend to hơn,
      chứ KHÔNG phải vì cross-compile "phải dịch" — nó không dịch gì cả.
   4. gen.c dùng ở phần E là file SINH RA bằng vòng lặp shell trong chính đề bài, nên
      learner tạo lại được y hệt: 11 711 byte, 404 dòng, 200 hàm nhỏ.
   5. Sàn ulimit -v tìm bằng lưỡng phân: 32768 KB THẤT BẠI, 65536 KB THÀNH CÔNG. Thông báo
      khi thất bại là `gcc: internal compiler error: Segmentation fault signal terminated
      program cc1`, exit 4 — KHÔNG phải `virtual memory exhausted: Cannot allocate memory`.
      Chế độ hỏng phụ thuộc vào chỗ nào hết bộ nhớ trước, nên chỉ trích dẫn cái đã đo.
   6. dpkg Installed-Size của `gcc`, `cpp`, `binutils` là 37 / 37 / 1150 KB vì cả ba là
      METAPACKAGE. Con số thật phải lấy ở gcc-15, cpp-15, binutils-x86-64-linux-gnu, hoặc
      bằng du. Đừng trích metapackage — nó nói giảm đi khoảng 50 lần.
   7. hello-arm64 được build -static (705 248 byte) còn hello-x86 là động (15 960 byte).
      Chênh lệch này là do cách liên kết, KHÔNG phải do kiến trúc — nói rõ trong lời giải
      để learner không rút ra kết luận sai.
   ══════════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-25',
  minutes: 85,

  intro:
    '<p>Bài 25 trả lời một câu hỏi nghe rất hiển nhiên — <i>vì sao không biên dịch thẳng ' +
    'trên bo?</i> — và câu trả lời hoá ra không phải "vì bo chậm". Bộ bài tập này đẩy bạn ' +
    'qua ba ranh giới mà người mới hay bước nhầm: <b>một file thực thi thuộc về ai</b>, ' +
    '<b>cái gì thực sự chặn bạn build trên bo</b>, và <b>ba chữ build / host / target</b> ' +
    'mô tả cái gì.</p>' +
    '<p>Có một chỗ trong bộ này sẽ làm bạn ngạc nhiên, và nó là ngạc nhiên <i>cố ý</i>: ' +
    'máy WSL của bạn <b>chạy được</b> file nhị phân ARM64, trong khi Bài 25 nói rằng nhân ' +
    'sẽ từ chối. Cả hai điều đó đều đúng, và hiểu vì sao chúng cùng đúng là phần giá trị ' +
    'nhất của cả bộ. Đừng bỏ qua câu E1.</p>' +
    '<p><b>Lượt 1</b> (~23 phút, làm ngay sau khi đọc xong bài): phần A và B.<br>' +
    '<b>Lượt 2</b> (~60 phút, làm sau 2–3 ngày): phần C, D và E. Khoảng nghỉ đó không ' +
    'phải là trì hoãn — nhớ lại sau khi đã quên một phần là cách học chắc hơn hẳn.</p>',

  truc: [
    { id: 'own',
      name: 'Một file thực thi thuộc về đúng một kiến trúc — nhưng "chạy được hay không" là ' +
            'thuộc tính của hệ thống nạp nó, không phải của file',
      x: 'Trường <code>e_machine</code> trong ELF header ghi ISA của file: <b>62</b> cho ' +
         'x86-64, <b>183</b> cho AArch64. Nhân đọc trường đó trước khi nạp. Nhưng nhân còn ' +
         'tra <code>binfmt_misc</code> trước khi kết luận, nên cùng một file có thể bị từ ' +
         'chối trên máy này và chạy được trên máy kia.',
      mis: '"Biên dịch xong là ra một chương trình Linux, Linux nào cũng chạy." Và biến thể ' +
           'nguy hiểm hơn: "nó chạy trên máy tôi, vậy nó là file của máy tôi."' },

    { id: 'cost',
      name: 'Cái chặn bạn build trên bo là tài nguyên, và khoản lớn nhất là kích thước của ' +
            'chính bộ công cụ',
      x: 'Trình biên dịch nặng hơn nhiều lần thứ nó sinh ra: riêng <code>cc1</code> là ' +
         '<b>35,7 MB</b>, cả thư mục nội bộ của gcc là <b>111 MB</b>, trong khi rootfs của ' +
         'một bo nhúng thường chỉ 8–64 MB. Dịch một file C 11 KB đã ngốn <b>33 MB</b> RAM.',
      mis: '"Bo chỉ chậm thôi. Cứ để nó build qua đêm là xong."' },

    { id: 'triplet',
      name: '<code>target</code> là thuộc tính của một công cụ, không phải của một sản phẩm',
      x: '<b>build</b> = nơi bộ công cụ được dựng ra, <b>host</b> = nơi nó chạy, ' +
         '<b>target</b> = nơi thứ nó <i>sinh ra</i> sẽ chạy. Chỉ chương trình nào sinh mã ' +
         'cho máy khác — trình biên dịch, trình liên kết, trình gỡ lỗi từ xa — mới có ' +
         'target. <code>busybox</code> không có target.',
      mis: '"target là con bo, host là máy tôi, build là… cũng máy tôi? Ba cái tên cho hai chỗ."' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     A · NHẬN BIẾT — 8 câu, máy chấm được hết
     ══════════════════════════════════════════════════════════════════════ */
  A: [
    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gõ <code>gcc hello.c -o hello</code> trên máy x86-64. Mô tả nào đúng nhất về ' +
         'thứ vừa được tạo ra?',
      opts: [
        'Một chương trình Linux — mọi máy chạy Linux đều thực thi được nó',
        'Một file chứa mã máy của <b>đúng một</b> tập lệnh (ở đây là x86-64), và ELF header ' +
          'ghi rõ tập lệnh đó',
        'Mã trung gian, được dịch sang lệnh của CPU cụ thể vào lúc chạy',
        'Một file chạy được trên mọi CPU 64-bit, vì cả x86-64 lẫn ARM64 đều là 64-bit'
      ],
      a: 1,
      why: '<p>Đây là hiểu nhầm nền tảng của cả Chặng 04. <code>gcc</code> không sinh ra ' +
           '"một chương trình Linux" — nó sinh ra <b>mã máy</b>, tức những byte mà một tập ' +
           'lệnh cụ thể hiểu được. Linux chỉ là cái quyết định <i>hình dạng file</i> (ELF) ' +
           'và <i>cách gọi syscall</i>, không phải cái quyết định CPU nào giải mã được ' +
           'những byte đó.</p>' +
           '<p>Phương án 3 mô tả Java hoặc .NET, không phải C. Phương án 4 nhầm <i>độ rộng ' +
           'thanh ghi</i> với <i>tập lệnh</i>: x86-64 và ARM64 đều 64-bit nhưng mã máy của ' +
           'chúng không có một byte nào chung về ý nghĩa.</p>' +
           '<p>ELF header ghi kiến trúc trong trường <code>e_machine</code>: <b>62</b> cho ' +
           'x86-64, <b>183</b> cho AArch64. Đọc được bằng <code>readelf -h</code>, không ' +
           'cần chạm tới phần mã lệnh.</p>' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Bốn lý do dưới đây thường được nêu ra để giải thích vì sao không build ngay trên ' +
         'bo nhúng. <b>Ba</b> trong số đó là rào cản thật. Đâu là cái <b>không</b> phải?',
      opts: [
        'Bộ công cụ chiếm hơn 100 MB, trong khi rootfs của bo thường chỉ 8–64 MB',
        'Trình biên dịch cần hàng chục MB RAM cho mỗi file, nhiều hơn cả chương trình nó sinh ra',
        'Mã máy do trình biên dịch chạy trên bo sinh ra sẽ <b>kém tối ưu hơn</b> mã do ' +
          'trình biên dịch chạy trên PC sinh ra',
        'Nhiều bo không có bộ nhớ ghi được đủ lớn, và mỗi lần build là hàng nghìn lần ghi ' +
          'lên flash'
      ],
      a: 2,
      why: '<p>Phương án 3 là cái sai, và nó sai một cách sạch sẽ: <b>cùng một phiên bản ' +
           'gcc, cùng một cờ tối ưu thì sinh ra cùng một mã máy</b>, bất kể nó đang chạy ' +
           'trên CPU nào. Chất lượng mã là thuộc tính của trình biên dịch, không phải của ' +
           'máy đang chạy trình biên dịch. Đây chính là điều làm cross-compile trở nên khả ' +
           'thi — nếu nó không đúng thì không ai dám cross-compile cả.</p>' +
           '<p>Ba phương án còn lại đều đo được. Riêng <code>cc1</code> — chương trình dịch ' +
           'C thật sự nằm sau <code>gcc</code> — là <b>35,7 MB</b>, và cả thư mục nội bộ ' +
           'của gcc là <b>111 MB</b>. Dịch một file C 11 KB ngốn <b>33 MB</b> RAM. Còn flash ' +
           'NAND/eMMC có số chu kỳ ghi hữu hạn, nên biến bo thành máy build là rút ngắn ' +
           'tuổi thọ sản phẩm.</p>' +
           '<p>Chú ý cả cái <b>không</b> nằm trong danh sách: "bo chạy chậm". Chậm là bất ' +
           'tiện, không phải rào cản — bạn có thể chờ. Hết RAM thì không chờ được.</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trên máy x86-64 của bạn, <code>aarch64-linux-gnu-gcc -dumpmachine</code> in ra ' +
         '<code>aarch64-linux-gnu</code>. Chuỗi đó mô tả cái gì?',
      opts: [
        'Kiến trúc của máy đang chạy lệnh đó',
        'Kiến trúc mà trình biên dịch này <b>sinh mã cho</b> — tức target của nó',
        'Kiến trúc mà bản thân file <code>aarch64-linux-gnu-gcc</code> được biên dịch cho',
        'Một cái tên do người đóng gói đặt, không mang thông tin kỹ thuật'
      ],
      a: 1,
      why: '<p><code>-dumpmachine</code> in ra <b>target</b> của trình biên dịch: nơi mã nó ' +
           'sinh ra sẽ chạy. Bản thân file <code>aarch64-linux-gnu-gcc</code> là một chương ' +
           'trình <b>x86-64</b> — nó phải thế, vì nó đang chạy trên máy bạn. Đó là lý do ' +
           'phương án 3 sai, và nó là mồi nhử tốt vì nghe rất hợp lý.</p>' +
           '<p>So sánh trên cùng một máy:</p>' +
           '<ul>' +
           '<li><code>uname -m</code> → <code>x86_64</code> — hỏi <i>nhân</i> đang chạy trên ' +
           'kiến trúc nào.</li>' +
           '<li><code>gcc -dumpmachine</code> → <code>x86_64-linux-gnu</code>.</li>' +
           '<li><code>aarch64-linux-gnu-gcc -dumpmachine</code> → ' +
           '<code>aarch64-linux-gnu</code>.</li>' +
           '<li><code>arm-linux-gnueabihf-gcc -dumpmachine</code> → ' +
           '<code>arm-linux-gnueabihf</code>.</li>' +
           '</ul>' +
           '<p>Ba trình biên dịch, ba câu trả lời khác nhau, một cái máy. Hai lệnh đó trả lời ' +
           'hai câu hỏi khác nhau — nhầm chúng với nhau là cách phổ biến nhất để build nhầm ' +
           'kiến trúc mà không nhận ra.</p>' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Bạn dùng PC x86-64 và <code>aarch64-linux-gnu-gcc</code> để build ' +
         '<code>busybox</code> cho một bo ARM64. Cặp trả lời nào đúng cho câu hỏi ' +
         '"<b>target</b> của <code>aarch64-linux-gnu-gcc</code> là gì, và <b>target</b> của ' +
         '<code>busybox</code> là gì?"',
      opts: [
        'Cả hai đều là <code>aarch64-linux-gnu</code>',
        'Trình biên dịch: <code>aarch64-linux-gnu</code>. <code>busybox</code>: ' +
          '<b>không có target</b> — nó không sinh mã cho máy nào cả',
        'Trình biên dịch: <code>x86_64-linux-gnu</code>. <code>busybox</code>: ' +
          '<code>aarch64-linux-gnu</code>',
        'Cả hai đều không có target; chỉ nhân Linux mới có'
      ],
      a: 1,
      why: '<p>Đây là chỗ ba chữ <b>build / host / target</b> hay bị nhớ vẹt thành "target ' +
           'là con bo". Định nghĩa thật:</p>' +
           '<ul>' +
           '<li><b>build</b> — nơi công cụ được <i>dựng ra</i>.</li>' +
           '<li><b>host</b> — nơi công cụ <i>chạy</i>.</li>' +
           '<li><b>target</b> — nơi thứ mà công cụ <i>sinh ra</i> sẽ chạy.</li>' +
           '</ul>' +
           '<p>Chữ thứ ba chỉ có nghĩa với những chương trình <b>sinh ra mã cho một máy ' +
           'khác</b>: trình biên dịch, trình hợp dịch, trình liên kết, trình gỡ lỗi từ xa. ' +
           '<code>busybox</code> không sinh mã cho ai — nó chỉ chạy. Nên nó có ' +
           '<b>host</b> = <code>aarch64-linux-gnu</code> và <b>không có target</b>.</p>' +
           '<p>Cách kiểm tra nhanh khi bạn lưỡng lự: hỏi "thứ này có đẻ ra file chạy được ' +
           'cho máy khác không?" Không → nó không có target, và bất cứ ai nói về "target ' +
           'của busybox" đều đang dùng nhầm từ.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 0,
      q: '<b>Phát biểu:</b> "Tôi gõ <code>./hello-arm64</code> trên máy WSL x86-64 và nó in ' +
         'ra kết quả rồi thoát với mã 0. Vậy chắc chắn tôi đã biên dịch nhầm — file này ' +
         'thực ra là file x86-64."',
      a: 1,
      rw: 'Viết lại cho đúng trong 2–3 câu: việc nó chạy được cho phép kết luận điều gì, và ' +
          '<b>không</b> cho phép kết luận điều gì?',
      why: '<p><b>Sai</b>, và đây là cái bẫy trung tâm của cả bộ bài tập này. Trên máy của ' +
           'bạn, <code>file hello-arm64</code> vẫn nói <code>ARM aarch64</code> và ' +
           '<code>readelf -h</code> vẫn cho <code>e_machine = 183</code>. File đúng là ' +
           'ARM64. Nó vẫn chạy được.</p>' +
           '<p>Lý do: máy này đã cài <code>qemu-user-binfmt</code>. Nhân giữ một bảng ' +
           '<code>binfmt_misc</code> ánh xạ "vài byte đầu file trông thế này" → "hãy đưa nó ' +
           'cho chương trình kia". Với ELF ARM64, chương trình kia là ' +
           '<code>/usr/bin/qemu-aarch64</code>, và nó <b>mô phỏng</b> từng lệnh ARM bằng ' +
           'lệnh x86. CPU của bạn chưa bao giờ thực thi một lệnh ARM nào.</p>' +
           '<p>Kết luận rút ra được: <i>hệ thống này</i> có cách chạy file đó. Kết luận ' +
           '<b>không</b> rút ra được: file đó là x86-64, hoặc file đó sẽ chạy trên một máy ' +
           'x86-64 khác. Đó chính là nội dung của trục "chạy được là thuộc tính của hệ ' +
           'thống, không phải của file". Câu <b>E1</b> bắt bạn tự chứng minh toàn bộ chuyện ' +
           'này bằng tay.</p>',
      crit: [
        'Bác bỏ kết luận "vậy nó là file x86-64", và nói được cách kiểm tra: ' +
          '<code>file</code> hoặc <code>readelf -h</code> vẫn cho <b>AArch64</b> / ' +
          '<b>183</b>',
        'Nêu đúng cơ chế: nhân tra <code>binfmt_misc</code> và giao file cho một chương ' +
          'trình <b>mô phỏng</b> (<code>qemu-aarch64</code>), CPU không hề chạy lệnh ARM',
        'Phân biệt được hai kết luận: "hệ thống <b>này</b> chạy được nó" là đúng; "file này ' +
          'là x86-64" hoặc "máy x86-64 nào cũng chạy được nó" là sai'
      ],
      sol: '<p>Sai. Việc nó chạy chỉ chứng minh rằng HỆ THỐNG NÀY có cách chạy nó — không ' +
           'chứng minh gì về kiến trúc của file. Kiểm tra bằng file hoặc readelf -h: cả hai ' +
           'vẫn nói AArch64, e_machine = 183.</p><p>Cơ chế là binfmt_misc: nhân so vài byte ' +
           'đầu file với một bảng đăng ký, thấy khớp mẫu ELF ARM64 thì giao file cho ' +
           '/usr/bin/qemu-aarch64 — một chương trình x86-64 mô phỏng từng lệnh ARM. CPU của ' +
           'bạn không thực thi một lệnh ARM nào.</p><p>Vậy kết luận đúng là: "máy tôi có cài ' +
           'lớp mô phỏng". Kết luận sai là "file này là x86-64" hoặc "máy x86-64 nào cũng ' +
           'chạy được nó" — đem đúng file đó sang một máy x86-64 không cài qemu-user thì nó ' +
           'sẽ báo Exec format error và thoát 126.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<b>Phát biểu:</b> "Muốn biết một file thực thi dành cho kiến trúc nào, phải quét ' +
         'qua phần mã lệnh của nó và nhận dạng xem đó là lệnh x86 hay lệnh ARM."',
      a: 1,
      rw: 'Viết lại cho đúng trong 1–2 câu: thông tin đó nằm ở đâu, và vì sao vị trí ấy lại ' +
          'quan trọng đối với nhân?',
      why: '<p><b>Sai.</b> Kiến trúc được khai báo <b>tường minh</b> trong ELF header, ở ' +
           'trường <code>e_machine</code>: một số nguyên 2 byte nằm tại offset ' +
           '<code>0x12</code>, tức byte thứ 19 và 20 của file. <b>62</b> = x86-64, ' +
           '<b>183</b> = AArch64.</p>' +
           '<p>Vị trí ấy quan trọng vì nó cho phép nhân quyết định <b>trước khi nạp bất cứ ' +
           'thứ gì</b>. Nhân đọc vài chục byte đầu, thấy kiến trúc không khớp, trả ' +
           '<code>ENOEXEC</code> ngay. Không có chuyện "chạy được vài lệnh rồi mới chết" — ' +
           'và đó là lý do bạn nhận được một thông báo sạch sẽ chứ không phải một cú sập ' +
           'khó hiểu.</p>' +
           '<p>Cũng vì nó ở một vị trí cố định mà <code>binfmt_misc</code> hoạt động được: ' +
           'luật đăng ký của nó là một cặp <i>magic</i> + <i>mask</i> so khớp đúng vùng byte ' +
           'đó. Bạn sẽ nhìn thấy cặp ấy tận mắt ở câu B1.</p>',
      crit: [
        'Nêu đúng chỗ: trường <code>e_machine</code> trong <b>ELF header</b>, không phải ' +
          'trong phần mã lệnh',
        'Nêu được ít nhất một cách đọc nó: <code>readelf -h</code>, <code>file</code>, hoặc ' +
          '2 byte tại offset <code>0x12</code>',
        'Giải thích được vì sao vị trí ấy quan trọng: nhân quyết định được ' +
          '<b>trước khi nạp</b>, nên hoặc từ chối sạch sẽ, hoặc chuyển hướng qua ' +
          '<code>binfmt_misc</code> — không bao giờ chạy dở dang rồi sập'
      ],
      sol: '<p>Sai. Kiến trúc nằm trong ELF header, ở trường e_machine — một số nguyên 2 byte ' +
           'tại offset 0x12 (62 = x86-64, 183 = AArch64) — chứ không rải trong phần mã lệnh. ' +
           'Đọc bằng readelf -h hoặc file.</p><p>Vị trí cố định ở đầu file là điều kiện để ' +
           'nhân quyết định TRƯỚC khi nạp bất cứ byte mã nào: hoặc từ chối ngay với ENOEXEC, ' +
           'hoặc tra binfmt_misc và chuyển file cho một trình thông dịch. Không bao giờ có ' +
           'chuyện chạy được nửa chừng rồi sập.</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Cùng một máy, cùng một lúc: <code>uname -m</code> in ra <code>x86_64</code>, còn ' +
         '<code>aarch64-linux-gnu-gcc -dumpmachine</code> in ra <code>aarch64-linux-gnu</code>. ' +
         'Hai lệnh này không mâu thuẫn vì chúng trả lời hai câu hỏi khác nhau: ' +
         '<code>uname -m</code> hỏi về <b>nhân đang chạy</b>, còn <code>-dumpmachine</code> ' +
         'hỏi về __________ của trình biên dịch.',
      a: ['target', 'target', 'đích', 'kiến trúc đích', 'máy đích', 'target machine',
          'kiến trúc target', 'nơi mã sinh ra sẽ chạy', 'kiến trúc mà nó sinh mã cho',
          'kiến trúc nó sinh mã cho', 'bộ ba target', 'triplet target'],
      ph: 'một trong ba chữ build / host / target',
      why: '<p><code>uname -m</code> là một syscall hỏi nhân: "anh đang chạy trên kiến trúc ' +
           'nào?" Câu trả lời là thuộc tính của <b>máy</b>, và trên máy này nó luôn là ' +
           '<code>x86_64</code> dù bạn cài bao nhiêu trình biên dịch chéo.</p>' +
           '<p><code>-dumpmachine</code> hỏi trình biên dịch: "anh sinh mã cho kiến trúc ' +
           'nào?" Câu trả lời là thuộc tính của <b>công cụ</b>, nên mỗi trình biên dịch trên ' +
           'máy cho một đáp án khác nhau.</p>' +
           '<p>Nhầm hai câu hỏi này là cách kinh điển để build ra một thư mục đầy file ' +
           'x86-64 rồi chép sang bo và ngạc nhiên. Quy tắc thực dụng: trong một Makefile ' +
           'cho hệ nhúng, <code>uname -m</code> gần như luôn là câu trả lời <b>sai</b> cho ' +
           'câu hỏi bạn đang thực sự hỏi.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi thông báo (hoặc hiện tượng) với nguyên nhân của nó. Cả sáu đều xuất hiện ' +
         'thật khi bạn làm phần E — hãy ghép theo <b>giai đoạn</b> mà nó xảy ra, đừng ghép ' +
         'theo từ khoá trông quen mắt.',
      left: [
        '<code>cannot execute binary file: Exec format error</code>, thoát <b>126</b>',
        '<code>ld: sum-arm64.o: Relocations in generic ELF (EM: 183)</code>, thoát <b>1</b>',
        '<code>error: static assertion failed: "this code assumes a 64-bit long"</code>',
        '<code>gcc: internal compiler error: Segmentation fault … program cc1</code>, thoát <b>4</b>',
        'Chương trình chạy đúng, in đúng kết quả, nhưng chậm hơn bản native khoảng <b>6×</b>',
        '<code>aarch64-linux-gnu-gcc: command not found</code>'
      ],
      right: [
        'Chưa cài gói toolchain chéo — lỗi ở <b>shell</b>, trước khi có bất cứ giai đoạn ' +
          'biên dịch nào',
        'Trộn hai file <code>.o</code> khác kiến trúc — trình <b>liên kết</b> chặn, sớm hơn ' +
          'nhân rất nhiều',
        'Nhân đọc <code>e_machine</code>, không khớp và không có handler nào nhận — từ chối ' +
          'ở <b>execve()</b>',
        'Trình biên dịch chạm trần vùng địa chỉ (<code>ulimit -v</code>) — chết ở ' +
          '<b>giữa lúc dịch</b>',
        'Nhân giao file cho <code>qemu-aarch64</code> qua <code>binfmt_misc</code> — chạy ' +
          'bằng <b>mô phỏng</b>, không phải bằng CPU',
        '<code>sizeof(long)</code> trên target là 4 chứ không phải 8 — bị bắt ở ' +
          '<b>tiền xử lý / dịch</b>, trước khi sinh mã'
      ],
      a: [2, 1, 5, 3, 4, 0],
      why: '<p>Cột phải cố tình xếp theo thứ tự khác cột trái, và cách ghép đúng là hỏi ' +
           '"<b>giai đoạn nào</b> phát hiện ra vấn đề này?". Xếp cả sáu theo trục thời gian ' +
           'thì rõ ngay:</p>' +
           '<ol>' +
           '<li><b>shell</b> — chưa có toolchain: <code>command not found</code>.</li>' +
           '<li><b>dịch</b> — <code>_Static_assert</code> thất bại vì ' +
           '<code>sizeof(long)</code> khác trên target.</li>' +
           '<li><b>dịch</b> — hết vùng địa chỉ, <code>cc1</code> chết giữa chừng.</li>' +
           '<li><b>liên kết</b> — <code>ld</code> thấy hai <code>.o</code> khác ' +
           '<code>e_machine</code>.</li>' +
           '<li><b>nạp</b> — <code>execve()</code> từ chối vì không handler nào nhận.</li>' +
           '<li><b>chạy</b> — có handler, nên nó chạy, chỉ chậm.</li>' +
           '</ol>' +
           '<p>Đọc theo chiều này bạn sẽ thấy một điều đáng nhớ: lệch kiến trúc bị bắt ' +
           '<b>càng sớm càng tốt</b>, và trình liên kết bắt sớm hơn nhân. Một lỗi bị bắt lúc ' +
           'link tốn của bạn ba giây; đúng lỗi ấy lọt tới lúc nạp trên bo ngoài hiện trường ' +
           'thì tốn một chuyến đi.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     B · THÔNG HIỂU — 6 câu, tự chấm theo tiêu chí
     LƯU Ý ĐỊNH DẠNG: `sol` được nhúng thẳng vào HTML (js/render-ex.js dòng 165),
     và .exf__panel KHÔNG có white-space: pre. Vì vậy `\n` trong sol bị HTML nuốt
     thành dấu cách. Mọi lời giải nhiều đoạn phải viết bằng <p>…</p>, và mọi ký tự
     `<` trong văn bản (ví dụ tên header) phải viết &lt;.
     ══════════════════════════════════════════════════════════════════════ */
  B: [
    { id: 'b1', k: 'free', tag: 'Đọc output', truc: 0, rows: 7,
      q: 'Bốn khối dưới đây chụp trên <b>cùng một máy WSL x86-64</b>, cách nhau vài giây, ' +
         'không sửa gì giữa các lệnh. Chúng có vẻ mâu thuẫn với nhau — Bài 25 nói nhân sẽ ' +
         '<b>từ chối</b> một file ARM64, mà ở đây nó chạy. Hãy giải thích <b>chính xác ai đã ' +
         'thực thi những lệnh ARM đó</b>, và chỉ ra trong khối 4 <b>bằng chứng cụ thể</b> ' +
         'cho câu trả lời của bạn.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '# khối 1 — file hello-arm64\n' +
          'hello-arm64: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux),\n' +
          'statically linked, BuildID[sha1]=8990ffc6cc0553ea97e2f05e5e33c5279b74448e,\n' +
          'for GNU/Linux 3.7.0, not stripped\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# khối 2 — readelf -h hello-arm64 | grep -E \'Class|Machine|Type\'\n' +
          '  Class:                             ELF64\n' +
          '  Type:                              EXEC (Executable file)\n' +
          '  Machine:                           AArch64\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# khối 3 — chạy thẳng, KHÔNG gõ qemu-aarch64 ở đầu dòng\n' +
          '$ ./hello-arm64\n' +
          'hello from a 64-bit long\n' +
          'exit=0\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# khối 4 — cat /proc/sys/fs/binfmt_misc/qemu-aarch64\n' +
          'enabled\n' +
          'interpreter /usr/bin/qemu-aarch64\n' +
          'flags: POF\n' +
          'offset 0\n' +
          'magic 7f454c460201010000000000000000000200b700\n' +
          'mask  ffffffffffffff00fffffffffffffffffeffffff\n' },
        { t: 'cal', kind: 'tip', title: 'Gợi ý đọc khối 4',
          x: '<p>Đổi hai byte cuối của <code>magic</code> sang hệ mười. Rồi đối chiếu với ' +
             '<code>e_machine</code> mà bạn đã gặp ở phần A.</p>' }
      ],
      hint: 'Nhân không hề "biết chạy" ARM. Nó chỉ biết tra một cái bảng, rồi giao việc cho ' +
            'người khác. Khối 4 chính là một dòng trong cái bảng đó.',
      crit: [
        'Nói rõ file <b>đúng là ARM64</b> — khối 1 và 2 đồng ý với nhau ' +
          '(<code>ARM aarch64</code> / <code>Machine: AArch64</code>), nên khối 3 ' +
          '<b>không</b> chứng minh file là x86-64',
        'Nêu đúng thủ phạm: nhân tra bảng <code>binfmt_misc</code>, thấy khớp, rồi thực sự ' +
          'nạp <code>/usr/bin/qemu-aarch64</code> và đưa file này cho nó',
        'Chỉ ra được bằng chứng cụ thể trong khối 4: dòng ' +
          '<code>interpreter /usr/bin/qemu-aarch64</code>, và/hoặc hai byte ' +
          '<code>00b7</code> ở cuối <code>magic</code> — <code>0xb7 = 183</code>, đúng ' +
          '<code>e_machine</code> của AArch64',
        'Kết luận đúng phạm vi: CPU x86-64 vẫn chỉ chạy lệnh x86; ' +
          '<code>qemu-aarch64</code> <b>mô phỏng</b> từng lệnh ARM. Đem file này sang một ' +
          'máy x86-64 <b>không</b> cài qemu-user thì vẫn hỏng đúng như Bài 25 mô tả'
      ],
      sol:
        '<p>File <b>đúng là ARM64</b>. Khối 1 và khối 2 nói cùng một điều — ' +
        '<code>ARM aarch64</code>, <code>Machine: AArch64</code> — và không có gì trong khối 3 ' +
        'mâu thuẫn với chúng. Cái sai là suy luận <i>"chạy được ⇒ là file của máy tôi"</i>.</p>' +
        '<p>Người thực thi những lệnh ARM đó là <code>/usr/bin/qemu-aarch64</code>, không phải ' +
        'CPU. Khi bạn gõ <code>./hello-arm64</code>, <code>execve()</code> đọc vài chục byte đầu ' +
        'file và thấy <code>e_machine</code> không phải 62. Nhưng <b>trước khi</b> trả ' +
        '<code>ENOEXEC</code>, nhân duyệt bảng <code>binfmt_misc</code>. Mỗi mục trong bảng là ' +
        'một cặp <code>magic</code> + <code>mask</code>: nhân AND các byte đầu file với ' +
        '<code>mask</code> rồi so với <code>magic</code>. Mục <code>qemu-aarch64</code> khớp, nên ' +
        'thay vì từ chối, nhân nạp chương trình ghi ở dòng <code>interpreter</code> và đưa ' +
        '<code>hello-arm64</code> cho nó như một tham số.</p>' +
        '<p>Bằng chứng nằm ngay trong khối 4:</p>' +
        '<ul>' +
        '<li><code>interpreter /usr/bin/qemu-aarch64</code> — tên của chương trình thật sự được ' +
        'nạp. Đây là câu trả lời trực tiếp cho câu hỏi "ai đã chạy nó".</li>' +
        '<li><code>magic</code> kết thúc bằng <code>00b7</code>. Đó chính là ' +
        '<code>e_machine</code> ở dạng little-endian: <code>0x00b7</code> = <b>183</b> = ' +
        'AArch64. Nói cách khác, luật này soi đúng cái trường mà phần A nói tới.</li>' +
        '<li><code>mask</code> có <code>ff</code> ở đúng vị trí ấy, nghĩa là hai byte đó phải ' +
        'khớp tuyệt đối — không có chuyện khớp nhầm.</li>' +
        '</ul>' +
        '<p>CPU của bạn không chạy một lệnh ARM nào. <code>qemu-aarch64</code> là một chương ' +
        'trình <b>x86-64</b> đọc từng lệnh ARM và làm điều tương đương bằng lệnh x86. Vì thế Bài ' +
        '25 vẫn đúng: trên một máy x86-64 không cài <code>qemu-user-binfmt</code>, đúng file này ' +
        'sẽ cho <code>cannot execute binary file: Exec format error</code> và thoát <b>126</b>. ' +
        'Cái đã đổi là <b>MÁY</b>, không phải <b>FILE</b> — và đó là toàn bộ nội dung của trục ' +
        'thứ nhất.</p>' },

    { id: 'b2', k: 'free', tag: 'Đọc output', truc: 1, rows: 7,
      q: 'Bản ghi dưới đây đo việc biên dịch <b>một</b> file C nhỏ — 11 711 byte, 404 dòng, ' +
         'chỉ gồm 200 hàm cộng số. Dùng các con số trong đó để trả lời: một bo nhúng có ' +
         '<b>64 MB RAM</b> và rootfs <b>16 MB</b> thì hỏng ở đâu <b>trước</b>, và vì sao câu ' +
         '"bo chậm thôi, để nó build qua đêm" là <b>đọc sai vấn đề</b>?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '# /usr/bin/time -f "%e %M", 5 cặp xen kẽ, cả hai trình biên dịch đã hâm nóng\n' +
          '#                 thời gian (s)   peak RSS (KB)\n' +
          'native gcc             0.23           33 548\n' +
          'cross  gcc             0.33           43 672\n' +
          'native gcc             0.25           33 584\n' +
          'cross  gcc             0.30           43 668\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# tìm sàn vùng địa chỉ bằng lưỡng phân\n' +
          '$ ( ulimit -v 32768; gcc -O2 -c gen.c -o /dev/null ); echo "exit=$?"\n' +
          'gcc: internal compiler error: Segmentation fault signal terminated program cc1\n' +
          'exit=4\n' +
          '\n' +
          '$ ( ulimit -v 65536; gcc -O2 -c gen.c -o /dev/null ); echo "exit=$?"\n' +
          'exit=0\n' },
        { t: 'table',
          head: ['Thành phần', 'Kích thước'],
          rows: [
            ['<code>cc1</code> — trình dịch C thật sự nằm sau <code>gcc</code>', '35,7 MB'],
            ['<code>/usr/libexec/gcc/x86_64-linux-gnu/15</code>', '111 MB'],
            ['<code>/usr/lib/gcc/x86_64-linux-gnu/15</code>', '30 MB'],
            ['gói <code>libgcc-15-dev</code> (dpkg Installed-Size)', '18 201 KB'],
            ['gói <code>libc6-dev</code> (dpkg Installed-Size)', '13 792 KB']
          ] }
      ],
      hint: 'Có hai giới hạn khác nhau trong bản ghi này, và chúng hỏng theo hai kiểu khác ' +
            'nhau. Một cái làm bạn không cài nổi; cái kia làm bạn cài được nhưng chạy thì chết.',
      crit: [
        'Nhận ra <b>rootfs 16 MB hỏng trước</b>: riêng <code>cc1</code> đã 35,7 MB, chưa kể ' +
          'header và thư viện — bộ công cụ <b>không lắp vừa</b>, nên câu chuyện dừng lại ' +
          'trước khi nói tới thời gian',
        'Nêu giới hạn thứ hai bằng số: một file C 11 KB cần <b>~33 MB</b> RSS; sàn vùng địa ' +
          'chỉ nằm giữa <b>32 MB (chết)</b> và <b>64 MB (chạy)</b> — mà bo chỉ có 64 MB cho ' +
          '<i>cả hệ thống</i>',
        'Nói rõ vì sao "chờ qua đêm" không cứu được: hết bộ nhớ là hỏng <b>ngay</b>, không ' +
          'phải chậm; thêm thời gian không tạo ra thêm byte',
        'Đọc đúng chế độ hỏng: <code>internal compiler error … cc1</code> / <b>exit 4</b> là ' +
          'trình biên dịch <i>bị giết giữa chừng</i> — một thông báo rất dễ khiến người ta đổ ' +
          'lỗi cho mã nguồn thay vì cho bộ nhớ'
      ],
      sol:
        '<p><b>Hỏng trước ở rootfs.</b> <code>cc1</code> — chương trình dịch C thật sự nằm sau ' +
        '<code>gcc</code> — đã là 35,7 MB, một mình nó hơn gấp đôi rootfs 16 MB. Cộng thêm ' +
        '<code>cpp</code>, <code>as</code>, <code>ld</code>, header của libc và các gói ' +
        '<code>-dev</code> thì con số thực tế là hàng trăm MB. Bo không cài nổi bộ công cụ, nên ' +
        'câu hỏi "mất bao lâu" chưa bao giờ được đặt ra.</p>' +
        '<p>Giả sử bạn cắm thêm một thẻ nhớ và nhét được vào, giới hạn thứ hai đến ngay: dịch ' +
        '<b>một</b> file C 11 KB ngốn <b>~33 MB</b> RSS. Lưỡng phân cho thấy sàn vùng địa chỉ ' +
        'nằm giữa 32 MB (chết) và 64 MB (chạy được). Bo có 64 MB RAM cho <b>cả hệ thống</b> — ' +
        'nhân, init, shell, driver, bộ đệm trang — nên phần còn lại dành cho <code>cc1</code> ' +
        'gần như chắc chắn nằm dưới sàn đó. Và đây mới là một file 11 KB gồm 200 hàm cộng số; ' +
        'một file thật trong kernel hay busybox lớn hơn nhiều lần.</p>' +
        '<p>Vì thế "để nó build qua đêm" là đọc sai vấn đề. <b>Chậm là thứ chờ được.</b> Hết bộ ' +
        'nhớ thì không phải chậm — nó là hỏng, và nó hỏng ở giây thứ nhất y như ở giờ thứ tám. ' +
        'Rào cản thật là <b>tài nguyên</b>, mà khoản lớn nhất lại là kích thước của chính bộ ' +
        'công cụ, thứ chẳng liên quan gì tới chương trình bạn muốn viết.</p>' +
        '<p>Chú ý cả <b>cách</b> nó chết: <code>internal compiler error: Segmentation fault … ' +
        'program cc1</code>, exit 4. Thông báo này trông như một lỗi của gcc hoặc của mã nguồn, ' +
        'và không ít người đã mất cả buổi đi sửa code trong khi thứ cần sửa là bộ nhớ. Gặp ' +
        '<code>internal compiler error</code> trên máy nhỏ, hãy nghĩ tới RAM trước tiên.</p>' },

    { id: 'b3', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 5,
      q: 'Một đồng nghiệp phản đối việc chuyển sang cross-compile. Phát biểu dưới đây có ' +
         '<b>một chỗ sai về cơ chế</b> và <b>một chỗ sai về số liệu</b>. Hãy chỉ ra cả hai, ' +
         'rồi viết lại phát biểu cho đúng.',
      blocks: [
        { t: 'cal', kind: 'info', title: 'Trích thảo luận trong nhóm',
          x: '<p><i>"Cross-compile thì chắc chắn chậm hơn chứ. Trình biên dịch phải dịch mã ' +
             'x86 mà nó sinh ra sang mã ARM, tức là làm thêm một bước nữa. Tôi đoán phải chậm ' +
             'gấp mấy lần, đúng bằng cái giá mình đã thấy khi chạy nhị phân ARM bằng qemu."</i></p>' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# cùng gen.c, cả hai đã hâm nóng, 5 cặp xen kẽ, có đảo thứ tự để loại hiệu ứng thứ tự\n' +
          'native gcc                 0.23  0.25  0.24  0.24  0.23 s\n' +
          'aarch64-linux-gnu-gcc      0.33  0.30  0.33  0.31  0.30 s\n' +
          '\n' +
          '# hai file .o sinh ra\n' +
          '19 320 byte  (native)\n' +
          '19 424 byte  (cross)\n' +
          '\n' +
          '# để đối chiếu: CHẠY một nhị phân ARM64 bằng mô phỏng, trên chính máy này\n' +
          '# spin.c, vòng lặp 200 000 000 lần, 5 cặp xen kẽ, cả hai đã hâm nóng\n' +
          './spin-x86      0.08  0.08  0.09  0.09  0.08 s\n' +
          './spin-arm64    0.52  0.54  0.51  0.50  0.49 s\n' }
      ],
      hint: 'Hỏi một câu rất cụ thể: trong suốt quá trình cross-compile, có lúc nào tồn tại mã ' +
            'x86 của chương trình bạn đang build không?',
      crit: [
        'Bác bỏ chỗ sai về cơ chế: cross-compile <b>không dịch</b> gì cả — không bao giờ tồn ' +
          'tại mã x86 của chương trình rồi mới đổi sang ARM; trình biên dịch sinh <b>thẳng</b> ' +
          'mã ARM, y hệt cách nó sinh mã x86',
        'Bác bỏ chỗ sai về số liệu bằng chính bản ghi: <b>0,23–0,25 s</b> so với ' +
          '<b>0,30–0,33 s</b>, tức khoảng <b>30 %</b> — không phải "gấp mấy lần"',
        'Chỉ ra chỗ so sánh nhầm: con số gấp nhiều lần là của <b>mô phỏng lúc chạy</b> ' +
          '(0,08 → 0,51 s, ~6×), một chuyện hoàn toàn khác với biên dịch',
        'Nêu được nguyên nhân thật của 30 %: đó là một <b>chương trình khác</b>, backend khác, ' +
          'dùng nhiều bộ nhớ hơn (~43 MB so với ~33 MB) — chứ không phải một bước dịch thêm'
      ],
      sol:
        '<p><b>Sai về cơ chế.</b> Cross-compile không có bước dịch nào. <code>gcc</code> đọc mã ' +
        'nguồn, dựng cây cú pháp, tối ưu trên biểu diễn trung gian của riêng nó, rồi <b>ở bước ' +
        'cuối cùng</b> mới sinh ra byte lệnh. Bản cross làm đúng những bước ấy; nó chỉ khác ở ' +
        'bước cuối, nơi nó tra bảng lệnh ARM64 thay vì bảng lệnh x86-64. Không lúc nào tồn tại ' +
        'mã x86 của chương trình bạn đang build, nên không có gì để dịch cả.</p>' +
        '<p><b>Sai về số liệu.</b> Bản ghi cho 0,23–0,25 s (native) so với 0,30–0,33 s (cross): ' +
        'chênh khoảng <b>30 %</b>, tức 0,07 giây. Hai file <code>.o</code> sinh ra cũng gần bằng ' +
        'nhau — 19 320 và 19 424 byte — nên rõ ràng hai trình biên dịch đang làm cùng một khối ' +
        'lượng công việc.</p>' +
        '<p><b>Chỗ nhầm lẫn.</b> Con số "gấp mấy lần" mà đồng nghiệp nhớ là của việc <b>chạy</b> ' +
        'nhị phân ARM bằng mô phỏng: 0,08 s so với 0,51 s, khoảng 6 lần. Mô phỏng lúc chạy và ' +
        'biên dịch chéo là hai chuyện không liên quan. Mô phỏng phải diễn giải <i>từng lệnh ARM, ' +
        'mỗi lần chương trình chạy</i>; cross-compile chỉ ghi ra file một lần rồi thôi. Lẫn hai ' +
        'con số này là cách phổ biến nhất để sợ cross-compile một cách vô cớ.</p>' +
        '<p><b>Viết lại:</b> <i>"Cross-compile chậm hơn native khoảng 30 % trên máy này và tốn ' +
        'thêm ~10 MB RAM, vì nó là một chương trình khác với backend khác — chứ không phải vì nó ' +
        'phải dịch thêm một bước; nó không dịch gì cả. Con số gấp nhiều lần mà tôi nhớ là của ' +
        'qemu lúc chạy, không phải của lúc build."</i></p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', truc: 2, rows: 6,
      q: 'Dưới đây là <code>aarch64-linux-gnu-gcc -v</code> chạy trên máy WSL x86-64 của bạn ' +
         '(đã lược bớt những cờ không liên quan). Hãy dùng <b>ba dòng cụ thể</b> trong đó để ' +
         'giải thích ba chữ <code>build</code> / <code>host</code> / <code>target</code>, rồi ' +
         'trả lời: <b>bản thân file <code>aarch64-linux-gnu-gcc</code> là nhị phân của kiến ' +
         'trúc nào?</b>',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          'Target: aarch64-linux-gnu\n' +
          'Configured with: ../src/configure -v\n' +
          '  --build=x86_64-linux-gnu\n' +
          '  --host=x86_64-linux-gnu\n' +
          '  --target=aarch64-linux-gnu\n' +
          '  --program-prefix=aarch64-linux-gnu-\n' +
          '  --includedir=/usr/aarch64-linux-gnu/include\n' +
          'Thread model: posix\n' +
          'gcc version 15.2.0 (Ubuntu 15.2.0-16ubuntu1)\n' },
        { t: 'cal', kind: 'tip', title: 'Một câu hỏi phụ đáng nghĩ trước khi chạy',
          x: '<p>Nếu <code>--host</code> là <code>x86_64-linux-gnu</code>, thì ' +
             '<code>file $(which aarch64-linux-gnu-gcc)</code> sẽ in ra gì? Trả lời trước, rồi ' +
             'mới gõ.</p>' }
      ],
      hint: 'Ba chữ ấy trả lời ba câu hỏi khác nhau, và cả ba đều nói về CÔNG CỤ — không chữ ' +
            'nào nói về chương trình bạn sắp viết.',
      crit: [
        'Gắn đúng từng chữ với từng dòng: <code>--build=x86_64</code> = nơi bộ công cụ này ' +
          '<b>được dựng ra</b>; <code>--host=x86_64</code> = nơi nó <b>chạy</b>; ' +
          '<code>--target=aarch64</code> = nơi thứ nó <b>sinh ra</b> sẽ chạy',
        'Trả lời đúng câu hỏi chính: <code>aarch64-linux-gnu-gcc</code> là một nhị phân ' +
          '<b>x86-64</b>, vì <code>--host</code> nói thế — kiểm tra được bằng ' +
          '<code>file $(which aarch64-linux-gnu-gcc)</code>',
        'Nói được vì sao ở đây <code>build</code> trùng <code>host</code>, và nêu một trường ' +
          'hợp chúng khác nhau (dựng trên PC Linux một bộ công cụ <b>chạy trên Windows</b> để ' +
          'build cho ARM — <i>canadian cross</i>)',
        'Giải thích <code>--program-prefix</code>: tiền tố tồn tại để nhiều trình biên dịch có ' +
          '<b>target khác nhau</b> cùng sống trong một <code>$PATH</code> mà không đè lên nhau'
      ],
      sol:
        '<p>Ba dòng, ba câu hỏi khác nhau — và cả ba đều nói về <b>bộ công cụ</b>, không nói về ' +
        'chương trình bạn sắp viết:</p>' +
        '<ul>' +
        '<li><code>--build=x86_64-linux-gnu</code> — bộ công cụ này <b>được biên dịch ra ở ' +
        'đâu</b>. Đây là máy của người đóng gói Ubuntu, không phải máy bạn.</li>' +
        '<li><code>--host=x86_64-linux-gnu</code> — nó <b>chạy ở đâu</b>. Nên bản thân file ' +
        '<code>aarch64-linux-gnu-gcc</code> là một chương trình <b>x86-64</b>. Nó buộc phải ' +
        'thế, vì nó đang chạy trên máy bạn. <code>file $(which aarch64-linux-gnu-gcc)</code> sẽ ' +
        'xác nhận: <code>ELF 64-bit LSB … x86-64</code>.</li>' +
        '<li><code>--target=aarch64-linux-gnu</code> — mã mà nó <b>sinh ra</b> sẽ chạy ở đâu. ' +
        'Chỉ chữ này nói về con bo.</li>' +
        '</ul>' +
        '<p>Đây đúng là chỗ hay bị nhớ vẹt thành <i>"target = con bo, host = máy tôi"</i>. Cách ' +
        'nhớ đúng: cả ba đều là thuộc tính của <b>công cụ</b>, và chữ <code>target</code> chỉ tồn ' +
        'tại với những chương trình sinh mã cho một máy khác. Dòng <code>Target:</code> ở đầu ' +
        'output chính là thứ <code>-dumpmachine</code> in ra.</p>' +
        '<p><code>build</code> trùng <code>host</code> ở đây vì Ubuntu dựng gói này trên chính ' +
        'x86-64. Chúng khác nhau thật khi bạn dựng — trên một PC Linux — một bộ toolchain ' +
        '<b>chạy được trên Windows</b> để build cho ARM: <code>build=x86_64-linux</code>, ' +
        '<code>host=x86_64-w64-mingw32</code>, <code>target=aarch64-linux-gnu</code>. Ba chỗ ' +
        'khác nhau thật sự, và đó là lý do cần tới ba cái tên chứ không phải hai. Trường hợp này ' +
        'có tên riêng: <i>canadian cross</i>.</p>' +
        '<p><code>--program-prefix=aarch64-linux-gnu-</code> giải thích vì sao mọi công cụ chéo ' +
        'đều có cái tiền tố dài dòng ấy: nhờ nó mà <code>gcc</code>, ' +
        '<code>aarch64-linux-gnu-gcc</code> và <code>arm-linux-gnueabihf-gcc</code> cùng nằm ' +
        'trong <code>/usr/bin</code> mà không cái nào đè cái nào. <b>Tiền tố chính là target, ' +
        'viết ra thành tên file.</b></p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: 'Cùng một file <code>guard.c</code>, ba trình biên dịch, ba kết quả. Hãy giải thích vì ' +
         'sao bản <code>armhf</code> thất bại — và, quan trọng hơn, vì sao việc nó <b>thất bại ' +
         'lúc dịch</b> lại là một điều <b>may mắn</b>.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'cat guard.c\n' +
          '// guard.c\n' +
          '_Static_assert(sizeof(long) == 8, "this code assumes a 64-bit long");\n' +
          'int main(void) { return 0; }' },
        { t: 'code', where: 'out', nocopy: true, code:
          '$ gcc guard.c -o guard-x86                     # OK\n' +
          '$ aarch64-linux-gnu-gcc guard.c -o guard-a64   # OK\n' +
          '$ arm-linux-gnueabihf-gcc guard.c -o guard-hf\n' +
          'guard.c:2:1: error: static assertion failed: "this code assumes a 64-bit long"\n' },
        { t: 'table',
          head: ['Trình biên dịch', '<code>-dumpmachine</code>', '<code>__SIZEOF_LONG__</code>'],
          rows: [
            ['<code>gcc</code>', '<code>x86_64-linux-gnu</code>', '8'],
            ['<code>aarch64-linux-gnu-gcc</code>', '<code>aarch64-linux-gnu</code>', '8'],
            ['<code>arm-linux-gnueabihf-gcc</code>', '<code>arm-linux-gnueabihf</code>', '<b>4</b>']
          ] }
      ],
      hint: 'Bỏ dòng <code>_Static_assert</code> đi thì cả ba đều dịch trót lọt. Lúc đó chuyện gì ' +
            'xảy ra — và bạn sẽ phát hiện ra nó ở đâu, vào lúc nào?',
      crit: [
        'Nêu đúng nguyên nhân: <code>arm-linux-gnueabihf</code> là ABI <b>32-bit</b>, nên ' +
          '<code>sizeof(long)</code> là <b>4</b> chứ không phải 8 — <code>long</code> không có ' +
          'kích thước cố định, nó do <b>ABI của target</b> quyết định',
        'Nói rõ đây <b>không</b> phải lỗi của trình biên dịch: cả ba đều làm đúng ABI của mình; ' +
          'cái sai nằm trong mã nguồn, nơi có một giả định chỉ đúng với hai trong ba target',
        'Trả lời được phần "vì sao may mắn": không có <code>_Static_assert</code> thì mã vẫn ' +
          'dịch trót lọt và hỏng <b>âm thầm</b> — giá trị 64-bit bị cắt cụt lúc chạy, trên bo, ' +
          'không một thông báo nào',
        'Rút ra nguyên tắc dùng được: cần chính xác độ rộng thì dùng ' +
          '<code>&lt;stdint.h&gt;</code> (<code>int64_t</code>, <code>uint32_t</code>, ' +
          '<code>intptr_t</code>), và đặt <code>_Static_assert</code> để mọi giả định tự nói ra ' +
          'lúc build'
      ],
      sol:
        '<p><code>arm-linux-gnueabihf</code> là một ABI <b>32-bit</b>: con trỏ 4 byte, ' +
        '<code>long</code> 4 byte. <code>aarch64</code> và <code>x86-64</code> đều 64-bit nên ' +
        '<code>long</code> là 8 byte. Chuẩn C chỉ bảo đảm <code>long</code> rộng <i>ít nhất</i> ' +
        '32 bit — kích thước thật do <b>ABI của target</b> quyết định, không do ngôn ngữ. Cột ' +
        '<code>__SIZEOF_LONG__</code> trong bảng chính là con số ấy, và bạn hỏi được nó mà không ' +
        'cần biên dịch gì.</p>' +
        '<p>Không trình biên dịch nào sai ở đây. Cả ba đều tuân thủ đúng ABI của target mình. ' +
        'Cái sai nằm trong <b>mã nguồn</b>: nó ngầm giả định <code>long</code> là 64-bit, và giả ' +
        'định đó chỉ đúng với hai trong ba target.</p>' +
        '<p><b>Vì sao thất bại lúc dịch lại may mắn.</b> Bỏ dòng <code>_Static_assert</code> đi ' +
        'thì cả ba đều dịch trót lọt, không một cảnh báo. Rồi trên bo armhf, mọi giá trị 64-bit ' +
        'gán vào một <code>long</code> sẽ bị cắt mất nửa trên — một timestamp, một địa chỉ, một ' +
        'số đếm byte. Chương trình vẫn chạy, chỉ là cho ra số sai. Bạn sẽ phát hiện ra nó sau ' +
        'nhiều ngày, trên thiết bị ngoài hiện trường, qua một triệu chứng chẳng liên quan gì tới ' +
        '<code>sizeof</code>.</p>' +
        '<p>Đó là lý do một lỗi lúc dịch đắt <b>ba giây</b> còn một kết quả sai âm thầm đắt ' +
        '<b>vài tuần</b>. Nguyên tắc rút ra: cần chính xác về độ rộng thì dùng ' +
        '<code>&lt;stdint.h&gt;</code> — <code>int64_t</code>, <code>uint32_t</code>, ' +
        '<code>intptr_t</code> — và viết <code>_Static_assert</code> cho mọi giả định về kích ' +
        'thước, để giả định <i>tự khai báo lúc build</i> thay vì <i>tự bộc lộ lúc chạy</i>.</p>' },

    { id: 'b6', k: 'free', tag: 'So sánh cặp', rows: 5,
      q: 'Hai file dưới đây build từ <b>cùng một</b> <code>hello.c</code>. Bản ARM64 lớn gấp ' +
         '<b>44 lần</b>. Một người kết luận: <i>"mã ARM cồng kềnh hơn mã x86 nhiều."</i> Kết ' +
         'luận đó sai. Hãy chỉ ra <b>khác biệt nào mới là khác biệt đáng kể</b>, và mô tả một ' +
         'phép đo chứng minh điều bạn nói.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, code:
          '$ ls -l hello-x86 hello-arm64\n' +
          '  15 960  hello-x86\n' +
          ' 705 248  hello-arm64\n' +
          '\n' +
          '$ file hello-x86\n' +
          'hello-x86: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV),\n' +
          'dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, ... not stripped\n' +
          '\n' +
          '$ file hello-arm64\n' +
          'hello-arm64: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux),\n' +
          'statically linked, ... not stripped\n' },
        { t: 'code', where: 'out', nocopy: true, code:
          '# cùng hello.c, chỉ nhìn phần mã lệnh của riêng hàm main\n' +
          'x86-64 :  17 lệnh,  51 byte\n' +
          'ARM64  :  15 lệnh,  60 byte\n' }
      ],
      hint: 'Đọc thật kỹ hai dòng <code>file</code>. Có một chữ trong bản x86 mà bản ARM không ' +
            'có, và một chữ trong bản ARM mà bản x86 không có.',
      crit: [
        'Chỉ ra đúng khác biệt đáng kể: <b>dynamically linked</b> so với ' +
          '<b>statically linked</b> — không phải kiến trúc',
        'Giải thích được vì sao nó tạo ra 44×: bản tĩnh <b>chép hẳn</b> phần libc cần dùng vào ' +
          'file; bản động chỉ để lại tên bộ nạp ' +
          '<code>/lib64/ld-linux-x86-64.so.2</code> và mượn <code>libc.so</code> lúc chạy',
        'Dùng số liệu <code>main</code> để bác bỏ: 17 lệnh / 51 byte so với 15 lệnh / 60 byte — ' +
          '<b>cùng cỡ</b>, chênh 9 byte, không cách nào tạo ra 689 KB',
        'Mô tả được một phép đo công bằng: build lại <b>cả hai</b> cùng một chế độ liên kết rồi ' +
          'mới so <code>ls -l</code>; hoặc so <code>size</code> / phần <code>.text</code> thay ' +
          'vì so kích thước file'
      ],
      sol:
        '<p>Khác biệt đáng kể là <b>cách liên kết</b>, không phải kiến trúc. Hai dòng ' +
        '<code>file</code> nói thẳng ra điều đó: <code>hello-x86</code> là ' +
        '<b>dynamically linked</b>, <code>hello-arm64</code> là <b>statically linked</b>.</p>' +
        '<p>Bản động chỉ chứa mã của chính bạn cộng thêm một cái tên: ' +
        '<code>interpreter /lib64/ld-linux-x86-64.so.2</code>. Lúc chạy, bộ nạp động mới đi tìm ' +
        '<code>libc.so</code> và nối vào. Bản tĩnh thì chép hẳn mọi phần libc mà chương trình ' +
        'chạm tới — <code>printf</code> kéo theo cả bộ máy định dạng, cả tầng đệm stdio, cả lớp ' +
        'gọi syscall — vào bên trong file. 689 KB chênh lệch gần như toàn bộ là libc, không phải ' +
        'mã của bạn.</p>' +
        '<p>Số liệu <code>main</code> bác bỏ kết luận kia một cách trực tiếp: 17 lệnh / 51 byte ' +
        'cho x86-64 so với 15 lệnh / 60 byte cho ARM64. <b>Cùng một cỡ.</b> ARM64 thậm chí dùng ' +
        '<i>ít</i> lệnh hơn — độ dài lệnh cố định 4 byte nên đếm lệnh và đếm byte tỉ lệ với nhau ' +
        '— và nhiều hơn đúng 9 byte. Chín byte không thể nở thành 689 000 byte.</p>' +
        '<p><b>Phép đo công bằng:</b> build lại cả hai cùng một chế độ liên kết — thêm ' +
        '<code>-static</code> cho bản x86, hoặc bỏ nó ở bản ARM — rồi mới so <code>ls -l</code>. ' +
        'Cách khác là đừng so kích thước file: dùng <code>size hello-x86 hello-arm64</code> và ' +
        'chỉ so cột <code>text</code>, hoặc so cùng một hàm bằng <code>objdump -d</code>. So ' +
        'kích thước file giữa hai chế độ liên kết khác nhau là so hai thứ không cùng đơn vị.</p>' +
        '<p>Vì sao chuyện này đáng nhớ trong nhúng: liên kết tĩnh làm file to nhưng bỏ hẳn nhu ' +
        'cầu mang đúng phiên bản <code>libc</code> lên bo. Đó là một đánh đổi bạn sẽ gặp lại ' +
        'nhiều lần ở phần rootfs.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     C · VẬN DỤNG — 5 câu, tình huống mới, không có sẵn trong bài
     ══════════════════════════════════════════════════════════════════════ */
  C: [
    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0, rows: 7,
      q: 'Nhóm bạn có một job CI dựng ra <b>một</b> file nhị phân <code>sensord</code> rồi ' +
         'đẩy lên kho artefact. Ba nơi lấy về cùng một file đó, và kết quả như bảng dưới. ' +
         'Hãy giải thích <b>từng dòng</b>, rồi trả lời câu quan trọng nhất: từ hai dòng đầu, ' +
         'nhóm có <b>quyền kết luận</b> rằng artefact này đúng cho bo hay không?',
      blocks: [
        { t: 'table',
          head: ['Nơi chạy', 'Kết quả'],
          rows: [
            ['Máy WSL x86-64 của lập trình viên', 'chạy đúng, thoát 0'],
            ['Runner CI (container Ubuntu, x86-64, có cài <code>qemu-user-binfmt</code>)',
             'chạy đúng, thoát 0 — test xanh'],
            ['Gateway x86-64 ngoài hiện trường (Ubuntu tối giản)',
             '<code>cannot execute binary file: Exec format error</code>, thoát 126'],
            ['Bo ARM64 sản phẩm', 'chạy đúng, thoát 0']
          ] },
        { t: 'code', where: 'out', nocopy: true, code:
          '# chạy trên chính artefact tải về, ở cả bốn nơi, cho cùng một kết quả\n' +
          '$ readelf -h sensord | grep Machine\n' +
          '  Machine:                           AArch64\n' }
      ],
      hint: 'Ba trong bốn nơi cho cùng một kết quả, nhưng KHÔNG phải vì cùng một lý do. Hãy ' +
            'tách riêng: nơi nào chạy bằng CPU, nơi nào chạy bằng thứ khác.',
      crit: [
        'Giải thích đúng dòng 1 và 2: cả hai đều là x86-64 nhưng có ' +
          '<code>qemu-user-binfmt</code>, nên nhân chuyển file cho ' +
          '<code>qemu-aarch64</code> — chạy bằng <b>mô phỏng</b>, không phải bằng CPU',
        'Giải thích đúng dòng 3: gateway cũng là x86-64 <b>nhưng không có handler nào</b>, nên ' +
          '<code>execve()</code> trả <code>ENOEXEC</code> — đây mới là hành vi "mặc định" của ' +
          'một máy x86-64',
        'Giải thích đúng dòng 4: bo ARM64 chạy nó bằng <b>CPU thật</b>, không mô phỏng gì cả — ' +
          'cùng một kết quả nhưng khác hẳn cơ chế với dòng 1 và 2',
        'Trả lời <b>Không</b> cho câu hỏi chính, kèm lý do: hai dòng đầu chỉ chứng minh ' +
          '<i>máy đó có lớp mô phỏng</i>, không chứng minh gì về ABI, về libc trên bo, hay về ' +
          'việc file có đúng kiến trúc bo hay không',
        'Đề xuất được ít nhất một cách sửa quy trình CI: kiểm tra ' +
          '<code>readelf -h</code> / <code>file</code> trong pipeline và <b>fail</b> nếu ' +
          '<code>Machine</code> sai, và/hoặc chạy test nghiệm thu trên phần cứng thật (hoặc ' +
          'trên <code>qemu-system</code>) chứ không dựa vào một lần chạy trên runner'
      ],
      sol:
        '<p>Cả bốn dòng đều nói về <b>đúng một file</b>, và <code>readelf</code> xác nhận nó là ' +
        'AArch64 ở mọi nơi. Vậy thứ thay đổi giữa các dòng không phải file, mà là <b>hệ thống ' +
        'đang nạp nó</b> — đúng nội dung trục thứ nhất.</p>' +
        '<ul>' +
        '<li><b>Dòng 1 và 2</b> — cả hai là x86-64, cả hai có <code>qemu-user-binfmt</code>. ' +
        'Nhân khớp mẫu ELF ARM64 trong <code>binfmt_misc</code> rồi giao file cho ' +
        '<code>qemu-aarch64</code>. Chương trình chạy bằng <b>mô phỏng</b>; CPU không thực thi ' +
        'một lệnh ARM nào.</li>' +
        '<li><b>Dòng 3</b> — gateway cũng là x86-64, cũng là Ubuntu, chỉ khác là không cài ' +
        'qemu-user. Không handler nào khớp, <code>execve()</code> trả <code>ENOEXEC</code>, ' +
        'shell in <code>Exec format error</code> và thoát 126. <b>Đây mới là hành vi mặc định ' +
        'của một máy x86-64</b>; hai dòng đầu mới là ngoại lệ.</li>' +
        '<li><b>Dòng 4</b> — bo ARM64 chạy nó bằng <b>CPU thật</b>. Kết quả giống dòng 1 và 2 ' +
        'nhưng cơ chế khác hẳn, và đây là lần duy nhất trong bảng chương trình chạy đúng cách ' +
        'nó được thiết kế để chạy.</li>' +
        '</ul>' +
        '<p><b>Không</b>, nhóm không có quyền kết luận gì từ hai dòng đầu. "Test xanh trên CI" ' +
        'ở đây chỉ chứng minh <i>runner có cài lớp mô phỏng</i>. Nó không nói gì về việc bo có ' +
        'đúng libc không, ABI có khớp không, hay thậm chí artefact có đúng kiến trúc không — vì ' +
        'nếu job CI lỡ build ra một file <b>x86-64</b>, dòng 1 và 2 vẫn xanh y hệt, chỉ có bo ' +
        'là chết. Nói cách khác, cấu hình runner đang <b>che mất</b> đúng loại lỗi mà CI được ' +
        'lập ra để bắt.</p>' +
        '<p>Sửa quy trình theo hai hướng, nên làm cả hai:</p>' +
        '<ul>' +
        '<li><b>Kiểm tra rẻ, đặt ngay trong pipeline:</b> chạy ' +
        '<code>readelf -h sensord | grep Machine</code> và cho job <b>thất bại</b> nếu không ' +
        'phải <code>AArch64</code>. Tốn vài mili-giây, bắt được toàn bộ loại lỗi "build nhầm ' +
        'kiến trúc".</li>' +
        '<li><b>Kiểm tra đắt, đặt ở khâu nghiệm thu:</b> chạy test trên phần cứng thật, hoặc ' +
        'trên <code>qemu-system-aarch64</code> với đúng rootfs của sản phẩm — chứ không phải ' +
        'trên <code>qemu-aarch64</code> mượn libc của runner.</li>' +
        '</ul>' +
        '<p>Bài học chung: một lớp tiện lợi cài trên máy dev có thể <b>giấu đi</b> chính lỗi mà ' +
        'bạn cần thấy. Khi một thứ "chạy được", hãy hỏi thêm một câu: <i>nhờ cái gì?</i></p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', rows: 7,
      q: 'Ba thành viên trong nhóm <code>git clone</code> cùng một repo, gõ cùng một lệnh ' +
         '<code>make</code>, và nhận ba kết quả khác nhau. Không ai sửa <code>Makefile</code>. ' +
         'Với <b>mỗi</b> người, hãy nêu nguyên nhân khả dĩ nhất và <b>một lệnh</b> để xác nhận ' +
         'chẩn đoán đó.',
      blocks: [
        { t: 'code', where: 'file', code:
          '# Makefile\n' +
          'CC ?= aarch64-linux-gnu-gcc\n' +
          '\n' +
          'sensord: main.o util.o\n' +
          '\t$(CC) -o $@ $^\n' +
          '\n' +
          '%.o: %.c\n' +
          '\t$(CC) -c $< -o $@' },
        { t: 'table',
          head: ['Người', 'Kết quả của <code>make</code>'],
          rows: [
            ['An', 'Build xong. <code>file sensord</code> → <code>ARM aarch64</code>. Đúng ý muốn.'],
            ['Bình', 'Build xong, không một cảnh báo. <code>file sensord</code> → ' +
                    '<code>x86-64</code>.'],
            ['Chi', '<code>make: aarch64-linux-gnu-gcc: No such file or directory</code>, ' +
                    'dừng ngay ở file đầu tiên.']
          ] }
      ],
      hint: 'Đọc kỹ toán tử ở dòng đầu Makefile. <code>?=</code> và <code>=</code> không giống ' +
            'nhau, và khác biệt ấy quyết định trường hợp của Bình.',
      crit: [
        '<b>An</b>: máy có cài gói toolchain chéo và biến môi trường <code>CC</code> không bị ' +
          'đặt sẵn — xác nhận bằng <code>aarch64-linux-gnu-gcc --version</code> hoặc ' +
          '<code>make -n</code>',
        '<b>Bình</b>: <code>CC</code> đã được đặt sẵn trong môi trường (ví dụ ' +
          '<code>export CC=gcc</code> trong <code>~/.bashrc</code>), và <code>?=</code> ' +
          '<b>nhường</b> cho giá trị có sẵn nên dòng trong Makefile không có tác dụng — xác ' +
          'nhận bằng <code>echo "$CC"</code> hoặc <code>make -n</code>',
        '<b>Chi</b>: chưa cài <code>gcc-aarch64-linux-gnu</code> — xác nhận bằng ' +
          '<code>command -v aarch64-linux-gnu-gcc</code> hoặc <code>dpkg -l | grep aarch64</code>',
        'Nhận ra ca của <b>Bình là nguy hiểm nhất</b> vì nó <b>im lặng</b>: build thành công, ' +
          'exit 0, không cảnh báo — lỗi chỉ lộ ra khi file lên tới bo',
        'Đề xuất được cách chặn: đổi <code>?=</code> thành <code>=</code> (hoặc ' +
          '<code>override CC =</code>), và/hoặc thêm một bước kiểm tra ' +
          '<code>readelf -h</code> vào Makefile'
      ],
      sol:
        '<p><b>An</b> — máy đã cài <code>gcc-aarch64-linux-gnu</code> và biến môi trường ' +
        '<code>CC</code> không được đặt, nên <code>?=</code> áp dụng giá trị mặc định trong ' +
        'Makefile. Đây là kết quả mà tác giả Makefile mong đợi. Xác nhận: ' +
        '<code>make -n</code> — sẽ thấy dòng lệnh có tiền tố <code>aarch64-linux-gnu-</code>.</p>' +
        '<p><b>Bình</b> — nguyên nhân nằm ở toán tử <code>?=</code>. Nó có nghĩa ' +
        '<i>"gán nếu chưa có giá trị"</i>, và biến môi trường <b>được tính là đã có</b>. Nếu ' +
        'trong <code>~/.bashrc</code> của Bình có <code>export CC=gcc</code> — chuyện rất ' +
        'thường gặp — thì dòng đầu Makefile hoàn toàn <b>không có tác dụng</b>, và cả bản build ' +
        'chạy bằng trình biên dịch native. Xác nhận: <code>echo "$CC"</code>, hoặc ' +
        '<code>make -n</code> để xem lệnh thật sự sẽ chạy.</p>' +
        '<p><b>Chi</b> — chưa cài gói toolchain. Lỗi xảy ra ở tầng <b>shell</b>, trước khi có ' +
        'bất kỳ giai đoạn biên dịch nào; <code>make</code> chỉ chuyển tiếp lại thông báo. Xác ' +
        'nhận: <code>command -v aarch64-linux-gnu-gcc</code> (không in gì tức là chưa có).</p>' +
        '<p><b>Ca của Bình là nguy hiểm nhất</b>, và đáng để dừng lại nghĩ. Chi thất bại ầm ĩ ' +
        'trong ba giây và biết ngay phải làm gì. Bình <b>thành công</b>: exit 0, không một cảnh ' +
        'báo, artefact nằm đúng chỗ, CI có thể xanh. Sai lầm chỉ lộ ra khi file lên tới bo — có ' +
        'thể là vài ngày sau, có thể là ở tay khách hàng. Một lỗi ồn ào luôn rẻ hơn một lỗi im ' +
        'lặng.</p>' +
        '<p>Cách chặn, nên làm cả hai:</p>' +
        '<ul>' +
        '<li>Dùng <code>CC = aarch64-linux-gnu-gcc</code> (hoặc <code>override CC =</code>) khi ' +
        'kiến trúc là <b>bắt buộc</b> chứ không phải tuỳ chọn. <code>?=</code> chỉ hợp lý khi ' +
        'bạn thật sự muốn người dùng ghi đè.</li>' +
        '<li>Thêm một bước kiểm tra sau khi link: nếu <code>readelf -h $@</code> không cho ' +
        '<code>AArch64</code> thì cho <code>make</code> thất bại. Rẻ, và nó biến ca của Bình từ ' +
        'im lặng thành ồn ào.</li>' +
        '</ul>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1, rows: 7,
      q: 'Bo mới của dự án mạnh hơn hẳn những gì Bài 25 giả định: <b>CPU ARM64 bốn nhân 1,8 ' +
         'GHz</b>, <b>512 MB RAM</b>, <b>8 GB eMMC</b>, chạy Debian đầy đủ và có sẵn ' +
         '<code>apt</code>. Trưởng nhóm nói: <i>"Bo này thừa sức tự build. Bỏ cross-compile ' +
         'đi cho đỡ phức tạp."</i> Hãy trả lời: <b>về mặt kỹ thuật</b> thì bây giờ build trên ' +
         'bo có khả thi không, và bạn <b>vẫn</b> khuyên cross-compile hay không? Nêu ít nhất ' +
         '<b>ba</b> lý do độc lập cho khuyến nghị của bạn.',
      blocks: [
        { t: 'cal', kind: 'warn', title: 'Câu này không có đáp án "đúng" duy nhất',
          x: '<p>Phần được chấm là <b>lập luận</b>, không phải lựa chọn. Một câu trả lời "có ' +
             'thể build trên bo" kèm ba lý do vững vẫn đạt đủ tiêu chí. Điều bị trừ là trả lời ' +
             'theo quán tính — nhắc lại "bo yếu lắm" trong khi đề bài vừa nói ngược lại.</p>' }
      ],
      hint: 'Đề bài đã cố tình gỡ bỏ đúng hai rào cản mà phần B đo được. Vậy hãy đi tìm những ' +
            'rào cản KHÁC, loại không biến mất khi bo mạnh lên.',
      crit: [
        'Thừa nhận thẳng thắn rằng <b>hai rào cản của phần B đã biến mất</b>: 8 GB eMMC chứa ' +
          'thoải mái bộ công cụ ~150 MB, và 512 MB RAM vượt xa sàn ~64 MB — nên câu trả lời ' +
          '"không khả thi" là <b>sai</b>',
        'Nêu lý do 1 — <b>tốc độ và quy mô</b>: bo 1,8 GHz build được một chương trình nhỏ, ' +
          'nhưng một kernel hay một rootfs đầy đủ là hàng giờ tới hàng chục giờ, so với vài ' +
          'phút trên PC nhiều nhân',
        'Nêu lý do 2 — <b>tuổi thọ eMMC</b>: build sinh ra hàng nghìn file tạm; số chu kỳ ghi ' +
          'là hữu hạn và bạn đang tiêu nó vào việc build thay vì vào vòng đời sản phẩm',
        'Nêu lý do 3 — <b>tính tái lập và quy trình</b>: build trên bo nghĩa là mỗi bo có thể ' +
          'cho một kết quả khác nhau (phiên bản gói khác, trạng thái khác); CI thì không có bo ' +
          'để build, và bạn không thể phát hành nếu không dựng lại được đúng artefact đã ship',
        'Nêu được ít nhất một trường hợp <b>ngược lại</b> — khi build trên bo là hợp lý: thử ' +
          'nhanh một patch nhỏ, gỡ lỗi tại chỗ, hoặc bo chính là môi trường đích của một công ' +
          'cụ nội bộ'
      ],
      sol:
        '<p><b>Về mặt kỹ thuật: có, bây giờ khả thi.</b> Đây là phần phải nói ra trước, vì đề ' +
        'bài đã cố tình gỡ đúng hai rào cản mà phần B đo được. 8 GB eMMC chứa thoải mái bộ công ' +
        'cụ khoảng 150 MB. 512 MB RAM vượt xa cái sàn ~64 MB mà lưỡng phân tìm ra. Trả lời ' +
        '"không được đâu, bo yếu lắm" ở đây là nhắc lại một kết luận cũ mà không đọc đề — và đó ' +
        'chính là dấu hiệu của việc nhớ ví dụ thay vì nắm nguyên tắc.</p>' +
        '<p><b>Nhưng vẫn nên cross-compile</b>, vì ba lý do <i>khác</i> — không lý do nào biến ' +
        'mất khi bo mạnh lên:</p>' +
        '<ul>' +
        '<li><b>Tốc độ ở quy mô thật.</b> Bo build được một chương trình nhỏ. Nhưng một kernel, ' +
        'một rootfs, hay một lần build lại toàn bộ sau khi đổi một header là chuyện hoàn toàn ' +
        'khác: hàng giờ tới hàng chục giờ trên bo bốn nhân, so với vài phút trên một PC nhiều ' +
        'nhân. Vòng lặp sửa–build–thử là thứ bạn lặp lại hàng chục lần mỗi ngày, nên nhân với ' +
        'số lần thì đây là chi phí lớn nhất.</li>' +
        '<li><b>Tuổi thọ eMMC.</b> Một lần build sinh ra hàng nghìn file tạm và hàng trăm MB ' +
        'ghi. eMMC có số chu kỳ ghi hữu hạn, và bạn đang tiêu nó vào việc build thay vì để dành ' +
        'cho vòng đời sản phẩm. Trên thiết bị bán ra, đây là chi phí bảo hành.</li>' +
        '<li><b>Tính tái lập và quy trình.</b> Build trên bo nghĩa là kết quả phụ thuộc vào ' +
        'trạng thái của <i>chính con bo đó</i>: phiên bản gói, thứ ai đó vừa <code>apt ' +
        'install</code> tuần trước. Hai bo cho hai artefact khác nhau. Tệ hơn: CI không có bo ' +
        'để build, nên bạn không thể tự động hoá, và không thể dựng lại đúng artefact đã ship ' +
        'cho khách khi cần vá lỗi.</li>' +
        '</ul>' +
        '<p><b>Khi nào build trên bo là hợp lý:</b> thử nhanh một patch một dòng mà không muốn ' +
        'chờ cả pipeline; gỡ lỗi tại chỗ khi hiện tượng chỉ xuất hiện trên phần cứng thật; hoặc ' +
        'khi thứ bạn build là một công cụ nội bộ chỉ chạy trên chính con bo đó. Điểm chung: đó ' +
        'đều là việc <i>một lần</i>, không phải quy trình phát hành.</p>' +
        '<p>Cách phát biểu gọn cho trưởng nhóm: <i>"Bo làm được, nhưng cross-compile không phải ' +
        'để lách chuyện bo yếu — nó là để build nhanh, không mòn eMMC, và tái lập được. Ba lý ' +
        'do đó vẫn đúng kể cả khi bo mạnh gấp mười."</i></p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Sản phẩm của bạn phải chạy trên <b>hai</b> bo: một bo ARM64 (<code>aarch64</code>) và ' +
         'một bo cũ hơn 32-bit (<code>armhf</code>). Cùng một mã nguồn, cùng một repo. Trong mã ' +
         'có đoạn dưới đây, và nó đang chạy đúng trên bản aarch64. Hãy nêu <b>chính xác</b> ' +
         'chuyện gì xảy ra khi build cho armhf, và sửa lại đoạn mã.',
      blocks: [
        { t: 'code', where: 'file', code:
          '// log_event.c — ghi một mốc thời gian nano-giây vào bản ghi sự kiện\n' +
          'unsigned long timestamp_ns(void)\n' +
          '{\n' +
          '    struct timespec ts;\n' +
          '    clock_gettime(CLOCK_MONOTONIC, &ts);\n' +
          '    return ts.tv_sec * 1000000000UL + ts.tv_nsec;\n' +
          '}' },
        { t: 'cal', kind: 'info', title: 'Nhắc lại số liệu đã đo',
          x: '<p><code>__SIZEOF_LONG__</code> là <b>8</b> với ' +
             '<code>aarch64-linux-gnu-gcc</code> và <b>4</b> với ' +
             '<code>arm-linux-gnueabihf-gcc</code>.</p>' }
      ],
      hint: 'Trình biên dịch armhf sẽ dịch đoạn này <b>thành công</b>. Đó chính là vấn đề. Hãy ' +
            'tính thử: một giá trị nano-giây sau vài giây thì lớn cỡ nào, và ' +
            '<code>unsigned long</code> 32-bit chứa được tối đa bao nhiêu?',
      crit: [
        'Nói rõ nó <b>dịch thành công</b> trên armhf, không cảnh báo — hỏng lúc <b>chạy</b>, ' +
          'không phải lúc build',
        'Tính được độ lớn: <code>unsigned long</code> 32-bit chứa tối đa ~4,29×10⁹, mà một giá ' +
          'trị nano-giây vượt mốc đó chỉ sau <b>khoảng 4,3 giây</b> — nên giá trị bị ' +
          '<b>tràn và quấn vòng</b> gần như ngay lập tức',
        'Chỉ ra rằng <code>1000000000UL</code> cũng là <code>unsigned long</code>, nên phép ' +
          'nhân <code>tv_sec * 1000000000UL</code> đã tràn <b>ngay trong lúc tính</b>, trước cả ' +
          'khi cộng',
        'Sửa đúng: dùng kiểu có độ rộng cố định — trả về <code>uint64_t</code> và ép hằng số ' +
          'thành 64-bit, ví dụ <code>(uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec</code>, ' +
          'kèm <code>#include &lt;stdint.h&gt;</code>',
        'Nêu được biện pháp phòng ngừa ở mức dự án: build <b>cả hai</b> target trong CI ' +
          '(không chỉ target đang chạy tốt), và thêm <code>_Static_assert</code> cho những giả ' +
          'định về kích thước'
      ],
      sol:
        '<p><b>Nó sẽ dịch thành công.</b> <code>arm-linux-gnueabihf-gcc</code> không báo lỗi, ' +
        'không cảnh báo, và cho ra một file nhị phân trông hoàn toàn bình thường. Đó chính xác ' +
        'là điều làm lỗi này đắt.</p>' +
        '<p>Trên armhf, <code>unsigned long</code> rộng 4 byte, chứa tối đa ' +
        '<b>4 294 967 295</b> ≈ 4,29×10⁹. Một giá trị nano-giây vượt qua mốc đó sau đúng ' +
        '<b>~4,3 giây</b>. Tức là hàm này chạy đúng trong khoảng bốn giây đầu rồi bắt đầu quấn ' +
        'vòng — mốc thời gian nhảy lùi, khoảng cách giữa hai sự kiện thành số âm hoặc thành một ' +
        'số khổng lồ.</p>' +
        '<p>Tệ hơn: phép nhân <code>ts.tv_sec * 1000000000UL</code> đã tràn <b>ngay trong lúc ' +
        'tính</b>, vì hằng số <code>1000000000UL</code> cũng là <code>unsigned long</code>, tức ' +
        'cũng 32-bit trên armhf. Nên ngay cả khi bạn đổi kiểu trả về thành 64-bit mà giữ nguyên ' +
        'hằng số, lỗi vẫn còn — giá trị đã hỏng trước khi được gán đi.</p>' +
        '<p><b>Sửa lại:</b></p>' +
        '<ul>' +
        '<li>Thêm <code>#include &lt;stdint.h&gt;</code>.</li>' +
        '<li>Đổi kiểu trả về thành <code>uint64_t</code> — một kiểu <b>có độ rộng cố định</b>, ' +
        'giống nhau trên mọi target.</li>' +
        '<li>Ép rõ ràng trước khi nhân: ' +
        '<code>return (uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec;</code></li>' +
        '<li>Nếu muốn chắc chắn, thêm ' +
        '<code>_Static_assert(sizeof(uint64_t) == 8, "need 64-bit timestamps");</code> để giả ' +
        'định tự nói ra lúc build.</li>' +
        '</ul>' +
        '<p><b>Ở mức dự án</b>, bài học lớn hơn: khi hỗ trợ nhiều target, phải build ' +
        '<b>tất cả</b> chúng trong CI, không chỉ cái đang chạy tốt. Nếu chỉ build aarch64 thì ' +
        'lỗi armhf này sẽ ngủ yên trong repo cho tới ngày ai đó lấy bo cũ ra thử — và lúc đó ' +
        'triệu chứng ("mốc thời gian nhảy lung tung") sẽ chẳng gợi ý gì về ' +
        '<code>sizeof(long)</code> cả. Đây là lý do <code>&lt;stdint.h&gt;</code> gần như bắt ' +
        'buộc trong mã nhúng đa nền tảng.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', truc: 2, rows: 6,
      q: 'Bạn cần gỡ lỗi một chương trình đang chạy trên bo ARM64, ngồi trước PC x86-64. Cách ' +
         'làm chuẩn là chạy <code>gdb</code> trên PC và nối tới <code>gdbserver</code> trên bo. ' +
         'Trong bốn gói dưới đây, hãy <b>chọn</b> gói bạn cần cài lên PC, rồi <b>điền và biện ' +
         'minh</b> bộ ba <code>build</code> / <code>host</code> / <code>target</code> cho cả ' +
         '<code>gdb</code> lẫn <code>gdbserver</code>.',
      blocks: [
        { t: 'table',
          head: ['Gói', 'Mô tả trong kho'],
          rows: [
            ['<code>gdb</code>', 'GNU Debugger'],
            ['<code>gdb-multiarch</code>', 'GNU Debugger (support for multiple architectures)'],
            ['<code>gdbserver</code>', 'GNU Debugger (remote server)'],
            ['<code>qemu-user</code>', 'QEMU user-mode emulation binaries']
          ] },
        { t: 'cal', kind: 'tip', title: 'Câu hỏi dẫn đường',
          x: '<p><code>gdb</code> có "sinh ra" cái gì chạy trên máy khác không? Nếu không, vì ' +
             'sao nó vẫn cần một <code>target</code>?</p>' }
      ],
      hint: 'Bộ ba này mô tả CÔNG CỤ. Hãy điền riêng cho từng công cụ, và chú ý rằng gdb và ' +
            'gdbserver chạy ở hai chỗ khác nhau.',
      crit: [
        'Chọn đúng <code>gdb-multiarch</code> cho PC, và nói được lý do: <code>gdb</code> ' +
          'thường chỉ hiểu kiến trúc của chính nó, còn bản multiarch mang theo mô tả thanh ghi ' +
          'và bộ giải mã lệnh của nhiều kiến trúc',
        'Điền đúng cho <code>gdb-multiarch</code>: <b>host = x86-64</b> (chạy trên PC), ' +
          '<b>target = aarch64</b> (kiến trúc của chương trình nó gỡ lỗi), build = nơi gói được ' +
          'dựng ra',
        'Điền đúng cho <code>gdbserver</code>: <b>host = aarch64</b> (nó chạy trên bo) — và ' +
          'phải được <b>cross-compile</b> hoặc lấy từ kho aarch64, không phải cài bản x86 của ' +
          'PC',
        'Biện minh được vì sao <code>gdb</code> <b>có</b> target dù nó không sinh mã: target ' +
          'của một công cụ là <i>kiến trúc mà nó phải hiểu</i> — gdb phải giải mã lệnh ARM64, ' +
          'biết tên và độ rộng thanh ghi ARM64, hiểu ABI gọi hàm ARM64',
        'Loại <code>qemu-user</code> đúng lý do: nó để <b>chạy</b> nhị phân khác kiến trúc trên ' +
          'PC, không liên quan tới việc gỡ lỗi một tiến trình đang chạy <b>trên bo thật</b>'
      ],
      sol:
        '<p><b>Chọn <code>gdb-multiarch</code></b> cho PC. Gói <code>gdb</code> thường chỉ mang ' +
        'theo hiểu biết về kiến trúc của chính nó; nối nó tới một <code>gdbserver</code> ARM64 ' +
        'thì nó không giải mã nổi lệnh và không biết bo có những thanh ghi nào. Bản multiarch ' +
        'mang theo mô tả thanh ghi, bộ giải mã lệnh và quy ước ABI của nhiều kiến trúc, trong ' +
        'đó có aarch64.</p>' +
        '<p>Trên bo bạn cần <code>gdbserver</code> — nhưng là bản <b>aarch64</b>, lấy từ kho của ' +
        'bo hoặc tự cross-compile. Không phải bản trong kho x86-64 của PC.</p>' +
        '<p><b>Bộ ba cho <code>gdb-multiarch</code>:</b></p>' +
        '<ul>' +
        '<li><b>build</b> = <code>x86_64-linux-gnu</code> — nơi người đóng gói dựng ra nó.</li>' +
        '<li><b>host</b> = <code>x86_64-linux-gnu</code> — nó chạy trên PC của bạn.</li>' +
        '<li><b>target</b> = <code>aarch64-linux-gnu</code> — kiến trúc của chương trình mà nó ' +
        'gỡ lỗi.</li>' +
        '</ul>' +
        '<p><b>Bộ ba cho <code>gdbserver</code> trên bo:</b></p>' +
        '<ul>' +
        '<li><b>build</b> = <code>x86_64-linux-gnu</code> nếu bạn cross-compile nó từ PC.</li>' +
        '<li><b>host</b> = <code>aarch64-linux-gnu</code> — nó chạy <b>trên bo</b>.</li>' +
        '<li><b>target</b> = <code>aarch64-linux-gnu</code> — nó theo dõi một tiến trình ARM64, ' +
        'trùng với host vì nó chỉ làm việc tại chỗ.</li>' +
        '</ul>' +
        '<p><b>Phần đáng suy nghĩ nhất:</b> vì sao <code>gdb</code> có <code>target</code> dù nó ' +
        'chẳng sinh ra file thực thi nào? Vì <code>target</code> không có nghĩa hẹp là "nơi mã ' +
        'sinh ra sẽ chạy" — nghĩa rộng hơn là <b>kiến trúc mà công cụ này phải hiểu</b>. Trình ' +
        'biên dịch phải hiểu đủ để <i>sinh</i> lệnh; gdb phải hiểu đủ để <i>đọc</i> lệnh, gọi ' +
        'tên thanh ghi cho đúng, và biết tham số hàm nằm ở đâu theo ABI ARM64. Cả hai đều là ' +
        'công cụ "nói được tiếng của một máy khác", nên cả hai đều có target. ' +
        '<code>objdump</code>, <code>readelf</code>, <code>as</code>, <code>ld</code> cũng vậy ' +
        '— và đó là lý do chúng cũng có bản tiền tố <code>aarch64-linux-gnu-</code>.</p>' +
        '<p><code>qemu-user</code> bị loại vì nó giải một bài toán khác hẳn: <b>chạy</b> một ' +
        'nhị phân khác kiến trúc <i>trên PC</i>. Ở đây chương trình đang chạy trên <b>bo thật</b>, ' +
        'nên không có gì để mô phỏng. (Nó vẫn hữu ích trong một kịch bản khác: gỡ lỗi khi chưa ' +
        'có bo, bằng <code>qemu-aarch64 -g 1234</code> rồi nối ' +
        '<code>gdb-multiarch</code> vào — nhưng đó không phải tình huống của câu này.)</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     D · ÔN XEN KẼ — 3 câu về những bài mà Bài 25 đứng lên trên
     Bài 15 (bốn giai đoạn), Bài 18 (ELF header), Bài 17 (tĩnh/động).
     Cả ba đều là nền của một câu nào đó ở phần A/B: a8 xếp lỗi theo giai đoạn,
     a6/b1 đọc e_machine, b6 phân biệt tĩnh với động.
     ══════════════════════════════════════════════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại Bài 15',
      q: 'Bài 15 chia việc biên dịch thành bốn giai đoạn. Lệnh nào dừng lại <b>ngay sau</b> ' +
         'giai đoạn hợp dịch (assemble), tức cho ra file <code>.o</code> nhưng chưa liên kết?',
      opts: [
        '<code>gcc -E hello.c</code>',
        '<code>gcc -S hello.c</code>',
        '<code>gcc -c hello.c</code>',
        '<code>gcc hello.c -o hello</code>'
      ],
      a: 2,
      why: '<p>Bốn giai đoạn và cờ để dừng ở từng chỗ:</p>' +
           '<ol>' +
           '<li><b>Tiền xử lý</b> — <code>-E</code>, cho ra mã C đã bung macro và ' +
           '<code>#include</code>.</li>' +
           '<li><b>Biên dịch</b> — <code>-S</code>, cho ra assembly <code>.s</code>.</li>' +
           '<li><b>Hợp dịch</b> — <code>-c</code>, cho ra object <code>.o</code>.</li>' +
           '<li><b>Liên kết</b> — không cờ nào, cho ra file thực thi.</li>' +
           '</ol>' +
           '<p>Vì sao Bài 25 cần bạn nhớ chuỗi này: mỗi giai đoạn bắt được một <i>loại</i> lỗi ' +
           'kiến trúc khác nhau, và câu <b>a8</b> yêu cầu bạn xếp năm thông báo lỗi theo đúng ' +
           'thứ tự ấy. <code>_Static_assert</code> thất bại ở giai đoạn 2; ' +
           '<code>Relocations in generic ELF</code> ở giai đoạn 4; <code>Exec format ' +
           'error</code> thì còn muộn hơn — nó không thuộc giai đoạn nào cả, mà xảy ra lúc ' +
           '<b>nạp</b>, sau khi biên dịch đã xong từ lâu.</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại Bài 18',
      q: 'Bài 18 mổ xẻ file ELF. Trường <code>e_machine</code> mà cả bộ bài tập này xoay quanh ' +
         'nằm ở đâu trong file, và điều đó có hệ quả gì?',
      opts: [
        'Trong section <code>.text</code>, cùng chỗ với mã lệnh — nên phải nạp mã mới đọc được',
        'Trong <b>ELF header</b> ở đầu file, tại một offset cố định — nên đọc được ngay từ vài ' +
          'chục byte đầu, trước khi nạp bất cứ thứ gì',
        'Trong bảng section header ở <b>cuối</b> file — nên phải đọc hết file mới biết',
        'Không nằm trong file; nhân suy ra kiến trúc từ phần mở rộng của tên file'
      ],
      a: 1,
      why: '<p>ELF header là 64 byte đầu tiên của file, và <code>e_machine</code> là một số ' +
           'nguyên 2 byte tại offset <code>0x12</code>. Bài 18 gọi đây là "tấm bìa" của file: ' +
           'mọi thứ cần để quyết định <i>có nạp được hay không</i> đều nằm ở đó, trước cả bảng ' +
           'program header.</p>' +
           '<p>Ba hệ quả bạn đã gặp trong chính bộ bài tập này:</p>' +
           '<ul>' +
           '<li><code>execve()</code> quyết định được <b>trước khi nạp</b> — nên bạn nhận ' +
           '<code>ENOEXEC</code> sạch sẽ chứ không phải một cú sập giữa chừng.</li>' +
           '<li><code>binfmt_misc</code> hoạt động được: luật của nó là ' +
           '<code>magic</code> + <code>mask</code> so khớp đúng vùng byte đầu file — bạn đã ' +
           'thấy <code>00b7</code> trong đó ở câu <b>b1</b>.</li>' +
           '<li>Bạn <b>vá</b> được trường đó bằng <code>dd</code> mà không cần biên dịch lại — ' +
           'chính là mẹo ở câu <b>e1</b>.</li>' +
           '</ul>' +
           '<p>Phương án 4 nghe buồn cười nhưng đó đúng là cách Windows làm với ' +
           '<code>.exe</code>. Linux không nhìn tên file: một file thực thi trên Linux có thể ' +
           'tên là gì cũng được.</p>' },

    { id: 'd3', k: 'tf', tag: 'Nhắc lại Bài 17',
      q: '<b>Phát biểu:</b> "Liên kết tĩnh và liên kết động chỉ khác nhau ở kích thước file. ' +
         'Chọn cái nào cũng được, miễn chương trình chạy."',
      a: 1,
      rw: 'Viết lại cho đúng trong 2–3 câu: nêu <b>một</b> khác biệt không phải kích thước, và ' +
          'nói vì sao nó đặc biệt quan trọng với hệ nhúng.',
      why: '<p><b>Sai.</b> Kích thước chỉ là hệ quả dễ thấy nhất. Bài 17 nêu những khác biệt ' +
           'thực sự quyết định:</p>' +
           '<ul>' +
           '<li><b>Phụ thuộc lúc chạy.</b> Bản động cần đúng bộ nạp ' +
           '(<code>/lib64/ld-linux-…</code>) và đúng phiên bản <code>libc.so</code> ' +
           '<i>có mặt trên bo</i>. Thiếu hoặc lệch phiên bản thì chương trình không khởi động ' +
           'nổi — và thông báo lỗi thường chẳng gợi ý gì.</li>' +
           '<li><b>Vá lỗi bảo mật.</b> Một lỗ hổng trong libc: bản động chỉ cần thay ' +
           '<code>libc.so</code> là mọi chương trình được vá; bản tĩnh phải build lại và nạp ' +
           'lại <i>từng</i> chương trình.</li>' +
           '<li><b>Chia sẻ bộ nhớ.</b> Nhiều tiến trình dùng chung một bản libc trong RAM khi ' +
           'liên kết động; liên kết tĩnh thì mỗi tiến trình mang bản sao riêng.</li>' +
           '<li><b>Thời gian khởi động.</b> Bản động phải chạy bộ nạp và nối ký hiệu trước khi ' +
           'vào <code>main</code>.</li>' +
           '</ul>' +
           '<p>Với hệ nhúng, cái đầu tiên thường là quyết định: liên kết tĩnh loại bỏ hẳn rủi ' +
           'ro "libc trên bo không khớp với libc lúc build" — một rủi ro rất thật khi bạn ' +
           'cross-compile, vì lúc build bạn dùng libc trong sysroot của PC chứ không phải libc ' +
           'trên bo. Đổi lại là file to hơn và mất khả năng vá tập trung.</p>' +
           '<p>Đây cũng chính là lý do <code>hello-arm64</code> ở câu <b>b6</b> được build ' +
           '<code>-static</code>: để nó chạy được mà không cần mang theo cả một sysroot.</p>',
      crit: [
        'Bác bỏ được ý "chỉ khác kích thước"',
        'Nêu đúng <b>một</b> khác biệt thực chất: phụ thuộc <code>libc</code>/bộ nạp lúc chạy, ' +
          'hoặc cách vá lỗi bảo mật, hoặc chia sẻ bộ nhớ giữa các tiến trình, hoặc thời gian ' +
          'khởi động',
        'Gắn được vào bối cảnh nhúng: trên bo có thể <b>không có</b> đúng phiên bản ' +
          '<code>libc.so</code>, nên liên kết tĩnh loại bỏ rủi ro đó — đổi lại file to hơn và ' +
          'phải build lại mọi thứ khi vá libc'
      ],
      sol:
        '<p>Sai. Khác biệt lớn nhất không phải kích thước mà là <b>phụ thuộc lúc chạy</b>: một ' +
        'file liên kết động cần đúng bộ nạp và đúng phiên bản <code>libc.so</code> có sẵn trên ' +
        'máy đích, còn file liên kết tĩnh mang theo mọi thứ nó cần.</p>' +
        '<p>Với hệ nhúng, điều này thường quyết định luôn lựa chọn: khi cross-compile, bạn build ' +
        'với libc trong sysroot của PC, nhưng chương trình sẽ chạy với libc <i>trên bo</i>. Hai ' +
        'thứ đó lệch phiên bản là chuyện thường, và hậu quả là chương trình không khởi động nổi. ' +
        'Liên kết tĩnh xoá hẳn rủi ro ấy.</p>' +
        '<p>Cái giá phải trả: file to hơn nhiều (689 KB so với 16 KB trong ví dụ ở câu b6), mỗi ' +
        'tiến trình giữ bản sao libc riêng trong RAM, và khi libc có lỗ hổng bảo mật thì phải ' +
        'build lại rồi nạp lại từng chương trình thay vì chỉ thay một file <code>.so</code>.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     E · THỰC HÀNH — 6 câu, mọi lệnh đã chạy thật trên máy người học
     ~/embedded/bt25 đã có sẵn: hello.c spin.c guard.c main.c sum.c gen.c
     và các bản build hello-x86 hello-arm64 hello-alien spin-x86 spin-arm64
     guard-x86 main-x86.o sum-arm64.o.  Nếu thư mục không còn, e4 dựng lại
     được phần cần thiết chỉ từ hello.c.

     ⚠ e1 CỐ Ý cho ra kết quả TRÁI với Bài 25 (thoát 0, không phải 126).
       Đây là hành vi thật của máy này vì đã cài qemu-user-binfmt — xem
       docs/course-notes.md và docs/environment.md.  Không "sửa" cho khớp
       bài học; chính chỗ lệch đó là nội dung dạy của câu này.
     ══════════════════════════════════════════════════════════════════════ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 7,
      q: '<b>Viết dự đoán trước, rồi mới chạy.</b> Bạn có <code>hello-arm64</code> — một file ' +
         'ELF AArch64, liên kết tĩnh — nằm trên máy WSL <b>x86-64</b> của bạn. Hãy dự đoán ' +
         '<b>ba</b> thứ, rồi chạy ba lệnh dưới và ghi lại chỗ nào bạn đoán sai:' +
         '<ol>' +
         '<li><code>./hello-arm64</code> in ra gì, và mã thoát là bao nhiêu?</li>' +
         '<li>Sau khi vá 2 byte tại offset <code>0x12</code>, kết quả đổi thế nào?</li>' +
         '<li>Vì sao hai lần chạy lại khác nhau, khi <b>mã lệnh</b> trong file không đổi một ' +
         'byte nào?</li>' +
         '</ol>',
      blocks: [
        { t: 'cal', kind: 'warn', title: 'Đừng đọc phần lời giải trước khi chạy',
          x: '<p>Câu này chỉ có giá trị nếu bạn viết dự đoán <b>trước</b>. Nhiều khả năng bạn ' +
             'sẽ đoán sai câu 1 — và đó chính là chỗ đáng học nhất trong cả bộ bài tập này. ' +
             'Đoán sai ở đây không phải là bạn học kém.</p>' },
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt25\n' +
          '\n' +
          '# 1. thong tin file, roi chay no\n' +
          'file hello-arm64\n' +
          './hello-arm64 ; echo "exit=$?"\n' +
          '\n' +
          '# 2. doi e_machine thanh 250 (0x00fa), mot gia tri khong ai nhan\n' +
          '#    2 byte little-endian tai offset 0x12 = byte thu 19-20 cua file\n' +
          'cp hello-arm64 hello-patched\n' +
          "printf '\\xfa\\x00' | dd of=hello-patched bs=1 seek=18 count=2 conv=notrunc\n" +
          'readelf -h hello-patched | grep Machine\n' +
          './hello-patched ; echo "exit=$?"\n' +
          '\n' +
          '# 3. doi chieu: e_machine cua ca ba file\n' +
          'for f in hello-x86 hello-arm64 hello-patched; do\n' +
          '  printf "%-15s " "$f"; od -An -tx1 -j18 -N2 "$f"\n' +
          'done' }
      ],
      hint: 'Nếu lệnh 1 làm bạn ngạc nhiên, đừng vội cho là mình nhớ sai bài. Hãy đọc ' +
            '<code>cat /proc/sys/fs/binfmt_misc/qemu-aarch64</code> rồi nghĩ lại.',
      crit: [
        'Có <b>viết dự đoán ra trước</b> khi chạy — nếu bỏ qua bước này thì câu hỏi mất hết ' +
          'tác dụng, hãy tự chấm 0 ý cho tiêu chí này',
        'Ghi đúng kết quả lệnh 1: in <code>hello from a 64-bit long</code> và ' +
          '<b><code>exit=0</code></b> — <i>không</i> phải <code>Exec format error</code>',
        'Ghi đúng kết quả lệnh 2: <code>Machine: Netronome Flow Processor</code>, rồi ' +
          '<code>cannot execute binary file: Exec format error</code>, <b><code>exit=126</code></b>',
        'Giải thích đúng chênh lệch: máy này có <code>qemu-user-binfmt</code>, nên nhân khớp ' +
          'ELF AArch64 với một handler trong <code>binfmt_misc</code> và giao cho ' +
          '<code>qemu-aarch64</code>; đổi <code>e_machine</code> thành 250 thì <b>không handler ' +
          'nào khớp</b>, <code>execve()</code> trả <code>ENOEXEC</code>',
        'Rút ra được kết luận đúng: "chạy được hay không" là thuộc tính của <b>hệ thống nạp</b>, ' +
          'không phải của file — <b>quyền thực thi không đổi</b>, <b>mã lệnh không đổi</b>, chỉ ' +
          '2 byte trong tiêu đề đổi'
      ],
      sol:
        '<p>Đây là kết quả thật trên máy bạn, chạy ngày viết bài tập này:</p>' +
        '<p><b>Lệnh 1</b> — <code>hello-arm64</code> là ELF AArch64 tĩnh, và nó <b>chạy được</b>:</p>' +
        '<p><code>hello from a 64-bit long</code> → <code>exit=0</code></p>' +
        '<p>Nếu bạn đoán <code>Exec format error</code> thì bạn <b>không sai về nguyên lý</b> — ' +
        'đó đúng là điều xảy ra trên một máy x86-64 bình thường, và đó cũng là điều Bài 25 mô ' +
        'tả. Cái đã thay đổi là <i>máy của bạn</i>: từ Chặng 05, gói ' +
        '<code>qemu-user-binfmt</code> đã được cài để làm việc với QEMU, và nó đăng ký 28 ' +
        'handler vào <code>/proc/sys/fs/binfmt_misc/</code>.</p>' +
        '<p>Cơ chế: khi <code>execve()</code> thấy một file không phải định dạng nhị phân bản ' +
        'địa, nó <b>không</b> bỏ cuộc ngay. Nó dò danh sách <code>binfmt_misc</code>, so ' +
        '<code>magic</code>/<code>mask</code> với các byte đầu file. Handler ' +
        '<code>qemu-aarch64</code> khớp — trong <code>magic</code> của nó có đúng hai byte ' +
        '<code>00b7</code> = 183 = AArch64 — nên nhân nạp ' +
        '<code>interpreter /usr/bin/qemu-aarch64</code> và giao file cho nó. CPU của bạn không ' +
        'thực thi một lệnh ARM nào; qemu diễn giải từng lệnh.</p>' +
        '<p><b>Lệnh 2</b> — sau khi vá:</p>' +
        '<p><code>Machine: Netronome Flow Processor</code> → ' +
        '<code>cannot execute binary file: Exec format error</code> → <code>exit=126</code></p>' +
        '<p>250 không phải kiến trúc mà handler nào đăng ký, nên lần này không gì khớp, ' +
        '<code>execve()</code> trả <code>ENOEXEC</code>, và bash dịch nó thành câu thông báo ' +
        'kinh điển cùng mã thoát 126. Đây mới là hành vi mà Bài 25 mô tả — bạn vừa phải ' +
        '<b>tự tay tạo lại</b> nó.</p>' +
        '<p><b>Lệnh 3</b> — ba giá trị <code>e_machine</code>, little-endian:</p>' +
        '<p><code>hello-x86 → 3e 00</code> (0x003e = 62, x86-64) · ' +
        '<code>hello-arm64 → b7 00</code> (0x00b7 = 183, AArch64) · ' +
        '<code>hello-patched → fa 00</code> (0x00fa = 250)</p>' +
        '<p><b>Điều đáng nhớ nhất.</b> Giữa hai lần chạy, bạn không đổi quyền, không đổi chủ ' +
        'sở hữu, không đổi một byte mã lệnh nào — mã máy ARM trong file vẫn y nguyên. Bạn chỉ ' +
        'đổi <b>hai byte trong tấm bìa</b>. Vậy mà một lần chạy được và một lần không. Điều đó ' +
        'chứng minh dứt khoát rằng "chạy được" không phải là thuộc tính của file: nó là kết quả ' +
        'của một phép so khớp mà <i>hệ thống nạp</i> thực hiện. Đổi hệ thống (gỡ qemu-user, hoặc ' +
        'đem file sang gateway ở câu C1) thì cùng một file cho kết quả khác.</p>' +
        '<p>Dọn dẹp: <code>rm hello-patched</code>.</p>' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: 'Câu E1 cho thấy nhị phân ARM64 <b>chạy được</b> trên máy này. Câu hỏi tiếp theo là ' +
         'nó chạy với giá nào. <code>spin.c</code> đếm một vòng lặp 200 triệu lần. Hãy dự đoán ' +
         '<b>tỉ số</b> thời gian giữa bản ARM64 và bản x86 (gấp bao nhiêu lần?), dự đoán xem ' +
         '<code>qemu-aarch64 ./spin-arm64</code> có khác <code>./spin-arm64</code> không, rồi ' +
         'chạy và so.',
      blocks: [
        { t: 'code', where: 'file', code:
          '/* spin.c -- enough work that emulation overhead is visible */\n' +
          '#include <stdio.h>\n' +
          'int main(void)\n' +
          '{\n' +
          '    volatile unsigned long s = 0;\n' +
          '    for (unsigned long i = 0; i < 200000000UL; i++) s += i;\n' +
          '    printf("sum done: %lu\\n", s);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt25\n' +
          '\n' +
          '# ham nong ca hai truoc khi do, neu khong lan chay dau se noi doi\n' +
          './spin-x86 >/dev/null ; ./spin-arm64 >/dev/null\n' +
          '\n' +
          '# 5 cap xen ke, doc ca 5 truoc khi ket luan\n' +
          'for i in 1 2 3 4 5; do\n' +
          '  a=$( { /usr/bin/time -f %e ./spin-x86    >/dev/null ; } 2>&1 )\n' +
          '  b=$( { /usr/bin/time -f %e ./spin-arm64  >/dev/null ; } 2>&1 )\n' +
          '  echo "pair $i: x86=$a  arm64-qemu=$b"\n' +
          'done\n' +
          '\n' +
          '# goi qemu mot cach tuong minh: co khac gi khong?\n' +
          'time qemu-aarch64 ./spin-arm64' }
      ],
      hint: 'Vì sao phải hâm nóng và vì sao phải đo 5 lần thay vì 1? Nếu chưa rõ, hãy thử chạy ' +
            'một lần duy nhất ngay sau khi mở terminal rồi so với lần thứ năm.',
      crit: [
        'Có viết dự đoán tỉ số ra trước khi chạy',
        'Ghi lại số thật của <b>cả 5 cặp</b>, không chỉ một cặp — trên máy này: x86 ' +
          '<b>0,08–0,09 s</b>, arm64 dưới qemu <b>0,49–0,54 s</b>, tức khoảng <b>6×</b>',
        'Nhận ra <code>qemu-aarch64 ./spin-arm64</code> cho <b>kết quả và thời gian như nhau</b> ' +
          '— vì lệnh <code>./spin-arm64</code> vốn dĩ cũng chạy qua đúng chương trình đó, chỉ ' +
          'khác là nhân gọi hộ',
        'Giải thích được vì sao phải hâm nóng và đo nhiều lần: lần chạy đầu tính cả chi phí ' +
          'đọc file từ đĩa vào page cache; đo một lần là đo nhiễu',
        'Phân biệt rõ con số này với con số ở câu <b>b3</b>: ~6× là giá của <b>mô phỏng lúc ' +
          'chạy</b>, còn ~30 % là giá của <b>cross-compile lúc build</b> — hai đại lượng khác ' +
          'nhau, đừng lẫn'
      ],
      sol:
        '<p>Kết quả thật trên máy này, 5 cặp xen kẽ sau khi đã hâm nóng:</p>' +
        '<p><code>pair 1: x86=0.08  arm64-qemu=0.52</code><br>' +
        '<code>pair 2: x86=0.08  arm64-qemu=0.54</code><br>' +
        '<code>pair 3: x86=0.09  arm64-qemu=0.51</code><br>' +
        '<code>pair 4: x86=0.09  arm64-qemu=0.50</code><br>' +
        '<code>pair 5: x86=0.08  arm64-qemu=0.49</code></p>' +
        '<p>Tỉ số khoảng <b>6×</b>. Cả hai in ra cùng một kết quả ' +
        '<code>sum done: 19999999900000000</code> — mô phỏng <i>đúng</i>, chỉ chậm.</p>' +
        '<p><code>qemu-aarch64 ./spin-arm64</code> cho thời gian gần như y hệt, và đó là câu trả ' +
        'lời quan trọng: <code>./spin-arm64</code> <b>vốn đã</b> chạy bằng chính chương trình ' +
        'đó. Khác biệt duy nhất là ai gõ tên nó — bạn, hay nhân. Dòng ' +
        '<code>interpreter /usr/bin/qemu-aarch64</code> trong ' +
        '<code>/proc/sys/fs/binfmt_misc/qemu-aarch64</code> nói đúng điều đó.</p>' +
        '<p><b>Vì sao phải hâm nóng và đo 5 lần.</b> Lần chạy đầu tiên phải đọc file từ đĩa vào ' +
        'page cache; với <code>spin-arm64</code> (705 KB) chi phí ấy đủ lớn để bóp méo kết quả. ' +
        'Chính người viết bộ bài tập này đã suýt ghi nhầm một con số vì đo đúng một lần: lần đầu ' +
        'cho <code>x86=0.164</code>, gấp đôi giá trị khi đã nóng. Một phép đo đơn lẻ không phải ' +
        'là dữ liệu — nó là một mẫu.</p>' +
        '<p><b>Đừng lẫn con số này với 30 % ở câu b3.</b> Chúng đo hai thứ khác nhau:</p>' +
        '<ul>' +
        '<li><b>~6×</b> — mô phỏng <i>lúc chạy</i>: qemu phải diễn giải từng lệnh ARM, mỗi lần ' +
        'chương trình chạy, mãi mãi.</li>' +
        '<li><b>~30 %</b> — cross-compile <i>lúc build</i>: trả một lần duy nhất, lúc sinh ra ' +
        'file, và trên bo thật thì bằng 0 vì bo chạy mã bản địa.</li>' +
        '</ul>' +
        '<p>Đây cũng là lý do mô phỏng không thay thế được bo thật khi cần đo hiệu năng — nhưng ' +
        'vẫn thừa sức để kiểm tra chương trình chạy <i>đúng</i> hay không.</p>' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Bạn nhận một thư mục lẫn lộn: mã nguồn, nhị phân x86, nhị phân ARM64, file ' +
         '<code>.o</code>, script. Hãy <b>tự viết</b> lệnh cho ba việc dưới đây (không được ' +
         'chạy thử từng file bằng tay, và không được dựa vào tên file):' +
         '<ol>' +
         '<li>In kiến trúc của <b>mọi</b> file trong thư mục, mỗi file một dòng.</li>' +
         '<li>Chỉ liệt kê <b>tên</b> những file thuộc kiến trúc <code>aarch64</code>.</li>' +
         '<li>Với một file cụ thể, in <b>đúng dòng</b> <code>Machine</code> trong ELF header.</li>' +
         '</ol>',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt25\n' +
          'ls' },
        { t: 'cal', kind: 'tip', title: 'Ràng buộc',
          x: '<p>Việc 2 phải cho ra <b>tên file trần</b>, sẵn sàng đưa vào một lệnh khác (ví ' +
             'dụ <code>| xargs rm</code>). Nếu output của bạn còn dính dấu hai chấm và phần mô ' +
             'tả thì chưa đạt.</p>' }
      ],
      hint: 'Hai công cụ là đủ cho cả ba việc: một cái đọc "số ma thuật" của mọi loại file, ' +
            'một cái chỉ đọc ELF. Việc 2 chỉ là việc 1 cộng thêm hai bộ lọc văn bản.',
      crit: [
        'Việc 1 dùng <code>file *</code> (hoặc <code>file -- *</code>) — một lệnh, không vòng lặp',
        'Việc 2 lọc rồi cắt, ví dụ <code>file * | grep aarch64 | cut -d: -f1</code>, và cho ra ' +
          'đúng ba tên: <code>hello-arm64</code>, <code>spin-arm64</code>, ' +
          '<code>sum-arm64.o</code> — <b>tên trần</b>, không kèm mô tả',
        'Việc 3 dùng <code>readelf -h &lt;file&gt; | grep Machine</code> (chấp nhận ' +
          '<code>awk</code> hoặc <code>readelf -h … | sed -n</code>)',
        'Nhận ra <code>file</code> và <code>readelf</code> <b>không thay thế nhau</b>: ' +
          '<code>file</code> nhận diện mọi loại file kể cả không phải ELF, còn ' +
          '<code>readelf</code> chỉ đọc ELF nhưng cho đúng tên trường của chuẩn',
        'Nhận ra vì sao đề cấm dựa vào tên file: <code>hello-alien</code> mang tên "arm-ish" ' +
          'nhưng <code>e_machine</code> của nó là 250 — tên file trên Linux <b>không mang thông ' +
          'tin gì</b> về nội dung'
      ],
      sol:
        '<p><b>Việc 1</b> — <code>file *</code>. Output thật (đã lược phần <code>BuildID</code>):</p>' +
        '<p><code>guard-x86: ELF 64-bit LSB pie executable, x86-64 …</code><br>' +
        '<code>hello-alien: ELF 64-bit LSB executable, Netronome Flow Processor …</code><br>' +
        '<code>hello-arm64: ELF 64-bit LSB executable, ARM aarch64, statically linked</code><br>' +
        '<code>hello-x86: ELF 64-bit LSB pie executable, x86-64 …</code><br>' +
        '<code>main-x86.o: ELF 64-bit LSB relocatable, x86-64 …</code><br>' +
        '<code>spin-arm64: ELF 64-bit LSB executable, ARM aarch64, statically linked</code><br>' +
        '<code>sum-arm64.o: ELF 64-bit LSB relocatable, ARM aarch64 …</code><br>' +
        '<code>hello.c: C source, ASCII text</code></p>' +
        '<p><b>Việc 2</b> — <code>file * | grep aarch64 | cut -d: -f1</code> →</p>' +
        '<p><code>hello-arm64</code> · <code>spin-arm64</code> · <code>sum-arm64.o</code></p>' +
        '<p>Ba tên trần, đúng như yêu cầu. Nếu bạn dùng <code>grep -l</code> hay quên ' +
        '<code>cut</code> thì output còn dính mô tả và không đưa vào lệnh khác được.</p>' +
        '<p><b>Việc 3</b> — <code>readelf -h hello-arm64 | grep Machine</code> →</p>' +
        '<p><code>  Machine:                           AArch64</code></p>' +
        '<p><b>Vì sao hai công cụ, không phải một.</b> <code>file</code> đoán loại của <i>bất kỳ</i> ' +
        'file nào bằng cách dò một cơ sở dữ liệu "số ma thuật" — nó nói được cả ' +
        '<code>hello.c</code> là mã nguồn C. <code>readelf</code> chỉ đọc ELF, nhưng nó đọc ' +
        '<i>đúng theo chuẩn</i>: bạn thấy tên trường (<code>Machine</code>, <code>Class</code>, ' +
        '<code>Type</code>) chứ không phải một câu mô tả do <code>file</code> tự soạn. Khi cần ' +
        'chắc chắn, hãy tin <code>readelf</code>.</p>' +
        '<p><b>Vì sao không được nhìn tên file.</b> <code>hello-alien</code> nghe như một biến ' +
        'thể ARM, nhưng <code>e_machine</code> của nó là 250. Ngược lại, một nhị phân ARM64 ' +
        'hoàn toàn có thể tên là <code>setup.txt</code>. Linux không dùng phần mở rộng để quyết ' +
        'định gì cả — chỉ nội dung mới nói lên sự thật, và đó là lý do mọi kịch bản CI nên kiểm ' +
        'tra bằng <code>readelf</code> chứ không bằng quy ước đặt tên.</p>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Hãy cross-compile <code>hello.c</code> thành một nhị phân AArch64 <b>liên kết tĩnh</b>, ' +
         'rồi <b>chứng minh nó đúng kiến trúc mà không được chạy nó</b>. Cấm dùng ' +
         '<code>./</code> và cấm dùng <code>qemu-aarch64</code> — sau câu E1 bạn đã biết vì sao ' +
         '"chạy thử" không phải là bằng chứng. Cuối cùng, so kích thước với bản native và giải ' +
         'thích chênh lệch.',
      blocks: [
        { t: 'code', where: 'file', code:
          '/* hello.c -- the smallest program that still proves a point */\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("hello from a %zu-bit long\\n", sizeof(long) * 8);\n' +
          '    return 0;\n' +
          '}' },
        { t: 'cmdx', title: 'Các mảnh bạn cần',
          rows: [
            ['<code>aarch64-linux-gnu-gcc</code>', 'trình biên dịch chéo — host x86-64, target aarch64'],
            ['<code>-static</code>', 'nhúng luôn libc, để file không cần sysroot của bo'],
            ['<code>-dumpmachine</code>', 'hỏi chính trình biên dịch: target của mày là gì?'],
            ['<code>readelf -h</code>', 'đọc ELF header — <code>Class</code>, <code>Type</code>, <code>Machine</code>'],
            ['<code>ls -l</code>', 'so kích thước hai file']
          ] }
      ],
      hint: '"Chứng minh" ở đây nghĩa là đọc <b>tiêu đề</b> của file, cộng với việc hỏi chính ' +
            'trình biên dịch xem nó sinh mã cho ai.',
      crit: [
        'Lệnh build đúng: <code>aarch64-linux-gnu-gcc -static -O2 hello.c -o e4out</code>, ' +
          'thoát <b>0</b>',
        'Chứng minh bằng <code>readelf -h e4out</code> và trích đúng ba dòng: ' +
          '<code>Class: ELF64</code>, <code>Type: EXEC (Executable file)</code>, ' +
          '<code>Machine: AArch64</code>',
        'Có hỏi <code>aarch64-linux-gnu-gcc -dumpmachine</code> → <code>aarch64-linux-gnu</code>, ' +
          'và nói được đây là bằng chứng về <b>công cụ</b>, còn <code>readelf</code> là bằng ' +
          'chứng về <b>sản phẩm</b> — cần cả hai',
        'So đúng kích thước: bản aarch64 tĩnh <b>705 248 B</b>, bản x86-64 tĩnh ' +
          '<b>816 840 B</b> (~112 KB chênh)',
        'Giải thích chênh lệch <b>không</b> phải "ARM nhỏ hơn nên tốt hơn": phần lớn hai file là ' +
          '<code>libc</code> tĩnh của hai bản build khác nhau, mật độ mã của hai tập lệnh khác ' +
          'nhau, và đây là con số của <i>một</i> chương trình cụ thể — không suy rộng ra được'
      ],
      sol:
        '<p><b>Build:</b></p>' +
        '<p><code>aarch64-linux-gnu-gcc -static -O2 hello.c -o e4out</code> → thoát 0, không ' +
        'cảnh báo.</p>' +
        '<p><b>Chứng minh, không chạy:</b></p>' +
        '<p><code>readelf -h e4out</code> →<br>' +
        '<code>  Class:                             ELF64</code><br>' +
        '<code>  Type:                              EXEC (Executable file)</code><br>' +
        '<code>  Machine:                           AArch64</code></p>' +
        '<p><code>file e4out</code> → ' +
        '<code>ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked</code></p>' +
        '<p><code>aarch64-linux-gnu-gcc -dumpmachine</code> → <code>aarch64-linux-gnu</code></p>' +
        '<p><b>Hai bằng chứng này khác loại nhau và bạn cần cả hai.</b> ' +
        '<code>-dumpmachine</code> nói về <i>công cụ</i>: trình biên dịch này sinh mã cho ai. ' +
        '<code>readelf</code> nói về <i>sản phẩm</i>: file vừa ra lò thực sự là gì. Chúng có thể ' +
        'lệch nhau — nhớ ca của Bình ở câu C2, nơi biến <code>CC</code> khiến ' +
        '<code>Makefile</code> gọi nhầm trình biên dịch: <code>-dumpmachine</code> của ' +
        'toolchain chéo vẫn nói <code>aarch64-linux-gnu</code>, nhưng file sinh ra là x86-64. ' +
        'Chỉ <code>readelf</code> mới bắt được chuyện đó.</p>' +
        '<p><b>Vì sao "chạy thử" không phải bằng chứng:</b> trên máy này ' +
        '<code>./e4out</code> sẽ chạy ngon lành nhờ qemu-user (câu E1). Một lần chạy thành công ' +
        'ở đây không nói gì về việc file có đúng kiến trúc hay không — nó chỉ nói máy này có ' +
        'lớp mô phỏng.</p>' +
        '<p><b>Kích thước:</b></p>' +
        '<p><code>705 248 B</code> (aarch64, tĩnh) so với <code>816 840 B</code> (x86-64, tĩnh) ' +
        '— bản ARM nhỏ hơn khoảng <b>112 KB</b>.</p>' +
        '<p>Đừng vội kết luận "ARM gọn hơn x86". Gần như toàn bộ hai file là <b>libc liên kết ' +
        'tĩnh</b>, và đó là hai bản build khác nhau, cấu hình khác nhau, do hai nhóm đóng gói ' +
        'khác nhau tạo ra. Mật độ mã của hai tập lệnh cũng khác (AArch64 dùng lệnh dài cố định ' +
        '4 byte, x86-64 dùng lệnh dài thay đổi). Phần <code>main</code> của chính bạn chỉ là vài ' +
        'chục byte trong cả trăm nghìn byte đó. Một con số như thế này chỉ đúng cho <i>chương ' +
        'trình này, toolchain này, hôm nay</i> — muốn so tập lệnh thì phải so ' +
        '<code>objdump -d</code> của riêng <code>main</code>, không phải so <code>ls -l</code>.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Một đồng nghiệp chia chương trình thành hai file rồi build từng file bằng ' +
         '<b>hai trình biên dịch khác nhau</b> mà không để ý. Bước liên kết thất bại. Hãy: ' +
         '(1) đọc thông báo và nói <b>chính xác</b> file nào sai và sai thế nào; ' +
         '(2) giải thích <code>EM: 62</code> và <code>EM: 183</code> nghĩa là gì; ' +
         '(3) sửa lại, và nói vì sao <b>không thể</b> sửa bằng cách đổi trình liên kết.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt25\n' +
          'file main-x86.o sum-arm64.o\n' +
          'aarch64-linux-gnu-gcc -static main-x86.o sum-arm64.o -o mixed ; echo "exit=$?"\n' +
          'gcc main-x86.o sum-arm64.o -o mixed2 ; echo "exit=$?"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'main-x86.o:  ELF 64-bit LSB relocatable, x86-64, version 1 (SYSV), not stripped\n' +
          'sum-arm64.o: ELF 64-bit LSB relocatable, ARM aarch64, version 1 (SYSV), not stripped\n' +
          '\n' +
          '/usr/bin/aarch64-linux-gnu-ld.bfd: main-x86.o: Relocations in generic ELF (EM: 62)\n' +
          '/usr/bin/aarch64-linux-gnu-ld.bfd: main-x86.o: Relocations in generic ELF (EM: 62)\n' +
          '/usr/bin/aarch64-linux-gnu-ld.bfd: main-x86.o: error adding symbols: file in wrong format\n' +
          'collect2: error: ld returned 1 exit status\n' +
          'exit=1\n' +
          '\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: sum-arm64.o: Relocations in generic ELF (EM: 183)\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: sum-arm64.o: error adding symbols: file in wrong format\n' +
          'collect2: error: ld returned 1 exit status\n' +
          'exit=1' }
      ],
      hint: 'Hai lần chạy tố cáo <b>hai file khác nhau</b>. Hãy để ý trình liên kết nào phàn nàn ' +
            'về file nào — và tự hỏi vì sao nó lại đổi "phe".',
      crit: [
        'Chỉ ra đúng cấu trúc của lỗi: mỗi trình liên kết chỉ chấp nhận object <b>cùng kiến ' +
          'trúc với target của nó</b>, nên <code>aarch64-ld</code> chê ' +
          '<code>main-x86.o</code> còn <code>x86_64-ld</code> chê <code>sum-arm64.o</code> — ' +
          'không phải "một file hỏng", mà là <b>hai file không cùng loại</b>',
        'Giải mã đúng con số: <code>EM</code> chính là <code>e_machine</code> — ' +
          '<b>62</b> = x86-64, <b>183</b> = AArch64; và <i>generic ELF</i> nghĩa là trình liên ' +
          'kết đọc được vỏ ELF nhưng <b>không biết cách xử lý relocation</b> của kiến trúc đó',
        'Sửa đúng: build lại <b>cả hai</b> <code>.o</code> bằng cùng một trình biên dịch, ví dụ ' +
          '<code>aarch64-linux-gnu-gcc -c main.c -o main.o</code> và ' +
          '<code>aarch64-linux-gnu-gcc -c sum.c -o sum.o</code>, rồi liên kết',
        'Giải thích được vì sao đổi trình liên kết <b>không</b> cứu được: đổi ' +
          '<code>ld</code> chỉ chuyển lỗi sang file kia; không có trình liên kết nào ghép được ' +
          'hai tập lệnh khác nhau vào một đoạn <code>.text</code>',
        'Nêu được vì sao lỗi này <b>tốt</b>: nó xảy ra ở giai đoạn liên kết, ồn ào và có tên ' +
          'file cụ thể — so với ca của Bình ở C2 vốn im lặng cho tới khi lên bo'
      ],
      sol:
        '<p><b>(1) Đọc thông báo.</b> Điểm mấu chốt là hai lần chạy tố cáo <b>hai file khác ' +
        'nhau</b>:</p>' +
        '<ul>' +
        '<li><code>aarch64-linux-gnu-ld.bfd</code> chê <code>main-x86.o</code>;</li>' +
        '<li><code>x86_64-linux-gnu-ld.bfd</code> chê <code>sum-arm64.o</code>.</li>' +
        '</ul>' +
        '<p>Vậy không có file nào "hỏng" cả. Mỗi file đều hoàn hảo — cho kiến trúc của nó. Vấn ' +
        'đề là chúng <b>không cùng kiến trúc</b>, và mỗi trình liên kết chỉ nhận object khớp ' +
        'với target của chính nó. Đây là một lỗi <i>quan hệ</i>, không phải lỗi của một file, ' +
        'nên câu trả lời "file <code>main-x86.o</code> bị lỗi" là chưa đúng.</p>' +
        '<p><b>(2) <code>EM: 62</code> và <code>EM: 183</code>.</b> <code>EM</code> chính là ' +
        '<code>e_machine</code>, đúng trường 2 byte bạn đã vá ở câu E1: <b>62</b> = ' +
        '<code>EM_X86_64</code>, <b>183</b> = <code>EM_AARCH64</code>. Cụm ' +
        '<i>Relocations in generic ELF</i> nghĩa là: trình liên kết mở được file (vỏ ELF là ' +
        'chuẩn chung, ai cũng đọc được), nhưng khi tới bảng <b>relocation</b> — danh sách ' +
        '"chỗ này cần vá lại địa chỉ theo kiểu nào" — thì nó gặp những mã kiểu relocation của ' +
        'một kiến trúc nó không biết. Nên nó lùi về đối xử với file như "ELF chung chung" và ' +
        'bỏ cuộc: <code>file in wrong format</code>.</p>' +
        '<p><b>(3) Sửa.</b> Chọn <i>một</i> kiến trúc rồi build lại toàn bộ:</p>' +
        '<p><code>aarch64-linux-gnu-gcc -c main.c -o main.o</code><br>' +
        '<code>aarch64-linux-gnu-gcc -c sum.c -o sum.o</code><br>' +
        '<code>aarch64-linux-gnu-gcc -static main.o sum.o -o mixed</code></p>' +
        '<p><b>Vì sao đổi trình liên kết không cứu được.</b> Bạn đã tự chứng minh rồi: lần chạy ' +
        'thứ hai chỉ <b>đổi bên bị chê</b>. Và điều đó là tất yếu — trình liên kết không dịch ' +
        'mã, nó chỉ dán các đoạn lại rồi vá địa chỉ. Trong <code>main-x86.o</code> là byte lệnh ' +
        'x86-64, trong <code>sum-arm64.o</code> là byte lệnh AArch64; dán chúng vào chung một ' +
        'đoạn <code>.text</code> thì CPU nào cũng chỉ hiểu được một nửa. Không có ' +
        '<code>ld</code> nào làm được việc đó, và cũng không nên có.</p>' +
        '<p><b>Vì sao đây là một lỗi <i>tốt</i>.</b> Nó nổ ở giai đoạn liên kết, in ra tên file ' +
        'cụ thể và một con số tra được, tổng cộng mất của bạn ba mươi giây. Hãy so với ca của ' +
        'Bình ở câu C2: build xanh, exit 0, không cảnh báo, và lỗi chỉ lộ ra khi file đã lên bo. ' +
        'Trong hai kiểu sai, kiểu ồn ào luôn rẻ hơn.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Câu này <b>không có lời giải trọn vẹn</b> trong Bài 25, và bạn được phép kết thúc mà ' +
         'chưa làm xong. Nãy giờ <code>hello.c</code> luôn được build với <code>-static</code>. ' +
         'Hãy bỏ <code>-static</code> đi và chạy hết khối lệnh dưới — <b>sẽ có ít nhất một chỗ ' +
         'làm bạn bất ngờ</b>. Rồi trả lời: muốn cross-compile một chương trình <b>liên kết ' +
         'động</b> dùng thư viện <code>libcurl</code>, trình biên dịch cần file ' +
         '<code>.h</code> và <code>.so</code> của <b>kiến trúc nào</b>, và bạn định lấy chúng ' +
         '<b>ở đâu</b>?',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bt25\n' +
          '\n' +
          '# 1. bo -static di: van build duoc chu?\n' +
          'aarch64-linux-gnu-gcc -O2 hello.c -o hello-dyn\n' +
          'file hello-dyn\n' +
          '\n' +
          '# 2. no doi bo nap nao -- va thu chay no ngay tren may nay\n' +
          'readelf -l hello-dyn | grep -i interpreter\n' +
          './hello-dyn ; echo "exit=$?"\n' +
          '\n' +
          '# 3. trinh bien dich cheo dang tim header/thu vien o dau?\n' +
          'aarch64-linux-gnu-gcc -print-sysroot\n' +
          'ls /usr/aarch64-linux-gnu/lib | head\n' +
          'ls /usr/aarch64-linux-gnu/include | head -5\n' +
          '\n' +
          '# 4. mot thu vien KHONG phai libc\n' +
          'aarch64-linux-gnu-gcc -O2 hello.c -lcurl -o hello-curl ; echo "exit=$?"\n' +
          'ls /usr/lib/x86_64-linux-gnu/ | grep "^libcurl" | head -3\n' +
          '\n' +
          'rm -f hello-dyn hello-curl' },
        { t: 'cal', kind: 'tip', title: 'Câu hỏi dẫn đường',
          x: '<p>Bước 4 cho thấy <code>libcurl</code> <b>có</b> trên máy bạn — chỉ là bản ' +
             'x86-64. Trình liên kết chéo nhìn thấy nó mà vẫn báo <i>cannot find</i>. Nó cố ' +
             'tình không nhìn vào đó. Vì sao việc "cố tình không nhìn" lại là điều tốt?</p>' }
      ],
      hint: 'Thứ bạn đang thiếu có một cái tên riêng và nó là nội dung chính của Bài 26. Nếu ' +
            'bạn tự nói ra được "tôi cần một bản sao thư mục <code>/usr</code> của <b>bo</b>, ' +
            'đặt trên máy tôi" thì bạn vừa tự phát minh lại đúng khái niệm đó.',
      crit: [
        'Ghi nhận bước 1: bỏ <code>-static</code> <b>vẫn build được</b> — ra một ' +
          '<code>pie executable</code> AArch64, <code>dynamically linked</code>, ' +
          '<code>interpreter /lib/ld-linux-aarch64.so.1</code>',
        'Ghi nhận cú bất ngờ ở bước 2: lần này <code>./hello-dyn</code> <b>thất bại</b> — ' +
          '<code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\'</code>, ' +
          '<b><code>exit=255</code></b> — trái ngược với bản tĩnh ở câu E1, và giải thích được ' +
          'vì sao: qemu mô phỏng <i>lệnh CPU</i>, nó không cung cấp <b>hệ thống file của bo</b>',
        'Đọc đúng bước 3: <code>-print-sysroot</code> in ra <b><code>/</code></b> — tức ' +
          '<i>không có</i> sysroot riêng; gói toolchain chỉ đặt sẵn libc và header aarch64 ' +
          'trong <code>/usr/aarch64-linux-gnu/</code> và thêm đường dẫn đó vào danh sách tìm kiếm',
        'Đọc đúng bước 4: <code>cannot find -lcurl</code>, thoát <b>1</b> — <b>mặc dù</b> ' +
          '<code>/usr/lib/x86_64-linux-gnu/libcurl.so.4</code> đang nằm ngay đó; trình liên kết ' +
          'chéo <b>không tìm trong thư mục của kiến trúc host</b>, và đó là bảo vệ chứ không ' +
          'phải thiếu sót',
        'Trả lời đúng câu chính: cần <code>.h</code> và <code>.so</code> của ' +
          '<b>kiến trúc đích (aarch64)</b>, lấy từ chính bản phân phối chạy trên bo — và gọi ' +
          'tên được thứ cần dựng: một <b>bản sao cây thư mục hệ thống của bo</b> đặt trên máy ' +
          'build (<code>sysroot</code>)'
      ],
      sol:
        '<p><b>Bước 1 — vẫn build được.</b></p>' +
        '<p><code>hello-dyn: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), ' +
        'dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, … not stripped</code></p>' +
        '<p><b>Bước 2 — chỗ bất ngờ.</b> <code>readelf -l</code> cho ' +
        '<code>[Requesting program interpreter: /lib/ld-linux-aarch64.so.1]</code>, và khi chạy:</p>' +
        '<p><code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or ' +
        'directory</code> → <code>exit=255</code></p>' +
        '<p>Ở câu E1, một nhị phân ARM64 <b>tĩnh</b> chạy trơn tru trên máy này. Ở đây một nhị ' +
        'phân ARM64 <b>động</b> chết ngay. Khác biệt không nằm ở kiến trúc — cả hai đều là ' +
        'AArch64, cả hai đều được <code>binfmt_misc</code> nhận và giao cho ' +
        '<code>qemu-aarch64</code>. Khác biệt là bản động cần một file <i>khác</i> tồn tại tại ' +
        'đường dẫn <code>/lib/ld-linux-aarch64.so.1</code> — và trên máy x86-64 của bạn, ' +
        '<code>/lib/</code> chứa bộ nạp x86, không phải bộ nạp ARM.</p>' +
        '<p>Đây là một ranh giới đáng nhớ: <b>qemu-user mô phỏng lệnh CPU, nó không mô phỏng hệ ' +
        'thống file của bo.</b> Nó cho bạn mượn CPU ảo, còn <code>/lib</code>, ' +
        '<code>/usr/lib</code>, các file <code>.so</code> thì vẫn là của máy bạn. Cũng vì thế mà ' +
        'mọi ví dụ trước đều dùng <code>-static</code>: liên kết tĩnh xoá bỏ toàn bộ câu hỏi ' +
        '"trên hệ thống đích có sẵn những gì".</p>' +
        '<p><b>Bước 3 — không hề có sysroot.</b> <code>-print-sysroot</code> in ra đúng một ký ' +
        'tự: <code>/</code>. Nghĩa là trình biên dịch chéo này <i>không</i> được cấu hình với ' +
        'một thư mục gốc riêng cho bo. Cái nó có chỉ là libc và header aarch64 mà gói ' +
        '<code>gcc-aarch64-linux-gnu</code> đặt sẵn trong <code>/usr/aarch64-linux-gnu/</code> ' +
        '(<code>ld-linux-aarch64.so.1</code>, <code>crt1.o</code>, <code>libc</code>…, và cả một ' +
        'cây <code>include</code> đầy đủ), rồi thêm đường dẫn ấy vào danh sách tìm kiếm. Đủ cho ' +
        '<code>hello.c</code>, và <b>chỉ</b> đủ cho những gì libc cung cấp.</p>' +
        '<p><b>Bước 4 — và đây là câu trả lời.</b></p>' +
        '<p><code>/usr/bin/aarch64-linux-gnu-ld.bfd: cannot find -lcurl: No such file or ' +
        'directory</code> → <code>exit=1</code></p>' +
        '<p>Trong khi đó <code>/usr/lib/x86_64-linux-gnu/</code> có sẵn ' +
        '<code>libcurl.so.4</code>. Vậy thư viện <i>có</i> trên máy, và trình liên kết chéo vẫn ' +
        'nói không tìm thấy — vì nó <b>không tìm ở đó</b>. Điều này trông như một sự bất tiện, ' +
        'nhưng nó chính là thứ bảo vệ bạn: nếu nó "hữu ích" mà lấy đại file x86 kia, bạn sẽ ' +
        'nhận đúng loại lỗi <code>EM:</code> ở câu E5 — hoặc tệ hơn, một bản build sạch sẽ mà ' +
        'sai âm thầm.</p>' +
        '<p><b>Vậy cần gì?</b> Cần <code>.h</code> và <code>.so</code> của ' +
        '<b>kiến trúc đích</b>, lấy từ chính bản phân phối chạy trên bo:</p>' +
        '<ul>' +
        '<li><b><code>.so</code></b> là mã máy đã biên dịch sẵn — bản x86 tuyệt đối không dùng ' +
        'được, và ít nhất chuyện này còn <i>ồn ào</i>.</li>' +
        '<li><b><code>.h</code></b> mới là cái bẫy. Header là văn bản, trình biên dịch ' +
        '<i>chấp nhận</i> nó không một lời phàn nàn. Nhưng header hệ thống chứa những định ' +
        'nghĩa phụ thuộc kiến trúc — độ rộng con trỏ, kích thước kiểu, cách sắp xếp struct. ' +
        'Dùng nhầm bộ header là hỏng <b>âm thầm</b>: build sạch, chạy sai. Nhớ lại ' +
        '<code>__SIZEOF_LONG__</code> ở câu b5 và bài toán tràn ở câu C4 — cùng một họ lỗi.</li>' +
        '</ul>' +
        '<p><b>Thứ bạn đang thiếu có tên riêng.</b> Bạn cần một <b>bản sao cây thư mục hệ thống ' +
        'của bo</b> — <code>/usr/include</code> và <code>/usr/lib</code> của <i>nó</i> — đặt ' +
        'trong một thư mục trên máy build, cộng với một cách bảo trình biên dịch: "coi thư mục ' +
        'này là <code>/</code>, đừng đụng vào <code>/usr</code> của máy tôi". Cái đó gọi là ' +
        '<b><code>sysroot</code></b>. Lấy nó ở đâu, ai dựng, làm sao giữ cho khớp với bo — ' +
        'chính là nội dung <b>Bài 26</b>.</p>' +
        '<p>Nếu bạn tự nghĩ ra cụm "cần bản sao <code>/usr</code> của bo đặt trên máy tôi" ' +
        'trước khi đọc lời giải, thì bạn không còn phải <i>học</i> Bài 26 nữa — chỉ cần biết ' +
        'người ta gọi nó là gì và có sẵn công cụ nào để dựng.</p>' }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     F · BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Slug lấy bằng Render.slug() trên đúng chuỗi h2 của lessons/bai-25.js,
     không gõ tay (CLAUDE.md §13.7).
     ══════════════════════════════════════════════════════════════════════ */
  diag: [
    ['A1, A5, B1, C1, E1',
     'Trục 1 — một file thuộc về đúng một kiến trúc, nhưng <b>"chạy được"</b> là thuộc tính của ' +
       '<i>hệ thống nạp</i> chứ không phải của file: <code>e_machine</code>, ' +
       '<code>execve()</code>, <code>ENOEXEC</code>, và vì sao máy bạn lại là ngoại lệ',
     '<a href="#/bai-25#hai-con-cpu-hai-thu-tieng-khong-dich-duoc-cho-nhau">Đọc lại Bài 25 — ' +
       'Hai con CPU, hai thứ tiếng không dịch được cho nhau</a>'],

    ['A2, B2, C3',
     'Trục 2 — rào cản khi build trên bo là <b>tài nguyên</b>, và khoản lớn nhất là kích thước ' +
       'của chính bộ công cụ: 111 MB toolchain, ~33 MB RAM cho một lần dịch nhỏ, sàn địa chỉ ' +
       'nằm giữa 32 MB và 64 MB',
     '<a href="#/bai-25#vi-sao-khong-mang-trinh-bien-dich-len-board">Đọc lại Bài 25 — Vì sao ' +
       'không mang trình biên dịch lên board?</a>'],

    ['A3, A4, A7, B4, C5, E4',
     'Trục 3 — <code>build</code> / <code>host</code> / <code>target</code> là thuộc tính của ' +
       'một <b>công cụ</b>, không phải của một sản phẩm; vì sao <code>busybox</code> không có ' +
       '<code>target</code> còn <code>gdb</code> thì có',
     '<a href="#/bai-25#ba-cai-ten-build-host-target">Đọc lại Bài 25 — Ba cái tên: build, host, ' +
       'target</a>'],

    ['A6, B1, D2, E1',
     '<code>e_machine</code>: một trường 2 byte tại offset <code>0x12</code> trong ELF header — ' +
       'nằm ở đâu, vì sao đọc được <i>trước khi</i> nạp, và vì sao vá được bằng <code>dd</code>',
     '<a href="#/bai-25#cung-mot-file-c-hai-bo-ma-may-hoan-toan-khac-nhau">Đọc lại Bài 25 — Cùng ' +
       'một file C, hai bộ mã máy hoàn toàn khác nhau</a>'],

    ['A8, B3, E2, E5',
     'Mỗi lỗi thuộc về một <b>giai đoạn</b> khác nhau — shell, biên dịch, liên kết, nạp, chạy — ' +
       'và ~30 % (cross-compile lúc build) không phải ~6× (mô phỏng lúc chạy)',
     '<a href="#/bai-25#thuc-hanh-do-tan-tay-ranh-gioi-giua-hai-kien-truc">Đọc lại Bài 25 — Thực ' +
       'hành: đo tận tay ranh giới giữa hai kiến trúc</a>'],

    ['B5, B6, C4, D3, E6',
     'Cùng một mã nguồn, hai target: <code>__SIZEOF_LONG__</code> 8 hay 4, tĩnh hay động, và vì ' +
       'sao không mượn được <code>.h</code>/<code>.so</code> của kiến trúc khác',
     '<a href="#/bai-25#loi-thuong-gap">Đọc lại Bài 25 — Lỗi thường gặp</a>'],

    ['C2, D1',
     'Vì sao một bản build "thành công" vẫn có thể sai kiến trúc: <code>?=</code> trong ' +
       'Makefile, biến <code>CC</code>, và bốn giai đoạn biên dịch của Bài 15',
     '<a href="#/bai-15">Đọc lại Bài 15 — Bốn giai đoạn biên dịch</a>']
  ]
});

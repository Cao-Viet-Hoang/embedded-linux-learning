/* ============================================================
   BT-03 — Bài tập cho Bài 3: "Môi trường học: WSL2 và QEMU"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                          | PT | GIA | NGC | Tổng |
   |---------------------------------------------------|----|-----|-----|------|
   | Ảo hoá cần CÙNG kiến trúc → khác thì luôn giả lập  | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | qemu-user vs qemu-system: AI xử lý syscall         | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | /mnt/c là ranh giới hai HĐH, đi qua 9P             | 2  |  2  |  1  |  5   |  ← TRỤC 3
   | WSL2 là VM thật, có kernel Linux thật              | 1  |  1  |  2  |  4   |
   | WSL2 không có bootloader (/boot rỗng)              | 2  |  1  |  1  |  4   |
   | -static là bắt buộc khi chạy dưới qemu-user        | 1  |  1  |  2  |  4   |
   | Không sửa được kernel WSL2 (thiếu .../build)       | 1  |  1  |  1  |  3   |
   | Exec format error là lỗi KIẾN TRÚC, không phải hỏng file | 1 | 1 | 1 |  3   |
   | binfmt_misc chạy hộ file khác kiến trúc            | 1  |  0  |  2  |  3   |
   | Kích thước binary x86 vs ARM64 static              | 0  |  0  |  1  |  1   |

   Bước 3 — cắt: lấy ba ứng viên cao nhất. Ba ứng viên 4 điểm còn lại xuống
   mức hỏi MỘT lần: "WSL2 là VM thật" ở A1, "không có bootloader" ở B2,
   "-static bắt buộc" ở A7 và E5.

   Bước 4 — loại: kích thước file (705 328 / 70 448 byte) bị loại khỏi danh
   sách trục theo §13.3 — tra được trong mười giây. Nó chỉ xuất hiện làm DỮ
   LIỆU trong phần E, không bao giờ làm câu hỏi.
   Kiểm tra chống trùng với các bộ trước: bt-01 xoáy MMU / bốn mảnh nối tiếp /
   Device Tree; bt-02 xoáy DRAM-SRAM-SPL / bàn giao rồi biến mất / bootargs.
   Ba trục của bộ này không trùng cái nào — hợp lệ.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (ảo hoá ⟂ giả lập) A2 phát biểu → B1 uname + accel help thật  → C1 chọn máy chạy CI
     Trục 2 (hai họ QEMU)      A3 phát biểu → B4 lỗi interpreter thật     → C3 cần thử driver /dev
     Trục 3 (ranh giới 9P)     A4 phát biểu → B5 mount + chmod thật       → C2 chmod báo OK mà không đổi gì

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, QEMU 10.2.1, GCC chéo 15.2.0)
   ngày 2026-08-11.

   HAI CON SỐ CỐ Ý KHÔNG ĐƯỢC HỎI, vì đo lại KHÔNG ra cùng kết quả:
   1) Tỉ lệ chậm của /mnt/c. Bài 3 ghi 0,017 s so với 0,882 s (52 lần). Đo lại
      ngày 2026-08-11 bằng đúng câu lệnh đó, chạy từ file script: 0,998 s so
      với 6,711 s. Lý do là phép đo bị chi phí tạo tiến trình của 500 lần gọi
      `touch` nuốt mất (riêng 500 lần fork đã tốn 2,448 s). Đo phần thuần hệ
      thống file bằng vòng lặp không fork (`: > f$i`): 0,048 s so với 1,629 s,
      tức khoảng 34 lần. Kết luận: CHIỀU của hiệu ứng là thật và rất lớn, còn
      CON SỐ thì phụ thuộc cách đo. Vì vậy mọi câu ở đây hỏi về CƠ CHẾ (9P,
      mỗi thao tác một vòng trao đổi) chứ không hỏi tỉ lệ.
   2) Số khối lệnh TCG dịch được khi chạy `hello-arm64`: đo hai lần ra 1091 và
      1092. Câu E6 vì thế chỉ yêu cầu "khoảng một nghìn", không chấm con số.
   ============================================================ */
Exercise.register({
  id: 'bt-03',
  minutes: 90,

  intro:
    '<p>Bài 3 đã dựng xong chỗ làm việc. Bộ bài tập này kiểm tra xem bạn có thật sự hiểu <b>ranh ' +
    'giới</b> của nó không — vì mọi lỗi tốn thời gian nhất trong sáu tháng tới đều sinh ra ở đúng ' +
    'những ranh giới đó: giữa x86-64 và ARM64, giữa "chạy một chương trình" và "chạy cả một cái ' +
    'máy", giữa hệ thống file của Linux và ổ đĩa của Windows.</p>' +
    '<p>Bạn sẽ đọc dòng <code>mount</code> thật chứng minh <code>/mnt/c</code> đi qua một giao thức ' +
    '<i>mạng</i>, nhìn <code>chmod</code> báo thành công trong khi không đổi được gì, và giải thích ' +
    'vì sao máy bạn có <code>/dev/kvm</code> mà QEMU vẫn chỉ liệt kê đúng một bộ tăng tốc.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Phần D lần này ôn lại Bài 2 — luồng khởi động — vì Chặng 06 sắp tới sẽ dùng chính QEMU của ' +
    'bài này để chạy lại từng giai đoạn đó.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` và `mis` là tài liệu cho người viết
     bài tập sau, không được render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'aohoa',
      name: 'Ảo hoá cần cùng kiến trúc',
      x: 'Ảo hoá (KVM) chỉ tăng tốc được khi máy khách và máy chủ CÙNG kiến trúc, vì nó cho CPU thật ' +
         'chạy thẳng lệnh của máy khách; khác kiến trúc thì không có gì để chạy thẳng, nên mọi lệnh ' +
         'bắt buộc phải đi qua bộ dịch TCG — và có /dev/kvm cũng không thay đổi được điều đó.',
      mis: 'Máy tôi có KVM, mà KVM làm máy ảo chạy nhanh, nên máy ARM64 giả lập trên máy tôi cũng sẽ ' +
           'nhanh; chậm là do cấu hình chưa bật đúng tuỳ chọn tăng tốc.' },

    { id: 'haiho',
      name: 'Hai họ QEMU khác nhau ở ai xử lý syscall',
      x: 'qemu-aarch64 chỉ giả lập một CPU cho MỘT tiến trình — mọi lời gọi hệ thống của chương trình ' +
         'được chuyển sang cho kernel Linux của máy chủ xử lý, và nó dùng luôn hệ thống file của máy ' +
         'chủ; còn qemu-system-aarch64 giả lập cả một cái máy, bên trong có kernel riêng của máy khách.',
      mis: 'Hai lệnh đó chỉ khác nhau ở tên gọi, hoặc khác ở chỗ một cái chạy chương trình còn một ' +
           'cái chạy hệ điều hành — dùng cái nào cũng được, cái nào tiện hơn thì dùng.' },

    { id: 'ranhgioi',
      name: '/mnt/c là ranh giới giữa hai hệ điều hành',
      x: '/mnt/c không phải một thư mục bình thường mà là cửa ngõ sang NTFS của Windows qua giao thức ' +
         'mạng 9P, nên mỗi thao tác file phải đi trọn một vòng trao đổi, và ngữ nghĩa quyền của Linux ' +
         'không giữ được — chmod ở đó báo thành công nhưng không đổi được gì.',
      mis: '/mnt/c chỉ là một thư mục nằm ở ổ khác, cùng lắm thì chậm hơn một chút; để mã nguồn ở đó ' +
           'cho tiện mở bằng công cụ Windows thì chẳng sao cả.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN A — NHẬN BIẾT (8 câu)
     4 trắc nghiệm · 2 đúng-sai kèm sửa · 1 điền khuyết · 1 ghép nối
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'WSL2 thực chất là gì?',
      opts: [
        'Một lớp dịch: nó nhận lời gọi hệ thống của Linux rồi chuyển thành lời gọi tương ứng của Windows.',
        'Một <b>máy ảo Hyper-V thật sự</b>, bên trong chạy một kernel Linux thật do Microsoft biên dịch ' +
          'và phát hành.',
        'Một bộ giả lập chạy mã Linux bằng cách dịch từng lệnh máy sang lệnh x86 lúc chạy.',
        'Một vùng chứa (container) dùng chung kernel với Windows, tương tự Docker.'
      ],
      a: 1,
      why: 'WSL<b>1</b> mới là lớp dịch lời gọi hệ thống (phương án A) — và chính vì thế nó không bao ' +
           'giờ chạy được mọi thứ. WSL<b>2</b> đổi hẳn cách làm: một máy ảo Hyper-V nhẹ, có kernel ' +
           'Linux thật, nên tính tương thích gần như hoàn hảo. Đó là lý do bạn đọc được ' +
           '<code>/proc/version</code>, <code>dmesg</code> và <code>/proc/cmdline</code> thật ở Bài 1 ' +
           'và Bài 2. Phương án C mô tả QEMU chứ không phải WSL2 — WSL2 chạy mã x86-64 thẳng trên CPU ' +
           'x86-64, không dịch gì cả. Phương án D sai vì container thì dùng chung kernel với máy chủ, ' +
           'còn WSL2 có kernel riêng.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Máy bạn có <code>/dev/kvm</code>. Vì sao chạy một máy ảo ARM64 trên máy đó vẫn <b>không thể</b> ' +
         'dùng KVM để tăng tốc?',
      opts: [
        'Vì QEMU cần được biên dịch lại kèm tuỳ chọn bật KVM cho ARM64.',
        'Vì quyền truy cập <code>/dev/kvm</code> chưa được cấp cho người dùng thường.',
        'Vì KVM hoạt động bằng cách cho <b>CPU thật chạy thẳng lệnh của máy khách</b> — mà CPU x86-64 ' +
          'của bạn không hiểu lệnh ARM64, nên không có gì để chạy thẳng cả.',
        'Vì WSL2 đã chiếm dụng KVM nên QEMU không dùng được nữa.'
      ],
      a: 2,
      why: 'Đây là chỗ dễ hiểu sai nhất trong cả Bài 3, và hiểu sai nó dẫn tới hàng giờ loay hoay tìm ' +
           '"tuỳ chọn bật tăng tốc". Ảo hoá không phải phép màu làm mọi thứ nhanh lên: nó chỉ là ' +
           '<b>cho CPU thật chạy trực tiếp lệnh của máy khách</b>, và phần cứng chỉ can thiệp ở những ' +
           'thao tác đặc quyền. Điều kiện tiên quyết là hai bên <b>cùng kiến trúc</b>. Máy khách ARM64 ' +
           'trên máy chủ x86-64 vi phạm đúng điều kiện đó, nên mọi lệnh buộc phải qua bộ dịch ' +
           '<b>TCG</b>. Ở câu B1 bạn sẽ nhìn thấy chính QEMU tự khai báo điều này.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Khi bạn chạy <code>qemu-aarch64 ./chuong-trinh-arm64</code>, chương trình đó gọi ' +
         '<code>write()</code> để in ra màn hình. <b>Ai</b> thực sự xử lý lời gọi hệ thống đó?',
      opts: [
        'Một kernel Linux ARM64 thu nhỏ nằm bên trong <code>qemu-aarch64</code>.',
        '<b>Kernel Linux của máy chủ</b> — QEMU dịch lời gọi hệ thống ARM64 sang lời gọi tương ứng ' +
          'rồi chuyển cho kernel đang chạy trên máy bạn.',
        'Chính QEMU tự ghi ra màn hình mà không cần tới kernel nào.',
        'Kernel của Windows, vì màn hình thuộc về Windows.'
      ],
      a: 1,
      why: '<code>qemu-aarch64</code> thuộc họ <b>user-mode</b>: nó chỉ giả lập <b>một CPU</b> cho ' +
           '<b>một tiến trình</b>. Nó không có kernel riêng, không có bộ nhớ ảo riêng, không có thiết ' +
           'bị riêng. Gặp lời gọi hệ thống, nó dịch sang lời gọi tương ứng của máy chủ và nhờ kernel ' +
           'của máy chủ làm hộ. Hệ quả trực tiếp và rất hay bị quên: chương trình chạy dưới ' +
           '<code>qemu-aarch64</code> nhìn thấy <b>hệ thống file của máy bạn</b>, chứ không phải một hệ ' +
           'thống file ARM64 nào khác — và bạn sẽ thấy đúng hệ quả đó gây ra một lỗi thật ở câu B4. ' +
           'Muốn có kernel khách riêng thì phải dùng <code>qemu-system-aarch64</code>.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Vì sao quy tắc của khoá học là <b>không bao giờ</b> đặt mã nguồn hay thư mục build trong ' +
         '<code>/mnt/c</code>?',
      opts: [
        'Vì Windows sẽ tự động xoá các file lạ nằm trong ổ C.',
        'Vì <code>/mnt/c</code> chỉ cho đọc, không ghi được từ Linux.',
        'Vì <code>/mnt/c</code> <b>không phải hệ thống file của Linux</b>: mỗi thao tác phải đi qua ' +
          'giao thức 9P sang NTFS của Windows, nên chậm hẳn khi có nhiều file nhỏ, và quyền của Linux ' +
          'không được giữ đúng.',
        'Vì ổ C thường không đủ dung lượng cho một cây mã nguồn kernel.'
      ],
      a: 2,
      why: 'Hai lý do độc lập nhau, và cả hai đều đủ sức làm hỏng một buổi làm việc. <b>Tốc độ:</b> ' +
           '9P là giao thức <i>mạng</i> — dù hai đầu nằm trên cùng một máy, mỗi thao tác file vẫn phải ' +
           'đi trọn một vòng trao đổi. Một bản build kernel tạo ra hàng chục nghìn file nhỏ, nên chi ' +
           'phí đó nhân lên rất nhanh. <b>Ngữ nghĩa:</b> NTFS không có khái niệm quyền kiểu Unix, nên ' +
           'bit quyền không lưu được — ở câu B5 và C2 bạn sẽ thấy <code>chmod</code> báo thành công mà ' +
           'thực tế không đổi được gì. Đây là loại lỗi tệ nhất: <i>im lặng và sai</i>.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"WSL2 chạy Ubuntu, mà Ubuntu là Linux đầy đủ, nên tôi có thể build và nạp một ' +
         'module kernel vào WSL2 y hệt như trên một máy Ubuntu cài thẳng lên ổ cứng."</i>',
      a: 1,
      why: 'Kernel của WSL2 <b>không phải kernel của Ubuntu</b> mà là kernel riêng do Microsoft biên ' +
           'dịch — bạn đã tự thấy tên nó ở Bài 1: <code>6.18.33.2-microsoft-standard-WSL2</code>. Bản ' +
           'phân phối Ubuntu chỉ cung cấp phần userspace. Hệ quả cụ thể: thư mục ' +
           '<code>/lib/modules/$(uname -r)/build</code> — nơi chứa header và cấu hình cần để biên dịch ' +
           'module — <b>không tồn tại</b>, nên lệnh build module hỏng ngay từ bước đầu. Đây chính là ' +
           'lý do thứ hai trong ba lý do khiến khoá học cần QEMU, và Chặng 10 (viết driver, dựng file ' +
           '<code>.ko</code>) sẽ chạy toàn bộ trên máy ảo QEMU chứ không phải trên WSL2.',
      rw: 'Viết lại nhận định cho đúng, nêu rõ kernel của WSL2 đến từ đâu và điều đó chặn bạn làm gì.',
      crit: [
        'Nói rõ kernel WSL2 là kernel riêng của Microsoft, không phải kernel của Ubuntu',
        'Nêu hệ quả cụ thể: không có /lib/modules/$(uname -r)/build nên không build được module',
        'Phân biệt được: Ubuntu chỉ cung cấp phần userspace trong WSL2',
        'Nêu cách khắc phục: dùng QEMU với kernel do mình tự build'
      ],
      sol: 'Trong WSL2, bản phân phối Ubuntu chỉ cung cấp <b>phần userspace</b>; kernel là một kernel ' +
           'riêng do Microsoft biên dịch và phát hành (tên có hậu tố ' +
           '<code>-microsoft-standard-WSL2</code>). Vì vậy các thứ cần để biên dịch module — đặc biệt ' +
           'là thư mục <code>/lib/modules/$(uname -r)/build</code> — không có sẵn, và việc build rồi ' +
           'nạp module vào chính WSL2 không làm được theo cách thông thường. Muốn viết và thử driver ' +
           'thì phải tự build kernel rồi chạy nó trong <b>QEMU</b>, nơi bạn toàn quyền với kernel của ' +
           'máy khách.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Biên dịch xong một chương trình cho ARM64 rồi chạy thử trên WSL2 thì nhận được ' +
         '<code>Exec format error</code>. Vậy là quá trình biên dịch đã hỏng, phải biên dịch lại."</i>',
      a: 1,
      why: '<code>Exec format error</code> <b>không</b> nói rằng file hỏng. Nó nói rằng kernel đã mở ' +
           'file, đọc phần đầu ELF, thấy trường kiến trúc ghi <code>AArch64</code>, và kết luận: CPU ' +
           'này không chạy được loại mã đó. File hoàn toàn lành lặn — chỉ là bạn đang đưa nó cho nhầm ' +
           'CPU. Bài 3 bắt bạn gặp lỗi này <b>có chủ đích</b>, vì nó là bằng chứng sờ được rằng ' +
           'cross-compile đã thành công thật. Cách chạy đúng là nhờ <code>qemu-aarch64</code> giả lập ' +
           'CPU ARM64 cho nó.',
      rw: 'Viết lại nhận định cho đúng, nói rõ thông báo đó thực sự có nghĩa gì và phải làm gì tiếp.',
      crit: [
        'Bác bỏ ý "file hỏng" — file hoàn toàn hợp lệ',
        'Giải thích đúng nguyên nhân: mã máy thuộc kiến trúc khác, CPU hiện tại không chạy được',
        'Nhận ra lỗi này ngược lại là BẰNG CHỨNG cross-compile đã thành công',
        'Nêu cách chạy đúng: dùng qemu-aarch64 (hoặc chạy trên máy ARM64 thật)'
      ],
      sol: 'File hoàn toàn không hỏng — ngược lại, <code>Exec format error</code> là <b>bằng chứng ' +
           'cross-compile đã thành công</b>. Kernel đã mở file, đọc phần đầu ELF, thấy kiến trúc là ' +
           'AArch64 và từ chối vì CPU x86-64 không thực thi được mã đó. Muốn chạy thì đưa cho một CPU ' +
           'hiểu nó: <code>qemu-aarch64 ./chuong-trinh</code> để giả lập một CPU ARM64, hoặc chép sang ' +
           'một máy ARM64 thật. Muốn kiểm chứng thêm, dùng <code>file</code> hoặc ' +
           '<code>readelf -h</code> để xem trường kiến trúc ghi gì.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Muốn file thực thi ARM64 <b>không phụ thuộc</b> vào bất kỳ thư viện động nào — điều kiện để ' +
         'nó chạy được ngay dưới <code>qemu-aarch64</code> — bạn thêm cờ nào vào lệnh biên dịch? ' +
         '(ghi đúng dạng gõ trên dòng lệnh)',
      a: ['-static', 'static', '--static'],
      ph: 'ví dụ: -…',
      why: 'Không có <code>-static</code>, trình biên dịch tạo ra một file <b>liên kết động</b>: lúc ' +
           'chạy, nó cần bộ nạp thư viện của ARM64 tên <code>/lib/ld-linux-aarch64.so.1</code>. Nhưng ' +
           '<code>qemu-aarch64</code> dùng <b>hệ thống file của máy bạn</b> (đúng như câu A3 đã nói), ' +
           'mà máy bạn là x86-64 nên không có file đó — chương trình chết ngay trước khi chạy dòng lệnh ' +
           'đầu tiên. <code>-static</code> nhúng trọn thư viện C vào bên trong file, nên không cần tìm ' +
           'gì bên ngoài nữa. Cái giá là kích thước: bản tĩnh <b>705 328 byte</b> so với bản động ' +
           '<b>70 448 byte</b>, gấp gần 10 lần. Chặng 04 sẽ phân tích kỹ sự đánh đổi này.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi công cụ / khái niệm với mô tả đúng vai trò của nó.',
      left: [
        'WSL2',
        '<code>qemu-aarch64</code>',
        '<code>qemu-system-aarch64</code>',
        'KVM',
        'TCG',
        '<code>aarch64-linux-gnu-gcc</code>'
      ],
      right: [
        'Bộ dịch bên trong QEMU: chuyển từng khối lệnh của máy khách sang lệnh của máy chủ ngay lúc chạy.',
        'Chạy <b>một</b> chương trình khác kiến trúc; lời gọi hệ thống của nó được kernel máy chủ xử lý hộ.',
        'Trình biên dịch chéo: bản thân chạy trên x86-64 nhưng sinh ra mã máy ARM64.',
        'Máy ảo Hyper-V có kernel Linux thật; dùng để viết mã và biên dịch, nhưng không có bootloader.',
        'Cơ chế của Linux cho CPU thật chạy thẳng lệnh máy khách — chỉ dùng được khi hai bên cùng kiến trúc.',
        'Giả lập <b>cả một cái máy</b>: có bộ nhớ, thiết bị và kernel riêng của máy khách.'
      ],
      a: [3, 1, 5, 4, 0, 2],
      why: 'Sáu ô này chia thành ba cặp đối nhau, và nhớ theo cặp thì không bao giờ lẫn. ' +
           '<b>KVM ⟂ TCG</b>: chạy thẳng trên CPU thật (cùng kiến trúc) so với dịch từng khối lệnh ' +
           '(khác kiến trúc). <b>qemu-aarch64 ⟂ qemu-system-aarch64</b>: một tiến trình, không có ' +
           'kernel khách, so với cả một cái máy có kernel khách riêng. <b>WSL2 ⟂ ' +
           'aarch64-linux-gnu-gcc</b>: nơi bạn làm việc so với công cụ tạo ra thứ chạy ở nơi khác. ' +
           'Cả Bài 3 gói gọn trong ba cặp đó.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN B — THÔNG HIỂU (6 câu)
     2 giải thích vì sao · 1 so sánh cặp · 1 bắt lỗi phát biểu · 2 đọc output
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Giải thích vì sao', truc: 0,
      q: 'Ba kết quả dưới đây chạy trên cùng một máy, ngay sau nhau. Chúng có vẻ mâu thuẫn: máy <b>có</b> ' +
         'thiết bị KVM, nhưng QEMU chỉ liệt kê đúng một bộ tăng tốc, và đó không phải KVM. Hãy giải ' +
         'thích vì sao đây không hề là mâu thuẫn.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'uname -m\n' +
          'ls -l /dev/kvm\n' +
          'qemu-system-aarch64 -accel help' },
        { t: 'code', where: 'out', nocopy: true, code:
          'x86_64\n' +
          'crw-rw---- 1 root kvm 10, 232 Aug 11 08:15 /dev/kvm\n' +
          'Accelerators supported in QEMU binary:\n' +
          'tcg' }
      ],
      hint: 'Hỏi ngược lại: KVM tăng tốc bằng cách nào? Nó cần điều kiện gì ở CPU thật bên dưới?',
      crit: [
        'Nêu đúng cơ chế của KVM: cho CPU thật chạy TRỰC TIẾP lệnh của máy khách',
        'Chỉ ra điều kiện tiên quyết: máy chủ và máy khách phải CÙNG kiến trúc',
        'Nối hai dòng đầu lại: uname -m là x86_64, còn máy khách muốn chạy là ARM64 → không khớp',
        'Kết luận đúng về tcg: khác kiến trúc thì bắt buộc dịch từng khối lệnh, không có lựa chọn nào khác',
        'Nói được /dev/kvm vẫn dùng được — nhưng chỉ cho máy khách x86-64'
      ],
      sol: '<p>Không mâu thuẫn, vì hai dòng nói về hai chuyện khác nhau.</p>' +
           '<p><code>/dev/kvm</code> tồn tại nghĩa là máy bạn <b>có</b> khả năng ảo hoá phần cứng — ' +
           'và bạn dùng được nó, miễn là máy khách cũng là <b>x86-64</b>. Nhưng KVM tăng tốc bằng một ' +
           'cách rất cụ thể: nó cho <b>CPU thật chạy thẳng lệnh của máy khách</b>, chỉ can thiệp ở ' +
           'những thao tác đặc quyền. Điều kiện tiên quyết vì thế là hai bên phải cùng kiến trúc.</p>' +
           '<p><code>uname -m</code> trả về <code>x86_64</code>. Máy khách bạn muốn chạy là ARM64. CPU ' +
           'x86-64 không hiểu một lệnh ARM64 nào, nên <i>không có gì để chạy thẳng</i> — KVM mất sạch ' +
           'lý do tồn tại. Chính vì thế <code>qemu-system-aarch64</code> chỉ liệt kê <code>tcg</code>: ' +
           'với kiến trúc này, trên máy này, dịch từng khối lệnh là con đường duy nhất.</p>' +
           '<p>Nhớ theo một câu: <b>ảo hoá là cùng kiến trúc, giả lập là khác kiến trúc.</b> Cái giá ' +
           'phải trả là tốc độ, và đó là lý do khoá học chọn QEMU một cách có ý thức chứ không phải vì ' +
           'thiếu lựa chọn.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao',
      q: 'Trong WSL2, thư mục <code>/boot</code> <b>rỗng hoàn toàn</b> — không có kernel, không có ' +
         'initramfs, không có cấu hình bootloader. Nhưng WSL2 vẫn khởi động lên được và bạn vẫn đọc ' +
         'được <code>dmesg</code> của một kernel thật. Giải thích vì sao, và nói rõ điều này chặn bạn ' +
         'học phần nào của khoá học.',
      hint: 'Nhìn lại sáu giai đoạn ở Bài 2. Trong WSL2, ai làm giai đoạn 0, 1 và 2?',
      crit: [
        'Nêu đúng: kernel của WSL2 do phía Windows (Hyper-V) nạp vào từ bên ngoài, không nằm trong /boot',
        'Nối được với Bài 2: các giai đoạn ROM code / SPL / U-Boot đều bị bỏ qua, không có bootloader nào chạy',
        'Kết luận đúng: /boot rỗng vì trong WSL2 không có thành phần nào cần đọc nó',
        'Nêu hệ quả học tập: không thể thực hành U-Boot / bootargs / luồng khởi động trên WSL2',
        'Nêu cách khắc phục: dùng QEMU, nơi có đủ cả bootloader lẫn kernel'
      ],
      sol: '<p>Kernel của WSL2 <b>không được nạp từ bên trong máy ảo</b>. Phía Windows giữ file kernel ' +
           'và đưa thẳng nó vào máy ảo Hyper-V lúc tạo máy. Vì vậy không có bộ phận nào bên trong ' +
           'Ubuntu phải đi tìm kernel, và <code>/boot</code> — thư mục sinh ra đúng để chứa thứ đó — ' +
           'không có việc gì để làm, nên rỗng.</p>' +
           '<p>Đặt cạnh sáu giai đoạn ở Bài 2 thì thấy rất rõ: <b>giai đoạn 0 (ROM code), 1 (SPL) và 2 ' +
           '(U-Boot) đều bị bỏ qua hoàn toàn</b>. WSL2 nhảy thẳng vào giai đoạn 3 — kernel đã nằm sẵn ' +
           'trong RAM, chạy luôn.</p>' +
           '<p>Hệ quả với việc học: mọi thứ thuộc về bootloader — nạp kernel, truyền ' +
           '<code>bootargs</code>, biến môi trường U-Boot, chẩn đoán "chết ở giai đoạn nào" — ' +
           '<b>không thực hành được trên WSL2</b>, vì trên đó không có giai đoạn nào để nhìn. Đây là lý ' +
           'do thứ nhất trong ba lý do khiến khoá học cần QEMU, và Chặng 06 sẽ chạy U-Boot thật bên ' +
           'trong QEMU để bù lại đúng khoảng trống này.</p>' },

    { id: 'b3', k: 'free', tag: 'So sánh cặp',
      q: 'WSL2 và <code>qemu-system-aarch64</code> đều là "chạy một hệ điều hành Linux bên trong máy ' +
         'bạn". Nhưng chúng khác nhau ở nhiều chỗ. Câu hỏi không phải là liệt kê mọi khác biệt, mà là: ' +
         '<b>khác biệt nào là khác biệt quan trọng nhất</b> đối với việc học embedded Linux — và vì sao ' +
         'đúng nó chứ không phải khác biệt về tốc độ?',
      rows: 5,
      hint: 'Tốc độ chỉ làm bạn chờ lâu hơn. Hãy tìm khác biệt khiến có những thứ WSL2 KHÔNG BAO GIỜ làm được.',
      crit: [
        'Nêu đúng khác biệt quan trọng nhất: mức độ kiểm soát — trong QEMU bạn sở hữu toàn bộ máy khách, từ bootloader tới kernel tới thiết bị',
        'Nêu được WSL2 không cho bạn quyền đó: kernel do Microsoft cung cấp, không có bootloader, không đổi được kiến trúc',
        'Giải thích vì sao tốc độ KHÔNG phải khác biệt quan trọng nhất: chậm chỉ tốn thời gian, còn thiếu quyền kiểm soát thì chặn hẳn cả mảng kiến thức',
        'Chỉ ra sự phân công đúng: WSL2 để viết mã và biên dịch, QEMU để chạy và gỡ lỗi hệ thống đích'
      ],
      sol: '<p>Khác biệt quan trọng nhất là <b>bạn kiểm soát được bao nhiêu phần của máy khách</b>.</p>' +
           '<p>Trong <code>qemu-system-aarch64</code>, bạn sở hữu <i>trọn bộ</i>: chọn kiến trúc CPU, ' +
           'chọn loại máy, chọn thiết bị, nạp bootloader của riêng bạn, nạp kernel do chính bạn biên ' +
           'dịch, truyền tham số dòng lệnh cho nó, dừng máy ngay từ lệnh đầu tiên để soi thanh ghi. Máy ' +
           'khách đó là một thiết bị nhúng thu nhỏ mà bạn cầm đằng chuôi.</p>' +
           '<p>Trong WSL2, bạn không có phần nào trong số đó: kiến trúc luôn là x86-64, kernel do ' +
           'Microsoft biên dịch và bạn không thay được, không có bootloader nào để nhìn, ' +
           '<code>/boot</code> rỗng, và <code>/lib/modules/$(uname -r)/build</code> cũng không có nên ' +
           'không build được module.</p>' +
           '<p>Vì sao không phải tốc độ? Vì <b>chậm chỉ làm bạn chờ lâu hơn</b> — bạn vẫn học được. ' +
           'Còn thiếu quyền kiểm soát thì <b>chặn hẳn</b>: bootloader, cấu hình kernel, Device Tree, ' +
           'driver — bốn chặng của khoá học — không có cách nào tiếp cận trên WSL2, chờ bao lâu cũng ' +
           'vô ích. Cho nên sự phân công là: <b>WSL2 để viết mã và biên dịch</b> (nhanh, tiện, dùng cả ' +
           'ngày), <b>QEMU để chạy và gỡ lỗi hệ thống đích</b> (chậm, nhưng là nơi duy nhất có thứ cần ' +
           'nhìn).</p>' },

    { id: 'b4', k: 'free', tag: 'Bắt lỗi phát biểu', truc: 1,
      q: 'Một người mới viết trong ghi chú của họ: <i>"<code>qemu-aarch64</code> tạo ra một môi trường ' +
         'ARM64 hoàn chỉnh và tách biệt với máy chủ, nên chương trình chạy trong đó thấy hệ thống file ' +
         'ARM64 riêng của nó."</i> Đoạn ghi chú này sai ở chỗ nào? Dùng kết quả thật dưới đây làm bằng ' +
         'chứng và giải thích thông báo lỗi đó xuất hiện vì lý do gì.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-gcc hello.c -o hello-arm64-dyn\n' +
          'file hello-arm64-dyn\n' +
          'qemu-aarch64 ./hello-arm64-dyn' },
        { t: 'code', where: 'out', nocopy: true, code:
          'hello-arm64-dyn: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), dynamically\n' +
          'linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=ff209e0aab..., for GNU/Linux\n' +
          '3.7.0, not stripped\n' +
          'qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or directory' },
        { t: 'code', where: 'out', nocopy: true, code: 'rc=255' }
      ],
      hint: 'Nếu qemu-aarch64 có hệ thống file ARM64 riêng thì file /lib/ld-linux-aarch64.so.1 phải nằm ở đó. Nó đi tìm file ấy ở đâu?',
      crit: [
        'Chỉ ra chỗ sai: qemu-aarch64 KHÔNG có hệ thống file riêng, nó dùng hệ thống file của máy chủ',
        'Dùng đúng bằng chứng: nó đi tìm /lib/ld-linux-aarch64.so.1 trên máy x86-64 nên không thấy',
        'Nói đúng phạm vi của qemu-aarch64: chỉ giả lập CPU cho MỘT tiến trình, không có kernel khách',
        'Nêu ai xử lý lời gọi hệ thống: kernel của máy chủ',
        'Nêu cách chữa: biên dịch với -static (hoặc trỏ tới thư mục thư viện ARM64 bằng -L)'
      ],
      sol: '<p>Chỗ sai nằm ở chữ "tách biệt". <code>qemu-aarch64</code> thuộc họ <b>user-mode</b>: nó ' +
           'giả lập <b>một CPU ARM64 cho một tiến trình</b>, và chỉ có thế. Nó không có kernel khách, ' +
           'không có hệ thống file khách, không có thiết bị. Lời gọi hệ thống của chương trình được nó ' +
           'dịch sang lời gọi tương ứng rồi chuyển cho <b>kernel Linux của máy chủ</b> xử lý — và ' +
           'đường dẫn file mà chương trình mở là đường dẫn trên <b>máy bạn</b>.</p>' +
           '<p>Thông báo lỗi là bằng chứng trực tiếp. File được biên dịch động, nên ' +
           '<code>file</code> cho biết nó cần bộ nạp <code>/lib/ld-linux-aarch64.so.1</code>. Khi chạy, ' +
           '<code>qemu-aarch64</code> đi tìm đúng đường dẫn đó — <b>trên hệ thống file x86-64 của bạn</b> ' +
           '— nơi không có bộ nạp ARM64 nào. Nếu ghi chú kia đúng, tức nó thật sự có hệ thống file ARM64 ' +
           'riêng, thì file đó phải nằm sẵn ở đó và lỗi này không bao giờ xảy ra.</p>' +
           '<p>Cách chữa nhanh nhất là <code>-static</code>, nhúng thư viện vào bên trong nên không phải ' +
           'tìm gì bên ngoài. Muốn một môi trường ARM64 thật sự tách biệt — có hệ thống file riêng, ' +
           'kernel riêng — thì phải dùng <code>qemu-system-aarch64</code>, và đó chính là Chặng 05.</p>' },

    { id: 'b5', k: 'multi', tag: 'Đọc output', truc: 2,
      q: 'Đọc hai kết quả thật dưới đây. Kết quả thứ nhất là dòng <code>mount</code> mô tả ' +
         '<code>/mnt/c</code>; kết quả thứ hai là một phiên làm việc trong đó <code>chmod</code> được ' +
         'chạy hai lần, một lần trong <code>/mnt/c</code> và một lần trong thư mục nhà. <b>Chọn tất ' +
         'cả</b> các kết luận đúng.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'mount | grep -m1 "on /mnt/c"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'C:\\ on /mnt/c type 9p (rw,noatime,aname=drvfs;path=C:\\;uid=1000;gid=1000;' +
          'symlinkroot=/mnt/,cache=0x5,access=client,msize=65536,trans=fd,rfd=6,wfd=6)' },
        { t: 'code', where: 'wsl', name: 'Trong /mnt/c', code:
          'ls -l key.txt\n' +
          'chmod 600 key.txt\n' +
          'echo "rc=$?"\n' +
          'ls -l key.txt' },
        { t: 'code', where: 'out', nocopy: true, code:
          '-rwxrwxrwx 1 shinarus shinarus 7 Aug 11 08:26 key.txt\n' +
          'rc=0\n' +
          '-rwxrwxrwx 1 shinarus shinarus 7 Aug 11 08:26 key.txt' },
        { t: 'code', where: 'wsl', name: 'Trong ~ (thư mục nhà)', code:
          'ls -l key.txt\n' +
          'chmod 600 key.txt\n' +
          'echo "rc=$?"\n' +
          'ls -l key.txt' },
        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 7 Aug 11 08:26 key.txt\n' +
          'rc=0\n' +
          '-rw------- 1 shinarus shinarus 7 Aug 11 08:26 key.txt' }
      ],
      opts: [
        '<code>/mnt/c</code> được gắn qua <b>9p</b>, một giao thức vốn thiết kế cho hệ thống file ' +
          'chạy qua mạng — nên mỗi thao tác file phải đi trọn một vòng trao đổi thay vì đọc thẳng từ đĩa.',
        'Trong <code>/mnt/c</code>, <code>chmod</code> <b>không đổi được gì</b>: quyền vẫn là ' +
          '<code>-rwxrwxrwx</code> trước và sau.',
        '<code>chmod</code> ở <code>/mnt/c</code> <b>trả về 0</b>, tức nó tự báo là thành công — thất ' +
          'bại này hoàn toàn im lặng.',
        'Trong thư mục nhà, mọi thứ hoạt động đúng: quyền đổi từ <code>-rw-r--r--</code> sang ' +
          '<code>-rw-------</code>.',
        '<code>chmod</code> thất bại ở <code>/mnt/c</code> vì người dùng <code>shinarus</code> không ' +
          'phải chủ sở hữu file.',
        'Có thể sửa được bằng cách chạy lại lệnh với <code>sudo</code>.'
      ],
      a: [0, 1, 2, 3],
      why: 'Bốn kết luận đầu đọc thẳng từ kết quả; hai cái cuối là suy diễn sai và cả hai đều sẽ làm bạn ' +
           'mất thời gian.<br><br>' +
           'Dòng <code>mount</code> ghi rõ <code>type 9p</code>. 9P là giao thức <i>mạng</i>: dù hai đầu ' +
           'nằm trên cùng một máy, mỗi thao tác vẫn phải gửi yêu cầu và chờ trả lời. Nhân con số đó với ' +
           'hàng chục nghìn file của một bản build là ra lý do vì sao khoá học cấm để mã nguồn ở đó.<br><br>' +
           'Phần <code>chmod</code> còn nguy hiểm hơn, vì nó <b>im lặng và sai</b>. NTFS không có khái ' +
           'niệm bit quyền kiểu Unix, nên WSL2 gắn ổ này với quyền cố định ' +
           '<code>-rwxrwxrwx</code> cho mọi file. <code>chmod</code> chạy, không báo lỗi gì, ' +
           '<b>trả về 0</b>, và không đổi được gì cả. So sánh với phiên trong thư mục nhà — cùng lệnh ' +
           'đó, quyền đổi đúng — thì thấy vấn đề nằm ở <i>chỗ đặt file</i>, không nằm ở lệnh.<br><br>' +
           'Phương án E sai: <code>ls -l</code> ghi chủ sở hữu là <code>shinarus</code>, đúng người đang ' +
           'chạy lệnh. Phương án F sai và là cái bẫy tốn thời gian nhất: <code>sudo</code> không giúp ' +
           'được gì, vì đây không phải vấn đề quyền hạn mà là <b>hệ thống file bên dưới không lưu nổi ' +
           'thông tin đó</b>. Cách duy nhất là để file ở hệ thống file Linux.' },

    { id: 'b6', k: 'free', tag: 'Đọc output',
      q: 'Hai lệnh dưới đây chạy trên cùng một máy, cách nhau vài giây, và cùng dùng ' +
         '<code>qemu-aarch64</code>. Một lệnh chạy được, một lệnh không. Giải thích chính xác ' +
         '<code>qemu-aarch64</code> đã kiểm tra cái gì để từ chối, và vì sao thông báo lỗi ở đây khác ' +
         'hẳn thông báo <code>Exec format error</code> mà bạn gặp ở phần thực hành của Bài 3.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'qemu-aarch64 ./hello-x86\n' +
          'qemu-aarch64 ./hello-arm64' },
        { t: 'code', where: 'out', nocopy: true, code:
          'qemu-aarch64: ./hello-x86: Invalid ELF image for this architecture\n' +
          'Hello from ARM64!' }
      ],
      hint: 'Cả hai file đều là ELF hợp lệ. Thứ phân biệt chúng nằm ở một trường trong phần đầu ELF — readelf -h in ra trường đó.',
      crit: [
        'Nêu đúng: qemu-aarch64 đọc phần đầu (header) ELF và kiểm tra trường kiến trúc — readelf -h gọi là Machine',
        'Nói được file x86 vẫn là ELF hợp lệ, chỉ sai kiến trúc so với CPU mà qemu-aarch64 giả lập',
        'Phân biệt được AI báo lỗi: lần này là QEMU báo, còn Exec format error là do kernel báo',
        'Nêu được cả hai lỗi cùng một nguyên nhân gốc: mã máy không khớp với CPU sẽ chạy nó'
      ],
      sol: '<p><code>qemu-aarch64</code> giả lập một CPU ARM64, nên trước khi chạy bất cứ thứ gì nó mở ' +
           'file, đọc <b>phần đầu ELF</b> và xem trường kiến trúc — trường mà ' +
           '<code>readelf -h</code> in ra dưới tên <code>Machine</code>. Với ' +
           '<code>hello-arm64</code>, trường đó ghi <code>AArch64</code>, khớp, chạy được, in ra ' +
           '<code>Hello from ARM64!</code>. Với <code>hello-x86</code>, trường đó ghi ' +
           '<code>Advanced Micro Devices X86-64</code>, không khớp, và QEMU từ chối với ' +
           '<code>Invalid ELF image for this architecture</code>.</p>' +
           '<p>Điểm mấu chốt: <b>file x86 không hề hỏng</b>. Nó là một file ELF hoàn toàn hợp lệ và ' +
           'chạy được ngay trên máy bạn — chỉ là bạn đưa nó cho nhầm CPU.</p>' +
           '<p>Khác biệt với <code>Exec format error</code> nằm ở <b>ai báo lỗi</b>. Ở Bài 3, khi bạn ' +
           'chạy thẳng file ARM64 trên WSL2, chính <b>kernel</b> đọc phần đầu ELF, thấy kiến trúc lạ và ' +
           'từ chối — thông báo đó là của hệ điều hành. Lần này, người đọc phần đầu ELF là <b>QEMU</b>, ' +
           'nên thông báo là của QEMU và nói rõ hơn nhiều. Nguyên nhân gốc thì y hệt: <b>mã máy không ' +
           'khớp với CPU sẽ chạy nó</b>.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN C — VẬN DỤNG (5 câu)
     2 chẩn đoán · 2 tình huống mới · 1 chọn và biện minh
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Nhóm bạn dựng một hệ thống chạy kiểm thử tự động: mỗi lần có mã mới, một máy chủ x86-64 sẽ ' +
         'khởi động một máy ảo ARM64 bằng <code>qemu-system-aarch64</code> rồi chạy bộ kiểm thử bên ' +
         'trong. Nó hoạt động đúng, nhưng chậm — mỗi lượt mất khoảng 40 phút. Một đồng nghiệp đề xuất: ' +
         '<i>"Máy chủ có <code>/dev/kvm</code> mà chưa được cấp cho tiến trình QEMU. Cấp quyền rồi thêm ' +
         '<code>-accel kvm</code> là nhanh lên nhiều lần."</i> Bạn được giao đánh giá đề xuất này. Hãy ' +
         'nói nó có hiệu quả không, vì sao, và đề xuất hai hướng khác thực sự rút ngắn được thời gian.',
      rows: 6,
      hint: 'Trước khi bàn tới quyền truy cập, hỏi: KVM có áp dụng được cho tổ hợp máy chủ / máy khách này không?',
      crit: [
        'Kết luận dứt khoát: đề xuất KHÔNG có hiệu quả, và nói rõ vì sao — máy chủ x86-64 chạy máy khách ARM64 là khác kiến trúc',
        'Nêu đúng cơ chế: KVM cho CPU thật chạy thẳng lệnh máy khách, nên bắt buộc cùng kiến trúc',
        'Dự đoán đúng hậu quả nếu cứ thêm -accel kvm: QEMU báo lỗi và không khởi động, chứ không im lặng chạy chậm',
        'Nêu được cách kiểm chứng trong 5 giây: qemu-system-aarch64 -accel help chỉ liệt kê tcg',
        'Đề xuất ít nhất hai hướng thật: chạy trên máy chủ ARM64 thật (khi đó KVM mới có tác dụng), hoặc dùng qemu-user cho phần kiểm thử không cần kernel; các hướng khác hợp lệ: giảm phạm vi kiểm thử chạy trong máy ảo, tăng -smp, chạy song song nhiều lượt'
      ],
      sol: '<p><b>Đề xuất không có hiệu quả</b>, và vấn đề không nằm ở quyền truy cập.</p>' +
           '<p>KVM tăng tốc bằng cách cho <b>CPU thật chạy thẳng lệnh của máy khách</b>. Máy chủ là ' +
           'x86-64, máy khách là ARM64 — CPU của máy chủ không hiểu một lệnh ARM64 nào, nên không có gì ' +
           'để chạy thẳng. Cấp quyền cho <code>/dev/kvm</code> không đổi được điều đó; sự tồn tại của ' +
           '<code>/dev/kvm</code> chỉ nói rằng máy chủ ảo hoá được <b>máy khách x86-64</b>.</p>' +
           '<p>Thêm <code>-accel kvm</code> vào sẽ khiến QEMU <b>báo lỗi và không khởi động</b>, tức ' +
           'bạn đánh đổi 40 phút lấy 0 phút và một hệ thống kiểm thử hỏng. Kiểm chứng mất năm giây: ' +
           '<code>qemu-system-aarch64 -accel help</code> chỉ liệt kê <code>tcg</code>.</p>' +
           '<p>Hai hướng thật sự rút ngắn được thời gian:</p>' +
           '<ul>' +
           '<li><b>Đổi máy chủ sang ARM64.</b> Trên một máy chủ ARM64, máy khách ARM64 là cùng kiến ' +
           'trúc, KVM áp dụng được, và mức tăng tốc là rất lớn. Đây là lý do các dịch vụ đám mây ARM64 ' +
           'tồn tại.</li>' +
           '<li><b>Đừng chạy cả một cái máy khi không cần.</b> Phần kiểm thử nào chỉ chạy chương trình ' +
           'người dùng, không đụng tới kernel hay thiết bị, thì chạy dưới <code>qemu-aarch64</code> ' +
           'nhanh hơn hẳn, vì không phải khởi động kernel và không phải giả lập thiết bị nào. Chỉ giữ ' +
           'lại máy ảo đầy đủ cho những phép thử thật sự cần nó.</li>' +
           '</ul>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 2,
      q: 'Một đồng nghiệp báo lỗi sau. Họ có một script triển khai đặt trong <code>/mnt/c/du-an/</code>, ' +
         'trong đó có bước siết quyền một file chứa khoá bí mật:' +
         '<br><br><code>chmod 600 secret.key</code><br><br>' +
         'Script chạy trót lọt, <b>không có thông báo lỗi nào</b>, và <code>echo $?</code> ngay sau đó ' +
         'in ra <code>0</code>. Nhưng bước kiểm tra cuối script — chạy <code>ls -l</code> rồi đối chiếu ' +
         'quyền — luôn thất bại: quyền hiện ra vẫn là <code>-rwxrwxrwx</code>. Họ đã thử chạy lại bằng ' +
         '<code>sudo</code>, thử đăng xuất đăng nhập lại, thử cả <code>chmod 0600</code>. Không gì thay ' +
         'đổi. Hãy chẩn đoán, và đưa cách sửa.',
      rows: 6,
      hint: 'Đường dẫn bắt đầu bằng /mnt/c. Hệ thống file nằm dưới đó là gì, và nó có lưu được bit quyền kiểu Unix không?',
      crit: [
        'Chẩn đoán đúng nguyên nhân: file nằm trên /mnt/c, tức NTFS của Windows gắn qua 9P, không lưu được bit quyền kiểu Unix',
        'Giải thích vì sao mã trả về là 0: WSL2 chấp nhận lệnh và không báo lỗi, nhưng không có chỗ nào để ghi thông tin đó — thất bại im lặng',
        'Nói rõ vì sao sudo vô ích: đây không phải vấn đề quyền hạn của người dùng mà là giới hạn của hệ thống file bên dưới',
        'Đưa cách sửa đúng: chuyển file (và cả dự án) sang hệ thống file Linux, ví dụ ~/du-an',
        'Nêu cách kiểm chứng: mount | grep /mnt/c cho thấy type 9p, và làm lại đúng phép thử đó trong ~ thì chmod đổi quyền bình thường'
      ],
      sol: '<p>Nguyên nhân nằm ở <b>chỗ đặt file</b>, không nằm ở lệnh, không nằm ở quyền hạn.</p>' +
           '<p><code>/mnt/c</code> là ổ C của Windows, gắn vào Linux qua giao thức 9P ' +
           '(<code>mount | grep /mnt/c</code> ghi rõ <code>type 9p</code>). Hệ thống file bên dưới là ' +
           'NTFS, và NTFS <b>không có khái niệm bit quyền kiểu Unix</b>. WSL2 vì thế trình bày mọi file ' +
           'ở đó với một bộ quyền cố định <code>-rwxrwxrwx</code>. Lệnh <code>chmod</code> được nhận, ' +
           'không có gì để báo lỗi, nên trả về <b>0</b> — và không ghi được gì cả.</p>' +
           '<p>Đây là dạng lỗi tệ nhất trong nghề: <b>im lặng và sai</b>. Nếu <code>chmod</code> báo ' +
           'lỗi, đồng nghiệp của bạn đã tìm ra trong hai phút. Vì nó báo thành công, họ đi ngờ vực ' +
           'người dùng, ngờ vực <code>sudo</code>, ngờ vực cú pháp — ba hướng đều sai. ' +
           '<code>sudo</code> không giúp được, vì vấn đề không phải bạn có đủ quyền hay không mà là ' +
           '<b>chỗ lưu không lưu nổi thông tin đó</b>.</p>' +
           '<p><b>Cách sửa:</b> chuyển cả dự án sang hệ thống file Linux, ví dụ <code>~/du-an/</code>. ' +
           'Làm lại đúng phép thử ở đó, quyền sẽ đổi từ <code>-rw-r--r--</code> sang ' +
           '<code>-rw-------</code> như mong đợi. Đây cũng chính là quy tắc của khoá học: mã nguồn và ' +
           'thư mục build luôn nằm trong <code>~</code>, không bao giờ nằm trong <code>/mnt/c</code> — ' +
           'và bạn vừa thấy lý do thứ hai của quy tắc đó, bên cạnh lý do tốc độ.</p>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1,
      q: 'Bạn nhận bốn việc dưới đây, tất cả đều liên quan tới ARM64. Với mỗi việc, hãy chọn ' +
         '<code>qemu-aarch64</code> hay <code>qemu-system-aarch64</code>, và <b>nêu lý do bằng một câu ' +
         'chỉ ra thứ mà lựa chọn kia không cung cấp được</b>.' +
         '<ul>' +
         '<li><b>(1)</b> Chạy nhanh một chương trình tính toán viết bằng C, biên dịch cho ARM64, để so ' +
         'sánh kết quả với bản x86-64.</li>' +
         '<li><b>(2)</b> Thử một driver mới viết, nó cần đọc ghi thanh ghi của một thiết bị.</li>' +
         '<li><b>(3)</b> Kiểm tra xem một thư viện có bị lỗi khi chạy trên kiến trúc big-endian / khác ' +
         'độ rộng con trỏ hay không.</li>' +
         '<li><b>(4)</b> Kiểm chứng rằng tham số <code>bootargs</code> bạn vừa sửa có thật sự tới được ' +
         'kernel không.</li>' +
         '</ul>',
      rows: 7,
      hint: 'Với mỗi việc, hỏi: việc này có cần một KERNEL riêng hoặc một THIẾT BỊ không? Nếu không, họ user-mode là đủ và nhanh hơn nhiều.',
      crit: [
        '(1) chọn qemu-aarch64 — chỉ là chương trình người dùng, không cần kernel hay thiết bị, khởi động tức thì',
        '(2) chọn qemu-system-aarch64 — driver chạy trong kernel và cần thiết bị, mà qemu-aarch64 không có kernel khách lẫn thiết bị',
        '(3) chọn qemu-aarch64 — vẫn là chương trình người dùng, chạy cả một cái máy chỉ để thử thư viện là lãng phí',
        '(4) chọn qemu-system-aarch64 — bootargs là thứ bootloader truyền cho kernel, mà qemu-aarch64 không có giai đoạn khởi động nào',
        'Tiêu chí phân loại được nêu rõ ràng: cần kernel/thiết bị/luồng khởi động → system-mode; chỉ cần chạy mã người dùng → user-mode'
      ],
      sol: '<p>Có đúng một câu hỏi để phân loại cả bốn việc: <b>việc này có cần một kernel riêng, một ' +
           'thiết bị, hay một luồng khởi động không?</b> Có thì <code>qemu-system-aarch64</code>; ' +
           'không thì <code>qemu-aarch64</code>, và nên chọn nó vì nhanh hơn hẳn.</p>' +
           '<ul>' +
           '<li><b>(1) <code>qemu-aarch64</code>.</b> Một chương trình tính toán chỉ dùng CPU và vài ' +
           'lời gọi hệ thống, mà lời gọi hệ thống thì kernel máy chủ xử lý hộ. Chạy cả một cái máy chỉ ' +
           'để làm việc này là trả giá khởi động kernel mà không nhận lại gì.</li>' +
           '<li><b>(2) <code>qemu-system-aarch64</code>.</b> Driver là mã chạy <i>bên trong kernel</i> ' +
           'và nó cần thiết bị để đọc ghi thanh ghi. <code>qemu-aarch64</code> không có kernel khách và ' +
           'cũng không giả lập thiết bị nào, nên không có chỗ nào để nạp driver vào cả.</li>' +
           '<li><b>(3) <code>qemu-aarch64</code>.</b> Vẫn là mã người dùng. Điểm cần thử là hành vi của ' +
           'mã trên kiến trúc khác, và một CPU giả lập là đủ.</li>' +
           '<li><b>(4) <code>qemu-system-aarch64</code>.</b> <code>bootargs</code> là chuỗi mà ' +
           'bootloader truyền cho kernel lúc bàn giao — đúng thứ bạn học ở Bài 2. ' +
           '<code>qemu-aarch64</code> không có bootloader, không có kernel, không có giai đoạn khởi ' +
           'động nào, nên khái niệm <code>bootargs</code> không tồn tại ở đó.</li>' +
           '</ul>' +
           '<p>Ghi nhớ theo nguyên tắc chung: <b>dùng công cụ nhỏ nhất đủ việc.</b> Trong sáu tháng ' +
           'tới bạn sẽ dùng <code>qemu-aarch64</code> hàng chục lần mỗi ngày để thử nhanh một chương ' +
           'trình, và chỉ khởi động máy ảo đầy đủ khi thật sự cần nhìn vào kernel.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Bạn tải về một ảnh hệ điều hành chính thức cho Raspberry Pi (file <code>.img</code> dành để ' +
         'ghi ra thẻ nhớ) và muốn chạy thử nó trên máy tính của mình <b>mà không có board thật</b>. ' +
         'Dựa trên những gì Bài 3 dạy, hãy nêu: (a) công cụ nào có thể làm được việc này và công cụ nào ' +
         'chắc chắn không; (b) hai thứ mà QEMU cần được cung cấp thêm ngoài chính file <code>.img</code>; ' +
         '(c) vì sao trải nghiệm sẽ chậm hơn hẳn so với chạy trên board thật.',
      rows: 7,
      hint: 'Ảnh này chứa một hệ điều hành đầy đủ, khởi động từ đầu. Cái gì phải chạy trước khi kernel chạy?',
      crit: [
        '(a) Nêu đúng: phải dùng qemu-system (họ system-mode); WSL2 không làm được vì sai kiến trúc và không có bootloader; qemu-aarch64 cũng không vì nó chỉ chạy một chương trình, không khởi động cả hệ điều hành',
        '(b) Nêu được hai thứ hợp lý: một loại máy (-M) khớp với board, và một kernel (hoặc bootloader) để nạp — vì file .img không tự khởi động khi thiếu phần cứng tương ứng',
        '(c) Giải thích đúng nguyên nhân chậm: máy chủ x86-64 chạy máy khách ARM nên không dùng được ảo hoá, mọi lệnh phải qua TCG dịch từng khối lệnh',
        'Không nhầm lẫn giữa "chạy được chương trình ARM" và "khởi động được cả một hệ điều hành ARM"'
      ],
      sol: '<p><b>(a)</b> Việc này thuộc về <b><code>qemu-system-aarch64</code></b> (hoặc ' +
           '<code>qemu-system-arm</code> nếu ảnh dành cho Pi 32-bit). Hai công cụ kia chắc chắn không: ' +
           'WSL2 sai kiến trúc và không có bootloader, còn <code>qemu-aarch64</code> chỉ chạy được ' +
           '<i>một chương trình</i> — nó không có kernel khách, nên không có gì để khởi động một hệ ' +
           'điều hành cả. Đây là ranh giới hay bị lẫn nhất: "chạy được một chương trình ARM" và "khởi ' +
           'động được cả một hệ điều hành ARM" là hai việc khác hẳn nhau.</p>' +
           '<p><b>(b)</b> Ngoài file ảnh, QEMU cần ít nhất:</p>' +
           '<ul>' +
           '<li><b>Một loại máy</b> (<code>-M</code>) mô tả phần cứng: ảnh của Raspberry Pi trông đợi ' +
           'các thiết bị của Raspberry Pi ở đúng địa chỉ của chúng. Đưa nhầm loại máy thì kernel bên ' +
           'trong ảnh sẽ không tìm thấy thiết bị nào nó cần.</li>' +
           '<li><b>Một kernel để nạp</b> (<code>-kernel</code>), vì QEMU không chạy mã ROM của chip ' +
           'Broadcom — giai đoạn 0 và 1 của Bài 2 đơn giản là không có ở đây, nên bạn phải nhảy vào từ ' +
           'giai đoạn kernel. Ảnh <code>.img</code> khi đó được gắn làm ổ đĩa chứa rootfs.</li>' +
           '</ul>' +
           '<p><b>(c)</b> Chậm vì máy chủ x86-64 chạy máy khách ARM: khác kiến trúc nên <b>ảo hoá ' +
           'không dùng được</b>, mọi lệnh phải đi qua bộ dịch TCG, dịch từng khối lệnh sang lệnh x86 ' +
           'rồi mới chạy. Board thật chạy lệnh ARM trực tiếp trên CPU ARM, không mất bước nào.</p>' +
           '<p>Chặng 05 sẽ làm chính xác việc này, và Chặng 08 sẽ giải thích vì sao "loại máy" lại ' +
           'quan trọng đến thế — câu trả lời tên là <b>Device Tree</b>.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Bạn được cấp ngân sách và phải chọn <b>một</b> trong hai phương án để học tiếp sáu tháng còn ' +
         'lại của khoá học:' +
         '<ul>' +
         '<li><b>A.</b> Mua một board ARM64 thật (kèm cáp USB-serial, thẻ nhớ, nguồn) và học trên nó.</li>' +
         '<li><b>B.</b> Không mua gì, tiếp tục dùng WSL2 + QEMU như hiện tại.</li>' +
         '</ul>' +
         'Hãy chọn một phương án và <b>biện minh</b>. Phần được chấm là lập luận, không phải lựa chọn: ' +
         'nêu ít nhất hai điểm mạnh thật của phương án bạn chọn, ít nhất một điểm mà phương án kia làm ' +
         'tốt hơn, và một trường hợp cụ thể mà lựa chọn của bạn <b>sẽ không đủ</b>.',
      rows: 8,
      hint: 'Đừng tìm phương án "đúng". Hãy tìm ranh giới: cái gì QEMU dựng lại được, và cái gì chỉ có phần cứng thật mới có?',
      crit: [
        'Nêu ít nhất hai điểm mạnh thật của phương án đã chọn (QEMU: không tốn tiền, không sợ hỏng, dựng lại từ đầu trong vài giây, thay đổi cấu hình phần cứng bằng một tham số dòng lệnh, gỡ lỗi bằng -s -S; board thật: tốc độ thật, thiết bị thật, timing thật)',
        'Thừa nhận ít nhất một điểm mà phương án kia làm tốt hơn — câu trả lời chỉ khen một phía là chưa đạt',
        'Nêu được một trường hợp cụ thể mà lựa chọn của mình KHÔNG đủ (ví dụ chọn QEMU: đo hiệu năng thật, lỗi phụ thuộc thời gian, thiết bị mà máy virt không có như I2C/SPI; chọn board: không dừng được CPU từ lệnh đầu tiên để soi thanh ghi, hỏng board là mất luôn)',
        'Lập luận gắn với mục tiêu học tập chứ không chỉ so sánh chung chung',
        'Kết luận nhất quán với các lý lẽ vừa nêu'
      ],
      sol: '<p>Cả hai lựa chọn đều biện minh được; bài chấm lập luận. Dưới đây là bộ lý lẽ đầy đủ để ' +
           'bạn tự đối chiếu.</p>' +
           '<p><b>Lợi thế thật của QEMU (phương án B):</b> không tốn tiền và không có gì để làm hỏng — ' +
           'ghi nhầm vào bộ nhớ flash trên board thật có thể biến nó thành cục gạch, còn ở QEMU bạn xoá ' +
           'file rồi dựng lại trong vài giây. Thay đổi phần cứng chỉ là sửa một tham số dòng lệnh: thêm ' +
           'RAM, đổi số CPU, đổi loại máy. Và quan trọng nhất với việc học: bạn <b>dừng được CPU ngay ' +
           'từ lệnh đầu tiên</b> rồi soi từng thanh ghi — trên board thật muốn làm vậy phải có bộ gỡ ' +
           'lỗi JTAG, đắt hơn nhiều lần cái board.</p>' +
           '<p><b>Lợi thế thật của board (phương án A):</b> tốc độ là tốc độ thật, nên đo hiệu năng mới ' +
           'có nghĩa. Thiết bị là thiết bị thật — chân GPIO, cảm biến I2C, đèn LED sáng lên khi bạn ghi ' +
           'đúng thanh ghi, và cảm giác đó dạy nhanh hơn mọi dòng log. Ngoài ra có cả một lớp lỗi chỉ ' +
           'xuất hiện trên phần cứng thật: nhiễu, nguồn không ổn định, lỗi phụ thuộc thời gian.</p>' +
           '<p><b>Chỗ QEMU không đủ:</b> máy <code>virt</code> mà khoá học dùng <i>không có bus I2C hay ' +
           'SPI</i>, nên một số bài về driver thiết bị phải đổi loại máy hoặc dùng thiết bị mô phỏng — ' +
           'Chặng 10 sẽ nói rõ. Mọi con số về tốc độ đo trong QEMU cũng không phản ánh board thật.</p>' +
           '<p><b>Chỗ board không đủ:</b> không dừng được CPU từ lệnh đầu tiên nếu không có JTAG, không ' +
           'thử nhanh nhiều cấu hình phần cứng khác nhau, và một lần ghi nhầm là mất cả buổi phục hồi.</p>' +
           '<p>Lựa chọn của khoá học là <b>B trước, A sau</b>: học toàn bộ khái niệm trên QEMU, nơi sai ' +
           'không mất gì; khi đã vững thì chuyển sang board thật, lúc đó bạn đã biết phải nhìn vào đâu ' +
           'khi nó không lên.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN D — ÔN XEN KẼ (3 câu)
     Hỏi lại Bài 1 và Bài 2. KHÔNG có trục — theo §13.4 bước 4,
     khái niệm đã xoáy ở bộ trước thì về sau chỉ được ôn ở phần D.
     ══════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 2.</b> Vì sao đoạn mã khởi động sớm nhất trên một thiết bị nhúng thật ' +
         '(ROM code và SPL) phải chạy trong vùng SRAM bé xíu bên trong chip, chứ không chạy thẳng ' +
         'trong DRAM vốn lớn hơn hàng nghìn lần?',
      opts: [
        'Vì SRAM nhanh hơn DRAM nên khởi động sẽ nhanh hơn.',
        'Vì DRAM <b>chưa dùng được</b> khi vừa có điện: bộ điều khiển của nó phải được phần mềm cấu hình ' +
          'trước, mà chính đoạn mã đó mới là thứ đi cấu hình.',
        'Vì DRAM bị nhà sản xuất khoá cho tới khi kernel khởi động xong.',
        'Vì SRAM là nơi duy nhất CPU đọc được mã lệnh; DRAM chỉ chứa được dữ liệu.'
      ],
      a: 1,
      why: 'Đây là vòng luẩn quẩn kinh điển của khởi động nhúng, và nó giải thích vì sao tồn tại SPL. ' +
           'DRAM không phải bộ nhớ tự dùng được: nó cần bộ điều khiển được nạp đúng thông số về thời ' +
           'gian, và phải được làm tươi định kỳ. Việc cấu hình đó do <b>phần mềm</b> làm. Nhưng phần ' +
           'mềm thì phải chạy ở đâu đó — mà DRAM chưa dùng được. Lối thoát là chạy trong SRAM có sẵn ' +
           'bên trong chip, thứ dùng được ngay khi có điện nhưng chỉ vài chục tới vài trăm KB. Chính ' +
           'giới hạn kích thước đó buộc phải tách U-Boot thành hai tầng: SPL đủ nhỏ để nằm vừa SRAM, ' +
           'và công việc duy nhất của nó là khởi tạo DRAM rồi nạp U-Boot đầy đủ vào đó. Phương án A ' +
           'nêu một sự thật (SRAM nhanh hơn) nhưng đó không phải lý do — lý do là DRAM ' +
           '<i>chưa tồn tại</i> theo nghĩa dùng được.' },

    { id: 'd2', k: 'free', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 2.</b> Một thiết bị chạy đúng khoảng 30 giây sau khi cấp nguồn rồi khởi động lại, ' +
         'lặp đi lặp lại mãi. Trên cổng serial bạn thấy đủ log của bootloader và của kernel, không có ' +
         'thông báo lỗi nào, và mỗi vòng lặp đều dừng ở đúng một chỗ giống nhau. Nêu <b>một</b> nguyên ' +
         'nhân rất có khả năng, giải thích cơ chế, và nói bạn sẽ kiểm chứng bằng cách nào.',
      rows: 6,
      hint: 'Cái gì trên thiết bị nhúng có thể chủ động khởi động lại cả hệ thống, theo một chu kỳ đều đặn, mà không coi đó là lỗi?',
      crit: [
        'Nêu đúng nghi phạm hàng đầu: bộ theo dõi phần cứng (watchdog) đã được bật nhưng không có phần mềm nào "vỗ về" nó đúng hạn',
        'Giải thích đúng cơ chế: watchdog đếm ngược, phần mềm phải nạp lại bộ đếm định kỳ; hết giờ thì nó reset cả hệ thống',
        'Giải thích được vì sao không có thông báo lỗi: reset do phần cứng gây ra, phần mềm không kịp và cũng không có cơ hội ghi gì',
        'Giải thích tính lặp đều đặn: chu kỳ trùng với thời gian hết hạn của watchdog',
        'Nêu cách kiểm chứng cụ thể: xem nguyên nhân của lần reset gần nhất, kiểm tra bootloader có bật watchdog không, tạm tắt watchdog để xem thiết bị có chạy tiếp không, hoặc kiểm tra tiến trình có nhiệm vụ vỗ về watchdog còn sống không'
      ],
      sol: '<p>Nghi phạm hàng đầu là <b>bộ theo dõi phần cứng (watchdog)</b>.</p>' +
           '<p>Cơ chế: watchdog là một bộ đếm ngược nằm trong phần cứng. Phần mềm phải nạp lại nó đều ' +
           'đặn để chứng minh mình còn sống. Nếu bộ đếm chạy về 0, watchdog kết luận hệ thống đã treo ' +
           'và <b>reset cả thiết bị</b>. Nó tồn tại chính vì thiết bị nhúng thường không có ai đứng cạnh ' +
           'để bấm nút.</p>' +
           '<p>Kịch bản khớp với mọi triệu chứng: bootloader bật watchdog (rất phổ biến), hệ thống ' +
           'khởi động lên bình thường, nhưng tiến trình đáng lẽ phải vỗ về nó lại không chạy — chưa cài ' +
           'đặt, sai tên dịch vụ, hoặc đã chết. Watchdog đếm hết giờ và reset. Vì reset do <b>phần ' +
           'cứng</b> gây ra chứ không phải do phần mềm quyết định, nên không có thông báo lỗi nào được ' +
           'ghi ra — đúng như triệu chứng "không có lỗi gì". Và vì bộ đếm luôn cùng một giá trị, chu kỳ ' +
           'lặp lại đều đặn khoảng 30 giây.</p>' +
           '<p><b>Cách kiểm chứng, theo thứ tự rẻ trước:</b> (1) đọc nguyên nhân của lần reset gần ' +
           'nhất — hầu hết chip đều có thanh ghi ghi lại việc này, và kernel thường in ra lúc khởi ' +
           'động; (2) kiểm tra cấu hình bootloader xem watchdog có được bật không và đặt bao nhiêu giây, ' +
           'đối chiếu với chu kỳ 30 giây bạn quan sát được; (3) tạm tắt watchdog rồi cấp nguồn lại — nếu ' +
           'thiết bị chạy quá 30 giây thì đã xác nhận; (4) kiểm tra xem tiến trình có nhiệm vụ vỗ về ' +
           'watchdog còn sống hay không.</p>' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 1.</b> Trong biên dịch chéo, hai từ <b>máy chủ</b> (host) và <b>máy đích</b> ' +
         '(target) chỉ những thứ khác nhau. Với lệnh ' +
         '<code>aarch64-linux-gnu-gcc -static hello.c -o hello-arm64</code> chạy trên WSL2 của bạn, ' +
         'phát biểu nào đúng?',
      opts: [
        'Máy chủ là ARM64 vì trình biên dịch tên là <code>aarch64-…</code>; máy đích là x86-64 vì đó là ' +
          'nơi lệnh được gõ.',
        'Máy chủ là <b>x86-64</b> — nơi trình biên dịch chạy; máy đích là <b>ARM64</b> — kiến trúc của ' +
          'mã máy được sinh ra.',
        'Cả máy chủ lẫn máy đích đều là x86-64; chữ <code>aarch64</code> chỉ là quy ước đặt tên.',
        'Máy chủ và máy đích là một, vì WSL2 chạy được cả hai loại mã.'
      ],
      a: 1,
      why: 'Máy chủ là nơi <b>công cụ chạy</b>; máy đích là nơi <b>sản phẩm sẽ chạy</b>. Ở đây trình ' +
           'biên dịch là một chương trình x86-64 đang chạy trong WSL2 trên CPU x86-64 — đó là máy chủ. ' +
           'Nó sinh ra mã máy AArch64, dành cho một CPU ARM64 ở nơi khác — đó là máy đích. Tiền tố ' +
           '<code>aarch64-linux-gnu-</code> mô tả <b>máy đích</b>, không mô tả máy chủ, và đây đúng là ' +
           'chỗ hay lẫn nhất. Bạn có bằng chứng sờ được cho sự khác biệt này: ' +
           '<code>uname -m</code> trả về <code>x86_64</code>, trong khi <code>file</code> chạy trên sản ' +
           'phẩm lại nói <code>ARM aarch64</code>. Chặng 04 sẽ mổ xẻ toàn bộ chuỗi ba tên gọi ' +
           '(build / host / target) và vì sao đôi khi cần tới cả ba.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN E — THỰC HÀNH (6 câu)
     2 dự đoán output · 2 gõ lệnh · 1 sửa lỗi · 1 thử thách
     Mọi lệnh và mọi kết quả dưới đây đã chạy thật trên máy người học.
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'fill', tag: 'Dự đoán output',
      q: '<b>Dự đoán trước khi chạy.</b> Lệnh dưới đây hỏi QEMU: với kiến trúc máy khách này, trên máy ' +
         'chủ này, bạn có sẵn những bộ tăng tốc nào? Nó in ra một dòng tiêu đề rồi liệt kê, mỗi bộ một ' +
         'dòng. Hãy viết ra <b>tên bộ tăng tốc duy nhất</b> sẽ được liệt kê, rồi chạy lệnh để đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'qemu-system-aarch64 -accel help' }
      ],
      a: ['tcg', 'TCG'],
      ph: 'tên bộ tăng tốc',
      why: 'Kết quả thật trên máy bạn:<br><br>' +
           '<code>Accelerators supported in QEMU binary:</code><br><code>tcg</code><br><br>' +
           'Chỉ một dòng, và đó là <b>tcg</b> — bộ dịch từng khối lệnh. <code>kvm</code> ' +
           '<b>không</b> có mặt, dù <code>/dev/kvm</code> tồn tại trên máy bạn, vì máy chủ x86-64 không ' +
           'chạy thẳng được lệnh ARM64. Đáng để nhớ lệnh này: nó trả lời trong một giây câu hỏi "máy ảo ' +
           'của tôi có được tăng tốc phần cứng không", và câu hỏi đó sẽ quay lại rất nhiều lần từ Chặng ' +
           '05 trở đi. Chạy cùng lệnh với <code>qemu-system-x86_64</code> trên máy này thì kết quả sẽ ' +
           'khác — đó là chỗ đáng thử thêm nếu bạn cài gói đó.' },

    { id: 'e2', k: 'mcq', tag: 'Dự đoán output',
      q: '<b>Dự đoán trước khi chạy.</b> Hai lệnh dưới đây biên dịch cùng một file <code>hello.c</code> ' +
         'cho ARM64 — lệnh đầu <b>có</b> <code>-static</code>, lệnh sau <b>không</b> — rồi chạy cả hai ' +
         'dưới <code>qemu-aarch64</code>. Điều gì xảy ra?',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64\n' +
          'aarch64-linux-gnu-gcc hello.c -o hello-arm64-dyn\n' +
          'qemu-aarch64 ./hello-arm64\n' +
          'qemu-aarch64 ./hello-arm64-dyn' },
        { t: 'code', where: 'wsl', name: 'Kích thước hai file, để tham khảo', code:
          'stat -c \'%s %n\' hello-arm64 hello-arm64-dyn' },
        { t: 'code', where: 'out', nocopy: true, code:
          '705328 hello-arm64\n' +
          '70448 hello-arm64-dyn' }
      ],
      opts: [
        'Cả hai đều in ra <code>Hello from ARM64!</code>; bản động chỉ chạy chậm hơn một chút.',
        'Bản tĩnh in ra <code>Hello from ARM64!</code>; bản động <b>thất bại</b> vì không tìm thấy ' +
          '<code>/lib/ld-linux-aarch64.so.1</code>.',
        'Cả hai đều thất bại, vì <code>qemu-aarch64</code> không chạy được file do trình biên dịch chéo sinh ra.',
        'Bản động chạy được còn bản tĩnh thất bại, vì file tĩnh quá lớn so với bộ nhớ mà QEMU cấp.'
      ],
      a: 1,
      why: 'Kết quả thật:<br><br>' +
           '<code>$ qemu-aarch64 ./hello-arm64</code><br><code>Hello from ARM64!</code><br>' +
           '<code>rc=0</code><br><br>' +
           '<code>$ qemu-aarch64 ./hello-arm64-dyn</code><br>' +
           '<code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or ' +
           'directory</code><br><code>rc=255</code><br><br>' +
           'Bản động cần bộ nạp thư viện của ARM64, và <code>qemu-aarch64</code> đi tìm nó ' +
           '<b>trên hệ thống file của máy bạn</b> — máy x86-64, nên không có. Đây chính là hệ quả của ' +
           'việc <code>qemu-aarch64</code> không có hệ thống file riêng (câu A3 và B4). Cái giá của ' +
           '<code>-static</code> nằm ngay trong hai con số: <b>705 328</b> so với <b>70 448</b> byte, ' +
           'gấp khoảng <b>10 lần</b>. Với thiết bị nhúng chỉ có vài MB flash thì tỉ lệ đó là vấn đề ' +
           'thật, và Chặng 04 sẽ bàn cách xử lý nó.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết ra <b>dãy lệnh</b> làm trọn vẹn việc sau, từ một thư mục trống trong <code>~</code>: ' +
         'tạo file <code>hello.c</code> in ra một dòng chữ; biên dịch nó thành file thực thi ARM64 ' +
         '<b>không phụ thuộc thư viện động</b>; chứng minh bằng công cụ rằng file sinh ra đúng là mã ' +
         'ARM64 và đúng là liên kết tĩnh; rồi chạy nó. Ghi rõ mỗi lệnh làm gì.',
      hint: 'Bốn bước: tạo file, biên dịch (nhớ cờ ở câu A7), kiểm chứng bằng file hoặc readelf -h, chạy bằng qemu-aarch64.',
      crit: [
        'Có bước tạo thư mục làm việc trong ~ chứ không phải trong /mnt/c',
        'Lệnh biên dịch dùng đúng trình biên dịch chéo aarch64-linux-gnu-gcc và có cờ -static',
        'Có bước kiểm chứng bằng file hoặc readelf -h, và nói rõ nhìn vào đâu để biết đúng kiến trúc',
        'Chạy bằng qemu-aarch64 ./<tên file>',
        'Giải thích được vì sao cần -static ở đây'
      ],
      solBlocks: [
        { t: 'p', x: 'Một dãy lệnh đạt yêu cầu, chạy thật trên máy bạn:' },
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bt03 && cd ~/bt03\n' +
          'cat > hello.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'int main(void) {\n' +
          '    printf("Hello from ARM64!\\n");\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64\n' +
          'file hello-arm64\n' +
          'qemu-aarch64 ./hello-arm64' },
        { t: 'code', where: 'out', nocopy: true, code:
          'hello-arm64: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically\n' +
          'linked, BuildID[sha1]=315514095a460afe2bd0a8595d97e516e9f05feb, for GNU/Linux 3.7.0,\n' +
          'not stripped\n' +
          'Hello from ARM64!' },
        { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64',
          title: 'Mổ xẻ lệnh biên dịch',
          rows: [
            ['<code>aarch64-linux-gnu-</code>',
             'Tiền tố mô tả <b>máy đích</b>: kiến trúc <code>aarch64</code>, hệ điều hành ' +
             '<code>linux</code>, thư viện C <code>gnu</code>. Bản thân trình biên dịch vẫn là một ' +
             'chương trình x86-64 chạy trên máy bạn.'],
            ['<code>-static</code>',
             'Nhúng toàn bộ thư viện C vào bên trong file, nên lúc chạy không phải đi tìm bộ nạp ' +
             '<code>/lib/ld-linux-aarch64.so.1</code> — file đó không tồn tại trên máy x86-64 của bạn.'],
            ['<code>-o hello-arm64</code>',
             'Tên file kết quả. Không có nó, <code>gcc</code> đặt tên mặc định là <code>a.out</code>.']
          ] },
        { t: 'p', x: 'Trong dòng kết quả của <code>file</code>, hai cụm cần nhìn là ' +
             '<code>ARM aarch64</code> (đúng kiến trúc) và <code>statically linked</code> (đúng kiểu ' +
             'liên kết). Muốn chi tiết hơn thì dùng <code>readelf -h hello-arm64</code> và đọc dòng ' +
             '<code>Machine</code>.' },
        { t: 'cal', kind: 'info', title: 'Có thể bạn chạy thẳng được, và đó không phải phép màu',
          x: 'Trên máy bạn, gõ thẳng <code>./hello-arm64</code> cũng in ra ' +
             '<code>Hello from ARM64!</code> chứ không báo <code>Exec format error</code> như ở đầu ' +
             'Bài 3. Lý do là <b>binfmt_misc</b>: khi cài <code>qemu-user</code>, hệ thống đăng ký với ' +
             'kernel rằng "gặp file ELF có kiến trúc AArch64 thì đưa cho <code>qemu-aarch64</code> chạy ' +
             'hộ". Kernel vẫn từ chối như cũ, chỉ là ngay sau đó nó gọi QEMU thay bạn. Gõ tường minh ' +
             '<code>qemu-aarch64 ./hello-arm64</code> vẫn tốt hơn khi đang học, vì nó nói rõ ai đang ' +
             'chạy cái gì.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết ra dãy lệnh <b>tự chứng minh cho chính bạn</b> hai điều về <code>/mnt/c</code> mà phần B ' +
         'đã nói: (1) nó không phải hệ thống file Linux thông thường mà đi qua giao thức 9P; (2) ' +
         '<code>chmod</code> ở đó là thao tác vô hiệu, trong khi cùng lệnh đó trong <code>~</code> thì ' +
         'hoạt động đúng. Yêu cầu: phép thử phải <b>đối chứng</b> — làm cùng một việc ở hai chỗ rồi so ' +
         'sánh, chứ không chỉ chạy ở một chỗ.',
      hint: 'Lệnh nào cho biết một thư mục được gắn theo kiểu gì? Và làm sao thấy quyền file trước với sau khi chmod?',
      crit: [
        'Dùng mount (có thể kèm grep) để cho thấy /mnt/c có type 9p',
        'Phép thử chmod có đủ ba bước: xem quyền trước, chạy chmod, xem quyền sau',
        'Có đối chứng: chạy đúng phép thử đó ở cả /mnt/c lẫn ~ rồi so sánh',
        'Có kiểm tra mã trả về của chmod (echo $?) để thấy nó báo thành công',
        'Có bước dọn dẹp file tạm sau khi thử'
      ],
      solBlocks: [
        { t: 'p', x: 'Phép thử đối chứng, chạy thật trên máy bạn:' },
        { t: 'code', where: 'wsl', name: 'Bằng chứng 1 — kiểu gắn của /mnt/c', code:
          'mount | grep -m1 "on /mnt/c"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'C:\\ on /mnt/c type 9p (rw,noatime,aname=drvfs;path=C:\\;uid=1000;gid=1000;' +
          'symlinkroot=/mnt/,cache=0x5,access=client,msize=65536,trans=fd,rfd=6,wfd=6)' },
        { t: 'code', where: 'wsl', name: 'Bằng chứng 2 — cùng phép thử ở hai chỗ', code:
          'mkdir -p /mnt/c/temp/thu && cd /mnt/c/temp/thu\n' +
          'printf \'secret\\n\' > key.txt\n' +
          'ls -l key.txt\n' +
          'chmod 600 key.txt\n' +
          'echo "rc=$?"\n' +
          'ls -l key.txt\n' +
          '\n' +
          'mkdir -p ~/thu && cd ~/thu\n' +
          'printf \'secret\\n\' > key.txt\n' +
          'ls -l key.txt\n' +
          'chmod 600 key.txt\n' +
          'echo "rc=$?"\n' +
          'ls -l key.txt' },
        { t: 'code', where: 'out', nocopy: true, code:
          '-rwxrwxrwx 1 shinarus shinarus 7 Aug 11 08:26 key.txt\n' +
          'rc=0\n' +
          '-rwxrwxrwx 1 shinarus shinarus 7 Aug 11 08:26 key.txt\n' +
          '-rw-r--r-- 1 shinarus shinarus 7 Aug 11 08:26 key.txt\n' +
          'rc=0\n' +
          '-rw------- 1 shinarus shinarus 7 Aug 11 08:26 key.txt' },
        { t: 'code', where: 'wsl', name: 'Dọn dẹp', code:
          'cd ~ && rm -rf /mnt/c/temp/thu ~/thu' },
        { t: 'cal', kind: 'why', title: 'Vì sao phải có đối chứng',
          x: 'Nếu chỉ chạy phép thử trong <code>/mnt/c</code>, bạn thấy quyền không đổi và có thể kết ' +
             'luận nhầm rằng mình gõ sai lệnh. Chạy đúng lệnh đó ở <code>~</code> và thấy nó hoạt động ' +
             'sẽ loại bỏ giả thuyết đó ngay, chỉ thẳng vào biến số duy nhất còn lại: <b>chỗ đặt file</b>. ' +
             'Đây là thói quen chẩn đoán quan trọng nhất trong nghề — thay đổi <i>một</i> biến số mỗi ' +
             'lần và giữ nguyên phần còn lại.' },
        { t: 'cal', kind: 'warn', title: 'Chú ý về mã trả về',
          x: '<code>rc=0</code> ở cả hai phía. Nghĩa là <b>bạn không thể phát hiện sự cố này bằng cách ' +
             'kiểm tra mã trả về</b> — một script cẩn thận tới mức <code>set -e</code> cũng sẽ chạy ' +
             'qua mà không hề hấn gì. Cách duy nhất để bắt được là kiểm tra <i>kết quả</i>, tức đọc lại ' +
             'quyền sau khi đặt.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Một người học viết script dưới đây để dựng và thử một chương trình ARM64. Chạy nó thì hỏng ' +
         'với thông báo kèm theo. Hãy chỉ ra <b>hai</b> vấn đề trong script (một gây ra lỗi này, một ' +
         'sẽ gây rắc rối về sau), rồi viết lại script cho đúng.',
      blocks: [
        { t: 'code', where: 'file', name: 'build.sh — bản hỏng', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'cd /mnt/c/du-an/arm64\n' +
          'aarch64-linux-gnu-gcc hello.c -o hello-arm64\n' +
          'chmod 755 hello-arm64\n' +
          'qemu-aarch64 ./hello-arm64' },
        { t: 'code', where: 'out', nocopy: true, code:
          'qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\': No such file or directory' }
      ],
      hint: 'Vấn đề thứ nhất nằm ở dòng biên dịch. Vấn đề thứ hai nằm ở dòng cd.',
      crit: [
        'Chỉ ra lỗi gây hỏng: thiếu -static, nên file liên kết động và cần bộ nạp ARM64 vốn không có trên máy x86-64',
        'Chỉ ra vấn đề thứ hai: thư mục làm việc nằm trong /mnt/c — chậm vì đi qua 9P, và chmod 755 ở đó là vô hiệu',
        'Nhận ra chmod 755 trong /mnt/c trả về 0 nên set -e không bắt được, sự cố hoàn toàn im lặng',
        'Bản sửa có -static và chuyển thư mục sang ~',
        'Nêu được cách kiểm chứng bản sửa: file hoặc readelf -h cho thấy statically linked'
      ],
      solBlocks: [
        { t: 'p', x: '<b>Vấn đề 1 — nguyên nhân trực tiếp của lỗi:</b> dòng biên dịch thiếu ' +
             '<code>-static</code>. File sinh ra là liên kết động, nên lúc chạy nó cần bộ nạp ' +
             '<code>/lib/ld-linux-aarch64.so.1</code>. Nhưng <code>qemu-aarch64</code> dùng hệ thống ' +
             'file của máy chủ x86-64, nơi không có file đó — chương trình chết trước khi chạy lệnh đầu ' +
             'tiên.' },
        { t: 'p', x: '<b>Vấn đề 2 — quả bom hẹn giờ:</b> thư mục làm việc nằm trong ' +
             '<code>/mnt/c</code>. Hai hậu quả. Về tốc độ: mọi thao tác file đi qua 9P, nên khi dự án ' +
             'lớn lên thì thời gian build tăng vọt. Về ngữ nghĩa: <code>chmod 755</code> ở đó ' +
             '<b>không làm gì cả</b> nhưng vẫn trả về 0, nên ngay cả <code>set -e</code> cũng không ' +
             'bắt được — script tưởng mình đã đặt quyền, trong khi không.' },
        { t: 'code', where: 'file', name: 'build.sh — bản sửa', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'cd ~/du-an/arm64\n' +
          'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64\n' +
          'file hello-arm64\n' +
          'qemu-aarch64 ./hello-arm64' },
        { t: 'code', where: 'out', nocopy: true, code:
          'hello-arm64: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically\n' +
          'linked, BuildID[sha1]=315514095a460afe2bd0a8595d97e516e9f05feb, for GNU/Linux 3.7.0,\n' +
          'not stripped\n' +
          'Hello from ARM64!' },
        { t: 'p', x: 'Dòng <code>chmod 755</code> được bỏ hẳn: <code>gcc</code> đã đặt quyền thực thi ' +
             'cho file kết quả rồi, nên nó vốn thừa. Thay vào đó là <code>file</code> — một bước kiểm ' +
             'chứng rẻ tiền cho biết ngay bạn có đúng thứ mình muốn không.' },
        { t: 'cal', kind: 'tip', title: 'Quy tắc rút ra',
          x: 'Trong mọi script build của khoá học này, hai điều luôn đúng: <b>thư mục làm việc nằm ' +
             'trong <code>~</code></b>, và <b>có ít nhất một bước kiểm chứng kết quả</b> chứ không chỉ ' +
             'tin vào việc lệnh không báo lỗi. Bài 13 sẽ dựng một <code>build.sh</code> hoàn chỉnh theo ' +
             'đúng hai quy tắc đó.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Cho tới giờ bạn mới chỉ <i>được nghe</i> rằng QEMU dịch từng khối lệnh của máy khách sang lệnh ' +
         'của máy chủ. Hãy tự nhìn thấy việc đó. <code>qemu-aarch64</code> có tuỳ chọn ' +
         '<code>-d in_asm</code> để in ra từng khối lệnh ARM64 mà nó nhận vào trước khi dịch. Chạy nó ' +
         'trên chương trình ARM64 tĩnh của bạn, rồi trả lời: (a) khối đầu tiên có tên là gì, và tên đó ' +
         'nói lên điều gì về thời điểm QEMU bắt đầu làm việc; (b) đếm xem có <b>khoảng</b> bao nhiêu ' +
         'khối được dịch cho một chương trình chỉ in ra một dòng chữ; (c) con số đó có ổn định giữa hai ' +
         'lần chạy không, và bạn giải thích thế nào?' +
         '<br><br>Đây là câu mở, được phép không xong. Cái đáng giá là những gì bạn quan sát được.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Gợi ý khởi đầu', code:
          'qemu-aarch64 -d in_asm ./hello-arm64 2>&1 | head -6\n' +
          'qemu-aarch64 -d in_asm ./hello-arm64 2>&1 | grep -c "^IN:"' }
      ],
      hint: 'Đừng dừng ở việc chạy một lần. Chạy hai lần rồi so sánh hai con số — chỗ thú vị nằm ở đó.',
      crit: [
        '(a) Nêu được khối đầu tiên tên là _start, và hiểu rằng QEMU bắt đầu dịch từ điểm vào của chương trình chứ không phải từ hàm main',
        '(b) Đưa ra một con số cỡ khoảng một nghìn khối cho chương trình chỉ in một dòng chữ',
        '(c) Nhận xét được rằng con số KHÔNG ổn định tuyệt đối giữa các lần chạy',
        'Đưa ra một giải thích hợp lý cho sự không ổn định (ví dụ: khởi tạo thư viện C phụ thuộc môi trường, đường đi khác nhau tuỳ điều kiện lúc chạy)',
        'Rút ra được kết luận đúng về chi phí: rất nhiều mã chạy trước dòng chữ bạn thấy, và mọi khối đó đều phải dịch'
      ],
      sol: '<p><b>(a)</b> Kết quả thật trên máy bạn, sáu dòng đầu:</p>' +
           '<p><code>----------------</code><br><code>IN: _start</code><br>' +
           '<code>0x004005c0:</code><br>' +
           '<code>OBJD-T: 5f2403d51d0080d21e0080d2e50300aae10340f9e2230091e603009100000090</code><br>' +
           '<code>OBJD-T: 00d01791030080d2040080d266010094</code></p>' +
           '<p>Khối đầu tiên là <code>_start</code>, không phải <code>main</code>. Điều đó cho thấy QEMU ' +
           'bắt đầu dịch từ <b>điểm vào thật sự của chương trình</b> — nơi thư viện C khởi tạo mọi thứ ' +
           'trước khi gọi tới <code>main</code>. Địa chỉ <code>0x004005c0</code> khớp với ' +
           '<code>Entry point address</code> mà <code>readelf -h</code> in ra.</p>' +
           '<p><b>(b)</b> Khoảng <b>một nghìn</b> khối, cho một chương trình chỉ in một dòng chữ. Nói ' +
           'cách khác, phần lớn công việc không nằm ở <code>printf</code> mà ở toàn bộ phần khởi tạo ' +
           'thư viện C tĩnh chạy trước nó.</p>' +
           '<p><b>(c)</b> <b>Không ổn định.</b> Đo hai lần trên cùng một máy, cùng một file, ra hai con ' +
           'số lệch nhau. Đó là quan sát đáng giá nhất của câu này, và nó dạy hai điều. Thứ nhất về kỹ ' +
           'thuật: số khối được dịch phụ thuộc vào <i>đường đi thực tế</i> của chương trình lúc chạy, mà ' +
           'phần khởi tạo của thư viện C lại rẽ nhánh theo môi trường — nên chỉ cần một khác biệt nhỏ ' +
           'là đường đi đổi. Thứ hai, và quan trọng hơn, về <b>phương pháp</b>: một con số đo được một ' +
           'lần chưa phải là một sự thật. Luôn đo lại lần thứ hai trước khi ghi nó vào tài liệu hay dựa ' +
           'vào nó để kết luận.</p>' +
           '<p>Chặng 05 sẽ quay lại đúng cơ chế này và đo nó tử tế: <code>-d out_asm</code> để xem mã ' +
           'x86 sinh ra, <code>-one-insn-per-tb</code> để ép mỗi khối chỉ một lệnh, và ' +
           '<code>info jit</code> để đọc thống kê chính QEMU tự ghi.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN F — BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     ══════════════════════════════════════════════ */
  diag: [
    ['A1',
     'Chưa phân biệt được WSL1 (lớp dịch lời gọi hệ thống) với WSL2 (máy ảo Hyper-V có kernel Linux thật).',
     '<a href="#/bai-03#wsl2-that-su-la-cai-gi">Đọc lại Bài 3 — “WSL2 thật sự là cái gì”</a>'],

    ['A2, B1, C1',
     'Chưa nắm trục "ảo hoá cần cùng kiến trúc": KVM cho CPU thật chạy thẳng lệnh máy khách, nên khác ' +
       'kiến trúc thì luôn phải giả lập bằng TCG.',
     '<a href="#/bai-03#gia-lap-va-ao-hoa-khac-nhau-o-dau">Đọc lại Bài 3 — “Giả lập và ảo hoá — khác nhau ở đâu”</a>'],

    ['A3, B4, C3',
     'Chưa nắm trục "hai họ QEMU": qemu-aarch64 giả lập một CPU cho một tiến trình và nhờ kernel máy ' +
       'chủ xử lý lời gọi hệ thống; qemu-system-aarch64 giả lập cả một cái máy.',
     '<a href="#/bai-03#hai-ho-qemu-qemu-user-va-qemu-system">Đọc lại Bài 3 — “Hai họ QEMU: qemu-user và qemu-system”</a>'],

    ['A4, B5, C2',
     'Chưa nắm trục "ranh giới /mnt/c": đi qua giao thức 9P nên trả giá cho từng thao tác, và không giữ ' +
       'được ngữ nghĩa quyền của Linux.',
     '<a href="#/bai-03#hai-he-thong-file-va-cai-bay-50-lan">Đọc lại Bài 3 — “Hai hệ thống file và cái bẫy 50 lần”</a>'],

    ['A5',
     'Chưa rõ kernel của WSL2 đến từ đâu và vì sao không build được module trên nó.',
     '<a href="#/bai-03#hai-khong-sua-duoc-kernel">Đọc lại Bài 3 — “Hai — không sửa được kernel”</a>'],

    ['A6, B6',
     'Chưa hiểu <code>Exec format error</code> và <code>Invalid ELF image for this architecture</code> ' +
       'nói gì: mã máy không khớp CPU, chứ file không hỏng.',
     '<a href="#/bai-03#ba-sai-kien-truc">Đọc lại Bài 3 — “Ba — sai kiến trúc”</a>'],

    ['A7, E2, E5',
     'Chưa rõ vì sao <code>-static</code> là bắt buộc khi chạy dưới <code>qemu-aarch64</code>, và cái ' +
       'giá của nó về kích thước.',
     '<a href="#/bai-03#thuc-hanh-kiem-chung-toan-bo-nhung-dieu-tren">Đọc lại Bài 3 — “Thực hành: kiểm chứng toàn bộ những điều trên”</a>'],

    ['A8, C5',
     'Chưa dựng được bản đồ tổng thể: việc gì làm trên WSL2, việc gì phải làm trong QEMU.',
     '<a href="#/bai-03#ban-do-viec-gi-lam-o-dau">Đọc lại Bài 3 — “Bản đồ: việc gì làm ở đâu”</a>'],

    ['B2',
     'Chưa nối được <code>/boot</code> rỗng với các giai đoạn khởi động bị bỏ qua trong WSL2.',
     '<a href="#/bai-03#mot-khong-co-bootloader">Đọc lại Bài 3 — “Một — không có bootloader”</a>'],

    ['B3, C4',
     'Chưa nắm được ba thứ WSL2 không làm được, nên chưa thấy vì sao QEMU là bắt buộc chứ không phải tuỳ chọn.',
     '<a href="#/bai-03#ba-thu-wsl2-khong-lam-duoc-va-vi-sao-can-qemu">Đọc lại Bài 3 — “Ba thứ WSL2 không làm được — và vì sao cần QEMU”</a>'],

    ['D1',
     'Quên vòng luẩn quẩn DRAM–SRAM và vì sao phải tách SPL ra khỏi U-Boot đầy đủ.',
     '<a href="#/bai-02#giai-doan-1-spl-bootloader-tang-mot">Đọc lại Bài 2 — “Giai đoạn 1 — SPL: bootloader tầng một”</a>'],

    ['D2',
     'Chưa quen suy luận từ triệu chứng ra giai đoạn khởi động, và chưa nhớ vai trò của bộ theo dõi phần cứng.',
     '<a href="#/bai-02#chan-doan-thiet-bi-chet-o-giai-doan-nao">Đọc lại Bài 2 — “Chẩn đoán: thiết bị chết ở giai đoạn nào”</a>'],

    ['D3',
     'Còn lẫn máy chủ với máy đích trong biên dịch chéo.',
     '<a href="#/bai-01#vi-sao-wsl2-va-qemu-la-du-de-hoc">Đọc lại Bài 1 — “Vì sao WSL2 và QEMU là đủ để học”</a>'],

    ['E1, E3, E4, E6',
     'Phần thực hành chưa trôi: gõ lệnh còn phải tra lại, hoặc chưa tự kiểm chứng được kết quả.',
     '<a href="#/bai-03#thuc-hanh-kiem-chung-toan-bo-nhung-dieu-tren">Làm lại phần thực hành của Bài 3</a>'],

    ['Bất kỳ lệnh nào báo lỗi lạ',
     'Thông báo lỗi bạn gặp có thể đã nằm sẵn trong bảng lỗi thường gặp của bài.',
     '<a href="#/bai-03#loi-thuong-gap">Xem bảng “Lỗi thường gặp” của Bài 3</a>']
  ]
});

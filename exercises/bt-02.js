/* ============================================================
   BT-02 — Bài tập cho Bài 2: "Toàn cảnh luồng khởi động"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                        | PT | GIA | NGC | Tổng |
   |-------------------------------------------------|----|-----|-----|------|
   | DRAM chưa dùng được lúc t=0 → SRAM nội → SPL     | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | Bàn giao xong là biến mất, không ai giám sát ai  | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | bootargs là kênh DUY NHẤT bootloader → kernel    | 2  |  2  |  1  |  5   |  ← TRỤC 3
   | Chẩn đoán "chết ở giai đoạn nào" từ dòng log cuối | 2  |  2  |  1  |  5   |  ← LOẠI, xem bước 4
   | init là PID 1; nó thoát là kernel panic          | 2  |  1  |  1  |  4   |
   | reset vector do phần cứng quy định, không đổi được| 1  |  1  |  2  |  4   |
   | ROM code nằm trong silicon, không cập nhật được  | 1  |  2  |  0  |  3   |
   | "Freeing unused kernel image" là mốc bàn giao    | 1  |  1  |  1  |  3   |
   | Thứ tự sáu giai đoạn                             | 1  |  1  |  0  |  2   |
   | Chọn systemd hay BusyBox init                    | 1  |  0  |  1  |  2   |

   Bước 3 — cắt: sáu ứng viên đạt ngưỡng (tổng ≥ 4 và ≥ 2 trục ≥ 1). Lấy ba
   cao nhất còn hợp lệ. "init là PID 1" và "reset vector" bị hạ xuống mức hỏi
   MỘT lần (A6/B2 và A1) — chúng quan trọng nhưng Chặng 06 và Chặng 09 sẽ còn
   dạy lại, chín câu là quá đắt.

   Bước 4 — LOẠI, và đây là ca đáng chú ý nhất của bộ này: "chẩn đoán thiết bị
   chết ở giai đoạn nào" chấm 5 điểm và là trục tự nhiên nhất của Bài 2, NHƯNG
   nó đã là TRỤC 2 của bt-01 ("Bốn mảnh chạy nối tiếp"). CLAUDE.md §13.4 bước 4
   cho phép xoáy một khái niệm ĐÚNG MỘT LẦN trong cả khoá. Vì vậy nó xuống phần
   D (câu D2) chứ không được xoáy lần thứ hai. Ràng buộc này hoá ra có lợi: ba
   trục còn lại trải đều trên ba tầng khác nhau của luồng khởi động thay vì dồn
   cả vào việc đọc log.
   Cũng loại theo §13.3 (tra được trong mười giây): tên các tham số bootargs,
   con số 4852K, các mốc thời gian trong dmesg. Chúng chỉ được xuất hiện ở mức A
   hoặc trong phần E.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (DRAM/SRAM)  A2 phát biểu → B1 bản đồ bộ nhớ virt thật → C1 board mới đổi chip DDR
     Trục 2 (bàn giao)   A3 phát biểu → B4 pstree -p 1 thật        → C3 yêu cầu "app chết thì tự khởi động lại"
     Trục 3 (bootargs)   A4 phát biểu → B5 /proc/cmdline thật       → C2 serial im lặng sau "Starting kernel"

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, kernel 6.18.33.2-microsoft-standard-WSL2,
   QEMU 10.2.1) ngày 2026-08-11. Các mốc THỜI GIAN trong dmesg và systemd-analyze
   thay đổi theo mỗi lần boot — mọi câu hỏi ở đây chỉ dựa vào những thứ ỔN ĐỊNH:
   số dòng, số tham số, kích thước vùng nhớ, giá trị thanh ghi.
   ============================================================ */
Exercise.register({
  id: 'bt-02',
  minutes: 90,

  intro:
    '<p>Bài 2 đã trải ra sáu giai đoạn từ lúc cấp điện tới lúc ứng dụng chạy. Bộ bài tập này ' +
    'không bắt bạn đọc thuộc thứ tự đó — thứ tự là phần dễ nhất. Nó nhắm vào ba chỗ mà người ' +
    'mới gần như luôn hiểu sai: vì sao mã đầu tiên <b>không thể</b> nằm trong RAM, vì sao ' +
    'U-Boot <b>biến mất</b> chứ không ở lại trông chừng kernel, và vì sao kernel không tự đoán ' +
    'được console nằm ở đâu.</p>' +
    '<p>Bạn sẽ đọc bản đồ bộ nhớ thật của máy <code>virt</code>, dòng <code>/proc/cmdline</code> ' +
    'thật của WSL2, và dừng một CPU ARM64 ngay trước lệnh đầu tiên để tự nhìn thấy giá trị ' +
    'thanh ghi PC.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Khoảng nghỉ đó không phải là sự trì hoãn — nhớ lại sau khi đã quên một phần là cách ghi ' +
    'nhớ bền hơn hẳn so với trả lời ngay lúc còn thuộc lòng.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` (phát biểu có thể sai) và `mis`
     (hiểu lầm đối lập) là tài liệu cho người viết bài tập sau, không được
     render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'dram',
      name: 'DRAM chưa dùng được lúc vừa cấp điện',
      x: 'Lúc CPU nhận lệnh đầu tiên, DRAM chưa dùng được vì controller của nó phải được PHẦN MỀM ' +
         'cấu hình trước; nên mã đầu tiên buộc phải chạy trong bộ nhớ có sẵn ngay (ROM và SRAM nội, ' +
         'chỉ vài chục KB) — và chính giới hạn vài chục KB đó đẻ ra SPL cùng kiểu boot nhiều tầng.',
      mis: 'RAM có sẵn và dùng được ngay từ lúc bật nguồn, giống như bật máy tính lên là có đủ 8 GB; ' +
           'nên chỉ cần nạp thẳng U-Boot vào RAM rồi nhảy tới đó.' },

    { id: 'bangiao',
      name: 'Bàn giao xong là biến mất',
      x: 'Mỗi giai đoạn nạp giai đoạn sau, nhảy tới nó rồi NGỪNG TỒN TẠI; không có tầng nào ở lại ' +
         'chạy nền hay giám sát tầng sau, nên khi kernel đã chạy thì U-Boot không còn trong bộ nhớ nữa.',
      mis: 'Bootloader nằm dưới kernel như một lớp nền vẫn đang chạy — giống cách người ta tưởng ' +
           'BIOS/UEFI vẫn hoạt động trong lúc Windows chạy — nên nó có thể bắt lỗi hoặc khởi động ' +
           'lại kernel khi kernel treo.' },

    { id: 'bootargs',
      name: 'bootargs là kênh duy nhất',
      x: 'Kernel không tự dò ra được console nằm ở đâu hay rootfs nằm ở phân vùng nào; toàn bộ những ' +
         'thứ đó do bootloader truyền sang bằng chuỗi bootargs, và đó là kênh liên lạc DUY NHẤT giữa ' +
         'hai bên.',
      mis: 'Kernel là hệ điều hành nên nó tự tìm được đĩa và tự chọn được cổng để in log ra, giống ' +
           'như Windows tự tìm thấy ổ cứng.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN A — NHẬN BIẾT (8 câu)
     4 trắc nghiệm · 2 đúng-sai kèm sửa · 1 điền khuyết · 1 ghép nối
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Ngay khi vừa được cấp điện và nhả tín hiệu reset, CPU lấy lệnh đầu tiên ở đâu?',
      opts: [
        'Ở địa chỉ do bootloader ghi vào một thanh ghi cấu hình trước khi tắt máy lần trước.',
        'Ở một địa chỉ <b>cố định do nhà sản xuất chip quy định sẵn trong phần cứng</b> — gọi là ' +
          'reset vector; phần mềm không đổi được giá trị này.',
        'Ở byte đầu tiên của thẻ nhớ SD, luôn luôn là như vậy với mọi dòng chip.',
        'Ở địa chỉ 0x40000000, vì đó là nơi RAM bắt đầu trên hầu hết các board ARM.'
      ],
      a: 1,
      why: 'Reset vector được <b>đúc cứng trong silicon</b>: thiết kế của chip nối sẵn chân địa chỉ ' +
           'đó vào bộ đếm chương trình lúc reset. Nó phải như vậy, vì ở thời điểm đó chưa có phần mềm ' +
           'nào từng chạy để mà cấu hình bất cứ thứ gì. Phương án A tự mâu thuẫn: lần trước máy tắt ' +
           'rồi, mọi thanh ghi đã mất nội dung. Phương án D nhầm lẫn tai hại giữa <i>nơi RAM nằm</i> ' +
           'và <i>nơi CPU bắt đầu đọc lệnh</i> — ở phần E bạn sẽ tự dừng một CPU ARM64 lại để xem ' +
           'giá trị PC lúc đó thực sự là bao nhiêu.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Vì sao SPL phải nhỏ tới mức chỉ vài chục KB, trong khi U-Boot đầy đủ được phép to hàng trăm KB?',
      opts: [
        'Vì SPL được viết bằng assembly nên không thể dài hơn.',
        'Vì SPL chạy trong <b>SRAM nội của chip</b> — vùng nhớ duy nhất dùng được ngay lúc đó, và nó ' +
          'chỉ có vài chục KB; DRAM lúc này vẫn chưa được cấu hình nên chưa dùng được.',
        'Vì bộ nhớ flash trên board thường chỉ còn trống vài chục KB sau khi chứa kernel.',
        'Vì chuẩn của ARM giới hạn kích thước ảnh khởi động ở 64 KB.'
      ],
      a: 1,
      why: 'Đây là mấu chốt của cả kiểu boot nhiều tầng. Controller DRAM là một khối phần cứng phải ' +
           'được <b>phần mềm nạp hàng chục thông số</b> (timing, refresh, độ rộng bus…) thì DRAM mới ' +
           'đọc ghi được. Nhưng phần mềm đó phải chạy ở đâu đó — và chỗ duy nhất còn lại là SRAM nội ' +
           'vài chục KB. Vậy nên mới cần một mảnh tí hon chuyên làm đúng việc "bật DRAM lên", đó là ' +
           'SPL. Sau khi DRAM sống dậy, U-Boot đầy đủ mới có chỗ để nằm và được phép to thoải mái. ' +
           'Phương án A đảo ngược nhân quả: SPL viết bằng assembly (một phần) <i>vì</i> nó phải nhỏ, ' +
           'chứ không phải nhỏ vì viết bằng assembly.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Sau khi Linux kernel đã chạy được và bạn đang gõ lệnh trong shell, U-Boot đang ở trạng thái nào?',
      opts: [
        'Vẫn chạy ở chế độ nền, sẵn sàng nhận lệnh qua cổng serial nếu bạn gõ vào.',
        'Vẫn nằm trong RAM ở chế độ ngủ, kernel sẽ đánh thức nó dậy khi cần khởi động lại máy.',
        '<b>Không còn tồn tại.</b> Nó đã nhảy sang kernel và vùng nhớ nó từng chiếm bị kernel dùng ' +
          'lại cho việc khác; muốn gặp lại U-Boot thì phải khởi động lại máy.',
        'Đã tự sao chép mình vào một tiến trình userspace tên <code>u-bootd</code>.'
      ],
      a: 2,
      why: 'Bàn giao ở đây là <b>một chiều và không quay lại</b>: giai đoạn trước nạp giai đoạn sau ' +
           'vào bộ nhớ rồi nhảy tới, và không có ai để lại một mẩu nào của mình đang chạy. Đây là ' +
           'khác biệt lớn nhất so với hình dung quen thuộc từ máy để bàn, nơi ai cũng tưởng BIOS/UEFI ' +
           '"vẫn còn đó" trong lúc Windows chạy. Hệ quả rất thực tế: <b>không có tầng nào giám sát ' +
           'tầng sau</b>. Kernel treo thì U-Boot không cứu được, vì U-Boot đã biến mất từ lâu — việc ' +
           'đó phải giao cho watchdog phần cứng, và bạn sẽ gặp lại chính xác tình huống này ở câu C3.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Kernel biết phải in thông báo khởi động ra cổng nào nhờ đâu?',
      opts: [
        'Kernel tự dò tất cả các cổng serial rồi in ra tất cả để chắc chắn.',
        'Do tham số <code>console=</code> trong chuỗi <b>bootargs</b> mà bootloader truyền sang; ' +
          'không có nó thì kernel dùng mặc định lúc biên dịch, và mặc định đó rất hay sai.',
        'Do một file cấu hình trong rootfs mà kernel đọc lúc khởi động.',
        'Do người dùng chọn trong một menu hiện ra lúc máy khởi động.'
      ],
      a: 1,
      why: 'Toàn bộ những gì bootloader nói được với kernel gói gọn trong <b>một chuỗi ký tự</b> — ' +
           'bootargs, hay còn gọi là dòng lệnh kernel. Console nằm ở đâu, rootfs nằm ở phân vùng nào, ' +
           'có bật debug không: tất cả nằm trong chuỗi đó. Phương án C sai theo một cách rất đáng nhớ: ' +
           'lúc kernel bắt đầu in log thì rootfs <b>còn chưa được gắn</b>, nên không thể có chuyện đọc ' +
           'file cấu hình. Ở câu B5 bạn sẽ đọc chuỗi bootargs thật mà Windows truyền cho kernel WSL2, ' +
           'và ở câu C2 bạn sẽ chẩn đoán một board câm lặng vì thiếu đúng tham số này.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"ROM code cũng là phần mềm, nên khi nhà sản xuất chip phát hiện lỗi trong đó, ' +
         'họ sẽ phát hành bản vá và board sẽ tự cập nhật giống như cập nhật U-Boot."</i>',
      a: 1,
      why: 'ROM code được <b>ghi cứng trong silicon ngay lúc sản xuất chip</b> và không thể ghi lại. ' +
           'Đó vừa là điểm mạnh vừa là điểm yếu: mạnh vì nó không bao giờ hỏng, không bao giờ bị xoá ' +
           'nhầm, nên board không bao giờ chết hẳn ở tầng 0; yếu vì lỗi trong ROM code là lỗi <b>vĩnh ' +
           'viễn</b> — cách duy nhất để sửa là làm lại một lô chip mới. Cũng vì thế mọi tài liệu về ' +
           'boot ROM của một dòng chip đều gắn chặt với số hiệu phiên bản silicon.',
      rw: 'Viết lại nhận định cho đúng, và nêu rõ hệ quả của việc ROM code không sửa được.',
      crit: [
        'Nói rõ ROM code nằm cứng trong silicon / không ghi lại được',
        'Nêu hệ quả: lỗi trong ROM code không vá được bằng phần mềm, phải làm lô chip mới',
        'Có phân biệt với U-Boot — U-Boot nằm trên flash nên cập nhật được'
      ],
      sol: 'ROM code được ghi cố định vào chip ngay lúc sản xuất và <b>không thể cập nhật bằng phần ' +
           'mềm</b>. Nếu nó có lỗi thì lỗi đó tồn tại vĩnh viễn trên mọi con chip của lô đó; nhà sản ' +
           'xuất chỉ có thể sửa ở lô silicon sau, và tài liệu thường ghi kèm số hiệu phiên bản chip. ' +
           'Ngược lại, U-Boot nằm trên bộ nhớ flash ghi lại được nên vá và nâng cấp bình thường — ' +
           'đổi lại, U-Boot <i>có thể</i> bị ghi hỏng và làm board không lên được, còn ROM code thì ' +
           'không bao giờ.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"init là tiến trình số 1, tức là tiến trình quan trọng nhất; nếu nó bị lỗi và ' +
         'thoát ra, kernel sẽ tự khởi động lại nó giống như cách nó khởi động lại một dịch vụ bị chết."</i>',
      a: 1,
      why: 'Kernel <b>không</b> khởi động lại init. Khi tiến trình PID 1 thoát ra vì bất cứ lý do gì, ' +
           'kernel dừng lại với thông báo <code>Kernel panic - not syncing: Attempted to kill init!</code> ' +
           '— kể cả khi init thoát với mã 0, tức là "thành công". Lý do rất thẳng: init là tổ tiên của ' +
           'toàn bộ userspace, mất nó thì không còn gì để mà chạy, và kernel một mình thì không làm ' +
           'được việc gì có ý nghĩa. Đây cũng là vì sao việc <i>khởi động lại dịch vụ bị chết</i> là ' +
           'nhiệm vụ <b>của chính init</b> (systemd làm việc đó), chứ không phải của kernel.',
      rw: 'Viết lại nhận định cho đúng, nêu rõ chuyện gì thực sự xảy ra khi PID 1 thoát.',
      crit: [
        'Nói rõ kernel KHÔNG khởi động lại init',
        'Nêu đúng hậu quả: kernel panic ("Attempted to kill init")',
        'Nhận ra rằng chính init mới là thứ khởi động lại các dịch vụ khác, không phải kernel'
      ],
      sol: 'init đúng là tiến trình PID 1 và là tổ tiên của mọi tiến trình userspace, nhưng kernel ' +
           '<b>không</b> hồi sinh nó. PID 1 thoát ra — kể cả với mã 0 — là kernel panic ngay: ' +
           '<code>Kernel panic - not syncing: Attempted to kill init!</code>. Chiều ngược lại mới ' +
           'đúng: việc theo dõi và khởi động lại một dịch vụ bị chết là nhiệm vụ của init (systemd, ' +
           'hoặc <code>respawn</code> trong BusyBox init), chứ kernel không quản việc đó.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Sau khi hệ thống đã chạy, muốn xem lại <b>đúng chuỗi bootargs</b> mà bootloader đã truyền ' +
         'cho kernel, bạn đọc file nào? (ghi đường dẫn đầy đủ)',
      a: ['/proc/cmdline', 'proc/cmdline', '/proc/cmdline/'],
      ph: 'ví dụ: /proc/…',
      why: 'Kernel giữ lại nguyên văn dòng lệnh nó nhận được và trưng ra ở <code>/proc/cmdline</code>. ' +
           'Đây là công cụ chẩn đoán đầu tiên khi một board khởi động sai: so chuỗi bạn <i>tưởng</i> ' +
           'đã đặt trong bootloader với chuỗi kernel <i>thật sự</i> nhận được. Rất nhiều giờ debug đã ' +
           'bị đốt vì hai chuỗi đó khác nhau — bootloader đọc bootargs từ môi trường đã lưu, còn ' +
           'người sửa lại sửa nhầm ở chỗ khác. Lưu ý <code>/proc</code> là hệ thống file ảo (Bài 1): ' +
           'nội dung này do kernel sinh ra tại chỗ, không nằm trên đĩa.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi giai đoạn khởi động với mô tả đúng nhiệm vụ chính của nó.',
      left: [
        'ROM code (giai đoạn 0)',
        'SPL (giai đoạn 1)',
        'U-Boot đầy đủ (giai đoạn 2)',
        'Linux kernel (giai đoạn 3)',
        'init (giai đoạn 4)',
        'Ứng dụng (giai đoạn 5)'
      ],
      right: [
        'Dựng MMU, dò thiết bị theo Device Tree, gắn rootfs rồi chạy tiến trình userspace đầu tiên.',
        'Thứ duy nhất người dùng cuối nhìn thấy; năm mảnh trước tồn tại chỉ để nó chạy được.',
        'Chạy trong SRAM nội vài chục KB; việc quan trọng nhất là cấu hình controller DRAM.',
        'Tiến trình PID 1, khởi động các dịch vụ theo đúng thứ tự phụ thuộc và trông chừng chúng.',
        'Nằm cứng trong silicon, chạy ngay tại reset vector, chỉ đủ sức nạp mảnh kế tiếp vào SRAM.',
        'Có shell và biết đọc file; nạp kernel cùng device tree vào DRAM rồi truyền bootargs sang.'
      ],
      a: [4, 2, 5, 0, 3, 1],
      why: 'Đọc theo cột trái từ trên xuống, bạn sẽ thấy một mạch logic chứ không phải sáu ô rời rạc: ' +
           'mỗi giai đoạn tồn tại vì giai đoạn trước <b>không đủ khả năng</b> làm việc của nó. ROM code ' +
           'không đọc nổi hệ thống file nên cần SPL; SPL không có chỗ chứa nên chỉ kịp bật DRAM rồi gọi ' +
           'U-Boot; U-Boot không phải hệ điều hành nên nạp kernel; kernel không có giao diện người dùng ' +
           'nên chạy init; init không phải là sản phẩm nên chạy ứng dụng. Ai nhớ được chuỗi "vì sao" này ' +
           'thì không bao giờ phải học thuộc thứ tự nữa.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN B — THÔNG HIỂU (6 câu)
     2 giải thích vì sao · 1 so sánh cặp · 1 bắt lỗi phát biểu · 2 đọc output
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Giải thích vì sao', truc: 0,
      q: 'Dưới đây là dữ liệu thật lấy từ máy <code>virt</code> của QEMU: bản đồ bộ nhớ ở vùng thấp, ' +
         'và giá trị thanh ghi ngay lúc CPU vừa reset (máy được dừng bằng <code>-S</code> trước khi ' +
         'chạy lệnh đầu tiên). Trên máy này RAM bắt đầu ở <code>0x40000000</code>.<br><br>' +
         'Dựa vào ba con số đó, hãy giải thích <b>vì sao lệnh đầu tiên không thể nằm trong DRAM</b>, ' +
         'và điều đó dẫn tới hệ quả gì trên phần cứng thật.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'info mtree -f (trích)', code:
          '0000000000000000-0000000003ffffff (prio 0, romd): virt.flash0\n' +
          '0000000004000000-0000000007ffffff (prio 0, romd): virt.flash1' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'info status + info registers (trích, lúc còn dừng)', code:
          'VM status: paused (prelaunch)\n' +
          '\n' +
          'CPU#0\n' +
          ' PC=0000000000000000 X00=0000000000000000 X01=0000000000000000\n' +
          'X02=0000000000000000 X03=0000000000000000 X04=0000000000000000' }
      ],
      rows: 6,
      ph: 'PC lúc reset là… vùng địa chỉ đó là… còn DRAM thì…',
      hint: 'Đặt ba câu hỏi theo thứ tự: CPU bắt đầu đọc ở địa chỉ nào? Cái gì nằm ở địa chỉ đó? ' +
            'Muốn đọc được DRAM ở 0x40000000 thì trước đó phải có ai làm việc gì?',
      crit: [
        'Chỉ ra PC = 0 lúc reset, tức CPU bắt đầu lấy lệnh tại địa chỉ 0',
        'Chỉ ra vùng địa chỉ 0 là flash/ROM — đọc được ngay, không cần ai cấu hình trước',
        'Nói được DRAM ở 0x40000000 chỉ dùng được SAU KHI controller DRAM được phần mềm cấu hình',
        'Kết luận: mã đầu tiên buộc phải nằm trong bộ nhớ không cần khởi tạo (ROM, rồi SRAM nội)',
        'Nối sang phần cứng thật: đó chính là lý do tồn tại của SPL và của kiểu boot nhiều tầng'
      ],
      sol: '<p>Thanh ghi PC lúc reset bằng <b>0</b>: CPU sẽ lấy lệnh đầu tiên tại địa chỉ 0. Bản đồ ' +
           'bộ nhớ cho thấy địa chỉ 0 nằm trong <code>virt.flash0</code> — bộ nhớ flash, thuộc loại ' +
           '<b>đọc được ngay khi vừa có điện</b>, không cần ai cấu hình.</p>' +
           '<p>DRAM thì nằm mãi ở <code>0x40000000</code>, và quan trọng hơn: nó <b>chưa dùng được</b> ' +
           'ở thời điểm đó. Controller DRAM là một khối phần cứng cần được nạp hàng chục thông số ' +
           '(timing, refresh, độ rộng bus, hiệu chỉnh trở kháng) thì các ô nhớ mới đọc ghi đúng. Việc ' +
           'nạp thông số đó là <i>phần mềm</i>, mà phần mềm thì phải chạy ở đâu đó.</p>' +
           '<p>Vòng luẩn quẩn được cắt bằng đúng một cách: mã đầu tiên nằm ở nơi <b>không cần khởi ' +
           'tạo gì cả</b> — ROM trong chip, rồi SRAM nội. Trên phần cứng thật, SRAM nội chỉ có vài ' +
           'chục KB, không đủ cho một bootloader đầy đủ. Đó chính xác là lý do tồn tại của <b>SPL</b>: ' +
           'một mảnh tí hon vừa lọt SRAM, làm đúng một việc là bật DRAM lên, rồi mới nạp được U-Boot ' +
           'đầy đủ vào DRAM vừa sống dậy. Kiểu boot nhiều tầng không phải do ai thích phức tạp — nó ' +
           'là hệ quả bắt buộc của việc DRAM cần phần mềm mới chạy được.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao',
      q: 'Đây là ba dòng thật trong <code>dmesg</code> của kernel WSL2 trên máy bạn. Hãy giải thích ' +
         '<b>kernel đang giải phóng cái gì</b>, và vì sao việc giải phóng đó lại đánh dấu một cột mốc ' +
         'trong luồng khởi động.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'dmesg | grep "Freeing unused kernel image"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '[    0.301144] Freeing unused kernel image (initmem) memory: 4852K\n' +
          '[    0.302283] Freeing unused kernel image (text/rodata gap) memory: 300K\n' +
          '[    0.303209] Freeing unused kernel image (rodata/data gap) memory: 1564K' }
      ],
      rows: 6,
      ph: 'Vùng initmem chứa… kernel bỏ nó đi vì… nên mốc này có nghĩa là…',
      hint: 'Có loại mã trong kernel chỉ chạy đúng một lần trong đời rồi không bao giờ dùng lại. ' +
            'Giữ chúng trong RAM suốt nhiều năm chạy liên tục thì được lợi gì?',
      crit: [
        'Nói được initmem chứa mã và dữ liệu chỉ dùng MỘT LẦN lúc khởi tạo',
        'Nêu đúng lý do giải phóng: lấy lại RAM, vì phần đó không bao giờ chạy lại nữa',
        'Nhận ra mốc này nghĩa là kernel đã khởi tạo xong, sắp/đang chuyển sang userspace',
        'Có nhắc tới con số thật: 4852K là phần initmem (hoặc tổng ba dòng ≈ 6716K)'
      ],
      sol: '<p>Trong ảnh kernel có một nhóm hàm và dữ liệu được đánh dấu <code>__init</code>: mã khởi ' +
           'tạo driver, mã phân tích dòng lệnh kernel, mã dựng các bảng nội bộ. Chúng chạy <b>đúng một ' +
           'lần</b> trong toàn bộ vòng đời của máy. Trình liên kết dồn tất cả vào một vùng liền nhau ' +
           'gọi là <i>initmem</i>; khởi tạo xong, kernel trả nguyên vùng đó về bộ cấp phát bộ nhớ.</p>' +
           '<p>Trên máy này vùng đó là <b>4852K</b>, cộng thêm hai khoảng trống căn lề 300K và 1564K ' +
           '— gần <b>6,7 MB</b> lấy lại được. Với một thiết bị nhúng 64 MB RAM, 6,7 MB là hơn 10 % ' +
           'tổng bộ nhớ, nên đây không phải chuyện làm cho đẹp.</p>' +
           '<p>Vì mã <code>__init</code> chỉ chạy trong pha khởi tạo, dòng này là <b>mốc báo kernel ' +
           'đã làm xong phần việc khởi tạo của mình</b>. Khi đọc log của một board lạ, đây là chỗ để ' +
           'chia đôi: mọi thứ phía trên là kernel tự dựng chính nó, mọi thứ phía dưới là kernel đang ' +
           'làm việc với userspace. Board treo <i>trước</i> dòng này và treo <i>sau</i> dòng này là ' +
           'hai loại lỗi hoàn toàn khác nhau.</p>' },

    { id: 'b3', k: 'free', tag: 'So sánh cặp',
      q: 'SPL và U-Boot đầy đủ đều là bootloader, đều do cùng một dự án phát hành, đều nạp thứ khác ' +
         'rồi nhảy tới. Chúng khác nhau ở nhiều điểm, nhưng hãy chỉ ra <b>khác biệt nào là khác biệt ' +
         'QUAN TRỌNG</b> — tức là khác biệt sinh ra tất cả những khác biệt còn lại — và giải thích tại sao.',
      rows: 5,
      ph: 'Khác biệt gốc là… và vì thế mới kéo theo…',
      hint: 'Đừng liệt kê "cái nhỏ cái to, cái có shell cái không". Hỏi ngược lại: vì sao cái này ' +
            'buộc phải nhỏ, còn cái kia được phép to?',
      crit: [
        'Xác định khác biệt gốc là NƠI CHÚNG CHẠY: SPL chạy trong SRAM nội, U-Boot chạy trong DRAM',
        'Suy ra kích thước: SRAM chỉ vài chục KB nên SPL buộc phải tí hon; DRAM rộng nên U-Boot to được',
        'Suy ra chức năng: SPL không đủ chỗ cho shell/driver mạng/hệ thống file, U-Boot thì có',
        'Nêu nhiệm vụ đặc trưng của SPL: cấu hình controller DRAM',
        'Không dừng ở việc liệt kê khác biệt mà chỉ ra được quan hệ nhân quả giữa chúng'
      ],
      sol: '<p>Khác biệt quan trọng là <b>nơi chúng chạy</b>, và mọi khác biệt khác chỉ là hệ quả.</p>' +
           '<p>SPL chạy trong <b>SRAM nội của chip</b>, vì lúc nó khởi động thì DRAM chưa dùng được. ' +
           'SRAM nội chỉ vài chục KB. Từ ràng buộc vài chục KB đó suy ra mọi thứ còn lại: SPL không có ' +
           'chỗ chứa shell, không có chỗ chứa driver mạng, không có chỗ chứa mã đọc hệ thống file phức ' +
           'tạp; nó chỉ vừa đủ để cấu hình controller DRAM và nạp mảnh kế tiếp.</p>' +
           '<p>U-Boot đầy đủ chạy trong <b>DRAM</b> — mà DRAM lúc này đã sống, nhờ chính SPL. Có hàng ' +
           'chục MB để nằm nên nó được phép có shell tương tác, biến môi trường, driver Ethernet, USB, ' +
           'đọc được ext4 và FAT.</p>' +
           '<p>Ai chỉ nhớ "SPL nhỏ, U-Boot to" sẽ quên ngay sau một tuần. Ai nhớ "SPL sống trong SRAM ' +
           'vì DRAM chưa bật" thì tự suy lại được toàn bộ danh sách khác biệt bất cứ lúc nào.</p>' },

    { id: 'b4', k: 'free', tag: 'Bắt lỗi phát biểu', truc: 1,
      q: 'Một đồng nghiệp nói: <i>"Kernel treo thì cũng không sao lắm, vì U-Boot vẫn đang chạy ở tầng ' +
         'dưới. Mình chỉ cần cấu hình cho U-Boot phát hiện kernel không phản hồi rồi nạp lại kernel là ' +
         'thiết bị tự phục hồi được."</i><br><br>' +
         'Dưới đây là cây tiến trình thật trên một hệ thống Linux đang chạy. Hãy chỉ ra <b>chỗ sai ' +
         'trong phát biểu</b>, dùng dữ liệu này làm bằng chứng, rồi nói cách làm đúng.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'pstree -p 1 | head -4' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'systemd(1)-+-agetty(249)\n' +
          '           |-chronyd-starter(127)---chronyd(247)---chronyd(261)\n' +
          '           |-cron(142)\n' +
          '           |-dbus-daemon(143)' }
      ],
      rows: 6,
      ph: 'Phát biểu sai ở chỗ… bằng chứng là… cách làm đúng là…',
      hint: 'Tìm U-Boot trong cây tiến trình đó. Nếu nó không có ở đó thì nó đang ở đâu?',
      crit: [
        'Chỉ ra U-Boot KHÔNG còn tồn tại sau khi kernel chạy — nó đã bàn giao rồi biến mất',
        'Dùng được bằng chứng: tiến trình gốc là systemd PID 1, không có tiến trình U-Boot nào',
        'Giải thích thêm được: U-Boot không phải tiến trình, nó không chạy song song với kernel',
        'Nêu cách làm đúng: watchdog phần cứng (hoặc watchdog do kernel/init nuôi) mới reset được board',
        'Nhận ra sau khi reset thì mới quay lại ROM code → SPL → U-Boot từ đầu'
      ],
      sol: '<p>Phát biểu sai ngay ở giả định nền: <b>U-Boot không còn tồn tại</b> khi kernel đang chạy. ' +
           'Bàn giao trong luồng khởi động là một chiều — U-Boot nạp kernel vào RAM, nhảy tới điểm vào ' +
           'của kernel, và ngừng tồn tại từ giây đó. Vùng nhớ nó từng chiếm được kernel dùng lại cho ' +
           'việc khác.</p>' +
           '<p>Cây tiến trình là bằng chứng trực tiếp: gốc của toàn bộ hệ thống là <code>systemd(1)</code>, ' +
           'và không có tiến trình nào tên U-Boot ở bất kỳ đâu. Nói cho chặt hơn: U-Boot <i>không thể</i> ' +
           'xuất hiện ở đó, vì nó không phải tiến trình — không có ai lập lịch cho nó, không có ai cấp ' +
           'bộ nhớ cho nó. Đây là điểm khác biệt lớn nhất so với hình dung quen từ máy để bàn, nơi nhiều ' +
           'người tưởng BIOS/UEFI "vẫn còn đó" trong lúc Windows chạy.</p>' +
           '<p>Cách làm đúng là <b>watchdog phần cứng</b>: một bộ đếm ngược nằm trong chip, phải được ' +
           'phần mềm "vỗ về" định kỳ; quá hạn không thấy ai vỗ thì nó kéo chân reset của cả SoC. Lúc đó ' +
           'board khởi động lại <i>từ đầu</i> — ROM code, SPL, U-Boot, kernel — chứ không phải U-Boot ' +
           '"nhảy vào cứu". Nguyên tắc chung: <b>chỉ thứ nằm ngoài phần đang treo mới cứu được nó</b>.</p>' },

    { id: 'b5', k: 'multi', tag: 'Đọc output', truc: 2,
      q: 'Đây là chuỗi bootargs thật mà kernel WSL2 trên máy bạn đã nhận được. Chọn <b>tất cả</b> các ' +
         'nhận định đúng khi đọc chuỗi này.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'cat /proc/cmdline' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'initrd=\\initrd.img WSL_ROOT_INIT=1 panic=-1 nr_cpus=6 hv_utils.timesync_implicit=1 ' +
          'console=hvc0 debug pty.legacy_count=0 WSL_ENABLE_CRASH_DUMP=1' }
      ],
      opts: [
        'Kernel này in log khởi động ra thiết bị <code>hvc0</code> chứ không phải <code>ttyS0</code>.',
        'Có một tham số giới hạn số CPU mà kernel được dùng, và giá trị của nó là 6.',
        'Thứ sinh ra chuỗi này chính là thứ đóng vai bootloader của WSL2 — nó nằm ở phía Windows.',
        'Trong chuỗi có tham số <code>root=</code> chỉ ra phân vùng chứa rootfs.',
        'Chuỗi này được đọc từ một file cấu hình nằm trong rootfs của Ubuntu.',
        '<code>panic=-1</code> có nghĩa là kernel này đã được cấu hình để không bao giờ panic.'
      ],
      a: [0, 1, 2],
      why: '<p><b>Đúng:</b> <code>console=hvc0</code> chỉ đích danh cổng console ảo của Hyper-V — đây ' +
           'chính là tham số quyết định log đi đâu, và thiếu nó thì màn hình câm lặng. ' +
           '<code>nr_cpus=6</code> giới hạn số CPU, khớp với 6 nhân bạn đã đếm được ở Bài 1. Và chuỗi ' +
           'này do phía Windows dựng rồi truyền vào — trong sơ đồ sáu giai đoạn, Windows đang đóng vai ' +
           'giai đoạn 2 (U-Boot đầy đủ): nó nạp kernel và truyền bootargs.</p>' +
           '<p><b>Sai:</b> chuỗi này <b>không có</b> <code>root=</code>, vì WSL2 dùng ' +
           '<code>initrd=\\initrd.img</code> — rootfs được dựng theo cách khác. Nhận định về file cấu ' +
           'hình trong rootfs sai theo một cách rất đáng nhớ: lúc kernel đọc chuỗi này thì <b>rootfs ' +
           'còn chưa được gắn</b>, nên không thể đọc file nào trong đó. Cuối cùng, <code>panic=-1</code> ' +
           'không hề tắt panic — nó nói "khi panic thì khởi động lại NGAY LẬP TỨC, không chờ giây nào". ' +
           'Đọc nhầm dấu trừ này thành "không panic" là một hiểu lầm thật, và nó khiến người ta không ' +
           'hiểu vì sao board cứ khởi động lại vòng vo mãi.</p>' },

    { id: 'b6', k: 'free', tag: 'Đọc output',
      q: 'Trên máy bạn, kernel WSL2 in mốc khởi tạo xong vào khoảng giây thứ <b>0,30</b>, còn ' +
         '<code>systemd-analyze</code> báo như dưới đây. Hãy giải thích con số 2,554 giây <b>đo cái ' +
         'gì</b>, và vì sao nó <b>không</b> cho bạn biết thiết bị mất bao lâu để khởi động từ lúc bấm nút nguồn.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'systemd-analyze' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'Startup finished in 2.554s (userspace)\n' +
          'graphical.target reached after 2.551s in userspace.' }
      ],
      rows: 5,
      ph: 'Chữ (userspace) nghĩa là… mốc 0 của phép đo này nằm ở… nên nó bỏ sót…',
      hint: 'Chú ý chữ "(userspace)" trong ngoặc. systemd bắt đầu chạy ở giai đoạn thứ mấy trong sáu ' +
            'giai đoạn của Bài 2?',
      crit: [
        'Nói được 2,554s chỉ tính phần userspace — tức từ lúc init/systemd bắt đầu chạy',
        'Nói được mốc 0 của phép đo nằm ở giai đoạn 4, không phải lúc cấp điện',
        'Chỉ ra nó bỏ sót giai đoạn 0, 1, 2 (ROM code, SPL, U-Boot) hoàn toàn',
        'Nhận ra phần kernel (≈0,30s) cũng nằm ngoài con số 2,554s này',
        'Kết luận: muốn biết thời gian boot thật phải cộng cả các giai đoạn trước, hoặc đo bằng cách khác'
      ],
      sol: '<p>Chữ <b>(userspace)</b> trong ngoặc là toàn bộ câu trả lời: 2,554 giây được tính từ lúc ' +
           '<b>systemd bắt đầu chạy</b>, tức từ đầu <b>giai đoạn 4</b>, chứ không phải từ lúc cấp điện.</p>' +
           '<p>Vậy nó bỏ sót ba giai đoạn đầu — ROM code, SPL, U-Boot — <i>hoàn toàn</i>, và bỏ sót cả ' +
           'phần kernel tự khởi tạo (trên máy này khoảng 0,30 giây, kết thúc ở dòng ' +
           '<code>Freeing unused kernel image</code>). Trên WSL2 thì ba giai đoạn đầu do Windows lo nên ' +
           'chuyện này vô hại; trên một board thật, U-Boot có thể ngồi <b>chờ 3 giây</b> ở dấu nhắc để ' +
           'người dùng bấm phím ngắt — và 3 giây đó không xuất hiện trong con số 2,554 kia.</p>' +
           '<p>Bài học chung, và nó lặp lại suốt cả khoá: <b>mỗi công cụ chỉ nhìn thấy giai đoạn mà nó ' +
           'sống trong đó</b>. systemd không biết gì về U-Boot, U-Boot không biết gì về systemd. Muốn ' +
           'có con số "từ lúc bấm nút nguồn" thì phải ghép các mảnh lại bằng tay, hoặc đo bằng dụng cụ ' +
           'nằm ngoài cả hệ thống — chẳng hạn máy hiện sóng bắt một chân GPIO.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN C — VẬN DỤNG (5 câu)
     2 chẩn đoán · 2 tình huống mới · 1 chọn và biện minh
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Công ty bạn làm phiên bản 2 của một board đang bán chạy. SoC giữ nguyên, mạch giữ nguyên, ' +
         'chỉ <b>đổi chip DDR3 sang loại khác</b> vì loại cũ ngừng sản xuất. Nạp đúng firmware của ' +
         'phiên bản 1 lên board mới, cắm cáp serial, bật nguồn, và nhận được đúng chừng này rồi im bặt ' +
         'vĩnh viễn:',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'màn hình serial của board mới', code:
          'U-Boot SPL 2024.01 (Mar 12 2026 - 09:41:22 +0000)' }
      ],
      rows: 6,
      ph: 'Nó chết ở giai đoạn… vì mảnh đó đúng lúc đang làm việc… bằng chứng là…',
      hint: 'Dòng đó chứng minh giai đoạn nào đã chạy được. Việc quan trọng nhất mà giai đoạn đó ' +
            'làm là gì, và trên board này có gì vừa thay đổi?',
      crit: [
        'Xác định đúng: chết trong SPL, sau khi SPL đã in dòng chào',
        'Chỉ đích danh nguyên nhân: khởi tạo DRAM thất bại vì tham số DDR3 không còn khớp chip mới',
        'Giải thích vì sao chết ĐÚNG chỗ đó: SPL nạp U-Boot vào DRAM, DRAM hỏng thì không nạp được',
        'Nhận ra ROM code đã chạy tốt (vì SPL lên được) — loại được giai đoạn 0 khỏi diện nghi ngờ',
        'Nêu hướng xử lý: sinh lại bộ tham số DDR cho chip mới rồi build lại SPL'
      ],
      sol: '<p>Board chết <b>trong SPL</b>, và chết đúng ở việc quan trọng nhất mà SPL làm.</p>' +
           '<p>Dòng chào đã in ra, nên suy ngay được hai điều: ROM code chạy tốt, và ROM code đã nạp ' +
           'thành công SPL vào SRAM nội rồi nhảy tới. Giai đoạn 0 sạch, gạch khỏi danh sách nghi ngờ.</p>' +
           '<p>Ngay sau dòng chào, việc kế tiếp của SPL là <b>cấu hình controller DRAM</b>. Tham số DDR ' +
           '— timing, độ trễ CAS, chu kỳ refresh, hiệu chỉnh trở kháng — được nhúng cứng trong ảnh SPL ' +
           'và được sinh riêng cho <b>đúng con chip DDR đó</b>. Đổi chip DDR3 mà giữ nguyên SPL cũ thì ' +
           'controller được nạp một bộ thông số sai; DRAM hoặc không phản hồi, hoặc phản hồi ra dữ liệu ' +
           'rác. SPL cố chép U-Boot vào DRAM đó rồi nhảy tới — và nhảy vào rác thì không bao giờ có ' +
           'dòng log nào nữa.</p>' +
           '<p>Đây cũng là lý do việc "chỉ đổi con DDR thôi mà" là một trong những thay đổi phần cứng ' +
           'tốn kém nhất về phần mềm: phải chạy công cụ sinh tham số DDR của hãng SoC cho chip mới, ' +
           'build lại SPL, rồi kiểm tra bằng bài test bộ nhớ trước khi tin tưởng nó.</p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 2,
      q: 'Một board mới về. U-Boot chạy tốt, in đủ thông tin, rồi in dòng <code>Starting kernel ...</code> ' +
         'và <b>màn hình serial im lặng hoàn toàn từ đó</b> — không một ký tự nào nữa, không cả thông ' +
         'báo lỗi. Đồng nghiệp kết luận "kernel hỏng, build lại kernel đi".<br><br>' +
         'Nhưng bạn để ý một chi tiết: <b>đèn LED trạng thái trên board vẫn nhấp nháy đều đặn</b>, và ' +
         'đèn đó do một driver trong kernel điều khiển. Hãy chẩn đoán, và nói rõ vì sao kết luận của ' +
         'đồng nghiệp là sai.',
      rows: 6,
      ph: 'Đèn nháy chứng minh… nên thứ hỏng không phải kernel mà là…',
      hint: 'Nếu kernel chết thì cái gì làm đèn nháy? Và nếu kernel sống thì vì sao ta không thấy chữ nào?',
      crit: [
        'Suy luận từ đèn LED: kernel ĐANG CHẠY, driver đã nạp — nên kernel không hỏng',
        'Kết luận vấn đề nằm ở đường log ra console, không nằm ở kernel',
        'Chỉ đích danh nghi phạm số một: bootargs thiếu console=, hoặc console= trỏ sai cổng/sai baud',
        'Nêu cách kiểm chứng: xem lại biến bootargs trong U-Boot, hoặc đọc /proc/cmdline nếu đăng nhập được',
        'Nhận ra "im lặng hoàn toàn" khác hẳn "panic có thông báo" — im lặng thường là lỗi kênh truyền'
      ],
      sol: '<p>Đèn nháy là bằng chứng quyết định: đèn do driver trong kernel điều khiển, driver chạy ' +
           'được nghĩa là <b>kernel đã khởi động xong và đang chạy bình thường</b>. Kết luận "kernel ' +
           'hỏng" mâu thuẫn với chính dữ liệu đang có trước mắt.</p>' +
           '<p>Vậy thứ hỏng không phải kernel mà là <b>đường log đi ra ngoài</b>. Nghi phạm số một là ' +
           'chuỗi bootargs: hoặc thiếu hẳn <code>console=</code>, hoặc nó trỏ vào một cổng khác cổng ' +
           'bạn đang cắm (<code>ttyS0</code> trong khi board dùng <code>ttymxc0</code>, chẳng hạn), hoặc ' +
           'đúng cổng nhưng sai tốc độ baud. Kernel vẫn in log đều đặn — chỉ là in vào một nơi không ai ' +
           'nghe.</p>' +
           '<p>Cách kiểm chứng rẻ nhất: dừng ở dấu nhắc U-Boot, gõ <code>printenv bootargs</code> và so ' +
           'với cổng serial bạn đang cắm thật. Nếu vẫn đăng nhập được vào máy bằng đường khác (SSH, ' +
           'màn hình), đọc <code>/proc/cmdline</code> để xem kernel <i>thật sự</i> nhận được gì.</p>' +
           '<p>Bài học tổng quát đáng nhớ hơn cả ca này: <b>"im lặng hoàn toàn" và "panic có thông báo" ' +
           'là hai triệu chứng khác loại</b>. Panic nghĩa là kênh log còn sống, nên hãy đọc nó. Im lặng ' +
           'tuyệt đối thường có nghĩa là kênh log chưa bao giờ mở đúng — và lúc đó việc cần làm là sửa ' +
           'kênh, không phải sửa thứ ở đầu bên kia.</p>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1,
      q: 'Sản phẩm của bạn là một trạm quan trắc đặt trên cột điện giữa đồng, không có người trực. ' +
         'Khách hàng ra một yêu cầu: <i>"phần mềm treo kiểu gì thì thiết bị cũng phải tự phục hồi ' +
         'trong vòng 60 giây."</i><br><br>' +
         'Đồng nghiệp đề xuất: <i>"cho U-Boot theo dõi kernel, thấy treo thì nạp lại."</i> ' +
         'Hãy giải thích vì sao đề xuất đó <b>không thể thực hiện được</b>, và mô tả cơ chế đúng — ' +
         'kể cả cho trường hợp thứ treo là ứng dụng chứ không phải kernel.',
      rows: 7,
      ph: 'Không làm được vì… cơ chế đúng là… với ứng dụng thì…',
      hint: 'Muốn giám sát một thứ đang chạy, bản thân người giám sát cũng phải đang chạy. Sau khi ' +
            'bàn giao, U-Boot còn đang chạy không?',
      crit: [
        'Nêu lý do gốc: U-Boot đã bàn giao và biến mất, nó không còn chạy nên không giám sát được gì',
        'Nêu nguyên tắc: thứ giám sát phải nằm NGOÀI thứ bị giám sát và phải đang chạy',
        'Đưa ra watchdog phần cứng cho trường hợp kernel treo — bộ đếm trong chip, kéo chân reset SoC',
        'Nói rõ phải có phần mềm "vỗ về" watchdog định kỳ, và ai vỗ (kernel/tiến trình do init trông)',
        'Với ứng dụng chết: đó là việc của init (systemd restart / respawn), không cần tới watchdog',
        'Nhận ra sau khi watchdog reset thì board chạy lại từ ROM code, chứ U-Boot không "nhảy vào cứu"'
      ],
      sol: '<p><b>Vì sao không làm được:</b> muốn giám sát một thứ, bản thân người giám sát phải đang ' +
           'chạy. U-Boot đã nhảy sang kernel và ngừng tồn tại — nó không phải tiến trình, không được ai ' +
           'lập lịch, vùng nhớ nó từng chiếm đã bị dùng lại. Không có gì ở đó để mà theo dõi ai cả.</p>' +
           '<p><b>Kernel treo → watchdog phần cứng.</b> Đây là một bộ đếm ngược nằm trong silicon của ' +
           'SoC, hoàn toàn độc lập với CPU. Phần mềm phải ghi vào nó định kỳ ("vỗ về" / <i>kick</i>); ' +
           'quá hạn mà không ai vỗ thì nó kéo chân reset của cả SoC. Board khởi động lại <b>từ đầu</b>: ' +
           'ROM code → SPL → U-Boot → kernel. Đặt thời hạn dưới 60 giây là đạt yêu cầu của khách hàng. ' +
           'Điểm tinh tế: nên để một tiến trình <i>userspace</i> do init trông coi làm việc vỗ về, chứ ' +
           'nếu để kernel tự vỗ vô điều kiện thì kernel sống mà userspace chết cứng vẫn không ai reset.</p>' +
           '<p><b>Ứng dụng chết → việc của init.</b> Trường hợp này nhẹ hơn nhiều và không cần đụng tới ' +
           'watchdog: init (systemd với <code>Restart=always</code>, hoặc <code>respawn</code> trong ' +
           'BusyBox init) phát hiện tiến trình con thoát ra và chạy lại nó trong một giây. Kernel vẫn ' +
           'chạy suốt, không ai phải khởi động lại máy.</p>' +
           '<p>Nguyên tắc gói gọn cả ba đoạn trên: <b>chỉ thứ nằm ngoài phần bị hỏng mới cứu được nó</b>. ' +
           'Ứng dụng hỏng thì init cứu; kernel hỏng thì phần cứng cứu; phần cứng hỏng thì phải có người ' +
           'tới tận nơi.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Một máy đo cầm tay phải <b>hiện được màn hình đầu tiên trong 1,5 giây</b> kể từ lúc bấm nút ' +
         'nguồn. Bản hiện tại mất 9 giây. Bạn đo được từng chặng như sau:',
      blocks: [
        { t: 'table',
          head: ['Giai đoạn', 'Thời gian'],
          rows: [
            ['ROM code', '0,05 s'],
            ['SPL (khởi tạo DRAM)', '0,25 s'],
            ['U-Boot đầy đủ — trong đó chờ người bấm phím', '3,20 s (riêng phần chờ: 3,00 s)'],
            ['U-Boot nạp kernel + device tree từ eMMC', '0,90 s'],
            ['Kernel khởi tạo', '2,10 s'],
            ['init khởi động các dịch vụ', '2,50 s']
          ]},
        { t: 'p', x: 'Hãy chỉ ra bạn sẽ cắt ở đâu, theo thứ tự ưu tiên, và nêu rõ mỗi lựa chọn đánh đổi cái gì.' }
      ],
      rows: 7,
      ph: 'Cắt đầu tiên là… vì nó rẻ nhất và đắt nhất về thời gian… đánh đổi là…',
      hint: 'Sắp xếp các chặng theo "số giây tiết kiệm được chia cho công sức bỏ ra". Có một chặng ' +
            'gần như cho không.',
      crit: [
        'Ưu tiên 1: bỏ 3,00 s chờ bấm phím của U-Boot (đặt bootdelay=0) — gần như miễn phí',
        'Nêu đúng đánh đổi của việc đó: mất đường vào dấu nhắc U-Boot khi cần cứu board',
        'Ưu tiên 2: cắt init — bỏ dịch vụ không cần, hoặc thay systemd bằng init tối giản',
        'Ưu tiên 3: cắt kernel — bỏ driver không dùng, tắt log console lúc chạy thật',
        'Nhận ra ROM code (0,05 s) và SPL (0,25 s) gần như không cắt được và không đáng động vào',
        'Có cộng lại để kiểm tra mục tiêu 1,5 s có khả thi không (9 − 3,0 − 2,0 − 1,5 ≈ 2,5 s, vẫn còn thiếu)'
      ],
      sol: '<p><b>Ưu tiên 1 — 3,00 giây chờ bấm phím.</b> Đây là thời gian U-Boot ngồi đếm ngược ở dấu ' +
           'nhắc chờ người dùng ngắt. Trên một sản phẩm bán ra, không ai bấm cả. Đặt ' +
           '<code>bootdelay=0</code> là xong: <b>một phần ba mục tiêu</b> đạt được bằng một biến môi ' +
           'trường, không phải build lại gì. Đánh đổi: mất đường vào dấu nhắc U-Boot khi cần cứu board, ' +
           'nên thực tế người ta thường giữ lại một lối vào khác (giữ một phím, hoặc một chân GPIO nối ' +
           'đất lúc khởi động).</p>' +
           '<p><b>Ưu tiên 2 — init, 2,50 giây.</b> Phần lớn thời gian ở đây là khởi động những dịch vụ ' +
           'mà một máy đo cầm tay không cần: quản lý mạng, đồng bộ giờ, in ấn. Tắt bớt dịch vụ là việc ' +
           'rẻ; đi xa hơn thì thay systemd bằng một init tối giản. Đánh đổi là mất tiện nghi khi phát ' +
           'triển và gỡ lỗi.</p>' +
           '<p><b>Ưu tiên 3 — kernel, 2,10 giây.</b> Bỏ driver không dùng khỏi cấu hình, và tắt log ra ' +
           'console ở bản chạy thật (in log ra serial 115200 baud tốn thời gian thật). Việc này công phu ' +
           'hơn và phải build lại kernel.</p>' +
           '<p><b>Không động vào:</b> ROM code 0,05 s là bất khả xâm phạm — nằm trong silicon. SPL 0,25 s ' +
           'chủ yếu là khởi tạo DRAM, cắt được rất ít mà rủi ro rất cao.</p>' +
           '<p>Cộng lại: 9 − 3,0 (chờ) − 2,0 (init) − 1,5 (kernel) ≈ <b>2,5 giây</b> — vẫn chưa đạt 1,5 s. ' +
           'Đây là lúc phải xét tới hai hướng khác: nạp thẳng kernel từ SPL, bỏ hẳn tầng U-Boot đầy đủ ' +
           '(gọi là <i>falcon mode</i>, chính là câu C5), hoặc hiện một logo tĩnh ngay từ U-Boot để người ' +
           'dùng <i>thấy</i> phản hồi trong 1,5 s trong khi phần còn lại vẫn đang khởi động. Mẹo thứ hai ' +
           'là thứ mà rất nhiều sản phẩm thương mại đang làm.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Vẫn là chiếc máy đo ở câu C4. Đội của bạn phải chọn một trong hai kiến trúc khởi động:' +
         '<ul>' +
         '<li><b>Phương án A</b> — giữ nguyên ba tầng: SPL → U-Boot đầy đủ → kernel.</li>' +
         '<li><b>Phương án B</b> — <i>falcon mode</i>: SPL nạp thẳng kernel, bỏ hẳn tầng U-Boot đầy đủ ' +
         'ở lần khởi động bình thường.</li>' +
         '</ul>' +
         'Chọn một phương án và <b>biện minh</b>. Phần được chấm là lập luận, không phải lựa chọn: ' +
         'nêu rõ bạn được gì, mất gì, và bạn xử lý cái mất đó ra sao.',
      rows: 7,
      ph: 'Tôi chọn… vì… cái mất lớn nhất là… và tôi bù lại bằng…',
      hint: 'U-Boot đầy đủ tồn tại để làm gì? Liệt kê ra, rồi hỏi từng cái: sản phẩm ngoài thị trường ' +
            'có cần nó ở MỖI lần bật máy không, hay chỉ cần khi có sự cố?',
      crit: [
        'Nêu được cái lợi của B: bỏ hẳn ~0,9–3 s của tầng U-Boot, đạt mục tiêu thời gian',
        'Nêu được cái mất của B: không còn shell U-Boot, không còn cập nhật firmware qua mạng/USB, khó cứu board',
        'Nêu được rằng falcon mode đòi hỏi cấu hình cứng hơn: SPL phải tự dựng device tree và bootargs',
        'Có phương án dự phòng cụ thể (ví dụ: giữ U-Boot đầy đủ trên flash, chỉ vào khi giữ phím hoặc khi boot lỗi)',
        'Lập luận gắn với ràng buộc của sản phẩm này (thời gian 1,5 s, thiết bị cầm tay, có người dùng cuối)',
        'Không kết luận suông "B nhanh hơn nên chọn B" mà có so sánh chi phí – lợi ích hai chiều'
      ],
      sol: '<p>Cả hai lựa chọn đều chấp nhận được; điều được chấm là lập luận. Dưới đây là một lời giải ' +
           'đầy đủ theo hướng <b>B có dự phòng</b>, vốn là cách các sản phẩm thương mại hay làm.</p>' +
           '<p><b>Được gì:</b> tầng U-Boot đầy đủ tốn 0,9 s nạp kernel cộng phần khởi tạo của chính nó ' +
           '(và 3 s chờ phím nếu chưa tắt). Bỏ nó đi là lấy lại đúng phần thời gian đang thiếu ở câu C4.</p>' +
           '<p><b>Mất gì:</b> U-Boot đầy đủ là <i>bộ đồ nghề cứu hộ</i> của board — shell tương tác, đọc ' +
           'được thẻ nhớ và USB, tải được file qua mạng, ghi được flash. Mất nó là mất khả năng cập nhật ' +
           'firmware và khả năng cứu một board đã hỏng ảnh kernel. Ngoài ra falcon mode chuyển việc khó ' +
           'sang cho SPL: SPL phải tự chuẩn bị device tree và bootargs, những thứ U-Boot vốn làm hộ — ' +
           'nghĩa là một phần cấu hình bị "đóng băng" cứng vào ảnh SPL.</p>' +
           '<p><b>Bù lại thế nào:</b> vẫn giữ U-Boot đầy đủ nằm trên flash, chỉ là <b>không chạy nó ở ' +
           'lần khởi động bình thường</b>. SPL kiểm tra một điều kiện rẻ tiền — giữ một phím lúc bật ' +
           'máy, hoặc một chân GPIO, hoặc một cờ do lần boot trước ghi lại — và chỉ khi điều kiện đúng ' +
           'mới nhảy vào U-Boot. Thêm một bộ đếm boot: hai lần khởi động kernel thất bại liên tiếp thì ' +
           'tự rơi về U-Boot. Như vậy sản phẩm nhanh ở đường thường ngày mà vẫn cứu được khi có sự cố.</p>' +
           '<p>Chọn phương án A cũng hoàn toàn hợp lệ, nếu lập luận đi theo hướng: sản phẩm mới, còn ' +
           'thay đổi nhiều, đội chưa có kinh nghiệm falcon mode, nên đạt 1,5 s bằng cách hiện logo sớm ' +
           'từ U-Boot thay vì đổi kiến trúc khởi động. Lập luận đó cân được rủi ro kỹ thuật với rủi ro ' +
           'tiến độ, và đó là một biện minh tốt.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN D — ÔN XEN KẼ (3 câu) — hỏi về Bài 1
     Đây là nơi ba trục của bt-01 quay lại. Theo CLAUDE.md §13.4 bước 4,
     chúng KHÔNG được xoáy lần thứ hai ở phần A/B/C, nhưng vẫn phải được
     nhắc lại — và phần D chính là chỗ dành cho việc đó.
     ══════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Nhắc lại Bài 1. Một con vi điều khiển có 512 KB RAM, chạy ở 200 MHz, nhưng <b>không có MMU</b>. ' +
         'Nhận định nào đúng?',
      opts: [
        'Nó chạy được Linux đầy đủ, chỉ là chậm hơn vì RAM ít.',
        'Nó <b>không</b> chạy được Linux đầy đủ; muốn dùng Linux thì phải chọn nhánh riêng dành cho ' +
          'chip không MMU, còn thông thường người ta chọn RTOS hoặc bare-metal.',
        'Nó chạy được Linux nếu ta tắt bớt driver để tiết kiệm bộ nhớ.',
        'Nó chạy được Linux vì 200 MHz đã nhanh hơn nhiều máy tính đời đầu.'
      ],
      a: 1,
      why: 'Ranh giới quyết định là <b>MMU</b>, không phải dung lượng RAM hay tốc độ xung nhịp. Linux ' +
           'đầy đủ dựa vào bộ nhớ ảo cho gần như mọi thứ: mỗi tiến trình một không gian địa chỉ riêng, ' +
           'bảo vệ tiến trình này khỏi tiến trình kia, <code>fork()</code>, ánh xạ file vào bộ nhớ. ' +
           'Không có MMU thì không có bộ nhớ ảo, và những cơ chế đó không thể mô phỏng lại bằng phần ' +
           'mềm với chi phí chấp nhận được. Ba phương án còn lại đều mắc chung một lỗi: coi đây là bài ' +
           'toán <i>đủ hay chưa đủ tài nguyên</i>, trong khi thực chất nó là bài toán <i>có hay không ' +
           'có một khối phần cứng</i>.' },

    { id: 'd2', k: 'free', tag: 'Nhắc lại bài cũ',
      q: 'Nhắc lại Bài 1. Bốn mảnh ghép của một hệ thống Linux nhúng là bootloader, kernel, rootfs và ' +
         'ứng dụng. Một board khởi động, in log kernel bình thường tới tận dòng ' +
         '<code>Freeing unused kernel image</code>, rồi dừng lại ở:',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'VFS: Cannot open root device "mmcblk0p2" or unknown-block(0,0): error -6\n' +
          'Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)' }
      ],
      rows: 5,
      ph: 'Mảnh còn tốt là… mảnh hỏng là… vì thông báo nói rằng…',
      hint: 'Đọc kỹ chữ "root fs" trong dòng panic. Kernel phải sống tới mức nào mới in được câu đó ra?',
      crit: [
        'Chỉ ra bootloader và kernel đều TỐT — bằng chứng là kernel chạy được và tự in ra thông báo',
        'Chỉ ra mảnh hỏng là rootfs: kernel không gắn được hệ thống file gốc',
        'Nêu ít nhất hai nguyên nhân cụ thể: sai tên thiết bị trong root=, phân vùng chưa tồn tại, thiếu driver eMMC/thiếu hệ thống file trong kernel',
        'Nhận ra ứng dụng chưa từng có cơ hội chạy, nên không thể là thủ phạm'
      ],
      sol: '<p>Chính thông báo panic đã chỉ đích danh mảnh hỏng, và điều đó minh hoạ đúng cái lợi của ' +
           'mô hình bốn mảnh: <b>triệu chứng khoanh vùng được thủ phạm</b>.</p>' +
           '<p><b>Bootloader: tốt.</b> Nó đã nạp kernel và trao quyền thành công. <b>Kernel: tốt.</b> ' +
           'Nó chạy tới tận lúc khởi tạo xong và tự tay in ra dòng panic này — một kernel hỏng thì không ' +
           'in được câu tiếng Anh mạch lạc như vậy. <b>Ứng dụng:</b> chưa từng chạy, nên vô can.</p>' +
           '<p><b>Rootfs: đây là mảnh hỏng.</b> Kernel đã sẵn sàng chuyển sang userspace nhưng không tìm ' +
           'thấy hệ thống file gốc để gắn. Nguyên nhân thường gặp, xếp theo tần suất: chuỗi ' +
           '<code>root=</code> trỏ sai tên thiết bị; phân vùng chưa được tạo hoặc chưa được ghi dữ liệu; ' +
           'kernel thiếu driver cho bộ điều khiển eMMC/SD nên chưa kịp thấy thiết bị; hoặc kernel không ' +
           'được biên dịch kèm loại hệ thống file của phân vùng đó (ext4 chẳng hạn).</p>' +
           '<p>Một cách khoanh vùng nhanh: nếu thay bằng initramfs mà board vào được shell, thì kernel ' +
           'và bootloader chắc chắn sạch, và vấn đề nằm gọn ở việc truy cập phân vùng gốc.</p>' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Nhắc lại Bài 1. Bạn hàn thêm một cảm biến nhiệt độ vào bus I2C của board. Driver cho đúng ' +
         'loại cảm biến đó <b>đã được biên dịch sẵn trong kernel</b>. Bật máy lên, không có thiết bị ' +
         'nào xuất hiện. Vì sao?',
      opts: [
        'Vì driver cần được nạp thủ công bằng <code>modprobe</code> trước khi kernel dò thiết bị.',
        'Vì bus I2C không hỗ trợ cắm thêm thiết bị sau khi board đã xuất xưởng.',
        'Vì phần cứng nhúng <b>không tự khai báo</b>: thiết bị phải được mô tả trong Device Tree thì ' +
          'kernel mới biết nó tồn tại và mới gọi driver tương ứng.',
        'Vì cảm biến chưa được cấp nguồn nên kernel bỏ qua nó.'
      ],
      a: 2,
      why: 'Đây là khác biệt nền tảng giữa máy để bàn và hệ nhúng. Trên PC, các bus như USB và PCIe có ' +
           'cơ chế <b>tự liệt kê</b>: cắm thiết bị vào là nó tự xưng tên và mã nhà sản xuất, kernel dò ' +
           'ra rồi ghép driver. Bus I2C và SPI <b>không có cơ chế đó</b> — không ai trả lời nếu không ai ' +
           'hỏi đúng địa chỉ. Vì vậy hệ nhúng dùng <b>Device Tree</b>: một bản mô tả do con người viết, ' +
           'nói rõ có thiết bị gì, ở bus nào, tại địa chỉ nào. Chưa khai báo trong Device Tree thì thiết ' +
           'bị <i>không tồn tại</i> đối với kernel, dù driver đã nằm sẵn trong đó. Phương án A sai vì ' +
           'driver đã được biên dịch sẵn trong kernel thì không có gì để <code>modprobe</code>.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN E — THỰC HÀNH (6 câu)
     2 dự đoán output · 2 gõ lệnh · 1 sửa lỗi · 1 thử thách
     Mọi lệnh dưới đây đã chạy thật trên máy người học ngày 2026-08-11.
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'num', tag: 'Dự đoán output',
      q: 'Ở Bài 2 bạn đã thấy dòng <code>Freeing unused kernel image</code> đánh dấu lúc kernel khởi ' +
         'tạo xong. <b>Trước khi chạy</b>, hãy dự đoán: lệnh dưới đây in ra con số mấy?' +
         '<br><br>Viết dự đoán vào ô, rồi mở WSL chạy thật để đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'dmesg | grep -c "Freeing unused kernel image"' }
      ],
      a: 3,
      tol: 0,
      unit: 'dòng',
      why: 'Phần lớn người học đoán <b>1</b>, vì trong đầu chỉ có một dòng "kernel giải phóng bộ nhớ ' +
           'khởi tạo". Thực tế là <b>3</b>:<br>' +
           '<code>(initmem) memory: 4852K</code> — vùng mã <code>__init</code> thật sự;<br>' +
           '<code>(text/rodata gap) memory: 300K</code> và <code>(rodata/data gap) memory: 1564K</code> ' +
           '— hai khoảng trống <b>căn lề</b> giữa các đoạn của ảnh kernel.<br>' +
           'Hai khoảng trống đó tồn tại vì mỗi đoạn phải bắt đầu ở ranh giới một trang nhớ để đặt được ' +
           'quyền truy cập riêng (mã thì thực thi được nhưng không ghi được, dữ liệu thì ngược lại). ' +
           'Căn lề xong thì dư ra vài trăm KB không thuộc về ai — và kernel trả luôn chúng về bộ cấp ' +
           'phát. Bài học: <b>một khái niệm trong đầu bạn có thể ứng với nhiều dòng trong log thật</b>, ' +
           'nên đếm bằng <code>grep -c</code> vẫn tốt hơn là tin vào trí nhớ.' },

    { id: 'e2', k: 'fill', tag: 'Dự đoán output',
      q: 'Lệnh dưới đây khởi động một máy ARM64 ảo nhưng <b>dừng CPU lại ngay trước lệnh đầu tiên</b> ' +
         '(nhờ tuỳ chọn <code>-S</code>), rồi hỏi giá trị các thanh ghi.<br><br>' +
         '<b>Trước khi chạy</b>, hãy dự đoán giá trị của thanh ghi <b>PC</b> lúc đó (viết dạng số ' +
         'hex hoặc thập phân đều được):',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'printf \'info registers\\nquit\\n\' | qemu-system-aarch64 \\\n' +
          '  -M virt -cpu cortex-a57 -display none -serial null -monitor stdio -S' }
      ],
      a: ['0', '0x0', '0x00000000', '0000000000000000', '0x0000000000000000', '00000000'],
      ph: 'ví dụ: 0x…',
      why: 'PC = <b>0</b>. Đây là reset vector của máy <code>virt</code>: CPU vừa reset xong thì bộ đếm ' +
           'chương trình bằng 0, và mọi thanh ghi X00–X30 cũng bằng 0. Không có phần mềm nào đã chạy để ' +
           'đặt chúng thành giá trị khác.<br><br>' +
           'Điều đáng nhớ là ở máy này địa chỉ 0 <b>không phải RAM</b> — RAM bắt đầu mãi ở ' +
           '<code>0x40000000</code>. Địa chỉ 0 nằm trong vùng <code>virt.flash0</code>. Bạn vừa nhìn ' +
           'thấy tận mắt điều mà câu A1 và câu B1 nói bằng lời: CPU bắt đầu đọc lệnh từ bộ nhớ ' +
           '<b>không cần khởi tạo</b>, chứ không phải từ DRAM.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Chuỗi bootargs nằm gọn trong một dòng dài, rất khó đọc bằng mắt. Hãy viết <b>một câu lệnh</b> ' +
         '(có thể dùng ống <code>|</code>) làm được cả hai việc sau, và ghi lại kết quả bạn nhận được:' +
         '<ul>' +
         '<li>tách chuỗi trong <code>/proc/cmdline</code> thành mỗi tham số một dòng, rồi <b>chỉ in ra ' +
         'tham số <code>console=</code></b>;</li>' +
         '<li>và một câu lệnh nữa <b>đếm xem có tất cả bao nhiêu tham số</b>.</li>' +
         '</ul>',
      rows: 5,
      ph: 'Lệnh 1: …\nKết quả: …\n\nLệnh 2: …\nKết quả: …',
      hint: 'Cần một công cụ đổi dấu cách thành ký tự xuống dòng. Sau đó thì <code>grep</code> lọc, ' +
            'và <code>grep -c</code> đếm. Chú ý dùng chuyển hướng <code>&lt;</code> thay vì ' +
            '<code>cat</code> cũng được.',
      crit: [
        'Có bước tách theo dấu cách thành từng dòng (tr \' \' \'\\n\' hoặc tương đương, ví dụ xargs -n1)',
        'Có lọc đúng dòng console= (grep console, tốt hơn nữa là grep \'^console=\')',
        'Kết quả ghi lại đúng là console=hvc0',
        'Lệnh đếm dùng grep -c . (hoặc wc -l) sau khi đã tách dòng',
        'Kết quả đếm đúng là 9'
      ],
      solBlocks: [
        { t: 'p', x: 'Một cách viết đúng:' },
        { t: 'code', where: 'wsl', code:
          "tr ' ' '\\n' < /proc/cmdline | grep '^console='\n" +
          "tr ' ' '\\n' < /proc/cmdline | grep -c ." },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'console=hvc0\n' +
          '9' },
        { t: 'cmdx', cmd: "tr ' ' '\\n' < /proc/cmdline | grep '^console='",
          title: 'Mổ xẻ câu lệnh',
          rows: [
            ['tr &#39; &#39; &#39;\\n&#39;', 'Đổi mỗi dấu cách thành một ký tự xuống dòng.',
             '<code>tr</code> chỉ thay thế từng ký tự một — đúng việc cần ở đây và rẻ hơn <code>sed</code>.'],
            ['&lt; /proc/cmdline', 'Đưa nội dung file vào đầu vào chuẩn của <code>tr</code>.',
             'Dùng chuyển hướng thay cho <code>cat file |</code> thì bớt được một tiến trình.'],
            ['grep &#39;^console=&#39;', 'Chỉ giữ dòng <b>bắt đầu</b> bằng <code>console=</code>.',
             'Dấu <code>^</code> quan trọng: không có nó thì một tham số như ' +
             '<code>earlycon=…</code> cũng lọt lưới.'],
            ['grep -c .', 'Đếm số dòng có ít nhất một ký tự.',
             'Dấu chấm khớp mọi ký tự, nên dòng rỗng cuối file không bị đếm nhầm — ' +
             '<code>wc -l</code> thì có thể đếm nhầm.']
          ]},
        { t: 'cal', kind: 'tip', title: 'Vì sao nên tách dòng trước khi đọc',
          x: '<p>Trên board thật, chuỗi bootargs hay dài tới hai ba trăm ký tự và cuộn tràn màn hình ' +
             'serial. Tách mỗi tham số một dòng là việc đầu tiên nên làm — nhiều lỗi khởi động lộ ra ' +
             'ngay lập tức khi nhìn theo cột dọc: một tham số bị lặp hai lần, hoặc một dấu cách thừa ' +
             'cắt đôi một tham số.</p>' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Hãy viết câu lệnh QEMU khởi động một máy ARM64 <code>virt</code> với CPU ' +
         '<code>cortex-a57</code>, thoả cả bốn điều kiện sau, rồi chạy nó và ghi lại kết quả của ' +
         '<code>info status</code>:' +
         '<ul>' +
         '<li>không mở cửa sổ đồ hoạ nào;</li>' +
         '<li>không nối cổng serial của máy ảo vào đâu cả;</li>' +
         '<li>đưa <b>màn hình monitor của QEMU</b> ra terminal đang dùng;</li>' +
         '<li><b>dừng CPU</b> ngay từ đầu, chưa cho chạy lệnh nào.</li>' +
         '</ul>',
      rows: 4,
      ph: 'qemu-system-aarch64 …\n\ninfo status cho ra: …',
      hint: 'Bốn điều kiện ứng với bốn tuỳ chọn riêng biệt. Tuỳ chọn "dừng CPU" chỉ có một chữ cái ' +
            'viết hoa. Gõ <code>quit</code> để thoát khỏi monitor.',
      crit: [
        'Có -M virt và -cpu cortex-a57',
        'Có -display none (không mở cửa sổ đồ hoạ)',
        'Có -serial null (không nối cổng serial của máy ảo đi đâu)',
        'Có -monitor stdio (đưa monitor ra terminal)',
        'Có -S viết hoa (dừng CPU từ đầu) — chứ không phải -s viết thường',
        'Ghi lại đúng kết quả: VM status: paused (prelaunch)'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 \\\n' +
          '  -display none -serial null -monitor stdio -S' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'QEMU 10.2.1 monitor - type \'help\' for more information\n' +
          '(qemu) info status\n' +
          'VM status: paused (prelaunch)' },
        { t: 'cal', kind: 'warn', title: 'Chữ hoa chữ thường ở đây không phải chuyện nhỏ',
          x: '<p><code>-S</code> viết hoa nghĩa là <i>dừng CPU lúc khởi động</i>. ' +
             '<code>-s</code> viết thường lại là một tuỳ chọn hoàn toàn khác: <i>mở cổng gdb ở ' +
             '1234</i>. Hai tuỳ chọn này thường đi cùng nhau (<code>-s -S</code>: dừng máy và chờ ' +
             'gdb nối vào), nên rất dễ gõ nhầm cái này thành cái kia và ngồi tự hỏi vì sao máy ' +
             'không dừng. Chặng 05 sẽ dùng cặp <code>-s -S</code> này để gỡ lỗi một chương trình ' +
             'ARM64 bằng <code>gdb-multiarch</code>.</p>' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Một người viết câu lệnh dưới đây với ý định "cho QEMU chạy trong terminal, và cho tôi vào ' +
         'monitor để xem thanh ghi". Nhưng QEMU từ chối chạy:',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -nographic -monitor stdio -S' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'qemu-system-aarch64: cannot use stdio by multiple character devices\n' +
          'qemu-system-aarch64: could not connect serial device to character backend \'stdio\'' }
      ],
      rows: 5,
      ph: 'Xung đột nằm ở… vì -nographic thực chất làm… nên sửa thành…',
      hint: 'Đọc kỹ chữ <i>multiple</i> trong thông báo. Có hai thứ đang cùng đòi một tài nguyên. ' +
            'Tra xem <code>-nographic</code> âm thầm làm gì với cổng serial.',
      crit: [
        'Chỉ ra hai thứ cùng đòi stdio: cổng serial (do -nographic tự gán) và monitor (do -monitor stdio)',
        'Giải thích -nographic không chỉ là "tắt cửa sổ" mà còn tự chuyển serial ra stdio',
        'Đưa ra câu lệnh sửa đúng, thay -nographic bằng -display none -serial null',
        'Có xác nhận đã chạy thật và vào được dấu nhắc (qemu)'
      ],
      solBlocks: [
        { t: 'p', x: 'Nguyên nhân: <code>-nographic</code> không đơn thuần là "đừng mở cửa sổ". Nó là ' +
                     'một tuỳ chọn gộp — ngoài việc tắt đồ hoạ, nó còn <b>tự động nối cổng serial của ' +
                     'máy ảo vào stdio</b>. Khi bạn viết thêm <code>-monitor stdio</code>, cả cổng ' +
                     'serial lẫn monitor đều đòi cùng một terminal, mà một terminal thì không chia đôi ' +
                     'được. QEMU dừng lại với đúng chữ <i>multiple character devices</i>.' },
        { t: 'p', x: 'Cách sửa: tách bạch ba việc ra ba tuỳ chọn riêng, đừng dùng tuỳ chọn gộp.' },
        { t: 'code', where: 'wsl', name: 'câu lệnh đã sửa', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 \\\n' +
          '  -display none -serial null -monitor stdio -S' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'QEMU 10.2.1 monitor - type \'help\' for more information\n' +
          '(qemu)' },
        { t: 'cal', kind: 'info', title: 'Vì sao ba tuỳ chọn lại tốt hơn một',
          x: '<p><code>-display none</code> tắt đồ hoạ. <code>-serial null</code> vứt bỏ dữ liệu cổng ' +
             'serial (ta chưa nạp gì vào máy nên chẳng có gì để đọc). <code>-monitor stdio</code> giữ ' +
             'terminal cho riêng monitor. Mỗi tuỳ chọn làm đúng một việc, và không cái nào âm thầm ' +
             'thay đổi cái khác — nên khi có lỗi thì nhìn là biết ngay lỗi ở đâu. Đây cũng là lý do ' +
             'toàn bộ khoá học này dùng bộ ba đó thay vì <code>-nographic</code>.</p>' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Câu này chưa có lời giải trọn vẹn ở Bài 2 — cứ thử, đoán sai cũng không sao.<br><br>' +
         'Bạn vừa xác nhận ở câu E2 rằng CPU khởi động tại địa chỉ 0, và địa chỉ 0 nằm trong vùng ' +
         '<code>virt.flash0</code>. Nhưng câu lệnh QEMU đó <b>không nạp bất cứ thứ gì</b> vào máy ảo. ' +
         'Vậy:' +
         '<ul>' +
         '<li>Trong flash lúc đó thực sự chứa gì? Hãy dùng lệnh monitor <code>xp/4xw 0</code> ' +
         '(<i>examine physical memory</i>) để xem tận mắt.</li>' +
         '<li>Giá trị bạn thấy, khi CPU coi nó là <b>lệnh</b>, thì là lệnh gì? Chuyện gì xảy ra với ' +
         'CPU ngay sau đó?</li>' +
         '<li>Thử cả <code>x/8i 0</code> nữa và ghi lại QEMU trả lời gì.</li>' +
         '</ul>',
      rows: 6,
      ph: 'xp/4xw 0 cho ra… nghĩa là… nên CPU sẽ… còn x/8i 0 thì báo…',
      hint: 'Một vùng flash chưa ghi gì thì mọi ô đều mang cùng một giá trị. Sau đó hãy hỏi: kiến ' +
            'trúc ARM64 quy định mã lệnh toàn số 0 là lệnh gì — hợp lệ hay không hợp lệ?',
      crit: [
        'Chạy được xp/4xw 0 và ghi lại kết quả: bốn từ đều là 0x00000000',
        'Nhận ra flash trống nên CPU sẽ nạp mã lệnh 0x00000000',
        'Biết được 0x00000000 KHÔNG phải lệnh hợp lệ trong ARM64 (là UDF — undefined instruction)',
        'Suy ra CPU lập tức nhận ngoại lệ, và vì chưa có bảng xử lý ngoại lệ nào nên nó quẩn vô hạn',
        'Ghi lại được câu trả lời thật của x/8i 0: "Asm output not supported on this arch"',
        'Nối được sang việc học sắp tới: Chặng 06 sẽ nạp U-Boot thật vào chính vùng flash này'
      ],
      solBlocks: [
        { t: 'code', where: 'qemu', code: 'xp/4xw 0' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '0000000000000000: 0x00000000 0x00000000 0x00000000 0x00000000' },
        { t: 'p', x: 'Flash <b>trống rỗng</b> — không có gì ở đó cả. Nhưng CPU không biết điều đó: nó ' +
                     'vẫn nạp bốn byte tại địa chỉ 0 và coi đó là một lệnh. Trong kiến trúc ARM64, mã ' +
                     'lệnh <code>0x00000000</code> là <b>UDF</b> — <i>permanently undefined</i>, tức ' +
                     'một lệnh được định nghĩa sẵn là <b>không hợp lệ</b>. CPU lập tức nhận ngoại lệ; ' +
                     'nhưng bảng xử lý ngoại lệ cũng chưa ai dựng, nên nó lại nhảy vào vùng trống, lại ' +
                     'gặp UDF, và cứ thế quẩn vô hạn. Máy "chạy" mà không làm gì cả — đúng nghĩa đen.' },
        { t: 'code', where: 'qemu', code: 'x/8i 0' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '0x00000000: Asm output not supported on this arch' },
        { t: 'cal', kind: 'info', title: 'Một giới hạn thật của công cụ, đáng biết sớm',
          x: '<p>Monitor của QEMU <b>không có</b> bộ dịch ngược mã lệnh cho ARM64 — <code>x/Ni</code> ' +
             'chỉ chạy trên một vài kiến trúc. Muốn xem mã lệnh dạng chữ thì phải dùng công cụ khác: ' +
             '<code>objdump -d</code> trên file ELF, hoặc nối <code>gdb-multiarch</code> vào QEMU. ' +
             'Đây là điều bình thường trong nghề — mỗi công cụ có một góc nhìn, và biết công cụ nào ' +
             '<i>không</i> làm được gì cũng quan trọng ngang biết nó làm được gì.</p>' },
        { t: 'cal', kind: 'tip', title: 'Chỗ trống này sắp được lấp',
          x: '<p>Vùng <code>virt.flash0</code> trống trơn mà bạn vừa nhìn thấy chính là nơi ' +
             '<b>Chặng 06</b> sẽ nạp một bản U-Boot thật vào. Lúc đó chạy lại <code>xp/4xw 0</code> ' +
             'bạn sẽ không còn thấy toàn số 0 nữa, và CPU khởi động tại địa chỉ 0 sẽ gặp một lệnh có ' +
             'nghĩa thật sự. Toàn bộ giai đoạn 2 trong sơ đồ sáu giai đoạn của Bài 2 sẽ hiện ra ngay ' +
             'trước mắt bạn, chạy thật, dừng được, xem được thanh ghi.</p>' }
      ] }
  ],

  /* ══════════════════════════════════════════════
     PHẦN F — BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Không phải câu hỏi. Đây là bảng tra: sai câu nào thì đọc lại mục nào.
     ══════════════════════════════════════════════ */
  diag: [
    ['A1, B1, E2',
     'Chưa nắm được reset vector: CPU bắt đầu ở một địa chỉ cố định do phần cứng quy định, và ' +
     'địa chỉ đó không nằm trong DRAM.',
     '<a href="#/bai-02#giai-doan-0-rom-code">Đọc lại "Giai đoạn 0 — ROM code" (Bài 2)</a>'],

    ['A2, B1, B3, C1',
     'Chưa thấy được vì sao DRAM chưa dùng được lúc t = 0, nên chưa hiểu vì sao phải có SPL và vì ' +
     'sao SPL buộc phải tí hon.',
     '<a href="#/bai-02#giai-doan-1-spl-bootloader-tang-mot">Đọc lại "Giai đoạn 1 — SPL" (Bài 2)</a>'],

    ['A3, B4, C3',
     'Vẫn đang hình dung các giai đoạn xếp chồng lên nhau và cùng chạy. Thực tế mỗi giai đoạn bàn ' +
     'giao xong là biến mất, nên không tầng nào giám sát được tầng sau.',
     '<a href="#/bai-02#moi-giai-doan-ban-giao-cai-gi">Đọc lại "Mỗi giai đoạn bàn giao cái gì" (Bài 2)</a>'],

    ['A4, B5, C2',
     'Chưa nắm bootargs là kênh liên lạc duy nhất từ bootloader sang kernel — đặc biệt vai trò của ' +
     '<code>console=</code> khi màn hình im lặng.',
     '<a href="#/bai-02#giai-doan-2-u-boot-day-du">Đọc lại "Giai đoạn 2 — U-Boot đầy đủ" (Bài 2)</a>'],

    ['A5',
     'Chưa phân biệt được ROM code (nằm cứng trong silicon, không sửa được) với U-Boot (nằm trên ' +
     'flash, cập nhật được).',
     '<a href="#/bai-02#giai-doan-0-rom-code">Đọc lại "Giai đoạn 0 — ROM code" (Bài 2)</a>'],

    ['A6',
     'Chưa nắm vai trò đặc biệt của PID 1: kernel không hồi sinh init, init thoát ra là panic.',
     '<a href="#/bai-02#giai-doan-4-init-tien-trinh-so-1">Đọc lại "Giai đoạn 4 — init" (Bài 2)</a>'],

    ['A7, A8',
     'Chưa thuộc thứ tự sáu giai đoạn và nhiệm vụ đặc trưng của từng giai đoạn.',
     '<a href="#/bai-02#sau-giai-doan-theo-dung-thu-tu">Đọc lại "Sáu giai đoạn, theo đúng thứ tự" (Bài 2)</a>'],

    ['B2, E1',
     'Chưa hiểu vùng <code>__init</code> / initmem là gì và vì sao dòng "Freeing unused kernel image" ' +
     'lại là một cột mốc đáng chú ý trong log.',
     '<a href="#/bai-02#giai-doan-3-linux-kernel">Đọc lại "Giai đoạn 3 — Linux kernel" (Bài 2)</a>'],

    ['B6, C4, C5',
     'Chưa quen dùng sơ đồ sáu giai đoạn như một cái thước: mỗi công cụ chỉ đo được giai đoạn nó ' +
     'sống trong đó, và muốn cắt thời gian boot thì phải biết cắt ở giai đoạn nào.',
     '<a href="#/bai-02#chan-doan-thiet-bi-chet-o-giai-doan-nao">Đọc lại "Chẩn đoán: thiết bị chết ở giai đoạn nào" (Bài 2)</a>'],

    ['D1',
     'Ôn lại Bài 1: MMU là ranh giới cứng quyết định chạy được Linux đầy đủ hay không — không phải ' +
     'dung lượng RAM hay tốc độ CPU.',
     '<a href="#/bai-01#vay-embedded-linux-la-gi">Đọc lại "Vậy Embedded Linux là gì" (Bài 1)</a>'],

    ['D2',
     'Ôn lại Bài 1: bốn mảnh ghép chạy nối tiếp, nên đọc triệu chứng là khoanh được vùng mảnh nào hỏng.',
     '<a href="#/bai-01#bon-manh-ghep-cua-mot-he-embedded-linux">Đọc lại "Bốn mảnh ghép" (Bài 1)</a>'],

    ['D3',
     'Ôn lại Bài 1: phần cứng nhúng không tự khai báo, phải mô tả bằng Device Tree thì kernel mới ' +
     'biết thiết bị tồn tại.',
     '<a href="#/bai-01#khac-gi-so-voi-ubuntu-tren-may-tinh">Đọc lại "Khác gì so với Ubuntu trên máy tính" (Bài 1)</a>'],

    ['E3',
     'Chưa quen đọc <code>/proc/cmdline</code> và tách chuỗi bootargs ra cho dễ nhìn — đây là thao ' +
     'tác chẩn đoán đầu tiên khi board khởi động sai.',
     '<a href="#/bai-02#thuc-hanh-doc-luong-khoi-dong-that">Đọc lại phần "Thực hành: đọc luồng khởi động thật" (Bài 2)</a>'],

    ['E4, E5, E6',
     'Chưa quen bộ tuỳ chọn QEMU của khoá học (<code>-display none -serial null -monitor stdio -S</code>) ' +
     'và vì sao không dùng <code>-nographic</code>.',
     '<a href="#/bai-02#loi-thuong-gap">Đọc lại "Lỗi thường gặp" (Bài 2)</a>']
  ]
});

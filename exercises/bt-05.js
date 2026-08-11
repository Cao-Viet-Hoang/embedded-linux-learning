/* ============================================================
   BT-05 — Bài tập cho Bài 5: "Hệ thống file Linux (FHS)"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                                | PT | GIA | NGC | Tổng |
   |---------------------------------------------------------|----|-----|-----|------|
   | /proc và /sys sinh nội dung LÚC ĐỌC, 0 byte trên đĩa     | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | File trong /dev không chứa dữ liệu; major–minor mới trỏ  | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | Thư mục RỖNG trong rootfs là điểm gắn, không phải rác    | 2  |  2  |  2  |  6   |  ← TRỤC 3
   | Một cây duy nhất, không có ổ C: — ổ đĩa được GẮN vào cây | 2  |  1  |  2  |  5   |
   | Đường dẫn tương đối phụ thuộc thư mục làm việc lúc chạy  | 2  |  2  |  1  |  5   |
   | usr-merge: /bin, /sbin, /lib chỉ là liên kết tới /usr    | 1  |  1  |  2  |  4   |
   | Bảy loại file trong ký tự đầu của ls -l (- d l c b p s)  | 1  |  1  |  1  |  3   |
   | /etc là văn bản thuần nên sao lưu và diff được           | 1  |  1  |  1  |  3   |
   | Tên các thư mục FHS viết tắt của cái gì (etc, var, opt)  | 0  |  0  |  1  |  1   |
   | /boot rỗng trên WSL2                                     | 0  |  0  |  1  |  1   |

   Bước 3 — cắt: ba ứng viên 6 điểm, đủ và vừa đúng ba. Hai ứng viên 5 điểm
   xuống mức hỏi MỘT lần: "một cây duy nhất" ở A5, "đường dẫn tương đối phụ
   thuộc thư mục làm việc" ở B3 và E2. usr-merge ở A6.

   Bước 4 — loại: tên viết tắt của các thư mục FHS và "/boot rỗng trên WSL2"
   bị loại theo §13.3 — tra được trong mười giây, và cái thứ hai là một sự
   thật về MÁY người học chứ không phải một nguyên lý.
   Kiểm tra chống trùng với các bộ trước: bt-01 xoáy MMU / bốn mảnh nối tiếp /
   Device Tree; bt-02 xoáy DRAM-SRAM-SPL / bàn giao rồi biến mất / bootargs;
   bt-03 xoáy ảo hoá cần cùng kiến trúc / hai họ QEMU / ranh giới 9P;
   bt-04 xoáy $? sống một lệnh / builtin thắng file ngoài / cắt theo khoảng
   trắng. Ba trục của bộ này không trùng cái nào — hợp lệ.

   Bước 6 — hiểu sai đối lập của từng trục nằm trong trường `mis` bên dưới.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (sinh lúc đọc)  A2 phát biểu → B1 ba công cụ thật cãi nhau về cùng
                                           một file (0 / 9294 / 0)
                                         → C1 rootfs sao lưu xong khôi phục hỏng
     Trục 2 (major–minor)   A3 phát biểu → B4 ls -l /dev thật + hai cột lạ
                                         → C3 board mới, /dev/i2c-1 không có
     Trục 3 (thư mục rỗng)  A4 phát biểu → B5 /proc/mounts + stat -f thật
                                         → C2 cắt rootfs cho 8 MB flash

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, kernel 6.18.33.2-microsoft-
   standard-WSL2) ngày 2026-08-11.

   MỘT MÂU THUẪN ĐÃ ĐƯỢC TRUY NGUYÊN TRƯỚC KHI DÙNG: với /dev,
   `stat -f -c %T` trả về `tmpfs` trong khi /proc/mounts ghi `devtmpfs`. Cả hai
   đều đúng — devtmpfs được cài đặt bên trên tmpfs nên statfs() trả về đúng số
   magic của tmpfs. Vì thế mọi câu CHẤM ĐIỂM trong bộ này đều lấy /proc/mounts
   làm nguồn, còn mâu thuẫn kia chỉ được kể lại trong phần `why` của B5.

   HAI CON SỐ CỐ Ý KHÔNG CHẤM: số hiệu tiến trình trong /proc/self (đổi mỗi
   lần chạy) và giá trị rx_bytes (tăng liên tục). Câu B2 và E6 chấm phần GIẢI
   THÍCH chứ không chấm con số.
   ============================================================ */
Exercise.register({
  id: 'bt-05',
  minutes: 85,

  intro:
    '<p>Bài 5 dạy bạn cây thư mục Linux. Bộ bài tập này kiểm tra một thứ khác hẳn: bạn có phân biệt ' +
    'được <b>file thật</b> với <b>file không có thật</b> không.</p>' +
    '<p>Ba trong số các kết quả thật bạn sắp đọc đều vô lý nếu bạn còn nghĩ mọi file đều nằm trên đĩa: ' +
    'một file mà <code>ls -l</code> báo <b>0 byte</b> nhưng <code>wc -c</code> đọc ra <b>9294 byte</b>; ' +
    'một thư mục mà <code>du -sh</code> báo <b>0</b> trong khi bên trong có hàng nghìn mục; và một liên ' +
    'kết mà đọc ba lần liên tiếp ra <b>ba số khác nhau</b>. Cả ba đều là cùng một cơ chế, và cơ chế đó ' +
    'là thứ bạn sẽ dùng để chẩn đoán mọi board ở Chặng 08 và Chặng 10 — nơi không có màn hình, không có ' +
    'log, chỉ có <code>cat</code> và một cây thư mục.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Phần D lần này ôn Bài 2, Bài 3 và Bài 4 — cả ba đều là thứ phần C cần dùng lại ngay.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` và `mis` là tài liệu cho người viết
     bài tập sau, không được render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'sinh-luc-doc',
      name: '/proc và /sys được sinh ra lúc bạn đọc',
      x: '/proc và /sys không chiếm byte nào trên đĩa. Chúng là giao diện dạng file tới các cấu trúc dữ ' +
         'liệu đang sống trong RAM của kernel: mỗi lần bạn open() rồi read(), kernel mới chạy một hàm để ' +
         'sinh ra nội dung ngay tại thời điểm đó. Vì nội dung chưa tồn tại trước khi đọc, kernel không ' +
         'có gì để khai báo trong trường kích thước, nên nó khai 0.',
      mis: 'Đó là các file văn bản do hệ thống ghi ra lúc khởi động rồi để đó; ls -l báo 0 byte là do ' +
           'file hỏng, do thiếu quyền, hoặc do file rỗng thật — và sao lưu rootfs thì phải sao lưu cả ' +
           'chúng cho đủ.' },

    { id: 'major-minor',
      name: 'File trong /dev không chứa dữ liệu — major và minor mới là thứ trỏ đi',
      x: 'Một file thiết bị chiếm 0 byte và không lưu gì cả. Nó chỉ mang ba thông tin: loại (c hay b), ' +
         'số major và số minor. Kernel dùng major để tra ra ĐOẠN MÃ TRÌNH ĐIỀU KHIỂN nào sẽ xử lý lời ' +
         'gọi, và dùng minor để trình điều khiển đó biết nó đang được hỏi về thiết bị thứ mấy. Cái tên ' +
         'file chỉ để cho con người đọc; đổi tên không đổi gì hết.',
      mis: '/dev/sda "chứa" toàn bộ dữ liệu của ổ đĩa nên nó phải rất lớn; hai số 1, 3 in ra ở cột giữa ' +
           'là kích thước; và xoá nhầm file trong /dev thì mất thiết bị vĩnh viễn.' },

    { id: 'diem-gan',
      name: 'Một thư mục rỗng trong rootfs là một điểm gắn',
      x: 'Trong ảnh rootfs bạn build, /proc, /sys, /dev, /tmp và /run đều là thư mục RỖNG — không byte ' +
         'nào. Chúng tồn tại để lúc chạy có chỗ mà gắn proc, sysfs, devtmpfs và tmpfs vào. Thiếu chúng ' +
         'thì hệ thống VẪN BOOT, không báo lỗi gì rõ ràng, nhưng ps, top, free, mọi công cụ chẩn đoán và ' +
         'phần lớn trình điều khiển đều mù.',
      mis: 'Thư mục rỗng thì không chứa gì, nên xoá đi để tiết kiệm flash; hoặc: nếu thiếu nó thì hệ ' +
           'thống sẽ báo lỗi ngay lúc boot nên chắc chắn phát hiện được.' },
  ],

  /* ══════════════════════════════════════════════
     PHẦN A — NHẬN BIẾT (8 câu)
     4 trắc nghiệm · 2 đúng-sai kèm sửa · 1 điền khuyết · 1 ghép nối
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Câu "trong Linux mọi thứ là file" nói chính xác điều gì?',
      opts: [
        'Mọi dữ liệu trong máy — kể cả bộ nhớ RAM và trạng thái CPU — đều được ghi xuống đĩa dưới dạng file.',
        'Rất nhiều loại đối tượng khác nhau (file thường, ổ đĩa, cổng serial, tiến trình, thiết lập ' +
          'kernel) đều <b>lộ ra dưới cùng một giao diện</b>: có đường dẫn, và mở / đọc / ghi / đóng được ' +
          'bằng đúng bốn lời gọi hệ thống như nhau.',
        'Mọi file trong Linux đều là văn bản thuần, không có file nhị phân.',
        'Mọi chương trình đều phải thao tác qua file, không được dùng bộ nhớ trực tiếp.'
      ],
      a: 1,
      why: 'Đây là một câu về <b>giao diện</b>, không phải về nơi cất dữ liệu. Điều Linux thống nhất là ' +
           '<i>cách gọi</i>: <code>open</code>, <code>read</code>, <code>write</code>, ' +
           '<code>close</code>. Cùng bốn lời gọi đó dùng được cho một file văn bản trên đĩa, cho cổng ' +
           'serial của board, cho nhiệt độ CPU trong <code>/sys</code>, cho một tiến trình đang chạy ' +
           'trong <code>/proc</code>.<br><br>' +
           'Hệ quả rất cụ thể, và bạn sẽ sống bằng nó suốt phần còn lại của khoá học: một công cụ biết ' +
           'đọc file thì <b>tự động</b> biết đọc phần cứng. Bạn không cần API riêng, không cần thư ' +
           'viện, không cần chương trình chuyên dụng — <code>cat</code> và <code>echo</code> là đủ để ' +
           'đọc và điều khiển thiết bị. Trên một board không màn hình, đó thường là toàn bộ những gì ' +
           'bạn có.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: '<code>ls -l /proc/cpuinfo</code> báo kích thước <b>0</b>, nhưng <code>cat /proc/cpuinfo</code> ' +
         'in ra kín màn hình. Phát biểu nào <b>đúng</b>?',
      opts: [
        'File bị hỏng hoặc bị cắt cụt; nội dung in ra là bản nằm trong bộ nhớ đệm, đọc lại sau khi khởi ' +
          'động lại sẽ mất.',
        'File có nội dung thật trên đĩa nhưng <code>ls</code> không có quyền đọc kích thước nên báo 0.',
        'Nội dung <b>chưa hề tồn tại</b> trước khi bạn đọc: mỗi lần có tiến trình mở và đọc, kernel mới ' +
          'chạy một hàm sinh ra chuỗi ký tự đó ngay lúc ấy. Không có gì để đo nên trường kích thước là 0.',
        'Kích thước 0 là quy ước riêng của các file chỉ đọc; file nào không cho ghi thì đều báo 0.'
      ],
      a: 2,
      why: 'Trường kích thước trong <code>ls -l</code> là thứ <b>hệ thống file khai báo</b>, không phải ' +
           'thứ <code>ls</code> tự đo. Với một file trên ext4, con số ấy có sẵn trong inode. Với ' +
           '<code>/proc</code>, không có inode nào chứa nội dung: kernel chỉ đăng ký "khi ai đó đọc mục ' +
           'này thì gọi hàm <code>cpuinfo_show()</code>". Trước lúc bạn đọc, chuỗi ký tự đó chưa được ' +
           'sinh ra ở đâu cả, nên không có con số nào để khai — kernel khai <b>0</b>.<br><br>' +
           '<b>Cơ chế</b> này đúng với toàn bộ <code>/proc</code> và <code>/sys</code> — nhưng riêng ' +
           'con số 0 thì chỉ đúng với <code>/proc</code>: một thuộc tính trong <code>/sys</code> khai ' +
           '<b>4096</b>, và câu E1 sẽ cho bạn thấy con số đó cũng sai nốt. Cơ chế chung có ba hệ quả ' +
           'bạn dùng được ngay: (1) <code>du -sh /proc</code> ra <b>0</b> dù bên trong có hàng nghìn ' +
           'mục; (2) đọc cùng một file hai lần có thể ra hai kết quả khác nhau, vì hàm sinh nội dung ' +
           'chạy lại; (3) sao lưu rootfs thì <b>không</b> được sao lưu chúng — chép cái bóng của trạng ' +
           'thái máy cũ sang máy mới là vô nghĩa. Câu B1 cho bạn nhìn ba công cụ cãi nhau về đúng file ' +
           'này, còn C1 cho thấy hệ quả (3) làm hỏng một bản khôi phục như thế nào.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Dòng <code>crw-rw-rw- 1 root root 1, 3 Aug 11 21:30 /dev/null</code>. Cặp số ' +
         '<b><code>1, 3</code></b> ở vị trí mà file thường ghi kích thước — nó là gì?',
      opts: [
        'Kích thước file, ghi kiểu "1 kilobyte 3 byte".',
        'Số inode và số liên kết cứng của file thiết bị.',
        '<b>Major</b> và <b>minor</b>: kernel tra <b>major</b> để biết đoạn mã trình điều khiển nào xử ' +
          'lý, rồi đưa <b>minor</b> cho trình điều khiển đó để nó biết đang được hỏi về thiết bị thứ mấy.',
        'Phiên bản của trình điều khiển đang phục vụ thiết bị này.'
      ],
      a: 2,
      why: 'File thiết bị <b>không chứa dữ liệu</b>, nên trường kích thước bị bỏ trống và ' +
           '<code>ls</code> dùng chỗ đó để in cặp số thật sự quan trọng.<br><br>' +
           'Hãy đọc cặp số như một <b>địa chỉ hai tầng</b>. <code>major</code> là "gọi ai": kernel giữ ' +
           'một bảng ánh xạ số major sang trình điều khiển đã đăng ký. <code>minor</code> là "cái nào ' +
           'trong số đó": chính trình điều khiển ấy diễn giải, và người ngoài không cần biết nó nghĩa ' +
           'gì. Bằng chứng ngay trong kết quả thật trên máy bạn: <code>/dev/null</code> là ' +
           '<code>1, 3</code>, <code>/dev/zero</code> là <code>1, 5</code>, <code>/dev/full</code> là ' +
           '<code>1, 7</code>, <code>/dev/random</code> là <code>1, 8</code> — <b>cùng major 1</b>, tức ' +
           'là cùng một trình điều khiển <code>mem</code> phục vụ cả bốn, chỉ khác nhau ở minor. Còn ' +
           '<code>/dev/sda</code> là <code>8, 0</code> và <code>/dev/kvm</code> là ' +
           '<code>10, 232</code> — hai trình điều khiển hoàn toàn khác.<br><br>' +
           'Hệ quả để nhớ: cái <b>tên</b> file chỉ dành cho con người. Tự tạo một file thiết bị tên ' +
           '<code>/dev/banana</code> với đúng cặp <code>1, 3</code> thì nó hoạt động y hệt ' +
           '<code>/dev/null</code>. Ở Chặng 10, khi bạn viết trình điều khiển đầu tiên, việc đăng ký ' +
           'một số major chính là bước đầu tiên.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Bạn mở ảnh rootfs sắp nạp vào board và thấy <code>/proc</code>, <code>/sys</code>, ' +
         '<code>/dev</code>, <code>/tmp</code> đều là thư mục <b>rỗng, 0 byte</b>. Kết luận nào đúng?',
      opts: [
        'Ảnh rootfs bị build hỏng — bốn thư mục đó lẽ ra phải có nội dung, phải build lại.',
        'Đúng như phải thế: chúng là <b>điểm gắn</b>. Rỗng lúc này là bình thường, vì nội dung sẽ do ' +
          'kernel đổ vào lúc chạy khi <code>proc</code>, <code>sysfs</code>, <code>devtmpfs</code> và ' +
          '<code>tmpfs</code> được gắn lên chúng.',
        'Chúng rỗng vì công cụ build đã lọc bỏ nội dung cho nhẹ; nên xoá luôn bốn thư mục để tiết kiệm flash.',
        'Chúng rỗng vì bạn đang xem bằng tài khoản thường, có quyền root sẽ thấy nội dung.'
      ],
      a: 1,
      why: 'Gắn (mount) một hệ thống file là <b>phủ</b> nó lên một thư mục đã có. Thư mục đó phải tồn ' +
           'tại trước, và nội dung cũ của nó (nếu có) sẽ bị che khuất trong suốt thời gian gắn. Vì vậy ' +
           'điểm gắn đúng chuẩn là một thư mục rỗng — nó không phải rác, nó là <b>chỗ trống có chủ ' +
           'đích</b>.<br><br>' +
           'Phần nguy hiểm là cái giá của việc thiếu nó, và nó ngược hẳn trực giác: hệ thống ' +
           '<b>vẫn boot</b>. Không có thông báo lỗi nào nói "thiếu /proc". Cái bạn nhận được là một ' +
           'board chạy được nhưng <code>ps</code> không liệt kê được tiến trình nào, <code>free</code> ' +
           'không đọc được bộ nhớ, <code>top</code> trống trơn, và nhiều trình điều khiển im lặng ' +
           'không nạp. Nghĩa là bạn mất đúng bộ công cụ dùng để tìm hiểu xem chuyện gì đang xảy ra, ' +
           'vào đúng lúc cần nó nhất. Câu C2 bắt bạn ra quyết định này với một con chip flash 8 MB.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Linux cũng có ổ đĩa như Windows, chỉ khác cách viết: ổ C: của Windows tương ứng ' +
         'với <code>/dev/sda1</code>, ổ D: tương ứng với <code>/dev/sdb1</code>. Muốn xem nội dung ổ thứ ' +
         'hai thì gõ <code>cd /dev/sdb1</code>."</i>',
      a: 1,
      why: 'Hai sai lầm chồng lên nhau, và cái thứ hai là cái làm người mới bế tắc.<br><br>' +
           '<b>Sai thứ nhất — không có chữ cái ổ đĩa.</b> Linux chỉ có <b>một</b> cây, gốc là ' +
           '<code>/</code>. Ổ đĩa thứ hai không thành một cây riêng; nó được <b>gắn vào một thư mục</b> ' +
           'trong cây đang có, ví dụ <code>/mnt/data</code>. Ưu điểm rất thực tế cho hệ nhúng: chương ' +
           'trình chỉ cần biết đường dẫn <code>/mnt/data/log</code>, còn phía dưới là thẻ SD, eMMC hay ' +
           'ổ mạng thì nó không cần biết và không phải sửa dòng code nào.<br><br>' +
           '<b>Sai thứ hai — <code>/dev/sdb1</code> không phải nơi chứa file.</b> Nó là <b>file thiết ' +
           'bị</b>: một cửa vào ổ đĩa ở mức khối byte thô, không có thư mục nào bên trong để mà ' +
           '<code>cd</code>. Đường vào dữ liệu là <b>điểm gắn</b>, không phải file thiết bị. Đây chính ' +
           'là lý do câu lệnh gắn luôn có <b>hai</b> đối số: <code>mount /dev/sdb1 /mnt/data</code> — ' +
           'cái gì, và gắn vào đâu.',
      rw: 'Viết lại nhận định cho đúng: nói rõ Linux tổ chức ổ đĩa thế nào, <code>/dev/sdb1</code> ' +
          'thật ra là gì, và muốn xem nội dung ổ thứ hai thì làm gì.',
      crit: [
        'Bác bỏ ý "chữ cái ổ đĩa" — Linux chỉ có MỘT cây, gốc là /',
        'Nói rõ ổ đĩa được GẮN (mount) vào một thư mục trong cây, ví dụ /mnt/data',
        'Nói rõ /dev/sdb1 là FILE THIẾT BỊ (cửa vào ổ ở mức byte thô), không phải thư mục, không cd vào được',
        'Nêu đúng cách xem nội dung: mount /dev/sdb1 /mnt/data rồi cd /mnt/data',
        'Nêu được ích lợi của mô hình một cây: chương trình chỉ biết đường dẫn, không cần biết bên dưới là thiết bị gì'
      ],
      sol: 'Linux không có chữ cái ổ đĩa. Toàn hệ thống là <b>một cây duy nhất</b> bắt đầu từ ' +
           '<code>/</code>, và một ổ đĩa mới được <b>gắn</b> vào một thư mục nào đó của cây đó — ' +
           '<code>mount /dev/sdb1 /mnt/data</code>, rồi <code>cd /mnt/data</code>. ' +
           '<code>/dev/sdb1</code> bản thân nó không chứa thư mục nào: đó là file thiết bị, cửa vào ổ ' +
           'đĩa ở mức khối byte thô, dùng cho <code>mount</code>, <code>mkfs</code> hay ' +
           '<code>dd</code>. Lợi ích của mô hình một cây: chương trình chỉ cần biết ' +
           '<code>/mnt/data/log</code>; hôm nay bên dưới là thẻ SD, mai đổi sang eMMC hay ổ mạng thì ' +
           'không sửa một dòng code nào.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Trên Ubuntu hiện nay <code>/bin</code> chỉ là một liên kết trỏ tới ' +
         '<code>/usr/bin</code>. Vậy <code>/bin</code> và <code>/usr/bin</code> là hai bản sao của cùng ' +
         'một bộ chương trình, xoá bớt một bản đi thì vẫn còn bản kia."</i>',
      a: 1,
      why: 'Nửa đầu đúng, nửa sau sai theo kiểu phá hỏng máy.<br><br>' +
           '<b>Nửa đúng:</b> Ubuntu hiện đại đã làm <i>usr-merge</i>. <code>ls -l /</code> trên máy bạn ' +
           'cho thấy <code>bin -&gt; usr/bin</code>, <code>sbin -&gt; usr/sbin</code>, ' +
           '<code>lib -&gt; usr/lib</code>. Lý do lịch sử rất đời thường: những năm 1970 ổ đĩa gốc quá ' +
           'nhỏ nên người ta phải đẩy bớt chương trình sang ổ thứ hai gắn ở <code>/usr</code>. Ràng ' +
           'buộc đó biến mất từ lâu, nhưng cái tên thì ở lại nửa thế kỷ.<br><br>' +
           '<b>Nửa sai:</b> liên kết <b>không</b> phải bản sao. Chỉ có <b>một</b> bộ file thật, nằm ở ' +
           '<code>/usr/bin</code>; <code>/bin</code> chỉ là một tấm biển chỉ đường trỏ vào đó. Xoá ' +
           '<code>/usr/bin</code> là xoá file thật và <code>/bin</code> lập tức trỏ vào hư không — máy ' +
           'không còn <code>ls</code>, không còn <code>cat</code>, thường là không boot lại được. Cách ' +
           'kiểm tra trong mười giây: <code>ls -l /</code>, ký tự đầu <code>l</code> nghĩa là liên ' +
           'kết; hoặc so <code>stat -c %i</code> hai đường dẫn, cùng số inode nghĩa là cùng một file.',
      rw: 'Viết lại nhận định cho đúng: nói rõ liên kết khác bản sao ở chỗ nào, vì sao lịch sử lại ' +
          'sinh ra hai đường dẫn, và cách kiểm chứng.',
      crit: [
        'Xác nhận nửa đúng: /bin, /sbin, /lib nay là liên kết tượng trưng tới /usr/bin, /usr/sbin, /usr/lib',
        'Bác bỏ ý "hai bản sao" — chỉ có MỘT bộ file thật, liên kết chỉ là tên gọi khác trỏ vào đó',
        'Nói rõ hậu quả nếu xoá /usr/bin: /bin trỏ vào chỗ trống, mất toàn bộ lệnh',
        'Nêu đúng lý do lịch sử: ổ đĩa gốc thời xưa quá nhỏ nên phải đẩy chương trình sang ổ gắn ở /usr',
        'Nêu được ít nhất một cách kiểm chứng: ls -l / thấy ký tự l, hoặc so sánh inode bằng stat -c %i'
      ],
      sol: 'Đúng là <code>/bin</code>, <code>/sbin</code> và <code>/lib</code> nay chỉ là <b>liên kết ' +
           'tượng trưng</b> tới <code>/usr/bin</code>, <code>/usr/sbin</code>, <code>/usr/lib</code> ' +
           '(usr-merge). Nhưng liên kết <b>không phải bản sao</b>: file thật chỉ có một bộ, nằm dưới ' +
           '<code>/usr</code>, còn <code>/bin</code> là tên gọi thứ hai trỏ vào đúng chỗ đó — nên xoá ' +
           '<code>/usr/bin</code> là mất sạch lệnh, không còn "bản kia" nào cả. Sự chia đôi này chỉ là ' +
           'di sản của thời ổ đĩa gốc quá nhỏ, phải gắn thêm ổ thứ hai ở <code>/usr</code>. Kiểm chứng: ' +
           '<code>ls -l /</code> thấy ký tự đầu là <code>l</code> và mũi tên <code>-&gt;</code>, hoặc ' +
           '<code>stat -c %i /bin/ls /usr/bin/ls</code> ra cùng một số inode.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Ký tự <b>đầu tiên</b> của mỗi dòng <code>ls -l</code> cho biết loại file. Với ' +
         '<code>/dev/sda</code> — một ổ đĩa — ký tự đó là gì? (viết đúng một ký tự thường)',
      a: ['b'],
      ph: 'một ký tự',
      why: '<code>b</code> = <b>block device</b>, thiết bị khối. Cặp bạn phải phân biệt được là ' +
           '<code>b</code> và <code>c</code>, vì nó quyết định cách kernel nói chuyện với phần cứng.<br><br>' +
           '<b><code>b</code> — thiết bị khối:</b> dữ liệu có địa chỉ, đọc ghi theo từng khối cố định ' +
           '(thường 512 byte hoặc 4 KB), nhảy đến khối bất kỳ được, và kernel <b>đệm</b> lại vì đọc ' +
           'trước có ích. Ổ cứng, thẻ SD, eMMC, phân vùng flash đều là <code>b</code>.<br><br>' +
           '<b><code>c</code> — thiết bị ký tự:</b> một dòng byte chảy qua theo thời gian, không có ' +
           '"khối thứ 100" để nhảy tới, không đệm. Cổng serial, bàn phím, ' +
           '<code>/dev/null</code>, chân GPIO, bus I2C đều là <code>c</code>. Phần lớn thiết bị bạn ' +
           'gặp trong nhúng thuộc nhóm này.<br><br>' +
           'Kết quả thật trên máy bạn xác nhận: <code>/dev/sda</code> mở đầu bằng <code>b</code>, còn ' +
           '<code>/dev/null</code>, <code>/dev/zero</code>, <code>/dev/kvm</code>, ' +
           '<code>/dev/hvc0</code> đều mở đầu bằng <code>c</code>. Năm ký tự còn lại: <code>-</code> ' +
           'file thường, <code>d</code> thư mục, <code>l</code> liên kết tượng trưng, <code>p</code> ' +
           'ống có tên, <code>s</code> socket.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi thư mục với <b>vai trò</b> của nó và với hệ quả thực tế khi bạn build rootfs cho một board.',
      left: [
        '<code>/etc</code>',
        '<code>/var</code>',
        '<code>/tmp</code>',
        '<code>/usr/bin</code>',
        '<code>/lib/modules</code>',
        '<code>/boot</code>'
      ],
      right: [
        'Kho <b>trình điều khiển rời</b> của kernel, chia theo phiên bản kernel. Sai phiên bản một chữ ' +
          'là không nạp được, nên nó phải khớp với ảnh kernel bạn nạp cùng.',
        'Nơi để <b>file tạm</b>, thường được gắn <code>tmpfs</code> nên nằm hoàn toàn trong RAM và sạch ' +
          'trơn sau mỗi lần khởi động lại.',
        'Chứa <b>ảnh kernel</b> và những gì bootloader cần đọc. Trên WSL2 nó <b>rỗng</b>, vì không có ' +
          'bootloader nào chạy trong đó.',
        'Toàn bộ <b>cấu hình dạng văn bản</b> của hệ thống. Vì là văn bản nên sao lưu, so sánh và đưa ' +
          'vào quản lý phiên bản được — sửa một board hỏng thường là sửa ở đây.',
        'Chỗ để dữ liệu <b>thay đổi liên tục</b>: log, hàng đợi, cache. Trên hệ nhúng đây là thư mục ' +
          'hay được đẩy vào RAM nhất, để tránh ghi mòn flash.',
        'Nơi đặt <b>phần lớn chương trình</b> mà người dùng gõ. Trên Ubuntu hiện nay ' +
          '<code>/bin</code> chỉ là liên kết trỏ vào đây.'
      ],
      a: [3, 4, 1, 5, 0, 2],
      why: 'Sáu thư mục này chia làm ba nhóm theo một câu hỏi rất thực tế: <b>ai ghi vào đó, và ghi lúc ' +
           'nào?</b><br><br>' +
           '<b>Chỉ đọc lúc chạy</b> — <code>/usr/bin</code>, <code>/lib/modules</code>, ' +
           '<code>/boot</code>: do bản build sinh ra, lúc chạy không ai sửa. Trên board thật, phân vùng ' +
           'chứa chúng thường được gắn <b>chỉ đọc</b>, và đó là cách rẻ nhất để một thiết bị sống sót ' +
           'qua việc bị rút điện đột ngột.<br><br>' +
           '<b>Đọc nhiều, ghi hiếm</b> — <code>/etc</code>: cấu hình, chỉ đổi khi người vận hành đổi.<br><br>' +
           '<b>Ghi liên tục</b> — <code>/var</code>, <code>/tmp</code>: đây là nơi làm mòn flash. Mẹo ' +
           'kinh điển trong nhúng là đẩy cả hai vào <code>tmpfs</code>, chấp nhận mất log sau mỗi lần ' +
           'khởi động lại để đổi lấy tuổi thọ của con chip. Bạn sẽ ra đúng quyết định này ở Chặng 09.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN B — THÔNG HIỂU (6 câu)
     2 giải thích vì sao · 1 so sánh cặp · 1 bắt lỗi phát biểu · 2 đọc output
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'multi', tag: 'Đọc output', truc: 0,
      q: 'Đây là một phiên chạy thật trên máy bạn. <b>Bốn công cụ</b> cùng nói về ' +
         '<code>/proc</code>, và thoạt nhìn chúng mâu thuẫn nhau. Chọn <b>tất cả</b> các phát biểu ' +
         '<b>đúng</b>.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'ls -l /proc/cpuinfo\n' +
            'wc -c < /proc/cpuinfo\n' +
            'du -sh /proc /sys /dev /etc\n' +
            'df -h /proc /sys /dev /tmp' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'kết quả thật', code:
            '-r--r--r-- 1 root root 0 Aug 11 21:30 /proc/cpuinfo\n' +
            '9294\n' +
            '0\t/proc\n' +
            '0\t/sys\n' +
            '0\t/dev\n' +
            '4.5M\t/etc\n' +
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            'proc               0     0     0    - /proc\n' +
            'sysfs              0     0     0    - /sys\n' +
            'none            2.4G     0  2.4G   0% /dev\n' +
            'tmpfs           2.5G     0  2.5G   0% /tmp' }
      ],
      opts: [
        '<code>/proc/cpuinfo</code> không chiếm byte nào trên đĩa; 9294 byte kia được kernel sinh ra ' +
          '<b>ngay lúc</b> <code>wc</code> đọc, rồi biến mất.',
        '<code>ls</code> báo 0 là sai — nó bị thiếu quyền nên không đo được; con số của ' +
          '<code>wc</code> mới là kích thước thật của file.',
        '<code>df</code> báo <code>Size 0</code> cho <code>proc</code> và <code>sysfs</code> vì hai hệ ' +
          'thống file này <b>không nằm trên thiết bị lưu trữ nào</b>, nên không có dung lượng để mà chia.',
        'Cột <code>Size</code> của <code>/dev</code> ghi <code>2.4G</code>, nghĩa là hiện có tới 2,4 GB ' +
          'dữ liệu thiết bị đang nằm trên đĩa.',
        'Chép <code>/proc</code> vào một bản sao lưu rootfs là vô nghĩa: bạn chỉ chụp lại trạng thái ' +
          'của <b>máy cũ tại một thời điểm</b>, và trạng thái đó không áp được lên máy khác.',
        'Nội dung <code>/proc/cpuinfo</code> nằm trong bộ nhớ đệm của đĩa, nên tắt máy là mất và lần ' +
          'sau đọc sẽ ra rỗng.',
        'Cột <code>Filesystem</code> ghi <code>proc</code>, <code>sysfs</code>, <code>none</code>, ' +
          '<code>tmpfs</code> — không có cái nào là một thiết bị kiểu <code>/dev/sda1</code>, đúng với ' +
          'việc chúng là hệ thống file <b>ảo</b>.'
      ],
      a: [0, 2, 4, 6],
      why: 'Bốn công cụ này không mâu thuẫn; chúng chỉ đang trả lời <b>bốn câu hỏi khác nhau</b>, và ' +
           'nhìn ra điều đó là toàn bộ bài học.<br><br>' +
           '<code>ls -l</code> và <code>du</code> đọc <b>trường kích thước do hệ thống file khai</b>. ' +
           'Với <code>/proc</code>, không có nội dung nào tồn tại sẵn để đo, nên kernel khai ' +
           '<b>0</b> — và <code>du -sh /proc</code> ra <code>0</code> chính là hệ quả trực tiếp của ' +
           'điều đó, dù bên trong có hàng nghìn mục. Đối chứng ngay bên cạnh: <code>/etc</code> ra ' +
           '<b>4.5M</b>, vì đó là file thật trên đĩa thật.<br><br>' +
           '<code>wc -c</code> thì <b>không tin trường kích thước</b>: nó mở file ra và đọc cho tới ' +
           'khi hết, rồi đếm. Chính hành động đọc ấy làm kernel chạy hàm sinh nội dung, và ' +
           '<b>9294</b> là số byte hàm đó sinh ra <i>lần này</i>.<br><br>' +
           '<code>df</code> hỏi <b>hệ thống file</b> chứ không hỏi file: "anh có bao nhiêu chỗ?". ' +
           '<code>proc</code> và <code>sysfs</code> trả lời <b>0</b> vì chúng không có kho nào cả. ' +
           '<code>/dev</code> và <code>/tmp</code> lại có số GB — chúng là <code>tmpfs</code>, sống ' +
           'trong <b>RAM</b>; con số đó là <i>trần được phép dùng</i>, và cột <code>Used</code> ghi ' +
           '<code>0</code> nên hiện chưa dùng gì. Vì thế ý thứ tư sai ở cả hai vế: không phải trên ' +
           'đĩa, và cũng không phải đang có 2,4 GB.<br><br>' +
           'Cách nhớ gọn: <b><code>ls</code> hỏi "anh khai bao nhiêu?", <code>wc</code> hỏi "đọc thật ' +
           'thì ra bao nhiêu?"</b>. Với file trên đĩa, hai câu trả lời trùng nhau. Với ' +
           '<code>/proc</code> và <code>/sys</code>, chúng không bao giờ trùng — và bạn nên tin ' +
           '<code>wc</code>.' },

    { id: 'b2', k: 'free', tag: 'Đọc output',
      q: 'Phiên chạy thật dưới đây gọi <code>readlink /proc/self</code> <b>ba lần liên tiếp</b> và ' +
         'nhận ba câu trả lời khác nhau, không lần nào trùng số hiệu của chính shell. Hai lệnh cuối còn ' +
         'lạ hơn: cùng một đường dẫn <code>/proc/self/…</code> mà mỗi lệnh lại đọc ra tên của chính nó. ' +
         '<b>Giải thích cơ chế</b> làm cho chuyện này xảy ra, và cho biết nó chứng minh điều gì về bản ' +
         'chất của <code>/proc</code>.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'readlink /proc/self\n' +
            'readlink /proc/self\n' +
            'readlink /proc/self\n' +
            'echo $$\n' +
            'cat /proc/self/comm\n' +
            'head -n 1 /proc/self/status' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'kết quả thật', code:
            '439\n' +
            '440\n' +
            '441\n' +
            '434\n' +
            'cat\n' +
            'Name:\thead' }
      ],
      rows: 6,
      hint: 'Mỗi lệnh ngoài mà shell chạy là một <b>tiến trình mới</b> (Bài 4, trục "builtin thắng file ' +
            'ngoài"). Vậy ai là "self" trong <code>/proc/self</code>?',
      crit: [
        'Nói rõ /proc/self trỏ tới thư mục /proc/<pid> của CHÍNH tiến trình đang đọc nó, chứ không phải một pid cố định',
        'Giải thích ba số khác nhau: mỗi lần gõ readlink là shell tạo một tiến trình MỚI, mang một pid mới',
        'Giải thích được vì sao ba số tăng dần và đều lớn hơn 434: pid được cấp tăng dần, shell sinh ra trước',
        'Nói rõ 434 là pid của chính bash, còn 439/440/441 là pid của các tiến trình con mà bash tạo ra để chạy lệnh',
        'Chỉ ra comm ra "cat" và Name ra "head" là cùng một bằng chứng: câu trả lời phụ thuộc AI ĐANG ĐỌC',
        'Rút ra kết luận đúng: /proc không phải file tĩnh, nội dung do kernel sinh theo ngữ cảnh của lần đọc'
      ],
      sol: '<code>/proc/self</code> là một liên kết <b>động</b>: khi một tiến trình mở nó, kernel phân ' +
           'giải nó thành <code>/proc/&lt;pid của chính tiến trình đó&gt;</code>. Nó không trỏ cố định ' +
           'vào đâu cả — đích của nó là một hàm số của <b>người đọc</b>.<br><br>' +
           'Vì mỗi lệnh ngoài được bash chạy trong một <b>tiến trình con mới</b>, ba lần gõ ' +
           '<code>readlink</code> là ba tiến trình khác nhau, mang ba pid khác nhau: 439, 440, 441. ' +
           'Chúng tăng dần vì kernel cấp pid theo thứ tự, và đều lớn hơn <b>434</b> vì 434 là pid của ' +
           'chính bash — bash có trước, các lệnh nó chạy có sau.<br><br>' +
           'Hai lệnh cuối đóng đinh kết luận: <code>cat /proc/self/comm</code> in ra ' +
           '<code>cat</code>, và <code>head -n 1 /proc/self/status</code> in ra ' +
           '<code>Name:&nbsp;head</code>. Cùng một đường dẫn, hai câu trả lời, khác nhau đúng ở chỗ ' +
           '<b>ai hỏi</b>.<br><br>' +
           'Kết luận: <code>/proc</code> không phải một thư mục chứa file mà là một <b>giao diện hỏi ' +
           'đáp</b> với kernel, và một số câu trả lời phụ thuộc vào ngữ cảnh của lần hỏi. Điều đó cũng ' +
           'giải thích vì sao mọi thứ trong đó khai 0 byte. Rất tiện lợi trong thực tế: một chương ' +
           'trình muốn biết tiến trình của mình đang mở những file nào chỉ cần đọc ' +
           '<code>/proc/self/fd/</code>, không cần biết pid của mình là bao nhiêu.' },

    { id: 'b3', k: 'free', tag: 'Giải thích vì sao',
      q: 'Cùng một script, chạy ở hai chỗ. Ở chỗ thứ nhất nó in ra <code>timeout=30</code>; ở chỗ thứ ' +
         'hai nó báo không tìm thấy file. Script không hề thay đổi giữa hai lần chạy. <b>Vì sao</b>? ' +
         'Và vì sao dòng <code>ls -l</code> cuối cùng lại chạy được ở <b>cả hai</b> lần?',
      blocks: [
        { t: 'code', where: 'file', name: '~/bt05-probe3/setup.sh', lang: 'bash', code:
            '#!/bin/bash\n' +
            'echo 1400 > /sys/class/net/eth0/mtu\n' +
            'cat conf/app.conf\n' +
            'cp /proc/cpuinfo cpu-backup.txt\n' +
            'ls -l cpu-backup.txt' },
        { t: 'code', where: 'wsl', name: 'lần 1 — đứng ngay trong thư mục chứa script', code:
            'cd ~/bt05-probe3\n' +
            './setup.sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            './setup.sh: line 2: /sys/class/net/eth0/mtu: Permission denied\n' +
            'timeout=30\n' +
            '-r--r--r-- 1 shinarus shinarus 9294 Aug 11 21:29 cpu-backup.txt' },
        { t: 'code', where: 'wsl', name: 'lần 2 — đứng ở thư mục khác, gọi bằng đường dẫn tuyệt đối', code:
            'mkdir -p ~/bt05-probe3/elsewhere\n' +
            'cd ~/bt05-probe3/elsewhere\n' +
            '~/bt05-probe3/setup.sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/home/shinarus/bt05-probe3/setup.sh: line 2: /sys/class/net/eth0/mtu: Permission denied\n' +
            'cat: conf/app.conf: No such file or directory\n' +
            '-r--r--r-- 1 shinarus shinarus 9294 Aug 11 21:29 cpu-backup.txt' }
      ],
      rows: 6,
      hint: 'Trong script có <b>hai kiểu</b> đường dẫn. Đường dẫn nào đổi nghĩa theo chỗ bạn đứng, và ' +
            'đường dẫn nào thì không?',
      crit: [
        'Nói rõ conf/app.conf là đường dẫn TƯƠNG ĐỐI, được tính từ thư mục làm việc lúc chạy chứ không phải từ chỗ đặt script',
        'Nói rõ /sys/class/net/eth0/mtu và /proc/cpuinfo là đường dẫn TUYỆT ĐỐI nên luôn trỏ đúng một chỗ, đứng ở đâu cũng vậy',
        'Giải thích được vì sao ls -l chạy được cả hai lần: cp đã tạo cpu-backup.txt ngay tại thư mục làm việc hiện tại của mỗi lần chạy — hai file khác nhau ở hai thư mục khác nhau',
        'Nêu đúng một cách sửa: cd vào thư mục của script ngay đầu file, ví dụ cd "$(dirname "$0")"',
        'Nêu được nguyên tắc chọn: tài nguyên hệ thống dùng đường dẫn tuyệt đối, tài nguyên của chính dự án thì tính từ vị trí script'
      ],
      sol: 'Script trộn <b>hai loại đường dẫn</b>, và chỉ một loại đổi nghĩa theo chỗ bạn đứng.<br><br>' +
           '<code>conf/app.conf</code> là đường dẫn <b>tương đối</b>. Nó được kernel diễn giải là ' +
           '"<i>từ thư mục làm việc hiện tại</i> đi tiếp vào <code>conf</code>". Thư mục làm việc là ' +
           'chỗ bạn <b>đang đứng lúc gọi</b>, hoàn toàn không phải chỗ đặt file script — gọi script ' +
           'bằng đường dẫn tuyệt đối cũng không thay đổi điều đó. Lần 1 bạn đứng trong ' +
           '<code>~/bt05-probe3</code> nên <code>conf/app.conf</code> tồn tại; lần 2 bạn đứng trong ' +
           '<code>elsewhere/</code> nên nó không tồn tại.<br><br>' +
           '<code>/sys/class/net/eth0/mtu</code> và <code>/proc/cpuinfo</code> bắt đầu bằng ' +
           '<code>/</code> nên là <b>tuyệt đối</b>: chúng bắt đầu từ gốc cây và trỏ đúng một chỗ, bất ' +
           'kể bạn đứng đâu. Vì thế dòng 2 hỏng y hệt nhau ở cả hai lần (thiếu quyền ghi, không liên ' +
           'quan gì tới thư mục), và <code>cp</code> luôn đọc được nguồn.<br><br>' +
           'Còn <code>ls -l</code> chạy được cả hai lần vì <code>cp</code> vừa tạo ' +
           '<code>cpu-backup.txt</code> ngay <b>tại thư mục làm việc của lần chạy đó</b>. Hai lần chạy ' +
           'tạo ra <b>hai file khác nhau ở hai thư mục khác nhau</b>, cùng tên nên nhìn giống hệt — đây ' +
           'đúng là kiểu lỗi làm người ta mất buổi chiều để tìm.<br><br>' +
           'Cách sửa chuẩn: cho script tự chuyển về thư mục của chính nó ngay dòng đầu — ' +
           '<code>cd "$(dirname "$0")"</code> — hoặc dựng đường dẫn tuyệt đối từ đó. Nguyên tắc chọn: ' +
           'tài nguyên của <b>hệ thống</b> (<code>/proc</code>, <code>/sys</code>, ' +
           '<code>/etc</code>) luôn viết tuyệt đối; tài nguyên của <b>chính dự án</b> thì tính từ vị ' +
           'trí script, đừng bao giờ tính từ chỗ người dùng tình cờ đang đứng.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp', truc: 1,
      q: '<code>/dev/null</code> và <code>/dev/full</code> giống nhau đến mức khó tin: cùng loại ' +
         '<code>c</code>, cùng quyền, cùng <b>major 1</b>, cùng 0 byte, cùng do một trình điều khiển ' +
         'phục vụ. Ghi vào cái thứ nhất thì im lặng thành công, ghi vào cái thứ hai thì lỗi. ' +
         '<b>Khác biệt nào tạo ra khác biệt đó</b>, và nó nói gì về việc một file trong ' +
         '<code>/dev</code> thật ra là cái gì?',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'ls -l /dev/null /dev/zero /dev/full /dev/random /dev/sda /dev/kvm\n' +
            'echo test > /dev/null; echo "rc=$?"\n' +
            "bash -c 'echo test > /dev/full'; echo \"rc=$?\"",
          notes: ['Câu thứ ba bọc trong <code>bash -c</code> để thông báo lỗi hiện ra kèm một tiền tố ' +
                  'cố định, dễ đối chiếu.'] },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'kết quả thật', code:
            'crw-rw-rw- 1 root root   1,   7 Aug 11 21:30 /dev/full\n' +
            'crw-rw---- 1 root kvm   10, 232 Aug 11 21:30 /dev/kvm\n' +
            'crw-rw-rw- 1 root root   1,   3 Aug 11 21:30 /dev/null\n' +
            'crw-rw-rw- 1 root root   1,   8 Aug 11 21:30 /dev/random\n' +
            'brw-rw---- 1 root disk   8,   0 Aug 11 21:30 /dev/sda\n' +
            'crw-rw-rw- 1 root root   1,   5 Aug 11 21:30 /dev/zero\n' +
            'rc=0\n' +
            'bash: line 1: echo: write error: No space left on device\n' +
            'rc=1' }
      ],
      rows: 6,
      hint: 'Trong sáu dòng đầu, hãy tìm cột <b>duy nhất</b> khác nhau giữa <code>null</code>, ' +
            '<code>zero</code>, <code>full</code> và <code>random</code>.',
      crit: [
        'Chỉ đúng khác biệt: số MINOR (3 với null, 7 với full), major đều là 1',
        'Giải thích đúng vai trò hai số: major chọn TRÌNH ĐIỀU KHIỂN, minor để chính trình điều khiển đó chọn nhánh xử lý',
        'Nói rõ bốn file null/zero/full/random cùng major 1 nghĩa là cùng MỘT trình điều khiển phục vụ cả bốn',
        'Kết luận đúng: file trong /dev không chứa dữ liệu, nó chỉ là con trỏ tới một đoạn mã trong kernel',
        'Rút ra được: cái TÊN file không có ý nghĩa với kernel — đổi tên không đổi hành vi, và tạo file mới với cùng cặp số thì hành vi y hệt',
        'Nêu đúng giá trị thực dụng của /dev/full: dùng để thử xem chương trình có xử lý lỗi ghi (đĩa đầy) đúng không'
      ],
      sol: 'Khác biệt duy nhất nằm ở <b>số minor</b>: <code>/dev/null</code> là <code>1, 3</code>, ' +
           '<code>/dev/full</code> là <code>1, 7</code>. Bốn file <code>null</code>, ' +
           '<code>zero</code> (1, 5), <code>full</code> (1, 7) và <code>random</code> (1, 8) đều mang ' +
           '<b>major 1</b>, tức là kernel giao cả bốn cho <b>cùng một</b> trình điều khiển. Trình điều ' +
           'khiển đó nhìn số minor để biết phải chạy nhánh nào: minor 3 thì nuốt mọi thứ và báo thành ' +
           'công, minor 7 thì luôn trả về lỗi <code>ENOSPC</code> — chính là dòng ' +
           '<code>No space left on device</code> và <code>rc=1</code> bạn thấy.<br><br>' +
           'Điều này nói thẳng ra một file trong <code>/dev</code> là cái gì: <b>không phải nơi chứa ' +
           'dữ liệu, mà là một con trỏ tới một đoạn mã trong kernel</b>. Nó lưu đúng ba thứ — loại ' +
           '(<code>c</code> hay <code>b</code>), major, minor — và không byte nội dung nào. Hệ quả ' +
           'kiểm chứng được: cái <b>tên</b> hoàn toàn không có ý nghĩa với kernel. Tự tạo một file ' +
           'thiết bị tên bất kỳ với cặp <code>1, 3</code> thì nó hành xử y hệt ' +
           '<code>/dev/null</code>; ngược lại, đổi tên <code>/dev/null</code> không làm nó ngừng nuốt ' +
           'dữ liệu.<br><br>' +
           'Đối chứng cho rõ: <code>/dev/sda</code> là <code>8, 0</code> và mở đầu bằng ' +
           '<code>b</code> — trình điều khiển khác hẳn, loại khác hẳn; <code>/dev/kvm</code> là ' +
           '<code>10, 232</code>, lại một trình điều khiển khác nữa.<br><br>' +
           'Và <code>/dev/full</code> không phải trò đùa: nó là cách rẻ nhất để kiểm tra chương trình ' +
           'của bạn có xử lý đúng tình huống <b>hết chỗ ghi</b> hay không — một lỗi rất hay gặp trên ' +
           'thiết bị nhúng có flash nhỏ, và rất khó tái hiện bằng cách khác.' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', truc: 2,
      q: 'Bốn dòng dưới đây là <b>toàn bộ</b> những gì <code>/proc/mounts</code> nói về ' +
         '<code>/proc</code>, <code>/sys</code>, <code>/dev</code> và <code>/tmp</code> trên máy bạn. ' +
         'Hãy giải thích: cột thứ nhất cho biết điều gì, và <b>vì sao</b> bốn thư mục này bắt buộc ' +
         'phải đã tồn tại (dù rỗng) trong ảnh rootfs trước khi kernel làm bất cứ việc gì với chúng.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'grep -E \' /(proc|sys|dev|tmp) \' /proc/mounts' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'kết quả thật', code:
            'none /dev devtmpfs rw,nosuid,relatime,size=2512316k,nr_inodes=628079,mode=755 0 0\n' +
            'sysfs /sys sysfs rw,nosuid,nodev,noexec,noatime 0 0\n' +
            'proc /proc proc rw,nosuid,nodev,noexec,noatime 0 0\n' +
            'tmpfs /tmp tmpfs rw,nosuid,nodev,size=2518076k,nr_inodes=1048576 0 0' }
      ],
      rows: 7,
      hint: 'So với một dòng gắn ổ đĩa thật, cột thứ nhất ở đây có gì khác thường? Và "gắn" một hệ ' +
            'thống file lên một thư mục thì thư mục đó phải ở trạng thái nào trước?',
      crit: [
        'Nói rõ cột 1 là "nguồn" và ở đây nó không phải thiết bị nào cả (none, sysfs, proc, tmpfs) — khác hẳn một dòng gắn ổ thật vốn ghi /dev/sdaX',
        'Nói rõ cột 2 là ĐIỂM GẮN và cột 3 là loại hệ thống file',
        'Giải thích đúng cơ chế gắn: mount PHỦ một hệ thống file lên một thư mục đã có sẵn, nên thư mục đó phải tồn tại trước',
        'Nói rõ nội dung bốn thư mục này không nằm trong ảnh rootfs mà do kernel đổ vào lúc chạy',
        'Nêu đúng hậu quả khi thiếu chúng: hệ thống VẪN boot, không có thông báo lỗi rõ ràng',
        'Kể được ít nhất hai thứ hỏng khi thiếu /proc: ps/top/free không đọc được gì (và /dev thiếu thì không mở được thiết bị nào)',
        'Kết luận đúng: thư mục rỗng trong rootfs không phải rác, nó là chỗ trống có chủ đích'
      ],
      sol: '<b>Cột 1 là "nguồn", và ở đây không cột nào là một thiết bị.</b> Một dòng gắn ổ thật sẽ ghi ' +
           '<code>/dev/sda1 /mnt/data ext4 …</code>. Bốn dòng này ghi <code>none</code>, ' +
           '<code>sysfs</code>, <code>proc</code>, <code>tmpfs</code> — những cái tên giữ chỗ, vì ' +
           '<b>không có thiết bị lưu trữ nào ở dưới cả</b>. Cột 2 là <b>điểm gắn</b>, cột 3 là loại hệ ' +
           'thống file. Đây chính là lý do <code>df</code> báo dung lượng 0 cho <code>proc</code> và ' +
           '<code>sysfs</code> ở câu B1.<br><br>' +
           '<b>Vì sao thư mục phải tồn tại trước:</b> gắn là hành động <b>phủ</b> một hệ thống file ' +
           'lên một thư mục đã có. Kernel cần một chỗ trong cây để treo cái cây con mới vào; không có ' +
           'thư mục thì không có chỗ treo, và lệnh gắn thất bại. Vì thế trong ảnh rootfs, ' +
           '<code>/proc</code>, <code>/sys</code>, <code>/dev</code>, <code>/tmp</code> đều là thư mục ' +
           '<b>rỗng, 0 byte</b> — đúng như phải thế. Nội dung của chúng không nằm trong ảnh; nó do ' +
           'kernel đổ vào lúc chạy.<br><br>' +
           '<b>Phần nguy hiểm là cái giá của việc thiếu.</b> Hệ thống <b>vẫn boot</b>. Không có dòng ' +
           'log nào nói "thiếu /proc". Cái bạn nhận được là một board chạy được nhưng ' +
           '<code>ps</code> không thấy tiến trình nào, <code>top</code> trống, <code>free</code> ' +
           'không đọc được bộ nhớ, <code>mount</code> không liệt kê được gì; thiếu <code>/dev</code> ' +
           'thì không mở được thiết bị nào, tức là không có cổng serial để mà nhìn. Bạn mất đúng bộ ' +
           'công cụ dùng để tìm hiểu chuyện gì đang xảy ra, vào đúng lúc cần nó nhất — và triệu chứng ' +
           'thì trông như "phần mềm bị lỗi lung tung", không hề chỉ về nguyên nhân thật.<br><br>' +
           '<b>Một chi tiết đáng biết về dòng <code>/dev</code>:</b> <code>/proc/mounts</code> ghi ' +
           '<code>devtmpfs</code>, nhưng <code>stat -f -c %T /dev</code> lại trả lời ' +
           '<code>tmpfs</code>. Cả hai đều đúng: <code>devtmpfs</code> được cài đặt <b>bên trên</b> ' +
           '<code>tmpfs</code> trong kernel, nên lời gọi <code>statfs()</code> nhìn thấy số nhận dạng ' +
           'của tmpfs. Khi hai công cụ bất đồng, hãy tin <code>/proc/mounts</code> — đó là danh sách ' +
           'do chính kernel giữ.' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một đồng nghiệp viết trong hướng dẫn nội bộ: <i>"Quy tắc vàng khi viết script cho board: ' +
         '<b>luôn</b> dùng đường dẫn tuyệt đối, không bao giờ dùng đường dẫn tương đối. Tuyệt đối thì ' +
         'không bao giờ sai. Ví dụ nên viết ' +
         '<code>cp /home/shinarus/myproject/config.txt /home/shinarus/myproject/out/</code>."</i> ' +
         'Lời khuyên này <b>đúng một nửa</b>. Chỉ ra chỗ sai và viết lại quy tắc cho đúng.',
      rows: 6,
      hint: 'Đường dẫn trong ví dụ đó có gì mà máy của người khác — hoặc board — chắc chắn không có?',
      crit: [
        'Xác nhận nửa đúng: với tài nguyên HỆ THỐNG (/proc, /sys, /dev, /etc) thì tuyệt đối là bắt buộc, vì chúng ở đúng một chỗ',
        'Chỉ ra chỗ sai: ví dụ đã nhét tên người dùng và vị trí dự án vào script, nên đem sang máy khác hoặc lên board là hỏng',
        'Nói rõ trên board thường không có /home/shinarus, và tài khoản chạy dịch vụ thường là root hoặc một tài khoản riêng',
        'Nêu đúng cách viết đúng: tính từ vị trí script (cd "$(dirname "$0")") hoặc nhận thư mục gốc qua biến/tham số',
        'Phát biểu lại được quy tắc theo tiêu chí đúng: điều quan trọng không phải tuyệt đối hay tương đối, mà là đường dẫn có bị phụ thuộc vào MÔI TRƯỜNG NGẪU NHIÊN hay không'
      ],
      sol: '<b>Nửa đúng:</b> với tài nguyên của <b>hệ thống</b> thì tuyệt đối là bắt buộc. ' +
           '<code>/proc/cpuinfo</code>, <code>/sys/class/net/eth0/mtu</code>, ' +
           '<code>/etc/fstab</code>, <code>/dev/ttyS0</code> nằm ở đúng một chỗ trên mọi máy Linux; ' +
           'viết tương đối vào đó là tự chuốc lỗi.<br><br>' +
           '<b>Nửa sai:</b> ví dụ được đưa ra không hề "an toàn hơn" — nó chỉ đổi một phụ thuộc này ' +
           'lấy một phụ thuộc tệ hơn. <code>/home/shinarus/myproject</code> nhét cả <b>tên người ' +
           'dùng</b> lẫn <b>vị trí thư mục dự án</b> vào trong script. Đem sang máy đồng nghiệp là ' +
           'hỏng; nạp lên board lại càng hỏng, vì ở đó thường không có <code>/home</code> nào cả và ' +
           'tiến trình chạy dưới <code>root</code> hoặc một tài khoản dịch vụ riêng.<br><br>' +
           '<b>Quy tắc viết lại cho đúng:</b> tiêu chí không phải "tuyệt đối hay tương đối" mà là ' +
           '<b>đường dẫn có phụ thuộc vào một thứ ngẫu nhiên của môi trường hay không</b>. Chia làm ' +
           'ba:<br>' +
           '<b>1.</b> Tài nguyên hệ thống → tuyệt đối, viết thẳng.<br>' +
           '<b>2.</b> Tài nguyên của chính dự án → tính từ vị trí script: ' +
           '<code>cd "$(dirname "$0")"</code> rồi dùng đường dẫn tương đối, hoặc dựng đường dẫn tuyệt ' +
           'đối từ đó.<br>' +
           '<b>3.</b> Thứ do người vận hành quyết định (thư mục cài đặt, nơi ghi log) → nhận qua ' +
           '<b>biến môi trường hoặc tham số</b>, có giá trị mặc định hợp lý.<br><br>' +
           'Cách kiểm tra nhanh một script có sạch hay không: tìm xem trong đó có tên đăng nhập của ' +
           'bạn không. Có là hỏng.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN C — VẬN DỤNG (5 câu)
     2 chẩn đoán · 2 tình huống mới · 1 chọn và biện minh
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Một board đang chạy tốt ở hiện trường. Kỹ thuật viên muốn nhân bản nó sang một board thứ hai ' +
         'y hệt, nên làm thế này: trên board đang chạy, gõ ' +
         '<code>tar czf /mnt/usb/rootfs.tar.gz /</code>; rồi trên board mới, xoá sạch phân vùng rootfs ' +
         'và bung file đó ra. Kết quả: board mới <b>boot được</b>, nhưng hỏng theo một kiểu rất khó ' +
         'hiểu — một số dịch vụ không khởi động, <code>ps</code> lúc đầu ra một danh sách tiến trình ' +
         '<b>không hề tồn tại</b> rồi sau đó trống trơn, và có lúc lệnh <code>tar</code> ở board cũ ' +
         'còn chạy rất lâu bất thường. <b>Nêu ít nhất ba nguyên nhân riêng biệt</b>, tất cả cùng bắt ' +
         'nguồn từ một hiểu lầm duy nhất, rồi viết lại câu lệnh sao lưu cho đúng.',
      rows: 8,
      hint: 'Dấu <code>/</code> ở cuối câu lệnh <code>tar</code> bao gồm những thư mục nào? Trong số ' +
            'đó, thư mục nào <b>không</b> chứa file thật?',
      crit: [
        'Chỉ ra hiểu lầm gốc: coi /proc, /sys, /dev như thư mục chứa file thật, nên gói cả chúng vào bản sao lưu',
        'Nguyên nhân 1 — nội dung /proc và /sys là ẢNH CHỤP trạng thái của board cũ tại một thời điểm; bung sang board mới thì đó là dữ liệu chết, sai và gây hiểu nhầm (ps đọc ra tiến trình không tồn tại)',
        'Nguyên nhân 2 — sau khi kernel gắn proc/sysfs/devtmpfs lên các thư mục đó lúc boot, mọi thứ vừa bung ra bị CHE KHUẤT hoàn toàn, nên công sức chép là vô ích (ps sau đó trống trơn)',
        'Nguyên nhân 3 — /dev trong bản bung là file thường chứ không phải file thiết bị thật, hoặc bị devtmpfs che; dịch vụ nào mở thiết bị trước khi gắn xong đều hỏng',
        'Giải thích được vì sao tar chạy lâu bất thường: tar đọc các file trong /proc và /sys, mà một số file trong đó sinh nội dung rất chậm hoặc chặn khi đọc (ví dụ /proc/kmsg, /dev/random)',
        'Viết được câu lệnh đúng: tar có --exclude cho /proc, /sys, /dev, /run, /tmp (chấp nhận cách viết tương đương, ví dụ --one-file-system)',
        'Nói rõ các thư mục đó vẫn phải TỒN TẠI (rỗng) trong bản sao lưu để còn chỗ mà gắn'
      ],
      sol: 'Cả ba triệu chứng đều mọc ra từ một hiểu lầm: coi <code>/proc</code>, <code>/sys</code> và ' +
           '<code>/dev</code> là thư mục chứa file thật.<br><br>' +
           '<b>Nguyên nhân 1 — dữ liệu chết.</b> Nội dung <code>/proc</code> là ảnh chụp trạng thái ' +
           'board cũ tại đúng giây <code>tar</code> chạy: danh sách tiến trình, bộ nhớ, kết nối mạng. ' +
           'Bung sang board mới, nó thành một đống file văn bản mô tả một cái máy khác ở một thời điểm ' +
           'đã qua. Đó chính là danh sách "tiến trình không tồn tại" mà <code>ps</code> đọc ra ở giai ' +
           'đoạn đầu.<br><br>' +
           '<b>Nguyên nhân 2 — công cốc.</b> Lúc boot, kernel gắn <code>proc</code>, ' +
           '<code>sysfs</code> và <code>devtmpfs</code> lên đúng ba thư mục đó. Gắn là <b>phủ</b>: ' +
           'mọi thứ vừa bung ra bị che khuất hoàn toàn, không ai truy cập được nữa. Đó là lý do sau ' +
           'khi khởi động xong thì <code>ps</code> lại về bình thường hoặc trống — tuỳ giai đoạn.<br><br>' +
           '<b>Nguyên nhân 3 — thiết bị giả.</b> Tuỳ cách bung, các mục trong <code>/dev</code> có ' +
           'thể mất hẳn cặp major–minor và trở thành file thường. Bất kỳ dịch vụ nào mở thiết bị ' +
           '<b>trước</b> khi <code>devtmpfs</code> được gắn xong sẽ mở phải một file rỗng vô nghĩa, ' +
           'không báo lỗi gì rõ ràng, rồi treo hoặc chết.<br><br>' +
           '<b>Còn <code>tar</code> chạy lâu bất thường</b> là vì nó đi đọc từng file trong ' +
           '<code>/proc</code> và <code>/sys</code>. Phần lớn chỉ tốn thời gian, nhưng vài file thì ' +
           '<b>chặn</b> — <code>/proc/kmsg</code> chờ có dòng log mới, <code>/dev/random</code> chờ đủ ' +
           'entropy. Một lệnh sao lưu treo vô hạn ở đúng những chỗ đó là chuyện xảy ra thật.<br><br>' +
           '<b>Câu lệnh đúng:</b><br>' +
           '<code>tar czf /mnt/usb/rootfs.tar.gz --exclude=/proc --exclude=/sys --exclude=/dev ' +
           '--exclude=/run --exclude=/tmp --exclude=/mnt/usb /</code><br>' +
           '(hoặc gọn hơn: <code>tar czf … --one-file-system /</code>, vì cả năm hệ thống file ảo đó ' +
           'đều nằm trên "hệ thống file khác".) Lưu ý cuối cùng và rất dễ quên: năm thư mục đó vẫn ' +
           'phải <b>tồn tại</b> trong bản bung ra, chỉ là rỗng — nếu không, board mới sẽ không có chỗ ' +
           'để gắn, và bạn rơi thẳng vào tình huống của câu C3.' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 1,
      q: 'Bạn nhận một board mới, nối một cảm biến nhiệt độ vào bus I2C số 1, rồi chạy chương trình đọc ' +
         'cảm biến. Chương trình báo <code>No such file or directory</code> khi mở ' +
         '<code>/dev/i2c-1</code>. Có <b>ít nhất bốn</b> nguyên nhân khác nhau dẫn tới đúng triệu ' +
         'chứng này. Hãy nêu chúng, và với mỗi nguyên nhân cho biết bạn <b>đọc chỗ nào trong cây thư ' +
         'mục</b> để loại trừ nó — không được dùng công cụ nào ngoài <code>ls</code> và ' +
         '<code>cat</code>.',
      rows: 8,
      hint: 'Từ lúc kernel biết có phần cứng cho tới lúc có một mục trong <code>/dev</code> là cả một ' +
            'chuỗi. Mắt xích nào cũng đứt được, và mỗi mắt xích để lại dấu vết ở một thư mục khác nhau.',
      crit: [
        'Nguyên nhân: kernel chưa có trình điều khiển I2C nào (không biên dịch vào, hoặc là module chưa nạp) — kiểm tra bằng cách xem /sys/bus có thư mục i2c không, và /sys/class/i2c-dev có gì không',
        'Nguyên nhân: có trình điều khiển nhưng phần cứng chưa được KHAI BÁO cho kernel (thiếu node trong Device Tree) — kiểm tra /sys/bus/i2c/devices/ hoặc /proc/device-tree',
        'Nguyên nhân: bus tồn tại nhưng mang số khác (i2c-0, i2c-2…) nên tên /dev/i2c-1 sai — kiểm tra bằng ls /dev/i2c-* và ls /sys/class/i2c-dev',
        'Nguyên nhân: thiếu phần i2c-dev (giao diện /dev cho bus I2C) nên bus có trong /sys mà không có mục nào trong /dev',
        'Nguyên nhân: /dev không được gắn devtmpfs, hoặc rootfs không có thư mục /dev — kiểm tra /proc/mounts',
        'Nêu đúng trình tự chẩn đoán: đi từ /sys (kernel có biết phần cứng không) rồi mới tới /dev (có cửa vào cho chương trình không)',
        'Nói rõ triệu chứng "No such file or directory" chỉ nói KHÔNG CÓ MỤC TRONG /dev, tuyệt đối không nói gì về việc dây nối hay cảm biến có tốt hay không'
      ],
      sol: 'Thông báo lỗi này nói đúng <b>một</b> điều: không có mục nào tên <code>/dev/i2c-1</code>. ' +
           'Nó không nói gì về dây, về cảm biến, hay về việc phần cứng có hoạt động không — và tưởng ' +
           'nhầm điều ngược lại là cách mất một buổi chiều đi đo lại mạch.<br><br>' +
           'Đi ngược chuỗi <b>từ phần cứng ra tới <code>/dev</code></b>, mỗi mắt xích đứt để lại một ' +
           'dấu vết khác nhau:<br><br>' +
           '<b>1. Kernel không có trình điều khiển I2C.</b> Xem <code>ls /sys/bus</code>. Không có ' +
           '<code>i2c</code> thì kernel hoàn toàn không biết I2C là gì; phải bật lại cấu hình kernel ' +
           '(Chặng 07) hoặc nạp module (Chặng 10). <i>Trên máy WSL2 của bạn, ' +
           '<code>ls /sys/bus</code> có liệt kê <code>i2c</code> — thư mục đó tồn tại kể cả khi không ' +
           'có bus thật nào, nên sự có mặt của nó chưa chứng minh điều gì về phần cứng.</i><br><br>' +
           '<b>2. Có trình điều khiển nhưng phần cứng chưa được khai báo.</b> Đây là nguyên nhân phổ ' +
           'biến nhất trên board mới, và cũng là điều Bài 1 đã nói: phần cứng không tự khai báo, Device ' +
           'Tree mới khai báo nó. Xem <code>ls /sys/bus/i2c/devices/</code> — trống nghĩa là chưa có ' +
           'bus nào được đăng ký. Đối chiếu tiếp với <code>/proc/device-tree</code>. Sửa ở tầng Device ' +
           'Tree, Chặng 08.<br><br>' +
           '<b>3. Bus có thật nhưng đánh số khác.</b> Số trong tên là do thứ tự đăng ký, không có gì ' +
           'bảo đảm bus vật lý "số 1" thành <code>i2c-1</code>. Xem <code>ls /dev/i2c-*</code> và ' +
           '<code>ls /sys/class/i2c-dev</code>: thấy <code>i2c-0</code> thì chỉ cần sửa tên trong ' +
           'chương trình.<br><br>' +
           '<b>4. Bus có trong <code>/sys</code> nhưng không có cửa vào trong <code>/dev</code>.</b> ' +
           'Đó là lúc thiếu phần <code>i2c-dev</code> — thứ tạo ra file thiết bị cho chương trình ' +
           'người dùng. Dấu hiệu rất đặc trưng: <code>/sys/bus/i2c/devices/</code> có nội dung mà ' +
           '<code>/dev/i2c-*</code> thì không có gì.<br><br>' +
           '<b>5. <code>/dev</code> không được gắn.</b> Kiểm tra <code>cat /proc/mounts</code>. Nếu ' +
           'không có dòng nào gắn <code>devtmpfs</code> lên <code>/dev</code> thì <b>mọi</b> thiết bị ' +
           'đều biến mất chứ không riêng I2C — một dấu hiệu rất dễ nhận ra nếu bạn nghĩ tới nó.<br><br>' +
           '<b>Trình tự đúng, và hãy dùng nó cho mọi thiết bị:</b> hỏi <code>/sys</code> trước — ' +
           '"kernel có biết phần cứng này tồn tại không?" — rồi mới hỏi <code>/dev</code> — "chương ' +
           'trình của tôi có cửa nào để vào không?". Đi ngược lại thì bạn luôn dừng ở câu trả lời vô ' +
           'dụng "không có file".' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 2,
      q: 'Board mới của bạn chỉ có <b>8 MB flash</b>, mà ảnh rootfs hiện là 9,4 MB. Một đồng nghiệp gửi ' +
         'cho bạn một script "dọn rác" đã cắt được xuống 7,8 MB. Nhìn vào script, bạn thấy trong đó có ' +
         'ba dòng: xoá mọi thư mục rỗng (<code>find . -type d -empty -delete</code>), xoá ' +
         '<code>/usr/share/man</code>, và xoá <code>/lib/modules</code>. Board nạp ảnh mới lên ' +
         '<b>vẫn boot, vẫn có shell</b>. Hãy đánh giá <b>từng dòng một</b>: dòng nào an toàn, dòng nào ' +
         'phải bỏ, và với dòng nguy hiểm nhất, mô tả chính xác board sẽ hỏng <b>thế nào</b>.',
      rows: 8,
      hint: 'Trong ba dòng đó, dòng nào xoá thứ mà <b>lúc chạy</b> mới cần tới? Và khi thiếu nó, bạn có ' +
            'được báo lỗi không?',
      crit: [
        'Đánh giá dòng xoá thư mục rỗng: PHẢI BỎ — nó xoá luôn /proc, /sys, /dev, /tmp, /run vốn là các ĐIỂM GẮN',
        'Mô tả đúng kiểu hỏng: board vẫn boot và vẫn có shell, không có thông báo lỗi nào chỉ ra nguyên nhân',
        'Kể được ít nhất hai hậu quả cụ thể: ps/top/free mù vì thiếu /proc; không mở được thiết bị nào vì thiếu /dev',
        'Đánh giá dòng xoá /usr/share/man: an toàn — tài liệu, không ai đọc lúc chạy trên board',
        'Đánh giá dòng xoá /lib/modules: nguy hiểm CÓ ĐIỀU KIỆN — chỉ bỏ được nếu mọi trình điều khiển cần thiết đã biên dịch thẳng vào kernel; nếu không thì mất thiết bị',
        'Nêu được hướng cắt đúng thay thế: cắt cái CHIẾM CHỖ (biểu tượng gỡ lỗi, locale, tài liệu, applet BusyBox không dùng, thư viện tĩnh), chứ không cắt cái RỖNG',
        'Nói rõ xoá thư mục rỗng tiết kiệm được gần như KHÔNG CÓ GÌ — mỗi thư mục chỉ tốn một mục thư mục, cỡ vài chục tới vài trăm byte'
      ],
      sol: '<b>Dòng 1 — <code>find . -type d -empty -delete</code>: phải bỏ, đây là dòng nguy hiểm ' +
           'nhất.</b> Nó quét trúng đúng những thư mục <b>bắt buộc phải rỗng</b>: <code>/proc</code>, ' +
           '<code>/sys</code>, <code>/dev</code>, <code>/tmp</code>, <code>/run</code>. Chúng rỗng vì ' +
           'chúng là <b>điểm gắn</b>, không phải vì chúng vô dụng.<br><br>' +
           'Kiểu hỏng mới là phần đáng sợ: board <b>vẫn boot, vẫn có shell</b>, và <b>không có thông ' +
           'báo lỗi nào</b> nói cho bạn biết nguyên nhân. Cái bạn gặp là <code>ps</code> không liệt kê ' +
           'được tiến trình nào, <code>top</code> trống, <code>free</code> không đọc được bộ nhớ, ' +
           '<code>mount</code> không in ra gì; và vì thiếu <code>/dev</code>, không mở được cổng ' +
           'serial, không mở được I2C, không mở được thiết bị nào cả. Nghĩa là bạn mất sạch bộ công cụ ' +
           'chẩn đoán, đúng vào lúc board bắt đầu cư xử kỳ lạ. Nhiều người ở tình huống này đi nghi ' +
           'ngờ kernel, nghi ngờ phần cứng, và không nghi ngờ cái script dọn rác.<br><br>' +
           'Phần mỉa mai: nó gần như <b>không tiết kiệm được gì</b>. Một thư mục rỗng chỉ tốn một mục ' +
           'trong bảng thư mục cha, cỡ vài chục byte, tệ lắm là một khối. Bạn đánh đổi toàn bộ khả ' +
           'năng chẩn đoán lấy vài trăm byte.<br><br>' +
           '<b>Dòng 2 — xoá <code>/usr/share/man</code>: an toàn, và nên làm.</b> Đó là tài liệu cho ' +
           'người đọc. Trên board không ai ngồi đọc <code>man</code>; bạn tra trên máy phát triển. Đây ' +
           'là kiểu cắt đúng: cắt thứ <b>chiếm chỗ mà lúc chạy không ai dùng</b>.<br><br>' +
           '<b>Dòng 3 — xoá <code>/lib/modules</code>: nguy hiểm có điều kiện.</b> Chỉ bỏ được nếu ' +
           'mọi trình điều khiển cần thiết đã được biên dịch <b>thẳng vào</b> ảnh kernel. Nếu còn ' +
           'module rời, xoá nó là mất thiết bị — và lại là kiểu mất im lặng nữa. Nếu bạn kiểm soát cấu ' +
           'hình kernel thì cách đúng là biên dịch thẳng vào rồi mới bỏ thư mục, chứ không phải bỏ ' +
           'trước rồi hy vọng.<br><br>' +
           '<b>Hướng cắt đúng cho 1,4 MB còn thiếu:</b> gỡ ký hiệu gỡ lỗi khỏi các nhị phân ' +
           '(<code>strip</code>, Bài 18), bỏ locale và tài liệu, tắt các applet BusyBox không dùng, bỏ ' +
           'thư viện tĩnh, cân nhắc đổi sang musl (Bài 28 cho thấy chênh lệch tới <b>15,4 lần</b> sau ' +
           'khi strip). Nguyên tắc một câu: <b>cắt cái chiếm chỗ, đừng cắt cái rỗng</b> — cái rỗng ' +
           'không chiếm chỗ, và thường nó rỗng là có lý do.' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Bạn nối cáp serial vào một board lạ do người khác build, không có tài liệu. Trên đó chỉ có ' +
         'BusyBox: có <code>cat</code>, <code>ls</code>, không có <code>ps</code>, không có ' +
         '<code>free</code>, không có <code>dmesg</code>, không có trình soạn thảo, không có mạng. Hãy ' +
         'trả lời <b>bốn</b> câu hỏi dưới đây, mỗi câu nêu <b>đường dẫn</b> bạn sẽ đọc và ' +
         '<b>vì sao</b> chỗ đó trả lời được:<br>' +
         '<b>(1)</b> Kernel phiên bản mấy, build lúc nào?<br>' +
         '<b>(2)</b> Board có bao nhiêu RAM, còn trống bao nhiêu?<br>' +
         '<b>(3)</b> Bootloader đã truyền tham số gì cho kernel?<br>' +
         '<b>(4)</b> Có tiến trình nào đang chạy, và tiến trình số 1 là chương trình nào?',
      rows: 8,
      hint: 'Cả bốn câu trả lời đều nằm trong <b>một</b> thư mục. Đó là lý do câu "mọi thứ là file" có ' +
            'giá trị thực dụng chứ không phải một khẩu hiệu.',
      crit: [
        '(1) /proc/version — và nêu được nó chứa cả phiên bản, trình biên dịch và thời điểm build',
        '(2) /proc/meminfo — nêu được MemTotal và MemAvailable (hoặc MemFree) là hai dòng cần đọc',
        '(3) /proc/cmdline — nêu đúng đây là chuỗi bootargs mà bootloader truyền sang, đúng thứ Bài 2 gọi là kênh giao tiếp duy nhất',
        '(4) ls /proc rồi đọc các thư mục có tên là số; /proc/1/comm hoặc /proc/1/status cho biết tiến trình số 1 là chương trình gì',
        'Nêu được nguyên lý chung: ps, free, uname, dmesg đều chỉ là chương trình ĐỌC /proc rồi in đẹp ra — thiếu chúng không có nghĩa là mất thông tin',
        'Nêu được ít nhất một giới hạn: đọc /proc/<pid>/environ của tiến trình thuộc người dùng khác sẽ bị Permission denied'
      ],
      sol: 'Cả bốn câu trả lời đều nằm trong <code>/proc</code>, và đó chính là điểm mấu chốt: ' +
           '<code>ps</code>, <code>free</code>, <code>uname</code>, <code>dmesg</code> ' +
           '<b>không hề biết gì thêm</b> so với bạn — chúng chỉ là chương trình đọc <code>/proc</code> ' +
           'rồi in ra cho đẹp. Thiếu công cụ không bao giờ có nghĩa là mất thông tin.<br><br>' +
           '<b>(1) <code>cat /proc/version</code></b> — một dòng, chứa phiên bản kernel, phiên bản ' +
           'trình biên dịch đã build nó, và thời điểm build. Dòng thời điểm build là thứ hay bị bỏ ' +
           'qua nhưng rất có giá trị: nó cho biết ảnh trên board có phải bản bạn vừa build hay là bản ' +
           'cũ còn sót.<br><br>' +
           '<b>(2) <code>cat /proc/meminfo</code></b> — <code>MemTotal</code> là tổng RAM kernel ' +
           'nhìn thấy, <code>MemAvailable</code> là ước lượng thực tế còn dùng được. Trên WSL2 của ' +
           'bạn, <code>MemTotal</code> là <b>5 036 144 kB</b>. Con số này còn dùng để bắt lỗi Device ' +
           'Tree khai sai dung lượng RAM — bạn sẽ gặp đúng chuyện đó ở Chặng 08.<br><br>' +
           '<b>(3) <code>cat /proc/cmdline</code></b> — nguyên văn chuỗi tham số bootloader đã truyền ' +
           'sang kernel. Đây chính là <code>bootargs</code> của Bài 2: kênh giao tiếp duy nhất giữa ' +
           'bootloader và kernel, và trên board lạ thì đây là chỗ đọc ra được ai đang là ' +
           '<code>root=</code>, <code>console=</code> nào đang được dùng, có ' +
           '<code>rdinit=</code> hay không.<br><br>' +
           '<b>(4) <code>ls /proc</code></b> — mỗi thư mục mang tên là <b>một số</b> chính là một ' +
           'tiến trình đang sống, tên thư mục là pid. Đó là toàn bộ dữ liệu mà <code>ps</code> dùng. ' +
           'Rồi <code>cat /proc/1/comm</code> (hoặc <code>/proc/1/status</code>) cho biết tiến trình ' +
           'số 1 là ai — <code>systemd</code>, <code>init</code> của BusyBox, hay chính script của ' +
           'bạn; và <code>cat /proc/1/cmdline</code> cho cả dòng lệnh. Trên máy bạn, ' +
           '<code>/proc/1/status</code> đọc ra <code>Name: systemd</code>.<br><br>' +
           '<b>Giới hạn phải biết:</b> vài mục bị chặn theo quyền. <code>cat /proc/1/environ</code> ' +
           'trên máy bạn trả về <code>Permission denied</code> khi chạy bằng tài khoản thường, trong ' +
           'khi <code>/proc/1/status</code> vẫn đọc được bình thường. Quyền được đặt <b>theo từng ' +
           'mục</b>, không phải theo cả thư mục — nên thất bại ở một file không có nghĩa là cả nhánh ' +
           'đó đóng.' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Trên máy bạn, hai file dưới đây là <b>toàn bộ</b> thông tin cần để tính dung lượng ổ ' +
         '<code>/dev/sda</code>, mà không cần bất kỳ công cụ phân vùng nào. <b>(a)</b> Tính dung lượng ' +
         'ổ ra byte và ra MiB. <b>(b)</b> Một đồng nghiệp bảo "cứ nhân với 512 cho nhanh, khối nào ' +
         'chẳng 512 byte". Hãy quyết định: viết script giám sát cho <b>nhiều board khác nhau</b> thì ' +
         'nên nhân với 512 hay đọc file thứ hai — và biện minh cho lựa chọn đó.',
      blocks: [
        { t: 'code', where: 'wsl', code:
            'cat /sys/block/sda/size\n' +
            'cat /sys/block/sda/queue/logical_block_size' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'kết quả thật', code:
            '730960\n' +
            '512' }
      ],
      rows: 7,
      hint: 'Với phần (a), nhớ MiB là 1024 × 1024 chứ không phải 1000 × 1000. Với phần (b), hãy nghĩ ' +
            'tới ổ SSD và eMMC đời mới, và tới chuyện script của bạn sẽ chạy ở đâu trong ba năm tới.',
      crit: [
        '(a) Tính đúng số byte: 730960 × 512 = 374 251 520 byte',
        '(a) Đổi đúng ra MiB: 374 251 520 / 1024 / 1024 = 356,9 MiB (chấp nhận "khoảng 356 MiB" hoặc "357 MiB")',
        '(a) Nói rõ đơn vị của /sys/block/sda/size là SỐ SECTOR chứ không phải byte',
        '(b) Chọn ĐỌC FILE, không hardcode 512',
        '(b) Biện minh đúng: 512 chỉ là giá trị phổ biến, không phải quy tắc — nhiều ổ và bộ nhớ flash đời mới dùng 4096',
        '(b) Nêu được hậu quả nếu đoán sai: sai lệch 8 lần, và sai HOÀN TOÀN IM LẶNG vì phép nhân vẫn ra một con số trông hợp lý',
        '(b) Nêu được nguyên tắc chung: sysfs đã bày sẵn tham số ra thì đọc nó, đừng nhét giá trị mặc định vào code'
      ],
      sol: '<b>(a)</b> <code>/sys/block/sda/size</code> tính bằng <b>sector</b>, không phải byte — ' +
           'đây là chỗ sai đầu tiên và phổ biến nhất. Nhân với kích thước một khối:<br>' +
           '<code>730960 × 512 = 374 251 520 byte</code><br>' +
           '<code>374 251 520 ÷ 1024 ÷ 1024 = 356,9 MiB</code><br>' +
           'Nếu bạn ra <b>374 MB</b> thì cũng không sai, chỉ là dùng đơn vị thập phân ' +
           '(1 MB = 1 000 000). Hãy quen với việc nói rõ mình đang dùng MiB hay MB, vì trong nhúng — ' +
           'nơi flash được bán theo MB thập phân còn phần mềm đo theo MiB nhị phân — chênh lệch này ' +
           'thường xuyên làm người ta tưởng mình mất dung lượng.<br><br>' +
           '<b>(b) Đọc file, đừng nhân bừa 512.</b> Con số 512 là <b>giá trị phổ biến</b>, không phải ' +
           'một quy tắc. Rất nhiều ổ đĩa và bộ nhớ flash đời mới dùng khối <b>4096</b> byte. Nếu ' +
           'script của bạn đoán 512 mà thiết bị dùng 4096 thì mọi con số bị chia <b>8 lần</b> — và ' +
           'phần tệ nhất không phải sai số, mà là <b>sai hoàn toàn im lặng</b>: phép nhân vẫn cho ra ' +
           'một con số trông rất hợp lý, không có ngoại lệ nào, không có dòng log nào, và cảnh báo ' +
           '"sắp đầy đĩa" của bạn sẽ nổ muộn hơn tám lần so với đúng.<br><br>' +
           'Chi phí của việc làm đúng là <b>một lần <code>cat</code> nữa</b>. Nguyên tắc để mang theo ' +
           'suốt khoá học: <code>/sys</code> tồn tại chính là để bày các tham số này ra cho bạn ' +
           '<b>hỏi</b> thay vì <b>đoán</b>. Mỗi hằng số bạn nhét cứng vào script là một giả định về ' +
           'phần cứng, và giả định đó sẽ sai đúng vào ngày board đổi nhà cung cấp linh kiện.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN D — ÔN XEN KẼ (3 câu, về Bài 2, 3 và 4)
     Không câu nào mang huy hiệu trục: trục chỉ nằm ở A, B, C.
     ══════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 4.</b> Nhìn lại phiên chạy ở câu B3: script <code>setup.sh</code> in ra hai dòng ' +
         'lỗi (<code>Permission denied</code> và <code>No such file or directory</code>), vậy mà ' +
         '<code>echo $?</code> ngay sau khi nó kết thúc lại cho <b>0</b>. Vì sao?',
      opts: [
        'Vì hai lỗi đó chỉ là cảnh báo, không phải lỗi thật, nên không tính vào mã thoát.',
        'Vì mã thoát của một script là mã thoát của <b>lệnh cuối cùng</b> trong nó — ở đây là ' +
          '<code>ls -l</code>, và lệnh đó thành công.',
        'Vì <code>$?</code> chỉ ghi nhận lỗi của lệnh dựng sẵn, còn <code>cat</code> và ' +
          '<code>echo</code> là lệnh ngoài.',
        'Vì bash cộng dồn mã thoát của mọi lệnh rồi lấy trung bình, ra 0.'
      ],
      a: 1,
      why: 'Mặc định, mã thoát của một script chính là mã thoát của <b>lệnh cuối cùng chạy trong ' +
           'nó</b>. Bốn lệnh trong <code>setup.sh</code>: hai lệnh đầu hỏng, hai lệnh sau chạy được, ' +
           'và lệnh cuối là <code>ls -l</code> — thành công, trả 0. Toàn bộ script vì thế báo 0.<br><br>' +
           'Đây là một trong những cách im lặng nhất để một hệ thống tự động hoá nói dối bạn: hệ thống ' +
           'build hoặc trình quản lý dịch vụ nhìn mã thoát 0 và kết luận "xong tốt", trong khi phần ' +
           'quan trọng nhất của script đã hỏng. Bài 4 đã cho bạn thấy đúng hình dạng đó ở một script ' +
           'kiểm thử báo PASS sai.<br><br>' +
           '<b>Cách chữa,</b> và bạn sẽ dùng nó trong mọi script từ giờ: đặt ' +
           '<code>set -euo pipefail</code> ở đầu file. <code>-e</code> dừng ngay khi có lệnh thất bại, ' +
           '<code>-u</code> báo lỗi khi dùng biến chưa đặt, <code>-o pipefail</code> làm cả đường ống ' +
           'thất bại nếu một khâu bất kỳ trong đó thất bại. Bài 13 sẽ dựng cả một script build quanh ' +
           'đúng ba tuỳ chọn này.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 3.</b> Trên WSL2, ổ C: của Windows xuất hiện ở <code>/mnt/c</code>. Điều này khớp ' +
         'thế nào với những gì Bài 5 vừa dạy, và vì sao Bài 3 lại bắt bạn <b>không</b> đặt cây build ở ' +
         'đó?',
      opts: [
        '<code>/mnt/c</code> là một cây thư mục thứ hai, tách biệt với <code>/</code>; nó chậm vì nằm ' +
          'trên ổ cứng còn <code>/</code> nằm trong RAM.',
        'Ổ C: được <b>gắn</b> vào cây Linux tại <code>/mnt/c</code> — đúng mô hình một cây duy nhất. ' +
          'Nó chậm vì mỗi thao tác file phải đi qua một lớp dịch giữa hai hệ điều hành, và Bài 3 đo ' +
          'được chênh lệch <b>hàng chục lần</b> cho cùng một phép thử.',
        '<code>/mnt/c</code> chậm vì Windows khoá file, và chỉ cần tắt phần mềm diệt virus là hết chậm.',
        'Không nên dùng <code>/mnt/c</code> vì nó chỉ đọc, không ghi được từ trong WSL.'
      ],
      a: 1,
      why: '<code>/mnt/c</code> là một <b>điểm gắn</b> như mọi điểm gắn khác — đúng mô hình một cây duy ' +
           'nhất mà Bài 5 vừa dạy: không có chữ cái ổ đĩa, chỉ có một thư mục trong cây được phủ lên ' +
           'bởi một hệ thống file khác. Kiểm chứng ngay được bằng <code>cat /proc/mounts</code>: dòng ' +
           'của <code>/mnt/c</code> ghi loại <code>9p</code> (hoặc <code>drvfs</code>), khác hẳn ' +
           '<code>ext4</code> của <code>/</code>.<br><br>' +
           'Chính chữ đó giải thích cái chậm. Mỗi lần mở, đọc hay đóng một file dưới ' +
           '<code>/mnt/c</code>, yêu cầu phải đi qua một <b>giao thức chuyển tiếp giữa hai hệ điều ' +
           'hành</b> chứ không xuống thẳng ổ đĩa. Phép thử 500 lần <code>touch</code> ở Bài 3 cho ' +
           'thấy khoảng cách lên tới hàng chục lần, và với một cây mã nguồn kernel gồm hàng chục nghìn ' +
           'file thì khác biệt đó là hàng giờ đồng hồ.<br><br>' +
           'Quy tắc mang theo cả khoá học: mọi thứ build ra đều để trong <code>~</code>. Chỉ dùng ' +
           '<code>/mnt/c</code> để <b>chuyển file</b> giữa hai bên.' },

    { id: 'd3', k: 'free', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 2.</b> Câu C4 dùng <code>/proc/cmdline</code> để đọc tham số mà bootloader đã ' +
         'truyền cho kernel. Hãy nối lại với luồng khởi động: <b>ai</b> tạo ra chuỗi đó, ' +
         '<b>khi nào</b>, và vì sao Bài 2 gọi nó là "kênh giao tiếp duy nhất"? Nêu thêm ' +
         '<b>hai</b> tham số thường có trong đó và tác dụng của chúng.',
      rows: 7,
      crit: [
        'Nói rõ bootloader (U-Boot) là bên tạo ra chuỗi đó, dưới tên bootargs',
        'Nói rõ thời điểm: ngay trước khi bootloader trao quyền cho kernel, tức là ở mảnh thứ ba trong bốn mảnh của luồng khởi động',
        'Giải thích được vì sao là kênh DUY NHẤT: bàn giao xong thì bootloader biến mất khỏi bộ nhớ, không còn cách nào nói chuyện với kernel nữa',
        'Nêu đúng ít nhất hai tham số, ví dụ console= (kernel in log ra đâu), root= (rootfs nằm ở thiết bị nào), rdinit=/init= (chương trình đầu tiên chạy)',
        'Nói được vì sao đọc lại /proc/cmdline trên board lạ lại hữu ích: đó là cách xác minh bootloader thật sự đã truyền gì, thay vì tin vào cấu hình bạn nghĩ là đã nạp'
      ],
      sol: 'Chuỗi đó do <b>bootloader</b> (trên board thật thường là U-Boot) tạo ra, dưới cái tên ' +
           '<code>bootargs</code>, và nó được trao cho kernel <b>ngay tại khoảnh khắc bàn giao</b> — ' +
           'mảnh thứ ba trong bốn mảnh của luồng khởi động ở Bài 2.<br><br>' +
           'Nó là <b>kênh duy nhất</b> vì sau khi bàn giao, bootloader <b>biến mất</b>: kernel dùng ' +
           'lại chính vùng nhớ đó, và không còn tồn tại bên nào để mà hỏi thêm. Mọi thứ bootloader ' +
           'muốn nói với kernel phải nằm gọn trong chuỗi ký tự ấy (cùng với Device Tree). Kernel giữ ' +
           'lại nguyên văn chuỗi đó và bày ra ở <code>/proc/cmdline</code> — thêm một minh hoạ cho ' +
           'điều Bài 5 vừa dạy: <code>/proc</code> là cửa sổ nhìn vào trạng thái bên trong kernel.<br><br>' +
           'Các tham số hay gặp: <code>console=ttyAMA0</code> (kernel in log ra cổng nào — sai chỗ này ' +
           'thì màn hình serial im lặng tuyệt đối và bạn tưởng board chết), <code>root=/dev/mmcblk0p2</code> ' +
           '(rootfs nằm ở thiết bị nào), <code>rdinit=/init</code> hoặc <code>init=</code> (chương ' +
           'trình đầu tiên kernel chạy sau khi gắn xong rootfs), <code>rw</code> / <code>ro</code> ' +
           '(gắn rootfs cho ghi hay chỉ đọc).<br><br>' +
           'Vì sao đọc lại nó trên board lạ lại đáng giá: nó cho bạn biết bootloader ' +
           '<b>thật sự đã truyền gì</b>, chứ không phải cái bạn <i>nghĩ</i> là mình đã cấu hình. Hai ' +
           'thứ đó lệch nhau thường xuyên hơn bạn tưởng, và Chặng 06 sẽ cho bạn tự tay sửa chuỗi này ' +
           'trong U-Boot.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN E — THỰC HÀNH (6 câu)
     2 dự đoán output · 2 gõ lệnh · 1 sửa lỗi · 1 thử thách
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'num', tag: 'Dự đoán output',
      q: 'File <code>/sys/class/net/eth0/mtu</code> chứa MTU của giao diện mạng, và ' +
         '<code>cat</code> nó ra được <code>1500</code>. <b>Trước khi chạy</b>, hãy dự đoán: ' +
         '<code>wc -c &lt; /sys/class/net/eth0/mtu</code> sẽ in ra <b>số mấy</b>? Rồi chạy để đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'chạy sau khi đã viết dự đoán ra giấy', code:
            'cat /sys/class/net/eth0/mtu\n' +
            'ls -l /sys/class/net/eth0/mtu\n' +
            'wc -c < /sys/class/net/eth0/mtu' }
      ],
      a: 5,
      tol: 0,
      why: 'Đáp án là <b>5</b>: bốn ký tự <code>1500</code> cộng một ký tự xuống dòng ' +
           '<code>\\n</code>. Kiểm chứng tận gốc bằng <code>od -c</code>, kết quả thật trên máy bạn là ' +
           '<code>1   5   0   0  \\n</code> rồi <code>0000005</code>.<br><br>' +
           '<b>Nhưng cái đáng nhớ nằm ở dòng <code>ls -l</code>:</b> nó báo <b>4096</b>. Không phải ' +
           '5, và cũng không phải 0 như các file trong <code>/proc</code>. Đây là chỗ ' +
           '<code>/sys</code> khác <code>/proc</code> ở bề mặt, và biết trước thì đỡ hoang mang: mỗi ' +
           'thuộc tính trong <code>sysfs</code> được kernel phục vụ qua một bộ đệm <b>một trang nhớ</b>, ' +
           'nên nó khai luôn kích thước bằng kích thước trang — 4096 byte trên máy bạn. Con số đó là ' +
           '<b>sức chứa</b> của bộ đệm, không phải lượng dữ liệu.<br><br>' +
           'Điểm chung với <code>/proc</code> vẫn giữ nguyên và mới là điều quan trọng: cả hai đều ' +
           '<b>không</b> chiếm byte nào trên đĩa (<code>du -sh /sys</code> ra <b>0</b>), và nội dung ' +
           'chỉ được sinh ra lúc bạn đọc. Chỉ có cách khai kích thước là khác. Bài học rút ra thì y ' +
           'hệt câu B1: với hai thư mục này, <b>đừng bao giờ tin trường kích thước</b> — muốn biết ' +
           'thật thì đọc thật.<br><br>' +
           'Hệ quả thực dụng: một chương trình C đọc thuộc tính sysfs không được cấp phát bộ nhớ theo ' +
           '<code>st_size</code>. Nó phải đọc cho tới khi hết. Bài 19 sẽ viết đúng vòng lặp đó.' },

    { id: 'e2', k: 'mcq', tag: 'Dự đoán output',
      q: 'Bạn vừa tạo một script <code>hello.sh</code> trong thư mục hiện tại và đã ' +
         '<code>chmod +x</code> cho nó. Bạn gõ <b>đúng hai lệnh</b> dưới đây. <b>Dự đoán trước</b> rồi ' +
         'chạy: kết quả nào đúng?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'chạy sau khi đã viết dự đoán ra giấy', code:
            'printf \'#!/bin/bash\\necho "It works"\\n\' > hello.sh\n' +
            'chmod +x hello.sh\n' +
            'hello.sh; echo "rc=$?"\n' +
            './hello.sh; echo "rc=$?"' }
      ],
      opts: [
        'Cả hai lệnh đều in <code>It works</code> và <code>rc=0</code>: dấu <code>./</code> chỉ là ' +
          'cách viết cho rõ ràng.',
        'Lệnh đầu báo <code>hello.sh: command not found</code> và <code>rc=127</code>; lệnh sau in ' +
          '<code>It works</code> và <code>rc=0</code>.',
        'Lệnh đầu báo <code>Permission denied</code> và <code>rc=126</code>; lệnh sau chạy được.',
        'Cả hai lệnh đều báo lỗi, vì script phải chạy bằng <code>bash hello.sh</code>.'
      ],
      a: 1,
      why: 'Đây là kết quả thật trên máy bạn: <code>hello.sh</code> → ' +
           '<code>hello.sh: command not found</code>, <code>rc=127</code>; ' +
           '<code>./hello.sh</code> → <code>It works</code>, <code>rc=0</code>.<br><br>' +
           'Lý do nằm ở chỗ hai bài học vừa gặp nhau. Từ Bài 4: khi bạn gõ một tên <b>không chứa dấu ' +
           'gạch chéo</b>, shell hiểu đó là "tìm giúp tôi trong <code>$PATH</code>". Thư mục hiện tại ' +
           '<b>không</b> nằm trong <code>$PATH</code> — và đó là một quyết định an ninh có chủ đích: ' +
           'nếu có, thì chỉ cần ai đó thả một file tên <code>ls</code> vào thư mục dùng chung là bạn ' +
           'chạy phải mã của họ mà không biết. Không tìm thấy trong <code>$PATH</code> thì shell trả ' +
           '<b>127</b>, mã dành riêng cho "không có lệnh nào tên như vậy".<br><br>' +
           'Từ Bài 5: <code>./hello.sh</code> <b>có</b> dấu gạch chéo, nên nó là một ' +
           '<b>đường dẫn</b> — đường dẫn tương đối bắt đầu từ thư mục hiện tại (<code>.</code>). ' +
           'Shell không tìm kiếm gì nữa; nó chạy thẳng đúng file đó.<br><br>' +
           'Phân biệt hai mã lỗi này thì chẩn đoán nhanh hơn hẳn: <b>127</b> = không tìm thấy lệnh ' +
           '(sai tên, hoặc thiếu <code>./</code>, hoặc chưa cài); <b>126</b> = tìm thấy rồi nhưng ' +
           'không chạy được (thường là quên <code>chmod +x</code>).' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Chỉ dùng <code>cat</code>, <code>ls</code> và các phép tính của shell — <b>không</b> dùng ' +
         '<code>lsblk</code>, <code>ip</code>, <code>df</code>, <code>mount</code> hay bất kỳ công cụ ' +
         'chuyên dụng nào — hãy viết lệnh cho <b>bốn</b> việc sau, chạy thật, rồi dán lệnh của bạn vào ' +
         'ô trả lời:<br>' +
         '<b>(1)</b> In dung lượng ổ <code>/dev/sda</code> ra MiB.<br>' +
         '<b>(2)</b> Liệt kê tên mọi giao diện mạng của máy.<br>' +
         '<b>(3)</b> In địa chỉ MAC và trạng thái kết nối của <code>eth0</code>.<br>' +
         '<b>(4)</b> Cho biết <code>/proc</code>, <code>/sys</code>, <code>/dev</code> và ' +
         '<code>/tmp</code> đang được gắn bằng loại hệ thống file nào.',
      rows: 8,
      hint: 'Câu (2) không cần lệnh nào đặc biệt: mỗi giao diện mạng là một <b>mục trong một thư ' +
            'mục</b>. Câu (4) có một file duy nhất chứa toàn bộ câu trả lời.',
      crit: [
        '(1) Dùng /sys/block/sda/size NHÂN với /sys/block/sda/queue/logical_block_size rồi chia 1024 hai lần — không nhét cứng 512',
        '(2) Dùng ls /sys/class/net (kết quả trên máy bạn: eth0 và lo)',
        '(3) Dùng cat /sys/class/net/eth0/address và cat /sys/class/net/eth0/operstate',
        '(4) Dùng cat /proc/mounts (hoặc /proc/self/mounts) rồi lọc bốn dòng cần thiết',
        'Mọi lệnh đều chạy thật và cho ra kết quả, không chỉ viết ra rồi thôi',
        'Nêu được nhận xét đúng: cả bốn câu trả lời đều là ĐỌC FILE, nên chúng chạy được trên board tối giản không có công cụ chuyên dụng nào'
      ],
      sol: '<b>(1)</b> <code>echo $(( $(cat /sys/block/sda/size) * $(cat /sys/block/sda/queue/logical_block_size) / 1024 / 1024 ))</code> ' +
           '→ <b>356</b> trên máy bạn. Đọc cả hai file thay vì nhân bừa 512, đúng lý do đã bàn ở câu C5.<br><br>' +
           '<b>(2)</b> <code>ls /sys/class/net</code> → <code>eth0  lo</code>. Mỗi giao diện là một ' +
           'mục trong thư mục đó. Thêm <code>ls -l</code> thì thấy chúng đều là <b>liên kết</b> trỏ ' +
           'sâu vào <code>/sys/devices/…</code> — <code>/sys/class/</code> chỉ là cách sắp xếp lại ' +
           '"theo chức năng" cho dễ tìm, còn cây thật thì sắp xếp "theo đường phần cứng nối vào".<br><br>' +
           '<b>(3)</b> <code>cat /sys/class/net/eth0/address</code> và ' +
           '<code>cat /sys/class/net/eth0/operstate</code>. Cùng thư mục đó còn có ' +
           '<code>mtu</code>, <code>speed</code>, và cả <code>statistics/</code> với các bộ đếm gói ' +
           'tin.<br><br>' +
           '<b>(4)</b> <code>cat /proc/mounts</code> — cả bốn câu trả lời nằm trong một file: ' +
           '<code>proc</code>, <code>sysfs</code>, <code>devtmpfs</code>, <code>tmpfs</code>. Lệnh ' +
           '<code>mount</code> gõ không tham số chẳng làm gì hơn ngoài đọc đúng file này rồi in đẹp ' +
           'lại.<br><br>' +
           '<b>Nhận xét quan trọng hơn cả bốn đáp án:</b> không câu nào cần một công cụ chuyên dụng. ' +
           'Tất cả đều là <code>cat</code> và <code>ls</code>. Đó là lý do một board tối giản chỉ có ' +
           'BusyBox vẫn chẩn đoán được đầy đủ — và là lý do "mọi thứ là file" không phải khẩu hiệu mà ' +
           'là một tính năng bạn sẽ dựa vào rất nhiều.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Hãy <b>tự thiết kế và chạy</b> một thí nghiệm chứng minh rằng nội dung ' +
         '<code>/proc</code> được sinh ra <b>lúc đọc</b> chứ không phải nằm sẵn ở đó. Yêu cầu: dùng ' +
         '<code>md5sum</code> và <code>sleep</code>, so sánh <b>hai</b> file khác nhau trong ' +
         '<code>/proc</code> — một file mà kết quả <b>không</b> đổi và một file mà kết quả ' +
         '<b>có</b> đổi — rồi giải thích vì sao sự khác nhau đó <b>không</b> mâu thuẫn với kết luận.',
      rows: 7,
      hint: 'Nội dung được sinh lại mỗi lần đọc. Nhưng "sinh lại" không có nghĩa là "khác đi" — nó ' +
            'khác đi hay không là tuỳ thứ đang được mô tả có đổi hay không.',
      crit: [
        'Chạy được md5sum trên hai file trong /proc, hai lần, cách nhau bằng sleep',
        'Chọn đúng một file KHÔNG đổi (ví dụ /proc/cpuinfo) và một file CÓ đổi (ví dụ /proc/uptime hoặc /proc/meminfo)',
        'Dán được kết quả thật: hai mã băm của cpuinfo trùng nhau, hai mã băm của uptime khác nhau',
        'Giải thích đúng: cả hai đều được sinh lại lúc đọc; cpuinfo trùng vì thông tin CPU không đổi, uptime khác vì thời gian chạy luôn tăng',
        'Bác bỏ được suy luận sai "trùng nhau nghĩa là file tĩnh nằm sẵn trên đĩa"',
        'Nêu được ít nhất một thí nghiệm bổ sung củng cố kết luận (ví dụ du -sh /proc ra 0, hoặc ls -l báo 0 byte trong khi wc -c ra 9294)'
      ],
      sol: 'Một cách làm đạt yêu cầu:<br>' +
           '<code>md5sum /proc/cpuinfo /proc/uptime; sleep 1; md5sum /proc/cpuinfo /proc/uptime</code><br><br>' +
           'Kết quả thật trên máy bạn: hai mã băm của <code>/proc/cpuinfo</code> ' +
           '<b>giống hệt nhau</b> (<code>1668dfd2a37ec149a34ff4caeffffaa4</code> cả hai lần), còn hai ' +
           'mã băm của <code>/proc/uptime</code> thì <b>khác nhau hoàn toàn</b> ' +
           '(<code>2f334305…</code> rồi <code>fa575a3e…</code>).<br><br>' +
           '<b>Vì sao điều này không mâu thuẫn:</b> cả hai file đều được sinh lại ở mỗi lần đọc. ' +
           '"Sinh lại" chỉ nói về <i>cách</i> nội dung xuất hiện, không hứa hẹn gì về việc nội dung ' +
           'có <i>khác đi</i> hay không. <code>cpuinfo</code> mô tả CPU — một thứ không đổi trong lúc ' +
           'máy đang chạy — nên hàm sinh nội dung chạy lại và cho ra đúng chuỗi cũ. ' +
           '<code>uptime</code> mô tả thời gian máy đã chạy — luôn tăng — nên lần nào cũng khác. Cùng ' +
           'một cơ chế, hai kết quả, và đó là bằng chứng mạnh hơn hẳn so với chỉ nhìn một file.<br><br>' +
           '<b>Điểm cần cẩn thận trong lập luận:</b> mã băm trùng nhau <b>không</b> chứng minh file ' +
           'nằm tĩnh trên đĩa. Muốn loại bỏ khả năng đó thì cần bằng chứng khác loại, và bạn đã có ' +
           'sẵn: <code>du -sh /proc</code> ra <b>0</b>, trong khi <code>ls -l /proc/cpuinfo</code> ' +
           'báo <b>0</b> byte mà <code>wc -c</code> đọc ra <b>9294</b>. Một file thật trên đĩa không ' +
           'thể vừa chiếm 0 byte vừa cho ra 9294 byte.<br><br>' +
           '<i>Ghi chú về phương pháp:</i> lối làm này — dựng một thí nghiệm có cả trường hợp ' +
           '<b>khẳng định</b> lẫn trường hợp <b>phủ định</b>, thay vì chỉ tìm cái xác nhận điều mình ' +
           'đã tin — là kỹ năng dùng lại được suốt phần còn lại của khoá học, và cũng là cách bạn nên ' +
           'kiểm tra mọi board mới.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Một người mới học thấy máy sắp hết đĩa nên viết script dưới đây để "dọn dẹp và ghi lại hiện ' +
         'trạng". <b>May cho họ là cả bốn dòng đều thất bại.</b> Với <b>mỗi dòng</b>: cho biết thông ' +
         'báo lỗi nào xuất hiện, <b>vì sao</b> nó thất bại, và điều gì đã xảy ra nếu nó thành công. ' +
         'Sau đó viết lại một script làm đúng ý định ban đầu.',
      blocks: [
        { t: 'code', where: 'file', name: 'cleanup.sh', lang: 'bash', code:
            '#!/bin/bash\n' +
            'rm -f /proc/uptime\n' +
            'touch /sys/newfile\n' +
            'cat /proc > /tmp/proc-dump.txt\n' +
            'du -sh /proc /sys /dev' },
        { t: 'code', where: 'wsl', name: 'chạy thật để đối chiếu sau khi đã dự đoán', code:
            'rm -f /proc/uptime; echo "rc=$?"\n' +
            'touch /sys/newfile; echo "rc=$?"\n' +
            'cat /proc; echo "rc=$?"\n' +
            'du -sh /proc /sys /dev' }
      ],
      rows: 9,
      hint: 'Ba dòng đầu thất bại vì <b>ba lý do khác nhau</b>, không phải cùng một lý do. Dòng thứ tư ' +
            'thì chạy được nhưng câu trả lời của nó mới là điều đáng chú ý.',
      crit: [
        'Dòng 1: rm: cannot remove \'/proc/uptime\': Permission denied, rc=1 — vì procfs không cho xoá mục nào, chúng do kernel sinh ra chứ không phải file trên đĩa; kể cả root cũng không xoá được',
        'Dòng 2: touch: cannot touch \'/sys/newfile\': Permission denied, rc=1 — sysfs không cho tạo mục mới; cấu trúc của nó do mô hình thiết bị của kernel quyết định, không phải do người dùng',
        'Dòng 3: cat: /proc: Is a directory, rc=1 — /proc là thư mục chứ không phải file, cat không đọc thư mục',
        'Dòng 4: chạy được, in ra 0 cho cả ba — và đó chính là câu trả lời cho ý định ban đầu: ba thư mục này không chiếm byte nào nên dọn chúng không giải phóng được gì',
        'Nêu đúng ý định ban đầu là sai từ gốc: xoá /proc, /sys, /dev không lấy lại được dung lượng nào cả',
        'Viết lại được script làm đúng ý định: đo chỗ thật sự chiếm đĩa (ví dụ du -sh /var /tmp /home hoặc du -xh / rồi sắp xếp) và ghi kết quả ra file trong /tmp',
        'Nêu được vì sao dùng du -x (hoặc --one-file-system) khi quét từ /: để không đi lạc vào các hệ thống file ảo và các điểm gắn khác'
      ],
      sol: '<b>Dòng 1 — <code>rm -f /proc/uptime</code></b> → ' +
           '<code>rm: cannot remove \'/proc/uptime\': Permission denied</code>, <code>rc=1</code>. ' +
           'Không phải chuyện thiếu <code>sudo</code>: <code>procfs</code> đơn giản là ' +
           '<b>không cài đặt thao tác xoá</b>. Mỗi mục ở đó là một cửa sổ nhìn vào cấu trúc dữ liệu ' +
           'trong kernel; "xoá" nó không có nghĩa gì cả. Kể cả <code>root</code> cũng không xoá được.<br><br>' +
           '<b>Dòng 2 — <code>touch /sys/newfile</code></b> → ' +
           '<code>touch: cannot touch \'/sys/newfile\': Permission denied</code>, <code>rc=1</code>. ' +
           'Cùng họ lý do nhưng theo chiều ngược lại: bạn không <b>thêm</b> được mục vào ' +
           '<code>sysfs</code>. Cấu trúc của nó phản ánh mô hình thiết bị bên trong kernel, và chỉ ' +
           'kernel mới dựng ra được. Bạn ghi vào <b>thuộc tính đã có</b> thì được (nếu có quyền), ' +
           'nhưng tạo mục mới thì không.<br><br>' +
           '<b>Dòng 3 — <code>cat /proc</code></b> → <code>cat: /proc: Is a directory</code>, ' +
           '<code>rc=1</code>. Lý do <b>khác hẳn hai dòng trên</b> và không liên quan gì tới ' +
           '<code>/proc</code>: <code>cat</code> đọc file, còn <code>/proc</code> là thư mục. Đây là ' +
           'lỗi bạn sẽ gặp với bất kỳ thư mục nào.<br><br>' +
           '<b>Dòng 4 — <code>du -sh /proc /sys /dev</code></b> → chạy được, và in ra <b>0</b> cho ' +
           'cả ba. Đây mới là câu trả lời cho toàn bộ ý định của script: <b>ba thư mục đó không chiếm ' +
           'byte nào</b>, nên dọn chúng không giải phóng được gì. Ý tưởng ban đầu sai từ gốc, không ' +
           'phải sai ở cách viết lệnh.<br><br>' +
           '<b>Nếu chúng "thành công"</b> — tức là nếu người viết đủ kiên trì để tìm cách ép — thì ' +
           'kết quả tệ hơn hẳn: mất các cửa sổ chẩn đoán, hệ thống vẫn chạy nhưng ' +
           '<code>ps</code>/<code>top</code>/<code>free</code> mù, đúng kịch bản câu C3.<br><br>' +
           '<b>Script làm đúng ý định:</b><br>' +
           '<code>#!/bin/bash</code><br>' +
           '<code>set -euo pipefail</code><br>' +
           '<code>du -xh --max-depth=1 / 2&gt;/dev/null | sort -h | tail -n 15 &gt; /tmp/disk-report.txt</code><br>' +
           '<code>cat /tmp/disk-report.txt</code><br>' +
           'Tuỳ chọn <code>-x</code> (không vượt qua ranh giới hệ thống file) là chi tiết quan trọng ' +
           'nhất: nó giữ cho phép quét ở nguyên trong rootfs, không lạc vào <code>/proc</code>, ' +
           '<code>/sys</code> hay <code>/mnt/c</code> — nơi mà, như Bài 3 đã đo, một phép quét có thể ' +
           'chạy lâu tới mức bạn tưởng máy treo.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: '<b>Câu này được phép chưa giải xong.</b> Bạn đã thấy ở câu E4 rằng muốn biết một giá trị ' +
         'trong <code>/proc</code> hay <code>/sys</code> có đổi hay không thì phải <b>đọc lại</b>. ' +
         'Hãy: <b>(a)</b> chứng minh bằng thí nghiệm rằng bộ đếm ' +
         '<code>/sys/class/net/eth0/statistics/rx_bytes</code> là số liệu sống; <b>(b)</b> viết một ' +
         'vòng lặp shell theo dõi nó mỗi giây và in ra khi có thay đổi; <b>(c)</b> rồi trả lời câu ' +
         'hỏi mở: cách làm ở (b) có nhược điểm gì, và một chương trình muốn <b>được đánh thức</b> khi ' +
         'giá trị đổi — thay vì tự hỏi đi hỏi lại — thì cần cơ chế gì?',
      rows: 9,
      hint: 'Phần (c) không có câu trả lời trong Bài 5. Hãy tự đặt tên cho vấn đề trước đã: một vòng ' +
            'lặp hỏi mỗi giây thì tốn gì, và bỏ sót gì?',
      crit: [
        '(a) Chạy được cat hai lần cách nhau vài giây và dán hai giá trị khác nhau (trên máy đo được 59290 rồi 60704)',
        '(a) Nói rõ mình có tạo lưu lượng mạng hay không, vì nếu máy hoàn toàn im lặng thì con số có thể không đổi',
        '(b) Viết được vòng lặp có sleep, có lưu giá trị cũ và chỉ in khi khác giá trị cũ',
        '(c) Nêu được ít nhất hai nhược điểm của việc hỏi theo chu kỳ: tốn CPU (và tốn pin) dù không có gì đổi, và BỎ SÓT mọi thay đổi xảy ra giữa hai lần hỏi',
        '(c) Nêu được ít nhất một nhược điểm nữa: độ trễ phát hiện bằng đúng chu kỳ hỏi, muốn nhanh hơn thì lại càng tốn CPU',
        '(c) Đặt tên đúng cho hai hướng giải quyết: chờ có sự kiện (thay vì hỏi), và một tiến trình chờ được NHIỀU nguồn cùng lúc'
      ],
      sol: '<b>(a)</b> <code>cat /sys/class/net/eth0/statistics/rx_bytes; sleep 2; ' +
           'cat /sys/class/net/eth0/statistics/rx_bytes</code>. Kết quả thật trên máy bạn: ' +
           '<b>59290</b> rồi <b>60704</b> — chênh 1414 byte trong hai giây. Đây là bộ đếm kernel giữ ' +
           'trong RAM, được đọc ra tại đúng thời điểm bạn hỏi. Nếu máy bạn hoàn toàn im lặng thì hai ' +
           'số có thể trùng nhau; khi đó hãy tạo chút lưu lượng rồi đo lại — và <b>ghi rõ điều kiện ' +
           'thí nghiệm</b> vào câu trả lời, đó là một phần của việc đo cho tử tế.<br><br>' +
           '<b>(b)</b> Một cách viết đạt yêu cầu:<br>' +
           '<code>prev=$(cat /sys/class/net/eth0/statistics/rx_bytes)</code><br>' +
           '<code>while sleep 1; do</code><br>' +
           '<code>&nbsp;&nbsp;cur=$(cat /sys/class/net/eth0/statistics/rx_bytes)</code><br>' +
           '<code>&nbsp;&nbsp;[ "$cur" != "$prev" ] &amp;&amp; echo "+$((cur - prev)) byte"</code><br>' +
           '<code>&nbsp;&nbsp;prev=$cur</code><br>' +
           '<code>done</code><br><br>' +
           '<b>(c) — phần chưa có lời giải trong Bài 5, và đó là chủ ý.</b> Cách làm trên gọi là ' +
           '<b>hỏi theo chu kỳ</b>, và nó có ba nhược điểm không sửa được bằng cách viết khéo hơn:<br>' +
           '<b>1. Tốn công vô ích.</b> Đánh thức mỗi giây kể cả khi chẳng có gì đổi. Trên máy bàn thì ' +
           'không ai để ý; trên một thiết bị chạy pin, đúng vòng lặp này là thứ giết pin, vì CPU không ' +
           'bao giờ ngủ sâu được.<br>' +
           '<b>2. Bỏ sót.</b> Mọi thay đổi xảy ra <i>giữa</i> hai lần hỏi đều không được nhìn thấy. Với ' +
           'một bộ đếm cộng dồn thì bạn còn thấy tổng; với một trạng thái bật-rồi-tắt-ngay thì bạn ' +
           'mất hẳn.<br>' +
           '<b>3. Trễ.</b> Độ trễ phát hiện bằng đúng chu kỳ hỏi. Muốn nhanh hơn thì phải hỏi dày ' +
           'hơn, tức là quay lại làm nặng thêm nhược điểm 1. Không có điểm cân bằng nào tốt.<br><br>' +
           '<b>Hướng đi đúng có hai tầng, và bạn sẽ gặp cả hai:</b> thay vì <i>hỏi</i>, chương trình ' +
           '<b>chờ</b> — nó nói với kernel "đánh thức tôi khi có gì đó xảy ra ở đây" rồi ngủ, không ' +
           'tốn một chu kỳ CPU nào trong lúc chờ. Bài 19 dựng nền cho việc này khi mổ xẻ lời gọi hệ ' +
           'thống; Bài 24 giải quyết tầng thứ hai — làm sao một tiến trình chờ được <b>nhiều nguồn ' +
           'cùng lúc</b> (mạng, cảm biến, bàn phím) mà không cần một luồng cho mỗi nguồn. Đó là mô ' +
           'hình mà gần như mọi phần mềm nhúng nghiêm túc đều được viết theo.<br><br>' +
           'Nếu bạn tự nghĩ ra được ý "để kernel báo cho tôi" trước khi đọc đoạn này thì bạn đã tự đi ' +
           'tới đúng câu hỏi mà hai bài đó tồn tại để trả lời.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN F — BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Mỗi dòng phải có liên kết tới đúng mục (CLAUDE.md §13.7).
     Slug lấy máy móc bằng Render.slug() trên chính chuỗi tiêu đề.
     ══════════════════════════════════════════════ */
  diag: [

    ['A1',
     'Bạn chưa nắm câu "mọi thứ là file" nói về <b>giao diện</b> chứ không nói về <b>dữ liệu</b>: cùng một bộ lệnh đọc/ghi dùng được cho đĩa, cho thiết bị và cho trạng thái kernel.',
     '<a href="#/bai-05#moi-thu-la-file-cau-nay-nghia-la-gi">Đọc lại — Mọi thứ là file — câu này nghĩa là gì</a>'],

    ['A2, B1, C1',
     '<b>Trục 1.</b> Bạn còn coi <code>/proc</code> và <code>/sys</code> như file nằm sẵn trên đĩa. Chúng được <b>sinh ra lúc bạn đọc</b> — đó là lý do kích thước báo 0 mà đọc ra có nội dung, và là lý do không được sao lưu chúng.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại — /proc và /sys — hai thư mục không nằm trên đĩa</a>'],

    ['A3, B4, C2',
     '<b>Trục 2.</b> Bạn còn nghĩ file trong <code>/dev</code> chứa dữ liệu. Nó chứa <b>major</b> và <b>minor</b> — major chọn trình điều khiển, minor chọn thiết bị cụ thể. Không có driver thì tạo file cũng vô nghĩa.',
     '<a href="#/bai-05#moi-thu-la-file-cau-nay-nghia-la-gi">Đọc lại — Mọi thứ là file — câu này nghĩa là gì</a>'],

    ['A4, B5, C3',
     '<b>Trục 3.</b> Bạn còn coi thư mục rỗng trong rootfs là thứ vô dụng. Mỗi thư mục đó là một <b>điểm gắn</b>: xoá đi thì hệ thống file tương ứng không còn chỗ để gắn vào, và board hỏng ở lúc khởi động chứ không phải lúc bạn xoá.',
     '<a href="#/bai-05#mot-cay-duy-nhat-khong-co-o-dia">Đọc lại — Một cây duy nhất, không có ổ đĩa</a>'],

    ['A5',
     'Bạn còn tìm chữ cái ổ đĩa. Linux có <b>đúng một cây</b>, gốc là <code>/</code>; mọi ổ đĩa, thẻ nhớ hay chia sẻ mạng đều xuất hiện dưới dạng một thư mục trong cây đó.',
     '<a href="#/bai-05#mot-cay-duy-nhat-khong-co-o-dia">Đọc lại — Một cây duy nhất, không có ổ đĩa</a>'],

    ['A6',
     'Bạn chưa rõ usr-merge: <code>/bin</code>, <code>/sbin</code>, <code>/lib</code> ngày nay là <b>liên kết</b> trỏ vào <code>/usr/…</code>, không phải bản sao. Đây là chi tiết quyết định khi bạn tự dựng rootfs.',
     '<a href="#/bai-05#mot-cay-duy-nhat-khong-co-o-dia">Đọc lại — Một cây duy nhất, không có ổ đĩa</a>'],

    ['A7, A8',
     'Bạn chưa đọc trôi ký tự đầu tiên của <code>ls -l</code> (<code>-</code> <code>d</code> <code>l</code> <code>c</code> <code>b</code> <code>p</code> <code>s</code>), hoặc chưa thuộc vai trò từng thư mục chuẩn trong cây.',
     '<a href="#/bai-05#mot-cay-duy-nhat-khong-co-o-dia">Đọc lại — Một cây duy nhất, không có ổ đĩa</a>'],

    ['B2',
     'Bạn chưa hiểu <code>/proc/self</code>: nó không trỏ tới một tiến trình cố định mà trỏ tới <b>chính tiến trình đang đọc nó</b>, nên mỗi lệnh nhìn thấy một giá trị khác nhau.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại — /proc và /sys — hai thư mục không nằm trên đĩa</a>'],

    ['B3, B6, E2',
     'Bạn chưa phân biệt được khi nào dùng đường dẫn tuyệt đối và khi nào dùng tương đối. Đường dẫn tương đối được giải nghĩa từ <b>thư mục hiện tại của tiến trình</b>, không phải từ chỗ chứa script.',
     '<a href="#/bai-05#duong-dan-tuyet-doi-va-tuong-doi">Đọc lại — Đường dẫn tuyệt đối và tương đối</a>'],

    ['C4',
     'Bạn chưa quen dùng <code>/proc</code> làm công cụ chẩn đoán đầu tiên trên một máy lạ. Đây là kỹ năng dùng được cả trên board chỉ có BusyBox, nơi không có <code>lscpu</code>, <code>free</code> hay <code>ip</code>.',
     '<a href="#/bai-05#thuc-hanh-doc-phan-cung-cua-may-ban-bang-cat">Đọc lại — Thực hành: đọc phần cứng của máy bạn bằng cat</a>'],

    ['C5, E3',
     'Bạn chưa thạo cách rút số liệu thật từ <code>/sys</code> và tính ra kết quả có ý nghĩa — kể cả việc đọc kích thước khối thay vì nhét cứng 512.',
     '<a href="#/bai-05#thuc-hanh-doc-phan-cung-cua-may-ban-bang-cat">Đọc lại — Thực hành: đọc phần cứng của máy bạn bằng cat</a>'],

    ['D1',
     '<b>Ôn Bài 4.</b> Mã thoát của một script mặc định là mã thoát của <b>lệnh cuối cùng</b>, nên một script có lệnh hỏng ở giữa vẫn báo thành công.',
     '<a href="#/bai-04#ma-thoat-cach-may-tra-loi-co-duoc-khong">Đọc lại Bài 4 — Mã thoát</a>'],

    ['D2',
     '<b>Ôn Bài 3.</b> <code>/mnt/c</code> là một điểm gắn dùng hệ thống file chuyển tiếp giữa hai hệ điều hành; đó là nguồn gốc của khoảng cách tốc độ đã đo được.',
     '<a href="#/bai-03#hai-he-thong-file-va-cai-bay-50-lan">Đọc lại Bài 3 — Hai hệ thống file và cái bẫy</a>'],

    ['D3',
     '<b>Ôn Bài 2.</b> Bootloader truyền <code>bootargs</code> cho kernel đúng lúc bàn giao rồi biến mất, nên đó là kênh giao tiếp duy nhất — và kernel bày lại nó ở <code>/proc/cmdline</code>.',
     '<a href="#/bai-02#moi-giai-doan-ban-giao-cai-gi">Đọc lại Bài 2 — Mỗi giai đoạn bàn giao cái gì</a>'],

    ['E1',
     'Bạn còn tin trường kích thước của file ảo. Trong <code>/proc</code> nó là <b>0</b>, trong <code>/sys</code> nó là <b>4096</b> (sức chứa một trang nhớ) — không con số nào là lượng dữ liệu thật.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại — /proc và /sys — hai thư mục không nằm trên đĩa</a>'],

    ['E4',
     'Bạn chưa dựng được thí nghiệm có cả trường hợp khẳng định lẫn phủ định. Đọc lại phần thực hành rồi làm lại: sinh lại lúc đọc <b>không</b> đồng nghĩa với nội dung phải khác đi.',
     '<a href="#/bai-05#thuc-hanh-doc-phan-cung-cua-may-ban-bang-cat">Đọc lại — Thực hành: đọc phần cứng của máy bạn bằng cat</a>'],

    ['E5',
     'Bạn chưa đọc kỹ bảng lỗi: <code>Permission denied</code> trong <code>/proc</code> và <code>/sys</code> không phải chuyện thiếu quyền, còn <code>Is a directory</code> là một loại lỗi hoàn toàn khác.',
     '<a href="#/bai-05#loi-thuong-gap">Đọc lại — Lỗi thường gặp</a>'],

    ['E6',
     'Câu này <b>không có lời giải trong Bài 5</b> và bạn không cần tự trách. Nếu muốn đi trước: vấn đề "hỏi theo chu kỳ hay chờ được đánh thức" là chủ đề của Bài 19 và Bài 24.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại — /proc và /sys — hai thư mục không nằm trên đĩa</a>']
  ]
});

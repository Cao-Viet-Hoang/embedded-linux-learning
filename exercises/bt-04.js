/* ============================================================
   BT-04 — Bài tập cho Bài 4: "Shell và cấu trúc một câu lệnh"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                              | PT | GIA | NGC | Tổng |
   |-------------------------------------------------------|----|-----|-----|------|
   | $? là mã thoát của ĐÚNG lệnh ngay trước, sống 1 lệnh   | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | Builtin thắng file ngoài; cd BUỘC phải là builtin      | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | Shell chỉ cắt dòng thành TỪ theo khoảng trắng          | 2  |  2  |  2  |  6   |  ← TRỤC 3
   | Cùng một tên lệnh có thể là ba chương trình khác nhau  | 2  |  1  |  2  |  5   |
   | && chạy tiếp khi thành công, ; chạy tiếp bất kể        | 2  |  2  |  1  |  5   |
   | man mục 2 (lời gọi hệ thống) và mục 3 (hàm thư viện)   | 2  |  1  |  1  |  4   |
   | Quy tắc 128 + N cho tiến trình bị tín hiệu giết        | 1  |  1  |  2  |  4   |
   | Tuỳ chọn ngắn gộp được, tuỳ chọn dài thì không         | 1  |  1  |  1  |  3   |
   | type / which / command -v khác nhau ở tầm nhìn         | 1  |  1  |  1  |  3   |
   | Tên file bắt đầu bằng dấu chấm là "ẩn"                 | 0  |  0  |  1  |  1   |
   | Dòng "total 16K" đếm khối đĩa, không phải byte         | 0  |  0  |  1  |  1   |

   Bước 3 — cắt: ba ứng viên 6 điểm. Ba ứng viên 5 và 4 điểm xuống mức hỏi
   MỘT lần: "ba chương trình cùng tên" ở B2, "&& so với ;" ở B3, "man mục 2/3"
   ở B6 và A7, "128 + N" ở E1.

   Bước 4 — loại: tên file ẩn và dòng "total" bị loại theo §13.3 — tra được
   trong mười giây, không xứng chín câu. "type / which / command -v" KHÔNG
   được làm trục riêng vì nó chỉ là hệ quả trực tiếp của trục 2; nó xuất hiện
   làm BẰNG CHỨNG trong B4 chứ không thành trục thứ tư.
   Kiểm tra chống trùng với các bộ trước: bt-01 xoáy MMU / bốn mảnh nối tiếp /
   Device Tree; bt-02 xoáy DRAM-SRAM-SPL / bàn giao rồi biến mất / bootargs;
   bt-03 xoáy ảo hoá cần cùng kiến trúc / hai họ QEMU / ranh giới 9P.
   Ba trục của bộ này không trùng cái nào — hợp lệ.

   Bước 6 — hiểu sai đối lập của từng trục nằm trong trường `mis` bên dưới.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 ($? sống một lệnh)  A2 phát biểu → B1 phiên chạy thật in 2 rồi 0
                                            → C1 script kiểm thử luôn báo PASS
     Trục 2 (builtin thắng)     A3 phát biểu → B4 ghi chú sai + ba kết quả thật
                                            → C3 mang script sang board BusyBox
     Trục 3 (cắt theo khoảng trắng) A4 phát biểu → B5 phiên rm xoá nhầm file, rc=0
                                            → C2 script dọn dẹp trên thiết bị

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, bash 5.3.9, uutils coreutils
   0.8.0) ngày 2026-08-11.

   MỘT CON SỐ CỐ Ý CHỈ HỎI THEO BẬC ĐỘ LỚN: chi phí của `echo` ngoài so với
   `echo` builtin. Đo ba lần, 2000 vòng mỗi lần: builtin 0,009 / 0,007 / 0,008
   giây; bản ngoài 3,319 / 3,354 / 3,433 giây. Chiều và bậc độ lớn rất ổn định
   (hơn 400 lần), nhưng con số chính xác thì không, nên câu E6 chỉ chấm phần
   GIẢI THÍCH (mỗi lần gọi bản ngoài phải tạo một tiến trình mới, khoảng 1,7
   mili-giây) chứ không chấm tỉ lệ.
   ============================================================ */
Exercise.register({
  id: 'bt-04',
  minutes: 85,

  intro:
    '<p>Bài 4 dạy bạn đọc một câu lệnh. Bộ bài tập này kiểm tra một thứ khó hơn nhiều: bạn có nhận ' +
    'ra được lúc <b>máy đang nói dối bạn</b> không.</p>' +
    '<p>Ba trong số các kết quả thật bạn sắp đọc đều có chung một hình dạng — lệnh chạy xong, ' +
    '<b>không báo lỗi gì</b>, trả về mã thoát <b>0</b>, và làm sai điều bạn muốn: một lệnh ' +
    '<code>rm</code> xoá đúng hai file bạn không hề nhắc tới, một script kiểm thử báo PASS trong khi ' +
    'chương trình bên trong nó chết, một lệnh <code>cd</code> chạy thành công mà thư mục không đổi. ' +
    'Cả ba đều bắt nguồn từ đúng ba điều Bài 4 vừa dạy, và cả ba đều sẽ quay lại tìm bạn trong các ' +
    'script khởi động ở Chặng 09.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Phần D lần này ôn Bài 1, Bài 2 và Bài 3 — vì từ đây trở đi Chặng 01 sẽ ít nhắc lại chúng, mà ' +
    'Chặng 06 thì cần cả ba.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` và `mis` là tài liệu cho người viết
     bài tập sau, không được render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'ma-thoat',
      name: 'Mã thoát và tuổi thọ một lệnh của $?',
      x: 'Mọi lệnh kết thúc đều trả về một số: 0 là thành công, khác 0 là thất bại. Shell cất số đó ' +
         'vào $?, nhưng $? bị ghi đè bởi LỆNH TIẾP THEO — kể cả một lệnh vô hại như echo — nên muốn ' +
         'dùng lại nhiều lần thì phải cất ngay bằng rc=$?.',
      mis: '$? giữ mã lỗi cho tới khi có lỗi mới, nên đọc lúc nào cũng được; và số 0 thì nghe như ' +
           '"sai / rỗng / false" nên chắc 0 là thất bại.' },

    { id: 'builtin',
      name: 'Builtin thắng file ngoài, và vì sao cd buộc phải là builtin',
      x: 'Bash phân giải tên lệnh theo thứ tự alias → hàm → builtin → PATH, nên builtin luôn được ' +
         'chọn trước file cùng tên. Một lệnh muốn thay đổi trạng thái của chính shell (thư mục làm ' +
         'việc, biến môi trường) BUỘC phải là builtin, vì lệnh ngoài chạy trong tiến trình con và ' +
         'mọi thay đổi của tiến trình con chết theo nó.',
      mis: 'Mọi lệnh đều là một file nằm đâu đó trong /usr/bin, nên which là cách chuẩn để tìm ra ' +
           'nó; which không thấy cd nghĩa là cd chưa được cài hoặc là lệnh riêng của Ubuntu.' },

    { id: 'tach-tu',
      name: 'Shell chỉ cắt dòng lệnh thành từ theo khoảng trắng',
      x: 'Shell không hiểu tuỳ chọn của lệnh nào cả. Nó cắt dòng thành các TỪ ngăn bởi khoảng trắng ' +
         'rồi trao nguyên vẹn cho chương trình. Vì thế một giá trị chứa dấu cách mà không bọc nháy ' +
         'kép sẽ vỡ thành nhiều đối số — và lệnh vẫn chạy, vẫn có thể trả về 0, chỉ là tác động lên ' +
         'nhầm thứ.',
      mis: 'Shell hiểu câu lệnh nên nó biết "old report.txt" là một cái tên; cùng lắm thì đặt tên có ' +
           'dấu cách sẽ bị báo lỗi, chứ không thể im lặng làm sai.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN A — NHẬN BIẾT (8 câu)
     4 trắc nghiệm · 2 đúng-sai kèm sửa · 1 điền khuyết · 1 ghép nối
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gõ <code>ls -l /etc</code> vào cửa sổ WSL rồi nhấn Enter. <b>Ai</b> là bên đọc dòng chữ ' +
         'đó, tách nó ra và quyết định phải chạy chương trình nào?',
      opts: [
        'Cửa sổ terminal — nó nhận phím nên nó cũng là nơi hiểu câu lệnh.',
        '<b>Shell</b> (trên máy bạn là bash): terminal chỉ vẽ chữ và nhận phím, hoàn toàn không hiểu ' +
          'câu lệnh nào cả.',
        'Kernel Linux — mọi câu lệnh đều được gửi thẳng xuống kernel để nó phân tích.',
        'Chính chương trình <code>ls</code>, vì tên nó nằm ở đầu dòng.'
      ],
      a: 1,
      why: 'Ba lớp, ba việc, và lẫn chúng là nguồn của rất nhiều câu hỏi sai. <b>Terminal</b> là một ' +
           'cửa sổ hiển thị ký tự: nó nhận phím và vẽ chữ, không hơn. <b>Shell</b> là chương trình ' +
           'đọc dòng chữ đó, cắt thành từ, phân giải tên lệnh, rồi nhờ kernel chạy chương trình. ' +
           '<b>Kernel</b> không biết đọc chữ — nó chỉ nhận lời gọi hệ thống. Bằng chứng sờ được: đổi ' +
           'terminal (Windows Terminal, PuTTY, cáp UART) thì shell vẫn là bash; còn gõ <code>sh</code> ' +
           'thì shell đổi trong khi cửa sổ vẫn thế. Trên thiết bị nhúng thật, cửa sổ đó thường chỉ là ' +
           'một sợi cáp serial — mà bạn vẫn dùng shell y nguyên.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Phát biểu nào về mã thoát và biến <code>$?</code> là <b>đúng</b>?',
      opts: [
        '<code>$?</code> giữ mã thoát của lệnh thất bại gần nhất, cho tới khi có một lệnh khác thất bại.',
        'Mã thoát <b>0</b> nghĩa là thất bại, vì trong lập trình số 0 tương ứng với <i>false</i>.',
        'Mã thoát <b>0</b> nghĩa là thành công, và <code>$?</code> chỉ giữ mã thoát của <b>lệnh vừa ' +
          'chạy xong ngay trước đó</b> — kể cả khi lệnh đó là <code>echo</code>.',
        '<code>$?</code> chỉ được cập nhật bởi các lệnh ngoài; lệnh dựng sẵn như <code>echo</code> ' +
          'không đụng tới nó.'
      ],
      a: 2,
      why: 'Hai nửa của câu này đều ngược trực giác, và mỗi nửa đều đủ sức làm hỏng một script.<br><br>' +
           '<b>Nửa thứ nhất:</b> chỉ có <b>một</b> cách để thành công nên thành công được gán đúng một ' +
           'số — số 0. Có vô số cách để hỏng, nên phần còn lại của dải 1–255 dành cho thất bại. Đây là ' +
           'quy ước ngược hẳn với <i>true</i> / <i>false</i> trong C, và người mới lẫn chỗ này ' +
           'thường xuyên.<br><br>' +
           '<b>Nửa thứ hai:</b> <code>$?</code> không phải một cuốn nhật ký lỗi, nó là một ô nhớ bị ' +
           'ghi đè sau <b>mỗi</b> lệnh. Chính lệnh <code>echo $?</code> mà bạn dùng để xem cũng ghi đè ' +
           'nó — nên gọi lần thứ hai luôn ra 0, là mã thoát của <code>echo</code>. Câu B1 cho bạn nhìn ' +
           'thấy chính xác điều đó xảy ra, và câu C1 cho thấy nó làm một hệ thống kiểm thử tự động ' +
           'báo PASS sai như thế nào. Muốn dùng lại nhiều lần thì cất ngay: <code>rc=$?</code>.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Vì sao <code>cd</code> <b>bắt buộc</b> phải là lệnh dựng sẵn của bash, chứ không thể là một ' +
         'chương trình nằm trong <code>/usr/bin</code> như <code>ls</code>?',
      opts: [
        'Vì <code>cd</code> được gọi quá nhiều lần nên để trong bash cho nhanh; về nguyên tắc vẫn ' +
          'làm thành chương trình ngoài được.',
        'Vì đổi thư mục cần quyền root, mà builtin thì chạy với quyền của bash.',
        'Vì lệnh ngoài chạy trong một <b>tiến trình con</b>: nó chỉ đổi được thư mục làm việc của ' +
          'chính nó, rồi chết — shell cha vẫn đứng nguyên chỗ cũ, tức là hoàn toàn vô dụng.',
        'Vì <code>/usr/bin</code> chỉ chứa chương trình thao tác với file, không chứa chương trình ' +
          'thao tác với thư mục.'
      ],
      a: 2,
      why: 'Đây không phải lựa chọn tối ưu hoá mà là một <b>bắt buộc kỹ thuật</b>. Mỗi lệnh ngoài được ' +
           'chạy bằng cách shell tạo một tiến trình con rồi nạp chương trình vào đó. Tiến trình con ' +
           'nhận một <b>bản sao</b> trạng thái của cha, trong đó có thư mục làm việc. Đổi bản sao rồi ' +
           'thoát thì bản gốc không suy suyển gì — nên một <code>cd</code> ngoài sẽ luôn "chạy thành ' +
           'công" mà không đổi được gì.<br><br>' +
           'Hệ quả rút ra được ngay: mọi lệnh <b>thay đổi trạng thái của chính shell</b> đều phải là ' +
           'builtin — <code>cd</code>, <code>export</code>, <code>alias</code>, <code>ulimit</code>. ' +
           'Và đó là lý do <code>which cd</code> không in ra gì: không hề tồn tại file nào tên ' +
           '<code>cd</code> để mà tìm. Câu B4 cho bạn nhìn thấy hệ quả này bằng một phiên chạy thật, ' +
           'còn cơ chế tiến trình cha–con thì Bài 9 và Bài 20 sẽ mổ xẻ đầy đủ.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Trong thư mục có một file tên <code>old report.txt</code> (có dấu cách). Bạn gõ ' +
         '<code>rm old report.txt</code>. Chương trình <code>rm</code> nhận được <b>bao nhiêu đối số</b>, ' +
         'và là những gì?',
      opts: [
        'Một đối số: <code>old report.txt</code> — shell nhận ra đó là tên file có sẵn nên giữ nguyên.',
        '<b>Hai đối số</b>: <code>old</code> và <code>report.txt</code> — shell cắt dòng theo khoảng ' +
          'trắng và không hề biết file nào đang tồn tại.',
        'Không đối số nào, vì shell báo lỗi cú pháp trước khi chạy <code>rm</code>.',
        'Ba đối số: <code>old</code>, khoảng trắng, và <code>report.txt</code>.'
      ],
      a: 1,
      why: 'Shell làm đúng <b>một</b> việc với dòng bạn gõ: cắt nó thành các <b>từ</b> ngăn cách bởi ' +
           'khoảng trắng, rồi trao nguyên vẹn danh sách từ đó cho chương trình. Nó không tra thư mục, ' +
           'không đoán ý, không biết file nào tồn tại. Vì vậy <code>rm</code> nhận đúng hai đối số ' +
           'và đi xoá hai file tên <code>old</code> và <code>report.txt</code>.<br><br>' +
           'Điểm chết người nằm ở chỗ tiếp theo: nếu hai file đó <b>không</b> tồn tại, bạn được cứu ' +
           'bởi thông báo lỗi. Nhưng nếu chúng <b>có</b> tồn tại thì lệnh chạy trót lọt, xoá sạch hai ' +
           'file bạn không hề nhắc tới, để nguyên file bạn muốn xoá, và trả về mã thoát <b>0</b>. ' +
           'Câu B5 là đúng phiên chạy thật đó. Cách viết đúng: <code>rm "old report.txt"</code>.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Tuỳ chọn dài chỉ là cách viết đầy đủ của tuỳ chọn ngắn, nên gộp chúng lại ' +
         'được y như nhau: <code>--all --human-readable</code> viết gọn thành ' +
         '<code>--allhuman-readable</code> hoặc <code>--ah</code>."</i>',
      a: 1,
      why: 'Chỉ tuỳ chọn <b>ngắn</b> mới gộp được, và lý do rất cụ thể: mỗi tuỳ chọn ngắn là ' +
           '<b>đúng một ký tự</b> sau một dấu gạch, nên <code>-lah</code> tách lại thành ' +
           '<code>-l -a -h</code> một cách không nhập nhằng. Tuỳ chọn dài là cả một <b>từ</b> sau hai ' +
           'dấu gạch; dán hai từ vào nhau thì không có cách nào biết chỗ nào là ranh giới, nên chương ' +
           'trình chỉ đơn giản không nhận ra tên đó. Trên máy bạn (uutils), gõ sai tên tuỳ chọn cho ' +
           'kết quả <code>error: unexpected argument \'--alll\' found</code> kèm một dòng ' +
           '<code>tip:</code> gợi ý tên đúng, và mã thoát <b>2</b>.',
      rw: 'Viết lại nhận định cho đúng: nói rõ loại nào gộp được, vì sao, và mỗi loại nên dùng ở đâu.',
      crit: [
        'Nói rõ chỉ tuỳ chọn NGẮN mới gộp được, tuỳ chọn dài thì không',
        'Giải thích được lý do: tuỳ chọn ngắn là một ký tự nên tách lại không nhập nhằng, tuỳ chọn dài là một từ',
        'Nêu đúng quy ước dùng: gõ tay thì ngắn cho nhanh, viết script / Makefile / tài liệu thì dùng dài',
        'Nêu được lý do của quy ước đó: script được đọc lại nhiều lần, tuỳ chọn dài tự giải thích'
      ],
      sol: 'Tuỳ chọn <b>ngắn</b> gộp được vì mỗi cái là đúng một ký tự sau một dấu gạch: ' +
           '<code>-lah</code> tương đương <code>-l -a -h</code>, không có chỗ nào để hiểu nhầm. Tuỳ ' +
           'chọn <b>dài</b> là một từ đầy đủ sau hai dấu gạch, mỗi cái phải đứng riêng: ' +
           '<code>--all --human-readable</code>. Về quy ước dùng: gõ tay hằng ngày thì dùng ngắn cho ' +
           'nhanh, còn khi viết vào <b>script, Makefile hay tài liệu</b> thì luôn dùng dài — ' +
           '<code>tar -xzf</code> bắt người đọc đi tra cứu, còn ' +
           '<code>tar --extract --gzip --file</code> thì tự giải thích. Script build của bạn ở ' +
           'Chặng 09 sẽ được đọc lại rất nhiều lần, kể cả bởi chính bạn của sáu tháng sau.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Gõ <code>man cd</code> thì nhận được <code>No manual entry for cd</code>. ' +
         'Vậy hệ thống của tôi thiếu gói tài liệu, phải cài thêm thì mới đọc được hướng dẫn của ' +
         '<code>cd</code>."</i>',
      a: 1,
      why: '<code>man</code> tra tài liệu của các <b>file chương trình</b>. <code>cd</code> không phải ' +
           'file — nó nằm bên trong bash — nên không có trang man riêng để mà thiếu. Tài liệu của nó ' +
           'nằm trong tài liệu của bash và lấy ra bằng <code>help cd</code>. Cài thêm bao nhiêu gói ' +
           'cũng không đổi được điều đó.<br><br>' +
           'Một chi tiết đáng nhớ trong kết quả thật: <code>man cd</code> trả mã thoát <b>16</b>, ' +
           'trong khi <code>man ls</code> trả <b>0</b>. Con số 16 là do <code>man</code> tự định nghĩa. ' +
           'Quy ước duy nhất được bảo đảm trên toàn hệ thống là "0 thành công, khác 0 thất bại"; ý ' +
           'nghĩa cụ thể của từng số khác 0 là chuyện riêng của mỗi chương trình, và được ghi trong ' +
           'chính trang man của nó ở mục <code>EXIT STATUS</code>.',
      rw: 'Viết lại nhận định cho đúng: nói rõ vì sao không có trang man, và tra tài liệu của ' +
          '<code>cd</code> bằng cách nào.',
      crit: [
        'Bác bỏ ý "thiếu gói tài liệu" — không cài gì thêm được và cũng không cần',
        'Nêu đúng nguyên nhân: cd là builtin, không phải file, nên không có trang man riêng',
        'Nêu đúng cách tra: help cd (hoặc man bash rồi tìm mục SHELL BUILTIN COMMANDS)',
        'Nêu được nguyên tắc chọn nguồn tra cứu: man / --help cho lệnh ngoài, help cho builtin'
      ],
      sol: 'Không thiếu gói nào cả. <code>man</code> đọc tài liệu của các <b>file chương trình</b> ' +
           'nằm trong hệ thống, mà <code>cd</code> thì không phải file — nó là lệnh dựng sẵn bên ' +
           'trong bash. Tài liệu của nó thuộc về bash và lấy ra bằng <code>help cd</code> (hoặc ' +
           '<code>man bash</code> rồi tìm mục <code>SHELL BUILTIN COMMANDS</code>). Quy tắc chọn ' +
           'nguồn: <code>--help</code> khi chỉ cần nhớ lại một tuỳ chọn, <code>man</code> khi cần ' +
           'hiểu sâu một lệnh ngoài, <code>help</code> khi đó là builtin. Muốn biết mình đang gặp ' +
           'loại nào thì hỏi <code>type &lt;lệnh&gt;</code> trước.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Bạn đang viết C và muốn đọc tài liệu của <b>lời gọi hệ thống</b> <code>open()</code> — thứ ' +
         'trực tiếp đi vào kernel, chứ không phải hàm thư viện cùng tên. Bạn gõ ' +
         '<code>man N open</code>. Số hiệu mục <b>N</b> là bao nhiêu?',
      a: ['2'],
      ph: 'một chữ số',
      why: 'Mục <b>2</b> là lời gọi hệ thống — cửa vào kernel. Mục <b>3</b> là hàm thư viện C. Đây là ' +
           'cặp số bạn sẽ dùng hằng ngày từ Chặng 03 trở đi, và phân biệt được chúng chính là phân ' +
           'biệt được "kernel làm" với "thư viện làm hộ".<br><br>' +
           'Bằng chứng ngay trên máy bạn: <code>man -f printf</code> in ra <b>hai</b> dòng — ' +
           '<code>printf (1)</code> là lệnh gõ ở dòng lệnh, còn <code>printf (3)</code> là hàm C bạn ' +
           'gọi trong chương trình. Cùng một cái tên, hai tài liệu hoàn toàn khác nhau, và ' +
           '<code>man printf</code> không kèm số sẽ cho bạn mục 1 — gần như luôn không phải thứ bạn ' +
           'cần khi đang viết code. Câu B6 phân tích kỹ kết quả này. Các mục còn lại: 1 lệnh người ' +
           'dùng, 4 file thiết bị trong <code>/dev</code>, 5 định dạng file cấu hình, 7 khái niệm ' +
           'tổng quát, 8 lệnh quản trị.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi công cụ tra cứu với mô tả đúng <b>tầm nhìn</b> hoặc <b>phạm vi</b> của nó.',
      left: [
        '<code>type</code>',
        '<code>which</code>',
        '<code>command -v</code>',
        '<code>help</code>',
        '<code>man</code>',
        '<code>apropos</code>'
      ],
      right: [
        'Chỉ đọc được tài liệu của <b>lệnh dựng sẵn</b> trong bash; đây là nơi duy nhất tra được ' +
          '<code>cd</code>.',
        'Tìm theo <b>mô tả</b> chứ không theo tên — dùng khi bạn còn chưa biết lệnh mình cần tên là gì.',
        'Chuẩn POSIX, có cả trên BusyBox, biết cả builtin lẫn file; <b>đây là cách viết đúng trong ' +
          'script</b>.',
        'Chương trình ngoài, <b>chỉ</b> dò file trong <code>$PATH</code>; mù hoàn toàn với builtin, ' +
          'hàm và alias.',
        'Tài liệu đầy đủ của một <b>file chương trình</b>: mô tả, ví dụ, mã thoát, chia theo mục ' +
          'đánh số.',
        'Builtin của bash nên nhìn thấy <b>mọi thứ</b> — alias, hàm, builtin và file; câu trả lời ' +
          'chính xác nhất cho "lệnh này là cái gì".'
      ],
      a: [5, 3, 2, 0, 4, 1],
      why: 'Sáu ô này trả lời hai câu hỏi khác nhau, và trộn chúng là nguồn của rất nhiều nhầm lẫn. ' +
           '<b>Ba ô đầu trả lời "lệnh này là cái gì, đến từ đâu"</b>: <code>type</code> thấy tất cả ' +
           '(nó là builtin), <code>command -v</code> cũng thấy tất cả và có ở mọi nơi kể cả BusyBox, ' +
           'còn <code>which</code> là chương trình ngoài nên chỉ thấy file — đó là toàn bộ lý do ' +
           '<code>which cd</code> im lặng và trả về 1. <b>Ba ô sau trả lời "lệnh này dùng thế nào"</b>: ' +
           '<code>help</code> cho builtin, <code>man</code> cho file chương trình, ' +
           '<code>apropos</code> cho lúc bạn chưa biết tên lệnh. Quy tắc dùng được ngay: gõ tay thì ' +
           '<code>type</code>, viết script thì <code>command -v</code>, và quên ' +
           '<code>which</code> đi — nhiều hệ nhúng còn không cài nó.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN B — THÔNG HIỂU (6 câu)
     2 giải thích vì sao · 1 so sánh cặp · 1 bắt lỗi phát biểu · 2 đọc output
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Giải thích vì sao', truc: 0,
      q: 'Phiên chạy thật dưới đây gồm hai đoạn. Đoạn trên hỏi <code>$?</code> hai lần liên tiếp và ' +
         'nhận hai câu trả lời <b>khác nhau</b> dù ở giữa không có lệnh nào thất bại. Đoạn dưới hỏi ' +
         'hai lần và nhận cùng một câu trả lời. Giải thích chính xác vì sao, và nói rõ hệ quả của ' +
         'điều này khi bạn viết một script có nhiều bước.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Đoạn 1 — hỏi thẳng $? hai lần', code:
          'ls missing.txt 2>/dev/null\n' +
          'echo $?\n' +
          'echo $?' },
        { t: 'code', where: 'out', nocopy: true, code:
          '2\n' +
          '0' },
        { t: 'code', where: 'wsl', name: 'Đoạn 2 — cất lại trước khi dùng', code:
          'ls missing.txt 2>/dev/null\n' +
          'rc=$?\n' +
          'echo "rc=$rc"\n' +
          'echo "rc still $rc"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'rc=2\n' +
          'rc still 2' }
      ],
      hint: 'Đếm xem giữa hai lần <code>echo $?</code> ở đoạn 1 có bao nhiêu lệnh đã chạy xong. ' +
            '<code>echo</code> có phải là một lệnh không, và nó có mã thoát không?',
      crit: [
        'Nêu đúng: $? là mã thoát của lệnh vừa chạy xong NGAY TRƯỚC ĐÓ, không phải "lỗi gần nhất"',
        'Chỉ ra echo cũng là một lệnh và nó cũng có mã thoát — nên nó ghi đè $?',
        'Giải thích số 0 ở lần thứ hai: đó là mã thoát của chính lệnh echo $? đầu tiên, vì nó chạy thành công',
        'Giải thích đoạn 2: rc=$? sao chép giá trị ra một biến thường, biến đó không bị lệnh sau ghi đè',
        'Nêu hệ quả khi viết script: phải cất mã thoát ngay dòng liền sau lệnh cần kiểm tra, trước mọi echo / log'
      ],
      sol: '<p><code>$?</code> <b>không</b> phải một cuốn nhật ký lỗi. Nó là một ô nhớ duy nhất, và ' +
           'shell ghi đè nó sau <b>mỗi</b> lệnh chạy xong — không phải sau mỗi lệnh thất bại.</p>' +
           '<p>Đoạn 1 chạy ba lệnh chứ không phải hai. <code>ls</code> thất bại và đặt ' +
           '<code>$?</code> thành <b>2</b>. Lệnh <code>echo $?</code> thứ nhất đọc số 2 rồi in ra — ' +
           'nhưng bản thân <code>echo</code> cũng là một lệnh, nó chạy trót lọt, nên khi nó kết thúc ' +
           '<code>$?</code> đã bị ghi đè thành <b>0</b>. Lệnh <code>echo $?</code> thứ hai vì thế in ' +
           'ra mã thoát của <i>lệnh echo đầu tiên</i>, không phải của <code>ls</code>.</p>' +
           '<p>Đoạn 2 tránh được cái bẫy bằng đúng một dòng: <code>rc=$?</code> sao chép giá trị ra ' +
           'một <b>biến thường</b> ngay lập tức. Từ đó trở đi không lệnh nào ghi đè lên ' +
           '<code>rc</code> nữa, nên đọc lại bao nhiêu lần cũng vẫn là 2.</p>' +
           '<p><b>Hệ quả khi viết script:</b> nếu cần kiểm tra kết quả của một bước, hãy cất mã thoát ' +
           'ở <b>dòng ngay sau</b> lệnh đó — trước mọi <code>echo</code>, mọi dòng ghi log, mọi lệnh ' +
           'dọn dẹp. Một dòng <code>echo "Đang kiểm tra..."</code> chen vào giữa là đủ để mọi kiểm tra ' +
           'phía sau trở nên vô nghĩa, và tệ nhất là nó vô nghĩa <b>một cách im lặng</b>: script vẫn ' +
           'chạy, vẫn không báo lỗi, chỉ là luôn kết luận "thành công". Câu C1 là đúng kịch bản đó.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao',
      q: 'Bạn làm theo một hướng dẫn trên mạng, nhưng lệnh trên máy bạn in ra thứ khác hẳn bài viết. ' +
         'Ba kết quả thật dưới đây giải thích vì sao. Hãy nói rõ chuyện gì đang xảy ra, và rút ra ' +
         '<b>quy tắc làm việc</b> mà một kỹ sư nhúng phải theo — nhớ rằng thiết bị nhúng còn có một ' +
         'phiên bản thứ ba nữa.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'ls --version\n' +
          'readlink -f "$(command -v ls)"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'ls (uutils coreutils) 0.8.0\n' +
          '/usr/lib/cargo/bin/coreutils/ls' },
        { t: 'code', where: 'wsl', name: 'Gõ sai một tuỳ chọn', code:
          'ls --alll\n' +
          'echo $?' },
        { t: 'code', where: 'out', nocopy: true, code:
          'error: unexpected argument \'--alll\' found\n' +
          '\n' +
          'tip: a similar argument exists: \'--all\'\n' +
          '\n' +
          'Usage: ls [OPTION]... [FILE]...\n' +
          '\n' +
          'For more information, try \'--help\'.\n' +
          '2' },
        { t: 'code', where: 'wsl', name: 'Tìm theo mô tả, không theo tên', code:
          'apropos -e "list directory"' },
        { t: 'code', where: 'out', nocopy: true, code:
          'dir (1)              - List directory contents. Ignore files and directories starting with a \'.\' by default\n' +
          'gnudir (1)           - list directory contents\n' +
          'gnuls (1)            - list directory contents' }
      ],
      hint: 'Đường dẫn <code>/usr/lib/cargo/bin/</code> tiết lộ lệnh này được viết bằng ngôn ngữ nào. ' +
            'Và vì sao trên máy bạn lại có thêm một lệnh tên <code>gnuls</code>?',
      crit: [
        'Nêu đúng: lệnh ls trên máy này là uutils coreutils viết bằng Rust, không phải GNU coreutils',
        'Đọc được bằng chứng từ đường dẫn /usr/lib/cargo/bin/ — cargo là trình quản lý gói của Rust',
        'Giải thích được thông báo lỗi khác GNU (error: unexpected argument thay vì invalid option) là hệ quả, không phải máy hỏng',
        'Nêu được phiên bản thứ ba trên thiết bị nhúng: BusyBox, còn tối giản hơn nữa',
        'Rút ra quy tắc: luôn tra cứu bằng --help / man TRÊN CHÍNH hệ thống đang làm việc, không tin bài viết trên mạng'
      ],
      sol: '<p>Cùng một cái tên <code>ls</code>, nhưng đó là <b>ba chương trình khác nhau</b> do ba ' +
           'nhóm khác nhau viết.</p>' +
           '<p>Trên máy bạn, Ubuntu 26.04 đã thay bộ lệnh cơ bản của GNU bằng <b>uutils coreutils</b> ' +
           'viết bằng Rust. Đường dẫn thật nói thẳng ra điều đó: <code>cargo</code> là trình quản lý ' +
           'gói của Rust. Bản GNU vẫn còn trên máy, nhưng phải gọi bằng tên khác — chính là ' +
           '<code>gnuls</code> và <code>gnudir</code> mà <code>apropos</code> vừa tìm ra.</p>' +
           '<p>Thông báo lỗi khác nhau là hệ quả trực tiếp: uutils in ' +
           '<code>error: unexpected argument</code> kèm một dòng <code>tip:</code> gợi ý tên đúng, ' +
           'trong khi GNU in <code>invalid option</code>. Máy bạn <b>không hỏng</b>, bài viết ' +
           '<b>không sai</b> — hai bên chỉ đang nói về hai chương trình khác nhau.</p>' +
           '<p>Phiên bản thứ ba là thứ bạn sẽ gặp trên thiết bị thật: <b>BusyBox</b>, gộp hàng trăm ' +
           'lệnh vào một file thực thi duy nhất, mỗi lệnh chỉ giữ những tuỳ chọn thiết yếu. Ở đó ' +
           '<code>ls --human-readable</code> có thể đơn giản là không tồn tại.</p>' +
           '<p><b>Quy tắc rút ra:</b> tài liệu đáng tin duy nhất là tài liệu <i>của chính hệ thống ' +
           'bạn đang làm việc</i> — <code>&lt;lệnh&gt; --help</code> và <code>man &lt;lệnh&gt;</code> ' +
           'chạy trên đúng máy đó. Trên board thì đó cũng là nguồn duy nhất bạn có, vì ở đó không có ' +
           'trình duyệt. Câu C4 sẽ đẩy tình huống này đi xa hơn: một thiết bị thậm chí không có cả ' +
           '<code>man</code>.</p>' },

    { id: 'b3', k: 'free', tag: 'So sánh cặp',
      q: 'Hai cách nối lệnh <code>A ; B</code> và <code>A &amp;&amp; B</code> trông rất giống nhau và ' +
         'trong phần lớn trường hợp cho kết quả y hệt. Câu hỏi không phải là liệt kê khác biệt, mà là: ' +
         '<b>khác biệt nào là khác biệt quan trọng</b>, và vì sao trong một script build thì gần như ' +
         'luôn phải chọn <code>&amp;&amp;</code>? Nêu một hậu quả cụ thể của việc chọn sai.',
      rows: 5,
      hint: 'Cả hai đều chạy A rồi chạy B. Khác biệt chỉ lộ ra ở đúng một tình huống — tình huống nào?',
      crit: [
        'Nêu đúng khác biệt: dấu ; chạy B bất kể A ra sao; && chỉ chạy B khi A trả về mã thoát 0',
        'Chỉ ra khác biệt chỉ lộ ra khi A THẤT BẠI — lúc mọi thứ chạy đúng thì hai cách không phân biệt được',
        'Nêu hậu quả cụ thể của việc chọn sai: build hỏng nhưng vẫn chạy tiếp, nên chạy nhầm file thực thi CŨ còn sót lại và tưởng là bản mới',
        'Nêu được vì sao hậu quả đó tệ: lỗi im lặng, mất thời gian đi tìm một lỗi không tồn tại trong mã nguồn mới',
        'Nói được && chính là mã thoát được đem ra dùng: nó đọc $? của A để quyết định'
      ],
      sol: '<p><b>Khác biệt duy nhất</b>: <code>;</code> luôn chạy B; <code>&amp;&amp;</code> chỉ chạy ' +
           'B khi A trả về mã thoát <b>0</b>. Nghĩa là hai cách viết chỉ phân biệt được ở đúng một ' +
           'tình huống — <b>khi A thất bại</b>. Ngày mọi thứ chạy đúng thì bạn không thể nhận ra mình ' +
           'đã chọn sai; đó chính là lý do nó nguy hiểm.</p>' +
           '<p><b>Hậu quả cụ thể trong script build:</b> viết <code>make ; ./program</code> thì khi ' +
           '<code>make</code> hỏng, script vẫn chạy <code>./program</code> — và file thực thi đó vẫn ' +
           'còn nằm đấy từ lần build <b>trước</b>. Bạn quan sát một chương trình chạy, tưởng đó là ' +
           'bản vừa sửa, thấy lỗi cũ vẫn còn, rồi đi tìm nguyên nhân trong đoạn mã mới mà thật ra nó ' +
           'chưa từng được biên dịch. Một buổi chiều bốc hơi vì một ký tự.</p>' +
           '<p>Với <code>make &amp;&amp; ./program</code>, build hỏng thì dừng ngay tại đó, và thông ' +
           'báo lỗi của <code>make</code> là thứ cuối cùng bạn nhìn thấy — đúng thứ cần nhìn.</p>' +
           '<p>Điểm nối với phần còn lại của bài: <code>&amp;&amp;</code> và <code>||</code> không ' +
           'phải cú pháp riêng biệt gì cả, chúng chỉ là <b>mã thoát được đem ra dùng</b>. Chúng đọc ' +
           'đúng cái số mà <code>$?</code> giữ. Hiểu mã thoát rồi thì hai toán tử này trở thành hiển ' +
           'nhiên — và <code>A &amp;&amp; B || C</code> chính là if-then-else viết gọn.</p>' },

    { id: 'b4', k: 'free', tag: 'Bắt lỗi phát biểu', truc: 1,
      q: 'Một người mới ghi vào sổ tay: <i>"<code>type</code>, <code>which</code> và ' +
         '<code>command -v</code> là ba cách viết khác nhau của cùng một việc, tôi dùng ' +
         '<code>which</code> vì quen tay. Riêng <code>cd</code> thì <code>which</code> không tìm thấy, ' +
         'chắc nó là lệnh riêng của Ubuntu chứ không có trong Linux chuẩn. Với lại tôi đã viết một ' +
         'script <code>goto.sh</code> để nhảy vào thư mục dự án, chạy xong thì lại thấy mình vẫn ở chỗ ' +
         'cũ — chắc phải chạy bằng <code>sudo</code>."</i> Đoạn ghi chú này sai ở <b>mấy chỗ</b>? Chỉ ' +
         'ra từng chỗ và dùng ba kết quả thật dưới đây làm bằng chứng.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Bằng chứng 1', code:
          'which cd\n' +
          'echo "rc=$?"\n' +
          'command -v cd\n' +
          'type cd' },
        { t: 'code', where: 'out', nocopy: true, code:
          'rc=1\n' +
          'cd\n' +
          'cd is a shell builtin' },
        { t: 'code', where: 'wsl', name: 'Bằng chứng 2 — nội dung goto.sh', code:
          '#!/bin/bash\n' +
          'cd project\n' +
          'pwd',
          lang: 'bash' },
        { t: 'code', where: 'wsl', name: 'Bằng chứng 3 — chạy nó', code:
          'pwd\n' +
          './goto.sh\n' +
          'pwd' },
        { t: 'code', where: 'out', nocopy: true, code:
          '/home/shinarus/bt04-probe2\n' +
          '/home/shinarus/bt04-probe2/project\n' +
          '/home/shinarus/bt04-probe2' }
      ],
      rows: 6,
      hint: 'Chú ý dòng giữa của bằng chứng 3: script <b>có</b> đổi thư mục thật, và nó in ra đúng ' +
            'thư mục mới. Vậy cái gì đã quay về chỗ cũ, và vào lúc nào?',
      crit: [
        'Chỉ ra chỗ sai thứ nhất: ba lệnh KHÔNG tương đương — which là chương trình ngoài, chỉ dò file trong $PATH, mù với builtin/hàm/alias',
        'Chỉ ra chỗ sai thứ hai: cd không phải lệnh riêng của Ubuntu; nó là builtin nên không tồn tại file nào tên cd để which tìm ra',
        'Chỉ ra chỗ sai thứ ba: sudo hoàn toàn không liên quan — đây không phải vấn đề quyền hạn',
        'Giải thích đúng cơ chế của bằng chứng 3: ./goto.sh chạy trong một tiến trình con, cd đổi thư mục CỦA TIẾN TRÌNH CON, tiến trình con kết thúc thì thay đổi đó biến mất theo',
        'Nêu cách làm đúng để script đổi được thư mục của shell hiện tại: chạy bằng source (. ./goto.sh) thay vì ./goto.sh',
        'Nêu công cụ nên dùng thay which: type khi gõ tay, command -v khi viết script'
      ],
      sol: '<p>Ghi chú sai ở <b>ba chỗ</b>, và cả ba đều bắt nguồn từ cùng một hiểu lầm: coi mọi lệnh ' +
           'là một file nằm đâu đó trong <code>/usr/bin</code>.</p>' +
           '<p><b>Sai thứ nhất — ba lệnh không tương đương.</b> <code>which</code> là một ' +
           '<i>chương trình ngoài</i>, nó chỉ biết dò file trong <code>$PATH</code> và mù hoàn toàn ' +
           'với builtin, hàm và alias. <code>type</code> và <code>command -v</code> là builtin của ' +
           'bash nên nhìn thấy mọi thứ. Bằng chứng 1 cho thấy đúng điều đó: cùng một câu hỏi, ' +
           '<code>which</code> im lặng và trả về <b>1</b>, hai lệnh kia trả lời được.</p>' +
           '<p><b>Sai thứ hai — <code>cd</code> không phải lệnh riêng của Ubuntu.</b> Nó là lệnh dựng ' +
           'sẵn, có ở mọi shell, và <code>which</code> không tìm ra vì <i>không tồn tại file nào tên ' +
           '<code>cd</code></i> để mà tìm. Nó buộc phải là builtin — lý do nằm ngay ở chỗ sai thứ ba.</p>' +
           '<p><b>Sai thứ ba — <code>sudo</code> không liên quan gì.</b> Đây không phải vấn đề quyền ' +
           'hạn. Nhìn kỹ bằng chứng 3: script <b>đã đổi thư mục thành công</b> — dòng ' +
           '<code>pwd</code> bên trong nó in ra <code>/home/shinarus/bt04-probe2/project</code>. ' +
           'Nhưng <code>./goto.sh</code> chạy trong một <b>tiến trình con</b>, và ' +
           '<code>cd</code> chỉ đổi thư mục làm việc <i>của tiến trình con đó</i>. Script kết thúc, ' +
           'tiến trình con biến mất, mang theo mọi thay đổi của nó; shell cha chưa bao giờ nhúc ' +
           'nhích. Chạy bằng <code>sudo</code> chỉ tạo ra một tiến trình con có quyền cao hơn — vẫn ' +
           'là tiến trình con.</p>' +
           '<p><b>Cách làm đúng:</b> chạy script trong <i>chính shell hiện tại</i> bằng ' +
           '<code>source</code>: <code>. ./goto.sh</code> — lúc đó không có tiến trình con nào, và ' +
           'thư mục đổi thật. Đây cũng chính là lý do <code>cd</code> phải là builtin ngay từ đầu: ' +
           'nếu nó là chương trình ngoài thì nó sẽ mắc đúng cái bẫy này, mọi lúc, và trở nên hoàn ' +
           'toàn vô dụng.</p>' },

    { id: 'b5', k: 'multi', tag: 'Đọc output', truc: 2,
      q: 'Phiên chạy thật dưới đây có <b>bốn</b> file trong thư mục, trong đó file cần xoá là ' +
         '<code>old report.txt</code>. Người dùng cất tên nó vào biến <code>f</code> rồi gọi ' +
         '<code>rm $f</code>. <b>Chọn tất cả</b> các kết luận đúng.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'ls -1\n' +
          'f="old report.txt"\n' +
          'rm $f\n' +
          'echo "rc=$?"\n' +
          'ls -1' },
        { t: 'code', where: 'out', nocopy: true, code:
          'keep.txt\n' +
          'old\n' +
          'old report.txt\n' +
          'report.txt\n' +
          'rc=0\n' +
          'keep.txt\n' +
          'old report.txt' }
      ],
      opts: [
        'Shell thay <code>$f</code> thành <code>old report.txt</code> rồi <b>cắt tiếp theo khoảng ' +
          'trắng</b>, nên <code>rm</code> nhận <b>hai</b> đối số chứ không phải một.',
        'Hai file bị xoá là <code>old</code> và <code>report.txt</code> — <b>đúng hai file không ai ' +
          'nhắc tới</b>.',
        'File thật sự cần xoá, <code>old report.txt</code>, <b>vẫn còn nguyên</b>.',
        'Lệnh trả về <code>rc=0</code>: theo mọi tiêu chuẩn tự động, nó đã <b>thành công</b>.',
        'Lỗi này sẽ được phát hiện ngay vì <code>rm</code> in ra một cảnh báo.',
        'Viết <code>rm "$f"</code> sẽ sửa được, vì nháy kép giữ nguyên giá trị của biến thành ' +
          '<b>một</b> đối số duy nhất.'
      ],
      a: [0, 1, 2, 3, 5],
      why: 'Năm kết luận đúng đọc thẳng từ kết quả; kết luận E là điều người ta <i>mong</i> xảy ra, ' +
           'và nó không xảy ra.<br><br>' +
           'Trình tự thật sự là: shell thay <code>$f</code> bằng giá trị của nó, rồi <b>cắt kết quả ' +
           'đó theo khoảng trắng một lần nữa</b>. <code>rm</code> nhận hai đối số ' +
           '<code>old</code> và <code>report.txt</code>. Cả hai file đó tình cờ đều tồn tại, nên ' +
           '<code>rm</code> xoá cả hai một cách hoàn toàn hợp lệ và trả về <b>0</b>.<br><br>' +
           'So sánh cột <code>ls -1</code> trước và sau là thấy hết: mất <code>old</code>, mất ' +
           '<code>report.txt</code>, còn nguyên <code>old report.txt</code> — tức là ' +
           '<b>làm sai đúng hai việc và bỏ sót việc cần làm</b>, trong khi báo cáo thành công. Đây là ' +
           'dạng lỗi tệ nhất trong nghề: <i>im lặng và sai</i>. Không có cảnh báo nào để phát hiện, vì ' +
           'theo góc nhìn của <code>rm</code> thì nó vừa làm đúng y hệt những gì được yêu cầu.<br><br>' +
           'Cách sửa là kết luận F, và nó phải trở thành phản xạ: trong script, bọc <b>mọi</b> biến ' +
           'bằng nháy kép — <code>"$f"</code>, <code>"$path"</code>, <code>"$1"</code>. Bài 13 sẽ đào ' +
           'sâu chủ đề trích dẫn, còn câu C2 cho bạn thấy đúng cơ chế này xoá nhầm thứ gì trên một ' +
           'thiết bị thật.' },

    { id: 'b6', k: 'free', tag: 'Đọc output',
      q: 'Bạn tra tài liệu của <code>printf</code> và nhận được kết quả dưới đây. Giải thích vì sao ' +
         'một cái tên lại có <b>hai</b> trang tài liệu, cho biết <code>man printf</code> (không kèm ' +
         'số) sẽ mở trang nào, và nói rõ khi đang viết chương trình C thì bạn phải gõ lệnh gì.',
      blocks: [
        { t: 'code', where: 'wsl', code: 'man -f printf' },
        { t: 'code', where: 'out', nocopy: true, code:
          'printf (1)           - Print output based off of the format string and proceeding arguments.\n' +
          'printf (3)           - formatted output conversion' }
      ],
      hint: 'Con số trong ngoặc là <b>mục</b> của trang man. Mục 1 và mục 3 dành cho hai loại thứ ' +
            'hoàn toàn khác nhau — loại nào gõ ở dòng lệnh, loại nào gọi trong mã C?',
      crit: [
        'Nêu đúng ý nghĩa con số trong ngoặc: đó là số hiệu MỤC của trang man',
        'Phân biệt đúng hai trang: printf(1) là lệnh gõ ở dòng lệnh, printf(3) là hàm thư viện C',
        'Trả lời đúng: man printf không kèm số sẽ mở mục có số nhỏ nhất, tức mục 1',
        'Nêu đúng lệnh cần gõ khi viết C: man 3 printf',
        'Nêu được cặp mục quan trọng nhất với dân nhúng: mục 2 là lời gọi hệ thống, mục 3 là hàm thư viện C'
      ],
      sol: '<p>Con số trong ngoặc là <b>số hiệu mục</b> của trang man, và nó tồn tại chính vì tình ' +
           'huống này: nhiều thứ khác nhau có thể trùng tên.</p>' +
           '<p><code>printf (1)</code> là <b>lệnh</b> bạn gõ ở dòng lệnh — cùng họ với ' +
           '<code>ls</code>, <code>echo</code>. <code>printf (3)</code> là <b>hàm thư viện C</b> bạn ' +
           'gọi trong chương trình, cái cần <code>#include &lt;stdio.h&gt;</code>. Cùng một cái tên, ' +
           'hai thứ hoàn toàn khác nhau, hai bộ tham số khác nhau.</p>' +
           '<p><code>man printf</code> không kèm số sẽ mở <b>mục có số nhỏ nhất</b>, tức mục 1 — gần ' +
           'như luôn <i>không</i> phải thứ bạn cần khi đang viết code. Lệnh đúng là ' +
           '<code>man 3 printf</code>.</p>' +
           '<p><b>Cặp số phải thuộc lòng với nghề nhúng:</b> mục <b>2</b> là lời gọi hệ thống — cửa ' +
           'vào kernel (<code>man 2 open</code>, <code>man 2 ioctl</code>); mục <b>3</b> là hàm thư ' +
           'viện C (<code>man 3 printf</code>, <code>man 3 malloc</code>). Phân biệt được hai mục này ' +
           'chính là phân biệt được "kernel tự làm" với "thư viện làm hộ rồi mới gọi xuống kernel" — ' +
           'và đó là toàn bộ nội dung của Chặng 03. Muốn liệt kê mọi mục có chứa một cái tên, dùng ' +
           '<code>man -f &lt;tên&gt;</code> đúng như trên.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN C — VẬN DỤNG (5 câu)
     2 chẩn đoán · 2 tình huống mới · 1 chọn và biện minh
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Một script kiểm thử tự động chạy trên máy build của nhóm bạn. Suốt <b>ba tuần</b> nó báo ' +
         '<code>PASS</code>, cho tới hôm một người chạy tay chương trình và phát hiện nó hỏng từ lâu. ' +
         'Script không hề bị sửa trong ba tuần đó. Chỉ ra <b>chính xác dòng nào</b> gây ra chuyện này, ' +
         'giải thích cơ chế, và viết lại đoạn script cho đúng.',
      blocks: [
        { t: 'code', where: 'file', name: 'run-test.sh', lang: 'bash', code:
          '#!/bin/bash\n' +
          './build/sensor_test\n' +
          'echo "Test finished, checking result..."\n' +
          'if [ $? -eq 0 ]; then\n' +
          '    echo "PASS"\n' +
          'else\n' +
          '    echo "FAIL"\n' +
          'fi' }
      ],
      rows: 6,
      hint: 'Giữa lệnh cần kiểm tra và chỗ đọc <code>$?</code> có bao nhiêu lệnh đã chạy xong? ' +
            'Câu B1 đã cho bạn đúng cơ chế này trên một phiên chạy thật.',
      crit: [
        'Chỉ đúng thủ phạm: dòng echo "Test finished..." nằm giữa lệnh cần kiểm tra và chỗ đọc $?',
        'Giải thích cơ chế: echo cũng là một lệnh, nó chạy thành công nên ghi đè $? thành 0',
        'Nêu đúng hệ quả: if luôn thấy $? bằng 0 nên luôn in PASS, bất kể sensor_test thành công hay thất bại',
        'Chỉ ra vì sao nó sống sót ba tuần: script KHÔNG báo lỗi, kết quả sai nhưng trông hoàn toàn bình thường',
        'Đưa ra cách sửa đúng: cất mã thoát ngay dòng liền sau bằng rc=$? rồi kiểm tra $rc',
        'Nêu được cách viết gọn hơn không cần $? chút nào: if ./build/sensor_test; then ... fi'
      ],
      sol: '<p><b>Thủ phạm là dòng <code>echo "Test finished, checking result..."</code></b>, và nó ' +
           'trông vô hại đến mức không ai soi tới.</p>' +
           '<p>Cơ chế đúng như câu B1: <code>echo</code> cũng là một lệnh, nó luôn chạy trót lọt, nên ' +
           'khi nó kết thúc thì <code>$?</code> đã bị ghi đè thành <b>0</b>. Câu <code>if</code> ở ' +
           'dòng dưới đọc mã thoát của <i>dòng echo đó</i>, không phải của ' +
           '<code>sensor_test</code>. Kết quả: <b>luôn luôn 0, luôn luôn PASS</b>, kể cả khi chương ' +
           'trình sập ngay lập tức.</p>' +
           '<p>Nó sống sót ba tuần vì đây là <b>lỗi im lặng</b>: không có thông báo lỗi, không có ' +
           'cảnh báo, kết quả trông y hệt một kỳ kiểm thử thành công. Thứ duy nhất có thể phát hiện ' +
           'nó là một con người chạy tay chương trình — và ba tuần là thời gian nó cần để có người ' +
           'làm việc đó.</p>' +
           '<p><b>Sửa cách 1 — cất ngay:</b></p>' +
           '<pre><code>./build/sensor_test\n' +
           'rc=$?\n' +
           'echo "Test finished, checking result..."\n' +
           'if [ "$rc" -eq 0 ]; then echo "PASS"; else echo "FAIL"; fi</code></pre>' +
           '<p><b>Sửa cách 2 — bỏ hẳn <code>$?</code>:</b></p>' +
           '<pre><code>if ./build/sensor_test; then\n' +
           '    echo "PASS"\n' +
           'else\n' +
           '    echo "FAIL"\n' +
           'fi</code></pre>' +
           '<p>Cách 2 tốt hơn vì <code>if</code> vốn đã kiểm tra mã thoát của lệnh đặt ngay sau nó — ' +
           'không còn khe hở nào cho một dòng <code>echo</code> chen vào. <b>Quy tắc chung:</b> nếu ' +
           'buộc phải dùng <code>$?</code> thì nó phải nằm ở <b>dòng liền kề</b>; giữa hai dòng đó ' +
           'không được có bất cứ thứ gì, kể cả một dòng log tưởng như vô hại.</p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 2,
      q: 'Trên một thiết bị đo đang chạy ngoài hiện trường, script dọn dẹp dưới đây chạy mỗi đêm. ' +
         'Một sáng, kỹ thuật viên báo <b>toàn bộ dữ liệu đo và cả file cấu hình đã biến mất</b>, ' +
         'trong khi file log cần xoá thì vẫn còn. Script chạy xong với mã thoát <b>0</b> và không ghi ' +
         'lại lỗi nào. Thư mục lúc đó có các file: <code>config</code>, <code>data</code>, ' +
         '<code>data old.log</code>, <code>readings.csv</code>. Chẩn đoán nguyên nhân, chỉ ra ' +
         '<b>đúng những file nào</b> đã bị xoá, và viết lại script cho an toàn.',
      blocks: [
        { t: 'code', where: 'file', name: 'cleanup.sh', lang: 'bash', code:
          '#!/bin/bash\n' +
          'target="data old.log"\n' +
          'rm -f $target\n' +
          'echo "cleanup done"' }
      ],
      rows: 6,
      hint: 'Câu B5 đã cho bạn xem đúng cơ chế này trên một phiên chạy thật. Viết ra dòng lệnh ' +
            '<b>sau khi shell đã thay biến và cắt từ</b>, rồi đối chiếu với danh sách file.',
      crit: [
        'Chẩn đoán đúng: $target không được bọc nháy kép, shell cắt giá trị theo khoảng trắng thành hai đối số',
        'Viết ra được dòng lệnh sau khi thay biến: rm -f data old.log',
        'Chỉ đúng file bị xoá: config KHÔNG bị xoá bởi lệnh này; bị xoá là data và old.log (old.log không tồn tại nên -f nuốt luôn lỗi)',
        'Giải thích vì sao mã thoát vẫn là 0: cờ -f làm rm im lặng bỏ qua file không tồn tại, nên không có gì để báo lỗi',
        'Giải thích vì sao file cần xoá vẫn còn: không đối số nào bằng đúng chuỗi "data old.log"',
        'Viết lại an toàn: rm -f "$target", và nêu được vì sao nên bỏ -f trong script dọn dẹp để lỗi lộ ra'
      ],
      sol: '<p><b>Nguyên nhân:</b> <code>$target</code> không được bọc nháy kép. Shell thay biến ' +
           'trước, rồi <b>cắt kết quả theo khoảng trắng</b>, nên lệnh thực sự chạy là:</p>' +
           '<pre><code>rm -f data old.log</code></pre>' +
           '<p>— tức là <code>rm</code> nhận <b>hai</b> đối số, không phải một.</p>' +
           '<p><b>File bị xoá:</b> <code>data</code> bị xoá (nếu là thư mục thì <code>rm -f</code> ' +
           'không xoá được, nhưng ở đây nó là thư mục chứa dữ liệu đo — kỹ thuật viên báo mất dữ liệu ' +
           'nghĩa là hệ thống thật còn dùng thêm <code>-r</code> hoặc <code>data</code> là một file ' +
           'gộp). <code>old.log</code> <b>không tồn tại</b>, và đây là chỗ cờ <code>-f</code> ra tay: ' +
           'nó bảo <code>rm</code> im lặng bỏ qua file không có, không in lỗi, không đổi mã thoát. ' +
           'File thật sự cần xoá — <code>data old.log</code> — <b>vẫn còn nguyên</b>, vì không đối số ' +
           'nào bằng đúng chuỗi đó.</p>' +
           '<p><b>Vì sao mã thoát vẫn 0:</b> theo đúng góc nhìn của <code>rm</code>, nó vừa hoàn thành ' +
           'chính xác những gì được yêu cầu. Không có gì để báo lỗi cả. Một lần nữa: <i>im lặng và ' +
           'sai</i> — đúng dạng lỗi mà bộ bài tập này xoay quanh.</p>' +
           '<p><b>Viết lại:</b></p>' +
           '<pre><code>#!/bin/bash\n' +
           'target="data old.log"\n' +
           'rm "$target"\n' +
           'echo "cleanup done"</code></pre>' +
           '<p>Hai thay đổi, mỗi thay đổi một lý do. Nháy kép giữ nguyên giá trị thành <b>một</b> đối ' +
           'số — đó là bản sửa lỗi. Bỏ <code>-f</code> là quyết định thiết kế: trong một script dọn ' +
           'dẹp chạy tự động không ai ngồi xem, bạn <b>muốn</b> lỗi lộ ra. <code>-f</code> tồn tại để ' +
           'nuốt lỗi, và ở đây chính nó đã che mất manh mối cuối cùng.</p>' +
           '<p>Trên board thật, hậu quả nặng hơn hẳn máy bàn: thiết bị nằm ngoài hiện trường, không ' +
           'có ai bên cạnh, và dữ liệu đo thì không tái tạo lại được. Bài 13 sẽ thêm ' +
           '<code>set -u</code> để một biến gõ sai tên làm script <i>dừng</i> thay vì lặng lẽ trở ' +
           'thành chuỗi rỗng.</p>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1,
      q: 'Script dưới đây chạy tốt nhiều tháng trên Ubuntu. Bạn nạp nó vào một board dùng ' +
         '<b>BusyBox</b> (rootfs chỉ 4 MB) và nó hỏng ngay dòng đầu với ' +
         '<code>which: not found</code>. Đồng nghiệp gợi ý "cài <code>which</code> vào board là ' +
         'xong". Đánh giá gợi ý đó, rồi viết lại script sao cho chạy được ở cả hai nơi. Nói rõ vì sao ' +
         'phần kiểm tra thư mục ở cuối script cũng <b>không bao giờ hoạt động</b>, kể cả trên Ubuntu.',
      blocks: [
        { t: 'code', where: 'file', name: 'deploy.sh', lang: 'bash', code:
          '#!/bin/sh\n' +
          'which gcc > /dev/null\n' +
          'if [ $? -ne 0 ]; then\n' +
          '    echo "gcc not found"\n' +
          '    exit 1\n' +
          'fi\n' +
          'cd /opt/app\n' +
          'echo "now in /opt/app"' }
      ],
      rows: 7,
      hint: 'Hai vấn đề độc lập nhau. Vấn đề một: <code>which</code> là chương trình ngoài, còn thứ ' +
            'thay thế nó là gì? Vấn đề hai: câu B4 đã cho bạn xem chuyện gì xảy ra với ' +
            '<code>cd</code> bên trong một script.',
      crit: [
        'Đánh giá đúng gợi ý: cài thêm which là giải pháp sai hướng — tốn dung lượng flash cho một việc shell đã làm sẵn',
        'Nêu đúng lý do gốc: which là chương trình NGOÀI nên phải có file thật; command -v là builtin, luôn có sẵn ở mọi shell POSIX',
        'Chỉ ra thêm: which chỉ dò $PATH nên mù với builtin/hàm, còn command -v thấy hết',
        'Viết lại dòng kiểm tra bằng command -v, tốt nhất là dạng: if ! command -v gcc > /dev/null; then',
        'Giải thích vấn đề thứ hai: cd /opt/app chỉ đổi thư mục của tiến trình chạy script; shell gọi nó không hề di chuyển',
        'Nêu cách xử lý đúng cho cd: hoặc dùng cd ... || exit 1 rồi làm việc luôn trong script, hoặc gọi script bằng source',
        'Nêu được: cd /opt/app không kiểm tra kết quả — nếu thư mục không tồn tại, script vẫn chạy tiếp ở thư mục cũ'
      ],
      sol: '<p><b>Gợi ý của đồng nghiệp sai hướng.</b> Trên hệ nhúng, mỗi kilobyte flash đều phải ' +
           'biện minh được, và ở đây bạn định thêm một chương trình để làm việc mà <b>shell đã làm ' +
           'sẵn, miễn phí</b>.</p>' +
           '<p><code>which</code> là một <i>chương trình ngoài</i> — muốn dùng thì phải có file thật ' +
           'trong rootfs, và BusyBox không kèm nó. <code>command -v</code> là <b>builtin</b>, có ' +
           'trong mọi shell POSIX kể cả shell tí hon của BusyBox, và nó còn <i>tốt hơn</i>: ' +
           '<code>which</code> chỉ dò file trong <code>$PATH</code> nên mù với builtin và hàm, ' +
           '<code>command -v</code> thấy hết. Bạn không đánh đổi gì cả — đây là bản nâng cấp thuần.</p>' +
           '<p><b>Vấn đề thứ hai, độc lập hoàn toàn:</b> <code>cd /opt/app</code> ở cuối script ' +
           '<i>không bao giờ</i> đưa được shell gọi nó vào <code>/opt/app</code>, kể cả trên Ubuntu. ' +
           'Script chạy trong một tiến trình con; <code>cd</code> đổi thư mục của <b>tiến trình con ' +
           'đó</b>; con chết là thay đổi biến mất. Dòng ' +
           '<code>echo "now in /opt/app"</code> vì thế là một lời nói dối có hệ thống — đúng cái bẫy ' +
           'ở câu B4. Tệ hơn nữa, kết quả của <code>cd</code> không được kiểm tra: nếu ' +
           '<code>/opt/app</code> chưa được mount, script vẫn thản nhiên chạy tiếp ở thư mục cũ.</p>' +
           '<p><b>Bản viết lại:</b></p>' +
           '<pre><code>#!/bin/sh\n' +
           'if ! command -v gcc > /dev/null 2>&amp;1; then\n' +
           '    echo "gcc not found"\n' +
           '    exit 1\n' +
           'fi\n' +
           'cd /opt/app || { echo "cannot enter /opt/app"; exit 1; }\n' +
           'echo "working in $(pwd)"</code></pre>' +
           '<p>Ba thay đổi: <code>command -v</code> thay <code>which</code>; ' +
           '<code>if !</code> đọc thẳng mã thoát nên không còn khe hở cho <code>$?</code>; và ' +
           '<code>cd ... || exit 1</code> biến một thất bại im lặng thành một lần dừng có thông báo. ' +
           'Nếu mục đích thật sự là <i>đưa shell của bạn</i> vào <code>/opt/app</code>, thì phải gọi ' +
           'bằng <code>. ./deploy.sh</code> — không có cách nào khác.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Bạn đang gỡ lỗi qua cổng nối tiếp trên một board có rootfs <b>4 MB</b>. Board không có ' +
         '<code>man</code> (bộ trang man chiếm hàng chục MB nên đã bị loại khỏi image), không có ' +
         'mạng, không có trình duyệt. Bạn cần biết lệnh <code>ip</code> trên board này nhận những ' +
         'tuỳ chọn nào. Nêu <b>thứ tự</b> các cách bạn thử, và giải thích vì sao thông tin trên máy ' +
         'bàn của bạn <b>không</b> trả lời được câu hỏi này.',
      rows: 6,
      hint: 'Trên board, tài liệu không nằm trong file riêng — nó nằm <b>bên trong chính file thực ' +
            'thi</b>. Và nếu đó là BusyBox thì một lệnh duy nhất liệt kê được mọi thứ board có.',
      crit: [
        'Cách 1: gõ <lệnh> --help (hoặc -h) ngay trên board — chuỗi trợ giúp nằm trong chính file thực thi nên luôn đi cùng nó',
        'Cách 2: gõ sai một tuỳ chọn có chủ ý, thông báo lỗi thường in ra dòng Usage: đầy đủ',
        'Cách 3: busybox <lệnh> hoặc busybox --list để xem board có những applet nào và applet đó nhận gì',
        'Nêu được cách cuối: đọc mã nguồn / cấu hình đúng phiên bản BusyBox đã dùng để build image',
        'Giải thích vì sao máy bàn không trả lời được: bản trên board là BusyBox rút gọn, thường thiếu phần lớn tuỳ chọn của bản đầy đủ',
        'Nêu hệ quả thực tế: một tuỳ chọn chạy tốt trên máy bàn có thể không tồn tại trên board, nên phải kiểm chứng tại chỗ'
      ],
      sol: '<p><b>Thứ tự thử, từ rẻ đến đắt:</b></p>' +
           '<ol>' +
           '<li><code>ip --help</code>, rồi <code>ip -h</code>. Đây là cách đầu tiên vì chuỗi trợ ' +
           'giúp nằm <b>bên trong chính file thực thi</b> — nó không thể "bị thiếu" như trang man, nó ' +
           'luôn đi cùng chương trình và luôn đúng phiên bản đang chạy.</li>' +
           '<li>Gõ sai một tuỳ chọn <b>có chủ ý</b>: <code>ip --nosuchflag</code>. Gần như mọi chương ' +
           'trình phản ứng bằng cách in ra dòng <code>Usage:</code> đầy đủ. Bạn đã thấy đúng hành vi ' +
           'này ở câu B2 với <code>ls --alll</code>.</li>' +
           '<li>Nếu là BusyBox: <code>busybox ip</code> in trợ giúp của riêng applet đó, và ' +
           '<code>busybox --list</code> liệt kê <b>mọi</b> applet mà image này thực sự có. Lệnh thứ ' +
           'hai đáng giá hơn nhiều so với vẻ ngoài — nó trả lời trước câu hỏi "board có ' +
           '<code>&lt;lệnh&gt;</code> không" cho tất cả các lệnh cùng lúc.</li>' +
           '<li>Cách cuối, đắt nhất: đọc mã nguồn / file cấu hình của <b>đúng phiên bản</b> BusyBox ' +
           'đã dùng để build image. Chỉ làm khi ba cách trên bó tay.</li>' +
           '</ol>' +
           '<p><b>Vì sao máy bàn không trả lời được:</b> đó là hai chương trình khác nhau. Câu B2 đã ' +
           'cho thấy ngay trên máy bạn, cái tên <code>ls</code> đã ứng với ba bản khác nhau ' +
           '(uutils, GNU, BusyBox). Bản trên board là bản rút gọn tối đa, thường bỏ phần lớn tuỳ chọn ' +
           'để tiết kiệm flash. <code>man ip</code> trên Ubuntu mô tả bản <i>đầy đủ</i> — một tài ' +
           'liệu chính xác về một chương trình <b>không phải</b> chương trình bạn đang gõ.</p>' +
           '<p><b>Hệ quả nghề nghiệp:</b> một tuỳ chọn chạy ngon trên máy bàn có thể đơn giản là ' +
           'không tồn tại trên board, và bạn chỉ biết khi script deploy hỏng lúc 2 giờ sáng. Nguồn sự ' +
           'thật duy nhất là <i>chính hệ thống đích</i>. Chặng 09 sẽ dựng rootfs BusyBox từ đầu và ' +
           'bạn sẽ tự tay quyết định applet nào được vào image.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Bạn viết script khởi động cho một thiết bị <b>không màn hình, không bàn phím</b>, đặt ở nơi ' +
         'khó tiếp cận. Nó phải: (1) nạp driver, (2) mount phân vùng dữ liệu, (3) chạy ứng dụng chính. ' +
         'Với <b>mỗi</b> cặp bước liền nhau, chọn <code>;</code>, <code>&amp;&amp;</code> hay ' +
         '<code>||</code> và <b>biện minh</b>. Ngoài ra, chọn dùng tuỳ chọn ngắn (<code>-t</code>) hay ' +
         'dài (<code>--types</code>) trong script này, và giải thích. Phần được chấm là phần biện ' +
         'minh, không phải lựa chọn.',
      rows: 8,
      hint: 'Với mỗi cặp, tự hỏi: <i>nếu bước trước hỏng, chạy tiếp bước sau có gây hại không?</i> ' +
            'Nạp driver hỏng mà vẫn mount thì sao? Mount hỏng mà vẫn chạy ứng dụng thì sao?',
      crit: [
        'Chọn && giữa bước 1 và 2, và biện minh: không có driver thì thiết bị khối chưa tồn tại, mount chắc chắn hỏng',
        'Chọn && giữa bước 2 và 3, và biện minh: mount hỏng mà vẫn chạy ứng dụng thì nó sẽ ghi vào thư mục mount point TRÊN RAM/rootfs — dữ liệu mất khi mất điện, và có thể làm đầy rootfs',
        'Nêu được vì sao ; là lựa chọn tệ ở đây: nó cho hệ thống chạy tiếp trong trạng thái sai một cách im lặng, đúng thứ không thể chấp nhận trên thiết bị không ai giám sát',
        'Nêu được một chỗ dùng || hợp lý: ghi log hoặc thông báo lỗi khi một bước hỏng, dạng buoc || echo "..." >> /var/log/boot.err',
        'Chọn tuỳ chọn DÀI cho script và biện minh: script được đọc lại nhiều lần bởi người không viết ra nó; tên dài tự giải thích',
        'Nêu được phía đối lập: tuỳ chọn ngắn hợp lý khi gõ tay, và một số hệ nhúng tối giản chỉ hỗ trợ dạng ngắn — nên phải kiểm chứng trên board',
        'Nêu được vấn đề then chốt: thiết bị không có màn hình nên KHÔNG AI đọc được thông báo lỗi — trạng thái phải quan sát được qua log hoặc đèn LED',
        'Đưa ra đoạn script cụ thể thể hiện các lựa chọn trên'
      ],
      sol: '<p><b>Cả hai cặp đều dùng <code>&amp;&amp;</code>.</b> Nhưng lý do hai cặp khác nhau, và ' +
           'đó mới là phần đáng chấm.</p>' +
           '<p><b>Bước 1 → 2 (<code>&amp;&amp;</code>):</b> quan hệ ở đây là <i>phụ thuộc kỹ thuật</i>. ' +
           'Không nạp được driver thì file thiết bị khối chưa hề tồn tại, nên <code>mount</code> ' +
           'chắc chắn hỏng. Chạy nó chỉ tạo thêm một thông báo lỗi thứ hai che mất thông báo lỗi thật ' +
           'sự đầu tiên.</p>' +
           '<p><b>Bước 2 → 3 (<code>&amp;&amp;</code>):</b> đây mới là chỗ nguy hiểm, và lý do hoàn ' +
           'toàn khác. Nếu <code>mount</code> hỏng mà ứng dụng vẫn chạy, ứng dụng sẽ ghi vào ' +
           '<b>thư mục mount point trống nằm trên rootfs</b> — nghĩa là nó <i>vẫn chạy, vẫn ghi được, ' +
           'vẫn không báo lỗi</i>. Bạn mất dữ liệu khi mất điện, và tệ hơn, có thể làm đầy rootfs cho ' +
           'tới khi thiết bị treo. Lại là <i>im lặng và sai</i>.</p>' +
           '<p><b>Vì sao <code>;</code> là lựa chọn tệ ở đây:</b> nó cho phép hệ thống chạy tiếp trong ' +
           'một trạng thái sai mà không ai biết. Trên máy bàn bạn nhìn màn hình là thấy; trên thiết bị ' +
           'này <b>không có màn hình để mà nhìn</b>.</p>' +
           '<p><b><code>||</code> dùng ở đâu:</b> để ghi lại lý do chết, vì đây là thứ duy nhất bạn ' +
           'có khi tới hiện trường.</p>' +
           '<pre><code>modprobe sensor_drv || { echo "driver load failed" &gt;&gt; /var/log/boot.err; exit 1; }\n' +
           'mount --types ext4 /dev/mmcblk0p2 /data || { echo "mount failed" &gt;&gt; /var/log/boot.err; exit 1; }\n' +
           '/usr/bin/app --config /data/app.conf</code></pre>' +
           '<p><b>Ngắn hay dài:</b> trong script, chọn <b>dài</b>. Script được đọc lại nhiều lần, ' +
           'thường bởi người không viết ra nó, và thường vào lúc đang có sự cố. ' +
           '<code>--types ext4</code> tự giải thích; <code>-t ext4</code> bắt người đọc phải tra. ' +
           'Chi phí bằng không: máy không quan tâm bạn gõ dài hay ngắn.</p>' +
           '<p><b>Nhưng có một ngoại lệ phải nhớ:</b> BusyBox và nhiều công cụ nhúng tối giản chỉ hỗ ' +
           'trợ dạng <b>ngắn</b>. <code>--types</code> có thể đơn giản là không tồn tại trên board. ' +
           'Đây chính là câu C4 quay lại: phải kiểm chứng bằng <code>--help</code> ngay trên thiết bị ' +
           'đích trước khi tin. Gõ tay ở dòng lệnh thì ngược lại — ngắn là hợp lý, vì bạn viết một ' +
           'lần rồi quên.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN D — ÔN XEN KẼ (3 câu) — Bài 1, 2, 3
     Không câu nào được là trục của bài 4 (§13.4 bước 4)
     ══════════════════════════════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 3.</b> Bạn chép một script vào <code>/mnt/c/work/</code>, chạy ' +
         '<code>chmod +x deploy.sh</code>, lệnh <b>không báo lỗi và trả về mã thoát 0</b>. Nhưng ' +
         '<code>./deploy.sh</code> vẫn báo <code>Permission denied</code>. Nguyên nhân đúng nhất là gì?',
      opts: [
        'File nằm trên ổ Windows được WSL mount qua <code>/mnt/c</code>; NTFS không lưu bit quyền ' +
          'kiểu Linux, nên <code>chmod</code> báo thành công nhưng không thay đổi được gì.',
        '<code>chmod</code> cần chạy với <code>sudo</code> mới đổi được quyền thực thi.',
        'Script thiếu dòng <code>#!/bin/bash</code> ở đầu file.',
        'Mã thoát 0 chỉ có nghĩa lệnh đã chạy, không bao giờ có nghĩa lệnh đã làm được việc.'
      ],
      a: 0,
      why: 'Đây là bài học lớn nhất của Bài 3 và là lý do bạn được dặn <b>luôn làm việc trong ' +
           '<code>~</code>, không bao giờ trong <code>/mnt/c</code></b>. NTFS không có khái niệm bit ' +
           'quyền của Linux, nên lớp mount của WSL nhận lệnh <code>chmod</code>, gật đầu, trả về 0 và ' +
           'không lưu được gì cả.<br><br>' +
           'Phương án D nghe rất hợp với chủ đề bài 4 nhưng <i>sai về mặt kỹ thuật</i>: mã thoát 0 ' +
           'đúng là "lệnh tự cho rằng nó thành công", nhưng nó không phải nguyên nhân — nó chỉ là ' +
           'triệu chứng. Câu hỏi hỏi nguyên nhân.<br><br>' +
           'Để ý mối liên hệ với cả bộ bài tập này: một lệnh trả về 0 mà không làm được việc. Bạn đã ' +
           'gặp đúng hình dạng đó ở B5, C1 và C2. Đây không phải trùng hợp — <b>mã thoát 0 nghĩa là ' +
           '"chương trình tự cho rằng nó thành công", chứ không phải "thế giới đã thay đổi như bạn ' +
           'muốn"</b>. Bài 3 còn đo được cái giá thứ hai của <code>/mnt/c</code>: thao tác file ở đó ' +
           'chậm hơn hẳn so với trong <code>~</code>.' },

    { id: 'd2', k: 'free', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 2.</b> Một board không lên gì cả sau khi cấp nguồn — cổng nối tiếp im lặng hoàn ' +
         'toàn, không một ký tự. Dựa vào chuỗi khởi động bạn học ở Bài 2, hãy nêu <b>thứ tự bốn giai ' +
         'đoạn</b> và cho biết sự im lặng tuyệt đối này khoanh vùng lỗi vào giai đoạn nào. Giải thích ' +
         'vì sao chính <i>việc không có output</i> lại là một manh mối mạnh.',
      rows: 6,
      hint: 'Ai là người in ra ký tự <b>đầu tiên</b> trên cổng nối tiếp? Nếu ngay cả ký tự đó cũng ' +
            'không có thì mọi thứ chạy <i>sau</i> nó đều chưa kịp bắt đầu.',
      crit: [
        'Nêu đúng thứ tự bốn giai đoạn: ROM code (boot ROM) → SPL/bootloader tầng một → bootloader chính (U-Boot) → kernel → (rồi tới init/userspace)',
        'Khoanh đúng vùng lỗi: im lặng tuyệt đối nghĩa là chết ở giai đoạn sớm nhất — ROM code hoặc SPL, trước khi UART kịp được khởi tạo',
        'Giải thích được vì sao không có output là manh mối mạnh: mỗi giai đoạn đều in ra dấu hiệu riêng, nên ký tự CUỐI CÙNG nhìn thấy chỉ ra giai đoạn đã chạy xong',
        'Nêu được các nghi phạm cụ thể ở giai đoạn đó: nguồn/clock, chân boot mode chọn sai thiết bị boot, media boot trống hoặc hỏng, sai baud rate hoặc sai chân UART',
        'Phân biệt được với trường hợp có in vài dòng rồi dừng — lúc đó lỗi nằm ở giai đoạn ngay sau dòng cuối cùng'
      ],
      sol: '<p><b>Bốn giai đoạn:</b> ROM code (nằm cứng trong chip, không sửa được) → SPL / ' +
           'bootloader tầng một (nhỏ, chỉ đủ để khởi tạo RAM) → bootloader chính, thường là U-Boot → ' +
           'kernel Linux, rồi bàn giao cho userspace.</p>' +
           '<p><b>Im lặng tuyệt đối khoanh vùng lỗi vào giai đoạn sớm nhất</b>: ROM code hoặc SPL, ' +
           'trước cả lúc UART kịp được cấu hình. Nếu SPL đã chạy được đến chỗ khởi tạo cổng nối tiếp ' +
           'thì bạn đã phải thấy <i>một cái gì đó</i>, dù chỉ là vài ký tự rác.</p>' +
           '<p><b>Vì sao "không có output" là manh mối mạnh:</b> vì mỗi giai đoạn đều để lại dấu vết ' +
           'riêng trên cổng nối tiếp. Nên <b>ký tự cuối cùng bạn nhìn thấy chỉ đúng giai đoạn đã chạy ' +
           'xong</b>, và lỗi nằm ở giai đoạn ngay sau đó. Không có ký tự nào tức là ngay cả giai đoạn ' +
           'đầu tiên cũng chưa hoàn tất — một thông tin cực kỳ hẹp và cực kỳ giá trị, vì nó loại bỏ ' +
           'toàn bộ kernel, toàn bộ rootfs, toàn bộ ứng dụng ra khỏi danh sách nghi phạm ngay lập ' +
           'tức.</p>' +
           '<p><b>Nghi phạm ở giai đoạn đó:</b> nguồn hoặc clock chưa lên; chân boot mode chọn nhầm ' +
           'thiết bị boot; thẻ nhớ / eMMC trống hoặc hỏng; hoặc — thường gặp nhất và ít ai nghĩ tới — ' +
           '<i>máy tính của bạn</i> sai baud rate hay cắm nhầm chân UART, tức board vẫn khoẻ và chỉ ' +
           'có bạn không nghe thấy.</p>' +
           '<p>Cùng một lối tư duy với câu C1 và C2 của bộ này: <b>đọc kỹ thứ hệ thống nói ra, kể cả ' +
           'khi nó không nói gì</b>. Sự im lặng cũng là dữ liệu.</p>' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Ôn Bài 1.</b> Bạn học toàn bộ khoá này trên WSL2 và QEMU, không có board thật. Phát biểu ' +
         'nào mô tả đúng nhất giá trị và giới hạn của cách học đó?',
      opts: [
        'QEMU mô phỏng được CPU, bộ nhớ và phần lớn ngoại vi nên dựng và gỡ lỗi được toàn bộ chuỗi ' +
          'boot; thứ nó không thay thế được là timing thật, phần cứng lỗi và các ngoại vi vật lý ' +
          'không được mô phỏng.',
        'QEMU chỉ là trình giả lập để chơi game, không dùng nghiêm túc cho phát triển nhúng được.',
        'Học trên QEMU tương đương hoàn toàn với board thật; mua board chỉ là chuyện hình thức.',
        'WSL2 không phải Linux thật nên mọi thứ học được đều không áp dụng được lên board.'
      ],
      a: 0,
      why: 'Đây là tiền đề của cả khoá học, và nó phải chính xác theo cả hai chiều.<br><br>' +
           'QEMU chạy <b>chính xác</b> chuỗi boot mà board thật chạy: cùng một bootloader, cùng một ' +
           'ảnh kernel ARM64, cùng một device tree, cùng một rootfs. Chặng 05 sẽ cho bạn boot một ' +
           'kernel thật trên máy ảo và đọc từng dòng log của nó. Kỹ năng chuyển thẳng sang phần ' +
           'cứng.<br><br>' +
           'Giới hạn cũng có thật và phải biết trước: không có timing thật (§10 đã ghi nhận ARM64 ' +
           'trên máy x86 của bạn <b>luôn</b> là emulation, không có tăng tốc phần cứng), không có ' +
           'phần cứng lỗi, và máy ảo <code>virt</code> <b>không có bus I2C hay SPI</b> — nên các bài ' +
           'về cảm biến sau này phải dùng máy ảo khác hoặc cơ chế mô phỏng riêng.<br><br>' +
           'Phương án D sai vì WSL2 chạy một <b>kernel Linux thật</b>, không phải lớp dịch: ' +
           '<code>uname -r</code> cho ra <code>6.18.33.2-microsoft-standard-WSL2</code>. Đó là lý do ' +
           'mọi lệnh trong khoá này chạy được y hệt trên board.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN E — THỰC HÀNH (6 câu)
     2 dự đoán output · 2 gõ lệnh · 1 sửa lỗi · 1 thử thách
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'num', tag: 'Dự đoán output',
      q: 'Chạy trong terminal: một tiến trình nền bị giết bằng <code>SIGKILL</code> (số hiệu tín hiệu ' +
         '<b>9</b>). <b>Dự đoán trước khi chạy</b>: dòng cuối in ra con số nào? Nhập một số nguyên.',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'sleep 30 &\n' +
          'kill -KILL %1\n' +
          'wait %1\n' +
          'echo $?' }
      ],
      a: 137,
      unit: '',
      why: '<b>137 = 128 + 9.</b> Đây là quy ước <b>128 + N</b> của shell: khi một tiến trình bị kết ' +
           'thúc bởi tín hiệu số <i>N</i> thay vì tự thoát, shell báo mã thoát <code>128 + N</code>. ' +
           'Bạn đã kiểm chứng trên máy mình ở phần thực hành Bài 4.<br><br>' +
           'Ba con số đáng nhớ, cả ba đều được đo thật:<br>' +
           '<code>130</code> = 128 + 2 = <b>SIGINT</b> — bạn bấm Ctrl+C<br>' +
           '<code>137</code> = 128 + 9 = <b>SIGKILL</b> — bị giết cứng, không thể chống cự<br>' +
           '<code>143</code> = 128 + 15 = <b>SIGTERM</b> — được yêu cầu dừng một cách lịch sự<br><br>' +
           'Vì sao dân nhúng cần thuộc: <b>137 là chữ ký của OOM killer</b>. Khi kernel hết RAM, nó ' +
           'chọn một tiến trình và <code>SIGKILL</code>. Trên board 64 MB thì đó là chuyện thường ' +
           'ngày, và thứ duy nhất còn lại trong log thường chỉ là con số 137 — không lời giải thích, ' +
           'không stack trace. Đọc được nó là bạn biết ngay phải đi tìm gì; không đọc được thì bạn ' +
           'sẽ đi tìm bug trong mã nguồn của một chương trình hoàn toàn không có lỗi.<br><br>' +
           'Tra số hiệu bất kỳ bằng <code>kill -l</code>.' },

    { id: 'e2', k: 'mcq', tag: 'Dự đoán output',
      q: '<b>Dự đoán trước khi chạy.</b> Biến <code>x</code> chứa chữ <code>a</code>, ' +
         '<b>hai</b> dấu cách, rồi chữ <code>b</code>. Hai lệnh <code>printf</code> dưới đây in ra ' +
         'chính xác những gì?',
      blocks: [
        { t: 'code', where: 'wsl', code:
          'x="a  b"\n' +
          'printf \'[%s]\\n\' $x\n' +
          'printf \'[%s]\\n\' "$x"' }
      ],
      opts: [
        'Lệnh 1 in <code>[a]</code> rồi <code>[b]</code> trên hai dòng; lệnh 2 in ' +
          '<code>[a  b]</code> trên một dòng, giữ nguyên hai dấu cách.',
        'Cả hai lệnh đều in <code>[a  b]</code> trên một dòng.',
        'Lệnh 1 in <code>[a  b]</code>; lệnh 2 in <code>[a]</code> rồi <code>[b]</code>.',
        'Lệnh 1 in <code>[a b]</code> với một dấu cách; lệnh 2 in <code>[a  b]</code> với hai dấu cách.'
      ],
      a: 0,
      why: 'Đây là cơ chế cắt từ, nhìn ở dạng trần trụi nhất — và bạn có thể tự chạy để xác nhận.' +
           '<br><br>' +
           'Không có nháy kép, shell thay <code>$x</code> thành <code>a  b</code> rồi ' +
           '<b>cắt tiếp theo khoảng trắng</b>, cho ra <b>hai</b> đối số riêng biệt. Chuỗi định dạng ' +
           'của <code>printf</code> được dùng lại cho từng đối số, nên nó in hai dòng. Chú ý: ' +
           '<b>hai dấu cách đã biến mất hoàn toàn</b> — chúng chỉ là dấu phân cách và bị nuốt luôn ' +
           'trong quá trình cắt.<br><br>' +
           'Có nháy kép, <code>"$x"</code> là <b>một</b> đối số duy nhất, nguyên vẹn từng ký tự, kể ' +
           'cả hai dấu cách.<br><br>' +
           'Phương án D là cái bẫy tinh vi nhất, vì nó mô tả đúng thứ bạn thấy khi gõ ' +
           '<code>echo $x</code>: màn hình hiện <code>a b</code> với một dấu cách. Nhưng ' +
           '<code>echo</code> nhận hai đối số rồi <i>tự nối lại</i> bằng một dấu cách khi in — nó che ' +
           'mất chuyện đã xảy ra. <code>printf \'[%s]\\n\'</code> không che được gì, và đó là lý do ' +
           'nó là công cụ đúng để soi cơ chế này.<br><br>' +
           'Đây chính xác là cơ chế đã xoá nhầm file ở câu B5 và làm hỏng thiết bị ở câu C2.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Bạn gặp một lệnh lạ trong script của người khác: <code>tee</code>. Hãy gõ ra <b>chuỗi lệnh ' +
         'đầy đủ</b> để trả lời bốn câu hỏi, theo đúng thứ tự bạn sẽ thực hiện: (1) nó là builtin, ' +
         'hàm, alias hay file ngoài? (2) nếu là file thì file thật nằm ở đâu? (3) nó có bao nhiêu ' +
         'trang tài liệu và ở những mục nào? (4) nó nhận những tuỳ chọn gì? Chạy thật trên máy bạn và ' +
         'dán kết quả vào ô trả lời.',
      rows: 8,
      hint: 'Bốn lệnh, mỗi lệnh trả lời đúng một câu hỏi. Đây là quy trình bạn sẽ lặp lại suốt sự ' +
            'nghiệp — hãy biến nó thành phản xạ ngay từ bây giờ.',
      crit: [
        'Câu 1 dùng type tee (hoặc type -a tee) — nói được nó là loại gì',
        'Câu 2 dùng command -v tee, tốt hơn nữa là readlink -f "$(command -v tee)" để lần tới file thật',
        'Câu 3 dùng man -f tee (hoặc whatis tee) — liệt kê các mục có trang tài liệu',
        'Câu 4 dùng tee --help (hoặc man tee) — nêu được ít nhất một tuỳ chọn cùng công dụng',
        'Dán kết quả THẬT chạy trên máy mình, không phải chép lại từ mạng',
        'Nói được tee làm gì bằng một câu của chính mình'
      ],
      sol: '<p><b>Quy trình bốn bước:</b></p>' +
           '<pre><code>type tee\n' +
           'readlink -f "$(command -v tee)"\n' +
           'man -f tee\n' +
           'tee --help</code></pre>' +
           '<p>Trên máy bạn, bước 2 gần như chắc chắn dẫn tới ' +
           '<code>/usr/lib/cargo/bin/coreutils/tee</code> — cùng một chỗ với <code>ls</code> ở câu ' +
           'B2, vì Ubuntu 26.04 dùng bộ uutils viết bằng Rust. <code>readlink -f</code> quan trọng ở ' +
           'chỗ nó đi hết chuỗi symlink để chỉ ra file thật, thứ mà <code>command -v</code> đơn thuần ' +
           'không làm.</p>' +
           '<p><b><code>tee</code> làm gì:</b> nó đọc dữ liệu vào, ghi ra file <b>và</b> đồng thời in ' +
           'ra màn hình — chẻ luồng dữ liệu làm đôi, đúng như cái tên (chữ T). Dân nhúng dùng nó liên ' +
           'tục để vừa xem log build chạy trực tiếp vừa lưu lại toàn bộ để đọc sau:</p>' +
           '<pre><code>make 2&gt;&amp;1 | tee build.log</code></pre>' +
           '<p>Bài 11 sẽ dạy kỹ về ống dẫn và chuyển hướng. Điều đáng giữ lại từ câu này là ' +
           '<b>bản thân quy trình</b>: gặp lệnh lạ thì hỏi <i>nó là gì</i> → <i>nó ở đâu</i> → ' +
           '<i>tài liệu ở mục nào</i> → <i>nó nhận gì</i>. Bốn lệnh, mười lăm giây, và bạn không bao ' +
           'giờ phải đoán.</p>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết <b>một dòng lệnh duy nhất</b> làm đúng bốn việc: biên dịch <code>hello.c</code> thành ' +
         '<code>hello</code>; <b>chỉ</b> chạy chương trình khi biên dịch thành công; cất lại mã thoát ' +
         'của chương trình vào biến <code>rc</code>; in ra <code>rc=&lt;số&gt;</code>. Sau đó chạy ' +
         'thật và dán kết quả. Cuối cùng: nếu biên dịch <b>hỏng</b>, dòng lệnh của bạn in ra ' +
         '<code>rc</code> bằng bao nhiêu, và con số đó có ý nghĩa gì?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'Chuẩn bị', code:
          'mkdir -p ~/bt04 && cd ~/bt04\n' +
          'printf \'#include <stdio.h>\\nint main(void){ printf("hi\\\\n"); return 0; }\\n\' > hello.c' }
      ],
      rows: 6,
      hint: 'Bốn việc, nhưng chỉ cần hai toán tử: <code>&amp;&amp;</code> để nối có điều kiện, và ' +
            '<code>;</code> để tách phần luôn phải chạy. Nhớ câu B1: <code>rc=$?</code> phải nằm ' +
            'ngay dòng liền sau, không có gì chen giữa.',
      crit: [
        'Dùng gcc hello.c -o hello && ./hello để chỉ chạy khi biên dịch thành công',
        'Đặt rc=$? NGAY sau đó, trước mọi lệnh echo',
        'Dùng ; (không phải &&) trước rc=$? và echo, để hai lệnh này luôn chạy kể cả khi biên dịch hỏng',
        'Bọc "$src" / tên file trong nháy kép nếu có dùng biến',
        'Dán kết quả chạy thật, với rc=0 khi mọi thứ trót lọt',
        'Trả lời được câu cuối: biên dịch hỏng thì ./hello không chạy, nên $? là mã thoát của gcc (thường là 1) — rc KHÔNG phải mã thoát của chương trình'
      ],
      sol: '<p><b>Đáp án:</b></p>' +
           '<pre><code>gcc hello.c -o hello &amp;&amp; ./hello; rc=$?; echo "rc=$rc"</code></pre>' +
           '<p>Chạy thật cho <code>hi</code> rồi <code>rc=0</code>.</p>' +
           '<p><b>Vì sao dấu <code>;</code> trước <code>rc=$?</code> chứ không phải ' +
           '<code>&amp;&amp;</code>:</b> nếu viết <code>&amp;&amp; rc=$?</code> thì khi biên dịch ' +
           'hỏng, cả dòng gán lẫn dòng <code>echo</code> đều bị bỏ qua — bạn mất luôn thông tin. ' +
           'Dấu <code>;</code> đảm bảo hai lệnh cuối <b>luôn</b> chạy.</p>' +
           '<p><b>Câu cuối, và đây là phần đáng giá nhất:</b> nếu <code>gcc</code> hỏng thì ' +
           '<code>./hello</code> <i>không chạy</i>, nên <code>$?</code> lúc đó là mã thoát của ' +
           '<b><code>gcc</code></b> — thường là <b>1</b>. Nghĩa là <code>rc</code> lúc đó ' +
           '<b>không phải</b> mã thoát của chương trình như tên biến gợi ý, mà là mã thoát của trình ' +
           'biên dịch. Hai thất bại hoàn toàn khác nhau bị gộp vào cùng một con số.</p>' +
           '<p>Muốn phân biệt được, phải tách ra:</p>' +
           '<pre><code>gcc hello.c -o hello\n' +
           'build_rc=$?\n' +
           'if [ "$build_rc" -ne 0 ]; then echo "build failed: $build_rc"; exit 1; fi\n' +
           './hello\n' +
           'run_rc=$?\n' +
           'echo "run_rc=$run_rc"</code></pre>' +
           '<p>Dài hơn, nhưng khi có sự cố lúc 2 giờ sáng thì nó nói cho bạn biết <i>bước nào</i> ' +
           'hỏng. Đó là toàn bộ khác biệt giữa một script tiện tay và một script dùng được trong sản ' +
           'xuất.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Script dưới đây được chạy thật và cho ra đúng những dòng ở khối kết quả. Nó có ' +
         '<b>ba lỗi độc lập</b>. Tìm cả ba, giải thích dòng thông báo nào tương ứng với lỗi nào, và ' +
         'viết lại script cho đúng. Chú ý dòng cuối: script kết thúc với mã thoát <b>126</b> — con số ' +
         'đó tự nó đã là một manh mối.',
      blocks: [
        { t: 'code', where: 'file', name: 'broken.sh', lang: 'bash', code:
          '#!/bin/bash\n' +
          'src=hello.c\n' +
          'out=build dir/hello\n' +
          'gcc $src -o $out\n' +
          'echo "build done"\n' +
          './$out' },
        { t: 'code', where: 'out', nocopy: true, code:
          'broken.sh: line 3: dir/hello: No such file or directory\n' +
          'gcc: error: missing filename after \'-o\'\n' +
          'build done\n' +
          './: Is a directory\n' +
          'rc=126' }
      ],
      rows: 8,
      hint: 'Bắt đầu từ dòng thông báo đầu tiên: vì sao shell lại đi <i>tìm một file</i> tên ' +
            '<code>dir/hello</code> trong khi dòng 3 chỉ là một phép gán biến? Ba lỗi nối tiếp nhau ' +
            'thành một chuỗi domino.',
      crit: [
        'Lỗi 1: dòng out=build dir/hello thiếu nháy kép — shell hiểu thành "gán out=build rồi CHẠY LỆNH dir/hello", đó là nguồn của thông báo đầu tiên',
        'Nêu đúng hệ quả dây chuyền: phép gán đó chỉ có hiệu lực cho lệnh dir/hello, nên sau dòng 3 biến out RỖNG',
        'Lỗi 2 (hệ quả): gcc $src -o $out trở thành gcc hello.c -o (không có gì phía sau) nên báo missing filename after -o',
        'Lỗi 3: không kiểm tra kết quả biên dịch — dòng echo "build done" in ra dù gcc đã hỏng, và ./$out vẫn được chạy',
        'Giải thích ./: Is a directory — $out rỗng nên ./$out biến thành ./ tức thư mục hiện tại',
        'Giải thích mã thoát 126: lệnh tìm thấy nhưng KHÔNG THỰC THI ĐƯỢC (ở đây là một thư mục); phân biệt với 127 là không tìm thấy lệnh',
        'Bản sửa bọc nháy kép cho cả out, $src và $out',
        'Bản sửa dùng && hoặc kiểm tra mã thoát để không chạy tiếp khi biên dịch hỏng'
      ],
      sol: '<p><b>Ba lỗi, và chúng đổ domino vào nhau.</b></p>' +
           '<p><b>Lỗi 1 — dòng 3, thiếu nháy kép.</b> Shell đọc ' +
           '<code>out=build dir/hello</code> theo đúng ngữ pháp của nó: "gán ' +
           '<code>out=build</code> <i>chỉ cho một lệnh</i>, rồi chạy lệnh <code>dir/hello</code>". Đó ' +
           'là dạng <code>BIEN=gia_tri lenh</code> hoàn toàn hợp lệ, và nó giải thích dòng thông báo ' +
           'đầu tiên: shell thật sự đã đi tìm một file thực thi tên <code>dir/hello</code>.</p>' +
           '<p>Hệ quả tinh vi hơn nhiều: phép gán kiểu đó chỉ có hiệu lực <b>cho đúng lệnh đó</b>. ' +
           'Sau dòng 3, <code>$out</code> <b>rỗng</b>.</p>' +
           '<p><b>Lỗi 2 — dòng 4, hệ quả trực tiếp.</b> <code>gcc $src -o $out</code> nở ra thành ' +
           '<code>gcc hello.c -o</code> với chẳng có gì sau <code>-o</code>. Đó là dòng ' +
           '<code>missing filename after \'-o\'</code>.</p>' +
           '<p><b>Lỗi 3 — không ai kiểm tra kết quả.</b> Dòng <code>echo "build done"</code> in ra ' +
           'bình thản dù <code>gcc</code> vừa hỏng, rồi <code>./$out</code> vẫn được chạy. Vì ' +
           '<code>$out</code> rỗng, <code>./$out</code> trở thành <code>./</code> — tức thư mục hiện ' +
           'tại. Đó là dòng <code>./: Is a directory</code>.</p>' +
           '<p><b>Mã thoát 126</b> khớp chính xác: <i>tìm thấy nhưng không thực thi được</i>. Shell ' +
           'tìm ra <code>./</code>, nhưng một thư mục thì không chạy được. Phân biệt cho rõ: ' +
           '<b>127</b> là không tìm thấy lệnh, <b>126</b> là tìm thấy mà không chạy được — thường do ' +
           'thiếu bit <code>+x</code>, hoặc như ở đây, do nó không phải chương trình.</p>' +
           '<p><b>Bản sửa:</b></p>' +
           '<pre><code>#!/bin/bash\n' +
           'src="hello.c"\n' +
           'out="build dir/hello"\n' +
           'mkdir -p "$(dirname "$out")"\n' +
           'gcc "$src" -o "$out" || { echo "build failed"; exit 1; }\n' +
           'echo "build done"\n' +
           './"$out"</code></pre>' +
           '<p>Bài học chung với câu C1 và C2: <b>một script không kiểm tra mã thoát vẫn chạy tiếp ' +
           'sau khi đã hỏng</b>, và mỗi bước sau đó lại đẻ ra một thông báo lỗi mới che mất thông báo ' +
           'gốc. Ở đây bạn nhận được bốn dòng lỗi cho <i>một</i> ký tự thiếu. Bài 13 sẽ giới thiệu ' +
           '<code>set -euo pipefail</code> để script tự dừng ngay ở lỗi đầu tiên.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Trên máy bạn có <b>ít nhất hai</b> chương trình tên <code>echo</code>: một builtin của bash ' +
         'và một file ngoài <code>/usr/bin/echo</code>. Câu hỏi mở, được phép không giải hết: ' +
         '(1) chứng minh bằng thực nghiệm rằng khi bạn gõ <code>echo</code>, bash chạy cái nào — ' +
         '<b>không</b> được dùng <code>type</code>, phải tìm một khác biệt <i>quan sát được ở kết ' +
         'quả</i>; (2) đo chi phí của việc gọi nhầm cái ngoài, chạy vòng lặp 2000 lần cho mỗi bên; ' +
         '(3) giải thích vì sao khác biệt lớn đến vậy, dù hai chương trình làm cùng một việc.',
      rows: 8,
      hint: 'Thử đưa cho cả hai một tuỳ chọn mà chương trình ngoài hiểu còn builtin thì không — ' +
            '<code>--version</code> là ứng viên tốt nhất. Với phần đo, dùng ' +
            '<code>time</code> quanh một vòng <code>for</code>.',
      crit: [
        'Tìm ra một khác biệt quan sát được: echo --version in ra chữ --version (builtin coi nó là văn bản), còn /usr/bin/echo --version in ra tên và số phiên bản',
        'Kết luận đúng từ thí nghiệm đó: gõ echo thì bash chạy BUILTIN, vì builtin luôn được ưu tiên hơn file trong $PATH',
        'Chạy được phép đo 2000 vòng cho cả hai và dán số thật của máy mình',
        'Nêu đúng hướng và bậc độ lớn: builtin nhanh hơn hàng trăm lần, không phải vài lần',
        'Giải thích đúng nguyên nhân: builtin chạy ngay trong tiến trình bash; gọi file ngoài phải fork tạo tiến trình mới, exec nạp chương trình, nạp thư viện động, rồi dọn dẹp',
        'Rút ra hệ quả cho hệ nhúng: trong vòng lặp lớn hoặc trên CPU yếu, chọn builtin thay vì gọi chương trình ngoài là một quyết định hiệu năng thật sự',
        'Ghi nhận rằng con số cụ thể thay đổi theo tải máy — lặp lại phép đo vài lần và báo cáo khoảng giá trị, không báo cáo một con số duy nhất'
      ],
      sol: '<p><b>(1) Bằng chứng, không dùng <code>type</code>:</b></p>' +
           '<pre><code>echo --version\n' +
           '/usr/bin/echo --version</code></pre>' +
           '<p>Kết quả thật trên máy bạn:</p>' +
           '<pre><code>--version\n' +
           'echo (uutils coreutils) 0.8.0</code></pre>' +
           '<p>Builtin của bash <b>không hiểu</b> <code>--version</code> nên coi nó là văn bản thường ' +
           'và in nguyên ra. Chương trình ngoài hiểu và in phiên bản. Vì gõ <code>echo</code> trần ' +
           'cho ra dòng thứ nhất, kết luận không thể chối cãi: <b>bash chạy builtin</b>. Cùng cách ' +
           'đó với <code>--help</code> cũng ra kết quả tương tự.</p>' +
           '<p><b>(2) Phép đo, 2000 vòng mỗi bên:</b></p>' +
           '<pre><code>time ( for i in $(seq 1 2000); do echo x; done &gt; /dev/null )\n' +
           'time ( for i in $(seq 1 2000); do /usr/bin/echo x; done &gt; /dev/null )</code></pre>' +
           '<p>Đo ba lần trên máy tham chiếu: builtin <b>0,009 / 0,007 / 0,008 s</b>; ngoài ' +
           '<b>3,319 / 3,354 / 3,433 s</b>. Chênh lệch <b>trên 400 lần</b>. Con số của bạn sẽ khác — ' +
           'nó phụ thuộc tải máy — nên <b>hãy đo vài lần và báo cáo một khoảng</b>, đừng bao giờ báo ' +
           'cáo một con số duy nhất như thể nó là hằng số. Cái ổn định ở đây là <i>bậc độ lớn</i>, ' +
           'không phải chữ số.</p>' +
           '<p><b>(3) Vì sao chênh nhiều đến thế:</b> builtin chạy <b>ngay bên trong tiến trình ' +
           'bash</b> — gần như chỉ là một lời gọi hàm. Gọi chương trình ngoài thì mỗi lần lặp phải: ' +
           '<code>fork</code> tạo một tiến trình mới → <code>exec</code> nạp file thực thi từ đĩa → ' +
           'trình liên kết động nạp và nối các thư viện dùng chung → chương trình chạy → thoát → ' +
           'kernel dọn dẹp. Khoảng <b>1,7 mili-giây</b> mỗi vòng cho một việc chỉ tốn vài micro-giây ' +
           'nếu làm bằng builtin.</p>' +
           '<p><b>Vì sao điều này quan trọng với nghề nhúng:</b> trên board CPU yếu, một script khởi ' +
           'động gọi chương trình ngoài trong vòng lặp có thể kéo dài thời gian boot thêm hàng giây. ' +
           'Chọn builtin không phải mẹo vặt — nó là một quyết định hiệu năng có đo được.</p>' +
           '<p><b>Câu hỏi để ngỏ, dành cho Bài 13.</b> Thử đoán rồi chạy:</p>' +
           '<pre><code>false | true\n' +
           'echo $?</code></pre>' +
           '<p>Kết quả là <b>0</b>, dù <code>false</code> rõ ràng đã thất bại — vì mã thoát của một ' +
           'ống dẫn mặc định là mã thoát của <i>lệnh cuối cùng</i>. Nghĩa là ' +
           '<code>make | tee build.log</code> sẽ báo thành công ngay cả khi <code>make</code> hỏng. ' +
           'Bài 13 sẽ giới thiệu <code>set -o pipefail</code> để sửa chuyện này. Bạn vừa gặp cùng một ' +
           'chủ đề lần thứ tư trong bộ bài tập: <b>hệ thống báo thành công trong khi thực tế đã ' +
           'hỏng</b>.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN F — BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Mọi liên kết đã đối chiếu với id neo thật của tiêu đề trong lessons/bai-0X.js
     ══════════════════════════════════════════════ */
  diag: [

    ['A1',
     'Bạn còn lẫn <b>terminal</b>, <b>shell</b> và <b>kernel</b> — ba lớp làm ba việc khác hẳn nhau. ' +
     'Terminal vẽ chữ, shell hiểu câu lệnh, kernel chạy chương trình.',
     '<a href="#/bai-04#shell-la-gi">Đọc lại: Shell là gì</a>'],

    ['A2, B1, C1, E1',
     '<b>Trục 1 — mã thoát và tuổi thọ của <code>$?</code>.</b> Bạn chưa chắc 0 là thành công, hoặc ' +
     'chưa nhận ra <code>$?</code> bị ghi đè sau <i>mỗi</i> lệnh, kể cả một dòng <code>echo</code> vô hại.',
     '<a href="#/bai-04#ma-thoat-cach-may-tra-loi-co-duoc-khong">Đọc lại: Mã thoát — cách máy trả lời "có được không"</a>'],

    ['A3, B4, C3, E6',
     '<b>Trục 2 — builtin thắng file ngoài.</b> Bạn chưa nắm được vì sao <code>cd</code> buộc phải là ' +
     'builtin, vì sao <code>which cd</code> im lặng, và vì sao <code>cd</code> trong một script không ' +
     'di chuyển được shell gọi nó.',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại: Một lệnh thật sự đến từ đâu</a>'],

    ['A4, B5, C2, E2',
     '<b>Trục 3 — shell cắt dòng lệnh thành từ theo khoảng trắng.</b> Đây là nguồn của loại lỗi tệ ' +
     'nhất: lệnh chạy trót lọt, trả về 0, và tác động lên đúng những file bạn không hề nhắc tới.',
     '<a href="#/bai-04#khoang-trang-la-dau-phan-cach-va-do-la-cai-bay-dau-tien">Đọc lại: Khoảng trắng là dấu phân cách — và đó là cái bẫy đầu tiên</a>'],

    ['A4, A5',
     'Bạn chưa tách bạch được ba phần của một dòng lệnh: <b>tên lệnh</b>, <b>tuỳ chọn</b> và ' +
     '<b>đối số</b>. Không tách được thì mọi thông báo lỗi sau đó đều khó đọc.',
     '<a href="#/bai-04#cau-truc-cua-mot-cau-lenh">Đọc lại: Cấu trúc của một câu lệnh</a>'],

    ['A5, C5',
     'Bạn chưa rõ tuỳ chọn ngắn gộp được còn tuỳ chọn dài thì không, và chưa có quy ước riêng cho ' +
     '"gõ tay" so với "viết vào script".',
     '<a href="#/bai-04#tuy-chon-ngan-va-tuy-chon-dai">Đọc lại: Tuỳ chọn ngắn và tuỳ chọn dài</a>'],

    ['A6, A8, E3',
     'Bạn chưa chọn đúng công cụ tra cứu cho từng loại lệnh: <code>type</code> khi gõ tay, ' +
     '<code>command -v</code> khi viết script, <code>help</code> cho builtin, <code>man</code> cho ' +
     'file chương trình, <code>apropos</code> khi chưa biết tên.',
     '<a href="#/bai-04#tra-cuu-man-help-va-help">Đọc lại: Tra cứu: man, --help và help</a>'],

    ['A7, B6',
     'Bạn chưa thuộc cặp số hiệu mục quan trọng nhất với nghề nhúng: <b>mục 2</b> là lời gọi hệ thống, ' +
     '<b>mục 3</b> là hàm thư viện C. Cùng một tên có thể có nhiều trang tài liệu.',
     '<a href="#/bai-04#so-hieu-muc-trong-man">Đọc lại: Số hiệu mục trong man</a>'],

    ['B3, C5',
     'Bạn chưa thấy được khác biệt giữa <code>;</code>, <code>&amp;&amp;</code> và <code>||</code> ' +
     'chỉ lộ ra <b>khi lệnh trước thất bại</b> — đúng lúc bạn cần nó nhất và đúng lúc không ai ngồi xem.',
     '<a href="#/bai-04#noi-lenh-theo-ket-qua-amp-amp-va">Đọc lại: Nối lệnh theo kết quả: &amp;&amp; và ||</a>'],

    ['B2, C4',
     'Bạn còn tin rằng cùng một tên lệnh thì ở đâu cũng là cùng một chương trình. Trên máy bạn ' +
     '<code>ls</code> là bản uutils viết bằng Rust; trên board nó là BusyBox rút gọn.',
     '<a href="#/bai-04#thuc-hanh-mo-xe-cau-lenh-tren-may-cua-ban">Đọc lại: Thực hành: mổ xẻ câu lệnh trên máy của bạn</a>'],

    ['E4',
     'Bạn chưa cất được mã thoát đúng lúc. Quy tắc: <code>rc=$?</code> phải nằm ở <b>dòng liền sau</b> ' +
     'lệnh cần kiểm tra, trước mọi dòng log.',
     '<a href="#/bai-04#ma-thoat-cach-may-tra-loi-co-duoc-khong">Đọc lại: Mã thoát — cách máy trả lời "có được không"</a>'],

    ['E5',
     'Bạn chưa đọc được thông báo lỗi để lần ngược về nguyên nhân, và chưa phân biệt được ' +
     '<b>127</b> (không tìm thấy lệnh) với <b>126</b> (tìm thấy nhưng không thực thi được).',
     '<a href="#/bai-04#loi-thuong-gap">Đọc lại: Lỗi thường gặp</a>'],

    ['D1',
     '<b>Ôn Bài 3.</b> Bạn chưa nhớ vì sao <code>chmod</code> trên <code>/mnt/c</code> báo thành công ' +
     'mà không đổi được gì, và vì sao phải luôn làm việc trong <code>~</code>.',
     '<a href="#/bai-03#hai-he-thong-file-va-cai-bay-50-lan">Đọc lại Bài 3: Hai hệ thống file và cái bẫy 50 lần</a>'],

    ['D2',
     '<b>Ôn Bài 2.</b> Bạn chưa thuộc thứ tự các giai đoạn khởi động, nên chưa dùng được ' +
     '"dòng cuối cùng nhìn thấy" để khoanh vùng lỗi.',
     '<a href="#/bai-02#chan-doan-thiet-bi-chet-o-giai-doan-nao">Đọc lại Bài 2: Chẩn đoán — thiết bị chết ở giai đoạn nào</a>'],

    ['D2',
     '<b>Ôn Bài 2.</b> Bạn chưa nắm được mỗi giai đoạn bàn giao cái gì cho giai đoạn kế tiếp — đó mới ' +
     'là thứ biến chuỗi boot thành một công cụ chẩn đoán.',
     '<a href="#/bai-02#moi-giai-doan-ban-giao-cai-gi">Đọc lại Bài 2: Mỗi giai đoạn bàn giao cái gì</a>'],

    ['D3',
     '<b>Ôn Bài 1.</b> Bạn chưa rõ QEMU và WSL2 thay thế được gì của phần cứng thật và không thay thế ' +
     'được gì — tiền đề của toàn bộ khoá học này.',
     '<a href="#/bai-01#vi-sao-wsl2-va-qemu-la-du-de-hoc">Đọc lại Bài 1: Vì sao WSL2 và QEMU là đủ để học</a>']
  ]

});

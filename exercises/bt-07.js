/* ============================================================
   BT-07 — Bài tập cho Bài 7: "Soạn thảo trong terminal: nano và vim"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                                   | PT | GIA | NGC | Tổng |
   |------------------------------------------------------------|----|-----|-----|------|
   | Ctrl+S: TERMINAL chặn hiển thị, chương trình vẫn chạy       | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | vim có CHẾ ĐỘ — cùng một phím, hai nghĩa hoàn toàn khác     | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | Lệnh sau dấu hai chấm mặc định chỉ tác động MỘT DÒNG        | 2  |  2  |  1  |  5   |  ← TRỤC 3
   | File .swp còn lại sau khi phiên trước bị ngắt (E325)        | 1  |  2  |  2  |  5   |
   | expandtab biến Tab thành dấu cách, Makefile chết vì thế     | 1  |  2  |  1  |  4   |
   | vim -u NONE để tách bạch lỗi do cấu hình hay do vim         | 1  |  1  |  1  |  3   |
   | :q / :wq / :q! — ba đường ra khác nhau                      | 1  |  2  |  0  |  3   |
   | POSIX bắt buộc có vi, nên vi có mặt ở mọi nơi               | 1  |  1  |  0  |  2   |
   | nano ghi sẵn phím dưới màn hình, ^ nghĩa là Ctrl            | 0  |  1  |  0  |  1   |

   Bước 3 — cắt: hai ứng viên đạt 6, hai ứng viên đạt 5, chỉ được lấy ba.
   Chỗ phải cân là 5-điểm: `.swp`/E325 so với "chỉ một dòng". Chọn cái sau,
   và lý do nằm đúng ở cột GIA của §13.4: E325 là một tai nạn TỰ BÁO — vim
   dựng nguyên một màn hình đỏ, in ra đường dẫn file .swp và liệt kê sáu lựa
   chọn, nên hiểu sai nó chỉ tốn vài phút lúng túng. Còn `:s` thay vì `:%s`
   thì SAI TRONG IM LẶNG: vim báo "1 substitution on 1 line" bằng chữ nhỏ ở
   đáy màn hình, bạn lưu, bạn tưởng đã sửa hai trăm dòng, và bạn phát hiện ra
   ở lần build sau. Một kết quả sai âm thầm luôn đắt hơn một màn hình lỗi.
   `.swp` không bị mất: nó chiếm câu C4 và một dòng riêng trong bảng phần F.

   Bước 4 — loại: "nano ghi sẵn phím dưới màn hình" và "POSIX bắt buộc có vi"
   bị loại theo §13.3 — tra được trong mười giây, nên mỗi cái chỉ được một câu
   mức A (A1) chứ không được xoáy.
   Kiểm tra chống trùng với các bộ trước: bt-01 xoáy MMU / bốn mảnh nối tiếp /
   Device Tree; bt-02 xoáy DRAM-SRAM-SPL / bàn giao rồi biến mất / bootargs;
   bt-03 xoáy ảo hoá cần cùng kiến trúc / hai họ QEMU / ranh giới 9P; bt-04
   xoáy $? sống một lệnh / builtin thắng file ngoài / cắt theo khoảng trắng;
   bt-05 xoáy sinh lúc đọc / major–minor / thư mục rỗng là điểm gắn; bt-06
   xoáy shell mở rộng dấu sao / inode vs tên / siêu dữ liệu là hệ thống.
   Ba trục của bộ này không trùng cái nào — hợp lệ.

   LƯU Ý VỀ TRỤC 1 SO VỚI TRỤC "SHELL MỞ RỘNG DẤU SAO" CỦA BT-06: hai cái
   nghe giống nhau ("thủ phạm không phải chương trình bạn đang chạy") nhưng ở
   HAI TẦNG khác nhau, và không được lẫn. bt-06 nói về SHELL, một chương trình
   ở tầng người dùng, sửa dòng lệnh trước khi chạy. Bộ này nói về TRÌNH ĐIỀU
   KHIỂN TERMINAL nằm trong nhân, đứng giữa bàn phím và mọi chương trình, và
   nó chặn ngay cả khi không có shell nào tham gia. Câu D3 là chỗ nối hai
   tầng đó lại với nhau qua chuyện dấu nháy của Bài 4.

   Bước 6 — hiểu sai đối lập của từng trục nằm trong trường `mis` bên dưới.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (terminal chặn)  A2 phát biểu → B1 bản `stty -a` ĐẦY ĐỦ, có cờ
                                             ixon — dữ liệu mới, bài học chỉ
                                             in năm ký tự điều khiển
                                           → C1 console 115200 của board "treo"
     Trục 2 (chế độ)         A3 phát biểu → B3 file cấu hình thật bị băm nát
                                             thành ONFIG_SPI=y
                                           → C3 vi của BusyBox qua SSH chập chờn
     Trục 3 (một dòng)       A4 phát biểu → B2 hai kết quả thật của :s và :%s
                                           → C2 vá 40 file, mỗi file đổi 1 dòng

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, nano 8.7.1, vim 9.1) ngày
   2026-08-12. Các phiên vim được lái bằng `vim -s <file phím>` chạy dưới
   `script -qec` để có pty thật, hoặc bằng `vim -Es -c '<lệnh>'`.

   HAI KHÁC BIỆT ĐÃ ĐƯỢC TRUY NGUYÊN TRƯỚC KHI DÙNG:

   1) `vim -Es` KHÔNG đọc `~/.vimrc` (chế độ Ex im lặng bỏ qua vimrc). Lần đo
      đầu tiên vì thế cho tabstop=8 ở cả hai vế và trông như `~/.vimrc` vô
      tác dụng. Đo lại bằng `vim -u <file> -Es` mới ra tabstop=4/expandtab so
      với `-u NONE` ra tabstop=8/noexpandtab. Câu E4 dùng con số của lần đo
      thứ hai và nói rõ điều kiện.

   2) `~/.vimrc` KHÔNG tồn tại trên máy người học. File dùng để đo được tạo
      ra rồi xoá đi ngay trong cùng một lần chạy. Câu E4 vì thế bảo người học
      tự tạo, chứ không giả định nó đã có sẵn.

   MỘT SỐ CỐ Ý KHÔNG CHẤM: số hiệu tiến trình trong màn hình E325 (528) và
   dấu thời gian (2026-08-12 22:09) đổi theo từng lần chạy. Câu nào có chúng
   thì chấm QUAN HỆ (":x không đổi dấu thời gian, :wq có đổi") chứ không chấm
   con số.

   BUSYBOX KHÔNG CÓ TRÊN MÁY NÀY (đã kiểm tra: `command -v busybox` không ra
   gì). Vì vậy câu C3 là một TÌNH HUỐNG để suy luận, không phải bài thực hành,
   và không có con số nào về BusyBox được nêu ra trong bộ này.
   ============================================================ */
Exercise.register({
  id: 'bt-07',
  minutes: 85,

  intro:
    '<p>Bài 7 là bài đầu tiên bạn <b>sửa</b> file chứ không chỉ đọc file. Và nó là bài đầu tiên có thứ ' +
    'chống lại bạn: một trình soạn thảo mà cùng một phím lúc thì gõ ra chữ, lúc thì xoá mất ba từ.</p>' +
    '<p>Ba hiện tượng bạn sắp đọc đều vô lý nếu bạn còn nghĩ "gõ phím nào thì hiện chữ đó": một màn hình ' +
    '<b>đứng hình hoàn toàn</b> mà chương trình bên dưới vẫn đang chạy ngon lành; một file cấu hình biến ' +
    'thành <code>ONFIG_SPI=y</code> <b>dù bạn gõ đúng từng chữ</b>; và một lệnh thay thế chạy thành công, ' +
    'báo không lỗi, mà chỉ sửa <b>một dòng trong hai trăm dòng</b>. Cả ba đều không phải trục trặc — ' +
    'chúng là hệ quả của việc bạn đang nói chuyện với ai: với terminal, với chế độ nào của vim, hay với ' +
    'phạm vi mặc định của một lệnh Ex.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Phần D lần này ôn Bài 4, Bài 5 và Bài 6 — cả ba đều là thứ phần E phải dùng lại ngay.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` và `mis` là tài liệu cho người viết
     bài tập sau, không được render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'terminal-chan-hien-thi',
      name: 'Ctrl+S không treo chương trình — terminal chỉ ngừng hiển thị',
      x: 'Giữa bàn phím và mọi chương trình có một lớp nữa: trình điều khiển terminal trong nhân. Cờ ' +
         '<code>ixon</code> bật nghĩa là ký tự <code>^S</code> bị lớp đó nuốt và hiểu thành "ngừng đẩy ' +
         'ký tự ra màn hình", <code>^Q</code> là "chạy tiếp". Chương trình không hề nhận được ' +
         '<code>^S</code>, không hề biết có chuyện gì xảy ra, và vẫn chạy bình thường; phím bạn gõ ' +
         'trong lúc đó được xếp hàng chờ và ùa ra hết khi bấm <code>^Q</code>.',
      mis: 'Màn hình đứng im nghĩa là chương trình treo. Cách xử lý là bấm Ctrl+C, hoặc tệ hơn, tắt cửa ' +
           'sổ terminal — vì "đằng nào cũng mất rồi". Và đây là lỗi của nano/vim, chứ nếu dùng trình ' +
           'soạn thảo khác thì đã không bị.' },

    { id: 'vim-co-che-do',
      name: 'vim có chế độ: cùng một phím, hai nghĩa hoàn toàn khác nhau',
      x: 'Ở chế độ Normal, mỗi phím là một LỆNH: <code>d</code> xoá, <code>C</code> thay cả phần còn ' +
         'lại của dòng, <code>i</code> chuyển sang chế độ Insert. Chỉ trong chế độ Insert thì phím mới ' +
         'là chữ. Vì vậy cùng một chuỗi phím gõ ở hai chế độ cho hai kết quả không liên quan gì nhau, ' +
         'và vim không có cách nào biết bạn định làm gì — nó chỉ biết bạn đang ở chế độ nào.',
      mis: 'Trình soạn thảo nào cũng vậy: mở file ra rồi gõ thì chữ hiện ra. Nếu chữ không hiện đúng ' +
           'thì file hỏng hoặc bàn phím sai. Và <kbd>Esc</kbd> chỉ để thoát, giống như hộp thoại trên ' +
           'Windows.' },

    { id: 'pham-vi-mot-dong',
      name: 'Lệnh sau dấu hai chấm mặc định chỉ tác động lên một dòng',
      x: 'Một lệnh Ex có dạng <code>:[phạm vi]lệnh</code>. Không viết phạm vi thì phạm vi là DÒNG ĐANG ' +
         'CÓ CON TRỎ, chứ không phải cả file. <code>%</code> nghĩa là toàn bộ file. Cờ <code>g</code> ở ' +
         'cuối lại là chuyện thứ ba nữa: nó nói "trong mỗi dòng, thay mọi lần xuất hiện" chứ không phải ' +
         '"thay ở mọi dòng". Ba khái niệm độc lập, thường bị gộp thành một.',
      mis: 'Gõ <code>:s/cũ/mới/</code> là lệnh thay thế, mà thay thế thì đương nhiên thay khắp file. Nếu ' +
           'nó chỉ thay một chỗ thì chắc là do thiếu <code>g</code>. Lệnh chạy không báo lỗi tức là đã ' +
           'làm đúng ý mình.' }
  ],

  /* ══════════════════ A · NHẬN BIẾT ══════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Vì sao một kỹ sư nhúng <b>bắt buộc</b> phải biết thoát khỏi <code>vim</code>, dù ' +
         '<code>nano</code> dễ dùng hơn hẳn?',
      opts: [
        'Vì <code>vim</code> chạy nhanh hơn và tốn ít bộ nhớ hơn <code>nano</code>.',
        'Vì <code>nano</code> đã lỗi thời và các bản phân phối mới không còn đóng gói nó.',
        'Vì tiêu chuẩn POSIX bắt buộc mọi hệ thống Unix phải có <code>vi</code>, và các rootfs nhúng ' +
          'tối giản thường chỉ có bản <code>vi</code> đi kèm BusyBox — không có <code>nano</code> và ' +
          'cũng không có trình quản lý gói để cài thêm.',
        'Vì <code>vim</code> là trình soạn thảo duy nhất sửa được file cấu hình của kernel.'
      ],
      a: 2,
      why: 'Lý do là <b>tính sẵn có</b>, không phải chất lượng. Trên một board vừa nạp rootfs tối giản, ' +
           'thứ bạn có là cái đã được biên dịch vào ảnh — thường là BusyBox, trong đó có sẵn một bản ' +
           '<code>vi</code> rút gọn. Không có mạng, không có <code>apt</code>, không có gì để cài thêm. ' +
           'Biết <code>nano</code> mà không biết <code>vi</code> nghĩa là có lúc bạn ngồi trước một ' +
           'console 115200 baud và không sửa nổi một dòng.<br><br>' +
           'Phương án A còn <b>sai về số liệu</b>, và đây là chỗ đáng nhớ. Đo trên chính máy bạn:<br>' +
           '<code>/bin/nano</code> = <b>289 616</b> byte<br>' +
           '<code>/usr/bin/vim.basic</code> = <b>4 571 816</b> byte<br>' +
           'cộng thêm <code>/usr/share/vim</code> nặng <b>45 MB</b> so với ' +
           '<code>/usr/share/nano</code> chỉ <b>200 KB</b>.<br>' +
           'Trên máy để bàn, <code>vim</code> <i>to hơn</i> <code>nano</code> mười lăm lần. Thứ nhỏ gọn ' +
           'là bản <code>vi</code> trong BusyBox — một chương trình khác, chỉ chung tổ tiên. Đừng nhớ ' +
           '"vim nhẹ"; hãy nhớ "vi luôn có mặt".' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Bạn đang sửa file trong <code>nano</code>, quen tay bấm <kbd>Ctrl</kbd>+<kbd>S</kbd> để lưu. ' +
         'Màn hình đứng hình: gõ gì cũng không hiện. Phát biểu nào <b>đúng</b>?',
      opts: [
        '<code>nano</code> đã treo; phải bấm <kbd>Ctrl</kbd>+<kbd>C</kbd> để giết nó, và mọi thay đổi ' +
          'chưa lưu đều mất.',
        '<code>nano</code> vẫn chạy bình thường và vẫn nhận được mọi phím bạn gõ; chỉ có ' +
          '<b>terminal</b> đang ngừng hiển thị. Bấm <kbd>Ctrl</kbd>+<kbd>Q</kbd> là mọi thứ hiện ra ' +
          'một lượt.',
        'File đã bị khoá bởi một tiến trình khác nên <code>nano</code> phải chờ.',
        'Phím <kbd>Ctrl</kbd>+<kbd>S</kbd> đã gửi tín hiệu dừng tới <code>nano</code>; phải dùng ' +
          '<code>kill -CONT</code> từ một cửa sổ khác để nó chạy tiếp.'
      ],
      a: 1,
      why: 'Thủ phạm nằm <b>dưới</b> chương trình: trình điều khiển terminal trong nhân. Nó nuốt ký tự ' +
           '<code>^S</code> và hiểu thành "ngừng đẩy ký tự ra màn hình" — cơ chế <i>flow control</i>. ' +
           '<code>nano</code> không hề nhận được phím đó, không hề biết có chuyện gì xảy ra.<br><br>' +
           'Phân biệt với phương án D cho kỹ, vì hai chuyện này rất dễ lẫn: ' +
           '<kbd>Ctrl</kbd>+<kbd>Z</kbd> (<code>susp = ^Z</code>) mới thật sự <b>dừng tiến trình</b> và ' +
           'cần <code>fg</code> hoặc <code>kill -CONT</code> để chạy tiếp. ' +
           '<kbd>Ctrl</kbd>+<kbd>S</kbd> (<code>stop = ^S</code>) không đụng tới tiến trình một chút ' +
           'nào — nó chỉ khoá <i>đường ra màn hình</i>.<br><br>' +
           'Hệ quả thực tế: bấm <kbd>Ctrl</kbd>+<kbd>C</kbd> lúc này là tự bắn vào chân. Terminal vẫn ' +
           'đang khoá nên bạn không thấy gì, nhưng ký tự <code>^C</code> vẫn tới được <code>nano</code> ' +
           'và giết nó thật. Câu B1 cho bạn xem đúng cái cờ tạo ra chuyện này.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Câu nào mô tả đúng nhất ý nghĩa của việc "<code>vim</code> có chế độ"?',
      opts: [
        '<code>vim</code> có chế độ chỉ đọc và chế độ ghi; mở file bằng <code>vim -R</code> thì không ' +
          'sửa được.',
        'Cùng một phím mang <b>hai nghĩa hoàn toàn khác nhau</b> tuỳ chế độ: ở Normal nó là một lệnh, ' +
          'ở Insert nó là một ký tự. Muốn gõ chữ, phải chuyển sang Insert trước.',
        '<code>vim</code> có chế độ tương thích <code>vi</code> và chế độ mở rộng; chế độ mở rộng thêm ' +
          'màu và số dòng.',
        'Chế độ là cách <code>vim</code> nhớ bạn đang sửa file nào, để <code>:e</code> quay lại được.'
      ],
      a: 1,
      why: 'Đây là toàn bộ chỗ khó của <code>vim</code>, và cũng là toàn bộ chỗ mạnh của nó.<br><br>' +
           'Cùng một chuỗi phím, hai kết quả không liên quan gì nhau. Ví dụ thật, đã chạy trên máy bạn: ' +
           'gõ <code>C O N F I G _ S P I = y</code> khi đang ở chế độ Normal thì dòng đầu của file biến ' +
           'thành <code>ONFIG_SPI=y</code> — phím <code>C</code> viết hoa là lệnh "xoá từ con trỏ tới ' +
           'hết dòng rồi vào chế độ Insert", nên nó nuốt luôn nội dung cũ và <b>chính nó cũng không ' +
           'xuất hiện</b> trong file. Gõ đúng chuỗi ấy sau khi bấm <code>i</code> thì được kết quả bình ' +
           'thường. Câu B3 mổ xẻ đúng ca này.<br><br>' +
           'Mặt lợi của thiết kế: vì ở Normal mọi phím đều là lệnh, bạn có cả bàn phím làm phím tắt mà ' +
           'không phải giữ <kbd>Ctrl</kbd>. <code>3dw</code> xoá ba từ, <code>dd</code> xoá dòng, ' +
           '<code>ciw</code> thay một từ. Cái giá phải trả là bạn <b>luôn</b> phải biết mình đang ở chế ' +
           'độ nào — và <kbd>Esc</kbd> là câu trả lời cho mọi lúc không chắc.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'File <code>.config</code> có 200 dòng, con trỏ đang ở dòng 1. Bạn gõ ' +
         '<code>:s/=y/=m/</code> rồi <kbd>Enter</kbd>. Chuyện gì xảy ra?',
      opts: [
        'Mọi chuỗi <code>=y</code> trong cả file đổi thành <code>=m</code>.',
        'Chỉ lần xuất hiện <b>đầu tiên trên dòng 1</b> đổi thành <code>=m</code>; 199 dòng còn lại ' +
          'không đụng tới.',
        'Lệnh báo lỗi vì thiếu phạm vi.',
        'Lần xuất hiện đầu tiên tính từ con trỏ đổi, rồi vim hỏi có tiếp tục xuống các dòng sau không.'
      ],
      a: 1,
      why: 'Một lệnh Ex có dạng <code>:[phạm vi]lệnh</code>, và <b>phạm vi mặc định là dòng đang có con ' +
           'trỏ</b> — không phải cả file. Đây là quy ước từ thời <code>ed</code>, khi màn hình còn là ' +
           'giấy in và "dòng hiện tại" là khái niệm trung tâm.<br><br>' +
           'Ba khái niệm độc lập thường bị gộp làm một, tách cho rõ ngay bây giờ:<br>' +
           '• <b>không có phạm vi</b> → một dòng, dòng có con trỏ<br>' +
           '• <code>%</code> → mọi dòng trong file<br>' +
           '• <code>/g</code> ở cuối → trong <i>mỗi</i> dòng được xử lý, thay <b>mọi</b> lần xuất hiện ' +
           'thay vì chỉ lần đầu<br><br>' +
           'Nên <code>:%s/=y/=m/</code> quét cả file nhưng mỗi dòng chỉ thay một lần, còn ' +
           '<code>:%s/=y/=m/g</code> mới là "thay tất cả, ở khắp nơi". Điều làm câu này nguy hiểm là ' +
           '<b>không có lỗi nào được báo</b>: vim ghi "1 substitution on 1 line" bằng chữ nhỏ ở đáy màn ' +
           'hình, bạn lưu, và tưởng đã xong. Câu B2 cho bạn xem hai file kết quả đặt cạnh nhau.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"<code>:q!</code> là lệnh nguy hiểm nhất trong vim vì nó vứt bỏ nội dung file — ' +
         'gõ nhầm thì file trên đĩa hỏng hoặc rỗng. Người mới nên tránh, chỉ dùng <code>:wq</code> cho ' +
         'chắc."</i>',
      a: 1,
      why: 'Sai, và sai theo hướng nguy hiểm: nó khuyên người mới tránh đúng cái nút cứu hộ.<br><br>' +
           'Dấu <code>!</code> ở đây không có nghĩa "xoá" hay "phá". Nó chỉ có nghĩa <b>"tôi biết, cứ ' +
           'làm đi"</b> — bỏ qua lời cảnh báo. Cảnh báo bị bỏ qua chính là dòng này, đã chụp trên máy ' +
           'bạn khi gõ <code>:q</code> lúc file đang sửa dở:<br>' +
           '<code>E37: No write since last change (add ! to override)</code><br><br>' +
           '<code>:q!</code> vứt bỏ <b>bản đang sửa trong bộ nhớ</b>, không chạm vào đĩa. File trên đĩa ' +
           'vẫn đúng như lần lưu gần nhất. Kiểm chứng thật: mở file, gõ thêm một ký tự, gõ ' +
           '<code>:q</code> → hiện <code>E37</code>; gõ tiếp <code>:q!</code> → thoát; ' +
           '<code>cat</code> file ra thì nội dung y như cũ.<br><br>' +
           'Lệnh đáng dè chừng là <b><code>:w!</code></b> — nó ghi đè bất chấp, kể cả lên file chỉ có ' +
           'quyền đọc. Trên máy bạn, <code>:w!</code> ghi đè thành công một file quyền <code>444</code> ' +
           'mà bạn sở hữu: <code>"ro.conf" 4L, 55B written</code>. Cùng một dấu chấm than, một bên vô ' +
           'hại, một bên đụng vào đĩa — nhớ theo <i>lệnh</i>, đừng nhớ theo <i>dấu</i>.',
      rw: 'Viết lại nhận định cho đúng: <code>:q!</code> thật sự vứt bỏ cái gì, nó không đụng tới cái ' +
          'gì, và lệnh nào mới là lệnh đáng dè chừng?',
      crit: [
        'Nói rõ :q! chỉ vứt bỏ những THAY ĐỔI CHƯA LƯU đang nằm trong bộ nhớ của phiên vim',
        'Nói rõ file trên đĩa hoàn toàn không suy suyển — nó vẫn đúng như lần lưu gần nhất',
        'Nêu được rằng vì thế :q! là đường thoát AN TOÀN khi bạn không rõ mình vừa gõ nhầm những gì',
        'Không lẫn với :w! (ghi đè bất chấp) hay :x/:wq (lưu rồi thoát)'
      ],
      sol: '<b>Bản viết lại:</b> <code>:q!</code> thoát khỏi vim và vứt bỏ <b>những thay đổi chưa lưu ' +
           'đang nằm trong bộ nhớ</b>. Nó không ghi gì lên đĩa cả, nên file trên đĩa vẫn nguyên vẹn ' +
           'đúng như lần lưu gần nhất. Dấu <code>!</code> chỉ có nghĩa "bỏ qua cảnh báo ' +
           '<code>E37</code>", không có nghĩa "xoá".<br><br>' +
           'Vì thế <code>:q!</code> là <b>đường thoát an toàn nhất</b> khi bạn lỡ gõ loạn trong chế độ ' +
           'Normal và không biết mình vừa làm hỏng những gì: thoát ra, mở lại, có nguyên file cũ. Lời ' +
           'khuyên "chỉ dùng <code>:wq</code> cho chắc" là lời khuyên ngược — <code>:wq</code> mới là ' +
           'lệnh ghi đống hỗn độn kia lên đĩa.<br><br>' +
           'Lệnh cần cẩn thận là <b><code>:w!</code></b>: nó ghi đè bất chấp, kể cả file chỉ có quyền ' +
           'đọc mà bạn sở hữu.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"<code>:x</code> và <code>:wq</code> hoàn toàn tương đương — cả hai đều lưu rồi ' +
         'thoát, nên chọn cái nào cũng như nhau."</i>',
      a: 1,
      why: 'Sai, và khác biệt này tốn tiền thật.<br><br>' +
           '<code>:wq</code> = "ghi rồi thoát", và nó <b>luôn</b> ghi. <code>:x</code> = "ghi <i>nếu có ' +
           'thay đổi</i> rồi thoát". Về nội dung file thì hai lệnh cho kết quả giống hệt nhau; khác ' +
           'biệt nằm ở <b>siêu dữ liệu</b>.<br><br>' +
           'Đo thật trên máy bạn — hai file giống hệt, cùng đặt mốc thời gian ' +
           '<code>2020-01-01</code>, mở ra rồi đóng ngay <b>không sửa gì</b>:<br>' +
           '<code>x.conf   2020-01-01 17:00</code>  ← đóng bằng <code>:x</code><br>' +
           '<code>wq.conf  2026-08-12 22:09</code>  ← đóng bằng <code>:wq</code><br><br>' +
           'Vì sao đáng quan tâm: <code>make</code> quyết định có biên dịch lại hay không bằng cách so ' +
           '<b>dấu thời gian</b> của mã nguồn với dấu thời gian của file đích — Bài 17 sẽ đi sâu vào ' +
           'cơ chế này. Mở một header của kernel ra xem rồi đóng bằng <code>:wq</code> có thể khiến ' +
           'hàng nghìn file phụ thuộc vào nó bị biên dịch lại, mất hàng chục phút, mà bạn không sửa một ' +
           'chữ nào.<br><br>' +
           'Thói quen đáng tập: <b>xem thì thoát bằng <code>:q</code>, sửa thì thoát bằng ' +
           '<code>:x</code></b>. Chỉ dùng <code>:wq</code> khi bạn thật sự muốn ép dấu thời gian mới — ' +
           'ví dụ để buộc <code>make</code> làm lại một bước.',
      rw: 'Viết lại nhận định cho đúng: hai lệnh khác nhau ở chỗ nào, và khác biệt đó ảnh hưởng tới cái ' +
          'gì ngoài vim?',
      crit: [
        'Nêu đúng khác biệt: :wq LUÔN ghi file, kể cả khi không sửa gì; :x chỉ ghi khi thật sự có thay đổi',
        'Nêu hệ quả cụ thể: mở rồi đóng bằng :wq làm DẤU THỜI GIAN của file nhảy lên hiện tại, :x thì không',
        'Nối được với một hậu quả thật: make/build quyết định biên dịch lại dựa trên dấu thời gian, nên :wq có thể kích hoạt build lại cả cây mà không có thay đổi nào',
        'Nói được rằng về NỘI DUNG thì hai lệnh cho kết quả giống nhau — khác biệt nằm ở siêu dữ liệu'
      ],
      sol: '<b>Bản viết lại:</b> hai lệnh cho ra <b>cùng một nội dung file</b>, nhưng không tương ' +
           'đương. <code>:wq</code> luôn ghi, kể cả khi bạn không sửa gì; <code>:x</code> chỉ ghi khi ' +
           'thật sự có thay đổi. Hệ quả là <b>dấu thời gian</b>: mở rồi đóng bằng <code>:wq</code> làm ' +
           'file "trẻ lại", đóng bằng <code>:x</code> thì không.<br><br>' +
           'Khác biệt đó tràn ra ngoài vim vì <code>make</code> và mọi hệ thống build đều dựa vào dấu ' +
           'thời gian để quyết định phải biên dịch lại cái gì. Một lần <code>:wq</code> vô ý trên một ' +
           'header dùng chung có thể kéo theo hàng nghìn file phải biên dịch lại.<br><br>' +
           '<b>Quy tắc gọn:</b> xem thì <code>:q</code>, sửa thì <code>:x</code>, và chỉ dùng ' +
           '<code>:wq</code> khi bạn <i>cố ý</i> muốn ép một dấu thời gian mới.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Con trỏ đang ở đầu dòng <code>one two three four five</code>. Bạn muốn xoá <b>ba từ</b> kể từ ' +
         'con trỏ, để còn lại <code>four five</code>. Gõ chuỗi phím nào (ở chế độ Normal)?',
      ph: 'ví dụ: dd',
      a: ['3dw', 'd3w'],
      why: 'Cả <b><code>3dw</code></b> và <b><code>d3w</code></b> đều đúng, và đã kiểm chứng trên máy ' +
           'bạn: hai file giống hệt nhau, gõ hai chuỗi phím ấy, kết quả đều là ' +
           '<code>four five</code>.<br><br>' +
           'Hai cách đọc dẫn tới cùng một chỗ:<br>' +
           '• <code>3dw</code> = "làm ba lần cái việc <code>dw</code>"<br>' +
           '• <code>d3w</code> = "xoá cái vùng <code>3w</code>", tức xoá tới chỗ mà ba lần nhấn ' +
           '<code>w</code> sẽ đưa con trỏ tới<br><br>' +
           'Đây chính là điều làm ngữ pháp của vim đáng học: nó là <b>toán tử + phạm vi</b>, không phải ' +
           'một danh sách phím tắt phải thuộc lòng. Biết <code>d</code> (xoá), <code>c</code> (thay), ' +
           '<code>y</code> (chép) và biết <code>w</code> (một từ), <code>$</code> (tới cuối dòng), ' +
           '<code>G</code> (tới cuối file) là bạn tự ghép ra được cả chục lệnh chưa ai dạy: ' +
           '<code>d$</code>, <code>c2w</code>, <code>y3w</code>, <code>dG</code>.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi lệnh Ex với việc nó làm. Chú ý hai cặp dễ lẫn: một lệnh vứt bỏ thay đổi rồi ' +
         '<b>thoát</b>, một lệnh vứt bỏ thay đổi mà <b>ở lại</b>.',
      left: [
        '<code>:w</code>',
        '<code>:q!</code>',
        '<code>:%s/=y/=m/g</code>',
        '<code>:g/=n/d</code>',
        '<code>:set number</code>',
        '<code>:e!</code>'
      ],
      right: [
        'Xoá mọi dòng có chứa mẫu đã cho',
        'Lưu lại mà vẫn ở nguyên trong file, không thoát',
        'Nạp lại file từ đĩa, vứt bỏ mọi thay đổi chưa lưu, <b>vẫn ở trong vim</b>',
        'Hiện số dòng ở lề trái — chỉ đổi cách hiển thị, không đổi một byte nào của file',
        'Thoát ngay, vứt bỏ mọi thay đổi chưa lưu; file trên đĩa không suy suyển',
        'Thay mọi lần xuất hiện, trên mọi dòng của file'
      ],
      a: [1, 4, 5, 0, 3, 2],
      why: 'Hai cặp là chỗ toàn bộ giá trị của câu này nằm ở đó.<br><br>' +
           '<b>Cặp thứ nhất — <code>:q!</code> so với <code>:e!</code>.</b> Cả hai đều vứt bỏ thay đổi ' +
           'chưa lưu, khác nhau ở chỗ bạn đứng lại đâu: <code>:q!</code> đưa bạn ra dòng lệnh, ' +
           '<code>:e!</code> giữ bạn trong vim với nội dung sạch vừa đọc lại từ đĩa. Khi đang sửa dở ' +
           'một file cấu hình và muốn làm lại từ đầu, <code>:e!</code> tiết kiệm cho bạn một lần mở ' +
           'file.<br><br>' +
           '<b>Cặp thứ hai — <code>:%s/…/…/g</code> so với <code>:g/…/d</code>.</b> Chữ ' +
           '<code>g</code> xuất hiện ở cả hai và mang <b>hai nghĩa hoàn toàn khác nhau</b>. Ở cuối ' +
           'lệnh <code>s</code>, <code>g</code> là cờ "mọi lần xuất hiện trong dòng". Đứng đầu như ' +
           '<code>:g/mẫu/lệnh</code>, <code>g</code> là <i>global</i> — "tìm mọi dòng khớp mẫu rồi ' +
           'chạy lệnh trên chúng". Đây là một trong những chỗ đặt tên tệ nhất của vim, và biết trước ' +
           'thì đỡ mất một buổi chiều.<br><br>' +
           '<code>:set number</code> nằm đây để nhắc một ranh giới khác: có những lệnh Ex chỉ đổi ' +
           '<b>cách hiển thị</b> chứ không đổi file — nên gõ chúng rồi thoát bằng <code>:q</code> vẫn ' +
           'là thoát sạch, vim không hỏi gì cả.' }
  ],

  /* ══════════════════ B · THÔNG HIỂU ══════════════════ */
  B: [

    { id: 'b1', k: 'multi', tag: 'Đọc output', truc: 0,
      q: 'Bài học đã cho bạn xem năm ký tự điều khiển của terminal. Dưới đây là bản <b>đầy đủ</b> của ' +
         '<code>stty -a</code> trên cùng máy đó — phần cuối liệt kê các <b>cờ</b> đang bật hay tắt ' +
         '(có dấu trừ đằng trước là tắt). Chọn <b>mọi</b> phát biểu đúng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn (đã lược bớt phần giữa)',
          nocopy: true, code:
            '$ stty -a\n' +
            'speed 38400 baud; rows 0; columns 0; line = 0;\n' +
            'intr = ^C; quit = ^\\; erase = ^?; kill = ^U; eof = ^D;\n' +
            'start = ^Q; stop = ^S; susp = ^Z; rprnt = ^R; werase = ^W;\n' +
            'min = 1; time = 0;\n' +
            '...\n' +
            '-inlcr -igncr icrnl -ixoff -tandem ixon -ixany -imaxbel -iutf8\n' +
            'opost -olcuc -ocrnl onlcr -onocr -onlret -ofdel\n' +
            '...\n' +
            'isig icanon iexten echo echoe echok -echonl -noflsh -tostop\n' +
            '\n' +
            '$ stty -ixon        # tat co do di\n' +
            '$ stty -a | tr \' ;\' \'\\n\\n\' | grep -x -- \'-\\?ixon\'\n' +
            '-ixon\n' +
            '\n' +
            '$ # mo mot cua so terminal moi roi hoi lai:\n' +
            '$ stty -a | tr \' ;\' \'\\n\\n\' | grep -x -- \'-\\?ixon\'\n' +
            'ixon' }
      ],
      opts: [
        'Cờ <code>ixon</code> đang <b>bật</b>, và đó chính là cờ khiến <code>^S</code> ngừng hiển thị, ' +
          '<code>^Q</code> cho chạy tiếp.',
        'Vì <code>ixon</code> nằm trong cấu hình của <b>terminal</b> chứ không phải của chương trình, ' +
          'nên nano, vim, <code>cat</code> hay bất cứ thứ gì đang chạy đều bị y như nhau.',
        '<code>stty -ixon</code> tắt hẳn cơ chế đó, nên sau lệnh này <kbd>Ctrl</kbd>+<kbd>S</kbd> ' +
          'không còn làm đứng màn hình nữa.',
        'Thay đổi do <code>stty -ixon</code> tạo ra chỉ sống trong <b>phiên terminal hiện tại</b>; mở ' +
          'cửa sổ mới thì cờ lại trở về <code>ixon</code>.',
        'Cờ <code>echo</code> đang bật là lý do bạn nhìn thấy chữ mình gõ; chính terminal in lại chúng ' +
          'chứ không phải chương trình.',
        '<code>-ixoff</code> có dấu trừ nên nó đang bật, và đó mới là cờ gây ra hiện tượng treo màn ' +
          'hình.'
      ],
      a: [0, 1, 2, 3, 4],
      why: 'Năm ý đầu đều đúng; ý cuối sai ở chỗ đọc dấu.<br><br>' +
           '<b>Quy ước đọc:</b> trong <code>stty -a</code>, tên cờ đứng trần là <b>bật</b>, có dấu trừ ' +
           'đằng trước là <b>tắt</b>. Vậy <code>ixon</code> bật, <code>-ixoff</code> <b>tắt</b>. Ý ' +
           'cuối đọc ngược, và còn nhầm luôn vai trò: <code>ixon</code> là "nghe theo ' +
           '<code>^S</code>/<code>^Q</code> đến từ <i>bàn phím</i>", còn <code>ixoff</code> là "tự ' +
           '<i>gửi</i> <code>^S</code>/<code>^Q</code> ra ngoài để bảo thiết bị đầu kia chậm lại" — ' +
           'thứ chỉ có ý nghĩa trên đường nối tiếp thật.<br><br>' +
           '<b>Ý số 2 là ý quan trọng nhất của cả câu.</b> Cấu hình này thuộc về <i>terminal</i>, một ' +
           'lớp nằm trong nhân, đứng giữa bàn phím và mọi tiến trình. Chương trình không hề nhận được ' +
           'ký tự <code>^S</code> và không có cách nào biết nó vừa xảy ra. Vì thế câu hỏi "trình soạn ' +
           'thảo nào không bị lỗi này" là câu hỏi sai — không có trình soạn thảo nào tránh được, vì ' +
           'không phải lỗi của chúng.<br><br>' +
           '<b>Ý số 5</b> mở ra một chuyện lớn hơn: cờ <code>echo</code> bật nghĩa là <i>terminal</i> ' +
           'in lại phím bạn gõ, không phải chương trình. Tắt nó đi (<code>stty -echo</code>) thì bạn ' +
           'gõ mà không thấy gì — đúng cơ chế mà lệnh nhập mật khẩu dùng.<br><br>' +
           '<b>Ý số 4</b> là chỗ dễ mất thì giờ: <code>stty</code> đặt thuộc tính cho <i>một</i> ' +
           'terminal đang mở, không ghi vào file cấu hình nào. Muốn tắt vĩnh viễn thì thêm ' +
           '<code>stty -ixon</code> vào <code>~/.bashrc</code>.<br><br>' +
           '<b>Đáng thử ngay:</b> chạy <code>stty -ixon</code> một lần, rồi bấm ' +
           '<kbd>Ctrl</kbd>+<kbd>S</kbd> trong nano. Không có gì xảy ra nữa. Đó là bằng chứng trực ' +
           'tiếp nhất rằng thủ phạm chưa bao giờ là nano.' },

    { id: 'b2', k: 'multi', tag: 'Đọc output', truc: 2,
      q: 'Cùng một file đầu vào, cùng một mẫu thay thế, ba lệnh khác nhau. Đọc ba kết quả thật dưới ' +
         'đây rồi chọn <b>mọi</b> kết luận đúng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '# file goc, con tro o dong 1:\n' +
            'CONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '--- sau  :s/=y/=m/\n' +
            'CONFIG_UART=m\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '--- sau  :%s/=y/=m/\n' +
            'CONFIG_UART=m\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=m\n' +
            'CONFIG_DEBUG=m\n' +
            '\n' +
            '--- mot file khac, chi mot dong, hai lan xuat hien tren cung dong:\n' +
            'CONFIG_A=y CONFIG_B=y\n' +
            'sau  :%s/=y/=m/   ->  CONFIG_A=m CONFIG_B=y\n' +
            'sau  :%s/=y/=m/g  ->  CONFIG_A=m CONFIG_B=m' }
      ],
      opts: [
        'Không viết phạm vi thì lệnh chỉ tác động lên <b>dòng đang có con trỏ</b>.',
        '<code>%</code> là phạm vi "toàn bộ file", nên <code>:%s</code> quét mọi dòng.',
        'Cờ <code>g</code> nghĩa là "thay ở mọi <b>dòng</b>" — đó là lý do <code>:%s/=y/=m/</code> bỏ ' +
          'sót một số dòng.',
        'Cờ <code>g</code> nghĩa là "trong mỗi dòng được xử lý, thay <b>mọi</b> lần xuất hiện thay vì ' +
          'chỉ lần đầu" — nên nó chỉ tạo khác biệt khi một dòng có từ hai lần xuất hiện trở lên.',
        'Cả ba lệnh đều chạy thành công và không lệnh nào báo lỗi; muốn biết chúng làm được bao nhiêu ' +
          'thì phải tự kiểm tra.',
        'Với file bốn dòng ở trên, <code>:%s/=y/=m/</code> và <code>:%s/=y/=m/g</code> cho ra kết quả ' +
          'giống hệt nhau.'
      ],
      a: [0, 1, 3, 4, 5],
      why: 'Chỉ ý số 3 sai, và nó là hiểu nhầm phổ biến nhất về lệnh <code>s</code>.<br><br>' +
           '<b>Ba khái niệm độc lập, đừng gộp:</b><br>' +
           '• <b>Phạm vi</b> (viết trước chữ <code>s</code>): không viết = dòng hiện tại, ' +
           '<code>%</code> = cả file, <code>1,10</code> = từ dòng 1 tới dòng 10, ' +
           '<code>.,$</code> = từ dòng hiện tại tới cuối.<br>' +
           '• <b>Cờ <code>g</code></b> (viết sau dấu gạch chéo cuối): trong mỗi dòng <i>được xử ' +
           'lý</i>, thay mọi lần xuất hiện.<br>' +
           '• <b>Chữ <code>g</code> đứng đầu</b> như <code>:g/mẫu/d</code>: hoàn toàn khác, là lệnh ' +
           '<i>global</i>, xem câu E1.<br><br>' +
           '<b>Vì sao ý 6 đúng:</b> trong file bốn dòng ấy, mỗi dòng chỉ có một chuỗi <code>=y</code>, ' +
           'nên "thay lần đầu" và "thay mọi lần" cho cùng kết quả. Đây chính là cái bẫy: bạn tập với ' +
           'file kiểu này, thấy <code>g</code> chẳng thay đổi gì, rồi kết luận sai về ý nghĩa của nó. ' +
           'Phải có file như <code>CONFIG_A=y CONFIG_B=y</code> — hai lần xuất hiện trên <i>một</i> ' +
           'dòng — thì <code>g</code> mới lộ mặt.<br><br>' +
           '<b>Ý 5 là ý đắt nhất.</b> Không có lỗi nào cả. Vim ghi <code>1 substitution on 1 line</code> ' +
           'bằng chữ nhỏ ở đáy màn hình rồi thôi. Bạn lưu, đóng, và tin rằng đã sửa xong hai trăm ' +
           'dòng. Thói quen tự vệ: sau mỗi lần thay thế hàng loạt, gõ ngay ' +
           '<code>:%s/=m//gn</code> — cờ <code>n</code> nghĩa là "chỉ đếm, đừng thay" — để vim báo lại ' +
           'số dòng thật sự khớp.' },

    { id: 'b3', k: 'free', tag: 'Giải thích vì sao', truc: 1,
      q: 'Người học mở file cấu hình, gõ đúng từng chữ <code>CONFIG_SPI=y</code>, rồi lưu. Kết quả thật ' +
         'ở dưới. Hãy giải thích <b>từng phím một</b>: vì sao dòng đầu bị mất chữ <code>C</code>, vì ' +
         'sao nội dung cũ của dòng biến mất, và vì sao chuyện này <b>không thể</b> xảy ra trong nano.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '# file truoc khi mo:\n' +
            'CONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '# mo bang vim, KHONG bam i, go thang  C O N F I G _ S P I = y  roi :wq!\n' +
            'ONFIG_SPI=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '# cung file goc, lan nay go  c o n f i g   s p i  (chu thuong) roi :wq!\n' +
            'piONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '# cung file goc, bam i TRUOC roi go  CONFIG_SPI=y  roi Esc :wq!\n' +
            'CONFIG_SPI=yCONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y' }
      ],
      rows: 8,
      crit: [
        'Nêu được rằng vim mở file ở chế độ Normal, nên mọi phím đầu tiên là LỆNH chứ không phải chữ',
        'Giải thích đúng phím C: chữ C viết hoa là lệnh "xoá từ con trỏ tới hết dòng rồi vào chế độ Insert"',
        'Rút ra kết luận: chính vì C là lệnh nên nó không xuất hiện trong file, và nội dung cũ của dòng bị nó xoá',
        'Giải thích được rằng các phím còn lại (ONFIG_SPI=y) đã ở trong chế độ Insert nên trở thành chữ bình thường',
        'Giải thích ca chữ thường: c, o, n, f, i, g... là chuỗi lệnh khác, kết thúc bằng việc vào Insert nên chỉ còn pi được ghi ra — không cần đúng từng phím, chỉ cần nêu rằng chúng cũng là lệnh và cho kết quả khác hẳn',
        'Giải thích ca thứ ba: bấm i trước thì mọi phím thành chữ, chèn tại vị trí con trỏ nên dính vào đầu dòng cũ',
        'Nêu được vì sao nano không thể bị: nano không có chế độ, phím luôn là chữ, mọi lệnh đều phải kèm Ctrl'
      ],
      sol: 'Toàn bộ chuyện này gói trong một câu: <b>vim mở file ở chế độ Normal, nên phím đầu tiên bạn ' +
           'gõ là một lệnh.</b><br><br>' +
           '<b>Ca 1 — <code>ONFIG_SPI=y</code>.</b> Phím <code>C</code> viết hoa ở chế độ Normal là ' +
           'lệnh "<i>change to end of line</i>": xoá từ con trỏ tới hết dòng, rồi tự chuyển sang chế độ ' +
           'Insert. Nên nó <b>không xuất hiện</b> trong file (nó là lệnh, không phải chữ), và nội dung ' +
           'cũ <code>CONFIG_UART=y</code> bị chính nó xoá mất. Mười một phím còn lại lúc này đã ở trong ' +
           'chế độ Insert nên được ghi ra bình thường: <code>ONFIG_SPI=y</code>. Đúng một phím sai, ' +
           'mất trọn một dòng cấu hình.<br><br>' +
           '<b>Ca 2 — <code>piONFIG_UART=y</code>.</b> Chữ thường cho một chuỗi lệnh khác hẳn: ' +
           '<code>c</code> là toán tử "thay", nó chờ một phạm vi; các phím tiếp theo bị nuốt dần làm ' +
           'phạm vi và làm lệnh; tới lúc rơi vào chế độ Insert thì chỉ còn <code>p</code> và ' +
           '<code>i</code> được ghi ra, dính vào đầu dòng cũ. Bạn <b>không cần</b> giải thích được ' +
           'từng phím — điều đáng nhớ là hai chuỗi phím chỉ khác nhau ở chữ hoa/thường lại cho hai kết ' +
           'quả không liên quan gì nhau.<br><br>' +
           '<b>Ca 3 — <code>CONFIG_SPI=yCONFIG_UART=y</code>.</b> Bấm <code>i</code> trước thì mọi phím ' +
           'đều là chữ, được <i>chèn</i> tại vị trí con trỏ (đầu dòng 1), nên dòng mới dính liền vào ' +
           'dòng cũ. Không mất gì, nhưng vẫn chưa đúng ý — muốn thêm một dòng mới thì dùng ' +
           '<code>o</code> (mở dòng dưới) hoặc <code>O</code> (mở dòng trên).<br><br>' +
           '<b>Vì sao nano miễn nhiễm:</b> nano <b>không có chế độ</b>. Phím luôn là chữ, còn mọi lệnh ' +
           'đều phải giữ <kbd>Ctrl</kbd> — <code>^O</code> để ghi, <code>^X</code> để thoát. Không có ' +
           'trạng thái ẩn nào để mà ở nhầm. Đó là toàn bộ lý do nano dễ, và cũng là toàn bộ lý do nó ' +
           'chậm hơn khi đã quen tay: bạn không bao giờ có cả bàn phím làm phím lệnh.<br><br>' +
           '<b>Thói quen tự vệ, tập ngay hôm nay:</b> mỗi khi không chắc mình đang ở chế độ nào, bấm ' +
           '<kbd>Esc</kbd> vài lần. Từ Normal thì <kbd>Esc</kbd> vô hại; từ bất kỳ chế độ nào khác thì ' +
           'nó đưa bạn về Normal. Và nếu file đã bị băm nát: <code>:e!</code> để đọc lại từ đĩa, hoặc ' +
           '<code>:q!</code> để thoát — cả hai đều không đụng tới file trên đĩa.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp',
      q: 'nano và vim, cùng một việc: sửa file cấu hình. Trong <b>bốn</b> khác biệt dưới đây, hãy chỉ ra ' +
         '<b>khác biệt nào là khác biệt quan trọng</b> đối với một kỹ sư nhúng, và bảo vệ lựa chọn đó. ' +
         'Ba khác biệt còn lại vì sao không quan trọng bằng?<br>' +
         '(a) nano hiện sẵn phím tắt ở đáy màn hình, vim không.<br>' +
         '(b) vim có chế độ, nano không.<br>' +
         '(c) vim hỗ trợ tô màu cú pháp phong phú hơn.<br>' +
         '(d) <code>vi</code> gần như luôn có mặt trên rootfs nhúng, nano thì không.',
      rows: 7,
      crit: [
        'Chọn (d) là khác biệt quan trọng nhất và nói rõ vì sao: trên board không có gì để cài thêm, nên biết công cụ nào có mặt quyết định bạn làm được việc hay không',
        'Nhìn nhận (b) là quan trọng thứ hai, nhưng vì nó là CÁI GIÁ phải trả để dùng được (d) chứ không phải một ưu điểm tự thân',
        'Loại (a) đúng lý do: nó chỉ ảnh hưởng tới nửa giờ đầu học, sau đó không còn nghĩa gì',
        'Loại (c) đúng lý do: tô màu là tiện nghi, và trên console nối tiếp của board thì thường không dùng được hoặc không cần',
        'Kết luận thực dụng: dùng nano ở đâu có nano, nhưng BẮT BUỘC biết đủ vi để mở, sửa, lưu, thoát',
        'Không kết luận kiểu "vim mạnh hơn nên tốt hơn" — đó là so sánh sai trục'
      ],
      sol: '<b>Khác biệt quan trọng là (d): tính sẵn có.</b> Mọi khác biệt khác chỉ có nghĩa khi bạn ' +
           '<i>được chọn</i> — mà trên một board vừa nạp rootfs, bạn không được chọn. Có gì trong ảnh ' +
           'thì dùng nấy, không mạng, không <code>apt</code>. Một công cụ tuyệt vời mà không có mặt thì ' +
           'giá trị của nó bằng không.<br><br>' +
           '<b>(b) quan trọng thứ hai, nhưng đúng vai của nó:</b> chế độ không phải ưu điểm bạn tìm ' +
           'đến, mà là <b>cái giá</b> phải trả để dùng được thứ luôn có mặt. Đó là lý do nó xứng đáng ' +
           'chiếm ba câu trong bộ bài tập này — không phải vì nó hay, mà vì hiểu sai nó thì bạn phá ' +
           'file trên một thiết bị không có bản sao lưu.<br><br>' +
           '<b>(a) — phím tắt hiện sẵn:</b> ảnh hưởng đúng nửa giờ đầu tiên trong đời. Sau đó bạn thuộc ' +
           'sáu phím của vim và nó không còn nghĩa gì. Đừng để một ưu điểm chỉ có giá trị trong ngày ' +
           'đầu quyết định việc bạn học công cụ nào.<br><br>' +
           '<b>(c) — tô màu:</b> tiện nghi thuần tuý, và trên console nối tiếp của board thì thường ' +
           'không dùng được. Đáng nói thêm: trên máy bạn, <code>/usr/share/vim</code> nặng ' +
           '<b>45 MB</b> — phần lớn là file cú pháp và tài liệu. Đó chính là thứ bị cắt bỏ đầu tiên ' +
           'khi người ta đóng gói một bản <code>vi</code> cho hệ nhúng.<br><br>' +
           '<b>Kết luận thực dụng:</b> ở đâu có nano thì cứ dùng nano, không việc gì phải khổ hạnh. ' +
           'Nhưng phải biết đủ <code>vi</code> để mở, sửa, lưu, thoát <b>mà không cần tra cứu</b> — vì ' +
           'lúc cần tới nó, thường là lúc bạn không có Internet để tra.<br><br>' +
           '<b>Bẫy của câu này:</b> nếu bạn kết luận "vim mạnh hơn nên tốt hơn", bạn đã so sai trục. ' +
           'Câu hỏi không phải cái nào tốt hơn, mà là cái nào <i>có mặt</i>.' },

    { id: 'b5', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ của nhóm:<br>' +
         '<i>"Không cần học vim làm gì cho mệt. Board nào cũng có thể ' +
         '<code>apt install nano</code> trong năm giây. Còn nếu lỡ mở nhầm vim và không thoát ra được ' +
         'thì cứ đóng cửa sổ terminal đi, mở lại là xong — file vẫn nguyên vì mình chưa lưu."</i><br>' +
         'Có <b>ba</b> chỗ sai. Chỉ ra từng chỗ và nói hậu quả cụ thể của nó.',
      rows: 8,
      crit: [
        'Sai 1: rootfs nhúng thường KHÔNG có trình quản lý gói, không có kho phần mềm, và nhiều khi không có mạng — apt install là giả định của máy để bàn',
        'Sai 1 (bổ sung): kể cả có apt thì flash của board thường chỉ vài MB đến vài chục MB, không đủ chỗ cho một gói mới',
        'Sai 2: đóng cửa sổ terminal KHÔNG phải cách thoát sạch — nó giết tiến trình vim và để lại file .swp',
        'Sai 2 (hậu quả): lần mở file sau sẽ hiện màn hình E325 ATTENTION và người sau sẽ hoang mang, chưa kể file .swp chiếm chỗ trong rootfs chỉ đọc/nhỏ hẹp',
        'Sai 3: "file vẫn nguyên vì chưa lưu" chỉ đúng với file trên đĩa, nhưng bỏ qua mất rằng có thể vim ĐÃ tự lưu nếu người dùng vô tình gõ :w, và bỏ qua hoàn toàn phần việc đang làm dở bị mất',
        'Nêu được cách đúng: :q! để thoát và vứt thay đổi, hoặc :x để lưu rồi thoát — hai giây, không để lại rác'
      ],
      sol: '<b>Sai thứ nhất — "board nào cũng <code>apt install</code> được".</b> Đây là giả định của ' +
           'máy để bàn đem áp vào hệ nhúng. Một rootfs do bạn tự dựng ở Chặng 09 sẽ ' +
           '<b>không có <code>apt</code></b>, không có kho phần mềm nào để trỏ tới, và nhiều khi không ' +
           'có cả mạng. Kể cả khi có: bộ nhớ flash của board thường chỉ vài MB tới vài chục MB, được ' +
           'tính toán vừa khít — không có chỗ trống cho một gói mới. Nói cách khác, câu ấy đúng trên ' +
           'Raspberry Pi cắm mạng và sai trên gần như mọi thiết bị thật.<br><br>' +
           '<b>Sai thứ hai — "đóng cửa sổ terminal là xong".</b> Đóng cửa sổ giết tiến trình vim giữa ' +
           'chừng, và vim <b>để lại file <code>.swp</code></b>. Đo trên máy bạn: giết vim bằng ' +
           '<code>kill -9</code>, file <code>.swap.conf.swp</code> nặng <b>4096 byte</b> vẫn nằm đó. ' +
           'Hậu quả: người mở file sau — có thể là chính bạn tuần sau — gặp nguyên màn hình ' +
           '<code>E325: ATTENTION</code> và không biết nên chọn gì. Trên một rootfs chỉ đọc hoặc chật ' +
           'chội thì còn phiền hơn nữa.<br><br>' +
           '<b>Sai thứ ba — "file vẫn nguyên vì mình chưa lưu".</b> Đúng về file trên đĩa, nhưng lập ' +
           'luận thì hỏng. Trong lúc loay hoay tìm cách thoát, người ta gõ đủ thứ, và một phím ' +
           '<code>:w</code> vô tình là đã ghi cái mớ hỗn độn kia lên đĩa thật. Câu ấy dạy người đọc ' +
           'trông chờ vào may mắn thay vì dạy họ một lệnh dài ba ký tự.<br><br>' +
           '<b>Cách đúng, và nó rẻ hơn cách sai:</b> <kbd>Esc</kbd> rồi <code>:q!</code> nếu muốn vứt ' +
           'thay đổi, <code>:x</code> nếu muốn giữ. Hai giây, thoát sạch, không để lại rác. Bài học đã ' +
           'đặt "thoát khỏi vim" lên trước mọi thứ khác đúng vì lý do này.' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao',
      q: 'Trên máy bạn, gõ <code>vi</code> thì chạy ra vim, gõ <code>editor</code> thì chạy ra nano. ' +
         'Đọc chuỗi liên kết thật ở dưới rồi giải thích: vì sao lại phải qua <b>hai</b> chặng ' +
         '(<code>/usr/bin/vi</code> → <code>/etc/alternatives/vi</code> → file thật) thay vì trỏ thẳng ' +
         'một phát? Ai được lợi từ chặng ở giữa?',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l /usr/bin/vi /etc/alternatives/vi\n' +
            'lrwxrwxrwx 1 root root 20 Apr 14 20:13 /usr/bin/vi -> /etc/alternatives/vi\n' +
            'lrwxrwxrwx 1 root root 18 Apr 21 01:06 /etc/alternatives/vi -> /usr/bin/vim.basic\n' +
            '$ readlink -f /usr/bin/vi\n' +
            '/usr/bin/vim.basic\n' +
            '\n' +
            '$ ls -l /usr/bin/editor /etc/alternatives/editor\n' +
            'lrwxrwxrwx 1 root root 24 Apr 14 20:13 /usr/bin/editor -> /etc/alternatives/editor\n' +
            'lrwxrwxrwx 1 root root  9 Apr 21 01:06 /etc/alternatives/editor -> /bin/nano\n' +
            '$ readlink -f /usr/bin/editor\n' +
            '/usr/bin/nano' }
      ],
      rows: 7,
      crit: [
        'Nêu đúng vai của chặng một: /usr/bin/vi là cái tên ỔN ĐỊNH mà mọi script và mọi thói quen gõ vào — nó do gói phần mềm đặt và không đổi',
        'Nêu đúng vai của chặng hai: /etc/alternatives/vi là công tắc đổi được, cho phép đổi trình soạn thảo mặc định mà không phải sửa gói nào',
        'Giải thích được vì sao không trỏ thẳng: trỏ thẳng thì đổi lựa chọn phải sửa file thuộc quyền quản lý của gói, và lần cập nhật gói sau sẽ ghi đè mất',
        'Nhận ra cả hai chặng đều là liên kết MỀM (cột đầu là l) — ôn lại Bài 6',
        'Giải thích được vì sao readlink -f /usr/bin/editor ra /usr/bin/nano chứ không phải /bin/nano: /bin cũng là một liên kết mềm trỏ tới /usr/bin, và -f đi hết mọi tầng',
        'Nêu được lệnh để đổi lựa chọn: update-alternatives (không cần thuộc cú pháp)'
      ],
      sol: 'Hai chặng vì chúng làm hai việc khác nhau, và tách ra là đúng.<br><br>' +
           '<b>Chặng một, <code>/usr/bin/vi</code>: cái tên ổn định.</b> Đây là thứ POSIX hứa sẽ có, ' +
           'thứ mọi script và mọi ngón tay gõ vào. Nó do gói phần mềm tạo ra và không được đổi tuỳ ' +
           'tiện.<br><br>' +
           '<b>Chặng hai, <code>/etc/alternatives/vi</code>: cái công tắc.</b> Đây là chỗ người quản ' +
           'trị chuyển lựa chọn — sang <code>vim.tiny</code>, sang một bản <code>vi</code> khác — bằng ' +
           '<code>update-alternatives</code>, mà không đụng tới bất cứ file nào thuộc quyền quản lý ' +
           'của gói.<br><br>' +
           '<b>Vì sao không trỏ thẳng:</b> nếu <code>/usr/bin/vi</code> trỏ thẳng vào ' +
           '<code>vim.basic</code> thì muốn đổi lựa chọn bạn phải sửa chính cái liên kết do gói tạo ra ' +
           '— và <b>lần cập nhật gói sau sẽ ghi đè, xoá sạch lựa chọn của bạn</b>. Chặng giữa nằm ' +
           'trong <code>/etc</code>, tức là "cấu hình của máy này", đúng chỗ của nó: gói không đụng ' +
           'tới, nâng cấp không mất. Đây là một khuôn mẫu bạn sẽ gặp lại nhiều lần — <b>một lớp gián ' +
           'tiếp để tách "cái tên cố định" khỏi "lựa chọn thay đổi được"</b>.<br><br>' +
           '<b>Ôn Bài 6:</b> cả hai chặng đều là <b>liên kết mềm</b> — cột đầu là <code>l</code>, có ' +
           'mũi tên, kích thước bằng đúng độ dài chuỗi đường dẫn (20 và 18 byte). Liên kết cứng không ' +
           'làm được việc này: nó không vượt được ranh giới hệ thống file, và quan trọng hơn, nó không ' +
           'có khái niệm "trỏ lại chỗ khác".<br><br>' +
           '<b>Một chi tiết đáng để ý:</b> <code>readlink -f /usr/bin/editor</code> ra ' +
           '<code>/usr/bin/nano</code> chứ không phải <code>/bin/nano</code> như trong liên kết. Vì ' +
           '<code>/bin</code> bản thân nó cũng là một liên kết mềm trỏ tới <code>/usr/bin</code>, và ' +
           '<code>-f</code> đi hết mọi tầng cho tới file thật.' }
  ],

  /* ══════════════════ C · VẬN DỤNG ══════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Bạn nối cáp nối tiếp vào một board, mở terminal ở 115200 baud, và đang xem log kernel chạy ' +
         'ào ào. Bạn muốn đọc kỹ một dòng vừa trôi qua nên theo phản xạ bấm ' +
         '<kbd>Ctrl</kbd>+<kbd>S</kbd>. Màn hình đứng lại — đúng như mong muốn. Nhưng sau đó gõ gì ' +
         'cũng không hiện, <kbd>Enter</kbd> không có tác dụng, board như đã chết.<br><br>' +
         'Đồng nghiệp đứng cạnh nói: <i>"Kernel panic rồi, cắm lại nguồn đi."</i><br><br>' +
         'Hãy trả lời <b>ba</b> câu: (a) board có chết không, và bạn dựa vào đâu để khẳng định trước ' +
         'khi thử bất cứ điều gì? (b) gõ gì để mọi thứ trở lại? (c) nếu nghe lời đồng nghiệp mà cắm ' +
         'lại nguồn thì mất gì?',
      rows: 8,
      crit: [
        '(a) Khẳng định board KHÔNG chết: Ctrl+S chỉ tác động lên phần mềm terminal ở phía máy tính của bạn, ký tự đó không hề đi tới board',
        '(a) Nêu được lập luận độc lập: nếu thật sự panic thì kernel sẽ IN RA thông báo panic rồi mới đứng, còn ở đây màn hình đứng im ngay giữa chừng, không có thông báo nào',
        '(b) Gõ Ctrl+Q — và mọi thứ bị dồn lại trong lúc đó sẽ ùa ra một lượt',
        '(c) Mất toàn bộ log của lần boot đó, mà đó thường chính là thứ đang cần đọc',
        '(c) Nêu thêm: khởi động lại có thể làm biến mất luôn hiện tượng đang muốn bắt, nhất là lỗi chỉ thỉnh thoảng xảy ra',
        'Nêu được biện pháp phòng ngừa: stty -ixon để tắt hẳn, hoặc ghi log ra file thay vì dừng màn hình'
      ],
      sol: '<b>(a) Board không chết, và bạn biết được điều đó mà không cần thử gì cả.</b><br>' +
           'Hai lập luận độc lập, cả hai đều dùng được ngay tại chỗ:<br>' +
           '• <kbd>Ctrl</kbd>+<kbd>S</kbd> bị nuốt bởi <b>trình điều khiển terminal trên máy tính của ' +
           'bạn</b>. Ký tự ấy không bao giờ được gửi xuống dây, board không hề nhận được gì. Một hành ' +
           'động chỉ xảy ra ở đầu này thì không thể làm chết đầu kia.<br>' +
           '• Kernel panic <b>tự báo</b>: nó in <code>Kernel panic - not syncing: …</code> kèm cả ' +
           'ngăn xếp lệnh gọi rồi mới đứng. Ở đây màn hình dừng im lặng, giữa chừng một dòng, không ' +
           'một chữ nào — đó là dấu hiệu của luồng hiển thị bị chặn, không phải của một hệ thống ' +
           'chết.<br><br>' +
           '<b>(b) Bấm <kbd>Ctrl</kbd>+<kbd>Q</kbd>.</b> Mọi thứ dồn lại trong lúc đứng hình sẽ ùa ra ' +
           'một lượt — và chính "ùa ra một lượt" là bằng chứng cuối cùng: nếu board đã chết thì làm gì ' +
           'còn dữ liệu nào để dồn.<br><br>' +
           '<b>(c) Cắm lại nguồn thì mất đúng thứ bạn đang cần.</b> Toàn bộ log của lần boot ấy biến ' +
           'mất — không cuộn lên xem lại được, vì cổng nối tiếp không có lịch sử, chỉ có cái gì đã ' +
           'trôi qua màn hình. Tệ hơn với loại lỗi mười lần mới xảy ra một: bạn vừa vứt đi lần duy ' +
           'nhất bắt được nó, và có thể phải chờ cả buổi để gặp lại.<br><br>' +
           '<b>Đây là lý do trục này đáng ba câu.</b> Cùng một hiểu nhầm — "màn hình đứng nghĩa là ' +
           'chương trình chết" — ở Bài 7 chỉ làm bạn mất một file đang sửa dở; trước một board thật ' +
           'thì nó làm bạn mất bằng chứng và mất cả buổi.<br><br>' +
           '<b>Phòng ngừa, làm một lần dùng mãi:</b> thêm <code>stty -ixon</code> vào ' +
           '<code>~/.bashrc</code> để phím ấy không còn tác dụng. Và nếu cần đọc kỹ log thì đừng dừng ' +
           'màn hình — ghi thẳng ra file (<code>tee</code>, hoặc chức năng ghi log của phần mềm ' +
           'terminal) rồi đọc thong thả bằng <code>less</code> như Bài 6 đã dạy.' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 2,
      q: 'Nhóm bạn có <b>40</b> file cấu hình board, mỗi file 200 dòng. Cần đổi mọi ' +
         '<code>CONFIG_DEBUG=y</code> thành <code>CONFIG_DEBUG=n</code>. Một bạn viết vòng lặp dưới ' +
         'đây, chạy xong không lỗi, mã thoát 0, và báo cáo "đã xong". Hôm sau build ra ảnh vẫn đầy log ' +
         'gỡ lỗi.<br><br>' +
         'Hãy trả lời: (a) lệnh sai ở đâu; (b) vì sao <b>không có lỗi nào</b> được báo; (c) viết lại ' +
         'cho đúng; (d) thêm một bước kiểm chứng để lần sau không phải chờ tới lúc build mới biết.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'lệnh của bạn đồng nghiệp', code:
            'for f in configs/*.conf; do\n' +
            '  vim -Es -c \'s/CONFIG_DEBUG=y/CONFIG_DEBUG=n/\' -c \'wq\' "$f"\n' +
            'done\n' +
            'echo "exit code: $?"' }
      ],
      rows: 8,
      crit: [
        '(a) Thiếu phạm vi % — lệnh chỉ tác động lên dòng đang có con trỏ, tức dòng 1 của mỗi file',
        '(a) Nêu hệ quả cụ thể: 40 file đều được ghi lại, nhưng gần như không file nào được sửa, vì CONFIG_DEBUG hầu như không nằm ở dòng 1',
        '(b) Không có lỗi vì lệnh đã làm ĐÚNG những gì được yêu cầu; "không tìm thấy mẫu trên dòng đó" không phải lỗi cú pháp',
        '(b) Nêu thêm: -Es chạy im lặng nên cả dòng thông báo số thay thế cũng không thấy',
        '(c) Viết lại có % ở đầu: vim -Es -c \"%s/CONFIG_DEBUG=y/CONFIG_DEBUG=n/g\" -c wq \"$f\"',
        '(d) Kiểm chứng bằng cách ĐẾM sau khi chạy, ví dụ grep -c hoặc grep -l trên cả thư mục, và so với con số mong đợi'
      ],
      sol: '<b>(a) Thiếu đúng một ký tự: <code>%</code>.</b> Không có phạm vi thì lệnh chỉ tác động lên ' +
           '<b>dòng đang có con trỏ</b> — và khi vim vừa mở file, con trỏ ở dòng 1. Trong một file cấu ' +
           'hình 200 dòng, xác suất <code>CONFIG_DEBUG</code> nằm đúng ở dòng 1 gần bằng không. Kết ' +
           'quả: 40 file đều được mở, đều được ghi lại, và gần như không file nào thay đổi nội ' +
           'dung.<br><br>' +
           '<b>(b) Không có lỗi, vì không có gì sai cả — theo cách hiểu của máy.</b> Lệnh cú pháp ' +
           'đúng, phạm vi hợp lệ, việc "trên dòng này không có mẫu cần tìm" là một kết quả bình ' +
           'thường chứ không phải một lỗi. Vim vẫn ghi file, vẫn thoát, vẫn trả mã 0. Thêm nữa, ' +
           '<code>-Es</code> là chế độ Ex im lặng nên ngay cả dòng ' +
           '<code>N substitutions on N lines</code> cũng không được in ra. Bạn không có một manh mối ' +
           'nào.<br><br>' +
           '<b>Đây là "sai trong im lặng", và nó là lý do trục này được chọn.</b> Một lệnh báo lỗi thì ' +
           'tốn mười phút. Một lệnh chạy đúng nhưng làm sai việc thì tốn tới tận lần build sau — và ' +
           'khi đó bạn sẽ đi tìm nguyên nhân ở kernel, ở Makefile, ở mọi chỗ trừ cái dòng đã "chạy ' +
           'thành công".<br><br>' +
           '<b>(c) Bản đúng:</b><br>' +
           '<code>vim -Es -c \'%s/CONFIG_DEBUG=y/CONFIG_DEBUG=n/g\' -c \'wq\' "$f"</code><br>' +
           '<code>%</code> để quét cả file; cờ <code>g</code> ở đây thừa (mỗi dòng chỉ có một lần ' +
           'xuất hiện) nhưng vô hại và thành thói quen tốt.<br><br>' +
           '<b>(d) Bước kiểm chứng — đây mới là phần đáng giá nhất của câu hỏi:</b><br>' +
           '<code>grep -l \'CONFIG_DEBUG=y\' configs/*.conf | wc -l</code><br>' +
           'Chạy <i>trước</i> để biết bao nhiêu file cần sửa, chạy <i>sau</i> để kiểm tra con số đã ' +
           'về 0. Nguyên tắc chung, dùng được cho mọi thao tác hàng loạt: <b>đừng bao giờ tin mã thoát ' +
           '0; hãy đếm kết quả</b>. Mã thoát chỉ nói "lệnh chạy xong", không nói "lệnh làm đúng việc ' +
           'bạn muốn".<br><br>' +
           'Bài 11 sẽ cho bạn <code>sed</code> — công cụ đúng cho việc này, ngắn hơn và nhanh hơn hẳn. ' +
           'Nhưng cái bẫy phạm vi thì không biến mất: <code>sed</code> cũng có khái niệm địa chỉ dòng, ' +
           'và cũng im lặng y như vậy khi không khớp.' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1,
      q: 'Bạn đang SSH vào một board qua mạng Wi-Fi chập chờn. Rootfs chỉ có bản <code>vi</code> rút ' +
         'gọn của BusyBox — không nano, không undo nhiều bước, không tô màu. Bạn mở ' +
         '<code>/etc/network/interfaces</code> để sửa. Đúng lúc đang gõ thì mạng đứng vài giây, các ' +
         'phím bạn gõ trong khoảng đó <b>tới nơi muộn và lộn xộn</b>. Khi màn hình hiện lại, file trông ' +
         'khác hẳn thứ bạn định làm và bạn không chắc mình đang ở chế độ nào.<br><br>' +
         'Trả lời: (a) chuỗi thao tác an toàn nhất lúc này là gì, theo đúng thứ tự; (b) vì sao ' +
         '<b>không</b> nên cố sửa lại bằng phím <code>u</code>; (c) trước khi sửa một file cấu hình ' +
         'mạng trên board từ xa, thói quen nào đáng có?',
      rows: 8,
      crit: [
        '(a) Bấm Esc vài lần trước tiên để chắc chắn về được chế độ Normal — từ Normal thì Esc vô hại',
        '(a) Sau đó :q! để thoát và vứt bỏ mọi thay đổi, hoặc :e! để nạp lại từ đĩa mà vẫn ở trong vim; file trên đĩa nguyên vẹn',
        '(a) Mở lại và làm lại từ đầu, kiểm tra nội dung trước khi sửa tiếp',
        '(b) Vì bạn không biết mình đã gõ những gì nên không biết cần hoàn tác bao nhiêu bước; hơn nữa nếu đang ở chế độ Insert thì u lại là một chữ được chèn vào, làm hỏng thêm',
        '(b) Nêu thêm: bản vi của BusyBox thường chỉ hoàn tác được một bước, nên u không đưa bạn về đâu cả',
        '(c) Sao lưu trước khi sửa: cp interfaces interfaces.bak — mất một giây, cứu cả buổi',
        '(c) Nêu được rủi ro đặc thù: sửa sai file cấu hình MẠNG qua chính đường mạng đó thì mất luôn đường vào board'
      ],
      sol: '<b>(a) Thứ tự an toàn: <kbd>Esc</kbd> <kbd>Esc</kbd> → <code>:q!</code> → mở lại.</b><br>' +
           '<kbd>Esc</kbd> trước tiên vì nó là thao tác <b>duy nhất an toàn ở mọi chế độ</b>: đang ở ' +
           'Normal thì nó không làm gì, đang ở bất kỳ chế độ nào khác thì nó đưa bạn về Normal. Rồi ' +
           '<code>:q!</code> để thoát và vứt bỏ mọi thứ đã gõ nhầm — nhớ câu A5: file trên đĩa không ' +
           'suy suyển. Nếu muốn ở lại trong vim thì <code>:e!</code> cho kết quả tương đương mà không ' +
           'phải mở lại.<br><br>' +
           'Cái đắt ở đây là <b>bạn không biết mình đang ở chế độ nào</b>. Trong tình huống đó, mọi ' +
           'phím bạn bấm đều là một canh bạc — trừ <kbd>Esc</kbd>.<br><br>' +
           '<b>(b) Vì sao <code>u</code> là lựa chọn tồi:</b><br>' +
           '• Bạn không biết đã có bao nhiêu thao tác xảy ra, nên không biết phải hoàn tác bao nhiêu ' +
           'lần. Bấm thiếu thì còn rác, bấm thừa thì xoá luôn phần đúng.<br>' +
           '• Nếu đang ở chế độ Insert thì <code>u</code> <b>không phải lệnh hoàn tác</b> — nó là chữ ' +
           '"u" được chèn thêm vào file. Bạn vừa làm hỏng thêm một chỗ nữa.<br>' +
           '• Bản <code>vi</code> của BusyBox thường chỉ giữ <b>một</b> bước hoàn tác. Bấm ' +
           '<code>u</code> lần thứ hai là làm lại chính thao tác vừa hoàn tác.<br><br>' +
           '<b>(c) Ba thói quen, xếp theo giá trị:</b><br>' +
           '<b>1. Sao lưu trước khi sửa.</b> <code>cp interfaces interfaces.bak</code> — một giây, và ' +
           'nó biến mọi tai nạn thành chuyện nhỏ.<br>' +
           '<b>2. Ý thức rủi ro đặc thù:</b> bạn đang sửa cấu hình <i>mạng</i> thông qua chính đường ' +
           '<i>mạng</i> đó. Ghi sai rồi khởi động lại phần mạng là mất đường vào board — và nếu board ' +
           'nằm trong tủ ở tầng khác thì bạn đi bộ. Đây là lý do người ta hay dùng cổng nối tiếp cho ' +
           'việc này: nó không phụ thuộc vào thứ đang sửa.<br>' +
           '<b>3. Kiểm tra trước khi áp dụng:</b> đọc lại file bằng <code>cat</code> sau khi lưu, và ' +
           'nếu có thể thì thử cấu hình mới theo cách tự quay về được (ví dụ đặt hẹn khởi động lại) ' +
           'trước khi biến nó thành vĩnh viễn.<br><br>' +
           '<b>Điểm chung với hai câu kia của trục này:</b> vim không có cách nào biết bạn <i>định</i> ' +
           'làm gì — nó chỉ biết chế độ hiện tại và chuỗi phím nhận được. Khi bạn mất dấu chế độ, cách ' +
           'đúng luôn là <b>quay về trạng thái đã biết</b> (Normal, rồi file trên đĩa), chứ không phải ' +
           'sửa mò từ một trạng thái không rõ.' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Board của bạn có rootfs gắn ở chế độ <b>chỉ đọc</b> (một cách làm rất phổ biến, để mất điện ' +
         'đột ngột không làm hỏng hệ thống file). Bạn <code>vi /etc/fstab</code> để xem, rồi thoát.<br>' +
         'Trả lời: (a) file <code>.swp</code> sẽ nằm ở đâu, và chuyện gì xảy ra khi vim không tạo được ' +
         'nó? (b) nếu phải sửa thật thì làm thế nào? (c) vì sao thiết kế "rootfs chỉ đọc" lại đáng giá ' +
         'với một thiết bị nhúng?',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật trên máy bạn — vim bị giết giữa chừng',
          nocopy: true, code:
            '$ ls -l .swap.conf.swp\n' +
            '-rw------- 1 shinarus shinarus 4096 Aug 12 22:09 .swap.conf.swp\n' +
            '\n' +
            '$ vim -r\n' +
            'Swap files found:\n' +
            '   In current directory:\n' +
            '1.    .swap.conf.swp\n' +
            '          owned by: shinarus   dated: ...\n' +
            '         file name: ~shinarus/embedded/probe07b/swap.conf\n' +
            '          modified: no\n' +
            '         user name: shinarus   host name: ...\n' +
            '        process ID: 528' }
      ],
      rows: 8,
      crit: [
        '(a) Mặc định vim tạo .swp CÙNG THƯ MỤC với file đang mở, nên trên rootfs chỉ đọc nó không tạo được',
        '(a) Vim không chết vì chuyện đó: nó cảnh báo rồi vẫn mở file, chỉ là không có lưới an toàn nếu phiên bị ngắt',
        '(b) Gắn lại có quyền ghi rồi mới sửa: mount -o remount,rw / ... sửa ... rồi remount,ro',
        '(b) Hoặc sửa file ở nơi khác (thư mục ghi được, hoặc trên máy chủ) rồi chép vào',
        '(c) Nêu lý do chính: mất điện đột ngột là chuyện thường ngày của thiết bị nhúng, và hệ thống file đang ghi dở thì có thể hỏng tới mức không boot được',
        '(c) Nêu thêm một lợi ích: thiết bị luôn khởi động về một trạng thái đã biết, không tích luỹ thay đổi ngoài ý muốn',
        'Nối được với câu B5: file .swp bỏ lại chính là loại rác mà thiết kế này muốn tránh'
      ],
      sol: '<b>(a) Mặc định, vim đặt file <code>.swp</code> ngay cạnh file đang mở</b> — cùng thư mục, ' +
           'tên bắt đầu bằng dấu chấm, như <code>.swap.conf.swp</code> trong kết quả ở trên. Trên một ' +
           'hệ thống file chỉ đọc thì nó không tạo được. Vim <b>không chết vì chuyện đó</b>: nó báo ' +
           'một dòng cảnh báo rồi vẫn mở file bình thường. Cái mất là <b>lưới an toàn</b> — nếu phiên ' +
           'làm việc bị ngắt (mất SSH, mất điện) thì không có gì để khôi phục, trong khi ở chế độ bình ' +
           'thường bạn có <code>vim -r</code> như màn hình trên.<br><br>' +
           'Đọc kỹ dòng <code>modified: no</code> trong kết quả: nó nói phiên bị ngắt <i>chưa</i> sửa ' +
           'gì so với file trên đĩa, nên bạn có thể yên tâm xoá file <code>.swp</code>. Nếu là ' +
           '<code>modified: yes</code> thì trong đó có công sức chưa lưu, và bạn nên khôi phục trước ' +
           'khi xoá.<br><br>' +
           '<b>(b) Muốn sửa thật thì có hai đường:</b><br>' +
           '• <b>Gắn lại có quyền ghi</b>, sửa, rồi trả về chỉ đọc: ' +
           '<code>mount -o remount,rw /</code> → sửa → <code>mount -o remount,ro /</code>. Cách này ' +
           'nhanh nhưng phải nhớ trả lại, nếu không thiết bị mất đúng cái tính chất đang bảo vệ ' +
           'nó.<br>' +
           '• <b>Sửa ở nơi khác rồi chép vào.</b> Nhiều thiết kế chừa sẵn một phân vùng ghi được cho ' +
           'cấu hình (thường gắn ở <code>/data</code> hoặc <code>/etc</code> kiểu chồng lớp), và ' +
           '<code>/etc</code> trong rootfs chỉ là mặc định của nhà sản xuất. Đây là cách bền hơn.<br>' +
           'Nếu buộc phải mở vim trên rootfs chỉ đọc, bảo nó để <code>.swp</code> chỗ khác: ' +
           '<code>vim -n file</code> (tắt hẳn swap) hoặc <code>:set directory=/tmp</code>.<br><br>' +
           '<b>(c) Vì sao rootfs chỉ đọc đáng giá:</b> một thiết bị nhúng bị <b>cắt điện đột ngột</b> ' +
           'là chuyện thường ngày — không ai tắt máy đúng quy trình một cái router hay một bảng điều ' +
           'khiển công nghiệp. Nếu lúc đó hệ thống file đang ghi dở, cấu trúc trên đĩa có thể hỏng tới ' +
           'mức lần sau không boot được. Gắn chỉ đọc thì không có gì đang ghi, nên không có gì để ' +
           'hỏng. Lợi ích thứ hai không kém quan trọng: thiết bị <b>luôn khởi động về một trạng thái ' +
           'đã biết</b>, không tích luỹ những thay đổi mà không ai nhớ ai đã làm.<br><br>' +
           '<b>Nối với câu B5:</b> file <code>.swp</code> bỏ lại sau một lần "đóng đại cửa sổ ' +
           'terminal" chính là loại rác mà thiết kế này muốn loại trừ. Trên máy để bàn nó chỉ gây khó ' +
           'chịu; trên một thiết bị chạy nhiều năm không ai đụng tới, mỗi mẩu rác đều là nợ.' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Hai việc, cùng một phép thay thế <code>=y</code> → <code>=m</code>. Với <b>từng</b> việc, ' +
         'chọn công cụ và <b>biện minh bằng con số hoặc bằng ràng buộc</b>, đừng biện minh bằng sở ' +
         'thích.<br>' +
         '<b>Việc 1:</b> sửa 3 dòng trong <b>một</b> file, trên board, qua console nối tiếp, rootfs ' +
         'chỉ có BusyBox.<br>' +
         '<b>Việc 2:</b> sửa <b>40</b> file cấu hình trong cây build trên máy để bàn, sẽ còn phải chạy ' +
         'lại nhiều lần trong một script CI.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn — 40 file, cùng một phép thay thế',
          nocopy: true, code:
            '$ time sed -i \'s/=y/=m/g\' many/*.conf\n' +
            'real    0m0.004s\n' +
            '\n' +
            '$ time for f in many2/*.conf; do\n' +
            '>   vim -Es -c \'%s/=y/=m/g\' -c \'wq\' "$f" < /dev/null\n' +
            '> done\n' +
            'real    0m0.354s\n' +
            '\n' +
            '# ca hai deu cho ket qua giong het nhau:\n' +
            'CONFIG_UART=m\n' +
            'CONFIG_SPI=n' }
      ],
      rows: 8,
      crit: [
        'Việc 1: chọn vi (BusyBox) — biện minh bằng RÀNG BUỘC, đó là thứ duy nhất có mặt, không phải vì nó tốt hơn',
        'Việc 1: nêu được rằng với 3 dòng thì mở file sửa tay là hợp lý, không cần lệnh thay thế hàng loạt',
        'Việc 2: chọn sed — biện minh bằng CON SỐ: 0,004 s so với 0,354 s, nhanh hơn khoảng 88 lần',
        'Việc 2: nêu lý do quan trọng hơn cả tốc độ — sed không cần terminal, chạy được trong script CI không có người ngồi trước màn hình',
        'Nêu được rằng vim -Es vẫn cho kết quả ĐÚNG, nên đây không phải chuyện đúng/sai mà là chuyện công cụ hợp việc',
        'Không kết luận kiểu "sed luôn tốt hơn vim" — hai công cụ cho hai loại việc khác nhau'
      ],
      sol: '<b>Việc 1 — dùng <code>vi</code> của BusyBox, và biện minh là <i>ràng buộc</i>, không phải ' +
           'chất lượng.</b><br>' +
           'Nó là thứ duy nhất có mặt. Không có <code>sed</code> đầy đủ, không có nano, không cài thêm ' +
           'được. Với đúng 3 dòng thì mở file, tìm, sửa tay là hợp lý — dùng lệnh thay thế hàng loạt ' +
           'trên một file bạn chưa nhìn thấy toàn cảnh còn rủi ro hơn. Nhớ mở đầu bằng ' +
           '<code>cp fstab fstab.bak</code>.<br><br>' +
           '<b>Việc 2 — dùng <code>sed</code>, và có hai lý do, cái thứ hai mạnh hơn cái thứ nhất.</b>' +
           '<br>' +
           '<b>Lý do 1 — con số.</b> Đo thật trên máy bạn, cùng 40 file, cùng phép thay thế: ' +
           '<code>sed -i</code> mất <b>0,004 s</b>, vòng lặp <code>vim -Es</code> mất <b>0,354 s</b> — ' +
           'chậm hơn khoảng <b>88 lần</b>. Với 40 file thì cả hai đều xong trước khi bạn kịp nhận ra; ' +
           'nhưng tỉ lệ ấy giữ nguyên khi lên 4 000 file, và lúc đó là 0,4 giây so với 35 giây, nhân ' +
           'với số lần CI chạy mỗi ngày.<br>' +
           '<b>Lý do 2 — và đây mới là lý do thật.</b> <code>vim</code> là chương trình <b>tương ' +
           'tác</b>: nó muốn một terminal, một màn hình, một con người. Chạy nó trong CI phải bọc ' +
           '<code>-Es</code>, phải chuyển hướng <code>&lt; /dev/null</code>, và vẫn có thể treo nếu ' +
           'gặp một tình huống nó định hỏi người dùng. <code>sed</code> sinh ra để nằm trong đường ' +
           'ống: không màn hình, không chế độ, không hỏi han. <b>Trong tự động hoá, "không bao giờ hỏi ' +
           'gì" là một tính năng đắt hơn tốc độ.</b><br><br>' +
           '<b>Chú ý điều mà kết quả đo <i>không</i> nói:</b> vòng lặp <code>vim -Es</code> cho ra ' +
           'file <b>giống hệt</b>. Nó không sai. Đây không phải chuyện đúng/sai mà là chuyện chọn công ' +
           'cụ hợp việc — và câu trả lời "dùng cái nào cũng được vì kết quả như nhau" là câu trả lời ' +
           'bỏ sót toàn bộ phần ràng buộc.<br><br>' +
           'Bài 11 sẽ dạy <code>sed</code> tử tế. Bây giờ chỉ cần giữ lấy ranh giới: <b>vim để một ' +
           'người sửa một file; <code>sed</code> để một script sửa nhiều file.</b>' }
  ],

  /* ══════════════════ D · ÔN XEN KẼ ══════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Ôn xen kẽ — Bài 6',
      q: '<b>Ôn Bài 6.</b> Bạn mở <code>vim swap.conf</code> ở một cửa sổ, rồi sang cửa sổ khác gõ ' +
         '<code>ls</code> trong cùng thư mục. Kết quả thật ở dưới. Vì sao file ' +
         '<code>.swap.conf.swp</code> không xuất hiện ở lệnh đầu?',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls\n' +
            'q.conf  swap.conf\n' +
            '\n' +
            '$ ls -a\n' +
            '.  ..  .swap.conf.swp  q.conf  swap.conf' }
      ],
      opts: [
        'File <code>.swp</code> có thuộc tính "ẩn" được đặt trong siêu dữ liệu của nó, giống thuộc ' +
          'tính Hidden trên Windows.',
        'Vì tên bắt đầu bằng dấu chấm, mà <code>ls</code> theo <b>quy ước</b> bỏ qua các tên như vậy ' +
          'trừ khi có cờ <code>-a</code>. Đây không phải một thuộc tính trên đĩa — hệ thống file ' +
          'không biết khái niệm "ẩn".',
        'Vì file đang bị vim mở nên nhân giấu nó đi cho tới khi vim đóng lại.',
        'Vì file nằm trong bộ nhớ chứ chưa được ghi xuống đĩa.'
      ],
      a: 1,
      why: '"Ẩn" trong Linux là một <b>quy ước hiển thị</b>, không phải một thuộc tính. Không có bit ' +
           'nào trên đĩa nói "file này ẩn"; chỉ có <code>ls</code> (và các công cụ khác) tự nguyện bỏ ' +
           'qua những tên bắt đầu bằng dấu chấm. Cờ <code>-a</code> tắt cái quy ước đó đi.<br><br>' +
           'Ôn lại đúng lúc vì Bài 7 vừa đẻ ra một loại file ẩn mà bạn sẽ gặp thường xuyên. Ba hệ quả ' +
           'thực tế:<br>' +
           '• Sau một phiên vim bị ngắt, <code>ls</code> trông sạch sẽ nhưng rác vẫn còn — phải ' +
           '<code>ls -a</code> mới thấy.<br>' +
           '• Khi chép một thư mục cấu hình bằng <code>cp -r duan/* dich/</code>, dấu sao ' +
           '<b>không</b> khớp các tên bắt đầu bằng dấu chấm (đây chính là trục 1 của bt-06), nên mọi ' +
           'file cấu hình ẩn bị bỏ lại. Đây là một trong những lỗi sao chép hay gặp nhất.<br>' +
           '• Chính vì thế mà file cấu hình cá nhân đều mang tên kiểu <code>~/.vimrc</code>, ' +
           '<code>~/.bashrc</code>: chúng luôn nằm đó nhưng không làm rối mắt.<br><br>' +
           'Kiểm chứng thêm cho vui: <code>touch .abc</code> rồi <code>ls</code> — không thấy gì; ' +
           '<code>mv .abc abc</code> rồi <code>ls</code> — hiện ra ngay. Chỉ đổi tên, không đổi thuộc ' +
           'tính nào cả.' },

    { id: 'd2', k: 'mcq', tag: 'Ôn xen kẽ — Bài 5',
      q: '<b>Ôn Bài 5.</b> Đọc kết quả thật ở dưới. Bạn định dùng <code>vim /proc/cpuinfo</code> để ' +
         '"sửa" thông tin CPU. Phát biểu nào đúng nhất?',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l /proc/cpuinfo /etc/hosts\n' +
            '-r--r--r-- 1 root root   0 Aug 12 22:48 /proc/cpuinfo\n' +
            '-rw-r--r-- 1 root root 413 Aug 12 22:48 /etc/hosts\n' +
            '\n' +
            '$ cat /proc/cpuinfo | wc -c\n' +
            '9294\n' +
            '\n' +
            '$ cat /proc/uptime ; sleep 1 ; cat /proc/uptime\n' +
            '7.42 21.92\n' +
            '8.46 27.41' }
      ],
      opts: [
        'Được, nhưng phải chạy bằng <code>sudo</code> vì file thuộc về <code>root</code>.',
        'Không được, vì <code>/proc</code> không phải file thật trên đĩa: nội dung được <b>sinh ra ' +
          'lúc đọc</b> bởi nhân, nên kích thước hiển thị là 0 và hai lần đọc cho hai kết quả khác ' +
          'nhau. Không có gì để mà "sửa".',
        'Được, nhưng chỉ sửa được tạm thời cho tới khi khởi động lại.',
        'Không được, vì file rỗng — <code>ls -l</code> báo 0 byte nên chẳng có nội dung nào cả.'
      ],
      a: 1,
      why: 'Ba bằng chứng trong kết quả trên, và mỗi cái tự nó đã đủ:<br>' +
           '• <b>Kích thước 0 nhưng <code>cat</code> ra 9 294 byte.</b> Một file thật không làm được ' +
           'chuyện đó. Con số 0 nghĩa là "nhân không biết trước sẽ sinh ra bao nhiêu byte".<br>' +
           '• <b>Hai lần đọc <code>/proc/uptime</code> cho hai giá trị khác nhau</b> dù không ai ghi ' +
           'gì vào đó. Nội dung được tính ra tại thời điểm đọc.<br>' +
           '• <b>Quyền <code>r--r--r--</code></b>: không ai, kể cả <code>root</code>, có quyền ghi ' +
           'file này. Nên phương án A sai — <code>sudo</code> không cứu được.<br><br>' +
           'Phương án D là bẫy tinh vi hơn: nó đọc đúng con số nhưng kết luận sai. File <b>không</b> ' +
           'rỗng; cột kích thước chỉ đơn giản là không có nghĩa ở đây.<br><br>' +
           'Ôn lại đúng lúc vì Bài 7 vừa cho bạn một công cụ sửa file, và điều đầu tiên cần biết là ' +
           '<b>chỗ nào không sửa được bằng nó</b>. Ranh giới thực dụng cho cả khoá:<br>' +
           '• <b><code>/etc</code></b> — file văn bản thật trên đĩa (<code>file /etc/hosts</code> → ' +
           '<code>ASCII text</code>, 413 byte). Đây mới là chỗ vim làm việc.<br>' +
           '• <b><code>/proc</code></b> — cửa sổ nhìn vào nhân. Chỉ đọc, dùng ' +
           '<code>cat</code>/<code>less</code>.<br>' +
           '• <b><code>/sys</code></b> — nhiều file <i>ghi được</i>, nhưng ghi bằng ' +
           '<code>echo … &gt; …</code> chứ không bao giờ bằng trình soạn thảo: chúng nhận một giá trị ' +
           'chứ không lưu một nội dung. Bạn sẽ dùng đúng cách này để bật/tắt chân GPIO ở Chặng 08.' },

    { id: 'd3', k: 'free', tag: 'Ôn xen kẽ — Bài 4',
      q: '<b>Ôn Bài 4.</b> Hai dòng dưới đây chỉ khác nhau ở <b>cặp nháy đơn</b>. Dòng có nháy chèn ' +
         'được một dòng chú thích vào đầu file; dòng không nháy chết trước khi vim kịp khởi động. Hãy ' +
         'giải thích: bash đã làm gì với dòng thứ hai, và ai là người in ra thông báo lỗi đó?',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ vim -Es -c \'1i|# kernel config\' -c \'wq\' q.conf\n' +
            '$ echo "rc=$?"\n' +
            'rc=0\n' +
            '$ cat q.conf\n' +
            '# kernel config\n' +
            'CONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y\n' +
            '\n' +
            '$ vim -Es -c 1i|# kernel config -c wq u.conf\n' +
            'bash: -c: line 2: syntax error: unexpected end of file' }
      ],
      rows: 7,
      crit: [
        'Chỉ ra rằng bash cắt dòng lệnh và diễn giải các ký tự đặc biệt TRƯỚC khi vim được khởi động',
        'Giải thích ký tự | : bash hiểu là ống dẫn, tức là "đưa đầu ra của lệnh bên trái sang lệnh bên phải"',
        'Giải thích ký tự # : bash hiểu là bắt đầu chú thích, nên toàn bộ phần còn lại của dòng bị vứt đi',
        'Kết luận: vế phải của ống dẫn thành rỗng, bash không có lệnh nào để chạy nên báo lỗi cú pháp',
        'Chỉ đúng người in ra thông báo: BASH in ra (dòng bắt đầu bằng bash:), không phải vim — vim chưa hề được khởi động',
        'Nêu vai của cặp nháy đơn: chúng bảo bash coi cả cụm là MỘT đối số nguyên vẹn, không diễn giải gì bên trong',
        'Nối được với Bài 6: đây cùng một tầng với chuyện shell mở rộng dấu sao — shell sửa dòng lệnh trước, chương trình chỉ nhận kết quả'
      ],
      sol: 'Không có gì liên quan tới vim cả — vim <b>chưa bao giờ được khởi động</b>.<br><br>' +
           'Bash đọc dòng thứ hai và thấy hai ký tự đặc biệt của nó:<br>' +
           '• <code>|</code> là <b>ống dẫn</b>: "chạy lệnh bên trái, đưa đầu ra sang lệnh bên phải".<br>' +
           '• <code>#</code> là <b>bắt đầu chú thích</b>: mọi thứ từ đó tới hết dòng bị vứt bỏ.<br><br>' +
           'Ghép lại: vế trái của ống dẫn là <code>vim -Es -c 1i</code>, còn vế phải — nơi lẽ ra phải ' +
           'có một lệnh — <b>rỗng</b>, vì đã bị chú thích nuốt sạch. Bash không có gì để chạy ở đó nên ' +
           'dừng ngay ở bước phân tích cú pháp.<br><br>' +
           '<b>Bằng chứng ai in ra thông báo nằm ngay trong thông báo:</b> nó bắt đầu bằng ' +
           '<code>bash:</code>. Đây là thói quen đáng tập cho cả nghề — đọc phần đầu dòng lỗi để biết ' +
           '<i>chương trình nào</i> đang phàn nàn, trước khi đi tìm nguyên nhân. Rất nhiều giờ bị mất ' +
           'vì người ta đi sửa vim trong khi thủ phạm là shell.<br><br>' +
           '<b>Cặp nháy đơn làm gì:</b> nó bảo bash "coi cả cụm này là <b>một</b> đối số, và đừng diễn ' +
           'giải bất cứ ký tự nào bên trong". Nhờ vậy chuỗi <code>1i|# kernel config</code> tới được ' +
           'tay vim nguyên vẹn, và lúc đó <code>|</code> mới mang nghĩa của vim (dấu ngăn cách trong ' +
           'lệnh <code>i</code>) chứ không phải nghĩa của bash.<br><br>' +
           '<b>Cùng một tầng với Bài 6.</b> Ở bt-06 bạn đã thấy shell <i>mở rộng</i> dấu sao trước khi ' +
           'chương trình chạy; ở đây shell <i>cắt và diễn giải</i> dòng lệnh trước khi chương trình ' +
           'chạy. Cùng một nguyên tắc: <b>shell luôn đọc dòng lệnh trước bạn tưởng</b>. Quy tắc thực ' +
           'hành rút ra: mọi đối số có chứa khoảng trắng, <code>|</code>, <code>#</code>, ' +
           '<code>*</code>, <code>$</code> hay dấu ngoặc đều phải nằm trong nháy.' }
  ],

  /* ══════════════════ E · THỰC HÀNH ══════════════════ */
  E: [

    { id: 'e1', k: 'free', tag: 'Dự đoán output',
      q: '<code>:g</code> và <code>:v</code> là cặp lệnh mạnh nhất của vim, và cũng dễ hiểu nhầm nhất. ' +
         '<b>Trước khi chạy</b>, hãy viết ra giấy: mỗi lệnh sẽ xoá những dòng nào, và file còn lại bao ' +
         'nhiêu dòng? Chú ý dòng chú thích ở đầu — nó là chỗ hai lệnh <b>không</b> đối xứng nhau. Rồi ' +
         'chạy và đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'bước 1 — dựng hai file giống hệt nhau', code:
            'mkdir -p ~/embedded/bai07-e1 && cd ~/embedded/bai07-e1\n' +
            'printf \'# kernel config\\nCONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > g.conf\n' +
            'cp g.conf v.conf\n' +
            'cat g.conf' },
        { t: 'code', where: 'wsl', name: 'bước 2 — chạy SAU khi đã viết dự đoán', code:
            'vim -Es -c \'g/=n/d\' -c \'wq\' g.conf\n' +
            'echo "--- sau :g/=n/d"; cat g.conf; wc -l < g.conf\n' +
            'vim -Es -c \'v/=y/d\' -c \'wq\' v.conf\n' +
            'echo "--- sau :v/=y/d"; cat v.conf; wc -l < v.conf' }
      ],
      rows: 7,
      crit: [
        'Dự đoán được viết ra TRƯỚC khi chạy',
        ':g/=n/d xoá các dòng CÓ CHỨA =n, tức chỉ dòng CONFIG_SPI=n — còn lại 4 dòng, dòng chú thích được giữ',
        ':v/=y/d xoá các dòng KHÔNG chứa =y, tức cả CONFIG_SPI=n LẪN dòng chú thích — còn lại 3 dòng',
        'Nêu đúng nghĩa của v: nó là dạng phủ định của g (viết đầy đủ là :g!), chạy lệnh trên các dòng KHÔNG khớp',
        'Nhận ra vì sao hai lệnh không đối xứng: dòng chú thích không chứa =n mà cũng không chứa =y, nên nó rơi vào hai phía khác nhau của hai điều kiện',
        'Rút ra bài học: chọn giữa g và v phải nghĩ tới những dòng KHÔNG thuộc cả hai loại — dòng trống, chú thích, tiêu đề'
      ],
      sol: '<b>Kết quả thật:</b><br>' +
           '<code>:g/=n/d</code> → còn <b>4 dòng</b>: dòng chú thích, UART=y, I2C=y, DEBUG=y.<br>' +
           '<code>:v/=y/d</code> → còn <b>3 dòng</b>: UART=y, I2C=y, DEBUG=y. <b>Mất dòng chú ' +
           'thích.</b><br><br>' +
           '<code>:g/mẫu/lệnh</code> = "với <b>mọi</b> dòng khớp mẫu, chạy lệnh". ' +
           '<code>:v/mẫu/lệnh</code> = "với mọi dòng <b>không</b> khớp mẫu, chạy lệnh" — ' +
           '<code>v</code> chỉ là cách viết tắt của <code>:g!</code>.<br><br>' +
           '<b>Chỗ đắt là dòng chú thích.</b> Nó không chứa <code>=n</code> nên <code>:g</code> tha; ' +
           'nó cũng không chứa <code>=y</code> nên <code>:v</code> xoá. Hai lệnh nghe như hai mặt của ' +
           'một đồng xu, nhưng chúng chỉ đối xứng khi mọi dòng đều thuộc một trong hai loại. Trong ' +
           'thực tế thì <b>không bao giờ</b> như vậy: file cấu hình nào cũng có dòng trống, dòng chú ' +
           'thích, dòng tiêu đề.<br><br>' +
           '<b>Quy tắc rút ra:</b> trước khi dùng <code>:v</code>, hãy tự hỏi "những dòng không thuộc ' +
           'cả hai loại sẽ ra sao?". <code>:v</code> là lệnh <i>xoá mọi thứ trừ</i>, và "mọi thứ" bao ' +
           'giờ cũng rộng hơn bạn nghĩ.<br><br>' +
           '<b>Kiểm chứng an toàn trước khi xoá thật:</b> đổi <code>d</code> thành <code>p</code> ' +
           '(<code>:v/=y/p</code>) để vim <i>in ra</i> những dòng sẽ bị xoá thay vì xoá chúng. Một ' +
           'giây, và nó chặn đúng loại tai nạn im lặng mà câu C2 nói tới.' },

    { id: 'e2', k: 'num', tag: 'Dự đoán output',
      q: 'File dưới đây có <b>4 dòng</b>, không có dòng chú thích nào. Bạn sắp chạy <b>hai</b> lệnh Ex ' +
         'nối tiếp trong cùng một phiên: <code>%s/=y/=m/g</code> rồi <code>g/=n/d</code>, rồi ' +
         '<code>wq</code>. <b>Trước khi chạy</b>, hãy tính: file còn lại <b>bao nhiêu dòng</b>?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'dựng file, rồi chạy SAU khi đã viết dự đoán', code:
            'mkdir -p ~/embedded/bai07-e2 && cd ~/embedded/bai07-e2\n' +
            'printf \'CONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > chain.conf\n' +
            'cat chain.conf\n' +
            'vim -Es -c \'%s/=y/=m/g\' -c \'g/=n/d\' -c \'wq\' chain.conf\n' +
            'cat chain.conf\n' +
            'wc -l < chain.conf' }
      ],
      a: 3,
      tol: 0,
      why: 'Đáp án <b>3</b>, và cái đáng học là <b>thứ tự</b>.<br><br>' +
           'Lệnh chạy tuần tự trên cùng một bộ đệm, mỗi lệnh làm việc trên kết quả của lệnh trước:<br>' +
           '<b>Sau <code>%s/=y/=m/g</code>:</b> <code>CONFIG_UART=m</code>, ' +
           '<code>CONFIG_SPI=n</code>, <code>CONFIG_I2C=m</code>, <code>CONFIG_DEBUG=m</code> — ba ' +
           'dòng đổi, dòng <code>=n</code> không khớp mẫu nên không đụng tới.<br>' +
           '<b>Sau <code>g/=n/d</code>:</b> xoá dòng chứa <code>=n</code>, tức ' +
           '<code>CONFIG_SPI=n</code>. Còn <b>3 dòng</b>.<br><br>' +
           '<b>Đảo thứ tự thì vẫn ra 3</b> ở ví dụ này — nhưng đừng rút ra kết luận sai từ đó. Thử ' +
           'nghĩ nếu phép thay thế là <code>%s/=y/=n/g</code>: chạy trước thì <code>g/=n/d</code> sẽ ' +
           'xoá sạch những dòng <i>vừa được</i> đổi và bạn còn 0 dòng; chạy sau thì bạn còn 3. Cùng ' +
           'hai lệnh, hai kết quả trái ngược.<br><br>' +
           'Đây chính là lý do nên chạy từng lệnh một khi làm việc thật, nhìn kết quả rồi mới chạy ' +
           'lệnh tiếp theo — và chỉ gộp thành một chuỗi <code>-c</code> khi bạn đã kiểm chứng xong ' +
           'từng bước. Chuỗi <code>-c</code> gộp sẵn là thứ để đưa vào script, không phải để thử ' +
           'nghiệm.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết <b>một dòng lệnh</b> cho mỗi nhu cầu dưới đây, chạy thử và ghi lại kết quả. Cả ba đều ' +
         'phải chạy <b>không cần mở giao diện vim</b> — tức là dùng được trong script.<br>' +
         '(a) Trong <code>configs/board.conf</code>, đổi mọi <code>=y</code> thành <code>=m</code> rồi ' +
         'lưu.<br>' +
         '(b) Trong cùng file đó, chèn dòng <code># generated, do not edit</code> làm dòng đầu ' +
         'tiên.<br>' +
         '(c) <b>Đếm</b> xem còn bao nhiêu dòng chứa <code>=y</code> sau khi làm xong, mà không sửa gì ' +
         'thêm.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'dựng sẵn file để thử', code:
            'mkdir -p ~/embedded/bai07-e3/configs && cd ~/embedded/bai07-e3\n' +
            'printf \'CONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > configs/board.conf\n' +
            'cat configs/board.conf' }
      ],
      rows: 7,
      crit: [
        '(a) Có dùng vim -Es (hoặc -es) và có phạm vi %, ví dụ: vim -Es -c \'%s/=y/=m/g\' -c \'wq\' configs/board.conf',
        '(a) Nêu được vì sao phải có % — không có nó thì chỉ dòng 1 bị đổi (đúng cái bẫy của câu C2)',
        '(b) Dùng :1i với dấu ngăn cách, ví dụ: vim -Es -c \'1i|# generated, do not edit\' -c \'wq\' configs/board.conf',
        '(b) Toàn bộ cụm sau -c nằm trong NHÁY ĐƠN — nếu quên thì bash báo lỗi cú pháp như câu D3',
        '(c) Đếm bằng grep -c \'=y\' configs/board.conf (kết quả 0), hoặc bằng vim -Es -c \'%s/=y//gn\' rồi đọc số vim báo',
        'Cả ba lệnh đã được CHẠY thật và kết quả được ghi lại, không phải chỉ viết ra giấy'
      ],
      sol: '<b>(a)</b> <code>vim -Es -c \'%s/=y/=m/g\' -c \'wq\' configs/board.conf</code><br>' +
           'Ba mảnh phải có: <code>-Es</code> (chế độ Ex im lặng, không cần màn hình), ' +
           '<code>%</code> (cả file — thiếu nó là lỗi của câu C2), và <code>-c \'wq\'</code> (không ' +
           'có thì vim sửa trong bộ nhớ rồi thoát, đĩa không đổi gì).<br><br>' +
           '<b>(b)</b> <code>vim -Es -c \'1i|# generated, do not edit\' -c \'wq\' ' +
           'configs/board.conf</code><br>' +
           '<code>1i</code> = "chèn trước dòng 1"; dấu <code>|</code> ngăn cách lệnh với nội dung cần ' +
           'chèn. Nháy đơn là bắt buộc — bỏ ra là dính đúng lỗi <code>bash: -c: line 2: syntax ' +
           'error</code> ở câu D3.<br><br>' +
           '<b>(c)</b> <code>grep -c \'=y\' configs/board.conf</code> → <b>0</b>.<br>' +
           'Cách trong vim, không sửa gì: <code>vim -Es -c \'%s/=y//gn\' -c \'q\' ' +
           'configs/board.conf</code> — cờ <code>n</code> nghĩa là "chỉ đếm, đừng thay". Nhưng với ' +
           'việc chỉ đếm thì <code>grep</code> gọn hơn hẳn, và đó là gợi ý cho câu hỏi lớn hơn: ' +
           'vim là công cụ tốt để <i>sửa</i>, còn để <i>hỏi</i> thì có công cụ hợp hơn (Bài ' +
           '11).<br><br>' +
           '<b>Vì sao bắt buộc phải đếm:</b> đây là bước mà câu C2 đã cho bạn thấy hậu quả của việc ' +
           'bỏ qua. Mã thoát 0 chỉ nói lệnh chạy xong, không nói nó làm đúng việc. Thói quen: sửa ' +
           'hàng loạt xong thì luôn đếm lại.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: '<code>~/.vimrc</code> <b>chưa tồn tại</b> trên máy bạn. Hãy tự tạo một bản tối thiểu, tự ' +
         'chứng minh nó có tác dụng, rồi tự chứng minh một <b>tác dụng phụ nguy hiểm</b> của nó. Ba ' +
         'bước dưới đây phải chạy đủ, và ghi lại kết quả của từng bước.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'bước 1 — tạo ~/.vimrc và so sánh có / không có nó', code:
            'test -e ~/.vimrc && echo "DA CO ROI - dung ghi de, hay sao luu truoc" || echo "chua co, tao moi"\n' +
            'printf \'set tabstop=4\\nset expandtab\\nset number\\n\' > ~/.vimrc\n' +
            'cat ~/.vimrc\n' +
            'echo "--- co doc ~/.vimrc:"\n' +
            'vim -u ~/.vimrc -Es -c \'set tabstop?\' -c \'set expandtab?\' -c \'q\' < /dev/null\n' +
            'echo "--- bo qua moi cau hinh:"\n' +
            'vim -u NONE -Es -c \'set tabstop?\' -c \'set expandtab?\' -c \'q\' < /dev/null' },
        { t: 'code', where: 'wsl', name: 'bước 2 — tác dụng phụ: expandtab và Makefile', code:
            'mkdir -p ~/embedded/bai07-e4 && cd ~/embedded/bai07-e4\n' +
            'printf \'all:\\n\\techo hello\\n\' > Makefile.good\n' +
            'printf \'all:\\n    echo hello\\n\' > Makefile.bad\n' +
            'echo "--- cat -A cho thay tung ky tu:"\n' +
            'cat -A Makefile.good\n' +
            'cat -A Makefile.bad\n' +
            'echo "--- chay ca hai:"\n' +
            'make -f Makefile.good\n' +
            'make -f Makefile.bad' },
        { t: 'code', where: 'wsl', name: 'bước 3 — dọn dẹp (bắt buộc, nếu bạn không muốn giữ ~/.vimrc)', code:
            'rm -f ~/.vimrc\n' +
            'test -e ~/.vimrc && echo "VAN CON" || echo "da xoa ~/.vimrc"' }
      ],
      rows: 8,
      crit: [
        'Ghi lại kết quả bước 1: có ~/.vimrc thì tabstop=4 và expandtab; với -u NONE thì tabstop=8 và noexpandtab',
        'Giải thích được -u NONE dùng để làm gì: tách bạch "lỗi do cấu hình của tôi" khỏi "lỗi do bản thân vim" — bước chẩn đoán đầu tiên khi vim hành xử lạ',
        'Ghi lại kết quả bước 2: cat -A cho thấy Makefile.good có ^I (ký tự Tab thật) còn Makefile.bad chỉ có dấu cách',
        'Ghi lại lỗi thật của make: Makefile.bad:2: *** missing separator.  Stop.',
        'Nối được hai bước: expandtab biến mọi phím Tab thành dấu cách, nên soạn Makefile bằng vim có expandtab sẽ sinh ra đúng file hỏng đó',
        'Nêu được cách chữa: tắt expandtab cho riêng Makefile (autocmd theo loại file), hoặc chèn Tab thật bằng Ctrl+V rồi Tab',
        'Nhận xét về phương pháp: một cấu hình "cho tiện" có thể phá thứ mà cú pháp bắt buộc phải có ký tự Tab'
      ],
      sol: '<b>Bước 1 — kết quả thật:</b><br>' +
           'với <code>-u ~/.vimrc</code>: <code>tabstop=4</code>, <code>expandtab</code><br>' +
           'với <code>-u NONE</code>: <code>tabstop=8</code>, <code>noexpandtab</code><br><br>' +
           '<b>Một cái bẫy đo đạc đáng biết, và nó có thật trong lúc soạn bộ bài tập này:</b> chạy ' +
           '<code>vim -Es</code> trần (không có <code>-u</code>) cho ra <code>tabstop=8</code> ngay cả ' +
           'khi <code>~/.vimrc</code> đang tồn tại — vì chế độ Ex im lặng <b>không đọc vimrc</b>. Lần ' +
           'đo đầu tiên vì thế trông như <code>~/.vimrc</code> vô tác dụng. Bài học chung: khi một ' +
           'phép đo cho kết quả "không có gì thay đổi", hãy nghi ngờ <i>cách đo</i> trước khi kết luận ' +
           'về <i>thứ được đo</i>.<br><br>' +
           '<b><code>-u NONE</code> để làm gì:</b> nó là bước chẩn đoán đầu tiên khi vim hành xử lạ. ' +
           'Chạy <code>vim -u NONE file</code>; nếu hiện tượng biến mất thì thủ phạm là cấu hình của ' +
           'bạn, còn nếu vẫn còn thì là bản thân vim hoặc file. Đây là kỹ thuật <b>chia đôi để tìm ' +
           'nguyên nhân</b>, và bạn sẽ dùng lại nó suốt khoá — với kernel, với U-Boot, với ' +
           'toolchain.<br><br>' +
           '<b>Bước 2 — kết quả thật:</b><br>' +
           '<code>cat -A Makefile.good</code> → <code>all:$</code> rồi <code>^Iecho hello$</code> — ' +
           '<code>^I</code> là ký tự Tab thật.<br>' +
           '<code>cat -A Makefile.bad</code> → <code>all:$</code> rồi ' +
           '<code>    echo hello$</code> — chỉ có dấu cách.<br>' +
           '<code>make -f Makefile.good</code> chạy bình thường và in <code>hello</code>.<br>' +
           '<code>make -f Makefile.bad</code> báo: ' +
           '<code>Makefile.bad:2: *** missing separator.  Stop.</code><br><br>' +
           '<b>Vì sao đây là tác dụng phụ nguy hiểm:</b> <code>expandtab</code> biến <b>mọi</b> phím ' +
           '<kbd>Tab</kbd> bạn gõ thành dấu cách. Cú pháp Makefile lại <b>bắt buộc</b> mỗi dòng lệnh ' +
           'phải mở đầu bằng một ký tự Tab thật. Nên một cấu hình đặt ra "cho gọn code" sẽ âm thầm sinh ' +
           'ra Makefile không chạy được — và thông báo <code>missing separator</code> không hề gợi ý ' +
           'gì về Tab. Bạn sẽ gặp lại chính xác cái này ở Chặng 02 khi tự viết Makefile.<br><br>' +
           '<b>Hai cách chữa:</b> tắt <code>expandtab</code> cho riêng loại file Makefile (bằng một ' +
           'dòng <code>autocmd</code> trong <code>~/.vimrc</code>), hoặc chèn một Tab thật bất chấp ' +
           'cấu hình bằng <kbd>Ctrl</kbd>+<kbd>V</kbd> rồi <kbd>Tab</kbd>.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Ba thông báo lỗi thật của vim, chụp trên máy bạn. Với <b>từng</b> cái: nói người dùng đang ' +
         'định làm gì, vì sao vim từ chối, và <b>gõ tiếp cái gì</b> để ra khỏi tình huống đó. Chú ý: ' +
         'hai trong ba cái có gợi ý ngay trong thông báo, cái còn lại thì không.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '# (1) mo mot file quyen 444, sua, roi go  :wq\n' +
            'E45: \'readonly\' option is set (add ! to override)\n' +
            '\n' +
            '# (2) go  :%s/=y/=m/G\n' +
            'E488: Trailing characters: G\n' +
            '\n' +
            '# (3) sua mot ky tu roi go  :q\n' +
            'E37: No write since last change (add ! to override)' }
      ],
      rows: 8,
      crit: [
        '(1) Người dùng muốn lưu một file mở ở chế độ chỉ đọc; gõ tiếp :w! để ghi đè (được, nếu quyền trên đĩa cho phép), hoặc :q! để bỏ',
        '(1) Nêu được vì sao vim mở ở readonly: quyền của file không cho ghi, vim bật cờ readonly để chặn tai nạn',
        '(2) Người dùng nhầm G là "toàn cục"; đúng ra phải là cờ g viết thường — G không phải cờ hợp lệ nên vim coi là ký tự thừa',
        '(2) Gõ lại cho đúng: :%s/=y/=m/g — và nêu được rằng vim KHÔNG thay gì cả, file nguyên vẹn',
        '(3) Người dùng muốn thoát nhưng chưa lưu; gõ :wq (hoặc :x) để lưu rồi thoát, hoặc :q! để vứt thay đổi',
        'Nhận ra hai thông báo (1) và (3) đã tự nói cách chữa trong ngoặc "add ! to override", còn (2) thì không — phải tự biết cú pháp',
        'Nêu được thói quen chung: đọc mã lỗi Enn rồi đọc hết dòng, đừng chỉ nhìn thấy màu đỏ rồi hoảng'
      ],
      sol: '<b>(1) <code>E45: \'readonly\' option is set</code></b><br>' +
           'Người dùng mở một file mà quyền không cho ghi (ví dụ <code>444</code>). Vim vẫn cho mở và ' +
           'cho sửa trong bộ nhớ, nhưng bật cờ <code>readonly</code> để bạn không lỡ tay ghi đè. ' +
           'Đường ra: <code>:w!</code> nếu bạn thật sự muốn ghi và quyền trên đĩa cho phép (đo trên ' +
           'máy bạn: với file <code>444</code> mà bạn sở hữu, <code>:w!</code> ghi thành công và báo ' +
           '<code>"ro.conf" 4L, 55B written</code>); hoặc <code>:q!</code> nếu chỉ vào xem.<br><br>' +
           '<b>(2) <code>E488: Trailing characters: G</code></b><br>' +
           'Người dùng nhớ mang máng rằng "phải thêm một chữ g cho toàn cục" nhưng gõ chữ <b>hoa</b>. ' +
           'Cờ hợp lệ là <code>g</code> viết thường; <code>G</code> không phải cờ nào cả, nên vim đọc ' +
           'xong lệnh vẫn thấy thừa một ký tự và <b>từ chối chạy toàn bộ lệnh</b>. Đây là điểm tốt: ' +
           'file hoàn toàn không bị đụng tới. Gõ lại <code>:%s/=y/=m/g</code>.<br><br>' +
           '<b>(3) <code>E37: No write since last change</code></b><br>' +
           'Người dùng gõ <code>:q</code> trong khi còn thay đổi chưa lưu. Vim chặn lại — đây là lưới ' +
           'an toàn, không phải phiền phức. Ba đường ra, chọn theo ý định: <code>:wq</code> hoặc ' +
           '<code>:x</code> (giữ thay đổi), <code>:q!</code> (vứt thay đổi, file trên đĩa nguyên ' +
           'vẹn).<br><br>' +
           '<b>Điểm khác nhau đáng để ý:</b> <code>E45</code> và <code>E37</code> <b>tự nói cách ' +
           'chữa</b> ngay trong ngoặc — <code>(add ! to override)</code>. <code>E488</code> thì không, ' +
           'vì vim không đoán được bạn định gõ gì. Nói cách khác: hai lỗi đầu là "vim chặn bạn lại một ' +
           'cách có chủ ý", lỗi thứ ba là "vim không hiểu bạn nói gì".<br><br>' +
           '<b>Thói quen đáng tập:</b> mã lỗi của vim đều có dạng <code>E</code> + số và <b>tra được ' +
           'ngay trong vim</b>: gõ <code>:help E488</code>. Không cần Internet, không cần rời màn ' +
           'hình — rất đáng giá khi bạn đang ngồi trước một board không có mạng.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: '<b>Câu này chưa có lời giải trọn vẹn trong Bài 7 — và đó là chủ ý.</b> Hãy thử: mở ' +
         '<code>vim /etc/hosts</code> với tài khoản thường của bạn, sửa một ký tự, rồi gõ ' +
         '<code>:w</code>. Ghi lại <b>chính xác</b> thông báo bạn nhận được, rồi thoát bằng ' +
         '<code>:q!</code> (đừng cố ép ghi bằng bất cứ cách nào).<br><br>' +
         'Sau đó trả lời: (a) vì sao lần này <code>:w!</code> cũng không cứu được, khác hẳn ca ' +
         '<code>E45</code> ở câu E5? (b) kể ra <b>ít nhất hai</b> hướng để thật sự sửa được file này, ' +
         'và nói mỗi hướng cần thêm kiến thức gì?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'nhìn quyền trước khi thử — an toàn, chỉ đọc', code:
            'ls -l /etc/hosts\n' +
            'id -un\n' +
            'id -Gn' }
      ],
      rows: 8,
      crit: [
        'Ghi lại được thông báo THẬT mà máy bạn in ra, nguyên văn, không phải đoán',
        '(a) Nêu đúng khác biệt: E45 là vim TỰ chặn (cờ readonly của riêng vim) nên ! bảo nó thôi chặn là xong; còn ở đây là NHÂN từ chối vì quyền của file, mà vim thì không có cách nào vượt qua quyền',
        '(a) Đọc được quyền -rw-r--r-- root root: chỉ chủ sở hữu (root) mới ghi được, mình không phải root',
        '(b) Hướng 1: chạy vim với quyền của root (sudo) — cần kiến thức về người dùng, nhóm và sudo, tức Bài 8',
        '(b) Hướng 2: đổi chủ sở hữu hoặc quyền của file — cũng cần Bài 8, và nói được rằng đây thường là cách SAI cho file hệ thống',
        'Nêu được rằng đây không phải trục trặc của vim mà là ranh giới quyền của hệ thống — vim chỉ là người đưa tin',
        'Viết ra một câu hỏi cụ thể muốn được trả lời ở bài sau'
      ],
      sol: '<b>Câu trả lời trung thực: với riêng Bài 7, bạn không sửa được file này.</b> Và nhận ra ' +
           'ranh giới đó chính là mục đích của câu hỏi.<br><br>' +
           '<b>(a) Vì sao <code>!</code> không cứu được lần này.</b> Hãy tách hai tầng cho rõ, vì đây ' +
           'là chỗ hầu hết mọi người lẫn:<br>' +
           '• <b>Ca <code>E45</code> ở câu E5:</b> chính <i>vim</i> tự bật cờ <code>readonly</code> để ' +
           'chặn bạn. Dấu <code>!</code> nghĩa là "thôi đừng chặn nữa" — và vim nghe lời, vì nó chỉ ' +
           'đang chặn theo quy ước của bản thân nó. Việc ghi sau đó thành công vì <b>quyền trên đĩa ' +
           'vẫn cho phép</b>.<br>' +
           '• <b>Ca <code>/etc/hosts</code>:</b> chủ sở hữu là <code>root</code> và quyền là ' +
           '<code>-rw-r--r--</code>, nghĩa là chỉ <code>root</code> được ghi. Người từ chối lần này là ' +
           '<b>nhân</b>, không phải vim. Dấu <code>!</code> chỉ có tác dụng với vim; nó không có chút ' +
           'thẩm quyền nào đối với hệ thống quyền của Linux. Vim ở đây chỉ là người đưa tin.<br><br>' +
           'Đó là một sự phân tầng bạn sẽ gặp lại rất nhiều: <b>một chương trình có thể nới lỏng quy ' +
           'tắc của chính nó, nhưng không bao giờ nới được quy tắc của tầng dưới.</b><br><br>' +
           '<b>(b) Hai hướng, và cả hai đều thuộc về Bài 8 — <i>Người dùng, nhóm, quyền và ' +
           'sudo</i>:</b><br>' +
           '<b>Hướng 1 — mượn quyền của <code>root</code> trong chốc lát.</b> Đây là cách đúng và là ' +
           'cách bạn sẽ dùng hằng ngày. Nhưng nó kéo theo cả một chùm câu hỏi mà Bài 7 không trả lời ' +
           'được: ai được phép mượn, mượn thì chạy dưới danh nghĩa ai, và vì sao mở trình soạn thảo ' +
           'bằng quyền cao nhất lại là thói quen đáng ngại.<br>' +
           '<b>Hướng 2 — đổi quyền hoặc đổi chủ sở hữu của file.</b> Về kỹ thuật thì được, và với file ' +
           'hệ thống thì thường là <b>lựa chọn sai</b>: bạn nới vĩnh viễn một cánh cửa chỉ để đi qua ' +
           'một lần. Biết rằng nó tồn tại là đủ; Bài 8 sẽ nói vì sao nên tránh.<br><br>' +
           '<b>Vì sao đây không phải bài tập cho vui:</b> gần như mọi file bạn sẽ sửa từ Chặng 06 trở ' +
           'đi — cấu hình U-Boot, <code>/etc</code> trong rootfs, quy tắc thiết bị — đều thuộc về ' +
           '<code>root</code>. "Biết soạn thảo" mà không "biết quyền" thì mới đi được nửa đường.<br><br>' +
           'Trước khi sang Bài 8, hãy viết ra một câu hỏi cụ thể của riêng bạn. Bài 8 mở đầu bằng việc ' +
           'trả lời đúng câu đó.' }
  ],

  diag: [

    /* ── ba trục xoáy, mỗi trục một dòng ── */
    ['A2, B1, C1',
     '<b>Trục 1.</b> Bạn còn tin rằng <kbd>Ctrl</kbd>+<kbd>S</kbd> làm chương trình dừng lại, ' +
       'hoặc rằng đó là chuyện của shell. Thật ra terminal chỉ <b>ngừng vẽ ra màn hình</b>; ' +
       'chương trình vẫn chạy, và <kbd>Ctrl</kbd>+<kbd>Q</kbd> mở lại luồng chữ.',
     '<a href="#/bai-07#vi-sao-phai-soan-thao-trong-terminal">Đọc lại — Vì sao phải soạn thảo trong terminal</a>'],

    ['A3, B3, C3',
     '<b>Trục 2.</b> Bạn gõ chữ vào vim và nó biến thành lệnh, hoặc bạn không đoán được một phím ' +
       'sẽ làm gì. Gốc rễ: vim <b>có chế độ</b> — cùng một phím mang hai nghĩa hoàn toàn khác ' +
       'nhau, và <kbd>Esc</kbd> luôn là đường về Normal.',
     '<a href="#/bai-07#vim-truoc-het-la-hieu-che-do">Đọc lại — vim: trước hết là hiểu chế độ</a>'],

    ['A4, B2, C2',
     '<b>Trục 3.</b> Bạn chạy <code>:s/…/…/</code> rồi tưởng cả file đã đổi. Lệnh sau dấu hai chấm ' +
       'mặc định chỉ tác động <b>một dòng</b>: thiếu <code>%</code> thì chỉ dòng hiện tại đổi, ' +
       'thiếu <code>g</code> thì chỉ lần khớp đầu tiên trong dòng đổi — và không có lỗi nào báo cho ' +
       'bạn biết.',
     '<a href="#/bai-07#lenh-sau-dau-hai-cham">Đọc lại — Lệnh sau dấu hai chấm</a>'],

    /* ── phần còn lại, mỗi khái niệm một dòng ── */
    ['A1, B6',
     'Chưa rõ vì sao <code>vi</code> có mặt ở mọi nơi còn <code>nano</code> thì không, và ' +
       '<code>/usr/bin/vi</code> thật ra trỏ tới cái gì.',
     '<a href="#/bai-07#vi-sao-phai-soan-thao-trong-terminal">Đọc lại — Vì sao phải soạn thảo trong terminal</a>'],

    ['A5, A6',
     'Bốn đường ra khỏi vim còn lẫn lộn: <code>:q</code>, <code>:wq</code>, <code>:q!</code>, ' +
       '<code>:x</code> — cái nào giữ thay đổi, cái nào vứt, cái nào không đụng vào ngày sửa file.',
     '<a href="#/bai-07#thoat-khoi-vim-hoc-dieu-nay-truoc-moi-thu-khac">Đọc lại — Thoát khỏi vim</a>'],

    ['A7',
     'Chưa nắm quy tắc <b>số đếm + động tác</b> của vim: vì sao <code>3dw</code> và ' +
       '<code>d3w</code> cho cùng kết quả.',
     '<a href="#/bai-07#sua-va-xoa">Đọc lại — Sửa và xoá</a>'],

    ['A8',
     'Mười lăm phím cơ bản chưa thành phản xạ — nhất là bốn cách vào Insert (<code>i o a O</code>) ' +
       'khác nhau ở chỗ con trỏ dừng.',
     '<a href="#/bai-07#muoi-lam-lenh-vim-du-dung-ngoai-thuc-dia">Đọc lại — Mười lăm lệnh vim đủ dùng ngoài thực địa</a>'],

    ['B4',
     'Chưa chỉ ra được <b>khác biệt nào mới là khác biệt quan trọng</b> giữa nano và vim. Gợi ý: ' +
       'không phải chuyện dễ hay khó, mà là chuyện cái nào chắc chắn có mặt trên board.',
     '<a href="#/bai-07#nano-hoc-trong-ba-phut">Đọc lại — nano: học trong ba phút</a>'],

    ['B5, C4',
     'File <code>.swp</code> và màn hình <code>E325</code> còn làm bạn hoảng: nó là gì, vì sao còn ' +
       'lại sau khi phiên trước bị ngắt, chọn phương án nào, và <code>vim -r</code> cứu được gì.',
     '<a href="#/bai-07#file-swp-va-man-hinh-e325-dang-so">Đọc lại — File .swp và màn hình E325 đáng sợ</a>'],

    ['C5, E3',
     'Chưa chọn được giữa <code>sed -i</code> và <code>vim -Es</code> cho việc sửa hàng loạt, hoặc ' +
       'chưa viết được một dòng <code>vim -Es</code> chạy không cần màn hình.',
     '<a href="#/bai-07#thuc-hanh-sua-mot-file-cau-hinh-kernel-bang-ca-hai-trinh-soa">Đọc lại — Thực hành: sửa một file cấu hình kernel</a>'],

    ['E1, E2',
     '<code>:g</code>, <code>:v</code> và thứ tự chạy nhiều lệnh Ex nối tiếp còn mơ hồ — nhất là ' +
       'chuyện <code>:v</code> nuốt luôn cả dòng chú thích.',
     '<a href="#/bai-07#lenh-sau-dau-hai-cham">Đọc lại — Lệnh sau dấu hai chấm</a>'],

    ['E4, E5, E6',
     'Các thông báo lỗi của vim (<code>E45</code>, <code>E488</code>, <code>E37</code>) chưa đọc ' +
       'được thành hành động, hoặc chưa thấy vì sao <code>expandtab</code> giết một Makefile.',
     '<a href="#/bai-07#loi-thuong-gap">Đọc lại — Lỗi thường gặp</a>'],

    /* ── ba dòng ôn xen kẽ, trỏ về bài cũ ── */
    ['D1',
     '<b>Bài 6.</b> Còn tưởng "ẩn" là một thuộc tính trên đĩa. Thật ra đó chỉ là quy ước: tên bắt ' +
       'đầu bằng dấu chấm thì <code>ls</code> bỏ qua, trừ khi có <code>-a</code>.',
     '<a href="#/bai-06#doc-cho-het-mot-dong-ls-l">Đọc lại Bài 6 — Đọc cho hết một dòng ls -l</a>'],

    ['D2',
     '<b>Bài 5.</b> Còn coi <code>/proc</code> như file thường. Nội dung ở đó được nhân sinh ra ' +
       '<b>lúc bạn đọc</b>, nên kích thước là 0 và hai lần đọc cho hai kết quả khác nhau — không có ' +
       'gì để trình soạn thảo sửa.',
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Đọc lại Bài 5 — /proc và /sys</a>'],

    ['D3',
     '<b>Bài 4.</b> Chưa thấy shell cắt và diễn giải dòng lệnh <b>trước khi</b> chương trình chạy, ' +
       'nên chưa biết khi nào bắt buộc phải bọc đối số trong nháy.',
     '<a href="#/bai-04#cau-truc-cua-mot-cau-lenh">Đọc lại Bài 4 — Cấu trúc của một câu lệnh</a>']
  ]
});

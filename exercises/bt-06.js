/* ============================================================
   BT-06 — Bài tập cho Bài 6: "Điều hướng, thao tác và xem file"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                                  | PT | GIA | NGC | Tổng |
   |-----------------------------------------------------------|----|-----|-----|------|
   | Shell mở rộng ký tự đại diện; chương trình không thấy sao  | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | Liên kết cứng trỏ vào INODE, liên kết mềm trỏ vào TÊN      | 2  |  2  |  2  |  6   |  ← TRỤC 2
   | Chép cây hệ thống: -a giữ siêu dữ liệu, -r vứt đi          | 2  |  2  |  2  |  6   |  ← TRỤC 3
   | rm là unlink() — gỡ một cái TÊN, không xoá dữ liệu         | 2  |  2  |  2  |  6   |
   | mv chỉ sửa bảng tên→inode nên tức thời trong cùng phân vùng| 2  |  1  |  2  |  5   |
   | Thư mục là một BẢNG tên→inode, không chứa file             | 2  |  1  |  2  |  5   |
   | Bảy cột của ls -l, và cột "total" không phải tổng kích cỡ  | 1  |  2  |  1  |  4   |
   | Số liên kết của một thư mục = 2 + số thư mục con           | 1  |  0  |  2  |  3   |
   | cat/less/head/tail — chọn công cụ theo kích thước file     | 1  |  1  |  1  |  3   |
   | glob KHÔNG phải biểu thức chính quy                        | 1  |  1  |  1  |  3   |
   | Tên bắt đầu bằng dấu chấm là QUY ƯỚC, không phải thuộc tính| 0  |  1  |  1  |  2   |
   | Các cờ -l -a -h -t -R -d -i của ls                         | 0  |  0  |  0  |  0   |

   Bước 3 — cắt: bốn ứng viên đạt 6 điểm, chỉ được lấy ba. Ứng viên bị cắt là
   "rm là unlink()" — nhưng nó KHÔNG bị mất: nó là mặt sau của trục 2 (gỡ một
   cái tên trong khi inode còn cái tên khác) nên đã nằm sẵn trong cả ba câu
   của trục đó. Cắt nó ra thành trục thứ tư sẽ vi phạm bước 7 ("ba câu phải
   khác từ vựng") vì hai trục sẽ nói cùng một chuyện.

   Bước 4 — loại: các cờ của ls bị loại theo §13.3 — tra được trong mười giây.
   Kiểm tra chống trùng với các bộ trước: bt-01 xoáy MMU / bốn mảnh nối tiếp /
   Device Tree; bt-02 xoáy DRAM-SRAM-SPL / bàn giao rồi biến mất / bootargs;
   bt-03 xoáy ảo hoá cần cùng kiến trúc / hai họ QEMU / ranh giới 9P;
   bt-04 xoáy $? sống một lệnh / builtin thắng file ngoài / cắt theo khoảng
   trắng; bt-05 xoáy sinh lúc đọc / major–minor / thư mục rỗng là điểm gắn.
   Ba trục của bộ này không trùng cái nào — hợp lệ.

   LƯU Ý VỀ TRỤC 1 SO VỚI TRỤC "CẮT THEO KHOẢNG TRẮNG" CỦA BT-04: hai cái
   khác nhau và không được lẫn. bt-04 nói shell CẮT dòng lệnh thành các mảnh.
   Bộ này nói shell còn SINH THÊM đối số từ ký tự đại diện — một mảnh trong
   dòng bạn gõ có thể nở thành mười đối số, hoặc nở thành không đối số nào.
   Câu D1 của bộ này chính là chỗ nối hai ý đó lại.

   Bước 6 — hiểu sai đối lập của từng trục nằm trong trường `mis` bên dưới.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (shell mở rộng)  A2 phát biểu → B1 ba kết quả thật cãi nhau
                                             (echo * / echo "*" / ls *.cpp)
                                           → C1 find chạy đúng ở thư mục này,
                                             hỏng ở thư mục kia
     Trục 2 (inode vs tên)   A3 phát biểu → B4 hai kiểu liên kết thật cùng
                                             tồn tại trong /usr/bin
                                           → C3 8 MB flash + thẻ SD, chọn loại
     Trục 3 (siêu dữ liệu)   A4 phát biểu → B2 dấu thời gian thật của cp -r
                                             và cp -a
                                           → C2 rootfs sao lưu sang /mnt/c
                                             rồi khôi phục, board không boot

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, coreutils bản uutils viết bằng
   Rust, tài khoản shinarus) ngày 2026-08-12.

   MỘT KHÁC BIỆT ĐÃ ĐƯỢC TRUY NGUYÊN TRƯỚC KHI DÙNG: `cp -r` trên máy này
   GIỮ NGUYÊN cả quyền (600 vẫn là 600) lẫn liên kết mềm — thứ duy nhất nó
   đánh mất là DẤU THỜI GIAN. Đó không phải lỗi đo: quyền của file mới được
   đặt theo quyền nguồn rồi lọc qua umask (022), mà 600 và 755 đều đi qua
   umask 022 không suy suyển. Vì vậy mọi câu chấm điểm trong bộ này chỉ chấm
   dấu thời gian và chủ sở hữu, KHÔNG chấm quyền — còn chuyện quyền được kể
   lại đúng chỗ của nó, trong phần `why` của B2.

   MỘT SỐ CỐ Ý KHÔNG CHẤM: số inode (34437, 1585…) đổi theo từng lần tạo
   file. Câu nào có inode thì chấm QUAN HỆ "hai tên cùng số" chứ không chấm
   con số.
   ============================================================ */
Exercise.register({
  id: 'bt-06',
  minutes: 85,

  intro:
    '<p>Bài 6 dạy bạn khoảng hai mươi câu lệnh. Bộ bài tập này gần như không hỏi cú pháp của cái nào cả, ' +
    'vì cú pháp tra được trong mười giây. Nó hỏi ba thứ tra không ra.</p>' +
    '<p>Ba kết quả thật bạn sắp đọc đều vô lý nếu bạn còn nghĩ "gõ lệnh gì thì lệnh đó làm": một lệnh ' +
    '<code>find</code> <b>chạy đúng ở thư mục này và báo lỗi ở thư mục bên cạnh</b> dù bạn gõ y hệt; ' +
    'hai cái tên khác nhau trỏ vào <b>cùng một số inode</b> trong khi một cái tên thứ ba trông giống hệt ' +
    'lại trỏ vào hư vô; và một bản sao rootfs <b>đủ mọi file, đúng mọi byte</b> nhưng board không boot ' +
    'được. Cả ba đều không phải lỗi của lệnh — chúng là hệ quả của việc ai làm gì, vào lúc nào.</p>' +
    '<p><b>Chia hai lượt.</b> Ngay sau khi đọc bài: phần A + B. Sau 2–3 ngày: phần C + D + E. ' +
    'Phần D lần này ôn Bài 3, Bài 4 và Bài 5 — cả ba đều là thứ phần C phải dùng lại ngay.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` và `mis` là tài liệu cho người viết
     bài tập sau, không được render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'shell-mo-rong',
      name: 'Shell mở rộng ký tự đại diện, chương trình không bao giờ thấy dấu sao',
      x: 'Dấu <code>*</code>, <code>?</code>, <code>[…]</code> được shell thay bằng danh sách tên file ' +
         'CÓ THẬT trong thư mục, trước khi chương trình được khởi động. Chương trình chỉ nhận về một ' +
         'mảng chuỗi đã hoàn tất. Khi không tên nào khớp, bash để nguyên chuỗi có dấu sao và giao ' +
         'nguyên xi cho chương trình — nên thông báo lỗi lại do chương trình in ra chứ không phải shell.',
      mis: 'Lệnh nào cũng "hiểu" dấu sao; ls biết mở rộng dấu sao, find cũng vậy, nên gõ dấu sao ở đâu ' +
           'cũng như nhau. Kết quả của một lệnh chỉ phụ thuộc vào chữ mình gõ, không phụ thuộc vào thư ' +
           'mục mình đang đứng.' },

    { id: 'inode-va-ten',
      name: 'Liên kết cứng trỏ vào inode, liên kết mềm trỏ vào một cái tên',
      x: 'Thư mục là một bảng tên → số inode. Liên kết cứng là một dòng nữa trong bảng ấy trỏ vào ĐÚNG ' +
         'inode cũ: hai tên ngang hàng, không có bản chính. Liên kết mềm là một file riêng, có inode ' +
         'riêng, nội dung là chuỗi ký tự đường dẫn — nên nó hỏng khi cái tên kia biến mất, và nó vượt ' +
         'được ranh giới phân vùng trong khi liên kết cứng thì không.',
      mis: 'Hai loại liên kết chỉ khác nhau ở chỗ gõ thêm chữ -s; cái nào cũng là "lối tắt" tới file ' +
           'gốc, xoá file gốc thì cả hai cùng hỏng, và cái nào cũng chỉ tốn vài byte.' },

    { id: 'sieu-du-lieu',
      name: 'Với một cây hệ thống, siêu dữ liệu chính là hệ thống',
      x: 'Một rootfs không phải là "tập hợp nội dung các file". Quyền, chủ sở hữu, bit setuid, dấu thời ' +
         'gian và các liên kết mềm quyết định hệ thống có chạy được hay không. cp -a giữ tất cả; cp -r ' +
         'tạo file mới nên dấu thời gian là lúc chép; chép qua một hệ thống file không hiểu khái niệm ' +
         'đó (NTFS qua /mnt/c) thì mất luôn cả quyền lẫn chủ sở hữu, mà không có lấy một dòng lỗi.',
      mis: 'Sao lưu là chép cho đủ file. Chép đủ file, so byte thấy khớp, thì bản sao dùng được — dấu ' +
           'thời gian với quyền chỉ là thứ trang trí, boot lên là hệ thống tự đặt lại.' }
  ],

  /* ══════════════════ A · NHẬN BIẾT ══════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Vì sao <code>ls</code> không hiện file <code>.bashrc</code> còn <code>ls -a</code> thì hiện?',
      opts: [
        'File đó có một <b>bit ẩn</b> trong inode; <code>-a</code> bảo <code>ls</code> đọc cả những file ' +
          'bật bit ấy.',
        'Nó nằm trong một vùng riêng của hệ thống file mà chỉ <code>-a</code> mới đọc tới.',
        'Không có thuộc tính ẩn nào cả. Đây thuần tuý là <b>quy ước</b>: <code>ls</code> tự bỏ qua mọi ' +
          'tên bắt đầu bằng dấu chấm, còn <code>-a</code> tắt cái nết đó đi.',
        'Chỉ tài khoản tạo ra file mới thấy nó; <code>-a</code> chạy với quyền cao hơn.'
      ],
      a: 2,
      why: 'Trong Linux <b>không có thuộc tính "ẩn"</b>. Hệ thống file không biết file nào ẩn file nào ' +
           'không — nó chỉ lưu một cái tên, và cái tên ấy tình cờ bắt đầu bằng dấu chấm. Người bỏ qua ' +
           'là <code>ls</code>, và nó bỏ qua vì một quy ước có từ những năm 1970.<br><br>' +
           'Hệ quả đáng nhớ hơn cái quy ước: vì "ẩn" chỉ là chuyện của <code>ls</code>, mọi công cụ ' +
           'khác <b>không</b> bỏ qua. <code>cp -a src dst</code> chép cả file chấm. <code>rm -rf dir</code> ' +
           'xoá cả file chấm. Nhưng <code>cp src/* dst/</code> thì <b>không</b> — vì dấu sao do shell ' +
           'mở rộng, và bash cũng theo đúng quy ước đó. Đây là cách người ta làm mất thư mục ' +
           '<code>.git</code> khi "chép cả dự án sang chỗ khác": file thì đủ, lịch sử thì mất sạch. ' +
           'Câu A2 nói tiếp về việc ai mở rộng dấu sao.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Thư mục hiện tại có đúng ba file: <code>gpio.c</code>, <code>main.c</code>, <code>uart.c</code>. ' +
         'Bạn gõ <code>ls [gu]*</code>. Chương trình <code>ls</code> <b>thật sự nhận được</b> những đối ' +
         'số nào?',
      opts: [
        'Nhận đúng một đối số là chuỗi <code>[gu]*</code>, rồi tự đối chiếu với tên các file trong thư mục.',
        'Nhận hai đối số: <code>gpio.c</code> và <code>uart.c</code> — shell đã đối chiếu xong và thay ' +
          'chuỗi đó bằng danh sách tên có thật <b>trước khi</b> <code>ls</code> được khởi động.',
        'Nhận ba đối số <code>gpio.c</code>, <code>main.c</code>, <code>uart.c</code> rồi tự lọc bỏ ' +
          '<code>main.c</code>.',
        'Không nhận đối số nào; <code>ls</code> đọc mẫu <code>[gu]*</code> qua một biến môi trường.'
      ],
      a: 1,
      why: 'Việc mở rộng ký tự đại diện (<i>globbing</i>) là việc của <b>shell</b>, xong xuôi trước khi ' +
           'chương trình tồn tại. Bash đọc thư mục, tìm mọi tên khớp mẫu, sắp xếp, rồi dựng mảng đối số ' +
           'và mới gọi <code>execve()</code>. Từ chỗ ngồi của <code>ls</code>, dòng lệnh của bạn không ' +
           'khác gì <code>ls gpio.c uart.c</code> gõ tay.<br><br>' +
           'Bằng chứng trực tiếp, chạy thật trên máy bạn: <code>echo *</code> in ra ' +
           '<code>gpio.c main.c uart.c</code>. Mà <code>echo</code> thì <b>chắc chắn</b> không biết đọc ' +
           'thư mục — nó chỉ biết in lại đối số nó nhận. Vậy danh sách tên ấy phải do người khác đưa ' +
           'tới, và người đó là bash.<br><br>' +
           'Đây không phải chuyện lý thuyết suông. Nó giải thích vì sao <code>ls *.cpp</code> báo lỗi ' +
           'bằng giọng của <code>ls</code> chứ không phải giọng của shell (B1), vì sao ' +
           '<code>find . -name *.c</code> đúng ở thư mục này và sai ở thư mục kia (C1), và vì sao ' +
           '<code>rm -rf $DIR/*</code> với <code>$DIR</code> rỗng lại là câu lệnh nguy hiểm nhất trong ' +
           'cả bài (E4).' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 1,
      q: 'Bạn có <code>source.txt</code>. Bạn tạo <code>ln source.txt hardlink.txt</code> và ' +
         '<code>ln -s source.txt softlink.txt</code>, rồi <code>rm source.txt</code>. Chuyện gì xảy ra?',
      opts: [
        'Cả hai liên kết cùng hỏng, vì file gốc đã bị xoá.',
        'Cả hai vẫn đọc được, vì liên kết nào cũng giữ một bản sao nội dung.',
        '<code>hardlink.txt</code> vẫn đọc được nguyên vẹn; <code>softlink.txt</code> hỏng — vì liên kết ' +
          'cứng trỏ vào <b>inode</b> (dữ liệu vẫn còn khi số liên kết chưa về 0), còn liên kết mềm chỉ ' +
          'chứa <b>chuỗi tên</b> <code>source.txt</code> mà cái tên đó không còn ai nhận.',
        '<code>softlink.txt</code> vẫn đọc được vì nó tự tìm sang inode; <code>hardlink.txt</code> hỏng ' +
          'vì bản chính đã mất.'
      ],
      a: 2,
      why: 'Chìa khoá là <b>thư mục là một bảng tên → số inode</b>, còn dữ liệu nằm ở inode.<br><br>' +
           '<code>ln</code> thêm một dòng nữa vào bảng, trỏ vào <b>đúng inode cũ</b>. Từ giây đó trở đi ' +
           'hai cái tên hoàn toàn ngang hàng — <b>không có cái nào là "bản chính"</b>. Kết quả thật ' +
           'trên máy bạn cho thấy điều đó: cả hai dòng đều mang số <code>34437</code> và cột số liên ' +
           'kết là <code>2</code>. <code>rm</code> thực chất là lời gọi <code>unlink()</code>: nó xoá ' +
           'một <b>dòng trong bảng</b> rồi giảm bộ đếm. Còn 1 thì dữ liệu còn nguyên.<br><br>' +
           '<code>ln -s</code> tạo một file <b>khác hẳn</b>, có inode riêng (<code>34438</code>), nội ' +
           'dung là mười ký tự <code>source.txt</code>. Nó không biết inode nào cả; mỗi lần bạn mở nó, ' +
           'kernel đọc chuỗi đó ra rồi đi tra lại từ đầu. Tên mất thì tra hụt: ' +
           '<code>cat: softlink.txt: No such file or directory</code>, còn <code>file</code> gọi đúng ' +
           'tên bệnh — <code>broken symbolic link to source.txt</code>.<br><br>' +
           'Đổi lại, chính vì chỉ là một chuỗi tên nên liên kết mềm <b>vượt được ranh giới phân vùng</b> ' +
           'và trỏ được vào thư mục — hai việc liên kết cứng không làm được. Câu C3 bắt bạn chọn giữa ' +
           'hai loại đó với một board thật.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Bạn chép một cây rootfs bằng <code>cp -r</code> thay vì <code>cp -a</code>. So với bản gốc, ' +
         'bản sao <b>chắc chắn</b> khác ở chỗ nào?',
      opts: [
        'Khác ở nội dung file: <code>-r</code> chỉ chép được file văn bản, file nhị phân bị cắt cụt.',
        'Không khác gì cả — <code>-a</code> chỉ là cách viết tắt cho <code>-r</code>.',
        'Khác ở <b>dấu thời gian</b>: mọi file trong bản sao mang thời điểm chép. Nói chung ' +
          '<code>-a</code> giữ siêu dữ liệu (thời gian, chủ sở hữu, liên kết), <code>-r</code> thì tạo ' +
          'file mới nên không có gì bảo đảm.',
        'Khác ở chỗ <code>-r</code> bỏ qua thư mục con, chỉ chép các file nằm ngay tầng đầu.'
      ],
      a: 2,
      why: 'Đo thật trên máy bạn. Một file <code>etc/config</code> được đặt dấu thời gian ' +
           '<code>2020-01-01 17:00</code>, rồi chép hai lần:<br><br>' +
           '<code>cp -r</code> → <code>-rw------- 1 shinarus shinarus 0 2026-08-12 21:58 config</code><br>' +
           '<code>cp -a</code> → <code>-rw------- 1 shinarus shinarus 0 2020-01-01 17:00 config</code>' +
           '<br><br>' +
           'Nội dung giống hệt, quyền cũng giống — cái mất là <b>thời gian</b>. Đáng nói là ' +
           '<code>-a</code> không phải "chép kỹ hơn": nó là <code>-dR --preserve=all</code>, tức là ' +
           '<i>giữ nguyên siêu dữ liệu</i> và <i>không đi theo liên kết mềm</i>. Hai việc đó vô hại khi ' +
           'bạn chép thư mục ảnh chụp, và là sinh tử khi bạn chép một hệ điều hành.<br><br>' +
           'Vì sao dấu thời gian lại quan trọng đến thế: <code>make</code> quyết định biên dịch lại hay ' +
           'không <b>chỉ bằng cách so dấu thời gian</b>. Chép cây mã nguồn bằng <code>-r</code> là đặt ' +
           'mọi file về cùng một thời điểm, và từ đó <code>make</code> không còn cơ sở nào để so — kết ' +
           'quả có thể là build lại toàn bộ, mà cũng có thể là <b>không build lại gì cả</b> trong khi ' +
           'bạn tưởng nó đã build. Câu C2 cho bạn một hậu quả nặng hơn thế.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"<code>mkdir -p a/b/c</code> và <code>mkdir a/b/c</code> chỉ khác nhau ở chỗ ' +
         '<code>-p</code> tạo luôn thư mục cha. Còn khi thư mục đã tồn tại sẵn thì cả hai đều báo lỗi ' +
         'như nhau, nên trong script phải kiểm tra tồn tại trước khi gọi."</i>',
      a: 1,
      why: 'Nửa đầu đúng, nửa sau sai — và cái sai đó đẻ ra ba dòng code thừa trong mọi script.<br><br>' +
           '<code>mkdir a/b/c</code> khi <code>a/b</code> chưa có sẽ báo ' +
           '<code>No such file or directory</code>. Đó là phần ai cũng biết.<br><br>' +
           'Phần bị bỏ sót: <code>-p</code> còn có nghĩa thứ hai, <b>không báo lỗi nếu thư mục đã tồn ' +
           'tại</b>. <code>mkdir a</code> lần thứ hai sẽ báo <code>File exists</code> và trả mã thoát ' +
           '1; <code>mkdir -p a</code> lần thứ hai im lặng và trả mã thoát 0. Thuật ngữ cho tính chất ' +
           'này là <b>idempotent</b> — chạy một lần hay mười lần đều cho cùng một trạng thái cuối.<br><br>' +
           'Vì sao điều đó đáng giá: script build hệ nhúng nào cũng bị chạy lại nhiều lần. Nếu mỗi lệnh ' +
           'trong script đều idempotent thì chạy lại là an toàn, và bạn không cần bọc mỗi lệnh trong ' +
           'một câu <code>if</code> kiểm tra tồn tại. Nhớ lại Bài 4: <code>set -e</code> làm script ' +
           'dừng ngay khi một lệnh trả mã khác 0 — với <code>mkdir</code> trần, lần chạy thứ hai sẽ ' +
           'giết chết cả script vì một "lỗi" không phải là lỗi.',
      rw: 'Viết lại nhận định cho đúng: nói rõ <code>-p</code> có <b>mấy</b> tác dụng, mã thoát của ' +
          'hai lệnh khi thư mục đã tồn tại, và vì sao điều đó khiến câu kiểm tra tồn tại thành thừa.',
      crit: [
        'Nêu tác dụng thứ nhất: tạo cả chuỗi thư mục cha còn thiếu',
        'Nêu tác dụng thứ hai: KHÔNG báo lỗi khi thư mục đã tồn tại',
        'Nêu đúng mã thoát: mkdir trần trả 1 và in File exists; mkdir -p trả 0 và im lặng',
        'Kết luận: không cần kiểm tra tồn tại trước, gọi thẳng mkdir -p',
        'Nối được với set -e của Bài 4: mã thoát 1 sẽ làm dừng script dù không có gì hỏng'
      ],
      sol: '<code>-p</code> có <b>hai</b> tác dụng chứ không phải một. Thứ nhất, nó tạo mọi thư mục cha ' +
           'còn thiếu trên đường đi. Thứ hai — và đây là cái hay bị quên — nó <b>không coi "thư mục đã ' +
           'tồn tại" là lỗi</b>: <code>mkdir a</code> lần hai in <code>mkdir: cannot create directory ' +
           '\'a\': File exists</code> và trả mã thoát <b>1</b>, còn <code>mkdir -p a</code> lần hai im ' +
           'lặng và trả <b>0</b>. Vì thế trong script không cần <code>if [ ! -d a ]</code> gì cả, cứ ' +
           'gọi thẳng <code>mkdir -p</code>. Điều này đặc biệt quan trọng khi script có ' +
           '<code>set -e</code> (Bài 4): mã thoát 1 của lần chạy thứ hai sẽ giết cả script trong khi ' +
           'trạng thái hệ thống hoàn toàn đúng ý bạn.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Nhận định: <i>"Tôi lỡ gõ <code>cat /bin/ls</code>, màn hình phun ra một đống ký tự rác và từ ' +
         'đó gõ gì cũng hiện sai. Vậy là file <code>/bin/ls</code> đã hỏng, phải cài lại gói coreutils; ' +
         'và từ nay không được mở file nhị phân nữa vì mở là hỏng file."</i>',
      a: 1,
      why: 'File hoàn toàn không sao. <code>cat</code> chỉ <b>đọc</b>, nó không có đường nào ghi vào ' +
           'file cả. Cái bị hỏng là <b>trạng thái của terminal</b>, và nó nằm trong RAM của cửa sổ ' +
           'terminal chứ không nằm trên đĩa.<br><br>' +
           'Chuyện xảy ra như sau: trong đống byte nhị phân đó có những dãy tình cờ trùng với ' +
           '<b>chuỗi thoát</b> (escape sequence) — thứ mà terminal hiểu là mệnh lệnh chứ không phải chữ ' +
           'để in. Một trong số đó chuyển bộ ký tự sang chế độ vẽ khung, và thế là mọi chữ bạn gõ sau ' +
           'đó bị ánh xạ thành ký hiệu lạ.<br><br>' +
           'Cách chữa mất một giây: gõ <code>reset</code> rồi Enter (gõ mù cũng được, cứ gõ đúng năm ' +
           'chữ). Nó gửi lệnh đưa terminal về mặc định. <code>tput sgr0</code> chữa được trường hợp nhẹ.' +
           '<br><br>' +
           'Còn muốn nhìn file nhị phân thì dùng công cụ có nhiệm vụ đó. Chạy thật trên máy bạn:<br>' +
           '<code>head -c 16 /bin/cat | od -An -c</code> → ' +
           '<code>177   E   L   F 002 001 001  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0</code><br>' +
           'Không một byte nào lọt xuống terminal dưới dạng lệnh, và bạn đọc được luôn bốn byte đầu — ' +
           '<code>0x7F E L F</code>, chữ ký của định dạng ELF mà cả khoá học này sẽ sống cùng từ ' +
           'Chặng 02 trở đi.',
      rw: 'Viết lại nhận định cho đúng: cái gì hỏng, cái gì không hỏng, chữa bằng lệnh nào, và muốn ' +
          'xem một file nhị phân thì dùng gì.',
      crit: [
        'Khẳng định file KHÔNG hỏng — cat chỉ đọc, không ghi',
        'Chỉ đúng thứ hỏng: trạng thái hiển thị của terminal (do các chuỗi thoát trong dữ liệu nhị phân)',
        'Nêu cách chữa: gõ reset (hoặc tput sgr0)',
        'Nêu công cụ đúng để xem nhị phân: od -An -c, hexdump -C, hoặc xxd',
        'Nhắc được bốn byte đầu 177 E L F là chữ ký ELF'
      ],
      sol: 'File không hỏng. <code>cat</code> chỉ đọc chứ không ghi, nên <code>/bin/ls</code> vẫn ' +
           'nguyên vẹn từng byte. Thứ hỏng là <b>trạng thái của terminal</b>: trong dữ liệu nhị phân có ' +
           'những dãy byte trùng với chuỗi thoát, terminal hiểu chúng là mệnh lệnh (đổi bộ ký tự, đổi ' +
           'màu…) và làm theo. Chữa bằng <code>reset</code>, hoặc <code>tput sgr0</code> nếu chỉ loạn ' +
           'màu. Muốn xem nội dung nhị phân thì dùng <code>od -An -c</code>, <code>hexdump -C</code> ' +
           'hay <code>xxd</code> — chúng in ra dạng chữ số nên không byte nào chạm tới terminal như ' +
           'mệnh lệnh. Ví dụ <code>head -c 16 /bin/cat | od -An -c</code> cho thấy ngay bốn byte ' +
           '<code>177 E L F</code>, chữ ký ELF.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Bạn chạy <code>ln -s source.txt softlink.txt</code>, trong đó <code>source.txt</code> có nội ' +
         'dung 21 byte. Cột <b>kích thước</b> của dòng <code>softlink.txt</code> trong ' +
         '<code>ls -l</code> sẽ là <b>số mấy</b>? (viết một số)',
      a: ['10'],
      ph: 'một số',
      why: '<b>10</b> — đúng bằng số ký tự của chuỗi <code>source.txt</code> (s-o-u-r-c-e-.-t-x-t). ' +
           'Kiểm chứng bằng <code>echo -n "source.txt" | wc -c</code> → <code>10</code>.<br><br>' +
           'Đây là bằng chứng gọn nhất cho việc liên kết mềm <b>không biết gì về file đích</b>. Nội ' +
           'dung của nó là chuỗi đường dẫn, và kích thước của nó là độ dài chuỗi đó — không liên quan ' +
           'tới 21 byte của file kia, cũng không liên quan tới việc file kia còn tồn tại hay không. ' +
           'Dòng thật trên máy bạn: ' +
           '<code>34438 lrwxrwxrwx 1 shinarus shinarus 10 ... softlink.txt -&gt; source.txt</code>.' +
           '<br><br>' +
           'Muốn thấy rõ hơn nữa thì trỏ vào một đường dẫn dài: ' +
           '<code>ln -s /usr/lib/cargo/bin/coreutils/ls mylink</code> cho ra kích thước <b>31</b>, đúng ' +
           'bằng độ dài đường dẫn đó. Câu E1 bắt bạn dự đoán chính con số này trước khi chạy.<br><br>' +
           'Ghi chú kỹ thuật đáng biết: với đường dẫn ngắn (dưới ~60 ký tự) ext4 nhét luôn chuỗi vào ' +
           'trong inode, không cấp block dữ liệu nào — gọi là <i>fast symlink</i>. Nên một liên kết mềm ' +
           'thường tốn <b>0 byte</b> không gian đĩa dù <code>ls</code> báo 10.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi công cụ với <b>tình huống nó là lựa chọn đúng</b>. Chú ý: cả sáu đều "xem file", cái ' +
         'phân biệt chúng là kích thước file và việc bạn cần xem chỗ nào.',
      left: [
        '<code>cat file</code>',
        '<code>less file</code>',
        '<code>head -c 20 file</code>',
        '<code>tail -n +198 file</code>',
        '<code>tail -f file</code>',
        '<code>od -An -c file</code>'
      ],
      right: [
        'Bám theo một file <b>đang được ghi thêm</b>: dừng lại chờ, và in ra ngay khi có dòng mới. Đây ' +
          'là cách bạn theo dõi log của một dịch vụ đang chạy trên board.',
        'In <b>đúng 20 byte đầu</b> — đếm theo byte, không theo dòng. Dùng khi bạn muốn nhìn phần đầu ' +
          'của một file không có khái niệm dòng, ví dụ để kiểm tra chữ ký định dạng.',
        'In toàn bộ ra màn hình rồi trả lại dấu nhắc. Chỉ hợp với file <b>ngắn</b>, vài chục dòng, khi ' +
          'bạn muốn nội dung nằm lại trong lịch sử cuộn của terminal.',
        'Dịch từng byte sang dạng đọc được (số hoặc ký tự có tên), nên xem được file <b>nhị phân</b> mà ' +
          'không có byte nào lọt xuống terminal như một mệnh lệnh.',
        'Mở file trong một trình xem cuộn được cả hai chiều, tìm được bằng <code>/</code>, và ' +
          '<b>không nạp hết file vào bộ nhớ</b> — công cụ đúng cho một file log 200 MB.',
        'In từ <b>dòng thứ 198 đến hết</b>. Dùng khi bạn biết chỗ cần xem nằm gần cuối và muốn bỏ qua ' +
          'phần đầu.'
      ],
      a: [2, 4, 1, 5, 0, 3],
      why: 'Ba cặp đối lập đáng nhớ.<br><br>' +
           '<b><code>cat</code> ↔ <code>less</code>:</b> <code>cat</code> đổ hết ra rồi thoát; với file ' +
           'lớn bạn mất phần đầu vì terminal chỉ giữ được vài nghìn dòng cuộn, và trên đường truyền ' +
           'chậm bạn còn phải ngồi chờ hết. <code>less</code> đọc tới đâu hiện tới đó và cuộn ngược ' +
           'được — nó là lựa chọn mặc định cho bất cứ file nào bạn không chắc dài bao nhiêu.<br><br>' +
           '<b><code>-n</code> ↔ <code>-c</code>:</b> đếm dòng và đếm byte. File nhị phân không có ' +
           '"dòng" nên <code>head -n</code> vô nghĩa với nó, còn <code>head -c</code> thì luôn có ' +
           'nghĩa. Chạy thật trên máy bạn với <code>sample.log</code> (200 dòng, 1692 byte): ' +
           '<code>head -c 20</code> cắt đúng giữa chừng dòng thứ ba, vì 7 + 7 + 6 = 20.<br><br>' +
           '<b><code>tail -n +198</code> ↔ <code>tail -f</code>:</b> một cái là "bắt đầu từ dòng 198" ' +
           '(dấu cộng đổi hẳn nghĩa của con số — không có nó thì <code>tail -n 198</code> là ' +
           '<i>198 dòng cuối</i>), một cái là "đừng thoát, chờ thêm". Trên board, ' +
           '<code>tail -f /var/log/messages</code> là cửa sổ theo dõi hệ thống thường trực.' }
  ],

  /* ══════════════════ B · THÔNG HIỂU ══════════════════ */
  B: [

    { id: 'b1', k: 'multi', tag: 'Đọc output', truc: 0,
      q: 'Ba lệnh dưới đây chạy trong đúng một thư mục, chứa đúng ba file <code>gpio.c</code>, ' +
         '<code>main.c</code>, <code>uart.c</code>. Đọc kết quả thật rồi chọn <b>tất cả</b> các phát ' +
         'biểu đúng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ echo *\n' +
            'gpio.c main.c uart.c\n' +
            '\n' +
            '$ echo "*"\n' +
            '*\n' +
            '\n' +
            '$ ls *.cpp\n' +
            'ls: cannot access \'*.cpp\': No such file or directory\n' +
            '$ echo $?\n' +
            '2\n' +
            '\n' +
            '$ echo *.cpp\n' +
            '*.cpp' }
      ],
      opts: [
        '<code>echo</code> đã đọc thư mục để tìm ra ba cái tên đó.',
        '<code>echo *</code> in ra ba tên vì <b>bash</b> đã thay dấu sao bằng danh sách tên có thật ' +
          'rồi mới gọi <code>echo</code>.',
        'Dấu nháy kép làm bash bỏ qua việc mở rộng, nên <code>echo</code> nhận đúng một đối số là ký ' +
          'tự sao.',
        'Dòng <code>ls: cannot access \'*.cpp\'</code> là do <b><code>ls</code></b> in ra, không phải ' +
          'do bash — bash đã giao nguyên chuỗi <code>*.cpp</code> cho nó vì không tên nào khớp.',
        'Mã thoát <b>2</b> là của <code>ls</code>, nghĩa là "có lỗi nghiêm trọng" theo quy ước riêng ' +
          'của <code>ls</code>.',
        '<code>echo *.cpp</code> in ra <code>*.cpp</code> chứng tỏ khi không khớp được tên nào, bash ' +
          '<b>để nguyên</b> chuỗi có dấu sao và vẫn giao đi.'
      ],
      a: [1, 2, 3, 4, 5],
      why: 'Bốn dòng kết quả này là một thí nghiệm khép kín, chứng minh trọn vẹn "ai mở rộng dấu sao".' +
           '<br><br>' +
           '<b><code>echo *</code> → ba cái tên.</b> <code>echo</code> là chương trình đơn giản nhất ' +
           'hệ thống: nó in lại đúng những gì nhận được, không đọc đĩa, không biết thư mục là gì. Vậy ' +
           'ba cái tên ấy phải do bash đưa tới. Đây là bằng chứng phủ định lựa chọn thứ nhất.<br><br>' +
           '<b><code>echo "*"</code> → một dấu sao.</b> Cùng một chương trình, cùng một thư mục, chỉ ' +
           'khác cặp nháy — mà kết quả đổi hẳn. Chương trình không thể là nơi tạo ra khác biệt đó; ' +
           'khác biệt sinh ra ở tầng shell, đúng như Bài 4 đã dạy về nháy.<br><br>' +
           '<b><code>ls *.cpp</code> → thông báo lỗi mang tên <code>ls</code>.</b> Chi tiết quyết định ' +
           'nằm ở sáu ký tự đầu dòng: <code>ls: </code>. Nếu bash là kẻ báo lỗi thì dòng đó phải bắt ' +
           'đầu bằng <code>bash: </code>. Chuyện thật sự xảy ra: không tên nào khớp, bash theo mặc ' +
           'định <b>để nguyên</b> chuỗi <code>*.cpp</code> và giao cho <code>ls</code> như một tên file ' +
           'bình thường; <code>ls</code> đi tìm một file <i>tên là</i> <code>*.cpp</code>, không thấy, ' +
           'nên than phiền. Câu <code>echo *.cpp</code> ở cuối xác nhận nốt: chính <code>echo</code> ' +
           'cũng nhận được nguyên chuỗi đó.<br><br>' +
           '<b>Mã thoát 2.</b> Bài 4 dạy 0 là thành công, khác 0 là hỏng. <code>ls</code> chia hai mức: ' +
           '1 cho lỗi nhẹ, 2 cho lỗi nghiêm trọng như "không truy cập được thứ được yêu cầu". Trong ' +
           'script, <code>ls x* &gt; /dev/null 2&gt;&amp;1</code> rồi xét <code>$?</code> là một cách ' +
           'kiểm tra sự tồn tại — nhưng là cách tồi, vì nó nhập nhằng với nhiều lỗi khác; ' +
           '<code>test -e</code> mới là công cụ đúng.<br><br>' +
           '<b>Hệ quả bạn phải sống cùng:</b> hành vi "không khớp thì để nguyên" chính là cái bẫy trong ' +
           'câu C1, và là lý do mọi mẫu ký tự đại diện <b>dành cho chương trình khác</b> (find, grep, ' +
           'rsync…) đều phải bỏ trong nháy.' },

    { id: 'b2', k: 'multi', tag: 'Đọc output', truc: 2,
      q: 'Một cây <code>rootfs</code> nhỏ được chép hai lần, bằng <code>cp -r</code> và bằng ' +
         '<code>cp -a</code>. Đọc kết quả thật rồi chọn <b>tất cả</b> các phát biểu đúng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l --time-style=long-iso rootfs/bin rootfs/etc\n' +
            'rootfs/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxr-xr-x 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            '\n' +
            'rootfs/etc:\n' +
            '-rw------- 1 shinarus shinarus 0 2020-01-01 17:00 config\n' +
            '\n' +
            '$ cp -r rootfs copy-r  &&  ls -l --time-style=long-iso copy-r/bin copy-r/etc\n' +
            'copy-r/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxr-xr-x 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            '\n' +
            'copy-r/etc:\n' +
            '-rw------- 1 shinarus shinarus 0 2026-08-12 21:58 config\n' +
            '\n' +
            '$ cp -a rootfs copy-a  &&  ls -l --time-style=long-iso copy-a/bin copy-a/etc\n' +
            'copy-a/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxr-xr-x 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            '\n' +
            'copy-a/etc:\n' +
            '-rw------- 1 shinarus shinarus 0 2020-01-01 17:00 config' }
      ],
      opts: [
        'Khác biệt duy nhất nhìn thấy được nằm ở <b>dấu thời gian</b> của <code>etc/config</code>: ' +
          '<code>cp -r</code> đặt lại thành lúc chép, <code>cp -a</code> giữ nguyên 2020-01-01.',
        '<code>cp -r</code> đã biến liên kết mềm <code>alias</code> thành một bản sao thường, vì cột ' +
          'đầu của nó không còn chữ <code>l</code>.',
        'Trong lần đo này, <b>quyền</b> của <code>config</code> giống nhau ở cả hai bản (<code>600</code>), ' +
          'nên riêng kết quả này không đủ để kết luận <code>-r</code> làm mất quyền.',
        'Vì nội dung mọi file đều giống nhau, hai bản sao dùng thay nhau được trong mọi tình huống.',
        'Dấu thời gian không phải thứ trang trí: <code>make</code> chỉ dựa vào nó để quyết định có ' +
          'biên dịch lại hay không.'
      ],
      a: [0, 2, 4],
      why: '<b>Vì sao lựa chọn 2 sai:</b> cả hai bản đều còn dòng ' +
           '<code>lrwxrwxrwx ... alias -&gt; real</code>. Liên kết mềm <b>vẫn là liên kết mềm</b> sau ' +
           '<code>cp -r</code>. Đây là chỗ dễ nhớ nhầm, nên hãy nhớ theo cờ: thứ khiến ' +
           '<code>cp</code> <i>đi theo</i> liên kết là <code>-L</code>, còn <code>-r</code> mặc định ' +
           'giữ nguyên (<code>-a</code> = <code>-dR --preserve=all</code>, chữ <code>d</code> chỉ nói ' +
           'rõ điều đó ra).<br><br>' +
           '<b>Vì sao lựa chọn 3 phải được chọn — và đây là phần trung thực của bài đo:</b> nhiều tài ' +
           'liệu nói "<code>-r</code> làm mất quyền". Lần đo này <b>không</b> cho thấy điều đó: ' +
           '<code>600</code> vẫn là <code>600</code>. Lý do là quyền của file đích được đặt theo quyền ' +
           'nguồn rồi lọc qua <code>umask</code>, mà <code>umask</code> ở đây là <code>022</code> — ' +
           '<code>600</code> và <code>755</code> đi qua bộ lọc ấy không suy suyển. Bài học phương pháp ' +
           'quan trọng hơn bài học nội dung: <b>một phép đo không thấy khác biệt không có nghĩa là ' +
           'không có khác biệt</b>. Thứ <code>-r</code> chắc chắn đánh mất trên một cây rootfs thật là ' +
           '<b>chủ sở hữu</b> (mọi file thành của người chạy lệnh) và <b>bit setuid</b> — nhưng muốn ' +
           'thấy thì phải chép cây có file của root, tức là phải chạy bằng <code>sudo</code>.<br><br>' +
           '<b>Vì sao lựa chọn 4 sai:</b> "nội dung giống nhau" chưa bao giờ đủ. Câu C2 cho bạn xem một ' +
           'bản sao đủ từng byte mà board không boot được.<br><br>' +
           '<b>Quy tắc rút ra, dùng suốt phần còn lại của khoá học:</b> chép thư mục ảnh hay tài liệu ' +
           'thì <code>-r</code> thoải mái. Chép bất cứ thứ gì <b>sẽ được chạy</b> — rootfs, cây build, ' +
           'thư mục có liên kết mềm — thì <code>cp -a</code>, không cần suy nghĩ.' },

    { id: 'b3', k: 'free', tag: 'Giải thích vì sao',
      q: 'Thư mục <code>project</code> chứa 4 thư mục con và không có gì khác. <code>ls -ld</code> báo ' +
         'số liên kết là <b>6</b>. Tạo thêm một thư mục con thứ năm thì thành <b>7</b>. Hãy giải thích ' +
         'con số đó được cấu thành từ đâu, và vì sao <b>tạo file</b> thường trong ' +
         '<code>project</code> lại không làm nó tăng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -ld project\n' +
            'drwxr-xr-x 6 shinarus shinarus 4096 Aug 12 22:00 project\n' +
            '\n' +
            '$ mkdir project/tools ; ls -ld project\n' +
            'drwxr-xr-x 7 shinarus shinarus 4096 Aug 12 22:00 project\n' +
            '\n' +
            '$ rmdir project/tools ; ls -ld project\n' +
            'drwxr-xr-x 6 shinarus shinarus 4096 Aug 12 22:00 project\n' +
            '\n' +
            '$ ls -la project\n' +
            'total 24\n' +
            'drwxr-xr-x 6 shinarus shinarus 4096 Aug 12 22:00 .\n' +
            'drwxr-xr-x 3 shinarus shinarus 4096 Aug 12 22:00 ..\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug 12 22:00 build\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug 12 22:00 docs\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug 12 22:00 include\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug 12 22:00 src' }
      ],
      rows: 6,
      crit: [
        'Chỉ ra ba nguồn: tên project trong thư mục cha, mục "." bên trong chính nó, và mục ".." của mỗi thư mục con',
        'Ráp đúng phép tính: 1 + 1 + 4 = 6 (hoặc nói gọn: 2 + số thư mục con)',
        'Giải thích được vì sao file thường không làm tăng: file không chứa mục ".." nên không trỏ ngược lại cha',
        'Nói được rằng số liên kết đếm số TÊN trỏ vào inode của thư mục, chứ không đếm nội dung bên trong',
        'Nêu được cách dùng thực tế: nhìn số liên kết là biết ngay thư mục có bao nhiêu thư mục con'
      ],
      sol: 'Số liên kết đếm <b>bao nhiêu cái tên đang trỏ vào inode này</b>. Với thư mục ' +
           '<code>project</code> có ba nguồn:<br>' +
           '<b>1.</b> tên <code>project</code> nằm trong thư mục cha;<br>' +
           '<b>2.</b> mục <code>.</code> nằm bên trong chính <code>project</code> — mỗi thư mục đều tự ' +
           'trỏ vào mình;<br>' +
           '<b>3.</b> mục <code>..</code> bên trong <b>mỗi thư mục con</b>, và ở đây có bốn: ' +
           '<code>build</code>, <code>docs</code>, <code>include</code>, <code>src</code>.<br><br>' +
           'Cộng lại: 1 + 1 + 4 = <b>6</b>. Thêm <code>tools</code> thì thêm một mục <code>..</code> ' +
           'nữa → 7. Công thức: <b>2 + số thư mục con</b>.<br><br>' +
           'File thường không làm tăng con số này vì bên trong file không có mục <code>..</code> — file ' +
           'không trỏ ngược lại thư mục chứa nó. Đó cũng là lý do <code>ls -ld</code> của một thư mục ' +
           'chứa 500 file vẫn báo <b>2</b>.<br><br>' +
           'Dùng được ngay: nhìn cột số liên kết của một thư mục là biết nó có mấy thư mục con mà không ' +
           'cần mở ra. Và nó giải thích luôn vì sao <code>ln</code> từ chối tạo liên kết cứng tới thư ' +
           'mục (<code>hard link not allowed for directory</code>): thêm một cái tên nữa cho một thư ' +
           'mục là tạo ra khả năng có vòng lặp trong cây, mà cả <code>find</code> lẫn ' +
           '<code>rm -r</code> đều không có cách nào thoát ra.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp', truc: 1,
      q: 'Cùng một bản cài Ubuntu dùng <b>cả hai</b> loại liên kết, cho hai việc khác hẳn nhau. Đọc hai ' +
         'kết quả thật dưới đây rồi trả lời: mỗi nơi dùng loại nào, <b>vì sao chỗ đó không dùng được ' +
         'loại kia</b>, và điều gì xảy ra với <code>du -sh</code> nếu 115 cái tên kia là 115 file thật.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l /usr/bin/ls\n' +
            'lrwxrwxrwx 1 root root 29 Mar 30 23:50 /usr/bin/ls -> ../lib/cargo/bin/coreutils/ls\n' +
            '\n' +
            '$ ls -li /usr/lib/cargo/bin/coreutils/ls /usr/lib/cargo/bin/coreutils/cat /usr/lib/cargo/bin/coreutils/cp\n' +
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/cat\n' +
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/cp\n' +
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/ls\n' +
            '\n' +
            '$ ls /usr/lib/cargo/bin/coreutils | wc -l\n' +
            '114\n' +
            '\n' +
            '$ du -sh /usr/lib/cargo/bin/coreutils/\n' +
            '11M\t/usr/lib/cargo/bin/coreutils/' }
      ],
      rows: 8,
      crit: [
        'Nhận ra /usr/bin/ls là liên kết MỀM: cột đầu là l, có mũi tên, kích thước 29 = độ dài chuỗi đường dẫn',
        'Nhận ra ba file trong coreutils/ là liên kết CỨNG: cùng số inode 1585 và số liên kết 115',
        'Giải thích vì sao chỗ /usr/bin phải dùng mềm: đích nằm ở cây khác (/usr/lib), và mềm trỏ được qua mọi ranh giới, sửa được bằng cách trỏ lại',
        'Giải thích vì sao chỗ coreutils phải dùng cứng: cần 115 cái TÊN cho cùng một chương trình để argv[0] khác nhau, mà không tốn thêm dung lượng',
        'Tính đúng cái giá nếu là 115 file thật: 115 × 11 352 352 B ≈ 1,3 GB thay vì 11 MB',
        'Nói được du -sh chỉ đếm mỗi inode MỘT lần nên báo 11M — đúng với dung lượng thật đang chiếm'
      ],
      sol: '<b>/usr/bin/ls là liên kết mềm.</b> Dấu hiệu: cột đầu là <code>l</code>, có mũi tên, và kích ' +
           'thước <b>29</b> chính là độ dài chuỗi <code>../lib/cargo/bin/coreutils/ls</code>. Chỗ này ' +
           '<b>bắt buộc</b> phải mềm: đích nằm trong một cây khác, và nếu ngày mai bản cài đổi sang một ' +
           'đường dẫn khác thì chỉ cần trỏ lại cái tên — không phải đụng vào dữ liệu.<br><br>' +
           '<b>Trong coreutils/ là liên kết cứng.</b> Dấu hiệu: <code>cat</code>, <code>cp</code>, ' +
           '<code>ls</code> mang <b>cùng số inode 1585</b>, cùng số liên kết <b>115</b>, cùng kích ' +
           'thước 11 352 352 byte. Nghĩa là <b>chỉ có một chương trình</b>, được đặt 115 cái tên. Đó là ' +
           'kiểu <i>multi-call binary</i>: chương trình xem <code>argv[0]</code> — cái tên nó được gọi ' +
           '— để biết phải cư xử như <code>ls</code> hay như <code>cp</code>. Chỗ này ' +
           '<b>không dùng mềm được cho tốt</b>: 115 liên kết mềm cũng chạy, nhưng mỗi lần mở file phải ' +
           'tra thêm một tầng, và quan trọng hơn, liên kết cứng cho ta 115 cái tên <b>ngang hàng</b>, ' +
           'không có cái nào là bản gốc để mà hỏng.<br><br>' +
           '<b>Cái giá tiết kiệm được:</b> nếu là 115 file thật thì 115 × 11 352 352 ≈ <b>1,3 GB</b>. ' +
           'Thực tế <code>du -sh</code> báo <b>11M</b>, vì <code>du</code> nhớ số inode đã gặp và chỉ ' +
           'đếm mỗi inode một lần — con số nó báo là dung lượng <b>thật sự</b> đang bị chiếm.<br><br>' +
           'Ở hệ nhúng, đây chính xác là cách BusyBox hoạt động: một file nhị phân, hàng trăm liên kết ' +
           'trong <code>/bin</code> và <code>/sbin</code>. Bạn sẽ dựng cái đó bằng tay ở Chặng 07.' },

    { id: 'b5', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một bạn học nói: <i>"Dòng <code>total</code> ở đầu <code>ls -l</code> là tổng kích thước các ' +
         'file trong thư mục. Thư mục <code>src</code> báo <code>total 4</code> nghĩa là 4 byte, mà ' +
         'trong đó có file <code>main.c</code> 29 byte, vậy <code>ls</code> tính sai. Còn ' +
         '<code>ls -lh</code> báo <code>total 4.0K</code> lại là một con số khác nữa."</i> Hãy chỉ ra ' +
         '<b>tất cả</b> chỗ sai và nói đúng lại.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l project/src\n' +
            'total 4\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug 12 22:00 gpio.c\n' +
            '-rw-r--r-- 1 shinarus shinarus 29 Aug 12 22:00 main.c\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug 12 22:00 uart.c\n' +
            '\n' +
            '$ ls -lh project/src\n' +
            'total 4.0K\n' +
            '\n' +
            '$ ls -l project/docs\n' +
            'total 0\n' +
            '-rw-r--r-- 1 shinarus shinarus 0 Aug 12 22:00 README.md\n' +
            '-rw-r--r-- 1 shinarus shinarus 0 Aug 12 22:00 notes.txt\n' +
            '\n' +
            '$ du -sh project ; du -sh --apparent-size project\n' +
            '24K\tproject\n' +
            '29\tproject' }
      ],
      rows: 7,
      crit: [
        'Bác bỏ "tổng kích thước": total đếm số KHỐI đĩa đã cấp phát, không phải số byte nội dung',
        'Nói rõ đơn vị mặc định của total trong ls -l là khối 1 KiB (nên 4 = 4 KiB)',
        'Chỉ ra total 4 và total 4.0K là CÙNG một giá trị, chỉ khác cách in — không phải hai con số khác nhau',
        'Giải thích được docs báo total 0: hai file rỗng không được cấp khối nào',
        'Giải thích được vì sao một file 29 byte lại chiếm nguyên một khối 4 KiB (đơn vị cấp phát nhỏ nhất)',
        'Đối chiếu được với du: 24K là chỗ THẬT SỰ chiếm, 29 (--apparent-size) là tổng byte nội dung'
      ],
      sol: '<b>Sai thứ nhất: <code>total</code> không phải tổng byte.</b> Nó là tổng số <b>khối đĩa đã ' +
           'cấp phát</b> cho các file trong thư mục, tính theo đơn vị 1 KiB trong ' +
           '<code>ls -l</code>. <code>total 4</code> nghĩa là <b>4 KiB</b>, không phải 4 byte.<br><br>' +
           '<b>Sai thứ hai: hai con số không hề khác nhau.</b> <code>total 4</code> và ' +
           '<code>total 4.0K</code> là cùng một giá trị; <code>-h</code> chỉ đổi cách in cho dễ đọc.' +
           '<br><br>' +
           '<b>Sai thứ ba: <code>ls</code> không tính sai chỗ nào.</b> File <code>main.c</code> dài 29 ' +
           'byte nhưng hệ thống file cấp phát theo khối, và khối nhỏ nhất là 4 KiB — 29 byte vẫn chiếm ' +
           'trọn một khối. Hai file kia rỗng nên không được cấp khối nào. 1 khối × 4 KiB = ' +
           '<code>total 4</code>. Thư mục <code>docs</code> chỉ có hai file rỗng nên ' +
           '<code>total 0</code>: đó là bằng chứng gọn nhất cho việc con số này đếm <b>chỗ đã cấp</b> ' +
           'chứ không đếm file.<br><br>' +
           '<b>Kiểm chứng bằng công cụ đúng.</b> <code>du -sh project</code> → <b>24K</b> (chỗ thật sự ' +
           'chiếm, gồm cả bản thân các thư mục), còn <code>du -sh --apparent-size project</code> → ' +
           '<b>29</b> (tổng byte nội dung). Hai câu hỏi khác nhau, hai con số khác nhau, cả hai đều ' +
           'đúng.<br><br>' +
           'Ở hệ nhúng, khoảng cách giữa hai con số ấy là tiền thật. Một rootfs có 3 000 file cấu hình ' +
           'nhỏ chiếm <b>12 MB</b> khối đĩa trong khi tổng nội dung chỉ vài trăm KB — đó là lý do người ' +
           'ta chọn hệ thống file có khối nhỏ, hoặc dùng squashfs nén, cho chip flash 8 MB.' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao',
      q: 'Vì sao <code>head -n 1 /bin/cat</code> gần như vô nghĩa, trong khi ' +
         '<code>head -c 16 /bin/cat | od -An -c</code> lại cho ra một kết quả <b>đọc được và có ích</b>? ' +
         'Giải thích cả cơ chế lẫn ý nghĩa của bốn byte đầu tiên trong kết quả thật dưới đây.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ head -c 16 /bin/cat | od -An -c\n' +
            ' 177   E   L   F 002 001 001  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0' }
      ],
      rows: 6,
      crit: [
        'Nói rõ -n đếm DÒNG, mà file nhị phân không có khái niệm dòng (byte 0x0A chỉ xuất hiện ngẫu nhiên)',
        'Nói rõ -c đếm BYTE nên luôn có nghĩa với mọi loại file',
        'Nêu vai trò của od: dịch từng byte sang số/ký tự có tên, không byte nào tới terminal như mệnh lệnh',
        'Đọc đúng bốn byte đầu: 0x7F rồi ba chữ E L F — chữ ký (magic number) của định dạng ELF',
        'Nêu được ít nhất một byte tiếp theo: 002 = ELF 64-bit (hoặc 001 sau đó = little-endian)',
        'Nêu công dụng thực tế: nhận dạng file bằng vài byte đầu, đúng như lệnh file vẫn làm'
      ],
      sol: '<b><code>-n</code> đếm dòng, <code>-c</code> đếm byte.</b> "Dòng" là một khái niệm của văn ' +
           'bản: các byte cho tới khi gặp <code>\\n</code> (0x0A). Trong một file nhị phân, byte 0x0A ' +
           'vẫn xuất hiện — nhưng ngẫu nhiên, và nó không đánh dấu gì cả. Vậy ' +
           '<code>head -n 1</code> trả về "mọi byte cho tới byte 0x0A đầu tiên", một lượng dữ liệu tuỳ ' +
           'hứng, mà lại đổ thẳng xuống terminal. <code>-c</code> thì luôn có nghĩa vì mọi file đều là ' +
           'một dãy byte.<br><br>' +
           '<b><code>od</code> làm gì:</b> nó không in byte gốc mà in <b>tên</b> của byte — chữ nếu in ' +
           'được, số bát phân nếu không. Vì thế không byte nào chạm tới terminal như một chuỗi thoát, ' +
           'và bạn không bao giờ phải gõ <code>reset</code> vì <code>od</code>.<br><br>' +
           '<b>Đọc kết quả:</b> <code>177</code> là số bát phân của <b>0x7F</b>, rồi ba chữ ' +
           '<code>E L F</code>. Bốn byte ấy là <b>chữ ký</b> (magic number) của định dạng ELF — mọi ' +
           'chương trình chạy được, mọi thư viện <code>.so</code>, mọi file <code>.o</code> trên Linux ' +
           'đều mở đầu bằng đúng bốn byte đó. Byte thứ năm <code>002</code> nghĩa là 64-bit (1 là ' +
           '32-bit), byte thứ sáu <code>001</code> nghĩa là little-endian.<br><br>' +
           'Đây chính là cách lệnh <code>file</code> làm việc: nó đọc vài byte đầu rồi tra bảng chữ ký. ' +
           'Và đây là kỹ năng bạn sẽ dùng lại rất nhiều — ở Chặng 02 khi mổ file ELF do trình biên dịch ' +
           'sinh ra, và ở Chặng 06 khi phải xác nhận một ảnh kernel có đúng định dạng bootloader chờ đợi ' +
           'hay không, trên một board không có <code>file</code>.' }
  ],

  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 0,
      q: 'Đồng nghiệp gửi cho bạn một script tìm file. Trong thư mục <code>project/</code> nó chạy đúng ' +
         'và liệt kê đủ ba file. Vào thư mục <code>project/src/</code> chạy <b>y hệt</b> thì nó báo lỗi. ' +
         'Không có gì thay đổi giữa hai lần chạy ngoài thư mục đang đứng. Hãy chẩn đoán: chuyện gì đang ' +
         'xảy ra, vì sao đúng thư mục đó mới hỏng, và sửa thế nào.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ cd ~/project ; ls\n' +
            'build  docs  include  src\n' +
            '$ find . -name *.c\n' +
            './src/uart.c\n' +
            './src/main.c\n' +
            './src/gpio.c\n' +
            '$ echo $?\n' +
            '0\n' +
            '\n' +
            '$ cd ~/project/src ; ls\n' +
            'gpio.c  main.c  uart.c\n' +
            '$ find . -name *.c\n' +
            'find: paths must precede expression: `main.c\'\n' +
            'find: possible unquoted pattern after predicate `-name\'?\n' +
            '$ echo $?\n' +
            '1' }
      ],
      rows: 8,
      crit: [
        'Chỉ ra thủ phạm là shell mở rộng *.c TRƯỚC khi find chạy, không phải find bị lỗi',
        'Giải thích trường hợp chạy đúng: trong project/ không có file .c nào nên không khớp, bash để nguyên chuỗi *.c và find nhận đúng mẫu',
        'Giải thích trường hợp hỏng: trong src/ có ba file .c nên bash thay bằng ba tên, find nhận -name gpio.c main.c uart.c',
        'Đọc đúng thông báo lỗi: find phàn nàn vì main.c đứng sau biểu thức, tức là nó thấy thừa đối số',
        'Nêu cách sửa: bỏ mẫu trong nháy — find . -name "*.c" (hoặc \'*.c\', hoặc \\*.c)',
        'Rút ra quy tắc chung: mẫu dành cho CHƯƠNG TRÌNH KHÁC diễn giải thì phải được bảo vệ khỏi shell'
      ],
      sol: '<b>Chẩn đoán: shell đã ăn mất mẫu tìm kiếm.</b> <code>find</code> không hề bị lỗi và không ' +
           'hề cư xử khác nhau — nó chỉ nhận được hai dòng lệnh khác nhau ở hai chỗ.<br><br>' +
           '<b>Trong <code>project/</code>:</b> thư mục hiện tại không có file <code>.c</code> nào, ' +
           'nên <code>*.c</code> không khớp cái tên nào. Bash mặc định <b>để nguyên</b> chuỗi và giao ' +
           'đi. <code>find</code> nhận đúng <code>find . -name *.c</code> — nghĩa là nhận đúng cái mẫu ' +
           'bạn muốn — rồi tự nó đi so mẫu với từng file trong cây. Chạy đúng.<br><br>' +
           '<b>Trong <code>src/</code>:</b> thư mục hiện tại có ba file <code>.c</code>. Bash mở rộng ' +
           'ngay, và <code>find</code> thật sự nhận được:<br>' +
           '<code>find . -name gpio.c main.c uart.c</code><br>' +
           'Nó lấy <code>gpio.c</code> làm giá trị cho <code>-name</code>, rồi thấy còn thừa ' +
           '<code>main.c</code> và <code>uart.c</code> nằm sau biểu thức. Thông báo lỗi nói đúng bệnh, ' +
           'chỉ là nói bằng ngôn ngữ của <code>find</code>: <code>paths must precede expression: ' +
           '`main.c\'</code>, và câu gợi ý tiếp theo còn đoán trúng nguyên nhân — ' +
           '<code>possible unquoted pattern after predicate `-name\'?</code><br><br>' +
           '<b>Sửa:</b> bỏ mẫu vào nháy để bash không đụng tới nó — <code>find . -name \'*.c\'</code>. ' +
           'Chạy được ở mọi thư mục.<br><br>' +
           '<b>Quy tắc mang theo suốt khoá học:</b> khi dấu sao là <i>của bạn</i>, dành cho shell mở ' +
           'rộng thành tên file có thật, thì để trần. Khi dấu sao là <i>của chương trình</i> — ' +
           '<code>find -name</code>, <code>grep</code>, <code>rsync --exclude</code>, ' +
           '<code>tar --wildcards</code> — thì <b>luôn</b> bỏ trong nháy. Loại lỗi này đặc biệt độc ở ' +
           'chỗ nó phụ thuộc vào thư mục đang đứng, nên nó chạy tốt trên máy bạn và hỏng trên máy build ' +
           'hoặc trong CI, nơi không ai ngồi xem.' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', truc: 2,
      q: 'Trước khi vọc một board, bạn sao lưu rootfs từ WSL sang ổ Windows cho chắc, rồi sau đó khôi ' +
         'phục lại. Bạn đã dùng <code>cp -a</code> đúng như sách dạy. Số file khớp, ' +
         '<code>diff -r</code> không kêu ca gì về nội dung. Nhưng bản khôi phục nạp lên board thì ' +
         'không boot, và nếu chroot vào thì <code>ssh</code> từ chối làm việc. Hãy chẩn đoán bằng kết ' +
         'quả thật dưới đây: cái gì đã mất, mất ở khâu nào, và phải làm thế nào cho đúng.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ ls -l --time-style=long-iso rootfs/bin rootfs/etc\n' +
            'rootfs/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxr-xr-x 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            'rootfs/etc:\n' +
            '-rw------- 1 shinarus shinarus 0 2020-01-01 17:00 config\n' +
            '\n' +
            '$ cp -a rootfs /mnt/c/Users/DELL/backup-rootfs ; echo $?\n' +
            '0\n' +
            '$ ls -l --time-style=long-iso /mnt/c/Users/DELL/backup-rootfs/bin /mnt/c/Users/DELL/backup-rootfs/etc\n' +
            'backup-rootfs/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxrwxrwx 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            'backup-rootfs/etc:\n' +
            '-rwxrwxrwx 1 shinarus shinarus 0 2020-01-01 17:00 config\n' +
            '\n' +
            '$ cp -a /mnt/c/Users/DELL/backup-rootfs ./restored\n' +
            '$ ls -l --time-style=long-iso restored/bin restored/etc\n' +
            'restored/bin:\n' +
            'lrwxrwxrwx 1 shinarus shinarus 4 2026-08-12 21:58 alias -> real\n' +
            '-rwxrwxrwx 1 shinarus shinarus 6 2026-08-12 21:58 real\n' +
            'restored/etc:\n' +
            '-rwxrwxrwx 1 shinarus shinarus 0 2020-01-01 17:00 config' }
      ],
      rows: 9,
      crit: [
        'Chỉ ra cái mất: QUYỀN — mọi file thành 0777 (rwxrwxrwx), trong khi nội dung và dấu thời gian còn nguyên',
        'Chỉ đúng khâu mất: lúc GHI SANG /mnt/c, vì NTFS qua lớp chuyển tiếp không lưu được quyền kiểu Unix',
        'Nhấn mạnh cp -a đã làm hết sức và trả mã thoát 0 — không có lỗi nào được báo, đây là hỏng IM LẶNG',
        'Nêu hệ quả cụ thể: /etc/shadow từ 600 thành 777 nên ai cũng đọc được, và ssh từ chối chạy khi quyền quá rộng',
        'Nêu thêm một mất mát nữa: chủ sở hữu — mọi file vốn của root nay thành của tài khoản chạy lệnh',
        'Nêu cách làm đúng: đóng gói thành MỘT file lưu được siêu dữ liệu rồi mới đưa sang, ví dụ tar (sudo tar czf ...), hoặc giữ bản sao lưu bên trong hệ thống file Linux',
        'Nói được vì sao diff -r không phát hiện: nó so nội dung, không so siêu dữ liệu'
      ],
      sol: '<b>Cái mất là quyền, và nó mất im lặng.</b> Nhìn cột đầu: trong bản gốc ' +
           '<code>etc/config</code> là <code>-rw-------</code> (600) và <code>bin/real</code> là ' +
           '<code>-rwxr-xr-x</code> (755). Sau khi đi qua <code>/mnt/c</code>, <b>cả hai đều thành ' +
           '<code>-rwxrwxrwx</code></b> (777). Nội dung không suy suyển, dấu thời gian 2020-01-01 vẫn ' +
           'còn, liên kết mềm vẫn là liên kết mềm — nên <code>diff -r</code> im lặng và số file thì ' +
           'khớp.<br><br>' +
           '<b>Mất ở khâu nào:</b> ngay lúc <b>ghi sang</b> <code>/mnt/c</code>. Đó là ổ NTFS nhìn qua ' +
           'lớp chuyển tiếp giữa hai hệ điều hành (Bài 3). Lớp đó không có chỗ để lưu bit quyền kiểu ' +
           'Unix nên nó bịa ra một giá trị mặc định cho mọi file. <code>cp -a</code> đã làm đúng phần ' +
           'việc của nó và trả mã thoát <b>0</b>: nó yêu cầu đặt quyền, hệ thống file bên kia nhận ' +
           'lệnh rồi lờ đi. <b>Không một dòng cảnh báo nào.</b> Đường về cũng không cứu được: chép ' +
           'ngược lại chỉ mang theo 777, vì thông tin gốc đã không còn ở đâu cả.<br><br>' +
           '<b>Vì sao board chết:</b> <code>/etc/shadow</code> phải là 640 hoặc chặt hơn; thành 777 thì ' +
           'mọi tiến trình đọc được băm mật khẩu. <code>ssh</code> và <code>sudo</code> <b>tự kiểm tra ' +
           'quyền file cấu hình của chính mình</b> và từ chối chạy nếu quyền quá rộng — đó là tính ' +
           'năng chống tự bắn vào chân, không phải lỗi. Thêm nữa, bit <b>setuid</b> của ' +
           '<code>/bin/su</code>, <code>ping</code>… biến mất, và <b>chủ sở hữu</b> cũng mất: mọi file ' +
           'vốn của <code>root</code> nay mang tên tài khoản đã chạy lệnh chép.<br><br>' +
           '<b>Làm đúng thế nào:</b> đóng gói cây thư mục thành <b>một file duy nhất</b> biết lưu siêu ' +
           'dữ liệu, rồi hẵng đưa file đó sang ổ Windows: ' +
           '<code>sudo tar czf /mnt/c/Users/DELL/rootfs.tar.gz -C ~/rootfs .</code>. Bên trong file ' +
           'tar, quyền và chủ sở hữu là <i>nội dung</i> chứ không còn là siêu dữ liệu, nên NTFS không ' +
           'có cơ hội làm mất chúng; bung ra bằng <code>sudo tar xzf</code> thì được nguyên bản. Quy ' +
           'tắc chung: <b>đừng bao giờ để một cây rootfs nằm trần trên một hệ thống file không phải ' +
           'Linux.</b>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 1,
      q: 'Board của bạn có <b>8 MB flash</b> chứa <code>/</code> (gồm <code>/bin</code>, ' +
         '<code>/etc</code>) và một <b>thẻ SD</b> được gắn vào <code>/mnt/sd</code> lúc chạy. Bạn cần ' +
         'chương trình <code>/bin/report</code> luôn gọi được, nhưng file nhị phân của nó nặng 3 MB nên ' +
         'phải để trên thẻ SD tại <code>/mnt/sd/tools/report</code>. Hãy quyết định: dùng <b>liên kết ' +
         'cứng hay liên kết mềm</b>, vì sao loại kia <b>không</b> dùng được, và điều gì xảy ra khi hệ ' +
         'thống khởi động trong lúc thẻ SD <b>chưa</b> được gắn.',
      rows: 8,
      crit: [
        'Chọn liên kết MỀM: ln -s /mnt/sd/tools/report /bin/report',
        'Nêu đúng lý do loại trừ liên kết cứng: nó trỏ vào số inode, mà số inode chỉ có nghĩa TRONG một hệ thống file — flash và thẻ SD là hai hệ thống file khác nhau',
        'Nhắc được thông báo lỗi thật sẽ nhận nếu cố dùng ln: Invalid cross-device link',
        'Nói được cái giá phải trả trên flash: liên kết mềm chỉ tốn độ dài chuỗi đường dẫn (khoảng 22 byte), không phải 3 MB',
        'Trả lời tình huống chưa gắn thẻ: liên kết vẫn tồn tại nhưng hỏng (dangling), gọi /bin/report sẽ báo No such file or directory',
        'Nêu cách xử lý hợp lý: script khởi động phải kiểm tra thẻ đã gắn chưa (ví dụ test -e /mnt/sd/tools/report) rồi mới chạy, hoặc báo lỗi rõ ràng thay vì để chết giữa chừng'
      ],
      sol: '<b>Bắt buộc dùng liên kết mềm:</b> ' +
           '<code>ln -s /mnt/sd/tools/report /bin/report</code>.<br><br>' +
           '<b>Vì sao liên kết cứng không dùng được — và đây là lý do kỹ thuật, không phải quy ước:</b> ' +
           'liên kết cứng là một dòng trong bảng tên → <b>số inode</b>. Số inode chỉ có nghĩa bên trong ' +
           '<i>một</i> hệ thống file: inode 4231 của flash và inode 4231 của thẻ SD là hai thứ không ' +
           'liên quan gì đến nhau. Không có chỗ nào trong một mục thư mục để ghi "inode này thuộc thiết ' +
           'bị nào". Vì thế kernel chặn thẳng, và bạn nhận đúng dòng chữ đã thấy ở Bài 6: ' +
           '<code>ln: failed to create hard link ... : Invalid cross-device link</code>.<br><br>' +
           '<b>Cái giá trên flash:</b> liên kết mềm chứa chuỗi ' +
           '<code>/mnt/sd/tools/report</code> — 21 ký tự. Nó không sao chép 3 MB nào cả; thực tế với ' +
           'đường dẫn ngắn thế này nhiều hệ thống file còn nhét luôn chuỗi vào inode, tốn <b>0 block</b>. ' +
           'Đúng thứ bạn cần với 8 MB.<br><br>' +
           '<b>Khi thẻ SD chưa gắn:</b> liên kết <b>vẫn tồn tại</b> — <code>ls -l /bin</code> vẫn thấy ' +
           'nó, cột đầu vẫn là <code>l</code>. Nhưng nó trỏ vào một cái tên chưa có ai nhận, nên gọi ' +
           '<code>/bin/report</code> sẽ nhận <code>No such file or directory</code> — một thông báo ' +
           'gây hoang mang vì <code>ls</code> rõ ràng thấy file. <code>file /bin/report</code> gọi đúng ' +
           'tên bệnh: <code>broken symbolic link to /mnt/sd/tools/report</code>, và ' +
           '<code>find /bin -xtype l</code> liệt kê được mọi liên kết hỏng như vậy.<br><br>' +
           '<b>Xử lý cho đúng kiểu hệ nhúng:</b> đừng để chương trình chết giữa chừng. Script khởi động ' +
           'nên kiểm tra trước — <code>if [ -e /mnt/sd/tools/report ]; then ... else echo "SD chua ' +
           'gan"; fi</code> — hoặc chờ sự kiện gắn thẻ rồi mới bật dịch vụ. Đây chính xác là loại quyết ' +
           'định bạn sẽ gặp lại ở Chặng 07 khi tự dựng rootfs.' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Bạn viết bộ cập nhật phần mềm cho một board: tải file mới về <code>/tmp/app.bin</code> ' +
         '(<code>/tmp</code> là <code>tmpfs</code>, nằm trong RAM), rồi ' +
         '<code>mv /tmp/app.bin /usr/bin/app</code> (<code>/usr</code> nằm trên eMMC). Trên máy bàn thử ' +
         'thì <code>mv</code> tức thời. Trên board thì nó mất vài giây, và một lần mất điện giữa chừng ' +
         'đã để lại một <code>/usr/bin/app</code> <b>cụt</b> khiến board không khởi động lại được. Giải ' +
         'thích vì sao cùng một lệnh lại có hai hành vi, và sửa quy trình cập nhật thế nào.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật — cùng lệnh mv, cùng file 200 MB', nocopy: true, code:
            '$ time mv big.bin dstA/big.bin          # trong cùng hệ thống file\n' +
            'real\t0m0.002s\n' +
            '\n' +
            '$ time mv dstA/big.bin /mnt/c/Users/DELL/big.bin   # sang hệ thống file khác\n' +
            'real\t0m2.157s' }
      ],
      rows: 8,
      crit: [
        'Giải thích mv trong cùng hệ thống file: chỉ sửa bảng tên→inode (rename), dữ liệu không nhúc nhích, nên 0,002 s',
        'Giải thích mv qua hệ thống file khác: buộc phải CHÉP từng byte rồi xoá bản cũ, nên tỉ lệ thuận với kích thước — 2,157 s cho 200 MB',
        'Chỉ ra tmpfs (RAM) và eMMC là HAI hệ thống file khác nhau, đó là toàn bộ nguyên nhân',
        'Nói rõ hệ quả về tính nguyên tử: rename là một thao tác nguyên tử, còn chép-rồi-xoá thì có thời điểm file đích tồn tại mà chưa đầy đủ',
        'Nêu cách sửa: tải/ghi file tạm vào ĐÚNG hệ thống file đích (ví dụ /usr/bin/app.new) rồi mv trong cùng phân vùng',
        'Nêu thêm một bước chắc chắn hơn: kiểm tra toàn vẹn (kích thước hoặc mã băm) trước khi mv, và sync trước khi đổi tên'
      ],
      sol: '<b>Một lệnh, hai công việc hoàn toàn khác nhau.</b><br><br>' +
           '<b>Trong cùng một hệ thống file</b>, <code>mv</code> gọi <code>rename()</code>: nó xoá một ' +
           'dòng trong bảng tên → inode ở thư mục nguồn và thêm một dòng ở thư mục đích. Dữ liệu ' +
           '<b>không nhúc nhích một byte</b>, số inode giữ nguyên. Vì thế đổi tên một file 200 MB tốn ' +
           '<b>0,002 s</b> — đúng bằng đổi tên một file rỗng. Đây cũng là lý do "di chuyển" và "đổi ' +
           'tên" trong Linux là cùng một lệnh: cả hai đều chỉ là sửa bảng.<br><br>' +
           '<b>Qua hai hệ thống file khác nhau</b>, <code>rename()</code> không dùng được (cùng lý do ' +
           'với liên kết cứng ở câu C3: số inode không mang sang được). <code>mv</code> phải lùi về ' +
           '<b>chép từng byte rồi xoá bản cũ</b>. Thời gian tỉ lệ với kích thước: <b>2,157 s</b> cho ' +
           '200 MB, và trên eMMC của board thì còn chậm hơn nhiều.<br><br>' +
           '<b>Vì sao mất điện lại phá được hệ thống:</b> <code>rename()</code> là thao tác ' +
           '<b>nguyên tử</b> — ở mọi thời điểm, cái tên <code>/usr/bin/app</code> hoặc còn trỏ vào bản ' +
           'cũ, hoặc đã trỏ vào bản mới, không có trạng thái ở giữa. Còn chép-rồi-xoá thì có cả một ' +
           'khoảng thời gian dài trong đó <code>/usr/bin/app</code> <b>đã tồn tại nhưng chưa đầy đủ</b>. ' +
           'Mất điện đúng lúc đó là có một file cụt mang đúng cái tên mà hệ thống tin tưởng.<br><br>' +
           '<b>Sửa quy trình:</b> ghi file tạm vào <b>đúng hệ thống file đích</b> — ' +
           '<code>/usr/bin/app.new</code> chứ không phải <code>/tmp</code> — kiểm tra toàn vẹn (so ' +
           'kích thước hoặc <code>sha256sum</code>), gọi <code>sync</code> để chắc chắn dữ liệu đã ' +
           'xuống flash, rồi mới <code>mv /usr/bin/app.new /usr/bin/app</code>. Bước cuối bây giờ là ' +
           'một <code>rename()</code> nguyên tử, tức thời và không thể đứt đoạn. Đây là khuôn mẫu ' +
           '<i>write-temp-then-rename</i>, và bạn sẽ thấy lại nó ở mọi hệ thống cập nhật OTA nghiêm ' +
           'túc.' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh',
      q: 'Bạn đang nối vào board bằng <b>cổng serial 115200 8N1</b> — mỗi byte tốn 10 bit đường truyền, ' +
         'nên thông lượng thực tế là <b>11 520 byte/giây</b>. Board có một file log ' +
         '<code>/var/log/messages</code> khoảng <b>50 000 dòng</b>. Từ file mẫu đã đo được trên máy bạn ' +
         '(200 dòng = 1 692 byte), hãy <b>tính</b> thời gian nếu bạn gõ <code>cat</code> file log đó, ' +
         'rồi <b>chọn</b> công cụ đúng cho ba nhu cầu sau và biện minh từng lựa chọn: (a) xem 30 dòng ' +
         'cuối để biết vì sao dịch vụ vừa chết; (b) tìm một chuỗi bạn nhớ mang máng, nằm đâu đó giữa ' +
         'file; (c) theo dõi log trong lúc bạn thử lại thao tác gây lỗi.',
      rows: 9,
      crit: [
        'Tính đúng cỡ file: 1692 / 200 ≈ 8,5 byte mỗi dòng → 50 000 dòng ≈ 423 000 byte (chấp nhận 400–430 KB)',
        'Tính đúng thời gian: 423 000 / 11 520 ≈ 37 giây (chấp nhận 35–40 s)',
        'Chọn tail -n 30 cho (a), và biện minh: chỉ truyền phần cần, khoảng 250 byte thay vì 423 KB',
        'Chọn less cho (b), và biện minh: cuộn được hai chiều, tìm được bằng /, không phải nạp cả file',
        'Chọn tail -f cho (c), và biện minh: nó không thoát mà in ra ngay khi có dòng mới',
        'Nêu được nguyên tắc chung: trên đường truyền chậm, chi phí nằm ở SỐ BYTE PHẢI ĐẨY QUA DÂY, nên hãy lọc ở phía board chứ không lọc bằng mắt'
      ],
      sol: '<b>Tính:</b> file mẫu cho 1 692 ÷ 200 ≈ <b>8,5 byte/dòng</b>. Vậy 50 000 dòng ≈ ' +
           '<b>423 000 byte</b> ≈ 413 KB. Chia cho 11 520 byte/giây → <b>≈ 37 giây</b> chỉ để chữ chạy ' +
           'hết màn hình, trong đó bạn không làm gì được, và cuối cùng phần lớn nội dung đã trôi khỏi ' +
           'bộ đệm cuộn của terminal.<br><br>' +
           '<b>(a) 30 dòng cuối → <code>tail -n 30 /var/log/messages</code>.</b> Chỉ khoảng 250 byte ' +
           'phải đi qua dây, tức khoảng <b>0,02 giây</b> thay vì 37. Lý do sâu hơn con số: log ghi theo ' +
           'thời gian, nên nguyên nhân một sự cố vừa xảy ra gần như luôn nằm ở cuối.<br><br>' +
           '<b>(b) tìm một chuỗi ở giữa file → <code>less /var/log/messages</code>, rồi gõ ' +
           '<code>/chuỗi</code>.</b> <code>less</code> chỉ đọc phần nó đang hiển thị, cuộn ngược được, ' +
           'và tìm được ngay trong trình xem. Nếu bạn <b>chắc</b> về chuỗi cần tìm thì ' +
           '<code>grep</code> còn tốt hơn nữa vì nó lọc ngay tại board; nhưng đề bài nói "nhớ mang ' +
           'máng", mà việc dò dẫm quanh chỗ tìm được chính là thứ <code>less</code> làm tốt còn ' +
           '<code>grep</code> thì không.<br><br>' +
           '<b>(c) theo dõi trong lúc thử lại → <code>tail -f /var/log/messages</code>.</b> Nó không ' +
           'thoát mà nằm chờ, và in ra ngay khi có dòng mới — bạn thấy được đúng những dòng sinh ra bởi ' +
           'thao tác mình vừa làm, không lẫn với 50 000 dòng cũ. Đây là cửa sổ quan sát thường trực ' +
           'trong mọi phiên gỡ lỗi trên board.<br><br>' +
           '<b>Nguyên tắc chung:</b> trên một đường truyền chậm, thứ đắt không phải là công suất tính ' +
           'toán mà là <b>số byte phải đẩy qua dây</b>. Hãy lọc ở phía board — <code>tail</code>, ' +
           '<code>grep</code>, <code>head</code> — chứ đừng đẩy hết sang rồi lọc bằng mắt. Cùng nguyên ' +
           'tắc này sẽ quay lại ở Chặng 08 với <code>dmesg</code> và console nối tiếp.' }
  ],

  D: [

    { id: 'd1', k: 'mcq', tag: 'Ôn xen kẽ — Bài 4',
      q: '<b>Ôn Bài 4.</b> Bài 6 vừa cho bạn thấy shell mở rộng dấu sao <i>trước khi</i> chương trình ' +
         'chạy. Bài 4 đã dạy một chuyện cùng họ: shell cắt dòng lệnh thành các mảnh, rồi mới đi tìm ' +
         'chương trình. Với <code>echo</code>, việc "đi tìm" ấy kết thúc ở đâu?',
      opts: [
        'Ở <code>/usr/bin/echo</code> — mọi lệnh đều là một file trên đĩa.',
        'Nó <b>không đi tìm gì cả</b>: <code>echo</code> là lệnh dựng sẵn trong bash. File ' +
          '<code>/usr/bin/echo</code> vẫn tồn tại nhưng chỉ được dùng khi có thứ khác gọi tới, ví dụ ' +
          '<code>find -exec</code> hay <code>xargs</code>.',
        'Ở alias do người dùng đặt; nếu không có alias thì lệnh báo lỗi.',
        'Ở thư mục hiện tại trước, rồi mới tới các thư mục trong <code>PATH</code>.'
      ],
      a: 1,
      why: 'Thứ tự bash tra: <b>alias → hàm → lệnh dựng sẵn (builtin) → tìm trong <code>PATH</code></b>. ' +
           '<code>echo</code> dừng ở bước thứ ba, nên nó không bao giờ tạo ra một tiến trình mới. Kiểm ' +
           'chứng bằng <code>type echo</code> — Bài 4 đã cho bạn xem kết quả thật.<br><br>' +
           'Vì sao ôn lại đúng lúc này: hai bài đang nói về <b>cùng một tầng</b>. Trước khi có bất kỳ ' +
           'chương trình nào chạy, bash đã làm xong ba việc — cắt dòng theo khoảng trắng (Bài 4), tra ' +
           'xem tên lệnh là cái gì (Bài 4), và <b>mở rộng ký tự đại diện</b> (Bài 6). Cả ba đều vô hình ' +
           'với chương trình. Đây là lý do chương trình không thể "sửa" giúp bạn khi bạn gõ nhầm nháy: ' +
           'nó không hề biết bạn đã gõ gì.<br><br>' +
           'Còn một điểm rất thực tế: vì <code>echo</code> là builtin nên nó ' +
           '<b>chạy được cả khi hệ thống đã hỏng nặng</b> — hết bộ nhớ để tạo tiến trình, ' +
           '<code>PATH</code> sai, <code>/usr</code> chưa gắn. Trên một board đang chết dở, các builtin ' +
           'thường là thứ duy nhất còn dùng được.',
      truc: undefined },

    { id: 'd2', k: 'mcq', tag: 'Ôn xen kẽ — Bài 5',
      q: '<b>Ôn Bài 5.</b> Script <code>~/tools/clean.sh</code> chứa đúng một dòng: ' +
         '<code>rm -rf build/*</code>. Bạn <code>cd ~/project/src</code> rồi chạy ' +
         '<code>~/tools/clean.sh</code>. Thư mục <code>build</code> nào bị xoá?',
      opts: [
        '<code>~/tools/build</code> — đường dẫn tương đối được tính từ chỗ chứa script.',
        '<code>~/project/src/build</code> — đường dẫn tương đối được tính từ <b>thư mục làm việc của ' +
          'tiến trình</b> lúc chạy, tức là chỗ bạn đang đứng.',
        '<code>~/build</code> — đường dẫn tương đối luôn tính từ thư mục nhà.',
        'Không thư mục nào; script chạy từ nơi khác thì đường dẫn tương đối bị coi là lỗi.'
      ],
      a: 1,
      why: 'Đường dẫn tương đối được kernel giải nghĩa từ <b>thư mục làm việc hiện tại của tiến ' +
           'trình</b> (CWD), và tiến trình con thừa hưởng CWD của shell đã gọi nó. Chỗ <i>chứa</i> ' +
           'script không tham gia vào chuyện này ở bất kỳ điểm nào.<br><br>' +
           'Ôn lại đúng lúc vì Bài 6 vừa cho bạn hai lệnh không tha thứ: <code>rm -rf</code> và ' +
           '<code>mv</code>. Một script dọn dẹp viết bằng đường dẫn tương đối là một quả mìn — chạy ' +
           'đúng chỗ thì dọn build, chạy nhầm chỗ thì dọn thứ khác, và không có thùng rác nào để lấy ' +
           'lại.<br><br>' +
           'Cách viết script cho an toàn, dùng được ngay: ' +
           '<code>cd "$(dirname "$0")"</code> ở đầu script để tự về đúng thư mục của nó, hoặc dùng ' +
           'đường dẫn tuyệt đối, hoặc bắt buộc phải có tham số. Câu E4 cho bạn thấy một biến thể còn ' +
           'nguy hiểm hơn của cùng vấn đề này.' },

    { id: 'd3', k: 'free', tag: 'Ôn xen kẽ — Bài 3',
      q: '<b>Ôn Bài 3.</b> Bài 6 cho bạn một thông báo lỗi: ' +
         '<code>ln: failed to create hard link \'/mnt/c/Users/DELL/test.txt\' =&gt; \'hardlink.txt\': ' +
         'Invalid cross-device link</code>. Bài 3 đã đo được rằng <code>/mnt/c</code> chậm hơn hẳn ' +
         '<code>$HOME</code>. Hãy giải thích: <b>một sự thật duy nhất</b> nào về <code>/mnt/c</code> ' +
         'giải thích được cả hai hiện tượng đó cùng lúc?',
      rows: 6,
      crit: [
        'Nêu sự thật chung: /mnt/c là một hệ thống file KHÁC, được gắn vào cây Linux qua một lớp chuyển tiếp sang NTFS của Windows',
        'Nối sang lỗi ln: số inode chỉ có nghĩa trong một hệ thống file, nên liên kết cứng không thể vượt ranh giới — kernel trả về Invalid cross-device link',
        'Nối sang tốc độ: mỗi thao tác file phải đi qua lớp chuyển tiếp giữa hai hệ điều hành nên đắt hơn nhiều so với ext4 nội bộ',
        'Nêu được hệ quả thực hành: mọi cây mã nguồn, cây build và rootfs đều để trong $HOME của Linux, không để trong /mnt/c',
        'Nối được với C2: cũng chính ranh giới đó làm mất quyền và chủ sở hữu khi chép rootfs sang'
      ],
      sol: 'Sự thật duy nhất: <b><code>/mnt/c</code> là một hệ thống file khác</b>, không phải ext4 của ' +
           'Linux, mà là ổ NTFS của Windows được gắn vào cây Linux qua một lớp chuyển tiếp giữa hai hệ ' +
           'điều hành. Nó là một <b>ranh giới</b>, và cả ba hiện tượng đều là hệ quả của việc bước qua ' +
           'ranh giới ấy:<br><br>' +
           '<b>1. Liên kết cứng không qua được.</b> Một mục thư mục chỉ ghi được số inode, mà số inode ' +
           'chỉ có nghĩa <i>bên trong</i> một hệ thống file. Không có chỗ nào để ghi "inode này thuộc ' +
           'thiết bị nào", nên kernel chặn thẳng: <code>Invalid cross-device link</code>. Cùng lý do ' +
           'khiến <code>mv</code> qua ranh giới phải chép từng byte thay vì đổi tên (câu C4).<br><br>' +
           '<b>2. Chậm.</b> Mỗi lần mở, đọc, ghi, đóng file đều phải đi qua lớp chuyển tiếp đó thay vì ' +
           'gọi thẳng vào hệ thống file trong nhân Linux. Với một lệnh thì không cảm nhận được; với một ' +
           'lần build kernel — hàng chục nghìn file nhỏ — thì thành nhiều phút.<br><br>' +
           '<b>3. Mất siêu dữ liệu.</b> NTFS không lưu được quyền và chủ sở hữu kiểu Unix, nên mọi file ' +
           'chép sang đều thành <code>rwxrwxrwx</code> — chính là cái bẫy trong câu C2.<br><br>' +
           '<b>Quy tắc thực hành, không có ngoại lệ:</b> mã nguồn, cây build, rootfs, ảnh đĩa đều nằm ' +
           'trong <code>$HOME</code> của Linux. <code>/mnt/c</code> chỉ dùng để trao đổi file rời với ' +
           'Windows — và nếu là cây thư mục Linux thì phải đóng gói bằng <code>tar</code> trước.' }
  ],

  E: [

    { id: 'e1', k: 'num', tag: 'Dự đoán output',
      q: 'Bạn sắp chạy <code>ln -s /usr/lib/cargo/bin/coreutils/ls mylink</code> trong một thư mục ' +
         'rỗng, biết rằng file đích nặng <b>11 352 352 byte</b>. <b>Trước khi chạy</b>, hãy dự đoán: ' +
         'cột kích thước của <code>mylink</code> trong <code>ls -l</code> sẽ là <b>số mấy</b>? Rồi chạy ' +
         'để đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'chạy sau khi đã viết dự đoán ra giấy', code:
            'mkdir -p ~/embedded/bai06-e1 && cd ~/embedded/bai06-e1\n' +
            'ln -s /usr/lib/cargo/bin/coreutils/ls mylink\n' +
            'ls -l mylink\n' +
            'echo -n "/usr/lib/cargo/bin/coreutils/ls" | wc -c\n' +
            'readlink mylink' }
      ],
      a: 31,
      tol: 0,
      why: 'Đáp án là <b>31</b> — đúng bằng số ký tự của chuỗi ' +
           '<code>/usr/lib/cargo/bin/coreutils/ls</code>, xác nhận bằng ' +
           '<code>wc -c</code> ở dòng cuối. Kết quả thật trên máy bạn:<br>' +
           '<code>lrwxrwxrwx 1 shinarus shinarus 31 ... mylink -&gt; /usr/lib/cargo/bin/coreutils/ls</code>' +
           '<br><br>' +
           'Nếu bạn đoán 11 352 352 thì bạn còn đang nghĩ liên kết mềm "là" file đích. Không phải: nó ' +
           'là một file riêng, nội dung là <b>chuỗi ký tự đường dẫn</b>, và cột kích thước báo đúng độ ' +
           'dài chuỗi đó. Bằng chứng phụ: cùng một đích, nếu bạn tạo liên kết bằng đường dẫn tương đối ' +
           'ngắn hơn thì con số sẽ nhỏ hơn — kích thước phụ thuộc vào <i>cách viết</i> đường dẫn chứ ' +
           'không phụ thuộc vào thứ nằm ở cuối đường dẫn.<br><br>' +
           'Đối chiếu với câu A7 (chuỗi <code>source.txt</code> → 10) để thấy quy luật là một, không ' +
           'phải hai trường hợp riêng lẻ.' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output',
      q: 'Dựng cây dưới đây rồi <b>viết dự đoán ra giấy trước khi chạy</b> khối lệnh thứ hai: sau ' +
         '<code>cp -r</code> và <code>cp -a</code>, ba thứ nào <b>giữ nguyên</b> và thứ nào <b>đổi</b> ' +
         '— cột đầu của <code>alias</code>, dấu thời gian của <code>config</code>, và quyền của ' +
         '<code>config</code>? Chạy xong, đối chiếu và ghi lại chỗ bạn đoán sai.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'bước 1 — dựng cây (chạy trước)', code:
            'rm -rf ~/embedded/bai06-e2 && mkdir -p ~/embedded/bai06-e2 && cd ~/embedded/bai06-e2\n' +
            'mkdir -p rootfs/bin rootfs/etc\n' +
            'printf \'hello\\n\' > rootfs/bin/real\n' +
            'ln -s real rootfs/bin/alias\n' +
            'touch -d \'2020-01-01 10:00\' rootfs/etc/config\n' +
            'chmod 755 rootfs/bin/real ; chmod 600 rootfs/etc/config\n' +
            'ls -l --time-style=long-iso rootfs/bin rootfs/etc' },
        { t: 'code', where: 'wsl', name: 'bước 2 — chạy SAU khi đã viết dự đoán', code:
            'cp -r rootfs copy-r\n' +
            'cp -a rootfs copy-a\n' +
            'ls -l --time-style=long-iso copy-r/bin copy-r/etc\n' +
            'ls -l --time-style=long-iso copy-a/bin copy-a/etc' }
      ],
      rows: 7,
      crit: [
        'Dự đoán được viết ra TRƯỚC khi chạy (nếu không thì bài tập này không có giá trị)',
        'Kết quả: alias vẫn là liên kết mềm (cột đầu l) ở CẢ HAI bản — cp -r không đi theo liên kết',
        'Kết quả: dấu thời gian của config đổi thành hôm nay ở copy-r, giữ 2020-01-01 ở copy-a',
        'Kết quả: quyền 600 giữ nguyên ở CẢ HAI bản trong lần đo này',
        'Giải thích được vì sao quyền không đổi: quyền đích = quyền nguồn lọc qua umask 022, mà 600 và 755 đi qua không suy suyển',
        'Rút ra kết luận đúng mức: phép đo này KHÔNG chứng minh cp -r an toàn với quyền — thứ nó chắc chắn làm mất trên rootfs thật là chủ sở hữu và bit setuid, muốn thấy phải chép cây có file của root'
      ],
      sol: '<b>Kết quả thật:</b><br>' +
           '• <code>alias</code> — <b>không đổi</b>, cả hai bản đều là ' +
           '<code>lrwxrwxrwx ... alias -&gt; real</code>. <code>cp -r</code> không đi theo liên kết ' +
           'mềm (muốn nó đi theo phải dùng <code>-L</code>).<br>' +
           '• dấu thời gian <code>config</code> — <b>đổi</b> ở <code>copy-r</code> (thành lúc chép), ' +
           '<b>giữ</b> ở <code>copy-a</code> (<code>2020-01-01 17:00</code>).<br>' +
           '• quyền <code>config</code> — <b>không đổi</b>, cả hai vẫn <code>-rw-------</code>.<br><br>' +
           '<b>Chỗ hầu hết mọi người đoán sai là cái thứ ba</b>, và nó đáng để dừng lại. Nhiều tài liệu ' +
           'tóm tắt <code>cp -r</code> là "làm mất quyền". Lần đo này không thấy vậy, và lý do rất cụ ' +
           'thể: quyền của file mới = quyền nguồn lọc qua <code>umask</code>, mà <code>umask</code> ' +
           'mặc định <code>022</code> chỉ gỡ bit ghi của nhóm và của người khác — <code>600</code> và ' +
           '<code>755</code> vốn đã không có các bit đó.<br><br>' +
           '<b>Bài học phương pháp, quan trọng hơn bài học nội dung:</b> phép đo không thấy khác biệt ' +
           '<b>không</b> chứng minh là không có khác biệt. Muốn thấy <code>cp -r</code> phá thật, phải ' +
           'chép một cây có file của <code>root</code> và có bit setuid — lúc đó chủ sở hữu đổi hết ' +
           'sang tài khoản chạy lệnh và setuid bay mất. Đó cũng là lý do quy tắc "chép thứ sẽ được ' +
           'chạy thì luôn dùng <code>cp -a</code>" đáng giữ, kể cả khi một phép thử nhỏ trông như đang ' +
           'nói ngược lại.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết <b>một dòng lệnh</b> cho mỗi nhu cầu sau, chạy thử rồi ghi lại kết quả. Không được dùng ' +
         'công cụ ngoài Bài 6.<br>' +
         '(a) Liệt kê <b>mọi liên kết mềm bị hỏng</b> trong cây thư mục hiện tại.<br>' +
         '(b) Cho biết <b>có bao nhiêu cái tên</b> đang cùng trỏ vào inode mà <code>/usr/bin/ls</code> ' +
         'dẫn tới.<br>' +
         '(c) Liệt kê các file trong <code>project/src</code> theo thứ tự <b>sửa gần đây nhất trước</b>, ' +
         'kèm dấu thời gian đọc được.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'dựng sẵn một liên kết hỏng để thử câu (a)', code:
            'mkdir -p ~/embedded/bai06-e3 && cd ~/embedded/bai06-e3\n' +
            'touch good.txt\n' +
            'ln -s good.txt ok.lnk\n' +
            'ln -s gone.txt dead.lnk\n' +
            'ls -l' }
      ],
      rows: 7,
      crit: [
        '(a) dùng find với -xtype l, ví dụ: find . -xtype l  → in ra ./dead.lnk chứ không in ./ok.lnk',
        '(a) giải thích được vì sao ls -l không đủ: ls hiện cả hai giống nhau, cột đầu đều là l',
        '(b) đi qua HAI bước: readlink -f /usr/bin/ls để ra file thật, rồi đọc số liên kết của file đó',
        '(b) ra đúng 115 (ví dụ stat -c %h "$(readlink -f /usr/bin/ls)" hoặc ls -l rồi đọc cột thứ hai)',
        '(c) dùng ls -lt (thêm --time-style=long-iso hoặc --full-time cho dễ đọc)',
        'Cả ba lệnh đều đã được CHẠY và kết quả được ghi lại, không phải chỉ viết ra giấy'
      ],
      sol: '<b>(a)</b> <code>find . -xtype l</code> → in ra <code>./dead.lnk</code> và <b>không</b> in ' +
           '<code>./ok.lnk</code>. <code>-xtype l</code> nghĩa là "sau khi đi theo liên kết thì kiểu ' +
           'file vẫn là liên kết", điều chỉ xảy ra khi liên kết không dẫn tới đâu cả. Vì sao cần: ' +
           '<code>ls -l</code> hiển thị hai liên kết đó <b>giống hệt nhau</b> — cột đầu đều ' +
           '<code>l</code>, đều có mũi tên — nên mắt thường không phân biệt được. Trên một rootfs vừa ' +
           'dựng xong, đây là lệnh kiểm tra đáng chạy trước khi nạp vào board.<br><br>' +
           '<b>(b)</b> <code>stat -c %h "$(readlink -f /usr/bin/ls)"</code> → <b>115</b>. Phải đi hai ' +
           'bước vì <code>/usr/bin/ls</code> chỉ là liên kết mềm; hỏi thẳng số liên kết của nó thì được ' +
           '<b>1</b> (bản thân file liên kết). <code>readlink -f</code> đi hết mọi tầng liên kết để ra ' +
           'file thật <code>/usr/lib/cargo/bin/coreutils/ls</code>, rồi <code>%h</code> đọc số liên kết ' +
           'cứng của inode đó. Cách khác cho cùng kết quả: ' +
           '<code>ls -l "$(readlink -f /usr/bin/ls)"</code> rồi đọc cột thứ hai.<br><br>' +
           '<b>(c)</b> <code>ls -lt --time-style=long-iso project/src</code>. <code>-t</code> sắp theo ' +
           'thời gian sửa, mới nhất lên đầu; thêm <code>-r</code> để đảo ngược. Đây là lệnh bạn sẽ gõ ' +
           'phản xạ mỗi khi cần biết "lần build vừa rồi đã sinh ra những file nào".<br><br>' +
           '<b>Ghi chú:</b> nếu bạn viết <code>find . -type l</code> cho câu (a) thì được cả hai liên ' +
           'kết, kể cả cái lành — sai. Chữ <code>x</code> mới là chỗ tạo ra khác biệt.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Bài 6 có một khung cảnh báo về <code>rm -rf $DIR/*</code>. Hãy <b>tự chứng minh</b> mối nguy ' +
         'đó mà không phá gì: chạy khối lệnh dưới đây, đọc kỹ kết quả, rồi trả lời — chuyện gì sẽ xảy ' +
         'ra nếu bỏ chữ <code>echo</code> đi, ai là kẻ tạo ra danh sách đó, và viết lại câu lệnh sao cho ' +
         'nó <b>từ chối chạy</b> khi biến rỗng.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'an toàn tuyệt đối — mọi lệnh đều có echo đứng trước', code:
            'cd /\n' +
            'DIR=""\n' +
            'echo rm -rf $DIR/*\n' +
            '\n' +
            'DIR="$HOME/embedded/bai06-e4"\n' +
            'mkdir -p "$DIR" && touch "$DIR/a.o" "$DIR/b.o"\n' +
            'echo rm -rf $DIR/*\n' +
            '\n' +
            'bash -c \'set -u; D=; echo rm -rf ${D:?BUILD dir is empty}/*\'\n' +
            'echo "ma thoat: $?"' }
      ],
      rows: 7,
      crit: [
        'Đọc đúng kết quả dòng đầu: với DIR rỗng, câu lệnh nở thành rm -rf /bin /boot /dev /etc /home ... tức là toàn bộ gốc hệ thống',
        'Chỉ đúng thủ phạm: bash thay $DIR bằng rỗng rồi mở rộng /* thành mọi mục ở thư mục gốc — rm chỉ nhận một danh sách đã hoàn tất',
        'Nêu hệ quả nếu bỏ echo: rm nhận đúng danh sách đó và không có cách nào biết bạn không cố ý',
        'Viết được phiên bản tự chặn, ví dụ ${DIR:?...} hoặc rm -rf "${DIR:?}"/* , và giải thích nó dừng ngay với mã thoát khác 0',
        'Nêu được thói quen chung: gõ echo trước mọi lệnh xoá/di chuyển có ký tự đại diện, xem danh sách rồi mới bỏ echo',
        'Giải thích được vì sao dấu nháy quanh "$DIR" là chưa đủ: nó chống được khoảng trắng trong tên nhưng KHÔNG chống được biến rỗng'
      ],
      sol: '<b>Kết quả thật, dòng đầu tiên:</b><br>' +
           '<code>rm -rf /bin /boot /dev /etc /home /init /lib /lib64 /lost+found /media /mnt /opt ' +
           '/proc /root /run /sbin /snap /srv /sys /tmp /usr /var</code><br><br>' +
           'Chuỗi bạn gõ là <code>$DIR/*</code>. Bash thay <code>$DIR</code> bằng chuỗi rỗng, còn lại ' +
           '<code>/*</code>, rồi mở rộng thành <b>mọi mục ở thư mục gốc</b>. Nếu không có chữ ' +
           '<code>echo</code>, <code>rm</code> nhận đúng danh sách ấy — và nó không có cách nào biết ' +
           'bạn không cố ý, vì từ chỗ ngồi của nó bạn đã gõ tay ra 22 đường dẫn.<br><br>' +
           '<b>Đây chính là trục xoáy của cả bộ bài tập này</b>, ở dạng nguy hiểm nhất: chương trình ' +
           'không bao giờ thấy dấu sao, nên nó không thể bảo vệ bạn khỏi một dấu sao nở sai.<br><br>' +
           '<b>Bản tự chặn:</b> <code>rm -rf "${DIR:?DIR chua duoc dat}"/*</code>. Cú pháp ' +
           '<code>${BIEN:?thông báo}</code> nghĩa là "nếu biến rỗng hoặc chưa đặt thì in thông báo rồi ' +
           'thoát". Kết quả thật khi thử: ' +
           '<code>bash: line 1: D: BUILD dir is empty</code> và mã thoát <b>127</b> — lệnh ' +
           '<code>rm</code> không hề được chạy.<br><br>' +
           '<b>Vì sao chỉ bỏ nháy quanh <code>"$DIR"</code> là chưa đủ:</b> nháy chống được khoảng ' +
           'trắng trong tên thư mục, nhưng biến rỗng vẫn là biến rỗng — <code>"$DIR"/*</code> vẫn nở ' +
           'thành <code>/*</code>. Phải là <code>:?</code> mới chặn được.<br><br>' +
           '<b>Thói quen đáng tập ngay hôm nay:</b> mọi lệnh <code>rm</code> hay <code>mv</code> có ' +
           'chứa ký tự đại diện thì gõ <code>echo</code> đứng trước, nhìn danh sách, rồi mới nhấn mũi ' +
           'tên lên và xoá chữ <code>echo</code>. Nó tốn hai giây và đã cứu rất nhiều người.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Ba lệnh dưới đây đều thất bại với mã thoát <b>1</b>. Với <b>từng</b> lệnh: nói người dùng ' +
         'đang muốn gì, vì sao hệ thống từ chối, và viết lại lệnh đúng. Chú ý lệnh thứ ba: nó không ' +
         'phải chuyện quên một chữ.',
      blocks: [
        { t: 'code', where: 'out', name: 'kết quả thật, đã chạy trên máy bạn', nocopy: true, code:
            '$ cp project backup\n' +
            'cp: -r not specified; omitting directory \'project\'\n' +
            '$ echo $?\n' +
            '1\n' +
            '\n' +
            '$ rm project/build\n' +
            'rm: cannot remove \'project/build\': Is a directory\n' +
            '$ echo $?\n' +
            '1\n' +
            '\n' +
            '$ ln dir1 dir2\n' +
            'ln: dir1: hard link not allowed for directory\n' +
            '$ echo $?\n' +
            '1' }
      ],
      rows: 8,
      crit: [
        'Lệnh 1: muốn chép cả thư mục; cp mặc định chỉ chép file thường nên bỏ qua thư mục — sửa bằng cp -r (hoặc cp -a nếu là cây sẽ được chạy)',
        'Lệnh 2: muốn xoá một thư mục; rm trần chỉ gỡ tên của file — sửa bằng rm -r (hoặc rmdir nếu thư mục rỗng)',
        'Lệnh 3: muốn có tên thứ hai cho một thư mục; kernel CẤM liên kết cứng tới thư mục, không phải thiếu cờ nào cả',
        'Giải thích được lý do cấm: sẽ tạo ra vòng lặp trong cây, khiến find/rm -r không có cách nào thoát ra và . / .. mất ý nghĩa',
        'Sửa lệnh 3 bằng liên kết MỀM: ln -s dir1 dir2 (và nêu được rằng nó chạy được, mã thoát 0)',
        'Nhận xét chung: cả ba thông báo đều nói đúng bệnh; đọc kỹ chữ trong ngoặc là đủ để sửa'
      ],
      sol: '<b>1. <code>cp project backup</code> → <code>-r not specified; omitting directory</code></b>' +
           '<br>Người dùng muốn chép cả cây. <code>cp</code> mặc định chỉ chép <b>file thường</b>; gặp ' +
           'thư mục nó bỏ qua và nói rõ ra. Sửa: <code>cp -r project backup</code>. Nếu ' +
           '<code>project</code> là thứ sẽ được chạy (rootfs, cây build) thì ' +
           '<code>cp -a</code> — xem câu A4 và C2.<br><br>' +
           '<b>2. <code>rm project/build</code> → <code>Is a directory</code></b><br>' +
           '<code>rm</code> là <code>unlink()</code>: gỡ một cái tên của một file. Thư mục thì không gỡ ' +
           'kiểu đó được, vì bên trong còn các mục <code>.</code>, <code>..</code> và có thể còn file ' +
           'con. Sửa: <code>rm -r project/build</code>, hoặc <code>rmdir project/build</code> nếu nó ' +
           'rỗng — <code>rmdir</code> an toàn hơn hẳn vì nó <b>từ chối</b> khi thư mục còn nội dung.' +
           '<br><br>' +
           '<b>3. <code>ln dir1 dir2</code> → <code>hard link not allowed for directory</code></b><br>' +
           'Đây <b>không</b> phải chuyện thiếu cờ. Kernel cấm hẳn, và lý do liên quan trực tiếp tới câu ' +
           'B3: số liên kết của một thư mục được tính theo cấu trúc cây (2 + số thư mục con). Cho phép ' +
           'một thư mục có tên thứ hai ở chỗ khác là tạo ra khả năng <b>vòng lặp</b>: ' +
           '<code>find</code> sẽ đi vòng mãi không thoát, <code>rm -r</code> không biết dừng ở đâu, và ' +
           '<code>..</code> mất ý nghĩa vì thư mục có hai cha. Sửa bằng liên kết mềm: ' +
           '<code>ln -s dir1 dir2</code> — chạy được, mã thoát <b>0</b>, và ' +
           '<code>ls -ld dir2</code> cho <code>lrwxrwxrwx ... dir2 -&gt; dir1</code>. Liên kết mềm ' +
           'không gây vòng lặp chết người vì kernel giới hạn số tầng đi theo (khoảng 40) rồi trả về ' +
           '<code>Too many levels of symbolic links</code>.<br><br>' +
           '<b>Nhận xét chung:</b> cả ba thông báo đều nói đúng bệnh bằng vài chữ trong ngoặc. Đọc kỹ ' +
           'dòng lỗi là kỹ năng rẻ nhất và có lãi nhất trong cả nghề này.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: '<b>Câu này chưa có lời giải trọn vẹn trong Bài 6 — và đó là chủ ý.</b> Bạn có một file ' +
         '<code>.config</code> của kernel, <b>10 000 dòng</b>, và cần đổi <b>mọi</b> dòng ' +
         '<code>=y</code> thành <code>=m</code>. Chỉ được dùng những gì Bài 6 đã dạy. Hãy thử thật, rồi ' +
         'trả lời: bạn làm được tới đâu, <b>chính xác thì cái gì còn thiếu</b>, và loại công cụ nào mới ' +
         'giải quyết được?',
      blocks: [
        { t: 'code', where: 'wsl', name: 'dựng một file để thử', code:
            'mkdir -p ~/embedded/bai06-e6 && cd ~/embedded/bai06-e6\n' +
            'seq 1 10000 | sed \'s/^/CONFIG_OPT/; s/$/=y/\' > .config\n' +
            'wc -l .config\n' +
            'head -3 .config' }
      ],
      rows: 7,
      crit: [
        'Thừa nhận được rằng Bài 6 KHÔNG có công cụ nào sửa nội dung file — cat/less/head/tail chỉ ĐỌC, cp/mv/rm/ln chỉ thao tác trên TÊN',
        'Nêu đúng ranh giới: Bài 6 dạy thao tác ở mức TÊN FILE và ĐỌC, chưa hề dạy sửa NỘI DUNG',
        'Nêu ít nhất một hướng đi thật: trình soạn thảo (vim/nano) hoặc công cụ xử lý dòng lệnh (sed)',
        'Nhận ra sửa tay 10 000 dòng bằng trình soạn thảo thông thường là không khả thi — cần lệnh thay thế hàng loạt',
        'Nói được vì sao việc này quan trọng thật: cấu hình kernel và rootfs đều là file văn bản hàng nghìn dòng, sửa hàng loạt là việc thường ngày',
        'Ghi lại một câu hỏi cụ thể muốn được trả lời ở bài sau'
      ],
      sol: '<b>Câu trả lời trung thực: với riêng Bài 6, bạn không làm được.</b> Và nhận ra ranh giới đó ' +
           'chính là mục đích của câu hỏi.<br><br>' +
           'Hãy xếp lại hai mươi lệnh của Bài 6 thành hai nhóm:<br>' +
           '• <code>cp</code>, <code>mv</code>, <code>rm</code>, <code>ln</code>, <code>mkdir</code> — ' +
           'thao tác trên <b>tên file</b>, tức là sửa bảng tên → inode. Không lệnh nào trong số này ' +
           'chạm vào một byte nội dung.<br>' +
           '• <code>cat</code>, <code>less</code>, <code>head</code>, <code>tail</code>, ' +
           '<code>od</code> — chỉ <b>đọc</b>.<br><br>' +
           'Không có nhóm thứ ba. Bài 6 chưa hề dạy bạn <b>sửa nội dung</b> một file, nên bài toán này ' +
           'nằm ngoài tầm với, và bạn nên tự tin về điều đó thay vì nghi ngờ mình đã bỏ sót cái gì.' +
           '<br><br>' +
           '<b>Hai hướng, và cả hai đều đã nằm trong lộ trình:</b><br>' +
           '<b>1. Trình soạn thảo trong terminal — Bài 7, ngay bài sau.</b> Nhưng chú ý: mở file rồi ' +
           'sửa tay 10 000 dòng là bất khả thi. Thứ bạn cần là lệnh thay thế hàng loạt của trình soạn ' +
           'thảo, và Bài 7 sẽ đưa cho bạn đúng một dòng làm xong việc này.<br>' +
           '<b>2. Công cụ xử lý văn bản theo dòng — <code>sed</code>, <code>grep</code>, ' +
           '<code>awk</code>, ở Bài 11.</b> Chúng biến "sửa 10 000 dòng" thành một lệnh chạy trong ' +
           'chớp mắt, và quan trọng hơn, chạy được <b>trong script</b> mà không cần người ngồi trước ' +
           'màn hình.<br><br>' +
           '<b>Vì sao đây không phải bài tập cho vui:</b> cấu hình kernel (<code>.config</code>, ' +
           'thường hơn 10 000 dòng), cấu hình BusyBox, các file trong <code>/etc</code> của rootfs — ' +
           'tất cả đều là văn bản hàng nghìn dòng, và "đổi hàng loạt theo một mẫu" là việc bạn sẽ làm ' +
           'gần như mỗi ngày từ Chặng 07 trở đi.<br><br>' +
           'Trước khi sang Bài 7, hãy viết ra một câu hỏi cụ thể của riêng bạn. Bài 7 mở đầu bằng việc ' +
           'trả lời đúng câu đó.' }
  ],

  diag: [

    ['A2, B1, C1',
     '<b>Trục 1.</b> Bạn còn nghĩ chương trình nhìn thấy dấu sao và tự đi tìm file. Thật ra bash đã ' +
       'thay dấu sao bằng một danh sách tên <i>trước khi</i> chương trình chạy — nên nháy, biến rỗng ' +
       'và "không khớp gì cả" đều đổi nghĩa câu lệnh mà chương trình không hề biết.',
     '<a href="#/bai-06#ky-tu-dai-dien-ai-that-su-mo-rong-dau-sao">Đọc lại Bài 6 — ' +
       '<i>Ký tự đại diện: ai thật sự mở rộng dấu sao?</i></a>'],

    ['A3, B4, C3',
     '<b>Trục 2.</b> Bạn còn lẫn hai loại liên kết. Liên kết cứng là <b>một cái tên nữa của cùng một ' +
       'inode</b> — xoá tên gốc thì dữ liệu vẫn còn. Liên kết mềm chỉ chứa <b>một chuỗi đường dẫn</b> ' +
       '— xoá đích thì nó thành liên kết hỏng.',
     '<a href="#/bai-06#lien-ket-cung-va-lien-ket-mem">Đọc lại Bài 6 — ' +
       '<i>Liên kết cứng và liên kết mềm</i></a>'],

    ['A4, B2, C2',
     '<b>Trục 3.</b> Bạn còn coi "chép đủ nội dung" là chép xong. Với một cây hệ thống thì quyền, chủ ' +
       'sở hữu, liên kết mềm và dấu thời gian <b>chính là</b> hệ thống — mất chúng là cây không khởi ' +
       'động được, dù từng byte nội dung vẫn đúng.',
     '<a href="#/bai-06#bon-lenh-lam-thay-doi-dia">Đọc lại Bài 6 — ' +
       '<i>Bốn lệnh làm thay đổi đĩa</i></a>'],

    ['A1',
     'Quy ước file ẩn: dấu chấm đầu tên không phải một thuộc tính trên đĩa, chỉ là quy ước mà ' +
       '<code>ls</code> tôn trọng. Muốn thấy chúng thì thêm <code>-a</code>.',
     '<a href="#/bai-06#doc-cho-het-mot-dong-ls-l">Đọc lại Bài 6 — ' +
       '<i>Đọc cho hết một dòng <code>ls -l</code></i></a>'],

    ['A5, A6, A8',
     'Nhóm lệnh cơ bản: <code>mkdir -p</code> không báo lỗi khi thư mục đã có, <code>cat</code> một ' +
       'file nhị phân làm loạn terminal, và bốn công cụ xem file phục vụ bốn tình huống khác nhau.',
     '<a href="#/bai-06#bon-cach-xem-mot-file-va-cach-chon-dung">Đọc lại Bài 6 — ' +
       '<i>Bốn cách xem một file và cách chọn đúng</i></a>'],

    ['A7, E1',
     'Kích thước của một liên kết mềm bằng đúng độ dài chuỗi đường dẫn nó chứa, không liên quan gì tới ' +
       'file đích. Nếu bạn đoán ra kích thước file đích thì bạn còn coi liên kết mềm "là" file đích.',
     '<a href="#/bai-06#lien-ket-cung-va-lien-ket-mem">Đọc lại Bài 6 — ' +
       '<i>Liên kết cứng và liên kết mềm</i></a>'],

    ['B3, B5',
     'Đọc <code>ls -l</code> cho đúng: cột thứ hai của một <b>thư mục</b> là 2 + số thư mục con, và ' +
       'dòng <code>total</code> đếm <b>khối đĩa</b> chứ không phải byte.',
     '<a href="#/bai-06#doc-cho-het-mot-dong-ls-l">Đọc lại Bài 6 — ' +
       '<i>Đọc cho hết một dòng <code>ls -l</code></i></a>'],

    ['B6',
     'Chọn công cụ xem theo <i>loại file</i>: với file nhị phân thì <code>head -c</code> cộng ' +
       '<code>od</code> mới đọc được, còn <code>cat</code> thì phá terminal.',
     '<a href="#/bai-06#bon-cach-xem-mot-file-va-cach-chon-dung">Đọc lại Bài 6 — ' +
       '<i>Bốn cách xem một file và cách chọn đúng</i></a>'],

    ['C4',
     '<code>mv</code> trong cùng một hệ thống file chỉ đổi tên nên gần như tức thời và không thể dở ' +
       'dang; vượt ranh giới hệ thống file thì nó phải chép rồi xoá, và khoảng giữa đó là chỗ mọi thứ ' +
       'có thể hỏng.',
     '<a href="#/bai-06#bon-lenh-lam-thay-doi-dia">Đọc lại Bài 6 — ' +
       '<i>Bốn lệnh làm thay đổi đĩa</i></a>'],

    ['C5',
     'Chọn công cụ theo <b>lượng dữ liệu và tốc độ đường truyền</b>, không theo thói quen. Đây là lý do ' +
       '<code>cat</code> một file dài qua cổng nối tiếp là một sai lầm đắt.',
     '<a href="#/bai-06#bon-cach-xem-mot-file-va-cach-chon-dung">Đọc lại Bài 6 — ' +
       '<i>Bốn cách xem một file và cách chọn đúng</i></a>'],

    ['D1',
     '<b>Ôn Bài 4.</b> Lệnh dựng sẵn không phải file trên đĩa, nên nó không đi qua <code>PATH</code> ' +
       'và không tạo tiến trình mới.',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại Bài 4 — ' +
       '<i>Một lệnh thật sự đến từ đâu?</i></a>'],

    ['D2',
     '<b>Ôn Bài 5.</b> Đường dẫn tương đối được tính từ thư mục làm việc của tiến trình lúc chạy, ' +
       'không phải từ chỗ chứa script.',
     '<a href="#/bai-05#duong-dan-tuyet-doi-va-tuong-doi">Đọc lại Bài 5 — ' +
       '<i>Đường dẫn tuyệt đối và tương đối</i></a>'],

    ['D3',
     '<b>Ôn Bài 3.</b> <code>/mnt/c</code> là một hệ thống file khác được gắn vào cây Linux — một sự ' +
       'thật giải thích cùng lúc cả tốc độ, cả <code>Invalid cross-device link</code>, cả chuyện mất ' +
       'quyền.',
     '<a href="#/bai-03#hai-he-thong-file-va-cai-bay-50-lan">Đọc lại Bài 3 — ' +
       '<i>Hai hệ thống file, và cái bẫy 50 lần</i></a>'],

    ['E2, E3',
     'Thực hành chưa đủ: bạn cần tự chạy để thấy <code>cp -r</code> và <code>cp -a</code> khác nhau ở ' +
       'đâu, và tự tìm được liên kết hỏng bằng <code>find . -xtype l</code>.',
     '<a href="#/bai-06#thuc-hanh-dung-mot-cay-du-an-roi-mo-xe-lien-ket">Đọc lại Bài 6 — ' +
       '<i>Thực hành: dựng một cây dự án rồi mổ xẻ liên kết</i></a>'],

    ['E4',
     'Thói quen an toàn với ký tự đại diện: gõ <code>echo</code> trước, nhìn danh sách đã nở ra, rồi ' +
       'mới bỏ <code>echo</code>. Đây vẫn là trục 1, ở dạng nguy hiểm nhất của nó.',
     '<a href="#/bai-06#ky-tu-dai-dien-ai-that-su-mo-rong-dau-sao">Đọc lại Bài 6 — ' +
       '<i>Ký tự đại diện: ai thật sự mở rộng dấu sao?</i></a>'],

    ['E5',
     'Đọc thông báo lỗi cho tới hết dòng: <code>-r not specified</code>, <code>Is a directory</code> ' +
       'và <code>hard link not allowed for directory</code> đều nói thẳng bệnh và cách chữa.',
     '<a href="#/bai-06#loi-thuong-gap">Đọc lại Bài 6 — <i>Lỗi thường gặp</i></a>'],

    ['E6',
     'Không phải bạn thiếu kiến thức — Bài 6 chỉ dạy thao tác trên <b>tên file</b> và cách <b>đọc</b> ' +
       'file, chưa dạy sửa nội dung. Câu này để mở sang Bài 7 và Bài 11.',
     '<a href="#/bai-06#bon-cach-xem-mot-file-va-cach-chon-dung">Đọc lại Bài 6 — ' +
       '<i>Bốn cách xem một file và cách chọn đúng</i></a>']
  ]
});

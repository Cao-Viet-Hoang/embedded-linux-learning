/* ============================================================
   BT-01 — Bài tập cho Bài 1: "Embedded Linux là gì và tại sao nó ở khắp mọi nơi"

   ── CHỌN TRỤC XOÁY — bảng chấm điểm theo CLAUDE.md §13.4 bước 2 ──
   Ghi lại ở đây để một phiên làm việc sau có thể KIỂM TRA lựa chọn này
   thay vì phải suy luận lại từ đầu.

   Thang: 0 / 1 / 2 trên ba trục
     PT  = phụ thuộc về sau  (bài sau có sụp đổ nếu thiếu khái niệm này không)
     GIA = giá của hiểu sai  (hiểu sai thì mất gì)
     NGC = ngược trực giác   (phỏng đoán tự nhiên của người mới có sai không)

   | Ứng viên                                   | PT | GIA | NGC | Tổng |
   |--------------------------------------------|----|-----|-----|------|
   | Phần cứng không tự khai báo → Device Tree   | 2  |  2  |  2  |  6   |  ← TRỤC 3
   | MMU là ranh giới cứng                       | 2  |  2  |  2  |  6   |  ← TRỤC 1
   | Bốn mảnh nối tiếp → chẩn đoán "chết ở đâu"   | 2  |  2  |  1  |  5   |  ← TRỤC 2
   | Kernel và rootfs là hai thứ tách rời         | 2  |  1  |  2  |  5   |
   | Mô hình host – target, cross-compile         | 2  |  1  |  1  |  4   |
   | reg = địa chỉ + kích thước, RAM ở 0x40000000 | 1  |  1  |  1  |  3   |
   | /proc là hệ thống file ảo                    | 1  |  0  |  1  |  2   |
   | Chọn Linux hay RTOS hay bare-metal            | 0  |  1  |  1  |  2   |
   | BusyBox gộp lệnh                              | 1  |  0  |  0  |  1   |

   Bước 3 — cắt: năm ứng viên đạt ngưỡng (tổng ≥ 4 và ≥ 2 trục ≥ 1). Lấy ba
   ứng viên cao nhất. Hai ứng viên còn lại — "kernel ⟂ rootfs" và "host –
   target" — bị hạ xuống mức hỏi MỘT lần (B2 và C4). Chúng vẫn quan trọng,
   nhưng chín câu là quá đắt cho thứ mà cả Chặng 04, 07 và 09 sẽ còn dạy lại.

   Bước 4 — loại: "reg = địa chỉ + kích thước" và các con số 393 dòng /
   1.048.576 byte bị loại khỏi danh sách trục theo §13.3 (tra được trong mười
   giây). Chúng chỉ được xuất hiện ở mức A hoặc trong phần E.

   Bước 7 — lưới 3 × 1, kiểm tra "kích thích phải khác loại":
     Trục 1 (MMU)         A7 phát biểu → B3 hai con chip cạnh nhau → C5 chọn chip có ràng buộc
     Trục 2 (bốn mảnh)    A8 phát biểu → B5 log panic thật        → C1 triệu chứng board mới
     Trục 3 (Device Tree) A5 phát biểu → B6 bản dts thật           → C3 driver có sẵn mà thiết bị vắng mặt

   ── VÌ SAO BỘ NÀY CÓ 25 CÂU CHỨ KHÔNG PHẢI 28 ──
   Phần D (Ôn xen kẽ) hỏi về những bài TRƯỚC. Bài 1 không có bài nào trước
   nó, nên phần D của bộ này rỗng — có chú thích đàng hoàng thay vì nhồi ba
   câu vô nghĩa vào cho đủ số. Từ bt-02 trở đi phần D mới có nội dung.
   A = 8, B = 6, C = 5, D = 0, E = 6 → 25 câu; lý thuyết 19/25 = 76 %.

   ── MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT ──
   Đo trên máy người học (WSL2 Ubuntu 26.04, QEMU 10.2.1) ngày 2026-08-10.
   ============================================================ */
Exercise.register({
  id: 'bt-01',
  minutes: 85,

  intro:
    '<p>Bài 1 đã dựng xong bộ khung: bốn mảnh ghép, ranh giới MMU, và lý do phần cứng nhúng ' +
    'phải được khai báo bằng tay. Bộ bài tập này không hỏi lại xem bạn còn nhớ mấy chữ đó không — ' +
    'nó bắt bạn <b>dùng</b> chúng: đọc một đoạn log rồi chỉ ra thiết bị chết ở tầng nào, chọn chip ' +
    'cho một sản phẩm có ràng buộc thật, và sửa một câu lệnh QEMU bị hỏng đúng một ký tự.</p>' +
    '<p>Các câu tự luận <b>không</b> được máy chấm, và điều đó là cố ý. Bạn viết câu trả lời trước, ' +
    'rồi mới mở được tiêu chí để tự đối chiếu từng ý. Ổ khoá đó chính là bài tập — đọc lời giải khi ' +
    'chưa tự viết thì bộ não luôn kết luận “ý mình cũng thế”.</p>',

  /* `name` là thứ duy nhất hiển thị. `x` (phát biểu có thể sai) và `mis`
     (hiểu lầm đối lập) là tài liệu cho người viết bài tập sau, không được
     render — in ra thì lộ đáp án của cả chín câu. */
  truc: [
    { id: 'mmu',
      name: 'MMU là ranh giới cứng',
      x: 'Thứ quyết định một CPU có chạy được Linux đầy đủ hay không là việc nó CÓ MMU, ' +
         'không phải dung lượng RAM hay tốc độ xung nhịp.',
      mis: 'Chạy được Linux hay không là chuyện đủ RAM và CPU đủ nhanh; chip nào mạnh thì chạy được.' },

    { id: 'manh',
      name: 'Bốn mảnh chạy nối tiếp',
      x: 'Bốn mảnh chạy nối tiếp và mảnh sau phụ thuộc hoàn toàn vào mảnh trước, nên triệu chứng ' +
         'lúc thiết bị không lên chỉ đích danh mảnh nào đang hỏng.',
      mis: 'Thiết bị không lên thì nạp lại firmware hoặc build lại kernel cho chắc, vì không phân ' +
           'biệt được các tầng với nhau.' },

    { id: 'dt',
      name: 'Phần cứng không tự khai báo',
      x: 'Phần cứng nhúng không tự giới thiệu, nên một thiết bị không được mô tả trong Device Tree ' +
         'thì không tồn tại với kernel — dù driver của nó đã được biên dịch sẵn.',
      mis: 'Kernel sẽ tự dò ra thiết bị như khi cắm USB vào máy bàn; cứ có driver là chạy.' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN A — NHẬN BIẾT (8 câu)
     4 trắc nghiệm · 2 đúng-sai kèm sửa · 1 điền khuyết · 1 ghép nối
     ══════════════════════════════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn viết mã trên WSL2 rồi cho chương trình chạy trên máy ARM64 giả lập bằng QEMU. ' +
         'Vì sao quy trình chuẩn của nghề là biên dịch trên máy phát triển chứ không phải biên dịch ' +
         'ngay trên thiết bị?',
      opts: [
        'Vì trình biên dịch chỉ tồn tại cho kiến trúc x86, không có bản chạy trên ARM.',
        'Vì thiết bị nhúng thường chỉ có vài chục MB RAM và vài trăm MHz — không đủ chỗ chứa và ' +
          'không đủ sức chạy bộ công cụ biên dịch.',
        'Vì mã máy sinh ra trên thiết bị sẽ chậm hơn mã máy sinh ra trên máy tính.',
        'Vì Linux cấm biên dịch trên hệ thống file gắn ở chế độ chỉ đọc.'
      ],
      a: 1,
      why: 'Bản thân GCC cùng các thư viện đi kèm chiếm hàng trăm MB và ngốn RAM khi chạy. Con router ' +
           '64 MB RAM trong bài không có chỗ cho chúng — và nếu có thì mỗi lần build sẽ mất hàng giờ. ' +
           'Đó là lý do sinh ra cặp vai trò <b>host</b> (máy mạnh, biên dịch) và <b>target</b> (thiết bị, ' +
           'chỉ chạy). Hai phương án còn lại sai về sự thật: GCC có bản chạy trên ARM, và mã máy sinh ra ' +
           'ở đâu thì cũng như nhau — cùng một trình biên dịch, cùng một mức tối ưu.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Lệnh <code>cat /proc/version</code> lấy dữ liệu từ đâu?',
      opts: [
        'Từ một file văn bản nằm trong phân vùng gốc, do bản Ubuntu ghi ra lúc cài đặt.',
        'Từ chính kernel: <code>/proc</code> là hệ thống file <b>ảo</b>, nội dung được sinh ra ngay ' +
          'tại thời điểm bạn đọc và không chiếm byte nào trên đĩa.',
        'Từ vùng nhớ đệm mà bootloader để lại sau khi nạp kernel xong.',
        'Từ một cơ sở dữ liệu do <code>systemd</code> cập nhật ở mỗi lần khởi động.'
      ],
      a: 1,
      why: 'Không có file nào tên <code>version</code> nằm trên đĩa cả. Khi bạn đọc, kernel dựng chuỗi ' +
           'trả lời ngay lúc đó rồi trả về. Đây là cách chuẩn để chương trình ở user space hỏi thông tin ' +
           'từ kernel, và bạn sẽ dùng lại nó suốt khoá học — <code>/proc/cmdline</code> ở Chặng 07, ' +
           '<code>/proc/interrupts</code> ở Chặng 10. Phương án C sai theo một cách đáng chú ý: bootloader ' +
           'đã <i>biến mất</i> khỏi bộ nhớ từ lâu trước khi bạn kịp gõ lệnh.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'BusyBox làm cho root filesystem của thiết bị nhúng co lại còn vài megabyte bằng cách nào?',
      opts: [
        'Nén cả thư mục <code>/bin</code> lại rồi giải nén mỗi khi có lệnh được gọi.',
        'Gộp hàng trăm lệnh Unix quen thuộc vào <b>một</b> file thực thi duy nhất; mỗi tên lệnh chỉ ' +
          'là một liên kết trỏ về file đó.',
        'Xoá bớt các lệnh ít dùng, chỉ giữ lại khoảng mười lệnh cơ bản nhất.',
        'Thay nhân Linux bằng một nhân rút gọn hơn dành riêng cho thiết bị nhỏ.'
      ],
      a: 1,
      why: 'Mỗi chương trình rời mang theo phần đầu ELF, bảng ký hiệu và đoạn mã khởi động riêng của nó; ' +
           'nhân hàng trăm lệnh lên thì phần lặp lại đó mới là thứ tốn chỗ. BusyBox bỏ hẳn sự lặp lại ấy: ' +
           'một file, một lần. Phương án C sai ở chỗ nó đánh đổi <i>chức năng</i>, còn BusyBox thì không — ' +
           'bạn vẫn có <code>ls</code>, <code>grep</code>, <code>vi</code>, <code>ping</code>. Chặng 09 sẽ ' +
           'cho bạn tự lắp một rootfs như vậy.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Yêu cầu nào dưới đây khiến Embedded Linux trở thành lựa chọn <b>sai</b>, phải cân nhắc RTOS ' +
         'hoặc bare-metal?',
      opts: [
        'Thiết bị cần một trang web cấu hình và kết nối Wi-Fi.',
        'Thiết bị phải phản hồi tín hiệu trong vài chục micro-giây, và không được trễ dù chỉ một lần.',
        'Thiết bị cần ghi log vào thẻ nhớ theo một hệ thống file như ext4.',
        'Thiết bị cần chạy nhiều tiến trình song song, tiến trình này hỏng không được kéo sập tiến trình kia.'
      ],
      a: 1,
      why: 'Ba phương án còn lại đều là những thứ Linux <b>cho sẵn</b> và RTOS phải tự ghép: ngăn xếp ' +
           'TCP/IP, hệ thống file ext4, đa nhiệm có bảo vệ bộ nhớ. Chỉ có mốc thời gian cứng là chỗ Linux ' +
           'yếu: bảng so sánh trong bài xếp Linux ở mức "khá, cần bản vá PREEMPT_RT", trong khi bare-metal ' +
           'và RTOS đều "rất tốt". Chữ quan trọng nhất trong phương án B là <i>“không được trễ dù chỉ một ' +
           'lần”</i> — trung bình nhanh không có giá trị gì khi yêu cầu là trường hợp xấu nhất.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 2,
      q: 'Xét phát biểu sau: <i>“Hàn thêm một cảm biến nhiệt độ vào bus I2C của board rồi cấp nguồn, ' +
         'kernel Linux sẽ tự dò ra cảm biến đó, giống như khi bạn cắm USB vào máy bàn.”</i>',
      a: 1,
      why: 'Sai — và ranh giới nằm ở <b>loại bus</b>, không ở loại thiết bị. USB, PCIe và một vài bus ' +
           'khác có cơ chế tự giới thiệu: thiết bị tự khai id nhà sản xuất và id sản phẩm khi được cắm vào, ' +
           'nên kernel hỏi được "anh là ai" và nạp đúng driver. Các bus nhúng phổ biến — I2C, SPI, GPIO, ' +
           'UART — <b>không có</b> cơ chế đó; chúng chỉ là mấy sợi dây. Muốn kernel biết có cảm biến ở địa ' +
           'chỉ 0x48 trên bus I2C số 1, bạn phải viết điều đó ra bằng tay trong Device Tree. Đây chính là ' +
           'lý do Device Tree tồn tại, và là lý do cả Chặng 08 dành cho nó.',
      rw: 'Viết lại phát biểu trên cho đúng. Nói rõ ranh giới giữa hai loại bus, đừng phủ định tất cả:',
      crit: [
        'Nói rõ phát biểu <b>sai</b> đối với I2C (và SPI, GPIO, UART).',
        'Nêu đúng nguyên nhân: những bus này không có cơ chế để thiết bị tự khai báo danh tính.',
        'Nêu được cách làm đúng: phải mô tả cảm biến trong Device Tree — loại gì, ở bus nào, địa chỉ nào.',
        'Giữ đúng ranh giới: với USB/PCIe thì phát biểu <i>đúng</i>, kernel thật sự tự dò ra được.'
      ],
      sol:
        '<p>Phát biểu đúng: <i>“Hàn thêm một cảm biến vào bus I2C rồi cấp nguồn, kernel sẽ không biết ' +
        'gì cả. I2C không có cơ chế để thiết bị tự khai danh tính, nên phải khai báo cảm biến trong ' +
        'Device Tree — bus số mấy, địa chỉ nào, loại thiết bị gì — thì kernel mới ghép được driver cho ' +
        'nó. Cắm USB thì khác: USB có cơ chế tự giới thiệu, nên kernel hỏi được thiết bị và tự nạp driver.”</i></p>' +
        '<p>Chú ý cái bẫy: câu trả lời “sai, vì Linux nhúng không tự dò được thiết bị nào cả” cũng bị ' +
        'trừ điểm. Board nhúng vẫn có thể có cổng USB, và cắm USB vào đó thì kernel vẫn tự dò ra bình ' +
        'thường. Ranh giới nằm ở bus, không ở chỗ máy đó là máy bàn hay board nhúng.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu sau: <i>“Thời gian khởi động của thiết bị nhúng không phải chuyện lớn — máy ' +
         'tính để bàn khởi động mất 30 giây mà có ai phàn nàn đâu.”</i>',
      a: 1,
      why: 'Sai, và lý do nằm ở <b>cách người ta bật máy</b>. Máy bàn được bật một lần rồi dùng cả ngày, ' +
           'nên 30 giây bị chia đều cho tám tiếng. Thiết bị nhúng thì bị cấp và ngắt điện liên tục, và ' +
           'người dùng không coi nó là máy tính: bật công tắc thì nó phải chạy. Bảng so sánh trong bài ghi ' +
           'đúng hai ô đối lập nhau ở dòng này — máy bàn "không ai quan tâm lắm", hệ nhúng "chỉ tiêu quan ' +
           'trọng, đôi khi phải dưới 1 giây". Đó cũng là lý do Chặng 09 sẽ đo và cắt gọt thời gian khởi động.',
      rw: 'Viết lại phát biểu cho đúng, và nêu một ví dụ thiết bị mà khởi động chậm là hỏng sản phẩm:',
      crit: [
        'Nói rõ với thiết bị nhúng thì thời gian khởi động là <b>chỉ tiêu</b>, không phải chuyện phụ.',
        'Nêu đúng nguyên nhân của khác biệt: thiết bị nhúng bị bật/tắt thường xuyên, người dùng chờ ' +
          'ngay tại chỗ, không có ai "để máy chạy cả ngày".',
        'Cho một ví dụ cụ thể và hợp lý (camera hành trình phải ghi hình khi xe vừa nổ máy, máy POS, ' +
          'cụm đồng hồ trên ô tô phải hiện đủ đèn báo trong vòng vài giây…).',
        'Không đi quá: khởi động nhanh là chỉ tiêu <i>của phần lớn</i> thiết bị nhúng, không phải quy ' +
          'luật vật lý — một trạm quan trắc cắm điện liên tục thì đúng là không quan tâm.'
      ],
      sol:
        '<p>Phát biểu đúng: <i>“Với thiết bị nhúng, thời gian khởi động thường là một chỉ tiêu kỹ thuật ' +
        'có con số cụ thể, đôi khi dưới một giây. Khác biệt so với máy bàn không nằm ở phần cứng mà ở ' +
        'cách dùng: máy bàn bật một lần dùng cả ngày, còn thiết bị nhúng bị bật tắt liên tục và người ' +
        'dùng đứng chờ ngay đó.”</i></p>' +
        '<p>Ví dụ sắc nhất là cụm đồng hồ trên ô tô: luật ở nhiều nước yêu cầu đèn báo phanh tay và ' +
        'túi khí phải hiện lên trong vòng vài giây kể từ khi vặn chìa. Cả một hệ Linux đầy đủ khó đạt ' +
        'mốc đó, nên xe hơi thường ghép thêm một vi điều khiển vẽ tạm mấy đèn báo trong lúc Linux còn ' +
        'đang khởi động — đúng kiểu ghép mà bài học nhắc tới ở phần "Quy tắc chọn nhanh".</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết', truc: 0,
      q: 'Điền vào chỗ trống: <i>“Ranh giới phần cứng quyết định một CPU có chạy được Linux đầy đủ hay ' +
         'không là việc nó có ________ hay không.”</i> Viết tên khối phần cứng đó — tên viết tắt ba chữ ' +
         'cái là đủ.',
      a: ['MMU', 'Memory Management Unit', 'khối MMU', 'có MMU'],
      ph: 'gõ tên khối phần cứng',
      why: '<b>MMU</b> — Memory Management Unit — khối phần cứng dịch địa chỉ ảo sang địa chỉ vật lý. ' +
           'Nhờ nó mỗi tiến trình có một không gian địa chỉ riêng, nên một chương trình lỗi ghi bậy vào ' +
           'con trỏ chỉ làm hỏng chính nó chứ không kéo sập cả hệ thống. Toàn bộ mô hình bảo vệ bộ nhớ ' +
           'của Linux — thứ khiến nó đáng tin cậy — được xây trên khối này. Không có MMU thì không có ' +
           'ranh giới giữa user space và kernel space, và Linux mất đi lợi thế lớn nhất của mình. ' +
           'Chú ý câu hỏi <b>không</b> hỏi về RAM, xung nhịp hay kiến trúc chip: Linux chạy trên ARM, ' +
           'x86, RISC-V, MIPS — nhưng ở kiến trúc nào cũng cần MMU.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối', truc: 1,
      q: 'Ghép mỗi thành phần với đúng nhiệm vụ của nó. Có <b>một</b> mục không phải là mảnh ghép nào ' +
         'trong bốn mảnh — hãy để ý nó là gì.',
      left: [
        'Bootloader',
        'Linux Kernel',
        'Root filesystem',
        'Ứng dụng của bạn',
        'Device Tree'
      ],
      right: [
        'Cây thư mục gắn tại <code>/</code>: thư viện C, <code>/etc</code>, <code>/bin</code> và chương trình khởi động',
        'Không phải một mảnh ghép mà là một <b>văn bản mô tả</b>: thiết bị nào nằm ở địa chỉ nào',
        'Chia thời gian CPU, quản lý bộ nhớ, và chứa driver — lớp mã nói chuyện trực tiếp với phần cứng',
        'Khởi tạo bộ điều khiển RAM, bật cổng serial, chép nhân vào RAM rồi nhảy vào nó và biến mất',
        'Phần tạo ra giá trị thật của sản phẩm: đọc cảm biến, trang web cấu hình, logic điều khiển'
      ],
      a: [3, 2, 0, 4, 1],
      why: 'Bốn mảnh chạy nối tiếp theo đúng thứ tự 1 → 2 → 3 → 4 khi bật nguồn, và mảnh sau phụ thuộc ' +
           'hoàn toàn vào mảnh trước: không có bootloader thì kernel không vào được RAM, không có rootfs ' +
           'thì kernel không có gì để chạy. Device Tree <b>không</b> phải mảnh thứ năm — nó là dữ liệu mà ' +
           'bootloader trao cho kernel, và cũng là thứ trả lời câu hỏi "bo mạch này có những gì". ' +
           'Nhớ đúng bảng này là nhớ được xương sống của cả khoá: 69 bài còn lại chỉ là đào sâu vào bốn ' +
           'mảnh đó cộng với văn bản mô tả kia.'
    }
  ],

  /* ══════════════════════════════════════════════
     PHẦN B — THÔNG HIỂU (6 câu)
     2 giải thích vì sao · 1 so sánh cặp · 1 bắt lỗi phát biểu · 2 đọc output
     ══════════════════════════════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Bảng so sánh trong bài ghi rằng hệ thống file gốc của thiết bị nhúng “thường chỉ đọc, để mất ' +
         'điện đột ngột không hỏng”. Hãy giải thích <b>cơ chế</b>: vì sao cho phép ghi lại làm hệ thống ' +
         'file hỏng khi mất điện, còn để chỉ đọc thì không? Viết 3–5 câu.',
      ph: 'Khi mất điện, thứ đang dở dang là…',
      hint:
        '<p>Đừng nghĩ về file đang được ghi — mất một file thì cũng chỉ mất một file. Hãy nghĩ về ' +
        '<b>bảng mục lục</b> của hệ thống file: để thêm một file, hệ thống phải sửa cả dữ liệu lẫn bảng ' +
        'mục lục, và hai việc đó không xảy ra cùng một khoảnh khắc.</p>',
      crit: [
        'Nói rõ ghi dữ liệu là việc <b>gồm nhiều bước</b>, mất điện giữa chừng thì việc đó hoàn thành ' +
          'một nửa.',
        'Chỉ ra hậu quả đúng: <b>siêu dữ liệu</b> của hệ thống file rơi vào trạng thái không nhất quán ' +
          '— không phải chỉ mất riêng file đang ghi.',
        'Nêu được vì sao chỉ đọc miễn nhiễm: không có thao tác ghi nào đang dở dang tại thời điểm mất điện.',
        'Có nhắc rằng với thiết bị nhúng, bị cắt điện đột ngột là chuyện <b>bình thường</b> chứ không ' +
          'phải sự cố hiếm — không có ai bấm nút "shutdown" cho cái router cả.'
      ],
      sol:
        '<p>Ghi một file không phải một hành động đơn lẻ. Hệ thống phải cấp phát block trống, ghi dữ ' +
        'liệu vào block đó, rồi sửa siêu dữ liệu — inode, bitmap block trống, mục trong thư mục — để ' +
        'chỉ tới chỗ vừa ghi. Mất điện có thể rơi vào đúng khe giữa hai bước đó.</p>' +
        '<p>Hậu quả không phải “mất file đang ghi” mà là <b>bảng mục lục nói dối</b>: block đã bị đánh ' +
        'dấu là đã dùng nhưng không thuộc file nào, hoặc thư mục trỏ tới một inode chưa được ghi xong. ' +
        'Lần khởi động sau, hệ thống file có thể không gắn được, hoặc gắn được nhưng hỏng dần.</p>' +
        '<p>Gắn chỉ đọc thì không có bước nào để mà dở dang: mất điện lúc nào cũng rơi vào giữa hai lần ' +
        '<i>đọc</i>, và đọc thì không để lại dấu vết. Đó là lý do thiết kế phổ biến của thiết bị nhúng là ' +
        'rootfs chỉ đọc, cộng thêm một phân vùng ghi được thật nhỏ cho log và cấu hình — hỏng phân vùng ' +
        'đó thì cũng chỉ mất log, thiết bị vẫn khởi động được.</p>' +
        '<p>Bạn sẽ gặp lại chuyện này rất cụ thể ở Chặng 09, khi chọn giữa SquashFS (chỉ đọc, nén) và ' +
        'ext4 cho rootfs của mình.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Dưới đây là kết quả thật của <code>uname -a</code> trên WSL2 của bạn. Chuỗi ' +
         '<code>microsoft-standard-WSL2</code> nói lên điều gì về quan hệ giữa <b>kernel</b> và ' +
         '<b>root filesystem</b> trên máy này? Và vì sao quan hệ đó lại là nền tảng của cả nghề ' +
         'Embedded Linux? Viết 3–5 câu.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'Linux Shinarus 6.18.33.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC \\\n' +
          'Thu Jun 18 21:54:43 UTC 2026 x86_64 GNU/Linux' }
      ],
      ph: 'Chuỗi đó cho biết kernel này do… trong khi rootfs lại là…',
      crit: [
        'Chỉ ra kernel này do <b>Microsoft</b> build, không phải kernel của Ubuntu.',
        'Chỉ ra rootfs — mọi file bạn thấy khi gõ <code>ls /</code> — thì lại là của Ubuntu.',
        'Kết luận đúng: kernel và rootfs là hai thứ <b>tách rời</b>, ghép chéo được; “Ubuntu” không ' +
          'phải một khối liền.',
        'Liên hệ được sang nghề: chính vì tách rời nên bạn sẽ ghép được kernel tự build với rootfs tự lắp.'
      ],
      sol:
        '<p>Một dòng <code>uname -a</code> nói hai chuyện về hai chủ thể khác nhau. Phần ' +
        '<code>6.18.33.2-microsoft-standard-WSL2</code> tả <b>kernel</b>: nó do Microsoft cấu hình và ' +
        'biên dịch, không phải bản kernel Canonical đóng gói cho Ubuntu. Nhưng mọi thứ bạn chạm vào ' +
        'trong shell — <code>/etc</code>, <code>/bin</code>, <code>apt</code>, thư viện C — lại là ' +
        '<b>rootfs</b> của Ubuntu.</p>' +
        '<p>Nghĩa là mảnh 2 và mảnh 3 trong sơ đồ bốn mảnh do hai bên hoàn toàn khác nhau tạo ra, và ' +
        'chúng vẫn ghép được với nhau. “Ubuntu” không phải một khối liền không tách được; nó là một ' +
        'rootfs, tình cờ thường đi kèm một kernel.</p>' +
        '<p>Khả năng ghép chéo đó chính là chỗ đứng của nghề Embedded Linux. Ở Chặng 07 bạn build kernel ' +
        'riêng, ở Chặng 09 bạn lắp rootfs riêng, và ở Chặng 11 Buildroot sẽ ghép hai thứ đó lại thành ' +
        'một ảnh hệ thống. Nếu kernel và rootfs dính liền nhau thì cả quy trình ấy không tồn tại.</p>' +
        '<p>Bạn cũng đã thấy một bằng chứng thứ hai ngay trong bài: chuỗi <code>x86_64</code> ở cuối ' +
        'dòng. Kernel này chạy trên kiến trúc x86-64, còn target của cả khoá là <code>aarch64</code>.</p>' },

    { id: 'b3', k: 'free', tag: 'So sánh cặp', truc: 0, rows: 5,
      q: 'Hai con chip dưới đây có xung nhịp gần bằng nhau, RAM bằng nhau, và chip <b>đắt hơn</b> lại ' +
         'chính là chip không chạy được Linux đầy đủ. Chỉ ra <b>khác biệt nào là khác biệt quyết định</b>, ' +
         'rồi giải thích cơ chế: khối đó cho Linux thứ gì mà thiếu nó thì Linux mất đi lợi thế lớn nhất ' +
         'của mình? Viết 3–5 câu.',
      blocks: [
        { t: 'table',
          head: ['Thông số', 'Chip A', 'Chip B'],
          rows: [
            ['Lõi CPU', 'Cortex-A7, 1 lõi 600 MHz', 'Cortex-M7, 1 lõi 480 MHz'],
            ['MMU', '<b>Có</b>', '<b>Không</b>'],
            ['RAM', '64 MB DDR3', '64 MB SDRAM gắn ngoài'],
            ['Flash', '256 MB NAND', '256 MB QSPI'],
            ['Giá theo lô 10 000 chiếc', '≈ 3,0 USD', '≈ 5,0 USD']
          ]}
      ],
      ph: 'Khác biệt quyết định là… vì nó cho phép…',
      crit: [
        'Chỉ đúng khác biệt quyết định là <b>MMU</b> — không phải xung nhịp, RAM, flash hay giá.',
        'Nói được MMU dịch địa chỉ ảo sang địa chỉ vật lý, nhờ đó mỗi tiến trình có một không gian ' +
          'địa chỉ riêng.',
        'Nêu đúng hệ quả: một chương trình ghi bậy vào con trỏ chỉ làm hỏng chính nó, không kéo sập cả ' +
          'hệ thống.',
        'Nói rõ không có MMU thì không còn ranh giới giữa user space và kernel space.',
        'Loại đúng các nghi phạm khác: RAM và xung nhịp của hai chip là tương đương, nên chúng không ' +
          'thể là lời giải thích.'
      ],
      sol:
        '<p>Khác biệt quyết định là dòng <b>MMU</b>. Bảng này được dựng để cắt hết đường lui: RAM bằng ' +
        'nhau, flash bằng nhau, xung nhịp chênh không đáng kể, và chip không chạy được Linux lại là chip ' +
        'đắt hơn — nên mọi lời giải thích kiểu “vì không đủ tài nguyên” đều rơi.</p>' +
        '<p>MMU dịch địa chỉ ảo mà chương trình nhìn thấy sang địa chỉ vật lý thật trên thanh RAM. Nhờ ' +
        'lớp dịch đó, mỗi tiến trình sống trong một không gian địa chỉ của riêng nó và <i>không có cách ' +
        'nào</i> chạm tới bộ nhớ của tiến trình khác hay của kernel — phần cứng chặn, không phải phần ' +
        'mềm tin nhau. Con trỏ hỏng thì tiến trình đó chết, hệ thống chạy tiếp.</p>' +
        '<p>Bỏ MMU đi thì mọi chương trình dùng chung một không gian địa chỉ phẳng. Không còn ranh giới ' +
        'user space / kernel space, nên một lỗi ghi ngoài mảng ở tầng ứng dụng có thể đè lên cấu trúc dữ ' +
        'liệu của nhân. Đó đúng là lợi thế lớn nhất của Linux — sự đáng tin cậy — và nó là <b>tính chất ' +
        'phần cứng</b>, không phải thứ bù được bằng cách viết code cẩn thận hơn.</p>' +
        '<p>Chip B không phải chip tồi: Cortex-M7 với FreeRTOS là lựa chọn xuất sắc cho vòng điều khiển ' +
        'thời gian thực. Nó chỉ không phải chip chạy Linux.</p>' },

    { id: 'b4', k: 'multi', tag: 'Bắt lỗi phát biểu',
      q: 'Trong sáu phát biểu dưới đây có một số phát biểu <b>sai</b>. Chọn tất cả những phát biểu sai, ' +
         'rồi bấm Kiểm tra.',
      opts: [
        'Bootloader ở lại trong RAM suốt vòng đời thiết bị để kernel gọi lại nó khi cần.',
        'Trên hệ nhúng, RAM luôn bắt đầu ở địa chỉ 0 giống như mọi máy tính khác.',
        'Điện năng tiêu thụ của một hệ bare-metal thấp hơn hẳn một hệ Embedded Linux làm cùng công việc.',
        'QEMU giả lập CPU và thiết bị đủ thật để kernel chạy trong đó panic y hệt như trên silicon thật.',
        'Thư mục <code>/boot</code> rỗng trên WSL2 là dấu hiệu bản Ubuntu đã bị cài lỗi.',
        'Vòng đời của một sản phẩm nhúng thường dài hơn vòng đời một máy tính để bàn.'
      ],
      a: [0, 1, 4],
      why: '<b>Sai — phát biểu 1:</b> bootloader làm xong việc là nhảy vào kernel và <i>biến mất</i>. ' +
           'Vùng RAM nó từng chiếm được kernel thu hồi và dùng lại. Kernel không gọi ngược lên bootloader ' +
           'bao giờ; muốn khởi động lại thì nó reset cả con chip.<br>' +
           '<b>Sai — phát biểu 2:</b> chính bản dts bạn đọc trong bài đã bác bỏ: <code>memory@40000000</code> ' +
           '— RAM của máy <code>virt</code> bắt đầu ở <code>0x40000000</code>. Trên hệ nhúng, vị trí RAM là ' +
           'một thứ phải khai báo rõ ràng, vùng địa chỉ thấp thường dành cho flash và thanh ghi thiết bị.<br>' +
           '<b>Sai — phát biểu 5:</b> <code>/boot</code> rỗng là <i>đúng như thiết kế</i>. Hypervisor của ' +
           'Windows nạp thẳng kernel vào bộ nhớ máy ảo, nên mảnh ghép số 1 bị cắt bỏ hoàn toàn — không có ' +
           'gì để mà đặt trong <code>/boot</code>.<br>' +
           'Ba phát biểu còn lại đều đúng và đều lấy từ hai bảng so sánh trong bài: bare-metal tiêu thụ ' +
           '“cực thấp”, vòng đời nhúng 10–20 năm so với máy bàn 2–5 năm, và QEMU giả lập đủ thật để bạn ' +
           'gặp panic thật.' },

    { id: 'b5', k: 'free', tag: 'Đọc output', truc: 1, rows: 5,
      q: 'Một board đang chạy tốt. Bạn thay thẻ nhớ chứa rootfs bằng một thẻ mới rồi bật lại; cổng serial ' +
         'in ra đúng hai dòng dưới đây rồi dừng hẳn. Bốn mảnh ghép chạy nối tiếp nhau — hãy đọc đoạn log ' +
         'này và cho biết: mảnh nào <b>chắc chắn đã chạy xong</b>, mảnh nào <b>đang hỏng</b>, và bạn suy ' +
         'ra điều đó <b>từ đâu</b>? Viết 3–5 câu.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'toàn bộ những gì cổng serial in ra', code:
          'Kernel panic - not syncing: No working init found.\n' +
          'Try passing init= option to kernel.' }
      ],
      ph: 'Mảnh đã chạy xong là… vì bằng chứng nằm ở chỗ…',
      hint:
        '<p>Câu hỏi quan trọng nhất không phải “thông báo này nói gì”, mà là “<b>ai</b> đã in ra thông ' +
        'báo này”. Trả lời được câu đó là bạn biết ngay mọi mảnh nằm dưới người đó đều đã chạy xong.</p>',
      crit: [
        'Chỉ ra mảnh 1 (bootloader) chắc chắn đã xong — có log của nhân thì nhân phải đã được nạp vào ' +
          'RAM và được nhảy vào.',
        'Chỉ ra mảnh 2 (kernel) cũng đã chạy, và chạy khá xa: chính nó là thứ in ra dòng panic này.',
        'Chỉ ra mảnh đang hỏng là mảnh 3 (root filesystem): kernel không gắn được rootfs, hoặc gắn được ' +
          'nhưng trong đó không có chương trình init.',
        'Nêu đúng cách suy luận: bằng chứng nằm ở chỗ <b>ai là người in ra thông báo</b>, chứ không ' +
          'phải ở nghĩa đen của câu chữ.',
        'Có nói tới việc cổng serial hiển nhiên hoạt động — nếu không thì đã chẳng có dòng nào.'
      ],
      sol:
        '<p>Đọc ngược từ người nói. Dòng <code>Kernel panic</code> là do <b>kernel</b> in ra. Muốn kernel ' +
        'in được thì kernel phải đang chạy; muốn kernel chạy thì nó phải đã nằm trong RAM và đã có ai đó ' +
        'nhảy vào nó. Vậy mảnh 1 (bootloader) đã hoàn thành trọn vẹn nhiệm vụ, và mảnh 2 đã chạy đủ xa để ' +
        'khởi tạo được bộ nhớ, driver cơ bản và cổng serial.</p>' +
        '<p>Kernel dừng đúng ở bước tiếp theo: gắn <code>/</code> rồi chạy chương trình đầu tiên trong đó. ' +
        'Nó không tìm thấy chương trình nào để chạy, nên hỏng nằm ở <b>mảnh 3</b> — hoặc thẻ nhớ mới có ' +
        'định dạng kernel không đọc được, hoặc gắn được nhưng thiếu <code>/sbin/init</code>, hoặc file init ' +
        'ở đó lại là bản biên dịch cho kiến trúc khác.</p>' +
        '<p>Điểm đắt giá của câu này là cách suy luận, không phải kết luận. Một đoạn log không chỉ nói cho ' +
        'bạn biết cái gì hỏng — <i>sự tồn tại của nó</i> đã chứng minh mọi tầng nằm dưới người in ra đều ' +
        'khoẻ mạnh. Đó là công cụ chẩn đoán bạn sẽ dùng hằng ngày, và Bài 2 sẽ trải nó ra thành từng giai ' +
        'đoạn của luồng khởi động.</p>' +
        '<p>Trả lời “thay lại thẻ cũ là xong” không sai về mặt thực dụng, nhưng đó không phải chẩn đoán — ' +
        'nó không cho bạn biết lần sau lỗi này nghĩa là gì.</p>' },

    { id: 'b6', k: 'free', tag: 'Đọc output', truc: 2, rows: 5,
      q: 'Đây là 25 dòng đầu bản mô tả phần cứng của máy ảo <code>virt</code>, lấy thật từ máy bạn. ' +
         'Toàn bộ file này chỉ dài 393 dòng và <b>không có một dòng nào</b> nói về bàn phím, chuột hay ổ ' +
         'cứng. Trên máy bàn thì kernel vẫn tự tìm ra những thứ đó. Với một board nhúng thì sao — nếu một ' +
         'thiết bị có mặt trên bo mạch nhưng không được nhắc tên trong Device Tree thì chuyện gì xảy ra, ' +
         'và vì sao? Viết 3–5 câu.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'dtc -I dtb -O dts /tmp/virt.dtb | head -25', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\tinterrupt-parent = <0x8002>;\n' +
          '\tdma-coherent;\n' +
          '\tmodel = "linux,dummy-virt";\n' +
          '\t#size-cells = <0x02>;\n' +
          '\t#address-cells = <0x02>;\n' +
          '\tcompatible = "linux,dummy-virt";\n' +
          '\n' +
          '\tpsci {\n' +
          '\t\tmigrate = <0xc4000005>;\n' +
          '\t\tcpu_on = <0xc4000003>;\n' +
          '\t\tcpu_off = <0x84000002>;\n' +
          '\t\tcpu_suspend = <0xc4000001>;\n' +
          '\t\tmethod = "hvc";\n' +
          '\t\tcompatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";\n' +
          '\t};\n' +
          '\n' +
          '\tmemory@40000000 {\n' +
          '\t\treg = <0x00 0x40000000 0x00 0x8000000>;\n' +
          '\t\tdevice_type = "memory";\n' +
          '\t};\n' +
          '\n' +
          '\tplatform-bus@c000000 {' }
      ],
      ph: 'Với kernel thì thiết bị đó… vì các bus nhúng…',
      crit: [
        'Trả lời đúng: với kernel thì thiết bị đó <b>không tồn tại</b> — nó không xuất hiện ở đâu cả, ' +
          'không có ai nạp driver cho nó.',
        'Nêu đúng nguyên nhân: các bus nhúng (I2C, SPI, GPIO, UART) không có cơ chế để thiết bị tự khai ' +
          'báo danh tính.',
        'Phân biệt được với máy bàn: PCI, USB và ACPI có cơ chế tự giới thiệu nên kernel dò ra được.',
        'Nêu được một khai báo đúng cần những gì: loại thiết bị (<code>compatible</code>) và vị trí của ' +
          'nó (địa chỉ trên bus nào).'
      ],
      sol:
        '<p>Nó đơn giản là không tồn tại — với kernel. Bo mạch có thể đã hàn con cảm biến đó rất chắc, ' +
        'điện áp và tín hiệu đều chuẩn, nhưng kernel không đi dò từng địa chỉ trên bus để xem có ai trả ' +
        'lời không. Nó chỉ tin vào Device Tree.</p>' +
        '<p>Lý do là bản chất của bus. USB và PCIe có sẵn một nghi thức bắt tay: cắm vào thì thiết bị tự ' +
        'khai id nhà sản xuất và id sản phẩm, kernel đọc được rồi tra bảng để nạp driver. I2C, SPI, GPIO ' +
        'và UART thì chỉ là mấy sợi dây có mức điện áp — không có chỗ nào để nhét câu “tôi là cảm biến ' +
        'nhiệt độ” vào cả.</p>' +
        '<p>Nên ai đó phải nói thay. Người đó là bạn, và chỗ để nói là Device Tree: một node con nằm ' +
        'trong node của bus, mang <code>compatible</code> để kernel biết loại thiết bị và <code>reg</code> ' +
        'để biết địa chỉ. Chính xác là kiểu khai báo bạn đang nhìn thấy ở node ' +
        '<code>memory@40000000</code> phía trên, chỉ khác nội dung.</p>' +
        '<p>Bản dts này cũng cho thấy điều ngược lại rất rõ: máy <code>virt</code> <i>không có</i> bàn ' +
        'phím hay ổ SATA nào cả, và đó là lý do không có dòng nào tả chúng. Device Tree không phải danh ' +
        'sách ước muốn — nó là bản khai những gì thật sự có trên bo mạch này.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN C — VẬN DỤNG (5 câu)
     2 chẩn đoán · 2 tình huống mới · 1 chọn và biện minh
     ══════════════════════════════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 1, rows: 7,
      q: 'Bạn cầm một board mới toanh của khách hàng, cắm cáp serial ở 115200 baud, bấm nút nguồn. Đèn ' +
         'nguồn sáng, con SoC hơi ấm lên, nhưng terminal <b>không hiện một ký tự nào</b> — kể cả ký tự ' +
         'rác. Chờ hai phút vẫn vậy.<br>Liệt kê <b>ít nhất ba</b> nguyên nhân có thể, xếp theo thứ tự bạn ' +
         'sẽ kiểm tra trước, và với mỗi nguyên nhân nêu một phép thử cụ thể để loại nó ra khỏi danh sách.',
      ph: '1) Nguyên nhân… — thử bằng cách…',
      hint:
        '<p>Câu này có một cái bẫy. “Tôi không thấy ký tự nào” và “bootloader không chạy” là <b>hai ' +
        'chuyện khác nhau</b>. Đừng kết luận cái thứ hai từ cái thứ nhất trước khi loại xong đường truyền.</p>',
      crit: [
        'Đặt đúng vị trí trong bốn mảnh: chưa có ký tự nào nghĩa là chưa qua được mảnh 1 — <i>hoặc</i> ' +
          'bản thân đường serial đang hỏng.',
        'Có ít nhất một nguyên nhân thuộc về <b>đường truyền</b>: sai baud rate, nhầm chân TX/RX, sai ' +
          'cổng COM, cáp hỏng, thiếu nối đất — tức là bootloader có thể vẫn đang chạy mà bạn không thấy.',
        'Có ít nhất một nguyên nhân thuộc về <b>thiết bị</b>: flash chưa được nạp bootloader, nguồn ' +
          'không đủ dòng, chân chọn chế độ boot đang sai, thạch anh không dao động.',
        'Thứ tự có lý do đi kèm: thử thứ rẻ và dễ sai nhất trước (cáp, baud, cổng) rồi mới tới thứ đắt ' +
          '(nạp lại flash, đo xung nhịp).',
        'Mỗi nguyên nhân đi kèm một <b>phép thử cụ thể</b>, không phải chỉ liệt kê tên nguyên nhân.'
      ],
      sol:
        '<p><b>Trước hết, đừng tin vào im lặng.</b> Triệu chứng thật của bạn không phải “bootloader không ' +
        'chạy” mà là “tôi không nhận được ký tự nào”. Giữa hai điều đó có cả một sợi cáp, một con chip ' +
        'USB-serial và một tham số baud rate. Thứ tự dưới đây đi từ nghi phạm rẻ nhất tới nghi phạm đắt nhất.</p>' +
        '<ol>' +
        '<li><b>Sai baud rate.</b> Rẻ nhất, hay gặp nhất. Thử: đặt lại 115200, rồi thử 9600 và 57600. ' +
        'Dấu hiệu nhận biết rất đặc trưng — sai baud thường cho <i>ký tự rác</i> chứ không im lặng, nên ' +
        'im lặng hoàn toàn đã làm nghi phạm này yếu đi.</li>' +
        '<li><b>Nhầm chân TX/RX hoặc thiếu nối đất.</b> Thử: hoán đổi hai dây tín hiệu; kiểm tra dây GND ' +
        'thật sự có nối. Không có GND chung thì mức điện áp không có mốc để so, và kết quả đúng là im lặng.</li>' +
        '<li><b>Sai cổng, hoặc cáp/adapter hỏng.</b> Thử: nối chập TX với RX của chính cái adapter đó rồi ' +
        'gõ phím — thấy ký tự vọng lại là adapter và cổng đều tốt. Đây là phép thử loại được nhiều nghi ' +
        'phạm nhất trong một thao tác.</li>' +
        '<li><b>Chân chọn chế độ boot sai.</b> Nhiều SoC đọc mấy chân này lúc reset để quyết định nạp mã ' +
        'từ đâu. Thử: đối chiếu điện trở kéo trên schematic với bảng chế độ boot trong datasheet.</li>' +
        '<li><b>Flash trống hoặc nguồn không đủ.</b> Thử: đo dòng tiêu thụ — board chạy mã thật và board ' +
        'chết đứng tiêu thụ khác nhau rõ rệt. Rồi mới tới bước cuối là nạp lại bootloader qua chế độ ' +
        'phục hồi của SoC.</li>' +
        '</ol>' +
        '<p>Nếu sau bước 3 mà đường serial đã được chứng minh là tốt, lúc đó bạn mới có quyền kết luận ' +
        '“chết ở mảnh 1”. Trước đó thì chưa.</p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', rows: 6,
      q: 'Hôm qua bạn làm xong phần thực hành: file <code>/tmp/virt.dtb</code> đã tạo được và ' +
         '<code>dtc</code> đọc được. Hôm nay mở WSL lên, gõ lại đúng câu lệnh dịch ngược thì nhận được ' +
         'thông báo dưới đây. Nêu <b>ba</b> nguyên nhân có thể, cho biết bạn nghi nguyên nhân nào nhất và ' +
         'vì sao, rồi mô tả <b>một</b> phép thử duy nhất đủ để phân biệt chúng.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'FATAL ERROR: Couldn\'t open "/tmp/virt.dtb": No such file or directory' }
      ],
      ph: 'Ba nguyên nhân có thể là… Tôi nghi nhất… vì… Phép thử:…',
      crit: [
        'Nêu được nguyên nhân đúng và khả năng cao nhất: <code>/tmp</code> bị dọn sạch khi WSL khởi ' +
          'động lại, nên file của hôm qua không còn nữa.',
        'Nêu được nguyên nhân gõ sai đường dẫn hoặc sai tên file.',
        'Nêu được nguyên nhân lệnh QEMU sinh file đã thất bại — và <b>loại được nó</b>, vì hôm qua bạn ' +
          'đã đọc file thành công.',
        'Phép thử cụ thể và đủ sức phân biệt: <code>ls -l /tmp/</code> — thư mục trống thì là nguyên ' +
          'nhân thứ nhất, có file tên khác thì là nguyên nhân thứ hai.',
        'Rút ra được kết luận dùng được về sau: <code>/tmp</code> không phải chỗ để dành đồ; muốn giữ ' +
          'qua đêm thì để trong <code>~</code>.'
      ],
      sol:
        '<p>Nguyên nhân thật, và cũng là nguyên nhân đã xảy ra thật lúc kiểm chứng bài này: <b><code>/tmp' +
        '</code> đã bị dọn sạch</b>. Máy ảo WSL tự tắt sau một lúc không dùng, và lần khởi động sau ' +
        '<code>/tmp</code> bắt đầu lại từ con số không. Không có ai xoá file của bạn cả — nó chưa bao giờ ' +
        'được coi là file cần giữ.</p>' +
        '<p>Hai nghi phạm còn lại: gõ nhầm đường dẫn (rất dễ, vì thông báo lỗi in ra đúng chuỗi bạn đã gõ ' +
        '— hãy đọc kỹ chuỗi trong ngoặc kép), và lệnh QEMU lần trước thất bại. Nghi phạm thứ ba loại được ' +
        'ngay bằng lập luận: hôm qua bạn đã <i>đọc</i> được file, nên nó đã từng tồn tại.</p>' +
        '<p>Một phép thử duy nhất tách được cả ba: <code>ls -l /tmp/</code>. Thư mục gần như trống → ' +
        '<code>/tmp</code> đã bị dọn. Có file nhưng tên hơi khác → bạn gõ nhầm. Cách chữa thì tầm thường: ' +
        'chạy lại lệnh <code>dumpdtb</code>, mất chưa tới một giây.</p>' +
        '<p>Bài học mang đi được: <code>/tmp</code> là chỗ để đồ dùng một lần. Từ Chặng 05 trở đi, kernel ' +
        'và rootfs bạn build sẽ nằm trong <code>~</code> — mất một file kernel vì để nhầm chỗ thì phải ' +
        'build lại cả tiếng.</p>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 2, rows: 6,
      q: 'Bạn chuyển sang board thật. Driver của cảm biến nhiệt độ <code>tmp105</code> đã được bật ' +
         '<b>thẳng vào kernel</b> (không phải module), kernel mới đã nạp lên board, và cảm biến đã hàn ' +
         'đúng vào bus I2C số 1 ở địa chỉ 0x48 — đo bằng đồng hồ thấy nguồn và tín hiệu đều bình thường. ' +
         'Khởi động lên, <code>dmesg</code> có dòng cho thấy driver <code>tmp105</code> đã đăng ký thành ' +
         'công, nhưng <code>/sys/bus/i2c/devices/</code> thì trống trơn.<br>Nguyên nhân là gì? Vì sao “đã ' +
         'có driver” lại không đủ? Và ai là người phải nói cho kernel biết cảm biến tồn tại?',
      ph: 'Nguyên nhân là… “có driver” không đủ vì…',
      crit: [
        'Chỉ đúng nguyên nhân: Device Tree của board chưa khai báo cảm biến, nên với kernel nó không tồn tại.',
        'Phân biệt đúng hai việc khác nhau: <b>đăng ký driver</b> nghĩa là “tôi biết lái loại thiết bị ' +
          'này”, còn <b>khai báo thiết bị</b> nghĩa là “có một cái ở đây”.',
        'Nói rõ kernel chỉ ghép driver với thiết bị khi <b>cả hai</b> cùng có mặt, và ở phía thiết bị thì ' +
          'nguồn thông tin duy nhất là Device Tree.',
        'Nêu đúng việc phải làm: thêm một node con vào node bus I2C-1, với <code>compatible</code> khớp ' +
          'với driver và <code>reg = &lt;0x48&gt;</code>, rồi biên dịch lại <code>.dtb</code>.',
        'Không kết luận sai rằng phải sửa driver, build lại kernel hay hàn lại cảm biến.'
      ],
      sol:
        '<p>Không thiếu gì về phần cứng, và cũng không thiếu gì về phần mềm driver. Thiếu <b>lời khai</b>.</p>' +
        '<p>Hai câu nói khác nhau đang bị nhầm thành một. Dòng <code>dmesg</code> báo driver đã đăng ký ' +
        'nghĩa là: <i>“trong kernel này có một đoạn mã biết cách nói chuyện với chip loại tmp105”</i>. Nó ' +
        'hoàn toàn không nói rằng có một con tmp105 nào đó đang tồn tại trên bo mạch. Kernel chỉ tạo ra ' +
        'thiết bị — và gắn driver vào nó — khi có ai đó khai rằng thiết bị đó có mặt.</p>' +
        '<p>Trên bus I2C, người khai duy nhất là Device Tree. I2C không có nghi thức để chip tự giới ' +
        'thiệu, nên kernel sẽ không đi dò 127 địa chỉ trên bus để tìm xem có ai trả lời — dò mù như vậy ' +
        'còn có thể làm hỏng trạng thái của những chip khác đang nối chung bus.</p>' +
        '<p>Việc phải làm nằm gọn trong file <code>.dts</code> của board, không đụng gì tới mã nguồn:</p>' +
        '<pre><code>&amp;i2c1 {\n' +
        '        status = "okay";\n' +
        '        temp_sensor: temperature-sensor@48 {\n' +
        '                compatible = "ti,tmp105";\n' +
        '                reg = &lt;0x48&gt;;\n' +
        '        };\n' +
        '};</code></pre>' +
        '<p>Biên dịch lại <code>.dtb</code>, nạp lên, khởi động lại — cảm biến sẽ hiện ra trong ' +
        '<code>/sys/bus/i2c/devices/</code>. Chuỗi <code>compatible</code> là mấu chốt: chính nó là thứ ' +
        'kernel dùng để ghép node này với đúng driver kia. Chặng 08 và Chặng 10 sẽ làm việc này rất nhiều lần.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 7,
      q: 'Dự án của bạn chạy ngon trên QEMU: kernel tự build, rootfs tự lắp, ứng dụng chạy đúng. Sếp báo ' +
         'tuần sau board thật về — một board ARM64 của hãng khác. Hãy phân loại quy trình bạn đang có ' +
         'thành ba nhóm: <b>thứ giữ nguyên</b>, <b>thứ phải làm lại</b>, và <b>thứ lần đầu tiên mới xuất ' +
         'hiện</b> mà QEMU chưa hề dạy bạn. Cho ít nhất hai mục ở mỗi nhóm, và nói rõ bạn dựa vào ranh ' +
         'giới nào để phân loại.',
      ph: 'Giữ nguyên:… Làm lại:… Mới xuất hiện:… Ranh giới:…',
      crit: [
        'Nhóm <b>giữ nguyên</b> có ít nhất hai mục đúng: cross-compiler/toolchain, mã nguồn ứng dụng, ' +
          'cách build, kỹ năng đọc log và gỡ lỗi, bản thân mô hình host–target.',
        'Nhóm <b>làm lại</b> có ít nhất hai mục đúng: Device Tree của board mới, cấu hình kernel cho ' +
          'SoC mới, bootloader và tham số boot, cách nạp ảnh vào flash.',
        'Nhóm <b>mới xuất hiện</b> có ít nhất hai mục đúng: nguồn điện và xung nhịp, sai sót schematic, ' +
          'gỡ lỗi qua JTAG, nhiễu điện từ và độ ổn định nhiệt, tình huống board chết mà không có một ' +
          'dòng log nào.',
        'Nêu đúng ranh giới phân loại: thứ gì phụ thuộc vào <b>phần cứng cụ thể</b> thì phải làm lại; ' +
          'thứ gì thuộc về <b>quy trình</b> thì giữ nguyên.',
        'Không nói quá theo hướng “phải làm lại từ đầu” — phần lớn công sức bạn bỏ ra trên QEMU vẫn còn ' +
          'nguyên giá trị.'
      ],
      sol:
        '<p><b>Giữ nguyên.</b> Cross-compiler và toàn bộ toolchain (board mới vẫn là ARM64). Mã nguồn ứng ' +
        'dụng và hệ thống build của nó. Cách lắp rootfs. Thói quen đọc log, đọc panic, dùng ' +
        '<code>gdb</code>. Và quan trọng nhất là bản thân mô hình host–target: bạn vẫn build trên máy ' +
        'lớn rồi chuyển kết quả sang máy nhỏ, chỉ khác là “máy nhỏ” bây giờ có thể cầm được.</p>' +
        '<p><b>Làm lại.</b> Device Tree — board mới có SoC khác, bus khác, chân khác, nên gần như viết ' +
        'lại từ bản mà nhà sản xuất cung cấp. Cấu hình kernel: phải bật driver cho SoC mới, cho bộ điều ' +
        'khiển mạng, cho bộ nhớ lưu trữ. Bootloader: bản U-Boot phải được cấu hình cho đúng board, và ' +
        'tham số boot đổi theo. Cách nạp ảnh: QEMU chỉ cần một tuỳ chọn <code>-kernel</code>, board thật ' +
        'cần thẻ SD, eMMC hay chế độ phục hồi qua USB.</p>' +
        '<p><b>Mới xuất hiện.</b> Đây là cột bên phải trong bảng của bài học, và cũng là chỗ QEMU không ' +
        'thể giúp: nguồn điện có sụt khi Wi-Fi phát không, thạch anh có dao động không, schematic có nối ' +
        'nhầm chân nào không, JTAG, nhiễu điện từ, độ ổn định nhiệt. Cộng thêm một trải nghiệm rất riêng ' +
        'mà bài học gọi đúng tên: <i>cảm giác board chết mà không có một dòng log nào</i>.</p>' +
        '<p>Ranh giới rất gọn: <b>phụ thuộc phần cứng cụ thể thì làm lại, thuộc về quy trình thì giữ ' +
        'nguyên</b>. Cột bên trái của bảng chiếm khoảng 80 % khối lượng công việc thật, và bạn đã làm nó ' +
        'xong hết trên QEMU rồi.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', truc: 0, rows: 8,
      q: 'Bạn phải chọn chip cho một thiết bị sẽ sản xuất 50 000 chiếc. Yêu cầu: đo nhiệt độ ở 4 điểm, ' +
         'đẩy số liệu lên server qua Wi-Fi, có trang web cấu hình chạy ngay trên thiết bị, và phải đóng ' +
         'một van trong vòng <b>200 micro-giây</b> kể từ lúc nhận tín hiệu báo động. Ba phương án nhà ' +
         'cung cấp chào giá như dưới đây.<br>Chọn <b>một</b> phương án và biện minh. Phần được chấm là ' +
         'lý lẽ chứ không phải lựa chọn: nói rõ <i>từng</i> yêu cầu trong đề loại phương án nào và vì sao. ' +
         'Viết 5–8 câu.',
      blocks: [
        { t: 'table',
          head: ['Phương án', 'Cấu hình', 'Giá / chiếc'],
          rows: [
            ['1', 'SoC Cortex-A7 <b>có MMU</b>, 64 MB RAM — chạy Embedded Linux', '3,0 USD'],
            ['2', 'MCU Cortex-M7 <b>không MMU</b>, 64 MB RAM gắn ngoài — chạy FreeRTOS', '2,2 USD'],
            ['3', 'SoC Cortex-A7 có MMU chạy Linux, <b>cộng thêm</b> một MCU Cortex-M0 nhỏ chạy bare-metal', '3,6 USD']
          ]}
      ],
      ph: 'Yêu cầu “trang web cấu hình” loại phương án… vì… Yêu cầu “200 µs” loại phương án… vì…',
      crit: [
        'Nêu đúng vì sao phương án 2 gặp khó: không có MMU thì không chạy được Linux đầy đủ, mà trang ' +
          'web cấu hình, Wi-Fi và hệ thống file là những thứ Linux cho sẵn còn RTOS phải tự ghép từng mảnh.',
        'Nói rõ 64 MB RAM <b>không</b> cứu được phương án 2 — ranh giới là MMU, không phải dung lượng RAM.',
        'Nêu đúng vì sao phương án 1 gặp khó: Linux thường không bảo đảm được mốc 200 µs; bảng trong bài ' +
          'xếp nó ở mức “khá, cần bản vá PREEMPT_RT”, không phải “rất tốt”.',
        'Chọn phương án 3 và giải thích đúng kiến trúc ghép: phần thông minh giao cho Linux, phần thời ' +
          'gian thực giao cho một vi điều khiển riêng — đúng cách ô tô hiện đại đang làm.',
        'Có đụng tới tiền và vẫn bảo vệ được lựa chọn: chênh 0,6 USD × 50 000 chiếc = <b>30 000 USD</b>, ' +
          'và nói được vì sao khoản đó vẫn rẻ hơn rủi ro trượt mốc 200 µs.'
      ],
      sol:
        '<p><b>Chọn phương án 3.</b> Cách đi tới nó là cho từng yêu cầu tự loại bớt phương án.</p>' +
        '<p><i>Trang web cấu hình + Wi-Fi + lưu số liệu.</i> Đây là lãnh địa của Linux: ngăn xếp TCP/IP ' +
        'hoàn chỉnh, máy chủ web có sẵn, hệ thống file thật, và một kho phần mềm khổng lồ. Trên FreeRTOS ' +
        'bạn phải tự ghép từng thư viện rời và tự bảo trì chúng suốt 10 năm vòng đời sản phẩm. Yêu cầu ' +
        'này đẩy phương án 2 vào thế bất lợi nặng.</p>' +
        '<p><i>Không có MMU.</i> Và đây mới là đòn kết liễu phương án 2: 64 MB RAM của nó nghe rất thoải ' +
        'mái, nhưng RAM không phải ranh giới. Cortex-M7 không có MMU, nên Linux đầy đủ không chạy được ' +
        'trên đó — dù bạn có gắn 1 GB. Đây đúng là chỗ trực giác hay đánh lừa người mới.</p>' +
        '<p><i>Mốc 200 micro-giây.</i> Yêu cầu này quay ngược lại loại phương án 1. Linux chuẩn không hứa ' +
        'gì về độ trễ trường hợp xấu nhất; muốn tiến gần thì phải dùng bản vá PREEMPT_RT, và bảng trong ' +
        'bài vẫn chỉ xếp nó ở mức “khá”. Một cái van đóng muộn không phải sự bất tiện — nó là sự cố an toàn.</p>' +
        '<p>Còn lại phương án 3, và nó không phải giải pháp chắp vá mà là kiến trúc chuẩn: Linux lo phần ' +
        'thông minh (mạng, web, lưu trữ), con Cortex-M0 chạy bare-metal lo đúng một việc là đóng van đúng ' +
        'hạn. Ô tô hiện đại làm y như vậy.</p>' +
        '<p><i>Tiền.</i> Chênh so với phương án 1 là 0,6 USD × 50 000 = <b>30 000 USD</b>. Nghe thì to, ' +
        'nhưng hãy so với cái giá của một đợt thu hồi sản phẩm vì van đóng muộn, hoặc với công sức bảo ' +
        'trì một ngăn xếp mạng tự ghép trên RTOS trong mười năm. Nếu vẫn phải cắt chi phí, câu hỏi đúng ' +
        'không phải “bỏ MCU đi được không” mà là “mốc 200 µs có thật sự là 200 µs, hay khách hàng chỉ ' +
        'đang nói cho chắc”. Đó cũng là câu hỏi đầu tiên một kỹ sư có nghề sẽ hỏi lại.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN D — ÔN XEN KẼ (0 câu ở bộ này)
     ══════════════════════════════════════════════ */
  D: [],

  DEmpty:
    '<p><b>Phần này của bộ bt-01 rỗng, và đó là chuyện bình thường.</b> Ôn xen kẽ nghĩa là hỏi về những ' +
    'bài <i>trước</i> mà bài này đứng lên — nhưng Bài 1 không có bài nào trước nó.</p>' +
    '<p>Từ <b>bt-02</b> trở đi phần này sẽ luôn có 3 câu, và chúng là thứ chống quên rẻ nhất trong cả ' +
    'khoá: sau tám tháng học, thứ khiến người ta hụt hơi không phải bài đang đọc mà là bài đã đọc từ ' +
    'ba tháng trước. Những gì bạn vừa làm ở phần A, B, C của bộ này sẽ quay lại chính ở đó.</p>',

  /* ══════════════════════════════════════════════
     PHẦN E — THỰC HÀNH (6 câu)
     2 dự đoán output · 2 gõ lệnh · 1 sửa lỗi · 1 thử thách
     Mọi con số dưới đây đã chạy thật trên máy bạn (QEMU 10.2.1), 2026-08-10.
     ══════════════════════════════════════════════ */
  E: [

    { id: 'e1', k: 'num', tag: 'Dự đoán output', a: 1048576, tol: 0, unit: 'byte',
      q: 'Ở phần thực hành Bài 1, lệnh dưới đây sinh ra <code>/tmp/virt.dtb</code> nặng đúng ' +
         '<b>1 048 576 byte</b>. Bây giờ bạn thêm <code>-smp 2</code> để máy ảo có <b>hai</b> lõi CPU — ' +
         'device tree sẽ phải mô tả thêm một lõi nữa.<br><b>Dự đoán trước khi chạy:</b> file ' +
         '<code>.dtb</code> lần này nặng bao nhiêu byte?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'qemu-system-aarch64 -machine virt,dumpdtb=/tmp/virt2.dtb -cpu cortex-a57 -smp 2 -nographic\n' +
          'stat -c %s /tmp/virt2.dtb' }
      ],
      why:
        '<p>Vẫn đúng <b>1 048 576 byte</b> — không đổi một byte nào, dù nội dung bên trong đã khác đi. ' +
        'Trực giác “thêm nội dung thì file to ra” sai ở đây, vì file này không phải một khối dữ liệu ' +
        'vừa khít: QEMU dành sẵn một vùng nhớ cố định <b>1 MiB</b> cho device tree, sinh cây vào đó rồi ' +
        'đổ nguyên cả vùng ra file, phần thừa là số 0. Nội dung thật chỉ chiếm vài KB đầu.</p>' +
        '<p>Vì sao lại dành dư nhiều thế? Vì bootloader cần chỗ để <i>sửa</i> cây trước khi trao cho ' +
        'kernel — thêm dòng tham số khởi động, thêm địa chỉ initramfs, sửa dung lượng RAM thật đo được. ' +
        'Nếu vùng nhớ vừa khít thì mọi lần thêm một thuộc tính đều phải dời cả cây. Chặng 06 sẽ cho bạn ' +
        'thấy U-Boot làm đúng việc sửa này.</p>' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 5,
      q: 'Vẫn với <code>-smp 2</code> ở câu trên. Bản dts dịch ngược từ máy một lõi có <b>393 dòng</b>.' +
         '<br><b>Trước khi chạy</b>, hãy viết ra: (a) bản dts hai lõi nhiều hơn hay ít hơn 393 dòng, ' +
         '(b) ước lượng chênh lệch là vài dòng hay vài chục dòng, (c) vì sao câu E1 kích thước file lại ' +
         'không đổi trong khi ở đây nội dung thì đổi. Rồi chạy hai lệnh dưới và so với dự đoán của bạn.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'dtc -I dtb -O dts /tmp/virt.dtb  2>/dev/null > /tmp/a.dts\n' +
          'dtc -I dtb -O dts /tmp/virt2.dtb 2>/dev/null > /tmp/b.dts\n' +
          'wc -l /tmp/a.dts /tmp/b.dts\n' +
          'diff /tmp/a.dts /tmp/b.dts | grep -c \'^[<>]\'' }
      ],
      ph: '(a) Tôi dự đoán… (b) chênh khoảng… (c) file không đổi kích thước vì…',
      crit: [
        'Dự đoán đúng hướng: <b>nhiều dòng hơn</b>, vì phải mô tả thêm một lõi CPU.',
        'Ước lượng đúng bậc độ lớn: chênh vài chục dòng chứ không phải vài trăm — kết quả thật là ' +
          '<b>393 → 406 dòng</b>.',
        'Giải thích được vì sao kích thước file không đổi: vùng chứa device tree là <b>1 MiB cố định</b>, ' +
          'phần thừa được đệm bằng số 0.',
        'Có <b>ghi lại dự đoán trước khi chạy</b>, rồi mới đối chiếu — đó mới là chỗ học được.'
      ],
      sol:
        '<p>Kết quả thật trên máy bạn: <b>393 → 406 dòng</b>, và <code>diff</code> đếm được <b>39</b> ' +
        'dòng khác nhau. Chỉ thêm đúng một lõi CPU mà 39 dòng đổi, nhiều hơn hẳn so với cảm giác ban đầu.</p>' +
        '<pre><code>  393 /tmp/a.dts\n  406 /tmp/b.dts\n  799 total\n39</code></pre>' +
        '<p>Vì sao 39 chứ không phải 13? Vì thêm một lõi kéo theo cả một dây chuyền: node ' +
        '<code>cpu@1</code> mới, một node ngắt riêng cho lõi đó, và — thứ gây bất ngờ nhất — hàng loạt ' +
        'node khác bị <b>đánh số lại</b> cái mã tham chiếu nội bộ của chúng. Bạn chạm vào một chỗ, cây ' +
        'dịch chuyển ở nhiều chỗ. Đây chính là lý do device tree được biên dịch ra <code>.dtb</code> ' +
        'chứ không đọc trực tiếp bản chữ.</p>' +
        '<p>Và hai kết quả của E1 và E2 hợp lại thành một bài học duy nhất: <b>kích thước file không nói ' +
        'gì về nội dung file</b>. Muốn biết cây đổi hay không thì phải so nội dung, không phải nhìn ' +
        '<code>ls -l</code>. Chặng 08 sẽ sống với điều này suốt cả chặng.</p>' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 4,
      q: 'Khách hàng hỏi: <i>“Máy ảo <code>virt</code> có bus I2C để cắm cảm biến không?”</i> Bạn không ' +
         'tra tài liệu, bạn hỏi thẳng device tree.<br>Viết <b>một dòng lệnh duy nhất</b> (được dùng ống ' +
         '<code>|</code>) trả lời câu hỏi đó từ file <code>/tmp/virt.dtb</code> đã có. Chạy nó, ghi lại ' +
         'kết quả, rồi nói kết quả đó có nghĩa gì.',
      ph: 'Lệnh: … Kết quả: … Nghĩa là:…',
      crit: [
        'Lệnh có đủ hai vế: dịch ngược bằng <code>dtc -I dtb -O dts</code>, rồi lọc bằng ' +
          '<code>grep</code> — ví dụ <code>dtc -I dtb -O dts /tmp/virt.dtb 2&gt;/dev/null | grep -ic i2c</code>.',
        'Có dùng <code>-i</code> (bỏ qua hoa/thường) hoặc giải thích được vì sao không cần.',
        'Ghi đúng kết quả thật: <b>0</b>.',
        'Diễn giải đúng: máy <code>virt</code> <b>không có</b> bus I2C — và vì device tree là bản khai ' +
          'đầy đủ của phần cứng, không có dòng nào nghĩa là không có thiết bị đó.',
        'Không kết luận nhầm rằng “kernel chưa bật driver I2C” — câu hỏi ở đây là phần cứng có hay không, ' +
          'chưa đụng gì tới kernel.'
      ],
      sol:
        '<p>Một dòng là đủ:</p>' +
        '<pre><code>dtc -I dtb -O dts /tmp/virt.dtb 2&gt;/dev/null | grep -ic i2c</code></pre>' +
        '<p>Kết quả: <b>0</b>. Không có lấy một dòng nhắc tới I2C. Câu trả lời cho khách hàng là ' +
        '“không”, và bạn có bằng chứng chứ không phải trí nhớ.</p>' +
        '<p>Ba chi tiết đáng giữ lại. <code>2&gt;/dev/null</code> vứt cảnh báo của <code>dtc</code> đi ' +
        'để chúng không lẫn vào kết quả lọc. <code>-i</code> phòng trường hợp cây viết <code>I2C</code> ' +
        'hoa. <code>-c</code> đếm thay vì in, nên câu trả lời gọn thành một con số.</p>' +
        '<p>Và đây là quy tắc ở câu C3 nhìn từ phía bên kia. <b>Không có dòng nào trong device tree ' +
        '≡ không tồn tại đối với kernel.</b> Ở C3, cảm biến hàn thật trên bo mà không khai thì kernel ' +
        'cũng coi như không có. Hai mặt của cùng một quy tắc, và bạn vừa kiểm chứng cả hai.</p>' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 4,
      q: 'Bạn sắp biên dịch chương trình cho một board ARM64. Trước khi gõ bất cứ lệnh biên dịch nào, ' +
         'hãy trả lời bằng lệnh: <b>máy bạn đang ngồi gõ có kiến trúc gì?</b><br>Viết lệnh, chạy, ghi ' +
         'kết quả, rồi nói kết quả đó bắt bạn phải làm gì tiếp theo.',
      ph: 'Lệnh: … Kết quả: … Vậy tôi phải…',
      crit: [
        'Dùng đúng lệnh: <code>uname -m</code> (chấp nhận <code>arch</code>, hoặc <code>uname -a</code> ' +
          'rồi chỉ ra phần kiến trúc).',
        'Ghi đúng kết quả thật trên máy bạn: <b><code>x86_64</code></b>.',
        'Kết luận đúng: host là x86_64 còn target là ARM64, hai kiến trúc khác nhau, nên <code>gcc</code> ' +
          'thường sẽ cho ra file chạy được trên máy bạn nhưng vô dụng trên board.',
        'Nêu đúng việc phải làm: dùng <b>trình biên dịch chéo</b> (ví dụ ' +
          '<code>aarch64-linux-gnu-gcc</code>) chứ không phải <code>gcc</code>.'
      ],
      solBlocks: [
        { t: 'p', x: 'Lệnh và kết quả thật trên máy bạn:' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'uname -m' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'x86_64' },
        { t: 'p', x:
          '<code>x86_64</code> là kiến trúc của con CPU Intel/AMD trong máy bạn. Board đích là ARM64 — ' +
          'một tập lệnh hoàn toàn khác, không có quan hệ họ hàng nào. Một file thực thi biên dịch ở đây ' +
          'sẽ không chạy được ở đó, và ngược lại.' },
        { t: 'p', x:
          'Nên bước tiếp theo không phải <code>gcc hello.c</code> mà là ' +
          '<code>aarch64-linux-gnu-gcc hello.c</code> — cùng một trình biên dịch, nhưng sinh mã cho tập ' +
          'lệnh khác. Đó chính là mô hình <b>host – target</b> ở câu A1: máy mạnh làm việc nặng, máy nhỏ ' +
          'chỉ nhận kết quả.' },
        { t: 'cal', kind: 'tip', title: 'Thói quen nên tập từ bây giờ',
          x: 'Hỏi máy trước, đoán sau. <code>uname -m</code> mất một phần nghìn giây và loại được cả một ' +
             'lớp lỗi mà nếu không hỏi thì bạn chỉ phát hiện ra lúc board báo <code>Exec format error</code> — ' +
             'đúng lỗi bạn sẽ cố tình gây ra ở Bài 3.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 4,
      q: 'Một bạn học cùng nhắn tin: <i>“Mình gõ y hệt bài mà QEMU báo lỗi này, không tạo được file dtb.”</i>' +
         '<br>Lệnh bạn ấy gõ và thông báo nhận được ở dưới. Chỉ ra <b>sai chính xác ở đâu</b>, viết lại ' +
         'lệnh cho đúng, và giải thích quy tắc chung để lần sau bạn ấy không lặp lại.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', nocopy: true, code:
          'qemu-system-aarch64 -dumpdtb=/tmp/virt.dtb -cpu cortex-a57 -nographic' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'qemu-system-aarch64: -dumpdtb=/tmp/virt.dtb: invalid option' }
      ],
      ph: 'Sai ở chỗ… Lệnh đúng là… Quy tắc chung:…',
      crit: [
        'Chỉ đúng lỗi: <code>dumpdtb</code> <b>không phải một tham số độc lập</b>, nó là một thuộc tính ' +
          'của <code>-machine</code>.',
        'Chỉ ra thiếu luôn cả tên máy: lệnh sai không hề nói mình muốn mô phỏng máy nào.',
        'Viết lại đúng, nối bằng <b>dấu phẩy</b>: ' +
          '<code>qemu-system-aarch64 -machine virt,dumpdtb=/tmp/virt.dtb -cpu cortex-a57 -nographic</code>.',
        'Nêu được quy tắc chung: trong QEMU, dấu phẩy sau một tham số nghĩa là “thuộc tính con của tham ' +
          'số đó”, không phải một tham số mới.',
        'Đọc đúng thông báo lỗi: QEMU in ra nguyên văn chuỗi nó không hiểu, nên bản thân thông báo đã ' +
          'chỉ thẳng vào thủ phạm.'
      ],
      sol:
        '<p>Thiếu <code>-machine virt,</code> ở đầu. Bạn ấy tách <code>dumpdtb=</code> ra thành một tham ' +
        'số riêng, nhưng nó không phải tham số — nó là <b>thuộc tính của máy</b>. Lệnh đúng:</p>' +
        '<pre><code>qemu-system-aarch64 -machine virt,dumpdtb=/tmp/virt.dtb -cpu cortex-a57 -nographic</code></pre>' +
        '<p>Nghĩ theo lối này thì hợp lý: device tree là bản khai <i>của một máy cụ thể</i>. Chưa nói ' +
        'máy nào thì không có gì để khai. Dấu phẩy là cách QEMU viết “thuộc tính con”, và nó dùng cú ' +
        'pháp đó ở khắp nơi — <code>-drive file=…,if=none</code>, <code>-device …,bus=…</code>. Thấy dấu ' +
        'phẩy là biết mọi thứ phía sau vẫn thuộc về tham số phía trước.</p>' +
        '<p>Điều đáng học nhất lại là cách thông báo lỗi được viết: QEMU in nguyên chuỗi nó không hiểu, ' +
        '<code>-dumpdtb=/tmp/virt.dtb</code>. Nó không nói “bạn quên -machine” — công cụ hiếm khi đoán ' +
        'giúp ý định của bạn — nhưng nó đã khoanh vùng thủ phạm chính xác tuyệt đối. Đọc kỹ chuỗi trong ' +
        'thông báo lỗi thường nhanh hơn đọc lại cả câu lệnh.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: 'Câu này được phép làm dở dang — nó gieo một câu hỏi mà Chặng 05 và Chặng 08 mới trả lời trọn vẹn.' +
         '<br>Trong bản dts của máy <code>virt</code> có một node tên <code>memory@40000000</code>. Hãy ' +
         'tự tìm hiểu: (a) RAM của máy ảo bắt đầu ở địa chỉ nào và <b>dung lượng bao nhiêu</b> — đọc ra ' +
         'từ dòng <code>reg</code>; (b) chạy lại lệnh dumpdtb với <code>-m 1G</code> rồi ' +
         '<code>diff</code> hai bản dts, xem <b>đúng bao nhiêu dòng</b> thật sự đổi; (c) trả lời câu khó: ' +
         'vì sao RAM lại bắt đầu ở <code>0x40000000</code> chứ không phải ở địa chỉ 0?',
      ph: '(a) … (b) … (c) Tôi đoán vì…',
      crit: [
        '(a) Đọc được dòng <code>reg = &lt;0x00 0x40000000 0x00 0x8000000&gt;;</code> và tách đúng thành ' +
          'hai phần: <b>địa chỉ bắt đầu</b> 0x40000000 và <b>dung lượng</b> 0x8000000 = 128 MiB.',
        '(b) Chạy được phép so sánh và thấy <b>chỉ đúng một dòng có ý nghĩa đổi</b>: 0x8000000 → ' +
          '0x40000000 (128 MiB → 1 GiB).',
        '(b) Nhận ra hai dòng <code>rng-seed</code> / <code>kaslr-seed</code> cũng đổi nhưng là ' +
          '<b>nhiễu</b>: chúng là số ngẫu nhiên, đổi ở mọi lần chạy, kể cả khi không đổi gì.',
        '(c) Có một giả thuyết hợp lý cho việc RAM không bắt đầu ở 0 — chẳng hạn vùng địa chỉ thấp đã ' +
          'dành cho thứ khác.'
      ],
      sol:
        '<p><b>(a)</b> Dòng cần đọc là:</p>' +
        '<pre><code>	memory@40000000 {\n		reg = &lt;0x00 0x40000000 0x00 0x8000000&gt;;\n		device_type = "memory";\n	};</code></pre>' +
        '<p>Bốn số đó là hai cặp: <b>địa chỉ bắt đầu</b> = 0x00 0x40000000, <b>dung lượng</b> = 0x00 ' +
        '0x8000000. Mỗi giá trị chiếm hai số vì địa chỉ 64 bit được ghi thành hai nửa 32 bit. Vậy RAM ' +
        'bắt đầu ở mốc 1 GiB và dài <b>0x8000000 = 128 MiB</b> — đúng dung lượng mặc định QEMU cấp khi ' +
        'bạn không nói gì. Tên node cũng nhắc lại địa chỉ đó: <code>memory@40000000</code>.</p>' +
        '<p><b>(b)</b> Với <code>-m 1G</code>, <code>diff</code> chỉ ra <b>một</b> dòng có ý nghĩa:</p>' +
        '<pre><code>21c21\n&lt; 		reg = &lt;0x00 0x40000000 0x00 0x8000000&gt;;\n---\n&gt; 		reg = &lt;0x00 0x40000000 0x00 0x40000000&gt;;</code></pre>' +
        '<p>0x8000000 → 0x40000000, tức 128 MiB → 1 GiB. Địa chỉ bắt đầu <b>không đổi</b>. Hai dòng ' +
        '<code>rng-seed</code> và <code>kaslr-seed</code> cũng hiện ra trong <code>diff</code>, nhưng ' +
        'chúng là số ngẫu nhiên sinh mới mỗi lần chạy — chạy hai lần liên tiếp mà không đổi gì thì chúng ' +
        'vẫn khác nhau. Biết đâu là tín hiệu và đâu là nhiễu là một kỹ năng riêng, và bạn vừa gặp nó lần đầu.</p>' +
        '<p><b>(c)</b> Đây là câu để ngỏ. Gợi ý: hãy nhớ lại rằng bản dts này còn tả một loạt thứ khác — ' +
        'UART ở <code>0x09000000</code>, bộ điều khiển ngắt ở <code>0x08000000</code>, vùng flash ở ' +
        '<code>0x00000000</code>. Tất cả chúng đều nằm <i>dưới</i> mốc 1 GiB. Trong một hệ nhúng, RAM và ' +
        'thanh ghi thiết bị dùng chung <b>một</b> không gian địa chỉ, nên phải chia phần cho nhau. Vùng ' +
        'thấp đã bị chiếm, RAM lấy phần trên. Chặng 05 sẽ cho bạn xem toàn bộ bản đồ này, và Chặng 08 sẽ ' +
        'dạy bạn tự viết ra nó.</p>' }
  ],

  /* ══════════════════════════════════════════════
     PHẦN F — BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU
     Không phải câu hỏi. Là bảng tra: sai câu nào → hổng chỗ nào → đọc lại mục nào.
     Mọi liên kết trỏ thẳng tới đúng mục trong Bài 1.
     ══════════════════════════════════════════════ */
  diag: [

    ['A1, B2, C4, E4',
     'Mô hình <b>host – target</b>. Bạn đang lẫn giữa máy <i>làm ra</i> phần mềm và máy <i>chạy</i> phần mềm.',
     '<a href="#/bai-01#khac-gi-so-voi-ubuntu-tren-may-tinh">Khác gì so với Ubuntu trên máy tính</a> · ' +
     '<a href="#/bai-01#vi-sao-wsl2-va-qemu-la-du-de-hoc">Vì sao WSL2 và QEMU là đủ để học</a>'],

    ['A4, C5',
     'Ranh giới giữa <b>bare-metal, RTOS và Linux</b>. Bạn chưa có tiêu chí để nói khi nào Linux là lựa chọn sai.',
     '<a href="#/bai-01#ba-lua-chon-khi-lam-mot-thiet-bi">Ba lựa chọn khi làm một thiết bị</a>'],

    ['A7, B3, C5',
     '<b>Trục 1 — MMU là ranh giới cứng.</b> Bạn đang nghĩ chip mạnh hay nhiều RAM thì chạy được Linux. ' +
     'Không phải RAM quyết định, mà là có MMU hay không.',
     '<a href="#/bai-01#ba-lua-chon-khi-lam-mot-thiet-bi">Ba lựa chọn khi làm một thiết bị</a> — bảng so sánh ba lựa chọn'],

    ['A8, B5, C1',
     '<b>Trục 2 — bốn mảnh chạy nối tiếp.</b> Bạn chưa dùng được thứ tự bootloader → kernel → rootfs → ' +
     'ứng dụng để suy ra “chết ở mảnh nào”.',
     '<a href="#/bai-01#bon-manh-ghep-cua-mot-he-embedded-linux">Bốn mảnh ghép của một hệ Embedded Linux</a>'],

    ['A5, B6, C3, E3',
     '<b>Trục 3 — phần cứng không tự khai báo.</b> Bạn vẫn đang chờ hệ điều hành “tự nhận” thiết bị như ' +
     'trên máy tính để bàn.',
     '<a href="#/bai-01#thuc-hanh-nhin-thay-bon-manh-ghep-tren-may-ban">Thực hành</a> — bước dump device tree'],

    ['A2',
     '<code>/proc</code> là hệ thống file <b>ảo</b>: nó không nằm trên ổ đĩa, mà là kernel trả lời câu ' +
     'hỏi ngay lúc bạn đọc.',
     '<a href="#/bai-01#thuc-hanh-nhin-thay-bon-manh-ghep-tren-may-ban">Thực hành</a> — bước xem <code>/proc</code>'],

    ['A3, B1',
     'Vai trò của <b>root filesystem</b>: BusyBox gộp nhiều lệnh vào một file, và vì sao rootfs chỉ đọc ' +
     'lại chịu được mất điện đột ngột.',
     '<a href="#/bai-01#manh-3-root-filesystem">Mảnh 3 — Root filesystem</a>'],

    ['A6',
     'Vì sao thiết bị nhúng đo thời gian khởi động bằng <b>giây</b>, còn máy tính để bàn thì không ai bấm giờ.',
     '<a href="#/bai-01#khac-gi-so-voi-ubuntu-tren-may-tinh">Khác gì so với Ubuntu trên máy tính</a>'],

    ['B2',
     '<b>Kernel và rootfs là hai thứ tách rời</b> — hai file, nạp riêng, đổi được cái này mà giữ cái kia.',
     '<a href="#/bai-01#bon-manh-ghep-cua-mot-he-embedded-linux">Bốn mảnh ghép</a> · ' +
     '<a href="#/bai-01#manh-3-root-filesystem">Mảnh 3 — Root filesystem</a>'],

    ['B4',
     'Bạn đang giữ ít nhất một hiểu nhầm phổ biến: bootloader ở lại chạy cùng kernel, RAM luôn bắt đầu ' +
     'ở địa chỉ 0, hoặc <code>/boot</code> trống là dấu hiệu hỏng.',
     '<a href="#/bai-01#manh-1-bootloader">Mảnh 1 — Bootloader</a> · ' +
     '<a href="#/bai-01#loi-thuong-gap">Lỗi thường gặp</a>'],

    ['C2, E5',
     'Kỹ năng đọc thông báo lỗi: thông báo in ra <i>đúng chuỗi</i> mà công cụ không hiểu, và đó đã là ' +
     'nửa lời giải.',
     '<a href="#/bai-01#loi-thuong-gap">Lỗi thường gặp</a>'],

    ['E1, E2, E6',
     'Thao tác với device tree: dump ra <code>.dtb</code>, dịch ngược bằng <code>dtc</code>, và hiểu vì ' +
     'sao file luôn nặng đúng 1 MiB dù nội dung khác nhau.',
     '<a href="#/bai-01#thuc-hanh-nhin-thay-bon-manh-ghep-tren-may-ban">Thực hành</a> — bước 4 và bước 5'],

    ['Sai từ 8 câu trở lên',
     'Đừng làm tiếp bộ này. Đọc lại <b>toàn bộ</b> Bài 1 một lượt, làm lại phần thực hành từ đầu, rồi ' +
     'quay lại. Bài 1 là nền của cả 69 bài còn lại — hổng ở đây thì mọi chặng sau đều nặng hơn mức cần thiết.',
     '<a href="#/bai-01">Đọc lại Bài 1 từ đầu</a>']
  ]
});

/* ============================================================
   BÀI 1 — Embedded Linux là gì và tại sao nó ở khắp mọi nơi
   Chặng 00 · Nhập môn
   ============================================================ */
Lesson.register({
  id: 'bai-01',
  title: 'Embedded Linux là gì và tại sao nó ở khắp mọi nơi',
  minutes: 35,
  practice: 'Thực hành 15 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Bạn đang cầm điện thoại, ngồi cạnh một cái router, có thể có một cái TV thông minh trong phòng. ' +
    'Ít nhất một trong ba thứ đó đang chạy Linux — nhưng không phải bản Linux mà bạn hình dung. ' +
    'Bài này giải thích thứ Linux đó là gì, nó khác Linux trên máy tính ra sao, và vì sao ' +
    'nghề làm ra nó lại được trả lương cao.',

  goals: [
    'Giải thích được Embedded Linux là gì bằng ngôn ngữ của chính bạn',
    'Biết khi nào nên chọn Embedded Linux, khi nào nên chọn vi điều khiển thuần',
    'Kể tên và nêu nhiệm vụ của <b>bốn mảnh ghép</b> tạo nên một hệ Embedded Linux',
    'Hiểu vì sao WSL2 + QEMU đủ để học hầu hết chương trình này',
    'Tự tay nhìn thấy cả bốn mảnh ghép đó trên chính máy của bạn'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VẤN ĐỀ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bắt đầu từ một câu hỏi rất đời thường' },

    { t: 'p', x:
      'Cái router Wi-Fi nhà bạn có một nút reset, vài đèn LED, và không có màn hình. ' +
      'Nhưng bên trong nó có một con chip, có RAM, có bộ nhớ flash, và nó phải làm rất nhiều việc ' +
      'cùng lúc: định tuyến gói tin, chạy máy chủ DHCP, phục vụ trang cấu hình qua trình duyệt, ' +
      'mã hoá Wi-Fi, ghi log.' },

    { t: 'p', x:
      'Người kỹ sư làm ra nó đứng trước một lựa chọn. Tự viết toàn bộ phần mềm từ đầu — bao gồm cả ' +
      'bộ xử lý TCP/IP, hệ thống file, và cơ chế chạy nhiều tác vụ song song? Hay lấy một hệ điều hành ' +
      'đã có sẵn tất cả những thứ đó, đã được hàng triệu người kiểm nghiệm, miễn phí, và cắt gọt nó ' +
      'cho vừa với 64 MB RAM?' },

    { t: 'p', x:
      'Lựa chọn thứ hai chính là <b>Embedded Linux</b>. Và nó đã thắng áp đảo trong 20 năm qua.' },

    { t: 'fig',
      cap: 'Embedded Linux nằm ở vùng giữa: phần cứng đủ mạnh để chạy một hệ điều hành thật, nhưng vẫn bị giới hạn tài nguyên và phải chạy liên tục nhiều năm không ai đụng vào.',
      svg:
      '<svg viewBox="0 0 720 206" width="720" role="img" aria-label="Phổ thiết bị tính toán từ vi điều khiển đến máy chủ">' +
        '<rect class="d-box"   x="20"  y="26" width="200" height="92" rx="10" stroke-width="1.5"/>' +
        '<rect class="d-box-p" x="240" y="26" width="240" height="92" rx="10" stroke-width="2"/>' +
        '<rect class="d-box"   x="500" y="26" width="200" height="92" rx="10" stroke-width="1.5"/>' +

        '<text class="d-t"  x="120" y="54"  text-anchor="middle">Bare-metal / RTOS</text>' +
        '<text class="d-ts" x="120" y="76"  text-anchor="middle">Vi điều khiển 8 – 32 bit</text>' +
        '<text class="d-ts" x="120" y="96"  text-anchor="middle">RAM: 2 KB – 512 KB</text>' +

        '<text class="d-t"  x="360" y="54"  text-anchor="middle">EMBEDDED LINUX</text>' +
        '<text class="d-ts" x="360" y="76"  text-anchor="middle">RAM: 32 MB – 4 GB, CPU có MMU</text>' +
        '<text class="d-ts" x="360" y="96"  text-anchor="middle">Router, TV, xe hơi, máy POS, camera</text>' +

        '<text class="d-t"  x="600" y="54"  text-anchor="middle">Linux đầy đủ</text>' +
        '<text class="d-ts" x="600" y="76"  text-anchor="middle">RAM: 8 GB trở lên</text>' +
        '<text class="d-ts" x="600" y="96"  text-anchor="middle">Laptop, máy chủ, đám mây</text>' +

        '<path class="d-line" d="M20 148 H690" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M690 143 l14 5 -14 5 z"/>' +
        '<text class="d-ts" x="20"  y="172" text-anchor="start">ít tài nguyên</text>' +
        '<text class="d-ts" x="700" y="172" text-anchor="end">nhiều tài nguyên</text>' +
        '<text class="d-ts" x="360" y="192" text-anchor="middle">vùng bạn sắp học</text>' +
        '<path class="d-line" d="M360 156 V178" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       2. ĐỊNH NGHĨA
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vậy Embedded Linux là gì' },

    { t: 'p', x:
      'Định nghĩa ngắn gọn nhất:' },

    { t: 'cal', kind: 'info', title: 'Định nghĩa', x:
      '<p><b>Embedded Linux</b> là việc dùng nhân Linux và hệ sinh thái phần mềm quanh nó để chạy ' +
      'một thiết bị chuyên dụng — thiết bị đó làm một nhiệm vụ cố định, thường không có màn hình ' +
      'và bàn phím, tài nguyên hạn chế, và phải chạy liên tục nhiều năm mà không cần người quản trị.</p>' },

    { t: 'p', x:
      'Điểm mấu chốt nằm ở chữ <b>chuyên dụng</b>. Máy tính của bạn là thiết bị đa dụng: hôm nay bạn ' +
      'lướt web, mai bạn dựng video, mốt bạn cài thêm game. Một cái máy giặt thông minh thì không. ' +
      'Nó làm đúng một việc, mãi mãi. Sự khác biệt đó chi phối gần như mọi quyết định kỹ thuật ' +
      'trong khoá học này.' },

    { t: 'terms', items: [
      ['SoC', 'System on Chip',
       'Một con chip chứa sẵn CPU, bộ điều khiển RAM, USB, Ethernet, GPIO… Trong thiết bị nhúng, ' +
       'gần như mọi thứ nằm trên một con chip duy nhất thay vì rải ra trên bo mạch chủ.'],
      ['MMU', 'Memory Management Unit',
       'Khối phần cứng dịch địa chỉ ảo sang địa chỉ vật lý. <b>Đây là ranh giới quyết định:</b> ' +
       'Linux đầy đủ bắt buộc phải có MMU. Chip không có MMU thì chỉ chạy được RTOS hoặc bản Linux ' +
       'rút gọn rất đặc biệt.'],
      ['RTOS', 'Real-Time Operating System',
       'Hệ điều hành thời gian thực, rất nhỏ (vài KB), đảm bảo phản hồi trong khoảng thời gian ' +
       'xác định trước. Ví dụ: FreeRTOS, Zephyr.'],
      ['Target', 'Máy đích',
       'Thiết bị mà phần mềm sẽ chạy trên đó. Trong khoá này, target của bạn là máy ảo QEMU ARM64.'],
      ['Host', 'Máy chủ phát triển',
       'Máy bạn ngồi gõ code và biên dịch. Trong khoá này, host là WSL2 Ubuntu chạy trên Windows.']
    ]},

    { t: 'cal', kind: 'why', x:
      '<p>Vì sao MMU lại là ranh giới quan trọng đến vậy?</p>' +
      '<p>MMU cho phép mỗi tiến trình có một không gian địa chỉ riêng. Nhờ đó, một chương trình lỗi ' +
      'ghi bậy vào con trỏ sẽ chỉ làm hỏng chính nó, chứ không kéo sập cả hệ thống. Toàn bộ mô hình ' +
      'bảo vệ bộ nhớ của Linux — thứ khiến nó đáng tin cậy — được xây trên MMU. Không có MMU thì ' +
      'không có ranh giới giữa user space và kernel space, và Linux mất đi lợi thế lớn nhất của mình.</p>' },

    /* ══════════════════════════════════════════════
       3. BA LỰA CHỌN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba lựa chọn khi làm một thiết bị' },

    { t: 'p', x:
      'Embedded Linux không phải lúc nào cũng là câu trả lời đúng. Người làm nghề cần biết khi nào ' +
      '<i>không</i> nên dùng nó.' },

    { t: 'table',
      head: ['Tiêu chí', 'Bare-metal', 'RTOS', 'Embedded Linux'],
      rows: [
        ['RAM tối thiểu', '~2 KB', '~16 KB', '~16–32 MB'],
        ['Thời gian khởi động', 'Vài mili-giây', 'Vài mili-giây', '0,5 – 20 giây'],
        ['Đa nhiệm', 'Tự viết vòng lặp', 'Có, theo mức ưu tiên', 'Có, đầy đủ và có bảo vệ bộ nhớ'],
        ['Mạng TCP/IP', 'Phải tự tích hợp', 'Thư viện rời', 'Có sẵn, hoàn chỉnh'],
        ['Hệ thống file', 'Hầu như không', 'Đơn giản', 'ext4, SquashFS, UBIFS…'],
        ['Thời gian thực cứng', '<b>Rất tốt</b>', '<b>Rất tốt</b>', 'Khá (cần bản vá PREEMPT_RT)'],
        ['Kho phần mềm sẵn có', 'Rất ít', 'Ít', '<b>Khổng lồ</b>'],
        ['Điện năng tiêu thụ', '<b>Cực thấp</b>', 'Rất thấp', 'Trung bình'],
        ['Giá thành chip', '<b>Rẻ nhất</b>', 'Rẻ', 'Cao hơn'],
        ['Ví dụ điển hình', 'Điều khiển từ xa', 'Máy đo nhịp tim', 'Router, TV box, xe hơi']
      ]},

    { t: 'cal', kind: 'tip', title: 'Quy tắc chọn nhanh', x:
      '<ul>' +
      '<li>Cần <b>mạng, màn hình, hệ thống file, hoặc nhiều tác vụ song song</b> → Embedded Linux.</li>' +
      '<li>Cần <b>phản hồi trong micro-giây</b>, hoặc chạy pin cả năm → RTOS hoặc bare-metal.</li>' +
      '<li>Cần cả hai → nhiều sản phẩm dùng cách ghép: một SoC chạy Linux lo phần thông minh, ' +
      'cộng thêm một vi điều khiển nhỏ lo phần thời gian thực. Ô tô hiện đại làm đúng như vậy.</li>' +
      '</ul>' },

    /* ══════════════════════════════════════════════
       4. KHÁC GÌ LINUX DESKTOP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Khác gì so với Ubuntu trên máy tính' },

    { t: 'p', x:
      'Đây là chỗ nhiều người mới hiểu sai. Họ nghĩ Embedded Linux chỉ là "Ubuntu nhưng nhỏ hơn". ' +
      'Thực tế khác biệt nằm ở tư duy thiết kế, không chỉ ở kích thước.' },

    { t: 'table',
      head: ['Khía cạnh', 'Linux máy bàn', 'Embedded Linux'],
      rows: [
        ['Cài đặt hệ thống', 'Chạy trình cài đặt, chọn tuỳ chọn',
         'Ghi thẳng một file ảnh vào flash — không có bước cài'],
        ['Ai lắp hệ thống', 'Canonical, Red Hat… lắp sẵn cho bạn',
         '<b>Bạn tự lắp từng thành phần</b>'],
        ['Nâng cấp phần mềm', '<code>apt upgrade</code> từng gói',
         'Thay nguyên cả ảnh hệ thống, có cơ chế quay lui'],
        ['Hệ thống file gốc', 'Đọc ghi tự do', 'Thường chỉ đọc, để mất điện đột ngột không hỏng'],
        ['Mô tả phần cứng', 'Tự dò tìm qua PCI, ACPI, USB',
         '<b>Khai báo tay bằng Device Tree</b> — phần cứng không tự giới thiệu'],
        ['Nơi biên dịch', 'Biên dịch ngay trên máy đó', '<b>Cross-compile</b> từ máy x86 sang ARM'],
        ['Thời gian khởi động', 'Không ai quan tâm lắm', 'Chỉ tiêu quan trọng, đôi khi phải dưới 1 giây'],
        ['Cách gỡ lỗi', 'Có màn hình, có terminal', 'Chỉ có một cổng serial, đôi khi chỉ có đèn LED'],
        ['Vòng đời sản phẩm', '2 – 5 năm', '10 – 20 năm']
      ]},

    { t: 'cal', kind: 'warn', title: 'Điểm cần khắc cốt ghi tâm', x:
      '<p>Trên máy bàn, phần cứng <b>tự giới thiệu</b> với kernel: cắm USB vào, kernel hỏi thiết bị ' +
      '"anh là ai", thiết bị trả lời, kernel nạp driver phù hợp.</p>' +
      '<p>Trên hệ nhúng, phần lớn phần cứng <b>im lặng hoàn toàn</b>. Con chip cảm biến nhiệt độ nối ' +
      'vào chân I2C không có cách nào tự nói cho kernel biết nó tồn tại. Bạn phải viết ra bằng tay: ' +
      '"tại địa chỉ 0x48 trên bus I2C số 1 có một cảm biến loại này". Văn bản mô tả đó gọi là ' +
      '<b>Device Tree</b>, và cả Chặng 08 dành riêng cho nó.</p>' },

    /* ══════════════════════════════════════════════
       5. BỐN MẢNH GHÉP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn mảnh ghép của một hệ Embedded Linux' },

    { t: 'p', x:
      'Đây là kiến thức xương sống. Toàn bộ 69 bài còn lại chỉ là đào sâu vào bốn mảnh này. ' +
      'Nếu bạn chỉ nhớ một hình duy nhất từ bài học hôm nay, hãy nhớ hình dưới đây.' },

    { t: 'fig',
      cap: 'Bốn tầng của một hệ Embedded Linux. Khi bật nguồn, chúng chạy từ dưới lên: Bootloader → Kernel → Rootfs → Ứng dụng.',
      svg:
      '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Bốn tầng của hệ Embedded Linux">' +
        '<rect class="d-box-g" x="40" y="16"  width="330" height="50" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-a" x="40" y="76"  width="330" height="50" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-p" x="40" y="136" width="330" height="50" rx="8" stroke-width="2"/>' +
        '<rect class="d-box-w" x="40" y="196" width="330" height="50" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box"   x="40" y="256" width="330" height="50" rx="8" stroke-width="1.5" stroke-dasharray="5 4"/>' +

        '<text class="d-t" x="205" y="46"  text-anchor="middle">4 · Ứng dụng của bạn</text>' +
        '<text class="d-t" x="205" y="106" text-anchor="middle">3 · Root filesystem</text>' +
        '<text class="d-t" x="205" y="166" text-anchor="middle">2 · Linux Kernel</text>' +
        '<text class="d-t" x="205" y="226" text-anchor="middle">1 · Bootloader</text>' +
        '<text class="d-t" x="205" y="286" text-anchor="middle">Phần cứng</text>' +

        '<text class="d-ts" x="392" y="40">Chương trình C/Python bạn viết ra,</text>' +
        '<text class="d-ts" x="392" y="56">thứ tạo nên giá trị của sản phẩm</text>' +

        '<text class="d-ts" x="392" y="100">Thư viện C, BusyBox, /etc, /bin —</text>' +
        '<text class="d-ts" x="392" y="116">mọi file mà hệ thống cần để sống</text>' +

        '<text class="d-ts" x="392" y="160">Quản lý CPU, RAM, tiến trình,</text>' +
        '<text class="d-ts" x="392" y="176">driver và toàn bộ phần cứng</text>' +

        '<text class="d-ts" x="392" y="220">Khởi tạo RAM, nạp kernel,</text>' +
        '<text class="d-ts" x="392" y="236">rồi tự xoá mình khỏi bộ nhớ</text>' +

        '<text class="d-ts" x="392" y="280">SoC, RAM, Flash — hoặc QEMU</text>' +
        '<text class="d-ts" x="392" y="296">giả lập tất cả những thứ đó</text>' +

        '<path class="d-line" d="M24 296 V36" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M19 36 l5 -13 5 13 z"/>' +
      '</svg>' },

    { t: 'h3', x: 'Mảnh 1 — Bootloader' },
    { t: 'p', x:
      'Khi bạn cấp điện cho một con chip, CPU không biết gì cả. RAM chưa được khởi tạo — nó thậm chí ' +
      'chưa dùng được. Không có hệ thống file, không có khái niệm "chương trình".' },
    { t: 'p', x:
      'Bootloader là đoạn mã đầu tiên chạy được trong hoàn cảnh khắc nghiệt đó. Nhiệm vụ của nó: ' +
      'khởi tạo bộ điều khiển RAM, bật cổng serial để có chỗ in thông báo, tìm kernel trong flash ' +
      'hoặc thẻ nhớ, chép kernel vào RAM, rồi nhảy vào kernel — và biến mất. Bootloader phổ biến nhất ' +
      'trong thế giới nhúng tên là <b>U-Boot</b>. Chặng 06 dành cho nó.' },

    { t: 'h3', x: 'Mảnh 2 — Linux Kernel' },
    { t: 'p', x:
      'Nhân hệ điều hành. Nó quản lý bộ nhớ, chia thời gian CPU cho các tiến trình, cung cấp hệ thống ' +
      'file, ngăn xếp mạng, và quan trọng nhất với người làm nhúng: <b>driver</b> — lớp mã nói chuyện ' +
      'trực tiếp với phần cứng.' },
    { t: 'p', x:
      'Kernel bạn dùng sẽ không phải kernel tải về rồi dùng nguyên. Bạn sẽ tự cấu hình nó: bật những ' +
      'thứ cần, tắt những thứ thừa, đôi khi thêm driver do chính bạn viết. Chặng 07 và Chặng 10 là ' +
      'hai chặng nặng nhất khoá học, đều xoay quanh mảnh này.' },

    { t: 'h3', x: 'Mảnh 3 — Root filesystem' },
    { t: 'p', x:
      'Kernel chạy xong sẽ đi tìm một hệ thống file để gắn vào vị trí <code>/</code>, rồi chạy chương ' +
      'trình đầu tiên trong đó. Nếu không tìm thấy, nó dừng lại với thông báo huyền thoại mà mọi kỹ sư ' +
      'nhúng đều từng gặp:' },
    { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'thông báo lỗi kinh điển', code:
      'Kernel panic - not syncing: No working init found.\n' +
      'Try passing init= option to kernel.' },
    { t: 'p', x:
      'Root filesystem chứa toàn bộ file mà hệ thống cần: thư viện C, các lệnh cơ bản, file cấu hình ' +
      'trong <code>/etc</code>, và chương trình khởi động. Trên hệ nhúng nó thường rất nhỏ — ' +
      'chỉ vài megabyte — nhờ một công cụ tên <b>BusyBox</b> gộp hàng trăm lệnh Unix vào một file ' +
      'thực thi duy nhất. Chặng 09 hướng dẫn bạn tự lắp rootfs bằng tay.' },

    { t: 'h3', x: 'Mảnh 4 — Ứng dụng' },
    { t: 'p', x:
      'Phần mềm làm nên giá trị thật của sản phẩm: chương trình đọc cảm biến, giao diện web cấu hình, ' +
      'logic điều khiển động cơ. Đây là mảnh gần với lập trình thông thường nhất — nhưng bạn phải ' +
      'biên dịch nó cho ARM, và phải cân nhắc từng megabyte.' },

    { t: 'cal', kind: 'info', title: 'Tại sao thứ tự lại quan trọng', x:
      '<p>Bốn mảnh này chạy nối tiếp nhau, mảnh sau phụ thuộc hoàn toàn vào mảnh trước. Khi thiết bị ' +
      'không lên, việc đầu tiên người có nghề làm là xác định <b>nó chết ở mảnh nào</b>:</p>' +
      '<ul>' +
      '<li>Cổng serial không in ra ký tự nào → chết ở mảnh 1 (bootloader)</li>' +
      '<li>Có log bootloader rồi im lặng → kernel không nạp được, hoặc sai tham số console</li>' +
      '<li>Kernel chạy rồi báo <code>No working init found</code> → chết ở mảnh 3 (rootfs)</li>' +
      '<li>Vào được shell nhưng ứng dụng không chạy → mảnh 4</li>' +
      '</ul>' +
      '<p>Bài 2 sẽ đi sâu vào luồng khởi động này.</p>' },

    /* ══════════════════════════════════════════════
       6. VÌ SAO WSL + QEMU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao WSL2 và QEMU là đủ để học' },

    { t: 'p', x:
      'Câu hỏi hợp lý: học về thiết bị mà không có thiết bị thì học kiểu gì? Câu trả lời nằm ở chỗ ' +
      'trong nghề này, <b>bạn gần như không bao giờ lập trình trực tiếp trên thiết bị</b>.' },

    { t: 'p', x:
      'Con router có 64 MB RAM không thể chạy trình biên dịch. Quy trình thật luôn là: viết code và ' +
      'biên dịch trên một máy tính mạnh, rồi chuyển kết quả sang thiết bị để chạy. Hai vai trò đó có ' +
      'tên riêng: <b>host</b> (máy build) và <b>target</b> (máy đích).' },

    { t: 'fig',
      cap: 'Mô hình host–target. QEMU thay chỗ của board thật; mọi thao tác còn lại giống hệt công việc thực tế.',
      svg:
      '<svg viewBox="0 0 720 206" width="720" role="img" aria-label="Mô hình máy build và máy đích">' +
        '<rect class="d-box-p" x="30"  y="30" width="260" height="120" rx="10" stroke-width="2"/>' +
        '<rect class="d-box-a" x="430" y="30" width="260" height="120" rx="10" stroke-width="2"/>' +

        '<text class="d-t"  x="160" y="58"  text-anchor="middle">HOST — máy build</text>' +
        '<text class="d-ts" x="160" y="80"  text-anchor="middle">WSL2 · Ubuntu · x86-64</text>' +
        '<text class="d-ts" x="160" y="102" text-anchor="middle">source code, cross-compiler</text>' +
        '<text class="d-ts" x="160" y="124" text-anchor="middle">make, git, gdb</text>' +

        '<text class="d-t"  x="560" y="58"  text-anchor="middle">TARGET — máy đích</text>' +
        '<text class="d-ts" x="560" y="80"  text-anchor="middle">QEMU · ARM64 · máy ảo</text>' +
        '<text class="d-ts" x="560" y="102" text-anchor="middle">kernel + rootfs của bạn</text>' +
        '<text class="d-ts" x="560" y="124" text-anchor="middle">chạy thật, panic thật</text>' +

        '<path class="d-line" d="M300 84 H412" stroke-width="2"/>' +
        '<path class="d-arrow" d="M412 79 l14 5 -14 5 z"/>' +
        '<text class="d-tm" x="356" y="74" text-anchor="middle">Image, .ko, rootfs</text>' +

        '<path class="d-line" d="M412 116 H300" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        '<path class="d-arrow" d="M300 111 l-14 5 14 5 z"/>' +
        '<text class="d-tm" x="356" y="136" text-anchor="middle">log, gdb, serial</text>' +

        '<text class="d-ts" x="360" y="182" text-anchor="middle">Thay QEMU bằng board thật thì mọi thứ còn lại giữ nguyên</text>' +
      '</svg>' },

    { t: 'p', x:
      'QEMU giả lập toàn bộ một máy ARM64: CPU, RAM, cổng serial, bộ điều khiển ngắt, thiết bị lưu trữ. ' +
      'Kernel chạy trong đó không biết mình đang bị giả lập — nó khởi động, nạp driver, và panic ' +
      'y hệt như trên silicon thật.' },

    { t: 'table',
      head: ['Học được đầy đủ với QEMU', 'Bắt buộc phải có phần cứng thật'],
      rows: [
        ['Cross-compile, toolchain', 'Đo tín hiệu bằng oscilloscope'],
        ['U-Boot, tham số boot', 'Debug qua JTAG thật'],
        ['Cấu hình và build kernel', 'Sai sót schematic, nguồn, xung nhịp'],
        ['Device Tree, driver, ngắt', 'Đo điện năng tiêu thụ thật'],
        ['Rootfs, BusyBox, init, Buildroot', 'Nhiễu điện từ, độ ổn định nhiệt'],
        ['Debug bằng GDB, đọc panic, ftrace', 'Cảm giác board chết mà không có một dòng log']
      ]},

    { t: 'cal', kind: 'tip', x:
      '<p>Cột bên trái chiếm khoảng <b>80% khối lượng công việc thực tế</b> của một Embedded Linux ' +
      'Engineer. Cột bên phải quan trọng, nhưng chỉ có ý nghĩa sau khi bạn đã vững cột trái. ' +
      'Chặng 13 sẽ hướng dẫn bạn chuyển sang board thật khi đã sẵn sàng.</p>' },

    /* ══════════════════════════════════════════════
       7. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: nhìn thấy bốn mảnh ghép trên máy bạn' },

    { t: 'p', x:
      'Lý thuyết chỉ thành kiến thức khi bạn tự tay kiểm chứng. Phần này bạn sẽ soi vào chính máy ' +
      'mình để thấy từng mảnh ghép — và thấy cả chỗ mảnh ghép bị <i>thiếu</i>, vì WSL2 không phải ' +
      'một hệ Linux bình thường.' },

    { t: 'cal', kind: 'info', title: 'Chuẩn bị', x:
      '<p>Mở <b>Terminal</b> trên Windows (<kbd>Win</kbd> + <kbd>X</kbd> → Terminal), gõ ' +
      '<code>wsl</code> rồi Enter. Dấu nhắc phải đổi thành dạng <code>tên@máy:~$</code>. ' +
      'Toàn bộ phần thực hành này chạy trong WSL.</p>' },

    { t: 'steps', items: [

      { title: 'Xác định bạn đang đứng ở đâu',
        blocks: [
          { t: 'p', x: 'Trước khi soi hệ thống, hãy biết mình đang ở máy nào và kiến trúc gì.' },
          { t: 'code', where: 'wsl', code:
            'uname -a' },
          { t: 'p', x: 'Kết quả trên máy bạn sẽ giống thế này:' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Linux Shinarus 6.18.33.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC \\\n' +
            'Thu Jun 18 21:54:43 UTC 2026 x86_64 GNU/Linux' },

          { t: 'cmdx', cmd: 'uname -a', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['uname', 'Viết tắt của <i>unix name</i>. In thông tin về nhân hệ điều hành đang chạy.',
               'Đây là lệnh đầu tiên bạn nên gõ khi đăng nhập vào một máy lạ.'],
              ['-a', 'Viết tắt của <code>--all</code>. In toàn bộ thông tin thay vì chỉ một mục.',
               'Thử <code>uname -r</code> để chỉ lấy phiên bản kernel, <code>uname -m</code> để chỉ lấy kiến trúc.']
            ]},

          { t: 'h4', x: 'Đọc kết quả' },
          { t: 'table',
            head: ['Phần', 'Ý nghĩa'],
            rows: [
              ['<code>Linux</code>', 'Tên nhân hệ điều hành'],
              ['<code>Shinarus</code>', 'Tên máy (hostname)'],
              ['<code>6.18.33.2</code>', 'Phiên bản kernel'],
              ['<code>microsoft-standard-WSL2</code>',
               '<b>Chi tiết quan trọng nhất dòng này.</b> Đây là kernel do Microsoft build, ' +
               'không phải kernel của Ubuntu'],
              ['<code>SMP</code>', 'Symmetric Multi-Processing — kernel hỗ trợ nhiều lõi CPU'],
              ['<code>PREEMPT_DYNAMIC</code>',
               'Chế độ trưng dụng CPU. Bạn sẽ gặp lại khái niệm này ở Chặng 10 khi học về ngắt'],
              ['<code>x86_64</code>',
               'Kiến trúc CPU. <b>Ghi nhớ con số này</b> — target của bạn sẽ là <code>aarch64</code>, ' +
               'và đó chính là lý do phải cross-compile']
            ]},

          { t: 'cal', kind: 'why', x:
            '<p>Vì sao chuỗi <code>microsoft-standard-WSL2</code> lại đáng chú ý?</p>' +
            '<p>Vì nó nói rằng bạn đang chạy hệ thống file của Ubuntu trên một kernel <i>không phải ' +
            'của Ubuntu</i>. Đây là minh hoạ sống động cho mảnh 2 và mảnh 3 trong sơ đồ bên trên: ' +
            'kernel và rootfs là hai thứ tách rời, có thể ghép chéo nhau. Chính khả năng ghép chéo ' +
            'đó là nền tảng của toàn bộ nghề Embedded Linux — bạn sẽ ghép kernel tự build với rootfs ' +
            'tự lắp.</p>' }
        ]},

      { title: 'Tìm mảnh 2 — Kernel',
        blocks: [
          { t: 'p', x:
            'Kernel công bố thông tin về chính nó qua một hệ thống file ảo tên <code>/proc</code>. ' +
            'Các file trong đó không nằm trên đĩa — chúng được kernel sinh ra ngay lúc bạn đọc.' },
          { t: 'code', where: 'wsl', code:
            'cat /proc/version' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Linux version 6.18.33.2-microsoft-standard-WSL2 (root@f1bbfb02316b)\n' +
            '(gcc (GCC) 13.2.0, GNU ld (GNU Binutils) 2.41) #1 SMP PREEMPT_DYNAMIC ...' },

          { t: 'cmdx', cmd: 'cat /proc/version', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['cat', 'Viết tắt của <i>concatenate</i>. In nội dung file ra màn hình.',
               'Tên lệnh bắt nguồn từ khả năng nối nhiều file lại; nhưng 99% trường hợp người ta dùng nó chỉ để xem một file.'],
              ['/proc', 'Hệ thống file ảo do kernel tạo ra để phơi bày trạng thái bên trong của nó.',
               'Không tốn một byte nào trên đĩa. Đây là cách chuẩn để chương trình ở user space hỏi thông tin kernel.'],
              ['/proc/version', 'File chứa phiên bản kernel và trình biên dịch đã build ra nó.', '']
            ]},

          { t: 'p', x:
            'Chú ý phần <code>gcc (GCC) 13.2.0</code>: nó cho biết kernel này được biên dịch bằng ' +
            'GCC 13.2. Ở Chặng 07 bạn sẽ tự build kernel, và dòng này sẽ hiện tên trình biên dịch ' +
            'của chính bạn.' },

          { t: 'cal', kind: 'tip', x:
            '<p>Thử thêm vài file khác trong <code>/proc</code> để cảm nhận kho thông tin này: ' +
            '<code>cat /proc/cpuinfo</code> (thông tin CPU), <code>cat /proc/meminfo</code> ' +
            '(bộ nhớ), <code>cat /proc/cmdline</code> (tham số kernel nhận lúc khởi động). ' +
            'File cuối cùng sẽ rất quan trọng ở Chặng 07.</p>' }
        ]},

      { title: 'Tìm mảnh 3 — Root filesystem',
        blocks: [
          { t: 'p', x:
            'Rootfs chính là cây thư mục bắt đầu từ <code>/</code>. Hãy nhìn tầng trên cùng của nó.' },
          { t: 'code', where: 'wsl', code:
            'ls /' },
          { t: 'p', x:
            'Bạn sẽ thấy các thư mục như <code>bin etc dev proc sys usr var tmp lib home root</code>. ' +
            'Đây không phải cách sắp xếp tuỳ hứng — nó tuân theo một chuẩn tên là ' +
            '<b>FHS</b> (Filesystem Hierarchy Standard), và Bài 5 sẽ giải thích ý nghĩa từng thư mục.' },
          { t: 'p', x:
            'Bây giờ hãy đếm xem rootfs của bạn nặng bao nhiêu:' },
          { t: 'code', where: 'wsl', code:
            'df -h /' },

          { t: 'cmdx', cmd: 'df -h /', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['df', 'Viết tắt của <i>disk free</i>. Báo cáo dung lượng đã dùng và còn trống của các hệ thống file đang gắn.', ''],
              ['-h', 'Viết tắt của <code>--human-readable</code>. Đổi từ số block khó đọc sang KB/MB/GB.',
               'Bỏ <code>-h</code> đi và chạy lại để thấy vì sao người ta luôn thêm nó.'],
              ['/', 'Chỉ định hỏi về hệ thống file gắn tại thư mục gốc, thay vì liệt kê tất cả.', '']
            ]},

          { t: 'cal', kind: 'info', x:
            '<p>Rootfs Ubuntu của bạn chiếm khoảng <b>2 GB</b>. Ở Chặng 09, rootfs bạn tự lắp bằng ' +
            'BusyBox sẽ nặng khoảng <b>3 MB</b> — nhỏ hơn gần 700 lần — mà vẫn boot vào được shell ' +
            'và chạy được chương trình. Con số đó cho thấy phần lớn dung lượng trên máy bàn là những ' +
            'thứ thiết bị nhúng không cần.</p>' }
        ]},

      { title: 'Tìm mảnh 1 — và phát hiện nó không tồn tại',
        blocks: [
          { t: 'p', x:
            'Trên một hệ Linux thật, thư mục <code>/boot</code> chứa file kernel và cấu hình ' +
            'bootloader. Hãy nhìn vào <code>/boot</code> của WSL2:' },
          { t: 'code', where: 'wsl', code:
            'ls -la /boot' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 8\n' +
            'drwxr-xr-x  2 root root 4096 Apr 20 15:46 .\n' +
            'drwxr-xr-x 19 root root 4096 Jul 31 22:35 ..' },

          { t: 'p', x:
            '<b>Trống rỗng.</b> Chỉ có hai mục <code>.</code> và <code>..</code> là thư mục hiện tại ' +
            'và thư mục cha — nghĩa là không có file nào cả.' },

          { t: 'cal', kind: 'why', x:
            '<p>Vì sao WSL2 không có bootloader?</p>' +
            '<p>Vì Windows đã làm thay công việc đó. Hypervisor của Windows nạp thẳng kernel ' +
            'Microsoft đã chuẩn bị sẵn vào bộ nhớ máy ảo rồi cho chạy. Mảnh ghép số 1 bị cắt bỏ ' +
            'hoàn toàn.</p>' +
            '<p>Đây chính xác là lý do bạn cần QEMU. Trong QEMU, bạn sẽ <b>tự chạy U-Boot</b>, tự nạp ' +
            'kernel, tự truyền tham số — trải nghiệm trọn vẹn mảnh ghép mà WSL2 không thể cho bạn.</p>' },

          { t: 'p', x: 'Kiểm chứng thêm: xem tiến trình đầu tiên mà kernel đã chạy.' },
          { t: 'code', where: 'wsl', code:
            'ps -p 1 -o pid,comm' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '    PID COMMAND\n' +
            '      1 systemd' },
          { t: 'p', x:
            'Tiến trình số 1 tên <code>systemd</code>. Nó là chương trình đầu tiên kernel khởi chạy ' +
            'sau khi gắn được rootfs, và là tổ tiên của mọi tiến trình khác trên máy. Trên thiết bị ' +
            'nhúng, vị trí này thường được giao cho một chương trình nhỏ hơn nhiều — Bài 49 sẽ so sánh ' +
            'các lựa chọn.' }
        ]},

      { title: 'Chạm vào QEMU lần đầu — nhìn thấy một máy ARM64',
        blocks: [
          { t: 'p', x:
            'Bước cuối cùng cho bạn nếm thử thứ sẽ theo bạn suốt khoá học. QEMU có thể dựng ra một ' +
            'máy ARM64 ảo và <b>xuất ra bản mô tả phần cứng của máy đó</b> — chính là Device Tree ' +
            'mà chúng ta vừa nói tới.' },

          { t: 'code', where: 'wsl', name: 'tạo file mô tả phần cứng', code:
            'qemu-system-aarch64 -machine virt,dumpdtb=/tmp/virt.dtb -cpu cortex-a57 -nographic' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 -machine virt,dumpdtb=/tmp/virt.dtb -cpu cortex-a57 -nographic',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['qemu-system-aarch64',
               'Bản QEMU giả lập trọn vẹn một máy kiến trúc ARM64 (còn gọi là AArch64).',
               'Khác với <code>qemu-aarch64</code> (không có <code>-system</code>) vốn chỉ chạy một chương trình lẻ.'],
              ['-machine virt',
               'Chọn loại bo mạch cần giả lập. <code>virt</code> là bo mạch ảo do QEMU tự thiết kế, không mô phỏng board có thật.',
               'Đây là lựa chọn tốt nhất để học: cấu trúc sạch sẽ, tài liệu đầy đủ, không có quirk phần cứng.'],
              [',dumpdtb=/tmp/virt.dtb',
               'Thuộc tính của <code>-machine</code>: ghi bản mô tả phần cứng ra file rồi thoát ngay.',
               'Chú ý dấu phẩy — nó gắn thuộc tính vào <code>-machine</code>, không phải một tuỳ chọn riêng.'],
              ['-cpu cortex-a57',
               'Chọn loại lõi CPU. Cortex-A57 là lõi ARM64 phổ biến, hỗ trợ đầy đủ.',
               'Luôn ghi rõ để tránh phụ thuộc vào giá trị mặc định thay đổi giữa các phiên bản QEMU.'],
              ['-nographic',
               'Không mở cửa sổ đồ hoạ; mọi thứ đi qua terminal.',
               'Tuỳ chọn bạn sẽ gõ hàng trăm lần trong khoá học này.']
            ]},

          { t: 'p', x:
            'Lệnh chạy xong lập tức, không in gì cả. Kiểm tra file vừa tạo:' },
          { t: 'code', where: 'wsl', code:
            'ls -lh /tmp/virt.dtb' },
          { t: 'p', x:
            'File này ở dạng nhị phân, máy đọc được nhưng người thì không. Dùng <code>dtc</code> ' +
            '(Device Tree Compiler) để dịch ngược nó sang dạng văn bản:' },
          { t: 'code', where: 'wsl', code:
            'dtc -I dtb -O dts /tmp/virt.dtb | head -25' },

          { t: 'cmdx', cmd: 'dtc -I dtb -O dts /tmp/virt.dtb | head -25', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['dtc', 'Device Tree Compiler — công cụ chuyển đổi giữa dạng văn bản (.dts) và dạng nhị phân (.dtb).', ''],
              ['-I dtb', '<i>Input</i> — định dạng đầu vào là nhị phân.', ''],
              ['-O dts', '<i>Output</i> — định dạng đầu ra là văn bản người đọc được.',
               'Vậy lệnh này đang chạy ngược quy trình biên dịch thông thường.'],
              ['|', 'Ống dẫn — lấy đầu ra của lệnh bên trái làm đầu vào cho lệnh bên phải.',
               'Nền tảng của triết lý Unix. Bài 10 dành trọn cho khái niệm này.'],
              ['head -25', 'Chỉ lấy 25 dòng đầu tiên.',
               'Không có nó, hàng trăm dòng sẽ trôi qua màn hình.']
            ]},

          { t: 'p', x: 'Kết quả — bạn đang đọc bản mô tả phần cứng của một máy ARM64:' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'trích 20 dòng đầu', code:
            '/dts-v1/;\n' +
            '\n' +
            '/ {\n' +
            '        interrupt-parent = <0x8002>;\n' +
            '        dma-coherent;\n' +
            '        model = "linux,dummy-virt";\n' +
            '        #size-cells = <0x02>;\n' +
            '        #address-cells = <0x02>;\n' +
            '        compatible = "linux,dummy-virt";\n' +
            '\n' +
            '        psci {\n' +
            '                migrate = <0xc4000005>;\n' +
            '                cpu_on = <0xc4000003>;\n' +
            '                method = "hvc";\n' +
            '                compatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";\n' +
            '        };\n' +
            '\n' +
            '        memory@40000000 {\n' +
            '                reg = <0x00 0x40000000 0x00 0x8000000>;\n' +
            '                device_type = "memory";\n' +
            '        };' },

          { t: 'p', x:
            'Bạn chưa cần hiểu hết. Nhưng hãy để ý ba điều — chúng là bản xem trước của cả Chặng 08:' },

          { t: 'list', items: [
            '<code>model = "linux,dummy-virt"</code> — tên của bo mạch ảo này. Kernel đọc dòng này ' +
            'để biết mình đang chạy trên máy gì.',
            '<code>memory@40000000</code> — RAM bắt đầu tại địa chỉ <code>0x40000000</code>. ' +
            'Trên hệ nhúng, RAM không bắt đầu từ địa chỉ 0; vị trí của nó là thứ phải khai báo rõ ràng.',
            '<code>reg = &lt;0x00 0x40000000 0x00 0x8000000&gt;</code> — hai số đầu là địa chỉ bắt đầu, ' +
            'hai số sau là kích thước. <code>0x8000000</code> = 134.217.728 byte = <b>128 MB</b>. ' +
            'Đó là dung lượng RAM mặc định QEMU cấp cho máy ảo.'
          ]},

          { t: 'cal', kind: 'tip', title: 'Bạn vừa làm được gì', x:
            '<p>Bạn vừa dựng ra một máy ARM64, trích xuất bản mô tả phần cứng của nó, và đọc được ' +
            'dung lượng RAM trực tiếp từ đó. Đây đúng là thao tác một kỹ sư Embedded Linux làm khi ' +
            'nhận một board mới. Không cần mua gì cả.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       8. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Học Embedded Linux phần lớn là học cách đọc lỗi. Bắt đầu thói quen đó ngay từ bài đầu tiên.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>qemu-system-aarch64: command not found</code>',
         'Chưa cài gói QEMU',
         'Chạy <code>sudo apt install qemu-system-arm</code>'],
        ['<code>dtc: command not found</code>',
         'Chưa cài Device Tree Compiler',
         'Chạy <code>sudo apt install device-tree-compiler</code>'],
        ['<code>Permission denied</code> khi ghi file',
         'Đang ghi vào thư mục cần quyền root',
         'Ghi vào <code>/tmp</code> hoặc <code>~</code>; hạn chế lạm dụng <code>sudo</code>'],
        ['Lệnh chạy rất chậm, chờ mãi',
         'Bạn đang đứng trong <code>/mnt/c/…</code>',
         'Gõ <code>cd ~</code> rồi làm lại. Xem lại lý do trong phần chuẩn bị môi trường'],
        ['<code>No such file or directory</code> với <code>/tmp/virt.dtb</code>',
         'Lệnh QEMU ở bước trước chưa chạy thành công',
         'Chạy lại lệnh <code>dumpdtb</code> và kiểm tra không có thông báo lỗi'],
        ['<code>bash: cd: /home/…: No such file</code>',
         'Gõ nhầm tên người dùng',
         'Dùng <code>cd ~</code> — dấu ngã luôn trỏ về thư mục nhà của bạn']
      ]},

    /* ══════════════════════════════════════════════
       9. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      '<b>Embedded Linux</b> = dùng Linux cho thiết bị chuyên dụng, tài nguyên hạn chế, chạy nhiều năm không người quản trị.',
      '<b>MMU là ranh giới</b>: có MMU mới chạy được Linux đầy đủ; không có thì dùng RTOS hoặc bare-metal.',
      '<b>Bốn mảnh ghép</b> theo thứ tự khởi động: Bootloader → Kernel → Root filesystem → Ứng dụng.',
      'Khác biệt lớn nhất so với máy bàn: <b>phần cứng không tự giới thiệu</b>, phải khai báo bằng Device Tree; và phải <b>cross-compile</b>.',
      'Nghề này vận hành theo mô hình <b>host – target</b>. WSL2 là host, QEMU là target — đúng cấu trúc công việc thật.',
      'Bạn đã tự tay xác nhận: kernel qua <code>/proc/version</code>, rootfs qua <code>ls /</code>, ' +
      'thiếu bootloader qua <code>/boot</code> rỗng, và đọc được Device Tree của một máy ARM64.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 2 — Toàn cảnh luồng khởi động.</b> Chúng ta sẽ theo dõi từng mili-giây từ lúc cấp ' +
      'điện đến lúc dấu nhắc shell hiện ra: ROM code chạy trước cả bootloader, vì sao cần boot nhiều ' +
      'tầng, kernel làm gì trong giây đầu tiên, và ở mỗi giai đoạn thì hỏng hóc biểu hiện ra sao.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Yếu tố phần cứng nào là <b>ranh giới bắt buộc</b> để chạy được Linux đầy đủ?',
      opts: [
        'CPU phải có tốc độ ít nhất 1 GHz',
        'CPU phải có MMU (Memory Management Unit)',
        'Thiết bị phải có cổng Ethernet',
        'Chip phải là kiến trúc ARM'
      ],
      a: 1,
      why: 'MMU cho phép mỗi tiến trình có không gian địa chỉ riêng — nền tảng của toàn bộ cơ chế ' +
           'bảo vệ bộ nhớ trong Linux. Tốc độ CPU, cổng mạng hay kiến trúc chip đều không phải điều ' +
           'kiện bắt buộc: Linux chạy trên ARM, x86, RISC-V, MIPS và nhiều kiến trúc khác.'
    },
    {
      q: 'Thành phần nào chịu trách nhiệm khởi tạo RAM và nạp kernel vào bộ nhớ?',
      opts: [
        'Linux Kernel',
        'Root filesystem',
        'Bootloader',
        'Tiến trình init'
      ],
      a: 2,
      why: 'Bootloader (thường là U-Boot) là mã đầu tiên chạy được sau khi cấp nguồn. Nó khởi tạo bộ ' +
           'điều khiển RAM, bật cổng serial, tìm và chép kernel vào RAM, rồi nhảy vào kernel và biến mất. ' +
           'Kernel không thể tự nạp chính mình vì lúc đó RAM còn chưa dùng được.'
    },
    {
      q: 'Thư mục <code>/boot</code> trong WSL2 hoàn toàn trống rỗng. Vì sao?',
      opts: [
        'Vì Ubuntu trong WSL2 bị cài lỗi, cần cài lại',
        'Vì file kernel bị Windows ẩn đi vì lý do bảo mật',
        'Vì WSL2 không dùng bootloader — Windows nạp thẳng kernel của Microsoft vào máy ảo',
        'Vì cần quyền root mới thấy được nội dung thư mục đó'
      ],
      a: 2,
      why: 'Hypervisor của Windows nạp sẵn kernel do Microsoft build vào bộ nhớ máy ảo rồi cho chạy, ' +
           'nên mảnh ghép số 1 bị cắt bỏ hoàn toàn. Đây chính là lý do bạn cần QEMU: chỉ trong QEMU ' +
           'bạn mới tự chạy được U-Boot và trải nghiệm trọn vẹn giai đoạn khởi động.'
    },
    {
      q: 'Khác biệt <b>căn bản</b> nào giữa cách phần cứng được nhận diện trên máy bàn và trên hệ nhúng?',
      opts: [
        'Hệ nhúng dò tìm phần cứng nhanh hơn nhờ ít thiết bị',
        'Máy bàn dò tìm được nhờ PCI/USB/ACPI, còn hệ nhúng phải khai báo tay bằng Device Tree',
        'Hệ nhúng không cần driver vì phần cứng đơn giản hơn',
        'Máy bàn dùng Device Tree, còn hệ nhúng dùng ACPI'
      ],
      a: 1,
      why: 'Trên máy bàn, thiết bị PCI hay USB có cơ chế tự giới thiệu danh tính với kernel. Trên hệ ' +
           'nhúng, một cảm biến nối vào chân I2C hoàn toàn im lặng — không có cách nào tự báo mình tồn tại. ' +
           'Vì vậy phải mô tả bằng tay trong Device Tree: thiết bị loại gì, ở địa chỉ nào, trên bus nào.'
    },
    {
      q: 'Trong mô hình học WSL2 + QEMU, vai trò của từng thành phần là gì?',
      opts: [
        'WSL2 là target, QEMU là host',
        'Cả hai đều là host, target là Windows',
        'WSL2 là host (máy build), QEMU là target (máy đích)',
        'WSL2 là host, còn QEMU chỉ là trình giả lập terminal'
      ],
      a: 2,
      why: 'WSL2 đóng vai host: nơi chứa source code, cross-compiler, make, gdb. QEMU đóng vai target: ' +
           'nơi kernel và rootfs bạn build thực sự chạy. Đây đúng là mô hình làm việc thật trong nghề — ' +
           'khi chuyển sang board thật, bạn chỉ thay QEMU bằng phần cứng, mọi thứ còn lại giữ nguyên.'
    }
  ]
});

/* Bài 57 — Đọc datasheet và GPIO hiện đại
   Chặng 10 — Kernel module và Driver
   Hai nửa:
   - Đọc tài liệu kỹ thuật ARM DDI 0190B (PL061 TRM, 68 trang) bằng pdftotext + grep, đối chiếu bảng
     thanh ghi, reset value và bit field với từng dòng readl/writel của vgpio.c (Bài 56), rồi kiểm chứng
     chính các câu trong datasheet bằng devmem trên PL061 của máy virt khi chưa driver nào nắm nó.
   - Khung gpiochip của kernel, GPIO chardev (/dev/gpiochipN) và libgpiod 2.2.5 (build tĩnh từ source,
     vì Ubuntu 20.04 chỉ có 1.4.1 và 2.3 đã chuyển sang meson). Thực hành trên PL061 thật (driver của
     kernel), trên gpio-sim (bật CONFIG_GPIO_SIM=m, build lại Image + modules), bằng một chương trình
     C dùng API libgpiod v2 (app/button.c, 63 dòng), và cuối cùng viết lại vgpio thành một gpio_chip
     (vgchip/vgchip.c, 143 dòng) — kèm biến thể VALUE_BEFORE_DIR_ONLY cho thấy câu "Writing to the data
     register only affects the pins that are configured as outputs" cắn người không đọc kỹ.
   Mọi số liệu đo 2026-09-30 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1, dtc 1.5.0,
   poppler-utils 0.86.1 chạy từ .deb giải nén — máy viết bài không nhập được mật khẩu sudo).
   Ghi chú kiểm chứng: lần build kernel thứ hai (bản ghi sạch) không còn dòng CC irq_sim.o/gpio-sim.o vì
   các object đó đã được build ở lần thử đầu cùng buổi; bài dùng log của lần build đầu tiên (32,4 s),
   là thứ người học sẽ thấy. Proxy công ty trả 401 ở một lần tải lại libgpiod; tarball dùng trong bản ghi
   sạch là bản đã tải và sha256sum -c OK trước đó. */

Lesson.register({
  id: 'bai-57',
  title: 'Đọc datasheet và GPIO hiện đại',
  minutes: 60,
  practice: 'Thực hành 55 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 56, bảng thanh ghi của PL061 được đưa cho bạn sẵn — chép từ các hằng số trong ' +
    '<code>drivers/gpio/gpio-pl061.c</code>. Trong công việc thật không có ai chép hộ: bạn nhận một chip mới, ' +
    'một file PDF vài chục tới vài nghìn trang, và phải tự tìm ra thanh ghi nào ở đâu, bit nào nghĩa là gì, ' +
    'bật nguồn lên thì nó mang giá trị gì. Kỹ năng đọc datasheet là thứ phân biệt người <b>viết</b> driver với ' +
    'người <b>sửa</b> driver người khác viết.<br><br>' +
    'Nửa đầu bài này mở đúng tài liệu gốc của ARM cho PL061, lần theo từng dòng <code>writel</code> của ' +
    '<code>vgpio.c</code> về câu chữ đã sinh ra nó, rồi dùng <code>devmem</code> để bắt phần cứng xác nhận hay ' +
    'phủ nhận từng câu. Nửa sau trả lời câu hỏi <code>vgpio</code> né tránh: file sysfs <code>leds</code> tự chế ' +
    'chỉ chương trình của bạn hiểu. Kernel đã có sẵn khung <b><code>gpiochip</code></b> để mọi bộ điều khiển ' +
    'GPIO nói cùng một thứ tiếng, và userspace hiện đại điều khiển chân qua <b><code>/dev/gpiochipN</code></b> ' +
    'bằng thư viện <b><code>libgpiod</code></b> — còn giao diện <code>/sys/class/gpio</code> mà các hướng dẫn ' +
    'cũ trên mạng vẫn dạy thì đã bị khai tử, và kernel của bạn thậm chí không có nó.',

  goals: [
    'Tìm được trong một datasheet (technical reference manual) chương nào dành cho người viết driver, đọc được ' +
      'bảng register map với các cột độ lệch, kiểu truy cập, độ rộng, reset value, và giải mã một bit field.',
    'Truy ngược mỗi dòng <code>readl</code>/<code>writel</code> của một driver về đúng mục trong datasheet, và ' +
      'phát hiện khi datasheet tự mâu thuẫn — rồi kiểm chứng bằng <code>devmem</code> trên phần cứng.',
    'Giải thích <code>struct gpio_chip</code> là gì, provider và consumer GPIO khác nhau thế nào, và đăng ký ' +
      'một bộ điều khiển MMIO làm <code>gpiochip</code> bằng <code>devm_gpiochip_add_data</code>.',
    'Nêu được ít nhất bốn lý do <code>/sys/class/gpio</code> bị thay bằng GPIO chardev, và kiểm tra được kernel ' +
      'của mình có bật giao diện nào.',
    'Build <code>libgpiod</code> 2.x cho ARM64, dùng <code>gpiodetect</code>/<code>gpioinfo</code>/' +
      '<code>gpioget</code>/<code>gpioset</code>/<code>gpiomon</code>, và viết một chương trình C chờ sự kiện ' +
      'sườn trên một chân.',
    'Dựng một bộ điều khiển GPIO giả bằng <code>gpio-sim</code> qua configfs để tạo sự kiện đầu vào mà máy ' +
      '<code>virt</code> không có.'
  ],

  blocks: [
    /* ============================================================
       1. DATASHEET GỒM NHỮNG GÌ
       ============================================================ */
    { t: 'h2', x: 'Một datasheet gồm những gì' },

    { t: 'p', x:
      'Chữ "datasheet" được dùng lỏng lẻo cho hai loại tài liệu khác nhau. <b>Datasheet</b> theo nghĩa hẹp mô tả ' +
      'con chip như một linh kiện điện tử: sơ đồ chân, điện áp, dòng tiêu thụ, nhiệt độ làm việc, kích thước vỏ — ' +
      'thứ người vẽ mạch cần. <b>Reference manual</b> hay <b>technical reference manual</b> (TRM) mô tả chip như ' +
      'một thiết bị lập trình được: các khối chức năng, thanh ghi, trình tự khởi tạo — thứ người viết driver cần. ' +
      'Với một SoC thương mại, hai loại này thường là hai file riêng, file thứ hai dày hàng nghìn trang. PL061 ' +
      'không phải một con chip mà là một <b>khối IP</b> (<i>intellectual property</i>) ARM bán cho các hãng làm ' +
      'SoC ghép vào chip của họ, nên tài liệu của nó chỉ có phần TRM: <b>ARM DDI 0190B</b>, 68 trang, năm 2000.' },

    { t: 'p', x:
      'Mọi TRM đều chia theo cùng một logic, dù tên chương khác nhau. Đây là mục lục của DDI 0190B — bước 1 phần ' +
      'thực hành in nó ra từ chính file PDF — cùng câu trả lời cho câu hỏi quan trọng nhất khi mở một tài liệu ' +
      'dày: <b>mình cần đọc chương nào</b>:' },

    { t: 'table',
      head: ['Chương', 'Nội dung', 'Người viết driver có cần?'],
      rows: [
        ['1 — Introduction', 'Khối này làm gì, giao tiếp với bus nào (APB), có bao nhiêu chân (8)', 'Đọc lướt một lần'],
        ['2 — Functional Overview', 'Khối <b>hoạt động</b> thế nào: mặt nạ địa chỉ của thanh ghi dữ liệu, trình tự khởi tạo ngắt được khuyến nghị', '<b>Có</b> — những quy tắc không nằm trong bảng thanh ghi nằm ở đây'],
        ['3 — Programmer’s Model', 'Bảng tổng hợp thanh ghi (<i>register map</i>), rồi từng thanh ghi với từng bit', '<b>Có</b> — đây là chương bạn mở nhiều nhất'],
        ['4 — Programmer’s Model for Test', 'Thanh ghi kiểm thử tích hợp, dùng khi kiểm tra silicon trong nhà máy', 'Không'],
        ['5 — Signal Descriptions', 'Tên và hướng từng đường tín hiệu của khối', 'Không — dành cho người ghép khối vào SoC']
      ] },

    { t: 'p', x:
      'Câu đầu tiên của chương 3 nói một điều mà mọi TRM của khối IP đều nói: <i>"The base address of the ' +
      'PrimeCell GPIO is not fixed, and can be different for any particular system implementation. However, the ' +
      'offset of any particular register from the base address is fixed."</i> Tài liệu của khối chỉ cho bạn ' +
      '<b>độ lệch</b> (<i>offset</i>) của mỗi thanh ghi tính từ đầu khối. Còn khối nằm ở <b>địa chỉ gốc</b> ' +
      '(<i>base address</i>) nào, nối vào đường ngắt nào, là quyết định của hãng ghép nó vào SoC — và bạn đã biết ' +
      'quyết định đó được ghi ở đâu: <code>reg = &lt;0x00 0x9030000 0x00 0x1000&gt;</code> và <code>interrupts</code> ' +
      'trong Device Tree (Bài 43). Datasheet của khối cộng với Device Tree của board mới cho ra một địa chỉ thật.' },

    { t: 'terms', items: [
      ['Register map', 'bảng thanh ghi', 'Bảng liệt kê mọi thanh ghi của một khối: độ lệch, tên, kiểu truy cập, độ rộng, reset value. Bảng 3-1 của DDI 0190B.'],
      ['Offset', 'độ lệch', 'Khoảng cách tính bằng byte từ địa chỉ gốc của khối tới thanh ghi. <code>GPIODIR</code> có offset <code>0x400</code> trên mọi SoC dùng PL061.'],
      ['Base address', 'địa chỉ gốc', 'Địa chỉ vật lý nơi khối bắt đầu trên một SoC cụ thể. Không có trong datasheet của khối; có trong <code>reg</code> của Device Tree.'],
      ['Reset value', 'giá trị khi reset', 'Giá trị thanh ghi mang ngay sau khi bật nguồn hoặc reset, trước khi phần mềm ghi gì. Cho biết trạng thái "an toàn" mặc định của thiết bị.'],
      ['Bit field', 'trường bit', 'Một nhóm bit liên tiếp trong thanh ghi mang một ý nghĩa riêng, ghi dạng <code>[cao:thấp]</code>, ví dụ <code>Revision[23:20]</code>.'],
      ['Access type', 'kiểu truy cập', '<b>RW</b> đọc ghi, <b>RO</b> chỉ đọc (ghi vào bị bỏ qua), <b>WO</b> chỉ ghi (đọc ra không xác định). DDI 0190B ghi là <code>Read/write</code>, <code>Read</code>, <code>Write</code>.'],
      ['W1C', 'write 1 to clear', 'Kiểu thanh ghi mà ghi bit 1 thì xoá cờ tương ứng, ghi 0 không làm gì. <code>GPIOIC</code> là một thanh ghi W1C.'],
      ['Reserved', 'dành riêng', 'Dải địa chỉ hoặc bit không được dùng. Đọc ra không đảm bảo gì, ghi vào có thể gây hậu quả ở phiên bản khối sau. Driver không chạm.']
    ] },

    /* ============================================================
       2. ĐỌC MỘT REGISTER MAP
       ============================================================ */
    { t: 'h2', x: 'Đọc bảng thanh ghi: offset, kiểu, reset value, bit field' },

    { t: 'p', x:
      'Đây là Bảng 3-1 của DDI 0190B, dịch cột nhưng giữ nguyên giá trị. So với bảng Bài 56 đưa cho bạn, nó có ' +
      'thêm ba cột — <b>kiểu truy cập</b>, <b>độ rộng</b>, <b>reset value</b> — và thêm hai thanh ghi ' +
      '<code>vgpio</code> không dùng tới:' },

    { t: 'table',
      head: ['Offset', 'Kiểu', 'Rộng', 'Reset', 'Tên', 'Mô tả gốc'],
      rows: [
        ['<code>0x000</code>–<code>0x3FC</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIODATA</code>', 'data register'],
        ['<code>0x400</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIODIR</code>', 'data direction register'],
        ['<code>0x404</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIOIS</code>', 'interrupt sense register'],
        ['<code>0x408</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIOIBE</code>', 'interrupt both edges register'],
        ['<code>0x40C</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIOIEV</code>', 'interrupt event register'],
        ['<code>0x410</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIOIE</code>', 'interrupt mask'],
        ['<code>0x414</code>', '<b>Read</b>', '8', '<code>0x00</code>', '<code>GPIORIS</code>', 'raw interrupt status'],
        ['<code>0x418</code>', '<b>Read</b>', '8', '<code>0x00</code>', '<code>GPIOMIS</code>', 'masked interrupt status'],
        ['<code>0x41C</code>', '<b>Write</b>', '8', '<code>0x00</code>', '<code>GPIOIC</code>', 'interrupt clear'],
        ['<code>0x420</code>', 'Read/write', '8', '<code>0x00</code>', '<code>GPIOAFSEL</code>', 'mode control select'],
        ['<code>0x424</code>–<code>0xFCC</code>', '—', '—', '—', '—', 'Reserved for future use and test purposes'],
        ['<code>0xFE0</code>–<code>0xFEC</code>', 'Read', '8', '<code>0x61 0x10 0x04 0x00</code>', '<code>GPIOPeriphID0..3</code>', 'Peripheral identification'],
        ['<code>0xFF0</code>–<code>0xFFC</code>', 'Read', '8', '<code>0x0D 0xF0 0x05 0xB1</code>', '<code>GPIOPCellID0..3</code>', 'PrimeCell identification']
      ] },

    { t: 'p', x:
      'Mỗi cột trả lời một câu hỏi mà driver phải trả lời đúng:' },

    { t: 'list', items: [
      '<b>Rộng 8</b>: mỗi thanh ghi chỉ có 8 bit có nghĩa, một bit cho mỗi chân 0..7. Thanh ghi vẫn nằm cách nhau 4 ' +
        'byte, nên <code>readl</code> đọc được — 24 bit cao luôn là 0. Kernel dùng <code>readb</code>/<code>writeb</code> ' +
        'trong <code>gpio-pl061.c</code>, <code>vgpio</code> dùng <code>readl</code>/<code>writel</code>; cả hai đều đúng.',
      '<b>Reset value toàn <code>0x00</code></b> cho các thanh ghi điều khiển: bật nguồn lên, mọi chân là <b>input</b> ' +
        '(<code>GPIODIR</code> = 0), mọi ngắt bị <b>che</b> (<code>GPIOIE</code> = 0), kiểu phát hiện là <b>sườn</b> ' +
        '(<code>GPIOIS</code> = 0). Đây là thiết kế có chủ ý — mục 2.3.2 viết <i>"input and output pins are configured ' +
        'as inputs"</i>: một chân output mặc định có thể đẩy điện vào một mạch khác trước khi phần mềm kịp biết.',
      '<b>Kiểu <code>Write</code></b> của <code>GPIOIC</code>: đọc thanh ghi này không trả về gì có nghĩa. Đừng bao ' +
        'giờ viết <code>readl(base + GPIOIC)</code> để "xem cờ đã xoá chưa" — đọc <code>GPIORIS</code> hoặc ' +
        '<code>GPIOMIS</code>.',
      '<b>Kiểu <code>Read</code></b> của <code>GPIORIS</code>/<code>GPIOMIS</code>: ghi vào bị bỏ qua. Cờ ngắt chỉ ' +
        'xoá được qua <code>GPIOIC</code>.',
      '<b><code>GPIOAFSEL</code></b> (<code>0x420</code>) không có trong bảng Bài 56 vì <code>vgpio</code> không dùng: ' +
        'bit 1 giao chân đó cho một khối phần cứng khác trong SoC điều khiển (<i>hardware control mode</i>). Reset ' +
        '<code>0x00</code> = mọi chân do phần mềm điều khiển, đúng thứ driver cần — nên không ghi gì là đúng.',
      '<b>Reserved</b> <code>0x424</code>–<code>0xFCC</code>: driver không đọc, không ghi. Chương 4 dùng một phần dải ' +
        'này cho thanh ghi kiểm thử.'
    ] },

    { t: 'p', x:
      'Thanh ghi dữ liệu của PL061 quá đơn giản để có bit field — mỗi bit là một chân. Các thanh ghi nhận dạng thì ' +
      'có. Mục 3.3.11 nói bốn thanh ghi 8 bit <code>GPIOPeriphID0..3</code> <i>"can conceptually be treated as a ' +
      '32-bit register"</i>, rồi chia 32 bit đó thành bốn trường. Đây là dạng bạn sẽ gặp ở mọi thanh ghi cấu hình ' +
      'phức tạp: một số 32 bit, mỗi nhóm bit một ý nghĩa, và việc của driver là tách chúng ra bằng dịch bit và mặt nạ.' },

    { t: 'fig', cap: 'Bốn thanh ghi 8 bit ghép thành một số 32 bit 0x00041061, rồi tách theo bốn trường của mục 3.3.11. Ranh giới trường không trùng ranh giới byte: Designer nằm vắt qua PeriphID2 và PeriphID1.',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" aria-label="Bốn thanh ghi PeriphID ghép thành bốn trường Configuration, Revision, Designer, Part number">' +
        '<text class="d-ts" x="20" y="24">Bốn thanh ghi 8 bit, mỗi ô chỉ dùng byte thấp, xếp từ cao xuống thấp</text>' +
        '<rect class="d-box" x="20" y="36" width="166" height="56" rx="6"/>' +
        '<text class="d-tm" x="103" y="58" text-anchor="middle">0xFEC PeriphID3</text>' +
        '<text class="d-t" x="103" y="80" text-anchor="middle">0x00</text>' +
        '<rect class="d-box" x="188" y="36" width="166" height="56" rx="6"/>' +
        '<text class="d-tm" x="271" y="58" text-anchor="middle">0xFE8 PeriphID2</text>' +
        '<text class="d-t" x="271" y="80" text-anchor="middle">0x04</text>' +
        '<rect class="d-box" x="356" y="36" width="166" height="56" rx="6"/>' +
        '<text class="d-tm" x="439" y="58" text-anchor="middle">0xFE4 PeriphID1</text>' +
        '<text class="d-t" x="439" y="80" text-anchor="middle">0x10</text>' +
        '<rect class="d-box" x="524" y="36" width="166" height="56" rx="6"/>' +
        '<text class="d-tm" x="607" y="58" text-anchor="middle">0xFE0 PeriphID0</text>' +
        '<text class="d-t" x="607" y="80" text-anchor="middle">0x61</text>' +
        '<text class="d-ts" x="20" y="120">ghép thành 0x00041061, rồi chia theo trường:</text>' +
        '<rect class="d-box-w" x="20" y="134" width="166" height="62" rx="6"/>' +
        '<text class="d-t" x="103" y="156" text-anchor="middle">Configuration</text>' +
        '<text class="d-tm" x="103" y="174" text-anchor="middle">[31:24]</text>' +
        '<text class="d-tm" x="103" y="190" text-anchor="middle">0x00</text>' +
        '<rect class="d-box-g" x="188" y="134" width="82" height="62" rx="6"/>' +
        '<text class="d-t" x="229" y="156" text-anchor="middle">Revision</text>' +
        '<text class="d-tm" x="229" y="174" text-anchor="middle">[23:20]</text>' +
        '<text class="d-tm" x="229" y="190" text-anchor="middle">0x0</text>' +
        '<rect class="d-box-a" x="272" y="134" width="166" height="62" rx="6"/>' +
        '<text class="d-t" x="355" y="156" text-anchor="middle">Designer</text>' +
        '<text class="d-tm" x="355" y="174" text-anchor="middle">[19:12]</text>' +
        '<text class="d-tm" x="355" y="190" text-anchor="middle">0x41 = A (ARM)</text>' +
        '<rect class="d-box-p" x="440" y="134" width="250" height="62" rx="6"/>' +
        '<text class="d-t" x="565" y="156" text-anchor="middle">Part number</text>' +
        '<text class="d-tm" x="565" y="174" text-anchor="middle">[11:0]</text>' +
        '<text class="d-tm" x="565" y="190" text-anchor="middle">0x061 = PL061</text>' +
        '<text class="d-ts" x="20" y="220">Tách trường: (id &gt;&gt; vị trí bit thấp) &amp; mặt nạ độ rộng. Bước 2 làm đúng phép tính này trong shell.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'warn', title: 'Datasheet cũng có lỗi — và đây là một lỗi thật',
      x: 'Bảng 3-3 mô tả <code>GPIODIR</code> như sau: <i>"Bits set, pins output. Bits cleared, pins output."</i> ' +
         'Cả hai dòng đều là "output". Đoạn văn ngay phía trên lại viết <i>"Clearing a bit configures the pin to be ' +
         'input … Therefore, the GPIO pins are input by default."</i> Bảng sai, đoạn văn đúng. Cùng tài liệu còn ghi ' +
         'dải dành riêng là <code>+0xFDO</code> — chữ O thay cho số 0. Không có datasheet nào không lỗi; datasheet ' +
         'của chip mới ra còn kèm cả một tài liệu <b>errata</b> riêng. Khi bảng và lời văn nói khác nhau, đừng chọn ' +
         'bừa: tìm nguồn thứ ba — driver sẵn có trong kernel, và nhất là <b>chính phần cứng</b>. Bước 2 dùng ' +
         '<code>devmem</code> để phần cứng phân xử câu này.' },

    /* ============================================================
       3. TỪ TRANG DATASHEET ĐẾN DÒNG WRITEL
       ============================================================ */
    { t: 'h2', x: 'Từ trang datasheet đến dòng writel' },

    { t: 'p', x:
      'Mỗi lần <code>vgpio.c</code> chạm vào phần cứng là một câu trong DDI 0190B được biến thành mã. Mở ' +
      '<code>~/bai56/vgpio/vgpio.c</code> cạnh bảng dưới: cột trái là số dòng trong file của bạn, cột phải là chỗ ' +
      'datasheet cho phép hoặc bắt buộc dòng đó.' },

    { t: 'table',
      head: ['Dòng <code>vgpio.c</code>', 'Mã', 'Câu trong DDI 0190B'],
      rows: [
        ['21–28', '<code>#define GPIODATA 0x000</code> … <code>GPIOIC 0x41C</code>', 'Bảng 3-1, cột Address'],
        ['52', '<code>writel(vg->leds, base + GPIODATA + (LED_MASK &lt;&lt; 2))</code>', 'Mục 2.3.3: <i>"the address bus is used as a mask … PADDR[9:2]"</i> — chỉ chân 0..2 bị ghi'],
        ['57', '<code>readl(base + GPIODATA + (ALL_PINS &lt;&lt; 2))</code>', 'Mục 3.3.1: bit mặt nạ 0 thì <i>"read as 0"</i> — muốn thấy cả 8 chân phải đọc ở <code>0x3FC</code>'],
        ['83', '<code>readl(base + GPIOMIS)</code>', 'Mục 3.3.8: trạng thái ngắt <b>sau</b> mặt nạ — chân nào vừa gây ngắt'],
        ['88', '<code>writel(BUTTON, base + GPIOIC)</code>', 'Mục 3.3.9: <i>"Writing a 1 … clears … Writing a 0 has no effect"</i> — ghi <code>BIT(3)</code> chỉ xoá chân 3'],
        ['204–206', '<code>readl(base + PERIPHID0 + 0/4/8)</code>', 'Mục 3.3.11: Part number <code>0x061</code>, Designer <code>0x41</code>; và <i>"accesses … must be 32-bit, using the LDR and STR instructions"</i>'],
        ['210', '<code>writel(0, base + GPIOIE)</code>', 'Mục 2.3.2: <i>"interrupts … are disabled by clearing the corresponding bit in GPIOIE"</i>'],
        ['211', '<code>writel(LED_MASK, base + GPIODIR)</code>', 'Mục 3.3.2: bit 1 = output'],
        ['213–215', '<code>GPIOIS</code> = 0, <code>GPIOIBE</code> = 0, <code>GPIOIEV</code> = <code>BIT(3)</code>', 'Mục 3.3.3–3.3.5: sườn, một sườn, sườn lên'],
        ['216', '<code>writel(ALL_PINS, base + GPIOIC)</code>', 'Mục 2.3.2: <i>"clear all interrupts by writing 0xFF to GPIOIC"</i>'],
        ['225', '<code>writel(BUTTON, base + GPIOIE)</code>', 'Mục 2.3.2: <i>"program GPIOIE to enable interrupts"</i> — bước cuối cùng'],
        ['247', '<code>writel(0, base + GPIOIE)</code> trong <code>remove</code>', 'Không có trong datasheet — đây là quy tắc của kernel (Bài 55): im thiết bị trước khi devres gỡ IRQ']
      ] },

    { t: 'p', x:
      'Dòng 52 là dòng đáng đọc kỹ nhất, vì nó dựa trên một cơ chế chỉ có trong datasheet. Mục 2.3.3 giải thích ' +
      'bằng một ví dụ cụ thể: ghi giá trị <code>0xFB</code> vào địa chỉ <code>GPIODATA + 0x098</code>. Bit 9..2 của ' +
      '<code>0x098</code> là <code>0b00100110</code> — mặt nạ cho chân 5, 2 và 1. Chỉ ba chân đó nhận bit tương ứng ' +
      'của <code>0xFB</code>; năm chân còn lại giữ nguyên. Bước 2 lặp lại đúng ví dụ này trên máy ảo và đọc ra ' +
      '<code>0x22</code>.' },

    { t: 'fig', cap: 'Ví dụ trong mục 2.3.3 của DDI 0190B, vẽ lại: bit 9..2 của địa chỉ quyết định chân nào được ghi, giá trị chỉ quyết định ghi 0 hay 1. Ghi 0xFB vào offset 0x098 chỉ đổi chân 5, 2, 1 — và GPIODATA đọc lại là 0x22 nếu trước đó toàn 0.',
      svg:
        '<svg viewBox="0 0 720 256" width="720" role="img" aria-label="Mặt nạ địa chỉ của GPIODATA: ghi 0xFB vào offset 0x098">' +
        '<text class="d-ts" x="236" y="30" text-anchor="middle">chân 7</text>' +
        '<text class="d-ts" x="296" y="30" text-anchor="middle">6</text>' +
        '<text class="d-ts" x="356" y="30" text-anchor="middle">5</text>' +
        '<text class="d-ts" x="416" y="30" text-anchor="middle">4</text>' +
        '<text class="d-ts" x="476" y="30" text-anchor="middle">3</text>' +
        '<text class="d-ts" x="536" y="30" text-anchor="middle">2</text>' +
        '<text class="d-ts" x="596" y="30" text-anchor="middle">1</text>' +
        '<text class="d-ts" x="656" y="30" text-anchor="middle">0</text>' +
        '<text class="d-t" x="20" y="64">Địa chỉ 0x098</text>' +
        '<text class="d-ts" x="20" y="80">bit 9..2 = mặt nạ</text>' +
        '<rect class="d-box" x="210" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="236" y="69" text-anchor="middle">0</text>' +
        '<rect class="d-box" x="270" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="296" y="69" text-anchor="middle">0</text>' +
        '<rect class="d-box-a" x="330" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="356" y="69" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="390" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="416" y="69" text-anchor="middle">0</text>' +
        '<rect class="d-box" x="450" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="476" y="69" text-anchor="middle">0</text>' +
        '<rect class="d-box-a" x="510" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="536" y="69" text-anchor="middle">1</text>' +
        '<rect class="d-box-a" x="570" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="596" y="69" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="630" y="46" width="52" height="36" rx="5"/><text class="d-tm" x="656" y="69" text-anchor="middle">0</text>' +
        '<text class="d-t" x="20" y="126">Giá trị ghi 0xFB</text>' +
        '<rect class="d-box" x="210" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="236" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="270" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="296" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box-a" x="330" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="356" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="390" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="416" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="450" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="476" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box-a" x="510" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="536" y="129" text-anchor="middle">0</text>' +
        '<rect class="d-box-a" x="570" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="596" y="129" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="630" y="106" width="52" height="36" rx="5"/><text class="d-tm" x="656" y="129" text-anchor="middle">1</text>' +
        '<text class="d-t" x="20" y="184">GPIODATA sau đó</text>' +
        '<text class="d-ts" x="20" y="200">u = giữ nguyên</text>' +
        '<rect class="d-box" x="210" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="236" y="189" text-anchor="middle">u</text>' +
        '<rect class="d-box" x="270" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="296" y="189" text-anchor="middle">u</text>' +
        '<rect class="d-box-g" x="330" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="356" y="189" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="390" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="416" y="189" text-anchor="middle">u</text>' +
        '<rect class="d-box" x="450" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="476" y="189" text-anchor="middle">u</text>' +
        '<rect class="d-box-g" x="510" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="536" y="189" text-anchor="middle">0</text>' +
        '<rect class="d-box-g" x="570" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="596" y="189" text-anchor="middle">1</text>' +
        '<rect class="d-box" x="630" y="166" width="52" height="36" rx="5"/><text class="d-tm" x="656" y="189" text-anchor="middle">u</text>' +
        '<text class="d-ts" x="20" y="238">Muốn đổi chân n và không đụng chân nào khác: ghi vào offset (1 &lt;&lt; n) &lt;&lt; 2. Không cần đọc trước, không cần khoá.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hệ quả trực tiếp cho driver: muốn đặt chân <i>n</i> lên 1 mà không làm phiền chân nào khác, ghi ' +
      '<code>BIT(n)</code> vào <code>base + (BIT(n) &lt;&lt; 2)</code>; muốn đặt về 0, ghi <code>0</code> vào cùng ' +
      'địa chỉ đó. Một lệnh ghi, không đọc-sửa-ghi, không cần spinlock — kể cả khi một ngắt trên CPU khác đang ' +
      'đổi chân bên cạnh. Driver ở bước 6 viết đúng như vậy, và <code>pl061_set_value</code> trong kernel cũng thế: ' +
      '<code>writeb(!!value &lt;&lt; offset, pl061->base + (BIT(offset + 2)))</code>.' },

    { t: 'cal', kind: 'why', title: 'Đọc đoạn "Recommendations" như một người viết driver',
      x: 'Mục 2.3.2 khuyến nghị một trình tự khi bật ngắt sườn: <code>GPIOIBE</code> → <code>GPIOIEV</code> → ' +
         '<code>GPIOIS</code> → <i>"apply three clock pulses"</i> → ghi <code>0xFF</code> vào <code>GPIOIC</code> → ' +
         '<code>GPIOIE</code>. <code>vgpio.c</code> làm <code>GPIOIE</code> = 0 → <code>GPIODIR</code> → ' +
         '<code>GPIOIS</code> → <code>GPIOIBE</code> → <code>GPIOIEV</code> → <code>GPIOIC</code> → ' +
         '<code>GPIOIE</code>: đảo thứ tự ba thanh ghi đầu. Có sai không? Lý do của khuyến nghị nằm ở câu dẫn: ' +
         '<i>"to avoid spurious interrupts"</i> — đổi kiểu phát hiện giữa chừng có thể để lại một cờ ngắt giả. ' +
         '<code>vgpio</code> giữ <code>GPIOIE</code> = 0 suốt quá trình và xoá mọi cờ ngay trước khi bật, nên cờ giả ' +
         'nếu có cũng không bao giờ tới được CPU. "Ba xung clock" là việc của phần cứng; phần mềm không tạo được ' +
         'và không cần — nó chỉ cần bảo đảm có một lần ghi <code>GPIOIC</code> đứng sau mọi thay đổi cấu hình. ' +
         'Đọc khuyến nghị để hiểu <b>mục đích</b>, rồi kiểm tra mã của mình đạt mục đích đó, thay vì chép thứ tự ' +
         'như một nghi lễ.' },

    { t: 'p', x:
      'Còn một câu nữa trong mục 2.3.3 mà <code>vgpio</code> may mắn không vấp phải, và bạn sẽ vấp ở bước 6: ' +
      '<i>"Writing to the data register only affects the pins that are configured as outputs."</i> Ghi vào ' +
      '<code>GPIODATA</code> khi chân còn là input thì <b>không có tác dụng gì</b> — không lưu lại để dùng sau. ' +
      '<code>vgpio</code> đặt <code>GPIODIR</code> trước rồi mới ghi dữ liệu, nên không bao giờ gặp. Một driver đặt ' +
      'giá trị <b>trước</b> rồi mới đổi hướng — thứ tự tự nhiên nếu bạn muốn chân không nháy sai giá trị khi vừa ' +
      'thành output — sẽ mất lần ghi đầu tiên.' },

    /* ============================================================
       4. GPIOCHIP: MỘT KHUNG CHO MỌI BỘ ĐIỀU KHIỂN GPIO
       ============================================================ */
    { t: 'h2', x: 'gpiochip: một khung chung cho mọi bộ điều khiển GPIO' },

    { t: 'p', x:
      '<code>vgpio</code> của Bài 56 là một driver "đóng": nó tự quyết chân 0..2 là LED, chân 3 là nút, và chỉ ' +
      'chương trình <code>vgctl</code> của bạn biết nói chuyện với nó qua <code>ioctl</code> <code>0x800c7810</code>. ' +
      'Giả sử một driver khác — driver màn hình cần một chân reset, driver thẻ nhớ cần một chân phát hiện thẻ — ' +
      'muốn dùng chân 5 của cùng khối PL061 đó. Nó không có cách nào hỏi <code>vgpio</code>. Trên một board thật ' +
      'có năm loại bộ điều khiển GPIO (trong SoC, trong chip quản lý nguồn, trên bộ mở rộng I2C…), nếu mỗi loại ' +
      'tự chế một giao diện, mỗi driver dùng GPIO phải biết cả năm.' },

    { t: 'p', x:
      'Kernel giải quyết bằng cách tách hai vai. Bộ điều khiển là <b>provider</b>: nó điền một ' +
      '<code>struct gpio_chip</code> — một bảng con trỏ hàm "đọc chân", "ghi chân", "đổi hướng", cùng số chân ' +
      '— rồi đăng ký với <b>gpiolib</b>. Driver dùng chân là <b>consumer</b>: nó xin một chân bằng ' +
      '<code>gpiod_get(dev, "reset", …)</code>, nhận về một <code>struct gpio_desc *</code>, và gọi ' +
      '<code>gpiod_set_value()</code>, không bao giờ biết đằng sau là PL061 hay một chip I2C. Bạn đã dùng phía ' +
      'consumer ở Bài 54: <code>devm_gpiod_get_optional(dev, "enable", …)</code> của <code>tsensor</code> lấy chân ' +
      'từ <code>gpio-delay</code>. Bài này viết phía provider.' },

    { t: 'p', x:
      'Hình dung một ổ cắm điện chuẩn trên tường: nhà máy điện nào (provider) cũng phải đưa ra đúng hai chân, ' +
      'đúng điện áp; thiết bị nào (consumer) cũng cắm được mà không cần biết điện đến từ đâu. ' +
      '<code>struct gpio_chip</code> là hình dạng của ổ cắm, gpiolib là đường dây trong tường, và ' +
      '<code>/dev/gpiochipN</code> là một ổ cắm thứ hai, lắp sẵn ra phía userspace — mọi provider đăng ký với ' +
      'gpiolib đều tự động có ổ này, không phải viết thêm dòng nào.' },

    { t: 'fig', cap: 'Provider điền struct gpio_chip và đăng ký một lần; gpiolib phát nó ra hai phía. Consumer trong kernel xin chân bằng gpiod_get, userspace mở /dev/gpiochipN. Không bên nào biết bên kia, và không bên nào biết thanh ghi của PL061.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Provider, gpiolib, consumer trong kernel và /dev/gpiochipN">' +
        '<rect class="d-box" x="20" y="24" width="210" height="62" rx="8"/>' +
        '<text class="d-t" x="125" y="48" text-anchor="middle">gpio-pl061.c</text>' +
        '<text class="d-ts" x="125" y="68" text-anchor="middle">provider: PL061, 8 chân</text>' +
        '<rect class="d-box" x="255" y="24" width="210" height="62" rx="8"/>' +
        '<text class="d-t" x="360" y="48" text-anchor="middle">gpio-sim.c</text>' +
        '<text class="d-ts" x="360" y="68" text-anchor="middle">provider: chip giả, configfs</text>' +
        '<rect class="d-box" x="490" y="24" width="210" height="62" rx="8"/>' +
        '<text class="d-t" x="595" y="48" text-anchor="middle">vgchip.c (bước 6)</text>' +
        '<text class="d-ts" x="595" y="68" text-anchor="middle">provider của bạn</text>' +
        '<path class="d-line" d="M125 86 V112"/><path class="d-arrow" d="M125 118 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M360 86 V112"/><path class="d-arrow" d="M360 118 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M595 86 V112"/><path class="d-arrow" d="M595 118 l-5 -8 h10 z"/>' +
        '<text class="d-tm" x="360" y="108" text-anchor="middle">devm_gpiochip_add_data()</text>' +
        '<rect class="d-box-p" x="20" y="120" width="680" height="72" rx="8"/>' +
        '<text class="d-t" x="360" y="146" text-anchor="middle">gpiolib (drivers/gpio/gpiolib.c)</text>' +
        '<text class="d-ts" x="360" y="166" text-anchor="middle">giữ danh sách chip, ai đang giữ chân nào, cấp số major 254 cho chardev</text>' +
        '<text class="d-ts" x="360" y="182" text-anchor="middle">từ chối yêu cầu thứ hai trên cùng một chân: EBUSY</text>' +
        '<path class="d-line" d="M190 192 V222"/><path class="d-arrow" d="M190 228 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M530 192 V222"/><path class="d-arrow" d="M530 228 l-5 -8 h10 z"/>' +
        '<rect class="d-box-a" x="20" y="230" width="340" height="80" rx="8"/>' +
        '<text class="d-t" x="190" y="254" text-anchor="middle">consumer trong kernel</text>' +
        '<text class="d-tm" x="190" y="276" text-anchor="middle">gpiod_get(dev, "enable", …)</text>' +
        '<text class="d-ts" x="190" y="296" text-anchor="middle">gpio-keys, leds-gpio, tsensor (Bài 54)</text>' +
        '<rect class="d-box-g" x="380" y="230" width="320" height="80" rx="8"/>' +
        '<text class="d-t" x="540" y="254" text-anchor="middle">userspace</text>' +
        '<text class="d-tm" x="540" y="276" text-anchor="middle">/dev/gpiochipN + libgpiod</text>' +
        '<text class="d-ts" x="540" y="296" text-anchor="middle">gpioset, gpiomon, button.c (bước 5)</text>' +
        '</svg>' },

    { t: 'p', x:
      'Một <code>gpio_chip</code> tối thiểu chỉ cần năm con trỏ hàm và vài trường. Đây là phần trích từ ' +
      '<code>include/linux/gpio/driver.h</code> dòng 402–454 của kernel bạn đang dùng, bỏ bớt các trường không dùng ' +
      'tới trong bài:' },

    { t: 'table',
      head: ['Trường', 'Ý nghĩa', 'PL061 điền gì (<code>gpio-pl061.c:326–337</code>)'],
      rows: [
        ['<code>label</code>', 'Tên chip, hiện trong <code>gpiodetect</code>', '<code>dev_name(dev)</code> → <code>9030000.pl061</code>'],
        ['<code>parent</code>, <code>owner</code>', 'Thiết bị cha và module — để gpiolib giữ module không bị <code>rmmod</code> khi còn chân đang dùng', '<code>dev</code>, <code>THIS_MODULE</code>'],
        ['<code>base</code>', 'Số hiệu toàn cục của chân đầu tiên. <b>-1</b> = để gpiolib tự chọn', '<code>-1</code>'],
        ['<code>ngpio</code>', 'Số chân', '<code>PL061_GPIO_NR</code> = 8'],
        ['<code>get_direction</code>', 'Chân <i>n</i> đang là input hay output?', 'đọc bit <i>n</i> của <code>GPIODIR</code>'],
        ['<code>direction_input</code>', 'Biến chân <i>n</i> thành input', 'xoá bit <i>n</i> của <code>GPIODIR</code>'],
        ['<code>direction_output</code>', 'Biến chân <i>n</i> thành output với giá trị ban đầu <i>v</i>', 'ghi dữ liệu, đặt bit <code>GPIODIR</code>, <b>ghi dữ liệu lần nữa</b>'],
        ['<code>get</code>', 'Đọc mức chân <i>n</i>', '<code>readb(base + BIT(n + 2))</code>'],
        ['<code>set</code>', 'Đặt mức chân <i>n</i>. Trên 6.18 hàm này trả <code>int</code> (<code>driver.h:424</code>); sách cũ ghi <code>void</code>', '<code>writeb(v &lt;&lt; n, base + BIT(n + 2))</code>']
      ] },

    { t: 'p', x:
      'Hàng <code>direction_output</code> có một chi tiết lạ: PL061 ghi giá trị <b>hai lần</b>. Chú thích ngay trong ' +
      '<code>gpio-pl061.c</code> giải thích: <i>"gpio value is set again, because pl061 doesn\'t allow to set value ' +
      'of a gpio pin before configuring it in OUT mode."</i> Đó chính là câu <i>"only affects the pins that are ' +
      'configured as outputs"</i> của mục 2.3.3, được người viết driver kernel đọc đúng. Lần ghi đầu vô dụng trên ' +
      'PL061 nhưng không hại; lần thứ hai mới có tác dụng. Bước 6 cho bạn thấy chuyện gì xảy ra nếu chỉ giữ lần ' +
      'đầu.' },

    { t: 'cal', kind: 'info', title: 'Số hiệu toàn cục bắt đầu từ 512, và đó là lý do để quên nó đi',
      x: 'Mỗi chân có hai cách gọi: <b>(chip, offset)</b> — "chân 3 của <code>gpiochip0</code>" — và một <b>số toàn ' +
         'cục</b> duy nhất trong cả hệ thống. Ngày xưa board file (Bài 42) viết cứng số toàn cục, ví dụ "GPIO 23 là ' +
         'chân chống ghi flash". Với <code>base = -1</code>, gpiolib cấp số bắt đầu từ ' +
         '<code>GPIO_DYNAMIC_BASE</code> = <b>512</b> (<code>drivers/gpio/gpiolib.c:82</code>) theo thứ tự chip được ' +
         'probe — nên thêm một chip, nạp module theo thứ tự khác, hay đổi kernel là số nhảy. Bước 6 in ra ' +
         '<code>global base 512</code>. Mọi API hiện đại, cả trong kernel (<code>gpiod_*</code>) lẫn userspace ' +
         '(<code>libgpiod</code>), gọi chân bằng chip + offset hoặc bằng <b>tên</b>; số toàn cục chỉ còn sống trong ' +
         'giao diện sysfs cũ.' },

    /* ============================================================
       5. VÌ SAO SYSFS GPIO BỊ KHAI TỬ
       ============================================================ */
    { t: 'h2', x: 'Vì sao /sys/class/gpio bị khai tử' },

    { t: 'p', x:
      'Nếu bạn tìm "Raspberry Pi GPIO Linux" trên mạng, phần lớn kết quả vẫn dạy cách này:' },

    { t: 'code', where: 'file', nocopy: true, name: 'cách cũ — không chạy trên kernel của bạn', code:
      'echo 23 > /sys/class/gpio/export\n' +
      'echo out > /sys/class/gpio/gpio23/direction\n' +
      'echo 1 > /sys/class/gpio/gpio23/value\n' +
      'echo 23 > /sys/class/gpio/unexport' },

    { t: 'p', x:
      'Ngắn, dễ hiểu, dùng được từ shell — và đã bị đánh dấu lỗi thời từ kernel 4.8 (2016). Trong kernel 6.18 của ' +
      'bạn, <code>Documentation/userspace-api/gpio/sysfs.rst</code> mở đầu bằng: <i>"This API is obsoleted by the ' +
      'chardev.rst … this API will be removed in the future."</i> Kconfig còn rõ hơn: tuỳ chọn ' +
      '<code>GPIO_SYSFS</code> chỉ hiện ra nếu bật <code>EXPERT</code> (<code>bool … if EXPERT</code>), và nó ' +
      '<code>select GPIO_CDEV # We need to encourage the new ABI</code>. <code>defconfig</code> ARM64 không bật ' +
      'nó — bước 3 cho bạn thấy <code>/sys/class/gpio</code> không tồn tại. Lý do không phải thẩm mỹ:' },

    { t: 'table',
      head: ['Vấn đề của sysfs', 'Hậu quả cụ thể', 'Chardev (<code>/dev/gpiochipN</code>) làm gì'],
      rows: [
        ['Gọi chân bằng số toàn cục', '"GPIO 23" trên kernel này là chân khác trên kernel sau khi thêm một chip; script ngừng chạy mà không báo lỗi', 'Gọi bằng chip + offset hoặc bằng tên (<code>gpioget button</code>)'],
        ['Không có chủ sở hữu', 'Chương trình <code>export</code> rồi chết: chân vẫn là output, vẫn giữ mức 1 mãi mãi. Hai chương trình ghi cùng một chân không ai hay', 'Chân thuộc về một file descriptor. Tiến trình chết → kernel đóng fd → chân được <b>trả lại</b>. Người thứ hai nhận <code>EBUSY</code>'],
        ['Mỗi lần đổi mức là mở, ghi, đóng một file', 'Chậm; đổi 4 chân là 4 lần ghi riêng, các chân đổi lệch nhau', 'Một <code>ioctl</code> đặt nhiều chân cùng lúc'],
        ['Sự kiện qua <code>poll()</code> trên file <code>value</code>', 'Không có dấu thời gian, dễ mất sườn khi hai sườn đến gần nhau', 'Hàng đợi sự kiện trong kernel, mỗi sự kiện kèm dấu thời gian nano giây và số thứ tự'],
        ['Chỉ có hướng và mức', 'Không đặt được pull-up/down, open-drain, chống dội phím', 'Có cờ cho bias, drive, active-low, debounce'],
        ['Không biết ai đang dùng chân', 'Phải đoán', '<code>gpioinfo</code> in tên consumer của từng chân — kể cả consumer trong kernel']
      ] },

    { t: 'cal', kind: 'tip', title: 'Kiểm tra kernel của bạn có giao diện nào — không cần nhớ',
      x: '<code>grep -E \'CONFIG_GPIO_(SYSFS|CDEV)\' ~/bai38/linux-6.18.45/.config</code>. Kernel của bạn: ' +
         '<code>CONFIG_GPIO_CDEV=y</code>, <code>CONFIG_GPIO_CDEV_V1=y</code>, không có dòng <code>GPIO_SYSFS</code> ' +
         'nào. <code>CDEV_V1</code> là phiên bản đầu của chardev (kernel 4.8), Kconfig ghi <i>"This ABI version is ' +
         'deprecated"</i>; libgpiod 2.x dùng bản v2 (kernel 5.10). Trên board, tương đương là ' +
         '<code>zcat /proc/config.gz | grep GPIO_</code> nếu kernel bật <code>IKCONFIG_PROC</code>, hoặc đơn giản là ' +
         '<code>ls /sys/class/gpio /dev/gpiochip*</code>.' },

    /* ============================================================
       6. LIBGPIOD VÀ GPIO-SIM
       ============================================================ */
    { t: 'h2', x: 'libgpiod và gpio-sim: công cụ cho phía userspace' },

    { t: 'p', x:
      'Chardev GPIO là một tập <code>ioctl</code> trên <code>/dev/gpiochipN</code> — bạn đã viết <code>ioctl</code> ' +
      'phía kernel ở Bài 53, và nhìn cấu trúc <code>struct gpio_v2_line_request</code> trong ' +
      '<code>include/uapi/linux/gpio.h</code> (mảng 64 offset, tên consumer 32 byte, cấu hình, số dòng, kích thước ' +
      'hàng đợi, fd trả về) là đủ hiểu vì sao không ai gọi thẳng. <b>libgpiod</b> là thư viện C chính thức, do ' +
      'chính người bảo trì gpiolib trong kernel viết, bọc các <code>ioctl</code> đó và kèm sáu công cụ dòng lệnh:' },

    { t: 'table',
      head: ['Công cụ', 'Làm gì', 'Ví dụ trong bài'],
      rows: [
        ['<code>gpiodetect</code>', 'Liệt kê các chip: tên, nhãn, số chân', '<code>gpiochip0 [9030000.pl061] (8 lines)</code>'],
        ['<code>gpioinfo</code>', 'Từng chân: tên, hướng, cờ, ai đang giữ', '<code>line 3: unnamed input consumer="GPIO Key Poweroff"</code>'],
        ['<code>gpioget</code>', 'Đọc mức một hoặc nhiều chân', '<code>gpioget button</code> → <code>"button"=active</code>'],
        ['<code>gpioset</code>', 'Đặt mức, <b>giữ</b> tới khi bị dừng', '<code>gpioset led=1 &amp;</code>'],
        ['<code>gpiomon</code>', 'Chờ sự kiện sườn, in từng sự kiện với dấu thời gian', '<code>25.754677648 falling gpiochip1 0 "button"</code>'],
        ['<code>gpionotify</code>', 'Chờ thay đổi <b>trạng thái sở hữu</b> của chân (ai xin, ai trả)', 'Không dùng trong bài']
      ] },

    { t: 'p', x:
      'Có hai thế hệ libgpiod không tương thích nhau. Ubuntu 20.04 (máy bạn) chỉ có gói <code>gpiod</code> ' +
      '<b>1.4.1</b> — API v1, cú pháp dòng lệnh cũ (<code>gpioset gpiochip0 3=1</code>), và nó chạy trên WSL, ' +
      'không phải trong máy ảo ARM64. Bài dùng <b>libgpiod 2.2.5</b>, bản cuối của nhánh 2.2 còn dùng autotools ' +
      '(từ 2.3 dự án chuyển sang <code>meson</code>, máy bạn không có), build tĩnh cho ARM64 như bạn đã build ' +
      'BusyBox ở Bài 47, rồi chép vào initramfs. Tài liệu API: <code>libgpiod.readthedocs.io</code>.' },

    { t: 'p', x:
      'Vấn đề cuối cùng: máy <code>virt</code> chỉ có một PL061, chân 3 của nó đã thuộc về <code>gpio-keys</code>, ' +
      'và nguồn đầu vào duy nhất bạn điều khiển được là nút nguồn (Bài 55). Muốn thử một chương trình chờ nút bấm, ' +
      'bạn cần một chip mà bạn "bấm" được bao nhiêu lần tuỳ thích. <b><code>gpio-sim</code></b> là một ' +
      '<code>gpio_chip</code> hoàn toàn bằng phần mềm, có trong kernel từ 5.17 và dùng chính trong bộ kiểm thử của ' +
      'libgpiod. Bạn tạo chip bằng cách <code>mkdir</code> trong <b>configfs</b> — một hệ thống file ảo mà ' +
      '<b>userspace tạo thư mục để yêu cầu kernel tạo đối tượng</b>, ngược với sysfs nơi kernel tạo thư mục để ' +
      'khoe đối tượng nó đã có. Rồi bạn "kéo" mức một chân đầu vào bằng cách ghi <code>pull-up</code> hay ' +
      '<code>pull-down</code> vào một file sysfs của chip.' },

    { t: 'fig', cap: 'Vòng đời của một chip gpio-sim: mkdir mô tả chip trong configfs, echo 1 > live biến mô tả thành thiết bị thật, và từ đó nó là một gpiochip như mọi chip khác. Cấu hình bị khoá khi chip đang sống.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Vòng đời chip gpio-sim từ configfs tới gpiochip">' +
        '<rect class="d-box" x="20" y="24" width="210" height="116" rx="8"/>' +
        '<text class="d-t" x="125" y="48" text-anchor="middle">1. Mô tả (configfs)</text>' +
        '<text class="d-tm" x="125" y="72" text-anchor="middle">mkdir board/bank0</text>' +
        '<text class="d-tm" x="125" y="90" text-anchor="middle">num_lines = 8</text>' +
        '<text class="d-tm" x="125" y="108" text-anchor="middle">line0/name = button</text>' +
        '<text class="d-ts" x="125" y="128" text-anchor="middle">chưa có thiết bị nào</text>' +
        '<path class="d-line" d="M230 82 H250"/><path class="d-arrow" d="M255 82 l-8 -5 v10 z"/>' +
        '<rect class="d-box-p" x="255" y="24" width="210" height="116" rx="8"/>' +
        '<text class="d-t" x="360" y="48" text-anchor="middle">2. Kích hoạt</text>' +
        '<text class="d-tm" x="360" y="72" text-anchor="middle">echo 1 &gt; live</text>' +
        '<text class="d-ts" x="360" y="96" text-anchor="middle">tạo platform device</text>' +
        '<text class="d-tm" x="360" y="112" text-anchor="middle">gpio-sim.0</text>' +
        '<text class="d-ts" x="360" y="128" text-anchor="middle">probe đồng bộ, rồi mới trả về</text>' +
        '<path class="d-line" d="M465 82 H485"/><path class="d-arrow" d="M490 82 l-8 -5 v10 z"/>' +
        '<rect class="d-box-g" x="490" y="24" width="210" height="116" rx="8"/>' +
        '<text class="d-t" x="595" y="48" text-anchor="middle">3. Một gpiochip thật</text>' +
        '<text class="d-tm" x="595" y="72" text-anchor="middle">/dev/gpiochip1</text>' +
        '<text class="d-ts" x="595" y="96" text-anchor="middle">gpioinfo, gpiomon, libgpiod</text>' +
        '<text class="d-ts" x="595" y="112" text-anchor="middle">đều thấy nó như PL061</text>' +
        '<rect class="d-box-a" x="490" y="170" width="210" height="62" rx="8"/>' +
        '<text class="d-t" x="595" y="194" text-anchor="middle">Kéo mức đầu vào</text>' +
        '<text class="d-tm" x="595" y="216" text-anchor="middle">sim_gpio0/pull</text>' +
        '<path class="d-line" d="M595 170 V146"/><path class="d-arrow" d="M595 140 l-5 8 h10 z"/>' +
        '<rect class="d-box-w" x="20" y="170" width="445" height="62" rx="8"/>' +
        '<text class="d-t" x="242" y="194" text-anchor="middle">echo 0 &gt; live: chip biến mất, cấu hình còn</text>' +
        '<text class="d-ts" x="242" y="216" text-anchor="middle">rmdir từ trong ra ngoài, rồi rmmod gpio-sim</text>' +
        '</svg>' },

    { t: 'cal', kind: 'warn', title: 'gpio-sim không có trong kernel của bạn — cần build lại',
      x: '<code>defconfig</code> để <code># CONFIG_GPIO_SIM is not set</code> (bạn đã thấy dòng này ở Bài 54, cùng ' +
         '<code>GPIO_MOCKUP</code> — tiền thân đã lỗi thời của nó). Bước 4 bật nó thành module <code>=m</code> và ' +
         'build lại. Kconfig của nó <code>select IRQ_SIM</code>, một thành phần <b>built-in</b> (<code>bool</code>), ' +
         'nên không chỉ có <code>.ko</code> mới: <code>Image</code> cũng phải build lại. Trên máy viết bài việc này ' +
         'mất <b>32 giây</b>, vì Kbuild chỉ biên dịch lại ba file (<code>irq_sim.o</code>, ' +
         '<code>gpio-sim.o</code>, <code>dev-sync-probe.o</code>) rồi link lại. Mọi bài sau đó dùng ' +
         '<code>Image</code> mới; nó không làm hỏng gì bài trước — chỉ thêm tính năng.' },

    /* ============================================================
       7. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ trang datasheet tới /dev/gpiochipN' },

    { t: 'p', x:
      'Bạn làm việc trong thư mục mới <code>~/bai57</code>. Bài <b>đọc</b> ba thứ đã có: kernel ở ' +
      '<code>~/bai38/linux-6.18.45</code> (bước 4 sẽ build lại nó), initramfs của Bài 32, và từ Bài 56 là ' +
      '<code>~/bai56/vgpio/vgpio.c</code>, <code>virt.dts</code>, <code>vgpio.dtb</code>. Mọi lệnh QEMU vẫn có ' +
      '<code>-smp 2</code> như Bài 56.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/bai57/doc && cd ~/bai57' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Tải datasheet PL061 và biến nó thành văn bản tìm được',
        blocks: [
          { t: 'p', x:
            'ARM phát hành DDI 0190B miễn phí trên <code>developer.arm.com</code> (tìm "PL061 Technical Reference ' +
            'Manual"). Trang web đó tải PDF qua JavaScript, nên bài dùng đường dẫn trực tiếp tới file mà trang đó trỏ ' +
            'tới. Bạn không cần đọc PDF trong trình xem: biến nó thành văn bản thuần rồi <code>grep</code>, như với ' +
            'mã nguồn kernel ở Bài 38. Trên một TRM 5 000 trang, cách này nhanh hơn cuộn chuột hàng trăm lần.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57/doc\n' +
            'curl -sSL -o DDI0190.pdf \'https://documentation-service.arm.com/static/5e8e38e9fd977155116a9267?token=\'\n' +
            'ls -l DDI0190.pdf\n' +
            'sha256sum DDI0190.pdf' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 379704 Sep 30 15:24 DDI0190.pdf\n' +
            '6cebbefa306327b0c59215345d77103a5bf3a6c724a18b2cb5405d14efdc9c6d  DDI0190.pdf' },

          { t: 'cmdx', cmd: 'curl -sSL -o DDI0190.pdf \'URL\'',
            rows: [
              ['<code>-s</code>', 'Im lặng: không in thanh tiến độ.', ''],
              ['<code>-S</code>', 'Nhưng vẫn in lỗi nếu có — đi cặp với <code>-s</code>.', 'Không có <code>-S</code>, một lỗi mạng chỉ để lại file rỗng'],
              ['<code>-L</code>', 'Đi theo chuyển hướng HTTP (<code>301</code>/<code>302</code>).', 'Máy chủ tài liệu của ARM chuyển hướng qua CDN'],
              ['<code>-o DDI0190.pdf</code>', 'Ghi vào file tên này.', ''],
              ['<code>\'…?token=\'</code>', 'Nháy đơn vì URL có <code>?</code> và <code>=</code>, hai ký tự shell có thể hiểu khác.', '']
            ] },

          { t: 'p', x:
            '<b>379 704 byte</b> và mã sha256 trên là file người viết bài tải về; nếu của bạn khớp, bạn đang đọc đúng ' +
            'bản giống từng byte. ARM không công bố checksum cho tài liệu, nên con số này chỉ để đối chiếu với bài — ' +
            'nếu khác, hãy kiểm tra tiêu đề ở lệnh sau trước khi đi tiếp. Người viết bài từng tải nhầm một mã ' +
            '<code>static/…</code> khác và nhận về TRM của bộ định thời SP804: cùng định dạng, cùng nhà sản xuất, ' +
            'sai thiết bị. Đuôi <code>.pdf</code> không chứng minh gì.' },

          { t: 'p', x:
            'Công cụ đọc PDF là <code>pdfinfo</code> và <code>pdftotext</code> trong gói <code>poppler-utils</code>. ' +
            'Cài nếu chưa có:' },

          { t: 'code', where: 'wsl', code:
            'sudo apt-get install -y poppler-utils\n' +
            'pdfinfo DDI0190.pdf | grep -E \'Title|Pages\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Title:          ARM PrimeCell General Purpose Input/Output (PL061) Technical Reference Manual\n' +
            'Pages:          68' },

          { t: 'p', x:
            'Tiêu đề đúng là PL061, 68 trang. Đây là bước kiểm tra đáng làm với mọi tài liệu bạn tải: siêu dữ liệu ' +
            'bên trong PDF nói nó là gì, không phụ thuộc tên file. Giờ chuyển sang văn bản:' },

          { t: 'code', where: 'wsl', code:
            'pdftotext -layout DDI0190.pdf\n' +
            'ls\n' +
            'wc -l DDI0190.txt\n' +
            'grep -n -E \'^ +Chapter [0-9]\' DDI0190.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'DDI0190.pdf  DDI0190.txt\n' +
            '2542 DDI0190.txt\n' +
            '86:   Chapter 1    Introduction\n' +
            '89:   Chapter 2    Functional Overview\n' +
            '94:   Chapter 3    Programmer’s Model\n' +
            '99:   Chapter 4    Programmer’s Model for Test\n' +
            '114:     Chapter 5   Signal Descriptions' },

          { t: 'cmdx', cmd: 'pdftotext -layout DDI0190.pdf',
            rows: [
              ['<code>pdftotext</code>', 'Trích văn bản từ PDF.', 'Chỉ có tác dụng với PDF chứa chữ thật; PDF quét từ giấy cần OCR'],
              ['<code>-layout</code>', 'Giữ vị trí cột như trên trang.', '<b>Bắt buộc với bảng thanh ghi</b>: không có cờ này, các cột Address/Type/Reset bị nối thành một dòng dài không đọc được'],
              ['<code>DDI0190.pdf</code>', 'File vào. Không ghi file ra thì mặc định là cùng tên, đuôi <code>.txt</code>.', 'Ghi <code>-</code> làm file ra để in thẳng ra màn hình']
            ] },

          { t: 'p', x:
            '68 trang thành <b>2 542</b> dòng văn bản. <code>grep</code> mục lục cho đúng năm chương đã liệt kê ở ' +
            'phần lý thuyết, kèm số dòng trong file <code>.txt</code>. Tìm tiếp câu mở đầu chương 3 và bảng tổng hợp:' },

          { t: 'code', where: 'wsl', code:
            'grep -n -E \'base address of the PrimeCell GPIO is not fixed|offset of any particular register\' DDI0190.txt\n' +
            'grep -n \'Table 3-1 PrimeCell GPIO register summary\' DDI0190.txt\n' +
            'sed -n \'1218,1250p\' DDI0190.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1195:                     The base address of the PrimeCell GPIO is not fixed, and can be different for any\n' +
            '1196:                     particular system implementation. However, the offset of any particular register from\n' +
            '1216:                                                                  Table 3-1 PrimeCell GPIO register summary\n' +
            '1267:                                                       Table 3-1 PrimeCell GPIO register summary (continued)\n' +
            ' Address        Type            Width    Reset value        Name                    Description\n' +
            '\n' +
            ' GPIO base +    Read/write      8        0x00               GPIODATA                PrimeCell GPIO data register\n' +
            ' 0x000 to\n' +
            ' GPIO base +\n' +
            ' 0x3FC\n' +
            '\n' +
            ' GPIO base +    Read/write      8        0x00               GPIODIR                 PrimeCell GPIO data direction\n' +
            ' 0x400                                                                              register\n' +
            '\n' +
            ' GPIO base +    Read/write      8        0x00               GPIOIS                  PrimeCell GPIO interrupt sense\n' +
            ' 0x404                                                                              register\n' +
            '…\n' +
            ' GPIO base +    Write           8        0x00               GPIOIC                  PrimeCell GPIO interrupt clear\n' +
            ' 0x41C\n' +
            '\n' +
            ' GPIO base +    Read/write      8        0x00               GPIOAFSEL               PrimeCell GPIO mode control\n' +
            ' 0x420                                                                              select',
            notes: ['Bài lược bớt các hàng <code>0x408</code>–<code>0x418</code> (dấu <code>…</code>); lệnh <code>sed</code> của bạn in đủ 33 dòng.'] },

          { t: 'p', x:
            'Bảng có hai phần (dòng 1216 và 1267, "continued") vì nó tràn sang trang sau — rất thường gặp, và là lý do ' +
            'nên <code>grep</code> tên bảng trước khi <code>sed</code>. Mỗi hàng chiếm hai tới bốn dòng văn bản vì ô ' +
            'Address và Description xuống dòng trong PDF, nhưng nhờ <code>-layout</code> các cột vẫn thẳng hàng: bạn ' +
            'đọc được ngay <code>GPIOIC</code> ở <code>0x41C</code> có kiểu <code>Write</code>. Đây chính là bảng ' +
            'trong phần lý thuyết, giờ bạn đã tự lấy ra được từ nguồn gốc.' },

          { t: 'p', x:
            'Cuối cùng, tìm bốn câu mà phần lý thuyết trích — lỗi trong bảng <code>GPIODIR</code>, câu văn đúng ngay ' +
            'trên nó, và hai quy tắc của mục 2.3.3 — để tự thấy chúng nằm ở đâu:' },

          { t: 'code', where: 'wsl', code:
            'grep -n -A1 \'Bits set, pins output\' DDI0190.txt\n' +
            'grep -n -E \'Clearing a bit configures the pin to be|pins are input by default\' DDI0190.txt\n' +
            'grep -n -E \'only affects|covers 256|must be 32-bit\' DDI0190.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1365:                       7:0              Data direction register     Read/      Bits set, pins output\n' +
            '1366-                                                                    write      Bits cleared, pins output\n' +
            '1356:                     configure corresponding pin to be an output. Clearing a bit configures the pin to be\n' +
            '1357:                     input. All bits are cleared by a reset. Therefore, the GPIO pins are input by default.\n' +
            '756:                          Writing to the data register only affects the pins that are configured as outputs.\n' +
            '762:                          operations. The data register effectively covers 256 locations in the address space. The\n' +
            '1593:                             registers must be 32-bit, using the LDR and STR instructions.' },

          { t: 'cal', kind: 'why', title: 'Dòng 1356 và dòng 1366 cách nhau mười dòng và nói ngược nhau',
            x: 'Dòng <b>1366</b> (ô bảng): <i>"Bits cleared, pins output"</i>. Dòng <b>1357</b> (đoạn văn): <i>"the GPIO ' +
               'pins are input by default"</i>, sau khi đã nói reset xoá mọi bit. Nếu bảng đúng, reset sẽ biến mọi chân ' +
               'thành output — trái với dòng 1357 và với mục 2.3.2. Bước 2 hỏi phần cứng: sau reset, chân có nhận giá trị ' +
               'ghi vào <code>GPIODATA</code> không? Dòng <b>756</b> và <b>762</b> là hai quy tắc chỉ có trong chương 2 ' +
               '— nếu bạn nhảy thẳng tới bảng thanh ghi ở chương 3 như nhiều người vẫn làm, bạn không bao giờ thấy chúng. ' +
               'Dòng <b>1593</b> giải thích vì sao <code>vgpio</code> đọc ID bằng <code>readl</code> chứ không ' +
               '<code>readb</code>.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Để phần cứng xác nhận từng câu của datasheet',
        blocks: [
          { t: 'p', x:
            'Để thử datasheet, bạn cần PL061 ở đúng trạng thái sau reset — không driver nào đã ghi vào nó. Cây ' +
            '<code>vgpio.dtb</code> của Bài 56 cho đúng điều đó: <code>compatible = "learn,vgpio"</code> làm driver PL061 ' +
            'của kernel không nhận thiết bị, và bạn không nạp <code>vgpio.ko</code>. Boot với initramfs gốc của Bài 32 ' +
            '— nó có <code>devmem</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz -dtb ~/bai56/vgpio.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'grep 9030000 /proc/iomem\n' +
            'ls /sys/bus/platform/devices/9030000.pl061/' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep 9030000 /proc/iomem\n' +
            '~ # ls /sys/bus/platform/devices/9030000.pl061/\n' +
            'driver_override       power                 waiting_for_supplier\n' +
            'modalias              subsystem\n' +
            'of_node               uevent' },

          { t: 'p', x:
            '<code>grep</code> không in gì: không ai giữ dải <code>0x09030000</code> trong <code>/proc/iomem</code>. ' +
            'Thư mục thiết bị không có liên kết <code>driver</code>: thiết bị tồn tại nhưng chưa driver nào nhận. Mọi ' +
            'thanh ghi đang mang giá trị do phần cứng tự đặt khi bật nguồn. Đọc các thanh ghi điều khiển và dữ liệu:' },

          { t: 'code', where: 'qemu', code:
            'for o in 400 404 408 40c 410 414 418 420; do printf \'%s \' $o; devmem 0x09030$o 32; done\n' +
            'devmem 0x090303fc 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '400 0x00000000\n' +
            '404 0x00000000\n' +
            '408 0x00000000\n' +
            '40c 0x00000000\n' +
            '410 0x00000000\n' +
            '414 0x00000000\n' +
            '418 0x00000000\n' +
            '420 0x00000000\n' +
            '0x00000000' },

          { t: 'p', x:
            'Tám thanh ghi từ <code>GPIODIR</code> tới <code>GPIOAFSEL</code>, và <code>GPIODATA</code> đọc với mặt nạ ' +
            'đầy <code>0x3FC</code>: tất cả <code>0x00</code>, khớp từng ô trong cột Reset value của Bảng 3-1. Đọc ' +
            'thêm bốn thanh ghi nhận dạng, ghép thành một số 32 bit, rồi tách thành bốn trường của mục 3.3.11 — đúng ' +
            'phép tính trong hình ở phần lý thuyết, làm bằng số học của shell:' },

          { t: 'code', where: 'qemu', code:
            'id=$(( $(devmem 0x09030fe0) | $(devmem 0x09030fe4) << 8 | $(devmem 0x09030fe8) << 16 | $(devmem 0x09030fec) << 24 ))\n' +
            'printf \'part 0x%03x designer 0x%02x rev %d config %d\\n\' $((id & 0xfff)) $(((id >> 12) & 0xff)) $(((id >> 20) & 0xf)) $((id >> 24))' },

          { t: 'code', where: 'out', nocopy: true, code:
            'part 0x061 designer 0x41 rev 0 config 0' },

          { t: 'cmdx', cmd: '$(( a | b << 8 )) và $(( (id >> 12) & 0xff ))',
            rows: [
              ['<code>$(devmem 0x09030fe0)</code>', 'Chạy <code>devmem</code>, thay bằng thứ nó in: chuỗi <code>0x00000061</code>.', 'Bỏ độ rộng thì mặc định 32 bit — đúng quy tắc dòng 1593'],
              ['<code>$(( … ))</code>', 'Số học số nguyên của shell. Hiểu được tiền tố <code>0x</code>.', 'BusyBox <code>ash</code> tính trên 64 bit'],
              ['<code>b &lt;&lt; 8</code>', 'Dịch trái 8 bit: đặt <code>PeriphID1</code> vào byte thứ hai.', '<code>&lt;&lt;</code> ưu tiên cao hơn <code>|</code>, nên không cần ngoặc'],
              ['<code>(id &gt;&gt; 12) &amp; 0xff</code>', 'Dịch trường Designer <code>[19:12]</code> xuống bit 0, rồi giữ 8 bit.', 'Công thức chung: <code>(giá_trị &gt;&gt; bit_thấp) &amp; ((1 &lt;&lt; độ_rộng) - 1)</code>'],
              ['<code>%03x</code>', 'In hệ 16, đủ 3 chữ số, thêm số 0 phía trước.', 'Part number rộng 12 bit = 3 chữ số hex']
            ] },

          { t: 'p', x:
            'Bốn trường, bốn giá trị đúng như mục 3.3.11 nói phải có: part <code>0x061</code>, designer <code>0x41</code> ' +
            '(ARM), revision 0, configuration 0. Khác Bài 56 ở chỗ bạn không chỉ thấy <code>0x041061</code> mà biết ' +
            'từng bit của nó thuộc trường nào. Giờ thử câu của dòng 756 — ghi vào <code>GPIODATA</code> khi mọi chân ' +
            'đang là input (<code>GPIODIR</code> = 0):' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x090303fc 32 0xff\n' +
            'devmem 0x090303fc 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # devmem 0x090303fc 32 0xff\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000000' },

          { t: 'p', x:
            'Ghi <code>0xFF</code> với mặt nạ đầy, đọc lại vẫn <code>0x00</code>. Lần ghi bị nuốt mất: đúng như ' +
            '<i>"only affects the pins that are configured as outputs"</i>. Và vì <code>GPIODIR</code> đang là ' +
            '<code>0x00</code>, kết quả này cũng phân xử lỗi của Bảng 3-3: bit bị xoá nghĩa là <b>input</b> — dòng ' +
            '1357 đúng, dòng 1366 sai. Giờ bật cả tám chân thành output rồi ghi lại:' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x09030400 32 0xff\n' +
            'devmem 0x090303fc 32 0xff\n' +
            'devmem 0x090303fc 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # devmem 0x09030400 32 0xff\n' +
            '~ # devmem 0x090303fc 32 0xff\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x000000FF' },

          { t: 'p', x:
            'Cùng một lệnh ghi, lần này ra <code>0xFF</code>. Chỉ có <code>GPIODIR</code> thay đổi. Bây giờ lặp lại ' +
            'đúng ví dụ Hình 2-2 của datasheet: xoá hết, ghi <code>0xFB</code> vào offset <code>0x098</code>, đọc cả 8 ' +
            'chân. Rồi ví dụ Hình 2-3: đặt cả 8 chân lên 1, đọc ở offset <code>0x0C4</code>.' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x090303fc 32 0x00\n' +
            'devmem 0x09030098 32 0xfb\n' +
            'devmem 0x090303fc 32\n' +
            'devmem 0x090303fc 32 0xff\n' +
            'devmem 0x090300c4 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # devmem 0x090303fc 32 0x00\n' +
            '~ # devmem 0x09030098 32 0xfb\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000022\n' +
            '~ # devmem 0x090303fc 32 0xff\n' +
            '~ # devmem 0x090300c4 32\n' +
            '0x00000031' },

          { t: 'cal', kind: 'why', title: '0x22 và 0x31 — hai con số datasheet đoán trước',
            x: '<b>Ghi</b>: <code>0x098 &gt;&gt; 2</code> = <code>0x26</code> = <code>0b00100110</code> — mặt nạ cho chân 5, ' +
               '2, 1. Giá trị <code>0xFB</code> có bit 5 = 1, bit 2 = 0, bit 1 = 1. Trước đó mọi chân là 0, nên kết quả ' +
               'là bit 5 và bit 1 bật: <code>0b00100010</code> = <b><code>0x22</code></b>. Hình 2-2 vẽ đúng hàng ' +
               '<code>u u 1 u u 0 1 u</code> này. <b>Đọc</b>: <code>0x0C4 &gt;&gt; 2</code> = <code>0x31</code> = ' +
               '<code>0b00110001</code> — mặt nạ cho chân 5, 4, 0. Cả 8 chân đang là 1, nhưng chỉ ba chân trong mặt nạ ' +
               'được trả về, năm chân còn lại <i>"returned as zero, regardless of their state"</i>: ra ' +
               '<b><code>0x31</code></b>. Mặt nạ khi đọc trùng với chính giá trị đọc được — không phải trùng hợp, đó là ' +
               'dấu hiệu nhận ra ngay: đọc ở offset <code>M &lt;&lt; 2</code> khi mọi chân là 1 luôn ra <code>M</code>.' },

          { t: 'p', x:
            'Bạn vừa kiểm chứng sáu điều trong datasheet — reset value, bốn trường ID, lỗi của Bảng 3-3, quy tắc chỉ ' +
            'ghi được chân output, mặt nạ ghi, mặt nạ đọc — mà không viết một dòng mã kernel nào. Tắt máy ảo ' +
            '(<code>poweroff -f</code>): lần boot sau, mọi thanh ghi lại về <code>0x00</code>.' },

          { t: 'cal', kind: 'warn', title: 'Trên board thật, đây là lúc có thể làm cháy thứ gì đó',
            x: '<code>devmem 0x09030400 32 0xff</code> vừa biến cả tám chân thành output. Trên QEMU, chân không nối vào ' +
               'đâu. Trên một board thật, một chân được thiết kế làm input — nối vào đầu ra của một chip khác, hay vào ' +
               'một nút bấm kéo xuống đất — bị ép thành output mức 1 là hai đầu ra đấu thẳng vào nhau: dòng điện lớn, ' +
               'có thể hỏng chân. Trước khi <code>devmem</code> ghi vào <code>GPIODIR</code> trên phần cứng thật, mở ' +
               'sơ đồ mạch (schematic) xem chân đó nối vào đâu. Datasheet cho bạn biết thanh ghi làm gì; chỉ schematic ' +
               'cho biết làm thế trên board <i>này</i> có an toàn không.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Build libgpiod 2.2.5 và nhìn PL061 qua /dev/gpiochip0',
        blocks: [
          { t: 'p', x:
            'Trước hết, xem WSL có gì và kernel của bạn có giao diện GPIO nào. Hai lệnh đầu chạy trên WSL, không phải ' +
            'trong máy ảo:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'command -v meson gpiodetect; echo "rc=$?"\n' +
            'apt-cache policy gpiod | sed -n 1,3p\n' +
            'grep CONFIG_GPIO_SYSFS ~/bai38/linux-6.18.45/.config; echo "rc=$?"\n' +
            'grep -E \'^CONFIG_GPIO_CDEV\' ~/bai38/linux-6.18.45/.config' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=1\n' +
            'gpiod:\n' +
            '  Installed: (none)\n' +
            '  Candidate: 1.4.1-4\n' +
            'rc=1\n' +
            'CONFIG_GPIO_CDEV=y\n' +
            'CONFIG_GPIO_CDEV_V1=y' },

          { t: 'p', x:
            'Bốn dữ kiện. <code>command -v</code> không in gì và <code>rc=1</code>: không có <code>meson</code> (nên ' +
            'không build được libgpiod 2.3+) và không có công cụ GPIO nào. Gói của Ubuntu 20.04 là bản <b>1.4.1</b>, ' +
            'thế hệ cũ. <code>grep GPIO_SYSFS</code> không khớp dòng nào (<code>rc=1</code>): giao diện sysfs <b>không ' +
            'được build</b>, thậm chí không có dòng <code>is not set</code> vì nó ẩn sau <code>EXPERT</code>. Chỉ có ' +
            'chardev, cả v2 lẫn v1. Tải libgpiod 2.2.5 và kiểm tra checksum bằng <code>sha256sum -c</code> như với ' +
            'BusyBox ở Bài 47 — ở đây kernel.org để một file <code>sha256sums.asc</code> chung cho cả thư mục, nên ' +
            '<code>grep</code> đúng dòng của tarball trước:' },

          { t: 'code', where: 'wsl', code:
            'curl -sSLO https://mirrors.edge.kernel.org/pub/software/libs/libgpiod/libgpiod-2.2.5.tar.xz\n' +
            'curl -sSLO https://mirrors.edge.kernel.org/pub/software/libs/libgpiod/sha256sums.asc\n' +
            'grep \' libgpiod-2.2.5.tar.xz$\' sha256sums.asc | sha256sum -c\n' +
            'ls -l libgpiod-2.2.5.tar.xz\n' +
            'tar xf libgpiod-2.2.5.tar.xz\n' +
            'grep -c GPIO_V2_GET_LINE_IOCTL /usr/aarch64-linux-gnu/include/linux/gpio.h libgpiod-2.2.5/lib/uapi/gpio.h' },

          { t: 'code', where: 'out', nocopy: true, code:
            'libgpiod-2.2.5.tar.xz: OK\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 511516 Sep 30 15:28 libgpiod-2.2.5.tar.xz\n' +
            '/usr/aarch64-linux-gnu/include/linux/gpio.h:0\n' +
            'libgpiod-2.2.5/lib/uapi/gpio.h:1' },

          { t: 'p', x:
            '<code>OK</code>: tarball <b>511 516 byte</b> đúng từng byte với bản kernel.org công bố. Dòng cuối trả lời ' +
            'một câu hỏi bạn nên tự đặt trước khi cross-compile bất cứ thứ gì nói chuyện với kernel: header của kernel ' +
            'mà trình biên dịch chéo dùng có biết API mới không? <code>/usr/aarch64-linux-gnu/include/linux/gpio.h</code> ' +
            'lấy từ kernel 5.4 của Ubuntu 20.04 — <b>0</b> lần nhắc tới <code>GPIO_V2_GET_LINE_IOCTL</code>, vì chardev v2 ' +
            'có từ 5.10. libgpiod tự mang theo bản sao <code>lib/uapi/gpio.h</code> của nó (<b>1</b>), nên build được ' +
            'dù header hệ thống cũ.' },

          { t: 'code', where: 'wsl', code:
            'mkdir build-gpiod && cd build-gpiod\n' +
            'time ../libgpiod-2.2.5/configure --host=aarch64-linux-gnu --enable-tools --enable-static --disable-shared > configure.log\n' +
            'time make -j16 LDFLAGS=-all-static > make.log\n' +
            'grep -c \'warning:\' make.log\n' +
            'ls tools | grep -v -E \'\\.(o|la|lo)$|Makefile\'\n' +
            'file tools/gpioset' },

          { t: 'code', where: 'out', nocopy: true, code:
            'configure: WARNING: using cross tools not prefixed with host triplet\n' +
            '\n' +
            'real\t0m7.115s\n' +
            'user\t0m3.125s\n' +
            'sys\t0m0.639s\n' +
            '\n' +
            'real\t0m0.831s\n' +
            'user\t0m2.723s\n' +
            'sys\t0m0.577s\n' +
            '0\n' +
            'gpiodetect\n' +
            'gpioget\n' +
            'gpioinfo\n' +
            'gpiomon\n' +
            'gpionotify\n' +
            'gpioset\n' +
            'tools/gpioset: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=c3cb0a412827fa63951344052d5697dcd54a2e3a, for GNU/Linux 3.7.0, with debug_info, not stripped' },

          { t: 'cmdx', cmd: '../libgpiod-2.2.5/configure --host=aarch64-linux-gnu --enable-tools --enable-static --disable-shared',
            rows: [
              ['<code>../libgpiod-2.2.5/configure</code>', 'Chạy script cấu hình từ một thư mục build riêng.', 'Build "ngoài cây" (<i>out-of-tree</i>), như <code>make O=</code> của kernel ở Bài 41: thư mục nguồn không bị động tới'],
              ['<code>--host=aarch64-linux-gnu</code>', 'Chương trình sẽ <b>chạy</b> trên ARM64. <code>configure</code> tìm <code>aarch64-linux-gnu-gcc</code>.', 'Chữ "host" của autotools = máy chạy, không phải máy build. Bài 25 đã phân biệt build / host / target'],
              ['<code>--enable-tools</code>', 'Build cả sáu công cụ dòng lệnh, không chỉ thư viện.', 'Mặc định chỉ build thư viện'],
              ['<code>--enable-static --disable-shared</code>', 'Chỉ tạo <code>libgpiod.a</code>, không tạo <code>.so</code>.', 'Initramfs của Bài 32 không có thư viện động nào'],
              ['<code>LDFLAGS=-all-static</code>', 'Cờ của <code>libtool</code>: link tĩnh cả glibc vào từng công cụ.', '<code>-static</code> thường bị <code>libtool</code> hiểu là "chỉ thư viện của dự án", vẫn để glibc động']
            ] },

          { t: 'p', x:
            '<code>configure</code> mất 7,1 s, <code>make</code> chưa tới 1 s — libgpiod nhỏ. Không cảnh báo biên dịch ' +
            'nào. Dòng <code>WARNING: using cross tools not prefixed with host triplet</code> vô hại: ' +
            '<code>configure</code> tìm <code>aarch64-linux-gnu-g++</code> cho phần bindings C++, không thấy (máy bạn ' +
            'chỉ có trình biên dịch C chéo) nên ghi nhận <code>g++</code> của WSL — nhưng bài không bật bindings C++, ' +
            'nên trình biên dịch đó không bao giờ được gọi. <code>file</code> xác nhận công cụ là ELF ARM aarch64, ' +
            '<code>statically linked</code>. Chép sáu công cụ (đã strip) vào một bản sao initramfs của Bài 32:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'for t in gpiodetect gpioinfo gpioget gpioset gpiomon gpionotify; do aarch64-linux-gnu-strip -o initramfs/bin/$t build-gpiod/tools/$t; done\n' +
            'ls -l initramfs/bin\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total 5740\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 1980720 Sep 28 14:15 busybox\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  639400 Sep 30 15:28 gpiodetect\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  643496 Sep 30 15:28 gpioget\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  643496 Sep 30 15:28 gpioinfo\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  647592 Sep 30 15:28 gpiomon\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  643496 Sep 30 15:28 gpionotify\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc  655784 Sep 30 15:28 gpioset\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc       7 Sep 28 14:15 sh -> busybox\n' +
            '11438 blocks' },

          { t: 'p', x:
            'Mỗi công cụ khoảng <b>640 KB</b> sau khi strip, vì mỗi file mang một bản glibc tĩnh riêng — sáu bản. ' +
            'BusyBox tránh được điều này bằng cách gộp mọi lệnh vào một file (Bài 47); với một bài học thì chấp nhận ' +
            'được. Lần này boot <b>không</b> có <code>-dtb</code>: cây mặc định của QEMU, driver PL061 của kernel nắm ' +
            'thiết bị, <code>gpio-keys</code> nắm chân 3. Trong máy ảo:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls -l /dev/gpiochip*\n' +
            'grep gpio /proc/devices\n' +
            'ls /sys/class/gpio\n' +
            'gpiodetect\n' +
            'gpioinfo -c gpiochip0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls -l /dev/gpiochip*\n' +
            'crw-------    1 0        0         254,   0 Jan  1  1970 /dev/gpiochip0\n' +
            '~ # grep gpio /proc/devices\n' +
            '254 gpiochip\n' +
            '~ # ls /sys/class/gpio\n' +
            'ls: /sys/class/gpio: No such file or directory\n' +
            '~ # gpiodetect\n' +
            'gpiochip0 [9030000.pl061] (8 lines)\n' +
            '~ # gpioinfo -c gpiochip0\n' +
            'gpiochip0 - 8 lines:\n' +
            '\tline   0:\tunnamed         \tinput\n' +
            '\tline   1:\tunnamed         \tinput\n' +
            '\tline   2:\tunnamed         \tinput\n' +
            '\tline   3:\tunnamed         \tinput consumer="GPIO Key Poweroff"\n' +
            '\tline   4:\tunnamed         \tinput\n' +
            '\tline   5:\tunnamed         \tinput\n' +
            '\tline   6:\tunnamed         \tinput\n' +
            '\tline   7:\tunnamed         \tinput' },

          { t: 'cal', kind: 'why', title: 'Major 254 — ô cuối cùng trong dải của Bài 52',
            x: '<code>/dev/gpiochip0</code> là một char device <b>254, 0</b>, và <code>/proc/devices</code> gọi major đó ' +
               'là <code>gpiochip</code>. Ở Bài 52 bạn đếm được 21 số từ 234 tới 254 đều đã có chủ, nên ' +
               '<code>ramdisk</code> phải nhận 510: <code>254 gpiochip</code> là một trong 21 chủ đó. Mỗi ' +
               '<code>gpio_chip</code> đăng ký thêm một minor. <code>/sys/class/gpio</code> không tồn tại — kernel không ' +
               'có giao diện cũ, đúng như <code>.config</code> nói. <code>gpioinfo</code> cho thấy thứ sysfs chưa bao ' +
               'giờ cho: chân 3 có chủ, <code>consumer="GPIO Key Poweroff"</code> — nhãn của nút trong node ' +
               '<code>gpio-keys</code> (Bài 45), vì <code>gpio_keys.c</code> dùng thuộc tính <code>label</code> của nút ' +
               'làm tên khi xin chân.' },

          { t: 'p', x:
            'Thử xin chân 3 đang có chủ, rồi dùng chân 0 đang rảnh:' },

          { t: 'code', where: 'qemu', code:
            'gpioget -c gpiochip0 3\n' +
            'gpioget -c gpiochip0 0\n' +
            'gpioset -c gpiochip0 -t 0 0=1\n' +
            'gpioinfo -c gpiochip0 0\n' +
            'devmem 0x09030400 32\n' +
            'devmem 0x090303fc 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpioget -c gpiochip0 3\n' +
            'gpioget: unable to request lines: Device or resource busy\n' +
            '~ # gpioget -c gpiochip0 0\n' +
            '"0"=inactive\n' +
            '~ # gpioset -c gpiochip0 -t 0 0=1\n' +
            '~ # gpioinfo -c gpiochip0 0\n' +
            'gpiochip0 0\tunnamed         \toutput\n' +
            '~ # devmem 0x09030400 32\n' +
            '0x00000001\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000001' },

          { t: 'cmdx', cmd: 'gpioset -c gpiochip0 -t 0 0=1',
            rows: [
              ['<code>-c gpiochip0</code>', 'Chip nào. Nhận số (<code>0</code>), tên (<code>gpiochip0</code>) hoặc đường dẫn.', 'Bỏ <code>-c</code> thì chân phải gọi bằng <b>tên</b> — bước 4'],
              ['<code>-t 0</code>', '"Toggle" với chu kỳ 0: đặt giá trị rồi <b>thoát ngay</b>.', 'Mặc định <code>gpioset</code> <b>không thoát</b> — giữ chân tới khi bị dừng, vì chân thuộc về fd của nó'],
              ['<code>0=1</code>', 'Chân offset 0 lên mức 1. Nhận cả <code>active</code>/<code>on</code>.', 'Nhiều cặp trong một lệnh = một <code>ioctl</code>, các chân đổi cùng lúc']
            ] },

          { t: 'p', x:
            '<code>Device or resource busy</code> là <code>EBUSY</code> từ gpiolib: chân 3 đã thuộc về một consumer ' +
            'trong kernel, userspace không lấy được. Không có cơ chế này, sysfs cũ cho phép bạn biến chân nút nguồn ' +
            'thành output mà <code>gpio-keys</code> không hay biết. Chân 0 thì rảnh: đọc được <code>inactive</code> ' +
            '(mức 0), đặt được lên 1. Hai dòng <code>devmem</code> là bằng chứng tầng dưới: <code>GPIODIR</code> = ' +
            '<code>0x01</code> (chân 0 thành output), <code>GPIODATA</code> = <code>0x01</code>. <code>gpioset</code> ' +
            'không biết gì về thanh ghi — nó gọi một <code>ioctl</code>, gpiolib gọi <code>direction_output</code> ' +
            'của driver PL061, và driver ghi đúng hai thanh ghi mà bước 2 bạn ghi bằng tay.' },

          { t: 'cal', kind: 'info', title: 'Chân vẫn là output sau khi gpioset thoát — và đó không phải lời hứa',
            x: '<code>-t 0</code> làm <code>gpioset</code> thoát, fd bị đóng, chân được trả lại cho gpiolib — nhưng ' +
               '<code>gpioinfo</code> vẫn thấy <code>output</code> và thanh ghi vẫn là <code>0x01</code>. Khi trả chân, ' +
               'gpiolib chỉ xoá các cờ sở hữu (<code>gpiod_free_commit</code>, <code>gpiolib.c:2496</code>); nó không ' +
               'đưa phần cứng về input. <code>gpioset --help</code> nói thẳng: <i>"It should not be assumed that a line ' +
               'will retain its state after gpioset exits … the state of a line may be modified by the kernel or ' +
               'another process."</i> Trên PL061 mức còn giữ; trên bộ điều khiển khác có thể không. Muốn chắc một chân ' +
               'giữ mức, giữ fd của nó mở — bước 4 chạy <code>gpioset</code> nền đúng vì lý do này.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Bật gpio-sim, build lại kernel, dựng một bảng mạch giả qua configfs',
        blocks: [
          { t: 'p', x:
            'Xem trạng thái hiện tại và điều Kconfig nói về <code>GPIO_SIM</code> trước khi đổi gì:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'grep -E \'CONFIG_(GPIO_SIM|IRQ_SIM|CONFIGFS_FS)[ =]\' .config\n' +
            'grep -n -A6 \'^config GPIO_SIM\' drivers/gpio/Kconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '# CONFIG_GPIO_SIM is not set\n' +
            'CONFIG_CONFIGFS_FS=y\n' +
            '2009:config GPIO_SIM\n' +
            '2010-\ttristate "GPIO Simulator Module"\n' +
            '2011-\tselect IRQ_SIM\n' +
            '2012-\tselect CONFIGFS_FS\n' +
            '2013-\tselect DEV_SYNC_PROBE\n' +
            '2014-\thelp\n' +
            '2015-\t  This enables the GPIO simulator - a configfs-based GPIO testing' },

          { t: 'p', x:
            '<code>tristate</code>: được build thành module. Ba dòng <code>select</code> kéo theo ba thứ: ' +
            '<code>CONFIGFS_FS</code> đã có (<code>=y</code>), còn <code>IRQ_SIM</code> và <code>DEV_SYNC_PROBE</code> ' +
            'chưa có dòng nào trong <code>.config</code> — chúng là tuỳ chọn ẩn, chỉ xuất hiện khi có ai ' +
            '<code>select</code>. Bật bằng <code>scripts/config</code> (Bài 39) rồi để <code>olddefconfig</code> kéo ' +
            'phần còn lại. Lưu một bản <code>.config</code> cũ để so:' },

          { t: 'code', where: 'wsl', code:
            'cp .config ~/bai57/config.orig\n' +
            'scripts/config --module GPIO_SIM\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 olddefconfig\n' +
            'diff ~/bai57/config.orig .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '58a59\n' +
            '> CONFIG_IRQ_SIM=y\n' +
            '4547c4548\n' +
            '< # CONFIG_GPIO_SIM is not set\n' +
            '---\n' +
            '> CONFIG_GPIO_SIM=m\n' +
            '4555a4557\n' +
            '> CONFIG_DEV_SYNC_PROBE=m' },

          { t: 'p', x:
            'Ba dòng thay đổi, đúng ba thứ Kconfig hứa. Để ý kiểu của từng dòng: <code>GPIO_SIM=m</code> và ' +
            '<code>DEV_SYNC_PROBE=m</code> là module, nhưng <code>IRQ_SIM=y</code> là <b>built-in</b> — nó là ' +
            '<code>bool</code> trong <code>kernel/irq/Kconfig</code>, không thể là module. Vì thế lệnh build phải có cả ' +
            '<code>Image</code> chứ không chỉ <code>modules</code>. <code>PYTHON3=python3.9</code> là yêu cầu riêng của ' +
            'máy này (Bài 44); bỏ nếu <code>python3 --version</code> của bạn ≥ 3.9.' },

          { t: 'code', where: 'wsl', code:
            'time make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 -j$(nproc) Image modules > ~/bai57/kbuild.log 2>&1\n' +
            'grep -E \'irq_sim|gpio-sim|dev-sync\' ~/bai57/kbuild.log\n' +
            'ls -l drivers/gpio/gpio-sim.ko drivers/gpio/dev-sync-probe.ko\n' +
            'modinfo -F depends drivers/gpio/gpio-sim.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m32.405s\n' +
            'user\t0m50.097s\n' +
            'sys\t0m14.938s\n' +
            '  CC      kernel/irq/irq_sim.o\n' +
            '  CC [M]  drivers/gpio/dev-sync-probe.o\n' +
            '  CC [M]  drivers/gpio/gpio-sim.o\n' +
            '  CC [M]  drivers/gpio/dev-sync-probe.mod.o\n' +
            '  CC [M]  drivers/gpio/gpio-sim.mod.o\n' +
            '  LD [M]  drivers/gpio/dev-sync-probe.ko\n' +
            '  LD [M]  drivers/gpio/gpio-sim.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 107760 Sep 30 15:07 drivers/gpio/dev-sync-probe.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 262128 Sep 30 15:07 drivers/gpio/gpio-sim.ko\n' +
            'dev_sync_probe' },

          { t: 'p', x:
            '<b>32 giây</b> — so với 5 phút 22 giây của lần build <code>Image</code> đầu tiên trên máy này. Kbuild so ' +
            'thời gian sửa và phụ thuộc của từng file (Bài 40), nên chỉ biên dịch lại ba file liên quan, cộng bước link ' +
            '<code>vmlinux</code> luôn phải làm lại. <code>irq_sim.o</code> không có <code>[M]</code>: nó vào thẳng ' +
            '<code>Image</code>. <code>modinfo -F depends</code> ra <code>dev_sync_probe</code>: phải nạp module đó ' +
            'trước. Thời gian của bạn sẽ khác theo số nhân; con số quan trọng là tỉ lệ so với lần build đầu.' },

          { t: 'cal', kind: 'info', title: 'Nếu bạn build lại lần nữa, sẽ không thấy dòng CC nào',
            x: 'Người viết bài build hai lần trong cùng buổi. Lần thứ hai, <code>grep</code> không ra dòng ' +
               '<code>CC … irq_sim.o</code> nào: các object đã có từ lần đầu và không thay đổi, Kbuild chỉ link lại ' +
               '(24 s). Nếu bạn quay về <code>config.orig</code> rồi bật lại, cũng vậy. Không có dòng ' +
               '<code>CC</code> không có nghĩa là bật thất bại — kiểm tra bằng <code>ls drivers/gpio/gpio-sim.ko</code>.' },

          { t: 'p', x:
            'Thêm hai module vào initramfs của bước 3, cùng một thư mục trống <code>/config</code> để gắn configfs, rồi ' +
            'boot lại — vẫn cây mặc định:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'mkdir -p initramfs/lib/modules initramfs/config\n' +
            'cp ~/bai38/linux-6.18.45/drivers/gpio/{gpio-sim,dev-sync-probe}.ko initramfs/lib/modules/\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/*.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Trong máy ảo: nạp hai module theo thứ tự phụ thuộc, gắn configfs, rồi tạo một thiết bị <code>board</code> ' +
            'có một bank <code>bank0</code>. Chưa ghi gì, chỉ <code>mkdir</code> và nhìn những gì kernel tự tạo ra:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/dev-sync-probe.ko\n' +
            'insmod /lib/modules/gpio-sim.ko\n' +
            'mount -t configfs none /config\n' +
            'ls /config\n' +
            'mkdir /config/gpio-sim/board /config/gpio-sim/board/bank0\n' +
            'ls /config/gpio-sim/board /config/gpio-sim/board/bank0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /config\n' +
            'gpio-sim  pci_ep\n' +
            '~ # mkdir /config/gpio-sim/board /config/gpio-sim/board/bank0\n' +
            '~ # ls /config/gpio-sim/board /config/gpio-sim/board/bank0\n' +
            '/config/gpio-sim/board:\n' +
            'bank0     dev_name  live\n' +
            '\n' +
            '/config/gpio-sim/board/bank0:\n' +
            'chip_name  label      num_lines' },

          { t: 'p', x:
            '<code>gpio-sim</code> đã đăng ký một thư mục gốc trong configfs (bên cạnh <code>pci_ep</code> có sẵn trong ' +
            '<code>defconfig</code>). Bạn chỉ <code>mkdir</code> hai thư mục rỗng, vậy mà trong đó đã có file: ' +
            '<code>dev_name</code>, <code>live</code>, <code>chip_name</code>, <code>label</code>, ' +
            '<code>num_lines</code>. Đó là configfs làm việc — mỗi <code>mkdir</code> gọi vào module, module tạo đối ' +
            'tượng cấu hình cùng các thuộc tính của nó. Điền mô tả: 8 chân, nhãn <code>sim-board</code>, chân 0 tên ' +
            '<code>button</code>, chân 1 tên <code>led</code>, rồi bật:' },

          { t: 'code', where: 'qemu', code:
            'echo 8 > /config/gpio-sim/board/bank0/num_lines\n' +
            'echo sim-board > /config/gpio-sim/board/bank0/label\n' +
            'mkdir /config/gpio-sim/board/bank0/line0 /config/gpio-sim/board/bank0/line1\n' +
            'echo button > /config/gpio-sim/board/bank0/line0/name\n' +
            'echo led > /config/gpio-sim/board/bank0/line1/name\n' +
            'echo 1 > /config/gpio-sim/board/live\n' +
            'cat /config/gpio-sim/board/dev_name /config/gpio-sim/board/bank0/chip_name\n' +
            'gpiodetect\n' +
            'gpioinfo -c gpiochip1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /config/gpio-sim/board/dev_name /config/gpio-sim/board/bank0/chip_name\n' +
            'gpio-sim.0\n' +
            'gpiochip1\n' +
            '~ # gpiodetect\n' +
            'gpiochip0 [9030000.pl061] (8 lines)\n' +
            'gpiochip1 [sim-board] (8 lines)\n' +
            '~ # gpioinfo -c gpiochip1\n' +
            'gpiochip1 - 8 lines:\n' +
            '\tline   0:\t"button"        \tinput\n' +
            '\tline   1:\t"led"           \tinput\n' +
            '\tline   2:\tunnamed         \tinput\n' +
            '\tline   3:\tunnamed         \tinput\n' +
            '\tline   4:\tunnamed         \tinput\n' +
            '\tline   5:\tunnamed         \tinput\n' +
            '\tline   6:\tunnamed         \tinput\n' +
            '\tline   7:\tunnamed         \tinput' },

          { t: 'p', x:
            'Sau <code>echo 1 &gt; live</code>, hai file chỉ đọc được điền: platform device tên <code>gpio-sim.0</code>, ' +
            'chip tên <code>gpiochip1</code>. <code>gpiodetect</code> giờ thấy <b>hai</b> chip, và với nó chip giả không ' +
            'khác gì PL061 thật — cả hai đều là một <code>struct gpio_chip</code>. Chân 0 và 1 mang tên bạn đặt: ' +
            'thứ sysfs cũ không làm được, và là lý do bước 5 có thể viết <code>gpioget button</code> thay cho một con ' +
            'số. Giờ "bấm nút". Mỗi chân có một thư mục <code>sim_gpioN</code> trong sysfs của chip:' },

          { t: 'code', where: 'qemu', code:
            'S=/sys/devices/platform/gpio-sim.0/gpiochip1\n' +
            'ls $S\n' +
            'cat $S/sim_gpio0/pull $S/sim_gpio0/value\n' +
            'gpioget button\n' +
            'echo pull-up > $S/sim_gpio0/pull\n' +
            'gpioget button\n' +
            'gpioget -c gpiochip1 9' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls $S\n' +
            'dev            sim_gpio0      sim_gpio3      sim_gpio6      subsystem\n' +
            'driver         sim_gpio1      sim_gpio4      sim_gpio7      uevent\n' +
            'power          sim_gpio2      sim_gpio5      software_node\n' +
            '~ # cat $S/sim_gpio0/pull $S/sim_gpio0/value\n' +
            'pull-down\n' +
            '0\n' +
            '~ # gpioget button\n' +
            '"button"=inactive\n' +
            '~ # echo pull-up > $S/sim_gpio0/pull\n' +
            '~ # gpioget button\n' +
            '"button"=active\n' +
            '~ # gpioget -c gpiochip1 9\n' +
            'gpioget: offset 9 is out of range on chip \'gpiochip1\'' },

          { t: 'p', x:
            'Mặc định mỗi chân "bị kéo xuống" (<code>pull-down</code>), đọc ra 0 — như một nút bấm nối điện trở kéo ' +
            'xuống đất khi không ai nhấn. Ghi <code>pull-up</code> là "nhấn nút": <code>gpioget button</code> đổi từ ' +
            '<code>inactive</code> sang <code>active</code>, không cần <code>-c</code> vì tên <code>button</code> là ' +
            'duy nhất trong cả hệ thống. Offset 9 bị từ chối ngay ở libgpiod vì chip chỉ có 8 chân. Bây giờ phần mà ' +
            'sysfs cũ làm kém nhất — sự kiện. Chạy <code>gpiomon</code> nền, bấm nhả một lần:' },

          { t: 'code', where: 'qemu', code:
            'gpiomon -c gpiochip1 -e both button &\n' +
            'echo pull-down > $S/sim_gpio0/pull\n' +
            'echo pull-up > $S/sim_gpio0/pull\n' +
            'gpioinfo button\n' +
            'kill $!\n' +
            'gpioinfo button' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpiomon -c gpiochip1 -e both button &\n' +
            '~ # echo pull-down > $S/sim_gpio0/pull\n' +
            '~ # 25.754677648\tfalling\tgpiochip1 0 "button"\n' +
            'echo pull-up > $S/sim_gpio0/pull\n' +
            '26.855345552\trising\tgpiochip1 0 "button"\n' +
            '~ # gpioinfo button\n' +
            'gpiochip1 0\t"button"        \tinput edges=both consumer="gpiomon"\n' +
            '~ # kill $!\n' +
            '~ # gpioinfo button\n' +
            'gpiochip1 0\t"button"        \tinput',
            notes: ['Dòng sự kiện của <code>gpiomon</code> (chạy nền) in chen vào giữa dấu nhắc <code>~ #</code> và lệnh bạn gõ tiếp — chỉ là hiển thị, như ở Bài 54. Dấu thời gian là giây kể từ lúc boot (đồng hồ <code>monotonic</code>) và sẽ khác trên máy bạn.'] },

          { t: 'cal', kind: 'why', title: 'Mỗi sự kiện có dấu thời gian nano giây và một chủ',
            x: 'Hai sự kiện, đúng thứ tự: <code>falling</code> khi kéo xuống, <code>rising</code> khi kéo lên, cách nhau ' +
               '<b>1,10 giây</b> — đúng khoảng thời gian giữa hai lệnh <code>echo</code>. Dấu thời gian do kernel gắn ' +
               '<b>trong trình xử lý ngắt</b> (bộ điều khiển giả vẫn đi qua <code>irq_sim</code>, một IRQ domain bằng ' +
               'phần mềm), không phải lúc <code>gpiomon</code> kịp đọc; nên kể cả khi chương trình bận, thời điểm vẫn ' +
               'đúng. Khi <code>gpiomon</code> đang chạy, <code>gpioinfo</code> cho thấy chân thuộc về nó ' +
               '(<code>consumer="gpiomon"</code>, <code>edges=both</code>). <code>kill</code> nó, và chân <b>tự được ' +
               'trả lại</b>: không còn consumer, không còn cờ sự kiện. Không có bước "unexport" nào để quên.' },

          { t: 'p', x:
            'Cuối cùng, chính cơ chế chủ sở hữu từ phía output. <code>gpioset</code> không có <code>-t</code> giữ chân ' +
            'cho tới khi bị dừng; chạy nó nền, rồi thử một <code>gpioset</code> thứ hai trên cùng chân:' },

          { t: 'code', where: 'qemu', code:
            'gpioset led=1 &\n' +
            'gpioinfo led\n' +
            'cat $S/sim_gpio1/value\n' +
            'gpioset led=0\n' +
            'kill $!\n' +
            'cat $S/sim_gpio1/value\n' +
            'echo 1 > /config/gpio-sim/board/live' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpioset led=1 &\n' +
            '~ # gpioinfo led\n' +
            'gpiochip1 1\t"led"           \toutput consumer="gpioset"\n' +
            '~ # cat $S/sim_gpio1/value\n' +
            '1\n' +
            '~ # gpioset led=0\n' +
            'gpioset: unable to request lines on chip \'/dev/gpiochip1\': Device or resource busy\n' +
            '~ # kill $!\n' +
            '~ # cat $S/sim_gpio1/value\n' +
            '0\n' +
            '~ # echo 1 > /config/gpio-sim/board/live\n' +
            'sh: write error: Operation not permitted' },

          { t: 'p', x:
            'Ba điều. <code>sim_gpio1/value</code> = <code>1</code>: file <code>value</code> của gpio-sim cho bạn thấy ' +
            'mức mà <b>phía consumer</b> đang đẩy ra — như một chiếc vôn kế gắn vào chân LED. <code>gpioset</code> thứ ' +
            'hai nhận <code>EBUSY</code>: hai chương trình không thể cùng điều khiển một chân mà không biết nhau, đúng ' +
            'hàng thứ hai trong bảng so sánh với sysfs. Sau <code>kill</code>, <code>value</code> về <code>0</code> — ' +
            'gpio-sim trả chân về trạng thái kéo xuống khi không ai giữ (khác PL061 ở bước 3, nơi mức còn nguyên: đúng ' +
            'điều <code>gpioset --help</code> cảnh báo). Dòng cuối là configfs khoá cấu hình: ghi <code>1</code> vào ' +
            '<code>live</code> khi chip đã sống bị từ chối <code>EPERM</code> (<code>gpio-sim.c:1057–1058</code>). ' +
            'Tắt máy ảo; bước 5 dựng lại chip này từ đầu.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Viết chương trình C chờ nút bấm bằng libgpiod',
        blocks: [
          { t: 'p', x:
            'Công cụ dòng lệnh tiện để thử, nhưng sản phẩm thật dùng thư viện. Chương trình dưới đây xin hai chân trong ' +
            'một yêu cầu — chân 0 là input phát hiện cả hai sườn, chân 1 là output ban đầu mức 0 — rồi chờ bốn sự kiện, ' +
            'mỗi sự kiện chép trạng thái nút sang LED. Đây là "hello world" của GPIO trên mọi board Linux.' },

          { t: 'code', where: 'file', name: '~/bai57/app/button.c', lang: 'c', code: 
            '/* button.c - line 0 is a button (input, both edges), line 1 is an LED.\n' +
            ' * Every edge on the button is printed and copied to the LED. */\n' +
            '#include <gpiod.h>\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '\n' +
            'int main(int argc, char **argv)\n' +
            '{\n' +
            '\tunsigned int button = 0, led = 1;\n' +
            '\tint want = argc > 2 ? atoi(argv[2]) : 4;\n' +
            '\n' +
            '\tif (argc < 2) {\n' +
            '\t\tfprintf(stderr, "usage: %s /dev/gpiochipN [events]\\n", argv[0]);\n' +
            '\t\treturn 1;\n' +
            '\t}\n' +
            '\tstruct gpiod_chip *chip = gpiod_chip_open(argv[1]);\n' +
            '\tif (!chip) {\n' +
            '\t\tperror("gpiod_chip_open");\n' +
            '\t\treturn 1;\n' +
            '\t}\n' +
            '\n' +
            '\tstruct gpiod_line_settings *in = gpiod_line_settings_new();\n' +
            '\tgpiod_line_settings_set_direction(in, GPIOD_LINE_DIRECTION_INPUT);\n' +
            '\tgpiod_line_settings_set_edge_detection(in, GPIOD_LINE_EDGE_BOTH);\n' +
            '\n' +
            '\tstruct gpiod_line_settings *out = gpiod_line_settings_new();\n' +
            '\tgpiod_line_settings_set_direction(out, GPIOD_LINE_DIRECTION_OUTPUT);\n' +
            '\tgpiod_line_settings_set_output_value(out, GPIOD_LINE_VALUE_INACTIVE);\n' +
            '\n' +
            '\tstruct gpiod_line_config *cfg = gpiod_line_config_new();\n' +
            '\tgpiod_line_config_add_line_settings(cfg, &button, 1, in);\n' +
            '\tgpiod_line_config_add_line_settings(cfg, &led, 1, out);\n' +
            '\n' +
            '\tstruct gpiod_request_config *rc = gpiod_request_config_new();\n' +
            '\tgpiod_request_config_set_consumer(rc, "button-demo");\n' +
            '\n' +
            '\tstruct gpiod_line_request *req = gpiod_chip_request_lines(chip, rc, cfg);\n' +
            '\tif (!req) {\n' +
            '\t\tperror("gpiod_chip_request_lines");\n' +
            '\t\treturn 1;\n' +
            '\t}\n' +
            '\tprintf("waiting for %d edges on line %u\\n", want, button);\n' +
            '\tfflush(stdout);\n' +
            '\n' +
            '\tstruct gpiod_edge_event_buffer *buf = gpiod_edge_event_buffer_new(1);\n' +
            '\tfor (int i = 0; i < want; i++) {\n' +
            '\t\tgpiod_line_request_read_edge_events(req, buf, 1);   /* blocks */\n' +
            '\t\tstruct gpiod_edge_event *ev = gpiod_edge_event_buffer_get_event(buf, 0);\n' +
            '\t\tint rising = gpiod_edge_event_get_event_type(ev) ==\n' +
            '\t\t\t     GPIOD_EDGE_EVENT_RISING_EDGE;\n' +
            '\n' +
            '\t\tgpiod_line_request_set_value(req, led, rising ? GPIOD_LINE_VALUE_ACTIVE\n' +
            '\t\t\t\t\t\t\t      : GPIOD_LINE_VALUE_INACTIVE);\n' +
            '\t\tprintf("#%d %s at %llu ns -> led %d\\n", i + 1,\n' +
            '\t\t       rising ? "rising " : "falling",\n' +
            '\t\t       (unsigned long long)gpiod_edge_event_get_timestamp_ns(ev), rising);\n' +
            '\t\tfflush(stdout);\n' +
            '\t}\n' +
            '\n' +
            '\tgpiod_line_request_release(req);   /* the kernel frees both lines here */\n' +
            '\tgpiod_chip_close(chip);\n' +
            '\treturn 0;\n' +
            '}' },

          { t: 'table',
            head: ['Đối tượng libgpiod v2', 'Vai trò', 'Tương ứng trong kernel'],
            rows: [
              ['<code>gpiod_chip</code>', 'Một chip đã mở — thực chất là fd của <code>/dev/gpiochipN</code>', 'một <code>gpio_device</code>'],
              ['<code>gpiod_line_settings</code>', 'Một bộ cấu hình: hướng, sườn, bias, giá trị ban đầu…', 'cờ <code>GPIO_V2_LINE_FLAG_*</code>'],
              ['<code>gpiod_line_config</code>', 'Ánh xạ "những offset này dùng bộ cấu hình kia"', '<code>struct gpio_v2_line_config</code>'],
              ['<code>gpiod_request_config</code>', 'Tên consumer, kích thước hàng đợi sự kiện', 'hai trường của <code>gpio_v2_line_request</code>'],
              ['<code>gpiod_line_request</code>', 'Kết quả: một nhóm chân <b>thuộc về bạn</b>, là một fd mới', 'fd trả về trong <code>gpio_v2_line_request.fd</code>'],
              ['<code>gpiod_edge_event_buffer</code>', 'Bộ đệm để đọc sự kiện ra khỏi fd đó', '<code>struct gpio_v2_line_event</code>']
            ] },

          { t: 'p', x:
            'Thứ tự trong <code>main</code> đi đúng bảng này từ trên xuống. Lời gọi quan trọng là ' +
            '<code>gpiod_chip_request_lines</code>: một <code>ioctl</code> <code>GPIO_V2_GET_LINE_IOCTL</code> xin ' +
            '<b>cả hai</b> chân cùng lúc, nguyên tử — hoặc được cả hai, hoặc không được chân nào. ' +
            '<code>gpiod_line_request_read_edge_events</code> <b>chặn</b> (<code>read()</code> trên fd yêu cầu) cho tới ' +
            'khi kernel có sự kiện, nên chương trình không tốn CPU trong lúc chờ — khác hẳn vòng lặp ' +
            '<code>while (1) read value</code>. Biên dịch chéo, liên kết tĩnh với <code>libgpiod.a</code> vừa build:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'mkdir -p app   # then save button.c into app/\n' +
            'aarch64-linux-gnu-gcc -O2 -Wall -static -Ilibgpiod-2.2.5/include -o app/button app/button.c build-gpiod/lib/.libs/libgpiod.a\n' +
            'echo "rc=$?"\n' +
            'ls -l app/button' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 745752 Sep 30 15:32 app/button' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc … -Ilibgpiod-2.2.5/include … build-gpiod/lib/.libs/libgpiod.a',
            rows: [
              ['<code>-Ilibgpiod-2.2.5/include</code>', 'Tìm <code>gpiod.h</code> trong thư mục nguồn của libgpiod.', 'Thiếu cờ này: <code>fatal error: gpiod.h: No such file or directory</code>'],
              ['<code>-static</code>', 'Liên kết tĩnh cả glibc, như <code>rdtest</code> ở Bài 52.', 'Initramfs không có <code>/lib/ld-linux-aarch64.so.1</code>'],
              ['<code>build-gpiod/lib/.libs/libgpiod.a</code>', 'Thư viện tĩnh, đưa thẳng đường dẫn thay vì <code>-L … -lgpiod</code>.', '<code>.libs/</code> là nơi <code>libtool</code> để thư viện thật; thiếu nó: <code>undefined reference to `gpiod_chip_open\'</code>'],
              ['<code>-Wall</code>', 'Bật cảnh báo thường gặp.', '0 cảnh báo']
            ] },

          { t: 'p', x:
            '<code>rc=0</code>, không cảnh báo, <b>745 752 byte</b> (chưa strip). Hai lỗi trong cột thứ ba là thứ bạn ' +
            'nhận nếu quên từng cờ — người viết bài đã chạy thử cả hai, xem bảng Lỗi thường gặp. Thêm chương trình vào ' +
            'initramfs và boot lại:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-strip -o initramfs/bin/button app/button\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Dựng lại bảng mạch giả của bước 4 (bảy lệnh, gộp <code>mkdir -p</code>), rồi chạy <code>button</code> nền ' +
            'và xem nó giữ những chân nào:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/dev-sync-probe.ko\n' +
            'insmod /lib/modules/gpio-sim.ko\n' +
            'mount -t configfs none /config\n' +
            'mkdir -p /config/gpio-sim/board/bank0/line0 /config/gpio-sim/board/bank0/line1\n' +
            'echo 8 > /config/gpio-sim/board/bank0/num_lines\n' +
            'echo sim-board > /config/gpio-sim/board/bank0/label\n' +
            'echo button > /config/gpio-sim/board/bank0/line0/name\n' +
            'echo led > /config/gpio-sim/board/bank0/line1/name\n' +
            'echo 1 > /config/gpio-sim/board/live\n' +
            'S=/sys/devices/platform/gpio-sim.0/gpiochip1\n' +
            'button /dev/gpiochip1 4 &\n' +
            'gpioinfo -c gpiochip1 0 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # button /dev/gpiochip1 4 &\n' +
            '~ # waiting for 4 edges on line 0\n' +
            'gpioinfo -c gpiochip1 0 1\n' +
            'gpiochip1 0\t"button"        \tinput edges=both consumer="button-demo"\n' +
            'gpiochip1 1\t"led"           \toutput consumer="button-demo"' },

          { t: 'p', x:
            'Hai chân, một chủ: <code>consumer="button-demo"</code> — chuỗi truyền vào ' +
            '<code>gpiod_request_config_set_consumer</code>. Chân 0 <code>input edges=both</code>, chân 1 ' +
            '<code>output</code>: đúng hai bộ settings trong mã. Giờ bấm, đọc LED, nhả, đọc LED, rồi bấm nhả thêm một ' +
            'lần:' },

          { t: 'code', where: 'qemu', code:
            'echo pull-up > $S/sim_gpio0/pull\n' +
            'cat $S/sim_gpio1/value\n' +
            'echo pull-down > $S/sim_gpio0/pull\n' +
            'cat $S/sim_gpio1/value\n' +
            'echo pull-up > $S/sim_gpio0/pull\n' +
            'echo pull-down > $S/sim_gpio0/pull\n' +
            'gpioinfo -c gpiochip1 0 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo pull-up > $S/sim_gpio0/pull\n' +
            '~ # #1 rising  at 12645632832 ns -> led 1\n' +
            'cat $S/sim_gpio1/value\n' +
            '1\n' +
            '~ # echo pull-down > $S/sim_gpio0/pull\n' +
            '~ # #2 falling at 14346927072 ns -> led 0\n' +
            'cat $S/sim_gpio1/value\n' +
            '0\n' +
            '~ # echo pull-up > $S/sim_gpio0/pull\n' +
            '~ # #3 rising  at 16050131472 ns -> led 1\n' +
            'echo pull-down > $S/sim_gpio0/pull\n' +
            '#4 falling at 17151408880 ns -> led 0\n' +
            '~ # gpioinfo -c gpiochip1 0 1\n' +
            'gpiochip1 0\t"button"        \tinput\n' +
            'gpiochip1 1\t"led"           \toutput',
            notes: ['Số nano giây là đồng hồ monotonic kể từ lúc boot, sẽ khác trên máy bạn. Dòng của <code>button</code> in chen vào dấu nhắc vì nó chạy nền.'] },

          { t: 'cal', kind: 'why', title: 'Bốn sườn, bốn lần LED đổi, rồi chân tự được trả',
            x: 'Mỗi lần kéo mức, <code>button</code> tỉnh dậy từ <code>read()</code>, in một dòng và đặt LED: ' +
               '<code>rising → led 1</code>, <code>falling → led 0</code>. Hai dòng <code>cat sim_gpio1/value</code> là ' +
               'bằng chứng độc lập từ phía "phần cứng": LED thật sự là <code>1</code> rồi <code>0</code>, không chỉ do ' +
               'chương trình tự nói. Dấu thời gian tăng dần: sự kiện 1 và 2 cách nhau <b>1,70 s</b>, đúng nhịp gõ lệnh. ' +
               'Sau sự kiện thứ 4, vòng lặp kết thúc, <code>gpiod_line_request_release</code> đóng fd yêu cầu — và ' +
               '<code>gpioinfo</code> cuối cùng không còn <code>consumer</code> nào. Nếu chương trình bị ' +
               '<code>kill -9</code> giữa chừng, kết quả cũng thế: kernel đóng fd thay nó.' },

          { t: 'p', x:
            'Hai trường hợp hỏng. Chạy <code>button</code> trên PL061 (<code>gpiochip0</code>): chân 0 ở đó hợp lệ và ' +
            'rảnh, nên yêu cầu thành công — nhưng không có gì kéo mức chân đó, chương trình chờ mãi. Và trên một chip ' +
            'không tồn tại:' },

          { t: 'code', where: 'qemu', code:
            'timeout 2 button /dev/gpiochip0; echo "rc=$?"\n' +
            'button /dev/gpiochip7; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # timeout 2 button /dev/gpiochip0; echo "rc=$?"\n' +
            'waiting for 4 edges on line 0\n' +
            'Terminated\n' +
            'rc=143\n' +
            '~ # button /dev/gpiochip7; echo "rc=$?"\n' +
            'gpiod_chip_open: No such file or directory\n' +
            'rc=1' },

          { t: 'p', x:
            '<code>rc=143</code> = 128 + 15: <code>timeout</code> gửi <code>SIGTERM</code> sau 2 giây vì không có sự ' +
            'kiện nào (Bài 9 giải thích con số này). Lỗi thứ hai là <code>ENOENT</code> từ <code>open()</code>, in qua ' +
            '<code>perror</code>. Dọn dẹp theo thứ tự ngược với lúc dựng — tắt chip, <code>rmdir</code> từ trong ra ' +
            'ngoài, gỡ module:' },

          { t: 'code', where: 'qemu', code:
            'echo 0 > /config/gpio-sim/board/live\n' +
            'gpiodetect\n' +
            'rmdir /config/gpio-sim/board/bank0/line0 /config/gpio-sim/board/bank0/line1\n' +
            'rmdir /config/gpio-sim/board/bank0 /config/gpio-sim/board\n' +
            'rmmod gpio-sim\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo 0 > /config/gpio-sim/board/live\n' +
            '~ # gpiodetect\n' +
            'gpiochip0 [9030000.pl061] (8 lines)\n' +
            '~ # rmdir /config/gpio-sim/board/bank0/line0 /config/gpio-sim/board/bank0/line1\n' +
            '~ # rmdir /config/gpio-sim/board/bank0 /config/gpio-sim/board\n' +
            '~ # rmmod gpio-sim\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Not tainted\n' +
            'dev_sync_probe         12288  0 ' },

          { t: 'p', x:
            '<code>echo 0 &gt; live</code> xoá <code>gpiochip1</code>, <code>gpiodetect</code> chỉ còn PL061. ' +
            '<code>rmdir</code> phải đi từ lá lên gốc: configfs từ chối xoá một thư mục còn thư mục con. ' +
            '<code>rmmod gpio-sim</code> thành công, chỉ còn <code>dev_sync_probe</code>, không ai dùng (<code>0</code>). ' +
            '<code>Not tainted</code>: cả hai module này từ cây kernel, khác <code>vgchip</code> ở bước sau.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Viết lại vgpio thành một gpio_chip, và vấp đúng câu datasheet đã cảnh báo',
        blocks: [
          { t: 'p', x:
            'Giờ bạn viết một provider thật cho chính PL061, chỉ từ những gì DDI 0190B nói. So với 270 dòng của ' +
            '<code>vgpio.c</code>, driver này chỉ còn 143 dòng vì nó <b>bỏ</b> mọi thứ gpiolib đã làm hộ: không sysfs ' +
            'tự chế, không misc device, không <code>ioctl</code>, không mảng LED — chỉ năm hàm trả lời năm câu hỏi của ' +
            '<code>struct gpio_chip</code>. Mỗi hằng số và mỗi quy tắc bit có chú thích trỏ về mục trong datasheet.' },

          { t: 'code', where: 'file', name: '~/bai57/vgchip/vgchip.c', lang: 'c', code: 
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * vgchip - the PL061 registered as a gpio_chip instead of a private sysfs file.\n' +
            ' * Every register offset and bit rule below comes from ARM DDI 0190B, chapter 3.\n' +
            ' */\n' +
            '#include <linux/bits.h>\n' +
            '#include <linux/gpio/driver.h>\n' +
            '#include <linux/io.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/of.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/spinlock.h>\n' +
            '\n' +
            '#define GPIODIR    0x400        /* Table 3-3: 1 = output, reset 0x00 = all input */\n' +
            '#define GPIOIE     0x410        /* Table 3-7: 0 = interrupt masked */\n' +
            '#define PERIPHID0  0xFE0        /* Table 3-12..15: reads 0x61 0x10 0x04 0x00 */\n' +
            '#define NR_LINES   8            /* section 2.3.3: eight lines */\n' +
            '\n' +
            'struct vgchip {\n' +
            '\tvoid __iomem *base;\n' +
            '\traw_spinlock_t lock;    /* GPIODIR is read-modify-write */\n' +
            '\tstruct gpio_chip gc;\n' +
            '};\n' +
            '\n' +
            '/* Section 2.3.3: address bits [9:2] mask GPIODATA, so line n lives at 1 << (n + 2). */\n' +
            'static void __iomem *data_reg(struct vgchip *vc, unsigned int line)\n' +
            '{\n' +
            '\treturn vc->base + (BIT(line) << 2);\n' +
            '}\n' +
            '\n' +
            'static int vc_get_direction(struct gpio_chip *gc, unsigned int line)\n' +
            '{\n' +
            '\tstruct vgchip *vc = gpiochip_get_data(gc);\n' +
            '\n' +
            '\treturn readl(vc->base + GPIODIR) & BIT(line) ? GPIO_LINE_DIRECTION_OUT\n' +
            '\t\t\t\t\t\t       : GPIO_LINE_DIRECTION_IN;\n' +
            '}\n' +
            '\n' +
            'static int vc_get(struct gpio_chip *gc, unsigned int line)\n' +
            '{\n' +
            '\tstruct vgchip *vc = gpiochip_get_data(gc);\n' +
            '\n' +
            '\treturn !!readl(data_reg(vc, line));     /* other bits read as 0 */\n' +
            '}\n' +
            '\n' +
            'static int vc_set(struct gpio_chip *gc, unsigned int line, int value)\n' +
            '{\n' +
            '\tstruct vgchip *vc = gpiochip_get_data(gc);\n' +
            '\n' +
            '\twritel(value ? BIT(line) : 0, data_reg(vc, line));  /* touches one bit only */\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static int vc_set_dir(struct gpio_chip *gc, unsigned int line, bool out)\n' +
            '{\n' +
            '\tstruct vgchip *vc = gpiochip_get_data(gc);\n' +
            '\tunsigned long flags;\n' +
            '\tu32 dir;\n' +
            '\n' +
            '\traw_spin_lock_irqsave(&vc->lock, flags);\n' +
            '\tdir = readl(vc->base + GPIODIR);\n' +
            '\tdir = out ? dir | BIT(line) : dir & ~BIT(line);\n' +
            '\twritel(dir, vc->base + GPIODIR);\n' +
            '\traw_spin_unlock_irqrestore(&vc->lock, flags);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static int vc_dir_in(struct gpio_chip *gc, unsigned int line)\n' +
            '{\n' +
            '\treturn vc_set_dir(gc, line, false);\n' +
            '}\n' +
            '\n' +
            'static int vc_dir_out(struct gpio_chip *gc, unsigned int line, int value)\n' +
            '{\n' +
            '\tvc_set(gc, line, value);        /* ignored while the pin is still an input */\n' +
            '\tvc_set_dir(gc, line, true);\n' +
            '#ifndef VALUE_BEFORE_DIR_ONLY\n' +
            '\tvc_set(gc, line, value);        /* section 2.3.3: now GPIODATA accepts it */\n' +
            '#endif\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static int vc_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '\tstruct device *dev = &pdev->dev;\n' +
            '\tstruct vgchip *vc;\n' +
            '\tu32 id;\n' +
            '\tint ret;\n' +
            '\n' +
            '\tvc = devm_kzalloc(dev, sizeof(*vc), GFP_KERNEL);\n' +
            '\tif (!vc)\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tvc->base = devm_platform_ioremap_resource(pdev, 0);\n' +
            '\tif (IS_ERR(vc->base))\n' +
            '\t\treturn PTR_ERR(vc->base);\n' +
            '\n' +
            '\tid = readl(vc->base + PERIPHID0) |\n' +
            '\t     readl(vc->base + PERIPHID0 + 4) << 8 |\n' +
            '\t     readl(vc->base + PERIPHID0 + 8) << 16;\n' +
            '\tif ((id & 0xfff) != 0x061)\n' +
            '\t\treturn dev_err_probe(dev, -ENODEV, "part number 0x%03x is not PL061\\n",\n' +
            '\t\t\t\t     id & 0xfff);\n' +
            '\n' +
            '\twritel(0, vc->base + GPIOIE);   /* this driver has no irq_chip */\n' +
            '\traw_spin_lock_init(&vc->lock);\n' +
            '\n' +
            '\tvc->gc.label = "vgchip";\n' +
            '\tvc->gc.parent = dev;\n' +
            '\tvc->gc.owner = THIS_MODULE;\n' +
            '\tvc->gc.base = -1;               /* let gpiolib pick a global number */\n' +
            '\tvc->gc.ngpio = NR_LINES;\n' +
            '\tvc->gc.get_direction = vc_get_direction;\n' +
            '\tvc->gc.direction_input = vc_dir_in;\n' +
            '\tvc->gc.direction_output = vc_dir_out;\n' +
            '\tvc->gc.get = vc_get;\n' +
            '\tvc->gc.set = vc_set;\n' +
            '\n' +
            '\tret = devm_gpiochip_add_data(dev, &vc->gc, vc);\n' +
            '\tif (ret)\n' +
            '\t\treturn dev_err_probe(dev, ret, "gpiochip_add\\n");\n' +
            '\n' +
            '\tdev_info(dev, "PL061 rev %u, %u lines, global base %d\\n",\n' +
            '\t\t (id >> 20) & 0xf, vc->gc.ngpio, vc->gc.base);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id vc_of_match[] = {\n' +
            '\t{ .compatible = "learn,vgchip" },\n' +
            '\t{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, vc_of_match);\n' +
            '\n' +
            'static struct platform_driver vc_driver = {\n' +
            '\t.probe = vc_probe,\n' +
            '\t.driver = {\n' +
            '\t\t.name = "vgchip",\n' +
            '\t\t.of_match_table = vc_of_match,\n' +
            '\t},\n' +
            '};\n' +
            'module_platform_driver(vc_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("PL061 as a gpio_chip, written from the datasheet");' },

          { t: 'p', x:
            'Đối chiếu với các mục đã đọc. <code>data_reg()</code> là mục 2.3.3: chân <i>n</i> sống ở offset ' +
            '<code>BIT(n) &lt;&lt; 2</code>, nên <code>vc_get</code> đọc về đúng một bit (bảy bit kia đọc ra 0) và ' +
            '<code>vc_set</code> ghi đúng một bit — không đọc-sửa-ghi, không khoá. <code>GPIODIR</code> thì không có ' +
            'mặt nạ địa chỉ, nên <code>vc_set_dir</code> buộc phải đọc-sửa-ghi, và cần <code>raw_spinlock</code> (Bài ' +
            '56) để hai CPU đổi hướng hai chân khác nhau không ghi đè lên nhau. <code>vc_probe</code> kiểm tra part ' +
            'number <code>0x061</code> (mục 3.3.11) trước khi tin rằng đây là PL061, và tắt <code>GPIOIE</code> vì ' +
            'driver này không đăng ký <code>irq_chip</code>. Hàm đáng chú ý là <code>vc_dir_out</code>: nó ghi giá trị, ' +
            'đổi hướng, rồi ghi giá trị <b>lần nữa</b> — trừ khi build với <code>-DVALUE_BEFORE_DIR_ONLY</code>.' },

          { t: 'p', x:
            'Makefile là của <code>vgpio</code>, đổi tên. Build cả bản đúng lẫn bản thiếu lần ghi thứ hai (thư mục ' +
            '<code>v/onewrite</code>), và một cây Device Tree giống <code>vgpio.dts</code> của Bài 56 nhưng với ' +
            '<code>compatible = "learn,vgchip"</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai57\n' +
            'mkdir -p vgchip   # then save vgchip.c into vgchip/\n' +
            'sed \'s/vgpio/vgchip/\' ~/bai56/vgpio/Makefile > vgchip/Makefile\n' +
            'cd vgchip && time make; cd ..\n' +
            'aarch64-linux-gnu-nm -u vgchip/vgchip.ko\n' +
            'mkdir -p v/onewrite && cp vgchip/vgchip.c vgchip/Makefile v/onewrite/\n' +
            'make -C v/onewrite KCFLAGS=-DVALUE_BEFORE_DIR_ONLY 2>&1 | grep -E \'warning|error|LD\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  vgchip.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  vgchip.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  vgchip.ko\n' +
            '…\n' +
            'real\t0m1.049s\n' +
            '                 U dev_err_probe\n' +
            '                 U _dev_info\n' +
            '                 U devm_gpiochip_add_data_with_key\n' +
            '                 U devm_kmalloc\n' +
            '                 U devm_platform_ioremap_resource\n' +
            '                 U gpiochip_get_data\n' +
            '                 U __platform_driver_register\n' +
            '                 U platform_driver_unregister\n' +
            '                 U _raw_spin_lock_irqsave\n' +
            '                 U _raw_spin_unlock_irqrestore\n' +
            '  LD [M]  vgchip.ko',
            notes: ['Dấu <code>…</code> thay cho các dòng <code>make[1]: Entering/Leaving directory</code>.'] },

          { t: 'p', x:
            'Không cảnh báo nào ở cả hai bản. <code>nm -u</code> liệt kê <b>10</b> ký hiệu kernel mà module cần — so ' +
            'với 22 của <code>vgpio.ko</code>: không còn <code>misc_register</code>, <code>sysfs_emit</code>, ' +
            '<code>devm_request_threaded_irq</code>. Thay vào là hai hàm gpiolib: ' +
            '<code>devm_gpiochip_add_data_with_key</code> (macro <code>devm_gpiochip_add_data</code> mở ra thành nó) ' +
            'và <code>gpiochip_get_data</code>, cả hai là <code>EXPORT_SYMBOL_GPL</code> — lý do ' +
            '<code>MODULE_LICENSE("GPL")</code> không phải tuỳ chọn. Dựng cây và initramfs:' },

          { t: 'code', where: 'wsl', code:
            'cat > vgchip.dts <<\'EOF\'\n' +
            '/include/ "../bai56/virt.dts"\n' +
            '\n' +
            '/ {\n' +
            '\t/delete-node/ gpio-keys;\n' +
            '\n' +
            '\tpl061@9030000 {\n' +
            '\t\tcompatible = "learn,vgchip";\n' +
            '\t};\n' +
            '};\n' +
            'EOF\n' +
            'dtc -q -I dts -O dtb -o vgchip.dtb vgchip.dts; echo "dtc rc=$?"\n' +
            'cp vgchip/vgchip.ko initramfs/lib/modules/\n' +
            'cp v/onewrite/vgchip.ko initramfs/lib/modules/vgchip_onewrite.ko\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/vgchip*.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb vgchip.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            '<code>dtc rc=0</code>. Đường dẫn <code>/include/ "../bai56/virt.dts"</code> tính từ thư mục chứa ' +
            '<code>vgchip.dts</code> (Bài 56 đã vấp điều này). <code>virt.dts</code> là bản dump có <code>-smp 2</code> ' +
            '— cây phải khớp số CPU của lệnh boot. Trong máy ảo, trước và sau khi nạp driver:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'gpiodetect\n' +
            'insmod /lib/modules/vgchip.ko\n' +
            'gpiodetect\n' +
            'gpioinfo -c gpiochip0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpiodetect\n' +
            '~ # insmod /lib/modules/vgchip.ko\n' +
            '[    5.564697] vgchip: loading out-of-tree module taints kernel.\n' +
            '[    5.571589] vgchip 9030000.pl061: PL061 rev 0, 8 lines, global base 512\n' +
            '~ # gpiodetect\n' +
            'gpiochip0 [vgchip] (8 lines)\n' +
            '~ # gpioinfo -c gpiochip0\n' +
            'gpiochip0 - 8 lines:\n' +
            '\tline   0:\tunnamed         \tinput\n' +
            '\tline   1:\tunnamed         \tinput\n' +
            '\tline   2:\tunnamed         \tinput\n' +
            '\tline   3:\tunnamed         \tinput\n' +
            '\tline   4:\tunnamed         \tinput\n' +
            '\tline   5:\tunnamed         \tinput\n' +
            '\tline   6:\tunnamed         \tinput\n' +
            '\tline   7:\tunnamed         \tinput' },

          { t: 'cal', kind: 'why', title: '143 dòng C, và mọi công cụ của bước 3–5 dùng được ngay',
            x: 'Trước <code>insmod</code>, <code>gpiodetect</code> không in gì: cây này không còn driver GPIO nào. Sau ' +
               'đó có <code>gpiochip0 [vgchip]</code> — chữ trong ngoặc là <code>gc.label</code>, <b>8</b> là ' +
               '<code>gc.ngpio</code>, <code>global base 512</code> là số gpiolib chọn vì <code>gc.base = -1</code>. ' +
               '<code>rev 0</code> là trường Revision <code>[23:20]</code> bạn tự tách ở bước 2. Bạn không viết dòng ' +
               'nào cho <code>/dev/gpiochip0</code>, cho <code>gpioinfo</code>, cho cơ chế chủ sở hữu — gpiolib cho ' +
               'không, chỉ vì driver điền đúng <code>struct gpio_chip</code>. Chân 3 không còn consumer nào: ' +
               '<code>gpio-keys</code> đã bị xoá khỏi cây. Dòng <code>taints kernel</code> là module ngoài cây, như Bài 50.' },

          { t: 'p', x:
            'Bật hai "LED" chân 0 và 2 bằng <code>gpioset</code>, rồi đọc thanh ghi trực tiếp để xem driver đã ghi ' +
            'gì:' },

          { t: 'code', where: 'qemu', code:
            'gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            'devmem 0x09030400 32\n' +
            'devmem 0x090303fc 32\n' +
            'gpioget -c gpiochip0 -a 0 1 2\n' +
            'gpioget -c gpiochip0 1\n' +
            'devmem 0x09030400 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            '~ # devmem 0x09030400 32\n' +
            '0x00000005\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000005\n' +
            '~ # gpioget -c gpiochip0 -a 0 1 2\n' +
            '"0"=active "1"=inactive "2"=active\n' +
            '~ # gpioget -c gpiochip0 1\n' +
            '"1"=inactive\n' +
            '~ # devmem 0x09030400 32\n' +
            '0x00000005' },

          { t: 'p', x:
            '<code>GPIODIR</code> = <code>0x05</code> = <code>0b101</code>: <code>vc_dir_out</code> đã đặt bit 0 và bit ' +
            '2, bit 1 không đụng — khoá và đọc-sửa-ghi làm đúng việc. <code>GPIODATA</code> = <code>0x05</code>: cả hai ' +
            'chân lên 1. <code>gpioget -a</code> (<i>as-is</i>) đọc mà không đổi hướng, nên đọc được chân output qua ' +
            '<code>vc_get</code>: <code>active inactive active</code>. <code>gpioget</code> không có <code>-a</code> ' +
            'thì xin chân làm <b>input</b> (<code>gpioget --help</code>: <i>"-a, --as-is leave the line direction ' +
            'unchanged, not forced to input"</i>) — ở đây là chân 1 vốn đã là input, nên <code>GPIODIR</code> vẫn ' +
            '<code>0x05</code>. Gọi nó không <code>-a</code> trên chân 0 hay 2 thì <code>vc_dir_in</code> chạy và "LED" ' +
            'thành input: khi viết bài, một <code>gpioget -c gpiochip0 0 2</code> như thế đưa <code>GPIODIR</code> từ ' +
            '<code>0x05</code> về <code>0x00</code>. Muốn <b>xem</b> một chân output, luôn thêm <code>-a</code>.' },

          { t: 'p', x:
            'Thử sự kiện trên chân 3, rồi gỡ driver:' },

          { t: 'code', where: 'qemu', code:
            'gpiomon -c gpiochip0 3\n' +
            'rmmod vgchip\n' +
            'gpiodetect' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # gpiomon -c gpiochip0 3\n' +
            'gpiomon: unable to request lines on chip /dev/gpiochip0: No such device or address\n' +
            '~ # rmmod vgchip\n' +
            '~ # gpiodetect\n' +
            '~ # ' },

          { t: 'cal', kind: 'info', title: 'ENXIO: chip không có irq_chip thì không có sự kiện',
            x: '<code>No such device or address</code> là <code>ENXIO</code>. Khi yêu cầu có cờ sườn, ' +
               '<code>gpiolib-cdev.c</code> gọi <code>gpiod_to_irq()</code> để lấy số IRQ của chân; ' +
               '<code>vgchip</code> không đăng ký <code>gc.irq</code> nào, nên hàm trả lỗi và cdev trả ' +
               '<code>-ENXIO</code> (<code>gpiolib-cdev.c:1059–1061</code>). Driver PL061 của kernel có — ' +
               '<code>gpio-pl061.c:348</code> điền <code>pl061->gc.irq</code> với một <code>irq_chip</code> dùng ' +
               '<code>GPIOIS</code>/<code>GPIOIBE</code>/<code>GPIOIEV</code>/<code>GPIOIE</code>/<code>GPIOIC</code>, ' +
               'tức toàn bộ phần ngắt bạn tự viết ở Bài 56. Thêm <code>gpio_irq_chip</code> vào <code>vgchip</code> ' +
               'là bài tập tốt cho ai muốn đi xa hơn. Sau <code>rmmod</code>, devres gỡ <code>gpiochip</code> và ' +
               '<code>gpiodetect</code> lại trống.' },

          { t: 'p', x:
            'Bây giờ bản thiếu lần ghi thứ hai. Tắt máy ảo, boot lại (để mọi thanh ghi về <code>0x00</code> như sau ' +
            'reset), nạp <code>vgchip_onewrite.ko</code> và làm y hệt:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/vgchip_onewrite.ko\n' +
            'gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            'devmem 0x09030400 32\n' +
            'devmem 0x090303fc 32\n' +
            'gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            'devmem 0x090303fc 32' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/vgchip_onewrite.ko\n' +
            '[    4.481399] vgchip: loading out-of-tree module taints kernel.\n' +
            '[    4.488524] vgchip 9030000.pl061: PL061 rev 0, 8 lines, global base 512\n' +
            '~ # gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            '~ # devmem 0x09030400 32\n' +
            '0x00000005\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000000\n' +
            '~ # gpioset -c gpiochip0 -t 0 0=1 2=1\n' +
            '~ # devmem 0x090303fc 32\n' +
            '0x00000005' },

          { t: 'cal', kind: 'danger', title: 'Lệnh thành công, hướng đúng, LED vẫn tắt — và lần thứ hai lại sáng',
            x: '<code>gpioset</code> không báo lỗi. <code>GPIODIR</code> = <code>0x05</code>, đúng. Nhưng ' +
               '<code>GPIODATA</code> = <code>0x00</code>: cả hai LED vẫn tắt. <code>vc_dir_out</code> đã ghi giá trị ' +
               '<b>trước</b> khi đổi hướng, lúc chân còn là input, và mục 2.3.3 nói rõ: <i>"Writing to the data register ' +
               'only affects the pins that are configured as outputs."</i> Lần ghi bị nuốt, y như bạn đã thấy bằng ' +
               '<code>devmem</code> ở bước 2. Chạy lại đúng lệnh đó, LED sáng (<code>0x05</code>) — vì lần này chân ' +
               '<b>đã</b> là output từ lần trước, nên ghi có tác dụng. Đây là loại lỗi tệ nhất: lần đầu sau khi boot ' +
               'thì sai, mọi lần sau đều đúng, nên thử tay thường không thấy, còn trên sản phẩm thì một chân reset ' +
               'không được kéo đúng lúc khởi động. Driver PL061 của kernel có đúng dòng ghi thứ hai kèm chú thích giải ' +
               'thích — người viết nó đã đọc câu này.' },

          { t: 'p', x:
            'Người viết bài chạy biến thể này trong bốn lần boot, kể cả <code>rmmod</code> rồi <code>insmod</code> lại ' +
            'trong cùng một lần boot sau khi chân đã về input: lần <code>gpioset</code> đầu tiên luôn cho ' +
            '<code>0x00</code>, lần thứ hai luôn đúng. Hai điều đó cùng chỉ về một nguyên nhân — hướng của chân tại ' +
            'thời điểm ghi, không phải giá trị ghi hay thời điểm boot.' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp và giữ lại gì',
            x: '<code>~/bai57</code> nặng khoảng <b>27 MB</b>, phần lớn là mã nguồn và bản build của libgpiod. ' +
               '<code>build-gpiod/</code> (sáu công cụ ARM64 + <code>libgpiod.a</code>) đáng giữ nếu bạn muốn dùng lại ' +
               'công cụ GPIO trong máy ảo về sau — dù build lại chỉ mất khoảng 8 giây. <code>vgchip/</code>, ' +
               '<code>v/</code>, <code>initramfs*</code> xoá tuỳ ý. Kernel ở <code>~/bai38</code> giờ có ' +
               '<code>CONFIG_GPIO_SIM=m</code> — cứ để nguyên, nó chỉ thêm tính năng. <code>~/bai56</code> không còn ' +
               'bài nào đọc tới.' }
        ] }
    ] },

    /* ============================================================
       8. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Chân đã là output, <code>gpioset</code> không báo lỗi, nhưng <code>GPIODATA</code> vẫn <code>0x00</code> — chạy lại thì đúng',
         'Driver ghi giá trị <b>trước</b> khi đổi hướng. PL061 bỏ qua lần ghi vào chân input (DDI 0190B mục 2.3.3). Gặp ở bước 6 với <code>vgchip_onewrite.ko</code>.',
         'Trong <code>direction_output</code>, ghi giá trị lần nữa <b>sau</b> khi đặt <code>GPIODIR</code>, như <code>gpio-pl061.c</code>. Đọc chương "Functional Overview" chứ không chỉ bảng thanh ghi.'],
        ['<code>gpioget: unable to request lines: Device or resource busy</code>',
         'Chân đã có chủ — một consumer trong kernel (chân 3 = <code>GPIO Key Poweroff</code>) hoặc một tiến trình khác đang giữ fd. Gặp ở bước 3 và 4.',
         '<code>gpioinfo</code> để xem <code>consumer=</code>. Dừng tiến trình đó, hoặc xoá node trong Device Tree đang xin chân.'],
        ['<code>gpiomon: unable to request lines on chip /dev/gpiochip0: No such device or address</code>',
         'Chip không có <code>irq_chip</code>: <code>gpiod_to_irq()</code> thất bại, cdev trả <code>-ENXIO</code>. Gặp ở bước 6 với <code>vgchip</code>.',
         'Dùng chip có hỗ trợ ngắt, hoặc thêm <code>gpio_irq_chip</code> vào driver.'],
        ['<code>ls: /sys/class/gpio: No such file or directory</code>',
         'Kernel không bật <code>CONFIG_GPIO_SYSFS</code> — đúng mặc định của <code>defconfig</code>, và giao diện này đã lỗi thời. Gặp ở bước 3.',
         'Dùng <code>/dev/gpiochipN</code> + libgpiod. Đừng bật <code>EXPERT</code> chỉ để lấy lại sysfs.'],
        ['<code>sh: write error: Operation not permitted</code> khi ghi vào <code>live</code>',
         'Ghi <code>1</code> vào chip đã sống (hoặc <code>0</code> vào chip đã tắt) — <code>gpio-sim.c:1057</code> trả <code>-EPERM</code>. Gặp ở bước 4.',
         '<code>cat live</code> trước. Muốn đổi cấu hình: <code>echo 0</code>, sửa, <code>echo 1</code>.'],
        ['<code>gpioset: unable to request lines on chip \'/dev/gpiochip1\': Device or resource busy</code>',
         'Một <code>gpioset</code> khác (chạy nền, không <code>-t</code>) vẫn đang giữ chân. Gặp ở bước 4.',
         '<code>kill</code> tiến trình trước, hoặc dùng <code>gpioset -t 0</code> nếu chỉ cần đặt một lần.'],
        ['<code>gpioinfo: cannot find GPIO chip character device \'gpiochip1\'</code>',
         'Đã <code>echo 0 &gt; live</code> (chip gpio-sim bị xoá) mà còn gọi tới nó. Gặp khi viết bài.',
         '<code>gpiodetect</code> để xem chip nào đang có; số <code>gpiochipN</code> được cấp lại mỗi lần chip xuất hiện.'],
        ['<code>fatal error: gpiod.h: No such file or directory</code>',
         'Biên dịch <code>button.c</code> không có <code>-Ilibgpiod-2.2.5/include</code>. Gặp ở bước 5.',
         'Thêm cờ <code>-I</code>. Gói <code>libgpiod-dev</code> của Ubuntu 20.04 là API v1, không dùng được cho mã v2.'],
        ['<code>undefined reference to `gpiod_chip_open\'</code>',
         'Có header nhưng không liên kết thư viện. Gặp ở bước 5.',
         'Thêm <code>build-gpiod/lib/.libs/libgpiod.a</code> vào cuối lệnh <code>gcc</code>.'],
        ['<code>gpiod_chip_open: No such file or directory</code>',
         '<code>button</code> mở một <code>/dev/gpiochipN</code> không tồn tại, hoặc chưa <code>mount -t devtmpfs</code>. Gặp ở bước 5.',
         '<code>ls /dev/gpiochip*</code>.'],
        ['<code>curl: (56) Received HTTP code 401 from proxy after CONNECT</code>',
         'Proxy của mạng công ty tạm thời từ chối (gặp khi viết bài trên máy B). <code>curl</code> để lại file không tồn tại, và mọi lệnh sau đó lỗi dây chuyền.',
         'Thử lại sau vài phút. Luôn <code>sha256sum -c</code> trước khi <code>tar xf</code>.'],
        ['<code>pdfinfo</code> cho tiêu đề khác (ví dụ <code>ARM Dual-Timer Module (SP804)</code>)',
         'Tải nhầm tài liệu — các mã <code>static/…</code> của ARM trông giống nhau. Gặp khi viết bài.',
         'Luôn kiểm tra <code>Title</code> trước khi đọc. Mã tài liệu PL061 là <b>DDI 0190</b>.']
      ] },

    /* ============================================================
       9. TÓM TẮT
       ============================================================ */
    { t: 'recap', items: [
      'Một TRM chia thành <b>Functional Overview</b> (cách khối hoạt động, quy tắc không nằm trong bảng) và <b>Programmer’s Model</b> (register map + từng bit). Người viết driver đọc <b>cả hai</b>; chương test và tín hiệu thì không. <code>pdftotext -layout</code> + <code>grep</code> biến 68 trang thành <b>2 542</b> dòng tìm được.',
      'Datasheet của khối IP chỉ cho <b>offset</b>; <b>địa chỉ gốc</b> nằm trong <code>reg</code> của Device Tree. Mỗi hàng của register map trả lời: offset, kiểu truy cập (<code>Read</code>/<code>Write</code>/<code>Read/write</code>), độ rộng, <b>reset value</b> — PL061 reset về toàn <code>0x00</code>: mọi chân input, mọi ngắt bị che.',
      'Bit field tách bằng <code>(giá_trị &gt;&gt; bit_thấp) &amp; mặt_nạ</code>: <code>0x00041061</code> → part <b><code>0x061</code></b>, designer <b><code>0x41</code></b>, revision 0, configuration 0.',
      'Datasheet có lỗi: Bảng 3-3 ghi "Bits cleared, pins output", lời văn và <b>phần cứng</b> nói input. Khi hai nguồn mâu thuẫn, hỏi nguồn thứ ba — <code>devmem</code> trên thiết bị, driver sẵn có.',
      '<code>GPIODATA</code> dùng bit 9..2 của <b>địa chỉ</b> làm mặt nạ: ghi <code>0xFB</code> vào <code>+0x098</code> ra <b><code>0x22</code></b>, đọc ở <code>+0x0C4</code> ra <b><code>0x31</code></b>. Và nó <b>bỏ qua</b> mọi lần ghi vào chân input — <code>vgchip_onewrite</code> mất đúng lần bật LED đầu tiên vì câu này.',
      '<b><code>struct gpio_chip</code></b> tách provider khỏi consumer: điền <code>ngpio</code>, <code>base = -1</code>, năm hàm <code>get_direction</code>/<code>direction_input</code>/<code>direction_output</code>/<code>get</code>/<code>set</code>, gọi <code>devm_gpiochip_add_data</code> — và có ngay <code>/dev/gpiochipN</code> (major <b>254</b>), <code>gpioinfo</code>, cơ chế chủ sở hữu. <code>vgchip.c</code>: 143 dòng, 10 ký hiệu kernel.',
      '<code>/sys/class/gpio</code> đã lỗi thời và <b>không có</b> trong <code>defconfig</code>: số toàn cục (bắt đầu từ <b>512</b>) thay đổi theo thứ tự probe, không có chủ sở hữu, không dấu thời gian sự kiện. Chardev + <b>libgpiod 2.x</b> gọi chân theo chip + offset hoặc <b>tên</b>, trả chân khi fd đóng, từ chối người thứ hai bằng <code>EBUSY</code>.',
      '<b><code>gpio-sim</code></b> (<code>CONFIG_GPIO_SIM=m</code>, kéo theo <code>IRQ_SIM=y</code> nên phải build lại <code>Image</code>, 32 s) tạo chip giả qua <b>configfs</b>: <code>mkdir</code> → điền → <code>echo 1 &gt; live</code>; "bấm nút" bằng <code>sim_gpioN/pull</code>. Đủ để thử <code>gpiomon</code> và một chương trình libgpiod chờ sườn.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'GPIO là một chân, một bit. Phần lớn cảm biến và chip ngoại vi thật lại nói chuyện qua <b>bus</b>: I2C với hai ' +
         'dây và địa chỉ 7 bit, SPI với bốn dây và tốc độ hàng chục MHz. <b>Bài 58 — Driver cho bus I2C và SPI</b> ' +
         'dùng lại đúng mô hình provider/consumer của bài này ở quy mô lớn hơn: bộ điều khiển bus là ' +
         '<i>adapter</i>, thiết bị trên bus là <i>client</i>, và driver của bạn không bao giờ chạm tới thanh ghi của ' +
         'adapter. Máy <code>virt</code> không có bus I2C nào (<code>No \'i2c-bus\' bus found</code>), nên bài sẽ dùng ' +
         '<code>i2c-stub</code> — họ hàng của <code>gpio-sim</code> — để giả một thiết bị I2C mà driver đọc bằng ' +
         '<code>i2c_smbus_*</code>, và máy <code>raspi3b</code> của QEMU, nơi có một bộ điều khiển I2C thật để gắn ' +
         'cảm biến vào.' }
  ],

  quiz: [
    { q: 'Bạn mở TRM 3 000 trang của một SoC mới để viết driver cho khối UART. Hai chương nào bạn phải đọc?',
      opts: [
        'Chương sơ đồ chân và chương đặc tính điện',
        'Chương mô tả hoạt động của khối (functional description) và chương thanh ghi (programmer’s model / register description)',
        'Chỉ chương thanh ghi — mọi thứ driver cần đều nằm trong bảng',
        'Chương kiểm thử tích hợp, vì nó liệt kê đủ mọi thanh ghi'
      ],
      a: 1,
      why: 'Bảng thanh ghi cho offset, bit và reset value, nhưng những quy tắc về <b>cách</b> dùng chúng thường chỉ nằm ở chương mô tả hoạt động. Với PL061, cả mặt nạ địa chỉ của <code>GPIODATA</code> lẫn câu "only affects the pins that are configured as outputs" đều ở chương 2, không ở chương 3 — bỏ qua chương 2 là viết ra đúng lỗi của <code>vgchip_onewrite</code>. Sơ đồ chân và đặc tính điện là việc của người vẽ mạch; thanh ghi kiểm thử dành cho nhà máy.' },

    { q: 'Datasheet của khối PL061 ghi <code>GPIODIR</code> ở offset <code>0x400</code>. Địa chỉ vật lý của <code>GPIODIR</code> trên một SoC cụ thể lấy từ đâu?',
      opts: [
        'Luôn là <code>0x400</code> — datasheet đã ghi',
        'Luôn là <code>0x09030400</code> — mọi board ARM đều giống QEMU <code>virt</code>',
        'Địa chỉ gốc trong <code>reg</code> của node PL061 trong Device Tree của board đó, cộng <code>0x400</code>',
        'Đọc từ <code>GPIOPeriphID</code>'
      ],
      a: 2,
      why: 'Mục 3.1 nói rõ: địa chỉ gốc "is not fixed, and can be different for any particular system implementation"; chỉ offset là cố định. Hãng làm SoC quyết định địa chỉ gốc và ghi nó vào Device Tree — <code>0x09030000</code> là lựa chọn của QEMU <code>virt</code>, không phải của ARM. Trong driver, bạn không cộng tay mà dùng <code>devm_platform_ioremap_resource</code> rồi <code>base + 0x400</code>. <code>PeriphID</code> cho biết khối là gì, không cho biết nó nằm đâu.' },

    { q: 'Bốn thanh ghi <code>PeriphID0..3</code> đọc ra <code>0x61</code>, <code>0x10</code>, <code>0x14</code>, <code>0x00</code>. Theo mục 3.3.11 (Revision ở bit 23:20), khối này là revision mấy?',
      opts: ['0', '1', '4', '0x14'],
      a: 1,
      why: 'Ghép lại: <code>0x00141061</code>. Revision là bit 23..20: <code>(0x00141061 &gt;&gt; 20) &amp; 0xf</code> = <code>0x1</code>. Bit 19..16 (<code>0x4</code>) vẫn là nửa cao của Designer <code>0x41</code>. Trường Revision nằm ở nửa cao của <code>PeriphID2</code>, không phải cả byte — lý do phải tách theo bit field chứ không theo byte. PL061 trong QEMU có <code>PeriphID2</code> = <code>0x04</code>, revision 0, đúng như bạn đo ở bước 2.' },

    { q: 'Một driver GPIO mới cho một bộ điều khiển kiểu PL061 viết <code>direction_output</code> như sau: ghi giá trị vào thanh ghi dữ liệu, rồi đặt bit trong thanh ghi hướng. Trên board, chân reset của một chip ngoại vi không được kéo lên đúng lúc khởi động, nhưng nếu gọi lại lần thứ hai thì hoạt động. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Thiếu <code>spin_lock_irqsave</code> quanh việc đổi hướng',
        'Thanh ghi dữ liệu bỏ qua lần ghi khi chân còn là input; lần gọi đầu mất giá trị, lần sau chân đã là output nên ghi có tác dụng',
        'Quên <code>dmb</code> giữa hai lần ghi',
        'Số GPIO toàn cục bị đổi sau khi boot'
      ],
      a: 1,
      why: 'Đây đúng là triệu chứng của <code>vgchip_onewrite</code> ở bước 6: <code>GPIODIR</code> đúng, <code>GPIODATA</code> = <code>0x00</code> lần đầu, <code>0x05</code> lần hai. Datasheet PL061 nói ghi dữ liệu "only affects the pins that are configured as outputs". Cách sửa là ghi giá trị lần nữa sau khi đặt hướng, như <code>gpio-pl061.c</code>. Thiếu khoá gây lỗi ngẫu nhiên khi hai CPU tranh nhau, không phải "luôn sai lần đầu"; <code>writel</code> đã có rào; số toàn cục không liên quan tới giá trị ghi.' },

    { q: 'Vì sao một script dùng <code>echo 23 &gt; /sys/class/gpio/export</code> chạy đúng trên board cũ nhưng điều khiển sai chân sau khi cập nhật kernel, dù phần cứng không đổi?',
      opts: [
        'Kernel mới đổi thứ tự bit trong thanh ghi',
        'Số 23 là số toàn cục, phụ thuộc vào thứ tự và số lượng <code>gpio_chip</code> được đăng ký; kernel mới thêm hoặc đổi thứ tự chip nên số của chân dịch đi',
        'sysfs chỉ hỗ trợ chân output',
        '<code>/sys/class/gpio</code> đọc sai khi có hơn 16 chân'
      ],
      a: 1,
      why: 'Sysfs gọi chân bằng số toàn cục. Với <code>base = -1</code>, gpiolib cấp số từ 512 theo thứ tự probe (bước 6: <code>global base 512</code>) — thêm một chip, đổi thứ tự nạp module, là mọi số phía sau dịch. Chardev tránh vấn đề này bằng cách gọi chân theo chip + offset hoặc theo <b>tên</b> (<code>gpioget button</code>). Đây là một trong những lý do chính sysfs bị khai tử.' },

    { q: '<code>gpioset -c gpiochip0 5=1</code> trả về <code>Device or resource busy</code>. <code>gpioinfo -c gpiochip0 5</code> in <code>output consumer="gpioset"</code>. Chuyện gì đang xảy ra?',
      opts: [
        'Chân 5 bị hỏng',
        'Một tiến trình <code>gpioset</code> khác (ví dụ chạy nền, không <code>-t</code>) vẫn đang giữ fd yêu cầu chân 5; gpiolib từ chối người thứ hai',
        'Kernel không bật <code>CONFIG_GPIO_CDEV</code>',
        'Phải <code>export</code> chân qua sysfs trước'
      ],
      a: 1,
      why: '<code>consumer="gpioset"</code> nghĩa là chân đang thuộc về một tiến trình tên <code>gpioset</code>. Mặc định <code>gpioset</code> không thoát — nó giữ fd để giữ mức chân. gpiolib chỉ cho một chủ mỗi lúc, nên lệnh thứ hai nhận <code>EBUSY</code> — đúng cảnh ở bước 4. <code>kill</code> tiến trình đầu và chân tự được trả. Nếu thiếu <code>CONFIG_GPIO_CDEV</code> thì đã không có <code>/dev/gpiochip0</code> để <code>gpioinfo</code> đọc, và sysfs <code>export</code> không có trong kernel này.' }
  ]
});

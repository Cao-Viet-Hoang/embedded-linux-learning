/* Bài 55 — Ngắt và xử lý trễ
   Chặng 10 — Kernel module và Driver
   Viết driver talarm (~/bai55/talarm/talarm.c, 145 dòng) cho node "learn,temp-alarm" nối vào chân 3
   của GPIO PL061 trên máy virt: một ngắt, một top half và ba bottom half (tasklet, workqueue,
   threaded IRQ), mỗi hàm tự in ngữ cảnh của nó (preempt_count, irqs_disabled, in_hardirq,
   in_serving_softirq, in_task). Ngắt được bắn bằng lệnh "system_powerdown" ở monitor QEMU — nút
   nguồn ảo của virt nằm đúng trên chân 3. Cây alarm.dts = board.dts của Bài 54 (/include/) + PL061
   thành interrupt-controller + xoá gpio-keys. Ba biến thể build bằng KCFLAGS/sed: SHOW_STACK
   (dump_stack trong top half), SLEEP_IN_TASKLET (msleep trong tasklet -> BUG: scheduling while
   atomic -> panic), handler=NULL (có và không có IRQF_ONESHOT). Mọi số liệu đo 2026-09-30 trên
   máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1, dtc 1.5.0), kernel
   ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs. ~/bai54 chỉ được đọc. */

Lesson.register({
  id: 'bai-55',
  title: 'Ngắt và xử lý trễ',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Driver <code>tsensor</code> của Bài 54 chỉ trả lời khi được hỏi: mỗi lần bạn <code>cat ' +
    '/dev/tsensor0</code>, nó mới đi lấy giá trị. Muốn biết nhiệt độ vừa vượt ngưỡng, chương trình ' +
    'phải hỏi liên tục — hỏi 1 000 lần một giây thì tốn CPU, hỏi mỗi giây một lần thì có khi trễ ' +
    'mất một giây. Phần cứng thật giải bài toán này bằng cách <b>tự lên tiếng</b>: khi có chuyện, nó ' +
    'kéo một đường dây gọi là <b>ngắt</b> (<i>interrupt</i>), CPU bỏ dở việc đang làm và chạy hàm ' +
    'của bạn.<br><br>' +
    'Cái giá là hàm đó chạy trong một hoàn cảnh rất khắc nghiệt: nó cắt ngang một chương trình bất kỳ, ' +
    'các ngắt khác trên CPU đó bị chặn, và nó <b>không được ngủ</b>. Bài này đi theo một ngắt thật từ ' +
    'chân GPIO của máy <code>virt</code> tới hàm của bạn, chia việc thành <b>top half</b> và <b>bottom ' +
    'half</b>, rồi cho bạn nhìn tận mắt bốn nơi mã có thể chạy — và chuyện gì xảy ra khi bạn gọi ' +
    '<code>msleep</code> ở nơi không được phép: kernel in <code>BUG: scheduling while atomic</code> ' +
    'và sập hẳn.',

  goals: [
    'Lần theo đường đi của một ngắt từ chân phần cứng qua GIC và bộ điều khiển GPIO tới hàm xử lý, ' +
      'và phân biệt ba con số: ô <code>interrupts</code> trong Device Tree, <code>hwirq</code> và số ' +
      'IRQ của Linux trong <code>/proc/interrupts</code>.',
    'Xin một ngắt bằng <code>devm_request_threaded_irq</code> (và biết <code>request_irq</code>/' +
      '<code>devm_request_irq</code> chỉ là trường hợp riêng của nó), trả đúng giá trị ' +
      '<code>IRQ_HANDLED</code>/<code>IRQ_NONE</code>/<code>IRQ_WAKE_THREAD</code>.',
    'Chia việc thành top half và bottom half, và dùng được ba loại bottom half — tasklet, workqueue, ' +
      'threaded IRQ — rồi đọc từ <code>preempt_count</code> xem mỗi loại chạy trong ngữ cảnh nào.',
    'Trả lời được \"đoạn mã này có được ngủ không\" cho mọi ngữ cảnh, và nhận ra ngay thông báo ' +
      '<code>BUG: scheduling while atomic</code> khi gặp.',
    'Giải thích vì sao một threaded IRQ không có top half bắt buộc phải có <code>IRQF_ONESHOT</code>, ' +
      'và sửa được lỗi <code>-EINVAL</code> khi quên nó.'
  ],

  blocks: [

    /* ============================================================
       1. HỎI LIÊN TỤC HAY ĐỢI ĐƯỢC GỌI
       ============================================================ */
    { t: 'h2', x: 'Hỏi liên tục hay đợi được gọi' },

    { t: 'p', x:
      'Hình dung bạn đợi một bưu kiện. Cách thứ nhất: cứ vài phút lại ra cửa nhìn. Bạn không làm được ' +
      'việc gì cho ra hồn, và nếu mỗi giờ mới ra một lần thì bưu kiện có thể nằm ngoài cửa gần một giờ. ' +
      'Cách thứ hai: lắp chuông cửa, rồi cứ làm việc của mình — khi chuông reo mới ra. Trong kernel, ' +
      'cách thứ nhất gọi là <b>polling</b> (thăm dò), cách thứ hai là <b>ngắt</b>. Chuông cửa là một ' +
      'đường dây nối từ thiết bị tới CPU; \"reo\" nghĩa là thiết bị đổi mức điện áp trên dây đó.' },

    { t: 'table',
      head: ['', 'Polling', 'Ngắt'],
      rows: [
        ['Ai chủ động', 'CPU hỏi thiết bị theo chu kỳ', 'Thiết bị báo khi có chuyện'],
        ['Tốn CPU khi không có gì', 'Có — mỗi lần hỏi là một lần đọc thanh ghi', 'Không — CPU làm việc khác, hoặc ngủ'],
        ['Độ trễ', 'Tới một chu kỳ hỏi', 'Vài micro giây, không phụ thuộc chu kỳ'],
        ['Khi nào vẫn dùng', 'Sự kiện dày đặc (mạng tốc độ cao dùng NAPI: ngắt để đánh thức, rồi polling), hoặc phần cứng không có dây ngắt', 'Hầu hết mọi thiết bị: phím, UART, cảm biến báo ngưỡng, bộ định thời'],
        ['Trong <code>tsensor</code> Bài 54', '<code>learn,poll-ms</code> — chu kỳ hỏi, chưa ai dùng', 'Bài này: node mới <code>learn,temp-alarm</code> có property <code>interrupts</code>']
      ] },

    { t: 'p', x:
      'Máy ảo của bạn đang nhận ngắt ngay lúc này, dù bạn chưa viết dòng nào. Quan trọng nhất là ' +
      '<b>bộ định thời</b> của CPU (<code>arch_timer</code>): nó reo đều đặn để kernel đếm thời gian và ' +
      'đổi tiến trình. Kernel này build với <code>CONFIG_HZ=250</code>, tức tối đa 250 lần mỗi giây, và ' +
      '<code>CONFIG_NO_HZ_IDLE=y</code>, tức khi CPU rảnh thì tắt bớt nhịp đó cho đỡ tốn. Bước 1 của phần ' +
      'thực hành đếm được cả hai: khoảng <b>33</b> lần trong 4 giây khi rảnh, và <b>1 005</b> lần trong 4 ' +
      'giây khi một vòng lặp chiếm CPU — gần đúng 250 × 4.' },

    /* ============================================================
       2. ĐƯỜNG ĐI CỦA MỘT NGẮT
       ============================================================ */
    { t: 'h2', x: 'Đường đi của một ngắt trên máy virt' },

    { t: 'p', x:
      'Một CPU ARM64 chỉ có <b>một</b> đầu vào ngắt thông thường (gọi là IRQ). Nó không thể nối thẳng ' +
      'với hàng trăm thiết bị. Ở giữa là <b>bộ điều khiển ngắt</b> (<i>interrupt controller</i>): nó gom ' +
      'mọi đường dây, nhớ đường nào đang reo, và báo cho CPU \"có ngắt, số N\". Trên ARM đó là ' +
      '<b>GIC</b> (<i>Generic Interrupt Controller</i>) — Bài 44 đã gặp nó là node <code>intc@8000000</code>. ' +
      'Nhiều thiết bị lại tự là một bộ điều khiển ngắt nhỏ: bộ GPIO PL061 có 8 chân, cả 8 chân dùng ' +
      'chung <b>một</b> đường dây lên GIC, và PL061 tự có thanh ghi cho biết chân nào vừa đổi. Hai tầng ' +
      'bộ điều khiển nối tiếp nhau như vậy gọi là <b>xếp tầng</b> (<i>cascade</i>, trong kernel gọi là ' +
      '<i>chained</i>).' },

    { t: 'fig',
      cap: 'Một lần bấm nút nguồn ảo đi qua hai bộ điều khiển ngắt. PL061 gom 8 chân vào một dây lên GIC ' +
           '(SPI 7 → hwirq 39); GIC báo CPU; hàm của GIC gọi hàm của PL061; hàm của PL061 đọc chân nào đổi ' +
           'rồi mới gọi hàm của bạn. Số IRQ Linux (21) chỉ là chỉ mục kernel tự cấp — nó không có trong ' +
           'phần cứng. Mỗi tên hàm bên phải là một dòng thật trong call trace của bước 4.',
      svg:
        '<svg viewBox="0 0 720 360" width="720" role="img" aria-label="Sơ đồ đường đi của ngắt: chân 3 PL061, dây SPI 7 lên GIC, GIC báo CPU, CPU vào el1h_64_irq, gic_handle_irq, pl061_irq_handler, handle_edge_irq, và cuối cùng hàm ta_top của driver với số IRQ Linux 21">' +
        '<text class="d-t" x="130" y="20" text-anchor="middle">Phần cứng</text>' +
        '<text class="d-t" x="520" y="20" text-anchor="middle">Kernel (một lần ngắt)</text>' +
        '<rect class="d-box" x="20" y="36" width="220" height="56" rx="6"/>' +
        '<text class="d-t" x="130" y="58" text-anchor="middle">Nút nguồn ảo của QEMU</text>' +
        '<text class="d-tm" x="130" y="78" text-anchor="middle">(qemu) system_powerdown</text>' +
        '<line class="d-line" x1="130" y1="92" x2="130" y2="112"/><path class="d-arrow" d="M 130 120 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-p" x="20" y="120" width="220" height="56" rx="6"/>' +
        '<text class="d-t" x="130" y="142" text-anchor="middle">GPIO PL061, chân 3</text>' +
        '<text class="d-tm" x="130" y="162" text-anchor="middle">hwirq 3 · sườn lên</text>' +
        '<line class="d-line" x1="130" y1="176" x2="130" y2="196"/><path class="d-arrow" d="M 130 204 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="140" y="192">một dây chung cho 8 chân</text>' +
        '<rect class="d-box-p" x="20" y="204" width="220" height="56" rx="6"/>' +
        '<text class="d-t" x="130" y="226" text-anchor="middle">GIC</text>' +
        '<text class="d-tm" x="130" y="246" text-anchor="middle">SPI 7 = hwirq 39</text>' +
        '<line class="d-line" x1="130" y1="260" x2="130" y2="280"/><path class="d-arrow" d="M 130 288 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-w" x="20" y="288" width="220" height="56" rx="6"/>' +
        '<text class="d-t" x="130" y="310" text-anchor="middle">CPU: ngoại lệ IRQ</text>' +
        '<text class="d-ts" x="130" y="330" text-anchor="middle">bỏ dở lệnh đang chạy</text>' +
        '<line class="d-line" x1="240" y1="316" x2="300" y2="316"/><path class="d-arrow" d="M 308 316 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box" x="308" y="292" width="392" height="48" rx="6"/>' +
        '<text class="d-tm" x="504" y="314" text-anchor="middle">el1h_64_irq → el1_interrupt</text>' +
        '<text class="d-ts" x="504" y="332" text-anchor="middle">mã vào ngắt của arm64, chạy trên ngăn xếp ngắt riêng</text>' +
        '<line class="d-line" x1="504" y1="292" x2="504" y2="272"/><path class="d-arrow" d="M 504 264 l -4 8 l 8 0 z"/>' +
        '<rect class="d-box" x="308" y="216" width="392" height="48" rx="6"/>' +
        '<text class="d-tm" x="504" y="238" text-anchor="middle">gic_handle_irq</text>' +
        '<text class="d-ts" x="504" y="256" text-anchor="middle">hỏi GIC: số 39 → Linux IRQ 14 (ẩn khỏi /proc/interrupts)</text>' +
        '<line class="d-line" x1="504" y1="216" x2="504" y2="196"/><path class="d-arrow" d="M 504 188 l -4 8 l 8 0 z"/>' +
        '<rect class="d-box" x="308" y="140" width="392" height="48" rx="6"/>' +
        '<text class="d-tm" x="504" y="162" text-anchor="middle">pl061_irq_handler</text>' +
        '<text class="d-ts" x="504" y="180" text-anchor="middle">đọc thanh ghi PL061: chân 3 → Linux IRQ 21</text>' +
        '<line class="d-line" x1="504" y1="140" x2="504" y2="120"/><path class="d-arrow" d="M 504 112 l -4 8 l 8 0 z"/>' +
        '<rect class="d-box" x="308" y="64" width="392" height="48" rx="6"/>' +
        '<text class="d-tm" x="504" y="86" text-anchor="middle">handle_edge_irq</text>' +
        '<text class="d-ts" x="504" y="104" text-anchor="middle">báo nhận, đếm +1 vào /proc/interrupts, gọi handler</text>' +
        '<line class="d-line" x1="504" y1="64" x2="504" y2="52"/><path class="d-arrow" d="M 504 44 l -4 8 l 8 0 z"/>' +
        '<rect class="d-box-g" x="398" y="4" width="212" height="40" rx="6"/>' +
        '<text class="d-tm" x="504" y="29" text-anchor="middle">ta_top() — hàm của bạn</text>' +
        '</svg>' },

    { t: 'p', x:
      'Vì có hai tầng bộ điều khiển, cùng một ngắt mang <b>ba</b> con số khác nhau, và nhầm chúng là ' +
      'lỗi rất phổ biến khi đọc log:' },

    { t: 'table',
      head: ['Con số', 'Ở đâu', 'Ví dụ trong bài', 'Nghĩa'],
      rows: [
        ['Ô trong <code>interrupts</code>', 'Device Tree', '<code>interrupts = &lt;0x00 0x07 0x04&gt;</code> của PL061; <code>&lt;3 1&gt;</code> của node bạn viết', 'Ngôn ngữ riêng của <b>bộ điều khiển cha</b>. Với GIC: loại (0 = SPI, 1 = PPI), số, cờ. Với PL061: số chân, cờ'],
        ['<code>hwirq</code>', '<code>/sys/kernel/irq/N/hwirq</code>', '39 cho PL061 (SPI 7 + 32), 3 cho chân 3', 'Số mà <b>phần cứng</b> của bộ điều khiển dùng. GIC đánh số SPI từ 32 (<code>drivers/irqchip/irq-gic.c</code>, dòng 1098: <code>param[1] + 32</code>)'],
        ['Số IRQ Linux', 'Cột đầu của <code>/proc/interrupts</code>', '21', 'Chỉ mục kernel tự cấp khi dịch cây (<code>CONFIG_SPARSE_IRQ=y</code>). Không có ý nghĩa phần cứng, có thể đổi khi đổi cây. Đây là số bạn đưa cho <code>request_irq</code>']
      ] },

    { t: 'p', x:
      'Bảng dịch từ <code>hwirq</code> sang số Linux, riêng cho từng bộ điều khiển, gọi là <b>IRQ ' +
      'domain</b>. Bạn không phải tự tra: <code>platform_get_irq(pdev, 0)</code> đọc ô ' +
      '<code>interrupts</code> của node, nhờ domain của bộ điều khiển cha dịch, rồi trả số Linux — giống ' +
      'hệt cách <code>platform_get_resource</code> ở Bài 54 trả vùng địa chỉ đã dịch từ <code>reg</code>.' },

    { t: 'p', x:
      'Ô cờ quyết định <b>khi nào</b> dây được coi là \"đang reo\". Có hai họ:' },

    { t: 'table',
      head: ['Kiểu kích hoạt', 'Giá trị cờ (<code>dt-bindings/interrupt-controller/irq.h</code>)', 'Reo khi', 'Hệ quả'],
      rows: [
        ['Sườn lên (<i>edge rising</i>)', '<code>1</code> = <code>IRQ_TYPE_EDGE_RISING</code>', 'Dây vừa chuyển 0 → 1', 'Một lần chuyển = một ngắt. Bỏ lỡ lúc CPU bận thì mất. Node của bạn dùng kiểu này: <code>&lt;3 1&gt;</code>'],
        ['Hai sườn', '<code>3</code> = <code>IRQ_TYPE_EDGE_BOTH</code>', 'Mỗi lần dây đổi mức', 'Một lần bấm-nhả = <b>hai</b> ngắt. <code>gpio-keys</code> xin kiểu này (<code>gpio_keys.c</code>, dòng 599) — bước 1 thấy bộ đếm tăng 2 mỗi lần bấm'],
        ['Mức cao (<i>level high</i>)', '<code>4</code> = <code>IRQ_TYPE_LEVEL_HIGH</code>', 'Chừng nào dây còn ở mức 1', 'Thiết bị giữ dây cho tới khi driver xoá cờ trong thiết bị. Không xoá = ngắt lặp vô tận. PL061 nối lên GIC bằng kiểu này (ô thứ ba <code>0x04</code>)']
      ] },

    { t: 'cal', kind: 'info', title: 'Vì sao dùng nút nguồn ảo làm \"cảm biến\"',
      x: 'Máy <code>virt</code> của QEMU 4.2.1 không có thiết bị nào bạn tự bắn ngắt được, trừ một: nút ' +
         'nguồn. Lệnh <code>system_powerdown</code> ở monitor QEMU tạo một xung trên chân 3 của PL061 — ' +
         'đúng chân mà Bài 45 đã thấy thuộc về node <code>gpio-keys</code> (<code>gpios = &lt;0x8003 0x03 ' +
         '0x00&gt;</code>). Bài này gỡ <code>gpio-keys</code> khỏi cây và đưa chân đó cho node ' +
         '<code>learn,temp-alarm</code> của bạn. Với driver, không có gì khác giữa \"nút được bấm\" và ' +
         '\"nhiệt độ vượt ngưỡng\": cả hai là một sườn lên trên một chân GPIO.' },

    /* ============================================================
       3. XIN MỘT NGẮT
       ============================================================ */
    { t: 'h2', x: 'Xin một ngắt: request_irq và họ hàng' },

    { t: 'p', x:
      'Driver nói với kernel \"khi IRQ số N reo, hãy gọi hàm này\" bằng một lời gọi duy nhất. Kernel có ' +
      'bốn tên cho nó, nhưng thật ra chỉ có <b>một</b> hàm — ba tên kia là lối tắt:' },

    { t: 'code', where: 'file', name: 'include/linux/interrupt.h (rút gọn)', lang: 'c', code:
      'typedef irqreturn_t (*irq_handler_t)(int irq, void *dev_id);\n' +
      '\n' +
      'int request_threaded_irq(unsigned int irq, irq_handler_t handler,\n' +
      '                         irq_handler_t thread_fn, unsigned long flags,\n' +
      '                         const char *name, void *dev_id);\n' +
      '\n' +
      '/* line 169: request_irq = threaded with no thread */\n' +
      'request_irq(irq, handler, flags, name, dev)\n' +
      '    -> request_threaded_irq(irq, handler, NULL, flags | IRQF_COND_ONESHOT, name, dev);\n' +
      '\n' +
      '/* line 209/215: the devm_ versions, freed automatically on unbind */\n' +
      'devm_request_threaded_irq(dev, irq, handler, thread_fn, flags, name, dev_id);\n' +
      'devm_request_irq(dev, irq, handler, flags, name, dev_id);' },

    { t: 'table',
      head: ['Tham số', 'Nghĩa', 'Trong <code>talarm</code>'],
      rows: [
        ['<code>irq</code>', 'Số IRQ <b>Linux</b>, không phải <code>hwirq</code>', '<code>platform_get_irq(pdev, 0)</code> → 21'],
        ['<code>handler</code>', 'Hàm chạy ngay khi ngắt đến — <b>top half</b>', '<code>ta_top</code>'],
        ['<code>thread_fn</code>', 'Hàm chạy sau, trong một kernel thread riêng — <b>threaded IRQ</b>. <code>NULL</code> = không dùng', '<code>ta_thread</code>'],
        ['<code>flags</code>', 'Tổ hợp <code>IRQF_*</code>. <code>0</code> = kiểu kích hoạt lấy từ Device Tree', '<code>0</code>'],
        ['<code>name</code>', 'Chuỗi hiện ở cột cuối <code>/proc/interrupts</code> và trong tên thread <code>irq/N-name</code>', '<code>\"talarm\"</code>'],
        ['<code>dev_id</code>', 'Con trỏ bất kỳ, được trả lại nguyên vẹn làm tham số thứ hai của handler. Với ngắt dùng chung (<code>IRQF_SHARED</code>) nó còn là chìa khoá để gỡ đúng handler của bạn', '<code>ta</code> — cấu trúc riêng của thiết bị']
      ] },

    { t: 'p', x:
      'Hàm xử lý trả một trong ba giá trị (<code>include/linux/irqreturn.h</code>). Giá trị trả về không ' +
      'phải thủ tục cho có: kernel dùng nó để phát hiện phần cứng hỏng.' },

    { t: 'table',
      head: ['Giá trị', 'Nghĩa', 'Kernel làm gì'],
      rows: [
        ['<code>IRQ_NONE</code> (0)', 'Ngắt này không phải của thiết bị tôi', 'Hỏi handler kế tiếp nếu ngắt dùng chung. Nếu trong 100 000 lần có hơn 99 900 lần không ai nhận (<code>kernel/irq/spurious.c</code>, dòng 360–364), kernel in <code>irq N: nobody cared</code> và <b>tắt hẳn</b> IRQ đó'],
        ['<code>IRQ_HANDLED</code> (1)', 'Đã xử lý xong', 'Không làm gì thêm'],
        ['<code>IRQ_WAKE_THREAD</code> (2)', 'Tôi đã làm phần gấp; hãy đánh thức <code>thread_fn</code>', 'Đánh thức thread <code>irq/N-name</code>']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao dùng bản devm_',
      x: 'Ngắt là một tài nguyên như mọi tài nguyên của Bài 54: xin trong <code>probe</code>, phải trả khi ' +
         'thiết bị đi. Quên <code>free_irq</code> thì sau <code>rmmod</code> kernel vẫn giữ con trỏ tới ' +
         '<code>ta_top</code> — nằm trong vùng nhớ của một module đã bị gỡ. Ngắt tiếp theo sẽ nhảy vào ' +
         'đó. <code>devm_request_threaded_irq</code> đẩy <code>free_irq</code> lên ngăn xếp devres, nên ' +
         'bước 4 thấy dòng <code>talarm</code> biến khỏi <code>/proc/interrupts</code> và thread ' +
         '<code>irq/21-talarm</code> biến khỏi <code>ps</code> ngay khi <code>rmmod</code>, không cần một ' +
         'dòng <code>remove</code> nào.' },

    /* ============================================================
       4. TOP HALF, BOTTOM HALF VÀ NGỮ CẢNH
       ============================================================ */
    { t: 'h2', x: 'Top half, bottom half và bốn ngữ cảnh' },

    { t: 'p', x:
      'Khi <code>ta_top</code> chạy, CPU đang bị <b>cắt ngang</b>: nó có thể đang ở giữa chương trình ' +
      '<code>sh</code> của bạn, giữa một lời gọi hệ thống, hoặc đang ngủ trong vòng lặp nhàn rỗi. Ngắt ' +
      'trên CPU đó bị chặn cho tới khi hàm trả về. Nếu hàm mất 10 ms, suốt 10 ms đó bộ định thời không ' +
      'đếm được, UART có thể tràn bộ đệm, và ngắt sườn của thiết bị khác có thể bị mất. Vì vậy quy tắc ' +
      'số một: <b>top half làm phần tối thiểu rồi thoát</b> — thường là đọc và xoá cờ ngắt trong thiết ' +
      'bị, ghi lại dữ liệu cần giữ, rồi hẹn phần còn lại cho sau. \"Phần còn lại cho sau\" là ' +
      '<b>bottom half</b>.' },

    { t: 'p', x:
      'Hãy nghĩ tới lễ tân một phòng khám. Khi điện thoại reo (ngắt), lễ tân không khám bệnh qua điện ' +
      'thoại: họ ghi tên, số điện thoại, hẹn giờ, rồi gác máy để còn nghe cuộc gọi tiếp (top half). Bác sĩ ' +
      'khám sau, theo lịch (bottom half). Kernel có ba kiểu \"bác sĩ\" khác nhau ở một điểm: <b>ai</b> chạy ' +
      'phần sau, và phần sau có được <b>ngủ</b> hay không.' },

    { t: 'table',
      head: ['Nơi mã chạy', 'Ai chạy', 'Ngắt trên CPU', 'Được ngủ?', 'Trong <code>talarm</code>'],
      rows: [
        ['<b>Hardirq</b> (top half)', 'Tiến trình nào đang bị cắt ngang — <code>current</code> là nó, nhưng không liên quan', 'Tắt', '<b>Không</b>', '<code>ta_top</code>'],
        ['<b>Softirq</b> (tasklet)', 'Như trên, chạy ngay khi hardirq thoát; khi quá tải thì chuyển cho <code>ksoftirqd/N</code>', 'Bật', '<b>Không</b>', '<code>ta_tasklet</code>'],
        ['<b>Process</b> — workqueue', 'Thread dùng chung <code>kworker/N:M</code>', 'Bật', '<b>Có</b>', '<code>ta_work</code>'],
        ['<b>Process</b> — threaded IRQ', 'Thread riêng <code>irq/21-talarm</code>, ưu tiên thời gian thực', 'Bật', '<b>Có</b>', '<code>ta_thread</code>']
      ] },

    { t: 'p', x:
      '\"Được ngủ\" nghĩa là được gọi hàm có thể chặn: <code>msleep</code>, <code>mutex_lock</code>, ' +
      '<code>kmalloc(…, GFP_KERNEL)</code> (Bài 51 đã nói nó có thể ngủ chờ bộ nhớ), <code>copy_to_user</code>. ' +
      'Ngủ nghĩa là gọi bộ lập lịch để nhường CPU cho <b>tiến trình khác</b> và được đánh thức về sau. ' +
      'Trong hardirq và softirq không có \"tiến trình của mình\" để cất đi: mã đang mượn ngăn xếp và ' +
      '<code>current</code> của một ai đó bị cắt ngang. Nếu nhường CPU, không có gì để đánh thức lại đúng ' +
      'chỗ — và nếu tiến trình bị cắt ngang là vòng lặp nhàn rỗi thì chẳng có ai để nhường. Bước 5 thấy ' +
      'đúng tình huống đó.' },

    { t: 'h3', x: 'preempt_count: kernel tự biết mình đang ở đâu' },

    { t: 'p', x:
      'Kernel không đoán ngữ cảnh. Mỗi thread có một số nguyên 32 bit tên <code>preempt_count</code>, ' +
      'chia thành các ô bit (<code>include/linux/preempt.h</code>, dòng 33–52). Vào hardirq thì ô ' +
      'hardirq tăng 1, vào softirq thì ô softirq tăng 1, thoát ra thì giảm. Các hàm hỏi ngữ cảnh chỉ đọc ' +
      'số này:' },

    { t: 'table',
      head: ['Bit', 'Ô', 'Tăng khi', 'Hàm đọc'],
      rows: [
        ['0–7', 'preempt', '<code>preempt_disable()</code>, <code>spin_lock()</code> (Bài 56)', '—'],
        ['8–15', 'softirq', 'Đang chạy softirq: +<code>0x100</code>. Chỉ tắt softirq: +<code>0x200</code>', '<code>in_serving_softirq()</code>'],
        ['16–19', 'hardirq', 'Đang trong hàm xử lý ngắt: +<code>0x10000</code>', '<code>in_hardirq()</code>'],
        ['20–23', 'NMI', 'Ngắt không che được', '<code>in_nmi()</code>'],
        ['cả số', '—', 'Khác 0 = có gì đó cấm ngủ', '<code>in_atomic()</code> = <code>preempt_count() != 0</code> (dòng 186)']
      ] },

    { t: 'p', x:
      'Driver <code>talarm</code> in số này ở mỗi hàm. Đây là dòng thật bạn sẽ thấy ở bước 4, khi ngắt ' +
      'rơi vào lúc CPU đang nhàn rỗi:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'talarm b004000.alarm: top     #1 swapper/0/0 preempt=0x00010001 irqs_off=1 hardirq=1 softirq=0 task=0 +52 us\n' +
      'talarm b004000.alarm: tasklet #1 swapper/0/0 preempt=0x00000101 irqs_off=0 hardirq=0 softirq=1 task=0 +1691 us\n' +
      'talarm b004000.alarm: thread  #1 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +2341 us\n' +
      'talarm b004000.alarm: work    #1 kworker/0:1/11 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +4451 us' },

    { t: 'p', x:
      'Đọc từng số: <code>top</code> có <code>0x00010001</code> = ô hardirq bằng 1 (<code>0x10000</code>) ' +
      'cộng ô preempt bằng 1. Số 1 cuối đó không phải của ngắt: nó là của <code>swapper/0</code>, vòng ' +
      'lặp nhàn rỗi PID 0, vốn luôn chạy với preempt bị tắt (<code>arch/arm64/include/asm/preempt.h</code>, ' +
      'dòng 25). <code>tasklet</code> có <code>0x00000101</code> = ô softirq 1 (<code>0x100</code>) cộng ' +
      'cùng số 1 đó. Hai thread đều <code>0x00000000</code>: sạch, được ngủ. Bước 4 cũng bắn ngắt khi ' +
      '<code>sh</code> đang chạy, và số cuối biến mất: <code>0x00010000</code>, <code>0x00000100</code>.' },

    { t: 'fig',
      cap: 'Bốn hàng là bốn nơi mã có thể chạy sau cùng một ngắt, xếp theo thứ tự thời gian đo ở bước 4. ' +
           'Hai hàng trên mượn CPU của ai đó đang bị cắt ngang — không được ngủ. Hai hàng dưới là thread ' +
           'thật có PID riêng — được ngủ. Ranh giới \"được ngủ\" chính là preempt_count bằng 0.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Bốn ngữ cảnh sau một ngắt: hardirq và softirq không được ngủ vì preempt_count khác 0; kworker và irq thread được ngủ vì preempt_count bằng 0">' +
        '<text class="d-t" x="20" y="22">Ngữ cảnh</text>' +
        '<text class="d-t" x="250" y="22">Ai chạy</text>' +
        '<text class="d-t" x="440" y="22">preempt_count</text>' +
        '<text class="d-t" x="620" y="22">Sau ngắt</text>' +
        '<rect class="d-box-w" x="10" y="36" width="700" height="52" rx="6"/>' +
        '<text class="d-t" x="20" y="58">hardirq — ta_top</text>' +
        '<text class="d-ts" x="20" y="76">ngắt trên CPU tắt</text>' +
        '<text class="d-tm" x="250" y="66">tiến trình bị cắt ngang</text>' +
        '<text class="d-tm" x="440" y="66">0x0001000x</text>' +
        '<text class="d-tm" x="620" y="66">+1…+66 µs</text>' +
        '<rect class="d-box-w" x="10" y="96" width="700" height="52" rx="6"/>' +
        '<text class="d-t" x="20" y="118">softirq — ta_tasklet</text>' +
        '<text class="d-ts" x="20" y="136">ngắt bật, vẫn mượn CPU</text>' +
        '<text class="d-tm" x="250" y="126">tiến trình bị cắt ngang</text>' +
        '<text class="d-tm" x="440" y="126">0x0000010x</text>' +
        '<text class="d-tm" x="620" y="126">+0,2…+1,7 ms</text>' +
        '<line class="d-line" x1="10" y1="160" x2="710" y2="160"/>' +
        '<text class="d-ts" x="360" y="176" text-anchor="middle">ranh giới: preempt_count = 0 → được ngủ</text>' +
        '<rect class="d-box-g" x="10" y="188" width="700" height="52" rx="6"/>' +
        '<text class="d-t" x="20" y="210">threaded IRQ — ta_thread</text>' +
        '<text class="d-ts" x="20" y="228">thread riêng, SCHED_FIFO 50</text>' +
        '<text class="d-tm" x="250" y="218">irq/21-talarm</text>' +
        '<text class="d-tm" x="440" y="218">0x00000000</text>' +
        '<text class="d-tm" x="620" y="218">+0,2…+2,3 ms</text>' +
        '<rect class="d-box-g" x="10" y="248" width="700" height="52" rx="6"/>' +
        '<text class="d-t" x="20" y="270">workqueue — ta_work</text>' +
        '<text class="d-ts" x="20" y="288">thread dùng chung</text>' +
        '<text class="d-tm" x="250" y="278">kworker/0:1</text>' +
        '<text class="d-tm" x="440" y="278">0x00000000</text>' +
        '<text class="d-tm" x="620" y="278">+0,4…+5,8 ms</text>' +
        '</svg>' },

    /* ============================================================
       5. BA LOẠI BOTTOM HALF
       ============================================================ */
    { t: 'h2', x: 'Ba loại bottom half: softirq và tasklet, workqueue, threaded IRQ' },

    { t: 'h3', x: 'Softirq và tasklet' },

    { t: 'p', x:
      '<b>Softirq</b> là tầng thấp nhất: một bảng cố định <b>10</b> loại việc được biên dịch sẵn vào ' +
      'kernel (<code>kernel/softirq.c</code>, dòng 64–66): <code>HI</code>, <code>TIMER</code>, ' +
      '<code>NET_TX</code>, <code>NET_RX</code>, <code>BLOCK</code>, <code>IRQ_POLL</code>, ' +
      '<code>TASKLET</code>, <code>SCHED</code>, <code>HRTIMER</code>, <code>RCU</code>. Driver không thêm ' +
      'được loại mới. Ngay khi một hàm xử lý ngắt thoát, kernel kiểm tra có softirq nào đang chờ và chạy ' +
      'chúng, <b>với ngắt đã bật lại</b> nhưng vẫn trên CPU mượn của tiến trình bị cắt ngang. Nếu việc ' +
      'dồn dập quá 2 ms hoặc 10 vòng (<code>MAX_SOFTIRQ_TIME</code>, <code>MAX_SOFTIRQ_RESTART</code>, ' +
      'dòng 543–544), phần còn lại được giao cho kernel thread <code>ksoftirqd/N</code> để tiến trình ' +
      'thường không bị bỏ đói. <code>/proc/softirqs</code> đếm từng loại.' },

    { t: 'p', x:
      '<b>Tasklet</b> là cách driver dùng softirq: bạn đăng ký một hàm, <code>tasklet_schedule</code> ' +
      'xếp nó vào loại <code>TASKLET</code>, và nó chạy một lần ở lượt softirq kế tiếp. Hai tính chất ' +
      'cần nhớ: một tasklet không bao giờ chạy song song với chính nó trên hai CPU, và gọi ' +
      '<code>tasklet_schedule</code> nhiều lần trước khi nó chạy vẫn chỉ chạy <b>một</b> lần.' },

    { t: 'code', where: 'file', name: '~/bai55/talarm/talarm.c — tasklet', lang: 'c', code:
      '/* Bottom half 1: softirq context, interrupts on, still must not sleep */\n' +
      'static void ta_tasklet(struct tasklet_struct *t)\n' +
      '{\n' +
      '\tstruct ta_dev *ta = from_tasklet(ta, t, tasklet);\n' +
      '\n' +
      '\tta_where(ta, "tasklet");\n' +
      '}\n' +
      '\n' +
      '/* in probe: */\n' +
      '\ttasklet_setup(&ta->tasklet, ta_tasklet);\n' +
      '\n' +
      '/* in the top half: */\n' +
      '\ttasklet_schedule(&ta->tasklet);' },

    { t: 'p', x:
      '<code>from_tasklet</code> là <code>container_of</code> (Bài 52) viết riêng cho tasklet: hàm chỉ ' +
      'nhận con trỏ tới <code>struct tasklet_struct</code> nằm trong <code>struct ta_dev</code>, và lấy ra ' +
      'con trỏ tới cả cấu trúc bao ngoài.' },

    { t: 'cal', kind: 'warn', title: 'Tasklet đã bị đánh dấu lỗi thời',
      x: 'Ngay trên phần khai báo tasklet, <code>include/linux/interrupt.h</code> dòng 667 viết: ' +
         '<i>\"This API is deprecated. Please consider using threaded IRQs instead\"</i>. Chúng vẫn còn trong ' +
         'hàng trăm driver cũ nên bạn phải đọc hiểu được, nhưng driver mới nên dùng threaded IRQ, hoặc ' +
         'workqueue loại BH (<code>system_bh_wq</code>, <code>include/linux/workqueue.h</code> dòng 469) nếu ' +
         'thật sự cần chạy trong softirq. Bài này dùng tasklet để bạn <b>nhìn thấy</b> ngữ cảnh softirq, ' +
         'không phải để khuyên dùng nó.' },

    { t: 'h3', x: 'Workqueue' },

    { t: 'p', x:
      '<b>Workqueue</b> đẩy việc cho một kernel thread. Bạn khai một <code>struct work_struct</code>, gắn ' +
      'hàm bằng <code>INIT_WORK</code>, rồi <code>schedule_work</code> xếp nó vào hàng đợi hệ thống ' +
      '(<code>system_percpu_wq</code>, một trong các ký hiệu <code>nm -u talarm.ko</code> liệt kê). Một thread ' +
      '<code>kworker/N:M</code> dùng chung nhặt việc ra chạy. Vì là thread thật, hàm của bạn chạy ở ' +
      '<b>ngữ cảnh tiến trình</b>: được ngủ, được khoá mutex, được <code>kmalloc(GFP_KERNEL)</code>. Cái ' +
      'giá là độ trễ: phải chờ bộ lập lịch cho thread đó lên CPU, và thread này có độ ưu tiên thường.' },

    { t: 'code', where: 'file', name: '~/bai55/talarm/talarm.c — workqueue', lang: 'c', code:
      '/* Bottom half 2: a kworker thread, process context, may sleep */\n' +
      'static void ta_work(struct work_struct *w)\n' +
      '{\n' +
      '\tstruct ta_dev *ta = container_of(w, struct ta_dev, work);\n' +
      '\n' +
      '\tta_where(ta, "work");\n' +
      '}\n' +
      '\n' +
      '/* in probe: */\n' +
      '\tINIT_WORK(&ta->work, ta_work);\n' +
      '\n' +
      '/* in the top half: */\n' +
      '\tschedule_work(&ta->work);' },

    { t: 'h3', x: 'Threaded IRQ' },

    { t: 'p', x:
      '<b>Threaded IRQ</b> là cách hiện đại và là thứ bạn nên dùng mặc định. Bạn đưa hai hàm cho ' +
      '<code>request_threaded_irq</code>: top half trả <code>IRQ_WAKE_THREAD</code>, và kernel đánh thức ' +
      'một thread <b>riêng của ngắt này</b>, tên <code>irq/21-talarm</code> (<code>kernel/irq/manage.c</code>, ' +
      'dòng 1402), để chạy hàm thứ hai. Thread đó được đặt lập lịch thời gian thực <code>SCHED_FIFO</code> ' +
      'mức 50 (<code>sched_set_fifo</code>, dòng 1252), nên nó chen trước mọi tiến trình thường — kể cả ' +
      'một vòng lặp chiếm 100 % CPU. Nó cũng được ngủ, và bước 4 cho nó ngủ thật 20 ms bằng ' +
      '<code>msleep</code>.' },

    { t: 'code', where: 'file', name: '~/bai55/talarm/talarm.c — threaded IRQ', lang: 'c', code:
      '/* Top half: interrupts are off on this CPU, so do the minimum and leave */\n' +
      'static irqreturn_t ta_top(int irq, void *data)\n' +
      '{\n' +
      '\t...\n' +
      '\treturn IRQ_WAKE_THREAD;     /* also wake ta_thread */\n' +
      '}\n' +
      '\n' +
      '/* Bottom half 3: this device\'s own IRQ thread, may sleep */\n' +
      'static irqreturn_t ta_thread(int irq, void *data)\n' +
      '{\n' +
      '\tstruct ta_dev *ta = data;\n' +
      '\n' +
      '\tta_where(ta, "thread");\n' +
      '\tmsleep(20);                 /* allowed: process context */\n' +
      '\tta_where(ta, "thread");\n' +
      '\treturn IRQ_HANDLED;\n' +
      '}' },

    { t: 'table',
      head: ['', 'Tasklet', 'Workqueue', 'Threaded IRQ'],
      rows: [
        ['Ngữ cảnh', 'Softirq', 'Tiến trình (<code>kworker</code> dùng chung)', 'Tiến trình (thread riêng)'],
        ['Được ngủ', 'Không', 'Có', 'Có'],
        ['Độ ưu tiên', 'Trên mọi thread', 'Thường (<code>SCHED_OTHER</code>)', 'Thời gian thực, <code>SCHED_FIFO</code> 50'],
        ['Chạy sau top half (bước 4)', '0,2–1,7 ms', '0,4–5,8 ms', '0,2–2,3 ms'],
        ['Ngắt trên đường dây trong lúc chạy', 'Bật', 'Bật', 'Tuỳ <code>IRQF_ONESHOT</code> — xem dưới'],
        ['Trạng thái', 'Lỗi thời', 'Dùng khi việc không gắn với một ngắt cụ thể', '<b>Mặc định cho driver mới</b>']
      ] },

    { t: 'cal', kind: 'info', title: 'Những con số độ trễ này đo trên máy ảo',
      x: 'QEMU mô phỏng CPU ARM64 bằng phần mềm (TCG), nên mọi con số micro giây ở đây lớn hơn phần cứng ' +
         'thật hàng chục lần, và dao động mạnh giữa các lần chạy. Thứ đáng tin là <b>thứ tự</b> và ' +
         '<b>ngữ cảnh</b>, không phải trị tuyệt đối. Thứ tự đo được ở mọi lần chạy khi viết bài: top half → ' +
         'tasklet → thread (lần in đầu) → work → thread (lần in thứ hai, sau <code>msleep(20)</code>). Các ' +
         'khoảng trong bảng gom mười hai lần bắn ngắt ở nhiều lần boot.' },

    { t: 'h3', x: 'IRQF_ONESHOT: khi không có top half' },

    { t: 'p', x:
      'Bạn có thể đưa <code>NULL</code> làm top half: kernel tự dùng một hàm mặc định chỉ làm mỗi việc ' +
      'trả <code>IRQ_WAKE_THREAD</code>. Nhưng hãy nghĩ tới một ngắt <b>mức</b>: thiết bị giữ dây ở mức 1 ' +
      'cho tới khi driver xoá cờ trong thiết bị. Hàm mặc định không biết xoá cờ của thiết bị bạn. Nó thoát, ' +
      'kernel bật lại đường dây, dây vẫn ở mức 1 → ngắt lại ngay → hàm mặc định lại chạy → mãi mãi, thread ' +
      'của bạn không bao giờ được lên CPU. Lời giải là cờ <code>IRQF_ONESHOT</code>: <b>giữ đường dây bị ' +
      'che</b> cho tới khi thread chạy xong. Vì kernel không chắc kiểu dây thật là gì, nó từ chối thẳng mọi ' +
      'yêu cầu <code>handler = NULL</code> mà không có <code>IRQF_ONESHOT</code> ' +
      '(<code>kernel/irq/manage.c</code>, dòng 1667). Bước 6 gây lỗi đó.' },

    /* ============================================================
       6. SLEEP Ở ĐÂU ĐƯỢC
       ============================================================ */
    { t: 'h2', x: 'Sleep ở đâu được và ở đâu không' },

    { t: 'p', x:
      'Đây là câu hỏi bạn phải tự hỏi trước <b>mỗi</b> lời gọi hàm trong một driver có ngắt. Câu trả lời ' +
      'chỉ phụ thuộc vào ngữ cảnh, và bảng dưới đủ cho gần như mọi trường hợp:' },

    { t: 'table',
      head: ['Lời gọi', 'Có thể ngủ?', 'Hardirq / softirq', 'Workqueue / threaded IRQ'],
      rows: [
        ['<code>msleep</code>, <code>ssleep</code>, <code>usleep_range</code>', 'Có — luôn', '<b>Cấm</b>', 'Được'],
        ['<code>mdelay</code>, <code>udelay</code>', 'Không — quay vòng bận chờ', 'Được, nhưng chỉ vài µs', 'Được, nhưng phí CPU'],
        ['<code>mutex_lock</code>', 'Có', '<b>Cấm</b>', 'Được'],
        ['<code>spin_lock</code> (Bài 56)', 'Không', 'Được', 'Được'],
        ['<code>kmalloc(…, GFP_KERNEL)</code>', 'Có', '<b>Cấm</b> — dùng <code>GFP_ATOMIC</code>', 'Được'],
        ['<code>kmalloc(…, GFP_ATOMIC)</code>', 'Không, nhưng dễ trả <code>NULL</code> hơn', 'Được', 'Được, không cần'],
        ['<code>copy_to_user</code>, <code>copy_from_user</code>', 'Có (lỗi trang)', '<b>Cấm</b> — và cũng vô nghĩa: không biết tiến trình nào đang chạy', 'Chỉ trong ngữ cảnh của tiến trình gọi (<code>read</code>/<code>ioctl</code>)'],
        ['<code>tasklet_schedule</code>, <code>schedule_work</code>, <code>wake_up</code>', 'Không', 'Được — đó là mục đích của chúng', 'Được']
      ] },

    { t: 'cal', kind: 'tip', title: 'Một câu để nhớ',
      x: '<b>\"Có PID riêng thì được ngủ.\"</b> Workqueue chạy trong <code>kworker</code>, threaded IRQ chạy ' +
         'trong <code>irq/N-tên</code> — cả hai hiện ra trong <code>ps</code>, cả hai được ngủ. Top half và ' +
         'tasklet không có thread nào của riêng chúng; dòng log của chúng in tên của <b>kẻ bị cắt ngang</b> ' +
         '(<code>swapper/0</code>, <code>sh</code>) — không được ngủ. Nếu không chắc, hàm ' +
         '<code>might_sleep()</code> đặt ở đầu một hàm sẽ cảnh báo khi hàm bị gọi sai chỗ, với điều kiện ' +
         'kernel bật <code>CONFIG_DEBUG_ATOMIC_SLEEP</code> — kernel của bạn <b>không</b> bật (bạn có thể ' +
         'kiểm bằng <code>grep DEBUG_ATOMIC_SLEEP ~/bai38/linux-6.18.45/.config</code>). Không có cảnh báo ' +
         'sớm đó, lỗi chỉ lộ ra khi hàm thật sự ngủ — như bước 5.' },

    { t: 'terms', items: [
      ['Ngắt', 'interrupt, IRQ', 'Tín hiệu từ thiết bị buộc CPU bỏ dở việc đang làm để chạy một hàm xử lý. \"IRQ\" (<i>interrupt request</i>) cũng dùng để chỉ số hiệu của một đường ngắt.'],
      ['Bộ điều khiển ngắt', 'interrupt controller', 'Phần cứng gom nhiều đường ngắt về một đầu vào của CPU. Trên ARM là GIC; PL061 cũng là một bộ điều khiển nhỏ cho 8 chân của nó.'],
      ['<code>hwirq</code>', 'hardware IRQ number', 'Số hiệu ngắt theo cách đánh số của bộ điều khiển. Khác với số IRQ Linux.'],
      ['IRQ domain', '—', 'Bảng dịch <code>hwirq</code> → số IRQ Linux, mỗi bộ điều khiển một bảng.'],
      ['Top half', 'hardirq handler', 'Hàm chạy ngay khi ngắt đến, ngắt trên CPU đó bị tắt. Phải ngắn và không được ngủ.'],
      ['Bottom half', '—', 'Phần việc được hẹn chạy sau top half: tasklet, workqueue, threaded IRQ.'],
      ['Ngữ cảnh nguyên tử', 'atomic context', 'Mọi nơi <code>preempt_count</code> khác 0: hardirq, softirq, đang giữ spinlock, preempt bị tắt. Không được ngủ.'],
      ['Ngữ cảnh tiến trình', 'process context', 'Mã chạy thay mặt một thread có PID — lời gọi hệ thống, <code>kworker</code>, thread <code>irq/N</code>. Được ngủ.']
    ] },

    /* ============================================================
       7. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: một ngắt, bốn hàm xử lý' },

    { t: 'p', x:
      'Bạn làm việc trong <code>~/bai55</code>. Bài dùng lại bốn thứ đã có và chỉ <b>đọc</b> chúng: kernel ' +
      'đã build ở <code>~/bai38/linux-6.18.45</code>, initramfs của Bài 32 ở <code>~/bai32/initramfs</code>, ' +
      'cây <code>board.dts</code>/<code>board.dtb</code> và <code>Makefile</code> của Bài 54 ở ' +
      '<code>~/bai54</code>. Nếu bạn đã xoá <code>~/bai54</code>, hãy làm lại bước 1 và 2 của Bài 54 trước.' },

    { t: 'cal', kind: 'info', title: 'Hai dấu nhắc trong cùng một cửa sổ QEMU',
      x: 'Các khối có nhãn QEMU trong bài này gõ vào một trong hai nơi. Phần lớn gõ ở dấu nhắc ' +
         '<code>~ #</code> của BusyBox bên trong máy ảo, như Bài 50–54. Riêng lệnh ' +
         '<code>system_powerdown</code> gõ ở <b>monitor</b> của QEMU (Bài 31): bấm <kbd>Ctrl</kbd>+<kbd>A</kbd>, ' +
         'nhả ra, bấm <kbd>C</kbd> — dấu nhắc đổi thành <code>(qemu)</code>. Gõ lệnh, Enter, rồi lại ' +
         '<kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>C</kbd> để quay về <code>~ #</code>. Khối lệnh monitor luôn được ' +
         'viết kèm dấu nhắc <code>(qemu)</code> trong phần output để bạn không nhầm.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Nhìn những ngắt đang chạy trước khi viết gì',
        blocks: [
          { t: 'p', x:
            'Boot máy ảo với cây của Bài 54, chưa sửa gì, và initramfs gốc của Bài 32 — không có module nào ' +
            'của bạn:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz -dtb ~/bai54/board.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Ở dấu nhắc <code>~ #</code>, đọc bảng ngắt của kernel:' },

          { t: 'code', where: 'qemu', code: 'cat /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '           CPU0       \n' +
            ' 11:        211 GIC-0  27 Level     arch_timer\n' +
            ' 13:          1 GIC-0  33 Level     uart-pl011\n' +
            ' 16:          0 GICv2m-PCI-MSIX-0000:00:01.0   0 Edge      virtio0-config\n' +
            ' 17:          0 GICv2m-PCI-MSIX-0000:00:01.0   1 Edge      virtio0-input.0\n' +
            ' 18:          0 GICv2m-PCI-MSIX-0000:00:01.0   2 Edge      virtio0-output.0\n' +
            ' 19:          0 GIC-0  34 Level     rtc-pl031\n' +
            ' 20:          0 GIC-0  23 Level     arm-pmu\n' +
            ' 21:          0 9030000.pl061   3 Edge      GPIO Key Poweroff\n' +
            'IPI0:         0       Rescheduling interrupts\n' +
            'IPI1:         0       Function call interrupts\n' +
            'IPI2:         0       CPU stop interrupts\n' +
            'IPI3:         0       CPU stop NMIs\n' +
            'IPI4:         0       Timer broadcast interrupts\n' +
            'IPI5:       150       IRQ work interrupts\n' +
            'IPI6:         0       CPU backtrace interrupts\n' +
            'IPI7:         0       KGDB roundup interrupts\n' +
            'Err:          0',
            notes: ['Số đếm ở cột thứ hai tăng liên tục, nên số của bạn sẽ khác (máy viết bài thấy 211–215 cho <code>arch_timer</code> ở các lần boot khác nhau). Các cột còn lại phải giống hệt.'] },

          { t: 'table',
            head: ['Cột', 'Ví dụ dòng <code>13</code>', 'Nghĩa'],
            rows: [
              ['1', '<code>13:</code>', 'Số IRQ <b>Linux</b>'],
              ['2', '<code>1</code>', 'Số lần ngắt đã đến, trên CPU0. Máy ảo chỉ có một CPU nên chỉ có một cột'],
              ['3', '<code>GIC-0</code>', 'Bộ điều khiển (IRQ domain) sở hữu đường này'],
              ['4', '<code>33</code>', '<code>hwirq</code> — số trong bộ điều khiển đó'],
              ['5', '<code>Level</code>', 'Kiểu kích hoạt'],
              ['6', '<code>uart-pl011</code>', 'Tham số <code>name</code> mà driver đưa cho <code>request_irq</code>']
            ] },

          { t: 'cal', kind: 'why', title: 'Kiểm lại công thức SPI + 32 bằng chính cây của bạn',
            x: 'Trong <code>~/bai54/board.dts</code>, node <code>pl011@9000000</code> có <code>interrupts = ' +
               '&lt;0x00 0x01 0x04&gt;</code>: SPI số 1, mức cao. 1 + 32 = <b>33</b> — đúng cột 4 của dòng ' +
               '<code>uart-pl011</code>. <code>pl031@9010000</code> có SPI 2 → <b>34</b>, dòng ' +
               '<code>rtc-pl031</code>. <code>arch_timer</code> là PPI (ngắt riêng của từng CPU), PPI đánh số ' +
               'từ 16, nên PPI 11 → <b>27</b>. Còn dòng <code>21</code> thuộc bộ điều khiển ' +
               '<code>9030000.pl061</code>, <code>hwirq</code> <b>3</b>: chân 3 của GPIO, do ' +
               '<code>gpio-keys</code> xin. Để ý số IRQ Linux (11, 13, 19, 21) không trùng với số nào trong ' +
               'cây. Các dòng <code>IPI</code> là ngắt giữa các CPU với nhau, gần như không dùng khi chỉ có ' +
               'một CPU; <code>virtio0-*</code> là card mạng virtio mà QEMU gắn mặc định.' },

          { t: 'p', x:
            'Giờ đếm nhịp của bộ định thời trong 4 giây, một lần khi máy rảnh và một lần khi có một vòng ' +
            'lặp chiếm hết CPU. Phải gắn devtmpfs trước (Bài 52), vì shell cần <code>/dev/null</code> để chạy ' +
            'lệnh nền:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'grep arch_timer /proc/interrupts; sleep 4; grep arch_timer /proc/interrupts\n' +
            'while :; do :; done &\n' +
            'grep arch_timer /proc/interrupts; sleep 4; grep arch_timer /proc/interrupts\n' +
            'kill $!' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep arch_timer /proc/interrupts; sleep 4; grep arch_timer /proc/interrupts\n' +
            ' 11:        245 GIC-0  27 Level     arch_timer\n' +
            ' 11:        278 GIC-0  27 Level     arch_timer\n' +
            '~ # while :; do :; done &\n' +
            '~ # grep arch_timer /proc/interrupts; sleep 4; grep arch_timer /proc/interrupts\n' +
            ' 11:        457 GIC-0  27 Level     arch_timer\n' +
            ' 11:       1462 GIC-0  27 Level     arch_timer\n' +
            '~ # kill $!' },

          { t: 'cmdx', cmd: 'while :; do :; done &',
            rows: [
              ['<code>:</code>', 'Lệnh có sẵn của shell không làm gì và luôn thành công.', 'Dùng làm điều kiện <code>while</code> thì vòng lặp không bao giờ dừng'],
              ['<code>do :; done</code>', 'Thân vòng lặp cũng là <code>:</code>.', 'Không gọi chương trình nào, không đọc ghi gì — chỉ đốt CPU'],
              ['<code>&amp;</code>', 'Chạy nền, trả lại dấu nhắc ngay.', 'Shell này không có job control (<code>can\'t access tty</code>), nên dừng nó bằng <code>kill $!</code> — <code>$!</code> là PID của lệnh nền gần nhất — thay vì <code>kill %1</code>']
            ] },

          { t: 'cal', kind: 'why', title: '33 lần khi rảnh, 1 005 lần khi bận',
            x: 'Khi rảnh: 278 − 245 = <b>33</b> ngắt trong 4 giây, khoảng 8 lần một giây. Khi bận: 1 462 − 457 ' +
               '= <b>1 005</b>, khoảng 251 lần một giây — đúng <code>CONFIG_HZ=250</code>. Ba lần boot của ' +
               'máy viết bài cho 32–35 và 1 005 ở cả ba. Lý do là <code>CONFIG_NO_HZ_IDLE=y</code>: khi không ' +
               'còn việc gì, kernel hẹn bộ định thời reo ở lần cần thiết tiếp theo thay vì mỗi 4 ms, để CPU ' +
               'ngủ lâu hơn. Có một tiến trình cần chia CPU, kernel phải quay lại nhịp đều 250 Hz để còn cắt ' +
               'lượt. Trên thiết bị chạy pin, con số 33 so với 1 005 là thứ quyết định pin dùng được mấy ngày.' },

          { t: 'p', x:
            'Cuối cùng, bắn chính ngắt mà bài này sẽ dùng. Đọc bộ đếm của dòng <code>pl061</code>, chuyển sang ' +
            'monitor, bấm nút nguồn ảo, quay về, đọc lại — hai lần:' },

          { t: 'code', where: 'qemu', code:
            'grep -e CPU0 -e pl061 /proc/interrupts\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)\n' +
            'grep pl061 /proc/interrupts\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)\n' +
            'grep pl061 /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep -e CPU0 -e pl061 /proc/interrupts\n' +
            '           CPU0       \n' +
            ' 21:          0 9030000.pl061   3 Edge      GPIO Key Poweroff\n' +
            '~ # QEMU 4.2.1 monitor - type \'help\' for more information\n' +
            '(qemu) system_powerdown\n' +
            '(qemu) \n' +
            '~ # grep pl061 /proc/interrupts\n' +
            ' 21:          2 9030000.pl061   3 Edge      GPIO Key Poweroff\n' +
            '~ # grep pl061 /proc/interrupts\n' +
            ' 21:          4 9030000.pl061   3 Edge      GPIO Key Poweroff',
            notes: ['Bản ghi này đã được lọc bỏ các mã điều khiển terminal mà dấu nhắc <code>(qemu)</code> in ra khi vẽ lại từng ký tự bạn gõ. Lần bấm thứ hai trông giống hệt lần đầu nên không lặp lại.'] },

          { t: 'cal', kind: 'why', title: 'Một lần bấm, bộ đếm tăng 2',
            x: 'Bộ đếm đi <b>0 → 2 → 4</b>. Nút nguồn ảo tạo một <b>xung</b>: chân 3 lên 1 rồi về 0. ' +
               '<code>gpio-keys</code> cần biết cả lúc phím được bấm lẫn lúc được nhả, nên xin ngắt ở <b>cả ' +
               'hai sườn</b> (<code>IRQF_TRIGGER_RISING | IRQF_TRIGGER_FALLING</code>, ' +
               '<code>drivers/input/keyboard/gpio_keys.c</code> dòng 599) — một xung, hai ngắt. Cột 5 vẫn ghi ' +
               '<code>Edge</code> vì <code>/proc/interrupts</code> không phân biệt một sườn với hai sườn. ' +
               'Máy ảo không tắt: <code>gpio-keys</code> biến ngắt thành phím <code>KEY_POWER</code> ' +
               '(<code>linux,code = &lt;0x74&gt;</code> = 116), và initramfs của Bài 32 không có chương trình ' +
               'nào nghe phím đó. Node của bạn ở bước 2 sẽ chỉ xin sườn lên.' },

          { t: 'p', x:
            'Mỗi IRQ cũng có một thư mục riêng trong <code>/proc/irq</code>, và <code>/proc/softirqs</code> đếm ' +
            'mười loại softirq:' },

          { t: 'code', where: 'qemu', code:
            'ls /proc/irq\n' +
            'ls /proc/irq/21\n' +
            'cat /proc/softirqs' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /proc/irq\n' +
            '1                     18                    5\n' +
            '10                    19                    6\n' +
            '11                    2                     7\n' +
            '12                    20                    8\n' +
            '13                    21                    9\n' +
            '16                    3                     default_smp_affinity\n' +
            '17                    4\n' +
            '~ # ls /proc/irq/21\n' +
            'GPIO Key Poweroff        effective_affinity_list  smp_affinity_list\n' +
            'affinity_hint            node                     spurious\n' +
            'effective_affinity       smp_affinity\n' +
            '~ # cat /proc/softirqs\n' +
            '                    CPU0       \n' +
            '          HI:          0\n' +
            '       TIMER:        274\n' +
            '      NET_TX:          0\n' +
            '      NET_RX:          0\n' +
            '       BLOCK:          0\n' +
            '    IRQ_POLL:          0\n' +
            '     TASKLET:          5\n' +
            '       SCHED:          0\n' +
            '     HRTIMER:          0\n' +
            '         RCU:        406',
            notes: ['Số đếm trong <code>/proc/softirqs</code> khác nhau giữa các lần boot.'] },

          { t: 'p', x:
            '<code>/proc/irq</code> có 19 mục đánh số, nhiều hơn 8 dòng số trong <code>/proc/interrupts</code>: ' +
            '<code>/proc/interrupts</code> chỉ in những IRQ đang có handler, còn <code>/proc/irq</code> liệt kê ' +
            'mọi IRQ kernel đã cấp số. Trong thư mục <code>21</code>, mục <code>GPIO Key Poweroff</code> là một ' +
            'thư mục con mang đúng tên handler — mỗi handler đăng ký thêm một mục. <code>/proc/softirqs</code> ' +
            'in đúng mười loại theo đúng thứ tự trong <code>kernel/softirq.c</code>. <code>TIMER</code> và ' +
            '<code>RCU</code> chạy hàng trăm lần; <code>TASKLET</code> mới 5 lần, tất cả của chính kernel. ' +
            'Tắt máy ảo bằng <code>poweroff -f</code>.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Nối một node cảm biến vào chân 3',
        blocks: [
          { t: 'p', x:
            'Node mới cần hai thứ mà cây hiện tại chưa có. Thứ nhất, PL061 phải khai mình là một bộ điều ' +
            'khiển ngắt, nếu không thì không node nào trỏ <code>interrupt-parent</code> vào nó được. Thứ hai, ' +
            'chân 3 phải được trả lại: <code>gpio-keys</code> đang giữ nó với kiểu hai sườn, và một chân không ' +
            'thể cùng lúc mang hai kiểu kích hoạt. Thay vì chép lại cả cây, bạn viết một file nhỏ ' +
            '<b><code>/include/</code></b> cây của Bài 54 rồi ghi đè lên — đúng ba công cụ Bài 43 đã dạy: ' +
            '<code>/include/</code>, ghi đè qua <code>&amp;label</code>, và <code>/delete-node/</code>.' },

          { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai55/talarm && cd ~/bai55' },

          { t: 'code', where: 'file', name: '~/bai55/alarm.dts', lang: 'text', code:
            '/include/ "../bai54/board.dts"\n' +
            '\n' +
            '&gpio0 {\n' +
            '\tinterrupt-controller;\n' +
            '\t#interrupt-cells = <2>;\n' +
            '};\n' +
            '\n' +
            '/ {\n' +
            '\t/delete-node/ gpio-keys;\n' +
            '\n' +
            '\talarm@b004000 {\n' +
            '\t\tcompatible = "learn,temp-alarm";\n' +
            '\t\treg = <0x00 0xb004000 0x00 0x1000>;\n' +
            '\t\tinterrupt-parent = <&gpio0>;\n' +
            '\t\tinterrupts = <3 1>;\n' +
            '\t};\n' +
            '};' },

          { t: 'table',
            head: ['Dòng', 'Vì sao'],
            rows: [
              ['<code>/include/ \"../bai54/board.dts\"</code>', 'Đường dẫn tính từ thư mục chứa <code>alarm.dts</code>. Nhãn <code>gpio0:</code> mà Bài 54 thêm vào dòng 273 đi theo sang đây'],
              ['<code>interrupt-controller;</code>', 'Property rỗng (Bài 43): chỉ cần có mặt. Không có nó, kernel không coi PL061 là nơi dịch ngắt'],
              ['<code>#interrupt-cells = &lt;2&gt;</code>', 'Mỗi ngắt con mô tả bằng 2 ô: số chân, cờ kiểu kích hoạt — theo binding của PL061. So với 3 ô của GIC'],
              ['<code>/delete-node/ gpio-keys;</code>', 'Trả chân 3. Bỏ dòng này thì bước 4 hỏng — xem Lỗi thường gặp'],
              ['<code>interrupt-parent = &lt;&amp;gpio0&gt;</code>', 'Gốc cây có <code>interrupt-parent = &lt;0x8001&gt;</code> (GIC) và mọi node thừa hưởng nó. Phải ghi đè, nếu không <code>&lt;3 1&gt;</code> sẽ bị GIC đọc theo luật 3 ô'],
              ['<code>interrupts = &lt;3 1&gt;</code>', 'Chân 3, <code>IRQ_TYPE_EDGE_RISING</code> — chỉ sườn lên'],
              ['<code>reg = &lt;… 0xb004000 …&gt;</code>', 'Địa chỉ tiếp theo sau bốn cảm biến của Bài 54. Driver bài này không dùng nó; có để tên thiết bị là <code>b004000.alarm</code>']
            ] },

          { t: 'p', x:
            'Dịch sang <code>.dtb</code> và đọc lại từ file nhị phân để chắc <code>dtc</code> đã mã hoá đúng ý bạn:' },

          { t: 'code', where: 'wsl', code:
            'dtc -q -I dts -O dtb -o alarm.dtb alarm.dts\n' +
            'ls -l alarm.dtb\n' +
            'fdtget alarm.dtb /pl061@9030000 \'#interrupt-cells\'\n' +
            'fdtget alarm.dtb /alarm@b004000 interrupt-parent\n' +
            'fdtget alarm.dtb /pl061@9030000 phandle\n' +
            'fdtget alarm.dtb /alarm@b004000 interrupts\n' +
            'fdtget -l alarm.dtb / | grep -c gpio-keys' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 8069 Sep 30 12:22 alarm.dtb\n' +
            '2\n' +
            '32771\n' +
            '32771\n' +
            '3 1\n' +
            '0',
            notes: ['Ngày giờ và tên người dùng sẽ khác trên máy bạn; kích thước 8 069 byte thì không.'] },

          { t: 'cmdx', cmd: "fdtget -l alarm.dtb / | grep -c gpio-keys",
            rows: [
              ['<code>fdtget -l</code>', 'Liệt kê tên các node con của đường dẫn đã cho, mỗi tên một dòng.', 'Không in property'],
              ['<code>/</code>', 'Gốc cây.', '<code>gpio-keys</code> nằm ngay dưới gốc'],
              ['<code>grep -c</code>', 'Đếm số dòng khớp thay vì in chúng.', 'In <code>0</code> và trả mã thoát 1 khi không có dòng nào — ở đây đó là điều bạn muốn']
            ] },

          { t: 'p', x:
            'Năm con số xác nhận năm điều: PL061 giờ nhận ngắt con 2 ô; <code>interrupt-parent</code> của node ' +
            'mới là <b>32771</b> = <code>0x8003</code>, đúng bằng <code>phandle</code> của PL061 (Bài 45 đã thấy ' +
            'PL061 giữ phandle <code>0x8003</code>) — tức <code>&amp;gpio0</code> đã được thay bằng số; ' +
            '<code>interrupts</code> đúng hai ô <code>3 1</code>; và <code>gpio-keys</code> không còn trong cây. ' +
            '<code>-q</code> tắt năm cảnh báo có sẵn trong phần cây do QEMU sinh, mà Bài 45 đã đọc từng cái; ' +
            'không có cảnh báo nào cho node mới.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Viết driver talarm và ba biến thể của nó',
        blocks: [
          { t: 'p', x:
            'Driver phục vụ <code>learn,temp-alarm</code>. Nó là một platform driver như Bài 54, nhưng thứ duy ' +
            'nhất nó xin từ node là ngắt. Mỗi hàm gọi <code>ta_where()</code> để in: tên và PID của thread ' +
            'đang chạy (<code>current</code>), <code>preempt_count</code>, ngắt có đang tắt không, ba hàm hỏi ' +
            'ngữ cảnh, và bao nhiêu micro giây đã trôi qua kể từ top half. Hai khối ' +
            '<code>#ifdef</code> là hai biến thể bạn sẽ build riêng.' },

          { t: 'code', where: 'file', name: '~/bai55/talarm/talarm.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * Temperature alarm for "learn,temp-alarm" Device Tree nodes.\n' +
            ' * One interrupt, four handlers: the top half, a tasklet, a work item\n' +
            ' * and an IRQ thread. Each one reports the context it runs in.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/of.h>\n' +
            '#include <linux/interrupt.h>\n' +
            '#include <linux/workqueue.h>\n' +
            '#include <linux/delay.h>\n' +
            '#include <linux/ktime.h>\n' +
            '#include <linux/sched.h>\n' +
            '\n' +
            'struct ta_dev {\n' +
            '\tstruct device *dev;\n' +
            '\tint irq;\n' +
            '\tunsigned int count;         /* written by the top half only */\n' +
            '\tktime_t t_top;              /* when the top half ran */\n' +
            '\tstruct tasklet_struct tasklet;\n' +
            '\tstruct work_struct work;\n' +
            '};\n' +
            '\n' +
            '/* Who is running this code, in which context, how long after the top half */\n' +
            'static void ta_where(struct ta_dev *ta, const char *who)\n' +
            '{\n' +
            '\ts64 us = ktime_us_delta(ktime_get(), ta->t_top);\n' +
            '\n' +
            '\tdev_info(ta->dev, "%-7s #%u %s/%d preempt=0x%08x irqs_off=%d hardirq=%d softirq=%d task=%d +%lld us\\n",\n' +
            '\t\t who, ta->count, current->comm, current->pid, preempt_count(),\n' +
            '\t\t irqs_disabled(), !!in_hardirq(), !!in_serving_softirq(),\n' +
            '\t\t !!in_task(), us);\n' +
            '}\n' +
            '\n' +
            '/* Top half: interrupts are off on this CPU, so do the minimum and leave */\n' +
            'static irqreturn_t ta_top(int irq, void *data)\n' +
            '{\n' +
            '\tstruct ta_dev *ta = data;\n' +
            '\n' +
            '\tta->t_top = ktime_get();\n' +
            '\tta->count++;\n' +
            '\tta_where(ta, "top");\n' +
            '#ifdef SHOW_STACK\n' +
            '\tif (ta->count == 1)\n' +
            '\t\tdump_stack();       /* the path from the CPU exception to here */\n' +
            '#endif\n' +
            '\ttasklet_schedule(&ta->tasklet);\n' +
            '\tschedule_work(&ta->work);\n' +
            '\treturn IRQ_WAKE_THREAD;     /* also wake ta_thread */\n' +
            '}\n' +
            '\n' +
            '/* Bottom half 1: softirq context, interrupts on, still must not sleep */\n' +
            'static void ta_tasklet(struct tasklet_struct *t)\n' +
            '{\n' +
            '\tstruct ta_dev *ta = from_tasklet(ta, t, tasklet);\n' +
            '\n' +
            '\tta_where(ta, "tasklet");\n' +
            '#ifdef SLEEP_IN_TASKLET\n' +
            '\tmsleep(10);                 /* forbidden here: see lesson 55, step 5 */\n' +
            '#endif\n' +
            '}\n' +
            '\n' +
            '/* Bottom half 2: a kworker thread, process context, may sleep */\n' +
            'static void ta_work(struct work_struct *w)\n' +
            '{\n' +
            '\tstruct ta_dev *ta = container_of(w, struct ta_dev, work);\n' +
            '\n' +
            '\tta_where(ta, "work");\n' +
            '}\n' +
            '\n' +
            '/* Bottom half 3: this device\'s own IRQ thread, may sleep */\n' +
            'static irqreturn_t ta_thread(int irq, void *data)\n' +
            '{\n' +
            '\tstruct ta_dev *ta = data;\n' +
            '\n' +
            '\tta_where(ta, "thread");\n' +
            '\tmsleep(20);                 /* allowed: process context */\n' +
            '\tta_where(ta, "thread");\n' +
            '\treturn IRQ_HANDLED;\n' +
            '}\n' +
            '\n' +
            'static void ta_kill_tasklet(void *data)\n' +
            '{\n' +
            '\ttasklet_kill(data);\n' +
            '}\n' +
            '\n' +
            'static void ta_cancel_work(void *data)\n' +
            '{\n' +
            '\tcancel_work_sync(data);\n' +
            '}\n' +
            '\n' +
            'static int ta_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '\tstruct device *dev = &pdev->dev;\n' +
            '\tstruct ta_dev *ta;\n' +
            '\tint ret;\n' +
            '\n' +
            '\tta = devm_kzalloc(dev, sizeof(*ta), GFP_KERNEL);\n' +
            '\tif (!ta)\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tta->dev = dev;\n' +
            '\n' +
            '\t/* "interrupts" in DT was already translated to a Linux IRQ number */\n' +
            '\tta->irq = platform_get_irq(pdev, 0);\n' +
            '\tif (ta->irq < 0)\n' +
            '\t\treturn ta->irq;\n' +
            '\n' +
            '\t/* Register the undo actions first: devres runs them last, after free_irq */\n' +
            '\ttasklet_setup(&ta->tasklet, ta_tasklet);\n' +
            '\tret = devm_add_action_or_reset(dev, ta_kill_tasklet, &ta->tasklet);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\tINIT_WORK(&ta->work, ta_work);\n' +
            '\tret = devm_add_action_or_reset(dev, ta_cancel_work, &ta->work);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\n' +
            '\tret = devm_request_threaded_irq(dev, ta->irq, ta_top, ta_thread,\n' +
            '\t\t\t\t\t0, "talarm", ta);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\n' +
            '\tdev_info(dev, "irq %d ready\\n", ta->irq);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id ta_of_match[] = {\n' +
            '\t{ .compatible = "learn,temp-alarm" },\n' +
            '\t{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, ta_of_match);\n' +
            '\n' +
            'static struct platform_driver ta_driver = {\n' +
            '\t.probe  = ta_probe,\n' +
            '\t.driver = {\n' +
            '\t\t.name           = "talarm",\n' +
            '\t\t.of_match_table = ta_of_match,\n' +
            '\t},\n' +
            '};\n' +
            'module_platform_driver(ta_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("Temperature alarm: one IRQ, top half and three bottom halves");' },

          { t: 'cal', kind: 'why', title: 'Thứ tự trong ta_probe là thứ tự tháo dỡ ngược lại',
            x: 'Bài 54 đã chứng minh devres trả tài nguyên <b>ngược thứ tự xin</b>. Ở đây thứ tự đó quyết định ' +
               'tính đúng đắn. <code>devm_request_threaded_irq</code> được gọi <b>sau cùng</b>, nên khi ' +
               '<code>rmmod</code> nó được tháo <b>trước tiên</b>: <code>free_irq</code> chạy, chờ top half và ' +
               'thread đang chạy dở kết thúc, và từ đó không ai gọi <code>tasklet_schedule</code> hay ' +
               '<code>schedule_work</code> nữa. Chỉ khi đó mới tới <code>cancel_work_sync</code> rồi ' +
               '<code>tasklet_kill</code>, chờ bottom half cuối cùng chạy xong. Đảo thứ tự thì có một khe hở: ' +
               'tasklet đã bị huỷ, nhưng một ngắt đến muộn xếp nó vào hàng lần nữa — và nó chạy sau khi mã của ' +
               'module đã bị gỡ. Driver không có hàm <code>remove</code> nào vì không còn gì để làm tay.' },

          { t: 'p', x:
            'Makefile là của Bài 54 với tên module đổi đi, rồi build:' },

          { t: 'code', where: 'wsl', code:
            'sed \'s/tsensor/talarm/g\' ~/bai54/tsensor/Makefile > talarm/Makefile\n' +
            'head -n 2 talarm/Makefile\n' +
            'cd talarm && make && cd ..\n' +
            'ls -l talarm/talarm.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'obj-m := talarm.o\n' +
            'CFLAGS_talarm.o := -DDEBUG\n' +
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai55/talarm ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai55/talarm\'\n' +
            '  CC [M]  talarm.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  talarm.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  talarm.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai55/talarm\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 131056 Sep 30 12:22 talarm/talarm.ko',
            notes: ['<code>/home/cah8hc</code> là thư mục nhà của máy viết bài. Trên máy đó <code>~/bai38</code> là một liên kết mềm vào <code>~/embedded-course/bai38</code>, nên dòng <code>Entering directory</code> in đường dẫn thật; trên máy bạn nó là <code>/home/&lt;tên bạn&gt;/bai38/…</code>.'] },

          { t: 'p', x:
            'Năm dòng <code>CC</code>/<code>MODPOST</code>/<code>LD</code> giống hệt Bài 50–54, không một cảnh ' +
            'báo. Xem module cần những hàm nào từ kernel — đây là danh sách API ngắt và bottom half bạn vừa ' +
            'dùng, nhìn từ phía trình liên kết:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-nm -u talarm/talarm.ko | grep -e irq -e tasklet -e work -e msleep' },

          { t: 'code', where: 'out', nocopy: true, code:
            '                 U cancel_work_sync\n' +
            '                 U devm_request_threaded_irq\n' +
            '                 U msleep\n' +
            '                 U platform_get_irq\n' +
            '                 U queue_work_on\n' +
            '                 U tasklet_kill\n' +
            '                 U __tasklet_schedule\n' +
            '                 U tasklet_setup' },

          { t: 'p', x:
            'Hai tên không có trong mã của bạn: <code>queue_work_on</code> và <code>__tasklet_schedule</code>. ' +
            '<code>schedule_work</code> và <code>tasklet_schedule</code> là hàm <code>static inline</code> trong ' +
            'header, và chúng gọi hai hàm này — giống <code>kmalloc</code> → <code>__kmalloc_noprof</code> ở ' +
            'Bài 51. <code>devm_request_irq</code> cũng không xuất hiện được, vì nó chỉ là lối tắt tới ' +
            '<code>devm_request_threaded_irq</code>.' },

          { t: 'p', x:
            'Build hai biến thể, mỗi cái trong một thư mục riêng, bằng cách định nghĩa macro từ dòng lệnh ' +
            'thay vì sửa file:' },

          { t: 'code', where: 'wsl', code:
            'for v in stack sleep; do mkdir -p v/$v && cp talarm/talarm.c talarm/Makefile v/$v/; done\n' +
            'make -C v/stack KCFLAGS=-DSHOW_STACK | grep \'LD \'\n' +
            'make -C v/sleep KCFLAGS=-DSLEEP_IN_TASKLET | grep \'LD \'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  LD [M]  talarm.ko\n' +
            '  LD [M]  talarm.ko' },

          { t: 'cmdx', cmd: 'make -C v/stack KCFLAGS=-DSHOW_STACK',
            rows: [
              ['<code>-C v/stack</code>', 'Chuyển vào <code>v/stack</code> rồi mới đọc Makefile ở đó.', 'Makefile dùng <code>$(CURDIR)</code>, nên <code>M=</code> tự trỏ đúng thư mục mới'],
              ['<code>KCFLAGS=</code>', 'Biến mà Kbuild nối vào cuối cờ biên dịch của mọi file C.', 'Cách chuẩn để thêm cờ tạm thời mà không sửa Makefile'],
              ['<code>-DSHOW_STACK</code>', 'Định nghĩa macro <code>SHOW_STACK</code>, như viết <code>#define SHOW_STACK</code> ở đầu file.', 'Khối <code>#ifdef SHOW_STACK</code> trong <code>ta_top</code> được biên dịch']
            ] },

          { t: 'p', x:
            'Ba file cùng tên <code>talarm.ko</code> và cùng tên module <code>talarm</code> (Bài 52: đổi tên ' +
            'file không đổi tên module), nên mỗi lần chỉ nạp được một cái. Đóng gói cả ba vào initramfs với ' +
            'tên file khác nhau:' },

          { t: 'code', where: 'wsl', code:
            'rm -rf initramfs && cp -a ~/bai32/initramfs initramfs\n' +
            'cp talarm/talarm.ko initramfs/\n' +
            'cp v/stack/talarm.ko initramfs/talarm_stack.ko\n' +
            'cp v/sleep/talarm.ko initramfs/talarm_sleep.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4640 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1122131 Sep 30 12:22 initramfs.cpio.gz',
            notes: ['Kích thước file nén có thể lệch vài byte giữa các lần đóng gói vì cpio ghi cả thời điểm sửa file. <code>4640 blocks</code> là số khối 512 byte của gói cpio trước khi nén.'] }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Bắn ngắt, nhìn bốn hàm chạy ở bốn nơi',
        blocks: [
          { t: 'p', x:
            'Boot với cây mới và initramfs mới. So với bước 1, chỉ hai đường dẫn đổi:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai55\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb alarm.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Gắn devtmpfs (bước này cũng chạy một vòng lặp nền), rồi kiểm tra thiết bị đã có và chân 3 đang ' +
            'trống trước khi nạp gì:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls /sys/bus/platform/devices | grep alarm\n' +
            'grep -c 9030000 /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/platform/devices | grep alarm\n' +
            'alarmtimer.0.auto\n' +
            'b004000.alarm\n' +
            '~ # grep -c 9030000 /proc/interrupts\n' +
            '0' },

          { t: 'p', x:
            '<code>b004000.alarm</code> là thiết bị sinh từ node của bạn, đúng cách Bài 54 đã thấy. ' +
            '<code>alarmtimer.0.auto</code> chỉ tình cờ chứa chữ <code>alarm</code>: nó là bộ hẹn giờ báo thức ' +
            'của chính kernel, không liên quan. <code>0</code> dòng mang <code>9030000</code>: không còn ai ' +
            'giữ ngắt nào của PL061 — <code>gpio-keys</code> đã biến mất cùng node của nó. Nạp driver và đọc ' +
            'lại:' },

          { t: 'code', where: 'qemu', code:
            'insmod /talarm.ko\n' +
            'grep -e CPU0 -e talarm /proc/interrupts\n' +
            'cat /sys/kernel/irq/21/hwirq /sys/kernel/irq/21/type\n' +
            'for i in 11 13 14 19 21; do echo "$i hwirq=$(cat /sys/kernel/irq/$i/hwirq) actions=$(cat /sys/kernel/irq/$i/actions)"; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /talarm.ko\n' +
            '[    5.731606] talarm: loading out-of-tree module taints kernel.\n' +
            '[    5.737108] talarm b004000.alarm: irq 21 ready\n' +
            '~ # grep -e CPU0 -e talarm /proc/interrupts\n' +
            '           CPU0       \n' +
            ' 21:          0 9030000.pl061   3 Edge      talarm\n' +
            '~ # cat /sys/kernel/irq/21/hwirq /sys/kernel/irq/21/type\n' +
            '3\n' +
            'edge\n' +
            '~ # for i in 11 13 14 19 21; do echo "$i hwirq=$(cat /sys/kernel/irq/$i/hwirq) actions=$(cat /sys/kernel/irq/$i/actions)"; done\n' +
            '11 hwirq=27 actions=arch_timer\n' +
            '13 hwirq=33 actions=uart-pl011\n' +
            '14 hwirq=39 actions=(null)\n' +
            '19 hwirq=34 actions=rtc-pl031\n' +
            '21 hwirq=3 actions=talarm',
            notes: ['Số trong ngoặc vuông là thời điểm tính từ lúc boot, sẽ khác trên máy bạn. Số IRQ 21 thì giống, vì nó chỉ phụ thuộc cây và kernel.'] },

          { t: 'cal', kind: 'why', title: 'Số 21 ở đâu ra, và IRQ 14 đang trốn ở đâu',
            x: '<code>platform_get_irq</code> dịch <code>&lt;3 1&gt;</code> thành IRQ Linux <b>21</b> — cùng số mà ' +
               '<code>gpio-keys</code> nhận ở bước 1, vì cùng chân của cùng bộ điều khiển. Dòng ' +
               '<code>talarm</code> ghi kiểu <code>Edge</code>, <code>/sys/kernel/irq/21/type</code> ghi ' +
               '<code>edge</code>, <code>hwirq</code> <b>3</b>. Vòng <code>for</code> in <code>/sys/kernel/irq</code> ' +
               '— thư mục chứa mọi IRQ, kể cả thứ <code>/proc/interrupts</code> giấu. IRQ <b>14</b> có ' +
               '<code>hwirq</code> <b>39</b> = SPI 7 + 32: chính là dây của PL061 lên GIC. Nó có mặt, có số, ' +
               'nhưng không có tên handler (<code>(null)</code>) và không có dòng trong ' +
               '<code>/proc/interrupts</code>, vì <code>kernel/irq/proc.c</code> dòng 481 bỏ qua mọi IRQ ' +
               '<i>chained</i>: handler của nó là <code>pl061_irq_handler</code>, gắn thẳng, không qua ' +
               '<code>request_irq</code>. Đó là tầng giữa của hình ở phần lý thuyết.' },

          { t: 'p', x:
            'Thread của threaded IRQ đã được tạo ngay lúc <code>request</code>, trước khi có ngắt nào. Tìm nó ' +
            'và đọc chính sách lập lịch của nó từ <code>/proc/PID/stat</code>:' },

          { t: 'code', where: 'qemu', code:
            'ps | grep irq/\n' +
            'cut -d" " -f2,18,41 /proc/$(pidof irq/21-talarm)/stat' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ps | grep irq/\n' +
            '   59 0        [irq/21-talarm]\n' +
            '   73 0        grep irq/\n' +
            '~ # cut -d" " -f2,18,41 /proc/$(pidof irq/21-talarm)/stat\n' +
            '(irq/21-talarm) -51 1',
            notes: ['PID 59 và 73 sẽ khác trên máy bạn.'] },

          { t: 'cmdx', cmd: 'cut -d" " -f2,18,41 /proc/$(pidof irq/21-talarm)/stat',
            rows: [
              ['<code>pidof irq/21-talarm</code>', 'In PID của tiến trình có tên đó.', '<code>$( )</code> thay nó vào đường dẫn: <code>/proc/59/stat</code>'],
              ['<code>/proc/PID/stat</code>', 'Một dòng, các trường cách nhau bằng dấu cách.', 'Thứ tự trường ghi trong <code>man 5 proc</code>'],
              ['<code>-d" " -f2,18,41</code>', 'Cắt theo dấu cách, lấy trường 2, 18 và 41.', '2 = tên, 18 = <code>priority</code>, 41 = <code>policy</code>. Đếm đúng vì tên <code>(irq/21-talarm)</code> không chứa dấu cách']
            ] },

          { t: 'p', x:
            '<code>1</code> ở trường 41 là <code>SCHED_FIFO</code> — lập lịch thời gian thực. <code>-51</code> ' +
            'ở trường 18 là cách kernel viết mức ưu tiên thời gian thực <b>50</b> (với tác vụ thời gian thực, ' +
            'trường này bằng −1 − mức): đúng <code>MAX_RT_PRIO / 2</code> mà <code>sched_set_fifo</code> đặt. ' +
            'Một tiến trình thường có <code>policy</code> 0 và <code>priority</code> 20.' },

          { t: 'p', x:
            'Giờ bắn ngắt. Đếm tasklet trước và sau để thấy bottom half đầu tiên đi qua <code>/proc/softirqs</code>:' },

          { t: 'code', where: 'qemu', code:
            'grep TASKLET /proc/softirqs\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)\n' +
            'grep talarm /proc/interrupts\n' +
            'grep TASKLET /proc/softirqs' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep TASKLET /proc/softirqs\n' +
            '     TASKLET:          1\n' +
            '(qemu) system_powerdown\n' +
            '(qemu) [   10.414106] talarm b004000.alarm: top     #1 swapper/0/0 preempt=0x00010001 irqs_off=1 hardirq=1 softirq=0 task=0 +52 us\n' +
            '[   10.415589] talarm b004000.alarm: tasklet #1 swapper/0/0 preempt=0x00000101 irqs_off=0 hardirq=0 softirq=1 task=0 +1691 us\n' +
            '[   10.416239] talarm b004000.alarm: thread  #1 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +2341 us\n' +
            '[   10.418338] talarm b004000.alarm: work    #1 kworker/0:1/11 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +4451 us\n' +
            '[   10.438795] talarm b004000.alarm: thread  #1 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +24872 us\n' +
            '~ # grep talarm /proc/interrupts\n' +
            ' 21:          1 9030000.pl061   3 Edge      talarm\n' +
            '~ # grep TASKLET /proc/softirqs\n' +
            '     TASKLET:          2',
            notes: ['Năm dòng <code>talarm</code> in ra console ngay khi ngắt đến, lúc bạn còn ở dấu nhắc <code>(qemu)</code> — chúng là <code>dev_info</code>, mức 6, và <code>console_loglevel</code> là 7 (Bài 51). Mọi số micro giây và PID sẽ khác trên máy bạn; thứ tự và các giá trị <code>preempt</code>/<code>irqs_off</code>/<code>hardirq</code>/<code>softirq</code>/<code>task</code> thì không.'] },

          { t: 'cal', kind: 'why', title: 'Đọc năm dòng như đọc một biên bản',
            x: '<ul>' +
               '<li><b><code>top</code></b>: chạy dưới tên <code>swapper/0/0</code> — vòng lặp nhàn rỗi PID 0 — vì ' +
               'CPU đang rảnh khi bị cắt ngang. <code>irqs_off=1</code>, <code>hardirq=1</code>, ' +
               '<code>preempt=0x00010001</code>. Nó chạy <b>52 µs</b> sau lúc chính nó ghi ' +
               '<code>t_top</code> — thời gian đó là <code>dev_info</code> đang in.</li>' +
               '<li><b><code>tasklet</code></b>: vẫn <code>swapper/0/0</code>, nhưng <code>irqs_off=0</code>, ' +
               '<code>softirq=1</code>, <code>preempt=0x00000101</code>. Ngắt đã bật lại, mã vẫn mượn CPU của ' +
               'kẻ bị cắt ngang. <code>TASKLET</code> trong <code>/proc/softirqs</code> tăng đúng 1 → 2.</li>' +
               '<li><b><code>thread</code></b>: tên đổi thành <code>irq/21-talarm/59</code> — PID bạn vừa thấy ' +
               'trong <code>ps</code>. <code>preempt=0x00000000</code>, <code>task=1</code>.</li>' +
               '<li><b><code>work</code></b>: <code>kworker/0:1/11</code>, một thread dùng chung, cũng ' +
               '<code>0x00000000</code>.</li>' +
               '<li><b><code>thread</code> lần hai</b>: <b>24 872 µs</b>, tức hơn 22 ms sau lần in đầu. Giữa hai ' +
               'dòng là <code>msleep(20)</code>: thread đã <b>ngủ thật</b>, nhường CPU, được đánh thức lại, và ' +
               'không có gì hỏng. Đó là lý do nó tồn tại.</li>' +
               '</ul>' +
               '<code>/proc/interrupts</code> tăng <b>1</b>, không phải 2 như <code>gpio-keys</code> ở bước 1: node ' +
               'của bạn chỉ xin sườn lên.' },

          { t: 'p', x:
            'Bắn lần nữa, lần này khi một chương trình đang chiếm CPU, để thấy \"kẻ bị cắt ngang\" đổi tên:' },

          { t: 'code', where: 'qemu', code:
            'while :; do :; done &\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)\n' +
            'kill $!' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(qemu) [   15.725642] talarm b004000.alarm: top     #2 sh/79 preempt=0x00010000 irqs_off=1 hardirq=1 softirq=0 task=0 +1 us\n' +
            '[   15.725878] talarm b004000.alarm: tasklet #2 sh/79 preempt=0x00000100 irqs_off=0 hardirq=0 softirq=1 task=0 +256 us\n' +
            '[   15.725970] talarm b004000.alarm: thread  #2 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +350 us\n' +
            '[   15.726028] talarm b004000.alarm: work    #2 kworker/0:1/11 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +409 us\n' +
            '[   15.749889] talarm b004000.alarm: thread  #2 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +24258 us' },

          { t: 'cal', kind: 'info', title: 'Top half và tasklet mang tên của sh',
            x: '<code>sh/79</code> là shell con đang chạy vòng lặp (PID sẽ khác trên máy bạn). Nó không gọi ' +
               'hàm nào của bạn — nó chỉ tình cờ đang giữ CPU khi ngắt đến, nên <code>current</code> trỏ vào ' +
               'nó. Đây là minh chứng rõ nhất vì sao top half không được ngủ: \"ngủ\" lúc này nghĩa là bắt ' +
               '<code>sh</code> ngủ thay cho bạn. <code>preempt</code> cũng mất số 1 cuối: <code>0x00010000</code> ' +
               'và <code>0x00000100</code>, vì <code>sh</code> không phải vòng lặp nhàn rỗi. Thread và work vẫn ' +
               'được chạy dù CPU đang bận: thread vì là <code>SCHED_FIFO</code>, luôn chen trước tiến trình ' +
               'thường; work ở lần đo này cũng nhanh, nhưng <code>kworker</code> là tiến trình thường nên trên ' +
               'một máy đông việc nó là thứ phải xếp hàng. Lần bắn đầu tiên chậm hơn hẳn (1,7 ms so với ' +
               '0,26 ms cho tasklet) vì mọi đường mã đều chạy lần đầu.' },

          { t: 'p', x:
            'Gỡ driver, rồi kiểm tra devres đã trả ngắt và thread:' },

          { t: 'code', where: 'qemu', code:
            'rmmod talarm\n' +
            'grep talarm /proc/interrupts; echo rc=$?\n' +
            'ps | grep irq/' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod talarm\n' +
            '~ # grep talarm /proc/interrupts; echo rc=$?\n' +
            'rc=1\n' +
            '~ # ps | grep irq/\n' +
            '   83 0        grep irq/' },

          { t: 'p', x:
            '<code>grep</code> không tìm thấy gì (<code>rc=1</code>): dòng IRQ 21 biến mất, vì không còn handler ' +
            'nào. <code>ps</code> chỉ còn thấy chính lệnh <code>grep</code>: thread <code>irq/21-talarm</code> ' +
            'đã dừng. Cả hai là việc của <code>free_irq</code>, do devres gọi — driver không có dòng dọn dẹp ' +
            'nào.' },

          { t: 'p', x:
            'Cuối cùng, nạp bản <code>SHOW_STACK</code> để in đường đi từ CPU tới top half, đúng như hình ở ' +
            'phần lý thuyết:' },

          { t: 'code', where: 'qemu', code:
            'insmod /talarm_stack.ko\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   20.172770] talarm b004000.alarm: irq 21 ready\n' +
            '(qemu) [   21.241667] talarm b004000.alarm: top     #1 swapper/0/0 preempt=0x00010001 irqs_off=1 hardirq=1 softirq=0 task=0 +66 us\n' +
            '[   21.243333] CPU: 0 UID: 0 PID: 0 Comm: swapper/0 Tainted: G           O        6.18.45-embedded #1 PREEMPT \n' +
            '[   21.243623] Tainted: [O]=OOT_MODULE\n' +
            '[   21.243667] Hardware name: linux,dummy-virt (DT)\n' +
            '[   21.244104] Call trace:\n' +
            '[   21.244515]  show_stack+0x18/0x24 (C)\n' +
            '[   21.245725]  dump_stack_lvl+0x78/0x90\n' +
            '[   21.245807]  dump_stack+0x18/0x24\n' +
            '[   21.245831]  ta_top+0xb4/0xb8 [talarm]\n' +
            '[   21.246478]  __handle_irq_event_percpu+0x64/0x1d8\n' +
            '[   21.246493]  handle_irq_event_percpu+0x18/0x60\n' +
            '[   21.246502]  handle_irq_event+0x48/0x84\n' +
            '[   21.246511]  handle_edge_irq+0xb0/0x198\n' +
            '[   21.246519]  handle_irq_desc+0x40/0x58\n' +
            '[   21.246528]  generic_handle_domain_irq+0x1c/0x28\n' +
            '[   21.246537]  pl061_irq_handler+0x78/0x108\n' +
            '[   21.246549]  handle_irq_desc+0x40/0x58\n' +
            '[   21.246558]  generic_handle_domain_irq+0x1c/0x28\n' +
            '[   21.246567]  gic_handle_irq+0x98/0xd0\n' +
            '[   21.246574]  call_on_irq_stack+0x30/0x48\n' +
            '[   21.246581]  do_interrupt_handler+0x80/0x84\n' +
            '[   21.246590]  el1_interrupt+0x3c/0x60\n' +
            '[   21.246600]  el1h_64_irq_handler+0x18/0x24\n' +
            '[   21.246609]  el1h_64_irq+0x6c/0x70\n' +
            '[   21.246654]  default_idle_call+0x28/0x44 (P)\n' +
            '[   21.246675]  do_idle+0x224/0x234\n' +
            '[   21.246686]  cpu_startup_entry+0x38/0x3c\n' +
            '[   21.246694]  kernel_init+0x0/0x128\n' +
            '[   21.246703]  start_kernel+0x608/0x74c\n' +
            '[   21.246716]  __primary_switched+0x88/0x90\n' +
            '[   21.246915] talarm b004000.alarm: tasklet #1 swapper/0/0 preempt=0x00000101 irqs_off=0 hardirq=0 softirq=1 task=0 +5502 us\n' +
            '[   21.247031] talarm b004000.alarm: thread  #1 irq/21-talarm/85 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +5618 us\n' +
            '[   21.249621] talarm b004000.alarm: work    #1 kworker/0:0/9 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +8208 us\n' +
            '[   21.270591] talarm b004000.alarm: thread  #1 irq/21-talarm/85 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +29148 us',
            notes: ['<code>#1</code> vì đây là một lần nạp mới, bộ đếm bắt đầu lại. Thread mới có PID khác (85): thread cũ đã chết cùng lần <code>rmmod</code>. Tắt máy ảo bằng <code>poweroff -f</code>.'] },

          { t: 'cal', kind: 'why', title: 'Đọc call trace từ dưới lên',
            x: 'Mỗi dòng là một hàm, dòng dưới gọi dòng trên. Từ dưới lên: <code>start_kernel</code> … ' +
               '<code>do_idle</code> → <code>default_idle_call</code> — CPU đang ngủ trong vòng lặp nhàn rỗi; dấu ' +
               '<code>(P)</code> đánh dấu nơi bị cắt ngang. Rồi <code>el1h_64_irq</code>: CPU nhận ngoại lệ IRQ ' +
               'khi đang ở mức đặc quyền của kernel (EL1). <code>call_on_irq_stack</code>: chuyển sang ngăn xếp ' +
               'riêng cho ngắt. <code>gic_handle_irq</code> → <code>generic_handle_domain_irq</code>: GIC nói số ' +
               '39, domain dịch ra IRQ 14. <code>pl061_irq_handler</code> → <code>generic_handle_domain_irq</code>: ' +
               'PL061 nói chân 3, domain dịch ra IRQ 21. <code>handle_edge_irq</code>: luồng xử lý cho ngắt sườn — ' +
               'báo nhận với PL061, tăng bộ đếm, gọi handler. Và <code>ta_top+0xb4/0xb8 [talarm]</code> — hàm của ' +
               'bạn, byte thứ 0xb4 trong 0xb8. Mọi hàm bạn thấy từ dòng <code>el1h_64_irq</code> trở lên đều chạy ' +
               'với ngắt tắt; <code>dump_stack</code> tốn 5 ms, và tasklet phải đợi tới +5 502 µs thay vì ' +
               '+1 691 µs. Đó là cái giá của việc làm nặng trong top half, đo bằng chính máy của bạn.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Ngủ trong tasklet: BUG: scheduling while atomic',
        blocks: [
          { t: 'p', x:
            'Bản <code>SLEEP_IN_TASKLET</code> chỉ khác bản chính đúng một dòng: <code>msleep(10)</code> trong ' +
            '<code>ta_tasklet</code>. Bảng ở phần lý thuyết nói đó là lệnh cấm. Bước này cho bạn thấy kernel ' +
            'phản ứng thế nào. Máy ảo sẽ <b>sập</b> — đó là mục đích; máy thật của bạn không bị ảnh hưởng gì. ' +
            'Boot lại bằng đúng dòng lệnh ở bước 4, rồi:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/sys/kernel/tainted\n' +
            'insmod /talarm_sleep.ko\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/tainted\n' +
            '0\n' +
            '~ # insmod /talarm_sleep.ko\n' +
            '[    4.480693] talarm: loading out-of-tree module taints kernel.\n' +
            '[    4.486130] talarm b004000.alarm: irq 21 ready\n' +
            '(qemu) [    5.550803] talarm b004000.alarm: top     #1 swapper/0/0 preempt=0x00010001 irqs_off=1 hardirq=1 softirq=0 task=0 +13 us\n' +
            '[    5.551941] talarm b004000.alarm: tasklet #1 swapper/0/0 preempt=0x00000101 irqs_off=0 hardirq=0 softirq=1 task=0 +1199 us\n' +
            '[    5.552017] BUG: scheduling while atomic: swapper/0/0/0x00000102\n' +
            '[    5.552044] Modules linked in: talarm(O)\n' +
            '[    5.552889] CPU: 0 UID: 0 PID: 0 Comm: swapper/0 Tainted: G           O        6.18.45-embedded #1 PREEMPT \n' +
            '[    5.552982] Tainted: [O]=OOT_MODULE\n' +
            '[    5.552994] Hardware name: linux,dummy-virt (DT)\n' +
            '[    5.553110] Call trace:\n' +
            '[    5.553219]  show_stack+0x18/0x24 (C)\n' +
            '[    5.553545]  dump_stack_lvl+0x78/0x90\n' +
            '[    5.553576]  dump_stack+0x18/0x24\n' +
            '[    5.553585]  __schedule_bug+0x50/0x68\n' +
            '[    5.553596]  __schedule+0x8f8/0xae8\n' +
            '[    5.553607]  schedule+0x34/0xac\n' +
            '[    5.553617]  schedule_timeout+0x78/0xf8\n' +
            '[    5.553626]  msleep+0x28/0x3c\n' +
            '[    5.553637]  ta_tasklet+0x24/0x30 [talarm]\n' +
            '[    5.553874]  tasklet_action_common+0xfc/0x120\n' +
            '[    5.553886]  tasklet_action+0x30/0x3c\n' +
            '[    5.553895]  handle_softirqs+0x11c/0x22c\n' +
            '[    5.553905]  __do_softirq+0x14/0x20\n' +
            '        … 13 dòng nữa, giống đoạn dưới của call trace ở bước 4 …\n' +
            '[    5.554192] bad: scheduling from the idle thread!\n' +
            '[    5.554223] CPU: 0 UID: 0 PID: 0 Comm: swapper/0 Tainted: G        W  O        6.18.45-embedded #1 PREEMPT \n' +
            '        … call trace thứ hai, 29 dòng …\n' +
            '[    5.554578] talarm b004000.alarm: thread  #1 irq/21-talarm/56 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +3843 us\n' +
            '[    5.559771] talarm b004000.alarm: work    #1 kworker/0:1/10 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +9033 us\n' +
            '[    5.560137] Unable to handle kernel execute from non-executable memory at virtual address ffff0000034a2380\n' +
            '        … 31 dòng: Mem abort info, Internal error: Oops, thanh ghi, Call trace …\n' +
            '[    5.564725] Kernel panic - not syncing: Attempted to kill the idle task!\n' +
            '[    5.565046] Kernel Offset: disabled\n' +
            '[    5.565115] CPU features: 0x104000,04007800,40004000,0400421b\n' +
            '[    5.565228] Memory Limit: none\n' +
            '[    5.565499] ---[ end Kernel panic - not syncing: Attempted to kill the idle task! ]---',
            notes: [
              'Bản ghi này đã được lược ở ba chỗ ghi <code>…</code> cho dễ đọc; từ dòng <code>top</code> tới dòng <code>end Kernel panic</code> bản đầy đủ dài 104 dòng. Thời điểm và PID sẽ khác trên máy bạn; ba lần chạy của máy viết bài với CPU rảnh cho đúng cùng chuỗi dòng này.',
              'Máy ảo đã chết: không nhận lệnh nào nữa. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> (Bài 31).'
            ] },

          { t: 'cal', kind: 'danger', title: 'Bốn dòng đáng nhớ trong một vụ sập',
            x: '<ul>' +
               '<li><b><code>BUG: scheduling while atomic: swapper/0/0/0x00000102</code></b> — định dạng ' +
               '<code>tên/PID/preempt_count</code> (<code>kernel/sched/core.c</code>, dòng 5875). ' +
               '<code>0x102</code> = ô softirq <code>0x100</code> + ô preempt 2. Một trong hai là của vòng lặp ' +
               'nhàn rỗi, một là của chính <code>schedule()</code> (<code>preempt_disable()</code> ở dòng 7021). ' +
               '<code>__schedule</code> kiểm tra ở dòng 5914 rằng <code>preempt_count</code> phải <b>đúng bằng ' +
               '1</b> — cái mà chính nó vừa thêm. Bất kỳ thứ gì khác, và đây là ô softirq, nghĩa là có người ' +
               'đang ngủ ở nơi cấm ngủ.</li>' +
               '<li><b>Call trace chỉ thủ phạm</b>: <code>msleep</code> ← <code>ta_tasklet+0x24/0x30 ' +
               '[talarm]</code> ← <code>tasklet_action</code> ← <code>handle_softirqs</code>. Không cần đoán.</li>' +
               '<li><b><code>bad: scheduling from the idle thread!</code></b> (<code>kernel/sched/idle.c</code>, ' +
               'dòng 510) — kernel không dừng ở dòng BUG. Nó chỉ cảnh báo, đặt lại bộ đếm, rồi <b>ngủ tiếp</b>. ' +
               'Và thứ bị cho ngủ là <code>swapper/0</code> — PID 0, tác vụ duy nhất không bao giờ được ngủ, vì ' +
               'nó là thứ chạy khi không còn gì để chạy. Dòng <code>Tainted</code> đã thêm chữ <code>W</code> ' +
               '(đã có cảnh báo).</li>' +
               '<li><b><code>Kernel panic - not syncing: Attempted to kill the idle task!</code></b> ' +
               '(<code>kernel/exit.c</code>, dòng 1041) — từ trạng thái đã hỏng, CPU nhảy vào một địa chỉ ' +
               'không phải mã (<code>execute from non-executable memory</code>), oops, và kernel phải giết tác ' +
               'vụ đang chạy — lại là PID 0. Hết đường lui.</li>' +
               '</ul>' },

          { t: 'cal', kind: 'info', title: 'Phần sau dòng BUG phụ thuộc vào ai bị cắt ngang',
            x: 'Dòng <code>BUG: scheduling while atomic</code> và call trace đầu tiên luôn giống nhau. Phần còn ' +
               'lại thì không. Khi máy viết bài bắn ngắt lúc một vòng lặp <code>while :; do :; done &amp;</code> ' +
               'đang chạy, dòng BUG thành <code>sh/57/0x00000101</code> (không có số 1 của vòng lặp nhàn rỗi), ' +
               'call trace đi qua <code>el0_interrupt</code> — ngắt đến khi CPU đang chạy mã người dùng, mức EL0 ' +
               '— và vụ sập tiếp theo là <code>Unable to handle kernel write to read-only memory</code> trong ' +
               '<code>run_timer_base</code>, kết thúc bằng <code>Kernel panic - not syncing: Oops: Fatal ' +
               'exception in interrupt</code>. Nguyên nhân gốc giống hệt, triệu chứng cuối khác hẳn. Khi gặp một ' +
               'vụ sập lạ, hãy cuộn lên tìm dòng <code>BUG:</code> hay <code>WARNING:</code> <b>đầu tiên</b>: mọi ' +
               'thứ sau nó thường chỉ là hậu quả.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Threaded IRQ không có top half, và IRQF_ONESHOT',
        blocks: [
          { t: 'p', x:
            'Bỏ top half: thay <code>ta_top</code> bằng <code>NULL</code> trong lời gọi ' +
            '<code>devm_request_threaded_irq</code>. Làm trên hai bản sao — một bản giữ nguyên <code>flags = ' +
            '0</code>, một bản thêm <code>IRQF_ONESHOT</code>:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p v/null && cp talarm/talarm.c talarm/Makefile v/null/\n' +
            'sed -i \'s/ta->irq, ta_top, ta_thread,/ta->irq, NULL, ta_thread,/\' v/null/talarm.c\n' +
            'make -C v/null 2>&1 | grep -e warning -e \'LD \'\n' +
            'mkdir -p v/oneshot && cp v/null/talarm.c v/null/Makefile v/oneshot/\n' +
            'sed -i \'s/^\\t\\t\\t\\t\\t0, "talarm", ta);/\\t\\t\\t\\t\\tIRQF_ONESHOT, "talarm", ta);/\' v/oneshot/talarm.c\n' +
            'grep -n -A1 \'ta->irq, NULL\' v/oneshot/talarm.c\n' +
            'make -C v/oneshot | grep \'LD \'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'talarm.c:37:20: warning: ‘ta_top’ defined but not used [-Wunused-function]\n' +
            '  LD [M]  talarm.ko\n' +
            '119:\tret = devm_request_threaded_irq(dev, ta->irq, NULL, ta_thread,\n' +
            '120-\t\t\t\t\tIRQF_ONESHOT, "talarm", ta);\n' +
            'talarm.c:37:20: warning: ‘ta_top’ defined but not used [-Wunused-function]\n' +
            '   37 | static irqreturn_t ta_top(int irq, void *data)\n' +
            '      |                    ^~~~~~\n' +
            '  LD [M]  talarm.ko' },

          { t: 'p', x:
            'Cả hai build được, chỉ có một cảnh báo hợp lý: <code>ta_top</code> giờ không ai gọi. ' +
            '<code>grep</code> xác nhận dòng 119–120 của bản thứ hai đúng là <code>NULL</code> + ' +
            '<code>IRQF_ONESHOT</code>. Lần <code>make</code> thứ hai in cả ba dòng của cảnh báo dù có ' +
            '<code>| grep \'LD \'</code>: trình biên dịch in cảnh báo ra <b>stderr</b>, và <code>|</code> chỉ nối ' +
            '<b>stdout</b> (Bài 10); lần đầu có <code>2&gt;&amp;1</code> nên cảnh báo bị <code>grep</code> lọc còn ' +
            'một dòng.' },

          { t: 'cmdx', cmd: "sed -i 's/^\\t\\t\\t\\t\\t0, \"talarm\", ta);/\\t\\t\\t\\t\\tIRQF_ONESHOT, \"talarm\", ta);/' v/oneshot/talarm.c",
            rows: [
              ['<code>-i</code>', 'Sửa file tại chỗ thay vì in ra màn hình.', 'Chỉ an toàn vì bạn làm trên bản sao trong <code>v/oneshot</code>'],
              ['<code>^\\t\\t\\t\\t\\t</code>', 'Đầu dòng, rồi đúng năm Tab.', 'Dòng thứ hai của lời gọi được thụt bằng năm Tab trong <code>talarm.c</code>; neo như vậy để không khớp nhầm chỗ khác'],
              ['<code>0, \"talarm\", ta);</code> → <code>IRQF_ONESHOT, …</code>', 'Đổi đối số <code>flags</code> từ 0 thành <code>IRQF_ONESHOT</code>.', 'Phần còn lại của dòng giữ nguyên']
            ] },

          { t: 'p', x:
            'Thêm hai module vào initramfs rồi boot lại bằng dòng lệnh ở bước 4:' },

          { t: 'code', where: 'wsl', code:
            'cp v/null/talarm.ko initramfs/talarm_null.ko\n' +
            'cp v/oneshot/talarm.ko initramfs/talarm_oneshot.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '5129 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1180639 Sep 30 12:22 initramfs.cpio.gz' },

          { t: 'code', where: 'qemu', code:
            'insmod /talarm_null.ko; echo rc=$?\n' +
            'ls /sys/bus/platform/drivers/talarm' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /talarm_null.ko; echo rc=$?\n' +
            '[    3.929664] talarm: loading out-of-tree module taints kernel.\n' +
            '[    3.934064] genirq: Threaded irq requested with handler=NULL and !ONESHOT for talarm (irq 21)\n' +
            '[    3.934773] talarm b004000.alarm: error -EINVAL: request_irq(21) 0x0 ta_thread [talarm] talarm\n' +
            '[    3.935477] talarm b004000.alarm: probe with driver talarm failed with error -22\n' +
            'rc=0\n' +
            '~ # ls /sys/bus/platform/drivers/talarm\n' +
            'bind    module  uevent  unbind' },

          { t: 'cal', kind: 'why', title: 'Ba dòng, ba tầng',
            x: '<ul>' +
               '<li><code>genirq: Threaded irq requested with handler=NULL and !ONESHOT</code> — tầng ngắt của ' +
               'kernel (<code>kernel/irq/manage.c</code>, dòng 1667) từ chối, đúng như phần lý thuyết.</li>' +
               '<li><code>error -EINVAL: request_irq(21) 0x0 ta_thread [talarm] talarm</code> — ' +
               '<code>devm_request_threaded_irq</code> tự in lỗi bằng <code>dev_err_probe</code> ' +
               '(<code>kernel/irq/devres.c</code>, dòng 40) với định dạng <code>request_irq(số) handler ' +
               'thread_fn tên</code>: <code>0x0</code> chính là cái <code>NULL</code> bạn đưa vào. Vì vậy ' +
               '<code>ta_probe</code> chỉ cần <code>return ret</code>, không in thêm.</li>' +
               '<li><code>probe with driver talarm failed with error -22</code> — driver core, như Bài 54.</li>' +
               '</ul>' +
               '<code>insmod</code> vẫn <code>rc=0</code>: module nạp thành công, chỉ <code>probe</code> thất bại. ' +
               'Thư mục driver không có liên kết <code>b004000.alarm</code> — thiết bị không được gắn.' },

          { t: 'code', where: 'qemu', code:
            'rmmod talarm\n' +
            'insmod /talarm_oneshot.ko\n' +
            'ps | grep irq/\n' +
            '(Ctrl-A C) system_powerdown (Ctrl-A C)\n' +
            'grep talarm /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /talarm_oneshot.ko\n' +
            '[    5.734737] talarm b004000.alarm: irq 21 ready\n' +
            '~ # ps | grep irq/\n' +
            '   59 0        [irq/21-talarm]\n' +
            '   61 0        grep irq/\n' +
            '(qemu) [    7.409394] talarm b004000.alarm: thread  #0 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +7390866 us\n' +
            '[    7.431463] talarm b004000.alarm: thread  #0 irq/21-talarm/59 preempt=0x00000000 irqs_off=0 hardirq=0 softirq=0 task=1 +7413119 us\n' +
            '~ # grep talarm /proc/interrupts\n' +
            ' 21:          1 9030000.pl061   3 Edge      talarm',
            notes: ['PID và thời điểm sẽ khác trên máy bạn.'] },

          { t: 'cal', kind: 'why', title: '#0 và +7 390 866 µs: bằng chứng top half không chạy',
            x: 'Với <code>IRQF_ONESHOT</code>, lời xin được chấp nhận và thread vẫn chạy: <code>/proc/interrupts</code> ' +
               'tăng 1, hai dòng <code>thread</code> cách nhau 22 ms vì <code>msleep(20)</code>. Nhưng không có ' +
               'dòng <code>top</code>, không có <code>tasklet</code>, không có <code>work</code> — những thứ đó do ' +
               '<code>ta_top</code> gọi. Hai số trong dòng nói cùng điều: <code>#0</code> vì ' +
               '<code>ta-&gt;count++</code> nằm trong <code>ta_top</code>; <code>+7390866 us</code> vì ' +
               '<code>t_top</code> vẫn bằng 0 như lúc <code>devm_kzalloc</code> xoá, nên hiệu số là thời gian từ ' +
               'lúc boot — 7,39 giây, khớp dấu thời gian <code>7.409394</code> ở đầu dòng. Top half mặc định của ' +
               'kernel đã chạy thay, và nó chỉ làm đúng một việc: đánh thức thread. Với phần cứng thật có ngắt ' +
               'mức, <code>IRQF_ONESHOT</code> giữ đường dây bị che tới khi thread xoá được cờ trong thiết bị — ' +
               'thread được <b>ngủ</b> trong lúc làm việc đó, ví dụ chờ một giao dịch I2C (Bài 58).' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp và giữ lại gì',
            x: '<code>~/bai55</code> nặng khoảng <b>6,3 MB</b>. Giữ <code>talarm/</code> và <code>alarm.dts</code> ' +
               'nếu muốn thử thêm (ví dụ đổi <code>&lt;3 1&gt;</code> thành <code>&lt;3 3&gt;</code> để xin cả hai ' +
               'sườn và xem bộ đếm tăng 2). <code>v/</code> và <code>initramfs/</code> xoá tuỳ ý. Bài 56 không ' +
               'đọc gì trong <code>~/bai55</code>.' }
        ] }
    ] },

    /* ============================================================
       8. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>error: array type has incomplete element type ‘struct of_device_id’</code><br><code>error: field name not in record or union initializer</code>',
         'Thiếu <code>#include &lt;linux/of.h&gt;</code>. Gặp khi viết bài: <code>platform_device.h</code> và <code>interrupt.h</code> không kéo theo nó.',
         'Thêm <code>#include &lt;linux/of.h&gt;</code> — mọi driver có <code>of_match_table</code> đều cần.'],
        ['<code>irq: type mismatch, failed to map hwirq-3 for pl061@9030000!</code><br><code>talarm b004000.alarm: error -ENXIO: IRQ index 0 not found</code>',
         'Quên <code>/delete-node/ gpio-keys;</code>. <code>gpio-keys</code> đã nhận chân 3 lúc boot với kiểu hai sườn; node của bạn đòi sườn lên cho cùng chân, và kernel không cho một <code>hwirq</code> mang hai kiểu (<code>kernel/irq/irqdomain.c</code>, dòng 933).',
         'Thêm lại <code>/delete-node/ gpio-keys;</code>, dịch lại <code>alarm.dtb</code>. Trước khi <code>insmod</code>, <code>grep -c 9030000 /proc/interrupts</code> phải ra <code>0</code>.'],
        ['<code>talarm b004000.alarm: error -ENXIO: IRQ index 0 not found</code> (chỉ một dòng) và <code>/proc/interrupts</code> không có dòng <code>pl061</code> nào',
         'Quên <code>interrupt-controller;</code> trong phần <code>&amp;gpio0 { }</code>: PL061 không đăng ký IRQ domain, nên <code>&lt;3 1&gt;</code> không dịch được. <code>dtc</code> (không có <code>-q</code>) cũng cảnh báo <code>Missing interrupt-controller or interrupt-map property</code>.',
         'Thêm <code>interrupt-controller;</code> và <code>#interrupt-cells = &lt;2&gt;;</code>. Chạy <code>dtc</code> không có <code>-q</code> một lần để đọc cảnh báo mới.'],
        ['<code>genirq: Threaded irq requested with handler=NULL and !ONESHOT for talarm (irq 21)</code><br><code>error -EINVAL: request_irq(21) 0x0 …</code>',
         'Top half là <code>NULL</code> mà không có <code>IRQF_ONESHOT</code>.',
         'Thêm <code>IRQF_ONESHOT</code> vào <code>flags</code>, hoặc viết top half riêng trả <code>IRQ_WAKE_THREAD</code>.'],
        ['<code>BUG: scheduling while atomic: …/0x000001xx</code> rồi thường là oops và <code>Kernel panic</code>',
         'Một hàm có thể ngủ (<code>msleep</code>, <code>mutex_lock</code>, <code>kmalloc(GFP_KERNEL)</code>, <code>copy_*_user</code>) được gọi trong ngữ cảnh nguyên tử. <code>0x100</code> = softirq, <code>0x10000</code> = hardirq.',
         'Đọc call trace: dòng ngay dưới <code>schedule</code>/<code>msleep</code> là hàm của bạn. Chuyển việc đó sang threaded IRQ hoặc workqueue, hoặc dùng bản không ngủ (<code>GFP_ATOMIC</code>, <code>mdelay</code> cho vài µs).'],
        ['<code>/bin/sh: can\'t open /dev/null: no such file</code> khi chạy lệnh có <code>&amp;</code>',
         'BusyBox <code>sh</code> nối stdin của lệnh nền vào <code>/dev/null</code>, mà initramfs của Bài 32 chưa gắn devtmpfs. Lệnh nền không chạy.',
         '<code>mount -t devtmpfs none /dev</code> trước.'],
        ['<code>kill %1</code> trả về 0 nhưng vòng lặp nền vẫn chạy (bộ đếm <code>arch_timer</code> vẫn tăng ~250/giây)',
         'Shell trong initramfs chạy không có job control (<code>can\'t access tty; job control turned off</code>), nên <code>%1</code> không trỏ vào tiến trình nào. Gặp khi viết bài.',
         'Dùng <code>kill $!</code> ngay sau lệnh nền, hoặc <code>ps</code> rồi <code>kill PID</code>.'],
        ['Không có dòng <code>talarm</code> nào khi bấm, <code>/proc/interrupts</code> không tăng',
         'Gõ <code>system_powerdown</code> ở dấu nhắc <code>~ #</code> thay vì <code>(qemu)</code>, hoặc boot bằng <code>board.dtb</code> của Bài 54 thay vì <code>alarm.dtb</code>.',
         'Kiểm dấu nhắc trước khi gõ. <code>ls /sys/bus/platform/devices | grep b004000</code> phải có kết quả.']
      ] },

    /* ============================================================
       9. TÓM TẮT
       ============================================================ */
    { t: 'recap', items: [
      'Ngắt thay cho <b>polling</b>: thiết bị báo khi có chuyện. Kể cả khi bạn chưa viết gì, <code>arch_timer</code> đã reo <b>33</b> lần/4 giây lúc rảnh và <b>1 005</b> lần lúc bận (<code>CONFIG_HZ=250</code>, <code>NO_HZ_IDLE</code>).',
      'Một ngắt có <b>ba con số</b>: ô trong <code>interrupts</code> (ngôn ngữ của bộ điều khiển cha), <b><code>hwirq</code></b> (số trong bộ điều khiển: SPI + 32 với GIC) và <b>số IRQ Linux</b> (chỉ mục kernel tự cấp — <b>21</b> cho chân 3). <code>platform_get_irq</code> dịch giúp bạn.',
      'PL061 là bộ điều khiển <b>xếp tầng</b>: IRQ 14 (<code>hwirq</code> 39) chạy <code>pl061_irq_handler</code>, nó mới gọi handler của IRQ 21. Call trace của bước 4 cho thấy đủ các tầng.',
      '<b><code>request_irq</code> = <code>request_threaded_irq</code> với <code>thread_fn = NULL</code></b>; bản <code>devm_</code> gỡ ngắt và dừng thread khi <code>rmmod</code>. Handler trả <code>IRQ_HANDLED</code>, <code>IRQ_NONE</code> (99 900/100 000 lần → IRQ bị tắt) hoặc <code>IRQ_WAKE_THREAD</code>.',
      'Top half chạy với <b>ngắt tắt</b> và mượn CPU của kẻ bị cắt ngang (<code>swapper/0</code>, <code>sh</code>) — làm tối thiểu rồi thoát. <code>dump_stack</code> trong đó làm tasklet trễ từ 1,7 ms thành <b>5,5 ms</b>.',
      '<b><code>preempt_count</code></b> nói bạn đang ở đâu: <code>0x10000</code> hardirq, <code>0x100</code> softirq, <b>0 = được ngủ</b>. Tasklet: softirq, không được ngủ, đã lỗi thời. Workqueue: <code>kworker</code>, được ngủ. Threaded IRQ: thread riêng <code>SCHED_FIFO</code> 50, được ngủ — <b>mặc định cho driver mới</b>.',
      '<code>msleep</code> trong tasklet → <b><code>BUG: scheduling while atomic: swapper/0/0/0x00000102</code></b> → <code>bad: scheduling from the idle thread!</code> → <b>panic</b>. Khi đọc một vụ sập, tìm dòng <code>BUG:</code> <b>đầu tiên</b>.',
      'Top half <code>NULL</code> bắt buộc <b><code>IRQF_ONESHOT</code></b>, nếu không <code>-EINVAL</code>. Có nó, thread chạy mà top half của bạn không bao giờ chạy — <code>#0</code>, <code>+7390866 us</code>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Driver <code>talarm</code> không có dữ liệu nào dùng chung giữa các ngữ cảnh ngoài một bộ đếm chỉ top ' +
         'half ghi. Driver thật thì có: top half ghi một giá trị đọc từ thanh ghi, thread đọc nó, và ' +
         '<code>read()</code> từ userspace cũng đọc nó — ba ngữ cảnh, một biến. Bài này đã cho bạn biết vì sao ' +
         '<code>mutex</code> bị cấm trong top half. <b>Bài 56 — Truy cập phần cứng: MMIO và đồng bộ</b> đưa ra ' +
         'thứ thay thế: <code>spin_lock_irqsave</code>, và <code>atomic_t</code>; rồi thay dòng ' +
         '<code>return ts-&gt;offset_mdeg</code> giả của Bài 54 bằng <code>ioremap</code> + <code>readl</code> ' +
         'thật, và ghép tất cả thành một driver LED/GPIO ảo có sysfs, <code>ioctl</code> và ngắt.' }
  ],

  quiz: [
    { q: 'Node cảm biến có <code>interrupt-parent = &lt;&amp;gpio0&gt;</code> và <code>interrupts = &lt;3 1&gt;</code>. Trong <code>/proc/interrupts</code> nó hiện ở dòng <code>21:</code>. Số nào bạn đưa cho <code>request_irq</code>?',
      opts: ['3 — số chân trong Device Tree', '21 — số IRQ Linux', '39 — <code>hwirq</code> của PL061 trên GIC', '1 — ô cờ'],
      a: 1,
      why: '<code>request_irq</code> chỉ hiểu số IRQ <b>Linux</b>, thứ kernel tự cấp khi dịch cây. 3 là <code>hwirq</code> trong domain của PL061, 39 là <code>hwirq</code> của dây PL061 trên GIC (SPI 7 + 32), 1 là kiểu kích hoạt sườn lên. Trong driver bạn không bao giờ gõ 21 bằng tay: <code>platform_get_irq(pdev, 0)</code> đọc ô <code>interrupts</code>, nhờ domain dịch, và trả 21 — như bước 4 in <code>irq 21 ready</code>.' },

    { q: 'Một hàm chạy với <code>preempt_count() == 0x00000100</code>. Hàm đó được gọi <code>mutex_lock()</code> không?',
      opts: [
        'Được — ngắt đang bật',
        'Không — ô softirq bằng 1, tức đang trong softirq (tasklet), ngữ cảnh nguyên tử',
        'Được — chỉ ô hardirq mới cấm ngủ',
        'Không — vì ô preempt bằng 1'
      ],
      a: 1,
      why: 'Bit 8–15 là ô softirq, <code>0x100</code> = đang phục vụ softirq. Mọi <code>preempt_count</code> khác 0 là ngữ cảnh nguyên tử, và <code>mutex_lock</code> có thể ngủ. Ngắt bật không giúp gì: tasklet ở bước 4 có <code>irqs_off=0</code> nhưng vẫn mượn CPU của kẻ bị cắt ngang, không có thread nào để cho ngủ. Ô preempt ở đây bằng 0 (<code>0x100</code> chứ không phải <code>0x101</code>) — đúng giá trị ở lần bắn khi <code>sh</code> đang chạy.' },

    { q: 'Top half cần báo cho một thread để thread đọc 6 byte qua I2C (một thao tác có thể ngủ). Chọn cách nào?',
      opts: [
        '<code>tasklet_schedule</code>, vì tasklet chạy sớm nhất',
        '<code>request_threaded_irq</code> với top half trả <code>IRQ_WAKE_THREAD</code> (hoặc <code>NULL</code> + <code>IRQF_ONESHOT</code>)',
        'Đọc I2C ngay trong top half cho nhanh',
        '<code>msleep</code> trong top half rồi đọc'
      ],
      a: 1,
      why: 'Thao tác có thể ngủ chỉ được làm ở ngữ cảnh tiến trình: workqueue hoặc threaded IRQ. Threaded IRQ là lựa chọn chuẩn khi việc gắn với một ngắt: thread riêng, <code>SCHED_FIFO</code>, và với <code>IRQF_ONESHOT</code> đường dây bị che tới khi thread xong — đúng điều một thiết bị ngắt mức cần. Tasklet chạy trong softirq nên cũng không được ngủ (bước 5 đã sập vì đúng điều đó), và đã lỗi thời. Hai phương án còn lại ngủ trong hardirq.' },

    { q: 'Bạn thấy trong log: <code>BUG: scheduling while atomic: sh/57/0x00000101</code>, rồi call trace có <code>msleep</code> ← <code>foo_tasklet+0x24/0x30 [foo]</code>, rồi một oops ở <code>run_timer_base</code> và <code>Kernel panic … Fatal exception in interrupt</code>. Lỗi thật nằm ở đâu?',
      opts: [
        'Trong <code>run_timer_base</code> — dòng oops chỉ vào đó',
        'Trong <code>sh</code> — tên tiến trình trong dòng BUG',
        'Trong <code>foo_tasklet</code>: nó gọi <code>msleep</code> ở ngữ cảnh softirq; mọi thứ sau đó là hậu quả',
        'Trong bộ định thời phần cứng'
      ],
      a: 2,
      why: 'Dòng <code>BUG:</code> đầu tiên là nguyên nhân gốc; kernel chỉ cảnh báo rồi chạy tiếp từ trạng thái đã hỏng, nên oops sau đó có thể ở bất kỳ đâu. <code>0x101</code> = softirq + preempt, và call trace chỉ thẳng <code>foo_tasklet</code> → <code>msleep</code>. <code>sh</code> chỉ là kẻ bị cắt ngang — <code>current</code> của softirq. Khi viết bài, cùng một <code>msleep</code> trong tasklet cho hai kết cục cuối khác nhau (<code>Attempted to kill the idle task!</code> khi CPU rảnh, <code>Fatal exception in interrupt</code> khi có vòng lặp bận) nhưng dòng BUG đầu tiên giống hệt.' },

    { q: 'Driver xin ngắt bằng <code>devm_request_threaded_irq(dev, irq, NULL, my_thread, 0, "foo", priv)</code>. <code>probe</code> trả <code>-22</code>. Sửa thế nào ít nhất?',
      opts: [
        'Đổi <code>0</code> thành <code>IRQF_ONESHOT</code>',
        'Đổi <code>devm_request_threaded_irq</code> thành <code>request_threaded_irq</code>',
        'Đổi <code>NULL</code> thành <code>my_thread</code>',
        'Thêm <code>IRQF_SHARED</code>'
      ],
      a: 0,
      why: 'Kernel từ chối mọi top half <code>NULL</code> không kèm <code>IRQF_ONESHOT</code> (<code>kernel/irq/manage.c</code>, dòng 1667), vì với ngắt mức nó sẽ lặp vô tận. Bước 6 thấy đúng <code>genirq: Threaded irq requested with handler=NULL and !ONESHOT</code> và <code>error -EINVAL</code>, rồi thêm <code>IRQF_ONESHOT</code> là chạy. Bỏ <code>devm_</code> không đổi gì ngoài việc phải tự <code>free_irq</code>. Đưa <code>my_thread</code> làm top half thì nó chạy trong hardirq và không được ngủ nữa.' },

    { q: 'Sau khi thay <code>gpio-keys</code> bằng node của bạn, mỗi lần <code>system_powerdown</code> dòng <code>talarm</code> trong <code>/proc/interrupts</code> tăng 1, trong khi ở bước 1 dòng <code>GPIO Key Poweroff</code> tăng 2. Vì sao?',
      opts: [
        'Driver của bạn bỏ sót một ngắt',
        'Node của bạn xin sườn lên (<code>&lt;3 1&gt;</code>); <code>gpio-keys</code> xin cả hai sườn, và một xung có một sườn lên và một sườn xuống',
        'QEMU bắn hai lần khi có <code>gpio-keys</code>',
        'Tasklet chiếm mất một lần đếm'
      ],
      a: 1,
      why: 'Nút nguồn ảo tạo một xung: lên rồi xuống. <code>gpio-keys</code> cần biết cả lúc bấm lẫn lúc nhả nên xin <code>IRQF_TRIGGER_RISING | IRQF_TRIGGER_FALLING</code> (<code>gpio_keys.c</code> dòng 599) — hai ngắt mỗi xung. Ô cờ <code>1</code> = <code>IRQ_TYPE_EDGE_RISING</code> chỉ lấy sườn lên. <code>/proc/interrupts</code> ghi <code>Edge</code> cho cả hai nên không phân biệt được; bạn phải xem kiểu thật trong Device Tree hoặc trong mã driver.' }
  ]
});

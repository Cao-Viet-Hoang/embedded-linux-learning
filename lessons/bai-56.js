/* Bài 56 — Truy cập phần cứng: MMIO và đồng bộ
   Chặng 10 — Kernel module và Driver
   Hai module trong ~/bai56:
   - race/race.c (92 dòng): hai kthread gắn vào hai CPU cùng tăng một biến đếm; module_param "mode"
     chọn đếm trần / atomic_t / spinlock / mutex. Đếm trần mất gần một nửa số lần tăng khi -smp 2,
     không mất lần nào khi -smp 1.
   - vgpio/vgpio.c: driver "bảng LED ảo" chiếm luôn khối GPIO PL061 thật của máy virt
     (compatible = "learn,vgpio" ghi đè lên node pl061@9030000, gpio-keys bị xoá). Chân 0..2 là LED,
     chân 3 là nút nguồn ảo. devm_platform_ioremap_resource + readl/writel, spinlock_t dùng chung
     giữa sysfs/ioctl và top half, atomic_t đếm số lần bấm, sysfs leds/pins/presses, /dev/vgpio (misc)
     + vgctl ở userspace. Hai biến thể build bằng KCFLAGS: NO_IRQSAVE (spin_lock thay cho
     spin_lock_irqsave -> CPU treo cứng trong queued_spin_lock_slowpath) và NO_CLEAR (quên ghi GPIOIC
     -> bão ngắt mức, CPU không bao giờ ra khỏi gic_handle_irq).
   Mọi số liệu đo 2026-09-30 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   dtc 1.5.0), kernel ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs. Bài này không đọc
   gì trong ~/bai54 hay ~/bai55: cây vgpio.dts dựng lại từ dumpdtb (-smp 2). */

Lesson.register({
  id: 'bai-56',
  title: 'Truy cập phần cứng: MMIO và đồng bộ',
  minutes: 65,
  practice: 'Thực hành 50 phút',
  level: 'Trung cấp',

  intro:
    'Từ Bài 52 tới giờ, mọi driver bạn viết đều <b>giả vờ</b> có phần cứng: <code>ramdisk</code> đọc ghi ' +
    'một mảng trong RAM, <code>tsensor</code> của Bài 54 trả về con số lấy từ Device Tree, ' +
    '<code>talarm</code> của Bài 55 nhận ngắt nhưng không chạm vào thanh ghi nào. Driver thật thì khác: ' +
    'nó bật một đèn bằng cách <b>ghi một con số vào một địa chỉ</b>, và biết nút đã được bấm bằng cách ' +
    '<b>đọc một địa chỉ khác</b>. Trên ARM, các thanh ghi của thiết bị nằm ngay trong không gian địa chỉ, ' +
    'như RAM — gọi là <b>MMIO</b>.<br><br>' +
    'Ngay khi driver có ngắt và có người dùng cùng lúc, một vấn đề thứ hai xuất hiện: hai đoạn mã chạm ' +
    'vào cùng một biến, cùng một thanh ghi, trên hai CPU khác nhau hoặc chen nhau trên cùng một CPU. Bạn ' +
    'đã gặp lỗi này ở Bài 22 với hai luồng <code>pthread</code>; bài này tái hiện nó <b>bên trong kernel</b> ' +
    '— một biến đếm được tăng 2 000 000 lần nhưng chỉ lên được <b>1,1 triệu</b> — rồi sửa bằng ba công cụ ' +
    'của kernel, <code>atomic_t</code>, spinlock và mutex, đo cái giá của từng cách, và thêm một loại kẻ ' +
    'chen ngang mà userspace không có: <b>ngắt</b>. Cuối bài bạn ghép ' +
    'mọi thứ từ Bài 52 đến giờ thành một driver hoàn chỉnh điều khiển khối GPIO thật của máy ' +
    '<code>virt</code>: sysfs, <code>ioctl</code>, ngắt — và xem máy ảo treo cứng khi bạn quên đúng ' +
    'một chữ <code>irqsave</code>.',

  goals: [
    'Giải thích MMIO là gì, vì sao phải <code>ioremap</code> trước khi đọc ghi, và dùng ' +
      '<code>devm_platform_ioremap_resource</code> + <code>readl</code>/<code>writel</code> để điều khiển ' +
      'một thiết bị thật từ địa chỉ trong <code>reg</code> của Device Tree.',
    'Đọc được một thanh ghi từ userspace bằng <code>devmem</code> để kiểm chứng driver, và nhận ra ' +
      '<code>Bus error</code> cùng <code>mmap: Operation not permitted</code> nghĩa là gì.',
    'Nói được vì sao <code>writel</code> sinh ra lệnh <code>dmb oshst</code> còn <code>readl</code> sinh ra ' +
      '<code>dmb oshld</code>, và khi nào được dùng bản <code>_relaxed</code>.',
    'Tái hiện một race condition bằng hai kthread trên hai CPU, rồi chọn đúng công cụ trong ba — ' +
      '<code>atomic_t</code>, <code>spinlock_t</code>, <code>struct mutex</code> — theo dữ liệu cần bảo vệ và ' +
      'ngữ cảnh chạy.',
    'Biết khi nào phải dùng <code>spin_lock_irqsave</code> thay vì <code>spin_lock</code>, và chẩn đoán ' +
      'được một CPU treo cứng trong <code>queued_spin_lock_slowpath</code>.',
    'Viết một driver hoàn chỉnh cho một thiết bị MMIO có ngắt: sysfs, <code>ioctl</code> qua ' +
      '<code>misc_register</code>, xoá cờ ngắt đúng chỗ, và gỡ mọi thứ sạch sẽ khi <code>rmmod</code>.'
  ],

  blocks: [

    /* ============================================================
       1. THIẾT BỊ LÀ MỘT DẢI ĐỊA CHỈ
       ============================================================ */
    { t: 'h2', x: 'Thiết bị là một dải địa chỉ' },

    { t: 'p', x:
      'Hình dung một toà nhà văn phòng: phần lớn các phòng là kho chứa (RAM), nhưng vài phòng ở tầng trệt ' +
      'là <b>quầy giao dịch</b> — bạn không cất đồ vào đó được, mỗi lần bạn đưa một tờ giấy qua quầy, ' +
      'người bên trong làm một việc gì đó, và mỗi lần bạn hỏi, họ trả lời theo tình hình <b>lúc đó</b>. ' +
      'Cả kho lẫn quầy đều có số phòng theo cùng một cách đánh số. Trên ARM, CPU nhìn thiết bị đúng như ' +
      'vậy: một dải địa chỉ vật lý dành cho mỗi thiết bị, và đọc ghi vào đó bằng đúng lệnh ' +
      '<code>ldr</code>/<code>str</code> dùng cho RAM. Cách này gọi là <b>MMIO</b> ' +
      '(<i>memory-mapped I/O</i>). Mỗi ô 32 bit trong dải đó là một <b>thanh ghi</b> (<i>register</i>).' },

    { t: 'p', x:
      'Bạn đã thấy bản đồ này từ Bài 45 mà chưa gọi tên nó: <code>reg = &lt;0x00 0x9030000 0x00 0x1000&gt;</code> ' +
      'của node <code>pl061@9030000</code> nói rằng khối GPIO PL061 chiếm 4 KiB bắt đầu từ địa chỉ vật lý ' +
      '<code>0x09030000</code>. Tài liệu kỹ thuật của ARM cho PL061 liệt kê các thanh ghi trong 4 KiB đó; ' +
      'driver <code>drivers/gpio/gpio-pl061.c</code> của kernel chép lại chúng thành các hằng số, và bài này ' +
      'dùng lại đúng các tên đó:' },

    { t: 'table',
      head: ['Độ lệch', 'Tên', 'Ghi vào thì…', 'Đọc ra thì…'],
      rows: [
        ['<code>0x000</code>–<code>0x3FC</code>', '<code>GPIODATA</code>', 'Đặt mức ra cho các chân output — chỉ những chân có bit tương ứng trong <b>địa chỉ</b> (xem dưới)', 'Mức hiện tại của các chân'],
        ['<code>0x400</code>', '<code>GPIODIR</code>', '1 = chân đó là output, 0 = input', 'Hướng hiện tại'],
        ['<code>0x404</code>', '<code>GPIOIS</code>', '0 = ngắt theo sườn, 1 = theo mức', '—'],
        ['<code>0x408</code>', '<code>GPIOIBE</code>', '1 = ngắt ở cả hai sườn', '—'],
        ['<code>0x40C</code>', '<code>GPIOIEV</code>', '1 = sườn lên / mức cao', '—'],
        ['<code>0x410</code>', '<code>GPIOIE</code>', '1 = chân đó được phép gây ngắt', 'Mặt nạ hiện tại'],
        ['<code>0x418</code>', '<code>GPIOMIS</code>', '—', 'Chân nào đang có ngắt <b>và</b> được phép'],
        ['<code>0x41C</code>', '<code>GPIOIC</code>', 'Ghi 1 = xoá cờ ngắt của chân đó', '—'],
        ['<code>0xFE0</code>–<code>0xFEC</code>', '<code>PeriphID0..3</code>', '—', 'Mã nhận dạng: số hiệu linh kiện <code>0x061</code>, nhà thiết kế <code>0x41</code> (chữ <code>A</code> — ARM)']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao GPIODATA chiếm tới 256 ô',
      x: 'Đây là một mẹo của phần cứng đáng nhớ vì nó giải quyết đúng vấn đề của nửa sau bài này. Muốn đổi ' +
         'chân 0 mà không đụng chân 5, cách thông thường là đọc cả thanh ghi, sửa một bit, ghi lại — ba bước, ' +
         'và nếu một ngắt chen vào giữa rồi đổi chân 5, bước ghi sẽ xoá mất thay đổi đó. PL061 tránh hẳn ' +
         'chuyện này: bit 9..2 của <b>địa chỉ</b> là mặt nạ. Ghi vào <code>0x09030000 + (0x07 &lt;&lt; 2)</code> = ' +
         '<code>0x0903001C</code> chỉ đổi chân 0, 1, 2; các chân khác giữ nguyên, dù bạn ghi giá trị gì. Đọc ở ' +
         '<code>0x090303FC</code> (mặt nạ <code>0xFF</code>) thấy cả 8 chân. Bước 4 kiểm chứng điều này bằng ' +
         '<code>devmem</code>: đọc ở <code>0x09030000</code> (mặt nạ 0) luôn ra <code>0x00</code>.' },

    { t: 'p', x:
      'Vấn đề là driver không thể dùng thẳng con số <code>0x09030000</code>. Bài 20 đã cho bạn thấy mọi con trỏ ' +
      'của một tiến trình là <b>địa chỉ ảo</b>, được MMU dịch sang địa chỉ vật lý qua bảng trang. Kernel cũng ' +
      'vậy: con trỏ trong kernel cũng là địa chỉ ảo. Kernel đã lập bảng ' +
      'trang cho toàn bộ RAM, nhưng <b>không</b> cho dải của thiết bị — và nếu có, nó sẽ đánh dấu là vùng ' +
      'nhớ thường, cho phép CPU gộp, đọc trước, giữ trong cache, những điều tai hại với một quầy giao dịch. ' +
      'Hàm <code>ioremap(phys, size)</code> làm đúng một việc: tạo một ánh xạ mới tới dải vật lý đó với kiểu ' +
      '<b>Device memory</b> (không cache, không gộp, không đọc trước) và trả về một địa chỉ ảo có kiểu ' +
      '<code>void __iomem *</code>.' },

    { t: 'fig', cap: 'Cùng một dải 4 KiB được nhìn qua ba lăng kính: Device Tree ghi địa chỉ vật lý, ioremap cấp một địa chỉ ảo kiểu Device memory, và readl/writel là cánh cửa duy nhất được phép đi qua.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Từ reg trong Device Tree qua ioremap tới readl và writel">' +
        '<rect class="d-box" x="20" y="24" width="210" height="96" rx="8"/>' +
        '<text class="d-t" x="125" y="50" text-anchor="middle">Device Tree</text>' +
        '<text class="d-tm" x="125" y="74" text-anchor="middle">reg = &lt;0 0x9030000</text>' +
        '<text class="d-tm" x="125" y="90" text-anchor="middle">0 0x1000&gt;</text>' +
        '<text class="d-ts" x="125" y="110" text-anchor="middle">địa chỉ vật lý + kích thước</text>' +
        '<rect class="d-box-p" x="255" y="24" width="210" height="96" rx="8"/>' +
        '<text class="d-t" x="360" y="50" text-anchor="middle">ioremap</text>' +
        '<text class="d-ts" x="360" y="72" text-anchor="middle">tạo bảng trang mới</text>' +
        '<text class="d-ts" x="360" y="88" text-anchor="middle">kiểu Device memory:</text>' +
        '<text class="d-ts" x="360" y="104" text-anchor="middle">không cache, không gộp</text>' +
        '<rect class="d-box-a" x="490" y="24" width="210" height="96" rx="8"/>' +
        '<text class="d-t" x="595" y="50" text-anchor="middle">void __iomem *base</text>' +
        '<text class="d-ts" x="595" y="74" text-anchor="middle">một địa chỉ ảo trong kernel</text>' +
        '<text class="d-ts" x="595" y="90" text-anchor="middle">chỉ dùng với</text>' +
        '<text class="d-tm" x="595" y="106" text-anchor="middle">readl / writel</text>' +
        '<path class="d-line" d="M230 72 H250"/><path class="d-arrow" d="M255 72 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M465 72 H485"/><path class="d-arrow" d="M490 72 l-8 -5 v10 z"/>' +
        '<rect class="d-box-g" x="20" y="160" width="330" height="116" rx="8"/>' +
        '<text class="d-t" x="185" y="186" text-anchor="middle">writel(v, base + 0x41C)</text>' +
        '<text class="d-tm" x="185" y="210" text-anchor="middle">dmb oshst</text>' +
        '<text class="d-tm" x="185" y="228" text-anchor="middle">str w0, [x1, #1052]</text>' +
        '<text class="d-ts" x="185" y="254" text-anchor="middle">rào trước, rồi mới ghi</text>' +
        '<rect class="d-box-g" x="370" y="160" width="330" height="116" rx="8"/>' +
        '<text class="d-t" x="535" y="186" text-anchor="middle">v = readl(base + 0x418)</text>' +
        '<text class="d-tm" x="535" y="210" text-anchor="middle">ldr w1, [x1]</text>' +
        '<text class="d-tm" x="535" y="228" text-anchor="middle">dmb oshld</text>' +
        '<text class="d-ts" x="535" y="254" text-anchor="middle">đọc trước, rồi mới rào</text>' +
        '<path class="d-line" d="M595 120 V140 H185 V155"/><path class="d-arrow" d="M185 160 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M595 120 V155"/><path class="d-arrow" d="M595 160 l-5 -8 h10 z"/>' +
        '</svg>' },

    { t: 'table',
      head: ['Hàm', 'Làm gì', 'Tự gỡ khi…'],
      rows: [
        ['<code>ioremap(phys, size)</code>', 'Chỉ ánh xạ. Không kiểm tra ai khác đang dùng dải đó', 'Không — phải tự <code>iounmap</code>'],
        ['<code>devm_ioremap(dev, phys, size)</code>', 'Như trên, gắn vào devres của thiết bị (Bài 54)', 'unbind / <code>rmmod</code>'],
        ['<code>devm_ioremap_resource(dev, res)</code>', '<code>devm_request_mem_region</code> + <code>devm_ioremap</code>: <b>giữ chỗ</b> trong <code>/proc/iomem</code> rồi mới ánh xạ. Hai driver cùng xin một dải → driver sau nhận <code>-EBUSY</code>', 'unbind / <code>rmmod</code>'],
        ['<code>devm_platform_ioremap_resource(pdev, 0)</code>', 'Như trên, lấy luôn resource số 0 — tức ô đầu tiên của <code>reg</code>. <b>Cách viết chuẩn cho driver mới</b>', 'unbind / <code>rmmod</code>']
      ] },

    { t: 'p', x:
      'Bài 54 đã dùng nửa đầu của hàng thứ ba: <code>devm_request_mem_region</code> cho <code>tsensor</code> ' +
      'và bạn thấy dòng <code>0b000000-0b000fff : b000000.sensor</code> hiện ra trong <code>/proc/iomem</code>. ' +
      'Khi đó không có thiết bị nào thật ở <code>0x0b000000</code> nên không ánh xạ. Bước 1 của phần thực ' +
      'hành cho bạn thấy chuyện gì xảy ra nếu cố đọc địa chỉ đó: <code>Bus error</code>.' },

    { t: 'cal', kind: 'warn', title: 'Không bao giờ dereference một con trỏ __iomem',
      x: '<code>*(u32 *)(base + 0x400)</code> biên dịch được và có khi còn chạy đúng trên ARM64. Đừng làm thế. ' +
         '<code>__iomem</code> là một nhãn dành cho công cụ kiểm tra <code>sparse</code> (Bài 51 đã nhắc ' +
         '<code>__user</code> cùng họ), và <code>readl</code>/<code>writel</code> không chỉ đọc ghi: chúng ép ' +
         'đúng độ rộng 32 bit, xử lý thứ tự byte, và chèn rào bộ nhớ — mục sau giải thích vì sao phần cuối ' +
         'này quan trọng. Kernel có đủ họ: <code>readb</code>/<code>writeb</code> (8 bit, driver PL061 của ' +
         'kernel dùng họ này), <code>readw</code>/<code>writew</code> (16), <code>readl</code>/<code>writel</code> ' +
         '(32), <code>readq</code>/<code>writeq</code> (64). Chữ <code>l</code> là <i>long</i> theo quy ước cũ, ' +
         'nghĩa là 32 bit.' },

    /* ============================================================
       2. RÀO BỘ NHỚ
       ============================================================ */
    { t: 'h2', x: 'Rào bộ nhớ: vì sao readl và writel chèn thêm một lệnh' },

    { t: 'p', x:
      'Với RAM, thứ tự các lệnh đọc ghi gần như không quan trọng, miễn kết quả cuối cùng đúng: CPU hiện đại ' +
      'được phép <b>đổi thứ tự</b> các truy cập bộ nhớ, gộp hai lần ghi liền nhau, hay đọc trước một ô nó ' +
      'đoán bạn sắp cần. Với một quầy giao dịch thì không: ghi "bắt đầu truyền" trước khi ghi "dữ liệu cần ' +
      'truyền" là gửi đi rác. Còn một trường hợp tinh vi hơn: driver chuẩn bị một bộ đệm trong RAM, rồi ' +
      'ghi vào thanh ghi để bảo thiết bị "đọc bộ đệm đó đi" (DMA). Nếu lần ghi vào thanh ghi vượt lên trước ' +
      'các lần ghi vào RAM, thiết bị đọc dữ liệu cũ.' },

    { t: 'p', x:
      'ARM64 có một lệnh để cấm chuyện đó: <code>dmb</code> (<i>data memory barrier</i>) — mọi truy cập đứng ' +
      'trước nó phải xong trước khi bất kỳ truy cập nào đứng sau nó bắt đầu. Kernel gói nó vào ' +
      '<code>readl</code>/<code>writel</code> theo đúng một quy tắc dễ nhớ, và bạn có thể đọc thẳng ra từ file ' +
      '<code>.o</code> của driver ở bước 3:' },

    { t: 'table',
      head: ['Lời gọi', 'Mã máy sinh ra (<code>objdump</code>)', 'Rào đặt ở đâu', 'Bảo đảm điều gì'],
      rows: [
        ['<code>writel(v, p)</code>', '<code>dmb oshst</code> rồi <code>str</code>', '<b>Trước</b> lần ghi', 'Mọi lần ghi vào RAM trước đó đã xong khi thiết bị nhận lệnh — bộ đệm DMA đã sẵn sàng'],
        ['<code>v = readl(p)</code>', '<code>ldr</code> rồi <code>dmb oshld</code>', '<b>Sau</b> lần đọc', 'Không lần đọc RAM nào phía sau được chạy trước — nếu thiết bị báo "dữ liệu DMA đã về", bạn đọc đúng dữ liệu mới'],
        ['<code>writel_relaxed</code>, <code>readl_relaxed</code>', 'Chỉ <code>str</code> / <code>ldr</code>', 'Không có', 'Chỉ đúng thứ tự với các truy cập MMIO <b>khác vào cùng thiết bị</b> (Device memory tự giữ thứ tự đó)']
      ] },

    { t: 'p', x:
      'Hai hậu tố <code>st</code> và <code>ld</code> nói rào chờ loại truy cập nào: ghi hay đọc. <code>osh</code> ' +
      '(<i>outer shareable</i>) nói phạm vi: mọi CPU và mọi thiết bị có thể nhìn thấy bộ nhớ đó. Nguồn: ' +
      '<code>arch/arm64/include/asm/io.h</code> định nghĩa <code>__io_bw()</code> là <code>dma_wmb()</code>, ' +
      '<code>arch/arm64/include/asm/barrier.h</code> dòng 68–69 định nghĩa <code>__dma_rmb()</code>/' +
      '<code>__dma_wmb()</code> là <code>dmb(oshld)</code>/<code>dmb(oshst)</code>, và ' +
      '<code>include/asm-generic/io.h</code> dòng 288–294 ghép chúng quanh lần ghi thật.' },

    { t: 'cal', kind: 'tip', title: 'Quy tắc thực hành',
      x: '<b>Mặc định dùng <code>readl</code>/<code>writel</code>.</b> Chỉ chuyển sang bản <code>_relaxed</code> ' +
         'khi bạn đã đo được rằng rào tốn thời gian (thường là trong một vòng lặp ghi hàng nghìn thanh ghi) ' +
         '<b>và</b> đoạn đó không dính gì tới DMA. Driver trong bài này ghi vài thanh ghi mỗi lần, nên rào ' +
         'không đáng kể. Có một bẫy tên gọi: <code>mb()</code>, <code>rmb()</code>, <code>wmb()</code> trên ARM64 ' +
         'là <code>dsb</code> (<i>data synchronization barrier</i>) — mạnh và chậm hơn <code>dmb</code>, dành cho ' +
         'trường hợp hiếm phải chờ một lần ghi thật sự tới nơi. Bạn gần như không bao giờ phải tự gọi chúng ' +
         'trong một driver thường.' },

    /* ============================================================
       3. RACE CONDITION TRONG KERNEL
       ============================================================ */
    { t: 'h2', x: 'Race condition trong kernel: ai có thể chen ngang' },

    { t: 'p', x:
      'Ở Bài 22, <code>counter++</code> trong hai luồng <code>pthread</code> mất khoảng một triệu phép cộng, vì ' +
      '<code>counter++</code> thật ra là ba lệnh — đọc, cộng, ghi — và luồng kia có thể chen vào giữa. Trong ' +
      'kernel, lỗi này y hệt, chỉ khác ở <b>danh sách những kẻ có thể chen ngang</b>. Một driver phải hỏi ' +
      'về từng kẻ một:' },

    { t: 'table',
      head: ['Kẻ chen ngang', 'Khi nào', 'Ví dụ trong driver của bài này'],
      rows: [
        ['Một CPU khác', 'Luôn luôn, nếu máy có hơn một CPU (<code>CONFIG_SMP=y</code>)', 'Hai tiến trình cùng <code>echo &gt; leds</code> trên hai CPU'],
        ['Tiến trình khác trên cùng CPU', 'Kernel này có <code>CONFIG_PREEMPT=y</code>: mã kernel đang chạy thay tiến trình có thể bị đẩy ra giữa chừng', '<code>echo</code> bị đẩy ra giữa hai lệnh, <code>vgctl</code> chạy chen vào'],
        ['Ngắt (top half)', 'Bất cứ lúc nào ngắt đang bật, trên bất kỳ CPU nào', 'Bấm nút đúng lúc <code>echo 1 &gt; leds</code> đang ghi thanh ghi'],
        ['Softirq, tasklet', 'Khi một ngắt kết thúc, hoặc trong <code>ksoftirqd</code> (Bài 55)', '— (driver này không dùng)']
      ] },

    { t: 'p', x:
      'Muốn tận mắt thấy lỗi, bạn cần ít nhất hai CPU thật sự chạy song song. Máy ảo từ Bài 50 tới giờ chỉ có ' +
      'một CPU; bài này thêm <code>-smp 2</code> vào lệnh QEMU. Module <code>race.ko</code> ở bước 2 tạo hai ' +
      '<b>kthread</b> — thread chỉ sống trong kernel, như <code>kworker</code> ở Bài 55 — gắn mỗi thread vào một ' +
      'CPU, cho mỗi thread cộng 1 000 000 lần vào cùng một biến, và in tổng. Tham số <code>mode</code> chọn cách ' +
      'cộng:' },

    { t: 'table',
      head: ['<code>mode</code>', 'Cách cộng', 'Mã máy của vòng lặp (<code>objdump</code> bước 2)'],
      rows: [
        ['0', '<code>WRITE_ONCE(plain, READ_ONCE(plain) + 1)</code>', '<code>ldr</code> · <code>add</code> · <code>str</code> — ba lệnh rời nhau'],
        ['1', '<code>atomic_inc(&amp;counter)</code>', '<code>stadd</code> — <b>một</b> lệnh, phần cứng làm cả đọc-cộng-ghi'],
        ['2', '<code>spin_lock</code> · <code>plain++</code> · <code>spin_unlock</code>', 'Gọi <code>_raw_spin_lock</code>, ba lệnh, gọi <code>_raw_spin_unlock</code>'],
        ['3', '<code>mutex_lock</code> · <code>plain++</code> · <code>mutex_unlock</code>', 'Như trên, với <code>mutex_lock</code>/<code>mutex_unlock</code>']
      ] },

    { t: 'cal', kind: 'info', title: 'READ_ONCE và WRITE_ONCE không phải là thuốc chữa',
      x: 'Mode 0 dùng <code>READ_ONCE</code>/<code>WRITE_ONCE</code> thay vì <code>plain++</code> cho một lý do ' +
         'kỹ thuật: không có chúng, GCC nhận ra vòng lặp chỉ cộng dồn và có thể gộp cả triệu lần cộng thành một ' +
         'phép <code>plain += loops</code>, xoá mất cơ hội để race. Hai macro này buộc trình biên dịch đọc và ghi ' +
         'bộ nhớ <b>đúng một lần mỗi vòng</b>. Chúng không làm cho đọc-cộng-ghi thành nguyên tử — bước 2 cho thấy ' +
         'vẫn mất gần một nửa. Dùng chúng khi bạn chỉ cần đọc hoặc chỉ cần ghi một biến mà nơi khác có thể đổi, ' +
         'như <code>READ_ONCE(vg-&gt;leds)</code> trong driver cuối bài.' },

    /* ============================================================
       4. BA CÔNG CỤ
       ============================================================ */
    { t: 'h2', x: 'Ba công cụ: atomic_t, spinlock, mutex' },

    { t: 'h3', x: 'atomic_t: khi dữ liệu chỉ là một con số' },

    { t: 'p', x:
      '<code>atomic_t</code> là một <code>int</code> bọc trong một struct để bạn không lỡ tay cộng nó bằng ' +
      '<code>++</code>. Mọi thao tác đi qua hàm: <code>atomic_set</code>, <code>atomic_read</code>, ' +
      '<code>atomic_inc</code>, <code>atomic_dec_and_test</code>, <code>atomic_add_return</code>… Trên CPU có ' +
      'phần mở rộng LSE (ARMv8.1 trở lên, kernel này bật <code>CONFIG_ARM64_LSE_ATOMICS=y</code>) mỗi hàm là ' +
      '<b>một lệnh</b> như <code>stadd</code>. Cortex-A57 là ARMv8.0, không có LSE, nên kernel tự vá lúc nạp mã ' +
      'sang nhánh dự phòng <code>ldxr</code>/<code>stxr</code>: đọc với cờ độc quyền, cộng, ghi với điều kiện ' +
      'không ai đụng vào ô đó trong lúc ấy, nếu có thì thử lại. <code>objdump</code> ở bước 2 cho thấy cả hai ' +
      'nhánh nằm sẵn trong <code>race.ko</code>.' },

    { t: 'p', x:
      'Dùng <code>atomic_t</code> khi dữ liệu cần bảo vệ là <b>một biến nguyên duy nhất</b> và các thao tác chỉ ' +
      'là đọc, cộng, trừ, so sánh-rồi-đổi: bộ đếm, cờ, số tham chiếu. Nó không bao giờ ngủ, nên dùng được ở ' +
      'mọi ngữ cảnh — kể cả top half. Driver cuối bài dùng nó cho <code>presses</code>. Khi hai biến phải đổi ' +
      '<b>cùng nhau</b> (một số và thanh ghi tương ứng), <code>atomic_t</code> không đủ: cần khoá.' },

    { t: 'h3', x: 'spinlock_t: khoá quay vòng, không bao giờ ngủ' },

    { t: 'p', x:
      'Spinlock là một ô nhớ mang nghĩa "có người đang ở trong". <code>spin_lock</code> thử chiếm nó bằng một ' +
      'thao tác nguyên tử; nếu đã có người, CPU <b>quay vòng tại chỗ</b> (<i>spin</i>) kiểm tra đi kiểm tra lại ' +
      'tới khi được. Không có gì ngủ, không có gì được lập lịch. Hai hệ quả:' },

    { t: 'list', items: [
      '<b>Dùng được trong top half và softirq</b> — nơi Bài 55 cấm mọi thứ có thể ngủ. Đây là lý do nó tồn tại.',
      '<b>Đoạn giữa <code>spin_lock</code> và <code>spin_unlock</code> phải ngắn và không được ngủ.</b> ' +
        '<code>spin_lock</code> tắt preempt trên CPU đó (<code>preempt_count</code> tăng 1 — bảng ở Bài 55 đã ' +
        'ghi chú <code>spin_lock()</code> ở ô preempt), nên bên trong là ngữ cảnh nguyên tử: <code>msleep</code>, ' +
        '<code>mutex_lock</code>, <code>kmalloc(GFP_KERNEL)</code>, <code>copy_to_user</code> đều bị cấm. ' +
        'Trong lúc bạn giữ khoá, CPU kia (nếu muốn cùng khoá) đang đốt điện vô ích.'
    ] },

    { t: 'h3', x: 'struct mutex: khoá có hàng chờ, được ngủ' },

    { t: 'p', x:
      '<code>mutex_lock</code> cũng thử chiếm khoá, nhưng nếu đã có người, tiến trình <b>đi ngủ</b> trong hàng ' +
      'chờ và CPU chạy việc khác; <code>mutex_unlock</code> đánh thức người đầu hàng. Bạn đã dùng nó cho ' +
      '<code>ramdisk</code> ở Bài 52 vì đoạn giữ khoá có <code>copy_to_user</code> — thứ có thể ngủ. Đổi lại, ' +
      'mutex <b>không dùng được trong top half, softirq, hay khi đang giữ spinlock</b>.' },

    { t: 'fig', cap: 'Chọn công cụ bằng hai câu hỏi: dữ liệu có phải chỉ một con số không, và có đoạn mã nào dùng nó mà không được ngủ không. Nếu top half cũng chạm vào dữ liệu, phía tiến trình phải dùng spin_lock_irqsave.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Cây quyết định chọn atomic_t, spinlock hoặc mutex">' +
        '<rect class="d-box-p" x="210" y="16" width="300" height="52" rx="8"/>' +
        '<text class="d-t" x="360" y="38" text-anchor="middle">Dữ liệu dùng chung chỉ là</text>' +
        '<text class="d-t" x="360" y="56" text-anchor="middle">một con số nguyên?</text>' +
        '<rect class="d-box-g" x="20" y="110" width="200" height="60" rx="8"/>' +
        '<text class="d-tm" x="120" y="136" text-anchor="middle">atomic_t</text>' +
        '<text class="d-ts" x="120" y="156" text-anchor="middle">mọi ngữ cảnh, không khoá</text>' +
        '<path class="d-line" d="M260 68 V90 H120 V105"/><path class="d-arrow" d="M120 110 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="190" y="86" text-anchor="middle">có</text>' +
        '<rect class="d-box-p" x="330" y="100" width="370" height="60" rx="8"/>' +
        '<text class="d-t" x="515" y="124" text-anchor="middle">Có đoạn nào dùng nó trong</text>' +
        '<text class="d-t" x="515" y="144" text-anchor="middle">top half / softirq / đang giữ spinlock?</text>' +
        '<path class="d-line" d="M460 68 V95"/><path class="d-arrow" d="M460 100 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="480" y="86">không</text>' +
        '<rect class="d-box-a" x="250" y="210" width="210" height="60" rx="8"/>' +
        '<text class="d-tm" x="355" y="236" text-anchor="middle">struct mutex</text>' +
        '<text class="d-ts" x="355" y="256" text-anchor="middle">được ngủ khi giữ khoá</text>' +
        '<path class="d-line" d="M420 160 V190 H355 V205"/><path class="d-arrow" d="M355 210 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="400" y="184" text-anchor="middle">không</text>' +
        '<rect class="d-box-w" x="480" y="200" width="220" height="110" rx="8"/>' +
        '<text class="d-tm" x="590" y="226" text-anchor="middle">spinlock_t</text>' +
        '<text class="d-ts" x="590" y="248" text-anchor="middle">trong top half:</text>' +
        '<text class="d-tm" x="590" y="264" text-anchor="middle">spin_lock</text>' +
        '<text class="d-ts" x="590" y="284" text-anchor="middle">ở ngữ cảnh tiến trình:</text>' +
        '<text class="d-tm" x="590" y="300" text-anchor="middle">spin_lock_irqsave</text>' +
        '<path class="d-line" d="M610 160 V195"/><path class="d-arrow" d="M610 200 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="630" y="184">có</text>' +
        '</svg>' },

    { t: 'h3', x: 'spin_lock_irqsave: khi top half cũng muốn cùng khoá' },

    { t: 'p', x:
      'Đây là cái bẫy kinh điển nhất của bài, và phần thực hành sẽ cho bạn rơi vào nó. Giả sử ' +
      '<code>leds_store</code> (ngữ cảnh tiến trình) giữ khoá bằng <code>spin_lock</code>, và đúng lúc đó một ngắt ' +
      'đến <b>trên cùng CPU</b>. Top half chạy, cũng gọi <code>spin_lock</code> cho cùng khoá, thấy khoá đang ' +
      'bận, và quay vòng chờ. Nhưng người giữ khoá chính là đoạn mã vừa bị top half cắt ngang — nó chỉ chạy ' +
      'tiếp được khi top half trả CPU lại. Top half không bao giờ trả, vì nó đang chờ khoá. CPU đó treo vĩnh ' +
      'viễn, ngắt tắt, không in gì.' },

    { t: 'p', x:
      '<code>spin_lock_irqsave(&amp;lock, flags)</code> tắt ngắt trên CPU hiện tại <b>trước</b> khi chiếm khoá và ' +
      'lưu trạng thái cũ vào <code>flags</code>; <code>spin_unlock_irqrestore</code> nhả khoá rồi khôi phục. Ngắt ' +
      'vẫn có thể đến trên CPU <i>khác</i> — top half ở đó quay vòng vài micro giây tới khi CPU này nhả khoá, ' +
      'hoàn toàn bình thường. Quy tắc: <b>nếu một khoá được lấy trong top half, mọi nơi khác lấy nó phải dùng ' +
      'bản <code>_irqsave</code></b>. Bên trong top half dùng <code>spin_lock</code> thường là đủ, vì ngắt trên ' +
      'CPU đó đã tắt sẵn (Bài 55: <code>irqs_off=1</code>).' },

    { t: 'table',
      head: ['', '<code>atomic_t</code>', '<code>spinlock_t</code>', '<code>struct mutex</code>'],
      rows: [
        ['Bảo vệ', 'Một số nguyên', 'Vài biến + thanh ghi, đoạn ngắn', 'Bất kỳ, đoạn dài được'],
        ['Chờ bằng cách', 'Không chờ (một lệnh, hoặc thử lại)', 'Quay vòng, đốt CPU', 'Ngủ trong hàng chờ'],
        ['Trong top half / softirq', 'Được', 'Được', '<b>Cấm</b>'],
        ['Được ngủ khi đang giữ', '—', '<b>Cấm</b>', 'Được'],
        ['Khai báo tĩnh', '<code>ATOMIC_INIT(0)</code>', '<code>DEFINE_SPINLOCK(x)</code>', '<code>DEFINE_MUTEX(x)</code>'],
        ['Trong struct', '<code>atomic_set</code>', '<code>spin_lock_init</code>', '<code>mutex_init</code>'],
        ['2 000 000 lần cộng, 2 CPU (bước 2)', '<b>121 ms</b>', '<b>257 ms</b>', '<b>393 ms</b>']
      ] },

    { t: 'cal', kind: 'tip', title: 'Một câu để nhớ',
      x: '<b>"Số thì atomic, ngủ thì mutex, ngắt thì spinlock — và ngắt chạm vào thì irqsave."</b> Ba vế đầu ' +
         'chọn công cụ; vế cuối là lỗi bạn sẽ gặp ở bước 6. Kiểm tra nhanh bằng bảng "có được ngủ không" của ' +
         'Bài 55: nếu bất kỳ nơi nào dùng dữ liệu nằm ở cột "Cấm", mutex bị loại.' },

    /* ============================================================
       5. DỰ ÁN: BẢNG LED ẢO
       ============================================================ */
    { t: 'h2', x: 'Dự án: bảng LED ảo trên khối GPIO thật' },

    { t: 'p', x:
      'Máy <code>virt</code> không có đèn LED nào, nhưng nó có khối PL061 thật: 8 chân, thanh ghi thật ở ' +
      '<code>0x09030000</code>, và chân 3 nối với nút nguồn ảo — thứ duy nhất bạn bấm được từ monitor QEMU (Bài ' +
      '55). Driver <code>vgpio</code> coi chân 0, 1, 2 là ba đèn LED và chân 3 là một nút bấm, rồi ghép lại mọi ' +
      'thứ Chặng 10 đã dạy:' },

    { t: 'table',
      head: ['Phần', 'Học ở', 'Trong <code>vgpio.c</code>'],
      rows: [
        ['Platform driver, khớp bằng <code>compatible</code>, devres', 'Bài 54', '<code>vg_probe</code>, <code>of_match_table</code>, mọi tài nguyên đều <code>devm_</code>'],
        ['sysfs attribute qua <code>.dev_groups</code>', 'Bài 53, 54', '<code>leds</code> (RW), <code>pins</code> (RO), <code>presses</code> (RO)'],
        ['<code>ioctl</code> với header dùng chung', 'Bài 53', '<code>VGPIO_GET_STATE</code> (<code>_IOR</code>), <code>VGPIO_SET_LEDS</code> (<code>_IOW</code>)'],
        ['Ngắt', 'Bài 55', '<code>devm_request_irq</code>, top half đọc <code>GPIOMIS</code> rồi ghi <code>GPIOIC</code>'],
        ['MMIO', '<b>Bài này</b>', '<code>devm_platform_ioremap_resource</code>, 15 lời gọi <code>readl</code>/<code>writel</code>'],
        ['Đồng bộ', '<b>Bài này</b>', '<code>spinlock_t lock</code> cho <code>leds</code> + thanh ghi DATA, <code>atomic_t presses</code>']
      ] },

    { t: 'p', x:
      'Có một thứ mới về giao diện: thay vì <code>alloc_chrdev_region</code> + <code>cdev_add</code> + ' +
      '<code>class_create</code> + <code>device_create</code> như Bài 52–54, driver dùng <b><code>misc_register</code></b>. ' +
      'Kernel có sẵn một major dành cho những thiết bị "linh tinh" chỉ cần một node: major <b>10</b>. ' +
      '<code>misc_register</code> cấp một minor trống (từ 256 trở lên khi bạn xin ' +
      '<code>MISC_DYNAMIC_MINOR</code>), tạo luôn node <code>/dev/vgpio</code> qua devtmpfs, và ghi một dòng vào ' +
      '<code>/proc/misc</code> — bốn lời gọi thu lại thành một. Đổi lại bạn chỉ có đúng một node; ' +
      '<code>tsensor</code> với bốn cảm biến vẫn cần cách của Bài 52.' },

    { t: 'p', x:
      'Và một điều bắt buộc phải làm cho thiết bị có ngắt <b>mức</b>. PL061 báo ngắt cho GIC theo mức cao ' +
      '(<code>interrupts = &lt;0x00 0x07 0x04&gt;</code>, ô cuối 4 = mức cao — bảng cờ ở Bài 55): đường dây ' +
      'giữ ở mức cao chừng nào cờ trong <code>GPIORIS</code> còn bật. Top half phải <b>ghi 1 vào ' +
      '<code>GPIOIC</code></b> để hạ cờ. Quên dòng đó thì ngay khi top half trả về, GIC lại thấy đường dây cao ' +
      'và gọi top half lần nữa, mãi mãi. Bài 55 chưa gặp chuyện này vì driver PL061 của kernel tự xoá cờ trước ' +
      'khi gọi handler của <code>talarm</code>; lần này chính bạn là driver PL061. Bước 6 cho bạn thấy điều đó.' },

    { t: 'fig', cap: 'Một lần bấm nút: GIC gọi vg_irq, vg_irq đọc GPIOMIS để chắc là nút của mình, hạ cờ ngắt bằng GPIOIC, tăng atomic_t, và đảo LED 0 dưới cùng spinlock mà sysfs và ioctl dùng.',
      svg:
        '<svg viewBox="0 0 720 280" width="720" role="img" aria-label="Luồng xử lý một lần bấm nút trong driver vgpio">' +
        '<rect class="d-box" x="16" y="30" width="120" height="56" rx="8"/>' +
        '<text class="d-t" x="76" y="54" text-anchor="middle">system_</text>' +
        '<text class="d-t" x="76" y="72" text-anchor="middle">powerdown</text>' +
        '<rect class="d-box" x="160" y="30" width="120" height="56" rx="8"/>' +
        '<text class="d-t" x="220" y="54" text-anchor="middle">PL061</text>' +
        '<text class="d-ts" x="220" y="72" text-anchor="middle">chân 3 sườn lên</text>' +
        '<rect class="d-box" x="304" y="30" width="120" height="56" rx="8"/>' +
        '<text class="d-t" x="364" y="54" text-anchor="middle">GIC</text>' +
        '<text class="d-ts" x="364" y="72" text-anchor="middle">SPI 7 → IRQ 20</text>' +
        '<path class="d-line" d="M136 58 H155"/><path class="d-arrow" d="M160 58 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M280 58 H299"/><path class="d-arrow" d="M304 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box-p" x="448" y="16" width="256" height="248" rx="8"/>' +
        '<text class="d-t" x="576" y="40" text-anchor="middle">vg_irq (top half)</text>' +
        '<text class="d-tm" x="576" y="70" text-anchor="middle">readl(GPIOMIS) &amp; BIT(3)?</text>' +
        '<text class="d-tm" x="576" y="100" text-anchor="middle">writel(BIT(3), GPIOIC)</text>' +
        '<text class="d-ts" x="576" y="116" text-anchor="middle">hạ đường dây, nếu không: bão ngắt</text>' +
        '<text class="d-tm" x="576" y="146" text-anchor="middle">atomic_inc(&amp;presses)</text>' +
        '<text class="d-tm" x="576" y="176" text-anchor="middle">spin_lock(&amp;lock)</text>' +
        '<text class="d-tm" x="576" y="196" text-anchor="middle">writel(leds ^ 1, DATA)</text>' +
        '<text class="d-tm" x="576" y="216" text-anchor="middle">spin_unlock(&amp;lock)</text>' +
        '<text class="d-tm" x="576" y="246" text-anchor="middle">return IRQ_HANDLED</text>' +
        '<path class="d-line" d="M424 58 H443"/><path class="d-arrow" d="M448 58 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="16" y="160" width="408" height="104" rx="8"/>' +
        '<text class="d-t" x="220" y="184" text-anchor="middle">Ngữ cảnh tiến trình: sysfs leds, ioctl SET_LEDS</text>' +
        '<text class="d-tm" x="220" y="212" text-anchor="middle">spin_lock_irqsave(&amp;lock, flags)</text>' +
        '<text class="d-tm" x="220" y="230" text-anchor="middle">writel(val, DATA)</text>' +
        '<text class="d-tm" x="220" y="248" text-anchor="middle">spin_unlock_irqrestore(&amp;lock, flags)</text>' +
        '<path class="d-line" d="M424 206 H443"/><path class="d-arrow" d="M448 206 l-8 -5 v10 z"/>' +
        '<text class="d-ts" x="436" y="150" text-anchor="middle">cùng một khoá</text>' +
        '</svg>' },

    { t: 'terms', items: [
      ['MMIO', 'memory-mapped I/O', 'Thanh ghi của thiết bị nằm trong không gian địa chỉ vật lý, đọc ghi bằng lệnh <code>ldr</code>/<code>str</code> như RAM.'],
      ['Thanh ghi', 'register', 'Một ô (thường 32 bit) trong dải MMIO của thiết bị. Ghi vào là ra lệnh, đọc ra là hỏi trạng thái hiện tại.'],
      ['<code>ioremap</code>', '—', 'Tạo một ánh xạ địa chỉ ảo kiểu Device memory (không cache, không gộp) tới một dải địa chỉ vật lý, trả về <code>void __iomem *</code>.'],
      ['Rào bộ nhớ', 'memory barrier', 'Lệnh cấm CPU đổi thứ tự các truy cập bộ nhớ qua nó. Trên ARM64: <code>dmb</code>, <code>dsb</code>.'],
      ['Race condition', '—', 'Kết quả phụ thuộc vào thứ tự chen nhau của hai đoạn mã cùng chạm vào một dữ liệu.'],
      ['Vùng tới hạn', 'critical section', 'Đoạn mã giữa lúc lấy khoá và lúc nhả khoá.'],
      ['Spinlock', '—', 'Khoá chờ bằng cách quay vòng, không bao giờ ngủ; dùng được trong ngữ cảnh ngắt.'],
      ['Deadlock', '—', 'Hai bên chờ nhau mãi mãi. Với spinlock: CPU quay vòng vĩnh viễn, máy (hoặc một CPU) treo cứng.'],
      ['Misc device', '—', 'Char device dùng chung major 10, minor tự cấp; <code>misc_register</code> thay cho bốn lời gọi của Bài 52.']
    ] },

    /* ============================================================
       6. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ devmem tới một driver có đồng bộ' },

    { t: 'p', x:
      'Bạn làm việc trong thư mục mới <code>~/bai56</code>. Bài chỉ <b>đọc</b> kernel đã build ở ' +
      '<code>~/bai38/linux-6.18.45</code> và initramfs của Bài 32 ở <code>~/bai32</code>; không cần gì trong ' +
      '<code>~/bai54</code> hay <code>~/bai55</code>. Mọi lệnh QEMU trong bài đều có thêm <b><code>-smp 2</code></b>: ' +
      'hai CPU, vì race condition cần hai nơi chạy song song.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/bai56 && cd ~/bai56' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Đọc thanh ghi PL061 từ userspace bằng devmem',
        blocks: [
          { t: 'p', x:
            'Trước khi viết driver, hãy chạm vào thiết bị bằng tay. BusyBox có applet <code>devmem</code>: nó mở ' +
            '<code>/dev/mem</code> (một char device ánh xạ cả không gian địa chỉ vật lý), <code>mmap</code> trang ' +
            'chứa địa chỉ bạn đưa, rồi đọc hoặc ghi đúng một ô. Đây là công cụ kiểm chứng số một khi làm driver ' +
            'trên board thật: driver nói nó ghi <code>0x05</code>, <code>devmem</code> cho bạn xem thanh ghi có ' +
            'thật sự là <code>0x05</code> không. Boot máy ảo với initramfs gốc của Bài 32 và cây mặc định của QEMU ' +
            '(không có <code>-dtb</code>):' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Ở dấu nhắc <code>~ #</code>, gắn devtmpfs (Bài 52 — <code>devmem</code> cần <code>/dev/mem</code>), ' +
            'kiểm tra số CPU, rồi đọc tám ô nhận dạng ở cuối dải 4 KiB của PL061:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'nproc\n' +
            'grep 9030000 /proc/iomem\n' +
            'for o in fe0 fe4 fe8 fec ff0 ff4 ff8 ffc; do devmem 0x09030$o 32; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # nproc\n' +
            '2\n' +
            '~ # grep 9030000 /proc/iomem\n' +
            '09030000-09030fff : pl061@9030000\n' +
            '  09030000-09030fff : 9030000.pl061 pl061@9030000\n' +
            '~ # for o in fe0 fe4 fe8 fec ff0 ff4 ff8 ffc; do devmem 0x09030$o 32; done\n' +
            '0x00000061\n' +
            '0x00000010\n' +
            '0x00000004\n' +
            '0x00000000\n' +
            '0x0000000D\n' +
            '0x000000F0\n' +
            '0x00000005\n' +
            '0x000000B1' },

          { t: 'cmdx', cmd: 'devmem 0x09030fe0 32',
            rows: [
              ['<code>devmem</code>', 'Applet BusyBox: đọc/ghi một ô nhớ vật lý qua <code>/dev/mem</code>.', 'Kernel phải bật <code>CONFIG_DEVMEM=y</code> — kernel của bạn bật (<code>grep DEVMEM ~/bai38/linux-6.18.45/.config</code>)'],
              ['<code>0x09030fe0</code>', 'Địa chỉ <b>vật lý</b>: gốc <code>0x09030000</code> của PL061 + độ lệch <code>0xFE0</code> của <code>PeriphID0</code>.', 'Không cần <code>ioremap</code> — <code>devmem</code> tự <code>mmap</code> trang chứa địa chỉ đó'],
              ['<code>32</code>', 'Độ rộng truy cập tính bằng bit: 8, 16, 32 hoặc 64.', 'Bỏ trống thì mặc định 32. Thêm một đối số thứ ba là <b>ghi</b> giá trị đó (bước 4)']
            ] },

          { t: 'cal', kind: 'why', title: 'Bốn ô đầu là tên của thiết bị, bốn ô sau là chữ ký của ARM',
            x: 'Mỗi ô chỉ dùng 8 bit thấp. Ghép <code>PeriphID0..2</code> từ thấp lên cao: <code>0x61</code>, ' +
               '<code>0x10</code>, <code>0x04</code> → <code>0x041061</code>. 12 bit thấp <code>0x061</code> là số hiệu ' +
               'linh kiện — PL<b>061</b>. 8 bit tiếp theo <code>0x41</code> là mã nhà thiết kế, <code>0x41</code> là ' +
               'chữ <code>A</code> trong ASCII: ARM. Bốn ô <code>PrimeCellID</code> (<code>0x0D 0xF0 0x05 0xB1</code>) ' +
               'là hằng số giống nhau trên mọi khối "PrimeCell" của ARM — PL011, PL031, PL061 — để phần mềm biết ' +
               'đây là một PrimeCell trước khi đọc ID. Driver ở bước 3 kiểm tra đúng con số <code>0x061</code> này ' +
               'trong <code>probe</code>. Dòng <code>/proc/iomem</code> cho thấy dải này đang thuộc về driver ' +
               'PL061 của kernel (<code>9030000.pl061</code>); <code>devmem</code> vẫn đọc được vì nó đi qua ' +
               '<code>/dev/mem</code>, không xin dải qua <code>request_mem_region</code>.' },

          { t: 'p', x:
            'Giờ đọc ba thanh ghi chức năng: hướng chân, mặt nạ ngắt, và mức của cả 8 chân:' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x09030400 8\n' +
            'devmem 0x09030410 8\n' +
            'devmem 0x090303fc 8' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # devmem 0x09030400 8\n' +
            '0x00\n' +
            '~ # devmem 0x09030410 8\n' +
            '0x08\n' +
            '~ # devmem 0x090303fc 8\n' +
            '0x00' },

          { t: 'cal', kind: 'info', title: '0x08 là dấu vân tay của gpio-keys',
            x: '<code>GPIODIR</code> = <code>0x00</code>: cả 8 chân đang là input. <code>GPIOIE</code> = <code>0x08</code> ' +
               '= bit 3: chỉ chân 3 được phép gây ngắt — đó là việc <code>gpio-keys</code> làm lúc boot khi nó xin chân ' +
               'nút nguồn (Bài 55). <code>GPIODATA</code> đọc ở <code>0x3FC</code> (mặt nạ <code>0xFF</code>) = ' +
               '<code>0x00</code>: không chân nào đang ở mức cao. Ba con số này là trạng thái <b>trước</b> driver của ' +
               'bạn; bước 3 đọc lại chúng sau khi <code>vgpio</code> cấu hình thiết bị.' },

          { t: 'p', x:
            'Cuối cùng, hai lần đọc sai chỗ. <code>0x0b000000</code> là nơi Bài 54 đặt <code>sensor@b000000</code> — ' +
            'trong Device Tree thì có, trên máy <code>virt</code> thì không có gì. <code>0x40000000</code> là đầu RAM:' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x0b000000 32\n' +
            'echo rc=$?\n' +
            'devmem 0x40000000 32\n' +
            'echo rc=$?\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # devmem 0x0b000000 32\n' +
            'Bus error\n' +
            '~ # echo rc=$?\n' +
            'rc=135\n' +
            '~ # devmem 0x40000000 32\n' +
            'devmem: mmap: Operation not permitted\n' +
            '~ # echo rc=$?\n' +
            'rc=1' },

          { t: 'cal', kind: 'why', title: 'Hai lỗi, hai tầng khác nhau',
            x: '<b><code>Bus error</code>, rc 135</b> = 128 + 7, tín hiệu 7 là <code>SIGBUS</code>. <code>mmap</code> ' +
               'thành công (kernel không biết ở đó có gì), nhưng khi CPU thật sự phát lệnh <code>ldr</code>, không ' +
               'thiết bị nào trên bus trả lời, bus báo lỗi ngược về CPU, kernel đổi thành <code>SIGBUS</code> cho tiến ' +
               'trình. Đây là lý do Bài 54 chỉ <i>giữ chỗ</i> dải của <code>tsensor</code> mà không đọc: một driver ' +
               'gọi <code>readl</code> ở đó sẽ gây ra lỗi tương tự bên trong kernel. <b><code>Operation not ' +
               'permitted</code>, rc 1</b> xảy ra sớm hơn, ở chính <code>mmap</code>: kernel bật ' +
               '<code>CONFIG_STRICT_DEVMEM=y</code>, cấm <code>/dev/mem</code> ánh xạ RAM — nếu không, bất kỳ ' +
               'tiến trình root nào cũng đọc được bộ nhớ của mọi tiến trình khác. Dải MMIO của thiết bị vẫn được ' +
               'phép, và đó là thứ duy nhất <code>devmem</code> nên dùng.' },

          { t: 'cal', kind: 'warn', title: 'devmem là công cụ kiểm chứng, không phải driver',
            x: 'Ghi bằng <code>devmem</code> vào thanh ghi mà một driver đang quản lý là tạo race condition bằng tay: ' +
               'driver không biết bạn vừa đổi gì. Trên board thật, ghi nhầm vào thanh ghi của bộ điều khiển nguồn ' +
               'hoặc DRAM có thể treo máy ngay. Bước 4 cố tình làm điều đó một lần trên máy ảo để bạn thấy hậu quả.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Tái hiện race condition trong kernel, rồi sửa ba cách',
        blocks: [
          { t: 'p', x:
            'Tạo module <code>race</code>: hai kthread, mỗi thread gắn vào một CPU, cùng cộng vào một biến. Tham số ' +
            '<code>mode</code> truyền lúc <code>insmod</code> chọn cách cộng. <code>module_param</code> là thứ mới ở ' +
            'đây: nó biến một biến <code>static</code> thành tham số dòng lệnh của module và một file trong ' +
            '<code>/sys/module/race/parameters/</code>.' },

          { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai56/race && cd ~/bai56/race' },

          { t: 'code', where: 'file', name: '~/bai56/race/race.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * Two kernel threads, one shared counter, three ways to update it.\n' +
            ' * mode=0: plain load + store, 1: atomic_t, 2: spinlock, 3: mutex.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/kthread.h>\n' +
            '#include <linux/completion.h>\n' +
            '#include <linux/spinlock.h>\n' +
            '#include <linux/mutex.h>\n' +
            '#include <linux/atomic.h>\n' +
            '#include <linux/ktime.h>\n' +
            '\n' +
            'static int mode;\n' +
            'module_param(mode, int, 0444);\n' +
            'MODULE_PARM_DESC(mode, "0 = plain, 1 = atomic_t, 2 = spinlock, 3 = mutex");\n' +
            '\n' +
            'static int loops = 1000000;\n' +
            'module_param(loops, int, 0444);\n' +
            '\n' +
            'static int plain;                       /* shared, unprotected in mode 0 */\n' +
            'static atomic_t counter = ATOMIC_INIT(0);\n' +
            'static DEFINE_SPINLOCK(lock);\n' +
            'static DEFINE_MUTEX(mtx);\n' +
            'static struct completion done[2];\n' +
            '\n' +
            'static int worker(void *arg)\n' +
            '{\n' +
            '\tlong id = (long)arg;\n' +
            '\tint i;\n' +
            '\n' +
            '\tfor (i = 0; i < loops; i++) {\n' +
            '\t\tswitch (mode) {\n' +
            '\t\tcase 0:\n' +
            '\t\t\tWRITE_ONCE(plain, READ_ONCE(plain) + 1);\n' +
            '\t\t\tbreak;\n' +
            '\t\tcase 1:\n' +
            '\t\t\tatomic_inc(&counter);\n' +
            '\t\t\tbreak;\n' +
            '\t\tcase 2:\n' +
            '\t\t\tspin_lock(&lock);\n' +
            '\t\t\tplain++;\n' +
            '\t\t\tspin_unlock(&lock);\n' +
            '\t\t\tbreak;\n' +
            '\t\tcase 3:\n' +
            '\t\t\tmutex_lock(&mtx);\n' +
            '\t\t\tplain++;\n' +
            '\t\t\tmutex_unlock(&mtx);\n' +
            '\t\t\tbreak;\n' +
            '\t\t}\n' +
            '\t}\n' +
            '\tcomplete(&done[id]);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static int __init race_init(void)\n' +
            '{\n' +
            '\tstruct task_struct *t[2];\n' +
            '\tktime_t start;\n' +
            '\tlong id;\n' +
            '\tint result;\n' +
            '\n' +
            '\tstart = ktime_get();\n' +
            '\tfor (id = 0; id < 2; id++) {\n' +
            '\t\tinit_completion(&done[id]);\n' +
            '\t\tt[id] = kthread_create(worker, (void *)id, "race/%ld", id);\n' +
            '\t\tif (IS_ERR(t[id]))\n' +
            '\t\t\treturn PTR_ERR(t[id]);\n' +
            '\t\tif (cpu_online(id))\n' +
            '\t\t\tkthread_bind(t[id], id);    /* one thread per CPU */\n' +
            '\t}\n' +
            '\twake_up_process(t[0]);\n' +
            '\twake_up_process(t[1]);\n' +
            '\twait_for_completion(&done[0]);\n' +
            '\twait_for_completion(&done[1]);\n' +
            '\n' +
            '\tresult = mode == 1 ? atomic_read(&counter) : plain;\n' +
            '\tpr_info("race: mode %d: %d of %d, lost %d, %lld ms\\n", mode, result,\n' +
            '\t\t2 * loops, 2 * loops - result,\n' +
            '\t\tktime_ms_delta(ktime_get(), start));\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit race_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(race_init);\n' +
            'module_exit(race_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Lost updates on a shared counter");',
            notes: ['92 dòng. Cả module chạy trong <code>race_init</code>: <code>insmod</code> chỉ trả về khi hai thread đã xong, nên dòng kết quả luôn in ra trước dấu nhắc tiếp theo.'] },

          { t: 'table',
            head: ['Dòng', 'Ý nghĩa'],
            rows: [
              ['<code>module_param(mode, int, 0444)</code>', 'Tham số kiểu <code>int</code>, đặt bằng <code>insmod race.ko mode=2</code>. <code>0444</code> = file <code>/sys/module/race/parameters/mode</code> ai cũng đọc được, không ai ghi được'],
              ['<code>kthread_create(worker, arg, "race/%ld", id)</code>', 'Tạo một thread kernel đang ngủ, tên <code>race/0</code>, <code>race/1</code>. Nó chưa chạy cho tới <code>wake_up_process</code>'],
              ['<code>kthread_bind(t, id)</code>', 'Ghim thread vào CPU số <code>id</code> — bảo đảm hai thread thật sự chạy song song trên hai CPU. <code>cpu_online</code> bỏ qua việc ghim khi chỉ có một CPU'],
              ['<code>struct completion</code>', 'Một "cờ đã xong" có thể chờ: <code>wait_for_completion</code> ngủ tới khi thread gọi <code>complete</code>. Được ngủ vì <code>race_init</code> chạy trong ngữ cảnh tiến trình của <code>insmod</code>'],
              ['<code>ktime_get</code>, <code>ktime_ms_delta</code>', 'Đồng hồ đơn điệu của kernel (như Bài 55) — đo thời gian cho cả hai thread']
            ] },

          { t: 'p', x:
            'Makefile giống hệt các bài trước, chỉ đổi tên. Build, rồi chép module vào một bản sao của initramfs Bài 32:' },

          { t: 'code', where: 'file', name: '~/bai56/race/Makefile', lang: 'makefile', code:
            'obj-m := race.o\n' +
            '\n' +
            'KDIR          ?= $(HOME)/bai38/linux-6.18.45\n' +
            'ARCH          ?= arm64\n' +
            'CROSS_COMPILE ?= aarch64-linux-gnu-\n' +
            '\n' +
            'all:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) modules\n' +
            '\n' +
            'clean:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) clean',
            notes: ['Dòng lệnh dưới <code>all:</code> và <code>clean:</code> phải bắt đầu bằng một ký tự Tab (Bài 16).'] },

          { t: 'code', where: 'wsl', code:
            'make\n' +
            'aarch64-linux-gnu-objdump -d --no-show-raw-insn race.o | grep -E "stadd|ldxr|stxr|_raw_spin_lock|mutex_lock"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  race.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  race.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  race.ko\n' +
            '...\n' +
            '  68:\tstadd\tw25, [x0]\n' +
            '  e8:\tbl\t0 <mutex_lock>\n' +
            ' 108:\tbl\t0 <_raw_spin_lock>\n' +
            ' 12c:\tldxr\tw0, [x2]\n' +
            ' 134:\tstxr\tw1, w0, [x2]',
            notes: ['Dòng <code>make[1]: Entering directory…</code> đã được lược bớt. Các độ lệch ở cột đầu (<code>68</code>, <code>e8</code>…) có thể khác một chút nếu bạn gõ mã khác đi dù chỉ một dòng.'] },

          { t: 'cal', kind: 'why', title: 'atomic_inc có hai bản trong cùng một file',
            x: '<code>stadd w25, [x0]</code> là bản LSE: một lệnh, phần cứng đọc-cộng-ghi ô nhớ mà không ai chen ' +
               'được. <code>ldxr</code>…<code>stxr</code> là bản dự phòng cho CPU ARMv8.0: <code>ldxr</code> đọc và ' +
               'đánh dấu độc quyền, <code>stxr</code> chỉ ghi nếu không ai đụng vào ô đó kể từ lúc đọc, và trả về ' +
               '<code>w1 != 0</code> nếu thất bại — vòng lặp <code>cbnz</code> ngay sau thử lại. Kernel quyết định ' +
               'dùng bản nào <b>lúc nạp</b>, bằng cách vá mã: <code>race.o</code> có một section ' +
               '<code>.altinstructions</code> ghi chỗ cần vá, và <code>aarch64-linux-gnu-nm -u race.ko</code> liệt kê ' +
               '<code>alt_cb_patch_nops</code> — hàm của kernel làm việc vá đó. <code>-cpu cortex-a57</code> là ARMv8.0, nên trong máy ảo của ' +
               'bạn bản <code>ldxr</code>/<code>stxr</code> chạy. Còn <code>spin_lock</code> và ' +
               '<code>mutex_lock</code> không được inline: chúng là lời gọi hàm thật vào kernel.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56\n' +
            'rm -rf initramfs && cp -a ~/bai32/initramfs initramfs\n' +
            'cp race/race.ko initramfs/\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Trong máy ảo, chạy chế độ 0 ba lần. Mỗi lần phải <code>rmmod</code> trước khi <code>insmod</code> lại, vì ' +
            'một module chỉ nạp được một lần (Bài 50, <code>File exists</code>):' },

          { t: 'code', where: 'qemu', code:
            'insmod /race.ko mode=0\n' +
            'rmmod race\n' +
            'insmod /race.ko mode=0\n' +
            'rmmod race\n' +
            'insmod /race.ko mode=0\n' +
            'rmmod race' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /race.ko mode=0\n' +
            '[    6.500210] race: loading out-of-tree module taints kernel.\n' +
            '[    6.525618] race: mode 0: 1191411 of 2000000, lost 808589, 21 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=0\n' +
            '[    7.711996] race: mode 0: 1146328 of 2000000, lost 853672, 20 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=0\n' +
            '[    8.913651] race: mode 0: 1238319 of 2000000, lost 761681, 23 ms\n' +
            '~ # rmmod race',
            notes: ['Số lần mất <b>khác nhau mỗi lần chạy</b> — đó chính là bản chất của race condition. Máy viết bài thấy từ 751 714 tới 955 138 qua sáu lần chạy ở ba lần boot; con số của bạn sẽ khác, nhưng luôn ở khoảng 40–50 %. Dấu thời gian đầu dòng cũng khác.'] },

          { t: 'cal', kind: 'why', title: 'Gần một nửa số lần cộng biến mất',
            x: 'Lần đầu: 2 000 000 lần cộng chỉ để lại <b>1 191 411</b> — mất <b>808 589</b>, 40 %. Mỗi lần mất là một ' +
               'lần hai CPU cùng đọc một giá trị, ví dụ 500, cùng cộng thành 501, cùng ghi 501: hai lần cộng, biến chỉ ' +
               'tăng 1. Tỉ lệ cao hơn Bài 22 (hai luồng <code>pthread</code> trên máy thật) vì hai vCPU của QEMU chạy ' +
               'từng đoạn lệnh dài xen kẽ nhau, và vòng lặp không làm gì khác ngoài cộng. Để ý dòng ' +
               '<code>taints kernel</code> chỉ in ở lần nạp đầu (Bài 50: taint giữ tới khi reboot).' },

          { t: 'p', x:
            'Giờ ba cách sửa, và chế độ 3 thêm một lần nữa để thấy thời gian ổn định tới đâu:' },

          { t: 'code', where: 'qemu', code:
            'insmod /race.ko mode=1\n' +
            'rmmod race\n' +
            'insmod /race.ko mode=2\n' +
            'rmmod race\n' +
            'insmod /race.ko mode=3\n' +
            'rmmod race\n' +
            'insmod /race.ko mode=3\n' +
            'rmmod race' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /race.ko mode=1\n' +
            '[   10.221618] race: mode 1: 2000000 of 2000000, lost 0, 121 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=2\n' +
            '[   11.557715] race: mode 2: 2000000 of 2000000, lost 0, 257 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=3\n' +
            '[   12.896648] race: mode 3: 2000000 of 2000000, lost 0, 393 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=3\n' +
            '[   14.099654] race: mode 3: 2000000 of 2000000, lost 0, 395 ms\n' +
            '~ # rmmod race',
            notes: ['Số mili giây là thời gian mô phỏng của QEMU trên máy viết bài và dao động giữa các lần boot (<code>atomic_t</code> 94–126 ms, spinlock 257–320 ms, mutex 380–395 ms qua ba lần boot). Thứ tự <code>atomic_t</code> &lt; spinlock &lt; mutex thì ổn định. Cột <code>lost 0</code> phải giống hệt.'] },

          { t: 'cal', kind: 'why', title: 'Đúng cả ba, nhưng giá khác nhau tới 20 lần',
            x: 'Cả ba cách cho đúng <b>2 000 000</b>. Cái giá, so với 21 ms của bản sai: <code>atomic_t</code> ' +
               '<b>121 ms</b> (khoảng 6×), spinlock <b>257 ms</b> (12×), mutex <b>393 ms</b> (19×). Hai CPU tranh nhau ' +
               'từng lần cộng, nên đây là trường hợp tệ nhất cho khoá — ô nhớ chứa khoá liên tục bị giật qua lại giữa ' +
               'hai CPU. Mutex chậm nhất vì khi tranh chấp nó phải cân nhắc việc cho thread đi ngủ. Bài học không phải ' +
               '"luôn dùng atomic" mà là: <b>bảo vệ thứ cần bảo vệ bằng công cụ nhẹ nhất đủ dùng</b>, và giữ khoá ' +
               'ngắn nhất có thể. Bài 22 đo được thứ tự y hệt ở userspace: <code>_Atomic</code> ~3×, mutex ~12×.' },

          { t: 'p', x:
            'Hai lệnh cuối cho thấy <code>module_param</code> hiện ra trong sysfs khi module đang nạp:' },

          { t: 'code', where: 'qemu', code:
            'insmod /race.ko mode=1 loops=10\n' +
            'ls /sys/module/race/parameters\n' +
            'cat /sys/module/race/parameters/mode /sys/module/race/parameters/loops\n' +
            'rmmod race\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /race.ko mode=1 loops=10\n' +
            '[   14.908808] race: mode 1: 20 of 20, lost 0, 1 ms\n' +
            '~ # ls /sys/module/race/parameters\n' +
            'loops  mode\n' +
            '~ # cat /sys/module/race/parameters/mode /sys/module/race/parameters/loops\n' +
            '1\n' +
            '10' },

          { t: 'p', x:
            'Hai file mang đúng hai giá trị bạn truyền. Thư mục <code>parameters</code> biến mất cùng module khi ' +
            '<code>rmmod</code>. Bạn có thể xem danh sách tham số của một <code>.ko</code> mà không cần nạp nó bằng ' +
            '<code>modinfo -F parm race.ko</code> ngay trên WSL (Bài 50: <code>modinfo</code> đọc được file ARM64).' },

          { t: 'p', x:
            'Thí nghiệm kiểm chứng cuối: chạy lại đúng bản sai với <b>một</b> CPU. Thoát máy ảo rồi boot lại với ' +
            '<code>-smp 1</code> thay cho <code>-smp 2</code>, và chạy <code>insmod /race.ko mode=0</code>:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # nproc\n' +
            '1\n' +
            '~ # insmod /race.ko mode=0\n' +
            '[    6.511896] race: mode 0: 2000000 of 2000000, lost 0, 12 ms\n' +
            '~ # rmmod race\n' +
            '~ # insmod /race.ko mode=0\n' +
            '[    7.710512] race: mode 0: 2000000 of 2000000, lost 0, 13 ms',
            notes: ['Máy viết bài chạy thêm với <code>loops=20000000</code> (40 triệu lần cộng) ba lần: <code>lost 0</code> cả ba, trong khi cùng lệnh với <code>-smp 2</code> mất khoảng 18 triệu.'] },

          { t: 'cal', kind: 'danger', title: '"Chạy đúng trên máy tôi" không chứng minh gì',
            x: 'Với một CPU, bản sai cho <b>đúng 2 000 000</b> — và nhanh gấp đôi. Hai thread lần lượt chạy thay vì ' +
               'song song, và scheduler hiếm khi đẩy một thread ra đúng giữa lệnh đọc và lệnh ghi. Đây là cái bẫy ' +
               'thật sự của race condition: driver chạy hoàn hảo trên board một nhân trong phòng lab, rồi hỏng ' +
               'ngẫu nhiên trên sản phẩm bốn nhân. Luôn test driver với <code>-smp</code> ≥ 2, và đừng bao giờ coi ' +
               '"không thấy lỗi" là bằng chứng không có race.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Dựng cây và viết driver vgpio',
        blocks: [
          { t: 'p', x:
            'Driver cần một node Device Tree có <code>compatible = "learn,vgpio"</code>. Thay vì thêm một node mới ở ' +
            'một địa chỉ không có gì (như <code>tsensor</code>), bài này <b>đổi <code>compatible</code> của chính node ' +
            'PL061</b> — nhờ vậy <code>reg</code> và <code>interrupts</code> trỏ vào phần cứng thật, và driver PL061 ' +
            'của kernel không còn khớp để tranh chỗ. Lấy cây gốc theo đúng quy trình Bài 45: <code>dumpdtb</code> rồi ' +
            'dịch ngược. Lần này có <code>-smp 2</code>, vì số CPU nằm trong cây:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -machine dumpdtb=virt.dtb\n' +
            'dtc -q -I dtb -O dts -o virt.dts virt.dtb\n' +
            'wc -l virt.dts\n' +
            'grep -n -A9 "pl061@9030000" virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '384 virt.dts\n' +
            '273:\tpl061@9030000 {\n' +
            '274-\t\tphandle = <0x8003>;\n' +
            '275-\t\tclock-names = "apb_pclk";\n' +
            '276-\t\tclocks = <0x8000>;\n' +
            '277-\t\tinterrupts = <0x00 0x07 0x04>;\n' +
            '278-\t\tgpio-controller;\n' +
            '279-\t\t#gpio-cells = <0x02>;\n' +
            '280-\t\tcompatible = "arm,pl061\\0arm,primecell";\n' +
            '281-\t\treg = <0x00 0x9030000 0x00 0x1000>;\n' +
            '282-\t};' },

          { t: 'p', x:
            '<b>384</b> dòng — Bài 54 có 376 dòng vì dump không có <code>-smp</code>; tám dòng chênh là node ' +
            '<code>cpu@1</code>. Dòng 280 nói driver nào sẽ nhận node: <code>arm,primecell</code> làm kernel tạo một ' +
            'thiết bị trên bus <b>AMBA</b> thay vì platform bus, và driver <code>pl061</code> khớp qua mã ID bạn vừa ' +
            'đọc bằng <code>devmem</code>. Dòng 277 là SPI 7, mức cao — sẽ thành <code>hwirq</code> 39 = 7 + 32 (Bài 55). ' +
            'Giờ viết lớp phủ, theo cú pháp <code>/include/</code> và <code>/delete-node/</code> của Bài 43:' },

          { t: 'code', where: 'file', name: '~/bai56/vgpio.dts', lang: 'dts', code:
            '/include/ "virt.dts"\n' +
            '\n' +
            '/ {\n' +
            '\t/delete-node/ gpio-keys;\n' +
            '\n' +
            '\tpl061@9030000 {\n' +
            '\t\tcompatible = "learn,vgpio";\n' +
            '\t};\n' +
            '};' },

          { t: 'code', where: 'wsl', code:
            'dtc -q -I dts -O dtb -o vgpio.dtb vgpio.dts\n' +
            'ls -l vgpio.dtb\n' +
            'dtc -q -I dtb -O dts vgpio.dtb | grep -c gpio-keys' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 7331 Sep 30 14:04 vgpio.dtb\n' +
            '0',
            notes: ['Tên người dùng và ngày giờ sẽ khác trên máy bạn; kích thước <code>7331</code> phải giống.'] },

          { t: 'cal', kind: 'why', title: 'Ghi đè compatible, không thêm node',
            x: 'Node <code>pl061@9030000</code> được khai báo hai lần — một lần trong <code>virt.dts</code>, một lần ' +
               'trong phần của bạn — và <code>dtc</code> gộp chúng: property nào xuất hiện sau thì thắng. Kết quả chỉ ' +
               'đổi đúng một dòng, <code>compatible = "learn,vgpio"</code>; <code>reg</code> và <code>interrupts</code> ' +
               'giữ nguyên. Không còn <code>arm,primecell</code>, nên kernel tạo một <b>platform device</b> tên ' +
               '<code>9030000.pl061</code> — tên lấy từ tên node — và không driver nào khớp cho tới khi bạn ' +
               '<code>insmod</code>. <code>/delete-node/ gpio-keys;</code> là bắt buộc: <code>gpio-keys</code> trỏ vào ' +
               'phandle <code>0x8003</code> của PL061 để xin chân 3, và khi không còn driver GPIO nào ở đó nó hoãn ' +
               'probe mãi — máy viết bài thử bỏ dòng đó và thấy <code>platform gpio-keys: deferred probe pending: ' +
               'gpio-keys: failed to get gpio</code> ở giây thứ 10 (Bài 54: <code>deferred_probe_timeout</code>). ' +
               '<code>grep -c</code> ra <code>0</code> xác nhận nó đã biến mất khỏi cây đã dịch.' },

          { t: 'p', x:
            'Header dùng chung giữa driver và chương trình userspace, theo đúng khuôn của Bài 53 — kiểu ' +
            '<code>__u32</code>, magic <code>\'x\'</code>, nhưng số thứ tự <code>0x10</code> và <code>0x11</code> để ' +
            'không trùng mã của <code>ramdisk</code>:' },

          { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai56/vgpio ~/bai56/app && cd ~/bai56/vgpio' },

          { t: 'code', where: 'file', name: '~/bai56/vgpio/vgpio_ioctl.h', lang: 'c', code:
            '/* SPDX-License-Identifier: GPL-2.0 WITH Linux-syscall-note */\n' +
            '/* Shared by vgpio.c (kernel) and vgctl.c (user space) */\n' +
            '#ifndef VGPIO_IOCTL_H\n' +
            '#define VGPIO_IOCTL_H\n' +
            '\n' +
            '#include <linux/ioctl.h>\n' +
            '#include <linux/types.h>\n' +
            '\n' +
            'struct vgpio_state {\n' +
            '\t__u32 leds;         /* LED bits the driver last wrote (pins 0..2) */\n' +
            '\t__u32 pins;         /* all 8 pin levels, read from the hardware now */\n' +
            '\t__u32 presses;      /* button interrupts since probe */\n' +
            '};\n' +
            '\n' +
            '#define VGPIO_GET_STATE _IOR(\'x\', 0x10, struct vgpio_state)\n' +
            '#define VGPIO_SET_LEDS  _IOW(\'x\', 0x11, __u32)\n' +
            '\n' +
            '#endif' },

          { t: 'p', x:
            'Và driver. Đọc nó từ trên xuống theo thứ tự: hằng số thanh ghi, hai hàm chạm thanh ghi DATA, hàm ' +
            '<code>vg_set_leds</code> với khoá, top half, <code>ioctl</code>, sysfs, <code>probe</code>, ' +
            '<code>remove</code>. Hai khối <code>#ifdef NO_IRQSAVE</code> và <code>#ifndef NO_CLEAR</code> là chỗ bước 6 ' +
            'cố tình làm hỏng driver; khi build bình thường chúng không có tác dụng.' },

          { t: 'code', where: 'file', name: '~/bai56/vgpio/vgpio.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * A virtual LED board on the ARM PL061 GPIO block of QEMU "virt".\n' +
            ' * Pins 0..2 drive three LEDs, pin 3 is the virt power button.\n' +
            ' * Interfaces: sysfs leds/pins/presses, /dev/vgpio ioctl, one interrupt.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/of.h>\n' +
            '#include <linux/io.h>\n' +
            '#include <linux/interrupt.h>\n' +
            '#include <linux/spinlock.h>\n' +
            '#include <linux/atomic.h>\n' +
            '#include <linux/delay.h>\n' +
            '#include <linux/miscdevice.h>\n' +
            '#include <linux/fs.h>\n' +
            '#include <linux/uaccess.h>\n' +
            '#include "vgpio_ioctl.h"\n' +
            '\n' +
            '/* PL061 register offsets, same names as drivers/gpio/gpio-pl061.c */\n' +
            '#define GPIODATA   0x000        /* address bits 9..2 = which pins a write touches */\n' +
            '#define GPIODIR    0x400        /* 1 = output */\n' +
            '#define GPIOIS     0x404        /* 0 = edge, 1 = level */\n' +
            '#define GPIOIBE    0x408        /* 1 = both edges */\n' +
            '#define GPIOIEV    0x40C        /* 1 = rising edge / high level */\n' +
            '#define GPIOIE     0x410        /* 1 = pin may interrupt */\n' +
            '#define GPIOMIS    0x418        /* pending and enabled */\n' +
            '#define GPIOIC     0x41C        /* write 1 = clear */\n' +
            '#define PERIPHID0  0xFE0\n' +
            '\n' +
            '#define LED_MASK   0x07         /* pins 0..2 */\n' +
            '#define ALL_PINS   0xFF\n' +
            '#define BUTTON     BIT(3)       /* pin 3 */\n' +
            '\n' +
            'static int hold_ms;\n' +
            'module_param(hold_ms, int, 0644);\n' +
            'MODULE_PARM_DESC(hold_ms, "extra time spent inside the lock when writing leds");\n' +
            '\n' +
            'struct vg_dev {\n' +
            '\tstruct device *dev;\n' +
            '\tvoid __iomem *base;\n' +
            '\tspinlock_t lock;            /* protects leds and the DATA register */\n' +
            '\tu32 leds;                   /* what we last wrote to pins 0..2 */\n' +
            '\tatomic_t presses;           /* written by the IRQ handler */\n' +
            '\tstruct miscdevice misc;\n' +
            '};\n' +
            '\n' +
            '/* Only pins 0..2 change: the mask is part of the address */\n' +
            'static void vg_write_leds(struct vg_dev *vg, u32 val)\n' +
            '{\n' +
            '\tvg->leds = val & LED_MASK;\n' +
            '\twritel(vg->leds, vg->base + GPIODATA + (LED_MASK << 2));\n' +
            '}\n' +
            '\n' +
            'static u32 vg_read_pins(struct vg_dev *vg)\n' +
            '{\n' +
            '\treturn readl(vg->base + GPIODATA + (ALL_PINS << 2));\n' +
            '}\n' +
            '\n' +
            '/* Process context: sysfs and ioctl. The IRQ handler takes the same lock. */\n' +
            'static void vg_set_leds(struct vg_dev *vg, u32 val)\n' +
            '{\n' +
            '\tunsigned long flags;\n' +
            '\n' +
            '#ifdef NO_IRQSAVE\n' +
            '\tspin_lock(&vg->lock);                   /* wrong: see step 6 */\n' +
            '#else\n' +
            '\tspin_lock_irqsave(&vg->lock, flags);\n' +
            '#endif\n' +
            '\tvg_write_leds(vg, val);\n' +
            '\tif (hold_ms)\n' +
            '\t\tmdelay(hold_ms);                /* busy-wait, never sleep here */\n' +
            '#ifdef NO_IRQSAVE\n' +
            '\tspin_unlock(&vg->lock);\n' +
            '#else\n' +
            '\tspin_unlock_irqrestore(&vg->lock, flags);\n' +
            '#endif\n' +
            '}\n' +
            '\n' +
            'static irqreturn_t vg_irq(int irq, void *data)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = data;\n' +
            '\tu32 pending = readl(vg->base + GPIOMIS);\n' +
            '\n' +
            '\tif (!(pending & BUTTON))\n' +
            '\t\treturn IRQ_NONE;\n' +
            '#ifndef NO_CLEAR\n' +
            '\twritel(BUTTON, vg->base + GPIOIC);      /* lower the interrupt line */\n' +
            '#endif\n' +
            '\tatomic_inc(&vg->presses);\n' +
            '\n' +
            '\tspin_lock(&vg->lock);                   /* interrupts are already off */\n' +
            '\tvg_write_leds(vg, vg->leds ^ BIT(0));   /* the button toggles LED 0 */\n' +
            '\tspin_unlock(&vg->lock);\n' +
            '\treturn IRQ_HANDLED;\n' +
            '}\n' +
            '\n' +
            'static long vg_ioctl(struct file *filp, unsigned int cmd, unsigned long arg)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = container_of(filp->private_data, struct vg_dev, misc);\n' +
            '\tstruct vgpio_state st;\n' +
            '\tu32 val;\n' +
            '\n' +
            '\tswitch (cmd) {\n' +
            '\tcase VGPIO_GET_STATE:\n' +
            '\t\tst.leds = READ_ONCE(vg->leds);\n' +
            '\t\tst.pins = vg_read_pins(vg);\n' +
            '\t\tst.presses = atomic_read(&vg->presses);\n' +
            '\t\tif (copy_to_user((void __user *)arg, &st, sizeof(st)))\n' +
            '\t\t\treturn -EFAULT;\n' +
            '\t\treturn 0;\n' +
            '\tcase VGPIO_SET_LEDS:\n' +
            '\t\tif (get_user(val, (u32 __user *)arg))\n' +
            '\t\t\treturn -EFAULT;\n' +
            '\t\tif (val & ~LED_MASK)\n' +
            '\t\t\treturn -EINVAL;\n' +
            '\t\tvg_set_leds(vg, val);\n' +
            '\t\treturn 0;\n' +
            '\t}\n' +
            '\treturn -ENOTTY;\n' +
            '}\n' +
            '\n' +
            'static const struct file_operations vg_fops = {\n' +
            '\t.owner          = THIS_MODULE,\n' +
            '\t.unlocked_ioctl = vg_ioctl,\n' +
            '};\n' +
            '\n' +
            'static ssize_t leds_show(struct device *dev, struct device_attribute *attr,\n' +
            '\t\t\t char *buf)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = dev_get_drvdata(dev);\n' +
            '\n' +
            '\treturn sysfs_emit(buf, "%u\\n", READ_ONCE(vg->leds));\n' +
            '}\n' +
            '\n' +
            'static ssize_t leds_store(struct device *dev, struct device_attribute *attr,\n' +
            '\t\t\t  const char *buf, size_t count)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = dev_get_drvdata(dev);\n' +
            '\tu32 val;\n' +
            '\tint ret;\n' +
            '\n' +
            '\tret = kstrtou32(buf, 0, &val);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\tif (val & ~LED_MASK)\n' +
            '\t\treturn -EINVAL;\n' +
            '\tvg_set_leds(vg, val);\n' +
            '\treturn count;\n' +
            '}\n' +
            'static DEVICE_ATTR_RW(leds);\n' +
            '\n' +
            'static ssize_t pins_show(struct device *dev, struct device_attribute *attr,\n' +
            '\t\t\t char *buf)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = dev_get_drvdata(dev);\n' +
            '\n' +
            '\treturn sysfs_emit(buf, "0x%02x\\n", vg_read_pins(vg));\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(pins);\n' +
            '\n' +
            'static ssize_t presses_show(struct device *dev, struct device_attribute *attr,\n' +
            '\t\t\t    char *buf)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = dev_get_drvdata(dev);\n' +
            '\n' +
            '\treturn sysfs_emit(buf, "%d\\n", atomic_read(&vg->presses));\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(presses);\n' +
            '\n' +
            'static struct attribute *vg_attrs[] = {\n' +
            '\t&dev_attr_leds.attr,\n' +
            '\t&dev_attr_pins.attr,\n' +
            '\t&dev_attr_presses.attr,\n' +
            '\tNULL,\n' +
            '};\n' +
            'ATTRIBUTE_GROUPS(vg);\n' +
            '\n' +
            'static void vg_misc_deregister(void *data)\n' +
            '{\n' +
            '\tmisc_deregister(data);\n' +
            '}\n' +
            '\n' +
            'static int vg_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '\tstruct device *dev = &pdev->dev;\n' +
            '\tstruct vg_dev *vg;\n' +
            '\tu32 id;\n' +
            '\tint irq, ret;\n' +
            '\n' +
            '\tvg = devm_kzalloc(dev, sizeof(*vg), GFP_KERNEL);\n' +
            '\tif (!vg)\n' +
            '\t\treturn -ENOMEM;\n' +
            '\tvg->dev = dev;\n' +
            '\tspin_lock_init(&vg->lock);\n' +
            '\tatomic_set(&vg->presses, 0);\n' +
            '\n' +
            '\t/* request_mem_region + ioremap, both undone by devres */\n' +
            '\tvg->base = devm_platform_ioremap_resource(pdev, 0);\n' +
            '\tif (IS_ERR(vg->base))\n' +
            '\t\treturn PTR_ERR(vg->base);\n' +
            '\n' +
            '\t/* PeriphID0..2 hold part number 0x061 and designer 0x41 (\'A\' = ARM) */\n' +
            '\tid = readl(vg->base + PERIPHID0) |\n' +
            '\t     readl(vg->base + PERIPHID0 + 4) << 8 |\n' +
            '\t     readl(vg->base + PERIPHID0 + 8) << 16;\n' +
            '\tif ((id & 0xfff) != 0x061)\n' +
            '\t\treturn dev_err_probe(dev, -ENODEV, "not a PL061: id 0x%06x\\n", id);\n' +
            '\n' +
            '\twritel(0, vg->base + GPIOIE);           /* silent while we set up */\n' +
            '\twritel(LED_MASK, vg->base + GPIODIR);   /* 0..2 out, 3..7 in */\n' +
            '\tvg_write_leds(vg, 0);\n' +
            '\twritel(0, vg->base + GPIOIS);           /* pin 3: edge ... */\n' +
            '\twritel(0, vg->base + GPIOIBE);          /* ... one edge ... */\n' +
            '\twritel(BUTTON, vg->base + GPIOIEV);     /* ... rising */\n' +
            '\twritel(ALL_PINS, vg->base + GPIOIC);    /* drop anything stale */\n' +
            '\n' +
            '\tirq = platform_get_irq(pdev, 0);\n' +
            '\tif (irq < 0)\n' +
            '\t\treturn irq;\n' +
            '\tret = devm_request_irq(dev, irq, vg_irq, 0, "vgpio", vg);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\tplatform_set_drvdata(pdev, vg);\n' +
            '\twritel(BUTTON, vg->base + GPIOIE);      /* now pin 3 may interrupt */\n' +
            '\n' +
            '\tvg->misc.minor  = MISC_DYNAMIC_MINOR;\n' +
            '\tvg->misc.name   = "vgpio";\n' +
            '\tvg->misc.fops   = &vg_fops;\n' +
            '\tvg->misc.parent = dev;\n' +
            '\tret = misc_register(&vg->misc);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\tret = devm_add_action_or_reset(dev, vg_misc_deregister, &vg->misc);\n' +
            '\tif (ret)\n' +
            '\t\treturn ret;\n' +
            '\n' +
            '\tdev_info(dev, "PL061 id 0x%06x, irq %d, /dev/%s minor %d\\n",\n' +
            '\t\t id, irq, vg->misc.name, vg->misc.minor);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void vg_remove(struct platform_device *pdev)\n' +
            '{\n' +
            '\tstruct vg_dev *vg = platform_get_drvdata(pdev);\n' +
            '\n' +
            '\twritel(0, vg->base + GPIOIE);           /* before devres frees the IRQ */\n' +
            '\tdev_info(&pdev->dev, "remove, %d presses\\n", atomic_read(&vg->presses));\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id vg_of_match[] = {\n' +
            '\t{ .compatible = "learn,vgpio" },\n' +
            '\t{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, vg_of_match);\n' +
            '\n' +
            'static struct platform_driver vg_driver = {\n' +
            '\t.probe  = vg_probe,\n' +
            '\t.remove = vg_remove,\n' +
            '\t.driver = {\n' +
            '\t\t.name           = "vgpio",\n' +
            '\t\t.of_match_table = vg_of_match,\n' +
            '\t\t.dev_groups     = vg_groups,\n' +
            '\t},\n' +
            '};\n' +
            'module_platform_driver(vg_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("Virtual LED board on the PL061 GPIO block");',
            notes: ['270 dòng. Makefile là bản của bước 2 với <code>race</code> đổi thành <code>vgpio</code> (dòng đầu <code>obj-m := vgpio.o</code>).'] },

          { t: 'table',
            head: ['Đoạn', 'Vì sao viết như vậy'],
            rows: [
              ['<code>GPIODATA + (LED_MASK &lt;&lt; 2)</code>', 'Mẹo mặt nạ trong địa chỉ của PL061: ghi chỉ đổi chân 0–2, chân 3 (nút) không bao giờ bị động tới. Đọc ở <code>ALL_PINS &lt;&lt; 2</code> = <code>0x3FC</code> thấy cả 8 chân'],
              ['<code>spinlock_t lock</code> bảo vệ <code>leds</code> <b>và</b> thanh ghi DATA', 'Hai thứ phải khớp nhau: <code>vg_irq</code> đọc <code>vg-&gt;leds</code>, đảo bit, ghi cả biến lẫn thanh ghi. Nếu <code>echo</code> chen vào giữa, một trong hai lần ghi bị mất — đúng lỗi ở bước 2, lần này với phần cứng'],
              ['<code>spin_lock_irqsave</code> ở <code>vg_set_leds</code>, <code>spin_lock</code> ở <code>vg_irq</code>', 'Quy tắc của mục lý thuyết: khoá dùng trong top half thì phía tiến trình phải tắt ngắt khi giữ nó'],
              ['<code>atomic_t presses</code>', 'Một con số, chỉ tăng và đọc — không cần khoá. <code>presses_show</code> và <code>ioctl</code> đọc nó mà không đụng <code>lock</code>'],
              ['<code>READ_ONCE(vg-&gt;leds)</code>', 'Đọc một biến mà top half có thể đổi bất cứ lúc nào, không cần giá trị đó khớp với gì khác — nên không cần khoá, chỉ cần trình biên dịch đọc đúng một lần'],
              ['<code>hold_ms</code> + <code>mdelay</code>', 'Tham số chỉ để thí nghiệm: kéo dài vùng tới hạn cho bạn kịp bấm nút khi đang giữ khoá. <code>mdelay</code> quay vòng bận chờ — <code>msleep</code> trong spinlock là <code>BUG: scheduling while atomic</code> (Bài 55)'],
              ['<code>vg_irq</code> kiểm tra <code>GPIOMIS</code> trước', 'Nếu không phải chân 3, trả <code>IRQ_NONE</code> — cách lịch sự khi ngắt không phải của mình (Bài 55: 99 900/100 000 lần là kernel tắt dây)'],
              ['<code>writel(BUTTON, GPIOIC)</code> ngay đầu top half', 'Hạ cờ ngắt mức trước khi làm gì khác. Thiếu dòng này: bão ngắt (bước 6)'],
              ['Thứ tự trong <code>probe</code>: tắt <code>GPIOIE</code> → cấu hình → xoá cờ cũ → <code>devm_request_irq</code> → bật <code>GPIOIE</code>', 'Thiết bị không được phép bắn ngắt trước khi có handler để nhận. <code>platform_set_drvdata</code> đứng trước dòng bật vì sysfs và <code>remove</code> cần nó'],
              ['<code>vg_remove</code> tắt <code>GPIOIE</code>', 'Chạy <b>trước</b> devres, nên thiết bị im lặng trước khi <code>free_irq</code> và <code>iounmap</code> xảy ra'],
              ['<code>misc_register</code> + <code>devm_add_action_or_reset</code>', 'Không có bản <code>devm_misc_register</code>; tự đăng ký hành động gỡ như <code>ts_del_cdev</code> ở Bài 54. <code>container_of(filp-&gt;private_data, …, misc)</code> hoạt động vì misc core tự đặt <code>private_data</code> trỏ vào <code>struct miscdevice</code>']
            ] },

          { t: 'p', x:
            'Chương trình userspace <code>vgctl</code>, cùng khuôn với <code>rdctl</code> của Bài 53:' },

          { t: 'code', where: 'file', name: '~/bai56/app/vgctl.c', lang: 'c', code:
            '/* vgctl: talk to /dev/vgpio through ioctl */\n' +
            '#include <stdio.h>\n' +
            '#include <stdlib.h>\n' +
            '#include <string.h>\n' +
            '#include <errno.h>\n' +
            '#include <fcntl.h>\n' +
            '#include <unistd.h>\n' +
            '#include <sys/ioctl.h>\n' +
            '#include "vgpio_ioctl.h"\n' +
            '\n' +
            'int main(int argc, char **argv)\n' +
            '{\n' +
            '\tstruct vgpio_state st;\n' +
            '\t__u32 val;\n' +
            '\tint fd;\n' +
            '\n' +
            '\tif (argc < 2) {\n' +
            '\t\tfprintf(stderr, "usage: vgctl get | set N | codes\\n");\n' +
            '\t\treturn 2;\n' +
            '\t}\n' +
            '\tif (strcmp(argv[1], "codes") == 0) {\n' +
            '\t\tprintf("GET_STATE 0x%08lx  SET_LEDS 0x%08lx\\n",\n' +
            '\t\t       (unsigned long)VGPIO_GET_STATE,\n' +
            '\t\t       (unsigned long)VGPIO_SET_LEDS);\n' +
            '\t\treturn 0;\n' +
            '\t}\n' +
            '\tfd = open("/dev/vgpio", O_RDWR);\n' +
            '\tif (fd < 0) {\n' +
            '\t\tperror("open /dev/vgpio");\n' +
            '\t\treturn 1;\n' +
            '\t}\n' +
            '\tif (strcmp(argv[1], "get") == 0) {\n' +
            '\t\tif (ioctl(fd, VGPIO_GET_STATE, &st) < 0) {\n' +
            '\t\t\tprintf("GET_STATE failed: errno %d (%s)\\n", errno, strerror(errno));\n' +
            '\t\t\treturn 1;\n' +
            '\t\t}\n' +
            '\t\tprintf("leds 0x%x  pins 0x%02x  presses %u\\n",\n' +
            '\t\t       st.leds, st.pins, st.presses);\n' +
            '\t} else if (strcmp(argv[1], "set") == 0 && argc == 3) {\n' +
            '\t\tval = strtoul(argv[2], NULL, 0);\n' +
            '\t\tif (ioctl(fd, VGPIO_SET_LEDS, &val) < 0) {\n' +
            '\t\t\tprintf("SET_LEDS %u failed: errno %d (%s)\\n", val, errno,\n' +
            '\t\t\t       strerror(errno));\n' +
            '\t\t\treturn 1;\n' +
            '\t\t}\n' +
            '\t\tprintf("SET_LEDS %u ok\\n", val);\n' +
            '\t} else {\n' +
            '\t\tfprintf(stderr, "usage: vgctl get | set N | codes\\n");\n' +
            '\t\treturn 2;\n' +
            '\t}\n' +
            '\tclose(fd);\n' +
            '\treturn 0;\n' +
            '}' },

          { t: 'p', x:
            'Build cả ba: module, bản ARM64 tĩnh của <code>vgctl</code>, và một bản chạy trên WSL chỉ để in mã ' +
            '<code>ioctl</code> (Bài 53: mã là hằng số lúc biên dịch, giống nhau trên x86-64 và ARM64):' },

          { t: 'code', where: 'wsl', code:
            'sed -e "s/race/vgpio/g" ../race/Makefile > Makefile\n' +
            'make\n' +
            'cd ../app\n' +
            'aarch64-linux-gnu-gcc -O2 -Wall -static -I../vgpio -o vgctl vgctl.c\n' +
            'gcc -O2 -I../vgpio -o vgctl-host vgctl.c && ./vgctl-host codes' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  vgpio.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  vgpio.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  vgpio.ko\n' +
            '...\n' +
            'GET_STATE 0x800c7810  SET_LEDS 0x40047811' },

          { t: 'cal', kind: 'info', title: 'Đọc mã ioctl như Bài 53',
            x: '<code>0x800c7810</code>: 2 bit đầu <code>10</code> = đọc (<code>_IOR</code>), 14 bit kích thước ' +
               '<code>0x00c</code> = 12 byte = ba <code>__u32</code> của <code>struct vgpio_state</code>, <code>0x78</code> ' +
               '= <code>\'x\'</code>, <code>0x10</code> = số thứ tự. <code>0x40047811</code>: <code>01</code> = ghi, 4 byte, ' +
               '<code>\'x\'</code>, <code>0x11</code>. Thêm một trường vào struct thì mã <code>GET_STATE</code> đổi — một ' +
               '<code>vgctl</code> cũ sẽ nhận errno 25 thay vì đọc sai bộ nhớ.' },

          { t: 'p', x:
            'Cuối cùng, nhìn vào mã máy của top half để thấy rào bộ nhớ mà mục lý thuyết đã hứa:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56/vgpio\n' +
            'aarch64-linux-gnu-objdump -d --no-show-raw-insn vgpio.o | awk \'/<vg_irq>:/,/^$/\' | grep -B1 -A1 dmb\n' +
            'aarch64-linux-gnu-objdump -d vgpio.o | grep -cP "dmb\\toshst"\n' +
            'aarch64-linux-gnu-objdump -d vgpio.o | grep -cP "dmb\\toshld"' },

          { t: 'code', where: 'out', nocopy: true, code:
            ' 374:\tldr\tw1, [x1]\n' +
            ' 378:\tdmb\toshld\n' +
            ' 37c:\tmov\tw0, w1\n' +
            '--\n' +
            ' 390:\tldr\tx1, [x19, #8]\n' +
            ' 394:\tdmb\toshst\n' +
            ' 398:\tmov\tw0, #0x8                   \t// #8\n' +
            '--\n' +
            ' 3cc:\tstr\tw1, [x19, #20]\n' +
            ' 3d0:\tdmb\toshst\n' +
            ' 3d4:\tstr\tw1, [x0, #28]\n' +
            '12\n' +
            '6' },

          { t: 'cal', kind: 'why', title: 'Ba lần chạm thanh ghi trong vg_irq, ba cái rào',
            x: 'Khối đầu là <code>readl(GPIOMIS)</code>: <code>ldr</code> rồi <b><code>dmb oshld</code></b> — rào đứng ' +
               '<i>sau</i> lần đọc. Khối hai là <code>writel(BUTTON, GPIOIC)</code>: <b><code>dmb oshst</code></b> đứng ' +
               '<i>trước</i>, lệnh <code>str w0, [x1, #1052]</code> (1052 = <code>0x41C</code> = <code>GPIOIC</code>) ở hai ' +
               'dòng sau. Khối ba là <code>vg_write_leds</code> đã được inline: <code>str w1, [x19, #20]</code> ghi ' +
               '<code>vg-&gt;leds</code> vào RAM, <code>dmb oshst</code>, rồi <code>str w1, [x0, #28]</code> ghi thanh ghi ' +
               '— 28 = <code>0x1C</code> = <code>0x07 &lt;&lt; 2</code>, đúng địa chỉ mặt nạ của ba LED. Toàn file có ' +
               '<b>12</b> rào ghi và <b>6</b> rào đọc = 18, trong khi mã nguồn chỉ có 15 dòng <code>readl</code>/' +
               '<code>writel</code>: GCC chép thân <code>vg_write_leds</code> vào ba nơi gọi (<code>vg_set_leds</code>, ' +
               '<code>vg_irq</code>, <code>probe</code>) và <code>vg_read_pins</code> vào hai (<code>pins_show</code>, ' +
               '<code>vg_ioctl</code>), mỗi bản chép mang theo rào của nó. Bạn không viết dòng <code>dmb</code> nào; ' +
               '<code>readl</code>/<code>writel</code> viết giúp.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Điều khiển LED qua sysfs, devmem và ioctl',
        blocks: [
          { t: 'p', x:
            'Đóng gói module và <code>vgctl</code> vào initramfs, rồi boot với cây mới:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56\n' +
            'cp vgpio/vgpio.ko app/vgctl initramfs/\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb vgpio.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Trước khi nạp gì, kiểm tra cây mới đã làm đúng điều nó định làm:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls /sys/bus/amba/devices\n' +
            'ls /sys/bus/platform/devices | grep 9030000\n' +
            'grep 9030000 /proc/iomem' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/amba/devices\n' +
            '9000000.pl011  9010000.pl031\n' +
            '~ # ls /sys/bus/platform/devices | grep 9030000\n' +
            '9030000.pl061\n' +
            '~ # grep 9030000 /proc/iomem\n' +
            '~ # ' },

          { t: 'p', x:
            'Bus AMBA chỉ còn UART và RTC; PL061 đã chuyển sang platform bus dưới tên <code>9030000.pl061</code>. ' +
            '<code>/proc/iomem</code> không in gì cho <code>9030000</code>: chưa driver nào giữ dải đó. So với bước 1, ' +
            'nơi dòng <code>9030000.pl061 pl061@9030000</code> thuộc driver PL061 của kernel, dải này giờ đang bỏ trống ' +
            'chờ bạn. Nạp driver:' },

          { t: 'code', where: 'qemu', code:
            'insmod /vgpio.ko\n' +
            'grep 9030000 /proc/iomem\n' +
            'grep vgpio /proc/interrupts\n' +
            'ls /sys/bus/platform/devices/9030000.pl061\n' +
            'ls -l /dev/vgpio\n' +
            'grep vgpio /proc/misc' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /vgpio.ko\n' +
            '[    8.899676] vgpio: loading out-of-tree module taints kernel.\n' +
            '[    8.908044] vgpio 9030000.pl061: PL061 id 0x041061, irq 20, /dev/vgpio minor 258\n' +
            '~ # grep 9030000 /proc/iomem\n' +
            '09030000-09030fff : 9030000.pl061 pl061@9030000\n' +
            '~ # grep vgpio /proc/interrupts\n' +
            ' 20:          0          0 GIC-0  39 Level     vgpio\n' +
            '~ # ls /sys/bus/platform/devices/9030000.pl061\n' +
            'driver           misc             pins             subsystem\n' +
            'driver_override  modalias         power            uevent\n' +
            'leds             of_node          presses\n' +
            '~ # ls -l /dev/vgpio\n' +
            'crw-------    1 0        0          10, 258 Sep 30 07:07 /dev/vgpio\n' +
            '~ # grep vgpio /proc/misc\n' +
            '258 vgpio',
            notes: ['Dấu thời gian và giờ của <code>/dev/vgpio</code> sẽ khác trên máy bạn. <code>id 0x041061</code>, <code>irq 20</code>, <code>GIC-0  39 Level</code>, major <code>10</code> và minor <code>258</code> phải giống.'] },

          { t: 'cal', kind: 'why', title: 'Sáu dòng, sáu thứ probe đã làm',
            x: '<code>id 0x041061</code>: ba lần <code>readl</code> đầu tiên qua con trỏ từ <code>ioremap</code> đọc đúng ' +
               'con số bạn đọc bằng <code>devmem</code> ở bước 1 — driver đang nói chuyện với phần cứng thật. Dòng ' +
               '<code>/proc/iomem</code> xuất hiện là việc của <code>devm_platform_ioremap_resource</code> (nửa ' +
               '<code>request_mem_region</code>). <code>irq 20</code> với <code>GIC-0  39 Level</code>: SPI 7 + 32 = 39, ' +
               'kiểu mức — không còn tầng PL061 nào ở giữa như Bài 55, vì giờ bạn <i>là</i> driver PL061. Có <b>hai</b> ' +
               'cột đếm vì <code>-smp 2</code>. Thư mục thiết bị có <code>leds</code>, <code>pins</code>, ' +
               '<code>presses</code> từ <code>.dev_groups</code>, và <code>misc</code> — liên kết mà ' +
               '<code>misc_register</code> tạo vì bạn đặt <code>misc.parent = dev</code>. <code>/dev/vgpio</code> là ' +
               '<b>major 10</b>; minor <b>258</b> là số trống đầu tiên sau 256 và 257 (<code>vga_arbiter</code>, ' +
               '<code>cpu_dma_latency</code> đã có trong <code>/proc/misc</code> từ lúc boot).' },

          { t: 'p', x:
            'Bật LED 0 và 2 (<code>5</code> = <code>0b101</code>) qua sysfs, rồi dùng <code>devmem</code> để tự kiểm ' +
            'xem thanh ghi có thật sự đổi không:' },

          { t: 'code', where: 'qemu', code:
            'cd /sys/bus/platform/devices/9030000.pl061\n' +
            'cat leds pins presses\n' +
            'echo 5 > leds\n' +
            'cat leds pins\n' +
            'devmem 0x090303fc 8\n' +
            'devmem 0x09030400 8\n' +
            'devmem 0x09030410 8' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/devices/9030000.pl061 # cat leds pins presses\n' +
            '0\n' +
            '0x00\n' +
            '0\n' +
            '/sys/bus/platform/devices/9030000.pl061 # echo 5 > leds\n' +
            '/sys/bus/platform/devices/9030000.pl061 # cat leds pins\n' +
            '5\n' +
            '0x05\n' +
            '/sys/bus/platform/devices/9030000.pl061 # devmem 0x090303fc 8\n' +
            '0x05\n' +
            '/sys/bus/platform/devices/9030000.pl061 # devmem 0x09030400 8\n' +
            '0x07\n' +
            '/sys/bus/platform/devices/9030000.pl061 # devmem 0x09030410 8\n' +
            '0x08' },

          { t: 'cal', kind: 'why', title: 'Ba nguồn cùng nói một điều',
            x: '<code>leds</code> = <code>5</code> là biến trong RAM của driver; <code>pins</code> = <code>0x05</code> là ' +
               '<code>readl</code> thanh ghi DATA; <code>devmem 0x090303fc</code> = <code>0x05</code> là chính thanh ghi ' +
               'đó, đọc bằng một con đường không đi qua driver. Ba cái khớp nhau nghĩa là driver ghi đúng chỗ. So với ' +
               'bước 1: <code>GPIODIR</code> từ <code>0x00</code> thành <b><code>0x07</code></b> (chân 0–2 là output, ' +
               'đúng dòng <code>writel(LED_MASK, GPIODIR)</code> trong <code>probe</code>); <code>GPIOIE</code> vẫn là ' +
               '<code>0x08</code>, nhưng lần này là do <b>bạn</b> bật, không phải <code>gpio-keys</code>.' },

          { t: 'p', x:
            'Giờ chứng minh lời cảnh báo ở bước 1: ghi thẳng vào thanh ghi sau lưng driver. Địa chỉ ' +
            '<code>0x09030004</code> = gốc + <code>(0x01 &lt;&lt; 2)</code>, tức mặt nạ chỉ có chân 0:' },

          { t: 'code', where: 'qemu', code:
            'devmem 0x09030000 8\n' +
            'devmem 0x09030004 8 0\n' +
            'cat pins leds' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/devices/9030000.pl061 # devmem 0x09030000 8\n' +
            '0x00\n' +
            '/sys/bus/platform/devices/9030000.pl061 # devmem 0x09030004 8 0\n' +
            '/sys/bus/platform/devices/9030000.pl061 # cat pins leds\n' +
            '0x04\n' +
            '5' },

          { t: 'cal', kind: 'warn', title: 'Driver và phần cứng giờ nói hai điều khác nhau',
            x: 'Đọc ở <code>0x09030000</code> (mặt nạ 0) ra <code>0x00</code> dù chân 0 và 2 đang cao — đúng như bảng ' +
               'thanh ghi nói. Ghi <code>0</code> vào <code>0x09030004</code> tắt <b>chỉ</b> chân 0: <code>pins</code> ' +
               'từ <code>0x05</code> thành <code>0x04</code>, chân 2 không bị đụng tới — mẹo mặt nạ hoạt động. Nhưng ' +
               '<code>leds</code> vẫn là <code>5</code>: driver không biết thanh ghi đã đổi. Lần bấm nút tới, top half ' +
               'sẽ đảo bit 0 của <code>5</code> và ghi <code>4</code> — "tắt" một LED đã tắt sẵn. Đây là lý do mọi ' +
               'truy cập vào một thiết bị phải đi qua <b>một</b> nơi duy nhất, dưới <b>một</b> khoá.' },

          { t: 'p', x:
            'Thử hai giá trị không hợp lệ. <code>leds_store</code> kiểm tra cả cú pháp (<code>kstrtou32</code>) lẫn ' +
            'phạm vi (chỉ bit 0–2):' },

          { t: 'code', where: 'qemu', code:
            'echo 9 > leds\n' +
            'echo abc > leds\n' +
            'cat leds\n' +
            'cd /' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/devices/9030000.pl061 # echo 9 > leds\n' +
            'sh: write error: Invalid argument\n' +
            '/sys/bus/platform/devices/9030000.pl061 # echo abc > leds\n' +
            'sh: write error: Invalid argument\n' +
            '/sys/bus/platform/devices/9030000.pl061 # cat leds\n' +
            '5' },

          { t: 'p', x:
            '<code>9</code> = <code>0b1001</code> có bit 3 — chân của nút, driver từ chối bằng <code>-EINVAL</code>. ' +
            '<code>abc</code> không phải số, <code>kstrtou32</code> trả <code>-EINVAL</code>. Bài 53 đã dạy cách đọc: ' +
            '<code>write error</code> nghĩa là <code>open</code> thành công, lời gọi <code>write</code> bị từ chối. ' +
            '<code>leds</code> vẫn là <code>5</code>. Giờ cùng thao tác qua <code>ioctl</code>:' },

          { t: 'code', where: 'qemu', code:
            '/vgctl get\n' +
            '/vgctl set 2\n' +
            '/vgctl get\n' +
            '/vgctl set 8' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # /vgctl get\n' +
            'leds 0x5  pins 0x04  presses 0\n' +
            '~ # /vgctl set 2\n' +
            'SET_LEDS 2 ok\n' +
            '~ # /vgctl get\n' +
            'leds 0x2  pins 0x02  presses 0\n' +
            '~ # /vgctl set 8\n' +
            'SET_LEDS 8 failed: errno 22 (Invalid argument)' },

          { t: 'p', x:
            'Lần <code>get</code> đầu lộ ra đúng sự lệch vừa tạo bằng <code>devmem</code>: <code>leds 0x5</code> (driver ' +
            'nghĩ) nhưng <code>pins 0x04</code> (phần cứng thật). <code>set 2</code> ghi lại cả biến lẫn thanh ghi dưới ' +
            'khoá, và hai con số khớp nhau trở lại: <code>0x2</code>/<code>0x02</code>. <code>set 8</code> bị từ chối ' +
            'với errno 22 — cùng lý do như <code>echo 9</code>, cùng một dòng kiểm tra trong <code>vg_ioctl</code>.' },

          { t: 'p', x:
            'Bấm nút hai lần. Ở monitor QEMU (<kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>C</kbd>, như Bài 55), gõ ' +
            '<code>system_powerdown</code>, quay lại shell, đọc trạng thái; lặp lại:' },

          { t: 'code', where: 'qemu', code:
            '(qemu) system_powerdown\n' +
            '/vgctl get\n' +
            '(qemu) system_powerdown\n' +
            '/vgctl get\n' +
            'grep vgpio /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(qemu) system_powerdown\n' +
            '~ # /vgctl get\n' +
            'leds 0x3  pins 0x03  presses 1\n' +
            '(qemu) system_powerdown\n' +
            '~ # /vgctl get\n' +
            'leds 0x2  pins 0x02  presses 2\n' +
            '~ # grep vgpio /proc/interrupts\n' +
            ' 20:          2          0 GIC-0  39 Level     vgpio',
            notes: ['Dòng <code>(qemu) system_powerdown</code> gõ ở monitor, không phải ở <code>~ #</code>. Bản ghi đã được lọc bỏ các mã điều khiển mà monitor chèn vào sau mỗi ký tự gõ (Bài 55).'] },

          { t: 'cal', kind: 'why', title: 'Mỗi lần bấm: một ngắt, một bit đảo',
            x: 'Lần một: <code>0x2</code> → <b><code>0x3</code></b>, LED 0 bật, <code>presses 1</code>. Lần hai: ' +
               '<code>0x3</code> → <b><code>0x2</code></b>, LED 0 tắt, <code>presses 2</code>. <code>/proc/interrupts</code> ' +
               'tăng đúng <b>2</b>, không phải 4 như <code>gpio-keys</code> sẽ đếm (Bài 55): <code>probe</code> đặt ' +
               '<code>GPIOIBE</code> = 0 và <code>GPIOIEV</code> bit 3 = 1, tức chỉ sườn lên. Cả hai lần đều ở cột ' +
               '<b>CPU0</b>: kernel chưa phân ngắt này sang CPU1 — bước 5 sẽ dùng chính chi tiết đó. Và ' +
               '<code>pins</code> luôn khớp <code>leds</code>: top half ghi cả hai dưới cùng một khoá.' },

          { t: 'p', x:
            'Gỡ driver và kiểm tra mọi thứ biến mất theo:' },

          { t: 'code', where: 'qemu', code:
            'rmmod vgpio\n' +
            'grep 9030000 /proc/iomem\n' +
            'grep -c vgpio /proc/interrupts\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod vgpio\n' +
            '[   30.158081] vgpio 9030000.pl061: remove, 2 presses\n' +
            '~ # grep 9030000 /proc/iomem\n' +
            '~ # grep -c vgpio /proc/interrupts\n' +
            '0' },

          { t: 'p', x:
            '<code>remove</code> in số lần bấm đọc từ <code>atomic_t</code>, rồi devres gỡ theo thứ tự ngược: ' +
            '<code>misc_deregister</code>, <code>free_irq</code> (dòng <code>vgpio</code> biến khỏi ' +
            '<code>/proc/interrupts</code>: <code>0</code>), <code>iounmap</code> + <code>release_mem_region</code> ' +
            '(<code>/proc/iomem</code> trống lại). Không một dòng dọn dẹp nào viết tay ngoài việc tắt ' +
            '<code>GPIOIE</code>.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Bấm nút trong lúc driver đang giữ khoá',
        blocks: [
          { t: 'p', x:
            'Ngắt và <code>echo</code> hiếm khi va nhau trong vài micro giây của vùng tới hạn. Tham số ' +
            '<code>hold_ms</code> kéo vùng đó ra 3 giây để bạn chắc chắn bấm trúng. Boot lại như bước 4, nạp driver ' +
            'với tham số, và kiểm tra ngắt 20 được phân cho CPU nào:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /vgpio.ko hold_ms=3000\n' +
            'cat /sys/module/vgpio/parameters/hold_ms\n' +
            'cat /proc/irq/20/effective_affinity_list' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /sys/module/vgpio/parameters/hold_ms\n' +
            '3000\n' +
            '~ # cat /proc/irq/20/effective_affinity_list\n' +
            '0' },

          { t: 'p', x:
            '<code>effective_affinity_list</code> = <code>0</code>: GIC giao mọi ngắt 20 cho CPU0. Vậy muốn ngắt va ' +
            'vào khoá trên <b>cùng một CPU</b> — trường hợp nguy hiểm của mục lý thuyết — hãy chạy ' +
            '<code>echo</code> trên CPU0 bằng <code>taskset 1</code> (<code>1</code> là mặt nạ bit: chỉ CPU0). Gõ lệnh ' +
            'sau, rồi <b>trong vòng 3 giây</b> sang monitor bấm <code>system_powerdown</code>:' },

          { t: 'code', where: 'qemu', code:
            'cd /sys/bus/platform/devices/9030000.pl061\n' +
            'time taskset 1 sh -c \'echo 1 > leds\'\n' +
            '(qemu) system_powerdown\n' +
            'cat presses leds\n' +
            'grep vgpio /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/devices/9030000.pl061 # time taskset 1 sh -c \'echo 1 > leds\'\n' +
            '(qemu) system_powerdown\n' +
            'real\t0m 3.01s\n' +
            'user\t0m 0.00s\n' +
            'sys\t0m 3.00s\n' +
            '/sys/bus/platform/devices/9030000.pl061 # cat presses leds\n' +
            '1\n' +
            '0\n' +
            '/sys/bus/platform/devices/9030000.pl061 # grep vgpio /proc/interrupts\n' +
            ' 20:          1          0 GIC-0  39 Level     vgpio',
            notes: ['Một lần chạy khác trên máy viết bài cho <code>user 0m 0.76s / sys 0m 2.24s</code> — tổng vẫn 3,0 giây. Phần chia giữa <code>user</code> và <code>sys</code> không chính xác khi ngắt bị tắt suốt thời gian đo.'] },

          { t: 'cmdx', cmd: 'taskset 1 sh -c \'echo 1 > leds\'',
            rows: [
              ['<code>taskset 1</code>', 'Chạy lệnh theo sau chỉ trên các CPU có bit bật trong mặt nạ <code>1</code> = <code>0b01</code>: CPU0.', '<code>taskset 2</code> = chỉ CPU1, <code>taskset 3</code> = cả hai'],
              ['<code>sh -c \'…\'</code>', 'Chuyển hướng <code>&gt;</code> là việc của shell, nên cần một shell mới chạy <i>bên trong</i> <code>taskset</code>.', '<code>taskset 1 echo 1 &gt; leds</code> sẽ để shell hiện tại — không bị ghim — mở file'],
              ['<code>time</code>', 'BusyBox <code>time</code>: in thời gian thực và thời gian CPU của lệnh.', '<code>sys</code> = thời gian ở trong kernel, tức trong <code>mdelay</code>']
            ] },

          { t: 'cal', kind: 'why', title: 'Ngắt không mất, chỉ phải xếp hàng 3 giây',
            x: '<code>real 3.01s</code>, gần như toàn bộ là <code>sys</code>: <code>echo</code> giữ khoá với ngắt tắt ' +
               'trên CPU0 suốt <code>mdelay(3000)</code>. Bạn bấm nút giữa chừng; PL061 kéo đường dây lên, GIC muốn ' +
               'báo cho CPU0 nhưng CPU0 đang tắt ngắt, nên ngắt <b>chờ</b>. Khi <code>spin_unlock_irqrestore</code> bật ' +
               'lại ngắt, <code>vg_irq</code> chạy ngay: <code>presses</code> <b>1</b>, và nó đảo bit 0 của ' +
               '<code>leds</code> — vừa được <code>echo</code> đặt thành 1 — thành <b>0</b>. Thứ tự hoàn toàn xác định: ' +
               '<code>echo</code> xong trọn vẹn rồi mới tới nút. Đó là điều khoá bảo đảm. Trên board thật bạn không ' +
               'bao giờ giữ spinlock 3 giây; ở đây nó chỉ để phóng to một khoảnh khắc thường dài vài micro giây.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Ba cách làm hỏng driver, và triệu chứng của từng cách',
        blocks: [
          { t: 'p', x:
            'Build hai biến thể của cùng một <code>vgpio.c</code>, mỗi biến thể bỏ đi đúng một dòng bằng ' +
            '<code>KCFLAGS</code> (biến mà Kbuild chèn vào mọi lệnh <code>gcc</code>, như Bài 55):' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56\n' +
            'for d in noirqsave noclear; do\n' +
            '  mkdir -p v/$d && cp vgpio/vgpio.c vgpio/vgpio_ioctl.h vgpio/Makefile v/$d/\n' +
            'done\n' +
            '(cd v/noirqsave && make KCFLAGS=-DNO_IRQSAVE)\n' +
            '(cd v/noclear && make KCFLAGS=-DNO_CLEAR)\n' +
            'cp v/noirqsave/vgpio.ko initramfs/vgpio_noirqsave.ko\n' +
            'cp v/noclear/vgpio.ko initramfs/vgpio_noclear.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  vgpio.o\n' +
            'vgpio.c: In function ‘vg_set_leds’:\n' +
            'vgpio.c:63:16: warning: unused variable ‘flags’ [-Wunused-variable]\n' +
            '   63 |  unsigned long flags;\n' +
            '      |                ^~~~~\n' +
            '  MODPOST Module.symvers\n' +
            '...',
            notes: ['Chỉ bản <code>noirqsave</code> in cảnh báo; bản <code>noclear</code> build sạch. Dòng <code>make[1]: Entering…</code> đã được lược.'] },

          { t: 'p', x:
            'Cảnh báo duy nhất trình biên dịch có thể đưa ra cho lỗi nguy hiểm nhất bài là một biến không dùng. ' +
            'Không có công cụ nào lúc build nói "khoá này cũng được lấy trong top half". Kernel có công cụ đó lúc ' +
            'chạy — <code>CONFIG_PROVE_LOCKING</code> (lockdep) — nhưng kernel của bạn không bật ' +
            '(<code>grep PROVE_LOCKING ~/bai38/linux-6.18.45/.config</code>).' },

          { t: 'h4', x: 'Lỗi 1: spin_lock thay cho spin_lock_irqsave' },

          { t: 'p', x:
            'Boot lại như bước 4. Nạp biến thể, lặp đúng thí nghiệm của bước 5 — nhưng chạy <code>echo</code> ở ' +
            '<b>nền</b> để dấu nhắc quay lại ngay:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /vgpio_noirqsave.ko hold_ms=3000\n' +
            'cat /proc/irq/20/effective_affinity_list /proc/irq/13/effective_affinity_list\n' +
            'cd /sys/bus/platform/devices/9030000.pl061\n' +
            'taskset 1 sh -c \'echo 1 > leds\' &\n' +
            '(qemu) system_powerdown' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/irq/20/effective_affinity_list /proc/irq/13/effective_affinity_list\n' +
            '0\n' +
            '0\n' +
            '/sys/bus/platform/devices/9030000.pl061 # taskset 1 sh -c \'echo 1 > leds\' &\n' +
            '(qemu) system_powerdown\n' +
            '[   29.276600] rcu: INFO: rcu_preempt detected stalls on CPUs/tasks:\n' +
            '[   29.277285] rcu: \t0-...0: (465 ticks this GP) idle=0cbc/1/0x4000000000000000 softirq=274/274 fqs=563\n' +
            '[   29.277528] rcu: \t(detected by 1, t=5256 jiffies, g=-979, q=48 ncpus=2)\n' +
            '[   29.277762] Sending NMI from CPU 1 to CPUs 0:\n' +
            '[   92.300604] rcu: INFO: rcu_preempt detected stalls on CPUs/tasks:\n' +
            '[   92.300848] rcu: \t0-...0: (465 ticks this GP) idle=0cbc/1/0x4000000000000000 softirq=274/274 fqs=3214',
            notes: [
              'Sau <code>system_powerdown</code>, máy ảo <b>không trả lời bất cứ phím nào nữa</b>. Thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.',
              'Khối <code>rcu: INFO</code> chỉ xuất hiện ở khoảng một nửa số lần chạy trên máy viết bài (5 trong 13 lần; lần nào có thì in ở giây thứ 29 sau boot); những lần còn lại máy ảo im lặng hoàn toàn. Cả hai đều là cùng một lỗi — bước tiếp theo cho cách kiểm tra chắc chắn.'
            ] },

          { t: 'p', x:
            'Máy ảo treo. Để biết CPU đang làm gì khi không in gì, hỏi thẳng QEMU: lệnh monitor ' +
            '<code>info registers</code> in thanh ghi của CPU đang chọn, <code>cpu 1</code> chuyển sang CPU1:' },

          { t: 'code', where: 'qemu', code:
            '(qemu) info registers\n' +
            '(qemu) cpu 1\n' +
            '(qemu) info registers' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(qemu) info registers\n' +
            ' PC=ffff800081162c90 X00=ffff00000413f390 X01=0000000000000001\n' +
            '...\n' +
            '(qemu) cpu 1\n' +
            '(qemu) info registers\n' +
            ' PC=ffff800081157b58 X00=0000000000000005 X01=ffff00001fedb1e0\n' +
            '...',
            notes: ['Mỗi <code>info registers</code> in khoảng 30 dòng (X00–X30, PSTATE, Q0–Q31); ở đây chỉ giữ dòng <code>PC</code>. Giá trị <code>X00</code> của CPU0 (địa chỉ khoá) khác nhau giữa các lần boot; hai giá trị <code>PC</code> thì giống hệt ở mọi lần chạy trên kernel này.'] },

          { t: 'p', x:
            'Tra hai địa chỉ <code>PC</code> trong <code>System.map</code> (Bài 40) — tìm ký hiệu lớn nhất không vượt ' +
            'quá địa chỉ. Chạy trên WSL, trong một cửa sổ khác:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'for a in ffff800081162c90 ffff800081157b58; do\n' +
            '  awk -v a=$a \'$1 <= a { last = $0 } END { print a " -> " last }\' System.map\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ffff800081162c90 -> ffff800081162c88 T queued_spin_lock_slowpath\n' +
            'ffff800081157b58 -> ffff800081157b50 T cpu_do_idle' },

          { t: 'cal', kind: 'danger', title: 'CPU0 chờ chính nó, mãi mãi',
            x: '<b>CPU0</b> đứng ở <code>queued_spin_lock_slowpath</code>+8 — hàm mà <code>spin_lock</code> gọi khi ' +
               'khoá đã có người giữ. Chuỗi sự kiện đúng như mục lý thuyết: <code>echo</code> trên CPU0 lấy khoá ' +
               'bằng <code>spin_lock</code> (ngắt vẫn bật); bạn bấm nút; ngắt 20 đến CPU0 (<code>effective_affinity</code> ' +
               '= 0); <code>vg_irq</code> gọi <code>spin_lock</code> cho cùng khoá và quay vòng. Người giữ khoá là ' +
               '<code>echo</code> — bị chính top half này cắt ngang, không bao giờ được chạy tiếp. <b>CPU1</b> đứng ở ' +
               '<code>cpu_do_idle</code>: nó hoàn toàn khoẻ, chỉ không có việc gì làm. Nó cũng là CPU phát hiện ra ' +
               'chuyện: <code>detected by 1</code>, <code>0-...0</code> = CPU0 không báo cáo gì cho RCU suốt ' +
               '<code>t=5256 jiffies</code> = 21 giây ở <code>HZ=250</code> (<code>CONFIG_RCU_CPU_STALL_TIMEOUT=21</code>). ' +
               'Vậy sao bàn phím chết? <code>/proc/irq/13</code> — ngắt của UART, nơi phím bạn gõ đi vào — cũng có ' +
               '<code>effective_affinity</code> = <b>0</b>. Chỉ CPU0 nhận được phím, và CPU0 đã chết. Trên máy thật ' +
               'với vài chục CPU, triệu chứng thường là "một phần hệ thống đứng hình": mọi thứ cần CPU0 hoặc cần ' +
               'khoá đó đều treo, phần còn lại chạy tiếp.' },

          { t: 'cal', kind: 'info', title: 'CPU1 vẫn sống: một kiểm chứng',
            x: 'Máy viết bài chạy thêm một lệnh nền trước thí nghiệm: <code>taskset 2 sh -c \'sleep 15; …; echo helper ' +
               'done on cpu1\' &amp;</code>. Dòng <code>helper done on cpu1</code> in ra <b>sau</b> khi CPU0 đã treo, ' +
               'hai lần chạy liền. Với <code>-smp 1</code> thì không có CPU nào để in: máy treo tuyệt đối, <code>info ' +
               'registers</code> cho <code>PC=ffff800081162cf8</code>, cũng trong <code>queued_spin_lock_slowpath</code>, và ' +
               'không có thông báo RCU nào — vì không còn CPU nào để phát hiện.' },

          { t: 'h4', x: 'Lỗi 2: quên xoá cờ ngắt' },

          { t: 'p', x:
            'Thoát QEMU, boot lại như bước 4. Nạp biến thể thứ hai và bấm nút <b>một</b> lần. Các lệnh sau đó chạy ' +
            'bằng <code>taskset 2</code> để chắc chắn chúng chạy trên CPU1:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /vgpio_noclear.ko\n' +
            'grep vgpio /proc/interrupts\n' +
            '(qemu) system_powerdown\n' +
            'taskset 2 grep vgpio /proc/interrupts\n' +
            'taskset 2 grep vgpio /proc/interrupts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep vgpio /proc/interrupts\n' +
            ' 20:          0          0 GIC-0  39 Level     vgpio\n' +
            '(qemu) system_powerdown\n' +
            '~ # taskset 2 grep vgpio /proc/interrupts\n' +
            ' 20:    2347067          0 GIC-0  39 Level     vgpio\n' +
            '~ # taskset 2 grep vgpio /proc/interrupts\n' +
            ' 20:    3279660          0 GIC-0  39 Level     vgpio\n' +
            '~ # [   33.206148] rcu: INFO: rcu_preempt detected stalls on CPUs/tasks:\n' +
            '[   33.207054] rcu: \t0-....: (5 ticks this GP) idle=0ab4/1/0x4000000000000002 softirq=289/289 fqs=2625\n' +
            '[   33.207583] rcu: \t(detected by 1, t=5252 jiffies, g=-979, q=30 ncpus=2)\n' +
            '[   33.208029] Sending NMI from CPU 1 to CPUs 0:\n' +
            '[   33.208505] NMI backtrace for cpu 0 skipped: idling at default_idle_call+0x28/0x44',
            notes: ['Bộ đếm tăng liên tục nên con số của bạn sẽ khác; bậc độ lớn — hàng trăm nghìn mỗi giây — thì không. Máy viết bài đọc được 17 873 614 sau khoảng 30 giây.'] },

          { t: 'cal', kind: 'why', title: 'Một lần bấm, hai triệu ngắt',
            x: 'Một lần <code>system_powerdown</code> cho <b>2 347 067</b> ngắt sau vài giây, và thêm <b>932 593</b> ngắt ' +
               'trong khoảng một giây giữa hai lần <code>grep</code>. Đây là <b>bão ngắt</b> (<i>interrupt storm</i>): ' +
               'PL061 giữ đường dây ở mức cao chừng nào cờ trong <code>GPIORIS</code> chưa được xoá; <code>vg_irq</code> ' +
               'chạy, trả <code>IRQ_HANDLED</code>, GIC thấy dây vẫn cao, gọi lại ngay. Lần nào cũng thật sự là "ngắt ' +
               'của tôi" (<code>GPIOMIS</code> bit 3 vẫn bật), nên cơ chế <code>nobody cared</code> của Bài 55 — chỉ ' +
               'bắt được <code>IRQ_NONE</code> — không cứu được. CPU0 dành gần hết thời gian ở cửa vào ngắt; ba lần ' +
               'máy viết bài hỏi <code>info registers</code> (một lần chạy với <code>-smp 1</code>), PC nằm trong ' +
               '<code>gic_handle_irq</code> một lần và trong <code>vg_irq</code> của module hai lần. Khác lỗi 1: máy vẫn ' +
               'trả lời, chậm, vì giữa hai ngắt CPU0 được trả lại ' +
               'trong chốc lát — đủ để nhận phím. So với bản đúng ở bước 4: một lần bấm, <code>/proc/interrupts</code> ' +
               'tăng đúng 1.' },

          { t: 'h4', x: 'Lỗi 3: hai driver cùng xin một dải địa chỉ' },

          { t: 'p', x:
            'Lỗi cuối không làm treo gì, và đó là tin tốt: đây là lỗi mà <code>devm_platform_ioremap_resource</code> ' +
            'bắt giúp bạn. Một cây khác giữ nguyên node PL061 gốc (driver kernel vẫn nhận nó) và <b>thêm</b> một node ' +
            '<code>vgpio@9030000</code> trỏ vào cùng dải:' },

          { t: 'code', where: 'file', name: '~/bai56/clash.dts', lang: 'dts', code:
            '/include/ "virt.dts"\n' +
            '\n' +
            '/ {\n' +
            '\tvgpio@9030000 {\n' +
            '\t\tcompatible = "learn,vgpio";\n' +
            '\t\treg = <0x00 0x9030000 0x00 0x1000>;\n' +
            '\t\tinterrupts = <0x00 0x07 0x04>;\n' +
            '\t};\n' +
            '};' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai56\n' +
            'dtc -q -I dts -O dtb -o clash.dtb clash.dts\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb clash.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'qemu', code:
            'ls /sys/bus/amba/devices\n' +
            'grep 9030000 /proc/iomem\n' +
            'ls /sys/bus/platform/devices | grep 9030000\n' +
            'insmod /vgpio.ko\n' +
            'echo rc=$?\n' +
            'ls /sys/bus/platform/drivers/vgpio' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/amba/devices\n' +
            '9000000.pl011  9010000.pl031  9030000.pl061\n' +
            '~ # grep 9030000 /proc/iomem\n' +
            '09030000-09030fff : pl061@9030000\n' +
            '  09030000-09030fff : 9030000.pl061 pl061@9030000\n' +
            '~ # ls /sys/bus/platform/devices | grep 9030000\n' +
            '9030000.vgpio\n' +
            '~ # insmod /vgpio.ko\n' +
            '[    7.684221] vgpio: loading out-of-tree module taints kernel.\n' +
            '[    7.688844] vgpio 9030000.vgpio: error -EBUSY: can\'t request region for resource [mem 0x09030000-0x09030fff]\n' +
            '[    7.689039] vgpio 9030000.vgpio: probe with driver vgpio failed with error -16\n' +
            '~ # echo rc=$?\n' +
            'rc=0\n' +
            '~ # ls /sys/bus/platform/drivers/vgpio\n' +
            'bind    module  uevent  unbind' },

          { t: 'cal', kind: 'why', title: '/proc/iomem là sổ đăng ký, và nó từ chối người thứ hai',
            x: 'Với cây này PL061 vẫn là thiết bị AMBA (<code>9030000.pl061</code> trong <code>/sys/bus/amba</code>), ' +
               'và driver của kernel đã ghi tên vào <code>/proc/iomem</code> lúc boot. Node mới thành platform device ' +
               '<code>9030000.vgpio</code>. Khi <code>vg_probe</code> gọi <code>devm_platform_ioremap_resource</code>, ' +
               'phần <code>request_mem_region</code> thấy dải đã có chủ và trả <code>-EBUSY</code> = −16; ' +
               '<code>dev_err_probe</code> trong <code>lib/devres.c</code> dòng 155 in thông báo kèm <code>%pR</code> ' +
               '(Bài 54). Driver không bao giờ chạm vào thanh ghi. <code>insmod</code> vẫn trả <code>rc=0</code> vì ' +
               'module nạp thành công — chỉ <code>probe</code> thất bại, và thư mục driver không có liên kết thiết bị ' +
               'nào (Bài 54). Nếu bạn dùng <code>ioremap</code> trần thay vì bản <code>_resource</code>, không gì chặn ' +
               'lại: hai driver sẽ cùng ghi vào một thiết bị, đúng loại race mà lời cảnh báo về <code>devmem</code> ' +
               'mô tả.' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp và giữ lại gì',
            x: '<code>~/bai56</code> nặng khoảng <b>8,3 MB</b>. Giữ <code>vgpio/</code>, <code>app/</code>, ' +
               '<code>virt.dts</code> và <code>vgpio.dts</code>: Bài 57 đọc datasheet PL061 và đối chiếu từng dòng ' +
               '<code>writel</code> của driver này với bảng thanh ghi. <code>race/</code>, <code>v/</code>, ' +
               '<code>clash.*</code> và <code>initramfs/</code> xoá tuỳ ý. <code>~/bai54</code> và <code>~/bai55</code> ' +
               'không còn bài nào đọc tới.' }
        ] }
    ] },

    /* ============================================================
       7. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Máy ảo không trả lời phím nào ngay sau khi bấm nút; <code>info registers</code> ở monitor cho PC trong <code>queued_spin_lock_slowpath</code>',
         'Khoá dùng chung với top half được lấy bằng <code>spin_lock</code> ở ngữ cảnh tiến trình. Ngắt đến trên cùng CPU, top half quay vòng chờ chính đoạn mã nó vừa cắt ngang. Gặp ở bước 6.',
         'Mọi nơi ngoài top half lấy khoá đó bằng <code>spin_lock_irqsave</code>/<code>spin_unlock_irqrestore</code>. Tra PC trong <code>System.map</code> để xác nhận trước khi sửa.'],
        ['<code>rcu: INFO: rcu_preempt detected stalls on CPUs/tasks:</code> rồi <code>0-...0:</code> và <code>detected by 1</code>',
         'Một CPU (số trước dấu gạch) không đi qua trạng thái nghỉ nào suốt <code>CONFIG_RCU_CPU_STALL_TIMEOUT</code> = 21 giây: nó kẹt trong một vòng lặp với ngắt hoặc preempt tắt. Không phải lỗi của RCU — RCU chỉ là người phát hiện. Không phải lúc nào cũng in (5/13 lần ở bước 6).',
         'Tìm xem CPU đó kẹt ở đâu: <code>info registers</code> + <code>cpu N</code> ở monitor QEMU, hoặc trên board thật đọc phần backtrace ngay sau dòng <code>Sending NMI</code> nếu có.'],
        ['Số đếm của ngắt trong <code>/proc/interrupts</code> tăng hàng trăm nghìn mỗi giây sau một sự kiện duy nhất',
         'Ngắt mức mà top half không xoá cờ trong thiết bị (với PL061: ghi <code>GPIOIC</code>). Đường dây giữ ở mức cao, GIC gọi lại mãi. Gặp ở bước 6.',
         'Xoá cờ trong top half, trước khi trả <code>IRQ_HANDLED</code>. Đọc datasheet: thanh ghi xoá thường tên là <code>…IC</code>, <code>…CLR</code> hoặc "write 1 to clear".'],
        ['<code>vgpio 9030000.vgpio: error -EBUSY: can\'t request region for resource [mem 0x09030000-0x09030fff]</code><br><code>probe with driver vgpio failed with error -16</code>',
         'Một driver khác đã giữ dải đó trong <code>/proc/iomem</code> — ở đây là driver PL061 của kernel, vì node gốc vẫn còn <code>arm,primecell</code>. Gặp ở bước 6.',
         '<code>grep ĐỊA_CHỈ /proc/iomem</code> để xem ai giữ. Hoặc đổi <code>compatible</code> của chính node đó (như <code>vgpio.dts</code>), hoặc gỡ driver kia. Đừng lách bằng <code>ioremap</code> trần.'],
        ['<code>Bus error</code>, <code>$?</code> = 135',
         '<code>devmem</code> (hoặc một chương trình <code>mmap</code> <code>/dev/mem</code>) đọc một địa chỉ không có thiết bị nào trả lời. Gặp ở bước 1 với <code>0x0b000000</code>.',
         'Đối chiếu địa chỉ với <code>/proc/iomem</code> và <code>reg</code> trong Device Tree. Trong driver, lỗi tương tự thành một oops <code>SError</code> hoặc <code>synchronous external abort</code>.'],
        ['<code>devmem: mmap: Operation not permitted</code>',
         'Địa chỉ nằm trong RAM, và kernel bật <code>CONFIG_STRICT_DEVMEM=y</code>. Gặp ở bước 1 với <code>0x40000000</code>.',
         'Đúng thiết kế — <code>devmem</code> chỉ dành cho dải MMIO. Kiểm tra xem bạn có gõ nhầm địa chỉ thiết bị không.'],
        ['<code>warning: unused variable ‘flags’ [-Wunused-variable]</code>',
         'Khai báo <code>unsigned long flags</code> cho <code>spin_lock_irqsave</code> nhưng lại gọi <code>spin_lock</code>. Gặp khi build biến thể <code>NO_IRQSAVE</code>.',
         'Coi cảnh báo này là dấu hiệu của lỗi deadlock ở trên — đó là cảnh báo duy nhất bạn sẽ nhận được.'],
        ['<code>race: mode 0: 2000000 of 2000000, lost 0</code> — bản sai lại cho kết quả đúng',
         'Máy ảo chỉ có một CPU (<code>-smp 1</code> hoặc quên <code>-smp</code>). Hai thread chạy lần lượt, hầu như không bao giờ bị ngắt giữa đọc và ghi.',
         'Boot với <code>-smp 2</code>; kiểm tra bằng <code>nproc</code>. Không bao giờ dùng "chạy được một lần" làm bằng chứng không có race.'],
        ['<code>cat: can\'t open \'/sys/module/race/parameters/mode\': No such file or directory</code>',
         'Đọc sau khi đã <code>rmmod</code>: thư mục <code>parameters</code> sống và chết cùng module. Gặp khi viết bài.',
         '<code>lsmod</code> để chắc module đang nạp. Muốn xem tham số của file <code>.ko</code> không cần nạp: <code>modinfo -F parm race.ko</code>.'],
        ['<code>FATAL ERROR: Couldn\'t open "../bai54/virt.dts": No such file or directory</code>',
         'Đường dẫn trong <code>/include/</code> được tính từ <b>thư mục chứa file <code>.dts</code></b>, không phải thư mục hiện tại. Gặp khi viết bài với một <code>.dts</code> nằm trong thư mục con.',
         'Để <code>vgpio.dts</code> và <code>virt.dts</code> cùng thư mục như bài, hoặc sửa đường dẫn tương đối theo vị trí file.'],
        ['<code>platform gpio-keys: deferred probe pending: gpio-keys: failed to get gpio</code> ở giây thứ 10',
         'Quên <code>/delete-node/ gpio-keys;</code> trong <code>vgpio.dts</code>. <code>gpio-keys</code> vẫn đòi chân 3 của PL061, mà PL061 giờ không còn là bộ điều khiển GPIO của kernel. Gặp khi viết bài; <code>vgpio</code> vẫn chạy, nhưng <code>/sys/class/input</code> trống.',
         'Thêm lại dòng đó và dịch lại <code>vgpio.dtb</code>. <code>cat /sys/kernel/debug/devices_deferred</code> (sau <code>mount -t debugfs</code>, Bài 54) phải trống.'],
        ['<code>open /dev/vgpio: No such file or directory</code>',
         'Chạy <code>vgctl</code> khi driver chưa nạp, khi chưa <code>mount -t devtmpfs none /dev</code>, hoặc chạy bản <code>vgctl-host</code> trên WSL (gặp khi viết bài).',
         '<code>grep vgpio /proc/misc</code> để chắc driver đã đăng ký; <code>ls /dev | wc -l</code> ra 1 nghĩa là devtmpfs chưa gắn.']
      ] },

    /* ============================================================
       8. TÓM TẮT
       ============================================================ */
    { t: 'recap', items: [
      'Thanh ghi của thiết bị nằm trong không gian địa chỉ vật lý (<b>MMIO</b>). Driver không dùng thẳng địa chỉ đó: <b><code>devm_platform_ioremap_resource</code></b> giữ chỗ trong <code>/proc/iomem</code> rồi ánh xạ kiểu Device memory, trả về <code>void __iomem *</code>.',
      'Chỉ chạm thanh ghi qua <b><code>readl</code>/<code>writel</code></b>. Chúng chèn <b><code>dmb oshld</code> sau lần đọc</b> và <b><code>dmb oshst</code> trước lần ghi</b> — 12 + 6 rào trong <code>vgpio.o</code> mà bạn không viết dòng nào. Bản <code>_relaxed</code> bỏ rào, chỉ dùng khi đã đo và không dính DMA.',
      '<b><code>devmem</code></b> đọc thẳng thanh ghi từ userspace để kiểm chứng driver: <code>0x041061</code> là PL061 của ARM. <code>Bus error</code> (rc 135) = không ai trả lời; <code>Operation not permitted</code> = RAM, bị <code>STRICT_DEVMEM</code> chặn.',
      'Hai kthread trên <b>hai CPU</b> cộng 2 000 000 lần vào một biến trần mất <b>~40 %</b> (761 681–955 138 lần), mỗi lần một con số khác. Với <b>một CPU</b> thì <b>lost 0</b> — race condition trốn được mọi bài test một nhân.',
      '<b><code>atomic_t</code></b> cho một con số (<code>stadd</code> hoặc <code>ldxr</code>/<code>stxr</code>, mọi ngữ cảnh), <b>spinlock</b> cho vài biến + thanh ghi khi có ngữ cảnh ngắt (không được ngủ bên trong), <b>mutex</b> khi cần ngủ. Giá đo được với 2 CPU: <b>121 / 257 / 393 ms</b> so với 21 ms của bản sai.',
      'Khoá dùng trong top half thì mọi nơi khác phải lấy bằng <b><code>spin_lock_irqsave</code></b>. Quên chữ <code>irqsave</code>: CPU0 treo vĩnh viễn trong <b><code>queued_spin_lock_slowpath</code></b>, bàn phím chết vì ngắt UART cũng ở CPU0, CPU1 vẫn sống và đôi khi báo <code>rcu … detected stalls</code>. Trình biên dịch chỉ cảnh báo <code>unused variable ‘flags’</code>.',
      'Ngắt <b>mức</b> phải được xoá trong thiết bị (<code>GPIOIC</code>) ngay trong top half. Quên: <b>một</b> lần bấm thành <b>hơn 2 triệu</b> ngắt sau vài giây.',
      'Driver <code>vgpio</code> ghép cả Chặng 10: platform driver + devres (Bài 54), sysfs (Bài 53), <code>ioctl</code> qua <b><code>misc_register</code></b> (major <b>10</b>, minor <b>258</b>), ngắt (Bài 55), MMIO và đồng bộ. <code>rmmod</code> gỡ sạch: <code>/proc/iomem</code> và <code>/proc/interrupts</code> không còn dấu vết.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Bảng thanh ghi PL061 trong bài này là thứ bạn nhận sẵn — chép từ hằng số trong <code>gpio-pl061.c</code>. ' +
         'Trong công việc thật, không ai chép cho bạn: bạn mở một datasheet vài trăm trang và tự tìm. <b>Bài 57 — Đọc ' +
         'datasheet và GPIO hiện đại</b> mở tài liệu kỹ thuật của chính khối PL061, đi từ bảng register map, bit field ' +
         'và reset value tới đúng từng dòng <code>writel</code> trong <code>vgpio.c</code> — kể cả dòng giải thích vì ' +
         'sao <code>GPIODATA</code> chiếm 256 ô. Rồi bài hỏi câu mà <code>vgpio</code> né tránh: vì sao kernel đã có sẵn ' +
         'khung <code>gpiochip</code> để mọi driver GPIO dùng chung, và vì sao userspace hiện đại điều khiển chân GPIO ' +
         'qua <code>/dev/gpiochipN</code> và <code>libgpiod</code> thay vì một file sysfs tự chế như <code>leds</code>.' }
  ],

  quiz: [
    { q: 'Driver của bạn gọi <code>readl(base + 0x418)</code>. <code>base</code> lấy từ đâu thì đúng?',
      opts: [
        'Gán thẳng <code>base = (void __iomem *)0x09030000</code> — đó là địa chỉ trong <code>reg</code>',
        '<code>base = devm_platform_ioremap_resource(pdev, 0)</code>',
        '<code>base = kmalloc(0x1000, GFP_KERNEL)</code>',
        '<code>base = phys_to_virt(0x09030000)</code>'
      ],
      a: 1,
      why: '<code>0x09030000</code> là địa chỉ <b>vật lý</b>; mọi con trỏ trong kernel là địa chỉ ảo, và chưa có bảng trang nào ánh xạ dải thiết bị. <code>devm_platform_ioremap_resource</code> lấy ô đầu tiên của <code>reg</code>, giữ chỗ trong <code>/proc/iomem</code>, tạo ánh xạ kiểu Device memory và tự gỡ khi unbind. <code>phys_to_virt</code> chỉ đúng cho RAM mà kernel đã ánh xạ sẵn, và ánh xạ đó cho phép cache — sai cho thanh ghi. <code>kmalloc</code> cấp RAM thường, không liên quan gì tới thiết bị.' },

    { q: '<code>objdump</code> một driver cho thấy <code>dmb oshst</code> đứng ngay trước một lệnh <code>str</code> vào thanh ghi. Rào đó bảo đảm điều gì?',
      opts: [
        'Lệnh <code>str</code> chạy nhanh hơn',
        'Mọi lần ghi vào bộ nhớ đứng trước đã hoàn tất trước khi thiết bị nhận lần ghi thanh ghi này — ví dụ bộ đệm DMA đã đầy đủ',
        'Không CPU nào khác được đọc thanh ghi đó',
        'Ngắt bị tắt trong lúc ghi'
      ],
      a: 1,
      why: '<code>writel</code> = <code>dmb oshst</code> + <code>str</code>: rào <i>st</i> chờ mọi lần <b>ghi</b> phía trước xong, trong phạm vi <i>osh</i> (mọi CPU và thiết bị). Kịch bản kinh điển là driver điền bộ đệm trong RAM rồi ghi thanh ghi "bắt đầu DMA" — không có rào, thiết bị có thể đọc dữ liệu cũ. Rào không khoá gì cả (việc đó là của spinlock) và không đụng tới ngắt (việc đó là của <code>_irqsave</code>). Bước 3 thấy đúng ba cặp như vậy trong <code>vg_irq</code>.' },

    { q: 'Một bộ đếm số gói tin được tăng trong top half và đọc trong <code>read()</code>. Không có biến nào khác phải đổi cùng nó. Chọn công cụ nào?',
      opts: [
        '<code>struct mutex</code>',
        '<code>atomic_t</code>',
        '<code>spinlock_t</code> với <code>spin_lock</code> ở cả hai nơi',
        'Không cần gì — <code>int</code> là 32 bit, ghi một lần là nguyên tử'
      ],
      a: 1,
      why: 'Một con số, chỉ tăng và đọc: <code>atomic_t</code> là công cụ nhẹ nhất đủ dùng — không khoá, dùng được trong top half, <b>121 ms</b> so với 257 ms của spinlock ở bước 2. Mutex bị cấm trong top half. Spinlock thì đúng nếu phía <code>read()</code> dùng <code>spin_lock_irqsave</code> — nhưng phương án ghi <code>spin_lock</code> ở cả hai nơi chính là lỗi deadlock ở bước 6. Còn <code>int</code> trần: <i>ghi</i> thì nguyên tử, nhưng <code>++</code> là đọc-cộng-ghi — bước 2 mất 40 % vì đúng điều đó.' },

    { q: 'Sau khi <code>insmod</code> driver mới và bấm nút một lần, máy ảo <code>-smp 2</code> không trả lời phím nào nữa. <code>info registers</code> ở monitor cho CPU0 ở <code>queued_spin_lock_slowpath</code>, CPU1 ở <code>cpu_do_idle</code>. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Top half quên xoá cờ ngắt, nên bão ngắt chiếm hết CPU0',
        'Một khoá dùng chung với top half được lấy bằng <code>spin_lock</code> (không <code>_irqsave</code>) ở ngữ cảnh tiến trình trên CPU0',
        'CPU1 bị treo và kéo CPU0 theo',
        'Driver gọi <code>msleep</code> trong top half'
      ],
      a: 1,
      why: 'PC trong <code>queued_spin_lock_slowpath</code> nghĩa là CPU0 đang quay vòng chờ một spinlock đã có chủ. CPU1 rảnh, nên không phải hai CPU giành nhau: người giữ khoá chính là đoạn mã bị top half cắt ngang trên CPU0 — đúng kịch bản <code>spin_lock</code> không <code>irqsave</code>. Phím chết vì ngắt UART (IRQ 13) cũng chỉ đến CPU0. Bão ngắt sẽ cho PC trong <code>gic_handle_irq</code>/handler và máy vẫn trả lời chậm. <code>msleep</code> trong top half cho <code>BUG: scheduling while atomic</code> (Bài 55), không phải một CPU quay vòng im lặng.' },

    { q: 'Thiết bị báo ngắt theo <b>mức cao</b>. Top half đọc thanh ghi trạng thái, xử lý, trả <code>IRQ_HANDLED</code> — nhưng không ghi gì vào thiết bị. Chuyện gì xảy ra?',
      opts: [
        'Không sao — <code>IRQ_HANDLED</code> báo kernel đã xong',
        'Kernel in <code>nobody cared</code> và tắt đường ngắt sau 100 000 lần',
        'Đường dây vẫn ở mức cao, top half bị gọi lại liên tục: bão ngắt, hàng triệu lần mỗi vài giây',
        'Ngắt bị mất, lần sau thiết bị không báo nữa'
      ],
      a: 2,
      why: 'Với ngắt mức, chính thiết bị giữ dây ở mức cao tới khi driver xoá nguyên nhân. <code>IRQ_HANDLED</code> chỉ nói với kernel, không nói với thiết bị. Bước 6: <b>2 347 067</b> ngắt sau một lần bấm. Cơ chế <code>nobody cared</code> của Bài 55 chỉ đếm <code>IRQ_NONE</code>; ở đây handler trả <code>IRQ_HANDLED</code> mỗi lần — vì ngắt thật sự là của nó — nên không có gì cứu. Với ngắt sườn, quên xoá cờ thường cho kết quả ngược lại: lần sau không ngắt nữa.' },

    { q: 'Bạn chạy <code>race.ko mode=0</code> trên board của mình mười lần, lần nào cũng <code>lost 0</code>. Kết luận nào đúng?',
      opts: [
        'Mã không có race condition',
        'Chỉ kết luận được nếu board có ít nhất hai CPU đang chạy cả hai thread song song; trên máy một CPU, kết quả đúng không chứng minh gì',
        '<code>READ_ONCE</code>/<code>WRITE_ONCE</code> đã làm cho phép cộng thành nguyên tử',
        'Mười lần là đủ để tin'
      ],
      a: 1,
      why: 'Bước 2 chạy đúng bản sai với <code>-smp 1</code>: <b>lost 0</b>, kể cả với 40 triệu lần cộng; với <code>-smp 2</code>, cùng lệnh mất khoảng 18 triệu. Một CPU nghĩa là hai thread chạy lần lượt, và scheduler hiếm khi cắt đúng giữa <code>ldr</code> và <code>str</code>. <code>READ_ONCE</code>/<code>WRITE_ONCE</code> chỉ bắt trình biên dịch đọc ghi đúng một lần mỗi vòng, không gộp đọc-cộng-ghi thành một thao tác. Race condition không bao giờ được chứng minh là không có bằng cách chạy thử — chỉ bằng cách chỉ ra khoá hoặc thao tác nguyên tử bảo vệ nó.' }
  ]
});

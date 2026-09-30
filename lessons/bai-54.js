/* Bài 54 — Platform driver và Device Tree
   Chặng 10 — Kernel module và Driver
   Viết driver tsensor (~/bai54/tsensor/tsensor.c, 245 dòng) khớp với compatible "learn,temp-sensor"
   mà Bài 45 để lại chưa có chủ: platform_driver + of_match_table, probe()/remove(),
   platform_get_resource, of_property_read_u32/_string/_u32_array (bắt buộc / tuỳ chọn / sai hình),
   devm_kzalloc, devm_request_mem_region, devm_gpiod_get_optional, devm_add_action_or_reset
   (cdev + device_create + ida), dev_err_probe. Cây board.dts = virt.dts + label gpio0 + bốn node
   sensor (okay / disabled / thiếu property / cần GPIO) + một node gpio-delay làm "nhà cung cấp"
   nạp sau, để thấy -EPROBE_DEFER và /sys/kernel/debug/devices_deferred. Rò rỉ đo bằng leaky.ko vs
   tidy.ko qua 1 000 vòng unbind/bind (kmalloc-2k 80 -> 1080, rồi đứng yên). Mọi số liệu đo
   2026-09-30 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1, dtc 1.5.0), kernel
   ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs. ~/bai53 chỉ được đọc (Makefile). */

Lesson.register({
  id: 'bai-54',
  title: 'Platform driver và Device Tree',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Driver ram-disk của Bài 52–53 tự quyết mọi thứ: <code>rd_init</code> tự đặt ra hai thiết bị, mỗi ' +
    'cái 4 096 byte, ngay khi <code>insmod</code>. Driver thật không được phép làm vậy. Trên một bo ' +
    'mạch, cảm biến nhiệt độ nằm ở địa chỉ nào, có mấy cái, ngưỡng cảnh báo bao nhiêu độ là chuyện ' +
    'của <b>phần cứng</b>, và từ Chặng 08 bạn đã biết phần cứng được mô tả ở đâu: trong Device Tree.<br><br>' +
    'Bài này viết driver cho đúng node <code>learn,temp-sensor</code> mà Bài 45 cố ý để lại chưa có ' +
    'chủ. Driver không tự tạo thiết bị nào. Nó đăng ký với kernel \"tôi phục vụ ' +
    '<code>learn,temp-sensor</code>\", rồi chờ kernel gọi <code>probe()</code> cho từng node khớp, đọc ' +
    'địa chỉ và thông số từ chính node đó. Bạn sẽ thấy một node được phục vụ, một node bị bỏ qua, một ' +
    'node bị từ chối vì thiếu dữ liệu, và một node phải <b>xếp hàng chờ</b> vì thứ nó cần chưa có. ' +
    'Cuối bài, bạn đo được một driver quên giải phóng bộ nhớ ăn mất <b>2 MB</b> sau 1 000 lần gỡ ra ' +
    'lắp vào, và cách <code>devm_*</code> đưa con số đó về 0.',

  goals: [
    'Viết một <code>platform_driver</code> có <code>of_match_table</code>, và giải thích vì sao ' +
      '<code>probe()</code> được gọi một lần <b>cho mỗi node</b> khớp chứ không phải một lần cho cả ' +
      'module.',
    'Lấy vùng địa chỉ từ <code>reg</code> bằng <code>platform_get_resource</code>, và đọc property ' +
      'bằng <code>of_property_read_u32</code>/<code>_string</code>/<code>_u32_array</code>, phân biệt ' +
      'được property bắt buộc, tuỳ chọn và sai hình qua mã <code>-EINVAL</code>/<code>-EOVERFLOW</code>.',
    'Dùng <code>devm_kzalloc</code>, <code>devm_request_mem_region</code>, ' +
      '<code>devm_gpiod_get_optional</code> và <code>devm_add_action_or_reset</code> để hàm ' +
      '<code>probe()</code> không cần một nhãn <code>goto</code> nào, và chứng minh thứ tự giải phóng ' +
      'ngược với thứ tự xin.',
    'Gây ra một <code>-EPROBE_DEFER</code> thật, đọc lý do trong ' +
      '<code>/sys/kernel/debug/devices_deferred</code>, và thấy kernel tự thử lại khi nhà cung cấp xuất ' +
      'hiện.',
    'Đo một rò rỉ bộ nhớ trong <code>/proc/slabinfo</code> sau 1 000 vòng <code>unbind</code>/' +
      '<code>bind</code>, và giải thích vì sao <code>rmmod</code> không trả lại được bộ nhớ đó.',
    'Chẩn đoán \"driver đã nạp nhưng <code>probe()</code> không chạy\" bằng thang kiểm tra ' +
      '<code>/sys/bus/platform</code>.'
  ],

  blocks: [

    /* ============================================================
       1. TỪ "TỰ TẠO THIẾT BỊ" ĐẾN "ĐƯỢC GIAO THIẾT BỊ"
       ============================================================ */
    { t: 'h2', x: 'Từ tự tạo thiết bị đến được giao thiết bị' },

    { t: 'p', x:
      'Hãy so hai cách một nhà hàng nhận đầu bếp. Cách thứ nhất: đầu bếp tự đến, tự kê bếp, tự quyết ' +
      'hôm nay nấu cho hai bàn. Cách thứ hai: quản lý có sơ đồ nhà hàng ghi rõ bếp nào ở đâu, mỗi bếp ' +
      'bao nhiêu lò; đầu bếp chỉ đăng ký \"tôi nấu món Ý\", và quản lý dẫn anh ta tới <b>từng</b> bếp món Ý ' +
      'có trên sơ đồ. Driver ram-disk của Bài 52–53 là cách thứ nhất. Platform driver là cách thứ hai: ' +
      'sơ đồ là Device Tree, quản lý là lõi driver của kernel (<i>driver core</i>), và \"dẫn tới bếp\" là ' +
      'một lời gọi <code>probe()</code>.' },

    { t: 'table',
      head: ['', 'Driver ram-disk (Bài 52–53)', 'Platform driver (bài này)'],
      rows: [
        ['Ai quyết có mấy thiết bị', 'Hằng số <code>RD_COUNT 2</code> trong mã C', 'Số node <code>okay</code> có <code>compatible</code> khớp trong Device Tree'],
        ['Thông số lấy từ đâu', '<code>#define RD_SIZE 4096</code>', 'Property của từng node: <code>reg</code>, <code>learn,offset-mdeg</code>…'],
        ['Hàm nạp làm gì', '<code>rd_init</code> dựng cả hai thiết bị', '<code>ts_init</code> chỉ <b>đăng ký</b> driver; chưa có thiết bị nào'],
        ['Khi nào thiết bị ra đời', 'Lúc <code>insmod</code>', 'Lúc driver core gọi <code>probe()</code> — có thể ngay, có thể rất lâu sau'],
        ['Gỡ một thiết bị riêng lẻ', 'Không thể', '<code>echo … &gt; unbind</code>, driver vẫn nạp cho các thiết bị khác'],
        ['Chuyển sang bo mạch khác', 'Sửa mã, build lại', 'Sửa Device Tree, driver giữ nguyên từng byte']
      ] },

    { t: 'p', x:
      'Dòng cuối là lý do cả mô hình này tồn tại. Bài 42 đã kể thời \"board file\": mỗi bo mạch một file C ' +
      'tự tay dựng hàng chục <code>platform_device</code>. Device Tree gỡ phần mô tả ra khỏi mã, nhưng ' +
      'chỉ có ích khi driver chịu <b>đọc</b> mô tả đó thay vì tự bịa. Bài 44 đã cho bạn thấy nửa phía ' +
      'kernel: cây → <code>of_platform_populate</code> → <code>platform_device</code> → so ' +
      '<code>compatible</code> → <code>probe()</code>. Bài này viết nửa còn lại: chính hàm ' +
      '<code>probe()</code> ấy.' },

    { t: 'h3', x: 'Platform bus: một bus không có dây' },

    { t: 'p', x:
      'USB, PCI và I2C là bus thật: có dây, có giao thức, và thiết bị tự giới thiệu mình (USB gửi mã hãng, ' +
      'PCI có thanh ghi ID). Kernel có thể dò. Nhưng bộ điều khiển UART, khối GPIO hay cảm biến nhiệt nằm ' +
      'thẳng trên đường bus bộ nhớ của SoC thì <b>câm</b>: đọc vào địa chỉ của nó chỉ ra giá trị thanh ' +
      'ghi, không có chỗ nào ghi \"tôi là cảm biến nhiệt\". Không dò được thì phải được <b>khai báo</b>.' },

    { t: 'p', x:
      'Linux gom mọi thiết bị câm đó vào một bus ảo tên <code>platform</code>. Nó không có dây nào; nó chỉ ' +
      'là một danh sách thiết bị (đến từ Device Tree, ACPI hoặc mã C) và một danh sách driver, cộng một ' +
      'hàm so khớp. Bạn nhìn thấy cả hai danh sách dưới <code>/sys/bus/platform/</code>: ' +
      '<code>devices/</code> và <code>drivers/</code>. Bài 45 đã đi qua thang ba tầng trên đúng thư mục ' +
      'này và dừng ở tầng 3 cho node cảm biến, vì chưa có ai trong <code>drivers/</code> nhận nó.' },

    { t: 'fig',
      cap: 'Hai con đường gặp nhau ở driver core. Bên trái, lúc boot, cây biến mỗi node <code>okay</code> ' +
           'thành một <code>platform_device</code> — có hay không có driver. Bên phải, lúc ' +
           '<code>insmod</code>, driver chỉ nộp một bảng chuỗi <code>compatible</code>. Driver core so hai ' +
           'danh sách và gọi <code>probe()</code> một lần <b>cho mỗi cặp khớp</b>. Thứ tự hai bên không ' +
           'quan trọng: ai đến sau thì lúc đó mới có lời gọi.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ platform bus: Device Tree sinh các platform_device lúc boot, module đăng ký platform_driver lúc insmod, driver core so compatible và gọi probe cho từng cặp khớp, mỗi lần probe tạo một thiết bị /dev/tsensorN">' +
        '<rect class="d-box" x="20" y="16" width="200" height="52" rx="6"/>' +
        '<text class="d-t" x="120" y="38" text-anchor="middle">Device Tree (board.dtb)</text>' +
        '<text class="d-ts" x="120" y="56" text-anchor="middle">lúc boot</text>' +
        '<rect class="d-box" x="500" y="16" width="200" height="52" rx="6"/>' +
        '<text class="d-t" x="600" y="38" text-anchor="middle">Module tsensor.ko</text>' +
        '<text class="d-ts" x="600" y="56" text-anchor="middle">lúc insmod</text>' +
        '<line class="d-line" x1="120" y1="68" x2="120" y2="92"/><path class="d-arrow" d="M 120 100 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="600" y1="68" x2="600" y2="92"/><path class="d-arrow" d="M 600 100 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-p" x="20" y="100" width="200" height="96" rx="6"/>' +
        '<text class="d-t" x="120" y="120" text-anchor="middle">platform_device</text>' +
        '<text class="d-tm" x="120" y="140" text-anchor="middle">b000000.sensor</text>' +
        '<text class="d-tm" x="120" y="156" text-anchor="middle">b002000.sensor</text>' +
        '<text class="d-tm" x="120" y="172" text-anchor="middle">b003000.sensor</text>' +
        '<text class="d-ts" x="120" y="188" text-anchor="middle">/sys/bus/platform/devices</text>' +
        '<rect class="d-box-p" x="500" y="100" width="200" height="96" rx="6"/>' +
        '<text class="d-t" x="600" y="120" text-anchor="middle">platform_driver</text>' +
        '<text class="d-tm" x="600" y="142" text-anchor="middle">.name = "tsensor"</text>' +
        '<text class="d-tm" x="600" y="160" text-anchor="middle">"learn,temp-sensor"</text>' +
        '<text class="d-ts" x="600" y="188" text-anchor="middle">/sys/bus/platform/drivers</text>' +
        '<line class="d-line" x1="220" y1="148" x2="272" y2="148"/><path class="d-arrow" d="M 280 148 l -8 -4 l 0 8 z"/>' +
        '<line class="d-line" x1="500" y1="148" x2="448" y2="148"/><path class="d-arrow" d="M 440 148 l 8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="280" y="116" width="160" height="64" rx="6"/>' +
        '<text class="d-t" x="360" y="140" text-anchor="middle">driver core</text>' +
        '<text class="d-ts" x="360" y="160" text-anchor="middle">so compatible</text>' +
        '<line class="d-line" x1="360" y1="180" x2="360" y2="212"/><path class="d-arrow" d="M 360 220 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-g" x="120" y="220" width="160" height="60" rx="6"/>' +
        '<text class="d-tm" x="200" y="244" text-anchor="middle">probe(b000000)</text>' +
        '<text class="d-tm" x="200" y="264" text-anchor="middle">→ /dev/tsensor0</text>' +
        '<rect class="d-box-w" x="296" y="220" width="128" height="60" rx="6"/>' +
        '<text class="d-tm" x="360" y="244" text-anchor="middle">probe(b002000)</text>' +
        '<text class="d-ts" x="360" y="264" text-anchor="middle">từ chối</text>' +
        '<rect class="d-box-g" x="440" y="220" width="160" height="60" rx="6"/>' +
        '<text class="d-tm" x="520" y="244" text-anchor="middle">probe(b003000)</text>' +
        '<text class="d-tm" x="520" y="264" text-anchor="middle">→ /dev/tsensor1</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao hàm nạp module không được tự tạo thiết bị',
      x: 'Nếu <code>ts_init</code> tự dựng <code>/dev/tsensor0</code>, module này chỉ đúng trên một bo mạch ' +
         'có đúng một cảm biến ở đúng một địa chỉ. Tách \"driver\" (mã biết <i>cách</i> nói chuyện với loại ' +
         'chip này) khỏi \"device\" (một con chip cụ thể, ở một địa chỉ cụ thể) cho phép cùng một ' +
         '<code>.ko</code> phục vụ không, một hay mười cảm biến. Bạn sẽ thấy điều đó ngay ở bước 3: một ' +
         'module, ba lời gọi <code>probe()</code>, ba kết quả khác nhau.' },

    /* ============================================================
       2. CẤU TRÚC MỘT PLATFORM DRIVER
       ============================================================ */
    { t: 'h2', x: 'Cấu trúc một platform driver' },

    { t: 'p', x:
      'Một platform driver là một biến <code>struct platform_driver</code> được nộp cho kernel. Kernel ' +
      '6.18 định nghĩa nó ở <code>include/linux/platform_device.h</code>, dòng 231. Bạn chỉ cần bốn ô:' },

    { t: 'code', where: 'file', name: '~/bai54/tsensor/tsensor.c — phần đăng ký', lang: 'c', code:
      'static const struct of_device_id ts_of_match[] = {\n' +
      '\t{ .compatible = "learn,temp-sensor" },\n' +
      '\t{ }\n' +
      '};\n' +
      'MODULE_DEVICE_TABLE(of, ts_of_match);\n' +
      '\n' +
      'static struct platform_driver ts_driver = {\n' +
      '\t.probe  = ts_probe,\n' +
      '\t.remove = ts_remove,\n' +
      '\t.driver = {\n' +
      '\t\t.name           = "tsensor",\n' +
      '\t\t.of_match_table = ts_of_match,\n' +
      '\t\t.dev_groups     = ts_groups,\n' +
      '\t},\n' +
      '};' },

    { t: 'table',
      head: ['Ô', 'Nghĩa', 'Ghi chú'],
      rows: [
        ['<code>of_match_table</code>', 'Danh sách chuỗi <code>compatible</code> driver nhận, kết thúc bằng một phần tử rỗng <code>{ }</code>.', 'Đúng bảng mà Bài 44 đã đọc trong mã của các driver có sẵn. Thiếu <code>{ }</code> cuối, kernel đọc tràn ra ngoài mảng.'],
        ['<code>MODULE_DEVICE_TABLE(of, …)</code>', 'Chép bảng đó vào <code>.modinfo</code> dưới dạng dòng <code>alias: of:N*T*C…</code>.', 'Để <code>modprobe</code>/udev tự nạp module khi thấy <code>MODALIAS</code> khớp (Bài 44, Bài 45). Không ảnh hưởng tới <code>insmod</code> bằng tay.'],
        ['<code>.probe</code>', 'Hàm được gọi <b>cho mỗi thiết bị</b> khớp. Trả 0 = nhận; trả lỗi = từ chối thiết bị đó.', 'Kiểu <code>int (*)(struct platform_device *)</code>.'],
        ['<code>.remove</code>', 'Hàm được gọi khi thiết bị bị tách khỏi driver: <code>unbind</code>, <code>rmmod</code>, thiết bị biến mất.', 'Kernel 6.18 khai báo nó trả <code>void</code> (dòng 233) — không được phép thất bại. Kernel cũ hơn trả <code>int</code>.'],
        ['<code>.driver.name</code>', 'Tên thư mục trong <code>/sys/bus/platform/drivers/</code> và tiền tố của mọi dòng <code>dev_info</code>.', 'Không cần trùng tên file <code>.ko</code>.'],
        ['<code>.driver.dev_groups</code>', 'Nhóm thuộc tính sysfs driver core tự tạo trên <b>mỗi thiết bị</b> sau khi <code>probe()</code> thành công, và tự xoá khi <code>remove</code>.', 'Bài 53 tự gọi <code>device_create_with_groups</code>; ở đây kernel làm hộ.']
      ] },

    { t: 'p', x:
      'Hàm nạp của module giờ chỉ còn một việc liên quan tới thiết bị: gọi ' +
      '<code>platform_driver_register(&amp;ts_driver)</code>. Nếu module không có tài nguyên chung nào ' +
      'khác, macro <code>module_platform_driver(ts_driver)</code> sinh sẵn cả <code>module_init</code> lẫn ' +
      '<code>module_exit</code> cho bạn (dòng 286 cùng file) — <code>leaky.c</code> ở bước 6 dùng đúng macro ' +
      'đó và dài có 42 dòng.' },

    { t: 'cal', kind: 'warn', title: 'remove() trả void trên kernel của bạn',
      x: 'Sách và bài viết cũ đều viết <code>static int foo_remove(…) { …; return 0; }</code>. Trên kernel ' +
         '6.18 của bạn, dòng đó không build được:<br>' +
         '<code>error: initialization of ‘void (*)(struct platform_device *)’ from incompatible pointer type ' +
         '‘int (*)(struct platform_device *)’</code><br>' +
         'Lý do thay đổi: driver core chưa bao giờ làm gì với giá trị trả về của <code>remove</code> — thiết ' +
         'bị vẫn bị tách dù hàm trả lỗi. Một giá trị không ai đọc chỉ khiến người viết tưởng mình có quyền ' +
         '\"từ chối gỡ\". Kiểu <code>void</code> nói thẳng sự thật đó.' },

    { t: 'h3', x: 'probe() là \"init cho một thiết bị\"' },

    { t: 'p', x:
      'Bài 50 dạy cặp <code>init</code>/<code>exit</code>: thứ gì <code>init</code> xin, <code>exit</code> ' +
      'trả, theo thứ tự ngược lại. Platform driver chuyển cặp đó xuống <b>từng thiết bị</b>: ' +
      '<code>probe</code> xin tài nguyên cho một cảm biến, <code>remove</code> trả tài nguyên của cảm biến ' +
      'đó. <code>module_init</code>/<code>module_exit</code> chỉ còn giữ những thứ dùng chung cho mọi thiết ' +
      'bị — với <code>tsensor</code> là dải số major/minor và lớp <code>/sys/class/tsensor</code>.' },

    { t: 'table',
      head: ['Hàm', 'Chạy khi nào', 'Chạy mấy lần', 'Xin gì trong tsensor'],
      rows: [
        ['<code>ts_init</code>', '<code>insmod</code>', 'Đúng 1', '<code>alloc_chrdev_region</code> (4 minor), <code>class_create</code>, <code>platform_driver_register</code>'],
        ['<code>ts_probe</code>', 'Mỗi lần driver core ghép một thiết bị với driver', '0, 1 hay nhiều — bằng số node khớp, cộng mỗi lần <code>bind</code> lại', '<code>struct ts_dev</code>, vùng địa chỉ, GPIO, một số minor, một <code>cdev</code>, một node <code>/dev</code>'],
        ['<code>ts_remove</code>', 'Mỗi lần một thiết bị bị tách', 'Bằng số lần <code>probe</code> thành công', 'Không trả gì bằng tay — xem phần devres'],
        ['<code>ts_exit</code>', '<code>rmmod</code>', 'Đúng 1', '<code>platform_driver_unregister</code> (kéo theo <code>remove</code> cho mọi thiết bị), rồi trả hai thứ của <code>ts_init</code>']
      ] },

    { t: 'cal', kind: 'tip', title: 'Câu cần nhớ',
      x: '<b>Module = một lần. Thiết bị = mỗi lần.</b> Mọi thứ gắn với một con chip cụ thể — bộ nhớ, địa ' +
         'chỉ, chân GPIO, node <code>/dev</code> — thuộc về <code>probe</code>. Đặt nó vào ' +
         '<code>module_init</code> là lỗi thiết kế, dù bo mạch hôm nay chỉ có một con chip.' },

    /* ============================================================
       3. ĐỌC DEVICE TREE TỪ TRONG PROBE
       ============================================================ */
    { t: 'h2', x: 'Đọc Device Tree từ trong probe()' },

    { t: 'p', x:
      'Khi <code>probe()</code> được gọi, nó nhận một <code>struct platform_device *pdev</code>. Bên trong ' +
      'có hai thứ bạn cần: <code>pdev-&gt;dev</code> — \"thiết bị\" theo nghĩa của driver core, thứ mọi hàm ' +
      '<code>dev_*</code> và <code>devm_*</code> nhận làm tham số đầu — và <code>pdev-&gt;dev.of_node</code>, ' +
      'con trỏ tới đúng node trong cây đã sinh ra thiết bị này. Từ node đó, driver đọc mọi thứ nó cần.' },

    { t: 'h3', x: 'reg đã được dịch sẵn thành resource' },

    { t: 'p', x:
      'Property <code>reg</code> không cần đọc bằng tay. Lúc boot, <code>of_device_alloc()</code> ' +
      '(<code>drivers/of/platform.c</code>, dòng 97–123) đã đếm số cặp địa chỉ/kích thước, áp ' +
      '<code>#address-cells</code>/<code>#size-cells</code> và <code>ranges</code> của các node cha (Bài 43), ' +
      'rồi đổi mỗi cặp thành một <code>struct resource</code> gắn vào <code>pdev</code>. Driver chỉ việc ' +
      'xin cái thứ 0:' },

    { t: 'code', where: 'file', name: 'lấy vùng địa chỉ', lang: 'c', code:
      'res = platform_get_resource(pdev, IORESOURCE_MEM, 0);\n' +
      'if (!res)\n' +
      '\treturn -EINVAL;\n' +
      'if (!devm_request_mem_region(dev, res->start, resource_size(res),\n' +
      '\t\t\t     dev_name(dev)))\n' +
      '\treturn -EBUSY;' },

    { t: 'p', x:
      'Với node <code>reg = &lt;0x00 0xb000000 0x00 0x1000&gt;</code>, <code>res-&gt;start</code> là ' +
      '<code>0xb000000</code>, <code>res-&gt;end</code> là <code>0xb000fff</code>. Dòng thứ hai <b>đặt chỗ</b> ' +
      'vùng đó trong bảng <code>/proc/iomem</code>: nếu một driver khác đã giữ nó, bạn nhận ' +
      '<code>-EBUSY</code> thay vì hai driver âm thầm ghi đè thanh ghi của nhau. Đặt chỗ <i>chưa</i> phải là ' +
      'truy cập — ánh xạ vùng đó để <code>readl</code>/<code>writel</code> là việc của Bài 56. Ở bài này ' +
      'địa chỉ <code>0xb000000</code> không có phần cứng nào trả lời, nên driver chỉ đặt chỗ, không đọc.' },

    { t: 'h3', x: 'Ba loại property, ba cách xử lý' },

    { t: 'p', x:
      'Mọi property khác được đọc bằng họ hàm <code>of_property_read_*</code> trong ' +
      '<code>include/linux/of.h</code>. Chúng cùng một khuôn: nhận node, tên property, địa chỉ biến đích; ' +
      'trả 0 nếu thành công và <b>không đụng tới biến đích</b> nếu thất bại. Mã lỗi cho biết vì sao — ' +
      '<code>of_find_property_value_of_size()</code> (<code>drivers/of/property.c</code>, dòng 130–148) chỉ ' +
      'có ba nhánh:' },

    { t: 'table',
      head: ['Trả về', 'Nghĩa', 'Ví dụ trong board.dts'],
      rows: [
        ['<code>0</code>', 'Có property, đủ độ dài, đã đọc.', '<code>learn,offset-mdeg = &lt;42500&gt;</code>'],
        ['<code>-EINVAL</code> (22)', 'Không có property này trong node.', 'Node <code>sensor@b002000</code> không khai <code>learn,offset-mdeg</code>'],
        ['<code>-ENODATA</code> (61)', 'Có tên nhưng không có giá trị (kiểu boolean).', '<code>gpio-controller;</code>'],
        ['<code>-EOVERFLOW</code> (75)', 'Có giá trị nhưng ngắn hơn (hoặc dài hơn) số byte driver đòi.', '<code>learn,trip-mdeg = &lt;65000&gt;</code> khi driver đòi 2 ô']
      ] },

    { t: 'p', x:
      'Nhờ ba mã đó, driver xử lý được đúng ba loại property mà mọi binding thật đều có. Đây là đoạn giữa ' +
      'của <code>ts_probe</code>:' },

    { t: 'code', where: 'file', name: 'đọc property: bắt buộc, tuỳ chọn, tuỳ chọn nhưng phải đúng hình', lang: 'c', code:
      '/* required: no sensible default exists */\n' +
      'ret = of_property_read_u32(np, "learn,offset-mdeg", &ts->offset_mdeg);\n' +
      'if (ret)\n' +
      '\treturn dev_err_probe(dev, ret, "learn,offset-mdeg missing\\n");\n' +
      '\n' +
      '/* optional: preset the default, then let DT override it */\n' +
      'ts->label = np->name;\n' +
      'of_property_read_string(np, "label", &ts->label);\n' +
      'ts->poll_ms = 1000;\n' +
      'of_property_read_u32(np, "learn,poll-ms", &ts->poll_ms);\n' +
      '\n' +
      '/* optional, but malformed is an error: tell the two apart */\n' +
      'ret = of_property_read_u32_array(np, "learn,trip-mdeg", ts->trip_mdeg, 2);\n' +
      'if (ret == -EINVAL) {\n' +
      '\tts->trip_mdeg[0] = 70000;\n' +
      '\tts->trip_mdeg[1] = 90000;\n' +
      '} else if (ret) {\n' +
      '\treturn dev_err_probe(dev, ret, "learn,trip-mdeg needs 2 cells\\n");\n' +
      '}' },

    { t: 'table',
      head: ['Loại', 'Mẫu viết', 'Vì sao'],
      rows: [
        ['<b>Bắt buộc</b>', 'Đọc; lỗi nào cũng trả lỗi đó ra khỏi <code>probe</code>.', 'Không có giá trị mặc định hợp lý. Một cảm biến không biết độ lệch hiệu chuẩn thì mọi con số nó báo đều sai — từ chối còn hơn báo sai.'],
        ['<b>Tuỳ chọn</b>', 'Gán mặc định <i>trước</i>, rồi đọc và <b>bỏ qua</b> giá trị trả về.', 'Hàm không đụng biến đích khi thất bại, nên mặc định còn nguyên nếu node không khai. Hai dòng, không cần <code>if</code>.'],
        ['<b>Tuỳ chọn nhưng phải đúng hình</b>', 'Chỉ <code>-EINVAL</code> mới được dùng mặc định; mọi lỗi khác là lỗi.', 'Người viết cây đã <i>cố</i> khai nhưng khai sai (thiếu một ô). Lặng lẽ dùng mặc định sẽ giấu lỗi của họ tới tận lúc thiết bị quá nhiệt.']
      ] },

    { t: 'terms', items: [
      ['<code>mdeg</code>', 'milli-degree', 'Phần nghìn độ C. <code>42500</code> = 42,5 °C. Bài 51 đã giải thích vì sao kernel không dùng số thực; hwmon, khung chuẩn cho cảm biến nhiệt, cũng báo nhiệt độ theo đơn vị này.'],
      ['Tiền tố hãng', 'vendor prefix', 'Phần trước dấu phẩy trong <code>learn,offset-mdeg</code>. Property riêng của một binding phải mang tiền tố hãng để không đụng tên với property chuẩn như <code>reg</code>, <code>label</code>, <code>status</code> (Bài 44).'],
      ['<code>dev_err_probe</code>', '—', 'In lỗi kèm tên thiết bị rồi trả lại đúng mã lỗi, gói hai dòng thành một. Với <code>-EPROBE_DEFER</code> nó <b>không</b> in ra console mà ghi lý do vào danh sách chờ — phần 5 sẽ dùng chính tính năng này.']
    ] },

    { t: 'cal', kind: 'info', title: 'Nhìn property ở dạng thô trước khi driver đọc',
      x: 'Mỗi property trong cây đang chạy là một file dưới <code>/proc/device-tree/</code> (Bài 42). ' +
         'Ô <code>&lt;42500&gt;</code> được lưu thành 4 byte big-endian: <code>42500</code> = ' +
         '<code>0x0000a604</code>, nên <code>od -An -tx1 /proc/device-tree/sensor@b000000/learn,offset-mdeg</code> ' +
         'ở bước 3 in ra <code>00 00 a6 04</code>. <code>of_property_read_u32</code> làm đúng một việc: đọc ' +
         '4 byte đó và đảo về thứ tự của CPU (ARM64 là little-endian).' },

    /* ============================================================
       4. DEVRES
       ============================================================ */
    { t: 'h2', x: 'devres: để kernel trả hộ' },

    { t: 'p', x:
      'Mở lại <code>rd_init</code> của Bài 53. Nó xin sáu loại tài nguyên và có hai nhãn <code>goto</code>, ' +
      'một hàm phụ <code>rd_teardown</code>, và ba chỗ tự tay dọn dở dang giữa vòng lặp. Trong ' +
      '<code>~/bai53/ramdisk/ramdisk.c</code>, <code>grep -c</code> đếm được <b>3</b> dòng <code>kfree</code>, ' +
      '<b>2</b> dòng <code>cdev_del</code>, <b>5</b> dòng <code>goto err</code>. Mỗi dòng là một cơ hội viết ' +
      'sai thứ tự, hoặc quên. Và mỗi đường lỗi gần như không bao giờ được chạy thử — chúng chỉ chạy khi ' +
      'có chuyện, tức là đúng lúc bạn ít muốn thêm một lỗi thứ hai nhất.' },

    { t: 'p', x:
      '<b>devres</b> (<i>device resource management</i>) gỡ toàn bộ gánh nặng đó. Mỗi <code>struct device</code> ' +
      'mang theo một danh sách <code>devres_head</code>. Mỗi hàm <code>devm_*</code> làm hai việc: xin tài ' +
      'nguyên như bản thường, rồi <b>ghi một mục vào danh sách đó</b> gồm con trỏ tới tài nguyên và hàm để ' +
      'trả nó. Khi thiết bị bị tách khỏi driver — dù vì <code>probe</code> trả lỗi, <code>unbind</code> hay ' +
      '<code>rmmod</code> — driver core gọi <code>devres_release_all()</code>, đi danh sách <b>từ cuối lên ' +
      'đầu</b> và gọi từng hàm trả.' },

    { t: 'fig',
      cap: 'devres là một ngăn xếp gắn vào từng thiết bị. Mỗi <code>devm_*</code> thành công đẩy thêm một ' +
           'mục lên trên cùng. Khi thiết bị bị tách, <code>release_nodes()</code> ' +
           '(<code>drivers/base/devres.c</code>, dòng 496) lấy ra từ trên xuống bằng ' +
           '<code>list_for_each_entry_safe_reverse</code>: thứ xin sau cùng được trả trước tiên, đúng thứ ' +
           'tự ngược mà Bài 50 bắt bạn tự nhớ.',
      svg:
        '<svg viewBox="0 0 720 312" width="720" role="img" aria-label="Ngăn xếp devres của thiết bị b000000.sensor: sáu mục được đẩy lần lượt trong probe từ kzalloc đến device_create, rồi được giải phóng theo thứ tự ngược từ device_destroy về kfree khi thiết bị bị tách">' +
        '<text class="d-t" x="170" y="22" text-anchor="middle">probe(): xin, đẩy lên</text>' +
        '<text class="d-t" x="550" y="22" text-anchor="middle">tách thiết bị: trả, lấy xuống</text>' +
        '<rect class="d-box-a" x="250" y="40" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="63" text-anchor="middle">6  device_destroy (action)</text>' +
        '<rect class="d-box-a" x="250" y="80" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="103" text-anchor="middle">5  cdev_del (action)</text>' +
        '<rect class="d-box-a" x="250" y="120" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="143" text-anchor="middle">4  ida_free (action)</text>' +
        '<rect class="d-box" x="250" y="160" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="183" text-anchor="middle">3  gpiod_put (nếu có GPIO)</text>' +
        '<rect class="d-box" x="250" y="200" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="223" text-anchor="middle">2  release_mem_region</text>' +
        '<rect class="d-box" x="250" y="240" width="220" height="36" rx="4"/>' +
        '<text class="d-tm" x="360" y="263" text-anchor="middle">1  kfree(struct ts_dev)</text>' +
        '<text class="d-ts" x="360" y="298" text-anchor="middle">dev-&gt;devres_head của b000000.sensor</text>' +
        '<line class="d-line" x1="170" y1="270" x2="170" y2="54"/><path class="d-arrow" d="M 170 46 l -4 8 l 8 0 z"/>' +
        '<line class="d-line" x1="170" y1="58" x2="242" y2="58"/>' +
        '<text class="d-ts" x="160" y="150" text-anchor="end">thứ tự xin</text>' +
        '<text class="d-ts" x="160" y="166" text-anchor="end">1 → 6</text>' +
        '<line class="d-line" x1="550" y1="54" x2="550" y2="262"/><path class="d-arrow" d="M 550 270 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="478" y1="58" x2="550" y2="58"/>' +
        '<text class="d-ts" x="560" y="150">thứ tự trả</text>' +
        '<text class="d-ts" x="560" y="166">6 → 1</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Bản thường', 'Bản devm_', 'Tự trả bằng'],
      rows: [
        ['<code>kzalloc(size, gfp)</code>', '<code>devm_kzalloc(dev, size, gfp)</code>', '<code>kfree</code>'],
        ['<code>request_mem_region(…)</code>', '<code>devm_request_mem_region(dev, …)</code>', '<code>release_mem_region</code>'],
        ['<code>gpiod_get_optional(…)</code>', '<code>devm_gpiod_get_optional(dev, …)</code>', '<code>gpiod_put</code>'],
        ['<code>ioremap</code> (Bài 56)', '<code>devm_ioremap_resource</code>', '<code>iounmap</code>'],
        ['<code>request_irq</code> (Bài 55)', '<code>devm_request_irq</code>', '<code>free_irq</code>'],
        ['<i>bất kỳ hàm nào không có bản devm_</i>', '<code>devm_add_action_or_reset(dev, fn, data)</code>', 'Hàm <code>fn(data)</code> của chính bạn']
      ] },

    { t: 'p', x:
      'Dòng cuối là mảnh ghép còn thiếu. <code>cdev_add</code>, <code>device_create</code> và ' +
      '<code>ida_alloc</code> không có bản <code>devm_</code>. Thay vì quay lại với <code>goto</code>, bạn tự ' +
      'viết một hàm \"hoàn tác\" nhỏ và đăng ký nó ngay sau khi xin thành công:' },

    { t: 'code', where: 'file', name: 'một tài nguyên không có bản devm_', lang: 'c', code:
      'static void ts_del_cdev(void *data)\n' +
      '{\n' +
      '\tstruct ts_dev *ts = data;\n' +
      '\n' +
      '\tdev_dbg(ts->dev, "devres: cdev_del\\n");\n' +
      '\tcdev_del(&ts->cdev);\n' +
      '}\n' +
      '\n' +
      '/* ... trong ts_probe(): */\n' +
      'cdev_init(&ts->cdev, &ts_fops);\n' +
      'ret = cdev_add(&ts->cdev, MKDEV(MAJOR(ts_base), ts->minor), 1);\n' +
      'if (ret)\n' +
      '\treturn ret;\n' +
      'ret = devm_add_action_or_reset(dev, ts_del_cdev, ts);\n' +
      'if (ret)\n' +
      '\treturn ret;' },

    { t: 'cal', kind: 'why', title: 'Vì sao là \"_or_reset\"',
      x: 'Bản thân <code>devm_add_action_or_reset</code> cũng xin bộ nhớ (một mục trong danh sách), nên nó ' +
         'cũng có thể thất bại. Nếu thất bại, <code>cdev</code> đã được thêm mà chưa ai hứa sẽ xoá. Hậu tố ' +
         '<code>_or_reset</code> (<code>include/linux/device/devres.h</code>, dòng 156–168) nghĩa là: \"nếu ' +
         'không đăng ký được, gọi <code>ts_del_cdev</code> ngay bây giờ rồi mới trả lỗi\". Nhờ vậy sau mỗi ' +
         'dòng <code>return ret;</code> trong <code>probe</code>, mọi thứ đã xin đều có người trả — không ' +
         'ngoại lệ, không nhãn <code>goto</code>.' },

    { t: 'p', x:
      'Kết quả đếm được trên <code>ts_probe</code> (80 dòng, dòng 102–181): <b>0</b> <code>kfree</code>, ' +
      '<b>0</b> <code>cdev_del</code>, <b>0</b> <code>device_destroy</code>, <b>0</b> <code>goto</code> — và ' +
      '<b>13</b> dòng <code>return</code>, mỗi dòng đều an toàn. Hàm <code>ts_remove</code> chỉ còn một ' +
      'dòng <code>dev_info</code>; toàn bộ việc trả nằm trong ba hàm hoàn tác nhỏ mà driver core gọi hộ.' },

    { t: 'cal', kind: 'danger', title: 'Hai chỗ devres KHÔNG cứu được bạn',
      x: '<ul>' +
         '<li><b>Tài nguyên của cả module.</b> <code>alloc_chrdev_region</code> và <code>class_create</code> ' +
         'trong <code>ts_init</code> không thuộc về thiết bị nào, nên không có <code>dev</code> nào để gắn ' +
         'vào. Chúng vẫn phải được trả bằng tay trong <code>ts_exit</code>, và <code>ts_init</code> vẫn có hai ' +
         'nhãn <code>goto</code>. devres là quản lý tài nguyên <i>theo thiết bị</i>.</li>' +
         '<li><b>Trộn devm_ với bản thường sai thứ tự.</b> Nếu bạn xin A bằng <code>devm_</code>, rồi B bằng ' +
         'bản thường và tự trả B trong <code>remove</code>, thì <code>remove</code> chạy <i>trước</i> ' +
         'devres: B bị trả trước A dù A được xin trước. Nếu B dùng A, đó là lỗi. Quy tắc đơn giản: từ ' +
         'lúc bắt đầu dùng <code>devm_</code> trong <code>probe</code>, dùng nó cho mọi thứ còn lại.</li>' +
         '</ul>' },

    /* ============================================================
       5. DEFERRED PROBE
       ============================================================ */
    { t: 'h2', x: 'Deferred probe: khi thứ bạn cần chưa có' },

    { t: 'p', x:
      'Một cảm biến thật thường cần thứ khác mới chạy được: một chân GPIO để bật nguồn, một đồng hồ, một ' +
      'bộ nguồn. Mỗi thứ đó do một driver <i>khác</i> cung cấp — trong ngôn ngữ của kernel, driver kia là ' +
      '<b>nhà cung cấp</b> (<i>supplier</i>) và cảm biến là <b>người dùng</b> (<i>consumer</i>). Không có ' +
      'gì bảo đảm nhà cung cấp lên trước: nó có thể là một module chưa nạp, hoặc chỉ đơn giản là có tên ' +
      'đứng sau trong thứ tự khởi tạo.' },

    { t: 'p', x:
      'Linux giải quyết bằng một mã lỗi đặc biệt: <code>-EPROBE_DEFER</code> (517). Trả nó từ ' +
      '<code>probe</code> nghĩa là \"tôi không hỏng, tôi chỉ đến sớm quá — gọi lại tôi sau\". Driver core ' +
      'khi đó <b>không</b> in <code>probe … failed</code> mà đưa thiết bị vào ' +
      '<code>deferred_probe_pending_list</code> (Bài 44 đã chỉ ra dòng khai báo nó), và thử lại toàn bộ ' +
      'danh sách <b>mỗi khi có một driver bất kỳ bind thành công</b>. Bạn không cần viết vòng thử lại nào.' },

    { t: 'p', x:
      'Bạn gần như không bao giờ tự gõ <code>return -EPROBE_DEFER</code>. Các hàm lấy tài nguyên của ' +
      'driver khác trả nó hộ bạn. Trong <code>tsensor</code>:' },

    { t: 'code', where: 'file', name: 'nhà cung cấp tuỳ chọn', lang: 'c', code:
      '/* absent -> NULL; provider not bound yet -> -EPROBE_DEFER */\n' +
      'ts->enable = devm_gpiod_get_optional(dev, "enable", GPIOD_OUT_HIGH);\n' +
      'if (IS_ERR(ts->enable))\n' +
      '\treturn dev_err_probe(dev, PTR_ERR(ts->enable), "enable gpio\\n");' },

    { t: 'table',
      head: ['Node khai gì', '<code>devm_gpiod_get_optional</code> trả', 'probe làm gì'],
      rows: [
        ['Không có <code>enable-gpios</code>', '<code>NULL</code>', 'Chạy tiếp, không có GPIO (<code>gpio no</code> trong log)'],
        ['<code>enable-gpios</code> trỏ tới bộ GPIO <b>đã</b> có driver', 'Con trỏ hợp lệ, chân đã đặt mức cao', 'Chạy tiếp (<code>gpio yes</code>)'],
        ['<code>enable-gpios</code> trỏ tới bộ GPIO <b>chưa</b> có driver', '<code>ERR_PTR(-EPROBE_DEFER)</code>', 'Trả nguyên mã đó; <code>dev_err_probe</code> ghi lý do <code>enable gpio</code> vào danh sách chờ']
      ] },

    { t: 'p', x:
      'Để thấy điều đó trên QEMU, bài dùng một nhà cung cấp GPIO có sẵn trong kernel nhưng được build ' +
      'thành <b>module</b>: <code>gpio-aggregator.ko</code> (<code>CONFIG_GPIO_AGGREGATOR=m</code>), driver ' +
      'của <code>compatible = "gpio-delay"</code>. Node <code>gpio-delay</code> trong cây lấy chân 1 của ' +
      'PL061 và cho ra một bộ GPIO mới có 1 chân; cảm biến <code>sensor@b003000</code> xin chân 0 của bộ đó. ' +
      'Chừng nào bạn chưa <code>insmod /gpio-aggregator.ko</code>, bộ GPIO đó chưa tồn tại — đúng tình ' +
      'huống một driver phụ thuộc vào module chưa nạp.' },

    { t: 'fig',
      cap: 'Thiết bị đứng trong hàng chờ cho tới khi nhà cung cấp bind. Hàng rào thứ nhất là ' +
           '<b>fw_devlink</b>: lúc boot kernel đã đọc <code>enable-gpios = &lt;&amp;gpio_delay …&gt;</code> ' +
           'và nối sẵn một liên kết \"b003000.sensor cần gpio-delay\", nên nó chặn cảm biến ngay cả trước khi ' +
           '<code>probe()</code> chạy. Sau 10 giây kể từ cuối quá trình boot, kernel nới lỏng liên kết đó; từ ' +
           'lúc ấy chính <code>probe()</code> chạy và nhận <code>-EPROBE_DEFER</code> từ ' +
           '<code>devm_gpiod_get_optional</code>. Hai đường, cùng một kết cục: chờ.',
      svg:
        '<svg viewBox="0 0 720 262" width="720" role="img" aria-label="Luồng deferred probe: insmod tsensor, driver core kiểm tra liên kết nhà cung cấp, nếu gpio-delay chưa bind thì đưa b003000.sensor vào danh sách chờ; khi insmod gpio-aggregator làm gpio-delay bind, driver core thử lại danh sách chờ và probe thành công">' +
        '<rect class="d-box" x="20" y="20" width="160" height="48" rx="6"/>' +
        '<text class="d-tm" x="100" y="49" text-anchor="middle">insmod tsensor.ko</text>' +
        '<line class="d-line" x1="180" y1="44" x2="222" y2="44"/><path class="d-arrow" d="M 230 44 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="230" y="14" width="200" height="60" rx="6"/>' +
        '<text class="d-t" x="330" y="38" text-anchor="middle">gpio-delay đã bind?</text>' +
        '<text class="d-ts" x="330" y="58" text-anchor="middle">fw_devlink, rồi gpiod_get</text>' +
        '<line class="d-line" x1="430" y1="44" x2="482" y2="44"/><path class="d-arrow" d="M 490 44 l -8 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="456" y="36" text-anchor="middle">có</text>' +
        '<rect class="d-box-g" x="490" y="20" width="210" height="48" rx="6"/>' +
        '<text class="d-tm" x="595" y="49" text-anchor="middle">probe OK → /dev/tsensor1</text>' +
        '<line class="d-line" x1="330" y1="74" x2="330" y2="112"/><path class="d-arrow" d="M 330 120 l -4 -8 l 8 0 z"/>' +
        '<text class="d-ts" x="342" y="100">chưa: -EPROBE_DEFER</text>' +
        '<rect class="d-box-w" x="200" y="120" width="260" height="60" rx="6"/>' +
        '<text class="d-t" x="330" y="144" text-anchor="middle">deferred_probe_pending_list</text>' +
        '<text class="d-tm" x="330" y="164" text-anchor="middle">…/debug/devices_deferred</text>' +
        '<rect class="d-box" x="20" y="196" width="220" height="48" rx="6"/>' +
        '<text class="d-tm" x="130" y="225" text-anchor="middle">insmod gpio-aggregator.ko</text>' +
        '<line class="d-line" x1="240" y1="220" x2="292" y2="220"/><path class="d-arrow" d="M 300 220 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="300" y="196" width="200" height="48" rx="6"/>' +
        '<text class="d-t" x="400" y="225" text-anchor="middle">gpio-delay bind xong</text>' +
        '<line class="d-line" x1="500" y1="220" x2="595" y2="220"/>' +
        '<line class="d-line" x1="595" y1="220" x2="595" y2="76"/><path class="d-arrow" d="M 595 68 l -4 8 l 8 0 z"/>' +
        '<text class="d-ts" x="605" y="150">thử lại cả</text>' +
        '<text class="d-ts" x="605" y="166">danh sách chờ</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Hai lý do khác nhau trong cùng một danh sách',
      x: 'Vì hai hàng rào ở hình trên, <code>/sys/kernel/debug/devices_deferred</code> có thể in một trong ' +
         'hai dòng cho cùng một thiết bị, tuỳ lúc bạn <code>insmod</code>:<ul>' +
         '<li><code>platform: supplier gpio-delay not ready</code> — fw_devlink chặn, <code>probe()</code> ' +
         'của bạn <b>chưa chạy lần nào</b>. Chữ <code>platform:</code> là tên bus, vì driver core ghi lý do ' +
         'thay bạn (<code>drivers/base/core.c</code>, dòng 1162).</li>' +
         '<li><code>tsensor: enable gpio</code> — <code>probe()</code> <b>đã chạy</b> và trả ' +
         '<code>-EPROBE_DEFER</code>. Chữ <code>tsensor:</code> là tên driver của bạn, và phần sau là đúng ' +
         'chuỗi bạn đưa cho <code>dev_err_probe</code>.</li></ul>' +
         'Mốc chuyển là <code>driver_deferred_probe_timeout = 10</code> giây (<code>drivers/base/dd.c</code>, ' +
         'dòng 261). Bước 4 sẽ cho bạn thấy cả hai, bằng cách <code>insmod</code> trước và sau mốc đó.' },

    { t: 'cal', kind: 'warn', title: 'Đừng in lỗi ầm ĩ cho -EPROBE_DEFER',
      x: 'Một thiết bị có thể bị hoãn hàng chục lần trong một lần boot. Nếu mỗi lần <code>probe</code> in ' +
         '<code>dev_err(…, "failed to get gpio")</code>, log sẽ đầy những \"lỗi\" không phải lỗi, và người đọc ' +
         'sẽ đi tìm nhầm chỗ. <code>dev_err_probe</code> tồn tại chính để tránh điều đó: với ' +
         '<code>-EPROBE_DEFER</code> nó chỉ in ở mức debug (<code>drivers/base/core.c</code>, dòng 5091–5093) ' +
         'và cất lý do cho <code>devices_deferred</code>; với mọi mã khác nó in <code>dev_err</code>.' },

    /* ============================================================
       6. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: driver cho cảm biến của Bài 45' },

    { t: 'p', x:
      'Bạn làm việc trong <code>~/bai54</code>. Bài dùng lại ba thứ đã có: kernel đã build ở ' +
      '<code>~/bai38/linux-6.18.45</code>, initramfs của Bài 32 ở <code>~/bai32/initramfs</code>, và ' +
      '<code>Makefile</code> của Bài 53 ở <code>~/bai53/ramdisk</code>. Cả ba chỉ được <b>đọc</b>, không ' +
      'bị sửa. Module <code>gpio-aggregator.ko</code> lấy từ <code>~/bai40/modroot-stripped</code> mà Bài 40 ' +
      'đã cài.' },

    { t: 'cal', kind: 'info', title: 'Vì sao dựng lại cây thay vì dùng board.dts của Bài 45',
      x: 'Bài 45 cho phép xoá <code>~/bai45</code> khi xong. Dù bạn còn giữ nó, cây ở đó có node ' +
         '<code>leds</code> và <code>bootargs</code> chẳng liên quan tới bài này, lại thiếu ba thứ bài này ' +
         'cần: property riêng của cảm biến, một node thiếu property, và một nhà cung cấp GPIO nạp sau. ' +
         'Bước 1 dựng một cây mới theo đúng quy trình Bài 45 đã dạy — <code>dumpdtb</code> → dịch ngược → ' +
         'sửa → dịch lại — nhưng chỉ tốn vài lệnh.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Dựng cây có bốn cảm biến và một nhà cung cấp GPIO',
        blocks: [
          { t: 'p', x:
            'Xin QEMU cây của chính nó, với đúng dòng lệnh sẽ boot ở các bước sau (Bài 36, Bài 45: cây phụ ' +
            'thuộc vào cả dòng lệnh), rồi dịch ngược ra văn bản:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai54 && cd ~/bai54\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -machine dumpdtb=virt.dtb\n' +
            'dtc -q -I dtb -O dts -o virt.dts virt.dtb\n' +
            'ls -l virt.dtb virt.dts\n' +
            'wc -l virt.dts\n' +
            'grep -n \'pl061@9030000\' virt.dts\n' +
            'tail -n 3 virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 1048576 Sep 30 10:56 virt.dtb\n' +
            '-rw-r--r-- 1 cah8hc cah8hc    8799 Sep 30 10:56 virt.dts\n' +
            '376 virt.dts\n' +
            '273:\tpl061@9030000 {\n' +
            '\t\tstdout-path = "/pl011@9000000";\n' +
            '\t};\n' +
            '};',
            notes: ['Ngày giờ và tên người dùng sẽ khác trên máy bạn. <code>dumpdtb</code> in không gì ra terminal và thoát ngay, không boot.'] },

          { t: 'p', x:
            'Ba con số đáng kiểm: <code>virt.dtb</code> đúng <b>1 048 576</b> byte (1 MiB đệm của QEMU mà ' +
            'Bài 45 đã giải thích — file này chỉ để <b>đọc</b>, không bao giờ nạp thẳng); ' +
            '<code>virt.dts</code> <b>376</b> dòng, khác 383 dòng của Bài 45 vì hai cờ: lần này không có ' +
            '<code>-smp 2</code> (mất node <code>cpu@1</code>, 8 dòng) nhưng có <code>-append</code> (thêm dòng ' +
            '<code>bootargs</code>); và node GPIO PL061 ở <b>dòng ' +
            '273</b>, chưa có label. Ba dòng cuối là đuôi node <code>chosen</code> và dấu <code>};</code> ' +
            'đóng gốc — node mới phải chen vào <b>trước</b> dấu cuối cùng này.' },

          { t: 'p', x:
            'Viết các node mới vào một file riêng. Tách ra như vậy để bạn đọc được chúng một mình, và để ' +
            'lệnh ghép ở dưới làm đúng việc mà Bài 45 bắt bạn làm bằng <code>nano</code>:' },

          { t: 'code', where: 'file', name: '~/bai54/nodes.dts', lang: 'text', code:
            '	gpio_delay: gpio-delay {\n' +
            '		compatible = "gpio-delay";\n' +
            '		#gpio-cells = <3>;\n' +
            '		gpio-controller;\n' +
            '		gpios = <&gpio0 1 0>;\n' +
            '	};\n' +
            '\n' +
            '	sensor@b000000 {\n' +
            '		compatible = "learn,temp-sensor";\n' +
            '		reg = <0x00 0xb000000 0x00 0x1000>;\n' +
            '		label = "board";\n' +
            '		learn,offset-mdeg = <42500>;\n' +
            '		learn,trip-mdeg = <60000 85000>;\n' +
            '	};\n' +
            '\n' +
            '	sensor@b001000 {\n' +
            '		compatible = "learn,temp-sensor";\n' +
            '		reg = <0x00 0xb001000 0x00 0x1000>;\n' +
            '		status = "disabled";\n' +
            '	};\n' +
            '\n' +
            '	sensor@b002000 {\n' +
            '		compatible = "learn,temp-sensor";\n' +
            '		reg = <0x00 0xb002000 0x00 0x1000>;\n' +
            '		label = "broken";\n' +
            '	};\n' +
            '\n' +
            '	sensor@b003000 {\n' +
            '		compatible = "learn,temp-sensor";\n' +
            '		reg = <0x00 0xb003000 0x00 0x1000>;\n' +
            '		label = "gated";\n' +
            '		learn,offset-mdeg = <38000>;\n' +
            '		learn,poll-ms = <250>;\n' +
            '		enable-gpios = <&gpio_delay 0 0 0>;\n' +
            '	};' },

          { t: 'table',
            head: ['Node', 'Được viết để thấy gì'],
            rows: [
              ['<code>gpio_delay: gpio-delay</code>', 'Một <b>nhà cung cấp</b> GPIO có driver trong kernel nhưng ở dạng module. Nó lấy chân 1 của PL061 (<code>&lt;&amp;gpio0 1 0&gt;</code>) và cho ra một bộ GPIO mới; <code>#gpio-cells = &lt;3&gt;</code> theo binding <code>gpio-delay.yaml</code> (chân, độ trễ lên, độ trễ xuống, tính bằng µs). Chân 1 được chọn vì Bài 45 đã chỉ ra chân 3 thuộc về <code>gpio-keys</code>.'],
              ['<code>sensor@b000000</code>', 'Trường hợp bình thường: đủ property bắt buộc, có <code>label</code> và <code>learn,trip-mdeg</code> hai ô, không có GPIO.'],
              ['<code>sensor@b001000</code>', '<code>status = "disabled"</code>, giống hệt Bài 45. Bạn sẽ xác nhận <code>probe()</code> không được gọi lần nào cho nó.'],
              ['<code>sensor@b002000</code>', 'Thiếu <code>learn,offset-mdeg</code> — property bắt buộc. <code>probe()</code> phải từ chối.'],
              ['<code>sensor@b003000</code>', 'Có <code>learn,poll-ms</code> nhưng <b>không</b> có <code>learn,trip-mdeg</code> (để thấy giá trị mặc định), và <code>enable-gpios</code> trỏ vào <code>gpio_delay</code> — thứ chưa có driver lúc boot.']
            ] },

          { t: 'p', x:
            'Ghép cây: đặt label <code>gpio0:</code> vào dòng 273 (<code>gpio-delay</code> tham chiếu ' +
            '<code>&amp;gpio0</code>, và cây dịch ngược đã mất mọi label — Bài 45), bỏ dòng cuối, nối các ' +
            'node mới, đóng gốc lại, rồi dịch sang <code>.dtb</code>:' },

          { t: 'code', where: 'wsl', code:
            'sed -e \'s/^\\tpl061@9030000 {/\\tgpio0: pl061@9030000 {/\' -e \'$d\' virt.dts > board.dts\n' +
            'cat nodes.dts >> board.dts\n' +
            'echo \'};\' >> board.dts\n' +
            'diff virt.dts board.dts | head -n 5\n' +
            'dtc -q -I dts -O dtb -o board.dtb board.dts\n' +
            'ls -l board.dtb' },

          { t: 'code', where: 'out', nocopy: true, code:
            '273c273\n' +
            '< \tpl061@9030000 {\n' +
            '---\n' +
            '> \tgpio0: pl061@9030000 {\n' +
            '374a375,409\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 8100 Sep 30 10:56 board.dtb' },

          { t: 'cmdx', cmd: "sed -e 's/^\\tpl061@9030000 {/\\tgpio0: pl061@9030000 {/' -e '$d' virt.dts > board.dts",
            rows: [
              ['<code>-e \'s/…/…/\'</code>', 'Thay thế: tìm dòng bắt đầu bằng một Tab rồi <code>pl061@9030000 {</code>, viết lại có thêm <code>gpio0: </code>.', '<code>^\\t</code> neo vào đầu dòng, nên chỉ đúng dòng 273 khớp'],
              ['<code>-e \'$d\'</code>', '<code>$</code> = dòng cuối, <code>d</code> = xoá nó.', 'Bỏ dấu <code>};</code> đóng gốc để còn chỗ nối node mới'],
              ['<code>&gt; board.dts</code>', 'Ghi kết quả ra file mới.', '<code>virt.dts</code> giữ nguyên làm bản gốc để <code>diff</code>']
            ] },

          { t: 'p', x:
            '<code>diff</code> xác nhận đúng hai thay đổi: dòng 273 được thêm label, và có <b>35</b> dòng mới ' +
            '(375–409) — đúng bằng số dòng của <code>nodes.dts</code> (<code>wc -l nodes.dts</code>). ' +
            '<code>diff</code> báo chúng chen vào sau dòng 374 chứ không phải sau dòng đóng <code>chosen</code>, ' +
            'vì node cuối của bạn cũng kết thúc bằng <code>\\t};</code> và nó không phân biệt được hai dòng giống ' +
            'hệt nhau; nội dung file thì đúng như bạn định. <code>board.dtb</code> nặng <b>8 100</b> byte: <code>dtc</code> không mang theo 1 MiB đệm ' +
            'của QEMU. <code>-q</code> tắt bảy cảnh báo có sẵn trong cây của QEMU mà Bài 45 đã đọc từng cái; ' +
            'không có cảnh báo nào cho các node mới.' },

          { t: 'p', x:
            'Trước khi viết một dòng C nào, đọc lại từ file nhị phân xem <code>dtc</code> đã mã hoá các ' +
            'property đúng như bạn định chưa:' },

          { t: 'code', where: 'wsl', code:
            'fdtget board.dtb /sensor@b000000 learn,trip-mdeg\n' +
            'fdtget board.dtb /sensor@b000000 label\n' +
            'fdtget board.dtb /sensor@b003000 enable-gpios\n' +
            'fdtget board.dtb /gpio-delay gpios\n' +
            'fdtget board.dtb /pl061@9030000 phandle' },

          { t: 'code', where: 'out', nocopy: true, code:
            '60000 85000\n' +
            'board\n' +
            '1 0 0 0\n' +
            '32771 1 0\n' +
            '32771' },

          { t: 'cal', kind: 'why', title: 'Đọc năm dòng này như driver sẽ đọc',
            x: '<ul>' +
               '<li><code>60000 85000</code>: hai ô 32 bit — chính là mảng <code>of_property_read_u32_array</code> ' +
               'sẽ nhận với độ dài 2.</li>' +
               '<li><code>board</code>: chuỗi, <code>fdtget</code> tự nhận ra vì nó kết thúc bằng byte 0.</li>' +
               '<li><code>1 0 0 0</code>: bốn ô của <code>enable-gpios</code>. Ô đầu là <b>phandle 1</b> — ' +
               '<code>dtc</code> đã thay <code>&amp;gpio_delay</code> bằng số của node <code>gpio-delay</code> ' +
               '(nó không có phandle sẵn nên nhận số nhỏ nhất còn trống). Ba ô sau đúng bằng ' +
               '<code>#gpio-cells = &lt;3&gt;</code> của nhà cung cấp: chân 0, trễ lên 0, trễ xuống 0.</li>' +
               '<li><code>32771 1 0</code> và <code>32771</code>: <code>32771</code> = <code>0x8003</code>, ' +
               'phandle QEMU đã gán sẵn cho PL061 mà Bài 45 đã đếm. Đặt label <code>gpio0:</code> không đổi ' +
               'số đó; <code>&amp;gpio0</code> chỉ là tên để bạn khỏi phải chép số.</li>' +
               '</ul>' +
               'Kernel sẽ dùng chính các ô phandle này lúc boot để nối <code>b003000.sensor</code> với ' +
               '<code>gpio-delay</code> — bước 4 sẽ cho bạn thấy liên kết đó trong sysfs.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Viết và build platform driver tsensor',
        blocks: [
          { t: 'p', x:
            'Driver đọc cảm biến \"giả\": không có phần cứng nào ở <code>0xb000000</code>, nên giá trị nó ' +
            'báo chính là <code>learn,offset-mdeg</code> đọc từ cây. Mọi thứ khác đều thật — đăng ký với ' +
            'platform bus, đặt chỗ địa chỉ, xin GPIO, tạo <code>/dev/tsensorN</code> và một thuộc tính sysfs ' +
            'cho <b>mỗi</b> node. Khi Bài 56 dạy <code>ioremap</code>/<code>readl</code>, đọc thanh ghi thật chỉ ' +
            'cần thay đúng một hàm <code>ts_read_mdeg</code>.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai54/tsensor && cd ~/bai54/tsensor\n' +
            'nano tsensor.c' },

          { t: 'code', where: 'file', name: '~/bai54/tsensor/tsensor.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * Simulated temperature sensor for "learn,temp-sensor" Device Tree nodes.\n' +
            ' * Nothing answers at the address in reg: the reading comes from the tree.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/of.h>\n' +
            '#include <linux/fs.h>\n' +
            '#include <linux/cdev.h>\n' +
            '#include <linux/device.h>\n' +
            '#include <linux/idr.h>\n' +
            '#include <linux/gpio/consumer.h>\n' +
            '\n' +
            '#define TS_MAX 4                /* at most four sensors: minor 0..3 */\n' +
            '\n' +
            'struct ts_dev {\n' +
            '	struct device *dev;         /* &pdev->dev, the platform device */\n' +
            '	const char *label;          /* DT "label", default: node name */\n' +
            '	u32 offset_mdeg;            /* DT "learn,offset-mdeg", required */\n' +
            '	u32 trip_mdeg[2];           /* DT "learn,trip-mdeg": warn, critical */\n' +
            '	u32 poll_ms;                /* DT "learn,poll-ms", default 1000 */\n' +
            '	struct gpio_desc *enable;   /* DT "enable-gpios", optional */\n' +
            '	int minor;\n' +
            '	struct cdev cdev;\n' +
            '};\n' +
            '\n' +
            'static dev_t ts_base;\n' +
            'static struct class *ts_class;\n' +
            'static DEFINE_IDA(ts_ida);\n' +
            '\n' +
            '/* No hardware yet (MMIO is lesson 56): the "reading" is the DT offset */\n' +
            'static u32 ts_read_mdeg(struct ts_dev *ts)\n' +
            '{\n' +
            '	return ts->offset_mdeg;\n' +
            '}\n' +
            '\n' +
            'static int ts_open(struct inode *inode, struct file *filp)\n' +
            '{\n' +
            '	filp->private_data = container_of(inode->i_cdev, struct ts_dev, cdev);\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static ssize_t ts_read(struct file *filp, char __user *buf,\n' +
            '		       size_t count, loff_t *ppos)\n' +
            '{\n' +
            '	struct ts_dev *ts = filp->private_data;\n' +
            '	char text[16];\n' +
            '	int len;\n' +
            '\n' +
            '	len = snprintf(text, sizeof(text), "%u\\n", ts_read_mdeg(ts));\n' +
            '	return simple_read_from_buffer(buf, count, ppos, text, len);\n' +
            '}\n' +
            '\n' +
            'static const struct file_operations ts_fops = {\n' +
            '	.owner = THIS_MODULE,\n' +
            '	.open  = ts_open,\n' +
            '	.read  = ts_read,\n' +
            '};\n' +
            '\n' +
            '/* /sys/bus/platform/devices/<dev>/temp, created by the driver core */\n' +
            'static ssize_t temp_show(struct device *dev, struct device_attribute *attr,\n' +
            '			 char *buf)\n' +
            '{\n' +
            '	struct ts_dev *ts = dev_get_drvdata(dev);\n' +
            '\n' +
            '	return sysfs_emit(buf, "%u\\n", ts_read_mdeg(ts));\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(temp);\n' +
            '\n' +
            'static struct attribute *ts_attrs[] = {\n' +
            '	&dev_attr_temp.attr,\n' +
            '	NULL,\n' +
            '};\n' +
            'ATTRIBUTE_GROUPS(ts);\n' +
            '\n' +
            '/* Undo actions: devres calls them in reverse order of registration */\n' +
            'static void ts_free_minor(void *data)\n' +
            '{\n' +
            '	struct ts_dev *ts = data;\n' +
            '\n' +
            '	dev_dbg(ts->dev, "devres: ida_free minor %d\\n", ts->minor);\n' +
            '	ida_free(&ts_ida, ts->minor);\n' +
            '}\n' +
            '\n' +
            'static void ts_del_cdev(void *data)\n' +
            '{\n' +
            '	struct ts_dev *ts = data;\n' +
            '\n' +
            '	dev_dbg(ts->dev, "devres: cdev_del\\n");\n' +
            '	cdev_del(&ts->cdev);\n' +
            '}\n' +
            '\n' +
            'static void ts_destroy_node(void *data)\n' +
            '{\n' +
            '	struct ts_dev *ts = data;\n' +
            '\n' +
            '	dev_dbg(ts->dev, "devres: device_destroy tsensor%d\\n", ts->minor);\n' +
            '	device_destroy(ts_class, ts->cdev.dev);\n' +
            '}\n' +
            '\n' +
            'static int ts_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '	struct device *dev = &pdev->dev;\n' +
            '	struct device_node *np = dev->of_node;\n' +
            '	struct resource *res;\n' +
            '	struct device *node;\n' +
            '	struct ts_dev *ts;\n' +
            '	int ret;\n' +
            '\n' +
            '	dev_info(dev, "probe\\n");\n' +
            '\n' +
            '	ts = devm_kzalloc(dev, sizeof(*ts), GFP_KERNEL);\n' +
            '	if (!ts)\n' +
            '		return -ENOMEM;\n' +
            '	ts->dev = dev;\n' +
            '\n' +
            '	/* reg = <...> was already turned into a resource by the OF core */\n' +
            '	res = platform_get_resource(pdev, IORESOURCE_MEM, 0);\n' +
            '	if (!res)\n' +
            '		return -EINVAL;\n' +
            '	if (!devm_request_mem_region(dev, res->start, resource_size(res),\n' +
            '				     dev_name(dev)))\n' +
            '		return -EBUSY;\n' +
            '\n' +
            '	/* required: no sensible default exists */\n' +
            '	ret = of_property_read_u32(np, "learn,offset-mdeg", &ts->offset_mdeg);\n' +
            '	if (ret)\n' +
            '		return dev_err_probe(dev, ret, "learn,offset-mdeg missing\\n");\n' +
            '\n' +
            '	/* optional: preset the default, then let DT override it */\n' +
            '	ts->label = np->name;\n' +
            '	of_property_read_string(np, "label", &ts->label);\n' +
            '	ts->poll_ms = 1000;\n' +
            '	of_property_read_u32(np, "learn,poll-ms", &ts->poll_ms);\n' +
            '\n' +
            '	/* optional, but malformed is an error: tell the two apart */\n' +
            '	ret = of_property_read_u32_array(np, "learn,trip-mdeg", ts->trip_mdeg, 2);\n' +
            '	if (ret == -EINVAL) {\n' +
            '		ts->trip_mdeg[0] = 70000;\n' +
            '		ts->trip_mdeg[1] = 90000;\n' +
            '	} else if (ret) {\n' +
            '		return dev_err_probe(dev, ret, "learn,trip-mdeg needs 2 cells\\n");\n' +
            '	}\n' +
            '\n' +
            '	/* absent -> NULL; provider not bound yet -> -EPROBE_DEFER */\n' +
            '	ts->enable = devm_gpiod_get_optional(dev, "enable", GPIOD_OUT_HIGH);\n' +
            '	if (IS_ERR(ts->enable))\n' +
            '		return dev_err_probe(dev, PTR_ERR(ts->enable), "enable gpio\\n");\n' +
            '\n' +
            '	/* three resources with no devm_ version: register an undo for each */\n' +
            '	ts->minor = ida_alloc_max(&ts_ida, TS_MAX - 1, GFP_KERNEL);\n' +
            '	if (ts->minor < 0)\n' +
            '		return ts->minor;\n' +
            '	ret = devm_add_action_or_reset(dev, ts_free_minor, ts);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	cdev_init(&ts->cdev, &ts_fops);\n' +
            '	ret = cdev_add(&ts->cdev, MKDEV(MAJOR(ts_base), ts->minor), 1);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '	ret = devm_add_action_or_reset(dev, ts_del_cdev, ts);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	node = device_create(ts_class, dev, ts->cdev.dev, ts,\n' +
            '			     "tsensor%d", ts->minor);\n' +
            '	if (IS_ERR(node))\n' +
            '		return PTR_ERR(node);\n' +
            '	ret = devm_add_action_or_reset(dev, ts_destroy_node, ts);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	platform_set_drvdata(pdev, ts);\n' +
            '	dev_info(dev, "%s: %pR offset %u trip %u/%u poll %u ms gpio %s -> tsensor%d\\n",\n' +
            '		 ts->label, res, ts->offset_mdeg, ts->trip_mdeg[0],\n' +
            '		 ts->trip_mdeg[1], ts->poll_ms, ts->enable ? "yes" : "no",\n' +
            '		 ts->minor);\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static void ts_remove(struct platform_device *pdev)\n' +
            '{\n' +
            '	struct ts_dev *ts = platform_get_drvdata(pdev);\n' +
            '\n' +
            '	dev_info(&pdev->dev, "remove %s\\n", ts->label);\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id ts_of_match[] = {\n' +
            '	{ .compatible = "learn,temp-sensor" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, ts_of_match);\n' +
            '\n' +
            'static struct platform_driver ts_driver = {\n' +
            '	.probe  = ts_probe,\n' +
            '	.remove = ts_remove,\n' +
            '	.driver = {\n' +
            '		.name           = "tsensor",\n' +
            '		.of_match_table = ts_of_match,\n' +
            '		.dev_groups     = ts_groups,\n' +
            '	},\n' +
            '};\n' +
            '\n' +
            '/* Module-wide resources belong to no device, so devm cannot hold them */\n' +
            'static int __init ts_init(void)\n' +
            '{\n' +
            '	int ret;\n' +
            '\n' +
            '	ret = alloc_chrdev_region(&ts_base, 0, TS_MAX, "tsensor");\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	ts_class = class_create("tsensor");\n' +
            '	if (IS_ERR(ts_class)) {\n' +
            '		ret = PTR_ERR(ts_class);\n' +
            '		goto err_region;\n' +
            '	}\n' +
            '\n' +
            '	ret = platform_driver_register(&ts_driver);\n' +
            '	if (ret)\n' +
            '		goto err_class;\n' +
            '	return 0;\n' +
            '\n' +
            'err_class:\n' +
            '	class_destroy(ts_class);\n' +
            'err_region:\n' +
            '	unregister_chrdev_region(ts_base, TS_MAX);\n' +
            '	return ret;\n' +
            '}\n' +
            '\n' +
            'static void __exit ts_exit(void)\n' +
            '{\n' +
            '	platform_driver_unregister(&ts_driver);    /* runs remove + devres */\n' +
            '	class_destroy(ts_class);\n' +
            '	unregister_chrdev_region(ts_base, TS_MAX);\n' +
            '}\n' +
            '\n' +
            'module_init(ts_init);\n' +
            'module_exit(ts_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("Simulated temperature sensor platform driver");' },

          { t: 'table',
            head: ['Đoạn', 'Dòng', 'Điều cần để ý'],
            rows: [
              ['<code>struct ts_dev</code>', '17–26', 'Một bản <b>cho mỗi cảm biến</b>, xin bằng <code>devm_kzalloc</code> trong <code>probe</code>. So với Bài 53: không còn mảng <code>static</code> cố định <code>rd_devs[RD_COUNT]</code>.'],
              ['<code>DEFINE_IDA(ts_ida)</code>', '30', 'Bộ cấp số nhỏ nhất còn trống. Cảm biến thứ nhất nhận minor 0, thứ hai minor 1; gỡ minor 0 ra rồi lắp lại sẽ nhận lại 0.'],
              ['<code>ts_open</code>, <code>ts_read</code>', '38–53', 'Mẫu của Bài 52, gọn hơn nhờ <code>simple_read_from_buffer</code>: hàm của kernel lo phần <code>*ppos</code> và <code>copy_to_user</code> mà Bài 52 viết tay.'],
              ['<code>temp_show</code> + <code>ATTRIBUTE_GROUPS(ts)</code>', '61–75', 'Như Bài 53, nhưng gắn vào <code>.dev_groups</code> của driver, nên file <code>temp</code> xuất hiện trong thư mục của <b>platform device</b> (<code>/sys/bus/platform/devices/b000000.sensor/</code>).'],
              ['Ba hàm hoàn tác', '77–100', 'Mỗi hàm trả một thứ không có bản <code>devm_</code>. Dòng <code>dev_dbg</code> trong mỗi hàm để bạn <b>nhìn thấy</b> thứ tự devres gọi chúng ở bước 3.'],
              ['<code>ts_probe</code>', '102–181', 'Xin theo thứ tự: bộ nhớ → vùng địa chỉ → đọc property → GPIO → minor → <code>cdev</code> → node <code>/dev</code>. Mỗi bước thất bại chỉ cần <code>return</code>.'],
              ['<code>ts_remove</code>', '183–188', 'Chỉ in một dòng. Không <code>kfree</code>, không <code>cdev_del</code>.'],
              ['<code>ts_init</code>/<code>ts_exit</code>', '207–238', 'Chỉ giữ tài nguyên dùng chung. <code>ts_exit</code> gỡ driver <b>trước</b> (kéo theo mọi <code>remove</code> và devres, cần lớp <code>tsensor</code> còn sống để <code>device_destroy</code>), rồi mới huỷ lớp.']
            ] },

          { t: 'cmdx', cmd: 'dev_info(dev, "%s: %pR offset %u …", ts->label, res, …);',
            title: 'Dòng log cuối của probe',
            rows: [
              ['<code>dev_info(dev, …)</code>', 'Như <code>pr_info</code>, nhưng tự thêm tên driver và tên thiết bị vào đầu dòng: <code>tsensor b000000.sensor:</code>.', 'Với nhiều cảm biến, đây là cách duy nhất biết dòng log thuộc về cái nào'],
              ['<code>%pR</code>', 'In một <code>struct resource *</code> dạng <code>[mem 0x0b000000-0x0b000fff]</code>.', 'Cùng họ <code>%p…</code> với <code>%pS</code> của Bài 51'],
              ['<code>ts-&gt;enable ? "yes" : "no"</code>', 'GPIO tuỳ chọn có hay không.', '<code>devm_gpiod_get_optional</code> trả <code>NULL</code> khi node không khai']
            ] },

          { t: 'p', x:
            'Makefile là của Bài 53 với hai chữ <code>ramdisk</code> đổi thành <code>tsensor</code>. ' +
            '<code>-DDEBUG</code> được giữ lại có chủ ý: nó bật các dòng <code>dev_dbg</code> trong ba hàm hoàn ' +
            'tác (Bài 51).' },

          { t: 'code', where: 'wsl', code:
            'sed -e \'s/ramdisk/tsensor/g\' ~/bai53/ramdisk/Makefile > Makefile\n' +
            'head -n 2 Makefile\n' +
            'time make' },

          { t: 'code', where: 'out', nocopy: true, code:
            'obj-m := tsensor.o\n' +
            'CFLAGS_tsensor.o := -DDEBUG\n' +
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai54/tsensor ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai54/tsensor\'\n' +
            '  CC [M]  tsensor.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  tsensor.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  tsensor.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai54/tsensor\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '\n' +
            'real\t0m0.963s\n' +
            'user\t0m0.836s\n' +
            'sys\t0m0.132s',
            notes: ['Như Bài 53: <code>/home/cah8hc</code> và <code>embedded-course/</code> là của máy viết bài, thời gian cũng sẽ khác (máy viết bài đo 0,96 và 1,27 s ở hai lần build).'] },

          { t: 'p', x:
            'Năm giai đoạn quen thuộc, <b>0 cảnh báo</b>. Giờ xem module mang những gì vào kernel:' },

          { t: 'code', where: 'wsl', code:
            'modinfo tsensor.ko | grep -E \'^(alias|depends|name)\'\n' +
            'aarch64-linux-gnu-nm -u tsensor.ko | wc -l\n' +
            'for s in devm_kmalloc __devm_request_region __devm_add_action devm_gpiod_get_optional \\\n' +
            '         of_property_read_variable_u32_array __platform_driver_register ida_alloc_range; do\n' +
            '  grep -w "$s" ~/bai38/linux-6.18.45/Module.symvers | awk \'{print $2, $4}\'\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'alias:          of:N*T*Clearn,temp-sensorC*\n' +
            'alias:          of:N*T*Clearn,temp-sensor\n' +
            'depends:        \n' +
            'name:           tsensor\n' +
            '28\n' +
            'devm_kmalloc EXPORT_SYMBOL_GPL\n' +
            '__devm_request_region EXPORT_SYMBOL\n' +
            '__devm_add_action EXPORT_SYMBOL_GPL\n' +
            'devm_gpiod_get_optional EXPORT_SYMBOL_GPL\n' +
            'of_property_read_variable_u32_array EXPORT_SYMBOL_GPL\n' +
            '__platform_driver_register EXPORT_SYMBOL_GPL\n' +
            'ida_alloc_range EXPORT_SYMBOL' },

          { t: 'cal', kind: 'why', title: 'Hai dòng alias và những cái tên có gạch dưới',
            x: '<ul>' +
               '<li>Hai dòng <code>alias</code> là <code>MODULE_DEVICE_TABLE</code> đang làm việc: đúng khuôn ' +
               '<code>of:N…T…C…</code> mà Bài 45 thấy trong <code>MODALIAS=of:NsensorT(null)Clearn,temp-sensor</code> ' +
               'của node cảm biến. Một hệ thống có <code>udev</code> + <code>modprobe</code> sẽ tự nạp module này ' +
               'lúc boot. initramfs của bài không có <code>udev</code>, nên bạn <code>insmod</code> tay.</li>' +
               '<li><b>28</b> hàm nhập từ kernel, và tên trong <code>Module.symvers</code> không giống tên bạn ' +
               'viết: <code>devm_request_mem_region</code> là macro gọi <code>__devm_request_region</code>, ' +
               '<code>devm_add_action_or_reset</code> gọi <code>__devm_add_action</code>, ' +
               '<code>of_property_read_u32_array</code> là hàm inline gọi ' +
               '<code>of_property_read_variable_u32_array</code>, <code>ida_alloc_max</code> gọi ' +
               '<code>ida_alloc_range</code>. Bài 51 đã gặp đúng hiện tượng này với <code>kmalloc</code>.</li>' +
               '<li>Sáu trên bảy hàm là <code>EXPORT_SYMBOL_GPL</code>: gần như toàn bộ khung platform, devres và ' +
               'OF chỉ dành cho module GPL. Bài 52 đã cho thấy <code>MODULE_LICENSE("Proprietary")</code> sẽ bị ' +
               '<code>modpost</code> chặn ngay khi build.</li>' +
               '</ul>' },

          { t: 'p', x:
            'Cuối cùng, đóng gói initramfs: bản sao của Bài 32, thêm driver của bạn và module nhà cung cấp ' +
            'GPIO.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai54\n' +
            'rm -rf initramfs && cp -a ~/bai32/initramfs initramfs\n' +
            'cp tsensor/tsensor.ko initramfs/\n' +
            'cp ~/bai40/modroot-stripped/lib/modules/6.18.45-embedded/kernel/drivers/gpio/gpio-aggregator.ko initramfs/\n' +
            'modinfo initramfs/gpio-aggregator.ko | grep -E \'^(alias|depends)\'\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'alias:          of:N*T*Cgpio-delayC*\n' +
            'alias:          of:N*T*Cgpio-delay\n' +
            'depends:        \n' +
            '4197 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1071333 Sep 30 10:42 initramfs.cpio.gz',
            notes: ['Kích thước file nén có thể lệch vài byte giữa các lần đóng gói vì cpio ghi cả thời điểm sửa file (máy viết bài đo 1 071 331–1 071 333 byte).'] },

          { t: 'p', x:
            'Hai dòng <code>alias</code> của <code>gpio-aggregator.ko</code> xác nhận đây đúng là driver của ' +
            '<code>compatible = "gpio-delay"</code>. <code>depends:</code> trống ở cả hai module: không module ' +
            'nào cần module khác, nên thứ tự <code>insmod</code> là tự do — và bạn sẽ cố tình nạp nhà cung ' +
            'cấp <b>sau</b>.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Boot với cây mới, nạp driver, đếm các lời gọi probe()',
        blocks: [
          { t: 'p', x:
            'Boot bằng dòng lệnh của Bài 50–53, thêm <code>-dtb board.dtb</code> để kernel nhận cây của ' +
            'bạn thay vì cây QEMU tự dựng:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai54\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb board.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'cal', kind: 'warn', title: 'Đợi 10 giây sau khi thấy dấu nhắc rồi mới insmod',
            x: 'Mọi lệnh của bước này được ghi trong một lần boot, gõ lần lượt, và <code>insmod</code> đầu tiên ' +
               'rơi vào giây thứ ~20 kể từ lúc boot. Thời điểm này quan trọng cho đúng một dòng ' +
               '<code>probe</code> của <code>b003000.sensor</code>, lý do nằm ở bước 4. Nếu bạn gõ nhanh hơn, ' +
               'mọi thứ vẫn chạy, chỉ khác ở dòng đó.' },

          { t: 'p', x:
            'Ở dấu nhắc <code>~ #</code>, gắn devtmpfs và debugfs như Bài 52–53. Trước khi nạp gì, nhìn ' +
            'danh sách thiết bị trên platform bus:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'mount -t debugfs none /sys/kernel/debug\n' +
            'ls /sys/bus/platform/devices | grep -E \'sensor|delay\'\n' +
            'ls /sys/bus/platform/devices/b000000.sensor' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/platform/devices | grep -E \'sensor|delay\'\n' +
            'b000000.sensor\n' +
            'b002000.sensor\n' +
            'b003000.sensor\n' +
            'gpio-delay\n' +
            '~ # ls /sys/bus/platform/devices/b000000.sensor\n' +
            'driver_override       power                 waiting_for_supplier\n' +
            'modalias              subsystem\n' +
            'of_node               uevent' },

          { t: 'p', x:
            'Bốn node có <code>compatible</code> đã thành bốn <code>platform_device</code> lúc boot, trước ' +
            'khi có driver nào — đúng giai đoạn 2 của Bài 44. <code>b001000.sensor</code> không có mặt: node ' +
            '<code>disabled</code> bị bỏ qua ngay khi dựng thiết bị, như Bài 45 đã thấy. Thư mục của ' +
            '<code>b000000.sensor</code> giống hệt từng chữ ở tầng 3 của Bài 45: có <code>of_node</code>, ' +
            '<b>không</b> có <code>driver</code>. Giờ xem property mà driver sắp đọc, ở dạng byte thô, và bảng ' +
            'địa chỉ đang được giữ:' },

          { t: 'code', where: 'qemu', code:
            'od -An -tx1 /proc/device-tree/sensor@b000000/learn,offset-mdeg\n' +
            'grep sensor /proc/iomem' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # od -An -tx1 /proc/device-tree/sensor@b000000/learn,offset-mdeg\n' +
            ' 00 00 a6 04\n' +
            '~ # grep sensor /proc/iomem' },

          { t: 'p', x:
            '<code>00 00 a6 04</code> là <code>0x0000a604</code> = 42 500, lưu big-endian như phần lý thuyết ' +
            'đã nói. <code>grep</code> trên <code>/proc/iomem</code> không in gì: chưa ai đặt chỗ vùng ' +
            '<code>0xb000000</code>. Có thiết bị không có nghĩa là có người dùng nó. Giờ nạp driver:' },

          { t: 'code', where: 'qemu', code: 'insmod /tsensor.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   20.877450] tsensor: loading out-of-tree module taints kernel.\n' +
            '[   20.880976] tsensor b000000.sensor: probe\n' +
            '[   20.881661] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 42500 trip 60000/85000 poll 1000 ms gpio no -> tsensor0\n' +
            '[   20.882155] tsensor b002000.sensor: probe\n' +
            '[   20.882389] tsensor b002000.sensor: error -EINVAL: learn,offset-mdeg missing\n' +
            '[   20.882631] tsensor b002000.sensor: probe with driver tsensor failed with error -22\n' +
            '[   20.882878] tsensor b003000.sensor: probe',
            notes: ['Số trong ngoặc vuông là thời điểm tính từ lúc boot, sẽ khác trên máy bạn. Ở lần <code>insmod</code> đầu tiên, ba thiết bị đi theo thứ tự node trong cây.'] },

          { t: 'cal', kind: 'why', title: 'Một lệnh insmod, ba lời gọi probe(), ba kết cục',
            x: '<ul>' +
               '<li><b><code>b000000.sensor</code> — nhận.</b> Dòng thứ hai là mọi thứ <code>probe</code> đã ' +
               'đọc: <code>label</code> <code>board</code>, vùng <code>[mem 0x0b000000-0x0b000fff]</code> dịch từ ' +
               '<code>reg</code> (đúng 4 KiB), <code>offset 42500</code>, <code>trip 60000/85000</code> từ mảng ' +
               'hai ô, <code>poll 1000</code> là <b>giá trị mặc định</b> vì node không khai ' +
               '<code>learn,poll-ms</code>, <code>gpio no</code> vì không có <code>enable-gpios</code>. Nó nhận ' +
               'minor 0 → <code>tsensor0</code>.</li>' +
               '<li><b><code>b002000.sensor</code> — từ chối.</b> <code>of_property_read_u32</code> trả ' +
               '<code>-EINVAL</code> (không có property), <code>dev_err_probe</code> in dòng thứ tư với ' +
               '<code>%pe</code> đổi mã số thành chữ. Dòng thứ năm là của <b>driver core</b> ' +
               '(<code>drivers/base/dd.c</code>, dòng 656): nó thấy <code>probe</code> trả lỗi khác ' +
               '<code>-EPROBE_DEFER</code>/<code>-ENODEV</code> và báo <code>failed with error -22</code>.</li>' +
               '<li><b><code>b003000.sensor</code> — chỉ có một dòng <code>probe</code>, rồi im lặng.</b> Không ' +
               'lỗi, không thành công. Đó là <code>-EPROBE_DEFER</code>, và <code>dev_err_probe</code> đã cố ý ' +
               'không in gì ra console. Bước 4 sẽ mổ xẻ dòng này.</li>' +
               '<li><b><code>b001000.sensor</code> — không có dòng nào.</b> Không có thiết bị thì không có gì để ' +
               '<code>probe</code>.</li>' +
               '</ul>' },

          { t: 'p', x:
            'Kiểm tra thiết bị đầu tiên từ mọi phía: liên kết tới driver, danh sách thiết bị của driver, bảng ' +
            'địa chỉ, node <code>/dev</code>, và cả hai cách đọc nhiệt độ:' },

          { t: 'code', where: 'qemu', code:
            'readlink /sys/bus/platform/devices/b000000.sensor/driver\n' +
            'ls /sys/bus/platform/drivers/tsensor\n' +
            'grep sensor /proc/iomem\n' +
            'ls -l /dev/tsensor*\n' +
            'cat /dev/tsensor0\n' +
            'cat /sys/bus/platform/devices/b000000.sensor/temp\n' +
            'readlink /sys/class/tsensor/tsensor0/device' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # readlink /sys/bus/platform/devices/b000000.sensor/driver\n' +
            '../../../bus/platform/drivers/tsensor\n' +
            '~ # ls /sys/bus/platform/drivers/tsensor\n' +
            'b000000.sensor  module          unbind\n' +
            'bind            uevent\n' +
            '~ # grep sensor /proc/iomem\n' +
            '0b000000-0b000fff : b000000.sensor\n' +
            '~ # ls -l /dev/tsensor*\n' +
            'crw-------    1 0        0         510,   0 Sep 30 04:00 /dev/tsensor0\n' +
            '~ # cat /dev/tsensor0\n' +
            '42500\n' +
            '~ # cat /sys/bus/platform/devices/b000000.sensor/temp\n' +
            '42500\n' +
            '~ # readlink /sys/class/tsensor/tsensor0/device\n' +
            '../../../b000000.sensor',
            notes: ['Ngày giờ trên dòng <code>ls -l</code> là giờ UTC của máy ảo, sẽ khác. Major <b>510</b> thì giống: như Bài 52 đã đo, 234–254 đều đã có chủ trên kernel này, nên <code>alloc_chrdev_region</code> luôn trả 510.'] },

          { t: 'p', x:
            'Liên kết <code>driver</code> đã xuất hiện — tầng 3 của Bài 45 cuối cùng cũng có người nhận. ' +
            'Trong <code>drivers/tsensor/</code> chỉ có <code>b000000.sensor</code>: thiết bị bị từ chối và ' +
            'thiết bị đang chờ đều không được liệt kê. <code>/proc/iomem</code> giờ ghi vùng 4 KiB đứng tên ' +
            '<code>b000000.sensor</code> — dấu vết của <code>devm_request_mem_region</code>. ' +
            '<code>/dev/tsensor0</code> và file <code>temp</code> cùng trả <b>42500</b>, tức 42,5 °C, lấy từ cây. ' +
            'Dòng cuối nối vòng lại: node <code>/dev</code> thuộc lớp <code>tsensor</code>, và thiết bị cha của ' +
            'nó chính là platform device — nhờ tham số <code>dev</code> truyền cho <code>device_create</code>.' },

          { t: 'p', x:
            'Giờ tách thiết bị khỏi driver <b>mà không gỡ module</b>, bằng file <code>unbind</code> Bài 44 đã ' +
            'dùng, rồi xem devres dọn những gì:' },

          { t: 'code', where: 'qemu', code:
            'echo b000000.sensor > /sys/bus/platform/drivers/tsensor/unbind\n' +
            'dmesg | tail -n 4\n' +
            'grep sensor /proc/iomem\n' +
            'ls /dev/tsensor*' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo b000000.sensor > /sys/bus/platform/drivers/tsensor/unbind\n' +
            '[   32.885533] tsensor b000000.sensor: remove board\n' +
            '~ # dmesg | tail -n 4\n' +
            '[   32.885533] tsensor b000000.sensor: remove board\n' +
            '[   32.885897] tsensor b000000.sensor: devres: device_destroy tsensor0\n' +
            '[   32.887530] tsensor b000000.sensor: devres: cdev_del\n' +
            '[   32.887680] tsensor b000000.sensor: devres: ida_free minor 0\n' +
            '~ # grep sensor /proc/iomem\n' +
            '~ # ls /dev/tsensor*\n' +
            'ls: /dev/tsensor*: No such file or directory' },

          { t: 'cal', kind: 'why', title: 'Thứ tự trả là thứ tự xin, đảo ngược — bạn không viết dòng nào',
            x: 'Chỉ dòng <code>remove board</code> ra console, vì nó là <code>dev_info</code>; ba dòng ' +
               '<code>devres:</code> là <code>dev_dbg</code> (mức 7, dưới ngưỡng console — Bài 51), phải xem qua ' +
               '<code>dmesg</code>. Đọc từ trên xuống:<ol>' +
               '<li><code>ts_remove</code> chạy <b>trước</b> mọi thứ devres.</li>' +
               '<li><code>device_destroy</code> — thứ xin <b>cuối cùng</b> trong <code>probe</code> — được trả ' +
               '<b>đầu tiên</b>, rồi <code>cdev_del</code>, rồi <code>ida_free</code>.</li>' +
               '<li>Ba mục không in gì nhưng vẫn được trả: vùng địa chỉ (<code>/proc/iomem</code> hết dòng ' +
               '<code>sensor</code>), và <code>struct ts_dev</code>.</li></ol>' +
               'Đó chính là hình ngăn xếp ở phần lý thuyết, chạy thật. Nếu devres trả sai thứ tự — ' +
               '<code>cdev_del</code> trước <code>device_destroy</code> — sẽ có một khoảnh khắc ' +
               '<code>/dev/tsensor0</code> còn đó mà mở ra thì không có driver phía sau.' },

          { t: 'p', x:
            'Gắn lại, rồi gỡ hẳn module:' },

          { t: 'code', where: 'qemu', code:
            'echo b000000.sensor > /sys/bus/platform/drivers/tsensor/bind\n' +
            'ls /dev/tsensor*\n' +
            'rmmod tsensor\n' +
            'dmesg | tail -n 4\n' +
            'ls /sys/class | grep tsensor\n' +
            'grep tsensor /proc/devices' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo b000000.sensor > /sys/bus/platform/drivers/tsensor/bind\n' +
            '[   38.892755] tsensor b000000.sensor: probe\n' +
            '[   38.893979] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 42500 trip 60000/85000 poll 1000 ms gpio no -> tsensor0\n' +
            '~ # [   38.898208] tsensor b003000.sensor: probe\n' +
            'ls /dev/tsensor*\n' +
            '/dev/tsensor0\n' +
            '~ # rmmod tsensor\n' +
            '[   41.893970] tsensor b000000.sensor: remove board\n' +
            '~ # dmesg | tail -n 4\n' +
            '[   41.893970] tsensor b000000.sensor: remove board\n' +
            '[   41.894361] tsensor b000000.sensor: devres: device_destroy tsensor0\n' +
            '[   41.894920] tsensor b000000.sensor: devres: cdev_del\n' +
            '[   41.895016] tsensor b000000.sensor: devres: ida_free minor 0\n' +
            '~ # ls /sys/class | grep tsensor\n' +
            '~ # grep tsensor /proc/devices',
            notes: ['Dòng <code>b003000.sensor: probe</code> in lẫn vào sau dấu nhắc <code>~ #</code> vì nó đến từ một luồng làm việc của kernel, chạy song song với shell. Đó là hiện tượng hiển thị, không phải lỗi.'] },

          { t: 'p', x:
            '<code>bind</code> gọi lại <code>probe</code> cho đúng một thiết bị, và <code>ida</code> cấp lại ' +
            '<b>minor 0</b> vì nó đã được trả. Nhưng còn một dòng bạn không yêu cầu: ' +
            '<code>b003000.sensor: probe</code>. Một driver vừa bind thành công, nên driver core <b>thử lại ' +
            'toàn bộ danh sách chờ</b> — và cảm biến thứ ba vẫn chưa có GPIO nên lại quay về hàng. ' +
            '<code>rmmod</code> gọi <code>remove</code> rồi devres cho thiết bị duy nhất đang gắn; ' +
            '<code>ts_exit</code> huỷ lớp và trả dải số, nên <code>/sys/class</code> lẫn ' +
            '<code>/proc/devices</code> không còn chữ <code>tsensor</code> nào. Máy ảo đã sạch như trước ' +
            '<code>insmod</code>.' },

          { t: 'cal', kind: 'tip', title: 'Thang kiểm tra khi probe() không chạy',
            x: 'Đây là thang ba tầng của Bài 45, giờ có thêm tầng thứ tư mà chỉ người viết driver mới cần:<ol>' +
               '<li><code>ls /proc/device-tree/</code> — node có tới kernel không?</li>' +
               '<li><code>ls /sys/bus/platform/devices/</code> — node có thành thiết bị không? (<code>disabled</code> dừng ở đây)</li>' +
               '<li><code>ls /sys/bus/platform/drivers/TÊN/</code> — driver có đăng ký không, và thiết bị có trong danh sách của nó không?</li>' +
               '<li><code>cat /sys/kernel/debug/devices_deferred</code> và <code>dmesg | grep TÊN</code> — ' +
               '<code>probe</code> đang chờ ai, hay đã từ chối vì sao?</li></ol>' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Deferred probe: nạp nhà cung cấp sau người dùng',
        blocks: [
          { t: 'p', x:
            'Vẫn trong lần boot đó, nạp lại driver và hỏi driver core xem ai đang chờ:' },

          { t: 'code', where: 'qemu', code:
            'insmod /tsensor.ko\n' +
            'cat /sys/kernel/debug/devices_deferred' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /tsensor.ko\n' +
            '[   47.903907] tsensor b000000.sensor: probe\n' +
            '[   47.905004] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 42500 trip 60000/85000 poll 1000 ms gpio no -> tsensor0\n' +
            '[   47.907444] tsensor b003000.sensor: probe\n' +
            '[   47.907606] tsensor b002000.sensor: probe\n' +
            '[   47.907645] tsensor b002000.sensor: error -EINVAL: learn,offset-mdeg missing\n' +
            '[   47.907675] tsensor b002000.sensor: probe with driver tsensor failed with error -22\n' +
            '[   47.908678] tsensor b003000.sensor: probe\n' +
            '~ # cat /sys/kernel/debug/devices_deferred\n' +
            'b003000.sensor\ttsensor: enable gpio',
            notes: ['Lần <code>insmod</code> thứ hai không còn dòng <code>taints kernel</code>: taint chỉ báo một lần mỗi lần boot (Bài 50). Thứ tự và số lần <code>b003000.sensor: probe</code> có thể khác một chút giữa các lần chạy — máy viết bài thấy hai hoặc ba lần — vì mỗi lần một thiết bị bind xong, danh sách chờ lại được thử.'] },

          { t: 'cal', kind: 'why', title: '\"tsensor: enable gpio\" — lý do do chính bạn viết',
            x: '<code>devices_deferred</code> in tên thiết bị, một Tab, rồi lý do. Lý do có dạng ' +
               '<code>TÊN_DRIVER: thông điệp</code> (<code>drivers/base/dd.c</code>, dòng 235), và thông điệp ' +
               '<code>enable gpio</code> là đúng chuỗi bạn đưa cho <code>dev_err_probe</code> ở dòng ' +
               '<code>devm_gpiod_get_optional</code>. Đó là cách <code>dev_err_probe</code> trả ơn: nó im lặng ' +
               'trên console, nhưng để lại lời giải thích ở chỗ bạn sẽ tìm. Dòng <code>b003000.sensor: probe</code> ' +
               'lặp lại vì mỗi lần <code>b000000</code> bind xong, driver core thử lại danh sách chờ.' },

          { t: 'p', x:
            'Giờ nạp nhà cung cấp và xem danh sách chờ tự rỗng:' },

          { t: 'code', where: 'qemu', code:
            'insmod /gpio-aggregator.ko\n' +
            'cat /sys/kernel/debug/devices_deferred\n' +
            'cat /dev/tsensor1\n' +
            'cat /sys/kernel/debug/gpio' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /gpio-aggregator.ko\n' +
            '~ # [   50.910363] tsensor b003000.sensor: probe\n' +
            '[   50.911208] tsensor b003000.sensor: gated: [mem 0x0b003000-0x0b003fff] offset 38000 trip 70000/90000 poll 250 ms gpio yes -> tsensor1\n' +
            'cat /sys/kernel/debug/devices_deferred\n' +
            '~ # cat /dev/tsensor1\n' +
            '38000\n' +
            '~ # cat /sys/kernel/debug/gpio\n' +
            'gpiochip0: 8 GPIOs, parent: amba/9030000.pl061, 9030000.pl061:\n' +
            ' gpio-1   (                    |gpio-delay          ) out hi \n' +
            ' gpio-3   (                    |GPIO Key Poweroff   ) in  lo IRQ \n' +
            '\n' +
            'gpiochip1: 1 GPIOs, parent: platform/gpio-delay, gpio-delay:\n' +
            ' gpio-0   (                    |enable              ) out hi ' },

          { t: 'cal', kind: 'why', title: 'Không ai gọi lại probe — kernel tự làm',
            x: '<ul>' +
               '<li><code>insmod /gpio-aggregator.ko</code> không in gì của riêng nó. Nhưng nó làm ' +
               '<code>gpio-delay</code> bind, và <b>ngay sau đó</b> driver core thử lại danh sách chờ: ' +
               '<code>b003000.sensor: probe</code>, lần này thành công.</li>' +
               '<li>Dòng kết quả cho thấy hai giá trị mặc định đã được dùng: <code>trip 70000/90000</code> (node ' +
               'không khai <code>learn,trip-mdeg</code> → <code>-EINVAL</code> → mặc định), còn ' +
               '<code>poll 250</code> đến từ cây. <code>gpio yes</code>: đã có GPIO. Minor tiếp theo còn trống là ' +
               '1 → <code>tsensor1</code>, đọc ra <b>38000</b>.</li>' +
               '<li><code>devices_deferred</code> giờ rỗng.</li>' +
               '<li><code>/sys/kernel/debug/gpio</code> cho thấy chuỗi cung cấp đầy đủ: chân 1 của PL061 bị ' +
               '<code>gpio-delay</code> giữ; <code>gpio-delay</code> sinh ra <code>gpiochip1</code> một chân; ' +
               'chân 0 của nó mang nhãn <code>enable</code> (tên bạn đưa cho <code>devm_gpiod_get_optional</code>) ' +
               'và ở mức <code>out hi</code> — <code>GPIOD_OUT_HIGH</code> đã \"bật nguồn\" cảm biến.</li>' +
               '</ul>' },

          { t: 'p', x:
            'Gỡ driver lần cuối trong lần boot này, để thấy devres của cả hai cảm biến và xác nhận chân GPIO ' +
            'được trả:' },

          { t: 'code', where: 'qemu', code:
            'rmmod tsensor\n' +
            'dmesg | tail -n 8\n' +
            'cat /sys/kernel/debug/gpio' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod tsensor\n' +
            '[   56.907468] tsensor b003000.sensor: remove gated\n' +
            '[   56.909014] tsensor b000000.sensor: remove board\n' +
            '~ # dmesg | tail -n 8\n' +
            '[   56.907468] tsensor b003000.sensor: remove gated\n' +
            '[   56.907820] tsensor b003000.sensor: devres: device_destroy tsensor1\n' +
            '[   56.908494] tsensor b003000.sensor: devres: cdev_del\n' +
            '[   56.908617] tsensor b003000.sensor: devres: ida_free minor 1\n' +
            '[   56.909014] tsensor b000000.sensor: remove board\n' +
            '[   56.909164] tsensor b000000.sensor: devres: device_destroy tsensor0\n' +
            '[   56.909404] tsensor b000000.sensor: devres: cdev_del\n' +
            '[   56.909460] tsensor b000000.sensor: devres: ida_free minor 0\n' +
            '~ # cat /sys/kernel/debug/gpio\n' +
            'gpiochip0: 8 GPIOs, parent: amba/9030000.pl061, 9030000.pl061:\n' +
            ' gpio-1   (                    |gpio-delay          ) out hi \n' +
            ' gpio-3   (                    |GPIO Key Poweroff   ) in  lo IRQ \n' +
            '\n' +
            'gpiochip1: 1 GPIOs, parent: platform/gpio-delay, gpio-delay:' },

          { t: 'p', x:
            'Mỗi thiết bị có <b>ngăn xếp devres riêng</b>, và <code>platform_driver_unregister</code> tách ' +
            'chúng lần lượt — thiết bị bind <b>sau</b> (<code>b003000</code>) được tách trước ' +
            '(<code>driver_detach</code> lấy từ cuối danh sách, <code>drivers/base/dd.c</code>, dòng 1433). ' +
            'Trong từng thiết bị, thứ tự vẫn là 6 → 1. Dòng <code>gpio-0 … enable</code> đã biến mất khỏi ' +
            '<code>gpiochip1</code>: <code>gpiod_put</code> chạy dù bạn không viết nó ở đâu cả. Thoát QEMU ' +
            'bằng <code>poweroff -f</code>.' },

          { t: 'h4', x: 'Hàng rào còn lại: fw_devlink' },

          { t: 'p', x:
            'Nếu bạn <code>insmod /tsensor.ko</code> <b>trong vòng 10 giây</b> sau khi boot xong, kết quả khác ' +
            'đi ở đúng một chỗ. Để thấy nó một cách chắc chắn, boot lại với tham số ' +
            '<code>deferred_probe_timeout=600</code>, kéo mốc 10 giây ra thành 10 phút. Lần này cũng dùng ' +
            'một cây thứ hai, <code>short.dtb</code>, trong đó <code>sensor@b002000</code> có đủ ' +
            '<code>learn,offset-mdeg</code> nhưng <code>learn,trip-mdeg</code> chỉ có <b>một</b> ô — để thấy ' +
            'nhánh \"tuỳ chọn nhưng sai hình\":' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai54\n' +
            'cp board.dtb short.dtb\n' +
            'fdtput -t u short.dtb /sensor@b002000 learn,offset-mdeg 40000\n' +
            'fdtput -t u short.dtb /sensor@b002000 learn,trip-mdeg 65000\n' +
            'fdtget short.dtb /sensor@b002000 learn,trip-mdeg\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb short.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init deferred_probe_timeout=600"' },

          { t: 'cmdx', cmd: 'fdtput -t u short.dtb /sensor@b002000 learn,trip-mdeg 65000',
            rows: [
              ['<code>fdtput</code>', 'Sửa thẳng một property trong file <code>.dtb</code>, không qua <code>.dts</code>.', 'Bài 45 đã dùng nó; nhanh hơn sửa-dịch lại khi chỉ đổi một giá trị'],
              ['<code>-t u</code>', 'Kiểu giá trị: <b>u</b>nsigned, mỗi đối số là một ô 32 bit.', 'Một đối số → property dài 4 byte, driver đòi 8'],
              ['<code>learn,offset-mdeg 40000</code>', 'Thêm property bắt buộc mà node này vốn thiếu.', 'Để <code>probe</code> đi qua được dòng kiểm tra đầu tiên và tới dòng đọc mảng']
            ] },

          { t: 'p', x:
            '<code>fdtget</code> in <code>65000</code> — một ô. Ở dấu nhắc của máy ảo, gõ ngay, đừng chờ:' },

          { t: 'code', where: 'qemu', code:
            'mount -t debugfs none /sys/kernel/debug\n' +
            'ls /sys/bus/platform/devices/b003000.sensor\n' +
            'insmod /tsensor.ko\n' +
            'cat /sys/kernel/debug/devices_deferred' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/platform/devices/b003000.sensor\n' +
            'driver_override               subsystem\n' +
            'modalias                      supplier:platform:gpio-delay\n' +
            'of_node                       uevent\n' +
            'power                         waiting_for_supplier\n' +
            '~ # insmod /tsensor.ko\n' +
            '[   11.847492] tsensor: loading out-of-tree module taints kernel.\n' +
            '[   11.851319] tsensor b000000.sensor: probe\n' +
            '[   11.852089] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 42500 trip 60000/85000 poll 1000 ms gpio no -> tsensor0\n' +
            '[   11.852650] tsensor b002000.sensor: probe\n' +
            '[   11.852868] tsensor b002000.sensor: error -EOVERFLOW: learn,trip-mdeg needs 2 cells\n' +
            '[   11.853119] tsensor b002000.sensor: probe with driver tsensor failed with error -75\n' +
            '~ # cat /sys/kernel/debug/devices_deferred\n' +
            'b003000.sensor\tplatform: supplier gpio-delay not ready' },

          { t: 'cal', kind: 'why', title: 'Ba khác biệt so với lần trước, và mỗi cái có một lý do',
            x: '<ul>' +
               '<li><b><code>supplier:platform:gpio-delay</code></b> — một symlink mà <code>b000000.sensor</code> ' +
               'không có. Lúc boot, kernel quét cây, thấy <code>enable-gpios</code> trỏ phandle 1 tới ' +
               '<code>gpio-delay</code>, và nối sẵn một liên kết thiết bị (<i>fw_devlink</i>) trước khi có bất ' +
               'kỳ driver nào. Kernel biết cảm biến này cần ai mà không cần hỏi driver.</li>' +
               '<li><b>Không có dòng <code>b003000.sensor: probe</code>.</b> Lần này <code>probe()</code> của ' +
               'bạn <b>chưa được gọi lần nào</b>. <code>really_probe()</code> kiểm tra các liên kết nhà cung cấp ' +
               'trước (<code>drivers/base/dd.c</code>, dòng 680) và trả <code>-EPROBE_DEFER</code> ngay tại đó, ' +
               'với lý do <code>platform: supplier gpio-delay not ready</code> — chữ <code>platform:</code> vì ' +
               'người ghi là driver core của bus, không phải driver của bạn.</li>' +
               '<li><b><code>-EOVERFLOW</code>, mã 75.</b> Property có tồn tại (nên không phải ' +
               '<code>-EINVAL</code>) nhưng dài 4 byte, <code>of_property_read_u32_array(…, 2)</code> đòi 8. ' +
               'Nhánh \"sai hình\" trong <code>probe</code> từ chối thay vì lặng lẽ dùng mặc định.</li>' +
               '</ul>' +
               'Ở bước 3, <code>insmod</code> rơi vào giây thứ 20 — sau mốc 10 giây, kernel đã nới lỏng các liên kết ' +
               'nhà cung cấp chưa có driver (<code>fw_devlink_drivers_done()</code>), nên <code>probe()</code> được ' +
               'chạy và tự nhận <code>-EPROBE_DEFER</code> từ <code>devm_gpiod_get_optional</code>. Hai hàng rào, ' +
               'cùng một kết cục.' },

          { t: 'p', x:
            'Nạp nhà cung cấp để xác nhận hàng rào này cũng tự mở:' },

          { t: 'code', where: 'qemu', code:
            'insmod /gpio-aggregator.ko\n' +
            'cat /sys/kernel/debug/devices_deferred' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /gpio-aggregator.ko\n' +
            '~ # [   14.264377] tsensor b003000.sensor: probe\n' +
            '[   14.265403] tsensor b003000.sensor: gated: [mem 0x0b003000-0x0b003fff] offset 38000 trip 70000/90000 poll 250 ms gpio yes -> tsensor1\n' +
            'cat /sys/kernel/debug/devices_deferred\n' +
            '~ # ' },

          { t: 'p', x:
            'Giờ mới có dòng <code>probe</code> đầu tiên — và nó thành công ngay, vì nhà cung cấp đã sẵn sàng ' +
            'khi hàm của bạn chạy. Danh sách chờ rỗng. Thoát bằng <code>poweroff -f</code>.' },

          { t: 'cal', kind: 'info', title: 'Còn nếu nhà cung cấp không bao giờ đến?',
            x: 'Trên bo mạch thật, driver của nhà cung cấp có thể không được build. Khi mốc ' +
               '<code>deferred_probe_timeout</code> hết, kernel in cho mỗi thiết bị còn trong danh sách một dòng ' +
               '<code>deferred probe pending: …</code> kèm đúng lý do đã lưu (<code>drivers/base/dd.c</code>, ' +
               'dòng 317) — đây là dòng Bài 45 gặp với chân GPIO số 8. Rồi thiết bị cứ nằm đó; không có ' +
               '<code>/dev</code> nào được tạo. Vì vậy khi một thiết bị "không lên" mà log không có dòng lỗi nào, ' +
               '<code>devices_deferred</code> là chỗ đầu tiên cần xem.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Đo một rò rỉ bộ nhớ, rồi để devres sửa nó',
        blocks: [
          { t: 'p', x:
            'Lời hứa của phần lý thuyết là devres \"cứu bạn khỏi rò rỉ bộ nhớ\". Bước này đo điều đó bằng hai ' +
            'driver nhỏ nhất có thể, khác nhau đúng <b>một dòng</b>. <code>leaky.c</code> xin 2 KiB trong ' +
            '<code>probe</code> bằng <code>kzalloc</code> và quên <code>kfree</code> trong <code>remove</code> — lỗi ' +
            'phổ biến nhất của người mới viết driver:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai54/leaky && cd ~/bai54/leaky\n' +
            'nano leaky.c' },

          { t: 'code', where: 'file', name: '~/bai54/leaky/leaky.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/* Allocates a buffer in probe() and forgets to free it in remove() */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/of.h>\n' +
            '#include <linux/slab.h>\n' +
            '\n' +
            '#define LEAK_SIZE 2048\n' +
            '\n' +
            'static int leaky_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '	void *buf = kzalloc(LEAK_SIZE, GFP_KERNEL);\n' +
            '\n' +
            '	if (!buf)\n' +
            '		return -ENOMEM;\n' +
            '	platform_set_drvdata(pdev, buf);\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static void leaky_remove(struct platform_device *pdev)\n' +
            '{\n' +
            '	/* bug: kfree(platform_get_drvdata(pdev)) is missing */\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id leaky_of_match[] = {\n' +
            '	{ .compatible = "learn,temp-sensor" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, leaky_of_match);\n' +
            '\n' +
            'static struct platform_driver leaky_driver = {\n' +
            '	.probe  = leaky_probe,\n' +
            '	.remove = leaky_remove,\n' +
            '	.driver = {\n' +
            '		.name           = "leaky",\n' +
            '		.of_match_table = leaky_of_match,\n' +
            '	},\n' +
            '};\n' +
            'module_platform_driver(leaky_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("probe() allocates, remove() forgets");' },

          { t: 'p', x:
            'Bản sửa, <code>tidy.c</code>, được sinh từ <code>leaky.c</code> bằng <code>sed</code> để bạn chắc ' +
            'chắn không có khác biệt nào ngoài những gì <code>diff</code> in ra:' },

          { t: 'code', where: 'wsl', code:
            'sed -e \'s/kzalloc(LEAK_SIZE/devm_kzalloc(\\&pdev->dev, LEAK_SIZE/\' \\\n' +
            '    -e \'s/leaky/tidy/g\' \\\n' +
            '    -e \'s/forgets to free it in remove()/lets devres free it/\' \\\n' +
            '    -e \'s/remove() forgets/devres frees/\' \\\n' +
            '    -e \'s|/\\* bug: .* \\*/|/* nothing to free: devres does it */|\' leaky.c > tidy.c\n' +
            'diff leaky.c tidy.c | grep \'^[<>]\' | grep -v \'leaky_\\|tidy_\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '< /* Allocates a buffer in probe() and forgets to free it in remove() */\n' +
            '> /* Allocates a buffer in probe() and lets devres free it */\n' +
            '< \tvoid *buf = kzalloc(LEAK_SIZE, GFP_KERNEL);\n' +
            '> \tvoid *buf = devm_kzalloc(&pdev->dev, LEAK_SIZE, GFP_KERNEL);\n' +
            '< \t/* bug: kfree(platform_get_drvdata(pdev)) is missing */\n' +
            '> \t/* nothing to free: devres does it */\n' +
            '< \t\t.name           = "leaky",\n' +
            '> \t\t.name           = "tidy",\n' +
            '< MODULE_DESCRIPTION("probe() allocates, remove() forgets");\n' +
            '> MODULE_DESCRIPTION("probe() allocates, devres frees");' },

          { t: 'cmdx', cmd: 'sed -e \'s/kzalloc(LEAK_SIZE/devm_kzalloc(\\&pdev->dev, LEAK_SIZE/\' …',
            rows: [
              ['<code>\\&amp;</code>', 'Trong phần thay thế của <code>sed</code>, <code>&amp;</code> trơn nghĩa là \"cả đoạn vừa khớp\". <code>\\&amp;</code> là ký tự <code>&amp;</code> thật.', 'Quên dấu <code>\\</code> sẽ sinh ra <code>devm_kzalloc(kzalloc(LEAK_SIZEpdev-&gt;dev, …</code>'],
              ['<code>s/leaky/tidy/g</code>', 'Đổi mọi tên hàm, bảng và chuỗi <code>.name</code>.', 'Hai module cùng tên <code>.name</code> sẽ tranh một thư mục trong <code>/sys/bus/platform/drivers/</code>'],
              ['<code>s|…|…|</code>', 'Dùng <code>|</code> làm dấu phân cách thay cho <code>/</code>.', 'Vì chính mẫu cần tìm chứa <code>/*</code> và <code>*/</code>'],
              ['<code>grep -v \'leaky_\\|tidy_\'</code>', 'Ẩn các dòng chỉ khác tên hàm.', 'Còn lại đúng những khác biệt có nghĩa']
            ] },

          { t: 'p', x:
            'Năm cặp dòng: ba cặp là chú thích và tên, một cặp là <code>MODULE_DESCRIPTION</code>, và đúng ' +
            '<b>một</b> cặp thay đổi hành vi — <code>kzalloc(…)</code> thành ' +
            '<code>devm_kzalloc(&amp;pdev-&gt;dev, …)</code>. <code>tidy_remove</code> vẫn rỗng; lần này rỗng là ' +
            'đúng. Build cả hai bằng một Makefile, rồi thêm vào initramfs:' },

          { t: 'code', where: 'wsl', code:
            'sed -e \'s/^obj-m := tsensor.o/obj-m := leaky.o tidy.o/\' -e \'/^CFLAGS_/d\' ../tsensor/Makefile > Makefile\n' +
            'make 2>&1 | grep -E \'warning|error|LD\'\n' +
            'cd ~/bai54\n' +
            'cp leaky/leaky.ko leaky/tidy.ko initramfs/\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  LD [M]  leaky.ko\n' +
            '  LD [M]  tidy.ko\n' +
            '4624 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1117705 Sep 30 10:52 initramfs.cpio.gz',
            notes: ['Kích thước nén lệch vài byte giữa các lần đóng gói (máy viết bài đo 1 117 705–1 117 718 byte).'] },

          { t: 'p', x:
            'Hai dòng <code>LD</code>, không cảnh báo. Boot lại với <code>board.dtb</code> bằng đúng lệnh của ' +
            'bước 3, đợi khoảng 10 giây sau dấu nhắc. Công cụ đo là <code>/proc/slabinfo</code>: kernel cấp mọi ' +
            '<code>kmalloc</code> từ các \"khay\" kích thước cố định (Bài 51 đã đo các cỡ 8, 16, …, 8192), và ' +
            'khay <code>kmalloc-2k</code> chứa đúng những khối 2 048 byte như <code>LEAK_SIZE</code>:' },

          { t: 'code', where: 'qemu', code:
            'grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'grep SUnreclaim /proc/meminfo\n' +
            'insmod /leaky.ko\n' +
            'ls /sys/bus/platform/drivers/leaky' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'kmalloc-4k            32     32   4096    8    8 : tunables    0    0    0 : slabdata      4      4      0\n' +
            'kmalloc-2k            80     80   2048    8    4 : tunables    0    0    0 : slabdata     10     10      0\n' +
            '~ # grep SUnreclaim /proc/meminfo\n' +
            'SUnreclaim:         5724 kB\n' +
            '~ # insmod /leaky.ko\n' +
            '[   17.869929] leaky: loading out-of-tree module taints kernel.\n' +
            '~ # ls /sys/bus/platform/drivers/leaky\n' +
            'b000000.sensor  b003000.sensor  module          unbind\n' +
            'b002000.sensor  bind            uevent' },

          { t: 'cmdx', cmd: 'kmalloc-2k  80  80  2048  8  4 : … : slabdata  10  10  0',
            title: 'Đọc một dòng /proc/slabinfo',
            rows: [
              ['<code>80</code> <code>80</code>', 'Số đối tượng đang dùng / tổng số đối tượng có trong khay.', 'Dòng đầu của file (<code>head -n 2 /proc/slabinfo</code>) ghi tên cột: <code>active_objs</code>, <code>num_objs</code>'],
              ['<code>2048</code>', 'Cỡ mỗi đối tượng, byte.', ''],
              ['<code>8</code> <code>4</code>', '8 đối tượng mỗi \"slab\", mỗi slab chiếm 4 trang (16 KiB).', '8 × 2 048 = 16 384'],
              ['<code>slabdata 10 10</code>', 'Số slab đang có.', '10 slab × 8 = 80 đối tượng, khớp cột 2']
            ] },

          { t: 'p', x:
            'Trước khi làm gì: <b>80</b> đối tượng 2 KiB trong <b>10</b> slab, <code>SUnreclaim</code> ' +
            '(bộ nhớ slab không thu hồi được — Bài 51) là <b>5 724 kB</b>. <code>leaky</code> nhận <b>cả ba</b> ' +
            'cảm biến: nó không đòi property nào nên <code>b002000</code> không bị từ chối, và không xin GPIO nên ' +
            '<code>b003000</code> không phải chờ (hàng rào fw_devlink đã được nới ở giây thứ 10). Giờ tháo ra lắp ' +
            'vào <code>b000000</code> <b>1 000 lần</b> — việc mà một thiết bị cắm-rút, một lần tắt/bật nguồn ' +
            'khối, hay một phiên thử nghiệm tự động làm hằng ngày:' },

          { t: 'code', where: 'qemu', code:
            'cd /sys/bus/platform/drivers/leaky\n' +
            'for i in $(seq 1000); do echo b000000.sensor >unbind; echo b000000.sensor >bind; done\n' +
            'grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'grep SUnreclaim /proc/meminfo\n' +
            'cd /; rmmod leaky\n' +
            'grep SUnreclaim /proc/meminfo' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/drivers/leaky # grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'kmalloc-4k            32     32   4096    8    8 : tunables    0    0    0 : slabdata      4      4      0\n' +
            'kmalloc-2k          1080   1080   2048    8    4 : tunables    0    0    0 : slabdata    135    135      0\n' +
            '/sys/bus/platform/drivers/leaky # grep SUnreclaim /proc/meminfo\n' +
            'SUnreclaim:         7772 kB\n' +
            '/sys/bus/platform/drivers/leaky # cd /; rmmod leaky\n' +
            '~ # grep SUnreclaim /proc/meminfo\n' +
            'SUnreclaim:         7772 kB',
            notes: ['Vòng lặp mất vài giây. <code>SUnreclaim</code> có thể lệch vài kB giữa các lần boot (máy viết bài đo 5 724 và 5 768 kB lúc đầu); hiệu số mới là thứ cần nhìn. Cột <code>kmalloc-2k</code> cho đúng 80 → 1080 ở cả ba lần chạy.'] },

          { t: 'cal', kind: 'danger', title: '1 000 lần bind, 1 000 khối mất tích, 2 MB không bao giờ quay lại',
            x: '<ul>' +
               '<li><code>kmalloc-2k</code>: <b>80 → 1 080</b>, đúng <b>1 000</b> đối tượng thêm vào, một cho mỗi ' +
               'lần <code>probe</code>. Số slab: 10 → 135, tức 125 slab × 16 KiB = <b>2 000 KiB</b>.</li>' +
               '<li><code>SUnreclaim</code>: 5 724 → <b>7 772 kB</b>, tăng 2 048 kB — khớp 2 000 KiB ở trên trong vòng ' +
               '48 kB. Phần chênh nhỏ đó nằm ở các khay khác; bài không truy tiếp.</li>' +
               '<li><b><code>rmmod leaky</code> không trả lại byte nào</b>: 7 772 kB trước và sau. Kernel không ' +
               'ghi ai sở hữu một khối <code>kmalloc</code>. Con trỏ duy nhất tới mỗi khối nằm trong ' +
               '<code>drvdata</code> của thiết bị, và driver core đặt nó về <code>NULL</code> ngay khi tách thiết bị ' +
               '(<code>dev_set_drvdata(dev, NULL)</code>, <code>drivers/base/dd.c</code>, dòng 614). Sau lần ' +
               '<code>unbind</code> đầu tiên, không còn ai trên đời biết khối đó ở đâu. Chỉ khởi động lại mới lấy ' +
               'lại được.</li>' +
               '</ul>' +
               'Trên thiết bị nhúng 64 MB RAM chạy liên tục nhiều tháng, một rò rỉ 2 KiB mỗi lần tái khởi tạo là ' +
               'thứ giết sản phẩm, và nó không bao giờ hiện ra trong thử nghiệm ngắn.' },

          { t: 'p', x:
            'Cùng phép đo, cùng lần boot, với <code>tidy</code>:' },

          { t: 'code', where: 'qemu', code:
            'insmod /tidy.ko\n' +
            'cd /sys/bus/platform/drivers/tidy\n' +
            'for i in $(seq 1000); do echo b000000.sensor >unbind; echo b000000.sensor >bind; done\n' +
            'grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'grep SUnreclaim /proc/meminfo\n' +
            'cd /; rmmod tidy\n' +
            'grep SUnreclaim /proc/meminfo' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/sys/bus/platform/drivers/tidy # grep -E \'^kmalloc-(2k|4k) \' /proc/slabinfo\n' +
            'kmalloc-4k            32     32   4096    8    8 : tunables    0    0    0 : slabdata      4      4      0\n' +
            'kmalloc-2k          1080   1080   2048    8    4 : tunables    0    0    0 : slabdata    135    135      0\n' +
            '/sys/bus/platform/drivers/tidy # grep SUnreclaim /proc/meminfo\n' +
            'SUnreclaim:         7764 kB\n' +
            '/sys/bus/platform/drivers/tidy # cd /; rmmod tidy\n' +
            '~ # grep SUnreclaim /proc/meminfo\n' +
            'SUnreclaim:         7764 kB' },

          { t: 'cal', kind: 'why', title: 'Một dòng khác nhau, tăng trưởng bằng 0',
            x: 'Sau 1 000 vòng giống hệt, cả hai khay đứng yên: <code>kmalloc-2k</code> vẫn <b>1 080</b> (1 000 ' +
               'khối của <code>leaky</code> còn nằm đó, không thêm cái nào), <code>kmalloc-4k</code> vẫn <b>32</b>, ' +
               '<code>SUnreclaim</code> 7 772 → 7 764 kB — dao động vài kB là nhiễu: sáu lần chạy của máy viết bài ' +
               'cho hiệu số từ −8 tới +12 kB, không lần nào gần 2 048. Mỗi <code>unbind</code> kích hoạt <code>devres_release_all</code>, khối vừa xin ' +
               'được trả ngay, và <code>bind</code> tiếp theo nhận lại đúng chỗ trống đó. Không một dòng ' +
               '<code>kfree</code> nào được viết.' },

          { t: 'cal', kind: 'info', title: 'Giới hạn của phép đo này',
            x: '<code>/proc/slabinfo</code> đếm theo slab: trong kernel này (SLUB), khối nằm trên slab đang dùng ' +
               'của mỗi CPU được tính là \"đang dùng\" dù còn trống. Vì thế ba lần <code>probe</code> đầu tiên lúc ' +
               '<code>insmod /leaky.ko</code> không làm số 80 nhúc nhích. Với rò rỉ lớn và lặp lại, xu hướng là ' +
               'đáng tin; để truy một rò rỉ nhỏ tới đúng dòng mã, kernel có <code>kmemleak</code> ' +
               '(<code>CONFIG_DEBUG_KMEMLEAK</code>, đang tắt trong cấu hình của bạn).' },

          { t: 'cal', kind: 'tip', title: 'Giữ lại ~/bai54',
            x: '<code>~/bai54</code> nặng khoảng <b>5,5 MB</b>. Giữ <code>tsensor/</code>, <code>board.dts</code> ' +
               'và <code>board.dtb</code> nếu muốn tự thay hàm <code>ts_read_mdeg</code> bằng một lần đọc thanh ghi ' +
               'thật sau Bài 56. <code>~/bai53</code> giờ có thể xoá — bài này chỉ mượn <code>Makefile</code> của nó. ' +
               '<code>leaky/</code> và <code>short.dtb</code> thì xoá tuỳ ý.' }
        ] }
    ] },

    /* ============================================================
       7. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>error: initialization of ‘void (*)(struct platform_device *)’ from incompatible pointer type ‘int (*)(struct platform_device *)’</code>',
         '<code>remove</code> viết theo kiểu cũ, trả <code>int</code>. Kernel 6.18 khai nó trả <code>void</code>, và build kernel coi cảnh báo kiểu con trỏ là lỗi (<code>-Werror=incompatible-pointer-types</code>).',
         'Đổi thành <code>static void foo_remove(struct platform_device *pdev)</code> và bỏ <code>return 0;</code>.'],
        ['<code>insmod</code> thành công, không có dòng <code>probe</code> nào; <code>ls /sys/bus/platform/drivers/tsensor</code> chỉ có <code>bind module uevent unbind</code>',
         'Không có thiết bị nào khớp. Hai nguyên nhân đã gặp khi viết bài: (1) gõ sai chuỗi trong <code>of_match_table</code> — <code>"learn,temp-sensr"</code> so với <code>modalias</code> <code>of:NsensorT(null)Clearn,temp-sensor</code>; (2) boot <b>quên <code>-dtb board.dtb</code></b> — <code>ls /sys/bus/platform/devices | grep -c sensor</code> ra <code>0</code>.',
         'So <code>cat /sys/bus/platform/devices/…/modalias</code> với <code>modinfo … | grep alias</code> từng ký tự. Nếu không có thiết bị nào, xem lại dòng lệnh QEMU.'],
        ['<code>error -EINVAL: learn,offset-mdeg missing</code><br><code>probe with driver tsensor failed with error -22</code>',
         'Node thiếu một property bắt buộc. <code>-EINVAL</code> từ <code>of_property_read_*</code> luôn có nghĩa \"không có property này\".',
         'Thêm property vào node. Kiểm tra bằng <code>fdtget board.dtb /node tên</code> trước khi boot.'],
        ['<code>error -EOVERFLOW: learn,trip-mdeg needs 2 cells</code><br><code>… failed with error -75</code>',
         'Property có, nhưng số ô khác số driver đòi (ở đây 1 ô, driver đọc 2).',
         '<code>fdtget</code> in từng ô cách nhau dấu cách — đếm chúng. Sửa node, hoặc nếu binding cho phép độ dài thay đổi, dùng <code>of_property_count_u32_elems</code> trước.'],
        ['<code>devices_deferred</code>: <code>platform: supplier gpio-delay not ready</code>, <code>probe()</code> không được gọi',
         'fw_devlink đã thấy phụ thuộc trong cây và chặn thiết bị trước khi tới driver, vì nhà cung cấp chưa có driver. Chỉ thấy trong 10 giây đầu (hoặc khi có <code>deferred_probe_timeout=</code>).',
         'Nạp driver của nhà cung cấp (<code>insmod /gpio-aggregator.ko</code>). Không cần làm gì với driver của bạn.'],
        ['<code>devices_deferred</code>: <code>tsensor: enable gpio</code>',
         '<code>probe()</code> đã chạy và <code>devm_gpiod_get_optional</code> trả <code>-EPROBE_DEFER</code>: bộ GPIO trong <code>enable-gpios</code> chưa được đăng ký.',
         'Như trên. Nếu nhà cung cấp không bao giờ đến, sau timeout sẽ có dòng <code>deferred probe pending</code>.'],
        ['<code>cat: can\'t open \'/sys/kernel/debug/devices_deferred\': No such file or directory</code>',
         'debugfs chưa được gắn — initramfs của Bài 32 không tự gắn nó (Bài 53).',
         '<code>mount -t debugfs none /sys/kernel/debug</code>.'],
        ['<code>ls: /dev/tsensor*: No such file or directory</code> dù <code>probe</code> báo <code>-&gt; tsensor0</code>',
         'devtmpfs chưa được gắn — <code>/dev</code> chỉ có <code>console</code> (Bài 52).',
         '<code>mount -t devtmpfs none /dev</code>, rồi <code>ls</code> lại: node đã được tạo sẵn, chỉ chưa nhìn thấy.'],
        ['<code>kmalloc-2k</code> / <code>SUnreclaim</code> tăng sau mỗi vòng <code>unbind</code>/<code>bind</code>, không giảm sau <code>rmmod</code>',
         'Rò rỉ: <code>probe</code> xin bằng bản thường, <code>remove</code> quên trả. Con trỏ đã mất khi driver core xoá <code>drvdata</code>.',
         'Đổi sang <code>devm_*</code>. Với tài nguyên không có bản <code>devm_</code>, dùng <code>devm_add_action_or_reset</code>. Chỉ khởi động lại mới lấy lại được bộ nhớ đã mất.']
      ] },

    /* ============================================================
       8. TÓM TẮT
       ============================================================ */
    { t: 'recap', items: [
      'Platform bus là bus ảo cho các thiết bị <b>câm</b> trên SoC. Device Tree sinh <b><code>platform_device</code></b> lúc boot, module nộp <b><code>platform_driver</code></b> lúc <code>insmod</code>, driver core gọi <b><code>probe()</code> một lần cho mỗi cặp khớp</b> — bài này: 3 lời gọi, 3 kết cục.',
      '<b>Module = một lần, thiết bị = mỗi lần.</b> <code>module_init</code> chỉ giữ tài nguyên chung (dải số, lớp); mọi thứ gắn với một con chip thuộc về <code>probe</code>.',
      '<code>reg</code> đến dưới dạng <code>struct resource</code> (<code>platform_get_resource</code>); mọi property khác đọc bằng <code>of_property_read_*</code>. Mã trả về phân biệt <b>không có</b> (<code>-EINVAL</code>, 22) với <b>sai hình</b> (<code>-EOVERFLOW</code>, 75).',
      'Ba mẫu đọc property: <b>bắt buộc</b> → trả lỗi; <b>tuỳ chọn</b> → gán mặc định trước rồi đọc; <b>tuỳ chọn nhưng phải đúng hình</b> → chỉ <code>-EINVAL</code> mới dùng mặc định.',
      '<b>devres</b> là ngăn xếp tài nguyên của từng thiết bị, trả <b>ngược thứ tự xin</b> khi <code>probe</code> lỗi, <code>unbind</code> hay <code>rmmod</code>. <code>ts_probe</code>: 0 <code>goto</code>, 0 <code>kfree</code>, 13 <code>return</code> an toàn. Thứ gì không có bản <code>devm_</code> → <code>devm_add_action_or_reset</code>.',
      '<b><code>-EPROBE_DEFER</code></b> = \"gọi lại tôi sau\". Thiết bị vào <code>/sys/kernel/debug/devices_deferred</code> và được thử lại <b>mỗi khi một driver bất kỳ bind</b>. <code>dev_err_probe</code> ghi lý do thay vì in lỗi.',
      'Hai hàng rào: <b>fw_devlink</b> chặn trước cả <code>probe()</code> (<code>platform: supplier … not ready</code>), rồi sau <b>10 giây</b> nhường cho chính <code>probe()</code> (<code>tsensor: enable gpio</code>).',
      'Quên <code>kfree</code> trong <code>remove</code>: <b>1 000</b> vòng <code>unbind</code>/<code>bind</code> → <code>kmalloc-2k</code> <b>80 → 1 080</b>, <code>SUnreclaim</code> <b>+2 048 kB</b>, <code>rmmod</code> không trả lại gì. Đổi một dòng sang <code>devm_kzalloc</code>: tăng trưởng <b>0</b>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Cảm biến của bạn giờ chỉ nói khi được hỏi: mỗi lần <code>cat /dev/tsensor0</code>, driver mới đi ' +
         'lấy giá trị. Phần cứng thật thì ngược lại — nó <b>tự báo</b> khi nhiệt độ vượt ngưỡng, bằng một ' +
         'ngắt. <b>Bài 55 — Ngắt và xử lý trễ</b> đi theo một ngắt từ bộ điều khiển GIC của máy ' +
         '<code>virt</code> tới hàm xử lý của bạn: <code>request_irq</code> (và bản ' +
         '<code>devm_request_irq</code> của nó), top half và bottom half, softirq, tasklet, workqueue, threaded ' +
         'IRQ — và câu hỏi quan trọng nhất: đoạn mã nào được phép ngủ. Bạn sẽ thấy con số của từng ngắt tăng ' +
         'lên trong <code>/proc/interrupts</code>.' }
  ],

  quiz: [
    { q: 'Cây có ba node <code>okay</code> cùng <code>compatible = "learn,temp-sensor"</code> và một node cùng chuỗi đó nhưng <code>status = "disabled"</code>. Bạn <code>insmod</code> driver có chuỗi đó trong <code>of_match_table</code>, sau mốc 10 giây như ở bước 3. Ngay lúc <code>insmod</code>, <code>probe()</code> được gọi bao nhiêu lần (tính cả lần trả lỗi)?',
      opts: ['1 lần — một lần cho cả module', '3 lần', '4 lần', '0 lần cho tới khi bạn ghi vào <code>bind</code>'],
      a: 1,
      why: '<code>probe()</code> là \"init cho một thiết bị\": driver core gọi nó một lần cho mỗi cặp thiết bị–driver khớp. Node <code>disabled</code> không bao giờ trở thành <code>platform_device</code> (nó vắng mặt trong <code>/sys/bus/platform/devices</code> ở bước 3), nên không có gì để gọi. Bước 3 cho đúng ba dòng <code>probe</code>: <code>b000000</code> nhận, <code>b002000</code> từ chối, <code>b003000</code> bị hoãn. Lời gọi bị hoãn vẫn là một lời gọi — và còn được lặp lại về sau.' },

    { q: 'Node không có property <code>learn,poll-ms</code>. Đoạn nào đúng mẫu \"tuỳ chọn, mặc định 1000\"?',
      opts: [
        '<code>if (of_property_read_u32(np, "learn,poll-ms", &amp;ts-&gt;poll_ms)) return -EINVAL;</code>',
        '<code>ts-&gt;poll_ms = 1000; of_property_read_u32(np, "learn,poll-ms", &amp;ts-&gt;poll_ms);</code>',
        '<code>of_property_read_u32(np, "learn,poll-ms", &amp;ts-&gt;poll_ms); ts-&gt;poll_ms = 1000;</code>',
        '<code>ts-&gt;poll_ms = of_property_read_u32(np, "learn,poll-ms", NULL) ?: 1000;</code>'
      ],
      a: 1,
      why: 'Các hàm <code>of_property_read_*</code> <b>không đụng tới biến đích khi thất bại</b>. Gán mặc định trước rồi đọc: có property thì giá trị cây đè lên, không có thì mặc định còn nguyên. Đó là lý do bước 3 in <code>poll 1000</code> cho <code>b000000</code> và <code>poll 250</code> cho <code>b003000</code>. Phương án 1 biến property tuỳ chọn thành bắt buộc; phương án 3 luôn ghi đè giá trị từ cây; phương án 4 gán <b>mã lỗi</b> (0 hoặc −22) chứ không phải giá trị đọc được.' },

    { q: '<code>cat /sys/kernel/debug/devices_deferred</code> in <code>b003000.sensor&lt;Tab&gt;platform: supplier gpio-delay not ready</code>, và <code>dmesg</code> không có dòng <code>b003000.sensor: probe</code> nào. Điều nào đúng?',
      opts: [
        '<code>probe()</code> của bạn đã trả <code>-EPROBE_DEFER</code> với thông điệp đó',
        'fw_devlink đã chặn thiết bị vì nhà cung cấp <code>gpio-delay</code> chưa có driver; <code>probe()</code> của bạn chưa chạy lần nào',
        'Node <code>gpio-delay</code> sai cú pháp nên <code>dtc</code> bỏ qua',
        'Driver <code>tsensor</code> chưa được nạp'
      ],
      a: 1,
      why: 'Hai manh mối trùng nhau. Tiền tố của lý do là tên người ghi: <code>platform:</code> là bus, nghĩa là driver core ghi nó từ <code>device_links_check_suppliers()</code> — nếu <code>probe()</code> của bạn ghi, tiền tố sẽ là <code>tsensor:</code> và thông điệp là chuỗi bạn đưa cho <code>dev_err_probe</code>. Và không có dòng <code>probe</code> nào vì <code>really_probe()</code> dừng trước khi gọi driver. Bước 4 thấy đúng tình huống này khi <code>insmod</code> trong 10 giây đầu với <code>deferred_probe_timeout=600</code>. Driver chưa nạp thì thiết bị đã không có trong danh sách hoãn.' },

    { q: 'Trong <code>probe</code>, bạn gọi lần lượt <code>devm_kzalloc</code> (A), <code>devm_request_mem_region</code> (B), rồi <code>cdev_add</code> + <code>devm_add_action_or_reset(…, del_cdev, …)</code> (C). Khi <code>unbind</code>, thứ tự giải phóng là gì?',
      opts: ['A → B → C', 'C → B → A', 'Theo thứ tự <code>remove()</code> tự gọi', 'Không xác định — devres giải phóng song song'],
      a: 1,
      why: 'devres là ngăn xếp: mỗi <code>devm_*</code> thành công đẩy một mục lên trên, và <code>release_nodes()</code> đi danh sách bằng <code>list_for_each_entry_safe_reverse</code>. Thứ xin sau cùng được trả trước tiên. Bước 3 in đúng thứ tự đó: <code>device_destroy</code> → <code>cdev_del</code> → <code>ida_free</code>, ngược với thứ tự trong <code>ts_probe</code>. Thứ tự ngược là bắt buộc vì thứ xin sau thường dùng thứ xin trước.' },

    { q: 'Driver xin 2 KiB bằng <code>kzalloc</code> trong <code>probe</code> và không <code>kfree</code> trong <code>remove</code>. Sau 1 000 vòng <code>unbind</code>/<code>bind</code> bạn chạy <code>rmmod</code>. Bộ nhớ đó thế nào?',
      opts: [
        'Được trả khi <code>rmmod</code>, vì kernel giải phóng mọi thứ module đã xin',
        'Được trả khi <code>rmmod</code>, nhưng chỉ phần của lần <code>probe</code> cuối',
        'Mất cho tới lần khởi động lại: kernel không ghi ai sở hữu một khối <code>kmalloc</code>, và con trỏ duy nhất nằm trong <code>drvdata</code> đã bị xoá khi <code>unbind</code>',
        'Được kernel tự thu hồi khi thiếu bộ nhớ'
      ],
      a: 2,
      why: 'Bước 5 đo đúng điều đó: <code>kmalloc-2k</code> 80 → 1 080, <code>SUnreclaim</code> 5 724 → 7 772 kB, và vẫn 7 772 kB sau <code>rmmod</code>. <code>kmalloc</code> không gắn khối với module nào. Driver core đặt <code>drvdata</code> về <code>NULL</code> khi tách thiết bị (<code>dd.c</code> dòng 614), nên sau mỗi <code>unbind</code> khối đó mồ côi vĩnh viễn. Bộ nhớ slab loại này là <i>unreclaimable</i> — không cơ chế nào thu hồi được. <code>devm_kzalloc</code> sửa bằng một dòng vì devres <b>có</b> ghi chủ sở hữu: chính thiết bị.' },

    { q: 'Bạn nạp driver xong, không thấy dòng <code>probe</code> nào, và <code>ls /sys/bus/platform/drivers/tsensor</code> chỉ có <code>bind module uevent unbind</code>. <code>cat /sys/bus/platform/devices/b000000.sensor/modalias</code> in <code>of:NsensorT(null)Clearn,temp-sensor</code>. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Node thiếu property bắt buộc',
        'Nhà cung cấp GPIO chưa nạp',
        'Chuỗi trong <code>of_match_table</code> của driver không trùng từng ký tự với <code>learn,temp-sensor</code>',
        'devtmpfs chưa được gắn'
      ],
      a: 2,
      why: 'Thiết bị tồn tại (có <code>modalias</code>), driver đã đăng ký (thư mục có), nhưng không có lời gọi <code>probe</code> nào — tức driver core chưa từng thấy chúng khớp. Thiếu property hay thiếu nhà cung cấp đều chỉ xảy ra <i>sau</i> khi đã khớp: sẽ có ít nhất một dòng <code>probe</code>, hoặc một mục trong <code>devices_deferred</code>. devtmpfs chỉ ảnh hưởng tới <code>/dev</code>. Khi viết bài, một bản driver gõ <code>"learn,temp-sensr"</code> cho đúng triệu chứng này. Cách kiểm: so <code>modalias</code> của thiết bị với dòng <code>alias</code> trong <code>modinfo</code> của module.' }
  ]
});

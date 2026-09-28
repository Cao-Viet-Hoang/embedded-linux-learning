/* Bài 44 — Binding và cơ chế khớp driver
   Chặng 08 — Device Tree
   Bài thứ ba của Chặng 08. Dạy phần "ý nghĩa" mà Bài 43 cố tình để trống: binding là hợp đồng
   giữa người viết DTS và người viết driver; of_match_table là nửa phía driver của hợp đồng;
   kernel duyệt cây, tạo platform_device, so compatible và gọi probe() ra sao. Thực hành chạy
   dtschema (dt_binding_check, dt-validate, CHECK_DTBS) trên host, rồi boot QEMU với
   initcall_debug để thấy từng lần gọi probe(), và tự tay unbind/bind qua sysfs.
   Mọi số liệu đo 2026-09-28 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   dtschema 2026.9), cây ~/bai38/linux-6.18.45 dựng lại cùng ngày. Bài này KHÔNG sửa DTB rồi
   nạp lại — đó là Bài 45. Bài này cũng không viết driver — đó là Bài 50 và Bài 54. */

Lesson.register({
  id: 'bai-44',
  title: 'Binding và cơ chế khớp driver',
  minutes: 55,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 43 bạn viết <code>compatible = \"learn,led-ctrl\"</code> vào một node, và ' +
    '<code>dtc</code> dịch trơn tru không một lời phàn nàn. Không có driver nào tên như vậy. ' +
    'Không có tài liệu nào nói node đó cần những thuộc tính gì. <code>dtc</code> vẫn vui vẻ ' +
    'cho qua, vì nó chỉ kiểm tra <i>cú pháp</i>. Nếu bạn nạp cây đó vào một bo mạch thật, ' +
    'kernel sẽ boot bình thường và node kia đơn giản là <b>không làm gì cả</b> — không lỗi, ' +
    'không cảnh báo. Đó là kiểu bug \"bo mạch im lặng\" mà Bài 38 đã báo trước.<br><br>' +
    'Bài này trả lời hai câu hỏi mà <code>dtc</code> không trả lời được. Thứ nhất: <b>ai ' +
    'quy định</b> một node <code>\"virtio,mmio\"</code> phải có những thuộc tính nào? Câu trả ' +
    'lời là <b>binding</b> — một file YAML trong <code>Documentation/devicetree/bindings/</code>, ' +
    'và có một công cụ kiểm tra cây của bạn theo đúng file đó. Thứ hai: khi kernel đọc cây, ' +
    'nó <b>làm thế nào</b> để từ một chuỗi ký tự đi tới việc gọi đúng hàm ' +
    '<code>probe()</code> của đúng driver? Câu trả lời nằm trong vài hàm C của ' +
    '<code>drivers/of/</code> và <code>drivers/base/</code>, và bạn sẽ đọc chúng.<br><br>' +
    'Phần hay nhất nằm ở cuối: bạn sẽ boot máy ảo với một tham số khiến kernel <b>in ra từng ' +
    'lần gọi <code>probe()</code></b>, kèm giá trị trả về. Bạn sẽ thấy 32 thiết bị cùng khớp ' +
    'một driver nhưng chỉ một thiết bị được nhận — rồi tự tay gỡ driver khỏi thiết bị đó và ' +
    'gắn lại, bằng một lệnh <code>echo</code>.',

  goals: [
    'Đọc được một file binding YAML: tìm ra thuộc tính nào <b>bắt buộc</b>, thuộc tính nào ' +
      'được phép, và giá trị nào hợp lệ cho <code>compatible</code>.',
    'Chạy được <code>dtschema</code> theo ba cách — <code>dt_binding_check</code>, ' +
      '<code>dt-validate</code> và <code>CHECK_DTBS=y</code> — và giải thích được vì sao ' +
      '<code>dtc</code> im lặng ở chỗ công cụ này lên tiếng.',
    'Chỉ ra được hai nửa của một cuộc khớp: chuỗi <code>compatible</code> trong cây, và ' +
      'bảng <code>of_match_table</code> trong driver — và biết <code>MODULE_DEVICE_TABLE</code> ' +
      'biến bảng đó thành alias để nạp module tự động.',
    'Giải thích được vì sao chuỗi <b>đứng trước</b> trong <code>compatible</code> thắng, ' +
      'bằng chính công thức chấm điểm trong <code>drivers/of/base.c</code>.',
    'Kể được đường đi từ node trong cây tới lời gọi <code>probe()</code>: ' +
      '<code>of_platform_populate</code> → <code>platform_device</code> → ' +
      '<code>platform_match</code> → <code>really_probe</code> → <code>probe()</code>.',
    'Quan sát được <code>probe()</code> chạy thật bằng <code>initcall_debug</code>, đọc được ' +
      'giá trị trả về <code>0</code> và <code>19</code>, và gỡ/gắn driver bằng ' +
      '<code>unbind</code>/<code>bind</code> trong <code>/sys</code>.'
  ],

  blocks: [

    /* ============================================================
       1. HAI BÊN CỦA MỘT HỢP ĐỒNG
       ============================================================ */
    { t: 'h2', x: 'Hai người không bao giờ gặp nhau, và một chuỗi ký tự nối họ lại' },

    { t: 'p', x:
      'Hình dung hai kỹ sư. Người thứ nhất làm ở hãng bo mạch, viết file <code>.dts</code> mô ' +
      'tả con chip RTC gắn trên bo. Người thứ hai làm ở hãng bán chip RTC, viết driver cho ' +
      'kernel. Họ không quen nhau, không làm cùng công ty, có thể cách nhau mười năm. Thế mà ' +
      'khi kernel boot, driver của người thứ hai phải tìm ra đúng node của người thứ nhất, và ' +
      'đọc ra đúng địa chỉ, đúng số ngắt từ đó.' },

    { t: 'p', x:
      'Như Bài 38 đã nói, thứ duy nhất nối hai người là <b>một chuỗi ký tự trùng nhau</b> — ' +
      '<code>compatible</code>. Nhưng một chuỗi trùng nhau chỉ giải quyết được chuyện <i>tìm ' +
      'thấy nhau</i>. Nó không nói gì về chuyện driver sẽ <i>đọc gì</i> trong node. Driver cần ' +
      '<code>reg</code>? Cần <code>interrupts</code>? Cần <code>clocks</code> với tên ' +
      '<code>\"apb_pclk\"</code>? Nếu người viết DTS quên một thứ, driver sẽ hỏng lúc chạy — ' +
      'trên bo mạch của khách hàng. Cần một văn bản mà <b>cả hai bên cùng đọc</b>. Văn bản đó ' +
      'gọi là binding.' },

    { t: 'fig',
      cap: 'Binding là bản hợp đồng đứng giữa. Người viết DTS tuân theo nó khi mô tả phần cứng; ' +
           'người viết driver tuân theo nó khi đọc node. Kernel lúc chạy <b>không đọc binding</b> ' +
           '— nó chỉ so chuỗi. Binding được kiểm tra lúc build, bằng một công cụ riêng.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ ba khối: bên trái là file dts của hãng bo mạch, bên phải là driver của hãng chip, ở giữa là file binding YAML; bên dưới là công cụ dtschema kiểm tra dts theo binding lúc build, và kernel so chuỗi compatible lúc chạy">' +
        '<text class="d-ts" x="18" y="18">HÃNG BO MẠCH VIẾT</text>' +
        '<rect class="d-box" x="18" y="26" width="200" height="92" rx="6"/>' +
        '<text class="d-t" x="30" y="48">board.dts</text>' +
        '<text class="d-tm" x="30" y="68">rtc@51 {</text>' +
        '<text class="d-tm" x="42" y="84">compatible = "nxp,pcf2127";</text>' +
        '<text class="d-tm" x="42" y="100">reg = &lt;0x51&gt;;</text>' +
        '<text class="d-ts" x="260" y="18">HỢP ĐỒNG</text>' +
        '<rect class="d-box-a" x="260" y="26" width="200" height="92" rx="6"/>' +
        '<text class="d-t" x="272" y="48">binding YAML</text>' +
        '<text class="d-ts" x="272" y="68">compatible: giá trị hợp lệ</text>' +
        '<text class="d-ts" x="272" y="84">required: reg, …</text>' +
        '<text class="d-ts" x="272" y="100">properties: kiểu, số phần tử</text>' +
        '<text class="d-ts" x="502" y="18">HÃNG CHIP VIẾT</text>' +
        '<rect class="d-box" x="502" y="26" width="200" height="92" rx="6"/>' +
        '<text class="d-t" x="514" y="48">rtc-pcf2127.c</text>' +
        '<text class="d-tm" x="514" y="68">of_match_table:</text>' +
        '<text class="d-tm" x="526" y="84">"nxp,pcf2127"</text>' +
        '<text class="d-ts" x="514" y="104">đọc reg, interrupts…</text>' +
        '<line class="d-line" x1="218" y1="72" x2="252" y2="72"/>' +
        '<path class="d-arrow" d="M 260 72 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="502" y1="72" x2="468" y2="72"/>' +
        '<path class="d-arrow" d="M 460 72 l 10 -5 l 0 10 z"/>' +
        '<rect class="d-box-g" x="18" y="156" width="330" height="68" rx="6"/>' +
        '<text class="d-t" x="30" y="178">Lúc build: dtschema</text>' +
        '<text class="d-ts" x="30" y="196">đối chiếu từng node với binding của nó,</text>' +
        '<text class="d-ts" x="30" y="212">báo thiếu thuộc tính, sai kiểu, chuỗi lạ</text>' +
        '<rect class="d-box-p" x="372" y="156" width="330" height="68" rx="6"/>' +
        '<text class="d-t" x="384" y="178">Lúc chạy: kernel</text>' +
        '<text class="d-ts" x="384" y="196">chỉ so chuỗi compatible với of_match_table,</text>' +
        '<text class="d-ts" x="384" y="212">không hề biết binding tồn tại</text>' +
        '<line class="d-line" x1="118" y1="118" x2="118" y2="148"/>' +
        '<path class="d-arrow" d="M 118 156 l -5 -10 l 10 0 z"/>' +
        '<line class="d-line" x1="602" y1="118" x2="602" y2="148"/>' +
        '<path class="d-arrow" d="M 602 156 l -5 -10 l 10 0 z"/>' +
        '<text class="d-ts" x="18" y="244">Bài này đi hết hai khối dưới: nửa đầu phần Thực hành chạy dtschema, nửa sau quan sát kernel so chuỗi.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao kernel không tự kiểm tra binding lúc boot',
      x: 'Vì lúc boot là lúc tệ nhất để phát hiện lỗi. Không có màn hình, có khi chưa có ' +
         'console, và bo mạch đang nằm trong tay khách hàng. Hơn nữa, bộ kiểm tra binding viết ' +
         'bằng Python và nặng hơn <b>25 MB</b> dữ liệu schema (bạn sẽ thấy con số này ở bước 2) ' +
         '— không thể nhét vào kernel. Nên cộng đồng tách hẳn hai việc: <b>kiểm tra đúng sai ' +
         'làm lúc build</b>, trên máy của người viết DTS; <b>lúc chạy chỉ so chuỗi</b>, rẻ nhất ' +
         'có thể. Hệ quả bạn phải nhớ: một DTS vi phạm binding <i>vẫn boot được</i>. Không có ' +
         'ai chặn nó lại, trừ khi bạn tự chạy công cụ kiểm tra.' },

    { t: 'terms',
      items: [
        ['Binding', '—', 'Văn bản quy định một loại node phải trông thế nào: giá trị <code>compatible</code> hợp lệ, thuộc tính bắt buộc, kiểu và số phần tử của từng thuộc tính. Trong kernel 6.18.45, 5 182 binding viết bằng YAML (json-schema), 814 cái vẫn là văn xuôi <code>.txt</code>.'],
        ['dtschema', '—', 'Gói Python chứa bộ kiểm tra binding: <code>dt-validate</code>, <code>dt-doc-validate</code>, <code>dt-mk-schema</code>, <code>dt-check-compatible</code>… Không đi kèm kernel, phải cài riêng.'],
        ['of_match_table', '—', 'Mảng <code>struct of_device_id</code> trong driver, liệt kê những chuỗi <code>compatible</code> mà driver nhận lái. Đây là nửa phía driver của cuộc khớp.'],
        ['platform_device', '—', 'Đối tượng kernel đại diện cho một thiết bị trên bus \"platform\" — loại bus giả dành cho thiết bị MMIO không tự khai báo được. Bài 42 đã gặp nó ở thời board file; giờ nó được sinh ra từ node trong cây.'],
        ['probe()', '—', 'Hàm của driver mà lõi kernel gọi khi một thiết bị vừa khớp. Driver kiểm tra phần cứng, xin tài nguyên, rồi trả <code>0</code> (nhận) hoặc mã lỗi (từ chối).'],
        ['bind / unbind', '—', 'Gắn / gỡ một driver khỏi một thiết bị. Kernel tự bind khi khớp; bạn cũng làm tay được qua hai file cùng tên trong <code>/sys/bus/…/drivers/&lt;driver&gt;/</code>.']
      ] },

    /* ============================================================
       2. ĐỌC MỘT FILE BINDING
       ============================================================ */
    { t: 'h2', x: 'Đọc một file binding: ba từ khoá là đủ' },

    { t: 'p', x:
      'Cây kernel 6.18.45 có <b>5 182</b> file binding dạng <code>.yaml</code> (Bài 42 đã ' +
      'đếm) và <b>814</b> file <code>.txt</code> kiểu cũ chưa được chuyển đổi. Chúng nằm ' +
      'trong <code>Documentation/devicetree/bindings/</code>, chia theo loại thiết bị: ' +
      '<code>serial/</code>, <code>gpio/</code>, <code>rtc/</code>, <code>virtio/</code>… ' +
      'Bài này chọn <code>virtio/mmio.yaml</code> làm mẫu, vì hai lý do: nó ngắn, và máy ảo ' +
      '<code>virt</code> của bạn có đúng <b>32</b> node dùng nó. Đây là phần lõi của file:' },

    { t: 'code', where: 'out', nocopy: true, name: 'Documentation/devicetree/bindings/virtio/mmio.yaml (dòng 16–46)', lang: 'text', code:
      'properties:\n' +
      '  compatible:\n' +
      '    const: virtio,mmio\n' +
      '\n' +
      '  reg:\n' +
      '    maxItems: 1\n' +
      '\n' +
      '  dma-coherent: true\n' +
      '\n' +
      '  interrupts:\n' +
      '    maxItems: 1\n' +
      '\n' +
      "  '#iommu-cells':\n" +
      '    description: Required when the node corresponds to a virtio-iommu device.\n' +
      '    const: 1\n' +
      '\n' +
      '  iommus:\n' +
      '    description: Required for devices making accesses thru an IOMMU.\n' +
      '    maxItems: 1\n' +
      '\n' +
      '  wakeup-source:\n' +
      '    type: boolean\n' +
      '    description: Required for setting irq of a virtio_mmio device as wakeup source.\n' +
      '\n' +
      'required:\n' +
      '  - compatible\n' +
      '  - reg\n' +
      '  - interrupts\n' +
      '\n' +
      'additionalProperties:\n' +
      '  type: object',
      notes: ['Bạn sẽ tự in đoạn này ra ở bước 1 phần Thực hành. Ở đây chỉ trích để đọc trước.'] },

    { t: 'table',
      head: ['Từ khoá', 'Nghĩa', 'Trong file này'],
      rows: [
        ['<code>properties:</code>',
         'Danh sách thuộc tính <b>được phép</b> có, kèm ràng buộc cho từng cái.',
         '7 thuộc tính. <code>reg</code> và <code>interrupts</code> chỉ được <b>1</b> phần tử (<code>maxItems: 1</code>) — một vùng địa chỉ, một ngắt.'],
        ['<code>required:</code>',
         'Tập con của <code>properties</code> <b>bắt buộc</b> phải có.',
         '<code>compatible</code>, <code>reg</code>, <code>interrupts</code>. Thiếu một trong ba là vi phạm.'],
        ['<code>const:</code> / <code>enum:</code>',
         'Giá trị hợp lệ. <code>const</code> là đúng một giá trị, <code>enum</code> là một trong danh sách.',
         '<code>compatible</code> phải đúng bằng <code>virtio,mmio</code> — không có biến thể nào khác.'],
        ['<code>additionalProperties:</code>',
         'Thuộc tính <b>không</b> nằm trong danh sách thì xử lý ra sao. <code>false</code> là cấm hẳn.',
         '<code>type: object</code> — cho phép thêm <i>node con</i>, vì một thiết bị virtio có thể mang node con mô tả chính nó.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Cách đọc bất kỳ binding nào trong 30 giây',
      x: 'Đừng đọc từ trên xuống. Nhảy thẳng tới <code>required:</code> — đó là danh sách ' +
         'việc bạn <i>phải</i> làm. Sau đó quay lên <code>properties:</code> chỉ để tra ràng ' +
         'buộc của đúng những cái đó. Cuối cùng xem khối <code>examples:</code> ở cuối file: ' +
         'nó là một node DTS mẫu, và — như bạn sẽ thấy ở bước 2 — nó còn được <b>dịch thật</b> ' +
         'để kiểm tra chính binding. Tên file và vị trí thì không cần nhớ: ' +
         '<code>grep -rl \'&lt;chuỗi-compatible&gt;\' Documentation/devicetree/bindings</code> ' +
         'luôn tìm ra nó.' },

    { t: 'p', x:
      'Hãy để ý một điều: binding mô tả <b>dữ liệu</b>, không mô tả hành vi. Nó nói node phải ' +
      'có <code>interrupts</code>, nhưng không nói driver dùng ngắt đó làm gì. Đó là việc ' +
      'của mã C. Binding giống bản mô tả chân cắm trên datasheet: nó cho biết chân nào phải ' +
      'nối, không cho biết bên trong con chip chạy ra sao.' },

    { t: 'h3', x: 'Binding kiểu cũ: file <code>.txt</code> không ai kiểm tra được' },

    { t: 'p', x:
      'Thời trước YAML, binding là văn xuôi tiếng Anh trong file <code>.txt</code>: ' +
      '\"Required properties: compatible, reg…\". Người đọc được, máy thì không. Không có ' +
      'cách nào tự động biết một DTS có thiếu thuộc tính hay không. Việc chuyển sang YAML — ' +
      'thực chất là <b>json-schema</b> viết bằng cú pháp YAML — biến binding thành thứ máy ' +
      'kiểm tra được. 814 file <code>.txt</code> còn sót lại là những binding chưa ai chuyển; ' +
      'node dùng chúng sẽ bị <code>dt-validate</code> báo là \"không khớp schema nào\", dù ' +
      'hoàn toàn hợp lệ.' },

    { t: 'cal', kind: 'info', title: 'Tiền tố trước dấu phẩy cũng có binding của riêng nó',
      x: 'Phần <code>virtio</code> trong <code>virtio,mmio</code>, hay <code>nxp</code> trong ' +
         '<code>nxp,pcf2127</code>, là <b>vendor prefix</b> mà Bài 43 đã giới thiệu. Danh ' +
         'sách tiền tố hợp lệ nằm trong một file duy nhất: ' +
         '<code>Documentation/devicetree/bindings/vendor-prefixes.yaml</code>, gồm <b>928</b> ' +
         'tiền tố, trong đó có <code>virtio</code> và <code>nxp</code>. Tiền tố ' +
         '<code>learn</code> bạn dùng suốt Bài 43 <b>không có</b> trong đó. Tuy vậy, ở bước 2 ' +
         'bạn sẽ thấy công cụ kiểm tra phàn nàn về node <code>learn,led-ctrl</code> vì một lý ' +
         'do khác, cơ bản hơn: không có binding nào mang chuỗi đó.' },

    /* ============================================================
       3. NỬA PHÍA DRIVER: of_match_table
       ============================================================ */
    { t: 'h2', x: 'Nửa phía driver: <code>of_match_table</code>' },

    { t: 'p', x:
      'Binding là giấy tờ. Thứ kernel thật sự dùng để khớp là một mảng C nằm ngay trong ' +
      'driver. Đây là toàn bộ phần "tự giới thiệu" của driver <code>virtio-mmio</code>, cái ' +
      'sẽ lái 32 node <code>virtio,mmio</code> trong máy ảo của bạn:' },

    { t: 'code', where: 'out', nocopy: true, name: 'drivers/virtio/virtio_mmio.c (dòng 786–805)', lang: 'c', code:
      'static const struct of_device_id virtio_mmio_match[] = {\n' +
      '\t{ .compatible = "virtio,mmio", },\n' +
      '\t{},\n' +
      '};\n' +
      'MODULE_DEVICE_TABLE(of, virtio_mmio_match);\n' +
      '\n' +
      '#ifdef CONFIG_ACPI\n' +
      'static const struct acpi_device_id virtio_mmio_acpi_match[] = {\n' +
      '\t{ "LNRO0005", },\n' +
      '\t{ }\n' +
      '};\n' +
      'MODULE_DEVICE_TABLE(acpi, virtio_mmio_acpi_match);\n' +
      '#endif\n' +
      '\n' +
      'static struct platform_driver virtio_mmio_driver = {\n' +
      '\t.probe\t\t= virtio_mmio_probe,\n' +
      '\t.remove\t\t= virtio_mmio_remove,\n' +
      '\t.driver\t\t= {\n' +
      '\t\t.name\t= "virtio-mmio",\n' +
      '\t\t.of_match_table\t= virtio_mmio_match,',
      notes: ['Bạn sẽ tự in đoạn này ở bước 1. Khối <code>#ifdef CONFIG_ACPI</code> ở giữa nhắc lại Bài 42: cùng một driver, trên máy ACPI thì nó khớp bằng mã <code>LNRO0005</code> thay vì chuỗi <code>compatible</code>.'] },

    { t: 'table',
      head: ['Dòng', 'Làm gì', 'Vì sao cần'],
      rows: [
        ['<code>{ .compatible = "virtio,mmio", }</code>',
         'Một mục trong bảng: "tôi lái được node mang chuỗi này".',
         'Driver hỗ trợ nhiều chip thì có nhiều dòng. Driver RTC <code>rtc-pcf2127</code> có <b>4</b> dòng cho 4 con chip họ hàng.'],
        ['<code>{},</code>',
         'Mục rỗng đánh dấu hết bảng.',
         'Hàm duyệt bảng chỉ dừng khi gặp một mục có tên, kiểu và compatible đều rỗng. Quên dòng này thì nó đọc tràn ra vùng nhớ phía sau.'],
        ['<code>MODULE_DEVICE_TABLE(of, …)</code>',
         'Chép bảng ra một section riêng của file <code>.ko</code>.',
         'Để <code>depmod</code> đọc được và sinh alias — xem ngay dưới đây. Nó không ảnh hưởng gì tới việc khớp lúc chạy.'],
        ['<code>.name = "virtio-mmio"</code>',
         'Tên driver, cũng là tên thư mục trong <code>/sys/bus/platform/drivers/</code>.',
         'Còn là phương án khớp cuối cùng khi thiết bị không đến từ cây — kiểu board file của Bài 42.'],
        ['<code>.of_match_table = virtio_mmio_match</code>',
         'Gắn bảng vào driver.',
         '<b>Dòng quyết định.</b> Thiếu nó, bảng ở trên chỉ là dữ liệu chết.'],
        ['<code>.probe = virtio_mmio_probe</code>',
         'Hàm được gọi mỗi khi một thiết bị khớp.',
         'Nửa sau của bài này là hành trình đi tới đúng dòng này.']
      ] },

    { t: 'h3', x: '<code>MODULE_DEVICE_TABLE</code>: khi driver là module, ai nạp nó?' },

    { t: 'p', x:
      'Driver biên dịch thẳng vào kernel (<code>=y</code>, như <code>CONFIG_VIRTIO_MMIO=y</code> ' +
      'trong cấu hình của bạn) thì bảng đã nằm sẵn trong RAM, không cần gì thêm. Nhưng Bài 40 ' +
      'đã build ra <b>1 423</b> file <code>.ko</code>, và chúng chưa được nạp. Khi kernel gặp ' +
      'một node <code>nxp,pcf2127</code>, làm sao nó biết phải nạp <code>rtc-pcf2127.ko</code>, ' +
      'trong khi bảng khớp lại nằm <i>bên trong</i> chính file đó?' },

    { t: 'p', x:
      'Câu trả lời là một cuốn danh bạ lập sẵn lúc cài module. <code>MODULE_DEVICE_TABLE</code> ' +
      'chép bảng ra ngoài; <code>depmod</code> gom bảng của mọi module lại thành file ' +
      '<code>modules.alias</code>. Trong <code>~/bai40/modroot</code> mà Bài 40 để lại, file ' +
      'đó có <b>6 174</b> dòng bắt đầu bằng <code>alias of:</code>. Bốn dòng ' +
      '<code>compatible</code> của <code>rtc-pcf2127</code> sinh ra tám dòng alias:' },

    { t: 'code', where: 'out', nocopy: true, lang: 'text', code:
      'alias of:N*T*Cnxp,pcf2131C* rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pcf2131 rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pca2129C* rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pca2129 rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pcf2129C* rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pcf2129 rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pcf2127C* rtc_pcf2127\n' +
      'alias of:N*T*Cnxp,pcf2127 rtc_pcf2127',
      notes: ['Bạn sẽ tự lọc ra tám dòng này ở bước 1.'] },

    { t: 'p', x:
      'Đọc mẫu <code>of:N*T*Cnxp,pcf2127C*</code> từ trái sang: <code>N</code> là tên node ' +
      '(<code>*</code> nghĩa là tên gì cũng được), <code>T</code> là <code>device_type</code> ' +
      '(cũng bất kỳ), <code>C</code> là một chuỗi <code>compatible</code>. <code>C*</code> ở ' +
      'cuối cho phép node mang thêm những chuỗi compatible khác phía sau. Mỗi khi kernel tạo ' +
      'một thiết bị từ cây, nó tự viết ra một chuỗi cùng khuôn, gọi là <b>modalias</b> — bạn ' +
      'sẽ đọc chuỗi thật của máy ảo ở bước 5. Phía userspace (<code>udev</code> gọi ' +
      '<code>modprobe</code>) so chuỗi đó với danh bạ để biết phải nạp module nào.' },

    { t: 'cal', kind: 'info', title: 'Máy ảo của bạn không dùng tới danh bạ này — và đó là cố ý',
      x: 'Initramfs của Bài 32 không có <code>udev</code>, cũng không có <code>/lib/modules</code>. ' +
         'Mọi driver bạn sắp quan sát (<code>virtio-mmio</code>, <code>uart-pl011</code>, ' +
         '<code>rtc-pl031</code>) đều là <code>=y</code>, nằm sẵn trong <code>Image</code>. ' +
         'Nạp module tự động qua alias thuộc về Chặng 09 (rootfs có <code>/lib/modules</code>) ' +
         'và Chặng 10 (module do chính bạn viết). Ở bài này chỉ cần biết danh bạ tồn tại và ' +
         'được sinh ra từ đâu.' },

    /* ============================================================
       4. CHẤM ĐIỂM: VÌ SAO CHUỖI ĐẦU TIÊN THẮNG
       ============================================================ */
    { t: 'h2', x: 'Chấm điểm: vì sao chuỗi đứng đầu thắng' },

    { t: 'p', x:
      'Bài 43 đã dạy quy ước viết <code>compatible</code> <b>từ riêng đến chung</b>, như ' +
      '<code>"arm,pl011", "arm,primecell"</code>. Giờ là lúc xem quy ước đó được thực thi ở ' +
      'đâu. Mỗi lần kernel cần biết một node có khớp một dòng trong bảng hay không, nó gọi ' +
      'hàm này:' },

    { t: 'code', where: 'out', nocopy: true, name: 'drivers/of/base.c (dòng 338–357, bỏ phần so type/name phía sau)', lang: 'c', code:
      'static int __of_device_is_compatible(const struct device_node *device,\n' +
      '\t\t\t\t     const char *compat, const char *type, const char *name)\n' +
      '{\n' +
      '\tconst struct property *prop;\n' +
      '\tconst char *cp;\n' +
      '\tint index = 0, score = 0;\n' +
      '\n' +
      '\t/* Compatible match has highest priority */\n' +
      '\tif (compat && compat[0]) {\n' +
      '\t\tprop = __of_find_property(device, "compatible", NULL);\n' +
      '\t\tfor (cp = of_prop_next_string(prop, NULL); cp;\n' +
      '\t\t     cp = of_prop_next_string(prop, cp), index++) {\n' +
      '\t\t\tif (of_compat_cmp(cp, compat, strlen(compat)) == 0) {\n' +
      '\t\t\t\tscore = INT_MAX/2 - (index << 2);\n' +
      '\t\t\t\tbreak;\n' +
      '\t\t\t}\n' +
      '\t\t}\n' +
      '\t\tif (!score)\n' +
      '\t\t\treturn 0;\n' +
      '\t}',
      notes: ['Mở file bằng <code>sed -n \'338,374p\' drivers/of/base.c</code> trong <code>~/bai38/linux-6.18.45</code> nếu muốn đọc trọn hàm.'] },

    { t: 'p', x:
      'Dòng then chốt là <code>score = INT_MAX/2 - (index &lt;&lt; 2)</code>. <code>index</code> ' +
      'là vị trí của chuỗi trong thuộc tính <code>compatible</code> <b>của node</b>, đếm từ 0; ' +
      '<code>index &lt;&lt; 2</code> là <code>index × 4</code>. Chuỗi ở vị trí 0 được điểm cao ' +
      'nhất, mỗi vị trí lùi về sau mất 4 điểm. Hàm duyệt bảng (<code>__of_match_node</code>, ' +
      'dòng 1073 cùng file) chấm điểm <i>mọi</i> dòng trong bảng rồi giữ dòng có <b>điểm cao ' +
      'nhất</b> — không phải dòng khớp <i>đầu tiên</i>.' },

    { t: 'p', x:
      'Thử với một ví dụ thật mà bạn sẽ gặp trong máy ảo. Node <code>/psci</code> của máy ' +
      '<code>virt</code> mang <code>compatible = "arm,psci-0.2", "arm,psci"</code>. Driver ' +
      'PSCI (<code>drivers/firmware/psci/psci.c</code>, dòng 791) có một bảng ba dòng, ' +
      '<i>đúng theo thứ tự này</i>:' },

    { t: 'table',
      head: ['Dòng trong bảng của driver', 'Khớp chuỗi nào của node', '<code>index</code>', 'Điểm'],
      rows: [
        ['<code>"arm,psci"</code> → <code>psci_0_1_init</code>', 'chuỗi thứ hai', '1', '<code>INT_MAX/2 − 4</code>'],
        ['<code>"arm,psci-0.2"</code> → <code>psci_0_2_init</code>', 'chuỗi thứ nhất', '0', '<b><code>INT_MAX/2</code> — cao nhất</b>'],
        ['<code>"arm,psci-1.0"</code> → <code>psci_1_0_init</code>', 'không khớp', '—', '0']
      ] },

    { t: 'p', x:
      'Dòng <code>"arm,psci"</code> đứng đầu bảng và khớp trước, nhưng thua điểm, nên kernel ' +
      'chọn <code>psci_0_2_init</code>. Bằng chứng in ra ở giây thứ 0 của log boot, và bạn sẽ ' +
      'tự lọc ra ở bước 4: <code>psci: Using standard PSCI v0.2 function IDs</code>. Nếu ' +
      'kernel chọn dòng khớp đầu tiên, bạn sẽ thấy <code>Using PSCI v0.1 Function IDs from ' +
      'DT</code> — câu này có thật trong mã nguồn, nằm trong <code>psci_0_1_init</code>.' },

    { t: 'cal', kind: 'why', title: 'Vì sao thứ tự trong cây thắng thứ tự trong driver',
      x: 'Vì người viết DTS biết phần cứng, người viết driver thì không. Chuỗi đầu tiên trong ' +
         '<code>compatible</code> là lời khẳng định chính xác nhất: "đây <i>chính là</i> PSCI ' +
         '0.2". Các chuỗi sau là lời lùi bước: "nếu anh không biết 0.2 thì coi tôi như PSCI ' +
         'đời đầu cũng được". Kernel chọn lời khẳng định chính xác nhất mà nó có driver cho. ' +
         'Nhờ vậy một kernel cũ chưa biết <code>arm,psci-0.2</code> vẫn chạy được trên bo ' +
         'mạch mới nhờ chuỗi dự phòng, còn kernel mới thì dùng đúng tính năng mới. <b>Đây là ' +
         'nguyên lý đáng nhớ, không phải chi tiết để tra</b>: chuỗi riêng nhất đặt đầu, chung ' +
         'nhất đặt cuối, và kernel chọn cái riêng nhất mà nó hiểu.' },

    { t: 'cal', kind: 'warn', title: 'Hai chi tiết của phép so sánh dễ làm bạn bất ngờ',
      x: '<ul>' +
         '<li><code>of_compat_cmp</code> được định nghĩa ở <code>include/linux/of.h:931</code> ' +
         'là <code>strcasecmp</code> — <b>không phân biệt hoa thường</b>, nên ' +
         '<code>"ARM,PL011"</code> vẫn khớp. Đừng dựa vào điều đó: binding viết chữ thường, và ' +
         'công cụ kiểm tra ở bước 2 so đúng từng ký tự.</li>' +
         '<li>Ngoài chuyện hoa thường, phép so là <b>nguyên chuỗi</b>. ' +
         '<code>"virtio,mmio "</code> thừa một dấu cách, hay <code>"virtio-mmio"</code> dùng ' +
         'gạch ngang thay dấu phẩy, đều không khớp gì cả — và kernel không nói một lời. Đây ' +
         'chính là bug "bo mạch im lặng".</li>' +
         '</ul>' },

    /* ============================================================
       5. TỪ NODE TỚI probe()
       ============================================================ */
    { t: 'h2', x: 'Từ node trong cây tới lời gọi <code>probe()</code>' },

    { t: 'p', x:
      'Giờ ghép hai nửa lại. Lúc bootloader (hay QEMU) trao quyền cho kernel, trong RAM có ' +
      'một khối DTB. Vài trăm mili-giây sau, <code>virtio_mmio_probe()</code> đã chạy xong ' +
      'trên đúng một thiết bị. Ở giữa là năm giai đoạn, và mỗi giai đoạn là một đoạn mã bạn có thể ' +
      'mở ra đọc trong <code>~/bai38/linux-6.18.45</code>:' },

    { t: 'fig',
      cap: 'Năm giai đoạn từ khối DTB tới <code>probe()</code>. Giai đoạn 2 biến <b>node</b> thành ' +
           '<b>thiết bị</b>; giai đoạn 3 là cuộc khớp chuỗi; giai đoạn 5 là lúc driver có quyền nói ' +
           '"không". Thiết bị và driver có thể xuất hiện theo bất kỳ thứ tự nào — giai đoạn 3 chạy ' +
           'mỗi khi một bên mới được đăng ký.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ năm giai đoạn: DTB trong RAM được unflatten thành cây device_node; of_platform_populate tạo platform_device cho mỗi node có compatible; platform_match so compatible với of_match_table; really_probe gọi probe của driver; driver trả 0 để nhận hoặc ENODEV để từ chối">' +
        '<rect class="d-box" x="18" y="14" width="210" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="36">1 · Mở phẳng khối DTB</text>' +
        '<text class="d-tm" x="30" y="56">unflatten_device_tree()</text>' +
        '<text class="d-ts" x="244" y="36">khối nhị phân → cây struct device_node trong RAM.</text>' +
        '<text class="d-ts" x="244" y="54">Từ đây mới có /proc/device-tree và /sys/firmware/devicetree.</text>' +
        '<line class="d-line" x1="123" y1="72" x2="123" y2="82"/>' +
        '<path class="d-arrow" d="M 123 90 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-p" x="18" y="90" width="210" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="112">2 · Node → thiết bị</text>' +
        '<text class="d-tm" x="30" y="132">of_platform_populate()</text>' +
        '<text class="d-ts" x="244" y="112">mỗi node con của gốc có compatible → một platform_device.</text>' +
        '<text class="d-ts" x="244" y="130">Node "simple-bus" → đi tiếp vào các node con của nó.</text>' +
        '<line class="d-line" x1="123" y1="148" x2="123" y2="158"/>' +
        '<path class="d-arrow" d="M 123 166 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-a" x="18" y="166" width="210" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="188">3 · Khớp</text>' +
        '<text class="d-tm" x="30" y="208">platform_match()</text>' +
        '<text class="d-ts" x="244" y="188">so compatible của thiết bị với of_match_table của driver,</text>' +
        '<text class="d-ts" x="244" y="206">bằng hàm chấm điểm ở phần trước.</text>' +
        '<line class="d-line" x1="123" y1="224" x2="123" y2="234"/>' +
        '<path class="d-arrow" d="M 123 242 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box" x="18" y="242" width="210" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="264">4 · Gọi probe()</text>' +
        '<text class="d-tm" x="30" y="284">really_probe()</text>' +
        '<text class="d-ts" x="244" y="264">nối thiết bị vào driver, rồi gọi driver-&gt;probe(dev).</text>' +
        '<rect class="d-box-g" x="470" y="226" width="232" height="36" rx="6"/>' +
        '<text class="d-t" x="482" y="249">5a · trả 0 → đã bind</text>' +
        '<rect class="d-box-w" x="470" y="272" width="232" height="36" rx="6"/>' +
        '<text class="d-t" x="482" y="295">5b · trả −19 (ENODEV) → gỡ ra</text>' +
        '<line class="d-line" x1="228" y1="285" x2="460" y2="285"/>' +
        '<path class="d-arrow" d="M 468 285 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="440" y1="285" x2="440" y2="244"/>' +
        '<line class="d-line" x1="440" y1="244" x2="460" y2="244"/>' +
        '<path class="d-arrow" d="M 468 244 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="18" y="322">Bước 4 của phần Thực hành in ra đúng thời điểm giai đoạn 2 và giai đoạn 3 chạy trong máy ảo của bạn.</text>' +
        '</svg>' },

    { t: 'h3', x: 'Giai đoạn 2: node nào được thành thiết bị, node nào không' },

    { t: 'p', x:
      'Hàm làm việc này là <code>of_platform_default_populate_init</code> ' +
      '(<code>drivers/of/platform.c</code>, dòng 502), chạy ở mức ' +
      '<code>arch_initcall_sync</code> — rất sớm, trước phần lớn driver. Nó duyệt các node con ' +
      'của gốc <code>/</code> và gọi <code>of_platform_bus_create</code> cho từng cái. Hàm đó ' +
      'áp ba quy tắc, và mỗi quy tắc bạn sẽ thấy hậu quả trong <code>/sys</code> ở bước 3:' },

    { t: 'table',
      head: ['Quy tắc (dòng trong <code>platform.c</code>)', 'Nghĩa', 'Ví dụ trong máy <code>virt</code>'],
      rows: [
        ['Không có <code>compatible</code> → bỏ qua (dòng 337)',
         'Chế độ "strict": node không tự giới thiệu thì không ai lái được, nên không tạo thiết bị.',
         '<code>memory@40000000</code>, <code>cpus</code>, <code>chosen</code> — ba node này không bao giờ thành thiết bị.'],
        ['Đã có người nhận rồi → bỏ qua (cờ <code>OF_POPULATED</code>, dòng 161)',
         'Một số node được mã khởi động sớm dùng trực tiếp, và đánh dấu để khỏi tạo trùng.',
         '<code>intc@8000000</code> (GIC, bộ điều khiển ngắt) và <code>apb-pclk</code> (đồng hồ cố định) — xem cal bên dưới.'],
        ['<code>"arm,primecell"</code> → tạo <code>amba_device</code> thay vì <code>platform_device</code> (dòng 361)',
         'Thiết bị AMBA của ARM có thanh ghi định danh riêng; chúng sống trên bus <code>amba</code>, khớp theo số ID chứ không theo chuỗi.',
         '<code>pl011@9000000</code>, <code>pl031@9010000</code>, <code>pl061@9030000</code>.']
      ] },

    { t: 'cal', kind: 'info', title: 'GIC và đồng hồ không đợi tới giai đoạn 2',
      x: 'Bộ điều khiển ngắt phải chạy <i>trước</i> mọi driver có ngắt, và đồng hồ phải chạy ' +
         'trước mọi thứ cần đo thời gian. Nên chúng không đi đường <code>probe()</code> thông ' +
         'thường mà được khởi tạo từ rất sớm bằng macro <code>IRQCHIP_DECLARE</code> ' +
         '(<code>drivers/irqchip/irq-gic.c:1516</code>) và <code>CLK_OF_DECLARE</code> ' +
         '(<code>drivers/clk/clk-fixed-rate.c:197</code>). Hai macro này cũng khớp bằng chuỗi ' +
         '<code>compatible</code> — cùng một cơ chế, chỉ khác thời điểm. Sau khi khởi tạo, ' +
         'mã đó bật cờ <code>OF_POPULATED</code> trên node (<code>drivers/of/irq.c:624</code>, ' +
         '<code>drivers/clk/clk.c:5576</code>), nên giai đoạn 2 bỏ qua chúng. Bài 42 đã gặp đúng ' +
         'kiểu "khớp sớm" này với <code>OF_EARLYCON_DECLARE</code> của UART.' },

    { t: 'h3', x: 'Giai đoạn 3 và 4: khớp, rồi gọi' },

    { t: 'p', x:
      'Mỗi khi một thiết bị hoặc một driver mới được đăng ký lên bus <code>platform</code>, ' +
      'lõi driver (<code>drivers/base/dd.c</code>) đem bên mới đi so với mọi bên đối diện đã ' +
      'có. Phép so là hàm <code>platform_match</code> (<code>drivers/base/platform.c</code>, ' +
      'dòng 1305), và nó thử bốn cách <b>theo thứ tự ưu tiên</b>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'drivers/base/platform.c (dòng 1316–1329)', lang: 'c', code:
      '\t/* Attempt an OF style match first */\n' +
      '\tif (of_driver_match_device(dev, drv))\n' +
      '\t\treturn 1;\n' +
      '\n' +
      '\t/* Then try ACPI style match */\n' +
      '\tif (acpi_driver_match_device(dev, drv))\n' +
      '\t\treturn 1;\n' +
      '\n' +
      '\t/* Then try to match against the id table */\n' +
      '\tif (pdrv->id_table)\n' +
      '\t\treturn platform_match_id(pdrv->id_table, pdev) != NULL;\n' +
      '\n' +
      '\t/* fall-back to driver name match */\n' +
      '\treturn (strcmp(pdev->name, drv->name) == 0);' },

    { t: 'p', x:
      'Bốn cách này là bốn thời kỳ lịch sử xếp chồng lên nhau. Device Tree (cách 1) được thử ' +
      'đầu tiên; ACPI của Bài 42 xếp thứ hai; hai cách cuối là di sản của thời board file, ' +
      'khi thiết bị được tạo bằng tay trong C với một cái tên, và driver khớp đúng cái tên ' +
      'đó. Cả bốn đều dẫn tới cùng một kết quả: <code>really_probe()</code> ' +
      '(<code>dd.c</code>, dòng 664) gắn thiết bị vào driver rồi gọi hàm <code>probe</code> ' +
      'của driver.' },

    { t: 'h3', x: 'Giai đoạn 5: khớp chưa chắc đã nhận' },

    { t: 'p', x:
      'Đây là chi tiết mà người mới hay bỏ sót: <b>khớp chuỗi chỉ là điều kiện cần</b>. ' +
      '<code>probe()</code> có quyền từ chối, và driver <code>virtio-mmio</code> từ chối ' +
      'thường xuyên. Đoạn đầu hàm của nó đọc ba thanh ghi của thiết bị:' },

    { t: 'code', where: 'out', nocopy: true, name: 'drivers/virtio/virtio_mmio.c (trích virtio_mmio_probe, dòng 587–618)', lang: 'c', code:
      '\tvm_dev->base = devm_platform_ioremap_resource(pdev, 0);\n' +
      '\t...\n' +
      '\t/* Check magic value */\n' +
      '\tmagic = readl(vm_dev->base + VIRTIO_MMIO_MAGIC_VALUE);\n' +
      '\tif (magic != (\'v\' | \'i\' << 8 | \'r\' << 16 | \'t\' << 24)) {\n' +
      '\t\tdev_warn(&pdev->dev, "Wrong magic value 0x%08lx!\\n", magic);\n' +
      '\t\trc = -ENODEV;\n' +
      '\t\tgoto free_vm_dev;\n' +
      '\t}\n' +
      '\t...\n' +
      '\tvm_dev->vdev.id.device = readl(vm_dev->base + VIRTIO_MMIO_DEVICE_ID);\n' +
      '\tif (vm_dev->vdev.id.device == 0) {\n' +
      '\t\t/*\n' +
      '\t\t * virtio-mmio device with an ID 0 is a (dummy) placeholder\n' +
      '\t\t * with no function. End probing now with no error reported.\n' +
      '\t\t */\n' +
      '\t\trc = -ENODEV;\n' +
      '\t\tgoto free_vm_dev;\n' +
      '\t}' },

    { t: 'p', x:
      'Máy <code>virt</code> luôn khai báo sẵn <b>32</b> khe virtio-mmio trong cây, dù bạn ' +
      'gắn bao nhiêu thiết bị (Bài 30 đã đo: thêm <code>-device virtio-blk-device</code> ' +
      'không đổi một dòng nào trong cây). Khe nào trống thì thanh ghi ' +
      '<code>DEVICE_ID</code> đọc ra 0, và <code>probe()</code> trả <code>-ENODEV</code> — ' +
      'mã lỗi số <b>19</b>, nghĩa là "không có thiết bị". Lõi driver hiểu mã này là "khớp ' +
      'nhầm, không phải hỏng" nên không in lỗi (<code>dd.c</code>, dòng 649–653), gỡ thiết ' +
      'bị ra và đi tiếp. Ở bước 4 bạn sẽ thấy đúng 31 lần <code>returned 19</code> và 1 lần ' +
      '<code>returned 0</code>.' },

    { t: 'cal', kind: 'why', title: 'Vì sao cây lại khai báo những khe không có gì',
      x: 'Vì DTB được dựng <i>trước</i> khi biết người dùng gắn gì, và bảng địa chỉ của máy ' +
         '<code>virt</code> phải cố định để một kernel chạy được với mọi cấu hình. Cây nói ' +
         '"ở địa chỉ này <i>có thể</i> có một thiết bị virtio"; chỉ phần cứng — ở đây là ' +
         'thanh ghi <code>DEVICE_ID</code> — mới biết có thật hay không. Đây là mẫu bạn sẽ gặp ' +
         'lại ở bo mạch thật: cây mô tả những gì <i>được thiết kế</i>, <code>probe()</code> ' +
         'kiểm chứng những gì <i>đang có</i>. Một driver tốt không tin cây mù quáng.' },

    { t: 'cal', kind: 'info', title: 'Còn một kết cục thứ ba: hẹn lại sau',
      x: 'Ngoài <code>0</code> và <code>-ENODEV</code>, <code>probe()</code> còn có thể trả ' +
         '<code>-EPROBE_DEFER</code>: "tôi cần một thiết bị khác (đồng hồ, chân GPIO, bộ ' +
         'nguồn) mà nó chưa sẵn sàng, gọi lại tôi sau". Lõi driver đưa thiết bị vào một danh ' +
         'sách chờ (<code>deferred_probe_pending_list</code>, <code>dd.c</code> dòng 56) và thử ' +
         'lại mỗi khi có một driver mới bind thành công. Máy ảo của bạn có danh sách chờ rỗng ' +
         'vào lúc có dấu nhắc lệnh; trên bo mạch thật với hàng trăm node phụ thuộc lẫn nhau, ' +
         'nó là nguyên nhân phổ biến nhất của "driver không lên". Bài 54 sẽ gặp lại nó khi bạn ' +
         'tự viết platform driver.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: kiểm tra hợp đồng, rồi nhìn kernel thực thi nó' },

    { t: 'p', x:
      'Sáu bước chia làm hai nửa. Bước 1–3 chạy trong WSL: đọc hai nửa của hợp đồng, cài ' +
      'công cụ kiểm tra binding, và cho nó soi một cây bạn tự viết lẫn một cây thật của ' +
      'kernel. Bước 4–6 boot máy ảo <b>một lần</b> và giữ nguyên nó: xem node nào thành thiết ' +
      'bị, xem từng lần <code>probe()</code> được gọi, rồi tự tay gỡ và gắn driver. File ' +
      'nháp nằm trong <code>~/bai44</code>, xoá được khi học xong.' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<ul>' +
         '<li>Cây kernel đã build ở <code>~/bai38/linux-6.18.45</code> (Bài 40) — dùng cả ' +
         '<code>Image</code> lẫn mã nguồn.</li>' +
         '<li><code>~/bai40/modroot</code> (Bài 40) — chỉ để đọc file <code>modules.alias</code>.</li>' +
         '<li><code>~/bai32/initramfs.cpio.gz</code> (Bài 32) — rootfs BusyBox cho máy ảo.</li>' +
         '<li><code>dtc</code>, <code>fdtget</code> (gói <code>device-tree-compiler</code>, từ Bài 42).</li>' +
         '<li>Python <b>3.9 trở lên</b> kèm module <code>venv</code> và header phát triển. Kiểm ' +
         'tra bằng <code>python3 --version</code>. Trên Ubuntu 20.04, <code>python3</code> là ' +
         '3.8 nên bài dùng <code>python3.9</code>, cài bằng ' +
         '<code>sudo apt-get install python3.9 python3.9-venv python3.9-dev</code>. Trên bản ' +
         'Ubuntu mới hơn, <code>python3</code> đã đủ và bạn thay <code>python3.9</code> bằng ' +
         '<code>python3</code> trong mọi lệnh dưới đây.</li>' +
         '</ul>' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Đọc hai nửa của hợp đồng',
        blocks: [

        { t: 'p', x:
          'Bắt đầu từ một chuỗi <code>compatible</code> và đi tìm cả hai bên: file binding ' +
          'quy định node, và driver nhận node. Đây vẫn là cách thứ hai trong bốn cách tra cứu ' +
          'cây kernel mà Bài 38 đã dạy — lần này bạn tìm ở hai thư mục thay vì một.' },

        { t: 'code', where: 'wsl', code:
          'K=~/bai38/linux-6.18.45\n' +
          'mkdir -p ~/bai44\n' +
          'cd $K\n' +
          "grep -rl 'virtio,mmio' Documentation/devicetree/bindings" },

        { t: 'code', where: 'out', nocopy: true, code:
          'Documentation/devicetree/bindings/virtio/virtio-device.yaml\n' +
          'Documentation/devicetree/bindings/virtio/mmio.yaml\n' +
          'Documentation/devicetree/bindings/i2c/i2c-virtio.yaml\n' +
          'Documentation/devicetree/bindings/gpio/gpio-virtio.yaml' },

        { t: 'cal', kind: 'info', title: 'Bốn file, nhưng chỉ một file định nghĩa chuỗi này',
          x: 'Chỉ <code>virtio/mmio.yaml</code> có dòng <code>const: virtio,mmio</code>. Ba ' +
             'file còn lại chỉ <i>nhắc</i> tới nó trong ví dụ: <code>i2c-virtio.yaml</code> và ' +
             '<code>gpio-virtio.yaml</code> mô tả node con nằm <i>bên trong</i> một node ' +
             '<code>virtio,mmio</code> — đúng thứ mà <code>additionalProperties: type: ' +
             'object</code> cho phép. Muốn tìm file định nghĩa, hãy chọn file có ' +
             '<code>compatible</code> nằm dưới <code>properties:</code>. Thứ tự bốn dòng phụ ' +
             'thuộc cách hệ thống file sắp thư mục, có thể khác trên máy bạn.' },

        { t: 'p', x:
          'In phần lõi của file binding. Kết quả trùng từng dòng với khối đã trích ở phần ' +
          '"Đọc một file binding" phía trên, nên không in lại ở đây:' },

        { t: 'code', where: 'wsl', code:
          "sed -n '16,46p' Documentation/devicetree/bindings/virtio/mmio.yaml" },

        { t: 'p', x:
          'Giờ sang phía driver. Dấu nháy kép nằm <i>trong</i> mẫu tìm, như Bài 38 đã dạy, ' +
          'để chỉ khớp chuỗi thật trong mã C:' },

        { t: 'code', where: 'wsl', code:
          "grep -rn '\"virtio,mmio\"' --include='*.c' drivers" },

        { t: 'code', where: 'out', nocopy: true, code:
          'drivers/virtio/virtio_mmio.c:34: *\t\t\tcompatible = "virtio,mmio";\n' +
          'drivers/virtio/virtio_mmio.c:787:\t{ .compatible = "virtio,mmio", },' },

        { t: 'cal', kind: 'info', title: 'Dòng 34 là chú thích, dòng 787 mới là bảng khớp',
          x: 'Dấu <code>*</code> ở đầu dòng 34 cho biết nó nằm trong một khối chú thích C — ' +
             'tác giả driver chép một node DTS mẫu vào đầu file để người đọc tham khảo. Dòng ' +
             '787 là mục duy nhất của <code>virtio_mmio_match[]</code>. Một file, một mục: ' +
             'driver này lái đúng một loại node. Xem trọn bảng và phần khai báo driver:' },

        { t: 'code', where: 'wsl', code:
          "sed -n '786,805p' drivers/virtio/virtio_mmio.c" },

        { t: 'p', x:
          'Kết quả trùng khối <code>virtio_mmio.c (dòng 786–805)</code> ở phần lý thuyết. Cuối ' +
          'cùng, xem danh bạ alias mà <code>depmod</code> đã sinh ra ở Bài 40:' },

        { t: 'code', where: 'wsl', code:
          'M=~/bai40/modroot/lib/modules/6.18.45-embedded\n' +
          "grep -c '^alias of:' $M/modules.alias\n" +
          "grep 'pcf2127' $M/modules.alias | grep 'of:'" },

        { t: 'code', where: 'out', nocopy: true, code:
          '6174\n' +
          'alias of:N*T*Cnxp,pcf2131C* rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pcf2131 rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pca2129C* rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pca2129 rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pcf2129C* rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pcf2129 rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pcf2127C* rtc_pcf2127\n' +
          'alias of:N*T*Cnxp,pcf2127 rtc_pcf2127' },

        { t: 'cmdx', title: 'Hai lệnh grep đọc danh bạ',
          cmd: "grep 'pcf2127' $M/modules.alias | grep 'of:'",
          rows: [
            ['<code>M=…/6.18.45-embedded</code>', 'Biến tạm trỏ tới thư mục module mà Bài 40 cài.', 'Tên thư mục là chuỗi phiên bản kernel, có hậu tố <code>-embedded</code> từ <code>CONFIG_LOCALVERSION</code>'],
            ['<code>grep -c \'^alias of:\'</code>', 'Đếm số dòng bắt đầu bằng <code>alias of:</code>.', 'Chỉ đếm alias sinh từ <code>of_match_table</code>; file còn alias loại <code>i2c:</code>, <code>spi:</code>, <code>pci:</code>…'],
            ['<code>grep \'pcf2127\'</code>', 'Lọc mọi dòng nhắc tới module <code>rtc_pcf2127</code>.', 'Bắt cả alias <code>i2c:</code> và <code>spi:</code> của nó'],
            ['<code>| grep \'of:\'</code>', 'Giữ lại alias kiểu Device Tree.', 'Tách hai bước cho dễ đọc; một biểu thức <code>of:.*pcf</code> cũng được']
          ] },

        { t: 'cal', kind: 'info', title: 'Tám dòng từ bốn dòng mã — và một module nhận tên có gạch dưới',
          x: 'Mỗi mục <code>compatible</code> sinh <b>hai</b> alias: một cái có <code>C*</code> ' +
             'ở cuối (node mang thêm chuỗi khác phía sau) và một cái không (node chỉ có đúng ' +
             'chuỗi đó). 4 mục × 2 = 8 dòng. Để ý cột cuối là <code>rtc_pcf2127</code> với ' +
             '<b>gạch dưới</b>, trong khi file là <code>rtc-pcf2127.ko</code> với gạch ngang: ' +
             'kernel luôn đổi <code>-</code> thành <code>_</code> trong tên module. ' +
             '<b>6 174</b> là số của cây bạn build ở Bài 40 với <code>defconfig</code>; cấu ' +
             'hình khác cho số khác.' },

        { t: 'p', x:
          'Thử cùng câu hỏi với chính driver mà máy ảo sẽ dùng:' },

        { t: 'code', where: 'wsl', code:
          "grep -c 'virtio_mmio' $M/modules.alias\n" +
          "grep -n 'CONFIG_VIRTIO_MMIO=' $K/.config" },

        { t: 'code', where: 'out', nocopy: true, code:
          '0\n' +
          '8315:CONFIG_VIRTIO_MMIO=y' },

        { t: 'cal', kind: 'why', title: 'Số 0 không phải lỗi: driver dựng sẵn thì không cần danh bạ',
          x: '<code>CONFIG_VIRTIO_MMIO=y</code> nghĩa là driver đã nằm trong <code>Image</code> ' +
             '(Bài 39 phân biệt <code>=y</code> với <code>=m</code>). Không có file ' +
             '<code>.ko</code> nào để nạp, nên <code>depmod</code> không có gì để ghi. ' +
             '<code>MODULE_DEVICE_TABLE</code> vẫn có trong mã nguồn, nhưng với driver dựng sẵn ' +
             'nó không sinh ra gì cả. Còn <code>of_match_table</code> thì vẫn nguyên đó, sẵn ' +
             'trong RAM từ lúc boot — và đó là thứ bước 5 sẽ quan sát.' }
      ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Cài dtschema và cho nó soi một cây bạn tự viết',
        blocks: [

        { t: 'p', x:
          '<code>dtschema</code> là gói Python, không đi kèm kernel. Cài nó vào một ' +
          '<b>môi trường ảo</b> (<i>virtual environment</i>) riêng trong <code>~/bai44</code>: ' +
          'một thư mục chứa bản Python và thư viện của riêng nó, không đụng vào Python của hệ ' +
          'thống — thứ mà <code>apt</code> và nhiều công cụ khác của Ubuntu đang dựa vào.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/bai44\n' +
          'python3.9 -m venv venv\n' +
          '. venv/bin/activate\n' +
          'pip install dtschema yamllint\n' +
          'dt-validate --version' },

        { t: 'cmdx', title: 'Bốn lệnh dựng môi trường kiểm tra',
          cmd: 'python3.9 -m venv venv && . venv/bin/activate && pip install dtschema yamllint',
          rows: [
            ['<code>python3.9 -m venv venv</code>', 'Tạo môi trường ảo trong thư mục <code>venv</code>.', 'Cần gói <code>python3.9-venv</code>; thiếu thì báo <code>ensurepip is not available</code>'],
            ['<code>. venv/bin/activate</code>', 'Chạy script kích hoạt <i>trong shell hiện tại</i> (dấu chấm = <code>source</code>, Bài 13).', 'Nó đặt thư mục <code>venv/bin</code> lên đầu <code>PATH</code>. Dấu nhắc đổi thành <code>(venv) …</code>'],
            ['<code>pip install dtschema</code>', 'Tải bộ kiểm tra binding và các thư viện nó cần.', 'Một trong số đó, <code>pylibfdt</code>, được biên dịch từ C — đó là lý do cần <code>python3.9-dev</code>'],
            ['<code>yamllint</code>', 'Công cụ kiểm tra định dạng YAML.', 'Không bắt buộc, nhưng <code>writing-schema.rst</code> của kernel khuyên cài; có nó thì bước kiểm tra binding chạy thêm khâu <code>LINT</code>']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          'Successfully installed attrs-26.1.0 dtschema-2026.9 jsonschema-4.25.1 jsonschema-specifications-2025.9.1 pathspec-1.1.1 pylibfdt-1.7.2.post2 pyyaml-6.0.3 referencing-0.36.2 rfc3987-1.3.8 rpds-py-0.27.1 ruamel.yaml typing-extensions-4.16.0 yamllint-1.37.1\n' +
          '2026.9',
          notes: ['Chỉ in dòng cuối của <code>pip</code>; phía trên là vài chục dòng tiến trình tải. Số phiên bản là bản mới nhất vào ngày soạn bài (2026-09-28) — máy bạn có thể tải bản mới hơn, và cũng có thể nhận thêm vài dòng khác trong kết quả kiểm tra bên dưới nếu schema đã thay đổi.'] },

        { t: 'cal', kind: 'info', title: 'Hai con số cần để ý',
          x: '<code>dtschema-2026.9</code> — gói đặt tên phiên bản theo năm và tháng phát hành. ' +
             'Kernel 6.18.45 đòi tối thiểu <b>2023.9</b> (dòng 9 của ' +
             '<code>Documentation/devicetree/bindings/Makefile</code>, biến ' +
             '<code>DT_SCHEMA_MIN_VERSION</code>), nên bản này dư sức. ' +
             '<code>pylibfdt-1.7.2.post2</code> là <code>libfdt</code> — cùng thư viện mà ' +
             '<code>dtc</code> dùng — bọc lại cho Python: <code>dt-validate</code> đọc file ' +
             '<code>.dtb</code> bằng chính nó. Lần cài đầu mất khoảng <b>18 giây</b> trên máy ' +
             'soạn bài, phần lớn là biên dịch <code>pylibfdt</code>.' },

        { t: 'cal', kind: 'warn', title: 'Mở terminal mới là mất môi trường ảo',
          x: '<code>activate</code> chỉ sửa <code>PATH</code> của shell hiện tại. Mở một ' +
             'terminal khác, gõ <code>dt-validate</code> sẽ nhận <code>command not found</code>, ' +
             'và <code>make</code> sẽ báo <code>\'dt-doc-validate\' not found!</code> (xem bảng ' +
             'Lỗi thường gặp). Chạy lại <code>. ~/bai44/venv/bin/activate</code> và đặt lại ' +
             '<code>K=~/bai38/linux-6.18.45</code> là xong.' },

        { t: 'p', x:
          'Trước khi kiểm tra cây nào, <code>dtschema</code> phải gom 5 182 binding YAML ' +
          'cộng với schema lõi của chính nó thành <b>một file</b> đã xử lý sẵn. Hệ thống build ' +
          'của kernel có một đích làm việc đó, đồng thời tự kiểm tra một binding bằng chính ' +
          'ví dụ trong file:' },

        { t: 'code', where: 'wsl', code:
          'time make -C $K ARCH=arm64 PYTHON3=python3.9 dt_binding_check DT_SCHEMA_FILES=virtio/mmio.yaml' },

        { t: 'cmdx', title: 'Các phần của lệnh make',
          cmd: 'make -C $K ARCH=arm64 PYTHON3=python3.9 dt_binding_check DT_SCHEMA_FILES=virtio/mmio.yaml',
          rows: [
            ['<code>-C $K</code>', 'Chạy <code>make</code> như thể đang đứng trong <code>$K</code>, rồi quay về.', 'Bạn ở lại <code>~/bai44</code>, file nháp không lẫn vào cây kernel'],
            ['<code>ARCH=arm64</code>', 'Kiến trúc đích, như mọi lệnh <code>make</code> từ Bài 39.', 'Cây đã cấu hình cho arm64; thiếu nó <code>make</code> tưởng bạn build x86'],
            ['<code>PYTHON3=python3.9</code>', 'Python mà script của kernel sẽ dùng.', 'Chỉ cần trên máy có <code>python3</code> cũ hơn 3.9; bỏ đi nếu <code>python3 --version</code> ≥ 3.9'],
            ['<code>dt_binding_check</code>', 'Đích kiểm tra <b>chính các binding</b>: file YAML có đúng quy tắc viết schema không, và ví dụ của nó có qua được chính nó không.', 'Tạo luôn <code>processed-schema.json</code> — thứ mọi lệnh kiểm tra sau cần'],
            ['<code>DT_SCHEMA_FILES=virtio/mmio.yaml</code>', 'Chỉ dịch và kiểm tra ví dụ của file này.', 'Bỏ đi thì nó dịch ví dụ của cả 5 182 binding — lâu hơn nhiều']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          "make: Entering directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          '  SCHEMA  Documentation/devicetree/bindings/processed-schema.json\n' +
          '  CHKDT   ./Documentation/devicetree/bindings\n' +
          '  LINT    ./Documentation/devicetree/bindings\n' +
          '  DTEX    Documentation/devicetree/bindings/virtio/mmio.example.dts\n' +
          '  DTC [C] Documentation/devicetree/bindings/virtio/mmio.example.dtb\n' +
          "make: Leaving directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          '\n' +
          'real\t1m10.912s\n' +
          'user\t1m10.339s\n' +
          'sys\t0m0.599s',
          notes: ['Đường dẫn trong dòng <code>Entering directory</code> là của máy soạn bài, nơi <code>~/bai38</code> là symlink trỏ vào <code>~/embedded-course/bai38</code>; máy bạn sẽ in đường dẫn thật của mình.', 'Thời gian phụ thuộc máy: ba lần đo trên máy soạn bài cho 64 s, 64 s và 71 s. Để ý <code>user</code> gần bằng <code>real</code> — bước <code>SCHEMA</code> chạy trên <b>một</b> nhân duy nhất, nên thêm nhân không giúp gì.'] },

        { t: 'table',
          head: ['Dòng', 'Việc vừa làm'],
          rows: [
            ['<code>SCHEMA</code>', 'Gom mọi binding thành <code>processed-schema.json</code>. Đây là phần tốn gần hết thời gian.'],
            ['<code>CHKDT</code>', 'Kiểm tra từng file YAML có đúng quy tắc <i>viết</i> binding không (<code>dt-doc-validate</code>).'],
            ['<code>LINT</code>', 'Kiểm tra định dạng YAML (<code>yamllint</code>). Không cài <code>yamllint</code> thì dòng này không xuất hiện.'],
            ['<code>DTEX</code>', '<b>Ex</b>tract: tách khối <code>examples:</code> của <code>mmio.yaml</code> ra thành một file <code>.dts</code>.'],
            ['<code>DTC [C]</code>', 'Dịch file đó thành <code>.dtb</code>, rồi <b>[C]</b>heck nó theo schema. Không có dòng nào khác bên dưới nghĩa là ví dụ hợp lệ.']
          ] },

        { t: 'cal', kind: 'info', title: 'Chạy lại lệnh đó: im lặng, và mất 0,35 giây',
          x: 'Lần thứ hai <code>make</code> chỉ in hai dòng <code>Entering</code>/<code>Leaving</code> ' +
             '(đo được <code>real 0m0.349s</code>), vì mọi thứ đã mới hơn nguồn của nó. Đó cũng ' +
             'là cái bẫy lớn nhất của kiểm tra binding: <b>công cụ chỉ lên tiếng khi file được ' +
             'dịch lại</b>. Bạn sẽ đụng đúng bẫy này ở bước 3. Xem file vừa tạo:' },

        { t: 'code', where: 'wsl', code:
          'ls -l $K/Documentation/devicetree/bindings/processed-schema.json' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 cah8hc cah8hc 25017437 Sep 28 16:09 /home/cah8hc/bai38/linux-6.18.45/Documentation/devicetree/bindings/processed-schema.json',
          notes: ['<b>25 017 437</b> byte — hơn 25 MB chỉ để mô tả luật. Con số trên máy bạn sẽ lệch một chút: file chứa <b>5 248</b> đường dẫn tuyệt đối bắt đầu bằng <code>/home/cah8hc</code>, nên độ dài tên người dùng của bạn kéo kích thước lên hoặc xuống. Tên chủ file và giờ tạo cũng là của máy soạn bài.'] },

        { t: 'p', x:
          'Giờ viết một cây nhỏ có hai node: một node <code>virtio,mmio</code> <b>cố tình ' +
          'thiếu</b> <code>interrupts</code>, và node <code>learn,led-ctrl</code> của Bài 43. ' +
          'Cả hai đều đúng cú pháp.' },

        { t: 'code', where: 'file', name: '~/bai44/check.dts', lang: 'text', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "learn,demo-board";\n' +
          '\tcompatible = "linux,dummy-virt";\n' +
          '\t#address-cells = <1>;\n' +
          '\t#size-cells = <1>;\n' +
          '\n' +
          '\tvirtio@a000000 {\n' +
          '\t\tcompatible = "virtio,mmio";\n' +
          '\t\treg = <0xa000000 0x200>;\n' +
          '\t};\n' +
          '\n' +
          '\tled-ctrl@1000 {\n' +
          '\t\tcompatible = "learn,led-ctrl";\n' +
          '\t\treg = <0x1000 0x10>;\n' +
          '\t};\n' +
          '};' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o check.dtb check.dts && echo "dtc: OK"' },

        { t: 'code', where: 'out', nocopy: true, code: 'dtc: OK' },

        { t: 'p', x:
          '<code>dtc</code> không một lời cảnh báo, đúng như Bài 43. Giờ đưa cùng file đó cho ' +
          'bộ kiểm tra binding:' },

        { t: 'code', where: 'wsl', code:
          'dt-validate -m -s $K/Documentation/devicetree/bindings/processed-schema.json check.dtb\n' +
          'echo "rc=$?"' },

        { t: 'cmdx', title: 'Ba phần của dt-validate',
          cmd: 'dt-validate -m -s …/processed-schema.json check.dtb',
          rows: [
            ['<code>-s …/processed-schema.json</code>', '<b>S</b>chema: file đã gom ở trên.', 'Thiếu cờ này nó sẽ tự gom lại từ đầu — chậm, và không dùng binding của kernel'],
            ['<code>-m</code>', 'Show <b>unmatched</b>: in cả những node có <code>compatible</code> mà không binding nào nhận.', 'Mặc định nó im lặng về những node này'],
            ['<code>check.dtb</code>', 'Đầu vào là <b>DTB</b>, không phải DTS.', 'Nó kiểm tra đúng thứ kernel sẽ đọc, sau khi <code>cpp</code> và <code>dtc</code> đã chạy xong']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          "check.dtb: virtio@a000000 (virtio,mmio): 'oneOf' conditional failed, one must be fixed:\n" +
          "\t'interrupts' is a required property\n" +
          "\t'interrupts-extended' is a required property\n" +
          '\tfrom schema $id: http://devicetree.org/schemas/virtio/mmio.yaml\n' +
          "check.dtb: /led-ctrl@1000: failed to match any schema with compatible: ['learn,led-ctrl']\n" +
          'rc=0' },

        { t: 'cal', kind: 'info', title: 'Hai lời phàn nàn, và mỗi lời chỉ đúng tên binding',
          x: '<ul>' +
             '<li><b>Node virtio</b>: thiếu ngắt. Dòng <code>from schema $id: …/virtio/mmio.yaml</code> ' +
             'cho bạn biết chính xác file nào đang phán xử. Để ý nó cho <b>hai</b> cách sửa: ' +
             '<code>interrupts</code> như binding viết, hoặc <code>interrupts-extended</code> — ' +
             'một dạng khai ngắt khác mà schema lõi của <code>dtschema</code> tự động chấp nhận ' +
             'thay thế. <code>oneOf</code> nghĩa là "phải có đúng một trong hai".</li>' +
             '<li><b>Node led-ctrl</b>: không binding nào mang chuỗi <code>learn,led-ctrl</code>. ' +
             'Đây là dòng chỉ hiện ra nhờ <code>-m</code>. Nó không nói node sai; nó nói ' +
             '<i>không ai kiểm tra được</i> node này — và trên máy thật, nhiều khả năng cũng ' +
             'không có driver nào nhận nó.</li>' +
             '</ul>' },

        { t: 'cal', kind: 'warn', title: 'rc=0 dù có lỗi — đừng dùng mã thoát để quyết định',
          x: '<code>dt-validate</code> trả <code>0</code> ngay cả khi in ra vi phạm. Một script ' +
             'kiểu <code>dt-validate … &amp;&amp; echo PASS</code> sẽ luôn in <code>PASS</code>. ' +
             'Muốn tự động hoá, hãy đếm số dòng nó in ra, hoặc dùng cờ ' +
             '<code>--json-output</code> rồi đọc file JSON. Hệ thống build của kernel cũng đối ' +
             'xử như vậy: vi phạm binding là <b>cảnh báo</b>, không làm hỏng bản build.' }
      ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Những cảnh báo mà Bài 43 đã giấu đi',
        blocks: [

        { t: 'p', x:
          'Ở bước 6 của Bài 43, bạn dịch tay file Raspberry Pi 3 với <code>2&gt;/dev/null</code> ' +
          'ở cuối, và ghi chú hứa rằng Bài 44 sẽ giải thích những gì bị giấu. Làm lại đúng lệnh ' +
          'đó, lần này để stderr hiện ra:' },

        { t: 'code', where: 'wsl', code:
          'cpp -nostdinc -undef -D__DTS__ -x assembler-with-cpp \\\n' +
          '  -I $K/scripts/dtc/include-prefixes \\\n' +
          '  -o rpi3.dts.pp $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          "dtc -I dts -O dtb -o rpi3.dtb rpi3.dts.pp 2>&1 | grep -o 'Warning.*'",
          notes: ['Lệnh <code>cpp</code> giống hệt Bài 43, đã được mổ xẻ ở đó. <code>grep -o \'Warning.*\'</code> cắt bỏ phần đường dẫn file dài ở đầu mỗi dòng cho dễ đọc.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          'Warning (unit_address_vs_reg): /soc: node has a reg or ranges property, but no unit name\n' +
          'Warning (simple_bus_reg): /soc/gpu: missing or empty reg/ranges property\n' +
          'Warning (simple_bus_reg): /soc/firmware: missing or empty reg/ranges property\n' +
          'Warning (simple_bus_reg): /soc/power: missing or empty reg/ranges property' },

        { t: 'cal', kind: 'info', title: 'Đây là cảnh báo của dtc, chưa phải của binding',
          x: 'Tên trong ngoặc — <code>unit_address_vs_reg</code>, <code>simple_bus_reg</code> — ' +
             'là tên các phép kiểm tra <b>có sẵn trong <code>dtc</code></b>, loại mà Bài 43 đã ' +
             'gặp. Chúng kiểm tra quy ước chung áp cho mọi cây, không cần biết node là thiết bị ' +
             'gì. Dòng đầu nói node <code>/soc</code> có <code>ranges</code> nhưng tên không mang ' +
             '<code>@địa-chỉ</code>. Ba dòng sau nói ba node con của <code>/soc</code> — ' +
             '<code>gpu</code>, <code>firmware</code>, <code>power</code> — nằm trên một ' +
             '<code>simple-bus</code> mà lại không có <code>reg</code>. Ghi nhớ ba cái tên đó.' },

        { t: 'p', x:
          'Giờ để hệ thống build của kernel dịch cùng file đó, kèm công cụ kiểm tra binding. ' +
          'Biến <code>CHECK_DTBS=y</code> bảo Kbuild chạy <code>dt-validate</code> ngay sau mỗi ' +
          'lần <code>dtc</code>:' },

        { t: 'code', where: 'wsl', code:
          'time make -C $K ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 \\\n' +
          '  CHECK_DTBS=y broadcom/bcm2837-rpi-3-b.dtb' },

        { t: 'cmdx', title: 'Hai phần mới so với lệnh make ở bước 2',
          cmd: 'make … CHECK_DTBS=y broadcom/bcm2837-rpi-3-b.dtb',
          rows: [
            ['<code>CHECK_DTBS=y</code>', 'Sau khi dịch mỗi <code>.dtb</code>, chạy <code>dt-validate</code> lên nó với <code>processed-schema.json</code>.', 'Đây là thứ tạo ra chữ <code>[C]</code> trong <code>DTC [C]</code>'],
            ['<code>broadcom/bcm2837-rpi-3-b.dtb</code>', 'Chỉ dựng đúng một file, đường dẫn tính từ <code>arch/arm64/boot/dts/</code>.', 'Bỏ đi và dùng đích <code>dtbs_check</code> thì nó kiểm tra cả 1 396 file — xem cuối bước'],
            ['<code>CROSS_COMPILE=…</code>', 'Giống mọi lệnh build kernel từ Bài 40.', 'Việc dịch DTB thực ra không cần trình biên dịch chéo, nhưng Kbuild vẫn kiểm tra biến này khi đọc cấu hình']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          "make: Entering directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          '  DTC [C] arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb\n' +
          "arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb: soc (simple-bus): firmware: 'ranges' is a required property\n" +
          '\tfrom schema $id: http://devicetree.org/schemas/simple-bus.yaml\n' +
          "arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb: soc (simple-bus): power: 'ranges' is a required property\n" +
          '\tfrom schema $id: http://devicetree.org/schemas/simple-bus.yaml\n' +
          "arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb: soc (simple-bus): gpu: 'ranges' is a required property\n" +
          '\tfrom schema $id: http://devicetree.org/schemas/simple-bus.yaml\n' +
          "make: Leaving directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'",
          notes: ['Phần <code>time</code> báo khoảng <b>2 giây</b> trên máy soạn bài — nhanh, vì <code>processed-schema.json</code> đã có sẵn từ bước 2.'] },

        { t: 'cal', kind: 'why', title: 'Cùng ba node, hai công cụ, hai lời khác nhau — và bốn cảnh báo dtc biến mất',
          x: 'Ba node <code>gpu</code>, <code>firmware</code>, <code>power</code> lại bị gọi ' +
             'tên, nhưng lần này bởi <b>binding</b> <code>simple-bus.yaml</code>: "một node con ' +
             'của simple-bus phải có <code>ranges</code>". Còn bốn dòng <code>Warning (…)</code> ' +
             'của <code>dtc</code> thì không thấy đâu. Lý do nằm ở ' +
             '<code>scripts/Makefile.dtbs</code>, dòng 96–101: Kbuild truyền cho <code>dtc</code> ' +
             '<code>-Wno-unit_address_vs_reg</code>, <code>-Wno-simple_bus_reg</code> và bốn cờ ' +
             'tắt cảnh báo khác, dưới chú thích <code>Disable noisy checks by default</code>. ' +
             'Chỉ khi bạn build với <code>W=1</code> chúng mới bật lại. Nói cách khác: kernel ' +
             'biết những chỗ này chưa sạch, và chọn để kiểm tra binding — công cụ chính xác hơn ' +
             '— lo phần đó.' },

        { t: 'p', x:
          'Chạy lại <b>đúng</b> lệnh vừa rồi:' },

        { t: 'code', where: 'wsl', code:
          'make -C $K ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 \\\n' +
          '  CHECK_DTBS=y broadcom/bcm2837-rpi-3-b.dtb\n' +
          'sha256sum $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb' },

        { t: 'code', where: 'out', nocopy: true, code:
          "make: Entering directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          "make: Leaving directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          'c2d92e315f9a9e56a9218fda540e4a7abdb7b09ac9acc8f07546cc7488c65b6f  /home/cah8hc/bai38/linux-6.18.45/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb' },

        { t: 'cal', kind: 'warn', title: 'Không có dòng nào nữa — nhưng ba vi phạm vẫn còn nguyên',
          x: 'Lần hai, <code>make</code> thấy <code>.dtb</code> đã mới hơn nguồn nên không dịch, ' +
             'mà không dịch thì không kiểm tra. <b>Im lặng không có nghĩa là sạch.</b> Đây là ' +
             'cái bẫy đã báo trước ở bước 2, và là lý do nhiều người tưởng cây của mình không ' +
             'có vấn đề gì: họ chạy <code>dtbs_check</code> lần thứ hai. Muốn kiểm tra lại, hãy ' +
             '<code>touch</code> file <code>.dts</code> hoặc xoá file <code>.dtb</code> trước. ' +
             'Dòng <code>sha256</code> xác nhận thêm một điều: chuỗi băm ' +
             '<code>c2d92e31…</code> trùng với con số Bài 43 đã công bố — <b>kiểm tra binding ' +
             'không thay đổi một byte nào</b> của file kết quả. Nó chỉ đọc và nhận xét.' },

        { t: 'p', x:
          'Cuối cùng, xem điều gì xảy ra nếu bạn quên môi trường ảo — tình huống thường gặp ' +
          'nhất khi mở một terminal mới:' },

        { t: 'code', where: 'wsl', code:
          'deactivate\n' +
          'touch $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          'make -C $K ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 \\\n' +
          "  CHECK_DTBS=y broadcom/bcm2837-rpi-3-b.dtb 2>&1 | grep -v '^Current PATH\\|^/'\n" +
          '. venv/bin/activate',
          notes: ['<code>deactivate</code> là lệnh do <code>activate</code> định nghĩa, gỡ <code>venv/bin</code> khỏi <code>PATH</code>. Bộ lọc <code>grep -v</code> bỏ đi một dòng in nguyên giá trị <code>PATH</code> rất dài. Dòng cuối kích hoạt lại môi trường cho các bước sau.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          "make: Entering directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'\n" +
          "Error: 'dt-doc-validate' not found!\n" +
          'Ensure dtschema python package is installed and in your PATH.\n' +
          'make[2]: *** [Documentation/devicetree/bindings/Makefile:13: check_dtschema_version] Error 1\n' +
          'make[1]: *** [/home/cah8hc/embedded-course/bai38/linux-6.18.45/Makefile:1567: dt_binding_schemas] Error 2\n' +
          'make: *** [Makefile:248: __sub-make] Error 2\n' +
          "make: Leaving directory '/home/cah8hc/embedded-course/bai38/linux-6.18.45'" },

        { t: 'cal', kind: 'info', title: 'Thông báo nói đúng chỗ, nhưng gọi tên một công cụ khác',
          x: 'Bạn chưa từng gõ <code>dt-doc-validate</code>, nhưng đó là công cụ đầu tiên mà ' +
             'đích <code>check_dtschema_version</code> (dòng 13 của Makefile binding) tìm để ' +
             'đọc số phiên bản. Nó nằm trong cùng gói <code>dtschema</code> với ' +
             '<code>dt-validate</code>. Thông báo này luôn có nghĩa là "<code>venv/bin</code> ' +
             'không nằm trên <code>PATH</code>", dù gói đã được cài. Để ý: vì lỗi xảy ra trước ' +
             'bước dịch, <code>make</code> cũng không tạo lại <code>.dtb</code> — bản build thật ' +
             'của bạn không bị ảnh hưởng.' },

        { t: 'h4', x: 'Tuỳ chọn: kiểm tra toàn bộ cây arm64' },

        { t: 'p', x:
          'Đích <code>dtbs_check</code> làm việc của bước này cho <b>mọi</b> <code>.dtb</code> ' +
          'của arm64. Trên máy soạn bài (16 nhân, <code>-j16</code>) nó mất <b>1 402 giây — ' +
          'khoảng 23 phút</b>, lâu hơn cả lần build <code>Image</code> ở Bài 40. Bạn không cần ' +
          'chạy nó để học tiếp; kết quả dưới đây là số đo thật để bạn thấy quy mô. Nếu muốn ' +
          'tự chạy, hãy để nó chạy nền trong lúc đọc tiếp:' },

        { t: 'code', where: 'wsl', code:
          'make -C $K ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 \\\n' +
          '  -j$(nproc) dtbs_check > dtbs_check.log 2>&1\n' +
          "grep -c '^  DTC \\[C\\]' dtbs_check.log\n" +
          "grep -c 'from schema \\$id' dtbs_check.log\n" +
          "grep -E '^arch/.*\\.dtb: ' dtbs_check.log | cut -d: -f1 | sort -u | wc -l" },

        { t: 'code', where: 'out', nocopy: true, code:
          '1396\n' +
          '2558\n' +
          '498' },

        { t: 'cal', kind: 'info', title: '1 396 cây, 2 558 lời nhận xét, 498 cây chưa sạch',
          x: 'Dòng đầu: <b>1 396</b> file được dịch và kiểm tra. Bài 40 đếm được 1 577 ' +
             '<code>.dtb</code>; 181 file chênh lệch là cây <i>ghép</i> từ overlay (dòng ' +
             '<code>OVL</code> trong log), không được kiểm tra riêng. Dòng hai: tổng số vi phạm ' +
             'binding. Dòng ba: số cây có ít nhất một vi phạm — <b>498 trên 1 396, tức 36 %</b>. ' +
             'Cây kernel chính thức, được hàng nghìn người bảo trì, vẫn còn hơn một phần ba số ' +
             'bo mạch chưa khớp hoàn toàn với binding. Đó là lý do Kbuild coi đây là cảnh báo ' +
             'chứ không phải lỗi, và là lý do Bài 43 phải giấu chúng đi. Với cây <b>của bạn</b>, ' +
             'mục tiêu vẫn là không còn dòng nào. Con số cụ thể có thể lệch nếu ' +
             '<code>pip</code> tải được phiên bản <code>dtschema</code> mới hơn.' }
      ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Boot, và đếm xem node nào đã thành thiết bị',
        blocks: [

        { t: 'p', x:
          'Trước khi boot, liệt kê những gì cây của máy <code>virt</code> <i>hứa</i>. Lấy cây ' +
          'ra như Bài 43 đã làm, rồi dùng <code>fdtget</code> in tên và <code>compatible</code> ' +
          'của từng node con ngay dưới gốc — đúng những node mà giai đoạn 2 sẽ duyệt:' },

        { t: 'code', where: 'wsl', code:
          'cd ~/bai44\n' +
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -machine dumpdtb=virt.dtb -nographic\n' +
          'fdtget -l virt.dtb / | wc -l\n' +
          'fdtget -l virt.dtb / | grep -c virtio_mmio\n' +
          'for n in $(fdtget -l virt.dtb / | grep -v virtio_mmio); do\n' +
          "  printf '%-18s %s\\n' \"$n\" \"$(fdtget virt.dtb /$n compatible 2>/dev/null || echo '-')\"\n" +
          'done' },

        { t: 'cmdx', title: 'Vòng lặp in bảng node',
          cmd: 'for n in $(fdtget -l virt.dtb / | grep -v virtio_mmio); do printf … ; done',
          rows: [
            ['<code>fdtget -l virt.dtb /</code>', '<b>L</b>ist: in tên các node con của <code>/</code>, mỗi dòng một tên.', 'Khác với cách gọi theo cặp node–thuộc tính mà Bài 43 đã dùng'],
            ['<code>grep -v virtio_mmio</code>', 'Bỏ 32 khe virtio giống hệt nhau cho bảng gọn.', 'Hai dòng phía trên đã đếm chúng riêng'],
            ['<code>fdtget virt.dtb /$n compatible</code>', 'Đọc thuộc tính <code>compatible</code> của node đó. Chuỗi nhiều phần tử được in cách nhau bằng dấu cách.', 'Node không có thuộc tính này thì <code>fdtget</code> báo lỗi ra stderr và trả mã khác 0…'],
            ['<code>2&gt;/dev/null || echo \'-\'</code>', '…nên giấu lời báo lỗi đi và in <code>-</code> thay vào.', 'Dấu <code>-</code> chính là thứ cần tìm: node không có <code>compatible</code>'],
            ['<code>printf \'%-18s %s\\n\'</code>', 'Căn trái cột tên rộng 18 ký tự.', 'Chỉ để bảng thẳng hàng']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          '48\n' +
          '32\n' +
          'psci               arm,psci-0.2 arm,psci\n' +
          'memory@40000000    -\n' +
          'platform@c000000   qemu,platform simple-bus\n' +
          'fw-cfg@9020000     qemu,fw-cfg-mmio\n' +
          'gpio-keys          gpio-keys\n' +
          'pl061@9030000      arm,pl061 arm,primecell\n' +
          'pcie@10000000      pci-host-ecam-generic\n' +
          'pl031@9010000      arm,pl031 arm,primecell\n' +
          'pl011@9000000      arm,pl011 arm,primecell\n' +
          'pmu                arm,armv8-pmuv3\n' +
          'intc@8000000       arm,cortex-a15-gic\n' +
          'flash@0            cfi-flash\n' +
          'cpus               -\n' +
          'timer              arm,armv8-timer arm,armv7-timer\n' +
          'apb-pclk           fixed-clock\n' +
          'chosen             -',
          notes: ['Lệnh <code>qemu-system-aarch64 … dumpdtb</code> không in gì và thoát ngay, như Bài 43. Kết quả trên là của <code>-smp 2 -m 1G</code>; bảng không đổi với cờ khác, nhưng thứ tự dòng là thứ tự QEMU tạo node và có thể khác với phiên bản QEMU khác.'] },

        { t: 'cal', kind: 'info', title: 'Đánh dấu bảng bằng ba quy tắc của giai đoạn 2',
          x: '48 node con, trong đó 32 là khe virtio. Trong 16 node còn lại, áp ba quy tắc đã ' +
             'học:<ul>' +
             '<li>Dấu <code>-</code>: <code>memory@40000000</code>, <code>cpus</code>, ' +
             '<code>chosen</code> — không có <code>compatible</code>, <b>sẽ không</b> thành thiết bị.</li>' +
             '<li><code>intc@8000000</code> (GIC) và <code>apb-pclk</code> (đồng hồ) — đã được ' +
             'khởi tạo sớm, <b>sẽ không</b> thành <code>platform_device</code>.</li>' +
             '<li>Ba node mang <code>arm,primecell</code> — sẽ thành thiết bị trên bus ' +
             '<code>amba</code>, <b>không</b> nằm trong danh sách platform.</li>' +
             '</ul>' +
             'Còn lại 16 − 3 − 2 − 3 = <b>8</b> node, cộng 32 khe virtio = <b>40</b>. Đó là ' +
             'dự đoán của bạn cho số <code>platform_device</code> sinh ra từ cây. Giờ boot để kiểm tra.' },

        { t: 'p', x:
          'Boot bằng <code>Image</code> và initramfs quen thuộc, thêm ba thứ mới. Lệnh này để ' +
          'máy ảo chạy và trao cho bạn dấu nhắc <code>~ #</code>; mọi lệnh ở bước 4, 5, 6 gõ ' +
          'vào đó, trong <b>cùng một</b> lần boot:' },

        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
          '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
          '  -append "console=ttyAMA0 rdinit=/init initcall_debug log_buf_len=4M" \\\n' +
          '  -device virtio-rng-device' },

        { t: 'cmdx', title: 'Ba thứ mới so với lần boot ở Bài 40',
          cmd: '-append "… initcall_debug log_buf_len=4M" -device virtio-rng-device',
          rows: [
            ['<code>initcall_debug</code>', 'Tham số kernel. Bật hai loại dòng log: <code>calling … / initcall … returned</code> cho mỗi hàm khởi tạo, và <code>probe of … returned … after … usecs</code> cho <b>mỗi lần gọi <code>probe()</code></b>.', 'Không cần build lại gì: lõi driver kiểm tra biến này ở <code>dd.c</code> dòng 877 và gọi bản <code>really_probe_debug</code>'],
            ['<code>log_buf_len=4M</code>', 'Nới bộ đệm log của kernel lên 4 MiB.', 'Mặc định chỉ 128 KiB (<code>CONFIG_LOG_BUF_SHIFT=17</code>). <code>initcall_debug</code> sinh ra hơn 4 000 dòng; thiếu cờ này thì các dòng đầu tiên bị ghi đè và mất'],
            ['<code>-device virtio-rng-device</code>', 'Cắm một thiết bị virtio thật — bộ sinh số ngẫu nhiên — vào một trong 32 khe.', 'Để có đúng <b>một</b> khe không trống, và xem nó khác 31 khe còn lại ra sao']
          ] },

        { t: 'cal', kind: 'warn', title: 'Log chạy qua màn hình bình thường — các dòng mới không hiện ở đó',
          x: 'Bạn sẽ thấy khoảng 250 dòng log boot quen thuộc rồi dấu nhắc <code>~ #</code>. ' +
             'Không có dòng <code>probe of</code> nào trên màn hình: chúng được in ở mức ' +
             '<code>KERN_DEBUG</code>, thấp hơn mức mà console hiện ra (Bài 41 đã dạy ' +
             '<code>loglevel</code>). Chúng vẫn nằm đủ trong bộ đệm — lệnh <code>dmesg</code> ' +
             'đọc ra hết. Cách thoát máy ảo không đổi: <code>poweroff -f</code> ở cuối bước 6.' },

        { t: 'p', x:
          'Tại dấu nhắc, đếm số <code>platform_device</code> đang tồn tại:' },

        { t: 'code', where: 'qemu', code:
          'ls /sys/bus/platform/devices | wc -l\n' +
          'ls /sys/bus/platform/devices | grep -c virtio_mmio\n' +
          'ls /sys/bus/platform/devices | grep -v virtio_mmio' },

        { t: 'code', where: 'out', nocopy: true, code:
          '42\n' +
          '32\n' +
          '0.flash\n' +
          '4010000000.pcie\n' +
          '9020000.fw-cfg\n' +
          'alarmtimer.0.auto\n' +
          'gpio-keys\n' +
          'platform@c000000\n' +
          'pmu\n' +
          'psci\n' +
          'serial8250\n' +
          'timer' },

        { t: 'cal', kind: 'info', title: '42, không phải 40 — và hai kẻ lạ không đến từ cây',
          x: 'Tám cái tên khớp đúng tám node dự đoán: <code>psci</code>, ' +
             '<code>platform@c000000</code>, <code>fw-cfg</code>, <code>gpio-keys</code>, ' +
             '<code>pcie</code>, <code>pmu</code>, <code>flash</code>, <code>timer</code>. Hai ' +
             'cái thừa là <code>alarmtimer.0.auto</code> và <code>serial8250</code> — chúng ' +
             '<b>không</b> có node nào trong cây. Mã C tự tạo chúng bằng tên, theo kiểu board ' +
             'file của Bài 42: <code>kernel/time/alarmtimer.c:96</code> và ' +
             '<code>drivers/tty/serial/8250/8250_platform.c:324</code>. Bus ' +
             '<code>platform</code> chứa cả hai loại, và chỉ nhìn tên thì không phân biệt ' +
             'được — bước 5 sẽ chỉ bạn cách phân biệt.<br><br>' +
             'Để ý cách kernel đặt tên thiết bị từ cây: <b>địa chỉ đã dịch + tên node</b>. ' +
             '<code>pcie@10000000</code> thành <code>4010000000.pcie</code> vì phần tử đầu ' +
             'trong <code>reg</code> của nó là <code>0x40 0x10000000</code> — địa chỉ 64 bit ' +
             '<code>0x4010000000</code>, không phải phần sau <code>@</code>. Node không có ' +
             '<code>reg</code> như <code>psci</code> chỉ giữ tên.' },

        { t: 'p', x:
          'Ba node <code>arm,primecell</code> ở đâu? Trên một bus khác:' },

        { t: 'code', where: 'qemu', code:
          'ls /sys/bus/amba/devices\n' +
          'cat /sys/bus/amba/devices/9000000.pl011/id\n' +
          'ls -l /sys/bus/amba/devices/9000000.pl011/driver' },

        { t: 'code', where: 'out', nocopy: true, code:
          '9000000.pl011  9010000.pl031  9030000.pl061\n' +
          '00141011\n' +
          'lrwxrwxrwx    1 0        0                0 Sep 28 09:15 /sys/bus/amba/devices/9000000.pl011/driver -> ../../../bus/amba/drivers/uart-pl011',
          notes: ['Giờ trong dòng <code>ls -l</code> là giờ UTC của máy ảo lúc boot — sẽ khác trên máy bạn.'] },

        { t: 'cal', kind: 'info', title: 'UART của bạn khớp driver bằng một con số, không phải bằng chuỗi',
          x: 'Ba thiết bị đúng như dự đoán. <code>00141011</code> là số định danh mà driver bus ' +
             '<code>amba</code> đọc ra từ chính thanh ghi của con UART (<code>amba_read_periphid</code> ' +
             'trong <code>drivers/amba/bus.c</code>). Driver <code>uart-pl011</code> không có ' +
             '<code>of_match_table</code> — nó khai một bảng <code>amba_id</code> với ' +
             '<code>.id = 0x00041011</code> và <code>.mask = 0x000fffff</code> ' +
             '(<code>amba-pl011.c</code>, dòng 3097–3098). Áp mặt nạ: ' +
             '<code>0x00141011 &amp; 0x000fffff = 0x00041011</code>, khớp. Chữ số ' +
             '<code>1</code> bị mặt nạ bỏ qua là số phiên bản phần cứng. Vậy chuỗi ' +
             '<code>"arm,pl011"</code> mà Bài 38 lần theo dùng vào việc gì? Hai việc: nhờ chuỗi ' +
             '<code>"arm,primecell"</code> đi cùng, giai đoạn 2 biết phải tạo thiết bị AMBA; còn ' +
             'chính <code>"arm,pl011"</code> được <code>OF_EARLYCON_DECLARE</code> ở dòng 2733 ' +
             'khớp — cơ chế console sớm mà Bài 42 đã mổ xẻ.' },

        { t: 'p', x:
          'Cuối cùng, kiểm chứng phần chấm điểm ở lý thuyết. Đọc <code>compatible</code> của ' +
          'node <code>psci</code> ngay từ cây đang chạy, rồi xem kernel đã chọn hàm khởi tạo nào:' },

        { t: 'code', where: 'qemu', code:
          "cat /proc/device-tree/psci/compatible | tr '\\0' '\\n'\n" +
          "dmesg | grep 'psci:'" },

        { t: 'code', where: 'out', nocopy: true, code:
          'arm,psci-0.2\n' +
          'arm,psci\n' +
          '[    0.000000] psci: probing for conduit method from DT.\n' +
          '[    0.000000] psci: PSCIv0.2 detected in firmware.\n' +
          '[    0.000000] psci: Using standard PSCI v0.2 function IDs\n' +
          '[    0.000000] psci: Trusted OS migration not required' },

        { t: 'cal', kind: 'why', title: 'Chuỗi đứng đầu thắng, dù driver liệt kê nó thứ hai',
          x: 'Hai dòng đầu: <code>compatible</code> lưu các chuỗi cách nhau bằng byte ' +
             '<code>\\0</code> (Bài 43), <code>tr</code> đổi chúng thành xuống dòng. Chuỗi ở ' +
             'vị trí 0 là <code>arm,psci-0.2</code>. Dòng log thứ ba — <code>Using standard ' +
             'PSCI v0.2 function IDs</code> — chỉ được in bởi đường <code>psci_0_2_init</code>. ' +
             'Bảng của driver đặt <code>"arm,psci"</code> lên đầu, nhưng thua 4 điểm. Nguyên lý ' +
             'từ phần lý thuyết vừa được chính kernel của bạn xác nhận. Dấu thời gian ' +
             '<code>0.000000</code> nghĩa là việc này xảy ra trước khi đồng hồ hệ thống chạy — ' +
             'PSCI được khớp rất sớm, bằng <code>of_find_matching_node_and_match</code> duyệt ' +
             'toàn bộ cây, không qua <code>platform_match</code>.' }
      ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Nhìn từng lần probe() được gọi',
        blocks: [

        { t: 'p', x:
          'Đầu tiên, thứ tự thời gian. <code>initcall_debug</code> ghi lại lúc mỗi hàm khởi ' +
          'tạo bắt đầu chạy. Lọc ba hàm liên quan: driver UART, giai đoạn 2 (tạo thiết bị từ cây), ' +
          'và driver <code>virtio-mmio</code>:' },

        { t: 'code', where: 'qemu', code:
          "dmesg | grep -E 'calling  (pl011_init|of_platform_default_populate_init|virtio_mmio_init)'" },

        { t: 'code', where: 'out', nocopy: true, code:
          '[    0.197902] calling  pl011_init+0x0/0x78 @ 1\n' +
          '[    0.199198] calling  of_platform_default_populate_init+0x0/0x108 @ 1\n' +
          '[    0.586074] calling  virtio_mmio_init+0x0/0x28 @ 1',
          notes: ['Có <b>hai</b> dấu cách sau <code>calling</code> — kernel in đúng như vậy, và <code>grep</code> phải gõ đúng như vậy mới khớp. Mọi dấu thời gian ở bước này và bước 6 sẽ khác trên máy bạn, và khác cả giữa hai lần boot: khi máy chủ đang bận, cùng một dòng có thể lệch từ 0,4 s lên 2,5 s. Thứ tự các dòng thì không đổi.'] },

        { t: 'cal', kind: 'info', title: 'Driver UART đăng ký trước khi thiết bị UART tồn tại',
          x: '<code>pl011_init</code> chạy ở mức <code>arch_initcall</code> ' +
             '(<code>amba-pl011.c:3141</code>) — nó đăng ký driver lúc <b>chưa có</b> thiết bị ' +
             'AMBA nào. 1,3 ms sau, <code>of_platform_default_populate_init</code> ' +
             '(<code>arch_initcall_sync</code>, ngay sau) tạo thiết bị từ cây; mỗi thiết bị vừa ' +
             'đăng ký được đem so với driver đã chờ sẵn. <code>virtio_mmio_init</code> là ' +
             '<code>module_init</code>, chạy muộn hơn gần <b>0,4 giây</b> — lúc đó 32 thiết bị ' +
             'đã nằm sẵn, và driver mới đến đem đi so với từng cái. Đây là câu ghi chú dưới ' +
             'sơ đồ năm giai đoạn: <b>ai đến trước cũng được</b>, giai đoạn 3 chạy mỗi khi một bên mới ' +
             'xuất hiện.' },

        { t: 'p', x:
          'Giờ đếm lần gọi <code>probe()</code> trên các khe virtio, và bao nhiêu lần bị từ chối:' },

        { t: 'code', where: 'qemu', code:
          "dmesg | grep -c 'probe of .*virtio_mmio'\n" +
          "dmesg | grep 'probe of .*virtio_mmio' | grep -c 'returned 19 '\n" +
          "dmesg | grep 'probe of a00' | head -n 2\n" +
          "dmesg | grep 'probe of a003e00'" },

        { t: 'code', where: 'out', nocopy: true, code:
          '32\n' +
          '31\n' +
          '[    0.587060] probe of a000000.virtio_mmio returned 19 after 851 usecs\n' +
          '[    0.587298] probe of a000200.virtio_mmio returned 19 after 148 usecs\n' +
          '[    0.593202] probe of a003e00.virtio_mmio returned 0 after 779 usecs',
          notes: ['Số micro-giây sau <code>after</code> thay đổi mỗi lần boot. <code>32</code>, <code>31</code>, <code>19</code> và <code>0</code> thì không.'] },

        { t: 'cal', kind: 'info', title: '32 lần khớp, 32 lần gọi, 31 lần từ chối — giai đoạn 5 hiện ra thành chữ',
          x: 'Cả 32 khe đều khớp <code>of_match_table</code> (cùng chuỗi ' +
             '<code>virtio,mmio</code>), nên <code>probe()</code> được gọi đủ 32 lần — lần ' +
             'đầu ở 0,587 s, chưa đầy 1 ms sau khi driver đăng ký. <b>31</b> lần trả ' +
             '<code>19</code>: con số dương này là <code>-ENODEV</code> đã đổi dấu, vì ' +
             '<code>really_probe</code> đảo dấu mã lỗi trước khi trả về (<code>dd.c</code> ' +
             'dòng 733, chú thích <i>"Return probe errors as positive values"</i>). Đó là 31 ' +
             'khe trống: thanh ghi <code>DEVICE_ID</code> đọc ra 0. <b>Một</b> khe — ' +
             '<code>a003e00</code>, khe cuối cùng — trả <code>0</code>: đó là nơi QEMU cắm ' +
             '<code>virtio-rng-device</code>. QEMU điền khe từ địa chỉ cao nhất xuống: thử ' +
             'với hai <code>-device virtio-rng-device</code>, thiết bị thứ hai rơi vào ' +
             '<code>a003c00</code>.' },

        { t: 'p', x:
          'Còn một lời từ chối nữa đáng xem — không phải của virtio:' },

        { t: 'code', where: 'qemu', code:
          "cat /proc/device-tree/platform@c000000/compatible | tr '\\0' '\\n'\n" +
          "dmesg | grep 'probe of platform@c000000'" },

        { t: 'code', where: 'out', nocopy: true, code:
          'qemu,platform\n' +
          'simple-bus\n' +
          '[    0.437754] probe of platform@c000000 returned 19 after 447 usecs' },

        { t: 'cal', kind: 'info', title: 'Driver khớp chuỗi thứ hai, rồi tự rút lui vì không phải chuỗi thứ nhất',
          x: 'Driver <code>simple-pm-bus</code> (<code>drivers/bus/simple-pm-bus.c</code>, dòng ' +
             '139–146) có <code>"simple-bus"</code> trong bảng, nên nó khớp node này ở ' +
             '<code>index</code> 1. Nhưng trong <code>probe()</code>, nó kiểm tra: chuỗi ' +
             '<code>"simple-bus"</code> có đứng <b>đầu</b> <code>compatible</code> không? Không ' +
             '— đứng đầu là <code>"qemu,platform"</code>. Driver kết luận có thể có một driver ' +
             'riêng hơn dành cho node này, nên trả <code>-ENODEV</code> để nhường chỗ. Đây là ' +
             'cùng nguyên lý "riêng nhất thắng", nhưng do driver tự thực thi chứ không phải hàm ' +
             'chấm điểm. Và nó không làm hỏng gì: node con của một <code>simple-bus</code> đã ' +
             'được giai đoạn 2 tạo xong từ trước, không cần driver này.' },

        { t: 'p', x:
          'Giờ nhìn kết quả của một lần bind thành công, từ phía <code>/sys</code>:' },

        { t: 'code', where: 'qemu', code:
          'ls /sys/bus/platform/drivers/virtio-mmio\n' +
          "ls -l /sys/bus/platform/devices/a003e00.virtio_mmio/ | grep -- '->'" },

        { t: 'code', where: 'out', nocopy: true, code:
          'a003e00.virtio_mmio  uevent\n' +
          'bind                 unbind\n' +
          'lrwxrwxrwx    1 0        0                0 Sep 28 09:15 driver -> ../../../bus/platform/drivers/virtio-mmio\n' +
          'lrwxrwxrwx    1 0        0                0 Sep 28 09:15 of_node -> ../../../firmware/devicetree/base/virtio_mmio@a003e00\n' +
          'lrwxrwxrwx    1 0        0                0 Sep 28 09:15 subsystem -> ../../../bus/platform' },

        { t: 'cal', kind: 'info', title: 'Ba đường liên kết là ba sợi dây của cả bài',
          x: 'Thư mục của driver chứa đúng <b>một</b> thiết bị — khe đã nhận — cùng hai file ' +
             '<code>bind</code>/<code>unbind</code> sẽ dùng ở bước 6. Phía thiết bị có ba ' +
             'liên kết:<ul>' +
             '<li><code>driver</code> → driver đang lái nó. Kết quả của giai đoạn 4.</li>' +
             '<li><code>of_node</code> → <b>node trong cây</b> mà nó sinh ra từ đó. Kết quả ' +
             'của giai đoạn 2. Đây là cách phân biệt thiết bị từ cây với thiết bị tạo bằng tay ' +
             'như <code>serial8250</code>: loại sau không có liên kết này.</li>' +
             '<li><code>subsystem</code> → bus mà nó thuộc về.</li>' +
             '</ul>' +
             '<code>/sys/firmware/devicetree/base</code> là chính cây mà ' +
             '<code>/proc/device-tree</code> trỏ vào. Bài 45 sẽ đi hết cây đó.' },

        { t: 'p', x:
          'File <code>uevent</code> của thiết bị cho biết kernel đã khai gì với userspace khi ' +
          'tạo nó:' },

        { t: 'code', where: 'qemu', code:
          'cat /sys/bus/platform/devices/a003e00.virtio_mmio/uevent' },

        { t: 'code', where: 'out', nocopy: true, code:
          'DRIVER=virtio-mmio\n' +
          'OF_NAME=virtio_mmio\n' +
          'OF_FULLNAME=/virtio_mmio@a003e00\n' +
          'OF_COMPATIBLE_0=virtio,mmio\n' +
          'OF_COMPATIBLE_N=1\n' +
          'MODALIAS=of:Nvirtio_mmioT(null)Cvirtio,mmio' },

        { t: 'cal', kind: 'info', title: 'Dòng cuối là nửa còn lại của danh bạ ở bước 1',
          x: '<code>MODALIAS=of:Nvirtio_mmioT(null)Cvirtio,mmio</code> có cùng khuôn với các ' +
             'dòng <code>alias of:N*T*C…</code> trong <code>modules.alias</code>: tên node ' +
             '<code>virtio_mmio</code>, không có <code>device_type</code> (in là ' +
             '<code>(null)</code>), một chuỗi compatible. Trên một hệ thống có ' +
             '<code>udev</code>, chuỗi này được gửi lên, và <code>modprobe</code> tìm nó trong ' +
             'danh bạ: <code>of:N*T*Cvirtio,mmio</code> sẽ khớp nhờ dấu <code>*</code>. Ở đây ' +
             'driver đã dựng sẵn nên không ai cần tìm. Các dòng <code>OF_…</code> được sinh ở ' +
             '<code>drivers/of/device.c</code>, dòng 225–238.' },

        { t: 'p', x:
          'Để so sánh, nhìn một khe đã bị từ chối:' },

        { t: 'code', where: 'qemu', code:
          'ls /sys/bus/platform/devices/a000000.virtio_mmio' },

        { t: 'code', where: 'out', nocopy: true, code:
          'driver_override       power                 waiting_for_supplier\n' +
          'modalias              subsystem\n' +
          'of_node               uevent' },

        { t: 'cal', kind: 'info', title: 'Thiết bị vẫn còn đó — chỉ thiếu driver',
          x: '<code>probe()</code> từ chối không có nghĩa là thiết bị bị xoá. Khe ' +
             '<code>a000000</code> vẫn là một <code>platform_device</code> đầy đủ, vẫn có ' +
             '<code>of_node</code>. Cái nó <b>không có</b> là liên kết <code>driver</code>. ' +
             'Ngược lại, nó còn giữ file <code>waiting_for_supplier</code> — file này bị lõi ' +
             'driver xoá đi khi thiết bị bind thành công (<code>drivers/base/core.c</code>, ' +
             'dòng 1391), nên khe <code>a003e00</code> ở trên không có nó. Nhìn danh sách file ' +
             'là biết thiết bị đã có driver hay chưa.' }
      ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Gỡ driver, gắn lại, và thử ép một khe trống',
        blocks: [

        { t: 'p', x:
          'Kernel tự bind khi khớp. Nhưng bạn cũng làm tay được, và đó là công cụ gỡ lỗi mà ' +
          'người viết driver dùng hằng ngày: gỡ driver khỏi một thiết bị rồi gắn lại để chạy ' +
          '<code>probe()</code> lần nữa, không cần khởi động lại máy. Trước hết, xác nhận ' +
          'thiết bị RNG đang hoạt động:' },

        { t: 'code', where: 'qemu', code:
          'cat /sys/class/misc/hw_random/rng_current' },

        { t: 'code', where: 'out', nocopy: true, code: 'virtio_rng.0' },

        { t: 'p', x:
          'Nguồn số ngẫu nhiên phần cứng hiện tại là <code>virtio_rng.0</code> — driver của ' +
          'thiết bị bạn cắm bằng <code>-device virtio-rng-device</code>. Giờ gỡ driver ' +
          '<code>virtio-mmio</code> khỏi khe đó, rồi xem lại:' },

        { t: 'code', where: 'qemu', code:
          'echo a003e00.virtio_mmio > /sys/bus/platform/drivers/virtio-mmio/unbind\n' +
          'ls /sys/bus/platform/drivers/virtio-mmio\n' +
          'cat /sys/class/misc/hw_random/rng_available' },

        { t: 'cmdx', title: 'Một lệnh echo làm việc của cả lõi driver',
          cmd: 'echo a003e00.virtio_mmio > /sys/bus/platform/drivers/virtio-mmio/unbind',
          rows: [
            ['<code>a003e00.virtio_mmio</code>', 'Tên thiết bị, đúng như trong <code>/sys/bus/platform/devices/</code>.', 'Gõ sai tên thì nhận <code>No such device</code>'],
            ['<code>…/drivers/virtio-mmio/unbind</code>', 'File "chỉ ghi" của driver. Ghi tên thiết bị vào đây = yêu cầu driver thả nó ra.', 'Lõi driver gọi <code>virtio_mmio_remove()</code>, hàm <code>.remove</code> trong struct driver ở phần lý thuyết'],
            ['<code>echo … &gt;</code>', 'Chuyển chuỗi vào file.', 'Máy ảo chạy bằng root nên không cần <code>sudo</code>; trên máy thật thì cần']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          'bind    uevent  unbind\n' +
          'none' },

        { t: 'cal', kind: 'info', title: 'Gỡ một driver, cả chuỗi phía sau sụp theo',
          x: 'Dòng đầu: thư mục driver không còn thiết bị nào — khe <code>a003e00</code> vừa ' +
             'rời đi. Dòng hai: danh sách nguồn ngẫu nhiên chỉ còn <code>none</code>. Driver ' +
             '<code>virtio_rng</code> không bị ai gỡ trực tiếp, nhưng nó sống <i>trên</i> thiết ' +
             'bị virtio mà <code>virtio-mmio</code> tạo ra (nhớ thư mục <code>virtio0</code> ' +
             'trong thiết bị ở bước 5). Thả tầng dưới, tầng trên mất chỗ đứng. Đây là cấu trúc ' +
             'phân tầng của mô hình driver Linux, hiện ra trong một dòng.' },

        { t: 'p', x:
          'Gắn lại — lần này <code>probe()</code> chạy vì <b>bạn</b> yêu cầu, không phải vì ' +
          'boot:' },

        { t: 'code', where: 'qemu', code:
          'echo a003e00.virtio_mmio > /sys/bus/platform/drivers/virtio-mmio/bind\n' +
          'dmesg | tail -n 2\n' +
          'cat /sys/class/misc/hw_random/rng_current' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[   36.482473] probe of virtio0 returned 0 after 1765 usecs\n' +
          '[   36.483186] probe of a003e00.virtio_mmio returned 0 after 3469 usecs\n' +
          'virtio_rng.0',
          notes: ['Dấu thời gian 36 s là số giây từ lúc boot tới lúc bạn gõ lệnh — sẽ khác hoàn toàn trên máy bạn.'] },

        { t: 'cal', kind: 'why', title: 'Hai lần probe, lồng vào nhau — và thứ tự in ngược với thứ tự gọi',
          x: 'Dòng <code>probe of a003e00.virtio_mmio returned 0</code> xác nhận ' +
             '<code>virtio_mmio_probe()</code> vừa chạy lại và nhận thiết bị. Nhưng nó được in ' +
             '<b>sau</b> dòng <code>probe of virtio0</code>, dù được gọi trước. Lý do: bên trong ' +
             '<code>virtio_mmio_probe()</code>, driver đăng ký một thiết bị mới ' +
             '<code>virtio0</code> lên bus <code>virtio</code>; việc đăng ký đó lập tức kích ' +
             'hoạt giai đoạn 3 trên bus mới, <code>virtio_rng</code> khớp và probe xong <i>trước ' +
             'khi</i> hàm bên ngoài kịp trả về. Dòng log được in lúc hàm <b>trả về</b>, nên hàm ' +
             'trong in trước. Và lần này bus <code>virtio</code> khớp bằng <b>số ID thiết bị</b> ' +
             '(<code>virtio_dev_match</code>), không phải bằng chuỗi — mỗi bus có luật riêng, ' +
             'Device Tree chỉ là luật của tầng đầu tiên. Dòng cuối: <code>virtio_rng.0</code> ' +
             'đã trở lại.' },

        { t: 'p', x:
          'Cuối cùng, câu hỏi tự nhiên: nếu <code>bind</code> ép được driver vào thiết bị, ' +
          'liệu có ép được vào một khe trống không?' },

        { t: 'code', where: 'qemu', code:
          'echo a000000.virtio_mmio > /sys/bus/platform/drivers/virtio-mmio/bind\n' +
          'dmesg | tail -n 1' },

        { t: 'code', where: 'out', nocopy: true, code:
          'sh: write error: No such device\n' +
          '[   39.181032] probe of a000000.virtio_mmio returned 19 after 259 usecs' },

        { t: 'cal', kind: 'info', title: 'bind chỉ yêu cầu gọi probe() — quyền quyết định vẫn thuộc về driver',
          x: 'Ghi vào <code>bind</code> không bỏ qua bước nào. Lõi driver vẫn kiểm tra khớp ' +
             '(<code>drivers/base/bus.c</code>, dòng 266), vẫn gọi <code>probe()</code>, và ' +
             '<code>probe()</code> vẫn đọc <code>DEVICE_ID = 0</code> rồi trả ' +
             '<code>-ENODEV</code> — dòng <code>dmesg</code> in đúng <code>returned 19</code> ' +
             'như lúc boot. Mã lỗi đó được chuyển thẳng về cho lệnh <code>write()</code> của ' +
             'shell, nên <code>sh</code> in <code>No such device</code> — chính là thông điệp ' +
             'của <code>ENODEV</code>. Cây nói có khe; phần cứng nói khe trống; phần cứng thắng.' },

        { t: 'p', x:
          'Tắt máy ảo:' },

        { t: 'code', where: 'qemu', code: 'poweroff -f' },

        { t: 'p', x:
          'Kernel in một loạt dòng <code>shutdown</code> — gọi hàm <code>.shutdown</code> của ' +
          'từng thiết bị đang có driver, theo thứ tự ngược với lúc probe — rồi ' +
          '<code>reboot: Power down</code>, và bạn trở về dấu nhắc WSL. Khi không cần nữa, ' +
          'dọn thư mục nháp của bài:' },

        { t: 'code', where: 'wsl', code:
          'deactivate\n' +
          'du -sh ~/bai44\n' +
          'rm -rf ~/bai44' },

        { t: 'code', where: 'out', nocopy: true, code: '19M\t/home/cah8hc/bai44',
          notes: ['17 MB trong số đó là thư mục <code>venv</code>, 1 MiB là <code>virt.dtb</code> đã được QEMU đệm. Nếu bạn chạy phần tuỳ chọn ở bước 3, <code>dtbs_check.log</code> thêm khoảng 1 MB. File <code>processed-schema.json</code> 25 MB và các <code>.dtb</code> vừa dựng lại nằm trong cây kernel ở <code>~/bai38</code>, <b>không</b> bị lệnh này xoá — và không cần xoá: chúng là sản phẩm build bình thường. Muốn giữ bộ kiểm tra cho lần sau thì chỉ xoá các file khác, để lại <code>~/bai44/venv</code>.'] }
      ] }

    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi thông báo dưới đây đều ghi lại từ những lần chạy thật trong lúc soạn bài. Ba dòng ' +
      'cuối không phải thông báo lỗi mà là <b>sự im lặng</b> — loại khó chẩn đoán nhất, vì ' +
      'không có gì để tra.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>The virtual environment was not created successfully because ensurepip is not available.</code>',
         'Thiếu gói <code>python3.9-venv</code>. Python có sẵn nhưng module tạo môi trường ảo thì không.',
         '<code>sudo apt-get install python3.9-venv</code> rồi xoá thư mục <code>venv</code> hỏng và tạo lại. Trên bản Ubuntu mới hơn, gói tên là <code>python3-venv</code>.'],

        ['<code>fatal error: Python.h: No such file or directory</code> … <code>ERROR: Failed building wheel for pylibfdt</code>',
         '<code>pip</code> phải biên dịch <code>pylibfdt</code> từ mã C, và cần header của Python.',
         '<code>sudo apt-get install python3.9-dev</code>, rồi chạy lại <code>pip install dtschema</code>.'],

        ['<code>EOFError: EOF when reading a line</code> kèm <code>User for …:</code> trong lúc <code>pip install</code>',
         'Cấu hình <code>pip</code> của máy (thường ở <code>~/.config/pip/pip.conf</code>) trỏ tới một kho gói riêng đòi đăng nhập — hay gặp trên máy công ty.',
         'Cài từ PyPI công khai mà bỏ qua cấu hình đó: <code>PIP_CONFIG_FILE=/dev/null pip install dtschema yamllint</code>. Không sửa file cấu hình của người khác.'],

        ['<code>Error: \'dt-doc-validate\' not found!</code><br><code>Ensure dtschema python package is installed and in your PATH.</code>',
         'Môi trường ảo chưa được kích hoạt trong shell này — thường vì bạn vừa mở terminal mới. Gói đã cài nhưng không nằm trên <code>PATH</code>.',
         '<code>. ~/bai44/venv/bin/activate</code>. Dấu nhắc phải bắt đầu bằng <code>(venv)</code>.'],

        ['<code>failed to match any schema with compatible: [\'linux,dummy-virt\']</code>, cả node <code>virtio,mmio</code> cũng bị báo',
         'Chạy <code>dt-validate</code> <b>thiếu</b> <code>-s</code>. Không có schema của kernel, nó chỉ dùng schema lõi đi kèm gói — không biết binding nào của thiết bị cả.',
         'Luôn truyền <code>-s $K/Documentation/devicetree/bindings/processed-schema.json</code>. File đó được tạo ở bước 2 bằng <code>make dt_binding_check</code>.'],

        ['<code>sh: write error: No such device</code> khi ghi vào <code>…/drivers/…/bind</code>',
         'Hoặc tên thiết bị sai, hoặc — như bước 6 — driver khớp nhưng <code>probe()</code> trả <code>-ENODEV</code> vì phần cứng không có mặt.',
         'Kiểm tra tên trong <code>/sys/bus/platform/devices/</code>, rồi đọc <code>dmesg | tail</code>: có dòng <code>probe of … returned 19</code> nghĩa là driver đã được gọi và tự từ chối.'],

        ['<code>make … CHECK_DTBS=y …</code> chạy lần hai <b>không in gì</b>',
         '<code>make</code> thấy <code>.dtb</code> mới hơn nguồn nên không dịch lại, và không dịch thì không kiểm tra. Vi phạm vẫn còn nguyên.',
         '<code>touch</code> file <code>.dts</code> (hoặc xoá file <code>.dtb</code>) rồi chạy lại. Đừng coi im lặng là sạch.'],

        ['<code>dt-validate</code> in ra vi phạm nhưng <code>echo $?</code> vẫn là <code>0</code>',
         'Công cụ coi vi phạm binding là cảnh báo, không phải lỗi — cả khi chạy tay lẫn qua Kbuild.',
         'Đừng dùng mã thoát trong script. Đếm số dòng in ra, hoặc dùng <code>--json-output</code>.'],

        ['Không có dòng <code>probe of</code> nào trong <code>dmesg</code>, dù đã thêm <code>initcall_debug</code>',
         'Bộ đệm log mặc định (128 KiB) bị ghi đè: <code>initcall_debug</code> sinh hơn 4 000 dòng, những dòng lúc boot sớm bị đẩy ra ngoài.',
         'Thêm <code>log_buf_len=4M</code> vào <code>-append</code>. Kiểm tra: dòng thứ hai của <code>dmesg</code> phải là <code>Linux version …</code>.'],

        ['Node có trong cây, <code>/proc/device-tree</code> thấy nó, nhưng không có gì trong <code>/sys/bus/platform/devices</code> — <b>không một lỗi nào</b>',
         'Node không có <code>compatible</code>, hoặc có <code>status = "disabled"</code>, hoặc nằm dưới một node cha không phải bus.',
         'Kiểm tra ba điều theo đúng thứ tự đó. Giai đoạn 2 bỏ qua cả ba trường hợp mà không in gì.'],

        ['Thiết bị có trong <code>/sys/bus/platform/devices</code> nhưng thiếu liên kết <code>driver</code> — <b>không một lỗi nào</b>',
         'Không driver nào có chuỗi đó trong <code>of_match_table</code> (gõ sai, driver chưa được bật trong cấu hình, hoặc là module chưa nạp), <i>hoặc</i> driver khớp nhưng <code>probe()</code> trả <code>-ENODEV</code>/<code>-ENXIO</code>.',
         'Boot với <code>initcall_debug</code> rồi <code>dmesg | grep \'probe of &lt;tên&gt;\'</code>. Có dòng → driver đã được gọi, đọc giá trị trả về. Không có dòng → không driver nào khớp; <code>grep</code> chuỗi <code>compatible</code> trong <code>drivers/</code> như bước 1.']
      ] },

    { t: 'recap', title: 'Tóm tắt', items: [
      '<b>Binding</b> là hợp đồng giữa người viết DTS và người viết driver: file YAML trong <code>Documentation/devicetree/bindings/</code> quy định <code>compatible</code> hợp lệ, thuộc tính <b>bắt buộc</b> (<code>required:</code>) và ràng buộc của từng thuộc tính. Kernel 6.18.45 có <b>5 182</b> binding YAML và <b>814</b> file <code>.txt</code> cũ.',
      'Binding được kiểm tra <b>lúc build</b> bằng <code>dtschema</code> — cài riêng, trong môi trường ảo. <code>dt_binding_check</code> tạo <code>processed-schema.json</code> (<b>25 MB</b>); <code>dt-validate -m -s</code> kiểm tra một <code>.dtb</code>; <code>CHECK_DTBS=y</code> kiểm tra ngay khi Kbuild dịch. Kernel lúc chạy <b>không</b> đọc binding.',
      '<code>dtc</code> nói OK với node thiếu <code>interrupts</code>; <code>dt-validate</code> chỉ đúng tên thuộc tính thiếu và file binding phán xử. Nhưng nó trả <code>rc=0</code>, và chỉ lên tiếng khi file <b>được dịch lại</b>.',
      'Nửa phía driver là <code>of_match_table</code>. <code>MODULE_DEVICE_TABLE</code> biến nó thành alias trong <code>modules.alias</code> (<b>6 174</b> dòng <code>alias of:</code>), để userspace so với <code>MODALIAS</code> của thiết bị và nạp đúng module.',
      '<b>Chuỗi đứng đầu <code>compatible</code> thắng</b>: điểm là <code>INT_MAX/2 − 4 × index</code>, và kernel chọn dòng có điểm cao nhất, không phải dòng khớp đầu tiên. PSCI chọn <code>arm,psci-0.2</code> dù driver liệt kê <code>arm,psci</code> trước.',
      'Năm giai đoạn: mở phẳng DTB → <code>of_platform_populate</code> tạo <code>platform_device</code> cho node có <code>compatible</code> (bỏ node thiếu nó, node đã khởi tạo sớm, và đưa <code>arm,primecell</code> sang bus <code>amba</code>) → <code>platform_match</code> → <code>really_probe</code> → <code>probe()</code>.',
      '<b>Khớp chưa chắc đã nhận.</b> 32 khe virtio cùng khớp, <code>probe()</code> được gọi 32 lần, <b>31</b> lần trả <code>19</code> (<code>-ENODEV</code>) vì <code>DEVICE_ID = 0</code>. Cây mô tả điều được thiết kế; <code>probe()</code> kiểm chứng điều đang có.',
      '<code>initcall_debug log_buf_len=4M</code> cho thấy từng lần gọi <code>probe()</code>. <code>unbind</code>/<code>bind</code> trong <code>/sys/bus/…/drivers/…/</code> gỡ và gắn driver lúc chạy — nhưng không ép được driver nhận thiết bị mà <code>probe()</code> từ chối.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<b>Bài 45 — Thực hành Device Tree với QEMU virt.</b> Cả bài này bạn chỉ <i>đọc</i> ' +
         'cây mà QEMU dựng sẵn. Bài 45 sẽ <b>sửa</b> nó: lấy <code>virt.dtb</code> ra, dịch ' +
         'ngược, thêm một node của chính bạn, dịch lại, rồi boot bằng <code>-dtb</code> thay cho ' +
         'cây của QEMU. Bạn sẽ dùng đúng những gì vừa học để trả lời câu hỏi then chốt: node ' +
         'mới có hiện ra trong <code>/proc/device-tree</code> không, có thành một ' +
         '<code>platform_device</code> trong <code>/sys/bus/platform/devices</code> không, và ' +
         'nếu có thì có driver nào nhận nó không. Bài 45 cũng là nơi cuối cùng gỡ sợi chỉ ' +
         '<code>/chosen/bootargs</code> mà Bài 41 để lại — lần này bằng cách tự viết nó vào cây.' }

  ],

  quiz: [
    { q: 'Bạn thêm vào DTS một node <code>virtio@a000000 { compatible = "virtio,mmio"; reg = &lt;…&gt;; };</code>, quên <code>interrupts</code>. <code>dtc</code> dịch không một cảnh báo. Điều nào đúng?',
      opts: [
        'Kernel sẽ từ chối boot vì node vi phạm binding',
        '<code>dtc</code> kiểm tra cú pháp chứ không kiểm tra binding; phải chạy <code>dt-validate</code> với schema của kernel mới thấy vi phạm',
        'Binding chỉ là tài liệu cho người đọc, không có công cụ nào kiểm tra được',
        '<code>dtc</code> sẽ báo lỗi nếu bạn thêm cờ <code>-@</code>'
      ],
      a: 1,
      why: 'Bạn đã thấy tận mắt ở bước 2: <code>dtc: OK</code>, rồi <code>dt-validate -m -s …/processed-schema.json</code> in ra <code>\'interrupts\' is a required property</code> kèm tên file binding. Kernel lúc chạy không đọc binding nên vẫn boot bình thường — đó chính là lý do phải kiểm tra lúc build. Binding kiểu YAML ra đời để máy kiểm tra được; binding <code>.txt</code> cũ thì không.' },

    { q: 'Node có <code>compatible = "vendor,chip-v2", "vendor,chip"</code>. Driver A có <code>{ .compatible = "vendor,chip" }</code> ở dòng đầu bảng; driver B có <code>{ .compatible = "vendor,chip-v2" }</code>. Cả hai đều dựng sẵn trong kernel. Theo hàm chấm điểm trong <code>drivers/of/base.c</code>, dòng nào được điểm cao hơn khi so với node này?',
      opts: [
        'Dòng của driver A, vì nó đứng đầu bảng',
        'Dòng của driver B, vì nó khớp chuỗi ở vị trí 0 của node, được <code>INT_MAX/2</code>; dòng của A khớp ở vị trí 1, được <code>INT_MAX/2 − 4</code>',
        'Hai dòng bằng điểm, vì chuỗi nào khớp cũng như nhau',
        'Không dòng nào được điểm, vì node có hai chuỗi'
      ],
      a: 1,
      why: 'Điểm phụ thuộc vào vị trí của chuỗi <b>trong node</b>, không phải vị trí trong bảng của driver: <code>score = INT_MAX/2 − (index &lt;&lt; 2)</code>. Đây đúng là trường hợp PSCI ở bước 4: bảng đặt <code>"arm,psci"</code> trước, nhưng kernel vẫn chọn <code>psci_0_2_init</code>. Nguyên lý: chuỗi riêng nhất đặt đầu, và thứ tự trong cây thắng thứ tự trong driver.' },

    { q: 'Boot với <code>initcall_debug log_buf_len=4M</code>, bạn thấy <code>probe of a001000.virtio_mmio returned 19 after 70 usecs</code>. Giải thích nào đúng?',
      opts: [
        'Driver chưa được nạp, nên kernel báo lỗi 19',
        'Không driver nào khớp chuỗi <code>compatible</code> của node đó',
        'Driver đã khớp và <code>probe()</code> đã chạy, rồi tự từ chối bằng <code>-ENODEV</code> vì khe đó không có thiết bị thật',
        'Thiết bị bị hỏng và kernel đã gỡ nó khỏi <code>/sys</code>'
      ],
      a: 2,
      why: 'Dòng <code>probe of</code> chỉ được in khi <code>probe()</code> <b>đã được gọi</b> — tức là đã khớp. <code>19</code> là <code>-ENODEV</code> đổi dấu (<code>dd.c</code> dòng 733). Với virtio-mmio, đó là khe trống: thanh ghi <code>DEVICE_ID</code> đọc ra 0. Thiết bị không bị xoá — bước 5 cho thấy <code>a000000.virtio_mmio</code> vẫn nằm trong <code>/sys/bus/platform/devices</code>, chỉ thiếu liên kết <code>driver</code>. Phân biệt với trường hợp "không khớp": khi đó không có dòng <code>probe of</code> nào cả.' },

    { q: 'Node <code>/memory@40000000</code> có trong cây của máy <code>virt</code> nhưng không xuất hiện trong <code>/sys/bus/platform/devices</code>. Vì sao?',
      opts: [
        'Vì bộ nhớ quá lớn để làm một thiết bị',
        'Vì node không có thuộc tính <code>compatible</code>, và <code>of_platform_bus_create</code> ở chế độ strict bỏ qua node như vậy',
        'Vì driver bộ nhớ chưa được bật trong <code>defconfig</code>',
        'Vì nó có <code>status = "disabled"</code>'
      ],
      a: 1,
      why: 'Bảng <code>fdtget</code> ở bước 4 in <code>memory@40000000    -</code>: không có <code>compatible</code>. Giai đoạn 2 kiểm tra điều này đầu tiên (<code>platform.c</code> dòng 337) và bỏ qua lặng lẽ. <code>cpus</code> và <code>chosen</code> cũng vậy. Bộ nhớ được kernel đọc trực tiếp từ cây ở giai đoạn sớm hơn nhiều, không qua mô hình driver. Node không có <code>compatible</code> là node "chỉ có dữ liệu" — không ai lái nó.' },

    { q: 'Trong máy ảo, <code>ls /sys/bus/platform/devices | wc -l</code> in <code>42</code>, nhưng cây chỉ sinh ra 40 <code>platform_device</code>. Làm sao biết một thiết bị cụ thể có sinh ra từ cây hay không?',
      opts: [
        'Thiết bị từ cây luôn có tên chứa địa chỉ hex',
        'Xem thiết bị có liên kết <code>of_node</code> trong thư mục của nó không: có thì nó sinh ra từ một node, không có thì mã C tạo nó bằng tay',
        'Thiết bị từ cây luôn có driver, thiết bị tạo tay thì không',
        'Không có cách nào phân biệt từ userspace'
      ],
      a: 1,
      why: 'Bước 5 cho thấy <code>a003e00.virtio_mmio</code> có <code>of_node -&gt; …/devicetree/base/virtio_mmio@a003e00</code> — sợi dây nối ngược về node đã sinh ra nó. <code>alarmtimer.0.auto</code> và <code>serial8250</code> được tạo trong C (<code>alarmtimer.c:96</code>, <code>8250_platform.c:324</code>) nên không có liên kết đó. Tên không phải bằng chứng: <code>psci</code> và <code>timer</code> đến từ cây nhưng không có địa chỉ trong tên, vì node của chúng không có <code>reg</code>.' },

    { q: 'Bạn gõ <code>echo a000000.virtio_mmio &gt; /sys/bus/platform/drivers/virtio-mmio/bind</code> và nhận <code>sh: write error: No such device</code>. Điều gì đã xảy ra?',
      opts: [
        'File <code>bind</code> chỉ đọc; phải dùng <code>sudo</code>',
        'Thiết bị đó không tồn tại trong <code>/sys</code>',
        'Lõi driver đã gọi <code>probe()</code>, và <code>probe()</code> lại trả <code>-ENODEV</code> vì khe trống — <code>bind</code> chỉ yêu cầu gọi <code>probe()</code>, không ép driver phải nhận',
        'Driver <code>virtio-mmio</code> đã bị gỡ khỏi kernel'
      ],
      a: 2,
      why: 'Ngay sau lệnh đó, <code>dmesg | tail -n 1</code> ở bước 6 in <code>probe of a000000.virtio_mmio returned 19</code>: <code>probe()</code> thật sự đã chạy. Mã lỗi được trả thẳng về lệnh <code>write()</code>, và <code>ENODEV</code> có thông điệp chính là <code>No such device</code>. Quyền quyết định cuối cùng luôn thuộc về <code>probe()</code> — đó là nơi driver kiểm chứng phần cứng thật, bất kể cây nói gì.' }
  ]
});

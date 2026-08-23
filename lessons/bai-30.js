/* Bài 30 — Machine virt của ARM64
   Chặng 05 — QEMU và luồng khởi động */

Lesson.register({
  id: 'bai-30',
  title: 'Machine virt của ARM64',
  minutes: 65,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    '<p>Bài 29 mổ xẻ <b>CPU</b> ảo. Nhưng một CPU trơ trọi thì không chạy được gì: nó cần bộ ' +
    'nhớ ở đâu đó, cần một cổng nối tiếp để in ra chữ, cần bộ điều khiển ngắt để biết khi nào ' +
    'thiết bị gọi. Bài này nói về <b>cái máy</b> bao quanh CPU đó.</p>' +
    '<p>QEMU cho bạn <b>113</b> lựa chọn máy ARM64. Bạn sẽ dùng đúng một cái suốt phần còn lại ' +
    'của khoá học: <code>virt</code> — một cỗ máy <i>không tồn tại</i>, được thiết kế riêng để ' +
    'chạy ảo. Không sao chép board nào cả, và chính vì thế nó là board học tốt nhất.</p>' +
    '<p>Trọng tâm của bài là một câu hỏi rất cụ thể: <b>cái gì nằm ở địa chỉ nào?</b> Bạn sẽ ' +
    'không phải tra tài liệu — QEMU tự khai ra bằng <code>-machine dumpdtb</code>, và bạn sẽ đọc ' +
    'được rằng RAM bắt đầu ở <code>0x40000000</code>, cổng nối tiếp ở <code>0x09000000</code>, ' +
    'bộ điều khiển ngắt ở <code>0x08000000</code>, và có <b>32</b> khe virtio luôn hiện diện dù ' +
    'bạn không cắm gì vào.</p>' +
    '<p>Rồi bạn sẽ <b>dùng</b> bản đồ ấy. Cuối bài là chương trình bare-metal đầu tiên của bạn: ' +
    'mười mấy lệnh ARM64, không thư viện C, không hệ điều hành, không bootloader — chỉ ghi thẳng ' +
    'từng ký tự vào <code>0x09000000</code> và chữ hiện ra trên màn hình. Không có bằng chứng ' +
    'nào rõ hơn thế rằng bản đồ bộ nhớ là thật.</p>' +
    '<p>Bài cũng nói thẳng về <b>giới hạn</b>: <code>virt</code> không có I2C, không có SPI. ' +
    'Biết trước điều này tiết kiệm cho bạn nhiều giờ ở Chặng 10, khi bạn viết driver.</p>',

  goals: [
    'Giải thích được machine <code>virt</code> là gì, vì sao nó không mô phỏng board thật, và khi nào phải đổi sang machine khác',
    'Dump được device tree do QEMU tự sinh bằng <code>-machine dumpdtb</code> và đọc nó bằng <code>dtc</code>',
    'Đọc được bản đồ bộ nhớ của <code>virt</code> và chỉ ra địa chỉ của RAM, UART, GIC và các khe virtio',
    'Gọi đúng tên bốn khối phần cứng nền tảng: PL011, GIC, virtio-mmio, PL031 — và nói được mỗi cái làm gì',
    'Đối chiếu device tree với trạng thái thật của máy ảo bằng <code>info mtree</code> và <code>info qtree</code> ở monitor',
    'Viết và chạy một chương trình bare-metal ARM64 ghi thẳng vào thanh ghi UART',
    'Nêu được những gì <code>virt</code> không có và chọn được machine thay thế phù hợp'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. MACHINE LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một "machine" trong QEMU là gì' },

    { t: 'p', x:
      'Ở Bài 29 bạn đã thấy TCG dịch lệnh ARM64 sang lệnh x86-64. Nhưng đó mới là <b>lõi tính ' +
      'toán</b>. Khi mã guest thực hiện một lệnh ghi vào địa chỉ <code>0x09000000</code>, phải ' +
      'có ai đó quyết định: địa chỉ ấy là RAM, hay là một thanh ghi thiết bị, hay là chỗ trống?' },

    { t: 'p', x:
      'Câu trả lời nằm trong <b>machine model</b>: một mô tả bằng mã C trong QEMU, liệt kê đầy ' +
      'đủ máy ảo này có CPU nào, bao nhiêu RAM và đặt ở đâu, có những thiết bị nào và mỗi thiết ' +
      'bị chiếm dải địa chỉ nào, dây ngắt nối ra sao. Chọn machine bằng tham số <code>-M</code>.' },

    { t: 'code', where: 'wsl', code:
      'qemu-system-aarch64 -M help | wc -l' },

    { t: 'code', where: 'out', nocopy: true, code:
      '114' },

    { t: 'p', x:
      'Trừ một dòng tiêu đề, đó là <b>113</b> cỗ máy khác nhau — từ Raspberry Pi tới board ' +
      'i.MX của NXP, từ Xilinx ZynqMP tới máy chủ SBSA. Gần như tất cả đều cố gắng sao chép một ' +
      'phần cứng có thật. Đúng một cái thì không:' },

    { t: 'code', where: 'wsl', code:
      'qemu-system-aarch64 -M help | grep -E \'^virt \'' },

    { t: 'code', where: 'out', nocopy: true, code:
      'virt                 QEMU 10.2 ARM Virtual Machine (alias of virt-10.2)' },

    { t: 'cal', kind: 'why', title: 'Vì sao một cỗ máy không tồn tại lại là board học tốt nhất',
      x: '<p>Mô phỏng board thật thì phải mô phỏng cả những điều <i>vô lý</i> của nó: thanh ghi ' +
         'không tài liệu, thứ tự khởi tạo bắt buộc, những chỗ hỏng mà phần mềm phải né. Học ' +
         'trên đó thì bạn học lẫn cả kiến thức chung với đặc thù của riêng một con chip.</p>' +
         '<p><code>virt</code> đi đường khác. Nó ghép <b>những khối phần cứng chuẩn nhất</b> mà ' +
         'thế giới ARM có: UART chuẩn ARM, bộ điều khiển ngắt chuẩn ARM, đồng hồ kiến trúc ' +
         'chuẩn ARM, và virtio cho phần lưu trữ với mạng. Kết quả là một cỗ máy sạch — mọi thứ ' +
         'bạn học trên nó đều là <b>khái niệm chuyển giao được</b>, không phải mẹo vặt của một ' +
         'con chip.</p>' +
         '<p>Nó cũng là cỗ máy được dùng nhiều nhất trong thực tế: mọi hạ tầng đám mây ARM64, ' +
         'mọi CI chạy thử nhân ARM64, đều dựa trên <code>virt</code>. Đây không phải đồ chơi ' +
         'dành cho lớp học.</p>' },

    { t: 'cal', kind: 'warn', title: 'Vì sao alias virt-10.2 lại đáng quan tâm',
      x: '<p><code>virt</code> chỉ là bí danh trỏ tới <code>virt-10.2</code> — phiên bản của ' +
         '<code>virt</code> ứng với QEMU 10.2. Bản QEMU sau có thể thêm thiết bị hoặc đổi bố ' +
         'trí, và lúc đó <code>virt</code> sẽ trỏ sang <code>virt-11.x</code>.</p>' +
         '<p>Hệ quả: một script dùng <code>-M virt</code> có thể đổi hành vi sau khi bạn nâng ' +
         'cấp QEMU. Trong khoá này dùng <code>-M virt</code> cho gọn là được, nhưng khi viết ' +
         'kịch bản CI phải chạy y hệt sau nhiều năm, hãy ghi <b>phiên bản cụ thể</b>: ' +
         '<code>-M virt-10.2</code>. Cùng lý do bạn ghim phiên bản trong ' +
         '<code>package.json</code> thay vì dùng <code>latest</code>.</p>' },

    /* ══════════════════════════════════════════════
       2. BẢN ĐỒ BỘ NHỚ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bản đồ bộ nhớ của virt' },

    { t: 'p', x:
      'Trên ARM64 <b>mọi thứ đều là địa chỉ bộ nhớ</b>. Không có không gian vào/ra riêng như ' +
      'x86 với lệnh <code>in</code>/<code>out</code>. Đọc một thanh ghi của cổng nối tiếp là ' +
      'đọc một địa chỉ; ghi vào bộ điều khiển ngắt là ghi vào một địa chỉ khác. Cái quyết định ' +
      'chuyện gì xảy ra chỉ là <b>địa chỉ đó rơi vào vùng nào</b>.' },

    { t: 'p', x:
      'Vì thế bản đồ dưới đây không phải chi tiết tham khảo — nó là <b>giao diện lập trình</b> ' +
      'của cỗ máy. Đây là toàn bộ những gì bạn cần biết để nói chuyện với phần cứng ảo này.' },

    { t: 'fig', cap:
      'Bốn tầng: flash ở đáy, thiết bị trong khoảng 0x08–0x0c triệu, cửa sổ PCIe, rồi RAM bắt ' +
      'đầu đúng ở 0x40000000. Ghi nhớ hai con số: UART 0x09000000, RAM 0x40000000.',
      svg:
      '<svg viewBox="0 0 720 420" width="720" role="img" aria-label="Bản đồ bộ nhớ của machine virt: flash, thiết bị, cửa sổ PCIe và RAM cùng địa chỉ từng vùng">' +

      '<text class="d-t" x="20" y="20">Địa chỉ vật lý</text>' +
      '<text class="d-t" x="360" y="20">Vùng</text>' +
      '<text class="d-t" x="700" y="20" text-anchor="end">Kích thước</text>' +
      '<line class="d-line" x1="20" y1="28" x2="700" y2="28"/>' +

      '<rect class="d-box" x="20" y="38" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="60">0x00000000</text>' +
      '<text class="d-t"  x="360" y="60" text-anchor="middle">virt.flash0 — nơi bootloader nằm</text>' +
      '<text class="d-ts" x="690" y="60" text-anchor="end">64 MB</text>' +

      '<rect class="d-box" x="20" y="76" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="98">0x04000000</text>' +
      '<text class="d-t"  x="360" y="98" text-anchor="middle">virt.flash1 — flash thứ hai, thường để lưu biến môi trường</text>' +
      '<text class="d-ts" x="690" y="98" text-anchor="end">64 MB</text>' +

      '<rect class="d-box-p" x="20" y="114" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="136">0x08000000</text>' +
      '<text class="d-t"  x="360" y="136" text-anchor="middle">GIC — bộ điều khiển ngắt (gic_dist + gic_cpu + gicv2m)</text>' +
      '<text class="d-ts" x="690" y="136" text-anchor="end">3 vùng</text>' +

      '<rect class="d-box-a" x="20" y="152" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="174">0x09000000</text>' +
      '<text class="d-t"  x="360" y="174" text-anchor="middle">PL011 — cổng nối tiếp. Mọi dòng log boot đi qua đây</text>' +
      '<text class="d-ts" x="690" y="174" text-anchor="end">4 KB</text>' +

      '<rect class="d-box" x="20" y="190" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="212">0x09010000</text>' +
      '<text class="d-t"  x="360" y="212" text-anchor="middle">PL031 đồng hồ · fw-cfg · PL061 GPIO</text>' +
      '<text class="d-ts" x="690" y="212" text-anchor="end">3 × 4 KB</text>' +

      '<rect class="d-box-p" x="20" y="228" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="250">0x0a000000</text>' +
      '<text class="d-t"  x="360" y="250" text-anchor="middle">32 khe virtio-mmio, mỗi khe 0x200 byte — đĩa và mạng cắm vào đây</text>' +
      '<text class="d-ts" x="690" y="250" text-anchor="end">16 KB</text>' +

      '<rect class="d-box" x="20" y="266" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="288">0x0c000000</text>' +
      '<text class="d-t"  x="360" y="288" text-anchor="middle">platform-bus — chỗ trống để cắm thiết bị thêm lúc chạy</text>' +
      '<text class="d-ts" x="690" y="288" text-anchor="end">32 MB</text>' +

      '<rect class="d-box" x="20" y="304" width="680" height="34" rx="6"/>' +
      '<text class="d-tm" x="32" y="326">0x10000000</text>' +
      '<text class="d-t"  x="360" y="326" text-anchor="middle">Cửa sổ PCIe (MMIO + ioport)</text>' +
      '<text class="d-ts" x="690" y="326" text-anchor="end">~750 MB</text>' +

      '<rect class="d-box-g" x="20" y="342" width="680" height="40" rx="6"/>' +
      '<text class="d-tm" x="32" y="367">0x40000000</text>' +
      '<text class="d-t"  x="360" y="360" text-anchor="middle">mach-virt.ram — RAM thật của guest</text>' +
      '<text class="d-ts" x="360" y="376" text-anchor="middle">Nhân được nạp vào đây. Kích thước do -m quyết định</text>' +
      '<text class="d-ts" x="690" y="367" text-anchor="end">= -m</text>' +

      '<text class="d-ts" x="20" y="404">Trên 0x4010000000 còn vùng cấu hình PCIe và cửa sổ MMIO cao — chỉ dùng khi guest bật chế độ địa chỉ 64 bit</text>' +
      '</svg>' },

    { t: 'table',
      head: ['Địa chỉ đầu', 'Địa chỉ cuối', 'Tên trong QEMU', 'Nó là gì', 'Bạn cần nó khi nào'],
      rows: [
        ['<code>0x00000000</code>', '<code>0x03ffffff</code>', '<code>virt.flash0</code>',
         'Flash 64 MB. <b>CPU bắt đầu chạy từ địa chỉ 0</b> sau khi reset',
         'Chặng 06 — U-Boot sẽ được nạp vào đây'],
        ['<code>0x04000000</code>', '<code>0x07ffffff</code>', '<code>virt.flash1</code>',
         'Flash thứ hai, 64 MB',
         'Nơi U-Boot lưu biến môi trường'],
        ['<code>0x08000000</code>', '<code>0x08000fff</code>', '<code>gic_dist</code>',
         'GIC distributor — nơi cấu hình từng nguồn ngắt',
         'Chặng 10, khi driver của bạn đăng ký một trình xử lý ngắt'],
        ['<code>0x08010000</code>', '<code>0x08011fff</code>', '<code>gic_cpu</code>',
         'GIC CPU interface — nơi CPU hỏi "ngắt nào vừa tới?"',
         'Như trên'],
        ['<code>0x09000000</code>', '<code>0x09000fff</code>', '<b><code>pl011</code></b>',
         '<b>Cổng nối tiếp.</b> Ghi một byte vào đây là in một ký tự ra terminal',
         '<b>Ngay hôm nay</b>, và mọi dòng log boot từ giờ tới hết khoá'],
        ['<code>0x09010000</code>', '<code>0x09010fff</code>', '<code>pl031</code>',
         'Đồng hồ thời gian thực',
         'Khi cần biết vì sao ngày giờ trong guest luôn sai'],
        ['<code>0x09020000</code>', '<code>0x09020017</code>', '<code>fwcfg</code>',
         'Kênh QEMU dùng để trao dữ liệu cho guest (ảnh nhân, dòng lệnh, device tree)',
         'Hiếm khi trực tiếp, nhưng đây là <b>cách <code>-kernel</code> hoạt động</b>'],
        ['<code>0x09030000</code>', '<code>0x09030fff</code>', '<code>pl061</code>',
         'Bộ điều khiển GPIO. QEMU dùng nó để nhận lệnh tắt máy',
         'Chặng 10 — thí nghiệm GPIO'],
        ['<code>0x0a000000</code>', '<code>0x0a003fff</code>', '<code>virtio-mmio</code> ×32',
         '32 khe, mỗi khe <code>0x200</code> byte. Đĩa ảo và card mạng ảo cắm vào đây',
         'Chặng 09, khi bạn gắn ảnh rootfs làm đĩa ảo'],
        ['<code>0x40000000</code>', 'tuỳ <code>-m</code>', '<b><code>mach-virt.ram</code></b>',
         '<b>RAM.</b> Với <code>-m 512</code> thì hết ở <code>0x5fffffff</code>',
         '<b>Luôn luôn.</b> Nhân, initramfs và mọi thứ khác đều nằm ở đây']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao RAM bắt đầu ở 0x40000000 chứ không phải 0?',
      x: '<p>Vì địa chỉ <b>0</b> đã bị flash chiếm. Trên ARM64, sau khi reset CPU bắt đầu nạp ' +
         'lệnh từ một địa chỉ cố định — trên <code>virt</code> là địa chỉ 0 — nên chỗ đó buộc ' +
         'phải là bộ nhớ <i>không mất khi tắt điện</i>. Đặt RAM ở đó thì máy sẽ khởi động vào ' +
         'một vùng nhớ toàn số ngẫu nhiên.</p>' +
         '<p>Con số <code>0x40000000</code> = <b>1 GB</b> chừa sẵn không gian cho toàn bộ thiết ' +
         'bị bên dưới, đủ rộng để về sau thêm thiết bị mà không phải dời RAM — vì dời RAM là ' +
         'phá vỡ mọi ảnh nhân đã dựng sẵn.</p>' +
         '<p>Đây không phải quy ước riêng của QEMU. Rất nhiều SoC ARM thật cũng đặt RAM ở ' +
         '<code>0x40000000</code> hoặc <code>0x80000000</code>, vì lý do y hệt. Bạn sẽ gặp lại ' +
         'con số này ở Chặng 06 khi nói U-Boot nạp nhân vào đâu, và ở Chặng 07 khi nhân báo ' +
         'vùng nhớ nó tìm thấy.</p>' },

    /* ══════════════════════════════════════════════
       3. BỐN KHỐI PHẦN CỨNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn khối phần cứng bạn phải gọi được tên' },

    { t: 'p', x:
      'Trong bảng trên có mười vùng, nhưng chỉ bốn cái tên sẽ theo bạn suốt bảy chặng còn lại. ' +
      'Chúng đáng để học kỹ ngay bây giờ.' },

    { t: 'h3', x: 'PL011 — cổng nối tiếp' },

    { t: 'p', x:
      '<b>PL011</b> là thiết kế UART chuẩn của ARM, có mặt trên vô số SoC thật. Nó là ' +
      '<b>đường sống</b> của mọi hệ thống nhúng: khi màn hình chưa hoạt động, khi mạng chưa lên, ' +
      'khi nhân còn chưa nạp xong driver nào, cổng nối tiếp vẫn nói được. Mọi thông điệp boot ' +
      'bạn sẽ đọc từ Chặng 06 tới hết khoá đều đi qua nó.' },

    { t: 'p', x:
      'Điều làm PL011 tuyệt vời để học: nó <b>đơn giản tới mức dùng được ngay</b>. Ghi một byte ' +
      'vào ô nhớ đầu tiên của nó — <code>0x09000000</code> — là ký tự đó hiện ra. Không cần khởi ' +
      'tạo, không cần đặt tốc độ baud, không cần đợi cờ sẵn sàng. Trong phần thực hành bạn sẽ ' +
      'khai thác đúng điều này.' },

    { t: 'h3', x: 'GIC — bộ điều khiển ngắt' },

    { t: 'p', x:
      '<b>GIC</b> (Generic Interrupt Controller) là tổng đài ngắt của thế giới ARM. Thiết bị ' +
      'không nối thẳng dây ngắt vào CPU; chúng nối vào GIC, và GIC quyết định ngắt nào được ưu ' +
      'tiên, gửi tới CPU nào, có bị che hay không. Nó gồm hai nửa: <b>distributor</b> (cấu hình ' +
      'chung, ai được bật, ưu tiên bao nhiêu) và <b>CPU interface</b> (nơi từng CPU hỏi "ngắt ' +
      'nào vừa tới?" và báo "tôi xử lý xong rồi").' },

    { t: 'cal', kind: 'info', title: 'GICv2 hay GICv3?',
      x: '<p>Mặc định của <code>virt</code> là <b>GICv2</b> — device tree ghi ' +
         '<code>compatible = "arm,cortex-a15-gic"</code>. Bật GICv3 bằng ' +
         '<code>-M virt,gic-version=3</code> và device tree đổi hẳn: ' +
         '<code>compatible = "arm,gic-v3"</code>, thêm vùng <i>redistributor</i>, thêm nút ' +
         '<code>its@8080000</code> để định tuyến ngắt dạng thông điệp.</p>' +
         '<p>Vì sao có hai thế hệ: GICv2 giới hạn <b>8 CPU</b>. GICv3 bỏ trần đó và thêm ITS ' +
         'cho hệ thống nhiều thiết bị PCIe. Với khoá học này GICv2 là đủ, nhưng bạn sẽ dùng ' +
         '<code>gic-version</code> ở phần thực hành làm ví dụ mẫu cho việc <b>đổi một tham số ' +
         'thì device tree đổi theo</b>.</p>' },

    { t: 'h3', x: 'virtio-mmio — 32 khe luôn có sẵn' },

    { t: 'p', x:
      '<b>virtio</b> là cách tiếp cận khác hẳn. Thay vì mô phỏng một con chip đĩa hay card mạng ' +
      'có thật — vốn tốn công và chạy chậm vì phải giả lập từng thanh ghi — virtio định nghĩa ' +
      'một giao diện <b>sinh ra để dành cho máy ảo</b>: guest và QEMU trao đổi qua một vòng đệm ' +
      'chung trong bộ nhớ. Ít lần bẫy ra ngoài hơn, ít mô phỏng hơn, nhanh hơn nhiều lần.' },

    { t: 'p', x:
      'Điều bất ngờ với người mới: <code>virt</code> khai báo <b>32 khe virtio ngay cả khi bạn ' +
      'không cắm thiết bị nào</b>. Trong phần thực hành bạn sẽ chứng minh device tree ' +
      '<i>không đổi một byte</i> khi thêm một card mạng ảo.' },

    { t: 'cal', kind: 'why', title: 'Vì sao khai báo sẵn 32 khe rỗng?',
      x: '<p>Vì device tree được sinh <b>trước khi</b> nhân khởi động, còn thiết bị thì có thể ' +
         'được cắm vào sau. Nếu số khe thay đổi theo tham số dòng lệnh, mỗi lần thêm một đĩa là ' +
         'device tree lại khác, và nhân phải dò lại từ đầu.</p>' +
         '<p>Giải pháp là cố định bố cục: 32 khe, mỗi khe <code>0x200</code> byte, từ ' +
         '<code>0x0a000000</code> tới <code>0x0a003e00</code>, số ngắt liên tiếp. Nhân dò từng ' +
         'khe lúc khởi động; khe nào rỗng thì đọc được số nhận dạng bằng 0 và nó bỏ qua. Chi ' +
         'phí gần như bằng không, đổi lại bố cục ổn định tuyệt đối.</p>' +
         '<p>Đây là một mẫu thiết kế bạn sẽ gặp lại: <b>khai báo tĩnh, dò động</b>. Chặng 08 sẽ ' +
         'nói kỹ về device tree, và đây là ví dụ đầu tiên bạn thấy nó giải quyết vấn đề gì.</p>' },

    { t: 'h3', x: 'fw-cfg — đường ống bí mật của -kernel' },

    { t: 'p', x:
      '<b>fw-cfg</b> là thiết bị ít ai để ý nhưng lại giải thích một điều bạn sẽ dùng hằng ngày. ' +
      'Khi bạn gõ <code>-kernel vmlinuz</code>, QEMU không "nạp file vào RAM một cách kỳ diệu" — ' +
      'nó đặt nội dung file vào kênh fw-cfg ở <code>0x09020000</code>, kèm cả dòng lệnh nhân và ' +
      'device tree. Firmware hoặc mã khởi động đọc kênh đó ra và chép vào RAM.' },

    { t: 'terms', items: [
      ['virt', '—',
       'Machine ảo thuần của QEMU cho ARM. Không sao chép board thật nào; ghép các khối phần cứng chuẩn nhất của hệ sinh thái ARM'],
      ['PL011', '—',
       'Thiết kế UART chuẩn của ARM. Ở <code>0x09000000</code> trên virt. Ghi một byte vào ô đầu là in một ký tự'],
      ['GIC', 'Generic Interrupt Controller',
       'Bộ điều khiển ngắt chuẩn ARM. Gồm distributor (cấu hình chung) và CPU interface (từng CPU hỏi và báo xong)'],
      ['SPI', 'Shared Peripheral Interrupt',
       'Ngắt dùng chung, từ thiết bị bất kỳ, gửi tới CPU bất kỳ. <b>Không liên quan</b> tới bus SPI truyền dữ liệu'],
      ['PPI', 'Private Peripheral Interrupt',
       'Ngắt riêng của từng CPU — đồng hồ kiến trúc dùng loại này'],
      ['virtio', '—',
       'Giao diện thiết bị ảo hoá: guest và trình mô phỏng trao đổi qua vòng đệm chung trong bộ nhớ thay vì giả lập chip thật'],
      ['fw-cfg', 'firmware configuration',
       'Kênh QEMU dùng để trao ảnh nhân, dòng lệnh và device tree cho guest. Chính là cơ chế đứng sau <code>-kernel</code>'],
      ['PL031', '—',
       'Đồng hồ thời gian thực chuẩn ARM, ở <code>0x09010000</code>'],
      ['PL061', '—',
       'Bộ điều khiển GPIO chuẩn ARM, ở <code>0x09030000</code>. QEMU dùng nó để guest tự tắt máy'],
      ['ECAM', 'Enhanced Configuration Access Mechanism',
       'Cách truy cập không gian cấu hình PCIe bằng địa chỉ bộ nhớ thường. Trên virt nằm ở <code>0x4010000000</code>']
    ]},

    { t: 'cal', kind: 'warn', title: 'Hai chữ SPI, hai nghĩa hoàn toàn khác nhau',
      x: '<p>Đây là bẫy từ vựng gây nhầm nhiều nhất trong thế giới ARM nhúng, và bạn sẽ gặp cả ' +
         'hai nghĩa <b>trong cùng bài này</b>:</p>' +
         '<ul>' +
         '<li><b>SPI của GIC</b> = <i>Shared Peripheral Interrupt</i>. Một <b>loại ngắt</b>. ' +
         'Trong device tree, <code>interrupts = &lt;0 1 4&gt;</code> có số 0 đầu tiên nghĩa là ' +
         '"loại SPI".</li>' +
         '<li><b>Bus SPI</b> = <i>Serial Peripheral Interface</i>. Một <b>bus truyền dữ liệu</b> ' +
         'bốn dây để nói chuyện với cảm biến, bộ nhớ flash, màn hình nhỏ.</li>' +
         '</ul>' +
         '<p>Chúng không liên quan gì tới nhau. Nghịch lý thú vị của <code>virt</code>: nó có ' +
         'đầy <b>SPI ngắt</b> nhưng <b>không có bus SPI</b> nào cả — đúng chủ đề của phần sau.</p>' },

    /* ══════════════════════════════════════════════
       4. DEVICE TREE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cách QEMU nói cho nhân biết bản đồ này' },

    { t: 'p', x:
      'Có một vấn đề chưa được giải. Bản đồ ở trên là <i>của <code>virt</code></i>. Board khác ' +
      'có bản đồ khác: UART ở địa chỉ khác, RAM bắt đầu ở chỗ khác. Vậy làm sao một ảnh nhân ' +
      'Linux ARM64 duy nhất chạy được trên cả nghìn board khác nhau?' },

    { t: 'p', x:
      'Câu trả lời là <b>device tree</b>: một tệp dữ liệu mô tả phần cứng, được trao cho nhân ' +
      'lúc khởi động. Nhân không biết trước gì cả — nó <b>đọc</b> để biết. Chặng 08 dành trọn ' +
      'bốn bài cho chủ đề này; hôm nay bạn chỉ cần dùng nó như một tài liệu tra cứu.' },

    { t: 'p', x:
      'Và điều tiện lợi: với <code>virt</code>, device tree không nằm sẵn trong file nào cả. ' +
      'QEMU <b>tự sinh nó lúc khởi động</b>, đúng theo các tham số bạn gõ. Đổi <code>-m</code> ' +
      'thì nút bộ nhớ đổi; đổi <code>-smp</code> thì số nút CPU đổi. Và bạn bắt nó khai ra được:' },

    { t: 'code', where: 'wsl', code:
      'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -machine dumpdtb=virt.dtb' },

    { t: 'cal', kind: 'tip', title: 'dumpdtb là tham số duy nhất khiến QEMU thoát ngay',
      x: '<p>Bình thường <code>qemu-system-aarch64</code> khởi động máy ảo rồi chạy mãi cho tới ' +
         'khi bạn tắt. Với <code>dumpdtb=</code>, QEMU dựng xong mô hình máy, sinh device tree, ' +
         'ghi ra file, rồi <b>thoát ngay với mã 0</b> — không CPU nào chạy một lệnh nào.</p>' +
         '<p>Nghĩa là nó an toàn tuyệt đối để dùng trong script, và nhanh. Đây sẽ là công cụ ' +
         'đầu tiên bạn với tay tới mỗi khi tự hỏi "cỗ máy này có cái gì".</p>' },

    /* ══════════════════════════════════════════════
       5. NHỮNG GÌ VIRT KHÔNG CÓ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Những gì virt không có — và vì sao bạn cần biết ngay bây giờ' },

    { t: 'p', x:
      'Danh sách thiết bị ở trên đã kể hết. Nghĩa là mọi thứ <b>không</b> có trong đó thì ' +
      '<code>virt</code> không có. Và có vài thứ vắng mặt đủ quan trọng để làm hỏng kế hoạch học ' +
      'của bạn nếu phát hiện quá muộn.' },

    { t: 'code', where: 'wsl', code:
      'for t in i2c spi mmc sdhci usb ethernet; do echo "$t: $(grep -icE "$t" virt.dts)"; done' },

    { t: 'code', where: 'out', nocopy: true, code:
      'i2c: 0\n' +
      'spi: 0\n' +
      'mmc: 0\n' +
      'sdhci: 0\n' +
      'usb: 0\n' +
      'ethernet: 0' },

    { t: 'p', x:
      'Sáu con số 0. Không phải "chưa bật" hay "cần thêm tham số" — <b>không tồn tại</b> trong ' +
      'mô hình máy.' },

    { t: 'table',
      head: ['Không có', 'Hệ quả', 'Cách đi vòng'],
      rows: [
        ['<b>Bus I2C</b>',
         'Không cắm được cảm biến nhiệt độ, EEPROM, đồng hồ ngoài. Đây là bus phổ biến nhất trong thực tế nhúng',
         'Dùng driver <code>i2c-stub</code> của nhân để dựng bus giả bằng phần mềm, hoặc đổi sang machine <code>raspi3b</code> / <code>mcimx7d-sabre</code>'],
        ['<b>Bus SPI</b>',
         'Không cắm được flash NOR ngoài, màn hình nhỏ, ADC',
         'Đổi machine, hoặc dùng <code>spi-loopback-test</code> khi chỉ cần kiểm khung giao thức'],
        ['<b>GPIO thật</b>',
         'Có PL061 nhưng chân của nó không nối ra đâu cả — không bật tắt được đèn LED nào',
         'Dùng <code>gpio-sim</code> của nhân, tạo chân GPIO ảo điều khiển qua <code>configfs</code>'],
        ['<b>MMC / SD</b>',
         'Không mô phỏng được đường khởi động từ thẻ nhớ như board thật',
         'Dùng virtio-blk. Khác cơ chế nhưng cùng khái niệm thiết bị khối'],
        ['<b>Ethernet thật</b>',
         'Không có MAC controller của một SoC cụ thể để viết driver mạng',
         'Dùng virtio-net. Đủ để học mạng, không đủ để học driver MAC'],
        ['<b>Chip nguồn, cảm biến nhiệt, đồng hồ chi tiết</b>',
         'Không mô phỏng được quản lý nguồn và điều chỉnh xung nhịp',
         'Không có cách đi vòng. Phần này bắt buộc phải có phần cứng thật']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao virt lại thiếu đúng những thứ nhúng nhất?',
      x: '<p>Vì <code>virt</code> được thiết kế cho <b>máy chủ và đám mây</b>, không phải cho ' +
         'thiết bị nhúng. Nó cần chạy nhanh, di động, ổn định qua nhiều phiên bản. I2C và SPI ' +
         'thì chậm theo bản chất — chúng có ý nghĩa khi có dây đồng thật và cảm biến thật ở đầu ' +
         'kia; mô phỏng chúng chỉ tạo ra một bus giả nói chuyện với một cảm biến giả.</p>' +
         '<p>Đây là <b>ranh giới thật</b> của việc học không cần phần cứng, và bạn nên biết nó ' +
         'ngay từ bây giờ chứ không phải ở Chặng 10. Tin tốt: những thứ <code>virt</code> ' +
         '<i>có</i> — bộ nhớ, ngắt, cổng nối tiếp, thiết bị khối, device tree — đủ cho tám mươi ' +
         'phần trăm kiến thức embedded Linux. Phần còn lại cần board, và Chặng 13 sẽ nói bạn nên ' +
         'mua board nào.</p>' },

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: bắt cỗ máy khai ra chính nó' },

    { t: 'p', x:
      'Bảy bước. Bốn bước đầu là đọc — bạn lấy bản đồ ra từ ba nguồn độc lập và đối chiếu chúng ' +
      'với nhau. Ba bước sau là viết — bạn dùng bản đồ đó để chạy chương trình bare-metal đầu ' +
      'tiên của mình, rồi thử chạm vào những giới hạn của <code>virt</code>.' },

    { t: 'steps', items: [

      /* ── BƯỚC 1 ── */
      { title: 'Lấy device tree ra khỏi QEMU',
        blocks: [
          { t: 'p', x:
            'Device tree do QEMU sinh ra ở dạng nhị phân <code>.dtb</code> — gọn cho máy đọc, ' +
            'không đọc được bằng mắt. <code>dtc</code>, trình biên dịch device tree bạn đã cài ' +
            'từ Bài 1, dịch ngược nó về dạng văn bản <code>.dts</code>.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai30 && cd ~/bai30\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -machine dumpdtb=virt.dtb\n' +
            'echo "exit=$?"\n' +
            'ls -l virt.dtb' },

          { t: 'code', where: 'out', nocopy: true, code:
            'exit=0\n' +
            '-rw-r--r-- 1 shinarus shinarus 1048576 Aug  8 10:53 virt.dtb' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -machine dumpdtb=virt.dtb',
            title: 'Mổ dòng lệnh dump',
            rows: [
              ['<code>-M virt</code>', 'Chọn mô hình máy. Bí danh của <code>virt-10.2</code> trên bản QEMU này', 'Ghi <code>-M virt-10.2</code> khi cần kết quả không đổi qua các bản nâng cấp'],
              ['<code>-cpu cortex-a57</code>', 'Chọn lõi CPU. Nó quyết định nút <code>cpu@0</code> trong device tree và tập tính năng CPU mà guest thấy', 'Bài 31 sẽ so <code>cortex-a53</code>, <code>cortex-a72</code> và <code>max</code>'],
              ['<code>-m 512</code>', 'RAM tính bằng MB. <b>Trực tiếp quyết định</b> nút <code>memory@40000000</code>', 'Bước 6 sẽ đổi con số này và xem device tree đổi theo'],
              ['<code>-nographic</code>', 'Không mở cửa sổ đồ hoạ. Bắt buộc trong WSL vì không có máy chủ hiển thị', 'Nó cũng nối cổng nối tiếp vào terminal — điểm quan trọng ở bước 5'],
              ['<code>-machine dumpdtb=virt.dtb</code>', 'Sinh device tree, ghi ra file, <b>thoát ngay</b>', 'Đây là <code>-machine</code> chứ không phải <code>-M</code> viết tắt; hai cách viết cùng một tham số nhưng chỉ dạng dài nhận được thuộc tính con']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao file luôn đúng 1 048 576 byte?',
            x: '<p>1 048 576 = <b>1 MB</b> chẵn, và bạn sẽ thấy đúng con số này dù đổi ' +
               '<code>-m</code>, <code>-smp</code> hay <code>gic-version</code>. Không phải trùng ' +
               'hợp: QEMU cấp trước một vùng 1 MB cho device tree rồi ghi nội dung vào đầu vùng ' +
               'đó, phần thừa để trống.</p>' +
               '<p>Lý do là để firmware hoặc bootloader còn <b>chỗ chèn thêm</b>. U-Boot ở Chặng ' +
               '06 sẽ ghi thêm vào cây này: địa chỉ initramfs, dòng lệnh nhân, địa chỉ MAC. Nếu ' +
               'cây được cấp vừa khít thì mọi lần chèn đều phải cấp phát lại và dời toàn bộ.</p>' },

          { t: 'p', x: 'Giờ dịch ngược sang dạng đọc được:' },

          { t: 'code', where: 'wsl', code:
            'dtc -I dtb -O dts -o virt.dts virt.dtb\n' +
            'wc -l virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '393 virt.dts' },

          { t: 'cmdx', cmd: 'dtc -I dtb -O dts -o virt.dts virt.dtb',
            title: 'Mổ lệnh dtc',
            rows: [
              ['<code>dtc</code>', 'Device Tree Compiler. Dịch được cả hai chiều giữa <code>.dts</code> văn bản và <code>.dtb</code> nhị phân', 'Gói <code>device-tree-compiler</code>, đã cài từ Bài 1'],
              ['<code>-I dtb</code>', 'Định dạng <b>vào</b> là nhị phân', '<code>-I</code> = input. Nhận cả <code>dts</code>, <code>dtb</code>, <code>fs</code>'],
              ['<code>-O dts</code>', 'Định dạng <b>ra</b> là văn bản', 'Chiều thường dùng hơn là <code>-I dts -O dtb</code> — biên dịch, và bạn sẽ dùng nó ở Chặng 08'],
              ['<code>-o virt.dts</code>', 'File kết quả. Không có nó thì kết quả đổ ra màn hình', '393 dòng thì nên ghi ra file']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao 1 MB nhị phân chỉ dịch ra 393 dòng văn bản',
            x: '<p>Con số <b>393</b> là nội dung <i>thật</i> của device tree — mọi nút, mọi thuộc ' +
               'tính, không hơn. So với <b>1 048 576</b> byte của <code>virt.dtb</code> ở bước ' +
               'trên, chỉ một phần rất nhỏ mang dữ liệu; phần còn lại là khoảng trống được cấp ' +
               'sẵn cho firmware chèn thêm, đúng như hộp thoại vừa giải thích.</p>' +
               '<p>Nhớ con số 393: bước 2 sẽ trích ra từng nút cụ thể nằm trong 393 dòng này.</p>' }
        ]},

      /* ── BƯỚC 2 ── */
      { title: 'Đọc bản đồ bộ nhớ từ device tree',
        blocks: [
          { t: 'p', x:
            'Trong device tree, tên nút theo quy ước <code>tên@địa_chỉ</code> — nên chỉ cần liệt ' +
            'kê tên nút là đã có bản đồ. Lệnh dưới lọc các thiết bị cố định, tạm bỏ 32 khe virtio ' +
            'để danh sách khỏi bị chúng lấn át:' },

          { t: 'code', where: 'wsl', code:
            'grep -nE \'^\\s+(memory|flash|pl011|pl031|pl061|intc|pcie|fw-cfg|platform-bus)@\' virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '20:\tmemory@40000000 {\n' +
            '25:\tplatform-bus@c000000 {\n' +
            '33:\tfw-cfg@9020000 {\n' +
            '273:\tpl061@9030000 {\n' +
            '284:\tpcie@10000000 {\n' +
            '300:\tpl031@9010000 {\n' +
            '308:\tpl011@9000000 {\n' +
            '321:\tintc@8000000 {\n' +
            '339:\tflash@0 {' },

          { t: 'p', x:
            'Chín dòng này khớp từng dòng với bảng ở đầu bài — nhưng lần này là do <b>chính cỗ ' +
            'máy khai ra</b>, không phải do ai chép lại. Giờ đếm các khe virtio:' },

          { t: 'code', where: 'wsl', code:
            'grep -c \'virtio_mmio@\' virt.dts\n' +
            'grep -oE \'virtio_mmio@[0-9a-f]+\' virt.dts | head -n 1\n' +
            'grep -oE \'virtio_mmio@[0-9a-f]+\' virt.dts | tail -n 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '32\n' +
            'virtio_mmio@a000000\n' +
            'virtio_mmio@a003e00' },

          { t: 'p', x:
            'Đúng 32 khe, từ <code>0xa000000</code> tới <code>0xa003e00</code>, cách nhau ' +
            '<code>0x200</code> byte — và bạn <b>chưa cắm thiết bị nào cả</b>.' },

          { t: 'p', x:
            'Giờ mở nút PL011 ra xem đầy đủ. Đây là nút bạn sẽ dùng ở bước 5:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'/^\\tpl011@9000000/,/^\\t};/p\' virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tpl011@9000000 {\n' +
            '\t\tclock-names = "uartclk", "apb_pclk";\n' +
            '\t\tclocks = <0x8000 0x8000>;\n' +
            '\t\tinterrupts = <0x00 0x01 0x04>;\n' +
            '\t\treg = <0x00 0x9000000 0x00 0x1000>;\n' +
            '\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
            '\t};' },

          { t: 'table',
            head: ['Thuộc tính', 'Giá trị', 'Nghĩa'],
            rows: [
              ['<code>compatible</code>', '<code>"arm,pl011", "arm,primecell"</code>',
               '<b>Thuộc tính quan trọng nhất.</b> Nhân dùng chuỗi này để tìm đúng driver. Nhiều chuỗi = thử theo thứ tự, khớp cái nào dùng cái đó'],
              ['<code>reg</code>', '<code>&lt;0x00 0x9000000 0x00 0x1000&gt;</code>',
               'Bốn số là <b>hai cặp</b>: địa chỉ 64 bit <code>0x0_09000000</code>, độ dài 64 bit <code>0x0_00001000</code>. Tức <b>4 KB bắt đầu ở 0x09000000</b>'],
              ['<code>interrupts</code>', '<code>&lt;0x00 0x01 0x04&gt;</code>',
               'Ba số theo quy ước GIC: loại <b>0 = SPI</b>, số hiệu <b>1</b>, cờ <b>4 = kích theo mức, tích cực cao</b>'],
              ['<code>clocks</code>', '<code>&lt;0x8000 0x8000&gt;</code>',
               'Tham chiếu tới nút xung nhịp qua <i>phandle</i> — một số nhận dạng nội bộ. Chặng 08 sẽ giải thích cơ chế này']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao địa chỉ phải viết thành hai số 32 bit?',
            x: '<p>Nút gốc khai <code>#address-cells = &lt;0x02&gt;</code> và ' +
               '<code>#size-cells = &lt;0x02&gt;</code>: mỗi địa chỉ chiếm <b>hai</b> ô 32 bit, ' +
               'mỗi kích thước cũng vậy. Nên <code>&lt;0x00 0x9000000&gt;</code> ghép lại thành ' +
               'địa chỉ 64 bit <code>0x0000000009000000</code>.</p>' +
               '<p>Vì sao không dùng thẳng số 64 bit: định dạng device tree ra đời cho máy 32 ' +
               'bit và phải giữ tương thích ngược. Ghép ô là cách mở rộng lên 64 bit mà không ' +
               'phá khuôn dạng cũ.</p>' +
               '<p>Đây là nguồn gốc của một lỗi kinh điển bạn sẽ gặp ở Chặng 08: đếm nhầm số ô ' +
               'thì địa chỉ đọc ra sai hoàn toàn, và nhân sẽ báo thiết bị không phản hồi.</p>' },

          { t: 'p', x:
            'Còn một nút nữa quyết định trải nghiệm hằng ngày của bạn:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'/^\\tchosen/,/^\\t};/p\' virt.dts | grep -v seed' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\tchosen {\n' +
            '\t\tstdout-path = "/pl011@9000000";\n' +
            '\t};' },

          { t: 'cal', kind: 'info', title: 'Đây là lý do bạn thấy được log boot',
            x: '<p><code>chosen</code> không mô tả phần cứng — nó chứa <b>lựa chọn</b> mà firmware ' +
               'truyền cho hệ điều hành. <code>stdout-path</code> nói: "in mọi thứ ra thiết bị ' +
               'này". Nhân Linux đọc nó và hướng toàn bộ đầu ra console vào PL011.</p>' +
               '<p>Nếu ở Chặng 07 bạn boot một nhân và <b>màn hình trắng trơn</b> dù nhân chạy ' +
               'bình thường, <code>stdout-path</code> và tham số <code>console=</code> là hai ' +
               'chỗ đầu tiên phải kiểm. Đây là lỗi phổ biến nhất của người mới boot nhân lần ' +
               'đầu, và giờ bạn đã biết nó nằm ở đâu.</p>' }
        ]},

      /* ── BƯỚC 3 ── */
      { title: 'Đối chiếu với trạng thái thật qua QEMU monitor',
        blocks: [
          { t: 'p', x:
            'Device tree là những gì QEMU <b>nói với guest</b>. Còn QEMU thật sự dựng cái gì bên ' +
            'trong? Hai câu hỏi khác nhau, và monitor trả lời câu thứ hai.' },

          { t: 'p', x:
            'Bài 3 đã giới thiệu monitor. Giờ dùng nó nghiêm túc: <code>-S</code> giữ CPU dừng ' +
            'ngay từ đầu để không có gì chạy trong lúc bạn quan sát.' },

          { t: 'code', where: 'wsl', code:
            'printf \'info mtree -f\\nquit\\n\' | qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -display none -serial null -monitor stdio -S | grep -E \'ram|flash|pl011|gic|virtio-mmio\' | head -n 12' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  0000000000000000-0000000003ffffff (prio 0, romd): virt.flash0\n' +
            '  0000000004000000-0000000007ffffff (prio 0, romd): virt.flash1\n' +
            '  0000000008000000-0000000008000fff (prio 0, i/o): gic_dist\n' +
            '  0000000008010000-0000000008011fff (prio 0, i/o): gic_cpu\n' +
            '  0000000008020000-0000000008020fff (prio 0, i/o): gicv2m\n' +
            '  0000000009000000-0000000009000fff (prio 0, i/o): pl011\n' +
            '  000000000a000000-000000000a0001ff (prio 0, i/o): virtio-mmio\n' +
            '  000000000a000200-000000000a0003ff (prio 0, i/o): virtio-mmio\n' +
            '  000000000a000400-000000000a0005ff (prio 0, i/o): virtio-mmio\n' +
            '  000000000a000600-000000000a0007ff (prio 0, i/o): virtio-mmio\n' +
            '  000000000a000800-000000000a0009ff (prio 0, i/o): virtio-mmio\n' +
            '  000000000a000a00-000000000a000bff (prio 0, i/o): virtio-mmio' },

          { t: 'cmdx', cmd: 'printf \'info mtree -f\\nquit\\n\' | qemu-system-aarch64 … -monitor stdio -S',
            title: 'Điều khiển monitor bằng script',
            rows: [
              ['<code>-monitor stdio</code>', 'Đưa dấu nhắc <code>(qemu)</code> ra đầu vào chuẩn, nên gõ tay được mà cũng đưa lệnh qua đường ống được', 'Xung khắc với <code>-nographic</code> vì cả hai cùng giành stdio'],
              ['<code>-display none</code>', 'Tắt hẳn phần đồ hoạ', 'Thay cho <code>-nographic</code> khi đã dùng <code>-monitor stdio</code>'],
              ['<code>-serial null</code>', 'Vứt bỏ đầu ra cổng nối tiếp của guest', 'Không có nó, log của guest sẽ trộn vào kết quả monitor'],
              ['<code>-S</code>', '<b>S</b>top — dựng máy xong thì dừng CPU, không chạy lệnh nào', 'Cần thiết khi chỉ muốn xem cấu hình. Bài 31 sẽ dùng nó cùng <code>-s</code> để gắn GDB'],
              ['<code>info mtree -f</code>', 'In <b>bản đồ phẳng</b>: dải địa chỉ nào thuộc về vùng nhớ nào, sau khi đã giải hết các tầng lồng nhau', 'Bỏ <code>-f</code> thì được cây phân cấp — đúng hơn về cấu trúc, khó tra địa chỉ hơn']
            ]},

          { t: 'cal', kind: 'info', title: 'Hai nguồn, một bản đồ — nhưng chúng không giống hệt nhau',
            x: '<p>Đối chiếu với bước 2 thì mọi địa chỉ đều khớp. Nhưng có một khác biệt đáng ' +
               'chú ý ở GIC:</p>' +
               '<ul>' +
               '<li>Device tree khai <code>reg</code> của <code>intc@8000000</code> là hai vùng ' +
               '<b>64 KB</b>.</li>' +
               '<li>Monitor cho thấy phần <i>thật sự được dùng</i> chỉ là <b>4 KB</b> ' +
               '(<code>gic_dist</code>) và <b>8 KB</b> (<code>gic_cpu</code>).</li>' +
               '</ul>' +
               '<p>Không mâu thuẫn. Device tree khai vùng <b>chừa sẵn</b> theo đúng đặc tả GIC ' +
               'của ARM; QEMU chỉ hiện thực phần thanh ghi thật có. Đọc vào khoảng trống ở giữa ' +
               'thì không có thiết bị nào trả lời.</p>' +
               '<p>Bài học rút ra: <b>device tree là lời hứa, mtree là hiện thực.</b> Khi driver ' +
               'của bạn ở Chặng 10 đọc một thanh ghi mà nhận toàn số 0, hãy so hai bản này — rất ' +
               'có thể bạn đang đọc vào phần QEMU không mô phỏng.</p>' },

          { t: 'p', x:
            '<code>info qtree</code> trả lời một câu hỏi khác: các thiết bị được <b>ghép</b> vào ' +
            'nhau ra sao, và mỗi cái được cấu hình thế nào.' },

          { t: 'code', where: 'wsl', code:
            'printf \'info qtree\\nquit\\n\' | qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -display none -serial null -monitor stdio -S | sed -n \'2,14p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bus: main-system-bus\n' +
            '  type System\n' +
            '  dev: platform-bus-device, id "platform-bus-device"\n' +
            '    gpio-out "sysbus-irq" 64\n' +
            '    num_irqs = 64 (0x40)\n' +
            '    mmio_size = 33554432 (0x2000000)\n' +
            '    mmio ffffffffffffffff/0000000002000000\n' +
            '  dev: fw_cfg_mem, id ""\n' +
            '    data_width = 8 (0x8)\n' +
            '    dma_enabled = true\n' +
            '    x-file-slots = 32 (0x20)\n' +
            '    acpi-mr-restore = true' },

          { t: 'cal', kind: 'info', title: 'Hai con số trong qtree đối chiếu được với những gì bạn đã đọc',
            x: '<p><code>mmio_size = 33554432 (0x2000000)</code> của <code>platform-bus-device</code> ' +
               'là đúng <b>32 MB</b> — khớp kích thước vùng <code>platform-bus</code> ở ' +
               '<code>0x0c000000</code> trong bảng đầu bài. <code>info qtree</code> không chỉ liệt ' +
               'kê thiết bị, nó còn cho xem <b>tham số thật</b> QEMU đã cấu hình cho từng cái.</p>' +
               '<p><code>x-file-slots = 32 (0x20)</code> của <code>fw_cfg_mem</code> là số ô tối đa ' +
               'trong thư mục tệp mà fw-cfg quản lý — đúng cơ chế bạn vừa đọc ở phần lý thuyết: mỗi ' +
               'ô giữ một tệp có tên (ảnh nhân, initrd, device tree, dòng lệnh…) mà ' +
               '<code>-kernel</code> gửi cho guest qua kênh này.</p>' },

          { t: 'cal', kind: 'tip', title: 'Ba lệnh monitor đáng thuộc lòng',
            x: '<p><code>info mtree -f</code> — cái gì ở địa chỉ nào. Dùng khi truy một truy cập ' +
               'bộ nhớ đi đâu.</p>' +
               '<p><code>info qtree</code> — cây thiết bị và thuộc tính từng cái. Dùng khi ' +
               '<code>-device</code> của bạn không có tác dụng như mong đợi, để xem nó có thật ' +
               'sự được tạo ra không.</p>' +
               '<p><code>info registers</code> — trạng thái CPU. Dùng khi guest treo và bạn cần ' +
               'biết nó đang đứng ở đâu. Bước 6 sẽ dùng tới nó.</p>' }
        ]},

      /* ── BƯỚC 4 ── */
      { title: 'Đổi một tham số, xem cỗ máy đổi theo',
        blocks: [
          { t: 'p', x:
            'Đây là bước biến device tree từ một file lạ thành một thứ bạn <b>điều khiển được</b>. ' +
            'Mỗi lần đổi một tham số dòng lệnh, dump lại, rồi <code>diff</code>. Cái gì thay đổi ' +
            'chính là cái tham số đó kiểm soát.' },

          { t: 'p', x:
            'Trước hết dựng một bản gốc để so. Hai dòng <code>rng-seed</code> và ' +
            '<code>kaslr-seed</code> là số ngẫu nhiên, đổi mỗi lần chạy — lọc bỏ chúng, ' +
            'nếu không mọi <code>diff</code> đều nhiễu:' },

          { t: 'code', where: 'wsl', code:
            'dump() {\n' +
            '  qemu-system-aarch64 -M "$1" -cpu cortex-a57 -m "$2" ${3:+$3} \\\n' +
            '    -machine dumpdtb=tmp.dtb >/dev/null 2>&1\n' +
            '  dtc -I dtb -O dts tmp.dtb 2>/dev/null | grep -vE \'rng-seed|kaslr-seed\'\n' +
            '}\n' +
            'dump virt 512 > base.dts\n' +
            'wc -l < base.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '391' },

          { t: 'cmdx', cmd: 'dump() { qemu-system-aarch64 -M "$1" -cpu cortex-a57 -m "$2" ${3:+$3} -machine dumpdtb=tmp.dtb …; dtc … | grep -vE …; }',
            title: 'Mổ hàm shell dump()',
            rows: [
              ['<code>"$1" "$2" "$3"</code>', 'Ba tham số vị trí của hàm: tên machine, dung lượng RAM, và một tham số phụ tuỳ chọn', 'Gọi <code>dump virt 512</code> nghĩa là <code>$1=virt</code>, <code>$2=512</code>, <code>$3</code> rỗng'],
              ['<code>${3:+$3}</code>', 'Chỉ chèn <code>$3</code> vào dòng lệnh khi tham số thứ ba <b>có được truyền</b>; nếu không có thì thay bằng chuỗi rỗng', 'Cú pháp bash chuẩn <code>${parameter:+word}</code> — chỉ quan tâm tham số có tồn tại hay không, không quan tâm giá trị của nó'],
              ['<code>>/dev/null 2>&amp;1</code>', 'Vứt cả stdout lẫn stderr của QEMU — hàm chỉ cần file <code>tmp.dtb</code>, không cần xem log', 'Nếu QEMU báo lỗi tham số, hàm sẽ im lặng thất bại; kiểm file kết quả nếu nghi ngờ'],
              ['<code>grep -vE \'rng-seed|kaslr-seed\'</code>', 'Lọc bỏ hai dòng số ngẫu nhiên trước khi hàm trả kết quả', 'Nhờ lọc ngay trong hàm, mọi lần gọi <code>dump</code> về sau đều tự động sạch, không phải lọc lại']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao 391 dòng, không phải 393 như bước 1?',
            x: '<p>Đúng hai dòng ít hơn con số 393 ở bước 1 — không phải sai số. Hàm ' +
               '<code>dump()</code> lọc bỏ đúng hai dòng ngẫu nhiên <code>rng-seed</code> và ' +
               '<code>kaslr-seed</code> trước khi trả kết quả, như đoạn trên vừa giải thích. Từ ' +
               'đây tới hết bước, mọi <code>base.dts</code>, <code>m1g.dts</code>, ' +
               '<code>smp2.dts</code> đều đã sạch số ngẫu nhiên, nên mọi <code>diff</code> sau ' +
               'này chỉ còn hiện thay đổi thật.</p>' },

          { t: 'p', x: 'Bây giờ đổi dung lượng RAM:' },

          { t: 'code', where: 'wsl', code:
            'dump virt 1G > m1g.dts\n' +
            'diff base.dts m1g.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '21c21\n' +
            '< \t\treg = <0x00 0x40000000 0x00 0x20000000>;\n' +
            '---\n' +
            '> \t\treg = <0x00 0x40000000 0x00 0x40000000>;' },

          { t: 'cal', kind: 'info', title: 'Một tham số, đúng một dòng',
            x: '<p>Trong 391 dòng, <code>-m 1G</code> đổi đúng <b>một</b>. Địa chỉ bắt đầu giữ ' +
               'nguyên <code>0x40000000</code>; chỉ độ dài đổi từ <code>0x20000000</code> ' +
               '(512 MiB) thành <code>0x40000000</code> (1 GiB).</p>' +
               '<p>Đó chính là <b>toàn bộ</b> cách nhân biết máy có bao nhiêu RAM. Không dò, ' +
               'không đọc SPD, không hỏi BIOS — nhân đọc một con số trong ' +
               '<code>memory@40000000</code> và tin. Nếu bạn khai sai ở Chặng 08, nhân sẽ dùng ' +
               'vùng nhớ không tồn tại và chết ngay khi cấp phát tới đó.</p>' },

          { t: 'p', x: 'Thêm một lõi CPU thì tốn kém hơn nhiều:' },

          { t: 'code', where: 'wsl', code:
            'dump virt 512 "-smp 2" > smp2.dts\n' +
            'diff base.dts smp2.dts | grep -c \'^[<>]\'\n' +
            'grep -oE \'cpu@[0-9]+\' smp2.dts\n' +
            'diff base.dts smp2.dts | grep -E \'^[<>].*(interrupt-parent|phandle|0x104|0x304)\' | head -n 6' },

          { t: 'code', where: 'out', nocopy: true, code:
            '35\n' +
            'cpu@0\n' +
            'cpu@1\n' +
            '< \tinterrupt-parent = <0x8002>;\n' +
            '> \tinterrupt-parent = <0x8003>;\n' +
            '< \t\tinterrupt-parent = <0x8002>;\n' +
            '> \t\tinterrupt-parent = <0x8003>;\n' +
            '< \t\tphandle = <0x8004>;\n' +
            '> \t\tphandle = <0x8005>;' },

          { t: 'cal', kind: 'warn', title: 'Vì sao thêm 1 lõi lại đổi 35 dòng — và vì sao đừng sửa .dtb bằng tay',
            x: '<p>Chỉ hai dòng là nội dung thật: thêm nút <code>cpu@1</code>. Số còn lại là ' +
               '<b>hiệu ứng lan toả</b>:</p>' +
               '<ul>' +
               '<li>Nút mới chiếm một <i>phandle</i>, làm mọi phandle sau nó dịch đi một: ' +
               '<code>0x8002</code> → <code>0x8003</code>, <code>0x8004</code> → ' +
               '<code>0x8005</code>.</li>' +
               '<li>Mọi chỗ <b>tham chiếu</b> tới các phandle đó — <code>interrupt-parent</code>, ' +
               '<code>gpios</code>, <code>msi-map</code>, và cả bảng ' +
               '<code>interrupt-map</code> dài của PCIe — phải sửa theo.</li>' +
               '<li>Ngắt PMU đổi cờ từ <code>0x104</code> sang <code>0x304</code>: ba số hex ' +
               'cuối là <b>mặt nạ CPU</b>, và giờ có hai CPU cần nhận ngắt thay vì một.</li>' +
               '</ul>' +
               '<p>Rút ra: device tree là một <b>đồ thị có tham chiếu chéo</b>, không phải một ' +
               'danh sách phẳng. Sửa một nút bằng trình soạn thảo nhị phân gần như chắc chắn ' +
               'làm hỏng các tham chiếu. Luôn sửa ở dạng <code>.dts</code> rồi biên dịch lại — ' +
               'quy tắc này sẽ theo bạn suốt Chặng 08.</p>' },

          { t: 'p', x:
            'Cuối cùng, đổi cả bộ điều khiển ngắt — đây là loại thay đổi bạn sẽ làm thật khi ' +
            'muốn mô phỏng một SoC đời mới:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt,gic-version=3 -cpu cortex-a57 -m 512 \\\n' +
            '  -machine dumpdtb=v3.dtb >/dev/null 2>&1\n' +
            'dtc -I dtb -O dts v3.dtb 2>/dev/null | grep -vE \'rng-seed|kaslr-seed\' > v3.dts\n' +
            'diff base.dts v3.dts | grep -c \'^[<>]\'\n' +
            'diff base.dts v3.dts | grep -E \'compatible|reg = <0x00 0x80|its@|v2m@\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '16\n' +
            '< \t\treg = <0x00 0x8000000 0x00 0x10000 0x00 0x8010000 0x00 0x10000>;\n' +
            '< \t\tcompatible = "arm,cortex-a15-gic";\n' +
            '> \t\treg = <0x00 0x8000000 0x00 0x10000 0x00 0x80a0000 0x00 0xf60000>;\n' +
            '> \t\tcompatible = "arm,gic-v3";\n' +
            '< \t\tv2m@8020000 {\n' +
            '> \t\tits@8080000 {\n' +
            '< \t\t\treg = <0x00 0x8020000 0x00 0x1000>;\n' +
            '> \t\t\tcompatible = "arm,gic-v2m-frame";\n' +
            '> \t\t\treg = <0x00 0x8080000 0x00 0x20000>;\n' +
            '> \t\t\tcompatible = "arm,gic-v3-its";' },

          { t: 'table',
            head: ['Thay đổi', 'GICv2 (mặc định)', 'GICv3'],
            rows: [
              ['<code>compatible</code>', '<code>arm,cortex-a15-gic</code>', '<code>arm,gic-v3</code> → nhân nạp driver khác hẳn'],
              ['Vùng thứ hai của <code>reg</code>', '<code>0x8010000</code>, dài <code>0x10000</code> = 64 KiB (CPU interface)', '<code>0x80a0000</code>, dài <code>0xf60000</code> ≈ <b>15,4 MiB</b> (redistributor)'],
              ['Nút con', '<code>v2m@8020000</code>, khung MSI kiểu v2m', '<code>its@8080000</code>, bộ Interrupt Translation Service'],
              ['Ngắt PMU và timer', 'cờ <code>0x104</code>', 'cờ <code>0x04</code>']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao GICv3 cần gấp 240 lần diện tích thanh ghi?',
            x: '<p>GICv2 có <b>một</b> khối "CPU interface" 64 KiB dùng chung. GICv3 thay nó ' +
               'bằng <b>redistributor</b>: mỗi CPU một khối riêng, mỗi khối 128 KiB. QEMU chừa ' +
               '15,4 MiB cho tối đa 123 CPU.</p>' +
               '<p>Đây là kiến trúc chạy theo số lõi: GICv2 giới hạn 8 CPU, còn máy chủ ARM ' +
               'ngày nay có hàng trăm. Bài học chung: <b>khi số lõi tăng, thứ đầu tiên vỡ là ' +
               'phần dùng chung.</b> Bạn đã gặp đúng nguyên tắc này ở Bài 22 với mutex dùng ' +
               'chung giữa nhiều luồng, và sẽ gặp lại ở Chặng 07 với bộ lập lịch của nhân.</p>' }
        ]},

      /* ── BƯỚC 5 ── */
      { title: 'Viết chương trình bare-metal đầu tiên, dùng đúng bản đồ vừa đọc',
        blocks: [
          { t: 'p', x:
            'Bạn vừa đọc được rằng PL011 nằm ở <code>0x09000000</code>. Giờ chứng minh con số ' +
            'đó đúng, bằng cách viết một chương trình <b>không có hệ điều hành</b> — không nhân, ' +
            'không libc, không cả <code>_start</code> của CRT — chỉ ghi thẳng byte vào địa chỉ ' +
            'đó và xem chữ hiện ra terminal.' },

          { t: 'cal', kind: 'why', title: 'Vì sao bài về "machine" lại bắt viết assembly?',
            x: '<p>Vì đây là cách duy nhất chứng minh bạn <b>thật sự đọc được</b> bản đồ. Ở Chặng ' +
               '07 khi nhân treo trước lúc kịp in gì, thứ cứu bạn là hiểu rằng console chỉ là ' +
               'một ô nhớ. Toàn bộ chương trình gói trong <b>105 byte</b> mã máy — bạn không cần ' +
               'giỏi assembly ARM64, chỉ cần thấy được nó nhỏ đến mức nào.</p>' },

          { t: 'code', where: 'file', name: '~/bai30/hello.S', lang: 'asm', code:
            '/* hello.S - bare metal ARM64, writes to the PL011 UART of QEMU virt */\n' +
            '    .equ UART0_DR, 0x09000000     /* PL011 data register, from the device tree */\n' +
            '\n' +
            '    .section .text\n' +
            '    .global _start\n' +
            '_start:\n' +
            '    ldr     x1, =UART0_DR         /* x1 = address of the data register */\n' +
            '    adr     x0, message           /* x0 = address of the string */\n' +
            '\n' +
            'put_loop:\n' +
            '    ldrb    w2, [x0], #1          /* load one byte, then advance x0 */\n' +
            '    cbz     w2, done              /* byte 0 means end of string */\n' +
            '    str     w2, [x1]              /* write the byte to the UART */\n' +
            '    b       put_loop\n' +
            '\n' +
            'done:\n' +
            '    wfi                           /* wait for interrupt: park the CPU */\n' +
            '    b       done\n' +
            '\n' +
            '    .section .rodata\n' +
            'message:\n' +
            '    .asciz "Hello from bare metal ARM64\\n"' },

          { t: 'cmdx', cmd: 'hello.S', title: 'Mổ chương trình, dòng một',
            rows: [
              ['<code>.equ UART0_DR, 0x09000000</code>', 'Đặt tên cho hằng số. Đây <b>chính là</b> địa chỉ bạn đọc được ở bước 2 từ <code>reg</code> của <code>pl011@9000000</code>', 'Không có phép màu nào: cả bài chỉ xoay quanh con số này'],
              ['<code>ldr x1, =UART0_DR</code>', 'Nạp hằng số 64 bit vào thanh ghi. Dấu <code>=</code> bảo trình dịch cất số vào vùng dữ liệu gần đó rồi nạp từ đấy', 'Lệnh ARM64 dài 4 byte nên không nhét được hằng 64 bit vào trong lệnh'],
              ['<code>adr x0, message</code>', 'Lấy địa chỉ nhãn <code>message</code>, tính <b>tương đối so với vị trí lệnh hiện tại</b>', 'Nhờ tương đối nên chương trình chạy đúng dù được nạp ở đâu'],
              ['<code>ldrb w2, [x0], #1</code>', 'Nạp <b>một byte</b> vào <code>w2</code>, <i>sau đó</i> tăng <code>x0</code> lên 1', 'Kiểu địa chỉ "post-index" — nạp và tăng con trỏ trong một lệnh'],
              ['<code>cbz w2, done</code>', '<b>C</b>ompare and <b>B</b>ranch if <b>Z</b>ero. Byte 0 là dấu kết thúc chuỗi của C', 'Không cần lệnh so sánh riêng, gộp luôn vào lệnh nhảy'],
              ['<code>str w2, [x1]</code>', '<b>Cả chương trình nằm ở dòng này.</b> Ghi byte vào <code>0x09000000</code>. QEMU thấy có ghi vào vùng của PL011 và in ký tự ra terminal', 'Đây là <i>memory-mapped I/O</i>: nói chuyện với phần cứng bằng lệnh ghi bộ nhớ thường'],
              ['<code>wfi</code>', '<b>W</b>ait <b>F</b>or <b>I</b>nterrupt. Dừng lõi cho tới khi có ngắt', 'Nếu chỉ để chương trình chạy tiếp, CPU sẽ thực thi rác sau đó và sinh exception'],
              ['<code>.asciz</code>', 'Chuỗi có tự động thêm byte 0 ở cuối', '<code>.ascii</code> thì không thêm — và vòng lặp sẽ không bao giờ dừng']
            ]},

          { t: 'p', x:
            'Còn thiếu một mảnh: nạp chương trình vào <b>đâu</b> trong RAM. Không có hệ điều ' +
            'hành thì không ai quyết hộ, nên bạn phải tự viết kịch bản liên kết:' },

          { t: 'code', where: 'file', name: '~/bai30/link.ld', lang: 'ld', code:
            'ENTRY(_start)\n' +
            'SECTIONS\n' +
            '{\n' +
            '    . = 0x40080000;               /* where QEMU loads a -kernel ELF on virt */\n' +
            '    .text   : { *(.text) }\n' +
            '    .rodata : { *(.rodata) }\n' +
            '    .data   : { *(.data) }\n' +
            '    .bss    : { *(.bss) }\n' +
            '}' },

          { t: 'cal', kind: 'why', title: 'Vì sao lại là 0x40080000?',
            x: '<p><code>0x40000000</code> là nơi RAM bắt đầu — bạn vừa đọc được từ ' +
               '<code>memory@40000000</code>. Cộng thêm <code>0x80000</code> = <b>512 KiB</b> ' +
               'chính là quy ước của Linux trên ARM64: nhân được nạp cách đầu RAM 512 KiB, ' +
               'chừa chỗ cho device tree và bảng khởi động.</p>' +
               '<p>QEMU làm theo đúng quy ước đó khi bạn dùng <code>-kernel</code>. Chọn đúng ' +
               'con số này nghĩa là chương trình của bạn nằm sẵn ở nơi QEMU sẽ đặt con trỏ lệnh ' +
               '— không cần thêm thao tác nào.</p>' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -nostdlib -static -Wl,-T,link.ld -o hello.elf hello.S\n' +
            'aarch64-linux-gnu-size hello.elf\n' +
            'aarch64-linux-gnu-readelf -h hello.elf | grep -E \'Type|Machine|Entry\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
            '    105\t      0\t      0\t    105\t     69\thello.elf\n' +
            '  Type:                              EXEC (Executable file)\n' +
            '  Machine:                           AArch64\n' +
            '  Entry point address:               0x40080000' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -nostdlib -static -Wl,-T,link.ld -o hello.elf hello.S',
            title: 'Ba cờ tách chương trình khỏi hệ điều hành',
            rows: [
              ['<code>-nostdlib</code>', 'Không liên kết thư viện chuẩn <b>và</b> không liên kết mã khởi động <code>crt1.o</code>', 'Không có nó, trình liên kết sẽ chèn mã gọi <code>main</code> qua libc — mà ở đây không có libc'],
              ['<code>-static</code>', 'Không phụ thuộc trình nạp động', 'Bare-metal thì đương nhiên không có ai chạy <code>ld-linux</code>'],
              ['<code>-Wl,-T,link.ld</code>', 'Chuyển <code>-T link.ld</code> xuống cho trình liên kết: dùng kịch bản này thay kịch bản mặc định', '<code>-Wl,</code> là đường ống từ gcc sang <code>ld</code>, bạn đã dùng ở Bài 16'],
              ['<code>hello.S</code>', 'Chữ <b>S hoa</b>. Chữ hoa nghĩa là "chạy qua bộ tiền xử lý trước", nên <code>/* … */</code> và <code>#define</code> đều dùng được', '<code>hello.s</code> chữ thường sẽ bỏ qua bước tiền xử lý']
            ]},

          { t: 'cal', kind: 'info', title: '105 byte mã, nhưng file 66 504 byte',
            x: '<p><code>size</code> nói phần <code>.text</code> chỉ <b>105 byte</b> — đúng 26 ' +
               'lệnh và một chuỗi. File <code>hello.elf</code> lại nặng 66 504 byte: phần thừa ' +
               'là header ELF, bảng section, bảng ký hiệu và thông tin gỡ lỗi. Bài 18 đã mổ ' +
               'từng phần đó.</p>' +
               '<p>QEMU chỉ nạp phần được đánh dấu <code>LOAD</code>, nên 105 byte kia mới là ' +
               'thứ thật sự vào RAM.</p>' },

          { t: 'cal', kind: 'info', title: 'readelf xác nhận đúng những gì link.ld yêu cầu',
            x: '<p><code>Entry point address: 0x40080000</code> đúng bằng con số bạn đặt ở ' +
               '<code>. = 0x40080000;</code> trong <code>link.ld</code>. Trình liên kết đã đặt ' +
               'lệnh đầu tiên của <code>_start</code> đúng nơi bạn yêu cầu, không nơi nào khác.</p>' +
               '<p><code>Type: EXEC (Executable file)</code> nghĩa là một file có địa chỉ ' +
               '<b>cố định</b>, khác <code>ET_DYN</code> (shared object / PIE) mà chương trình ' +
               'Linux thông thường hay dùng. Đúng thứ bạn cần: không có ai nạp lại địa chỉ giúp ' +
               'một chương trình bare-metal, nên nó phải chạy đúng tại địa chỉ đã liên kết.</p>' },

          { t: 'p', x: 'Chạy nó:' },

          { t: 'code', where: 'wsl', code:
            'timeout 8 qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -kernel hello.elf\n' +
            'echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Hello from bare metal ARM64\n' +
            'exit=124' },

          { t: 'cal', kind: 'tip', title: 'exit=124 là kết quả đúng, không phải lỗi',
            x: '<p>124 là mã thoát riêng của <code>timeout</code>, nghĩa là "đã hết giờ, tôi ' +
               'giết tiến trình". Chương trình của bạn kết thúc bằng <code>wfi</code> rồi nhảy ' +
               'ngược — nó <b>không bao giờ tự thoát</b>, đúng như phần cứng thật: một board ' +
               'không "kết thúc", nó chạy tới khi mất điện.</p>' +
               '<p>Vì vậy <b>luôn bọc <code>timeout</code> quanh mọi lệnh ' +
               '<code>qemu-system-*</code></b> khi chạy trong script. Không có nó, một lần thử ' +
               'nghiệm treo sẽ ngốn một lõi CPU cho tới khi bạn phát hiện ra.</p>' +
               '<p>Muốn thoát khi đang gõ tay: <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.</p>' },

          { t: 'p', x:
            'Đây là lúc dùng <code>info registers</code> để xem CPU đang đứng chính xác ở đâu:' },

          { t: 'code', where: 'wsl', code:
            '( sleep 4; printf \'info registers\\nquit\\n\' ) | timeout 20 qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -display none -serial null -monitor stdio \\\n' +
            '  -kernel hello.elf 2>&1 | grep -E \'^ PC=|^X02\' | head -n 2' },

          { t: 'code', where: 'out', nocopy: true, code:
            ' PC=000000004008001c X00=0000000040080045 X01=0000000009000000\n' +
            'X02=0000000000000000 X03=0000000000000000 X04=0000000000000000' },

          { t: 'p', x:
            'Ba thanh ghi này kể lại toàn bộ câu chuyện, và bạn đối chiếu được với bản dịch ngược:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-objdump -d hello.elf | sed -n \'/<_start>:/,$p\' | head -n 14' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0000000040080000 <_start>:\n' +
            '    40080000:\t58000101 \tldr\tx1, 40080020 <done+0x8>\n' +
            '    40080004:\t10000120 \tadr\tx0, 40080028 <message>\n' +
            '\n' +
            '0000000040080008 <put_loop>:\n' +
            '    40080008:\t38401402 \tldrb\tw2, [x0], #1\n' +
            '    4008000c:\t34000062 \tcbz\tw2, 40080018 <done>\n' +
            '    40080010:\tb9000022 \tstr\tw2, [x1]\n' +
            '    40080014:\t17fffffd \tb\t40080008 <put_loop>\n' +
            '\n' +
            '0000000040080018 <done>:\n' +
            '    40080018:\td503207f \twfi\n' +
            '    4008001c:\t17ffffff \tb\t40080018 <done>\n' +
            '    40080020:\t09000000 \t.word\t0x09000000' },

          { t: 'table',
            head: ['Quan sát', 'Giá trị', 'Ý nghĩa'],
            rows: [
              ['<code>PC</code>', '<code>0x4008001c</code>',
               'Đúng lệnh <code>b done</code> — CPU đang quay vòng ở cuối chương trình, chính xác như thiết kế'],
              ['<code>X01</code>', '<code>0x09000000</code>',
               '<b>Bằng chứng trực tiếp:</b> địa chỉ PL011 đọc từ device tree đang nằm trong thanh ghi'],
              ['<code>X00</code>', '<code>0x40080045</code>',
               'Con trỏ chuỗi đã chạy hết. <code>message</code> ở <code>0x40080028</code>, chuỗi dài 28 byte + 1 byte 0 → dừng ở <code>0x40080045</code>'],
              ['<code>X02</code>', '<code>0x00</code>',
               'Byte cuối cùng đọc được là 0 — đúng điều kiện làm <code>cbz</code> thoát vòng lặp'],
              ['<code>.word 0x09000000</code>', 'tại <code>0x40080020</code>',
               'Hằng số mà <code>ldr x1, =…</code> đã cất vào — nằm ngay sau mã lệnh, đúng như giải thích ở trên']
            ]},

          { t: 'cal', kind: 'info', title: 'Bạn vừa khép kín một vòng',
            x: '<p>Device tree nói PL011 ở <code>0x09000000</code>. Bạn viết con số đó vào ' +
               'assembly. Chương trình ghi byte vào đó. Chữ hiện ra terminal. Rồi ' +
               '<code>info registers</code> cho thấy đúng con số ấy đang nằm trong <code>X01</code>.</p>' +
               '<p>Bốn mắt xích, tự tay kiểm chứng từng cái. Đây chính là quy trình bạn sẽ lặp ' +
               'lại ở Chặng 10 khi viết driver — chỉ khác là địa chỉ sẽ do nhân ánh xạ hộ bằng ' +
               '<code>ioremap()</code> thay vì bạn viết tay.</p>' }
        ]},

      /* ── BƯỚC 6 ── */
      { title: 'Nhìn bộ dịch TCG làm việc trên một guest system-mode',
        blocks: [
          { t: 'p', x:
            'Bài 29 mổ TCG ở chế độ user. Giờ bạn có một guest system-mode nhỏ tới mức đếm được ' +
            'từng translation block — cơ hội hiếm để thấy con số sạch, không lẫn nhiễu.' },

          { t: 'code', where: 'wsl', code:
            '( sleep 4; printf \'info jit\\nquit\\n\' ) | timeout 20 qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -display none -serial null -monitor stdio \\\n' +
            '  -kernel hello.elf 2>&1 | grep -E \'gen code size|TB count|avg target|avg host|direct jump\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'gen code size       2403/644619264\n' +
            'TB count            6\n' +
            'TB avg target size  7 max=16 bytes\n' +
            'TB avg host size    158 bytes (expansion ratio: 21.6)\n' +
            'direct jump count   4 (66%) (2 jumps=2 33%)' },

          { t: 'table',
            head: ['Số liệu', 'Giá trị', 'Đọc thế nào'],
            rows: [
              ['<code>TB count</code>', '<b>6</b>',
               'Cả chương trình chỉ sinh ra 6 khối dịch. Đối chiếu bản dịch ngược: đoạn đầu, thân vòng lặp, nhánh thoát, đoạn <code>wfi</code>… — đếm được bằng mắt'],
              ['<code>avg target size</code>', '<b>7 byte</b>, max 16',
               'Trung bình chưa tới 2 lệnh ARM64 mỗi khối. Rất ngắn, vì chương trình toàn nhánh'],
              ['<code>avg host size</code>', '<b>158 byte</b>',
               'Mã x86-64 mà TCG sinh ra cho mỗi khối'],
              ['<code>expansion ratio</code>', '<b>21,6</b>',
               'So với <b>3,48</b> đo được ở Bài 29. Chênh lệch này là điều đáng học nhất ở đây'],
              ['<code>direct jump count</code>', '<b>4 (66 %)</b>',
               '4 trong 6 khối đã được nối thẳng vào khối kế tiếp — cơ chế <i>block chaining</i> của Bài 29 đang chạy'],
              ['<code>gen code size</code>', '<b>2 403</b> / 644 619 264',
               'Dùng hết 2,4 KB trong bộ đệm 615 MiB. Bộ đệm này sẽ đầy khi bạn boot nhân thật ở Chặng 07']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao hệ số nở là 21,6 chứ không phải 3,48 như Bài 29?',
            x: '<p>Ba nguyên nhân cộng lại, và cả ba đều dạy một điều:</p>' +
               '<ul>' +
               '<li><b>Khối quá ngắn.</b> 7 byte mã đích mỗi khối, nhưng mỗi khối vẫn phải trả ' +
               'chi phí cố định: nạp trạng thái, lưu trạng thái, kiểm ngắt. Chi phí cố định chia ' +
               'cho một khối bé thì tỉ lệ vọt lên. Ở Bài 29 khối đầu tiên dài 48 byte.</li>' +
               '<li><b>Có softmmu.</b> System-mode dịch địa chỉ ảo sang vật lý cho <i>mọi</i> ' +
               'lệnh truy cập bộ nhớ. Riêng <code>str w2, [x1]</code> đã kéo theo cả đoạn tra ' +
               'TLB phần mềm và nhánh dự phòng. Chế độ user không có gánh này.</li>' +
               '<li><b>Đây là MMIO.</b> Địa chỉ <code>0x09000000</code> không phải RAM, nên ' +
               'đường tra TLB luôn trượt và phải gọi hàm trợ giúp của thiết bị.</li>' +
               '</ul>' +
               '<p>Kết luận thực dụng: <b>hệ số nở của TCG phụ thuộc mạnh vào loại mã đang ' +
               'chạy.</b> Một chương trình tính toán thuần trong RAM sẽ gần con số 3–4; mã đụng ' +
               'nhiều thiết bị thì tệ hơn hẳn. Đây là lý do log boot của nhân ở Chặng 07 bò rất ' +
               'chậm ở đoạn dò thiết bị rồi nhanh hẳn khi vào userspace.</p>' }
        ]},

      /* ── BƯỚC 7 ── */
      { title: 'Chạm vào giới hạn của virt',
        blocks: [
          { t: 'p', x:
            'Bước cuối là để bạn <b>tự tay gặp</b> giới hạn, thay vì chỉ đọc về nó. ' +
            '<code>tmp105</code> là mô hình một cảm biến nhiệt độ I2C — thiết bị nhúng kinh điển ' +
            'nhất có thể. Thử cắm nó vào <code>virt</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -display none -device tmp105' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-system-aarch64: -device tmp105: No \'i2c-bus\' bus found for device \'tmp105\'' },

          { t: 'cal', kind: 'info', title: 'Một thông báo lỗi rất đáng đọc kỹ',
            x: '<p>QEMU <b>không</b> nói "không có thiết bị tmp105" — nó có mô hình đó sẵn. Nó ' +
               'nói không tìm thấy <b>bus</b> để cắm vào.</p>' +
               '<p>Trong QEMU mọi thiết bị đều phải ngồi trên một bus: virtio-mmio ngồi trên ' +
               '<code>virtio-mmio-bus</code>, card PCIe ngồi trên bus PCIe, cảm biến I2C ngồi ' +
               'trên <code>i2c-bus</code>. Machine <code>virt</code> không tạo bus loại đó, nên ' +
               'không có chỗ nào để cắm. Đây chính là điều <code>grep i2c virt.dts</code> = 0 ' +
               'nói, chỉ là lần này QEMU nói ra bằng lời.</p>' },

          { t: 'p', x: 'Bây giờ thử đúng thiết bị đó trên một machine mô phỏng board thật:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info qtree\\nquit\\n\' | timeout 25 qemu-system-aarch64 -M raspi3b \\\n' +
            '  -display none -serial null -monitor stdio -S -device tmp105 2>&1 \\\n' +
            '  | grep -iE \'tmp105|i2c\' | head -n 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  dev: bcm2835-i2c, id ""\n' +
            '    bus: i2c-bus.2\n' +
            '      type i2c-bus\n' +
            '      dev: tmp105, id ""' },

          { t: 'p', x:
            'Kết quả đảo ngược hẳn so với <code>virt</code>: <code>tmp105</code> giờ có nhà — nó ' +
            'ngồi dưới <code>bcm2835-i2c</code>, trên <code>i2c-bus.2</code>. Đây chính xác là ' +
            'thứ <code>virt</code> không có: một bộ điều khiển I2C thật của SoC, sẵn một bus để ' +
            'thiết bị I2C cắm vào.' },

          { t: 'p', x: 'Và trên một SoC công nghiệp của NXP:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info qtree\\nquit\\n\' | timeout 25 qemu-system-aarch64 -M mcimx7d-sabre \\\n' +
            '  -display none -serial null -monitor stdio -S -device tmp105 2>&1 \\\n' +
            '  | grep -iE \'tmp105|i2c\' | head -n 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  dev: imx.i2c, id ""\n' +
            '    bus: i2c-bus.3\n' +
            '      type i2c-bus\n' +
            '      dev: tmp105, id ""' },

          { t: 'table',
            head: ['Machine', 'Mô phỏng', 'Có I2C?', 'Có <code>dumpdtb</code>?'],
            rows: [
              ['<code>virt</code>', 'Máy ảo không có thật, tối ưu cho tốc độ', '<b>Không</b>', 'Có — QEMU tự sinh device tree'],
              ['<code>raspi3b</code>', 'Raspberry Pi 3B thật, SoC BCM2837', '<b>Có</b>, <code>bcm2835-i2c</code>', '<b>Không</b> — board thật dùng file <code>.dtb</code> có sẵn'],
              ['<code>mcimx7d-sabre</code>', 'Board NXP i.MX7 Dual SABRE', '<b>Có</b>, <code>imx.i2c</code>', '<b>Không</b>']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao board thật lại không dump được device tree?',
            x: '<p>Thử <code>-machine dumpdtb=…</code> trên <code>raspi3b</code>, QEMU trả lời: ' +
               '<code>This machine doesn\'t have an FDT</code>.</p>' +
               '<p>Không phải thiếu sót. <code>virt</code> <b>phải</b> tự sinh device tree vì nó ' +
               'thay đổi theo tham số dòng lệnh của bạn — như bạn vừa thấy ở bước 4. Còn ' +
               'Raspberry Pi 3B thì phần cứng đã cố định từ nhà máy; device tree của nó là file ' +
               '<code>bcm2837-rpi-3-b.dtb</code> nằm sẵn trong mã nguồn nhân Linux, và bạn nạp ' +
               'nó bằng <code>-dtb</code>.</p>' +
               '<p>Đây là <b>hai mô hình device tree khác nhau</b> mà bạn sẽ dùng cả hai: ' +
               'firmware tự sinh (như QEMU <code>virt</code>, như U-Boot ở Chặng 06) và file ' +
               'biên dịch sẵn theo board (như mọi board thật, và là trọng tâm Chặng 08).</p>' },

          { t: 'cal', kind: 'tip', title: 'Vậy khi nào đổi machine?',
            x: '<p>Cứ ở lại <code>virt</code> cho tới Chặng 10. Nó nhanh hơn, ổn định qua các ' +
               'bản QEMU, và mọi thứ bạn học ở Chặng 05–09 đều không cần I2C.</p>' +
               '<p>Chỉ đổi sang <code>raspi3b</code> hoặc <code>mcimx7d-sabre</code> khi bài học ' +
               'thật sự cần một bus mà <code>virt</code> không có. Đổi machine kéo theo phải đổi ' +
               'cả cách nạp device tree, cách biên dịch nhân và cấu hình boot — không phải một ' +
               'chữ trên dòng lệnh.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       7. HAI MÔ HÌNH DEVICE TREE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai mô hình device tree, nhìn một lần cho rõ' },

    { t: 'p', x:
      'Bước 7 vừa hé lộ một điều dễ gây rối về sau: device tree đến tay nhân theo <b>hai đường ' +
      'hoàn toàn khác nhau</b>, và bạn sẽ dùng cả hai. Hình dưới đặt chúng cạnh nhau.' },

    { t: 'fig', cap:
      'Cùng một định dạng .dtb, hai nguồn gốc khác nhau: QEMU virt sinh cây theo tham số dòng ' +
      'lệnh của bạn nên nó luôn khớp máy ảo; board thật dùng file biên dịch sẵn từ cây nguồn ' +
      'nhân, nên trách nhiệm giữ cho nó khớp phần cứng là của bạn.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" ' +
      'aria-label="So sánh hai cách device tree đến tay nhân Linux: QEMU virt tự sinh, và board thật dùng file dtb biên dịch sẵn">' +

      '<text class="d-t" x="8" y="16">A. QEMU virt — firmware tự sinh</text>' +
      '<text class="d-t" x="372" y="16">B. Board thật — file biên dịch sẵn</text>' +
      '<line class="d-line" x1="360" y1="26" x2="360" y2="242"/>' +

      /* ── cột A ── */
      '<rect class="d-box-p" x="8" y="30" width="336" height="34" rx="6"/>' +
      '<text class="d-tm" x="20" y="51">-M virt -m 1G -smp 2 -cpu cortex-a57</text>' +
      '<line class="d-line" x1="176" y1="64" x2="176" y2="80"/>' +
      '<path class="d-arrow" d="M176 86 l-4 -8 h8 z"/>' +

      '<rect class="d-box-a" x="8" y="88" width="336" height="42" rx="6"/>' +
      '<text class="d-t" x="20" y="106">QEMU dựng cây trong bộ nhớ</text>' +
      '<text class="d-ts" x="20" y="123">mỗi tham số đổi thì cây đổi theo — luôn khớp</text>' +
      '<line class="d-line" x1="176" y1="130" x2="176" y2="146"/>' +
      '<path class="d-arrow" d="M176 152 l-4 -8 h8 z"/>' +

      '<rect class="d-box-g" x="8" y="154" width="336" height="42" rx="6"/>' +
      '<text class="d-t" x="20" y="172">Đặt vào RAM, trỏ x0 vào địa chỉ đó</text>' +
      '<text class="d-tm" x="20" y="189">-machine dumpdtb=virt.dtb  ← xem trộm</text>' +

      '<rect class="d-box" x="8" y="206" width="336" height="36" rx="6"/>' +
      '<text class="d-ts" x="20" y="228">Bạn chỉ đọc. Sai lệch giữa cây và máy: không thể xảy ra</text>' +

      /* ── cột B ── */
      '<rect class="d-box-p" x="376" y="30" width="336" height="34" rx="6"/>' +
      '<text class="d-tm" x="388" y="51">arch/arm64/boot/dts/…/board.dts</text>' +
      '<line class="d-line" x1="544" y1="64" x2="544" y2="80"/>' +
      '<path class="d-arrow" d="M544 86 l-4 -8 h8 z"/>' +

      '<rect class="d-box-a" x="376" y="88" width="336" height="42" rx="6"/>' +
      '<text class="d-t" x="388" y="106">dtc biên dịch khi build nhân</text>' +
      '<text class="d-ts" x="388" y="123">ra file .dtb tĩnh, không biết gì về máy đang chạy</text>' +
      '<line class="d-line" x1="544" y1="130" x2="544" y2="146"/>' +
      '<path class="d-arrow" d="M544 152 l-4 -8 h8 z"/>' +

      '<rect class="d-box-g" x="376" y="154" width="336" height="42" rx="6"/>' +
      '<text class="d-t" x="388" y="172">Bootloader nạp file, trỏ x0 vào đó</text>' +
      '<text class="d-tm" x="388" y="189">U-Boot: fdt addr / bootz … ${fdt_addr}</text>' +

      '<rect class="d-box-w" x="376" y="206" width="336" height="36" rx="6"/>' +
      '<text class="d-ts" x="388" y="228">Bạn phải tự sửa. Cây sai phần cứng: chuyện xảy ra hằng ngày</text>' +

      '</svg>' },

    { t: 'cal', kind: 'info', title: 'Điểm chung mới là điều quan trọng',
      x: '<p>Hai đường khác nhau, nhưng đầu ra giống hệt: một khối <code>.dtb</code> nằm trong ' +
         'RAM, và thanh ghi <code>x0</code> chứa địa chỉ của nó khi nhân bắt đầu chạy. Nhân ' +
         '<b>không biết và không cần biết</b> cây đó từ đâu ra.</p>' +
         '<p>Nhờ vậy mọi thứ bạn học về device tree trên <code>virt</code> đều dùng lại được ' +
         'nguyên vẹn trên board thật. Chỉ khác ở chỗ ai chịu trách nhiệm viết cây — và trên ' +
         'board thật thì đó là bạn.</p>' },

    /* ══════════════════════════════════════════════
       8. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>No \'i2c-bus\' bus found for device \'tmp105\'</code>',
         'Machine <code>virt</code> không tạo bus I2C nào, nên không có chỗ cắm thiết bị I2C',
         'Đổi machine (<code>-M raspi3b</code>, <code>-M mcimx7d-sabre</code>), hoặc dùng driver <code>i2c-stub</code> của nhân'],

        ['<code>This machine doesn\'t have an FDT</code>',
         'Dùng <code>-machine dumpdtb=…</code> với một machine mô phỏng board thật. Chỉ machine tự sinh device tree mới dump được',
         'Lấy file <code>.dtb</code> tương ứng trong cây nguồn nhân và nạp bằng <code>-dtb</code>'],

        ['<code>Invalid parameter \'gic-version\'</code>',
         'Gắn thuộc tính của machine vào <code>-m</code> (bộ nhớ) thay vì <code>-M</code> (machine): viết nhầm <code>-m 512,gic-version=3</code>',
         'Thuộc tính machine luôn đi sau tên machine: <code>-M virt,gic-version=3 -m 512</code>'],

        ['<code>cannot use stdio by multiple character devices</code>',
         '<code>-nographic</code> đã chiếm stdio cho cổng nối tiếp, rồi <code>-monitor stdio</code> đòi chiếm lần nữa',
         'Bỏ <code>-nographic</code>, dùng bộ ba <code>-display none -serial null -monitor stdio</code>'],

        ['<code>Invalid RAM size, should be 1 GiB</code>',
         'Board thật có dung lượng RAM cố định. <code>raspi3b</code> luôn đúng 1 GiB, không nhận <code>-m 512</code>',
         'Bỏ hẳn <code>-m</code>, hoặc ghi đúng <code>-m 1G</code>. Đây là khác biệt lớn so với <code>virt</code>'],

        ['<code>multiple definition of \'_start\'</code>',
         'Biên dịch chương trình bare-metal mà quên <code>-nostdlib</code>: trình liên kết vẫn kéo <code>crt1.o</code> vào, mà file đó cũng định nghĩa <code>_start</code>',
         'Thêm <code>-nostdlib</code>. Nó vừa bỏ libc vừa bỏ mã khởi động'],

        ['QEMU treo, không in gì, không trả lại dấu nhắc',
         'Chạy <code>qemu-system-*</code> mà không có <code>-kernel</code>: CPU thực thi vùng flash rỗng và quay vòng mãi mãi',
         'Luôn bọc <code>timeout N</code> khi chạy trong script. Gõ tay thì thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>'],

        ['<code>info jit</code> / <code>info registers</code> báo toàn số 0',
         'Đưa lệnh qua đường ống thì QEMU đọc và thực thi chúng <b>trước khi</b> luồng vCPU kịp chạy lệnh nào',
         'Chèn độ trễ: <code>( sleep 4; printf \'info jit\\nquit\\n\' ) | qemu-system-aarch64 …</code>'],

        ['<code>diff</code> hai file <code>.dts</code> luôn khác nhau dù không đổi gì',
         '<code>rng-seed</code> và <code>kaslr-seed</code> là số ngẫu nhiên, sinh mới mỗi lần chạy',
         'Lọc trước khi so: <code>dtc … | grep -vE \'rng-seed|kaslr-seed\'</code>'],

        ['Chương trình bare-metal in ra rác rồi treo',
         'Chuỗi khai bằng <code>.ascii</code> nên không có byte 0 kết thúc; vòng lặp đọc tiếp sang vùng nhớ kế bên',
         'Dùng <code>.asciz</code>. Sự cố này không phải lúc nào cũng lộ ra — nếu byte kế tiếp tình cờ bằng 0 thì chương trình vẫn chạy đúng, và đó mới là điều nguy hiểm']
      ]},

    /* ══════════════════════════════════════════════
       9. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt bài này', items: [
      'Một <b>machine</b> trong QEMU là bản mô tả một bo mạch: bản đồ bộ nhớ, danh sách thiết bị và cách chúng nối vào bộ điều khiển ngắt. QEMU 10.2.1 có <b>113</b> machine ARM64; <code>virt</code> là bí danh của <code>virt-10.2</code>.',
      '<code>virt</code> là bo mạch <b>không tồn tại ngoài đời</b> — và chính vì thế nó là bo mạch học tốt nhất: ổn định, nhanh, không có quirk của nhà sản xuất.',
      'Bốn địa chỉ đáng thuộc: RAM ở <code>0x40000000</code>, PL011 ở <code>0x09000000</code>, GIC ở <code>0x08000000</code>, 32 khe virtio-mmio từ <code>0xa000000</code> tới <code>0xa003e00</code> cách nhau <code>0x200</code>.',
      '<code>-machine dumpdtb=file.dtb</code> sinh device tree rồi thoát ngay với mã 0. File luôn đúng <b>1 048 576</b> byte vì QEMU cấp trước 1 MB để bootloader còn chỗ chèn thêm. <code>dtc -I dtb -O dts</code> dịch nó về <b>393</b> dòng đọc được.',
      'Trong device tree, <code>compatible</code> là thứ nhân dùng để chọn driver, <code>reg</code> là địa chỉ + độ dài, <code>interrupts</code> là ba số <i>loại · số hiệu · cờ</i>. Nút gốc khai <code>#address-cells = 2</code> nên mỗi địa chỉ viết thành <b>hai</b> ô 32 bit.',
      '<code>chosen/stdout-path = "/pl011@9000000"</code> là lý do bạn thấy được log boot. Nhân im lặng khi boot thì đây là chỗ kiểm đầu tiên.',
      'Đổi tham số thì cây đổi theo: <code>-m 1G</code> đổi đúng <b>1</b> dòng, <code>-M virt,gic-version=3</code> đổi <b>16</b> dòng, còn <code>-smp 2</code> đổi tới <b>35</b> dòng vì phandle dịch chỗ kéo theo mọi tham chiếu chéo — nên đừng bao giờ sửa <code>.dtb</code> bằng tay.',
      'Cắm <code>-device virtio-net-device</code> hay <code>virtio-blk-device</code> <b>không</b> làm device tree đổi một dòng nào: 32 khe đã khai sẵn từ trước, thiết bị chỉ vào ngồi vào khe cao nhất còn trống.',
      'Chương trình bare-metal <b>105 byte</b> ghi thẳng vào <code>0x09000000</code> in được chữ ra terminal — bằng chứng tự tay kiểm rằng bản đồ bộ nhớ là thật. <code>info registers</code> xác nhận <code>X01 = 0x09000000</code> và <code>PC = 0x4008001c</code>.',
      'Trên guest system-mode tí hon này, hệ số nở của TCG là <b>21,6</b> so với <b>3,48</b> ở Bài 29 — vì khối dịch quá ngắn, vì có softmmu, và vì đang ghi vào MMIO chứ không phải RAM.',
      '<code>virt</code> <b>không có</b> I2C, SPI, MMC, USB hay Ethernet thật. Đây là ranh giới thật của việc học không cần phần cứng; <code>raspi3b</code> và <code>mcimx7d-sabre</code> có I2C nhưng đổi lại không dump được device tree.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Bạn đã biết cỗ máy có gì. Bài 31 dạy cách <b>ra lệnh</b> cho nó: toàn bộ bộ tham ' +
         'số dòng lệnh QEMU mà bạn sẽ dùng suốt phần còn lại của khoá — <code>-kernel</code>, ' +
         '<code>-initrd</code>, <code>-append</code>, <code>-drive</code>, ' +
         '<code>-netdev</code>, và cặp <code>-s -S</code> biến QEMU thành mục tiêu gỡ lỗi để ' +
         'GDB gắn vào.</p>' +
         '<p>Bài đó sẽ đo một con số cụ thể: chính chương trình <code>hello.elf</code> bạn vừa ' +
         'viết, dừng ngay tại lệnh đầu tiên bằng <code>-S</code>, rồi cho <code>gdb-multiarch</code> ' +
         'nối vào cổng 1234 và chạy từng lệnh một. Bạn sẽ thấy <code>X01</code> nhận giá trị ' +
         '<code>0x09000000</code> <b>ngay trước mắt</b>, thay vì suy ra từ trạng thái cuối cùng ' +
         'như hôm nay.</p>' }

  ],

  quiz: [
    { q: 'Trong device tree của <code>virt</code>, nút PL011 khai <code>reg = &lt;0x00 0x9000000 0x00 0x1000&gt;</code>. Bốn con số này nghĩa là gì?',
      opts: [
        'Bốn thanh ghi riêng biệt của UART, ở bốn địa chỉ khác nhau',
        'Địa chỉ 64 bit 0x09000000 và độ dài 64 bit 0x1000, mỗi giá trị viết thành hai ô 32 bit',
        'Địa chỉ bắt đầu 0x00, địa chỉ kết thúc 0x9000000, và hai cờ cấu hình',
        'Bốn kênh UART, mỗi kênh một địa chỉ'
      ],
      a: 1,
      why: 'Nút gốc khai <code>#address-cells = &lt;0x02&gt;</code> và <code>#size-cells = &lt;0x02&gt;</code>: mỗi địa chỉ chiếm hai ô 32 bit, mỗi kích thước cũng vậy. Nên bốn số ghép thành hai cặp — địa chỉ <code>0x0000000009000000</code> và độ dài <code>0x0000000000001000</code> (4 KB). Cách ghép ô này tồn tại vì định dạng device tree ra đời cho máy 32 bit và phải giữ tương thích ngược. Đếm nhầm số ô là lỗi kinh điển và làm địa chỉ đọc ra sai hoàn toàn.' },

    { q: 'Bạn boot một nhân trong QEMU. Nhân chạy bình thường (ping qua mạng được, tiến trình hoạt động) nhưng terminal <b>không in ra gì cả</b>. Chỗ nào đáng nghi nhất?',
      opts: [
        'Bộ nhớ RAM khai sai trong nút <code>memory@40000000</code>',
        'Thiếu <code>-device virtio-net-device</code> trên dòng lệnh',
        'Nút <code>chosen/stdout-path</code> hoặc tham số <code>console=</code> trỏ sai thiết bị',
        'GIC đang ở phiên bản 2 trong khi nhân cần phiên bản 3'
      ],
      a: 2,
      why: 'Nhân chạy được nghĩa là RAM, CPU và ngắt đều ổn — nên chỉ còn đường ra console là hỏng. Nhân quyết định in log ra đâu bằng hai nguồn: <code>chosen/stdout-path</code> trong device tree và tham số <code>console=</code> trong dòng lệnh nhân. Trỏ sai một trong hai thì nhân vẫn chạy hoàn hảo mà bạn không thấy gì. Đây là lỗi phổ biến nhất của người boot nhân lần đầu, và triệu chứng "chạy được nhưng câm" là dấu hiệu nhận dạng của nó.' },

    { q: 'Vì sao <code>virt</code> khai sẵn 32 khe <code>virtio_mmio@…</code> trong device tree ngay cả khi bạn không cắm thiết bị nào?',
      opts: [
        'Vì QEMU luôn tạo sẵn 32 thiết bị virtio để tăng tốc độ khởi động',
        'Vì device tree phải cố định trước khi guest chạy, nên các khe được khai trước để cắm thiết bị mà không phải đổi cây',
        'Vì chuẩn virtio bắt buộc đúng 32 thiết bị trên mỗi hệ thống',
        'Vì mỗi khe chiếm một dòng ngắt, và GIC có đúng 32 dòng SPI'
      ],
      a: 1,
      why: 'Device tree được chốt trước khi nhân bắt đầu chạy và nhân đọc nó đúng một lần. Nếu khe không được khai sẵn thì việc cắm thêm một thiết bị sẽ đòi sửa cây, mà lúc đó đã quá muộn. QEMU giải bằng cách khai trước 32 khe rỗng — thiết bị chỉ việc vào ngồi. Bằng chứng: thêm <code>-device virtio-net-device</code> không làm device tree đổi một dòng nào.' },

    { q: '<code>qemu-system-aarch64 -M virt -device tmp105</code> báo <code>No \'i2c-bus\' bus found for device \'tmp105\'</code>. Thông báo này nói lên điều gì?',
      opts: [
        'QEMU không có mô hình cho cảm biến tmp105, cần biên dịch lại QEMU',
        'Thiếu tham số địa chỉ I2C, phải thêm <code>address=0x49</code>',
        'QEMU có mô hình tmp105, nhưng machine <code>virt</code> không tạo bus I2C nào để cắm vào',
        'Driver i2c trong nhân guest chưa được nạp'
      ],
      a: 2,
      why: 'Đọc kỹ câu chữ: lỗi nói không tìm thấy <b>bus</b>, không nói không tìm thấy <b>thiết bị</b>. Trong QEMU mọi thiết bị đều phải ngồi trên một bus, và <code>virt</code> đơn giản là không mô hình hoá bus I2C — đúng như <code>grep -c i2c virt.dts</code> trả về 0. Thêm <code>address=0x49</code> vẫn báo y hệt. Lỗi cũng không liên quan gì tới guest, vì nó xảy ra trước khi guest kịp chạy.' },

    { q: 'Thêm <code>-smp 2</code> làm device tree đổi <b>35</b> dòng, trong khi thêm <code>-m 1G</code> chỉ đổi <b>1</b> dòng. Vì sao chênh lệch lớn như vậy?',
      opts: [
        'Vì mỗi CPU cần khai 17 thuộc tính riêng trong nút <code>cpu@N</code>',
        'Vì nút <code>cpu@1</code> mới chiếm một phandle, làm mọi phandle sau nó dịch chỗ và mọi tham chiếu chéo tới chúng phải sửa theo',
        'Vì QEMU phải nhân đôi toàn bộ bảng <code>interrupt-map</code> cho CPU thứ hai',
        'Vì <code>-m</code> không thật sự ảnh hưởng tới device tree, con số RAM được truyền qua đường khác'
      ],
      a: 1,
      why: 'Chỉ hai dòng là nội dung thật — nút <code>cpu@1</code>. Phần còn lại là hiệu ứng lan toả: phandle <code>0x8002</code> thành <code>0x8003</code>, <code>0x8004</code> thành <code>0x8005</code>, kéo theo <code>interrupt-parent</code>, <code>gpios</code>, <code>msi-map</code> và cả bảng <code>interrupt-map</code> dài của PCIe. Bài học thực dụng: device tree là một đồ thị có tham chiếu chéo chứ không phải danh sách phẳng, nên luôn sửa ở dạng <code>.dts</code> rồi biên dịch lại, đừng bao giờ vá <code>.dtb</code> bằng tay.' },

    { q: '<code>-machine dumpdtb=r3.dtb</code> chạy tốt với <code>-M virt</code> nhưng báo <code>This machine doesn\'t have an FDT</code> với <code>-M raspi3b</code>. Lý do là gì?',
      opts: [
        'Machine <code>raspi3b</code> chưa được hỗ trợ đầy đủ trong QEMU 10.2.1',
        'Phải thêm <code>-kernel</code> thì raspi3b mới sinh được device tree',
        '<code>virt</code> phải tự sinh cây vì cấu hình đổi theo tham số dòng lệnh; raspi3b là phần cứng cố định nên dùng file .dtb biên dịch sẵn trong cây nguồn nhân',
        'raspi3b dùng ACPI thay cho device tree'
      ],
      a: 2,
      why: 'Đây là hai mô hình device tree khác nhau, và bạn sẽ dùng cả hai. Cấu hình của <code>virt</code> thay đổi theo <code>-m</code>, <code>-smp</code>, <code>gic-version</code> — không file tĩnh nào mô tả nổi, nên firmware phải sinh cây lúc chạy. Raspberry Pi 3B thì phần cứng đã cố định từ nhà máy: cây của nó là <code>bcm2837-rpi-3-b.dtb</code> biên dịch sẵn, nạp bằng <code>-dtb</code>. Điểm chung là kết quả cuối cùng giống hệt nhau: một khối .dtb trong RAM và địa chỉ của nó nằm trong <code>x0</code> khi nhân khởi động.' }
  ]
});

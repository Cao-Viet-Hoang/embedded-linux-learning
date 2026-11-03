/* Bài 70 — Chuyển sang hardware thật và phỏng vấn
   Chặng 13 — Thành phẩm và nghề nghiệp. Bài cuối của khoá học.
   Bài này không có board thật: máy B (WSL2 Ubuntu 20.04, user cah8hc, 16 CPU, QEMU 4.2.1) không có bo mạch
   và không có cáp USB–UART cắm vào. Mọi lệnh có output trong bài đều chạy thật trên máy B ngày 2026-11-03:
   - phía WSL của usbipd: cấu hình kernel WSL (USBIP_VHCI_HCD=y, cp210x/ch341/ftdi_sio là module, PL2303 không
     được build), vhci_hcd.0, modinfo alias, nhóm dialout;
   - console nối tiếp: QEMU -serial pty + picocom 3.1 (lấy từ .deb focal bằng apt-get download + dpkg -x vì sudo
     trên máy B cần mật khẩu; người học cài bằng apt, cùng phiên bản);
   - watchdog: i6300esb build out-of-tree từ ~/bai38 (CONFIG_I6300ESB_WDT không bật), QEMU -device i6300esb;
   - Buildroot raspberrypizero2w_64_defconfig build trong ~/bai70/rpi, dùng lại ~/bai67/buildroot-2026.02.3.
   Phần usbipd-win phía Windows (winget, usbipd bind/attach) KHÔNG chạy: máy công ty, không có thiết bị USB–UART.
   Bài nói rõ điều đó ở đúng chỗ và không in output bịa.
   ~/bai70 là nháp, xoá được. */

Lesson.register({
  id: 'bai-70',
  title: 'Chuyển sang hardware thật và phỏng vấn',
  minutes: 65,
  practice: 'Thực hành 45 phút',
  level: 'Nâng cao',

  intro:
    'Sáu mươi chín bài, và chưa một lần bạn cầm bo mạch trên tay. Đó là chủ đích: QEMU cho bạn khởi động lại ' +
    'một nghìn lần không tốn đồng nào, và cho bạn xem bên trong những thứ mà board thật giấu đi. Nhưng nhà tuyển ' +
    'dụng sẽ hỏi: <i>"Bạn đã bring-up board nào chưa?"</i> — và một kỹ sư chưa từng cắm sợi cáp UART sẽ lúng ' +
    'túng ở đúng câu đó.<br><br>' +
    'Bài cuối này làm hai việc. Thứ nhất, nó cho bạn thấy chính xác cái gì thay đổi khi Thermo rời QEMU: chuỗi ' +
    'boot, Device Tree, cách nối console, và một thứ QEMU không bắt buộc nhưng sản phẩm thật nào cũng có — ' +
    '<b>watchdog</b>. Bạn sẽ dựng console nối tiếp bằng <code>picocom</code> mà không cần board, làm một watchdog ' +
    '<b>khởi động lại máy thật sự</b> sau khoảng 10 giây, và build một ảnh thẻ nhớ cho Raspberry Pi Zero 2 W sẵn sàng để ' +
    'ghi khi board về tới tay. Thứ hai, nó gom mọi con số bạn đã đo trong 69 bài thành câu trả lời cho những câu ' +
    'hỏi phỏng vấn Embedded Linux hay gặp nhất.',

  goals: [
    'Chỉ ra những tầng nào của Thermo giữ nguyên và những tầng nào phải đổi khi chuyển từ QEMU <code>virt</code> ' +
      'sang một board thật (chuỗi boot, Device Tree, kernel, console, lưu trữ).',
    'Chọn được board đầu tiên giữa Raspberry Pi Zero 2 W, BeagleBone Black và một board NXP i.MX8M theo mục tiêu ' +
      'học, và đọc được defconfig Buildroot của từng board để biết nó dùng kernel mainline hay kernel của hãng.',
    'Nối đúng một cáp USB–UART 3,3 V (TX↔RX, GND, không nối VCC), kiểm tra kernel WSL có driver cho chip của cáp, ' +
      'và đưa cáp vào WSL bằng <code>usbipd-win</code>.',
    'Mở console nối tiếp bằng <code>picocom</code>, thoát ra đúng cách, và đọc bộ đếm byte của UART phía bo mạch.',
    'Giải thích watchdog phần cứng (nạp, hết hạn, <i>magic close</i>, <code>nowayout</code>) và chứng minh bằng ' +
      'một lần reset thật trong QEMU.',
    'Trả lời các câu hỏi phỏng vấn Embedded Linux phổ biến bằng chính số liệu bạn đã đo, và kể được dự án Thermo ' +
      'trong hai phút.'
  ],

  blocks: [
    { t: 'h2', x: 'Từ QEMU sang board thật: cái gì đổi, cái gì không' },
    { t: 'p', x: 'Câu hỏi đầu tiên khi cầm một board mới không phải "làm sao cho chạy", mà là "trong những thứ tôi ' +
      'đã có, thứ nào dùng lại được". Câu trả lời dễ chịu hơn bạn nghĩ. Phần lớn Thermo không biết nó đang chạy trên ' +
      'QEMU: <code>temp_daemon</code>, BusyBox, cách rootfs được dựng, toolchain Bootlin, ngay cả cấu trúc ' +
      'br2-external của Bài 67 — tất cả là phần mềm ARM64 thuần, chạy trên bất kỳ lõi Cortex-A53 nào. Thứ đổi là ' +
      'những thứ <b>chạm vào phần cứng</b>.' },
    { t: 'p', x: 'Bảng dưới so sánh Thermo trong QEMU với cấu hình Buildroot dựng sẵn cho Raspberry Pi Zero 2 W ' +
      '(<code>raspberrypizero2w_64_defconfig</code>, có ngay trong cây Buildroot bạn đã tải ở Bài 67). Mọi ô bên phải ' +
      'đều đọc từ file thật — Bước 4 của phần thực hành sẽ build nó và cho bạn xem từng file:' },
    { t: 'table', head: ['Tầng', 'Thermo trong QEMU <code>virt</code>', 'Raspberry Pi Zero 2 W', 'Mức thay đổi'],
      rows: [
        ['Mã chạy đầu tiên', 'QEMU nạp thẳng <code>u-boot.bin</code> qua <code>-bios</code>',
         'Boot ROM trong GPU → <code>bootcode.bin</code> → <code>start.elf</code> đọc <code>config.txt</code> (firmware ' +
         'đóng của Broadcom)', '<b>Đổi hẳn</b> — mỗi họ SoC một kiểu'],
        ['Bootloader', 'U-Boot 2026.01 tự build, FIT có chữ ký (Bài 68)',
         'Mặc định <b>không có U-Boot</b>: <code>start.elf</code> nạp thẳng <code>kernel=Image</code>',
         'Đổi; thêm U-Boot là một lựa chọn'],
        ['Device Tree', 'QEMU tự sinh, bạn <code>dumpdtb</code> rồi sửa (Bài 45, 67)',
         '<code>bcm2710-rpi-zero-2-w.dtb</code> từ kernel của Raspberry Pi; firmware còn vá thêm qua ' +
         '<code>dtoverlay=</code>', '<b>Đổi hẳn</b> — DT chính là bản mô tả board'],
        ['Kernel', 'Mainline 6.18.45 từ kernel.org',
         'Nhánh riêng <code>raspberrypi/linux</code> (một commit cố định), defconfig <code>bcm2711</code>',
         'Đổi nguồn; cách build y hệt'],
        ['Console', '<code>ttyAMA0</code> = PL011 tại <code>0x9000000</code>',
         '<code>ttyAMA0</code> trên GPIO14/15 nhờ <code>dtoverlay=miniuart-bt</code>, 115200 baud',
         'Cùng tên driver, khác chân và cách nối'],
        ['Lưu trữ', 'virtio-blk → <code>/dev/vda</code>', 'Thẻ microSD → <code>/dev/mmcblk0</code>',
         'Đổi tên thiết bị trong <code>root=</code>'],
        ['Rootfs, BusyBox, daemon, toolchain', 'Buildroot, Bootlin glibc stable', 'Buildroot, Bootlin glibc stable',
         '<b>Giữ nguyên</b>'],
        ['Driver <code>tsensor</code> (Bài 54)', 'Node giả <code>learn,temp-sensor</code>',
         'Cần một cảm biến thật (ví dụ I2C, Bài 58) và node DT tương ứng', 'Viết lại phần probe, giữ khung']
      ] },
    { t: 'cal', kind: 'why', title: 'Vì sao khoá học dạy trên QEMU trước',
      x: 'Ba hàng "đổi hẳn" trong bảng là ba thứ <b>riêng của từng board</b>: firmware, Device Tree, chân nối. ' +
         'Học chúng trên một board cụ thể nghĩa là học thuộc một board. Còn mọi thứ bạn học trên QEMU — Kbuild, ' +
         'Device Tree như một ngôn ngữ, driver model, Buildroot, chữ ký, A/B — đúng cho mọi board. Khi cầm board ' +
         'thật, bạn chỉ còn phải học ba hàng đó, và bạn đã biết chính xác chúng nằm ở đâu.' },

    { t: 'h3', x: 'Kernel mainline hay kernel của hãng' },
    { t: 'p', x: 'Hàng "Kernel" trong bảng là câu hỏi phỏng vấn kinh điển. Cây Buildroot của bạn có hai defconfig ' +
      'cho <b>cùng một</b> board NXP i.MX8M Mini EVK, và chúng chọn hai kernel khác nhau:' },
    { t: 'table', head: ['Defconfig', 'Kernel', 'Thành phần boot thêm'],
      rows: [
        ['<code>imx8mm-evk_defconfig</code>', 'Mainline <b>6.12.16</b> từ kernel.org',
         'TF-A (<code>BR2_TARGET_ARM_TRUSTED_FIRMWARE_PLATFORM="imx8mm"</code>), firmware huấn luyện LPDDR4, U-Boot ' +
         'SPL'],
        ['<code>freescale_imx8mmevk_defconfig</code>', 'Nhánh của NXP <code>linux-imx</code> tag ' +
         '<code>lf-6.12.3-1.0.0</code>, defconfig <code>imx_v8</code>', 'Như trên, thêm <code>imx-mkimage</code> của NXP'],
        ['<code>raspberrypizero2w_64_defconfig</code>', 'Nhánh <code>raspberrypi/linux</code>', 'Firmware GPU, không U-Boot'],
        ['<code>beaglebone_defconfig</code>', 'Mainline <b>6.18.1</b>, defconfig <code>omap2plus</code>',
         'U-Boot SPL tên <code>MLO</code>']
      ] },
    { t: 'p', x: 'Kernel của hãng (<i>vendor kernel</i>, <i>BSP kernel</i>) thường có driver cho mọi khối của SoC ' +
      'ngay từ ngày ra mắt — GPU, video, camera — nhưng chậm theo mainline, mang hàng nghìn bản vá không ai review ' +
      'ngoài hãng, và khi hãng ngừng hỗ trợ thì bạn mắc kẹt. Kernel mainline được cộng đồng review và cập nhật bảo ' +
      'mật lâu dài, nhưng có thể thiếu driver cho phần cứng mới. Sản phẩm thật thường bắt đầu bằng kernel của hãng ' +
      'rồi dần chuyển về mainline. Bạn tự kiểm chứng bảng trên được trong vài giây:' },
    { t: 'code', where: 'wsl', code:
      'cd ~/bai67/buildroot-2026.02.3\n' +
      'grep -E \'KERNEL_CUSTOM_(VERSION_VALUE|TARBALL_LOCATION)\' configs/imx8mm-evk_defconfig \\\n' +
      '    configs/freescale_imx8mmevk_defconfig configs/beaglebone_defconfig' },
    { t: 'code', where: 'out', nocopy: true, code:
      'configs/imx8mm-evk_defconfig:BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.12.16"\n' +
      'configs/freescale_imx8mmevk_defconfig:BR2_LINUX_KERNEL_CUSTOM_TARBALL_LOCATION="$(call github,nxp-imx,linux-imx,lf-6.12.3-1.0.0)/linux-imx-lf-6.12.3-1.0.0.tar.gz"\n' +
      'configs/beaglebone_defconfig:BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.1"' },
    { t: 'p', x: 'Một <code>VERSION_VALUE</code> là phiên bản kernel.org; một <code>TARBALL_LOCATION</code> trỏ vào ' +
      'GitHub của hãng (<code>nxp-imx</code>) là kernel của hãng. Đọc hai dòng này là biết ngay board đó đang đứng ' +
      'ở phía nào.' },

    { t: 'h2', x: 'Chọn board đầu tiên' },
    { t: 'p', x: 'Không có board "tốt nhất", chỉ có board hợp với điều bạn muốn luyện tiếp. Ba ứng viên trong lộ ' +
      'trình đại diện cho ba con đường khác nhau:' },
    { t: 'table', head: ['', 'Raspberry Pi Zero 2 W', 'BeagleBone Black', 'NXP i.MX8M Mini EVK'],
      rows: [
        ['CPU', '4 × Cortex-A53, <b>ARM64</b> — cùng kiến trúc với cả khoá học', '1 × Cortex-A8, <b>ARM 32 bit</b>',
         '4 × Cortex-A53, ARM64'],
        ['RAM', '512 MiB (DTS: <code>reg = &lt;0 0x20000000&gt;</code>)', '512 MiB', '2 GiB'],
        ['Chuỗi boot', 'Firmware GPU đóng → kernel', 'ROM → SPL (<code>MLO</code>) → U-Boot → kernel, mở hoàn toàn',
         'ROM → SPL → TF-A → U-Boot → kernel; secure boot HAB'],
        ['Tài liệu SoC', 'Hạn chế — phần lớn khối của Broadcom không có datasheet đầy đủ',
         'TRM AM335x công khai, rất chi tiết', 'Reference Manual công khai (cần đăng ký)'],
        ['Giá và độ sẵn có', 'Rẻ nhất, dễ mua', 'Trung bình', 'Đắt nhất'],
        ['Hợp nhất để luyện', 'Bắt đầu nhanh; Buildroot, driver I2C/SPI, GPIO, OTA',
         'U-Boot SPL, đọc datasheet (Bài 57), bring-up từ con số không',
         'Đúng thứ công nghiệp đang ship: TF-A, secure boot thật (Bài 68), eMMC, kernel của hãng']
      ] },
    { t: 'cal', kind: 'tip', title: 'Gợi ý chọn',
      x: 'Nếu chỉ mua một board: <b>Pi Zero 2 W</b>. Nó cùng ARM64 với 69 bài vừa qua, Buildroot có defconfig sẵn, ' +
         'và cái giá thấp làm bạn không ngại làm hỏng. Điểm yếu duy nhất — firmware GPU đóng nên không luyện được ' +
         'U-Boot SPL — được bù khi bạn mua board thứ hai. Nếu đã đi làm ở một công ty dùng NXP/TI, mua đúng họ SoC ' +
         'đó: kinh nghiệm trên chính dòng chip của đội sẽ được tính ngay.' },
    { t: 'p', x: 'Ngoài board, danh sách mua tối thiểu cho một bàn làm việc Embedded Linux:' },
    { t: 'list', items: [
      '<b>Cáp USB–UART mức 3,3 V</b> dùng chip CP2102, CH340 hoặc FT232. Phần tiếp theo giải thích vì sao <i>không</i> ' +
        'chọn cáp PL2303 nếu bạn dùng WSL.',
      '<b>Thẻ microSD</b> 8–32 GB và đầu đọc thẻ.',
      '<b>Nguồn đúng chuẩn</b> của board (Pi Zero 2 W: 5 V qua micro-USB). Nguồn yếu gây lỗi ngẫu nhiên trông y hệt ' +
        'lỗi phần mềm — thứ tốn nhiều giờ nhất khi bring-up.',
      '<b>Dây cắm cái–cái</b> (jumper) và, nếu Pi Zero 2 W không hàn sẵn, một hàng chân header 40 chân.'
    ] },

    { t: 'h2', x: 'UART: sợi dây đầu tiên và cuối cùng' },
    { t: 'p', x: 'Trong 69 bài, mọi dòng log bạn đọc — từ <code>U-Boot 2026.01</code> tới <code>Kernel panic</code> — ' +
      'đều đi qua một cổng nối tiếp: <code>ttyAMA0</code> của QEMU, mà <code>-nographic</code> nối vào terminal của ' +
      'bạn. Trên board thật không có <code>-nographic</code>. Cổng đó là hai chân kim loại trên header, và thứ nối ' +
      'chúng vào máy tính là một <b>cáp USB–UART</b>: một con chip nhỏ chuyển tín hiệu nối tiếp mức 3,3 V thành một ' +
      'thiết bị USB mà Linux nhìn thấy là <code>/dev/ttyUSB0</code>.' },
    { t: 'p', x: 'Vì sao không dùng mạng hay màn hình? Vì chúng cần kernel đã chạy, driver đã probe, rootfs đã mount. ' +
      'UART là thứ <b>đầu tiên</b> hoạt động (ROM và bootloader ghi ra nó trước cả khi có RAM) và là thứ ' +
      '<b>cuối cùng</b> còn sống khi kernel panic. Mọi kỹ năng đọc log của Chặng 12 đều bắt đầu từ sợi cáp này.' },
    { t: 'fig', cap: 'Ba dây, và hai dây tín hiệu bắt chéo: TX của bên này vào RX của bên kia. Dây đỏ VCC để trống — ' +
      'board đã có nguồn riêng, nối thêm VCC là nối hai nguồn vào nhau.',
      svg: '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="Sơ đồ nối cáp USB-UART với Raspberry Pi Zero 2 W: GND vào chân 6, TXD của cáp vào RXD GPIO15 chân 10, RXD của cáp vào TXD GPIO14 chân 8, VCC không nối">' +
        '<rect class="d-box-p" x="20" y="40" width="200" height="180" rx="10"/>' +
        '<text class="d-t" x="120" y="66" text-anchor="middle">Cáp USB–UART</text>' +
        '<text class="d-ts" x="120" y="84" text-anchor="middle">CP2102 / CH340 / FT232, mức 3,3 V</text>' +
        '<text class="d-tm" x="200" y="118" text-anchor="end">GND</text>' +
        '<text class="d-tm" x="200" y="148" text-anchor="end">TXD</text>' +
        '<text class="d-tm" x="200" y="178" text-anchor="end">RXD</text>' +
        '<text class="d-tm" x="200" y="208" text-anchor="end">VCC</text>' +
        '<rect class="d-box-g" x="480" y="40" width="220" height="180" rx="10"/>' +
        '<text class="d-t" x="590" y="66" text-anchor="middle">Pi Zero 2 W, header 40 chân</text>' +
        '<text class="d-ts" x="590" y="84" text-anchor="middle">GPIO 3,3 V — không chịu 5 V</text>' +
        '<text class="d-tm" x="500" y="118">chân 6  GND</text>' +
        '<text class="d-tm" x="500" y="148">chân 10 GPIO15 RXD</text>' +
        '<text class="d-tm" x="500" y="178">chân 8  GPIO14 TXD</text>' +
        '<text class="d-ts" x="500" y="208">không nối gì</text>' +
        '<line class="d-line" x1="206" y1="114" x2="494" y2="114"/>' +
        '<line class="d-line" x1="206" y1="144" x2="494" y2="174"/><path class="d-arrow" d="M494 174 l-9 -1 l3 -7 z"/>' +
        '<line class="d-line" x1="494" y1="144" x2="206" y2="174"/><path class="d-arrow" d="M206 174 l6 -7 l3 7 z"/>' +
        '<text class="d-ts" x="350" y="104" text-anchor="middle">mass chung</text>' +
        '<text class="d-ts" x="350" y="204" text-anchor="middle">TX → RX, hai chiều bắt chéo</text>' +
        '</svg>' },
    { t: 'table', head: ['Thông số', 'Giá trị chuẩn', 'Sai thì thấy gì'],
      rows: [
        ['Tốc độ (baud)', '<b>115200</b> — đúng con số trong <code>console=ttyAMA0,115200</code> của Pi và ' +
         '<code>stdout-path = "serial1:115200n8"</code> trong DTS', 'Ký tự rác kiểu <code>�x�~�</code>, hoặc không gì cả'],
        ['Khung', '<b>8N1</b>: 8 bit dữ liệu, không parity, 1 bit stop — phần <code>n8</code> trong ' +
         '<code>115200n8</code>', 'Lỗi rải rác, ký tự sai'],
        ['Điều khiển luồng', 'Không (<i>none</i>)', 'Gõ vào không có phản hồi'],
        ['Mức điện áp', '<b>3,3 V</b> cho Pi, BeagleBone, i.MX8M', 'Cáp 5 V có thể phá chân GPIO vĩnh viễn'],
        ['Bắt chéo', 'TX cáp → RX board, RX cáp ← TX board', 'Không thấy gì; không hỏng gì — đổi hai dây là xong']
      ] },
    { t: 'cal', kind: 'danger', title: 'Hai sai lầm làm cháy board',
      x: '<b>Cáp mức 5 V.</b> Chân GPIO của Pi, BeagleBone và i.MX8M chỉ chịu 3,3 V. Nhiều cáp rẻ có công tắc hoặc ' +
         'jumper chọn 3,3/5 V — kiểm tra trước khi cắm. <b>Nối VCC.</b> Board đã cấp nguồn từ adapter riêng; nối thêm ' +
         'chân VCC của cáp là đấu hai nguồn với nhau. Chỉ cần ba dây: GND, TX, RX.' },
    { t: 'p', x: 'Cáp nào cũng có một con chip, và kernel cần đúng driver cho chip đó. Kernel của WSL không build mọi ' +
      'driver nối tiếp USB — Bước 1 của phần thực hành sẽ đọc cấu hình của chính nó. Kết quả trên máy dùng để viết bài:' },
    { t: 'table', head: ['Chip', 'USB VID:PID thường gặp', 'Driver Linux', 'Trong kernel WSL 5.15.167.4'],
      rows: [
        ['Silicon Labs CP2102', '<code>10c4:ea60</code>', '<code>cp210x</code>', 'Có (module)'],
        ['WCH CH340/CH341', '<code>1a86:7523</code>', '<code>ch341</code>', 'Có (module)'],
        ['FTDI FT232R', '<code>0403:6001</code>', '<code>ftdi_sio</code>', 'Có (module)'],
        ['Prolific PL2303', '<code>067b:2303</code>', '<code>pl2303</code>', '<b>Không</b> — <code># CONFIG_USB_SERIAL_PL2303 is not set</code>']
      ] },
    { t: 'p', x: 'Cột cuối là lý do danh sách mua ở trên loại PL2303: cáp đó vẫn chạy tốt trên Windows, nhưng khi đưa ' +
      'vào WSL sẽ không có <code>/dev/ttyUSB0</code> nào xuất hiện, trừ khi bạn tự build lại kernel WSL. Cột thứ hai ' +
      'là thứ <code>lsusb</code> in ra khi bạn cắm cáp — Bước 1 cho thấy kernel dùng đúng cặp số đó để chọn driver, ' +
      'theo cơ chế modalias bạn đã gặp ở Bài 44.' },

    { t: 'h2', x: 'usbipd-win: đưa thiết bị USB vào WSL' },
    { t: 'p', x: 'Cắm cáp vào laptop, Windows thấy nó ngay — nhưng WSL2 thì không. WSL2 là một máy ảo nhẹ chạy kernel ' +
      'Linux riêng; nó không có bộ điều khiển USB thật nào, giống như QEMU <code>virt</code> của bạn không có cổng ' +
      'USB trừ khi bạn thêm vào. <b>usbipd-win</b> là cầu nối: một dịch vụ Windows "giữ" thiết bị USB và chia sẻ nó qua ' +
      'giao thức <b>USB/IP</b> — các gói USB được gói trong TCP — tới một bộ điều khiển USB <i>ảo</i> trong kernel WSL ' +
      'tên là <code>vhci_hcd</code>.' },
    { t: 'fig', cap: 'Thiết bị USB không "chuyển" sang WSL bằng phép màu: từng gói USB đi qua mạng nội bộ giữa Windows và ' +
      'máy ảo WSL. Phía Linux, mọi thứ từ vhci_hcd trở lên là driver bình thường — cùng cơ chế khớp driver bạn đã học.',
      svg: '<svg viewBox="0 0 720 220" width="720" role="img" aria-label="Chuỗi usbipd-win: cáp USB-UART cắm vào Windows, usbipd giữ thiết bị và gửi qua USB/IP tới vhci_hcd trong kernel WSL, driver cp210x tạo /dev/ttyUSB0 cho picocom">' +
        '<rect class="d-box" x="20" y="30" width="320" height="170" rx="10"/>' +
        '<text class="d-t" x="180" y="54" text-anchor="middle">Windows</text>' +
        '<rect class="d-box-p" x="40" y="74" width="130" height="50" rx="8"/>' +
        '<text class="d-t" x="105" y="96" text-anchor="middle">Cáp USB–UART</text>' +
        '<text class="d-tm" x="105" y="114" text-anchor="middle">BUSID 1-4</text>' +
        '<rect class="d-box-a" x="190" y="74" width="130" height="50" rx="8"/>' +
        '<text class="d-t" x="255" y="96" text-anchor="middle">usbipd</text>' +
        '<text class="d-ts" x="255" y="114" text-anchor="middle">bind: giữ thiết bị</text>' +
        '<text class="d-ts" x="180" y="160" text-anchor="middle">Windows mất quyền dùng cáp</text>' +
        '<text class="d-ts" x="180" y="178" text-anchor="middle">khi đã attach</text>' +
        '<rect class="d-box" x="380" y="30" width="320" height="170" rx="10"/>' +
        '<text class="d-t" x="540" y="54" text-anchor="middle">WSL2 (kernel 5.15.167.4)</text>' +
        '<rect class="d-box-g" x="400" y="74" width="130" height="50" rx="8"/>' +
        '<text class="d-tm" x="465" y="96" text-anchor="middle">vhci_hcd</text>' +
        '<text class="d-ts" x="465" y="114" text-anchor="middle">USB ảo, có sẵn</text>' +
        '<rect class="d-box-g" x="550" y="74" width="130" height="50" rx="8"/>' +
        '<text class="d-tm" x="615" y="96" text-anchor="middle">cp210x</text>' +
        '<text class="d-tm" x="615" y="114" text-anchor="middle">/dev/ttyUSB0</text>' +
        '<rect class="d-box-p" x="550" y="140" width="130" height="44" rx="8"/>' +
        '<text class="d-tm" x="615" y="167" text-anchor="middle">picocom</text>' +
        '<line class="d-line" x1="170" y1="99" x2="184" y2="99"/><path class="d-arrow" d="M190 99 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="320" y1="99" x2="394" y2="99"/><path class="d-arrow" d="M400 99 l-8 -4 v8 z"/>' +
        '<text class="d-ts" x="360" y="90" text-anchor="middle">USB/IP</text>' +
        '<line class="d-line" x1="530" y1="99" x2="544" y2="99"/><path class="d-arrow" d="M550 99 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="615" y1="124" x2="615" y2="134"/><path class="d-arrow" d="M615 140 l-4 -8 h8 z"/>' +
        '</svg>' },
    { t: 'p', x: 'Quy trình gồm một lần cài, một lần <code>bind</code> cho mỗi thiết bị, và một lần <code>attach</code> ' +
      'mỗi khi cắm cáp. Các lệnh dưới đây chạy ở phía <b>Windows</b>:' },
    { t: 'code', where: 'psadm', code:
      'winget install --interactive --exact dorssel.usbipd-win' },
    { t: 'code', where: 'ps', code:
      'usbipd list' },
    { t: 'code', where: 'psadm', code:
      'usbipd bind --busid 1-4' },
    { t: 'code', where: 'ps', code:
      'usbipd attach --wsl --busid 1-4' },
    { t: 'cmdx', title: 'Bốn lệnh phía Windows', rows: [
      ['<code>winget install … dorssel.usbipd-win</code>', 'Cài dịch vụ usbipd và driver lọc USB. Cần quyền ' +
       'Administrator. <code>winget show --id dorssel.usbipd-win</code> trên máy viết bài báo phiên bản <b>5.3.0</b>.'],
      ['<code>usbipd list</code>', 'Liệt kê thiết bị USB đang cắm, mỗi cái kèm <code>BUSID</code> (vị trí cổng, ví dụ ' +
       '<code>1-4</code>), <code>VID:PID</code> và trạng thái <code>Not shared</code>/<code>Shared</code>/' +
       '<code>Attached</code>. Tìm dòng có VID:PID trùng bảng chip ở trên.'],
      ['<code>usbipd bind --busid 1-4</code>', 'Đánh dấu thiết bị là được chia sẻ. Cần Administrator, nhưng <b>chỉ một ' +
       'lần</b>: Windows nhớ quyết định này qua các lần khởi động lại.'],
      ['<code>usbipd attach --wsl --busid 1-4</code>', 'Gắn thiết bị vào WSL đang chạy. Từ lúc này Windows không dùng ' +
       'được cáp nữa. Rút cáp ra là mất attach — cắm lại phải chạy lại lệnh này (hoặc thêm <code>--auto-attach</code>).'],
      ['<code>1-4</code>', 'Chỉ là ví dụ. BUSID trên máy bạn lấy từ cột đầu của <code>usbipd list</code>, và đổi khi bạn ' +
       'cắm sang cổng khác.']
    ] },
    { t: 'cal', kind: 'warn', title: 'Phần này không có output mẫu — và vì sao',
      x: 'Máy dùng để viết bài là laptop công ty: không có cáp USB–UART nào cắm vào, và cài driver lên Windows ở đó ' +
         'cần bộ phận IT. Vì vậy bài <b>không</b> in output của bốn lệnh trên — một output tự bịa còn tệ hơn không có ' +
         'gì. Phía <b>WSL</b> của chuỗi thì kiểm chứng được mà không cần cáp, và Bước 1 làm đúng việc đó. Khi có cáp ' +
         'trong tay, dấu hiệu thành công là ba dòng trong <code>dmesg</code> của WSL: một thiết bị USB mới trên ' +
         '<code>vhci_hcd</code>, tên driver (<code>cp210x</code>, <code>ch341</code> hoặc <code>ftdi_sio</code>), và ' +
         '<code>now attached to ttyUSB0</code>. Nếu laptop của bạn cũng là máy công ty, hỏi IT trước khi cài.' },

    { t: 'h2', x: 'Watchdog: người gác cổng phần cứng' },
    { t: 'p', x: 'Bài 69 dạy Thermo tự quay về khe cũ khi kernel panic — nhờ <code>panic=5</code>. Nhưng nếu kernel ' +
      'không panic mà <b>treo</b>? Một vòng lặp vô hạn với ngắt bị tắt, một deadlock như Bài 56 đã gây ra bằng cách ' +
      'bỏ <code>irqsave</code>: không có thông báo nào, không có reboot nào, và chiếc Thermo trên tường đứng im mãi ' +
      'mãi. <code>S99confirm</code> không bao giờ chạy, bộ đếm A/B không bao giờ được dùng tiếp.' },
    { t: 'p', x: '<b>Watchdog</b> là một bộ đếm lùi bằng phần cứng, nằm ngoài CPU. Nó đếm từ một giá trị — ví dụ 10 ' +
      'giây — về 0; khi chạm 0, nó kéo chân reset của cả SoC. Phần mềm phải định kỳ "nạp" nó (<i>kick</i>, ' +
      '<i>feed</i>, <i>pet</i>) để đặt lại bộ đếm. Hệ thống còn khoẻ thì còn nạp; hệ thống treo thì không nạp được, ' +
      'và phần cứng tự khởi động lại — không cần CPU hợp tác. Giống như người lái tàu hoả phải nhấn bàn đạp "người ' +
      'sống" mỗi vài chục giây: ngất đi là tàu tự phanh.' },
    { t: 'table', head: ['Khái niệm', 'Trong Linux', 'Ý nghĩa'],
      rows: [
        ['Thiết bị', '<code>/dev/watchdog</code> (và <code>/dev/watchdog0</code>)', 'Mở file = <b>bật</b> watchdog. ' +
         'Từ giây đó phải nạp đều'],
        ['Nạp', 'Ghi bất kỳ byte nào vào file, hoặc ioctl <code>WDIOC_KEEPALIVE</code>', 'Đặt lại bộ đếm về đầy'],
        ['Hết hạn (timeout)', 'Tham số driver, ví dụ <code>heartbeat=10</code>', 'Bao lâu không nạp thì reset'],
        ['<i>Magic close</i>', 'Ghi ký tự <code>V</code> ngay trước khi đóng file', 'Báo "tôi cố ý dừng" — driver tắt ' +
         'watchdog. Đóng file mà không có <code>V</code> = coi như chương trình nạp đã chết, watchdog tiếp tục đếm'],
        ['<code>nowayout</code>', '<code>CONFIG_WATCHDOG_NOWAYOUT</code> hoặc tham số module', 'Một khi đã bật thì ' +
         '<b>không thể tắt</b>, kể cả bằng magic close. Sản phẩm thật nên bật'],
        ['Chương trình nạp', 'BusyBox <code>watchdog</code>, systemd <code>RuntimeWatchdogSec=</code>, hoặc chính daemon ' +
         'của bạn', 'Ai nạp quyết định watchdog bảo vệ cái gì']
      ] },
    { t: 'cal', kind: 'why', title: 'Ai nạp watchdog là một quyết định thiết kế',
      x: 'Nếu một tiến trình riêng chỉ làm mỗi việc nạp, watchdog chỉ chứng minh được "kernel còn lập lịch được tiến ' +
         'trình". <code>temp_daemon</code> có thể đã kẹt từ lâu mà board vẫn không reset. Nếu chính ' +
         '<code>temp_daemon</code> nạp sau mỗi lần đọc cảm biến thành công, watchdog chứng minh được "<b>sản phẩm</b> ' +
         'còn làm đúng việc". Câu hỏi "watchdog của bạn bảo vệ cái gì?" là câu phỏng vấn tốt hơn hẳn "watchdog là gì?".' },
    { t: 'p', x: 'Board thật nào cũng có watchdog trong SoC. Với Pi Zero 2 W đó là khối PM của BCM2835, node ' +
      '<code>watchdog@7e100000</code> (<code>compatible = "brcm,bcm2835-pm", "brcm,bcm2835-pm-wdt"</code>) trong ' +
      '<code>bcm2835-common.dtsi</code>, driver <code>CONFIG_BCM2835_WDT</code> — đang bật sẵn trong cây ' +
      '<code>~/bai38</code> của bạn. QEMU <code>virt</code> thì <b>không</b> có watchdog nào mặc định, nên Bước 3 cắm ' +
      'thêm một cái giả lập vào để bạn thấy nó làm việc.' },

    { t: 'h2', x: 'Chuẩn bị phỏng vấn Embedded Linux' },
    { t: 'p', x: 'Một buổi phỏng vấn Embedded Linux thường có ba phần: câu hỏi kiến thức (kernel, driver, boot), một ' +
      'tình huống gỡ lỗi ("board không lên, bạn làm gì?"), và câu chuyện về dự án của bạn. Người phỏng vấn không ' +
      'tìm người thuộc định nghĩa — họ tìm người đã <b>tự tay thấy</b> thứ đó xảy ra. Đây là lợi thế lớn nhất của ' +
      'khoá học: gần như mọi câu dưới đây bạn đều đã đo được một con số trên máy mình.' },
    { t: 'cal', kind: 'tip', title: 'Công thức trả lời: định nghĩa → cơ chế → con số của bạn',
      x: 'Một câu, nói nó là gì. Hai câu, nói nó hoạt động thế nào. Một câu, nói bạn đã thấy nó ra sao: "Tôi chạy ' +
         'hai kthread tăng cùng một biến trên <code>-smp 2</code>, mất 761 nghìn trên 2 triệu lần tăng; với ' +
         '<code>atomic_t</code> thì mất 0 nhưng chậm gấp 6 lần." Câu thứ tư là câu người phỏng vấn nhớ.' },

    { t: 'h3', x: 'Boot, bootloader, Device Tree' },
    { t: 'table', head: ['Câu hỏi', 'Hướng trả lời', 'Đã làm ở'],
      rows: [
        ['Mô tả quá trình boot của một hệ ARM64 từ lúc cấp điện.', 'ROM → (SPL/TF-A) → U-Boot → kernel + DTB → ' +
         'giải nén, <code>start_kernel</code>, initcall → mount root → <code>/init</code> PID 1 → dịch vụ. Nói được ' +
         'mỗi tầng giao gì cho tầng sau (địa chỉ nạp, <code>x0</code> = địa chỉ DTB, cmdline).', 'Bài 2, 32, 33, 63'],
        ['Vì sao cần Device Tree, sao không viết thông tin board vào kernel?', 'Một kernel cho nhiều board; trước 2011 ' +
         'mỗi board là một file C trong <code>arch/arm</code>. DT tách mô tả phần cứng ra dữ liệu. x86 dùng ACPI ' +
         'cho cùng mục đích.', 'Bài 42'],
        ['Kernel tìm driver cho một node DT thế nào?', 'Chuỗi <code>compatible</code> khớp <code>of_match_table</code>; ' +
         'node thành <code>platform_device</code>, khớp thì gọi <code>probe()</code>. Chuỗi đầu tiên cụ thể nhất được ' +
         'ưu tiên.', 'Bài 44, 54'],
        ['<code>-EPROBE_DEFER</code> là gì?', 'Driver cần một tài nguyên (GPIO, clock) mà nhà cung cấp chưa probe; ' +
         'kernel thử lại sau. fw_devlink sắp xếp thứ tự trước cả khi probe.', 'Bài 54'],
        ['FIT image khác <code>Image</code> trần chỗ nào, ký cái gì?', 'Một container chứa kernel + DTB (+ initramfs) ' +
         'kèm hash; ký <b>cấu hình</b> chứ không chỉ từng ảnh, để chống ghép lẫn kernel của bản này với DTB bản kia.',
         'Bài 36, 68'],
        ['Làm sao giảm thời gian boot?', 'Đo trước (<code>printk.time</code>, <code>initcall_debug</code>, đồng hồ phía ' +
         'host), rồi cắt: <code>bootdelay</code>, kernel nhỏ, <code>quiet</code>. Đã đo chuỗi U-Boot + kernel đi từ ' +
         '4,08–4,19 s xuống 0,554–0,558 s.', 'Bài 66']
      ] },

    { t: 'h3', x: 'Kernel và driver' },
    { t: 'table', head: ['Câu hỏi', 'Hướng trả lời', 'Đã làm ở'],
      rows: [
        ['Viết code trong kernel khác user space thế nào?', 'Không libc, không dấu phẩy động, stack 16 KiB, lỗi là ' +
         'oops/panic chứ không phải segfault, mọi con trỏ từ user phải qua <code>copy_from_user</code>.', 'Bài 51'],
        ['<code>copy_from_user</code> để làm gì, sao không <code>memcpy</code>?', 'Con trỏ user có thể sai hoặc trỏ vào ' +
         'kernel; hàm này kiểm tra và xử lý page fault an toàn, trả về số byte không chép được → driver trả ' +
         '<code>-EFAULT</code> (errno 14).', 'Bài 51, 52'],
        ['Spinlock và mutex khác nhau thế nào, khi nào dùng cái nào?', 'Spinlock quay chờ, không được ngủ, dùng được ' +
         'trong ngắt; mutex ngủ chờ, chỉ dùng ở ngữ cảnh tiến trình. Đã đo: <code>atomic_t</code> / spinlock / mutex ' +
         '121 / 257 / 393 ms so với 21 ms không khoá (và sai kết quả).', 'Bài 56'],
        ['Vì sao <code>spin_lock_irqsave</code> chứ không chỉ <code>spin_lock</code>?', 'Nếu handler ngắt cũng lấy khoá ' +
         'đó trên cùng CPU, CPU tự deadlock với chính mình. Đã thấy CPU0 kẹt trong ' +
         '<code>queued_spin_lock_slowpath</code> và RCU stall.', 'Bài 56'],
        ['Top half và bottom half?', 'Top half chạy trong ngắt, càng ngắn càng tốt; phần nặng đẩy sang tasklet/softirq ' +
         '(vẫn không được ngủ), workqueue hoặc threaded IRQ (được ngủ). <code>msleep</code> trong tasklet → ' +
         '<code>BUG: scheduling while atomic</code>.', 'Bài 55'],
        ['Có mấy cách để user space nói chuyện với driver?', '<code>read</code>/<code>write</code>, ' +
         '<code>ioctl</code>, sysfs, procfs, debugfs; chọn theo mục đích. Đã đo <code>ioctl</code> nhanh hơn sysfs ' +
         '17–29 lần.', 'Bài 52, 53'],
        ['<code>devm_*</code> giải quyết vấn đề gì?', 'Tài nguyên tự giải phóng khi driver unbind, theo thứ tự ngược. ' +
         'Đã đo: bản dùng <code>kmalloc</code> không <code>kfree</code> rò 2 048 kB qua 1 000 lần unbind/bind; bản ' +
         '<code>devm_kmalloc</code> rò 0.',
         'Bài 54'],
        ['Vì sao một <code>.ko</code> không nạp được vào kernel khác?', '<code>vermagic</code> và layout của ' +
         '<code>struct module</code> phải khớp. Đã thấy: sửa một byte vermagic là bị từ chối; đổi cấu hình kernel ở ' +
         'Bài 65 làm mọi <code>.ko</code> cũ báo <code>this_module section size must match</code>.', 'Bài 50, 65']
      ] },

    { t: 'h3', x: 'Build, gỡ lỗi, sản phẩm' },
    { t: 'table', head: ['Câu hỏi', 'Hướng trả lời', 'Đã làm ở'],
      rows: [
        ['Buildroot hay Yocto?', 'Buildroot: một <code>.config</code>, đơn giản, build lại toàn bộ khi đổi cấu hình, ' +
         'hợp đội nhỏ. Yocto: layer, recipe, sstate cache, SDK, gói cài thêm; hợp sản phẩm nhiều biến thể, cần ' +
         '32 GB RAM để build thoải mái.', 'Bài 60–62'],
        ['Thêm chương trình của bạn vào Buildroot thế nào?', 'Một package trong br2-external: <code>Config.in</code>, ' +
         '<code>.mk</code> (<code>generic-package</code>), <code>.hash</code>; bản vá trong ' +
         '<code>BR2_GLOBAL_PATCH_DIR</code>; lưu bằng <code>savedefconfig</code>.', 'Bài 61, 67'],
        ['Kernel panic chỉ có log, bạn làm gì?', 'Đọc dòng <code>pc :</code> (hàm + offset), ESR, call trace; ' +
         '<code>faddr2line</code>/<code>addr2line</code> ra dòng code; <code>objdump -dS</code> ra lệnh lỗi. Đã làm với ' +
         '<code>buggy_write+0xb4</code>, NULL + 0x10.', 'Bài 64'],
        ['Có bug xuất hiện từ một phiên bản nào đó, tìm thế nào?', '<code>git bisect run</code> với một script test ' +
         'tự động; log<sub>2</sub>(số commit) lần build.', 'Bài 64'],
        ['Vì sao không rải <code>printk</code> để debug timing?', 'Ghi ra UART chậm: đã đo ~120 000 ns mỗi dòng so với ' +
         '~50 ns của vòng lặp được đo. Dùng <code>trace_printk</code>, dynamic debug, ftrace.', 'Bài 65'],
        ['Cập nhật firmware an toàn khi mất điện thế nào?', 'A/B: ghi vào khe không chạy, kiểm chữ ký trên chính đĩa, ' +
         'một thao tác chuyển nguyên tử, bộ đếm lượt thử, đánh dấu tốt sau health check. Đã rút điện giữa lúc ghi.',
         'Bài 69'],
        ['Thiết bị treo cứng thì sao?', 'Watchdog phần cứng; câu hỏi tiếp theo là ai nạp nó và nạp khi nào.', 'Bài 70'],
        ['Làm thiết bị an toàn hơn bắt đầu từ đâu?', 'Mô hình mối đe doạ trước; rồi chuỗi tin cậy, rootfs chỉ đọc, ' +
         'bỏ dịch vụ/applet thừa, không chạy root, không có mật khẩu rỗng, khoá bí mật không vào repo.', 'Bài 68']
      ] },

    { t: 'h3', x: 'Kể Thermo trong hai phút' },
    { t: 'p', x: '"Kể về một dự án bạn đã làm" gần như chắc chắn sẽ xuất hiện. Thermo là câu trả lời — miễn là bạn kể ' +
      'nó như một kỹ sư chứ không như một danh sách công nghệ. Một khung bốn phần:' },
    { t: 'list', ordered: true, items: [
      '<b>Bài toán, một câu.</b> "Một thiết bị đo nhiệt độ ARM64, boot từ thẻ nhớ, phục vụ số đo qua TCP, cập nhật ' +
        'qua mạng."',
      '<b>Kiến trúc, từ dưới lên.</b> U-Boot tự build → FIT có chữ ký → kernel 6.18 + Device Tree riêng → driver ' +
        'platform <code>tsensor</code> → rootfs Buildroot chỉ đọc → <code>temp_daemon</code> chạy dưới user riêng → ' +
        'A/B với rollback.',
      '<b>Một vấn đề thật và cách bạn tìm ra.</b> Ví dụ của Bài 67: boot "thành công" nhưng kernel dùng Device Tree ' +
        'của QEMU, vì môi trường U-Boot thiếu <code>fdt_addr_r</code> và <code>extlinux</code> lặng lẽ bỏ qua dòng ' +
        '<code>fdt</code>. Bạn phát hiện từ dòng <code>Machine model:</code> trong log.',
      '<b>Con số.</b> Build sạch dưới 10 phút từ một defconfig; một byte bị sửa trong kernel là U-Boot từ chối boot; ' +
        'mất điện giữa lúc cập nhật, ảnh giả chữ ký, ảnh không boot được — cả ba lần đều quay về bản cũ.'
    ] },
    { t: 'cal', kind: 'warn', title: 'Nói thật về QEMU',
      x: 'Đừng nói Thermo chạy trên board thật nếu nó chưa từng chạy. Câu "toàn bộ chạy trên QEMU <code>virt</code>, ' +
         'tôi biết chính xác ba thứ phải đổi khi lên board — firmware, Device Tree, chân nối — và đã build sẵn ảnh cho ' +
         'Pi Zero 2 W" là câu trả lời mạnh, vì nó chứng minh bạn hiểu ranh giới giữa hai thế giới. Người phỏng vấn ' +
         'có kinh nghiệm sẽ hỏi một câu về phần cứng và nhận ra ngay ai đang phóng đại.' },

    { t: 'h2', x: 'Thực hành: chuẩn bị bàn làm việc trước khi board về' },
    { t: 'p', x: 'Năm bước dưới đây không cần board nào. Chúng làm sẵn mọi thứ có thể làm trước: kiểm tra WSL nhận ' +
      'được cáp, luyện console nối tiếp trên một UART giả lập, thấy watchdog reset máy thật sự, build ảnh thẻ nhớ ' +
      'cho Pi Zero 2 W, và kiểm tra Thermo đã sẵn sàng làm portfolio. Mọi thứ nằm trong <code>~/bai70</code>.' },
    { t: 'steps', items: [
      { title: 'Kiểm tra phía WSL của chuỗi USB', blocks: [
        { t: 'p', x: 'Trước khi mua cáp, hỏi chính kernel WSL xem nó có những mắt xích nào trong hình usbipd ở trên. ' +
          'Kernel WSL công bố cấu hình của nó tại <code>/proc/config.gz</code> — cùng cơ chế ' +
          '<code>IKCONFIG_PROC</code> mà Thermo dùng ở Bài 67:' },
        { t: 'code', where: 'wsl', code:
          'uname -r\n' +
          'zcat /proc/config.gz | grep -E \'USBIP_VHCI_HCD=|USB_SERIAL_(CP210X|CH341|FTDI_SIO|PL2303)\'' },
        { t: 'code', where: 'out', nocopy: true, code:
          '5.15.167.4-microsoft-standard-WSL2\n' +
          'CONFIG_USBIP_VHCI_HCD=y\n' +
          'CONFIG_USB_SERIAL_CH341=m\n' +
          'CONFIG_USB_SERIAL_CP210X=m\n' +
          'CONFIG_USB_SERIAL_FTDI_SIO=m\n' +
          '# CONFIG_USB_SERIAL_PL2303 is not set' },
        { t: 'cmdx', title: 'Đọc từng dòng', rows: [
          ['<code>USBIP_VHCI_HCD=y</code>', 'Bộ điều khiển USB ảo nhận thiết bị từ usbipd-win. <code>=y</code>: build ' +
           'thẳng vào kernel, luôn có mặt.'],
          ['<code>CP210X</code>, <code>CH341</code>, <code>FTDI_SIO</code> <code>=m</code>', 'Ba driver cho ba họ chip ' +
           'cáp phổ biến, ở dạng module: chỉ nạp khi có thiết bị khớp.'],
          ['<code># … PL2303 is not set</code>', 'Không được build. Cáp PL2303 sẽ hiện trong <code>lsusb</code> nhưng ' +
           'không bao giờ thành <code>/dev/ttyUSB0</code>.'],
          ['<code>5.15.167.4</code>', 'Phiên bản kernel WSL của máy viết bài. WSL tự cập nhật kernel, nên máy bạn có thể ' +
           'khác — chạy lại lệnh <code>grep</code> là biết danh sách driver của máy mình.']
        ] },
        { t: 'p', x: 'Bộ điều khiển ảo đó đang tồn tại ngay lúc này, dù chưa có thiết bị nào gắn vào:' },
        { t: 'code', where: 'wsl', code:
          'cat /sys/bus/usb/devices/usb*/product\n' +
          'head -n 3 /sys/devices/platform/vhci_hcd.0/status' },
        { t: 'code', where: 'out', nocopy: true, code:
          'USB/IP Virtual Host Controller\n' +
          'USB/IP Virtual Host Controller\n' +
          'hub port sta spd dev      sockfd local_busid\n' +
          'hs  0000 004 000 00000000 000000 0-0\n' +
          'hs  0001 004 000 00000000 000000 0-0' },
        { t: 'p', x: 'WSL có đúng <b>hai</b> bus USB, và cả hai đều là "USB/IP Virtual Host Controller" — không có bus ' +
          'USB thật nào. Bảng <code>status</code> liệt kê các cổng ảo: cột <code>sta</code> = <code>004</code> nghĩa là ' +
          'cổng trống, <code>local_busid</code> <code>0-0</code> nghĩa là chưa gắn gì. Sau ' +
          '<code>usbipd attach</code>, một dòng sẽ đổi trạng thái và mang BUSID của cáp. Đây là chỗ đầu tiên bạn nhìn ' +
          'khi <code>attach</code> báo thành công mà không thấy <code>/dev/ttyUSB0</code>.' },
        { t: 'p', x: 'Còn câu hỏi: khi cáp CP2102 xuất hiện, kernel biết nạp <code>cp210x</code> bằng cách nào? Đúng như ' +
          'driver <code>tsensor</code> của bạn khai <code>of_match_table</code>, mỗi driver USB khai một bảng ' +
          'VID:PID, và <code>MODULE_DEVICE_TABLE</code> xuất bảng đó thành alias (Bài 44, 67):' },
        { t: 'code', where: 'wsl', code:
          'modinfo -F alias cp210x | grep -i \'v10C4pEA60\'\n' +
          'modinfo -F alias cp210x | wc -l\n' +
          'modinfo pl2303' },
        { t: 'code', where: 'out', nocopy: true, code:
          'usb:v10C4pEA60d*dc*dsc*dp*ic*isc*ip*in*\n' +
          '203\n' +
          'modinfo: ERROR: Module pl2303 not found.' },
        { t: 'cal', kind: 'info', title: 'Chuỗi modalias, lần này cho USB',
          x: '<code>v10C4pEA60</code> là <b>V</b>endor <code>10C4</code> (Silicon Labs), <b>P</b>roduct ' +
             '<code>EA60</code> (CP2102) — đúng cặp số <code>usbipd list</code> và <code>lsusb</code> sẽ in ra dạng ' +
             '<code>10c4:ea60</code>. Các dấu <code>*</code> phía sau là "phiên bản, lớp thiết bị… gì cũng được". Khi ' +
             'thiết bị xuất hiện, kernel tạo chuỗi modalias của nó, udev tìm alias khớp và nạp <code>cp210x</code>. ' +
             '<code>cp210x</code> khai <b>203</b> alias vì hàng trăm sản phẩm khác nhau dùng chip Silicon Labs. Và ' +
             '<code>pl2303</code> thì không tồn tại trong <code>/lib/modules</code> — khẳng định lần thứ hai cho dòng ' +
             '<code>is not set</code> ở trên.' },
        { t: 'p', x: 'Mắt xích cuối là quyền. Mọi cổng nối tiếp trong Linux thuộc nhóm <code>dialout</code>. WSL có sẵn ' +
          'vài cổng nối tiếp ảo (<code>/dev/ttyS0</code>…) để bạn thấy điều này ngay:' },
        { t: 'code', where: 'wsl', code:
          'id -nG\n' +
          'ls -l /dev/ttyS0' },
        { t: 'code', where: 'out', nocopy: true, code:
          'cah8hc adm cdrom sudo dip plugdev kvm docker\n' +
          'crw-rw---- 1 root dialout 4, 64 Oct 31 11:18 /dev/ttyS0' },
        { t: 'p', x: 'File thiết bị có quyền <code>rw</code> cho chủ <code>root</code> và nhóm <code>dialout</code>, ' +
          'không gì cho người khác — còn danh sách nhóm của user trên máy viết bài <b>không có</b> ' +
          '<code>dialout</code>. <code>/dev/ttyUSB0</code> sẽ được tạo với đúng quyền đó. Tên user và danh sách nhóm ' +
          'trên máy bạn sẽ khác; điều cần kiểm tra chỉ là có chữ <code>dialout</code> hay không. Thêm một lần, rồi ' +
          'đóng hẳn WSL (<code>wsl --shutdown</code> từ PowerShell) và mở lại để nhóm mới có hiệu lực:' },
        { t: 'code', where: 'wsl', code:
          'sudo usermod -aG dialout $USER' },
        { t: 'cmdx', title: 'usermod -aG', rows: [
          ['<code>-G dialout</code>', 'Đặt danh sách nhóm phụ của user.'],
          ['<code>-a</code>', '<b>Thêm vào</b> danh sách thay vì thay thế. Quên <code>-a</code> là user bị rút khỏi ' +
           '<code>sudo</code> và mọi nhóm khác.'],
          ['<code>$USER</code>', 'Tên user hiện tại.']
        ] }
      ] },

      { title: 'Console nối tiếp không cần board: QEMU + picocom', blocks: [
        { t: 'p', x: 'Suốt khoá học, <code>-nographic</code> nối UART của QEMU thẳng vào terminal của bạn — tiện, nhưng ' +
          'giấu mất cách làm việc thật: trên bàn làm việc, UART là một <b>file thiết bị</b> và bạn mở nó bằng một ' +
          'chương trình terminal nối tiếp. QEMU giả lập được đúng điều đó bằng <code>-serial pty</code>: UART của máy ' +
          'ảo được nối vào một <b>pseudo-terminal</b> mới, <code>/dev/pts/N</code>, đóng vai <code>/dev/ttyUSB0</code>. ' +
          'Cài chương trình terminal trước:' },
        { t: 'code', where: 'wsl', code:
          'sudo apt-get install picocom' },
        { t: 'p', x: 'Mở <b>terminal WSL thứ nhất</b> và khởi động QEMU với kernel của <code>~/bai38</code> và initramfs ' +
          'của Bài 32. <code>-S</code> giữ CPU dừng ngay từ đầu, để bạn kịp mở picocom trước khi kernel in dòng đầu tiên:' },
        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -display none \\\n' +
          '    -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
          '    -initrd ~/bai32/initramfs.cpio.gz -append console=ttyAMA0 \\\n' +
          '    -serial pty -monitor stdio -S' },
        { t: 'code', where: 'out', nocopy: true, code:
          'QEMU 4.2.1 monitor - type \'help\' for more information\n' +
          '(qemu) char device redirected to /dev/pts/4 (label serial0)' },
        { t: 'cmdx', title: 'Ba tham số mới', rows: [
          ['<code>-serial pty</code>', 'UART đầu tiên của <code>virt</code> (PL011 tại <code>0x9000000</code>) nối vào ' +
           'một pseudo-terminal mới. QEMU in tên của nó: <code>/dev/pts/4</code>.'],
          ['<code>-monitor stdio</code>', 'Terminal này trở thành monitor <code>(qemu)</code> — không còn là console ' +
           'nữa. Bài 31 đã giải thích vì sao không dùng chung với <code>-nographic</code>.'],
          ['<code>-S</code>', 'Không chạy CPU cho tới khi gõ <code>cont</code> ở monitor. Board thật không có nút này, ' +
           'nên trên board bạn mở picocom <b>trước</b> rồi mới cắm nguồn.'],
          ['<code>/dev/pts/4</code>', 'Số <code>4</code> là số pty còn trống trên máy viết bài, <b>sẽ khác trên máy ' +
           'bạn</b>. Dùng đúng số QEMU in ra.']
        ] },
        { t: 'p', x: 'Mở <b>terminal WSL thứ hai</b>, mở cổng bằng picocom với đúng thông số của console:' },
        { t: 'code', where: 'wsl', code:
          'picocom -b 115200 /dev/pts/4' },
        { t: 'code', where: 'out', nocopy: true, code:
          'picocom v3.1\n\n' +
          'port is        : /dev/pts/4\n' +
          'flowcontrol    : none\n' +
          'baudrate is    : 115200\n' +
          'parity is      : none\n' +
          'databits are   : 8\n' +
          'stopbits are   : 1\n' +
          'escape is      : C-a\n' +
          'local echo is  : no\n' +
          '…\n' +
          'Type [C-a] [C-h] to see available commands\n' +
          'Terminal ready' },
        { t: 'p', x: 'Năm dòng giữa chính là <b>115200 8N1</b> của bảng thông số ở phần lý thuyết: tốc độ ' +
          '<code>115200</code>, <code>parity none</code>, <code>databits 8</code>, <code>stopbits 1</code>, ' +
          '<code>flowcontrol none</code> — mặc định của picocom, nên chỉ cần <code>-b</code>. <code>escape is: ' +
          'C-a</code> nghĩa là mọi lệnh điều khiển picocom bắt đầu bằng <kbd>Ctrl</kbd>+<kbd>A</kbd>. ' +
          '<code>Terminal ready</code> mà không có gì phía sau là đúng: CPU của máy ảo vẫn đang dừng. (Dấu ' +
          '<code>…</code> thay cho 14 dòng cấu hình nâng cao không dùng trong bài.)' },
        { t: 'p', x: 'Quay lại terminal thứ nhất và cho CPU chạy:' },
        { t: 'code', where: 'qemu', name: 'Monitor (qemu), terminal thứ nhất', code: 'cont' },
        { t: 'p', x: 'Toàn bộ log boot chảy vào cửa sổ picocom, đúng như khi bạn cấp nguồn cho một board có cáp UART ' +
          'cắm sẵn. Khi thấy dấu nhắc, gõ ba lệnh vào <b>cửa sổ picocom</b>:' },
        { t: 'code', where: 'out', nocopy: true, code:
          '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
          '[    0.000000] Linux version 6.18.45-embedded (cah8hc@HC-C-005W7) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #7 SMP PREEMPT Sat Oct 31 17:31:37 +07 2026\n' +
          '…\n' +
          '[    1.618956] Run /init as init process\n\n' +
          '=== init running as PID 1 ===\n\n\n' +
          'BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
          'Enter \'help\' for a list of built-in commands.\n\n' +
          '/bin/sh: can\'t access tty; job control turned off\n' +
          '~ # uname -m\n' +
          'aarch64\n' +
          '~ # cat /proc/cmdline\n' +
          'console=ttyAMA0\n' +
          '~ # cat /proc/tty/driver/ttyAMA\n' +
          'serinfo:1.0 driver revision:\n' +
          '0: uart:PL011 rev1 mmio:0x09000000 irq:13 tx:306 rx:55 RTS|DTR' },
        { t: 'p', x: 'Dòng <code>Linux version</code> mang tên máy, ngày build và số <code>#7</code> của cây ' +
          '<code>~/bai38</code> trên máy viết bài — của bạn sẽ khác. Dấu <code>…</code> thay cho khoảng 240 dòng log ' +
          'kernel bạn đã đọc kỹ ở Bài 32. Dòng cuối đáng đọc từng trường:' },
        { t: 'cmdx', title: '/proc/tty/driver/ttyAMA — UART nhìn từ phía máy ảo', rows: [
          ['<code>uart:PL011 mmio:0x09000000 irq:13</code>', 'Đúng UART bạn đã gặp ở Bài 30 và 41: PL011, địa chỉ ' +
           '<code>0x9000000</code>. <code>irq:13</code> là số IRQ Linux cấp, không phải số SPI trong Device Tree.'],
          ['<code>rx:55</code>', 'Số byte UART <b>nhận</b> — chính là những gì bạn gõ. ' +
           '<code>uname -m⏎</code> = 9, <code>cat /proc/cmdline⏎</code> = 18, <code>cat /proc/tty/driver/ttyAMA⏎</code> ' +
           '= 28; cộng lại đúng <b>55</b>. Gõ thêm một lệnh rồi đọc lại, con số tăng đúng bằng số ký tự.'],
          ['<code>tx:306</code>', 'Số byte UART <b>gửi</b> qua tầng tty: lời chào của init và BusyBox, dấu nhắc, tiếng ' +
           'vọng các ký tự bạn gõ, output của lệnh. Đếm trong log picocom từ sau dòng <code>Run /init</code> đến ngay ' +
           'trước dòng <code>serinfo</code> được đúng 306 byte (kể cả mấy byte điều khiển terminal mà shell gửi đi ' +
           'không hiện ra màn hình). Hai trăm bốn mươi dòng log kernel phía trên <b>không</b> được tính: kernel ghi ' +
           'console thẳng vào thanh ghi UART, đi vòng qua tầng tty.'],
          ['<code>RTS|DTR</code>', 'Hai tín hiệu điều khiển modem đang bật. Cáp USB–UART ba dây không nối chúng, nên ' +
           'trên board thật bạn bỏ qua.']
        ] },
        { t: 'cal', kind: 'warn', title: 'Pty không giả lập được sai baud',
          x: 'Chạy lại toàn bộ bước này với <code>picocom -b 9600</code>: picocom in <code>baudrate is : 9600</code>, ' +
             'vậy mà log kernel, <code>aarch64</code> và cả dòng <code>tx:306 rx:55</code> đều hiện ra nguyên vẹn (đã ' +
             'thử trên máy viết bài). Một pseudo-terminal chỉ là ống dữ liệu, không có xung nhịp, nên tốc độ là con số ' +
             'trang trí. Trên cáp thật, sai tốc độ cho ra ký tự rác ' +
             '— đó là lỗi đầu tiên ai cũng gặp, và bài tập này không cho bạn thấy được nó. Khi màn hình đầy ký tự lạ, ' +
             'hãy nghĩ tới baud trước tiên.' },
        { t: 'p', x: 'Thoát picocom bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>Ctrl</kbd>+<kbd>X</kbd>, sau đó gõ ' +
          '<code>quit</code> ở monitor:' },
        { t: 'code', where: 'out', nocopy: true, code:
          'Terminating...\n' +
          'Thanks for using picocom' },
        { t: 'p', x: 'Hai dòng đó là dấu hiệu thoát sạch: picocom đã trả lại thiết lập của cổng và nhả khoá. Đóng cửa ' +
          'sổ terminal thay vì thoát đúng cách thường để lại picocom chạy ngầm giữ cổng, và lần mở sau báo cổng đang ' +
          'bận. Và đây là hai lỗi bạn sẽ gặp đầu tiên với cáp thật, cả hai đều tái hiện được ngay bây giờ:' },
        { t: 'code', where: 'wsl', code:
          'picocom -b 115200 /dev/ttyUSB0\n' +
          'picocom -b 115200 /dev/ttyS0' },
        { t: 'code', where: 'out', nocopy: true, code:
          'FATAL: cannot open /dev/ttyUSB0: No such file or directory\n' +
          'FATAL: cannot open /dev/ttyS0: Permission denied' },
        { t: 'p', x: 'Hai lỗi, hai nguyên nhân khác hẳn nhau. <code>No such file or directory</code>: không có thiết bị ' +
          '— cáp chưa <code>attach</code>, hoặc chip không có driver (cáp PL2303). <code>Permission denied</code>: thiết ' +
          'bị có, nhưng user chưa thuộc <code>dialout</code> (Bước 1). Mỗi dòng <code>FATAL</code> đứng sau bảng cấu ' +
          'hình đầy đủ như ở trên, đã được lược đi; picocom thoát với mã 1. Nếu bạn đã thêm ' +
          '<code>dialout</code> và mở lại WSL, lệnh thứ hai sẽ mở được <code>/dev/ttyS0</code> — một cổng trống, không ' +
          'có gì để đọc.' }
      ] },

      { title: 'Watchdog reset máy thật sự', blocks: [
        { t: 'p', x: 'QEMU <code>virt</code> không có watchdog, nhưng QEMU giả lập được một con chip watchdog thật: Intel ' +
          '6300ESB, gắn trên bus PCI — thứ <code>virt</code> có sẵn. Kiểm tra QEMU có nó, và kernel của bạn có driver ' +
          'cho nó chưa:' },
        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -device help | grep -i 6300\n' +
          'grep -E \'I6300ESB_WDT|CONFIG_WATCHDOG_NOWAYOUT\' ~/bai38/linux-6.18.45/.config' },
        { t: 'code', where: 'out', nocopy: true, code:
          'name "i6300esb", bus PCI\n' +
          '# CONFIG_WATCHDOG_NOWAYOUT is not set\n' +
          '# CONFIG_I6300ESB_WDT is not set' },
        { t: 'p', x: 'QEMU có thiết bị, nhưng <code>defconfig</code> arm64 không bật driver — chip này vốn chỉ có trên ' +
          'bo mạch Intel. Bạn không cần build lại kernel: driver là một file C độc lập trong cây nguồn, và Bài 50 đã ' +
          'dạy build một module out-of-tree. Chép nó ra, build bằng Kbuild một dòng, rồi đóng vào initramfs của Bài ' +
          '32 như Bài 64 đã làm. <code>NOWAYOUT</code> cũng tắt — dòng này quan trọng ở cuối bước.' },
        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai70/wdt && cd ~/bai70/wdt\n' +
          'cp ~/bai38/linux-6.18.45/drivers/watchdog/i6300esb.c .\n' +
          'echo \'obj-m := i6300esb.o\' > Kbuild\n' +
          'make -C ~/bai38/linux-6.18.45 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 M=$PWD modules\n' +
          'cp -a ~/bai32/initramfs initramfs\n' +
          'cp i6300esb.ko initramfs/\n' +
          '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },
        { t: 'code', where: 'out', nocopy: true, code:
          '  CC [M]  i6300esb.o\n' +
          '  MODPOST Module.symvers\n' +
          '  CC [M]  i6300esb.mod.o\n' +
          '  CC [M]  .module-common.o\n' +
          '  LD [M]  i6300esb.ko\n' +
          '5093 blocks',
          notes: ['Đã lược các dòng <code>make: Entering/Leaving directory</code>.'] },
        { t: 'p', x: 'Năm dòng <code>CC</code>/<code>LD</code> giống hệt module đầu tiên của bạn ở Bài 50: một driver ' +
          'của kernel và một module tự viết được build theo cùng một cách. <code>5093 blocks</code> là kích thước ' +
          'cpio tính theo khối 512 byte. Khởi động với hai tham số mới:' },
        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
          '    -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
          '    -initrd ~/bai70/wdt/initramfs.cpio.gz -append console=ttyAMA0 \\\n' +
          '    -device i6300esb -watchdog-action reset' },
        { t: 'cmdx', title: 'Hai tham số watchdog', rows: [
          ['<code>-device i6300esb</code>', 'Cắm chip watchdog vào bus PCI của <code>virt</code>. Linux sẽ thấy nó ở ' +
           '<code>0000:00:02.0</code>.'],
          ['<code>-watchdog-action reset</code>', 'Khi bộ đếm chạm 0, QEMU làm điều chân reset làm trên board thật: ' +
           'khởi động lại toàn bộ máy. Các giá trị khác (<code>poweroff</code>, <code>pause</code>, <code>debug</code>) ' +
           'tiện để gỡ lỗi nhưng không giống phần cứng.']
        ] },
        { t: 'p', x: 'Trong máy ảo: initramfs của Bài 32 không mount <code>devtmpfs</code>, nên mount tay trước (Bài 52 ' +
          'đã gặp đúng điều này), rồi nạp driver với thời hạn 10 giây:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'mount -t devtmpfs none /dev\n' +
          'insmod /i6300esb.ko heartbeat=10\n' +
          'ls -l /dev/watchdog*' },
        { t: 'code', where: 'out', nocopy: true, code:
          '[    1.874382] i6300esb: loading out-of-tree module taints kernel.\n' +
          '[    1.879318] i6300ESB timer 0000:00:02.0: enabling device (0000 -> 0002)\n' +
          '[    1.880807] i6300ESB timer 0000:00:02.0: initialized. heartbeat=10 sec (nowayout=0)\n' +
          'crw-------    1 0        0          10, 130 Nov  3 06:41 /dev/watchdog\n' +
          'crw-------    1 0        0         245,   0 Nov  3 06:41 /dev/watchdog0' },
        { t: 'p', x: '<code>heartbeat=10 sec (nowayout=0)</code>: hạn 10 giây, và vẫn tắt được bằng magic close. Có ' +
          '<b>hai</b> file thiết bị: <code>/dev/watchdog</code> là misc device <code>10, 130</code> — số cố định cho ' +
          'watchdog đầu tiên từ thời xa xưa — còn <code>/dev/watchdog0</code> là chardev riêng của watchdog core ' +
          '(major <code>245</code> do kernel cấp động, có thể khác trên máy bạn), để một board có nhiều watchdog. Ngày ' +
          'giờ trong <code>ls</code> là giờ UTC của máy ảo. Watchdog <b>chưa chạy</b>: chưa ai mở file.' },
        { t: 'p', x: 'Bật nó bằng chương trình nạp của BusyBox, đợi 25 giây — gấp rưỡi thời hạn — và xem máy còn sống không:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'watchdog -T 10 -t 2 /dev/watchdog; pidof watchdog\n' +
          'sleep 25; pidof watchdog; cut -d" " -f1 /proc/uptime' },
        { t: 'code', where: 'out', nocopy: true, code:
          '63\n' +
          '63\n' +
          '27.13' },
        { t: 'cmdx', title: 'watchdog -T 10 -t 2', rows: [
          ['<code>watchdog</code>', 'Applet của BusyBox: mở thiết bị, tự chạy nền, nạp định kỳ mãi mãi.'],
          ['<code>-T 10</code>', 'Đặt thời hạn phần cứng 10 s (qua ioctl <code>WDIOC_SETTIMEOUT</code>).'],
          ['<code>-t 2</code>', 'Nạp mỗi 2 s. Quy tắc: chu kỳ nạp nhỏ hơn hẳn thời hạn, để một lần chậm trễ không ' +
           'gây reset oan.'],
          ['<code>63</code>', 'PID của tiến trình nạp, sẽ khác trên máy bạn. Hai lần in cùng số: nó vẫn chạy suốt 25 s.']
        ] },
        { t: 'p', x: '<code>/proc/uptime</code> = 27,13 s: máy đã sống qua hai lần rưỡi thời hạn mà không reset — vì có ' +
          'người nạp. Giờ giả lập điều watchdog sinh ra để bắt: chương trình nạp chết đột ngột. ' +
          '<code>kill -9</code> không cho nó cơ hội ghi <code>V</code>:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'cut -d" " -f1 /proc/uptime; killall -9 watchdog' },
        { t: 'code', where: 'out', nocopy: true, code:
          '27.21\n' +
          '[   27.259231] watchdog: watchdog0: watchdog did not stop!\n' +
          '~ # [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
          '…\n' +
          '=== init running as PID 1 ===\n' +
          '~ # cut -d" " -f1 /proc/uptime\n' +
          '1.73' },
        { t: 'cal', kind: 'info', title: 'Đọc lần reset',
          x: 'Khi tiến trình chết, kernel đóng file thay nó. Watchdog core thấy file bị đóng <b>không có</b> ' +
             '<code>V</code>, nên in <code>watchdog did not stop!</code>, nạp thêm một lần cuối và để bộ đếm chạy ' +
             '(<code>drivers/watchdog/watchdog_dev.c</code>, dòng 968). Không còn ai nạp nữa. Khoảng <b>10,6 s</b> sau ' +
             '— đo ba lần bằng đồng hồ phía host: 10,58 / 10,60 / 10,60 s — dòng <code>Booting Linux</code> xuất hiện ' +
             'lại: phần cứng đã reset máy, không cần kernel đồng ý. <code>uptime</code> về <code>1.73</code>. Con số ' +
             '10,6 thay vì đúng 10 vì 6300ESB đếm hai giai đoạn và QEMU còn mất thời gian khởi động lại; trên máy bạn ' +
             'nó sẽ xê dịch vài phần mười giây.' },
        { t: 'p', x: 'Máy vừa khởi động lại, nên nạp lại driver. Lần này đóng file <b>có</b> magic close, rồi đợi 30 giây:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'mount -t devtmpfs none /dev\n' +
          'insmod /i6300esb.ko heartbeat=10\n' +
          'printf V > /dev/watchdog\n' +
          'sleep 30; cut -d" " -f1 /proc/uptime' },
        { t: 'code', where: 'out', nocopy: true, code:
          '32.08' },
        { t: 'p', x: '<code>printf V &gt; /dev/watchdog</code> làm ba việc trong một dòng: mở file (bật watchdog), ghi ' +
          '<code>V</code> (vừa nạp vừa xin phép dừng), đóng file (driver dừng watchdog). Không có dòng ' +
          '<code>did not stop</code>, và 32 giây sau máy vẫn sống. Giờ đúng lệnh đó, chỉ đổi ký tự:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'printf x > /dev/watchdog' },
        { t: 'code', where: 'out', nocopy: true, code:
          '[   32.199642] watchdog: watchdog0: watchdog did not stop!\n' +
          '~ # [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]' },
        { t: 'p', x: 'Một ký tự khác, và máy reset sau khoảng 10,6 s. Đó là toàn bộ giao thức magic close: chỉ ' +
          '<code>V</code> nghĩa là "tôi cố ý". Cuối cùng, điều sản phẩm thật nên dùng — <code>nowayout</code>. Khởi động ' +
          'lại, nạp driver với <code>nowayout=1</code>:' },
        { t: 'code', where: 'qemu', name: 'Trong máy ảo', code:
          'mount -t devtmpfs none /dev\n' +
          'insmod /i6300esb.ko heartbeat=10 nowayout=1\n' +
          'printf V > /dev/watchdog' },
        { t: 'code', where: 'out', nocopy: true, code:
          '[    1.817649] i6300ESB timer 0000:00:02.0: initialized. heartbeat=10 sec (nowayout=1)\n' +
          '[    1.896104] watchdog: watchdog0: nowayout prevents watchdog being stopped!\n' +
          '[    1.896785] watchdog: watchdog0: watchdog did not stop!\n' +
          '~ # [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]' },
        { t: 'cal', kind: 'why', title: 'Vì sao sản phẩm bật nowayout',
          x: 'Với <code>nowayout=1</code>, ngay cả <code>V</code> cũng bị từ chối — dòng <code>nowayout prevents ' +
             'watchdog being stopped!</code> — và máy reset sau 10,63 s. Lý do: một lỗi phần mềm (hoặc một kẻ tấn ' +
             'công) có thể vô tình ghi <code>V</code> rồi treo, và watchdog sẽ không cứu được. Trên sản phẩm, một khi ' +
             'watchdog đã bật thì chỉ có hai kết cục: được nạp mãi, hoặc reset. Board Pi bạn build ở Bước 4 có ' +
             '<code># CONFIG_WATCHDOG_NOWAYOUT is not set</code> — mặc định cho bo mạch phát triển; Thermo bản sản phẩm ' +
             'nên bật nó trong <code>linux.fragment</code>.' },
        { t: 'p', x: 'Thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>. Nếu watchdog đang chạy, đừng chờ ' +
          'nó: QEMU sẽ khởi động lại máy ảo mãi mãi theo đúng thiết kế.' }
      ] },

      { title: 'Build sẵn ảnh thẻ nhớ cho Raspberry Pi Zero 2 W', blocks: [
        { t: 'p', x: 'Cây Buildroot của Bài 67 có sẵn defconfig cho Pi Zero 2 W. Build nó trong một thư mục ' +
          '<code>O=</code> riêng — cây nguồn và <code>dl/</code> dùng chung, Thermo không bị đụng tới. Khi board về, ' +
          'bạn chỉ còn việc ghi thẻ:' },
        { t: 'code', where: 'wsl', code:
          'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
          'cd ~/bai67/buildroot-2026.02.3\n' +
          'make O=~/bai70/rpi raspberrypizero2w_64_defconfig\n' +
          'cd ~/bai70/rpi\n' +
          'make source\n' +
          'time make' },
        { t: 'code', where: 'out', nocopy: true, code:
          'real\t18m13.335s\n' +
          'user\t200m20.379s\n' +
          'sys\t17m58.453s' },
        { t: 'p', x: '<b>18 phút</b> trên 16 CPU, gần gấp đôi Thermo (Bài 69: 8m0s) dù không có U-Boot. Gần như toàn bộ ' +
          'chênh lệch là kernel: <code>user 200m</code> nghĩa là các lõi CPU cộng lại làm việc hơn 3 giờ, vì ' +
          '<code>bcm2711_defconfig</code> của Raspberry Pi bật hàng nghìn module mà cấu hình gọn của Thermo không có. ' +
          '<code>make source</code> tải riêng trước (tarball nhánh kernel của Raspberry Pi nặng <b>246 852 085 B</b>) để mạng chập ' +
          'chờn không giết một lần build dài, như Bài 60 đã dặn. Thời gian trên máy bạn sẽ khác. Xem Buildroot làm ra gì:' },
        { t: 'code', where: 'wsl', code:
          'ls images/ images/rpi-firmware/\n' +
          '/sbin/fdisk -l images/sdcard.img | tail -n 3' },
        { t: 'code', where: 'out', nocopy: true, code:
          'images/:\n' +
          'bcm2710-rpi-zero-2-w.dtb\nboot.vfat\ngenimage.cfg\nImage\nrootfs.ext2\nrootfs.ext4\nrpi-firmware\nsdcard.img\n\n' +
          'images/rpi-firmware/:\n' +
          'bootcode.bin\ncmdline.txt\nconfig.txt\nfixup.dat\noverlays\nstart.elf\n' +
          'Device             Boot Start    End Sectors  Size Id Type\n' +
          'images/sdcard.img1 *        1  65536   65536   32M  c W95 FAT32 (LBA)\n' +
          'images/sdcard.img2      65537 311296  245760  120M 83 Linux',
          notes: ['Bản chụp này lấy qua một ống dẫn nên <code>ls</code> in mỗi tên một dòng; trong terminal của bạn ' +
            'các tên sẽ xếp thành cột.'] },
        { t: 'p', x: 'So với <code>disk.img</code> của Thermo, có hai khác biệt chỉ thuộc về Raspberry Pi. Phân vùng ' +
          'boot là <b>FAT32</b> (<code>Id c</code>), không phải ext4 — vì boot ROM trong GPU chỉ đọc được FAT. Và không ' +
          'có <code>u-boot.bin</code>: thay vào đó là <code>bootcode.bin</code> + <code>start.elf</code> + ' +
          '<code>fixup.dat</code>, firmware đóng của Broadcom (<code>start.elf</code> nặng 3 027 424 B). Firmware đọc ' +
          'hai file văn bản để biết phải làm gì:' },
        { t: 'code', where: 'wsl', code:
          'grep -v -E \'^#|^$\' images/rpi-firmware/config.txt\n' +
          'cat images/rpi-firmware/cmdline.txt' },
        { t: 'code', where: 'out', nocopy: true, code:
          'start_file=start.elf\n' +
          'fixup_file=fixup.dat\n' +
          'kernel=Image\n' +
          'disable_overscan=1\n' +
          'gpu_mem_256=100\n' +
          'gpu_mem_512=100\n' +
          'gpu_mem_1024=100\n' +
          'dtoverlay=miniuart-bt\n' +
          'arm_64bit=1\n' +
          'root=/dev/mmcblk0p2 rootwait console=tty1 console=ttyAMA0,115200' },
        { t: 'cmdx', title: 'config.txt và cmdline.txt — vai trò của U-Boot, viết bằng văn bản', rows: [
          ['<code>kernel=Image</code>', 'File kernel firmware nạp — tương đương <code>ext4load … Image</code> trong ' +
           'U-Boot.'],
          ['<code>arm_64bit=1</code>', 'Khởi động lõi ARM ở chế độ 64 bit. Thiếu dòng này, kernel ARM64 không chạy.'],
          ['<code>dtoverlay=miniuart-bt</code>', 'Firmware áp một <b>overlay</b> lên Device Tree trước khi giao cho kernel — ' +
           'đúng cơ chế <code>fdtoverlay</code> của Bài 43. Đọc nó ngay bên dưới.'],
          ['<code>gpu_mem_512=100</code>', 'Với board 512 MiB, nhường 100 MiB cho GPU. Linux chỉ thấy phần còn lại.'],
          ['<code>root=/dev/mmcblk0p2 rootwait</code>', 'Root là phân vùng 2 của thẻ SD. <code>rootwait</code>: đợi bộ ' +
           'điều khiển SD dò xong thẻ — thứ <code>/dev/vda</code> của QEMU không cần.'],
          ['<code>console=tty1 console=ttyAMA0,115200</code>', 'Hai console: màn hình HDMI và UART. Dòng cuối cùng ' +
           'là <code>/dev/console</code>, nên log và dấu nhắc login đi ra UART — sợi cáp của bạn.']
        ] },
        { t: 'p', x: 'Overlay <code>miniuart-bt</code> trả lời một câu hỏi mà QEMU chưa bao giờ đặt ra: SoC BCM2837 có ' +
          '<b>hai</b> UART, và trên Pi Zero 2 W cái tốt hơn (PL011) mặc định nối vào chip Bluetooth. Xem Device Tree ' +
          'gốc và overlay:' },
        { t: 'code', where: 'wsl', code:
          'fdtget images/bcm2710-rpi-zero-2-w.dtb / model\n' +
          'fdtget images/bcm2710-rpi-zero-2-w.dtb /aliases serial0\n' +
          'fdtget images/bcm2710-rpi-zero-2-w.dtb /soc/watchdog@7e100000 compatible\n' +
          'dtc -I dtb -O dts images/rpi-firmware/overlays/miniuart-bt.dtbo 2>/dev/null | grep -A7 \'target-path = "/aliases"\'' },
        { t: 'code', where: 'out', nocopy: true, code:
          'Raspberry Pi Zero 2 W\n' +
          '/soc/serial@7e215040\n' +
          'brcm,bcm2835-pm brcm,bcm2835-pm-wdt\n' +
          '\t\ttarget-path = "/aliases";\n\n' +
          '\t\t__overlay__ {\n' +
          '\t\t\tserial0 = "/soc/serial@7e201000";\n' +
          '\t\t\tserial1 = "/soc/serial@7e215040";\n' +
          '\t\t\tbluetooth = "/soc/serial@7e215040/bluetooth";\n' +
          '\t\t};\n' +
          '\t};' },
        { t: 'cal', kind: 'info', title: 'Một overlay đổi cả tên console',
          x: 'Trong DTB gốc, <code>serial0</code> — cổng trên chân GPIO14/15 — là <code>serial@7e215040</code>, mini ' +
             'UART, một khối đơn giản có tốc độ phụ thuộc xung nhịp GPU. Fragment trên của overlay ghi đè ' +
             '<code>/aliases</code>: <code>serial0</code> thành <code>serial@7e201000</code>, tức PL011 — <b>cùng loại ' +
             'UART với <code>ttyAMA0</code> của QEMU</b> — và đẩy mini UART sang Bluetooth. Đó là lý do ' +
             '<code>cmdline.txt</code> dám viết <code>console=ttyAMA0</code>. Bài 43 dạy overlay bằng ví dụ tự chế; ' +
             'đây là một overlay thật mà mỗi chiếc Pi áp ở mỗi lần boot. Dòng thứ ba là watchdog của board: đúng ' +
             '<code>compatible</code> trong phần lý thuyết, driver <code>BCM2835_WDT</code> đã bật trong kernel này.' },
        { t: 'cal', kind: 'warn', title: 'Bước ghi thẻ không được kiểm chứng ở đây',
          x: 'Máy viết bài không có board và đầu đọc thẻ, nên bài không in output cho bước này. Cách được Raspberry Pi ' +
             'khuyến nghị trên Windows: mở <b>Raspberry Pi Imager</b>, chọn <i>Use custom</i> rồi chọn ' +
             '<code>sdcard.img</code> (chép nó ra ổ Windows trước, ví dụ <code>cp images/sdcard.img /mnt/c/Users/…</code>). ' +
             'Cắm cáp UART theo hình ở phần lý thuyết, mở picocom ở Bước 2, rồi mới cắm nguồn. Dấu hiệu đúng: dòng ' +
             '<code>Booting Linux</code> có <code>Machine model: Raspberry Pi Zero 2 W</code> và kernel ' +
             '<code>6.12.61-v8</code> (đọc từ <code>build/linux-custom/include/config/kernel.release</code>), kết thúc ' +
             'bằng <code>buildroot login:</code> — user <code>root</code>, không mật khẩu, đúng như Bài 68 đã cảnh báo.' }
      ] },

      { title: 'Đóng gói Thermo thành một repo portfolio', blocks: [
        { t: 'p', x: 'Kết quả của Chặng 13 theo lộ trình là "một dự án đầy đủ trên GitHub". Toàn bộ Thermo — thứ người ' +
          'phỏng vấn sẽ mở ra xem — là cây br2-external của Bài 69: chỉ 240 KiB. Chép nó ra một chỗ mới và kiểm tra ' +
          'hai thứ trước khi để ai nhìn thấy:' },
        { t: 'code', where: 'wsl', code:
          'cp -a ~/bai69/thermo ~/bai70/thermo && cd ~/bai70/thermo\n' +
          'grep -rl "PRIVATE KEY" . ; echo "rc=$?"\n' +
          'grep -rn \'bai6[0-9]\' .' },
        { t: 'code', where: 'out', nocopy: true, code:
          'rc=1\n' +
          './release.sh:5:OUT=${OUT:-$HOME/bai67/out}\n' +
          './release.sh:7:DIR=$HOME/bai67/release/$NAME\n' +
          './README.md:19:    make O=$HOME/bai67/out BR2_EXTERNAL=$HOME/bai67/thermo thermo_defconfig\n' +
          './README.md:20:    cd $HOME/bai67/out && make' },
        { t: 'p', x: '<code>rc=1</code> của <code>grep</code> là tin tốt: <b>không</b> file nào chứa khoá bí mật — kỷ ' +
          'luật của Bài 68 (khoá ở <code>~/bai68/keys</code>, ngoài cây) đã giữ được qua cả Bài 69. Lệnh thứ hai tìm ' +
          'ra bốn dòng còn dính đường dẫn của khoá học (<code>~/bai67</code>). Chúng chạy được trên máy bạn, nhưng ' +
          'trên máy người khác thì không. Sửa bằng <code>nano</code>: trong <code>README.md</code> viết ' +
          '<code>O=../thermo-out</code> và <code>BR2_EXTERNAL=$PWD/../thermo</code> kèm một câu nói cây Buildroot ' +
          '2026.02.3 cần nằm cạnh; trong <code>release.sh</code> cho <code>DIR</code> mặc định theo ' +
          '<code>$OUT</code>. Rồi biến nó thành một repo Git:' },
        { t: 'code', where: 'wsl', code:
          'git init -q && git add . && git commit -q -m "Thermo: Buildroot external tree"\n' +
          'git ls-files | wc -l\n' +
          'git log --oneline' },
        { t: 'code', where: 'out', nocopy: true, code:
          '37\n' +
          '53a7e55 Thermo: Buildroot external tree',
          notes: ['Mã commit <code>53a7e55</code> phụ thuộc tên, email và thời điểm commit — trên máy bạn chắc chắn ' +
            'khác. Máy viết bài còn in thêm vài dòng <code>hint:</code> về hook Git riêng của máy công ty; đã lược.'] },
        { t: 'p', x: '<b>37</b> file — đúng số file của Thermo Bài 69 — và không file nào là sản phẩm build: ' +
          '<code>out/</code>, <code>dl/</code>, khoá đều nằm ngoài cây. Đó là điều người phỏng vấn nhìn đầu tiên: một ' +
          'repo nhỏ, đọc được, và một lệnh <code>make</code> dựng lại mọi thứ. Thêm vào README trước khi đẩy lên GitHub ' +
          '(bạn đã biết Git, phần này tự làm):' },
        { t: 'list', items: [
          'Sơ đồ kiến trúc từ dưới lên — bạn có thể dùng lại bảng tầng ở đầu bài này.',
          'Một mục "Đã đo": thời gian build, kích thước <code>disk.img</code>, kết quả ba thí nghiệm rollback của Bài 69.',
          'Một mục "Giới hạn": chạy trên QEMU, khoá phát triển, chưa có <code>dm-verity</code>, chưa có watchdog — ' +
            'trung thực là điểm cộng, như đã nói ở phần phỏng vấn.',
          'Cách chạy: <code>run-qemu.sh</code> của Bài 67 và cổng TCP để thử <code>temp_daemon</code>.'
        ] }
      ] }
    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },
    { t: 'table', head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>FATAL: cannot open /dev/ttyUSB0: No such file or directory</code>', 'Cáp chưa được ' +
         '<code>usbipd attach</code> (hoặc đã rút ra cắm lại), hoặc chip của cáp không có driver trong kernel WSL',
         '<code>usbipd list</code> phía Windows phải báo <code>Attached</code>; trong WSL xem ' +
         '<code>dmesg | tail</code>. Cáp PL2303: đổi sang CP2102/CH340/FT232'],
        ['<code>FATAL: cannot open /dev/ttyS0: Permission denied</code>', 'User không thuộc nhóm <code>dialout</code>',
         '<code>sudo usermod -aG dialout $USER</code>, rồi <code>wsl --shutdown</code> và mở lại'],
        ['Màn hình picocom đầy ký tự rác', 'Sai tốc độ baud (hoặc nối nhầm vào chân 5 V)', '<code>-b 115200</code> theo ' +
         '<code>console=…,115200</code>; kiểm tra lại mức điện áp của cáp'],
        ['picocom mở được nhưng không thấy gì', 'TX/RX không bắt chéo, thiếu dây GND, hoặc board chưa cấp nguồn',
         'Đổi chỗ hai dây TX/RX; nối GND; board phải có nguồn riêng'],
        ['Log trong picocom bắt đầu giữa chừng (ví dụ từ <code>[    0.585506]</code>)', 'Mở picocom sau khi máy đã ' +
         'chạy — gặp thật khi kiểm chứng bài này, lúc quên đợi picocom sẵn sàng trước khi <code>cont</code>',
         'QEMU: dùng <code>-S</code> và chỉ <code>cont</code> sau <code>Terminal ready</code>. Board thật: mở picocom ' +
         'trước, cắm nguồn sau'],
        ['<code>ls: /dev/watchdog*: No such file or directory</code> dù <code>insmod</code> báo ' +
         '<code>initialized</code>', 'initramfs của Bài 32 không mount <code>devtmpfs</code> — gặp thật khi kiểm chứng',
         '<code>mount -t devtmpfs none /dev</code> trước khi nạp driver'],
        ['Máy ảo khởi động lại liên tục sau khoảng 10 s', 'Watchdog đã bật mà không ai nạp — đúng thiết kế',
         'Thoát QEMU bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>X</kbd>; trên board, chạy chương trình nạp sớm trong init'],
        ['<code>nowayout prevents watchdog being stopped!</code>', 'Driver nạp với <code>nowayout=1</code> (hoặc kernel ' +
         'có <code>CONFIG_WATCHDOG_NOWAYOUT=y</code>)', 'Không phải lỗi: trên sản phẩm đó là điều bạn muốn. Khi phát ' +
         'triển, nạp với <code>nowayout=0</code>'],
        ['Buildroot dừng ngay: <code>Your PATH contains spaces</code>', '<code>PATH</code> của WSL chứa ' +
         '<code>/mnt/c/Program Files/…</code> (Bài 60)', '<code>export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:' +
         '/usr/bin:/sbin:/bin</code> trước <code>make</code>']
      ] },

    { t: 'recap', items: [
      'Khi rời QEMU, <b>ba</b> thứ đổi hẳn — firmware/chuỗi boot, <b>Device Tree</b>, chân nối — còn rootfs, BusyBox, ' +
        'toolchain, daemon và cấu trúc br2-external giữ nguyên.',
      '<b>Kernel của hãng</b> có driver sớm nhưng chậm theo mainline; đọc <code>VERSION_VALUE</code> hay ' +
        '<code>TARBALL_LOCATION</code> trong defconfig là biết board đứng phía nào.',
      'Cáp <b>USB–UART 3,3 V</b>, ba dây GND/TX/RX, <b>TX↔RX bắt chéo</b>, không nối VCC; console ' +
        '<b>115200 8N1</b>.',
      'WSL không có USB thật: <b>usbipd-win</b> gửi gói USB qua <b>USB/IP</b> tới <code>vhci_hcd</code>; kernel WSL ' +
        '<b>5.15.167.4</b> có <code>cp210x</code>/<code>ch341</code>/<code>ftdi_sio</code> nhưng <b>không</b> có ' +
        '<code>pl2303</code>; user cần nhóm <code>dialout</code>.',
      '<code>picocom</code> mở một UART như một file; <code>rx:55</code> trong <code>/proc/tty/driver/ttyAMA</code> ' +
        'đúng bằng số byte bạn gõ. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>Ctrl</kbd>+<kbd>X</kbd>.',
      '<b>Watchdog</b>: mở = bật, ghi = nạp, <code>V</code> + đóng = dừng, <code>nowayout</code> = không bao giờ dừng. ' +
        'Không ai nạp → reset sau khoảng <b>10,6 s</b> với <code>heartbeat=10</code>.',
      'Pi Zero 2 W build trong <b>18 phút</b>: FAT32 boot + firmware đóng thay U-Boot, <code>config.txt</code>/' +
        '<code>cmdline.txt</code>, và overlay <code>miniuart-bt</code> đổi <code>serial0</code> sang PL011.',
      'Phỏng vấn: <b>định nghĩa → cơ chế → con số của bạn</b>; Thermo là một repo <b>37</b> file, không khoá bí mật, ' +
        'một lệnh <code>make</code> dựng lại tất cả.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Đây là bài cuối của lộ trình — không còn Bài 71. Việc tiếp theo nằm trên bàn của bạn: khi Pi Zero 2 W về, ' +
         'ghi <code>sdcard.img</code> của Bước 4 và kiểm chứng dòng <code>Machine model: Raspberry Pi Zero 2 W</code> ' +
         'qua chính sợi cáp UART bạn vừa học cách nối. Rồi chuyển Thermo sang board: viết một <code>thermo.dts</code> ' +
         'mới từ <code>bcm2710-rpi-zero-2-w.dts</code>, thay node giả <code>learn,temp-sensor</code> bằng một cảm biến ' +
         'I2C thật theo Bài 58, cho <code>temp_daemon</code> nạp watchdog <code>BCM2835_WDT</code> sau mỗi lần đọc ' +
         'thành công, và đo lại thời gian boot theo Bài 66 — lần này trên phần cứng thật. Mỗi con số mới bạn đo được ' +
         'là một câu trả lời phỏng vấn mới.' }
  ],

  quiz: [
    { q: 'Bạn cắm cáp USB–UART, <code>usbipd attach</code> báo thành công, <code>lsusb</code> trong WSL thấy thiết bị ' +
         '<code>067b:2303</code>, nhưng không có <code>/dev/ttyUSB0</code>. Nguyên nhân khả dĩ nhất?',
      opts: ['User chưa thuộc nhóm <code>dialout</code>',
             'Cáp dùng chip Prolific PL2303 và kernel WSL không build driver <code>pl2303</code>',
             'Sai tốc độ baud', 'TX và RX chưa bắt chéo'],
      a: 1,
      why: '<code>067b:2303</code> là VID:PID của PL2303. Thiết bị đã tới được WSL (có trong <code>lsusb</code>), nhưng ' +
           'không alias nào khớp vì <code># CONFIG_USB_SERIAL_PL2303 is not set</code> — không driver thì không có ' +
           '<code>ttyUSB0</code>. Thiếu <code>dialout</code> cho <code>Permission denied</code> chứ không làm mất file; ' +
           'baud và dây TX/RX chỉ ảnh hưởng dữ liệu sau khi đã mở được cổng.' },
    { q: 'Cách nối nào đúng giữa cáp USB–UART 3,3 V và một Pi Zero 2 W đang cắm nguồn riêng?',
      opts: ['TX↔TX, RX↔RX, GND↔GND, VCC↔5V', 'TX cáp → RX board, RX cáp ← TX board, GND↔GND, không nối VCC',
             'TX cáp → RX board, RX cáp ← TX board, không cần GND', 'Chỉ cần TX cáp → RX board và GND'],
      a: 1,
      why: 'Tín hiệu đi từ chân phát của bên này vào chân thu của bên kia, nên TX/RX bắt chéo. GND chung là mốc điện áp ' +
           'để hai bên hiểu nhau. VCC để trống vì board đã có nguồn — nối thêm là đấu hai nguồn vào nhau. Chỉ nối một ' +
           'chiều thì đọc được log nhưng không gõ lệnh được.' },
    { q: 'Một chương trình mở <code>/dev/watchdog</code>, nạp đều mỗi 2 s, rồi bị <code>kill -9</code>. Driver nạp với ' +
         '<code>heartbeat=10 nowayout=0</code>. Điều gì xảy ra?',
      opts: ['Không gì cả, vì <code>nowayout=0</code> cho phép dừng watchdog',
             'Kernel đóng file không có <code>V</code>, in <code>watchdog did not stop!</code>, và máy reset sau khoảng 10 s',
             'Kernel panic ngay lập tức', 'Watchdog dừng vì file đã đóng'],
      a: 1,
      why: '<code>nowayout=0</code> chỉ có nghĩa là <i>có thể</i> dừng bằng magic close. <code>kill -9</code> không cho ' +
           'chương trình ghi <code>V</code>, nên watchdog core coi đó là chương trình nạp đã chết: nạp một lần cuối rồi ' +
           'để bộ đếm chạy. Bước 3 đo được reset sau 10,58–10,60 s. Đây đúng là trường hợp watchdog sinh ra để bắt.' },
    { q: 'Vì sao ảnh thẻ nhớ của Pi Zero 2 W có phân vùng boot là FAT32 và không có <code>u-boot.bin</code>?',
      opts: ['Vì Buildroot không hỗ trợ U-Boot cho Raspberry Pi',
             'Vì firmware trong GPU chỉ đọc được FAT, và chính <code>start.elf</code> nạp kernel theo ' +
             '<code>config.txt</code>',
             'Vì kernel ARM64 chỉ boot được từ FAT32', 'Vì ext4 không ghi được lên thẻ SD'],
      a: 1,
      why: 'Chuỗi boot của Pi bắt đầu trong GPU: boot ROM đọc <code>bootcode.bin</code> từ phân vùng FAT, rồi ' +
           '<code>start.elf</code> đọc <code>config.txt</code> và <code>cmdline.txt</code>, áp overlay và nạp ' +
           '<code>kernel=Image</code>. Firmware đó làm luôn việc của U-Boot. Thêm U-Boot vẫn được (khi cần FIT có chữ ' +
           'ký như Bài 68), nhưng defconfig mặc định không cần.' },
    { q: 'Trong Bước 2, <code>/proc/tty/driver/ttyAMA</code> báo <code>rx:55</code>. Con số đó đếm cái gì?',
      opts: ['Số dòng log kernel', 'Số byte bạn gõ vào picocom, gồm cả phím Enter',
             'Số ngắt UART', 'Số byte QEMU gửi ra pty'],
      a: 1,
      why: 'Nhìn từ phía máy ảo, UART <b>nhận</b> (rx) chính là những gì bạn gõ: <code>uname -m⏎</code> (9) + ' +
           '<code>cat /proc/cmdline⏎</code> (18) + <code>cat /proc/tty/driver/ttyAMA⏎</code> (28) = 55. Đếm được đến ' +
           'từng byte là cách kiểm chứng một kênh nối tiếp — trên board thật, <code>rx</code> đứng yên khi bạn gõ ' +
           'nghĩa là dây RX của board chưa nhận được gì.' },
    { q: 'Người phỏng vấn hỏi: "spinlock và mutex khác nhau thế nào?". Câu trả lời nào theo đúng công thức của bài?',
      opts: ['"Spinlock nhanh hơn mutex."',
             '"Spinlock quay chờ và không được ngủ nên dùng được trong ngắt; mutex ngủ chờ, chỉ dùng ở ngữ cảnh tiến ' +
             'trình. Tôi đã đo hai kthread trên <code>-smp 2</code>: spinlock 257 ms, mutex 393 ms, không khoá 21 ms ' +
             'nhưng mất hàng trăm nghìn lần tăng."',
             '"Mutex là spinlock có thêm hàng đợi."', '"Tôi luôn dùng mutex cho an toàn."'],
      a: 1,
      why: 'Định nghĩa (quay chờ vs ngủ chờ), cơ chế và hệ quả (được dùng trong ngắt hay không), rồi con số bạn tự đo ' +
           'ở Bài 56. Câu thứ nhất sai một nửa — mutex có thể nhanh hơn khi phải chờ lâu — và cả ba câu còn lại không ' +
           'cho người phỏng vấn biết bạn đã từng thấy nó chạy.' }
  ]
});

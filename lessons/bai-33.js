/* Bài 33 — Nhiệm vụ của bootloader
   Chặng 06 — Bootloader U-Boot
   Mở đầu chặng: bootloader làm gì, vì sao cần nó, hợp đồng bàn giao ARM64,
   header 64 byte của Image, và sáu lệnh máy QEMU tự sinh ra khi dùng -kernel. */

Lesson.register({
  id: 'bai-33',
  title: 'Nhiệm vụ của bootloader',
  minutes: 60,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Ở <b>Bài 32</b> bạn boot một kernel Linux thật trong QEMU và đọc trọn vẹn log khởi động. ' +
    'Nhưng có một đoạn bạn chưa từng nhìn thấy: từ lúc CPU nhận điện đến lúc dòng log đầu tiên ' +
    'hiện ra, ai đã bật DRAM, ai đã đặt <code>Image</code> vào đúng địa chỉ, ai đã nói cho kernel ' +
    'biết máy này có bao nhiêu RAM? Suốt <b>Chặng 05</b>, QEMU đã âm thầm đóng vai đó cho bạn — ' +
    'nó tự sinh ra một bootloader tí hon <b>sáu lệnh máy</b> và nhét vào RAM. Bài này mở ' +
    '<b>Chặng 06</b> bằng cách nhìn thẳng vào sáu lệnh đó, đọc 64 byte đầu của <code>Image</code> ' +
    'để biết kernel đòi hỏi những gì, và cố tình <b>phá vỡ hợp đồng bàn giao</b> để thấy hậu quả: ' +
    'không phải một thông báo lỗi, mà là im lặng tuyệt đối.',

  goals: [
    'Kể được bốn nhiệm vụ bắt buộc mà mọi bootloader phải làm xong trước khi trao quyền cho kernel',
    'Đọc và giải mã 64 byte header của một file <code>Image</code> ARM64 bằng <code>xxd</code> và <code>od</code>',
    'Phát biểu chính xác hợp đồng bàn giao của ARM64: <code>x0</code> giữ gì, <code>x1</code>–<code>x3</code> phải bằng gì, MMU và D-cache ở trạng thái nào',
    'Đọc được sáu lệnh máy QEMU tự sinh khi bạn dùng <code>-kernel</code>, và chỉ ra lệnh nào làm nhiệm vụ gì',
    'Giải thích vì sao phải boot nhiều tầng (SPL/TPL) và vì sao tầng đầu phải chạy trong SRAM chứ không phải DRAM',
    'Chẩn đoán được triệu chứng "boot im lặng, không một ký tự nào" là hỏng ở khâu bàn giao, không phải hỏng kernel'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Khoảng trống giữa lúc cấp điện và dòng log đầu tiên
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Khoảng trống giữa lúc cấp điện và dòng log đầu tiên' },

    { t: 'p', x:
      'Ở Bài 32, dòng đầu tiên bạn thấy trên màn hình là <code>Booting Linux on physical CPU ' +
      '0x0000000000 [0x000f0510]</code>. Nhưng đó không phải việc đầu tiên máy làm — đó là ' +
      'việc đầu tiên <b>kernel</b> làm. Trước dòng đó, trên một board thật, đã có hàng chục ' +
      'nghìn lệnh máy chạy qua rồi.' },

    { t: 'p', x:
      'Lý do khoảng trống đó tồn tại rất đơn giản và rất phũ phàng: <b>lúc CPU vừa nhận điện, ' +
      'gần như không có gì hoạt động.</b> DRAM chưa được cấp xung, chưa được hiệu chỉnh — ghi ' +
      'vào nó thì dữ liệu sai hoặc mất. Các bộ chia xung (PLL) còn ở tần số mặc định thấp nhất. ' +
      'Bộ điều khiển UART chưa được cấu hình nên có <code>printf</code> cũng không ai nghe. Ổ ' +
      'eMMC/SD chưa được khởi tạo nên kernel còn nằm nguyên trên thẻ nhớ, chưa ai đọc ra.' },

    { t: 'p', x:
      'Kernel Linux <b>không tự làm được những việc này</b>. Nó được viết với giả định rằng khi ' +
      'lệnh đầu tiên của nó chạy, nó đã nằm sẵn trong DRAM đang hoạt động ổn định. Ai đó phải ' +
      'dựng sân khấu trước. Người đó là <b>bootloader</b>.' },

    { t: 'fig',
      cap: 'Chuỗi khởi động nhiều tầng trên một SoC ARM64 thật. Mỗi tầng chỉ có một nhiệm vụ: ' +
           'làm cho tầng sau có đủ điều kiện để chạy. Tầng càng sớm càng nhỏ và càng bị giới hạn bộ nhớ.',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" ' +
        'aria-label="Chuỗi khởi động: cấp điện, BootROM trong SoC, SPL trong SRAM, U-Boot trong DRAM, kernel Linux">' +
        '<rect class="d-box" x="4" y="46" width="96" height="54" rx="6"/>' +
        '<text class="d-t" x="52" y="70" text-anchor="middle">Cấp điện</text>' +
        '<text class="d-ts" x="52" y="88" text-anchor="middle">Power-on Reset</text>' +

        '<rect class="d-box-a" x="118" y="46" width="132" height="54" rx="6"/>' +
        '<text class="d-t" x="184" y="66" text-anchor="middle">BootROM</text>' +
        '<text class="d-ts" x="184" y="82" text-anchor="middle">nằm trong SoC</text>' +
        '<text class="d-ts" x="184" y="95" text-anchor="middle">nhà sản xuất ghi, không sửa được</text>' +

        '<rect class="d-box-p" x="268" y="46" width="132" height="54" rx="6"/>' +
        '<text class="d-t" x="334" y="66" text-anchor="middle">SPL</text>' +
        '<text class="d-ts" x="334" y="82" text-anchor="middle">chạy trong SRAM</text>' +
        '<text class="d-tm" x="334" y="95" text-anchor="middle">32–256 KB</text>' +

        '<rect class="d-box-p" x="418" y="46" width="132" height="54" rx="6"/>' +
        '<text class="d-t" x="484" y="66" text-anchor="middle">U-Boot</text>' +
        '<text class="d-ts" x="484" y="82" text-anchor="middle">chạy trong DRAM</text>' +
        '<text class="d-tm" x="484" y="95" text-anchor="middle">~1,4 MB</text>' +

        '<rect class="d-box-g" x="568" y="46" width="148" height="54" rx="6"/>' +
        '<text class="d-t" x="642" y="70" text-anchor="middle">Kernel Linux</text>' +
        '<text class="d-ts" x="642" y="88" text-anchor="middle">dòng log đầu tiên</text>' +

        '<line class="d-line" x1="100" y1="73" x2="112" y2="73"/>' +
        '<path class="d-arrow" d="M118 73 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="250" y1="73" x2="262" y2="73"/>' +
        '<path class="d-arrow" d="M268 73 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="400" y1="73" x2="412" y2="73"/>' +
        '<path class="d-arrow" d="M418 73 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="550" y1="73" x2="562" y2="73"/>' +
        '<path class="d-arrow" d="M568 73 l-8 -4 v8 z"/>' +

        '<text class="d-ts" x="184" y="126" text-anchor="middle">tìm và nạp tầng sau</text>' +
        '<text class="d-ts" x="334" y="126" text-anchor="middle">bật DRAM</text>' +
        '<text class="d-ts" x="484" y="126" text-anchor="middle">nạp kernel + DTB</text>' +

        '<line class="d-line" x1="118" y1="150" x2="716" y2="150"/>' +
        '<text class="d-ts" x="417" y="170" text-anchor="middle">Toàn bộ đoạn này chạy xong trước khi kernel in ra ký tự đầu tiên</text>' +
        '<text class="d-ts" x="417" y="190" text-anchor="middle">Nếu một tầng hỏng, màn hình im lặng tuyệt đối — không có thông báo lỗi nào cả</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Trong QEMU, hai tầng đầu không tồn tại',
      x: 'Máy ảo <code>virt</code> không có BootROM và không cần SPL: RAM của máy ảo <b>luôn ' +
         'sẵn sàng</b> ngay từ lệnh đầu tiên, vì nó chỉ là một mảng byte trong tiến trình QEMU ' +
         'trên máy bạn. Đó là lý do suốt Chặng 05 bạn boot được kernel mà chưa cần biết ' +
         'bootloader là gì. Điều này rất tiện để học, nhưng cũng che mất phân nửa bức tranh — ' +
         'bài này gỡ lớp che đó ra.' },

    /* ══════════════════════════════════════════════════════════════════
       2. Bốn nhiệm vụ bắt buộc
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Bốn nhiệm vụ bắt buộc của một bootloader' },

    { t: 'p', x:
      'U-Boot có hàng nghìn lệnh, hàng trăm driver, cả một shell riêng. Nhưng nếu bỏ hết phần ' +
      'tiện nghi đi, cái lõi không thể bỏ chỉ gồm <b>bốn việc</b>. Mọi bootloader — U-Boot, ' +
      'barebox, RedBoot, hay đoạn mã sáu lệnh mà QEMU tự sinh — đều làm đúng bốn việc này:' },

    { t: 'table',
      head: ['#', 'Nhiệm vụ', 'Cụ thể là làm gì', 'Bỏ qua thì sao'],
      rows: [
        ['1', '<b>Khởi tạo phần cứng tối thiểu</b>',
         'Cấu hình PLL/clock, cấp nguồn cho các khối, <b>hiệu chỉnh và bật DRAM controller</b>, ' +
         'bật một cổng UART để có console',
         'Không có RAM dùng được → không nạp nổi kernel vào đâu cả'],
        ['2', '<b>Tìm và nạp kernel + DTB vào RAM</b>',
         'Đọc <code>Image</code> từ eMMC/SD/NAND/mạng và chép vào một địa chỉ RAM hợp lệ; ' +
         'đọc luôn file <code>.dtb</code> mô tả phần cứng',
         'CPU nhảy vào một vùng RAM chưa có mã lệnh → treo ngay'],
        ['3', '<b>Chuẩn bị đúng trạng thái CPU</b>',
         'Tắt MMU, tắt D-cache, đặt <code>x0</code> = địa chỉ DTB, đặt <code>x1</code>=' +
         '<code>x2</code>=<code>x3</code>=0, ở đúng exception level',
         'Kernel đọc rác thay vì đọc DTB → chết trước khi kịp in gì'],
        ['4', '<b>Nhảy vào kernel và biến mất</b>',
         'Nhảy tới byte đầu tiên của <code>Image</code> trong RAM; từ giây đó bootloader ' +
         '<b>không còn tồn tại</b> — RAM của nó sẽ bị kernel ghi đè',
         'Không có gì chạy tiếp']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao kernel không tự khởi tạo DRAM cho gọn?',
      x: 'Vì <b>kernel phải nằm trong DRAM thì mới chạy được</b>, mà DRAM lại chưa hoạt động — ' +
         'đó là một vòng luẩn quẩn kinh điển. Muốn phá vòng, đoạn mã bật DRAM phải chạy ở một ' +
         'nơi <i>không phải</i> DRAM. Chỗ duy nhất còn lại là <b>SRAM</b> nằm ngay trong SoC: ' +
         'nhanh, không cần hiệu chỉnh, dùng được ngay khi có điện, nhưng bé tí — thường chỉ ' +
         '32–256 KB. Kernel Linux nén lại vẫn hàng chục MB, không có cách nào nhét vừa. ' +
         'Thêm một lý do nữa: trình tự hiệu chỉnh DRAM <b>khác nhau theo từng board</b>, phụ ' +
         'thuộc con chip DDR nào, dài bao nhiêu đường mạch, chạy ở tần số nào. Nhét toàn bộ ' +
         'tri thức đó vào kernel là bắt kernel biết trước mọi board trên đời.' },

    { t: 'cal', kind: 'tip', title: 'Bốn nhiệm vụ, một câu để nhớ',
      x: '<b>"Bật RAM · Nạp file · Dọn thanh ghi · Nhảy rồi biến mất."</b> Đây là nguyên lý, ' +
         'không phải cú pháp — đáng nhớ thuộc. Mọi lệnh U-Boot bạn gõ trong bốn bài tới đều ' +
         'rơi vào đúng một trong bốn ô này, và mọi lỗi boot bạn gặp đời thực đều là một trong ' +
         'bốn ô này hỏng.' },

    /* ══════════════════════════════════════════════════════════════════
       3. Vì sao phải boot nhiều tầng — SPL và TPL
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Vì sao phải boot nhiều tầng: SPL và TPL' },

    { t: 'p', x:
      'Ô số 1 trong bảng trên đẻ ra một hệ quả kiến trúc mà bạn sẽ gặp lại ở mọi board thật. ' +
      'U-Boot đầy đủ nặng khoảng <b>1,4 MB</b> — bạn sẽ tự đo con số này ở Bài 34. SRAM trong ' +
      'SoC chỉ có <b>32–256 KB</b>. U-Boot đầy đủ không bao giờ nhét vừa SRAM, mà DRAM thì lại ' +
      'chưa bật. Lối thoát là <b>cắt U-Boot làm hai</b>:' },

    { t: 'terms', items: [
      ['SPL', 'Secondary Program Loader',
       'Bản U-Boot rút gọn tối đa, thường 20–60 KB, biên dịch từ <i>cùng một cây mã nguồn</i> ' +
       'nhưng bật rất ít <code>CONFIG_</code>. Chạy trong SRAM. Chỉ làm đúng hai việc: bật DRAM, ' +
       'rồi nạp U-Boot đầy đủ vào DRAM và nhảy sang.'],
      ['TPL', 'Tertiary Program Loader',
       'Một tầng còn nhỏ hơn SPL, dùng khi SRAM bé đến mức SPL cũng không vừa. Hiếm — trong ' +
       'toàn bộ U-Boot chỉ <b>41</b> board dùng tới nó.'],
      ['BootROM', '—',
       'Mã do nhà sản xuất chip ghi cứng trong SoC, không sửa được. Nó chỉ biết đọc vài KB đầu ' +
       'từ một nguồn cố định (SD, eMMC, UART, USB) và nhảy vào đó. Đây là mắt xích đầu tiên và ' +
       'là thứ duy nhất bạn không kiểm soát được.'],
      ['Falcon mode', '—',
       'Chế độ cho SPL nạp <i>thẳng</i> kernel, bỏ qua U-Boot đầy đủ. Đổi sự linh hoạt lấy vài ' +
       'trăm mili-giây thời gian boot. Dùng trong các sản phẩm cần bật lên là chạy ngay.']
    ] },

    { t: 'p', x:
      'Đây không phải trường hợp cá biệt. Trong <b>1 522</b> file <code>defconfig</code> của ' +
      'U-Boot v2026.07, có <b>546</b> file bật <code>CONFIG_SPL=y</code> — hơn một phần ba. ' +
      'Bạn sẽ tự đếm con số này ở Bài 34 bằng một lệnh <code>grep</code>.' },

    { t: 'fig',
      cap: 'Bài toán con gà và quả trứng của khởi động, và cách SPL phá vòng: tầng đủ nhỏ để ' +
           'nằm trong SRAM sẽ đi bật DRAM cho tầng lớn.',
      svg:
        '<svg viewBox="0 0 720 216" width="720" role="img" ' +
        'aria-label="So sánh SRAM nhỏ luôn sẵn sàng với DRAM lớn cần hiệu chỉnh, và vai trò của SPL">' +
        '<rect class="d-box-p" x="4" y="30" width="220" height="106" rx="6"/>' +
        '<text class="d-t" x="114" y="52" text-anchor="middle">SRAM trong SoC</text>' +
        '<text class="d-ts" x="114" y="72" text-anchor="middle">Dùng được ngay khi có điện</text>' +
        '<text class="d-ts" x="114" y="90" text-anchor="middle">Không cần hiệu chỉnh</text>' +
        '<text class="d-tm" x="114" y="112" text-anchor="middle">32–256 KB</text>' +
        '<text class="d-ts" x="114" y="128" text-anchor="middle">→ chỉ SPL nhét vừa</text>' +

        '<rect class="d-box-w" x="496" y="30" width="220" height="106" rx="6"/>' +
        '<text class="d-t" x="606" y="52" text-anchor="middle">DRAM ngoài SoC</text>' +
        '<text class="d-ts" x="606" y="72" text-anchor="middle">Phải hiệu chỉnh mới dùng được</text>' +
        '<text class="d-ts" x="606" y="90" text-anchor="middle">Trình tự khác nhau từng board</text>' +
        '<text class="d-tm" x="606" y="112" text-anchor="middle">512 MB – vài GB</text>' +
        '<text class="d-ts" x="606" y="128" text-anchor="middle">→ chứa được U-Boot và kernel</text>' +

        '<rect class="d-box-a" x="256" y="46" width="208" height="42" rx="6"/>' +
        '<text class="d-t" x="360" y="64" text-anchor="middle">SPL chạy ở đây</text>' +
        '<text class="d-ts" x="360" y="80" text-anchor="middle">và đi bật DRAM bên phải</text>' +

        '<line class="d-line" x1="224" y1="67" x2="248" y2="67"/>' +
        '<path class="d-arrow" d="M256 67 l-9 -4.5 v9 z"/>' +
        '<line class="d-line" x1="464" y1="67" x2="488" y2="67"/>' +
        '<path class="d-arrow" d="M496 67 l-9 -4.5 v9 z"/>' +

        '<line class="d-line" x1="4" y1="164" x2="716" y2="164"/>' +
        '<text class="d-ts" x="360" y="186" text-anchor="middle">Vòng luẩn quẩn: kernel cần DRAM để chạy — mã bật DRAM cũng cần một chỗ để chạy</text>' +
        '<text class="d-ts" x="360" y="204" text-anchor="middle">Phá vòng: làm cho mã bật DRAM đủ nhỏ để sống trong SRAM</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Board của bạn ở Chặng 06 không có SPL',
      x: '<code>qemu_arm64_defconfig</code> <b>không</b> bật <code>CONFIG_SPL</code>: máy ảo ' +
         '<code>virt</code> có RAM sẵn sàng nên không cần tầng nào đi bật DRAM cả. Vì vậy suốt ' +
         'chặng này bạn chỉ làm việc với U-Boot đầy đủ. Biết SPL tồn tại vẫn quan trọng: ngày ' +
         'bạn cầm một board i.MX hay Rockchip thật, thứ đầu tiên bạn phải flash vào SD chính là ' +
         'SPL, và thứ đầu tiên hỏng cũng thường là nó.' },

    /* ══════════════════════════════════════════════════════════════════
       4. Hợp đồng bàn giao ARM64
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Hợp đồng bàn giao: bootloader hứa gì với kernel' },

    { t: 'p', x:
      'Ô số 3 và số 4 trong bảng bốn nhiệm vụ là phần dễ sai nhất, vì nó không có thông báo lỗi. ' +
      'Kernel ARM64 không "hỏi" bootloader bất cứ điều gì lúc khởi động — nó <b>giả định</b>. ' +
      'Tất cả giả định đó được ghi thành văn bản trong chính cây mã nguồn kernel, file ' +
      '<code>Documentation/arch/arm64/booting.rst</code>, và đây là những điều khoản bắt buộc:' },

    { t: 'table',
      head: ['Điều khoản', 'Bootloader phải làm', 'Vì sao'],
      rows: [
        ['<code>x0</code>',
         'Chứa <b>địa chỉ vật lý của DTB</b> đã nằm sẵn trong RAM',
         'Đây là <i>toàn bộ</i> thông tin kernel nhận được về phần cứng: có bao nhiêu RAM, ' +
         'UART ở địa chỉ nào, có những thiết bị gì. Không có nó, kernel mù hoàn toàn.'],
        ['<code>x1</code>, <code>x2</code>, <code>x3</code>',
         'Phải bằng <b>0</b>',
         'Dành sẵn cho các phần mở rộng tương lai của giao thức. Kernel hiện tại kiểm tra ' +
         'chúng bằng 0 để biết mình đang nói chuyện với bootloader đúng chuẩn.'],
        ['MMU',
         '<b>Tắt</b>',
         'Kernel tự dựng bảng trang của riêng nó ngay từ đầu. Một bảng trang lạ còn bật sẽ ' +
         'làm mọi địa chỉ kernel tính ra đều trỏ sai chỗ.'],
        ['D-cache',
         '<b>Tắt</b>',
         'Nếu <code>Image</code> vừa được chép vào RAM mà còn kẹt trong cache chưa ghi xuống, ' +
         'CPU sẽ nạp lệnh từ RAM đọc ra rác. I-cache thì được phép bật.'],
        ['Địa chỉ nạp',
         'Căn <b>2 MB</b>, cộng thêm <code>text_offset</code> lấy từ header',
         'Kernel dựng bảng trang bằng khối 2 MB. Lệch một byte là toàn bộ ánh xạ lệch theo.'],
        ['Exception level',
         'EL2 (ưu tiên) hoặc EL1',
         'Vào ở EL2 thì kernel bật được KVM để chạy máy ảo. Vào ở EL1 vẫn boot bình thường ' +
         'nhưng mất tính năng đó.']
      ] },

    { t: 'cal', kind: 'warn', title: 'Vi phạm hợp đồng không báo lỗi — nó im lặng',
      x: 'Đây là điểm quan trọng nhất của cả bài, và là lý do hàng nghìn giờ đã bị đốt trên các ' +
         'diễn đàn embedded. Nếu <code>x0</code> sai, kernel <b>không</b> in ' +
         '<code>Invalid device tree</code>. Nó không in gì cả. Vì để in được một ký tự, kernel ' +
         'phải biết UART nằm ở địa chỉ nào — mà thông tin đó chỉ có trong DTB, thứ vừa mới hỏng. ' +
         'Ở phần thực hành bạn sẽ tự tạo ra sự im lặng đó và đo được nó: <b>0 dòng, 0 byte</b>. ' +
         'Nhớ luật này: <b>màn hình trắng trơn ⇒ nghi khâu bàn giao trước, đừng nghi kernel</b>.' },

    { t: 'h3', x: '64 byte đầu của file Image nói gì' },

    { t: 'p', x:
      'File <code>Image</code> không phải ELF (bạn kiểm chứng điều này ở Bài 32 bằng ' +
      '<code>file</code>). Nó là ảnh nhị phân thô, nhưng <b>64 byte đầu là một header có cấu ' +
      'trúc</b> mà bootloader đọc để biết phải nạp kernel vào đâu và kernel muốn gì. Cấu trúc ' +
      'này định nghĩa trong <code>arch/arm64/kernel/image.h</code> của kernel:' },

    { t: 'table',
      head: ['Offset', 'Trường', 'Kích thước', 'Ý nghĩa'],
      rows: [
        ['<code>0x00</code>', '<code>code0</code>', '4 B', 'Lệnh máy thật sự — cũng đóng vai chữ ký <code>MZ</code> của định dạng PE'],
        ['<code>0x04</code>', '<code>code1</code>', '4 B', 'Lệnh nhảy tới điểm vào thật của kernel'],
        ['<code>0x08</code>', '<code>text_offset</code>', '8 B', 'Kernel muốn được đặt lệch bao nhiêu byte so với đầu một khối RAM căn 2 MB'],
        ['<code>0x10</code>', '<code>image_size</code>', '8 B', 'Kernel sẽ chiếm bao nhiêu RAM khi chạy — <b>lớn hơn</b> kích thước file'],
        ['<code>0x18</code>', '<code>flags</code>', '8 B', 'Bit 0: endian. Bit 1–2: cỡ trang. Bit 3: được đặt tuỳ ý hay không'],
        ['<code>0x20</code>–<code>0x37</code>', 'dự phòng', '24 B', 'Luôn bằng 0'],
        ['<code>0x38</code>', '<code>magic</code>', '4 B', 'Luôn là <code>0x644d5241</code> = <code>"ARM\\x64"</code> — dấu hiệu nhận dạng'],
        ['<code>0x3c</code>', '<code>pe_offset</code>', '4 B', 'Vị trí bảng PE, để UEFI cũng nạp được file này']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao byte đầu tiên vừa là chữ ký vừa là lệnh máy?',
      x: 'Vì cùng một file <code>Image</code> phải nạp được bằng <b>hai đường hoàn toàn khác ' +
         'nhau</b>. UEFI đòi file bắt đầu bằng hai ký tự <code>MZ</code> mới chịu coi là ' +
         'chương trình. U-Boot thì chỉ nhảy thẳng vào byte số 0 và mong ở đó có lệnh máy. Kernel ' +
         'giải quyết bằng một mẹo đẹp: chọn đúng bốn byte <code>4d 5a 40 fa</code> — đọc như văn ' +
         'bản thì là <code>MZ</code>, đọc như lệnh ARM64 thì là <code>ccmp x18, #0x0, #0xd, pl</code>, ' +
         'một lệnh so sánh vô hại chỉ đụng vào cờ trạng thái. Một file, hai cách hiểu, cả hai đều ' +
         'đúng. Bạn sẽ tự nhìn thấy bốn byte đó ở bước 1 phần thực hành.' },

    /* ══════════════════════════════════════════════════════════════════
       5. Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: mổ xẻ cuộc bàn giao' },

    { t: 'p', x:
      'Năm bước dưới đây dùng lại đúng hai file bạn đã tạo ở Bài 32 trong <code>~/bai32</code>: ' +
      '<code>Image</code> và <code>initramfs.cpio.gz</code>. Nếu bạn đã xoá thư mục đó, hãy làm ' +
      'lại phần thực hành Bài 32 trước — cả Chặng 06 sẽ còn dùng tới hai file này.' },

    { t: 'code', where: 'wsl', name: 'Kiểm tra trước khi bắt đầu',
      code: 'ls -la ~/bai32/Image ~/bai32/initramfs.cpio.gz' },

    { t: 'code', where: 'out', nocopy: true,
      code:
        '-rw-r--r-- 1 shinarus shinarus 30771136 Aug 16 11:14 /home/shinarus/bai32/Image\n' +
        '-rw-r--r-- 1 shinarus shinarus  1035397 Aug 16 11:14 /home/shinarus/bai32/initramfs.cpio.gz' },

    { t: 'steps', items: [

      /* ---------- Bước 1 ---------- */
      { title: 'Đọc 64 byte header của Image',
        blocks: [
          { t: 'p', x:
            'Bootloader chỉ nhìn vào 64 byte này để quyết định nạp kernel vào đâu. Bạn cũng ' +
            'nhìn được, bằng hai công cụ đã gặp từ Bài 6: <code>xxd</code> cho cách nhìn ' +
            'byte, <code>od</code> cho cách nhìn từ 4 byte.' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai32\n' +
              'xxd -l 64 Image' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '00000000: 4d5a 40fa 3b28 6214 0000 0000 0000 0000  MZ@.;(b.........\n' +
              '00000010: 0000 e501 0000 0000 0a00 0000 0000 0000  ................\n' +
              '00000020: 0000 0000 0000 0000 0000 0000 0000 0000  ................\n' +
              '00000030: 0000 0000 0000 0000 4152 4d64 4000 0000  ........ARMd@...' },

          { t: 'p', x:
            'Cột chữ bên phải đã cho bạn hai manh mối lớn: <code>MZ</code> ở ngay đầu file, và ' +
            '<code>ARMd</code> ở offset <code>0x38</code>. Đúng như bảng cấu trúc ở trên. Bây ' +
            'giờ nhìn lại cùng dữ liệu đó theo từ 4 byte, để đọc được giá trị số thật:' },

          { t: 'code', where: 'wsl',
            code: 'od -A d -t x4 -N 64 Image' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '0000000 fa405a4d 1462283b 00000000 00000000\n' +
              '0000016 01e50000 00000000 0000000a 00000000\n' +
              '0000032 00000000 00000000 00000000 00000000\n' +
              '0000048 00000000 00000000 644d5241 00000040\n' +
              '0000064' },

          { t: 'cmdx', cmd: 'od -A d -t x4 -N 64 Image',
            title: 'Vì sao cần cả hai công cụ',
            rows: [
              ['<code>-A d</code>', 'In cột địa chỉ theo hệ <b>thập phân</b>',
               'Dễ đối chiếu với bảng offset hơn là hệ 16 khi đang đếm byte'],
              ['<code>-t x4</code>', 'Diễn giải dữ liệu thành các từ <b>4 byte</b> hệ 16',
               'Đây là mấu chốt: ARM64 là <b>little-endian</b>, nên bốn byte trên đĩa ' +
               '<code>4d 5a 40 fa</code> khi CPU đọc thành một từ sẽ là <code>0xfa405a4d</code>. ' +
               '<code>xxd</code> cho bạn thứ tự trên đĩa, <code>od -t x4</code> cho bạn giá trị CPU thấy'],
              ['<code>-N 64</code>', 'Chỉ đọc 64 byte đầu rồi dừng',
               'File nặng 30 MB — không có <code>-N</code> thì terminal sẽ trôi mất vài phút']
            ] },

          { t: 'p', x: 'Ghép hai kết quả với bảng cấu trúc, ta giải mã được toàn bộ header:' },

          { t: 'table',
            head: ['Trường', 'Giá trị đọc được', 'Nghĩa'],
            rows: [
              ['<code>code0</code>', '<code>0xfa405a4d</code>',
               'Trên đĩa là <code>MZ@\u00b7</code> cho UEFI; với CPU là lệnh ' +
               '<code>ccmp x18, #0x0, #0xd, pl</code> — vô hại, chỉ đụng cờ trạng thái'],
              ['<code>code1</code>', '<code>0x1462283b</code>',
               'Lệnh <code>b</code> nhảy tới điểm vào thật của kernel'],
              ['<code>text_offset</code>', '<code>0</code>',
               'Kernel này không đòi lệch byte nào — đặt ngay tại đầu khối RAM căn 2 MB là được'],
              ['<code>image_size</code>', '<code>0x01e50000</code> = <b>31 784 960</b> B',
               'Lớn hơn kích thước file <b>30 771 136</b> B đúng <b>1 013 824</b> B'],
              ['<code>flags</code>', '<code>0x0a</code> = <code>0b1010</code>',
               'bit 0 = 0 → <b>little-endian</b>; bit 1–2 = <code>0b01</code> → trang <b>4 KB</b>; ' +
               'bit 3 = 1 → kernel <b>đặt ở đâu cũng được</b>, miễn căn 2 MB'],
              ['<code>magic</code>', '<code>0x644d5241</code>',
               'Đọc ngược lại theo little-endian ra <code>41 52 4d 64</code> = <code>"ARM\\x64"</code>'],
              ['<code>pe_offset</code>', '<code>0x40</code>',
               'Bảng PE bắt đầu ngay sau header, byte thứ 64']
            ] },

          { t: 'cal', kind: 'info', title: '1 013 824 byte chênh lệch đó là gì?',
            x: 'Là <b>BSS</b> — vùng biến toàn cục có giá trị ban đầu bằng 0, mà bạn đã học ở ' +
               '<b>Bài 18</b> khi mổ ELF. Không ai lưu một triệu byte số 0 vào file cả; file chỉ ' +
               'ghi "tôi cần thêm chừng này chỗ trống". Nhưng bootloader thì <b>phải biết</b> con ' +
               'số đầy đủ: nếu nó tưởng kernel chỉ chiếm 30 MB rồi đặt DTB ngay sau đó, kernel sẽ ' +
               'xoá trắng DTB khi dọn BSS của chính mình. Đó chính là lý do trường ' +
               '<code>image_size</code> tồn tại trong header.' }
        ] },

      /* ---------- Bước 2 ---------- */
      { title: 'Nhìn bootloader sáu lệnh mà QEMU tự viết cho bạn',
        blocks: [
          { t: 'p', x:
            'Suốt Chặng 05 bạn dùng <code>-kernel</code> và kernel cứ thế chạy. Nhưng CPU ARM64 ' +
            'không biết đọc file <code>Image</code> — nó chỉ biết nhảy tới một địa chỉ và thực ' +
            'thi lệnh máy ở đó. Vậy ai đã đặt <code>x0</code>? Câu trả lời: khi thấy ' +
            '<code>-kernel</code>, QEMU <b>tự sinh ra một bootloader</b> và đặt nó ở đầu RAM. ' +
            'Bây giờ ta bắt quả tang nó.' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai32\n' +
              'qemu-system-aarch64 \\\n' +
              '  -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
              '  -append "console=ttyAMA0" \\\n' +
              '  -S -display none -serial null -monitor stdio' },

          { t: 'cmdx', cmd: '-S -display none -serial null -monitor stdio',
            title: 'Bốn tuỳ chọn để soi máy ảo lúc nó chưa chạy',
            rows: [
              ['<code>-S</code>', 'Tạo máy ảo xong thì <b>dừng ngay</b>, chưa thực thi lệnh nào',
               'Đây là mấu chốt của cả bước này: bạn cần nhìn RAM và thanh ghi ở <i>đúng ' +
               'trạng thái reset</i>, trước khi có gì kịp thay đổi'],
              ['<code>-display none</code>', 'Không mở cửa sổ đồ hoạ', 'Bạn đang chạy trong WSL, không có màn hình ảo'],
              ['<code>-serial null</code>', 'Vứt bỏ cổng nối tiếp của máy ảo',
               'Log kernel không cần ở bước này, và nó sẽ chen vào giữa các dòng monitor'],
              ['<code>-monitor stdio</code>', 'Đưa <b>monitor</b> của QEMU ra terminal',
               'Monitor là bảng điều khiển của QEMU, không phải shell của máy ảo. Đã dùng ở Bài 30. ' +
               'Lưu ý <code>-nographic</code> xung đột với tuỳ chọn này — phải tách rời như trên']
            ] },

          { t: 'p', x:
            'Bạn sẽ thấy dấu nhắc <code>(qemu)</code>. Gõ lệnh đầu tiên để xem CPU đang ở trạng ' +
            'thái nào lúc vừa reset:' },

          { t: 'code', where: 'qemu', code: 'info registers' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'CPU#0\n' +
              ' PC=0000000040000000 X00=0000000000000000 X01=0000000000000000\n' +
              'X02=0000000000000000 X03=0000000000000000 X04=0000000000000000\n' +
              'X05=0000000000000000 X06=0000000000000000 X07=0000000000000000\n' +
              'X08=0000000000000000 X09=0000000000000000 X10=0000000000000000\n' +
              'X11=0000000000000000 X12=0000000000000000 X13=0000000000000000\n' +
              'X14=0000000000000000 X15=0000000000000000 X16=0000000000000000\n' +
              'X17=0000000000000000 X18=0000000000000000 X19=0000000000000000\n' +
              'X20=0000000000000000 X21=0000000000000000 X22=0000000000000000\n' +
              'X23=0000000000000000 X24=0000000000000000 X25=0000000000000000\n' +
              'X26=0000000000000000 X27=0000000000000000 X28=0000000000000000\n' +
              'X29=0000000000000000 X30=0000000000000000  SP=0000000000000000\n' +
              'PSTATE=00000000400003c5 -Z-- EL1h    FPU disabled' },

          { t: 'p', x:
            'Đọc kỹ ba chi tiết: <code>PC=0x40000000</code> — CPU sẽ bắt đầu ở đầu vùng RAM ' +
            '(bản đồ bộ nhớ máy <code>virt</code> bạn đã dựng ở Bài 30). <b>Toàn bộ 31 thanh ghi ' +
            'X đều bằng 0</b>, kể cả <code>x0</code> — nghĩa là <i>lúc này</i> hợp đồng bàn giao ' +
            'chưa được thực hiện. Và <code>EL1h</code> cho biết exception level hiện tại. Giờ xem ' +
            'ở địa chỉ <code>0x40000000</code> có gì:' },

          { t: 'code', where: 'qemu', code: 'xp/10xw 0x40000000' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '0000000040000000: 0x580000c0 0xaa1f03e1 0xaa1f03e2 0xaa1f03e3\n' +
              '0000000040000010: 0x58000084 0xd61f0080 0x48200000 0x00000000\n' +
              '0000000040000020: 0x40200000 0x00000000' },

          { t: 'cmdx', cmd: 'xp/10xw 0x40000000',
            title: 'Cú pháp lệnh xem bộ nhớ của monitor',
            rows: [
              ['<code>xp</code>', 'e<b>x</b>amine <b>p</b>hysical — đọc theo địa chỉ <b>vật lý</b>',
               'Có cả lệnh <code>x</code> đọc theo địa chỉ ảo. Lúc này MMU chưa bật nên hai cái ' +
               'trùng nhau, nhưng <code>xp</code> mới là cái luôn đúng khi soi giai đoạn boot'],
              ['<code>/10</code>', 'Đọc 10 đơn vị', 'Vừa đủ 6 lệnh máy cộng 2 hằng số 64-bit'],
              ['<code>x</code>', 'Hiển thị hệ 16', 'Lệnh máy chỉ có nghĩa khi nhìn ở hệ 16'],
              ['<code>w</code>', 'Mỗi đơn vị là một <b>word</b> = 4 byte',
               'Đúng bằng độ dài một lệnh ARM64 — mỗi cột trong kết quả là <i>đúng một lệnh</i>']
            ] },

          { t: 'p', x:
            'Sáu số đầu là sáu lệnh máy. Bạn có thể thử nhờ monitor dịch chúng ra assembly, ' +
            'nhưng trên kiến trúc ARM nó sẽ từ chối:' },

          { t: 'code', where: 'qemu', code: 'x/24i 0x40000000' },

          { t: 'code', where: 'out', nocopy: true,
            code: '0x40000000: Asm output not supported on this arch' },

          { t: 'cal', kind: 'warn', title: 'Monitor của QEMU không dịch được assembly ARM',
            x: 'Bộ dịch ngược tích hợp trong monitor chỉ hỗ trợ x86. Trên ARM64 bạn phải dùng ' +
               '<code>gdb-multiarch</code> — đúng công cụ bạn đã cài và dùng ở <b>Bài 31</b>. ' +
               'Bước 3 sẽ làm việc đó. Gõ <code>quit</code> để thoát QEMU trước khi sang bước sau.' },

          { t: 'code', where: 'qemu', code: 'quit' },

          { t: 'p', x:
            'Trong lúc chờ, hãy tự giải mã hai số cuối — chúng không phải lệnh máy mà là <b>dữ ' +
            'liệu</b>: <code>0x48200000</code> ở offset <code>0x18</code>, và ' +
            '<code>0x40200000</code> ở offset <code>0x20</code>. Ghi nhớ hai con số này, bước 3 ' +
            'sẽ cho bạn thấy chúng đi đâu.' }
        ] },

      /* ---------- Bước 3 ---------- */
      { title: 'Bắt đúng khoảnh khắc bàn giao bằng gdb-multiarch',
        blocks: [
          { t: 'p', x:
            'Bạn cần <b>hai cửa sổ WSL</b>, đúng cách làm ở Bài 31: một chạy QEMU, một chạy GDB. ' +
            'Mở cửa sổ thứ hai ngay bây giờ. Ở cửa sổ thứ nhất, chạy máy ảo và cho nó đứng yên ' +
            'chờ GDB:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1 — QEMU',
            code:
              'cd ~/bai32\n' +
              'qemu-system-aarch64 \\\n' +
              '  -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
              '  -append "console=ttyAMA0" \\\n' +
              '  -display none -serial file:/tmp/l33-ok.log -s -S' },

          { t: 'cmdx', cmd: '-serial file:/tmp/l33-ok.log -s -S',
            title: 'Ba tuỳ chọn thay đổi so với bước 2',
            rows: [
              ['<code>-serial file:…</code>', 'Ghi toàn bộ log kernel vào một file thay vì ra màn hình',
               'Để lát nữa bạn <b>đếm</b> được kernel đã in ra bao nhiêu dòng — đó là phép đo của bước 4'],
              ['<code>-s</code>', 'Viết tắt của <code>-gdb tcp::1234</code>',
               'Mở cổng cho GDB kết nối vào, đã dùng ở Bài 31'],
              ['<code>-S</code>', 'Dừng ngay lúc reset', 'Không có nó, kernel boot xong trước khi bạn kịp gõ lệnh GDB']
            ] },

          { t: 'p', x: 'Sang cửa sổ thứ hai, nối GDB vào máy ảo đang đứng yên:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — GDB',
            code:
              'gdb-multiarch -q\n' +
              'target remote :1234\n' +
              'info registers pc x0 x1 x2 x3\n' +
              'x/6i $pc' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'warning: No executable has been specified and target does not support\n' +
              'determining executable automatically.  Try using the "file" command.\n' +
              '0x0000000040000000 in ?? ()\n' +
              'pc             0x40000000          0x40000000\n' +
              'x0             0x0                 0\n' +
              'x1             0x0                 0\n' +
              'x2             0x0                 0\n' +
              'x3             0x0                 0\n' +
              '=> 0x40000000:\tldr\tx0, 0x40000018\n' +
              '   0x40000004:\tmov\tx1, xzr\n' +
              '   0x40000008:\tmov\tx2, xzr\n' +
              '   0x4000000c:\tmov\tx3, xzr\n' +
              '   0x40000010:\tldr\tx4, 0x40000020\n' +
              '   0x40000014:\tbr\tx4' },

          { t: 'cal', kind: 'info', title: 'Cảnh báo "No executable has been specified" là bình thường',
            x: 'Bạn nối GDB vào một máy ảo trần, không đưa cho nó file ELF nào để đọc ký hiệu. ' +
               'Vì thế GDB in <code>?? ()</code> thay vì tên hàm. Điều này không cản trở gì: bạn ' +
               'đang đọc lệnh máy và thanh ghi, không đọc mã nguồn. Ở <b>Chặng 07</b>, khi bạn tự ' +
               'build kernel và có file <code>vmlinux</code>, chỉ cần thêm <code>file vmlinux</code> ' +
               'là GDB hiện đủ tên hàm.' },

          { t: 'cal', kind: 'info', title: 'Đối chiếu với bước 2: cùng một trạng thái CPU, hai công cụ khác nhau',
            x: 'Bốn dòng <code>info registers</code> xác nhận CPU vẫn đứng nguyên chỗ cũ: ' +
               '<code>pc = 0x40000000</code>, và <code>x0</code>=<code>x1</code>=<code>x2</code>=' +
               '<code>x3</code>=<code>0</code> — đúng những gì monitor của QEMU đã cho thấy ở bước 2 ' +
               'bằng <code>info registers</code>. Đây là cùng một máy ảo, cùng một khoảnh khắc reset, ' +
               'chỉ khác công cụ soi. Điểm mới nằm ở bốn dòng cuối: <code>x/6i $pc</code> vừa <b>dịch ' +
               'ra được thành assembly</b> đúng sáu lệnh máy mà <code>xp/10xw</code> ở bước 2 chỉ cho ' +
               'bạn xem dưới dạng sáu con số hệ 16 — thứ monitor từ chối dịch.' },

          { t: 'p', x:
            'Đây là <b>toàn bộ bootloader mà QEMU viết cho bạn</b> — sáu lệnh, và mỗi lệnh là ' +
            'một điều khoản trong hợp đồng bàn giao ở phần lý thuyết:' },

          { t: 'table',
            head: ['Lệnh', 'Làm gì', 'Điều khoản nào'],
            rows: [
              ['<code>ldr x0, 0x40000018</code>',
               'Nạp vào <code>x0</code> giá trị 8 byte nằm tại <code>0x40000018</code>, tức <code>0x48200000</code>',
               '<b>Điều khoản 1</b>: <code>x0</code> = địa chỉ DTB'],
              ['<code>mov x1, xzr</code>', 'Gán <code>x1</code> = 0 (<code>xzr</code> là thanh ghi luôn đọc ra 0)', '<b>Điều khoản 2</b>'],
              ['<code>mov x2, xzr</code>', 'Gán <code>x2</code> = 0', '<b>Điều khoản 2</b>'],
              ['<code>mov x3, xzr</code>', 'Gán <code>x3</code> = 0', '<b>Điều khoản 2</b>'],
              ['<code>ldr x4, 0x40000020</code>', 'Nạp vào <code>x4</code> giá trị tại <code>0x40000020</code>, tức <code>0x40200000</code>', 'Chuẩn bị cho nhiệm vụ 4'],
              ['<code>br x4</code>', 'Nhảy tới <code>0x40200000</code> — nơi <code>Image</code> đã được QEMU chép vào', '<b>Nhiệm vụ 4</b>: nhảy rồi biến mất']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao là ldr chứ không phải mov?',
            x: 'Một lệnh ARM64 chỉ dài <b>4 byte</b>, không thể chứa nổi một hằng số 64-bit như ' +
               '<code>0x48200000</code>. Cách chuẩn là để hằng số <i>ngay cạnh</i> đoạn mã rồi ' +
               'dùng <code>ldr</code> đọc nó ra theo địa chỉ tương đối. Đó chính là lý do hai số ' +
               'cuối cùng bạn thấy ở bước 2 không phải lệnh máy: chúng là hai hằng số mà lệnh 1 ' +
               'và lệnh 5 đi lấy. Toàn bộ bootloader này gọn trong <b>40 byte</b>.' },

          { t: 'p', x:
            'Bây giờ đặt điểm dừng ngay tại byte đầu tiên của kernel và cho chạy tới đó, để xem ' +
            'hợp đồng lúc bàn giao trông thế nào:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — GDB',
            code:
              'break *0x40200000\n' +
              'continue\n' +
              'info registers pc x0 x1 x2 x3\n' +
              'x/4xw $x0' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'Breakpoint 1 at 0x40200000\n' +
              '\n' +
              'Breakpoint 1, 0x0000000040200000 in ?? ()\n' +
              'pc             0x40200000          0x40200000\n' +
              'x0             0x48200000          1210056704\n' +
              'x1             0x0                 0\n' +
              'x2             0x0                 0\n' +
              'x3             0x0                 0\n' +
              '0x48200000:\t0xedfe0dd0\t0x00001000\t0x40000000\t0x0c1c0000' },

          { t: 'cal', kind: 'info', title: 'Đây là khoảnh khắc bàn giao, đọc từng dòng một',
            x: '<code>pc = 0x40200000</code>: CPU đang đứng ở byte đầu tiên của <code>Image</code>, ' +
               'tức ở lệnh <code>ccmp</code> nguỵ trang thành <code>MZ</code> mà bạn giải mã ở ' +
               'bước 1. <code>x0 = 0x48200000</code>, <code>x1</code>=<code>x2</code>=<code>x3</code>=0: ' +
               'hợp đồng được thực hiện đầy đủ. Và bằng chứng cuối cùng nằm ở dòng ' +
               '<code>x/4xw $x0</code> — từ đầu tiên là <b><code>0xedfe0dd0</code></b>. Đảo ' +
               'little-endian lại: <code>d0 0d fe ed</code>, đọc như chữ là ' +
               '<b><code>0xd00dfeed</code></b>, chữ ký bắt buộc của mọi Device Tree Blob. Từ thứ ' +
               'hai <code>0x00001000</code> đảo lại là <code>0x00100000</code> = <b>1 048 576</b> ' +
               'byte, đúng kích thước DTB mà QEMU sinh ra. Vậy <code>x0</code> thật sự trỏ vào một ' +
               'DTB hợp lệ. <b>Chặng 08</b> sẽ mổ xẻ nội dung bên trong nó.' },

          { t: 'p', x:
            'Cho máy chạy nốt và kiểm tra kernel boot bình thường. Ở cửa sổ 2 gõ ' +
            '<code>continue</code>, chờ khoảng 40 giây rồi bấm <kbd>Ctrl</kbd>+<kbd>C</kbd> ở cửa ' +
            'sổ 1, sau đó đếm log:' },

          { t: 'code', where: 'wsl',
            code:
              'wc -l -c /tmp/l33-ok.log\n' +
              'tail -n 2 /tmp/l33-ok.log' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '  237  15231 /tmp/l33-ok.log\n' +
              "/bin/sh: can't access tty; job control turned off\n" +
              '~ #' },

          { t: 'cal', kind: 'tip', title: 'Ghi nhớ con số 237',
            x: 'Đây là <b>đường cơ sở</b>: khi hợp đồng bàn giao được tôn trọng, kernel in ra ' +
               '<b>237 dòng / 15 231 byte</b> và chạy tới dấu nhắc <code>~ #</code> của BusyBox. ' +
               'Bước tiếp theo sẽ phá đúng một điều khoản và đo lại chính hai con số này. Con số ' +
               'trên máy bạn có thể lệch vài dòng nếu phiên bản kernel khác — điều quan trọng là ' +
               'nó <i>lớn hơn 0</i>.' }
        ] },

      /* ---------- Bước 4 ---------- */
      { title: 'Cố tình phá hợp đồng và nghe sự im lặng',
        blocks: [
          { t: 'p', x:
            'Phần lý thuyết khẳng định: vi phạm hợp đồng bàn giao <b>không sinh ra thông báo ' +
            'lỗi</b>, chỉ sinh ra im lặng. Bây giờ bạn tự tạo ra sự im lặng đó. GDB cho phép ghi ' +
            'đè thanh ghi, nên bạn có thể đóng vai một bootloader hỏng: dừng đúng lúc bàn giao, ' +
            'xoá <code>x0</code> về 0, rồi thả cho kernel chạy.' },

          { t: 'p', x:
            'Ở cửa sổ 1, chạy lại QEMU y hệt bước 3 nhưng đổi tên file log để so sánh được:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1 — QEMU',
            code:
              'cd ~/bai32\n' +
              'qemu-system-aarch64 \\\n' +
              '  -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -kernel Image -initrd initramfs.cpio.gz \\\n' +
              '  -append "console=ttyAMA0" \\\n' +
              '  -display none -serial file:/tmp/l33-broken.log -s -S' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — GDB',
            code:
              'gdb-multiarch -q\n' +
              'target remote :1234\n' +
              'break *0x40200000\n' +
              'continue\n' +
              'set $x0 = 0\n' +
              'info registers x0' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'Breakpoint 1 at 0x40200000\n' +
              '\n' +
              'Breakpoint 1, 0x0000000040200000 in ?? ()\n' +
              'x0             0x0                 0' },

          { t: 'cmdx', cmd: 'set $x0 = 0',
            title: 'Ghi đè một thanh ghi từ GDB',
            rows: [
              ['<code>set</code>', 'Gán giá trị cho một biểu thức',
               'Không phải <code>set</code> đổi tuỳ chọn của GDB — dấu <code>$</code> phía sau ' +
               'mới quyết định'],
              ['<code>$x0</code>', 'Thanh ghi <code>x0</code> của CPU máy ảo',
               'Trong GDB, tên bắt đầu bằng <code>$</code> là thanh ghi hoặc biến tiện lợi. Ghi ' +
               'vào nó là ghi thẳng vào trạng thái CPU'],
              ['<code>= 0</code>', 'Xoá địa chỉ DTB',
               'Mô phỏng đúng lỗi phổ biến nhất đời thực: bootloader quên đặt <code>x0</code>, ' +
               'hoặc đặt vào thanh ghi sai']
            ] },

          { t: 'cal', kind: 'info', title: 'Dòng cuối cùng xác nhận: x0 đã thật sự về 0',
            x: 'Dòng <code>x0 0x0 0</code> là kết quả của <code>info registers x0</code> đọc lại ' +
               'ngay sau lệnh <code>set</code> — không phải giá trị cũ. Đối chiếu với bước 3: tại ' +
               'đúng breakpoint này, hợp đồng đúng cho <code>x0 = 0x48200000</code> (địa chỉ DTB). ' +
               'Bây giờ nó là <b>0</b>. Bạn vừa đóng vai một bootloader hỏng: mọi thứ khác — PC, ' +
               'file <code>Image</code> đã nạp, sáu lệnh đã chạy — đều nguyên vẹn, chỉ một thanh ghi ' +
               'sai. Lệnh <code>continue</code> tiếp theo sẽ để kernel chạy tiếp với đúng cái sai đó.' },

          { t: 'p', x:
            'Bây giờ thả cho kernel chạy. Gõ <code>continue</code> ở cửa sổ 2, chờ 40 giây — bạn ' +
            'sẽ không thấy gì xảy ra cả — rồi bấm <kbd>Ctrl</kbd>+<kbd>C</kbd> ở cửa sổ 1 và đếm:' },

          { t: 'code', where: 'wsl',
            code: 'wc -l -c /tmp/l33-broken.log' },

          { t: 'code', where: 'out', nocopy: true,
            code: '0 0 /tmp/l33-broken.log' },

          { t: 'cal', kind: 'danger', title: 'Không dòng nào. Không byte nào. Đây là bài học quan trọng nhất của bài này',
            x: 'Đối chiếu: hợp đồng đúng cho <b>237 dòng / 15 231 byte</b>. Sai một thanh ghi duy ' +
               'nhất cho <b>0 dòng / 0 byte</b>. Không có <code>Kernel panic</code>, không có ' +
               '<code>Bad device tree</code>, không có một ký tự nào. Lý do đã nói ở phần lý ' +
               'thuyết và giờ bạn đã tận mắt thấy: để in được chữ đầu tiên, kernel phải đọc DTB ' +
               'để biết UART ở đâu — mà <code>x0</code> vừa bị bạn xoá. Nó chết trước cả khi có ' +
               'khả năng kêu cứu.' },

          { t: 'p', x:
            'Làm lại một lần nữa, lần này thay <code>set $x0 = 0</code> bằng ' +
            '<code>set $x0 = 0x44000000</code> — một địa chỉ RAM <i>hợp lệ</i> nhưng không phải ' +
            'nơi có DTB. Kết quả không khác gì:' },

          { t: 'code', where: 'out', nocopy: true,
            code: '0 0 /tmp/l33-broken2.log' },

          { t: 'cal', kind: 'tip', title: 'Luật chẩn đoán bạn sẽ dùng suốt phần đời còn lại',
            x: '<b>Boot ra được vài dòng rồi treo</b> ⇒ kernel đã chạy, đã đọc được DTB, lỗi nằm ' +
               'ở driver hoặc rootfs — đọc dòng cuối cùng để biết. <b>Boot im lặng tuyệt đối, ' +
               'không một ký tự</b> ⇒ kernel chưa bao giờ chạy được, nghi bốn thứ theo đúng thứ ' +
               'tự này: (1) <code>x0</code> không trỏ vào DTB, (2) kernel bị nạp sai địa chỉ hoặc ' +
               'sai căn lề 2 MB, (3) file <code>Image</code> tải lên bị hỏng, (4) UART trong DTB ' +
               'khai báo sai. Đừng bao giờ bắt đầu bằng việc đổ lỗi cho kernel — nó còn chưa kịp ' +
               'chạy.' }
        ] },

      /* ---------- Bước 5 ---------- */
      { title: 'Bỏ -kernel đi: ai làm chủ địa chỉ 0x40000000?',
        blocks: [
          { t: 'p', x:
            'Câu hỏi cuối: sáu lệnh đó có <b>sẵn</b> trong máy <code>virt</code>, hay do ' +
            '<code>-kernel</code> sinh ra? Cách trả lời dứt điểm là bỏ <code>-kernel</code> đi ' +
            'rồi nhìn lại đúng địa chỉ ấy.' },

          { t: 'code', where: 'wsl',
            code:
              'qemu-system-aarch64 \\\n' +
              '  -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -S -display none -serial null -monitor stdio' },

          { t: 'code', where: 'qemu', code: 'xp/8xw 0x40000000' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '0000000040000000: 0xedfe0dd0 0x00001000 0x40000000 0xc81b0000\n' +
              '0000000040000010: 0x30000000 0x11000000 0x10000000 0x00000000' },

          { t: 'cal', kind: 'info', title: 'Sáu lệnh đã biến mất, chỗ đó giờ là DTB',
            x: 'Từ đầu tiên <code>0xedfe0dd0</code> — lại là <code>0xd00dfeed</code> đảo ' +
               'little-endian. Không có <code>-kernel</code>, QEMU <b>không sinh bootloader nào ' +
               'cả</b>, và nó đặt luôn DTB vào đầu RAM. Kết luận: sáu lệnh ở bước 2 <b>không phải ' +
               'một phần của phần cứng</b> — QEMU tổng hợp chúng ngay lúc chạy, chỉ vì bạn đã yêu ' +
               'cầu <code>-kernel</code>. Nói cách khác, suốt Chặng 05 <b>QEMU đã đóng vai ' +
               'bootloader thay bạn</b>.' },

          { t: 'p', x:
            'Gõ <code>quit</code> để thoát. Đây chính là chỗ Bài 34 bắt đầu: thay vì để QEMU tự ' +
            'sinh sáu lệnh, bạn sẽ đặt một bootloader <b>thật</b> vào máy ảo và bắt nó làm đủ ' +
            'bốn nhiệm vụ.' },

          { t: 'code', where: 'qemu', code: 'quit' },

          { t: 'code', where: 'wsl', name: 'Dọn file log tạm',
            code: 'rm -f /tmp/l33-ok.log /tmp/l33-broken.log /tmp/l33-broken2.log' }
        ] }

    ] },

    /* ══════════════════════════════════════════════════════════════════
       6. Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>0x40000000: Asm output not supported on this arch</code>',
         'Bộ dịch ngược trong monitor QEMU chỉ hỗ trợ x86, không hỗ trợ ARM64',
         'Dùng <code>xp/Nxw</code> để đọc số thô, rồi dịch ra assembly bằng ' +
         '<code>gdb-multiarch</code> với <code>x/Ni $pc</code> như bước 3'],
        ['<code>cannot use stdio by multiple character devices</code><br>' +
         '<code>could not connect serial device to character backend \'stdio\'</code>',
         'Bạn dùng <code>-nographic</code> cùng lúc với <code>-monitor stdio</code>. ' +
         '<code>-nographic</code> đã tự chiếm stdio cho cổng nối tiếp rồi',
         'Bỏ <code>-nographic</code>, thay bằng bộ ba ' +
         '<code>-display none -serial null -monitor stdio</code> như trong bài'],
        ['<code>could not connect: Connection timed out.</code>',
         'GDB gọi vào cổng 1234 nhưng QEMU khởi động không có <code>-s</code>, hoặc tiến trình ' +
         'QEMU đã thoát',
         'Kiểm tra dòng lệnh cửa sổ 1 có đủ <code>-s -S</code> chưa; nếu QEMU vẫn đang chạy thì ' +
         'chạy <code>ss -ltnp | grep 1234</code> để xác nhận cổng đang mở'],
        ['<code>qemu-system-aarch64: could not load kernel \'NoSuchImage\'</code>',
         'Đường dẫn tới <code>Image</code> sai, hoặc bạn chưa <code>cd ~/bai32</code>',
         '<code>ls -la ~/bai32/Image</code> để xác nhận file có thật, rồi dùng đường dẫn tuyệt đối'],
        ['GDB nối được nhưng <b>không bao giờ dừng</b> ở breakpoint',
         'Bạn quên <code>-S</code>, nên kernel đã chạy vượt qua <code>0x40200000</code> từ lâu ' +
         'trước khi bạn kịp gõ <code>break</code>',
         'Tắt QEMU, thêm <code>-S</code> vào dòng lệnh, chạy lại. Luôn đặt breakpoint <i>trước</i> ' +
         'khi gõ <code>continue</code> lần đầu'],
        ['Máy ảo boot im lặng, <code>wc -l</code> trên log ra <b>0</b>',
         'Hợp đồng bàn giao bị vi phạm — đây là hiện tượng bạn cố tình tạo ra ở bước 4',
         'Nếu <b>không</b> cố ý: kiểm tra <code>x0</code> có trỏ vào một vùng nhớ bắt đầu bằng ' +
         '<code>0xd00dfeed</code> không, và kernel có được nạp vào địa chỉ căn 2 MB không'],
        ['<code>ls: cannot access \'/home/…/bai32/Image\': No such file or directory</code>',
         'Thư mục <code>~/bai32</code> đã bị xoá sau Bài 32',
         'Làm lại phần thực hành Bài 32. Cả Chặng 06 đều dựa trên hai file trong thư mục này — ' +
         'đừng xoá nó cho tới hết Chặng 06']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       7. Tóm tắt
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Ghi nhớ', items: [
      'Bootloader tồn tại vì lúc CPU vừa có điện, <b>DRAM chưa dùng được</b>, còn kernel thì ' +
      'bắt buộc phải nằm trong DRAM mới chạy nổi.',
      'Bốn nhiệm vụ bắt buộc: <b>bật RAM · nạp file · dọn thanh ghi · nhảy rồi biến mất</b>. ' +
      'Mọi bootloader đều làm đúng bốn việc này, kể cả bản sáu lệnh của QEMU.',
      'Boot nhiều tầng sinh ra để phá vòng luẩn quẩn: <b>SPL</b> đủ nhỏ để sống trong <b>SRAM ' +
      '32–256 KB</b>, nó đi bật DRAM rồi mới nạp U-Boot đầy đủ (~<b>1,4 MB</b>). ' +
      '<b>546 / 1 522</b> defconfig của U-Boot bật SPL.',
      'Hợp đồng bàn giao ARM64: <code>x0</code> = <b>địa chỉ vật lý của DTB</b>, ' +
      '<code>x1</code>=<code>x2</code>=<code>x3</code>=<b>0</b>, <b>MMU tắt</b>, <b>D-cache tắt</b>, ' +
      'kernel nạp ở địa chỉ căn <b>2 MB</b>.',
      '64 byte đầu của <code>Image</code> là header có cấu trúc: magic <code>0x644d5241</code> ' +
      '(<code>"ARM\\x64"</code>) ở offset <code>0x38</code>, <code>image_size</code> = ' +
      '<b>31 784 960</b> B lớn hơn kích thước file <b>30 771 136</b> B đúng phần <b>BSS</b>.',
      'Bốn byte đầu <code>4d 5a 40 fa</code> vừa là chữ ký <code>MZ</code> cho UEFI vừa là một ' +
      'lệnh <code>ccmp</code> vô hại cho U-Boot — <b>một file, hai cách nạp</b>.',
      'Sáu lệnh tại <code>0x40000000</code> <b>không thuộc phần cứng</b>: QEMU chỉ sinh ra chúng ' +
      'khi bạn dùng <code>-kernel</code>. Bỏ <code>-kernel</code> đi thì chỗ đó là DTB.',
      '<b>Vi phạm hợp đồng không báo lỗi, nó im lặng.</b> Hợp đồng đúng → <b>237 dòng / 15 231 ' +
      'byte</b>. Xoá <code>x0</code> → <b>0 dòng / 0 byte</b>. Màn hình trắng trơn ⇒ nghi khâu ' +
      'bàn giao trước, đừng nghi kernel.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Bài 33 chỉ cho bạn <i>nhìn</i> bootloader mà QEMU viết hộ. <b>Bài 34</b> bắt bạn tự ' +
         'build một bootloader thật: tải mã nguồn <b>U-Boot v2026.07</b> (414 MB, ' +
         '<b>1 192 638</b> dòng C), chọn <code>qemu_arm64_defconfig</code>, cross-compile bằng ' +
         'đúng bộ công cụ của Chặng 04, rồi nạp vào QEMU bằng <code>-bios</code> thay cho ' +
         '<code>-kernel</code>. Bạn sẽ đo được thời gian build thật, kích thước ' +
         '<code>u-boot.bin</code> thật, và lần đầu tiên gõ lệnh tại dấu nhắc <code>=&gt;</code> ' +
         'của U-Boot. Cuối bài là kỹ năng bắt buộc của mọi kỹ sư embedded: <b>áp một patch lên ' +
         'mã nguồn</b> bằng <code>git am</code> và <code>patch -p1</code> — và xử lý khi patch ' +
         'không áp được.' }

  ],

  quiz: [
    { q: 'Theo hợp đồng bàn giao của ARM64, bootloader phải đặt gì vào thanh ghi <code>x0</code> trước khi nhảy vào kernel?',
      opts: [
        'Địa chỉ vật lý của Device Tree Blob đã nằm sẵn trong RAM',
        'Kích thước RAM tính bằng byte',
        'Địa chỉ của initramfs',
        'Số 0, giống như x1, x2 và x3'
      ],
      a: 0,
      why: 'DTB là <i>toàn bộ</i> thông tin kernel nhận được về phần cứng — có bao nhiêu RAM, ' +
           'UART ở đâu, có thiết bị gì. Chính vì thế bạn đã thấy <code>x0 = 0x48200000</code> ' +
           'ngay tại breakpoint ở bước 3, và ô nhớ đó bắt đầu bằng chữ ký ' +
           '<code>0xd00dfeed</code>. <code>x1</code>–<code>x3</code> mới là những thanh ghi phải bằng 0.' },

    { q: 'Vì sao SPL phải chạy trong SRAM chứ không chạy thẳng trong DRAM cho rộng rãi?',
      opts: [
        'Vì SRAM nhanh hơn DRAM nên boot nhanh hơn',
        'Vì nhiệm vụ của SPL chính là đi bật DRAM — lúc đó DRAM chưa dùng được',
        'Vì DRAM bị kernel chiếm hết chỗ',
        'Vì BootROM chỉ đọc được dữ liệu vào SRAM'
      ],
      a: 1,
      why: 'Đây là vòng luẩn quẩn kinh điển: mã bật DRAM không thể chạy trong DRAM. SRAM là nơi ' +
           'duy nhất dùng được ngay khi có điện mà không cần hiệu chỉnh. Cái giá phải trả là ' +
           'dung lượng — 32–256 KB, nên tầng đầu bắt buộc phải rút gọn tối đa.' },

    { q: 'Trường <code>image_size</code> trong header cho <b>31 784 960</b> byte, nhưng file <code>Image</code> chỉ nặng <b>30 771 136</b> byte. Vì sao lệch?',
      opts: [
        'Header ghi kích thước sau khi giải nén',
        'Phần chênh là chữ ký số của kernel',
        'Phần chênh là vùng BSS — biến toàn cục bằng 0, không cần lưu vào file nhưng vẫn chiếm RAM lúc chạy',
        'Header luôn làm tròn lên bội số của 2 MB'
      ],
      a: 2,
      why: 'BSS là khái niệm bạn đã gặp ở Bài 18 khi mổ ELF: không ai lưu hàng triệu byte số 0 ' +
           'vào file. Nhưng bootloader <b>phải</b> biết con số đầy đủ, nếu không nó sẽ đặt DTB ' +
           'ngay sau kernel và kernel sẽ xoá trắng DTB khi dọn BSS của chính mình.' },

    { q: 'Bạn boot một board ARM64 mới. Màn hình nối tiếp <b>hoàn toàn trống</b> — không một ký tự nào, kể cả rác. Giả thuyết nào nên kiểm tra <b>trước tiên</b>?',
      opts: [
        'Rootfs bị hỏng nên init không chạy được',
        'Driver mạng bị thiếu trong kernel',
        'Kernel bị biên dịch sai kiến trúc',
        'Khâu bàn giao hỏng: x0 không trỏ vào DTB hợp lệ, hoặc kernel bị nạp sai địa chỉ'
      ],
      a: 3,
      why: 'Đây chính là phép đo bạn tự làm ở bước 4: hợp đồng đúng cho <b>237 dòng</b>, xoá ' +
           '<code>x0</code> cho <b>0 dòng / 0 byte</b>. Im lặng tuyệt đối nghĩa là kernel chưa ' +
           'bao giờ chạy tới chỗ in được chữ — vì muốn in, nó phải đọc DTB để biết UART ở đâu. ' +
           'Lỗi rootfs hay driver luôn xảy ra <i>sau</i> khi đã có hàng trăm dòng log.' },

    { q: 'Sáu lệnh máy tại địa chỉ <code>0x40000000</code> mà bạn xem bằng <code>xp/10xw</code> từ đâu ra?',
      opts: [
        'Chúng nằm trong BootROM của máy ảo virt, luôn có sẵn',
        'QEMU tổng hợp chúng lúc chạy, chỉ khi bạn dùng tuỳ chọn -kernel',
        'Chúng là 24 byte đầu của file Image',
        'Chúng do U-Boot ghi vào từ lần chạy trước'
      ],
      a: 1,
      why: 'Bước 5 chứng minh dứt điểm: bỏ <code>-kernel</code> đi rồi xem lại đúng địa chỉ đó, ' +
           'sáu lệnh biến mất và chỗ đó là DTB (<code>0xedfe0dd0</code>). Máy <code>virt</code> ' +
           'không có BootROM. Nói cách khác, suốt Chặng 05 QEMU đã âm thầm đóng vai bootloader.' },

    { q: 'Bốn byte đầu của <code>Image</code> là <code>4d 5a 40 fa</code>. Vì sao kernel lại chọn đúng bốn byte này?',
      opts: [
        'Vì đó là checksum của phần còn lại của file',
        'Vì đó là số hiệu phiên bản kernel',
        'Vì đọc như văn bản thì là chữ ký MZ mà UEFI đòi, còn đọc như lệnh máy thì là một lệnh ccmp vô hại',
        'Vì little-endian bắt buộc mọi file ARM64 phải bắt đầu bằng giá trị này'
      ],
      a: 2,
      why: 'Cùng một file <code>Image</code> phải nạp được bằng hai đường khác hẳn nhau: UEFI ' +
           'đòi chữ ký <code>MZ</code>, còn U-Boot thì nhảy thẳng vào byte số 0 và mong ở đó có ' +
           'lệnh máy. Chọn bốn byte thoả mãn cả hai cách đọc là một mẹo thiết kế, không phải sự ' +
           'trùng hợp.' }
  ]
});

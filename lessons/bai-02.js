/* ============================================================
   BÀI 2 — Toàn cảnh luồng khởi động
   Chặng 00 · Nhập môn
   ============================================================ */
Lesson.register({
  id: 'bai-02',
  title: 'Toàn cảnh luồng khởi động',
  minutes: 40,
  practice: 'Thực hành 20 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Từ lúc bạn cấp điện đến lúc dấu nhắc shell hiện ra, quyền điều khiển được chuyền tay qua ' +
    '<b>sáu chặng</b>. Mỗi chặng chỉ làm đủ việc để đánh thức chặng kế tiếp rồi biến mất. ' +
    'Hiểu chuỗi bàn giao này là kỹ năng chẩn đoán quan trọng nhất của nghề: khi thiết bị không lên, ' +
    'câu hỏi đầu tiên người có nghề đặt ra không phải "tại sao hỏng" mà là ' +
    '<b>"nó chết ở chặng nào"</b>.',

  goals: [
    'Kể được sáu giai đoạn khởi động theo đúng thứ tự, và mỗi giai đoạn bàn giao cái gì',
    'Giải thích được vì sao phải boot nhiều tầng thay vì dùng một chương trình duy nhất',
    'Hiểu vì sao DRAM chưa dùng được trong những mili-giây đầu tiên',
    'Nhìn triệu chứng (im lặng / treo / panic) và khoanh vùng được giai đoạn hỏng',
    'Đọc được log khởi động thật và chỉ ra chính xác mốc kernel bàn giao cho userspace'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VẤN ĐỀ GỐC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Câu hỏi mở đầu: CPU biết gì khi vừa có điện?' },

    { t: 'p', x:
      'Trên máy tính, bạn bấm nút nguồn và vài giây sau có màn hình đăng nhập. Chuyện đó quen tới mức ' +
      'không ai hỏi tại sao. Nhưng hãy thử đặt mình vào vị trí con CPU tại mili-giây thứ nhất.' },

    { t: 'p', x:
      'Nó không có hệ điều hành. Không có khái niệm "file" hay "chương trình". ' +
      'RAM ngoài chưa dùng được — chip nhớ DRAM cần được cấp xung nhịp, hiệu chỉnh thời gian ' +
      'và làm tươi định kỳ, mà chưa ai làm những việc đó. Ổ cứng và thẻ nhớ thì im lìm vì chưa có ' +
      'driver nào chạy.' },

    { t: 'p', x:
      'CPU chỉ biết đúng một thứ: <b>khi được reset, hãy nạp lệnh đầu tiên từ một địa chỉ cố định</b>. ' +
      'Địa chỉ đó do nhà thiết kế chip quy định cứng trong silicon, gọi là <b>reset vector</b>. ' +
      'Toàn bộ quá trình khởi động là chuỗi phản ứng dây chuyền bắt đầu từ đúng một lệnh tại đúng ' +
      'một địa chỉ đó.' },

    { t: 'cal', kind: 'tip', title: 'Bạn sẽ tự nhìn thấy điều này', x:
      '<p>Ở phần thực hành, bạn sẽ dừng một CPU ARM64 ngay trước lệnh đầu tiên và soi vào thanh ghi ' +
      'của nó. Bạn sẽ thấy <code>PC = 0x0000000000000000</code> và toàn bộ thanh ghi bằng 0 — ' +
      'bằng chứng trực quan rằng CPU thật sự khởi đầu từ con số không.</p>' },

    /* ══════════════════════════════════════════════
       2. SÁU GIAI ĐOẠN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Sáu giai đoạn, theo đúng thứ tự' },

    { t: 'fig',
      cap: 'Chuỗi bàn giao khi khởi động. Chú ý hàng trên cùng: ba giai đoạn đầu chạy ở ba vùng nhớ khác nhau, vì DRAM chỉ sẵn sàng từ giai đoạn 2 trở đi.',
      svg:
      '<svg viewBox="0 0 720 208" width="720" role="img" aria-label="Sáu giai đoạn khởi động của hệ Embedded Linux">' +
        /* hàng trên: nơi chạy */
        '<text class="d-ts" x="67"  y="16" text-anchor="middle">ROM</text>' +
        '<text class="d-ts" x="184" y="16" text-anchor="middle">SRAM nội</text>' +
        '<text class="d-ts" x="476" y="16" text-anchor="middle">DRAM</text>' +
        '<path class="d-line" d="M15 24 H120"  stroke-width="1"/>' +
        '<path class="d-line" d="M132 24 H237" stroke-width="1"/>' +
        '<path class="d-line" d="M249 24 H705" stroke-width="1"/>' +

        /* 6 hộp */
        '<rect class="d-box"   x="15"  y="34" width="105" height="60" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-w" x="132" y="34" width="105" height="60" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-w" x="249" y="34" width="105" height="60" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-p" x="366" y="34" width="105" height="60" rx="8" stroke-width="2"/>' +
        '<rect class="d-box-a" x="483" y="34" width="105" height="60" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-g" x="600" y="34" width="105" height="60" rx="8" stroke-width="1.5"/>' +

        '<text class="d-ts" x="67"  y="52" text-anchor="middle">0</text>' +
        '<text class="d-ts" x="184" y="52" text-anchor="middle">1</text>' +
        '<text class="d-ts" x="301" y="52" text-anchor="middle">2</text>' +
        '<text class="d-ts" x="418" y="52" text-anchor="middle">3</text>' +
        '<text class="d-ts" x="535" y="52" text-anchor="middle">4</text>' +
        '<text class="d-ts" x="652" y="52" text-anchor="middle">5</text>' +

        '<text class="d-t" x="67"  y="74" text-anchor="middle">ROM code</text>' +
        '<text class="d-t" x="184" y="74" text-anchor="middle">SPL</text>' +
        '<text class="d-t" x="301" y="74" text-anchor="middle">U-Boot</text>' +
        '<text class="d-t" x="418" y="74" text-anchor="middle">Kernel</text>' +
        '<text class="d-t" x="535" y="74" text-anchor="middle">init</text>' +
        '<text class="d-t" x="652" y="74" text-anchor="middle">Ứng dụng</text>' +

        '<text class="d-ts" x="67"  y="88" text-anchor="middle">nhà SX nạp</text>' +
        '<text class="d-ts" x="184" y="88" text-anchor="middle">tầng 1</text>' +
        '<text class="d-ts" x="301" y="88" text-anchor="middle">tầng 2</text>' +
        '<text class="d-ts" x="418" y="88" text-anchor="middle">Linux</text>' +
        '<text class="d-ts" x="535" y="88" text-anchor="middle">PID 1</text>' +
        '<text class="d-ts" x="652" y="88" text-anchor="middle">sản phẩm</text>' +

        /* mũi tên nối */
        '<path class="d-line" d="M121 64 H128" stroke-width="1.5"/><path class="d-arrow" d="M128 60 l7 4 -7 4 z"/>' +
        '<path class="d-line" d="M238 64 H245" stroke-width="1.5"/><path class="d-arrow" d="M245 60 l7 4 -7 4 z"/>' +
        '<path class="d-line" d="M355 64 H362" stroke-width="1.5"/><path class="d-arrow" d="M362 60 l7 4 -7 4 z"/>' +
        '<path class="d-line" d="M472 64 H479" stroke-width="1.5"/><path class="d-arrow" d="M479 60 l7 4 -7 4 z"/>' +
        '<path class="d-line" d="M589 64 H596" stroke-width="1.5"/><path class="d-arrow" d="M596 60 l7 4 -7 4 z"/>' +

        /* nhiệm vụ */
        '<text class="d-ts" x="67"  y="116" text-anchor="middle">đọc boot pin</text>' +
        '<text class="d-ts" x="67"  y="130" text-anchor="middle">nạp SPL</text>' +
        '<text class="d-ts" x="184" y="116" text-anchor="middle">bật DRAM</text>' +
        '<text class="d-ts" x="184" y="130" text-anchor="middle">nạp U-Boot</text>' +
        '<text class="d-ts" x="301" y="116" text-anchor="middle">nạp kernel</text>' +
        '<text class="d-ts" x="301" y="130" text-anchor="middle">+ DTB</text>' +
        '<text class="d-ts" x="418" y="116" text-anchor="middle">MMU, driver</text>' +
        '<text class="d-ts" x="418" y="130" text-anchor="middle">mount rootfs</text>' +
        '<text class="d-ts" x="535" y="116" text-anchor="middle">mount /proc</text>' +
        '<text class="d-ts" x="535" y="130" text-anchor="middle">chạy service</text>' +
        '<text class="d-ts" x="652" y="116" text-anchor="middle">việc thật</text>' +
        '<text class="d-ts" x="652" y="130" text-anchor="middle">của thiết bị</text>' +

        /* trục thời gian */
        '<path class="d-line" d="M15 160 H700" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M700 155 l14 5 -14 5 z"/>' +
        '<text class="d-ts" x="15"  y="180" text-anchor="start">0 ms</text>' +
        '<text class="d-ts" x="360" y="180" text-anchor="middle">vài trăm ms</text>' +
        '<text class="d-ts" x="690" y="180" text-anchor="end">vài giây</text>' +
        '<text class="d-ts" x="360" y="200" text-anchor="middle">mỗi giai đoạn chỉ làm đủ việc để đánh thức giai đoạn kế tiếp, rồi biến mất</text>' +
      '</svg>' },

    { t: 'h3', x: 'Giai đoạn 0 — ROM code' },

    { t: 'p', x:
      'Bên trong mọi SoC hiện đại có một vùng nhớ chỉ đọc, dung lượng vài chục kilobyte, đã được nạp ' +
      'sẵn phần mềm tại nhà máy. Vùng đó gọi là <b>boot ROM</b>, và bạn <b>không bao giờ sửa được nó</b> — ' +
      'nó là silicon, không phải file.' },

    { t: 'p', x:
      'Reset vector trỏ vào đây. ROM code làm ba việc, không hơn:' },

    { t: 'list', ordered: true, items: [
      'Đọc trạng thái các chân <b>boot pin</b> (còn gọi là boot strap) trên bo mạch để biết nên tìm ' +
      'phần mềm ở đâu: thẻ SD, eMMC, NAND, SPI flash, USB hay cổng serial.',
      'Đọc một đoạn nhỏ — thường vài chục KB — từ nguồn đó vào <b>SRAM nội</b> của chip.',
      'Nhảy vào đoạn vừa nạp.'
    ]},

    { t: 'cal', kind: 'why', x:
      '<p>Vì sao lại phải nạp vào SRAM nội chứ không phải RAM chính?</p>' +
      '<p>Vì DRAM — con chip nhớ dung lượng lớn gắn ngoài — <b>chưa hoạt động</b>. Muốn dùng nó, phải ' +
      'lập trình bộ điều khiển DRAM: cấp xung nhịp đúng tần số, nạp bảng tham số thời gian ' +
      '(CAS latency, refresh interval…), chạy quy trình hiệu chỉnh. Đó là hàng trăm dòng mã, và ' +
      'mã đó phải chạy ở <i>đâu đó</i>.</p>' +
      '<p>Lời giải của giới thiết kế chip: nhét một mẩu <b>SRAM</b> ngay trong SoC. SRAM không cần ' +
      'khởi tạo, dùng được ngay khi có điện — nhưng đắt và nóng, nên chỉ có vài chục tới vài trăm KB. ' +
      'Chính giới hạn dung lượng này đẻ ra giai đoạn 1.</p>' },

    { t: 'h3', x: 'Giai đoạn 1 — SPL, bootloader tầng một' },

    { t: 'p', x:
      '<b>SPL</b> (Secondary Program Loader) là một phiên bản U-Boot bị cắt gọt tới mức tối thiểu, ' +
      'đủ nhỏ để lọt vào SRAM nội. Nhiệm vụ của nó gần như chỉ có một:' },

    { t: 'list', ordered: true, items: [
      'Khởi tạo bộ điều khiển DRAM — sau bước này, RAM chính mới thật sự dùng được.',
      'Khởi tạo tối thiểu nguồn xung và cổng serial để có chỗ in thông báo lỗi.',
      'Đọc U-Boot đầy đủ từ thiết bị lưu trữ vào DRAM, rồi nhảy vào đó.'
    ]},

    { t: 'cal', kind: 'info', title: 'Vì sao phải chia hai tầng', x:
      '<p>Một câu hỏi phỏng vấn kinh điển. Câu trả lời nằm ở phép so kích thước:</p>' +
      '<ul>' +
      '<li>SRAM nội của SoC: thường <b>64 – 256 KB</b></li>' +
      '<li>U-Boot đầy đủ (có mạng, USB, hệ thống file, dòng lệnh): <b>500 KB – 1 MB</b></li>' +
      '</ul>' +
      '<p>U-Boot đầy đủ <i>không lọt</i> vào SRAM. Nhưng nó cần DRAM để chạy, mà muốn có DRAM lại ' +
      'phải chạy mã khởi tạo trước. Vòng luẩn quẩn này được cắt bằng cách chèn một tầng trung gian ' +
      'siêu nhỏ: SPL vừa lọt SRAM, và việc duy nhất nó làm là mở khoá DRAM cho tầng sau.</p>' },

    { t: 'h3', x: 'Giai đoạn 2 — U-Boot đầy đủ' },

    { t: 'p', x:
      'Giờ đã có hàng trăm megabyte DRAM, U-Boot mới thoải mái làm việc lớn. Đây là giai đoạn ' +
      'đầu tiên bạn <b>tương tác được</b>: nhấn phím bất kỳ trong lúc đếm ngược sẽ dừng tự động boot ' +
      'và cho bạn một dấu nhắc dòng lệnh.' },

    { t: 'table',
      head: ['U-Boot làm gì', 'Để làm gì'],
      rows: [
        ['Khởi tạo console serial đầy đủ', 'Để bạn nhìn thấy và gõ lệnh được'],
        ['Nạp driver storage, Ethernet, USB', 'Để tìm được kernel ở nhiều nguồn khác nhau'],
        ['Đọc biến môi trường (<code>bootcmd</code>, <code>bootargs</code>)', 'Kịch bản boot có thể sửa mà không cần biên dịch lại'],
        ['Chép <b>kernel</b> vào DRAM', 'Kernel phải nằm trong RAM mới chạy được'],
        ['Chép <b>Device Tree Blob</b> vào DRAM', 'Kernel cần bản mô tả phần cứng — Chặng 08'],
        ['Chép <b>initramfs</b> (nếu có) vào DRAM', 'Rootfs tạm để kernel có cái mà mount'],
        ['Nhảy vào kernel, truyền địa chỉ DTB', 'Bàn giao quyền điều khiển — U-Boot kết thúc tại đây']
      ]},

    { t: 'p', x:
      'Câu lệnh bàn giao trên ARM64 trông như thế này — bạn sẽ gõ nó thật ở Chặng 06:' },

    { t: 'code', where: 'uboot', lang: 'sh', nocopy: true, name: 'lệnh bàn giao của U-Boot', code:
      'booti 0x40200000 - 0x43000000',
      notes: [
        ['booti', 'Boot một ảnh kernel ARM64 định dạng <code>Image</code>'],
        ['0x40200000', 'Địa chỉ trong DRAM nơi kernel vừa được chép tới'],
        ['-', 'Vị trí của initramfs. Dấu gạch nghĩa là <b>không có</b>'],
        ['0x43000000', 'Địa chỉ của Device Tree Blob. Kernel nhận con số này qua thanh ghi <code>x0</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Điểm dễ nhầm', x:
      '<p>U-Boot <b>không</b> chạy song song với kernel, cũng <b>không</b> giám sát kernel. ' +
      'Sau lệnh <code>booti</code>, U-Boot ngừng tồn tại — vùng nhớ của nó sẽ bị kernel ghi đè. ' +
      'Nó giống người mở cửa rồi rời đi, không phải người quản lý toà nhà.</p>' },

    { t: 'h3', x: 'Giai đoạn 3 — Linux Kernel' },

    { t: 'p', x:
      'Đây là giai đoạn dài nhất và làm nhiều việc nhất. Theo thứ tự:' },

    { t: 'steps', items: [
      { title: 'Tự giải nén và thiết lập bộ nhớ ảo',
        blocks: [{ t: 'p', x:
          'Ảnh kernel thường được nén. Đoạn mã đầu tiên tự bung phần còn lại ra, rồi bật <b>MMU</b> và ' +
          'dựng bảng phân trang. Từ khoảnh khắc này trở đi, mọi địa chỉ đều là địa chỉ ảo — cơ chế ' +
          'bảo vệ bộ nhớ mà Bài 1 đã nhắc tới bắt đầu có hiệu lực.' }]},

      { title: 'Đọc Device Tree',
        blocks: [{ t: 'p', x:
          'Kernel lấy địa chỉ DTB từ thanh ghi <code>x0</code> và phân tích nó, để biết máy này có ' +
          'bao nhiêu CPU, RAM nằm ở đâu và dài bao nhiêu, có những thiết bị ngoại vi nào ở địa chỉ nào.' }]},

      { title: 'Khởi tạo các phân hệ và nạp driver',
        blocks: [{ t: 'p', x:
          'Scheduler, quản lý bộ nhớ, hệ thống file ảo, ngăn xếp mạng lần lượt được dựng lên. ' +
          'Sau đó kernel duyệt Device Tree, và với mỗi thiết bị tìm thấy, nó gọi hàm ' +
          '<code>probe()</code> của driver tương ứng. Toàn bộ Chặng 10 xoay quanh hàm này.' }]},

      { title: 'Mount root filesystem',
        blocks: [{ t: 'p', x:
          'Kernel dùng tham số <code>root=</code> nhận từ bootloader để tìm và gắn hệ thống file gốc ' +
          'vào <code>/</code>. Nếu bước này thất bại, mọi thứ dừng lại tại đây.' }]},

      { title: 'Chạy chương trình đầu tiên và tự giải phóng',
        blocks: [
          { t: 'p', x:
            'Kernel thực thi <code>/sbin/init</code> (hoặc đường dẫn trong tham số <code>init=</code>). ' +
            'Ngay trước đó, nó trả lại bộ nhớ của những đoạn mã chỉ dùng một lần lúc khởi động — ' +
            'và in ra dòng log đánh dấu mốc bàn giao:' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[    0.376880] Freeing unused kernel image (initmem) memory: 4852K' },
          { t: 'p', x:
            '<b>Hãy nhớ dòng này.</b> Nó là ranh giới chính xác giữa "kernel đang chạy" và ' +
            '"userspace bắt đầu". Ở phần thực hành bạn sẽ tự tìm thấy nó trên máy mình.' }
        ]}
    ]},

    { t: 'h3', x: 'Giai đoạn 4 — init, tiến trình số 1' },

    { t: 'p', x:
      'Chương trình đầu tiên chạy trong userspace mang PID 1 và là tổ tiên của mọi tiến trình khác. ' +
      'Nó gắn <code>/proc</code>, <code>/sys</code>, <code>/dev</code>, đọc file cấu hình, rồi lần lượt ' +
      'khởi chạy các dịch vụ.' },

    { t: 'p', x:
      'PID 1 có một đặc quyền và một trách nhiệm mà không tiến trình nào khác có:' },

    { t: 'list', items: [
      '<b>Đặc quyền:</b> nó không thể bị <code>kill</code> theo cách thông thường.',
      '<b>Trách nhiệm:</b> nếu nó thoát, kernel lập tức panic. Với PID 1, "chết" là không có lựa chọn.'
    ]},

    { t: 'table',
      head: ['Lựa chọn init', 'Kích thước', 'Phù hợp với'],
      rows: [
        ['BusyBox init', '~10 KB', 'Thiết bị nhỏ, boot nhanh, ít dịch vụ'],
        ['SysVinit', '~50 KB', 'Hệ thống cũ, script tuần tự'],
        ['systemd', '~5 MB', 'Thiết bị lớn, nhiều dịch vụ phụ thuộc nhau'],
        ['Chương trình của chính bạn', 'tuỳ', 'Thiết bị chỉ làm một việc duy nhất']
      ]},

    { t: 'p', x:
      'Bài 49 sẽ đi sâu vào từng lựa chọn. Máy WSL2 của bạn đang dùng systemd — bạn đã xác nhận ' +
      'điều đó ở Bài 1.' },

    { t: 'h3', x: 'Giai đoạn 5 — Ứng dụng' },

    { t: 'p', x:
      'Cuối cùng, phần mềm tạo ra giá trị thật của sản phẩm mới chạy: chương trình đọc cảm biến, ' +
      'giao diện web cấu hình, logic điều khiển. Năm giai đoạn trước tồn tại chỉ để phục vụ giai đoạn này.' },

    /* ══════════════════════════════════════════════
       3. BẢNG BÀN GIAO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Mỗi giai đoạn bàn giao cái gì' },

    { t: 'p', x:
      'Nếu bạn chỉ ghi nhớ một bảng trong bài này, hãy chọn bảng dưới đây. Cột "bàn giao" chính là ' +
      'thứ bị đứt gãy khi thiết bị không lên.' },

    { t: 'table',
      head: ['#', 'Ai chạy', 'Chạy ở đâu', 'Bàn giao gì cho giai đoạn sau'],
      rows: [
        ['0', 'ROM code', 'ROM trong SoC', 'SPL đã nằm sẵn trong SRAM'],
        ['1', 'SPL', 'SRAM nội', '<b>DRAM đã hoạt động</b> + U-Boot đã nằm trong DRAM'],
        ['2', 'U-Boot', 'DRAM', 'Kernel + DTB trong DRAM, <code>bootargs</code>, địa chỉ DTB qua <code>x0</code>'],
        ['3', 'Kernel', 'DRAM', 'Rootfs đã mount, driver đã nạp, MMU đã bật'],
        ['4', 'init (PID 1)', 'DRAM', '<code>/proc /sys /dev</code> đã gắn, dịch vụ đã chạy'],
        ['5', 'Ứng dụng', 'DRAM', '— (đích đến)']
      ]},

    /* ══════════════════════════════════════════════
       4. CHẨN ĐOÁN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chẩn đoán: thiết bị chết ở giai đoạn nào' },

    { t: 'p', x:
      'Đây là phần có giá trị nghề nghiệp cao nhất của bài học. Khi một board không lên, bạn thường ' +
      'chỉ có duy nhất một manh mối: <b>những gì cổng serial in ra trước khi im lặng</b>. ' +
      'Manh mối đó đủ để khoanh vùng.' },

    { t: 'fig',
      cap: 'Bảng tra nhanh theo triệu chứng. Nguyên tắc: giai đoạn cuối cùng còn in được log chính là giai đoạn đã chạy xong; lỗi nằm ở ngay giai đoạn kế tiếp.',
      svg:
      '<svg viewBox="0 0 720 296" width="720" role="img" aria-label="Bảng chẩn đoán lỗi khởi động theo triệu chứng">' +
        /* hàng 1 */
        '<rect class="d-box" x="16" y="14" width="392" height="44" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-w" x="452" y="14" width="252" height="44" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="34" y="41">Console im lặng tuyệt đối</text>' +
        '<text class="d-t"  x="470" y="35">Giai đoạn 0 – 1</text>' +
        '<text class="d-ts" x="470" y="50">ROM code / SPL / nguồn điện</text>' +
        '<path class="d-line" d="M410 36 H442" stroke-width="1.5"/><path class="d-arrow" d="M442 31 l10 5 -10 5 z"/>' +

        /* hàng 2 */
        '<rect class="d-box" x="16" y="70" width="392" height="44" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-w" x="452" y="70" width="252" height="44" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="34" y="97">Có log U-Boot rồi dừng hẳn</text>' +
        '<text class="d-t"  x="470" y="91">Giai đoạn 2</text>' +
        '<text class="d-ts" x="470" y="106">Không tìm/nạp được kernel</text>' +
        '<path class="d-line" d="M410 92 H442" stroke-width="1.5"/><path class="d-arrow" d="M442 87 l10 5 -10 5 z"/>' +

        /* hàng 3 */
        '<rect class="d-box" x="16" y="126" width="392" height="44" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-p" x="452" y="126" width="252" height="44" rx="8" stroke-width="2"/>' +
        '<text class="d-t"  x="34" y="146">Boot kernel xong rồi im,</text>' +
        '<text class="d-t"  x="34" y="162">không một dòng log nào</text>' +
        '<text class="d-t"  x="470" y="147">Giai đoạn 3</text>' +
        '<text class="d-ts" x="470" y="162">Sai console= hoặc sai DTB</text>' +
        '<path class="d-line" d="M410 148 H442" stroke-width="1.5"/><path class="d-arrow" d="M442 143 l10 5 -10 5 z"/>' +

        /* hàng 4 */
        '<rect class="d-box" x="16" y="182" width="392" height="44" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-a" x="452" y="182" width="252" height="44" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="34" y="209">Kernel panic: no init found</text>' +
        '<text class="d-t"  x="470" y="203">Giai đoạn 4</text>' +
        '<text class="d-ts" x="470" y="218">Rootfs sai, thiếu, hoặc hỏng</text>' +
        '<path class="d-line" d="M410 204 H442" stroke-width="1.5"/><path class="d-arrow" d="M442 199 l10 5 -10 5 z"/>' +

        /* hàng 5 */
        '<rect class="d-box" x="16" y="238" width="392" height="44" rx="8" stroke-width="1.5"/>' +
        '<rect class="d-box-g" x="452" y="238" width="252" height="44" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="34" y="265">Vào được shell, app không chạy</text>' +
        '<text class="d-t"  x="470" y="259">Giai đoạn 5</text>' +
        '<text class="d-ts" x="470" y="274">Cấu hình dịch vụ, thiếu thư viện</text>' +
        '<path class="d-line" d="M410 260 H442" stroke-width="1.5"/><path class="d-arrow" d="M442 255 l10 5 -10 5 z"/>' +
      '</svg>' },

    { t: 'cal', kind: 'tip', title: 'Quy tắc vàng khi board không lên', x:
      '<p>Đọc dòng log <b>cuối cùng</b> in ra được. Giai đoạn tạo ra dòng đó đã chạy xong; ' +
      'thủ phạm nằm ở ngay giai đoạn kế tiếp. Kỹ thuật này giúp bạn thu hẹp phạm vi từ ' +
      '"cả hệ thống" xuống còn một mắt xích, trước khi động tới bất kỳ công cụ nào.</p>' },

    { t: 'cal', kind: 'warn', title: 'Triệu chứng dễ đánh lừa nhất', x:
      '<p>Hàng thứ ba trong bảng — <i>boot kernel xong rồi im lặng</i> — là cái bẫy phổ biến nhất ' +
      'với người mới. Người ta tưởng kernel chết, nhưng rất thường là kernel <b>vẫn đang chạy hoàn ' +
      'toàn bình thường</b>, chỉ là nó in log ra một cổng serial khác với cổng bạn đang cắm dây.</p>' +
      '<p>Thủ phạm là tham số <code>console=</code> trong <code>bootargs</code>. Bài 41 sẽ mổ xẻ ' +
      'tham số này.</p>' },

    /* ══════════════════════════════════════════════
       5. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: đọc luồng khởi động thật' },

    { t: 'p', x:
      'WSL2 bỏ qua giai đoạn 0, 1, 2 — bạn đã biết lý do từ Bài 1. Nhưng giai đoạn 3, 4, 5 thì hoàn ' +
      'toàn thật, và log của chúng vẫn còn nguyên. Chúng ta sẽ đọc chúng, rồi dùng QEMU để nhìn ' +
      'thấy khoảnh khắc mili-giây thứ nhất mà WSL2 không có.' },

    { t: 'steps', items: [

      { title: 'Xem thứ mà "bootloader" đã truyền vào kernel',
        blocks: [
          { t: 'p', x:
            'Ở giai đoạn 2, U-Boot truyền một chuỗi tham số cho kernel qua <code>bootargs</code>. ' +
            'Kernel lưu lại chuỗi đó và phơi ra trong <code>/proc</code>. WSL2 không có U-Boot, nhưng ' +
            'Windows làm thay đúng việc này:' },
          { t: 'code', where: 'wsl', code:
            'cat /proc/cmdline' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'initrd=\\initrd.img WSL_ROOT_INIT=1 panic=-1 nr_cpus=6\n' +
            'hv_utils.timesync_implicit=1 console=hvc0 debug pty.legacy_count=0\n' +
            'WSL_ENABLE_CRASH_DUMP=1' },

          { t: 'p', x: 'Hãy soi ba tham số quen thuộc với dân nhúng:' },
          { t: 'table',
            head: ['Tham số', 'Ý nghĩa'],
            rows: [
              ['<code>console=hvc0</code>',
               'Kernel in log ra thiết bị <code>hvc0</code>. Trên board thật đây thường là ' +
               '<code>ttyS0</code> hoặc <code>ttyAMA0</code>. <b>Đây chính là tham số gây ra cái bẫy ' +
               '"kernel im lặng"</b> nói ở trên'],
              ['<code>initrd=\\initrd.img</code>',
               'Rootfs tạm nạp cùng kernel — đúng vai trò của initramfs ở giai đoạn 3'],
              ['<code>nr_cpus=6</code>',
               'Giới hạn số CPU. Con số này đến từ <code>.wslconfig</code> bạn đã cấu hình'],
              ['<code>panic=-1</code>',
               'Khi panic thì reboot ngay lập tức thay vì treo. Cấu hình rất hay gặp trên thiết bị nhúng']
            ]},

          { t: 'cal', kind: 'why', x:
            '<p>Vì sao chuỗi này quan trọng đến vậy?</p>' +
            '<p>Vì đây là <b>toàn bộ những gì bootloader nói với kernel</b>. Kernel không tự đoán được ' +
            'rootfs nằm ở đâu hay phải in log ra đâu — nó chỉ biết những gì được truyền vào. ' +
            'Một ký tự sai ở đây đủ làm cả hệ thống không boot, và bạn sẽ không nhận được lời cảnh ' +
            'báo nào.</p>' }
        ]},

      { title: 'Đọc dòng log đầu tiên của kernel',
        blocks: [
          { t: 'p', x:
            'Kernel ghi mọi thông báo vào một vùng đệm vòng trong bộ nhớ. Lệnh <code>dmesg</code> ' +
            'in vùng đệm đó ra.' },
          { t: 'code', where: 'wsl', code:
            'dmesg | head -3' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[    0.000000] Linux version 6.18.33.2-microsoft-standard-WSL2 ...\n' +
            '[    0.000000] Command line: initrd=\\initrd.img WSL_ROOT_INIT=1 ...\n' +
            '[    0.000000] KERNEL supported cpus:' },

          { t: 'cmdx', cmd: 'dmesg | head -3', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['dmesg', 'Viết tắt của <i>display message</i>. In vùng đệm log của kernel.',
               'Đây là công cụ chẩn đoán số một khi làm việc với driver. Bạn sẽ gõ nó hàng nghìn lần.'],
              ['[ 0.000000]', 'Không phải tham số — đây là dấu thời gian tính bằng giây kể từ khi kernel bắt đầu chạy.',
               'Ba dòng đầu đều là <code>0.000000</code> vì chúng được in trước khi bộ đếm thời gian kịp hoạt động.'],
              ['head -3', 'Chỉ lấy 3 dòng đầu.',
               'Bỏ nó đi thì hàng trăm dòng sẽ trôi qua màn hình.']
            ]},

          { t: 'p', x:
            'Dòng thứ hai đáng chú ý: kernel <b>in lại chính chuỗi cmdline</b> mà nó nhận được. ' +
            'Trên board thật, đây là cách nhanh nhất để kiểm chứng bootloader có truyền đúng tham số ' +
            'hay không.' },

          { t: 'cal', kind: 'info', title: 'Còn hai dòng kia thì sao', x:
            '<p>Dòng đầu tiên — <code>Linux version 6.18.33.2-microsoft-standard-WSL2</code> — là ' +
            'đúng chuỗi bạn đã đọc được ở <b>Bài 1</b> bằng lệnh <code>uname -a</code>. Điểm khác ' +
            'nhau nằm ở <b>cách lấy</b>: <code>uname</code> hỏi thẳng kernel đang chạy ngay lúc bạn ' +
            'gõ lệnh, còn dòng này là một <b>bản ghi log cố định</b> — kernel chỉ in nó đúng một lần, ' +
            'tại thời điểm khởi động, rồi giữ nguyên trong vùng đệm vòng suốt phiên làm việc. Hai ' +
            'cách hỏi khác nhau, cùng xác nhận một sự thật.</p>' +
            '<p>Dòng thứ ba bị cắt cụt vì <code>head -3</code>: <code>KERNEL supported cpus:</code> ' +
            'chỉ là <b>tiêu đề</b> của một danh sách — các dòng liệt kê chủng loại CPU x86 mà kernel ' +
            'này biết cách hỗ trợ nằm ngay sau đó, nhưng không lọt vào ba dòng đầu. Bỏ ' +
            '<code>| head -3</code> đi nếu bạn muốn xem trọn danh sách.</p>' }
        ]},

      { title: 'Tìm chính xác mốc bàn giao sang userspace',
        blocks: [
          { t: 'p', x:
            'Bây giờ tới phần thú vị nhất: xác định khoảnh khắc giai đoạn 3 kết thúc và giai đoạn 4 ' +
            'bắt đầu, tính bằng phần nghìn giây.' },
          { t: 'code', where: 'wsl', code:
            'dmesg | grep "Freeing unused kernel image"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '[    0.376880] Freeing unused kernel image (initmem) memory: 4852K\n' +
            '[    0.377979] Freeing unused kernel image (text/rodata gap) memory: 300K\n' +
            '[    0.378833] Freeing unused kernel image (rodata/data gap) memory: 1564K' },

          { t: 'cal', kind: 'info', title: 'Bạn vừa đọc được gì', x:
            '<p>Tại giây thứ <b>0,377</b>, kernel đã hoàn tất mọi việc khởi tạo và trả lại ' +
            '<b>4852 KB</b> bộ nhớ chứa mã chỉ dùng một lần. Ngay sau dòng này, tiến trình PID 1 bắt đầu.</p>' +
            '<p>Nói cách khác: giai đoạn 3 trên máy bạn kéo dài <b>377 mili-giây</b>. Ở Chặng 12 bạn ' +
            'sẽ học cách bóp con số này xuống.</p>' },

          { t: 'p', x:
            'Giờ đo giai đoạn 4 — phần userspace:' },
          { t: 'code', where: 'wsl', code:
            'systemd-analyze' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Startup finished in 2.456s (userspace)\n' +
            'graphical.target reached after 2.455s in userspace.' },
          { t: 'p', x:
            'Đối chiếu hai con số: kernel mất 0,38 giây, userspace mất 2,46 giây. ' +
            '<b>Phần chậm nằm ở userspace, không phải kernel</b> — và đó là kết luận rất thường gặp ' +
            'khi tối ưu thời gian boot ngoài đời thật.' },

          { t: 'p', x: 'Muốn biết dịch vụ nào ngốn thời gian nhất:' },
          { t: 'code', where: 'wsl', code:
            'systemd-analyze blame | head -5' },
          { t: 'p', x:
            'Trên máy bạn, thủ phạm lớn nhất chiếm khoảng 1,2 giây — chỉ riêng nó đã bằng ba lần ' +
            'toàn bộ giai đoạn kernel.' }
        ]},

      { title: 'Nhìn cây tiến trình mọc ra từ PID 1',
        blocks: [
          { t: 'p', x:
            'Giai đoạn 4 sinh ra mọi thứ chạy trên máy. Hãy nhìn cái cây đó:' },
          { t: 'code', where: 'wsl', code:
            'pstree -p 1 | head -8' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'systemd(1)-+-agetty(279)\n' +
            '           |-chronyd-starter(114)---chronyd(219)---chronyd(226)\n' +
            '           |-cron(115)\n' +
            '           |-dbus-daemon(116)\n' +
            '           |-login(321)---bash(393)' },

          { t: 'cmdx', cmd: 'pstree -p 1', title: 'Mổ xẻ câu lệnh',
            rows: [
              ['pstree', 'Hiển thị các tiến trình dưới dạng cây thay vì danh sách phẳng.', ''],
              ['-p', 'Kèm theo số PID của từng tiến trình.',
               'Không có nó thì bạn thấy tên nhưng không biết PID để mà <code>kill</code>.'],
              ['1', 'Bắt đầu vẽ cây từ PID 1.',
               'Bỏ số 1 đi thì <code>pstree</code> vẽ từ tiến trình gốc của toàn hệ thống — trong WSL2 kết quả gần như giống nhau.']
            ]},

          { t: 'p', x:
            'Mỗi nhánh trong cây này là một dịch vụ do PID 1 khởi chạy. Trên một thiết bị nhúng gọn ' +
            'gàng, cây này chỉ có <b>ba đến năm nhánh</b>. Ở đây nó rậm rạp vì Ubuntu là bản phân phối ' +
            'cho máy tính cá nhân — đúng sự khác biệt mà Bài 1 đã mô tả.' },

          { t: 'cal', kind: 'info', title: 'Đọc đúng năm nhánh trong output', x:
            '<p>Output liệt kê đúng năm nhánh con trực tiếp của <code>systemd(1)</code>: ' +
            '<code>agetty</code> (chờ đăng nhập trên một terminal ảo), <code>chronyd-starter</code> ' +
            '— sinh ra một tiến trình <code>chronyd</code> con, rồi chính tiến trình đó lại sinh ' +
            'thêm một <code>chronyd</code> nữa (chuỗi cha–con hai tầng, đến từ cơ chế <code>fork</code> ' +
            'mà Bài 20 sẽ mổ xẻ), <code>cron</code> (chạy tác vụ theo lịch), <code>dbus-daemon</code> ' +
            '(kênh giao tiếp giữa các tiến trình), và <code>login</code> với <code>bash</code> làm ' +
            'con của nó — chính là phiên bạn đang gõ lệnh ngay bây giờ.</p>' +
            '<p>Đây là bảng "Mỗi giai đoạn bàn giao cái gì" ở đầu bài, nhìn thấy tận mắt: mục ' +
            '<code>chạy service</code> của giai đoạn 4 không phải một câu mô tả trừu tượng, mà chính ' +
            'là năm nhánh này.</p>' +
            '<p>Các số trong ngoặc là PID thật của máy này lúc chạy lệnh, sẽ khác trên máy bạn — chỉ ' +
            'tên tiến trình và hình dạng cây là thứ bạn nên nhận ra giống hệt.</p>' }
        ]},

      { title: 'Nhìn thấy mili-giây thứ nhất mà WSL2 không có',
        blocks: [
          { t: 'p', x:
            'Bốn bước trên đều bắt đầu từ giai đoạn 3. Để thấy giai đoạn 0 — khoảnh khắc CPU vừa reset ' +
            'và chưa chạy bất kỳ lệnh nào — ta cần QEMU, vì QEMU cho phép <b>đóng băng CPU trước lệnh ' +
            'đầu tiên</b>.' },

          { t: 'code', where: 'wsl', name: 'dừng CPU ngay tại reset vector', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -display none -serial null -monitor stdio -S' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 -M virt -cpu cortex-a57 -display none -serial null -monitor stdio -S',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['-M virt', 'Bo mạch ảo của QEMU — đã dùng ở Bài 1.', ''],
              ['-cpu cortex-a57', 'Lõi CPU ARM64.', ''],
              ['-display none', 'Không mở cửa sổ đồ hoạ.', ''],
              ['-serial null', 'Vứt bỏ cổng serial ảo.',
               'Bắt buộc phải có. Nếu thiếu, cả serial lẫn monitor cùng giành lấy terminal và QEMU sẽ báo <code>cannot use stdio by multiple character devices</code>.'],
              ['-monitor stdio', 'Đưa <b>QEMU monitor</b> — bảng điều khiển máy ảo — vào terminal của bạn.',
               'Từ đây bạn ra lệnh cho chính cỗ máy ảo, không phải cho hệ điều hành bên trong nó.'],
              ['-S', 'Viết tắt của <i>stop</i>. Tạo máy xong nhưng <b>không cho CPU chạy</b>.',
               'Đây là tuỳ chọn then chốt của bước này. Bạn sẽ gặp lại nó ở Chặng 12 khi debug kernel bằng GDB.']
            ]},

          { t: 'p', x:
            'Bạn sẽ thấy dấu nhắc <code>(qemu)</code>. Gõ lệnh sau rồi Enter:' },
          { t: 'code', where: 'qemu', lang: 'sh', code:
            'info registers' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, name: 'trạng thái CPU trước lệnh đầu tiên', code:
            'CPU#0\n' +
            ' PC=0000000000000000 X00=0000000000000000 X01=0000000000000000\n' +
            'X02=0000000000000000 X03=0000000000000000 X04=0000000000000000\n' +
            'X05=0000000000000000 X06=0000000000000000 X07=0000000000000000' },

          { t: 'cal', kind: 'why', title: 'Đây chính là điểm khởi đầu của mọi thứ', x:
            '<p><code>PC</code> là <i>Program Counter</i> — thanh ghi giữ địa chỉ của lệnh sắp thực thi. ' +
            'Nó đang bằng <b>0</b>. Toàn bộ thanh ghi đa dụng <code>X00</code>–<code>X30</code> cũng ' +
            'bằng 0.</p>' +
            '<p>Đây là bức ảnh chụp giai đoạn 0 nói ở đầu bài: CPU không biết gì, không có hệ điều hành, ' +
            'không có chương trình, chỉ có một địa chỉ để bắt đầu. Trên SoC thật, địa chỉ đó trỏ vào ' +
            'boot ROM. Trong QEMU <code>virt</code>, nó trỏ vào nơi bạn nạp firmware qua tuỳ chọn ' +
            '<code>-bios</code> — và ở Chặng 06, thứ bạn nạp vào đó sẽ là U-Boot do chính bạn build.</p>' },

          { t: 'p', x: 'Thoát QEMU:' },
          { t: 'code', where: 'qemu', lang: 'sh', code:
            'quit' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       6. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>cannot use stdio by multiple character devices</code>',
         'Thiếu <code>-serial null</code>, cổng serial và monitor cùng giành terminal',
         'Thêm <code>-serial null</code> vào dòng lệnh QEMU'],
        ['QEMU mở ra rồi treo, gõ gì cũng không được',
         'Quên <code>-monitor stdio</code> nên không có dấu nhắc <code>(qemu)</code>',
         'Nhấn <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> để thoát, sau đó thêm lại tuỳ chọn'],
        ['<code>dmesg: read kernel buffer failed: Operation not permitted</code>',
         'Một số bản phân phối chặn <code>dmesg</code> với người dùng thường',
         'Dùng <code>sudo dmesg</code>. Trên WSL2 Ubuntu của bạn thì không cần'],
        ['<code>systemd-analyze: command not found</code>',
         'Hệ thống không dùng systemd',
         'Bỏ qua bước đó — điều này bình thường trên thiết bị nhúng dùng BusyBox init'],
        ['<code>pstree: command not found</code>',
         'Chưa cài gói psmisc',
         'Chạy <code>sudo apt install psmisc</code>'],
        ['<code>dmesg</code> trống trơn',
         'Vùng đệm log đã bị ghi đè hết vì máy chạy lâu',
         'Khởi động lại WSL bằng <code>wsl --shutdown</code> ở PowerShell rồi mở lại']
      ]},

    /* ══════════════════════════════════════════════
       7. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Khởi động là chuỗi <b>sáu lần bàn giao</b>: ROM code → SPL → U-Boot → Kernel → init → Ứng dụng.',
      'Phải boot nhiều tầng vì <b>SRAM nội quá nhỏ</b> cho U-Boot đầy đủ, mà U-Boot lại cần DRAM — ' +
      'SPL sinh ra chỉ để cắt vòng luẩn quẩn đó.',
      'Bootloader nói với kernel qua <b>bootargs</b>; kernel giữ lại chuỗi đó trong <code>/proc/cmdline</code>.',
      'Dòng <code>Freeing unused kernel image (initmem)</code> là <b>ranh giới chính xác</b> giữa kernel và userspace.',
      'PID 1 không được phép chết — nếu nó thoát, kernel panic ngay.',
      'Chẩn đoán bằng cách đọc <b>dòng log cuối cùng</b>: giai đoạn tạo ra nó đã xong, lỗi nằm ở giai đoạn kế tiếp.',
      'Bẫy phổ biến nhất là kernel vẫn chạy tốt nhưng in log ra cổng serial khác — thủ phạm là <code>console=</code>.',
      'Trên máy bạn: kernel mất <b>0,38 giây</b>, userspace mất <b>2,46 giây</b>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 3 — Môi trường học: WSL2 và QEMU.</b> Bạn đã dùng cả hai công cụ này rồi, nhưng chưa ' +
      'biết chúng thật sự là gì. Bài tới sẽ mổ xẻ: WSL2 là máy ảo chứ không phải lớp giả lập; vì sao ' +
      'làm việc trong <code>/mnt/c</code> chậm hơn <b>50 lần</b> — có số đo thật trên máy bạn; ' +
      'khác biệt giữa giả lập và ảo hoá; và vì sao dù máy bạn có <code>/dev/kvm</code>, QEMU ARM64 ' +
      'vẫn không dùng được nó.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Vì sao giai đoạn đầu tiên phải chạy trong <b>SRAM nội</b> của SoC thay vì trong RAM chính?',
      opts: [
        'Vì SRAM nhanh hơn DRAM nên khởi động sẽ nhanh hơn',
        'Vì DRAM chưa dùng được — bộ điều khiển DRAM chưa được khởi tạo',
        'Vì SRAM được bảo vệ khỏi virus tốt hơn',
        'Vì DRAM chỉ dùng được sau khi kernel đã chạy'
      ],
      a: 1,
      why: 'DRAM cần được cấp xung nhịp, nạp bảng tham số thời gian và hiệu chỉnh trước khi dùng được. ' +
           'Mã làm việc đó phải chạy ở đâu đó, nên nhà thiết kế chip nhét sẵn một mẩu SRAM vào SoC — ' +
           'SRAM dùng được ngay khi có điện, không cần khởi tạo.'
    },
    {
      q: 'Vì sao cần <b>SPL</b> thay vì để ROM code nạp thẳng U-Boot đầy đủ?',
      opts: [
        'Vì ROM code không biết đọc thẻ nhớ SD',
        'Vì U-Boot đầy đủ (500 KB – 1 MB) không lọt vào SRAM nội (64 – 256 KB)',
        'Vì SPL chạy nhanh hơn U-Boot',
        'Vì luật bản quyền không cho phép nhúng U-Boot vào ROM'
      ],
      a: 1,
      why: 'Đây là bài toán vòng luẩn quẩn: U-Boot đầy đủ cần DRAM mới chạy nổi, nhưng muốn có DRAM ' +
           'thì phải chạy mã khởi tạo trước. SPL là tầng trung gian đủ nhỏ để lọt SRAM, và việc duy ' +
           'nhất nó làm là bật DRAM lên cho tầng sau.'
    },
    {
      q: 'Dòng log <code>Freeing unused kernel image (initmem) memory</code> đánh dấu điều gì?',
      opts: [
        'Kernel đang bị thiếu bộ nhớ và phải giải phóng bớt',
        'Kernel vừa hoàn tất khởi tạo và sắp bàn giao cho userspace',
        'Kernel vừa gỡ bỏ một module không dùng tới',
        'Rootfs vừa được mount thành công'
      ],
      a: 1,
      why: 'Kernel có nhiều đoạn mã chỉ dùng một lần lúc khởi động. Sau khi dùng xong, nó trả lại vùng ' +
           'nhớ đó rồi chạy PID 1. Vì vậy dòng này là ranh giới chính xác giữa giai đoạn 3 và giai đoạn 4 — ' +
           'một mốc rất hữu ích khi đo thời gian boot.'
    },
    {
      q: 'Một board in đầy đủ log U-Boot, hiện dòng <code>Starting kernel ...</code>, rồi im lặng hoàn toàn. Khả năng cao nhất là gì?',
      opts: [
        'CPU đã cháy',
        'Rootfs bị hỏng',
        'Kernel vẫn chạy nhưng in log ra cổng serial khác — sai tham số <code>console=</code>',
        'U-Boot không nạp được kernel vào RAM'
      ],
      a: 2,
      why: 'Đây là cái bẫy phổ biến nhất với người mới. U-Boot đã in được nghĩa là giai đoạn 2 hoàn tất ' +
           'và kernel đã được nạp. Triệu chứng im lặng ngay sau đó thường không phải kernel chết, mà là ' +
           'kernel đang nói chuyện qua một cổng serial khác với cổng bạn đang cắm dây. Kiểm tra tham số ' +
           '<code>console=</code> trong <code>bootargs</code> trước tiên.'
    },
    {
      q: 'Điều gì xảy ra nếu tiến trình PID 1 thoát?',
      opts: [
        'Kernel tự khởi chạy lại nó',
        'Hệ thống chuyển sang chế độ single-user',
        'Kernel panic ngay lập tức',
        'Không sao cả, tiến trình khác sẽ thay thế'
      ],
      a: 2,
      why: 'PID 1 là tổ tiên của mọi tiến trình. Kernel coi việc nó thoát là tình huống không thể phục hồi ' +
           'và panic ngay. Đây là lý do chương trình init phải được viết cực kỳ cẩn thận — với PID 1, ' +
           '"chết" không phải là một lựa chọn.'
    },
    {
      q: 'Tuỳ chọn <code>-S</code> của QEMU dùng để làm gì?',
      opts: [
        'Chạy QEMU ở chế độ im lặng, không in log',
        'Tạo máy ảo xong nhưng không cho CPU chạy, để soi trạng thái trước lệnh đầu tiên',
        'Lưu trạng thái máy ảo ra file',
        'Bật chế độ bảo mật secure boot'
      ],
      a: 1,
      why: '<code>-S</code> là viết tắt của <i>stop</i>. Nó đóng băng CPU ngay tại reset vector, cho phép ' +
           'bạn nhìn thấy trạng thái ban đầu (<code>PC = 0</code>, mọi thanh ghi bằng 0). Bạn sẽ gặp lại ' +
           'tuỳ chọn này ở Chặng 12 khi debug kernel bằng GDB — lúc đó nó dùng để gắn debugger vào trước ' +
           'khi kernel kịp chạy.'
    }
  ]
});

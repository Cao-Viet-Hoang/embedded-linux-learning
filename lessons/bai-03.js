/* ============================================================
   BÀI 3 — Môi trường học: WSL2 và QEMU
   Chặng 00 · Nhập môn
   ============================================================ */
Lesson.register({
  id: 'bai-03',
  title: 'Môi trường học: WSL2 và QEMU',
  minutes: 45,
  practice: 'Thực hành 25 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Hai bài trước bạn đã gõ lệnh trong WSL2 và chạy QEMU, nhưng chưa biết chúng thật sự là gì. ' +
    'Bài này mổ xẻ cả hai. Bạn sẽ tự tay đo được một con số gây sốc — <b>làm việc sai thư mục ' +
    'chậm hơn 50 lần</b> — và tự chứng minh vì sao dù máy bạn có <code>/dev/kvm</code>, ' +
    'QEMU ARM64 vẫn không dùng được nó. Đây là bài cuối của Chặng 0: sau bài này, môi trường học ' +
    'của bạn đã sẵn sàng và bạn hiểu rõ nó.',

  goals: [
    'Giải thích được WSL2 là máy ảo thật sự, không phải lớp mô phỏng như WSL1',
    'Phân biệt hai hệ thống file trong WSL2 và biết tuyệt đối không được đặt code ở đâu',
    'Nêu được ba việc WSL2 không làm được, và vì sao chính ba việc đó buộc ta cần QEMU',
    'Phân biệt giả lập (emulation) và ảo hoá (virtualization), giải thích được vì sao ARM64 trên máy x86 luôn là giả lập',
    'Phân biệt qemu-user và qemu-system, biết khi nào dùng cái nào',
    'Chạy được một chương trình ARM64 trên máy x86 và giải thích chuyện gì vừa xảy ra'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. WSL2 THẬT SỰ LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'WSL2 thật sự là cái gì' },

    { t: 'p', x:
      'Cái tên <b>Windows Subsystem for Linux</b> gây hiểu nhầm. Nó gợi ý một lớp dịch chuyển các lệnh ' +
      'Linux thành lệnh Windows. Điều đó đúng với <b>WSL1</b>, nhưng WSL2 là chuyện hoàn toàn khác.' },

    { t: 'p', x:
      'WSL2 là một <b>máy ảo thật sự</b> chạy trên Hyper-V, bên trong nó là một <b>kernel Linux thật</b> ' +
      'do Microsoft biên dịch từ mã nguồn chính thức. Không có phép dịch nào cả — khi bạn gọi ' +
      '<code>open()</code>, một hàm kernel Linux thật sự chạy.' },

    { t: 'fig',
      cap: 'Kiến trúc WSL2. Kernel bên trong là kernel Linux thật, nhưng bạn không kiểm soát nó — đó là ranh giới quyết định mọi thứ bạn học được và không học được trên WSL2.',
      svg:
      '<svg viewBox="0 0 720 322" width="720" role="img" aria-label="Kiến trúc phân lớp của WSL2">' +
        /* khung máy ảo */
        '<rect class="d-box-p" x="32" y="16" width="420" height="182" rx="10" stroke-width="2"/>' +
        '<text class="d-ts" x="48" y="38">MÁY ẢO WSL2 · chạy trên Hyper-V</text>' +

        '<rect class="d-box-g" x="56" y="50" width="372" height="58" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="72" y="76">Ubuntu — bash, gcc, qemu, thư viện</text>' +
        '<text class="d-ts" x="72" y="94">rootfs nằm trong file ext4.vhdx trên ổ Windows</text>' +

        '<rect class="d-box-a" x="56" y="122" width="372" height="58" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="72" y="148">Kernel Linux 6.18 (bản Microsoft build)</text>' +
        '<text class="d-tm" x="72" y="166">6.18.33.2-microsoft-standard-WSL2</text>' +

        /* hạ tầng */
        '<rect class="d-box" x="32" y="214" width="420" height="44" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="48" y="241">Hyper-V + Windows 11</text>' +

        '<rect class="d-box" x="32" y="272" width="420" height="40" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="48" y="297">Phần cứng — CPU x86-64</text>' +

        /* chú thích bên phải */
        '<path class="d-line" d="M430 79 H466" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="472" y="76">Nơi bạn gõ lệnh và biên dịch.</text>' +
        '<text class="d-ts" x="472" y="92">Đây là phần bạn toàn quyền thay đổi</text>' +

        '<path class="d-line" d="M430 151 H466" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="472" y="145">Kernel Linux THẬT — không phải mô phỏng.</text>' +
        '<text class="d-ts" x="472" y="161">Nhưng do Microsoft build sẵn:</text>' +
        '<text class="d-ts" x="472" y="177">bạn không sửa, không build lại được</text>' +

        '<path class="d-line" d="M454 236 H466" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="472" y="233">Nạp thẳng kernel vào RAM ảo —</text>' +
        '<text class="d-ts" x="472" y="249">không có ROM code, SPL hay U-Boot</text>' +

        '<path class="d-line" d="M454 292 H466" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="472" y="296">Kiến trúc x86-64, không phải ARM</text>' +
      '</svg>' },

    { t: 'p', x:
      'Bằng chứng WSL2 là máy ảo thật nằm ngay trong log khởi động mà bạn đã đọc ở Bài 2. ' +
      'Kernel in ra bảng bộ nhớ vật lý do "BIOS" cung cấp:' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '[    0.000000] BIOS-provided physical RAM map:\n' +
      '[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009ffff] usable' },

    { t: 'cal', kind: 'why', x:
      '<p>Chỉ một máy tính <b>thật hoặc ảo</b> mới có bảng e820 — đó là cấu trúc dữ liệu firmware ' +
      'PC dùng để báo cho hệ điều hành biết RAM nằm ở đâu. Một lớp dịch lệnh sẽ không bao giờ tạo ra ' +
      'thứ này. Kernel trong WSL2 tin rằng nó đang chạy trên một máy tính, vì nó thật sự đang ' +
      'chạy trên một máy tính — chỉ là máy tính đó bằng phần mềm.</p>' },

    /* ══════════════════════════════════════════════
       2. HAI HỆ THỐNG FILE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai hệ thống file và cái bẫy 50 lần' },

    { t: 'p', x:
      'Bên trong WSL2 có hai vùng lưu trữ hoàn toàn khác nhau về bản chất, và người mới gần như ' +
      'luôn chọn nhầm vùng.' },

    { t: 'table',
      head: ['', 'Hệ thống file gốc', 'Ổ đĩa Windows'],
      rows: [
        ['Đường dẫn', '<code>/home/&lt;bạn&gt;</code>, <code>/opt</code>, <code>/usr</code>…', '<code>/mnt/c</code>, <code>/mnt/d</code>…'],
        ['Bản chất', 'ext4 thật, nằm trong file <code>ext4.vhdx</code>', 'Chuyển tiếp qua giao thức mạng 9P sang NTFS'],
        ['Quyền Linux', 'Đầy đủ: chủ sở hữu, nhóm, bit thực thi, symlink', 'Giả lập một phần, hay hỏng'],
        ['Tốc độ nhiều file nhỏ', '<b>Rất nhanh</b>', '<b>Rất chậm</b>'],
        ['Dùng để', 'Toàn bộ code, kernel source, build tree', 'Chỉ để trao đổi file với Windows']
      ]},

    { t: 'cal', kind: 'danger', title: 'Quy tắc không được vi phạm', x:
      '<p>Đừng bao giờ đặt mã nguồn, thư mục build, hay bản sao kernel trong <code>/mnt/c</code>.</p>' +
      '<p>Build một kernel Linux tạo ra khoảng <b>60.000 file</b>. Ở phần thực hành bạn sẽ đo được ' +
      'độ chênh: tạo 500 file mất <b>0,017 giây</b> ở thư mục gốc nhưng <b>0,882 giây</b> ở ' +
      '<code>/mnt/c</code> — chậm hơn <b>52 lần</b>. Nhân con số đó với 60.000 file: một bản build ' +
      '20 phút sẽ biến thành nhiều giờ.</p>' +
      '<p>Ngoài ra, <code>/mnt/c</code> không giữ đúng quyền thực thi và symlink của Linux, ' +
      'khiến nhiều bản build thất bại theo những cách rất khó truy nguyên.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao 9P lại chậm đến vậy', x:
      '<p><b>9P</b> là một giao thức <i>mạng</i> để chia sẻ file, dù ở đây hai đầu nằm trên cùng một máy. ' +
      'Mỗi thao tác — mở file, ghi, đóng, hỏi kích thước — đều là một lượt hỏi-đáp giữa máy ảo Linux ' +
      'và Windows.</p>' +
      '<p>Với vài file lớn, chi phí đó không đáng kể. Với hàng chục nghìn file bé, chi phí mỗi lượt ' +
      'nhân lên thành thảm hoạ. Đó chính xác là hình dạng của một bản build phần mềm: ' +
      'rất nhiều file rất nhỏ.</p>' },

    /* ══════════════════════════════════════════════
       3. BA THỨ WSL2 KHÔNG LÀM ĐƯỢC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba thứ WSL2 không làm được — và vì sao cần QEMU' },

    { t: 'p', x:
      'WSL2 tuyệt vời để <b>viết và biên dịch</b>. Nhưng nó có ba giới hạn cứng, và cả ba đều nằm ' +
      'đúng vào phần cốt lõi của nghề nhúng.' },

    { t: 'h3', x: 'Một — không có bootloader' },

    { t: 'p', x:
      'Windows nạp thẳng kernel vào bộ nhớ máy ảo. Không có ROM code, không có SPL, không có U-Boot. ' +
      'Toàn bộ giai đoạn 0, 1, 2 của Bài 2 <b>không tồn tại</b>. Thư mục <code>/boot</code> trống rỗng, ' +
      'như bạn đã tự kiểm chứng ở Bài 1.' },

    { t: 'h3', x: 'Hai — không sửa được kernel' },

    { t: 'p', x:
      'Kernel là bản Microsoft build sẵn, và WSL2 không cung cấp cây header đi kèm. Cụ thể, ' +
      'thư mục <code>/lib/modules/$(uname -r)/build</code> không tồn tại — mà đó chính là thứ bắt buộc ' +
      'phải có để biên dịch một kernel module. Nói cách khác: <b>Chặng 10 không thể học trên WSL2</b>.' },

    { t: 'h3', x: 'Ba — sai kiến trúc' },

    { t: 'p', x:
      'CPU của bạn là x86-64. Gần như toàn bộ thiết bị nhúng ngoài đời chạy ARM. Bạn có thể ' +
      '<i>biên dịch</i> cho ARM trên máy x86, nhưng không thể <i>chạy</i> kết quả — ở phần thực hành ' +
      'bạn sẽ gặp lỗi <code>Exec format error</code> chứng minh điều đó.' },

    { t: 'cal', kind: 'info', title: 'Kết luận: hai công cụ, hai vai trò', x:
      '<p><b>WSL2 là máy phát triển (host).</b> Nơi bạn viết code, chạy trình biên dịch, giữ mã nguồn.</p>' +
      '<p><b>QEMU là board phát triển (target).</b> Nơi bootloader của bạn chạy, kernel của bạn boot, ' +
      'driver của bạn được nạp.</p>' +
      '<p>Cặp host–target này chính là mô hình làm việc thật của mọi kỹ sư nhúng. Chỉ khác một điều: ' +
      'target của bạn bằng phần mềm, nên nó không cháy, không cần dây cáp, và reset trong một giây.</p>' },

    /* ══════════════════════════════════════════════
       4. GIẢ LẬP VS ẢO HOÁ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Giả lập và ảo hoá — khác nhau ở đâu' },

    { t: 'p', x:
      'Hai từ này bị dùng lẫn lộn khắp nơi, nhưng với dân nhúng thì phân biệt được chúng là bắt buộc, ' +
      'vì nó quyết định máy ảo của bạn chạy nhanh hay chậm gấp hai mươi lần.' },

    { t: 'fig',
      cap: 'Cùng là "máy ảo", nhưng đường đi của một lệnh khác hẳn nhau. Bên phải có thêm một bước dịch — và đó là toàn bộ khác biệt về tốc độ.',
      svg:
      '<svg viewBox="0 0 720 238" width="720" role="img" aria-label="So sánh ảo hoá KVM và giả lập TCG">' +
        /* khung trái */
        '<rect class="d-box-g" x="24" y="16" width="316" height="180" rx="10" stroke-width="2"/>' +
        '<text class="d-t" x="182" y="40" text-anchor="middle">ẢO HOÁ · KVM</text>' +

        '<rect class="d-box" x="54" y="48" width="256" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="182" y="69" text-anchor="middle">Guest x86-64</text>' +

        '<path class="d-line" d="M182 82 V126" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M177 126 l5 8 5 -8 z"/>' +
        '<text class="d-ts" x="192" y="108">chạy thẳng, không dịch</text>' +

        '<rect class="d-box" x="54" y="132" width="256" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="182" y="153" text-anchor="middle">CPU x86-64 thật</text>' +

        '<text class="d-ts" x="182" y="182" text-anchor="middle">Tốc độ gần bằng máy thật</text>' +

        /* khung phải */
        '<rect class="d-box-w" x="380" y="16" width="316" height="180" rx="10" stroke-width="2"/>' +
        '<text class="d-t" x="538" y="40" text-anchor="middle">GIẢ LẬP · TCG</text>' +

        '<rect class="d-box" x="410" y="48" width="256" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="538" y="69" text-anchor="middle">Guest ARM64</text>' +

        '<path class="d-line" d="M538 82 V84" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M533 84 l5 6 5 -6 z"/>' +

        '<rect class="d-box-p" x="410" y="92" width="256" height="32" rx="6" stroke-width="2"/>' +
        '<text class="d-t" x="538" y="113" text-anchor="middle">Bộ dịch TCG</text>' +

        '<path class="d-line" d="M538 126 V128" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M533 128 l5 6 5 -6 z"/>' +

        '<rect class="d-box" x="410" y="136" width="256" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="538" y="157" text-anchor="middle">CPU x86-64 thật</text>' +

        '<text class="d-ts" x="538" y="184" text-anchor="middle">Chậm hơn khoảng 10–20 lần</text>' +

        '<text class="d-ts" x="360" y="222" text-anchor="middle">Máy bạn CÓ /dev/kvm — nhưng khi guest là ARM64, QEMU chỉ còn lựa chọn TCG</text>' +
      '</svg>' },

    { t: 'terms', items: [
      ['Ảo hoá', 'virtualization',
       'Guest và host <b>cùng kiến trúc</b>. Lệnh của guest được CPU thật thực thi trực tiếp, ' +
       'phần cứng chỉ can thiệp ở những thao tác đặc quyền. Trên Linux, cơ chế này gọi là <b>KVM</b>.'],
      ['Giả lập', 'emulation',
       'Guest và host <b>khác kiến trúc</b>. Mỗi lệnh của guest phải được dịch sang lệnh tương đương ' +
       'của host. Bộ dịch trong QEMU tên là <b>TCG</b> (Tiny Code Generator).'],
      ['KVM', 'Kernel-based Virtual Machine',
       'Phân hệ trong kernel Linux khai thác tính năng ảo hoá phần cứng của CPU. Xuất hiện dưới dạng ' +
       'thiết bị <code>/dev/kvm</code>.'],
      ['TCG', 'Tiny Code Generator',
       'Bộ dịch mã động của QEMU. Nó dịch theo từng khối lệnh rồi lưu lại để tái sử dụng, nên nhanh ' +
       'hơn dịch từng lệnh một, nhưng vẫn chậm hơn chạy thẳng rất nhiều.']
    ]},

    { t: 'cal', kind: 'warn', title: 'Điểm hay bị hiểu sai nhất', x:
      '<p>Nhiều người thấy máy mình có <code>/dev/kvm</code> rồi tưởng mọi máy ảo QEMU đều được tăng tốc. ' +
      'Không phải.</p>' +
      '<p>KVM chỉ có tác dụng khi <b>guest và host cùng kiến trúc</b>. Guest ARM64 trên host x86-64 ' +
      'thì không có phần cứng nào giúp được — mọi lệnh bắt buộc phải đi qua TCG. Ở phần thực hành bạn ' +
      'sẽ tự chứng minh điều này bằng một câu lệnh.</p>' +
      '<p>Hệ quả thực tế bạn cần chuẩn bị tinh thần: boot một kernel ARM64 trong QEMU trên máy bạn sẽ ' +
      'mất vài chục giây thay vì vài giây. Đó là cái giá phải trả để không phải mua board.</p>' },

    /* ══════════════════════════════════════════════
       5. HAI HỌ QEMU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai họ QEMU: qemu-user và qemu-system' },

    { t: 'p', x:
      'QEMU không phải một chương trình mà là hai họ chương trình, giải hai bài toán khác hẳn nhau.' },

    { t: 'table',
      head: ['', '<code>qemu-aarch64</code>', '<code>qemu-system-aarch64</code>'],
      rows: [
        ['Gọi là', 'User-mode emulation', 'System-mode emulation'],
        ['Giả lập cái gì', 'Chỉ CPU và tập lệnh', 'Cả máy tính: CPU, RAM, thiết bị ngoại vi, ngắt'],
        ['Chạy được gì', 'Một chương trình ARM64 đơn lẻ', 'Cả bootloader, kernel và hệ điều hành'],
        ['Syscall xử lý ra sao', 'Chuyển tiếp sang kernel WSL2 của bạn', 'Do kernel ARM64 chạy bên trong xử lý'],
        ['Có kernel riêng không', 'Không', 'Có'],
        ['Tốc độ khởi động', 'Tức thì', 'Vài giây tới vài chục giây'],
        ['Dùng ở chặng nào', 'Chặng 04 — thử nhanh chương trình vừa cross-compile', 'Chặng 05 trở đi — mọi thứ liên quan đến boot và kernel']
      ]},

    { t: 'cal', kind: 'tip', x:
      '<p>Cách nhớ đơn giản: <code>qemu-aarch64</code> giả vờ là một <b>CPU</b>, ' +
      '<code>qemu-system-aarch64</code> giả vờ là cả một <b>cái máy</b>.</p>' +
      '<p>Khi bạn chỉ muốn biết chương trình vừa biên dịch có chạy đúng không, dùng cái đầu. ' +
      'Khi bạn muốn học nhúng thật sự, dùng cái sau.</p>' },

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: kiểm chứng toàn bộ những điều trên' },

    { t: 'p', x:
      'Năm bước dưới đây không phải là bài tập lý thuyết — mỗi bước tạo ra một con số hoặc một thông ' +
      'báo lỗi chứng minh trực tiếp một khẳng định vừa đọc. Hãy chú ý huy hiệu môi trường ở góc trái ' +
      'mỗi khối lệnh: bước 1 chạy ở <b>PowerShell</b>, các bước còn lại chạy trong <b>WSL</b>.' },

    { t: 'steps', items: [

      { title: 'Kiểm tra phiên bản WSL — chạy ở PowerShell',
        blocks: [
          { t: 'code', where: 'ps', code:
            'wsl --version' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Phiên bản WSL: 2.7.11.0\n' +
            'Phiên bản kernel: 6.18.33.2-2\n' +
            'Phiên bản WSLg: 1.0.73.2\n' +
            'Phiên bản Windows: 10.0.22631.6199' },

          { t: 'p', x:
            'Dòng <b>Phiên bản kernel</b> là bằng chứng thứ hai cho luận điểm đầu bài: Microsoft ' +
            'phát hành số phiên bản kernel Linux riêng, vì họ thật sự build và đóng gói một kernel Linux.' },

          { t: 'p', x: 'Tiếp theo, xác nhận distro đang chạy ở chế độ 2:' },
          { t: 'code', where: 'ps', code:
            'wsl -l -v' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '  NAME      STATE           VERSION\n' +
            '* Ubuntu    Running         2' },

          { t: 'cal', kind: 'warn', x:
            '<p>Cột <code>VERSION</code> trên máy bạn hiện đúng <b>2</b>, và dấu <code>*</code> đứng trước ' +
            '<code>Ubuntu</code> nghĩa là đây là distro <b>mặc định</b> khi bạn gõ <code>wsl</code> trơn. ' +
            'Con số <b>2</b> xác nhận đúng thứ bảng e820 vừa chứng minh ở trên: đây là một máy ảo Hyper-V ' +
            'thật với kernel Linux thật, không phải lớp dịch lệnh của WSL1.</p>' +
            '<p>Nếu cột <code>VERSION</code> hiện <b>1</b>, hãy dừng lại và chuyển đổi trước khi học tiếp:</p>' +
            '<p><code>wsl --set-version Ubuntu 2</code></p>' +
            '<p>WSL1 không có kernel Linux thật, nên phần lớn nội dung khoá học sẽ không chạy đúng.</p>' }
        ]},

      { title: 'Đo cái bẫy 50 lần bằng số liệu của chính bạn',
        blocks: [
          { t: 'p', x:
            'Đây là bước quan trọng nhất của bài. Ta tạo 500 file rỗng ở hai nơi rồi so thời gian.' },

          { t: 'code', where: 'wsl', name: 'đo ở hệ thống file gốc', code:
            'mkdir -p ~/bench && cd ~/bench && rm -rf t && mkdir t && cd t\n' +
            'time (i=1; while [ $i -le 500 ]; do touch f$i; i=$((i+1)); done)' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'real    0m0.017s' },

          { t: 'p', x:
            'Ghi lại con số này — <b>0,017 giây</b> để tạo 500 file trên hệ thống file gốc. Đây là ' +
            '<b>mốc chuẩn</b>. Bước tiếp theo chạy lại <i>nguyên văn</i> cùng một vòng lặp, chỉ đổi thư ' +
            'mục làm việc sang <code>/mnt/c</code>, để phép so sánh chỉ còn một biến duy nhất là vùng ' +
            'lưu trữ.' },

          { t: 'code', where: 'wsl', name: 'đo ở ổ đĩa Windows', code:
            'mkdir -p /mnt/c/temp/bench && cd /mnt/c/temp/bench && rm -rf t && mkdir t && cd t\n' +
            'time (i=1; while [ $i -le 500 ]; do touch f$i; i=$((i+1)); done)' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'real    0m0.882s' },

          { t: 'cmdx', cmd: 'time (i=1; while [ $i -le 500 ]; do touch f$i; i=$((i+1)); done)',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['time', 'Đo thời gian chạy của lệnh phía sau.',
               'Kết quả có ba dòng: <code>real</code> là thời gian đồng hồ thực — đây là con số ta quan tâm.'],
              ['( … )', 'Ngoặc đơn tạo một shell con để <code>time</code> đo được cả vòng lặp.',
               'Không có ngoặc thì <code>time</code> chỉ đo lệnh đầu tiên.'],
              ['i=1; while [ $i -le 500 ]', 'Vòng lặp đếm từ 1 tới 500.',
               'Đây là cú pháp vòng lặp chuẩn của shell, sẽ học kỹ ở Bài 13.'],
              ['touch f$i', 'Tạo file rỗng tên <code>f1</code>, <code>f2</code>…',
               'Chọn <code>touch</code> vì nó là thao tác file nhỏ nhất có thể — cô lập đúng chi phí của hệ thống file.']
            ]},

          { t: 'cal', kind: 'info', title: 'Con số bạn vừa tạo ra', x:
            '<p><b>0,882 ÷ 0,017 ≈ 52 lần.</b></p>' +
            '<p>Và đây mới chỉ là 500 file. Cây mã nguồn kernel Linux có hơn 80.000 file; một bản build ' +
            'còn sinh thêm hàng chục nghìn file <code>.o</code>. Nhân tỉ lệ này lên, sự khác biệt không ' +
            'còn là "hơi chậm" mà là "không dùng được".</p>' +
            '<p>Kể từ giờ, mọi thư mục làm việc trong khoá học đều nằm dưới <code>~/embedded</code>.</p>' },

          { t: 'p', x: 'Dọn dẹp:' },
          { t: 'code', where: 'wsl', code:
            'rm -rf ~/bench /mnt/c/temp/bench' }
        ]},

      { title: 'Cài qemu-user và tạo thư mục làm việc',
        blocks: [
          { t: 'p', x:
            'Bài 1 bạn đã cài <code>qemu-system-arm</code>. Giờ cài nốt họ còn lại:' },
          { t: 'code', where: 'wsl', code:
            'sudo apt update && sudo apt install -y qemu-user' },

          { t: 'p', x: 'Kiểm tra và tạo nơi làm việc chuẩn:' },
          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 --version | head -1\n' +
            'mkdir -p ~/embedded/bai03 && cd ~/embedded/bai03' },

          { t: 'cal', kind: 'why', x:
            '<p><code>apt update</code> làm mới danh sách gói trước, rồi <code>apt install</code> mới cài. ' +
            'Bỏ qua bước đầu là nguyên nhân phổ biến nhất của lỗi <i>"không tìm thấy gói"</i> — không phải ' +
            'vì gói không tồn tại, mà vì danh mục trên máy bạn đã cũ. Chi tiết ở Bài 12.</p>' }
        ]},

      { title: 'Biên dịch cho ARM64 và gặp Exec format error',
        blocks: [
          { t: 'p', x: 'Viết một chương trình tối giản:' },
          { t: 'code', where: 'file', lang: 'c', name: '~/embedded/bai03/hello.c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void) {\n' +
            '    printf("Hello from ARM64!\\n");\n' +
            '    return 0;\n' +
            '}' },

          { t: 'p', x: 'Biên dịch hai lần — một cho máy bạn, một cho ARM64:' },
          { t: 'code', where: 'wsl', code:
            'gcc hello.c -o hello-x86\n' +
            'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -static hello.c -o hello-arm64',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['aarch64-linux-gnu-gcc', 'Trình biên dịch chéo. Tên gồm ba phần: kiến trúc đích <code>aarch64</code>, hệ điều hành đích <code>linux</code>, quy ước ABI <code>gnu</code>.',
               'Quy tắc đặt tên này gọi là <i>target triplet</i>. Bài 26 sẽ mổ xẻ đầy đủ.'],
              ['-static', 'Nhúng toàn bộ thư viện cần dùng vào file thực thi.',
               '<b>Bắt buộc ở đây.</b> Không có nó, khi chạy dưới QEMU chương trình sẽ đi tìm thư viện C của ARM64 — thứ máy bạn không có — và báo lỗi thiếu thư viện.'],
              ['-o hello-arm64', 'Tên file kết quả.',
               'Không có <code>-o</code> thì gcc luôn đặt tên <code>a.out</code>.']
            ]},

          { t: 'p', x: 'So sánh hai file vừa tạo:' },
          { t: 'code', where: 'wsl', code:
            'file hello-x86 hello-arm64\n' +
            'ls -l hello-x86 hello-arm64' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'hello-x86:   ELF 64-bit LSB pie executable, x86-64, dynamically linked\n' +
            'hello-arm64: ELF 64-bit LSB executable, ARM aarch64, statically linked\n' +
            '\n' +
            '  15952  hello-x86\n' +
            ' 705328  hello-arm64' },

          { t: 'cal', kind: 'info', title: 'Vì sao bản ARM64 to gấp 44 lần', x:
            '<p>Không phải vì mã ARM cồng kềnh. Bản x86 <b>dynamically linked</b> — nó chỉ chứa mã của ' +
            'bạn và mượn hàm <code>printf</code> từ thư viện C có sẵn trên máy. Bản ARM64 dùng ' +
            '<code>-static</code> nên đã nuốt trọn phần thư viện C mà nó dùng vào bên trong.</p>' +
            '<p>Đánh đổi tĩnh–động này là quyết định thiết kế quan trọng trên thiết bị nhúng, nơi từng ' +
            'megabyte flash đều được tính. Bài 17 sẽ phân tích kỹ.</p>' },

          { t: 'p', x:
            'Trước khi chạy thử, tắt tạm một cơ chế mà lệnh cài <code>qemu-user</code> ở bước trước ' +
            'vừa âm thầm kích hoạt trong nhân — nếu không tắt, bước dưới có thể không báo lỗi gì cả. ' +
            'Bài 27 sẽ giải thích đầy đủ cơ chế này; ở đây chỉ cần biết cách tắt và mở lại nó:' },
          { t: 'code', where: 'wsl', code:
            'echo 0 | sudo tee /proc/sys/fs/binfmt_misc/qemu-aarch64' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '0' },

          { t: 'cal', kind: 'info', x:
            '<p>Số <b>0</b> in ra <b>không</b> phải nhân xác nhận điều gì — đó chỉ là hành vi chuẩn của ' +
            '<code>tee</code>: nó chép nguyên văn dữ liệu nhận từ luồng vào ra <b>cả</b> màn hình lẫn file ' +
            'được chỉ định, nên byte <code>0</code> bạn gõ hiện lại y hệt trước khi được ghi vào ' +
            '<code>/proc/sys/fs/binfmt_misc/qemu-aarch64</code>. Ghi coi như thành công vì lệnh không báo ' +
            'lỗi quyền hay <code>No such file or directory</code>.</p>' +
            '<p>Giá trị vừa ghi có nghĩa cụ thể: <b>0 tắt</b>, <b>1 bật</b> luật nhận diện file ARM64 mà ' +
            'gói <code>qemu-user</code> đã đăng ký ở bước trước. Tắt nó đi để bước dưới đây cho bạn thấy ' +
            'đúng phản ứng thô của CPU x86 khi gặp lệnh ARM64 — nếu để nguyên ở trạng thái bật, nhân sẽ ' +
            'âm thầm gọi <code>qemu-aarch64</code> giúp bạn và <code>Exec format error</code> sẽ không ' +
            'bao giờ xuất hiện. Bài 27 mổ xẻ đầy đủ cơ chế đứng sau luật này.</p>' },

          { t: 'p', x: 'Giờ thử chạy bản ARM64 trực tiếp:' },
          { t: 'code', where: 'wsl', code:
            './hello-arm64; echo "exit=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: ./hello-arm64: cannot execute binary file: Exec format error\n' +
            'exit=126' },

          { t: 'cal', kind: 'why', title: 'Lỗi này là kết quả mong đợi', x:
            '<p>Bạn vừa nhìn thấy giới hạn thứ ba của WSL2 bằng mắt mình. File chứa lệnh ARM64; ' +
            'CPU của bạn chỉ hiểu lệnh x86-64. Kernel đọc phần đầu file ELF, thấy trường kiến trúc ghi ' +
            '<code>AArch64</code>, từ chối nạp, và trả về mã thoát <b>126</b> — mã dành riêng cho ' +
            '"tìm thấy file nhưng không thể thực thi".</p>' +
            '<p>Đây không phải hỏng hóc. Đây chính xác là bài toán mà QEMU sinh ra để giải.</p>' },

          { t: 'p', x: 'Nhờ QEMU chạy hộ:' },
          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 ./hello-arm64' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Hello from ARM64!' },

          { t: 'cal', kind: 'tip', title: 'Chuyện gì vừa xảy ra', x:
            '<p><code>qemu-aarch64</code> nạp file, đọc từng lệnh ARM64, dịch sang lệnh x86-64 rồi cho ' +
            'CPU thật chạy. Khi chương trình gọi <code>write()</code> để in ra màn hình, QEMU chuyển ' +
            'lời gọi đó sang cho kernel WSL2 của bạn xử lý.</p>' +
            '<p>Ở đây <b>không có kernel ARM64 nào</b>, không có máy ảo, không có boot. Chỉ có phép dịch ' +
            'tập lệnh — đó chính là ranh giới giữa <code>qemu-aarch64</code> và ' +
            '<code>qemu-system-aarch64</code>.</p>' },

          { t: 'p', x: 'Mở lại cơ chế vừa tắt — máy bạn cần nó ở dạng bật cho mọi bài sau này:' },
          { t: 'code', where: 'wsl', code:
            'echo 1 | sudo tee /proc/sys/fs/binfmt_misc/qemu-aarch64' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '1' },

          { t: 'cal', kind: 'info', title: 'Cơ chế vừa tắt/mở tên là gì?', x:
            '<p>Số <b>1</b> vừa hiện lại — đúng như số <b>0</b> lúc tắt — là <code>tee</code> chép lại giá ' +
            'trị mới ghi; nó xác nhận luật đã được bật lại, không phải tắt như lúc bạn vừa chạy thử ' +
            'ARM64 trần trụi ở trên.</p>' +
            '<p>Đó là <code>binfmt_misc</code> — một bảng trong nhân Linux cho phép đăng ký luật ' +
            '"nếu file bắt đầu bằng dãy byte này, hãy chạy nó bằng chương trình kia". Gói ' +
            '<code>qemu-user-binfmt</code> (đi kèm khi bạn cài <code>qemu-user</code> ở bước trước) ' +
            'đăng ký một luật như vậy cho file ELF ARM64, trỏ tới <code>qemu-aarch64</code>. Từ giờ, ' +
            'nếu một lúc nào đó bạn chạy thẳng một file ARM64 mà <b>không</b> thấy ' +
            '<code>Exec format error</code>, đó là <code>binfmt_misc</code> đang lặng lẽ làm việc, ' +
            'không phải máy bạn vừa đổi kiến trúc. Bài 27 sẽ mổ xẻ đầy đủ luật này.</p>' }
        ]},

      { title: 'Tự chứng minh KVM vô dụng với ARM64',
        blocks: [
          { t: 'p', x: 'Trước hết, xác nhận máy bạn thật sự có KVM:' },
          { t: 'code', where: 'wsl', code:
            'ls -l /dev/kvm' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'crw-rw---- 1 root kvm 10, 232 /dev/kvm' },

          { t: 'p', x:
            'Thiết bị tồn tại — ảo hoá phần cứng đang bật. Bây giờ hỏi QEMU ARM64 xem nó dùng được ' +
            'những cơ chế tăng tốc nào:' },
          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -accel help' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Accelerators supported in QEMU binary:\n' +
            'tcg' },

          { t: 'cal', kind: 'info', title: 'Đây là bằng chứng cuối cùng', x:
            '<p>Chỉ có <code>tcg</code> trong danh sách. Không có <code>kvm</code>, dù ' +
            '<code>/dev/kvm</code> nằm ngay đó.</p>' +
            '<p>Lý do: KVM cho phép CPU thật chạy trực tiếp lệnh của guest. CPU của bạn không biết lệnh ' +
            'ARM64, nên chẳng có gì để chạy trực tiếp cả. Mọi lệnh bắt buộc phải qua TCG.</p>' +
            '<p>Con số cần nhớ: hãy trừ hao <b>chậm hơn khoảng 10–20 lần</b> so với board thật. ' +
            'Điều này ảnh hưởng tới thời gian boot chứ không tới tính đúng đắn — kernel của bạn vẫn ' +
            'chạy đúng y như trên phần cứng thật, chỉ chậm hơn.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       7. BẢN ĐỒ MÔI TRƯỜNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bản đồ: việc gì làm ở đâu' },

    { t: 'p', x:
      'Từ Chặng 01 trở đi, mỗi khối lệnh trong khoá học đều mang huy hiệu môi trường. Bảng này là ' +
      'bản đồ tổng quát để bạn luôn biết mình đang đứng ở đâu.' },

    { t: 'table',
      head: ['Môi trường', 'Huy hiệu', 'Dùng để làm gì'],
      rows: [
        ['PowerShell', '<code>ps</code>', 'Quản lý WSL: khởi động, tắt, sửa <code>.wslconfig</code>, xem phiên bản'],
        ['PowerShell Admin', '<code>psadm</code>', 'Bật tính năng Windows, cấu hình mạng — ít dùng'],
        ['WSL / Ubuntu', '<code>wsl</code>', '<b>Nơi bạn ở 90% thời gian.</b> Viết code, biên dịch, chạy QEMU'],
        ['QEMU monitor', '<code>qemu</code>', 'Ra lệnh cho cỗ máy ảo: xem thanh ghi, dừng CPU, chụp trạng thái'],
        ['U-Boot', '<code>uboot</code>', 'Dấu nhắc bootloader bên trong máy ảo — từ Chặng 06'],
        ['Nội dung file', '<code>file</code>', 'File cần tạo hoặc sửa, không phải lệnh để gõ'],
        ['Kết quả', '<code>out</code>', 'Kết quả in ra để bạn đối chiếu — không có nút sao chép']
      ]},

    /* ══════════════════════════════════════════════
       8. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>qemu-aarch64: command not found</code>',
         'Chưa cài gói <code>qemu-user</code>',
         '<code>sudo apt install qemu-user</code>'],
        ['<code>aarch64-linux-gnu-gcc: command not found</code>',
         'Chưa cài toolchain chéo',
         '<code>sudo apt install gcc-aarch64-linux-gnu</code>'],
        ['<code>qemu-aarch64: Could not open \'/lib/ld-linux-aarch64.so.1\'</code>',
         'Biên dịch thiếu <code>-static</code> nên chương trình đi tìm thư viện động của ARM64',
         'Biên dịch lại có <code>-static</code>, hoặc cài <code>qemu-user-static</code> kèm thư viện'],
        ['<code>Exec format error</code>',
         'Chạy trực tiếp file ARM64 trên CPU x86',
         '<b>Đúng như mong đợi.</b> Chạy qua <code>qemu-aarch64</code>'],
        ['<code>wsl -l -v</code> hiện VERSION là 1',
         'Distro đang ở WSL1, không có kernel Linux thật',
         '<code>wsl --set-version Ubuntu 2</code> rồi chờ vài phút'],
        ['Build cực chậm dù máy khoẻ',
         'Thư mục làm việc nằm trong <code>/mnt/c</code>',
         'Chuyển toàn bộ về <code>~/embedded</code>'],
        ['<code>touch: cannot touch: Permission denied</code> trong <code>/mnt/c</code>',
         'Quyền NTFS không ánh xạ được sang quyền Linux',
         'Đừng làm việc trong <code>/mnt/c</code> — chính là lý do của quy tắc trên']
      ]},

    /* ══════════════════════════════════════════════
       9. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'WSL2 là <b>máy ảo Hyper-V</b> chứa kernel Linux thật, không phải lớp dịch lệnh như WSL1.',
      'Có hai hệ thống file. Code phải nằm ở <code>~</code>; <code>/mnt/c</code> chậm hơn <b>52 lần</b> ' +
      'theo số bạn vừa đo và làm hỏng quyền file.',
      'WSL2 thiếu ba thứ: <b>bootloader</b>, <b>khả năng sửa kernel</b>, và <b>kiến trúc ARM</b>. ' +
      'Đúng ba thứ đó là lý do cần QEMU.',
      '<b>WSL2 = host</b> (nơi viết và build). <b>QEMU = target</b> (nơi chạy và thử).',
      'Ảo hoá cần cùng kiến trúc; khác kiến trúc thì luôn là giả lập. Có <code>/dev/kvm</code> ' +
      '<b>không</b> đồng nghĩa với chạy nhanh.',
      '<code>qemu-aarch64</code> giả lập một <b>CPU</b> để chạy một chương trình; ' +
      '<code>qemu-system-aarch64</code> giả lập cả một <b>cái máy</b> để boot hệ điều hành.',
      '<code>Exec format error</code>, mã thoát <b>126</b>, là câu trả lời đúng của nhân khi chạy ' +
      'file ARM64 trên CPU x86 chưa có gì can thiệp — và là lý do QEMU tồn tại. Gói ' +
      '<code>qemu-user-binfmt</code> có thể khiến lỗi này im lặng biến mất sau khi cài ' +
      '<code>qemu-user</code>; Bài 27 giải thích đầy đủ cơ chế đó.',
      'Trừ hao <b>chậm hơn 10–20 lần</b> so với board thật, nhưng kết quả vẫn đúng.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Hết Chặng 00 — bạn đang ở đâu', x:
      '<p>Ba bài vừa rồi cho bạn <b>bản đồ</b>: Embedded Linux là gì, hệ thống khởi động ra sao, ' +
      'và bạn sẽ làm việc bằng công cụ gì. Bạn chưa build được thứ gì, và điều đó hoàn toàn bình thường — ' +
      'người ta không đọc bản đồ để tới đích, người ta đọc bản đồ để biết mình đang đi đâu.</p>' +
      '<p><b>Chặng 01 — Linux căn bản</b> bắt đầu từ Bài 4. Mười bài, và chúng thay đổi hẳn cách bạn ' +
      'dùng máy tính: shell và cấu trúc câu lệnh, hệ thống file, quyền, tiến trình, pipe, xử lý văn bản, ' +
      'và cuối cùng là bash script. Đây là chặng dài nhưng cũng là chặng có tỉ lệ hoàn vốn cao nhất — ' +
      'mọi thứ sau đó đều đứng trên nó.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Khác biệt cốt lõi giữa WSL1 và WSL2 là gì?',
      opts: [
        'WSL2 nhanh hơn nhờ được tối ưu tốt hơn',
        'WSL2 là máy ảo chạy kernel Linux thật, WSL1 là lớp dịch lời gọi hệ thống',
        'WSL2 hỗ trợ nhiều distro hơn',
        'WSL2 có giao diện đồ hoạ còn WSL1 thì không'
      ],
      a: 1,
      why: 'WSL1 dịch lời gọi hệ thống Linux thành lời gọi Windows — không có kernel Linux nào ở đó. ' +
           'WSL2 chạy một máy ảo Hyper-V với kernel Linux thật do Microsoft biên dịch. Bằng chứng nằm ' +
           'trong log khởi động: chỉ máy tính thật hoặc ảo mới có bảng bộ nhớ BIOS-e820.'
    },
    {
      q: 'Vì sao tuyệt đối không đặt mã nguồn trong <code>/mnt/c</code>?',
      opts: [
        'Vì Windows sẽ tự xoá file trong đó',
        'Vì <code>/mnt/c</code> chỉ đọc, không ghi được',
        'Vì mọi thao tác file phải đi qua giao thức 9P, chậm hơn khoảng 52 lần với nhiều file nhỏ, và quyền Linux không được giữ đúng',
        'Vì dung lượng ổ C thường không đủ'
      ],
      a: 2,
      why: '9P là giao thức mạng chia sẻ file; mỗi thao tác là một lượt hỏi-đáp giữa Linux và Windows. ' +
           'Với vài file lớn thì không sao, nhưng một bản build kernel tạo hàng chục nghìn file nhỏ — ' +
           'đúng trường hợp xấu nhất. Bạn đã tự đo được 0,882 giây so với 0,017 giây.'
    },
    {
      q: 'Máy bạn có <code>/dev/kvm</code>. Vậy chạy máy ảo ARM64 bằng <code>qemu-system-aarch64</code> có được KVM tăng tốc không?',
      opts: [
        'Có, KVM tăng tốc mọi máy ảo QEMU',
        'Không, vì KVM chỉ giúp khi guest và host cùng kiến trúc — ARM64 trên x86 buộc phải dùng TCG',
        'Có, nhưng phải thêm tuỳ chọn <code>-enable-kvm</code>',
        'Không, vì WSL2 chặn không cho dùng KVM'
      ],
      a: 1,
      why: 'KVM hoạt động bằng cách để CPU thật thực thi trực tiếp lệnh của guest. CPU x86-64 không hiểu ' +
           'lệnh ARM64 nên không có gì để chạy trực tiếp. Lệnh <code>qemu-system-aarch64 -accel help</code> ' +
           'trên máy bạn chỉ liệt kê <code>tcg</code>, đúng như vậy.'
    },
    {
      q: 'Bạn muốn thử nhanh xem chương trình vừa cross-compile cho ARM64 có in đúng kết quả không. Dùng công cụ nào?',
      opts: [
        '<code>qemu-system-aarch64</code>, vì cần một máy ARM64 hoàn chỉnh',
        '<code>qemu-aarch64</code>, vì chỉ cần giả lập CPU để chạy một chương trình đơn lẻ',
        'Chạy thẳng file, Linux tự xử lý được',
        'Phải build lại cho x86 rồi mới chạy được'
      ],
      a: 1,
      why: '<code>qemu-aarch64</code> (user-mode) chỉ giả lập tập lệnh và chuyển tiếp mọi syscall sang ' +
           'kernel WSL2 của bạn — khởi động tức thì, không cần kernel hay rootfs ARM64. ' +
           '<code>qemu-system-aarch64</code> giả lập cả một cái máy, phải boot mất vài chục giây, ' +
           'là thừa cho việc thử một chương trình. Phương án "chạy thẳng file" có thể trông như chạy ' +
           'được sau khi cài <code>qemu-user</code> — đó vẫn là <code>qemu-aarch64</code> đứng sau, ' +
           'do nhân tự gọi hộ qua <code>binfmt_misc</code> (Bài 27 sẽ mổ xẻ), không phải CPU học ' +
           'thêm được tập lệnh.'
    },
    {
      q: 'Vì sao cần tuỳ chọn <code>-static</code> khi cross-compile chương trình để chạy dưới <code>qemu-aarch64</code>?',
      opts: [
        'Để chương trình chạy nhanh hơn',
        'Để giảm kích thước file thực thi',
        'Vì máy bạn không có thư viện C của ARM64, nên phải nhúng sẵn vào file',
        'Vì QEMU không hỗ trợ liên kết động'
      ],
      a: 2,
      why: 'Bản liên kết động chỉ chứa mã của bạn và mượn <code>printf</code> từ thư viện C — nhưng đó ' +
           'phải là thư viện C <b>của ARM64</b>, thứ máy x86 của bạn không có. Không có <code>-static</code>, ' +
           'QEMU sẽ báo <code>Could not open /lib/ld-linux-aarch64.so.1</code>. Đổi lại, file phình từ ' +
           '15 KB lên 705 KB.'
    },
    {
      q: 'Vì sao <b>không thể</b> học Chặng 10 (kernel module và driver) chỉ với WSL2?',
      opts: [
        'Vì WSL2 không đủ RAM',
        'Vì kernel là bản Microsoft build sẵn và không có <code>/lib/modules/$(uname -r)/build</code> để biên dịch module',
        'Vì Windows chặn việc nạp module',
        'Vì kernel WSL2 quá cũ'
      ],
      a: 1,
      why: 'Biên dịch một kernel module cần cây header và Makefile của đúng kernel đang chạy, nằm ở ' +
           '<code>/lib/modules/$(uname -r)/build</code>. WSL2 không cung cấp thư mục đó. Giải pháp là ' +
           'build kernel của riêng bạn (Chặng 07) rồi boot nó trong QEMU (Chặng 05) — lúc đó bạn có ' +
           'đầy đủ cây build.'
    }
  ]
});

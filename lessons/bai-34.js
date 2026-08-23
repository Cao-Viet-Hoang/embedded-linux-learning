/* Bài 34 — Build U-Boot cho QEMU
   Chặng 06 — Bootloader U-Boot
   Lấy source v2026.07, chọn defconfig, cross-compile, nạp bằng -bios,
   gõ lệnh tại dấu nhắc "=>", và áp patch bằng git am / patch -p1. */

Lesson.register({
  id: 'bai-34',
  title: 'Build U-Boot cho QEMU',
  minutes: 65,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Ở <b>Bài 33</b> bạn đã nhìn tận mắt bootloader mà QEMU viết hộ: đúng <b>sáu lệnh máy</b>, ' +
    'vừa đủ để thực hiện hợp đồng bàn giao rồi biến mất. Sáu lệnh đó làm được việc, nhưng nó ' +
    'không cho bạn quyền quyết định gì cả — không chọn được kernel nào, không sửa được tham số ' +
    'dòng lệnh, không nạp được từ mạng, và tuyệt đối không có chỗ nào để gõ lệnh. Bài này bạn ' +
    'thay nó bằng <b>U-Boot</b> — bootloader thật, đang chạy trên hàng triệu thiết bị ngoài đời. ' +
    'Bạn sẽ tải <b>1 522 defconfig</b> và gần <b>4 triệu dòng C</b> về máy, chọn đúng một cấu ' +
    'hình, cross-compile bằng bộ công cụ của <b>Chặng 04</b>, rồi lần đầu tiên gõ lệnh tại dấu ' +
    'nhắc <code>=&gt;</code> bên trong máy ảo. Cuối bài là một kỹ năng mà mọi kỹ sư embedded ' +
    'dùng hằng tuần: <b>áp patch của người khác lên mã nguồn</b>, và xử lý khi nó không áp được.',

  goals: [
    'Tải đúng một phiên bản U-Boot bằng <code>git clone --depth 1 --branch</code> và giải thích vì sao không clone toàn bộ lịch sử',
    'Chọn cấu hình board bằng <code>make qemu_arm64_defconfig</code> và đọc được những dòng quan trọng trong <code>.config</code> sinh ra',
    'Cross-compile U-Boot bằng <code>CROSS_COMPILE</code> + <code>ARCH</code>, đo thời gian build và phân biệt được từng file sản phẩm',
    'Nạp U-Boot vào QEMU bằng <code>-bios</code>, giải thích <code>-bios</code> khác <code>-kernel</code> ở chỗ nào',
    'Dùng được <code>version</code>, <code>bdinfo</code>, <code>printenv</code> tại dấu nhắc <code>=&gt;</code> và đọc ra bản đồ bộ nhớ từ kết quả',
    'Áp một patch bằng <code>git am</code> và <code>patch -p1</code>, đọc được file <code>.rej</code>, và gỡ tình huống bằng <code>git am --abort</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. U-Boot là gì
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'U-Boot: bootloader mà gần như cả ngành dùng chung' },

    { t: 'p', x:
      '<b>Das U-Boot</b> (Universal Boot Loader) là một dự án mã nguồn mở tuổi đời hơn hai mươi ' +
      'năm. Nó không phải bootloader duy nhất, nhưng nó là cái bạn sẽ gặp trên hầu hết board ' +
      'ARM/ARM64/RISC-V thương mại. Lý do rất thực dụng: nhà sản xuất SoC nào ra chip mới cũng ' +
      'đẩy mã hỗ trợ vào U-Boot, nên khi bạn cầm một board lạ, khả năng rất cao là đã có sẵn ' +
      'một <code>defconfig</code> cho nó.' },

    { t: 'p', x:
      'Về bản chất, U-Boot làm đúng <b>bốn nhiệm vụ</b> bạn học ở Bài 33 — bật RAM, nạp file, ' +
      'dọn thanh ghi, nhảy rồi biến mất. Phần còn lại của nó, hàng nghìn lệnh và hàng trăm ' +
      'driver, chỉ tồn tại để trả lời một câu hỏi: <i>nạp kernel từ đâu?</i> Từ eMMC, từ thẻ SD, ' +
      'từ SPI flash, từ USB, từ mạng bằng TFTP, từ NVMe — mỗi nguồn là một driver, và tất cả ' +
      'đều nằm trong cùng một cây mã nguồn.' },

    { t: 'terms', items: [
      ['defconfig', '—',
       'Một file văn bản nhỏ liệt kê những <code>CONFIG_</code> khác với mặc định, mô tả trọn ' +
       'vẹn một board. U-Boot v2026.07 có <b>1 522</b> file như vậy trong thư mục ' +
       '<code>configs/</code>.'],
      ['.config', '—',
       'File cấu hình <b>đầy đủ</b> sinh ra từ defconfig, dài <b>1 860</b> dòng. Đây mới là thứ ' +
       'hệ thống build thật sự đọc.'],
      ['Kconfig', '—',
       'Ngôn ngữ khai báo các tuỳ chọn cấu hình, cùng hệ thống mà kernel Linux dùng. Bạn sẽ học ' +
       'kỹ nó ở <b>Bài 39</b>.'],
      ['u-boot.bin', '—',
       'Ảnh nhị phân thô, thứ thật sự được nạp vào flash của board hoặc vào QEMU. Trong bài này ' +
       'nó nặng <b>1 498 688</b> byte.'],
      ['CROSS_COMPILE', '—',
       'Biến môi trường báo cho hệ thống build biết tiền tố của bộ công cụ chéo, ở đây là ' +
       '<code>aarch64-linux-gnu-</code>. Bạn đã dùng đúng cơ chế này ở <b>Chặng 04</b>.']
    ] },

    { t: 'cal', kind: 'why', title: 'Vì sao U-Boot dùng chung hệ thống cấu hình với kernel Linux?',
      x: 'Vì hai dự án giải cùng một bài toán: <b>một cây mã nguồn phải build ra được hàng nghìn ' +
         'sản phẩm khác nhau</b>. Kconfig cho phép mô tả "board này có tính năng A, không có ' +
         'tính năng B" bằng vài chục dòng, thay vì nhân bản cả cây mã. Cái lợi cho bạn: ' +
         '<code>make menuconfig</code>, cú pháp <code>defconfig</code>, cách đọc ' +
         '<code>.config</code> — học một lần, dùng cho cả U-Boot (Chặng 06), kernel ' +
         '(<b>Chặng 07</b>) và Buildroot (<b>Chặng 11</b>).' },

    /* ══════════════════════════════════════════════════════════════════
       2. Đường đi của một bản build
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Từ mã nguồn tới u-boot.bin: đường đi của một bản build' },

    { t: 'p', x:
      'Quy trình chỉ có ba lệnh, nhưng biết mỗi lệnh sinh ra cái gì thì lúc hỏng bạn mới biết ' +
      'quay lại bước nào:' },

    { t: 'fig',
      cap: 'Ba bước build U-Boot và sản phẩm của từng bước. Sai cấu hình thì phải quay lại bước ' +
           '2, không phải sửa ở bước 3.',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" ' +
        'aria-label="Ba bước build U-Boot: clone mã nguồn, chọn defconfig sinh .config, cross-compile sinh u-boot.bin">' +
        '<rect class="d-box" x="4" y="24" width="168" height="66" rx="6"/>' +
        '<text class="d-t" x="88" y="46" text-anchor="middle">1 · Lấy mã nguồn</text>' +
        '<text class="d-tm" x="88" y="64" text-anchor="middle">git clone --depth 1</text>' +
        '<text class="d-ts" x="88" y="80" text-anchor="middle">414 MB, 38 022 file</text>' +

        '<rect class="d-box-a" x="200" y="24" width="168" height="66" rx="6"/>' +
        '<text class="d-t" x="284" y="46" text-anchor="middle">2 · Chọn cấu hình</text>' +
        '<text class="d-tm" x="284" y="64" text-anchor="middle">make qemu_arm64_defconfig</text>' +
        '<text class="d-ts" x="284" y="80" text-anchor="middle">2,90 giây</text>' +

        '<rect class="d-box-p" x="396" y="24" width="168" height="66" rx="6"/>' +
        '<text class="d-t" x="480" y="46" text-anchor="middle">3 · Biên dịch chéo</text>' +
        '<text class="d-tm" x="480" y="64" text-anchor="middle">make -j6</text>' +
        '<text class="d-ts" x="480" y="80" text-anchor="middle">35,38 giây</text>' +

        '<rect class="d-box-g" x="592" y="24" width="124" height="66" rx="6"/>' +
        '<text class="d-t" x="654" y="46" text-anchor="middle">4 · Chạy thử</text>' +
        '<text class="d-tm" x="654" y="64" text-anchor="middle">qemu -bios</text>' +
        '<text class="d-ts" x="654" y="80" text-anchor="middle">dấu nhắc =&gt;</text>' +

        '<line class="d-line" x1="172" y1="57" x2="192" y2="57"/>' +
        '<path class="d-arrow" d="M200 57 l-9 -4.5 v9 z"/>' +
        '<line class="d-line" x1="368" y1="57" x2="388" y2="57"/>' +
        '<path class="d-arrow" d="M396 57 l-9 -4.5 v9 z"/>' +
        '<line class="d-line" x1="564" y1="57" x2="584" y2="57"/>' +
        '<path class="d-arrow" d="M592 57 l-9 -4.5 v9 z"/>' +

        '<line class="d-line" x1="284" y1="90" x2="284" y2="118"/>' +
        '<path class="d-arrow" d="M284 126 l-4.5 -9 h9 z"/>' +
        '<rect class="d-box" x="206" y="126" width="156" height="38" rx="5"/>' +
        '<text class="d-tm" x="284" y="143" text-anchor="middle">.config</text>' +
        '<text class="d-ts" x="284" y="157" text-anchor="middle">1 860 dòng</text>' +

        '<line class="d-line" x1="480" y1="90" x2="480" y2="118"/>' +
        '<path class="d-arrow" d="M480 126 l-4.5 -9 h9 z"/>' +
        '<rect class="d-box" x="402" y="126" width="156" height="38" rx="5"/>' +
        '<text class="d-tm" x="480" y="143" text-anchor="middle">u-boot.bin</text>' +
        '<text class="d-ts" x="480" y="157" text-anchor="middle">1 498 688 byte</text>' +

        '<line class="d-line" x1="4" y1="188" x2="716" y2="188"/>' +
        '<text class="d-ts" x="360" y="210" text-anchor="middle">Đổi cấu hình phải quay lại bước 2 — sửa tay vào .config rồi build tiếp là cách hỏng phổ biến nhất</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Bạn đã biết hai phần ba quy trình này rồi',
      x: '<code>make</code> và cách nó theo dõi phụ thuộc: <b>Bài 16</b>. ' +
         '<code>CROSS_COMPILE</code> và bộ công cụ <code>aarch64-linux-gnu-</code>: ' +
         '<b>Chặng 04</b>. Cái mới duy nhất ở đây là <b>Kconfig</b> — tầng cấu hình nằm giữa ' +
         'mã nguồn và trình biên dịch.' },

    /* ══════════════════════════════════════════════════════════════════
       3. -bios khác -kernel
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: '-bios khác -kernel ở chỗ nào' },

    { t: 'p', x:
      'Đây là chỗ dễ nhầm nhất của cả bài, và nó nối thẳng vào thí nghiệm bước 5 của Bài 33. ' +
      'Hai tuỳ chọn này khiến QEMU hành xử theo hai cách hoàn toàn khác nhau:' },

    { t: 'table',
      head: ['', '<code>-kernel Image</code>', '<code>-bios u-boot.bin</code>'],
      rows: [
        ['QEMU đóng vai gì',
         '<b>Đóng vai bootloader</b>: tự sinh 6 lệnh máy, tự chép DTB, tự đặt <code>x0</code>',
         '<b>Không đóng vai gì cả</b>: chỉ nạp file vào flash rồi thả CPU chạy'],
        ['File được đặt ở đâu',
         'Vào RAM tại <code>0x40200000</code>',
         'Vào <b>flash</b> tại địa chỉ vật lý <code>0x00000000</code>'],
        ['CPU bắt đầu ở đâu',
         '<code>PC = 0x40000000</code> — đầu RAM, nơi có 6 lệnh QEMU sinh ra',
         '<code>PC = 0x00000000</code> — đầu flash, byte đầu tiên của <code>u-boot.bin</code>'],
        ['Ai đặt <code>x0</code>',
         'QEMU',
         '<b>U-Boot</b> — và đó chính là điều bạn sẽ kiểm chứng ở Bài 35'],
        ['Giống thật tới đâu',
         'Là một sự tiện lợi chỉ có trong máy ảo',
         '<b>Giống hệt board thật</b>: BootROM cũng nạp bootloader từ đầu bộ nhớ không mất điện']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao lại là "bios" khi ARM không có BIOS?',
      x: 'Tên tuỳ chọn này là di sản từ thời QEMU chỉ mô phỏng PC, nơi firmware khởi động thật ' +
         'sự tên là BIOS. Trên máy <code>virt</code> của ARM64 nó chỉ còn nghĩa chung chung: ' +
         '<b>"đây là firmware, nạp vào đầu bộ nhớ không mất điện và cho CPU chạy từ đó"</b>. ' +
         'Đừng để cái tên đánh lừa — không có BIOS nào ở đây cả, chỉ có 64 MB flash và file ' +
         '<code>u-boot.bin</code> của bạn nằm ở byte số 0 của nó.' },

    { t: 'cal', kind: 'tip', title: 'Một câu để không bao giờ nhầm lại',
      x: '<b><code>-kernel</code> = QEMU làm bootloader hộ bạn. <code>-bios</code> = bạn tự mang ' +
         'bootloader tới.</b> Từ bài này trở đi cả Chặng 06 chỉ dùng <code>-bios</code>.' },

    /* ══════════════════════════════════════════════════════════════════
       4. Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: build U-Boot và chạy nó' },

    { t: 'p', x:
      'Bảy bước, khoảng 45 phút, trong đó riêng bước tải mã nguồn mất gần 2 phút tuỳ đường ' +
      'truyền. Toàn bộ làm trong WSL, ở thư mục mới <code>~/bai34</code>.' },

    { t: 'steps', items: [

      /* ---------- Bước 1 ---------- */
      { title: 'Kiểm tra phụ thuộc trước, rồi mới tải mã nguồn',
        blocks: [
          { t: 'p', x:
            'Quy tắc bạn đã học ở Chặng 04 và trả giá một lần: <b>đừng bao giờ khởi động một ' +
            'bản build dài để phát hiện mình thiếu gói</b>. Kiểm tra trước, mất 5 giây; phát ' +
            'hiện sau, mất cả bản build. U-Boot cần bộ công cụ chéo bạn đã có, cộng thêm vài ' +
            'thư viện cho các công cụ phụ trợ mà nó build kèm:' },

          { t: 'code', where: 'wsl',
            code:
              'sudo apt-get update\n' +
              'sudo apt-get install -y build-essential bison flex \\\n' +
              '  libssl-dev device-tree-compiler python3-dev \\\n' +
              '  libgnutls28-dev uuid-dev swig' },

          { t: 'cal', kind: 'warn', title: 'Ba gói cuối là thứ đã làm hỏng bản build đầu tiên khi soạn bài này',
            x: '<code>build-essential</code>, <code>bison</code>, <code>flex</code>, ' +
               '<code>libssl-dev</code>, <code>device-tree-compiler</code> và ' +
               '<code>python3-dev</code> đã có sẵn từ Chặng 04. Nhưng ' +
               '<code>libgnutls28-dev</code>, <code>uuid-dev</code> và <code>swig</code> thì ' +
               'chưa — và bản build đã chết ở phút cuối với ' +
               '<code>fatal error: gnutls/gnutls.h: No such file or directory</code>. Chi tiết ' +
               'thông báo lỗi nằm ở bảng "Lỗi thường gặp" cuối bài.' },

          { t: 'p', x:
            'Xác nhận bộ công cụ chéo còn nguyên, rồi tải mã nguồn về:' },

          { t: 'code', where: 'wsl',
            code:
              'aarch64-linux-gnu-gcc --version | head -n 1\n' +
              'nproc' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0\n' +
              '6' },

          { t: 'cal', kind: 'info', title: 'Hai con số này sẽ quay lại ở các bước sau',
            x: '<code>aarch64-linux-gnu-gcc 15.2.0</code> — đúng phiên bản bộ công cụ chéo bạn ' +
               'dựng ở <b>Chặng 04</b>, chưa hề đổi. Ghi nhớ chuỗi này: nó sẽ xuất hiện lại ' +
               'nguyên xi trong lệnh <code>version</code> gõ tại dấu nhắc <code>=&gt;</code> ở ' +
               'bước 6 — nếu khác đi, nghĩa là bạn đang chạy một bản build từ máy khác hoặc bộ ' +
               'công cụ khác. Còn <code>nproc</code> in ra <b>6</b> — đúng con số bạn sẽ gõ sau ' +
               'dấu <code>-j</code> ở bước 4, vì không có lý do gì để bảo <code>make</code> chạy ' +
               'nhiều tiến trình song song hơn số lõi CPU thật có.' },

          { t: 'code', where: 'wsl',
            code:
              'mkdir -p ~/bai34\n' +
              'cd ~/bai34\n' +
              'git clone --depth 1 --branch v2026.07 https://github.com/u-boot/u-boot.git' },

          { t: 'cmdx', cmd: 'git clone --depth 1 --branch v2026.07 https://github.com/u-boot/u-boot.git',
            title: 'Vì sao clone theo kiểu này chứ không clone trơn',
            rows: [
              ['<code>--depth 1</code>', 'Chỉ lấy <b>một</b> commit, bỏ toàn bộ lịch sử phía sau',
               'Lịch sử đầy đủ của U-Boot nặng hơn nhiều GB và bạn không cần nó để build. Đây ' +
               'gọi là <i>shallow clone</i>'],
              ['<code>--branch v2026.07</code>', 'Lấy đúng thẻ (tag) phiên bản này',
               '<b>Quan trọng nhất.</b> Nếu bỏ đi, bạn lấy nhánh phát triển đang chạy và mọi con ' +
               'số trong bài sẽ lệch. Kỹ sư embedded luôn ghim phiên bản, không bao giờ build ' +
               '"bản mới nhất"'],
              ['<code>u-boot.git</code>', 'Kho chính thức trên GitHub',
               'Kho gốc ở <code>source.denx.de</code>, GitHub là bản gương chính thức và thường tải nhanh hơn']
            ] },

          { t: 'p', x:
            'Git in ra một loạt dòng tiến trình. Dòng cuối cùng cho biết đã bung đủ file ra đĩa:' },

          { t: 'code', where: 'out', nocopy: true,
            code: 'Updating files: 100% (38022/38022), done.' },

          { t: 'p', x: 'Kiểm tra bạn đang đứng đúng chỗ mình muốn:' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai34/u-boot\n' +
              'git log --oneline -1\n' +
              'git describe --tags\n' +
              'du -sh .' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'ece349ad Prepare v2026.07\n' +
              'v2026.07\n' +
              '402M\t.' },

          { t: 'cal', kind: 'info', title: 'Ghim phiên bản là một thói quen nghề nghiệp',
            x: 'Toàn bộ số liệu trong bài này đo trên commit <code>ece349ad</code>, tức tag ' +
               '<code>v2026.07</code>. Lần tải mất <b>109,91 giây</b> và cho ra <b>402 MB</b> ' +
               'trên đĩa. Nếu bạn lấy phiên bản khác, kích thước <code>u-boot.bin</code> và số ' +
               'dòng <code>.config</code> sẽ khác — không sai, chỉ là khác. Khi báo lỗi cho ' +
               'người khác, <b>luôn kèm output của <code>git describe --tags</code></b>.' }
        ] },

      /* ---------- Bước 2 ---------- */
      { title: 'Khảo sát cây mã nguồn trước khi động vào nó',
        blocks: [
          { t: 'p', x:
            'Đứng trước một cây mã nguồn lạ, việc đầu tiên không phải là build mà là <b>đo xem ' +
            'nó to cỡ nào và tổ chức ra sao</b>. Vài lệnh đếm sẽ cho bạn cảm giác về quy mô:' },

          { t: 'code', where: 'wsl',
            code:
              'git ls-files | wc -l\n' +
              "git ls-files '*.c' '*.h' | wc -l\n" +
              "git ls-files '*.c' '*.h' | xargs cat | wc -l" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '38022\n' +
              '13161\n' +
              '3951888' },

          { t: 'cal', kind: 'info', title: 'Nếu bạn định đọc hết',
            x: '<b>3 951 888</b> dòng C và header. Đọc 100 dòng một phút, không nghỉ, bạn mất ' +
               'khoảng <b>75 ngày</b>. Đây không phải con số để doạ mà để rút ra kết luận đúng: ' +
               '<b>không ai đọc hết một cây mã nguồn embedded, người ta điều hướng nó</b>. Kỹ ' +
               'năng thật sự là biết cần mở file nào — và <b>Bài 38</b> sẽ dạy bạn đúng kỹ năng ' +
               'đó trên cây mã nguồn kernel còn lớn hơn nhiều.' },

          { t: 'p', x:
            'Bây giờ nhìn vào thư mục <code>configs/</code> — nơi cả ngành công nghiệp gửi board ' +
            'của họ vào:' },

          { t: 'code', where: 'wsl',
            code:
              'ls configs/*_defconfig | wc -l\n' +
              "grep -l '^CONFIG_SPL=y' configs/*_defconfig | wc -l\n" +
              "grep -l '^CONFIG_TPL=y' configs/*_defconfig | wc -l\n" +
              "grep -l '^CONFIG_ARM=y' configs/*_defconfig | wc -l" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '1522\n' +
              '546\n' +
              '41\n' +
              '1233' },

          { t: 'cal', kind: 'tip', title: 'Bốn con số này chính là phần lý thuyết của Bài 33, đo được',
            x: '<b>1 522</b> board được hỗ trợ sẵn — đây là lý do người ta chọn U-Boot. ' +
               '<b>546</b> board cần <b>SPL</b>, tức hơn một phần ba phải boot nhiều tầng vì ' +
               'SRAM quá bé, đúng như bài trước giải thích. Chỉ <b>41</b> board cần thêm ' +
               '<b>TPL</b> — trường hợp cực đoan, có thật nhưng hiếm. Và <b>1 233 / 1 522</b> là ' +
               'board ARM: <b>81 %</b>. Bạn đang học đúng kiến trúc mà thị trường dùng.' },

          { t: 'p', x: 'Kiểm tra board của bạn có nằm trong nhóm cần SPL không:' },

          { t: 'code', where: 'wsl',
            code: "grep -E 'CONFIG_(SPL|TPL)=' configs/qemu_arm64_defconfig || echo 'no SPL/TPL'" },

          { t: 'code', where: 'out', nocopy: true,
            code: 'no SPL/TPL' },

          { t: 'cal', kind: 'why', title: 'Vì sao qemu_arm64 không cần SPL',
            x: 'Vì RAM của máy ảo <code>virt</code> <b>không cần hiệu chỉnh</b> — nó chỉ là một ' +
               'mảng byte mà QEMU cấp phát sẵn. Không có nhiệm vụ "bật DRAM" thì không có lý do ' +
               'tồn tại cho tầng SPL. Nhờ vậy Chặng 06 của bạn đơn giản hơn hẳn đời thực: chỉ ' +
               'một file <code>u-boot.bin</code> duy nhất, không phải ghép SPL với U-Boot rồi ' +
               'flash vào đúng offset của thẻ SD.' }
        ] },

      /* ---------- Bước 3 ---------- */
      { title: 'Chọn cấu hình board bằng defconfig',
        blocks: [
          { t: 'p', x:
            'Một lệnh duy nhất biến 1 522 lựa chọn thành đúng một board. Hai biến môi trường ' +
            'phải khai báo trước, và bạn nên khai báo <b>một lần cho cả phiên làm việc</b> để ' +
            'không lỡ quên ở lệnh sau:' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai34/u-boot\n' +
              'export CROSS_COMPILE=aarch64-linux-gnu-\n' +
              'export ARCH=arm64\n' +
              'make qemu_arm64_defconfig' },

          { t: 'cmdx', cmd: 'export CROSS_COMPILE=aarch64-linux-gnu-  ·  export ARCH=arm64',
            title: 'Hai biến quyết định bản build này dành cho ai',
            rows: [
              ['<code>CROSS_COMPILE</code>', 'Tiền tố ghép vào trước tên mọi công cụ',
               'Hệ thống build sẽ gọi <code>${CROSS_COMPILE}gcc</code>, tức ' +
               '<code>aarch64-linux-gnu-gcc</code>. <b>Dấu gạch ngang cuối là bắt buộc</b> — ' +
               'thiếu nó sẽ thành <code>aarch64-linux-gnugcc</code> và không tìm thấy'],
              ['<code>ARCH</code>', 'Kiến trúc đích, chọn nhánh <code>arch/</code> nào được dùng',
               'Với <code>arm64</code>, hệ thống build lấy <code>arch/arm/</code> ở chế độ 64-bit. ' +
               'Đây cũng là biến bạn sẽ dùng nguyên xi khi build kernel ở <b>Chặng 07</b>'],
              ['<code>export</code>', 'Đưa biến vào môi trường, không chỉ vào shell hiện tại',
               'Không có <code>export</code> thì <code>make</code> — một tiến trình con — sẽ ' +
               'không nhìn thấy biến. Cơ chế này bạn đã học ở <b>Bài 13</b>']
            ] },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '  YACC    scripts/kconfig/zconf.tab.[ch]\n' +
              '  LEX     scripts/kconfig/zconf.lex.c\n' +
              '  HOSTCC  scripts/kconfig/zconf.tab.o\n' +
              '  HOSTLD  scripts/kconfig/conf\n' +
              '#\n' +
              '# configuration written to .config\n' +
              '#' },

          { t: 'cal', kind: 'info', title: 'Bốn dòng đầu là gì vậy?',
            x: '<code>HOSTCC</code> và <code>HOSTLD</code> nghĩa là biên dịch bằng ' +
               '<b>gcc của máy bạn</b>, không phải bộ công cụ chéo — vì ' +
               '<code>scripts/kconfig/conf</code> là chương trình chạy trên PC để đọc file ' +
               'Kconfig, không phải chạy trên board. Một bản build embedded luôn có hai loại ' +
               'trình biên dịch làm việc song song, và phân biệt được chúng là điều kiện để đọc ' +
               'hiểu log build. Toàn bộ bước này mất <b>2,90 giây</b>.' },

          { t: 'p', x:
            'Bây giờ mở kết quả ra xem. <code>.config</code> mới là thứ hệ thống build thật sự ' +
            'đọc, và nó dài hơn defconfig rất nhiều vì Kconfig đã điền mọi giá trị mặc định:' },

          { t: 'code', where: 'wsl',
            code:
              'wc -l configs/qemu_arm64_defconfig .config\n' +
              "grep -E '^CONFIG_(ARM64|POSITION_INDEPENDENT|TEXT_BASE|DEFAULT_DEVICE_TREE|SYS_LOAD_ADDR|BOOTDELAY|BOOTCOMMAND|SYS_PROMPT|OF_BOARD)=' .config" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '   1860 .config\n' +
              'CONFIG_ARM64=y\n' +
              'CONFIG_POSITION_INDEPENDENT=y\n' +
              'CONFIG_TEXT_BASE=0x00000000\n' +
              'CONFIG_DEFAULT_DEVICE_TREE="qemu-arm64"\n' +
              'CONFIG_SYS_LOAD_ADDR=0x40200000\n' +
              'CONFIG_BOOTDELAY=2\n' +
              'CONFIG_BOOTCOMMAND="bootflow scan -lb"\n' +
              'CONFIG_SYS_PROMPT="=> "\n' +
              'CONFIG_OF_BOARD=y' },

          { t: 'p', x:
            'Chín dòng này quyết định gần như toàn bộ những gì bạn sẽ thấy ở bước 5 và 6. Đọc ' +
            'kỹ, rồi lát nữa đối chiếu với log boot thật:' },

          { t: 'table',
            head: ['Symbol', 'Giá trị', 'Hệ quả bạn sẽ nhìn thấy'],
            rows: [
              ['<code>CONFIG_TEXT_BASE</code>', '<code>0x00000000</code>',
               'U-Boot được liên kết để chạy từ địa chỉ 0 — chính là đầu vùng flash, nơi ' +
               '<code>-bios</code> đặt nó'],
              ['<code>CONFIG_POSITION_INDEPENDENT</code>', '<code>y</code>',
               'U-Boot tự <b>di chuyển chính nó</b> lên đỉnh RAM lúc chạy. Bước 6 bạn sẽ thấy ' +
               'địa chỉ nó dời tới, trong dòng <code>relocaddr</code>'],
              ['<code>CONFIG_OF_BOARD</code>', '<code>y</code>',
               'U-Boot <b>không</b> dùng device tree tự build kèm, mà lấy cái QEMU đưa cho. ' +
               'Log boot sẽ ghi <code>devicetree: board</code>'],
              ['<code>CONFIG_BOOTDELAY</code>', '<code>2</code>',
               'Bạn có <b>2 giây</b> để bấm phím ngắt autoboot. Bấm hụt là phải chạy lại'],
              ['<code>CONFIG_BOOTCOMMAND</code>', '<code>"bootflow scan -lb"</code>',
               'Hết 2 giây mà không ai bấm, U-Boot chạy đúng câu lệnh này — và ở bước 5 nó sẽ ' +
               'thất bại, vì chưa có kernel nào để tìm'],
              ['<code>CONFIG_SYS_PROMPT</code>', '<code>"=&gt; "</code>',
               'Dấu nhắc <code>=&gt;</code> quen thuộc của U-Boot đến từ đây']
            ] },

          { t: 'cal', kind: 'danger', title: 'Đừng bao giờ sửa tay vào .config',
            x: 'Rất nhiều <code>CONFIG_</code> phụ thuộc lẫn nhau: bật cái này thì Kconfig tự ' +
               'bật ba cái khác. Sửa tay vào <code>.config</code> phá vỡ những ràng buộc đó và ' +
               'cho ra một bản build sai <i>mà vẫn biên dịch trót lọt</i> — loại lỗi tốn hàng ' +
               'giờ để tìm. Muốn đổi cấu hình, dùng <code>make menuconfig</code> (bạn sẽ học kỹ ' +
               'ở <b>Bài 39</b>) hoặc sửa file <code>defconfig</code> rồi chạy lại từ đầu.' }
        ] },

      /* ---------- Bước 4 ---------- */
      { title: 'Cross-compile và xem mình vừa tạo ra những gì',
        blocks: [
          { t: 'p', x:
            'Một lệnh, và lần này bạn đo nó. <code>-j6</code> vì máy có 6 lõi — đúng con số ' +
            '<code>nproc</code> đã in ở bước 1:' },

          { t: 'code', where: 'wsl',
            code:
              "/usr/bin/time -f 'REAL %e s | USER %U s | SYS %S s | MAXRSS %M kB' \\\n" +
              '  make -j6 > /tmp/ub-build.log 2>&1\n' +
              'tail -n 1 /tmp/ub-build.log\n' +
              'wc -l /tmp/ub-build.log' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'REAL 35.38 s | USER 150.01 s | SYS 21.78 s | MAXRSS 82668 kB\n' +
              '853 /tmp/ub-build.log' },

          { t: 'cal', kind: 'info', title: '150 giây công việc gói trong 35 giây đồng hồ',
            x: '<b>USER</b> là tổng thời gian CPU thật sự làm việc, cộng dồn mọi lõi; ' +
               '<b>REAL</b> là thời gian bạn ngồi chờ. Tỷ lệ <b>150,01 / 35,38 = 4,24</b> nghĩa ' +
               'là trung bình có 4,24 lõi bận suốt bản build — trên 6 lõi, đó là hiệu suất song ' +
               'song rất tốt. Phần thiếu hụt so với 6 là những đoạn không chia nhỏ được: liên ' +
               'kết cuối, sinh device tree, chạy Kconfig. <b>MAXRSS 82 668 kB</b> — chưa tới ' +
               '81 MB RAM — cho thấy build U-Boot rất nhẹ. Hãy nhớ con số này: kernel ở Chặng 07 ' +
               'sẽ tốn gấp hàng chục lần.' },

          { t: 'p', x:
            'Mười hai dòng cuối của log build là phần thú vị nhất — nó cho thấy chuỗi bước tạo ' +
            'ra ảnh nhị phân cuối cùng:' },

          { t: 'code', where: 'wsl', code: 'tail -n 12 /tmp/ub-build.log' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '  AR      lib/built-in.a\n' +
              '  AR      examples/built-in.a\n' +
              '  LD      u-boot\n' +
              '  OBJCOPY u-boot.srec\n' +
              '  OBJCOPY u-boot-nodtb.bin\n' +
              '  SYM     u-boot.sym\n' +
              '  RELOC   u-boot-nodtb.bin\n' +
              '  COPY    u-boot.bin\n' +
              '  DTC     arch/arm/dts/qemu-arm.dtb\n' +
              '  DTC     arch/arm/dts/qemu-arm64.dtb\n' +
              '  COPY    dts/dt.dtb\n' +
              '  OFCHK   .config' },

          { t: 'p', x:
            'Đọc theo thứ tự: <code>AR</code> gom object thành thư viện (<b>Bài 17</b>), ' +
            '<code>LD</code> liên kết ra ELF <code>u-boot</code>, <code>OBJCOPY</code> lột phần ' +
            'ELF đi để lấy mã thô, <code>RELOC</code> xử lý bảng tái định vị, ' +
            '<code>COPY</code> cho ra <code>u-boot.bin</code>, còn <code>DTC</code> là trình ' +
            'biên dịch device tree — thứ bạn sẽ mổ xẻ ở <b>Chặng 08</b>. Bây giờ xem sản phẩm:' },

          { t: 'code', where: 'wsl',
            code:
              'ls -la u-boot u-boot.bin u-boot-nodtb.bin u-boot.srec System.map\n' +
              'file u-boot\n' +
              'file u-boot.bin\n' +
              'aarch64-linux-gnu-size u-boot\n' +
              'du -sh .' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '-rw-r--r-- 1 shinarus shinarus   218243 Aug 16 12:13 System.map\n' +
              '-rwxr-xr-x 1 shinarus shinarus 10654232 Aug 16 12:13 u-boot\n' +
              '-rw-r--r-- 1 shinarus shinarus  1498688 Aug 16 12:13 u-boot-nodtb.bin\n' +
              '-rw-r--r-- 1 shinarus shinarus  1498688 Aug 16 12:13 u-boot.bin\n' +
              '-rw-r--r-- 1 shinarus shinarus  4303720 Aug 16 12:13 u-boot.srec\n' +
              'u-boot: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), statically linked, with debug_info, not stripped\n' +
              'u-boot.bin: data\n' +
              '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
              '1434148\t  62768\t      0\t1496916\t 16d754\tu-boot\n' +
              '481M\t.' },

          { t: 'p', x: 'Tên người dùng <code>shinarus</code> và mốc giờ <code>Aug 16 12:13</code> sẽ khác trên máy bạn; các kích thước byte mới cần khớp.' },

          { t: 'table',
            head: ['File', 'Kích thước', 'Là gì, dùng khi nào'],
            rows: [
              ['<code>u-boot</code>', '<b>10 654 232</b> B',
               'ELF đầy đủ, còn nguyên <code>debug_info</code> và bảng ký hiệu. <b>Không nạp vào ' +
               'board</b> — dùng để nạp vào GDB khi debug U-Boot'],
              ['<code>u-boot.bin</code>', '<b>1 498 688</b> B',
               '<b>Thứ bạn thật sự nạp.</b> Mã thô, không header, không metadata — CPU nhảy vào ' +
               'byte số 0 là chạy được ngay'],
              ['<code>u-boot-nodtb.bin</code>', '<b>1 498 688</b> B',
               'Bản không ghép device tree. Bằng đúng <code>u-boot.bin</code> ở đây, vì ' +
               '<code>CONFIG_OF_BOARD=y</code> nên device tree lấy từ QEMU chứ không nhúng vào'],
              ['<code>u-boot.srec</code>', '<b>4 303 720</b> B',
               'Cùng nội dung nhưng mã hoá thành văn bản Motorola S-record, cho các máy nạp ' +
               'flash chỉ nhận file text'],
              ['<code>System.map</code>', '<b>218 243</b> B',
               'Bảng ánh xạ tên hàm ↔ địa chỉ. Vô giá khi đọc crash dump — kernel cũng sinh ra ' +
               'file cùng tên ở Chặng 07']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao ELF nặng 10,6 MB mà .bin chỉ 1,5 MB?',
            x: 'Nhìn dòng <code>size</code>: <code>text</code> <b>1 434 148</b> + ' +
               '<code>data</code> <b>62 768</b> = <b>1 496 916</b> byte — gần đúng bằng ' +
               '<code>u-boot.bin</code>. Đó là <i>toàn bộ</i> mã và dữ liệu thật sự chạy trên ' +
               'board. Hơn <b>9 MB</b> còn lại trong file ELF là <code>debug_info</code>, bảng ' +
               'ký hiệu và metadata liên kết — hữu ích cho GDB, hoàn toàn vô dụng với CPU. Đây ' +
               'đúng là hiện tượng bạn đã đo ở <b>Bài 18</b> với <code>strip</code>. Còn ' +
               '<code>bss = 0</code> vì U-Boot khai báo vùng BSS riêng lúc chạy, không dựa vào ' +
               'trường này.' },

          { t: 'cal', kind: 'info', title: 'Thư mục phình từ 402 MB lên 481 MB — vào đâu?',
            x: 'Cộng năm file trong bảng trên: <b>10 654 232 + 1 498 688 + 1 498 688 + ' +
               '4 303 720 + 218 243 ≈ 18 MB</b> — quá xa so với <b>79 MB</b> chênh lệch giữa ' +
               '<code>402M</code> lúc mới clone (bước 1) và <code>481M</code> bây giờ. Phần còn ' +
               'thiếu, khoảng <b>61 MB</b>, là hàng chục nghìn file <code>.o</code> trung gian mà ' +
               '<code>make</code> cố tình giữ lại trong cây mã nguồn — không phải rác, mà là bộ ' +
               'nhớ đệm phụ thuộc. Đó chính là lý do bản build lại ở bước 7 chỉ mất <b>4,19 ' +
               'giây</b> thay vì <b>35,38 giây</b>: hầu hết <code>.o</code> đã có sẵn, chỉ file ' +
               'nào thật sự đổi mới bị dịch lại.' }
        ] },

      /* ---------- Bước 5 ---------- */
      { title: 'Nạp U-Boot vào QEMU bằng -bios',
        blocks: [
          { t: 'p', x:
            'Khoảnh khắc của bài. Chú ý dòng lệnh <b>không có <code>-kernel</code></b> — lần đầu ' +
            'tiên kể từ Chặng 05:' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai34/u-boot\n' +
              'qemu-system-aarch64 \\\n' +
              '  -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -bios u-boot.bin \\\n' +
              '  -nographic' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'Bloblist at 0 not found (err=-2)\n' +
              'alloc space exhausted ptr 400 limit 0\n' +
              'Bloblist at 0 not found (err=-2)\n' +
              '\n' +
              '\n' +
              'U-Boot 2026.07 (Aug 16 2026 - 12:12:35 +0700)\n' +
              '\n' +
              'DRAM:  512 MiB\n' +
              'using memory 0x5e650000-0x5f690000 for malloc()\n' +
              'Core:  51 devices, 14 uclasses, devicetree: board\n' +
              'Flash: 64 MiB\n' +
              'Loading Environment from Flash... *** Warning - bad CRC, using default environment\n' +
              '\n' +
              'In:    serial,usbkbd\n' +
              'Out:   serial,vidconsole\n' +
              'Err:   serial,vidconsole\n' +
              'No USB controllers found\n' +
              'Net:   eth0: virtio-net#32\n' +
              'Hit any key to stop autoboot:  0' },

          { t: 'cal', kind: 'info', title: 'Ba dòng đầu tiên trông như lỗi, nhưng không phải',
            x: '<code>Bloblist</code> là một vùng bộ nhớ nhỏ U-Boot dùng để truyền dữ liệu nội bộ ' +
               'giữa các giai đoạn khởi động (ví dụ từ SPL sang U-Boot chính). Ở bước 2 bạn đã ' +
               'xác nhận <code>qemu_arm64_defconfig</code> <b>không có SPL/TPL</b>, nên không có ' +
               'giai đoạn nào trước đó để lại một bloblist ở địa chỉ cố định — U-Boot đi tìm, ' +
               'không thấy, và báo <code>Bloblist at 0 not found (err=-2)</code>, đúng như dự ' +
               'đoán. Nó liền thử cấp phát một bloblist mới (kích thước mặc định của cấu hình ' +
               'này là <code>0x400</code> = <b>1024</b> byte, đúng con số sau chữ <code>ptr</code> ' +
               'trong dòng log), nhưng lần thử đầu tiên diễn ra <i>trước khi</i> bộ cấp phát bộ ' +
               'nhớ tạm của U-Boot được khởi tạo, nên giới hạn cấp phát khi đó vẫn là <code>0</code> ' +
               '— cấp phát thất bại, in ra <code>alloc space exhausted … limit 0</code>. Vài dòng ' +
               'mã sau đó bộ cấp phát đã sẵn sàng, U-Boot thử lại đúng việc này lần hai — đó là lý ' +
               'do dòng <code>Bloblist at 0 not found</code> xuất hiện <b>hai lần</b> nhưng dòng ' +
               'cấp phát lỗi chỉ xuất hiện <b>một lần</b>. Lần thử thứ hai thành công trong im ' +
               'lặng, và U-Boot đi tiếp — không dòng nào trong ba dòng này khiến máy dừng lại.' },

          { t: 'p', x:
            'Đọc từng dòng — mỗi dòng là một nhiệm vụ trong bốn nhiệm vụ của Bài 33 đang được ' +
            'thực hiện:' },

          { t: 'table',
            head: ['Dòng log', 'Ý nghĩa'],
            rows: [
              ['<code>U-Boot 2026.07 (Aug 16 2026 - 12:12:35 +0700)</code>',
               'Phiên bản và <b>dấu thời gian build của chính bạn</b>. Nếu con số này không đổi ' +
               'sau khi bạn sửa mã, nghĩa là QEMU đang nạp bản cũ'],
              ['<code>DRAM:  512 MiB</code>',
               '<b>Nhiệm vụ 1</b> xong. U-Boot không đoán con số này — nó đọc từ device tree mà ' +
               'QEMU đưa cho, và đúng bằng <code>-m 512M</code> bạn gõ'],
              ['<code>Core:  51 devices, 14 uclasses, devicetree: board</code>',
               '<code>devicetree: board</code> chính là hệ quả của <code>CONFIG_OF_BOARD=y</code> ' +
               'bạn đọc ở bước 3: device tree đến từ bên ngoài, không phải bản nhúng sẵn'],
              ['<code>Flash: 64 MiB</code>',
               'Vùng flash bắt đầu từ địa chỉ 0 — nơi <code>u-boot.bin</code> của bạn đang nằm'],
              ['<code>*** Warning - bad CRC, using default environment</code>',
               '<b>Bình thường, không phải lỗi.</b> Biến môi trường U-Boot được lưu trong flash, ' +
               'mà flash này còn trắng nên checksum sai. U-Boot dùng bộ mặc định biên dịch sẵn. ' +
               'Bài 35 sẽ dạy cách ghi đè và lưu lại'],
              ['<code>Hit any key to stop autoboot:  0</code>',
               'Đếm ngược <b>2 giây</b> đúng như <code>CONFIG_BOOTDELAY=2</code>. Số đếm ghi đè ' +
               'tại chỗ nên bạn chỉ thấy trạng thái cuối']
            ] },

          { t: 'p', x:
            'Hết 2 giây, U-Boot chạy <code>CONFIG_BOOTCOMMAND</code>, tức ' +
            '<code>bootflow scan -lb</code> — và nó thất bại, đúng như dự đoán ở bước 3:' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'Scanning for bootflows in all bootdevs\n' +
              "Scanning global bootmeth 'efi_mgr':\n" +
              'Cannot persist EFI variables without system partition\n' +
              "Scanning bootdev 'fw-cfg@9020000.bootdev':\n" +
              'fatal: no kernel available\n' +
              'scanning bus for devices...\n' +
              "Scanning bootdev 'virtio-net#32.bootdev':\n" +
              'BOOTP broadcast 1\n' +
              'DHCP client bound to address 10.0.2.15 (2 ms)\n' +
              "*** Warning: no boot file name; using '0A00020F.img'\n" +
              'TFTP from server 10.0.2.2; our IP address is 10.0.2.15\n' +
              "TFTP error: 'Access violation' (2)\n" +
              'Not retrying...\n' +
              'No more bootdevs\n' +
              '(0 bootflows, 0 valid)\n' +
              '=>' },

          { t: 'cal', kind: 'info', title: 'Thất bại này là bằng chứng U-Boot đang làm đúng việc',
            x: 'U-Boot lần lượt thử từng nguồn: firmware config của QEMU (<code>fw-cfg</code>) ' +
               '→ <code>fatal: no kernel available</code> vì bạn không truyền ' +
               '<code>-kernel</code>. Rồi tới mạng: nó <b>xin được địa chỉ IP thật</b> ' +
               '<code>10.0.2.15</code> từ DHCP của QEMU, thử tải file qua TFTP, và hỏng vì không ' +
               'có server TFTP nào. <b>0 bootflows, 0 valid</b> → nó bỏ cuộc và trả quyền cho bạn ' +
               'ở dấu nhắc <code>=&gt;</code>. Đây chính là <b>nhiệm vụ 2</b> ("tìm và nạp ' +
               'kernel") đang chạy — chỉ là chưa có gì để nạp. <b>Bài 36</b> sẽ dựng server TFTP ' +
               'thật và biến đúng đường dẫn này thành một lần boot thành công.' },

          { t: 'cal', kind: 'tip', title: 'Thoát QEMU khi đang dùng -nographic',
            x: '<kbd>Ctrl</kbd>+<kbd>C</kbd> sẽ bị U-Boot nuốt mất. Cách thoát là bấm ' +
               '<kbd>Ctrl</kbd>+<kbd>A</kbd>, thả ra, rồi bấm <kbd>X</kbd>. Bạn đã dùng tổ hợp ' +
               'này từ <b>Bài 32</b> — giờ nó còn cần hơn, vì U-Boot sẽ giữ bạn ở dấu nhắc mãi ' +
               'mà không tự thoát.' } ]
      },

      /* ---------- Bước 6 ---------- */
      { title: 'Gõ lệnh tại dấu nhắc => và đọc bản đồ bộ nhớ',
        blocks: [
          { t: 'p', x:
            'Chạy lại lệnh QEMU ở bước 5, nhưng lần này <b>bấm một phím bất kỳ trong 2 giây</b> ' +
            'để ngắt autoboot. Bạn sẽ dừng ngay ở <code>=&gt;</code>. Ba lệnh đầu tiên mà bất kỳ ' +
            'ai chạm vào U-Boot cũng nên biết:' },

          { t: 'code', where: 'uboot', code: 'version' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'U-Boot 2026.07 (Aug 16 2026 - 12:12:35 +0700)\n' +
              '\n' +
              'aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0\n' +
              'GNU ld (GNU Binutils for Ubuntu) 2.46' },

          { t: 'cal', kind: 'tip', title: 'version là câu hỏi đầu tiên khi debug bootloader',
            x: 'Nó in ra <b>đúng trình biên dịch đã tạo ra bản này</b> — chính là ' +
               '<code>aarch64-linux-gnu-gcc 15.2.0</code> bạn kiểm tra ở bước 1. Khi một board ' +
               'boot lạ, so <code>version</code> với bản build bạn nghĩ mình vừa nạp là cách ' +
               'nhanh nhất phát hiện mình đang chạy nhầm ảnh cũ.' },

          { t: 'code', where: 'uboot', code: 'bdinfo' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'boot_params = 0x0000000000000000\n' +
              'DRAM bank   = 0x0000000000000000\n' +
              '-> start    = 0x0000000040000000\n' +
              '-> size     = 0x0000000020000000\n' +
              'flashstart  = 0x0000000000000000\n' +
              'flashsize   = 0x0000000004000000\n' +
              'flashoffset = 0x000000000016de40\n' +
              'baudrate    = 115200 bps\n' +
              'relocaddr   = 0x000000005f690000\n' +
              'reloc off   = 0x000000005f690000\n' +
              'Build       = 64-bit\n' +
              'current eth = virtio-net#32\n' +
              'ethaddr     = 52:54:00:12:34:56\n' +
              'fdt_blob    = 0x000000005e54fd80\n' +
              'devicetree  = board\n' +
              'serial addr = 0x0000000009000000\n' +
              'TLB addr    = 0x000000005ffe0000' },

          { t: 'p', x:
            'Đây là bản đồ bộ nhớ máy <code>virt</code> mà bạn đã dựng bằng tay ở <b>Bài 30</b>, ' +
            'giờ được U-Boot in ra từ bên trong. Đối chiếu từng dòng:' },

          { t: 'table',
            head: ['Dòng', 'Giá trị', 'Khớp với điều bạn đã biết'],
            rows: [
              ['<code>DRAM start / size</code>', '<code>0x40000000</code> / <code>0x20000000</code>',
               'RAM bắt đầu tại <code>0x40000000</code> — chính địa chỉ mà 6 lệnh của QEMU nằm ở ' +
               'Bài 33. <code>0x20000000</code> = <b>512 MiB</b>, đúng <code>-m 512M</code>'],
              ['<code>flashstart / flashsize</code>', '<code>0x0</code> / <code>0x4000000</code>',
               'Flash <b>64 MiB</b> bắt đầu tại địa chỉ 0. <code>u-boot.bin</code> của bạn nằm ' +
               'ở byte số 0 của vùng này'],
              ['<code>flashoffset</code>', '<code>0x16de40</code>',
               'Đổi ra hệ 10 đúng bằng <b>1 498 688</b> — chính kích thước <code>u-boot.bin</code> ' +
               'ở bước 4. Trường này báo phần flash bị chiếm bởi chính U-Boot (gọi là ' +
               '<i>"monitor"</i> trong mã nguồn); nó xác nhận file bạn build và bản đang nằm ' +
               'trong flash là một, không lệch byte nào'],
              ['<code>relocaddr</code>', '<code>0x5f690000</code>',
               '<b>Hệ quả của <code>CONFIG_POSITION_INDEPENDENT=y</code>.</b> U-Boot đã tự chép ' +
               'mình lên gần đỉnh RAM để nhường toàn bộ khoảng dưới cho kernel'],
              ['<code>serial addr</code>', '<code>0x09000000</code>',
               'Địa chỉ thanh ghi PL011 — <b>đúng con số bạn đã ghi vào chương trình bare-metal ' +
               '105 byte ở Bài 30</b>'],
              ['<code>devicetree</code>', '<code>board</code>',
               'Xác nhận U-Boot dùng device tree do QEMU cấp, không dùng bản nhúng'],
              ['<code>fdt_blob</code>', '<code>0x5e54fd80</code>',
               'Nơi U-Boot đã chép device tree tới. Bài 35 sẽ cho bạn đọc nội dung nó bằng ' +
               'lệnh <code>fdt</code>']
            ] },

          { t: 'code', where: 'uboot', code: 'printenv' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'arch=arm\n' +
              'baudrate=115200\n' +
              'board=qemu-arm\n' +
              'boot_targets=qfw usb scsi virtio nvme dhcp\n' +
              'bootcmd=bootflow scan -lb\n' +
              'bootdelay=2\n' +
              'ethaddr=52:54:00:12:34:56\n' +
              'fdt_addr=0x40000000\n' +
              'fdtcontroladdr=5e54fd80\n' +
              'kernel_addr_r=0x40400000\n' +
              'loadaddr=0x40200000\n' +
              'preboot=usb start\n' +
              'pxefile_addr_r=0x40300000\n' +
              'ramdisk_addr_r=0x44000000\n' +
              'scriptaddr=0x40200000\n' +
              'stdin=serial,usbkbd\n' +
              'stdout=serial,vidconsole\n' +
              'vendor=emulation\n' +
              '\n' +
              'Environment size: 548/262140 bytes' },

          { t: 'cal', kind: 'why', title: 'Bốn biến _addr_r này là hợp đồng bàn giao đang chờ được thực hiện',
            x: 'Nhìn kỹ: <code>kernel_addr_r=0x40400000</code> — chỗ để đặt <code>Image</code>. ' +
               '<code>ramdisk_addr_r=0x44000000</code> — chỗ để đặt ' +
               '<code>initramfs.cpio.gz</code>. <code>fdt_addr=0x40000000</code> — chỗ có device ' +
               'tree, và <b>đây chính là giá trị sẽ được nạp vào <code>x0</code></b> lúc bàn ' +
               'giao. Tất cả đều căn 2 MB, tất cả đều nằm trong vùng RAM ' +
               '<code>0x40000000</code>–<code>0x5fffffff</code>, và không cái nào chồng lên cái ' +
               'nào. Nói cách khác, U-Boot đã <b>bày sẵn bàn</b> cho bốn nhiệm vụ của Bài 33 — ' +
               'chỉ còn thiếu file. <b>Bài 35</b> sẽ đổ đúng hai file trong <code>~/bai32</code> ' +
               'vào đúng những địa chỉ này.' },

          { t: 'cal', kind: 'info', title: 'Vì sao chỉ dùng 548 / 262 140 byte môi trường?',
            x: 'U-Boot dành hẳn <b>256 KB</b> flash để lưu biến môi trường, hiện mới dùng ' +
               '<b>548</b> byte. Chỗ trống đó không lãng phí: trên board thật, người ta nhét vào ' +
               'đây cả những đoạn script boot dài hàng chục dòng. Bấm ' +
               '<kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> để thoát trước khi sang bước cuối.' }
        ] },

      /* ---------- Bước 7 ---------- */
      { title: 'Áp một patch lên mã nguồn — kỹ năng dùng hằng tuần',
        blocks: [
          { t: 'p', x:
            'Trong nghề embedded bạn hiếm khi nhận được cả một cây mã nguồn. Bạn nhận <b>patch</b>: ' +
            'một file văn bản mô tả "sửa dòng nào, thành gì". Nhà cung cấp chip gửi patch, cộng ' +
            'đồng gửi patch, đồng nghiệp gửi patch. Bước này bạn tự tạo một patch, tự áp nó, rồi ' +
            'tự làm nó hỏng để biết cách gỡ.' },

          { t: 'h4', x: '7a. Tạo ra một patch để có cái mà áp' },

          { t: 'p', x:
            'Git cần biết bạn là ai trước khi tạo commit. Nếu chưa cấu hình bao giờ trong kho ' +
            'này, làm ngay — thiếu bước này <code>git am</code> sẽ chết với ' +
            '<code>fatal: empty ident name</code>:' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai34/u-boot\n' +
              'git config user.name "Course Author"\n' +
              'git config user.email "author@example.com"' },

          { t: 'p', x:
            'Mở <code>board/emulation/qemu-arm/qemu-arm.c</code> bằng ' +
            '<code>nano</code>, tìm hàm <code>board_late_init()</code> ở khoảng dòng 105, và ' +
            'chèn <b>hai dòng</b> ngay sau dấu <code>{</code> mở hàm:' },

          { t: 'code', where: 'file', lang: 'c', name: 'board/emulation/qemu-arm/qemu-arm.c',
            code:
              'int board_late_init(void)\n' +
              '{\n' +
              '\tprintf("Board: QEMU virt, Embedded Linux course build\\n");\n' +
              '\n' +
              '\t/*\n' +
              '\t * Make sure virtio bus is enumerated so that peripherals\n' +
              '\t * on the virtio bus can be discovered by their drivers\n' +
              '\t */\n' +
              '\tvirtio_init();' },

          { t: 'cal', kind: 'why', title: 'Vì sao chọn board_late_init() chứ không phải một hàm khác?',
            x: 'Khi soạn bài này, thử nghiệm đầu tiên đặt dòng in vào <code>checkboard()</code> ' +
               '— hàm nghe có vẻ đúng nhất. Bản build thành công, nhưng <b>dòng chữ không bao ' +
               'giờ xuất hiện</b>. Nguyên nhân: <code>checkboard()</code> chỉ được gọi từ ' +
               '<code>show_board_info()</code>, mà cấu hình này không đi qua đó. Bài học chung: ' +
               '<b>biên dịch trót lọt không có nghĩa là mã của bạn được chạy.</b> Khi thêm mã ' +
               'vào một dự án lạ, hãy chọn điểm móc mà bạn <i>chứng minh được</i> là có chạy — ' +
               '<code>board_late_init()</code> nằm thẳng trên đường khởi động và luôn được gọi.' },

          { t: 'p', x: 'Đóng gói thay đổi đó thành một commit, rồi xuất ra file patch:' },

          { t: 'code', where: 'wsl',
            code:
              'git diff --stat\n' +
              'git commit -am "board: qemu-arm: print a board banner at boot"\n' +
              'git format-patch -1 -o ~/bai34' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              ' board/emulation/qemu-arm/qemu-arm.c | 2 ++\n' +
              ' 1 file changed, 2 insertions(+)\n' +
              '[detached HEAD 685728b6] board: qemu-arm: print a board banner at boot\n' +
              ' 1 file changed, 2 insertions(+)\n' +
              '/home/shinarus/bai34/0001-board-qemu-arm-print-a-board-banner-at-boot.patch' },

          { t: 'cmdx', cmd: 'git format-patch -1 -o ~/bai34',
            title: 'Biến commit thành file gửi được qua email',
            rows: [
              ['<code>format-patch</code>', 'Xuất commit ra file văn bản có cả tác giả, ngày, mô tả',
               'Khác <code>git diff</code> ở chỗ nó giữ <b>metadata</b> — nhờ vậy ' +
               '<code>git am</code> ở đầu bên kia dựng lại được nguyên commit'],
              ['<code>-1</code>', 'Chỉ lấy <b>một</b> commit gần nhất',
               '<code>-3</code> sẽ cho ra ba file <code>0001-</code>, <code>0002-</code>, <code>0003-</code>'],
              ['<code>-o ~/bai34</code>', 'Ghi file ra thư mục này thay vì thư mục hiện tại',
               'Giữ cây mã nguồn sạch — patch không phải một phần của mã nguồn']
            ] },

          { t: 'p', x:
            'Xem thử file vừa tạo. Đây chính là định dạng bạn sẽ nhận từ nhà cung cấp chip:' },

          { t: 'code', where: 'wsl',
            code: 'cat ~/bai34/0001-board-qemu-arm-print-a-board-banner-at-boot.patch' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'From 685728b6bded2b39fb1de92a96c4e1a389a455e1 Mon Sep 17 00:00:00 2001\n' +
              'From: Course Author <author@example.com>\n' +
              'Date: Sun, 16 Aug 2026 12:25:37 +0700\n' +
              'Subject: [PATCH] board: qemu-arm: print a board banner at boot\n' +
              '\n' +
              '---\n' +
              ' board/emulation/qemu-arm/qemu-arm.c | 2 ++\n' +
              ' 1 file changed, 2 insertions(+)\n' +
              '\n' +
              'diff --git a/board/emulation/qemu-arm/qemu-arm.c b/board/emulation/qemu-arm/qemu-arm.c\n' +
              'index 38f0ec5f..a885eb46 100644\n' +
              '--- a/board/emulation/qemu-arm/qemu-arm.c\n' +
              '+++ b/board/emulation/qemu-arm/qemu-arm.c\n' +
              '@@ -104,6 +104,8 @@ struct mm_region *mem_map = qemu_arm64_mem_map;\n' +
              ' \n' +
              ' int board_late_init(void)\n' +
              ' {\n' +
              '+\tprintf("Board: QEMU virt, Embedded Linux course build\\n");\n' +
              '+\n' +
              ' \t/*\n' +
              ' \t * Make sure virtio bus is enumerated so that peripherals\n' +
              ' \t * on the virtio bus can be discovered by their drivers\n' +
              '-- \n' +
              '2.53.0' },

          { t: 'cal', kind: 'info', title: 'Đọc được cấu trúc một patch là đọc được một nửa công việc',
            x: 'Dòng <code>@@ -104,6 +104,8 @@</code> gọi là <b>hunk header</b>: "ở file cũ, bắt ' +
               'đầu từ dòng 104, lấy 6 dòng; ở file mới, cũng từ dòng 104, thành 8 dòng". Ba ' +
               'dòng bắt đầu bằng <b>dấu cách</b> phía trên và phía dưới là <b>ngữ cảnh</b> — ' +
               'chúng không thay đổi gì, chúng ở đó để công cụ <i>tìm đúng chỗ</i>. Chỉ hai dòng ' +
               'bắt đầu bằng <code>+</code> là nội dung mới. Chính cơ chế ngữ cảnh này quyết định ' +
               'patch có áp được hay không: mã nguồn xung quanh đổi thì ngữ cảnh không khớp, và ' +
               'patch hỏng. Mã băm sau <code>From</code> trên máy bạn sẽ khác vì nó phụ thuộc ' +
               'thời điểm commit.' },

          { t: 'h4', x: '7b. Quay về mã nguồn gốc rồi áp patch' },

          { t: 'p', x:
            'Bây giờ giả vờ bạn chưa từng sửa gì — xoá commit vừa rồi để trở lại đúng mã nguồn ' +
            'gốc, rồi áp patch như thể vừa nhận nó từ người khác:' },

          { t: 'code', where: 'wsl',
            code:
              'git reset --hard ece349ad\n' +
              'git log --oneline -1\n' +
              'git apply --check ~/bai34/0001-*.patch\n' +
              'echo "check result: $?"' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'HEAD is now at ece349ad Prepare v2026.07\n' +
              'ece349ad Prepare v2026.07\n' +
              'check result: 0' },

          { t: 'cal', kind: 'tip', title: 'Luôn --check trước khi áp',
            x: '<code>git apply --check</code> thử áp patch trong bộ nhớ và <b>không chạm vào ' +
               'file nào</b>. Mã thoát <b>0</b> nghĩa là áp được sạch sẽ. Với <code>patch</code> ' +
               'thì lệnh tương đương là <code>patch -p1 --dry-run &lt; file.patch</code>. Thói ' +
               'quen này giá 2 giây và tránh cho bạn một cây mã nguồn sửa dở dang.' },

          { t: 'code', where: 'wsl',
            code:
              'git am ~/bai34/0001-*.patch\n' +
              'git log --oneline -2' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'Applying: board: qemu-arm: print a board banner at boot\n' +
              '685728b6 board: qemu-arm: print a board banner at boot\n' +
              'ece349ad Prepare v2026.07' },

          { t: 'cal', kind: 'info', title: 'Mã băm giống hệt bước 7a — không phải trùng hợp',
            x: 'Commit mới mang hash <b><code>685728b6</code></b> — <b>y hệt</b> commit bạn tạo ' +
               'bằng <code>git commit -am</code> ở bước 7a, dù lần này bạn không gõ nội dung nào, ' +
               'chỉ áp một file patch. Đó là vì <code>git format-patch</code> đã đóng gói đủ tác ' +
               'giả, ngày giờ và nội dung thay đổi vào file patch, còn <code>git am</code> dựng ' +
               'lại commit từ đúng những dữ liệu đó — cùng đầu vào cho ra cùng hash. Đây chính là ' +
               'khác biệt lớn nhất so với <code>diff</code>/<code>patch</code> thường, thứ chỉ ' +
               'chép nội dung thay đổi chứ không mang theo danh tính commit.' },

          { t: 'cmdx', cmd: 'git am  ·  patch -p1',
            title: 'Hai cách áp patch, chọn cái nào',
            rows: [
              ['<code>git am file.patch</code>', 'Áp <b>và tạo commit</b> với đúng tác giả, ngày, mô tả gốc',
               'Dùng khi mã nguồn nằm trong Git — tức gần như luôn luôn. Hỏng thì có ' +
               '<code>git am --abort</code> đưa mọi thứ về nguyên trạng'],
              ['<code>patch -p1 &lt; file.patch</code>', 'Chỉ sửa file, không biết gì về Git',
               'Dùng khi mã nguồn <b>không</b> nằm trong Git — ví dụ một bản tarball từ nhà sản ' +
               'xuất. Hỏng thì bạn phải tự dọn'],
              ['<code>-p1</code>', 'Bỏ <b>một</b> cấp thư mục ở đầu mỗi đường dẫn',
               'Patch ghi <code>a/board/emulation/…</code>; bỏ <code>a/</code> đi mới ra đường ' +
               'dẫn thật. <b>Đây là nguyên nhân số một khiến patch "không tìm thấy file"</b> — ' +
               'nếu hỏng, thử <code>-p0</code> hoặc <code>-p2</code>']
            ] },

          { t: 'p', x: 'Build lại và chạy. Lần này build rất nhanh vì chỉ một file đổi:' },

          { t: 'code', where: 'wsl',
            code:
              "/usr/bin/time -f 'REAL %e s' make -j6 > /tmp/ub-rebuild.log 2>&1\n" +
              'tail -n 1 /tmp/ub-rebuild.log\n' +
              'wc -l /tmp/ub-rebuild.log' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'REAL 4.19 s\n' +
              '47 /tmp/ub-rebuild.log' },

          { t: 'cal', kind: 'info', title: '35,38 s → 4,19 s, và 853 dòng log → 47 dòng',
            x: 'Đây là <code>make</code> theo dõi phụ thuộc đang làm việc, đúng cơ chế bạn học ở ' +
               '<b>Bài 16</b>: chỉ một file <code>.c</code> đổi nên chỉ một file ' +
               '<code>.o</code> được dịch lại, phần còn lại là liên kết và đóng gói. Nếu bạn ' +
               'thấy build lại mất trọn 35 giây, nghĩa là có cái gì đó đã đụng vào ' +
               '<code>.config</code> hoặc một header dùng chung.' },

          { t: 'code', where: 'wsl',
            code:
              'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512M \\\n' +
              '  -bios u-boot.bin -nographic' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'U-Boot 2026.07-00001-g00a40294e789 (Aug 16 2026 - 12:16:10 +0700)\n' +
              '\n' +
              'DRAM:  512 MiB\n' +
              'using memory 0x5e650000-0x5f690000 for malloc()\n' +
              'Core:  51 devices, 14 uclasses, devicetree: board\n' +
              'Flash: 64 MiB\n' +
              'Loading Environment from Flash... *** Warning - bad CRC, using default environment\n' +
              '\n' +
              'In:    serial,usbkbd\n' +
              'Out:   serial,vidconsole\n' +
              'Err:   serial,vidconsole\n' +
              'Board: QEMU virt, Embedded Linux course build\n' +
              'No USB controllers found\n' +
              'Net:   eth0: virtio-net#32' },

          { t: 'cal', kind: 'info', title: 'Hai thay đổi, không phải một',
            x: 'Rõ ràng nhất là dòng <code>Board: QEMU virt, Embedded Linux course build</code> ' +
               'nằm đúng giữa <code>Err:</code> và <code>No USB controllers found</code> — mã ' +
               'của bạn đã chạy trên "phần cứng". Nhưng hãy để ý cả dòng đầu: chuỗi phiên bản ' +
               'đã đổi từ <code>U-Boot 2026.07</code> thành ' +
               '<code>U-Boot 2026.07-00001-g00a40294e789</code>. <b><code>-00001</code> nghĩa là ' +
               '"nhiều hơn tag 1 commit"</b>, phần sau là mã băm commit của bạn — nên con số trên ' +
               'máy bạn sẽ khác. Đây là cách nhanh nhất để biết một bản build có mang patch riêng ' +
               'hay là bản gốc, và nó tự động, không ai phải nhớ cập nhật.' },

          { t: 'h4', x: '7c. Khi patch không áp được' },

          { t: 'p', x:
            'Đây là phần bạn sẽ dùng nhiều hơn cả. Cách dựng lại tình huống một cách chắc chắn: ' +
            '<b>áp đúng patch đó lần thứ hai</b> lên cây mã nguồn đã có sẵn thay đổi. Thử với ' +
            '<code>patch -p1</code> trước:' },

          { t: 'code', where: 'wsl',
            code:
              'patch -p1 < ~/bai34/0001-*.patch\n' +
              'echo "exit code: $?"' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'patching file board/emulation/qemu-arm/qemu-arm.c\n' +
              'Reversed (or previously applied) patch detected!  Assume -R? [n]\n' +
              'Apply anyway? [n]\n' +
              'Skipping patch.\n' +
              '1 out of 1 hunk ignored -- saving rejects to file board/emulation/qemu-arm/qemu-arm.c.rej\n' +
              'exit code: 1' },

          { t: 'p', x:
            '<code>patch</code> nhận ra nội dung đã có sẵn, hỏi hai câu, rồi bỏ cuộc — nhưng nó ' +
            '<b>không im lặng bỏ qua</b>: nó ghi lại chính xác phần không áp được vào file ' +
            '<code>.rej</code>:' },

          { t: 'code', where: 'wsl',
            code: 'cat board/emulation/qemu-arm/qemu-arm.c.rej' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '--- board/emulation/qemu-arm/qemu-arm.c\n' +
              '+++ board/emulation/qemu-arm/qemu-arm.c\n' +
              '@@ -104,6 +104,8 @@ struct mm_region *mem_map = qemu_arm64_mem_map;\n' +
              ' \n' +
              ' int board_late_init(void)\n' +
              ' {\n' +
              '+\tprintf("Board: QEMU virt, Embedded Linux course build\\n");\n' +
              '+\n' +
              ' \t/*\n' +
              ' \t * Make sure virtio bus is enumerated so that peripherals\n' +
              ' \t * on the virtio bus can be discovered by their drivers' },

          { t: 'cal', kind: 'tip', title: 'File .rej là bản hướng dẫn sửa tay, không phải rác',
            x: 'Nó chứa <b>đúng những hunk không áp được</b>, kèm nguyên ngữ cảnh. Quy trình gỡ ' +
               'chuẩn: mở file <code>.rej</code>, mở file nguồn thật, tự tay chèn phần ' +
               '<code>+</code> vào đúng chỗ theo ngữ cảnh, rồi <b>xoá cả ' +
               '<code>.rej</code> lẫn <code>.orig</code></b>. Bỏ quên một file ' +
               '<code>.rej</code> trong cây mã nguồn là lỗi kinh điển — build vẫn chạy, nhưng ' +
               'người sau sẽ không hiểu nó là gì.' },

          { t: 'code', where: 'wsl', name: 'Dọn dẹp trước khi thử cách thứ hai',
            code:
              'rm -f board/emulation/qemu-arm/qemu-arm.c.rej \\\n' +
              '      board/emulation/qemu-arm/qemu-arm.c.orig\n' +
              'git checkout -- board/emulation/qemu-arm/qemu-arm.c' },

          { t: 'p', x: 'Bây giờ đúng tình huống đó với <code>git am</code>:' },

          { t: 'code', where: 'wsl',
            code:
              'git am ~/bai34/0001-*.patch\n' +
              'echo "exit code: $?"' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'error: patch failed: board/emulation/qemu-arm/qemu-arm.c:104\n' +
              'error: board/emulation/qemu-arm/qemu-arm.c: patch does not apply\n' +
              "hint: Use 'git am --show-current-patch=diff' to see the failed patch\n" +
              'hint: When you have resolved this problem, run "git am --continue".\n' +
              'hint: If you prefer to skip this patch, run "git am --skip" instead.\n' +
              'hint: To restore the original branch and stop patching, run "git am --abort".\n' +
              'Applying: board: qemu-arm: print a board banner at boot\n' +
              'Patch failed at 0001 board: qemu-arm: print a board banner at boot\n' +
              'exit code: 128' },

          { t: 'p', x:
            'Khác biệt lớn nhất so với <code>patch</code>: Git <b>tự nói cho bạn ba lối thoát</b>. ' +
            'Và quan trọng hơn, nó để kho ở trạng thái "đang áp dở" cho tới khi bạn quyết định:' },

          { t: 'table',
            head: ['Lệnh', 'Dùng khi', 'Kết quả'],
            rows: [
              ['<code>git am --abort</code>', 'Bạn muốn huỷ, quay về y như chưa từng thử',
               '<b>Lối thoát an toàn nhất, dùng nó khi phân vân.</b> Cây mã nguồn và lịch sử về ' +
               'nguyên trạng'],
              ['<code>git am --skip</code>', 'Patch này đã được áp rồi, bỏ qua và đi tiếp',
               'Rất hay gặp khi áp một loạt patch mà vài cái đã có trong bản mới'],
              ['<code>git am --continue</code>', 'Bạn đã sửa tay xong xung đột',
               'Yêu cầu <code>git add</code> file đã sửa trước; sau đó Git tạo commit và đi tiếp'],
              ['<code>git am --show-current-patch=diff</code>', 'Bạn muốn xem patch nào đang hỏng',
               'In ra phần diff đang mắc kẹt, tiện khi áp hàng chục patch một lúc']
            ] },

          { t: 'code', where: 'wsl',
            code:
              'git am --abort\n' +
              'git status --short\n' +
              'git log --oneline -1' },

          { t: 'code', where: 'out', nocopy: true,
            code: '685728b6 board: qemu-arm: print a board banner at boot' },

          { t: 'cal', kind: 'info', title: '--abort đưa bạn về đúng chỗ trước khi thử, không phải về mã nguồn gốc',
            x: '<code>git status --short</code> không in gì cả — cây mã nguồn sạch. Và ' +
               '<code>git log</code> cho thấy commit patch <b>lần đầu</b> vẫn còn nguyên. ' +
               '<code>--abort</code> chỉ huỷ <i>lần áp đang dở</i>, không huỷ những gì đã thành ' +
               'công trước đó. Nếu bạn muốn về hẳn mã nguồn gốc, dùng ' +
               '<code>git reset --hard ece349ad</code> như ở bước 7b.' },

          { t: 'cal', kind: 'warn', title: 'Giữ lại thư mục ~/bai34',
            x: 'Đừng xoá <code>~/bai34</code> sau bài này. <b>Bài 35</b> và <b>Bài 36</b> dùng ' +
               'lại đúng cây mã nguồn và đúng file <code>u-boot.bin</code> bạn vừa build — ' +
               'build lại từ đầu tốn thêm gần 2 phút tải mã nguồn. Nếu muốn có một bản sạch để ' +
               'sang bài sau, chạy <code>git reset --hard ece349ad</code> rồi ' +
               '<code>make -j6</code> một lần nữa.' }
        ] }

    ] },

    /* ══════════════════════════════════════════════════════════════════
       5. Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>tools/mkeficapsule.c:20:10: fatal error: gnutls/gnutls.h: No such file or directory</code><br>' +
         '<code>make[1]: *** [scripts/Makefile.host:113: tools/mkeficapsule.o] Error 1</code><br>' +
         '<code>make: *** [Makefile:2209: tools] Error 2</code>',
         'Thiếu gói <code>libgnutls28-dev</code>. Đây <b>chính là lỗi đã làm hỏng bản build đầu ' +
         'tiên khi soạn bài này</b>: nó chết ở khâu build công cụ phụ trợ trên máy chủ, không ' +
         'phải khâu biên dịch chéo',
         '<code>sudo apt-get install -y libgnutls28-dev uuid-dev swig</code> rồi chạy lại ' +
         '<code>make -j6</code>. Không cần <code>mrproper</code>, phần đã dịch vẫn dùng lại được'],
        ['<code>/bin/sh: 1: aarch64-linux-gnugcc: not found</code> (lặp lại rất nhiều lần)',
         '<code>CROSS_COMPILE</code> thiếu <b>dấu gạch ngang cuối</b>. Hệ thống build ghép ' +
         'thẳng <code>${CROSS_COMPILE}gcc</code> nên ra một tên vô nghĩa',
         'Đặt lại đúng <code>export CROSS_COMPILE=aarch64-linux-gnu-</code>, chú ý dấu ' +
         '<code>-</code> ở cuối'],
        ['<code>qemu-system-aarch64: Could not find ROM image \'nosuch.bin\'</code>',
         'Đường dẫn sau <code>-bios</code> sai, hoặc bạn chưa <code>cd</code> vào ' +
         '<code>~/bai34/u-boot</code>',
         '<code>ls -la u-boot.bin</code> để xác nhận file có thật. Nếu chưa có, bạn chưa chạy ' +
         '<code>make -j6</code> hoặc bản build đã hỏng'],
        ['<code>fatal: empty ident name (for &lt;…&gt;) not allowed</code>',
         '<code>git commit</code> hoặc <code>git am</code> cần biết tác giả, mà kho này chưa cấu ' +
         'hình <code>user.name</code> / <code>user.email</code>',
         'Chạy <code>git config user.name "…"</code> và <code>git config user.email "…"</code> ' +
         'trong kho, như ở bước 7a'],
        ['<code>Reversed (or previously applied) patch detected!  Assume -R? [n]</code><br>' +
         '<code>1 out of 1 hunk ignored -- saving rejects to file …c.rej</code>',
         'Patch <b>đã được áp rồi</b>. <code>patch</code> phát hiện nội dung mới đã có sẵn nên ' +
         'từ chối áp lần nữa',
         'Kiểm tra <code>git log --oneline -3</code> xem đã có commit đó chưa. Nếu đúng là đã áp ' +
         'thì xoá file <code>.rej</code> và <code>.orig</code>, không cần làm gì thêm'],
        ['<code>error: patch failed: …:104</code><br>' +
         '<code>error: …: patch does not apply</code><br>' +
         '<code>Patch failed at 0001 …</code>',
         'Ngữ cảnh trong patch không khớp với mã nguồn — hoặc patch đã áp rồi, hoặc bạn đang ở ' +
         'phiên bản U-Boot khác với phiên bản patch được viết cho',
         'Nếu phân vân, luôn chọn <code>git am --abort</code> để về nguyên trạng. Nếu chắc chắn ' +
         'patch đã có sẵn, dùng <code>git am --skip</code>. Muốn xem chi tiết: ' +
         '<code>git am --show-current-patch=diff</code>'],
        ['<code>*** Warning - bad CRC, using default environment</code>',
         '<b>Không phải lỗi.</b> Vùng flash lưu biến môi trường còn trắng nên checksum không khớp',
         'Bỏ qua. Bài 35 sẽ dạy <code>saveenv</code> để ghi môi trường xuống flash và làm cảnh ' +
         'báo này biến mất'],
        ['<kbd>Ctrl</kbd>+<kbd>C</kbd> không thoát được QEMU',
         '<code>-nographic</code> chuyển toàn bộ phím bấm vào máy ảo, và U-Boot nuốt ' +
         '<kbd>Ctrl</kbd>+<kbd>C</kbd>',
         'Bấm <kbd>Ctrl</kbd>+<kbd>A</kbd>, thả ra, rồi bấm <kbd>X</kbd>'],
        ['Bấm phím mãi vẫn không ngắt được autoboot',
         '<code>CONFIG_BOOTDELAY=2</code> chỉ cho bạn <b>2 giây</b>, và ' +
         '<code>preboot=usb start</code> chạy trước đó làm bạn tưởng còn thời gian',
         'Giữ tay sẵn trên phím <kbd>Enter</kbd> ngay khi gõ xong lệnh QEMU, hoặc bấm liên tục ' +
         'từ lúc máy ảo mới khởi động']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       6. Tóm tắt
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Ghi nhớ', items: [
      'Build U-Boot chỉ có ba bước: <b>clone ghim phiên bản</b> → <code>make ' +
      '&lt;board&gt;_defconfig</code> → <code>make -jN</code>. Đổi cấu hình phải quay lại bước ' +
      'giữa, <b>không bao giờ sửa tay vào <code>.config</code></b>.',
      'U-Boot <b>v2026.07</b>: <b>38 022</b> file, <b>3 951 888</b> dòng C/H, <b>402 MB</b> sau ' +
      'khi clone <code>--depth 1</code>. Có <b>1 522</b> defconfig, trong đó <b>546</b> cần SPL ' +
      'và <b>1 233</b> là board ARM.',
      'Hai biến quyết định bản build dành cho ai: <code>CROSS_COMPILE=aarch64-linux-gnu-</code> ' +
      '(<b>bắt buộc có dấu gạch ngang cuối</b>) và <code>ARCH=arm64</code>.',
      'Đo được trên máy này: defconfig <b>2,90 s</b>, build <code>-j6</code> <b>35,38 s</b> thực ' +
      'tế / <b>150,01 s</b> CPU (song song <b>4,24×</b>), đỉnh RAM <b>82 668 kB</b>. Build lại ' +
      'sau khi sửa một file chỉ mất <b>4,19 s</b>.',
      'Sản phẩm cần nhớ: <code>u-boot</code> là ELF <b>10 654 232</b> B dùng để debug; ' +
      '<code>u-boot.bin</code> là ảnh thô <b>1 498 688</b> B — <b>đây mới là thứ được nạp</b>. ' +
      'Chênh lệch gần 9 MB là <code>debug_info</code> và bảng ký hiệu.',
      '<code>-bios</code> đặt file vào <b>flash tại địa chỉ 0</b> và CPU chạy từ đó — giống board ' +
      'thật. <code>-kernel</code> thì QEMU đóng vai bootloader hộ. Cả Chặng 06 chỉ dùng ' +
      '<code>-bios</code>.',
      'Ba lệnh U-Boot mở đường: <code>version</code> (biết mình đang chạy bản nào), ' +
      '<code>bdinfo</code> (bản đồ bộ nhớ: DRAM <code>0x40000000</code> + <b>512 MiB</b>, flash ' +
      '<b>64 MiB</b> tại 0, <code>relocaddr 0x5f690000</code>, serial <code>0x09000000</code>), ' +
      '<code>printenv</code> (<code>kernel_addr_r</code>, <code>ramdisk_addr_r</code>, ' +
      '<code>fdt_addr</code> — bàn đã bày sẵn cho Bài 35).',
      'Áp patch: <b>luôn <code>--check</code> / <code>--dry-run</code> trước</b>. ' +
      '<code>git am</code> khi mã nguồn nằm trong Git (hỏng thì <code>git am --abort</code>); ' +
      '<code>patch -p1</code> khi không (hỏng thì đọc file <code>.rej</code> và sửa tay). ' +
      '<code>-p1</code> bỏ một cấp thư mục — đây là nguyên nhân số một khiến patch không tìm ' +
      'thấy file.'
    ] },

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo',
      x: 'Bạn đã có một bootloader thật đang chạy, nhưng mới chỉ nhìn nó. <b>Bài 35 — Dòng lệnh ' +
         'U-Boot</b> biến dấu nhắc <code>=&gt;</code> thành công cụ làm việc: đọc và ghi bộ nhớ ' +
         'bằng <code>md</code>/<code>mw</code>, sửa biến môi trường bằng ' +
         '<code>setenv</code>/<code>saveenv</code> để cảnh báo <code>bad CRC</code> biến mất, ' +
         'và quan trọng nhất — dùng <code>booti</code> để tự tay nạp <b>đúng hai file trong ' +
         '<code>~/bai32</code></b> vào <code>kernel_addr_r=0x40400000</code> và ' +
         '<code>ramdisk_addr_r=0x44000000</code>, rồi bàn giao. Lần này <b>không phải QEMU đặt ' +
         '<code>x0</code> nữa, mà là U-Boot</b> — và bạn sẽ kiểm chứng lại bằng đúng bộ công cụ ' +
         'GDB của Bài 33.' }

  ],

  quiz: [
    { q: 'Vì sao lệnh clone trong bài dùng <code>--depth 1 --branch v2026.07</code> thay vì <code>git clone</code> trơn?',
      opts: [
        'Vì kho U-Boot không cho phép clone đầy đủ',
        'Vì --depth 1 bỏ lịch sử để tải nhanh, và --branch ghim đúng một phiên bản để mọi số liệu tái lập được',
        'Vì chỉ nhánh v2026.07 mới build được cho ARM64',
        'Vì clone trơn sẽ không lấy được thư mục configs/'
      ],
      a: 1,
      why: 'Hai tuỳ chọn giải hai vấn đề khác nhau. <code>--depth 1</code> là chuyện tốc độ và ' +
           'dung lượng. <code>--branch v2026.07</code> là chuyện <b>kỷ luật nghề nghiệp</b>: ' +
           'build "bản mới nhất" nghĩa là hôm nay bạn và đồng nghiệp có thể đang build hai thứ ' +
           'khác nhau. Luôn kèm <code>git describe --tags</code> khi báo lỗi.' },

    { q: 'File <code>u-boot</code> nặng <b>10 654 232</b> byte còn <code>u-boot.bin</code> chỉ <b>1 498 688</b> byte. Nạp cái nào vào board?',
      opts: [
        'u-boot.bin — vì u-boot là ELF chứa debug_info và bảng ký hiệu, CPU không dùng tới',
        'u-boot — vì nó đầy đủ hơn',
        'Cả hai, u-boot trước rồi u-boot.bin sau',
        'Tuỳ board, board ARM64 dùng ELF còn board ARM32 dùng .bin'
      ],
      a: 0,
      why: 'Dòng <code>size</code> chứng minh: <code>text</code> 1 434 148 + <code>data</code> ' +
           '62 768 = <b>1 496 916</b> byte, xấp xỉ đúng <code>u-boot.bin</code>. Hơn 9 MB còn ' +
           'lại là thông tin cho GDB. CPU nhảy vào byte số 0 và thực thi ngay, nên nó cần mã ' +
           'thô, không cần header ELF.' },

    { q: 'Trong log boot có dòng <code>Core:  51 devices, 14 uclasses, devicetree: board</code>. Cụm <code>devicetree: board</code> đến từ đâu?',
      opts: [
        'Từ file .dtb mà DTC vừa build kèm vào u-boot.bin',
        'Từ tuỳ chọn -bios của QEMU',
        'Từ CONFIG_OF_BOARD=y — U-Boot lấy device tree do QEMU cấp thay vì dùng bản nhúng sẵn',
        'Từ biến môi trường fdt_addr'
      ],
      a: 2,
      why: 'Bạn đã đọc <code>CONFIG_OF_BOARD=y</code> trong <code>.config</code> ở bước 3 và ' +
           'nhìn thấy hệ quả của nó trong log ở bước 5. Đây cũng là lý do ' +
           '<code>u-boot.bin</code> bằng đúng <code>u-boot-nodtb.bin</code> — không có device ' +
           'tree nào được ghép vào ảnh.' },

    { q: 'Bạn sửa một dòng trong <code>board/emulation/qemu-arm/qemu-arm.c</code>, chạy <code>make -j6</code>, rồi boot lại — nhưng dòng chữ mới <b>không xuất hiện</b>, mà chuỗi phiên bản trong log vẫn là <code>U-Boot 2026.07</code> đúng dấu thời gian cũ. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Hàm bạn sửa không bao giờ được gọi trong cấu hình này',
        'QEMU đang nạp một u-boot.bin cũ — sai đường dẫn sau -bios hoặc bạn đang ở nhầm thư mục',
        'CONFIG_BOOTDELAY quá ngắn nên dòng chữ bị trôi mất',
        'Cần chạy make mrproper rồi build lại từ đầu'
      ],
      a: 1,
      why: 'Mấu chốt nằm ở <b>dấu thời gian build</b>. U-Boot in thời điểm biên dịch ngay dòng ' +
           'đầu; nếu nó không đổi thì ảnh đang chạy <i>không phải</i> ảnh bạn vừa tạo — vấn đề ' +
           'là đường dẫn, không phải mã nguồn. Nếu dấu thời gian <b>có</b> đổi mà dòng chữ vẫn ' +
           'vắng, khi đó mới nghi giả thuyết đầu tiên: hàm không được gọi — đúng chuyện đã xảy ' +
           'ra với <code>checkboard()</code> lúc soạn bài này.' },

    { q: '<code>git am</code> báo <code>Patch failed at 0001 …</code> và bạn chưa hiểu chuyện gì. Lệnh nào an toàn nhất để gõ tiếp?',
      opts: [
        'git am --continue',
        'git am --skip',
        'git am --abort',
        'git reset --hard HEAD'
      ],
      a: 2,
      why: '<code>--abort</code> đưa kho về đúng trạng thái trước khi bạn gõ <code>git am</code>, ' +
           'không mất gì. <code>--continue</code> chỉ đúng khi bạn đã tự sửa xong xung đột và ' +
           '<code>git add</code>; <code>--skip</code> vứt luôn patch, có thể mất thay đổi bạn ' +
           'cần. Nguyên tắc chung: <b>phân vân thì abort</b>.' },

    { q: 'Trong <code>printenv</code> có <code>kernel_addr_r=0x40400000</code> và <code>ramdisk_addr_r=0x44000000</code>. Hai biến này là gì?',
      opts: [
        'Địa chỉ hiện tại của kernel và ramdisk đang nằm trong RAM',
        'Địa chỉ mặc định mà U-Boot khuyến nghị để nạp kernel và ramdisk vào, đều căn 2 MB và không chồng lên nhau',
        'Địa chỉ trên flash nơi kernel và ramdisk được lưu',
        'Hai địa chỉ dành riêng cho việc nạp qua mạng bằng TFTP'
      ],
      a: 1,
      why: 'Hậu tố <code>_r</code> nghĩa là "RAM" — đây là <i>gợi ý về chỗ trống</i>, không phải ' +
           'nội dung đang có. Lúc này RAM ở những địa chỉ đó còn trắng. Chúng nằm gọn trong vùng ' +
           '<code>0x40000000</code>–<code>0x5fffffff</code>, căn 2 MB đúng yêu cầu của hợp đồng ' +
           'bàn giao ARM64 ở Bài 33, và Bài 35 sẽ đổ file thật vào đó.' }
  ]
});

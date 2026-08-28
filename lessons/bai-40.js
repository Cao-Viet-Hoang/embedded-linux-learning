/* Bài 40 — Build kernel ARM64 và boot
   Chặng 07 — Linux Kernel
   Kbuild: ARCH / CROSS_COMPILE, dây chuyền .c → .o → built-in.a → vmlinux → Image,
   chọn target (Image / dtbs / modules / modules_install), build ngoài cây nguồn với O=,
   giá thật của một lần build, và lần boot đầu tiên của một kernel do chính người học
   biên dịch. Mọi số liệu đo trên kernel 6.18.45, ARCH=arm64, máy 6 nhân / 4,8 GiB RAM. */

Lesson.register({
  id: 'bai-40',
  title: 'Build kernel ARM64 và boot',
  minutes: 60,
  practice: 'Thực hành 90 phút',
  level: 'Trung cấp',

  intro:
    'Bài 38 tải về <b>36 277 772</b> dòng mã C. Bài 39 biến chúng thành một file ' +
    '<code>.config</code> dài hơn mười một nghìn dòng. Đến giờ bạn vẫn chưa có một kernel ' +
    'nào cả — chỉ có mã nguồn, và một bản kê khai những gì cần lấy ra từ đống mã nguồn đó. ' +
    'Bài này là bước ghép hai thứ lại: bạn sẽ gọi Kbuild biên dịch hàng nghìn file, xem nó ' +
    'gộp dần từ <code>.o</code> lên <code>built-in.a</code> rồi lên <code>vmlinux</code>, và ' +
    'cuối cùng cắt ra một file nhị phân duy nhất tên là <code>Image</code> mà CPU ARM64 nhảy ' +
    'thẳng vào được. Bạn cũng sẽ đo chính xác cái giá phải trả: bao nhiêu phút đồng hồ, bao ' +
    'nhiêu phút CPU, hiệu suất song song thật trên 6 nhân là bao nhiêu, và cây nguồn phình ' +
    'ra thêm bao nhiêu GB. Kết thúc bài, bạn boot chính file <code>Image</code> đó trong ' +
    'QEMU và <code>uname -a</code> sẽ in ra cái tên bạn tự đặt cho kernel của mình.',

  goals: [
    'Giải thích được <code>ARCH=</code> và <code>CROSS_COMPILE=</code> làm gì, và chứng minh ' +
      'được rằng quên <code>CROSS_COMPILE</code> làm đổi cả <b>nội dung</b> <code>.config</code> ' +
      'chứ không chỉ đổi trình biên dịch.',
    'Vẽ lại được dây chuyền <code>.c</code> → <code>.o</code> → <code>built-in.a</code> → ' +
      '<code>vmlinux</code> → <code>Image</code>, và nói được vì sao <code>Image</code> nhỏ ' +
      'hơn <code>vmlinux</code> gần <b>4 lần</b>.',
    'Chọn đúng target cho từng thứ cần build — <code>Image</code>, <code>dtbs</code>, ' +
      '<code>modules</code>, <code>modules_install</code> — và biết rằng <code>make</code> ' +
      'không tham số trên ARM64 <b>không</b> cho bạn <code>Image</code>.',
    'Đo được giá thật của một lần build kernel: thời gian đồng hồ, thời gian CPU, hiệu suất ' +
      'song song trên 6 nhân, và dung lượng đĩa phát sinh.',
    'Build ra ngoài cây nguồn bằng <code>O=</code>, và giải thích được vì sao cây nguồn phải ' +
      'sạch (<code>mrproper</code>) thì <code>O=</code> mới chịu chạy.',
    'Boot kernel do chính bạn biên dịch trong QEMU và chứng minh nó là của bạn bằng ' +
      '<code>uname -a</code>.'
  ],

  blocks: [

    /* ============================================================
       1. ARCH và CROSS_COMPILE
       ============================================================ */
    { t: 'h2', x: 'Hai biến quyết định tất cả: <code>ARCH</code> và <code>CROSS_COMPILE</code>' },

    { t: 'p', x:
      'Ở Bài 27 bạn cross-compile một chương trình C bằng cách gõ thẳng tên trình biên dịch: ' +
      '<code>aarch64-linux-gnu-gcc hello.c -o hello</code>. Với kernel thì không làm thế được. ' +
      'Kernel có hơn ba mươi nghìn file <code>.c</code>, mỗi file cần một tập cờ biên dịch ' +
      'khác nhau tuỳ theo thư mục và tuỳ theo <code>.config</code>. Bạn không gọi gcc — bạn ' +
      'nói cho <b>Kbuild</b> (hệ thống <code>make</code> của kernel, xây trên đúng những nguyên ' +
      'lý bạn đã học ở Bài 16) biết <i>hai điều</i>, rồi để nó gọi gcc hộ bạn hàng nghìn lần.' },

    { t: 'p', x:
      'Hai điều đó là hai biến truyền vào dòng lệnh <code>make</code>: ' +
      '<code>ARCH=arm64</code> và <code>CROSS_COMPILE=aarch64-linux-gnu-</code>. ' +
      'Chúng trả lời hai câu hỏi khác nhau, và đây là chỗ người mới hay gộp làm một: ' +
      '<b><code>ARCH</code> chọn <i>mã nguồn</i> nào được dùng; <code>CROSS_COMPILE</code> ' +
      'chọn <i>công cụ</i> nào biên dịch mã nguồn đó.</b>' },

    { t: 'h3', x: '<code>ARCH</code> — chọn thư mục kiến trúc' },

    { t: 'p', x:
      'Hãy tự nhìn vào Makefile gốc của kernel thay vì tin lời tôi. Ba dòng sau là toàn bộ ' +
      'cơ chế:' },

    { t: 'code', where: 'wsl', code:
      'cd ~/bai38/linux-6.18.45\n' +
      'grep -n "^ARCH\\|^SRCARCH\\|^UTS_MACHINE" Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      '403:ARCH\t\t?= $(SUBARCH)\n' +
      '406:UTS_MACHINE \t:= $(ARCH)\n' +
      '407:SRCARCH \t:= $(ARCH)' },

    { t: 'p', x:
      'Dòng <b>403</b> dùng <code>?=</code> — "gán nếu chưa có giá trị". Nếu bạn không truyền ' +
      '<code>ARCH</code>, kernel lấy <code>SUBARCH</code>, tức kiến trúc của <i>máy đang chạy ' +
      'make</i>; trên máy này là <code>x86_64</code>. Đó là lý do một lệnh <code>make</code> ' +
      'trần trụi trong cây nguồn kernel sẽ lặng lẽ build một kernel x86 chứ không báo lỗi gì. ' +
      'Dòng <b>407</b> đặt <code>SRCARCH</code>, và <code>SRCARCH</code> chính là tên thư mục: ' +
      'mọi thứ Kbuild lấy sau đó đều nằm dưới <code>arch/$(SRCARCH)/</code> — tức ' +
      '<code>arch/arm64/</code>. Dòng <b>406</b> là thứ sẽ hiện ra ở cuối bài trong ' +
      '<code>uname -m</code>.' },

    { t: 'cal', kind: 'info', title: 'Vì sao có tận hai tên, <code>ARCH</code> và <code>SRCARCH</code>?',
      x: 'Vì có hai kiến trúc dùng chung một thư mục nguồn. Ngay dưới dòng 407, Makefile có ' +
         '<code>ifeq ($(ARCH),i386)</code> → <code>SRCARCH := x86</code>, và tương tự cho ' +
         '<code>x86_64</code>. Người dùng gõ <code>ARCH=i386</code>, còn mã nguồn thì nằm ở ' +
         '<code>arch/x86/</code>. Với <code>arm64</code> hai tên trùng nhau nên bạn không thấy ' +
         'sự khác biệt — nhưng cơ chế thì vẫn đó.' },

    { t: 'h3', x: '<code>CROSS_COMPILE</code> — một tiền tố, không phải một tên chương trình' },

    { t: 'p', x:
      'Giá trị <code>aarch64-linux-gnu-</code> kết thúc bằng dấu gạch ngang, và dấu gạch ngang ' +
      'đó là <b>một phần của giá trị</b>, không phải lỗi đánh máy. Lý do nằm ở khối này trong ' +
      'Makefile gốc:' },

    { t: 'code', where: 'wsl', code: 'sed -n "518,538p" Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      '# Make variables (CC, etc...)\n' +
      'CPP\t\t= $(CC) -E\n' +
      'ifneq ($(LLVM),)\n' +
      'CC\t\t= $(LLVM_PREFIX)clang$(LLVM_SUFFIX)\n' +
      'LD\t\t= $(LLVM_PREFIX)ld.lld$(LLVM_SUFFIX)\n' +
      'AR\t\t= $(LLVM_PREFIX)llvm-ar$(LLVM_SUFFIX)\n' +
      'NM\t\t= $(LLVM_PREFIX)llvm-nm$(LLVM_SUFFIX)\n' +
      'OBJCOPY\t\t= $(LLVM_PREFIX)llvm-objcopy$(LLVM_SUFFIX)\n' +
      'OBJDUMP\t\t= $(LLVM_PREFIX)llvm-objdump$(LLVM_SUFFIX)\n' +
      'READELF\t\t= $(LLVM_PREFIX)llvm-readelf$(LLVM_SUFFIX)\n' +
      'STRIP\t\t= $(LLVM_PREFIX)llvm-strip$(LLVM_SUFFIX)\n' +
      'else\n' +
      'CC\t\t= $(CROSS_COMPILE)gcc\n' +
      'LD\t\t= $(CROSS_COMPILE)ld\n' +
      'AR\t\t= $(CROSS_COMPILE)ar\n' +
      'NM\t\t= $(CROSS_COMPILE)nm\n' +
      'OBJCOPY\t\t= $(CROSS_COMPILE)objcopy\n' +
      'OBJDUMP\t\t= $(CROSS_COMPILE)objdump\n' +
      'READELF\t\t= $(CROSS_COMPILE)readelf\n' +
      'STRIP\t\t= $(CROSS_COMPILE)strip\n' +
      'endif',
      notes: ['Đây là dòng 518–538 của <code>Makefile</code> ở gốc cây nguồn 6.18.45. Số dòng ' +
             'có thể xê dịch vài đơn vị ở phiên bản kernel khác — nội dung thì không đổi đã ' +
              'nhiều năm.'] },

    { t: 'p', x:
      'Kbuild <b>dán</b> <code>$(CROSS_COMPILE)</code> vào trước tên từng công cụ. ' +
      'Đặt <code>CROSS_COMPILE=aarch64-linux-gnu-</code> thì <code>CC</code> trở thành ' +
      '<code>aarch64-linux-gnu-gcc</code>, <code>AR</code> thành ' +
      '<code>aarch64-linux-gnu-ar</code> (chính là <code>ar</code> bạn đã dùng để tạo thư viện ' +
      'tĩnh ở Bài 17), <code>OBJCOPY</code> thành <code>aarch64-linux-gnu-objcopy</code>. ' +
      'Bỏ dấu gạch ngang cuối thì bạn được <code>aarch64-linux-gnugcc</code> — một chương ' +
      'trình không tồn tại. Để trống hoàn toàn thì bạn được <code>gcc</code>, <code>ar</code>, ' +
      '<code>objcopy</code> — tức toolchain x86 của máy chủ.' },

    { t: 'cal', kind: 'info', title: 'Cả một nhánh <code>LLVM</code> ở ngay trên',
      x: 'Dòng <code>ifneq ($(LLVM),)</code> cho thấy kernel hỗ trợ build bằng clang: ' +
         '<code>make LLVM=1 ARCH=arm64</code> thay toàn bộ gcc/binutils bằng ' +
         'clang/ld.lld/llvm-*. Khi đó <code>CROSS_COMPILE</code> gần như không cần nữa, vì ' +
         'một clang duy nhất biên dịch được cho mọi kiến trúc (chỉ cần ' +
         '<code>--target=</code>). Bài này đi đường gcc vì đó là đường mặc định và là thứ bạn ' +
         'đã cài từ Bài 26 — nhưng biết rằng nhánh kia tồn tại là đủ.' },

    { t: 'table',
      head: ['Biến', 'Trả lời câu hỏi', 'Nếu bạn quên'],
      rows: [
        ['<code>ARCH=arm64</code>',
         'Lấy mã nguồn kiến trúc nào? → <code>arch/arm64/</code>',
         'Kbuild lấy kiến trúc của máy chủ (<code>x86_64</code>) và build một kernel x86 — ' +
         '<b>không báo lỗi</b>'],
        ['<code>CROSS_COMPILE=aarch64-linux-gnu-</code>',
         'Dùng bộ công cụ nào? → dán tiền tố vào <code>gcc</code>, <code>ld</code>, ' +
         '<code>ar</code>, <code>nm</code>, <code>objcopy</code>, <code>strip</code>…',
         'Kbuild dùng gcc x86 để dịch mã ARM64 → hỏng ngay ở file assembly đầu tiên, ' +
         '<b>và</b> làm sai cả nội dung <code>.config</code> (xem ngay dưới)']
      ] },

    { t: 'cal', kind: 'tip', title: 'Cách nhớ: một biến chọn “cái gì”, một biến chọn “bằng gì”',
      x: '<code>ARCH</code> = <i>cái gì</i> (mã nguồn nào). <code>CROSS_COMPILE</code> = ' +
         '<i>bằng gì</i> (công cụ nào). Bạn luôn cần <b>cả hai</b>, trên <b>mọi</b> lệnh ' +
         '<code>make</code> của bài này — kể cả các lệnh cấu hình như ' +
         '<code>defconfig</code> hay <code>olddefconfig</code>, vốn trông như chẳng dính ' +
         'dáng gì tới trình biên dịch. Phần ngay sau đây giải thích vì sao.' },

    { t: 'h3', x: 'Quên <code>CROSS_COMPILE</code> ở bước cấu hình làm hỏng chính <code>.config</code>' },

    { t: 'p', x:
      'Bài 39 dạy bạn rằng Kconfig là một ngôn ngữ khai báo. Điều Bài 39 chưa nói: ngôn ngữ đó ' +
      'có những hàm <b>chạy thử trình biên dịch ngay lúc đọc file Kconfig</b>. Ví dụ điển hình ' +
      'nhất nằm trong <code>arch/arm64/Kconfig</code>:' },

    { t: 'code', where: 'wsl', code: 'sed -n "411,412p" arch/arm64/Kconfig' },

    { t: 'code', where: 'out', nocopy: true, code:
      'config BROKEN_GAS_INST\n' +
      '\tdef_bool !$(as-instr,1:\\n.inst 0\\n.rept . - 1b\\n\\nnop\\n.endr\\n)' },

    { t: 'cmdx', title: 'Đọc dòng def_bool này', cmd: 'def_bool !$(as-instr,…)',
      rows: [
        ['<code>def_bool</code>',
         'Kiểu <code>bool</code> + giá trị mặc định, gộp làm một dòng — cú pháp bạn đã gặp ở Bài 39'],
        ['<code>$(as-instr,…)</code>',
         'Hàm của bộ tiền xử lý Kconfig: <b>thử assemble</b> đoạn mã trong ngoặc bằng ' +
         '<code>$(CC)</code>. Trả về <code>y</code> nếu dịch được, rỗng nếu không'],
        ['<code>!</code>',
         'Phủ định. Nên symbol này bằng <code>y</code> khi assembler <b>không</b> dịch nổi ' +
         'đoạn <code>.inst</code> đó'],
        ['<code>$(CC)</code> (ẩn)',
         '<b>Đây là mấu chốt.</b> <code>$(CC)</code> là <code>$(CROSS_COMPILE)gcc</code>. ' +
         'Không đặt <code>CROSS_COMPILE</code> thì phép thử này chạy bằng gcc <b>x86</b> — ' +
         'nó đương nhiên không hiểu cú pháp assembly ARM64']
      ] },

    { t: 'p', x:
      '<code>BROKEN_GAS_INST</code> chỉ là symbol dễ thấy nhất vì nó in ra một cảnh báo. ' +
      'Cùng cơ chế đó, hàng chục symbol <code>AS_HAS_*</code> và <code>CC_HAS_*</code> của ' +
      'ARM64 — hỗ trợ ARMv8.5, MTE, pointer authentication, shadow call stack — đều được ' +
      'quyết định bằng cách <i>hỏi trình biên dịch</i>. Hỏi nhầm trình biên dịch thì câu trả ' +
      'lời sai, và những symbol đó bị ghi <b>ra khỏi</b> <code>.config</code>.' },

    { t: 'cal', kind: 'warn', title: 'Hệ quả thực tế: hai file <code>.config</code> khác nhau',
      x: 'Cùng một cây nguồn, cùng một lệnh <code>defconfig</code>, chỉ khác có ' +
         '<code>CROSS_COMPILE</code>, cho ra hai file khác nhau — lệch <b>19 dòng</b>, trong ' +
         'đó <b>15</b> là tính năng ARM64 bị tắt. ' +
         'Bước 1 của phần thực hành sẽ bắt bạn tự tạo cả hai rồi <code>diff</code> chúng, ' +
         'nên đừng tin con số này vội. Điều cần nhớ ngay bây giờ là mẹo kiểm tra: ' +
         'dòng <code>CONFIG_CC_VERSION_TEXT</code> trong <code>.config</code> <b>ghi tên ' +
         'trình biên dịch đã được Kconfig đem đi thử</b>. Thấy nó ghi <code>gcc (Ubuntu …)</code> ' +
         'thay vì <code>aarch64-linux-gnu-gcc (Ubuntu …)</code> nghĩa là bạn đã cấu hình nhầm ' +
         'toolchain — vứt <code>.config</code> đó đi và làm lại.' },

    /* ============================================================
       2. Dây chuyền sản phẩm
       ============================================================ */
    { t: 'h2', x: 'Từ <code>.c</code> đến <code>Image</code>: dây chuyền sản phẩm' },

    { t: 'p', x:
      'Kbuild không có một Makefile khổng lồ nào cả. Nó là <b>make đệ quy</b>: Makefile ở gốc ' +
      'gọi xuống <code>drivers/</code>, <code>drivers/Makefile</code> gọi xuống ' +
      '<code>drivers/tty/</code>, cứ thế. Mỗi thư mục chỉ khai báo <i>những file .o nào của ' +
      'riêng nó cần có</i>, bằng đúng một dòng cho mỗi driver. Bạn đã nhìn thấy một dòng như ' +
      'thế ở Bài 38 khi truy vết PL011:' },

    { t: 'code', where: 'wsl', code: 'grep -n "amba-pl011" drivers/tty/serial/Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      '30:obj-$(CONFIG_SERIAL_AMBA_PL011)\t\t+= amba-pl011.o' },

    { t: 'p', x:
      'Hãy đọc dòng này thật chậm, vì nó là toàn bộ chỗ mà Bài 39 nối vào Bài 40. ' +
      '<code>$(CONFIG_SERIAL_AMBA_PL011)</code> được make thay bằng giá trị lấy từ ' +
      '<code>include/config/auto.conf</code> — file mà <code>syncconfig</code> sinh ra từ ' +
      '<code>.config</code>. Tuỳ giá trị đó, dòng trên biến thành một trong ba dòng khác nhau:' },

    { t: 'table',
      head: ['Trong <code>.config</code>', 'Dòng Makefile trở thành', 'Kết quả'],
      rows: [
        ['<code>CONFIG_SERIAL_AMBA_PL011=y</code>',
         '<code>obj-y += amba-pl011.o</code>',
         'File <code>.o</code> được gộp vào <code>built-in.a</code> của thư mục, rồi vào ' +
         '<code>vmlinux</code> — driver nằm <b>trong</b> kernel'],
        ['<code>CONFIG_SERIAL_AMBA_PL011=m</code>',
         '<code>obj-m += amba-pl011.o</code>',
         'File <code>.o</code> rẽ sang nhánh khác và thành <code>amba-pl011.ko</code> — ' +
         'một file rời, nạp lúc chạy'],
        ['<code># CONFIG_SERIAL_AMBA_PL011 is not set</code>',
         '<code>obj- += amba-pl011.o</code>',
         '<code>obj-</code> không phải biến nào mà Kbuild quan tâm → file ' +
         '<b>không bao giờ được biên dịch</b>']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao thiết kế kiểu này mới chịu nổi quy mô kernel',
      x: 'Kernel có hơn hai mươi hai nghìn symbol Kconfig (Bài 39 đã đếm). Nếu Kbuild phải có ' +
         'một danh sách trung tâm liệt kê file nào build file nào không, danh sách đó sẽ dài ' +
         'hơn cả mã nguồn và không ai bảo trì nổi. Thay vào đó, <b>quyết định được đặt cạnh ' +
         'chính thứ nó quyết định</b>: dòng bật/tắt PL011 nằm ngay trong thư mục chứa ' +
         '<code>amba-pl011.c</code>. Thêm một driver mới = thêm một dòng <code>obj-</code> và ' +
         'một mục <code>config</code>, không đụng vào bất cứ file trung tâm nào. Đây cũng là lý ' +
         'do <code>make</code> đệ quy — thứ bị chê là chậm ở các dự án khác — vẫn sống tốt ở đây.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 190" width="720" role="img" ' +
        'aria-label="Dây chuyền build kernel: mã nguồn .c và .S qua gcc thành .o, qua ar thành ' +
        'built-in.a, qua ld thành vmlinux dạng ELF, rồi qua objcopy thành Image nhị phân; ' +
        'nhánh obj-m rẽ từ .o ra thành file .ko">' +
        '<text class="d-tm" x="180" y="22" text-anchor="middle">gcc -c</text>' +
        '<text class="d-tm" x="360" y="22" text-anchor="middle">ar</text>' +
        '<text class="d-tm" x="540" y="22" text-anchor="middle">ld</text>' +
        '<rect class="d-box" x="15" y="32" width="150" height="50" rx="8"/>' +
        '<text class="d-t" x="90" y="52" text-anchor="middle">mã nguồn kernel</text>' +
        '<text class="d-tm" x="90" y="69" text-anchor="middle">.c   .S</text>' +
        '<rect class="d-box" x="195" y="32" width="150" height="50" rx="8"/>' +
        '<text class="d-t" x="270" y="52" text-anchor="middle">file đối tượng</text>' +
        '<text class="d-tm" x="270" y="69" text-anchor="middle">.o</text>' +
        '<rect class="d-box" x="375" y="32" width="150" height="50" rx="8"/>' +
        '<text class="d-t" x="450" y="52" text-anchor="middle">gộp theo thư mục</text>' +
        '<text class="d-tm" x="450" y="69" text-anchor="middle">built-in.a</text>' +
        '<rect class="d-box-p" x="555" y="32" width="150" height="50" rx="8"/>' +
        '<text class="d-t" x="630" y="52" text-anchor="middle">kernel dạng ELF</text>' +
        '<text class="d-tm" x="630" y="69" text-anchor="middle">vmlinux</text>' +
        '<line class="d-line" x1="165" y1="57" x2="186" y2="57"/>' +
        '<path class="d-arrow" d="M186 53 L195 57 L186 61 Z"/>' +
        '<line class="d-line" x1="345" y1="57" x2="366" y2="57"/>' +
        '<path class="d-arrow" d="M366 53 L375 57 L366 61 Z"/>' +
        '<line class="d-line" x1="525" y1="57" x2="546" y2="57"/>' +
        '<path class="d-arrow" d="M546 53 L555 57 L546 61 Z"/>' +
        '<line class="d-line" x1="270" y1="82" x2="270" y2="117"/>' +
        '<path class="d-arrow" d="M266 117 L270 126 L274 117 Z"/>' +
        '<text class="d-tm" x="280" y="105" text-anchor="start">obj-m</text>' +
        '<rect class="d-box-a" x="195" y="126" width="150" height="50" rx="8"/>' +
        '<text class="d-t" x="270" y="146" text-anchor="middle">module rời</text>' +
        '<text class="d-tm" x="270" y="163" text-anchor="middle">.ko</text>' +
        '<line class="d-line" x1="630" y1="82" x2="630" y2="117"/>' +
        '<path class="d-arrow" d="M626 117 L630 126 L634 117 Z"/>' +
        '<text class="d-tm" x="620" y="105" text-anchor="end">objcopy -O binary</text>' +
        '<rect class="d-box-g" x="545" y="126" width="170" height="50" rx="8"/>' +
        '<text class="d-t" x="630" y="146" text-anchor="middle">ảnh nhị phân thuần</text>' +
        '<text class="d-tm" x="630" y="163" text-anchor="middle">Image</text>' +
        '</svg>',
      cap: 'Toàn bộ dây chuyền. <code>obj-y</code> đi thẳng theo hàng ngang vào ' +
           '<code>vmlinux</code>; <code>obj-m</code> rẽ xuống thành <code>.ko</code>. ' +
           '<code>vmlinux</code> <b>vẫn là ELF</b> nên phải qua <code>objcopy</code> một lần ' +
           'nữa mới thành thứ mà bootloader nhảy vào được.' },

    { t: 'h3', x: '<code>built-in.a</code> là một thư viện tĩnh, đúng nghĩa Bài 17' },

    { t: 'p', x:
      'Không có gì huyền bí ở bước thứ ba. <code>built-in.a</code> là một archive do ' +
      '<code>ar</code> tạo ra — cùng một chương trình, cùng một định dạng với thư viện tĩnh ' +
      '<code>libmylib.a</code> bạn tự đóng gói ở Bài 17. Mỗi thư mục có mã được bật sẽ có một ' +
      'file <code>built-in.a</code> của riêng nó, và thư mục cha lại gộp các archive con lên ' +
      'trên. Ở bước thực hành bạn sẽ mở một cái ra bằng <code>ar t</code> và thấy đúng những ' +
      'file <code>.o</code> mà <code>.config</code> đã chọn — không hơn.' },

    { t: 'h3', x: 'Vì sao <code>vmlinux</code> chưa boot được, và <code>Image</code> thì được' },

    { t: 'p', x:
      '<code>vmlinux</code> là một file ELF (Bài 18): nó có header ELF, có bảng section, có ' +
      'bảng symbol, có cả thông tin debug. Tất cả những thứ đó chỉ có ý nghĩa với một chương ' +
      'trình biết <i>đọc</i> ELF — trên máy Linux bình thường thì đó là ' +
      '<code>execve()</code> và trình nạp động. Nhưng ở thời điểm kernel được nạp, chưa có ' +
      'Linux nào cả: chỉ có bootloader, và Bài 33 đã cho bạn thấy hợp đồng bàn giao của ARM64 ' +
      'đơn giản đến mức nào — bootloader đặt một khối byte vào RAM rồi <b>nhảy vào byte đầu ' +
      'tiên</b> của khối đó. Nó không phân tích ELF. Nó không biết section là gì.' },

    { t: 'p', x:
      'Nên bước cuối của dây chuyền là cắt phần thịt ra khỏi bộ khung ELF. Việc đó do đúng một ' +
      'dòng trong <code>arch/arm64/boot/Makefile</code> làm:' },

    { t: 'code', where: 'wsl', code: 'sed -n "17,23p" arch/arm64/boot/Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      'OBJCOPYFLAGS_Image :=-O binary -R .note -R .note.gnu.build-id -R .comment -S\n' +
      '\n' +
      'targets := Image Image.bz2 Image.gz Image.lz4 Image.lzma Image.lzo \\\n' +
      '\tImage.zst Image.xz image.fit\n' +
      '\n' +
      '$(obj)/Image: vmlinux FORCE\n' +
      '\t$(call if_changed,objcopy)' },

    { t: 'cmdx', title: 'Các cờ objcopy tạo ra Image', cmd: 'objcopy -O binary -R .note -R .note.gnu.build-id -R .comment -S vmlinux Image',
      rows: [
        ['<code>-O binary</code>',
         'Định dạng đầu ra là <b>nhị phân thuần</b>: chỉ đổ nội dung các section có nạp vào ' +
         'bộ nhớ, đúng thứ tự địa chỉ, không header, không metadata'],
        ['<code>-R .note</code>',
         'Bỏ (remove) section <code>.note</code> — ghi chú của công cụ build, vô dụng lúc chạy'],
        ['<code>-R .note.gnu.build-id</code>',
         'Bỏ mã băm định danh bản build (bạn đã gặp <code>BuildID</code> ở Bài 18)'],
        ['<code>-R .comment</code>',
         'Bỏ chuỗi ghi phiên bản trình biên dịch mà gcc tự nhét vào'],
        ['<code>-S</code>',
         '<b>Strip</b>: bỏ toàn bộ bảng symbol và thông tin debug. Đây là cờ ăn nhiều dung ' +
         'lượng nhất — bạn sẽ tự đo tỉ lệ ở bước 3'],
        ['<code>$(call if_changed,objcopy)</code>',
         'Không phải cờ, mà là cách Kbuild chỉ chạy lại lệnh khi đầu vào <b>hoặc chính dòng ' +
         'lệnh</b> đổi — cơ chế build tăng dần, xem lại Bài 16']
      ] },

    { t: 'cal', kind: 'info', title: 'Bỏ hết symbol rồi thì <code>panic</code> in ra cái gì?',
      x: 'Đây là câu hỏi đúng, và kernel có câu trả lời riêng cho nó. Trước khi ' +
         '<code>objcopy</code> chạy, Kbuild link <code>vmlinux</code> <b>ba lần</b> ' +
         '(<code>.tmp_vmlinux0</code>, <code>.tmp_vmlinux1</code>, ' +
         '<code>.tmp_vmlinux2</code>) để nhúng một bảng tên hàm <i>vào trong chính phần dữ ' +
         'liệu</i> của kernel — cơ chế <b>kallsyms</b>. Bảng đó không phải bảng symbol ELF nên ' +
         '<code>-S</code> không đụng tới, và nó chính là thứ khiến vết ' +
         '<code>Call trace:</code> khi kernel panic hiện ra tên hàm chứ không phải một dãy địa ' +
         'chỉ trần. Song song đó Kbuild ghi <code>System.map</code> ở gốc cây nguồn — bản đồ ' +
         'symbol dạng văn bản cho công cụ bên ngoài dùng. Bạn sẽ thấy cả ba lần link đó trong ' +
         'log ở bước 2.' },

    { t: 'terms',
      items: [
        ['vmlinux', '', 'Kernel đã link xong, dạng <b>ELF</b>, còn nguyên symbol và debug info. ' +
          'Không boot được, nhưng là thứ bạn nạp vào gdb hoặc đưa cho <code>objdump</code>. ' +
          'Chữ <i>vm</i> là <i>virtual memory</i>, không phải <i>virtual machine</i>'],
        ['Image', '', 'Ảnh nhị phân thuần của ARM64, có header 64 byte theo đúng giao thức boot ' +
          'bạn đã mổ ở Bài 33. Đây là file bạn đưa cho QEMU hoặc U-Boot'],
        ['Image.gz', '', 'Chính <code>Image</code> đó nén gzip. Bootloader phải biết giải nén; ' +
          'QEMU với <code>-kernel</code> thì nhận cả hai'],
        ['built-in.a', '', 'Archive <code>ar</code> chứa mọi <code>.o</code> của một thư mục có ' +
          '<code>obj-y</code>. Trung gian thuần tuý, không phải sản phẩm cuối'],
        ['System.map', '', 'Danh sách <i>địa chỉ — kiểu — tên</i> của mọi symbol trong ' +
          '<code>vmlinux</code>, dạng text. Dùng để giải mã địa chỉ trong oops khi kallsyms ' +
          'không có sẵn'],
        ['kallsyms', '', 'Bảng tên symbol được nhúng <b>vào trong</b> kernel, cho phép kernel tự ' +
          'in tên hàm trong <code>Call trace:</code> mà không cần file ngoài'],
        ['.ko', 'kernel object', 'Một module rời: file ELF khả tái định vị, nạp vào kernel đang ' +
          'chạy bằng <code>insmod</code>. Chặng 10 sẽ tự viết một cái']
      ] },

    /* ============================================================
       3. Chọn đúng target
       ============================================================ */
    { t: 'h2', x: 'Chọn đúng target: <code>Image</code>, <code>dtbs</code>, <code>modules</code>' },

    { t: 'p', x:
      'Bài 39 làm việc với <b>24</b> target cấu hình. Giờ là nhóm target thứ hai: nhóm thật sự ' +
      'biên dịch. Nhóm này ít hơn nhiều, nhưng có một cái bẫy ngay ở target mặc định, nên ta ' +
      'đọc mã nguồn trước rồi mới lập bảng.' },

    { t: 'h3', x: 'Cái bẫy: <code>make</code> không tham số <b>không</b> cho bạn <code>Image</code>' },

    { t: 'p', x:
      'Target mặc định của <code>make</code> tên là <code>all</code>. Trên ARM64, ' +
      '<code>all</code> được định nghĩa như sau:' },

    { t: 'code', where: 'wsl', code: 'sed -n "171,177p" arch/arm64/Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      'ifeq ($(CONFIG_EFI_ZBOOT),)\n' +
      'KBUILD_IMAGE\t:= $(boot)/Image.gz\n' +
      'else\n' +
      'KBUILD_IMAGE\t:= $(boot)/vmlinuz.efi\n' +
      'endif\n' +
      '\n' +
      'all:\t$(notdir $(KBUILD_IMAGE))' },

    { t: 'p', x:
      'Với <code>arm64_defconfig</code> thì <code>CONFIG_EFI_ZBOOT</code> không được bật, nên ' +
      'nhánh đầu trúng: <code>KBUILD_IMAGE</code> là <code>arch/arm64/boot/<b>Image.gz</b></code>. ' +
      '<code>$(notdir …)</code> cắt lấy phần tên file, nên <code>all</code> phụ thuộc vào ' +
      '<code>Image.gz</code>. Cộng thêm ba dòng <code>all:</code> nữa trong Makefile gốc — ' +
      '<code>all: vmlinux</code> (dòng 812), <code>all: dtbs</code> (dòng 1545, khi ' +
      '<code>CONFIG_OF_EARLY_FLATTREE=y</code>) và <code>all: modules</code> (dòng 1580, khi ' +
      '<code>CONFIG_MODULES=y</code>) — bạn được bức tranh đầy đủ.' },

    { t: 'cal', kind: 'warn', title: 'Đọc kỹ hệ quả trước khi gõ <code>make</code>',
      x: 'Một lệnh <code>make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu-</code> trần trụi sẽ ' +
         'build <code>vmlinux</code>, <b>toàn bộ</b> module, <b>toàn bộ</b> device tree, và ' +
         '<code>Image.gz</code> — tức là gần như mọi thứ, tốn gần một tiếng, ' +
         '<b>trừ đúng một thứ bạn cần nhất: file <code>Image</code> không nén</b>. ' +
         'Nó vẫn có trên đĩa (vì <code>Image.gz</code> được nén <i>từ</i> nó), nhưng bạn đã trả ' +
         'tiền cho một đống thứ không định làm. Trong bài này ta luôn gọi tên target rõ ràng.' },

    { t: 'h3', x: 'Bảng target' },

    { t: 'table',
      head: ['Target', 'Sinh ra', 'Khi nào bạn cần'],
      rows: [
        ['<code>Image</code>',
         '<code>arch/arm64/boot/Image</code> — nhị phân thuần',
         '<b>Luôn luôn.</b> Đây là file bạn đưa cho QEMU <code>-kernel</code> hay U-Boot ' +
         '<code>booti</code>'],
        ['<code>Image.gz</code>',
         '<code>arch/arm64/boot/Image.gz</code>',
         'Khi flash lên bộ nhớ thật và cần tiết kiệm chỗ, <i>và</i> bootloader biết giải nén'],
        ['<code>vmlinux</code>',
         '<code>vmlinux</code> ở gốc cây nguồn — ELF',
         'Hiếm khi gọi trực tiếp (target <code>Image</code> đã kéo theo). Cần khi debug bằng ' +
         'gdb hoặc <code>objdump</code>'],
        ['<code>dtbs</code>',
         'Mọi file <code>.dtb</code> dưới <code>arch/arm64/boot/dts/</code>',
         'Khi board thật cần device tree. QEMU <code>-M virt</code> <b>tự sinh</b> DT nên bài ' +
         'này không dùng tới, nhưng bạn vẫn build một lần để biết nó ra cái gì. Chặng 08 dành trọn cho device tree'],
        ['<code>modules</code>',
         'Mọi file <code>.ko</code>, nằm rải rác đúng thư mục nguồn của chúng',
         'Khi <code>.config</code> có bất kỳ dòng <code>=m</code> nào — mặc định arm64 có rất nhiều'],
        ['<code>modules_install</code>',
         'Cây <code>lib/modules/&lt;phiên bản&gt;/</code> gọn gàng dưới ' +
         '<code>INSTALL_MOD_PATH</code>',
         'Khi cần bỏ module vào rootfs. <b>Không có <code>INSTALL_MOD_PATH</code> thì nó cài ' +
         'vào <code>/lib/modules</code> của chính máy bạn</b> — xem cảnh báo dưới'],
        ['<code>help</code>',
         'Không sinh gì, chỉ in danh sách target',
         'Khi quên tên target. Nhớ vẫn phải truyền <code>ARCH=arm64</code> — danh sách phụ ' +
         'thuộc kiến trúc'],
        ['<code>clean</code> / <code>mrproper</code>',
         'Xoá sản phẩm build / xoá luôn cả <code>.config</code> và mọi file sinh ra',
         '<code>clean</code> khi muốn build lại từ đầu nhưng giữ cấu hình; ' +
         '<code>mrproper</code> khi muốn cây nguồn sạch như vừa giải nén']
      ] },

    { t: 'cal', kind: 'danger', title: '<code>modules_install</code> không có <code>INSTALL_MOD_PATH</code> ghi đè vào máy bạn',
      x: 'Mặc định target này cài vào <code>/lib/modules/$(uname -r)/</code> của <b>máy đang ' +
         'chạy lệnh</b>. Bạn đang build kernel ARM64 trên một máy x86 — đổ vài nghìn module ' +
         'ARM64 vào thư mục module của Ubuntu là chuyện vô nghĩa ở mức tốt nhất và làm hỏng ' +
         '<code>depmod</code> ở mức tệ nhất. Trên máy này bạn không có <code>sudo</code> nên ' +
         'lệnh sẽ chỉ báo lỗi quyền, nhưng đừng lấy đó làm lưới an toàn: ' +
         '<b>luôn truyền <code>INSTALL_MOD_PATH=</code> trỏ vào một thư mục rootfs của riêng ' +
         'bạn</b>, mọi lúc, kể cả khi chỉ thử.' },

    { t: 'h3', x: 'Hai cờ của <code>make</code> bạn sẽ dùng suốt phần còn lại' },

    { t: 'cmdx', title: 'Cờ make dành cho build kernel',
      cmd: 'make -j6 V=1 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- Image',
      rows: [
        ['<code>-j6</code>',
         'Chạy tối đa 6 công việc song song. Kernel là bài toán song song gần như hoàn hảo — ' +
         'phần lớn thời gian là hàng nghìn lần gọi gcc độc lập nhau. Bạn sẽ tự đo hiệu suất ' +
         'thật ở bước 2'],
        ['<code>V=1</code>',
         'In <b>dòng lệnh đầy đủ</b> thay vì dòng tóm tắt <code>CC  file.o</code>. Bật khi cần ' +
         'biết chính xác gcc được gọi với cờ gì; tắt khi chỉ muốn theo dõi tiến độ. Có cả ' +
         '<code>V=2</code> — in lý do vì sao một target phải build lại'],
        ['<code>ARCH=</code> <code>CROSS_COMPILE=</code>',
         'Đặt <b>trước</b> tên target trên dòng lệnh. Chúng là biến make, không phải cờ, nên ' +
         'thứ tự với nhau không quan trọng — nhưng phải nằm trên dòng lệnh, không phải sau ' +
         '<code>--</code> hay trong dấu nháy'],
        ['<code>Image</code>',
         'Tên target. Bỏ đi thì bạn rơi vào <code>all</code> và cái bẫy ở trên']
      ] },

    { t: 'cal', kind: 'tip', title: 'Đặt hai biến vào biến môi trường một lần cho đỡ gõ',
      x: 'Gõ <code>export ARCH=arm64</code> và <code>export CROSS_COMPILE=aarch64-linux-gnu-</code> ' +
         'một lần đầu phiên làm việc thì mọi lệnh <code>make</code> sau đó ngắn lại. Cách này ' +
         'tiện nhưng có mặt trái, và mặt trái đó đủ nghiêm trọng để bạn phải biết: ' +
         '<b>biến môi trường không hiện ra trong lịch sử lệnh</b>. Sáu tháng sau bạn mở ' +
         '<code>history</code> ra xem mình đã build thế nào, sẽ chỉ thấy <code>make -j6 Image</code> ' +
         'và không tài nào biết được nó build cho kiến trúc gì. Phần thực hành của bài này ' +
         'viết đủ hai biến trên <i>mọi</i> lệnh, cố ý, để bạn quen mặt chúng.' },

    /* ============================================================
       4. Build ngoài cây nguồn với O=
       ============================================================ */
    { t: 'h2', x: 'Build ngoài cây nguồn: biến <code>O=</code>' },

    { t: 'p', x:
      'Mặc định Kbuild rải sản phẩm ngay cạnh mã nguồn: <code>amba-pl011.o</code> nằm cùng thư ' +
      'mục với <code>amba-pl011.c</code>. Cách này gọn khi bạn chỉ build một lần, nhưng hỏng ' +
      'ngay khi bạn cần <b>hai</b> cấu hình từ <b>một</b> cây nguồn — chẳng hạn một bản ' +
      'ARM64 cho board và một bản x86_64 để test trên máy. Hai lần build sẽ giẫm lên file ' +
      '<code>.o</code> của nhau, và mỗi lần đổi kiến trúc bạn phải biên dịch lại từ số không.' },

    { t: 'p', x:
      'Biến <code>O=</code> (viết tắt của <i>output</i>) giải quyết chuyện đó: mọi thứ sinh ra — ' +
      '<code>.config</code>, <code>.o</code>, <code>vmlinux</code>, <code>Image</code> — đi vào ' +
      'thư mục bạn chỉ định, còn cây nguồn <b>không bị đụng vào một byte nào</b>.' },

    { t: 'code', where: 'wsl', code:
      'make O=~/build/arm64 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig\n' +
      'make O=~/build/arm64 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- -j6 Image' },

    { t: 'cal', kind: 'why', title: 'Vì sao mọi dự án thật đều dùng <code>O=</code>',
      x: 'Ba lý do, xếp theo mức độ bạn sẽ gặp: (1) <b>một nguồn, nhiều đích</b> — Yocto và ' +
         'Buildroot ở Chặng 11 build cùng một cây kernel cho nhiều board, và chúng ' +
         'làm được chỉ vì mỗi board có một thư mục <code>O=</code> riêng; (2) <b>cây nguồn có ' +
         'thể để read-only</b> — bạn có thể đặt kernel lên một phân vùng dùng chung cho cả đội ' +
         'mà không ai ghi vào được; (3) <b>xoá sạch bằng một lệnh <code>rm -rf</code></b> thay ' +
         'vì tin vào <code>make clean</code>. Trong bài này ta build in-tree cho đơn giản, ' +
         'nhưng bạn sẽ thử <code>O=</code> một lần ở bước 5 để thấy nó thật.' },

    { t: 'h3', x: 'Luật sắt: <code>O=</code> từ chối một cây nguồn không sạch' },

    { t: 'p', x:
      'Bạn không thể build in-tree trước rồi đổi ý dùng <code>O=</code> sau. Kbuild kiểm tra ' +
      'điều đó ngay từ target <code>outputmakefile</code>, trước khi biên dịch bất cứ thứ gì:' },

    { t: 'code', where: 'wsl', code: 'sed -n "695,705p" Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      'outputmakefile:\n' +
      'ifeq ($(KBUILD_EXTMOD),)\n' +
      '\t@if [ -f $(srctree)/.config -o \\\n' +
      '\t\t -d $(srctree)/include/config -o \\\n' +
      '\t\t -d $(srctree)/arch/$(SRCARCH)/include/generated ]; then \\\n' +
      '\t\techo >&2 "***"; \\\n' +
      '\t\techo >&2 "*** The source tree is not clean, please run \'make$(if $(findstring command line, $(origin ARCH)), ARCH=$(ARCH)) mrproper\'"; \\\n' +
      '\t\techo >&2 "*** in $(abs_srctree)";\\\n' +
      '\t\techo >&2 "***"; \\\n' +
      '\t\tfalse; \\\n' +
      '\tfi' },

    { t: 'p', x:
      'Đọc điều kiện <code>if</code> ra tiếng Việt: <b>ba</b> dấu hiệu, chỉ cần <i>một</i> cái ' +
      'có mặt là dừng.' },

    { t: 'cmdx', title: 'Ba thứ khiến cây nguồn bị coi là “không sạch”',
      cmd: '[ -f $(srctree)/.config -o -d $(srctree)/include/config -o -d $(srctree)/arch/$(SRCARCH)/include/generated ]',
      rows: [
        ['<code>-f …/.config</code>',
         'Có file <code>.config</code> ở gốc cây nguồn. Chỉ cần bạn từng chạy ' +
         '<code>make defconfig</code> in-tree một lần là dính'],
        ['<code>-d …/include/config</code>',
         'Có thư mục <code>include/config/</code> — do <code>syncconfig</code> sinh ra ' +
         '(Bài 39). Đây là dấu vết của bước cấu hình, không phải bước biên dịch'],
        ['<code>-d …/arch/$(SRCARCH)/include/generated</code>',
         'Có header sinh tự động cho kiến trúc, ví dụ ' +
         '<code>arch/arm64/include/generated/</code>. Dấu vết của bước biên dịch'],
        ['<code>-o</code>',
         'Toán tử <b>OR</b> của <code>test</code>, không phải cờ. Đừng nhầm với biến ' +
         '<code>O=</code> đang bàn'],
        ['<code>false; \\</code>',
         'Ép recipe trả về mã lỗi khác 0, nên <code>make</code> dừng. Không có dòng này thì ' +
         '<code>echo</code> đã thành công và build vẫn chạy tiếp']
      ] },

    { t: 'cal', kind: 'tip', title: 'Quyết định <code>O=</code> hay không ngay từ lệnh đầu tiên',
      x: 'Cách chữa duy nhất khi đã lỡ là <code>make mrproper</code> — và nó xoá luôn ' +
         '<code>.config</code> của bạn. Nếu cấu hình đó quý (bạn vừa ngồi 20 phút trong ' +
         '<code>menuconfig</code>), <b>hãy sao lưu nó trước</b>: <code>cp .config ~/my.config</code>, ' +
         'chạy <code>mrproper</code>, rồi <code>cp ~/my.config &lt;thư mục O&gt;/.config</code> và ' +
         '<code>make O=… olddefconfig</code>. Bạn sẽ đo thời gian thật của một lần ' +
         '<code>mrproper</code> ở bước 5 — nó không rẻ.' },

    { t: 'cal', kind: 'info', title: '<code>O=</code> khác gì với thư mục build của Bài 16',
      x: 'Ở Bài 16 bạn đã viết Makefile tự đổ <code>.o</code> vào một thư mục <code>build/</code>. ' +
         'Ý tưởng giống hệt, nhưng quy mô khác: Makefile của bạn có dăm bảy file, còn Kbuild ' +
         'phải làm việc đó cho hơn <b>37 000</b> file <code>.c</code> và <code>.S</code> nằm sâu ' +
         'trong hơn sáu nghìn thư mục. Cách nó xoay xở là sinh ra trong thư mục <code>O=</code> một <b>cây thư mục ' +
         'gương</b> của cây nguồn, cộng một <code>Makefile</code> một dòng ' +
         '(<code>include &lt;đường dẫn tuyệt đối&gt;/Makefile</code>) để bạn có thể ' +
         '<code>cd</code> vào đó và gõ <code>make</code> trần trụi — đó chính là việc mà recipe ' +
         '<code>cmd_makefile</code> ngay phía trên đoạn code vừa đọc đang làm.' },

    /* ============================================================
       5. Giá thật của một lần build
       ============================================================ */
    { t: 'h2', x: 'Giá thật của một lần build' },

    { t: 'p', x:
      'Trước khi bấm Enter, bạn nên biết mình sắp trả bao nhiêu. Đây là số đo thật của lần ' +
      'build sẽ dựng nên toàn bộ phần thực hành bên dưới, trên máy 6 nhân / 4,8 GiB RAM, ' +
      'kernel 6.18.45, <code>arm64_defconfig</code>, target <code>Image</code>:' },

    { t: 'table',
      head: ['Đại lượng', 'Giá trị', 'Đọc nó thế nào'],
      rows: [
        ['Thời gian thực (<code>real</code>)', '<b>18 phút 30,778 giây</b>',
         'Thời gian bạn ngồi chờ. Đây là con số duy nhất bạn <i>cảm nhận</i> được'],
        ['Thời gian CPU người dùng (<code>user</code>)', '96 phút 52,780 giây',
         'Tổng thời gian cả 6 nhân cộng lại dành cho chính gcc'],
        ['Thời gian CPU nhân hệ điều hành (<code>sys</code>)', '11 phút 8,294 giây',
         'Đọc/ghi file, tạo tiến trình. Cao bất thường vì kernel là bài toán ' +
         '<b>nhiều file nhỏ</b>, không phải ít file lớn'],
        ['Số dòng log', '5 493 dòng',
         'Mỗi dòng là một hành động của Kbuild'],
        ['Số lệnh biên dịch (<code>CC</code>)', '<b>4 333</b>',
         'Bốn nghìn ba trăm lần gọi <code>aarch64-linux-gnu-gcc</code> — đây là chỗ tiêu gần ' +
         'hết thời gian'],
        ['Số lệnh gom thư viện (<code>AR</code>)', '887',
         'Đúng bằng số thư mục có ít nhất một <code>obj-y</code>'],
        ['Số lệnh liên kết (<code>LD</code>)', '7',
         'Chỉ bảy. Nhưng chúng nằm ở cuối và <b>chạy một luồng</b> — xem hình dưới']
      ] },

    { t: 'h3', x: 'Vì sao <code>-j6</code> đáng giá: làm phép chia' },

    { t: 'p', x:
      'Cộng <code>user</code> với <code>sys</code> ta được tổng thời gian CPU thật sự bỏ ra: ' +
      '96 ph 52,780 gi + 11 ph 8,294 gi = <b>108 ph 1,074 gi</b>, tức 6 481 giây. Chia cho ' +
      'thời gian thực 1 110,778 giây:' },

    { t: 'code', where: 'wsl', code: 'echo "scale=2; 6481.074 / 1110.778" | bc' },

    { t: 'code', where: 'out', nocopy: true, code: '5.83' },

    { t: 'cal', kind: 'info', title: '5,83 trên tối đa 6,00 — hiệu suất song song 97 %',
      x: 'Máy có 6 nhân, nên con số lý tưởng tuyệt đối là 6,00: cả 6 nhân bận 100 % thời gian, ' +
         'không nhân nào rảnh một giây nào. Đo được <b>5,83</b> nghĩa là Kbuild giữ được ' +
         '<b>97 %</b> công suất. Rất hiếm bài toán nào đạt được mức đó, và lý do thì bạn đã ' +
         'thấy ở bảng trên: 4 333 lệnh <code>CC</code> hoàn toàn <b>độc lập</b> — ' +
         '<code>amba-pl011.o</code> không cần biết <code>xhci-ring.o</code> có tồn tại hay ' +
         'không, nên make cứ việc rải chúng ra 6 nhân mà không phải chờ ai. ' +
         'Nói ngược lại: <b>không có <code>-j6</code>, lần build này sẽ mất khoảng 108 phút ' +
         'thay vì 18 phút.</b>' },

    { t: 'cal', kind: 'tip', title: 'Chọn số cho <code>-j</code>',
      x: 'Quy tắc quen thuộc là <code>-j$(nproc)</code> — đúng bằng số nhân. Nhiều tài liệu ' +
         'khuyên <code>nproc + 2</code> để lấp chỗ trống lúc một tiến trình đang chờ đĩa. ' +
         'Trên WSL2 với 4,8 GiB RAM thì <b>đừng tăng quá tay</b>: mỗi tiến trình gcc ăn hàng ' +
         'chục MB, và khi RAM cạn, WSL2 chuyển sang swap khiến build <i>chậm hơn</i> chứ không ' +
         'nhanh hơn. Bài này dùng <code>-j6</code> và nó cho 97 % hiệu suất, không có lý do gì ' +
         'phải tinh chỉnh thêm.' },

    { t: 'h3', x: 'Cái đuôi đơn luồng — vì sao thêm nhân cũng không cứu được' },

    { t: 'p', x:
      '24 dòng cuối cùng của log là phần thú vị nhất, và nó không song song được chút nào. ' +
      'Đây là toàn bộ đoạn đó, lấy nguyên văn:' },

    { t: 'code', where: 'wsl', code: 'sed -n "5470,5493p" ~/bai40-logs/image.log' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  AR      built-in.a\n' +
      '  AR      vmlinux.a\n' +
      '  LD      vmlinux.o\n' +
      '  MODPOST vmlinux.symvers\n' +
      '  CC      .vmlinux.export.o\n' +
      '  UPD     include/generated/utsversion.h\n' +
      '  CC      init/version-timestamp.o\n' +
      '  KSYMS   .tmp_vmlinux0.kallsyms.S\n' +
      '  AS      .tmp_vmlinux0.kallsyms.o\n' +
      '  LD      .tmp_vmlinux1\n' +
      '  NM      .tmp_vmlinux1.syms\n' +
      '  KSYMS   .tmp_vmlinux1.kallsyms.S\n' +
      '  AS      .tmp_vmlinux1.kallsyms.o\n' +
      '  LD      .tmp_vmlinux2\n' +
      '  NM      .tmp_vmlinux2.syms\n' +
      '  KSYMS   .tmp_vmlinux2.kallsyms.S\n' +
      '  AS      .tmp_vmlinux2.kallsyms.o\n' +
      '  LD      vmlinux.unstripped\n' +
      '  NM      System.map\n' +
      '  SORTTAB vmlinux.unstripped\n' +
      '  OBJCOPY vmlinux\n' +
      '  GEN     modules.builtin.modinfo\n' +
      '  GEN     modules.builtin\n' +
      '  OBJCOPY arch/arm64/boot/Image' },

    { t: 'p', x:
      'Đọc từ trên xuống, bạn thấy đúng dây chuyền của phần trước, lần này bằng tên file thật. ' +
      'Ba lần <code>LD</code> liên tiếp (<code>.tmp_vmlinux1</code>, <code>.tmp_vmlinux2</code>, ' +
      '<code>vmlinux.unstripped</code>) không phải lỗi — đó là <b>vòng lặp ba lượt của ' +
      'kallsyms</b>, và nó là một câu chuyện đáng nhớ.' },

    { t: 'cal', kind: 'why', title: 'Vì sao phải liên kết ba lần: bài toán con rắn tự cắn đuôi',
      x: 'Kernel cần một bảng tra <b>địa chỉ → tên hàm</b> ngay bên trong chính nó, để khi ' +
         'crash nó in được <code>Call trace:</code> với tên hàm chứ không phải một dãy số hex. ' +
         'Bảng đó tên là <b>kallsyms</b>. Vấn đề: bảng liệt kê địa chỉ của mọi hàm, nhưng ' +
         '<i>bản thân bảng cũng nằm trong kernel</i> và cũng chiếm chỗ — nhét bảng vào sẽ ' +
         'đẩy mọi hàm sau nó dịch đi, làm mọi địa chỉ trong bảng sai hết. ' +
         'Kbuild giải bằng cách lặp: (1) <code>LD .tmp_vmlinux1</code> — liên kết thử với bảng ' +
         'rỗng, <code>NM</code> lấy danh sách địa chỉ; (2) <code>LD .tmp_vmlinux2</code> — liên ' +
         'kết lại với bảng thật, địa chỉ dịch đi, <code>NM</code> lấy lại; (3) lượt cuối dùng ' +
         'bảng đã <b>đúng kích thước</b> nên lần này địa chỉ không dịch nữa, và ' +
         '<code>vmlinux.unstripped</code> ra đời. Ba lượt là đủ vì từ lượt hai trở đi kích ' +
         'thước bảng đã ổn định.' },

    { t: 'fig', cap:
        'Hình dạng của một lần build: gần như toàn bộ khối lượng nằm ở phần song song được, ' +
        'nhưng cái đuôi liên kết thì bắt buộc đơn luồng — đó là lý do tăng số nhân mãi cũng ' +
        'không rút thời gian xuống 0.',
      svg:
        '<svg viewBox="0 0 720 214" width="720" role="img" ' +
        'aria-label="Biểu đồ một lần build kernel gồm 4333 lệnh biên dịch chạy song song trên sáu nhân, ' +
        'rồi 887 lệnh gom thư viện, và cuối cùng bảy lệnh liên kết chạy trên một nhân duy nhất">' +

        '<text class="d-t" x="20" y="20">5 493 dòng log của một lần build</text>' +
        '<text class="d-tm" x="258" y="20">make -j6 Image</text>' +

        '<rect class="d-box-g" x="20" y="36" width="470" height="52" rx="6"/>' +
        '<text class="d-t" x="255" y="60" text-anchor="middle">4 333 × CC</text>' +
        '<text class="d-ts" x="255" y="78" text-anchor="middle">' +
        '.c → .o · độc lập nhau · 6 nhân chạy hết công suất</text>' +

        '<rect class="d-box-a" x="498" y="36" width="130" height="52" rx="6"/>' +
        '<text class="d-t" x="563" y="60" text-anchor="middle">887 × AR</text>' +
        '<text class="d-ts" x="563" y="78" text-anchor="middle">gom built-in.a</text>' +

        '<rect class="d-box-w" x="636" y="36" width="64" height="52" rx="6"/>' +
        '<text class="d-t" x="668" y="60" text-anchor="middle">7 × LD</text>' +
        '<text class="d-ts" x="668" y="78" text-anchor="middle">1 nhân</text>' +

        '<line class="d-line" x1="20" y1="104" x2="628" y2="104"/>' +
        '<path class="d-arrow" d="M628 104 L620 100 L620 108 Z"/>' +
        '<text class="d-ts" x="324" y="120" text-anchor="middle">' +
        'song song được — chia cho 6 nhân là rút được 6 lần</text>' +

        '<line class="d-line" x1="636" y1="104" x2="700" y2="104"/>' +
        '<text class="d-ts" x="668" y="120" text-anchor="middle">không chia được</text>' +

        '<rect class="d-box" x="20" y="140" width="336" height="58" rx="6"/>' +
        '<text class="d-t" x="188" y="162" text-anchor="middle">Tổng CPU: 108 ph 01 gi</text>' +
        '<text class="d-ts" x="188" y="180" text-anchor="middle">' +
        'user 96 ph 52,780 gi + sys 11 ph 08,294 gi</text>' +

        '<rect class="d-box-p" x="374" y="140" width="326" height="58" rx="6"/>' +
        '<text class="d-t" x="537" y="162" text-anchor="middle">Thời gian chờ thật: 18 ph 30,778 gi</text>' +
        '<text class="d-ts" x="537" y="180" text-anchor="middle">' +
        '108 ÷ 18,5 = 5,83 lần — tức 97 % của mức lý tưởng 6,00</text>' +

        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Một con số để so sánh: <code>dtbs</code> rẻ hơn 80 lần',
      x: 'Cùng máy đó, target <code>dtbs</code> biên dịch <b>1 577</b> file device tree chỉ ' +
         'trong <b>13,802 giây</b> (user 54,888 gi, sys 15,051 gi). Lý do rất đơn giản: ' +
         '<code>dtc</code> chỉ đọc một file văn bản mô tả phần cứng rồi ghi ra dạng nhị phân — ' +
         'không tối ưu hoá, không phân tích luồng dữ liệu, không sinh mã máy. So sánh này đáng ' +
         'nhớ vì nó cho bạn trực giác về việc <i>thời gian build kernel đi đâu</i>: gần như ' +
         'toàn bộ nằm ở gcc, không phải ở số lượng file.' },

    /* ══════════════════════════════════════════════════════════════════
       Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: build và boot kernel của chính bạn' },

    { t: 'p', x:
      'Sáu bước, chạy trong cây nguồn <code>~/bai38/linux-6.18.45</code> mà bạn đã giải nén ở ' +
      'Bài 38 và cấu hình ở Bài 39. Bước 2 mất khoảng <b>18 phút</b> và bước 4 thêm khoảng ' +
      '<b>21 phút</b> nữa — hãy bắt đầu khi bạn có thời gian, hoặc để nó chạy rồi quay lại. ' +
      'Mọi lệnh đều viết đủ <code>ARCH=</code> và <code>CROSS_COMPILE=</code>, cố ý.' },

    { t: 'cal', kind: 'warn', title: 'Kiểm tra chỗ trống trước khi bắt đầu',
      x: 'Cây nguồn vừa giải nén nặng <b>1,7 GB</b>; sau khi build đầy đủ nó phình lên ' +
         '<b>3,5 GB</b>. Cộng thêm module đem cài ra ngoài, bạn cần <b>ít nhất 3 GB trống</b>. ' +
         'Gõ <code>df -h ~</code> trước khi bắt đầu — hết đĩa ở phút thứ 15 của một lần build ' +
         '18 phút là cách tệ nhất để học bài này.' },

    { t: 'steps', items: [

      /* ---------------------------------------------------------------- */
      { title: 'Chứng minh <code>CROSS_COMPILE</code> đổi cả <code>.config</code>',
        blocks: [

          { t: 'p', x:
            'Phần lý thuyết khẳng định hai lệnh <code>defconfig</code> chỉ khác nhau một biến ' +
            'lại cho ra hai file khác nhau. Đừng tin — hãy tự tạo cả hai và <code>diff</code>. ' +
            'Trước hết tạo chỗ chứa log, vì bạn sẽ cần đọc lại chúng suốt bài:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'mkdir -p ~/bai40-logs' },

          { t: 'p', x:
            'Bây giờ sinh cấu hình <b>đúng</b> — có <code>CROSS_COMPILE</code> — rồi cất một ' +
            'bản sao lại:' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig\n' +
            'cp .config ~/bai40-logs/config-cross' },

          { t: 'code', where: 'out', nocopy: true, code:
            "*** Default configuration is based on 'defconfig'\n" +
            '#\n' +
            '# configuration written to .config\n' +
            '#' },

          { t: 'p', x:
            'Bốn dòng, không hơn. Đây là lần chạy <b>ấm</b>: công cụ <code>scripts/kconfig/conf</code> ' +
            'đã được Bài 39 biên dịch sẵn nên make không phải dựng lại. Nếu bạn vừa giải nén cây ' +
            'nguồn mới hoặc vừa chạy <code>mrproper</code>, cùng lệnh đó sẽ in thêm ' +
            '<b>13 dòng</b> ở phía trên — đúng khối mà Bài 39 đã mổ:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  HOSTCC  scripts/basic/fixdep\n' +
            '  HOSTCC  scripts/kconfig/conf.o\n' +
            '  HOSTCC  scripts/kconfig/confdata.o\n' +
            '  HOSTCC  scripts/kconfig/expr.o\n' +
            '  LEX     scripts/kconfig/lexer.lex.c\n' +
            '  YACC    scripts/kconfig/parser.tab.[ch]\n' +
            '  HOSTCC  scripts/kconfig/lexer.lex.o\n' +
            '  HOSTCC  scripts/kconfig/menu.o\n' +
            '  HOSTCC  scripts/kconfig/parser.tab.o\n' +
            '  HOSTCC  scripts/kconfig/preprocess.o\n' +
            '  HOSTCC  scripts/kconfig/symbol.o\n' +
            '  HOSTCC  scripts/kconfig/util.o\n' +
            '  HOSTLD  scripts/kconfig/conf\n' +
            "*** Default configuration is based on 'defconfig'" },

          { t: 'cal', kind: 'info', title: '<code>HOSTCC</code> chứ không phải <code>CC</code>',
            x: 'Để ý tiền tố: <b><code>HOST</code>CC</b>. Những file này chạy trên <i>máy bạn</i> ' +
               'để đọc file Kconfig, nên chúng phải là mã x86 và được dịch bằng gcc x86 — ' +
               '<code>CROSS_COMPILE</code> không đụng tới chúng. Cùng một lần <code>make</code> ' +
               'dùng <b>hai trình biên dịch khác nhau</b> cho hai mục đích khác nhau, và ' +
               '<code>HOSTCC</code>/<code>CC</code> là cách Kbuild nói cho bạn biết cái nào ' +
               'đang chạy.' },

          { t: 'p', x:
            'Giờ cố tình làm sai: chạy lại <b>y hệt</b>, chỉ bỏ <code>CROSS_COMPILE</code> đi.' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 defconfig\n' +
            'cp .config ~/bai40-logs/config-nocross' },

          { t: 'code', where: 'out', nocopy: true, code:
            "*** Default configuration is based on 'defconfig'\n" +
            '#\n' +
            '# configuration written to .config\n' +
            '#' },

          { t: 'p', x:
            'Output <b>giống hệt từng ký tự</b>. Không một lời cảnh báo, không một dấu hiệu nào ' +
            'cho biết bạn vừa làm sai. Đó chính là lý do bước này tồn tại: nếu Kbuild có kêu ' +
            'lên thì đã không ai cần học phần này. Bằng chứng nằm trong nội dung file, ' +
            'không nằm trên màn hình:' },

          { t: 'code', where: 'wsl', code:
            'diff ~/bai40-logs/config-nocross ~/bai40-logs/config-cross' },

          { t: 'code', where: 'out', nocopy: true, code:
            '5c5\n' +
            '< CONFIG_CC_VERSION_TEXT="gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0"\n' +
            '---\n' +
            '> CONFIG_CC_VERSION_TEXT="aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0"\n' +
            '321d320\n' +
            '< CONFIG_BROKEN_GAS_INST=y\n' +
            '476a476\n' +
            '> CONFIG_CC_HAVE_SHADOW_CALL_STACK=y\n' +
            '523a524\n' +
            '> CONFIG_CC_HAS_BRANCH_PROT_PAC_RET=y\n' +
            '536a538\n' +
            '> CONFIG_AS_HAS_ARMV8_5=y\n' +
            '537a540\n' +
            '> CONFIG_CC_HAS_BRANCH_PROT_PAC_RET_BTI=y\n' +
            '538a542,543\n' +
            '> CONFIG_ARM64_AS_HAS_MTE=y\n' +
            '> CONFIG_ARM64_MTE=y\n' +
            '546a552,553\n' +
            '> CONFIG_AS_HAS_MOPS=y\n' +
            '> \n' +
            '566a574,575\n' +
            '> CONFIG_CC_HAVE_STACKPROTECTOR_SYSREG=y\n' +
            '> CONFIG_STACKPROTECTOR_PER_TASK=y\n' +
            '765a775\n' +
            '> CONFIG_ARCH_HAS_SUBPAGE_FAULTS=y\n' +
            '824a835,836\n' +
            '> CONFIG_ARCH_SUPPORTS_SHADOW_CALL_STACK=y\n' +
            '> # CONFIG_SHADOW_CALL_STACK is not set\n' +
            '1084a1097,1098\n' +
            '> CONFIG_ARCH_USES_PG_ARCH_2=y\n' +
            '> CONFIG_ARCH_USES_PG_ARCH_3=y\n' +
            '11541a11556\n' +
            '> CONFIG_HAVE_ARCH_KASAN_HW_TAGS=y' },

          { t: 'p', x:
            '<b>2 dòng mất đi, 17 dòng thêm vào.</b> Đọc ký hiệu của <code>diff</code>: ' +
            '<code>&lt;</code> là dòng chỉ có ở file bên trái (bản <b>không</b> có ' +
            '<code>CROSS_COMPILE</code>), <code>&gt;</code> là dòng chỉ có ở file bên phải ' +
            '(bản <b>có</b>). Ba nhóm đáng chú ý:' },

          { t: 'table',
            head: ['Dòng', 'Ở bản nào', 'Nghĩa là gì'],
            rows: [
              ['<code>CONFIG_CC_VERSION_TEXT="gcc (Ubuntu …)"</code>',
               'Chỉ bản sai',
               '<b>Bằng chứng số một.</b> Kconfig đã đem gcc <b>x86</b> đi thử. Bản đúng ghi ' +
               '<code>aarch64-linux-gnu-gcc</code>'],
              ['<code>CONFIG_BROKEN_GAS_INST=y</code>',
               'Chỉ bản sai',
               'Đúng như phần lý thuyết dự đoán: assembler x86 không dịch nổi <code>.inst</code> ' +
               'của ARM64, nên Kconfig kết luận “assembler hỏng”'],
              ['<code>CONFIG_ARM64_MTE=y</code>, <code>CONFIG_STACKPROTECTOR_PER_TASK=y</code>, ' +
               '<code>CONFIG_AS_HAS_ARMV8_5=y</code>…',
               'Chỉ bản đúng',
               '<b>15 tính năng bảo mật và tối ưu của ARM64 biến mất</b> khỏi bản sai. Memory ' +
               'Tagging, pointer authentication, shadow call stack — kernel vẫn build, vẫn ' +
               'chạy, chỉ là yếu hơn hẳn và bạn không hề biết']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao mất tính năng chứ không phải báo lỗi',
            x: 'Cơ chế <code>as-instr</code>/<code>cc-option</code> được thiết kế để ' +
               '<b>im lặng chấp nhận</b> một trình biên dịch cũ: nếu gcc của bạn không hỗ trợ ' +
               'MTE thì kernel phải build được mà không có MTE, chứ không được từ chối build. ' +
               'Cơ chế đó không có cách nào phân biệt “gcc đúng nhưng cũ” với “gcc sai kiến ' +
               'trúc hoàn toàn” — cả hai đều trả lời “không hỗ trợ”. Đây là ví dụ kinh điển về ' +
               'một hệ thống đúng theo thiết kế mà vẫn dẫn bạn xuống hố.' },

          { t: 'p', x:
            'Vứt bản sai đi và khôi phục bản đúng. Đây là lệnh <b>bắt buộc</b> trước khi sang ' +
            'bước 2 — nếu bỏ qua, bạn sẽ build bằng đúng cái <code>.config</code> hỏng vừa tạo:' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig\n' +
            'grep CONFIG_CC_VERSION_TEXT .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            "*** Default configuration is based on 'defconfig'\n" +
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            'CONFIG_CC_VERSION_TEXT="aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0"' },

          { t: 'cal', kind: 'tip', title: 'Hai giây kiểm tra, mười tám phút được cứu',
            x: 'Dòng <code>grep</code> cuối cùng là <b>thói quen bạn nên mang theo suốt sự ' +
               'nghiệp</b>. Mỗi khi sắp bấm Enter cho một lần build dài, chạy nó trước. ' +
               'Thấy <code>aarch64-linux-gnu-gcc</code> là đi tiếp; thấy <code>gcc (Ubuntu …)</code> ' +
               'trần trụi là dừng lại và làm lại <code>defconfig</code>. Số phiên bản ' +
               '<code>15.2.0-16ubuntu1</code> sẽ khác trên máy bạn — thứ cần nhìn là ' +
               '<b>cái tên đứng trước dấu ngoặc</b>, không phải con số.' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Ký tên vào kernel, rồi build <code>Image</code>',
        blocks: [

          { t: 'p', x:
            'Trước khi build, hãy đóng dấu tên riêng lên kernel này. Không phải để cho vui: ' +
            'ở bước 5 bạn sẽ boot nó lên và cần <b>một bằng chứng không thể chối cãi</b> rằng ' +
            'kernel đang chạy là kernel bạn vừa dịch, chứ không phải một bản có sẵn ở đâu đó. ' +
            'Biến <code>CONFIG_LOCALVERSION</code> làm việc đó — nó nối một hậu tố vào tên ' +
            'phiên bản.' },

          { t: 'code', where: 'wsl', code:
            './scripts/config --set-str LOCALVERSION "-embedded"\n' +
            'grep "^CONFIG_LOCALVERSION=" .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            'CONFIG_LOCALVERSION="-embedded"' },

          { t: 'cmdx', title: 'Sửa .config bằng script thay vì mở menuconfig',
            cmd: './scripts/config --set-str LOCALVERSION "-embedded"',
            rows: [
              ['<code>./scripts/config</code>',
               'Script sửa <code>.config</code> từ dòng lệnh — bạn đã dùng nó ở Bài 39. ' +
               'Hợp với việc tự động hoá; <code>menuconfig</code> hợp với việc dò tìm'],
              ['<code>--set-str</code>',
               'Đặt một symbol kiểu <b>chuỗi</b>. Có <code>--enable</code>/<code>--disable</code>/' +
               '<code>--module</code> cho <code>bool</code> và <code>tristate</code>, ' +
               '<code>--set-val</code> cho số'],
              ['<code>LOCALVERSION</code>',
               'Viết được cả <code>CONFIG_LOCALVERSION</code>; script tự cắt tiền tố'],
              ['<code>"-embedded"</code>',
               'Dấu gạch nối đầu là <b>của bạn</b>, không phải do Kbuild thêm. Không có nó thì ' +
               'phiên bản sẽ dính liền thành <code>6.18.45embedded</code>']
            ] },

          { t: 'p', x:
            'Kiểm tra xem tên phiên bản đã đổi chưa. Kbuild có sẵn một target trả lời đúng câu ' +
            'hỏi đó, <code>kernelrelease</code>. Hãy chạy nó — và <b>chuẩn bị tinh thần rằng ' +
            'nó sẽ nói dối bạn</b>:' },

          { t: 'code', where: 'wsl', code:
            'make -s ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- kernelrelease' },

          { t: 'code', where: 'out', nocopy: true, code: '6.18.45' },

          { t: 'cal', kind: 'danger', title: 'Đây là câu trả lời <b>sai</b>, và không có gì báo cho bạn biết',
            x: '<code>.config</code> ghi rõ <code>CONFIG_LOCALVERSION="-embedded"</code>, bạn vừa ' +
               '<code>grep</code> thấy tận mắt, vậy mà <code>kernelrelease</code> in ' +
               '<code>6.18.45</code> không hậu tố. Nguyên nhân: <code>Makefile</code> dòng ' +
               '<b>299</b> xếp <code>kernelrelease</code> vào nhóm ' +
               '<code>no-sync-config-targets</code> — nhóm các target <i>không được phép</i> ' +
               'chạy <code>syncconfig</code>. Nên nó không đọc <code>.config</code>; nó đọc ' +
               '<code>include/config/auto.conf</code>, bản dịch máy của <code>.config</code> mà ' +
               'Bài 39 đã giới thiệu — và file đó vẫn là bản <b>cũ</b>, sinh ra từ trước khi bạn ' +
               'sửa. <code>scripts/setlocalversion</code> dòng 195 lấy giá trị từ đúng file cũ đó.' },

          { t: 'p', x:
            'Xem tận mắt hai file lệch nhau. <code>stat</code> in thời điểm sửa lần cuối của ' +
            'từng file:' },

          { t: 'code', where: 'wsl', code:
            'stat -c "%y  %n" .config include/config/auto.conf\n' +
            'grep "^CONFIG_LOCALVERSION=" include/config/auto.conf' },

          { t: 'code', where: 'out', nocopy: true, code:
            '2026-08-27 22:16:05.889058739 +0700  .config\n' +
            '2026-08-27 22:15:22.866678145 +0700  include/config/auto.conf\n' +
            'CONFIG_LOCALVERSION=' },

          { t: 'cmdx', title: 'stat in metadata của file, không in nội dung',
            cmd: 'stat -c "%y  %n" .config include/config/auto.conf',
            rows: [
              ['<code>stat</code>',
               'Đọc <i>inode</i> của file — kích thước, chủ sở hữu, quyền, ba mốc thời gian — ' +
               'chứ không đọc một byte nội dung nào'],
              ['<code>-c</code>',
               '<i>Custom format</i>. Không có nó, <code>stat</code> in một khối mười dòng cho ' +
               'mỗi file; có nó, bạn chỉ lấy đúng thứ cần'],
              ['<code>%y</code>',
               'Mốc <b>mtime</b> — lần cuối <i>nội dung</i> file bị sửa. Đây chính là mốc mà ' +
               '<code>make</code> so sánh để quyết định dịch lại hay không'],
              ['<code>%n</code>',
               'Tên file. Cần vì bạn truyền hai file một lúc, không có nó thì không biết dòng ' +
               'nào của ai']
            ] },

          { t: 'p', x:
            'Rõ ràng: <code>.config</code> mới hơn <code>auto.conf</code> <b>43 giây</b> — đúng ' +
            'khoảng thời gian bạn vừa bỏ ra để sửa nó — nên <code>auto.conf</code> vẫn giữ giá ' +
            'trị rỗng sinh ra từ lần <code>defconfig</code>. <b>Hai mốc thời gian này chắc chắn ' +
            'khác trên máy bạn</b>, và khoảng cách giữa chúng cũng vậy; thứ duy nhất phải giống ' +
            'là <i>thứ tự</i>: <code>.config</code> mới hơn <code>auto.conf</code>.' },

          { t: 'cal', kind: 'info', title: 'Vì sao <code>auto.conf</code> không có dấu nháy?',
            x: '<code>.config</code> ghi <code>CONFIG_LOCALVERSION=""</code> còn ' +
               '<code>auto.conf</code> ghi <code>CONFIG_LOCALVERSION=</code> trần trụi — hai cú ' +
               'pháp khác nhau cho cùng một giá trị. Không phải lỗi: hai file phục vụ hai người ' +
               'đọc khác nhau. <code>.config</code> do <code>conf</code> đọc, theo cú pháp ' +
               'Kconfig nên chuỗi phải nằm trong nháy. <code>auto.conf</code> thì được ' +
               '<code>make</code> <code>include</code> thẳng vào Makefile, nên nó phải là ' +
               '<b>cú pháp gán biến của make</b> — mà make thì coi dấu nháy là ký tự thật, ' +
               'không phải dấu bao. Để nguyên nháy thì biến sẽ mang giá trị <code>"-embedded"</code> ' +
               'kể cả hai dấu nháy, và tên kernel của bạn sẽ có nháy trong đó. Đây là lý do ' +
               '<code>auto.conf</code> phải tồn tại tách khỏi <code>.config</code> chứ không ' +
               'phải là bản sao.' },

          { t: 'p', x:
            'Ép Kbuild dịch lại bằng <code>syncconfig</code> rồi hỏi lần nữa:' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- syncconfig\n' +
            'make -s ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- kernelrelease' },

          { t: 'code', where: 'out', nocopy: true, code: '6.18.45-embedded' },

          { t: 'p', x:
            'Đúng rồi. Lệnh <code>syncconfig</code> không in gì cả — Bài 39 đã kiểm chứng điều ' +
            'đó — nên toàn bộ output bạn thấy là một dòng của <code>kernelrelease</code>. ' +
            'Cờ <code>-s</code> (silent) là thứ cắt đi dòng ' +
            '<code>make: Entering directory …</code>, để bạn có thể dùng kết quả trong script.' },

          { t: 'cal', kind: 'tip', title: 'Nhớ quy tắc này, nó cứu bạn nhiều lần',
            x: '<b>Sửa <code>.config</code> xong thì chưa có gì xảy ra cả.</b> ' +
               '<code>.config</code> chỉ là văn bản; thứ mà build thật sự đọc là ' +
               '<code>auto.conf</code> và <code>autoconf.h</code>. Một lệnh build bình thường ' +
               '(<code>make Image</code>) <i>tự</i> chạy <code>syncconfig</code> nên bạn không ' +
               'phải lo. Chỉ nhóm target “chỉ hỏi, không build” — <code>kernelrelease</code>, ' +
               '<code>kernelversion</code>, <code>help</code> — là bỏ qua bước đồng bộ và có ' +
               'thể trả lời theo dữ liệu cũ. <b>Nghi ngờ một target đang nói dối? Chạy ' +
               '<code>syncconfig</code> rồi hỏi lại.</b>' },

          { t: 'p', x:
            'Xong phần chuẩn bị. Trước khi bấm Enter, hãy dạy cho bash báo giờ theo một dòng ' +
            'duy nhất thay vì ba dòng mặc định — bạn sẽ đo lại năm lần nữa trong bài này, và ' +
            'một dòng thì dễ xếp cạnh nhau để so sánh hơn hẳn. Rồi đi pha cà phê: lệnh thứ hai ' +
            'chạy <b>18 phút</b> trên máy 6 nhân.' },

          { t: 'code', where: 'wsl', code:
            "TIMEFORMAT='REAL %3lR  USER %3lU  SYS %3lS'\n" +
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- Image \\\n' +
            '  > ~/bai40-logs/image.log 2>&1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'REAL 18m30.778s  USER 96m52.780s  SYS 11m8.294s' },

          { t: 'cmdx', title: 'Đọc lệnh build',
            cmd: 'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- Image > ~/bai40-logs/image.log 2>&1',
            rows: [
              ['<code>TIMEFORMAT=…</code>',
               'Biến của bash quy định cách <code>time</code> in kết quả. ' +
               '<code>%R</code>/<code>%U</code>/<code>%S</code> là ba số quen thuộc; chữ ' +
               '<code>l</code> xin dạng dài <i>phút–giây</i> thay vì tổng số giây, và số ' +
               '<code>3</code> xin ba chữ số thập phân. Đặt một lần, mọi lệnh ' +
               '<code>time</code> sau đó đều theo'],
              ['<code>time</code>',
               'Builtin của bash. Nó in ra <b>terminal</b> qua stderr của chính nó, không vào ' +
               'file — đó là lý do bạn vẫn thấy dòng kết quả dù đã chuyển hướng toàn bộ output ' +
               'của make'],
              ['<code>-j6</code>',
               '6 công việc song song. Máy này có 6 nhân — kiểm bằng <code>nproc</code>'],
              ['<code>Image</code>',
               'Gọi đích danh, <b>không</b> để make rơi vào <code>all</code>'],
              ['<code>&gt; ~/bai40-logs/image.log</code>',
               'Chuyển stdout vào file. Bạn sẽ đếm và mổ file này ở bước 3'],
              ['<code>2&gt;&amp;1</code>',
               'Gộp stderr vào cùng chỗ với stdout. <b>Bắt buộc</b>: mọi cảnh báo của gcc đi ' +
               'qua stderr, thiếu cờ này thì chúng bay ra màn hình và không được lưu lại']
            ] },

          { t: 'cal', kind: 'warn', title: 'Ba con số của bạn sẽ khác — nhưng tỉ lệ thì không',
            x: 'Thời gian thực phụ thuộc số nhân, tốc độ đĩa và mức bận của máy, nên ' +
               '<b>18 ph 30 gi là con số của máy này, không phải của bạn</b>. Cái đáng so sánh ' +
               'là <b>tỉ lệ</b> giữa tổng CPU và thời gian thực: ' +
               '(<code>user</code> + <code>sys</code>) ÷ <code>real</code>. Ở đây là ' +
               '<b>5,83</b> trên 6 nhân. Nếu máy bạn ra một tỉ lệ thấp hơn hẳn số nhân — ' +
               'ví dụ 2,5 trên 8 nhân — thì có thứ đang chặn: hết RAM và swap, đĩa chậm, ' +
               'hoặc bạn quên <code>-j</code>.' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Mổ ba sản phẩm: <code>vmlinux</code>, <code>Image</code>, <code>System.map</code>',
        blocks: [

          { t: 'p', x:
            'Build xong rồi. Trước khi boot, hãy nhìn kỹ những gì vừa sinh ra — đây là phần ' +
            'biến 18 phút chờ đợi thành kiến thức. Bắt đầu bằng kích thước:' },

          { t: 'code', where: 'wsl', code:
            'ls -l vmlinux System.map arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus   7941331 Aug 27 21:41 System.map\n' +
            '-rw-r--r-- 1 shinarus shinarus  41089536 Aug 27 21:41 arch/arm64/boot/Image\n' +
            '-rwxr-xr-x 1 shinarus shinarus 157080232 Aug 27 21:41 vmlinux' },

          { t: 'p', x:
            'Tên người dùng <code>shinarus</code> và mốc thời gian <code>Aug 27 21:41</code> ' +
            'đương nhiên khác trên máy bạn. Ba con số kích thước thì <b>gần như trùng khít</b> ' +
            'nếu bạn dùng cùng kernel 6.18.45 và cùng <code>arm64_defconfig</code>. Điều đáng ' +
            'chú ý là tỉ lệ: <code>vmlinux</code> nặng <b>157 MB</b>, còn thứ thật sự đem boot ' +
            'chỉ <b>41 MB</b> — <b>nhỏ hơn 3,82 lần</b>. Chỗ chênh đó là gì?' },

          { t: 'code', where: 'wsl', code: 'file vmlinux arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            'vmlinux:               ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), statically linked, BuildID[sha1]=fb448c9f44216c51b2e9ca924c8698266d71e6b7, with debug_info, not stripped\n' +
            'arch/arm64/boot/Image: Linux kernel ARM64 boot executable Image, little-endian, 4K pages' },

          { t: 'p', x:
            'Câu trả lời nằm ngay trong dòng đầu: <b><code>with debug_info, not stripped</code></b>. ' +
            '<code>vmlinux</code> mang theo toàn bộ thông tin gỡ lỗi DWARF và bảng ký hiệu — ' +
            'thứ mà gdb cần và CPU thì không. Cờ <code>-S</code> của <code>objcopy</code> mà ' +
            'bạn đã đọc ở phần lý thuyết chính là cái vứt chúng đi. Vài chi tiết khác đáng ghi nhận:' },

          { t: 'list', items: [
            '<code>ARM aarch64</code> — <b>bằng chứng cross-compile đã đúng</b>. Nếu chỗ này ghi ' +
            '<code>x86-64</code> thì bạn vừa build một kernel cho chính máy mình, không phải cho ARM64.',
            '<code>statically linked</code> — kernel không có thư viện động để mà liên kết. ' +
            'Không có <code>libc</code>, không có <code>ld.so</code>: nó <i>là</i> tầng dưới cùng.',
            '<code>BuildID[sha1]=fb448c9f…</code> — mã băm định danh bản build này, ' +
            '<b>sẽ khác trên máy bạn</b>. Bạn đã gặp khái niệm này ở Bài 18.',
            '<code>Linux kernel ARM64 boot executable Image</code> — lệnh <code>file</code> ' +
            'nhận ra <code>Image</code> <i>không</i> phải ELF mà là một định dạng riêng của ARM64.'
          ] },

          { t: 'p', x:
            'Định dạng riêng đó trông thế nào? Nó có một header 64 byte, và bạn xem được bằng ' +
            '<code>xxd</code>:' },

          { t: 'code', where: 'wsl', code: 'xxd -l 64 arch/arm64/boot/Image' },

          { t: 'code', where: 'out', nocopy: true, code:
            '00000000: 4d5a 40fa 3b9c 7a14 0000 0000 0000 0000  MZ@.;.z.........\n' +
            '00000010: 0000 7f02 0000 0000 0a00 0000 0000 0000  ................\n' +
            '00000020: 0000 0000 0000 0000 0000 0000 0000 0000  ................\n' +
            '00000030: 0000 0000 0000 0000 4152 4d64 4000 0000  ........ARMd@...' },

          { t: 'cal', kind: 'info', title: 'Hai chữ ký trong 64 byte đầu',
            x: 'Cột bên phải của <code>xxd</code> dịch byte sang ký tự đọc được, và có đúng ' +
               'hai cụm không phải số 0. (1) <b><code>MZ</code></b> ở byte 0 — đó là chữ ký của ' +
               'định dạng PE, tức file <code>.exe</code> của Windows. Không phải đùa: nhờ nó mà ' +
               'firmware UEFI nhìn <code>Image</code> như một ứng dụng EFI và nạp thẳng được, ' +
               'không cần bootloader riêng. (2) <b><code>ARMd</code></b> ở byte 56 (0x38) — ' +
               'chữ ký thật của định dạng Image ARM64, chính là chuỗi ' +
               '<code>ARM\\x64</code>. Bootloader như U-Boot ở Chặng 06 kiểm đúng bốn byte này ' +
               'trước khi chịu nhảy vào. Bốn byte <code>0a 00 00 00</code> ở 0x18 là ô ' +
               '<i>flags</i>, và tám byte <code>00 00 7f 02 …</code> ở 0x10 là ' +
               '<i>image_size</i> — <b>0x027f0000 = 41 943 040 byte</b>, tức đúng 40 MiB tròn ' +
               'mà kernel yêu cầu bootloader chừa ra cho nó.' },

          { t: 'p', x:
            'Con số 40 MiB đó lớn hơn chính file <code>Image</code>. Vì sao? Hãy hỏi ' +
            '<code>size</code> — công cụ bạn đã dùng ở Bài 18 để đo từng section của một file ELF:' },

          { t: 'code', where: 'wsl', code: 'aarch64-linux-gnu-size vmlinux' },

          { t: 'code', where: 'out', nocopy: true, code:
            '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
            '21110549\t19758487\t 707824\t41576860\t27a699c\tvmlinux' },

          { t: 'p', x:
            'Ba con số này giải thích trọn vẹn kích thước <code>Image</code>. Làm phép cộng:' },

          { t: 'table',
            head: ['Phép tính', 'Kết quả (byte)', 'Ý nghĩa'],
            rows: [
              ['<code>text</code> + <code>data</code>',
               '21 110 549 + 19 758 487 = <b>40 869 036</b>',
               'Mã máy cộng dữ liệu có giá trị khởi tạo — thứ <b>bắt buộc</b> phải nằm trong file'],
              ['Kích thước <code>Image</code>',
               '<b>41 089 536</b>',
               'Lớn hơn một chút vì <code>objcopy</code> phải căn lề các section theo trang'],
              ['<code>text</code> + <code>data</code> + <code>bss</code>',
               '40 869 036 + 707 824 = <b>41 576 860</b> (= cột <code>dec</code>)',
               'Lượng RAM kernel chiếm <i>khi đã chạy</i>. Lớn hơn file, vì <code>bss</code> ' +
               'chỉ là “chừa cho tôi 707 824 byte số 0” — không cần lưu trong file']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao <code>bss</code> không nằm trong file',
            x: '<code>bss</code> là vùng biến toàn cục chưa được gán giá trị, mà theo chuẩn C ' +
               'thì chúng phải bằng 0 khi chương trình bắt đầu. Lưu 707 824 byte số 0 vào file ' +
               'là lãng phí thuần tuý — thay vào đó file chỉ ghi <i>con số</i> 707 824, và mã ' +
               'khởi động ARM64 tự xoá vùng đó trước khi gọi <code>start_kernel</code>. ' +
               'Đây chính xác là cơ chế bạn đã học ở Bài 18 với chương trình C thường; kernel ' +
               'không có ngoại lệ nào cả. Và đó cũng là lý do ô <i>image_size</i> trong header ' +
               'phải ghi 40 MiB chứ không phải 39 MB: bootloader cần biết chừa đủ chỗ cho ' +
               'cả phần <code>bss</code> mà nó không thấy trong file.' },

          { t: 'p', x:
            'Sản phẩm thứ ba, <code>System.map</code>, là bảng tra <b>địa chỉ → tên</b> ở dạng ' +
            'văn bản, do <code>NM</code> sinh ra ở đuôi build. Đếm và tra thử hàm khởi động ' +
            'chính của kernel:' },

          { t: 'code', where: 'wsl', code:
            'wc -l System.map\n' +
            'grep -n " T start_kernel$" System.map' },

          { t: 'code', where: 'out', nocopy: true, code:
            '198485 System.map\n' +
            '130933:ffff800081eb07c4 T start_kernel' },

          { t: 'p', x:
            '<b>198 485 ký hiệu.</b> Dòng tìm được đọc như sau: hàm <code>start_kernel</code> — ' +
            'điểm mà kernel bắt đầu chạy mã C, sau khi phần assembly khởi động xong — nằm ở địa ' +
            'chỉ ảo <code>0xffff800081eb07c4</code>, và chữ <code>T</code> nghĩa là nó ở section ' +
            '<code>text</code>, tức mã máy, và là ký hiệu toàn cục (chữ hoa). Bạn đã học đúng ' +
            'bảng chữ cái này của <code>nm</code> ở Bài 18. <b>Địa chỉ sẽ khác trên máy bạn</b> ' +
            'nếu cấu hình khác đi dù chỉ một symbol; con số <code>ffff8000…</code> ở đầu thì ' +
            'không đổi — đó là mốc bắt đầu vùng địa chỉ nhân của ARM64.' },

          { t: 'cal', kind: 'tip', title: '<code>System.map</code> để làm gì trong đời thật',
            x: 'Khi kernel crash, nó in <code>Call trace:</code> kèm tên hàm — thông tin đó lấy ' +
               'từ <b>kallsyms</b> nằm bên trong kernel, không phải từ file này. ' +
               '<code>System.map</code> là bản <i>ngoài</i>, dành cho công cụ chạy trên máy bạn: ' +
               '<code>crash</code>, <code>perf</code>, hoặc chính bạn khi cần đối chiếu một địa ' +
               'chỉ trần trong log cũ với tên hàm. <b>Hãy giữ nó cùng chỗ với ' +
               '<code>Image</code></b> — một <code>System.map</code> lệch phiên bản còn tệ hơn ' +
               'không có, vì nó cho bạn tên hàm sai một cách rất thuyết phục.' },

          { t: 'p', x:
            'Cuối cùng, mở một <code>built-in.a</code> ra xem — để thấy tận mắt cái mắt xích ' +
            'giữa mà phần lý thuyết đã vẽ. Chọn đúng thư mục UART mà Bài 38 đã truy vết:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-ar t drivers/tty/serial/built-in.a | wc -l\n' +
            'aarch64-linux-gnu-ar t drivers/tty/serial/built-in.a | grep pl011' },

          { t: 'code', where: 'out', nocopy: true, code:
            '45\n' +
            'drivers/tty/serial/amba-pl011.o' },

          { t: 'p', x:
            '<b>45 file <code>.o</code> trong một thư viện</b>, và <code>amba-pl011.o</code> ' +
            'nằm trong đó. Vòng tròn đã khép: Bài 39 bạn đặt ' +
            '<code>CONFIG_SERIAL_AMBA_PL011=y</code>; dòng <code>obj-$(CONFIG_…)</code> ở ' +
            '<code>drivers/tty/serial/Makefile</code> biến giá trị <code>y</code> đó thành ' +
            '<code>obj-y += amba-pl011.o</code>; <code>AR</code> gom nó vào ' +
            '<code>built-in.a</code>; <code>LD</code> gom tiếp vào <code>vmlinux</code>; ' +
            '<code>objcopy</code> cắt ra <code>Image</code>. Ở bước 6, chính driver này sẽ in ' +
            'dòng chữ đầu tiên ra màn hình QEMU.' },

          { t: 'cmdx', title: 'Đọc lệnh ar',
            cmd: 'aarch64-linux-gnu-ar t drivers/tty/serial/built-in.a',
            rows: [
              ['<code>aarch64-linux-gnu-ar</code>',
               'Bản <code>ar</code> của toolchain ARM64. Ở đây <code>ar</code> thường của máy ' +
               'cũng đọc được vì nó chỉ liệt kê tên, nhưng hãy tập thói quen dùng đúng bộ công cụ'],
              ['<code>t</code>',
               '<i>table of contents</i> — liệt kê thành viên. Không có dấu gạch ngang: ' +
               '<code>ar</code> là công cụ cổ, cú pháp có từ trước khi cờ kiểu ' +
               '<code>-x</code> thành chuẩn'],
              ['<code>built-in.a</code>',
               'Thư viện tĩnh của riêng thư mục đó — đúng định dạng <code>.a</code> mà bạn đã ' +
               'tự tạo bằng <code>ar rcs</code> ở Bài 17']
            ] },

          { t: 'p', x:
            'Một kiểm tra cuối, để tự chứng minh điều phần lý thuyết cảnh báo: bạn đã gọi đích ' +
            'danh target <code>Image</code>, vậy <code>Image.gz</code> có được tạo ra không?' },

          { t: 'code', where: 'wsl', code: 'ls -l arch/arm64/boot/Image.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            "ls: cannot access 'arch/arm64/boot/Image.gz': No such file or directory" },

          { t: 'p', x:
            '<b>Không.</b> Và đó là bằng chứng sống cho cái bẫy ở phần lý thuyết, chỉ lật ngược ' +
            'lại: gọi đúng tên target thì bạn nhận đúng thứ mình gọi, không dư một byte. ' +
            'Nếu lúc nãy bạn gõ <code>make</code> trần trụi, file này sẽ có mặt — cùng với ' +
            'toàn bộ module và toàn bộ device tree — và bạn đã chờ lâu hơn nhiều.' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Sinh device tree và module: hai target còn lại',
        blocks: [

          { t: 'p', x:
            'Ở Bài 32 bạn boot một kernel có sẵn bằng QEMU <code>-M virt</code> mà không hề ' +
            'đưa cho nó file device tree nào. Chuyện đó chạy được vì QEMU <b>tự sinh</b> ' +
            'device tree cho máy ảo <code>virt</code> ngay lúc khởi động rồi nhét vào bộ nhớ ' +
            'cho kernel. Một bo mạch thật thì không tử tế như vậy: nó cần một file ' +
            '<code>.dtb</code> có sẵn, và file đó nằm trong cây nguồn kernel. Hãy dịch toàn bộ ' +
            'kho device tree của ARM64 ra:' },

          { t: 'code', where: 'wsl', code:
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- dtbs \\\n' +
            '  > ~/bai40-logs/dtbs.log 2>&1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'REAL 0m13.802s  USER 0m54.888s  SYS 0m15.051s' },

          { t: 'p', x:
            '<b>13,8 giây</b> — so với <b>1 110,8 giây</b> của <code>Image</code>, tức ' +
            '<b>rẻ hơn 80 lần</b>. Tỉ lệ song song ở đây là ' +
            '(54,888 + 15,051) ÷ 13,802 = <b>5,06</b> trên 6 nhân, thấp hơn con số 5,83 của ' +
            'bước 2. Lý do rất đời thường: mỗi file device tree dịch xong trong chớp mắt, nên ' +
            'phần thời gian make bỏ ra để <i>đọc Makefile và phát việc</i> chiếm tỉ trọng lớn ' +
            'hơn hẳn. <b>Công việc càng vụn, song song càng kém hiệu quả</b> — một quy luật ' +
            'bạn sẽ gặp lại ở mọi hệ thống build.' },

          { t: 'p', x:
            'Xem make đã làm gì. Bốn dòng đầu của log:' },

          { t: 'code', where: 'wsl', code: 'head -4 ~/bai40-logs/dtbs.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  DTC     arch/arm64/boot/dts/airoha/en7581-evb.dtb\n' +
            '  DTC     arch/arm64/boot/dts/actions/s700-cubieboard7.dtb\n' +
            '  DTC     arch/arm64/boot/dts/allwinner/sun50i-a64-amarula-relic.dtb\n' +
            '  DTC     arch/arm64/boot/dts/altera/socfpga_stratix10_socdk.dtb' },

          { t: 'p', x:
            'Một loại nhãn mới: <b><code>DTC</code></b> — <i>Device Tree Compiler</i>. Đây là ' +
            'công cụ thứ tư trong bộ, bên cạnh <code>CC</code>, <code>AR</code>, ' +
            '<code>LD</code> mà bạn đã gặp. Nó <b>không</b> đến từ toolchain ARM64: ' +
            'Kbuild tự dịch lấy từ <code>scripts/dtc/</code> bằng <code>HOSTCC</code>, đúng ' +
            'kiểu <code>scripts/kconfig/conf</code> ở bước 1. Để ý thứ tự thư mục — ' +
            '<code>airoha</code> đứng trước <code>actions</code>, không theo bảng chữ cái: đó ' +
            'là dấu vết của <code>-j6</code>, sáu tiến trình về đích theo thứ tự ngẫu nhiên. ' +
            '<b>Thứ tự trên máy bạn sẽ khác.</b>' },

          { t: 'p', x:
            'Đếm xem có bao nhiêu file được sinh ra, và log có bao nhiêu dòng:' },

          { t: 'code', where: 'wsl', code:
            'wc -l < ~/bai40-logs/dtbs.log\n' +
            'find arch/arm64/boot/dts -name "*.dtb" | wc -l\n' +
            'find arch/arm64/boot/dts -maxdepth 1 -mindepth 1 -type d | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1746\n' +
            '1577\n' +
            '39' },

          { t: 'p', x:
            '<b>1 746 dòng log, 1 577 file <code>.dtb</code>, 39 thư mục nhà sản xuất</b> — ' +
            'từ <code>allwinner</code>, <code>broadcom</code>, <code>freescale</code> tới ' +
            '<code>qcom</code>, <code>rockchip</code>, <code>ti</code>. Con số log lớn hơn con ' +
            'số <code>.dtb</code> vì ngoài <code>.dtb</code> còn có <b>overlay</b>, đuôi ' +
            '<code>.dtbo</code> — những mảnh device tree rời dán đè lên bo mạch nền để mô tả ' +
            'một cái mũ mở rộng cắm thêm. Tách hai loại nhãn ra thì thấy rõ:' },

          { t: 'code', where: 'wsl', code:
            "awk '{print $1}' ~/bai40-logs/dtbs.log | sort | uniq -c | sort -rn" },

          { t: 'code', where: 'out', nocopy: true, code:
            '   1565 DTC\n' +
            '    181 OVL' },

          { t: 'p', x:
            '<b>1 565 lần <code>DTC</code></b> (dịch thẳng một <code>.dts</code> thành ' +
            '<code>.dtb</code> hoặc <code>.dtbo</code>) và <b>181 lần <code>OVL</code></b> ' +
            '(dán một overlay lên một nền để ra file ghép). Cộng lại đúng 1 746 — mỗi dòng log ' +
            'là <b>một file được sinh ra</b>, không thừa không thiếu. Chi tiết overlay thuộc về ' +
            'Chặng 08, ở đây bạn chỉ cần biết chúng tồn tại và vì sao hai con số không khớp.' },

          { t: 'cal', kind: 'info', title: '1 577 file cho <b>một</b> bo mạch',
            x: 'Kernel vừa dịch device tree cho <b>toàn bộ</b> bo mạch ARM64 mà Linux biết — ' +
               'tổng cộng <b>94,5 MB</b>, trung bình <b>59,9 KB</b> mỗi file. Bạn sẽ chỉ dùng ' +
               'đúng <i>một</i> trong số đó. Đây là cái giá của <code>defconfig</code>: nó là ' +
               'cấu hình “chạy được ở mọi nơi”, không phải cấu hình cho sản phẩm của bạn. ' +
               'Một dự án thật sẽ giới hạn lại — và ở Chặng 11, Buildroot và Yocto sẽ làm ' +
               'chuyện đó giúp bạn một cách có hệ thống.' },

          { t: 'p', x:
            'Một file <code>.dtb</code> trông thế nào bên trong? Nó là <b>nhị phân</b>, nhưng ' +
            '<code>dtc</code> đọc ngược được. Lấy bo mạch mô phỏng đơn giản nhất của ARM làm ví ' +
            'dụ và tìm cổng UART trong đó:' },

          { t: 'code', where: 'wsl', code:
            './scripts/dtc/dtc -I dtb -O dts arch/arm64/boot/dts/arm/foundation-v8.dtb \\\n' +
            '  | grep -A 6 "serial@90000 {"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\t\t\tserial@90000 {\n' +
            '\t\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
            '\t\t\t\treg = <0x90000 0x1000>;\n' +
            '\t\t\t\tinterrupts = <0x05>;\n' +
            '\t\t\t\tclocks = <0x03 0x03>;\n' +
            '\t\t\t\tclock-names = "uartclk", "apb_pclk";\n' +
            '\t\t\t};' },

          { t: 'cal', kind: 'why', title: 'Đây chính là chỗ vòng tròn khép lại',
            x: 'Dòng <code>compatible = "arm,pl011"</code> là <b>sợi dây</b> nối device tree ' +
               'với driver. Bài 38 bạn truy vết tới <code>drivers/tty/serial/amba-pl011.c</code>; ' +
               'Bài 39 bạn bật <code>CONFIG_SERIAL_AMBA_PL011=y</code>; bước 3 bạn thấy ' +
               '<code>amba-pl011.o</code> nằm trong <code>built-in.a</code>. Bên trong file ' +
               '<code>.c</code> đó có một bảng khai báo đúng chuỗi <code>"arm,pl011"</code>. ' +
               'Khi kernel boot, nó duyệt device tree, gặp nút này, so chuỗi ' +
               '<code>compatible</code> với bảng của từng driver, thấy khớp, và gọi hàm ' +
               '<i>probe</i> của driver với địa chỉ <code>0x90000</code> lấy từ ô ' +
               '<code>reg</code>. <b>Đó là toàn bộ cơ chế nhận diện phần cứng của Linux nhúng</b>, ' +
               'và Chặng 08 rồi Chặng 10 sẽ mổ kỹ từng nửa của sợi dây này.' },

          { t: 'cmdx', title: 'Đọc ngược một file .dtb',
            cmd: './scripts/dtc/dtc -I dtb -O dts arch/arm64/boot/dts/arm/foundation-v8.dtb',
            rows: [
              ['<code>./scripts/dtc/dtc</code>',
               'Bản <code>dtc</code> mà Kbuild vừa tự dịch. Ubuntu cũng có gói ' +
               '<code>device-tree-compiler</code>, nhưng dùng bản trong cây nguồn thì chắc ' +
               'chắn khớp phiên bản với kernel'],
              ['<code>-I dtb</code>',
               '<i>Input</i> là nhị phân. Mặc định <code>dtc</code> chờ <code>.dts</code>, ' +
               'nên thiếu cờ này nó sẽ báo lỗi cú pháp trên dữ liệu nhị phân'],
              ['<code>-O dts</code>',
               '<i>Output</i> là văn bản. Đảo hai cờ lại là bạn có chiều xuôi — chính là việc ' +
               'make vừa làm 1 565 lần'],
              ['<code>grep -A 6</code>',
               'In dòng khớp cộng <b>6 dòng sau</b> nó. Bạn đã dùng cờ này ở Bài 11']
            ] },

          { t: 'cal', kind: 'tip', title: 'File nguồn chỉ 218 byte, sản phẩm 5 287 byte',
            x: 'Chạy <code>wc -c arch/arm64/boot/dts/arm/foundation-v8.dts</code> và bạn được ' +
               '<b>218 byte</b> — trừ phần ghi chú bản quyền, nội dung chỉ vỏn vẹn ba dòng <code>#include</code>. Nhưng ' +
               '<code>.dtb</code> ra lò nặng <b>5 287 byte</b>. Vì sao? Vì Kbuild cho ' +
               '<code>.dts</code> đi qua <b>bộ tiền xử lý của C</b> trước, đúng cái ' +
               '<code>cpp</code> bạn đã học ở Bài 15: <code>#include</code> được bung ra, ' +
               'macro được thay. Device tree dùng lại toàn bộ cơ chế đó — thêm một ví dụ nữa ' +
               'cho thấy kernel không phát minh công cụ mới khi công cụ cũ còn dùng được.' },

          { t: 'h4', x: 'Nửa sau: 1 423 module' },

          { t: 'p', x:
            'Ở Bài 39 bạn đã thấy ba trạng thái của một symbol <code>tristate</code>: ' +
            '<code>y</code> vào thẳng <code>vmlinux</code>, <code>n</code> biến mất, và ' +
            '<code>m</code> — dịch thành một file <code>.ko</code> rời, nạp vào kernel lúc ' +
            'chạy. Toàn bộ những symbol <code>=m</code> đó chưa được dịch: target ' +
            '<code>Image</code> chỉ lo phần <code>=y</code>. Giờ đến lượt chúng. Đây là lệnh ' +
            'lâu nhất trong bài — <b>hơn 20 phút</b>:' },

          { t: 'code', where: 'wsl', code:
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules \\\n' +
            '  > ~/bai40-logs/modules.log 2>&1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'REAL 20m37.036s  USER 108m40.559s  SYS 13m19.579s' },

          { t: 'cal', kind: 'info', title: 'Module tốn nhiều thời gian hơn cả kernel',
            x: '<b>20 phút 37 giây</b> cho module, so với <b>18 phút 31 giây</b> cho ' +
               '<code>Image</code> — phần “tuỳ chọn” đắt hơn phần “bắt buộc” <b>11 %</b>. ' +
               'Đừng thấy lạ: <code>defconfig</code> bật <code>=m</code> cho gần như mọi driver ' +
               'mà ARM64 hỗ trợ, từ card đồ hoạ Nvidia tới hệ thống file Btrfs, trong khi ' +
               '<code>=y</code> chỉ giữ lại những gì cần để boot. Tỉ lệ song song là ' +
               '(6 520,559 + 799,579) ÷ 1 237,036 = <b>5,91</b> trên 6 nhân — <i>cao hơn</i> cả ' +
               'con số 5,83 của <code>Image</code>, vì ở đây không có bước link ba vòng ' +
               '<code>kallsyms</code> vốn chỉ chạy được trên một nhân.' },

          { t: 'p', x:
            'Cộng lại, bạn vừa bỏ ra <b>39 phút 8 giây</b> cho <code>Image</code> và ' +
            '<code>modules</code>, cộng 13,8 giây cho <code>dtbs</code>. Hãy xem cái giá đó mua ' +
            'được những gì. Trước hết là hình dạng của log:' },

          { t: 'code', where: 'wsl', code:
            'wc -l < ~/bai40-logs/modules.log\n' +
            "awk '{print $1}' ~/bai40-logs/modules.log | sort | uniq -c | sort -rn" },

          { t: 'code', where: 'out', nocopy: true, code:
            '7636\n' +
            '   5674 CC\n' +
            '   1914 LD\n' +
            '     26 GENHDR\n' +
            '      8 UNROLL\n' +
            '      6 AS\n' +
            '      1 WRAP\n' +
            '      1 TABLE\n' +
            '      1 MODPOST\n' +
            '      1 LDS\n' +
            '      1 HOSTCC\n' +
            '      1 GEN\n' +
            '      1 DTC\n' +
            '      1 CALL' },

          { t: 'p', x:
            '<b>5 674 lần <code>CC</code></b> và <b>1 914 lần <code>LD</code></b> — cùng hai ' +
            'nhãn bạn đã gặp ở bước 2, nhưng tỉ lệ đảo hẳn: ở <code>Image</code> phần lớn công ' +
            'việc link là <code>AR</code> gom vào <code>built-in.a</code>, còn ở đây mỗi module ' +
            'là một sản phẩm hoàn chỉnh riêng nên phải <code>LD</code> thật sự. Đếm sản phẩm:' },

          { t: 'code', where: 'wsl', code:
            'find . -name "*.ko" | wc -l\n' +
            "grep -c '^  LD \\[M\\].*\\.ko$' ~/bai40-logs/modules.log\n" +
            "grep -c '\\.mod\\.o$' ~/bai40-logs/modules.log" },

          { t: 'code', where: 'out', nocopy: true, code:
            '1423\n' +
            '1423\n' +
            '1423' },

          { t: 'p', x:
            'Ba con số bằng nhau, và đó không phải trùng hợp: <b>1 423 module</b>, mỗi cái đúng ' +
            'một dòng <code>LD [M] …ko</code> và đúng một file <code>.mod.o</code>. Nhãn ' +
            '<code>[M]</code> trong ngoặc vuông là cách Kbuild đánh dấu “việc này thuộc về ' +
            'module”, phân biệt với dòng không ngoặc của phần <code>=y</code>. Nhưng ' +
            '<code>LD</code> có tới <b>1 914</b> lần, thừa ra <b>491</b>. Lấy Btrfs làm ví dụ ' +
            'để xem 491 lần thừa đó là gì:' },

          { t: 'code', where: 'wsl', code:
            "grep -E '(LD \\[M\\].*btrfs|btrfs\\.mod\\.o)' ~/bai40-logs/modules.log" },

          { t: 'code', where: 'out', nocopy: true, code:
            '  LD [M]  fs/btrfs/btrfs.o\n' +
            '  CC [M]  fs/btrfs/btrfs.mod.o\n' +
            '  LD [M]  fs/btrfs/btrfs.ko' },

          { t: 'cal', kind: 'why', title: 'Ba dòng này là toàn bộ cách một module được ráp',
            x: '<b>Dòng 1 — <code>btrfs.o</code>:</b> Btrfs có hàng chục file <code>.c</code>, ' +
               'nên Kbuild link chúng lại thành <i>một</i> file object trung gian trước. Đây ' +
               'chính là 491 dòng <code>LD</code> thừa ra: chúng thuộc về những module ' +
               '<b>nhiều file nguồn</b>. Module một file thì bỏ qua bước này, và đó là lý do ' +
               '491 nhỏ hơn nhiều so với 1 423.<br>' +
               '<b>Dòng 2 — <code>btrfs.mod.o</code>:</b> file này <b>không có trong cây ' +
               'nguồn</b>. Kbuild <i>sinh</i> ra một file <code>.c</code> chứa phần khai báo ' +
               'bắt buộc của mọi module — tên, giấy phép, danh sách symbol phụ thuộc, chữ ký ' +
               'phiên bản — rồi dịch nó. Đó là việc của <code>MODPOST</code>, đúng một dòng ' +
               'trong bảng thống kê ở trên.<br>' +
               '<b>Dòng 3 — <code>btrfs.ko</code>:</b> ghép hai file trên lại thành sản phẩm ' +
               'cuối. Đuôi <code>.ko</code> là <i>kernel object</i>; nó vẫn là ELF, nhưng là ' +
               'ELF kiểu <i>relocatable</i> chứ không phải chương trình chạy được — Bài 18 đã ' +
               'phân biệt hai loại này.' },

          { t: 'p', x:
            'Xong phần dịch. Nhưng 1 423 file <code>.ko</code> đang nằm rải rác khắp cây nguồn, ' +
            'lẫn với file <code>.o</code> — kernel lúc chạy sẽ không biết tìm ở đâu. Target ' +
            '<code>modules_install</code> gom chúng về một chỗ theo đúng cấu trúc chuẩn. Hãy ' +
            '<b>cố tình gõ thiếu</b> lần đầu để thấy nó nguy hiểm thế nào:' },

          { t: 'code', where: 'wsl', code:
            'make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules_install' },

          { t: 'code', where: 'out', nocopy: true, code:
            'mkdir: cannot create directory ‘/lib/modules/6.18.45-embedded’: Permission denied\n' +
            'mkdir: cannot create directory ‘/lib/modules/6.18.45-embedded’: Permission denied\n' +
            '  SYMLINK /lib/modules/6.18.45-embedded/build\n' +
            'ln: failed to create symbolic link \'/lib/modules/6.18.45-embedded/build\': No such file or directory\n' +
            'make[2]: *** [scripts/Makefile.modinst:22: /lib/modules/6.18.45-embedded/build] Error 1\n' +
            'make[1]: *** [/home/shinarus/bai38/linux-6.18.45/Makefile:1956: modules_install] Error 2\n' +
            'make: *** [Makefile:248: __sub-make] Error 2' },

          { t: 'cal', kind: 'danger', title: 'Lỗi này đang bảo vệ bạn — đừng “sửa” bằng <code>sudo</code>',
            x: 'Không có <code>INSTALL_MOD_PATH</code>, <code>modules_install</code> ghi thẳng ' +
               'vào <code>/lib/modules/</code> của <b>Ubuntu đang chạy</b>. May cho bạn, thư ' +
               'mục đó thuộc <code>root</code> nên lệnh dừng ở <code>Permission denied</code> ' +
               'trước khi kịp tạo ra thứ gì. Phản xạ sai lúc này là thêm <code>sudo</code>: bạn ' +
               'sẽ nhét 325 MB module <b>ARM64</b> vào một hệ thống <b>x86-64</b>, nơi chúng vô ' +
               'dụng hoàn toàn, và làm rối thư mục module thật của máy. Với cross-compile, ' +
               '<code>INSTALL_MOD_PATH</code> không phải tuỳ chọn — nó là bắt buộc. ' +
               '<b>Đường dẫn báo lỗi sẽ khác trên máy bạn</b> ở phần tên người dùng; phần phải ' +
               'giống là <code>/lib/modules/6.18.45-embedded</code> ở đầu dòng.' },

          { t: 'p', x:
            'Làm lại cho đúng: trỏ đích vào một thư mục của riêng bạn.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai40/modroot\n' +
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \\\n' +
            '  INSTALL_MOD_PATH=~/bai40/modroot modules_install > /dev/null' },

          { t: 'code', where: 'out', nocopy: true, code:
            'REAL 0m5.655s  USER 0m5.498s  SYS 0m6.880s' },

          { t: 'cmdx', title: 'modules_install và biến chặn đường',
            cmd: 'make INSTALL_MOD_PATH=~/bai40/modroot modules_install',
            rows: [
              ['<code>modules_install</code>',
               'Chép mọi <code>.ko</code> vào ' +
               '<code>$(INSTALL_MOD_PATH)/lib/modules/&lt;kernelrelease&gt;/</code>, giữ nguyên ' +
               'cây thư mục con, rồi chạy <code>depmod</code> để sinh bảng phụ thuộc'],
              ['<code>INSTALL_MOD_PATH</code>',
               'Tiền tố dán trước <code>/lib/modules</code>. Đây là một <b>staging directory</b> ' +
               '— khái niệm bạn sẽ gặp lại suốt Chặng 09 và Chặng 11: dựng cây thư mục của máy ' +
               'đích <i>bên trong</i> máy build, rồi mới đóng gói mang đi'],
              ['<code>&gt; /dev/null</code>',
               'Bỏ đi 1 423 dòng <code>INSTALL</code>. Cần xem thì chỉ việc bỏ cờ này ra'],
              ['<b>5,7 giây</b>',
               'Chỉ chép file, không dịch gì. So với 20 phút 37 giây vừa rồi, đây gần như miễn phí']
            ] },

          { t: 'p', x:
            'Xem cấu trúc vừa sinh ra, và nó nặng bao nhiêu:' },

          { t: 'code', where: 'wsl', code:
            'du -sh ~/bai40/modroot\n' +
            'ls -1 ~/bai40/modroot/lib/modules/' },

          { t: 'code', where: 'out', nocopy: true, code:
            '325M\t/home/shinarus/bai40/modroot\n' +
            '6.18.45-embedded' },

          { t: 'p', x:
            'Tên thư mục là <code>6.18.45-embedded</code> — <b>đúng chuỗi</b> mà ' +
            '<code>kernelrelease</code> trả về ở bước 2 sau khi bạn ép <code>syncconfig</code>. ' +
            'Đây là lý do <code>LOCALVERSION</code> quan trọng hơn vẻ ngoài của nó: kernel lúc ' +
            'chạy tìm module tại <code>/lib/modules/$(uname -r)/</code>, nên lệch một ký tự ' +
            'thôi là nó không thấy module nào. Mặt tốt của cùng cơ chế đó: hai bản kernel khác ' +
            '<code>LOCALVERSION</code> sống chung một máy được, vì mỗi bản có thư mục riêng. ' +
            '<b>Tên người dùng <code>shinarus</code> trong đường dẫn sẽ khác trên máy bạn.</b>' },

          { t: 'code', where: 'wsl', code:
            'ls -1 ~/bai40/modroot/lib/modules/6.18.45-embedded/' },

          { t: 'code', where: 'out', nocopy: true, code:
            'build\n' +
            'kernel\n' +
            'modules.alias\n' +
            'modules.alias.bin\n' +
            'modules.builtin\n' +
            'modules.builtin.alias.bin\n' +
            'modules.builtin.bin\n' +
            'modules.builtin.modinfo\n' +
            'modules.dep\n' +
            'modules.dep.bin\n' +
            'modules.devname\n' +
            'modules.order\n' +
            'modules.softdep\n' +
            'modules.symbols\n' +
            'modules.symbols.bin\n' +
            'modules.weakdep' },

          { t: 'p', x:
            'Chỉ <b>một</b> thư mục thật là <code>kernel/</code> — nơi chứa 1 423 file ' +
            '<code>.ko</code>. <code>build</code> là symlink trỏ ngược về cây nguồn. Mười bốn ' +
            'file <code>modules.*</code> còn lại là <b>bảng tra do <code>depmod</code> sinh ' +
            'ra</b>, tồn tại để <code>modprobe</code> không phải quét 1 423 file mỗi lần nạp ' +
            'một driver. Quan trọng nhất là <code>modules.dep</code>:' },

          { t: 'code', where: 'wsl', code:
            'grep "^kernel/fs/btrfs/btrfs.ko:" \\\n' +
            '  ~/bai40/modroot/lib/modules/6.18.45-embedded/modules.dep' },

          { t: 'code', where: 'out', nocopy: true, code:
            'kernel/fs/btrfs/btrfs.ko: kernel/crypto/xor.ko kernel/arch/arm64/lib/xor-neon.ko ' +
            'kernel/lib/raid6/raid6_pq.ko kernel/lib/zstd/zstd_compress.ko' },

          { t: 'cal', kind: 'info', title: 'Cú pháp này bạn đã biết rồi',
            x: '<code>đích: những thứ nó cần</code> — <b>đúng cú pháp một luật của Makefile</b> ' +
               'mà bạn học ở Bài 16. Dòng trên nói: muốn nạp <code>btrfs.ko</code> thì phải nạp ' +
               'bốn module kia trước. Gõ <code>modprobe btrfs</code>, <code>modprobe</code> đọc ' +
               'đúng dòng này rồi nạp năm module theo thứ tự; gõ <code>insmod btrfs.ko</code> ' +
               'thì <b>không</b> — <code>insmod</code> nạp trần trụi đúng một file và sẽ báo ' +
               '<code>Unknown symbol</code>. Đó là toàn bộ khác biệt giữa hai lệnh, và Chặng 10 ' +
               'sẽ cho bạn dùng cả hai.' },

          { t: 'p', x:
            '325 MB là quá lớn cho một thiết bị nhúng chỉ có 128 MB flash. Nhưng nhớ bước 3: ' +
            '<code>vmlinux</code> nặng 157 MB chủ yếu vì thông tin gỡ lỗi. Module cũng vậy, và ' +
            '<code>modules_install</code> có sẵn công tắc xử lý. Cài lại vào một thư mục khác ' +
            'để so sánh trực tiếp:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai40/modroot-stripped\n' +
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- \\\n' +
            '  INSTALL_MOD_PATH=~/bai40/modroot-stripped INSTALL_MOD_STRIP=1 \\\n' +
            '  modules_install > /dev/null\n' +
            'du -sh ~/bai40/modroot ~/bai40/modroot-stripped' },

          { t: 'code', where: 'out', nocopy: true, code:
            'REAL 0m4.672s  USER 0m7.201s  SYS 0m8.255s\n' +
            '325M\t/home/shinarus/bai40/modroot\n' +
            '80M\t/home/shinarus/bai40/modroot-stripped' },

          { t: 'p', x:
            '<b>325 MB xuống 80 MB — bớt 75 %</b>, hết 4,7 giây, và không mất một tính năng ' +
            'nào. Xem năm module nặng nhất:' },

          { t: 'code', where: 'wsl', code:
            'find ~/bai40/modroot -name "*.ko" -printf "%s\\t%f\\n" | sort -rn | head -5' },

          { t: 'code', where: 'out', nocopy: true, code:
            '22129192\tnouveau.ko\n' +
            '11957544\tmlx5_core.ko\n' +
            '11073624\tbtrfs.ko\n' +
            '7989496\tmsm.ko\n' +
            '5467456\tmac80211.ko' },

          { t: 'cmdx', title: 'find in ra đúng hai cột bạn cần',
            cmd: 'find ~/bai40/modroot -name "*.ko" -printf "%s\\t%f\\n" | sort -rn | head -5',
            rows: [
              ['<code>-printf</code>',
               'Thay cho hành vi mặc định là in đường dẫn. Có nó, bạn tự chọn in gì và theo ' +
               'định dạng nào — khỏi phải nối thêm <code>ls -l</code> rồi cắt cột'],
              ['<code>%s</code>',
               'Kích thước file tính bằng <b>byte</b>. Cố ý không dùng <code>-h</code>: cần số ' +
               'thô thì mới <code>sort</code> theo số được'],
              ['<code>\\t%f</code>',
               'Một dấu tab rồi tên file <i>không kèm đường dẫn</i>. Tab để hai cột thẳng hàng, ' +
               '<code>%f</code> để bảng khỏi bị đường dẫn dài làm rối'],
              ['<code>sort -rn</code>',
               '<code>-n</code> so sánh theo <b>giá trị số</b> chứ không theo bảng chữ cái ' +
               '(nếu không, <code>9</code> sẽ đứng trên <code>22129192</code>), ' +
               '<code>-r</code> đảo thành lớn trước']
            ] },

          { t: 'table',
            head: ['Module', 'Nó là driver của cái gì', 'Chưa strip', 'Đã strip', 'Còn lại'],
            rows: [
              ['<code>nouveau.ko</code>', 'GPU Nvidia, bản mã nguồn mở', '22 129 192', '3 381 112', '15 %'],
              ['<code>mlx5_core.ko</code>', 'Card mạng Mellanox 100 Gb', '11 957 544', '1 932 832', '16 %'],
              ['<code>btrfs.ko</code>', 'Hệ thống file Btrfs', '11 073 624', '1 986 928', '18 %'],
              ['<code>msm.ko</code>', 'GPU Adreno của Qualcomm', '7 989 496', '1 678 352', '21 %'],
              ['<code>mac80211.ko</code>', 'Tầng Wi-Fi dùng chung của kernel', '5 467 456', '843 896', '15 %']
            ] },

          { t: 'cal', kind: 'tip', title: 'Nhìn danh sách này là hiểu ngay <code>defconfig</code> dành cho ai',
            x: 'Module nặng nhất trong bản build ARM64 của bạn là driver <b>card đồ hoạ ' +
               'Nvidia</b>, thứ hai là <b>card mạng 100 Gb của trung tâm dữ liệu</b>. Không bo ' +
               'mạch nhúng nào cần hai thứ đó. <code>arm64/defconfig</code> được viết cho người ' +
               'phát triển kernel muốn thử trên mọi phần cứng ARM64 có thể — máy chủ, điện ' +
               'thoại, máy tính bảng — chứ không cho sản phẩm của bạn. Với sản phẩm thật bạn sẽ ' +
               'đi ngược lại: bắt đầu từ <code>defconfig</code>, tắt dần cho tới khi chỉ còn ' +
               'thứ bo mạch của bạn thật sự có. Chặng 11 sẽ tự động hoá việc đó.' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Boot kernel của chính bạn trong QEMU',
        blocks: [

          { t: 'p', x:
            'Đây là phần thưởng. Ở Bài 32 bạn boot một <code>Image</code> <b>người khác dịch ' +
            'sẵn</b>, tải về từ kho Debian. Lần này bạn sẽ boot đúng cái file mà 39 phút vừa ' +
            'rồi sinh ra. Trước khi bấm, ghi nhớ một con số nhỏ — Kbuild đếm số lần nó link ' +
            '<code>vmlinux</code> trên cây nguồn này:' },

          { t: 'code', where: 'wsl', code: 'cat .version' },

          { t: 'code', where: 'out', nocopy: true, code: '2' },

          { t: 'p', x:
            '<b>Con số này gần như chắc chắn khác trên máy bạn</b> — máy viết bài đã link lại ' +
            'một lần thêm khi thử nghiệm, nên nó là <code>2</code>; nếu bạn làm đúng tuần tự từ ' +
            'bước 1 thì nó là <code>1</code>. Hãy nhớ lấy con số của <i>bạn</i>, vì lát nữa ' +
            'kernel sẽ tự khai nó ra và đó là bằng chứng cuối cùng rằng file đang chạy đúng là ' +
            'file bạn vừa dịch. Giờ thì boot — dùng lại nguyên bộ tham số của Bài 32, chỉ đổi ' +
            'đường dẫn <code>-kernel</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai32\n' +
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -nographic' },

          { t: 'code', where: 'out', nocopy: true, name: 'Sáu dòng đầu tiên', code:
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[    0.000000] Linux version 6.18.45-embedded (shinarus@Shinarus) ' +
            '(aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0, GNU ld (GNU Binutils for ' +
            'Ubuntu) 2.46) #2 SMP PREEMPT Thu Aug 27 22:10:34 +07 2026\n' +
            '[    0.000000] KASLR enabled\n' +
            '[    0.000000] random: crng init done\n' +
            '[    0.000000] Machine model: linux,dummy-virt\n' +
            '[    0.000000] efi: UEFI not found.' },

          { t: 'cal', kind: 'why', title: 'Dòng thứ hai là toàn bộ bằng chứng, đọc kỹ từng mảnh',
            x: '<b><code>6.18.45-embedded</code></b> — hậu tố bạn tự đặt ở bước 2. Không có ' +
               'kernel nào trên đời ngoài của bạn mang chuỗi này.<br>' +
               '<b><code>(shinarus@Shinarus)</code></b> — <i>user</i>@<i>hostname</i> của máy ' +
               'đã dịch. <b>Sẽ khác trên máy bạn</b>; nó chính là tên đăng nhập WSL của bạn.<br>' +
               '<b><code>aarch64-linux-gnu-gcc … 15.2.0</code></b> — trình biên dịch chéo mà ' +
               'bước 1 bắt bạn kiểm tra bằng <code>CONFIG_CC_VERSION_TEXT</code>. Nếu bước 1 ' +
               'bạn quên <code>CROSS_COMPILE</code>, chỗ này sẽ tố cáo.<br>' +
               '<b><code>#2</code></b> — đúng con số trong <code>.version</code> bạn vừa ' +
               '<code>cat</code>. Kbuild tăng nó mỗi lần link <code>vmlinux</code>.<br>' +
               '<b><code>Thu Aug 27 22:10:34 +07 2026</code></b> — thời điểm link, không phải ' +
               'thời điểm boot. Đây là cách nhanh nhất để biết mình có đang boot nhầm một ' +
               '<code>Image</code> cũ hay không.' },

          { t: 'p', x:
            'Sau khoảng 250 dòng log, kernel giao quyền cho không gian người dùng và bạn thấy ' +
            'dấu nhắc quen thuộc của Bài 32:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Cuối phần log của kernel', code:
            '[    0.878144] Freeing unused kernel memory: 3264K\n' +
            '[    0.879338] Run /init as init process\n' +
            '\n' +
            '=== init running as PID 1 ===\n' +
            '\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
            "Enter 'help' for a list of built-in commands.\n" +
            '\n' +
            '~ #' },

          { t: 'p', x:
            '<b>0,879 giây</b> từ lúc CPU nhảy vào <code>Image</code> đến lúc <code>/init</code> ' +
            'chạy — mốc thời gian trong ngoặc vuông đếm từ chính thời điểm đó. Con số này sẽ ' +
            'khác vài phần trăm giây trên máy bạn. Hỏi kernel xem nó là ai:' },

          { t: 'code', where: 'qemu', code: 'uname -a' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Linux (none) 6.18.45-embedded #2 SMP PREEMPT Thu Aug 27 22:10:34 +07 2026 aarch64 GNU/Linux' },

          { t: 'p', x:
            'Cùng chuỗi phiên bản, cùng số <code>#2</code>, cùng dấu thời gian — nhưng lần này ' +
            'câu trả lời đến từ <b>bên trong máy ảo</b>, do kernel tự khai. <code>aarch64</code> ' +
            'ở gần cuối xác nhận nó là ARM64, không phải x86-64 như Ubuntu đang chạy QEMU. ' +
            'Chuỗi <code>(none)</code> là hostname: initramfs của Bài 32 không đặt tên máy, ' +
            'nên kernel để trống.' },

          { t: 'p', x:
            'Còn một sợi dây nữa cần nối. Bài 38 bạn truy vết driver UART tới ' +
            '<code>drivers/tty/serial/amba-pl011.c</code>; Bài 39 bạn bật nó thành ' +
            '<code>=y</code>; bước 3 bạn thấy <code>amba-pl011.o</code> nằm trong ' +
            '<code>built-in.a</code>; bước 4 bạn đọc ra <code>compatible = "arm,pl011"</code> ' +
            'trong một file <code>.dtb</code>. Giờ xem nó <i>hoạt động</i>. Toàn bộ log khởi ' +
            'động vẫn nằm trong bộ đệm của kernel, và BusyBox có sẵn lệnh đọc bộ đệm đó:' },

          { t: 'code', where: 'qemu', code: 'dmesg | grep ttyAMA0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init\n' +
            '[    0.242736] 9000000.pl011: ttyAMA0 at MMIO 0x9000000 (irq = 13, base_baud = 0) is a PL011 rev1\n' +
            '[    0.245125] printk: console [ttyAMA0] enabled' },

          { t: 'cal', kind: 'why', title: 'Ba dòng này khép lại vòng tròn Bài 38 → 39 → 40',
            x: '<b>Dòng 1:</b> bạn <i>yêu cầu</i> console là <code>ttyAMA0</code> qua ' +
               '<code>-append</code>. Mới chỉ là một chuỗi ký tự, kernel chưa biết nó có thật ' +
               'hay không.<br>' +
               '<b>Dòng 2, giây thứ 0,24:</b> kernel duyệt device tree do QEMU sinh, gặp một ' +
               'nút có <code>compatible = "arm,pl011"</code> tại địa chỉ ' +
               '<code>0x9000000</code>, tìm thấy driver khai đúng chuỗi đó — chính là ' +
               '<code>amba-pl011.o</code> bạn đã thấy trong <code>built-in.a</code> — và gọi ' +
               'hàm <i>probe</i> của nó. Driver đăng ký thiết bị dưới tên <code>ttyAMA0</code>.<br>' +
               '<b>Dòng 3:</b> giờ cái tên trong <code>-append</code> mới khớp được với một ' +
               'thiết bị có thật, và kernel chuyển console sang đó. <b>Nếu bước 1 bạn quên ' +
               '<code>CROSS_COMPILE</code> hay ở Bài 39 bạn tắt ' +
               '<code>CONFIG_SERIAL_AMBA_PL011</code>, dòng 2 sẽ không bao giờ xuất hiện, và ' +
               'màn hình của bạn sẽ đứng im từ đầu đến cuối</b> — kernel vẫn chạy, chỉ là không ' +
               'có đường nào nói cho bạn biết.' },

          { t: 'p', x:
            'Một câu hỏi cuối, và câu trả lời sẽ hơi phũ phàng. 1 423 module bạn dịch ở bước 4 ' +
            'đang ở đâu trong máy ảo này?' },

          { t: 'code', where: 'qemu', code: 'ls /lib/modules; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ls: /lib/modules: No such file or directory\n' +
            'rc=1' },

          { t: 'cal', kind: 'warn', title: 'Module không tự đi theo kernel — đây là một bài học riêng',
            x: 'Kernel boot ngon lành, nhưng <code>/lib/modules</code> <b>không tồn tại</b>. ' +
               'Lý do rất thẳng thắn: bạn cài module vào <code>~/bai40/modroot</code> trên máy ' +
               'build, còn máy ảo thì đang chạy <code>initramfs.cpio.gz</code> đóng gói từ Bài ' +
               '32 — hai thứ hoàn toàn tách rời. <b>Image và module là hai sản phẩm khác nhau, ' +
               'đi hai con đường khác nhau:</b> bootloader nạp <code>Image</code>, còn module ' +
               'phải nằm sẵn trong hệ thống file gốc. Đó là lý do <code>modules_install</code> ' +
               'nhận <code>INSTALL_MOD_PATH</code> chứ không tự biết chỗ nào. Chặng 09 sẽ dạy ' +
               'bạn dựng một root filesystem đúng nghĩa và <i>đổ</i> ' +
               '<code>~/bai40/modroot/lib/modules/</code> vào đó — lúc ấy <code>modprobe</code> ' +
               'mới có việc để làm.' },

          { t: 'p', x:
            'Tắt máy ảo cho gọn:' },

          { t: 'code', where: 'qemu', code: 'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   17.812367] Flash device refused suspend due to active operation (state 20)\n' +
            '[   17.812733] Flash device refused suspend due to active operation (state 20)\n' +
            '[   17.813670] reboot: Power down' },

          { t: 'cal', kind: 'tip', title: 'Hai dòng <code>Flash device refused suspend</code> là bình thường',
            x: 'Máy <code>virt</code> của QEMU có một chip flash giả lập mà không ai dùng tới; ' +
               'lúc tắt máy nó càu nhàu hai dòng rồi thôi. Dòng cần nhìn là ' +
               '<code>reboot: Power down</code> — kernel đã tắt gọn gàng và QEMU trả bạn về ' +
               'dấu nhắc WSL. <b>Con số 17,8 giây sẽ khác trên máy bạn</b>: nó đếm từ lúc boot ' +
               'tới lúc bạn gõ <code>poweroff</code>, tức là phụ thuộc bạn gõ nhanh hay chậm. ' +
               'Nếu máy ảo treo và không nhận lệnh, lối thoát vẫn là <b>Ctrl-A</b> rồi ' +
               '<b>X</b> như Bài 32.' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Hai kỹ năng dọn nhà: build tăng dần và biến <code>O=</code>',
        blocks: [

          { t: 'p', x:
            'Bạn đã có <code>Image</code>, có 1 423 module, đã boot thành công. Còn hai việc ' +
            'mà mọi người làm kernel đều phải biết, và cả hai đều nhằm một mục đích: ' +
            '<b>không bao giờ phải chờ 39 phút nữa</b>.' },

          { t: 'h4', x: 'Sửa một dòng, build lần hai mất bao lâu?' },

          { t: 'p', x:
            'Trong công việc thật bạn sẽ sửa một file rồi build lại, hàng chục lần một ngày. ' +
            'Hãy mô phỏng bằng <code>touch</code> — lệnh này chỉ cập nhật mốc <b>mtime</b> mà ' +
            'bạn đã gặp ở bước 2, không đổi một byte nội dung, nhưng <code>make</code> thì ' +
            'không phân biệt được: với nó, file mới hơn nghĩa là file đã thay đổi. Chọn đúng ' +
            'file driver UART mà cả bài này xoay quanh:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'cat .version\n' +
            'touch drivers/tty/serial/amba-pl011.c\n' +
            "TIMEFORMAT='REAL %3lR  USER %3lU  SYS %3lS'\n" +
            'time make -j6 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- Image \\\n' +
            '  > ~/bai40-logs/incr.log 2>&1\n' +
            'cat .version' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3\n' +
            'REAL 0m36.390s  USER 0m47.046s  SYS 0m25.922s\n' +
            '4' },

          { t: 'p', x:
            '<b>36,4 giây thay vì 1 110,8 giây — nhanh gấp 30,5 lần.</b> Còn hai con số ' +
            '<code>.version</code> kẹp hai đầu: máy viết bài đã link thêm vài lần khi thử ' +
            'nghiệm nên ở đây là <b>3 → 4</b>; nếu bạn làm tuần tự từ bước 1 thì sẽ là ' +
            '<b>1 → 2</b>. Thứ duy nhất phải giống nhau là <b>nó tăng đúng 1</b> — bạn vừa ' +
            'link <code>vmlinux</code> thêm một lần.' },

          { t: 'cal', kind: 'info', title: 'Tỉ lệ song song tụt xuống <b>2,00</b> — và đó là điều phải xảy ra',
            x: '(47,046 + 25,922) ÷ 36,390 = <b>2,00</b> trên 6 nhân, so với 5,83 của lần build ' +
               '<code>Image</code> đầy đủ và 5,91 của <code>modules</code>. Vì sao tệ thế? Vì ' +
               'lần này chỉ có <b>một</b> file <code>.c</code> cần dịch — phần còn lại toàn là ' +
               '<code>AR</code> và <code>LD</code>, mà link thì <b>không chia nhỏ cho nhiều ' +
               'nhân được</b>: muốn gộp mọi thứ thành một file, bạn phải có đủ mọi thứ trước ' +
               'đã. Đây là lý do một máy 32 nhân <i>không</i> làm vòng lặp sửa–build–thử nhanh ' +
               'hơn máy 6 nhân bao nhiêu, dù nó rút ngắn lần build đầu tiên rất nhiều. Muốn ' +
               'vòng lặp nhanh hơn thì phải nhắm vào chuỗi link, không phải mua thêm nhân.' },

          { t: 'p', x:
            'Log của lần build này chỉ có <b>28 dòng</b> — vừa đúng một màn hình, và nó chính ' +
            'là toàn bộ dây chuyền ở phần lý thuyết, thu nhỏ lại:' },

          { t: 'code', where: 'wsl', code: 'cat ~/bai40-logs/incr.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CALL    scripts/checksyscalls.sh\n' +
            '  CC      drivers/tty/serial/amba-pl011.o\n' +
            '  AR      drivers/tty/serial/built-in.a\n' +
            '  AR      drivers/tty/built-in.a\n' +
            '  AR      drivers/built-in.a\n' +
            '  AR      built-in.a\n' +
            '  AR      vmlinux.a\n' +
            '  LD      vmlinux.o\n' +
            '  MODPOST vmlinux.symvers\n' +
            '  UPD     include/generated/utsversion.h\n' +
            '  CC      init/version-timestamp.o\n' +
            '  KSYMS   .tmp_vmlinux0.kallsyms.S\n' +
            '  AS      .tmp_vmlinux0.kallsyms.o\n' +
            '  LD      .tmp_vmlinux1\n' +
            '  NM      .tmp_vmlinux1.syms\n' +
            '  KSYMS   .tmp_vmlinux1.kallsyms.S\n' +
            '  AS      .tmp_vmlinux1.kallsyms.o\n' +
            '  LD      .tmp_vmlinux2\n' +
            '  NM      .tmp_vmlinux2.syms\n' +
            '  KSYMS   .tmp_vmlinux2.kallsyms.S\n' +
            '  AS      .tmp_vmlinux2.kallsyms.o\n' +
            '  LD      vmlinux.unstripped\n' +
            '  NM      System.map\n' +
            '  SORTTAB vmlinux.unstripped\n' +
            '  OBJCOPY vmlinux\n' +
            '  GEN     modules.builtin.modinfo\n' +
            '  GEN     modules.builtin\n' +
            '  OBJCOPY arch/arm64/boot/Image' },

          { t: 'cal', kind: 'why', title: 'Đọc 28 dòng này là hiểu toàn bộ Kbuild',
            x: '<b>Dòng 2–7 — leo ngược cây thư mục.</b> Một file <code>.c</code> đổi, nên ' +
               '<code>amba-pl011.o</code> phải dịch lại; nó nằm trong ' +
               '<code>drivers/tty/serial/built-in.a</code>, thư viện đó nằm trong ' +
               '<code>drivers/tty/built-in.a</code>, cứ thế lên tới <code>vmlinux.a</code>. ' +
               'Đây chính là <b>recursive make</b> mà phần lý thuyết mô tả — bạn đang nhìn nó ' +
               'chạy ngược từ lá về gốc, và đó cũng là lý do một file thay đổi kéo theo cả ' +
               'chuỗi <code>AR</code>.<br>' +
               '<b>Dòng 10–11 — số <code>#4</code> được đóng vào kernel.</b> ' +
               '<code>UPD utsversion.h</code> ghi lại số build mới, rồi ' +
               '<code>version-timestamp.o</code> dịch nó thành mã máy. Đó là lý do lúc chạy ' +
               '<code>uname -a</code> đọc được con số đó — nó nằm sẵn trong <code>Image</code> ' +
               'từ lúc build.<br>' +
               '<b>Dòng 12–21 — ba vòng <code>kallsyms</code>.</b> Đếm mà xem: ' +
               '<code>.tmp_vmlinux0</code>, <code>1</code>, <code>2</code> — đúng ba lượt ' +
               '<code>KSYMS</code> → <code>AS</code> → <code>LD</code>. Bảng ký hiệu nằm ' +
               '<i>trong</i> chính file mà nó mô tả, nên thêm bảng vào là địa chỉ mọi thứ dịch ' +
               'đi, phải link lại rồi làm bảng lại. Ba vòng là đủ để hội tụ. Mười dòng này ' +
               'chạy nối đuôi nhau trên <i>một</i> nhân — chúng là thủ phạm của tỉ lệ 2,00 ở ' +
               'trên.<br>' +
               '<b>Dòng 23, 25, 28 — ba sản phẩm của bước 3.</b> <code>NM</code> đẻ ra ' +
               '<code>System.map</code>, <code>OBJCOPY</code> lần một đẻ ra ' +
               '<code>vmlinux</code>, <code>OBJCOPY</code> lần hai lột ELF thành ' +
               '<code>Image</code>. Ba file bạn đã mổ, ba dòng log.' },

          { t: 'h4', x: 'Cây nguồn của bạn giờ nặng 4,6 GB' },

          { t: 'code', where: 'wsl', code: 'du -sh ~/bai38/linux-6.18.45' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4.6G\t/home/shinarus/bai38/linux-6.18.45' },

          { t: 'p', x:
            'Một cây nguồn vừa giải nén chỉ nặng <b>1,7 GB</b> — bạn sẽ đo lại ngay dưới đây. ' +
            'Nghĩa là <b>2,9 GB</b> file sinh ra đang nằm <i>trộn lẫn</i> giữa file nguồn: mỗi ' +
            'thư mục có <code>.c</code> giờ có thêm <code>.o</code>, <code>.cmd</code>, ' +
            '<code>built-in.a</code>. Phần lý thuyết đã giới thiệu cách tránh chuyện này — ' +
            'biến <code>O=</code>. Thử áp dụng ngay bây giờ xem sao:' },

          { t: 'code', where: 'wsl', code:
            'make O=~/bai40/kbuild ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            "make[1]: Entering directory '/home/shinarus/bai40/kbuild'\n" +
            '***\n' +
            "*** The source tree is not clean, please run 'make ARCH=arm64 mrproper'\n" +
            '*** in /home/shinarus/bai38/linux-6.18.45\n' +
            '***\n' +
            'make[2]: *** [/home/shinarus/bai38/linux-6.18.45/Makefile:697: outputmakefile] Error 1\n' +
            'make[1]: *** [/home/shinarus/bai38/linux-6.18.45/Makefile:248: __sub-make] Error 2\n' +
            "make[1]: Leaving directory '/home/shinarus/bai40/kbuild'\n" +
            'make: *** [Makefile:248: __sub-make] Error 2' },

          { t: 'p', x:
            'Bị từ chối ngay ở target <code>outputmakefile</code>. Kbuild kiểm <b>ba</b> dấu ' +
            'hiệu trước khi chấp nhận <code>O=</code>, và chỉ cần <i>một</i> trong ba tồn tại ' +
            'là nó dừng. Xem cả ba đều đang có mặt trong cây nguồn của bạn:' },

          { t: 'code', where: 'wsl', code:
            'ls -d .config include/config arch/arm64/include/generated' },

          { t: 'code', where: 'out', nocopy: true, code:
            '.config\n' +
            'arch/arm64/include/generated\n' +
            'include/config' },

          { t: 'p', x:
            'Đủ cả ba, nên lời từ chối là chính xác. Một chi tiết nhỏ đáng để ý: thư mục ' +
            '<code>~/bai40/kbuild</code> <i>vẫn được tạo ra</i>, chỉ là rỗng — dòng ' +
            '<code>Entering directory</code> ở đầu thông báo lỗi chính là bằng chứng. ' +
            '<code>make</code> tạo thư mục đích trước, rồi mới đi kiểm cây nguồn.' },

          { t: 'cal', kind: 'warn', title: '<code>O=</code> phải chọn <b>trước</b> lần build đầu tiên',
            x: 'Đây là bài học thật sự của bước này, và nó là một quyết định <b>không quay đầu ' +
               'được</b> nếu bạn không muốn build lại từ đầu. Lý do Kbuild từ chối rất chính ' +
               'đáng: nếu cho phép, một lần build sẽ trộn file mới ở ' +
               '<code>~/bai40/kbuild</code> với file cũ còn sót trong cây nguồn — cùng một ' +
               'tên <code>.o</code> ở hai nơi, cái nào thắng thì tuỳ luật Makefile — và bạn ' +
               'được một kernel không ai giải thích nổi. Thà từ chối thẳng còn hơn.' },

          { t: 'cal', kind: 'danger', title: 'Đừng chạy <code>mrproper</code> trên cây này',
            x: 'Thông báo lỗi bảo bạn chạy <code>make ARCH=arm64 mrproper</code>. ' +
               '<b>Đừng.</b> <code>mrproper</code> xoá sạch mọi thứ do build sinh ra — nghĩa ' +
               'là xoá luôn 2,9 GB và <b>39 phút</b> bạn vừa bỏ ra, kể cả <code>Image</code>, ' +
               '<code>.config</code> có <code>-embedded</code> và 1 423 module. Chặng 08 đến ' +
               'Chặng 10 còn dùng cây build này. Muốn thấy <code>O=</code> chạy thật thì làm ' +
               'điều mà một kỹ sư sẽ làm: <b>thí nghiệm trên một bản nháp.</b>' },

          { t: 'h4', x: 'Một bản nháp để thí nghiệm cho thoải mái' },

          { t: 'p', x:
            'Giải nén thêm một cây nguồn thứ hai từ đúng file <code>.tar.xz</code> bạn đã tải ' +
            'về ở Bài 38 — file đó vẫn còn, không phải tải lại. Tốn thêm vài phút và 1,7 GB ' +
            'đĩa, đổi lại bạn được phá thoải mái:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai40/otest\n' +
            'cd ~/bai40/otest\n' +
            'tar -xf ~/bai38/linux-6.18.45.tar.xz\n' +
            'du -sh ~/bai40/otest/linux-6.18.45' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1.7G\t/home/shinarus/bai40/otest/linux-6.18.45' },

          { t: 'p', x:
            '<b>1,7 GB</b> — con số để đặt cạnh 4,6 GB ở trên, và <b>2,9 GB</b> chênh lệch đó ' +
            'chính là thứ <code>O=</code> sinh ra để tách riêng. Nhưng trước khi dùng bản nháp ' +
            'cho <code>O=</code>, hãy tận dụng nó để xem một kiểu hỏng mà bước 1 <i>không</i> ' +
            'cho bạn thấy. Ở bước 1, <b>quên</b> <code>CROSS_COMPILE</code> thì Kbuild im lặng ' +
            'đi tiếp với <code>gcc</code> bản địa. Còn <b>gõ sai</b> tên tiền tố thì sao?' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai40/otest/linux-6.18.45\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu-15- defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make[1]: aarch64-linux-gnu-15-gcc: No such file or directory\n' +
            '  HOSTCC  scripts/basic/fixdep\n' +
            '  HOSTCC  scripts/kconfig/conf.o\n' +
            '  HOSTCC  scripts/kconfig/confdata.o\n' +
            '  HOSTCC  scripts/kconfig/expr.o\n' +
            '  LEX     scripts/kconfig/lexer.lex.c\n' +
            '  YACC    scripts/kconfig/parser.tab.[ch]\n' +
            '  HOSTCC  scripts/kconfig/lexer.lex.o\n' +
            '  HOSTCC  scripts/kconfig/menu.o\n' +
            '  HOSTCC  scripts/kconfig/parser.tab.o\n' +
            '  HOSTCC  scripts/kconfig/preprocess.o\n' +
            '  HOSTCC  scripts/kconfig/symbol.o\n' +
            '  HOSTCC  scripts/kconfig/util.o\n' +
            '  HOSTLD  scripts/kconfig/conf\n' +
            "*** Default configuration is based on 'defconfig'\n" +
            "scripts/Kconfig.include:40: C compiler 'aarch64-linux-gnu-15-gcc' not found\n" +
            'make[2]: *** [scripts/kconfig/Makefile:95: defconfig] Error 1\n' +
            'make[1]: *** [/home/shinarus/bai40/otest/linux-6.18.45/Makefile:754: defconfig] Error 2\n' +
            'make: *** [Makefile:248: __sub-make] Error 2' },

          { t: 'p', x:
            'Ba chi tiết trong 19 dòng này. <b>Dòng đầu tiên</b> đã báo hỏng ngay — ' +
            '<code>make</code> thử gọi <code>aarch64-linux-gnu-15-gcc</code> để dò phiên bản ' +
            'và không tìm thấy. <b>Mười ba dòng <code>HOSTCC</code> ở giữa</b> vẫn chạy bình ' +
            'thường, vì chúng dịch bộ công cụ <code>conf</code> của Kconfig <i>cho máy chủ</i> ' +
            'bằng <code>gcc</code> bản địa — đúng như Bài 39 đã nói, <code>conf</code> là một ' +
            'chương trình x86-64 chạy trên máy bạn, không liên quan gì tới ARM64. Đến khi ' +
            '<code>conf</code> thật sự cần trình biên dịch chéo để đánh giá các điều kiện ' +
            'trong file <code>Kconfig</code>, nó mới dừng ở <b>dòng ' +
            '<code>scripts/Kconfig.include:40</code></b> và nói thẳng cái tên nó không tìm ' +
            'thấy.' },

          { t: 'cal', kind: 'why', title: 'Hai kiểu sai <code>CROSS_COMPILE</code>, hai hậu quả trái ngược',
            x: '<b>Gõ sai tên</b> → <code>C compiler … not found</code>, dừng sau vài giây, ' +
               'không mất phút build nào. Dễ chịu, vì <code>$(CROSS_COMPILE)gcc</code> ghép ra ' +
               'một cái tên không tồn tại trên máy.<br>' +
               '<b>Quên hẳn</b> → <code>$(CROSS_COMPILE)gcc</code> rút gọn thành ' +
               '<code>gcc</code>, mà <code>gcc</code> thì <i>có thật</i>. Kbuild vui vẻ đem nó ' +
               'đi thử mọi tính năng ARM64, thấy cái nào cũng không đỡ được, tắt hết, rồi đi ' +
               'tiếp không một lời cảnh báo — đúng như bạn đã đo ở bước 1.<br>' +
               '<b>Nghịch lý cần nhớ: lỗi ồn ào thì vô hại, lỗi im lặng mới tốn 18 phút.</b> ' +
               'Đó là toàn bộ lý do bước 1 bắt bạn <code>grep CONFIG_CC_VERSION_TEXT</code> ' +
               'trước khi build.' },

          { t: 'p', x:
            'Lần chạy hỏng đó để lại rác trong cây nháp — chính là mấy chục file ' +
            '<code>scripts/basic/*</code> và <code>scripts/kconfig/*</code> vừa dịch, đủ để ' +
            'Kbuild coi cây này là "không sạch". Đây là lúc dùng <code>mrproper</code> đúng ' +
            'chỗ, trên đúng cây:' },

          { t: 'code', where: 'wsl', code:
            "TIMEFORMAT='REAL %3lR  USER %3lU  SYS %3lS'\n" +
            'time make ARCH=arm64 mrproper' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CLEAN   scripts/basic\n' +
            '  CLEAN   scripts/kconfig\n' +
            'REAL 0m3.163s  USER 0m2.423s  SYS 0m0.526s' },

          { t: 'p', x:
            'Đúng <b>hai dòng <code>CLEAN</code></b> và <b>3,2 giây</b> — vì cây nháp mới bẩn ' +
            'ở hai chỗ, đúng hai thư mục vừa xuất hiện trong log lỗi ở trên. Trên cây build ' +
            'thật của bạn, cùng một lệnh này sẽ in một danh sách rất dài và cuốn phăng 2,9 GB ' +
            'cũng chỉ trong vài giây. Giờ thì bạn hiểu vì sao lời cảnh báo phía trên nghiêm ' +
            'túc đến thế: <code>mrproper</code> nhanh, gọn, và không hỏi lại.' },

          { t: 'cmdx', title: 'Ba mức dọn dẹp của Kbuild, chọn đúng mức bạn cần',
            cmd: 'make ARCH=arm64 mrproper',
            rows: [
              ['<code>clean</code>',
               'Xoá file <code>.o</code>, <code>.a</code> và các sản phẩm build, ' +
               '<b>giữ lại <code>.config</code></b>. Dùng khi muốn build lại từ đầu nhưng ' +
               'không muốn cấu hình lại.'],
              ['<code>mrproper</code>',
               'Làm mọi thứ <code>clean</code> làm, <b>cộng thêm</b> xoá <code>.config</code>, ' +
               '<code>include/config/</code> và mọi file sinh ra. Đưa cây nguồn về đúng trạng ' +
               'thái vừa giải nén — đây là mức mà <code>O=</code> đòi hỏi.'],
              ['<code>distclean</code>',
               'Làm mọi thứ <code>mrproper</code> làm, cộng thêm xoá file sao lưu của trình ' +
               'soạn thảo và file vá. Hầu như chỉ người phát triển kernel mới dùng tới.'],
              ['<code>ARCH=arm64</code>',
               'Vẫn phải giữ. Có kiến trúc thì <code>make</code> mới biết cần xoá thêm ' +
               '<code>arch/arm64/include/generated</code> — thiếu nó, thư mục này sót lại và ' +
               '<code>O=</code> vẫn từ chối.']
            ] },

          { t: 'p', x: 'Cây nháp đã sạch. Bây giờ <code>O=</code> sẽ chạy được:' },

          { t: 'code', where: 'wsl', code:
            'rm -rf ~/bai40/kbuild\n' +
            'time make O=~/bai40/kbuild ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig' },

          { t: 'code', where: 'out', nocopy: true, name: 'Sáu dòng cuối', code:
            "*** Default configuration is based on 'defconfig'\n" +
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            "make[1]: Leaving directory '/home/shinarus/bai40/kbuild'\n" +
            'REAL 0m4.467s  USER 0m3.058s  SYS 0m0.578s' },

          { t: 'p', x:
            'Chạy trơn trong <b>4,5 giây</b>, và câu <code>configuration written to ' +
            '.config</code> giống hệt bước 1. Câu hỏi quan trọng: <code>.config</code> đó nằm ' +
            'ở đâu? Kiểm cây nguồn trước — vẫn đúng ba dấu hiệu mà Kbuild đã soi lúc nãy:' },

          { t: 'code', where: 'wsl', code:
            'ls -d .config include/config arch/arm64/include/generated\n' +
            'find . -name "*.o" -o -name ".config" -o -name "*.cmd" | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            "ls: cannot access '.config': No such file or directory\n" +
            "ls: cannot access 'include/config': No such file or directory\n" +
            "ls: cannot access 'arch/arm64/include/generated': No such file or directory\n" +
            '0' },

          { t: 'p', x:
            'Ba lần <i>không tồn tại</i>, và <code>find</code> đếm được <b>0</b> file sinh ra ' +
            'trong toàn bộ cây nguồn. Cây nháp sạch <i>y hệt lúc vừa giải nén</i>, dù bạn vừa ' +
            'chạy <code>defconfig</code> trên nó. Vậy mọi thứ đi đâu?' },

          { t: 'code', where: 'wsl', code:
            'ls -1 ~/bai40/kbuild\n' +
            'du -sh ~/bai40/kbuild' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Makefile\n' +
            'include\n' +
            'scripts\n' +
            'source\n' +
            '1.8M\t/home/shinarus/bai40/kbuild' },

          { t: 'p', x:
            'Bốn mục, <b>1,8 MB</b>. Hai trong số đó — <code>include</code> và ' +
            '<code>scripts</code> — là nơi <code>.config</code>, <code>auto.conf</code>, ' +
            '<code>autoconf.h</code> và bộ công cụ host vừa dịch sẽ sống; sau một lần build ' +
            'đầy đủ chúng sẽ phình lên khoảng 3 GB, nhưng 3 GB đó nằm gọn <i>ở đây</i>. Hai ' +
            'mục còn lại mới là cơ chế thật sự, và bạn xem được cả hai:' },

          { t: 'code', where: 'wsl', code:
            'cat ~/bai40/kbuild/Makefile\n' +
            'ls -l ~/bai40/kbuild/source' },

          { t: 'code', where: 'out', nocopy: true, code:
            "# Automatically generated by /home/shinarus/bai40/otest/linux-6.18.45/Makefile: don't edit\n" +
            'export KBUILD_OUTPUT = /home/shinarus/bai40/kbuild\n' +
            'include /home/shinarus/bai40/otest/linux-6.18.45/Makefile\n' +
            'lrwxrwxrwx 1 shinarus shinarus 40 Aug 27 22:38 ' +
            '/home/shinarus/bai40/kbuild/source -> /home/shinarus/bai40/otest/linux-6.18.45' },

          { t: 'cal', kind: 'why', title: 'Ba dòng Makefile — đó là toàn bộ cơ chế của <code>O=</code>',
            x: '<b>Dòng 2</b> đặt <code>KBUILD_OUTPUT</code> thành chính thư mục này. ' +
               '<b>Dòng 3</b> <code>include</code> thẳng Makefile gốc của kernel. Kết quả: từ ' +
               'lần sau bạn chỉ cần <code>cd ~/bai40/kbuild &amp;&amp; make ARCH=arm64 ' +
               'CROSS_COMPILE=aarch64-linux-gnu- Image</code> — <b>khỏi gõ lại ' +
               '<code>O=</code></b>, vì Makefile ba dòng này nhớ hộ bạn rồi.<br>' +
               '<b>Symlink <code>source</code></b> trỏ ngược về cây nguồn, để mọi script chạy ' +
               'trong thư mục build luôn tìm được nguồn dù nó nằm ở đâu. Ngày giờ trong dòng ' +
               '<code>ls -l</code> tất nhiên sẽ khác trên máy bạn.<br>' +
               'Đây là cách mọi hệ thống build chuyên nghiệp làm việc: Yocto, Buildroot và các ' +
               'hệ thống CI đều dựng kernel theo kiểu này, để <b>một</b> cây nguồn phục vụ ' +
               'được <b>nhiều</b> cấu hình cùng lúc — mỗi cấu hình một thư mục <code>O=</code> ' +
               'riêng, không cái nào đụng cái nào. Chặng 11 sẽ cho bạn thấy tận mắt.' },

          { t: 'p', x:
            'Xong thí nghiệm. Dọn bản nháp đi cho nhẹ đĩa — <b>chỉ xoá đúng hai thư mục ' +
            'này</b>, tuyệt đối không đụng vào <code>~/bai38</code>:' },

          { t: 'code', where: 'wsl', code:
            'rm -rf ~/bai40/otest ~/bai40/kbuild\n' +
            'du -sh ~/bai40' },

          { t: 'code', where: 'out', nocopy: true, code:
            '404M\t/home/shinarus/bai40' },

          { t: 'p', x:
            '<b>404 MB</b> còn lại là hai thư mục module ở bước 4 — <code>modroot</code> ' +
            '325 MB và <code>modroot-stripped</code> 80 MB. Giữ chúng lại: Chặng 09 sẽ đem ' +
            'thư mục stripped đó nhét vào root filesystem thật, và đó là lúc lệnh ' +
            '<code>ls /lib/modules</code> vừa thất bại trong QEMU sẽ trả lời được.' }
        ]}
    ]},

    /* ============================================================
       7. Lỗi thường gặp
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Tất cả những dòng dưới đây đều đã xuất hiện thật trong lúc dựng bài này. Cột giữa mới ' +
      'là thứ đáng đọc: hầu hết lỗi build kernel không nói thẳng nguyên nhân, chúng chỉ báo ' +
      'target nào chết.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<i>(Không có thông báo nào)</i> nhưng <code>grep CONFIG_CC_VERSION_TEXT .config</code> ' +
         'in ra <code>gcc (Ubuntu …)</code> thay vì <code>aarch64-linux-gnu-gcc</code>',
         'Quên <code>CROSS_COMPILE=</code>. <code>$(CROSS_COMPILE)gcc</code> rút gọn thành ' +
         '<code>gcc</code> — một chương trình <i>có thật</i>, nên Kbuild không báo gì, chỉ ' +
         'lặng lẽ tắt khoảng 15 tính năng ARM64.',
         'Chạy lại <code>make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig</code>. ' +
         'Luôn <code>grep CONFIG_CC_VERSION_TEXT .config</code> ngay sau <code>defconfig</code>, ' +
         '<b>trước</b> khi bỏ ra 18 phút build.'],

        ["<code>scripts/Kconfig.include:40: C compiler 'aarch64-linux-gnu-15-gcc' not found</code>",
         'Gõ sai tiền tố <code>CROSS_COMPILE</code>. Khác hẳn trường hợp trên: cái tên ghép ra ' +
         'không tồn tại nên Kbuild dừng ngay, không tốn phút nào.',
         'Xem lại tiền tố. <code>ls /usr/bin/aarch64-linux-gnu-*</code> liệt kê đúng những tiền ' +
         'tố có trên máy; nhớ dấu <code>-</code> ở cuối.'],

        ["<code>*** The source tree is not clean, please run 'make ARCH=arm64 mrproper'</code>",
         'Bạn dùng <code>O=</code> trên một cây nguồn đã từng build trong cây. Kbuild thấy ' +
         '<code>.config</code>, <code>include/config</code> hoặc ' +
         '<code>arch/arm64/include/generated</code> nên từ chối để khỏi trộn hai bộ file.',
         'Hoặc bỏ <code>O=</code> và build tiếp trong cây, hoặc <code>make ARCH=arm64 ' +
         'mrproper</code> rồi bắt đầu lại — <b>nhớ rằng <code>mrproper</code> xoá sạch cả ' +
         'lần build 39 phút trước đó</b>. Giải nén một cây nháp thứ hai là lựa chọn an toàn.'],

        ['<code>make</code> chạy 18 phút rồi kết thúc mà <b>không</b> có ' +
         '<code>arch/arm64/boot/Image</code>',
         'Bạn gõ <code>make</code> không kèm target. Trên ARM64 target mặc định là ' +
         '<code>vmlinux</code> cộng <code>modules</code>, <b>không</b> gồm <code>Image</code>.',
         'Luôn nêu target rõ ràng: <code>make -j6 ARCH=arm64 CROSS_COMPILE=… Image</code>. ' +
         'Đây là điểm khác biệt lớn nhất so với x86, nơi <code>make</code> trần cho luôn ' +
         '<code>bzImage</code>.'],

        ['<code>mkdir: cannot create directory ‘/lib/modules/6.18.45-embedded’: Permission ' +
         'denied</code>',
         '<code>make modules_install</code> mặc định cài vào <code>/lib/modules</code> của ' +
         '<b>máy WSL</b> — tức là cài module ARM64 đè lên hệ điều hành x86-64 bạn đang chạy.',
         'Không dùng <code>sudo</code>. Thêm ' +
         '<code>INSTALL_MOD_PATH=~/bai40/modroot</code> để mọi thứ rơi vào một thư mục staging ' +
         'của riêng bạn. Lỗi này đang bảo vệ bạn.'],

        ['<code>make kernelrelease</code> in <code>6.18.45</code> dù <code>.config</code> đã có ' +
         '<code>CONFIG_LOCALVERSION="-embedded"</code>',
         '<code>kernelrelease</code> nằm trong nhóm <code>no-sync-config-targets</code> nên nó ' +
         'đọc <code>include/config/auto.conf</code> cũ chứ không đọc <code>.config</code>.',
         'Chạy <code>make ARCH=arm64 CROSS_COMPILE=… syncconfig</code> rồi hỏi lại. Một lệnh ' +
         'build bình thường tự làm bước này, nên hậu tố vẫn sẽ đúng khi build thật.'],

        ['QEMU mở ra nhưng màn hình đứng im, không có một dòng kernel nào',
         'Thiếu <code>console=ttyAMA0</code> trong <code>-append</code>, hoặc thiếu ' +
         '<code>-nographic</code>. Kernel vẫn chạy, chỉ là nó đang nói vào một console mà bạn ' +
         'không nhìn thấy.',
         'Dùng đúng dòng lệnh ở bước 5. Thoát QEMU bằng <b>Ctrl-A</b> rồi <b>X</b> như Bài 32.'],

        ['<code>ls: /lib/modules: No such file or directory</code> khi chạy trong QEMU',
         'Không phải lỗi. <code>Image</code> và <code>.ko</code> là hai sản phẩm rời; initramfs ' +
         'BusyBox của Bài 32 không chứa module nào cả.',
         'Bình thường — mọi driver mà kernel này thật sự cần đều là <code>obj-y</code>, nằm ' +
         'sẵn trong <code>Image</code>. Chặng 09 sẽ dạy cách nhét ' +
         '<code>modroot-stripped</code> vào root filesystem.'],

        ['Build chậm bất thường, tỉ lệ <code>(user+sys)/real</code> chỉ khoảng 2 trên máy 8 nhân',
         'Nút thắt cổ chai không nằm ở CPU: hết RAM và đang swap, hoặc cây nguồn đặt trong ' +
         '<code>/mnt/c</code>.',
         'Kiểm bằng <code>free -h</code> và <code>df -h .</code>. Cây nguồn <b>phải</b> nằm ' +
         'trong <code>~</code> của WSL, không bao giờ trong <code>/mnt/c</code> — Bài 3 đã đo ' +
         'cái giá đó. Nếu thiếu RAM thì hạ <code>-j6</code> xuống <code>-j4</code>.']
      ] },

    /* ============================================================
       8. Recap
       ============================================================ */
    { t: 'recap', title: 'Tóm tắt Bài 40', items: [
      '<b><code>ARCH</code> chọn thư mục <code>arch/</code>, <code>CROSS_COMPILE</code> chọn ' +
        'tiền tố toolchain.</b> Cả hai phải có mặt ở <i>mọi</i> lệnh <code>make</code>, kể cả ' +
        '<code>defconfig</code> — vì Kconfig <b>hỏi trình biên dịch</b> trước khi bật một ' +
        'tính năng. Quên nó, <code>.config</code> lệch <b>19</b> dòng và <b>15</b> tính năng ' +
        'ARM64 — MTE, pointer authentication, shadow call stack — biến mất, không ai báo bạn.',

      '<b>Dây chuyền: <code>.c</code> → <code>.o</code> → <code>built-in.a</code> → ' +
        '<code>vmlinux.a</code> → <code>vmlinux</code> → <code>Image</code>.</b> ' +
        '<code>vmlinux</code> là ELF <b>157 MB</b> có debug info; <code>objcopy -O binary ' +
        '-S</code> lột hết vỏ ELF và DWARF còn <b>41 MB</b> — nhỏ hơn <b>3,82 lần</b>. ' +
        'Bootloader nạp <code>Image</code>, không nạp <code>vmlinux</code>.',

      '<b>Trên ARM64, <code>make</code> trần không cho bạn <code>Image</code>.</b> Ba target ' +
        'phải gọi tên: <code>Image</code> (18,5 phút), <code>dtbs</code> (13,8 giây, ' +
        '<b>1 577</b> file <code>.dtb</code>), <code>modules</code> (20,6 phút, <b>1 423</b> ' +
        'file <code>.ko</code>). Module tốn <b>nhiều</b> thời gian hơn cả kernel.',

      '<b>Giá thật trên 6 nhân:</b> 39 phút đồng hồ cho cả ba target, tỉ lệ song song ' +
        '<b>5,83</b> và <b>5,91</b> — tức 97 %, gần kịch trần. Cây nguồn phình từ <b>1,7 GB</b> ' +
        'lên <b>4,6 GB</b>. Build lại sau khi sửa một file chỉ mất <b>36 giây</b> — nhanh gấp ' +
        '<b>30,5 lần</b> — nhưng tỉ lệ song song tụt xuống <b>2,00</b> vì chuỗi link ' +
        '<code>kallsyms</code> ba vòng chạy trên một nhân.',

      '<b><code>.config</code> chỉ là văn bản; thứ build đọc là ' +
        '<code>include/config/auto.conf</code>.</b> Nhóm <code>no-sync-config-targets</code> ' +
        '(<code>kernelrelease</code>, <code>help</code>…) bỏ qua bước đồng bộ nên có thể trả ' +
        'lời theo dữ liệu cũ. <code>syncconfig</code> là lệnh kéo hai file về khớp nhau.',

      '<b><code>O=</code> tách sản phẩm ra khỏi cây nguồn, nhưng phải chọn từ đầu.</b> Kbuild ' +
        'kiểm ba dấu hiệu (<code>.config</code>, <code>include/config</code>, ' +
        '<code>arch/arm64/include/generated</code>) và từ chối nếu cây nguồn không sạch. ' +
        'Thư mục <code>O=</code> chứa một Makefile <b>ba dòng</b> tự sinh và một symlink ' +
        '<code>source</code> — đó là toàn bộ cơ chế.',

      '<b>Module không đi theo kernel.</b> <code>Image</code> chứa mọi thứ <code>obj-y</code>; ' +
        '<b>1 423</b> file <code>.ko</code> là sản phẩm rời, phải cài riêng bằng ' +
        '<code>INSTALL_MOD_PATH=</code>. <code>INSTALL_MOD_STRIP=1</code> ép <b>325 MB</b> ' +
        'xuống <b>80 MB</b> — hệ số 4, đúng lý do khiến <code>vmlinux</code> to hơn ' +
        '<code>Image</code>.',

      '<b>Kernel của bạn đã boot thật.</b> <code>uname -a</code> trong QEMU in ' +
        '<code>6.18.45-embedded #2 … aarch64</code> — hậu tố bạn tự đặt ở bước 2, số build do ' +
        '<code>.version</code> đếm, kiến trúc do <code>ARCH=arm64</code> quyết định. Ba mảnh ' +
        'đó khép lại chuỗi Bài 38 → 39 → 40.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Ở bước 5 bạn gõ <code>-append "console=ttyAMA0 rdinit=/init"</code> và kernel in lại ' +
         'y nguyên dòng đó trong <code>Kernel command line:</code> — nhưng bài này chưa hề ' +
         'giải thích vì sao chuỗi ấy phải là <i>chính xác</i> như vậy, hay chuyện gì xảy ra ' +
         'nếu bạn viết <code>root=</code> thay cho <code>rdinit=</code>. <b>Bài 41</b> mổ ' +
         'chuỗi đó ra từng tham số: <code>console=</code>, <code>root=</code>, ' +
         '<code>init=</code>, <code>loglevel=</code> — thứ ngôn ngữ mà bootloader dùng để nói ' +
         'chuyện với kernel, và cũng là thứ bạn sẽ chỉnh nhiều nhất khi một board thật không ' +
         'chịu boot. Sau đó là <code>dmesg</code> cùng tám mức log, để bạn đọc được 268 dòng ' +
         'vừa trôi qua màn hình thay vì chỉ nhìn chúng chạy. Và cuối cùng là câu hỏi mà con ' +
         'số <b>41 MB</b> đặt ra: một <code>Image</code> chứa driver cho hàng nghìn board mà ' +
         'bạn không có thì to vô ích — Bài 41 sẽ cắt bỏ và đo lại xem nó xuống được bao nhiêu.' },
  ],

  quiz: [
    { q: 'Bạn chạy <code>make ARCH=arm64 defconfig</code> và quên mất <code>CROSS_COMPILE</code>. ' +
         'Kbuild không báo lỗi, không cảnh báo. Cách nhanh nhất để phát hiện sai lầm này trước ' +
         'khi tốn 18 phút build là gì?',
      opts: [
        'Chạy <code>grep CONFIG_CC_VERSION_TEXT .config</code> và xem tên trình biên dịch',
        'Cứ build đi, đến bước link sẽ có lỗi',
        'Chạy <code>file vmlinux</code> để xem kiến trúc',
        'Không có cách nào, phải nhớ mà gõ cho đúng'
      ],
      a: 0,
      why: 'Kconfig ghi lại <b>chính xác trình biên dịch nó đã đem đi thử</b> vào ' +
           '<code>CONFIG_CC_VERSION_TEXT</code>. Thấy <code>aarch64-linux-gnu-gcc</code> là ' +
           'đúng, thấy <code>gcc (Ubuntu …)</code> trần trụi là sai. Đáp án B sai vì đó chính ' +
           'là cái bẫy: kernel vẫn build xong, chỉ mất khoảng 15 tính năng ARM64 như MTE và ' +
           'pointer authentication mà không nói gì. Đáp án C thì phải chờ build xong mới có ' +
           '<code>vmlinux</code> để mà xem — quá muộn.' },

    { q: 'Trên máy đo trong bài, <code>vmlinux</code> nặng 157 MB còn <code>Image</code> chỉ ' +
         '41 MB. Nguyên nhân chính của khoảng chênh 3,82 lần đó là gì?',
      opts: [
        '<code>Image</code> đã được nén bằng gzip',
        '<code>objcopy -O binary -S</code> vứt bỏ thông tin gỡ lỗi DWARF, bảng ký hiệu và toàn bộ khung ELF',
        '<code>Image</code> bỏ phần <code>bss</code> ra ngoài, còn <code>vmlinux</code> thì giữ',
        '<code>vmlinux</code> chứa cả module <code>.ko</code>, <code>Image</code> thì không'
      ],
      a: 1,
      why: 'Lệnh <code>file vmlinux</code> in <code>with debug_info, not stripped</code> — đó ' +
           'là toàn bộ câu trả lời. Đáp án A mô tả <code>Image.gz</code>, một target khác. ' +
           'Đáp án C sai ở chỗ <b>cả hai</b> đều không chứa <code>bss</code> trong file; ' +
           '<code>bss</code> chỉ là con số 707 824 byte ghi trong header, và nó giải thích vì ' +
           'sao <code>Image</code> nhỏ hơn tổng <code>text+data+bss</code>, chứ không giải ' +
           'thích khoảng chênh 116 MB. Đáp án D sai vì module là những file <code>.ko</code> ' +
           'nằm rời, không bao giờ ở trong <code>vmlinux</code>.' },

    { q: '<code>.config</code> ghi rõ <code>CONFIG_LOCALVERSION="-embedded"</code>, bạn vừa ' +
         '<code>grep</code> thấy tận mắt, nhưng <code>make kernelrelease</code> vẫn in ' +
         '<code>6.18.45</code> không hậu tố. Vì sao?',
      opts: [
        '<code>scripts/config</code> đã ghi hỏng file <code>.config</code>',
        '<code>kernelrelease</code> nằm trong nhóm <code>no-sync-config-targets</code> nên đọc ' +
        '<code>include/config/auto.conf</code> cũ; phải chạy <code>syncconfig</code> trước',
        'Phải chạy <code>mrproper</code> rồi cấu hình lại từ đầu',
        '<code>LOCALVERSION</code> chỉ có tác dụng sau khi build xong <code>Image</code>'
      ],
      a: 1,
      why: 'Đây là bài học quan trọng nhất về Kbuild: <b><code>.config</code> chỉ là văn bản; ' +
           'thứ build thật sự đọc là <code>auto.conf</code></b>. Nhóm target “chỉ hỏi, không ' +
           'build” cố tình bỏ qua bước đồng bộ để trả lời cho nhanh, và cái giá là chúng có ' +
           'thể trả lời theo dữ liệu cũ. Một lệnh build bình thường như <code>make Image</code> ' +
           '<i>tự</i> chạy <code>syncconfig</code> nên đáp án D sai — hậu tố sẽ đúng ngay khi ' +
           'build, chỉ riêng câu hỏi <code>kernelrelease</code> là nói dối.' },

    { q: 'Bạn build kernel trên một máy 8 nhân với <code>-j8</code> và đo được ' +
         '(<code>user</code> + <code>sys</code>) ÷ <code>real</code> = <b>2,1</b>. Nguyên nhân ' +
         'khả dĩ nhất là gì?',
      opts: [
        'Bình thường, tỉ lệ đó luôn thấp hơn số nhân',
        'Có nút thắt cổ chai ngoài CPU — hết RAM và đang swap, hoặc đĩa quá chậm',
        '<code>-j8</code> quá cao, phải giảm xuống <code>-j4</code>',
        'Trình biên dịch chéo chậm hơn trình biên dịch bản địa'
      ],
      a: 1,
      why: 'Tỉ lệ đó cho biết <b>trung bình có bao nhiêu nhân thật sự bận</b> suốt lần build. ' +
           'Máy trong bài đạt 5,83 trên 6 nhân — tức 97 %, gần như kịch trần. Được 2,1 trên 8 ' +
           'nhân nghĩa là gần ba phần tư sức máy đang ngồi chờ một thứ gì đó <i>không phải ' +
           'CPU</i>: thường là swap hoặc đĩa. Đáp án C chữa nhầm bệnh — giảm <code>-j</code> ' +
           'chỉ giúp khi nguyên nhân là hết RAM, và ngay cả khi đó thì gốc vẫn là RAM chứ ' +
           'không phải con số <code>-j</code>.' },

    { q: 'Trên ARM64, file nào là thứ bootloader thật sự nạp và nhảy vào?',
      opts: [
        '<code>vmlinux</code>',
        '<code>arch/arm64/boot/Image</code>',
        '<code>vmlinux.o</code>',
        '<code>System.map</code>'
      ],
      a: 1,
      why: '<code>vmlinux</code> là file ELF — nó có header, có section, cần một bộ nạp biết ' +
           'đọc ELF, mà bootloader ở giai đoạn đó thì chưa có. <code>Image</code> ngược lại là ' +
           '<b>ảnh nhị phân thuần</b>: nạp vào RAM đúng địa chỉ rồi nhảy vào byte đầu tiên là ' +
           'chạy. Bốn byte <code>ARMd</code> ở offset 0x38 là chữ ký để bootloader kiểm trước ' +
           'khi nhảy. <code>System.map</code> chỉ là bảng tra tên hàm dạng văn bản, không ' +
           'phải mã máy.' },

    { q: 'Bạn gõ <code>make O=~/kbuild ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig</code> ' +
         'và nhận được <code>*** The source tree is not clean, please run \'make ARCH=arm64 ' +
         'mrproper\'</code>. Vì sao?',
      opts: [
        'Thư mục <code>~/kbuild</code> chưa tồn tại nên make không ghi được',
        'Cây nguồn còn <code>.config</code> hoặc thư mục sinh ra từ một lần build trong cây; ' +
        'phải <code>mrproper</code> rồi mới dùng được <code>O=</code>',
        'Biến <code>O=</code> không dùng được cùng <code>defconfig</code>',
        'Thiếu quyền, phải chạy bằng <code>sudo</code>'
      ],
      a: 1,
      why: 'Kbuild kiểm ba dấu hiệu: <code>.config</code> trong cây nguồn, thư mục ' +
           '<code>include/config</code>, và <code>arch/$(SRCARCH)/include/generated</code>. ' +
           'Chỉ cần <b>một</b> trong ba tồn tại là nó từ chối, vì nếu cho phép, một lần build ' +
           'sẽ trộn file mới ở <code>~/kbuild</code> với file cũ trong cây nguồn và bạn được ' +
           'một kernel không ai giải thích nổi. Đáp án A sai vì <code>O=</code> tự tạo thư mục; ' +
           'đáp án D sai vì lỗi này không liên quan gì đến quyền — thông báo nói thẳng ' +
           '<i>not clean</i>, không phải <i>permission denied</i>.' }
  ]
});

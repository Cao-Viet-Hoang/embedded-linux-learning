/* Bài 31 — Bộ tham số dòng lệnh QEMU
   Chặng 05 — QEMU và luồng khởi động */

Lesson.register({
  id: 'bai-31',
  title: 'Bộ tham số dòng lệnh QEMU',
  minutes: 60,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    '<p>Hai bài vừa rồi bạn đã gõ hàng chục dòng <code>qemu-system-aarch64 …</code> mà chưa ' +
    'bao giờ dừng lại hỏi: <b>từng tham số ấy làm gì?</b> Bài này trả lời câu hỏi đó, một lần, ' +
    'cho toàn bộ phần còn lại của khoá học.</p>' +
    '<p>Dòng lệnh QEMU trông đáng sợ vì nó dài. Nhưng nó không hỗn loạn: mọi tham số bạn sẽ ' +
    'dùng đều rơi vào đúng <b>bốn nhóm</b> — dựng cỗ máy, nạp phần mềm vào máy, nối máy ra thế ' +
    'giới bên ngoài, và điều khiển thời gian. Nhìn ra bốn nhóm ấy rồi thì một dòng lệnh 12 tham ' +
    'số đọc nhanh như một câu văn.</p>' +
    '<p>Bài này cố tình <b>làm hỏng</b> nhiều hơn làm chạy. Bạn sẽ thấy <code>-M virt</code> ' +
    'mặc định cho bạn một CPU <b>32 bit</b> và từ chối nạp chương trình ARM64 của Bài 30; sẽ ' +
    'thấy <code>-nographic</code> và <code>-monitor stdio</code> đánh nhau; sẽ thấy ' +
    '<code>-append</code> bị QEMU chặn khi thiếu <code>-kernel</code>. Mỗi thông báo lỗi ấy là ' +
    'một giờ bạn tiết kiệm được về sau.</p>' +
    '<p>Cuối bài là lời hứa của Bài 30: chính <code>hello.elf</code> — 105 byte mã ARM64 bạn tự ' +
    'viết — được dừng ngay tại lệnh đầu tiên bằng <code>-S</code>, mở cổng gỡ lỗi bằng ' +
    '<code>-s</code>, rồi <code>gdb-multiarch</code> nối vào cổng <b>1234</b> và chạy từng lệnh ' +
    'một. Bạn sẽ nhìn thấy <code>X1</code> nhận giá trị <code>0x09000000</code> <b>ngay trước ' +
    'mắt</b>, thay vì suy ra từ trạng thái cuối cùng.</p>',

  goals: [
    'Phân loại được mọi tham số QEMU vào bốn nhóm: dựng máy, nạp phần mềm, nối ra ngoài, điều khiển thời gian',
    'Chọn đúng <code>-M</code>, <code>-cpu</code>, <code>-m</code>, <code>-smp</code> và giải thích được vì sao thiếu <code>-cpu</code> là một cái bẫy',
    'Giải thích được mô hình <b>chardev</b> của QEMU và điều hướng cổng nối tiếp ra stdio, ra file, hoặc vứt đi',
    'Nêu được vai trò của <code>-kernel</code>, <code>-initrd</code>, <code>-append</code> và chứng minh chúng đi vào device tree',
    'Cắm được ổ đĩa ảo bằng <code>-drive</code> và card mạng ảo bằng <code>-netdev</code>, rồi kiểm chứng bằng monitor',
    'Dùng <code>-s -S</code> cùng <code>gdb-multiarch</code> để chạy từng lệnh máy một trong máy ảo',
    'Đọc và xử lý được bảy thông báo lỗi thường gặp nhất của dòng lệnh QEMU'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. BỐN NHÓM THAM SỐ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đọc một dòng lệnh QEMU' },

    { t: 'p', x:
      'Đây là dòng lệnh bạn sẽ dùng ở Bài 32 để boot một nhân Linux thật. Mười một tham số, ' +
      'trông rối, nhưng hãy thử đọc nó theo nhóm:' },

    { t: 'code', where: 'wsl', nocopy: true, code:
      'qemu-system-aarch64 \\\n' +
      '  -M virt -cpu cortex-a57 -m 512 -smp 1 \\\n' +
      '  -kernel Image -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" \\\n' +
      '  -nographic \\\n' +
      '  -s -S' },

    { t: 'p', x:
      'Dòng thứ nhất dựng <b>cỗ máy</b>. Dòng thứ hai nói <b>nạp cái gì</b> vào cỗ máy đó. Dòng ' +
      'thứ ba nối máy ra <b>terminal của bạn</b>. Dòng thứ tư <b>điều khiển thời gian</b>: dừng ' +
      'CPU lại và mở cổng gỡ lỗi. Bốn nhóm, bốn câu hỏi khác nhau.' },

    { t: 'fig', cap:
      'Mọi tham số QEMU bạn sẽ gặp đều rơi vào đúng một trong bốn nhóm này. Nhớ bốn câu hỏi ' +
      'thì không cần nhớ danh sách tham số.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Bốn nhóm tham số dòng lệnh QEMU: dựng máy, nạp phần mềm, nối ra ngoài, điều khiển thời gian">' +

      '<rect class="d-box-p" x="4" y="14" width="170" height="220" rx="8"/>' +
      '<text class="d-t"  x="89" y="40" text-anchor="middle">1 · Dựng cỗ máy</text>' +
      '<text class="d-ts" x="89" y="58" text-anchor="middle">"Phần cứng nào?"</text>' +
      '<line class="d-line" x1="20" y1="70" x2="158" y2="70"/>' +
      '<text class="d-tm" x="89" y="92"  text-anchor="middle">-M / -machine</text>' +
      '<text class="d-tm" x="89" y="114" text-anchor="middle">-cpu</text>' +
      '<text class="d-tm" x="89" y="136" text-anchor="middle">-m</text>' +
      '<text class="d-tm" x="89" y="158" text-anchor="middle">-smp</text>' +
      '<text class="d-ts" x="89" y="192" text-anchor="middle">Quyết định trước khi</text>' +
      '<text class="d-ts" x="89" y="208" text-anchor="middle">guest chạy dòng nào</text>' +

      '<rect class="d-box-a" x="186" y="14" width="170" height="220" rx="8"/>' +
      '<text class="d-t"  x="271" y="40" text-anchor="middle">2 · Nạp phần mềm</text>' +
      '<text class="d-ts" x="271" y="58" text-anchor="middle">"Chạy cái gì?"</text>' +
      '<line class="d-line" x1="202" y1="70" x2="340" y2="70"/>' +
      '<text class="d-tm" x="271" y="92"  text-anchor="middle">-kernel</text>' +
      '<text class="d-tm" x="271" y="114" text-anchor="middle">-initrd</text>' +
      '<text class="d-tm" x="271" y="136" text-anchor="middle">-append</text>' +
      '<text class="d-tm" x="271" y="158" text-anchor="middle">-bios · -drive</text>' +
      '<text class="d-ts" x="271" y="192" text-anchor="middle">Đổ byte vào RAM</text>' +
      '<text class="d-ts" x="271" y="208" text-anchor="middle">hoặc vào ổ đĩa ảo</text>' +

      '<rect class="d-box-g" x="368" y="14" width="170" height="220" rx="8"/>' +
      '<text class="d-t"  x="453" y="40" text-anchor="middle">3 · Nối ra ngoài</text>' +
      '<text class="d-ts" x="453" y="58" text-anchor="middle">"Nhìn thấy bằng gì?"</text>' +
      '<line class="d-line" x1="384" y1="70" x2="522" y2="70"/>' +
      '<text class="d-tm" x="453" y="92"  text-anchor="middle">-serial</text>' +
      '<text class="d-tm" x="453" y="114" text-anchor="middle">-monitor</text>' +
      '<text class="d-tm" x="453" y="136" text-anchor="middle">-display · -nographic</text>' +
      '<text class="d-tm" x="453" y="158" text-anchor="middle">-netdev</text>' +
      '<text class="d-ts" x="453" y="192" text-anchor="middle">Nhóm gây nhiều</text>' +
      '<text class="d-ts" x="453" y="208" text-anchor="middle">nhầm lẫn nhất</text>' +

      '<rect class="d-box-w" x="550" y="14" width="166" height="220" rx="8"/>' +
      '<text class="d-t"  x="633" y="40" text-anchor="middle">4 · Điều khiển</text>' +
      '<text class="d-ts" x="633" y="58" text-anchor="middle">"Chạy lúc nào?"</text>' +
      '<line class="d-line" x1="566" y1="70" x2="700" y2="70"/>' +
      '<text class="d-tm" x="633" y="92"  text-anchor="middle">-S</text>' +
      '<text class="d-tm" x="633" y="114" text-anchor="middle">-s / -gdb</text>' +
      '<text class="d-tm" x="633" y="136" text-anchor="middle">-d · -D</text>' +
      '<text class="d-tm" x="633" y="158" text-anchor="middle">-snapshot</text>' +
      '<text class="d-ts" x="633" y="192" text-anchor="middle">Công cụ gỡ lỗi,</text>' +
      '<text class="d-ts" x="633" y="208" text-anchor="middle">dùng ở bước 5</text>' +

      '</svg>' },

    { t: 'cal', kind: 'tip', title: 'Thứ tự tham số không quan trọng — trừ một chỗ',
      x: '<p>QEMU không quan tâm bạn viết <code>-m</code> trước hay sau <code>-cpu</code>. Nhưng ' +
         'khi một <code>-device</code> tham chiếu tới một <code>-drive</code> hay ' +
         '<code>-netdev</code> qua <code>id=</code>, cả hai phải cùng có mặt trên dòng lệnh — ' +
         'thiếu một cái là lỗi ngay lúc khởi động, không phải lúc guest chạy.</p>' +
         '<p>Vì thế thói quen tốt là <b>xuống dòng theo nhóm</b> bằng dấu <code>\\</code> như ví ' +
         'dụ trên. Dòng lệnh QEMU của bạn sẽ ngày một dài; nhóm lại là cách duy nhất để sáu ' +
         'tháng sau đọc lại vẫn hiểu.</p>' },

    /* ══════════════════════════════════════════════
       2. NHÓM 1 — DỰNG CỖ MÁY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Nhóm 1 — Dựng cỗ máy: -M, -cpu, -m, -smp' },

    { t: 'p', x:
      'Bốn tham số này quyết định phần cứng ảo, và chúng được xử lý <b>trước khi</b> một lệnh ' +
      'guest nào được chạy. Sai ở đây thì không có gì cứu được về sau.' },

    { t: 'table',
      head: ['Tham số', 'Nói gì với QEMU', 'Giá trị bạn sẽ dùng'],
      rows: [
        ['<code>-M</code> (hay <code>-machine</code>)', 'Chọn <b>model bo mạch</b>: có thiết bị nào, đặt ở địa chỉ nào, ngắt nối ra sao — đúng bản đồ bạn đã dump ở Bài 30', '<code>virt</code>'],
        ['<code>-cpu</code>', 'Chọn <b>lõi CPU</b>: tập lệnh nào được hỗ trợ, có 64 bit không, có những tính năng kiến trúc nào', '<code>cortex-a57</code>'],
        ['<code>-m</code>', 'Dung lượng RAM. Không có đơn vị thì mặc định là <b>MB</b>', '<code>512</code> hoặc <code>512M</code>'],
        ['<code>-smp</code>', 'Số lõi CPU ảo', '<code>1</code> khi học, <code>2</code> khi thử đồng thời']
      ]},

    { t: 'cal', kind: 'danger', title: 'Cái bẫy lớn nhất của bài này: -M virt mặc định là CPU 32 bit',
      x: '<p><code>qemu-system-aarch64</code> có chữ "aarch64" trong tên, nên ai cũng tưởng ' +
         'mặc định nó cho một CPU 64 bit. <b>Không phải.</b> Nếu bạn không viết ' +
         '<code>-cpu</code>, machine <code>virt</code> cho bạn <code>cortex-a15</code> — một ' +
         'lõi ARM <b>32 bit</b>, ra đời trước cả kiến trúc ARM64.</p>' +
         '<p>Hậu quả có hai mức, và mức thứ hai mới đáng sợ:</p>' +
         '<ul>' +
         '<li>Nạp một <b>ELF</b> ARM64 → QEMU báo lỗi ngay: <code>Couldn\'t load elf: The image ' +
         'is from incompatible architecture</code>. Khó chịu nhưng rõ ràng.</li>' +
         '<li>Nạp một <b>Image</b> nhân Linux ARM64 → QEMU <b>không báo gì cả</b>. Máy ảo chạy, ' +
         'CPU đọc phần đầu file như lệnh 32 bit, rồi treo im lặng. Bạn ngồi nhìn màn hình trống ' +
         'và đi tìm lỗi ở nhân, ở console, ở device tree — trong khi thủ phạm là một tham số ' +
         'bạn <i>không</i> viết.</li>' +
         '</ul>' +
         '<p>Bước 1 phần thực hành bắt bạn gặp cả hai. Quy tắc rút ra: <b>luôn viết ' +
         '<code>-cpu</code> tường minh</b>, kể cả khi bạn nghĩ mặc định là đúng.</p>' },

    { t: 'p', x:
      'Danh sách CPU mà QEMU 10.2.1 hỗ trợ cho ARM có <b>36</b> tên. Vài cái đáng biết:' },

    { t: 'table',
      head: ['Tên', 'Là gì', 'Khi nào dùng'],
      rows: [
        ['<code>cortex-a15</code>', 'Lõi ARM <b>32 bit</b>. Mặc định của <code>virt</code>', 'Không bao giờ, trong khoá học này'],
        ['<code>cortex-a53</code>', 'ARM64 tiết kiệm điện, lõi của Raspberry Pi 3', 'Khi muốn giống board thật giá rẻ'],
        ['<code>cortex-a57</code>', 'ARM64 hiệu năng. Lựa chọn chuẩn của tài liệu QEMU', '<b>Mặc định của khoá học này</b>'],
        ['<code>cortex-a72</code>', 'ARM64, lõi của Raspberry Pi 4', 'Khi mô phỏng Pi 4'],
        ['<code>max</code>', 'Bật <b>mọi</b> tính năng kiến trúc mà QEMU biết mô phỏng', 'Khi thử một tính năng mới mà CPU thật chưa có'],
        ['<code>host</code>', 'Chuyển thẳng CPU thật xuống guest', 'Chỉ dùng được với KVM — mà bạn không có, xem Bài 29']
      ]},

    { t: 'cal', kind: 'info', title: '-m không cấp phát ngay, và guest luôn thấy ít hơn bạn khai',
      x: '<p><code>-m 512</code> không lấy 512 MB RAM của Windows ngay lúc khởi động. QEMU xin ' +
         'hệ điều hành host một vùng nhớ ảo và chỉ chạm tới trang nào guest thật sự dùng — nên ' +
         'một máy ảo <code>-m 512</code> vừa boot xong có thể chỉ tốn vài chục MB thật.</p>' +
         '<p>Chiều ngược lại: guest <b>luôn báo ít hơn</b> con số bạn khai. Ở Bài 32 bạn sẽ thấy ' +
         '<code>-m 512</code> cho <code>MemTotal: 483 592 kB</code> — hụt khoảng <b>41 MB</b>. ' +
         'Phần hụt là mã nhân, bảng trang, vùng CMA dự trữ và các cấu trúc dữ liệu nhân cấp ' +
         'phát trước khi <code>/proc/meminfo</code> tồn tại. Trên board thật, con số hụt này ' +
         'chính là thứ quyết định bạn có nhét vừa ứng dụng vào 64 MB RAM hay không.</p>' },

    { t: 'p', x:
      'Còn <code>-smp</code>: mỗi lõi ảo là <b>một luồng của tiến trình QEMU</b> trên host. ' +
      'Máy của bạn có 6 CPU, nên <code>-smp 8</code> vẫn chạy — chỉ là 8 luồng tranh nhau 6 lõi ' +
      'thật, chậm hơn chứ không hỏng. Giới hạn thật nằm ở machine: <code>virt-10.2</code> nhận ' +
      'tối đa <b>512</b> lõi.' },

    { t: 'cal', kind: 'warn', title: 'Khi học, hãy để -smp 1',
      x: '<p>Bài 30 đã đo: thêm <code>-smp 2</code> làm device tree đổi <b>35</b> dòng vì hiệu ' +
         'ứng lan toả phandle. Nhiều lõi cũng làm log boot xen kẽ nhau khó đọc, và làm mọi phiên ' +
         'gỡ lỗi GDB phức tạp hơn hẳn — bạn phải theo dõi lõi nào đang chạy lệnh nào.</p>' +
         '<p>Một lõi là đủ cho mọi thứ từ đây tới Chặng 09. Khi nào bạn cần chứng minh một lỗi ' +
         'tranh chấp dữ liệu trong driver ở Chặng 10, lúc đó mới bật <code>-smp 2</code> — và ' +
         'lúc đó bạn sẽ <i>muốn</i> nó, chứ không phải chịu đựng nó.</p>' },

    /* ══════════════════════════════════════════════
       3. NHÓM 2 — NẠP PHẦN MỀM
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Nhóm 2 — Nạp phần mềm: -kernel, -initrd, -append, -drive' },

    { t: 'p', x:
      'Cỗ máy đã dựng xong nhưng RAM còn trắng. Nhóm này quyết định <b>byte nào nằm ở đâu</b> ' +
      'trước khi CPU chạy lệnh đầu tiên.' },

    { t: 'terms', items: [
      ['-kernel', '', 'Nạp một file vào RAM và cho CPU bắt đầu chạy từ đó. QEMU nhận cả ELF (như <code>hello.elf</code> của Bài 30) lẫn định dạng <code>Image</code> của nhân ARM64.'],
      ['-initrd', '', 'Nạp thêm một file thứ hai vào RAM, ở địa chỉ khác, rồi <b>báo địa chỉ ấy cho nhân</b> qua device tree. Nhân hiểu đó là hệ thống tệp ban đầu.'],
      ['-append', '', 'Chuỗi tham số dòng lệnh nhân. QEMU nhét nó vào nút <code>chosen/bootargs</code> của device tree, nhân đọc ra thành <code>/proc/cmdline</code>.'],
      ['-bios', '', 'Nạp firmware vào flash ở <code>0x00000000</code> thay vì nạp nhân vào RAM. Chặng 06 sẽ dùng để chạy U-Boot.'],
      ['-drive', '', 'Khai một file trên host làm <b>ổ đĩa</b>. Chỉ khai thôi chưa đủ — phải có một <code>-device</code> cắm nó vào bus.']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao -kernel bỏ qua được cả bootloader',
      x: '<p>Trên board thật, chuỗi khởi động là: ROM trong chip → bootloader (U-Boot) → nhân. ' +
         'Bootloader tồn tại vì phải có ai đó khởi tạo RAM, đọc nhân từ thẻ nhớ vào RAM, dựng ' +
         'device tree, rồi mới nhảy vào nhân.</p>' +
         '<p><code>-kernel</code> nói với QEMU: "làm hết những việc đó hộ tôi". QEMU đóng vai ' +
         'bootloader — đổ file vào RAM, tự sinh device tree, đặt địa chỉ device tree vào thanh ' +
         'ghi <code>x0</code>, rồi nhảy vào điểm vào của nhân.</p>' +
         '<p>Đây là <b>đường tắt để học</b>, không phải cách sản phẩm thật chạy. Chặng 06 sẽ gỡ ' +
         'đường tắt này ra và bắt U-Boot làm đúng phần việc của nó. Nhưng lúc đang học nhân, ' +
         'gỡ bỏ một biến số là điều đáng làm: nếu nhân không boot, bạn biết chắc lỗi không nằm ' +
         'ở bootloader.</p>' },

    { t: 'p', x:
      'Ba tham số <code>-kernel</code> / <code>-initrd</code> / <code>-append</code> đi thành ' +
      'một bộ, và có thể <b>nhìn thấy</b> chúng gặp nhau ở đâu. Bài 30 đã dạy bạn dump device ' +
      'tree; giờ dump lại nhưng có kèm ba tham số ấy, và nhìn nút <code>chosen</code>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'Trích nút chosen sau khi thêm -kernel -initrd -append', code:
      '\tchosen {\n' +
      '\t\tlinux,initrd-end = <0x00 0x480fcc88>;\n' +
      '\t\tlinux,initrd-start = <0x00 0x48000000>;\n' +
      '\t\tbootargs = "console=ttyAMA0 rdinit=/init";\n' +
      '\t\tstdout-path = "/pl011@9000000";\n' +
      '\t};' },

    { t: 'cal', kind: 'info', title: 'Ba dòng này chứng minh cả ba tham số cùng lúc',
      x: '<p><code>bootargs</code> chính là chuỗi bạn đưa cho <code>-append</code>, không sửa ' +
         'một ký tự.</p>' +
         '<p><code>linux,initrd-start</code> = <code>0x48000000</code> là nơi QEMU đã đổ file ' +
         '<code>-initrd</code> vào — cách đầu RAM (<code>0x40000000</code>) đúng <b>128 MB</b>, ' +
         'đủ xa để nhân giải nén ra mà không đè lên chính nó.</p>' +
         '<p>Và phép trừ này đáng làm bằng tay: <code>0x480fcc88 − 0x48000000 = 0xfcc88 = ' +
         '<b>1 035 400</b></code> byte — đúng bằng kích thước file initramfs của lần chạy này, ' +
         'không lệch một byte. (Bài 32 sẽ cho bạn tự đóng gói file ấy; con số của bạn có thể ' +
         'lệch vài byte so với ở đây vì header cpio nhúng số inode và thời gian sửa file, nhưng ' +
         '<b>hiệu hai đầu mút luôn khớp đúng file của chính bạn</b>.) Device tree không mô tả ' +
         'phần cứng ở đây; nó đang <b>chuyển thư</b> từ dòng lệnh của bạn sang nhân.</p>' },

    { t: 'p', x:
      'Còn <code>-drive</code>: khai một ổ đĩa trong QEMU luôn là <b>hai nửa</b>, và người mới ' +
      'gần như luôn quên nửa thứ hai.' },

    { t: 'table',
      head: ['Nửa', 'Tham số', 'Trả lời câu hỏi'],
      rows: [
        ['Hậu trường (backend)', '<code>-drive file=disk.img,format=raw,if=none,id=hd0</code>', 'Dữ liệu nằm ở file nào trên host, đọc theo định dạng gì'],
        ['Mặt tiền (frontend)', '<code>-device virtio-blk-device,drive=hd0</code>', 'Guest <b>nhìn thấy</b> nó như thiết bị gì, cắm vào bus nào']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao QEMU tách đôi mà không gộp lại cho gọn',
      x: '<p>Vì hai nửa hoàn toàn độc lập nhau. Cùng một file <code>disk.img</code> có thể được ' +
         'guest nhìn thấy như ổ virtio (nhanh, cần driver), như ổ SCSI, hay như thẻ SD — tuỳ bạn ' +
         'chọn <code>-device</code> nào. Ngược lại, cùng một <code>virtio-blk-device</code> có ' +
         'thể lấy dữ liệu từ file raw, file qcow2, hay thẳng từ một phân vùng thật.</p>' +
         '<p><code>if=none</code> chính là câu "đừng tự cắm giúp tôi" — không có nó, QEMU sẽ ' +
         'đoán một bus mặc định và bạn được hai ổ đĩa thay vì một. <code>id=hd0</code> là sợi ' +
         'dây nối hai nửa lại: <code>-device</code> gọi tên nó qua <code>drive=hd0</code>.</p>' +
         '<p>Y hệt như vậy với mạng: <code>-netdev</code> là hậu trường, ' +
         '<code>-device virtio-net-device</code> là mặt tiền, nối nhau bằng <code>id</code>.</p>' },

    /* ══════════════════════════════════════════════
       4. NHÓM 3 — NỐI RA NGOÀI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Nhóm 3 — Nối ra ngoài: mô hình chardev' },

    { t: 'p', x:
      'Đây là nhóm gây nhầm lẫn nhiều nhất, và nguyên nhân là người ta không biết QEMU có một ' +
      'khái niệm trung gian tên là <b>chardev</b> (character device — thiết bị ký tự).' },

    { t: 'p', x:
      'Guest ghi một ký tự vào PL011 ở <code>0x09000000</code>. Ký tự đó đi đâu? Không đi thẳng ' +
      'ra terminal của bạn. Nó đi vào một <b>chardev</b> — một cái ống của QEMU — và chính bạn ' +
      'quyết định đầu kia của ống nối vào đâu.' },

    { t: 'fig', cap:
      'Cổng nối tiếp ảo và terminal của bạn không nối thẳng: giữa chúng là một chardev mà bạn ' +
      'chọn đầu ra. Hiểu chỗ này thì mọi lỗi "không thấy log" đều tự giải.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ chardev: guest ghi vào PL011, qua chardev, ra stdio hoặc file hoặc null">' +

      '<rect class="d-box-p" x="10" y="90" width="150" height="70" rx="8"/>' +
      '<text class="d-t"  x="85" y="118" text-anchor="middle">Mã guest</text>' +
      '<text class="d-tm" x="85" y="140" text-anchor="middle">str w2, [x1]</text>' +

      '<line class="d-line" x1="160" y1="125" x2="222" y2="125"/>' +
      '<path class="d-arrow" d="M228 125 l-8 -4 v8 z"/>' +

      '<rect class="d-box-a" x="230" y="90" width="150" height="70" rx="8"/>' +
      '<text class="d-t"  x="305" y="114" text-anchor="middle">PL011 ảo</text>' +
      '<text class="d-tm" x="305" y="134" text-anchor="middle">0x09000000</text>' +
      '<text class="d-ts" x="305" y="152" text-anchor="middle">thiết bị trong QEMU</text>' +

      '<line class="d-line" x1="380" y1="125" x2="442" y2="125"/>' +
      '<path class="d-arrow" d="M448 125 l-8 -4 v8 z"/>' +

      '<rect class="d-box" x="450" y="90" width="120" height="70" rx="8"/>' +
      '<text class="d-t"  x="510" y="118" text-anchor="middle">chardev</text>' +
      '<text class="d-ts" x="510" y="140" text-anchor="middle">chọn bằng -serial</text>' +

      '<line class="d-line" x1="570" y1="125" x2="600" y2="125"/>' +
      '<line class="d-line" x1="600" y1="40"  x2="600" y2="230"/>' +

      '<line class="d-line" x1="600" y1="40" x2="632" y2="40"/>' +
      '<path class="d-arrow" d="M638 40 l-8 -4 v8 z"/>' +
      '<rect class="d-box-g" x="640" y="22" width="76" height="36" rx="6"/>' +
      '<text class="d-tm" x="678" y="45" text-anchor="middle">stdio</text>' +

      '<line class="d-line" x1="600" y1="105" x2="632" y2="105"/>' +
      '<path class="d-arrow" d="M638 105 l-8 -4 v8 z"/>' +
      '<rect class="d-box-g" x="640" y="87" width="76" height="36" rx="6"/>' +
      '<text class="d-tm" x="678" y="110" text-anchor="middle">file:…</text>' +

      '<line class="d-line" x1="600" y1="170" x2="632" y2="170"/>' +
      '<path class="d-arrow" d="M638 170 l-8 -4 v8 z"/>' +
      '<rect class="d-box-w" x="640" y="152" width="76" height="36" rx="6"/>' +
      '<text class="d-tm" x="678" y="175" text-anchor="middle">null</text>' +

      '<line class="d-line" x1="600" y1="230" x2="632" y2="230"/>' +
      '<path class="d-arrow" d="M638 230 l-8 -4 v8 z"/>' +
      '<rect class="d-box" x="640" y="212" width="76" height="36" rx="6"/>' +
      '<text class="d-tm" x="678" y="235" text-anchor="middle">tcp:…</text>' +

      '<text class="d-ts" x="85"  y="200" text-anchor="middle">Bài 30 đã viết</text>' +
      '<text class="d-ts" x="85"  y="216" text-anchor="middle">đúng vòng lặp này</text>' +
      '<text class="d-ts" x="510" y="200" text-anchor="middle">Một chardev chỉ có</text>' +
      '<text class="d-ts" x="510" y="216" text-anchor="middle"><b>một</b> đầu ra — nguồn gốc</text>' +
      '<text class="d-ts" x="510" y="232" text-anchor="middle">của lỗi tranh stdio</text>' +

      '</svg>' },

    { t: 'table',
      head: ['Giá trị', 'Nghĩa', 'Dùng khi'],
      rows: [
        ['<code>-serial stdio</code>', 'Nối cổng nối tiếp vào terminal đang chạy QEMU', 'Muốn gõ vào guest'],
        ['<code>-serial file:out.txt</code>', 'Ghi mọi ký tự guest in ra vào một file', 'Chạy tự động, muốn giữ log để đọc sau'],
        ['<code>-serial null</code>', 'Vứt bỏ. Guest vẫn ghi được, không ai đọc', 'Chỉ quan tâm monitor, không muốn log guest trộn vào'],
        ['<code>-serial none</code>', 'Không tạo cổng nối tiếp nào cả', 'Hiếm — guest có thể treo khi ghi vào thiết bị không tồn tại'],
        ['<code>-serial mon:stdio</code>', 'Ghép <b>cả</b> monitor lẫn cổng nối tiếp vào stdio, chuyển qua lại bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>C</kbd>', 'Đây chính là thứ <code>-nographic</code> bật cho bạn'],
        ['<code>-serial tcp::4444,server</code>', 'Mở một cổng TCP, chờ bạn <code>telnet</code> vào', 'Khi QEMU chạy nền, hoặc chạy trên máy khác']
      ]},

    { t: 'cal', kind: 'warn', title: '-nographic không phải là "tắt cửa sổ đồ hoạ"',
      x: '<p>Tên gọi đánh lừa. <code>-nographic</code> làm <b>ba</b> việc cùng lúc: tắt cửa sổ ' +
         'đồ hoạ, <i>và</i> nối cổng nối tiếp vào stdio, <i>và</i> nối monitor vào cùng stdio ' +
         'đó (chế độ <code>mon:stdio</code>).</p>' +
         '<p>Nên khi bạn thêm <code>-monitor stdio</code> vào cạnh nó, hai bên cùng đòi stdio và ' +
         'QEMU từ chối:</p>' +
         '<p><code>qemu-system-aarch64: cannot use stdio by multiple character devices</code></p>' +
         '<p>Muốn chỉ tắt đồ hoạ mà không đụng tới cổng nối tiếp, dùng <code>-display none</code>. ' +
         'Đó chính là lý do Bài 30 luôn viết bộ ba <code>-display none -serial null -monitor ' +
         'stdio</code> thay vì <code>-nographic</code>.</p>' },

    { t: 'cal', kind: 'tip', title: 'Thoát khỏi QEMU khi đang ở chế độ -nographic',
      x: '<p>Guest chiếm hết terminal, và <kbd>Ctrl</kbd>+<kbd>C</kbd> chỉ gửi tín hiệu <i>vào ' +
         'guest</i> chứ không giết QEMU. Lối thoát là chuỗi phím thoát của QEMU:</p>' +
         '<ul>' +
         '<li><kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> — thoát QEMU ngay lập tức.</li>' +
         '<li><kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>C</kbd> — chuyển sang dấu nhắc ' +
         '<code>(qemu)</code>, bấm lại để quay về guest.</li>' +
         '<li><kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>H</kbd> — xem danh sách đầy đủ.</li>' +
         '</ul>' +
         '<p>Nhả <kbd>Ctrl</kbd>+<kbd>A</kbd> ra <b>trước</b> khi bấm phím thứ hai. Học thuộc ' +
         '<kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>X</kbd> ngay bây giờ — từ Bài 32 trở đi bạn sẽ dùng ' +
         'nó vài chục lần mỗi buổi.</p>' },

    /* ══════════════════════════════════════════════
       5. NHÓM 4 — ĐIỀU KHIỂN THỜI GIAN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Nhóm 4 — Điều khiển thời gian: -S và -s' },

    { t: 'p', x:
      'Hai tham số này viết gần giống nhau, chỉ khác hoa thường, và làm hai việc hoàn toàn khác ' +
      'nhau. Chúng thường đi cùng nhau nên rất dễ nhớ nhầm cái nào là cái nào.' },

    { t: 'table',
      head: ['Tham số', 'Viết đầy đủ là', 'Làm gì'],
      rows: [
        ['<code>-S</code> (hoa)', 'không có dạng dài', '<b>S</b>top — dựng máy xong thì <b>dừng CPU</b>, không chạy lệnh nào. Máy ảo ở trạng thái <code>paused (prelaunch)</code>'],
        ['<code>-s</code> (thường)', '<code>-gdb tcp::1234</code>', 'Mở <b>máy chủ gỡ lỗi</b> GDB trên cổng TCP 1234 của host'],
        ['<code>-gdb tcp::5555</code>', '—', 'Giống <code>-s</code> nhưng chọn cổng khác. Cần khi chạy nhiều máy ảo cùng lúc']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao phải có -S, không chỉ -s là đủ',
      x: '<p><code>-s</code> mở cổng nhưng <b>không dừng</b> máy ảo. Chương trình ' +
         '<code>hello.elf</code> chạy xong trong vài micro giây — tới lúc bạn gõ xong lệnh ' +
         '<code>target remote</code> thì nó đã nằm im trong <code>wfi</code> từ lâu. Bạn nối vào ' +
         'được, nhưng chẳng còn gì để xem.</p>' +
         '<p><code>-S</code> đóng băng CPU <b>trước</b> lệnh đầu tiên và giữ nguyên như thế cho ' +
         'tới khi GDB ra lệnh chạy. Nhờ vậy bạn quan sát được cả chương trình từ lệnh số một.</p>' +
         '<p>Câu thần chú: <b>chữ hoa dừng máy, chữ thường mở cổng.</b> Gỡ lỗi khởi động thì ' +
         'luôn cần cả hai.</p>' },

    { t: 'fig', cap:
      'Với -s -S, QEMU dựng máy rồi đứng yên chờ. GDB mới là bên quyết định khi nào lệnh tiếp ' +
      'theo được chạy — đó là lý do bạn xem được cả những lệnh chạy trong micro giây đầu tiên.',
      svg:
      '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Trình tự làm việc giữa QEMU với -s -S và gdb-multiarch qua cổng 1234">' +

      '<rect class="d-box-p" x="10" y="14" width="200" height="46" rx="8"/>' +
      '<text class="d-t"  x="110" y="34" text-anchor="middle">Terminal 1 — QEMU</text>' +
      '<text class="d-tm" x="110" y="52" text-anchor="middle">-kernel hello.elf -s -S</text>' +

      '<rect class="d-box-a" x="510" y="14" width="200" height="46" rx="8"/>' +
      '<text class="d-t"  x="610" y="34" text-anchor="middle">Terminal 2 — GDB</text>' +
      '<text class="d-tm" x="610" y="52" text-anchor="middle">gdb-multiarch hello.elf</text>' +

      '<rect class="d-box-g" x="270" y="14" width="180" height="46" rx="8"/>' +
      '<text class="d-t"  x="360" y="34" text-anchor="middle">cổng TCP</text>' +
      '<text class="d-tm" x="360" y="52" text-anchor="middle">localhost:1234</text>' +

      '<line class="d-line" x1="210" y1="37" x2="264" y2="37"/>' +
      '<line class="d-line" x1="456" y1="37" x2="504" y2="37"/>' +

      '<rect class="d-box" x="10" y="86" width="700" height="34" rx="6"/>' +
      '<text class="d-ts" x="24" y="107">1 · QEMU dựng máy, nạp hello.elf vào 0x40080000, rồi <b>dừng</b> — PC đứng ở lệnh đầu tiên, chưa chạy gì</text>' +

      '<rect class="d-box" x="10" y="124" width="700" height="34" rx="6"/>' +
      '<text class="d-ts" x="24" y="145">2 · GDB đọc bảng ký hiệu từ hello.elf trên host, rồi <code>target remote</code> nối vào cổng 1234</text>' +

      '<rect class="d-box-g" x="10" y="162" width="700" height="34" rx="6"/>' +
      '<text class="d-ts" x="24" y="183">3 · <code>stepi</code> chạy đúng <b>một</b> lệnh máy — QEMU chạy rồi dừng lại, GDB đọc thanh ghi và in ra</text>' +

      '</svg>' },

    { t: 'cal', kind: 'info', title: 'GDB chạy trên host, chương trình chạy trong guest',
      x: '<p>Đây là điểm khiến gỡ lỗi nhúng khác hẳn gỡ lỗi ứng dụng thường. ' +
         '<code>gdb-multiarch</code> là chương trình <b>x86-64</b> chạy trong WSL. Nó không hề ' +
         'thực thi một lệnh ARM64 nào — nó chỉ gửi những gói tin rất đơn giản qua cổng 1234: ' +
         '"đọc thanh ghi", "đọc 8 byte ở địa chỉ này", "chạy một lệnh rồi dừng".</p>' +
         '<p>Bên kia, QEMU trả lời. Còn <code>hello.elf</code> bạn đưa cho GDB chỉ để nó tra ' +
         '<b>bảng ký hiệu</b> — nhờ đó nó biết <code>0x40080008</code> tên là ' +
         '<code>put_loop</code>. Guest không cần biết gì về bảng ký hiệu ấy.</p>' +
         '<p>Chính mô hình này là thứ Chặng 12 sẽ dùng để gỡ lỗi nhân Linux: đổi ' +
         '<code>hello.elf</code> thành <code>vmlinux</code>, còn lại y hệt.</p>' },

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: thử từng tham số một' },

    { t: 'p', x:
      'Sáu bước. Bạn sẽ dùng lại <code>hello.elf</code> của Bài 30 làm vật thí nghiệm — nó nhỏ, ' +
      'chạy tức thì, và bạn biết chính xác nó làm gì, nên mọi thay đổi quan sát được đều đến từ ' +
      'tham số chứ không phải từ chương trình.' },

    { t: 'steps', items: [

      /* ── BƯỚC 1 ── */
      { title: 'Dựng lại hello.elf và sập vào bẫy -cpu',
        blocks: [
          { t: 'p', x:
            'Tạo thư mục làm việc riêng cho bài này và mang hai file nguồn của Bài 30 sang:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai31 && cd ~/bai31\n' +
            'cp ~/bai30/hello.S ~/bai30/link.ld .\n' +
            'aarch64-linux-gnu-gcc -nostdlib -static -Wl,-T,link.ld -o hello.elf hello.S\n' +
            'file hello.elf' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello.elf: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), statically\n' +
            'linked, BuildID[sha1]=d3ef68591124ae174126ceaca3bf3b552012c5be, not stripped' },

          { t: 'p', x:
            'File là ARM64, không nghi ngờ gì. Bây giờ chạy nó bằng dòng lệnh QEMU <b>ngắn nhất ' +
            'có thể</b> — cố tình không viết <code>-cpu</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -m 128 -kernel hello.elf \\\n' +
            '  -display none -serial null -monitor none\n' +
            'echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-system-aarch64: Couldn\'t load elf \'hello.elf\': The image is from incompatible architecture\n' +
            'exit=1' },

          { t: 'p', x:
            'Chương trình đúng kiến trúc, QEMU đúng tên, mà vẫn "incompatible architecture". ' +
            'Hỏi máy ảo xem nó nghĩ nó có CPU gì:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info cpus\\nquit\\n\' | qemu-system-aarch64 -M virt -m 128 -S \\\n' +
            '  -display none -serial null -monitor stdio | grep \'CPU #\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '* CPU #0: thread_id=417 model=cortex-a15' },

          { t: 'cal', kind: 'why', title: 'cortex-a15 là CPU 32 bit — và đó là mặc định',
            x: '<p>Machine <code>virt</code> ra đời cho ARM 32 bit trước, rồi mới được mở rộng ' +
               'sang ARM64. Giá trị mặc định của <code>-cpu</code> bị giữ nguyên từ thời ấy để ' +
               'không phá vỡ những dòng lệnh cũ đã tồn tại.</p>' +
               '<p>Nên <code>qemu-system-aarch64</code> có nghĩa là "chương trình QEMU <i>có khả ' +
               'năng</i> mô phỏng ARM64", chứ không có nghĩa "mặc định mô phỏng ARM64".</p>' +
               '<p>Ghi vào sổ tay: <b>-M virt luôn phải đi kèm -cpu.</b></p> ' },

          { t: 'p', x: 'Thêm <code>-cpu cortex-a57</code> và mọi thứ đổi khác:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 128 -kernel hello.elf \\\n' +
            '  -display none -serial file:out31.txt -monitor none\n' +
            '# Chờ vài giây rồi bấm Ctrl+C — chương trình kết thúc bằng vòng lặp wfi\n' +
            'cat out31.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Hello from bare metal ARM64' },

          { t: 'cal', kind: 'why', title: 'Một tham số duy nhất đổi, và kết quả lật từ lỗi sang đúng',
            x: '<p>So hai lần chạy: cùng file <code>hello.elf</code>, cùng <code>-M virt</code>, cùng ' +
               '<code>-m 128</code> — chỉ thêm đúng một tham số <code>-cpu cortex-a57</code>. Lần trước QEMU ' +
               'từ chối nạp file với <code>incompatible architecture</code>; lần này <code>out31.txt</code> ' +
               'chứa đúng chuỗi <code>hello.S</code> của bạn in ra, không thiếu không thừa một ký tự.</p>' +
               '<p>Đây là bằng chứng thực nghiệm chứ không chỉ suy luận: nguyên nhân duy nhất của lỗi ban đầu ' +
               'là CPU mặc định sai, không phải file <code>hello.elf</code> hỏng, không phải cờ biên dịch ' +
               'sai — đổi đúng một tham số là đủ sửa cả hai triệu chứng bạn đã thấy ở trên.</p>' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 128 -kernel hello.elf -display none -serial file:out31.txt -monitor none',
            title: 'Mổ xẻ dòng lệnh tối thiểu',
            rows: [
              ['<code>-M virt</code>', 'Chọn model bo mạch <code>virt</code> — bản đồ bộ nhớ bạn đã dump ở Bài 30', 'Không có nó, QEMU không biết đặt RAM ở đâu'],
              ['<code>-cpu cortex-a57</code>', 'Chọn lõi ARM64. <b>Bắt buộc</b>, vì mặc định là lõi 32 bit', 'Bỏ đi là lỗi "incompatible architecture" bạn vừa gặp'],
              ['<code>-m 128</code>', '128 MB RAM. Không có đơn vị thì QEMU hiểu là MB', '<code>hello.elf</code> chỉ cần vài KB, nhưng RAM phải đủ chứa địa chỉ nạp <code>0x40080000</code>'],
              ['<code>-kernel hello.elf</code>', 'Đổ file vào RAM và cho CPU chạy từ điểm vào của nó', 'QEMU đóng luôn vai bootloader — xem lại khung "vì sao" phía trên'],
              ['<code>-display none</code>', 'Không mở cửa sổ đồ hoạ', 'Khác <code>-nographic</code>: nó <i>chỉ</i> làm đúng việc này'],
              ['<code>-serial file:out31.txt</code>', 'Mọi ký tự guest ghi vào PL011 chảy vào file <code>out31.txt</code>', 'Cách sạch nhất để giữ log khi chạy tự động'],
              ['<code>-monitor none</code>', 'Không tạo monitor', 'Lần này không cần monitor, và bỏ nó đi thì không ai tranh stdio']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao phải Ctrl+C mới thoát được',
            x: '<p>Nhìn lại <code>hello.S</code> của Bài 30: sau khi in xong chuỗi, nó vào ' +
               '<code>wfi</code> rồi nhảy vòng về chính nó. Không có lệnh nào tắt máy.</p>' +
               '<p>Trên board thật đó là hành vi <b>đúng</b> — phần mềm nhúng không "kết thúc", ' +
               'nó chạy tới khi mất điện. QEMU trung thành mô phỏng điều đó, nên tiến trình ' +
               'QEMU cũng không tự thoát.</p>' +
               '<p>Ở Bài 32 bạn sẽ thấy cách làm ngược lại: BusyBox có lệnh ' +
               '<code>poweroff -f</code>, guest gọi vào giao diện PSCI của firmware và QEMU ' +
               'thoát sạch với mã 0.</p>' }
        ]},

      /* ── BƯỚC 2 ── */
      { title: 'Đo tác dụng thật của -m và -smp',
        blocks: [
          { t: 'p', x:
            'Đừng tin tài liệu — hỏi máy. Monitor cho bạn xem bản đồ bộ nhớ thật ứng với từng ' +
            'giá trị <code>-m</code>. Chạy hai lần, đổi đúng một tham số:' },

          { t: 'code', where: 'wsl', code:
            'for M in 128M 512M; do\n' +
            '  echo "--- -m $M ---"\n' +
            '  printf \'info mtree -f\\nquit\\n\' | qemu-system-aarch64 \\\n' +
            '    -M virt -cpu cortex-a57 -m $M -S \\\n' +
            '    -display none -serial null -monitor stdio | grep \'mach-virt.ram\'\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '--- -m 128M ---\n' +
            '  0000000040000000-0000000047ffffff (prio 0, ram): mach-virt.ram\n' +
            '--- -m 512M ---\n' +
            '  0000000040000000-000000005fffffff (prio 0, ram): mach-virt.ram' },

          { t: 'cal', kind: 'info', title: 'Đọc hai dòng này như một kỹ sư',
            x: '<p>Điểm bắt đầu <b>không đổi</b>: <code>0x40000000</code> trong cả hai. Đây là ' +
               'hằng số của machine <code>virt</code>, không phải thứ <code>-m</code> điều khiển ' +
               '— đúng như Bài 30 đã dump ra.</p>' +
               '<p>Chỉ điểm kết thúc đổi. Kiểm bằng phép trừ: <code>0x47ffffff − 0x40000000 + 1 ' +
               '= 0x8000000 = 134 217 728</code> byte = đúng <b>128 MB</b>. Và ' +
               '<code>0x5fffffff − 0x40000000 + 1 = 0x20000000 = <b>512 MB</b></code>.</p>' +
               '<p>Thói quen tự kiểm tra bằng phép trừ này sẽ cứu bạn ở Chặng 08, khi một nút ' +
               'device tree khai sai kích thước và thiết bị im lặng không phản hồi.</p>' },

          { t: 'p', x:
            'Với <code>-smp</code> thì <code>info cpus</code> là câu trả lời trực tiếp:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info cpus\\nquit\\n\' | qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -smp 4 -m 128 -S \\\n' +
            '  -display none -serial null -monitor stdio | grep \'CPU #\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '* CPU #0: thread_id=437 model=cortex-a57\n' +
            '  CPU #1: thread_id=438 model=cortex-a57\n' +
            '  CPU #2: thread_id=439 model=cortex-a57\n' +
            '  CPU #3: thread_id=440 model=cortex-a57' },

          { t: 'cal', kind: 'info', title: 'Bốn thread_id liên tiếp — mỗi lõi ảo là một luồng host',
            x: '<p><code>thread_id</code> là số hiệu tiến trình <i>trên Linux của bạn</i>, không ' +
               'phải trong guest. Bốn số liên tiếp 437–440 cho thấy QEMU tạo bốn luồng ngay sau ' +
               'nhau lúc khởi động.</p>' +
               '<p>Dấu <code>*</code> đánh dấu lõi mà monitor đang trỏ tới. Khi gỡ lỗi nhiều lõi, ' +
               'lệnh <code>cpu 2</code> ở monitor chuyển dấu sao sang lõi khác — cần biết khi ' +
               'một lõi treo còn ba lõi kia vẫn chạy.</p>' +
               '<p>Nhắc lại Bài 29: đây <b>không</b> phải bốn lõi thật. Bốn luồng host này cùng ' +
               'chạy TCG, tức là cùng dịch lệnh ARM64 sang x86-64, và chúng tranh nhau 6 lõi ' +
               'thật của bạn.</p>' },

          { t: 'p', x: 'Cuối cùng, thử vượt giới hạn để xem QEMU nói gì:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 600 -m 128 -S \\\n' +
            '  -display none -serial null -monitor none' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-system-aarch64: Invalid SMP CPUs 600. The max CPUs supported by machine \'virt-10.2\' is 512' },

          { t: 'cal', kind: 'tip', title: 'Chú ý cái tên virt-10.2 trong thông báo lỗi',
            x: '<p>Bạn viết <code>-M virt</code>, nhưng QEMU nhắc lại là <code>virt-10.2</code>. ' +
               '<code>virt</code> là <b>bí danh</b> trỏ tới phiên bản machine của QEMU hiện tại ' +
               '— Bài 30 đã ghi nhận điều này.</p>' +
               '<p>Hệ quả thực tế: nâng cấp QEMU có thể làm máy ảo của bạn đổi hành vi mà dòng ' +
               'lệnh không đổi một chữ. Khi cần kết quả lặp lại được sau nhiều năm — điều Chặng ' +
               '11 gọi là <i>reproducible build</i> — hãy ghim phiên bản tường minh: ' +
               '<code>-M virt-10.2</code>.</p>' }
        ]},

      /* ── BƯỚC 3 ── */
      { title: 'Điều hướng cổng nối tiếp và làm nó xung đột',
        blocks: [
          { t: 'p', x:
            'Bước này chứng minh mô hình chardev bằng cách đưa cùng một chương trình ra ba ' +
            'đích khác nhau, rồi cố tình làm nó gãy.' },

          { t: 'p', x:
            'Thứ nhất, vứt bỏ đầu ra. Guest vẫn ghi vào PL011 bình thường, chỉ là không ai đọc:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 128 -kernel hello.elf \\\n' +
            '  -display none -serial null -monitor none' },

          { t: 'p', x:
            'Màn hình trống. Không lỗi, không cảnh báo — và đây chính xác là cái bẫy: ' +
            '<b>"không thấy gì" không có nghĩa là "không chạy"</b>. Chương trình đã in đủ 28 ' +
            'byte, chúng chỉ rơi vào hư không.' },

          { t: 'p', x:
            'Thứ hai, đưa ra terminal. Đây là cách bạn sẽ dùng hằng ngày từ Bài 32:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 128 -kernel hello.elf -nographic' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Hello from bare metal ARM64' },

          { t: 'p', x:
            'So với lệnh <code>-serial null</code> lúc nãy — màn hình trống trơn dù chương trình vẫn chạy — ' +
            'lần này đúng chuỗi bạn viết trong <code>hello.S</code> hiện ngay trên chính terminal đang gõ ' +
            'lệnh. Chardev không đổi cách guest ghi vào PL011; nó chỉ đổi <b>đầu ra</b> đang nối vào, đúng như ' +
            'sơ đồ chardev ở trên mô tả.' },

          { t: 'cal', kind: 'tip', title: 'Thoát ra: Ctrl+A rồi X',
            x: '<p>Chương trình đang quay trong <code>wfi</code> và không bao giờ tự dừng. ' +
               '<kbd>Ctrl</kbd>+<kbd>C</kbd> lúc này đi <i>vào guest</i> chứ không giết QEMU.</p>' +
               '<p>Bấm <kbd>Ctrl</kbd>+<kbd>A</kbd>, nhả ra, rồi bấm <kbd>X</kbd>. Nếu lỡ chạy ' +
               'QEMU nền và mất terminal, cách cuối cùng là ' +
               '<code>pkill qemu-system-aarch64</code> ở một cửa sổ WSL khác.</p>' },

          { t: 'p', x:
            'Thứ ba, làm nó gãy. Thêm <code>-monitor stdio</code> vào cạnh <code>-nographic</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 128 -kernel hello.elf \\\n' +
            '  -nographic -monitor stdio' },

          { t: 'code', where: 'out', nocopy: true, code:
            'QEMU 10.2.1 monitor - type \'help\' for more information\n' +
            'qemu-system-aarch64: cannot use stdio by multiple character devices\n' +
            'qemu-system-aarch64: could not connect serial device to character backend \'stdio\'' },

          { t: 'cal', kind: 'why', title: 'Đọc kỹ: dòng thứ nhất chứng minh nguyên nhân',
            x: '<p>Monitor <b>đã in được</b> lời chào của nó trước khi lỗi xuất hiện. Nghĩa là ' +
               'monitor chiếm stdio thành công, rồi mới tới lượt cổng nối tiếp xin — và bị từ ' +
               'chối vì stdio đã có chủ.</p>' +
               '<p>Một chardev là một cái ống <b>một đầu</b>. <code>-nographic</code> đã đăng ký ' +
               'stdio cho cổng nối tiếp; <code>-monitor stdio</code> đăng ký lần nữa. Không có ' +
               'cách nào chia đôi.</p>' +
               '<p>Hai lối thoát, và bạn sẽ dùng cả hai:</p>' +
               '<ul>' +
               '<li>Cần <b>cả hai</b> trên một terminal → chỉ dùng <code>-nographic</code>, rồi ' +
               '<kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>C</kbd> để chuyển qua lại. Đây chính là ' +
               '<code>mon:stdio</code>.</li>' +
               '<li>Chỉ cần monitor, không cần log guest → bộ ba ' +
               '<code>-display none -serial null -monitor stdio</code> như Bài 30.</li>' +
               '</ul>' }
        ]},

      /* ── BƯỚC 4 ── */
      { title: 'Cắm ổ đĩa và card mạng, rồi kiểm chứng bằng monitor',
        blocks: [
          { t: 'p', x:
            'Bài 30 đã chỉ ra machine <code>virt</code> khai sẵn <b>32</b> khe virtio-mmio dù ' +
            'bạn không cắm gì. Bước này cắm thật vào hai khe và xác nhận chúng có mặt.' },

          { t: 'p', x:
            'Trước hết tạo một file rỗng 16 MB làm ổ đĩa. <code>qemu-img</code> là công cụ ' +
            'riêng của QEMU để tạo và chuyển đổi ảnh đĩa:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai31\n' +
            'qemu-img create -f raw disk.img 16M' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Formatting \'disk.img\', fmt=raw size=16777216' },

          { t: 'p', x:
            'Bây giờ cắm nó vào máy ảo — nhớ là <b>hai nửa</b> — và hỏi monitor:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info block\\nquit\\n\' | qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 128 -S \\\n' +
            '  -drive file=disk.img,format=raw,if=none,id=hd0 \\\n' +
            '  -device virtio-blk-device,drive=hd0 \\\n' +
            '  -display none -serial null -monitor stdio | sed -n \'2,8p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hd0 (#block195): disk.img (raw)\n' +
            '    Attached to:      /machine/peripheral-anon/device[0]\n' +
            '    Cache mode:       writeback\n' +
            '\n' +
            'floppy0: [not inserted]\n' +
            '    Removable device: not locked, tray closed' },

          { t: 'cmdx', cmd: '-drive file=disk.img,format=raw,if=none,id=hd0  -device virtio-blk-device,drive=hd0',
            title: 'Hai nửa của một ổ đĩa ảo',
            rows: [
              ['<code>file=disk.img</code>', 'File trên host chứa dữ liệu ổ đĩa', 'Có thể là file thường, hoặc cả một phân vùng thật'],
              ['<code>format=raw</code>', 'Đọc file như một dãy byte thô, byte thứ N là sector thứ N', 'Viết tường minh để QEMU khỏi phải đoán — đoán sai là một lỗ hổng bảo mật đã biết'],
              ['<code>if=none</code>', '"Đừng tự cắm giúp tôi" — chỉ tạo hậu trường, không tạo mặt tiền', 'Bỏ đi thì QEMU tự đoán một bus và bạn có thể được <b>hai</b> ổ'],
              ['<code>id=hd0</code>', 'Đặt tên cho hậu trường này', 'Sợi dây nối sang <code>-device</code>'],
              ['<code>-device virtio-blk-device</code>', 'Mặt tiền: guest thấy một ổ đĩa virtio cắm trên bus virtio-mmio', 'Hậu tố <code>-device</code> là bản mmio; bản <code>virtio-blk-pci</code> dùng cho bus PCI'],
              ['<code>drive=hd0</code>', 'Nối mặt tiền vào hậu trường tên <code>hd0</code>', 'Sai tên ở đây là lỗi ngay lúc khởi động, không phải lúc guest chạy']
            ]},

          { t: 'cal', kind: 'info', title: 'Dòng hd0 xác nhận hai nửa đã ghép đúng',
            x: '<p>Tên <code>hd0</code> mở đầu dòng chính là cái tên bạn đặt bằng <code>id=hd0</code> — QEMU ' +
               'nhắc lại đúng tên đó, không tự đổi. Số trong ngoặc <code>(#block195)</code> là một số hiệu nội ' +
               'bộ QEMU tự sinh cho backend này, khác với <code>id=hd0</code> bạn gõ — chỉ dùng để phân biệt ' +
               'các backend với nhau khi có nhiều ổ, không phải thứ bạn tự đặt hay cần nhớ.</p>' +
               '<p><code>Attached to: /machine/peripheral-anon/device[0]</code> là bằng chứng phần mặt tiền ' +
               '<code>-device virtio-blk-device,drive=hd0</code> đã tìm thấy đúng hậu trường và gắn vào — nếu ' +
               'bạn gõ sai <code>drive=</code> thành một tên không tồn tại, QEMU sẽ báo lỗi ngay lúc khởi động ' +
               'thay vì in được dòng này. <code>Cache mode: writeback</code> là giá trị QEMU tự chọn khi bạn ' +
               'không khai <code>cache=</code> — đúng chế độ mặc định được tài liệu ghi rõ.</p>' },

          { t: 'cal', kind: 'info', title: 'floppy0 ở đâu ra? Và vì sao nó vô hại',
            x: '<p><code>floppy0: [not inserted]</code> là tàn dư từ mã dùng chung của QEMU cho ' +
               'mọi kiến trúc. Machine <code>virt</code> của ARM không hề có bộ điều khiển đĩa ' +
               'mềm — đối chiếu với bản đồ bộ nhớ của Bài 30 thì không có địa chỉ nào cho nó.</p>' +
               '<p>Nó chỉ là một mục trống trong danh sách khối, không tốn địa chỉ, không xuất ' +
               'hiện trong device tree, và guest sẽ không bao giờ nhìn thấy.</p>' +
               '<p>Kỹ năng cần rèn: <b>phân biệt dòng nhiễu với dòng có nghĩa</b> trong log. Từ ' +
               'Bài 32 bạn sẽ đọc 238 dòng log nhân mỗi lần boot, và phần lớn chúng không liên ' +
               'quan gì tới vấn đề bạn đang truy.</p>' },

          { t: 'p', x:
            'Card mạng theo đúng khuôn ấy — hậu trường <code>-netdev</code>, mặt tiền ' +
            '<code>-device</code>:' },

          { t: 'code', where: 'wsl', code:
            'printf \'info network\\nquit\\n\' | qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 128 -S \\\n' +
            '  -netdev user,id=net0,hostfwd=tcp::2222-:22 \\\n' +
            '  -device virtio-net-device,netdev=net0 \\\n' +
            '  -display none -serial null -monitor stdio | sed -n \'2,8p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'virtio-net-device.0: index=0,type=nic,model=virtio-net-device,macaddr=52:54:00:12:34:56\n' +
            ' \\ net0: index=0,type=user,net=10.0.2.0,restrict=off' },

          { t: 'cmdx', cmd: 'hostfwd=tcp::2222-:22',
            title: 'Cú pháp hostfwd: [giao thức]:[host]:cổng_host-[guest]:cổng_guest',
            rows: [
              ['<code>tcp</code>', 'Giao thức chuyển tiếp. QEMU còn nhận <code>udp</code> và <code>unix</code>', 'Bỏ trống thì mặc định là <code>tcp</code>'],
              ['<code>:</code> (trống trước cổng host)', 'Bỏ trống địa chỉ host nghĩa là lắng nghe trên <b>mọi</b> giao diện mạng của host', 'Ghi rõ một IP nếu muốn giới hạn chỉ một card mạng'],
              ['<code>2222</code>', 'Cổng của <b>host</b> — nơi bạn sẽ gõ <code>ssh -p 2222</code> ở Chặng 09', ''],
              ['<code>-</code>', 'Dấu phân cách bắt buộc giữa nửa host và nửa guest', 'Không phải dấu trang trí, thiếu nó QEMU không phân tích được chuỗi'],
              ['<code>:22</code>', 'Bỏ trống địa chỉ guest, chỉ ghi cổng — theo tài liệu QEMU, khi bỏ trống nó mặc định là <code>x.x.x.15</code>, tức <code>10.0.2.15</code> trong đúng dải <code>net=10.0.2.0</code> bạn vừa thấy ở dòng trên', 'Guest chỉ có một địa chỉ nên hầu như không cần ghi tường minh']
            ]},

          { t: 'cal', kind: 'info', title: 'Mạng "user" — không cần quyền root, đổi lại có giới hạn',
            x: '<p><code>type=user</code> là chồng giao thức TCP/IP mà QEMU tự cài đặt <b>bên ' +
               'trong tiến trình của mình</b>. Không cần <code>sudo</code>, không cần cấu hình ' +
               'gì trên host — lý tưởng để học.</p>' +
               '<p>Guest nhận địa chỉ trong mạng <code>10.0.2.0/24</code>, thấy host ở ' +
               '<code>10.0.2.2</code>, và ra Internet được. Nhưng chiều ngược lại thì không: ' +
               'host <b>không</b> tự gọi vào guest được.</p>' +
               '<p><code>hostfwd=tcp::2222-:22</code> chính là lối mở cho chiều ngược ấy: mọi ' +
               'kết nối tới cổng <b>2222</b> của host được chuyển tới cổng <b>22</b> của guest. ' +
               'Đây là cách bạn sẽ <code>ssh -p 2222 root@localhost</code> vào board ảo ở Chặng ' +
               '09, khi rootfs đã có sẵn máy chủ SSH.</p>' },

          { t: 'cal', kind: 'warn', title: 'Địa chỉ MAC mặc định giống nhau ở mọi máy ảo',
            x: '<p><code>52:54:00:12:34:56</code> không phải số ngẫu nhiên — đó là giá trị QEMU ' +
               'gán cho card đầu tiên của <i>mọi</i> máy ảo trên đời.</p>' +
               '<p>Một máy ảo thì không sao. Hai máy ảo cùng lúc trên một mạng thì trùng MAC, và ' +
               'triệu chứng rất khó chịu: mạng lúc được lúc không, gói tin đi lạc sang máy kia. ' +
               'Chữa bằng <code>-device virtio-net-device,netdev=net0,mac=52:54:00:12:34:57</code>.</p>' }
        ]},

      /* ── BƯỚC 5 ── */
      { title: 'Chạy từng lệnh máy một bằng -s -S và gdb-multiarch',
        blocks: [
          { t: 'p', x:
            'Đây là lời hứa cuối Bài 30. Bạn cần <b>hai cửa sổ WSL</b>: một chạy QEMU, một chạy ' +
            'GDB. Mở cửa sổ thứ hai ngay bây giờ, cùng vào <code>~/bai31</code>.' },

          { t: 'p', x:
            'Cửa sổ thứ nhất — khởi động QEMU ở trạng thái đóng băng:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1', code:
            'cd ~/bai31\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 \\\n' +
            '  -kernel hello.elf \\\n' +
            '  -display none -serial file:gdbrun.txt -monitor none \\\n' +
            '  -s -S' },

          { t: 'p', x:
            'Terminal đứng im, không dấu nhắc, không chữ. Đó là dấu hiệu <b>đúng</b>: máy ảo đã ' +
            'dựng xong, CPU bị <code>-S</code> giữ lại ở lệnh đầu tiên, và cổng 1234 đang chờ. ' +
            'Sang cửa sổ thứ hai:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2', code:
            'cd ~/bai31\n' +
            'gdb-multiarch -q hello.elf' },

          { t: 'p', x:
            'Bên trong GDB, nối vào máy ảo rồi xem CPU đang đứng ở đâu:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'target remote localhost:1234\n' +
            'info registers pc\n' +
            'x/8i $pc' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0x0000000040080000 in _start ()\n' +
            'pc             0x40080000          0x40080000 <_start>\n' +
            '=> 0x40080000 <_start>:\tldr\tx1, 0x40080020 <done+8>\n' +
            '   0x40080004 <_start+4>:\tadr\tx0, 0x40080028\n' +
            '   0x40080008 <put_loop>:\tldrb\tw2, [x0], #1\n' +
            '   0x4008000c <put_loop+4>:\tcbz\tw2, 0x40080018 <done>\n' +
            '   0x40080010 <put_loop+8>:\tstr\tw2, [x1]\n' +
            '   0x40080014 <put_loop+12>:\tb\t0x40080008 <put_loop>\n' +
            '   0x40080018 <done>:\twfi\n' +
            '   0x4008001c <done+4>:\tb\t0x40080018 <done>' },

          { t: 'cal', kind: 'info', title: 'Toàn bộ chương trình của bạn, tám dòng, chưa chạy dòng nào',
            x: '<p><code>PC = 0x40080000</code> — đúng địa chỉ nạp mà <code>link.ld</code> của ' +
               'Bài 30 chỉ định. Mũi tên <code>=&gt;</code> đánh dấu lệnh <i>sắp</i> chạy, chưa ' +
               'chạy.</p>' +
               '<p>Để ý GDB gọi tên <code>_start</code>, <code>put_loop</code>, <code>done</code>. ' +
               'Guest không hề biết những cái tên ấy — chúng đến từ bảng ký hiệu trong file ' +
               '<code>hello.elf</code> mà bạn đưa cho GDB trên host, đúng như Bài 18 đã mổ xẻ.</p>' +
               '<p>Còn <code>x/8i</code> đọc mã lệnh từ <b>RAM của guest</b>, không phải từ file. ' +
               'Nếu hai bên khác nhau thì bạn đang nhìn thấy một lỗi nghiêm trọng — đây chính là ' +
               'cách phát hiện mã bị ghi đè.</p>' },

          { t: 'p', x:
            'Bây giờ chạy đúng <b>một</b> lệnh máy, rồi xem thanh ghi <code>x1</code>:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'stepi\n' +
            'info registers pc x1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0x0000000040080004 in _start ()\n' +
            'pc             0x40080004          0x40080004 <_start+4>\n' +
            'x1             0x9000000           150994944' },

          { t: 'cal', kind: 'why', title: 'Đây là khoảnh khắc bản đồ bộ nhớ trở thành thứ sờ được',
            x: '<p>Một lệnh <code>ldr x1, …</code> vừa chạy, và <code>x1</code> nhận ' +
               '<code>0x9000000</code> — địa chỉ thanh ghi dữ liệu của PL011, đúng con số Bài 30 ' +
               'dump ra từ device tree.</p>' +
               '<p>Bài 30 phải suy ngược từ trạng thái <i>cuối cùng</i> bằng ' +
               '<code>info registers</code>. Ở đây bạn thấy nó <b>xuất hiện</b>: tại lệnh nào, ' +
               'theo thứ tự nào. Đó là khác biệt giữa "tôi đoán chương trình làm thế" và "tôi ' +
               'nhìn thấy chương trình làm thế".</p>' +
               '<p>Cột bên phải là cùng giá trị ấy ở hệ mười: <code>150 994 944</code>. GDB luôn ' +
               'in cả hai vì có lúc bạn cần so sánh số, có lúc cần đối chiếu địa chỉ.</p>' },

          { t: 'p', x:
            'Thêm một lệnh nữa, rồi đọc chuỗi mà <code>x0</code> đang trỏ tới:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'stepi\n' +
            'info registers pc x0\n' +
            'x/s $x0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0x0000000040080008 in put_loop ()\n' +
            'pc             0x40080008          0x40080008 <put_loop>\n' +
            'x0             0x40080028          1074266152\n' +
            '0x40080028:\t"Hello from bare metal ARM64\\n"' },

          { t: 'cmdx', cmd: 'x/8i $pc   ·   x/s $x0   ·   stepi',
            title: 'Bốn lệnh GDB đủ dùng cho cả khoá học',
            rows: [
              ['<code>x</code>', '<b>ex</b>amine — xem nội dung bộ nhớ ở một địa chỉ', 'Lệnh vạn năng nhất của GDB'],
              ['<code>/8i</code>', '8 đơn vị, định dạng <b>i</b>nstruction — dịch ngược byte trong RAM thành lệnh máy', 'Định dạng khác: <code>x</code> hệ 16, <code>d</code> hệ 10, <code>s</code> chuỗi, <code>b</code> byte'],
              ['<code>$pc</code> · <code>$x0</code>', 'Giá trị hiện tại của thanh ghi. Dấu <code>$</code> là cách GDB gọi thanh ghi', '<code>$pc</code> là bí danh chung, dùng được trên mọi kiến trúc'],
              ['<code>x/s $x0</code>', 'Đọc từ địa chỉ trong <code>x0</code> như chuỗi kết thúc bằng byte 0', 'Đúng thứ vòng lặp <code>put_loop</code> đang duyệt từng byte'],
              ['<code>stepi</code>', 'Chạy đúng <b>một lệnh máy</b> rồi dừng. Viết tắt <code>si</code>', 'Khác <code>step</code> — cái đó chạy một <i>dòng mã nguồn C</i>, mà ở đây không có mã C']
            ]},

          { t: 'cal', kind: 'info', title: 'x0 khớp đúng con số bạn đã thấy trong bảng disassembly',
            x: '<p>Nhìn lại <code>x/8i $pc</code> ở đầu bước này: dòng thứ hai là ' +
               '<code>adr x0, 0x40080028</code>. Sau đúng hai lần <code>stepi</code>, thanh ghi ' +
               '<code>x0</code> giờ mang chính giá trị <code>0x40080028</code> đó — không phải trùng hợp, mà là ' +
               'bằng chứng lệnh <code>adr</code> vừa chạy đúng như bản dịch ngược đã dự đoán.</p>' +
               '<p><code>x/s $x0</code> đọc từ địa chỉ ấy như một chuỗi kết thúc bằng byte 0, và kết quả là ' +
               'chính xác <code>"Hello from bare metal ARM64\\n"</code> — dữ liệu mà <code>put_loop</code> sắp ' +
               'sao chép từng byte sang thanh ghi dữ liệu PL011. Bạn vừa nhìn thấy chuỗi <b>tại nguồn</b> của ' +
               'nó trong RAM, trước cả khi nó được in ra.</p>' },

          { t: 'p', x:
            'Thay vì bấm <code>stepi</code> hơn hai mươi lần cho hết vòng lặp, đặt điểm dừng tại ' +
            'lệnh <code>wfi</code> rồi cho chạy thẳng tới đó:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'break *0x40080018\n' +
            'continue\n' +
            'info registers pc\n' +
            'monitor info status' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Breakpoint 1 at 0x40080018\n' +
            '\n' +
            'Breakpoint 1, 0x0000000040080018 in done ()\n' +
            'pc             0x40080018          0x40080018 <done>\n' +
            'VM status: paused (debug)' },

          { t: 'cal', kind: 'info', title: 'continue vừa chạy hết toàn bộ vòng lặp còn lại, không chỉ một lệnh',
            x: '<p>Trước đó bạn mới <code>stepi</code> đúng hai lệnh, PC còn đứng ở lệnh thứ ba của ' +
               '<code>put_loop</code>. <code>continue</code> để CPU chạy tự do — không dừng cho tới khi gặp ' +
               'điểm dừng — và nó dừng đúng tại <code>0x40080018</code>, chính địa chỉ bạn vừa đặt bằng ' +
               '<code>break</code>, với tên <code>&lt;done&gt;</code> thay vì <code>&lt;put_loop&gt;</code>.</p>' +
               '<p>Nghĩa là toàn bộ 28 byte của chuỗi <code>hello.S</code> — cái bạn vừa đọc bằng ' +
               '<code>x/s $x0</code> — đã được vòng lặp sao chép hết sang PL011 trong khoảng thời gian giữa ' +
               'hai lệnh GDB này, không cần bạn bấm <code>stepi</code> thêm lần nào.</p>' },

          { t: 'cal', kind: 'tip', title: 'monitor — gõ lệnh QEMU từ bên trong GDB',
            x: '<p>Bạn đang chạy QEMU với <code>-monitor none</code>, vậy mà ' +
               '<code>monitor info status</code> vẫn trả lời. Vì tiền tố <code>monitor</code> ' +
               'nói với GDB: "chuyển nguyên câu này sang phía bên kia". QEMU nhận và trả lời qua ' +
               'chính cổng 1234.</p>' +
               '<p>Nghĩa là mọi lệnh monitor bạn học ở Bài 30 — <code>info mtree -f</code>, ' +
               '<code>info qtree</code>, <code>info registers</code> — đều gọi được từ trong ' +
               'phiên GDB, không cần cửa sổ thứ ba.</p>' +
               '<p><code>paused (debug)</code> là trạng thái thứ ba bạn gặp, cạnh ' +
               '<code>paused (prelaunch)</code> của <code>-S</code> và <code>running</code>. Nó ' +
               'nói máy ảo dừng vì <b>GDB</b> bảo dừng, chứ không phải vì dòng lệnh.</p>' },

          { t: 'p', x:
            'Thoát GDB bằng <code>detach</code> rồi <code>quit</code>. Sang cửa sổ 1 bấm ' +
            '<kbd>Ctrl</kbd>+<kbd>C</kbd> để dừng QEMU, rồi xem file log:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1', code:
            'cat gdbrun.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Hello from bare metal ARM64' },

          { t: 'cal', kind: 'info', title: 'Chuỗi được in ra trong lúc bạn đang gỡ lỗi',
            x: '<p>File chứa đủ 28 byte, dù bạn chưa hề cho chương trình "chạy tự do". Chúng ' +
               'được in ra trong lệnh <code>continue</code> — mỗi vòng ' +
               '<code>str w2, [x1]</code> đẩy một ký tự qua chardev vào file.</p>' +
               '<p>Đây là bằng chứng cuối cùng rằng ba bài 29–31 nói về cùng một cỗ máy: mã ARM64 ' +
               'do TCG dịch (Bài 29), ghi vào một địa chỉ trong bản đồ bộ nhớ (Bài 30), rồi chảy ' +
               'qua chardev ra file (Bài 31).</p>' },

          { t: 'cal', kind: 'warn', title: 'Nếu GDB báo "Connection timed out"',
            x: '<p><code>could not connect: Connection timed out.</code> có ba nguyên nhân, theo ' +
               'thứ tự hay gặp:</p>' +
               '<ul>' +
               '<li>Cửa sổ 1 chưa chạy, hoặc QEMU đã thoát vì một lỗi khác. Nhìn lại cửa sổ 1 ' +
               'trước tiên.</li>' +
               '<li>Quên <code>-s</code> trên dòng lệnh QEMU — máy ảo chạy nhưng không mở cổng ' +
               'nào.</li>' +
               '<li>Gõ nhầm cổng. <code>-s</code> luôn là <b>1234</b>; muốn số khác thì phải viết ' +
               '<code>-gdb tcp::5555</code>.</li>' +
               '</ul>' +
               '<p>Kiểm nhanh xem có ai đang nghe ở cổng 1234 không: ' +
               '<code>ss -ltn | grep 1234</code>.</p>' }
        ]},

      /* ── BƯỚC 6 ── */
      { title: 'Dọn dẹp và ghi lại dòng lệnh chuẩn của bạn',
        blocks: [
          { t: 'p', x:
            'Bạn sẽ gõ dòng lệnh QEMU hàng trăm lần trong tám chặng tới. Đừng gõ lại từ đầu mỗi ' +
            'lần — lưu nó thành một script có kiểm tra lỗi, đúng kiểu Bài 13 đã dạy:' },

          { t: 'code', where: 'file', name: '~/bai31/run-qemu.sh', code:
            '#!/usr/bin/env bash\n' +
            '# Standard QEMU launcher for the ARM64 virt machine.\n' +
            '# Usage: ./run-qemu.sh <elf-or-image> [extra qemu args...]\n' +
            'set -euo pipefail\n' +
            '\n' +
            'IMAGE="${1:?usage: run-qemu.sh <elf-or-image> [extra args]}"\n' +
            'shift\n' +
            '\n' +
            'if [ ! -f "$IMAGE" ]; then\n' +
            '  echo "error: image not found: $IMAGE" >&2\n' +
            '  exit 1\n' +
            'fi\n' +
            '\n' +
            'echo "booting $IMAGE  (exit with Ctrl-A then X)"\n' +
            'exec qemu-system-aarch64 \\\n' +
            '  -M virt \\\n' +
            '  -cpu cortex-a57 \\\n' +
            '  -m 512 \\\n' +
            '  -smp 1 \\\n' +
            '  -kernel "$IMAGE" \\\n' +
            '  -nographic \\\n' +
            '  "$@"' },

          { t: 'code', where: 'wsl', code:
            'chmod +x ~/bai31/run-qemu.sh\n' +
            '~/bai31/run-qemu.sh ~/bai31/hello.elf' },

          { t: 'code', where: 'out', nocopy: true, code:
            'booting /home/shinarus/bai31/hello.elf  (exit with Ctrl-A then X)\n' +
            'Hello from bare metal ARM64' },

          { t: 'cal', kind: 'why', title: 'Vì sao script này dùng exec và "$@"',
            x: '<p><code>exec</code> thay thế tiến trình bash bằng QEMU thay vì đẻ ra một tiến ' +
               'trình con. Kết quả: <kbd>Ctrl</kbd>+<kbd>C</kbd> đi thẳng tới QEMU, và mã thoát ' +
               'của QEMU trở thành mã thoát của script — không còn tầng trung gian nào nuốt mất ' +
               'tín hiệu.</p>' +
               '<p><code>"$@"</code> ở cuối chuyển tiếp mọi tham số còn lại xuống QEMU. Nhờ đó ' +
               'script cố định bốn tham số hay quên (<code>-cpu</code> đứng đầu danh sách) mà vẫn ' +
               'cho bạn thêm <code>-initrd</code>, <code>-append</code>, <code>-s -S</code> bất ' +
               'cứ lúc nào — đúng những gì Bài 32 cần.</p>' +
               '<p>Dấu ngoặc kép quanh <code>"$@"</code> là bắt buộc: thiếu nó thì một tham số có ' +
               'dấu cách như <code>-append "console=ttyAMA0 rdinit=/init"</code> bị tách làm ' +
               'đôi.</p>' },

          { t: 'p', x:
            'Cuối cùng, xoá những file thí nghiệm không còn cần. Giữ lại <code>hello.elf</code> ' +
            'và <code>run-qemu.sh</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai31\n' +
            'rm -f out31.txt gdbrun.txt disk.img\n' +
            'ls' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello.S  hello.elf  link.ld  run-qemu.sh' }
        ]}

    ]},

    /* ══════════════════════════════════════════════
       7. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Tám thông báo dưới đây đều được tạo ra thật trong lúc soạn bài này. Đọc trước một lượt ' +
      'thì lần đầu gặp bạn nhận ra ngay, thay vì mất nửa buổi đi tìm.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Couldn\'t load elf \'hello.elf\': The image is from incompatible architecture</code>',
         'Thiếu <code>-cpu</code>, nên <code>virt</code> dùng mặc định <code>cortex-a15</code> — lõi ARM 32 bit, không nạp được ELF ARM64',
         'Thêm <code>-cpu cortex-a57</code>'],
        ['Máy ảo chạy nhưng <b>không in gì</b> và không bao giờ dừng (khi nạp ảnh nhân Linux ARM64)',
         'Cùng nguyên nhân trên, nhưng định dạng <code>Image</code> không có tiêu đề kiến trúc để QEMU kiểm, nên nó cứ nạp rồi CPU 32 bit chạy loạn và treo im lặng',
         'Thêm <code>-cpu cortex-a57</code>. Đây là lý do phải viết <code>-cpu</code> tường minh <b>luôn luôn</b>'],
        ['<code>cannot use stdio by multiple character devices</code>',
         'Hai chardev cùng đòi stdio — thường là <code>-nographic</code> đi cùng <code>-monitor stdio</code>',
         'Chọn một: hoặc chỉ <code>-nographic</code> rồi dùng <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>C</kbd>, hoặc bộ ba <code>-display none -serial null -monitor stdio</code>'],
        ['<code>-append only allowed with -kernel option</code>',
         'Đưa tham số dòng lệnh nhân nhưng không đưa nhân. QEMU không có chỗ nào để nhét chuỗi ấy vào',
         'Thêm <code>-kernel</code>, hoặc bỏ <code>-append</code>'],
        ['<code>unable to find CPU model \'cortex-a99\'</code>',
         'Gõ sai tên CPU. QEMU không đoán tên gần đúng giúp bạn',
         '<code>qemu-system-aarch64 -M virt -cpu help</code> để xem cả 36 tên hợp lệ'],
        ['<code>Invalid SMP CPUs 600. The max CPUs supported by machine \'virt-10.2\' is 512</code>',
         'Vượt giới hạn số lõi của machine',
         'Giảm <code>-smp</code>. Khi học nên để <code>1</code>'],
        ['<code>-m 512MB: Parameter \'size\' expects a non-negative number below 2^64</code>',
         'Sai hậu tố. QEMU nhận <code>k M G T P E</code> — <b>một</b> chữ cái, không phải <code>MB</code>',
         'Viết <code>-m 512M</code> hoặc <code>-m 512</code>'],
        ['<code>could not connect: Connection timed out.</code> (trong GDB)',
         'Không có ai nghe ở cổng đó: QEMU chưa chạy, hoặc chạy mà thiếu <code>-s</code>, hoặc bạn gõ nhầm số cổng',
         'Kiểm cửa sổ QEMU trước, rồi <code>ss -ltn | grep 1234</code>']
      ]},

    /* ══════════════════════════════════════════════
       8. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Mọi tham số QEMU rơi vào <b>bốn nhóm</b>: dựng máy (<code>-M -cpu -m -smp</code>), nạp phần mềm (<code>-kernel -initrd -append -drive</code>), nối ra ngoài (<code>-serial -monitor -display -netdev</code>), điều khiển thời gian (<code>-S -s</code>).',
      '<code>-M virt</code> mặc định cho CPU <b>cortex-a15 32 bit</b>. Luôn viết <code>-cpu cortex-a57</code> tường minh — với ELF bạn được một thông báo lỗi, với ảnh nhân bạn chỉ được một màn hình câm.',
      '<code>-m 128M</code> cho RAM <code>0x40000000</code>–<code>0x47ffffff</code>; <code>-m 512M</code> kéo tới <code>0x5fffffff</code>. Điểm bắt đầu là hằng số của machine, chỉ điểm kết thúc đổi theo.',
      'Guest luôn báo RAM <b>ít hơn</b> bạn khai: <code>-m 512</code> cho <code>MemTotal 483 592 kB</code>, hụt khoảng <b>41 MB</b> dành cho mã nhân, bảng trang và vùng CMA.',
      'Giữa cổng nối tiếp ảo và terminal của bạn là một <b>chardev</b>. Một chardev chỉ có <b>một</b> đầu ra — đó là lý do <code>-nographic</code> cộng <code>-monitor stdio</code> luôn gãy.',
      'Ổ đĩa và card mạng luôn gồm <b>hai nửa</b>: <code>-drive … if=none,id=hd0</code> nối với <code>-device virtio-blk-device,drive=hd0</code> qua <code>id</code>.',
      '<code>-append</code> đi thẳng vào <code>chosen/bootargs</code>; <code>-initrd</code> thành <code>linux,initrd-start = 0x48000000</code>. Hiệu hai đầu mút bằng <b>đúng kích thước file initramfs</b> — ở lần chạy này là 1 035 400 byte.',
      '<b>Chữ hoa <code>-S</code> dừng máy, chữ thường <code>-s</code> mở cổng 1234.</b> Gỡ lỗi khởi động cần cả hai; thiếu <code>-S</code> thì chương trình đã chạy xong trước khi GDB kịp nối vào.',
      'Trong GDB: <code>stepi</code> chạy một lệnh máy, <code>x/8i $pc</code> xem mã, <code>x/s $x0</code> đọc chuỗi, <code>monitor …</code> chuyển tiếp lệnh sang QEMU. <code>x1</code> nhận <code>0x9000000</code> ngay sau lệnh đầu tiên.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo',
      x: '<p>Bạn đã có cỗ máy (Bài 30) và biết điều khiển nó (Bài 31). Bài 32 nạp vào đó thứ ' +
         'đáng giá: một <b>nhân Linux ARM64 thật</b>, cùng một hệ thống tệp ban đầu do chính bạn ' +
         'đóng gói, để đi tới một dấu nhắc shell chạy bên trong máy ảo.</p>' +
         '<p>Con số mục tiêu: từ lệnh <code>qemu-system-aarch64</code> tới dấu nhắc ' +
         '<code>~ #</code> mất khoảng <b>3,3 giây</b> thời gian nhân và <b>238 dòng</b> log. Bạn ' +
         'sẽ đọc từng nhóm dòng ' +
         'ấy và chỉ ra được dòng nào nói PL011 ở <code>0x9000000</code> đã được nhận diện, dòng ' +
         'nào nói initramfs đã giải nén xong, và dòng nào là việc cuối cùng nhân làm trước khi ' +
         'trao quyền cho tiến trình <code>init</code> của bạn.</p>' +
         '<p>Bài 32 cũng cho bạn gặp một cảnh báo ở bảng trên bằng xương bằng thịt: bỏ ' +
         '<code>-initrd</code> đi và nhân kết thúc bằng <code>Kernel panic - not syncing: VFS: ' +
         'Unable to mount root fs on unknown-block(0,0)</code>.</p>' }

  ],

  quiz: [
    { q: 'Bạn chạy <code>qemu-system-aarch64 -M virt -m 512 -kernel Image -nographic</code> với một ảnh nhân Linux ARM64 hợp lệ. Terminal không in ra chữ nào và QEMU không thoát. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Ảnh nhân bị hỏng trong lúc tải về',
        'Thiếu <code>-cpu</code>, nên máy ảo đang chạy lõi <code>cortex-a15</code> 32 bit và treo ngay khi nhảy vào mã ARM64',
        'Thiếu <code>-initrd</code>, nhân không tìm được hệ thống tệp gốc',
        '<code>-nographic</code> không nối cổng nối tiếp vào terminal'
      ],
      a: 1,
      why: 'Machine <code>virt</code> mặc định là <code>cortex-a15</code> — lõi ARM 32 bit — bất kể bạn chạy chương trình tên <code>qemu-system-aarch64</code>. Với ELF, QEMU đọc được tiêu đề kiến trúc nên báo lỗi rõ ràng; nhưng định dạng <code>Image</code> của nhân ARM64 không có tiêu đề để QEMU kiểm, nên nó cứ nạp, CPU 32 bit đọc mã 64 bit như rác và treo im lặng. Thiếu <code>-initrd</code> thì đã ra hàng trăm dòng log rồi mới panic chứ không câm từ đầu; còn <code>-nographic</code> thì luôn nối cổng nối tiếp vào terminal.' },

    { q: 'Vì sao khai một ổ đĩa cần <b>cả</b> <code>-drive … if=none,id=hd0</code> lẫn <code>-device virtio-blk-device,drive=hd0</code>?',
      opts: [
        'Vì <code>-drive</code> tạo file trên host còn <code>-device</code> định dạng nó',
        'Vì QEMU tách hậu trường (dữ liệu lấy từ đâu) khỏi mặt tiền (guest nhìn thấy thiết bị gì), nên hai bên ghép tự do với nhau',
        'Vì <code>-device</code> chỉ cần khi guest chạy nhân Linux',
        'Vì <code>if=none</code> vô hiệu hoá <code>-drive</code>, phải có <code>-device</code> bật lại'
      ],
      a: 1,
      why: 'Cùng một <code>disk.img</code> có thể được guest nhìn thấy như ổ virtio, ổ SCSI hay thẻ SD tuỳ <code>-device</code> bạn chọn; ngược lại cùng một <code>virtio-blk-device</code> có thể lấy dữ liệu từ file raw, qcow2 hay một phân vùng thật. Tách đôi là cách QEMU tránh phải định nghĩa mọi tổ hợp. <code>if=none</code> nghĩa là "đừng tự cắm giúp tôi" — không có nó QEMU sẽ đoán một bus và bạn có thể được hai ổ đĩa. <code>id</code> là sợi dây nối hai nửa. Khuôn này lặp lại y hệt với <code>-netdev</code> và mạng.' },

    { q: '<code>-s</code> và <code>-S</code> khác nhau thế nào?',
      opts: [
        'Giống nhau, <code>-S</code> chỉ là dạng viết hoa cho dễ đọc',
        '<code>-s</code> mở máy chủ GDB ở cổng 1234; <code>-S</code> dừng CPU ngay khi dựng xong máy',
        '<code>-s</code> chạy chậm lại để dễ quan sát; <code>-S</code> chạy từng bước',
        '<code>-s</code> lưu trạng thái máy ảo; <code>-S</code> khôi phục lại'
      ],
      a: 1,
      why: 'Chữ thường mở cổng, chữ hoa dừng máy — <code>-s</code> là viết tắt của <code>-gdb tcp::1234</code>, còn <code>-S</code> là <b>S</b>top. Chúng độc lập nhau, nhưng gỡ lỗi khởi động thì cần cả hai: nếu chỉ có <code>-s</code>, một chương trình như <code>hello.elf</code> đã chạy xong và nằm im trong <code>wfi</code> trước khi bạn kịp gõ <code>target remote</code> — bạn nối vào được mà chẳng còn gì để xem.' },

    { q: 'Trong device tree dump ra khi có <code>-initrd</code>, bạn thấy <code>linux,initrd-start = 0x48000000</code> và <code>linux,initrd-end = 0x480fcc88</code>. Hiệu hai số này cho biết gì?',
      opts: [
        'Dung lượng RAM mà nhân được phép dùng',
        'Kích thước file initramfs tính bằng byte — <code>0xfcc88</code> = 1 035 400, đúng bằng file trên host',
        'Khoảng trống nhân phải chừa để giải nén initramfs',
        'Địa chỉ mà nhân sẽ được nạp vào'
      ],
      a: 1,
      why: 'QEMU đổ nguyên file <code>-initrd</code> vào RAM rồi ghi hai đầu mút vào nút <code>chosen</code> để nhân biết tìm ở đâu. Hiệu đúng bằng kích thước file, không lệch một byte — kiểm được bằng <code>ls -l</code> trên host. Đây là ví dụ rõ nhất cho thấy nút <code>chosen</code> không mô tả phần cứng mà <b>chuyển thư</b> từ dòng lệnh của bạn sang nhân. Địa chỉ <code>0x48000000</code> cách đầu RAM <code>0x40000000</code> đúng 128 MB, đủ xa để nhân giải nén mà không đè lên chính nó.' },

    { q: 'Bạn muốn vừa xem log guest vừa gõ được lệnh monitor. Cách nào <b>không</b> chạy được?',
      opts: [
        '<code>-nographic</code>, rồi bấm <kbd>Ctrl</kbd>+<kbd>A</kbd> <kbd>C</kbd> để chuyển qua lại',
        '<code>-serial mon:stdio</code>',
        '<code>-nographic -monitor stdio</code>',
        '<code>-display none -serial file:log.txt -monitor stdio</code>, đọc log bằng <code>tail -f</code> ở cửa sổ khác'
      ],
      a: 2,
      why: 'Một chardev chỉ có một đầu ra, và stdio là tài nguyên duy nhất. <code>-nographic</code> đã đăng ký stdio cho cổng nối tiếp ở chế độ <code>mon:stdio</code>; thêm <code>-monitor stdio</code> là đăng ký lần thứ hai, và QEMU báo <code>cannot use stdio by multiple character devices</code>. Ba cách còn lại đều hợp lệ vì mỗi chardev có đích riêng — cách thứ tư đưa log ra file nên stdio còn trống cho monitor.' },

    { q: 'Trong GDB, <code>monitor info mtree -f</code> in ra bản đồ bộ nhớ dù QEMU chạy với <code>-monitor none</code>. Vì sao được?',
      opts: [
        'Vì GDB tự đọc bản đồ bộ nhớ từ file ELF bạn nạp',
        'Vì tiền tố <code>monitor</code> bảo GDB chuyển nguyên câu lệnh sang phía bên kia, và phía bên kia là QEMU — nó trả lời qua chính cổng 1234',
        'Vì <code>-monitor none</code> chỉ tắt dấu nhắc chứ không tắt monitor',
        'Vì <code>gdb-multiarch</code> tự khởi động một monitor phụ'
      ],
      a: 1,
      why: 'Giao thức gỡ lỗi từ xa của GDB có một gói tin riêng để chuyển tiếp lệnh thô tới bên bị gỡ lỗi, và QEMU cài đặt nó bằng cách đưa chuỗi ấy thẳng vào bộ phân tích lệnh monitor. Nên cổng 1234 vừa mang lệnh đọc thanh ghi vừa mang lệnh monitor. Hệ quả thực dụng: mọi lệnh của Bài 30 — <code>info mtree -f</code>, <code>info qtree</code>, <code>info registers</code> — đều dùng được ngay trong phiên GDB, không cần mở thêm cửa sổ. GDB không thể tự suy ra bản đồ bộ nhớ từ ELF, vì ELF chỉ mô tả chương trình chứ không mô tả cỗ máy.' }
  ]
});

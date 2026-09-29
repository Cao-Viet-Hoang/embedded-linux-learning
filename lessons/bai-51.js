/* Bài 51 — Luật chơi trong kernel space
   Chặng 10 — Kernel module và Driver
   Sáu luật một module phải theo, mỗi luật chứng minh bằng một thí nghiệm build hoặc nạp thật:
   không libc (stdio.h không tồn tại, printf → "puts" undefined), không float (-mgeneral-regs-only),
   stack 16 KiB (cảnh báo -Wframe-larger-than=2048), printk + tám mức log từ phía module
   (pr_*, dmesg -r, pr_debug/-DDEBUG, %p/%px/%pS), kmalloc/kfree (lớp kích thước qua ksize,
   giới hạn 4 MiB, vmalloc, rò rỉ đo bằng SUnreclaim), copy_from_user với con trỏ tốt và xấu.
   Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1),
   kernel ~/bai38/linux-6.18.45, initramfs chép từ ~/bai32/initramfs.

   BẢN TẠM — phiên viết bài bị gián đoạn hai lần vì lý do không rõ. Phần "hậu quả của một con trỏ
   sai" (oops) hiện chỉ giải thích bằng lời, chưa có bản ghi thật trong bài; phần copy_to_user chỉ
   có lý thuyết. Sẽ làm lại sau — xem docs/course-notes.md, mục Lesson 51. */

Lesson.register({
  id: 'bai-51',
  title: 'Luật chơi trong kernel space',
  minutes: 50,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Module <code>hello.ko</code> ở Bài 50 chỉ gọi đúng một hàm của kernel: <code>_printk</code>. ' +
    'Một driver thật cần nhiều hơn thế — nó phải xin bộ nhớ, nhận dữ liệu từ chương trình ' +
    'userspace, tính toán, ghi log có mức độ. Và bạn sẽ muốn làm những việc đó bằng những công cụ ' +
    'quen thuộc từ Bài 14–24: <code>printf</code>, <code>malloc</code>, <code>float</code>, một mảng ' +
    'cục bộ vài KB.<br><br>' +
    'Trong kernel, không công cụ nào trong số đó dùng được như cũ. Bài này đi qua sáu luật, và ' +
    'với mỗi luật bạn sẽ <b>tự thấy</b> điều gì xảy ra khi phá nó: trình biên dịch từ chối, ' +
    '<code>modpost</code> từ chối, trình biên dịch cảnh báo, hoặc kernel lặng lẽ mất bộ nhớ cho ' +
    'tới lần boot sau. Không có luật nào ở đây là quy ước tuỳ ý — mỗi luật đều có một lý do kỹ ' +
    'thuật bạn sẽ đọc được trong mã nguồn kernel.',

  goals: [
    'Giải thích vì sao module không có libc, và tìm hàm thay thế trong <code>Module.symvers</code> ' +
      'thay vì đoán.',
    'Giải thích vì sao <code>-mgeneral-regs-only</code> cấm <code>float</code>, và nhận ra lỗi ' +
      '<code>incompatible with the use of floating-point types</code>.',
    'Tính kích thước stack kernel ARM64 từ <code>THREAD_SIZE</code>, và đọc cảnh báo ' +
      '<code>-Wframe-larger-than=</code> như một lỗi cần sửa.',
    'Chọn đúng mức <code>pr_*</code> cho một dòng log, đọc mức đó bằng <code>dmesg -r</code>, và bật ' +
      '<code>pr_debug</code> khi cần.',
    'Dùng <code>kmalloc</code>/<code>kfree</code> với cờ <code>GFP_KERNEL</code>, giải thích lớp ' +
      'kích thước và giới hạn của nó, và đo một rò rỉ bộ nhớ kernel.',
    'Giải thích vì sao phải dùng <code>copy_from_user</code>/<code>copy_to_user</code> thay vì đọc ' +
      'thẳng con trỏ userspace, và đọc giá trị trả về của chúng.'
  ],

  blocks: [

    /* ============================================================
       1. TỔNG QUAN: VÌ SAO CÓ LUẬT
       ============================================================ */
    { t: 'h2', x: 'Vì sao kernel có luật riêng' },

    { t: 'p', x:
      'Bài 50 đã kết thúc bằng một bảng so sánh chương trình userspace với module. Bài này đào sâu ' +
      'vào bốn dòng của bảng đó. Tất cả các luật đều có chung một gốc: <b>mã module chạy bên trong ' +
      'chính cái kernel mà mọi tiện ích userspace dựa vào</b>. Thư viện C, bộ cấp phát ' +
      '<code>malloc</code>, cơ chế lưu thanh ghi dấu phẩy động khi chuyển tiến trình — tất cả đều ' +
      'là thứ kernel <b>cung cấp cho</b> userspace. Mã kernel không thể dựa vào chúng mà không dựa ' +
      'vào chính mình.' },

    { t: 'cal', kind: 'tip', title: 'Một phép so sánh: người thợ sửa điện trong toà nhà mất điện', x:
      'Người ở trong toà nhà (userspace) có đèn, thang máy, ổ cắm — họ không cần biết điện đến từ ' +
      'đâu. Người thợ điện (kernel) thì làm việc <b>ở chính tủ điện</b>: anh ta không thể cắm máy ' +
      'khoan vào ổ cắm của toà nhà để sửa tủ điện, vì ổ cắm đó lấy điện từ chính cái tủ đang mở. ' +
      'Anh ta mang theo đồ nghề riêng, nhỏ hơn, hạn chế hơn — và một sai sót của anh ta làm cả toà ' +
      'nhà tối, không chỉ một căn hộ.' },

    { t: 'table',
      head: ['Luật', 'Userspace làm thế này', 'Kernel làm thế này', 'Phá luật thì'],
      rows: [
        ['1. Không libc', '<code>printf</code>, <code>strlen</code> của glibc', 'Chỉ những hàm kernel <b>export</b> — <code>snprintf</code>, <code>strlen</code> của kernel', 'Lỗi lúc dịch hoặc lúc <code>modpost</code>'],
        ['2. Không float', '<code>float x = a / 10.0f;</code>', 'Số nguyên, số thập phân cố định (nhân 10, nhân 1000)', 'Lỗi lúc dịch'],
        ['3. Stack nhỏ', 'Stack 8 MiB (<code>ulimit -s</code> = 8192)', 'Stack <b>16 KiB</b> cho mỗi tiến trình', 'Cảnh báo lúc dịch; tràn thật thì panic'],
        ['4. Log có mức', '<code>printf</code> ra <code>stdout</code>', '<code>pr_err</code>, <code>pr_info</code>… vào bộ đệm log', 'Log quan trọng bị lọc mất, hoặc console ngập log'],
        ['5. Bộ nhớ không tự dọn', '<code>malloc</code>; hệ điều hành dọn khi tiến trình thoát', '<code>kmalloc</code>; <b>không ai</b> dọn hộ', 'Rò rỉ tới lần boot sau'],
        ['6. Không tin con trỏ userspace', 'Con trỏ nào cũng là của chính mình', '<code>copy_from_user</code> / <code>copy_to_user</code>', 'Lỗ hổng bảo mật, hoặc oops']
      ] },

    { t: 'p', x:
      'Luật 4 và 5 không có trình biên dịch nào bắt lỗi giúp bạn — đó là lý do chúng nguy hiểm hơn ' +
      'ba luật đầu. Phần thực hành đi qua cả sáu, theo đúng thứ tự này.' },

    /* ============================================================
       2. KHÔNG CÓ LIBC
       ============================================================ */
    { t: 'h2', x: 'Luật 1: không có thư viện C' },

    { t: 'p', x:
      'Bài 17 đã cho bạn thấy <code>printf</code> nằm trong <code>libc.so.6</code>, một file ' +
      'userspace được <code>ld-linux</code> nạp vào tiến trình. Module thì không phải tiến trình và ' +
      'không có trình liên kết động nào ở userspace nạp nó — chính kernel nạp nó (sơ đồ vòng đời Bài ' +
      '50). Kernel chỉ nối được một lời gọi hàm trong module tới <b>một hàm đang có trong kernel</b> ' +
      'và đã được <b>export</b>. Không có <code>libc.so.6</code> nào trong kernel để nối tới.' },

    { t: 'p', x:
      'Luật này bị chặn ở <b>hai</b> chỗ khác nhau, và bước 1 sẽ cho bạn gặp cả hai:' },

    { t: 'list', ordered: true, items: [
      '<b>Lúc dịch:</b> cờ <code>-nostdinc</code> (bảng 95 cờ ở Bài 50) khiến trình biên dịch không ' +
        'tìm trong <code>/usr/include</code>. <code>#include &lt;stdio.h&gt;</code> dừng ngay với ' +
        '<code>fatal error: stdio.h: No such file or directory</code>.',
      '<b>Lúc <code>modpost</code>:</b> nếu bạn lách bằng cách tự khai báo ' +
        '<code>int printf(const char *fmt, ...);</code>, file vẫn dịch được — nhưng <code>modpost</code> ' +
        'tra <code>Module.symvers</code>, không thấy ai export ký hiệu đó, và báo ' +
        '<code>undefined!</code>. Không có <code>.ko</code> nào ra đời.'
    ] },

    { t: 'p', x:
      'Vậy thay bằng gì? Kernel tự viết lại phần lớn những hàm chuỗi và bộ nhớ quen thuộc, cùng tên, ' +
      'gần cùng hành vi. Nguồn sự thật là <code>Module.symvers</code> mà Bài 50 đã đếm: <b>20 745</b> ' +
      'ký hiệu. Kiểm tra một hàm có dùng được hay không mất một dòng <code>grep</code>, bạn không cần ' +
      'nhớ danh sách:' },

    { t: 'table',
      head: ['Hàm libc bạn quen', 'Trong kernel', 'Ghi chú'],
      rows: [
        ['<code>printf</code>', '<code>printk</code> / <code>pr_info</code>…', 'Ghi vào bộ đệm log, không phải <code>stdout</code>. Luật 4.'],
        ['<code>sprintf</code>, <code>snprintf</code>', '<code>sprintf</code>, <code>snprintf</code>', 'Có sẵn, cùng tên. Luôn dùng <code>snprintf</code> — không có kích thước thì tràn bộ đệm.'],
        ['<code>strlen</code>, <code>strcpy</code>, <code>memcpy</code>, <code>memset</code>', 'Cùng tên', '<code>strcpy</code> có nhưng không nên dùng; kernel khuyến nghị <code>strscpy</code>.'],
        ['<code>atoi</code>, <code>strtol</code>', '<code>kstrtoint</code>, <code>kstrtoul</code>…', 'Trả về mã lỗi thay vì âm thầm trả 0 cho chuỗi sai.'],
        ['<code>malloc</code>, <code>free</code>', '<code>kmalloc</code>, <code>kfree</code>', 'Thêm tham số cờ (<code>GFP_KERNEL</code>). Luật 5.'],
        ['<code>fopen</code>, <code>sin</code>, <code>sqrt</code>', 'Không có', 'Driver không mở file; kernel không có thư viện toán dấu phẩy động. Luật 2.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Không cần nhớ bảng này — hỏi Module.symvers', x:
      'Muốn biết một hàm có dùng được trong module không, chạy ' +
      '<code>grep -w TÊN_HÀM ~/bai38/linux-6.18.45/Module.symvers</code>. Có dòng → hàm được export, ' +
      'cột thứ tư cho biết <code>EXPORT_SYMBOL</code> hay <code>EXPORT_SYMBOL_GPL</code> (Bài 50). ' +
      'Không có dòng → hoặc hàm không tồn tại trong kernel, hoặc nó là macro/hàm <code>inline</code> ' +
      'trong header (khi đó <code>grep</code> trong <code>include/linux/</code>). Bước 1 chạy đúng ' +
      'lệnh này.' },

    /* ============================================================
       3. KHÔNG CÓ FLOAT
       ============================================================ */
    { t: 'h2', x: 'Luật 2: không có dấu phẩy động' },

    { t: 'p', x:
      'CPU ARM64 có một bộ thanh ghi riêng cho số thực và SIMD: 32 thanh ghi <code>v0</code>–' +
      '<code>v31</code>, mỗi thanh 128 bit, tức <b>512 byte</b> trạng thái. Khi kernel chuyển từ tiến ' +
      'trình A sang tiến trình B (Bài 20), nó phải cất trạng thái của A để B không nhìn thấy và không ' +
      'ghi đè số thực của A. Nhưng kernel <b>chỉ cất bộ thanh ghi đó khi thật sự cần</b> — lúc đổi ' +
      'tiến trình ở userspace — chứ không cất mỗi lần một syscall hay một ngắt đi vào kernel. Cất ' +
      '512 byte trên mọi lối vào kernel sẽ làm chậm mọi syscall.' },

    { t: 'p', x:
      'Hệ quả: khi mã kernel đang chạy, các thanh ghi <code>v0</code>–<code>v31</code> vẫn chứa số ' +
      'thực của <b>tiến trình userspace vừa gọi vào kernel</b>. Nếu module của bạn dùng ' +
      '<code>float</code>, trình biên dịch sẽ đặt giá trị vào đó và âm thầm làm hỏng phép tính của ' +
      'một chương trình khác. Kernel chặn điều này từ gốc bằng cờ <code>-mgeneral-regs-only</code>: ' +
      'trình biên dịch chỉ được dùng thanh ghi số nguyên <code>x0</code>–<code>x30</code>.' },

    { t: 'fig',
      cap: 'Mã kernel chạy "nhờ" tiến trình đã gọi syscall, và kernel không cất thanh ghi dấu phẩy ' +
           'động của tiến trình đó khi vào kernel. Một phép tính <code>float</code> trong module sẽ ' +
           'ghi đè <code>v0</code> của chương trình người dùng. <code>-mgeneral-regs-only</code> biến ' +
           'lỗi âm thầm lúc chạy đó thành lỗi rõ ràng lúc dịch.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Tiến trình userspace có giá trị 3.14 trong thanh ghi v0; nó gọi syscall vào kernel; kernel chỉ cất thanh ghi số nguyên; nếu module dùng float, v0 bị ghi đè thành 23.5; khi quay về userspace chương trình đọc v0 sai">' +
        '<rect class="d-box" x="20" y="20" width="200" height="90" rx="6"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">Tiến trình userspace</text>' +
        '<text class="d-tm" x="120" y="68" text-anchor="middle">v0 = 3.14</text>' +
        '<text class="d-ts" x="120" y="90" text-anchor="middle">đang tính dở, gọi read()</text>' +
        '<line class="d-line" x1="220" y1="65" x2="272" y2="65"/>' +
        '<path class="d-arrow" d="M 280 65 l -9 -4 l 0 8 z"/>' +
        '<text class="d-ts" x="226" y="56">syscall</text>' +
        '<rect class="d-box-p" x="280" y="20" width="420" height="90" rx="6"/>' +
        '<text class="d-t" x="296" y="44">Kernel — chạy nhân danh tiến trình đó</text>' +
        '<text class="d-ts" x="296" y="66">cất x0–x30 (số nguyên) · KHÔNG cất v0–v31 (512 B)</text>' +
        '<text class="d-ts" x="296" y="88">→ v0 vẫn là của userspace trong suốt lúc kernel chạy</text>' +
        '<rect class="d-box-w" x="20" y="140" width="330" height="90" rx="6"/>' +
        '<text class="d-t" x="36" y="164">Nếu module được dùng float</text>' +
        '<text class="d-tm" x="36" y="186">v0 = 23.5  (ghi đè)</text>' +
        '<text class="d-ts" x="36" y="208">quay về userspace: chương trình đọc v0 sai,</text>' +
        '<text class="d-ts" x="36" y="222">không có thông báo lỗi nào</text>' +
        '<rect class="d-box-g" x="370" y="140" width="330" height="90" rx="6"/>' +
        '<text class="d-t" x="386" y="164">Thực tế: -mgeneral-regs-only</text>' +
        '<text class="d-ts" x="386" y="186">trình biên dịch từ chối dùng v0–v31</text>' +
        '<text class="d-ts" x="386" y="208">→ lỗi ngay lúc make, trước khi có .ko</text>' +
        '<line class="d-line" x1="360" y1="110" x2="360" y2="132"/>' +
        '<path class="d-arrow" d="M 360 140 l -4 -8 l 8 0 z"/>' +
        '</svg>' },

    { t: 'p', x:
      'Bước 2 sẽ cho bạn thấy một chi tiết dễ gây nhầm: một phép tính <code>float</code> chỉ trên ' +
      '<b>hằng số</b> (<code>23.5f * 1.8f + 32</code>) lại build được, vì trình biên dịch tính sẵn ' +
      'kết quả lúc dịch và không sinh lệnh số thực nào. Chỉ khi giá trị chỉ biết được lúc chạy ' +
      '(ví dụ đọc từ cảm biến) thì lỗi mới xuất hiện. Đừng kết luận "float dùng được" từ một ví dụ ' +
      'chỉ có hằng số.' },

    { t: 'cal', kind: 'why', title: 'Vậy driver cảm biến nhiệt độ tính 23,5 °C thế nào?', x:
      '<p>Bằng <b>số thập phân cố định</b> (fixed-point): lưu nhiệt độ theo đơn vị nhỏ hơn, dưới ' +
      'dạng số nguyên. 23,5 °C thành <code>23500</code> mili-độ. Đổi sang °F: ' +
      '<code>23500 * 9 / 5 + 32000 = 74300</code> mili-°F — toàn phép số nguyên. Đây đúng là cách ' +
      'kernel làm: subsystem <code>hwmon</code> quy định nhiệt độ trong sysfs tính bằng ' +
      '<b>mili-độ C</b>, và <code>temp_daemon</code> ở Bài 24 nếu đọc một cảm biến thật sẽ nhận ' +
      '<code>23500</code>, không phải <code>23.5</code>.</p>' +
      '<p>Khi một driver thật sự cần SIMD (mã hoá, nén, checksum), nó bọc đoạn mã đó trong ' +
      '<code>kernel_neon_begin()</code> / <code>kernel_neon_end()</code> — kernel cất trạng thái của ' +
      'userspace trước và trả lại sau. Đó là công cụ cho mã tối ưu hiệu năng trong kernel lõi, không ' +
      'phải cho một phép chia trong driver.</p>' },

    /* ============================================================
       4. STACK NHỎ
       ============================================================ */
    { t: 'h2', x: 'Luật 3: stack kernel chỉ có 16 KiB' },

    { t: 'p', x:
      'Ở userspace, <code>ulimit -s</code> trên WSL in <code>8192</code>: stack chính của một tiến ' +
      'trình được phép lớn tới <b>8 MiB</b>, và nó lớn dần khi cần. Mỗi tiến trình cũng có một ' +
      '<b>stack kernel</b> riêng, dùng khi nó đang ở trong kernel (trong syscall, hoặc khi mã module ' +
      'của bạn chạy nhân danh nó). Stack đó có kích thước <b>cố định</b>, cấp một lần khi tạo tiến ' +
      'trình, và không lớn thêm được.' },

    { t: 'p', x:
      'Kích thước ấy đọc được trong mã nguồn, không cần đoán. Trên ARM64 nó là ' +
      '<code>THREAD_SIZE</code> trong <code>arch/arm64/include/asm/memory.h</code>:' },

    { t: 'code', where: 'file', name: 'arch/arm64/include/asm/memory.h:115–131 (6.18.45, rút gọn)', lang: 'c', nocopy: true, code:
      '#define MIN_THREAD_SHIFT\t(14 + KASAN_THREAD_SHIFT)\n' +
      '...\n' +
      '#define THREAD_SHIFT\t\tMIN_THREAD_SHIFT\n' +
      '...\n' +
      '#define THREAD_SIZE\t\t(UL(1) << THREAD_SHIFT)',
      notes: [
        '<code>KASAN_THREAD_SHIFT</code> là <code>0</code> vì <code>.config</code> của bạn có <code># CONFIG_KASAN is not set</code>. Vậy <code>THREAD_SHIFT</code> = 14 và <code>THREAD_SIZE</code> = 2<sup>14</sup> = <b>16 384 byte</b> = 16 KiB.',
        'Bật KASAN (công cụ tìm lỗi bộ nhớ) thì shift thành 15, stack gấp đôi — vì KASAN làm mỗi khung stack phình ra.',
        '16 KiB so với 8 MiB là nhỏ hơn <b>512 lần</b>. Và 16 KiB đó dùng chung cho cả chuỗi hàm đang lồng nhau: syscall → VFS → driver của bạn → hàm driver gọi.'
      ] },

    { t: 'p', x:
      'Vì sao nhỏ như vậy? Vì kernel phải cấp một stack như thế cho <b>mọi</b> tiến trình và luồng ' +
      'đang tồn tại, ngay cả khi chúng đang ngủ. Một hệ nhúng có 200 luồng thì 16 KiB mỗi luồng đã ' +
      'là 3,2 MB bộ nhớ vật lý không thể swap. Nếu mỗi stack kernel là 8 MiB như userspace, con số ' +
      'đó thành 1,6 GB.' },

    { t: 'p', x:
      'Hệ quả thực tế cho người viết driver: <b>không đặt mảng lớn trên stack</b>. Một ' +
      '<code>char buf[4096]</code> cục bộ — hoàn toàn bình thường ở userspace — đã chiếm một phần tư ' +
      'stack. Kernel có một lưới an toàn lúc dịch: cờ <code>-Wframe-larger-than=</code>, giá trị lấy ' +
      'từ <code>CONFIG_FRAME_WARN</code>. <code>.config</code> của bạn có <code>CONFIG_FRAME_WARN=2048</code> ' +
      '(mặc định của <code>lib/Kconfig.debug</code> cho mọi kiến trúc 64 bit). Bước 3 sẽ vượt ngưỡng ' +
      'đó để bạn thấy cảnh báo.' },

    { t: 'cal', kind: 'warn', title: 'Cảnh báo này không phải để bỏ qua', x:
      'Cảnh báo <code>frame size … is larger than 2048 bytes</code> <b>không</b> chặn build — ' +
      '<code>.ko</code> vẫn ra đời, và nạp thử có khi vẫn chạy được, vì lúc đó stack còn trống. Nhưng ' +
      'cùng hàm đó, gọi từ một đường sâu hơn (một hệ thống file, một ngắt lồng vào), có thể làm tràn ' +
      'stack. Kernel defconfig này có <code>CONFIG_VMAP_STACK=y</code>: stack nằm trong vùng ảo có ' +
      'trang bảo vệ ở hai đầu, nên tràn stack sẽ bị phát hiện và kernel <b>panic</b> với thông báo ' +
      '<code>kernel stack overflow</code> thay vì âm thầm ghi đè bộ nhớ khác. Cách sửa luôn giống ' +
      'nhau: chuyển bộ đệm lớn sang <code>kmalloc</code> (luật 5), hoặc sang biến <code>static</code> ' +
      'nếu chỉ có một người dùng tại một thời điểm.' },

    /* ============================================================
       5. PRINTK VÀ MỨC LOG
       ============================================================ */
    { t: 'h2', x: 'Luật 4: printk và tám mức log, nhìn từ phía module' },

    { t: 'p', x:
      'Bài 41 đã dạy toàn bộ cơ chế phía <b>người đọc</b> log: tám mức từ 0 đến 7, mô hình hai tầng ' +
      '(mọi dòng vào bộ đệm log, chỉ dòng có mức <b>nhỏ hơn</b> ngưỡng console mới in ra console), ' +
      'bốn con số trong <code>/proc/sys/kernel/printk</code>, <code>loglevel=</code> và ' +
      '<code>dmesg -n</code>. Bài này không dạy lại những thứ đó. Nó trả lời câu hỏi phía <b>người ' +
      'viết</b>: dòng log của tôi nên ở mức nào, và viết thế nào?' },

    { t: 'table',
      head: ['Macro', 'Mức', 'Dùng khi', 'Ví dụ trong một driver cảm biến'],
      rows: [
        ['<code>pr_emerg</code>', '0', 'Hệ thống không dùng được nữa', 'Hầu như không bao giờ dùng trong driver'],
        ['<code>pr_alert</code>', '1', 'Phải xử lý ngay', 'Hiếm'],
        ['<code>pr_crit</code>', '2', 'Tình trạng nguy kịch', 'Cảm biến báo quá nhiệt phần cứng'],
        ['<code>pr_err</code>', '3', 'Một thao tác thất bại', '<code>failed to read register 0x0f: -5</code>'],
        ['<code>pr_warn</code>', '4', 'Có vấn đề nhưng vẫn chạy tiếp', 'Giá trị ngoài khoảng hợp lệ, dùng giá trị mặc định'],
        ['<code>pr_notice</code>', '5', 'Bình thường nhưng đáng chú ý', 'Chuyển sang chế độ tiết kiệm năng lượng'],
        ['<code>pr_info</code>', '6', 'Thông tin', 'Một dòng lúc <code>probe</code> thành công — không hơn'],
        ['<code>pr_debug</code>', '7', 'Gỡ lỗi', 'Giá trị từng lần đọc thanh ghi']
      ] },

    { t: 'p', x:
      'Ba điểm trong bảng mà người mới hay sai, và bước 4 sẽ đo cả ba:' },

    { t: 'list', ordered: true, items: [
      '<b><code>pr_debug</code> không in gì cả, theo mặc định.</b> Nó không chỉ bị lọc khỏi console ' +
        '— nó <b>không được biên dịch</b> vào module. Kernel này có ' +
        '<code># CONFIG_DYNAMIC_DEBUG is not set</code>, nên <code>pr_debug</code> chỉ sinh mã khi file ' +
        'được dịch với <code>-DDEBUG</code>. Bạn sẽ thấy chuỗi <code>level 7 debug</code> vắng mặt ' +
        'hẳn trong file <code>.ko</code>.',
      '<b><code>printk</code> không ghi mức thì nhận mức mặc định</b> — ' +
        '<code>CONFIG_MESSAGE_LOGLEVEL_DEFAULT=4</code> trên kernel này, tức <code>warn</code>. Một ' +
        'dòng thông tin viết bằng <code>printk</code> trần sẽ bị coi như một cảnh báo. Luôn dùng ' +
        '<code>pr_*</code>.',
      '<b>Thiếu <code>\\n</code> cuối dòng</b> thì dòng log có thể bị giữ lại, chờ ghép với lần ' +
        '<code>printk</code> sau. Mọi <code>pr_*</code> trong khoá học đều kết thúc bằng ' +
        '<code>\\n</code>.'
    ] },

    { t: 'h3', x: 'In con trỏ: %p, %px, %pS' },

    { t: 'p', x:
      '<code>printk</code> hiểu thêm một họ định dạng mà <code>printf</code> không có. Quan trọng nhất ' +
      'là cách in con trỏ, vì một địa chỉ kernel lộ ra log là thông tin giúp kẻ tấn công vượt qua ' +
      'KASLR (xếp ngẫu nhiên địa chỉ kernel lúc boot).' },

    { t: 'table',
      head: ['Định dạng', 'In ra', 'Dùng khi'],
      rows: [
        ['<code>%p</code>', 'Một giá trị <b>băm</b>, không phải địa chỉ thật. Ngay sau boot, khi chưa đủ nguồn ngẫu nhiên để băm, nó in <code>(____ptrval____)</code>.', 'Mặc định. Đủ để so sánh hai con trỏ có bằng nhau không.'],
        ['<code>%px</code>', 'Địa chỉ thật, đủ 16 chữ số hex.', 'Chỉ khi gỡ lỗi và thật sự cần địa chỉ. Người review mã upstream sẽ hỏi lý do.'],
        ['<code>%pS</code>', 'Tên ký hiệu + offset, ví dụ <code>do_one_initcall+0x70/0x1b8</code>.', 'In địa chỉ của một hàm — ai đã gọi mình, callback nào đang được đăng ký.']
      ] },

    /* ============================================================
       6. KMALLOC
       ============================================================ */
    { t: 'h2', x: 'Luật 5: kmalloc, kfree — và không ai dọn hộ bạn' },

    { t: 'p', x:
      '<code>kmalloc</code> là <code>malloc</code> của kernel, với một tham số thêm:' },

    { t: 'code', where: 'file', name: 'mẫu gọi, không chạy', lang: 'c', nocopy: true, code:
      'buf = kmalloc(size, GFP_KERNEL);\n' +
      'if (!buf)\n' +
      '\treturn -ENOMEM;\n' +
      '...\n' +
      'kfree(buf);' },

    { t: 'cmdx', cmd: 'kmalloc(size, GFP_KERNEL)',
      title: 'Hai tham số và một giá trị trả về',
      rows: [
        ['<code>size</code>', 'Số byte cần.', 'Kernel làm tròn lên một <b>lớp kích thước</b> có sẵn (8, 16, 32 … 8192). Bước 5 đo điều này bằng <code>ksize()</code>.'],
        ['<code>GFP_KERNEL</code>', 'Cờ "Get Free Pages": được phép <b>ngủ</b> để chờ bộ nhớ.', 'Nếu RAM đang chật, kernel có thể dọn cache, ghi trang ra đĩa rồi mới trả về. Được dùng ở ngữ cảnh tiến trình — như <code>init</code> của module. Trong trình xử lý ngắt (Bài 55) không được ngủ, phải dùng <code>GFP_ATOMIC</code>.'],
        ['giá trị trả về', 'Con trỏ tới bộ nhớ, hoặc <code>NULL</code>.', '<b>Luôn</b> kiểm tra <code>NULL</code> và trả <code>-ENOMEM</code>. Kernel không có <code>abort()</code> để chết cho gọn.'],
        ['<code>kfree(buf)</code>', 'Trả bộ nhớ.', '<code>kfree(NULL)</code> là hợp lệ và không làm gì — bạn không cần <code>if</code> trước nó.']
      ] },

    { t: 'p', x:
      'Hai khác biệt lớn với <code>malloc</code>:' },

    { t: 'list', ordered: true, items: [
      '<b><code>kmalloc</code> trả bộ nhớ liên tục về mặt vật lý</b>, lấy từ bộ cấp phát trang. Vì ' +
        'vậy nó có giới hạn: trên kernel này <code>CONFIG_ARCH_FORCE_MAX_ORDER=10</code>, tức khối ' +
        'lớn nhất là 2<sup>10</sup> trang × 4 KiB = <b>4 MiB</b>. Xin 8 MiB thì nhận ' +
        '<code>NULL</code>, dù máy còn hàng trăm MiB trống. Cần vùng lớn thì dùng ' +
        '<code>vmalloc</code>: liên tục về mặt ảo, rời rạc về mặt vật lý, chậm hơn một chút và không ' +
        'dùng được cho DMA.',
      '<b>Không ai dọn hộ.</b> Ở userspace, quên <code>free</code> rồi thoát chương trình là vô hại: ' +
        'kernel thu hồi cả không gian địa chỉ của tiến trình. Module không có không gian địa chỉ riêng ' +
        '— bộ nhớ nó xin là bộ nhớ của kernel. <code>rmmod</code> gỡ mã của module, nhưng không biết ' +
        'module đã xin những gì. Mất con trỏ là mất bộ nhớ cho tới lần boot sau. Bước 5 đo chính xác ' +
        'bao nhiêu.'
    ] },

    { t: 'cal', kind: 'tip', title: 'Mô hình để nhớ: init xin, exit trả, theo thứ tự ngược lại', x:
      'Bài 50 đã nói <code>init</code> và <code>exit</code> là một cặp đối xứng. Với bộ nhớ, luật ' +
      'đó thành cụ thể: mỗi <code>kmalloc</code> trong <code>init</code> có đúng một ' +
      '<code>kfree</code> trong <code>exit</code>, và con trỏ phải được giữ ở đâu đó (một biến ' +
      '<code>static</code>, một <code>struct</code> của driver) để <code>exit</code> tìm thấy. Nếu ' +
      '<code>init</code> thất bại giữa chừng, nó tự <code>kfree</code> những gì đã xin trước khi trả ' +
      'lỗi. Bài 54 sẽ giới thiệu <code>devm_kmalloc</code> — phiên bản kernel tự trả hộ khi driver ' +
      'gỡ ra.' },

    /* ============================================================
       7. CON TRỎ USERSPACE
       ============================================================ */
    { t: 'h2', x: 'Luật 6: không bao giờ đọc thẳng con trỏ của userspace' },

    { t: 'p', x:
      'Từ Bài 52 trở đi, driver của bạn sẽ nhận con trỏ từ chương trình userspace: ' +
      '<code>read(fd, buf, 100)</code> truyền vào kernel địa chỉ <code>buf</code> — một địa chỉ ' +
      '<b>trong không gian của tiến trình đó</b>. Mã kernel về kỹ thuật có thể đọc thẳng địa chỉ ấy ' +
      'bằng <code>*buf</code>. Kernel cấm việc đó, vì ba lý do:' },

    { t: 'table',
      head: ['Nếu đọc thẳng <code>*buf</code>', 'Chuyện gì xảy ra', '<code>copy_from_user</code> xử lý thế nào'],
      rows: [
        ['Con trỏ không hợp lệ (<code>NULL</code>, chưa ánh xạ, đã <code>free</code>)', 'Lỗi trang ngay trong kernel — một <b>oops</b>, không phải một <code>Segmentation fault</code> của chương trình kia', 'Bắt lỗi trang, trả về số byte <b>không</b> chép được; kernel không sập'],
        ['Con trỏ trỏ vào <b>bộ nhớ kernel</b>', 'Một chương trình ác ý khiến driver đọc hoặc ghi dữ liệu của kernel thay nó — lỗ hổng leo thang đặc quyền kinh điển', 'Kiểm tra địa chỉ nằm trong vùng userspace trước khi chép; từ chối nếu không'],
        ['CPU có <b>PAN</b> (Privileged Access Never)', 'Phần cứng chặn mọi truy cập của kernel vào trang userspace, trừ khi kernel chủ động mở cửa', 'Mở cửa PAN đúng trong lúc chép, đóng lại ngay sau đó']
      ] },

    { t: 'p', x:
      'Hai hàm, đối xứng nhau, cùng khai báo trong <code>&lt;linux/uaccess.h&gt;</code>:' },

    { t: 'code', where: 'file', name: 'mẫu gọi, không chạy', lang: 'c', nocopy: true, code:
      'unsigned long copy_from_user(void *to, const void __user *from, unsigned long n);\n' +
      'unsigned long copy_to_user(void __user *to, const void *from, unsigned long n);' },

    { t: 'list', items: [
      '<code>copy_from_user</code>: userspace → kernel, dùng trong <code>write()</code> của driver. ' +
        '<code>copy_to_user</code>: kernel → userspace, dùng trong <code>read()</code>. Nhớ theo tên: ' +
        '"copy <b>to</b> user" là gửi <b>đến</b> người dùng.',
      '<code>__user</code> là một nhãn cho công cụ kiểm tra tĩnh <code>sparse</code>: "con trỏ này ' +
        'thuộc không gian khác, đừng đọc thẳng". Trình biên dịch bỏ qua nó; <code>sparse</code> ' +
        '(<code>make C=1</code>) sẽ cảnh báo nếu bạn dereference nó.',
      '<b>Giá trị trả về là số byte KHÔNG chép được</b>, không phải số byte đã chép. <code>0</code> = ' +
        'thành công trọn vẹn. Khác 0 thì driver trả <code>-EFAULT</code> cho userspace. Đây là chỗ ' +
        'người mới hay viết ngược điều kiện.'
    ] },

    { t: 'cal', kind: 'info', title: 'Hậu quả của một con trỏ sai: oops và panic', x:
      '<p>Khi mã kernel truy cập một địa chỉ không hợp lệ mà không qua <code>copy_*_user</code>, CPU ' +
      'báo lỗi trang và kernel in một báo cáo gọi là <b>oops</b>: thông báo ' +
      '<code>Unable to handle kernel NULL pointer dereference at virtual address …</code>, giá trị các ' +
      'thanh ghi, dòng <code>pc : tên_hàm+offset [tên_module]</code> chỉ ra lệnh gây lỗi, ' +
      '<code>Call trace</code> (chuỗi hàm đã gọi tới đó), và dòng <code>Tainted:</code> với các cờ taint ' +
      'bạn học ở Bài 50 — cờ <code>O</code> nằm ngay trong đó.</p>' +
      '<p>Oops không nhất thiết làm sập máy: kernel giết tiến trình đang chạy mã lỗi, thêm cờ taint ' +
      '<code>D</code> (bit 7), và cố chạy tiếp. Nhưng module gây lỗi bị kẹt ở trạng thái dở dang, ' +
      'không gỡ được, và mọi khoá nó đang giữ sẽ không bao giờ được nhả — kernel đã ở trạng thái không ' +
      'tin cậy. Vì thế sản phẩm nhúng thường bật <code>panic_on_oops</code>: oops biến thành panic, và ' +
      'watchdog khởi động lại thiết bị.</p>' +
      '<p><b>Phần thực hành về oops đang được hoàn thiện</b> và sẽ được bổ sung vào bài này sau.</p>' },

    /* ============================================================
       8. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: phá từng luật, xem ai chặn bạn' },

    { t: 'p', x:
      'Bạn làm việc trong <code>~/bai51/rules</code>. Cần ba thứ từ các bài trước, đều phải còn ' +
      'nguyên: cây kernel <b>đã build</b> <code>~/bai38/linux-6.18.45</code> (Bài 40), ' +
      '<code>~/bai32/initramfs</code> (Bài 32), và Makefile của <code>~/bai50/hello</code> (Bài 50). ' +
      'Bước 1–3 chạy trên WSL và dừng ở lúc build — trình biên dịch và <code>modpost</code> là người ' +
      'chặn. Bước 4–6 chạy trong QEMU.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/bai51/rules && cd ~/bai51/rules\n' +
      'cp ~/bai50/hello/Makefile .\n' +
      'head -n 1 Makefile' },

    { t: 'code', where: 'out', nocopy: true, code:
      'obj-m := hello.o fail_init.o prop.o' },

    { t: 'p', x:
      'Makefile của Bài 50 vẫn liệt kê ba module cũ, nhưng bạn sẽ không sửa dòng đó ở bước 1–3: mỗi ' +
      'lần chỉ build một module bằng cách ghi đè <code>obj-m</code> trên dòng lệnh — ' +
      '<code>make obj-m=TÊN.o</code> — đúng thủ thuật Bài 50 đã dùng cho <code>nolic.c</code>.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Luật 1: gọi printf từ một module',
        blocks: [
          { t: 'p', x:
            'Viết một module làm đúng việc một lập trình viên C sẽ làm theo phản xạ: ' +
            '<code>#include &lt;stdio.h&gt;</code> rồi gọi <code>printf</code>.' },

          { t: 'code', where: 'file', name: '~/bai51/rules/nolibc.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * nolibc.c - tries to use the C library inside a module.\n' +
            ' */\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <stdio.h>\n' +
            '\n' +
            'static int __init nolibc_init(void)\n' +
            '{\n' +
            '\tprintf("hello from printf\\n");\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit nolibc_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(nolibc_init);\n' +
            'module_exit(nolibc_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Tries to call printf from a module");' },

          { t: 'code', where: 'wsl', code:
            'make obj-m=nolibc.o 2>&1 | grep -E \'error|\\[M\\]\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  nolibc.o\n' +
            'nolibc.c:7:10: fatal error: stdio.h: No such file or directory' },

          { t: 'p', x:
            'Chặn ở <b>dòng 7, lúc dịch</b> — chưa tới <code>printf</code>. Trình biên dịch ARM64 có ' +
            '<code>stdio.h</code> trong sysroot của nó, nhưng Kbuild truyền <code>-nostdinc</code> nên ' +
            'nó không được phép nhìn vào đó. <code>grep</code> chỉ giữ lại dòng lỗi và dòng ' +
            '<code>CC [M]</code> để bạn thấy lỗi xảy ra ở bước nào.' },

          { t: 'p', x:
            'Giờ thử lách: bỏ <code>#include</code>, tự khai báo nguyên mẫu <code>printf</code>. ' +
            'Trình biên dịch chỉ cần nguyên mẫu để dịch một lời gọi hàm, nên lần này nó sẽ qua:' },

          { t: 'code', where: 'wsl', code:
            'sed \'s/#include <stdio.h>/int printf(const char *fmt, ...);/\' nolibc.c > nolibc2.c\n' +
            'grep -n printf nolibc2.c\n' +
            'make obj-m=nolibc2.o 2>&1 | grep -E \'ERROR|\\[M\\]|MODPOST\'\n' +
            'ls nolibc2.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '7:int printf(const char *fmt, ...);\n' +
            '11:\tprintf("hello from printf\\n");\n' +
            '23:MODULE_DESCRIPTION("Tries to call printf from a module");\n' +
            '  CC [M]  nolibc2.o\n' +
            '  MODPOST Module.symvers\n' +
            'ERROR: modpost: "puts" [nolibc2.ko] undefined!\n' +
            'ls: cannot access \'nolibc2.ko\': No such file or directory' },

          { t: 'cal', kind: 'info', title: 'Hai điều trong một dòng ERROR', x:
            '<p><b>Lần này dịch được</b> (<code>CC [M]  nolibc2.o</code> không kèm lỗi), và người chặn ' +
            'là <code>modpost</code> — cùng người đã chặn <code>nolic.c</code> ở Bài 50, nhưng vì lý do ' +
            'khác. <code>modpost</code> tra mọi ký hiệu module cần trong <code>Module.symvers</code>; ' +
            'không có ai export ký hiệu đó, nên không có <code>.ko</code>.</p>' +
            '<p><b>Ký hiệu thiếu là <code>puts</code>, không phải <code>printf</code>.</b> Mã nguồn ' +
            'không hề có chữ <code>puts</code>. GCC nhận ra ' +
            '<code>printf("…\\n")</code> không có tham số định dạng nào và tự thay bằng ' +
            '<code>puts("…")</code> — một tối ưu hoá hợp lệ ở userspace. Trong kernel, tối ưu hoá đó ' +
            'trỏ tới một hàm cũng không tồn tại. Gặp một ký hiệu <code>undefined</code> lạ mà bạn chưa ' +
            'từng gọi, hãy nghĩ tới trình biên dịch trước.</p>' },

          { t: 'p', x:
            'Vậy những hàm nào có thật? Hỏi thẳng <code>Module.symvers</code>. Lệnh dưới tìm mười cái ' +
            'tên, hai tên libc và tám tên bạn có thể đoán là có:' },

          { t: 'code', where: 'wsl', code:
            'grep -wE \'printf|puts|_printk|snprintf|strlen|strscpy|memcpy|kstrtoint|kmalloc|kfree\' \\\n' +
            '  ~/bai38/linux-6.18.45/Module.symvers | cut -f2-4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '_printk\tvmlinux\tEXPORT_SYMBOL\n' +
            'kfree\tvmlinux\tEXPORT_SYMBOL\n' +
            'kstrtoint\tvmlinux\tEXPORT_SYMBOL\n' +
            'memcpy\tvmlinux\tEXPORT_SYMBOL\n' +
            'strlen\tvmlinux\tEXPORT_SYMBOL\n' +
            'snprintf\tvmlinux\tEXPORT_SYMBOL' },

          { t: 'cmdx', cmd: 'grep -wE \'…\' ~/bai38/linux-6.18.45/Module.symvers | cut -f2-4',
            title: 'Tra một danh sách hàm trong Module.symvers',
            rows: [
              ['<code>-w</code>', 'Chỉ khớp <b>nguyên từ</b>.', 'Không có <code>-w</code>, <code>printf</code> sẽ khớp cả <code>snprintf</code>, <code>vprintf</code>… và bạn tưởng nó có.'],
              ['<code>-E \'a|b|c\'</code>', 'Biểu thức chính quy mở rộng (Bài 11), <code>|</code> nghĩa là "hoặc".', 'Tra mười tên trong một lần.'],
              ['<code>cut -f2-4</code>', 'Giữ cột 2 đến 4 (tên, nơi export, kiểu export).', 'Cột 1 là CRC — toàn <code>0x00000000</code> vì kernel không bật <code>MODVERSIONS</code> (Bài 50).']
            ] },

          { t: 'p', x:
            'Sáu tên có, bốn tên vắng: <code>printf</code> và <code>puts</code> (libc — đúng như ' +
            'bước này vừa thấy), <code>kmalloc</code> và <code>strscpy</code>. Hai tên sau <b>có</b> ' +
            'dùng được, nhưng không phải dưới đúng cái tên đó: <code>kmalloc</code> là hàm ' +
            '<code>inline</code> trong <code>include/linux/slab.h</code>, gọi xuống ' +
            '<code>__kmalloc_noprof</code> (bước 5 sẽ thấy tên này trong <code>nm</code>); ' +
            '<code>strscpy</code> là macro. Đây là trường hợp thứ hai trong callout "hỏi ' +
            'Module.symvers" ở phần lý thuyết: không thấy trong <code>Module.symvers</code> thì tìm ' +
            'tiếp trong header, trước khi kết luận hàm không tồn tại.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Luật 2: một phép chia float',
        blocks: [
          { t: 'p', x:
            'Module này chia PID của tiến trình đang nạp nó cho 10 bằng số thực. PID chỉ biết được lúc ' +
            'chạy, nên trình biên dịch buộc phải sinh lệnh chia dấu phẩy động:' },

          { t: 'code', where: 'file', name: '~/bai51/rules/fpu.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * fpu.c - float arithmetic on a value known only at run time.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/sched.h>\n' +
            '\n' +
            'static int __init fpu_init(void)\n' +
            '{\n' +
            '\tfloat scaled = current->pid / 10.0f;\t/* known only at run time */\n' +
            '\n' +
            '\tpr_info("pid / 10 = %d\\n", (int)scaled);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit fpu_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(fpu_init);\n' +
            'module_exit(fpu_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Uses float on a run-time value");' },

          { t: 'code', where: 'wsl', code:
            'make obj-m=fpu.o 2>&1 | grep -E \'error|\\[M\\]\' | sort | uniq -c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '      1   CC [M]  fpu.o\n' +
            '      1 fpu.c:15: confused by earlier errors, bailing out\n' +
            '      4 /home/cah8hc/embedded-course/bai38/linux-6.18.45/include/linux/printk.h:512:44: error: ‘-mgeneral-regs-only’ is incompatible with the use of floating-point types' },

          { t: 'cmdx', cmd: 'make obj-m=fpu.o 2>&1 | grep -E \'error|\\[M\\]\' | sort | uniq -c',
            title: 'Gom các dòng lỗi lặp lại',
            rows: [
              ['<code>2&gt;&amp;1</code>', 'Gộp stderr vào stdout (Bài 10).', 'Lỗi của trình biên dịch đi ra stderr; không gộp thì <code>grep</code> không nhìn thấy.'],
              ['<code>sort | uniq -c</code>', 'Sắp xếp rồi đếm các dòng giống hệt nhau (Bài 11).', 'GCC in cùng một lỗi bốn lần, mỗi lần kèm ba dòng <code>note:</code> về macro. Đếm lại cho thấy bản chất: <b>một</b> lỗi, lặp 4 lần.']
            ] },

          { t: 'p', x:
            'Thông báo nói đúng tên cờ: <code>-mgeneral-regs-only</code>. Hai chi tiết đáng đọc. ' +
            '(1) Lỗi <b>không</b> ghi ở dòng 13 nơi có chữ <code>float</code>, mà ở dòng ' +
            '<code>pr_info</code>, trỏ vào <code>printk.h:512</code>: GCC 9.4 báo lỗi tại chỗ giá trị ' +
            'số thực thật sự phải nằm trong một thanh ghi. (2) Đường dẫn chứa ' +
            '<code>/home/cah8hc/embedded-course/…</code> vì trên máy viết bài <code>~/bai38</code> là ' +
            'một symlink; trên máy bạn nó sẽ là đường dẫn thật của cây kernel. Không có ' +
            '<code>fpu.ko</code> nào được tạo.' },

          { t: 'p', x:
            'Bây giờ là cái bẫy phần lý thuyết đã cảnh báo. Cùng phép tính, nhưng toàn hằng số:' },

          { t: 'code', where: 'file', name: '~/bai51/rules/fpu_const.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * fpu_const.c - float arithmetic on constants only.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '\n' +
            'static int __init fpu_const_init(void)\n' +
            '{\n' +
            '\tfloat celsius = 23.5f;\n' +
            '\n' +
            '\tpr_info("fahrenheit = %d\\n", (int)(celsius * 1.8f + 32));\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit fpu_const_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(fpu_const_init);\n' +
            'module_exit(fpu_const_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Float on constants: folded at compile time");' },

          { t: 'code', where: 'wsl', code:
            'make obj-m=fpu_const.o 2>&1 | grep -E \'error|\\[M\\]\'\n' +
            'aarch64-linux-gnu-objdump -d fpu_const.ko | grep -A12 \'<init_module>:\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  fpu_const.o\n' +
            '  CC [M]  fpu_const.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  fpu_const.ko\n' +
            '0000000000000000 <init_module>:\n' +
            '   0:\td503233f \tpaciasp\n' +
            '   4:\ta9bf7bfd \tstp\tx29, x30, [sp, #-16]!\n' +
            '   8:\t52800941 \tmov\tw1, #0x4a                  \t// #74\n' +
            '   c:\t910003fd \tmov\tx29, sp\n' +
            '  10:\t90000000 \tadrp\tx0, 0 <init_module>\n' +
            '  14:\t91000000 \tadd\tx0, x0, #0x0\n' +
            '  18:\t94000000 \tbl\t0 <_printk>\n' +
            '  1c:\t52800000 \tmov\tw0, #0x0                   \t// #0\n' +
            '  20:\ta8c17bfd \tldp\tx29, x30, [sp], #16\n' +
            '  24:\td50323bf \tautiasp\n' +
            '  28:\td65f03c0 \tret' },

          { t: 'cal', kind: 'warn', title: 'Build được không có nghĩa là float dùng được', x:
            '<p><code>LD [M]  fpu_const.ko</code> — build thành công. Nhưng đọc mã máy: ở offset ' +
            '<code>8</code>, <code>mov w1, #0x4a</code> nạp thẳng số <b>74</b> vào thanh ghi số ' +
            'nguyên <code>w1</code> (tham số thứ hai của <code>_printk</code>). 23,5 × 1,8 + 32 = 74,3, ' +
            'cắt về <code>int</code> là 74 — trình biên dịch đã tính xong <b>lúc dịch</b>. Trong 11 lệnh ' +
            'không có lệnh số thực nào (<code>fmul</code>, <code>fadd</code>, thanh ghi ' +
            '<code>s0</code>/<code>v0</code>).</p>' +
            '<p>Bài học: một thí nghiệm "float chạy được trong kernel" chỉ với hằng số chứng minh sai ' +
            'điều nó muốn chứng minh. Đổi <code>23.5f</code> thành một giá trị đọc từ cảm biến, và nó ' +
            'thành <code>fpu.c</code>. Bước 5 nạp module này để thấy nó in đúng ' +
            '<code>fahrenheit = 74</code>.</p>' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Luật 3: một mảng 4 KiB trên stack, rồi build phần còn lại',
        blocks: [
          { t: 'p', x:
            'Module này làm việc rất bình thường ở userspace: khai báo một bộ đệm cục bộ 4 096 byte:' },

          { t: 'code', where: 'file', name: '~/bai51/rules/bigframe.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * bigframe.c - puts a large array on the kernel stack.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/sched.h>\n' +
            '\n' +
            '#define FRAME_BYTES 4096\n' +
            '\n' +
            'static int __init bigframe_init(void)\n' +
            '{\n' +
            '\tchar buf[FRAME_BYTES];\n' +
            '\tint n;\n' +
            '\n' +
            '\tn = snprintf(buf, sizeof(buf), "%s", current->comm);\n' +
            '\tpr_info("%d-byte buffer on the stack holds \\"%s\\" (%d chars)\\n",\n' +
            '\t\tFRAME_BYTES, buf, n);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit bigframe_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(bigframe_init);\n' +
            'module_exit(bigframe_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Puts a large array on the kernel stack");' },

          { t: 'code', where: 'wsl', code:
            'make obj-m=bigframe.o 2>&1 | grep -E \'warning|\\[M\\]\'\n' +
            'grep -E \'CONFIG_(FRAME_WARN|VMAP_STACK)=|CONFIG_KASAN is\' ~/bai38/linux-6.18.45/.config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  bigframe.o\n' +
            'bigframe.c:22:1: warning: the frame size of 4112 bytes is larger than 2048 bytes [-Wframe-larger-than=]\n' +
            '  CC [M]  bigframe.mod.o\n' +
            '  LD [M]  bigframe.ko\n' +
            'CONFIG_VMAP_STACK=y\n' +
            'CONFIG_FRAME_WARN=2048\n' +
            '# CONFIG_KASAN is not set' },

          { t: 'p', x:
            '<b>Cảnh báo, không phải lỗi</b>: <code>LD [M]  bigframe.ko</code> vẫn chạy. Khung stack ' +
            'của hàm là <b>4 112</b> byte — 4 096 cho <code>buf</code>, 16 cho <code>n</code>, cặp ' +
            'thanh ghi <code>x29</code>/<code>x30</code> được cất, và phần căn lề. Ngưỡng ' +
            '<b>2048</b> đến thẳng từ <code>CONFIG_FRAME_WARN</code> trong <code>.config</code>. Cảnh ' +
            'báo chỉ vào dòng 22 — dấu <code>}</code> đóng hàm — vì trình biên dịch chỉ biết kích thước ' +
            'khung khi đã dịch xong cả hàm. Hai dòng cấu hình còn lại chính là hai số hạng của phép ' +
            'tính 16 KiB ở phần lý thuyết.' },

          { t: 'p', x:
            'Muốn thấy chính xác hàm lấy bao nhiêu stack, đọc ba lệnh đầu của nó:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-objdump -d bigframe.ko | grep -A3 \'<init_module>:\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0000000000000000 <init_module>:\n' +
            '   0:\td503233f \tpaciasp\n' +
            '   4:\td282060c \tmov\tx12, #0x1030                \t// #4144\n' +
            '   8:\tcb2c63ff \tsub\tsp, sp, x12' },

          { t: 'p', x:
            '<code>sub sp, sp, x12</code> với <code>x12</code> = <b>4 144</b>: hàm hạ con trỏ stack xuống ' +
            '4 144 byte ngay khi bắt đầu (nhiều hơn 4 112 một chút vì có thêm ô cho stack protector — ' +
            '<code>CONFIG_STACKPROTECTOR_STRONG=y</code>). 4 144 / 16 384 = <b>25 %</b> stack kernel, ' +
            'cho một hàm không làm gì ngoài in một dòng. So với userspace:' },

          { t: 'code', where: 'wsl', code:
            'ulimit -s' },

          { t: 'code', where: 'out', nocopy: true, code:
            '8192' },

          { t: 'p', x:
            '8 192 KiB = 8 MiB cho stack của một chương trình trên WSL. Cùng bộ đệm 4 KiB đó chỉ chiếm ' +
            '0,05 % ở userspace, và 25 % ở kernel. Bước 5 sẽ nạp <code>bigframe.ko</code> và nó chạy ' +
            'bình thường — vì lúc <code>init</code> chạy, stack còn gần như trống. Đó chính là lý do ' +
            'cảnh báo này nguy hiểm: nó không bao giờ lộ ra trong một lần thử đơn giản.' },

          { t: 'p', x:
            'Ba luật đầu đã xong trên WSL. Bốn module còn lại dành cho QEMU. Tạo bốn file sau, rồi ' +
            'thay Makefile bằng một Makefile liệt kê chúng:' },

          { t: 'code', where: 'file', name: '~/bai51/rules/loglevels.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * loglevels.c - prints one line at every printk level.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '\n' +
            'static int answer = 42;\n' +
            '\n' +
            'static int __init loglevels_init(void)\n' +
            '{\n' +
            '\tpr_emerg("level 0 emerg\\n");\n' +
            '\tpr_alert("level 1 alert\\n");\n' +
            '\tpr_crit("level 2 crit\\n");\n' +
            '\tpr_err("level 3 err\\n");\n' +
            '\tpr_warn("level 4 warn\\n");\n' +
            '\tpr_notice("level 5 notice\\n");\n' +
            '\tpr_info("level 6 info\\n");\n' +
            '\tpr_debug("level 7 debug\\n");\n' +
            '\tprintk("no level given\\n");\n' +
            '\tpr_info("%%p  -> %p\\n", &answer);\n' +
            '\tpr_info("%%px -> %px\\n", &answer);\n' +
            '\tpr_info("%%pS -> %pS\\n", __builtin_return_address(0));\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit loglevels_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(loglevels_init);\n' +
            'module_exit(loglevels_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("One line at every printk level");',
            notes: [
              '<code>%%</code> in ra một dấu <code>%</code> — giống <code>printf</code>.',
              '<code>__builtin_return_address(0)</code> là địa chỉ mà hàm này sẽ quay về, tức <b>ai đã gọi</b> <code>loglevels_init</code>. <code>%pS</code> sẽ dịch nó thành tên hàm.',
              '<code>printk</code> không có <code>KERN_*</code> ở đầu là cố ý — để thấy nó nhận mức gì.'
            ] },

          { t: 'code', where: 'file', name: '~/bai51/rules/kmem.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * kmem.c - what kmalloc really hands out, and where it stops.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/slab.h>\n' +
            '#include <linux/vmalloc.h>\n' +
            '\n' +
            'static const size_t sizes[] = { 1, 13, 100, 1000, 3000, 5000 };\n' +
            '\n' +
            'static int __init kmem_init(void)\n' +
            '{\n' +
            '\tvoid *p;\n' +
            '\tint i;\n' +
            '\n' +
            '\tfor (i = 0; i < ARRAY_SIZE(sizes); i++) {\n' +
            '\t\tp = kmalloc(sizes[i], GFP_KERNEL);\n' +
            '\t\tif (!p)\n' +
            '\t\t\treturn -ENOMEM;\n' +
            '\t\tpr_info("kmalloc(%zu) -> ksize %zu\\n", sizes[i], ksize(p));\n' +
            '\t\tkfree(p);\n' +
            '\t}\n' +
            '\n' +
            '\tp = kmalloc(8 << 20, GFP_KERNEL | __GFP_NOWARN);\n' +
            '\tpr_info("kmalloc(8 MiB) -> %s\\n", p ? "ok" : "NULL");\n' +
            '\tkfree(p);\n' +
            '\n' +
            '\tp = vmalloc(8 << 20);\n' +
            '\tpr_info("vmalloc(8 MiB) -> %s\\n", p ? "ok" : "NULL");\n' +
            '\tvfree(p);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit kmem_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(kmem_init);\n' +
            'module_exit(kmem_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Shows kmalloc size classes and limits");',
            notes: [
              '<code>ksize(p)</code> trả về số byte kernel <b>thật sự</b> dành cho khối đó — có thể lớn hơn số bạn xin.',
              '<code>8 &lt;&lt; 20</code> = 8 × 2<sup>20</sup> = 8 MiB. <code>__GFP_NOWARN</code> bảo kernel đừng in một cảnh báo dài vào log khi thất bại — thất bại ở đây là điều ta chờ đợi.',
              'Mỗi <code>kmalloc</code> đều có <code>kfree</code> đi kèm, kể cả khi <code>p</code> là <code>NULL</code> — hợp lệ, như phần lý thuyết đã nói.'
            ] },

          { t: 'code', where: 'file', name: '~/bai51/rules/leak.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * leak.c - allocates 16 MiB and never frees it.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/slab.h>\n' +
            '#include <linux/sizes.h>\n' +
            '#include <linux/string.h>\n' +
            '\n' +
            '#define CHUNKS 16\n' +
            '\n' +
            'static int __init leak_init(void)\n' +
            '{\n' +
            '\tvoid *p;\n' +
            '\tint i;\n' +
            '\n' +
            '\tfor (i = 0; i < CHUNKS; i++) {\n' +
            '\t\tp = kmalloc(SZ_1M, GFP_KERNEL);\n' +
            '\t\tif (!p)\n' +
            '\t\t\treturn -ENOMEM;\n' +
            '\t\tmemset(p, 0, SZ_1M);\n' +
            '\t}\n' +
            '\tpr_info("allocated %d x 1 MiB, kept no pointer\\n", CHUNKS);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit leak_exit(void)\n' +
            '{\n' +
            '\tpr_info("exit: nothing to kfree, the pointers are gone\\n");\n' +
            '}\n' +
            '\n' +
            'module_init(leak_init);\n' +
            'module_exit(leak_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Leaks 16 MiB on purpose");',
            notes: [
              'Lỗi cố ý: mỗi vòng lặp ghi đè <code>p</code>, nên sau vòng lặp không còn con trỏ nào tới 15 khối đầu — và khối cuối cũng mất khi hàm trả về. <code>exit</code> không có gì để <code>kfree</code>.',
              '<code>memset</code> ghi vào từng khối để chắc chắn bộ nhớ thật sự được dùng.',
              'Module này an toàn để chạy trong QEMU: nó chỉ làm mất 16 MiB của một máy ảo 512 MiB, và lần boot sau lấy lại tất cả.'
            ] },

          { t: 'code', where: 'file', name: '~/bai51/rules/uaccess.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * uaccess.c - copies the loader\'s argv into the kernel, then tries two bad pointers.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/sched.h>\n' +
            '#include <linux/mm.h>\n' +
            '#include <linux/uaccess.h>\n' +
            '\n' +
            'static int __init uaccess_init(void)\n' +
            '{\n' +
            '\tunsigned long start = current->mm->arg_start;\n' +
            '\tunsigned long len = current->mm->arg_end - start;\n' +
            '\tunsigned long left;\n' +
            '\tchar buf[64];\n' +
            '\tint i;\n' +
            '\n' +
            '\tif (len > sizeof(buf) - 1)\n' +
            '\t\tlen = sizeof(buf) - 1;\n' +
            '\n' +
            '\t/* 1. a valid user pointer: argv of the insmod that is loading us */\n' +
            '\tleft = copy_from_user(buf, (const void __user *)start, len);\n' +
            '\tfor (i = 0; i < len - 1; i++)\n' +
            '\t\tif (buf[i] == \'\\0\')\n' +
            '\t\t\tbuf[i] = \' \';\n' +
            '\tbuf[len] = \'\\0\';\n' +
            '\tpr_info("argv at 0x%lx: \\"%s\\" (%lu not copied)\\n", start, buf, left);\n' +
            '\n' +
            '\t/* 2. two bad user pointers: no crash, just a short count */\n' +
            '\tleft = copy_from_user(buf, (const void __user *)NULL, 8);\n' +
            '\tpr_info("from NULL: %lu of 8 not copied\\n", left);\n' +
            '\n' +
            '\tleft = copy_from_user(buf, (const void __user *)&start, 8);\n' +
            '\tpr_info("from a kernel address: %lu of 8 not copied\\n", left);\n' +
            '\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit uaccess_exit(void)\n' +
            '{\n' +
            '}\n' +
            '\n' +
            'module_init(uaccess_init);\n' +
            'module_exit(uaccess_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("copy_from_user with one good and two bad pointers");',
            notes: [
              'Module cần một con trỏ userspace <b>thật</b> để chép, mà chưa có driver nào để nhận một con trỏ như thế (đó là việc của Bài 52). Nó mượn một thứ có sẵn: <code>current-&gt;mm-&gt;arg_start</code> là địa chỉ, trong không gian của tiến trình <code>insmod</code>, nơi chứa chuỗi dòng lệnh của chính nó.',
              'Các đối số trong vùng đó cách nhau bằng <code>\\0</code>; vòng <code>for</code> đổi chúng thành dấu cách để in được thành một dòng.',
              '<code>&amp;start</code> là địa chỉ của một biến trên stack <b>kernel</b> — thứ một chương trình userspace không bao giờ được phép bắt driver chép ra.'
            ] },

          { t: 'code', where: 'file', name: '~/bai51/rules/Makefile', lang: 'makefile', code:
            'obj-m := loglevels.o loglevels_dbg.o kmem.o leak.o uaccess.o\n' +
            '\n' +
            'CFLAGS_loglevels_dbg.o := -DDEBUG\n' +
            '\n' +
            'KDIR          ?= $(HOME)/bai38/linux-6.18.45\n' +
            'ARCH          ?= arm64\n' +
            'CROSS_COMPILE ?= aarch64-linux-gnu-\n' +
            '\n' +
            'all:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) modules\n' +
            '\n' +
            'clean:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) clean',
            notes: [
              'Giống Makefile Bài 50, chỉ khác hai dòng đầu. <code>loglevels_dbg.o</code> là cùng mã nguồn <code>loglevels.c</code>, chép sang tên khác — bạn sẽ tạo file đó ngay dưới.',
              '<code>CFLAGS_TÊN.o := …</code> là cú pháp Kbuild để thêm cờ cho <b>đúng một</b> file. <code>-DDEBUG</code> định nghĩa macro <code>DEBUG</code>, và khi có nó, <code>pr_debug</code> mới sinh mã.',
              'Nhớ: dòng dưới <code>all:</code> và <code>clean:</code> thụt bằng Tab.'
            ] },

          { t: 'code', where: 'wsl', code:
            'cp loglevels.c loglevels_dbg.c\n' +
            'make 2>&1 | grep -E \'LD|warning|error\'\n' +
            'strings loglevels.ko | grep -c \'level 7\'\n' +
            'strings loglevels_dbg.ko | grep \'level 7\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  LD [M]  loglevels.ko\n' +
            '  LD [M]  loglevels_dbg.ko\n' +
            '  LD [M]  kmem.ko\n' +
            '  LD [M]  leak.ko\n' +
            '  LD [M]  uaccess.ko\n' +
            '0\n' +
            '7loglevels_dbg: level 7 debug' },

          { t: 'p', x:
            'Năm module, không cảnh báo nào. Hai dòng cuối là bằng chứng cho luật đã nói trong lý ' +
            'thuyết: chuỗi <code>level 7</code> xuất hiện <b>0</b> lần trong <code>loglevels.ko</code> ' +
            '— <code>pr_debug</code> không sinh ra mã nào, nên chuỗi của nó không có trong file. Trong ' +
            '<code>loglevels_dbg.ko</code> nó có mặt, với tiền tố lạ <code>7</code>: đó là byte mức ' +
            'log <code>KERN_DEBUG</code> được ghép vào đầu chuỗi (thật ra là ký tự <code>\\001</code> ' +
            'theo sau là <code>7</code>; <code>strings</code> không in ký tự điều khiển). Mọi ' +
            '<code>pr_*</code> đều mang mức của nó theo cách này.' },

          { t: 'p', x:
            'Cuối cùng, đóng gói initramfs — cách của Bài 50: chép <code>~/bai32/initramfs</code>, thả ' +
            'mọi <code>.ko</code> vào gốc:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai51\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp rules/*.ko initramfs/\n' +
            'ls initramfs\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bigframe.ko\n' +
            'bin\n' +
            'dev\n' +
            'fpu_const.ko\n' +
            'init\n' +
            'kmem.ko\n' +
            'leak.ko\n' +
            'loglevels_dbg.ko\n' +
            'loglevels.ko\n' +
            'proc\n' +
            'sys\n' +
            'uaccess.ko\n' +
            '5362 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1193572 Sep 29 16:59 initramfs.cpio.gz',
            notes: ['Bản ghi này chạy qua pipe nên <code>ls</code> in mỗi mục một dòng; trong terminal của bạn nó xếp thành cột. Nội dung giống nhau.'] },

          { t: 'p', x:
            'Bảy file <code>.ko</code>: hai từ bước 2–3 (<code>fpu_const</code>, <code>bigframe</code>) ' +
            'và năm vừa build. <code>fpu.ko</code> và <code>nolibc2.ko</code> không có — chúng chưa ' +
            'bao giờ tồn tại. <code>5362 blocks</code> so với <b>4689</b> của Bài 50: phần tăng là ' +
            'bảy module khoảng 100 KB mỗi cái thay cho bốn. Kích thước file <code>.gz</code> và ngày giờ ' +
            'sẽ khác trên máy bạn (Bài 32 đã giải thích vì sao gzip của cpio không tái lập được).' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Luật 4: tám mức log trong QEMU',
        blocks: [
          { t: 'p', x:
            'Boot kernel của Bài 40 với initramfs vừa đóng gói — dòng lệnh giống hệt Bài 50:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai51\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Khi dấu nhắc <code>~ #</code> hiện ra (sau dòng <code>=== init running as PID 1 ===</code> ' +
            'của Bài 32), kiểm tra ngưỡng console rồi nạp module in đủ tám mức:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/sys/kernel/printk\n' +
            'insmod /loglevels.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/printk\n' +
            '7\t4\t1\t7\n' +
            '~ # insmod /loglevels.ko\n' +
            '[    8.166457] loglevels: loading out-of-tree module taints kernel.\n' +
            '[    8.169639] loglevels: level 0 emerg\n' +
            '[    8.169857] loglevels: level 1 alert\n' +
            '[    8.169958] loglevels: level 2 crit\n' +
            '[    8.170047] loglevels: level 3 err\n' +
            '[    8.170133] loglevels: level 4 warn\n' +
            '[    8.170219] loglevels: level 5 notice\n' +
            '[    8.170307] loglevels: level 6 info\n' +
            '[    8.170418] no level given\n' +
            '[    8.170504] loglevels: %p  -> (____ptrval____)\n' +
            '[    8.170687] loglevels: %px -> ffff80007afd2000\n' +
            '[    8.170830] loglevels: %pS -> do_one_initcall+0x70/0x1b8' },

          { t: 'p', x:
            'Ngưỡng console là <b>7</b> (số đầu tiên, Bài 41 đã mổ xẻ cả bốn số), nên mọi dòng có mức ' +
            '0–6 đều in ra. Bảy dòng <code>level 0</code>…<code>level 6</code> có mặt; ' +
            '<code>level 7 debug</code> không — bước 3 đã chứng minh nó không có trong file. Ba chi ' +
            'tiết khác, từ trên xuống:' },

          { t: 'list', items: [
            '<code>no level given</code> <b>không có tiền tố</b> <code>loglevels: </code>: ' +
              '<code>pr_fmt</code> chỉ được ghép vào các macro <code>pr_*</code>, không vào ' +
              '<code>printk</code> trần.',
            '<code>%p</code> in <code>(____ptrval____)</code> thay vì một địa chỉ — lúc 8 giây sau ' +
              'boot, kernel chưa gom đủ nguồn ngẫu nhiên để băm con trỏ, nên nó từ chối in hẳn. ' +
              '<code>%px</code> in địa chỉ thật của biến <code>answer</code>: ' +
              '<code>ffff80007afd2000</code>, nằm trong vùng module (Bài 50 thấy module được đặt ở ' +
              '<code>0xffff80007afd0000</code>). Địa chỉ này có thể khác trên máy bạn.',
            '<code>%pS</code> dịch địa chỉ quay về thành <code>do_one_initcall+0x70/0x1b8</code>: hàm ' +
              '<code>do_one_initcall</code> của kernel đã gọi <code>loglevels_init</code>, từ offset ' +
              '<code>0x70</code> trong một hàm dài <code>0x1b8</code> byte. Đây đúng là hàm ' +
              '<code>do_init_module()</code> gọi trong sơ đồ vòng đời Bài 50.'
          ] },

          { t: 'p', x:
            'Console chỉ in văn bản. Để thấy <b>mức</b> kernel đã gắn cho từng dòng, đọc bộ đệm log ' +
            'với <code>-r</code> (raw):' },

          { t: 'code', where: 'qemu', code:
            'dmesg -r | tail -n 12' },

          { t: 'code', where: 'out', nocopy: true, code:
            '<4>[    8.166457] loglevels: loading out-of-tree module taints kernel.\n' +
            '<0>[    8.169639] loglevels: level 0 emerg\n' +
            '<1>[    8.169857] loglevels: level 1 alert\n' +
            '<2>[    8.169958] loglevels: level 2 crit\n' +
            '<3>[    8.170047] loglevels: level 3 err\n' +
            '<4>[    8.170133] loglevels: level 4 warn\n' +
            '<5>[    8.170219] loglevels: level 5 notice\n' +
            '<6>[    8.170307] loglevels: level 6 info\n' +
            '<4>[    8.170418] no level given\n' +
            '<6>[    8.170504] loglevels: %p  -> (____ptrval____)\n' +
            '<6>[    8.170687] loglevels: %px -> ffff80007afd2000\n' +
            '<6>[    8.170830] loglevels: %pS -> do_one_initcall+0x70/0x1b8' },

          { t: 'cal', kind: 'info', title: 'Hai dòng mang <4> đáng chú ý', x:
            '<p><code>&lt;0&gt;</code> tới <code>&lt;6&gt;</code> khớp đúng tên macro. Hai chỗ không ' +
            'hiển nhiên:</p>' +
            '<p><b><code>no level given</code> mang <code>&lt;4&gt;</code></b> — mức <code>warn</code>. ' +
            'Đó là <code>CONFIG_MESSAGE_LOGLEVEL_DEFAULT=4</code> của kernel này. Một dòng bạn chỉ định ' +
            'là thông tin, viết bằng <code>printk</code> trần, sẽ hiện lên như một cảnh báo trong mọi ' +
            'công cụ lọc log.</p>' +
            '<p><b>Dòng taint của kernel cũng là <code>&lt;4&gt;</code></b> — kernel coi việc nạp mã ' +
            'ngoài cây là một cảnh báo, không phải một thông tin.</p>' },

          { t: 'p', x:
            'Giờ thay đổi ngưỡng console, chứ không phải module. Hạ xuống <b>1</b>: chỉ dòng có mức ' +
            '<b>nhỏ hơn 1</b> — tức mức 0 — được in ra console:' },

          { t: 'code', where: 'qemu', code:
            'rmmod loglevels\n' +
            'echo 1 > /proc/sys/kernel/printk\n' +
            'insmod /loglevels.ko\n' +
            'dmesg | tail -n 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod loglevels\n' +
            '~ # echo 1 > /proc/sys/kernel/printk\n' +
            '~ # insmod /loglevels.ko\n' +
            '[   12.968621] loglevels: level 0 emerg\n' +
            '~ # dmesg | tail -n 1\n' +
            '[   12.969226] loglevels: %pS -> do_one_initcall+0x70/0x1b8' },

          { t: 'p', x:
            'Console chỉ còn <b>một</b> dòng, <code>level 0 emerg</code>. Nhưng <code>dmesg</code> ' +
            'vẫn có dòng cuối cùng của module — mọi dòng đều đã vào bộ đệm, chỉ việc in ra console bị ' +
            'lọc. Đây là mô hình hai tầng của Bài 41, nhìn từ phía module. Dòng taint lần này cũng ' +
            'không hiện: kernel chỉ in nó <b>một lần</b> mỗi lần boot.' },

          { t: 'p', x:
            'Cuối cùng, nâng ngưỡng lên <b>8</b> (mọi mức 0–7 đều in) và nạp bản build với ' +
            '<code>-DDEBUG</code>:' },

          { t: 'code', where: 'qemu', code:
            'rmmod loglevels\n' +
            'echo 8 > /proc/sys/kernel/printk\n' +
            'insmod /loglevels_dbg.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod loglevels\n' +
            '~ # echo 8 > /proc/sys/kernel/printk\n' +
            '~ # insmod /loglevels_dbg.ko\n' +
            '[   17.773743] loglevels_dbg: level 0 emerg\n' +
            '[   17.774003] loglevels_dbg: level 1 alert\n' +
            '[   17.774141] loglevels_dbg: level 2 crit\n' +
            '[   17.774246] loglevels_dbg: level 3 err\n' +
            '[   17.774341] loglevels_dbg: level 4 warn\n' +
            '[   17.774436] loglevels_dbg: level 5 notice\n' +
            '[   17.774534] loglevels_dbg: level 6 info\n' +
            '[   17.774628] loglevels_dbg: level 7 debug\n' +
            '[   17.774723] no level given\n' +
            '[   17.774800] loglevels_dbg: %p  -> (____ptrval____)\n' +
            '[   17.774917] loglevels_dbg: %px -> ffff80007afd2000\n' +
            '[   17.775032] loglevels_dbg: %pS -> do_one_initcall+0x70/0x1b8' },

          { t: 'p', x:
            '<code>level 7 debug</code> cuối cùng cũng xuất hiện — nhưng chỉ vì <b>cả hai</b> điều ' +
            'kiện cùng đúng: module được dịch với <code>-DDEBUG</code>, và ngưỡng console lớn hơn 7. ' +
            'Thiếu điều kiện thứ nhất, không có gì để in (bước 3). Thiếu điều kiện thứ hai, dòng vào ' +
            'bộ đệm nhưng không lên console. Tiền tố bây giờ là <code>loglevels_dbg:</code> vì ' +
            '<code>KBUILD_MODNAME</code> lấy từ tên file (Bài 50). Trả ngưỡng về mặc định trước khi ' +
            'sang bước sau:' },

          { t: 'code', where: 'qemu', code:
            'rmmod loglevels_dbg\n' +
            'echo 7 4 1 7 > /proc/sys/kernel/printk\n' +
            'cat /proc/sys/kernel/printk' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod loglevels_dbg\n' +
            '~ # echo 7 4 1 7 > /proc/sys/kernel/printk\n' +
            '~ # cat /proc/sys/kernel/printk\n' +
            '7\t4\t1\t7' },

          { t: 'p', x:
            'Về đúng <code>7 4 1 7</code> như lúc bắt đầu. Viết một số duy nhất (như <code>echo 1</code>) ' +
            'chỉ đổi số đầu; viết đủ bốn số đặt lại cả bốn.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Luật 2, 3, 5 lúc chạy: float đã gấp, stack 4 KiB, kmalloc và một vụ rò rỉ',
        blocks: [
          { t: 'p', x:
            'Hai module từ bước 2–3 build được. Nạp chúng để xác nhận chúng làm đúng điều mã máy đã ' +
            'hứa:' },

          { t: 'code', where: 'qemu', code:
            'insmod /fpu_const.ko\n' +
            'rmmod fpu_const\n' +
            'insmod /bigframe.ko\n' +
            'rmmod bigframe' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /fpu_const.ko\n' +
            '[   22.579751] fpu_const: fahrenheit = 74\n' +
            '~ # rmmod fpu_const\n' +
            '~ # insmod /bigframe.ko\n' +
            '[   24.984105] bigframe: 4096-byte buffer on the stack holds "insmod" (6 chars)\n' +
            '~ # rmmod bigframe' },

          { t: 'p', x:
            '<code>fahrenheit = 74</code> — đúng số <code>0x4a</code> trong mã máy bước 2; không có ' +
            'phép tính số thực nào chạy. <code>bigframe</code> chạy trơn tru, <code>current-&gt;comm</code> ' +
            'là <code>insmod</code> (6 ký tự). Nó không sập <b>vì</b> được gọi từ một đường rất nông ' +
            '(syscall → <code>load_module</code> → <code>init</code>), nên 4 KiB cộng phần kernel đã ' +
            'dùng vẫn chưa chạm 16 KiB. Cảnh báo lúc build là thứ duy nhất báo cho bạn biết hàm này ' +
            'nguy hiểm.' },

          { t: 'p', x:
            'Giờ đến <code>kmalloc</code>. <code>kmem.ko</code> xin sáu kích thước khác nhau và hỏi ' +
            'kernel thật sự đã cấp bao nhiêu:' },

          { t: 'code', where: 'qemu', code:
            'insmod /kmem.ko\n' +
            'rmmod kmem' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /kmem.ko\n' +
            '[   27.389712] kmem: kmalloc(1) -> ksize 8\n' +
            '[   27.390009] kmem: kmalloc(13) -> ksize 16\n' +
            '[   27.390117] kmem: kmalloc(100) -> ksize 128\n' +
            '[   27.390224] kmem: kmalloc(1000) -> ksize 1024\n' +
            '[   27.390326] kmem: kmalloc(3000) -> ksize 4096\n' +
            '[   27.390427] kmem: kmalloc(5000) -> ksize 8192\n' +
            '[   27.390628] kmem: kmalloc(8 MiB) -> NULL\n' +
            '[   27.392325] kmem: vmalloc(8 MiB) -> ok\n' +
            '~ # rmmod kmem' },

          { t: 'table',
            head: ['Xin', 'Nhận', 'Lãng phí', 'Đọc thế nào'],
            rows: [
              ['1', '8', '7 B (88 %)', 'Lớp nhỏ nhất là 8 byte. Không có khối 1 byte.'],
              ['13', '16', '3 B (19 %)', 'Làm tròn lên lớp kế tiếp.'],
              ['100', '128', '28 B (22 %)', 'Có lớp 96 và 128; 100 &gt; 96 nên vào 128.'],
              ['1000', '1024', '24 B (2 %)', 'Gần một luỹ thừa của 2 thì lãng phí ít.'],
              ['3000', '4096', '1096 B (27 %)', 'Không có lớp nào giữa 2048 và 4096.'],
              ['5000', '8192', '3192 B (39 %)', 'Lớp lớn nhất của slab là 8192 = 2 trang (<code>KMALLOC_MAX_CACHE_SIZE</code>). Trên nữa, <code>kmalloc</code> lấy thẳng trang từ bộ cấp phát trang.'],
              ['8 MiB', '<code>NULL</code>', '—', 'Vượt khối liên tục lớn nhất, 4 MiB (<code>MAX_ORDER</code> 10). Máy còn ~430 MiB trống, nhưng không có 8 MiB <b>liền nhau</b>.'],
              ['8 MiB (vmalloc)', 'ok', '—', 'Ghép từ các trang rời rạc, liền nhau chỉ trong không gian địa chỉ ảo.']
            ] },

          { t: 'p', x:
            'Hai con số lớn nhất thú vị hơn chúng trông. <code>kmalloc(5000)</code> lãng phí 39 %: ' +
            'một driver xin nhiều khối 5 000 byte thực chất đang dùng 8 192 byte mỗi khối. Nếu bạn ' +
            'kiểm soát được kích thước, chọn sát dưới một luỹ thừa của 2. Muốn biết <code>kmalloc</code> ' +
            'gọi xuống hàm nào thật, hỏi <code>nm</code> trên WSL (<b>cửa sổ WSL khác</b>, QEMU vẫn ' +
            'chạy):' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-nm -u ~/bai51/rules/kmem.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '                 U kfree\n' +
            '                 U __kmalloc_large_noprof\n' +
            '                 U __kmalloc_noprof\n' +
            '                 U ksize\n' +
            '                 U _printk\n' +
            '                 U vfree\n' +
            '                 U vmalloc_noprof' },

          { t: 'p', x:
            '<code>-u</code> chỉ liệt kê ký hiệu <b>chưa định nghĩa</b> — những gì module cần kernel ' +
            'cung cấp. Không có chữ <code>kmalloc</code> nào: hàm <code>inline</code> trong ' +
            '<code>slab.h</code> đã được trình biên dịch mở ra thành hai lời gọi, ' +
            '<code>__kmalloc_noprof</code> cho kích thước nhỏ và <code>__kmalloc_large_noprof</code> ' +
            'cho 8 MiB (đã biết lúc dịch là lớn hơn 8 192). Đây là lời giải cho câu đố ' +
            '<code>kmalloc</code> vắng mặt trong <code>Module.symvers</code> ở bước 1.' },

          { t: 'p', x:
            'Cuối cùng, cái giá của luật 5. Đọc bộ nhớ trước, nạp <code>leak.ko</code>, đọc lại, gỡ ' +
            'nó, đọc lần thứ ba:' },

          { t: 'code', where: 'qemu', code:
            'grep -E \'MemFree|SUnreclaim\' /proc/meminfo\n' +
            'insmod /leak.ko\n' +
            'grep -E \'MemFree|SUnreclaim\' /proc/meminfo\n' +
            'rmmod leak\n' +
            'grep -E \'MemFree|SUnreclaim\' /proc/meminfo' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # grep -E \'MemFree|SUnreclaim\' /proc/meminfo\n' +
            'MemFree:          449152 kB\n' +
            'SUnreclaim:         5696 kB\n' +
            '~ # insmod /leak.ko\n' +
            '[   31.007427] leak: allocated 16 x 1 MiB, kept no pointer\n' +
            '~ # grep -E \'MemFree|SUnreclaim\' /proc/meminfo\n' +
            'MemFree:          436648 kB\n' +
            'SUnreclaim:        22084 kB\n' +
            '~ # rmmod leak\n' +
            '[   33.398835] leak: exit: nothing to kfree, the pointers are gone\n' +
            '~ # grep -E \'MemFree|SUnreclaim\' /proc/meminfo\n' +
            'MemFree:          438456 kB\n' +
            'SUnreclaim:        22084 kB' },

          { t: 'cal', kind: 'danger', title: '16 MiB mất cho tới lần boot sau', x:
            '<p><code>SUnreclaim</code> — bộ nhớ slab kernel <b>không thể thu hồi</b> — tăng từ ' +
            '<b>5 696</b> lên <b>22 084</b> kB: chênh <b>16 388</b> kB = 16 MiB của module cộng 4 kB ' +
            'lặt vặt. Sau <code>rmmod</code>, con số đó <b>không đổi một kB nào</b>. Mã của module đã ' +
            'biến mất; 16 MiB nó xin vẫn còn, và không còn ai giữ con trỏ để trả lại.</p>' +
            '<p><code>MemFree</code> nhích lên <b>1 808</b> kB sau <code>rmmod</code> — đó là trang mã ' +
            'và dữ liệu của chính module được trả, cộng cache chung dao động. Nó không liên quan tới ' +
            '16 MiB đã mất. Đọc <code>SUnreclaim</code>, không phải <code>MemFree</code>, khi nghi ngờ ' +
            'một module rò rỉ: <code>MemFree</code> nhiễu vì cache, <code>SUnreclaim</code> thì không.</p>' +
            '<p>Nạp <code>leak.ko</code> một lần nữa và <code>SUnreclaim</code> lên tiếp — trên máy ' +
            'viết bài, một lần chạy riêng đo được <b>38 476</b> kB sau lần nạp thứ hai — ' +
            'mỗi vòng <code>insmod</code>/<code>rmmod</code> của một driver rò rỉ mất thêm một lượng ' +
            'như vậy. Đó là lý do cặp <code>kmalloc</code>/<code>kfree</code> trong <code>init</code>/' +
            '<code>exit</code> là luật, không phải lời khuyên.</p>' +
            '<p>Các số <code>kB</code> ở đây sẽ lệch vài trăm trên máy bạn; chênh lệch <b>~16 384</b> ' +
            'kB thì không.</p>' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — Luật 6: copy_from_user với một con trỏ tốt và hai con trỏ xấu',
        blocks: [
          { t: 'p', x:
            '<code>uaccess.ko</code> chép chuỗi dòng lệnh của chính tiến trình <code>insmod</code> ' +
            'đang nạp nó — một con trỏ userspace hợp lệ — rồi thử hai con trỏ không được phép: ' +
            '<code>NULL</code>, và địa chỉ của một biến trên stack kernel:' },

          { t: 'code', where: 'qemu', code:
            'insmod /uaccess.ko\n' +
            'rmmod uaccess' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /uaccess.ko\n' +
            '[   35.801459] uaccess: argv at 0xfffff03f9f93: "insmod /uaccess.ko" (0 not copied)\n' +
            '[   35.802437] uaccess: from NULL: 8 of 8 not copied\n' +
            '[   35.802711] uaccess: from a kernel address: 8 of 8 not copied\n' +
            '~ # rmmod uaccess' },

          { t: 'table',
            head: ['Dòng', 'Con trỏ', 'Kết quả', 'Nghĩa là'],
            rows: [
              ['1', '<code>0xfffff03f9f93</code>', '<code>0 not copied</code>', 'Địa chỉ trong nửa dưới không gian ảo — vùng userspace (so với <code>ffff8000…</code> của kernel ở bước 4). Chép trọn vẹn: chuỗi đúng là lệnh bạn vừa gõ, gồm cả đối số. Địa chỉ đổi mỗi lần chạy.'],
              ['2', '<code>NULL</code>', '<code>8 of 8 not copied</code>', 'Trang 0 không được ánh xạ. <code>copy_from_user</code> bắt lỗi trang và trả về 8 — không byte nào chép được. Kernel không sập, không có dòng lỗi nào khác trong log.'],
              ['3', '<code>&amp;start</code> (stack kernel)', '<code>8 of 8 not copied</code>', 'Con trỏ <b>hợp lệ</b> với kernel, nhưng không nằm trong vùng userspace. <code>copy_from_user</code> kiểm tra điều đó <b>trước</b> khi chép và từ chối. Đây là chốt chặn chống lại một chương trình ác ý truyền địa chỉ kernel vào driver.']
            ] },

          { t: 'p', x:
            'Trong một driver thật (Bài 52), dòng 2 và 3 sẽ trở thành <code>return -EFAULT;</code> — ' +
            'và chương trình userspace nhận <code>Bad address</code> từ <code>read()</code> hay ' +
            '<code>write()</code> của nó, thay vì cả máy gặp sự cố. Kiểm tra module thật sự gọi hàm ' +
            'nào (trên WSL):' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-nm -u ~/bai51/rules/uaccess.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '                 U __arch_copy_from_user\n' +
            '                 U memset\n' +
            '                 U _printk\n' +
            '                 U __stack_chk_fail' },

          { t: 'p', x:
            'Lại không có tên <code>copy_from_user</code>: nó là hàm <code>inline</code> trong ' +
            '<code>&lt;linux/uaccess.h&gt;</code>, kiểm tra vùng địa chỉ ngay trong module rồi gọi ' +
            'xuống <code>__arch_copy_from_user</code> — phần viết bằng assembly ARM64, nơi xử lý PAN ' +
            'và lỗi trang. Hai ký hiệu còn lại do trình biên dịch tự thêm: <code>memset</code> để xoá ' +
            'phần <code>buf</code> không chép được (<code>copy_from_user</code> luôn điền 0 vào phần ' +
            'thiếu, để không lộ dữ liệu cũ trên stack), và <code>__stack_chk_fail</code> vì ' +
            '<code>buf[64]</code> là một mảng trên stack — <code>CONFIG_STACKPROTECTOR_STRONG</code> ' +
            'đặt một giá trị canh ở cuối khung.' },

          { t: 'p', x:
            'Kiểm tra dấu vết để lại, rồi tắt QEMU:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/sys/kernel/tainted\n' +
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/sys/kernel/tainted\n' +
            '4096\n' +
            '~ # poweroff -f\n' +
            '[   39.404290] Flash device refused suspend due to active operation (state 20)\n' +
            '[   39.404757] Flash device refused suspend due to active operation (state 20)\n' +
            '[   39.405773] reboot: Power down' },

          { t: 'p', x:
            '<b>4096</b> — chỉ bit 12, <code>O</code>, như Bài 50. Tám lần nạp module, một vụ rò ' +
            'rỉ 16 MiB, hai con trỏ xấu, và kernel vẫn không coi mình là "hỏng": rò rỉ bộ nhớ không ' +
            'phải điều kernel tự phát hiện được, còn hai con trỏ xấu đã được xử lý đúng cách. Hai dòng ' +
            '<code>Flash device refused suspend</code> là của driver flash CFI trên máy <code>virt</code> ' +
            'khi tắt nguồn cưỡng bức — vô hại, không liên quan tới module của bạn. Giữ ' +
            '<code>~/bai51</code> nếu bạn muốn chạy lại; Bài 52 bắt đầu từ Makefile của ' +
            '<code>~/bai50</code>, không cần thư mục này.' }
        ] }
    ] },

    /* ============================================================
       9. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>fatal error: stdio.h: No such file or directory</code>',
         'Include một header của libc trong module. Kbuild dịch với <code>-nostdinc</code>.',
         'Dùng header kernel: <code>&lt;linux/kernel.h&gt;</code>, <code>&lt;linux/string.h&gt;</code>, <code>&lt;linux/slab.h&gt;</code>… Tra hàm thay thế bằng <code>grep -w</code> trong <code>Module.symvers</code>.'],
        ['<code>ERROR: modpost: "puts" [….ko] undefined!</code> (hoặc <code>printf</code>, <code>malloc</code>…)',
         'Gọi một hàm không được kernel export. <code>puts</code> thường là do GCC tự đổi <code>printf("…\\n")</code>.',
         'Thay bằng hàm kernel tương ứng. Một tên <code>undefined</code> bạn chưa từng viết thì nghĩ tới tối ưu hoá của trình biên dịch.'],
        ['<code>error: ‘-mgeneral-regs-only’ is incompatible with the use of floating-point types</code>',
         'Dùng <code>float</code>/<code>double</code> với một giá trị chỉ biết lúc chạy.',
         'Chuyển sang số thập phân cố định: nhân với 10, 1000… và giữ số nguyên. Lỗi có thể trỏ vào <code>printk.h</code> thay vì dòng khai báo biến — tìm biến <code>float</code> gần dòng <code>pr_*</code> được nêu.'],
        ['<code>warning: the frame size of 4112 bytes is larger than 2048 bytes [-Wframe-larger-than=]</code>',
         'Một hàm đặt mảng hoặc struct lớn trên stack kernel (16 KiB).',
         'Chuyển bộ đệm sang <code>kmalloc</code> (nhớ <code>kfree</code>) hoặc sang biến <code>static</code>. Không tăng <code>CONFIG_FRAME_WARN</code> để "chữa" cảnh báo.'],
        ['<code>pr_debug</code> không in gì, kể cả trong <code>dmesg</code>',
         'Kernel không bật <code>CONFIG_DYNAMIC_DEBUG</code> và file không được dịch với <code>-DDEBUG</code> — dòng đó không có trong <code>.ko</code>.',
         'Thêm <code>CFLAGS_tên.o := -DDEBUG</code> vào Makefile. Muốn thấy trên console thì cũng nâng ngưỡng lên 8.'],
        ['Một dòng thông tin hiện với mức <code>&lt;4&gt;</code> trong <code>dmesg -r</code>',
         'Viết bằng <code>printk("…")</code> không có <code>KERN_*</code>; nhận mức mặc định <code>CONFIG_MESSAGE_LOGLEVEL_DEFAULT=4</code>.',
         'Dùng <code>pr_info</code>/<code>pr_err</code>… thay cho <code>printk</code> trần.'],
        ['<code>%p</code> in <code>(____ptrval____)</code> hoặc một số không giống địa chỉ',
         'Không phải lỗi: <code>%p</code> băm con trỏ để không lộ địa chỉ kernel; ngay sau boot nó chưa băm được nên từ chối in.',
         'Dùng <code>%px</code> khi gỡ lỗi và thật sự cần địa chỉ; <code>%pS</code> cho địa chỉ hàm.'],
        ['<code>kmalloc</code> trả <code>NULL</code> dù <code>free</code> báo còn nhiều bộ nhớ',
         'Xin vượt khối liên tục lớn nhất (4 MiB trên kernel này), hoặc bộ nhớ bị phân mảnh.',
         'Dùng <code>vmalloc</code> cho vùng lớn không cần liên tục vật lý. Luôn kiểm tra <code>NULL</code> và trả <code>-ENOMEM</code>.'],
        ['<code>SUnreclaim</code> tăng sau mỗi vòng <code>insmod</code>/<code>rmmod</code>',
         'Module <code>kmalloc</code> mà không <code>kfree</code> trong <code>exit</code> (hoặc trên đường lỗi của <code>init</code>).',
         'Mỗi <code>kmalloc</code> một <code>kfree</code>; giữ con trỏ ở nơi <code>exit</code> tìm thấy. Bộ nhớ đã mất chỉ lấy lại được bằng cách boot lại.'],
        ['<code>copy_from_user</code> trả về một số khác 0',
         'Con trỏ userspace không hợp lệ, hoặc trỏ vào vùng kernel. Giá trị trả về là số byte <b>không</b> chép được.',
         'Trả <code>-EFAULT</code> cho userspace. Đừng viết <code>if (copy_from_user(…) == n)</code> — điều kiện thành công là <code>== 0</code>.'],
        ['Kernel báo <code>Unable to handle kernel NULL pointer dereference</code>',
         'Mã module đọc hoặc ghi qua một con trỏ không hợp lệ — thường là một hàm tra cứu trả <code>NULL</code> mà không được kiểm tra, hoặc đọc thẳng con trỏ userspace.',
         'Dòng <code>pc : hàm+offset [module]</code> chỉ ra lệnh gây lỗi. Kiểm tra mọi con trỏ trả về trước khi dùng; dùng <code>copy_*_user</code> cho con trỏ từ userspace. Sau một oops nên boot lại.']
      ] },

    /* ============================================================
       10. RECAP
       ============================================================ */
    { t: 'recap', items: [
      '<b>Không libc</b>: <code>stdio.h</code> không tồn tại (<code>-nostdinc</code>); tự khai báo <code>printf</code> thì <code>modpost</code> báo <code>"puts" undefined</code>. Hàm thay thế tra bằng <code>grep -w</code> trong <code>Module.symvers</code> (<b>20 745</b> ký hiệu).',
      '<b>Không float</b>: kernel không cất <code>v0</code>–<code>v31</code> (<b>512 B</b>) khi vào kernel, nên <code>-mgeneral-regs-only</code> cấm chúng. Float trên hằng số build được chỉ vì đã gấp thành <code>mov w1, #74</code> lúc dịch.',
      '<b>Stack 16 KiB</b> = <code>1 &lt;&lt; 14</code> (<code>THREAD_SIZE</code>), nhỏ hơn stack userspace <b>512 lần</b>. Mảng 4 KiB → khung <b>4 112</b> B, cảnh báo vượt <code>CONFIG_FRAME_WARN=2048</code>, lấy <b>25 %</b> stack.',
      '<b>printk</b>: dùng <code>pr_*</code>, không dùng <code>printk</code> trần (nhận mức <b>4</b>). <code>dmesg -r</code> cho thấy mức <code>&lt;0&gt;</code>–<code>&lt;7&gt;</code>. <code>pr_debug</code> chỉ tồn tại với <code>-DDEBUG</code> (không có <code>DYNAMIC_DEBUG</code>).',
      '<b>%p</b> băm con trỏ (<code>(____ptrval____)</code> ngay sau boot), <b>%px</b> in địa chỉ thật, <b>%pS</b> in tên hàm — <code>do_one_initcall+0x70/0x1b8</code>.',
      '<b>kmalloc</b> làm tròn lên lớp kích thước (1→<b>8</b>, 100→<b>128</b>, 5000→<b>8192</b>), tối đa <b>4 MiB</b> liên tục; 8 MiB cần <code>vmalloc</code>. Luôn kiểm tra <code>NULL</code>, luôn <code>kfree</code>.',
      '<b>Rò rỉ là vĩnh viễn</b>: <code>SUnreclaim</code> 5 696 → <b>22 084</b> kB sau <code>leak.ko</code> và không giảm sau <code>rmmod</code>.',
      '<b>copy_from_user</b> trả về số byte <b>không</b> chép được: <b>0</b> với argv của <code>insmod</code>, <b>8 of 8</b> với <code>NULL</code> và với địa chỉ kernel — không sập. Đọc thẳng con trỏ sai thì là một oops.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Mọi module hôm nay chỉ chạy lúc <code>insmod</code> rồi ngồi yên. <b>Bài 52 — Character device ' +
         'driver</b> cho module một cánh cửa mà chương trình userspace mở được bất cứ lúc nào: một file ' +
         'trong <code>/dev</code>. Bạn sẽ đăng ký một major/minor number, điền một ' +
         '<code>struct file_operations</code>, và viết <code>read</code>/<code>write</code> cho một ' +
         'ram-disk nhỏ — nơi <code>kmalloc</code>/<code>kfree</code> của bước 5 giữ bộ đệm, và ' +
         '<code>copy_to_user</code>/<code>copy_from_user</code> của bước 6 đưa dữ liệu qua lại với một ' +
         'chương trình C bạn viết. Lần đầu tiên, <code>-EFAULT</code> sẽ là thứ một chương trình thật ' +
         'nhận được.' }
  ],

  quiz: [
    { q: 'Bạn build một module và nhận <code>ERROR: modpost: "puts" [sensor.ko] undefined!</code>, dù mã nguồn không có chữ <code>puts</code> nào. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Makefile thiếu <code>MODULE_LICENSE</code>.',
        'Mã gọi <code>printf("…\\n")</code> với nguyên mẫu tự khai báo; GCC đổi nó thành <code>puts</code>, và kernel không export hàm libc nào.',
        'Cây kernel chưa được build nên <code>Module.symvers</code> trống.',
        'Quên <code>CROSS_COMPILE</code>, nên <code>puts</code> của x86 được liên kết vào.'
      ],
      a: 1,
      why: 'Bước 1 gặp đúng dòng này. GCC thay <code>printf</code> không có tham số định dạng bằng <code>puts</code> — một tối ưu hoá của userspace. <code>modpost</code> tra <code>Module.symvers</code> và không tìm thấy ai export <code>puts</code>, vì kernel không có libc. Thiếu giấy phép cho thông báo khác (<code>missing MODULE_LICENSE()</code>); cây chưa build thì mọi ký hiệu đều thiếu, kể cả <code>_printk</code>.' },

    { q: 'Vì sao kernel ARM64 dịch mọi file với <code>-mgeneral-regs-only</code>?',
      opts: [
        'Vì CPU ARM64 không có phần cứng dấu phẩy động.',
        'Vì số thực chậm hơn số nguyên.',
        'Vì kernel không cất các thanh ghi <code>v0</code>–<code>v31</code> của tiến trình userspace khi đi vào kernel, nên mã kernel dùng chúng sẽ ghi đè số thực của chương trình kia.',
        'Vì <code>printk</code> không hỗ trợ định dạng <code>%f</code>.'
      ],
      a: 2,
      why: 'CPU có FPU (<code>/proc/cpuinfo</code> liệt kê <code>fp asimd</code>). Việc cất 512 byte thanh ghi trên mọi lối vào kernel sẽ làm chậm mọi syscall, nên kernel chỉ cất khi đổi tiến trình. Trong lúc đó các thanh ghi vẫn thuộc về userspace, và cờ này biến một lỗi âm thầm lúc chạy thành lỗi rõ ràng lúc dịch. Mã thật sự cần SIMD dùng <code>kernel_neon_begin()</code>/<code>kernel_neon_end()</code>.' },

    { q: 'Module của bạn build với cảnh báo <code>the frame size of 4112 bytes is larger than 2048 bytes</code>, nạp thử vẫn chạy bình thường. Nên làm gì?',
      opts: [
        'Không cần làm gì — đã nạp thử và nó chạy.',
        'Tăng <code>CONFIG_FRAME_WARN</code> lên 8192 để hết cảnh báo.',
        'Chuyển bộ đệm lớn khỏi stack, sang <code>kmalloc</code> (kèm <code>kfree</code>) hoặc biến <code>static</code>.',
        'Thêm <code>-O0</code> vào Makefile để trình biên dịch không tối ưu hoá khung stack.'
      ],
      a: 2,
      why: 'Stack kernel chỉ có 16 KiB, dùng chung cho cả chuỗi hàm lồng nhau. Lần thử ở bước 5 chạy được vì được gọi từ một đường nông; cùng hàm đó từ một đường sâu hơn có thể tràn stack, và với <code>VMAP_STACK</code> thì kernel panic. Tắt cảnh báo chỉ che triệu chứng; <code>-O0</code> thường làm khung <b>lớn hơn</b>.' },

    { q: 'Bạn thêm <code>pr_debug("reg = %x\\n", val);</code> vào driver, nâng ngưỡng console lên 8, nhưng dòng đó không hiện cả trên console lẫn trong <code>dmesg</code>. Kernel không bật <code>CONFIG_DYNAMIC_DEBUG</code>. Vì sao?',
      opts: [
        'Ngưỡng 8 vẫn còn quá thấp; phải đặt 9.',
        'Không có <code>-DDEBUG</code>, <code>pr_debug</code> không sinh ra mã nào — dòng đó không có trong <code>.ko</code>.',
        'Bộ đệm log đã đầy nên dòng mới bị bỏ.',
        '<code>pr_debug</code> chỉ hoạt động trong mã <code>=y</code>, không hoạt động trong module.'
      ],
      a: 1,
      why: 'Bước 3 đo đúng điều này: <code>strings loglevels.ko | grep -c \'level 7\'</code> in <b>0</b>. Ngưỡng console chỉ lọc những gì đã vào bộ đệm; <code>pr_debug</code> không có <code>DEBUG</code> thì không bao giờ gọi <code>printk</code>. Thêm <code>CFLAGS_tên.o := -DDEBUG</code> và dòng đó xuất hiện (bước 4).' },

    { q: 'Sau khi nạp và gỡ một module, <code>SUnreclaim</code> trong <code>/proc/meminfo</code> tăng 16 388 kB so với trước và không giảm lại. Kết luận nào đúng nhất?',
      opts: [
        'Bình thường — kernel giữ bộ nhớ làm cache và sẽ tự trả lại khi cần.',
        'Module đã <code>kmalloc</code> khoảng 16 MiB mà không <code>kfree</code>; bộ nhớ đó mất cho tới lần boot sau.',
        '<code>rmmod</code> chưa gỡ xong; chạy <code>rmmod</code> lần nữa sẽ trả lại bộ nhớ.',
        'Mã của module (16 MiB) vẫn nằm trong bộ nhớ vì taint là vĩnh viễn.'
      ],
      a: 1,
      why: '<code>SUnreclaim</code> là slab kernel <b>không</b> thu hồi được — không phải cache. Bước 5 đo đúng mẫu này với <code>leak.ko</code>: 5 696 → 22 084 kB, không đổi sau <code>rmmod</code>. Mã của một module nhỏ chỉ vài trang (12 288 B ở Bài 50), và taint là một bit trong một biến, không giữ bộ nhớ nào. Module không có không gian địa chỉ riêng để kernel thu hồi khi gỡ.' },

    { q: 'Trong hàm <code>write()</code> của driver, <code>copy_from_user(kbuf, ubuf, 100)</code> trả về <code>100</code>. Điều đó có nghĩa gì, và driver nên làm gì?',
      opts: [
        'Chép thành công 100 byte; xử lý dữ liệu trong <code>kbuf</code>.',
        'Không byte nào chép được — con trỏ <code>ubuf</code> không hợp lệ hoặc không thuộc userspace; trả <code>-EFAULT</code>.',
        'Kernel đã oops; driver không cần làm gì vì tiến trình đã bị giết.',
        'Chép được một nửa; gọi lại với 50 byte còn lại.'
      ],
      a: 1,
      why: 'Giá trị trả về là số byte <b>không</b> chép được. Bước 6 thấy <code>8 of 8 not copied</code> cho cả <code>NULL</code> lẫn một địa chỉ kernel, và kernel không sập — <code>copy_from_user</code> bắt lỗi trang và kiểm tra vùng địa chỉ thay cho bạn. Thành công là <code>0</code>. Chương trình userspace sẽ nhận <code>Bad address</code>.' }
  ]
});

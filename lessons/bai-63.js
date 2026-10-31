/* Bài 63 — Debug kernel bằng GDB
   Chặng 12 — Debug, đo đạc, tối ưu
   QEMU -s -S + gdb-multiarch + vmlinux: breakpoint trong kernel, đi từng dòng, đọc biến, rồi đặt
   breakpoint vào ts_probe() của driver tsensor (Bài 54) và đi từng dòng qua nó.
   Mọi số liệu đo 2026-10-31 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   gdb-multiarch 9.2), kernel ~/bai38/linux-6.18.45.
   - Bước 1: defconfig có DEBUG_INFO_REDUCED=y -> ptype struct platform_device = "No struct type".
     scripts/config --disable DEBUG_INFO_REDUCED --enable GDB_SCRIPTS -> diffconfig 3 dòng; make Image
     scripts_gdb 6m17.684s; vmlinux 225 769 864 -> 666 100 008 B, Image 49 342 976 B không đổi;
     .version 5 -> 6. ~/.gdbinit 3 dòng (add-auto-load-safe-path, confirm off, pagination off) — được
     thử bằng một file thật rồi xoá; các bản ghi GDB của bài dùng -iex với đúng ba lệnh đó.
   - Bước 2-3: break start_kernel (breakpoint phần mềm dừng được cả trước khi bật MMU, vì gdbstub của
     QEMU tự kiểm tra PC), next, p init_task, do_one_initcall, run_init_process, $lx_current, lx-dmesg
     (246 dòng), lx-ps (49 task), Ctrl-C -> cpu_do_idle.
   - Bước 4: -cpu max không nokaslr -> "KASLR enabled", breakpoint bị bỏ qua, pc 0xffffbe0a27358198 ??.
     -cpu cortex-a57 không cờ -> "KASLR disabled due to lack of seed". Bài dùng nokaslr ở mọi lần boot.
   - Bước 5-6: tsensor.ko build lại từ ~/bai54 (551 936 B, debug info đầy đủ), lx-symbols + breakpoint
     pending, insmod -> ts_probe(b000000.sensor), next/until/finish (trả 0), lần hai b002000.sensor;
     ts_read: ts "optimized out" -> filp->private_data, set var 99000, rwatch -l -> temp_show.
   Không ghi gì vào ~/bai54. ~/bai63 (~8M) là nháp, xoá được. ~/bai38 bị đổi .config (3 dòng) và build lại. */

Lesson.register({
  id: 'bai-63',
  title: 'Debug kernel bằng GDB',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Nâng cao',

  intro:
    'Từ Bài 50 tới giờ, mỗi khi muốn biết driver đang làm gì, bạn thêm một dòng <code>pr_info</code>, ' +
    'build lại, tạo lại initramfs, boot lại, rồi đọc log. Bài 54 có tới 13 lệnh <code>return</code> trong ' +
    '<code>ts_probe()</code>; muốn biết nó dừng ở cái nào, bạn phải đoán trước và rải log ở đúng chỗ. Nếu ' +
    'đoán sai, làm lại cả vòng.<br><br>' +
    'Bài này đổi cách làm: bạn <b>dừng chính kernel đang chạy</b> trong QEMU, rồi hỏi nó ' +
    'bằng <code>gdb-multiarch</code> — đang ở hàm nào, ai gọi tới, biến này đang mang giá trị gì — mà không ' +
    'thêm một dòng code nào. Bạn sẽ dừng kernel ở dòng đầu tiên của <code>start_kernel</code>, theo nó tới ' +
    'lúc chạy <code>/init</code>, rồi đặt breakpoint vào <code>ts_probe()</code> của chính bạn, đi từng dòng ' +
    'qua nó, và sửa một biến trong bộ nhớ kernel để <code>cat /dev/tsensor0</code> in ra một số bạn chọn. ' +
    'Bạn cũng sẽ gặp ba trở ngại có thật: debug info bị cắt bớt, KASLR làm mọi địa chỉ sai, và biến bị ' +
    'compiler tối ưu mất.',

  goals: [
    'Bật debug info đầy đủ (<code>DEBUG_INFO_REDUCED</code> tắt) và <code>GDB_SCRIPTS</code> trong kernel, ' +
      'rồi đo được cái giá: <code>vmlinux</code> từ 225 MB lên 666 MB, còn <code>Image</code> không đổi một byte.',
    'Nối <code>gdb-multiarch</code> vào QEMU <code>-s -S</code>, đặt breakpoint ở một hàm kernel, đi từng ' +
      'dòng bằng <code>next</code>/<code>until</code>/<code>finish</code> và đọc biến bằng <code>print</code>/' +
      '<code>ptype</code>/<code>bt</code>.',
    'Dùng các lệnh <code>lx-*</code> của kernel (<code>lx-dmesg</code>, <code>lx-ps</code>, ' +
      '<code>lx-lsmod</code>, <code>$lx_current()</code>) để đọc trạng thái kernel ngay cả khi shell không gõ được.',
    'Giải thích vì sao KASLR làm breakpoint không bao giờ dừng, và tắt nó bằng <code>nokaslr</code>.',
    'Nạp symbol của một module bằng <code>lx-symbols</code>, dừng trong <code>probe()</code> của driver ' +
      'mình viết, sửa một biến bằng <code>set var</code> và bắt mọi lần đọc nó bằng <code>rwatch</code>.',
    'Xử lý được <code>value has been optimized out</code> bằng cách đi tìm cùng giá trị qua một con đường khác.'
  ],

  blocks: [

    /* ============================================================
       1. VÌ SAO PHẢI DỪNG KERNEL LẠI
       ============================================================ */
    { t: 'h2', x: 'Log kể lại, debugger cho bạn hỏi' },

    { t: 'p', x:
      '<code>printk</code> giống camera an ninh ghi hình sẵn ở vài góc bạn chọn từ trước: xem lại được, ' +
      'nhưng chỉ những góc đã lắp camera. Debugger giống việc bấm nút dừng cả căn nhà, rồi đi vào bất kỳ ' +
      'phòng nào, mở bất kỳ ngăn kéo nào. Bạn không cần đoán trước câu hỏi — bạn hỏi sau khi đã dừng.' },

    { t: 'table',
      head: ['', '<code>pr_info</code> / <code>dev_dbg</code>', 'GDB qua QEMU'],
      rows: [
        ['Phải sửa code', 'Có — mỗi câu hỏi mới là một lần build lại', 'Không — cùng <code>tsensor.ko</code> của Bài 54'],
        ['Thấy được gì', 'Chỉ những biến bạn đã in', 'Mọi biến, mọi struct, toàn bộ chuỗi hàm đang gọi nhau'],
        ['Thay đổi được trạng thái', 'Không', 'Có — <code>set var</code> ghi thẳng vào bộ nhớ kernel'],
        ['Ảnh hưởng thời gian', 'Nhỏ, nhưng có (Bài 53 đo <code>-DDEBUG</code> làm <code>ioctl</code> chậm từ 2,4 µs lên 121 µs)', 'Kernel đứng yên hoàn toàn khi dừng; đồng hồ của nó cũng đứng'],
        ['Dùng được trên sản phẩm thật', 'Luôn luôn', 'Cần JTAG hoặc KGDB trên bo mạch thật; với QEMU thì có sẵn'],
        ['Khi nào chọn', 'Lỗi chỉ xảy ra sau hàng giờ chạy, hoặc phụ thuộc thời gian', 'Lỗi tái hiện được, cần biết <i>vì sao</i> một nhánh được chọn']
      ] },

    { t: 'cal', kind: 'info', title: 'Hai công cụ không loại trừ nhau',
      x: 'Người làm kernel chuyên nghiệp dùng cả hai, và Chặng 12 dạy cả hai: bài này là debugger, Bài 64 ' +
         'đọc log sau khi kernel đã chết (oops, panic), Bài 65 là ftrace — ghi lại mọi lời gọi hàm mà không ' +
         'phải dừng kernel. Bài này dạy loại công cụ duy nhất trong ba cho phép bạn <b>dừng lại và hỏi</b>.' },

    /* ============================================================
       2. BA BÊN: QEMU, GDB, VMLINUX
       ============================================================ */
    { t: 'h2', x: 'Ba bên trong một phiên debug kernel' },

    { t: 'p', x:
      'Bài 31 và Bài 33 đã cho bạn dùng <code>-s -S</code> với <code>gdb-multiarch</code> trên một chương ' +
      'trình bare-metal 105 byte và trên đoạn mồi 40 byte của QEMU. Kernel dùng đúng cơ chế đó, chỉ khác ' +
      'kích thước: thay vì <code>hello.elf</code> vài KB, GDB đọc <code>vmlinux</code> hơn 600 MB.' },

    { t: 'fig',
      cap: 'GDB không chạy trong máy ảo. Nó là chương trình x86-64 trong WSL, đọc bảng ký hiệu và debug ' +
           'info từ file <code>vmlinux</code> trên ổ đĩa của bạn, rồi nói chuyện với <b>gdbstub</b> — một phần ' +
           'của QEMU, không phải của kernel — qua cổng TCP 1234. Kernel trong máy ảo không biết mình đang bị ' +
           'debug: không cần driver, không cần cấu hình gì bên trong guest.',
      svg:
        '<svg viewBox="0 0 720 270" width="720" role="img" aria-label="Sơ đồ ba bên: gdb-multiarch trong WSL đọc vmlinux và tsensor.ko từ ổ đĩa, nối qua TCP cổng 1234 tới gdbstub của QEMU, gdbstub điều khiển CPU ảo đang chạy kernel">' +
        '<rect class="d-box" x="16" y="16" width="688" height="238" rx="8"/>' +
        '<text class="d-ts" x="32" y="36">WSL (máy host, x86-64)</text>' +
        '<rect class="d-box-p" x="36" y="56" width="220" height="86" rx="6"/>' +
        '<text class="d-t" x="146" y="80" text-anchor="middle">gdb-multiarch</text>' +
        '<text class="d-ts" x="146" y="100" text-anchor="middle">break · next · print · bt</text>' +
        '<text class="d-ts" x="146" y="118" text-anchor="middle">+ lệnh lx-* (Python)</text>' +
        '<rect class="d-box" x="36" y="170" width="220" height="64" rx="6"/>' +
        '<text class="d-tm" x="146" y="194" text-anchor="middle">vmlinux · tsensor.ko</text>' +
        '<text class="d-ts" x="146" y="214" text-anchor="middle">ký hiệu + debug info, chỉ đọc</text>' +
        '<line class="d-line" x1="146" y1="170" x2="146" y2="150"/><path class="d-arrow" d="M 146 142 l -4 8 l 8 0 z"/>' +
        '<rect class="d-box-a" x="416" y="40" width="268" height="200" rx="6"/>' +
        '<text class="d-t" x="550" y="62" text-anchor="middle">qemu-system-aarch64</text>' +
        '<rect class="d-box-g" x="436" y="76" width="228" height="48" rx="6"/>' +
        '<text class="d-t" x="550" y="98" text-anchor="middle">gdbstub</text>' +
        '<text class="d-ts" x="550" y="114" text-anchor="middle">-s mở cổng · -S đứng chờ</text>' +
        '<rect class="d-box" x="436" y="142" width="228" height="82" rx="6"/>' +
        '<text class="d-t" x="550" y="164" text-anchor="middle">CPU ảo cortex-a57</text>' +
        '<text class="d-ts" x="550" y="184" text-anchor="middle">đang chạy kernel 6.18.45</text>' +
        '<text class="d-ts" x="550" y="204" text-anchor="middle">+ tsensor.ko sau insmod</text>' +
        '<line class="d-line" x1="550" y1="124" x2="550" y2="134"/><path class="d-arrow" d="M 550 142 l -4 -8 l 8 0 z"/>' +
        '<line class="d-line" x1="256" y1="99" x2="428" y2="99"/><path class="d-arrow" d="M 436 99 l -8 -4 l 0 8 z"/>' +
        '<text class="d-tm" x="346" y="90" text-anchor="middle">TCP :1234</text>' +
        '<text class="d-ts" x="346" y="120" text-anchor="middle">đọc/ghi thanh ghi, bộ nhớ,</text>' +
        '<text class="d-ts" x="346" y="136" text-anchor="middle">đặt breakpoint, chạy tiếp</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hệ quả của hình trên: <b>GDB chỉ biết những gì nằm trong file bạn đưa cho nó</b>. Nó hỏi QEMU "thanh ' +
      'ghi PC bằng bao nhiêu", nhận về <code>0xffff800081e60908</code>, rồi tra trong <code>vmlinux</code> ' +
      'để biết địa chỉ đó là <code>start_kernel</code>, dòng 865 của <code>init/main.c</code>. Nếu file ' +
      'thiếu thông tin, hoặc địa chỉ trong file không khớp địa chỉ trong máy ảo, GDB sẽ trả lời sai mà ' +
      'không hề báo lỗi. Hai phần tiếp theo nói về đúng hai trường hợp đó.' },

    { t: 'cal', kind: 'why', title: 'Vì sao breakpoint thường dừng được cả trước khi kernel bật MMU',
      x: 'Trên bo mạch thật, <code>break</code> hoạt động bằng cách ghi một lệnh <code>brk</code> đè lên mã ' +
         'trong RAM. Trước khi kernel bật MMU, địa chỉ ảo <code>0xffff8000…</code> chưa tồn tại, nên ghi đè ' +
         'là không thể; khi đó phải dùng <code>hbreak</code> — breakpoint bằng thanh ghi phần cứng của CPU. ' +
         'gdbstub của QEMU thì khác: nó tự so PC với danh sách breakpoint mỗi khi dịch một khối lệnh, không ' +
         'ghi gì vào RAM của guest. Vì vậy <code>break start_kernel</code> dừng được ngay từ lần boot đầu. ' +
         'Khi debug bo mạch thật qua JTAG, hãy nhớ <code>hbreak</code>; số thanh ghi có ' +
         'hạn — kernel tự in con số đó lúc boot: <code>hw-breakpoint: found 6 breakpoint and 4 watchpoint ' +
         'registers.</code>' },

    /* ============================================================
       3. DEBUG INFO: CÁI GDB CẦN ĐỌC
       ============================================================ */
    { t: 'h2', x: 'Debug info: bản đồ từ địa chỉ về dòng code' },

    { t: 'p', x:
      'Máy chỉ chạy lệnh máy ở các địa chỉ. Câu "địa chỉ <code>0xffff800081e60908</code> là dòng 865 của ' +
      '<code>init/main.c</code>" và câu "<code>ts</code> là một <code>struct ts_dev *</code>, field ' +
      '<code>offset_mdeg</code> nằm ở byte thứ 16" không có trong mã máy. Compiler ghi chúng riêng ra các ' +
      'section <code>.debug_*</code> theo định dạng <b>DWARF</b> khi được gọi với <code>-g</code>. Bài 40 đã ' +
      'thấy chúng làm <code>vmlinux</code> to gấp gần 4 lần <code>Image</code> mà không đóng góp byte nào ' +
      'vào thứ kernel thực sự chạy.' },

    { t: 'table',
      head: ['Section', 'Chứa gì', 'GDB dùng để'],
      rows: [
        ['<code>.debug_line</code>', 'Bảng địa chỉ → file:dòng', '<code>break init/main.c:865</code>, <code>next</code>, <code>list</code>, hiện dòng code khi dừng'],
        ['<code>.debug_info</code>', 'Mọi kiểu, struct, biến, tham số hàm', '<code>print *pdev</code>, <code>ptype</code>, <code>info locals</code>'],
        ['<code>.debug_loc</code>', 'Biến cục bộ đang nằm ở thanh ghi nào, tại từng đoạn mã', 'Đọc biến sau khi compiler dời nó từ ô nhớ sang thanh ghi'],
        ['<code>.debug_frame</code>', 'Cách lần ngược stack từ một hàm về hàm gọi nó', '<code>bt</code>, <code>finish</code>, <code>up</code>/<code>down</code>'],
        ['<code>.debug_str</code>', 'Tên dùng chung (tên biến, tên field)', 'Giảm kích thước các section trên']
      ] },

    { t: 'p', x:
      '<code>defconfig</code> của arm64 bật <code>CONFIG_DEBUG_INFO=y</code> nhưng kèm ' +
      '<code>CONFIG_DEBUG_INFO_REDUCED=y</code>. Help của tùy chọn này viết thẳng: "tools that need full ' +
      'debugging information (like kgdb or systemtap) won\'t be happy. But if you merely need debugging ' +
      'information to resolve line numbers there is no loss". Cụ thể, <code>scripts/Makefile.debug</code> ' +
      'thêm hai cờ: <code>-femit-struct-debug-baseonly</code> (chỉ ghi kiểu struct vào file <code>.o</code> ' +
      'có tên trùng với header khai báo nó) và <code>-fno-var-tracking</code> (không ghi biến cục bộ đang ở ' +
      'thanh ghi nào). Hậu quả bạn sẽ đo ở bước 1: GDB biết dòng code, nhưng <code>ptype struct ' +
      'platform_device</code> trả lời <code>No struct type named platform_device</code> — tức là ' +
      '<code>print *pdev</code>, việc chính của bài này, không làm được.' },

    { t: 'cal', kind: 'warn', title: 'Bật debug info đầy đủ có giá của nó',
      x: 'Trên máy B, <code>vmlinux</code> tăng từ <b>225 769 864 B</b> lên <b>666 100 008 B</b> (×2,95), riêng ' +
         '<code>.debug_info</code> từ 90 MB lên 412 MB, và một section mới <code>.debug_loc</code> 96 MB xuất ' +
         'hiện — chính là phần <code>-fno-var-tracking</code> đã cắt. Build lại mất <b>6 phút 17 giây</b> vì ' +
         'mọi file <code>.o</code> đổi cờ biên dịch. Bù lại, <code>arch/arm64/boot/Image</code> vẫn đúng ' +
         '<b>49 342 976 B</b>: debug info không bao giờ lên bo mạch. Đó là lý do sản phẩm thật vẫn có thể ' +
         'build với debug info đầy đủ, rồi lưu <code>vmlinux</code> lại để debug khi khách hàng gửi log về.' },

    { t: 'p', x:
      'Tùy chọn thứ hai, <code>CONFIG_GDB_SCRIPTS</code>, không đổi một byte nào trong kernel. Nó chỉ tạo ' +
      'một symlink <code>vmlinux-gdb.py</code> cạnh <code>vmlinux</code>, trỏ tới ' +
      '<code>scripts/gdb/vmlinux-gdb.py</code>. Khi GDB mở <code>vmlinux</code>, nó tìm file ' +
      '<code>&lt;tên&gt;-gdb.py</code> cùng thư mục và tự nạp — nếu bạn cho phép. Bộ script này thêm ' +
      '<b>34</b> lệnh <code>lx-*</code> viết bằng Python, đọc thẳng cấu trúc dữ liệu của kernel trong bộ nhớ ' +
      'máy ảo: danh sách tiến trình, log buffer, module đã nạp. Bạn sẽ thấy giá trị của chúng ở bước 3: khi ' +
      'kernel đang dừng, không có shell nào để gõ <code>dmesg</code>, nhưng <code>lx-dmesg</code> vẫn đọc ' +
      'được.' },

    { t: 'terms', items: [
      ['DWARF', '—', 'Định dạng chuẩn của debug info trong file ELF. Không phải từ viết tắt; tên chơi chữ với ELF (yêu tinh — người lùn). Đọc thô bằng <code>readelf --debug-dump</code>.'],
      ['Symbol', 'ký hiệu', 'Một cặp tên ↔ địa chỉ, nằm trong <code>.symtab</code>. Có symbol là đủ để <code>break start_kernel</code>; muốn có dòng code và kiểu dữ liệu thì cần thêm DWARF.'],
      ['gdbstub', '—', 'Phần của QEMU nói giao thức GDB remote (RSP) qua TCP. Trên phần cứng thật, vai trò này do một JTAG probe + OpenOCD đảm nhận, hoặc do KGDB nằm ngay trong kernel.'],
      ['Auto-load', '—', 'GDB tự chạy file <code>vmlinux-gdb.py</code> khi mở <code>vmlinux</code>. Vì một file Python có thể làm bất cứ điều gì, GDB từ chối trừ khi thư mục nằm trong <code>auto-load safe-path</code>.']
    ] },

    /* ============================================================
       4. KASLR
       ============================================================ */
    { t: 'h2', x: 'KASLR: khi địa chỉ trong file không còn đúng' },

    { t: 'p', x:
      '<b>KASLR</b> (Kernel Address Space Layout Randomization) dời toàn bộ kernel tới một địa chỉ ảo ngẫu ' +
      'nhiên mỗi lần boot. Mục đích là bảo mật: một lỗi tràn bộ đệm trong kernel không thể nhảy tới ' +
      '<code>commit_creds</code> nếu kẻ tấn công không biết hàm đó nằm ở đâu. Bài 37 đã thấy một mặt của ' +
      'chính sách này: <code>/proc/kallsyms</code> in mọi địa chỉ là <code>0000000000000000</code> cho người ' +
      'dùng thường.' },

    { t: 'p', x:
      'Với debugger, KASLR là thảm họa. <code>vmlinux</code> ghi <code>start_kernel</code> ở ' +
      '<code>0xffff800081e60908</code>. Nếu kernel bị dời đi một đoạn ngẫu nhiên, hàm đó trong máy ảo nằm ' +
      'ở chỗ khác; GDB đặt breakpoint ở địa chỉ cũ, CPU không bao giờ chạy qua địa chỉ đó, và kernel boot ' +
      'thẳng tới shell. Không có lỗi nào được in ra. Khi bạn bấm Ctrl-C, PC rơi vào một địa chỉ mà ' +
      '<code>vmlinux</code> không biết, nên GDB in <code>?? ()</code>.' },

    { t: 'p', x:
      'Kernel arm64 lấy hạt giống ngẫu nhiên ở hai nơi: property <code>/chosen/kaslr-seed</code> trong ' +
      'Device Tree do bootloader ghi, hoặc lệnh <code>RNDR</code> của CPU nếu CPU có bộ sinh số ngẫu nhiên ' +
      '(<code>arch/arm64/kernel/pi/kaslr_early.c</code>, dòng 47–50). Bài 45 đã đo: QEMU 4.2.1 <b>không</b> ' +
      'ghi <code>kaslr-seed</code>. Cortex-A57 không có <code>RNDR</code>. Vì thế với ' +
      '<code>-cpu cortex-a57</code> mà mọi bài từ Bài 32 dùng, kernel tự in <code>KASLR disabled due to lack ' +
      'of seed</code>, và bạn đã debug được mà không biết vì sao. Đổi sang <code>-cpu max</code> — CPU ảo ' +
      'có mọi tính năng QEMU hỗ trợ, gồm <code>RNDR</code> — và câu chuyện khác hẳn; bước 4 cho bạn xem.' },

    { t: 'table',
      head: ['Dòng lệnh QEMU', 'Kernel in', 'Breakpoint ở <code>start_kernel</code>'],
      rows: [
        ['<code>-cpu cortex-a57</code>, không thêm gì', '<code>KASLR disabled due to lack of seed</code>', 'Dừng — nhưng chỉ nhờ may mắn'],
        ['<code>-cpu max</code>, không thêm gì', '<code>KASLR enabled</code>', '<b>Không bao giờ dừng</b>, Ctrl-C ra <code>?? ()</code>'],
        ['<code>-cpu max</code> + <code>nokaslr</code>', '<code>KASLR disabled on command line</code>', 'Dừng'],
        ['<code>-cpu cortex-a57</code> + <code>nokaslr</code>', '<code>KASLR disabled on command line</code>', 'Dừng — cách bài này dùng']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao bài thêm nokaslr dù cortex-a57 đã không có KASLR',
      x: 'Vì lý do bạn không có KASLR lúc này là ngẫu nhiên: một QEMU mới hơn (machine A dùng 10.2.1, Bài 36 ' +
         'thấy nó ghi <code>kaslr-seed</code>), một bootloader như U-Boot của Chặng 06, hoặc một bo mạch có ' +
         'bộ sinh số ngẫu nhiên đều bật lại nó. <code>nokaslr</code> trên dòng lệnh kernel là cách duy nhất ' +
         'làm cho phiên debug không phụ thuộc vào những thứ đó, và kernel xác nhận bằng một dòng rõ ràng: ' +
         '<code>KASLR disabled on command line</code>. Chính tài liệu ' +
         '<code>Documentation/process/debugging/gdb-kernel-debugging.rst</code> của kernel cũng dặn ' +
         'thêm <code>nokaslr</code>. Quy tắc dễ nhớ: <b>debug kernel bằng GDB thì luôn có nokaslr</b>.' },

    /* ============================================================
       5. MODULE: ĐỊA CHỈ CHỈ CÓ SAU INSMOD
       ============================================================ */
    { t: 'h2', x: 'Module: địa chỉ chỉ có sau insmod' },

    { t: 'p', x:
      '<code>vmlinux</code> là một file đã link xong: mọi hàm có địa chỉ cố định ngay trong file. ' +
      '<code>tsensor.ko</code> thì không. Bài 50 đã cho bạn thấy nó là <code>ELF … relocatable</code> — mã ' +
      'chưa có địa chỉ, chỉ có độ lệch trong từng section. Kernel chọn chỗ đặt nó lúc ' +
      '<code>insmod</code>, và chỉ lúc đó <code>ts_probe</code> mới có một địa chỉ thật. Vì vậy, gõ ' +
      '<code>break ts_probe</code> khi GDB mới chỉ đọc <code>vmlinux</code> sẽ nhận ' +
      '<code>Function "ts_probe" not defined.</code>' },

    { t: 'p', x:
      'Lệnh <code>lx-symbols</code> giải quyết việc này theo hai bước. Ngay khi gõ, nó đọc danh sách ' +
      'module đang nạp trong kernel (giống <code>lsmod</code>), tìm file <code>.ko</code> cùng tên trong các ' +
      'thư mục bạn chỉ cho nó, và gọi <code>add-symbol-file</code> với địa chỉ mà kernel đã chọn. Sau đó nó ' +
      'đặt một breakpoint ẩn ở hàm <code>do_init_module</code> của kernel: mỗi lần có module mới, GDB dừng ' +
      'lại một chút, nạp symbol cho module đó, rồi tự chạy tiếp. Kết hợp với một breakpoint ' +
      '<b>pending</b> — "đặt khi nào tên này xuất hiện" — bạn có thể dừng ở dòng đầu tiên của ' +
      '<code>ts_probe</code> trong chính lần <code>insmod</code> sinh ra nó.' },

    { t: 'fig',
      cap: 'Thứ tự quyết định mọi thứ: breakpoint pending phải được đặt <b>trước</b> <code>insmod</code>. ' +
           '<code>insmod</code> nạp mã vào <code>0xffff80007afd0000</code>, gọi <code>ts_init</code> → ' +
           '<code>platform_driver_register</code>, và driver core gọi <code>ts_probe</code> ngay bên trong ' +
           'lời gọi đó — trước khi <code>insmod</code> kịp trả về. Đặt breakpoint sau khi <code>insmod</code> ' +
           'xong là đã muộn: hai lần <code>probe()</code> đã chạy xong.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Trình tự: đặt breakpoint pending, gõ insmod, kernel cấp phát chỗ cho module, lx-symbols nạp ký hiệu, breakpoint thành thật, probe dừng">' +
        '<rect class="d-box" x="16" y="20" width="128" height="72" rx="6"/>' +
        '<text class="d-t" x="80" y="44" text-anchor="middle">1 · GDB</text>' +
        '<text class="d-tm" x="80" y="64" text-anchor="middle">break ts_probe</text>' +
        '<text class="d-ts" x="80" y="82" text-anchor="middle">→ PENDING</text>' +
        '<line class="d-line" x1="144" y1="56" x2="160" y2="56"/><path class="d-arrow" d="M 168 56 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box" x="168" y="20" width="128" height="72" rx="6"/>' +
        '<text class="d-t" x="232" y="44" text-anchor="middle">2 · guest</text>' +
        '<text class="d-tm" x="232" y="64" text-anchor="middle">insmod</text>' +
        '<text class="d-ts" x="232" y="82" text-anchor="middle">kernel chọn địa chỉ</text>' +
        '<line class="d-line" x1="296" y1="56" x2="312" y2="56"/><path class="d-arrow" d="M 320 56 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="320" y="20" width="128" height="72" rx="6"/>' +
        '<text class="d-t" x="384" y="44" text-anchor="middle">3 · lx-symbols</text>' +
        '<text class="d-tm" x="384" y="64" text-anchor="middle">do_init_module</text>' +
        '<text class="d-ts" x="384" y="82" text-anchor="middle">nạp tsensor.ko</text>' +
        '<line class="d-line" x1="448" y1="56" x2="464" y2="56"/><path class="d-arrow" d="M 472 56 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box" x="472" y="20" width="108" height="72" rx="6"/>' +
        '<text class="d-t" x="526" y="44" text-anchor="middle">4 · GDB</text>' +
        '<text class="d-tm" x="526" y="64" text-anchor="middle">PENDING →</text>' +
        '<text class="d-tm" x="526" y="80" text-anchor="middle">0x…afd01f8</text>' +
        '<line class="d-line" x1="580" y1="56" x2="596" y2="56"/><path class="d-arrow" d="M 604 56 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-g" x="604" y="20" width="100" height="72" rx="6"/>' +
        '<text class="d-t" x="654" y="44" text-anchor="middle">5 · dừng</text>' +
        '<text class="d-tm" x="654" y="64" text-anchor="middle">ts_probe</text>' +
        '<text class="d-tm" x="654" y="80" text-anchor="middle">tsensor.c:104</text>' +
        '<rect class="d-box-w" x="16" y="128" width="688" height="104" rx="6"/>' +
        '<text class="d-t" x="32" y="152">Call stack khi dừng ở bước 5 (rút gọn từ bt thật):</text>' +
        '<text class="d-tm" x="32" y="174">ts_probe ← platform_probe ← really_probe ← driver_probe_device ← __driver_attach</text>' +
        '<text class="d-tm" x="32" y="194">← bus_for_each_dev ← driver_attach ← bus_add_driver ← driver_register</text>' +
        '<text class="d-tm" x="32" y="214">← __platform_driver_register ← ?? (ts_init, trong .init.text của module)</text>' +
        '</svg>' },

    /* ============================================================
       6. BẢNG LỆNH GDB
       ============================================================ */
    { t: 'h2', x: 'Mười lăm lệnh GDB đủ cho bài này' },

    { t: 'p', x:
      'Bài 31 đã dạy bốn lệnh cho mã máy: <code>x</code>, <code>stepi</code>, <code>info registers</code>, ' +
      '<code>$pc</code>. Khi có debug info, bạn làm việc ở mức dòng C thay vì lệnh máy. Không cần học ' +
      'thuộc bảng dưới: trong GDB, <code>help &lt;lệnh&gt;</code> in hướng dẫn của bất kỳ lệnh nào, và ' +
      '<code>apropos lx-</code> liệt kê mọi lệnh của kernel.' },

    { t: 'table',
      head: ['Lệnh', 'Viết tắt', 'Làm gì'],
      rows: [
        ['<code>target remote :1234</code>', '—', 'Nối vào gdbstub của QEMU'],
        ['<code>break HÀM</code> / <code>break FILE:DÒNG</code>', '<code>b</code>', 'Dừng khi CPU tới đó'],
        ['<code>continue</code>', '<code>c</code>', 'Chạy tiếp tới breakpoint kế. <b>Ctrl-C</b> trong cửa sổ GDB dừng lại ngay'],
        ['<code>next</code>', '<code>n</code>', 'Chạy một dòng C; nếu dòng đó gọi hàm, chạy trọn hàm đó'],
        ['<code>step</code>', '<code>s</code>', 'Chạy một dòng C; nếu có lời gọi hàm, đi <i>vào</i> hàm đó'],
        ['<code>until DÒNG</code>', '<code>u</code>', 'Chạy tới dòng chỉ định trong hàm hiện tại'],
        ['<code>finish</code>', '<code>fin</code>', 'Chạy tới khi hàm hiện tại trả về, in giá trị trả về'],
        ['<code>bt</code>', '—', '<i>backtrace</i>: chuỗi hàm đã gọi tới đây, hàm hiện tại là <code>#0</code>'],
        ['<code>print BIỂU_THỨC</code>', '<code>p</code>', 'Tính và in một biểu thức C: <code>p *pdev</code>, <code>p ts-&gt;label</code>. <code>p/x</code> in hệ 16'],
        ['<code>ptype KIỂU</code>', '—', 'In định nghĩa một kiểu hoặc kiểu của một biểu thức'],
        ['<code>info args</code> / <code>info locals</code>', '—', 'Mọi tham số / biến cục bộ của hàm hiện tại'],
        ['<code>set var BIẾN = GIÁ_TRỊ</code>', '—', 'Ghi vào bộ nhớ kernel'],
        ['<code>watch</code> / <code>rwatch</code> <code>-l BIỂU_THỨC</code>', '—', 'Dừng khi ô nhớ bị ghi / bị đọc. <code>-l</code> = theo địa chỉ, không theo tên biến'],
        ['<code>info breakpoints</code>', '<code>i b</code>', 'Liệt kê breakpoint, kèm số lần đã chạm'],
        ['<code>delete [SỐ]</code>', '<code>d</code>', 'Xoá một hoặc mọi breakpoint']
      ] },

    { t: 'cal', kind: 'tip', title: 'next hay step: câu hỏi duy nhất cần nhớ',
      x: 'Khi đứng ở dòng <code>ts = devm_kzalloc(dev, sizeof(*ts), GFP_KERNEL);</code>, bạn có muốn biết ' +
         '<code>devm_kzalloc</code> làm gì bên trong không? Không — bạn tin nó, chỉ cần kết quả: dùng ' +
         '<code>next</code>. Có — bạn nghi chính hàm đó: dùng <code>step</code>. Trong kernel, ' +
         '<code>step</code> bừa bãi sẽ đưa bạn vào allocator, rồi spinlock, rồi tracing — rất khó quay ra. ' +
         'Nếu lỡ vào, <code>finish</code> đưa bạn về ngay dòng gọi.' },

    /* ============================================================
       7. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: dừng kernel, rồi dừng driver của chính bạn' },

    { t: 'p', x:
      'Bài cần hai thứ có sẵn từ trước: cây kernel <code>~/bai38/linux-6.18.45</code> (Bài 40) và driver ' +
      '<code>tsensor</code> cùng cây <code>board.dtb</code> trong <code>~/bai54</code> (Bài 54). Bài chỉ ' +
      '<b>đọc</b> <code>~/bai54</code>; mọi thứ mới nằm trong <code>~/bai63</code>. Bạn cần <b>hai cửa sổ ' +
      'WSL</b>, đúng cách làm của Bài 31 và Bài 33: cửa sổ 1 chạy QEMU (và là nơi bạn gõ lệnh vào guest), ' +
      'cửa sổ 2 chạy GDB.' },

    { t: 'cal', kind: 'warn', title: 'Bước 1 sửa .config của ~/bai38 và build lại kernel',
      x: 'Đây là lần đầu tiên kể từ Bài 58 bạn đổi cấu hình kernel. Sau bước 1, <code>vmlinux</code> to gần ' +
         'gấp ba, nên mọi kích thước <code>vmlinux</code> ghi ở các bài trước sẽ không khớp với cây của bạn ' +
         'nữa — điều đó là đúng, không phải lỗi. <code>Image</code>, các <code>.ko</code> đã build và mọi ' +
         'driver của Chặng 10 vẫn chạy như cũ.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Đo xem debug info hiện tại thiếu gì, rồi bật đầy đủ',
        blocks: [
          { t: 'p', x:
            'Trước khi sửa gì, hỏi GDB xem nó đọc được gì từ <code>vmlinux</code> hiện tại. GDB đọc file ' +
            'ngay trên host, không cần máy ảo: <code>-batch</code> chạy các lệnh <code>-ex</code> rồi thoát.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'grep -E \'^(# )?CONFIG_(DEBUG_INFO|DEBUG_INFO_REDUCED|GDB_SCRIPTS|RANDOMIZE_BASE)[ =]\' .config\n' +
            'ls -l vmlinux arch/arm64/boot/Image\n' +
            'gdb-multiarch -q -batch -nx -ex \'info line start_kernel\' \\\n' +
            '  -ex \'ptype struct platform_device\' -ex \'ptype struct device_node\' vmlinux' },

          { t: 'code', where: 'out', nocopy: true, code:
            'CONFIG_RANDOMIZE_BASE=y\n' +
            'CONFIG_DEBUG_INFO=y\n' +
            'CONFIG_DEBUG_INFO_REDUCED=y\n' +
            '# CONFIG_GDB_SCRIPTS is not set\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  49342976 Sep 30 16:58 arch/arm64/boot/Image\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 225769864 Sep 30 16:58 vmlinux\n' +
            'Line 865 of "init/main.c" starts at address 0xffff800081e60908 <start_kernel> and ends at 0xffff800081e60940 <start_kernel+56>.\n' +
            'No struct type named platform_device.\n' +
            'type = struct device_node {\n' +
            '    const char *name;\n' +
            '    phandle phandle;\n' +
            '    const char *full_name;\n' +
            '    struct fwnode_handle fwnode;\n' +
            '    struct property *properties;\n' +
            '    struct property *deadprops;\n' +
            '    struct device_node *parent;\n' +
            '    struct device_node *child;\n' +
            '    struct device_node *sibling;\n' +
            '    struct kobject kobj;\n' +
            '    unsigned long _flags;\n' +
            '    void *data;\n' +
            '}',
            notes: ['Ngày giờ và tên người dùng khác trên máy bạn. Kích thước <code>vmlinux</code> phụ thuộc phiên bản GCC: machine A (GCC 15.2) ra 157 MB ở Bài 40, máy B (GCC 9.4) ra 225 MB.'] },

          { t: 'cmdx', cmd: "gdb-multiarch -q -batch -nx -ex 'info line start_kernel' vmlinux",
            rows: [
              ['<code>-q</code>', 'quiet: không in đoạn giới thiệu bản quyền.', ''],
              ['<code>-batch</code>', 'Chạy xong các lệnh rồi thoát, không mở dấu nhắc <code>(gdb)</code>.', 'Dùng để hỏi nhanh một file mà không cần máy ảo'],
              ['<code>-nx</code>', 'Không đọc <code>~/.gdbinit</code>.', 'Để thấy GDB "nguyên bản", trước khi bạn cấu hình gì'],
              ['<code>-ex \'…\'</code>', 'Một lệnh GDB, chạy theo thứ tự xuất hiện.', 'Lặp lại được nhiều lần'],
              ['<code>vmlinux</code>', 'File để đọc symbol và debug info.', 'Không phải <code>Image</code>: <code>Image</code> đã bị <code>objcopy</code> bỏ hết (Bài 40)']
            ] },

          { t: 'p', x:
            'Ba câu trả lời, ba mức thông tin. <code>info line</code> trả lời đầy đủ: <code>.debug_line</code> ' +
            'có mặt. <code>struct device_node</code> có đủ 12 field, vì nó được khai báo trong ' +
            '<code>include/linux/of.h</code>, và cây kernel có vài file tên <code>of.c</code> (ví dụ ' +
            '<code>drivers/pci/of.c</code>): <code>-femit-struct-debug-baseonly</code> chỉ ghi một struct vào file ' +
            '<code>.o</code> có tên gốc trùng với header khai báo nó. Nhưng <code>struct platform_device</code>, ' +
            'khai trong <code>include/linux/platform_device.h</code>, không có file ' +
            '<code>platform_device.c</code> nào — nên không file <code>.o</code> nào ghi định nghĩa của nó. ' +
            'Đây chính là kiểu dữ liệu tham số của <code>ts_probe</code>. Bật debug info đầy đủ, và bật luôn ' +
            'bộ script GDB:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai63 && cp .config ~/bai63/config.before\n' +
            'scripts/config --disable DEBUG_INFO_REDUCED --enable GDB_SCRIPTS\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 olddefconfig\n' +
            'scripts/diffconfig ~/bai63/config.before .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            ' DEBUG_INFO_REDUCED y -> n\n' +
            ' GDB_SCRIPTS n -> y\n' +
            '+DEBUG_INFO_BTF n' },

          { t: 'p', x:
            '<code>scripts/diffconfig</code> (Bài 59) xác nhận đúng hai thay đổi bạn yêu cầu, và một dòng ' +
            '<code>+DEBUG_INFO_BTF n</code> mà <code>olddefconfig</code> tự thêm. Lý do: trong ' +
            '<code>lib/Kconfig.debug</code>, BTF có <code>depends on !DEBUG_INFO_SPLIT &amp;&amp; ' +
            '!DEBUG_INFO_REDUCED</code>; trước đây nó bị ẩn hoàn toàn, giờ nó hiện ra và nhận giá trị mặc ' +
            'định <code>n</code>. Không sao — BTF cần <code>pahole</code>, máy B không có. Build lại:' },

          { t: 'code', where: 'wsl', code:
            'time make -j16 ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 Image scripts_gdb > ~/bai63/build.log 2>&1\n' +
            'echo rc=$?\n' +
            'cat .version\n' +
            'ls -l vmlinux arch/arm64/boot/Image vmlinux-gdb.py\n' +
            'aarch64-linux-gnu-size -A vmlinux | grep -E \'^\\.debug|^Total\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t6m17.684s\n' +
            'user\t84m14.412s\n' +
            'sys\t8m13.448s\n' +
            'rc=0\n' +
            '6\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  49342976 Oct 31 15:29 arch/arm64/boot/Image\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 666100008 Oct 31 15:29 vmlinux\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc        75 Oct 31 15:23 vmlinux-gdb.py -> /home/cah8hc/embedded-course/bai38/linux-6.18.45/scripts/gdb/vmlinux-gdb.py\n' +
            '.debug_aranges                    283056                      0\n' +
            '.debug_info                    412439302                      0\n' +
            '.debug_abbrev                   11358316                      0\n' +
            '.debug_line                     43119843                      0\n' +
            '.debug_frame                     4454112                      0\n' +
            '.debug_str                       6159158                      0\n' +
            '.debug_loc                      96004922                      0\n' +
            '.debug_ranges                   32856592                      0\n' +
            'Total                          656561841',
            notes: [
              'Thời gian phụ thuộc số nhân CPU: máy B có 16. Với <code>-j4</code> hãy chờ khoảng 20–25 phút.',
              '<code>.version</code> là số lần build trong cây này; của bạn có thể khác 6. Đường dẫn của symlink có <code>embedded-course</code> vì trên máy B <code>~/bai38</code> là một symlink — trên máy bạn nó là đường dẫn thật của bạn.'
            ] },

          { t: 'cmdx', cmd: 'make -j16 … Image scripts_gdb',
            rows: [
              ['<code>Image</code>', 'Build lại kernel. Kéo theo <code>vmlinux</code>.', 'Không build <code>modules</code>: không cần cho bài này, tiết kiệm ~7 phút'],
              ['<code>scripts_gdb</code>', 'Tạo symlink <code>vmlinux-gdb.py</code> và sinh <code>scripts/gdb/linux/constants.py</code> từ <code>.config</code>.', 'Mục tiêu này chỉ chạy khi <code>GDB_SCRIPTS=y</code>'],
              ['<code>&gt; ~/bai63/build.log 2&gt;&amp;1</code>', 'Gom 4 831 dòng log vào file.', 'Đọc <code>tail</code> nếu <code>rc</code> khác 0']
            ] },

          { t: 'p', x:
            'So với đầu bước: <code>Image</code> vẫn đúng <b>49 342 976</b> byte — không một byte nào của thứ ' +
            'chạy trên bo mạch thay đổi. <code>vmlinux</code> từ 225 769 864 lên <b>666 100 008</b> byte. ' +
            'Ba section giải thích phần tăng: <code>.debug_info</code> 412 MB (trước 90 MB: giờ mọi struct ' +
            'đều được ghi), <code>.debug_loc</code> 96 MB (trước không có: đây là "biến nào ở thanh ghi nào" ' +
            'mà <code>-fno-var-tracking</code> đã bỏ), <code>.debug_line</code> 43 MB (trước 31 MB). ' +
            'Symlink <code>vmlinux-gdb.py</code> đã xuất hiện.' },

          { t: 'p', x:
            'Cuối cùng, cho phép GDB tự nạp script đó. GDB đọc <code>~/.gdbinit</code> mỗi lần khởi động. ' +
            'Kiểm tra trước để không ghi đè file của bạn, rồi tạo nó với ba dòng:' },

          { t: 'code', where: 'wsl', code:
            'ls ~/.gdbinit\n' +
            'printf \'add-auto-load-safe-path ~/bai38/linux-6.18.45\\nset confirm off\\nset pagination off\\n\' > ~/.gdbinit\n' +
            'gdb-multiarch -q -batch -ex \'apropos lx-\' vmlinux | grep -c \'^lx-\'\n' +
            'gdb-multiarch -q -batch -ex \'ptype struct platform_device\' vmlinux | head -n 6' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ls: cannot access \'/home/cah8hc/.gdbinit\': No such file or directory\n' +
            '34\n' +
            'type = struct platform_device {\n' +
            '    const char *name;\n' +
            '    int id;\n' +
            '    bool id_auto;\n' +
            '    struct device dev;\n' +
            '    u64 platform_dma_mask;' },

          { t: 'cmdx', cmd: '~/.gdbinit',
            title: 'Ba dòng, ba lý do',
            rows: [
              ['<code>add-auto-load-safe-path ~/bai38/linux-6.18.45</code>', 'Cho phép GDB chạy <code>vmlinux-gdb.py</code> trong thư mục này.', 'Thiếu dòng này, GDB in một cảnh báo 10 dòng <code>auto-loading has been declined</code> và không có lệnh <code>lx-*</code> nào'],
              ['<code>set confirm off</code>', 'Bỏ các câu hỏi <code>(y or n)</code>.', '<code>delete</code> không hỏi <code>Delete all breakpoints?</code> nữa. Câu hỏi nào có mặc định "không" — như <code>Make breakpoint pending…? (y or [n])</code> — thì tự nhận "không"; bước 5 sẽ gặp đúng chỗ này'],
              ['<code>set pagination off</code>', 'Không dừng sau mỗi trang màn hình.', '<code>lx-dmesg</code> in hàng trăm dòng; không có dòng này bạn phải bấm Enter liên tục']
            ] },

          { t: 'p', x:
            '<code>ls</code> báo không có file — bạn không ghi đè gì. Nếu file đã tồn tại trên máy bạn, thêm ' +
            'ba dòng vào cuối bằng <code>&gt;&gt;</code> thay vì <code>&gt;</code>. Lần này không có ' +
            '<code>-nx</code>, nên GDB đọc <code>~/.gdbinit</code>: <b>34</b> lệnh <code>lx-*</code> đã sẵn sàng, ' +
            'và <code>struct platform_device</code> — thứ trả lời "No struct type" ở đầu bước — giờ có định nghĩa.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Dừng kernel ở dòng đầu tiên của start_kernel',
        blocks: [
          { t: 'p', x:
            'Ở cửa sổ 1, khởi động QEMU với dòng lệnh quen thuộc của Bài 50 và thêm ba thứ: <code>-s</code>, ' +
            '<code>-S</code>, và <code>nokaslr</code> trên dòng lệnh kernel. QEMU sẽ dựng máy rồi đứng yên, ' +
            'không in gì:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1 — QEMU', code:
            'mkdir -p ~/bai63 && cd ~/bai63\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -s -S \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr"' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 … -s -S … -append "… nokaslr"',
            rows: [
              ['<code>-s</code>', 'Viết tắt của <code>-gdb tcp::1234</code>: mở gdbstub trên cổng 1234.', 'Đã dùng ở Bài 31, Bài 33'],
              ['<code>-S</code>', 'Không chạy lệnh đầu tiên cho tới khi GDB bảo <code>continue</code>.', 'Không có nó, kernel boot xong trước khi bạn kịp nối GDB'],
              ['<code>nokaslr</code>', 'Tham số kernel: không dời kernel đi đâu cả.', 'Phần lý thuyết "KASLR"; bước 4 cho thấy chuyện gì xảy ra khi thiếu']
            ] },

          { t: 'p', x:
            'Ở cửa sổ 2, mở <code>vmlinux</code> bằng GDB <b>từ chính thư mục kernel</b> — <code>lx-symbols</code> ' +
            'ở bước 5 tìm <code>vmlinux</code> trong thư mục hiện tại — rồi nối vào QEMU và đặt breakpoint:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — GDB', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'gdb-multiarch -q vmlinux' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'target remote :1234\n' +
            'break start_kernel\n' +
            'continue' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Reading symbols from vmlinux...\n' +
            '(gdb) target remote :1234\n' +
            'Remote debugging using :1234\n' +
            '0x0000000040000000 in ?? ()\n' +
            '(gdb) break start_kernel\n' +
            'Breakpoint 1 at 0xffff800081e60908: file init/main.c, line 865.\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Breakpoint 1, start_kernel () at init/main.c:865\n' +
            '865\t{',
            notes: ['<code>Reading symbols from vmlinux...</code> mất khoảng 2 giây với file 666 MB. Các địa chỉ <code>0xffff8000…</code> sẽ giống hệt trên máy bạn <b>chỉ khi</b> bạn build cùng <code>.config</code> và cùng GCC; khác GCC thì địa chỉ khác, nhưng tên hàm và số dòng vẫn giống.'] },

          { t: 'p', x:
            'Ba mốc trong output. <code>0x0000000040000000 in ?? ()</code>: CPU đang đứng ở lệnh đầu tiên của ' +
            'đoạn mồi 40 byte mà Bài 33 đã mổ xẻ — địa chỉ vật lý đầu RAM, không thuộc <code>vmlinux</code>, ' +
            'nên GDB không có tên cho nó. <code>Breakpoint 1 at 0xffff800081e60908</code>: GDB tra được địa chỉ ' +
            'ảo của <code>start_kernel</code> trong file, trùng với <code>info line</code> ở bước 1. Và sau ' +
            '<code>continue</code>, CPU đã chạy qua đoạn mồi, qua <code>head.S</code>, bật MMU, rồi dừng đúng ' +
            'ở <code>init/main.c:865</code> — dấu <code>{</code> mở đầu hàm. Cửa sổ 1 vẫn chưa in một ký tự ' +
            'nào: console UART chưa được khởi tạo. Xem ai đã gọi tới đây và đoạn code xung quanh:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'bt\n' +
            'list' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) bt\n' +
            '#0  start_kernel () at init/main.c:865\n' +
            '#1  0xffff800081e6a0fc in __primary_switched () at arch/arm64/kernel/head.S:246\n' +
            'Backtrace stopped: previous frame identical to this frame (corrupt stack?)\n' +
            '(gdb) list\n' +
            '860\t#endif\n' +
            '861\t}\n' +
            '862\t\n' +
            '863\tasmlinkage __visible __init __no_sanitize_address __noreturn __no_stack_protector\n' +
            '864\tvoid start_kernel(void)\n' +
            '865\t{\n' +
            '866\t\tchar *command_line;\n' +
            '867\t\tchar *after_dashes;\n' +
            '868\t\n' +
            '869\t\tset_task_stack_end_magic(&init_task);' },

          { t: 'p', x:
            '<code>bt</code> chỉ có hai tầng: <code>start_kernel</code> được gọi từ <code>__primary_switched</code> ' +
            'ở dòng 246 của <code>head.S</code> — mã assembly chạy ngay sau khi MMU bật. Dưới nữa không còn gì: ' +
            'đó là nơi kernel bắt đầu, nên dòng <code>Backtrace stopped … (corrupt stack?)</code> ở đây là ' +
            'bình thường, không phải lỗi — GDB chỉ báo rằng không còn khung stack hợp lệ nào phía dưới. ' +
            '<code>list</code> in 10 dòng quanh vị trí hiện tại, đọc thẳng từ file nguồn trên ổ đĩa của bạn ' +
            '(đường dẫn ghi trong <code>.debug_line</code>). Giờ chạy từng dòng và đọc một biến toàn cục:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'next\n' +
            'next\n' +
            'next\n' +
            'p init_task.comm\n' +
            'p init_task.pid\n' +
            'p &init_task\n' +
            'p saved_command_line' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) next\n' +
            '869\t\tset_task_stack_end_magic(&init_task);\n' +
            '(gdb) next\n' +
            '870\t\tsmp_setup_processor_id();\n' +
            '(gdb) next\n' +
            '872\t\tinit_vmlinux_build_id();\n' +
            '(gdb) p init_task.comm\n' +
            '$1 = "swapper\\000\\000\\000\\000\\000\\000\\000\\000"\n' +
            '(gdb) p init_task.pid\n' +
            '$2 = 0\n' +
            '(gdb) p &init_task\n' +
            '$3 = (struct task_struct *) 0xffff8000829d5980 <init_task>\n' +
            '(gdb) p saved_command_line\n' +
            '$4 = 0x0' },

          { t: 'p', x:
            'Mỗi <code>next</code> in dòng <b>sắp</b> chạy, không phải dòng vừa chạy xong: lần đầu nhảy từ ' +
            '<code>{</code> sang 869, lần ba dừng ở 872 — dòng 871 trống nên bị bỏ qua. ' +
            '<code>init_task</code> là <code>task_struct</code> của tiến trình đầu tiên, viết tay trong ' +
            '<code>init/init_task.c</code>, không phải sinh ra bằng <code>fork</code>: tên ' +
            '<code>swapper</code>, PID <b>0</b> — chính cái tên <code>swapper/0/0</code> mà Bài 55 thấy trong log khi ' +
            'ngắt cắt ngang lúc CPU đang rảnh. Mảng ' +
            '<code>comm</code> dài 16 byte, phần thừa là <code>\\000</code>. Và <code>saved_command_line</code> ' +
            'còn là <code>0x0</code> — con trỏ NULL: kernel chưa chép dòng lệnh <code>console=ttyAMA0 … ' +
            'nokaslr</code> vào đâu cả. Bạn đang nhìn kernel ở thời điểm trước cả khi nó đọc tham số.' },

          { t: 'cal', kind: 'tip', title: 'Số $1, $2… là lịch sử, dùng lại được',
            x: 'Mỗi kết quả <code>print</code> được đánh số. <code>p $3-&gt;pid</code> dùng lại con trỏ ở ' +
               '<code>$3</code> mà không phải gõ lại <code>&amp;init_task</code>. Bạn cũng tự đặt biến riêng ' +
               'được: <code>set $ts = ts</code> — bước 6 dùng đúng cách này để giữ một con trỏ qua nhiều ' +
               'lần dừng.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Theo kernel tới /init, đọc log khi không có shell',
        blocks: [
          { t: 'p', x:
            'Xoá breakpoint cũ, đặt hai cái mới: một ở <code>panic</code> — lưới an toàn, nếu kernel chết bạn ' +
            'dừng ngay trước khi nó in gì — và một ở <code>do_one_initcall</code>, hàm gọi lần lượt mọi hàm ' +
            '<code>__init</code> của các subsystem và driver built-in (Bài 44 đã thấy chúng qua ' +
            '<code>initcall_debug</code>):' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'delete\n' +
            'break panic\n' +
            'break do_one_initcall\n' +
            'continue\n' +
            'bt\n' +
            'p fn\n' +
            'info symbol fn' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) delete\n' +
            '(gdb) break panic\n' +
            'Breakpoint 2 at 0xffff8000800ad350: file kernel/panic.c, line 623.\n' +
            '(gdb) break do_one_initcall\n' +
            'Breakpoint 3 at 0xffff800080015218: file init/main.c, line 1228.\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Breakpoint 3, do_one_initcall (fn=0xffff800081e69390 <cpu_suspend_init>) at init/main.c:1228\n' +
            '1228\t{\n' +
            '(gdb) bt\n' +
            '#0  do_one_initcall (fn=0xffff800081e69390 <cpu_suspend_init>) at init/main.c:1228\n' +
            '#1  0xffff800081e611f0 in do_pre_smp_initcalls () at ./include/linux/compiler.h:267\n' +
            '#2  kernel_init_freeable () at init/main.c:1536\n' +
            '#3  0xffff800081158690 in kernel_init (unused=<optimized out>) at init/main.c:1437\n' +
            '#4  0xffff800080015fcc in ret_from_fork () at arch/arm64/kernel/entry.S:860\n' +
            'Backtrace stopped: previous frame identical to this frame (corrupt stack?)\n' +
            '(gdb) p fn\n' +
            '$5 = (initcall_t) 0xffff800081e69390 <cpu_suspend_init>\n' +
            '(gdb) info symbol fn\n' +
            'cpu_suspend_init in section .init.text' },

          { t: 'p', x:
            'Initcall đầu tiên là <code>cpu_suspend_init</code>. GDB in sẵn tham số <code>fn</code> cùng tên ' +
            'hàm nó trỏ tới, vì <code>fn</code> là con trỏ hàm và địa chỉ đó có trong bảng symbol. ' +
            '<code>info symbol fn</code> nói thêm: hàm nằm trong <code>.init.text</code> — vùng mà kernel giải ' +
            'phóng ngay trước khi chạy <code>/init</code> (dòng <code>Freeing unused kernel memory</code> trong ' +
            'log). Nhìn <code>bt</code> từ dưới lên: <code>ret_from_fork</code> → <code>kernel_init</code> → ' +
            '<code>kernel_init_freeable</code>. Tức là bạn đã không còn ở <code>start_kernel</code> nữa; đây là ' +
            'một <b>luồng kernel mới</b>, sinh ra bằng <code>fork</code>, sẽ trở thành PID 1. Hai tầng <code>#1</code> ' +
            'và <code>#2</code> cùng một địa chỉ: <code>do_pre_smp_initcalls</code> đã được compiler ' +
            '<i>inline</i> vào <code>kernel_init_freeable</code>, GDB vẫn tách ra cho bạn đọc. Giờ nhảy thẳng tới ' +
            'lúc kernel giao quyền cho userspace:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'delete 3\n' +
            'break run_init_process\n' +
            'continue\n' +
            'p init_filename\n' +
            'p $lx_current().comm\n' +
            'p $lx_current().pid\n' +
            'lx-cmdline' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) delete 3\n' +
            '(gdb) break run_init_process\n' +
            'Breakpoint 4 at 0xffff800080015000: file init/main.c, line 1350.\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Breakpoint 4, run_init_process (init_filename=0xffff00001feecf57 "/init") at init/main.c:1350\n' +
            '1350\t\targv_init[0] = init_filename;\n' +
            '(gdb) p init_filename\n' +
            '$6 = 0xffff00001feecf57 "/init"\n' +
            '(gdb) p $lx_current().comm\n' +
            '$7 = "swapper/0\\000\\000\\000\\000\\000\\000"\n' +
            '(gdb) p $lx_current().pid\n' +
            '$8 = 1\n' +
            '(gdb) lx-cmdline\n' +
            'console=ttyAMA0 rdinit=/init nokaslr',
            notes: ['Số <code>$5</code>…<code>$8</code> tiếp nối lịch sử từ bước 2; nếu bạn gõ thêm lệnh <code>print</code> nào, số của bạn sẽ lớn hơn. Địa chỉ <code>0xffff00001feecf57</code> nằm trong vùng RAM cấp phát động, có thể khác trên máy bạn.'] },

          { t: 'p', x:
            '<code>init_filename</code> là <code>"/init"</code> — đúng giá trị của <code>rdinit=/init</code>. ' +
            '<code>$lx_current()</code> là một <b>hàm tiện lợi</b> của <code>vmlinux-gdb.py</code>: nó trả về ' +
            '<code>task_struct</code> của tác vụ đang chạy trên CPU. PID là <b>1</b>, nhưng tên vẫn là ' +
            '<code>swapper/0</code>: <code>execve("/init")</code> chưa chạy, nên tên chưa đổi. Đây là khoảnh khắc ' +
            'mà Bài 49 không nhìn thấy được từ userspace: PID 1 đã tồn tại, nhưng chương trình init của bạn thì chưa. ' +
            '<code>lx-cmdline</code> giờ in được dòng lệnh kernel, vì lúc này <code>saved_command_line</code> đã ' +
            'có giá trị. Ở cửa sổ 1, log boot đã chạy tới <code>Freeing unused kernel memory</code>. Đọc log đó ' +
            'mà không cần shell:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'lx-dmesg\n' +
            'lx-ps' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) lx-dmesg\n' +
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[    0.000000] Linux version 6.18.45-embedded (cah8hc@HC-C-005W7) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #6 SMP PREEMPT Sat Oct 31 15:29:05 +07 2026\n' +
            '[    0.000000] KASLR disabled on command line\n' +
            '[    0.000000] Machine model: linux,dummy-virt\n' +
            '…\n' +
            '[    0.168284] hw-breakpoint: found 6 breakpoint and 4 watchpoint registers.\n' +
            '…\n' +
            '[    0.704449] PM: genpd: Disabling unused power domains\n' +
            '[    0.735490] Freeing unused kernel memory: 11648K\n' +
            '(gdb) lx-ps\n' +
            '      TASK          PID    COMM\n' +
            '0xffff8000829d5980   0   swapper/0\n' +
            '0xffff000003478000   1   swapper/0\n' +
            '0xffff0000034791c0   2   kthreadd\n' +
            '0xffff00000347a380   3   pool_workqueue_\n' +
            '…\n' +
            '0xffff0000044ec700  51   kworker/0:2',
            notes: [
              'Rút gọn: <code>lx-dmesg</code> in <b>246</b> dòng, <code>lx-ps</code> in <b>49</b> tác vụ. Các dấu <code>…</code> là phần bị lược.',
              'Mốc thời gian trong ngoặc vuông, ngày build và tên máy (<code>cah8hc@HC-C-005W7</code>) khác trên máy bạn. Địa chỉ <code>TASK</code> khác nếu bạn dùng <code>-m</code> khác 512.'
            ] },

          { t: 'p', x:
            '<code>lx-dmesg</code> đọc thẳng log buffer trong RAM của máy ảo — không cần syscall, không cần ' +
            'tiến trình nào. Dòng thứ ba xác nhận <code>nokaslr</code> có hiệu lực. Dòng cuối, ' +
            '<code>Freeing unused kernel memory: 11648K</code>, là vùng <code>.init.text</code> mà ' +
            '<code>cpu_suspend_init</code> vừa nằm trong. <code>lx-ps</code> duyệt danh sách ' +
            '<code>task_struct</code> của kernel: dòng đầu có địa chỉ <code>0xffff8000829d5980</code> — đúng ' +
            '<code>&amp;init_task</code> ở bước 2, PID 0. Dòng hai là PID 1, vẫn mang tên ' +
            '<code>swapper/0</code>. Đây là những công cụ bạn sẽ cần khi kernel treo: console im lặng, shell ' +
            'không phản hồi, nhưng GDB vẫn đọc được log và danh sách tiến trình.' },

          { t: 'p', x:
            'Cuối cùng, xoá hết breakpoint và để kernel chạy tới shell. Ở cửa sổ 1 gõ một lệnh, rồi quay lại ' +
            'cửa sổ 2 bấm <kbd>Ctrl</kbd>+<kbd>C</kbd>:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'delete\n' +
            'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code: 'echo hello from guest' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — bấm Ctrl-C, rồi gõ', code:
            'bt\n' +
            'lx-ps' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) continue\n' +
            'Continuing.\n' +
            '^C\n' +
            'Program received signal SIGINT, Interrupt.\n' +
            'cpu_do_idle () at arch/arm64/kernel/idle.c:32\n' +
            '32\t\tarm_cpuidle_restore_irq_context(&context);\n' +
            '(gdb) bt\n' +
            '#0  cpu_do_idle () at arch/arm64/kernel/idle.c:32\n' +
            '#1  0xffff8000811581ac in arch_cpu_idle () at arch/arm64/kernel/idle.c:44\n' +
            '#2  0xffff80008115824c in default_idle_call () at kernel/sched/idle.c:122\n' +
            '#3  0xffff8000800fe1c8 in cpuidle_idle_call (stop_tick=<optimized out>) at kernel/sched/idle.c:198\n' +
            '#4  do_idle () at kernel/sched/idle.c:350\n' +
            '#5  0xffff8000800fe3e0 in cpu_startup_entry (state=state@entry=CPUHP_ONLINE) at kernel/sched/idle.c:449\n' +
            '#6  0xffff800081158670 in rest_init () at init/main.c:712\n' +
            '#7  0xffff800081e60f10 in start_kernel () at init/main.c:1065\n' +
            'Backtrace stopped: previous frame identical to this frame (corrupt stack?)\n' +
            '(gdb) lx-ps\n' +
            '      TASK          PID    COMM\n' +
            '0xffff8000829d5980   0   swapper/0\n' +
            '0xffff000003478000   1   sh\n' +
            '0xffff0000034791c0   2   kthreadd\n' +
            '…' },

          { t: 'p', x:
            'Bạn bấm Ctrl-C lúc guest đang chờ bạn gõ phím, nên CPU duy nhất đang <b>nghỉ</b>: ' +
            '<code>cpu_do_idle</code> là chỗ kernel chạy lệnh <code>wfi</code> (<i>wait for interrupt</i>) và ' +
            'ngủ cho tới ngắt kế tiếp. Đọc <code>bt</code> từ dưới lên: <code>start_kernel</code> dòng 1065 ' +
            'gọi <code>rest_init</code>, rồi <code>cpu_startup_entry</code> → <code>do_idle</code> — một vòng ' +
            'lặp không bao giờ thoát. Đây là kết cục của tác vụ PID 0 mà bạn đã dừng ở dòng đầu tiên: sau khi ' +
            'khởi động xong mọi thứ, nó trở thành tác vụ <i>idle</i>. Trong <code>lx-ps</code>, PID 1 giờ là ' +
            '<code>sh</code>: script <code>/init</code> đã <code>exec /bin/sh</code>. Thoát phiên này:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'kill\n' +
            'quit' },

          { t: 'p', x:
            '<code>kill</code> bảo gdbstub tắt máy ảo; cửa sổ 1 in <code>qemu-system-aarch64: QEMU: Terminated ' +
            'via GDBstub</code> và trả lại dấu nhắc WSL.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Bỏ nokaslr trên một CPU có RNDR: breakpoint im lặng',
        blocks: [
          { t: 'p', x:
            'Bước này cố ý làm hỏng phiên debug, để bạn nhận ra triệu chứng khi gặp ngoài đời. Đổi ' +
            '<code>-cpu cortex-a57</code> thành <code>-cpu max</code> và <b>bỏ</b> <code>nokaslr</code>:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1 — QEMU', code:
            'cd ~/bai63\n' +
            'qemu-system-aarch64 -M virt -cpu max -m 512 -nographic -s -S \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — GDB (trong ~/bai38/linux-6.18.45)', code:
            'gdb-multiarch -q vmlinux' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'target remote :1234\n' +
            'break start_kernel\n' +
            'continue' },

          { t: 'p', x:
            'Lần này GDB in <code>Continuing.</code> rồi im. Ở cửa sổ 1, log boot chạy hết từ đầu tới dấu ' +
            'nhắc <code>~ #</code>. Gõ một lệnh ở guest, rồi Ctrl-C ở GDB:' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code: 'dmesg | grep -i kaslr' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 2 — bấm Ctrl-C, rồi gõ', code:
            'bt 3\n' +
            'info registers pc' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # dmesg | grep -i kaslr\n' +
            '[    0.000000] KASLR enabled\n' +
            '[    0.000000] CPU features: kernel page table isolation forced ON by KASLR\n' +
            '---- cửa sổ 2 ----\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '^C\n' +
            'Program received signal SIGINT, Interrupt.\n' +
            '0xffffa8906b358198 in ?? ()\n' +
            '(gdb) bt 3\n' +
            '#0  0xffffa8906b358198 in ?? ()\n' +
            '#1  0x35c5a8906a2fe1c8 in ?? ()\n' +
            'Backtrace stopped: previous frame identical to this frame (corrupt stack?)\n' +
            '(gdb) info registers pc\n' +
            'pc             0xffffa8906b358198  0xffffa8906b358198',
            notes: ['Địa chỉ <code>0xffffa890…</code> là ngẫu nhiên — đó chính là mục đích của KASLR. Lần đo thứ hai trên cùng máy ra <code>0xffffbe0a27358198</code>. Ba chữ số cuối <code>198</code> luôn giống nhau, lý do ở đoạn dưới.'] },

          { t: 'p', x:
            'Kernel in <code>KASLR enabled</code>: <code>-cpu max</code> có lệnh <code>RNDR</code>, kernel tự ' +
            'lấy hạt giống mà không cần bootloader. Breakpoint không bao giờ dừng, vì địa chỉ GDB đặt ' +
            '(<code>0xffff800081e60908</code>) không còn là chỗ <code>start_kernel</code> nằm. Khi Ctrl-C, PC ' +
            'là <code>0xffffa8906b358198</code> — GDB không tìm được tên nào cho nó, và <code>bt</code> ra rác ' +
            '(<code>0x35c5…</code> không phải một địa chỉ kernel hợp lệ). Không có thông báo lỗi nào: một phiên ' +
            'debug hỏng vì KASLR trông giống hệt một phiên debug mà code của bạn đơn giản là không chạy qua chỗ ' +
            'đó. Đó là lý do nó tốn thời gian.' },

          { t: 'cal', kind: 'info', title: 'Tìm lại độ dời bằng một phép trừ',
            x: 'Trong lần đo này, kernel cũng đang nghỉ trong <code>cpu_do_idle</code> như bước 3. Trong ' +
               '<code>vmlinux</code>, <code>cpu_do_idle</code> bắt đầu ở <code>0xffff800081158190</code>, và ' +
               '<code>cpu_do_idle+8</code> là <code>0xffff800081158198</code>. Trừ hai địa chỉ: ' +
               '<code>0xffffa8906b358198 − 0xffff800081158198 = 0x288fea200000</code>. Đó là độ dời KASLR của lần ' +
               'boot này, và nó là bội số của <code>0x200000</code> (2 MiB) — kernel chỉ được dời theo bước 2 MiB, ' +
               'nên ba chữ số hex cuối của mọi địa chỉ không bao giờ đổi. GDB có cách áp độ dời đó ' +
               '(<code>add-symbol-file … -o</code>), nhưng bạn phải đoán đúng nó ở mỗi lần boot. ' +
               '<code>nokaslr</code> rẻ hơn nhiều.' },

          { t: 'p', x:
            'Thoát (<code>kill</code>, <code>quit</code>) và nhớ: từ đây, mọi lệnh QEMU của bài đều quay lại ' +
            '<code>-cpu cortex-a57</code> và <b>có</b> <code>nokaslr</code>. Để thấy hai trường hợp còn lại ' +
            'của bảng KASLR ở phần lý thuyết, cùng dòng lệnh <code>-cpu max</code> thêm <code>nokaslr</code> ' +
            'cho <code>KASLR disabled on command line</code> và dừng ở <code>start_kernel</code>; còn ' +
            '<code>-cpu cortex-a57</code> không có <code>nokaslr</code> cho <code>KASLR disabled due to lack of ' +
            'seed</code> và cũng dừng.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Đặt breakpoint vào ts_probe và đi từng dòng',
        blocks: [
          { t: 'p', x:
            '<code>~/bai54/tsensor/tsensor.ko</code> được build trên cây kernel cũ — cấu hình có ' +
            '<code>DEBUG_INFO_REDUCED</code>. Build lại một bản sao trong <code>~/bai63</code> với cây mới, rồi ' +
            'đóng gói initramfs chỉ có module đó:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai63/tsensor && cd ~/bai63\n' +
            'cp ~/bai54/tsensor/tsensor.c ~/bai54/tsensor/Makefile tsensor/\n' +
            'make -C tsensor\n' +
            'ls -l tsensor/tsensor.ko ~/bai54/tsensor/tsensor.ko\n' +
            'aarch64-linux-gnu-size -A ~/bai54/tsensor/tsensor.ko | grep \'^\\.debug_info\'\n' +
            'aarch64-linux-gnu-size -A tsensor/tsensor.ko | grep \'^\\.debug_info\'\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp tsensor/tsensor.ko initramfs/\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  tsensor.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  tsensor.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  tsensor.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 125024 Sep 30 10:52 /home/cah8hc/bai54/tsensor/tsensor.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 551936 Oct 31 15:44 tsensor/tsensor.ko\n' +
            '.debug_info                    23705      0\n' +
            '.debug_info                    163274      0\n' +
            '4950 blocks',
            notes: ['Đã lược các dòng <code>make: Entering/Leaving directory</code>. <code>4950 blocks</code> là thông báo của <code>cpio</code>.'] },

          { t: 'p', x:
            'Cùng một file nguồn 245 dòng, cùng <code>Makefile</code> — nhưng <code>.ko</code> tăng từ 125 024 ' +
            'lên <b>551 936</b> byte, <code>.debug_info</code> từ 23 705 lên 163 274 byte (×6,9). Module ' +
            'out-of-tree thừa hưởng cờ biên dịch từ cây kernel (Bài 50: 95 cờ <code>-</code>), nên khi bạn tắt ' +
            '<code>DEBUG_INFO_REDUCED</code> ở bước 1, mọi module build sau đó cũng có debug info đầy đủ mà không ' +
            'phải sửa Makefile của nó. <code>insmod</code> chỉ nạp phần mã vào kernel; phần debug info chỉ GDB ' +
            'đọc, từ file trên host.' },

          { t: 'p', x:
            'Boot với cây <code>board.dtb</code> của Bài 54 — bốn node cảm biến — và để kernel chạy thẳng tới ' +
            'shell:' },

          { t: 'code', where: 'wsl', name: 'Cửa sổ 1 — QEMU', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic -s -S \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai63/initramfs.cpio.gz -dtb ~/bai54/board.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init nokaslr"' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb) — GDB mở từ ~/bai38/linux-6.18.45', code:
            'target remote :1234\n' +
            'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest, khi thấy ~ #', code:
            'mount -t devtmpfs none /dev' },

          { t: 'p', x:
            'Quay lại cửa sổ 2, Ctrl-C, rồi thử đặt breakpoint vào hàm của bạn:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'break ts_probe\n' +
            'lx-symbols ~/bai63/tsensor\n' +
            'lx-lsmod\n' +
            'set breakpoint pending on\n' +
            'break ts_probe\n' +
            'info breakpoints' },

          { t: 'code', where: 'out', nocopy: true, code:
            '^C\n' +
            'Program received signal SIGINT, Interrupt.\n' +
            'cpu_do_idle () at arch/arm64/kernel/idle.c:32\n' +
            '32\t\tarm_cpuidle_restore_irq_context(&context);\n' +
            '(gdb) break ts_probe\n' +
            'Function "ts_probe" not defined.\n' +
            '(gdb) lx-symbols ~/bai63/tsensor\n' +
            'loading vmlinux\n' +
            '(gdb) lx-lsmod\n' +
            'Address            Module                  Size  Used by\n' +
            '(gdb) set breakpoint pending on\n' +
            '(gdb) break ts_probe\n' +
            'Function "ts_probe" not defined.\n' +
            'Breakpoint 1 (ts_probe) pending.\n' +
            '(gdb) info breakpoints\n' +
            'Num     Type           Disp Enb Address    What\n' +
            '1       breakpoint     keep y   <PENDING>  ts_probe',
            notes: ['Tên hàm và số dòng giống trên máy bạn. Hai dòng <code>Function "ts_probe" not defined.</code> là cố ý, không phải lỗi.'] },

          { t: 'p', x:
            'Lần <code>break</code> đầu bị từ chối: chưa ai biết <code>ts_probe</code>, đúng như phần lý ' +
            'thuyết. Với <code>set confirm off</code>, GDB không hỏi "Make breakpoint pending…?" mà tự trả lời ' +
            'theo mặc định — là "không". <code>lx-symbols</code> nạp lại symbol của kernel ' +
            '(<code>loading vmlinux</code>) và tìm module, nhưng <code>lx-lsmod</code> cho thấy danh sách module ' +
            'đang trống: chưa có <code>insmod</code> nào, nên chưa có gì để nạp. Quan trọng là ' +
            '<code>lx-symbols</code> đã cài breakpoint ẩn ở <code>do_init_module</code>. ' +
            '<code>set breakpoint pending on</code> đổi mặc định thành "có", và lần <code>break</code> thứ hai ' +
            'thành <code>Breakpoint 1 (ts_probe) pending</code> — địa chỉ <code>&lt;PENDING&gt;</code>. Giờ ' +
            'chạy tiếp và nạp module:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code: 'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code: 'insmod /tsensor.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) continue\n' +
            'Continuing.\n' +
            'scanning for modules in /home/cah8hc/bai63/tsensor\n' +
            'scanning for modules in /home/cah8hc/embedded-course/bai38/linux-6.18.45\n' +
            'loading @0xffff80007afd0000: /home/cah8hc/bai63/tsensor/tsensor.ko\n' +
            '\n' +
            'Breakpoint 1, ts_probe (pdev=0xffff000003f79c00) at tsensor.c:104\n' +
            '104\t\tstruct device *dev = &pdev->dev;',
            notes: ['<code>insmod</code> ở cửa sổ 1 treo lại, không in gì — nó đang nằm giữa lời gọi <code>finit_module</code>, chờ kernel mà bạn vừa dừng. Địa chỉ <code>pdev</code> có thể khác trên máy bạn; địa chỉ nạp module <code>0xffff80007afd0000</code> thì Bài 50 đã thấy là cố định trong mọi lần chạy của kernel này.'] },

          { t: 'p', x:
            'Ba dòng <code>scanning…/loading…</code> là <code>lx-symbols</code> làm việc trong lúc kernel đang ở ' +
            '<code>do_init_module</code>: nó quét hai thư mục — cái bạn chỉ, và thư mục hiện tại — tìm thấy ' +
            '<code>tsensor.ko</code>, nạp symbol tại <code>0xffff80007afd0000</code>. Breakpoint pending lập tức ' +
            'có địa chỉ thật, và vài micro giây sau, driver core gọi <code>ts_probe</code>. Bạn đang đứng ở dòng ' +
            '104, dòng code đầu tiên của hàm. Hỏi xem ai gọi tới, và tham số là gì:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'bt\n' +
            'p pdev->name\n' +
            'p *pdev\n' +
            'lx-lsmod\n' +
            'p $lx_current().comm' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) bt\n' +
            '#0  ts_probe (pdev=0xffff000003f79c00) at tsensor.c:104\n' +
            '#1  0xffff8000809c62e8 in platform_probe (_dev=0xffff000003f79c10) at drivers/base/platform.c:1377\n' +
            '#2  0xffff8000809c3494 in call_driver_probe (drv=0xffff80007afd2038 <ts_driver+40>, drv=0xffff80007afd2038 <ts_driver+40>, dev=0xffff000003f79c10) at drivers/base/dd.c:640\n' +
            '#3  really_probe (dev=dev@entry=0xffff000003f79c10, drv=drv@entry=0xffff80007afd2038 <ts_driver+40>) at drivers/base/dd.c:718\n' +
            '#4  0xffff8000809c36c0 in __driver_probe_device (dev=0xffff000003f79c10, drv=0xffff80007afd2038 <ts_driver+40>) at drivers/base/dd.c:880\n' +
            '#5  __driver_probe_device (drv=0xffff80007afd2038 <ts_driver+40>, dev=0xffff000003f79c10) at drivers/base/dd.c:839\n' +
            '#6  0xffff8000809c3848 in driver_probe_device (drv=drv@entry=0xffff80007afd2038 <ts_driver+40>, dev=dev@entry=0xffff000003f79c10) at drivers/base/dd.c:910\n' +
            '#7  0xffff8000809c3a90 in __driver_attach (data=0xffff80007afd2038 <ts_driver+40>, dev=0xffff000003f79c10) at drivers/base/dd.c:1296\n' +
            '#8  __driver_attach (dev=0xffff000003f79c10, data=0xffff80007afd2038 <ts_driver+40>) at drivers/base/dd.c:1236\n' +
            '#9  0xffff8000809c0f04 in bus_for_each_dev (bus=<optimized out>, start=start@entry=0x0 <ts_init>, data=data@entry=0xffff80007afd2038 <ts_driver+40>, fn=fn@entry=0xffff8000809c3a1c <__driver_attach>) at drivers/base/bus.c:370\n' +
            '#10 0xffff8000809c2c5c in driver_attach (drv=drv@entry=0xffff80007afd2038 <ts_driver+40>) at drivers/base/dd.c:1314\n' +
            '#11 0xffff8000809c2118 in bus_add_driver (drv=drv@entry=0xffff80007afd2038 <ts_driver+40>) at drivers/base/bus.c:726\n' +
            '#12 0xffff8000809c463c in driver_register (drv=0xffff80007afd2038 <ts_driver+40>) at drivers/base/driver.c:249\n' +
            '#13 0xffff8000809c6004 in __platform_driver_register (drv=<optimized out>, owner=<optimized out>) at drivers/base/platform.c:866\n' +
            '#14 0xffff80007afd6088 in ?? ()\n' +
            '#15 0xffff80007afd6000 in ?? ()\n' +
            'Backtrace stopped: previous frame inner to this frame (corrupt stack?)\n' +
            '(gdb) p pdev->name\n' +
            '$1 = 0xffff000003502ad0 "b000000.sensor"\n' +
            '(gdb) p *pdev\n' +
            '$2 = {name = 0xffff000003502ad0 "b000000.sensor", id = -1, id_auto = false, dev = {kobj = {name = 0xffff000003502ad0 "b000000.sensor", … of_node = 0xffff00001ff0c328, … num_resources = 1, resource = 0xffff000003788680, id_entry = 0x0 <ts_init>, mfd_cell = 0x0 <ts_init>, archdata = {<No data fields>}}\n' +
            '(gdb) lx-lsmod\n' +
            'Address            Module                  Size  Used by\n' +
            '0xffff80007afd0000 tsensor                12288  1\n' +
            '(gdb) p $lx_current().comm\n' +
            '$3 = "insmod\\000\\000\\000\\000\\000\\000\\000\\000\\000"',
            notes: ['<code>p *pdev</code> in một dòng dài <b>5 222</b> ký tự (cả <code>struct device</code> lồng bên trong); ở đây đã cắt giữa bằng <code>…</code>.'] },

          { t: 'p', x:
            '<code>bt</code> là đúng sơ đồ ở phần lý thuyết, giờ có số dòng thật: <code>insmod</code> → ' +
            '<code>ts_init</code> (khung <code>#14</code>/<code>#15</code>, trong <code>.init.text</code> của module — ' +
            'phần <code>lx-symbols</code> không nạp, nên <code>??</code>) → <code>__platform_driver_register</code> ' +
            '→ <code>driver_register</code> → <code>bus_add_driver</code> → … → <code>really_probe</code> dòng 718 ' +
            '→ <code>platform_probe</code> dòng 1377 → hàm của bạn. Bài 44 kể cơ chế "DT → platform_device → ' +
            'probe()" bằng lời; đây là chính chuỗi đó, đọc từ stack. <code>p pdev-&gt;name</code> cho biết lần gọi ' +
            'này là cho <code>b000000.sensor</code>. <code>lx-lsmod</code> giờ thấy <code>tsensor</code>, 12 288 ' +
            'byte — đúng <code>coresize</code> mà Bài 50 đọc trong sysfs. Và tác vụ đang chạy là ' +
            '<code>insmod</code>: <code>probe()</code> chạy trong ngữ cảnh của tiến trình đã gọi ' +
            '<code>insmod</code>, không phải trong một luồng kernel riêng.' },

          { t: 'p', x:
            'Đi từng dòng qua phần đầu của <code>ts_probe</code>:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'next\n' +
            'next\n' +
            'next\n' +
            'next\n' +
            'info locals\n' +
            'p np->full_name' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) next\n' +
            '105\t\tstruct device_node *np = dev->of_node;\n' +
            '(gdb) next\n' +
            '111\t\tdev_info(dev, "probe\\n");\n' +
            '(gdb) next\n' +
            '113\t\tts = devm_kzalloc(dev, sizeof(*ts), GFP_KERNEL);\n' +
            '(gdb) next\n' +
            '114\t\tif (!ts)\n' +
            '(gdb) info locals\n' +
            'dev = 0xffff000003f79c10\n' +
            'np = 0xffff00001ff0c328\n' +
            'res = <optimized out>\n' +
            'node = <optimized out>\n' +
            'ts = 0xffff000003eff480\n' +
            'ret = <optimized out>\n' +
            '(gdb) p np->full_name\n' +
            '$4 = 0xffff00001ff0c3f8 "sensor@b000000"' },

          { t: 'p', x:
            'Từ 105 nhảy thẳng tới 111: dòng 106–110 chỉ là khai báo biến, không sinh ra lệnh máy nào. Sau khi ' +
            '<code>next</code> qua dòng 111, cửa sổ 1 in <code>tsensor b000000.sensor: probe</code> — chính ' +
            'dòng <code>dev_info</code> vừa chạy. <code>info locals</code> cho thấy <code>ts</code> vừa nhận ' +
            'địa chỉ từ <code>devm_kzalloc</code>, <code>np</code> trỏ vào node Device Tree ' +
            '<code>sensor@b000000</code>. Ba biến <code>res</code>, <code>node</code>, <code>ret</code> là ' +
            '<code>&lt;optimized out&gt;</code>: chúng chưa được gán, và compiler chưa cấp thanh ghi nào cho ' +
            'chúng ở đoạn mã này. Không phải lỗi — chỉ là chưa tới lúc. Nhảy qua toàn bộ phần đọc Device Tree ' +
            'một lần:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'until 152\n' +
            'p *ts\n' +
            'set $ts = ts\n' +
            'p/x ts->trip_mdeg\n' +
            'p *res' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) until 152\n' +
            'ts_probe (pdev=0xffff000003f79c00) at tsensor.c:153\n' +
            '153\t\tif (ts->minor < 0)\n' +
            '(gdb) p *ts\n' +
            '$5 = {dev = 0xffff000003f79c10, label = 0xffffffffff5ffc28 "board", offset_mdeg = 42500, trip_mdeg = {60000, 85000}, poll_ms = 1000, enable = 0x0 <ts_init>, minor = 0, cdev = {kobj = {name = 0x0 <ts_init>, … dev = 0, count = 0}}\n' +
            '(gdb) set $ts = ts\n' +
            '(gdb) p/x ts->trip_mdeg\n' +
            '$7 = {0xea60, 0x14c08}\n' +
            '(gdb) p *res\n' +
            '$9 = {start = 184549376, end = 184553471, name = 0xffff00001ff0c3f8 "sensor@b000000", flags = 512, desc = 0, parent = 0x0 <ts_init>, sibling = 0x0 <ts_init>, child = 0x0 <ts_init>}',
            notes: ['Phần <code>cdev</code> của <code>p *ts</code> đã được cắt bằng <code>…</code>: mọi field của nó đều 0 vì <code>cdev_init</code> chưa chạy. Bản ghi gốc có thêm hai lệnh in xen giữa, nên số <code>$7</code>, <code>$9</code> nhảy cóc; trên máy bạn sẽ là <code>$6</code>, <code>$7</code>.'] },

          { t: 'p', x:
            '<code>until 152</code> dừng ở 153, không phải 152: dòng 152 (<code>ida_alloc_max</code>) chạy xong ' +
            'trước khi GDB kịp dừng, vì compiler đã trộn lệnh của nó với dòng sau. Đây là điều thường gặp khi ' +
            'debug code đã tối ưu. <code>p *ts</code> là toàn bộ kết quả của phần đọc Device Tree, trong một ' +
            'lệnh: <code>label</code> <code>"board"</code>, <code>offset_mdeg</code> <b>42500</b>, ' +
            '<code>trip_mdeg</code> <b>{60000, 85000}</b>, <code>poll_ms</code> <b>1000</b> (mặc định, node ' +
            'không có <code>learn,poll-ms</code>), <code>enable</code> NULL (không có <code>enable-gpios</code>), ' +
            '<code>minor</code> 0 (vừa xin được). Đúng từng giá trị mà Bài 54 phải in bằng <code>dev_info</code>. ' +
            '<code>p/x</code> in mảng ở hệ 16: <code>0xea60</code> = 60 000. <code>p *res</code>: ' +
            '<code>start = 184549376</code> chính là <code>0x0b000000</code>, <code>end</code> = ' +
            '<code>0x0b000fff</code> — giá trị <code>reg</code> của node. <code>set $ts = ts</code> lưu con trỏ ' +
            'vào một biến của GDB để dùng lại ở bước 6, khi <code>ts_probe</code> đã trả về.' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'finish\n' +
            'continue\n' +
            'p pdev->name' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) finish\n' +
            'Run till exit from #0  ts_probe (pdev=0xffff000003f79c00) at tsensor.c:153\n' +
            'platform_probe (_dev=0xffff000003f79c10) at drivers/base/platform.c:1380\n' +
            '1380\t\tif (drv->prevent_deferred_probe && ret == -EPROBE_DEFER) {\n' +
            'Value returned is $10 = 0\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Breakpoint 1, ts_probe (pdev=0xffff000003f7a000) at tsensor.c:104\n' +
            '104\t\tstruct device *dev = &pdev->dev;\n' +
            '(gdb) p pdev->name\n' +
            '$11 = 0xffff000003502b00 "b002000.sensor"' },

          { t: 'p', x:
            '<code>finish</code> chạy hết phần còn lại của <code>ts_probe</code> và dừng ở hàm gọi, ' +
            '<code>platform_probe</code> dòng 1380, kèm <code>Value returned is $10 = 0</code> — probe thành ' +
            'công. Bạn biết điều đó mà không cần đọc log. <code>continue</code> lại dừng ở <code>ts_probe</code> ' +
            'lần nữa: breakpoint vẫn còn, và driver core đang gọi probe cho thiết bị thứ hai, ' +
            '<code>b002000.sensor</code> — node thiếu <code>learn,offset-mdeg</code> ở Bài 54. Nếu muốn biết ' +
            'chính xác nó bỏ cuộc ở dòng nào, <code>next</code> vài lần là thấy dòng 129. Thả nó đi:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'delete\n' +
            'continue' },

          { t: 'p', x:
            'Cửa sổ 1 in tiếp phần còn lại, rồi trả về dấu nhắc:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /tsensor.ko\n' +
            '[    3.023709] tsensor: loading out-of-tree module taints kernel.\n' +
            '[    3.048392] tsensor b000000.sensor: probe\n' +
            '[    3.082013] tsensor b000000.sensor: board: [mem 0x0b000000-0x0b000fff] offset 42500 trip 60000/85000 poll 1000 ms gpio no -> tsensor0\n' +
            '[    3.109911] tsensor b002000.sensor: probe\n' +
            '[    3.116354] tsensor b002000.sensor: error -EINVAL: learn,offset-mdeg missing\n' +
            '[    3.116693] tsensor b002000.sensor: probe with driver tsensor failed with error -22\n' +
            '~ # ',
            notes: ['Các mốc thời gian chỉ là thời gian <b>máy ảo</b> đã chạy: khi GDB dừng kernel, đồng hồ của nó cũng đứng, nên dù bạn dừng mười phút, mốc vẫn chỉ cách nhau vài chục mili giây. Con số cụ thể sẽ khác trên máy bạn.'] },

          { t: 'p', x:
            'Sáu dòng log giống hệt Bài 54 — dòng thứ ba in đúng những giá trị bạn vừa đọc bằng ' +
            '<code>p *ts</code>. Lần này bạn biết chúng trước khi chúng được in. Thiết bị thứ ba ' +
            '<code>b003000.sensor</code> không gọi probe ở đây: nó cần <code>gpio-delay</code>, đang chờ ' +
            '(deferred probe, Bài 54 bước 4).' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — "optimized out", sửa một biến, và bắt mọi lần đọc nó',
        blocks: [
          { t: 'p', x:
            'Phiên vẫn đang chạy từ bước 5. Ctrl-C ở cửa sổ 2, đặt breakpoint vào hàm <code>read</code> của ' +
            'driver, rồi đọc thiết bị:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'break ts_read\n' +
            'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code: 'cat /dev/tsensor0' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'p ts\n' +
            'p filp->private_data\n' +
            'p $ts\n' +
            'p $ts->offset_mdeg' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) break ts_read\n' +
            'Breakpoint 2 at 0xffff80007afd0118: file tsensor.c, line 46.\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Breakpoint 2, ts_read (filp=0xffff000003c72000, buf=0xffff8f148000 <error: Cannot access memory at address 0xffff8f148000>, count=65536, ppos=0xffff800083433e10) at tsensor.c:46\n' +
            '46\t{\n' +
            '(gdb) p ts\n' +
            '$12 = <optimized out>\n' +
            '(gdb) p filp->private_data\n' +
            '$13 = (void *) 0xffff000003eff480\n' +
            '(gdb) p $ts\n' +
            '$14 = (struct ts_dev *) 0xffff000003eff480\n' +
            '(gdb) p $ts->offset_mdeg\n' +
            '$15 = 42500',
            notes: ['Địa chỉ <code>filp</code>, <code>buf</code>, <code>ppos</code> khác trên máy bạn và khác cả giữa hai lần <code>cat</code>. Điều không đổi: <code>filp-&gt;private_data</code> và <code>$ts</code> luôn bằng nhau.'] },

          { t: 'p', x:
            'Bốn điều trong output. Thứ nhất, tham số <code>buf</code> in kèm <code>&lt;error: Cannot access ' +
            'memory…&gt;</code>: đó là địa chỉ <b>userspace</b> của tiến trình <code>cat</code> ' +
            '(<code>0xffff8f…</code> nằm ở nửa thấp, không phải <code>0xffff8000…</code> của kernel), GDB đọc ' +
            'không được — đúng lý do Bài 51 bắt kernel phải dùng <code>copy_to_user</code>. <code>count=65536</code> ' +
            'là kích thước bộ đệm của BusyBox <code>cat</code>, Bài 52 đã đo. Thứ hai, ' +
            '<code>p ts</code> trả lời <code>&lt;optimized out&gt;</code>: ở dòng 46 (dấu <code>{</code>), ' +
            '<code>ts</code> chưa được gán, và kernel build với <code>-O2</code> không để dành chỗ cho nó. ' +
            'Thứ ba, <code>ts</code> chỉ là bản sao của <code>filp-&gt;private_data</code> (dòng 47), nên đọc ' +
            'thẳng giá trị gốc: <code>0xffff000003eff480</code>. Thứ tư, <code>$ts</code> — con trỏ bạn lưu ' +
            'trong <code>ts_probe</code> ở bước 5 — có <b>cùng địa chỉ</b>. Đây là bằng chứng trực tiếp cho câu ' +
            'Bài 52 chỉ nói bằng lời: <code>open</code> dùng <code>container_of</code> để tìm lại đúng cấu ' +
            'trúc mà <code>probe</code> đã cấp phát, và cất nó vào <code>private_data</code>.' },

          { t: 'cal', kind: 'tip', title: 'Gặp "optimized out": tìm cùng giá trị ở chỗ khác',
            x: '<p>Ba cách, theo thứ tự nên thử:</p><ul>' +
               '<li><b>Đọc nguồn gốc của biến</b>, như vừa làm: <code>ts</code> lấy từ ' +
               '<code>filp-&gt;private_data</code>, mà <code>filp</code> là tham số — tham số thường còn sống.</li>' +
               '<li><b>Chạy thêm một hai dòng</b> (<code>next</code>): biến có thể chỉ chưa được gán, như ' +
               '<code>res</code> ở bước 5.</li>' +
               '<li><b>Lưu con trỏ từ lúc nó còn sống</b> vào biến GDB (<code>set $ts = ts</code>), rồi dùng ' +
               'lại ở các lần dừng sau.</li></ul>' +
               '<p>Đừng build lại kernel với <code>-O0</code>: kernel không build được ở mức đó. Riêng một ' +
               'module thì có thể bỏ tối ưu cho từng hàm, nhưng code bạn debug khi ấy không còn là code bạn ' +
               'giao cho khách hàng.</p>' },

          { t: 'p', x:
            'Giờ sửa giá trị trong bộ nhớ kernel. Cảm biến của bạn sẽ báo 99 °C:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'set var $ts->offset_mdeg = 99000\n' +
            'p $ts->offset_mdeg\n' +
            'delete\n' +
            'continue' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) set var $ts->offset_mdeg = 99000\n' +
            '(gdb) p $ts->offset_mdeg\n' +
            '$16 = 99000\n' +
            '(gdb) delete\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '---- cửa sổ 1 ----\n' +
            '~ # cat /dev/tsensor0\n' +
            '99000' },

          { t: 'cmdx', cmd: 'set var $ts->offset_mdeg = 99000',
            rows: [
              ['<code>set var</code>', 'Gán giá trị cho một biểu thức C.', '<code>var</code> bắt buộc khi tên biến có thể trùng tên một lệnh <code>set</code> của GDB'],
              ['<code>$ts-&gt;offset_mdeg</code>', 'Field <code>offset_mdeg</code> của struct mà <code>$ts</code> trỏ tới.', 'GDB tự tính độ lệch field từ <code>.debug_info</code> — cần debug info đầy đủ'],
              ['<code>= 99000</code>', 'Giá trị mới, ghi thẳng vào RAM của máy ảo qua gdbstub.', 'Kernel không biết gì cả: không có hàm nào được gọi']
            ] },

          { t: 'p', x:
            '<code>cat</code> đã đang chờ ở <code>ts_read</code> từ trước khi bạn sửa, và vì dòng 51 ' +
            '(<code>ts_read_mdeg(ts)</code>) chưa chạy, nó đọc giá trị mới: <b>99000</b>. Bạn đã thay đổi hành ' +
            'vi của một driver đang chạy mà không build lại, không <code>rmmod</code>. Trong thực tế, cách này ' +
            'dùng để thử một giả thuyết: "nếu ngưỡng là X thì lỗi còn xảy ra không?" — trước khi bỏ công sửa code.' },

          { t: 'p', x:
            'Câu hỏi tiếp theo: ngoài <code>ts_read</code>, còn ai đọc <code>offset_mdeg</code>? Bạn có thể ' +
            'đọc hết mã nguồn — hoặc để CPU tự trả lời. <b>Watchpoint</b> dừng khi một ô nhớ bị chạm tới, bất ' +
            'kể bởi dòng code nào. Ctrl-C ở cửa sổ 2, rồi:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'rwatch -l $ts->offset_mdeg\n' +
            'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code:
            'cat /sys/bus/platform/devices/b000000.sensor/temp' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb), khi dừng', code: 'bt 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '(gdb) rwatch -l $ts->offset_mdeg\n' +
            'Hardware read watchpoint 3: -location $ts->offset_mdeg\n' +
            '(gdb) continue\n' +
            'Continuing.\n' +
            '\n' +
            'Hardware read watchpoint 3: -location $ts->offset_mdeg\n' +
            '\n' +
            'Value = 99000\n' +
            '0xffff80007afd003c in temp_show (dev=0xffff000003f79c10, attr=<optimized out>, buf=0xffff000003fa5000 "") at tsensor.c:67\n' +
            '67\t\treturn sysfs_emit(buf, "%u\\n", ts_read_mdeg(ts));\n' +
            '(gdb) bt 4\n' +
            '#0  0xffff80007afd003c in temp_show (dev=0xffff000003f79c10, attr=<optimized out>, buf=0xffff000003fa5000 "") at tsensor.c:67\n' +
            '#1  0xffff8000809b9554 in dev_attr_show (kobj=<optimized out>, attr=0xffff80007afd20f8 <dev_attr_temp>, buf=<optimized out>) at drivers/base/core.c:2486\n' +
            '#2  0xffff800080407090 in sysfs_kf_seq_show (sf=0xffff000003ef7000, v=<optimized out>) at fs/sysfs/file.c:65\n' +
            '#3  0xffff800080404b94 in kernfs_seq_show (sf=<optimized out>, v=<optimized out>) at fs/kernfs/file.c:223\n' +
            '(More stack frames follow...)' },

          { t: 'cmdx', cmd: 'rwatch -l $ts->offset_mdeg',
            rows: [
              ['<code>rwatch</code>', 'Read watchpoint: dừng khi ô nhớ bị <b>đọc</b>.', '<code>watch</code> = khi bị ghi, <code>awatch</code> = cả hai'],
              ['<code>-l</code>', '<i>location</i>: theo dõi địa chỉ hiện tại của biểu thức, không theo dõi biểu thức.', 'Không có <code>-l</code>, GDB phải tính lại <code>$ts-&gt;…</code> mỗi bước — chậm, và hỏng khi rời phạm vi biến'],
              ['<code>Hardware</code>', 'GDB dùng một trong <b>4</b> thanh ghi watchpoint của CPU.', 'Con số 4 chính là dòng <code>hw-breakpoint: found 6 breakpoint and 4 watchpoint registers</code> trong log boot']
            ] },

          { t: 'p', x:
            'CPU dừng ngay lệnh vừa đọc ô nhớ: <code>temp_show</code>, dòng 67 — hàm in file sysfs ' +
            '<code>temp</code> mà Bài 54 tạo bằng <code>DEVICE_ATTR_RO</code>. Địa chỉ <code>0xffff80007afd003c</code> ' +
            'không rơi đúng đầu một dòng nên GDB in kèm nó. <code>Value = 99000</code> là giá trị đang được đọc. ' +
            '<code>bt</code> cho thấy con đường: <code>kernfs_seq_show</code> → <code>sysfs_kf_seq_show</code> → ' +
            '<code>dev_attr_show</code> → hàm của bạn. Hai con đường đọc cùng một field — ' +
            '<code>/dev/tsensor0</code> qua <code>ts_read</code> và sysfs qua <code>temp_show</code> — đều gọi ' +
            '<code>ts_read_mdeg</code>, và watchpoint tìm ra cả hai mà bạn không cần mở file nguồn. Dọn dẹp và ' +
            'kiểm tra lần cuối:' },

          { t: 'code', where: 'wsl', name: 'Trong dấu nhắc (gdb)', code:
            'delete\n' +
            'continue' },

          { t: 'code', where: 'qemu', name: 'Cửa sổ 1 — guest', code: 'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /sys/bus/platform/devices/b000000.sensor/temp\n' +
            '99000\n' +
            '~ # cat /proc/sys/kernel/tainted\n' +
            '4096' },

          { t: 'p', x:
            'File sysfs cũng báo 99000 — cùng ô nhớ. <code>tainted</code> = <b>4096</b> (chỉ cờ <code>O</code>, ' +
            'module out-of-tree, Bài 50): việc GDB ghi vào bộ nhớ kernel không để lại dấu vết nào trong kernel. ' +
            'Đó vừa là sức mạnh vừa là mối nguy của debugger: sau một phiên có <code>set var</code>, trạng thái ' +
            'kernel không còn là thứ code của bạn tạo ra. Đừng báo cáo lỗi từ một máy ảo vừa bị sửa tay. Kết ' +
            'thúc bằng <code>kill</code> và <code>quit</code>.' },

          { t: 'cal', kind: 'info', title: 'Dọn dẹp',
            x: '<code>~/bai63</code> (~6 MB: <code>tsensor/</code>, <code>initramfs/</code>, ' +
               '<code>initramfs.cpio.gz</code>, <code>build.log</code>) không bài nào sau dùng tới — xoá tuỳ ý; ' +
               'chép <code>config.before</code> ra chỗ khác trước nếu muốn giữ cấu hình cũ. <b>Giữ</b> <code>~/.gdbinit</code> và cấu hình mới của <code>~/bai38</code>: Bài 64 dùng ' +
               'lại <code>vmlinux</code> đầy đủ debug info để dịch địa chỉ trong oops về dòng code. ' +
               '<code>~/bai54</code> không bị thay đổi.' }
        ] }

    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>No struct type named platform_device.</code>',
         '<code>CONFIG_DEBUG_INFO_REDUCED=y</code> (mặc định của <code>defconfig</code>): struct chỉ được ghi vào file <code>.o</code> trùng tên với header khai báo nó.',
         '<code>scripts/config --disable DEBUG_INFO_REDUCED</code>, <code>olddefconfig</code>, build lại <code>Image</code> (bước 1). Module cũng phải build lại.'],
        ['<code>warning: File "…/vmlinux-gdb.py" auto-loading has been declined by your `auto-load safe-path\'</code>, rồi <code>Undefined command: "lx-ps"</code>',
         'GDB tìm thấy script nhưng không được phép chạy. Lưu ý <code>-nx</code> chỉ bỏ <code>~/.gdbinit</code>; cảnh báo này vẫn hiện.',
         'Thêm <code>add-auto-load-safe-path ~/bai38/linux-6.18.45</code> vào <code>~/.gdbinit</code>, và mở GDB <b>không</b> có <code>-nx</code>.'],
        ['<code>Continuing.</code> rồi kernel boot thẳng tới shell, breakpoint không bao giờ dừng; Ctrl-C ra <code>0xffff…198 in ?? ()</code>',
         'KASLR đã dời kernel: dòng <code>KASLR enabled</code> trong log. Xảy ra khi CPU có <code>RNDR</code> (<code>-cpu max</code>) hoặc bootloader ghi <code>kaslr-seed</code>.',
         'Thêm <code>nokaslr</code> vào <code>-append</code>. Kiểm tra bằng <code>lx-dmesg</code> hoặc <code>dmesg | grep -i kaslr</code>: phải thấy <code>KASLR disabled on command line</code>.'],
        ['<code>Function "ts_probe" not defined.</code>',
         'Module chưa nạp, hoặc đã nạp nhưng GDB chưa có symbol của nó.',
         '<code>lx-symbols ~/bai63/tsensor</code>, rồi <code>set breakpoint pending on</code> và <code>break ts_probe</code> <b>trước</b> <code>insmod</code>.'],
        ['Breakpoint ở <code>ts_probe</code> có địa chỉ thật nhưng không bao giờ dừng; <code>insmod</code> đã in xong log probe',
         'Breakpoint được đặt <b>sau</b> <code>insmod</code>: probe chạy ngay trong <code>insmod</code> và đã xong.',
         '<code>rmmod tsensor</code> rồi <code>insmod</code> lại, hoặc <code>echo b000000.sensor &gt; /sys/bus/platform/drivers/tsensor/bind</code> sau khi <code>unbind</code>.'],
        ['<code>$12 = &lt;optimized out&gt;</code> / <code>value has been optimized out</code>',
         'Kernel build với <code>-O2</code>: biến chưa được gán, hoặc compiler không giữ nó ở thanh ghi nào tại điểm này.',
         'Đọc nguồn gốc của nó (<code>filp-&gt;private_data</code>), <code>next</code> thêm vài dòng, hoặc lưu từ trước bằng <code>set $ts = ts</code> (bước 6).'],
        ['<code>until 152</code> dừng ở dòng 153',
         'Compiler trộn lệnh của dòng 152 với dòng sau; không có lệnh nào "bắt đầu" dòng 152 sau điểm hiện tại.',
         'Bình thường với code đã tối ưu. Đọc biến ở dòng GDB dừng; nếu cần chính xác, đặt breakpoint ở dòng kế tiếp.'],
        ['<code>could not connect: Connection timed out.</code> sau <code>target remote :1234</code>',
         'QEMU khởi động không có <code>-s</code>, hoặc chưa chạy (Bài 33 đã gặp đúng thông báo này).',
         'Kiểm tra dòng lệnh ở cửa sổ 1 có <code>-s -S</code>, rồi mới gõ <code>target remote</code>.'],
        ['<code>Delete all breakpoints? (y or n)</code>, <code>--Type &lt;RET&gt; for more, q to quit…</code>',
         'Không có <code>set confirm off</code> / <code>set pagination off</code>.',
         'Thêm hai dòng đó vào <code>~/.gdbinit</code> (bước 1).']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      'Debug kernel bằng GDB cần ba bên: <b>QEMU <code>-s -S</code></b> (gdbstub, cổng 1234), <b><code>gdb-multiarch</code></b> trên host, và <b><code>vmlinux</code></b> có debug info. Kernel trong máy ảo không biết mình đang bị debug.',
      '<code>defconfig</code> có <b><code>DEBUG_INFO_REDUCED=y</code></b>: GDB biết dòng code nhưng không biết <code>struct platform_device</code>. Tắt nó: <code>vmlinux</code> <b>225 → 666 MB</b>, build lại <b>6m17s</b>, <code>Image</code> vẫn <b>49 342 976 B</b>.',
      '<b><code>GDB_SCRIPTS</code></b> + <code>add-auto-load-safe-path</code> cho <b>34</b> lệnh <code>lx-*</code>: <code>lx-dmesg</code> (246 dòng log, không cần shell), <code>lx-ps</code>, <code>lx-lsmod</code>, <code>lx-symbols</code>, <code>$lx_current()</code>.',
      '<b>KASLR</b> làm breakpoint im lặng: với <code>-cpu max</code> kernel tự lấy hạt giống bằng <code>RNDR</code>, dời đi <code>0x288fea200000</code>, Ctrl-C ra <code>?? ()</code>. <b>Debug kernel thì luôn có <code>nokaslr</code></b>.',
      '<code>start_kernel</code> → <code>init_task</code> (PID 0, <code>swapper</code>) → <code>do_one_initcall</code> → <code>run_init_process("/init")</code> với PID 1 vẫn tên <code>swapper/0</code> → cuối cùng PID 0 thành vòng <code>do_idle</code>.',
      'Module có địa chỉ chỉ sau <code>insmod</code>: <b><code>lx-symbols</code> + breakpoint pending, đặt trước <code>insmod</code></b>. <code>bt</code> trong <code>ts_probe</code> cho đúng chuỗi <code>__platform_driver_register</code> → <code>really_probe</code> → <code>platform_probe</code>.',
      '<code>next</code>/<code>until</code>/<code>finish</code> đi qua <code>ts_probe</code>; <code>p *ts</code> cho mọi giá trị đọc từ Device Tree trong một lệnh; <code>finish</code> in <b>giá trị trả về 0</b>.',
      '<code>&lt;optimized out&gt;</code> → đọc nguồn gốc (<code>filp-&gt;private_data</code> = <code>$ts</code>). <b><code>set var</code></b> làm <code>cat</code> in <b>99000</b>; <b><code>rwatch -l</code></b> (1 trong 4 thanh ghi watchpoint) tìm ra <code>temp_show</code> mà không cần đọc mã nguồn.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Debugger chỉ giúp được khi kernel còn sống và bạn ngồi trước nó. Phần lớn lỗi kernel ngoài đời đến ' +
         'dưới dạng một đoạn log mà khách hàng gửi về: <code>Unable to handle kernel NULL pointer dereference ' +
         'at virtual address 0000000000000010</code>, kèm thanh ghi và call trace. <b>Bài 64 — Đọc kernel panic ' +
         'và oops</b> cố ý gây một oops trong một module, đọc từng dòng của thông điệp, rồi dùng ' +
         '<code>vmlinux</code> đầy đủ debug info vừa build — qua <code>addr2line</code>, <code>objdump</code> và ' +
         '<code>decode_stacktrace.sh</code> — để chỉ ra đúng dòng C gây lỗi từ một địa chỉ như ' +
         '<code>pc : fn+0x28/0x1000</code>.' }
  ],

  quiz: [
    { q: 'Bạn chạy QEMU với <code>-s -S</code>, nối GDB, gõ <code>break start_kernel</code> rồi <code>continue</code>. GDB in <code>Continuing.</code> rồi im lặng, còn cửa sổ QEMU boot tới tận shell. Ctrl-C trong GDB ra <code>0xffffa8906b358198 in ?? ()</code>. Nguyên nhân có khả năng nhất?',
      opts: [
        '<code>vmlinux</code> không có debug info',
        'KASLR đã dời kernel tới một địa chỉ ngẫu nhiên, nên breakpoint đặt ở địa chỉ ghi trong <code>vmlinux</code> không bao giờ được chạy qua',
        'Phải dùng <code>hbreak</code> vì MMU chưa bật',
        'GDB nối nhầm cổng, nên nó đang điều khiển một QEMU khác'
      ],
      a: 1,
      why: 'Ba manh mối cùng chỉ về KASLR: breakpoint không dừng dù kernel rõ ràng có chạy qua <code>start_kernel</code>; PC rơi vào một địa chỉ <code>vmlinux</code> không biết (<code>??</code>); địa chỉ đó khác hẳn vùng <code>0xffff8000…</code>. Thiếu debug info vẫn cho phép dừng ở <code>start_kernel</code> nhờ bảng symbol. <code>hbreak</code> không cần thiết với gdbstub của QEMU — bước 2 dừng được bằng <code>break</code>. Cách kiểm tra: <code>dmesg | grep -i kaslr</code> in <code>KASLR enabled</code>; cách sửa: <code>nokaslr</code>.' },

    { q: 'Vì sao <code>break ts_probe</code> trả lời <code>Function "ts_probe" not defined.</code> dù bạn đã chạy <code>lx-symbols ~/bai63/tsensor</code>?',
      opts: [
        '<code>tsensor.ko</code> được build không có debug info',
        '<code>lx-symbols</code> chỉ nạp symbol cho module <b>đang có trong kernel</b>; chưa <code>insmod</code> thì chưa có địa chỉ nào để gán cho <code>ts_probe</code>',
        '<code>ts_probe</code> là hàm <code>static</code>, GDB không bao giờ thấy được',
        'Phải gõ <code>break tsensor.c:ts_probe</code>'
      ],
      a: 1,
      why: 'Một <code>.ko</code> là file ELF <i>relocatable</i> (Bài 50): mã chưa có địa chỉ cho tới khi kernel chọn chỗ đặt nó lúc <code>insmod</code>. <code>lx-lsmod</code> ở bước 5 in danh sách rỗng — <code>lx-symbols</code> không có gì để nạp, nhưng nó đã cài breakpoint ẩn ở <code>do_init_module</code>. Kết hợp với <code>set breakpoint pending on</code>, breakpoint thành <code>&lt;PENDING&gt;</code> và tự có địa chỉ <code>0xffff80007afd01f8</code> khi module được nạp. Hàm <code>static</code> vẫn có trong symbol table và debug info.' },

    { q: 'Sau khi tắt <code>DEBUG_INFO_REDUCED</code> và build lại, điều gì đúng?',
      opts: [
        'Cả <code>vmlinux</code> và <code>Image</code> đều to lên khoảng 3 lần, nên bo mạch cần thêm flash',
        '<code>vmlinux</code> từ 225 MB lên 666 MB, nhưng <code>Image</code> vẫn đúng 49 342 976 B, vì debug info chỉ nằm trong các section <code>.debug_*</code> mà <code>objcopy</code> bỏ đi khi tạo <code>Image</code>',
        'Kernel chạy chậm hơn vì phải xử lý thêm debug info',
        'Không có gì thay đổi, vì <code>DEBUG_INFO=y</code> đã bật từ trước'
      ],
      a: 1,
      why: 'Debug info không bao giờ được nạp vào RAM để chạy: nó chỉ dành cho công cụ trên host (GDB, <code>addr2line</code>). <code>size -A vmlinux</code> ở bước 1 cho thấy <code>.debug_info</code> tăng từ 90 MB lên 412 MB và <code>.debug_loc</code> 96 MB xuất hiện, còn <code>ls -l</code> cho thấy <code>Image</code> không đổi một byte. Mã máy không đổi nên tốc độ không đổi. Đó là lý do sản phẩm thật vẫn nên giữ <code>vmlinux</code> đầy đủ debug info của mỗi bản phát hành.' },

    { q: 'Dừng ở đầu <code>ts_read</code>, <code>p ts</code> in <code>&lt;optimized out&gt;</code>. Cách nhanh nhất để đọc <code>offset_mdeg</code> của thiết bị đang được đọc là gì?',
      opts: [
        'Build lại cả kernel với <code>-O0</code>',
        'Thêm <code>pr_info("%u", ts-&gt;offset_mdeg)</code> rồi boot lại',
        '<code>p ((struct ts_dev *)filp-&gt;private_data)-&gt;offset_mdeg</code>, hoặc dùng con trỏ đã lưu từ <code>ts_probe</code> bằng <code>set $ts = ts</code>',
        'Không thể — biến bị tối ưu thì giá trị đã mất'
      ],
      a: 2,
      why: '<code>ts</code> chỉ là bản sao của <code>filp-&gt;private_data</code> (dòng 47), và <code>filp</code> là tham số, còn sống. Bước 6 đo được: <code>filp-&gt;private_data</code> = <code>0xffff000003eff480</code> = <code>$ts</code> lưu ở bước 5. Giá trị không mất, chỉ là compiler không giữ nó ở chỗ có tên <code>ts</code> tại điểm này. Kernel không build được ở <code>-O0</code>, và thêm <code>pr_info</code> là quay lại đúng vòng lặp sửa–build–boot mà bài này muốn tránh.' },

    { q: 'Ở bước 3, khi dừng tại <code>run_init_process</code>, <code>$lx_current().pid</code> là 1 nhưng <code>$lx_current().comm</code> là <code>"swapper/0"</code>. Điều này cho biết gì?',
      opts: [
        'GDB đọc nhầm tác vụ',
        'Tác vụ PID 1 đã tồn tại từ trước (sinh ra bằng <code>fork</code> từ PID 0 để chạy <code>kernel_init</code>), nhưng <code>execve("/init")</code> chưa chạy, nên tên vẫn kế thừa từ tác vụ cha',
        'Kernel đang chạy <code>/init</code> dưới tên <code>swapper</code>',
        'PID 1 luôn tên là <code>swapper/0</code> trong suốt thời gian hệ thống chạy'
      ],
      a: 1,
      why: '<code>bt</code> tại <code>do_one_initcall</code> đã cho thấy chuỗi <code>ret_from_fork</code> → <code>kernel_init</code>: một luồng kernel tách ra từ PID 0, nhận PID 1. Tên (<code>comm</code>) chỉ đổi khi <code>execve</code> nạp chương trình mới. Bằng chứng: sau khi kernel chạy tới shell, <code>lx-ps</code> ở cuối bước 3 in PID 1 là <code>sh</code> — script <code>/init</code> đã <code>exec /bin/sh</code>.' },

    { q: 'Bạn muốn biết <b>mọi</b> chỗ trong kernel đọc field <code>offset_mdeg</code> của một thiết bị cụ thể đang chạy, mà không phải đọc mã nguồn. Công cụ phù hợp?',
      opts: [
        '<code>break ts_read_mdeg</code>, vì mọi chỗ đọc đều qua hàm này',
        '<code>rwatch -l $ts-&gt;offset_mdeg</code>: thanh ghi watchpoint phần cứng làm CPU dừng ở bất kỳ lệnh nào đọc đúng địa chỉ đó',
        '<code>watch $ts-&gt;offset_mdeg</code>, vì <code>watch</code> bắt cả đọc lẫn ghi',
        '<code>lx-dmesg</code>'
      ],
      a: 1,
      why: '<code>rwatch</code> dừng khi ô nhớ bị <i>đọc</i> (<code>watch</code> chỉ bắt khi bị ghi, <code>awatch</code> mới bắt cả hai). Breakpoint ở một hàm chỉ bắt được những chỗ bạn đã biết — câu hỏi là tìm cả những chỗ bạn chưa biết. <code>-l</code> theo dõi địa chỉ chứ không phải biểu thức, nên vẫn đúng khi bạn rời khỏi hàm đã đặt nó. Bước 6 dùng đúng lệnh này và tìm ra <code>temp_show</code> (sysfs) dù bạn đặt nó từ <code>ts_read</code>.' }
  ]
});

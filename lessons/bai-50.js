/* Bài 50 — Module đầu tiên
   Chặng 10 — Kernel module và Driver
   Mở Chặng 10: viết mã chạy BÊN TRONG kernel. Một file hello.c 28 dòng với module_init / module_exit,
   MODULE_LICENSE; Makefile 11 dòng build ngoài cây (make -C ~/bai38/linux-6.18.45 M=…) cho ARM64;
   soi hello.ko bằng file / modinfo / size / nm / readelf (ELF REL — Bài 18); nạp vào QEMU bằng insmod,
   xem printk trong dmesg, lsmod, /proc/modules, /sys/module; rmmod gọi hàm dọn dẹp. Cố tình gặp bốn lỗi:
   nạp hai lần (EEXIST), init trả về -ENODEV, vermagic sai, thiếu MODULE_LICENSE — và đọc taint O/P.
   Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1),
   kernel ~/bai38/linux-6.18.45 (6.18.45-embedded), initramfs chép từ ~/bai32/initramfs (BusyBox 1.38.0).
   Không dạy modprobe/depmod, EXPORT_SYMBOL, module_param (ngoài phạm vi dòng Bài 50 của LO-TRINH);
   không dạy printk level, kmalloc, copy_to_user (Bài 51); không viết character device (Bài 52). */

Lesson.register({
  id: 'bai-50',
  title: 'Module đầu tiên',
  minutes: 50,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Suốt Chặng 07 đến Chặng 09, mọi dòng C bạn viết đều chạy ở <b>userspace</b>: ' +
    '<code>temp_daemon</code>, <code>noreap_init</code>, <code>erase_mtd</code>. Chúng gọi kernel qua ' +
    'syscall, nhưng không bao giờ ở <b>bên trong</b> nó. Kernel thì bạn chỉ cấu hình (Bài 39) và ' +
    'build (Bài 40), chưa thêm vào nó một dòng mã nào của mình.<br><br>' +
    'Bài này thay đổi điều đó. Bạn sẽ viết một file C 28 dòng, dịch chéo thành <code>hello.ko</code> ' +
    'bằng chính cây <code>~/bai38/linux-6.18.45</code>, rồi nạp nó vào kernel đang chạy trong QEMU — ' +
    'không build lại kernel, không boot lại. Dòng <code>pr_info</code> của bạn sẽ hiện trong ' +
    '<code>dmesg</code> với tên chương trình đã gọi nó; <code>rmmod</code> sẽ gọi hàm dọn dẹp của ' +
    'bạn. Đây là vòng lặp làm việc hằng ngày của người viết driver.<br><br>' +
    'Rồi bạn sẽ cố tình làm hỏng nó bốn lần — nạp hai lần, cho hàm khởi tạo trả về lỗi, sửa một ' +
    'byte trong chuỗi phiên bản, xoá dòng giấy phép — để biết kernel kiểm tra những gì trước khi ' +
    'chấp nhận mã lạ, và nó ghi nhớ gì sau đó.',

  goals: [
    'Viết một module tối thiểu với <code>module_init</code> / <code>module_exit</code>, ' +
      '<code>__init</code> / <code>__exit</code> và <code>MODULE_LICENSE</code>, và giải thích vai ' +
      'trò của từng dòng.',
    'Viết Makefile build module <b>ngoài cây</b> kernel (<code>make -C … M=…</code>) cho ARM64, và ' +
      'giải thích vì sao <code>ARCH</code>, <code>CROSS_COMPILE</code> và cây kernel phải khớp với ' +
      'kernel sẽ nạp module.',
    'Đọc một file <code>.ko</code> bằng <code>file</code>, <code>modinfo</code>, <code>size</code>, ' +
      '<code>nm</code>, <code>readelf</code>: nó là ELF <code>REL</code>, <code>vermagic</code> nằm ở ' +
      'đâu, và phần nào thật sự vào bộ nhớ kernel.',
    'Nạp, liệt kê và gỡ module bằng <code>insmod</code>, <code>lsmod</code>, <code>rmmod</code>; ' +
      'xác nhận bằng <code>dmesg</code>, <code>/proc/modules</code>, <code>/sys/module</code> và ' +
      '<code>/proc/kallsyms</code>.',
    'Chẩn đoán bốn lỗi nạp module thường gặp — <code>File exists</code>, init trả về lỗi, ' +
      '<code>invalid module format</code>, <code>missing MODULE_LICENSE()</code> — từ thông báo của ' +
      'userspace <b>và</b> dòng tương ứng trong <code>dmesg</code>.',
    'Đọc giá trị <code>/proc/sys/kernel/tainted</code> và giải thích vì sao một module ngoài cây ' +
      'hay một module độc quyền để lại dấu vết vĩnh viễn cho tới lần boot sau.'
  ],

  blocks: [

    /* ============================================================
       1. MODULE LÀ GÌ
       ============================================================ */
    { t: 'h2', x: 'Thêm mã vào một kernel đang chạy' },

    { t: 'p', x:
      'Bài 39 đã cho bạn thấy mỗi tính năng của kernel có thể ở một trong ba trạng thái: ' +
      '<code>=y</code> (hàn thẳng vào <code>Image</code>), <code>=m</code> (thành một file ' +
      '<code>.ko</code> rời), hoặc tắt. Bài 40 build ra <b>1 423</b> file <code>.ko</code> như thế, ' +
      'và Bài 48 đã <code>insmod overlay.ko</code> mà chưa giải thích nó là gì. Giờ đến lúc giải ' +
      'thích — và thay vì dùng module của người khác, bạn viết module của mình.' },

    { t: 'p', x:
      'Một <b>kernel module</b> (module kernel nạp được) là một mẩu mã máy được đưa vào kernel ' +
      '<b>khi kernel đang chạy</b>. Sau khi nạp, nó không còn là \"một chương trình\" nữa: nó không có ' +
      'PID, không có không gian địa chỉ riêng, không có <code>main()</code>. Nó là vài hàm được ' +
      'kernel gọi vào những thời điểm nhất định — lúc nạp, lúc gỡ, và (ở các bài sau) khi phần cứng ' +
      'hay userspace cần đến nó. Bài 37 đã nhấn mạnh hệ quả: mã trong <code>.ko</code> chạy cùng đặc ' +
      'quyền, cùng bộ nhớ với phần còn lại của kernel.' },

    { t: 'cal', kind: 'tip', title: 'Một phép so sánh: plugin của trình duyệt, nhưng không có hộp cát', x:
      'Hãy hình dung kernel như một chương trình lớn đang chạy, và module như một plugin nó nạp lúc ' +
      'chạy — giống <code>dlopen()</code> nạp một <code>.so</code> ở Bài 17. Hai khác biệt quan ' +
      'trọng: (1) không có trình liên kết động nào ở userspace làm việc này — <b>chính kernel</b> đọc ' +
      'file ELF, cấp bộ nhớ, sửa địa chỉ (relocation) và gọi hàm khởi tạo; (2) không có hộp cát ' +
      '(sandbox) nào cả. Một plugin trình duyệt lỗi thì tab đó chết; một module lỗi có thể làm chết ' +
      'cả máy. Bài 51 sẽ cho bạn thấy điều thứ hai bằng một con trỏ sai.' },

    { t: 'table',
      head: ['', 'Chương trình userspace (Bài 14–24)', 'Kernel module (từ bài này)'],
      rows: [
        ['Điểm vào', '<code>main()</code>, chạy một lần từ đầu tới cuối', '<code>module_init</code> khi nạp, <code>module_exit</code> khi gỡ — ở giữa, module <b>không chạy</b> gì cả trừ khi được gọi'],
        ['Định dạng file', 'ELF <code>EXEC</code> hoặc <code>DYN</code> (PIE)', 'ELF <code>REL</code> — chưa liên kết xong, giống một file <code>.o</code> (Bài 18)'],
        ['Ai nạp nó', '<code>execve()</code> + <code>ld-linux</code> (Bài 17)', 'Chính kernel, qua syscall <code>finit_module()</code> / <code>init_module()</code>'],
        ['Thư viện', 'glibc: <code>printf</code>, <code>malloc</code>…', 'Không có libc. Chỉ những hàm kernel <b>export</b>: <code>_printk</code>, <code>kmalloc</code>… (Bài 51)'],
        ['In ra', '<code>stdout</code> của terminal', 'Bộ đệm log của kernel — đọc bằng <code>dmesg</code>'],
        ['Khi lỗi', 'Tiến trình bị giết, hệ thống vẫn chạy', 'Oops hoặc panic — có thể mất cả máy'],
        ['Phải khớp với', 'Kiến trúc CPU và ABI (Bài 26)', 'Kiến trúc <b>và</b> đúng phiên bản, đúng cấu hình của kernel sẽ nạp nó']
      ] },

    { t: 'p', x:
      'Dòng cuối của bảng là lý do bài này dùng cây <code>~/bai38/linux-6.18.45</code> bạn build ở ' +
      'Bài 40, chứ không phải header của WSL. Module không được dịch \"cho Linux\"; nó được dịch ' +
      '<b>cho một kernel cụ thể</b>. Kernel đó đang chạy trong QEMU, không phải trên WSL.' },

    { t: 'cal', kind: 'why', title: 'Vì sao người làm nhúng cần module, dù sản phẩm thường tắt chúng', x:
      '<p>Bài 37 và 41 đã nói cấu hình nhúng hay chọn <code>=y</code> và có khi tắt hẳn ' +
      '<code>CONFIG_MODULES</code>: danh sách phần cứng cố định, không cần một tủ driver dự phòng. ' +
      'Vậy tại sao cả Chặng 10 lại viết module?</p>' +
      '<p>Vì vòng lặp phát triển. Driver viết dưới dạng module thì mỗi lần sửa chỉ mất: build ' +
      '<b>1,5 giây</b> (bạn sẽ đo ở bước 1), chép một file 100 KB, <code>rmmod</code>, ' +
      '<code>insmod</code>. Viết thẳng vào kernel thì mỗi lần sửa phải relink <code>Image</code> ' +
      '(<b>36 giây</b> cho một lần <code>touch</code> ở Bài 40), chép lại một <code>Image</code> hơn ' +
      '<b>40 MB</b> và boot lại bo ' +
      'mạch. Khi driver đã ổn định, cùng một mã nguồn đổi sang <code>=y</code> chỉ bằng một dòng ' +
      'Kconfig — mã không phải sửa gì, như phần sau của bài sẽ giải thích.</p>' },

    { t: 'p', x:
      'Con số 36 giây ở trên là của Bài 40, đo trên máy viết bài lúc đó; con số 1,5 giây bạn sẽ tự ' +
      'đo. Chênh lệch khoảng <b>24 lần</b> — và đó mới chỉ là phần build, chưa kể thời gian boot lại.' },

    /* ============================================================
       2. GIẢI PHẪU hello.c
       ============================================================ */
    { t: 'h2', x: 'Giải phẫu một module 28 dòng' },

    { t: 'p', x:
      'Đây là toàn bộ module bạn sẽ viết ở bước 1. Hãy đọc nó một lượt trước; bảng ngay sau đó giải ' +
      'thích từng phần.' },

    { t: 'code', where: 'file', name: '~/bai50/hello/hello.c', lang: 'c', nocopy: true, code:
      '// SPDX-License-Identifier: GPL-2.0\n' +
      '/*\n' +
      ' * hello.c - a minimal loadable kernel module.\n' +
      ' * Prints one line when loaded and one line when unloaded.\n' +
      ' */\n' +
      '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
      '\n' +
      '#include <linux/init.h>\n' +
      '#include <linux/module.h>\n' +
      '#include <linux/sched.h>\n' +
      '\n' +
      'static int __init hello_init(void)\n' +
      '{\n' +
      '\tpr_info("init called by %s (pid %d)\\n", current->comm, current->pid);\n' +
      '\treturn 0;\n' +
      '}\n' +
      '\n' +
      'static void __exit hello_exit(void)\n' +
      '{\n' +
      '\tpr_info("exit called by %s (pid %d)\\n", current->comm, current->pid);\n' +
      '}\n' +
      '\n' +
      'module_init(hello_init);\n' +
      'module_exit(hello_exit);\n' +
      '\n' +
      'MODULE_LICENSE("GPL");\n' +
      'MODULE_AUTHOR("Embedded Linux course");\n' +
      'MODULE_DESCRIPTION("First loadable module: prints on load and unload");' },

    { t: 'table',
      head: ['Dòng', 'Làm gì', 'Vì sao phải có'],
      rows: [
        ['<code>#include &lt;linux/…&gt;</code>',
         'Header của <b>kernel</b>, lấy từ cây <code>~/bai38/linux-6.18.45/include</code> — không phải <code>/usr/include</code>.',
         'Không có <code>stdio.h</code> ở đây: kernel không dùng libc. <code>init.h</code> cho <code>__init</code>/<code>__exit</code>, <code>module.h</code> cho <code>module_init</code> và các <code>MODULE_*</code>, <code>sched.h</code> cho <code>current</code>.'],
        ['<code>static int __init hello_init(void)</code>',
         'Hàm khởi tạo. Kernel gọi nó <b>một lần</b>, ngay sau khi nạp xong module.',
         'Trả về <code>0</code> = thành công, module ở lại. Trả về số âm (<code>-ENODEV</code>, <code>-ENOMEM</code>…) = thất bại, kernel gỡ module ngay và báo lỗi cho <code>insmod</code>. Bước 5 thử điều này.'],
        ['<code>__init</code>',
         'Đặt hàm vào section <code>.init.text</code> (<code>include/linux/init.h:45</code>).',
         'Hàm khởi tạo chỉ chạy một lần, nên sau khi nó chạy xong kernel <b>giải phóng</b> luôn vùng nhớ chứa nó. Bước 4 sẽ cho bạn thấy <code>hello_init</code> biến mất khỏi bảng ký hiệu của kernel.'],
        ['<code>static void __exit hello_exit(void)</code>',
         'Hàm dọn dẹp, section <code>.exit.text</code> (<code>init.h:79</code>). Kernel gọi nó khi <code>rmmod</code>.',
         'Mọi thứ <code>init</code> đã xin (bộ nhớ, thiết bị, ngắt — các bài sau) phải được trả lại ở đây. Không có <code>module_exit</code> thì module <b>không gỡ được</b>.'],
        ['<code>module_init(hello_init);</code><br><code>module_exit(hello_exit);</code>',
         'Khai báo cho kernel biết hàm nào là hàm khởi tạo, hàm nào là hàm dọn dẹp.',
         'Tên <code>hello_init</code> không có gì đặc biệt — bạn đặt tên gì cũng được. Hai macro này mới là thứ nối tên đó với kernel (xem ngay dưới).'],
        ['<code>current-&gt;comm</code>, <code>current-&gt;pid</code>',
         '<code>current</code> là con trỏ tới <code>task_struct</code> của tiến trình đang chạy mã này.',
         'Mã module không có tiến trình riêng: nó chạy <b>nhờ</b> tiến trình đã gọi vào kernel. Dòng log sẽ cho bạn biết đó là <code>insmod</code> lúc nạp và <code>rmmod</code> lúc gỡ.'],
        ['<code>pr_info(…)</code>',
         'Ghi một dòng vào bộ đệm log của kernel ở mức <code>KERN_INFO</code>. Là macro bọc <code>printk</code>.',
         'Không có <code>printf</code> trong kernel. Mức log và cách lọc là việc của Bài 51; ở đây chỉ cần biết dòng này hiện trong <code>dmesg</code>.'],
        ['<code>#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt</code>',
         'Mọi <code>pr_*</code> trong file tự động được thêm tiền tố <code>tên_module: </code>.',
         '<code>KBUILD_MODNAME</code> do Kbuild truyền vào bằng <code>-D</code>, lấy từ <b>tên file</b>. Bước 5 dịch cùng mã nguồn thành module tên khác và tiền tố đổi theo, không sửa một chữ.'],
        ['<code>MODULE_LICENSE("GPL")</code>',
         'Ghi chuỗi <code>license=GPL</code> vào section <code>.modinfo</code> của file <code>.ko</code>.',
         '<b>Bắt buộc.</b> Thiếu dòng này, bước build <code>modpost</code> báo <code>ERROR</code> và không tạo <code>.ko</code>. Giấy phép không tương thích GPL thì module vẫn nạp được nhưng đánh dấu kernel là <code>P</code> (độc quyền) và không được dùng các hàm kernel chỉ export cho GPL. Bước 3 và 5 thử cả hai.'],
        ['<code>MODULE_AUTHOR</code>, <code>MODULE_DESCRIPTION</code>',
         'Thêm hai chuỗi nữa vào <code>.modinfo</code>.',
         'Không bắt buộc, nhưng là thứ <code>modinfo</code> in ra cho người dùng module của bạn. Bước 2 đọc chúng.'],
        ['<code>// SPDX-License-Identifier: GPL-2.0</code>',
         'Dòng khai báo giấy phép theo chuẩn SPDX, cho con người và công cụ quét giấy phép.',
         'Kernel không đọc dòng này — <code>MODULE_LICENSE</code> mới là thứ kernel kiểm tra. Mọi file trong cây kernel đều mở đầu như vậy, và driver gửi lên upstream cũng phải có.']
      ] },

    { t: 'h3', x: 'module_init thật ra làm gì' },

    { t: 'p', x:
      'Kernel không biết hàm nào của bạn tên là <code>hello_init</code>. Nó chỉ tìm một ký hiệu có tên ' +
      'cố định: <code>init_module</code>. Macro <code>module_init</code> tạo ra đúng cái tên đó, dưới ' +
      'dạng một <b>bí danh</b> (alias) của hàm bạn đặt tên. Đây là định nghĩa, trong ' +
      '<code>include/linux/module.h</code>, nhánh dùng khi file được dịch thành module:' },

    { t: 'code', where: 'file', name: 'include/linux/module.h:130–144 (6.18.45)', lang: 'c', nocopy: true, code:
      '/* Each module must use one module_init(). */\n' +
      '#define module_init(initfn)\t\t\t\t\t\\\n' +
      '\tstatic inline initcall_t __maybe_unused __inittest(void)\t\t\\\n' +
      '\t{ return initfn; }\t\t\t\t\t\\\n' +
      '\tint init_module(void) __copy(initfn)\t\t\t\\\n' +
      '\t\t__attribute__((alias(#initfn)));\t\t\\\n' +
      '\t___ADDRESSABLE(init_module, __initdata);\n' +
      '\n' +
      '/* This is only required if you want to be unloadable. */\n' +
      '#define module_exit(exitfn)\t\t\t\t\t\\\n' +
      '\tstatic inline exitcall_t __maybe_unused __exittest(void)\t\t\\\n' +
      '\t{ return exitfn; }\t\t\t\t\t\\\n' +
      '\tvoid cleanup_module(void) __copy(exitfn)\t\t\\\n' +
      '\t\t__attribute__((alias(#exitfn)));\t\t\\\n' +
      '\t___ADDRESSABLE(cleanup_module, __exitdata);',
      notes: [
        '<code>__inittest</code> không bao giờ được gọi. Nó chỉ tồn tại để trình biên dịch <b>kiểm tra kiểu</b>: nếu <code>hello_init</code> không có dạng <code>int f(void)</code>, dòng <code>return initfn;</code> sẽ lỗi ngay lúc dịch.',
        '<code>alias(#initfn)</code> nói với trình biên dịch: \"<code>init_module</code> là một cái tên khác cho cùng địa chỉ với <code>hello_init</code>\". Bước 2 sẽ thấy cả hai tên ở cùng offset <code>0</code> trong <code>nm</code>.',
        'Chú thích \"only required if you want to be unloadable\" là nguyên văn: bỏ <code>module_exit</code> thì module vẫn nạp được, nhưng <code>rmmod</code> sẽ từ chối gỡ nó.',
        'Khi cùng file này được dịch với <code>=y</code> (vào thẳng kernel), nhánh khác của <code>module.h</code> (dòng 89) biến <code>module_init(x)</code> thành <code>__initcall(x)</code> — hàm được gọi lúc boot. Đó là lý do một driver chuyển giữa <code>=m</code> và <code>=y</code> mà không sửa mã.'
      ] },

    /* ============================================================
       3. BUILD NGOÀI CÂY
       ============================================================ */
    { t: 'h2', x: 'Build ngoài cây: mượn hệ thống build của kernel' },

    { t: 'p', x:
      'Bạn không thể dịch <code>hello.c</code> bằng một lệnh <code>gcc</code> như Bài 15. Thử ngay ' +
      'thì thấy: <code>aarch64-linux-gnu-gcc -c hello.c</code> dừng ở dòng 8 với ' +
      '<code>fatal error: linux/init.h: No such file or directory</code>, vì trình biên dịch tìm ' +
      'header trong sysroot userspace. Và kể cả khi chỉ đúng đường dẫn header, bạn vẫn thiếu cả ' +
      'trăm cờ khác. Trên máy viết bài, dòng lệnh <code>gcc</code> thật mà Kbuild dùng cho ' +
      '<code>hello.o</code> có <b>95</b> tham số bắt đầu bằng <code>-</code>, trong đó có:' },

    { t: 'table',
      head: ['Cờ', 'Vì sao module cần nó'],
      rows: [
        ['<code>-nostdinc</code>', 'Không tìm trong <code>/usr/include</code>. Mọi header phải đến từ cây kernel.'],
        ['<code>-D__KERNEL__</code>', 'Header dùng chung giữa kernel và userspace chọn nhánh kernel.'],
        ['<code>-DMODULE</code>', 'Chọn nhánh <code>module_init</code> → <code>init_module</code> bạn vừa đọc, thay vì nhánh <code>__initcall</code>.'],
        ['<code>-DKBUILD_MODNAME=\'"hello"\'</code>', 'Tên module, lấy từ tên file. Chính là thứ <code>pr_fmt</code> dùng.'],
        ['<code>-mgeneral-regs-only</code>', 'Cấm dùng thanh ghi dấu phẩy động/SIMD của ARM64. Kernel không lưu chúng khi chuyển ngữ cảnh — vì sao thì Bài 51 giải thích.'],
        ['<code>-include …</code>', 'Tự động chèn header cấu hình, trong đó có <code>autoconf.h</code> Bài 39 đã mổ xẻ — nên <code>#ifdef CONFIG_…</code> trong module nhìn thấy đúng <code>.config</code> của kernel.']
      ] },

    { t: 'p', x:
      'Không ai gõ tay 95 cờ đó. Thay vào đó, bạn nhờ chính Makefile của kernel build hộ. ' +
      'Cách làm chính thức (trong <code>Documentation/kbuild/modules.rst</code>) là:' },

    { t: 'code', where: 'file', name: 'mẫu lệnh, không chạy', nocopy: true, code:
      'make -C <cây_kernel> M=<thư_mục_module> modules' },

    { t: 'cmdx', cmd: 'make -C <cây_kernel> M=<thư_mục_module> ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules',
      title: 'Bốn thứ phải đúng khi build một module ngoài cây',
      rows: [
        ['<code>-C &lt;cây_kernel&gt;</code>', 'Chuyển vào cây kernel trước khi đọc Makefile (Bài 16).', 'Makefile ở gốc cây kernel nắm mọi quy tắc và mọi cờ. Cây phải là cây <b>đã build</b> của đúng kernel sẽ nạp module — nó chứa <code>.config</code>, <code>include/generated/</code> và <code>Module.symvers</code>.'],
        ['<code>M=&lt;thư_mục_module&gt;</code>', 'Báo cho Kbuild: \"đây là một module bên ngoài, nằm ở thư mục này\".', 'Makefile kernel dòng 133 kiểm tra <code>M</code> có đến từ dòng lệnh không. Có <code>M</code>, Kbuild chỉ build thư mục đó; không có, nó build cả kernel. Phải là đường dẫn tuyệt đối — Makefile mẫu dùng <code>$(CURDIR)</code>.'],
        ['<code>ARCH=arm64</code>', 'Chọn <code>arch/arm64/Makefile</code> — nơi thêm các cờ riêng của ARM64.', 'Quên nó, Kbuild dùng kiến trúc của máy đang chạy (x86) và thêm <code>-mcmodel=kernel</code>, <code>-mno-sse</code>… mà <code>aarch64-linux-gnu-gcc</code> không hiểu. Bảng Lỗi thường gặp có thông báo thật.'],
        ['<code>CROSS_COMPILE=aarch64-linux-gnu-</code>', 'Tiền tố cho <code>gcc</code>, <code>ld</code>, <code>objcopy</code>… (Bài 26).', 'Quên nó, Kbuild gọi <code>gcc</code> của x86 với cờ ARM64 và báo <code>the compiler differs from the one used to build the kernel</code>.'],
        ['<code>modules</code>', 'Đích (target) cần build.', 'Với <code>M=</code>, đây cũng là đích mặc định. <code>clean</code> xoá sản phẩm trong thư mục module mà không chạm vào cây kernel.']
      ] },

    { t: 'p', x:
      'Còn một mảnh nữa: làm sao Kbuild biết thư mục của bạn có module nào? Nó đọc một biến ' +
      'duy nhất trong Makefile của bạn: <code>obj-m</code>. Bài 39 đã cho bạn thấy biến này trong ' +
      'cây kernel — <code>obj-$(CONFIG_BTRFS_FS) += btrfs.o</code> trở thành ' +
      '<code>obj-m</code> khi Btrfs là <code>=m</code>. Makefile của bạn viết thẳng giá trị đó ra:' },

    { t: 'code', where: 'file', name: '~/bai50/hello/Makefile', lang: 'makefile', nocopy: true, code:
      'obj-m := hello.o\n' +
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
        'File này được đọc <b>hai lần</b>, bởi hai lần gọi <code>make</code> khác nhau. Lần 1: bạn gõ <code>make</code> trong <code>~/bai50/hello</code> → chạy đích <code>all</code> → gọi <code>make -C</code> vào cây kernel. Lần 2: Makefile của kernel quay lại đọc thư mục <code>M=</code> để lấy <code>obj-m</code>. Dòng <code>obj-m</code> chỉ có nghĩa với lần 2; đích <code>all</code> chỉ có nghĩa với lần 1.',
        '<code>obj-m := hello.o</code> nghĩa là \"build <code>hello.ko</code> từ <code>hello.c</code>\". Bạn viết <code>.o</code>, Kbuild tự suy ra tên nguồn và tên <code>.ko</code>. Nhiều module trong một thư mục thì liệt kê cách nhau bằng dấu cách — bước 3 làm vậy.',
        '<code>?=</code> nghĩa là \"chỉ gán nếu chưa có giá trị\" (Bài 16). Nhờ vậy <code>make KDIR=/đường/khác</code> vẫn ghi đè được, không phải sửa file.',
        'Dòng bắt đầu bằng <code>$(MAKE)</code> phải thụt vào bằng <b>một ký tự Tab</b>, không phải dấu cách — luật cũ của <code>make</code> từ Bài 16. Nếu bạn chép từ trình duyệt mà lệnh báo <code>missing separator</code>, đó là lý do.'
      ] },

    { t: 'cal', kind: 'warn', title: 'Header của WSL không dùng được cho kernel QEMU', x:
      'Mọi hướng dẫn trên mạng viết <code>make -C /lib/modules/$(uname -r)/build M=$PWD</code>. Trên ' +
      'một máy Linux bình thường, lệnh đó build module cho <b>chính kernel đang chạy</b>. Ở đây, ' +
      '<code>uname -r</code> trong WSL in <code>5.15.167.4-microsoft-standard-WSL2</code> — kernel ' +
      'của Microsoft, kiến trúc x86-64, không phải kernel bạn sẽ nạp module vào. Module build theo ' +
      'kiểu đó sẽ bị kernel QEMU từ chối (bước 5 cho thấy vì sao). Đó là lý do Makefile ở trên ' +
      'dùng <code>KDIR</code> trỏ vào cây bạn tự build, và đó cũng là cách làm chuẩn trong nghề ' +
      'nhúng: module luôn được dịch chéo trên máy host theo cây kernel của sản phẩm.' },

    /* ============================================================
       4. VÒNG ĐỜI
       ============================================================ */
    { t: 'h2', x: 'Vòng đời của một module: từ insmod tới rmmod' },

    { t: 'p', x:
      '<code>insmod hello.ko</code> không \"chạy\" module theo nghĩa chạy một chương trình. Nó chỉ mở ' +
      'file và gọi một syscall. Mọi việc còn lại do kernel làm, trong ngữ cảnh của tiến trình ' +
      '<code>insmod</code> — đó là lý do dòng log của bạn in ra <code>insmod</code> khi hỏi ' +
      '<code>current-&gt;comm</code>. Sơ đồ dưới đây là toàn bộ vòng đời:' },

    { t: 'fig',
      cap: 'Module chỉ \"chạy\" ở hai khoảnh khắc: khi kernel gọi <code>init</code> (trong ngữ cảnh ' +
           '<code>insmod</code>) và khi gọi <code>exit</code> (trong ngữ cảnh <code>rmmod</code>). ' +
           'Mọi kiểm tra — định dạng ELF, <code>vermagic</code>, giấy phép, ký hiệu còn thiếu — xảy ' +
           'ra <b>trước</b> khi một dòng mã nào của bạn được thực thi. Nếu <code>init</code> trả về ' +
           'lỗi, module bị gỡ ngay và không bao giờ vào trạng thái Live.',
      svg:
        '<svg viewBox="0 0 720 390" width="720" role="img" aria-label="Vòng đời module: insmod gọi finit_module; kernel đọc ELF, kiểm tra vermagic và giấy phép, cấp bộ nhớ, sửa địa chỉ, gọi init; init trả về 0 thì module thành Live và vùng init được giải phóng, trả về lỗi thì module bị gỡ; rmmod gọi delete_module, kernel gọi exit rồi giải phóng module">' +
        '<rect class="d-box" x="20" y="20" width="150" height="50" rx="6"/>' +
        '<text class="d-t" x="95" y="42" text-anchor="middle">insmod hello.ko</text>' +
        '<text class="d-ts" x="95" y="60" text-anchor="middle">userspace</text>' +
        '<line class="d-line" x1="170" y1="45" x2="222" y2="45"/>' +
        '<path class="d-arrow" d="M 230 45 l -9 -4 l 0 8 z"/>' +
        '<text class="d-tm" x="176" y="36">finit_module()</text>' +
        '<rect class="d-box-p" x="230" y="14" width="470" height="176" rx="6"/>' +
        '<text class="d-t" x="246" y="38">Kernel — mọi thứ trong khung này chạy nhân danh insmod</text>' +
        '<text class="d-ts" x="246" y="62">1. Đọc file ELF REL, kiểm tra kiến trúc và các section</text>' +
        '<text class="d-ts" x="246" y="82">2. So vermagic với kernel đang chạy — sai → ENOEXEC</text>' +
        '<text class="d-ts" x="246" y="102">3. Đọc license — không phải GPL → đánh dấu taint P</text>' +
        '<text class="d-ts" x="246" y="122">4. Trùng tên với module đang Live → EEXIST</text>' +
        '<text class="d-ts" x="246" y="142">5. Cấp bộ nhớ, chép section, sửa địa chỉ (relocation), tìm _printk</text>' +
        '<text class="d-ts" x="246" y="162">6. Gọi init_module() = hello_init()</text>' +
        '<text class="d-tm" x="246" y="180">kernel/module/main.c:3358 load_module() → :3516 do_init_module()</text>' +
        '<line class="d-line" x1="330" y1="190" x2="200" y2="232"/>' +
        '<path class="d-arrow" d="M 192 236 l 9 -1 l -4 -7 z"/>' +
        '<line class="d-line" x1="600" y1="190" x2="600" y2="228"/>' +
        '<path class="d-arrow" d="M 600 236 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-g" x="20" y="236" width="340" height="68" rx="6"/>' +
        '<text class="d-t" x="36" y="260">init trả về 0 → MODULE_STATE_LIVE</text>' +
        '<text class="d-ts" x="36" y="280">.init.text được giải phóng; module nằm trong lsmod,</text>' +
        '<text class="d-ts" x="36" y="296">/proc/modules, /sys/module/hello — và ngồi yên</text>' +
        '<rect class="d-box-w" x="420" y="236" width="280" height="68" rx="6"/>' +
        '<text class="d-t" x="436" y="260">init trả về số âm</text>' +
        '<text class="d-ts" x="436" y="280">kernel gỡ module ngay, insmod nhận</text>' +
        '<text class="d-ts" x="436" y="296">đúng mã lỗi đó (ví dụ -ENODEV)</text>' +
        '<line class="d-line" x1="190" y1="304" x2="190" y2="324"/>' +
        '<path class="d-arrow" d="M 190 332 l -4 -8 l 8 0 z"/>' +
        '<rect class="d-box-a" x="20" y="332" width="680" height="46" rx="6"/>' +
        '<text class="d-t" x="36" y="352">rmmod hello → delete_module() → cleanup_module() = hello_exit()</text>' +
        '<text class="d-ts" x="36" y="370">rồi kernel giải phóng toàn bộ bộ nhớ của module. Không có exit → module [permanent], rmmod báo EBUSY.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hai điểm trong sơ đồ đáng nhớ hơn mọi chi tiết khác, vì chúng là nền của cả Chặng 10:' },

    { t: 'list', ordered: true, items: [
      '<b>Mọi kiểm tra đều xảy ra trước khi mã của bạn chạy.</b> Khi <code>insmod</code> báo lỗi, ' +
        'câu hỏi đầu tiên luôn là: <code>dmesg</code> có dòng do <code>init</code> của bạn in ra không? ' +
        'Không có → kernel từ chối từ bước 1–5, lỗi nằm ở cách build. Có → kernel đã chạy mã của ' +
        'bạn, lỗi nằm ở logic trong <code>init</code>. Bước 5 cho bạn thấy cả hai loại.',
      '<b><code>init</code> và <code>exit</code> là một cặp đối xứng.</b> Thứ gì <code>init</code> xin ' +
        'thì <code>exit</code> trả, theo thứ tự ngược lại. Nếu <code>init</code> thất bại giữa chừng, ' +
        'nó phải tự trả những gì đã xin trước khi trả về lỗi — vì <code>exit</code> sẽ <b>không</b> ' +
        'được gọi cho một module chưa từng Live. Module hôm nay chưa xin gì nên chưa thấy rõ; từ Bài ' +
        '52 trở đi, quên điều này là nguồn rò rỉ tài nguyên số một, và Bài 54 sẽ giới thiệu ' +
        '<code>devm_*</code> để kernel tự trả hộ.'
    ] },

    { t: 'h3', x: 'Năm công cụ, năm câu hỏi' },

    { t: 'table',
      head: ['Lệnh', 'Trả lời câu hỏi', 'Nó đọc/gọi gì'],
      rows: [
        ['<code>modinfo FILE.ko</code>', 'File này là module gì, cho kernel nào, giấy phép gì?', 'Đọc section <code>.modinfo</code> trong file — không cần kernel, chạy được ngay trên WSL.'],
        ['<code>insmod FILE.ko</code>', 'Nạp đúng file này.', 'Syscall <code>finit_module()</code> (nếu kernel hỗ trợ) hoặc <code>init_module()</code>. Không tự tìm module phụ thuộc.'],
        ['<code>lsmod</code>', 'Module nào đang nạp, bao lớn, ai đang dùng?', 'Chỉ định dạng lại <code>/proc/modules</code> cho dễ đọc.'],
        ['<code>rmmod TÊN</code>', 'Gỡ module này.', 'Syscall <code>delete_module()</code>. Nhận <b>tên</b> module, không phải tên file.'],
        ['<code>dmesg</code>', 'Kernel đã nói gì?', 'Đọc bộ đệm log của kernel — nơi <code>pr_info</code> của bạn ghi vào.']
      ] },

    { t: 'p', x:
      'Bài 37 đã dùng <code>lsmod</code> trên WSL, và Bài 48 đã dùng <code>insmod</code> trong QEMU. ' +
      'Công cụ thứ sáu trong họ này, <code>modprobe</code>, tự tìm và nạp cả chuỗi phụ thuộc qua ' +
      '<code>modules.dep</code>; với một module không phụ thuộc ai như <code>hello.ko</code>, ' +
      '<code>insmod</code> là đủ và cho bạn thấy rõ nhất từng bước.' },

    /* ============================================================
       5. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: viết, build, nạp, gỡ — rồi làm hỏng bốn lần' },

    { t: 'p', x:
      'Bạn làm việc trong <code>~/bai50</code>. Bạn cần hai thứ từ các bài trước, cả hai đều phải ' +
      'còn nguyên: cây kernel <b>đã build</b> <code>~/bai38/linux-6.18.45</code> (Bài 40) và thư mục ' +
      '<code>~/bai32/initramfs</code> (Bài 32) — một BusyBox tĩnh có sẵn <code>insmod</code>, ' +
      '<code>lsmod</code>, <code>rmmod</code>. Bước 1–3 chạy trên WSL; bước 4–5 chạy trong QEMU.' },

    { t: 'cal', kind: 'warn', title: 'Module chỉ nạp được vào đúng kernel đã build nó', x:
      'Nếu bạn đã build lại cây <code>~/bai38/linux-6.18.45</code> với <code>.config</code> khác, ' +
      'hoặc boot một <code>Image</code> khác, module build ở bước 1 có thể bị từ chối. Bước 1 và bước 4 ' +
      'luôn phải dùng <b>cùng một cây</b>: <code>Image</code> nằm trong chính cây mà Makefile trỏ ' +
      '<code>KDIR</code> vào.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Viết module và Makefile, build lần đầu',
        blocks: [
          { t: 'p', x:
            'Tạo thư mục cho module. Mỗi module (hay mỗi nhóm module liên quan) nên có thư mục riêng, ' +
            'vì Kbuild sẽ rải khoảng hai chục file trung gian vào đó.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai50/hello && cd ~/bai50/hello' },

          { t: 'p', x:
            'Tạo <code>hello.c</code> với đúng nội dung bạn đã đọc ở phần giải phẫu (dùng ' +
            '<code>nano hello.c</code> như Bài 7, hoặc dán nguyên khối):' },

          { t: 'code', where: 'file', name: '~/bai50/hello/hello.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * hello.c - a minimal loadable kernel module.\n' +
            ' * Prints one line when loaded and one line when unloaded.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/sched.h>\n' +
            '\n' +
            'static int __init hello_init(void)\n' +
            '{\n' +
            '\tpr_info("init called by %s (pid %d)\\n", current->comm, current->pid);\n' +
            '\treturn 0;\n' +
            '}\n' +
            '\n' +
            'static void __exit hello_exit(void)\n' +
            '{\n' +
            '\tpr_info("exit called by %s (pid %d)\\n", current->comm, current->pid);\n' +
            '}\n' +
            '\n' +
            'module_init(hello_init);\n' +
            'module_exit(hello_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("First loadable module: prints on load and unload");' },

          { t: 'p', x:
            'Rồi tạo <code>Makefile</code> cạnh nó. Nhớ: hai dòng bắt đầu bằng <code>$(MAKE)</code> ' +
            'phải thụt vào bằng phím <kbd>Tab</kbd>.' },

          { t: 'code', where: 'file', name: '~/bai50/hello/Makefile', lang: 'makefile', code:
            'obj-m := hello.o\n' +
            '\n' +
            'KDIR          ?= $(HOME)/bai38/linux-6.18.45\n' +
            'ARCH          ?= arm64\n' +
            'CROSS_COMPILE ?= aarch64-linux-gnu-\n' +
            '\n' +
            'all:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) modules\n' +
            '\n' +
            'clean:\n' +
            '\t$(MAKE) -C $(KDIR) M=$(CURDIR) ARCH=$(ARCH) CROSS_COMPILE=$(CROSS_COMPILE) clean' },

          { t: 'p', x:
            'Build, và đo thời gian để có con số so với 36 giây relink kernel của Bài 40:' },

          { t: 'code', where: 'wsl', code:
            'time make\n' +
            'ls' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai50/hello ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai50/hello\'\n' +
            '  CC [M]  hello.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  hello.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  hello.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai50/hello\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '\n' +
            'real\t0m1.490s\n' +
            'user\t0m0.938s\n' +
            'sys\t0m0.320s\n' +
            'hello.c   hello.mod    hello.mod.o  Makefile       Module.symvers\n' +
            'hello.ko  hello.mod.c  hello.o      modules.order' },

          { t: 'cmdx', cmd: 'make',
            title: 'Đọc năm dòng Kbuild in ra',
            rows: [
              ['<code>make -C … M=… modules</code>', 'Dòng đầu tiên là đích <code>all</code> trong Makefile của bạn đang chạy.', 'Mọi biến đã được thay: <code>KDIR</code> → đường dẫn thật, <code>$(CURDIR)</code> → <code>/home/…/bai50/hello</code>.'],
              ['<code>Entering directory …/linux-6.18.45</code>', '<code>-C</code> đã chuyển vào cây kernel.', 'Trên máy viết bài, <code>~/bai38</code> là symlink tới <code>~/embedded-course/bai38</code>, nên đường dẫn in ra khác một chút. Trên máy bạn nó sẽ là <code>/home/TÊN_BẠN/bai38/…</code>.'],
              ['<code>CC [M]  hello.o</code>', 'Dịch <code>hello.c</code> với 95 cờ của Kbuild. <code>[M]</code> = đang build cho một module.', 'Đây là dòng duy nhất có mã của bạn.'],
              ['<code>MODPOST Module.symvers</code>', 'Công cụ <code>scripts/mod/modpost</code> kiểm tra module: có <code>MODULE_LICENSE</code> không, mọi hàm gọi tới có được kernel export không.', 'Nó sinh ra <code>hello.mod.c</code> — phần \"giấy tờ\" của module. Bước 3 sẽ làm nó báo lỗi.'],
              ['<code>CC [M]  hello.mod.o</code>, <code>.module-common.o</code>', 'Dịch phần giấy tờ vừa sinh.', 'Chứa <code>struct module</code> và các chuỗi như <code>vermagic</code>.'],
              ['<code>LD [M]  hello.ko</code>', 'Gộp các <code>.o</code> thành một file <code>.ko</code>.', 'Chỉ gộp (<code>ld -r</code>), <b>không</b> liên kết xong — địa chỉ cuối cùng do kernel quyết định lúc nạp.']
            ]},

          { t: 'p', x:
            'Build xong trong <b>1,49 giây</b> — khoảng <b>24 lần</b> nhanh hơn một lần relink ' +
            '<code>Image</code> sau một <code>touch</code> ở Bài 40. <code>real</code> sẽ khác trên máy ' +
            'bạn tuỳ tải CPU, nhưng bậc độ lớn thì không. <code>ls</code> cho thấy một file C sinh ra ' +
            '<b>chín</b> file; thứ bạn cần mang đi chỉ có <code>hello.ko</code>. Chạy <code>ls -a</code> ' +
            'sẽ thấy thêm hàng chục file <code>.*.cmd</code> — mỗi file ghi lại dòng lệnh đã dùng, để ' +
            'lần <code>make</code> sau biết có cần build lại không.' },

          { t: 'p', x:
            'Chạy <code>make</code> thêm một lần nữa, không sửa gì:' },

          { t: 'code', where: 'wsl', code:
            'make' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai50/hello ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai50/hello\'\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai50/hello\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'' },

          { t: 'p', x:
            'Không có dòng <code>CC</code> hay <code>LD</code> nào: Kbuild thấy <code>hello.ko</code> mới ' +
            'hơn <code>hello.c</code> và dòng lệnh không đổi, nên không làm gì. Cây kernel cũng ' +
            '<b>không</b> bị build lại — build ngoài cây chỉ đọc cây kernel, không ghi vào nó.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Mổ xẻ hello.ko ngay trên WSL',
        blocks: [
          { t: 'p', x:
            'Trước khi nạp vào đâu, hãy xem mình vừa tạo ra cái gì. <code>file</code> trả lời câu hỏi ' +
            'đầu tiên: đây là loại file ELF nào, cho kiến trúc nào?' },

          { t: 'code', where: 'wsl', code:
            'file hello.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello.ko: ELF 64-bit LSB relocatable, ARM aarch64, version 1 (SYSV), BuildID[sha1]=3e398415c21ebbbd7e50e0f7f0e602d393f3b76c, with debug_info, not stripped' },

          { t: 'p', x:
            'Ba chữ quan trọng: <code>relocatable</code> — đúng loại <code>REL</code> như một file ' +
            '<code>.o</code> ở Bài 18, chưa có địa chỉ cố định nào; <code>ARM aarch64</code> — dịch ' +
            'chéo đúng; <code>with debug_info</code> — còn thông tin gỡ lỗi. BuildID sẽ khác trên máy ' +
            'bạn. So với <code>temp_daemon</code> ở Bài 49 (<code>executable</code>), đây là khác biệt ' +
            'hình thức rõ nhất giữa một chương trình và một module.' },

          { t: 'p', x:
            'Tiếp theo, <code>modinfo</code> đọc phần \"giấy tờ\" của module. Nó chỉ đọc file, không cần ' +
            'kernel nào, nên chạy được ngay trên WSL dù module là ARM64:' },

          { t: 'code', where: 'wsl', code:
            'modinfo hello.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'filename:       /home/cah8hc/bai50/hello/hello.ko\n' +
            'description:    First loadable module: prints on load and unload\n' +
            'author:         Embedded Linux course\n' +
            'license:        GPL\n' +
            'depends:        \n' +
            'name:           hello\n' +
            'vermagic:       6.18.45-embedded SMP preempt mod_unload aarch64' },

          { t: 'table',
            head: ['Trường', 'Đến từ đâu', 'Kernel dùng nó để làm gì'],
            rows: [
              ['<code>description</code>, <code>author</code>', 'Hai dòng <code>MODULE_*</code> của bạn.', 'Không dùng. Chỉ để người đọc.'],
              ['<code>license</code>', '<code>MODULE_LICENSE("GPL")</code>', 'Quyết định có đánh dấu taint <code>P</code> không, và module có được gọi các hàm <code>EXPORT_SYMBOL_GPL</code> không.'],
              ['<code>depends</code>', '<code>modpost</code> điền vào (<code>hello.mod.c</code>).', 'Rỗng: <code>hello.ko</code> chỉ gọi hàm của kernel lõi, không cần module nào khác nạp trước.'],
              ['<code>name</code>', 'Tên file, qua <code>KBUILD_MODNAME</code>.', 'Tên dùng trong <code>lsmod</code>, <code>rmmod</code>, <code>/sys/module/</code>.'],
              ['<code>vermagic</code>', '<code>include/linux/vermagic.h</code>, ghép từ phiên bản và cấu hình của <b>cây kernel đã build module</b>.', 'So từng ký tự với kernel đang chạy. Khác → từ chối nạp. Bước 5 thử điều này.']
            ] },

          { t: 'p', x:
            'Hãy nhìn kỹ <code>vermagic</code>. <code>6.18.45-embedded</code> là phiên bản kèm ' +
            '<code>LOCALVERSION</code> bạn đặt ở Bài 40. <code>SMP</code>, <code>preempt</code>, ' +
            '<code>mod_unload</code> là ba tuỳ chọn cấu hình làm thay đổi cách module phải được dịch ' +
            '(<code>CONFIG_SMP</code>, <code>CONFIG_PREEMPT</code>, <code>CONFIG_MODULE_UNLOAD</code>). ' +
            '<code>aarch64</code> là kiến trúc. Chuỗi này là cách kernel hỏi một câu duy nhất lúc nạp: ' +
            '\"mày có được dịch cho tao không?\". Còn trên WSL, <code>uname -r</code> in ' +
            '<code>5.15.167.4-microsoft-standard-WSL2</code> — không trùng một ký tự nào ở phần đầu, ' +
            'nên dù có nạp được vào WSL, module này cũng bị từ chối ngay.' },

          { t: 'cal', kind: 'tip', title: 'Không cần nhớ trường nào — hỏi file', x:
            'Muốn đúng một trường, dùng <code>-F</code>: <code>modinfo -F vermagic hello.ko</code> in ' +
            'đúng một dòng <code>6.18.45-embedded SMP preempt mod_unload aarch64</code>. Đây là lệnh ' +
            'đầu tiên cần chạy mỗi khi một module \"không chịu nạp\": so dòng này với ' +
            '<code>uname -r</code> trên máy đích.' },

          { t: 'p', x:
            'Giờ đến kích thước. File nặng bao nhiêu, và bao nhiêu trong đó là mã thật?' },

          { t: 'code', where: 'wsl', code:
            'ls -l hello.ko\n' +
            'aarch64-linux-gnu-size hello.ko\n' +
            'aarch64-linux-gnu-strip --strip-debug -o hello-nodebug.ko hello.ko\n' +
            'ls -l hello-nodebug.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 104728 Sep 29 14:21 hello.ko\n' +
            '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
            '    472\t   1108\t      0\t   1580\t    62c\thello.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 5544 Sep 29 14:21 hello-nodebug.ko' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-strip --strip-debug -o hello-nodebug.ko hello.ko',
            title: 'Bỏ debug info nhưng giữ mọi thứ kernel cần',
            rows: [
              ['<code>aarch64-linux-gnu-size</code>', 'In kích thước các phần sẽ nạp vào bộ nhớ (Bài 18).', 'Phải dùng bản có tiền tố — <code>size</code> của x86 đọc được ELF ARM64 nhưng quy tắc Bài 26 vẫn là luôn dùng đúng tiền tố.'],
              ['<code>--strip-debug</code>', 'Chỉ bỏ các section <code>.debug_*</code>.', '<b>Không</b> dùng <code>strip</code> trần trên một <code>.ko</code>: nó xoá cả bảng ký hiệu, và kernel cần bảng đó để sửa địa chỉ lúc nạp. Bài 40 đã dùng đúng cờ này qua <code>INSTALL_MOD_STRIP=1</code>.'],
              ['<code>-o hello-nodebug.ko hello.ko</code>', 'Ghi kết quả ra file mới, giữ nguyên file gốc.', 'Bản có debug info vẫn cần cho <code>gdb</code> ở Chặng 12.']
            ]},

          { t: 'p', x:
            'Bốn con số, bốn tầng của cùng một module. <b>104 728</b> byte trên đĩa. <b>5 544</b> byte ' +
            'sau khi bỏ debug info — nghĩa là <b>95 %</b> của file là thông tin gỡ lỗi, giống tỉ lệ ' +
            '<code>vmlinux</code>/<code>Image</code> ở Bài 40. <b>1 580</b> byte là tổng các phần sẽ vào ' +
            'bộ nhớ kernel (<code>dec</code>). Và mã máy của hai hàm của bạn chỉ là <code>0x34</code> + ' +
            '<code>0x30</code> = <b>100</b> byte (hai section <code>.init.text</code> và ' +
            '<code>.exit.text</code> — <code>readelf -S hello.ko</code> cho bạn xem). Phần lớn của ' +
            '<code>data</code> là <code>struct module</code> (<code>0x440</code> = 1 088 byte) mà ' +
            '<code>modpost</code> sinh ra. Bước 4 sẽ cho thấy kernel làm tròn tất cả lên thành bao nhiêu.' },

          { t: 'code', where: 'wsl', code:
            'rm hello-nodebug.ko' },

          { t: 'p', x:
            'Cuối cùng, <code>nm</code> (Bài 18) cho bạn xem bảng ký hiệu — những cái tên module ' +
            '<b>định nghĩa</b> và những cái tên nó <b>cần</b> từ kernel. <code>grep -v</code> bỏ bớt các ' +
            'ký hiệu nội bộ do macro sinh ra:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-nm hello.ko | grep -v -e UNIQUE_ID -e _note_' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0000000000000000 T cleanup_module\n' +
            '0000000000000000 t hello_exit\n' +
            '0000000000000000 t hello_init\n' +
            '0000000000000000 T init_module\n' +
            '                 U _printk\n' +
            '0000000000000000 D __this_module' },

          { t: 'p', x:
            'Đây là <code>module_init</code> được bóc trần. <code>hello_init</code> và ' +
            '<code>init_module</code> nằm ở <b>cùng</b> offset <code>0</code> (trong ' +
            '<code>.init.text</code>) — hai tên, một hàm, đúng như <code>alias</code> ở phần lý thuyết. ' +
            'Chữ thường <code>t</code> = <code>static</code>, chỉ thấy trong file; chữ hoa <code>T</code> ' +
            '= toàn cục, kernel tìm được. Tương tự <code>cleanup_module</code> với ' +
            '<code>hello_exit</code>. <code>D __this_module</code> là <code>struct module</code> trong ' +
            '<code>hello.mod.c</code>. Và <code>U _printk</code> — <code>U</code> nghĩa là ' +
            '<b>undefined</b>: module gọi hàm này nhưng không có nó. <code>pr_info</code> đã được mở ' +
            'rộng thành lời gọi <code>_printk</code>.' },

          { t: 'p', x:
            'Ai sẽ cung cấp <code>_printk</code>? Kernel — nhưng chỉ vì kernel đã <b>export</b> nó. Danh ' +
            'sách mọi hàm được export nằm trong <code>Module.symvers</code> của cây kernel, file ' +
            '<code>modpost</code> đọc để kiểm tra:' },

          { t: 'code', where: 'wsl', code:
            'grep -P \'\\t_printk\\t\' ~/bai38/linux-6.18.45/Module.symvers\n' +
            'wc -l < ~/bai38/linux-6.18.45/Module.symvers' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0x00000000\t_printk\tvmlinux\tEXPORT_SYMBOL\t\n' +
            '20745' },

          { t: 'p', x:
            '<code>_printk</code> được export từ <code>vmlinux</code> (kernel lõi, không phải một module ' +
            'khác) bằng <code>EXPORT_SYMBOL</code> — không có hậu tố <code>_GPL</code>, nên module mang ' +
            'giấy phép nào cũng dùng được. Cây kernel này export tổng cộng <b>20 745</b> ký hiệu; đó là ' +
            'toàn bộ \"thư viện chuẩn\" một module được phép gọi. Một hàm kernel không có trong danh sách ' +
            'này thì module không gọi được, dù header có khai báo nó. <code>0x00000000</code> là mã CRC ' +
            'của hàm, chỉ có nghĩa khi bật <code>CONFIG_MODVERSIONS</code> — cây này tắt, nên toàn số 0.' },

          { t: 'p', x:
            'Và nếu bạn thử nạp ngay trên WSL thì sao? Bạn không có quyền root ở đây, nhưng thử để biết ' +
            'thông báo:' },

          { t: 'code', where: 'wsl', code:
            'insmod hello.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'insmod: ERROR: could not insert module hello.ko: Operation not permitted' },

          { t: 'p', x:
            '<code>Operation not permitted</code> (<code>EPERM</code>) là lỗi <b>quyền</b>: nạp module ' +
            'cần <code>CAP_SYS_MODULE</code>, tức root. Kernel dừng ở đó, trước cả khi đọc file — nên lỗi ' +
            'này không nói gì về chuyện module có hợp với WSL hay không. Với <code>sudo</code>, bạn sẽ ' +
            'gặp lỗi thật: kiến trúc sai và <code>vermagic</code> sai. <b>Đừng thử</b>: nạp module vào ' +
            'kernel của máy đang làm việc là thói quen xấu, và kernel đích của bạn đang ở trong QEMU.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Chuẩn bị ba module lỗi và một initramfs',
        blocks: [
          { t: 'p', x:
            'Bước 5 sẽ cho kernel xem ba module \"có vấn đề\". Chuẩn bị chúng ngay bây giờ, trên WSL. ' +
            'Module thứ nhất có hàm <code>init</code> luôn thất bại:' },

          { t: 'code', where: 'file', name: '~/bai50/hello/fail_init.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * fail_init.c - a module whose init function refuses to load.\n' +
            ' */\n' +
            '#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt\n' +
            '\n' +
            '#include <linux/init.h>\n' +
            '#include <linux/module.h>\n' +
            '\n' +
            'static int __init fail_init(void)\n' +
            '{\n' +
            '\tpr_info("init called, returning -ENODEV\\n");\n' +
            '\treturn -ENODEV;\n' +
            '}\n' +
            '\n' +
            'static void __exit fail_exit(void)\n' +
            '{\n' +
            '\tpr_info("exit called\\n");\n' +
            '}\n' +
            '\n' +
            'module_init(fail_init);\n' +
            'module_exit(fail_exit);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Module whose init always fails");' },

          { t: 'p', x:
            '<code>-ENODEV</code> (\"không có thiết bị\") là mã lỗi một driver thật trả về khi không tìm ' +
            'thấy phần cứng của nó. Không cần <code>#include &lt;linux/errno.h&gt;</code>: ' +
            '<code>module.h</code> đã kéo nó vào. Module thứ hai là <code>hello.c</code> với giấy phép ' +
            'độc quyền — tạo bằng <code>sed</code> để khỏi gõ lại:' },

          { t: 'code', where: 'wsl', code:
            'sed \'s/MODULE_LICENSE("GPL")/MODULE_LICENSE("Proprietary")/\' hello.c > prop.c\n' +
            'grep -n MODULE_LICENSE prop.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '26:MODULE_LICENSE("Proprietary");' },

          { t: 'p', x:
            'Đúng một dòng đổi, dòng 26. Giờ báo cho Kbuild có ba module trong thư mục này — sửa dòng ' +
            'đầu Makefile, rồi build:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'s/^obj-m := hello.o$/obj-m := hello.o fail_init.o prop.o/\' Makefile\n' +
            'head -n 1 Makefile\n' +
            'make 2>&1 | grep -E \'\\[M\\]|MODPOST\'\n' +
            'ls -l *.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'obj-m := hello.o fail_init.o prop.o\n' +
            '  CC [M]  fail_init.o\n' +
            '  CC [M]  prop.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  fail_init.mod.o\n' +
            '  LD [M]  fail_init.ko\n' +
            '  CC [M]  prop.mod.o\n' +
            '  LD [M]  prop.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 103680 Sep 29 14:21 fail_init.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 104728 Sep 29 14:21 hello.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 104728 Sep 29 14:21 prop.ko' },

          { t: 'p', x:
            'Kbuild chỉ dịch hai file mới (<code>fail_init.o</code>, <code>prop.o</code>); ' +
            '<code>hello.o</code> không có trong danh sách vì nó không đổi. <code>MODPOST</code> chạy ' +
            '<b>một lần</b> cho cả ba module. <code>prop.ko</code> nặng đúng bằng <code>hello.ko</code> — ' +
            'chuỗi <code>Proprietary</code> dài hơn <code>GPL</code> 8 byte nhưng rơi vào phần đệm căn ' +
            'lề của section.' },

          { t: 'p', x:
            'Module lỗi thứ ba không thể build được — và đó chính là bài học. Thử xoá dòng ' +
            '<code>MODULE_LICENSE</code>. <code>make obj-m=nolic.o</code> ghi đè biến ' +
            '<code>obj-m</code> ngay trên dòng lệnh, nên không phải sửa Makefile:' },

          { t: 'code', where: 'wsl', code:
            'sed \'/MODULE_LICENSE/d\' hello.c > nolic.c\n' +
            'make obj-m=nolic.o 2>&1 | grep -E \'ERROR|\\[M\\]|MODPOST\'\n' +
            'ls nolic.ko\n' +
            'rm nolic.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  CC [M]  nolic.o\n' +
            '  MODPOST Module.symvers\n' +
            'ERROR: modpost: missing MODULE_LICENSE() in nolic.o\n' +
            'ls: cannot access \'nolic.ko\': No such file or directory' },

          { t: 'p', x:
            '<code>nolic.c</code> <b>dịch được</b> (<code>CC [M]</code> thành công) — với trình biên dịch, ' +
            'thiếu một macro không phải lỗi. Người chặn lại là <code>modpost</code> ' +
            '(<code>scripts/mod/modpost.c:1595</code>), trước bước <code>LD</code>, nên không có ' +
            '<code>.ko</code> nào ra đời. Chạy không có <code>grep</code>, <code>make</code> kết thúc với ' +
            'mã <b>2</b>. Bạn sẽ không bao giờ nạp nhầm một module quên khai giấy phép, vì nó không tồn ' +
            'tại.' },

          { t: 'p', x:
            'Module thứ ba vì vậy là một <code>hello.ko</code> bị sửa <b>đúng một byte</b>: chữ ' +
            '<code>d</code> cuối của <code>embedded</code> trong chuỗi <code>vermagic</code> đổi thành ' +
            '<code>X</code>. Đó là mô phỏng rẻ nhất cho tình huống thật hay gặp: một module build từ cây ' +
            'kernel khác phiên bản với kernel trên bo mạch.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai50\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'cp hello/hello.ko hello/fail_init.ko hello/prop.ko initramfs/\n' +
            'sed \'s/6.18.45-embedded SMP/6.18.45-embeddeX SMP/\' hello/hello.ko > initramfs/bad-vermagic.ko\n' +
            'cmp -l hello/hello.ko initramfs/bad-vermagic.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '   392 144 130' },

          { t: 'p', x:
            '<code>cmp -l</code> liệt kê mọi byte khác nhau giữa hai file: chỉ <b>một</b> dòng, ở vị trí ' +
            '<b>392</b>, giá trị bát phân <code>144</code> (<code>d</code>) thành <code>130</code> ' +
            '(<code>X</code>). Dùng <code>sed</code> trên file nhị phân ở đây an toàn vì chuỗi thay thế ' +
            'dài đúng bằng chuỗi gốc — kích thước file và mọi offset giữ nguyên. Vị trí 392 có thể khác ' +
            'trên máy bạn nếu đường dẫn hay trình biên dịch khác; điều quan trọng là chỉ có một dòng.' },

          { t: 'p', x:
            'Cuối cùng, đóng gói tất cả thành initramfs, đúng cách Bài 32 đã làm:' },

          { t: 'code', where: 'wsl', code:
            'ls initramfs\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bad-vermagic.ko  bin  dev  fail_init.ko  hello.ko  init  proc  prop.ko  sys\n' +
            '4689 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1116914 Sep 29 14:21 initramfs.cpio.gz' },

          { t: 'p', x:
            'Bốn file <code>.ko</code> nằm ở gốc, cạnh <code>/init</code> của Bài 32. Ngoặc tròn chạy ' +
            '<code>cd</code> trong một subshell (Bài 13) nên bạn vẫn đứng ở <code>~/bai50</code>. ' +
            '<code>4689 blocks</code> là số khối 512 byte <code>cpio</code> ghi ra — Bài 32 được ' +
            '<b>3871</b> khối, phần tăng thêm là bốn file <code>.ko</code> khoảng 100 KB mỗi file. Kích ' +
            'thước file <code>.gz</code> sẽ lệch vài chục byte trên máy bạn: <code>cpio</code> ghi cả ' +
            'thời gian sửa đổi và số inode vào archive (Bài 32).' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — Boot QEMU, nạp hello.ko, nhìn nó từ bốn phía, rồi gỡ',
        blocks: [
          { t: 'p', x:
            'Boot kernel của Bài 40 với initramfs vừa đóng gói. Dòng lệnh giống hệt Bài 32, chỉ khác ' +
            'file <code>-initrd</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai50\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.748446] Freeing unused kernel memory: 11648K\n' +
            '[    0.749553] Run /init as init process\n' +
            '\n' +
            '=== init running as PID 1 ===\n' +
            '\n' +
            '\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3+b1) built-in shell (ash)\n' +
            'Enter \'help\' for a list of built-in commands.\n' +
            '\n' +
            '/bin/sh: can\'t access tty; job control turned off\n' +
            '~ #' },

          { t: 'p', x:
            'Bốn dòng cuối của khoảng <b>245</b> dòng log boot. <code>=== init running as PID 1 ===</code> ' +
            'là dòng <code>echo</code> trong <code>/init</code> của Bài 32 — bạn đang ở đúng initramfs. ' +
            'Dòng <code>can\'t access tty</code> là bình thường, Bài 32 đã giải thích. Từ đây, mọi khối ' +
            '<b>QEMU</b> được gõ tại dấu nhắc <code>~ #</code> trong chính cửa sổ này. Terminal của bạn có ' +
            'thể chèn chuỗi <code>^[[6n</code> trước mỗi lệnh — shell hỏi vị trí con trỏ, vô hại (Bài 46). ' +
            'Kiểm tra trạng thái trước khi nạp:' },

          { t: 'code', where: 'qemu', code:
            'uname -r\n' +
            'ls /\n' +
            'cat /proc/sys/kernel/tainted\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # uname -r\n' +
            '6.18.45-embedded\n' +
            '~ # ls /\n' +
            'bad-vermagic.ko  fail_init.ko     proc             sys\n' +
            'bin              hello.ko         prop.ko\n' +
            'dev              init             root\n' +
            '~ # cat /proc/sys/kernel/tainted\n' +
            '0\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Not tainted' },

          { t: 'p', x:
            '<code>uname -r</code> in <code>6.18.45-embedded</code> — trùng khít phần đầu ' +
            '<code>vermagic</code> mà <code>modinfo</code> đọc ở bước 2. Bốn file <code>.ko</code> có ' +
            'mặt ở gốc. <code>tainted</code> = <b>0</b> và <code>lsmod</code> ghi <code>Not tainted</code>: ' +
            'kernel đang \"sạch\", chưa nạp thứ gì lạ. Danh sách module trống — kernel ' +
            '<code>defconfig</code> này tự nạp module từ đĩa chỉ khi có <code>modprobe</code> và ' +
            '<code>/lib/modules</code>, mà initramfs không có cả hai. Nhớ con số 0; bạn sẽ quay lại nó.' },

          { t: 'p', x:
            'Giờ là khoảnh khắc chính của bài:' },

          { t: 'code', where: 'qemu', code:
            'insmod /hello.ko; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /hello.ko; echo "rc=$?"\n' +
            '[   16.199569] hello: loading out-of-tree module taints kernel.\n' +
            '[   16.202394] hello: init called by insmod (pid 59)\n' +
            'rc=0' },

          { t: 'cal', kind: 'info', title: 'Hai dòng, hai tác giả', x:
            '<p>Dòng thứ hai là <b>của bạn</b>: <code>hello: </code> do <code>pr_fmt</code> thêm vào, ' +
            'phần còn lại là chuỗi trong <code>hello_init</code>. <code>current-&gt;comm</code> là ' +
            '<code>insmod</code> — mã của bạn đang chạy nhân danh tiến trình <code>insmod</code>, đúng như ' +
            'sơ đồ vòng đời. PID <b>59</b> và dấu thời gian <b>16.2 s</b> sẽ khác trên máy bạn.</p>' +
            '<p>Dòng thứ nhất là của <b>kernel</b>, in <b>trước</b> dòng của bạn (' +
            '<code>kernel/module/main.c:2524</code>): module không có dấu <code>intree</code> trong ' +
            '<code>.modinfo</code> — chỉ module build bên trong cây kernel mới có — nên kernel ghi nhận ' +
            '\"có mã ngoài cây\". Đây không phải lỗi: <code>rc=0</code>, module đã nạp. Bước này sẽ đo ' +
            'hệ quả của nó.</p>' +
            '<p>Dòng log hiện ngay trên console vì mức <code>KERN_INFO</code> (6) thấp hơn ngưỡng console ' +
            'mặc định (7) — Bài 41 đã đo ngưỡng này. Trên một bo mạch với log level khác, bạn sẽ chỉ thấy ' +
            'nó trong <code>dmesg</code>.</p>' },

          { t: 'p', x:
            'Giờ nhìn module từ bốn phía. Phía thứ nhất là bộ đệm log — nơi dòng của bạn vẫn còn đó ' +
            'sau khi console đã cuộn qua:' },

          { t: 'code', where: 'qemu', code:
            'dmesg | tail -n 2' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   16.199569] hello: loading out-of-tree module taints kernel.\n' +
            '[   16.202394] hello: init called by insmod (pid 59)' },

          { t: 'p', x:
            'Đúng hai dòng vừa thấy, cùng dấu thời gian: console chỉ là một <b>bản sao</b> của bộ đệm ' +
            'log. Phía thứ hai là danh sách module đang nạp, ở hai dạng — <code>lsmod</code> cho người ' +
            'đọc và <code>/proc/modules</code> nơi nó lấy dữ liệu:' },

          { t: 'code', where: 'qemu', code:
            'lsmod\n' +
            'cat /proc/modules' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'hello                  12288  0 \n' +
            '~ # cat /proc/modules\n' +
            'hello 12288 0 - Live 0xffff80007afd0000 (O)' },

          { t: 'table',
            head: ['Trường trong /proc/modules', 'Giá trị', 'Nghĩa là'],
            rows: [
              ['Tên', '<code>hello</code>', 'Từ <code>KBUILD_MODNAME</code> — tên bạn dùng với <code>rmmod</code>.'],
              ['Kích thước', '<code>12288</code>', 'Byte bộ nhớ kernel module đang chiếm: <b>3 trang</b> 4 KiB. Xem ngay dưới.'],
              ['Số tham chiếu', '<code>0</code>', 'Không ai đang dùng module này, nên gỡ được. Bài 37 đã thấy <code>kvm</code> có số <b>1</b> vì <code>kvm_intel</code> dùng nó.'],
              ['Phụ thuộc', '<code>-</code>', 'Không module nào dùng ký hiệu của <code>hello</code>.'],
              ['Trạng thái', '<code>Live</code>', '<code>init</code> đã trả về 0 — <code>MODULE_STATE_LIVE</code> trong sơ đồ.'],
              ['Địa chỉ', '<code>0xffff80007afd0000</code>', 'Nơi kernel đặt module. Có thể khác trên máy bạn; và chỉ hiện số thật khi bạn là root.'],
              ['Cờ taint', '<code>(O)</code>', 'Module này đã đánh dấu kernel: <b>O</b> = out-of-tree.']
            ] },

          { t: 'p', x:
            '1 580 byte ở bước 2 trở thành <b>12 288</b> byte ở đây — gấp gần 8 lần. Lý do là ' +
            '<code>CONFIG_STRICT_MODULE_RWX=y</code> (<code>.config</code> dòng 871): mã (chỉ đọc + chạy), ' +
            'dữ liệu chỉ đọc, và dữ liệu ghi được phải nằm trên các <b>trang riêng</b> để kernel cấm ghi ' +
            'vào mã và cấm chạy dữ liệu. Ba vùng × 4 096 byte = 12 288. Với module nhỏ, đơn vị cấp phát là ' +
            'trang, không phải byte. Để ý thêm: <code>lsmod</code> của BusyBox ghi <code>Tainted: G</code> ' +
            '(\"chỉ GPL\"), trong khi <code>/proc/modules</code> ghi <code>(O)</code>. BusyBox chỉ biết ba ' +
            'cờ cũ <code>P</code>/<code>F</code>/<code>S</code> (<code>modutils/lsmod.c</code>); nguồn đầy ' +
            'đủ là kernel.' },

          { t: 'p', x:
            'Phía thứ ba là sysfs. Mỗi module đang nạp có một thư mục trong <code>/sys/module</code>, và ' +
            'mỗi file trong đó là một thuộc tính kernel cho bạn đọc:' },

          { t: 'code', where: 'qemu', code:
            'ls /sys/module/hello\n' +
            'cat /sys/module/hello/initstate /sys/module/hello/refcnt\n' +
            'cat /sys/module/hello/coresize /sys/module/hello/initsize' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/module/hello\n' +
            'coresize   initsize   notes      sections   uevent\n' +
            'holders    initstate  refcnt     taint\n' +
            '~ # cat /sys/module/hello/initstate /sys/module/hello/refcnt\n' +
            'live\n' +
            '0\n' +
            '~ # cat /sys/module/hello/coresize /sys/module/hello/initsize\n' +
            '12288\n' +
            '0' },

          { t: 'p', x:
            '<code>initstate</code> = <code>live</code> và <code>refcnt</code> = <code>0</code> là hai ' +
            'trường của <code>/proc/modules</code>, mỗi trường một file. Cặp đáng chú ý là ' +
            '<code>coresize</code> <b>12 288</b> và <code>initsize</code> <b>0</b>. <code>core</code> là ' +
            'phần ở lại suốt đời module; <code>init</code> là phần chỉ cần lúc khởi tạo — ' +
            '<code>.init.text</code>, nơi <code>__init</code> đặt <code>hello_init</code>. <code>0</code> ' +
            'nghĩa là kernel đã giải phóng nó ngay khi <code>hello_init</code> trả về ' +
            '(<code>do_init_module()</code>, <code>kernel/module/main.c:3017</code>). Phía thứ tư chứng ' +
            'minh điều đó bằng tên hàm:' },

          { t: 'code', where: 'qemu', code:
            'grep -e hello_init -e hello_exit /proc/kallsyms' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ffff80007afd0000 t hello_exit\t[hello]' },

          { t: 'cal', kind: 'why', title: '__init không phải trang trí: hello_init đã biến mất khỏi kernel', x:
            '<p><code>/proc/kallsyms</code> là bảng mọi ký hiệu kernel đang biết, kể cả của module ' +
            '(Bài 37 đã đọc nó trên WSL; ở đây bạn là root nên thấy địa chỉ thật thay vì toàn số 0). Bạn ' +
            'hỏi hai tên, kernel chỉ trả <b>một</b>: <code>hello_exit</code>, ở đầu vùng mã của module, ' +
            'kèm nhãn <code>[hello]</code>. <code>hello_init</code> không còn ở đâu cả — vùng nhớ chứa nó ' +
            'đã được trả lại.</p>' +
            '<p>Với 52 byte, tiết kiệm này không đáng kể. Với một driver thật, hàm <code>init</code> dò ' +
            'phần cứng, đọc Device Tree, đăng ký thiết bị — có khi vài KB mã chỉ chạy một lần. Kernel lõi ' +
            'làm đúng việc này cho chính nó lúc boot: dòng <code>Freeing unused kernel memory: 11648K</code> ' +
            'ở cuối log boot phía trên chính là mọi hàm <code>__init</code> của kernel được trả lại.</p>' +
            '<p>Hệ quả cho bạn: <b>đừng bao giờ</b> gọi một hàm <code>__init</code> từ chỗ nào chạy sau ' +
            'khi <code>init</code> đã xong (ví dụ từ <code>exit</code>). Nó sẽ nhảy vào vùng nhớ đã bị ' +
            'thu hồi. Kbuild có cảnh báo <code>section mismatch</code> để bắt lỗi này lúc build.</p>' },

          { t: 'p', x:
            'Cuối cùng, kiểm tra con số bạn đã ghi nhớ lúc đầu:' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4096' },

          { t: 'p', x:
            'Từ <b>0</b> thành <b>4096</b>. <code>tainted</code> là một <b>mặt nạ bit</b> (bitmask), mỗi ' +
            'bit một lý do kernel không còn \"sạch\". 4096 = 2<sup>12</sup> = bit 12. Bảng đầy đủ nằm ' +
            'trong chính cây kernel, <code>Documentation/admin-guide/tainted-kernels.rst</code>; ba dòng ' +
            'liên quan tới bài này:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Documentation/admin-guide/tainted-kernels.rst (trích)', code:
            '  0  G/P       1  proprietary module was loaded\n' +
            '  1  _/F       2  module was force loaded\n' +
            ' 12  _/O    4096  externally-built ("out-of-tree") module was loaded' },

          { t: 'p', x:
            'Cột thứ nhất là số bit, cột hai là chữ cái (<code>G</code> khi bit 0 tắt, <code>P</code> khi ' +
            'bật), cột ba là giá trị. Không cần nhớ bảng này — <code>grep</code> nó trong ' +
            '<code>~/bai38/linux-6.18.45/Documentation/admin-guide/tainted-kernels.rst</code> mỗi khi ' +
            'thấy một con số lạ. Điều cần nhớ là <b>tại sao</b> kernel ghi lại: khi một hệ thống gặp oops, ' +
            'dòng báo lỗi in kèm chuỗi taint, và người đọc báo lỗi biết ngay \"kernel này đã chạy mã không ' +
            'ai trong cộng đồng kiểm tra\". Một kernel có <code>P</code> đã chạy mã mà cộng đồng không ' +
            'đọc được, nên báo lỗi từ nó khó được ai nhận xử lý.' },

          { t: 'p', x:
            'Giờ gỡ module. Nhưng trước đó, thử nạp lại lần nữa — một lỗi bạn sẽ gặp mỗi ngày khi quên ' +
            '<code>rmmod</code> trước khi nạp bản mới:' },

          { t: 'code', where: 'qemu', code:
            'insmod /hello.ko; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'insmod: can\'t insert \'/hello.ko\': File exists\n' +
            'rc=17' },

          { t: 'p', x:
            '<code>File exists</code> là <code>strerror(EEXIST)</code>, và <code>rc=17</code> chính là số ' +
            '<code>EEXIST</code>: <code>insmod</code> của BusyBox trả luôn mã lỗi của kernel làm mã thoát ' +
            '(<code>modutils/insmod.c:74</code>). Kernel từ chối vì đã có một module tên ' +
            '<code>hello</code> đang <code>Live</code> (<code>kernel/module/main.c:3213</code>) — bước 4 ' +
            'trong sơ đồ vòng đời, trước cả khi cấp bộ nhớ. Không có dòng <code>init called</code> nào: ' +
            'mã của bạn không chạy lần hai. \"File\" ở đây là cách nói cũ của <code>strerror</code>, không ' +
            'phải file trên đĩa.' },

          { t: 'code', where: 'qemu', code:
            'rmmod hello; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod hello; echo "rc=$?"\n' +
            '[   34.743088] hello: exit called by rmmod (pid 70)\n' +
            'rc=0' },

          { t: 'p', x:
            'Hàm dọn dẹp của bạn chạy — lần này nhân danh <code>rmmod</code>, PID <b>70</b> (sẽ khác trên ' +
            'máy bạn). <code>rmmod</code> nhận <b>tên</b> <code>hello</code>, không phải ' +
            '<code>/hello.ko</code>: module giờ là một đối tượng trong kernel, không còn liên quan gì tới ' +
            'file. Kiểm tra lại bốn phía:' },

          { t: 'code', where: 'qemu', code:
            'dmesg | tail -n 2\n' +
            'lsmod\n' +
            'ls /sys/module/hello\n' +
            'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # dmesg | tail -n 2\n' +
            '[   16.202394] hello: init called by insmod (pid 59)\n' +
            '[   34.743088] hello: exit called by rmmod (pid 70)\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            '~ # ls /sys/module/hello\n' +
            'ls: /sys/module/hello: No such file or directory\n' +
            '~ # cat /proc/sys/kernel/tainted\n' +
            '4096' },

          { t: 'p', x:
            '<code>dmesg</code> giữ đủ cặp <code>init</code>/<code>exit</code> — nhật ký trọn một vòng ' +
            'đời, cách nhau 18,5 giây. <code>lsmod</code> trống, thư mục sysfs biến mất. Nhưng ' +
            '<code>tainted</code> <b>vẫn là 4096</b> và <code>lsmod</code> vẫn ghi <code>Tainted</code>. ' +
            'Gỡ module không xoá được dấu vết: kernel không thể biết mã ngoài cây đã để lại gì trong bộ ' +
            'nhớ của nó trong 18 giây đó. Chỉ có boot lại mới đưa con số về 0.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — Ba lần kernel nói \"không\" (và một lần nói \"có, nhưng…\")',
        blocks: [
          { t: 'p', x:
            'Vẫn trong phiên QEMU đó. Đầu tiên, gỡ một module không có mặt — thứ xảy ra khi bạn gõ ' +
            '<code>rmmod</code> hai lần:' },

          { t: 'code', where: 'qemu', code:
            'rmmod hello; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rmmod: can\'t unload module \'hello\': No such file or directory\n' +
            'rc=1' },

          { t: 'p', x:
            '<code>ENOENT</code> — kernel không có module nào tên <code>hello</code>. Khác ' +
            '<code>insmod</code>, <code>rmmod</code> của BusyBox trả mã thoát <b>1</b> chung cho mọi lỗi. ' +
            'Vô hại, nhưng hãy nhớ: <code>No such file</code> từ <code>rmmod</code> nghĩa là \"không có ' +
            'module\", không phải \"thiếu file\".' },

          { t: 'h4', x: 'Lần 1: init trả về lỗi' },

          { t: 'code', where: 'qemu', code:
            'insmod /fail_init.ko; echo "rc=$?"\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /fail_init.ko; echo "rc=$?"\n' +
            '[   45.751295] fail_init: init called, returning -ENODEV\n' +
            '[   45.764470] fail_init: init called, returning -ENODEV\n' +
            'insmod: can\'t insert \'/fail_init.ko\': No such device\n' +
            'rc=19\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  ' },

          { t: 'p', x:
            'Lần này <code>dmesg</code> <b>có</b> dòng của bạn — kernel đã vượt qua mọi kiểm tra và chạy ' +
            'mã của bạn. Lỗi nằm ở logic: <code>fail_init</code> trả <code>-ENODEV</code>, kernel gỡ ' +
            'module ngay, <code>insmod</code> nhận đúng mã đó (<code>No such device</code>, ' +
            '<code>rc=19</code> = <code>ENODEV</code>), và <code>lsmod</code> trống. Không có dòng ' +
            '<code>exit called</code>: đúng như sơ đồ, <code>exit</code> không được gọi cho một module ' +
            'chưa từng <code>Live</code>.' },

          { t: 'cal', kind: 'info', title: 'Vì sao init chạy hai lần?', x:
            '<p>Hai dòng giống hệt nhau, cách nhau 13 ms. Không phải kernel gọi hai lần — là ' +
            '<code>insmod</code> của BusyBox <b>thử hai syscall</b>. <code>modutils/modutils.c:216</code> ' +
            'gọi <code>finit_module()</code> (truyền file descriptor) trước; nếu thất bại vì bất kỳ lý do ' +
            'gì, dòng 242 thử lại bằng <code>init_module()</code> (truyền cả file đã đọc vào RAM) — lối ' +
            'thoát dành cho module nén mà kernel không tự giải nén được. Với <code>hello.ko</code> lần ' +
            'đầu đã thành công nên chỉ một dòng.</p>' +
            '<p>Bài học rộng hơn: hàm <code>init</code> của bạn có thể được gọi nhiều lần trong đời ' +
            'kernel — mỗi lần <code>insmod</code> một lần, và công cụ userspace có thể tự thử lại. Mỗi lần ' +
            'phải bắt đầu từ trạng thái sạch, và nếu thất bại thì phải trả lại mọi thứ đã xin trước khi ' +
            'trả về lỗi.</p>' },

          { t: 'h4', x: 'Lần 2: vermagic sai một ký tự' },

          { t: 'code', where: 'qemu', code:
            'insmod /bad-vermagic.ko; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /bad-vermagic.ko; echo "rc=$?"\n' +
            '[   49.438567] hello: version magic \'6.18.45-embeddeX SMP preempt mod_unload aarch64\' should be \'6.18.45-embedded SMP preempt mod_unload aarch64\'\n' +
            '[   49.439661] hello: version magic \'6.18.45-embeddeX SMP preempt mod_unload aarch64\' should be \'6.18.45-embedded SMP preempt mod_unload aarch64\'\n' +
            'insmod: can\'t insert \'/bad-vermagic.ko\': invalid module format\n' +
            'rc=8' },

          { t: 'p', x:
            'Lần này <b>không</b> có dòng <code>init called</code> — kernel từ chối từ bước 2 của sơ đồ, ' +
            'mã của bạn chưa hề chạy. Hai dòng <code>dmesg</code> vẫn do hai lần thử của BusyBox. Chú ý ' +
            'tên in ra là <code>hello</code>, không phải <code>bad-vermagic</code>: tên module nằm ' +
            '<b>trong</b> file (<code>.modinfo</code>), tên file thì kernel không bao giờ thấy.' },

          { t: 'cal', kind: 'warn', title: 'invalid module format: userspace nói mơ hồ, dmesg nói chính xác', x:
            '<p><code>invalid module format</code> là cách BusyBox dịch <code>ENOEXEC</code> ' +
            '(<code>rc=8</code>, <code>modutils/modutils.c:268–269</code>). Cùng một thông báo đó xuất ' +
            'hiện cho vermagic sai, kiến trúc sai, file hỏng, hay file không phải ELF. Chỉ ' +
            '<code>dmesg</code> nói <b>cái gì</b> sai — ở đây, đúng cặp chuỗi \"có\" và \"phải là\" ' +
            '(<code>kernel/module/main.c:2594</code>).</p>' +
            '<p>Quy tắc cho cả Chặng 10: <b><code>insmod</code> báo lỗi → đọc <code>dmesg | tail</code> ' +
            'ngay</b>, trước khi đoán. Trong thực tế, vermagic sai hầu như luôn có nghĩa là module được ' +
            'build từ cây kernel khác với kernel đang chạy — khác phiên bản, khác ' +
            '<code>LOCALVERSION</code>, hoặc bật/tắt <code>PREEMPT</code>. Cách chữa duy nhất đúng là build ' +
            'lại module theo đúng cây, không phải ép kernel nhận (<code>CONFIG_MODULE_FORCE_LOAD</code> ' +
            'tắt trong cây này, và nên tắt).</p>' },

          { t: 'h4', x: 'Lần 3: giấy phép độc quyền — nạp được, nhưng…' },

          { t: 'code', where: 'qemu', code:
            'insmod /prop.ko; echo "rc=$?"\n' +
            'cat /proc/modules\n' +
            'cat /proc/sys/kernel/tainted' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /prop.ko; echo "rc=$?"\n' +
            '[   51.272704] prop: module license \'Proprietary\' taints kernel.\n' +
            '[   51.273056] Disabling lock debugging due to kernel taint\n' +
            '[   51.273265] prop: module license taints kernel.\n' +
            '[   51.273995] prop: init called by insmod (pid 80)\n' +
            'rc=0\n' +
            '~ # cat /proc/modules\n' +
            'prop 12288 0 - Live 0xffff80007afd0000 (PO)\n' +
            '~ # cat /proc/sys/kernel/tainted\n' +
            '4097' },

          { t: 'p', x:
            '<code>rc=0</code> — kernel <b>chấp nhận</b> module độc quyền. Nhưng nó ghi lại ba dòng cảnh ' +
            'báo trước khi chạy mã của bạn. Dòng 1 (<code>kernel/module/main.c:1756</code>) nêu tên giấy ' +
            'phép. Dòng 2 (<code>kernel/panic.c:753</code>) là hệ quả thật: kernel <b>tắt công cụ kiểm tra ' +
            'khoá</b> (lockdep), vì mã không kiểm chứng được có thể làm kết quả của nó vô nghĩa. Dòng 3 ' +
            '(<code>main.c:2576</code>) xác nhận bit <code>P</code> vừa được bật. Và để ý tiền tố: ' +
            '<code>prop: init called</code> — cùng một mã nguồn với <code>hello.c</code>, nhưng ' +
            '<code>KBUILD_MODNAME</code> lấy từ tên file <code>prop.c</code>, nên <code>pr_fmt</code> tự ' +
            'đổi theo.' },

          { t: 'p', x:
            '<code>(PO)</code> = hai cờ: độc quyền và ngoài cây. <b>4097</b> = 4096 + 1 = bit 12 ' +
            '(<code>O</code>, còn từ <code>hello</code>) cộng bit 0 (<code>P</code>). Gỡ nó và xem dấu ' +
            'vết có đi theo không:' },

          { t: 'code', where: 'qemu', code:
            'rmmod prop\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod prop\n' +
            '[   56.771616] prop: exit called by rmmod (pid 83)\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: P  ' },

          { t: 'p', x:
            'Module đã đi, <code>Tainted: P</code> ở lại tới lần boot sau. Trên một sản phẩm, chuỗi đó sẽ ' +
            'in kèm mọi oops. Đó là cái giá của một driver độc quyền, và là một trong những lý do các ' +
            'công ty làm thiết bị nhúng mở mã driver của họ.' },

          { t: 'cal', kind: 'why', title: 'GPL không chỉ là đánh dấu: có những hàm module độc quyền không được gọi', x:
            'Bước 2 đã thấy <code>_printk</code> được export bằng <code>EXPORT_SYMBOL</code> — ai cũng ' +
            'dùng được. Nhưng rất nhiều hàm kernel được export bằng <code>EXPORT_SYMBOL_GPL</code>: chỉ ' +
            'module có giấy phép tương thích GPL mới liên kết được với chúng. Trong <b>20 745</b> ký hiệu ' +
            'của cây này, <b>12 425</b> là <code>EXPORT_SYMBOL_GPL</code> và chỉ <b>8 320</b> là ' +
            '<code>EXPORT_SYMBOL</code> — tự đếm bằng <code>grep -c EXPORT_SYMBOL_GPL ' +
            '~/bai38/linux-6.18.45/Module.symvers</code>. Hơn nửa \"thư viện\" của kernel đóng cửa với ' +
            'module độc quyền. Một module ' +
            '<code>Proprietary</code> gọi tới một hàm như thế sẽ bị <code>modpost</code> chặn ngay lúc ' +
            'build. Vì vậy <code>MODULE_LICENSE</code> không phải thủ tục giấy tờ: nó quyết định module ' +
            'được dùng phần nào của kernel.' },

          { t: 'p', x:
            'Tắt máy ảo:' },

          { t: 'code', where: 'qemu', code:
            'poweroff -f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[   60.452232] Flash device refused suspend due to active operation (state 20)\n' +
            '[   60.452793] Flash device refused suspend due to active operation (state 20)\n' +
            '[   60.454073] reboot: Power down' },

          { t: 'p', x:
            'Hai dòng <code>Flash device refused suspend</code> luôn xuất hiện khi tắt máy <code>virt</code> ' +
            '— Bài 41 đã gặp chúng, vô hại. Giữ lại <code>~/bai50</code> (khoảng <b>4,7 MB</b>): ' +
            '<code>Makefile</code> và quy trình đóng gói initramfs ở đây là khuôn cho mọi module của ' +
            'Chặng 10.' }
        ] }
    ] },

    { t: 'terms', items: [
      ['Kernel module', '<code>.ko</code>', 'File ELF <code>REL</code> chứa mã được kernel nạp vào chính nó khi đang chạy. Sau khi nạp, chạy cùng đặc quyền và bộ nhớ với kernel.'],
      ['Build ngoài cây', 'out-of-tree', 'Build module từ một thư mục bên ngoài cây nguồn kernel, bằng <code>make -C &lt;cây&gt; M=&lt;thư_mục&gt;</code>. Cây phải là cây đã build của đúng kernel đích.'],
      ['<code>obj-m</code>', '—', 'Biến Kbuild liệt kê các module cần build. <code>obj-m := hello.o</code> → <code>hello.ko</code>.'],
      ['<code>modpost</code>', '—', 'Bước kiểm tra sau khi dịch: có <code>MODULE_LICENSE</code> không, mọi ký hiệu cần dùng có được export không; sinh ra <code>*.mod.c</code>.'],
      ['vermagic', '—', 'Chuỗi phiên bản + tuỳ chọn cấu hình ghi trong <code>.modinfo</code>. Kernel so với chuỗi của chính nó; khác → <code>ENOEXEC</code>.'],
      ['Ký hiệu được export', '<code>EXPORT_SYMBOL</code>', 'Hàm/biến kernel cho phép module dùng. Danh sách nằm trong <code>Module.symvers</code>; bản <code>_GPL</code> chỉ dành cho module GPL.'],
      ['<code>__init</code> / <code>__exit</code>', '—', 'Đặt hàm vào <code>.init.text</code> / <code>.exit.text</code>. Vùng init được giải phóng ngay sau khi hàm khởi tạo chạy xong.'],
      ['Taint', '<code>/proc/sys/kernel/tainted</code>', 'Mặt nạ bit ghi lại những lý do kernel không còn \"sạch\" (bit 0 <code>P</code>, bit 12 <code>O</code>…). Chỉ về 0 khi boot lại.']
    ] },

    /* ============================================================
       6. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>fatal error: linux/init.h: No such file or directory</code>',
         'Dịch module bằng <code>gcc</code> trực tiếp, không qua Kbuild. Trình biên dịch tìm header trong sysroot userspace.',
         'Luôn build bằng <code>make -C &lt;cây_kernel&gt; M=$PWD</code> (Makefile ở bước 1).'],
        ['<code>make: *** /home/…/bai38/linux-6.81.45: No such file or directory.  Stop.</code>',
         '<code>KDIR</code> gõ sai hoặc cây kernel đã bị xoá.',
         '<code>ls $KDIR/Module.symvers</code>. Nếu cây còn mà thiếu file này, cây chưa được build — làm lại Bài 40.'],
        ['<code>make[3]: *** No rule to make target \'helo.o\', needed by \'./\'.  Stop.</code>',
         'Tên trong <code>obj-m</code> không khớp tên file <code>.c</code>.',
         'Sửa <code>obj-m</code> cho khớp: <code>hello.o</code> ↔ <code>hello.c</code>.'],
        ['<code>Makefile:8: *** missing separator (did you mean TAB instead of 8 spaces?).  Stop.</code>',
         'Dòng lệnh dưới <code>all:</code> thụt bằng dấu cách thay vì Tab (thường do chép từ trình duyệt).',
         'Thay khoảng trắng đầu dòng bằng một ký tự Tab. <code>cat -A Makefile</code> phải hiện <code>^I</code>.'],
        ['<code>aarch64-linux-gnu-gcc: error: unrecognized argument in option \'-mcmodel=kernel\'</code> (kèm <code>-mno-sse</code>, <code>-m64</code>…)',
         'Quên <code>ARCH=arm64</code>. Kbuild lấy cờ của <code>arch/x86/Makefile</code> rồi đưa cho trình biên dịch ARM64.',
         'Thêm <code>ARCH=arm64</code>, hoặc dùng Makefile ở bước 1 (có sẵn <code>ARCH ?= arm64</code>).'],
        ['<code>warning: the compiler differs from the one used to build the kernel</code> rồi <code>gcc: error: unrecognized command line option \'-mlittle-endian\'</code>',
         'Quên <code>CROSS_COMPILE</code>. Kbuild gọi <code>gcc</code> x86 với cờ ARM64.',
         'Thêm <code>CROSS_COMPILE=aarch64-linux-gnu-</code>.'],
        ['<code>ERROR: modpost: missing MODULE_LICENSE() in nolic.o</code>',
         'Thiếu dòng <code>MODULE_LICENSE</code>. Không có <code>.ko</code> nào được tạo, <code>make</code> thoát mã 2.',
         'Thêm <code>MODULE_LICENSE("GPL");</code> (hoặc giấy phép thật của bạn).'],
        ['<code>insmod: ERROR: could not insert module hello.ko: Operation not permitted</code>',
         'Chạy <code>insmod</code> không phải root (trên WSL). Nạp module cần <code>CAP_SYS_MODULE</code>.',
         'Module này dành cho kernel QEMU — nạp nó trong QEMU, nơi bạn là root. Không <code>sudo insmod</code> vào WSL.'],
        ['<code>insmod: can\'t insert \'/hello.ko\': File exists</code> (<code>rc=17</code>)',
         'Module cùng tên đang <code>Live</code>. Thường là quên <code>rmmod</code> trước khi nạp bản mới.',
         '<code>rmmod hello</code> rồi <code>insmod</code> lại. Kiểm tra bằng <code>lsmod</code>.'],
        ['<code>insmod: can\'t insert \'/bad-vermagic.ko\': invalid module format</code> (<code>rc=8</code>)',
         'Kernel từ chối trước khi chạy mã: <code>dmesg</code> nói lý do — ở đây <code>version magic \'…\' should be \'…\'</code>. Module build từ cây kernel khác với kernel đang chạy.',
         'So <code>modinfo -F vermagic FILE.ko</code> với <code>uname -r</code> trên máy đích. Build lại theo đúng cây; boot đúng <code>Image</code> của cây đó.'],
        ['<code>insmod: can\'t insert \'/fail_init.ko\': No such device</code> (<code>rc=19</code>), <code>dmesg</code> có dòng của <code>init</code>',
         'Hàm <code>init</code> của module trả về <code>-ENODEV</code>. Kernel đã chạy mã của bạn rồi gỡ module.',
         'Lỗi ở logic trong <code>init</code>. Đọc các dòng <code>pr_*</code> ngay trước đó trong <code>dmesg</code>. Dòng lặp hai lần là do BusyBox thử lại, không phải kernel.'],
        ['<code>rmmod: can\'t unload module \'hello\': No such file or directory</code>',
         'Không có module nào tên đó đang nạp (đã gỡ rồi, hoặc gõ sai tên).',
         '<code>lsmod</code>. <code>rmmod</code> nhận tên module, không phải đường dẫn file.'],
        ['<code>rmmod: can\'t unload module \'noexit\': Device or resource busy</code>, <code>lsmod</code> ghi <code>[permanent]</code>',
         'Module có <code>module_init</code> nhưng không có <code>module_exit</code> — kernel không có cách dọn dẹp nó (<code>kernel/module/main.c:818–825</code>).',
         'Thêm <code>module_exit</code>, build lại, rồi <b>boot lại</b> QEMU — module <code>[permanent]</code> không bao giờ gỡ được.'],
        ['<code>lsmod</code> vẫn ghi <code>Tainted</code> sau khi đã <code>rmmod</code> hết',
         'Không phải lỗi: taint là vĩnh viễn trong một lần boot.',
         'Boot lại nếu cần một kernel \"sạch\" để gửi báo lỗi.']
      ] },

    /* ============================================================
       7. RECAP
       ============================================================ */
    { t: 'recap', items: [
      'Một module là file ELF <b><code>REL</code></b> mà <b>chính kernel</b> nạp, sửa địa chỉ và gọi. Nó không có <code>main()</code>, không có PID, không có libc: chỉ chạy khi kernel gọi <code>init</code> (nhân danh <code>insmod</code>) và <code>exit</code> (nhân danh <code>rmmod</code>).',
      '<code>module_init(f)</code> tạo bí danh <code>init_module</code> cho <code>f</code> — <code>nm</code> thấy cả hai tên ở cùng offset. <code>init</code> trả <b>0</b> = ở lại, số âm = bị gỡ ngay và <code>exit</code> không bao giờ được gọi.',
      'Build ngoài cây: <code>make -C ~/bai38/linux-6.18.45 M=$PWD ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules</code>, Makefile chỉ cần <code>obj-m</code>. <b>1,49 s</b> so với <b>36 s</b> relink kernel.',
      '<code>hello.ko</code>: <b>104 728</b> B trên đĩa, <b>5 544</b> B sau <code>--strip-debug</code>, <b>1 580</b> B nạp được, <b>100</b> B mã của bạn — và <b>12 288</b> B (3 trang) trong kernel vì <code>STRICT_MODULE_RWX</code>.',
      '<code>vermagic</code> <code>6.18.45-embedded SMP preempt mod_unload aarch64</code> phải trùng kernel đích. Sai một ký tự → <code>invalid module format</code>; lý do thật chỉ có trong <b><code>dmesg</code></b>.',
      '<code>MODULE_LICENSE</code> bắt buộc (<code>modpost</code> chặn nếu thiếu). Không phải GPL → nạp được nhưng taint <b>P</b>, lockdep tắt, và mất quyền dùng <b>12 425</b> hàm <code>EXPORT_SYMBOL_GPL</code>.',
      '<code>__init</code> được giải phóng sau khi chạy: <code>initsize</code> = <b>0</b>, <code>hello_init</code> biến khỏi <code>/proc/kallsyms</code>.',
      '<code>tainted</code> <b>0 → 4096 → 4097</b> (bit 12 <code>O</code>, bit 0 <code>P</code>) và không giảm khi <code>rmmod</code> — chỉ boot lại mới xoá.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Module hôm nay chỉ gọi đúng một hàm của kernel: <code>_printk</code>. <b>Bài 51 — Luật chơi ' +
         'trong kernel space</b> mở rộng nó thành những thứ một driver thật cần, và cho bạn thấy cái giá ' +
         'của từng luật: các mức log của <code>printk</code> và vì sao dòng của bạn hiện trên console ' +
         'hôm nay; <code>kmalloc</code>/<code>kfree</code> thay cho <code>malloc</code>; ' +
         '<code>copy_to_user</code>/<code>copy_from_user</code> thay cho việc đọc thẳng con trỏ của ' +
         'userspace; vì sao cờ <code>-mgeneral-regs-only</code> cấm bạn dùng <code>float</code>; stack ' +
         'kernel nhỏ tới mức nào. Và bạn sẽ cố tình cho một module đọc một con trỏ sai, để xem một ' +
         '<b>oops</b> trông như thế nào — dòng taint <code>O</code> bạn vừa học sẽ nằm ngay trong đó.' }
  ],

  quiz: [
    { q: 'Bạn build <code>hello.ko</code> trên WSL rồi chép sang bo mạch. <code>insmod</code> báo <code>invalid module format</code>. Việc nên làm <b>đầu tiên</b> là gì?',
      opts: [
        'Build lại module với <code>-O0</code> để tránh tối ưu hoá lạ.',
        'Chạy <code>dmesg | tail</code> trên bo mạch để đọc lý do kernel từ chối, rồi so <code>modinfo -F vermagic hello.ko</code> với <code>uname -r</code> của bo mạch.',
        'Thêm <code>MODULE_LICENSE("GPL")</code> vì thiếu giấy phép gây ra lỗi này.',
        'Nạp lại bằng <code>insmod -f</code> để bỏ qua kiểm tra.'
      ],
      a: 1,
      why: '<code>invalid module format</code> là cách <code>insmod</code> dịch <code>ENOEXEC</code> — chung cho vermagic sai, kiến trúc sai, file hỏng. Chỉ <code>dmesg</code> nói cái gì sai, như dòng <code>version magic \'…\' should be \'…\'</code> ở bước 5. Thiếu giấy phép thì <code>modpost</code> đã chặn lúc build, không có <code>.ko</code> để nạp. Ép nạp (<code>CONFIG_MODULE_FORCE_LOAD</code>) che triệu chứng và để lại một kernel dễ hỏng; cách chữa đúng là build lại theo cây kernel của bo mạch.' },

    { q: 'Trong <code>hello.c</code>, bạn đổi tên <code>hello_init</code> thành <code>start_here</code> (và sửa <code>module_init(start_here)</code> theo). Điều gì xảy ra?',
      opts: [
        'Kernel không tìm thấy hàm khởi tạo và từ chối nạp module.',
        'Không có gì khác: <code>module_init</code> tạo ký hiệu <code>init_module</code> làm bí danh cho <code>start_here</code>, và kernel chỉ tìm <code>init_module</code>.',
        'Module nạp được nhưng hàm khởi tạo không bao giờ chạy.',
        'Build lỗi vì tên hàm khởi tạo phải kết thúc bằng <code>_init</code>.'
      ],
      a: 1,
      why: 'Macro <code>module_init</code> sinh <code>int init_module(void) __attribute__((alias("start_here")))</code>. Bước 2 thấy <code>hello_init</code> và <code>init_module</code> cùng offset <code>0</code> trong <code>nm</code> — hai tên, một hàm. Tên bạn chọn chỉ cần khớp giữa định nghĩa và macro; <code>__inittest</code> kiểm tra kiểu lúc dịch.' },

    { q: '<code>insmod /fail_init.ko</code> trả <code>No such device</code>, và <code>dmesg</code> có dòng <code>fail_init: init called, returning -ENODEV</code>. Kết luận nào đúng?',
      opts: [
        'Kernel từ chối module vì vermagic sai; dòng <code>init called</code> là của kernel.',
        'Module đã được nạp và vẫn nằm trong <code>lsmod</code>, chỉ là báo lỗi.',
        'Kernel đã vượt qua mọi kiểm tra và chạy hàm <code>init</code>; hàm đó trả <code>-ENODEV</code> nên kernel gỡ module ngay, không gọi <code>exit</code>.',
        '<code>insmod</code> không đọc được file <code>/fail_init.ko</code>.'
      ],
      a: 2,
      why: 'Quy tắc chẩn đoán của bài: có dòng do <code>init</code> in ra trong <code>dmesg</code> → kernel đã chạy mã của bạn, lỗi nằm ở logic. <code>insmod</code> nhận đúng mã lỗi <code>init</code> trả về (<code>rc=19</code> = <code>ENODEV</code>). <code>lsmod</code> sau đó trống, và không có dòng <code>exit called</code> vì <code>exit</code> chỉ gọi cho module từng <code>Live</code>.' },

    { q: 'Sau khi <code>insmod /hello.ko</code>, <code>/sys/module/hello/initsize</code> đọc <code>0</code> và <code>grep hello_init /proc/kallsyms</code> không in gì. Vì sao?',
      opts: [
        'Module nạp thất bại; chỉ còn lại phần thông tin.',
        '<code>__init</code> đặt <code>hello_init</code> vào <code>.init.text</code>, và kernel giải phóng vùng đó ngay sau khi hàm khởi tạo trả về.',
        '<code>/proc/kallsyms</code> chỉ liệt kê ký hiệu của kernel lõi, không liệt kê module.',
        '<code>hello_init</code> là <code>static</code> nên không bao giờ có tên trong kernel.'
      ],
      a: 1,
      why: 'Bước 4 đo đúng điều này: <code>coresize</code> 12 288, <code>initsize</code> 0, và <code>kallsyms</code> vẫn liệt kê <code>hello_exit [hello]</code> — cũng là <code>static</code>, cũng của module. Chỉ phần init bị thu hồi (<code>do_init_module()</code>). Kernel lõi làm tương tự lúc boot: <code>Freeing unused kernel memory: 11648K</code>.' },

    { q: 'Bạn nạp rồi gỡ một module <code>Proprietary</code>. <code>lsmod</code> trống nhưng vẫn ghi <code>Tainted: P</code>, và <code>tainted</code> = <code>4097</code>. Điều nào đúng?',
      opts: [
        '<code>rmmod</code> chưa gỡ hết; module vẫn nằm ẩn trong bộ nhớ.',
        'Taint là vĩnh viễn trong một lần boot: kernel không thể chắc mã đã gỡ không để lại gì. 4097 = bit 12 (<code>O</code>, ngoài cây) + bit 0 (<code>P</code>, độc quyền).',
        '4097 nghĩa là có 4097 module đã từng được nạp.',
        'Chạy <code>echo 0 &gt; /proc/sys/kernel/tainted</code> là cách đúng để làm sạch kernel.'
      ],
      a: 1,
      why: '<code>tainted</code> là mặt nạ bit (<code>Documentation/admin-guide/tainted-kernels.rst</code>): 4096 = 2<sup>12</sup> (<code>O</code>) từ <code>hello</code>, +1 (<code>P</code>) từ <code>prop</code>. Dấu vết tồn tại chính để người đọc một báo oops sau này biết kernel đã từng chạy mã không kiểm chứng. Chỉ boot lại mới đưa về 0.' },

    { q: 'Một đồng nghiệp viết Makefile cho module ARM64 nhưng quên <code>ARCH=arm64</code> (vẫn có <code>CROSS_COMPILE=aarch64-linux-gnu-</code>). Thông báo nào bạn chờ đợi?',
      opts: [
        '<code>ERROR: modpost: missing MODULE_LICENSE()</code>',
        '<code>aarch64-linux-gnu-gcc: error: unrecognized argument in option \'-mcmodel=kernel\'</code>, kèm <code>-mno-sse</code>, <code>-m64</code>…',
        'Build thành công và tạo ra một <code>.ko</code> x86-64.',
        '<code>warning: the compiler differs from the one used to build the kernel</code>'
      ],
      a: 1,
      why: 'Không có <code>ARCH</code>, Kbuild lấy kiến trúc của máy host (x86) và thêm cờ từ <code>arch/x86/Makefile</code> (dòng 178 thêm <code>-mcmodel=kernel</code>) — những cờ trình biên dịch ARM64 không hiểu. Cảnh báo <code>compiler differs</code> là triệu chứng của trường hợp ngược lại: có <code>ARCH</code> nhưng quên <code>CROSS_COMPILE</code>. Cả hai đều được đo trên máy viết bài và nằm trong bảng Lỗi thường gặp.' }
  ]
});

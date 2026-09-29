/* Bài 48 — initramfs và các loại rootfs
   Chặng 09 — Root filesystem
   Nối tiếp Bài 47: đóng gói chính ~/bai47/rootfs thành một kho cpio và boot nó không cần ổ đĩa,
   đo nó cạnh ảnh ext4 (kích thước, thời gian giải nén, RAM), thấy lại vì sao initramfs phải tự gắn
   devtmpfs; initrd vs initramfs (linuxrc, BLK_DEV_RAM, "invalid magic"); rồi ba hệ thống file của
   thiết bị thật: SquashFS chỉ đọc, overlayfs + switch_root từ một initramfs giai đoạn 1, và UBIFS
   trên flash MTD của QEMU virt (tự viết erase_mtd.c vì BusyBox defconfig không có flash_eraseall).
   Mọi số liệu đo 2026-09-29 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   squashfs-tools 1:4.4-1ubuntu0.3), kernel ~/bai38/linux-6.18.45, module lấy từ
   ~/bai40/modroot-stripped. Máy B không có sudo không mật khẩu, nên mksquashfs lúc kiểm chứng chạy
   từ chính gói .deb đó giải nén bằng dpkg-deb -x — cùng binary, cùng phiên bản với apt-get install.
   Không dạy PID 1 / systemd (Bài 49), không dạy viết module hay modprobe (Chặng 10), không dạy OTA A/B
   (Bài 69), không build lại kernel. */

Lesson.register({
  id: 'bai-48',
  title: 'initramfs và các loại rootfs',
  minutes: 55,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Suốt Chặng 07 và Chặng 08, kernel của bạn boot từ một initramfs nén mà Bài 32 để lại. Suốt ' +
    'Chặng 09, nó boot từ một ảnh ext4 64 MiB. Hai cách đưa rootfs cho kernel, cùng một dòng ' +
    '<code>Run … as init process</code> ở cuối — nhưng bạn chưa bao giờ đặt chúng cạnh nhau để ' +
    'hỏi: khác nhau ở đâu, tốn gì, và khi nào dùng cái nào?<br><br>' +
    'Bài này bắt đầu bằng một thí nghiệm tưởng chừng hiển nhiên: lấy nguyên thư mục ' +
    '<code>~/bai47/rootfs</code> vừa boot tốt từ ổ đĩa, đóng gói thành cpio, đưa qua ' +
    '<code>-initrd</code>. Nó sẽ <b>không</b> boot. Sửa xong lỗi thứ nhất, nó sẽ in một câu báo ' +
    'lỗi mỗi giây mãi mãi. Hai dòng sửa sau đó, bạn sẽ hiểu chính xác kernel đối xử với một ' +
    'initramfs khác với một ổ đĩa ở hai điểm nào.<br><br>' +
    'Nửa sau của bài rời khỏi ổ đĩa ảo để đến với thứ mà bo mạch thật dùng: một rootfs ' +
    '<b>SquashFS</b> nén, chỉ đọc, không thể hỏng vì mất điện; một lớp <b>overlayfs</b> để nó ' +
    'trông như ghi được; và một phân vùng <b>UBIFS</b> trên chính con chip flash NOR 128 MiB mà ' +
    'máy <code>virt</code> vẫn gắn sẵn từ Bài 30 — nơi dữ liệu của bạn sống sót qua ' +
    '<code>reboot</code>.',

  goals: [
    'Đóng gói một thư mục rootfs thành initramfs bằng <code>cpio -H newc</code>, boot nó không ' +
      'cần ổ đĩa, và sửa hai chỗ một rootfs viết cho ổ đĩa sẽ hỏng khi chạy từ RAM: ' +
      '<code>/init</code> và devtmpfs.',
    'Đo và so sánh initramfs với rootfs trên đĩa bằng số thật: kích thước file, thời gian ' +
      'giải nén theo từng kiểu nén, RAM bị giữ lúc boot và RAM bị chiếm vĩnh viễn.',
    'Phân biệt được <b>initrd</b> (ảnh đĩa khối trong RAM, <code>/linuxrc</code>) với ' +
      '<b>initramfs</b> (kho cpio giải nén vào tmpfs, <code>/init</code>), và đọc được thông ' +
      'báo kernel in ra khi nhận nhầm loại.',
    'Tạo và boot một rootfs <b>SquashFS</b> chỉ đọc, rồi dùng một initramfs giai đoạn 1 để phủ ' +
      '<b>overlayfs</b> lên nó và <code>switch_root</code> sang — giải thích được lớp upper, lower ' +
      'và whiteout từ những gì thấy trong thư mục upper.',
    'Chọn được hệ thống file phù hợp cho flash thô (MTD) và cho thiết bị khối, tạo một volume ' +
      '<b>UBIFS</b> trên flash của QEMU, và chứng minh dữ liệu còn nguyên sau <code>reboot</code>.',
    'Từ một thông báo như <code>invalid magic at start of compressed archive</code>, ' +
      '<code>can\'t open /dev/ttyAMA0</code> lặp mỗi giây hay <code>unknown symbol in module</code>, ' +
      'chỉ ra được rootfs đang thiếu thứ gì.'
  ],

  blocks: [

    /* ============================================================
       1. HAI ĐƯỜNG VÀO ROOTFS
       ============================================================ */
    { t: 'h2', x: 'Kernel luôn có một rootfs trong RAM — câu hỏi là nó dùng tiếp hay bỏ' },

    { t: 'p', x:
      'Bài 46 đã cho bạn thấy một điều bất ngờ: ngay cả khi boot từ ổ đĩa, trước khi chạm tới ' +
      '<code>root=</code>, kernel đã có sẵn một hệ thống file gốc trong RAM. Nó tên là ' +
      '<b>rootfs</b> — một tmpfs (hoặc ramfs) mà kernel tự gắn vào <code>/</code> ngay khi khởi ' +
      'động — và bên trong chỉ có kho cpio <b>512 byte</b> dựng sẵn trong <code>Image</code>: ' +
      '<code>/dev</code>, <code>/dev/console</code>, <code>/root</code>. Đó là lý do shell ở Bài 46 ' +
      'có console dù ổ đĩa không có <code>/dev</code>.' },

    { t: 'p', x:
      '<b>initramfs</b> chỉ là thêm nội dung vào chính cái rootfs đó. Bootloader (ở đây là QEMU ' +
      'với <code>-initrd</code>) đặt một kho cpio vào RAM và báo địa chỉ cho kernel qua Device Tree ' +
      '— hai thuộc tính <code>linux,initrd-start</code> / <code>linux,initrd-end</code> mà Bài 45 ' +
      'đã thấy trong <code>/chosen</code>. Kernel giải nén kho đó <b>đè lên</b> rootfs, rồi kiểm ' +
      'tra một điều duy nhất: có file <code>/init</code> (hoặc đường dẫn trong <code>rdinit=</code>) ' +
      'chạy được không? Từ câu trả lời đó, hai đường tách hẳn nhau:' },

    { t: 'fig',
      cap: 'Một câu hỏi rẽ đôi cả quá trình boot. Có <code>/init</code> trong rootfs → kernel chạy ' +
           'nó ngay và <b>không bao giờ</b> đọc <code>root=</code>, không gắn devtmpfs — mọi việc ' +
           'còn lại là của <code>/init</code>. Không có → <code>prepare_namespace()</code> gắn ổ ' +
           'đĩa (chỉ đọc), gắn devtmpfs lên <code>/dev</code> của nó, rồi mới tìm ' +
           '<code>/sbin/init</code>. Rootfs trong RAM vẫn còn đó, chỉ bị ổ đĩa che mất.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ quyết định lúc boot: kernel giải nén cpio vào rootfs trong RAM, kiểm tra /init; có thì chạy /init làm PID 1, không thì prepare_namespace gắn root=, gắn devtmpfs rồi chạy /sbin/init">' +
        '<rect class="d-box" x="20" y="16" width="200" height="58" rx="6"/>' +
        '<text class="d-t" x="34" y="40">Kernel khởi động</text>' +
        '<text class="d-ts" x="34" y="60">rootfs = tmpfs rỗng tại /</text>' +
        '<line class="d-line" x1="220" y1="45" x2="252" y2="45"/>' +
        '<path class="d-arrow" d="M 260 45 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-p" x="260" y="16" width="200" height="58" rx="6"/>' +
        '<text class="d-t" x="274" y="40">Giải nén cpio vào đó</text>' +
        '<text class="d-ts" x="274" y="60">512 B dựng sẵn + file -initrd</text>' +
        '<line class="d-line" x1="460" y1="45" x2="492" y2="45"/>' +
        '<path class="d-arrow" d="M 500 45 l -8 -4 l 0 8 z"/>' +
        '<rect class="d-box-a" x="500" y="16" width="200" height="58" rx="6"/>' +
        '<text class="d-t" x="514" y="40">Có /init chạy được?</text>' +
        '<text class="d-ts" x="514" y="60">theo rdinit=, mặc định /init</text>' +
        '<line class="d-line" x1="560" y1="74" x2="560" y2="112"/>' +
        '<path class="d-arrow" d="M 560 120 l -4 -8 l 8 0 z"/>' +
        '<text class="d-t" x="570" y="100">Có</text>' +
        '<rect class="d-box-g" x="420" y="120" width="280" height="96" rx="6"/>' +
        '<text class="d-t" x="434" y="144">initramfs: chạy /init làm PID 1</text>' +
        '<text class="d-ts" x="434" y="166">root= bị bỏ qua hoàn toàn</text>' +
        '<text class="d-ts" x="434" y="184">devtmpfs KHÔNG được gắn</text>' +
        '<text class="d-ts" x="434" y="202">/ vẫn là tmpfs trong RAM, ghi được</text>' +
        '<line class="d-line" x1="520" y1="74" x2="520" y2="96"/>' +
        '<line class="d-line" x1="520" y1="96" x2="150" y2="96"/>' +
        '<line class="d-line" x1="150" y1="96" x2="150" y2="112"/>' +
        '<path class="d-arrow" d="M 150 120 l -4 -8 l 8 0 z"/>' +
        '<text class="d-t" x="300" y="90">Không</text>' +
        '<rect class="d-box-w" x="20" y="120" width="360" height="96" rx="6"/>' +
        '<text class="d-t" x="34" y="144">prepare_namespace()</text>' +
        '<text class="d-ts" x="34" y="166">gắn root= lên /, mặc định chỉ đọc (Bài 46)</text>' +
        '<text class="d-ts" x="34" y="184">devtmpfs_mount() → /dev có 141 file thiết bị</text>' +
        '<text class="d-ts" x="34" y="202">rồi thử /sbin/init → /etc/init → /bin/init → /bin/sh</text>' +
        '<rect class="d-box" x="20" y="240" width="680" height="72" rx="6"/>' +
        '<text class="d-t" x="34" y="264">Hệ quả trực tiếp cho bài này</text>' +
        '<text class="d-ts" x="34" y="284">Rootfs của Bài 47 không có /init, và dựa vào kernel để có /dev. Chạy từ RAM, cả hai</text>' +
        '<text class="d-ts" x="34" y="300">giả định đều sai — bước 1 phần Thực hành sẽ cho bạn thấy từng cái hỏng ra sao.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hai hàm trong hình đều có thật và bạn có thể đọc chúng. Câu hỏi \"có <code>/init</code> ' +
      'không\" nằm ở <code>init/main.c:1559–1564</code>: nếu <code>init_eaccess()</code> thất bại, ' +
      'kernel in đúng dòng <code>check access for rdinit=/init failed: -2, ignoring</code> mà bạn ' +
      'đã gặp hàng chục lần từ Bài 41, rồi gọi <code>prepare_namespace()</code>. Còn ' +
      '<code>devtmpfs_mount()</code> là dòng <b>cuối</b> của <code>prepare_namespace()</code> ' +
      '(<code>init/do_mounts.c:493</code>) — nên con đường initramfs, vốn không bao giờ vào hàm ' +
      'đó, cũng không bao giờ có devtmpfs. Bài 41 đã giải thích luật chọn <code>rdinit=</code>; ' +
      'Bài 46 đã chỉ ra dòng 493. Bài này là nơi hai điều đó gặp nhau.' },

    { t: 'cal', kind: 'tip', title: 'Một câu để nhớ',
      x: '<b>initramfs thì tự lo tất cả; ổ đĩa thì kernel lo phần đầu.</b> Có <code>/init</code>, ' +
         'kernel lùi lại: không gắn ổ nào, không gắn <code>/dev</code>, không đọc ' +
         '<code>root=</code>. Mọi thứ <code>/init</code> cần — kể cả <code>/dev/ttyAMA0</code> để ' +
         'mở một shell — nó phải tự tạo. Đây là nguyên tắc, không phải chi tiết: sau này, khi một ' +
         'initramfs của Buildroot hay Yocto \"treo\" lúc boot, câu hỏi đầu tiên luôn là ' +
         '<code>/init</code> đã tự gắn những gì.' },

    { t: 'h3', x: 'Vì sao lại cần một rootfs trong RAM' },

    { t: 'p', x:
      'Nếu ổ đĩa boot được, sao phải đóng gói lại? Vì có ba loại việc mà ổ đĩa không làm được:' },

    { t: 'table',
      head: ['Tình huống', 'Vì sao ổ đĩa không đủ', 'Ví dụ thật'],
      rows: [
        ['<b>Cần làm gì đó trước khi có ổ đĩa</b>',
         'Driver lưu trữ, giải mã, ghép RAID hay chọn phân vùng A/B là module hoặc chương trình ' +
         'userspace — chúng phải chạy <i>trước</i> khi rootfs thật được gắn.',
         'Ubuntu trên WSL của bạn: <code>/proc/cmdline</code> có <code>initrd=\\initrd.img</code>. ' +
         'Máy tính để bàn nào cũng boot qua một initramfs.'],
        ['<b>Toàn bộ hệ thống sống trong RAM</b>',
         'Không có ổ, hoặc không muốn ghi lên ổ: thiết bị nhỏ, rescue, cài đặt qua mạng. Tắt máy là ' +
         'sạch.',
         'Router nhỏ, ảnh khôi phục của bo mạch, bộ cài qua PXE.'],
        ['<b>Rootfs thật không ghi được</b>',
         'SquashFS chỉ đọc; phải có ai đó dựng lớp ghi được (overlayfs) rồi mới chuyển sang.',
         'Thiết bị IoT, set-top box, bước 5 của bài này.']
      ] },

    /* ============================================================
       2. INITRD VÀ INITRAMFS
       ============================================================ */
    { t: 'h2', x: 'initrd và initramfs: cùng tên tham số, hai thế hệ khác nhau' },

    { t: 'p', x:
      'Tham số QEMU tên là <code>-initrd</code>, thuộc tính Device Tree tên là ' +
      '<code>linux,initrd-start</code>, Kconfig tên là <code>CONFIG_BLK_DEV_INITRD</code> — nhưng ' +
      'từ Bài 32 tới giờ bạn chưa từng dùng một <b>initrd</b> nào. Cái tên là di sản của thế hệ ' +
      'trước. Hai thế hệ khác nhau ở mọi tầng:' },

    { t: 'table',
      head: ['', '<b>initrd</b> (trước 2.6, đã lỗi thời)', '<b>initramfs</b> (hiện nay)'],
      rows: [
        ['File là gì', 'Một <b>ảnh đĩa</b> — thường ext2, như <code>rootfs.img</code> của Bài 46', 'Một <b>kho cpio</b> định dạng <code>newc</code>, có thể nén'],
        ['Kernel làm gì với nó', 'Chép vào một <b>thiết bị khối RAM</b> <code>/dev/ram0</code> rồi gắn như gắn đĩa', 'Giải nén từng file vào rootfs (tmpfs) — không có thiết bị khối nào'],
        ['Cần gì trong kernel', '<code>CONFIG_BLK_DEV_RAM</code> <b>và</b> driver của chính hệ thống file đó (ext2…)', 'Chỉ bộ giải nén (<code>CONFIG_RD_GZIP</code>, <code>RD_XZ</code>…)'],
        ['Chương trình đầu tiên', '<code>/linuxrc</code> — chạy như một tiến trình phụ, <b>không</b> phải PID 1', '<code>/init</code> — chính là PID 1'],
        ['Chuyển sang rootfs thật', 'Kernel tự làm sau khi <code>/linuxrc</code> thoát, hoặc <code>pivot_root</code>', '<code>/init</code> tự làm, bằng <code>switch_root</code>'],
        ['RAM', 'Tốn hai lần: bản trong <code>/dev/ram0</code> + page cache khi đọc nó', 'Chỉ một lần: file nằm thẳng trong tmpfs'],
        ['Kích thước', 'Cố định lúc tạo ảnh, phải đoán trước', 'Co giãn theo nội dung']
      ] },

    { t: 'p', x:
      'Symlink <code>/linuxrc → bin/busybox</code> mà <code>make install</code> tạo ở Bài 47 là ' +
      'tàn tích của cột trái. BusyBox có tuỳ chọn <code>CONFIG_LINUXRC</code> để applet ' +
      '<code>init</code> chịu chạy khi được gọi bằng tên <code>linuxrc</code> và không đòi làm PID 1 ' +
      '(<code>init/init.c:1078–1080</code>) — đúng vai trò của <code>/linuxrc</code> trong initrd. ' +
      'Với initramfs, symlink đó vô dụng nhưng vô hại.' },

    { t: 'p', x:
      'Còn phía kernel, đường initrd đang trên đường bị gỡ bỏ. Trong <code>init/do_mounts_initrd.c</code> ' +
      'của cây nguồn bạn đang có, hàm xử lý nó bắt đầu bằng một lời cảnh báo không vòng vo:' },

    { t: 'code', where: 'file', name: 'init/do_mounts_initrd.c — dòng 92 (Linux 6.18.45)', lang: 'c', code:
      'pr_warn("using deprecated initrd support, will be removed soon.\\n");' },

    { t: 'p', x:
      'Và kernel của bạn thậm chí không có đường đó: <code>defconfig</code> của ARM64 để ' +
      '<code># CONFIG_BLK_DEV_RAM is not set</code>. Không có thiết bị khối RAM, một ảnh đĩa đưa ' +
      'qua <code>-initrd</code> chỉ còn là một kho cpio hỏng. Bước 3 sẽ cho bạn xem kernel nói gì ' +
      'khi nhận nó.' },

    { t: 'terms', items: [
      ['rootfs', '', 'Hệ thống file trong RAM (tmpfs hoặc ramfs) mà kernel luôn gắn vào <code>/</code> lúc khởi động. Có mặt trong mọi lần boot, kể cả boot từ đĩa — khi đó nó chỉ bị che đi.'],
      ['initramfs', 'initial RAM filesystem', 'Kho cpio được giải nén vào rootfs. Nếu có <code>/init</code>, kernel chạy nó làm PID 1 và để nó lo mọi việc còn lại.'],
      ['initrd', 'initial RAM disk', 'Thế hệ cũ: một ảnh đĩa nạp vào thiết bị khối <code>/dev/ram0</code>, chạy <code>/linuxrc</code>. Đã lỗi thời, cần <code>CONFIG_BLK_DEV_RAM</code>.'],
      ['switch_root', '', 'Lệnh mà <code>/init</code> dùng để bỏ initramfs và chuyển sang rootfs thật: xoá sạch rootfs trong RAM, đưa rootfs mới lên <code>/</code>, rồi <code>exec</code> init của nó. Phải chạy với PID 1.'],
      ['newc', '', 'Biến thể cpio duy nhất kernel đọc được (Bài 32). <code>file</code> gọi nó là <code>ASCII cpio archive (SVR4 with no CRC)</code>.']
    ] },

    /* ============================================================
       3. HỆ THỐNG FILE CHO THIẾT BỊ THẬT
       ============================================================ */
    { t: 'h2', x: 'Flash không phải ổ cứng: chọn hệ thống file cho thiết bị thật' },

    { t: 'p', x:
      'Ảnh ext4 của Bài 46–47 nằm trên một <code>virtio-blk</code> — một <b>thiết bị khối</b>: chia ' +
      'thành các khối 512 byte hay 4 KiB, ghi đè khối nào cũng được, bao nhiêu lần cũng được. Thẻ ' +
      'SD, eMMC, ổ SSD cũng trình diện với kernel theo đúng cách đó, vì bên trong chúng có một bộ ' +
      'điều khiển (FTL — <i>flash translation layer</i>) che đi bản chất thật của flash.' },

    { t: 'p', x:
      'Bản chất thật đó là: flash <b>không ghi đè được</b>. Một ô flash chỉ có thể chuyển từ bit ' +
      '<code>1</code> sang <code>0</code>. Muốn đưa về <code>1</code>, phải <b>xoá</b> — và chỉ xoá ' +
      'được cả một <b>khối xoá</b> (erase block) lớn, thường 64 KiB tới vài MiB. Mỗi khối chỉ chịu ' +
      'được một số lần xoá hữu hạn (hàng nghìn tới trăm nghìn) trước khi hỏng. Hình dung một cuốn ' +
      'sổ viết bằng bút mực: sửa một chữ thì không được, phải xé cả trang, và sổ chỉ có bấy nhiêu ' +
      'trang. Khi con chip flash nối thẳng vào SoC mà không có FTL — flash NOR để boot, flash NAND ' +
      'thô trên router và camera — kernel nhìn thấy nó như một thiết bị <b>MTD</b> ' +
      '(<i>Memory Technology Device</i>), không phải thiết bị khối.' },

    { t: 'p', x:
      'Máy <code>virt</code> có sẵn một con chip như vậy. Log boot nào của bạn từ Bài 40 tới giờ ' +
      'cũng có mấy dòng này, chỉ là chưa ai đọc chúng:' },

    { t: 'code', where: 'out', nocopy: true, code:
      '[    0.527225] physmap-flash 0.flash: physmap platform flash device: [mem 0x00000000-0x03ffffff]\n' +
      '[    0.528714] 0.flash: Found 2 x16 devices at 0x0 in 32-bit bank. Manufacturer ID 0x000000 Chip ID 0x000000\n' +
      '[    0.531231] physmap-flash 0.flash: physmap platform flash device: [mem 0x04000000-0x07ffffff]\n' +
      '[    0.531835] 0.flash: Found 2 x16 devices at 0x0 in 32-bit bank. Manufacturer ID 0x000000 Chip ID 0x000000\n' +
      '[    0.532847] Concatenating MTD devices:\n' +
      '[    0.532961] (0): "0.flash"\n' +
      '[    0.533056] (1): "0.flash"\n' +
      '[    0.533140] into device "0.flash"',
      notes: [
        'Trích từ dòng 203–214 của một log boot bất kỳ với kernel <code>~/bai38</code>. Hai vùng 64 MiB ở <code>0x0</code> và <code>0x4000000</code> chính là hai bank flash trong bản đồ bộ nhớ Bài 30 đã vẽ; U-Boot ở Bài 35 cất biến môi trường vào vùng thứ hai. Kernel ghép chúng thành <b>một</b> thiết bị MTD 128 MiB. Bước 6 sẽ đặt UBIFS lên đó.'
      ] },

    { t: 'p', x:
      'Hai loại thiết bị cần hai họ hệ thống file khác nhau. Trên thiết bị khối, bạn dùng ext4 hay ' +
      'SquashFS như trên máy tính. Trên MTD, cần một lớp biết xoá theo khối, <b>cân bằng hao mòn</b> ' +
      '(wear leveling — rải việc ghi đều ra mọi khối để không khối nào chết sớm) và né khối hỏng. ' +
      'Lớp đó là <b>UBI</b>, và hệ thống file chạy trên nó là <b>UBIFS</b>:' },

    { t: 'fig',
      cap: 'Hai chồng tầng, chọn theo phần cứng. Bên trái, bộ điều khiển trong thẻ SD/eMMC đã lo xoá ' +
           'khối và hao mòn, nên kernel dùng hệ thống file thường. Bên phải, flash thô nối thẳng: ' +
           'UBI nhận mọi khối xoá vật lý (PEB), tự lo hao mòn và khối hỏng, rồi cho UBIFS những ' +
           '<b>volume</b> gồm các khối logic (LEB). Đặt ext4 thẳng lên MTD là sai tầng — và kernel ' +
           'cũng không cho làm.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Hai chồng tầng lưu trữ: bên trái thẻ SD eMMC với FTL, thiết bị khối, ext4 hoặc SquashFS; bên phải flash NOR NAND thô, MTD, UBI, UBIFS">' +
        '<text class="d-t" x="30" y="24">Thiết bị khối</text>' +
        '<text class="d-t" x="390" y="24">Flash thô (MTD)</text>' +
        '<rect class="d-box-g" x="30" y="40" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="44" y="62">ext4 · SquashFS · EROFS</text>' +
        '<text class="d-ts" x="44" y="78">hệ thống file thường</text>' +
        '<rect class="d-box" x="30" y="100" width="300" height="46" rx="6"/>' +
        '<text class="d-tm" x="44" y="122">/dev/vda, /dev/mmcblk0</text>' +
        '<text class="d-ts" x="44" y="138">thiết bị khối — ghi đè từng khối được</text>' +
        '<rect class="d-box-p" x="30" y="160" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="44" y="182">FTL trong bộ điều khiển</text>' +
        '<text class="d-ts" x="44" y="198">tự xoá, tự cân bằng hao mòn, giấu đi</text>' +
        '<rect class="d-box-w" x="30" y="220" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="44" y="242">Chip flash NAND</text>' +
        '<text class="d-ts" x="44" y="258">thẻ SD, eMMC, SSD</text>' +
        '<rect class="d-box-g" x="390" y="40" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="404" y="62">UBIFS</text>' +
        '<text class="d-tm" x="404" y="78">mount -t ubifs ubi0:data</text>' +
        '<rect class="d-box-a" x="390" y="100" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="404" y="122">UBI — volume gồm các LEB</text>' +
        '<text class="d-ts" x="404" y="138">cân bằng hao mòn, né khối hỏng</text>' +
        '<rect class="d-box" x="390" y="160" width="300" height="46" rx="6"/>' +
        '<text class="d-tm" x="404" y="182">/dev/mtd0</text>' +
        '<text class="d-ts" x="404" y="198">MTD — đọc, ghi, xoá theo khối xoá (PEB)</text>' +
        '<rect class="d-box-w" x="390" y="220" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="404" y="242">Chip flash NOR / NAND thô</text>' +
        '<text class="d-ts" x="404" y="258">nối thẳng vào SoC; virt: 128 MiB NOR</text>' +
        '</svg>' },

    { t: 'p', x:
      'Với bức tranh đó, bảng dưới là toàn bộ lựa chọn mà một kỹ sư nhúng phải cân nhắc. Mỗi dòng ' +
      'trả lời một câu hỏi: ghi được không, chạy trên loại thiết bị nào, và chịu mất điện ra sao.' },

    { t: 'table',
      head: ['Hệ thống file', 'Ghi được', 'Chạy trên', 'Dùng khi'],
      rows: [
        ['<b>ext4</b>', 'Có, có journal', 'Thiết bị khối', 'Phân vùng dữ liệu trên eMMC/SD; rootfs cho máy phát triển. Mất điện giữa chừng: journal phục hồi, nhưng rootfs vẫn có thể hỏng nếu ứng dụng đang ghi.'],
        ['<b>SquashFS</b>', '<b>Không</b> — chỉ đọc', 'Thiết bị khối (hoặc <code>mtdblock</code>)', 'Rootfs của sản phẩm: nén, nhỏ, và <b>không thể hỏng vì mất điện</b> vì không bao giờ bị ghi. Router OpenWrt, set-top box, Ubuntu snap.'],
        ['<b>EROFS</b>', 'Không — chỉ đọc', 'Thiết bị khối', 'Người kế nhiệm SquashFS, đọc nhanh hơn; Android dùng cho <code>/system</code>. Kernel <code>defconfig</code> của bạn không bật nó.'],
        ['<b>UBIFS</b>', 'Có', 'UBI trên MTD', 'Phân vùng ghi được trên flash NAND/NOR thô. Chịu mất điện bằng thiết kế (ghi log, không ghi đè).'],
        ['<b>JFFS2</b>', 'Có', 'MTD trực tiếp', 'Thế hệ trước UBIFS; phải quét cả flash lúc gắn nên chậm dần khi flash lớn. Chỉ còn trên flash NOR rất nhỏ.'],
        ['<b>tmpfs</b>', 'Có', 'RAM', '<code>/tmp</code>, <code>/run</code>, lớp ghi được của overlay. Mất hết khi tắt máy — thường đó là mục đích.'],
        ['<b>overlayfs</b>', 'Có (vào lớp trên)', 'Hai thư mục bất kỳ', 'Không lưu dữ liệu gì của riêng nó: <b>chồng</b> một lớp ghi được lên một lớp chỉ đọc. Cặp đôi kinh điển: SquashFS + tmpfs, hoặc SquashFS + UBIFS.']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao rootfs sản phẩm gần như luôn chỉ đọc',
      x: 'Một thiết bị IoT bị rút điện hàng trăm lần trong đời, vào những lúc không ai chọn. Mỗi ' +
         'lần là một lần có thể có file đang ghi dở. Nếu file đó là <code>/sbin/init</code> hay ' +
         '<code>/etc/inittab</code>, thiết bị không bao giờ boot lại — và nó nằm trên cột điện, ' +
         'không ai ra sửa được. SquashFS loại bỏ cả lớp rủi ro đó: một hệ thống file không bao giờ ' +
         'bị ghi thì không bao giờ hỏng vì ghi dở. Những gì phải ghi (cấu hình người dùng, log) được ' +
         'đưa sang một phân vùng riêng hoặc một lớp overlay. Nguyên tắc đáng nhớ: <b>tách phần hệ ' +
         'thống (chỉ đọc, thay cả khối khi cập nhật) khỏi phần dữ liệu (ghi được, sống sót qua ' +
         'cập nhật)</b>. Bài 69 sẽ xây cơ chế cập nhật OTA dựa đúng trên sự tách biệt này.' },

    { t: 'h3', x: 'overlayfs: làm cho một thứ chỉ đọc trông như ghi được' },

    { t: 'p', x:
      '<b>overlayfs</b> xếp chồng hai thư mục. Lớp dưới (<code>lowerdir</code>) chỉ đọc — ở đây là ' +
      'SquashFS. Lớp trên (<code>upperdir</code>) ghi được — ở đây là một tmpfs. Người dùng chỉ ' +
      'thấy <b>một</b> cây thư mục gộp (merged). Hình dung một tấm kính trong suốt đặt lên một bức ' +
      'tranh in: bạn vẽ lên kính thì chỗ đó che bức tranh; lau kính đi, bức tranh gốc vẫn y nguyên. ' +
      'Ba quy tắc định nghĩa toàn bộ hành vi:' },

    { t: 'fig',
      cap: 'Đọc thì nhìn xuyên xuống; ghi thì chép lên trên; xoá thì dán một \"miếng che\". Mọi thay ' +
           'đổi nằm gọn trong <code>upperdir</code> — lớp dưới không bao giờ bị chạm. Vứt ' +
           '<code>upperdir</code> đi (một tmpfs thì tự mất khi tắt máy) là thiết bị trở về trạng ' +
           'thái xuất xưởng. Bước 5 sẽ cho bạn nhìn tận mắt cả hai file trong lớp upper.',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="overlayfs: lớp upper tmpfs chứa hostname đã sửa và whiteout cho passwd; lớp lower SquashFS chứa fstab, group, hostname, inittab, passwd; cây gộp hiện hostname mới và không có passwd">' +
        '<text class="d-t" x="20" y="34">Cây gộp</text>' +
        '<text class="d-ts" x="20" y="50">(thứ bạn thấy)</text>' +
        '<rect class="d-box-p" x="140" y="16" width="560" height="50" rx="6"/>' +
        '<text class="d-tm" x="156" y="46">fstab   group   hostname = gateway   init.d   inittab</text>' +
        '<text class="d-t" x="20" y="118">upperdir</text>' +
        '<text class="d-ts" x="20" y="134">tmpfs, ghi được</text>' +
        '<rect class="d-box-a" x="140" y="96" width="560" height="50" rx="6"/>' +
        '<text class="d-tm" x="336" y="120">hostname</text>' +
        '<text class="d-ts" x="336" y="136">bản sửa, 8 byte</text>' +
        '<text class="d-tm" x="560" y="120">passwd</text>' +
        '<text class="d-ts" x="560" y="136">whiteout: thiết bị ký tự 0,0</text>' +
        '<text class="d-t" x="20" y="198">lowerdir</text>' +
        '<text class="d-ts" x="20" y="214">SquashFS, chỉ đọc</text>' +
        '<rect class="d-box" x="140" y="176" width="560" height="50" rx="6"/>' +
        '<text class="d-tm" x="156" y="206">fstab   group   hostname = embedded   init.d   inittab   passwd</text>' +
        '<rect class="d-box-g" x="140" y="244" width="176" height="36" rx="6"/>' +
        '<text class="d-ts" x="152" y="266">Đọc: upper có thì lấy upper</text>' +
        '<rect class="d-box-g" x="332" y="244" width="176" height="36" rx="6"/>' +
        '<text class="d-ts" x="344" y="266">Ghi: chép file lên upper</text>' +
        '<rect class="d-box-w" x="524" y="244" width="176" height="36" rx="6"/>' +
        '<text class="d-ts" x="536" y="266">Xoá: dán whiteout lên upper</text>' +
        '</svg>' },

    { t: 'p', x:
      'Hai tên kỹ thuật cần biết. <b>Copy-up</b>: lần đầu bạn sửa một file của lớp dưới, overlayfs ' +
      'chép <i>cả file</i> lên lớp trên rồi mới sửa — nên sửa một byte của file 2 MB tốn 2 MB lớp ' +
      'trên. <b>Whiteout</b>: lớp dưới không xoá được, nên để \"xoá\" một file, overlayfs tạo trên ' +
      'lớp trên một <i>thiết bị ký tự</i> cùng tên với số major/minor <code>0,0</code> — một dấu ' +
      'hiệu nói \"coi như không có\". Kernel yêu cầu thêm một thư mục thứ ba, <code>workdir</code>, ' +
      'cùng hệ thống file với <code>upperdir</code>, để chuẩn bị các thao tác đó trước khi đổi tên ' +
      'vào chỗ một cách nguyên tử.' },

    { t: 'p', x:
      'Vấn đề còn lại: overlay phải được dựng <b>trước</b> khi <code>/sbin/init</code> của rootfs ' +
      'thật chạy, vì init và <code>rcS</code> đã cần ghi. Ai dựng? Chỉ có một chỗ chạy trước ' +
      '<code>/sbin/init</code>: một initramfs. Đó là lý do mọi hệ thống SquashFS + overlay đều ' +
      'boot theo <b>hai giai đoạn</b>, và lệnh nối hai giai đoạn là <code>switch_root</code>.' },

    { t: 'cmdx', cmd: 'exec switch_root /mnt/root /sbin/init', title: 'Chuyển từ initramfs sang rootfs thật',
      rows: [
        ['<code>exec</code>', 'Thay tiến trình shell hiện tại bằng <code>switch_root</code>, giữ nguyên PID.', '<b>Bắt buộc.</b> <code>switch_root</code> tự kiểm tra mình là PID 1 (<code>util-linux/switch_root.c:233</code>); không có <code>exec</code>, nó là con của shell và từ chối chạy. Bài 20 đã dạy <code>exec</code> giữ PID.'],
        ['<code>switch_root</code>', 'Xoá sạch mọi file trong rootfs RAM, <code>mount --move</code> thư mục mới lên <code>/</code>, <code>chroot</code> vào đó.', 'Xoá để trả RAM lại: initramfs sẽ không bao giờ dùng lại. Vì nó sắp <code>rm -rf /</code>, nó kiểm tra ba lần rằng <code>/</code> đúng là ramfs/tmpfs và có <code>/init</code> (dòng 238–248).'],
        ['<code>/mnt/root</code>', 'Rootfs mới — phải là một <b>điểm gắn</b>, không phải thư mục thường.', 'Ở đây là cây gộp của overlayfs.'],
        ['<code>/sbin/init</code>', 'Chương trình chạy tiếp, với PID 1.', 'BusyBox init của Bài 47 — nó không hề biết mình từng chạy sau một initramfs.']
      ] },

    /* ============================================================
       4. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: một rootfs, bốn cách đưa nó cho kernel' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<ul>' +
         '<li><code>~/bai47/rootfs</code> và <code>~/bai47/rootfs.img</code> của Bài 47. Bài này chỉ ' +
         '<b>chép</b> từ đó, không sửa gì trong <code>~/bai47</code>.</li>' +
         '<li><code>~/bai38/linux-6.18.45/arch/arm64/boot/Image</code> (Bài 40) và các module đã ' +
         'cài ở <code>~/bai40/modroot-stripped</code> (Bài 40). Không build lại kernel.</li>' +
         '<li>Gói <code>squashfs-tools</code> cho bước 4 — lệnh cài nằm ở đó.</li>' +
         '<li>Khoảng <b>20 MB</b> đĩa cho <code>~/bai48</code>.</li>' +
         '</ul>' +
         'Máy soạn bài: Ubuntu 20.04 trong WSL2, QEMU <b>4.2.1</b>, GCC <b>9.4</b>, ' +
         '<code>squashfs-tools</code> <b>4.4</b>. Mỗi lần boot, thoát QEMU bằng ' +
         '<code>poweroff</code> trong máy ảo; nếu nó treo hoặc panic, dùng <kbd>Ctrl</kbd>+<kbd>A</kbd> ' +
         'rồi <kbd>X</kbd>.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Bước 1 — Đóng gói rootfs của Bài 47 và xem nó hỏng hai lần',
        blocks: [
          { t: 'p', x:
            'Chép rootfs sang một thư mục mới, rồi viết hai script nhỏ để khỏi gõ lại mãi: ' +
            '<code>pack.sh</code> đóng gói thư mục <code>initramfs/</code> thành ba file (cpio thô, ' +
            'nén gzip, nén xz — bước 2 sẽ so sánh ba file này), và <code>run-initramfs.sh</code> ' +
            'boot một kho cpio <b>không</b> kèm ổ đĩa nào:' },

          { t: 'code', where: 'wsl', code:
            'mkdir ~/bai48 && cd ~/bai48\n' +
            'cp -a ~/bai47/rootfs initramfs\n' +
            'cat > pack.sh << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Pack initramfs/ into a newc cpio archive, then make a gzip and an xz copy of it.\n' +
            '( cd initramfs && find . -print0 | cpio --null --create --format=newc ) > rootfs.cpio\n' +
            'gzip -9 -k -f rootfs.cpio\n' +
            'xz --check=crc32 --lzma2=dict=1MiB -k -f rootfs.cpio\n' +
            'ls -l rootfs.cpio*\n' +
            'EOF\n' +
            'cat > run-initramfs.sh << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Boot a cpio initramfs with no disk. IMG picks the archive; arguments go to the kernel command line.\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd "${IMG:-rootfs.cpio.gz}" \\\n' +
            '  -append "console=ttyAMA0 $*"\n' +
            'EOF\n' +
            'chmod +x pack.sh run-initramfs.sh\n' +
            './pack.sh\n' +
            'file rootfs.cpio rootfs.cpio.gz rootfs.cpio.xz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4210 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 2155520 Sep 29 10:52 rootfs.cpio\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1186494 Sep 29 10:52 rootfs.cpio.gz\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  941252 Sep 29 10:52 rootfs.cpio.xz\n' +
            'rootfs.cpio:    ASCII cpio archive (SVR4 with no CRC)\n' +
            'rootfs.cpio.gz: gzip compressed data, was "rootfs.cpio", last modified: Tue Sep 29 03:52:47 2026, max compression, from Unix, original size modulo 2^32 2155520\n' +
            'rootfs.cpio.xz: XZ compressed data',
            notes: [
              '<code>rootfs.cpio</code> luôn là <b>2 155 520</b> byte = <b>4210</b> khối × 512 cho đúng cây thư mục này. Kích thước hai bản nén thì dao động vài chục byte mỗi lần đóng gói, vì header cpio chứa số inode và thời gian — Bài 32 đã đo hiện tượng này.'
            ] },

          { t: 'cmdx', cmd: 'xz --check=crc32 --lzma2=dict=1MiB -k -f rootfs.cpio', title: 'Nén xz theo cách kernel đọc được',
            rows: [
              ['<code>--check=crc32</code>', 'Dùng CRC32 làm mã kiểm tra thay vì CRC64 mặc định.', '<b>Bắt buộc.</b> Bộ giải nén xz trong kernel chỉ hiểu CRC32. Để mặc định, kernel báo <code>Input was encoded with settings that are not supported by this XZ decoder</code> — đã thử thật.'],
              ['<code>--lzma2=dict=1MiB</code>', 'Từ điển nén 1 MiB thay vì 8 MiB mặc định (64 MiB với <code>-9</code>).', 'Đúng giá trị Kbuild dùng cho initramfs (<code>scripts/Makefile.lib:436</code>). Từ điển lớn buộc kernel cấp phát bằng ấy RAM lúc giải nén; <code>-9</code> làm <code>MemFree</code> hụt đi <b>9,4 MB</b> mà file chỉ nhỏ hơn 528 byte.'],
              ['<code>-k</code>', '<i>keep</i>: giữ file gốc <code>rootfs.cpio</code>.', 'Mặc định <code>xz</code> và <code>gzip</code> xoá file gốc sau khi nén.'],
              ['<code>-f</code>', 'Ghi đè file <code>.xz</code> nếu đã có.', 'Để chạy lại <code>pack.sh</code> nhiều lần không bị hỏi.']
            ]},

          { t: 'p', x:
            '<code>file</code> xác nhận định dạng: <code>SVR4 with no CRC</code> chính là tên gọi ' +
            'khác của <code>newc</code> — thứ kernel đòi. Bản gzip còn ghi lại kích thước gốc ' +
            '(<code>original size … 2155520</code>). Giờ boot bản gzip:' },

          { t: 'code', where: 'wsl', code:
            './run-initramfs.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.304699] Unpacking initramfs...\n' +
            '[    0.458353] Freeing initrd memory: 1156K\n' +
            '...\n' +
            '[    0.742397] check access for rdinit=/init failed: -2, ignoring\n' +
            '[    0.750334] VFS: Cannot open root device "" or unknown-block(0,0): error -6\n' +
            '[    0.750539] Please append a correct "root=" boot option; here are the available partitions:\n' +
            '...\n' +
            '[    0.751813] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)',
            notes: [
              'Chỉ in năm dòng quan trọng trong 273 dòng log (dòng 146, 175, 241, 243–244, 254). Dấu thời gian khác nhau mỗi lần boot; thứ tự và nội dung thì không. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'
            ] },

          { t: 'cal', kind: 'why', title: 'Kho đã được giải nén — kernel chỉ không tìm thấy /init',
            x: 'Đọc từ trên xuống. <code>Unpacking initramfs...</code> rồi <code>Freeing initrd memory: ' +
               '1156K</code>: kernel đã giải nén <b>thành công</b> và trả lại 1156 KiB mà file nén ' +
               'chiếm (1 186 494 byte, làm tròn theo trang — Bài 32 đã giải thích phép làm tròn). ' +
               'Rồi <code>rdinit=/init failed: -2</code>: <code>-2</code> là <code>ENOENT</code>, ' +
               'không có file <code>/init</code>. Rootfs của Bài 47 được thiết kế cho ổ đĩa, nơi ' +
               'kernel tìm <code>/sbin/init</code>; nó chưa bao giờ cần <code>/init</code>. Không có ' +
               '<code>/init</code>, kernel rẽ sang nhánh ổ đĩa của hình ở phần lý thuyết — và không ' +
               'có <code>root=</code>, nó panic với đúng thông báo <code>(0,0)</code> mà Bài 41 đã ' +
               'phân loại. Toàn bộ BusyBox đang nằm trong RAM, không ai chạy nó.' },

          { t: 'p', x:
            'Cách nhanh nhất để thử giả thuyết đó: bảo kernel chạy <code>/sbin/init</code> thay ' +
            'cho <code>/init</code> bằng <code>rdinit=</code>, mà không sửa gì trong rootfs:' },

          { t: 'code', where: 'wsl', code:
            './run-initramfs.sh rdinit=/sbin/init' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.753644] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            'rcS: done at 0.79 s, hostname is embedded\n' +
            'can\'t open /dev/ttyAMA0: No such file or directory\n' +
            'can\'t open /dev/ttyAMA0: No such file or directory\n' +
            'can\'t open /dev/ttyAMA0: No such file or directory\n' +
            'can\'t open /dev/ttyAMA0: No such file or directory\n' +
            '...',
            notes: [
              'Dòng <code>can\'t open</code> lặp lại mỗi giây cho tới khi bạn thoát (<kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>); trong 12 giây máy soạn bài đếm được 13 dòng. Gõ phím gì cũng vô ích — không có shell nào.'
            ] },

          { t: 'cal', kind: 'why', title: 'Init chạy, rcS chạy, nhưng /dev rỗng',
            x: 'Lần này <code>Run /sbin/init</code> xuất hiện: BusyBox init chạy, <code>rcS</code> ' +
               'chạy trọn vẹn. Nhưng dòng <code>ttyAMA0::respawn:-/bin/sh</code> của ' +
               '<code>inittab</code> cần mở <code>/dev/ttyAMA0</code>, và <code>/dev</code> trong ' +
               'initramfs chỉ có đúng một file — <code>/dev/console</code>, từ kho 512 byte dựng sẵn. ' +
               'Shell không mở được terminal, chết, init <code>respawn</code> nó sau một giây, mãi mãi. ' +
               'Trên ổ đĩa, <code>prepare_namespace()</code> gắn devtmpfs hộ bạn; ở đây nó không bao ' +
               'giờ được gọi. Đây chính là điều Bài 46 đã cảnh báo, giờ bạn thấy nó xảy ra thật. Và ' +
               'lỗi này khó hơn hẳn lần trước: không panic, không im lặng, mà một dòng lặp lại nói ' +
               'đúng triệu chứng nhưng không nói nguyên nhân.' },

          { t: 'p', x:
            'Hai lỗi, hai dòng sửa. Thêm devtmpfs vào <code>fstab</code> để <code>mount -a</code> ' +
            'trong <code>rcS</code> tự gắn nó, và tạo <code>/init</code> là symlink tới init để ' +
            'kernel khỏi cần <code>rdinit=</code>. Chỉ sửa bản chép trong <code>~/bai48</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat > initramfs/etc/fstab << \'EOF\'\n' +
            '# <file system> <mount point> <type>   <options> <dump> <pass>\n' +
            'devtmpfs        /dev          devtmpfs defaults  0      0\n' +
            'proc            /proc         proc     defaults  0      0\n' +
            'sysfs           /sys          sysfs    defaults  0      0\n' +
            'tmpfs           /tmp          tmpfs    defaults  0      0\n' +
            'EOF\n' +
            'ln -s sbin/init initramfs/init\n' +
            'ls -l initramfs/init\n' +
            './pack.sh\n' +
            './run-initramfs.sh' },

          { t: 'code', where: 'qemu', code:
            'echo $$; cat /proc/cmdline\n' +
            'mount\n' +
            'df -h /\n' +
            'touch /root/x && echo writable\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            'lrwxrwxrwx 1 cah8hc cah8hc 9 Sep 29 10:53 initramfs/init -> sbin/init\n' +
            '4210 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 2155520 Sep 29 10:53 rootfs.cpio\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1186547 Sep 29 10:53 rootfs.cpio.gz\n' +
            '-rw-r--r-- 1 cah8hc cah8hc  941380 Sep 29 10:53 rootfs.cpio.xz\n' +
            '...\n' +
            '[    0.755268] Run /init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            'rcS: done at 0.78 s, hostname is embedded\n' +
            '~ # echo $$; cat /proc/cmdline\n' +
            '58\n' +
            'console=ttyAMA0 \n' +
            '~ # mount\n' +
            'rootfs on / type rootfs (rw,size=214844k,nr_inodes=53711)\n' +
            'devtmpfs on /dev type devtmpfs (rw,relatime,size=214844k,nr_inodes=53711,mode=755)\n' +
            'proc on /proc type proc (rw,relatime)\n' +
            'sysfs on /sys type sysfs (rw,relatime)\n' +
            'tmpfs on /tmp type tmpfs (rw,relatime)\n' +
            '~ # df -h /\n' +
            'Filesystem                Size      Used Available Use% Mounted on\n' +
            'df: /: can\'t find mount point\n' +
            '~ # touch /root/x && echo writable\n' +
            'writable\n' +
            '~ # poweroff',
            notes: [
              'PID của shell (58) và dấu thời gian sẽ khác trên máy bạn. Phần tắt máy giống hệt Bài 47 nên được lược bỏ.'
            ] },

          { t: 'p', x:
            'Hệ thống giờ chạy hoàn toàn từ RAM. Đọc từng dòng so với lần boot từ ổ đĩa ở Bài 47:' },

          { t: 'list', ordered: true, items: [
            '<code>Run /init as init process</code> — không còn <code>check access … failed</code>, ' +
              'không còn <code>VFS:</code> nào. Kernel không đụng tới ổ đĩa; <code>/proc/cmdline</code> ' +
              'không có <code>root=</code> mà không ai phàn nàn.',
            'Dòng đầu của <code>mount</code>: <code>rootfs on / type rootfs (rw,…)</code>. Ở Bài 47 ' +
              'dòng này là <code>/dev/root on / type ext4</code>. Đây là chính cái rootfs mà kernel ' +
              'luôn tạo — lần đầu tiên bạn thấy nó được dùng làm <code>/</code> thật. ' +
              '<code>size=214844k</code> là giới hạn mặc định của tmpfs: một nửa RAM của máy ảo.',
            'Dòng thứ hai là devtmpfs — do <code>mount -a</code> gắn, không phải kernel. Dòng thứ ' +
              'nhất của <code>fstab</code> vừa làm việc mà <code>prepare_namespace()</code> làm hộ ' +
              'bạn trên ổ đĩa.',
            '<code>df -h /</code> thất bại với <code>can\'t find mount point</code>. BusyBox ' +
              '<code>df</code> được build với <code>CONFIG_FEATURE_SKIP_ROOTFS=y</code>: nó bỏ qua ' +
              'mọi dòng tên <code>rootfs</code> trong <code>/proc/mounts</code> ' +
              '(<code>libbb/find_mount_point.c:46</code>) vì trên hệ thống boot từ đĩa, dòng đó chỉ ' +
              'là cái rootfs bị che khuất. Ở đây nó lại là <code>/</code> thật. Muốn biết tốn bao ' +
              'nhiêu RAM, bước 2 dùng <code>/proc/meminfo</code>.',
            '<code>touch /root/x</code> thành công mà không cần <code>remount,rw</code>: tmpfs ' +
              'luôn ghi được. Nhưng file đó chỉ sống tới lúc tắt máy — boot lại, nó biến mất.'
          ] },

          { t: 'cal', kind: 'tip', title: 'Cùng một rootfs, hai điểm khác nhau — hãy nhớ đúng hai điểm này',
            x: 'Toàn bộ khác biệt giữa \"rootfs cho ổ đĩa\" và \"rootfs cho initramfs\" gói gọn ' +
               'trong hai dòng bạn vừa thêm: <b>kernel tìm <code>/init</code> thay vì ' +
               '<code>/sbin/init</code></b>, và <b>kernel không gắn devtmpfs</b>. Lệnh ' +
               '<code>rcS</code>, <code>inittab</code>, BusyBox — không đổi một byte. Mỗi khi chuyển ' +
               'một rootfs giữa hai cách boot, hãy kiểm tra đúng hai điều đó trước tiên.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Bước 2 — Đo: kích thước, thời gian giải nén, RAM',
        blocks: [
          { t: 'p', x:
            'Giờ bạn có bốn cách đưa cùng một rootfs cho kernel: cpio thô, cpio gzip, cpio xz, và ' +
            'ảnh ext4 của Bài 47. So sánh kích thước trước. <code>ls -s</code> in thêm cột đầu tiên ' +
            'là số KiB <b>thật sự chiếm trên đĩa</b>, khác với kích thước logic:' },

          { t: 'code', where: 'wsl', code:
            'ls -ls rootfs.cpio rootfs.cpio.gz rootfs.cpio.xz ~/bai47/rootfs.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            '6412 -rw-r--r-- 1 cah8hc cah8hc 67108864 Sep 29 10:25 /home/cah8hc/bai47/rootfs.img\n' +
            '2108 -rw-r--r-- 1 cah8hc cah8hc  2155520 Sep 29 10:53 rootfs.cpio\n' +
            '1160 -rw-r--r-- 1 cah8hc cah8hc  1186547 Sep 29 10:53 rootfs.cpio.gz\n' +
            ' 920 -rw-r--r-- 1 cah8hc cah8hc   941380 Sep 29 10:53 rootfs.cpio.xz',
            notes: [
              'Số KiB trên đĩa của <code>rootfs.img</code> (6412) phụ thuộc vào số lần ảnh đã được boot và ghi; bản vừa tạo bằng <code>mkfs.ext4 -d</code> ở Bài 46 chiếm khoảng 4.2M.'
            ] },

          { t: 'p', x:
            'Ảnh ext4 <b>64 MiB</b> logic, nhưng chỉ <b>6,3 MiB</b> chiếm thật — nó là file thưa ' +
            '(sparse, Bài 46). Dù vậy, khi ghi lên một thẻ SD hay chép qua mạng, cả 64 MiB đều phải ' +
            'đi. Kho cpio thô <b>2,1 MiB</b>, gzip còn <b>1,2 MiB</b> (55 %), xz còn <b>0,9 MiB</b> ' +
            '(44 %). Bộ nén nhỏ hơn không miễn phí — kernel phải giải nén. Đo thời gian: vòng lặp ' +
            'dưới đây boot mỗi file, rồi trong máy ảo bạn gõ hai lệnh để đọc lại mốc thời gian và ' +
            'bộ nhớ:' },

          { t: 'code', where: 'wsl', code:
            'for img in rootfs.cpio rootfs.cpio.gz rootfs.cpio.xz; do IMG=$img ./run-initramfs.sh; done\n' +
            '( cd ~/bai47 && ./run.sh )' },

          { t: 'code', where: 'qemu', code:
            'dmesg | grep -E "Memory:|Unpacking|Freeing initrd|VFS: Mounted|Run /"\n' +
            'grep -E "^(MemFree|Cached|Shmem):" /proc/meminfo\n' +
            'poweroff' },

          { t: 'p', x:
            'Vòng <code>for</code> boot lần lượt ba máy ảo; mỗi lần có dấu nhắc, gõ ba lệnh trên, ' +
            '<code>poweroff</code> đưa bạn sang file tiếp theo. Dòng cuối boot ảnh ext4 bằng ' +
            '<code>run.sh</code> của Bài 47. Máy soạn bài chạy mỗi cấu hình ba lần; đây là lần ' +
            'thứ nhất của mỗi cái:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '== rootfs.cpio\n' +
            '[    0.073899] Memory: 426972K/524288K available (…)\n' +
            '[    0.294639] Unpacking initramfs...\n' +
            '[    0.358360] Freeing initrd memory: 2104K\n' +
            '[    0.725454] Run /init as init process\n' +
            'MemFree:          450652 kB\n' +
            'Cached:             2076 kB\n' +
            'Shmem:              2076 kB\n' +
            '== rootfs.cpio.gz\n' +
            '[    0.072460] Memory: 427920K/524288K available (…)\n' +
            '[    0.299125] Unpacking initramfs...\n' +
            '[    0.452785] Freeing initrd memory: 1156K\n' +
            '[    0.797274] Run /init as init process\n' +
            'MemFree:          450752 kB\n' +
            'Cached:             2076 kB\n' +
            'Shmem:              2076 kB\n' +
            '== rootfs.cpio.xz\n' +
            '[    0.071893] Memory: 428160K/524288K available (…)\n' +
            '[    0.282751] Unpacking initramfs...\n' +
            '[    0.729143] Freeing initrd memory: 916K\n' +
            '[    0.946353] Run /init as init process\n' +
            'MemFree:          450716 kB\n' +
            'Cached:             2076 kB\n' +
            'Shmem:              2076 kB\n' +
            '== ext4 (Bài 47)\n' +
            '[    0.070516] Memory: 429080K/524288K available (…)\n' +
            '[    0.665613] VFS: Mounted root (ext4 filesystem) readonly on device 254:0.\n' +
            '[    0.707081] Run /sbin/init as init process\n' +
            'MemFree:          451800 kB\n' +
            'Cached:             2076 kB\n' +
            'Shmem:                 0 kB',
            notes: [
              'Dòng <code>== …</code> là nhãn để bạn dễ đọc, không phải output của máy ảo. Phần trong ngoặc của dòng <code>Memory:</code> được rút gọn thành <code>(…)</code>. Mọi dấu thời gian dao động theo tải của máy host; <code>MemFree</code> dao động vài trăm KiB giữa các lần boot. Các số KiB trong <code>Memory:</code>, <code>Freeing initrd memory</code> và <code>Shmem</code> thì lặp lại chính xác.'
            ] },

          { t: 'p', x:
            'Ba lần đo của mỗi cấu hình, gom lại. \"Giải nén\" là khoảng cách từ ' +
            '<code>Unpacking</code> tới <code>Freeing initrd memory</code>:' },

          { t: 'table',
            head: ['', 'File', 'Giải nén (3 lần)', '<code>Run … init</code> (3 lần)', 'RAM giữ lúc boot', 'RAM chiếm vĩnh viễn'],
            rows: [
              ['cpio thô', '2 155 520 B', '64 · 71 · 68 ms', '0,725 · 0,717 · 0,720 s', '2104 KiB', '<code>Shmem</code> 2076 KiB'],
              ['cpio gzip', '1 186 547 B', '154 · 166 · 156 ms', '0,797 · 0,817 · 0,768 s', '1156 KiB', '<code>Shmem</code> 2076 KiB'],
              ['cpio xz', '941 380 B', '446 · 447 · 456 ms', '0,946 · 0,949 · 0,968 s', '916 KiB', '<code>Shmem</code> 2076 KiB'],
              ['ext4 64 MiB', '67 108 864 B', '—', '0,707 · 0,717 · 0,690 s', '0', '<code>Shmem</code> 0']
            ] },

          { t: 'p', x:
            'Bốn điều đọc được từ bảng, mỗi điều ứng với một cột:' },

          { t: 'list', ordered: true, items: [
            '<b>Nén càng mạnh, giải nén càng lâu.</b> gzip tốn khoảng <b>2,3×</b> thời gian của ' +
              'cpio thô; xz tốn khoảng <b>6,6×</b> — gần nửa giây trên máy ảo này, dù file xz chỉ ' +
              'nhỏ hơn gzip 21 %. Trên một bo mạch ARM thật chậm hơn QEMU trên CPU máy tính, ' +
              'khoảng cách đó thành vài giây.',
            '<b>\"RAM giữ lúc boot\" được trả lại.</b> Số KiB trong <code>Freeing initrd memory</code> ' +
              'chính là file nén, làm tròn theo trang. Số đó cũng giải thích vì sao dòng ' +
              '<code>Memory: …K available</code> nhích lên khi file nhỏ đi: 426 972 → 427 920 → 428 160 ' +
              'KiB — RAM bị bootloader chiếm để chứa file thì kernel không tính là \"available\" ' +
              'lúc khởi động.',
            '<b>\"RAM chiếm vĩnh viễn\" giống hệt nhau cho cả ba kiểu nén.</b> <code>Shmem: 2076 kB</code> ' +
              'là dung lượng các file trong tmpfs — tức toàn bộ rootfs sau khi giải nén: đúng ' +
              '2,1 MiB như <code>rootfs.cpio</code>. Nén chỉ giúp file nhỏ khi <i>nạp</i>; một khi đã ' +
              'giải nén, RAM trả giá cho từng byte của từng file, suốt đời hệ thống.',
            '<b>ext4 có <code>Shmem: 0</code></b>: rootfs nằm trên đĩa, không tốn RAM. Nhưng ' +
              '<code>Cached</code> lại bằng đúng 2076 kB ở cả bốn cấu hình — với ext4, đó là page ' +
              'cache của các file vừa đọc từ đĩa (BusyBox), thứ kernel có thể vứt đi khi cần RAM. ' +
              'Với initramfs, <code>Cached</code> <i>chính là</i> <code>Shmem</code>: không có đĩa ' +
              'phía sau để đọc lại, nên không vứt được.'
          ] },

          { t: 'cal', kind: 'info', title: 'Thời gian boot gần như bằng nhau — vì rootfs quá nhỏ',
            x: 'Bài 47 hứa bạn sẽ đo \"cái nào boot nhanh hơn\". Câu trả lời trung thực: với 2 MiB, ' +
               'chênh lệch nằm trong nhiễu. Ext4 tới <code>Run /sbin/init</code> ở <b>0,69–0,72 s</b>, ' +
               'cpio thô ở <b>0,72–0,73 s</b>. Mọi cách đều mất khoảng 0,7 s cho phần kernel khởi tạo ' +
               'phần cứng, thứ không đổi. Kiểu nén mới là thứ tạo khác biệt: xz chậm hơn thô khoảng ' +
               '<b>0,23 s</b> ở mốc <code>Run</code>, và khoảng cách đó tăng tuyến tính theo kích ' +
               'thước. Initramfs 50 MB của một bản phân phối desktop giải nén mất vài giây; ảnh ext4 ' +
               'thì chỉ đọc đúng những file cần.' },

          { t: 'cal', kind: 'why', title: 'Vậy khi nào chọn initramfs, khi nào chọn đĩa',
            x: 'Initramfs trả giá bằng RAM cho <b>toàn bộ</b> rootfs, từ đầu tới cuối. Với rootfs ' +
               'vài MB và RAM vài trăm MB, cái giá đó không đáng kể, đổi lại bạn có hệ thống không cần ' +
               'driver lưu trữ, không hỏng vì mất điện, tắt là sạch. Với rootfs vài chục tới vài trăm ' +
               'MB, nó thành lãng phí — và lúc đó bạn cần rootfs trên đĩa hoặc flash, kèm một ' +
               'initramfs nhỏ nếu cần làm gì trước. Quy tắc thực tế: <b>rootfs nhỏ, ít thay đổi → ' +
               'initramfs; rootfs lớn → đĩa hoặc flash</b>.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Bước 3 — Đưa một initrd kiểu cũ cho kernel mới',
        blocks: [
          { t: 'p', x:
            'Phần lý thuyết nói initrd là một ảnh đĩa. <code>~/bai47/rootfs.img</code> chính là một ' +
            'ảnh đĩa ext4. Đưa nó qua <code>-initrd</code> thay cho kho cpio để xem kernel phân ' +
            'biệt hai thế hệ ra sao:' },

          { t: 'code', where: 'wsl', code:
            'IMG=$HOME/bai47/rootfs.img ./run-initramfs.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.281320] Unpacking initramfs...\n' +
            '[    0.284811] Initramfs unpacking failed: invalid magic at start of compressed archive\n' +
            '[    0.336375] Freeing initrd memory: 65536K\n' +
            '...\n' +
            '[    0.619670] check access for rdinit=/init failed: -2, ignoring\n' +
            '[    0.622562] VFS: Cannot open root device "" or unknown-block(0,0): error -6\n' +
            '...\n' +
            '[    0.624236] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)',
            notes: [
              'Dùng <code>$HOME</code> thay cho <code>~</code> vì dấu ngã không được mở rộng khi đứng sau <code>IMG=</code>. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>.'
            ] },

          { t: 'p', x:
            'Hai dòng đầu là toàn bộ câu chuyện. <b>Magic</b> là vài byte đầu tiên của một file, ' +
            'dùng để nhận dạng định dạng — kernel đọc chúng để biết phải giải nén bằng gì. So sánh ' +
            'sáu byte đầu của bốn file bạn đang có:' },

          { t: 'code', where: 'wsl', code:
            'head -c 6 rootfs.cpio; echo\n' +
            'od -A n -t x1 -N 6 rootfs.cpio.gz\n' +
            'od -A n -t x1 -N 6 rootfs.cpio.xz\n' +
            'od -A n -t x1 -N 6 ~/bai47/rootfs.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            '070701\n' +
            ' 1f 8b 08 08 9b 37\n' +
            ' fd 37 7a 58 5a 00\n' +
            ' 00 00 00 00 00 00',
            notes: [
              'Hai byte cuối của dòng gzip (<code>9b 37</code>) là một phần thời điểm nén, nên sẽ khác trên máy bạn. Bốn byte đầu của mỗi dòng thì giống hệt ở mọi máy.'
            ] },

          { t: 'cmdx', cmd: 'od -A n -t x1 -N 6 FILE', title: 'In vài byte đầu của file dưới dạng hex',
            rows: [
              ['<code>-A n</code>', 'Không in cột địa chỉ bên trái.', 'Chỉ còn lại các byte.'],
              ['<code>-t x1</code>', 'Mỗi byte in thành hai chữ số hex.', 'Bài 33 đã dùng <code>od</code> để đọc header của <code>Image</code>.'],
              ['<code>-N 6</code>', 'Chỉ đọc 6 byte đầu.', 'Đủ để thấy magic của cả ba định dạng.']
            ]},

          { t: 'p', x:
            'Kho cpio thô bắt đầu bằng chữ <code>070701</code> — magic của <code>newc</code>, là chữ ' +
            'ASCII nên in thẳng ra được. Bản gzip bắt đầu bằng <code>1f 8b</code>, bản xz bằng ' +
            '<code>fd 37 7a 58 5a</code> (<code>7a 58 5a</code> là chữ <code>zXZ</code>). Còn ảnh ext4 ' +
            'bắt đầu bằng toàn số 0 — 1024 byte đầu của ext4 để dành cho bootloader, superblock ' +
            'nằm sau đó. Không khớp gì cả: <code>invalid magic</code>. Rồi kernel vẫn trả lại ' +
            '<b>65536K</b> — đúng 64 MiB của file — vì dù đọc được hay không, vùng RAM đó đã vô ' +
            'dụng. Không có <code>/init</code>, nó rơi xuống nhánh ổ đĩa và panic như lần boot đầu ' +
            'của bước 1.' },

          { t: 'p', x:
            'Vì sao không có \"thử gắn nó như initrd\"? Tìm câu trả lời trong cấu hình kernel và ' +
            'mã nguồn của chính nó:' },

          { t: 'code', where: 'wsl', code:
            'grep -n -E \'^(# )?CONFIG_BLK_DEV_(RAM|INITRD)[= ]\' ~/bai38/linux-6.18.45/.config\n' +
            'grep -n \'deprecated initrd\' ~/bai38/linux-6.18.45/init/do_mounts_initrd.c\n' +
            'ls -l initramfs/linuxrc' },

          { t: 'code', where: 'out', nocopy: true, code:
            '216:CONFIG_BLK_DEV_INITRD=y\n' +
            '2293:# CONFIG_BLK_DEV_RAM is not set\n' +
            '92:\tpr_warn("using deprecated initrd support, will be removed soon.\\n");\n' +
            'lrwxrwxrwx 1 cah8hc cah8hc 11 Sep 28 21:35 initramfs/linuxrc -> bin/busybox' },

          { t: 'cmdx', cmd: 'grep -n -E \'^(# )?CONFIG_BLK_DEV_(RAM|INITRD)[= ]\' .config', title: 'Tìm một symbol dù nó bật hay tắt',
            rows: [
              ['<code>^(# )?</code>', 'Đầu dòng, tuỳ chọn có <code>#</code> và dấu cách.', 'Symbol tắt được ghi thành <code># CONFIG_X is not set</code> (Bài 39). Không có phần này, bạn chỉ thấy symbol đang bật.'],
              ['<code>(RAM|INITRD)</code>', 'Một trong hai tên.', 'Gộp hai câu hỏi vào một lệnh.'],
              ['<code>[= ]</code>', 'Theo sau là <code>=</code> hoặc dấu cách.', 'Để <code>BLK_DEV_RAM</code> không khớp nhầm <code>BLK_DEV_RAM_COUNT</code>.']
            ]},

          { t: 'cal', kind: 'info', title: 'Tên cũ, cơ chế mới',
            x: '<code>CONFIG_BLK_DEV_INITRD=y</code> — tên nói \"initrd\" nhưng nó bật cả hai thế hệ, ' +
               'và đó là thứ cho phép <code>-initrd</code> hoạt động từ Bài 32 tới giờ. ' +
               '<code>CONFIG_BLK_DEV_RAM</code> — thiết bị khối <code>/dev/ram0</code> mà initrd thật ' +
               'cần — thì tắt. Không có nó, đoạn mã \"đây không phải cpio, có lẽ là initrd\" ' +
               '(<code>init/initramfs.c:697–716</code>) không được biên dịch vào kernel, nên kernel ' +
               'chỉ còn cách báo hỏng. Có bật nó lên, kernel sẽ in dòng cảnh báo ở dòng 92: ' +
               '<i>deprecated, will be removed soon</i>. Còn symlink <code>linuxrc</code> trong ' +
               'rootfs của bạn là chỗ đứng của chương trình mà initrd sẽ chạy — giờ bạn biết nó để ' +
               'làm gì, và biết nó sẽ không bao giờ được gọi.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Bước 4 — SquashFS: rootfs nén, chỉ đọc, không thể hỏng',
        blocks: [
          { t: 'p', x:
            'Cài công cụ tạo SquashFS. Gói này nhỏ (117 KB) và nằm trong kho chính của Ubuntu. ' +
            '<code>sudo</code> sẽ hỏi mật khẩu của bạn:' },

          { t: 'code', where: 'wsl', code:
            'sudo apt-get install squashfs-tools\n' +
            'mksquashfs -version | head -n 1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'mksquashfs version 4.4 (2019/08/29)',
            notes: [
              'Chỉ in dòng phiên bản. Máy soạn bài có gói <code>1:4.4-1ubuntu0.3</code> của Ubuntu 20.04; bản mới hơn in số phiên bản khác nhưng các tuỳ chọn dùng dưới đây không đổi.'
            ] },

          { t: 'p', x:
            'Tạo một SquashFS từ rootfs <b>gốc</b> của Bài 47 — bản cho ổ đĩa, không phải bản ' +
            'initramfs vừa sửa, vì lần này kernel sẽ gắn nó qua <code>root=</code> và tự lo ' +
            'devtmpfs. Viết thêm một script boot nó như một ổ đĩa:' },

          { t: 'code', where: 'wsl', code:
            'cp -a ~/bai47/rootfs sqroot\n' +
            'mksquashfs sqroot rootfs.sqfs -comp gzip -all-root -noappend\n' +
            'ls -ls rootfs.sqfs ~/bai47/rootfs.img\n' +
            'cat > run-sqfs.sh << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Boot a read-only SquashFS image as the root disk. IMG picks the file; arguments go to the kernel command line.\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -drive file="${IMG:-rootfs.sqfs}",format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 root=/dev/vda $*"\n' +
            'EOF\n' +
            'chmod +x run-sqfs.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Parallel mksquashfs: Using 16 processors\n' +
            'Creating 4.0 filesystem on rootfs.sqfs, block size 131072.\n' +
            '[=================================================================|] 22/22 100%\n' +
            '\n' +
            'Exportable Squashfs 4.0 filesystem, gzip compressed, data block size 131072\n' +
            '\tcompressed data, compressed metadata, compressed fragments,\n' +
            '\tcompressed xattrs, compressed ids\n' +
            '\tduplicates are removed\n' +
            'Filesystem size 1168.60 Kbytes (1.14 Mbytes)\n' +
            '\t56.42% of uncompressed filesystem size (2071.08 Kbytes)\n' +
            '...\n' +
            'Number of inodes 428\n' +
            'Number of files 7\n' +
            '...\n' +
            'Number of symbolic links  408\n' +
            '...\n' +
            'Number of directories 13\n' +
            '...\n' +
            'Number of uids 1\n' +
            '\troot (0)\n' +
            'Number of gids 1\n' +
            '\troot (0)\n' +
            '6412 -rw-r--r-- 1 cah8hc cah8hc 67108864 Sep 29 10:57 /home/cah8hc/bai47/rootfs.img\n' +
            '1172 -rw-r--r-- 1 cah8hc cah8hc  1200128 Sep 29 10:58 rootfs.sqfs',
            notes: [
              'Lược bớt các dòng thống kê bảng inode/thư mục và các loại file bằng 0. Số bộ xử lý (16) là của máy soạn bài.'
            ] },

          { t: 'cmdx', cmd: 'mksquashfs sqroot rootfs.sqfs -comp gzip -all-root -noappend', title: 'Tạo ảnh SquashFS từ một thư mục',
            rows: [
              ['<code>sqroot rootfs.sqfs</code>', 'Thư mục nguồn, rồi file ảnh đích.', 'Giống <code>mkfs.ext4 -d</code> ở Bài 46: không cần <code>sudo</code>, không cần gắn gì.'],
              ['<code>-comp gzip</code>', 'Nén bằng zlib/gzip.', '<b>Phải khớp với kernel.</b> <code>defconfig</code> chỉ bật <code>CONFIG_SQUASHFS_ZLIB</code>; bản xz sẽ không gắn được — bạn sẽ thấy ngay dưới đây.'],
              ['<code>-all-root</code>', 'Ghi mọi file với chủ sở hữu <code>root</code> (UID 0).', 'Nếu không, file mang UID <code>1000</code> của bạn — trên thiết bị, <code>/bin/busybox</code> thuộc về một người dùng không tồn tại. Dòng <code>root (0)</code> cuối output xác nhận.'],
              ['<code>-noappend</code>', 'Ghi đè ảnh cũ thay vì nối thêm vào.', 'Mặc định, chạy lại <code>mksquashfs</code> với cùng file đích sẽ <b>nối</b> vào ảnh đã có.']
            ]},

          { t: 'p', x:
            'Ba con số đáng đọc. <code>Filesystem size 1168.60 Kbytes</code>, bằng <b>56 %</b> của ' +
            '2071 KiB dữ liệu gốc — gần như đúng tỉ lệ nén gzip của kho cpio ở bước 2. ' +
            '<code>408</code> symlink và <code>7</code> file: đúng cây của Bài 47. Và ' +
            '<code>ls -ls</code>: file ảnh <b>1 200 128</b> byte (khối 4 KiB cuối được đệm), so với ' +
            'ảnh ext4 64 MiB logic, 6,3 MiB thật. Một SquashFS có kích thước <b>đúng bằng nội dung ' +
            'nén</b> — không có khoảng trống để dành cho file mới, vì sẽ không bao giờ có file mới. ' +
            'Boot nó:' },

          { t: 'code', where: 'wsl', code:
            './run-sqfs.sh' },

          { t: 'code', where: 'qemu', code:
            'mount | head -n 2\n' +
            'touch /root/x\n' +
            'mount -o remount,rw / && mount | head -n 1\n' +
            'touch /root/x\n' +
            'echo test > /tmp/x && cat /tmp/x\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.302623] squashfs: version 4.0 (2009/01/31) Phillip Lougher\n' +
            '...\n' +
            '[    0.669640] VFS: Mounted root (squashfs filesystem) readonly on device 254:0.\n' +
            '[    0.712966] Run /sbin/init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            'rcS: done at 0.84 s, hostname is embedded\n' +
            '~ # mount | head -n 2\n' +
            '/dev/root on / type squashfs (ro,relatime,errors=continue)\n' +
            'devtmpfs on /dev type devtmpfs (rw,relatime,size=215424k,nr_inodes=53856,mode=755)\n' +
            '~ # touch /root/x\n' +
            'touch: /root/x: Read-only file system\n' +
            '~ # mount -o remount,rw / && mount | head -n 1\n' +
            '/dev/root on / type squashfs (ro,relatime,errors=continue)\n' +
            '~ # touch /root/x\n' +
            'touch: /root/x: Read-only file system\n' +
            '~ # echo test > /tmp/x && cat /tmp/x\n' +
            'test\n' +
            '~ # poweroff',
            notes: [
              'Dòng <code>squashfs: version 4.0</code> là dòng 147 của log, in lúc driver khởi tạo — có mặt trong mọi lần boot, kể cả khi không dùng SquashFS.'
            ] },

          { t: 'p', x:
            'Cùng <code>rcS</code>, cùng <code>inittab</code> của Bài 47, nhưng đọc kỹ những gì đã ' +
            'đổi:' },

          { t: 'list', ordered: true, items: [
            '<code>VFS: Mounted root (squashfs filesystem) readonly</code> — cùng câu với ext4 ở ' +
              'Bài 46, chỉ đổi tên hệ thống file. Kernel tự nhận ra SquashFS từ magic của nó, bạn ' +
              'không cần <code>rootfstype=</code>.',
            'Không có dòng <code>re-mounted … r/w</code> mà Bài 47 thấy từ lệnh ' +
              '<code>mount -o remount,rw /</code> trong <code>rcS</code>. Lệnh đó vẫn chạy — chỉ ' +
              'là không có gì để in.',
            'Chính lệnh đó, gõ tay, <b>trả về thành công</b> (<code>&amp;&amp;</code> cho dòng ' +
              '<code>mount</code> chạy) nhưng <code>/</code> vẫn là <code>ro</code>, và ' +
              '<code>touch</code> vẫn <code>Read-only file system</code>. SquashFS lặng lẽ ép lại ' +
              'cờ chỉ đọc mỗi lần remount (<code>fs/squashfs/super.c:503</code>: ' +
              '<code>fc->sb_flags |= SB_RDONLY</code>). Không có định dạng ghi nào để bật lên.',
            '<code>/tmp</code> vẫn ghi được, vì nó là tmpfs do <code>fstab</code> gắn — rootfs ' +
              'chỉ đọc không ảnh hưởng những gì gắn lên trên nó. Đây là cách một hệ thống SquashFS ' +
              'đơn giản sống: mọi thứ cần ghi đều đi vào <code>/tmp</code> hoặc một phân vùng riêng.'
          ] },

          { t: 'p', x:
            'Giờ thử đúng cái bẫy bảng lệnh ở trên đã cảnh báo: tạo một bản nén bằng xz — nhỏ hơn ' +
            '17 % — rồi boot nó:' },

          { t: 'code', where: 'wsl', code:
            'mksquashfs sqroot rootfs-xz.sqfs -comp xz -all-root -noappend -quiet\n' +
            'ls -l rootfs-xz.sqfs\n' +
            'IMG=rootfs-xz.sqfs ./run-sqfs.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 995328 Sep 29 10:58 rootfs-xz.sqfs\n' +
            '...\n' +
            '[    0.654604] Filesystem uses "xz" compression. This is not supported\n' +
            '...\n' +
            '[    0.656701] No filesystem could mount root, tried: \n' +
            '...\n' +
            '[    0.657371] Kernel panic - not syncing: VFS: Unable to mount root fs on "/dev/vda" or unknown-block(254,0)',
            notes: [
              '<code>-quiet</code> vẫn để lại thanh tiến độ <code>[====…] 22/22 100%</code> trên màn hình; dòng đó được bỏ khỏi bản chụp. Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>, rồi xoá file này: <code>rm rootfs-xz.sqfs</code>.'
            ] },

          { t: 'cal', kind: 'warn', title: 'Magic đúng, bộ giải nén thiếu',
            x: 'Khác hẳn <code>invalid magic</code> ở bước 3: lần này kernel <b>nhận ra</b> đây là ' +
               'SquashFS và đọc được superblock — đủ để biết nó nén bằng xz — rồi mới từ chối, vì ' +
               '<code># CONFIG_SQUASHFS_XZ is not set</code>. Sau đó nó thử các hệ thống file còn ' +
               'lại, không cái nào khớp, và panic với <code>(254,0)</code> — thiết bị có thật, không ' +
               'đọc được, đúng loại thứ hai trong ba loại lỗi VFS của Bài 41. Bài học rộng hơn: ' +
               'tuỳ chọn nén của <code>mksquashfs</code> là một <b>hợp đồng</b> với kernel. Kiểm tra ' +
               'bằng <code>grep SQUASHFS_ .config</code> trước khi chọn; muốn dùng xz hay zstd, phải ' +
               'bật symbol tương ứng và build lại kernel.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Bước 5 — overlayfs + switch_root: một initramfs nhỏ dựng rootfs ghi được',
        blocks: [
          { t: 'p', x:
            'Bước 4 cho bạn một rootfs không thể hỏng nhưng cũng không thể sửa. Giờ ghép cả hai: ' +
            'một <b>initramfs giai đoạn 1</b> rất nhỏ, chỉ làm một việc — gắn SquashFS làm lớp ' +
            'dưới, một tmpfs làm lớp trên, gộp bằng overlayfs, rồi <code>switch_root</code> sang. ' +
            'overlayfs là module (<code>CONFIG_OVERLAY_FS=m</code>), nên initramfs phải mang theo ' +
            'file <code>overlay.ko</code> đã cài ở Bài 40 và nạp nó bằng <code>insmod</code>. Bài 50 ' +
            'sẽ dạy module là gì; ở đây chỉ cần biết <code>insmod</code> thêm một phần vào kernel ' +
            'đang chạy.' },

          { t: 'code', where: 'wsl', code:
            'M=~/bai40/modroot-stripped/lib/modules/6.18.45-embedded/kernel\n' +
            'mkdir -p stage1/bin stage1/dev stage1/proc stage1/lib/modules \\\n' +
            '         stage1/mnt/lower stage1/mnt/rw stage1/mnt/root\n' +
            'cp ~/bai47/rootfs/bin/busybox stage1/bin/\n' +
            'for a in sh mount umount mkdir insmod switch_root; do ln -s busybox stage1/bin/$a; done\n' +
            'cp $M/fs/overlayfs/overlay.ko stage1/lib/modules/\n' +
            'cat > stage1/init << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Stage-1 init: stack a tmpfs over the read-only SquashFS, then hand over to its /sbin/init.\n' +
            'mount -t devtmpfs devtmpfs /dev\n' +
            'mount -t proc proc /proc\n' +
            'insmod /lib/modules/overlay.ko\n' +
            'mount -t squashfs -o ro /dev/vda /mnt/lower\n' +
            'mount -t tmpfs tmpfs /mnt/rw\n' +
            'mkdir /mnt/rw/upper /mnt/rw/work\n' +
            'mount -t overlay overlay \\\n' +
            '  -o lowerdir=/mnt/lower,upperdir=/mnt/rw/upper,workdir=/mnt/rw/work /mnt/root\n' +
            'echo "stage1: overlay ready, switching root"\n' +
            'mkdir -p /mnt/root/overlay\n' +
            'mount --move /mnt/rw /mnt/root/overlay\n' +
            'umount /proc\n' +
            'mount --move /dev /mnt/root/dev\n' +
            'exec switch_root /mnt/root /sbin/init\n' +
            'EOF\n' +
            'chmod +x stage1/init\n' +
            '( cd stage1 && find . -print0 | cpio --null --create --format=newc ) | gzip -9 > stage1.cpio.gz\n' +
            'ls -l stage1.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4528 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1251876 Sep 29 10:58 stage1.cpio.gz' },

          { t: 'p', x:
            'Initramfs này chỉ có BusyBox, sáu symlink, một module và một script — 1,25 MB, lớn hơn ' +
            'bản gzip ở bước 2 chỉ vì <code>overlay.ko</code> (220 904 byte). Nó không có ' +
            '<code>/etc</code>, không có <code>inittab</code>: nó không bao giờ mở shell, chỉ chạy ' +
            'một lần rồi nhường chỗ. Từng dòng của <code>/init</code>:' },

          { t: 'cmdx', cmd: 'stage1/init', title: 'Mười ba lệnh của initramfs giai đoạn 1',
            rows: [
              ['<code>mount -t devtmpfs devtmpfs /dev</code>', 'Có <code>/dev/vda</code> để gắn, và <code>/dev/ttyAMA0</code> cho giai đoạn sau.', 'Bài học bước 1: initramfs phải tự làm việc này.'],
              ['<code>mount -t proc proc /proc</code>', '<code>insmod</code> và <code>mount</code> đọc <code>/proc</code>.', 'Sẽ gỡ ra trước khi chuyển.'],
              ['<code>insmod …/overlay.ko</code>', 'Nạp driver overlayfs vào kernel.', 'Không có dòng này, <code>mount -t overlay</code> báo <code>No such device</code> — xem Lỗi thường gặp.'],
              ['<code>mount -t squashfs -o ro /dev/vda /mnt/lower</code>', 'Lớp dưới: SquashFS của bước 4.', '<code>-o ro</code> cho rõ ý; SquashFS vốn chỉ đọc.'],
              ['<code>mount -t tmpfs tmpfs /mnt/rw</code>, <code>mkdir …/upper …/work</code>', 'Lớp trên và thư mục làm việc, cùng trên một tmpfs.', 'overlayfs đòi <code>upperdir</code> và <code>workdir</code> cùng hệ thống file.'],
              ['<code>mount -t overlay … /mnt/root</code>', 'Gộp hai lớp thành một cây ở <code>/mnt/root</code>.', 'Ba tuỳ chọn <code>lowerdir</code>, <code>upperdir</code>, <code>workdir</code> — đúng ba thư mục ở phần lý thuyết.'],
              ['<code>mount --move /mnt/rw /mnt/root/overlay</code>', 'Chuyển tmpfs vào trong cây mới, ở <code>/overlay</code>.', 'Chỉ để bạn nhìn được lớp upper sau khi chuyển; <code>switch_root</code> sẽ xoá mọi thứ không nằm trong cây mới. Thư mục <code>/overlay</code> được tạo trong lớp upper — chính nó.'],
              ['<code>umount /proc</code>, <code>mount --move /dev /mnt/root/dev</code>', 'Dọn <code>/proc</code>; mang devtmpfs sang cây mới.', 'Một điểm gắn còn sót trong rootfs cũ sẽ bị bỏ lại. Thiếu dòng <code>--move /dev</code>, bạn quay lại đúng lỗi <code>can\'t open /dev/ttyAMA0</code> của bước 1 — đã thử thật.'],
              ['<code>exec switch_root /mnt/root /sbin/init</code>', 'Bỏ initramfs, chạy init thật với PID 1.', 'Xem bảng ở phần lý thuyết. Quên <code>exec</code> → kernel panic, xem Lỗi thường gặp.']
            ]},

          { t: 'p', x:
            'Script boot khác <code>run-sqfs.sh</code> ở hai điểm: có <code>-initrd</code>, và ' +
            '<b>không</b> có <code>root=</code> — ai gắn ổ nào giờ là việc của <code>/init</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat > run-overlay.sh << \'EOF\'\n' +
            '#!/bin/sh\n' +
            '# Stage-1 initramfs + read-only SquashFS disk; arguments go to the kernel command line.\n' +
            'exec qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd stage1.cpio.gz \\\n' +
            '  -drive file=rootfs.sqfs,format=raw,if=virtio \\\n' +
            '  -append "console=ttyAMA0 $*"\n' +
            'EOF\n' +
            'chmod +x run-overlay.sh\n' +
            './run-overlay.sh' },

          { t: 'code', where: 'qemu', code:
            'mount | grep -E "^overlay|/overlay "\n' +
            'echo gateway > /etc/hostname && hostname -F /etc/hostname && hostname\n' +
            'rm /etc/passwd; ls /etc\n' +
            'ls -l /overlay/upper/etc\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.302682] Unpacking initramfs...\n' +
            '[    0.425240] Freeing initrd memory: 1220K\n' +
            '...\n' +
            '[    0.766760] Run /init as init process\n' +
            'stage1: overlay ready, switching root\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            'rcS: done at 1.00 s, hostname is embedded\n' +
            '~ # mount | grep -E "^overlay|/overlay "\n' +
            'tmpfs on /overlay type tmpfs (rw,relatime)\n' +
            'overlay on / type overlay (rw,relatime,lowerdir=/mnt/lower,upperdir=/mnt/rw/upper,workdir=/mnt/rw/work,uuid=on)\n' +
            '~ # echo gateway > /etc/hostname && hostname -F /etc/hostname && hostname\n' +
            'gateway\n' +
            '~ # rm /etc/passwd; ls /etc\n' +
            'fstab     group     hostname  init.d    inittab\n' +
            '~ # ls -l /overlay/upper/etc\n' +
            'total 4\n' +
            '-rw-r--r--    1 0        root             8 Sep 29 03:58 hostname\n' +
            'c---------    2 0        root        0,   0 Sep 29 03:58 passwd\n' +
            '~ # poweroff',
            notes: [
              'BusyBox <code>ls</code> tô màu tên file; màu đã được bỏ khỏi bản chụp. Giờ trong <code>ls -l</code> là UTC vì hệ thống không có múi giờ. Cột chủ sở hữu hiện <code>0</code> thay vì <code>root</code> với file trong <code>/overlay/upper</code> — tên người dùng được tra trong <code>/etc/passwd</code>, và bạn vừa xoá file đó.'
            ] },

          { t: 'p', x:
            'Hai dòng đầu sau <code>Run /init</code> là hai giai đoạn nối nhau: <code>stage1: ' +
            'overlay ready</code> do script của bạn in, rồi <code>rcS:</code> do BusyBox init của ' +
            'rootfs thật chạy — <code>switch_root</code> đã <code>exec</code> nó với PID 1. Giờ đọc ' +
            'phần còn lại:' },

          { t: 'list', ordered: true, items: [
            '<code>overlay on / type overlay (rw,…)</code> — <code>/</code> giờ <b>ghi được</b>, ' +
              'trong khi lớp dưới của nó vẫn là SquashFS chỉ đọc của bước 4, file ' +
              '<code>rootfs.sqfs</code> không đổi một byte. Các đường dẫn <code>/mnt/lower</code>, ' +
              '<code>/mnt/rw/upper</code> trong dòng đó là tên lúc gắn, ở trong initramfs đã bị xoá; ' +
              'kernel chỉ nhớ chúng để hiển thị.',
            '<code>echo gateway &gt; /etc/hostname</code> thành công. Ghi đè một file của lớp dưới ' +
              '→ <b>copy-up</b>: <code>/overlay/upper/etc/hostname</code> xuất hiện, <b>8</b> byte ' +
              '(<code>gateway</code> + xuống dòng), trong khi bản gốc 9 byte ' +
              '(<code>embedded</code>) vẫn nằm nguyên dưới SquashFS.',
            '<code>rm /etc/passwd</code> thành công và <code>ls /etc</code> không còn ' +
              '<code>passwd</code>. Trong lớp upper, nó hiện ra là ' +
              '<code>c--------- … 0,   0 … passwd</code>: chữ <code>c</code> đầu dòng = thiết bị ' +
              'ký tự, major/minor <code>0, 0</code> — đúng <b>whiteout</b> của phần lý thuyết. File ' +
              'gốc không bị xoá; nó chỉ bị che.'
          ] },

          { t: 'p', x:
            'Và lời hứa lớn nhất của thiết kế này: boot lại, mọi thay đổi phải biến mất.' },

          { t: 'code', where: 'wsl', code:
            './run-overlay.sh' },

          { t: 'code', where: 'qemu', code:
            'hostname; ls /etc; ls /overlay/upper\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rcS: done at 0.98 s, hostname is embedded\n' +
            '~ # hostname; ls /etc; ls /overlay/upper\n' +
            'embedded\n' +
            'fstab     group     hostname  init.d    inittab   passwd\n' +
            'overlay\n' +
            '~ # poweroff' },

          { t: 'cal', kind: 'why', title: 'Khôi phục cài đặt gốc bằng một lần tắt máy',
            x: 'Tên máy về <code>embedded</code>, <code>passwd</code> trở lại, lớp upper chỉ còn ' +
               'thư mục <code>overlay</code> mà chính <code>/init</code> tạo ra. Lớp upper là tmpfs: ' +
               'tắt máy là mất. Đó là một tính năng, không phải thiếu sót — một kiosk, một máy bán ' +
               'hàng, một thiết bị trình diễn mỗi lần bật lên đều sạch như mới. Muốn giữ thay đổi, ' +
               'bạn chỉ cần đổi <b>một dòng</b> trong <code>/init</code>: thay tmpfs bằng một phân ' +
               'vùng ghi được — và trên flash thô, phân vùng đó là UBIFS. Đó chính là cách OpenWrt ' +
               'hoạt động: SquashFS cho hệ thống, overlay lên một phân vùng flash cho cấu hình của ' +
               'người dùng.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Bước 6 — UBIFS trên flash thô: dữ liệu sống sót qua reboot',
        blocks: [
          { t: 'p', x:
            'Bước cuối dùng flash NOR 128 MiB của máy <code>virt</code>. Cần ba thứ trong ' +
            'initramfs: module <code>ubi.ko</code> và <code>ubifs.ko</code> (cả hai là ' +
            '<code>=m</code> trong <code>defconfig</code>), hai module nén mà UBIFS đòi (sẽ giải ' +
            'thích ngay khi bạn gặp lỗi), và một chương trình xoá flash. BusyBox có applet ' +
            '<code>flash_eraseall</code> nhưng <code>defconfig</code> <b>tắt</b> nó ' +
            '(<code># CONFIG_FLASH_ERASEALL is not set</code>), nên bạn tự viết một bản — 35 dòng, ' +
            'hai <code>ioctl</code>:' },

          { t: 'code', where: 'file', name: '~/bai48/erase_mtd.c', lang: 'c', code:
            '/* erase_mtd.c - erase every block of an MTD device (a tiny flash_eraseall). */\n' +
            '#include <fcntl.h>\n' +
            '#include <stdio.h>\n' +
            '#include <sys/ioctl.h>\n' +
            '#include <unistd.h>\n' +
            '#include <mtd/mtd-user.h>\n' +
            '\n' +
            'int main(int argc, char **argv)\n' +
            '{\n' +
            '    struct mtd_info_user info;\n' +
            '    struct erase_info_user blk;\n' +
            '    int fd;\n' +
            '\n' +
            '    if (argc != 2) {\n' +
            '        fprintf(stderr, "usage: %s /dev/mtdN\\n", argv[0]);\n' +
            '        return 2;\n' +
            '    }\n' +
            '    fd = open(argv[1], O_RDWR);\n' +
            '    if (fd < 0 || ioctl(fd, MEMGETINFO, &info) < 0) {\n' +
            '        perror(argv[1]);\n' +
            '        return 1;\n' +
            '    }\n' +
            '    printf("%s: size %u, erase block %u, %u blocks\\n",\n' +
            '           argv[1], info.size, info.erasesize, info.size / info.erasesize);\n' +
            '    blk.length = info.erasesize;\n' +
            '    for (blk.start = 0; blk.start < info.size; blk.start += info.erasesize) {\n' +
            '        if (ioctl(fd, MEMERASE, &blk) < 0) {\n' +
            '            perror("MEMERASE");\n' +
            '            return 1;\n' +
            '        }\n' +
            '    }\n' +
            '    printf("erased %u blocks\\n", info.size / info.erasesize);\n' +
            '    close(fd);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'p', x:
            'Hai lệnh <code>ioctl</code> là toàn bộ giao diện MTD bạn cần: <code>MEMGETINFO</code> ' +
            'hỏi kích thước và khối xoá, <code>MEMERASE</code> xoá một khối. Bài 19 đã nói ' +
            '<code>ioctl</code> là cửa cho mọi thao tác không vừa với <code>read</code>/' +
            '<code>write</code> — \"xoá một khối flash\" chính là một thao tác như vậy. Build tĩnh ' +
            '(Bài 47: init và mọi thứ trong initramfs nên tĩnh), rồi đưa nó cùng năm module vào ' +
            'initramfs của bước 1:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-gcc -O2 -static -o erase_mtd erase_mtd.c\n' +
            'file erase_mtd\n' +
            'mkdir -p initramfs/lib/modules\n' +
            'cp $M/drivers/mtd/ubi/ubi.ko $M/fs/ubifs/ubifs.ko \\\n' +
            '   $M/lib/zstd/zstd_compress.ko $M/crypto/zstd.ko $M/crypto/deflate.ko \\\n' +
            '   initramfs/lib/modules/\n' +
            'cp erase_mtd initramfs/bin/\n' +
            './pack.sh' },

          { t: 'code', where: 'out', nocopy: true, code:
            'erase_mtd: ELF 64-bit LSB executable, ARM aarch64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=6ab829cbbcb3def2e26cbe247a113ad8ff94dbe2, for GNU/Linux 3.7.0, not stripped\n' +
            '7670 blocks\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 3927040 Sep 29 10:59 rootfs.cpio\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1872672 Sep 29 10:59 rootfs.cpio.gz\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1416356 Sep 29 10:59 rootfs.cpio.xz',
            notes: [
              'Biến <code>M</code> được đặt ở bước 5; nếu bạn mở terminal mới, đặt lại nó trước: <code>M=~/bai40/modroot-stripped/lib/modules/6.18.45-embedded/kernel</code>. <code>BuildID</code> phụ thuộc vào trình biên dịch nên có thể khác.'
            ] },

          { t: 'p', x:
            '<code>file</code> xác nhận <code>ARM aarch64</code> và <code>statically linked</code>. ' +
            'Kho cpio tăng từ 2,1 lên <b>3,9 MB</b>: 1,1 MB module và 0,6 MB <code>erase_mtd</code> ' +
            '(glibc tĩnh — Bài 28 đã đo cái giá này). Boot, rồi nhìn flash trước khi đụng vào nó:' },

          { t: 'code', where: 'wsl', code:
            './run-initramfs.sh' },

          { t: 'code', where: 'qemu', code:
            'cat /proc/mtd\n' +
            'cat /sys/class/mtd/mtd0/type\n' +
            'hexdump -C /dev/mtd0 | head -n 3\n' +
            'insmod /lib/modules/ubi.ko mtd=0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/mtd\n' +
            'dev:    size   erasesize  name\n' +
            'mtd0: 08000000 00040000 "0.flash"\n' +
            '~ # cat /sys/class/mtd/mtd0/type\n' +
            'nor\n' +
            '~ # hexdump -C /dev/mtd0 | head -n 3\n' +
            '00000000  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  |................|\n' +
            '*\n' +
            '08000000\n' +
            '~ # insmod /lib/modules/ubi.ko mtd=0\n' +
            '[   14.860606] ubi0: attaching mtd0\n' +
            '[   14.863223] ubi0: scanning is finished\n' +
            '[   14.863602] ubi0 error: ubi_read_volume_table [ubi]: the layout volume was not found\n' +
            '[   14.875568] ubi0 error: ubi_attach_mtd_dev [ubi]: failed to attach mtd0, error -22\n' +
            '[   14.876039] UBI error: cannot attach mtd0\n' +
            '[   14.878289] UBI error: cannot initialize UBI, error -22\n' +
            'insmod: can\'t insert \'/lib/modules/ubi.ko\': invalid parameter',
            notes: [
              '<code>hexdump</code> mất vài giây để đọc hết 128 MiB. Dấu thời gian khác trên máy bạn.'
            ] },

          { t: 'p', x:
            '<code>/proc/mtd</code> cho ba con số: kích thước <code>0x08000000</code> = 128 MiB, ' +
            'khối xoá <code>0x00040000</code> = <b>256 KiB</b>, loại <code>nor</code>. ' +
            '<code>hexdump</code> cho thấy toàn bộ 128 MiB là số <b>0</b> (dấu <code>*</code> nghĩa ' +
            'là \"các dòng sau giống hệt\") — QEMU tạo flash rỗng bằng số 0.' },

          { t: 'cal', kind: 'warn', title: 'Flash \"trống\" phải toàn 0xFF, không phải 0x00',
            x: 'Một khối flash vừa xoá có mọi bit bằng <code>1</code>, tức mọi byte bằng ' +
               '<code>0xFF</code>. UBI quét flash, thấy toàn <code>0x00</code> — không phải trống, ' +
               'cũng không phải dữ liệu UBI hợp lệ — và kết luận flash chứa thứ gì đó lạ mà nó không ' +
               'được phép đè lên: <code>the layout volume was not found</code>, ' +
               '<code>error -22</code> (<code>EINVAL</code>). <code>insmod</code> dịch mã đó thành ' +
               '<code>invalid parameter</code>, dễ khiến bạn đi kiểm tra tham số ' +
               '<code>mtd=0</code> một cách vô ích. Trên bo mạch thật, flash mới xuất xưởng đã là ' +
               '<code>0xFF</code>, nhưng một flash từng chứa thứ khác thì phải được xoá trước. ' +
               'Chạy chương trình của bạn:' },

          { t: 'code', where: 'qemu', code:
            'erase_mtd /dev/mtd0\n' +
            'hexdump -C /dev/mtd0 | head -n 3\n' +
            'insmod /lib/modules/ubi.ko mtd=0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # erase_mtd /dev/mtd0\n' +
            '/dev/mtd0: size 134217728, erase block 262144, 512 blocks\n' +
            'erased 512 blocks\n' +
            '~ # hexdump -C /dev/mtd0 | head -n 3\n' +
            '00000000  ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff  |................|\n' +
            '*\n' +
            '08000000\n' +
            '~ # insmod /lib/modules/ubi.ko mtd=0\n' +
            '[   22.858367] ubi0: attaching mtd0\n' +
            '[   22.861243] ubi0: scanning is finished\n' +
            '[   22.861421] ubi0: empty MTD device detected\n' +
            '[   22.868672] ubi0: attached mtd0 (name "0.flash", size 128 MiB)\n' +
            '[   22.868871] ubi0: PEB size: 262144 bytes (256 KiB), LEB size: 262016 bytes\n' +
            '[   22.869031] ubi0: min./max. I/O unit sizes: 1/4096, sub-page size 1\n' +
            '[   22.869204] ubi0: VID header offset: 64 (aligned 64), data offset: 128\n' +
            '[   22.869352] ubi0: good PEBs: 512, bad PEBs: 0, corrupted PEBs: 0\n' +
            '[   22.869486] ubi0: user volume: 0, internal volumes: 1, max. volumes count: 128\n' +
            '[   22.869637] ubi0: max/mean erase counter: 0/0, WL threshold: 4096, image sequence number: 3785243129\n' +
            '[   22.869827] ubi0: available PEBs: 508, total reserved PEBs: 4, PEBs reserved for bad PEB handling: 0\n' +
            '[   22.870044] ubi0: background thread "ubi_bgt0d" started, PID 68',
            notes: [
              '<code>image sequence number</code> là số ngẫu nhiên, khác mỗi lần tạo UBI mới. PID của luồng nền cũng khác.'
            ] },

          { t: 'p', x:
            '<code>erase_mtd</code> in đúng phép tính: 134 217 728 ÷ 262 144 = <b>512</b> khối, và ' +
            '<code>hexdump</code> giờ toàn <code>ff</code>. Lần này UBI nói <code>empty MTD device ' +
            'detected</code> và tự định dạng. Mấy dòng tiếp theo chính là tầng UBI của hình ở phần ' +
            'lý thuyết, viết bằng số:' },

          { t: 'list', ordered: true, items: [
            '<code>PEB size: 262144</code>, <code>LEB size: 262016</code> — mỗi khối xoá vật lý ' +
              '(PEB) 256 KiB, nhưng khối logic (LEB) mà UBIFS được dùng nhỏ hơn đúng <b>128</b> byte. ' +
              'Dòng <code>data offset: 128</code> giải thích: 128 byte đầu mỗi PEB là hai header của ' +
              'UBI — bộ đếm số lần xoá và số hiệu volume/LEB. Đó là chỗ UBI ghi nhớ khối nào đã mòn ' +
              'tới đâu.',
            '<code>good PEBs: 512, bad PEBs: 0</code> — flash giả lập không có khối hỏng. Trên NAND ' +
              'thật, vài khối hỏng từ lúc xuất xưởng là chuyện bình thường.',
            '<code>available PEBs: 508, total reserved PEBs: 4</code> — UBI giữ lại 4 khối: <b>2</b> ' +
              'cho bảng volume (<code>internal volumes: 1</code>, chép hai bản cho an toàn), 1 để ' +
              'cân bằng hao mòn và 1 cho các thao tác đổi khối nguyên tử. Bạn có thể đếm lại trong ' +
              '<code>drivers/mtd/ubi/</code>: <code>UBI_LAYOUT_VOLUME_EBS 2</code>, ' +
              '<code>WL_RESERVED_PEBS 1</code>, <code>EBA_RESERVED_PEBS 1</code>.',
            '<code>max/mean erase counter: 0/0</code> — chưa khối nào bị xoá lần nào (theo UBI). ' +
              'Hãy nhớ con số này; bạn sẽ gặp lại nó sau khi reboot.'
          ] },

          { t: 'p', x:
            'UBI giờ là một \"thùng chứa\". Tạo một volume 16 MiB tên <code>data</code> trong đó, rồi ' +
            'thử gắn UBIFS lên:' },

          { t: 'code', where: 'qemu', code:
            'ubimkvol /dev/ubi0 -N data -s 16MiB\n' +
            'ls -l /dev/ubi*\n' +
            'insmod /lib/modules/ubifs.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ubimkvol /dev/ubi0 -N data -s 16MiB\n' +
            '~ # ls -l /dev/ubi*\n' +
            'crw-------    1 root     root      510,   0 Sep 29 03:59 /dev/ubi0\n' +
            'crw-------    1 root     root      510,   1 Sep 29 03:59 /dev/ubi0_0\n' +
            'crw-------    1 root     root       10, 258 Sep 29 03:59 /dev/ubi_ctrl\n' +
            '~ # insmod /lib/modules/ubifs.ko\n' +
            'insmod: can\'t insert \'/lib/modules/ubifs.ko\': unknown symbol in module or invalid parameter',
            notes: [
              'Số major <code>510</code> được cấp động, có thể khác trên máy bạn.'
            ] },

          { t: 'cmdx', cmd: 'ubimkvol /dev/ubi0 -N data -s 16MiB', title: 'Tạo một volume UBI',
            rows: [
              ['<code>/dev/ubi0</code>', 'Thiết bị UBI vừa gắn vào <code>mtd0</code>.', 'Một UBI có thể chứa tới 128 volume (<code>max. volumes count: 128</code>).'],
              ['<code>-N data</code>', 'Tên volume.', 'UBIFS gắn volume theo tên: <code>ubi0:data</code>.'],
              ['<code>-s 16MiB</code>', 'Kích thước.', 'Làm tròn lên thành số LEB nguyên: 16 MiB ÷ 262 016 B → <b>65</b> LEB. Bạn sẽ thấy lại số 65.']
            ]},

          { t: 'p', x:
            '<code>ubimkvol</code> im lặng khi thành công, và <code>/dev/ubi0_0</code> xuất hiện — ' +
            'volume số 0 của UBI số 0. Nhưng <code>insmod ubifs.ko</code> thất bại với ' +
            '<code>unknown symbol in module</code>, dù <code>ubi.ko</code> — module duy nhất nó phụ ' +
            'thuộc — đã nạp. Nguyên nhân không nằm ở symbol nào cả, và phải đào log mới thấy. ' +
            'Nhưng log cũng chơi khăm bạn một lần nữa:' },

          { t: 'code', where: 'qemu', code:
            'dmesg | tail -n 1\n' +
            'echo mark > /dev/kmsg; dmesg | tail -n 2' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # dmesg | tail -n 1\n' +
            '[   10.010906] ubi0: background thread "ubi_bgt0d" started, PID 61\n' +
            '~ # echo mark > /dev/kmsg; dmesg | tail -n 2\n' +
            '[   12.857453] UBIFS error (pid 63): cannot initialize compressor zstd, error -2\n' +
            '[   15.851924] mark\n' +
            '[   12.857453] UBIFS error (pid 63): cannot initialize compressor zstd, error -2\n' +
            '[   15.851924] mark',
            notes: [
              'Bản chụp này từ một lần chạy riêng để tách hiện tượng ra, nên dấu thời gian và PID không nối tiếp khối trên. Hai dòng cuối xuất hiện hai lần: một lần do console in ra lúc chúng được ghi vào log, một lần do <code>dmesg</code>.'
            ] },

          { t: 'p', x:
            'Lệnh <code>dmesg</code> thứ nhất chạy <b>sau</b> khi <code>insmod</code> thất bại, mà dòng ' +
            'cuối vẫn là thông báo cũ của UBI — như thể UBIFS không nói gì. Bạn phải tự ghi một dòng ' +
            'vào log (<code>/dev/kmsg</code>, Bài 41) thì thông báo lỗi mới hiện ra, mang dấu thời gian ' +
            '<b>12,86 s</b> — sớm hơn dòng <code>mark</code> 3 giây. Nguyên nhân nằm ở ' +
            '<code>fs/ubifs/compress.c:309</code>: chuỗi định dạng của <code>pr_err</code> thiếu ký tự ' +
            '<code>\\n</code> ở cuối. printk coi một dòng không có <code>\\n</code> là dòng chưa viết ' +
            'xong, giữ nó trong bộ đệm chờ phần tiếp theo, và chỉ ghi vào log khi có thông báo kế ' +
            'tiếp đẩy nó ra. Một lỗi chính tả một ký tự trong kernel, đủ để giấu nguyên nhân khỏi ' +
            'người đang gỡ lỗi.' },

          { t: 'cal', kind: 'why', title: 'Thông báo nói \"symbol\", nguyên nhân là \"bộ nén\"',
            x: 'Khi khởi tạo, UBIFS xin kernel ba bộ nén lần lượt: <code>lzo</code>, ' +
               '<code>zstd</code>, <code>zlib</code> (<code>fs/ubifs/compress.c:339–347</code>). ' +
               '<code>lzo</code> được build sẵn trong kernel (<code>CONFIG_CRYPTO_LZO=y</code>), còn ' +
               '<code>zstd</code> và <code>deflate</code> (thuật toán của zlib) là module ' +
               '(<code>=m</code>). Thiếu một cái, UBIFS trả <code>-ENOENT</code> (<code>-2</code>) và ' +
               'từ chối nạp. BusyBox <code>insmod</code> dịch <b>mọi</b> <code>ENOENT</code> thành ' +
               'cùng một câu <code>unknown symbol in module, or unknown parameter</code> ' +
               '(<code>modutils/modutils.c:270–271</code>) — nên câu báo lỗi chỉ sai hướng. Trên một ' +
               'hệ thống đầy đủ, kernel sẽ tự gọi <code>modprobe</code> để nạp ' +
               '<code>crypto-zstd</code>; initramfs này không có <code>modprobe</code> đúng nghĩa, ' +
               'nên bạn phải nạp tay. Chặng 10, bắt đầu từ Bài 50, sẽ dạy module và cách chúng phụ thuộc ' +
               'nhau. Nguyên tắc cho bây giờ: <b>khi <code>insmod</code> thất ' +
               'bại, luôn đọc <code>dmesg</code></b> — thông báo của userspace chỉ là một bản dịch.' },

          { t: 'code', where: 'qemu', code:
            'cd /lib/modules; insmod zstd_compress.ko; insmod zstd.ko; insmod deflate.ko; insmod ubifs.ko; cd /\n' +
            'lsmod\n' +
            'mkdir /data; mount -t ubifs ubi0:data /data\n' +
            'df -h /data\n' +
            'echo "written before reboot" > /data/note; sync\n' +
            'reboot' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # lsmod\n' +
            'ubifs 286720 0 - Live 0xffff80007b074000\n' +
            'deflate 12288 1 - Live 0xffff80007b063000\n' +
            'zstd 12288 1 - Live 0xffff80007b06e000\n' +
            'zstd_compress 442368 1 zstd, Live 0xffff80007aff4000\n' +
            'ubi 131072 1 ubifs, Live 0xffff80007afd0000\n' +
            '~ # mkdir /data; mount -t ubifs ubi0:data /data\n' +
            '[   33.869639] UBIFS (ubi0:0): default file-system created\n' +
            '[   33.871331] UBIFS (ubi0:0): Mounting in unauthenticated mode\n' +
            '[   33.872587] UBIFS (ubi0:0): background thread "ubifs_bgt0_0" started, PID 81\n' +
            '[   33.882175] UBIFS (ubi0:0): UBIFS: mounted UBI device 0, volume 0, name "data"\n' +
            '[   33.882449] UBIFS (ubi0:0): LEB size: 262016 bytes (255 KiB), min./max. I/O unit sizes: 8 bytes/4096 bytes\n' +
            '[   33.882705] UBIFS (ubi0:0): FS size: 14410880 bytes (13 MiB, 55 LEBs), max 65 LEBs, journal size 2096129 bytes (1 MiB, 6 LEBs)\n' +
            '[   33.883077] UBIFS (ubi0:0): reserved for root: 680661 bytes (664 KiB)\n' +
            '[   33.883244] UBIFS (ubi0:0): media format: w5/r0 (latest is w5/r0), UUID 92A0932D-20AE-4E23-8A2B-3C188EB57F6C, small LPT model\n' +
            '~ # df -h /data\n' +
            'Filesystem                Size      Used Available Use% Mounted on\n' +
            'ubi0:data                11.3M     16.0K     10.6M   0% /data\n' +
            '~ # echo "written before reboot" > /data/note; sync\n' +
            '~ # reboot\n' +
            '[   41.881324] UBIFS (ubi0:0): un-mount UBI device 0\n' +
            '...\n' +
            '[   43.897298] reboot: Restarting system',
            notes: [
              'UUID, địa chỉ module trong <code>lsmod</code>, PID và dấu thời gian khác trên máy bạn. Nếu bạn bỏ qua lệnh <code>echo mark</code> ở trên, console sẽ in thêm dòng <code>UBIFS error … cannot initialize compressor zstd</code> ngay trước <code>default file-system created</code>: thông báo cũ bị giữ trong bộ đệm cuối cùng cũng được thông báo mới của UBIFS đẩy ra. Đó không phải lỗi mới.'
            ] },

          { t: 'p', x:
            'Lần này <code>insmod ubifs.ko</code> im lặng — thành công. <code>lsmod</code> kể lại ' +
            'chuỗi phụ thuộc: cột thứ ba đếm số module đang dùng mỗi module (<code>ubi</code> được ' +
            '<code>ubifs</code> dùng, <code>zstd_compress</code> được <code>zstd</code> dùng). Đọc ' +
            'các dòng của UBIFS:' },

          { t: 'list', ordered: true, items: [
            '<code>default file-system created</code> — không cần <code>mkfs.ubifs</code>: UBIFS ' +
              'thấy volume rỗng và tự định dạng lúc gắn lần đầu. (Để nạp sẵn nội dung từ máy host, ' +
              'người ta dùng <code>mkfs.ubifs</code> + <code>ubinize</code> — Chặng 11 sẽ để ' +
              'Buildroot làm việc này.)',
            '<code>max 65 LEBs</code> — đúng 65 LEB từ <code>-s 16MiB</code>. Trong đó UBIFS lấy ' +
              '<b>6</b> LEB làm <b>journal</b> — nơi mọi thay đổi được ghi trước, để mất điện giữa ' +
              'chừng không bao giờ để lại hệ thống file nửa vời — và phần còn lại cho chỉ mục và dữ ' +
              'liệu.',
            '<code>df</code> báo <b>11,3M</b> dùng được trên một volume 16 MiB. Khoảng 30 % là ' +
              'chi phí: journal, chỉ mục cây B+, và <code>reserved for root</code> 664 KiB. Đó là ' +
              'cái giá của khả năng chịu mất điện trên flash.'
          ] },

          { t: 'p', x:
            'Máy ảo khởi động lại — cùng tiến trình QEMU, nên flash vẫn còn nguyên nội dung như ' +
            'trên một bo mạch thật. Initramfs thì được giải nén mới hoàn toàn. Khi có dấu nhắc:' },

          { t: 'code', where: 'qemu', code:
            'cat /data/note\n' +
            'cd /lib/modules; insmod zstd_compress.ko; insmod zstd.ko; insmod deflate.ko; insmod ubi.ko mtd=0; insmod ubifs.ko; cd /\n' +
            'mkdir /data; mount -t ubifs ubi0:data /data; cat /data/note\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /data/note\n' +
            'cat: can\'t open \'/data/note\': No such file or directory\n' +
            '~ # cd /lib/modules; insmod zstd_compress.ko; …; insmod ubifs.ko; cd /\n' +
            '[   12.915392] ubi0: attaching mtd0\n' +
            '[   12.919442] ubi0: scanning is finished\n' +
            '[   12.925182] ubi0: attached mtd0 (name "0.flash", size 128 MiB)\n' +
            '...\n' +
            '[   12.926054] ubi0: user volume: 1, internal volumes: 1, max. volumes count: 128\n' +
            '[   12.926218] ubi0: max/mean erase counter: 2/1, WL threshold: 4096, image sequence number: 3785243129\n' +
            '[   12.926426] ubi0: available PEBs: 443, total reserved PEBs: 69, PEBs reserved for bad PEB handling: 0\n' +
            '...\n' +
            '~ # mkdir /data; mount -t ubifs ubi0:data /data; cat /data/note\n' +
            '[   16.875310] UBIFS (ubi0:0): Mounting in unauthenticated mode\n' +
            '...\n' +
            '[   16.885400] UBIFS (ubi0:0): UBIFS: mounted UBI device 0, volume 0, name "data"\n' +
            '...\n' +
            'written before reboot\n' +
            '~ # poweroff',
            notes: [
              'Dòng lệnh <code>insmod</code> dài được rút gọn bằng <code>…</code> trong bản chụp. Lược các dòng UBI/UBIFS giống hệt lần gắn trước.'
            ] },

          { t: 'cal', kind: 'why', title: 'Ba bằng chứng rằng flash đã nhớ',
            x: '<b>Một</b>: <code>cat /data/note</code> đầu tiên thất bại — <code>/data</code> hiện ' +
               'chỉ là thư mục trong tmpfs mới, đúng như bước 1 đã dạy. <b>Hai</b>: UBI gắn lại ' +
               '<b>không</b> in <code>empty MTD device detected</code>, và báo ' +
               '<code>user volume: 1</code>, <code>available PEBs: 443</code>, ' +
               '<code>reserved PEBs: 69</code> = 4 + 65 — volume <code>data</code> vẫn nằm đó. ' +
               '<code>image sequence number</code> giống hệt lần trước: cùng một UBI, không phải UBI ' +
               'mới. <code>max/mean erase counter: 2/1</code> — các khối đã bắt đầu bị xoá và UBI ' +
               'đã <b>đếm</b>; cân bằng hao mòn bắt đầu làm việc. <b>Ba</b>: UBIFS gắn mà không ' +
               '<code>default file-system created</code>, và <code>written before reboot</code> ' +
               'trở về. Đây là hình mẫu của mọi thiết bị có flash thô: rootfs trong initramfs hoặc ' +
               'SquashFS, dữ liệu của người dùng trên UBIFS.' }
        ] }
    ] },

    /* ============================================================
       5. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều được dựng lại thật trong lúc soạn bài. Để ý năm dòng đầu: cả năm ' +
      'đều không có thông báo nào gọi thẳng tên nguyên nhân — phải suy ra từ những gì <i>xung ' +
      'quanh</i> dòng lỗi.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>rdinit=/init failed: -2, ignoring</code> rồi <code>VFS: Cannot open root device ""</code> và panic, dù vừa thấy <code>Unpacking initramfs...</code>',
         'Kho cpio giải nén tốt nhưng không có <code>/init</code>. Rootfs viết cho ổ đĩa chỉ có ' +
         '<code>/sbin/init</code>.',
         '<code>ln -s sbin/init initramfs/init</code> rồi đóng gói lại; hoặc thêm ' +
         '<code>rdinit=/sbin/init</code> vào dòng lệnh kernel.'],

        ['<code>can\'t open /dev/ttyAMA0: No such file or directory</code> lặp lại mỗi giây, không có dấu nhắc',
         'Initramfs không có devtmpfs: kernel chỉ tự gắn nó khi boot từ ổ đĩa. ' +
         '<code>/dev</code> chỉ có <code>console</code>, nên shell trên <code>ttyAMA0</code> chết và ' +
         'bị <code>respawn</code> mãi.',
         'Gắn devtmpfs từ <code>fstab</code> (<code>devtmpfs /dev devtmpfs defaults 0 0</code>) hoặc ' +
         'trong <code>/init</code>. Sau <code>switch_root</code>: nhớ <code>mount --move /dev</code> ' +
         'sang rootfs mới.'],

        ['<code>Initramfs unpacking failed: invalid magic at start of compressed archive</code>',
         'File đưa qua <code>-initrd</code> không phải cpio, gzip hay xz — thường là một ảnh đĩa ' +
         '(initrd kiểu cũ), hoặc một cpio định dạng khác <code>newc</code>. Kernel không có ' +
         '<code>CONFIG_BLK_DEV_RAM</code> nên không thử gắn nó như đĩa.',
         '<code>od -A n -t x1 -N 6 FILE</code> để xem magic. Đóng gói lại bằng ' +
         '<code>cpio --format=newc</code>. Một ảnh ext4 thì đưa qua <code>-drive</code> + ' +
         '<code>root=</code>, không qua <code>-initrd</code>.'],

        ['<code>Initramfs unpacking failed: Input was encoded with settings that are not supported by this XZ decoder</code>',
         'Nén bằng <code>xz</code> với mã kiểm tra mặc định CRC64. Bộ giải nén trong kernel chỉ hiểu ' +
         'CRC32.',
         '<code>xz --check=crc32 --lzma2=dict=1MiB</code>. Kiểm tra bằng <code>xz -l</code>: cột ' +
         '<code>Check</code> phải là <code>CRC32</code>.'],

        ['<code>Filesystem uses "xz" compression. This is not supported</code> rồi <code>No filesystem could mount root</code>',
         'SquashFS nén bằng thuật toán kernel không được build để đọc. <code>defconfig</code> ARM64 ' +
         'chỉ có <code>CONFIG_SQUASHFS_ZLIB</code>.',
         '<code>mksquashfs … -comp gzip</code>, hoặc bật <code>CONFIG_SQUASHFS_XZ</code> / ' +
         '<code>ZSTD</code> và build lại kernel. Kiểm tra: <code>grep SQUASHFS_ .config</code>.'],

        ['<code>touch: …: Read-only file system</code> dù <code>mount -o remount,rw /</code> trả về 0',
         'Rootfs là SquashFS: không có cách ghi nào. Kernel lặng lẽ ép lại cờ chỉ đọc mỗi lần ' +
         'remount.',
         'Đúng như thiết kế. Ghi vào <code>/tmp</code>, một phân vùng dữ liệu riêng, hoặc dựng ' +
         'overlayfs từ một initramfs như bước 5.'],

        ['<code>mount: mounting overlay on /mnt/root failed: No such device</code>, rồi <code>switch_root</code> in trang hướng dẫn sử dụng và kernel panic',
         'Chưa nạp <code>overlay.ko</code> — <code>CONFIG_OVERLAY_FS=m</code>. \"No such device\" ' +
         'nghĩa là kernel không biết loại hệ thống file đó (như <code>sysf</code> ở Bài 47). ' +
         '<code>/mnt/root</code> vì thế không phải điểm gắn, <code>switch_root</code> từ chối.',
         '<code>insmod /lib/modules/overlay.ko</code> trước dòng <code>mount -t overlay</code>. ' +
         'Kiểm tra: <code>grep overlay /proc/filesystems</code>.'],

        ['<code>Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000100</code> ngay sau trang hướng dẫn của <code>switch_root</code>',
         'Gọi <code>switch_root</code> <b>không có</b> <code>exec</code>: nó là con của shell, không ' +
         'phải PID 1, nên in cách dùng và thoát. Shell <code>/init</code> hết lệnh, thoát theo — ' +
         'PID 1 chết.',
         'Luôn viết <code>exec switch_root …</code> ở dòng cuối của <code>/init</code>.'],

        ['<code>ubi0 error: … the layout volume was not found</code>, <code>error -22</code>; <code>insmod</code> nói <code>invalid parameter</code>',
         'Flash không trống (toàn <code>0x00</code> hoặc dữ liệu lạ) mà cũng không chứa UBI hợp lệ. ' +
         'UBI không dám tự đè lên.',
         'Xoá flash trước: <code>erase_mtd /dev/mtd0</code> của bước 6, hoặc <code>flash_erase</code> ' +
         '/ <code>ubiformat</code> từ <code>mtd-utils</code> trên hệ thống có sẵn chúng.'],

        ['<code>insmod: can\'t insert \'ubifs.ko\': unknown symbol in module or invalid parameter</code>, và <code>dmesg | tail</code> không cho thấy gì mới',
         'UBIFS không lấy được bộ nén <code>zstd</code> hoặc <code>zlib</code> (<code>-ENOENT</code>). ' +
         'BusyBox dịch mọi <code>ENOENT</code> thành câu \"unknown symbol\". Thông báo thật của ' +
         'kernel bị giữ trong bộ đệm printk vì thiếu <code>\\n</code>.',
         '<code>echo mark &gt; /dev/kmsg; dmesg | tail</code> để đẩy nó ra. Nạp ' +
         '<code>zstd_compress.ko</code>, <code>zstd.ko</code>, <code>deflate.ko</code> trước ' +
         '<code>ubifs.ko</code>.'],

        ['<code>df: /: can\'t find mount point</code> trong initramfs',
         'BusyBox <code>df</code> bỏ qua mọi hệ thống file tên <code>rootfs</code> ' +
         '(<code>CONFIG_FEATURE_SKIP_ROOTFS</code>). Không phải lỗi của rootfs.',
         'Đọc <code>Shmem</code> trong <code>/proc/meminfo</code>, hoặc <code>df -h /tmp</code> cho ' +
         'một tmpfs khác.']
      ] },

    /* ============================================================
       6. TÓM TẮT, BÀI TIẾP THEO
       ============================================================ */
    { t: 'recap', title: 'Tóm tắt', items: [
      'Kernel luôn có một <b>rootfs</b> (tmpfs) trong RAM. <b>initramfs</b> là kho cpio ' +
        '<code>newc</code> được giải nén vào đó. Có <code>/init</code> → kernel chạy nó làm PID 1, ' +
        '<b>không</b> đọc <code>root=</code>, <b>không</b> gắn devtmpfs.',
      'Chuyển một rootfs từ đĩa sang initramfs cần đúng <b>hai</b> thay đổi: <code>/init</code> và ' +
        'một dòng <code>devtmpfs</code>. Thiếu cái đầu → panic <code>(0,0)</code>; thiếu cái sau → ' +
        '<code>can\'t open /dev/ttyAMA0</code> mỗi giây.',
      'Cùng rootfs <b>2 155 520</b> B: gzip <b>1 186 547</b> B, xz <b>941 380</b> B. Giải nén ' +
        '<b>≈68 / 159 / 450 ms</b>. Nén chỉ giảm RAM lúc nạp; sau đó RAM bị giữ bằng toàn bộ rootfs ' +
        '(<code>Shmem 2076 kB</code>) cho mọi kiểu nén, còn ext4 thì <code>Shmem 0</code>.',
      'xz cho kernel phải dùng <code>--check=crc32</code>; từ điển nên nhỏ (<code>dict=1MiB</code>, ' +
        'như Kbuild) — <code>-9</code> tốn thêm <b>9,4 MB</b> RAM lúc giải nén.',
      '<b>initrd</b> là ảnh đĩa trong <code>/dev/ram0</code>, chạy <code>/linuxrc</code>; cần ' +
        '<code>CONFIG_BLK_DEV_RAM</code> — tắt trong <code>defconfig</code>, và đã bị đánh dấu ' +
        '<i>deprecated</i>. Đưa ảnh đĩa qua <code>-initrd</code> → <code>invalid magic</code>.',
      'Flash thô là <b>MTD</b>: không ghi đè, xoá theo khối (<b>256 KiB</b> trên <code>virt</code>), ' +
        'hao mòn. Thiết bị khối → ext4 / SquashFS / EROFS; MTD → <b>UBI + UBIFS</b>.',
      '<b>SquashFS</b>: nén, chỉ đọc, không hỏng vì mất điện — <b>1 200 128</b> B so với ảnh ext4 ' +
        '64 MiB. Thuật toán nén phải khớp <code>CONFIG_SQUASHFS_*</code>.',
      '<b>overlayfs</b> = lower chỉ đọc + upper ghi được; ghi → <b>copy-up</b>, xoá → ' +
        '<b>whiteout</b> (thiết bị ký tự <code>0,0</code>). Dựng từ initramfs giai đoạn 1, chuyển ' +
        'bằng <code>exec switch_root</code>. UBIFS trên UBI giữ <code>/data/note</code> qua ' +
        '<code>reboot</code>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Suốt bài này, dòng cuối của <code>/init</code> luôn là <code>exec</code> — và khi bạn ' +
         'quên nó, kernel panic với <code>Attempted to kill init!</code> ngay lập tức. Bài 46 ' +
         'thấy câu đó khi shell PID 1 thoát, Bài 47 thấy <code>respawn</code> hồi sinh một shell ' +
         'đã chết, và bước 5 vừa rồi, <code>switch_root</code> từ chối chạy nếu không phải PID 1. ' +
         '<b>Bài 49 — init: từ /init đến systemd</b> trả lời câu hỏi cả ba bài đã né: PID 1 có gì ' +
         'đặc biệt mà kernel không cho nó chết? Bài 49 sẽ cho PID 1 nhận tín hiệu và nhặt tiến ' +
         'trình mồ côi trước mắt bạn, đặt BusyBox init cạnh SysV và systemd, rồi dùng ' +
         '<code>respawn</code> — và một unit systemd — để giữ daemon <code>temp_daemon</code> của ' +
         'Chặng 03 sống qua mọi lần chết.' }
  ],

  quiz: [
    { q: 'Bạn đóng gói một rootfs boot tốt từ ổ đĩa thành <code>rootfs.cpio.gz</code> và boot bằng <code>-initrd</code>, không có <code>-drive</code>. Log có <code>Unpacking initramfs...</code>, rồi <code>check access for rdinit=/init failed: -2, ignoring</code>, rồi panic <code>VFS: Unable to mount root fs on unknown-block(0,0)</code>. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Kho cpio bị hỏng nên kernel không giải nén được.',
        'Rootfs không có file <code>/init</code>; không tìm thấy nó, kernel chuyển sang tìm ổ đĩa theo <code>root=</code>, mà không có ổ nào.',
        'Kernel thiếu <code>CONFIG_BLK_DEV_RAM</code>.',
        'Phải thêm <code>root=/dev/ram0</code> vào dòng lệnh kernel.'
      ],
      a: 1,
      why: 'Nếu kho hỏng, sẽ có dòng <code>Initramfs unpacking failed</code>; ở đây không có — giải nén thành công. <code>-2</code> là <code>ENOENT</code> cho đúng đường dẫn <code>/init</code>. Không có <code>/init</code>, <code>init/main.c</code> gọi <code>prepare_namespace()</code>, và không có <code>root=</code> thì panic <code>(0,0)</code>. Rootfs viết cho ổ đĩa chỉ có <code>/sbin/init</code>; sửa bằng một symlink <code>/init</code> hoặc <code>rdinit=/sbin/init</code>. <code>BLK_DEV_RAM</code> và <code>/dev/ram0</code> thuộc về initrd kiểu cũ, không liên quan.' },

    { q: 'Rootfs của bạn chạy tốt từ ext4. Đưa vào initramfs và thêm <code>rdinit=/sbin/init</code>, <code>rcS</code> chạy xong rồi dòng <code>can\'t open /dev/ttyAMA0: No such file or directory</code> lặp lại mỗi giây. Vì sao cùng một <code>inittab</code> lại hỏng?',
      opts: [
        'Trong initramfs, kernel đặt tên UART khác là <code>ttyS0</code>.',
        'Initramfs chỉ đọc nên init không mở được terminal.',
        'Khi boot từ initramfs, kernel không gắn devtmpfs — việc đó nằm trong <code>prepare_namespace()</code>, hàm chỉ chạy trên đường ổ đĩa. <code>/dev</code> chỉ có <code>console</code>.',
        'BusyBox init không hỗ trợ <code>respawn</code> khi chạy từ RAM.'
      ],
      a: 2,
      why: '<code>devtmpfs_mount()</code> là dòng cuối của <code>prepare_namespace()</code> (<code>init/do_mounts.c:493</code>). Có <code>/init</code> hay <code>rdinit=</code> hợp lệ, kernel không bao giờ vào hàm đó. Dòng <code>respawn</code> cần mở <code>/dev/ttyAMA0</code>, không có, shell chết, init hồi sinh mỗi giây. Initramfs là tmpfs, ghi được; tên UART vẫn là <code>ttyAMA0</code>. Sửa: gắn devtmpfs trong <code>fstab</code> hoặc <code>/init</code>.' },

    { q: 'Cùng một rootfs 2,1 MiB, đóng gói ba cách: cpio thô, gzip, xz. Sau khi boot xong, <code>Shmem</code> trong <code>/proc/meminfo</code> là bao nhiêu ở mỗi cách?',
      opts: [
        'Bằng kích thước file nén: xz nhỏ nhất, thô lớn nhất.',
        'Giống hệt nhau cho cả ba (<code>2076 kB</code>): nén chỉ ảnh hưởng lúc nạp; sau khi giải nén, tmpfs chứa toàn bộ file gốc.',
        'Bằng 0 cho cả ba, vì kernel đã <code>Freeing initrd memory</code>.',
        'xz lớn nhất, vì kernel giữ lại từ điển giải nén.'
      ],
      a: 1,
      why: 'Bước 2 đo được <code>Shmem: 2076 kB</code> cho cả ba — đúng dung lượng các file trong rootfs. <code>Freeing initrd memory</code> trả lại vùng chứa <i>file nén</i> (2104 / 1156 / 916 KiB), không phải nội dung đã giải nén. Bộ nhớ từ điển của xz là tạm thời lúc giải nén; nó chỉ lộ ra nếu bạn dùng từ điển quá lớn (<code>-9</code>). Nguyên tắc: initramfs trả giá bằng RAM cho toàn bộ rootfs suốt đời hệ thống.' },

    { q: 'Điểm khác biệt cốt lõi giữa <b>initrd</b> và <b>initramfs</b> là gì?',
      opts: [
        'initrd nén bằng gzip, initramfs nén bằng xz.',
        'initrd là một ảnh đĩa được nạp vào thiết bị khối <code>/dev/ram0</code> rồi gắn như đĩa, chạy <code>/linuxrc</code>; initramfs là kho cpio giải nén thẳng vào tmpfs, chạy <code>/init</code> làm PID 1.',
        'initrd dùng cho ARM, initramfs dùng cho x86.',
        'Không khác gì — hai tên cho cùng một thứ, vì QEMU gọi cả hai là <code>-initrd</code>.'
      ],
      a: 1,
      why: 'Tên tham số <code>-initrd</code> và <code>CONFIG_BLK_DEV_INITRD</code> là di sản; cơ chế thì khác hẳn. initrd cần <code>CONFIG_BLK_DEV_RAM</code> và driver của chính hệ thống file trong ảnh, tốn RAM hai lần (thiết bị khối + page cache), và <code>/linuxrc</code> không phải PID 1. initramfs không cần thiết bị khối nào. Kernel của bạn tắt <code>BLK_DEV_RAM</code>, nên ảnh ext4 đưa qua <code>-initrd</code> chỉ nhận được <code>invalid magic</code>. Kiểu nén không phân biệt hai thế hệ.' },

    { q: 'Một thiết bị IoT dùng rootfs SquashFS. Người dùng than rằng mỗi lần đổi cấu hình rồi khởi động lại, cấu hình mất sạch. Rootfs dựng bằng initramfs giai đoạn 1: SquashFS làm <code>lowerdir</code>, tmpfs làm <code>upperdir</code>, rồi <code>switch_root</code>. Nguyên nhân và cách sửa đúng?',
      opts: [
        'SquashFS bị hỏng; phải tạo lại ảnh bằng <code>-noappend</code>.',
        'Thiếu <code>sync</code> trước khi tắt máy.',
        'Mọi thay đổi nằm trong <code>upperdir</code>, mà <code>upperdir</code> là tmpfs trong RAM — mất khi tắt máy. Muốn giữ, đặt <code>upperdir</code> lên một phân vùng ghi được, ví dụ UBIFS trên flash.',
        'Phải <code>mount -o remount,rw /</code> trong <code>rcS</code> để SquashFS ghi được.'
      ],
      a: 2,
      why: 'Bước 5 cho thấy đúng hành vi này: <code>hostname</code> sửa ở lần boot trước quay về <code>embedded</code>, <code>/etc/passwd</code> đã xoá quay lại — vì copy-up và whiteout đều nằm trong lớp upper tmpfs. Đó là thiết kế \"khôi phục cài đặt gốc bằng tắt máy\". Muốn lưu, thay tmpfs bằng phân vùng bền vững (OpenWrt dùng đúng cách này). SquashFS không bao giờ ghi được, kể cả sau <code>remount,rw</code> (bước 4 đã chứng minh); <code>sync</code> không giúp được dữ liệu nằm trong RAM.' },

    { q: 'Trên flash NOR của <code>virt</code>, <code>insmod ubi.ko mtd=0</code> báo <code>the layout volume was not found</code>, <code>error -22</code>, và <code>insmod</code> nói <code>invalid parameter</code>. <code>hexdump -C /dev/mtd0</code> cho thấy toàn byte <code>00</code>. Nên làm gì?',
      opts: [
        'Sửa tham số thành <code>mtd=/dev/mtd0</code>, vì <code>insmod</code> nói tham số sai.',
        'Xoá flash (mọi byte thành <code>0xFF</code>) rồi nạp lại <code>ubi.ko</code>; UBI sẽ thấy <code>empty MTD device detected</code> và tự định dạng.',
        'Dùng <code>mkfs.ext4 /dev/mtd0</code> trước.',
        'Nạp <code>ubifs.ko</code> trước <code>ubi.ko</code>.'
      ],
      a: 1,
      why: 'Flash vừa xoá là toàn <code>0xFF</code>. Toàn <code>0x00</code> không phải trống, cũng không phải UBI hợp lệ, nên UBI từ chối đè lên (<code>-EINVAL</code> = -22); câu <code>invalid parameter</code> chỉ là cách <code>insmod</code> dịch mã đó. Sau <code>erase_mtd</code>, bước 6 cho <code>empty MTD device detected</code> và 512 PEB tốt. ext4 không chạy trên MTD (nó cần thiết bị khối); <code>ubifs.ko</code> phụ thuộc <code>ubi.ko</code> nên phải nạp sau.' }
  ]
});

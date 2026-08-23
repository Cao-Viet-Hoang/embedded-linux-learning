/* Bài 35 — Dòng lệnh U-Boot
   Chặng 06 — Bootloader U-Boot
   124 lệnh tại dấu nhắc "=>", biến môi trường và cách nó sống sót qua reset,
   md/mw/cmp, load/booti/bootm, bootcmd vs bootargs, và tự viết boot.scr. */

Lesson.register({
  id: 'bai-35',
  title: 'Dòng lệnh U-Boot',
  minutes: 60,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Ở <b>Bài 34</b> bạn đã build U-Boot và gõ ba lệnh đầu tiên tại dấu nhắc <code>=&gt;</code>. ' +
    'Nhưng lúc đó dấu nhắc mới chỉ là một thứ để ngắm: bạn xem <code>version</code>, xem ' +
    '<code>bdinfo</code>, rồi tắt máy ảo. Bài này bạn <b>dùng</b> nó. U-Boot v2026.07 trên ' +
    'board <code>qemu_arm64</code> có <b>124 lệnh</b>, và chúng không phải một mớ hỗn độn — ' +
    'chúng phục vụ đúng một mục tiêu: <i>đưa được kernel từ một chỗ nào đó vào RAM, rồi nhảy ' +
    'vào nó đúng hợp đồng bàn giao ARM64 của Bài 33</i>. Bạn sẽ tự tay đi hết chặng đường đó: ' +
    'đọc và sửa <b>biến môi trường</b>, soi từng byte RAM bằng <code>md</code>, nạp một file ' +
    '<b>30 771 136 byte</b> từ ổ đĩa ảo vào địa chỉ <code>0x40400000</code>, và cuối cùng gõ ' +
    '<code>booti</code> để chính U-Boot — chứ không phải QEMU nữa — đặt <code>x0</code> và ' +
    'khởi động Linux. Bài đóng lại bằng thứ mọi board sản phẩm đều có: một <b>boot script</b> ' +
    'chạy tự động, không cần ai gõ gì.',

  goals: [
    'Phân loại được <b>124 lệnh</b> của U-Boot theo nhóm chức năng và tra cứu bằng <code>help &lt;lệnh&gt;</code>',
    'Giải thích được cảnh báo <code>bad CRC</code> lúc khởi động, và làm nó biến mất bằng <code>saveenv</code> đúng cách',
    'Phân biệt rành mạch <code>bootcmd</code> (U-Boot đọc) với <code>bootargs</code> (kernel đọc)',
    'Dùng <code>md</code>, <code>mw</code>, <code>cmp</code> để đọc và ghi RAM, và nhận ra số magic <code>d00dfeed</code> của device tree',
    'Nạp kernel + initramfs từ ổ đĩa ảo bằng <code>load</code>, rồi khởi động bằng <code>booti</code> với đủ ba tham số',
    'Đóng gói một chuỗi lệnh thành <code>boot.scr</code> bằng <code>mkimage -T script</code> và cho <code>bootcmd</code> tự chạy nó'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Dấu nhắc => là một shell thật
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Dấu nhắc <code>=&gt;</code> là một shell thật, chỉ là rất nhỏ' },

    { t: 'p', x:
      'Khi U-Boot in <code>=&gt;</code> và chờ, bạn đang đứng trước một <b>shell</b> theo đúng ' +
      'nghĩa bạn đã học ở <b>Bài 4</b>: nó đọc một dòng, tách thành từ, tra từ đầu tiên trong ' +
      'một bảng lệnh, rồi gọi hàm C tương ứng. Khác biệt nằm ở quy mô. Bash có hàng nghìn ' +
      'chương trình ngoài để gọi; U-Boot chỉ có <b>124 lệnh</b>, tất cả biên dịch cứng vào ' +
      'trong <code>u-boot.bin</code> — không có <code>$PATH</code>, không có tiến trình con, ' +
      'không có <code>fork()</code>. Ở thời điểm này trong vòng đời hệ thống, khái niệm "tiến ' +
      'trình" còn chưa tồn tại.' },

    { t: 'cal', kind: 'why', title: 'Vì sao bootloader lại cần tới 124 lệnh?',
      x: 'Vì U-Boot không biết trước bạn sẽ nạp kernel từ đâu. Cùng một nhị phân phải phục vụ ' +
         'được người nạp từ thẻ SD, người nạp từ eMMC, người nạp qua mạng TFTP, người nạp từ ' +
         'USB, người nạp từ NVMe. Mỗi nguồn kéo theo một nhóm lệnh. Trên board sản phẩm thật, ' +
         'người ta thường <b>tắt bớt</b> phần lớn số này trong <code>defconfig</code> để ảnh ' +
         'nhỏ lại và bề mặt tấn công hẹp lại — nhưng trong lúc học thì càng nhiều càng tốt.' },

    { t: 'table',
      head: ['Nhóm', 'Lệnh tiêu biểu', 'Dùng để làm gì'],
      rows: [
        ['Thông tin',   '<code>help</code> · <code>version</code> · <code>bdinfo</code> · <code>coninfo</code>',
         'Xem U-Boot đang biết gì về phần cứng và về chính nó'],
        ['Môi trường',  '<code>printenv</code> · <code>setenv</code> · <code>saveenv</code> · <code>editenv</code>',
         'Đọc/ghi các biến điều khiển toàn bộ hành vi boot'],
        ['Bộ nhớ',      '<code>md</code> · <code>mw</code> · <code>cmp</code> · <code>cp</code> · <code>crc32</code>',
         'Soi và sửa RAM trực tiếp — công cụ gỡ lỗi cơ bản nhất'],
        ['Lưu trữ',     '<code>virtio</code> · <code>ls</code> · <code>size</code> · <code>load</code> · <code>ext4load</code>',
         'Tìm file trên ổ đĩa/thẻ nhớ và đổ nó vào RAM'],
        ['Mạng',        '<code>dhcp</code> · <code>ping</code> · <code>tftpboot</code> · <code>wget</code>',
         'Nạp file qua mạng — nội dung chính của <b>Bài 36</b>'],
        ['Khởi động',   '<code>booti</code> · <code>bootm</code> · <code>bootz</code> · <code>boot</code> · <code>go</code>',
         'Bàn giao quyền điều khiển cho kernel'],
        ['Kịch bản',    '<code>source</code> · <code>run</code> · <code>echo</code> · <code>test</code> · <code>sleep</code>',
         'Ghép nhiều lệnh thành một quy trình tự động']
      ] },

    { t: 'p', x:
      'Không ai nhớ hết 124 lệnh, và bạn <b>không cần</b> nhớ. U-Boot mang sẵn tài liệu trong ' +
      'người: <code>help</code> liệt kê tất cả, còn <code>help md</code> in cú pháp của riêng ' +
      'lệnh <code>md</code>. Hãy tập phản xạ gõ <code>help &lt;lệnh&gt;</code> ngay tại dấu ' +
      'nhắc thay vì mở trình duyệt — trên board thật ngoài đời, lúc bạn cần thì thường là lúc ' +
      'không có gì khác ngoài cổng serial trước mặt.' },

    /* ══════════════════════════════════════════════════════════════════
       2. Môi trường
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Môi trường: bảng điều khiển của U-Boot' },

    { t: 'p', x:
      'U-Boot gần như <b>không có mã cứng</b> nào quyết định nó sẽ boot thế nào. Toàn bộ hành ' +
      'vi nằm trong một tập hợp cặp <code>tên=giá_trị</code> gọi là <b>môi trường</b> ' +
      '(environment). Đổi một biến là đổi cách máy khởi động — không cần build lại. Đây chính ' +
      'là lý do U-Boot sống được trên hàng nghìn board khác nhau với cùng một cách dùng.' },

    { t: 'terms', items: [
      ['bootcmd', '—',
       'Chuỗi lệnh U-Boot <b>tự chạy</b> khi hết thời gian đếm ngược. Đây là "boot tự động". ' +
       'Người đọc nó là <b>U-Boot</b>.'],
      ['bootargs', '—',
       'Chuỗi được truyền cho <b>kernel</b> làm dòng lệnh (<code>/proc/cmdline</code>). U-Boot ' +
       'không hiểu nội dung của nó, chỉ chép vào device tree rồi đưa đi.'],
      ['bootdelay', '—',
       'Số giây đếm ngược trước khi chạy <code>bootcmd</code>. Gõ phím bất kỳ trong lúc này ' +
       'thì U-Boot dừng lại và trả dấu nhắc cho bạn.'],
      ['<code>*_addr_r</code>', '—',
       'Địa chỉ RAM <i>gợi ý</i> để nạp từng loại nội dung: <code>kernel_addr_r</code>, ' +
       '<code>ramdisk_addr_r</code>, <code>scriptaddr</code>, <code>fdt_addr</code>. Hậu tố ' +
       '<code>_r</code> = "RAM". Chúng là chỗ trống được chọn sẵn, không phải nội dung đang có.'],
      ['filesize', '—',
       'Biến U-Boot <b>tự đặt</b> sau mỗi lệnh nạp file, bằng số byte vừa đọc, ở dạng hex. ' +
       'Bạn sẽ dùng lại nó ngay trong lệnh <code>booti</code>.']
    ] },

    { t: 'cal', kind: 'warn', title: 'Nhầm lẫn kinh điển: bootcmd với bootargs',
      x: 'Hai biến này tên giống nhau, nằm cạnh nhau trong <code>printenv</code>, và làm hai ' +
         'việc <b>hoàn toàn khác nhau</b>. Mẹo nhớ: <code>bootcmd</code> có chữ <b>cmd</b> = ' +
         '<i>command</i>, là lệnh <b>của U-Boot</b>, U-Boot thực thi nó. <code>bootargs</code> ' +
         'có chữ <b>args</b> = <i>arguments</i>, là tham số <b>cho kernel</b>, U-Boot chỉ ' +
         'chuyển hộ như người đưa thư. Đặt nhầm <code>console=ttyAMA0</code> vào ' +
         '<code>bootcmd</code> thì U-Boot sẽ báo không tìm thấy lệnh; đặt nhầm ' +
         '<code>booti …</code> vào <code>bootargs</code> thì kernel boot xong sẽ bỏ qua nó ' +
         'trong im lặng — kiểu lỗi khó chịu nhất.' },

    { t: 'h3', x: 'Môi trường sống ở đâu, và vì sao có cảnh báo <code>bad CRC</code>' },

    { t: 'p', x:
      'Mỗi lần khởi động, U-Boot in một dòng mà ở Bài 34 bạn đã thấy nhưng chưa giải thích:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Loading Environment from Flash... *** Warning - bad CRC, using default environment' },

    { t: 'p', x:
      'Đây <b>không phải lỗi</b>. Nó là chuỗi ba bước hoàn toàn bình thường. Bước một: U-Boot ' +
      'đọc vùng flash dành cho môi trường — với board <code>qemu_arm64</code>, ' +
      '<code>.config</code> khai báo <code>CONFIG_ENV_IS_IN_FLASH=y</code> và ' +
      '<code>CONFIG_ENV_ADDR=0x4000000</code>, tức là <b>256 KiB</b> ' +
      '(<code>CONFIG_ENV_SIZE=0x40000</code>) bắt đầu ở địa chỉ 64 MiB. Bước hai: nó tính ' +
      '<b>CRC32</b> của vùng đó và so với 4 byte checksum lưu ở đầu. Bước ba: nếu không khớp — ' +
      'mà lần đầu thì chắc chắn không khớp, vì flash mới toanh toàn <code>0xff</code> — nó ' +
      'kết luận "chưa ai lưu gì ở đây" và dùng <b>môi trường mặc định</b> đã biên dịch sẵn ' +
      'trong <code>u-boot.bin</code>.' },

    { t: 'fig',
      cap: 'Môi trường có hai bản: một bản trong RAM (đọc/ghi tức thì) và một bản trong flash ' +
           '(sống sót qua tắt nguồn). <code>setenv</code> chỉ chạm bản RAM; chỉ <code>saveenv</code> ' +
           'mới ghi xuống flash và làm cảnh báo <code>bad CRC</code> biến mất ở lần boot sau.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ vòng đời biến môi trường U-Boot giữa RAM và flash">' +
      '<rect class="d-box-p" x="10" y="20" width="180" height="70" rx="8"/>' +
      '<text class="d-t" x="100" y="48" text-anchor="middle">Môi trường mặc định</text>' +
      '<text class="d-tm" x="100" y="70" text-anchor="middle">trong u-boot.bin</text>' +
      '<rect class="d-box-a" x="270" y="20" width="180" height="70" rx="8"/>' +
      '<text class="d-t" x="360" y="48" text-anchor="middle">Bản trong RAM</text>' +
      '<text class="d-ts" x="360" y="70" text-anchor="middle">đang dùng lúc chạy</text>' +
      '<rect class="d-box-g" x="530" y="20" width="180" height="70" rx="8"/>' +
      '<text class="d-t" x="620" y="48" text-anchor="middle">Flash bank 1</text>' +
      '<text class="d-tm" x="620" y="70" text-anchor="middle">0x4000000, 256 KiB</text>' +
      '<line class="d-line" x1="190" y1="55" x2="262" y2="55"/>' +
      '<path class="d-arrow" d="M270 55 l-9 -4 v8 z"/>' +
      '<text class="d-ts" x="226" y="45" text-anchor="middle">nếu CRC sai</text>' +
      '<line class="d-line" x1="530" y1="80" x2="452" y2="80"/>' +
      '<path class="d-arrow" d="M444 80 l9 -4 v8 z"/>' +
      '<text class="d-ts" x="491" y="100" text-anchor="middle">nếu CRC đúng</text>' +
      '<line class="d-line" x1="450" y1="40" x2="522" y2="40"/>' +
      '<path class="d-arrow" d="M530 40 l-9 -4 v8 z"/>' +
      '<text class="d-tm" x="486" y="30" text-anchor="middle">saveenv</text>' +
      '<rect class="d-box" x="270" y="140" width="180" height="54" rx="8"/>' +
      '<text class="d-tm" x="360" y="163" text-anchor="middle">setenv myvar hello</text>' +
      '<text class="d-ts" x="360" y="183" text-anchor="middle">chỉ sửa bản RAM</text>' +
      '<line class="d-line" x1="360" y1="140" x2="360" y2="98"/>' +
      '<path class="d-arrow" d="M360 90 l-4 9 h8 z"/>' +
      '<rect class="d-box-w" x="10" y="230" width="700" height="54" rx="8"/>' +
      '<text class="d-t" x="30" y="253">Tắt máy ảo mà chưa saveenv</text>' +
      '<text class="d-ts" x="30" y="273">bản RAM biến mất — lần boot sau lại thấy đúng cảnh báo bad CRC như cũ</text>' +
      '</svg>' },

    { t: 'cal', kind: 'info', title: 'QEMU thêm một cái bẫy nữa',
      x: 'Ngay cả khi <code>saveenv</code> in <code>OK</code>, môi trường vẫn có thể bốc hơi. ' +
         'Lý do: tuỳ chọn <code>-bios u-boot.bin</code> mà bạn dùng từ Bài 34 cho U-Boot chạy ' +
         'trên một vùng flash <b>giả lập trong RAM của tiến trình QEMU</b>, không gắn với file ' +
         'nào trên đĩa. Ghi thì thành công thật, nhưng tiến trình QEMU thoát là mất trắng. Muốn ' +
         'môi trường sống qua nhiều lần chạy, phải cấp cho QEMU <b>file pflash thật</b> bằng ' +
         '<code>-drive if=pflash</code>. Bước 6 phần thực hành sẽ chứng minh cả hai chiều.' },

    /* ══════════════════════════════════════════════════════════════════
       3. Bộ nhớ trần
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Bộ nhớ trần: <code>md</code>, <code>mw</code>, <code>cmp</code>' },

    { t: 'p', x:
      'Ở <b>Chặng 03</b> bạn đã học rằng mỗi tiến trình Linux nhìn thấy một không gian địa chỉ ' +
      '<i>ảo</i> của riêng nó, và chạm vào địa chỉ lạ thì nhận <code>Segmentation fault</code>. ' +
      'Trong U-Boot thì ngược lại hoàn toàn: <b>không có MMU phân tách, không có tiến trình, ' +
      'không có bảo vệ</b>. Địa chỉ bạn gõ là địa chỉ vật lý thật, và bạn có toàn quyền đọc ghi ' +
      'mọi nơi. Đó vừa là sức mạnh — bạn soi được thanh ghi thiết bị bằng tay — vừa là con dao ' +
      'hai lưỡi: ghi nhầm chỗ thì U-Boot tự giẫm lên chân mình và treo, không có ai cứu.' },

    { t: 'cmdx', cmd: 'md.l 0x40000000 4', title: 'Đọc bộ nhớ',
      rows: [
        ['<code>md</code>',         '<i>memory display</i> — in nội dung RAM ra màn hình.'],
        ['<code>.l</code>',         'Độ rộng mỗi ô: <code>.b</code> = 1 byte, <code>.w</code> = 2 byte, ' +
                                    '<code>.l</code> = 4 byte, <code>.q</code> = 8 byte. Bỏ trống thì ' +
                                    'U-Boot dùng lại độ rộng của lần gõ trước — nguồn gốc của nhiều lần ngơ ngác.'],
        ['<code>0x40000000</code>', 'Địa chỉ bắt đầu. Đây là đầu RAM của máy <code>virt</code>, cũng là nơi ' +
                                    'QEMU đặt device tree.'],
        ['<code>4</code>',          '<b>Số ô</b> cần in, không phải số byte. Với <code>.l</code> thì 4 ô = 16 byte.']
      ] },

    { t: 'p', x:
      'Cột bên phải của <code>md</code> là bản dịch ASCII của cùng những byte đó — rất hữu ích ' +
      'để nhận ra chuỗi ký tự lẫn trong dữ liệu nhị phân. Còn cột giữa là nơi bạn sẽ gặp một ' +
      'con số đáng nhớ:' },

    { t: 'cal', kind: 'tip', title: 'Số magic đáng nhớ: <code>d00dfeed</code>',
      x: 'Mọi file device tree nhị phân (<code>.dtb</code>) đều bắt đầu bằng 4 byte ' +
         '<code>d0 0d fe ed</code> — đọc kiểu "leet" là <i>dood feed</i>. Khi <code>md.l</code> ' +
         'in ra <code>edfe0dd0</code> thay vì <code>d00dfeed</code>, đừng hoảng: ARM64 là máy ' +
         '<b>little-endian</b> nên khi gộp 4 byte thành một số 32-bit thì thứ tự đảo lại. Gõ ' +
         '<code>md.b</code> ở cùng địa chỉ sẽ thấy đúng <code>d0 0d fe ed</code> theo thứ tự ' +
         'byte thật. Không cần thuộc lòng chuỗi byte này — cứ gõ <code>md.b</code> ở địa chỉ ' +
         'nghi ngờ, thấy đúng <code>d0 0d fe ed</code> là biết ngay đó có phải device tree hay ' +
         'không, và bạn sẽ dùng lại đúng phép kiểm tra này ở Chặng 08.' },

    { t: 'table',
      head: ['Lệnh', 'Việc nó làm', 'Khi nào bạn cần'],
      rows: [
        ['<code>md[.b.w.l.q] addr [n]</code>', 'In <code>n</code> ô bắt đầu từ <code>addr</code>',
         'Kiểm tra file đã nạp đúng chỗ chưa, soi header, đọc thanh ghi thiết bị'],
        ['<code>mw[.b.w.l.q] addr val [n]</code>', 'Ghi giá trị <code>val</code> vào <code>n</code> ô',
         'Xoá sạch một vùng trước khi nạp, đặt giá trị mồi để biết vùng nào đã bị ghi đè'],
        ['<code>cmp[.b.w.l.q] a b n</code>', 'So sánh hai vùng, dừng ở ô khác đầu tiên',
         'Xác nhận một lệnh chép/nạp đã đúng từng byte'],
        ['<code>cp[.b.w.l.q] src dst n</code>', 'Chép <code>n</code> ô từ <code>src</code> sang <code>dst</code>',
         'Dời ảnh trong RAM khi nạp nhầm địa chỉ, khỏi phải nạp lại'],
        ['<code>crc32 addr n</code>', 'Tính CRC32 của một vùng RAM',
         'Đối chiếu với <code>crc32</code> chạy trên máy host để chắc chắn truyền không lỗi']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       4. Nạp file
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Nạp file: từ đâu, vào đâu' },

    { t: 'p', x:
      'Đây là công việc chính của một bootloader. U-Boot có một lệnh <b>tổng quát</b> là ' +
      '<code>load</code>, nó tự dò loại hệ thống file, và các lệnh <b>chuyên biệt</b> cho từng ' +
      'loại. Cú pháp chung giống nhau đến mức học một lần là dùng được hết:' },

    { t: 'cmdx', cmd: 'load virtio 0 ${kernel_addr_r} Image', title: 'Nạp file từ ổ đĩa vào RAM',
      rows: [
        ['<code>load</code>',   'Lệnh tổng quát — tự nhận diện ext4/FAT/… Muốn ép kiểu thì dùng ' +
                                '<code>ext4load</code> hoặc <code>fatload</code>.'],
        ['<code>virtio</code>', '<b>Giao diện</b> lưu trữ. Ở đây là ổ đĩa virtio của QEMU. Trên board ' +
                                'thật thường là <code>mmc</code> (thẻ SD/eMMC), <code>usb</code> hoặc ' +
                                '<code>scsi</code>.'],
        ['<code>0</code>',      '<b>Số thiết bị</b>, đôi khi viết <code>0:1</code> để chỉ rõ phân vùng ' +
                                'số 1. Đĩa trong bài này không có bảng phân vùng nên chỉ cần ' +
                                '<code>0</code>.'],
        ['<code>${kernel_addr_r}</code>', 'Địa chỉ RAM đích. Dùng biến thay vì gõ số cứng để kịch bản ' +
                                'chạy được trên board khác — đây là thói quen của dân trong nghề.'],
        ['<code>Image</code>',  'Tên file trên hệ thống file đó. Không tìm thấy thì U-Boot in ' +
                                '<code>Failed to load</code> và <b>không</b> chạm vào RAM đích.']
      ] },

    { t: 'table',
      head: ['Nguồn', 'Lệnh', 'Ghi chú'],
      rows: [
        ['Bất kỳ hệ thống file nào U-Boot nhận ra', '<code>load &lt;iface&gt; &lt;dev&gt; &lt;addr&gt; &lt;file&gt;</code>',
         'Nên dùng mặc định — ít phụ thuộc vào định dạng đĩa'],
        ['ext2/ext3/ext4', '<code>ext4load</code> · <code>ext4ls</code> · <code>ext4size</code>',
         'Ép đúng kiểu; hữu ích khi <code>load</code> dò sai'],
        ['FAT (thẻ SD hay dùng)', '<code>fatload</code> · <code>fatls</code> · <code>fatwrite</code>',
         'FAT là hệ thống file duy nhất U-Boot <b>ghi</b> được thoải mái'],
        ['Vùng thô, không có hệ thống file', '<code>mmc read</code> · <code>sf read</code>',
         'Đọc theo số hiệu block — cách nhiều board sản phẩm dùng'],
        ['Mạng', '<code>tftpboot</code> · <code>dhcp</code> · <code>wget</code>', 'Toàn bộ <b>Bài 36</b>']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao phải xem <code>filesize</code> sau mỗi lần nạp',
      x: 'Sau mỗi lệnh nạp thành công, U-Boot đặt biến <code>filesize</code> bằng số byte vừa ' +
         'đọc, ở dạng <b>hex</b>. Nó quan trọng vì với <code>initramfs</code>, kernel ' +
         '<b>bắt buộc</b> phải biết kích thước — dữ liệu nén không có dấu kết thúc để đoán. Vì ' +
         'vậy cú pháp <code>booti</code> có dạng <code>${ramdisk_addr_r}:${filesize}</code>. Bỏ ' +
         'phần <code>:${filesize}</code> đi là một trong những cách chắc chắn nhất để kernel ' +
         'panic với <code>No working init found</code>.' },

    /* ══════════════════════════════════════════════════════════════════
       5. Ba lệnh boot
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: '<code>booti</code>, <code>bootz</code>, <code>bootm</code>: chọn đúng lệnh cho đúng định dạng' },

    { t: 'p', x:
      'U-Boot có ba lệnh khởi động Linux, và chọn sai thì thất bại ngay lập tức với một thông ' +
      'báo khá vô duyên. Điều quyết định không phải kiến trúc CPU mà là <b>định dạng file</b> ' +
      'bạn đang cầm trong tay:' },

    { t: 'table',
      head: ['Lệnh', 'Ăn định dạng nào', 'Nhận ra bằng cách nào'],
      rows: [
        ['<code>booti</code>', 'Ảnh kernel ARM64 thô, tên thường là <code>Image</code>',
         'Header ARM64 riêng, 4 byte đầu in ra <code>fa405a4d</code> — hai byte <code>MZ</code> ở cột ASCII'],
        ['<code>bootz</code>', 'Ảnh kernel ARM 32-bit đã nén, tên là <code>zImage</code>',
         'Số magic <code>0x016f2818</code> ở offset 0x24'],
        ['<code>bootm</code>', '<b>Chỉ</b> ảnh có header của U-Boot: legacy <code>uImage</code> hoặc <b>FIT</b>',
         'Magic <code>0x27051956</code> (legacy) hoặc <code>d00dfeed</code> (FIT — Bài 36)']
      ] },

    { t: 'cal', kind: 'warn', title: 'Đưa <code>Image</code> cho <code>bootm</code> là hỏng ngay',
      x: 'Rất nhiều người mới gõ <code>bootm</code> theo phản xạ vì thấy nó xuất hiện nhiều ' +
         'nhất trong tài liệu trên mạng, rồi nhận <code>Wrong Image Type for bootm command</code> ' +
         'và <code>ERROR -91</code>. Nguyên nhân: <code>bootm</code> đọc <b>header 64 byte</b> ' +
         'ở đầu file để biết đây là gì, nạp vào đâu, nhảy vào đâu — mà file <code>Image</code> ' +
         'thô không có header ấy. Bạn sẽ cố tình gây ra lỗi này ở bước 4 để nhìn tận mắt, và ' +
         '<b>Bài 36</b> sẽ đóng gói đúng file đó thành FIT để <code>bootm</code> ăn được.' },

    { t: 'cmdx', cmd: 'booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr}',
      title: 'Ba tham số của booti — thứ tự cố định',
      rows: [
        ['<code>${kernel_addr_r}</code>', 'Địa chỉ ảnh kernel trong RAM. Đây là tham số duy nhất bắt buộc.'],
        ['<code>${ramdisk_addr_r}:${filesize}</code>',
         'Địa chỉ initramfs, <b>kèm kích thước sau dấu hai chấm</b>. Không có ramdisk thì viết ' +
         '<code>-</code> để giữ chỗ cho tham số thứ ba.'],
        ['<code>${fdt_addr}</code>',
         'Địa chỉ device tree. Trên QEMU <code>virt</code>, biến này đã trỏ sẵn vào ' +
         '<code>0x40000000</code> — chính là DTB do QEMU tạo mà bạn soi bằng <code>md</code> ở bước 3.']
      ] },

    { t: 'fig',
      cap: 'Từ Bài 33 sang Bài 35, khâu bàn giao không đổi một chữ — chỉ đổi <b>ai làm</b>. ' +
           'QEMU rút lui, U-Boot lên thay, và lần này bạn là người quyết định nạp gì vào đâu.',
      svg:
      '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="So sánh khâu bàn giao kernel do QEMU làm ở Bài 33 và do U-Boot làm ở Bài 35">' +
      '<text class="d-t" x="10" y="20">Bài 33 — QEMU tự làm hộ</text>' +
      '<rect class="d-box" x="10" y="32" width="150" height="46" rx="8"/>' +
      '<text class="d-tm" x="85" y="60" text-anchor="middle">-kernel Image</text>' +
      '<line class="d-line" x1="160" y1="55" x2="212" y2="55"/>' +
      '<path class="d-arrow" d="M220 55 l-9 -4 v8 z"/>' +
      '<rect class="d-box-w" x="220" y="32" width="200" height="46" rx="8"/>' +
      '<text class="d-ts" x="320" y="60" text-anchor="middle">6 lệnh máy QEMU tự sinh</text>' +
      '<line class="d-line" x1="420" y1="55" x2="472" y2="55"/>' +
      '<path class="d-arrow" d="M480 55 l-9 -4 v8 z"/>' +
      '<rect class="d-box-p" x="480" y="32" width="230" height="46" rx="8"/>' +
      '<text class="d-tm" x="595" y="53" text-anchor="middle">x0 = DTB, x1..x3 = 0</text>' +
      '<text class="d-ts" x="595" y="70" text-anchor="middle">bạn không can thiệp được</text>' +
      '<line class="d-line" x1="10" y1="105" x2="710" y2="105"/>' +
      '<text class="d-t" x="10" y="140">Bài 35 — U-Boot làm, bạn ra lệnh</text>' +
      '<rect class="d-box" x="10" y="152" width="150" height="46" rx="8"/>' +
      '<text class="d-tm" x="85" y="173" text-anchor="middle">load virtio 0</text>' +
      '<text class="d-ts" x="85" y="190" text-anchor="middle">đĩa &#8594; RAM</text>' +
      '<line class="d-line" x1="160" y1="175" x2="212" y2="175"/>' +
      '<path class="d-arrow" d="M220 175 l-9 -4 v8 z"/>' +
      '<rect class="d-box-a" x="220" y="152" width="200" height="46" rx="8"/>' +
      '<text class="d-tm" x="320" y="173" text-anchor="middle">booti addr rd:size fdt</text>' +
      '<text class="d-ts" x="320" y="190" text-anchor="middle">bạn gõ, bạn chọn</text>' +
      '<line class="d-line" x1="420" y1="175" x2="472" y2="175"/>' +
      '<path class="d-arrow" d="M480 175 l-9 -4 v8 z"/>' +
      '<rect class="d-box-g" x="480" y="152" width="230" height="46" rx="8"/>' +
      '<text class="d-tm" x="595" y="173" text-anchor="middle">x0 = DTB, x1..x3 = 0</text>' +
      '<text class="d-ts" x="595" y="190" text-anchor="middle">hợp đồng y hệt, do U-Boot đặt</text>' +
      '<rect class="d-box-p" x="10" y="215" width="700" height="28" rx="8"/>' +
      '<text class="d-ts" x="360" y="234" text-anchor="middle">Kernel không hề biết ai vừa gọi mình — nó chỉ kiểm tra x0 có trỏ vào một DTB hợp lệ hay không</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       6. Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: điều khiển U-Boot bằng tay, rồi tự động hoá' },

    { t: 'p', x:
      'Bảy bước dưới đây đi từ "gõ từng lệnh một" đến "cắm điện là máy tự boot". Bạn cần ' +
      '<code>~/bai34/u-boot/u-boot.bin</code> từ <b>Bài 34</b> và hai file ' +
      '<code>Image</code> + <code>initramfs.cpio.gz</code> trong <code>~/bai32</code> từ ' +
      '<b>Bài 32</b>. Nếu đã lỡ xoá, hãy quay lại làm nhanh hai bài đó trước — mọi thứ ở đây ' +
      'đều dựa lên chúng.' },

    { t: 'cal', kind: 'tip', title: 'Thoát QEMU khi không có cửa sổ đồ hoạ',
      x: 'Cả bài này chạy với <code>-nographic</code>, nghĩa là bàn phím của bạn nối thẳng vào ' +
         'cổng serial của máy ảo — <kbd>Ctrl</kbd>+<kbd>C</kbd> sẽ bị gửi <i>vào trong</i> máy ' +
         'ảo chứ không giết QEMU. Muốn thoát: nhấn <kbd>Ctrl</kbd>+<kbd>A</kbd>, thả ra, rồi ' +
         'nhấn <kbd>X</kbd>. Ghi câu này ra giấy dán màn hình; bạn sẽ cần nó khoảng ba mươi lần ' +
         'trong bài.' },

    { t: 'steps', items: [

      /* ── Bước 1 ─────────────────────────────────────────────────── */
      { title: 'Tạo một ổ đĩa ảo chứa kernel và initramfs',
        blocks: [
          { t: 'p', x:
            'Ở Bài 32 bạn đưa kernel cho QEMU bằng <code>-kernel</code>. Bây giờ U-Boot phải tự ' +
            '<i>đi tìm</i> file, nên ta cần một thứ giống ổ đĩa thật: một file ảnh có hệ thống ' +
            'file <b>ext4</b> bên trong, đúng như thẻ SD của một board Raspberry Pi hay ' +
            'BeagleBone.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai35\n' +
            'cd ~/bai35\n' +
            'truncate -s 128M disk.img\n' +
            'mkfs.ext4 -F -q -L BOOT disk.img' },

          { t: 'cmdx', cmd: 'mkfs.ext4 -F -q -L BOOT disk.img',
            title: 'Tạo ext4 trên một file thường, không phải một phân vùng',
            rows: [
              ['<code>-F</code>', '<i>Force.</i> <code>disk.img</code> là một file thường vừa tạo bằng ' +
                                  '<code>truncate</code>, không phải phân vùng của một ổ đĩa thật. Thiếu ' +
                                  'cờ này, <code>mkfs.ext4</code> từ chối chạy vì thấy đích không phải ' +
                                  '"a partition on a block special device".'],
              ['<code>-q</code>', '<i>Quiet</i> — bỏ bảng log tạo superblock/group descriptor. Không ảnh ' +
                                  'hưởng tới kết quả, chỉ đỡ rối màn hình.'],
              ['<code>-L BOOT</code>', 'Đặt nhãn ổ đĩa (volume label), tối đa 16 byte. Không bắt buộc, ' +
                                       'nhưng là thói quen tốt để phân biệt ổ đĩa khi board thật gắn ' +
                                       'nhiều thẻ nhớ cùng lúc.'],
              ['<code>disk.img</code>', '<b>128 MiB</b> toàn số 0, vừa tạo ở dòng <code>truncate</code> ' +
                                        'phía trên — chưa có hệ thống file nào bên trong cho tới đúng lúc ' +
                                        'lệnh này chạy xong.']
            ] },

          { t: 'p', x:
            'Bình thường để chép file vào ảnh này bạn sẽ <code>mount</code> nó — nhưng ' +
            '<code>mount</code> cần quyền root. May thay bộ công cụ <code>e2fsprogs</code> có ' +
            '<code>debugfs</code>, sửa được ext4 <b>mà không cần mount và không cần root</b>:' },

          { t: 'code', where: 'wsl', code:
            'debugfs -w -R "write $HOME/bai32/Image Image" disk.img\n' +
            'debugfs -w -R "write $HOME/bai32/initramfs.cpio.gz initramfs.cpio.gz" disk.img\n' +
            'debugfs -R "ls -l /" disk.img' },

          { t: 'code', where: 'out', nocopy: true, code:
            'debugfs 1.47.2 (1-Jan-2025)\n' +
            'Allocated inode: 13\n' +
            'debugfs 1.47.2 (1-Jan-2025)\n' +
            'Allocated inode: 14\n' +
            'debugfs 1.47.2 (1-Jan-2025)\n' +
            '      2   40755 (2)      0      0    4096 16-Aug-2026 17:35 .\n' +
            '      2   40755 (2)      0      0    4096 16-Aug-2026 17:35 ..\n' +
            '     11   40700 (2)      0      0   16384 16-Aug-2026 17:35 lost+found\n' +
            '     13  100644 (1)      0      0   30771136 16-Aug-2026 17:35 Image\n' +
            '     14  100644 (1)      0      0   1035397 16-Aug-2026 17:35 initramfs.cpio.gz' },

          { t: 'cmdx', cmd: 'debugfs -w -R "write $HOME/bai32/Image Image" disk.img',
            title: 'Ghi file vào ext4 mà không cần root',
            rows: [
              ['<code>-w</code>', 'Mở ảnh ở chế độ <b>ghi</b>. Thiếu cờ này thì <code>write</code> báo ' +
                                  'lỗi read-only.'],
              ['<code>-R "…"</code>', 'Chạy đúng một lệnh <code>debugfs</code> rồi thoát, thay vì vào ' +
                                      'chế độ tương tác.'],
              ['<code>write &lt;nguồn&gt; &lt;đích&gt;</code>',
               'Chép từ hệ thống file thật vào trong ảnh. Đường dẫn nguồn phải là đường dẫn tuyệt ' +
               'đối — dùng <code>$HOME</code> chứ không dùng <code>~</code>, vì dấu ngã ' +
               '<b>không</b> được khai triển bên trong dấu nháy kép.'],
              ['<code>disk.img</code>', 'Ảnh đĩa cần sửa. <code>Allocated inode: 13</code> là bằng chứng ' +
                                        'file đã thực sự nằm trong hệ thống file.']
            ] },

          { t: 'cal', kind: 'info', title: 'Đọc kỹ ba dòng cuối của <code>ls -l /</code>',
            x: 'Cả hai file đã nằm trong ext4 với đúng thuộc tính: mã <code>100644</code> ở đầu mỗi dòng ' +
               'nghĩa là "file thường, quyền 644" — giống hệt file gốc trên host, không bị đổi thành thư ' +
               'mục hay link tượng trưng. Quan trọng hơn, cột kích thước đọc đúng <b>30 771 136</b> byte ' +
               'cho <code>Image</code> và <b>1 035 397</b> byte cho <code>initramfs.cpio.gz</code> — khớp ' +
               'chính xác với hai file ở <code>~/bai32</code>. Đây là bằng chứng đầu tiên trong ba bằng ' +
               'chứng độc lập mà bước 4 sẽ đối chiếu lại (cột <code>ls</code> của U-Boot và biến ' +
               '<code>filesize</code>): dữ liệu sang đĩa không hề bị cắt xén. Số inode ' +
               '<code>13</code>/<code>14</code> và mốc giờ <code>16-Aug-2026 17:35</code> sẽ ' +
               'khác trên máy bạn; chỉ hai con số kích thước byte mới cần khớp.' },

          { t: 'cal', kind: 'why', title: 'Vì sao ext4 chứ không phải FAT?',
            x: 'Thẻ SD của board thật hay dùng phân vùng FAT cho boot, vì mọi bootloader đều đọc ' +
               'được FAT. Ở đây ta chọn ext4 vì lý do rất thực tế: tạo FAT cần ' +
               '<code>mkfs.vfat</code> và <code>mcopy</code> của gói <code>dosfstools</code> + ' +
               '<code>mtools</code>, cài chúng cần <code>sudo</code>; còn <code>mkfs.ext4</code> ' +
               'và <code>debugfs</code> thì Ubuntu <b>đã có sẵn</b> và chạy được không cần quyền ' +
               'gì. U-Boot đọc cả hai như nhau — lệnh <code>load</code> tự nhận diện.' } ] },

      /* ── Bước 2 ─────────────────────────────────────────────────── */
      { title: 'Vào dấu nhắc và hỏi U-Boot xem nó biết gì',
        blocks: [
          { t: 'p', x:
            'Khởi động QEMU với U-Boot làm firmware, và gắn <code>disk.img</code> vào như một ' +
            'ổ đĩa virtio:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai35\n' +
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -bios ~/bai34/u-boot/u-boot.bin \\\n' +
            '  -drive file=disk.img,if=none,format=raw,id=hd0 \\\n' +
            '  -device virtio-blk-device,drive=hd0' },

          { t: 'cmdx', cmd: '-drive file=disk.img,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0',
            title: 'Gắn một ổ đĩa vào máy ảo — hai nửa của một việc',
            rows: [
              ['<code>-drive</code>', 'Nửa "phần mềm": mô tả <b>dữ liệu</b> nằm ở đâu trên máy host.'],
              ['<code>if=none</code>', 'Nói với QEMU: <i>chưa</i> cắm vào bus nào cả, để tôi tự chọn ở ' +
                                       'dòng dưới. Thiếu nó thì QEMU đoán bừa một bus IDE.'],
              ['<code>format=raw</code>', 'Ảnh là byte thô, không phải qcow2. Ghi rõ để QEMU khỏi phải dò ' +
                                          '— dò nhầm là một lỗ hổng bảo mật đã có tên.'],
              ['<code>id=hd0</code>', 'Đặt tên để dòng <code>-device</code> tham chiếu tới.'],
              ['<code>-device virtio-blk-device</code>',
               'Nửa "phần cứng": tạo một <b>controller đĩa virtio</b> trên bus MMIO của máy ' +
               '<code>virt</code>. Đây chính là thiết bị mà U-Boot sẽ thấy dưới tên ' +
               '<code>virtio 0</code>.']
            ] },

          { t: 'p', x:
            'Nhấn một phím bất kỳ trong lúc đếm ngược để dừng lại ở dấu nhắc. Banner giống hệt ' +
            'Bài 34, kể cả mấy dòng <code>Bloblist</code> vô hại đã giải thích ở đó:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'U-Boot 2026.07 (Aug 16 2026 - 12:28:29 +0700)\n' +
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
            'Hit any key to stop autoboot:  0\n' +
            '=>' },

          { t: 'p', x:
            'Giờ hỏi nó ba câu. <code>help</code> in ra cả <b>124</b> lệnh (dài, cứ để nó ' +
            'trôi), <code>version</code> cho biết ảnh đang chạy được build lúc nào, còn ' +
            '<code>printenv</code> mở ra bảng điều khiển:' },

          { t: 'code', where: 'uboot', code:
            'help\n' +
            'version\n' +
            'printenv' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> version\n' +
            'U-Boot 2026.07 (Aug 16 2026 - 12:28:29 +0700)\n' +
            '\n' +
            'aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0\n' +
            'GNU ld (GNU Binutils for Ubuntu) 2.46\n' +
            '=> printenv\n' +
            'arch=arm\n' +
            'baudrate=115200\n' +
            'board=qemu-arm\n' +
            'board_name=qemu-arm\n' +
            'boot_targets=qfw usb scsi virtio nvme dhcp\n' +
            'bootcmd=bootflow scan -lb\n' +
            'bootdelay=2\n' +
            'cpu=armv8\n' +
            'ethaddr=52:54:00:12:34:56\n' +
            'fdt_addr=0x40000000\n' +
            'fdtcontroladdr=5e54fd80\n' +
            'kernel_addr_r=0x40400000\n' +
            'loadaddr=0x40200000\n' +
            'preboot=usb start\n' +
            'pxefile_addr_r=0x40300000\n' +
            'ramdisk_addr_r=0x44000000\n' +
            'scriptaddr=0x40200000\n' +
            'stderr=serial,vidconsole\n' +
            'stdin=serial,usbkbd\n' +
            'stdout=serial,vidconsole\n' +
            'usb_ignorelist=0x1050:*,\n' +
            'vendor=emulation\n' +
            '\n' +
            'Environment size: 471/262140 bytes' },

          { t: 'cal', kind: 'info', title: 'Đọc kỹ hai dòng cuối cùng',
            x: '<code>Environment size: 471/262140 bytes</code> — toàn bộ môi trường mặc định chỉ ' +
               'tốn <b>471 byte</b> trong vùng <b>262 140</b> byte dành sẵn (đúng ' +
               '<code>CONFIG_ENV_SIZE=0x40000</code> = 256 KiB, trừ 4 byte CRC ở đầu). Bạn có ' +
               'thừa chỗ để nhét cả một kịch bản boot dài vào đây. Và ' +
               '<code>bootcmd=bootflow scan -lb</code> chính là thứ đã tự chạy ở Bài 34 khi bạn ' +
               'để nó đếm ngược hết giờ — nó quét mọi thiết bị tìm thứ boot được. Cuối bài bạn ' +
               'sẽ thay nó bằng kịch bản của riêng mình.' },

          { t: 'p', x:
            'Cuối cùng, tập phản xạ quan trọng nhất: hỏi ngay tại chỗ thay vì đi tra mạng.' },

          { t: 'code', where: 'uboot', code: 'help md' },

          { t: 'code', where: 'out', nocopy: true, code:
            'md - memory display\n' +
            '\n' +
            'Usage:\n' +
            'md [.b, .w, .l, .q] address [# of objects]' } ] },

      /* ── Bước 3 ─────────────────────────────────────────────────── */
      { title: 'Đọc và ghi RAM trần bằng md, mw, cmp',
        blocks: [
          { t: 'p', x:
            'Vẫn ở dấu nhắc đó. Bắt đầu bằng việc soi địa chỉ <code>0x40000000</code> — theo ' +
            '<code>printenv</code> thì <code>fdt_addr</code> trỏ đúng vào đây, nên nếu lý ' +
            'thuyết đúng thì ta phải thấy số magic của device tree:' },

          { t: 'code', where: 'uboot', code:
            'md 0x40000000\n' +
            'md.l 0x40000000 4\n' +
            'md.b 0x40000000 10' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> md 0x40000000\n' +
            '40000000: edfe0dd0 00001000 40000000 7c1a0000  ...........@...|\n' +
            '40000010: 30000000 11000000 10000000 00000000  ...0............\n' +
            '40000020: 9b010000 3c1a0000 00000000 00000000  .......<........\n' +
            '40000030: 00000000 00000000 00000000 00000000  ................\n' +
            '40000040: 01000000 00000000 03000000 04000000  ................\n' +
            '40000050: b9000000 02800000 03000000 00000000  ................\n' +
            '40000060: 2c000000 03000000 11000000 26000000  ...,...........&\n' +
            '40000070: 756e696c 75642c78 2d796d6d 74726976  linux,dummy-virt\n' +
            '40000080: 02000000 03000000 04000000 1a000000  ................\n' +
            '=> md.l 0x40000000 4\n' +
            '40000000: edfe0dd0 00001000 40000000 7c1a0000  ...........@...|\n' +
            '=> md.b 0x40000000 10\n' +
            '40000000: d0 0d fe ed 00 10 00 00 00 00 00 40 00 00 1a 7c  ...........@...|' },

          { t: 'cal', kind: 'info', title: 'Ba bằng chứng trong một màn hình',
            x: '<b>Một:</b> <code>md.b</code> in đúng <code>d0 0d fe ed</code> — đây thật sự là ' +
               'device tree, còn <code>md.l</code> in <code>edfe0dd0</code> vì little-endian. ' +
               '<b>Hai:</b> ô thứ hai <code>00001000</code> đọc ngược lại là ' +
               '<code>0x00100000</code> = <b>1 MiB</b> — đó là trường <code>totalsize</code> ' +
               'trong header DTB, tức QEMU dành hẳn 1 MiB cho device tree. <b>Ba:</b> ở offset ' +
               '<code>0x70</code>, cột ASCII hiện rõ chuỗi <code>linux,dummy-virt</code> — đúng ' +
               'tên máy mà kernel in ra ở Bài 32 (<code>Machine model</code>). Bạn vừa đọc được ' +
               'device tree bằng mắt thường, không cần công cụ nào.' },

          { t: 'p', x:
            'Bây giờ ghi. Đổ <code>0xdeadbeef</code> vào bốn ô 4-byte tại một vùng RAM còn ' +
            'trống, rồi đọc lại để xác nhận, rồi so sánh hai vùng để thấy <code>cmp</code> báo ' +
            'khác nhau ở đâu:' },

          { t: 'code', where: 'uboot', code:
            'mw.l 0x50000000 deadbeef 4\n' +
            'md.l 0x50000000 4\n' +
            'cmp.l 0x40000000 0x50000000 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> mw.l 0x50000000 deadbeef 4\n' +
            '=> md.l 0x50000000 4\n' +
            '50000000: deadbeef deadbeef deadbeef deadbeef  ................\n' +
            '=> cmp.l 0x40000000 0x50000000 4\n' +
            'word at 0x40000000 (0xedfe0dd0) != word at 0x50000000 (0xdeadbeef)\n' +
            'Total of 0 word(s) were the same' },

          { t: 'cal', kind: 'info', title: 'Vì sao <code>Total of 0 word(s)</code>, không phải 1, 2 hay 3',
            x: 'Bảng lệnh phía trên đã nói <code>cmp</code> "dừng ở ô khác đầu tiên". Ở đây bốn ô tại ' +
               '<code>0x50000000</code> đều là <code>deadbeef</code>, còn <b>ngay ô đầu tiên</b> tại ' +
               '<code>0x40000000</code> đã là <code>0xedfe0dd0</code> (dữ liệu device tree) — khác biệt lộ ' +
               'ra từ ô số 0. Vì vậy <code>cmp</code> báo lệch rồi dừng ngay lập tức, và dòng ' +
               '<code>Total of 0 word(s) were the same</code> có nghĩa "chưa kịp đếm được ô nào giống ' +
               'trước khi dừng" — bình thường và đúng như dự tính, vì hai vùng RAM này vốn chứa hai thứ ' +
               'hoàn toàn không liên quan.' },

          { t: 'cal', kind: 'tip', title: 'Vì sao dân trong nghề hay dùng 0xdeadbeef',
            x: 'Đó là một giá trị <b>không bao giờ xuất hiện tình cờ</b> trong dữ liệu thật, lại ' +
               'đọc được thành chữ tiếng Anh nên nhớ rất dễ. Mẹo dùng: trước khi nạp một file, ' +
               'hãy <code>mw</code> giá trị này khắp vùng đích; nạp xong mà vẫn còn ' +
               '<code>deadbeef</code> ở đâu đó, bạn biết ngay file ngắn hơn bạn tưởng hoặc lệnh ' +
               'nạp đã âm thầm thất bại. Đây là cách gỡ lỗi rẻ nhất mà bootloader cho phép.' },

          { t: 'cal', kind: 'danger', title: 'Không có lưới an toàn ở tầng này',
            x: '<code>mw</code> ghi được vào <b>bất cứ đâu</b>, kể cả vùng chứa chính U-Boot ' +
               '(quanh <code>0x5f690000</code> theo dòng <code>relocaddr</code> của ' +
               '<code>bdinfo</code>) hay vùng device tree. Ghi nhầm vào đó thì máy ảo treo hoặc ' +
               'reset, không có thông báo lỗi nào. Trên board thật, cùng lệnh đó có thể ghi vào ' +
               'thanh ghi điều khiển nguồn và làm hỏng phần cứng vĩnh viễn. Trong máy ảo thì cứ ' +
               'thoải mái nghịch — đó là lý do ta học ở đây trước.' } ] },

      /* ── Bước 4 ─────────────────────────────────────────────────── */
      { title: 'Tìm file trên đĩa và nạp vào RAM',
        blocks: [
          { t: 'p', x:
            'U-Boot chưa biết gì về ổ đĩa cho đến khi bạn hỏi. Ba lệnh sau lần lượt trả lời: ' +
            '<i>có ổ nào không?</i>, <i>trong đó có gì?</i>, <i>file kia to bao nhiêu?</i>' },

          { t: 'code', where: 'uboot', code:
            'virtio info\n' +
            'ls virtio 0\n' +
            'size virtio 0 Image\n' +
            'printenv filesize' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> virtio info\n' +
            'Device 0: QEMU VirtIO Block Device\n' +
            '            Type: Hard Disk\n' +
            '            Capacity: 128.0 MB = 0.1 GB (262144 x 512)\n' +
            '=> ls virtio 0\n' +
            '            ./\n' +
            '            ../\n' +
            '            lost+found/\n' +
            ' 30771136   Image\n' +
            '  1035397   initramfs.cpio.gz\n' +
            '\n' +
            '2 file(s), 3 dir(s)\n' +
            '\n' +
            '=> size virtio 0 Image\n' +
            '=> printenv filesize\n' +
            'filesize=1d587c0' },

          { t: 'cal', kind: 'info', title: '<code>virtio info</code> xác nhận đúng ổ đĩa 128 MiB bạn vừa tạo',
            x: 'Dòng <code>Capacity: 128.0 MB = 0.1 GB (262144 x 512)</code> là U-Boot tự tính: ' +
               '<b>262 144 sector</b> × <b>512 byte/sector</b> = 134 217 728 byte = đúng <b>128 MiB</b> — ' +
               'bằng chính kích thước bạn đặt bằng <code>truncate -s 128M disk.img</code> ở bước 1. Ngay ' +
               'dưới đó, <code>ls virtio 0</code> liệt kê lại đúng hai file với đúng hai kích thước ' +
               '<b>30 771 136</b> và <b>1 035 397</b> byte mà <code>debugfs</code> đã ghi ở bước 1 — cùng ' +
               'một ổ đĩa, nhìn từ hai công cụ khác nhau (host và U-Boot), ra cùng một kết quả.' },

          { t: 'cal', kind: 'info', title: 'Lệnh <code>size</code> không in gì cả — đúng như thiết kế',
            x: 'Nó <b>chỉ</b> đặt biến <code>filesize</code> rồi im lặng, vì nó sinh ra để dùng ' +
               'trong kịch bản chứ không phải để người đọc. Muốn thấy kết quả thì ' +
               '<code>printenv filesize</code>. Và giá trị là <b>hex</b>: ' +
               '<code>0x1d587c0</code> = <b>30 771 136</b> byte, khớp chính xác với cột kích ' +
               'thước của <code>ls</code> và với <code>ls -l</code> trên máy host. Ba nguồn độc ' +
               'lập cùng khớp — file đã sang đĩa nguyên vẹn.' },

          { t: 'p', x:
            'Nạp kernel vào <code>kernel_addr_r</code>, rồi soi 4 byte đầu để tự kiểm tra:' },

          { t: 'code', where: 'uboot', code:
            'load virtio 0 ${kernel_addr_r} Image\n' +
            'md.l ${kernel_addr_r} 4' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> load virtio 0 ${kernel_addr_r} Image\n' +
            '30771136 bytes read in 35 ms (838.4 MiB/s)\n' +
            '=> md.l ${kernel_addr_r} 4\n' +
            '40400000: fa405a4d 1462283b 00000000 00000000  MZ@.;(b.........' },

          { t: 'cal', kind: 'why', title: 'Vì sao ảnh kernel ARM64 lại bắt đầu bằng chữ <code>MZ</code>?',
            x: 'Cột ASCII in ra <code>MZ</code> — đúng hai ký tự mở đầu của file thực thi ' +
               '<b>DOS/Windows</b>, đặt theo tên Mark Zbikowski. Không phải trùng hợp: các nhà ' +
               'phát triển kernel cố tình chọn chuỗi lệnh đầu tiên sao cho mã máy của nó cũng ' +
               'hợp lệ như một header PE, để cùng một file <code>Image</code> vừa boot được bằng ' +
               '<code>booti</code> của U-Boot, vừa boot được trực tiếp bằng <b>UEFI</b>. Đây là ' +
               'kiểu thoả hiệp rất "embedded": một chuỗi byte mang hai nghĩa cho hai thế giới.' },

          { t: 'p', x:
            'Bây giờ hãy <b>cố tình làm sai</b> để nhìn tận mắt lỗi mà bạn sẽ gặp lại rất nhiều ' +
            'lần trong đời — đưa một ảnh thô cho lệnh chỉ ăn ảnh có header:' },

          { t: 'code', where: 'uboot', code:
            'bootm ${kernel_addr_r}\n' +
            'iminfo ${kernel_addr_r}\n' +
            'load virtio 0 ${kernel_addr_r} vmlinuz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> bootm ${kernel_addr_r}\n' +
            'Wrong Image Type for bootm command\n' +
            'ERROR -91: can\'t get kernel image!\n' +
            '=> iminfo ${kernel_addr_r}\n' +
            '\n' +
            '## Checking Image at 40400000 ...\n' +
            'Unknown image format!\n' +
            '=> load virtio 0 ${kernel_addr_r} vmlinuz\n' +
            'Failed to load \'vmlinuz\'' },

          { t: 'cal', kind: 'info', title: 'Ba thất bại, ba bài học khác nhau',
            x: '<code>Wrong Image Type</code> nghĩa là U-Boot <i>đọc được</i> byte ở đó nhưng ' +
               'không nhận ra header nào nó biết — dùng nhầm lệnh, chứ không phải hỏng file. ' +
               '<code>iminfo</code> là lệnh chuyên để hỏi <i>"cái ở địa chỉ này là ảnh gì?"</i>, ' +
               'và câu trả lời <code>Unknown image format!</code> xác nhận điều đó; hãy nhớ ' +
               'lệnh này, <b>Bài 36</b> sẽ dùng nó liên tục. Còn ' +
               '<code>Failed to load \'vmlinuz\'</code> là lỗi khác hẳn: tên file không tồn tại ' +
               '— và quan trọng là U-Boot <b>không</b> chạm vào RAM đích, nội dung cũ vẫn nguyên.' },

          { t: 'p', x:
            'Nạp nốt initramfs. Lần này dùng <code>ext4load</code> để thấy lệnh chuyên biệt cho ' +
            'kết quả y hệt <code>load</code>:' },

          { t: 'code', where: 'uboot', code:
            'ext4load virtio 0 ${ramdisk_addr_r} initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> ext4load virtio 0 ${ramdisk_addr_r} initramfs.cpio.gz\n' +
            '1035397 bytes read in 1 ms (987.4 MiB/s)' },

          { t: 'cal', kind: 'tip', title: 'Đừng khoe con số tốc độ này với ai',
            x: '<b>987,4 MiB/s</b> là tốc độ của một ổ đĩa ảo nằm sẵn trong RAM của máy host. ' +
               'Thẻ SD trên board thật cho khoảng <b>10–40 MiB/s</b>, và eMMC khoảng ' +
               '<b>100–300 MiB/s</b>. Con số này chỉ nói lên rằng ở đây thời gian nạp ' +
               '<i>không</i> phải thứ đáng lo — nó không nói gì về phần cứng thật cả.' } ] },

      /* ── Bước 5 ─────────────────────────────────────────────────── */
      { title: 'booti — lần này U-Boot là người đặt x0',
        blocks: [
          { t: 'p', x:
            'Cả hai file đã nằm trong RAM. Trước khi nhảy, phải nói cho kernel biết nó sẽ chạy ' +
            'trong hoàn cảnh nào — đó là việc của <code>bootargs</code>. Hai tham số này bạn đã ' +
            'dùng từ Bài 32: <code>console=ttyAMA0</code> để log đi ra cổng serial, và ' +
            '<code>rdinit=/init</code> để kernel chạy <code>/init</code> trong initramfs thay vì ' +
            'đi tìm ổ cứng gốc.' },

          { t: 'code', where: 'uboot', code:
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'load virtio 0 ${kernel_addr_r} Image\n' +
            'load virtio 0 ${ramdisk_addr_r} initramfs.cpio.gz\n' +
            'booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr}' },

          { t: 'cal', kind: 'warn', title: 'Thứ tự hai lệnh <code>load</code> không phải ngẫu nhiên',
            x: '<code>filesize</code> luôn mang kích thước của <b>lần nạp gần nhất</b>. Vì trong ' +
               '<code>booti</code> bạn dùng <code>${filesize}</code> cho <i>ramdisk</i>, nên ' +
               'ramdisk phải là file được nạp <b>sau cùng</b>. Đảo hai dòng ' +
               '<code>load</code> cho nhau, U-Boot sẽ báo với kernel rằng initramfs dài ' +
               '30 771 136 byte trong khi nó chỉ có 1 035 397 — và kernel panic. Đây là lỗi ' +
               'người mới mắc nhiều nhất khi tự viết boot script.' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> load virtio 0 ${kernel_addr_r} Image\n' +
            '30771136 bytes read in 35 ms (838.4 MiB/s)\n' +
            '=> load virtio 0 ${ramdisk_addr_r} initramfs.cpio.gz\n' +
            '1035397 bytes read in 1 ms (987.4 MiB/s)\n' +
            '=> booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr}\n' +
            '## Flattened Device Tree blob at 40000000\n' +
            '   Booting using the fdt blob at 0x40000000\n' +
            'Working FDT set to 40000000\n' +
            '   Loading Ramdisk to 5d428000, end 5d524c85 ... OK\n' +
            '   Loading Device Tree to 000000005d325000, end 000000005d427fff ... OK\n' +
            'Working FDT set to 5d325000\n' +
            '\n' +
            'Starting kernel ...' },

          { t: 'p', x:
            'Sau <code>Starting kernel ...</code> là log kernel quen thuộc của Bài 32, và cuối ' +
            'cùng là dấu nhắc BusyBox. Kiểm chứng ngay rằng <code>bootargs</code> đã tới nơi:' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init\n' +
            '~ # uname -a\n' +
            'Linux (none) 6.12.94+deb13-cloud-arm64 #1 SMP Debian 6.12.94-1 (2026-06-20) aarch64 GNU/Linux\n' +
            '~ # ls /\n' +
            'bin   dev   init  proc  root  sys' },

          { t: 'cal', kind: 'why', title: '<code>/proc/cmdline</code> chứng minh bootargs đã tới đúng nơi',
            x: 'Chuỗi <code>console=ttyAMA0 rdinit=/init</code> trong <code>/proc/cmdline</code> là ' +
               '<b>y hệt</b>, không thiếu không thừa một ký tự, chuỗi bạn vừa gõ vào ' +
               '<code>setenv bootargs</code>. Đây là bằng chứng trực tiếp cho điều bảng thuật ngữ đầu bài ' +
               'đã nói: U-Boot không đọc hiểu nội dung <code>bootargs</code>, nó chỉ chép nguyên văn vào ' +
               'device tree rồi kernel tự đọc ra thành <code>/proc/cmdline</code>. <code>uname -a</code> ' +
               'xác nhận thêm đúng kernel bạn nạp từ <code>~/bai32/Image</code>, và <code>ls /</code> cho ' +
               'thấy đúng bộ thư mục tối giản của initramfs ở <b>Bài 32</b> — không có ổ đĩa gốc nào khác ' +
               'được gắn vào.' },

          { t: 'cal', kind: 'why', title: 'Hai dòng "Loading … to …" chứng minh U-Boot vừa làm gì',
            x: 'Bạn nạp ramdisk vào <code>0x44000000</code>, nhưng U-Boot lại báo ' +
               '<code>Loading Ramdisk to 5d428000</code> — nó tự <b>dời</b> ramdisk và device ' +
               'tree lên gần đỉnh RAM trước khi nhảy. Lý do: kernel giải nén ra rất to và bung ' +
               'từ <code>0x40400000</code> đi lên, nếu để ramdisk nằm ở ' +
               '<code>0x44000000</code> thì kernel sẽ giẫm lên chính dữ liệu nó cần. Đây là ' +
               'dịch vụ mà QEMU đã âm thầm làm hộ bạn ở Bài 32 và bootloader thật phải tự làm. ' +
               'Kết quả cuối cùng vẫn là hợp đồng bàn giao ARM64 của Bài 33: ' +
               '<code>x0</code> = <code>0x5d325000</code> (địa chỉ device tree <i>sau khi dời</i>), ' +
               '<code>x1</code>–<code>x3</code> = 0. Khác biệt duy nhất so với Bài 33: ' +
               '<b>người đặt x0 bây giờ là U-Boot, và nó làm vì bạn đã ra lệnh.</b>' },

          { t: 'p', muted: true, x:
            'Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> để sang bước sau.' } ] },

      /* ── Bước 6 ─────────────────────────────────────────────────── */
      { title: 'Làm cho môi trường sống sót — và chứng minh khi nào thì không',
        blocks: [
          { t: 'p', x:
            'Gõ lại năm lệnh mỗi lần bật máy thì không ai chịu nổi. Hãy thử lưu chúng. Vẫn ' +
            'trong cấu hình <code>-bios</code> như các bước trên, đặt một biến rồi ' +
            '<code>saveenv</code>, và <code>reset</code> để CPU khởi động lại từ đầu:' },

          { t: 'code', where: 'uboot', code:
            'setenv myvar bios-test\n' +
            'saveenv\n' +
            'reset' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> saveenv\n' +
            'Saving Environment to Flash... Un-Protected 2 sectors\n' +
            'Erasing Flash...\n' +
            '.. done\n' +
            'Erased 2 sectors\n' +
            'Writing to Flash... done\n' +
            'Protected 2 sectors\n' +
            'OK\n' +
            '=> reset\n' +
            'resetting ...\n' +
            '\n' +
            'U-Boot 2026.07 (Aug 16 2026 - 12:28:29 +0700)\n' +
            '...\n' +
            'Loading Environment from Flash... OK\n' +
            '...\n' +
            '=> printenv myvar\n' +
            'myvar=bios-test' },

          { t: 'cal', kind: 'info', title: 'Cảnh báo <code>bad CRC</code> đã biến mất',
            x: 'Dòng <code>Loading Environment from Flash... OK</code> thay cho ' +
               '<code>*** Warning - bad CRC</code> là bằng chứng đầy đủ: lần này CRC32 tính ra ' +
               'khớp với checksum đã lưu, nên U-Boot dùng môi trường <b>trên flash</b> chứ không ' +
               'phải môi trường mặc định. Ba dòng <code>Erasing / Writing / Protected</code> ' +
               'cũng đáng chú ý — flash NOR chỉ xoá được theo cả <b>sector</b>, nên ghi 471 byte ' +
               'vẫn phải xoá trọn <b>2 sector</b>. Đó là bản chất của flash, bạn sẽ gặp lại nó ' +
               'ở Chặng 09.' },

          { t: 'p', x:
            'Bây giờ đến phần bất ngờ. <b>Thoát hẳn QEMU</b> (<kbd>Ctrl</kbd>+<kbd>A</kbd> rồi ' +
            '<kbd>X</kbd>), chạy lại <b>đúng</b> lệnh cũ, và hỏi lại biến đó:' },

          { t: 'code', where: 'uboot', code: 'printenv myvar' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Loading Environment from Flash... *** Warning - bad CRC, using default environment\n' +
            '=> printenv myvar\n' +
            '## Error: "myvar" not defined' },

          { t: 'cal', kind: 'why', title: 'Vì sao <code>reset</code> giữ được mà thoát QEMU thì mất?',
            x: 'Vì <code>-bios</code> chỉ nạp <code>u-boot.bin</code> vào một vùng flash ' +
               '<b>giả lập trong RAM của tiến trình QEMU</b>. Lệnh <code>reset</code> chỉ khởi ' +
               'động lại CPU ảo — tiến trình QEMU vẫn sống, nên vùng nhớ đó vẫn còn nguyên và ' +
               'CRC vẫn khớp. Còn khi tiến trình thoát, hệ điều hành thu hồi bộ nhớ và mọi thứ ' +
               'ghi vào "flash" tan biến. <b>Bài học:</b> <code>saveenv</code> in <code>OK</code> ' +
               'chỉ chứng minh việc ghi thành công, <i>không</i> chứng minh nó bền. Muốn kết ' +
               'luận, phải tắt hẳn nguồn rồi bật lại — trên board thật cũng đúng y như vậy.' },

          { t: 'p', x:
            'Cách sửa: cấp cho QEMU <b>file flash thật</b>. Máy <code>virt</code> có hai bank ' +
            'flash NOR: bank 0 ở địa chỉ 0, bank 1 ở <code>0x4000000</code> — đúng bằng ' +
            '<code>CONFIG_ENV_ADDR</code> mà bạn đã đọc. Vậy đặt U-Boot vào bank 0 và để môi ' +
            'trường tự tìm chỗ của nó ở bank 1:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai35\n' +
            'truncate -s 64M flash0.img\n' +
            'dd if=~/bai34/u-boot/u-boot.bin of=flash0.img conv=notrunc status=none\n' +
            'truncate -s 64M flash1.img' },

          { t: 'cmdx', cmd: 'dd if=~/bai34/u-boot/u-boot.bin of=flash0.img conv=notrunc status=none',
            title: 'Ghi U-Boot vào đầu bank flash mà không làm ngắn file',
            rows: [
              ['<code>conv=notrunc</code>',
               '<b>Bắt buộc.</b> Mặc định <code>dd</code> cắt file đích còn đúng bằng lượng vừa ' +
               'ghi — <code>flash0.img</code> sẽ tụt từ 64 MiB xuống 1 498 688 byte và QEMU từ ' +
               'chối vì sai kích thước bank.'],
              ['<code>status=none</code>', 'Tắt bảng thống kê của <code>dd</code> cho đỡ rối. Bỏ đi cũng ' +
                                           'không sao.'],
              ['<code>truncate -s 64M</code>',
               'Tạo file 64 MiB toàn số 0 mà không thực sự chiếm 64 MiB trên đĩa (file thưa). ' +
               'Kích thước phải khớp <b>chính xác</b> một bank flash của máy <code>virt</code>.']
            ] },

          { t: 'p', x:
            'Chạy lại QEMU — lần này <b>không có <code>-bios</code></b> nữa, vì U-Boot đã nằm ' +
            'sẵn trong flash và CPU sẽ tự lấy từ đó:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -drive if=pflash,format=raw,index=0,file=flash0.img,readonly=on \\\n' +
            '  -drive if=pflash,format=raw,index=1,file=flash1.img \\\n' +
            '  -drive file=disk.img,if=none,format=raw,id=hd0 \\\n' +
            '  -device virtio-blk-device,drive=hd0' },

          { t: 'code', where: 'uboot', code:
            'setenv myvar flash-test\n' +
            'setenv bootdelay 3\n' +
            'saveenv' },

          { t: 'p', x:
            'Thoát QEMU hẳn, rồi khởi động lại bằng đúng lệnh trên:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Loading Environment from Flash... OK\n' +
            '=> printenv myvar bootdelay\n' +
            'myvar=flash-test\n' +
            'bootdelay=3' },

          { t: 'cal', kind: 'why', title: 'Đây mới là bằng chứng persistence thật — khác hẳn lần thất bại ở trên',
            x: 'So với lần trước, khác biệt nằm ngay dòng đầu: <code>Loading Environment from Flash... ' +
               'OK</code>, không còn <code>bad CRC</code>. Lần này bạn đã <b>thoát hẳn tiến trình QEMU</b> ' +
               '— không chỉ gõ <code>reset</code> — rồi mở một tiến trình QEMU hoàn toàn mới trỏ vào cùng ' +
               'file <code>flash1.img</code>, và <code>myvar=flash-test</code>, <code>bootdelay=3</code> ' +
               'vẫn còn nguyên. Đây chính là phép thử mà cấu hình <code>-bios</code> ở trên đã trượt: dữ ' +
               'liệu giờ nằm trên một file thật của máy host, không phải trong RAM của một tiến trình đã ' +
               'chết.' },

          { t: 'p', x:
            'Và vì bây giờ môi trường là một file thật trên máy host, bạn <b>nhìn thấy nó</b>:' },

          { t: 'code', where: 'wsl', code: 'od -A d -t x1z -N 32 flash1.img' },

          { t: 'cmdx', cmd: 'od -A d -t x1z -N 32 flash1.img',
            title: 'Đọc một vùng flash trực tiếp từ máy host',
            rows: [
              ['<code>-A d</code>', 'Cột địa chỉ theo hệ <b>thập phân</b> — cùng quy ước bạn đã dùng với ' +
                                    '<code>od</code> ở <b>Bài 33</b>.'],
              ['<code>-t x1z</code>', '<code>x1</code> = mỗi ô <b>1 byte</b> hệ 16, khác với <code>-t ' +
                                      'x4</code> ở Bài 33 vốn gộp 4 byte thành một từ để đọc giá trị CPU ' +
                                      'thấy. Ở đây bạn muốn đúng <b>thứ tự byte thật trên đĩa</b> để đối ' +
                                      'chiếu với 4 byte CRC32, nên không gộp. Hậu tố <code>z</code> in ' +
                                      'thêm cột ASCII bên phải, giữa hai dấu <code>&gt;…&lt;</code>.'],
              ['<code>-N 32</code>', 'Chỉ đọc <b>32 byte</b> đầu — đủ thấy CRC32 và vài cặp ' +
                                     '<code>tên=giá_trị</code> đầu tiên, không cần đọc hết 256 KiB.']
            ] },

          { t: 'code', where: 'out', nocopy: true, code:
            '0000000 9c 26 49 19 61 72 63 68 3d 61 72 6d 00 62 61 75  >.&I.arch=arm.bau<\n' +
            '0000016 64 72 61 74 65 3d 31 31 35 32 30 30 00 62 6f 61  >drate=115200.boa<\n' +
            '0000032' },

          { t: 'cal', kind: 'info', title: 'Bạn vừa nhìn thẳng vào định dạng lưu trữ môi trường',
            x: 'Bốn byte đầu <code>9c 26 49 19</code> là <b>CRC32</b> — chính con số U-Boot đối ' +
               'chiếu lúc khởi động. Ngay sau đó là các cặp <code>tên=giá_trị</code> viết liền ' +
               'nhau, mỗi cặp kết thúc bằng một byte <code>00</code>: ' +
               '<code>arch=arm</code>, <code>baudrate=115200</code>, <code>boa…</code>. Không ' +
               'có gì huyền bí cả — nó chỉ là văn bản thuần với một checksum ở đầu. Hiểu điều ' +
               'này bạn sẽ hiểu luôn vì sao công cụ <code>fw_setenv</code> trên Linux có thể sửa ' +
               'môi trường U-Boot từ trong hệ điều hành đang chạy.' } ] },

      /* ── Bước 7 ─────────────────────────────────────────────────── */
      { title: 'boot.scr: đóng gói cả quy trình rồi để máy tự chạy',
        blocks: [
          { t: 'p', x:
            'Nhét cả năm lệnh vào <code>bootcmd</code> thì được, nhưng sửa một dấu ngoặc kép là ' +
            'phải gõ lại cả chuỗi dài loằng ngoằng. Cách mà mọi bản phân phối embedded dùng: ' +
            'viết kịch bản thành <b>file văn bản</b> trên máy host, đóng gói bằng ' +
            '<code>mkimage</code>, để lên đĩa, và cho <code>bootcmd</code> chỉ việc gọi nó.' },

          { t: 'code', where: 'file', name: '~/bai35/boot.cmd', code:
            'echo "=== course boot script ==="\n' +
            'setenv bootargs "console=ttyAMA0 rdinit=/init"\n' +
            'load virtio 0 ${kernel_addr_r} Image\n' +
            'load virtio 0 ${ramdisk_addr_r} initramfs.cpio.gz\n' +
            'booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr}' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai35\n' +
            'mkimage -A arm64 -O linux -T script -C none \\\n' +
            '        -n "Course boot script" -d boot.cmd boot.scr\n' +
            'ls -l boot.cmd boot.scr' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Image Name:   Course boot script\n' +
            'Created:      Sun Aug 16 16:43:01 2026\n' +
            'Image Type:   AArch64 Linux Script (uncompressed)\n' +
            'Data Size:    241 Bytes = 0.24 KiB = 0.00 MiB\n' +
            'Load Address: 00000000\n' +
            'Entry Point:  00000000\n' +
            'Contents:\n' +
            '   Image 0: 233 Bytes = 0.23 KiB = 0.00 MiB\n' +
            '-rw-r--r-- 1 shinarus shinarus 233 Aug 16 16:43 boot.cmd\n' +
            '-rw-r--r-- 1 shinarus shinarus 305 Aug 16 16:43 boot.scr' },

          { t: 'cmdx', cmd: 'mkimage -A arm64 -O linux -T script -C none -n "Course boot script" -d boot.cmd boot.scr',
            title: 'mkimage — công cụ đóng header của U-Boot',
            rows: [
              ['<code>-A arm64</code>', 'Kiến trúc. Ghi sai thì U-Boot vẫn chạy được script nhưng ' +
                                        '<code>iminfo</code> sẽ hiển thị nhầm.'],
              ['<code>-O linux</code>', 'Hệ điều hành đích. Với script thì đây chỉ là nhãn.'],
              ['<code>-T script</code>', '<b>Quan trọng nhất.</b> Kiểu ảnh = kịch bản, đây là thứ khiến ' +
                                         '<code>source</code> chịu thực thi nội dung.'],
              ['<code>-C none</code>',   'Không nén. Script vài trăm byte thì nén chẳng để làm gì.'],
              ['<code>-n "…"</code>',    'Tên mô tả, tối đa 32 ký tự, sẽ hiện trong <code>iminfo</code>.'],
              ['<code>-d boot.cmd</code>', 'File dữ liệu <b>nguồn</b>. Tham số cuối cùng, không có cờ, ' +
                                           'là file <b>đích</b>.']
            ] },

          { t: 'cal', kind: 'info', title: 'Từ 233 byte thành 305 byte — 72 byte đó là gì?',
            x: '<code>boot.cmd</code> là văn bản thuần <b>233 byte</b>; <code>boot.scr</code> là ' +
               '<b>305 byte</b>. Chênh lệch đúng <b>72 byte</b>: <b>64 byte</b> header legacy ' +
               'của U-Boot (magic <code>0x27051956</code>, CRC, kiểu ảnh, tên, dấu thời gian) ' +
               'cộng <b>8 byte</b> tiền tố độ dài mà kiểu <code>script</code> thêm vào. Chính 64 ' +
               'byte header này là thứ mà file <code>Image</code> ở bước 4 <b>không có</b>, nên ' +
               '<code>bootm</code> mới từ chối nó. Cùng một cơ chế, hai kết cục — và ' +
               '<b>Bài 36</b> sẽ dùng cơ chế đó ở quy mô 32 MB. Dòng <code>Created:</code>, tên ' +
               'người dùng <code>shinarus</code> và mốc giờ <code>Aug 16 16:43</code> sẽ khác ' +
               'trên máy bạn; chỉ hai con số 233 và 305 byte mới cần khớp.' },

          { t: 'p', x: 'Đưa script lên đĩa, cạnh kernel:' },

          { t: 'code', where: 'wsl', code:
            'debugfs -w -R "write boot.scr boot.scr" disk.img\n' +
            'debugfs -R "ls -l /" disk.img' },

          { t: 'p', x:
            'Khởi động lại QEMU với cấu hình pflash ở bước 6, rồi thử chạy tay một lần trước khi ' +
            'giao cho máy:' },

          { t: 'code', where: 'uboot', code:
            'load virtio 0 ${scriptaddr} boot.scr\n' +
            'iminfo ${scriptaddr}\n' +
            'source ${scriptaddr}' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> load virtio 0 ${scriptaddr} boot.scr\n' +
            '305 bytes read in 2 ms (148.4 KiB/s)\n' +
            '=> iminfo ${scriptaddr}\n' +
            '\n' +
            '## Checking Image at 40200000 ...\n' +
            '   Legacy image found\n' +
            '   Image Name:   Course boot script\n' +
            '   Created:      2026-08-16   9:43:01 UTC\n' +
            '   Image Type:   AArch64 Linux Script (uncompressed)\n' +
            '   Data Size:    241 Bytes = 241 Bytes\n' +
            '   Load Address: 00000000\n' +
            '   Entry Point:  00000000\n' +
            '   Contents:\n' +
            '      Image 0: 233 Bytes = 233 Bytes\n' +
            '   Verifying Checksum ... OK\n' +
            '=> source ${scriptaddr}\n' +
            '## Executing script at 40200000\n' +
            '=== course boot script ===\n' +
            '30771136 bytes read in 41 ms (715.7 MiB/s)\n' +
            '1035397 bytes read in 2 ms (493.7 MiB/s)\n' +
            '## Flattened Device Tree blob at 40000000\n' +
            '   Booting using the fdt blob at 0x40000000\n' +
            '...\n' +
            'Starting kernel ...' },

          { t: 'cal', kind: 'tip', title: 'So sánh <code>iminfo</code> ở đây với ở bước 4',
            x: 'Bước 4, cùng lệnh <code>iminfo</code> trả lời <code>Unknown image format!</code> ' +
               'cho file <code>Image</code>. Ở đây nó đọc vanh vách tên, kiểu, kích thước, dấu ' +
               'thời gian, và còn <code>Verifying Checksum ... OK</code>. Khác biệt duy nhất là ' +
               '64 byte header. Hãy biến <code>iminfo</code> thành <b>phản xạ đầu tiên</b> mỗi ' +
               'khi <code>bootm</code> báo lỗi — nó trả lời đúng câu hỏi "cái tôi vừa nạp ' +
               'thực chất là gì?". Mốc giờ <code>Created:</code> ở đây lặp lại đúng lúc build ' +
               'script lúc nãy nên cũng sẽ khác trên máy bạn.' },

          { t: 'cal', kind: 'why', title: '<code>source</code> vừa chạy lại đúng bốn lệnh bạn gõ tay ở bước 5',
            x: 'Nhìn kỹ log sau <code>## Executing script at 40200000</code>: dòng ' +
               '<code>=== course boot script ===</code> chính là lệnh <code>echo</code> đầu tiên trong ' +
               '<code>boot.cmd</code> — bằng chứng nội dung file thật sự được <b>thực thi</b>, không chỉ ' +
               'nạp vào RAM rồi bỏ đó. Hai dòng <code>bytes read</code> tiếp theo báo đúng ' +
               '<b>30 771 136</b> byte cho kernel và <b>1 035 397</b> byte cho initramfs — không sai một ' +
               'byte so với bước 5 — rồi log đi tới đúng <code>Starting kernel ...</code>. Một lệnh ' +
               '<code>source</code> vừa thay thế nguyên vẹn bốn lệnh bạn từng gõ tay, không thiếu bước nào.' },

          { t: 'p', x:
            'Bước cuối: giao cho máy. Thoát QEMU, khởi động lại bằng cấu hình pflash, rồi đặt ' +
            '<code>bootcmd</code> và lưu:' },

          { t: 'code', where: 'uboot', code:
            'setenv bootcmd \'load virtio 0 ${scriptaddr} boot.scr; source ${scriptaddr}\'\n' +
            'printenv bootcmd\n' +
            'saveenv' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=> setenv bootcmd \'load virtio 0 ${scriptaddr} boot.scr; source ${scriptaddr}\'\n' +
            '=> printenv bootcmd\n' +
            'bootcmd=load virtio 0 ${scriptaddr} boot.scr; source ${scriptaddr}\n' +
            '=> saveenv\n' +
            'Saving Environment to Flash... Un-Protected 2 sectors\n' +
            'Erasing Flash...\n' +
            '.. done\n' +
            'Erased 2 sectors\n' +
            'Writing to Flash... done\n' +
            'Protected 2 sectors\n' +
            'OK' },

          { t: 'cal', kind: 'warn', title: 'Dấu nháy đơn, không phải nháy kép',
            x: 'Chuỗi chứa <code>${scriptaddr}</code>. Dùng nháy <b>đơn</b> thì shell của ' +
               'U-Boot lưu nguyên văn dấu <code>$</code>, để đến lúc <code>bootcmd</code> chạy ' +
               'mới khai triển. Dùng nháy <b>kép</b> thì nó khai triển ngay lúc ' +
               '<code>setenv</code>, và bạn sẽ lưu vào flash một địa chỉ cứng ' +
               '<code>0x40200000</code> — hôm nay vẫn chạy, nhưng sang board khác thì sai. ' +
               'Đây đúng là quy tắc nháy đơn/nháy kép bạn đã học ở <b>Bài 5</b> với Bash, ' +
               'áp dụng nguyên vẹn ở một nơi hoàn toàn khác.' },

          { t: 'p', x:
            'Thoát QEMU. Khởi động lại. Và lần này <b>không gõ gì cả</b> — cứ để nó đếm ngược:' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Loading Environment from Flash... OK\n' +
            '...\n' +
            'Net:   eth0: virtio-net#32\n' +
            'Hit any key to stop autoboot:  0\n' +
            '305 bytes read in 8 ms (37.1 KiB/s)\n' +
            '## Executing script at 40200000\n' +
            '=== course boot script ===\n' +
            '30771136 bytes read in 31 ms (946.6 MiB/s)\n' +
            '1035397 bytes read in 2 ms (493.7 MiB/s)\n' +
            '## Flattened Device Tree blob at 40000000\n' +
            '   Booting using the fdt blob at 0x40000000\n' +
            '   Loading Ramdisk to 5d428000, end 5d524c85 ... OK\n' +
            '   Loading Device Tree to 000000005d325000, end 000000005d427fff ... OK\n' +
            '\n' +
            'Starting kernel ...\n' +
            '...\n' +
            'BusyBox v1.38.0 (Debian 1:1.38.0-3) built-in shell (ash)\n' +
            '\n' +
            '~ # cat /proc/cmdline\n' +
            'console=ttyAMA0 rdinit=/init' },

          { t: 'cal', kind: 'why', title: 'Bạn vừa dựng xong một thiết bị embedded hoàn chỉnh',
            x: 'Dừng lại một chút và nhìn lại chuỗi vừa xảy ra: CPU chạy từ <b>flash bank 0</b> ' +
               '→ U-Boot đọc <b>môi trường ở flash bank 1</b> → <code>bootcmd</code> nạp ' +
               '<b>boot.scr từ ổ đĩa</b> → script đặt <code>bootargs</code>, nạp kernel và ' +
               'initramfs → <code>booti</code> bàn giao theo hợp đồng ARM64 → Linux chạy tới ' +
               'shell. <b>Không một phím nào được gõ.</b> Đây chính xác là những gì xảy ra bên ' +
               'trong router, camera hay bộ điều khiển công nghiệp mỗi lần cắm điện. Từ đây trở ' +
               'đi bạn không còn học lý thuyết boot nữa — bạn đang thay từng mảnh của một hệ ' +
               'thống mình đã hiểu.' } ] }
    ] },

    /* ══════════════════════════════════════════════════════════════════
       7. Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Wrong Image Type for bootm command</code><br><code>ERROR -91</code>',
         'Bạn đưa ảnh thô (<code>Image</code>) cho <code>bootm</code>, mà lệnh này chỉ ăn ảnh có header U-Boot',
         'Dùng <code>booti</code> cho <code>Image</code>. Không chắc thì gõ <code>iminfo &lt;addr&gt;</code> để hỏi xem đó là ảnh gì'],
        ['<code>Unknown image format!</code>',
         '<code>iminfo</code> không tìm thấy magic nào nó biết tại địa chỉ đó',
         'Bình thường với <code>Image</code> thô. Nếu bạn <i>tưởng</i> đó là uImage/FIT thì file đã hỏng hoặc nạp sai địa chỉ'],
        ['<code>Failed to load \'vmlinuz\'</code>',
         'Tên file không có trên hệ thống file đó — U-Boot phân biệt hoa thường',
         '<code>ls virtio 0</code> để xem tên thật. Lưu ý RAM đích <b>không</b> bị chạm, nội dung cũ vẫn còn'],
        ['<code>*** Warning - bad CRC, using default environment</code>',
         'Vùng môi trường trên flash chưa từng được ghi, hoặc đã bị xoá',
         'Không phải lỗi. Chạy <code>saveenv</code> một lần là hết. Nếu <b>lần nào cũng</b> hiện lại, xem dòng dưới'],
        ['<code>saveenv</code> in <code>OK</code> nhưng khởi động lại vẫn mất',
         'QEMU đang chạy với <code>-bios</code> — flash chỉ là bộ nhớ trong tiến trình QEMU',
         'Chuyển sang <code>-drive if=pflash,index=0/1</code> với file thật, và bỏ <code>-bios</code> đi'],
        ['<code>## Error: "myvar" not defined</code>',
         'Biến chưa được đặt trong phiên này, hoặc đã đặt nhưng chưa <code>saveenv</code> trước khi tắt máy',
         '<code>printenv</code> không tham số để xem toàn bộ danh sách hiện có'],
        ['Kernel panic <code>No working init found</code> ngay sau <code>Starting kernel</code>',
         'Thiếu <code>:${filesize}</code> sau địa chỉ ramdisk, hoặc hai lệnh <code>load</code> bị đảo thứ tự',
         'Ramdisk phải là file nạp <b>sau cùng</b>, và luôn viết đủ <code>${ramdisk_addr_r}:${filesize}</code>'],
        ['<code>Unknown command \'console=ttyAMA0\'</code>',
         'Đặt tham số kernel vào <code>bootcmd</code> thay vì <code>bootargs</code>',
         '<code>bootcmd</code> = lệnh cho U-Boot; <code>bootargs</code> = tham số cho kernel'],
        ['<kbd>Ctrl</kbd>+<kbd>C</kbd> không thoát được QEMU',
         'Với <code>-nographic</code>, phím bấm được gửi thẳng vào máy ảo',
         '<kbd>Ctrl</kbd>+<kbd>A</kbd> thả ra rồi <kbd>X</kbd>'],
        ['<code>dd</code> xong thì QEMU báo kích thước pflash sai',
         'Quên <code>conv=notrunc</code> nên <code>dd</code> cắt ngắn <code>flash0.img</code>',
         'Tạo lại bằng <code>truncate -s 64M</code> rồi <code>dd … conv=notrunc</code>']
      ] },

    /* ══════════════════════════════════════════════════════════════════
       8. Tóm tắt
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', items: [
      'Dấu nhắc <code>=&gt;</code> là một shell thật với <b>124 lệnh</b> biên dịch cứng trong ' +
      '<code>u-boot.bin</code>. Không có <code>$PATH</code>, không có tiến trình, không có MMU ' +
      'bảo vệ. Tra cứu tại chỗ bằng <code>help &lt;lệnh&gt;</code>.',

      '<b>Môi trường</b> là bảng điều khiển: đổi biến là đổi cách boot, không cần build lại. ' +
      '<code>bootcmd</code> là lệnh <b>U-Boot</b> tự chạy; <code>bootargs</code> là tham số ' +
      'chuyển cho <b>kernel</b> và hiện ra ở <code>/proc/cmdline</code>.',

      'Cảnh báo <code>bad CRC</code> chỉ có nghĩa "chưa ai lưu gì vào vùng môi trường". Sau ' +
      '<code>saveenv</code> nó đổi thành <code>Loading Environment from Flash... OK</code>. ' +
      'Nhưng với <code>-bios</code>, dữ liệu chỉ sống trong tiến trình QEMU — muốn bền phải ' +
      'dùng <code>-drive if=pflash</code> với file thật.',

      '<code>md</code>/<code>mw</code>/<code>cmp</code> đọc ghi RAM vật lý trực tiếp. Số magic ' +
      '<b><code>d00dfeed</code></b> nhận diện device tree, in ra thành <code>edfe0dd0</code> vì ' +
      'ARM64 là little-endian; <code>md.b</code> cho thấy thứ tự byte thật.',

      'Chọn lệnh boot theo <b>định dạng file</b>: <code>booti</code> cho <code>Image</code> ' +
      'ARM64, <code>bootz</code> cho <code>zImage</code> ARM32, <code>bootm</code> <b>chỉ</b> ' +
      'cho ảnh có header U-Boot. Nhầm là nhận <code>Wrong Image Type</code> + ' +
      '<code>ERROR -91</code>.',

      '<code>booti &lt;kernel&gt; &lt;ramdisk&gt;:&lt;size&gt; &lt;fdt&gt;</code> — kích thước ' +
      'ramdisk là <b>bắt buộc</b>, lấy từ <code>${filesize}</code>, nên ramdisk phải là file ' +
      'nạp sau cùng. U-Boot tự dời ramdisk và DTB lên đỉnh RAM để kernel không giẫm lên chúng.',

      '<code>mkimage -T script</code> gói một file văn bản <b>233 byte</b> thành ' +
      '<code>boot.scr</code> <b>305 byte</b>; 72 byte chênh lệch là header 64 byte cộng 8 byte ' +
      'tiền tố. <code>source</code> chạy nó, <code>iminfo</code> soi nó.',

      'Ghép lại: flash bank 0 chứa U-Boot, bank 1 chứa môi trường, <code>bootcmd</code> nạp ' +
      '<code>boot.scr</code> từ đĩa, script nạp kernel + initramfs rồi <code>booti</code>. ' +
      '<b>Máy tự boot tới shell mà không cần gõ phím nào</b> — đúng như một thiết bị thật.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Boot từ ổ đĩa rất hợp với sản phẩm đã xuất xưởng, nhưng cực kỳ tệ khi đang phát ' +
         'triển: sửa một dòng kernel là phải tháo thẻ SD ra chép lại. <b>Bài 36</b> cắt hẳn ' +
         'vòng lặp đó bằng <b>TFTP</b> — U-Boot xin địa chỉ bằng <code>dhcp</code>, kéo kernel ' +
         'thẳng từ thư mục build trên máy bạn về RAM, và bạn chỉ việc gõ lại một lệnh sau mỗi ' +
         'lần <code>make</code>. Nửa sau của bài trả lời câu hỏi còn treo từ bước 4: bạn sẽ gói ' +
         '<code>Image</code> + DTB + initramfs thành <b>một file FIT duy nhất</b> mà ' +
         '<code>bootm</code> ăn được, mỗi thành phần kèm <b>hash SHA-256</b> — rồi cố tình lật ' +
         '<b>một byte</b> ở giữa file 31 MB để xem U-Boot phát hiện và từ chối boot. Cuối cùng ' +
         'bạn <b>ký</b> ảnh bằng RSA-2048 và nhét khoá công khai vào U-Boot, để nó từ chối luôn ' +
         'cả ảnh không có chữ ký — nền móng của secure boot.' }

  ],

  quiz: [
    { q: 'Bạn gõ <code>setenv bootdelay 10</code> rồi tắt máy ảo. Bật lại thì <code>bootdelay</code> vẫn là <code>2</code>. Vì sao?',
      opts: [
        'Vì <code>bootdelay</code> là biến chỉ đọc, phải sửa trong defconfig',
        'Vì <code>setenv</code> chỉ sửa bản môi trường trong RAM; thiếu <code>saveenv</code> nên không có gì được ghi xuống flash',
        'Vì giá trị 10 vượt quá giới hạn cho phép nên U-Boot tự đặt lại về mặc định',
        'Vì môi trường mặc định luôn được nạp đè lên môi trường đã lưu'
      ],
      a: 1,
      why: 'Môi trường có hai bản: bản RAM dùng lúc chạy và bản flash sống qua tắt nguồn. ' +
           '<code>setenv</code> chỉ chạm bản RAM. Chỉ <code>saveenv</code> mới tính lại CRC32 và ' +
           'ghi xuống flash — và đó cũng chính là lúc cảnh báo <code>bad CRC</code> thôi xuất ' +
           'hiện. Lưu ý thêm: nếu đang chạy với <code>-bios</code>, <code>saveenv</code> vẫn ' +
           'chưa đủ, vì "flash" khi đó chỉ nằm trong tiến trình QEMU.' },

    { q: '<code>md.l 0x40000000 1</code> in ra <code>edfe0dd0</code>. Đây là gì?',
      opts: [
        'Bộ nhớ chưa khởi tạo, chứa giá trị rác',
        'Số magic <code>d00dfeed</code> của device tree, hiển thị đảo byte vì ARM64 là little-endian',
        'Mã lỗi của U-Boot báo địa chỉ không đọc được',
        'Bốn byte đầu của ảnh kernel Linux'
      ],
      a: 1,
      why: 'Gõ <code>md.b</code> ở cùng địa chỉ sẽ thấy đúng thứ tự byte thật ' +
           '<code>d0 0d fe ed</code>. Đây là bằng chứng tức thời rằng địa chỉ đó chứa device ' +
           'tree — cực kỳ hữu ích khi gỡ lỗi. Bốn byte đầu của ảnh kernel ARM64 thì khác hẳn: ' +
           '<code>fa405a4d</code>, hiện thành <code>MZ</code> ở cột ASCII.' },

    { q: 'Kịch bản nào <b>chắc chắn</b> làm kernel panic dù mọi lệnh U-Boot đều báo thành công?',
      opts: [
        'Nạp kernel vào <code>0x40400000</code> thay vì <code>0x40200000</code>',
        'Đảo thứ tự hai lệnh <code>load</code>, nạp initramfs trước rồi kernel sau, mà vẫn viết <code>${ramdisk_addr_r}:${filesize}</code>',
        'Dùng <code>ext4load</code> thay cho <code>load</code>',
        'Đặt <code>bootargs</code> trước khi nạp file thay vì sau'
      ],
      a: 1,
      why: '<code>filesize</code> luôn là kích thước của <b>lần nạp gần nhất</b>. Nạp kernel sau ' +
           'cùng thì <code>${filesize}</code> = 30 771 136, và U-Boot sẽ báo với kernel rằng ' +
           'initramfs dài 30 MB trong khi thực tế chỉ 1 MB — kernel đọc phải rác và panic. ' +
           'Các phương án khác đều vô hại: <code>0x40400000</code> chính là ' +
           '<code>kernel_addr_r</code>, <code>ext4load</code> làm y hệt <code>load</code>, và ' +
           '<code>bootargs</code> chỉ được đọc vào lúc <code>booti</code> chạy.' },

    { q: 'Đâu là mô tả đúng về cặp <code>bootcmd</code> / <code>bootargs</code>?',
      opts: [
        '<code>bootcmd</code> là chuỗi lệnh U-Boot tự thực thi; <code>bootargs</code> là dòng lệnh U-Boot chuyển cho kernel',
        'Cả hai đều là lệnh U-Boot, <code>bootargs</code> chỉ là bí danh cũ của <code>bootcmd</code>',
        '<code>bootcmd</code> dành cho boot từ mạng, <code>bootargs</code> dành cho boot từ đĩa',
        '<code>bootargs</code> chạy trước, <code>bootcmd</code> chạy sau khi kernel đã khởi động'
      ],
      a: 0,
      why: 'Mẹo nhớ: <b>cmd</b> = <i>command</i> → lệnh <b>của U-Boot</b>, U-Boot thực thi. ' +
           '<b>args</b> = <i>arguments</i> → tham số <b>cho kernel</b>, U-Boot chỉ chép vào ' +
           'device tree rồi đưa đi. Bạn đã kiểm chứng vế sau bằng ' +
           '<code>cat /proc/cmdline</code> ở bước 5: đúng chuỗi bạn gõ vào ' +
           '<code>bootargs</code> xuất hiện nguyên vẹn bên trong Linux.' },

    { q: 'Nhìn hai dòng <code>Loading Ramdisk to 5d428000</code> và <code>Loading Device Tree to 000000005d325000</code>, dù bạn nạp ramdisk vào <code>0x44000000</code> và DTB nằm ở <code>0x40000000</code>. U-Boot đang làm gì?',
      opts: [
        'Báo lỗi: hai file đã bị nạp sai địa chỉ',
        'Dời ramdisk và device tree lên gần đỉnh RAM để kernel giải nén từ 0x40400000 đi lên không đè lên chúng',
        'Nén hai file lại để tiết kiệm RAM trước khi bàn giao',
        'Chép chúng vào flash để lần boot sau khỏi phải nạp lại'
      ],
      a: 1,
      why: 'Kernel bung ra rất lớn từ địa chỉ nạp đi lên, nên mọi thứ nằm ngay phía trên nó đều ' +
           'gặp nguy. Bootloader phải tự dời — đây là dịch vụ mà QEMU đã âm thầm làm hộ ở ' +
           'Bài 32 và giờ U-Boot đảm nhiệm. Địa chỉ device tree <i>sau khi dời</i> ' +
           '(<code>0x5d325000</code>) mới là giá trị được đặt vào <code>x0</code> theo hợp đồng ' +
           'bàn giao ARM64 của Bài 33.' },

    { q: 'Bạn gõ <code>bootm ${kernel_addr_r}</code> và nhận <code>Wrong Image Type</code>. Lệnh nào nên gõ <b>tiếp theo</b> để chẩn đoán, trước khi thử lệnh boot khác?',
      opts: [
        '<code>printenv</code>, để kiểm tra biến môi trường',
        '<code>iminfo ${kernel_addr_r}</code>, để hỏi xem thứ vừa nạp thực chất là ảnh gì',
        '<code>reset</code>, để bắt đầu lại từ trạng thái sạch',
        '<code>crc32 ${kernel_addr_r} 100</code>, để kiểm tra file có hỏng không'
      ],
      a: 1,
      why: '<code>iminfo</code> sinh ra đúng để trả lời câu hỏi "cái ở địa chỉ này là ảnh gì?". ' +
           'Với <code>Image</code> thô nó nói <code>Unknown image format!</code> — xác nhận vấn ' +
           'đề là <b>chọn nhầm lệnh</b> chứ không phải file hỏng, nên cách sửa là dùng ' +
           '<code>booti</code>. Với <code>boot.scr</code> thì cũng lệnh đó in đầy đủ tên, kiểu, ' +
           'kích thước và <code>Verifying Checksum ... OK</code>. Ở Bài 36 nó sẽ liệt kê cả ' +
           'từng thành phần bên trong một ảnh FIT.' }
  ]
});

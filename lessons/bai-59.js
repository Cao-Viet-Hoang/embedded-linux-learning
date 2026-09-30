/* Bài 59 — Vì sao cần build system
   Chặng 11 — Build system
   Bài toán tái lập (reproducible build), phụ thuộc, và bảo trì lâu dài; tự động hoá
   phần việc Chặng 09 đã làm bằng tay (BusyBox → rootfs → cpio).
   Thực hành trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1), 2026-09-30:
   - Bước 1: kiểm kê những gì chỉ nằm trong đầu người build: chuỗi Linux version của Image
     (#5, user@host, giờ build), và .config của ~/bai38 so với defconfig (diffconfig: 5 dòng).
   - Bước 2: build BusyBox 1.38.0 hai lần, cùng nguồn cùng .config → hai sha256 khác nhau;
     22 byte khác = 20 byte Build ID + 2 chữ số giây của AUTOCONF_TIMESTAMP.
   - Bước 3: SOURCE_DATE_EPOCH (đọc ở scripts/kconfig/confdata.c:384) → hai bản trùng nhau;
     nhưng TZ vẫn lọt vào (ctime() ghi đè struct tm của gmtime()) → thêm TZ=UTC.
   - Bước 4: cpio của hai cây giống hệt khác nhau 1245 byte (inode, uid, mtime); gzip nhúng
     mtime; bảng bốn cờ cho thấy mỗi cờ đều cần (sort thì chỉ lộ khi đổi hệ thống file).
   - Bước 5–6: Makefile 47 dòng: sha256 → giải nén → .config → build → rootfs → cpio;
     make lần hai "Nothing to be done"; sửa overlay chỉ đóng gói lại; sửa .config build lại
     BusyBox (10 s); bản sao ở thư mục khác, TZ/LC_ALL khác → cùng sha256; tarball cụt →
     dừng ở bước sha256; sửa EPOCH trong Makefile → make không biết (Makefile không phải
     điều kiện tiên quyết) → bài học về phụ thuộc bị khai thiếu.
   - Bước 6 (cuối): boot out/rootfs.cpio.gz trong QEMU, BusyBox tự báo ngày 2026-09-21 14:13:20 UTC.
   busybox.net trả 401 qua proxy của máy B cả buổi 2026-09-30; tarball lấy lại từ ~/bai47
   (cùng sha256 34f9ea6f…). Bài dạy lệnh curl của Bài 47 và nói rõ cách copy từ ~/bai47. */

Lesson.register({
  id: 'bai-59',
  title: 'Vì sao cần build system',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Từ Chặng 07 tới giờ bạn đã dựng một hệ thống Linux nhúng hoàn chỉnh bằng tay: build kernel, bật tắt tuỳ chọn ' +
    'bằng <code>scripts/config</code>, build BusyBox, viết <code>inittab</code> và <code>rcS</code>, đóng gói ' +
    '<code>cpio</code>, rồi sao chép thư mục initramfs từ bài này sang bài khác. Nó chạy. Nhưng thử trả lời ba câu: ' +
    '<code>Image</code> đang nằm trong <code>~/bai38</code> được build với những tuỳ chọn nào khác ' +
    '<code>defconfig</code>? Một đồng nghiệp làm theo đúng các bước của bạn thì có ra <b>đúng từng byte</b> file đó ' +
    'không? Và sáu tháng nữa, khi khách hàng báo lỗi trên firmware bạn phát hành hôm nay, bạn có dựng lại được chính ' +
    'xác firmware đó không?<br><br>' +
    'Bài này đo câu trả lời thay vì đoán. Bạn sẽ build BusyBox hai lần từ cùng một nguồn và thấy hai file khác nhau; ' +
    'lần theo từng byte khác biệt tới tận nguồn gốc của nó; loại bỏ từng nguồn gốc cho tới khi hai lần build trùng ' +
    'khớp tuyệt đối; rồi gói toàn bộ quy trình Chặng 09 vào một <code>Makefile</code> 47 dòng. Cái Makefile đó là ' +
    'một <b>build system</b> tí hon — và những chỗ nó còn thiếu chính là lý do Buildroot và Yocto tồn tại.',

  goals: [
    'Kể ra ba bài toán mà build thủ công không giải được: tái lập (reproducibility), phụ thuộc giữa các bước, và bảo trì lâu dài — kèm một ví dụ đo được cho mỗi bài toán.',
    'Chứng minh bằng <code>sha256sum</code> và <code>cmp -l</code> rằng hai lần build cùng nguồn cho ra hai file khác nhau, và chỉ ra từng byte khác đến từ đâu.',
    'Dùng <code>SOURCE_DATE_EPOCH</code>, <code>TZ=UTC</code>, <code>cpio --reproducible --owner=0:0</code>, <code>sort</code> và <code>gzip -n</code> để biến một bước build thành tất định (deterministic), và giải thích vì sao thiếu một thứ là hỏng.',
    'Viết một Makefile dựng lại rootfs từ các đầu vào được ghim (phiên bản, checksum, <code>.config</code>, overlay) bằng một lệnh <code>make</code>.',
    'Nhận ra lỗi "phụ thuộc bị khai thiếu": đầu vào đổi mà <code>make</code> báo <code>Nothing to be done</code>, và biết vì sao build system thật lưu dấu (stamp) cho từng bước.',
    'Mô tả Buildroot và Yocto làm gì mà Makefile tí hon của bạn không làm, để chuẩn bị cho Bài 60–62.'
  ],

  blocks: [
    /* ============================================================
       1. BA BÀI TOÁN
       ============================================================ */
    { t: 'h2', x: 'Ba bài toán mà làm tay không giải được' },

    { t: 'p', x:
      'Một hệ thống Linux nhúng không phải một chương trình, mà là hàng chục chương trình ghép lại: bootloader, kernel, ' +
      'Device Tree, module, thư viện C, BusyBox, các daemon của bạn, file cấu hình. Mỗi thứ có mã nguồn riêng, phiên bản ' +
      'riêng, tuỳ chọn build riêng, và thứ tự build riêng. Khi làm tay, toàn bộ kiến thức đó nằm ở <b>ba chỗ không đáng ' +
      'tin</b>: trí nhớ của bạn, lịch sử shell, và các file đang nằm rải rác trên ổ đĩa. Ba chỗ đó sinh ra ba bài toán:' },

    { t: 'table',
      head: ['Bài toán', 'Câu hỏi', 'Ví dụ ngay trong khoá học này'],
      rows: [
        ['<b>Tái lập</b> (reproducibility)', 'Cùng nguồn, cùng cấu hình — có ra cùng một file không? Người khác có dựng lại được không?',
         'Bài 58 bật <code>CONFIG_I2C_STUB=m</code> bằng <code>scripts/config</code>. Dòng lệnh đó chỉ còn trong bài học; ' +
         '<code>.config</code> của bạn giờ khác <code>defconfig</code> ở <b>5</b> dòng (bước 1 đo)'],
        ['<b>Phụ thuộc</b> (dependency)', 'Đổi một thứ thì phải làm lại những bước nào — và <i>chỉ</i> những bước nào?',
         'Bật một tuỳ chọn <code>=y</code> thì phải build lại <code>Image</code>; bật <code>=m</code> thì chỉ cần ' +
         '<code>modules</code>; sửa <code>inittab</code> thì chỉ cần đóng gói lại <code>cpio</code>. Bạn nhớ quy tắc này, ' +
         'máy thì không'],
        ['<b>Bảo trì lâu dài</b>', 'Hai năm nữa, khi phải vá một lỗ hổng trong BusyBox, bạn có biết bản đang chạy trên thiết bị gồm những gì không?',
         'Bài 58 thôi đã đóng gói initramfs <b>năm lần</b>, mỗi lần từ một bản sao <code>~/bai32/initramfs</code> cộng ' +
         'thêm vài file. Không có danh sách nào ghi lại bản cuối cùng chứa gì']
      ] },

    { t: 'p', x:
      'Một hình ảnh dễ nhớ: build thủ công giống <b>nấu ăn theo trí nhớ</b>. Bạn nấu ngon, nhưng mỗi lần một khác, người ' +
      'khác không nấu lại được, và nếu một thực khách bị dị ứng, bạn không chắc hôm đó đã cho những gì vào nồi. Build ' +
      'system là <b>công thức nấu ăn viết ra giấy</b>: nguyên liệu có tên và khối lượng chính xác (phiên bản + checksum), ' +
      'các bước có thứ tự (phụ thuộc), và ai nấu theo cũng ra cùng một món (tái lập).' },

    { t: 'cal', kind: 'why', title: 'Vì sao ngành nhúng coi trọng chuyện này hơn ngành web',
      x: 'Một trang web lỗi thì deploy lại trong năm phút. Firmware đã nằm trên mười nghìn chiếc máy giặt, ô tô hay thiết ' +
         'bị y tế thì không. Khi một chiếc báo lỗi, kỹ sư phải dựng lại <b>đúng</b> bản firmware đó để tìm nguyên nhân; khi ' +
         'một lỗ hổng bảo mật được công bố, phải trả lời được "sản phẩm của chúng ta có dùng thư viện đó, ở phiên bản đó ' +
         'không"; và nhiều ngành (ô tô, y tế, đường sắt) yêu cầu chứng minh nhị phân trên thiết bị được build từ đúng mã ' +
         'nguồn đã kiểm định. Bài 17 đã chạm vào ý này khi <code>ar</code> ghi ngày 1/1/1970 vào mọi thành viên của ' +
         '<code>.a</code> — đó là chế độ <i>deterministic</i> của binutils, sinh ra đúng vì mục tiêu tái lập.' },

    { t: 'p', x:
      '"Tái lập" có hai mức, và bài này đi hết cả hai. Mức thứ nhất: <b>dựng lại được</b> — ai đó có đủ thông tin để build ' +
      'ra một hệ thống chạy giống hệt. Mức thứ hai, khó hơn nhiều: <b>trùng từng byte</b> (bit-for-bit reproducible) — hai ' +
      'lần build, ở hai máy, hai thời điểm, cho ra hai file có cùng <code>sha256</code>. Mức thứ hai là thứ duy nhất có ' +
      'thể <i>kiểm chứng</i> bằng máy: nếu hai hash khớp, bạn không cần tin ai cả.' },

    { t: 'terms', items: [
      ['Build system', '', 'Công cụ biến một mô tả (phiên bản, checksum, cấu hình, bước build) thành sản phẩm cuối, tự quyết định bước nào cần làm lại. <code>make</code> là build system cho một chương trình; Buildroot và Yocto là build system cho cả một hệ điều hành'],
      ['Tái lập', 'reproducible build', 'Cùng đầu vào luôn cho cùng đầu ra, trùng từng byte, bất kể ai build, ở đâu, lúc nào'],
      ['Tất định', 'deterministic', 'Tính chất của một bước build không phụ thuộc vào thứ gì ngoài đầu vào khai báo — không đọc đồng hồ, tên máy, thứ tự file trên đĩa'],
      ['Đầu vào được ghim', 'pinned input', 'Một đầu vào được chỉ định chính xác: phiên bản cụ thể kèm checksum, thay vì "bản mới nhất"'],
      ['<code>SOURCE_DATE_EPOCH</code>', '', 'Biến môi trường chuẩn (reproducible-builds.org) chứa một mốc thời gian Unix. Công cụ nào tôn trọng nó sẽ dùng mốc này thay cho giờ hiện tại'],
      ['Stamp', 'dấu mốc', 'Một file rỗng tạo ra khi một bước hoàn tất, để <code>make</code> so thời gian và biết bước đó đã xong. Makefile ở bước 5 dùng hai stamp; Buildroot tạo một loạt stamp cho mỗi package — Bài 60 sẽ cho bạn thấy chúng trên đĩa']
    ] },

    /* ============================================================
       2. VÌ SAO HAI LẦN BUILD KHÁC NHAU
       ============================================================ */
    { t: 'h2', x: 'Hai lần build khác nhau từ đâu ra' },

    { t: 'p', x:
      'Trình biên dịch là một chương trình tất định: cùng file <code>.c</code>, cùng cờ, nó sinh cùng mã máy. Vậy nếu hai ' +
      'lần build cho ra hai file khác nhau, sự khác biệt phải lọt vào từ <b>bên ngoài</b> mã nguồn. Mỗi lần một công cụ ' +
      'đọc thứ gì đó từ môi trường và ghi nó vào sản phẩm, một "lỗ rò" mở ra. Có năm nguồn rò hay gặp, và khoá học này đã ' +
      'gặp gần hết mà chưa gọi tên:' },

    { t: 'table',
      head: ['Nguồn rò', 'Công cụ đọc nó', 'Đã gặp ở đâu'],
      rows: [
        ['<b>Đồng hồ</b> — giờ build', 'Kbuild (chuỗi <code>Linux version … #N … Wed Sep 30 16:58:14</code>), Kconfig của BusyBox (<code>AUTOCONF_TIMESTAMP</code>), <code>gzip</code> (4 byte mtime trong header)', 'Bài 40: bộ đếm <code>#N</code> và giờ build trong log boot'],
        ['<b>Múi giờ, ngôn ngữ</b> — <code>TZ</code>, <code>LC_ALL</code>', 'Mọi chỗ in giờ theo giờ địa phương; <code>sort</code> xếp theo ngôn ngữ', 'Chưa gặp — bước 3 sẽ bắt được một chỗ bất ngờ'],
        ['<b>Hệ thống file</b> — inode, thứ tự thư mục, mtime', '<code>cpio</code>, <code>tar</code>, <code>find</code>', 'Bài 32 và 48: file <code>.cpio.gz</code> lệch vài byte mỗi lần đóng gói'],
        ['<b>Danh tính máy</b> — user, hostname, đường dẫn tuyệt đối', 'Kbuild (<code>cah8hc@HC-C-005W7</code>), thông tin debug (<code>/home/…</code>)', '<code>hello.ko</code> của Bài 50 chứa <b>29</b> chuỗi <code>/home/cah8hc/…</code> — tự đếm bằng <code>strings ~/bai50/hello/hello.ko | grep -c /home/</code>'],
        ['<b>Công cụ</b> — phiên bản gcc, binutils, thư viện của host', 'Mọi thứ được biên dịch', 'Cùng kernel 6.18.45: Bài 40 ghi <code>Image</code> 41 089 536 byte (GCC 15.2), Bài 46 ghi 49 342 976 byte (GCC 9.4)']
      ] },

    { t: 'p', x:
      'Hai nguồn đầu tiên dễ bịt nhất và gây ra phần lớn khác biệt, nên bài này tập trung vào chúng. Nguồn thứ tư có lối ' +
      'thoát chuẩn (<code>KBUILD_BUILD_USER</code>, <code>KBUILD_BUILD_HOST</code>, cờ <code>-ffile-prefix-map</code> của ' +
      'gcc) mà bài chỉ nêu tên. Nguồn thứ năm là lý do lớn nhất khiến Buildroot <b>tự build toolchain</b> thay vì dùng gcc ' +
      'của máy bạn — Bài 60 sẽ thấy điều đó.' },

    { t: 'fig', cap: 'Mã nguồn và cấu hình là đầu vào bạn khai báo. Mọi thứ còn lại mà công cụ tự đọc từ môi trường — đồng hồ, múi giờ, inode, tên máy — là lỗ rò. Build tái lập nghĩa là bịt từng lỗ, hoặc thay nó bằng một giá trị cố định cũng được khai báo.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Đầu vào khai báo và các lỗ rò từ môi trường đi vào quá trình build">' +
        '<rect class="d-box-g" x="20" y="30" width="200" height="150" rx="8"/>' +
        '<text class="d-t" x="120" y="54" text-anchor="middle">Đầu vào khai báo</text>' +
        '<text class="d-tm" x="120" y="82" text-anchor="middle">busybox-1.38.0.tar.bz2</text>' +
        '<text class="d-tm" x="120" y="102" text-anchor="middle">sha256 34f9ea6f…</text>' +
        '<text class="d-tm" x="120" y="122" text-anchor="middle">busybox.config</text>' +
        '<text class="d-tm" x="120" y="142" text-anchor="middle">overlay/etc/…</text>' +
        '<text class="d-ts" x="120" y="166" text-anchor="middle">có trong Git, có checksum</text>' +
        '<rect class="d-box-p" x="280" y="80" width="160" height="60" rx="8"/>' +
        '<text class="d-t" x="360" y="106" text-anchor="middle">quá trình build</text>' +
        '<text class="d-ts" x="360" y="126" text-anchor="middle">make · gcc · cpio · gzip</text>' +
        '<path class="d-line" d="M220 105 H272"/><path class="d-arrow" d="M280 105 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="500" y="80" width="200" height="60" rx="8"/>' +
        '<text class="d-t" x="600" y="106" text-anchor="middle">rootfs.cpio.gz</text>' +
        '<text class="d-ts" x="600" y="126" text-anchor="middle">sha256 = ?</text>' +
        '<path class="d-line" d="M440 110 H492"/><path class="d-arrow" d="M500 110 l-8 -5 v10 z"/>' +
        '<rect class="d-box-w" x="170" y="210" width="110" height="64" rx="8"/>' +
        '<text class="d-t" x="225" y="236" text-anchor="middle">đồng hồ</text>' +
        '<text class="d-ts" x="225" y="256" text-anchor="middle">giờ build, mtime</text>' +
        '<rect class="d-box-w" x="300" y="210" width="110" height="64" rx="8"/>' +
        '<text class="d-t" x="355" y="236" text-anchor="middle">TZ, LC_ALL</text>' +
        '<text class="d-ts" x="355" y="256" text-anchor="middle">giờ địa phương</text>' +
        '<rect class="d-box-w" x="430" y="210" width="110" height="64" rx="8"/>' +
        '<text class="d-t" x="485" y="236" text-anchor="middle">hệ thống file</text>' +
        '<text class="d-ts" x="485" y="256" text-anchor="middle">inode, thứ tự</text>' +
        '<rect class="d-box-w" x="560" y="210" width="140" height="64" rx="8"/>' +
        '<text class="d-t" x="630" y="236" text-anchor="middle">máy build</text>' +
        '<text class="d-ts" x="630" y="256" text-anchor="middle">user, host, gcc</text>' +
        '<path class="d-line" d="M225 210 L330 148"/><path class="d-arrow" d="M336 144 l-9 1 l5 8 z"/>' +
        '<path class="d-line" d="M355 210 V150"/><path class="d-arrow" d="M355 142 l-5 8 h10 z"/>' +
        '<path class="d-line" d="M485 210 L396 148"/><path class="d-arrow" d="M390 144 l4 8 l5 -8 z"/>' +
        '<path class="d-line" d="M630 210 L436 136"/><path class="d-arrow" d="M428 133 l6 7 l3 -9 z"/>' +
        '<text class="d-ts" x="20" y="232">lỗ rò: công cụ</text>' +
        '<text class="d-ts" x="20" y="248">tự đọc, bạn không</text>' +
        '<text class="d-ts" x="20" y="264">khai báo</text>' +
        '</svg>' },

    { t: 'cal', kind: 'tip', title: 'Cách nhớ: hỏi "file này biết gì mà mã nguồn không biết?"',
      x: 'Mỗi khi thấy hai lần build khác nhau, hãy tìm trong sản phẩm một mẩu thông tin mà mã nguồn <b>không thể biết</b>: ' +
         'một giờ, một tên máy, một số inode, một đường dẫn <code>/home/…</code>. Đó là lỗ rò. Câu hỏi này đúng với ' +
         'BusyBox hôm nay, và với một firmware năm mươi package bạn sẽ gặp khi đi làm. Công cụ để tìm thì luôn là ba lệnh ' +
         'của bài này: <code>sha256sum</code> (khác hay không), <code>cmp -l</code> (khác ở byte nào), ' +
         '<code>strings</code> (byte đó mang nghĩa gì).' },

    /* ============================================================
       3. PHỤ THUỘC
       ============================================================ */
    { t: 'h2', x: 'Phụ thuộc: đổi một thứ thì làm lại những gì' },

    { t: 'p', x:
      'Bài toán thứ hai là thứ tự và phạm vi. Quy trình Chặng 09 thực chất là một <b>đồ thị</b>: mỗi sản phẩm được làm ra ' +
      'từ vài đầu vào, và bản thân nó lại là đầu vào của bước sau. Bài 16 đã dạy bạn <code>make</code> xử lý đúng loại đồ ' +
      'thị này cho các file <code>.o</code>; khác biệt duy nhất là ở đây mỗi nút là một bước lớn — giải nén, cấu hình, ' +
      'build, cài đặt, đóng gói.' },

    { t: 'fig', cap: 'Quy trình Chặng 09 vẽ thành đồ thị phụ thuộc. Mũi tên đọc là "được làm từ". Sửa một file trong overlay/ chỉ làm hỏng hai nút cuối (rootfs, cpio); sửa busybox.config làm hỏng bốn nút; đổi tarball làm hỏng tất cả. Một build system đúng chỉ làm lại những nút bị hỏng.',
      svg:
        '<svg viewBox="0 0 720 270" width="720" role="img" aria-label="Đồ thị phụ thuộc: tarball, cấu hình và overlay dẫn tới busybox, rootfs và cpio">' +
        '<rect class="d-box-g" x="20" y="20" width="160" height="44" rx="8"/>' +
        '<text class="d-tm" x="100" y="46" text-anchor="middle">dl/busybox….tar.bz2</text>' +
        '<rect class="d-box-g" x="20" y="110" width="160" height="44" rx="8"/>' +
        '<text class="d-tm" x="100" y="136" text-anchor="middle">busybox.config</text>' +
        '<rect class="d-box-g" x="20" y="200" width="160" height="44" rx="8"/>' +
        '<text class="d-tm" x="100" y="226" text-anchor="middle">overlay/etc/…</text>' +
        '<rect class="d-box" x="220" y="20" width="140" height="44" rx="8"/>' +
        '<text class="d-t" x="290" y="40" text-anchor="middle">giải nén</text>' +
        '<text class="d-tm" x="290" y="56" text-anchor="middle">.stamp_extracted</text>' +
        '<rect class="d-box" x="220" y="110" width="140" height="44" rx="8"/>' +
        '<text class="d-t" x="290" y="130" text-anchor="middle">chép cấu hình</text>' +
        '<text class="d-tm" x="290" y="146" text-anchor="middle">…/.config</text>' +
        '<rect class="d-box" x="400" y="110" width="120" height="44" rx="8"/>' +
        '<text class="d-t" x="460" y="130" text-anchor="middle">build</text>' +
        '<text class="d-tm" x="460" y="146" text-anchor="middle">…/busybox</text>' +
        '<rect class="d-box" x="400" y="200" width="120" height="44" rx="8"/>' +
        '<text class="d-t" x="460" y="220" text-anchor="middle">rootfs</text>' +
        '<text class="d-tm" x="460" y="236" text-anchor="middle">.stamp_rootfs</text>' +
        '<rect class="d-box-p" x="560" y="200" width="140" height="44" rx="8"/>' +
        '<text class="d-t" x="630" y="220" text-anchor="middle">đóng gói</text>' +
        '<text class="d-tm" x="630" y="236" text-anchor="middle">out/rootfs.cpio.gz</text>' +
        '<path class="d-line" d="M180 42 H212"/><path class="d-arrow" d="M220 42 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M290 64 V102"/><path class="d-arrow" d="M290 110 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M180 132 H212"/><path class="d-arrow" d="M220 132 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M360 132 H392"/><path class="d-arrow" d="M400 132 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M460 154 V192"/><path class="d-arrow" d="M460 200 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M180 222 H392"/><path class="d-arrow" d="M400 222 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M520 222 H552"/><path class="d-arrow" d="M560 222 l-8 -5 v10 z"/>' +
        '<text class="d-ts" x="540" y="40">xanh: đầu vào bạn</text>' +
        '<text class="d-ts" x="540" y="56">sửa được (trong Git)</text>' +
        '<text class="d-ts" x="540" y="80">xám: sản phẩm trung</text>' +
        '<text class="d-ts" x="540" y="96">gian (xoá được)</text>' +
        '</svg>' },

    { t: 'p', x:
      '<code>make</code> quyết định một nút có "hỏng" hay không bằng một quy tắc duy nhất (Bài 16): <b>đích cũ hơn bất kỳ ' +
      'điều kiện tiên quyết nào thì làm lại</b>. Quy tắc này đơn giản và nhanh, nhưng chỉ đúng nếu mọi đầu vào thật sự ' +
      'đều được khai báo là điều kiện tiên quyết. Quên khai một cái, và <code>make</code> sẽ tự tin báo ' +
      '<code>Nothing to be done</code> trong khi sản phẩm đã sai. <code>bt-27</code> đã cho bạn gặp một dạng của lỗi này ' +
      '(đổi <code>CROSS_COMPILE</code> mà không sửa file nào); bước 6 sẽ cho bạn gặp một dạng khác, ngay trong Makefile ' +
      'của chính bạn.' },

    { t: 'cal', kind: 'info', title: 'Stamp: cách biểu diễn một bước không sinh ra file duy nhất',
      x: 'Bước "giải nén" sinh ra <b>3 148</b> mục (<code>tar -tjf … | wc -l</code>); bước "cài vào rootfs" sinh ra 415 mục. Không có file nào đại diện được cho ' +
         'cả bước. Giải pháp chuẩn là <b>stamp</b>: khi bước chạy xong, <code>touch</code> một file rỗng như ' +
         '<code>build/.stamp_extracted</code>. <code>make</code> so thời gian của stamp này như một file thường. Xoá stamp ' +
         'là cách buộc một bước chạy lại. Makefile ở bước 5 dùng hai stamp; Buildroot dùng đúng cơ chế này, với một chuỗi ' +
         'stamp cho mỗi package (tải, giải nén, vá, cấu hình, build, cài).' },

    /* ============================================================
       4. BẢO TRÌ LÂU DÀI VÀ CÁC BUILD SYSTEM THẬT
       ============================================================ */
    { t: 'h2', x: 'Bảo trì lâu dài, và những gì Buildroot, Yocto làm thêm' },

    { t: 'p', x:
      'Bài toán thứ ba chỉ lộ ra theo thời gian. Một sản phẩm nhúng thường sống <b>5–15 năm</b>. Trong thời gian đó, ' +
      'server chứa tarball có thể biến mất, bản gcc trên máy build bị nâng cấp, người viết quy trình nghỉ việc. Một build ' +
      'system giải bài toán này bằng cách biến mọi thứ thành <b>văn bản có thể đưa vào Git</b>: phiên bản và checksum ' +
      'của từng nguồn, file cấu hình, bản vá, và chính quy trình build. Máy thì thay được; văn bản trong Git thì không mất.' },

    { t: 'p', x:
      'Makefile bạn sẽ viết ở bước 5 làm được phần cốt lõi của việc đó cho <b>một</b> package. Buildroot và Yocto làm ' +
      'cùng việc cho <b>hàng nghìn</b> package, cộng thêm những thứ mà một Makefile tay không kham nổi:' },

    { t: 'table',
      head: ['Việc', 'Makefile bước 5', 'Buildroot (Bài 60–61)', 'Yocto (Bài 62)'],
      rows: [
        ['Ghim phiên bản + checksum', '1 tarball, sha256 viết tay', 'File <code>.hash</code> cho mỗi package', '<code>SRC_URI</code> + <code>sha256sum</code> trong recipe'],
        ['Cấu hình', '<code>busybox.config</code> chép vào', 'Một <code>defconfig</code> duy nhất cho toàn hệ thống (Kconfig, như Bài 39)', 'Layer + <code>local.conf</code>'],
        ['Toolchain', 'gcc của Ubuntu (khác máy khác)', 'Tự build hoặc tải toolchain ghim phiên bản', 'Luôn tự build'],
        ['Phụ thuộc giữa package', 'Không có — chỉ một package', 'Khai trong <code>.mk</code>; build theo thứ tự', 'Khai trong recipe; bitbake lập lịch song song'],
        ['Bản vá', 'Không có', 'Thư mục <code>patches/</code> (Bài 61)', '<code>.patch</code> trong <code>SRC_URI</code>'],
        ['Tái lập từng byte', 'Có — cho sản phẩm này', 'Tuỳ chọn <code>BR2_REPRODUCIBLE</code>', 'Mặc định bật'],
        ['Biết đổi cấu hình thì build lại gì', 'Một phần — bước 6 cho thấy lỗ hổng', 'Không hoàn toàn: đổi cấu hình lớn thì khuyên <code>make clean</code>', 'Có: băm toàn bộ đầu vào của mỗi task']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao học Makefile tí hon trước khi học Buildroot',
      x: 'Buildroot có khoảng 3 000 package và vài chục nghìn dòng <code>make</code>. Mở nó ra lần đầu, bạn sẽ thấy ' +
         '<code>$(eval $(generic-package))</code> và không hiểu gì. Nhưng mỗi package trong đó làm đúng các bước bạn sắp ' +
         'viết tay: tải, kiểm tra hash, giải nén, cấu hình, build, cài vào thư mục đích — và đánh dấu mỗi bước bằng một ' +
         'stamp. Viết xong Makefile 47 dòng, bạn sẽ đọc Buildroot như đọc một phiên bản lớn hơn của code của chính mình.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: đo, bịt lỗ rò, rồi tự động hoá' },

    { t: 'p', x:
      'Mọi lệnh chạy trong WSL, thư mục làm việc là <code>~/bai59</code>. Bài dùng lại cây kernel ' +
      '<code>~/bai38/linux-6.18.45</code> (chỉ đọc, không build lại), tarball BusyBox của Bài 47, và các file cấu hình ' +
      'rootfs của Bài 48. Chỉ bước cuối boot QEMU. Mỗi <code>sha256</code> và mỗi giờ build trong bài là của máy soạn ' +
      'bài; bài sẽ nói rõ con số nào <b>phải</b> trùng với máy bạn và con số nào sẽ khác.' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Kiểm kê: những gì chỉ nằm trong đầu người build',
        blocks: [
          { t: 'p', x:
            'Bắt đầu bằng sản phẩm bạn đã có. <code>Image</code> trong <code>~/bai38</code> tự mang theo một dòng mô tả ' +
            'chính nó — dòng <code>Linux version</code> mà kernel in đầu tiên khi boot. Đọc nó trực tiếp từ file, không ' +
            'cần boot:' },

          { t: 'code', where: 'wsl', code:
            "strings ~/bai38/linux-6.18.45/arch/arm64/boot/Image | grep '^Linux version .*#'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'Linux version 6.18.45-embedded (cah8hc@HC-C-005W7) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) # SMP PREEMPT \n' +
            'Linux version 6.18.45-embedded (cah8hc@HC-C-005W7) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, GNU ld (GNU Binutils for Ubuntu) 2.34) #5 SMP PREEMPT Wed Sep 30 16:58:14 +07 2026' },

          { t: 'cmdx', cmd: "strings FILE | grep '^Linux version .*#'", rows: [
            ['strings', 'In mọi chuỗi ký tự in được dài từ 4 ký tự trở lên trong một file nhị phân (Bài 18)'],
            ["'^Linux version .*#'", 'Chỉ giữ dòng bắt đầu bằng <code>Linux version</code> và có dấu <code>#</code> — đúng mẫu của <code>linux_banner</code> trong <code>init/version-timestamp.c</code>']
          ] },

          { t: 'p', x:
            'Đọc dòng thứ hai từ trái sang phải và tự hỏi "mã nguồn có biết điều này không?". <code>6.18.45-embedded</code>: ' +
            'có, từ <code>Makefile</code> và <code>.config</code>. Nhưng <code>cah8hc@HC-C-005W7</code> là <b>tên user và tên ' +
            'máy</b> của người build; <code>gcc … 9.4.0</code> là <b>trình biên dịch của máy</b>; <code>#5</code> là ' +
            '<b>số lần relink</b> trong cây này (Bài 40 đã giải thích bộ đếm <code>.version</code>); và ' +
            '<code>Wed Sep 30 16:58:14 +07 2026</code> là <b>giờ build theo múi giờ địa phương</b>. Bốn trong năm mẩu ' +
            'thông tin là lỗ rò. Trên máy bạn cả bốn đều khác — user, máy, số lần build lại, giờ build — và đó chính là ' +
            'điểm bài học.' },

          { t: 'cal', kind: 'info', title: 'Vì sao có hai dòng, một dòng thiếu số và giờ',
            x: 'Kbuild biên dịch <code>init/version.c</code> <b>trước</b> khi biết số build cuối cùng, với một ' +
               '<code>utsversion-tmp.h</code> tạm; rồi biên dịch <code>init/version-timestamp.c</code> ở bước link cuối ' +
               'với số và giờ thật (<code>init/Makefile</code>, dòng 44–62). Dòng đầu là bản tạm, không bao giờ được in ' +
               'ra lúc boot. Chi tiết này cho thấy chính Kbuild cũng phải xoay xở để nhét một giá trị "thay đổi mỗi lần" ' +
               'vào một file nhị phân.' },

          { t: 'p', x:
            'Kbuild có sẵn cách bịt cả bốn lỗ: <code>KBUILD_BUILD_USER</code>, <code>KBUILD_BUILD_HOST</code>, ' +
            '<code>KBUILD_BUILD_VERSION</code>, <code>KBUILD_BUILD_TIMESTAMP</code>. Bạn có thể tự thấy chúng được đọc ở ' +
            'đâu:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            "grep -n 'KBUILD_BUILD_' scripts/mkcompile_h init/Makefile" },

          { t: 'code', where: 'out', nocopy: true, code:
            'scripts/mkcompile_h:8:if test -z "$KBUILD_BUILD_USER"; then\n' +
            'scripts/mkcompile_h:11:\tLINUX_COMPILE_BY=$KBUILD_BUILD_USER\n' +
            'scripts/mkcompile_h:13:if test -z "$KBUILD_BUILD_HOST"; then\n' +
            'scripts/mkcompile_h:16:\tLINUX_COMPILE_HOST=$KBUILD_BUILD_HOST\n' +
            'init/Makefile:32:build-version = $(or $(KBUILD_BUILD_VERSION), $(build-version-auto))\n' +
            'init/Makefile:33:build-timestamp = $(or $(KBUILD_BUILD_TIMESTAMP), $(build-timestamp-auto))' },

          { t: 'p', x:
            'Mẫu ở đây giống nhau ở cả bốn chỗ: <b>nếu biến được đặt thì dùng nó, không thì hỏi máy</b> ' +
            '(<code>whoami</code>, <code>uname -n</code>, <code>date</code>). Đó là cách chuẩn để một công cụ cho phép ' +
            'build tái lập mà không bắt buộc. Bài không build lại kernel để thử — mất 5 phút và thay <code>Image</code> ' +
            'mà các bài sau vẫn dùng — nhưng bước 3 sẽ dùng đúng mẫu này với BusyBox, nơi thử chỉ mất vài giây. ' +
            '<code>Documentation/kbuild/reproducible-builds.rst</code> trong cây kernel liệt kê đủ mọi biến; nếu muốn tự ' +
            'thử với kernel, hãy làm trong một thư mục <code>O=</code> riêng (Bài 41) để không đụng tới <code>Image</code> ' +
            'hiện có.' },

          { t: 'p', x:
            'Lỗ rò thứ hai lớn hơn nhiều: <b>cấu hình</b>. Qua Bài 57 và 58 bạn đã bật vài tuỳ chọn bằng tay. Hỏi chính ' +
            'Kconfig xem <code>.config</code> hiện tại khác <code>defconfig</code> ở đâu. <code>defconfig</code> sẽ ghi đè ' +
            '<code>.config</code>, nên cho nó ghi ra một file khác bằng <code>KCONFIG_CONFIG</code>:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai59\n' +
            'cd ~/bai38/linux-6.18.45\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 \\\n' +
            '     KCONFIG_CONFIG=$HOME/bai59/pristine.config defconfig\n' +
            'md5sum .config\n' +
            'scripts/diffconfig ~/bai59/pristine.config .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            "*** Default configuration is based on 'defconfig'\n" +
            '#\n' +
            '# configuration written to /home/cah8hc/bai59/pristine.config\n' +
            '#\n' +
            '1ebe385ae54674dd43034ea6006ad670  .config\n' +
            ' GPIO_SIM n -> m\n' +
            ' I2C_STUB n -> m\n' +
            ' LOCALVERSION "" -> "-embedded"\n' +
            '+DEV_SYNC_PROBE m\n' +
            '+IRQ_SIM y' },

          { t: 'cmdx', cmd: 'make … KCONFIG_CONFIG=$HOME/bai59/pristine.config defconfig', rows: [
            ['defconfig', 'Tạo cấu hình mặc định của <code>arch/arm64/configs/defconfig</code> (Bài 39)'],
            ['KCONFIG_CONFIG=…', 'Đổi tên file cấu hình mà Kconfig đọc và ghi. Mặc định là <code>.config</code>; ở đây là một file riêng, nên <code>.config</code> của cây <b>không bị chạm tới</b> — <code>md5sum</code> ngay sau đó để bạn tự đối chiếu'],
            ['$HOME', 'Phải là đường dẫn tuyệt đối: Kconfig chạy trong thư mục của cây, và <code>~</code> sau dấu <code>=</code> không phải lúc nào shell cũng bung ra'],
            ['scripts/diffconfig A B', 'Script Python có sẵn trong cây, in từng symbol khác nhau giữa hai file cấu hình: <code>X a -> b</code> là đổi giá trị, <code>+X</code> là chỉ có ở B, <code>-X</code> là chỉ có ở A']
          ] },

          { t: 'p', x:
            'Năm dòng, và bạn biết chính xác nguồn gốc từng dòng: <code>LOCALVERSION</code> từ Bài 40, ' +
            '<code>GPIO_SIM</code> kéo theo <code>IRQ_SIM</code> và <code>DEV_SYNC_PROBE</code> qua <code>select</code> ' +
            '(Bài 57), <code>I2C_STUB</code> từ Bài 58. Nhưng bạn biết vì bạn vừa học xong. Một người khác nhận cây này ' +
            'chỉ thấy một file 11 721 dòng, không có dấu vết nào của lý do. <code>md5sum</code> của bạn sẽ khác ' +
            '<code>1ebe385a…</code> nếu bạn từng bật thêm hay bỏ bớt tuỳ chọn nào — khi đó <code>diffconfig</code> cũng ' +
            'in nhiều hơn năm dòng, và đó chính là kiểm kê của riêng bạn.' },

          { t: 'cal', kind: 'why', title: 'Năm dòng này là "cấu hình sản phẩm" — và nó chưa nằm trong Git',
            x: 'Bạn đã có công cụ để lưu nó từ Bài 39: <code>make savedefconfig</code> thu <code>.config</code> 11 721 ' +
               'dòng về một <code>defconfig</code> tối giản mà ai cũng dựng lại được bằng <code>olddefconfig</code>. Cái ' +
               'thiếu là <b>thói quen</b>: đưa file đó vào Git và coi nó là đầu vào, không phải sản phẩm phụ. Buildroot ' +
               'biến thói quen này thành quy trình — một <code>defconfig</code> cho toàn bộ hệ thống, gồm cả đường dẫn ' +
               'tới <code>defconfig</code> của kernel. Bài 61 sẽ làm việc đó.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Build BusyBox hai lần, và đếm số byte khác nhau',
        blocks: [
          { t: 'p', x:
            'Giờ đến thí nghiệm chính. Cần một tarball BusyBox 1.38.0 đã kiểm tra checksum. Bài 47 đã tải nó về ' +
            '<code>~/bai47</code>; chép sang, rồi kiểm tra lại — một bản sao cũng phải được kiểm tra như một bản tải về:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai59/dl && cd ~/bai59\n' +
            'cp ~/bai47/busybox-1.38.0.tar.bz2 ~/bai47/busybox-1.38.0.tar.bz2.sha256 dl/\n' +
            '(cd dl && sha256sum -c busybox-1.38.0.tar.bz2.sha256)' },

          { t: 'code', where: 'out', nocopy: true, code:
            'busybox-1.38.0.tar.bz2: OK' },

          { t: 'p', x:
            '<code>OK</code> nghĩa là file trong <code>dl/</code> trùng từng byte với bản BusyBox phát hành — con số ' +
            '<code>34f9ea6f…</code> trong file <code>.sha256</code> giống nhau trên mọi máy trên thế giới. Nếu bạn đã xoá ' +
            '<code>~/bai47</code>, tải lại bằng hai lệnh <code>curl -fLO</code> ở bước 1 của Bài 47 (vào ' +
            '<code>~/bai59/dl</code>) rồi chạy cùng lệnh <code>sha256sum -c</code>.' },

          { t: 'p', x:
            'Bây giờ build <b>hai lần</b>, ở hai thư mục <code>one/</code> và <code>two/</code>, theo đúng công thức Bài 47: ' +
            'giải nén, <code>defconfig</code>, bật <code>CONFIG_STATIC</code> bằng <code>sed</code>, build chéo cho ARM64. ' +
            'Cùng tarball, cùng lệnh, cùng máy, cách nhau vài giây:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai59\n' +
            'for d in one two; do\n' +
            '  mkdir -p $d && tar -xjf dl/busybox-1.38.0.tar.bz2 -C $d\n' +
            '  make -C $d/busybox-1.38.0 defconfig > $d/defconfig.log 2>&1\n' +
            "  sed -i 's/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/' $d/busybox-1.38.0/.config\n" +
            '  make -C $d/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > $d/build.log 2>&1\n' +
            '  echo "$d: rc=$?"\n' +
            'done\n' +
            'ls -l one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox\n' +
            'sha256sum one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox' },

          { t: 'code', where: 'out', nocopy: true, code:
            'one: rc=0\n' +
            'two: rc=0\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 2094192 Sep 30 21:11 one/busybox-1.38.0/busybox\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 2094192 Sep 30 21:11 two/busybox-1.38.0/busybox\n' +
            'abf83eacae006b10e18a09defa2f1e2bb036070be7ee988139fe31d000468851  one/busybox-1.38.0/busybox\n' +
            '44f240623296e02550a514ea9f1eb899d0a1e6bcd9bd6634e61411369838a3b4  two/busybox-1.38.0/busybox' },

          { t: 'cmdx', cmd: 'make -C DIR CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > $d/build.log 2>&1', rows: [
            ['-C DIR', 'Chạy <code>make</code> như thể đã <code>cd</code> vào <code>DIR</code> (Bài 16). Vòng lặp nhờ vậy không phải <code>cd</code> qua lại'],
            ['CROSS_COMPILE=…', 'Tiền tố của toolchain chéo. BusyBox <b>không cần</b> <code>ARCH</code> — Bài 47 đã giải thích'],
            ['-j$(nproc)', 'Chạy song song bằng số CPU của máy'],
            ['> … 2>&amp;1', 'Dồn toàn bộ log vào file, để màn hình chỉ còn dòng <code>rc=</code>. <code>$?</code> ở dòng sau là mã thoát của chính lệnh <code>make</code> này']
          ] },

          { t: 'p', x:
            'Hai file có <b>cùng kích thước</b> — 2 094 192 byte, đúng con số Bài 47 đã đo — nhưng <b>hai sha256 khác hẳn ' +
            'nhau</b>. Kích thước bằng nhau loại trừ khả năng có đoạn code thêm hay bớt; sự khác biệt nằm ở vài byte bị ' +
            'thay giá trị. Cả hai hash trên máy bạn cũng sẽ khác hai hash ở đây, và khác nhau từng lần build — đó chính ' +
            'là vấn đề. Tìm xem khác ở đâu:' },

          { t: 'code', where: 'wsl', code:
            'cmp -l one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox | wc -l\n' +
            'cmp -l one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox | head -3\n' +
            'cmp -l one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox | tail -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '22\n' +
            '    417 371 120\n' +
            '    418 214 370\n' +
            '    419  56 321\n' +
            '    436  35  74\n' +
            '1864018  60  62\n' +
            '1864019  71  67' },

          { t: 'cmdx', cmd: 'cmp -l FILE1 FILE2', rows: [
            ['cmp', 'So hai file từng byte. Không có cờ, nó dừng ở byte khác đầu tiên'],
            ['-l', '<i>list</i>: in <b>mọi</b> byte khác, mỗi byte một dòng gồm ba cột — vị trí (đếm từ 1, hệ 10), giá trị trong file 1, giá trị trong file 2 (hai cột sau là hệ 8)'],
            ['| wc -l', 'Đếm số dòng = số byte khác nhau']
          ] },

          { t: 'p', x:
            'Chỉ <b>22</b> byte trên hơn hai triệu. Và chúng không rải rác: một cụm bắt đầu ở byte 417, kết thúc ở byte ' +
            '436 — tức <b>20</b> byte liền nhau — và <b>2</b> byte nữa ở tít 1864018–1864019. Hai vùng, hai nguyên nhân. ' +
            'Vị trí chính xác và giá trị byte trên máy bạn có thể lệch, nhưng số 22 và hình dạng "20 + 2" thì phải giống. ' +
            'Vùng thứ hai dễ đọc hơn — nó nằm giữa các chuỗi ký tự:' },

          { t: 'code', where: 'wsl', code:
            "strings one/busybox-1.38.0/busybox | grep '^BusyBox v'\n" +
            "strings two/busybox-1.38.0/busybox | grep '^BusyBox v'\n" +
            "grep -abo 'BusyBox v1.38.0 (' one/busybox-1.38.0/busybox" },

          { t: 'code', where: 'out', nocopy: true, code:
            'BusyBox v1.38.0 (2026-09-30 21:11:09 +07)\n' +
            'BusyBox v1.38.0 (2026-09-30 21:11:27 +07)\n' +
            '1863983:BusyBox v1.38.0 (' },

          { t: 'cmdx', cmd: "grep -abo 'BusyBox v1.38.0 (' FILE", rows: [
            ['-a', 'Coi file nhị phân như văn bản, thay vì chỉ in <code>Binary file matches</code>'],
            ['-b', 'In <b>vị trí byte</b> (đếm từ 0) của chỗ khớp'],
            ['-o', 'Chỉ in phần khớp, không in cả "dòng" — trong file nhị phân một "dòng" có thể dài hàng nghìn byte']
          ] },

          { t: 'p', x:
            'Thủ phạm thứ nhất: BusyBox ghi <b>giờ build</b> vào chuỗi phiên bản — chuỗi mà lệnh <code>busybox</code> in ' +
            'ra khi chạy không tham số. Hai lần build cách nhau 18 giây: <code>21:11:09</code> và <code>21:11:27</code>. ' +
            'Làm phép cộng: chuỗi bắt đầu ở byte 1863983 (đếm từ 0), tức byte 1863984 theo cách đếm từ 1 của ' +
            '<code>cmp</code>. <code>BusyBox v1.38.0 (2026-09-30 21:11:</code> dài 34 ký tự, nên hai chữ số giây ở vị trí ' +
            '1863984 + 34 = <b>1864018</b> và <b>1864019</b> — đúng hai byte <code>cmp</code> đã chỉ. Giá trị cũng khớp: ' +
            'hệ 8 <code>60</code>/<code>71</code> là ký tự <code>0</code>/<code>9</code>, còn <code>62</code>/<code>67</code> ' +
            'là <code>2</code>/<code>7</code>. Giờ build trên máy bạn tất nhiên là giờ bạn chạy lệnh.' },

          { t: 'p', x:
            'Vùng thứ nhất, byte 417–436, nằm gần đầu file — trong vùng header ELF. Bài 18 đã cho bạn đọc bảng section; ' +
            'hỏi xem section nào nằm ở đó:' },

          { t: 'code', where: 'wsl', code:
            'aarch64-linux-gnu-readelf -S -W one/busybox-1.38.0/busybox | grep build-id\n' +
            "aarch64-linux-gnu-readelf -n one/busybox-1.38.0/busybox | grep 'Build ID'\n" +
            "aarch64-linux-gnu-readelf -n two/busybox-1.38.0/busybox | grep 'Build ID'" },

          { t: 'code', where: 'out', nocopy: true, code:
            '  [ 1] .note.gnu.build-id NOTE            0000000000400190 000190 000024 00   A  0   0  4\n' +
            '    Build ID: f98c2e19291e4f2ab7a2ea156910284c8932311d\n' +
            '    Build ID: 50f8d1092d2ec786797c5d60fca86887db05603c' },

          { t: 'p', x:
            'Section <code>.note.gnu.build-id</code> bắt đầu ở offset <code>0x190</code> = 400 và dài <code>0x24</code> = ' +
            '36 byte: 16 byte đầu là header của note, 20 byte sau là giá trị. 400 + 16 = byte 416 đếm từ 0 = byte ' +
            '<b>417</b> đếm từ 1, cộng 20 byte là tới <b>436</b> — trùng khít cụm <code>cmp</code> đã chỉ. <code>readelf ' +
            '-n</code> in ra chính 20 byte đó dưới dạng 40 chữ số hex, và hai bản khác nhau hoàn toàn.' },

          { t: 'cal', kind: 'why', title: 'Build ID khác nhau không phải lỗ rò thứ hai — nó là hệ quả của lỗ rò thứ nhất',
            x: 'Build ID là <b>SHA-1 của chính nội dung file</b>, do trình liên kết tính ở bước cuối (Bài 18 đã dùng nó để ghép ' +
               'bản strip với bản debug). Nội dung khác hai byte giây, nên SHA-1 khác hẳn — 20 byte thay đổi vì 2 byte. Nói ' +
               'cách khác: cả 22 byte khác biệt đều quy về <b>một</b> nguyên nhân, cái đồng hồ. Bịt được đồng hồ thì Build ' +
               'ID tự trùng. Đây là bài học đáng nhớ nhất của bước này: đừng đếm số byte khác, hãy đếm số <b>nguyên nhân</b>.' },

          { t: 'p', x:
            'Còn một chỗ nữa mang giờ build — lần này không nằm trong file nhị phân mà ở file cấu hình:' },

          { t: 'code', where: 'wsl', code:
            'diff one/busybox-1.38.0/.config two/busybox-1.38.0/.config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '4c4\n' +
            '< # Wed Sep 30 21:11:09 2026\n' +
            '---\n' +
            '> # Wed Sep 30 21:11:27 2026' },

          { t: 'p', x:
            'Hai file <code>.config</code> 1 248 dòng chỉ khác đúng dòng 4, một dòng chú thích chứa giờ ' +
            '<code>defconfig</code> chạy. Cùng giây với chuỗi trong nhị phân: cả hai đến từ <b>một lần đọc đồng hồ</b> ' +
            'của Kconfig lúc sinh cấu hình. Đó là manh mối cho bước sau.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Bịt lỗ rò đồng hồ bằng SOURCE_DATE_EPOCH, rồi bắt lỗ rò múi giờ',
        blocks: [
          { t: 'p', x:
            'Chuỗi giờ trong nhị phân đến từ đâu trong mã nguồn? Hai lệnh <code>grep</code> trả lời:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai59\n' +
            "grep -n 'SOURCE_DATE_EPOCH\\|gmtime\\|localtime\\|ctime(&now)' one/busybox-1.38.0/scripts/kconfig/confdata.c\n" +
            "grep -n 'AUTOCONF_TIMESTAMP' one/busybox-1.38.0/libbb/messages.c" },

          { t: 'code', where: 'out', nocopy: true, code:
            '384:\tsource_date_epoch = getenv("SOURCE_DATE_EPOCH");\n' +
            '387:\t\tbuild_time = gmtime(&now);\n' +
            '390:\t\tbuild_time = localtime(&now);\n' +
            '404:\t\t     use_timestamp ? ctime(&now) : "");\n' +
            '11:#define BB_EXTRA_VERSION " ("AUTOCONF_TIMESTAMP")"' },

          { t: 'p', x:
            'Chuỗi phiên bản ghép từ <code>AUTOCONF_TIMESTAMP</code> (<code>messages.c:11</code>), macro mà Kconfig của ' +
            'BusyBox ghi vào <code>include/autoconf.h</code> lúc sinh cấu hình. Và Kconfig có sẵn lối thoát ở dòng 384: ' +
            'nếu biến môi trường <code>SOURCE_DATE_EPOCH</code> được đặt, nó dùng mốc đó (dòng 387) thay vì giờ hiện tại ' +
            '(dòng 390). Đúng mẫu "có biến thì dùng, không thì hỏi máy" bạn vừa thấy ở Kbuild.' },

          { t: 'p', x:
            'Chọn một mốc cố định — ở đây <code>1790000000</code> giây kể từ 1/1/1970 — rồi build lại cả hai. Vì giờ được ' +
            'ghi lúc <b>sinh cấu hình</b>, phải chạy lại từ <code>distclean</code> + <code>defconfig</code>; chỉ ' +
            '<code>make</code> lại là không đủ (xem callout cuối bước):' },

          { t: 'code', where: 'wsl', code:
            'export SOURCE_DATE_EPOCH=1790000000\n' +
            'date -d @$SOURCE_DATE_EPOCH\n' +
            'for d in one two; do\n' +
            '  make -C $d/busybox-1.38.0 distclean > /dev/null\n' +
            '  make -C $d/busybox-1.38.0 defconfig > $d/defconfig.log 2>&1\n' +
            "  sed -i 's/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/' $d/busybox-1.38.0/.config\n" +
            '  make -C $d/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > $d/build.log 2>&1\n' +
            '  echo "$d: rc=$?"\n' +
            'done\n' +
            'sha256sum one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox\n' +
            "strings one/busybox-1.38.0/busybox | grep '^BusyBox v'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'Mon 21 Sep 2026 09:13:20 PM +07\n' +
            'one: rc=0\n' +
            'two: rc=0\n' +
            'da8788111f8488f2805413cd30ace62be552808ffb99dd86ede2b2f667685c36  one/busybox-1.38.0/busybox\n' +
            'da8788111f8488f2805413cd30ace62be552808ffb99dd86ede2b2f667685c36  two/busybox-1.38.0/busybox' +
            '\nBusyBox v1.38.0 (2026-09-21 21:13:20 +07)' },

          { t: 'cmdx', cmd: 'export SOURCE_DATE_EPOCH=1790000000', rows: [
            ['export', 'Đặt biến và đưa nó vào môi trường của mọi tiến trình con — <code>make</code>, rồi Kconfig bên trong <code>make</code> (Bài 13)'],
            ['SOURCE_DATE_EPOCH', 'Tên chuẩn do dự án reproducible-builds.org đặt năm 2015. gcc, Kconfig của BusyBox, dpkg, Sphinx… đều đọc đúng tên này'],
            ['1790000000', 'Số giây kể từ 1970-01-01 00:00:00 UTC. Trong dự án thật, người ta thường dùng giờ của commit Git cuối cùng (<code>git log -1 --format=%ct</code>) — cố định cho mỗi commit, và vẫn có ý nghĩa']
          ] },

          { t: 'p', x:
            '<b>Hai sha256 trùng nhau.</b> Hai lần build ở hai thư mục giờ ra cùng một file, và chuỗi phiên bản mang ngày ' +
            '21/9/2026 — mốc bạn chọn, không phải hôm nay. Build ID cũng tự trùng mà không cần làm gì thêm, đúng như callout ' +
            'bước 2 dự đoán.' },

          { t: 'p', x:
            'Nhưng khoan: <code>21:13:20 +07</code>. Mốc 1790000000 là một thời điểm duy nhất trên toàn thế giới, còn ' +
            '<code>+07</code> là múi giờ của máy soạn bài (Việt Nam). Một đồng nghiệp ở Đức build cùng lệnh sẽ thấy gì? ' +
            'Giả lập bằng cách đổi <code>TZ</code> cho lần build thứ hai… hoặc đơn giản hơn, đặt <code>TZ=UTC</code> và ' +
            'build lại cả hai:' },

          { t: 'code', where: 'wsl', code:
            'export TZ=UTC\n' +
            'for d in one two; do\n' +
            '  make -C $d/busybox-1.38.0 distclean > /dev/null\n' +
            '  make -C $d/busybox-1.38.0 defconfig > $d/defconfig.log 2>&1\n' +
            "  sed -i 's/^# CONFIG_STATIC is not set$/CONFIG_STATIC=y/' $d/busybox-1.38.0/.config\n" +
            '  make -C $d/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > $d/build.log 2>&1\n' +
            '  echo "$d: rc=$?"\n' +
            'done\n' +
            'sha256sum one/busybox-1.38.0/busybox two/busybox-1.38.0/busybox\n' +
            "strings one/busybox-1.38.0/busybox | grep '^BusyBox v'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'one: rc=0\n' +
            'two: rc=0\n' +
            'b961397085f848df489cb1086400b575651e8cacc859316583c6df857e94ebc5  one/busybox-1.38.0/busybox\n' +
            'b961397085f848df489cb1086400b575651e8cacc859316583c6df857e94ebc5  two/busybox-1.38.0/busybox\n' +
            'BusyBox v1.38.0 (2026-09-21 14:13:20 UTC)' },

          { t: 'p', x:
            'Hash <b>đổi</b> — từ <code>da878811…</code> sang <code>b9613970…</code> — dù mã nguồn, cấu hình và ' +
            '<code>SOURCE_DATE_EPOCH</code> y hệt. Chuỗi giờ giờ là <code>14:13:20 UTC</code>: cùng một thời điểm, viết theo ' +
            'múi giờ khác. Vậy <code>SOURCE_DATE_EPOCH</code> một mình là <b>chưa đủ</b>: build trên máy đặt múi giờ ' +
            'khác sẽ ra file khác.' },

          { t: 'cal', kind: 'warn', title: 'Vì sao TZ vẫn lọt vào, dù dòng 387 dùng gmtime()',
            x: '<code>gmtime()</code> luôn trả giờ UTC, nên theo lý thuyết <code>TZ</code> không thể ảnh hưởng. Nhưng nhìn ' +
               'dòng 404: <code>ctime(&amp;now)</code> được gọi <b>sau</b> <code>gmtime()</code> để in dòng chú thích vào ' +
               '<code>.config</code>. Theo chuẩn C, <code>gmtime()</code>, <code>localtime()</code> và <code>ctime()</code> ' +
               'dùng chung <b>một</b> <code>struct tm</code> tĩnh — và <code>ctime()</code> tính giờ <i>địa phương</i>, ghi đè ' +
               'kết quả của <code>gmtime()</code>. Khi <code>strftime()</code> đọc <code>build_time</code> để viết ' +
               '<code>AUTOCONF_TIMESTAMP</code>, nó đọc giờ địa phương. Một lỗi nhỏ trong công cụ, và bạn chỉ phát hiện được ' +
               'vì đã <b>đo</b> chứ không tin tài liệu. Cách phòng thủ chuẩn: build system đặt <code>TZ=UTC</code> và ' +
               '<code>LC_ALL=C</code> cho mọi bước, không cần biết công cụ nào có lỗi. Makefile ở bước 5 làm đúng như vậy.' },

          { t: 'p', x:
            'Hash <code>b9613970…</code> là con số <b>phải trùng</b> trên máy bạn — nếu bạn dùng cùng BusyBox 1.38.0, cùng ' +
            'gcc 9.4 của Ubuntu 20.04, cùng mốc và <code>TZ=UTC</code>. Nếu máy bạn dùng gcc khác (ví dụ Ubuntu 26.04 có ' +
            'gcc 15), hash sẽ khác vì <b>công cụ</b> khác — lỗ rò thứ năm trong bảng ở phần lý thuyết — nhưng hai lần build ' +
            'trên máy bạn vẫn phải trùng nhau. Đó mới là điều cần kiểm tra.' },

          { t: 'cal', kind: 'warn', title: 'Chỉ export biến rồi make lại là không đủ',
            x: 'Nếu bạn đặt <code>SOURCE_DATE_EPOCH</code> rồi chạy <code>make</code> trong cây đã build, <code>make</code> ' +
               'thấy mọi file <code>.o</code> mới hơn nguồn và báo xong ngay — chuỗi giờ cũ vẫn nằm nguyên trong ' +
               '<code>autoconf.h</code> và trong nhị phân. Người soạn bài đã thử: hash không đổi, chuỗi vẫn là giờ build ' +
               'đầu tiên. Biến môi trường <b>không phải là điều kiện tiên quyết</b> trong mắt <code>make</code>, nên đổi nó ' +
               'không làm hỏng đích nào. Đây là phiên bản đầu tiên của lỗi "phụ thuộc bị khai thiếu", và bước 6 sẽ gặp lại ' +
               'nó dưới một dạng khác.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Đóng gói: cpio và gzip cũng rò',
        blocks: [
          { t: 'p', x:
            'BusyBox giờ đã tất định. Bước tiếp theo của quy trình Chặng 09 là cài nó vào một cây rootfs rồi đóng gói ' +
            '<code>cpio</code>. Bài 32 và 48 đã nhận xét rằng file <code>.cpio.gz</code> "lệch vài byte mỗi lần"; giờ là ' +
            'lúc đo chính xác vì sao. Vẫn trong cùng terminal (hai biến <code>SOURCE_DATE_EPOCH</code> và <code>TZ</code> ' +
            'của bước 3 vẫn còn), cài BusyBox vào <code>pack/a</code>, rồi tạo một bản sao y hệt <code>pack/b</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai59\n' +
            'make -C one/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- \\\n' +
            '     CONFIG_PREFIX=$HOME/bai59/pack/a install > pack-install.log 2>&1; echo "rc=$?"\n' +
            'cp -a pack/a pack/b\n' +
            'find pack/a | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '415' },

          { t: 'p', x:
            '<code>make install</code> của Bài 47, lần này với <code>CONFIG_PREFIX</code> trỏ vào thư mục riêng. ' +
            '<b>415</b> mục = thư mục gốc <code>.</code> + 5 thư mục (<code>bin sbin usr usr/bin usr/sbin</code>) + 1 ' +
            'file <code>bin/busybox</code> + <b>408</b> symlink (tính cả <code>linuxrc</code>) — đúng "1 file + 408 ' +
            'symlink" Bài 47 đã đếm. ' +
            '<code>cp -a</code> giữ nguyên quyền, chủ sở hữu, thời gian sửa và symlink: về mặt nội dung, <code>a</code> và ' +
            '<code>b</code> không thể phân biệt. Đóng gói cả hai theo cách của Bài 48:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai59/pack\n' +
            '( cd a && find . | cpio -o -H newc --quiet ) > a.cpio\n' +
            '( cd b && find . | cpio -o -H newc --quiet ) > b.cpio\n' +
            'ls -l a.cpio b.cpio\n' +
            'cmp a.cpio b.cpio\n' +
            'cmp -l a.cpio b.cpio | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 2152960 Sep 30 14:13 a.cpio\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 2152960 Sep 30 14:13 b.cpio\n' +
            'a.cpio b.cpio differ: byte 12, line 1\n' +
            '1245' },

          { t: 'cmdx', cmd: 'find . | cpio -o -H newc --quiet', rows: [
            ['find .', 'Liệt kê mọi mục trong cây, mỗi dòng một đường dẫn tương đối — thứ tự là thứ tự <code>find</code> đọc thư mục trên đĩa'],
            ['cpio -o', '<i>copy-out</i>: đọc danh sách tên từ stdin, ghi một kho lưu trữ ra stdout'],
            ['-H newc', 'Định dạng <code>newc</code> — định dạng duy nhất kernel đọc được cho initramfs (Bài 48 viết là <code>--format=newc</code>, cùng nghĩa)'],
            ['--quiet', 'Không in dòng <code>N blocks</code> ra stderr']
          ] },

          { t: 'p', x:
            'Hai kho cùng kích thước <b>2 152 960</b> byte nhưng khác nhau <b>1 245</b> byte, và byte khác đầu tiên đã ở ' +
            'vị trí thứ 12 — ngay trong header của mục đầu tiên. (Giờ trong <code>ls -l</code> hiện theo UTC vì ' +
            '<code>TZ=UTC</code> vẫn còn từ bước 3.) Xem hai header đó:' },

          { t: 'code', where: 'wsl', code:
            "stat -c '%i %n' a b\n" +
            'head -c 22 a.cpio; echo\n' +
            'head -c 22 b.cpio; echo' },

          { t: 'code', where: 'out', nocopy: true, code:
            '417817 a\n' +
            '418234 b\n' +
            '07070100066019000041ED\n' +
            '070701000661BA000041ED' },

          { t: 'p', x:
            'Header <code>newc</code> là văn bản ASCII: 6 ký tự <code>070701</code> (magic, Bài 48), rồi các trường 8 chữ ' +
            'số hex. Trường đầu tiên là <b>số inode</b>: <code>00066019</code> = 417817, <code>000661BA</code> = 418234 — ' +
            'đúng hai số <code>stat</code> vừa in cho thư mục <code>a</code> và <code>b</code>. Inode là số hệ thống file ' +
            'cấp cho mỗi file khi nó được tạo (Bài 6); <code>cp -a</code> tạo file mới nên nhận inode mới. Số inode trên ' +
            'máy bạn chắc chắn khác. Mỗi mục trong 415 mục có một header, và mỗi header chứa inode, UID, GID của người đóng ' +
            'gói, thời gian sửa — 1 245 byte khác biệt là tổng của những trường đó.' },

          { t: 'p', x:
            'Lớp nén cũng rò. Nén cùng một <code>a.cpio</code> hai lần, cách nhau một giây:' },

          { t: 'code', where: 'wsl', code:
            'gzip -9 -k a.cpio; sleep 1; cp a.cpio a2.cpio; gzip -9 a2.cpio\n' +
            'cmp a.cpio.gz a2.cpio.gz\n' +
            'od -A d -t x1 -N 10 a.cpio.gz\n' +
            'od -A d -t x1 -N 10 a2.cpio.gz\n' +
            'rm -f a.cpio b.cpio a.cpio.gz a2.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'a.cpio.gz a2.cpio.gz differ: byte 5, line 1\n' +
            '0000000 1f 8b 08 08 04 19 bd 6a 02 03\n' +
            '0000010\n' +
            '0000000 1f 8b 08 08 05 19 bd 6a 02 03\n' +
            '0000010' },

          { t: 'cmdx', cmd: 'od -A d -t x1 -N 10 FILE', rows: [
            ['od', '<i>octal dump</i>: in nội dung nhị phân của file'],
            ['-A d', 'Cột địa chỉ bên trái viết hệ 10'],
            ['-t x1', 'Mỗi byte in thành 2 chữ số hex'],
            ['-N 10', 'Chỉ đọc 10 byte đầu — đúng kích thước header cố định của gzip']
          ] },

          { t: 'p', x:
            'Mười byte header của gzip: <code>1f 8b</code> là magic (Bài 48), <code>08</code> là thuật toán deflate, ' +
            '<code>08</code> tiếp theo là cờ "có lưu tên file". Bốn byte sau là <b>thời gian sửa của file gốc</b>, viết ' +
            'ngược (little-endian): <code>6abd1904</code> và <code>6abd1905</code> — cách nhau đúng 1 giây, bằng ' +
            '<code>sleep 1</code>. Hai giá trị cụ thể trên máy bạn sẽ khác, nhưng chúng sẽ cách nhau 1. Và vì có cờ ' +
            '"lưu tên", <code>gzip</code> còn ghi tên <code>a.cpio</code> hay <code>a2.cpio</code> vào ngay sau header.' },

          { t: 'p', x:
            'Bốn lỗ rò, bốn cách bịt: <b>cố định thời gian sửa</b> của mọi file bằng <code>touch -d @$SOURCE_DATE_EPOCH</code>; ' +
            '<b>sắp xếp</b> danh sách file thay vì tin thứ tự của đĩa; bảo <code>cpio</code> đánh lại số inode ' +
            '(<code>--reproducible</code>) và ghi chủ sở hữu là root (<code>--owner=0:0</code>); bảo <code>gzip</code> ' +
            'không ghi tên và giờ (<code>-n</code>). Áp dụng cho cả hai cây:' },

          { t: 'code', where: 'wsl', code:
            'for t in a b; do\n' +
            '  find $t -exec touch -h -d @$SOURCE_DATE_EPOCH {} +\n' +
            '  ( cd $t && find . | LC_ALL=C sort | cpio -o -H newc --quiet --reproducible --owner=0:0 ) | gzip -9 -n > $t.cpio.gz\n' +
            'done\n' +
            'ls -l a.cpio.gz b.cpio.gz\n' +
            'sha256sum a.cpio.gz b.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rw-r--r-- 1 cah8hc cah8hc 1185944 Sep 30 14:13 a.cpio.gz\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 1185944 Sep 30 14:13 b.cpio.gz\n' +
            '6e7e026fb45588ff72a6ddaef7e386313cf6ea7b68609e7263a893f944d5d31b  a.cpio.gz\n' +
            '6e7e026fb45588ff72a6ddaef7e386313cf6ea7b68609e7263a893f944d5d31b  b.cpio.gz' },

          { t: 'cmdx', cmd: 'find $t -exec touch -h -d @$SOURCE_DATE_EPOCH {} +', rows: [
            ['find $t -exec … {} +', 'Chạy lệnh cho mọi mục trong cây; <code>+</code> gom nhiều tên vào một lần gọi thay vì một lần mỗi file (Bài 11)'],
            ['touch -d @N', 'Đặt thời gian sửa thành mốc Unix <code>N</code>. <code>@</code> nghĩa là "số giây kể từ 1970"'],
            ['-h', 'Với symlink, đổi thời gian của <b>chính symlink</b> chứ không phải file nó trỏ tới. Thiếu <code>-h</code>, 408 symlink vẫn giữ giờ tạo và kho vẫn khác']
          ] },

          { t: 'cmdx', cmd: 'find . | LC_ALL=C sort | cpio -o -H newc --quiet --reproducible --owner=0:0 | gzip -9 -n', rows: [
            ['LC_ALL=C sort', 'Sắp xếp danh sách tên theo giá trị byte. <code>LC_ALL=C</code> bắt buộc: với ngôn ngữ khác, <code>sort</code> có thể xếp chữ hoa, chữ thường, dấu gạch theo quy tắc riêng của ngôn ngữ đó'],
            ['--reproducible', 'Viết tắt của <code>--ignore-devno --renumber-inodes</code>: không ghi số thiết bị, và đánh lại inode từ 0 theo thứ tự trong kho'],
            ['--owner=0:0', 'Ghi UID và GID của mọi mục là 0 (root), bất kể ai đóng gói. Trên thiết bị, file hệ thống vốn phải thuộc root'],
            ['gzip -n', '<i>no-name</i>: không lưu tên file gốc và thời gian sửa vào header. Khi đọc từ pipe, <code>gzip</code> vốn không có tên, nhưng <code>-n</code> làm điều đó rõ ràng và đúng trong mọi trường hợp']
          ] },

          { t: 'p', x:
            'Hai kho giờ trùng nhau: cùng <b>1 185 944</b> byte, cùng sha256 <code>6e7e026f…</code>. Nếu máy bạn có cùng ' +
            'gcc 9.4 và bạn đã build BusyBox với <code>TZ=UTC</code> ở bước 3, hash này sẽ trùng cả với máy soạn bài. Nhìn ' +
            'vào bên trong để thấy mỗi cờ đã làm gì:' },

          { t: 'code', where: 'wsl', code:
            'zcat a.cpio.gz | head -c 110; echo\n' +
            'zcat a.cpio.gz | cpio -t -v --quiet | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '07070100000000000041ED0000000000000000000000056AB13B8000000000000000000000000000000000000000000000000200000000\n' +
            'drwxr-xr-x   5 root     root            0 Sep 21 14:13 .\n' +
            'drwxr-xr-x   2 root     root            0 Sep 21 14:13 bin\n' +
            'lrwxrwxrwx   1 root     root            7 Sep 21 14:13 bin/arch -> busybox' },

          { t: 'p', x:
            'Đọc header mới theo từng trường 8 chữ số: inode <code>00000000</code> (đánh lại từ 0), mode ' +
            '<code>000041ED</code> (thư mục, quyền 755), UID <code>00000000</code>, GID <code>00000000</code>, số liên kết ' +
            '<code>00000005</code>, thời gian sửa <code>6AB13B80</code> = 1790000000. <code>cpio -t -v</code> liệt kê lại: ' +
            'chủ <code>root root</code>, ngày <code>Sep 21 14:13</code> — mốc bạn chọn — và thứ tự đã là thứ tự bảng chữ ' +
            'cái: <code>.</code>, <code>bin</code>, <code>bin/arch</code>. Không còn trường nào mang thông tin về máy đóng ' +
            'gói. Cả hai lệnh này đều phải cho đúng kết quả trên với máy bạn.' },

          { t: 'p', x:
            'Có cần cả bốn biện pháp không? Thử bỏ từng cái một, trên bốn cây: <code>a</code>, <code>b</code>, một bản sao ' +
            '<code>c</code> đặt trên <b>tmpfs</b> (một loại hệ thống file khác, Bài 48), và một bản sao <code>d</code> mà ' +
            'chỉ thư mục <code>bin</code> bị <code>touch</code> sang giờ hiện tại. Hàm <code>pk</code> đóng gói một cây với ' +
            'bộ lọc danh sách và các cờ <code>cpio</code> cho trước, rồi in 8 chữ số đầu của sha256:' },

          { t: 'code', where: 'wsl', code:
            'export LC_ALL=C\n' +
            'cp -a a /dev/shm/c\n' +
            'cp -a a /dev/shm/d && touch /dev/shm/d/bin\n' +
            "pk() { d=$1; f=$2; shift 2; ( cd \"$d\" && find . | $f | cpio -o -H newc --quiet \"$@\" ) | gzip -9 -n | sha256sum | cut -c1-8; }\n" +
            'echo "dir          all      no-sort  no-repro no-owner"\n' +
            'for d in a b /dev/shm/c /dev/shm/d; do\n' +
            "  printf '%-12s %s %s %s %s\\n' $d \\\n" +
            '    $(pk $d sort --reproducible --owner=0:0) $(pk $d cat --reproducible --owner=0:0) \\\n' +
            '    $(pk $d sort --owner=0:0) $(pk $d sort --reproducible)\n' +
            'done\n' +
            "( cd a && find . | head -4 | tr '\\n' ' ' ); echo\n" +
            "( cd /dev/shm/c && find . | head -4 | tr '\\n' ' ' ); echo\n" +
            'rm -rf /dev/shm/c /dev/shm/d' },

          { t: 'code', where: 'out', nocopy: true, code:
            'dir          all      no-sort  no-repro no-owner\n' +
            'a            6e7e026f ebd6895f 61ba7bd9 fe4ca15f\n' +
            'b            6e7e026f ebd6895f 71702b85 fe4ca15f\n' +
            '/dev/shm/c   6e7e026f 83d44906 bb6b3733 fe4ca15f\n' +
            '/dev/shm/d   c2b2e489 9e5e6bae 323cccb2 547aa9f1\n' +
            '. ./usr ./usr/sbin ./usr/sbin/readprofile \n' +
            '. ./usr ./usr/sbin ./usr/sbin/udhcpd ',
            notes: [
              '<code>/dev/shm</code> là một tmpfs có sẵn trên Ubuntu, ai cũng ghi được. Hàng <code>/dev/shm/d</code> và cột <code>no-repro</code> của <code>/dev/shm/c</code> đổi mỗi lần chạy (giờ <code>touch</code> và inode mới); các ô còn lại lặp lại được.'
            ] },

          { t: 'table',
            head: ['Cột', 'Kết quả', 'Kết luận'],
            rows: [
              ['<b>all</b> — đủ bốn biện pháp', '<code>a</code>, <code>b</code>, <code>c</code> cùng <code>6e7e026f</code>; <code>d</code> khác', 'Tất định trên mọi bản sao, mọi hệ thống file. <code>d</code> khác là <b>đúng</b>: thời gian sửa của <code>bin</code> thật sự khác, đó là một thay đổi nội dung — Makefile sẽ <code>touch</code> lại mọi file trước khi đóng gói để xoá nó'],
              ['<b>no-sort</b>', '<code>a</code> = <code>b</code> nhưng <code>c</code> khác', 'Trên cùng ext4, hai bản sao tình cờ được <code>find</code> đọc theo cùng thứ tự; trên tmpfs thì không — hai dòng cuối cho thấy sau <code>./usr/sbin</code>, ext4 gặp <code>readprofile</code> còn tmpfs gặp <code>udhcpd</code>. Lỗ rò này <b>chỉ lộ khi đổi máy hoặc đổi hệ thống file</b> — đúng loại lỗi thoát được mọi kiểm tra trên máy bạn'],
              ['<b>no-repro</b>', 'Bốn hàng, bốn hash', 'Số inode là của riêng từng hệ thống file. Không đánh lại thì không hai bản sao nào trùng'],
              ['<b>no-owner</b>', '<code>a</code> = <code>b</code> = <code>c</code>, nhưng khác cột <b>all</b>', 'Trên cùng máy trông như ổn, vì cùng user. Kho đang ghi UID <b>1000</b> của bạn; một đồng nghiệp có UID khác sẽ ra hash khác — và trên thiết bị, <code>/bin/busybox</code> sẽ thuộc về một user không tồn tại']
            ] },

          { t: 'cal', kind: 'tip', title: 'Hai cột nguy hiểm nhất là hai cột trông như đã ổn',
            x: 'Cột <b>no-sort</b> và <b>no-owner</b> cho hash giống nhau giữa <code>a</code> và <code>b</code>. Nếu bạn chỉ ' +
               'kiểm tra "build hai lần trên máy mình", bạn sẽ kết luận chúng thừa. Chúng chỉ lộ khi <b>người khác</b>, trên ' +
               '<b>máy khác</b>, build lại. Vì vậy các dự án tái lập nghiêm túc (Debian, Yocto) kiểm tra bằng cách build hai ' +
               'lần trong hai môi trường cố tình khác nhau: khác user, khác múi giờ, khác hệ thống file, khác thư mục.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Một build system tí hon: Makefile 47 dòng',
        blocks: [
          { t: 'p', x:
            'Giờ bạn có đủ mảnh để viết lại quy trình Chặng 09 thành một công thức mà máy chạy được. Mở một terminal ' +
            '<b>mới</b> (để các biến <code>export</code> của bước 3–4 không còn — Makefile phải tự lo, không được dựa vào ' +
            'môi trường của bạn). Tạo thư mục dự án với ba loại đầu vào: tarball đã có checksum, cấu hình BusyBox, và ' +
            'một <b>overlay</b> — cây file sẽ chép đè lên rootfs.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai59/mini/dl ~/bai59/mini/overlay/etc/init.d && cd ~/bai59/mini\n' +
            'cp ~/bai59/dl/busybox-1.38.0.tar.bz2 dl/\n' +
            'cp ~/bai59/one/busybox-1.38.0/.config busybox.config' },

          { t: 'p', x:
            '<code>busybox.config</code> là file <code>.config</code> 1 248 dòng của bước 3, đã có <code>CONFIG_STATIC=y</code>. ' +
            'Từ giờ nó là <b>đầu vào</b>, sống trong thư mục dự án, không phải thứ sinh ra rồi vứt. Tiếp theo là overlay: ' +
            'đúng năm file <code>/etc</code> Bài 47 viết và Bài 48 sửa (thêm dòng <code>devtmpfs</code> vào ' +
            '<code>fstab</code>). Nếu bạn còn <code>~/bai48/initramfs/etc</code>, có thể <code>cp -a</code> nó sang; các ' +
            'lệnh dưới đây tạo lại từ đầu để thư mục dự án tự đủ:' },

          { t: 'code', where: 'wsl', code:
            "cat > overlay/etc/fstab <<'EOF'\n" +
            '# <file system> <mount point> <type>   <options> <dump> <pass>\n' +
            'devtmpfs        /dev          devtmpfs defaults  0      0\n' +
            'proc            /proc         proc     defaults  0      0\n' +
            'sysfs           /sys          sysfs    defaults  0      0\n' +
            'tmpfs           /tmp          tmpfs    defaults  0      0\n' +
            'EOF\n' +
            "cat > overlay/etc/inittab <<'EOF'\n" +
            '# /etc/inittab for BusyBox init.  Format: <tty>:<runlevels>:<action>:<process>\n' +
            '::sysinit:/etc/init.d/rcS\n' +
            'ttyAMA0::respawn:-/bin/sh\n' +
            '::ctrlaltdel:/sbin/reboot\n' +
            '::shutdown:/bin/umount -a -r\n' +
            'EOF\n' +
            "cat > overlay/etc/init.d/rcS <<'EOF'\n" +
            '#!/bin/sh\n' +
            '# Run once by init at boot, before any shell is started.\n' +
            'echo "rcS: mounting filesystems from /etc/fstab"\n' +
            'mount -a\n' +
            'mount -o remount,rw /\n' +
            'hostname -F /etc/hostname\n' +
            'echo "rcS: done at $(cut -d \' \' -f 1 /proc/uptime) s, hostname is $(hostname)"\n' +
            'EOF\n' +
            'chmod +x overlay/etc/init.d/rcS\n' +
            "echo 'root:x:0:0:root:/root:/bin/sh' > overlay/etc/passwd\n" +
            "echo 'root:x:0:' > overlay/etc/group\n" +
            "echo 'embedded' > overlay/etc/hostname",
            notes: [
              '<code>&lt;&lt;\'EOF\'</code> có dấu nháy để shell <b>không</b> bung <code>$(…)</code> trong <code>rcS</code> lúc tạo file — hai lệnh <code>cut</code> và <code>hostname</code> phải chạy lúc boot, trong QEMU, chứ không phải bây giờ trong WSL. Nội dung năm file này đã được giải thích từng dòng ở Bài 47.'
            ] },

          { t: 'p', x:
            'Cuối cùng là Makefile. Tạo <code>~/bai59/mini/Makefile</code> với nội dung dưới đây. Mỗi dòng lệnh bên dưới ' +
            'một đích phải bắt đầu bằng <b>một ký tự Tab</b>, không phải dấu cách (Bài 16); nếu bạn dán từ trình duyệt ' +
            'và trình soạn thảo đổi Tab thành dấu cách, <code>make</code> sẽ báo lỗi ở dòng đầu tiên bị đổi — bảng Lỗi ' +
            'thường gặp có thông báo chính xác.' },

          { t: 'code', where: 'file', name: '~/bai59/mini/Makefile', lang: 'makefile', code:
            '# Rebuild BusyBox and an initramfs from pinned inputs.  Usage: make\n' +
            'BB_VER    := 1.38.0\n' +
            'BB_SHA256 := 34f9ea6ff8636f2c9241153b9114eefa9e65674a45318ae1ef95bb5f31c53bb2\n' +
            'BB_TAR    := dl/busybox-$(BB_VER).tar.bz2\n' +
            'BB_DIR    := build/busybox-$(BB_VER)\n' +
            'CROSS     := aarch64-linux-gnu-\n' +
            'EPOCH     := 1790000000\n' +
            '\n' +
            '# Every tool below sees the same clock, time zone and sort order.\n' +
            'export SOURCE_DATE_EPOCH := $(EPOCH)\n' +
            'export TZ     := UTC\n' +
            'export LC_ALL := C\n' +
            '\n' +
            'OVERLAY := $(shell find overlay -type f)\n' +
            '\n' +
            'all: out/rootfs.cpio.gz\n' +
            '\n' +
            'build/.stamp_extracted: $(BB_TAR)\n' +
            '\techo "$(BB_SHA256)  $<" | sha256sum -c -\n' +
            '\trm -rf $(BB_DIR) && mkdir -p build\n' +
            '\ttar -xjf $< -C build\n' +
            '\ttouch $@\n' +
            '\n' +
            '$(BB_DIR)/.config: busybox.config build/.stamp_extracted\n' +
            '\tcp busybox.config $@\n' +
            '\n' +
            '$(BB_DIR)/busybox: $(BB_DIR)/.config\n' +
            '\t$(MAKE) -C $(BB_DIR) CROSS_COMPILE=$(CROSS) -j$$(nproc) > build/busybox.log 2>&1\n' +
            '\n' +
            'build/.stamp_rootfs: $(BB_DIR)/busybox $(OVERLAY)\n' +
            '\trm -rf build/rootfs\n' +
            '\t$(MAKE) -C $(BB_DIR) CROSS_COMPILE=$(CROSS) CONFIG_PREFIX=$(CURDIR)/build/rootfs install > build/install.log 2>&1\n' +
            '\tmkdir -p build/rootfs/dev build/rootfs/proc build/rootfs/sys build/rootfs/tmp build/rootfs/root\n' +
            '\tln -s sbin/init build/rootfs/init\n' +
            '\tcp -a overlay/. build/rootfs/\n' +
            '\ttouch $@\n' +
            '\n' +
            'out/rootfs.cpio.gz: build/.stamp_rootfs\n' +
            '\tmkdir -p out\n' +
            '\tfind build/rootfs -exec touch -h -d @$(EPOCH) {} +\n' +
            '\tcd build/rootfs && find . | sort | cpio -o -H newc --quiet --reproducible --owner=0:0 | gzip -9 -n > $(CURDIR)/$@\n' +
            '\tsha256sum $@\n' +
            '\n' +
            'clean:\n' +
            '\trm -rf build out\n' +
            '\n' +
            '.PHONY: all clean' },

          { t: 'table',
            head: ['Dòng', 'Làm gì', 'Bài toán nó giải'],
            rows: [
              ['<code>BB_VER</code>, <code>BB_SHA256</code>', 'Ghim phiên bản và checksum ngay trong công thức', '<b>Tái lập</b>: không có "bản mới nhất"; tarball khác một byte là dừng'],
              ['<code>export SOURCE_DATE_EPOCH TZ LC_ALL</code>', '<code>export</code> của <code>make</code>: đưa biến vào môi trường của <b>mọi</b> lệnh trong công thức, kể cả <code>make</code> con của BusyBox', '<b>Tái lập</b>: bịt đồng hồ, múi giờ, ngôn ngữ — bước 3 cho thấy cần cả ba'],
              ['<code>OVERLAY := $(shell find overlay -type f)</code>', 'Liệt kê mọi file overlay lúc đọc Makefile', '<b>Phụ thuộc</b>: sửa bất kỳ file nào trong <code>overlay/</code> cũng làm rootfs "cũ"'],
              ['<code>build/.stamp_extracted: $(BB_TAR)</code>', 'Kiểm tra sha256, xoá cây cũ, giải nén, rồi <code>touch</code> stamp', '<b>Phụ thuộc</b>: chỉ giải nén lại khi tarball đổi'],
              ['<code>$(BB_DIR)/.config: busybox.config …</code>', 'Chép cấu hình vào cây BusyBox', 'Cấu hình là đầu vào trong Git; <code>.config</code> trong cây chỉ là bản sao'],
              ['<code>$(BB_DIR)/busybox: $(BB_DIR)/.config</code>', 'Gọi <code>make</code> của BusyBox — nó tự biết phần nào cần biên dịch lại', 'Build system lồng build system: Makefile ngoài lo thứ tự giữa các bước, Kbuild bên trong lo từng file <code>.c</code>'],
              ['<code>build/.stamp_rootfs: … $(OVERLAY)</code>', 'Dựng rootfs <b>từ đầu</b> mỗi lần: <code>rm -rf</code>, <code>make install</code>, <code>mkdir</code>, <code>ln -s</code>, chép overlay', '<b>Tái lập</b>: không bao giờ sửa rootfs cũ, nên không có file thừa sót lại từ lần trước'],
              ['<code>out/rootfs.cpio.gz</code>', '<code>touch</code> mọi mục về mốc cố định, rồi đóng gói theo đúng dòng lệnh bước 4, in sha256', '<b>Tái lập</b>: bốn biện pháp của bước 4 trong một dòng'],
              ['<code>clean</code>, <code>.PHONY</code>', 'Xoá mọi sản phẩm trung gian (Bài 16)', 'Chỉ <code>build/</code> và <code>out/</code> bị xoá — đầu vào không bao giờ bị động tới']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao dựng lại rootfs từ đầu, thay vì chỉ chép file vừa sửa',
            x: 'Chép đè chỉ file vừa sửa nhanh hơn, nhưng nó giả định rằng cây rootfs cũ đúng. Nếu bạn xoá một file khỏi ' +
               '<code>overlay/</code>, chép đè không bao giờ xoá nó khỏi rootfs — sản phẩm giờ phụ thuộc vào <b>lịch sử</b> ' +
               'các lần build, không chỉ vào đầu vào. Dựng lại từ <code>make install</code> mất khoảng một giây với 415 mục; ' +
               'rẻ hơn nhiều so với một firmware chứa file "ma". Buildroot theo đúng nguyên tắc này: thư mục ' +
               '<code>target/</code> được tạo mới khi dựng lại image, không vá dần.' },

          { t: 'p', x:
            'Trước khi build, kiểm kê thư mục dự án — đây là <b>toàn bộ</b> những gì cần đưa vào Git:' },

          { t: 'code', where: 'wsl', code:
            'find . -path ./dl -prune -o -type f -print | sort' },

          { t: 'code', where: 'out', nocopy: true, code:
            './busybox.config\n' +
            './Makefile\n' +
            './overlay/etc/fstab\n' +
            './overlay/etc/group\n' +
            './overlay/etc/hostname\n' +
            './overlay/etc/init.d/rcS\n' +
            './overlay/etc/inittab\n' +
            './overlay/etc/passwd' },

          { t: 'cmdx', cmd: 'find . -path ./dl -prune -o -type f -print | sort', rows: [
            ['-path ./dl -prune', 'Gặp thư mục <code>./dl</code> thì không đi vào — tarball 2,6 MB không cần in ra, và thường cũng không đưa vào Git'],
            ['-o -type f -print', '<i>hoặc</i> (với mọi thứ khác): nếu là file thường thì in tên'],
            ['| sort', 'In theo thứ tự cố định — cùng bài học của bước 4']
          ] },

          { t: 'p', x:
            'Tám file văn bản, tổng cộng dưới 1 400 dòng, và một tarball có thể tải lại được nhờ checksum. Mọi thứ khác ' +
            '— hơn 3 000 file mã nguồn giải nén, hàng trăm <code>.o</code>, cây rootfs, kho <code>cpio</code> — đều là ' +
            'sản phẩm dẫn xuất, xoá đi được. Giờ chạy build, có đo thời gian:' },

          { t: 'code', where: 'wsl', code:
            'time make' },

          { t: 'code', where: 'out', nocopy: true, code:
            'echo "34f9ea6ff8636f2c9241153b9114eefa9e65674a45318ae1ef95bb5f31c53bb2  dl/busybox-1.38.0.tar.bz2" | sha256sum -c -\n' +
            'dl/busybox-1.38.0.tar.bz2: OK\n' +
            'rm -rf build/busybox-1.38.0 && mkdir -p build\n' +
            'tar -xjf dl/busybox-1.38.0.tar.bz2 -C build\n' +
            'touch build/.stamp_extracted\n' +
            'cp busybox.config build/busybox-1.38.0/.config\n' +
            'make -C build/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- -j$(nproc) > build/busybox.log 2>&1\n' +
            'rm -rf build/rootfs\n' +
            'make -C build/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- CONFIG_PREFIX=/home/cah8hc/bai59/mini/build/rootfs install > build/install.log 2>&1\n' +
            'mkdir -p build/rootfs/dev build/rootfs/proc build/rootfs/sys build/rootfs/tmp build/rootfs/root\n' +
            'ln -s sbin/init build/rootfs/init\n' +
            'cp -a overlay/. build/rootfs/\n' +
            'touch build/.stamp_rootfs\n' +
            'mkdir -p out\n' +
            'find build/rootfs -exec touch -h -d @1790000000 {} +\n' +
            'cd build/rootfs && find . | sort | cpio -o -H newc --quiet --reproducible --owner=0:0 | gzip -9 -n > /home/cah8hc/bai59/mini/out/rootfs.cpio.gz\n' +
            'sha256sum out/rootfs.cpio.gz\n' +
            '0f346fda58a88dee7aff773f3af1e7fd4a3eb9dc5f28f5a2172af48949e08a27  out/rootfs.cpio.gz\n' +
            '\n' +
            'real\t0m17.387s\n' +
            'user\t1m25.956s\n' +
            'sys\t0m13.114s' },

          { t: 'p', x:
            '<code>make</code> in mỗi lệnh trước khi chạy, nên output chính là <b>nhật ký</b> của quy trình, theo đúng thứ ' +
            'tự của đồ thị phụ thuộc ở phần lý thuyết: kiểm tra hash → giải nén → chép cấu hình → build → rootfs → đóng ' +
            'gói. Đường dẫn <code>/home/cah8hc/…</code> là <code>$(CURDIR)</code> và sẽ là thư mục home của bạn. ' +
            '<b>17,4 giây</b> cho toàn bộ, phần lớn là biên dịch BusyBox (<code>user</code> gấp 5 lần <code>real</code>: ' +
            '16 CPU chạy song song); con số trên máy bạn tuỳ số CPU.' },

          { t: 'p', x:
            'Dòng cuối là con số quan trọng nhất của cả bài: sha256 <code>0f346fda…</code> của sản phẩm cuối. Kho này có ' +
            'thêm overlay và năm thư mục so với kho ở bước 4, nên hash khác <code>6e7e026f…</code>. Với cùng gcc 9.4, ' +
            'con số này phải trùng trên máy bạn — vì Makefile tự đặt <code>SOURCE_DATE_EPOCH</code>, <code>TZ</code> và ' +
            '<code>LC_ALL</code>, bạn không cần <code>export</code> gì cả. Chạy lại <code>make</code> ngay, không sửa gì:' },

          { t: 'code', where: 'wsl', code:
            'make\n' +
            'ls -F build out' },

          { t: 'code', where: 'out', nocopy: true, code:
            "make: Nothing to be done for 'all'.\n" +
            'build:\n' +
            'busybox-1.38.0/\n' +
            'busybox.log\n' +
            'install.log\n' +
            'rootfs/\n' +
            '\n' +
            'out:\n' +
            'rootfs.cpio.gz' },

          { t: 'p', x:
            '<code>Nothing to be done</code>: mọi đích đều mới hơn điều kiện tiên quyết của nó, không bước nào phải làm lại. ' +
            '<code>ls -F</code> không liệt kê hai stamp vì tên bắt đầu bằng dấu chấm — chúng là file ẩn, đúng như ' +
            'Buildroot đặt tên (<code>ls -a build</code> sẽ thấy). <code>build/</code> chứa mọi thứ trung gian kèm log của ' +
            'từng bước; <code>out/</code> chỉ chứa sản phẩm. Tách hai thư mục như vậy là quy ước Buildroot cũng dùng: ' +
            '<code>output/build/</code> và <code>output/images/</code>.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Thử thách build system: đổi đầu vào, đổi máy, làm hỏng, rồi boot',
        blocks: [
          { t: 'p', x:
            'Một build system chỉ đáng tin nếu nó phản ứng đúng khi đầu vào thay đổi. Thử lần lượt từng loại thay đổi, ' +
            'đối chiếu với đồ thị phụ thuộc ở phần lý thuyết. Đầu tiên: sửa một file trong overlay.' },

          { t: 'code', where: 'wsl', code:
            'echo board-a > overlay/etc/hostname\n' +
            'make' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rm -rf build/rootfs\n' +
            'make -C build/busybox-1.38.0 CROSS_COMPILE=aarch64-linux-gnu- CONFIG_PREFIX=/home/cah8hc/bai59/mini/build/rootfs install > build/install.log 2>&1\n' +
            'mkdir -p build/rootfs/dev build/rootfs/proc build/rootfs/sys build/rootfs/tmp build/rootfs/root\n' +
            'ln -s sbin/init build/rootfs/init\n' +
            'cp -a overlay/. build/rootfs/\n' +
            'touch build/.stamp_rootfs\n' +
            'mkdir -p out\n' +
            'find build/rootfs -exec touch -h -d @1790000000 {} +\n' +
            'cd build/rootfs && find . | sort | cpio -o -H newc --quiet --reproducible --owner=0:0 | gzip -9 -n > /home/cah8hc/bai59/mini/out/rootfs.cpio.gz\n' +
            'sha256sum out/rootfs.cpio.gz\n' +
            '1928bfac13b08c099a9661f0d1cb9551d1e4fa0efbe08b4b7354c5c01dc03b64  out/rootfs.cpio.gz' },

          { t: 'p', x:
            'Không có dòng <code>sha256sum -c</code>, không <code>tar</code>, không build BusyBox: <code>make</code> chỉ ' +
            'chạy lại <b>hai nút cuối</b> của đồ thị — dựng rootfs và đóng gói — đúng như hình vẽ dự đoán. Hash đổi sang ' +
            '<code>1928bfac…</code> vì nội dung thật sự đổi (một file thêm 8 byte). Tiếp theo, sửa cấu hình BusyBox: tắt ' +
            'applet <code>vi</code>.' },

          { t: 'code', where: 'wsl', code:
            "sed -i 's/^CONFIG_VI=y$/# CONFIG_VI is not set/' busybox.config\n" +
            'time make > /dev/null' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\n' +
            'real\t0m10.068s\n' +
            'user\t0m8.056s\n' +
            'sys\t0m1.259s' },

          { t: 'p', x:
            'Lần này <b>10 giây</b>: <code>make</code> thấy <code>busybox.config</code> mới hơn <code>.config</code> trong ' +
            'cây, chép lại, và gọi <code>make</code> của BusyBox — Kbuild của BusyBox tự biên dịch lại những file bị ảnh ' +
            'hưởng. Không giải nén lại (tarball không đổi). Chú ý <code>user</code> 8 giây gần bằng <code>real</code> 10 ' +
            'giây: phần lớn thời gian là bước link và các bước tuần tự, không song song hoá được — cùng hiện tượng Bài 40 ' +
            'đã đo với <code>kallsyms</code> của kernel. Giờ trả hai đầu vào về như cũ:' },

          { t: 'code', where: 'wsl', code:
            'echo embedded > overlay/etc/hostname\n' +
            "sed -i 's/^# CONFIG_VI is not set$/CONFIG_VI=y/' busybox.config\n" +
            'make | tail -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0f346fda58a88dee7aff773f3af1e7fd4a3eb9dc5f28f5a2172af48949e08a27  out/rootfs.cpio.gz' },

          { t: 'p', x:
            'Hash quay về đúng <code>0f346fda…</code> của bước 5. Đây là tính chất quan trọng nhất của build tái lập: ' +
            'sản phẩm là <b>hàm của đầu vào</b>, không phải của lịch sử. Hai lần sửa rồi hoàn tác không để lại dấu vết ' +
            'nào. Bây giờ thử điều mà làm tay không bao giờ đảm bảo được: một "người khác", ở thư mục khác, với môi ' +
            'trường khác, build từ đầu.' },

          { t: 'code', where: 'wsl', code:
            'cp -a ~/bai59/mini ~/bai59/other && cd ~/bai59/other\n' +
            'make clean\n' +
            'TZ=Asia/Tokyo LC_ALL=C.UTF-8 make | tail -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rm -rf build out\n' +
            '0f346fda58a88dee7aff773f3af1e7fd4a3eb9dc5f28f5a2172af48949e08a27  out/rootfs.cpio.gz' },

          { t: 'cmdx', cmd: 'TZ=Asia/Tokyo LC_ALL=C.UTF-8 make', rows: [
            ['TZ=Asia/Tokyo', 'Giả làm người build ở Nhật (UTC+9). Ở bước 3, đổi múi giờ đã làm hash đổi'],
            ['LC_ALL=C.UTF-8', 'Một ngôn ngữ khác với <code>C</code> mà Makefile dùng; có sẵn trên mọi Ubuntu'],
            ['VAR=giá_trị lệnh', 'Cú pháp shell: đặt biến chỉ cho đúng một lệnh, không ảnh hưởng shell hiện tại. Ở đây nó thử xem môi trường của người gọi có lọt được vào không']
          ] },

          { t: 'p', x:
            'Thư mục khác (<code>other</code> thay vì <code>mini</code>, nên mọi đường dẫn <code>$(CURDIR)</code> đổi), múi ' +
            'giờ khác, ngôn ngữ khác, build lại từ con số 0 — <b>cùng hash</b>. Vì sao <code>TZ=Asia/Tokyo</code> không ' +
            'lọt vào? Vì <code>export TZ := UTC</code> trong Makefile <b>ghi đè</b> biến môi trường cùng tên cho mọi lệnh ' +
            'con. Build system không nhờ người dùng nhớ đặt môi trường đúng; nó tự đặt.' },

          { t: 'p', x:
            'Tiếp theo, một đầu vào bị hỏng. Giả lập một lần tải bị cắt ngang — lỗi mà một proxy chập chờn hay gây ra: ' +
            'file về thiếu mà <code>curl</code> vẫn không báo gì — bằng cách cắt tarball còn 2 000 000 byte:' },

          { t: 'code', where: 'wsl', code:
            'truncate -s 2000000 dl/busybox-1.38.0.tar.bz2\n' +
            'make clean > /dev/null\n' +
            'make; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'echo "34f9ea6ff8636f2c9241153b9114eefa9e65674a45318ae1ef95bb5f31c53bb2  dl/busybox-1.38.0.tar.bz2" | sha256sum -c -\n' +
            'dl/busybox-1.38.0.tar.bz2: FAILED\n' +
            'sha256sum: WARNING: 1 computed checksum did NOT match\n' +
            'make: *** [Makefile:19: build/.stamp_extracted] Error 1\n' +
            'rc=2' },

          { t: 'p', x:
            'Build dừng ở <b>lệnh đầu tiên</b>, <code>Makefile:19</code> là dòng <code>sha256sum -c</code>, mã thoát ' +
            '<b>2</b> (quy ước của <code>make</code> khi một lệnh thất bại). Không có dòng <code>tar</code> nào chạy, nên ' +
            'không có cây nguồn dở dang, không có stamp — lần <code>make</code> sau, khi tarball đã được tải lại đúng, sẽ ' +
            'bắt đầu lại sạch sẽ. Không có dòng kiểm tra checksum, bạn sẽ gặp một lỗi khó hiểu của <code>tar</code> hay ' +
            'của trình biên dịch ở phút thứ mười, và phải tự đoán nguyên nhân.' },

          { t: 'cal', kind: 'tip', title: 'Thứ tự trong một công thức: kiểm tra trước, xoá sau, tạo stamp cuối cùng',
            x: 'Nhìn lại ba lệnh của đích <code>build/.stamp_extracted</code>: <code>sha256sum -c</code> trước, ' +
               '<code>rm -rf</code> và <code>tar</code> sau, <code>touch $@</code> cuối cùng. Nếu bất kỳ lệnh nào lỗi, ' +
               '<code>make</code> dừng và <b>không tạo stamp</b> — bước đó được coi là chưa xong. Đặt <code>touch</code> ' +
               'lên đầu thì một lần giải nén lỗi sẽ được đánh dấu là "đã xong" mãi mãi. Mọi công thức có stamp đều theo ' +
               'thứ tự này.' },

          { t: 'p', x:
            'Cuối cùng là thí nghiệm quan trọng nhất, vì nó cho thấy Makefile của bạn <b>chưa hoàn hảo</b>. Quay về ' +
            '<code>mini</code> và đổi một giá trị <i>ngay trong Makefile</i> — mốc thời gian <code>EPOCH</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai59/mini\n' +
            "sed -i 's/^EPOCH     := 1790000000$/EPOCH     := 1800000000/' Makefile\n" +
            'make; echo "rc=$?"\n' +
            'make clean > /dev/null; make | tail -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            "make: Nothing to be done for 'all'.\n" +
            'rc=0\n' +
            '3df6544d171acb0a8a85f3c9c6b65fb1c83575b826d364f2e079962884dcc35f  out/rootfs.cpio.gz' },

          { t: 'p', x:
            'Đọc kỹ hai kết quả. Lần <code>make</code> đầu: <code>Nothing to be done</code>, mã thoát <b>0</b> — không ' +
            'lỗi, không cảnh báo — và <code>out/rootfs.cpio.gz</code> vẫn là sản phẩm của mốc <b>cũ</b>. Sau ' +
            '<code>make clean</code>, sản phẩm thật của mốc mới có hash <code>3df6544d…</code>. Vậy trong khoảng giữa hai ' +
            'lệnh, thư mục <code>out/</code> chứa một file <b>sai</b> mà <code>make</code> khẳng định là đúng.' },

          { t: 'cal', kind: 'warn', title: 'Phụ thuộc bị khai thiếu: đầu vào đổi, make không biết',
            x: '<code>make</code> chỉ biết những gì bạn khai ở vế phải dấu <code>:</code>. <code>EPOCH</code> được dùng ' +
               'trong công thức, nhưng file chứa nó — chính <code>Makefile</code> — không nằm trong danh sách điều kiện tiên ' +
               'quyết của đích nào. Tương tự với <code>SOURCE_DATE_EPOCH</code> ở bước 3, với <code>CROSS_COMPILE</code> ở ' +
               '<code>bt-27</code>, và với phiên bản gcc của máy. Cách sửa đơn giản nhất cho trường hợp này: thêm ' +
               '<code>Makefile</code> vào điều kiện tiên quyết của đích đầu tiên, <code>build/.stamp_extracted: $(BB_TAR) ' +
               'Makefile</code>. Người soạn bài đã thử: sau khi sửa, đổi <code>EPOCH</code> thì <code>make</code> tự build ' +
               'lại từ đầu và in <code>3df6544d…</code>, đổi lại thì in <code>0f346fda…</code>. Cái giá: sửa một dòng chú ' +
               'thích trong Makefile cũng build lại toàn bộ. Build system thật giải quyết triệt để hơn — Yocto <b>băm mọi ' +
               'biến</b> mà một bước dùng và so hash thay vì so thời gian; Buildroot thì khuyên bạn <code>make clean</code> ' +
               'khi đổi cấu hình lớn. Bài 60 và 62 sẽ quay lại điểm này.' },

          { t: 'p', x:
            'Trả <code>EPOCH</code> về như cũ và build lại sạch, để có đúng sản phẩm của bước 5:' },

          { t: 'code', where: 'wsl', code:
            "sed -i 's/^EPOCH     := 1800000000$/EPOCH     := 1790000000/' Makefile\n" +
            'make clean > /dev/null; make | tail -1' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0f346fda58a88dee7aff773f3af1e7fd4a3eb9dc5f28f5a2172af48949e08a27  out/rootfs.cpio.gz' },

          { t: 'p', x:
            'Hash <code>0f346fda…</code> một lần nữa — lần thứ tư trong bài, qua bốn con đường khác nhau. Việc cuối cùng: ' +
            'chứng minh sản phẩm không chỉ tái lập được mà còn <b>chạy được</b>. Boot nó bằng kernel của Bài 40, với ' +
            'dòng lệnh QEMU quen thuộc của Bài 48:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd out/rootfs.cpio.gz -append "console=ttyAMA0"' },

          { t: 'p', x:
            'Khi dấu nhắc <code>~ #</code> hiện ra, gõ ba lệnh trong máy ảo, rồi <code>poweroff</code>:' },

          { t: 'code', where: 'qemu', code:
            'cat /etc/hostname\n' +
            'busybox | head -1\n' +
            'ls -l /bin/busybox /init\n' +
            'poweroff' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    0.295021] Unpacking initramfs...\n' +
            '[    0.425123] Freeing initrd memory: 1156K\n' +
            '...\n' +
            '[    0.780537] Run /init as init process\n' +
            'rcS: mounting filesystems from /etc/fstab\n' +
            'rcS: done at 0.82 s, hostname is embedded\n' +
            '~ # cat /etc/hostname\n' +
            'embedded\n' +
            '~ # busybox | head -1\n' +
            'BusyBox v1.38.0 (2026-09-21 14:13:20 UTC) multi-call binary.\n' +
            '~ # ls -l /bin/busybox /init\n' +
            '-rwxr-xr-x    1 root     root       2094192 Sep 21 14:13 /bin/busybox\n' +
            'lrwxrwxrwx    1 root     root             9 Sep 21 14:13 /init -> sbin/init\n' +
            '~ # poweroff\n' +
            '~ # umount: devtmpfs busy - remounted read-only\n' +
            'The system is going down NOW!\n' +
            'Sent SIGTERM to all processes\n' +
            'Sent SIGKILL to all processes\n' +
            'Requesting system poweroff\n' +
            '[   10.856275] Flash device refused suspend due to active operation (state 20)\n' +
            '[   10.857524] Flash device refused suspend due to active operation (state 20)\n' +
            '[   10.858408] reboot: Power down',
            notes: [
              'Đã lược bỏ hơn 200 dòng log kernel ở giữa (<code>...</code>) và mã màu ANSI mà <code>ls</code> của BusyBox in ra. Các số trong ngoặc vuông là thời gian từ lúc boot, sẽ khác trên máy bạn; <code>0.82 s</code> cũng vậy. Hai dòng <code>Flash device refused suspend</code> là tiếng ồn quen thuộc của machine <code>virt</code> khi tắt, đã gặp từ Bài 40.'
            ] },

          { t: 'p', x:
            'Mọi thứ Chặng 09 đã dạy vẫn đúng: <code>/init</code> là symlink tới <code>sbin/init</code> (Bài 48), ' +
            '<code>rcS</code> mount theo <code>fstab</code> và đặt hostname <code>embedded</code> (Bài 47). Nhưng giờ mỗi ' +
            'chi tiết mang dấu vết của build system: BusyBox tự báo ngày <code>2026-09-21 14:13:20 UTC</code> — mốc ' +
            '<code>EPOCH</code> theo UTC, không phải ngày bạn build; <code>/bin/busybox</code> thuộc <code>root root</code> ' +
            'nhờ <code>--owner=0:0</code>, không phải user của bạn; mọi file cùng mang giờ <code>Sep 21 14:13</code> nhờ ' +
            '<code>touch -d</code>. Hai dòng <code>Unpacking initramfs</code> và <code>Freeing initrd memory: 1156K</code> ' +
            'xác nhận kernel đã nhận đúng kho <b>1 156 KiB</b> mà Makefile sinh ra.' },

          { t: 'cal', kind: 'info', title: 'Dọn dẹp',
            x: '<code>~/bai59</code> chiếm khoảng <b>190 MB</b>, phần lớn là bốn cây BusyBox đã build (<code>one</code>, ' +
               '<code>two</code>, <code>mini/build</code>, <code>other/build</code>). Không bài nào sau đọc từ đây — Bài ' +
               '60 dùng Buildroot, tự tải mọi thứ. Nếu muốn giữ Makefile tí hon làm tài liệu, chỉ cần giữ ' +
               '<code>~/bai59/mini</code> sau <code>make clean</code> (<b>2,7 MB</b>, gần như toàn bộ là tarball 2,6 MB). Còn lại: ' +
               '<code>rm -rf ~/bai59/one ~/bai59/two ~/bai59/other ~/bai59/pack</code>. <code>~/bai38</code> không bị ' +
               'bài này thay đổi — <code>.config</code> vẫn có md5 <code>1ebe385a…</code> như bước 1 đã in.' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Hai lần build cùng nguồn, hai <code>sha256</code> khác nhau', 'Một công cụ đã ghi giờ, inode, user hay đường dẫn vào sản phẩm', '<code>cmp -l</code> tìm vị trí byte, <code>strings</code> hoặc <code>readelf</code> đọc nghĩa của nó; bịt nguồn rò, đừng chỉ đếm byte'],
        ['Đã <code>export SOURCE_DATE_EPOCH</code> mà chuỗi giờ trong BusyBox vẫn là giờ cũ', 'Giờ được ghi lúc sinh cấu hình; <code>make</code> không coi biến môi trường là điều kiện tiên quyết nên không làm lại gì', '<code>make distclean</code>, <code>defconfig</code> (hoặc chép lại <code>.config</code>), rồi build'],
        ['Cùng <code>SOURCE_DATE_EPOCH</code>, hai máy vẫn ra hai hash; chuỗi giờ khác múi (<code>+07</code> / <code>UTC</code>)', '<code>TZ</code> lọt vào qua <code>ctime()</code> ghi đè <code>struct tm</code> của <code>gmtime()</code> trong Kconfig của BusyBox', 'Đặt <code>TZ=UTC</code> (và <code>LC_ALL=C</code>) cho mọi bước build'],
        ['Hai kho <code>cpio</code> của hai cây giống hệt khác nhau hàng nghìn byte', 'Header <code>newc</code> ghi inode, UID/GID, mtime của từng file', '<code>touch -h -d @$SOURCE_DATE_EPOCH</code>, <code>LC_ALL=C sort</code>, <code>cpio --reproducible --owner=0:0</code>'],
        ['Hai file <code>.gz</code> của cùng một dữ liệu khác nhau ở byte 5–8', 'Header gzip lưu thời gian sửa (và tên) của file gốc', '<code>gzip -n</code>'],
        ['Hash trùng trên máy bạn nhưng khác trên máy đồng nghiệp', 'Một lỗ rò chỉ lộ khi đổi môi trường: thứ tự thư mục (thiếu <code>sort</code>), UID (thiếu <code>--owner</code>), hoặc gcc khác phiên bản', 'Kiểm tra bằng cách build ở thư mục khác, trên tmpfs, với <code>TZ</code> khác; so phiên bản toolchain'],
        ['<code>dl/busybox-1.38.0.tar.bz2: FAILED</code> + <code>Error 1</code>, <code>make</code> thoát <b>2</b>', 'Tarball tải về bị cắt hoặc bị thay — checksum không khớp', 'Xoá file, tải lại (<code>curl -fLO</code>, Bài 47), kiểm tra lại. Đừng bao giờ sửa checksum cho khớp file'],
        ['<code>curl: (22) The requested URL returned error: 401</code> khi tải từ <code>busybox.net</code>', 'Proxy công ty từ chối host đó (gặp khi soạn bài này, trên máy có proxy)', 'Dùng bản trong <code>~/bai47</code>, hoặc tải bằng máy khác rồi chép sang — checksum đảm bảo bản chép cũng đúng'],
        ['<code>Makefile:25: *** missing separator (did you mean TAB instead of 8 spaces?).  Stop.</code>', 'Dòng lệnh trong công thức bắt đầu bằng dấu cách thay vì Tab — thường do dán từ trình duyệt', 'Thay dấu cách đầu dòng bằng một Tab; <code>cat -A Makefile</code> hiện Tab là <code>^I</code>'],
        ['<code>make: *** No rule to make target \'dl/busybox-1.38.0.tar.bz2\', needed by \'build/.stamp_extracted\'.  Stop.</code>', 'Chưa chép tarball vào <code>dl/</code> — Makefile không tự tải', 'Chép hoặc tải tarball vào <code>dl/</code>, rồi <code>make</code> lại'],
        ['Đổi một biến trong Makefile, <code>make</code> báo <code>Nothing to be done</code>, sản phẩm vẫn cũ', 'Phụ thuộc bị khai thiếu: <code>Makefile</code> không là điều kiện tiên quyết của đích nào', '<code>make clean &amp;&amp; make</code>; hoặc thêm <code>Makefile</code> vào điều kiện tiên quyết của đích đầu tiên'],
        ['<code>ls -l</code> trong QEMU cho thấy file thuộc UID <code>1000</code> thay vì <code>root</code>', 'Đóng gói <code>cpio</code> thiếu <code>--owner=0:0</code>', 'Thêm <code>--owner=0:0</code>; trên thiết bị thật, file hệ thống thuộc user khác root là lỗ hổng bảo mật']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      'Build thủ công để lại ba bài toán: <b>tái lập</b> (cùng nguồn có ra cùng file không), <b>phụ thuộc</b> (đổi một thứ thì làm lại gì) và <b>bảo trì lâu dài</b> (5–15 năm sau còn dựng lại được không). Build system giải cả ba bằng cách biến mọi thứ thành văn bản trong Git.',
      '<code>.config</code> của <code>~/bai38</code> khác <code>defconfig</code> ở <b>5</b> dòng (<code>scripts/diffconfig</code>); <code>Image</code> mang theo <code>cah8hc@HC-C-005W7</code>, <code>#5</code> và giờ build — bốn lỗ rò trong một dòng <code>Linux version</code>.',
      'Hai lần build BusyBox 1.38.0 cùng nguồn khác nhau <b>22</b> byte: <b>2</b> chữ số giây của <code>AUTOCONF_TIMESTAMP</code> + <b>20</b> byte <b>Build ID</b> (SHA-1 của nội dung). Đếm <b>nguyên nhân</b>, không đếm byte: cả 22 quy về một cái đồng hồ.',
      '<code>SOURCE_DATE_EPOCH</code> (Kconfig của BusyBox đọc ở <code>confdata.c:384</code>) làm hai lần build trùng nhau; nhưng <code>TZ</code> vẫn lọt vào qua <code>ctime()</code> → luôn đặt <b><code>TZ=UTC</code></b> và <b><code>LC_ALL=C</code></b>.',
      'Hai kho <code>cpio</code> của hai cây giống hệt khác <b>1 245</b> byte (inode, UID, mtime); gzip ghi mtime ở byte 5–8. Đủ bốn biện pháp — <code>touch -h -d @EPOCH</code>, <code>LC_ALL=C sort</code>, <code>cpio --reproducible --owner=0:0</code>, <code>gzip -n</code> — mới trùng trên mọi bản sao; thiếu <code>sort</code> chỉ lộ khi đổi hệ thống file.',
      'Makefile <b>47</b> dòng với hai <b>stamp</b>: kiểm tra sha256 → giải nén → chép cấu hình → build → rootfs dựng lại từ đầu → đóng gói. Build sạch <b>17,4 s</b>; sửa overlay chỉ đóng gói lại; sửa cấu hình build lại BusyBox (<b>10 s</b>); thư mục khác, <code>TZ</code> khác vẫn ra <code>0f346fda…</code>; tarball cụt dừng ở dòng đầu, mã thoát <b>2</b>.',
      '<b>Phụ thuộc bị khai thiếu</b>: đổi <code>EPOCH</code> trong Makefile → <code>Nothing to be done</code>, mã 0, sản phẩm sai. <code>make</code> chỉ biết những gì ở vế phải dấu <code>:</code>. Yocto băm mọi đầu vào của từng bước; Buildroot khuyên <code>make clean</code>.',
      'Sản phẩm boot được trong QEMU và tự khai nguồn gốc của nó: <code>BusyBox v1.38.0 (2026-09-21 14:13:20 UTC)</code>, <code>/bin/busybox</code> thuộc <code>root root</code>, mọi file mang giờ <code>Sep 21 14:13</code>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Makefile của bạn dựng <b>một</b> package bằng gcc của Ubuntu, và bước 6 đã chỉ ra lỗ hổng của nó. <b>Bài 60 — ' +
         'Buildroot từ đầu đến cuối</b> làm cùng việc đó cho cả hệ thống: nó tự build toolchain ARM64 (bịt lỗ rò thứ năm), ' +
         'rồi kernel, BusyBox và rootfs, từ một <code>defconfig</code> duy nhất và một lệnh <code>make</code>. Bạn sẽ tìm ' +
         'thấy trong <code>output/build/</code> đúng những stamp bạn vừa tự viết — <code>.stamp_extracted</code> là tên ' +
         'Buildroot dùng — đo xem lần build đầu tiên tốn bao lâu và bao nhiêu dung lượng, và boot ảnh Buildroot trong ' +
         'QEMU để so với rootfs <b>1 156 KiB</b> của hôm nay.' }
  ],

  quiz: [
    { q: 'Bạn build BusyBox hai lần từ cùng tarball và cùng <code>.config</code>, hai file cùng kích thước nhưng khác sha256. <code>cmp -l</code> báo 22 byte khác: một cụm 20 byte gần đầu file và 2 byte ở giữa các chuỗi ký tự. Kết luận nào đúng nhất?',
      opts: [
        'Có hai nguồn không tất định độc lập: trình biên dịch sinh mã khác nhau và BusyBox ghi giờ build',
        'Chỉ có một nguồn: giờ build làm 2 byte chuỗi phiên bản khác nhau, và Build ID (SHA-1 của nội dung) đổi theo — bịt đồng hồ là cả 22 byte biến mất',
        '<code>-j$(nproc)</code> làm thứ tự liên kết ngẫu nhiên, nên phải build bằng <code>-j1</code>',
        'Tarball bị hỏng một phần khi giải nén lần thứ hai'
      ],
      a: 1,
      why: 'Cụm 20 byte nằm đúng trong <code>.note.gnu.build-id</code> (offset 0x190 + 16 byte header), và Build ID là hash của chính nội dung file — nó khác vì nội dung khác 2 byte. Bước 3 chứng minh: chỉ đặt <code>SOURCE_DATE_EPOCH</code> là cả hai sha256 trùng nhau, Build ID trùng theo. Nguyên tắc: khi truy lỗ rò, đếm số nguyên nhân chứ không đếm số byte, vì một nguyên nhân có thể lan ra nhiều byte qua các giá trị dẫn xuất như hash.' },

    { q: 'Vì sao đặt <code>SOURCE_DATE_EPOCH=1790000000</code> vẫn chưa đủ để hai người ở Việt Nam và ở Đức build ra cùng một BusyBox?',
      opts: [
        'Vì <code>SOURCE_DATE_EPOCH</code> chỉ có tác dụng với kernel, không với BusyBox',
        'Vì mốc Unix được tính theo giờ địa phương, nên 1790000000 ở hai nơi là hai thời điểm khác nhau',
        'Vì chuỗi giờ được định dạng theo múi giờ của máy build: <code>ctime()</code> ghi đè kết quả của <code>gmtime()</code>, nên <code>TZ</code> lọt vào; phải đặt thêm <code>TZ=UTC</code>',
        'Vì hai máy có số CPU khác nhau nên <code>-j$(nproc)</code> khác nhau'
      ],
      a: 2,
      why: 'Mốc Unix là một thời điểm duy nhất trên toàn cầu (nên phương án 2 sai), và BusyBox có đọc <code>SOURCE_DATE_EPOCH</code> ở <code>confdata.c:384</code> (nên phương án 1 sai). Nhưng khi <i>viết</i> mốc đó ra chuỗi, Kconfig vô tình dùng giờ địa phương vì <code>ctime()</code> dùng chung <code>struct tm</code> tĩnh với <code>gmtime()</code>. Bài đo được: cùng mốc, <code>+07</code> cho <code>da878811…</code>, <code>TZ=UTC</code> cho <code>b9613970…</code>. Số CPU không ảnh hưởng nội dung sản phẩm. Bài học rộng hơn: build system đặt <code>TZ</code> và <code>LC_ALL</code> cố định cho mọi bước thay vì tin từng công cụ.' },

    { q: 'Bạn đóng gói <code>cpio</code> với <code>--reproducible --owner=0:0</code> và <code>gzip -n</code> nhưng <b>không</b> <code>sort</code>. Build hai lần trên máy bạn cho cùng hash. Điều gì có thể xảy ra?',
      opts: [
        'Không sao cả — hash đã trùng nghĩa là quy trình tất định',
        'Trên máy khác hoặc hệ thống file khác, <code>find</code> có thể liệt kê file theo thứ tự khác, và hash sẽ khác',
        '<code>cpio</code> sẽ từ chối tạo kho vì danh sách chưa sắp xếp',
        'Kernel sẽ không giải nén được initramfs'
      ],
      a: 1,
      why: '<code>find</code> trả về thứ tự mà hệ thống file lưu thư mục, không phải thứ tự chữ cái. Bước 4 đo được: hai bản sao trên cùng ext4 cho cùng hash khi không sort, nhưng bản trên tmpfs thì khác (sau <code>./usr/sbin</code>, ext4 gặp <code>readprofile</code>, tmpfs gặp <code>udhcpd</code>). Đó là loại lỗ rò nguy hiểm nhất: vượt qua mọi kiểm tra trên máy bạn, chỉ lộ khi người khác build. Kernel và <code>cpio</code> đều chấp nhận mọi thứ tự.' },

    { q: 'Bạn sửa <code>EPOCH := 1800000000</code> trong Makefile rồi chạy <code>make</code>. Nó in <code>Nothing to be done for \'all\'</code> và thoát 0. Nguyên nhân?',
      opts: [
        '<code>make</code> tự nhận ra giá trị mới cho cùng kết quả nên bỏ qua',
        'Biến có dấu <code>:=</code> chỉ được đọc một lần khi cài <code>make</code>',
        '<code>make</code> chỉ so thời gian của các file khai ở vế phải dấu <code>:</code>; <code>Makefile</code> không nằm trong danh sách điều kiện tiên quyết của đích nào, nên không đích nào bị coi là cũ',
        '<code>out/rootfs.cpio.gz</code> được đánh dấu chỉ đọc sau lần build đầu'
      ],
      a: 2,
      why: 'Quy tắc duy nhất của <code>make</code> (Bài 16): đích cũ hơn một điều kiện tiên quyết thì làm lại. Một đầu vào không được khai — ở đây là chính Makefile, ở bước 3 là biến môi trường, ở <code>bt-27</code> là <code>CROSS_COMPILE</code> — thì thay đổi của nó vô hình. Sản phẩm trong <code>out/</code> lúc này là của mốc cũ. Thêm <code>Makefile</code> vào điều kiện tiên quyết của đích đầu tiên sửa được trường hợp này; Yocto giải triệt để bằng cách băm mọi đầu vào của từng bước.' },

    { q: 'Trong Makefile, đích <code>build/.stamp_extracted</code> chạy <code>sha256sum -c</code>, rồi <code>rm -rf</code> + <code>tar</code>, và <code>touch $@</code> ở cuối. Nếu đưa <code>touch $@</code> lên làm lệnh đầu tiên thì sao?',
      opts: [
        'Không khác gì, vì <code>make</code> chạy mọi lệnh của công thức như một khối',
        'Một lần tải hỏng hay giải nén lỗi vẫn để lại stamp, nên lần <code>make</code> sau coi bước giải nén là đã xong và build tiếp trên một cây nguồn hỏng',
        '<code>make</code> sẽ báo lỗi vòng lặp phụ thuộc',
        'Bước giải nén sẽ chạy lại ở mọi lần <code>make</code>'
      ],
      a: 1,
      why: '<code>make</code> dừng ở lệnh lỗi đầu tiên nhưng không hoàn tác những lệnh đã chạy. Stamp là lời khẳng định "bước này đã xong đúng", nên nó phải là việc cuối cùng, chỉ xảy ra khi mọi lệnh trước đều thành công. Bước 6 cho thấy đúng thứ tự hiện tại hoạt động thế nào: tarball cụt → <code>FAILED</code> → không có stamp → lần sau bắt đầu lại sạch sẽ.' },

    { q: 'Thí nghiệm nào trong bài chứng minh mạnh nhất rằng Makefile của bạn là một build system <b>tái lập</b>, chứ không chỉ là một script chạy được?',
      opts: [
        '<code>make</code> lần hai in <code>Nothing to be done</code>',
        'Build sạch mất 17,4 giây, nhanh hơn làm tay',
        'Bản sao ở thư mục khác, với <code>TZ=Asia/Tokyo</code> và <code>LC_ALL</code> khác, build lại từ đầu vẫn ra đúng sha256 <code>0f346fda…</code>',
        'Sản phẩm boot được trong QEMU'
      ],
      a: 2,
      why: '"Nothing to be done" chứng minh phụ thuộc hoạt động, không chứng minh tái lập. Tốc độ và việc boot được thì một script làm tay cũng đạt. Chỉ một lần build độc lập — thư mục khác, môi trường khác, từ con số 0 — ra đúng cùng hash mới chứng minh sản phẩm là hàm của đầu vào khai báo và không gì khác. Đó cũng là cách các dự án thật kiểm tra: build hai lần trong hai môi trường cố tình khác nhau rồi so hash.' }
  ]
});

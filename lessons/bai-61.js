/* Bài 61 — Buildroot nâng cao
   Chặng 11 — Build system
   Tự viết package .mk để đóng gói daemon của bạn; overlay rootfs; defconfig để lưu cấu hình;
   thư mục patches/; script post-build.
   Thực hành trên máy B (WSL2 Ubuntu 20.04, user cah8hc), 2026-10-31, trên chính cây
   ~/bai60/buildroot-2026.02.3 của Bài 60 (dl/ và toolchain gcc 14.3.0 đã có sẵn).
   - Bước 1: "upstream" giả lập cho temp_daemon (Bài 24): Makefile 16 dòng tôn trọng CC/CFLAGS/DESTDIR,
     tarball tái lập được (sha256 cdc7160c…), thử build bằng gcc máy và aarch64-linux-gnu-gcc.
   - Bước 2: cây br2-external LEARN (external.desc, Config.in, external.mk) + package temp-daemon
     (Config.in, temp-daemon.mk 26 dòng, S60temp_daemon); đăng ký bằng BR2_EXTERNAL=; make temp-daemon
     16 s, "WARNING: no hash file" dù BR2_DOWNLOAD_FORCE_CHECK_HASHES=y.
   - Bước 3: file .hash — sai hash có chủ ý → ERROR … wrong sha256 hash, rc 2, rồi thử cả mirror
     sources.buildroot.net (404); đúng hash → "OK (sha256: …)".
   - Bước 4: patches/ — git format-patch (cổng từ argv[1]); BR2_GLOBAL_PATCH_DIR; make thường KHÔNG áp
     patch (.stamp_patched đã có; -rebuild, -reconfigure cũng không) → phải <pkg>-dirclean.
   - Bước 5: overlay (/etc/default/temp_daemon, /etc/motd), post-build (build-info, xoá S50crond),
     hostname learn; boot QEMU: daemon nghe 9100, 9006 bị từ chối; post-build không có quyền x → Error 126.
   - Bước 6: make savedefconfig (22 dòng); bẫy BR2_DEFCONFIG ghi đè configs/ của Buildroot;
     list-defconfigs; O=~/bai61/out + learn_qemu_defconfig + một lệnh make dựng lại toàn bộ (M10). */

Lesson.register({
  id: 'bai-61',
  title: 'Buildroot nâng cao',
  minutes: 60,
  practice: 'Thực hành 50 phút',
  level: 'Trung cấp',

  intro:
    'Hệ thống bạn boot ở Bài 60 chỉ chứa những gì cộng đồng Buildroot đã đóng gói sẵn. Thử đặt vào đó một chương ' +
    'trình của chính bạn — <code>temp_daemon</code> của Bài 24 chẳng hạn — và bạn sẽ thấy ngay ba cách làm sai rất ' +
    'hấp dẫn: chép file nhị phân vào <code>output/target</code> (lần <code>make clean</code> sau là mất), sửa thẳng ' +
    'vào cây Buildroot (lần nâng cấp Buildroot sau là phải làm lại từ đầu), hoặc ghi các bước ra một trang wiki ' +
    '(người tiếp theo sẽ làm khác bạn một chút).<br><br>' +
    'Bài này làm theo cách Buildroot thiết kế sẵn: một thư mục <b>br2-external</b> nằm ngoài cây Buildroot, chứa ' +
    'một <b>package</b> cho daemon của bạn (một file <code>.mk</code> 26 dòng), một file <b>hash</b>, một ' +
    '<b>patch</b>, một <b>overlay</b> rootfs, một <b>script post-build</b> và một <b>defconfig</b>. Cuối bài, bạn ' +
    'xoá sạch thư mục output, gõ hai lệnh, và nhận lại đúng hệ thống đó — daemon tự khởi động, nghe đúng cổng bạn ' +
    'cấu hình. Đó là cột mốc M10 của lộ trình: một lệnh <code>make</code> dựng lại toàn bộ hệ thống từ đầu.',

  goals: [
    'Tạo một cây br2-external với <code>external.desc</code>, <code>Config.in</code>, <code>external.mk</code> và đăng ký nó bằng <code>BR2_EXTERNAL</code>',
    'Viết <code>Config.in</code>, <code>.mk</code> (generic-package) và <code>.hash</code> cho một chương trình C của riêng bạn, rồi giải thích từng biến <code>TEMP_DAEMON_…</code>',
    'Đưa một thay đổi mã nguồn vào build bằng thư mục <code>patches/</code> và <code>BR2_GLOBAL_PATCH_DIR</code>, và biết vì sao <code>make</code> thường không áp patch mới',
    'Phân biệt overlay rootfs, script post-build và script post-image theo thời điểm chạy, và chọn đúng công cụ cho một thay đổi',
    'Lưu toàn bộ cấu hình bằng <code>make savedefconfig</code> vào cây của bạn, tránh ghi đè <code>configs/</code> của Buildroot',
    'Dựng lại cả hệ thống trong một thư mục output trống chỉ từ defconfig và cây br2-external'
  ],

  blocks: [
    /* ============================================================
       LÝ THUYẾT 1 — ĐẶT THAY ĐỔI Ở ĐÂU
       ============================================================ */
    { t: 'h2', x: 'Thay đổi của bạn nên nằm ở đâu' },

    { t: 'p', x:
      'Bài 60 đã cho bạn một quy tắc: <code>output/</code> là sản phẩm, không phải nơi để sửa tay — ' +
      '<code>output/target</code> được dựng lại từ các package, và <code>make clean</code> xoá toàn bộ ' +
      '<code>output/</code>. Vậy mọi thứ bạn muốn thêm vào hệ thống phải nằm ở <b>đầu vào</b> của build. Có ba chỗ ' +
      'để đặt nó:' },

    { t: 'table',
      head: ['Đặt ở đâu', 'Ví dụ', 'Hậu quả'],
      rows: [
        ['<code>output/target</code>', 'Chép <code>temp_daemon</code> vào <code>output/target/usr/bin</code>', 'Có trong ảnh ở lần <code>make</code> kế tiếp, mất ở lần <code>make clean</code> kế tiếp. Không ai khác dựng lại được'],
        ['Bên trong cây Buildroot', 'Thêm <code>package/temp-daemon/</code>, sửa <code>package/Config.in</code>', 'Chạy được, nhưng code của bạn trộn lẫn với 2 786 package của cộng đồng. Lên Buildroot 2027.02 là phải chép lại và gỡ xung đột bằng tay'],
        ['Cây <b>br2-external</b> riêng', '<code>~/bai61/br-ext/</code> với package, patch, overlay, defconfig', 'Cây Buildroot giữ nguyên như lúc giải nén. Nâng cấp Buildroot = giải nén bản mới, trỏ <code>BR2_EXTERNAL</code> vào cùng thư mục cũ. Cây của bạn là một repo Git nhỏ']
      ] },

    { t: 'p', x:
      'Hình dung Buildroot như một căn bếp chung của cả toà nhà: dụng cụ, công thức nấu cơ bản, bếp gas. Cây ' +
      'br2-external là <b>hộp đồ riêng</b> bạn mang tới — vài công thức của nhà bạn, gia vị riêng, cách bày đĩa. Bạn ' +
      'không khoan tường bếp chung để treo gia vị của mình; khi toà nhà thay bếp mới, bạn chỉ việc mang hộp sang. ' +
      'Đó cũng là cách các công ty làm thật: một repo <code>br2-external</code> cho sản phẩm, Buildroot gốc được ' +
      'ghim một phiên bản LTS (Bài 60) và không bao giờ bị sửa.' },

    { t: 'p', x:
      'Một cây br2-external là một thư mục bình thường. Ba file ở gốc là bắt buộc; mọi thứ còn lại là quy ước ' +
      'đặt tên mà Buildroot tự nhận ra. Đây là đúng cây bạn sẽ có ở cuối phần thực hành:' },

    { t: 'fig', cap: 'Cây br2-external của bài này: ba file bắt buộc ở gốc nối nó vào Buildroot (tên, menu, Makefile); bốn thư mục còn lại giữ bốn loại tuỳ biến. Không có file nào của cây Buildroot bị sửa.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Cấu trúc cây br2-external LEARN và cách các file nối vào Buildroot">' +
        '<rect class="d-box-p" x="20" y="20" width="300" height="290" rx="8"/>' +
        '<text class="d-t" x="40" y="46">~/bai61/br-ext/</text>' +
        '<text class="d-tm" x="50" y="74">external.desc</text>' +
        '<text class="d-tm" x="50" y="114">Config.in</text>' +
        '<text class="d-tm" x="50" y="154">external.mk</text>' +
        '<text class="d-tm" x="50" y="186">package/temp-daemon/</text>' +
        '<text class="d-tm" x="70" y="202">Config.in  temp-daemon.mk</text>' +
        '<text class="d-tm" x="70" y="218">temp-daemon.hash  S60temp_daemon</text>' +
        '<text class="d-tm" x="50" y="240">patches/temp-daemon/0001-….patch</text>' +
        '<text class="d-tm" x="50" y="258">board/learn/rootfs-overlay/etc/…</text>' +
        '<text class="d-tm" x="50" y="276">board/learn/post-build.sh</text>' +
        '<text class="d-tm" x="50" y="294">configs/learn_qemu_defconfig</text>' +
        '<path class="d-line" d="M160 70 H392"/><path class="d-arrow" d="M400 70 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M140 110 H392"/><path class="d-arrow" d="M400 110 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M150 150 H392"/><path class="d-arrow" d="M400 150 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="400" y="52" width="300" height="36" rx="6"/>' +
        '<text class="d-ts" x="412" y="74">tên LEARN → biến BR2_EXTERNAL_LEARN_PATH</text>' +
        '<rect class="d-box" x="400" y="92" width="300" height="36" rx="6"/>' +
        '<text class="d-ts" x="412" y="114">thêm menu “External options” vào menuconfig</text>' +
        '<rect class="d-box" x="400" y="132" width="300" height="36" rx="6"/>' +
        '<text class="d-ts" x="412" y="154">include mọi package/*/*.mk vào Makefile lớn</text>' +
        '<path class="d-line" d="M320 258 H392"/><path class="d-arrow" d="M400 258 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="400" y="196" width="300" height="104" rx="8"/>' +
        '<text class="d-t" x="550" y="220" text-anchor="middle">trỏ tới từ .config</text>' +
        '<text class="d-tm" x="415" y="244">BR2_GLOBAL_PATCH_DIR → patches/</text>' +
        '<text class="d-tm" x="415" y="262">BR2_ROOTFS_OVERLAY → rootfs-overlay</text>' +
        '<text class="d-tm" x="415" y="280">BR2_ROOTFS_POST_BUILD_SCRIPT → …sh</text>' +
        '</svg>' },

    { t: 'table',
      head: ['File', 'Nội dung', 'Vì sao bắt buộc'],
      rows: [
        ['<code>external.desc</code>', '<code>name: LEARN</code> và một dòng <code>desc:</code>', 'Tên sinh ra biến <code>BR2_EXTERNAL_LEARN_PATH</code> — đường dẫn tuyệt đối tới cây. Chỉ được dùng <code>[A-Za-z0-9_]</code>, vì nó trở thành một phần tên biến Make và Kconfig'],
        ['<code>Config.in</code>', 'Các dòng <code>source "$BR2_EXTERNAL_LEARN_PATH/package/…/Config.in"</code>', 'Kconfig của Buildroot đọc file này; không có nó thì package của bạn không xuất hiện trong menu và không có symbol <code>BR2_PACKAGE_…</code>'],
        ['<code>external.mk</code>', '<code>include</code> mọi file <code>.mk</code> trong <code>package/</code>', 'Makefile lớn của Buildroot đọc file này; không có nó thì symbol đã bật nhưng không có công thức nào để build']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao lại cần một tên, khi đã có đường dẫn?',
      x: 'Vì bạn có thể dùng nhiều cây br2-external cùng lúc — ví dụ một cây chung của công ty và một cây riêng cho ' +
         'từng sản phẩm: <code>BR2_EXTERNAL=~/company:~/product-a</code>. Mỗi cây cần một tên duy nhất để sinh biến ' +
         'đường dẫn riêng. Nhờ biến đó, defconfig và các file khác viết <code>$(BR2_EXTERNAL_LEARN_PATH)/board/…</code> ' +
         'thay vì <code>/home/cah8hc/bai61/br-ext/board/…</code> — và vẫn đúng khi đồng nghiệp clone repo vào một ' +
         'thư mục khác trên máy họ.' },

    /* ============================================================
       LÝ THUYẾT 2 — GIẢI PHẪU MỘT PACKAGE
       ============================================================ */
    { t: 'h2', x: 'Giải phẫu một package: Config.in, .mk và .hash' },

    { t: 'p', x:
      'Ở Bài 60 bạn đã đọc 12 dòng đầu của <code>package/busybox/busybox.mk</code>: phiên bản, nơi tải, tên tarball, ' +
      'giấy phép. Một package của bạn có đúng hình dạng đó, cộng thêm phần mà <code>busybox.mk</code> có nhưng bạn ' +
      'chưa đọc: <b>các lệnh build và cài</b>. Mỗi package gồm tối đa bốn loại file trong thư mục của nó:' },

    { t: 'table',
      head: ['File', 'Ai đọc nó', 'Trả lời câu hỏi'],
      rows: [
        ['<code>Config.in</code>', 'Kconfig (<code>menuconfig</code>, <code>olddefconfig</code>)', '<b>Có</b> build package này không? Nó phụ thuộc gì? — sinh ra symbol <code>BR2_PACKAGE_TEMP_DAEMON</code>'],
        ['<code>temp-daemon.mk</code>', '<code>make</code>', '<b>Làm sao</b> build nó: tải ở đâu, build bằng lệnh gì, cài file nào vào đâu'],
        ['<code>temp-daemon.hash</code>', 'Script <code>support/download/check-hash</code>', 'File vừa tải có đúng là file mình mong đợi không'],
        ['File phụ (<code>S60temp_daemon</code>, <code>*.patch</code>)', 'Chính <code>.mk</code> hoặc bước Patching', 'Những thứ upstream không cung cấp: script khởi động, bản vá cho riêng sản phẩm']
      ] },

    { t: 'p', x:
      'Tên thư mục, tên file <code>.mk</code> và tiền tố biến phải khớp nhau theo một quy tắc cố định: ' +
      'tên package viết thường, nối bằng gạch ngang (<code>temp-daemon</code>); tiền tố biến là tên đó viết hoa, ' +
      'gạch ngang đổi thành gạch dưới (<code>TEMP_DAEMON_</code>). Buildroot <b>suy ra</b> tiền tố từ tên thư mục ' +
      'chứa file <code>.mk</code> — đặt sai một chữ là biến của bạn bị bỏ qua mà không có thông báo nào.' },

    { t: 'p', x:
      'Bộ máy đứng sau gọi là <b>generic-package</b>. Dòng cuối của mọi file <code>.mk</code> — ' +
      '<code>$(eval $(generic-package))</code> — đọc tất cả biến <code>TEMP_DAEMON_…</code> bạn vừa đặt và sinh ra ' +
      'đầy đủ các target của chuỗi stamp mà Bài 60 đã cho bạn xem: <code>.stamp_downloaded</code> → ' +
      '<code>_extracted</code> → <code>_patched</code> → <code>_configured</code> → <code>_built</code> → ' +
      '<code>_target_installed</code>. Bạn không viết một rule Make nào; bạn chỉ điền vào các ô trống. Mỗi ô trống ' +
      'là một <i>biến</i> (một giá trị) hoặc một <i>macro</i> <code>define … endef</code> (một đoạn lệnh shell):' },

    { t: 'fig', cap: 'generic-package biến các biến và macro bạn viết thành chuỗi stamp. Ô nào bạn để trống thì bước đó không làm gì — temp-daemon không có bước configure vì Makefile của nó không cần. Bước Patching thì luôn chạy, và tự tìm patch trong thư mục package và trong BR2_GLOBAL_PATCH_DIR.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Các biến và macro của temp-daemon.mk được generic-package nối vào từng bước stamp">' +
        '<rect class="d-box" x="20" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="70" y="44" text-anchor="middle">download</text>' +
        '<text class="d-ts" x="70" y="62" text-anchor="middle">+ check hash</text>' +
        '<rect class="d-box" x="136" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="186" y="52" text-anchor="middle">extract</text>' +
        '<rect class="d-box-a" x="252" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="302" y="52" text-anchor="middle">patch</text>' +
        '<rect class="d-box" x="368" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="418" y="52" text-anchor="middle">configure</text>' +
        '<rect class="d-box-p" x="484" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="534" y="52" text-anchor="middle">build</text>' +
        '<rect class="d-box-p" x="600" y="20" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="650" y="44" text-anchor="middle">install</text>' +
        '<text class="d-ts" x="650" y="62" text-anchor="middle">target</text>' +
        '<path class="d-line" d="M120 48 H130"/><path class="d-line" d="M236 48 H246"/>' +
        '<path class="d-line" d="M352 48 H362"/><path class="d-line" d="M468 48 H478"/><path class="d-line" d="M584 48 H594"/>' +
        '<path class="d-line" d="M70 76 V112"/><path class="d-line" d="M302 76 V112"/>' +
        '<path class="d-line" d="M418 76 V112"/><path class="d-line" d="M534 76 V112"/><path class="d-line" d="M650 76 V112"/>' +
        '<rect class="d-box" x="20" y="112" width="216" height="76" rx="6"/>' +
        '<text class="d-tm" x="30" y="132">_VERSION  _SOURCE</text>' +
        '<text class="d-tm" x="30" y="150">_SITE  _SITE_METHOD</text>' +
        '<text class="d-tm" x="30" y="168">temp-daemon.hash</text>' +
        '<rect class="d-box-a" x="252" y="112" width="100" height="76" rx="6"/>' +
        '<text class="d-tm" x="262" y="136">patches/</text>' +
        '<text class="d-ts" x="262" y="156">tự tìm, không</text>' +
        '<text class="d-ts" x="262" y="172">cần biến nào</text>' +
        '<rect class="d-box-w" x="368" y="112" width="100" height="76" rx="6"/>' +
        '<text class="d-tm" x="378" y="136">_CONFIGURE</text>' +
        '<text class="d-tm" x="378" y="152">_CMDS</text>' +
        '<text class="d-ts" x="378" y="172">để trống</text>' +
        '<rect class="d-box-p" x="484" y="112" width="100" height="76" rx="6"/>' +
        '<text class="d-tm" x="494" y="136">_BUILD</text>' +
        '<text class="d-tm" x="494" y="152">_CMDS</text>' +
        '<rect class="d-box-p" x="600" y="112" width="100" height="76" rx="6"/>' +
        '<text class="d-tm" x="606" y="132">_INSTALL_</text>' +
        '<text class="d-tm" x="606" y="148">TARGET_CMDS</text>' +
        '<text class="d-tm" x="606" y="168">_INSTALL_</text>' +
        '<text class="d-tm" x="606" y="182">INIT_SYSV</text>' +
        '<rect class="d-box-g" x="20" y="214" width="680" height="64" rx="8"/>' +
        '<text class="d-t" x="360" y="238" text-anchor="middle">$(eval $(generic-package))</text>' +
        '<text class="d-ts" x="360" y="260" text-anchor="middle">đọc mọi biến TEMP_DAEMON_… → sinh target temp-daemon, temp-daemon-dirclean, -rebuild, … và các stamp</text>' +
        '</svg>' },

    { t: 'p', x:
      'Đây là file <code>.mk</code> hoàn chỉnh mà phần thực hành sẽ dùng. Đọc nó một lần bây giờ; bước 2 sẽ mổ ' +
      'xẻ từng dòng:' },

    { t: 'code', where: 'file', name: 'br-ext/package/temp-daemon/temp-daemon.mk', lang: 'make', nocopy: true, code:
      '################################################################################\n' +
      '#\n' +
      '# temp-daemon\n' +
      '#\n' +
      '################################################################################\n' +
      '\n' +
      'TEMP_DAEMON_VERSION = 1.0\n' +
      'TEMP_DAEMON_SOURCE = temp-daemon-$(TEMP_DAEMON_VERSION).tar.gz\n' +
      'TEMP_DAEMON_SITE = $(HOME)/bai61/upstream\n' +
      'TEMP_DAEMON_SITE_METHOD = file\n' +
      'TEMP_DAEMON_LICENSE = MIT\n' +
      '\n' +
      'define TEMP_DAEMON_BUILD_CMDS\n' +
      '\t$(MAKE) $(TARGET_CONFIGURE_OPTS) -C $(@D)\n' +
      'endef\n' +
      '\n' +
      'define TEMP_DAEMON_INSTALL_TARGET_CMDS\n' +
      '\t$(MAKE) -C $(@D) DESTDIR=$(TARGET_DIR) install\n' +
      'endef\n' +
      '\n' +
      'define TEMP_DAEMON_INSTALL_INIT_SYSV\n' +
      '\t$(INSTALL) -D -m 0755 $(TEMP_DAEMON_PKGDIR)/S60temp_daemon \\\n' +
      '\t\t$(TARGET_DIR)/etc/init.d/S60temp_daemon\n' +
      'endef\n' +
      '\n' +
      '$(eval $(generic-package))' },

    { t: 'p', x:
      'Ba điều cần thấy ngay. Một: không có dòng nào nhắc tới <code>aarch64</code>, gcc 14.3.0 hay sysroot. Toàn bộ ' +
      'chuyện "build chéo cho đúng máy đích" nằm trong một biến: <code>$(TARGET_CONFIGURE_OPTS)</code>, mà Buildroot ' +
      'điền sẵn <code>CC=…/aarch64-buildroot-linux-gnu-gcc</code>, <code>CFLAGS=…</code>, <code>STRIP=…</code> và ' +
      'hơn hai chục biến khác. Hai: <code>$(@D)</code> là thư mục build của package, ' +
      '<code>output/build/temp-daemon-1.0</code> — đúng nơi tarball được giải nén. Ba: không có gì được cài thẳng ' +
      'vào ảnh; mọi thứ đi vào <code>$(TARGET_DIR)</code> = <code>output/target</code>, và chỉ bước đóng ảnh cuối ' +
      'cùng mới biến nó thành ext4 với quyền <code>root</code> nhờ <code>fakeroot</code> (Bài 60).' },

    { t: 'cal', kind: 'why', title: 'Vì sao chương trình của bạn phải tôn trọng CC, CFLAGS và DESTDIR',
      x: '<code>$(TARGET_CONFIGURE_OPTS)</code> chỉ có tác dụng nếu Makefile của chương trình <b>dùng</b> các biến đó. ' +
         'Một Makefile viết cứng <code>gcc -o temp_daemon …</code> sẽ âm thầm build ra một file x86-64 ngay trong ' +
         'hệ thống ARM64 — bước 1 kiểm chứng điều này ở chiều ngược lại. Tương tự, <code>DESTDIR</code> là quy ước ' +
         'chung của mọi dự án tử tế: "cài vào thư mục này như thể nó là <code>/</code>". Đây là lý do Bài 59 nói ' +
         'build system chỉ tốt bằng đầu vào của nó: một package Buildroot sạch đòi hỏi chương trình bên dưới cũng ' +
         'được viết để build chéo được.' },

    { t: 'p', x:
      'Còn file <code>.hash</code> thì sao? Mỗi dòng gồm thuật toán, giá trị và tên file. Với tarball của chính ' +
      'bạn, không có ai công bố checksum, nên dòng đầu ghi <code># Locally computed</code> — quy ước của Buildroot cho ' +
      '"tôi tự tính giá trị này lúc thêm package". Ý nghĩa vẫn y nguyên: từ giờ, nếu tarball tên ' +
      '<code>temp-daemon-1.0.tar.gz</code> có nội dung khác, build sẽ dừng. Cái <code>sha256sum -c</code> của ' +
      'Bài 59 và Bài 60 giờ được gắn vào package, chạy tự động ở mỗi lần tải.' },

    { t: 'cal', kind: 'warn', title: 'Không có file .hash thì chỉ là một WARNING',
      x: 'Defconfig của Bài 60 có <code>BR2_DOWNLOAD_FORCE_CHECK_HASHES=y</code>, nghe như "bắt buộc phải có hash". ' +
         'Thực tế không phải vậy: tuỳ chọn đó chỉ xoá ngoại lệ dành cho các package dùng phiên bản tự chọn (như ' +
         'kernel <code>6.18.7</code> của Bài 60), để cả chúng cũng phải có dòng hash. Khi cả file <code>.hash</code> ' +
         'không tồn tại, script ' +
         '<code>support/download/check-hash</code> in <code>WARNING: no hash file for …</code> và trả về 0 — build ' +
         'chạy tiếp. Bước 2 cho bạn thấy đúng dòng đó. Vì vậy luôn tạo <code>.hash</code> cùng lúc với ' +
         '<code>.mk</code>, đừng để "lúc nào rảnh".' },

    /* ============================================================
       LÝ THUYẾT 3 — PATCH VÀ STAMP
       ============================================================ */
    { t: 'h2', x: 'Thư mục patches/: sửa mã nguồn mà không sửa tarball' },

    { t: 'p', x:
      'Sớm muộn bạn sẽ cần sửa mã nguồn của một package: vá một lỗi upstream chưa phát hành, thêm một tuỳ chọn ' +
      'chỉ sản phẩm của bạn cần. Bạn không được sửa tarball — hash sẽ sai, đúng như bạn muốn. Bạn cũng không được ' +
      'sửa trong <code>output/build/…</code> — lần <code>dirclean</code> kế tiếp xoá nó. Cách đúng là giữ thay đổi ' +
      'dưới dạng một <b>file patch</b>, và để Buildroot áp nó ở bước Patching, ngay sau khi giải nén. Đây là cùng ' +
      'kỹ thuật bạn đã dùng với <code>git am</code> và <code>patch -p1</code> ở Bài 34; Buildroot tự làm bước đó ' +
      'cho bạn ở mỗi lần build.' },

    { t: 'p', x:
      'Bước Patching tìm patch ở hai loại nơi, theo thứ tự: thư mục của chính package ' +
      '(<code>package/temp-daemon/*.patch</code>), rồi từng thư mục trong <code>BR2_GLOBAL_PATCH_DIR</code> cộng ' +
      'thêm tên package (<code>…/patches/temp-daemon/*.patch</code>). Mọi file <code>*.patch</code> được áp theo thứ ' +
      'tự tên — vì vậy chúng luôn bắt đầu bằng <code>0001-</code>, <code>0002-</code>. Bài 60 đã có sẵn một ' +
      'thư mục như vậy: <code>BR2_GLOBAL_PATCH_DIR="board/qemu/patches"</code> trong defconfig, chứa patch cho ' +
      '<code>gcc-final</code>, <code>linux</code>, <code>uboot</code>… Bạn chỉ việc thêm thư mục của mình vào sau, ' +
      'cách nhau bằng dấu cách.' },

    { t: 'table',
      head: ['Đặt patch ở đâu', 'Khi nào dùng'],
      rows: [
        ['<code>package/&lt;pkg&gt;/</code> cạnh file <code>.mk</code>', 'Package <b>của bạn</b>, patch là một phần của công thức. Đi kèm package khi bạn chép nó sang dự án khác'],
        ['<code>BR2_GLOBAL_PATCH_DIR/&lt;pkg&gt;/</code>', 'Vá một package <b>có sẵn</b> của Buildroot (busybox, linux…) mà không chạm vào cây Buildroot. Đây là cách duy nhất sạch sẽ để làm việc đó'],
        ['<code>BR2_GLOBAL_PATCH_DIR/&lt;pkg&gt;/&lt;version&gt;/</code>', 'Patch chỉ đúng cho một phiên bản. Khi có thư mục con trùng <code>_VERSION</code>, Buildroot dùng nó thay cho thư mục cha']
      ] },

    { t: 'p', x:
      'Bài này đặt patch vào <code>BR2_GLOBAL_PATCH_DIR</code> dù <code>temp-daemon</code> là package của bạn, để ' +
      'bạn tập đúng cơ chế mà bạn sẽ dùng cho package của người khác. Thay đổi trong patch rất nhỏ: cho ' +
      '<code>temp_daemon</code> nhận số cổng từ tham số dòng lệnh, mặc định vẫn 9006.' },

    { t: 'cal', kind: 'danger', title: 'make thường không áp patch mới — và không báo gì cả',
      x: 'Patch chỉ được áp ở bước tạo <code>.stamp_patched</code>. Nếu package đã build từ trước, stamp đó đã có, và ' +
         '<code>make</code>, <code>make temp-daemon-rebuild</code> (xoá từ <code>.stamp_built</code>), ' +
         '<code>make temp-daemon-reconfigure</code> (xoá từ <code>.stamp_configured</code>) đều <b>đi vòng qua</b> ' +
         'nó. Bước 4 đo đúng ba trường hợp này: cả ba thoát mã 0, và mã nguồn trong ' +
         '<code>output/build/temp-daemon-1.0</code> vẫn chưa có thay đổi. Chỉ ' +
         '<code>make temp-daemon-dirclean</code> — xoá cả thư mục build, buộc giải nén lại — mới làm bước Patching ' +
         'chạy lại. Quy tắc dễ nhớ: <b>thêm hoặc sửa patch → dirclean</b>.' },

    { t: 'p', x:
      'Bảng dưới gom các target theo từng package mà Bài 60 mới nhắc tên. Mỗi cái xoá chuỗi stamp từ một điểm trở ' +
      'đi; điểm bắt đầu quyết định bước nào chạy lại:' },

    { t: 'table',
      head: ['Lệnh', 'Xoá stamp từ', 'Chạy lại', 'Dùng khi'],
      rows: [
        ['<code>make &lt;pkg&gt;-reinstall</code>', '<code>*_installed</code>', 'chỉ install', 'Sửa macro <code>_INSTALL_…_CMDS</code> hoặc script <code>S60…</code>'],
        ['<code>make &lt;pkg&gt;-rebuild</code>', '<code>.stamp_built</code>', 'build + install', 'Sửa <code>_BUILD_CMDS</code>, hoặc sửa tay mã trong <code>output/build</code> để thử nhanh'],
        ['<code>make &lt;pkg&gt;-reconfigure</code>', '<code>.stamp_configured</code>', 'configure + build + install', 'Đổi tuỳ chọn configure của package (Bài 60 bước 6)'],
        ['<code>make &lt;pkg&gt;-dirclean</code>', 'xoá cả <code>output/build/&lt;pkg&gt;-&lt;ver&gt;</code>', 'mọi bước, kể cả extract + patch', 'Thêm/sửa patch, đổi phiên bản hoặc tarball']
      ] },

    { t: 'cal', kind: 'tip', title: 'Đừng nhớ bảng — đọc tên stamp',
      x: 'Bạn không cần thuộc bảng trên. Mỗi target xoá stamp mang đúng tên bước của nó, và bạn luôn có thể xem ' +
         'stamp nào đang có bằng <code>ls -a output/build/temp-daemon-1.0/</code>. Chỉ cần nhớ nguyên tắc: một bước ' +
         'chạy lại khi và chỉ khi stamp của nó vắng mặt. Muốn bước Patching chạy, phải làm stamp patched biến mất — ' +
         'và chỉ <code>dirclean</code> làm được điều đó.' },

    /* ============================================================
       LÝ THUYẾT 4 — OVERLAY, POST-BUILD, POST-IMAGE
       ============================================================ */
    { t: 'h2', x: 'Overlay, post-build, post-image: ba cái móc quanh output/target' },

    { t: 'p', x:
      'Không phải mọi thay đổi đều là một chương trình cần build. Một file cấu hình, một dòng chào mừng, việc xoá ' +
      'một script khởi động không cần — những thứ đó thuộc về <b>rootfs</b>, không thuộc về package nào. Buildroot ' +
      'có ba cái móc cho việc này, chạy ở ba thời điểm khác nhau sau khi mọi package đã cài xong:' },

    { t: 'fig', cap: 'Thứ tự trong bước target-finalize và sau đó: overlay được chép trước, rồi script post-build chạy trên output/target đã có overlay, rồi ảnh mới được đóng. post-image chạy khi ảnh đã nằm trong output/images — sửa rootfs ở đó là quá muộn.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Thứ tự: package cài vào target, chép overlay, chạy post-build, đóng ảnh, chạy post-image">' +
        '<rect class="d-box" x="20" y="30" width="120" height="70" rx="8"/>' +
        '<text class="d-t" x="80" y="58" text-anchor="middle">package</text>' +
        '<text class="d-ts" x="80" y="78" text-anchor="middle">cài vào target</text>' +
        '<path class="d-line" d="M140 65 H152"/><path class="d-arrow" d="M160 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="160" y="30" width="120" height="70" rx="8"/>' +
        '<text class="d-t" x="220" y="58" text-anchor="middle">overlay</text>' +
        '<text class="d-ts" x="220" y="78" text-anchor="middle">rsync file tĩnh</text>' +
        '<path class="d-line" d="M280 65 H292"/><path class="d-arrow" d="M300 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="300" y="30" width="120" height="70" rx="8"/>' +
        '<text class="d-t" x="360" y="58" text-anchor="middle">post-build</text>' +
        '<text class="d-ts" x="360" y="78" text-anchor="middle">script, $1 = target</text>' +
        '<path class="d-line" d="M420 65 H432"/><path class="d-arrow" d="M440 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-g" x="440" y="30" width="120" height="70" rx="8"/>' +
        '<text class="d-t" x="500" y="58" text-anchor="middle">đóng ảnh</text>' +
        '<text class="d-ts" x="500" y="78" text-anchor="middle">fakeroot + mkfs</text>' +
        '<path class="d-line" d="M560 65 H572"/><path class="d-arrow" d="M580 65 l-8 -5 v10 z"/>' +
        '<rect class="d-box-w" x="580" y="30" width="120" height="70" rx="8"/>' +
        '<text class="d-t" x="640" y="58" text-anchor="middle">post-image</text>' +
        '<text class="d-ts" x="640" y="78" text-anchor="middle">$1 = images</text>' +
        '<rect class="d-box" x="160" y="130" width="400" height="100" rx="8"/>' +
        '<text class="d-t" x="360" y="154" text-anchor="middle">cùng một thư mục: output/target</text>' +
        '<text class="d-ts" x="360" y="176" text-anchor="middle">overlay và post-build chạy lại ở MỌI lần make (Bài 60: 7 bước cuối)</text>' +
        '<text class="d-ts" x="360" y="196" text-anchor="middle">nên chúng phải cho cùng kết quả dù chạy một hay mười lần</text>' +
        '<text class="d-ts" x="360" y="216" text-anchor="middle">post-image dùng để tạo ảnh đĩa, ký, nén — không để sửa rootfs</text>' +
        '<path class="d-line" d="M220 100 V130"/><path class="d-line" d="M360 100 V130"/><path class="d-line" d="M500 100 V130"/>' +
        '</svg>' },

    { t: 'table',
      head: ['Cái móc', 'Là gì', 'Hợp với', 'Không hợp với'],
      rows: [
        ['<b>Overlay</b> <code>BR2_ROOTFS_OVERLAY</code>', 'Một cây thư mục giống <code>/</code>; được <code>rsync</code> đè lên <code>output/target</code>', 'File tĩnh: <code>/etc/motd</code>, file cấu hình, chứng chỉ, một script nhỏ', 'Thứ cần tính toán lúc build, hoặc cần <b>xoá</b> file — overlay chỉ thêm và đè'],
        ['<b>Post-build</b> <code>BR2_ROOTFS_POST_BUILD_SCRIPT</code>', 'Một script shell; tham số <code>$1</code> là <code>output/target</code>', 'Sinh file có nội dung động (ngày build, phiên bản), xoá file thừa, sửa file mà package đã cài', 'Build một chương trình — đó là việc của package'],
        ['<b>Post-image</b> <code>BR2_ROOTFS_POST_IMAGE_SCRIPT</code>', 'Một script; <code>$1</code> là <code>output/images</code>', 'Ghép ảnh SD card, tạo <code>start-qemu.sh</code> (defconfig của Bài 60 đã dùng nó), ký ảnh', 'Sửa rootfs: ảnh đã đóng xong rồi']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao /etc/default/temp_daemon thuộc overlay, còn S60temp_daemon thuộc package',
      x: 'Script khởi động là một phần của <i>chương trình</i>: mọi sản phẩm dùng <code>temp_daemon</code> đều cần nó, ' +
         'nên nó đi theo package. Số cổng 9100 là một quyết định của <i>sản phẩm này</i>: một sản phẩm khác dùng ' +
         'cùng package có thể muốn 9006. Tách ra như vậy, package dùng lại được ở mọi nơi, còn overlay mang các ' +
         'giá trị riêng của từng thiết bị. Script <code>S60temp_daemon</code> đọc ' +
         '<code>/etc/default/temp_daemon</code> nếu có — đúng quy ước các script của chính BusyBox trong Buildroot ' +
         '(<code>S50crond</code>) đang dùng.' },

    /* ============================================================
       LÝ THUYẾT 5 — SAVEDEFCONFIG
       ============================================================ */
    { t: 'h2', x: 'savedefconfig: cả hệ thống trong một file nhỏ' },

    { t: 'p', x:
      'Bài 60 đã dạy chiều đi của defconfig: 18 dòng <code>qemu_aarch64_virt_defconfig</code> bung ra thành ' +
      '<code>.config</code> 5 270 dòng, vì Kconfig điền giá trị mặc định cho mọi symbol không được nhắc tới. ' +
      '<code>make savedefconfig</code> là <b>chiều về</b>: nó đọc <code>.config</code> hiện tại và chỉ ghi lại những ' +
      'symbol khác giá trị mặc định. Kết quả nhỏ, đọc được bằng mắt, và <code>diff</code> giữa hai phiên bản cho ' +
      'bạn thấy đúng những quyết định đã thay đổi — không lẫn trong 5 000 dòng nhiễu. Đó là file bạn commit vào ' +
      'Git; <code>.config</code> thì không bao giờ.' },

    { t: 'p', x:
      'Câu hỏi duy nhất là: savedefconfig ghi <b>vào đâu</b>? Nó ghi vào đường dẫn trong biến ' +
      '<code>BR2_DEFCONFIG</code>, và biến đó mặc định là file defconfig bạn đã nạp lần trước. Sau ' +
      '<code>make qemu_aarch64_virt_defconfig</code> ở Bài 60, giá trị ấy là ' +
      '<code>…/buildroot-2026.02.3/configs/qemu_aarch64_virt_defconfig</code> — một file của chính Buildroot.' },

    { t: 'cal', kind: 'danger', title: 'make savedefconfig trống trơn ghi đè defconfig của Buildroot',
      x: 'Gõ <code>make savedefconfig</code> mà không chỉ định gì, ngay trên cây Bài 60, và nó sẽ âm thầm viết ' +
         'cấu hình của bạn — kể cả các đường dẫn <code>$(BR2_EXTERNAL_LEARN_PATH)</code> — đè lên ' +
         '<code>configs/qemu_aarch64_virt_defconfig</code>. Thoát mã 0, không cảnh báo. Bước 6 kiểm chứng: file đó ' +
         'từ 18 dòng thành 22 dòng. Cây Buildroot của bạn giờ đã bị sửa, đúng điều cây br2-external sinh ra để ' +
         'tránh. Luôn chỉ định đích: <code>make savedefconfig BR2_DEFCONFIG=$(đường dẫn trong cây của bạn)</code>, ' +
         'hoặc nạp defconfig từ cây br2-external để <code>BR2_DEFCONFIG</code> tự trỏ về đó.' },

    { t: 'p', x:
      'Một defconfig đặt trong <code>configs/</code> của cây br2-external được Buildroot nhận ra như defconfig của ' +
      'chính nó: <code>make list-defconfigs</code> liệt kê nó dưới tiêu đề lấy từ dòng <code>desc:</code>, và ' +
      '<code>make learn_qemu_defconfig</code> nạp nó y như <code>make qemu_aarch64_virt_defconfig</code>. Ghép ba ' +
      'mảnh lại — một cây Buildroot gốc, một cây br2-external, một defconfig — là bạn có công thức hoàn chỉnh của ' +
      'sản phẩm:' },

    { t: 'code', where: 'wsl', nocopy: true, code:
      'cd buildroot-2026.02.3\n' +
      'make O=$HOME/bai61/out BR2_EXTERNAL=$HOME/bai61/br-ext learn_qemu_defconfig\n' +
      'make O=$HOME/bai61/out' },

    { t: 'p', x:
      'Tuỳ chọn <code>O=</code> (output) đặt toàn bộ sản phẩm vào một thư mục khác <code>output/</code> mặc định — ' +
      'đúng ý tưởng <code>make O=…</code> của kernel ở Bài 41. Nhờ đó một cây Buildroot phục vụ được nhiều cấu hình ' +
      'cùng lúc, mỗi cái một thư mục output, dùng chung một <code>dl/</code>. Bước 6 dùng nó để chứng minh cột mốc ' +
      'M10 trong một thư mục trống hoàn toàn, mà không đụng tới <code>output/</code> của Bài 60.' },

    { t: 'terms', items: [
      ['br2-external', '', 'Một cây thư mục nằm ngoài Buildroot, chứa package, patch, overlay, script và defconfig của dự án. Được nạp bằng <code>BR2_EXTERNAL=đường_dẫn</code>, nhớ trong <code>output/.br2-external.mk</code>'],
      ['generic-package', '', 'Hạ tầng của Buildroot cho package tự viết lệnh build. Các biến thể khác (<code>autotools-package</code>, <code>cmake-package</code>…) điền sẵn các macro build cho từng kiểu dự án'],
      ['<code>$(@D)</code>', '', 'Trong macro của package: thư mục build của nó, <code>output/build/&lt;pkg&gt;-&lt;version&gt;</code>'],
      ['<code>TARGET_CONFIGURE_OPTS</code>', '', 'Biến chứa <code>CC</code>, <code>CFLAGS</code>, <code>LD</code>, <code>STRIP</code>… trỏ tới toolchain chéo của Buildroot. Truyền nó cho <code>make</code> của chương trình là build chéo'],
      ['Overlay rootfs', '', 'Một cây thư mục được chép đè lên <code>output/target</code> trước khi đóng ảnh'],
      ['Post-build script', '', 'Script chạy sau overlay, trước khi đóng ảnh; <code>$1</code> là <code>output/target</code>'],
      ['<code>savedefconfig</code>', '', 'Ghi <code>.config</code> hiện tại thành defconfig tối thiểu, vào đường dẫn <code>BR2_DEFCONFIG</code>']
    ] },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: đưa temp_daemon vào Buildroot và dựng lại cả hệ thống từ một defconfig' },

    { t: 'p', x:
      'Mọi lệnh <code>make</code> dưới đây chạy trong <code>~/bai60/buildroot-2026.02.3</code> — đúng cây Bài 60 bảo ' +
      'bạn giữ lại. Nhờ <code>dl/</code> (1,2 GB) và toolchain gcc 14.3.0 đã nằm sẵn trong <code>output/host</code>, ' +
      'mỗi lần build lại ở bước 2–5 chỉ mất <b>12–16 giây</b> thay vì 25 phút. Mọi file của bạn nằm trong ' +
      '<code>~/bai61</code>. Mở một terminal WSL và đặt lại <code>PATH</code> sạch như Bài 60 (WSL lại nối ' +
      '<code>PATH</code> của Windows vào mỗi shell mới):' },

    { t: 'code', where: 'wsl', code:
      'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
      'mkdir -p ~/bai61/upstream/temp-daemon-1.0' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Chuẩn bị "upstream": một tarball temp_daemon build chéo được',
        blocks: [
          { t: 'p', x:
            'Một package Buildroot luôn trỏ tới mã nguồn mà <b>ai đó phát hành</b>: một tarball trên một trang web, ' +
            'một tag Git. Bạn sẽ đóng cả hai vai — tác giả phát hành và người đóng gói — nên trước hết hãy làm phần ' +
            'của tác giả: lấy <code>temp_daemon.c</code> 152 dòng (bản bạn viết ở Bài 24 và đã build static ở ' +
            'Bài 49), thêm một <code>Makefile</code>, và đóng thành <code>temp-daemon-1.0.tar.gz</code>. Chép mã ' +
            'nguồn từ nơi bạn còn giữ nó (bài soạn dùng <code>~/bai49</code>):' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai61/upstream\n' +
            'cp ~/bai49/temp_daemon.c temp-daemon-1.0/\n' +
            'wc -l temp-daemon-1.0/temp_daemon.c' },

          { t: 'code', where: 'out', nocopy: true, code: '152 temp-daemon-1.0/temp_daemon.c' },

          { t: 'p', x:
            '152 dòng — đúng bản của Bài 24, không sửa gì. Giờ viết <code>Makefile</code> cho nó. Đây là phần quyết ' +
            'định chương trình có đóng gói được hay không, nên mỗi dòng đều có lý do (dòng bắt đầu bằng ' +
            '<kbd>Tab</kbd> phải là ký tự Tab thật, như mọi Makefile):' },

          { t: 'code', where: 'file', name: '~/bai61/upstream/temp-daemon-1.0/Makefile', lang: 'make', code:
            '# Makefile for temp_daemon\n' +
            'CFLAGS ?= -O2\n' +
            'PREFIX ?= /usr\n' +
            '\n' +
            'all: temp_daemon\n' +
            '\n' +
            'temp_daemon: temp_daemon.c\n' +
            '\t$(CC) $(CFLAGS) -Wall -Wextra -pthread $(LDFLAGS) -o $@ $<\n' +
            '\n' +
            'install: temp_daemon\n' +
            '\tinstall -D -m 0755 temp_daemon $(DESTDIR)$(PREFIX)/bin/temp_daemon\n' +
            '\n' +
            'clean:\n' +
            '\trm -f temp_daemon\n' +
            '\n' +
            '.PHONY: all install clean' },

          { t: 'cmdx', cmd: 'Makefile của temp_daemon', title: 'Vì sao mỗi dòng viết như vậy', rows: [
            ['CFLAGS ?= -O2', '<code>?=</code> chỉ gán khi biến <b>chưa</b> có giá trị. Buildroot truyền <code>CFLAGS</code> riêng của nó (<code>-O2 -g0 -D_FORTIFY_SOURCE=1 …</code>) và giá trị đó thắng'],
            ['$(CC)', 'Không viết cứng <code>gcc</code>. <code>make</code> có sẵn <code>CC=cc</code>; Buildroot ghi đè bằng <code>aarch64-buildroot-linux-gnu-gcc</code>'],
            ['-Wall -Wextra -pthread', 'Những cờ chương trình <b>luôn</b> cần, viết ngoài <code>$(CFLAGS)</code> để không ai ghi đè mất được — thiếu <code>-pthread</code> là link lỗi'],
            ['$(LDFLAGS)', 'Chỗ để build system chèn cờ link (Buildroot để trống với cấu hình này, nhưng một cấu hình khác có thể cần)'],
            ['$(DESTDIR)$(PREFIX)/bin', 'Cài vào <code>/usr/bin</code> <i>bên trong</i> <code>DESTDIR</code>. Không có <code>DESTDIR</code> thì cài vào <code>/usr/bin</code> của máy build'],
            ['install -D -m 0755', '<code>-D</code> tự tạo thư mục cha; <code>-m 0755</code> đặt quyền một lần, không cần <code>chmod</code> sau']
          ] },

          { t: 'p', x:
            'Kiểm tra lời hứa "tôn trọng <code>CC</code>" trước khi giao cho Buildroot. Build hai lần: lần đầu bằng ' +
            'trình biên dịch mặc định, lần hai đổi <code>CC</code> sang cross-compiler của Ubuntu mà bạn đã dùng từ ' +
            'Chặng 04:' },

          { t: 'code', where: 'wsl', code:
            'make -C temp-daemon-1.0 && file temp-daemon-1.0/temp_daemon\n' +
            'make -C temp-daemon-1.0 clean\n' +
            'make -C temp-daemon-1.0 CC=aarch64-linux-gnu-gcc && file temp-daemon-1.0/temp_daemon\n' +
            'make -C temp-daemon-1.0 clean' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make: Entering directory \'/home/cah8hc/bai61/upstream/temp-daemon-1.0\'\n' +
            'cc -O2 -Wall -Wextra -pthread  -o temp_daemon temp_daemon.c\n' +
            'make: Leaving directory \'/home/cah8hc/bai61/upstream/temp-daemon-1.0\'\n' +
            'temp-daemon-1.0/temp_daemon: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=…, for GNU/Linux 3.2.0, not stripped\n' +
            '…\n' +
            'aarch64-linux-gnu-gcc -O2 -Wall -Wextra -pthread  -o temp_daemon temp_daemon.c\n' +
            '…\n' +
            'temp-daemon-1.0/temp_daemon: ELF 64-bit LSB shared object, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=…, for GNU/Linux 3.7.0, not stripped' },

          { t: 'p', x:
            'Cùng một Makefile, hai kiến trúc: <code>x86-64</code> rồi <code>ARM aarch64</code>, chỉ vì một biến đổi ' +
            'giá trị. Đó chính là cái móc Buildroot sẽ dùng. Đường dẫn <code>/home/cah8hc</code> là tên user của ' +
            'máy soạn bài — trên máy bạn nó là thư mục home của bạn. Lệnh <code>clean</code> cuối cùng quan trọng: ' +
            'không được để file nhị phân lọt vào tarball.' },

          { t: 'p', x:
            'Bây giờ đóng tarball. Hãy làm nó <b>tái lập được</b> bằng đúng các cờ Bài 59 đã kiểm chứng — để hash ' +
            'bạn ghi vào package ở bước 3 không đổi mỗi khi bạn đóng lại:' },

          { t: 'code', where: 'wsl', code:
            'tar -C ~/bai61/upstream --owner=0 --group=0 --sort=name --mtime=@1700000000 \\\n' +
            '    -czf temp-daemon-1.0.tar.gz temp-daemon-1.0\n' +
            'tar tvzf temp-daemon-1.0.tar.gz\n' +
            'sha256sum temp-daemon-1.0.tar.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            'drwxr-xr-x root/root         0 2023-11-15 05:13 temp-daemon-1.0/\n' +
            '-rw-r--r-- root/root       306 2023-11-15 05:13 temp-daemon-1.0/Makefile\n' +
            '-rw-r--r-- root/root      5829 2023-11-15 05:13 temp-daemon-1.0/temp_daemon.c\n' +
            'cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef  temp-daemon-1.0.tar.gz' },

          { t: 'cmdx', cmd: 'tar … --owner=0 --group=0 --sort=name --mtime=@1700000000 -czf', rows: [
            ['-C ~/bai61/upstream', 'Đổi vào thư mục này trước khi đóng, để đường dẫn trong tarball bắt đầu bằng <code>temp-daemon-1.0/</code> — Buildroot bỏ đúng một cấp thư mục đầu khi giải nén'],
            ['--owner=0 --group=0', 'Ghi chủ là <code>root/root</code> thay vì user của bạn — người khác đóng lại cũng ra cùng byte'],
            ['--sort=name', 'Thứ tự file cố định, không phụ thuộc thứ tự trên đĩa (lỗ rò hệ thống file của Bài 59)'],
            ['--mtime=@1700000000', 'Mọi file mang cùng một thời điểm cố định: 2023-11-14 22:13:20 UTC'],
            ['-czf', 'Tạo (<code>c</code>) file nén gzip (<code>z</code>) tên là (<code>f</code>) …']
          ] },

          { t: 'p', x:
            'Ba điều trong kết quả. Chủ <code>root/root</code> và thời điểm giống hệt nhau cho cả ba mục, đúng như các ' +
            'cờ yêu cầu — giờ hiển thị là <code>05:13</code> vì <code>tar tvzf</code> đổi sang múi giờ +07 của máy ' +
            'soạn bài; trên máy ở múi giờ khác bạn sẽ thấy giờ khác cho cùng một tarball. <code>Makefile</code> nặng ' +
            '<b>306</b> byte và <code>temp_daemon.c</code> <b>5 829</b> byte. Và sha256 <code>cdc7160c…</code>: nếu ' +
            'Makefile và <code>temp_daemon.c</code> của bạn giống từng byte với bài này, bạn sẽ được đúng giá trị đó ' +
            '— bài soạn đã đóng lại lần hai và nhận cùng hash. Nếu khác (ví dụ bạn gõ lại Makefile với một dấu cách ' +
            'thừa), hash của bạn khác, và đó là hash bạn sẽ dùng ở bước 3.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Tạo cây br2-external và package temp-daemon, build nó lần đầu',
        blocks: [
          { t: 'p', x:
            'Giờ đổi vai sang người đóng gói. Tạo khung cây br2-external với ba file bắt buộc. Mỗi file chỉ một ' +
            'hai dòng, nên <code>printf</code> là đủ:' },

          { t: 'code', where: 'wsl', code:
            'E=~/bai61/br-ext\n' +
            'mkdir -p $E/package/temp-daemon $E/configs $E/board/learn\n' +
            "printf 'name: LEARN\\ndesc: Embedded Linux course - lesson 61\\n' > $E/external.desc\n" +
            "printf 'source \"$BR2_EXTERNAL_LEARN_PATH/package/temp-daemon/Config.in\"\\n' > $E/Config.in\n" +
            "printf 'include $(sort $(wildcard $(BR2_EXTERNAL_LEARN_PATH)/package/*/*.mk))\\n' > $E/external.mk\n" +
            'cat $E/external.desc $E/Config.in $E/external.mk' },

          { t: 'code', where: 'out', nocopy: true, code:
            'name: LEARN\n' +
            'desc: Embedded Linux course - lesson 61\n' +
            'source "$BR2_EXTERNAL_LEARN_PATH/package/temp-daemon/Config.in"\n' +
            'include $(sort $(wildcard $(BR2_EXTERNAL_LEARN_PATH)/package/*/*.mk))' },

          { t: 'p', x:
            'Bốn dòng, đúng như bảng ở phần lý thuyết. Chú ý <code>$BR2_EXTERNAL_LEARN_PATH</code> vẫn còn nguyên ' +
            'chữ trong file: dấu nháy đơn của <code>printf</code> ngăn shell thay giá trị. Biến này không tồn tại ' +
            'trong shell của bạn — chỉ Kconfig và Make của Buildroot đặt nó, ở lúc đọc file. ' +
            '<code>$(sort $(wildcard …))</code> nghĩa là "mọi file <code>.mk</code> có trong <code>package/*/</code>, ' +
            'theo thứ tự tên", nên thêm package thứ hai sau này không cần sửa <code>external.mk</code>.' },

          { t: 'p', x:
            'Tiếp theo là ba file của package. Đầu tiên <code>Config.in</code> — mục menu cho package:' },

          { t: 'code', where: 'file', name: '~/bai61/br-ext/package/temp-daemon/Config.in', code:
            'config BR2_PACKAGE_TEMP_DAEMON\n' +
            '\tbool "temp-daemon"\n' +
            '\tdepends on BR2_TOOLCHAIN_HAS_THREADS\n' +
            '\thelp\n' +
            '\t  Temperature daemon from lesson 24: one sensor thread,\n' +
            '\t  one epoll loop, answers on TCP port 9006.\n' +
            '\n' +
            'comment "temp-daemon needs a toolchain w/ threads"\n' +
            '\tdepends on !BR2_TOOLCHAIN_HAS_THREADS' },

          { t: 'cmdx', cmd: 'Config.in của temp-daemon', rows: [
            ['config BR2_PACKAGE_TEMP_DAEMON', 'Tên symbol phải đúng là <code>BR2_PACKAGE_</code> + tiền tố của package. Buildroot dùng chính symbol này để quyết định có đưa <code>temp-daemon</code> vào build hay không'],
            ['bool "temp-daemon"', 'Kiểu bật/tắt, kèm chữ hiện trong menu'],
            ['depends on BR2_TOOLCHAIN_HAS_THREADS', '<code>temp_daemon</code> dùng <code>pthread_create</code> (Bài 22). Một toolchain không có thread thì symbol này bị ẩn hẳn, thay vì cho build rồi lỗi link'],
            ['help', 'Văn bản hiện khi bạn bấm <kbd>?</kbd> trên mục này trong menuconfig'],
            ['comment … depends on !…', 'Quy ước của Buildroot: khi package bị ẩn vì thiếu điều kiện, hiện một dòng chú thích nói lý do — để người dùng không phải đoán vì sao không tìm thấy nó']
          ] },

          { t: 'p', x:
            'File thứ hai là <code>temp-daemon.mk</code> — đúng 26 dòng bạn đã đọc ở phần lý thuyết. Tạo nó bằng ' +
            'trình soạn thảo với nội dung đó (nhớ: các dòng lệnh trong <code>define</code> bắt đầu bằng Tab). File ' +
            'thứ ba là script khởi động theo kiểu SysV mà Bài 49 đã dạy, viết theo đúng khuôn của ' +
            '<code>package/busybox/S50crond</code> trong cây Buildroot:' },

          { t: 'code', where: 'file', name: '~/bai61/br-ext/package/temp-daemon/S60temp_daemon', lang: 'bash', code:
            '#!/bin/sh\n' +
            '\n' +
            'DAEMON="temp_daemon"\n' +
            'PIDFILE="/var/run/$DAEMON.pid"\n' +
            '\n' +
            'TEMP_DAEMON_ARGS=""\n' +
            '\n' +
            '# shellcheck source=/dev/null\n' +
            '[ -r "/etc/default/$DAEMON" ] && . "/etc/default/$DAEMON"\n' +
            '\n' +
            'start() {\n' +
            '\tprintf \'Starting %s: \' "$DAEMON"\n' +
            '\t# shellcheck disable=SC2086 # word splitting is wanted\n' +
            '\tstart-stop-daemon --start --background --make-pidfile \\\n' +
            '\t\t--pidfile "$PIDFILE" --exec "/usr/bin/$DAEMON" \\\n' +
            '\t\t-- $TEMP_DAEMON_ARGS\n' +
            '\t[ $? -eq 0 ] && echo "OK" || echo "FAIL"\n' +
            '}\n' +
            '\n' +
            'stop() {\n' +
            '\tprintf \'Stopping %s: \' "$DAEMON"\n' +
            '\tstart-stop-daemon --stop --pidfile "$PIDFILE" --exec "/usr/bin/$DAEMON"\n' +
            '\t[ $? -eq 0 ] && echo "OK" || echo "FAIL"\n' +
            '\trm -f "$PIDFILE"\n' +
            '}\n' +
            '\n' +
            'case "$1" in\n' +
            '\tstart|stop) "$1";;\n' +
            '\trestart) stop; sleep 1; start;;\n' +
            '\t*) echo "Usage: $0 {start|stop|restart}"; exit 1;;\n' +
            'esac' },

          { t: 'p', x:
            'Bạn đã gặp mọi thành phần của script này ở Bài 49: <code>start-stop-daemon -S -b -m -p</code> (ở đây ' +
            'viết dạng dài), file pid, tiền tố <code>S60</code> quyết định thứ tự — sau <code>S40network</code>, vì ' +
            'daemon cần mạng. Chỉ có hai dòng mới: dòng <code>[ -r "/etc/default/…" ] &amp;&amp; . …</code> nạp file ' +
            'cấu hình <i>nếu nó tồn tại</i>, và <code>-- $TEMP_DAEMON_ARGS</code> truyền nội dung biến đó làm tham ' +
            'số cho daemon. Ở bước này chưa có file đó, nên biến rỗng và daemon chạy với cổng mặc định. Đặt quyền ' +
            'thực thi cho nó:' },

          { t: 'code', where: 'wsl', code:
            'chmod 0755 ~/bai61/br-ext/package/temp-daemon/S60temp_daemon\n' +
            'find ~/bai61/br-ext -type f | sort' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/home/cah8hc/bai61/br-ext/Config.in\n' +
            '/home/cah8hc/bai61/br-ext/external.desc\n' +
            '/home/cah8hc/bai61/br-ext/external.mk\n' +
            '/home/cah8hc/bai61/br-ext/package/temp-daemon/Config.in\n' +
            '/home/cah8hc/bai61/br-ext/package/temp-daemon/S60temp_daemon\n' +
            '/home/cah8hc/bai61/br-ext/package/temp-daemon/temp-daemon.mk' },

          { t: 'p', x:
            'Sáu file, chưa có <code>.hash</code> — cố ý, để bạn thấy Buildroot phản ứng thế nào. Giờ chuyển sang ' +
            'cây Buildroot của Bài 60 và đăng ký cây br2-external. <code>BR2_EXTERNAL</code> có thể đi kèm bất kỳ ' +
            'lệnh <code>make</code> nào; ở đây ghép nó với <code>olddefconfig</code> để Kconfig đọc lại cấu hình với ' +
            'menu mới:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai60/buildroot-2026.02.3\n' +
            'make BR2_EXTERNAL=~/bai61/br-ext olddefconfig\n' +
            'cat output/.br2-external.mk\n' +
            'grep -n \'LEARN\\|TEMP_DAEMON\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to /home/cah8hc/bai60/buildroot-2026.02.3/.config\n' +
            '#\n' +
            '#\n' +
            '# Automatically generated file; DO NOT EDIT.\n' +
            '#\n' +
            '\n' +
            'BR2_EXTERNAL ?= /home/cah8hc/bai61/br-ext\n' +
            'export BR2_EXTERNAL_NAMES = \n' +
            'BR2_EXTERNAL_DIRS = \n' +
            'BR2_EXTERNAL_MKS = \n' +
            '\n' +
            'BR2_EXTERNAL_NAMES += LEARN\n' +
            'BR2_EXTERNAL_DIRS += /home/cah8hc/bai61/br-ext\n' +
            'BR2_EXTERNAL_MKS += /home/cah8hc/bai61/br-ext/external.mk\n' +
            'export BR2_EXTERNAL_LEARN_PATH = /home/cah8hc/bai61/br-ext\n' +
            'export BR2_EXTERNAL_LEARN_DESC = Embedded Linux course - lesson 61\n' +
            'export BR2_EXTERNAL_LEARN_VERSION = \n' +
            '6:BR2_EXTERNAL_NAMES="LEARN"\n' +
            '7:BR2_EXTERNAL_LEARN_PATH="/home/cah8hc/bai61/br-ext"\n' +
            '8:BR2_EXTERNAL_LEARN_VERSION=""\n' +
            '5282:# BR2_PACKAGE_TEMP_DAEMON is not set' },

          { t: 'p', x:
            'Đọc từ trên xuống. File <code>output/.br2-external.mk</code> là nơi Buildroot <b>nhớ</b> lựa chọn của ' +
            'bạn: dòng <code>BR2_EXTERNAL ?= …</code> nghĩa là từ giờ không cần gõ lại <code>BR2_EXTERNAL=</code> ở ' +
            'mỗi lệnh. Tên <code>LEARN</code> trong <code>external.desc</code> đã sinh ra ' +
            '<code>BR2_EXTERNAL_LEARN_PATH</code>, trỏ tới đường dẫn tuyệt đối. Trong <code>.config</code>, ba dòng ' +
            '6–8 ghi cây đang dùng, và ở dòng <b>5282</b> — gần cuối, trong mục "External options" — symbol của ' +
            'bạn đã tồn tại nhưng còn tắt. Đó là bằng chứng <code>Config.in</code> đã được đọc. (Số dòng cụ thể có ' +
            'thể khác nếu bạn đã đổi cấu hình khác ở Bài 60; ý nghĩa thì không đổi.)' },

          { t: 'p', x:
            'Bật package bằng <code>utils/config</code> — công cụ Bài 60 bước 6 đã dùng để đổi hostname — rồi để ' +
            'Kconfig kiểm tra phụ thuộc <code>BR2_TOOLCHAIN_HAS_THREADS</code>:' },

          { t: 'code', where: 'wsl', code:
            'utils/config --enable BR2_PACKAGE_TEMP_DAEMON\n' +
            'make olddefconfig > /dev/null\n' +
            'grep -n TEMP_DAEMON .config' },

          { t: 'code', where: 'out', nocopy: true, code: '5282:BR2_PACKAGE_TEMP_DAEMON=y' },

          { t: 'p', x:
            'Symbol vẫn ở dòng 5282, giờ là <code>=y</code>. Nếu toolchain không có thread, <code>olddefconfig</code> ' +
            'sẽ âm thầm tắt nó lại và bạn sẽ thấy lại dòng <code>is not set</code> — đó là lý do luôn ' +
            '<code>grep</code> kiểm tra sau khi bật. Bây giờ build <b>chỉ</b> package này. Mọi package đều có một ' +
            'target <code>make</code> mang đúng tên nó:' },

          { t: 'code', where: 'wsl', code:
            "time make temp-daemon > ~/bai61/pkg1.log 2>&1\n" +
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/pkg1.log | grep -a '>>>\\|WARN\\|^real'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m15.998s\n' +
            'user\t0m10.792s\n' +
            'sys\t0m1.041s\n' +
            '>>> temp-daemon 1.0 Downloading\n' +
            'WARNING: no hash file for temp-daemon-1.0.tar.gz\n' +
            '>>> temp-daemon 1.0 Extracting\n' +
            '>>> temp-daemon 1.0 Patching\n' +
            '>>> temp-daemon 1.0 Configuring\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target' },

          { t: 'cmdx', cmd: "time make temp-daemon > log 2>&1; sed 's/\\x1b\\[[0-9;]*m//g' log | grep -a …", rows: [
            ['make temp-daemon', 'Target do <code>generic-package</code> sinh ra: chạy toàn bộ chuỗi stamp của riêng package này (và các phụ thuộc nếu có), không đóng ảnh'],
            ['> ~/bai61/pkg1.log 2>&amp;1','Ghi cả stdout và stderr vào log — dòng <code>WARNING</code> đi ra stderr'],
            ["sed 's/\\x1b\\[[0-9;]*m//g'", 'Xoá mã màu ANSI mà Buildroot dùng để in đậm dòng <code>&gt;&gt;&gt;</code> (Bài 60)'],
            ["grep -a '&gt;&gt;&gt;\\|WARN\\|^real'", 'Giữ dòng tiến trình, cảnh báo và thời gian; <code>-a</code> vì log có thể chứa byte không in được']
          ] },

          { t: 'p', x:
            '<b>16 giây</b> cho một package hoàn chỉnh, kể cả toolchain — vì toolchain đã nằm sẵn trong ' +
            '<code>output/host</code> từ Bài 60. Sáu dòng <code>&gt;&gt;&gt;</code> là sáu ô của hình ' +
            'generic-package ở phần lý thuyết. "Configuring" vẫn được in dù bạn không viết ' +
            '<code>_CONFIGURE_CMDS</code>: bước đó chạy nhưng không làm gì. Và dòng thứ hai là điều phần lý thuyết ' +
            'đã báo trước: <code>WARNING: no hash file</code> — dù defconfig có ' +
            '<code>BR2_DOWNLOAD_FORCE_CHECK_HASHES=y</code>, build vẫn tiếp tục. Kiểm tra sản phẩm:' },

          { t: 'code', where: 'wsl', code:
            'ls output/build/temp-daemon-1.0/\n' +
            'file output/target/usr/bin/temp_daemon\n' +
            'grep temp-daemon output/build/packages-file-list.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Makefile\n' +
            'temp_daemon\n' +
            'temp_daemon.c\n' +
            'output/target/usr/bin/temp_daemon: ELF 64-bit LSB shared object, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, for GNU/Linux 6.18.0, not stripped\n' +
            'temp-daemon,./usr/bin/temp_daemon\n' +
            'temp-daemon,./etc/init.d/S60temp_daemon' },

          { t: 'p', x:
            'Ba dòng đầu: <code>$(@D)</code> chứa đúng nội dung tarball cộng file nhị phân vừa build. Dòng ' +
            '<code>file</code> có hai chi tiết đáng so với bước 1: <code>for GNU/Linux 6.18.0</code> thay vì ' +
            '<code>3.7.0</code> — đó là phiên bản kernel header của toolchain Buildroot (6.18), không phải của ' +
            'cross-compiler Ubuntu; và <code>not stripped</code> — file trong <code>output/target</code> chưa bị ' +
            'strip, bước 5 sẽ cho thấy việc đó xảy ra ở đâu. Hai dòng cuối trả lời một câu Bài 60 để ngỏ: Buildroot ' +
            '<b>có</b> ghi lại package nào cài file nào, trong <code>packages-file-list.txt</code>. Nó chỉ không dùng ' +
            'danh sách ấy để gỡ file khi bạn tắt package.' },

          { t: 'cal', kind: 'info', title: 'Lệnh build thật mà Buildroot đã chạy',
            x: 'Mở <code>~/bai61/pkg1.log</code> và tìm dòng bắt đầu bằng <code>aarch64-buildroot-linux-gnu-gcc</code>. ' +
               'Trên máy soạn bài nó là: <code>…/output/host/bin/aarch64-buildroot-linux-gnu-gcc ' +
               '-D_LARGEFILE_SOURCE -D_LARGEFILE64_SOURCE -D_FILE_OFFSET_BITS=64 -O2 -g0 -D_FORTIFY_SOURCE=1 -Wall ' +
               '-Wextra -pthread -o temp_daemon temp_daemon.c</code>. Mọi thứ trước <code>-Wall</code> đến từ ' +
               '<code>$(TARGET_CONFIGURE_OPTS)</code>; <code>-O2</code> của Makefile đã bị thay thế vì ' +
               '<code>CFLAGS ?=</code> nhường chỗ cho giá trị Buildroot truyền vào. Đây là bằng chứng trực tiếp rằng ' +
               'một biến trong <code>.mk</code> đã biến một Makefile bình thường thành build chéo.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — File .hash: một hash sai có chủ ý, rồi hash đúng',
        blocks: [
          { t: 'p', x:
            'Trước khi ghi hash đúng, hãy ghi một hash <b>sai</b> và xem Buildroot làm gì — đó là tình huống thật ' +
            'khi một tarball bị tải thiếu qua proxy (Bài 60 đã gặp proxy trả lỗi 401 hàng chục lần), hoặc khi ai đó ' +
            'đóng lại tarball mà quên đổi số phiên bản. Dùng 64 chữ số 0, chắc chắn không trùng với bất kỳ file ' +
            'nào. <code>dirclean</code> trước để package phải đi lại từ bước Downloading:' },

          { t: 'code', where: 'wsl', code:
            'P=~/bai61/br-ext/package/temp-daemon\n' +
            "printf '# Locally computed\\nsha256  %s  temp-daemon-1.0.tar.gz\\n' \\\n" +
            '    0000000000000000000000000000000000000000000000000000000000000000 > $P/temp-daemon.hash\n' +
            'make temp-daemon-dirclean\n' +
            'make temp-daemon > ~/bai61/badhash.log 2>&1; echo "rc=$?"\n' +
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/badhash.log | grep -a 'ERROR\\|^cp \\|^wget'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=2\n' +
            'ERROR: while checking hashes from /home/cah8hc/bai61/br-ext/package/temp-daemon/temp-daemon.hash\n' +
            'ERROR: temp-daemon-1.0.tar.gz has wrong sha256 hash:\n' +
            'ERROR: expected: 0000000000000000000000000000000000000000000000000000000000000000\n' +
            'ERROR: got     : cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef\n' +
            'ERROR: Incomplete download, or man-in-the-middle (MITM) attack\n' +
            "cp -v '/home/cah8hc/bai61/upstream/temp-daemon-1.0.tar.gz' '/home/cah8hc/bai60/buildroot-2026.02.3/output/build/.temp-daemon-1.0.tar.gz.AFAiGq/output' \n" +
            'ERROR: while checking hashes from /home/cah8hc/bai61/br-ext/package/temp-daemon/temp-daemon.hash\n' +
            'ERROR: temp-daemon-1.0.tar.gz has wrong sha256 hash:\n' +
            '…\n' +
            "wget -nd -t 3 --connect-timeout=10 -O '…/output' 'https://sources.buildroot.net/temp-daemon/temp-daemon-1.0.tar.gz' \n" +
            '2026-10-31 11:38:10 ERROR 404: Not Found.\n' +
            "wget -nd -t 3 --connect-timeout=10 -O '…/output' 'https://sources.buildroot.net/temp-daemon-1.0.tar.gz' \n" +
            '2026-10-31 11:38:12 ERROR 404: Not Found.' },

          { t: 'p', x:
            'Đây là một chuỗi phản ứng, không phải một lỗi đơn lẻ. Đọc theo thứ tự:' },

          { t: 'list', ordered: true, items: [
            'Khối ERROR đầu tiên: tarball đã có trong <code>dl/temp-daemon/</code> từ bước 2. Buildroot kiểm lại nó trước khi dùng — <code>expected</code> là 64 số 0 bạn viết, <code>got</code> là <code>cdc7160c…</code>, đúng giá trị <code>sha256sum</code> in ở bước 1. File bị loại.',
            'Dòng <code>cp -v</code>: Buildroot tải lại theo <code>_SITE_METHOD = file</code> — tức là chép từ <code>~/bai61/upstream</code>. Chú ý file được chép vào một thư mục tạm ngẫu nhiên (<code>.temp-daemon-1.0.tar.gz.AFAiGq</code>, tên này khác ở mỗi lần chạy), không chép thẳng vào <code>dl/</code>.',
            'Khối ERROR thứ hai: bản vừa chép vẫn sai hash — tất nhiên, vì nó là cùng một file.',
            'Hai dòng <code>wget</code>: Buildroot thử mirror dự phòng <code>sources.buildroot.net</code> mà Bài 60 đã nhắc, hai kiểu đường dẫn. Mirror không có tarball của bạn, nên cả hai trả <code>404</code>.',
            '<code>rc=2</code>: hết nơi để thử, build dừng. <code>dl/temp-daemon/</code> giờ trống — không file sai hash nào được giữ lại.'
          ] },

          { t: 'cal', kind: 'why', title: 'Vì sao thông báo nói "man-in-the-middle"',
            x: 'Hash sai chỉ có hai nghĩa: file bị hỏng trên đường tải (tải thiếu, proxy cắt giữa chừng), hoặc file ' +
               'bị thay bởi một người đứng giữa bạn và máy chủ. Buildroot không phân biệt được hai trường hợp, nên ' +
               'nó gọi tên cả hai và từ chối build. Với package của chính bạn, nghĩa thường gặp nhất là một trường ' +
               'hợp thứ ba: bạn đã đóng lại tarball sau khi sửa mã mà quên tăng <code>_VERSION</code>. Cách sửa ' +
               '<b>không phải</b> là cập nhật hash cho khớp, mà là phát hành phiên bản mới — một tên file chỉ được ' +
               'phép ứng với một nội dung.' },

          { t: 'p', x:
            'Ghi hash đúng. Tính nó ngay từ tarball, đừng chép tay 64 ký tự:' },

          { t: 'code', where: 'wsl', code:
            'H=$(sha256sum ~/bai61/upstream/temp-daemon-1.0.tar.gz | cut -d\' \' -f1)\n' +
            "printf '# Locally computed\\nsha256  %s  temp-daemon-1.0.tar.gz\\n' \"$H\" > $P/temp-daemon.hash\n" +
            'cat $P/temp-daemon.hash\n' +
            'make temp-daemon > ~/bai61/goodhash.log 2>&1; echo "rc=$?"\n' +
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/goodhash.log | grep -a '>>>\\|OK (\\|WARN'" },

          { t: 'code', where: 'out', nocopy: true, code:
            '# Locally computed\n' +
            'sha256  cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef  temp-daemon-1.0.tar.gz\n' +
            'rc=0\n' +
            '>>> temp-daemon 1.0 Downloading\n' +
            'temp-daemon-1.0.tar.gz: OK (sha256: cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef)\n' +
            '>>> temp-daemon 1.0 Extracting\n' +
            '>>> temp-daemon 1.0 Patching\n' +
            '>>> temp-daemon 1.0 Configuring\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target' },

          { t: 'cmdx', cmd: "H=$(sha256sum FILE | cut -d' ' -f1); printf '…%s…' \"$H\" > FILE.hash", rows: [
            ['$( … )', 'Thay thế lệnh: chạy lệnh bên trong, lấy stdout làm giá trị'],
            ["cut -d' ' -f1", '<code>sha256sum</code> in <code>HASH  TÊN_FILE</code>; lấy trường đầu tiên khi tách theo dấu cách'],
            ["printf '# Locally computed\\nsha256  %s  …'", 'Dòng chú thích theo quy ước, rồi dòng hash: thuật toán, <b>hai</b> dấu cách, giá trị, hai dấu cách, tên file — đúng định dạng các file <code>.hash</code> trong cây Buildroot'],
            ['"$H"', 'Ngoặc kép để giá trị đi nguyên vẹn vào <code>%s</code>']
          ] },

          { t: 'p', x:
            'Dòng <code>WARNING: no hash file</code> của bước 2 đã được thay bằng ' +
            '<code>temp-daemon-1.0.tar.gz: OK (sha256: cdc7160c…)</code>: cùng script ' +
            '<code>support/download/check-hash</code>, lần này tìm thấy file <code>.hash</code>, so một dòng và khớp. ' +
            'Đây chính là định dạng dòng <code>OK</code> bạn đã thấy cho <code>linux-6.18.7.tar.xz</code> và ' +
            '<code>busybox-1.37.0.tar.bz2</code> ở Bài 60 bước 3 — package của bạn giờ được đối xử y như 2 786 ' +
            'package của cộng đồng.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — patches/: thêm tham số cổng cho temp_daemon, và cái bẫy của stamp',
        blocks: [
          { t: 'p', x:
            'Thay đổi cần làm: <code>temp_daemon</code> luôn nghe cổng 9006, viết cứng bằng <code>#define PORT</code>. ' +
            'Sản phẩm của bạn muốn chọn cổng lúc chạy. Tạo patch theo cách các dự án thật làm: giải nén tarball ' +
            'vào một thư mục làm việc, biến nó thành repo Git, sửa, commit, rồi <code>git format-patch</code>. ' +
            'Thư mục làm việc ở ngoài cả cây Buildroot lẫn cây br2-external — nó chỉ là bàn nháp:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai61/work && cd ~/bai61/work\n' +
            'tar xzf ~/bai61/upstream/temp-daemon-1.0.tar.gz\n' +
            'cd temp-daemon-1.0\n' +
            'git init -q && git add . && git commit -q -m "temp-daemon 1.0"' },

          { t: 'p', x:
            'Commit đầu tiên ghi lại đúng trạng thái của tarball — patch sẽ là phần chênh lệch so với nó. Giờ sửa ' +
            '<code>temp_daemon.c</code> bằng trình soạn thảo, bốn chỗ: <code>main</code> nhận ' +
            '<code>argc</code>/<code>argv</code>, một biến <code>port</code> lấy từ <code>argv[1]</code> nếu có, và ' +
            'hai chỗ đang dùng <code>PORT</code> đổi sang <code>port</code>. Commit, rồi xuất patch thẳng vào cây ' +
            'br2-external:' },

          { t: 'code', where: 'wsl', code:
            'git diff --stat\n' +
            'git commit -q -a -m "Take the listening port from argv[1]\n' +
            '\n' +
            'Default stays 9006, so existing callers see no change."\n' +
            'mkdir -p ~/bai61/br-ext/patches/temp-daemon\n' +
            'git format-patch -1 -o ~/bai61/br-ext/patches/temp-daemon\n' +
            'cat ~/bai61/br-ext/patches/temp-daemon/0001-*.patch' },

          { t: 'code', where: 'out', nocopy: true, code:
            ' temp_daemon.c | 7 ++++---\n' +
            ' 1 file changed, 4 insertions(+), 3 deletions(-)\n' +
            '/home/cah8hc/bai61/br-ext/patches/temp-daemon/0001-Take-the-listening-port-from-argv-1.patch\n' +
            'From 184872763f088b0c9978905130e3c500ca43c3fc Mon Sep 17 00:00:00 2001\n' +
            'From: learner <learner@example.com>\n' +
            'Date: Sat, 31 Oct 2026 11:39:06 +0700\n' +
            'Subject: [PATCH] Take the listening port from argv[1]\n' +
            '\n' +
            'Default stays 9006, so existing callers see no change.\n' +
            '---\n' +
            ' temp_daemon.c | 7 ++++---\n' +
            ' 1 file changed, 4 insertions(+), 3 deletions(-)\n' +
            '\n' +
            'diff --git a/temp_daemon.c b/temp_daemon.c\n' +
            'index 30cf234..f0638ce 100644\n' +
            '--- a/temp_daemon.c\n' +
            '+++ b/temp_daemon.c\n' +
            '@@ -44,8 +44,9 @@ static int set_nonblocking(int fd)\n' +
            '     return fcntl(fd, F_SETFL, flags | O_NONBLOCK);\n' +
            ' }\n' +
            ' \n' +
            '-int main(void)\n' +
            '+int main(int argc, char **argv)\n' +
            ' {\n' +
            '+    int port = (argc > 1) ? atoi(argv[1]) : PORT;\n' +
            '     signal(SIGPIPE, SIG_IGN);             /* early client close != killing the daemon */\n' +
            ' \n' +
            '     sigset_t mask;\n' +
            '@@ -67,7 +68,7 @@ int main(void)\n' +
            '     memset(&addr, 0, sizeof addr);\n' +
            '     addr.sin_family      = AF_INET;\n' +
            '     addr.sin_addr.s_addr = htonl(INADDR_ANY);\n' +
            '-    addr.sin_port        = htons(PORT);\n' +
            '+    addr.sin_port        = htons(port);\n' +
            '     if (bind(listen_fd, (struct sockaddr *)&addr, sizeof addr) == -1) { perror("bind"); exit(1); }\n' +
            '     if (listen(listen_fd, 64) == -1) { perror("listen"); exit(1); }\n' +
            '     set_nonblocking(listen_fd);            /* MANDATORY: accept() runs in a loop */\n' +
            '@@ -81,7 +82,7 @@ int main(void)\n' +
            '     if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, sig_fd, &ev) == -1) { perror("epoll_ctl sig_fd"); exit(1); }\n' +
            ' \n' +
            '     printf("[daemon] pid %d — listening on port %d, epoll fd %d, signalfd %d\\n",\n' +
            '-           getpid(), PORT, epoll_fd, sig_fd);\n' +
            '+           getpid(), port, epoll_fd, sig_fd);\n' +
            '     fflush(stdout);\n' +
            '     unsigned long served = 0;\n' +
            '     struct epoll_event events[MAX_EVENTS];\n' +
            '-- \n' +
            '2.25.1' },

          { t: 'cmdx', cmd: 'git format-patch -1 -o DIR', rows: [
            ['-1', 'Xuất một commit — commit mới nhất. <code>-3</code> sẽ cho ba file <code>0001-</code>, <code>0002-</code>, <code>0003-</code> theo đúng thứ tự áp'],
            ['-o DIR', 'Ghi file patch vào thư mục này thay vì thư mục hiện tại'],
            ['(tên file)', 'Số thứ tự + dòng tiêu đề commit, ký tự đặc biệt đổi thành <code>-</code>. Thứ tự tên là thứ tự Buildroot áp']
          ] },

          { t: 'p', x:
            'Đây là đúng định dạng <code>git format-patch</code> mà Bài 34 dùng cho U-Boot: phần đầu giống một email ' +
            '(tác giả, ngày, tiêu đề, mô tả), rồi diff. Ba "hunk" <code>@@</code> ứng với ba vùng bị sửa; ' +
            '<code>4 insertions(+), 3 deletions(-)</code> khớp với bốn dòng <code>+</code> và ba dòng <code>-</code>. ' +
            'Mã băm commit, ngày giờ, tên tác giả và dòng <code>2.25.1</code> (phiên bản Git) sẽ khác trên máy ' +
            'bạn. Phần mô tả không phải trang trí: một năm sau, khi nâng <code>temp-daemon</code> lên 1.1, nó là thứ ' +
            'duy nhất nói cho bạn biết patch này còn cần hay không.' },

          { t: 'p', x:
            'Chỉ cho Buildroot thư mục mới. <code>BR2_GLOBAL_PATCH_DIR</code> đã có giá trị từ defconfig của Bài 60, ' +
            'nên <b>thêm vào sau</b>, đừng thay thế — patch của <code>board/qemu/patches</code> vẫn cần cho ' +
            'gcc và kernel:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai60/buildroot-2026.02.3\n' +
            "utils/config --set-str BR2_GLOBAL_PATCH_DIR 'board/qemu/patches $(BR2_EXTERNAL_LEARN_PATH)/patches'\n" +
            'make olddefconfig > /dev/null\n' +
            "grep -n '^BR2_GLOBAL_PATCH_DIR' .config" },

          { t: 'code', where: 'out', nocopy: true, code:
            '481:BR2_GLOBAL_PATCH_DIR="board/qemu/patches $(BR2_EXTERNAL_LEARN_PATH)/patches"' },

          { t: 'p', x:
            'Hai thư mục, cách nhau một dấu cách. Nháy đơn quanh giá trị giữ nguyên chữ ' +
            '<code>$(BR2_EXTERNAL_LEARN_PATH)</code> trong <code>.config</code> — Make sẽ thay nó lúc build, nên ' +
            'cấu hình không chứa đường dẫn riêng của máy bạn. Giờ là thí nghiệm chính. Thử ba lệnh mà bạn có thể ' +
            'nghĩ là đủ để "build lại cho có patch", và sau mỗi lệnh đếm xem mã nguồn trong thư mục build đã có chữ ' +
            '<code>argc</code> chưa (0 = chưa vá, 2 = đã vá):' },

          { t: 'code', where: 'wsl', code:
            'B=output/build/temp-daemon-1.0\n' +
            "make temp-daemon 2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' | grep -a '^>>>\\|Applying'; grep -c argc $B/temp_daemon.c\n" +
            "make temp-daemon-rebuild 2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' | grep -a '^>>>\\|Applying'; grep -c argc $B/temp_daemon.c\n" +
            "make temp-daemon-reconfigure 2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' | grep -a '^>>>\\|Applying'; grep -c argc $B/temp_daemon.c\n" +
            'ls -a $B | grep stamp' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target\n' +
            '0\n' +
            '>>> temp-daemon 1.0 Configuring\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target\n' +
            '0\n' +
            '.stamp_built\n' +
            '.stamp_configured\n' +
            '.stamp_downloaded\n' +
            '.stamp_extracted\n' +
            '.stamp_installed\n' +
            '.stamp_patched\n' +
            '.stamp_target_installed' },

          { t: 'p', x:
            'Ba lệnh, ba lần thoát mã 0, ba con số <b>0</b>. <code>make temp-daemon</code> không in gì — mọi stamp ' +
            'đã có, không có gì để làm. <code>-rebuild</code> chạy lại Building và Installing; ' +
            '<code>-reconfigure</code> lùi thêm một bước tới Configuring. Không lệnh nào chạm tới Patching, và danh ' +
            'sách stamp cuối cùng cho thấy vì sao: <code>.stamp_patched</code> vẫn nằm đó từ bước 3. Nếu dừng ở đây, ' +
            'bạn sẽ có một ảnh build "thành công" chứa chương trình chưa vá, và không một dòng log nào nói điều đó.' },

          { t: 'p', x:
            'Lệnh đúng là <code>dirclean</code>: xoá cả thư mục build, buộc chuỗi stamp bắt đầu lại từ Extracting:' },

          { t: 'code', where: 'wsl', code:
            'make temp-daemon-dirclean\n' +
            "make temp-daemon 2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' | grep -a '^>>>\\|Applying'\n" +
            'grep -n argc $B/temp_daemon.c\n' +
            'cat $B/.applied_patches_list' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rm -Rf /home/cah8hc/bai60/buildroot-2026.02.3/output/build/temp-daemon-1.0\n' +
            '>>> temp-daemon 1.0 Extracting\n' +
            '>>> temp-daemon 1.0 Patching\n' +
            'Applying 0001-Take-the-listening-port-from-argv-1.patch using patch: \n' +
            '>>> temp-daemon 1.0 Configuring\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target\n' +
            '47:int main(int argc, char **argv)\n' +
            '49:    int port = (argc > 1) ? atoi(argv[1]) : PORT;\n' +
            '/home/cah8hc/bai61/br-ext/patches/temp-daemon/0001-Take-the-listening-port-from-argv-1.patch' },

          { t: 'p', x:
            'Lần này có dòng <code>Applying 0001-… using patch:</code> ngay dưới Patching, và <code>grep</code> tìm ' +
            'thấy hai dòng mới ở 47 và 49 — đúng số dòng trong hunk <code>@@ -44,8 +44,9 @@</code> của patch. ' +
            'Không có Downloading: tarball đã nằm trong <code>dl/</code> với hash đúng, Buildroot không tải lại. File ' +
            '<code>.applied_patches_list</code> là sổ ghi của script <code>support/scripts/apply-patches.sh</code>: ' +
            'mỗi patch đã áp một dòng, đường dẫn tuyệt đối. Khi build một package lạ cư xử khác bản gốc, đây là file ' +
            'đầu tiên nên mở.' },

          { t: 'cal', kind: 'info', title: 'Buildroot áp patch bằng lệnh gì',
            x: 'Dòng 119 của <code>apply-patches.sh</code>: <code>patch -F0 -g0 -p1 --no-backup-if-mismatch -d ' +
               '"${builddir}" -t -N</code>. <code>-p1</code> bỏ tiền tố <code>a/</code> và <code>b/</code> mà ' +
               '<code>git format-patch</code> sinh ra — cùng cờ bạn đã dùng ở Bài 34. <code>-F0</code> là điểm ' +
               'nghiêm khắc: không cho phép "fuzz", tức là ba dòng ngữ cảnh quanh mỗi hunk phải khớp tuyệt đối. Khi ' +
               'bạn nâng phiên bản upstream và vài dòng lân cận thay đổi, patch sẽ <b>thất bại</b> thay vì được áp ' +
               'lệch một cách âm thầm.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Overlay, script post-build, hostname; boot và gọi daemon',
        blocks: [
          { t: 'p', x:
            'Daemon giờ nhận được cổng, nhưng chưa ai truyền cổng cho nó. Đó là việc của <b>overlay</b>: một file ' +
            '<code>/etc/default/temp_daemon</code> mà script <code>S60temp_daemon</code> nạp lúc khởi động. Thêm ' +
            'một file <code>/etc/motd</code> (BusyBox <code>login</code> in nó sau khi đăng nhập) để nhìn thấy ' +
            'overlay ngay khi vào máy. Cấu trúc thư mục overlay là cấu trúc của <code>/</code>:' },

          { t: 'code', where: 'wsl', code:
            'O=~/bai61/br-ext/board/learn/rootfs-overlay\n' +
            'mkdir -p $O/etc/default\n' +
            "printf 'TEMP_DAEMON_ARGS=\"9100\"\\n' > $O/etc/default/temp_daemon\n" +
            "printf 'Embedded Linux course - lesson 61 image\\n' > $O/etc/motd\n" +
            'find $O -type f' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/home/cah8hc/bai61/br-ext/board/learn/rootfs-overlay/etc/default/temp_daemon\n' +
            '/home/cah8hc/bai61/br-ext/board/learn/rootfs-overlay/etc/motd' },

          { t: 'p', x:
            'Hai file, mỗi file nằm đúng chỗ nó sẽ nằm trong rootfs, chỉ khác tiền tố ' +
            '<code>…/rootfs-overlay</code>. Tiếp theo là script post-build. Nó làm hai việc mà overlay không làm ' +
            'được: sinh một file có nội dung thay đổi theo từng lần build, và <b>xoá</b> một file mà một package ' +
            'khác đã cài:' },

          { t: 'code', where: 'file', name: '~/bai61/br-ext/board/learn/post-build.sh', lang: 'bash', code:
            '#!/bin/sh\n' +
            '# Post-build script: runs after every package is installed into $1 (output/target)\n' +
            '# and after the overlay has been copied, just before the filesystem images are made.\n' +
            'set -e\n' +
            '\n' +
            'TARGET_DIR="$1"\n' +
            '\n' +
            '# 1. Record what was built, so the running system can say where it came from.\n' +
            'cat > "$TARGET_DIR/etc/build-info" <<EOF\n' +
            'BUILDROOT_VERSION=$BR2_VERSION\n' +
            'BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)\n' +
            'EOF\n' +
            '\n' +
            '# 2. This product has no use for cron: drop the init script BusyBox installed.\n' +
            'rm -f "$TARGET_DIR/etc/init.d/S50crond"' },

          { t: 'cmdx', cmd: 'post-build.sh', rows: [
            ['set -e', 'Lệnh nào lỗi thì script dừng với mã khác 0 — và Buildroot dừng build theo. Không có dòng này, một lỗi giữa chừng bị nuốt và ảnh vẫn được đóng'],
            ['TARGET_DIR="$1"', 'Buildroot gọi script với tham số đầu tiên là <code>output/target</code>. Đặt tên rõ ràng cho nó thay vì rải <code>$1</code> khắp nơi'],
            ['$BR2_VERSION', 'Biến môi trường Buildroot <code>export</code> sẵn (<code>Makefile</code> dòng 95). Script cũng nhận <code>BR2_CONFIG</code> (dòng 504) và các biến trong <code>EXTRA_ENV</code> của <code>package/Makefile.in</code>: <code>BUILD_DIR</code>, <code>BR2_DL_DIR</code>, <code>CONFIG_DIR</code>, <code>O</code>…'],
            ['date -u +…Z', 'Thời điểm build theo UTC — đây là ví dụ <b>có chủ ý</b> của lỗ rò đồng hồ trong Bài 59: ảnh của mỗi lần build sẽ khác nhau ở file này'],
            ['rm -f "$TARGET_DIR/…"', 'Đường dẫn luôn có tiền tố <code>$TARGET_DIR</code> và nằm trong ngoặc kép. Một <code>rm -f /etc/init.d/S50crond</code> thiếu tiền tố sẽ nhắm vào máy build của bạn']
          ] },

          { t: 'cal', kind: 'danger', title: 'Script post-build chạy trên máy build, bằng user của bạn',
            x: 'Đây không phải script chạy trong thiết bị. Nó chạy trên WSL, với quyền của bạn, mỗi lần ' +
               '<code>make</code>. Mọi đường dẫn phải bắt đầu bằng <code>"$TARGET_DIR"</code>. Và nếu bạn gán ' +
               '<code>TARGET_DIR</code> từ một biến có thể rỗng, một lệnh <code>rm -rf "$TARGET_DIR"/usr</code> sẽ ' +
               'thành <code>rm -rf /usr</code>. Với script dài hơn, viết <code>"${TARGET_DIR:?}"</code> để shell ' +
               'dừng ngay khi biến rỗng.' },

          { t: 'p', x:
            'Cho script quyền thực thi, rồi trỏ ba tuỳ chọn của Buildroot về cây br2-external, đồng thời đổi hostname ' +
            'để thấy ngay ở dấu nhắc đăng nhập rằng đây là ảnh mới:' },

          { t: 'code', where: 'wsl', code:
            'chmod 0755 ~/bai61/br-ext/board/learn/post-build.sh\n' +
            'cd ~/bai60/buildroot-2026.02.3\n' +
            "utils/config --set-str BR2_ROOTFS_OVERLAY '$(BR2_EXTERNAL_LEARN_PATH)/board/learn/rootfs-overlay'\n" +
            "utils/config --set-str BR2_ROOTFS_POST_BUILD_SCRIPT '$(BR2_EXTERNAL_LEARN_PATH)/board/learn/post-build.sh'\n" +
            'utils/config --set-str BR2_TARGET_GENERIC_HOSTNAME learn\n' +
            'make olddefconfig > /dev/null\n' +
            "grep -n 'ROOTFS_OVERLAY\\|POST_BUILD_SCRIPT=\\|GENERIC_HOSTNAME' .config" },

          { t: 'code', where: 'out', nocopy: true, code:
            '515:BR2_TARGET_GENERIC_HOSTNAME="learn"\n' +
            '571:BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/rootfs-overlay"\n' +
            '573:BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/post-build.sh"' },

          { t: 'p', x:
            'Ba symbol đã có giá trị, cả hai đường dẫn đều viết qua <code>$(BR2_EXTERNAL_LEARN_PATH)</code>. Bây ' +
            'giờ là <code>make</code> đầy đủ, lần đầu tiên trong bài — tức là thêm bước đóng ảnh sau các package:' },

          { t: 'code', where: 'wsl', code:
            'time make > ~/bai61/make.log 2>&1\n' +
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/make.log | grep -a '^>>>\\|^real'" },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m15.986s\n' +
            '>>>   Finalizing host directory\n' +
            '>>>   Finalizing target directory\n' +
            '>>>   Sanitizing RPATH in target tree\n' +
            '>>>   Sanity check in overlays /home/cah8hc/bai61/br-ext/board/learn/rootfs-overlay\n' +
            '>>>   Copying overlay /home/cah8hc/bai61/br-ext/board/learn/rootfs-overlay\n' +
            '>>>   Executing post-build script /home/cah8hc/bai61/br-ext/board/learn/post-build.sh\n' +
            '>>>   Generating root filesystems common tables\n' +
            '>>>   Generating filesystem image rootfs.ext2\n' +
            '>>>   Executing post-image script board/qemu/post-image.sh' },

          { t: 'p', x:
            'So với lần <code>make</code> không đổi gì ở Bài 60 bước 6, có thêm đúng hai dòng: <code>Copying ' +
            'overlay</code> rồi <code>Executing post-build script</code>, theo đúng thứ tự trong hình ở phần lý ' +
            'thuyết, và cả hai đều đứng trước <code>Generating filesystem image</code>. Dòng <code>Sanity check in ' +
            'overlays</code> trước đây không có đường dẫn nào sau nó; giờ có. Không có dòng ' +
            '<code>temp-daemon</code> nào: package đã build xong ở bước 4. <b>16 giây</b> cho cả hệ thống. Kiểm tra ' +
            'kết quả trong <code>output/target</code>:' },

          { t: 'code', where: 'wsl', code:
            'cat output/target/etc/build-info output/target/etc/default/temp_daemon output/target/etc/hostname\n' +
            'ls output/target/etc/init.d\n' +
            'ls -l output/build/temp-daemon-1.0/temp_daemon output/target/usr/bin/temp_daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            'BUILDROOT_VERSION=2026.02.3\n' +
            'BUILD_DATE=2026-10-31T04:40:46Z\n' +
            'TEMP_DAEMON_ARGS="9100"\n' +
            'learn\n' +
            'rcK\n' +
            'rcS\n' +
            'S01seedrng\n' +
            'S01syslogd\n' +
            'S02klogd\n' +
            'S02sysctl\n' +
            'S11modules\n' +
            'S40network\n' +
            'S60temp_daemon\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 18752 Oct 31 11:40 output/build/temp-daemon-1.0/temp_daemon\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 14120 Oct 31 11:40 output/target/usr/bin/temp_daemon' },

          { t: 'p', x:
            'Từng mảnh đều có mặt: <code>build-info</code> do post-build sinh (ngày giờ là lúc bạn chạy, sẽ khác), ' +
            'file cấu hình từ overlay, hostname <code>learn</code>. Trong <code>init.d</code>, <code>S60temp_daemon</code> ' +
            'đã có và <code>S50crond</code> — có ở Bài 60 — đã biến mất. Hai dòng cuối trả lời câu "strip xảy ra ở ' +
            'đâu" của bước 2: bản trong thư mục build nặng <b>18 752</b> byte, bản trong <code>output/target</code> ' +
            'chỉ <b>14 120</b> byte — bước <code>Finalizing target directory</code> strip mọi file ELF trong target ' +
            '(<code>BR2_STRIP_strip=y</code> là mặc định), còn bản gốc chưa strip được giữ lại để debug, đúng như ' +
            'cách Bài 50 tách <code>.ko</code> có và không có symbol.' },

          { t: 'p', x:
            'Giờ boot. <code>start-qemu.sh</code> do script post-image tạo ra, cách dùng y như Bài 60 bước 5. Đăng ' +
            'nhập <code>root</code> (không mật khẩu), rồi gõ các lệnh kiểm tra bên trong máy ảo:' },

          { t: 'code', where: 'wsl', code: 'output/images/start-qemu.sh --serial-only' },

          { t: 'code', where: 'qemu', code:
            'cat /etc/hostname /etc/build-info /etc/default/temp_daemon\n' +
            'ps | grep [t]emp_daemon\n' +
            'netstat -ltn\n' +
            '(echo get; sleep 1) | telnet 127.0.0.1 9100\n' +
            '(echo get; sleep 1) | telnet 127.0.0.1 9006; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Starting syslogd: OK\n' +
            'Starting klogd: OK\n' +
            'Running sysctl: OK\n' +
            'Starting network: udhcpc: started, v1.37.0\n' +
            '…\n' +
            'OK\n' +
            'Starting temp_daemon: OK\n' +
            '\n' +
            'Welcome to Buildroot\n' +
            'learn login: root\n' +
            'Embedded Linux course - lesson 61 image\n' +
            '# cat /etc/hostname /etc/build-info /etc/default/temp_daemon\n' +
            'learn\n' +
            'BUILDROOT_VERSION=2026.02.3\n' +
            'BUILD_DATE=2026-10-31T04:40:46Z\n' +
            'TEMP_DAEMON_ARGS="9100"\n' +
            '# ps | grep [t]emp_daemon\n' +
            '  107 root     /usr/bin/temp_daemon 9100\n' +
            '# netstat -ltn\n' +
            'Active Internet connections (only servers)\n' +
            'Proto Recv-Q Send-Q Local Address           Foreign Address         State       \n' +
            'tcp        0      0 0.0.0.0:9100            0.0.0.0:*               LISTEN      \n' +
            '# (echo get; sleep 1) | telnet 127.0.0.1 9100\n' +
            'Connected to 127.0.0.1\n' +
            'temperature=42.8 samples=29\n' +
            'Connection closed by foreign host\n' +
            '# (echo get; sleep 1) | telnet 127.0.0.1 9006; echo rc=$?\n' +
            'telnet: can\'t connect to remote host (127.0.0.1): Connection refused\n' +
            'rc=1' },

          { t: 'p', x:
            'Mọi mắt xích của bài nối lại ở đây. <code>Starting temp_daemon: OK</code> là dòng <code>printf</code> ' +
            'trong <code>S60temp_daemon</code>, chạy sau <code>Starting network</code> nhờ tiền tố S60; không có ' +
            '<code>Starting crond</code> vì post-build đã xoá script đó. <code>learn login:</code> là hostname, dòng ' +
            'kế tiếp là <code>/etc/motd</code> từ overlay. <code>ps</code> cho thấy daemon chạy với tham số ' +
            '<code>9100</code> — overlay cấp giá trị, script truyền nó, patch làm chương trình hiểu nó; PID 107 sẽ ' +
            'khác trên máy bạn. <code>netstat</code> xác nhận cổng 9100 đang <code>LISTEN</code>. Cuối cùng, cùng một ' +
            'yêu cầu: cổng 9100 trả về một mẫu nhiệt độ (giá trị <code>temperature</code> và <code>samples</code> ' +
            'phụ thuộc lúc bạn gọi), còn cổng 9006 cũ bị từ chối với <code>rc=1</code>.' },

          { t: 'cmdx', cmd: '(echo get; sleep 1) | telnet 127.0.0.1 9100', rows: [
            ['(echo get; sleep 1)', 'Gửi một dòng bất kỳ — <code>temp_daemon</code> trả lời mọi yêu cầu bằng một mẫu — rồi giữ kết nối mở 1 giây để kịp đọc câu trả lời'],
            ['telnet', 'BusyBox của ảnh này có <code>telnet</code> nhưng <b>không</b> có <code>nc</code> (<code># CONFIG_NC is not set</code> trong <code>busybox.config</code> của Buildroot) — khác rootfs tự dựng ở Bài 49'],
            ['127.0.0.1', 'Loopback đã được bật sẵn: <code>/etc/network/interfaces</code> của Buildroot có <code>auto lo</code>. Bài 49 phải gõ <code>ifconfig lo</code> bằng tay']
          ] },

          { t: 'p', x:
            'Tắt máy ảo bằng <code>poweroff</code>. Trước khi sang bước 6, thử một lỗi mà ai cũng gặp một lần: ' +
            'quên quyền thực thi của script post-build. Bỏ bit <code>x</code>, chạy <code>make</code>, rồi trả bit ' +
            'lại ngay:' },

          { t: 'code', where: 'wsl', code:
            'F=~/bai61/br-ext/board/learn/post-build.sh\n' +
            'chmod -x $F\n' +
            'make > ~/bai61/nx.log 2>&1; echo "rc=$?"\n' +
            'chmod +x $F\n' +
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/nx.log | tail -n 3" },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=2\n' +
            '>>>   Executing post-build script /home/cah8hc/bai61/br-ext/board/learn/post-build.sh\n' +
            '/bin/bash: /home/cah8hc/bai61/br-ext/board/learn/post-build.sh: Permission denied\n' +
            'make: *** [Makefile:788: target-finalize] Error 126' },

          { t: 'p', x:
            'Buildroot gọi script trực tiếp như một chương trình, không qua <code>sh script</code>, nên thiếu bit ' +
            '<code>x</code> là <code>Permission denied</code>. <b>126</b> là mã thoát quy ước của shell cho "tìm thấy ' +
            'file nhưng không thực thi được" (khác 127 = "không tìm thấy"). Build dừng ở target ' +
            '<code>target-finalize</code>, trước khi đóng ảnh — ảnh cũ trong <code>output/images</code> vẫn nằm đó, ' +
            'nên nếu bạn không đọc mã thoát, bạn sẽ boot ảnh của lần trước mà tưởng là ảnh mới. Bit <code>x</code> ' +
            'đã được trả lại ở dòng thứ tư; lần <code>make</code> kế tiếp sẽ thành công.' },

          { t: 'cal', kind: 'warn', title: 'Bit thực thi phải được Git giữ lại',
            x: 'Lỗi trên hay xảy ra nhất khi đồng nghiệp clone repo br2-external trên một ổ Windows (<code>/mnt/c</code>) ' +
               'hoặc khi ai đó tạo script bằng trình soạn thảo rồi quên <code>chmod</code>. Git lưu bit thực thi ' +
               '(mode <code>100755</code>); kiểm tra bằng <code>git ls-files -s board/learn/post-build.sh</code> trước ' +
               'khi commit. Cùng lý do, hãy giữ cây br2-external trên ext4 của WSL như bài này làm, không trên ' +
               '<code>/mnt/c</code>.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — savedefconfig, rồi dựng lại toàn bộ trong một thư mục trống',
        blocks: [
          { t: 'p', x:
            'Mọi thay đổi của bạn từ bước 2 đến bước 5 đang nằm trong <code>.config</code> — 5 000 dòng, không ai ' +
            'review được. Lưu chúng thành defconfig, vào thư mục <code>configs/</code> của cây br2-external, bằng ' +
            'cách chỉ định đích một cách tường minh:' },

          { t: 'code', where: 'wsl', code:
            'make savedefconfig BR2_DEFCONFIG=$HOME/bai61/br-ext/configs/learn_qemu_defconfig\n' +
            'cat ~/bai61/br-ext/configs/learn_qemu_defconfig\n' +
            'wc -l ~/bai61/br-ext/configs/learn_qemu_defconfig configs/qemu_aarch64_virt_defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            'BR2_aarch64=y\n' +
            'BR2_PACKAGE_HOST_LINUX_HEADERS_CUSTOM_6_18=y\n' +
            'BR2_GLOBAL_PATCH_DIR="board/qemu/patches $(BR2_EXTERNAL_LEARN_PATH)/patches"\n' +
            'BR2_DOWNLOAD_FORCE_CHECK_HASHES=y\n' +
            'BR2_TARGET_GENERIC_HOSTNAME="learn"\n' +
            'BR2_SYSTEM_DHCP="eth0"\n' +
            'BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/rootfs-overlay"\n' +
            'BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/post-build.sh"\n' +
            'BR2_ROOTFS_POST_IMAGE_SCRIPT="board/qemu/post-image.sh"\n' +
            'BR2_ROOTFS_POST_SCRIPT_ARGS="$(BR2_DEFCONFIG)"\n' +
            'BR2_LINUX_KERNEL=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_VERSION=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"\n' +
            'BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y\n' +
            'BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"\n' +
            'BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL=y\n' +
            'BR2_TARGET_ROOTFS_EXT2=y\n' +
            'BR2_TARGET_ROOTFS_EXT2_4=y\n' +
            '# BR2_TARGET_ROOTFS_TAR is not set\n' +
            'BR2_PACKAGE_HOST_QEMU=y\n' +
            'BR2_PACKAGE_HOST_QEMU_SYSTEM_MODE=y\n' +
            'BR2_PACKAGE_TEMP_DAEMON=y\n' +
            '  22 /home/cah8hc/bai61/br-ext/configs/learn_qemu_defconfig\n' +
            '  18 configs/qemu_aarch64_virt_defconfig\n' +
            '  40 total' },

          { t: 'p', x:
            '<b>22</b> dòng so với <b>18</b> dòng của defconfig gốc. Bốn dòng mới (hostname, overlay, post-build, ' +
            '<code>TEMP_DAEMON</code>) và một dòng sửa (<code>GLOBAL_PATCH_DIR</code>) — đúng năm thay đổi bạn đã ' +
            'làm, không hơn. Không có dòng nào về toolchain, gcc 14.3.0 hay glibc: chúng vẫn là giá trị mặc định. ' +
            'Và không có đường dẫn <code>/home/cah8hc</code> nào: mọi thứ của bạn đi qua ' +
            '<code>$(BR2_EXTERNAL_LEARN_PATH)</code>, nên defconfig này chạy được trên máy bất kỳ. So trực tiếp hai ' +
            'file để thấy năm thay đổi đó:' },

          { t: 'code', where: 'wsl', code:
            'diff configs/qemu_aarch64_virt_defconfig ~/bai61/br-ext/configs/learn_qemu_defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3c3\n' +
            '< BR2_GLOBAL_PATCH_DIR="board/qemu/patches"\n' +
            '---\n' +
            '> BR2_GLOBAL_PATCH_DIR="board/qemu/patches $(BR2_EXTERNAL_LEARN_PATH)/patches"\n' +
            '4a5\n' +
            '> BR2_TARGET_GENERIC_HOSTNAME="learn"\n' +
            '5a7,8\n' +
            '> BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/rootfs-overlay"\n' +
            '> BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_LEARN_PATH)/board/learn/post-build.sh"\n' +
            '18a22\n' +
            '> BR2_PACKAGE_TEMP_DAEMON=y' },

          { t: 'p', x:
            'Bốn khối diff: một <code>c</code> (change — dòng 3 đổi giá trị) và ba <code>a</code> (add — thêm sau ' +
            'dòng 4, 5 và 18). Đây chính là cái lợi của defconfig mà Bài 60 nói tới: cả bước 2–5 của bài này, nửa ' +
            'giờ làm việc, thu lại thành năm dòng mà một người review đọc trong mười giây. Khi bạn commit cây ' +
            'br2-external vào Git, <code>git diff</code> của defconfig sẽ trông đúng như thế này.' },

          { t: 'p', x:
            'Giờ xem điều gì xảy ra nếu bạn quên <code>BR2_DEFCONFIG=</code>. Vì thao tác này <b>ghi đè</b> một file ' +
            'của Buildroot, hãy sao lưu nó trước và khôi phục ngay sau:' },

          { t: 'code', where: 'wsl', code:
            'cp configs/qemu_aarch64_virt_defconfig ~/bai61/qemu_aarch64_virt_defconfig.orig\n' +
            'make savedefconfig; echo "rc=$?"\n' +
            'wc -l configs/qemu_aarch64_virt_defconfig\n' +
            'cp ~/bai61/qemu_aarch64_virt_defconfig.orig configs/qemu_aarch64_virt_defconfig\n' +
            'cmp ~/bai61/qemu_aarch64_virt_defconfig.orig configs/qemu_aarch64_virt_defconfig && echo restored' },

          { t: 'code', where: 'out', nocopy: true, code:
            'rc=0\n' +
            '22 configs/qemu_aarch64_virt_defconfig\n' +
            'restored' },

          { t: 'p', x:
            '<code>rc=0</code>, không một dòng cảnh báo, và defconfig của Buildroot đã từ 18 thành <b>22</b> dòng — ' +
            'cấu hình của bạn, kể cả các tham chiếu <code>$(BR2_EXTERNAL_LEARN_PATH)</code>, giờ nằm trong cây ' +
            'Buildroot. Ai đó dùng cây này không có br2-external sẽ gặp lỗi khó hiểu. Lệnh <code>cmp</code> im lặng ' +
            'và <code>restored</code> xác nhận file đã trở lại từng byte như lúc giải nén. Để không bao giờ phải ' +
            'nhớ <code>BR2_DEFCONFIG=</code> nữa, cho <code>.config</code> tự trỏ về cây của bạn:' },

          { t: 'code', where: 'wsl', code:
            "utils/config --set-str BR2_DEFCONFIG '$(BR2_EXTERNAL_LEARN_PATH)/configs/learn_qemu_defconfig'\n" +
            'make olddefconfig > /dev/null\n' +
            "grep -n '^BR2_DEFCONFIG=' .config\n" +
            'make savedefconfig\n' +
            'cmp ~/bai61/qemu_aarch64_virt_defconfig.orig configs/qemu_aarch64_virt_defconfig && echo "in-tree defconfig untouched"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '446:BR2_DEFCONFIG="$(BR2_EXTERNAL_LEARN_PATH)/configs/learn_qemu_defconfig"\n' +
            'in-tree defconfig untouched' },

          { t: 'p', x:
            'Từ giờ, <code>make savedefconfig</code> trơn ghi vào cây br2-external, và file của Buildroot không bị ' +
            'động tới. Đây cũng là trạng thái bạn có tự nhiên khi nạp defconfig bằng ' +
            '<code>make learn_qemu_defconfig</code> — việc tiếp theo. Kiểm tra Buildroot đã nhận ra defconfig mới:' },

          { t: 'code', where: 'wsl', code: 'make list-defconfigs | grep -B2 -A1 learn_qemu' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\n' +
            'External configs in "Embedded Linux course - lesson 61":\n' +
            '  learn_qemu_defconfig                - Build for learn_qemu\n' },

          { t: 'p', x:
            'Tiêu đề nhóm lấy nguyên văn dòng <code>desc:</code> của <code>external.desc</code>. Defconfig của bạn ' +
            'đứng ngang hàng với 308 defconfig của Buildroot mà Bài 60 đếm.' },

          { t: 'p', x:
            'Giờ là phép thử cuối cùng, cũng là cột mốc M10 của lộ trình: xoá mọi thứ trừ ba đầu vào — cây ' +
            'Buildroot gốc, cây br2-external, tarball upstream — và dựng lại toàn bộ hệ thống. Để không phá ' +
            '<code>output/</code> đang dùng, dựng vào một thư mục mới bằng <code>O=</code>. Thư mục đó trống ' +
            'hoàn toàn: không toolchain, không kernel, không stamp nào. Chỉ <code>dl/</code> được dùng chung, nên ' +
            'không tải lại gì:' },

          { t: 'code', where: 'wsl', code:
            'make O=$HOME/bai61/out BR2_EXTERNAL=$HOME/bai61/br-ext learn_qemu_defconfig\n' +
            'time make O=$HOME/bai61/out > ~/bai61/fresh-build.log 2>&1; echo "rc=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to /home/cah8hc/bai61/out/.config\n' +
            '#\n' +
            '\n' +
            'real\t34m15.297s\n' +
            'user\t314m20.274s\n' +
            'sys\t26m32.318s\n' +
            'rc=0' },

          { t: 'cmdx', cmd: 'make O=DIR BR2_EXTERNAL=DIR learn_qemu_defconfig; make O=DIR', rows: [
            ['O=$HOME/bai61/out', 'Thư mục output riêng. Buildroot tạo trong đó một <code>Makefile</code> nhỏ, nên sau này bạn cũng có thể <code>cd ~/bai61/out &amp;&amp; make</code>'],
            ['BR2_EXTERNAL=…', 'Chỉ cần ở lệnh đầu tiên; nó được nhớ trong <code>~/bai61/out/.br2-external.mk</code>, riêng cho thư mục output này'],
            ['learn_qemu_defconfig', 'Nạp defconfig từ <code>configs/</code> của cây br2-external — đồng thời đặt <code>BR2_DEFCONFIG</code> trỏ về đó'],
            ['make O=…', 'Một lệnh: toolchain → host tools → kernel → BusyBox → <code>temp-daemon</code> → overlay → post-build → ảnh']
          ] },

          { t: 'p', x:
            '<code>rc=0</code> sau <b>34 phút 15 giây</b>. Lâu hơn 24 phút 41 giây của Bài 60 vì hai lý do: thư mục ' +
            'trống nên toolchain gcc 14.3.0 phải build lại từ đầu (đó là cái giá của "từ đầu"), và trên máy soạn bài ' +
            'lần build này chạy song song với các thí nghiệm bước 4–6 trên cây <code>output/</code> cũ. ' +
            '<code>user</code> 314 phút chia cho <code>real</code> 34 phút ≈ 9,2 — mười sáu CPU vẫn bận gần hết thời ' +
            'gian. Thời gian của bạn sẽ khác theo máy. Điều không được khác là nội dung: tìm trong log những dòng ' +
            'của riêng bạn:' },

          { t: 'code', where: 'wsl', code:
            "sed 's/\\x1b\\[[0-9;]*m//g' ~/bai61/fresh-build.log | grep -a '>>> temp-daemon\\|OK (sha256: cdc7\\|Applying 0001-Take\\|Copying overlay\\|post-build script'\n" +
            'ls ~/bai61/out/images\n' +
            'cat ~/bai61/out/target/etc/default/temp_daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            'temp-daemon-1.0.tar.gz: OK (sha256: cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef)\n' +
            '>>> temp-daemon 1.0 Extracting\n' +
            '>>> temp-daemon 1.0 Patching\n' +
            'Applying 0001-Take-the-listening-port-from-argv-1.patch using patch: \n' +
            '>>> temp-daemon 1.0 Configuring\n' +
            '>>> temp-daemon 1.0 Building\n' +
            '>>> temp-daemon 1.0 Installing to target\n' +
            '>>>   Copying overlay /home/cah8hc/bai61/br-ext/board/learn/rootfs-overlay\n' +
            '>>>   Executing post-build script /home/cah8hc/bai61/br-ext/board/learn/post-build.sh\n' +
            'Image\n' +
            'rootfs.ext2\n' +
            'rootfs.ext4\n' +
            'TEMP_DAEMON_ARGS="9100"' },

          { t: 'p', x:
            'Mọi thứ bạn làm tay ở bước 2–5 đều tự diễn ra: hash khớp <code>cdc7160c…</code>, patch được áp ngay lần ' +
            'đầu (thư mục trống nên không có stamp nào cản), overlay và post-build chạy trước khi đóng ảnh. Không ' +
            'có dòng Downloading cho <code>temp-daemon</code>: tarball đã nằm trong <code>dl/</code> dùng chung. ' +
            'Nhưng có một chỗ thiếu: <code>images/</code> <b>không có</b> <code>start-qemu.sh</code>, dù dòng ' +
            '<code>Executing post-image script board/qemu/post-image.sh</code> vẫn có trong log.' },

          { t: 'cal', kind: 'why', title: 'Vì sao start-qemu.sh biến mất',
            x: '<code>board/qemu/post-image.sh</code> không tự biết lệnh QEMU. Nó tìm trong mọi ' +
               '<code>board/qemu/*/readme.txt</code> một dòng kết thúc bằng <code># tên_defconfig</code> — với Bài 60 ' +
               'đó là dòng 3 của <code>board/qemu/aarch64-virt/readme.txt</code>, kết thúc bằng ' +
               '<code># qemu_aarch64_virt_defconfig</code>. Tên <code>learn_qemu_defconfig</code> không có dòng nào, ' +
               'nên script <code>exit 0</code> mà không tạo gì — không lỗi, không cảnh báo. Đây là ví dụ thật của ' +
               'điều Bài 59 gọi là phụ thuộc không khai báo: script post-image ngầm phụ thuộc vào <b>tên</b> ' +
               'defconfig. Sản phẩm thật sẽ có script post-image riêng trong cây br2-external; ở bài này, chạy ' +
               'thẳng lệnh QEMU của dòng readme đó là đủ.' },

          { t: 'p', x:
            'Lệnh QEMU dưới đây chính là dòng 3 của <code>readme.txt</code>, chạy từ <code>~/bai61/out/images</code> ' +
            'bằng QEMU 10.2.0 vừa được build trong <code>~/bai61/out/host</code>:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai61/out/images\n' +
            '../host/bin/qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic -smp 1 -kernel Image \\\n' +
            '    -append "rootwait root=/dev/vda console=ttyAMA0" \\\n' +
            '    -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 \\\n' +
            '    -drive file=rootfs.ext4,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0' },

          { t: 'code', where: 'qemu', code:
            'cat /etc/hostname /etc/build-info\n' +
            'ps | grep [t]emp_daemon\n' +
            '(echo get; sleep 1) | telnet 127.0.0.1 9100' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Starting temp_daemon: OK\n' +
            '\n' +
            'Welcome to Buildroot\n' +
            'learn login: root\n' +
            'Embedded Linux course - lesson 61 image\n' +
            '# cat /etc/hostname /etc/build-info\n' +
            'learn\n' +
            'BUILDROOT_VERSION=2026.02.3\n' +
            'BUILD_DATE=2026-10-31T05:19:00Z\n' +
            '# ps | grep [t]emp_daemon\n' +
            '  106 root     /usr/bin/temp_daemon 9100\n' +
            '# (echo get; sleep 1) | telnet 127.0.0.1 9100\n' +
            'Connected to 127.0.0.1\n' +
            'temperature=44.2 samples=43\n' +
            'Connection closed by foreign host' },

          { t: 'p', x:
            'Cùng một hệ thống như ở bước 5: hostname <code>learn</code>, motd từ overlay, daemon với tham số ' +
            '<code>9100</code>, trả lời trên cổng 9100. Chỉ ba giá trị khác, và đều là thứ phải khác: ' +
            '<code>BUILD_DATE</code> (05:19 thay vì 04:40 — lỗ rò đồng hồ mà post-build cố ý ghi vào), PID ' +
            '<b>106</b> thay vì 107, và mẫu nhiệt độ lấy ở thời điểm khác. Tắt máy bằng <code>poweroff</code>.' },

          { t: 'cal', kind: 'tip', title: 'Cột mốc M10: hệ thống của bạn giờ là ba thứ có thể commit',
            x: 'Cây Buildroot 2026.02.3 không sửa (một phiên bản ghim), cây <code>br-ext/</code> 12 file, và tarball ' +
               'upstream có hash cố định. Đưa ba thứ đó cho đồng nghiệp, cùng hai lệnh <code>make</code> ở trên, và họ ' +
               'dựng lại đúng hệ thống của bạn trên máy họ. <code>~/bai61/out</code> (15 GB) có thể xoá bất cứ lúc ' +
               'nào — nó chỉ là sản phẩm. Hãy giữ <code>~/bai61/br-ext</code> và <code>~/bai61/upstream</code>: Bài 62 ' +
               'sẽ đặt từng file trong đó cạnh thứ tương đương bên Yocto.' }
        ] },
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Makefile:195: *** \'…/br-ext\': name \'LEARN-61\' contains invalid chars: \'-\'.  Stop.</code>', 'Tên trong <code>external.desc</code> có ký tự ngoài <code>[A-Za-z0-9_]</code>; nó phải trở thành một phần tên biến', 'Đổi thành <code>LEARN_61</code> hoặc <code>LEARN</code>'],
        ['<code>Makefile:195: *** \'…\': does not have an \'external.desc\'.</code>', 'Trỏ <code>BR2_EXTERNAL</code> vào sai thư mục (thường là một cấp quá sâu hoặc quá nông)', '<code>ls $BR2_EXTERNAL</code> phải thấy <code>external.desc</code>, <code>Config.in</code>, <code>external.mk</code>'],
        ['<code>WARNING: no hash file for temp-daemon-1.0.tar.gz</code>, build vẫn chạy', 'Chưa có file <code>.hash</code> trong thư mục package — chỉ là cảnh báo, kể cả khi <code>BR2_DOWNLOAD_FORCE_CHECK_HASHES=y</code>', 'Tạo <code>temp-daemon.hash</code> với <code>sha256sum</code> như bước 3'],
        ['<code>ERROR: temp-daemon-1.0.tar.gz has wrong sha256 hash</code> … <code>Incomplete download, or man-in-the-middle (MITM) attack</code>', 'Tarball khác với lúc bạn tính hash: tải thiếu, hoặc bạn đã đóng lại tarball sau khi sửa mã', 'Nếu nội dung thay đổi có chủ ý: tăng <code>_VERSION</code> và tạo tarball mới. Đừng sửa hash cho khớp với một file bạn không chắc'],
        ['<code>ERROR 404: Not Found</code> từ <code>sources.buildroot.net/temp-daemon/…</code>', 'Buildroot thử mirror dự phòng sau khi nguồn chính thất bại; mirror không có package riêng của bạn', 'Không phải lỗi gốc — đọc khối <code>ERROR</code> ở phía trên nó'],
        ['Đã thêm patch, build thành công, nhưng chương trình chạy như chưa vá', '<code>.stamp_patched</code> đã có; <code>make</code>, <code>-rebuild</code>, <code>-reconfigure</code> đều không chạy lại bước Patching', '<code>make &lt;pkg&gt;-dirclean</code> rồi <code>make</code>. Kiểm tra bằng <code>cat output/build/&lt;pkg&gt;-*/.applied_patches_list</code>'],
        ['<code>package/pkg-generic.mk:247: *** BR2_GLOBAL_PATCH_DIR contains nonexistent directory …/br-ext/patch.  Stop.</code>', 'Gõ sai đường dẫn trong <code>BR2_GLOBAL_PATCH_DIR</code> (ở đây thiếu chữ <code>es</code>)', 'Sửa giá trị bằng <code>utils/config --set-str</code> hoặc <code>menuconfig</code>, rồi <code>olddefconfig</code>'],
        ['<code>/bin/bash: …/post-build.sh: Permission denied</code> + <code>target-finalize] Error 126</code>', 'Script post-build thiếu bit thực thi', '<code>chmod +x</code> script; kiểm tra Git giữ mode <code>100755</code>'],
        ['Sửa file trong overlay, <code>make</code> xong nhưng ảnh không đổi', 'Bạn sửa nhầm <code>output/target</code> hoặc một bản sao, không phải thư mục mà <code>BR2_ROOTFS_OVERLAY</code> trỏ tới', 'Xem dòng <code>Copying overlay …</code> trong log để biết đường dẫn thật'],
        ['<code>configs/qemu_aarch64_virt_defconfig</code> của Buildroot đột nhiên có dòng <code>BR2_EXTERNAL_…</code>', '<code>make savedefconfig</code> không kèm <code>BR2_DEFCONFIG=</code> ghi vào defconfig đã nạp lần trước', 'Khôi phục từ tarball Buildroot; từ đó luôn chỉ định <code>BR2_DEFCONFIG</code> hoặc nạp defconfig từ cây br2-external']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      'Thay đổi của bạn thuộc về <b>đầu vào</b> của build, không phải <code>output/</code>. Cây <b>br2-external</b> giữ mọi thứ ngoài Buildroot: ba file bắt buộc <code>external.desc</code> (tên → <code>BR2_EXTERNAL_LEARN_PATH</code>), <code>Config.in</code>, <code>external.mk</code>.',
      'Một package = <code>Config.in</code> (có build không) + <code>.mk</code> (build thế nào) + <code>.hash</code> (đúng file không). <b>26 dòng</b> <code>.mk</code> với <code>$(eval $(generic-package))</code> sinh ra cả chuỗi stamp; <code>$(TARGET_CONFIGURE_OPTS)</code> biến một Makefile thường thành build chéo — nếu Makefile tôn trọng <code>CC</code>, <code>CFLAGS</code>, <code>DESTDIR</code>.',
      'Không có <code>.hash</code> chỉ là <code>WARNING</code>. Hash sai thì dừng với <b>rc 2</b> sau khi thử cả nguồn và mirror; hash đúng in <code>OK (sha256: …)</code>.',
      'Patch trong <code>BR2_GLOBAL_PATCH_DIR/&lt;pkg&gt;/</code> được áp bằng <code>patch -F0 -p1</code> ở bước Patching. <code>make</code>, <code>-rebuild</code>, <code>-reconfigure</code> đều <b>bỏ qua</b> patch mới; chỉ <code>&lt;pkg&gt;-dirclean</code> làm nó được áp.',
      'Overlay (file tĩnh) → post-build (script, <code>$1</code> = <code>output/target</code>) → đóng ảnh → post-image. Overlay và post-build chạy lại ở mọi <code>make</code>, mỗi lần <b>~16 s</b> trên cây có sẵn toolchain.',
      'Ảnh boot ra: <code>learn login:</code>, <code>/etc/motd</code> từ overlay, <code>S50crond</code> đã bị xoá, <code>temp_daemon 9100</code> chạy từ <code>S60temp_daemon</code> và trả lời trên cổng <b>9100</b>, cổng 9006 bị từ chối.',
      '<code>make savedefconfig</code> ghi vào <code>BR2_DEFCONFIG</code> — mặc định là defconfig đã nạp, kể cả file của Buildroot. Lưu vào <code>configs/</code> của cây br2-external: <b>22 dòng</b> mô tả cả hệ thống.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Bạn vừa mô tả cả một hệ thống bằng 22 dòng defconfig và một thư mục br2-external. <b>Bài 62 — Yocto: ' +
         'khái niệm và so sánh</b> đặt từng mảnh của bài này cạnh thứ tương đương bên Yocto: cây br2-external ↔ ' +
         '<i>layer</i>, <code>temp-daemon.mk</code> ↔ một <i>recipe</i> <code>.bb</code>, <code>patches/</code> ↔ ' +
         '<code>SRC_URI += "file://…patch"</code>, overlay và post-build ↔ <code>.bbappend</code> và ' +
         '<code>ROOTFS_POSTPROCESS_COMMAND</code>, <code>make</code> ↔ <code>bitbake</code>. Bạn sẽ thấy vì sao Yocto ' +
         'ghi lại package nào cài file nào — đúng cái Buildroot không dùng ở Bài 60 — và vì sao cái giá của nó là ' +
         'một lần build đầu đo bằng giờ và hàng chục GB, lý do bài đó dừng ở mức đọc hiểu.' }
  ],

  quiz: [
    { q: 'Bạn thêm <code>0002-fix-overflow.patch</code> vào <code>br-ext/patches/temp-daemon/</code>, chạy <code>make temp-daemon-rebuild</code> rồi <code>make</code>. Cả hai thoát mã 0, nhưng lỗi tràn số vẫn còn trên thiết bị. Nguyên nhân có khả năng nhất?',
      opts: [
        'Patch phải đặt cạnh <code>temp-daemon.mk</code>, Buildroot không đọc <code>BR2_GLOBAL_PATCH_DIR</code> cho package của br2-external',
        'Patch chỉ được áp ở bước tạo <code>.stamp_patched</code>; stamp đó vẫn còn, <code>-rebuild</code> chỉ chạy lại từ bước build',
        'Tên patch phải bắt đầu bằng <code>0001-</code>, các số khác bị bỏ qua',
        '<code>make</code> cuối cùng đã đóng ảnh từ bản <code>temp_daemon</code> trong <code>dl/</code>'
      ],
      a: 1,
      why: 'Bước 4 đo đúng tình huống này: sau <code>make</code>, <code>-rebuild</code> và <code>-reconfigure</code>, mã nguồn vẫn chưa có thay đổi của patch, vì <code>.stamp_patched</code> vẫn nằm trong thư mục build. Chỉ <code>make temp-daemon-dirclean</code> xoá thư mục build, buộc giải nén và áp patch lại. <code>BR2_GLOBAL_PATCH_DIR</code> áp dụng cho mọi package, kể cả của br2-external; và patch được áp theo thứ tự tên, <code>0002-</code> sau <code>0001-</code>.' },

    { q: 'Vì sao <code>temp-daemon.mk</code> không có dòng nào nhắc tới <code>aarch64</code> mà <code>temp_daemon</code> vẫn được build cho ARM64?',
      opts: [
        'Buildroot sửa <code>Makefile</code> của chương trình bằng <code>sed</code> trước khi build',
        '<code>BR2_aarch64=y</code> làm <code>make</code> của máy build tự chuyển sang ARM64',
        '<code>$(TARGET_CONFIGURE_OPTS)</code> truyền <code>CC</code>, <code>CFLAGS</code>… trỏ tới toolchain chéo, và <code>Makefile</code> của chương trình dùng <code>$(CC)</code> thay vì viết cứng <code>gcc</code>',
        'Tarball đã chứa sẵn file nhị phân ARM64'
      ],
      a: 2,
      why: 'Bước 1 chứng minh nửa đầu: cùng một Makefile cho ra x86-64 hay ARM64 tuỳ <code>CC</code>. Bước 2 chứng minh nửa sau: log của Buildroot cho thấy lệnh thật là <code>…/aarch64-buildroot-linux-gnu-gcc -D_LARGEFILE_SOURCE … -O2 -g0 -D_FORTIFY_SOURCE=1 -Wall …</code>. Nếu Makefile viết cứng <code>gcc</code>, biến này không có tác dụng và bạn sẽ được một file x86-64 trong rootfs ARM64.' },

    { q: 'Bạn cần (a) đặt file <code>/etc/temp_daemon.conf</code> cố định, (b) ghi ngày build vào <code>/etc/build-info</code>, (c) xoá <code>/etc/init.d/S50crond</code> mà BusyBox cài. Công cụ nào hợp cho từng việc?',
      opts: [
        '(a) overlay, (b) post-build, (c) post-build',
        '(a) overlay, (b) overlay, (c) overlay',
        '(a) post-image, (b) post-build, (c) overlay',
        '(a) package, (b) post-image, (c) post-image'
      ],
      a: 0,
      why: 'Overlay chỉ chép đè file tĩnh — hợp với (a). Nó không tính được ngày build và không <b>xoá</b> được file, nên (b) và (c) cần script post-build, chạy trên <code>output/target</code> sau overlay và trước khi đóng ảnh. Post-image chạy khi ảnh đã đóng xong, sửa rootfs ở đó là quá muộn.' },

    { q: 'Trên cây của Bài 60, bạn gõ <code>make savedefconfig</code> không kèm tham số. File nào bị ghi?',
      opts: [
        '<code>.config</code> trong cây Buildroot',
        '<code>configs/qemu_aarch64_virt_defconfig</code> của chính Buildroot, vì <code>BR2_DEFCONFIG</code> vẫn trỏ tới defconfig đã nạp',
        '<code>~/bai61/br-ext/configs/defconfig</code>, vì br2-external đã được đăng ký',
        'Không file nào — lệnh báo lỗi và yêu cầu chỉ định đích'
      ],
      a: 1,
      why: 'Bước 6 kiểm chứng: file của Buildroot từ 18 dòng thành 22 dòng, thoát mã 0, không cảnh báo. <code>BR2_DEFCONFIG</code> được đặt khi bạn nạp một defconfig, và savedefconfig ghi về đó. Luôn viết <code>make savedefconfig BR2_DEFCONFIG=…/br-ext/configs/tên_defconfig</code>, hoặc nạp defconfig từ cây br2-external để giá trị đó tự trỏ đúng.' },

    { q: 'Bạn vừa tạo package nhưng chưa tạo file <code>.hash</code>. Defconfig có <code>BR2_DOWNLOAD_FORCE_CHECK_HASHES=y</code>. Điều gì xảy ra khi <code>make temp-daemon</code>?',
      opts: [
        'Build dừng với <code>ERROR: No hash found</code>',
        'In <code>WARNING: no hash file for temp-daemon-1.0.tar.gz</code> và build tiếp',
        'Buildroot tự tính và ghi file <code>.hash</code>',
        'Buildroot bỏ qua package này'
      ],
      a: 1,
      why: 'Bước 2 cho đúng dòng này. Script <code>support/download/check-hash</code> trả về 0 khi không tìm thấy file <code>.hash</code> nào. <code>No hash found</code> (mã 3) chỉ xuất hiện khi file <code>.hash</code> <b>có</b> nhưng không có dòng cho tarball đó. Vì vậy hãy tạo <code>.hash</code> cùng lúc với <code>.mk</code>.' },

    { q: 'Sau khi chỉnh <code>post-build.sh</code>, <code>make</code> báo <code>Permission denied</code> và <code>target-finalize] Error 126</code>. Bạn boot ngay <code>output/images/start-qemu.sh</code> và thấy thay đổi chưa có. Vì sao QEMU vẫn boot được?',
      opts: [
        'Buildroot đã đóng ảnh trước khi chạy post-build',
        'Build dừng trước bước đóng ảnh, nên <code>rootfs.ext2</code> trong <code>output/images</code> vẫn là ảnh của lần build thành công trước',
        'QEMU tự bỏ qua lỗi của post-build',
        'Lỗi 126 chỉ là cảnh báo'
      ],
      a: 1,
      why: 'Post-build chạy trong <code>target-finalize</code>, trước <code>Generating filesystem image</code>. Lỗi ở đó dừng cả build, nhưng không xoá ảnh cũ. Mã 126 = "tìm thấy nhưng không thực thi được" — script thiếu bit <code>x</code>. Bài học kép: sửa bằng <code>chmod +x</code>, và luôn kiểm tra mã thoát của <code>make</code> trước khi tin vào <code>output/images</code>.' }
  ]
});

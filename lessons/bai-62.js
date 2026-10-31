/* Bài 62 — Yocto — khái niệm và so sánh
   Chặng 11 — Build system
   Layer, recipe, bitbake, metadata; khi nào doanh nghiệp chọn Yocto. Mức đọc hiểu: KHÔNG build ảnh thật.
   Thực hành trên máy B (WSL2 Ubuntu 20.04, user cah8hc), 2026-10-31, trong ~/bai62 (1–1,2 GB, bỏ đi được).
   Yocto 6.0.4 "wrynose" (LTS, 05/2026 → 04/2030): ba kho bitbake / openembedded-core / meta-yocto ở tag
   yocto-6.0.4 — kho poky gộp không có nhánh wrynose.
   - Bước 1: clone ba kho (6 / 7 / 4 s, 14M / 50M / 696K), đọc meta/: 950 .bb, 234 .bbclass, 13 MACHINE qemu*.
   - Bước 2: BitBake 2.18 cần Python ≥ 3.9 (máy có 3.8.10 → RuntimeError); install-buildtools (buildtools-extended
     6.0.3: Python 3.14.6, GCC 15.3.0, 508M); HOSTTOOLS vẫn thiếu gawk diffstat → apt-get download + dpkg-deb -x
     (không cần sudo); env.sh. PATH có khoảng trắng của Windows KHÔNG làm BitBake dừng (khác Buildroot Bài 60).
   - Bước 3: build/conf (local.conf 258 dòng, bblayers.conf 10), MACHINE qemuarm64, create-layer / add-layer
     meta-learn; LAYERSERIES_COMPAT sai → "not compatible with the core layer".
   - Bước 4: recipe temp-daemon_1.0.bb (25 dòng, dùng lại tarball + patch của Bài 61), base-files_%.bbappend
     (hostname), learn-image.bb (12 dòng, ROOTFS_POSTPROCESS_COMMAND); show-recipes (951 .bb, 26 s),
     show-appends, bitbake-getvar CC / hostname (lịch sử gán biến).
   - Bước 5: listtasks; bitbake -g learn-image → 316 recipe, 23 343 cạnh; bitbake -n → 5 150 task, sstate
     2 756 missed; chạy thật duy nhất -c unpack (3 task, 5-6 s).
   - Bước 6: bitbake -S none → 19 sigdata; thêm comment → 0 chữ ký mới; EXTRA_OEMAKE → 11; sửa 1 dòng patch
     → 18; bitbake-diffsigs giải thích vì sao. SRC_URI[sha256sum] sai cho file:// → KHÔNG báo lỗi (rc 0).
   Không build ảnh, không boot: tài liệu Yocto 6.0 ghi tối thiểu 32 GB RAM, 140 GB đĩa; máy B có 15,4 GiB,
   Ubuntu 20.04 không nằm trong danh sách distro được hỗ trợ. */

Lesson.register({
  id: 'bai-62',
  title: 'Yocto — khái niệm và so sánh',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 61 bạn mô tả cả một hệ thống bằng 22 dòng defconfig và một thư mục br2-external. Khi đi phỏng vấn ' +
    'vị trí Embedded Linux, câu hỏi tiếp theo gần như chắc chắn là: <i>\"Bạn đã dùng Yocto chưa?\"</i> — vì phần ' +
    'lớn các hãng làm SoC, ô tô và thiết bị công nghiệp giao BSP của họ dưới dạng một <b>layer Yocto</b>, không ' +
    'phải một package Buildroot.<br><br>' +
    'Yocto nổi tiếng là khó vào: hàng loạt cái tên (Poky, OpenEmbedded, BitBake, layer, recipe, bbappend…), và ' +
    'một lần build đầu đòi hàng chục GB RAM và hơn trăm GB đĩa. Bài này <b>không build ảnh</b> — tài liệu chính ' +
    'thức của Yocto 6.0 ghi tối thiểu 32 GB RAM, gấp đôi máy bạn đang dùng. Thay vào đó, bạn chạy chính ' +
    '<code>bitbake</code> ở chế độ chỉ phân tích: tạo một layer, viết recipe cho <code>temp_daemon</code> từ ' +
    'đúng tarball và patch của Bài 61, rồi hỏi BitBake nó <i>sẽ</i> làm gì — bao nhiêu recipe, bao nhiêu task, ' +
    'task nào phải chạy lại khi bạn sửa một dòng. Cuối bài, bạn đặt được từng mảnh của Buildroot cạnh mảnh ' +
    'tương ứng bên Yocto, và trả lời được câu hỏi khi nào một công ty nên chọn cái nào.',

  goals: [
    'Phân biệt Yocto Project, OpenEmbedded-Core, BitBake và Poky, và nói được mỗi cái nằm trong kho nào',
    'Đọc một recipe <code>.bb</code>, một <code>.bbappend</code> và một <code>layer.conf</code>, giải thích từng dòng và các toán tử gán <code>?=</code>, <code>??=</code>, <code>:append</code>',
    'Dựng môi trường BitBake không cần quyền root, tạo một layer riêng và dùng <code>bitbake-layers</code>, <code>bitbake-getvar</code> để kiểm tra nó',
    'Dùng <code>bitbake -g</code>, <code>-n</code> và <code>-S none</code> để đo một ảnh cần bao nhiêu recipe và task mà không build',
    'Giải thích cơ chế chữ ký băm của task, và chỉ ra vì sao nó tránh được cái bẫy stamp của Bài 59 và Bài 61',
    'Lập bảng tương ứng Buildroot ↔ Yocto và đưa ra tiêu chí chọn một trong hai cho một sản phẩm cụ thể'
  ],

  blocks: [
    /* ============================================================
       LÝ THUYẾT 1 — BỐN CÁI TÊN
       ============================================================ */
    { t: 'h2', x: 'Yocto, OpenEmbedded, BitBake, Poky: bốn cái tên cho một hệ thống' },

    { t: 'p', x:
      'Buildroot là một thứ duy nhất: một tarball, một cây thư mục, một <code>make</code>. Yocto thì không. Cái ' +
      'bạn gọi là \"Yocto\" thật ra là bốn thành phần do hai tổ chức duy trì, và tài liệu, diễn đàn, thông báo ' +
      'lỗi sẽ dùng cả bốn tên lẫn lộn. Đọc bảng này một lần, bạn sẽ không bị lạc khi gặp chúng:' },

    { t: 'terms', items: [
      ['Yocto Project', '', 'Dự án ô của Linux Foundation: đặt lịch phát hành, chạy hệ thống kiểm thử, viết tài liệu. Bản thân nó <b>không phải</b> một chương trình. \"Yocto 6.0\" là tên một đợt phát hành chung của các thành phần bên dưới'],
      ['BitBake', '', 'Bộ máy thực thi, viết bằng Python. Nó đọc metadata, tính ra đồ thị task, và chạy task. Vai trò giống <code>make</code> trong Buildroot — nhưng <code>make</code> không biết gì về Linux, BitBake cũng vậy'],
      ['OpenEmbedded-Core', 'OE-Core', 'Layer lõi: khoảng 950 recipe (gcc, glibc, busybox, linux-yocto…), các class dùng chung, và cấu hình máy QEMU. Đây là phần tương ứng với <code>package/</code>, <code>toolchain/</code>, <code>linux/</code> của Buildroot'],
      ['Poky', '', '<b>Bản phân phối tham chiếu</b> của Yocto Project: một file <code>poky.conf</code> chọn sẵn các giá trị (libc, init, tên phiên bản). Trước đây \"poky\" cũng là tên một kho Git gộp sẵn mọi thứ; kho đó không có nhánh cho 6.0 \"wrynose\", nên bài này lấy ba thành phần từ ba kho riêng'],
      ['Layer', 'meta-*', 'Một thư mục chứa metadata, có <code>conf/layer.conf</code>. Mọi thứ trong Yocto — kể cả OE-Core — đều là layer. Tên theo quy ước bắt đầu bằng <code>meta-</code>'],
      ['Codename', '', 'Mỗi bản phát hành có một tên: 5.0 \"scarthgap\", 6.0 \"wrynose\". Layer khai báo nó tương thích với codename nào, nên bạn sẽ thấy tên này nhiều hơn số phiên bản']
    ] },

    { t: 'p', x:
      'Một phép so sánh giúp giữ chúng tách bạch: <b>BitBake là đầu bếp</b>, chỉ biết đọc công thức và làm theo ' +
      'đúng thứ tự. <b>OE-Core là cuốn sách công thức cơ bản</b> — bánh mì, cơm, nước dùng. <b>Poky là một thực ' +
      'đơn mẫu</b> chọn sẵn vài món từ sách đó. <b>Layer của bạn</b> là vài trang công thức nhà bạn kẹp thêm vào ' +
      'sách. Còn <b>Yocto Project</b> là hội đồng xuất bản: ra sách mới mỗi sáu tháng, ra bản \"dài hạn\" mỗi hai ' +
      'năm.' },

    { t: 'table',
      head: ['Kho Git', 'Chứa', 'Tương ứng Buildroot'],
      rows: [
        ['<code>git.openembedded.org/bitbake</code>', '<code>bin/bitbake</code>, <code>bitbake-layers</code>, <code>bitbake-getvar</code>…, thư viện <code>lib/bb/</code>', 'GNU <code>make</code> + phần Kconfig'],
        ['<code>git.openembedded.org/openembedded-core</code>', 'Layer <code>meta/</code>, script <code>oe-init-build-env</code>, <code>runqemu</code>, <code>devtool</code>', 'Gần như toàn bộ cây Buildroot'],
        ['<code>git.yoctoproject.org/meta-yocto</code>', 'Layer <code>meta-poky</code> (distro Poky) và <code>meta-yocto-bsp</code> (vài board thật)', '<code>configs/</code> + <code>board/</code> cho vài board tham chiếu']
      ] },

    { t: 'cal', kind: 'info', title: 'LTS: bản nào để dùng cho một sản phẩm',
      x: 'Yocto ra bản mới mỗi sáu tháng, và cứ hai năm có một bản <b>LTS</b> được vá bốn năm. Tài liệu đi kèm ' +
         'tag <code>yocto-6.0.4</code> ghi hai bản LTS còn hỗ trợ: <b>6.0 \"wrynose\"</b> (05/2026 → 04/2030) và ' +
         '<b>5.0 \"scarthgap\"</b> (04/2024 → 04/2028). Đó là cùng ý tưởng với Buildroot LTS <code>2026.02</code> ' +
         'của Bài 60: một sản phẩm ghim một bản LTS, và chỉ nhận bản vá trong nhánh đó. Bạn không cần nhớ các ' +
         'ngày này — <code>git ls-remote --tags https://git.openembedded.org/openembedded-core</code> luôn cho bạn ' +
         'danh sách tag hiện có.' },

    /* ============================================================
       LÝ THUYẾT 2 — METADATA
       ============================================================ */
    { t: 'h2', x: 'Metadata: recipe, class, cấu hình và layer' },

    { t: 'p', x:
      'Buildroot mô tả mọi thứ bằng hai ngôn ngữ bạn đã biết: Kconfig (<code>Config.in</code>) và Make ' +
      '(<code>.mk</code>). Yocto dùng một ngôn ngữ riêng, gọi chung là <b>metadata</b>: phép gán biến kiểu shell, ' +
      'cộng với các hàm viết bằng shell hoặc Python. Metadata chia làm bốn loại theo phần mở rộng của file:' },

    { t: 'table',
      head: ['Loại', 'File', 'Nói gì', 'Ví dụ trong bài'],
      rows: [
        ['<b>Recipe</b>', '<code>tên_phiênbản.bb</code>', 'Cách lấy, vá, build, cài và chia gói <b>một</b> phần mềm. Tên file mang luôn tên (<code>PN</code>) và phiên bản (<code>PV</code>)', '<code>busybox_1.37.0.bb</code>, <code>temp-daemon_1.0.bb</code> của bạn'],
        ['<b>Append</b>', '<code>tên_%.bbappend</code>', 'Sửa một recipe của layer khác <b>mà không chạm vào file gốc</b>. <code>%</code> khớp mọi phiên bản', '<code>base-files_%.bbappend</code> đổi hostname'],
        ['<b>Class</b>', '<code>tên.bbclass</code>', 'Hành vi dùng chung, kéo vào bằng <code>inherit</code>. Tương ứng <code>generic-package</code>, <code>autotools-package</code> của Buildroot', '<code>update-rc.d.bbclass</code>, <code>core-image.bbclass</code>'],
        ['<b>Configuration</b>', '<code>.conf</code>', 'Giá trị toàn cục: máy đích (<code>conf/machine/*.conf</code>), distro (<code>poky.conf</code>), lựa chọn của bạn (<code>local.conf</code>), danh sách layer (<code>bblayers.conf</code>)', '<code>qemuarm64.conf</code>, <code>layer.conf</code>']
      ] },

    { t: 'p', x:
      'Trong Buildroot, cả hệ thống có <b>một</b> <code>.config</code>. Trong Yocto, cấu hình được ghép từ nhiều ' +
      'tầng, và mỗi recipe nhìn thấy một bản ghép riêng. Hình dưới là đúng các tầng bạn sẽ dựng ở phần thực hành:' },

    { t: 'fig', cap: 'BitBake đọc cấu hình toàn cục trước (mọi recipe đều thấy MACHINE), rồi với từng recipe: đọc file .bb, sau đó đọc mọi .bbappend khớp tên của nó. Vì bbappend được đọc sau, phép gán của nó thắng — đó là cách bạn đổi hostname mà không sửa một byte nào của OE-Core. Priority (5, 6) chỉ dùng để chọn khi hai layer cùng có một recipe trùng tên.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Các tầng metadata Yocto: cấu hình build, layer OE-Core priority 5, layer meta-learn priority 6, và recipe base-files được ghép với bbappend">' +
        '<rect class="d-box" x="20" y="20" width="330" height="70" rx="8"/>' +
        '<text class="d-t" x="36" y="44">build/conf/ — lựa chọn của bạn</text>' +
        '<text class="d-tm" x="36" y="64">local.conf: MACHINE ??= "qemuarm64"</text>' +
        '<text class="d-tm" x="36" y="80">bblayers.conf: BBLAYERS = meta, meta-learn</text>' +
        '<rect class="d-box-p" x="20" y="110" width="330" height="90" rx="8"/>' +
        '<text class="d-t" x="36" y="134">openembedded-core/meta — priority 5</text>' +
        '<text class="d-tm" x="36" y="154">conf/machine/qemuarm64.conf</text>' +
        '<text class="d-tm" x="36" y="170">classes-recipe/update-rc.d.bbclass</text>' +
        '<text class="d-tm" x="36" y="186">recipes-core/base-files/base-files_3.0.14.bb</text>' +
        '<rect class="d-box-a" x="20" y="220" width="330" height="90" rx="8"/>' +
        '<text class="d-t" x="36" y="244">meta-learn — priority 6</text>' +
        '<text class="d-tm" x="36" y="264">recipes-apps/temp-daemon/temp-daemon_1.0.bb</text>' +
        '<text class="d-tm" x="36" y="280">recipes-core/base-files/base-files_%.bbappend</text>' +
        '<text class="d-tm" x="36" y="296">recipes-core/images/learn-image.bb</text>' +
        '<path class="d-line" d="M350 186 H440"/><path class="d-arrow" d="M448 186 l-8 -5 v10 z"/>' +
        '<path class="d-line" d="M350 280 H400 V210 H440"/><path class="d-arrow" d="M448 210 l-8 -5 v10 z"/>' +
        '<rect class="d-box-g" x="450" y="150" width="250" height="110" rx="8"/>' +
        '<text class="d-t" x="575" y="174" text-anchor="middle">recipe base-files sau khi ghép</text>' +
        '<text class="d-tm" x="466" y="198">.bb:70       hostname = "${MACHINE}"</text>' +
        '<text class="d-tm" x="466" y="216">.bbappend:2  hostname = "learn"</text>' +
        '<text class="d-ts" x="466" y="240">giá trị cuối: learn — bbappend đọc sau</text>' +
        '<path class="d-line" d="M350 55 H575 V142"/><path class="d-arrow" d="M575 150 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="460" y="48">MACHINE, DISTRO… mọi recipe đều thấy</text>' +
        '</svg>' },

    { t: 'p', x:
      'Ngôn ngữ metadata trông giống shell, nhưng có vài toán tử gán riêng. Bạn sẽ gặp đúng những toán tử này ' +
      'trong các file của bài; mỗi cái trả lời câu hỏi \"nếu biến đã có giá trị thì sao\":' },

    { t: 'table',
      head: ['Viết', 'Nghĩa', 'Gặp ở đâu trong bài'],
      rows: [
        ['<code>A = "x"</code>', 'Gán thẳng, đè giá trị cũ. <code>${B}</code> bên trong được mở <b>lúc dùng</b>, không phải lúc gán', '<code>hostname = "learn"</code> trong bbappend'],
        ['<code>A ?= "x"</code>', 'Chỉ gán nếu A chưa có giá trị', '<code>BBLAYERS ?=</code> trong <code>bblayers.conf</code>'],
        ['<code>A ??= "x"</code>', 'Giá trị mặc định <b>yếu nhất</b>: chỉ dùng nếu đến cuối quá trình ghép vẫn không ai gán A', '<code>MACHINE ??= "qemuarm64"</code> trong <code>local.conf</code>'],
        ['<code>A += "x"</code> / <code>A .= "x"</code>', 'Nối vào sau, có / không có dấu cách', '<code>BBFILES +=</code>, <code>BBPATH .=</code> trong <code>layer.conf</code>'],
        ['<code>A:append = " x"</code>', 'Nối vào sau, nhưng <b>áp ở cuối cùng</b> — sau mọi phép <code>=</code>. Không tự thêm dấu cách', '<code>IMAGE_INSTALL:append = " temp-daemon"</code>'],
        ['<code>A:prepend = "x"</code>', 'Như <code>:append</code> nhưng chèn vào đầu', '<code>FILESEXTRAPATHS:prepend</code> trong bbappend'],
        ['<code>A := "x"</code>', 'Mở <code>${…}</code> <b>ngay lúc gán</b>', '<code>FILESEXTRAPATHS:prepend := "${THISDIR}/…"</code> — phải biết thư mục của bbappend ngay lúc đọc nó']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao cần cả = lẫn :append',
      x: 'Ở Buildroot, <code>.config</code> chỉ có một người viết: bạn (qua menuconfig hoặc defconfig). Ở Yocto, ' +
         'một biến như <code>IMAGE_INSTALL</code> có thể bị OE-Core, layer BSP của hãng chip, layer distro và layer ' +
         'của bạn cùng chạm vào — và thứ tự các file được đọc không phải lúc nào cũng là thứ bạn muốn. ' +
         '<code>:append</code> giải quyết điều đó: dù ai gán <code>=</code> ở đâu, phần nối của bạn được áp sau ' +
         'cùng. Bài 61 dùng overlay vì cùng lý do: thêm vào kết quả cuối mà không giành quyền viết file gốc.' },

    { t: 'cal', kind: 'tip', title: 'Đừng đoán giá trị của một biến — hỏi BitBake',
      x: 'Với chừng ấy tầng và toán tử, nhìn file để đoán giá trị cuối của một biến là việc dễ sai. Bạn không ' +
         'cần làm vậy: <code>bitbake-getvar -r &lt;recipe&gt; &lt;BIẾN&gt;</code> in giá trị cuối <b>kèm từng ' +
         'file và dòng</b> đã gán nó. Bước 4 dùng lệnh này để thấy <code>hostname</code> bị bbappend đè, và ' +
         '<code>CC</code> trỏ tới compiler chéo nào. Đó là lệnh bạn sẽ gõ nhiều nhất khi làm Yocto thật.' },

    /* ============================================================
       LÝ THUYẾT 3 — TASK, CHỮ KÝ, SSTATE
       ============================================================ */
    { t: 'h2', x: 'BitBake: task, chữ ký băm và shared state' },

    { t: 'p', x:
      'Bài 60 cho bạn thấy Buildroot chia việc build một package thành các bước (extract, patch, configure, ' +
      'build, install), mỗi bước để lại một file stamp. BitBake làm điều tương tự nhưng gọi mỗi bước là một ' +
      '<b>task</b>, tên bắt đầu bằng <code>do_</code>. Một recipe bình thường có khoảng hai chục task; bảy task ' +
      'đầu khớp gần như một-một với chuỗi stamp của Buildroot:' },

    { t: 'table',
      head: ['Task BitBake', 'Stamp Buildroot (Bài 60)', 'Làm gì'],
      rows: [
        ['<code>do_fetch</code>', '(tải vào <code>dl/</code>)', 'Lấy mọi thứ trong <code>SRC_URI</code> về <code>DL_DIR</code>'],
        ['<code>do_unpack</code>', '<code>.stamp_extracted</code>', 'Giải nén vào <code>WORKDIR/sources</code>'],
        ['<code>do_patch</code>', '<code>.stamp_patched</code>', 'Áp mọi <code>.patch</code> có trong <code>SRC_URI</code>'],
        ['<code>do_configure</code>', '<code>.stamp_configured</code>', 'Chạy <code>./configure</code>, <code>cmake</code>… (recipe của bạn để trống)'],
        ['<code>do_compile</code>', '<code>.stamp_built</code>', 'Build bằng compiler chéo'],
        ['<code>do_install</code>', '<code>.stamp_target_installed</code>', 'Cài vào thư mục tạm <code>${D}</code> của <b>riêng recipe này</b>'],
        ['<code>do_package</code>, <code>do_package_write_ipk</code>', '(không có)', 'Chia nội dung <code>${D}</code> thành nhiều gói (<code>temp-daemon</code>, <code>-dbg</code>, <code>-dev</code>…) và đóng thành file <code>.ipk</code>']
      ] },

    { t: 'p', x:
      'Hai dòng cuối là chỗ khác biệt lớn nhất. Ở Buildroot, mọi package cài thẳng vào <b>một</b> thư mục chung ' +
      '<code>output/target</code> — vì vậy ở Bài 60 bước 6, tắt <code>dtc</code> đi mà file của nó vẫn nằm lại ' +
      'trong ảnh: không ai ghi lại file nào là của ai. Ở Yocto, mỗi recipe cài vào thư mục riêng, rồi được đóng ' +
      'thành gói (<code>.ipk</code>, <code>.rpm</code> hoặc <code>.deb</code>). Ảnh cuối cùng được dựng bằng cách ' +
      '<b>cài các gói đó</b> vào một rootfs trống, đúng như <code>apt install</code> trên Ubuntu. Bỏ một gói khỏi ' +
      'danh sách thì file của nó biến mất khỏi ảnh lần sau — và trên thiết bị, bạn còn có thể cài thêm hoặc cập ' +
      'nhật từng gói.' },

    { t: 'h3', x: 'Chữ ký băm thay cho stamp' },

    { t: 'p', x:
      'Bài 59 kết thúc bằng một cái bẫy: sửa biến <code>EPOCH</code> trong Makefile, <code>make</code> trả lời ' +
      '<code>Nothing to be done</code>, vì <code>make</code> chỉ so thời gian sửa đổi của những file được khai ' +
      'là phụ thuộc. Bài 61 gặp lại cái bẫy đó dưới dạng khác: thêm một patch, <code>make</code> không áp nó, vì ' +
      '<code>.stamp_patched</code> vẫn còn. Cả hai lần, build system <b>không biết</b> đầu vào của một bước đã ' +
      'đổi.' },

    { t: 'p', x:
      'BitBake giải quyết triệt để bằng cách không dùng thời gian nữa. Với mỗi task, nó tính một <b>chữ ký</b> ' +
      '(SHA-256) từ mọi thứ có thể ảnh hưởng tới kết quả của task đó:' },

    { t: 'list', items: [
      'mã của chính hàm task (thân <code>do_compile</code> sau khi mở mọi biến);',
      'giá trị của mọi biến mà hàm đó dùng — <code>CC</code>, <code>CFLAGS</code>, <code>EXTRA_OEMAKE</code>…;',
      'checksum của mọi file cục bộ trong <code>SRC_URI</code> (patch, script);',
      'chữ ký của các task mà nó phụ thuộc — <code>do_compile</code> chứa chữ ký của <code>do_configure</code>, ' +
        'cái này lại chứa chữ ký của <code>do_patch</code>, và cứ thế lùi về <code>do_fetch</code>.'
    ] },

    { t: 'p', x:
      'Dòng cuối là mấu chốt: một thay đổi ở đầu chuỗi lan xuống mọi task phía sau, tự động. Không cần nhớ quy ' +
      'tắc \"thêm patch thì phải dirclean\" như Bài 61 — patch đổi thì chữ ký <code>do_fetch</code> đổi, kéo theo ' +
      '<code>do_unpack</code>, <code>do_patch</code>… cho tới cuối. Ngược lại, một thay đổi không ảnh hưởng gì ' +
      '(một dòng chú thích) không đổi chữ ký nào, nên không có gì phải chạy lại. Bước 6 của phần thực hành đo đúng ' +
      'ba trường hợp này.' },

    { t: 'fig', cap: 'Chữ ký của mỗi task gồm đầu vào riêng của nó cộng chữ ký của task trước. Sửa EXTRA_OEMAKE chỉ đổi đầu vào của do_configure trở đi — fetch, unpack, patch giữ nguyên chữ ký và được dùng lại. Sửa một patch đổi đầu vào của do_fetch, và mọi task phía sau đổi theo.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Chuỗi chữ ký task: fetch, unpack, patch, configure, compile, install; thay đổi biến chỉ ảnh hưởng từ configure trở đi, thay đổi patch ảnh hưởng từ fetch trở đi">' +
        '<rect class="d-box" x="20" y="90" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="70" y="114" text-anchor="middle">do_fetch</text>' +
        '<text class="d-ts" x="70" y="132" text-anchor="middle">+ checksum patch</text>' +
        '<path class="d-line" d="M120 118 H130"/><path class="d-arrow" d="M138 118 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="138" y="90" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="188" y="122" text-anchor="middle">do_unpack</text>' +
        '<path class="d-line" d="M238 118 H248"/><path class="d-arrow" d="M256 118 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="256" y="90" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="306" y="122" text-anchor="middle">do_patch</text>' +
        '<path class="d-line" d="M356 118 H366"/><path class="d-arrow" d="M374 118 l-8 -5 v10 z"/>' +
        '<rect class="d-box-a" x="374" y="90" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="424" y="114" text-anchor="middle">do_configure</text>' +
        '<text class="d-ts" x="424" y="132" text-anchor="middle">+ EXTRA_OEMAKE</text>' +
        '<path class="d-line" d="M474 118 H484"/><path class="d-arrow" d="M492 118 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="492" y="90" width="100" height="56" rx="8"/>' +
        '<text class="d-t" x="542" y="114" text-anchor="middle">do_compile</text>' +
        '<text class="d-ts" x="542" y="132" text-anchor="middle">+ CC, CFLAGS</text>' +
        '<path class="d-line" d="M592 118 H602"/><path class="d-arrow" d="M610 118 l-8 -5 v10 z"/>' +
        '<rect class="d-box" x="610" y="90" width="90" height="56" rx="8"/>' +
        '<text class="d-t" x="655" y="122" text-anchor="middle">do_install</text>' +
        '<rect class="d-box-w" x="20" y="20" width="680" height="44" rx="8"/>' +
        '<text class="d-ts" x="360" y="40" text-anchor="middle">sửa 1 dòng mô tả trong patch → chữ ký đổi từ do_fetch đến hết: 18 chữ ký mới</text>' +
        '<text class="d-ts" x="360" y="56" text-anchor="middle">(Buildroot ở Bài 61: không gì chạy lại cho tới khi bạn tự dirclean)</text>' +
        '<rect class="d-box-g" x="374" y="176" width="326" height="44" rx="8"/>' +
        '<text class="d-ts" x="537" y="196" text-anchor="middle">thêm EXTRA_OEMAKE → đổi từ do_configure: 11 chữ ký mới</text>' +
        '<text class="d-ts" x="537" y="212" text-anchor="middle">fetch / unpack / patch giữ nguyên, được dùng lại</text>' +
        '<rect class="d-box" x="20" y="176" width="336" height="44" rx="8"/>' +
        '<text class="d-ts" x="188" y="196" text-anchor="middle">thêm 1 dòng chú thích # vào recipe</text>' +
        '<text class="d-ts" x="188" y="212" text-anchor="middle">→ 0 chữ ký mới, không task nào chạy lại</text>' +
        '</svg>' },

    { t: 'h3', x: 'Shared state: dùng lại kết quả theo chữ ký' },

    { t: 'p', x:
      'Khi đã có chữ ký, BitBake làm thêm một việc Buildroot không làm được: lưu <b>kết quả</b> của các task quan ' +
      'trọng vào thư mục <code>sstate-cache/</code>, đặt tên theo chữ ký. Lần sau cần task có chữ ký đó — trên ' +
      'cùng máy, trong một thư mục build khác, thậm chí trên máy của đồng nghiệp — BitBake lấy kết quả từ cache ' +
      'thay vì chạy lại. Đây là lý do một công ty dùng Yocto thường đặt một <b>sstate mirror</b> trên máy chủ ' +
      'nội bộ: build đầu tiên của một kỹ sư mới chỉ mất vài phút vì gần như mọi thứ đã có sẵn.' },

    { t: 'p', x:
      'Bài 60 cho Buildroot một ví dụ ngược: <code>make clean all</code> mất <b>25 phút 26 giây</b>, lâu hơn cả ' +
      'lần build đầu, vì <code>output/</code> bị xoá là mọi kết quả trung gian mất theo; chỉ có <code>dl/</code> ' +
      'được giữ. Yocto giữ hai cache độc lập với thư mục làm việc: <code>downloads/</code> (như <code>dl/</code>) ' +
      'và <code>sstate-cache/</code>. Xoá <code>tmp/</code> của Yocto là việc bình thường, vì phần lớn sẽ được ' +
      'khôi phục từ sstate.' },

    { t: 'cal', kind: 'why', title: 'Vì sao Yocto build lần đầu chậm hơn Buildroot nhiều',
      x: 'Cái giá của sự chính xác. BitBake phải đọc và ghép metadata cho khoảng 950 recipe trước khi làm bất cứ ' +
         'việc gì (bước 4 đo: <b>26 giây</b> chỉ để phân tích). Mỗi recipe có hai chục task thay vì năm stamp. ' +
         'Mỗi gói được đóng thành <code>.ipk</code>, kèm giấy phép, SPDX, kiểm tra QA. Và cấu hình mặc định build ' +
         'nhiều thứ hơn: ảnh tối thiểu của bạn cần <b>316 recipe</b> và <b>5 150 task</b> (bước 5), trong khi ảnh ' +
         'Buildroot của Bài 60 có 62 package. Đổi lại, lần build thứ hai trở đi — nhờ sstate — thường nhanh hơn ' +
         'Buildroot, và không bao giờ cho ra một ảnh \"cũ\" vì quên dirclean.' },

    /* ============================================================
       LÝ THUYẾT 4 — SO SÁNH VÀ LỰA CHỌN
       ============================================================ */
    { t: 'h2', x: 'Buildroot và Yocto: bảng tương ứng, và khi nào chọn cái nào' },

    { t: 'p', x:
      'Mọi khái niệm của Bài 60–61 đều có một bản tương ứng bên Yocto. Bảng này là bản đồ để bạn chuyển từ cái ' +
      'đã biết sang cái mới — và là câu trả lời ngắn gọn nhất khi người phỏng vấn hỏi \"hai cái khác nhau thế ' +
      'nào\":' },

    { t: 'table',
      head: ['Bài 60–61 (Buildroot)', 'Bài 62 (Yocto)', 'Ghi chú'],
      rows: [
        ['<code>make</code>', '<code>bitbake &lt;target&gt;</code>', 'Target của Yocto thường là một <i>image recipe</i>: <code>bitbake learn-image</code>'],
        ['<code>.config</code> + <code>make menuconfig</code>', '<code>conf/local.conf</code> sửa bằng tay', 'Không có menu toàn hệ thống; <code>bitbake -c menuconfig virtual/kernel</code> chỉ dành cho kernel / BusyBox'],
        ['defconfig (18 / 22 dòng)', '<code>local.conf</code> + <code>bblayers.conf</code> + image recipe', 'Yocto không có một file \"cả hệ thống\"; các công ty thường ghi danh sách layer bằng một công cụ như <code>kas</code> hoặc <code>repo</code>'],
        ['Cây br2-external <code>LEARN</code>', 'Layer <code>meta-learn</code>', 'Cả hai nằm ngoài cây gốc và là một repo Git nhỏ'],
        ['<code>external.desc</code>', '<code>conf/layer.conf</code>', 'Tên + nơi tìm recipe; layer còn khai báo phụ thuộc và codename tương thích'],
        ['<code>package/temp-daemon/temp-daemon.mk</code> (26 dòng)', '<code>recipes-apps/temp-daemon/temp-daemon_1.0.bb</code> (25 dòng)', 'Phiên bản nằm trong tên file recipe'],
        ['<code>Config.in</code> + <code>BR2_PACKAGE_TEMP_DAEMON=y</code>', '<code>IMAGE_INSTALL:append = " temp-daemon"</code>', 'Yocto không có \"bật package\"; recipe nào được image kéo vào thì được build'],
        ['<code>.hash</code>', '<code>SRC_URI[sha256sum]</code> + <code>LIC_FILES_CHKSUM</code>', 'Yocto còn băm cả file giấy phép, để phát hiện khi upstream đổi license'],
        ['<code>BR2_GLOBAL_PATCH_DIR/&lt;pkg&gt;/</code>', '<code>SRC_URI += "file://0001-….patch"</code>', 'Patch nằm cạnh recipe, trong thư mục <code>files/</code>'],
        ['<code>generic-package</code>, <code>autotools-package</code>', '<code>inherit autotools</code>, <code>cmake</code>, <code>meson</code>…', 'Class; recipe không <code>inherit</code> gì vẫn có bộ task mặc định'],
        ['Overlay rootfs', 'Recipe hoặc <code>.bbappend</code> cài file', 'File cũng phải thuộc về một gói; không có \"chép đè\" vô chủ'],
        ['Script post-build', '<code>ROOTFS_POSTPROCESS_COMMAND</code>', 'Hàm shell trong image recipe, chạy trên <code>${IMAGE_ROOTFS}</code>'],
        ['<code>output/build/&lt;pkg&gt;-&lt;ver&gt;</code>', '<code>tmp/work/&lt;arch&gt;/&lt;pn&gt;/&lt;pv&gt;/</code>', 'Bước 5 mở thư mục này cho <code>temp-daemon</code>'],
        ['<code>output/target</code> (một thư mục chung)', '<code>${D}</code> riêng mỗi recipe → gói <code>.ipk</code> → rootfs', 'Lý do Yocto biết file nào thuộc gói nào'],
        ['<code>make temp-daemon-dirclean</code>', '(thường không cần) <code>bitbake -c cleansstate temp-daemon</code>', 'Chữ ký tự quyết định task nào chạy lại'],
        ['<code>dl/</code>', '<code>downloads/</code> + <b><code>sstate-cache/</code></b>', 'sstate không có tương ứng trong Buildroot']
      ] },

    { t: 'p', x:
      'Không cái nào \"tốt hơn\" một cách tuyệt đối. Chúng tối ưu cho hai kiểu dự án khác nhau, và lựa chọn ' +
      'thường được quyết định bởi những thứ nằm ngoài kỹ thuật thuần tuý:' },

    { t: 'table',
      head: ['Tiêu chí', 'Nghiêng về Buildroot', 'Nghiêng về Yocto'],
      rows: [
        ['BSP của hãng chip', 'Hãng không cung cấp, hoặc cung cấp cấu hình Buildroot', 'Hãng giao layer Yocto (NXP <code>meta-imx</code>, TI, Renesas, Qualcomm…) — trường hợp phổ biến nhất trong công nghiệp'],
        ['Số sản phẩm', 'Một thiết bị, một ảnh', 'Một họ sản phẩm dùng chung phần lớn phần mềm, khác nhau ở vài layer'],
        ['Cập nhật trên thiết bị', 'Thay cả ảnh (A/B, Bài 69)', 'Cần cài / cập nhật từng gói, hoặc cả hai'],
        ['Tuân thủ giấy phép, SBOM', 'Có <code>make legal-info</code>, đủ cho dự án nhỏ', 'SPDX cho từng gói và ảnh, theo dõi CVE (<code>cve-check</code>) — ngành ô tô, y tế thường yêu cầu'],
        ['Đội ngũ', '1–5 người, cần hiểu toàn bộ hệ thống', 'Nhiều đội, mỗi đội giữ vài layer; có người lo hạ tầng build'],
        ['Máy build', 'Laptop 16 GB như máy của bạn: lần đầu ~25 phút (Bài 60)', 'Tài liệu 6.0: tối thiểu 32 GB RAM, 140 GB đĩa; thực tế là máy chủ build + sstate mirror'],
        ['Thời gian học', 'Vài ngày — bạn đã đọc được cơ chế của nó ở Bài 60', 'Vài tuần đến vài tháng để thạo']
      ] },

    { t: 'cal', kind: 'tip', title: 'Câu trả lời phỏng vấn trong ba câu',
      x: 'Buildroot là một Makefile lớn sinh ra một ảnh rootfs: đơn giản, nhanh cho lần đầu, nhưng không biết ' +
         'file nào thuộc package nào và build lại thường phải làm sạch bằng tay. Yocto là một hệ thống phân phối: ' +
         'mỗi recipe sinh ra gói, ảnh được dựng bằng cách cài gói, và chữ ký băm của từng task quyết định chính ' +
         'xác cái gì cần build lại, kèm sstate để dùng lại kết quả giữa các máy. Chọn Buildroot cho một sản phẩm ' +
         'nhỏ, đội nhỏ; chọn Yocto khi hãng chip giao BSP dạng layer, khi có nhiều sản phẩm, hoặc khi cần quản ' +
         'lý gói, SBOM và vòng đời dài.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: một layer, một recipe, và hỏi BitBake nó sẽ làm gì' },

    { t: 'cal', kind: 'warn', title: 'Bài này không build ảnh — và vì sao',
      x: 'Tài liệu đi kèm Yocto 6.0.4 (<code>ref-manual/system-requirements.rst</code>) ghi: tối thiểu ' +
         '<b>32 GB RAM</b> và <b>140 GB</b> đĩa trống để build <code>core-image-sato</code>; máy của bạn có ' +
         '15,4 GiB. Danh sách distro được hỗ trợ bắt đầu từ Ubuntu 22.04, trong khi WSL của bạn là 20.04. Một lần ' +
         'build thật vẫn có thể chạy được trên máy này, nhưng sẽ mất nhiều giờ và rủi ro hết bộ nhớ giữa chừng — ' +
         'không đáng cho một bài đọc hiểu. Mọi lệnh dưới đây <b>chỉ phân tích</b> (đọc metadata, tính đồ thị, tính ' +
         'chữ ký); lệnh duy nhất chạy task thật là <code>-c unpack</code> ở bước 5, mất vài giây. Nếu sau này bạn ' +
         'có một máy 32 GB+, bước cuối của Yocto chỉ là <code>bitbake learn-image</code> rồi ' +
         '<code>runqemu qemuarm64</code> — mọi thứ trước đó bạn đã dựng ở đây.' },

    { t: 'p', x:
      'Toàn bộ bài làm trong <code>~/bai62</code> (khoảng 1–1,2 GB khi xong). Bạn dùng lại hai thứ Bài 61 bảo giữ: ' +
      'tarball <code>~/bai61/upstream/temp-daemon-1.0.tar.gz</code> và patch trong ' +
      '<code>~/bai61/br-ext/patches/temp-daemon/</code>. Mở một terminal WSL, đặt <code>PATH</code> sạch như Bài ' +
      '60 và kiểm tra hai file đó còn:' },

    { t: 'code', where: 'wsl', code:
      'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
      'mkdir -p ~/bai62 && cd ~/bai62\n' +
      'sha256sum ~/bai61/upstream/temp-daemon-1.0.tar.gz\n' +
      'ls ~/bai61/br-ext/patches/temp-daemon/' },

    { t: 'code', where: 'out', nocopy: true, code:
      'cdc7160c1ddbba8142ac08b8f8f8199e685e33168c5c7af75e50cb3e622a31ef  /home/cah8hc/bai61/upstream/temp-daemon-1.0.tar.gz\n' +
      '0001-Take-the-listening-port-from-argv-1.patch' },

    { t: 'p', x:
      'Hash <code>cdc7160c…</code> đúng là giá trị Bài 61 ghi vào <code>temp-daemon.hash</code> — tarball còn ' +
      'nguyên, vì Bài 61 đóng nó tái lập được. Phần <code>/home/cah8hc</code> là thư mục nhà trên máy soạn bài; ' +
      'trên máy bạn nó mang tên user của bạn, ở mọi lệnh trong bài.' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Lấy BitBake, OpenEmbedded-Core và meta-yocto ở tag yocto-6.0.4',
        blocks: [
          { t: 'p', x:
            'Với Buildroot, bạn tải một tarball. Với Yocto, bạn clone ba kho Git ở cùng một tag phát hành — mỗi kho ' +
            'là một thành phần của bảng lý thuyết đầu bài. <code>--depth 1</code> chỉ lấy đúng một commit, vì bạn ' +
            'không cần lịch sử để đọc:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai62\n' +
            'git clone --depth 1 -b yocto-6.0.4 https://git.openembedded.org/bitbake bitbake\n' +
            'git clone --depth 1 -b yocto-6.0.4 https://git.openembedded.org/openembedded-core openembedded-core\n' +
            'git clone --depth 1 -b yocto-6.0.4 https://git.yoctoproject.org/meta-yocto meta-yocto\n' +
            'du -sh bitbake openembedded-core meta-yocto' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Note: switching to \'51fd94a67fa17650a9ff623492005972bbc7d26f\'.\n' +
            '…\n' +
            '14M\tbitbake\n' +
            '50M\topenembedded-core\n' +
            '696K\tmeta-yocto' },

          { t: 'cmdx', cmd: 'git clone --depth 1 -b yocto-6.0.4 URL thư_mục', title: 'Các tham số của git clone', rows: [
            ['<code>--depth 1</code>', 'Chỉ tải commit được chỉ định, không tải lịch sử', 'Kho OE-Core đầy đủ lớn hơn nhiều lần; bài này chỉ đọc'],
            ['<code>-b yocto-6.0.4</code>', 'Lấy đúng <b>tag</b> phát hành, không phải đầu nhánh', 'Ba kho phải cùng một bản phát hành; ghim tag giống ghim Buildroot 2026.02.3 ở Bài 60'],
            ['<code>Note: switching to …</code>', 'Git báo bạn đang ở trạng thái \"detached HEAD\"', 'Bình thường khi checkout một tag; bài soạn đã cắt bớt khối hướng dẫn dài của Git']
          ] },

          { t: 'p', x:
            'Ba kho mất 4–7 giây mỗi kho trên máy soạn bài. 14 + 50 MB + 696 KB — nhỏ hơn tarball Buildroot giải ' +
            'nén (89 MB, Bài 60). <code>meta-yocto</code> chỉ 696 KB vì nó gần như chỉ chứa file cấu hình của distro ' +
            'Poky; toàn bộ recipe nằm trong <code>openembedded-core</code>. Bài này sẽ không dùng tới ' +
            '<code>meta-yocto</code> — nó ở đây để bạn mở <code>meta-yocto/meta-poky/conf/distro/poky.conf</code> ' +
            'và thấy một \"distro\" chỉ là một file <code>.conf</code>.' },

          { t: 'p', x:
            'Giờ đọc layer lõi. Ba lệnh dưới đếm những gì bảng lý thuyết đã nói: recipe, class, và các máy QEMU có ' +
            'sẵn:' },

          { t: 'code', where: 'wsl', code:
            'ls -1 openembedded-core/meta\n' +
            'find openembedded-core/meta -name \'*.bb\' | wc -l\n' +
            'find openembedded-core/meta -name \'*.bbclass\' | wc -l\n' +
            'ls -1 openembedded-core/meta/conf/machine' },

          { t: 'code', where: 'out', nocopy: true, code:
            'classes\nclasses-global\nclasses-recipe\nconf\nCOPYING.MIT\nfiles\nlib\n' +
            'recipes-bsp\nrecipes-connectivity\nrecipes-core\nrecipes-devtools\nrecipes-extended\n' +
            'recipes-gnome\nrecipes-graphics\nrecipes-kernel\nrecipes-multimedia\nrecipes-rt\n' +
            'recipes-sato\nrecipes-support\nrecipes.txt\nsite\n' +
            '950\n' +
            '234\n' +
            'include\nqemuarm64.conf\nqemuarm.conf\nqemuarmv5.conf\nqemuloongarch64.conf\n' +
            'qemumips64.conf\nqemumips.conf\nqemuppc64.conf\nqemuppc.conf\nqemuriscv32.conf\n' +
            'qemuriscv64.conf\nqemux86-64.conf\nqemux86.conf' },

          { t: 'p', x:
            '<b>950</b> recipe <code>.bb</code> chia theo chủ đề trong 12 thư mục <code>recipes-*</code> (Buildroot ' +
            'đặt 2 786 package phẳng trong một <code>package/</code>). <b>234</b> class nằm trong ba thư mục: ' +
            '<code>classes-global</code> áp cho mọi recipe, <code>classes-recipe</code> cho recipe nào ' +
            '<code>inherit</code> nó, <code>classes</code> dùng được cả hai cách. Và <code>conf/machine</code> chỉ ' +
            'có máy QEMU — <code>qemuarm64.conf</code> là máy bạn sẽ chọn. Board thật nằm trong layer BSP của hãng ' +
            'chip, không bao giờ nằm trong OE-Core.' },

          { t: 'p', x:
            'Mở một recipe thật để thấy hình dạng của nó trước khi tự viết. BusyBox là lựa chọn tự nhiên — bạn đã ' +
            'build nó bằng tay ở Bài 47 và qua Buildroot ở Bài 60:' },

          { t: 'code', where: 'wsl', code:
            'ls -1 openembedded-core/meta/recipes-core/busybox\n' +
            'wc -l openembedded-core/meta/recipes-core/busybox/busybox_1.37.0.bb openembedded-core/meta/recipes-core/busybox/busybox.inc\n' +
            'ls openembedded-core/meta/recipes-core/busybox/busybox | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            'busybox\nbusybox_1.37.0.bb\nbusybox.inc\nbusybox-inittab_1.37.0.bb\nfiles\n' +
            '   74 openembedded-core/meta/recipes-core/busybox/busybox_1.37.0.bb\n' +
            '  538 openembedded-core/meta/recipes-core/busybox/busybox.inc\n' +
            '  612 total\n' +
            '46' },

          { t: 'p', x:
            'Ba điều đọc được từ đây. Tên file <code>busybox_1.37.0.bb</code> tự mang phiên bản — cùng 1.37.0 mà ' +
            'Buildroot 2026.02.3 dùng ở Bài 60. Recipe chỉ 74 dòng vì phần chung nằm trong <code>busybox.inc</code> ' +
            '(538 dòng), được kéo vào bằng <code>require</code> — để khi lên 1.38.0 chỉ cần một file <code>.bb</code> ' +
            'mới. Và thư mục <code>busybox/</code> bên cạnh có 46 file: patch, file cấu hình, script khởi động. Mọi ' +
            'thứ recipe cần đều nằm cạnh nó, được gọi tên trong <code>SRC_URI</code> bằng <code>file://</code> — ' +
            'bước 4 bạn sẽ làm y như vậy.' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Môi trường BitBake: Python 3.9, buildtools và HOSTTOOLS, không cần sudo',
        blocks: [
          { t: 'p', x:
            'BitBake không được \"cài\". Bạn <b>source</b> một script, nó thêm <code>bitbake/bin</code> và ' +
            '<code>openembedded-core/scripts</code> vào <code>PATH</code>, tạo thư mục build nếu chưa có, rồi ' +
            '<code>cd</code> vào đó. Thử ngay — và chú ý đây là lệnh <code>.</code> (source), không phải chạy ' +
            'script:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai62\n' +
            '. openembedded-core/oe-init-build-env build\n' +
            'pwd\n' +
            'python3 --version\n' +
            'bitbake-layers show-layers' },

          { t: 'code', where: 'out', nocopy: true, code:
            'You had no conf/local.conf file. This configuration file has therefore been\n' +
            'created for you from /home/cah8hc/bai62/openembedded-core/meta/conf/templates/default/local.conf.sample\n' +
            '…\n' +
            'You had no conf/bblayers.conf file. This configuration file has therefore been\n' +
            'created for you from /home/cah8hc/bai62/openembedded-core/meta/conf/templates/default/bblayers.conf.sample\n' +
            '…\n' +
            '### Shell environment set up for builds. ###\n' +
            '\n' +
            'You can now run \'bitbake <target>\'\n' +
            '…\n' +
            '/home/cah8hc/bai62/build\n' +
            'Python 3.8.10\n' +
            'Traceback (most recent call last):\n' +
            '  File "/home/cah8hc/bai62/bitbake/bin/bitbake-layers", line 25, in <module>\n' +
            '    import bb.tinfoil\n' +
            '  File "/home/cah8hc/bai62/bitbake/lib/bb/__init__.py", line 16, in <module>\n' +
            '    raise RuntimeError("Sorry, python 3.9.0 or later is required for this version of bitbake")\n' +
            'RuntimeError: Sorry, python 3.9.0 or later is required for this version of bitbake' },

          { t: 'p', x:
            'Nửa đầu đã thành công: script tạo <code>build/conf/local.conf</code> và <code>bblayers.conf</code> từ ' +
            'mẫu, và shell giờ đang ở <code>~/bai62/build</code>. Nửa sau thất bại ngay dòng đầu tiên của BitBake: ' +
            'BitBake 2.18 cần Python <b>3.9</b>, Ubuntu 20.04 chỉ có <b>3.8.10</b>. Đây là cách Yocto báo cho bạn ' +
            'biết distro của bạn đã quá cũ so với nó.' },

          { t: 'cal', kind: 'why', title: 'Vì sao không cài Python mới cho cả hệ thống',
            x: 'Bạn có thể <code>apt install python3.9</code>, nhưng ngay sau đó BitBake sẽ đòi tiếp: GCC ≥ 10.1 (máy ' +
               'có 9.4), g++ hỗ trợ C++20, tar ≥ 1.28… — mỗi thứ là một gói hệ thống bạn phải nâng cấp, và thay ' +
               '<code>/usr/bin/python3</code> có thể làm hỏng chính <code>apt</code>. Yocto lường trước điều này: ' +
               'nó phát hành <b>buildtools</b>, một bộ Python + GCC + git + make… dựng sẵn bằng chính Yocto, giải ' +
               'nén vào một thư mục bất kỳ, không cần <code>sudo</code>, không đụng tới hệ thống. Đó là ý tưởng của ' +
               'Bài 26–28: một toolchain đóng gói riêng, tách khỏi máy chủ.' },

          { t: 'p', x:
            'Script <code>install-buildtools</code> nằm sẵn trong OE-Core. Bản thân nó cần Python 3.9 — máy soạn ' +
            'bài đã có <code>python3.9</code> cài cạnh 3.8 từ lúc build kernel ở Chặng 07 (<code>python3.9 ' +
            '--version</code> để kiểm tra). Mở một terminal mới (để thoát môi trường vừa source) và chạy:' },

          { t: 'code', where: 'wsl', code:
            'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
            'cd ~/bai62\n' +
            'python3.9 openembedded-core/scripts/install-buildtools -d ~/bai62/buildtools\n' +
            'du -sh buildtools' },

          { t: 'code', where: 'out', nocopy: true, code:
            'INFO: Fetching buildtools installer\n' +
            'INFO: Fetching buildtools installer checksum\n' +
            'INFO: Checksum success\n' +
            'INFO: Making installer executable\n' +
            'Extended Build tools installer version 6.0.3\n' +
            '============================================\n' +
            'You are about to install the SDK to "/home/cah8hc/bai62/buildtools". Proceed [Y/n]? Y\n' +
            'Extracting SDK.......................done\n' +
            'Setting it up...done\n' +
            'SDK has been successfully set up and is ready to be used.\n' +
            '…\n' +
            'INFO: Installation successful. Remember to source the environment setup script now and in any new session.\n' +
            '508M\tbuildtools' },

          { t: 'cmdx', cmd: 'python3.9 install-buildtools -d ~/bai62/buildtools', title: 'install-buildtools làm gì', rows: [
            ['<code>python3.9</code>', 'Chạy script bằng Python 3.9 thay vì <code>python3</code> mặc định (3.8)', 'Dòng đầu của script là <code>#!/usr/bin/env python3</code>, sẽ chọn 3.8'],
            ['<code>-d ~/bai62/buildtools</code>', 'Thư mục cài', 'Không có <code>-d</code>, nó cài vào <code>openembedded-core/buildtools</code>'],
            ['<code>Fetching … checksum</code>, <code>Checksum success</code>', 'Tải bộ cài 85 MB từ <code>downloads.yoctoproject.org</code> và kiểm tra sha256', 'Cùng nguyên tắc với <code>.sign</code> của Buildroot ở Bài 60'],
            ['<code>version 6.0.3</code>', 'Bản buildtools mặc định ghi cứng trong script', 'Bản 6.0.3 dùng tốt cho metadata 6.0.4; buildtools chỉ là công cụ chạy, không phải metadata']
          ] },

          { t: 'p', x:
            'Trên máy soạn bài, bước này mất 24 giây ở lần đầu và 159 giây ở lần chạy lại (proxy công ty). 508 MB ' +
            'là một hệ thống công cụ hoàn chỉnh. Thử dùng nó: source script môi trường của buildtools <b>trước</b>, ' +
            'rồi mới source môi trường BitBake:' },

          { t: 'code', where: 'wsl', code:
            '. ~/bai62/buildtools/environment-setup-x86_64-pokysdk-linux\n' +
            'python3 --version\n' +
            'gcc --version | head -1\n' +
            '. openembedded-core/oe-init-build-env build > /dev/null\n' +
            'bitbake-layers show-layers' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Python 3.14.6\n' +
            'gcc (GCC) 15.3.0\n' +
            'NOTE: Starting bitbake server...\n' +
            'ERROR: The following required tools (as specified by HOSTTOOLS) appear to be unavailable in PATH, please install them in order to proceed:\n' +
            '  diffstat gawk' },

          { t: 'p', x:
            'Python giờ là <b>3.14.6</b>, GCC là <b>15.3.0</b> — đều từ buildtools, nên BitBake đã chạy được. Nhưng ' +
            'nó dừng ở một kiểm tra khác: <code>HOSTTOOLS</code>, danh sách khoảng 120 lệnh máy chủ mà OE-Core cho ' +
            'phép các task dùng. BitBake tạo một thư mục <code>tmp/hosttools</code> chỉ chứa symlink tới đúng những ' +
            'lệnh đó, rồi đặt <code>PATH</code> của mọi task chỉ trỏ vào đấy — một task không thể vô tình dùng một ' +
            'lệnh lạ trên máy bạn. Đây là cách Yocto bịt nguồn rò rỉ \"máy build\" của Bài 59. Buildtools không có ' +
            '<code>gawk</code> và <code>diffstat</code>, máy chủ cũng không.' },

          { t: 'p', x:
            'Cách thông thường là <code>sudo apt install gawk diffstat</code>. Nếu bạn có quyền đó, làm vậy và bỏ ' +
            'qua đoạn này. Trên máy soạn bài, <code>sudo</code> đòi mật khẩu, nên bài dùng một cách không cần root: ' +
            'tải file <code>.deb</code> và chỉ giải nén nó vào một thư mục riêng — chính kỹ thuật Bài 48 đã dùng để ' +
            'kiểm tra <code>squashfs-tools</code>:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai62/debs && cd ~/bai62/debs\n' +
            'apt-get download gawk diffstat\n' +
            'ls\n' +
            'for f in *.deb; do dpkg-deb -x "$f" ~/bai62/hosttools; done\n' +
            'ls ~/bai62/hosttools/usr/bin\n' +
            'ldd ~/bai62/hosttools/usr/bin/gawk | grep sigsegv\n' +
            'cd ~/bai62' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Fetched 442 kB in 4s (122 kB/s)\n' +
            'diffstat_1.63-1_amd64.deb\n' +
            'gawk_1%3a5.0.1+dfsg-1ubuntu0.1_amd64.deb\n' +
            'diffstat\n' +
            'gawk\n' +
            '\tlibsigsegv.so.2 => /lib/x86_64-linux-gnu/libsigsegv.so.2 (0x00007fde31f3d000)' },

          { t: 'cmdx', cmd: 'apt-get download … ; dpkg-deb -x FILE.deb DIR', title: 'Lấy chương trình từ .deb mà không cài', rows: [
            ['<code>apt-get download gawk diffstat</code>', 'Chỉ tải file <code>.deb</code> vào thư mục hiện tại', 'Không cần root; không ghi gì vào hệ thống'],
            ['<code>dpkg-deb -x "$f" ~/bai62/hosttools</code>', 'Giải nén phần dữ liệu của gói, giữ nguyên cây <code>usr/bin/…</code>', 'Khác <code>dpkg -i</code>: không chạy script cài, không ghi vào cơ sở dữ liệu của dpkg'],
            ['<code>ldd … | grep sigsegv</code>', 'Kiểm tra <code>gawk</code> tìm thấy thư viện nó cần', '<code>libsigsegv.so.2</code> đã có sẵn trên máy (một gói khác dùng nó); nếu dòng này báo <code>not found</code>, tải thêm <code>libsigsegv2</code>']
          ] },

          { t: 'p', x:
            'Hai chương trình đã nằm trong <code>~/bai62/hosttools/usr/bin</code>, và <code>ldd</code> cho thấy ' +
            '<code>gawk</code> tìm được thư viện duy nhất nó cần ngoài libc. Địa chỉ <code>0x00007f…</code> thay đổi ' +
            'mỗi lần chạy (ASLR, Bài 17). Dòng <code>Fetched 442 kB</code> có thể đi kèm vài cảnh báo ' +
            '<code>504</code> từ mirror nội bộ trên máy soạn bài — chúng không ảnh hưởng.' },

          { t: 'p', x:
            'Ba thứ phải được nạp theo đúng thứ tự trong mỗi terminal mới. Gom chúng vào một file để không phải gõ ' +
            'lại:' },

          { t: 'code', where: 'file', name: '~/bai62/env.sh', lang: 'bash', code:
            'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
            '. ~/bai62/buildtools/environment-setup-x86_64-pokysdk-linux\n' +
            'export PATH="$PATH:$HOME/bai62/hosttools/usr/bin"\n' +
            'cd ~/bai62 && . openembedded-core/oe-init-build-env build > /dev/null' },

          { t: 'cmdx', cmd: '~/bai62/env.sh', title: 'Vì sao đúng thứ tự này', rows: [
            ['<code>export PATH=…</code>', 'Bắt đầu từ <code>PATH</code> sạch', 'Gỡ các đường dẫn Windows; dòng này cũng làm file chạy lại được nhiều lần mà <code>PATH</code> không dài thêm'],
            ['<code>. …/environment-setup-…</code>', 'Đặt Python, GCC… của buildtools <b>lên đầu</b> <code>PATH</code>', 'Phải trước BitBake, để BitBake chạy bằng Python 3.14'],
            ['<code>PATH="$PATH:…/hosttools/usr/bin"</code>', 'Nối <code>gawk</code>, <code>diffstat</code> vào <b>cuối</b>', 'Ở cuối để không che bất kỳ công cụ nào của buildtools'],
            ['<code>. …/oe-init-build-env build</code>', 'Thêm BitBake vào <code>PATH</code> và <code>cd</code> vào <code>~/bai62/build</code>', '<code>&gt; /dev/null</code> giấu đoạn chào dài bạn đã đọc ở trên']
          ] },

          { t: 'code', where: 'wsl', code:
            '. ~/bai62/env.sh\n' +
            'pwd\n' +
            'bitbake-layers show-layers' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/home/cah8hc/bai62/build\n' +
            'NOTE: Starting bitbake server...\n' +
            'layer                 path                                                                    priority\n' +
            '========================================================================================================\n' +
            'core                  /home/cah8hc/bai62/openembedded-core/meta                               5' },

          { t: 'p', x:
            'Lần này không còn lỗi. <code>NOTE: Starting bitbake server...</code> cho thấy BitBake chạy như một tiến ' +
            'trình nền: lần gọi đầu khởi động server, các lần sau chỉ \"kết nối lại\" (<code>Reconnecting to bitbake ' +
            'server</code>) và dùng lại metadata đã đọc. Bảng cho biết cấu hình mặc định chỉ có <b>một</b> layer: ' +
            '<code>core</code> — tên mà <code>openembedded-core/meta/conf/layer.conf</code> tự đặt cho mình — với ' +
            'priority 5. Từ đây, mọi terminal mới chỉ cần <code>. ~/bai62/env.sh</code>.' },

          { t: 'cal', kind: 'info', title: 'Hai dòng cảnh báo bạn có thể gặp',
            x: '<code>WARNING: You are running bitbake under WSLv2, this works properly but you should optimize your ' +
               'VHDX file eventually…</code> xuất hiện ở mọi lệnh phân tích recipe: BitBake nhận ra WSL2 và nhắc rằng ' +
               'đĩa ảo của WSL không tự co lại. Nó vô hại. Máy soạn bài còn in <code>WARNING: … ~/.netrc access too ' +
               'permissive</code> vì một file cấu hình riêng của máy đó; các bản ghi kết quả trong bài đã lược dòng ' +
               'này. Khác với Buildroot ở Bài 60, BitBake <b>không</b> dừng khi <code>PATH</code> có khoảng trắng — bài ' +
               'soạn đã thử nối <code>/mnt/c/Program Files/…</code> vào <code>PATH</code>, <code>show-layers</code> vẫn ' +
               'chạy bình thường. Dòng <code>export PATH=…</code> trong <code>env.sh</code> là để gọn gàng, không phải ' +
               'bắt buộc.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Thư mục build, chọn MACHINE, và tạo layer meta-learn',
        blocks: [
          { t: 'p', x:
            '<code>oe-init-build-env</code> đã tạo <code>~/bai62/build/conf</code>. Đây là chỗ tương ứng với ' +
            '<code>.config</code> của Buildroot — nhưng là hai file thay vì một:' },

          { t: 'code', where: 'wsl', code:
            'ls -1 conf\n' +
            'wc -l conf/local.conf conf/bblayers.conf\n' +
            'grep -v \'^#\' conf/bblayers.conf | grep -v \'^$\'\n' +
            'grep -n \'^MACHINE\' conf/local.conf' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bblayers.conf\nconf-notes.txt\nconf-summary.txt\nlocal.conf\ntemplateconf.cfg\n' +
            '  258 conf/local.conf\n' +
            '   10 conf/bblayers.conf\n' +
            '  268 total\n' +
            'LCONF_VERSION = "7"\n' +
            'BBPATH = "${TOPDIR}"\n' +
            'BBFILES ?= ""\n' +
            'BBLAYERS ?= " \\\n' +
            '  /home/cah8hc/bai62/openembedded-core/meta \\\n' +
            '  "\n' +
            '29:MACHINE ??= "qemux86-64"' },

          { t: 'p', x:
            '<code>bblayers.conf</code> là danh sách layer: lúc này chỉ có <code>meta</code> — đúng một dòng mà ' +
            '<code>show-layers</code> vừa in. <code>local.conf</code> dài 258 dòng nhưng gần như toàn chú thích; ' +
            'dòng có hiệu lực quan trọng nhất là dòng 29: <code>MACHINE ??= "qemux86-64"</code>. Toán tử ' +
            '<code>??=</code> nghĩa là \"mặc định yếu nhất\" — bạn có thể đè nó bằng biến môi trường ' +
            '<code>MACHINE=…</code> mà không sửa file. Ở đây bạn sửa file luôn, chọn máy ARM64 của khoá học:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'s/^MACHINE ??= "qemux86-64"/MACHINE ??= "qemuarm64"/\' conf/local.conf\n' +
            'grep -n \'^MACHINE\' conf/local.conf' },

          { t: 'code', where: 'out', nocopy: true, code: '29:MACHINE ??= "qemuarm64"' },

          { t: 'p', x:
            'Một dòng, và cả hệ thống đổi kiến trúc: compiler, tune, kernel, cách đóng ảnh đều suy ra từ ' +
            '<code>conf/machine/qemuarm64.conf</code>. Đối chiếu với Bài 60: đổi kiến trúc trong Buildroot là chọn ' +
            '<code>Target options</code> trong menuconfig, hoặc nạp một defconfig khác. Bước 4 sẽ cho bạn thấy giá ' +
            'trị này lan tới tận lệnh <code>gcc</code> của recipe.' },

          { t: 'p', x:
            'Giờ tạo layer của bạn. <code>bitbake-layers</code> có sẵn lệnh dựng khung, rồi một lệnh khác để thêm ' +
            'layer vào <code>bblayers.conf</code>:' },

          { t: 'code', where: 'wsl', code:
            'bitbake-layers create-layer ../meta-learn\n' +
            'find ../meta-learn -type f | sort\n' +
            'cat ../meta-learn/conf/layer.conf' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NOTE: Starting bitbake server...\n' +
            'Add your new layer with \'bitbake-layers add-layer ../meta-learn\'\n' +
            '../meta-learn/conf/layer.conf\n' +
            '../meta-learn/COPYING.MIT\n' +
            '../meta-learn/README\n' +
            '../meta-learn/recipes-example/example/example_0.1.bb\n' +
            '# We have a conf and classes directory, add to BBPATH\n' +
            'BBPATH .= ":${LAYERDIR}"\n' +
            '\n' +
            '# We have recipes-* directories, add to BBFILES\n' +
            'BBFILES += "${LAYERDIR}/recipes-*/*/*.bb \\\n' +
            '            ${LAYERDIR}/recipes-*/*/*.bbappend"\n' +
            '\n' +
            'BBFILE_COLLECTIONS += "meta-learn"\n' +
            'BBFILE_PATTERN_meta-learn = "^${LAYERDIR}/"\n' +
            'BBFILE_PRIORITY_meta-learn = "6"\n' +
            '\n' +
            'LAYERDEPENDS_meta-learn = "core"\n' +
            'LAYERSERIES_COMPAT_meta-learn = "wrynose"' },

          { t: 'cmdx', cmd: 'meta-learn/conf/layer.conf', title: 'Từng dòng của layer.conf', rows: [
            ['<code>BBPATH .= ":${LAYERDIR}"</code>', 'Thêm thư mục layer vào đường tìm <code>conf/</code> và <code>classes/</code>', '<code>LAYERDIR</code> là thư mục chứa layer, do BitBake điền'],
            ['<code>BBFILES += "…/recipes-*/*/*.bb …"</code>', 'Mẫu đường dẫn để tìm recipe và bbappend', 'Vì vậy recipe phải nằm sâu đúng hai cấp: <code>recipes-xxx/tên/tên_ver.bb</code>'],
            ['<code>BBFILE_COLLECTIONS += "meta-learn"</code>', 'Tên của layer', 'Tương ứng <code>name: LEARN</code> trong <code>external.desc</code> của Bài 61'],
            ['<code>BBFILE_PRIORITY_meta-learn = "6"</code>', 'Độ ưu tiên', 'Chỉ dùng khi hai layer có recipe trùng tên: layer cao hơn thắng. OE-Core là 5'],
            ['<code>LAYERDEPENDS_meta-learn = "core"</code>', 'Layer này cần layer <code>core</code>', 'BitBake báo lỗi nếu thiếu layer phụ thuộc'],
            ['<code>LAYERSERIES_COMPAT_meta-learn = "wrynose"</code>', 'Layer khai báo tương thích với Yocto 6.0', 'Dòng gây nhiều lỗi nhất khi nâng cấp — bước 6 thử làm sai nó']
          ] },

          { t: 'p', x:
            'Khung có sẵn một recipe ví dụ <code>example_0.1.bb</code> chỉ in một banner; bạn sẽ xoá nó ở bước 4. ' +
            'Đăng ký layer và kiểm tra:' },

          { t: 'code', where: 'wsl', code:
            'bitbake-layers add-layer ../meta-learn\n' +
            'bitbake-layers show-layers\n' +
            'grep -v \'^#\' conf/bblayers.conf | grep -v \'^$\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NOTE: Reconnecting to bitbake server...\n' +
            'layer                 path                                                                    priority\n' +
            '========================================================================================================\n' +
            'core                  /home/cah8hc/bai62/openembedded-core/meta                               5\n' +
            'meta-learn            /home/cah8hc/bai62/meta-learn                                           6\n' +
            'LCONF_VERSION = "7"\n' +
            'BBPATH = "${TOPDIR}"\n' +
            'BBFILES ?= ""\n' +
            'BBLAYERS ?= " \\\n' +
            '  /home/cah8hc/bai62/openembedded-core/meta \\\n' +
            '  /home/cah8hc/bai62/meta-learn \\\n' +
            '  "' },

          { t: 'p', x:
            '<code>add-layer</code> không làm gì bí ẩn: nó thêm đúng một dòng đường dẫn vào <code>BBLAYERS</code> — ' +
            'bạn thấy dòng <code>/home/cah8hc/bai62/meta-learn</code> mới trong file. Bảng giờ có hai layer, ' +
            '<code>meta-learn</code> với priority 6 như <code>layer.conf</code> khai. So với Bài 61: ở đó bạn đăng ký ' +
            'cây br2-external bằng <code>make BR2_EXTERNAL=~/bai61/br-ext</code> và Buildroot nhớ nó trong ' +
            '<code>output/.br2-external.mk</code>; ở đây đường dẫn layer nằm trong <code>bblayers.conf</code>, một ' +
            'file bạn đọc và sửa được bằng tay.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Recipe cho temp_daemon, một bbappend và một image recipe',
        blocks: [
          { t: 'p', x:
            'Bạn sẽ viết lại đúng những gì Bài 61 đã làm bằng Buildroot, nhưng theo cách của Yocto: một recipe cho ' +
            '<code>temp_daemon</code> (thay cho <code>temp-daemon.mk</code>), một bbappend đổi hostname (thay cho ' +
            '<code>BR2_TARGET_GENERIC_HOSTNAME</code>), và một image recipe (thay cho defconfig + post-build). Xoá ' +
            'recipe ví dụ, tạo thư mục, chép patch của Bài 61 sang:' },

          { t: 'code', where: 'wsl', code:
            'rm -rf ../meta-learn/recipes-example\n' +
            'mkdir -p ../meta-learn/recipes-apps/temp-daemon/files\n' +
            'mkdir -p ../meta-learn/recipes-core/base-files/base-files ../meta-learn/recipes-core/images\n' +
            'cp ~/bai61/br-ext/patches/temp-daemon/0001-Take-the-listening-port-from-argv-1.patch \\\n' +
            '   ../meta-learn/recipes-apps/temp-daemon/files/' },

          { t: 'p', x:
            'Recipe đầu tiên. Đọc nó cạnh <code>temp-daemon.mk</code> 26 dòng của Bài 61 — gần như từng dòng có ' +
            'một bản tương ứng:' },

          { t: 'code', where: 'file', name: '~/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb', lang: 'bash', code:
            'SUMMARY = "Temperature daemon from lesson 24"\n' +
            'DESCRIPTION = "One sensor thread, one epoll loop, answers on a TCP port."\n' +
            'LICENSE = "MIT"\n' +
            'LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"\n' +
            '\n' +
            'SRC_URI = "file://${HOME}/bai61/upstream/temp-daemon-${PV}.tar.gz \\\n' +
            '           file://0001-Take-the-listening-port-from-argv-1.patch \\\n' +
            '           file://temp-daemon.init \\\n' +
            '           "\n' +
            '\n' +
            'S = "${UNPACKDIR}/temp-daemon-${PV}"\n' +
            '\n' +
            'inherit update-rc.d\n' +
            '\n' +
            'INITSCRIPT_NAME = "temp-daemon"\n' +
            'INITSCRIPT_PARAMS = "defaults 60"\n' +
            '\n' +
            'do_compile() {\n' +
            '    oe_runmake\n' +
            '}\n' +
            '\n' +
            'do_install() {\n' +
            '    oe_runmake DESTDIR=${D} install\n' +
            '    install -D -m 0755 ${UNPACKDIR}/temp-daemon.init ${D}${sysconfdir}/init.d/temp-daemon\n' +
            '}' },

          { t: 'cmdx', cmd: 'temp-daemon_1.0.bb', title: 'Từng phần của recipe, và bản tương ứng ở Bài 61', rows: [
            ['tên file <code>temp-daemon_1.0.bb</code>', 'BitBake tách tên ở dấu <code>_</code>: <code>PN</code> = <code>temp-daemon</code>, <code>PV</code> = <code>1.0</code>', '<code>TEMP_DAEMON_VERSION = 1.0</code>'],
            ['<code>LICENSE</code>, <code>LIC_FILES_CHKSUM</code>', 'Giấy phép, kèm md5 của file giấy phép', '<code>TEMP_DAEMON_LICENSE = MIT</code>. Yocto <b>bắt buộc</b> <code>LIC_FILES_CHKSUM</code>; md5 ở đây là của file MIT chuẩn trong OE-Core (<code>md5sum openembedded-core/meta/files/common-licenses/MIT</code>)'],
            ['<code>SRC_URI</code>', 'Mọi đầu vào của recipe: tarball, patch, script', '<code>_SITE</code> + <code>_SOURCE</code> + thư mục <code>patches/</code> + <code>S60temp_daemon</code> — gom vào một biến'],
            ['<code>file://${HOME}/bai61/…</code>', 'Đường dẫn tuyệt đối tới tarball có sẵn', '<code>_SITE_METHOD = file</code>. Recipe thật dùng <code>https://…</code> để ai cũng build được'],
            ['<code>file://0001-….patch</code>', 'Đường dẫn tương đối: BitBake tìm trong <code>files/</code> cạnh recipe. File có đuôi <code>.patch</code> tự động được áp ở <code>do_patch</code>', '<code>BR2_GLOBAL_PATCH_DIR/temp-daemon/</code>'],
            ['<code>S = "${UNPACKDIR}/temp-daemon-${PV}"</code>', 'Thư mục mã nguồn sau khi giải nén', '<code>$(@D)</code>'],
            ['<code>inherit update-rc.d</code> + <code>INITSCRIPT_…</code>', 'Class tạo symlink khởi động SysV, thứ tự 60', '<code>_INSTALL_INIT_SYSV</code> + tên <code>S60…</code>'],
            ['<code>oe_runmake</code>', 'Gọi <code>make</code> với <code>-j</code> và <code>EXTRA_OEMAKE</code>; <code>CC</code>, <code>CFLAGS</code>, <code>LDFLAGS</code> đã được export sẵn vào môi trường', '<code>$(MAKE) $(TARGET_CONFIGURE_OPTS) -C $(@D)</code>'],
            ['<code>DESTDIR=${D}</code>', 'Cài vào thư mục tạm riêng của recipe', '<code>DESTDIR=$(TARGET_DIR)</code> — thư mục chung của mọi package']
          ] },

          { t: 'p', x:
            'Recipe không có dòng <code>do_configure</code>, <code>do_fetch</code>, <code>do_package</code> nào — ' +
            'class mặc định đã định nghĩa chúng. Bạn chỉ viết lại task nào cần khác mặc định. Script khởi động đi ' +
            'kèm recipe, đặt trong <code>files/</code>:' },

          { t: 'code', where: 'file', name: '~/bai62/meta-learn/recipes-apps/temp-daemon/files/temp-daemon.init', lang: 'bash', code:
            '#!/bin/sh\n' +
            'DAEMON=/usr/bin/temp_daemon\n' +
            'PIDFILE=/var/run/temp_daemon.pid\n' +
            'TEMP_DAEMON_ARGS=""\n' +
            '[ -r /etc/default/temp_daemon ] && . /etc/default/temp_daemon\n' +
            '\n' +
            'case "$1" in\n' +
            '    start) start-stop-daemon -S -b -m -p $PIDFILE -x $DAEMON -- $TEMP_DAEMON_ARGS ;;\n' +
            '    stop)  start-stop-daemon -K -p $PIDFILE -x $DAEMON; rm -f $PIDFILE ;;\n' +
            '    *)     echo "Usage: $0 {start|stop}"; exit 1 ;;\n' +
            'esac' },

          { t: 'p', x:
            'Đây là bản rút gọn của <code>S60temp_daemon</code> ở Bài 61, cùng các cờ <code>start-stop-daemon</code> ' +
            'Bài 49 đã giải thích (<code>-S</code> start, <code>-b</code> chạy nền, <code>-m -p</code> tạo pidfile, ' +
            '<code>-x</code> chương trình, <code>-K</code> kill). Tên file không mang số thứ tự: ' +
            '<code>update-rc.d</code> tự tạo symlink <code>S60…</code> từ <code>INITSCRIPT_PARAMS</code>.' },

          { t: 'p', x:
            'Thứ hai, một <b>bbappend</b> sửa recipe <code>base-files</code> của OE-Core — recipe cài ' +
            '<code>/etc/hostname</code>, <code>/etc/motd</code>, <code>/etc/fstab</code>… — mà không chạm vào nó:' },

          { t: 'code', where: 'file', name: '~/bai62/meta-learn/recipes-core/base-files/base-files_%.bbappend', lang: 'bash', code:
            'FILESEXTRAPATHS:prepend := "${THISDIR}/${PN}:"\n' +
            'hostname = "learn"' },

          { t: 'code', where: 'file', name: '~/bai62/meta-learn/recipes-core/base-files/base-files/motd', code:
            'Embedded Linux course - lesson 62 image' },

          { t: 'cmdx', cmd: 'base-files_%.bbappend', title: 'Hai dòng, hai cơ chế', rows: [
            ['<code>base-files_%</code>', 'Áp cho recipe <code>base-files</code> ở <b>mọi</b> phiên bản', 'Viết <code>base-files_3.0.14.bbappend</code> thì lần OE-Core lên 3.0.15, bbappend thành vô chủ'],
            ['<code>FILESEXTRAPATHS:prepend := "${THISDIR}/${PN}:"</code>', 'Thêm thư mục <code>base-files/</code> cạnh bbappend vào <b>đầu</b> đường tìm <code>file://</code>', 'Recipe gốc có <code>file://motd</code>; BitBake sẽ tìm thấy <code>motd</code> của bạn trước bản của OE-Core. <code>:=</code> vì <code>THISDIR</code> phải được mở ngay lúc đọc bbappend'],
            ['<code>hostname = "learn"</code>', 'Đè biến <code>hostname</code> mà recipe gốc gán ở dòng 70', 'Recipe gốc dùng biến này để ghi <code>/etc/hostname</code>']
          ] },

          { t: 'p', x:
            'Thứ ba, image recipe — thứ bạn đưa cho <code>bitbake</code> làm target. Nó kéo vào ảnh tối thiểu của ' +
            'OE-Core, thêm gói của bạn, và chạy một hàm sau khi dựng rootfs:' },

          { t: 'code', where: 'file', name: '~/bai62/meta-learn/recipes-core/images/learn-image.bb', lang: 'bash', code:
            'SUMMARY = "Lesson 62 image: core-image-minimal plus temp-daemon"\n' +
            'LICENSE = "MIT"\n' +
            '\n' +
            'require recipes-core/images/core-image-minimal.bb\n' +
            '\n' +
            'IMAGE_INSTALL:append = " temp-daemon"\n' +
            '\n' +
            'ROOTFS_POSTPROCESS_COMMAND += "learn_build_info;"\n' +
            '\n' +
            'learn_build_info() {\n' +
            '    echo "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > ${IMAGE_ROOTFS}${sysconfdir}/build-info\n' +
            '}' },

          { t: 'cmdx', cmd: 'learn-image.bb', title: 'Image recipe thay cho defconfig + post-build', rows: [
            ['<code>require recipes-core/images/core-image-minimal.bb</code>', 'Chèn nguyên nội dung recipe đó vào đây', 'Đường dẫn tính từ gốc mỗi layer trong <code>BBPATH</code>; <code>require</code> báo lỗi nếu không tìm thấy (khác <code>include</code>)'],
            ['<code>IMAGE_INSTALL:append = " temp-daemon"</code>', 'Thêm gói <code>temp-daemon</code> vào danh sách cài', 'Dấu cách đầu là bắt buộc: <code>:append</code> không tự thêm. Tương ứng <code>BR2_PACKAGE_TEMP_DAEMON=y</code>'],
            ['<code>ROOTFS_POSTPROCESS_COMMAND += "learn_build_info;"</code>', 'Gọi hàm shell sau khi mọi gói đã cài vào rootfs', 'Tương ứng <code>post-build.sh</code> của Bài 61'],
            ['<code>${IMAGE_ROOTFS}</code>', 'Thư mục rootfs đang dựng', 'Tương ứng <code>$1</code> = <code>output/target</code>']
          ] },

          { t: 'p', x:
            'Ghi bốn file trên bằng trình soạn thảo của bạn, rồi kiểm tra layer có đúng hình dạng:' },

          { t: 'code', where: 'wsl', code:
            'find ../meta-learn -type f | sort\n' +
            'wc -l ../meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb ../meta-learn/recipes-core/images/learn-image.bb' },

          { t: 'code', where: 'out', nocopy: true, code:
            '../meta-learn/conf/layer.conf\n' +
            '../meta-learn/COPYING.MIT\n' +
            '../meta-learn/README\n' +
            '../meta-learn/recipes-apps/temp-daemon/files/0001-Take-the-listening-port-from-argv-1.patch\n' +
            '../meta-learn/recipes-apps/temp-daemon/files/temp-daemon.init\n' +
            '../meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb\n' +
            '../meta-learn/recipes-core/base-files/base-files_%.bbappend\n' +
            '../meta-learn/recipes-core/base-files/base-files/motd\n' +
            '../meta-learn/recipes-core/images/learn-image.bb\n' +
            '  25 ../meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb\n' +
            '  12 ../meta-learn/recipes-core/images/learn-image.bb\n' +
            '  37 total' },

          { t: 'p', x:
            'Chín file, recipe 25 dòng và image recipe 12 dòng. Mỗi <code>.bb</code> nằm đúng hai cấp dưới ' +
            '<code>recipes-*</code>, khớp mẫu <code>BBFILES</code> trong <code>layer.conf</code>. Giờ hỏi BitBake ' +
            'nó có thấy chúng không:' },

          { t: 'code', where: 'wsl', code: 'bitbake-layers show-recipes temp-daemon learn-image base-files' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NOTE: Starting bitbake server...\n' +
            'WARNING: You are running bitbake under WSLv2, this works properly but you should optimize your VHDX file eventually to avoid running out of storage space\n' +
            'Loading cache...done.\n' +
            'Loaded 0 entries from dependency cache.\n' +
            'Parsing recipes...done.\n' +
            'Parsing of 951 .bb files complete (0 cached, 951 parsed). 1972 targets, 59 skipped, 0 masked, 0 errors.\n' +
            '\n' +
            'Summary: There were 2 WARNING messages.\n' +
            '=== Matching recipes: ===\n' +
            'base-files:\n' +
            '  meta                 3.0.14\n' +
            'learn-image:\n' +
            '  meta-learn           1.0\n' +
            'temp-daemon:\n' +
            '  meta-learn           1.0' },

          { t: 'p', x:
            'Dòng <code>Parsing of 951 .bb files complete</code> là lần đầu BitBake đọc <b>toàn bộ</b> metadata: ' +
            '949 recipe của OE-Core (con số 950 ở bước 1 tính cả một file mẫu nằm ngoài <code>recipes-*</code>) ' +
            'cộng 2 recipe của bạn, <b>0 errors</b>. Trên máy soạn bài lần đọc này mất <b>26 giây</b>; các lệnh sau ' +
            'in <code>Loaded 1972 entries from dependency cache</code> và gần như tức thì, vì kết quả đã được cache ' +
            'cho tới khi một file metadata thay đổi. Bảng cuối xác nhận: <code>learn-image</code> và ' +
            '<code>temp-daemon</code> đến từ <code>meta-learn</code> phiên bản 1.0 (lấy từ tên file), ' +
            '<code>base-files</code> vẫn của <code>meta</code>.' },

          { t: 'p', x:
            'Bbappend của bạn có được gắn vào <code>base-files</code> không? Và nó có thắng không? Hai lệnh, hai câu ' +
            'trả lời:' },

          { t: 'code', where: 'wsl', code:
            'bitbake-layers show-appends base-files\n' +
            'bitbake-getvar -r base-files hostname' },

          { t: 'code', where: 'out', nocopy: true, code:
            '=== Matched appended recipes ===\n' +
            'base-files_3.0.14.bb:\n' +
            '  /home/cah8hc/bai62/meta-learn/recipes-core/base-files/base-files_%.bbappend\n' +
            '#\n' +
            '# $hostname [2 operations]\n' +
            '#   set /home/cah8hc/bai62/openembedded-core/meta/recipes-core/base-files/base-files_3.0.14.bb:70\n' +
            '#     "${MACHINE}"\n' +
            '#   set /home/cah8hc/bai62/meta-learn/recipes-core/base-files/base-files_%.bbappend:2\n' +
            '#     "learn"\n' +
            '# pre-expansion value:\n' +
            '#   "learn"\n' +
            'hostname="learn"' },

          { t: 'p', x:
            '<code>show-appends</code> cho thấy <code>base-files_%.bbappend</code> đã khớp với ' +
            '<code>base-files_3.0.14.bb</code> — dấu <code>%</code> làm việc của nó. <code>bitbake-getvar</code> ' +
            'kể lại lịch sử biến: <b>2 operations</b>, lần đầu ở dòng 70 của recipe gốc gán <code>${MACHINE}</code> ' +
            '(nếu không có bbappend, hostname sẽ là <code>qemuarm64</code>), lần sau ở dòng 2 của bbappend gán ' +
            '<code>learn</code>. Giá trị cuối là <code>learn</code>. Đây chính là hình thứ hai ở phần lý thuyết, ' +
            'nhưng do BitBake tự in ra.' },

          { t: 'p', x:
            'Cuối cùng, hai câu hỏi về <code>temp-daemon</code>: nó có thật sự vào ảnh không, và nó sẽ được build ' +
            'bằng compiler nào?' },

          { t: 'code', where: 'wsl', code:
            'bitbake-getvar -r learn-image --value IMAGE_INSTALL\n' +
            'bitbake-getvar -r temp-daemon CC' },

          { t: 'code', where: 'out', nocopy: true, code:
            'packagegroup-core-boot  temp-daemon\n' +
            '#\n' +
            '# $CC [2 operations]\n' +
            '#   exported ast.py:67 [eval]\n' +
            '#     [export] "1"\n' +
            '#   set /home/cah8hc/bai62/openembedded-core/meta/classes/toolchain/gcc.bbclass:1\n' +
            '#     "${CCACHE}${HOST_PREFIX}gcc ${HOST_CC_ARCH}${TOOLCHAIN_OPTIONS}"\n' +
            '# pre-expansion value:\n' +
            '#   "${CCACHE}${HOST_PREFIX}gcc ${HOST_CC_ARCH}${TOOLCHAIN_OPTIONS}"\n' +
            'export CC="aarch64-oe-linux-gcc  -mcpu=cortex-a57+crc -mbranch-protection=standard -fstack-protector-strong  -O2 -D_FORTIFY_SOURCE=2 -Wformat -Wformat-security -Werror=format-security --sysroot=/home/cah8hc/bai62/build/tmp/work/cortexa57-oe-linux/temp-daemon/1.0/recipe-sysroot"' },

          { t: 'cmdx', cmd: 'export CC="aarch64-oe-linux-gcc … --sysroot=…"', title: 'Đọc giá trị cuối của CC', rows: [
            ['<code>packagegroup-core-boot  temp-daemon</code>', '<code>IMAGE_INSTALL</code> của <code>core-image-minimal</code> cộng phần <code>:append</code> của bạn', 'Hai dấu cách liền nhau: một từ <code>${CORE_IMAGE_EXTRA_INSTALL}</code> rỗng, một từ <code>" temp-daemon"</code>'],
            ['<code>--value</code>', 'Chỉ in giá trị cuối, bỏ phần lịch sử', 'Tiện khi dùng trong script'],
            ['<code>aarch64-oe-linux-gcc</code>', 'Compiler chéo ARM64 mà OE-Core sẽ <b>tự build</b> (<code>gcc-cross-aarch64</code>)', 'Như Buildroot dựng <code>aarch64-buildroot-linux-gnu-gcc</code> ở Bài 60. Ở đây nó chưa tồn tại — bài không build'],
            ['<code>-mcpu=cortex-a57+crc</code>', 'Tối ưu cho CPU của máy <code>qemuarm64</code>', 'Suy ra từ <code>MACHINE</code> bạn đặt ở bước 3'],
            ['<code>-fstack-protector-strong … -D_FORTIFY_SOURCE=2</code>', 'Cờ bảo mật OE-Core bật mặc định', 'Buildroot ở Bài 61 dùng <code>-D_FORTIFY_SOURCE=1</code>'],
            ['<code>--sysroot=…/recipe-sysroot</code>', 'Mỗi recipe có sysroot <b>riêng</b>, chỉ chứa header/thư viện của những recipe nó phụ thuộc', 'Buildroot dùng một sysroot chung trong <code>output/host</code>. Sysroot riêng làm lộ ngay một phụ thuộc bị khai thiếu']
          ] },

          { t: 'p', x:
            'Một dòng <code>MACHINE ??= "qemuarm64"</code> ở bước 3 đã lan tới tận lệnh compile của recipe bạn ' +
            'viết: <code>aarch64-oe-linux-gcc -mcpu=cortex-a57+crc</code>. Recipe không nhắc tới ARM64 ở đâu cả — ' +
            'giống Bài 61, nơi <code>temp-daemon.mk</code> cũng không có chữ <code>aarch64</code>. Cả hai hệ thống ' +
            'đều dựa vào cùng một điều kiện: <code>Makefile</code> của chương trình dùng <code>$(CC)</code> chứ ' +
            'không viết cứng <code>gcc</code>.' },

          { t: 'cal', kind: 'warn', title: 'Recipe này không kiểm tra hash của tarball — và BitBake không báo gì',
            x: 'Bài 61 có file <code>.hash</code>; recipe này không có <code>SRC_URI[sha256sum]</code>. Bài soạn đã ' +
               'thử thêm một dòng <code>SRC_URI[sha256sum] = "0000…"</code> cố tình sai: <code>bitbake -c fetch -f ' +
               'temp-daemon</code> vẫn <b>thành công, mã 0</b>. Với <code>file://</code>, BitBake coi file là của bạn ' +
               'và không băm nó (<code>recommends_checksum</code> trả về <code>False</code> trong ' +
               '<code>bitbake/lib/bb/fetch2/__init__.py</code>). Bảo vệ thật vẫn có, theo cách khác: checksum của file ' +
               '<code>file://</code> đi vào <b>chữ ký</b> của <code>do_fetch</code> — bước 6 cho thấy sửa một byte ' +
               'là mọi task phía sau chạy lại. Khi bạn đổi sang <code>https://</code> cho một recipe thật, ' +
               '<code>SRC_URI[sha256sum]</code> trở thành bắt buộc và sai một ký tự là dừng.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Đo không cần build: task, đồ thị phụ thuộc, dry-run',
        blocks: [
          { t: 'p', x:
            'Recipe của bạn chỉ định nghĩa hai task. Còn bao nhiêu task khác đến từ class mặc định?' },

          { t: 'code', where: 'wsl', code: 'bitbake -c listtasks temp-daemon | grep \'^do_\' | grep -v setscene | awk \'{print $1}\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'do_build\ndo_checkuri\ndo_clean\ndo_cleanall\ndo_cleansstate\ndo_compile\ndo_configure\n' +
            'do_create_package_spdx\ndo_create_recipe_sbom\ndo_create_recipe_spdx\ndo_create_spdx\n' +
            'do_deploy_source_date_epoch\ndo_devshell\ndo_fetch\ndo_install\ndo_listtasks\ndo_package\n' +
            'do_package_qa\ndo_package_write_ipk\ndo_packagedata\ndo_patch\ndo_populate_lic\ndo_populate_sysroot\n' +
            'do_prepare_recipe_sysroot\ndo_pydevshell\ndo_recipe_qa\ndo_unpack' },

          { t: 'cmdx', cmd: 'bitbake -c listtasks temp-daemon | grep … | awk …', title: 'Lệnh và các nhóm task', rows: [
            ['<code>-c listtasks</code>', 'Chạy task <code>do_listtasks</code> của recipe: in mọi task kèm mô tả', '<code>-c TASK</code> chạy một task cụ thể (và mọi task nó phụ thuộc)'],
            ['<code>grep -v setscene</code>', 'Bỏ các bản <code>…_setscene</code>', 'Mỗi task có kết quả lưu sstate có một bản \"setscene\" để khôi phục từ cache thay vì chạy lại'],
            ['<code>do_fetch</code> … <code>do_install</code>', 'Bảy task build, khớp chuỗi stamp Buildroot', 'Bảng ở phần lý thuyết 3'],
            ['<code>do_package*</code>, <code>do_populate_sysroot</code>', 'Chia gói, đóng <code>.ipk</code>, xuất header/thư viện cho recipe khác', 'Không có tương ứng Buildroot'],
            ['<code>do_*spdx</code>, <code>do_*sbom</code>, <code>do_populate_lic</code>', 'Giấy phép và SBOM', 'Buildroot: <code>make legal-info</code>, chạy một lần cho cả hệ thống'],
            ['<code>do_clean*</code>, <code>do_devshell</code>', 'Tiện ích bạn gọi bằng tay', '<code>do_devshell</code> mở shell trong thư mục build với đủ biến môi trường của recipe']
          ] },

          { t: 'p', x:
            '27 task cho một recipe 25 dòng. Phần lớn là việc Buildroot không làm: chia gói, giấy phép, SBOM, QA. ' +
            'Giờ đi từ một recipe lên cả ảnh. <code>-g</code> yêu cầu BitBake tính đồ thị phụ thuộc rồi dừng — ' +
            'không chạy task nào:' },

          { t: 'code', where: 'wsl', code:
            'bitbake -g learn-image\n' +
            'wc -l pn-buildlist\n' +
            'grep -c -- \'->\' task-depends.dot\n' +
            'grep -n -x -E \'temp-daemon|busybox|glibc|gcc-cross-aarch64|linux-yocto|learn-image\' pn-buildlist' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Loading cache...done.\n' +
            '…\n' +
            'NOTE: PN build list saved to \'pn-buildlist\'\n' +
            'NOTE: Task dependencies saved to \'task-depends.dot\'\n' +
            '\n' +
            'Summary: There were 4 WARNING messages.\n' +
            '316 pn-buildlist\n' +
            '23343\n' +
            '20:busybox\n' +
            '60:gcc-cross-aarch64\n' +
            '71:glibc\n' +
            '93:learn-image\n' +
            '167:linux-yocto\n' +
            '280:temp-daemon' },

          { t: 'cmdx', cmd: 'bitbake -g learn-image', title: 'Hai file -g để lại trong build/', rows: [
            ['<code>pn-buildlist</code>', 'Danh sách mọi recipe cần để dựng target, mỗi dòng một tên', '<b>316</b> recipe'],
            ['<code>task-depends.dot</code>', 'Đồ thị task ở định dạng Graphviz: mỗi dòng <code>"a.do_x" -&gt; "b.do_y"</code> là một cạnh', '<b>23 343</b> cạnh; 2,5 MB — quá lớn để vẽ, nhưng <code>grep</code> được'],
            ['<code>grep -n -x -E …</code>', 'Tìm đúng tên (<code>-x</code>: khớp cả dòng), in số dòng (<code>-n</code>)', 'Xác nhận các thành phần quen thuộc đều có mặt']
          ] },

          { t: 'p', x:
            '316 recipe để dựng một ảnh \"tối thiểu\" cộng một daemon. Danh sách đã sắp xếp theo tên, nên số dòng ' +
            'chỉ là vị trí chữ cái. Trong đó có <code>gcc-cross-aarch64</code> (toolchain), <code>glibc</code>, ' +
            '<code>linux-yocto</code> (kernel), <code>busybox</code> — cùng các mảnh Buildroot dựng ở Bài 60 — và ' +
            '<code>temp-daemon</code> của bạn. Bài soạn đếm thêm: <b>169</b> trong 316 tên kết thúc bằng ' +
            '<code>-native</code> — công cụ chạy trên máy build (<code>cmake-native</code>, ' +
            '<code>python3-native</code>…), tương ứng các package <code>host-</code> của Buildroot (Bài 60 đếm được ' +
            '49). Yocto build cả những công cụ này để không phụ thuộc vào phiên bản trên máy bạn.' },

          { t: 'p', x:
            'Lọc riêng các cạnh giữa những task build của <code>temp-daemon</code> để thấy chuỗi phụ thuộc của nó:' },

          { t: 'code', where: 'wsl', code:
            'grep -E \'^"temp-daemon\\.do_[a-z_]+" -> "temp-daemon\\.\' task-depends.dot \\\n' +
            '  | grep -v -E \'spdx|sbom|package|lic|sysroot|qa|build|source_date\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '"temp-daemon.do_compile" -> "temp-daemon.do_configure"\n' +
            '"temp-daemon.do_configure" -> "temp-daemon.do_patch"\n' +
            '"temp-daemon.do_install" -> "temp-daemon.do_compile"\n' +
            '"temp-daemon.do_patch" -> "temp-daemon.do_unpack"\n' +
            '"temp-daemon.do_unpack" -> "temp-daemon.do_fetch"' },

          { t: 'p', x:
            'Đọc từ dưới lên: <code>fetch ← unpack ← patch ← configure ← compile ← install</code>. Mũi tên trỏ từ ' +
            'task tới thứ nó <b>cần có trước</b>. Đây đúng là chuỗi stamp của Buildroot, và cũng là chuỗi mà chữ ký ' +
            'băm đi theo ở bước 6. <code>grep -v</code> chỉ bỏ các task phụ (SPDX, QA, sysroot…) để chuỗi chính dễ ' +
            'đọc.' },

          { t: 'p', x:
            '<code>-n</code> (dry-run) đi xa hơn <code>-g</code> một bước: nó chạy toàn bộ bộ lập lịch, kiểm tra ' +
            'sstate, rồi in ra từng task <i>sẽ</i> chạy — nhưng không chạy. Lệnh này mất từ 1 phút 41 giây đến 2 phút trên máy soạn bài, vì phải ' +
            'tính chữ ký cho mọi task; ghi kết quả vào file rồi lọc:' },

          { t: 'code', where: 'wsl', code:
            'time bitbake -n learn-image > dryrun.log 2>&1\n' +
            'grep -E \'Sstate summary|Tasks Summary\' dryrun.log\n' +
            'grep \'temp-daemon_1.0.bb:do_\\(fetch\\|compile\\|package_write_ipk\\))\' dryrun.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t2m0.434s\n' +
            'user\t0m2.959s\n' +
            'sys\t0m0.428s\n' +
            'Initialising tasks...Sstate summary: Wanted 2756 Local 0 Mirrors 0 Missed 2756 Current 0 (0% match, 0% complete)\n' +
            'NOTE: Tasks Summary: Attempted 5150 tasks of which 0 didn\'t need to be rerun and all succeeded.\n' +
            'NOTE: Running task 2999 of 5150 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_fetch)\n' +
            'NOTE: Running task 3623 of 5150 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_compile)\n' +
            'NOTE: Running task 4119 of 5150 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_package_write_ipk)' },

          { t: 'cmdx', cmd: 'Sstate summary / Tasks Summary', title: 'Đọc hai dòng tổng kết', rows: [
            ['<code>Wanted 2756</code>', 'Số task có thể lấy kết quả từ sstate thay vì chạy', 'Hơn nửa trong 5 150 task'],
            ['<code>Local 0 Mirrors 0 Missed 2756</code>', 'Không có gì trong <code>sstate-cache/</code> cục bộ, không cấu hình mirror', 'Với một sstate mirror của công ty, phần lớn sẽ nằm ở cột <code>Mirrors</code>'],
            ['<code>Attempted 5150 tasks</code>', 'Tổng số task một build thật sẽ chạy', '<code>-n</code> \"giả vờ\" chạy từng task, nên mọi task báo <code>succeeded</code>'],
            ['<code>Running task 2999 of 5150 (…:do_fetch)</code>', 'Vị trí của task trong lịch', '<code>do_fetch</code> của bạn ở khoảng giữa; <code>do_compile</code> ở 3 623 vì nó phải chờ <code>gcc-cross</code> và <code>glibc</code> xong trước'],
            ['<code>real 2m0s</code> / <code>user 0m3s</code>', 'Thời gian thật gần như toàn bộ là server BitBake', '<code>time</code> chỉ đo tiến trình client; công việc nằm trong server nền']
          ] },

          { t: 'p', x:
            'Đây là con số quyết định vì sao bài dừng ở mức đọc hiểu: <b>5 150 task</b> cho ảnh của bạn, so với ' +
            '62 package / 402 dòng <code>&gt;&gt;&gt;</code> của Buildroot ở Bài 60. Cột <code>Missed 2756</code> ' +
            'cho thấy cái giá của lần đầu: không có cache nào để dựa vào. Con số thứ tự task có thể lệch vài đơn vị ' +
            'giữa các lần chạy (bài soạn đã thấy <code>2999</code>, <code>3000</code>, <code>3001</code>) vì bộ lập lịch xếp các task độc lập theo ' +
            'thứ tự bất kỳ; tổng 5 150 thì không đổi.' },

          { t: 'p', x:
            'Bạn vẫn có thể chạy <b>một phần nhỏ</b> của build để nhìn tận mắt thư mục làm việc. ' +
            '<code>-c unpack</code> chỉ cần <code>do_fetch</code> và <code>do_unpack</code>, không cần toolchain:' },

          { t: 'code', where: 'wsl', code: 'bitbake -c unpack temp-daemon' },

          { t: 'code', where: 'out', nocopy: true, code:
            '…\n' +
            'NOTE: Running task 1 of 3 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_recipe_qa)\n' +
            'NOTE: Running task 2 of 3 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_fetch)\n' +
            'NOTE: Running task 3 of 3 (/home/cah8hc/bai62/meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb:do_unpack)\n' +
            'NOTE: Tasks Summary: Attempted 3 tasks of which 0 didn\'t need to be rerun and all succeeded.' },

          { t: 'p', x:
            'Ba task, 5–6 giây — lần duy nhất trong bài BitBake làm việc thật. (<code>do_patch</code> không chạy được ' +
            'ở đây: nó cần <code>patch-native</code>, và <code>bitbake -n -c patch temp-daemon</code> cho thấy con ' +
            'số đó là 104 task.) Mở thư mục làm việc:' },

          { t: 'code', where: 'wsl', code:
            'W=tmp/work/cortexa57-oe-linux/temp-daemon/1.0\n' +
            'ls $W $W/sources $W/sources/temp-daemon-1.0\n' +
            'cat $W/temp/log.task_order' },

          { t: 'code', where: 'out', nocopy: true, code:
            'tmp/work/cortexa57-oe-linux/temp-daemon/1.0:\n' +
            'source-date-epoch\n' +
            'sources\n' +
            'temp\n' +
            '\n' +
            'tmp/work/cortexa57-oe-linux/temp-daemon/1.0/sources:\n' +
            '0001-Take-the-listening-port-from-argv-1.patch\n' +
            'temp-daemon-1.0\n' +
            'temp-daemon.init\n' +
            '\n' +
            'tmp/work/cortexa57-oe-linux/temp-daemon/1.0/sources/temp-daemon-1.0:\n' +
            'Makefile\n' +
            'temp_daemon.c\n' +
            '20261031-061611.400433 do_listtasks (723068): log.do_listtasks.723068\n' +
            '20261031-061824.261744 do_recipe_qa (728572): log.do_recipe_qa.728572\n' +
            '20261031-061824.393815 do_fetch (728615): log.do_fetch.728615\n' +
            '20261031-061824.483896 do_unpack (728630): log.do_unpack.728630' },

          { t: 'p', x:
            'Đường dẫn <code>tmp/work/cortexa57-oe-linux/temp-daemon/1.0</code> mã hoá kiến trúc + tên + phiên bản ' +
            '— tương ứng <code>output/build/temp-daemon-1.0</code> của Buildroot, nhưng có thêm tầng kiến trúc, vì ' +
            'một thư mục build Yocto có thể chứa cùng một recipe build cho nhiều máy. <code>sources/</code> chứa đúng ' +
            '<code>Makefile</code> và <code>temp_daemon.c</code> từ tarball của Bài 61, cạnh hai file ' +
            '<code>file://</code> được chép sang. <code>temp/</code> giữ log và script của từng task — ' +
            '<code>log.task_order</code> ghi lại task nào chạy lúc nào; số trong ngoặc là PID của tiến trình chạy ' +
            'task, và cùng với dấu thời gian sẽ khác trên máy bạn. Khi một task thất bại trong một build thật, ' +
            '<code>temp/log.do_&lt;task&gt;</code> là file đầu tiên bạn mở.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Chữ ký task: sửa ba thứ, xem cái gì phải chạy lại',
        blocks: [
          { t: 'p', x:
            '<code>bitbake -S none</code> tính chữ ký của mọi task cần cho target và ghi mỗi chữ ký thành một file ' +
            '<code>.sigdata.&lt;hash&gt;</code> trong <code>tmp/stamps</code> — vẫn không chạy task nào. Đếm số file ' +
            'đó trước và sau mỗi thay đổi cho bạn biết chính xác bao nhiêu task sẽ phải chạy lại:' },

          { t: 'code', where: 'wsl', code:
            'bitbake -S none temp-daemon\n' +
            'ST=tmp/stamps/cortexa57-oe-linux/temp-daemon\n' +
            'ls $ST | grep -c sigdata\n' +
            'ls $ST | grep do_compile' },

          { t: 'code', where: 'out', nocopy: true, code:
            '…\n' +
            'NOTE: Writing task signature files\n' +
            'NOTE: Tasks Summary: Attempted 0 tasks of which 0 didn\'t need to be rerun and all succeeded.\n' +
            '…\n' +
            '19\n' +
            '1.0.do_compile.sigdata.bb0d3ff23183299fd68ff79060b68405457a970625de0b6d13c1ee88e4e20060' },

          { t: 'cmdx', cmd: 'bitbake -S none temp-daemon', title: 'Chữ ký trên đĩa', rows: [
            ['<code>-S none</code>', 'Ghi file chữ ký (<code>-S</code> = <i>dump signatures</i>), <code>none</code> = không so với gì', '<code>Attempted 0 tasks</code>: chỉ tính, không chạy'],
            ['<code>19</code>', 'Số task của <code>temp-daemon</code> có chữ ký trong lịch build', 'Ít hơn 27 của <code>listtasks</code>: các tiện ích (<code>do_clean</code>, <code>do_devshell</code>…) không nằm trong build'],
            ['<code>…do_compile.sigdata.bb0d3ff2…</code>', 'Chữ ký SHA-256 hiện tại của <code>do_compile</code>', 'Phụ thuộc đường dẫn tuyệt đối của layer và mọi phiên bản công cụ — giá trị trên máy bạn sẽ khác']
          ] },

          { t: 'p', x:
            '<b>Thay đổi 1 — một dòng chú thích.</b> Thêm một comment vào đầu recipe, tính lại chữ ký, rồi bỏ ' +
            'comment đi:' },

          { t: 'code', where: 'wsl', code:
            'R=../meta-learn/recipes-apps/temp-daemon/temp-daemon_1.0.bb\n' +
            'sed -i \'1i # Packaged for the lesson 62 image\' $R\n' +
            'head -2 $R\n' +
            'bitbake -S none temp-daemon > /dev/null 2>&1\n' +
            'ls $ST | grep -c sigdata\n' +
            'sed -i \'1d\' $R' },

          { t: 'code', where: 'out', nocopy: true, code:
            '# Packaged for the lesson 62 image\n' +
            'SUMMARY = "Temperature daemon from lesson 24"\n' +
            '19' },

          { t: 'p', x:
            'Vẫn <b>19</b> — không có file chữ ký mới nào. File recipe đã thay đổi (BitBake phải đọc lại nó), ' +
            'nhưng chú thích không đi vào hàm task nào, không đổi biến nào, nên mọi chữ ký giữ nguyên và một build ' +
            'thật sẽ không chạy lại task nào. Đây là điều <code>make</code> không làm được: ở Bài 59, khi bạn thêm ' +
            '<code>Makefile</code> làm phụ thuộc để sửa cái bẫy <code>EPOCH</code>, <b>mọi</b> thay đổi trong ' +
            'Makefile — kể cả một chú thích — đều kéo theo build lại toàn bộ.' },

          { t: 'p', x:
            '<b>Thay đổi 2 — một biến mà task dùng.</b> Thêm <code>EXTRA_OEMAKE</code>, biến mà ' +
            '<code>oe_runmake</code> truyền cho <code>make</code>:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'/^S = /i EXTRA_OEMAKE = "PREFIX=/usr/local"\' $R\n' +
            'grep -n -A1 EXTRA_OEMAKE $R\n' +
            'bitbake -S none temp-daemon > /dev/null 2>&1\n' +
            'ls $ST | grep -c sigdata\n' +
            'ls $ST | grep do_compile' },

          { t: 'code', where: 'out', nocopy: true, code:
            '11:EXTRA_OEMAKE = "PREFIX=/usr/local"\n' +
            '12-S = "${UNPACKDIR}/temp-daemon-${PV}"\n' +
            '30\n' +
            '1.0.do_compile.sigdata.3505c82250a8b9a89fbaa32424357bcdb50e9bb0f28485803f7f0dc01ee3a982\n' +
            '1.0.do_compile.sigdata.bb0d3ff23183299fd68ff79060b68405457a970625de0b6d13c1ee88e4e20060' },

          { t: 'p', x:
            '19 → <b>30</b>: 11 chữ ký mới. <code>do_compile</code> giờ có hai file — chữ ký cũ ' +
            '<code>bb0d3ff2…</code> và mới <code>3505c822…</code>. Một build thật sẽ chạy lại 11 task này và dùng ' +
            'lại 8 task còn lại. BitBake còn nói được <b>vì sao</b> chữ ký đổi — so hai file của ' +
            '<code>do_compile</code>:' },

          { t: 'code', where: 'wsl', code:
            'bitbake-diffsigs $(ls -tr $ST/*do_compile.sigdata.* | tail -2)\n' +
            'sed -i \'/^EXTRA_OEMAKE/d\' $R' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NOTE: Starting bitbake server...\n' +
            'Hash for task dependency temp-daemon:do_configure changed from d4a6f23eac29476c2d5744c6daea4d4530716ec305543df6dd531d78e4886afa to 5fef94b265135f3b1fa328e454ee5802b433fc22ed566b0645aa198740baea3e\n' +
            '    basehash changed from 8a09f025c335198d2132a23fcb36d57525d37ac6e5d405e5beee73de9fd8c86c to a6977cf93c205dda63e75abe40b37ed797924d9898f90fe6ea441800773932cd\n' +
            '    Variable EXTRA_OEMAKE value changed from \'\' to \'PREFIX=/usr/local\'' },

          { t: 'cmdx', cmd: 'bitbake-diffsigs CŨ MỚI', title: 'Đọc báo cáo khác biệt chữ ký', rows: [
            ['<code>$(ls -tr … | tail -2)</code>', 'Hai file <code>do_compile.sigdata</code> mới nhất, cũ trước mới sau', '<code>-tr</code>: sắp theo thời gian, cũ nhất trước'],
            ['<code>Hash for task dependency temp-daemon:do_configure changed</code>', '<code>do_compile</code> đổi vì task nó phụ thuộc, <code>do_configure</code>, đổi', 'Diffsigs lần ngược theo chuỗi phụ thuộc tới chỗ thay đổi gốc'],
            ['<code>basehash changed</code>', 'Phần chữ ký tính từ chính <code>do_configure</code> (không kể task trước nó) đã đổi', 'Tức là thay đổi nằm <b>tại</b> <code>do_configure</code>'],
            ['<code>Variable EXTRA_OEMAKE value changed from \'\' to \'PREFIX=/usr/local\'</code>', 'Nguyên nhân gốc', 'BitBake ghi lại giá trị mọi biến mà mỗi task dùng']
          ] },

          { t: 'p', x:
            'Thay đổi bắt đầu từ <code>do_configure</code> — <code>EXTRA_OEMAKE</code> được class mặc định dùng từ ' +
            'task đó trở đi — nên <code>do_fetch</code>, <code>do_unpack</code>, <code>do_patch</code> giữ chữ ký ' +
            'cũ. Đó là lý do có 11 chứ không phải 19 chữ ký mới. Dòng <code>sed</code> cuối gỡ ' +
            '<code>EXTRA_OEMAKE</code>, trả recipe về như cũ.' },

          { t: 'p', x:
            '<b>Thay đổi 3 — sửa patch.</b> Đây là tình huống của cái bẫy ở Bài 61: Buildroot không áp patch mới cho ' +
            'tới khi bạn <code>dirclean</code>. Sửa một chữ trong <b>phần mô tả</b> của patch (không chạm vào mã):' },

          { t: 'code', where: 'wsl', code:
            'P=../meta-learn/recipes-apps/temp-daemon/files/0001-Take-the-listening-port-from-argv-1.patch\n' +
            'sed -i \'s/^Default stays 9006, so existing/Default stays 9006, existing/\' $P\n' +
            'sed -n 6p $P\n' +
            'bitbake -S none temp-daemon > /dev/null 2>&1\n' +
            'ls $ST | grep -c sigdata\n' +
            'bitbake-diffsigs $(ls -tr $ST/*do_unpack.sigdata.* | tail -2)' },

          { t: 'code', where: 'out', nocopy: true, code:
            'Default stays 9006, existing callers see no change.\n' +
            '48\n' +
            'NOTE: Starting bitbake server...\n' +
            'Hash for task dependency temp-daemon:do_fetch changed from 46a865b4a2bdf146ba10a09b2d348c246c75f5883878c99988878dc2d3b4b63b to a3037af88c9672e79d347b56a568ac14ad4ad6d778df7ed476f72c6d90a3c2b0\n' +
            '    Checksum for file 0001-Take-the-listening-port-from-argv-1.patch changed from b1d2c6c2f7caa9c8b8fa5c8631bcb27e to 57eb06522f43688da8150bd44c0f6406' },

          { t: 'p', x:
            '30 → <b>48</b>: 18 chữ ký mới — mọi task của recipe trừ một: <code>do_recipe_qa</code>, task kiểm ' +
            'tra chính file recipe và chạy <b>trước</b> <code>do_fetch</code> (trong <code>task-depends.dot</code> có cạnh ' +
            '<code>"temp-daemon.do_fetch" -&gt; "temp-daemon.do_recipe_qa"</code>), nên không nhận chữ ký nào từ patch. Diffsigs chỉ thẳng nguyên nhân: checksum của file patch đổi ' +
            'từ <code>b1d2c6c2…</code> sang <code>57eb0652…</code>, làm đổi chữ ký <code>do_fetch</code>, và từ đó ' +
            'lan xuống toàn bộ chuỗi. Bạn chỉ đổi phần mô tả của patch, mã nguồn sau khi vá vẫn y hệt — BitBake ' +
            'không biết điều đó và chọn cách an toàn: build lại. Không có quy tắc \"nhớ dirclean\" nào cần thuộc.' },

          { t: 'p', x:
            'Trả patch về bản gốc, tính lại, và kiểm tra mọi thứ đã như ban đầu:' },

          { t: 'code', where: 'wsl', code:
            'cp ~/bai61/br-ext/patches/temp-daemon/0001-Take-the-listening-port-from-argv-1.patch $P\n' +
            'bitbake -S none temp-daemon > /dev/null 2>&1\n' +
            'ls $ST | grep -c sigdata' },

          { t: 'code', where: 'out', nocopy: true, code: '48' },

          { t: 'p', x:
            'Vẫn <b>48</b>, không thêm file nào: patch đã về đúng nội dung cũ, nên mọi chữ ký trùng với những chữ ' +
            'ký đã có từ lần đầu. Với sstate, đây là điểm then chốt — nếu bạn đã build thật lần đầu, quay về một ' +
            'trạng thái cũ thì mọi kết quả được lấy lại từ cache, không chạy lại gì. Buildroot không có khái niệm ' +
            '\"đã từng build trạng thái này\".' },

          { t: 'p', x:
            '<b>Một lỗi có chủ ý.</b> Bước 3 nói <code>LAYERSERIES_COMPAT</code> là dòng gây nhiều lỗi nhất khi ' +
            'nâng cấp. Giả lập một layer viết cho Yocto 5.0, rồi sửa lại:' },

          { t: 'code', where: 'wsl', code:
            'sed -i \'s/^LAYERSERIES_COMPAT_meta-learn = "wrynose"/LAYERSERIES_COMPAT_meta-learn = "scarthgap"/\' ../meta-learn/conf/layer.conf\n' +
            'bitbake-layers show-layers; echo "rc=$?"\n' +
            'sed -i \'s/^LAYERSERIES_COMPAT_meta-learn = "scarthgap"/LAYERSERIES_COMPAT_meta-learn = "wrynose"/\' ../meta-learn/conf/layer.conf' },

          { t: 'code', where: 'out', nocopy: true, code:
            'NOTE: Starting bitbake server...\n' +
            'ERROR: Layer meta-learn is not compatible with the core layer which only supports these series: wrynose (layer is compatible with scarthgap)\n' +
            'ERROR: Layer meta-learn is not compatible with the core layer which only supports these series: wrynose (layer is compatible with scarthgap)\n' +
            'rc=1' },

          { t: 'p', x:
            'BitBake từ chối đọc bất cứ thứ gì, kể cả lệnh chỉ liệt kê layer, mã thoát 1. Thông báo nói rõ cả hai ' +
            'phía: OE-Core chỉ nhận <code>wrynose</code>, layer khai <code>scarthgap</code>. Trong thực tế bạn gặp ' +
            'lỗi này khi một layer BSP của hãng chip chưa được cập nhật cho bản Yocto bạn đang dùng — và việc đúng ' +
            'là tìm nhánh của layer đó khớp với bản Yocto, <b>không phải</b> sửa dòng <code>COMPAT</code> cho qua ' +
            'kiểm tra. Dòng <code>sed</code> cuối trả layer về <code>wrynose</code>.' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp',
            x: '<code>~/bai62</code> chiếm khoảng <b>1–1,2 GB</b> (buildtools 508 MB, ba kho Git khoảng 65 MB, phần ' +
               'còn lại là <code>build/tmp</code>). Không bài nào sau đọc tới nó: khi xong, <code>rm -rf ~/bai62</code>. Nếu muốn giữ lại để ' +
               'tham khảo, chỉ cần <code>~/bai62/meta-learn</code> (vài KB) — đó là phần duy nhất bạn tự viết. ' +
               '<code>~/bai61/br-ext</code> và <code>~/bai61/upstream</code> cũng có thể xoá từ đây, cùng ' +
               '<code>~/bai60</code> (khoảng 16 GB).' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>RuntimeError: Sorry, python 3.9.0 or later is required for this version of bitbake</code>', 'Distro quá cũ: Ubuntu 20.04 có Python 3.8.10, BitBake 2.18 cần 3.9', 'Cài buildtools bằng <code>python3.9 openembedded-core/scripts/install-buildtools</code>, rồi source <code>environment-setup-…</code> <b>trước</b> <code>oe-init-build-env</code>'],
        ['<code>ERROR: The following required tools (as specified by HOSTTOOLS) appear to be unavailable in PATH … diffstat gawk</code>', 'Máy chủ thiếu lệnh trong danh sách <code>HOSTTOOLS</code> của OE-Core; buildtools không có đủ mọi lệnh', '<code>sudo apt install gawk diffstat</code>; không có sudo thì <code>apt-get download</code> + <code>dpkg-deb -x</code> và nối thư mục vào cuối <code>PATH</code>'],
        ['<code>Your version of gcc is older than 10.1 and will break builds</code> (kèm lỗi C++20)', 'Dùng GCC 9.4 của Ubuntu 20.04 thay vì GCC của buildtools', 'Kiểm tra <code>gcc --version</code> trong terminal hiện tại: phải là 15.3.0. Nếu không, bạn chưa source script của buildtools'],
        ['<code>Error: This script needs to be sourced. Please run as \'. …/oe-init-build-env\'</code>', 'Chạy <code>oe-init-build-env</code> như một chương trình (<code>./oe-init-build-env</code> hoặc <code>bash oe-init-build-env</code>)', 'Dùng <code>.</code> hoặc <code>source</code>: script phải sửa <code>PATH</code> và <code>cd</code> trong shell của bạn'],
        ['<code>bitbake: command not found</code> trong terminal mới', 'Môi trường chỉ tồn tại trong shell đã source nó', '<code>. ~/bai62/env.sh</code> ở mỗi terminal mới'],
        ['<code>ERROR: Layer meta-learn is not compatible with the core layer which only supports these series: wrynose (layer is compatible with scarthgap)</code>', '<code>LAYERSERIES_COMPAT</code> của layer không chứa codename của OE-Core đang dùng', 'Lấy nhánh của layer khớp bản Yocto (<code>git checkout wrynose</code>). Chỉ sửa dòng <code>COMPAT</code> khi chính bạn là người duy trì layer và đã kiểm tra nó'],
        ['<code>Nothing PROVIDES \'temp-daemon\'</code>', 'Layer chưa có trong <code>bblayers.conf</code>, hoặc recipe không khớp mẫu <code>BBFILES</code> (sai độ sâu thư mục, sai đuôi)', '<code>bitbake-layers show-layers</code>, rồi <code>bitbake-layers show-recipes temp-daemon</code>. Recipe phải ở <code>recipes-*/tên/tên_ver.bb</code>'],
        ['<code>ERROR: No recipes in default available for:</code> kèm đường dẫn <code>…/base-files_3.0.13.bbappend</code>', 'bbappend ghi cứng phiên bản 3.0.13, nhưng OE-Core 6.0.4 có <code>base-files_3.0.14.bb</code>; BitBake dừng, mã 1', 'Đặt tên <code>base-files_%.bbappend</code>; kiểm tra bằng <code>bitbake-layers show-appends base-files</code>'],
        ['Sửa <code>SRC_URI[sha256sum]</code> sai mà <code>bitbake -c fetch</code> vẫn thành công', '<code>file://</code> không bao giờ được kiểm tra hash (<code>recommends_checksum</code> = <code>False</code>)', 'Không phải lỗi. Với <code>https://</code> hash là bắt buộc; với <code>file://</code>, chữ ký task đã bắt mọi thay đổi'],
        ['Sửa recipe nhưng không biết bao nhiêu task sẽ chạy lại', '—', '<code>bitbake -S none &lt;recipe&gt;</code> trước và sau, đếm file <code>.sigdata</code> mới; <code>bitbake-diffsigs</code> giữa hai file cùng task cho biết vì sao']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      '\"Yocto\" là bốn thứ: <b>Yocto Project</b> (tổ chức, lịch phát hành), <b>BitBake</b> (bộ máy chạy task), <b>OpenEmbedded-Core</b> (layer lõi, 950 recipe, 234 class) và <b>Poky</b> (distro tham chiếu). Bản LTS hiện tại: <b>6.0 \"wrynose\"</b>, tag <code>yocto-6.0.4</code>, lấy từ ba kho Git.',
      'Metadata gồm recipe <code>.bb</code> (tên + phiên bản trong tên file), <code>.bbappend</code> (sửa recipe của layer khác), class <code>.bbclass</code> (<code>inherit</code>) và cấu hình <code>.conf</code>. <code>??=</code> là mặc định yếu nhất; <code>:append</code> áp sau mọi phép <code>=</code>. <code>bitbake-getvar</code> in giá trị cuối kèm từng file và dòng đã gán.',
      'Trên Ubuntu 20.04, BitBake cần <b>buildtools</b> (Python 3.14.6, GCC 15.3.0, 508 MB, không cần root) vì hệ thống chỉ có Python 3.8 và GCC 9.4. <code>HOSTTOOLS</code> giới hạn task chỉ dùng được một danh sách lệnh máy chủ cố định.',
      'Một layer = <code>conf/layer.conf</code> (tên, mẫu <code>BBFILES</code>, priority, <code>LAYERSERIES_COMPAT</code>) + các thư mục <code>recipes-*</code>. <code>bitbake-layers create-layer</code> / <code>add-layer</code>; layer khai sai codename thì BitBake từ chối đọc, mã 1.',
      'Recipe <code>temp-daemon_1.0.bb</code> <b>25 dòng</b> thay cho <code>temp-daemon.mk</code> 26 dòng: <code>SRC_URI</code> gom tarball + patch + script; <code>oe_runmake</code>; <code>DESTDIR=${D}</code> riêng mỗi recipe. Image recipe <b>12 dòng</b> thay defconfig + post-build. <code>MACHINE ??= "qemuarm64"</code> lan tới <code>aarch64-oe-linux-gcc -mcpu=cortex-a57+crc</code>.',
      'Không build, BitBake vẫn đo được: <b>27 task</b> cho một recipe, <b>316 recipe</b> / <b>23 343</b> cạnh cho ảnh (<code>-g</code>), <b>5 150 task</b> và 2 756 task sstate-cache bị miss (<code>-n</code>). Tài liệu 6.0 ghi tối thiểu <b>32 GB RAM</b>, 140 GB đĩa.',
      'Chữ ký task thay cho stamp: thêm chú thích → <b>0</b> chữ ký mới; thêm <code>EXTRA_OEMAKE</code> → <b>11</b> (từ <code>do_configure</code>); sửa một dòng mô tả trong patch → <b>18</b> (từ <code>do_fetch</code>); trả về như cũ → 0. <code>bitbake-diffsigs</code> chỉ ra biến hoặc file gây thay đổi. sstate dùng lại kết quả theo chữ ký, kể cả giữa các máy.',
      'Chọn Buildroot cho một sản phẩm, đội nhỏ, máy build bình thường. Chọn Yocto khi hãng chip giao BSP dạng layer, có nhiều sản phẩm, cần gói cập nhật được, SPDX/CVE và vòng đời dài.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Chặng 11 khép lại ở đây: bạn đã đi từ một Makefile 47 dòng (Bài 59) tới Buildroot và Yocto. ' +
         '<b>Bài 63 — Debug kernel bằng GDB</b> mở <code>Chặng 12</code>: thay vì đọc log sau khi mọi chuyện đã ' +
         'xảy ra, bạn dừng kernel đang chạy trong QEMU (<code>-s -S</code>), gắn <code>gdb-multiarch</code> vào ' +
         'cổng 1234 với <code>vmlinux</code> 157 MB còn nguyên symbol của Bài 40, đặt breakpoint tại ' +
         '<code>start_kernel</code>, và đi từng dòng qua chính hàm <code>probe()</code> của driver bạn viết ở ' +
         'Chặng 10 — đọc giá trị biến ngay trong bộ nhớ kernel.' }
  ],

  quiz: [
    { q: 'Bạn thêm <code>file://0002-fix-overflow.patch</code> vào <code>SRC_URI</code> của <code>temp-daemon_1.0.bb</code> rồi chạy <code>bitbake temp-daemon</code>. Patch có được áp không, và vì sao?',
      opts: [
        'Không — giống Buildroot, phải chạy <code>bitbake -c cleansstate temp-daemon</code> trước',
        'Có — <code>SRC_URI</code> đổi làm chữ ký của <code>do_fetch</code> đổi, kéo theo chữ ký của <code>do_unpack</code>, <code>do_patch</code> và mọi task sau, nên chúng chạy lại',
        'Có, nhưng chỉ vì BitBake xoá toàn bộ <code>tmp/</code> mỗi lần recipe thay đổi',
        'Không — patch chỉ được áp khi tên bắt đầu bằng <code>0001-</code>'
      ],
      a: 1,
      why: 'Đây là khác biệt cốt lõi với stamp của Buildroot (Bài 61: phải <code>dirclean</code>). Chữ ký của mỗi task gồm mọi đầu vào của nó cộng chữ ký các task nó phụ thuộc; checksum của mọi file <code>file://</code> là đầu vào của <code>do_fetch</code>. Bước 6 đo đúng điều này: sửa một dòng mô tả trong patch tạo 18 chữ ký mới. BitBake không xoá <code>tmp/</code>; nó chỉ chạy lại những task có chữ ký chưa từng thấy.' },

    { q: 'Sau khi source <code>buildtools</code> và <code>oe-init-build-env</code>, <code>bitbake-layers show-layers</code> in <code>Your version of gcc is older than 10.1 and will break builds</code>. Nguyên nhân có khả năng nhất?',
      opts: [
        'buildtools tải về bị hỏng; phải tải lại',
        'Bạn đã source <code>environment-setup-…</code> của buildtools trong một terminal khác, hoặc sau <code>oe-init-build-env</code> rồi đặt lại <code>PATH</code>, nên <code>gcc</code> đang là GCC 9.4 của Ubuntu',
        'OE-Core 6.0 không hỗ trợ GCC 15',
        'Phải cài <code>gcc-10</code> bằng apt vì buildtools không chứa GCC'
      ],
      a: 1,
      why: 'Buildtools 6.0.3 chứa GCC 15.3.0 và Python 3.14.6; nó chỉ có tác dụng trong shell đã source <code>environment-setup-x86_64-pokysdk-linux</code>, và chỉ khi không bị một lệnh <code>export PATH=…</code> sau đó ghi đè. <code>gcc --version</code> trong đúng terminal đó sẽ trả lời ngay: 15.3.0 là đúng, 9.4.0 là đang dùng GCC hệ thống. Vì thế <code>env.sh</code> của bài đặt <code>PATH</code> sạch <b>trước</b>, rồi mới source buildtools.' },

    { q: 'Trong một bbappend bạn viết <code>IMAGE_INSTALL:append = "temp-daemon"</code> (không có dấu cách đầu). Image recipe gốc có <code>IMAGE_INSTALL = "packagegroup-core-boot"</code>. Giá trị cuối là gì?',
      opts: [
        '<code>packagegroup-core-boot temp-daemon</code>',
        '<code>temp-daemon</code>',
        '<code>packagegroup-core-boottemp-daemon</code>',
        'Lỗi cú pháp, BitBake dừng'
      ],
      a: 2,
      why: '<code>:append</code> nối chuỗi nguyên văn, không tự thêm dấu cách (khác <code>+=</code>). Kết quả là một tên gói không tồn tại, và lỗi chỉ hiện ra khi dựng rootfs. Đó là lý do mọi <code>:append</code> vào một danh sách đều viết <code>" temp-daemon"</code> với dấu cách đầu — như <code>learn-image.bb</code> ở bước 4. <code>bitbake-getvar -r learn-image --value IMAGE_INSTALL</code> cho bạn thấy giá trị thật trước khi build.' },

    { q: 'Vì sao <code>base-files_%.bbappend</code> đổi được hostname mà không sửa file nào của OE-Core?',
      opts: [
        'Vì layer <code>meta-learn</code> có priority 6, cao hơn OE-Core (5), nên mọi biến của nó thắng',
        'Vì BitBake đọc recipe <code>base-files_3.0.14.bb</code> trước, rồi đọc mọi bbappend khớp tên của nó; phép gán <code>hostname = "learn"</code> trong bbappend đến sau nên đè giá trị <code>${MACHINE}</code> ở dòng 70',
        'Vì <code>%</code> làm BitBake bỏ qua recipe gốc',
        'Vì <code>FILESEXTRAPATHS</code> thay thế toàn bộ recipe gốc'
      ],
      a: 1,
      why: '<code>bitbake-getvar -r base-files hostname</code> ở bước 4 in đúng thứ tự này: <i>set … base-files_3.0.14.bb:70 "${MACHINE}"</i>, rồi <i>set … base-files_%.bbappend:2 "learn"</i>. Priority chỉ dùng để chọn khi hai layer cùng có một recipe trùng tên. <code>%</code> chỉ là ký tự đại diện cho phiên bản. <code>FILESEXTRAPATHS</code> chỉ thêm thư mục tìm file cho <code>file://</code> (để <code>motd</code> của bạn được dùng).' },

    { q: 'Bạn thêm một dòng chú thích <code># reviewed</code> vào đầu <code>temp-daemon_1.0.bb</code> trên một máy đã build xong ảnh. <code>bitbake learn-image</code> sẽ build lại bao nhiêu task của <code>temp-daemon</code>?',
      opts: [
        'Tất cả 19, vì file recipe đã thay đổi',
        'Chỉ <code>do_fetch</code>',
        'Không task nào: chú thích không đi vào hàm hay biến nào, nên không chữ ký nào đổi',
        'Chỉ <code>do_package</code>, để cập nhật thông tin gói'
      ],
      a: 2,
      why: 'Bước 6 đo đúng điều này: trước và sau khi thêm chú thích đều là 19 file <code>.sigdata</code>. BitBake vẫn phải đọc lại file (thời gian thay đổi), nhưng chữ ký chỉ tính từ nội dung có ý nghĩa: thân hàm task và giá trị biến mà nó dùng. Ngược lại, <code>make</code> chỉ so thời gian sửa đổi — Bài 59 cho thấy khi Makefile là phụ thuộc, mọi chỉnh sửa trong nó, kể cả chú thích, kéo theo build lại.' },

    { q: 'Một công ty làm cổng IoT dùng SoC i.MX8 của NXP, có ba mẫu sản phẩm dùng chung phần lớn phần mềm, và khách hàng ngành công nghiệp yêu cầu SBOM cho mỗi bản phát hành. Đội gồm 12 kỹ sư. Lựa chọn hợp lý nhất?',
      opts: [
        'Buildroot, vì lần build đầu nhanh hơn',
        'Yocto: NXP giao BSP dạng layer <code>meta-imx</code>, ba sản phẩm chia sẻ layer chung và khác nhau ở vài layer riêng, SPDX được sinh cho từng gói, và sstate mirror giúp 12 kỹ sư không phải build lại từ đầu',
        'Tự viết Makefile như Bài 59, vì kiểm soát được mọi thứ',
        'Buildroot với một br2-external cho mỗi sản phẩm, vì Yocto không hỗ trợ ARM64'
      ],
      a: 1,
      why: 'Cả bốn tiêu chí trong bảng \"khi nào chọn cái nào\" cùng nghiêng về một phía: BSP của hãng ở dạng layer Yocto (tự chuyển sang Buildroot là gánh nặng bảo trì lớn), họ sản phẩm nhiều biến thể, yêu cầu SBOM, đội nhiều người. Buildroot vẫn tạo được ảnh, nhưng công ty sẽ phải tự làm lại những thứ Yocto có sẵn. Yocto hỗ trợ ARM64 — bạn đã thấy <code>aarch64-oe-linux-gcc</code> ở bước 4.' }
  ]
});

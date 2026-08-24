/* Bài 39 — Kconfig và menuconfig
   Chặng 07 — Linux Kernel
   Ngôn ngữ Kconfig, bốn trạng thái của một ký hiệu trong .config, khác biệt thật giữa
   y / m / n nhìn từ autoconf.h, và bộ target defconfig / menuconfig / olddefconfig /
   savedefconfig. Mọi số liệu đo trên kernel 6.18.45, ARCH=arm64. */

Lesson.register({
  id: 'bai-39',
  title: 'Kconfig và menuconfig',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    '<b>Bài 38</b> đã hai lần đâm vào cùng một bức tường. Lần thứ nhất là dòng ' +
    '<code>obj-$(CONFIG_SERIAL_AMBA_PL011) += amba-pl011.o</code> trong Makefile của driver UART: ' +
    'file có được biên dịch hay không phụ thuộc hoàn toàn vào giá trị của một ký hiệu ' +
    '<code>CONFIG_</code>. Lần thứ hai là dòng <code>depends on SERIAL_AMBA_PL011=y</code> trong ' +
    'file <code>Kconfig</code> của cùng thư mục — một điều kiện viết bằng thứ ngôn ngữ mà bài trước ' +
    'chưa dạy. Cả hai lần, câu trả lời nằm ở một file mà cây source <i>chưa có</i>: <code>.config</code>. ' +
    'Bài này tạo ra file đó, đọc nó, sửa nó, và quan trọng hơn cả: chứng minh bằng số rằng ' +
    '<b>cấu hình kernel là một chương trình bạn chạy, không phải một danh sách bạn gõ tay</b>. ' +
    'Cây 6.18.45 có <b>1 880 file Kconfig</b> khai báo <b>22 125 ký hiệu</b>, ràng buộc nhau bằng ' +
    '<b>19 717</b> mệnh đề <code>depends on</code> và <b>21 923</b> mệnh đề <code>select</code>. ' +
    'Không con người nào giữ nổi mạng lưới đó trong đầu — nên đã có <code>conf</code> giữ hộ.',

  goals: [
    'Đọc được một mục <code>config</code> trong file <code>Kconfig</code>: kiểu ký hiệu, <code>prompt</code>, <code>depends on</code>, <code>select</code>, <code>default</code>',
    'Sinh <code>.config</code> bằng <code>make ARCH=arm64 defconfig</code> và giải thích <b>bốn trạng thái</b> mà một ký hiệu có thể ở trong đó — kể cả trạng thái “vắng mặt hoàn toàn”',
    'Chứng minh khác biệt thật giữa <code>y</code> và <code>m</code> bằng chính file <code>autoconf.h</code> mà trình biên dịch đọc, chứ không bằng định nghĩa suông',
    'Dùng <code>menuconfig</code> (kể cả tìm kiếm bằng <kbd>/</kbd>) và <code>scripts/config</code> để đổi một lựa chọn, rồi kiểm chứng kết quả trong <code>.config</code>',
    'Chọn đúng target giữa <code>oldconfig</code>, <code>olddefconfig</code>, <code>listnewconfig</code> và <code>savedefconfig</code> — mỗi cái sinh ra để giải một bài toán khác nhau',
    'Nhận ra cái bẫy đắt nhất của cấu hình kernel: tắt một ký hiệu sẽ <b>xoá</b> lựa chọn của những ký hiệu phụ thuộc nó, và bật lại <b>không</b> khôi phục chúng'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Vì sao kernel cần một ngôn ngữ cấu hình riêng
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Vì sao kernel cần hẳn một ngôn ngữ cấu hình riêng' },

    { t: 'p', x:
      'Ở <b>Bài 16</b> bạn đã thấy cách một dự án C nhỏ được cấu hình: sửa vài biến ở đầu ' +
      '<code>Makefile</code>, hoặc truyền <code>make CFLAGS=-O2</code>. Với vài chục lựa chọn thì cách ' +
      'đó đủ dùng. Kernel không ở quy mô đó. Hãy nhìn con số thật, đếm trên chính cây source bạn giải ' +
      'nén ở <b>Bài 38</b>:' },

    { t: 'table',
      head: ['Thứ được đếm', 'Số lượng', 'Ý nghĩa'],
      rows: [
        ['File <code>Kconfig*</code> trong toàn cây', '<b>1 880</b>',
         'Mỗi thư mục con tự khai báo lựa chọn của mình — <code>drivers/</code> chiếm 1 336 file'],
        ['Mục <code>config</code>', '21 740', 'Một ký hiệu <code>CONFIG_</code> bình thường'],
        ['Mục <code>menuconfig</code>', '385', 'Ký hiệu vừa là lựa chọn, vừa là cửa vào một menu con'],
        ['<b>Tổng ký hiệu khai báo</b>', '<b>22 125</b>', 'Bằng 21 740 + 385'],
        ['Khối <code>choice</code>', '189', 'Nhóm “chỉ được chọn một trong số này”'],
        ['Dòng <code>depends on</code>', '<b>19 717</b>', '“Chỉ hiện/chỉ bật được nếu điều kiện này đúng”'],
        ['Dòng <code>select</code>', '<b>21 923</b>', '“Nếu tôi được bật thì kéo theo ký hiệu kia bật cùng”'],
        ['Dòng <code>tristate</code> / <code>bool</code>', '11 646 / 8 813', 'Ký hiệu ba trạng thái và ký hiệu hai trạng thái']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao không thể là một file text phẳng', x:
      '<p>22 125 lựa chọn thì vẫn có thể liệt kê ra một file. Nhưng <b>41 640 ràng buộc</b> ' +
      '(<code>depends on</code> cộng <code>select</code>) thì không: chúng biến tập lựa chọn thành một ' +
      '<b>đồ thị phụ thuộc</b>. Bật một ký hiệu có thể kéo theo mười ký hiệu khác; tắt một ký hiệu có ' +
      'thể làm hàng trăm ký hiệu khác biến mất khỏi màn hình vì điều kiện của chúng không còn đúng.</p>' +
      '<p>Nên Linux không có “file cấu hình”. Nó có một <b>ngôn ngữ</b> (Kconfig), một ' +
      '<b>trình thông dịch</b> (<code>scripts/kconfig/conf</code>) và một <b>kết quả</b> ' +
      '(<code>.config</code>). Bạn không viết kết quả — bạn chạy trình thông dịch để nó tính ra kết quả. ' +
      'Đây là lý do sâu xa cho câu cảnh báo ngay dòng đầu mọi file <code>.config</code>: ' +
      '<code>DO NOT EDIT</code>.</p>' },

    { t: 'p', x:
      'Bức tranh tổng thể của cả bài nằm trong sơ đồ dưới. Hãy nhớ ba mốc: <b>bạn</b> chỉ chạm vào ' +
      'phần bên trên (chọn lựa chọn), <b>conf</b> tạo ra <code>.config</code>, còn <b>toàn bộ phần bên ' +
      'dưới là tự động</b> — nhưng biết nó tồn tại là khác biệt giữa người sửa được lỗi build và người ' +
      'chỉ biết chạy lại <code>make</code>.' },

    { t: 'fig',
      cap: 'Cấu hình kernel là một đường ống một chiều. Bạn chỉ tác động ở tầng trên; ba file sinh ra ' +
           'ở tầng dưới là thứ Kbuild và gcc thật sự đọc — và chúng không bao giờ được sửa tay.',
      svg:
        '<svg viewBox="0 0 720 396" width="720" role="img" aria-label="Sơ đồ đường ống cấu hình kernel từ file Kconfig qua conf tới .config rồi tới auto.conf và autoconf.h">' +

        '<rect class="d-box" x="210" y="12" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="230" y="32">1 880 file Kconfig</text>' +
        '<text class="d-ts" x="230" y="49">khai báo 22 125 ký hiệu và 41 640 ràng buộc</text>' +
        '<text class="d-ts" x="10" y="32">nguồn: nằm rải rác</text>' +
        '<text class="d-ts" x="10" y="49">trong cây source</text>' +

        '<line class="d-line" x1="360" y1="58" x2="360" y2="76"/>' +
        '<path class="d-arrow" d="M 360 80 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-p" x="210" y="80" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="230" y="100">conf · mconf · scripts/config</text>' +
        '<text class="d-ts" x="230" y="117">make defconfig / menuconfig / olddefconfig</text>' +
        '<text class="d-ts" x="530" y="100">chỗ duy nhất</text>' +
        '<text class="d-ts" x="530" y="117">bạn ra quyết định</text>' +

        '<line class="d-line" x1="360" y1="126" x2="360" y2="144"/>' +
        '<path class="d-arrow" d="M 360 148 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-a" x="210" y="148" width="300" height="46" rx="6"/>' +
        '<text class="d-t" x="230" y="168">.config</text>' +
        '<text class="d-ts" x="230" y="185">11 727 dòng — 4 663 ký hiệu có giá trị</text>' +

        '<line class="d-line" x1="360" y1="194" x2="360" y2="212"/>' +
        '<path class="d-arrow" d="M 360 216 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box" x="210" y="216" width="300" height="42" rx="6"/>' +
        '<text class="d-t" x="230" y="234">make syncconfig</text>' +
        '<text class="d-ts" x="230" y="251">chạy tự động ở đầu mỗi lần make</text>' +

        '<line class="d-line" x1="360" y1="258" x2="360" y2="272"/>' +
        '<line class="d-line" x1="160" y1="272" x2="560" y2="272"/>' +
        '<line class="d-line" x1="160" y1="272" x2="160" y2="288"/>' +
        '<line class="d-line" x1="560" y1="272" x2="560" y2="288"/>' +
        '<path class="d-arrow" d="M 160 292 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 560 292 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-g" x="16" y="292" width="288" height="52" rx="6"/>' +
        '<text class="d-tm" x="32" y="312">include/config/auto.conf</text>' +
        '<text class="d-ts" x="32" y="329">Kbuild đọc → quyết định biên dịch file nào</text>' +

        '<rect class="d-box-g" x="416" y="292" width="288" height="52" rx="6"/>' +
        '<text class="d-tm" x="432" y="312">include/generated/autoconf.h</text>' +
        '<text class="d-ts" x="432" y="329">gcc đọc → 4 663 dòng #define</text>' +

        '<line class="d-line" x1="160" y1="344" x2="160" y2="360"/>' +
        '<line class="d-line" x1="560" y1="344" x2="560" y2="360"/>' +
        '<line class="d-line" x1="160" y1="360" x2="560" y2="360"/>' +
        '<line class="d-line" x1="360" y1="360" x2="360" y2="368"/>' +
        '<path class="d-arrow" d="M 360 372 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-p" x="210" y="372" width="300" height="22" rx="6"/>' +
        '<text class="d-ts" x="230" y="387">vmlinux + 1 273 module .ko</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       2. Đọc một mục Kconfig
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Đọc một mục Kconfig' },

    { t: 'p', x:
      'Ngôn ngữ Kconfig nhỏ đến bất ngờ — học một mục là gần như học xong cả ngôn ngữ. Hãy lấy đúng ' +
      'driver UART mà QEMU dùng ở <b>Chặng 05</b>, thứ đã in ra dòng boot log đầu tiên của bạn. Nó được ' +
      'khai báo ở <code>drivers/tty/serial/Kconfig</code>, dòng 48:' },

    { t: 'code', where: 'file', name: 'drivers/tty/serial/Kconfig — dòng 48', lang: 'text', nocopy: true, code:
      'config SERIAL_AMBA_PL011\n' +
      '\ttristate "ARM AMBA PL011 serial port support"\n' +
      '\tdepends on ARM_AMBA\n' +
      '\tselect SERIAL_CORE\n' +
      '\thelp\n' +
      '\t  This selects the ARM(R) AMBA(R) PrimeCell PL011 UART.  If you have\n' +
      '\t  an Integrator/PP2, Integrator/CP or Versatile platform, say Y or M\n' +
      '\t  here.\n' +
      '\n' +
      '\t  If unsure, say N.' },

    { t: 'p', x:
      'Sáu dòng này chứa toàn bộ những gì cần biết. Từng dòng:' },

    { t: 'terms', items: [
      ['config SERIAL_AMBA_PL011', 'khai báo',
       'Khai báo một ký hiệu tên <code>SERIAL_AMBA_PL011</code>. Trong <code>.config</code> và trong mã C ' +
       'nó luôn xuất hiện với tiền tố <code>CONFIG_</code>, thành <code>CONFIG_SERIAL_AMBA_PL011</code>. ' +
       'Tiền tố đó do công cụ thêm vào, không viết trong file Kconfig.'],
      ['tristate "…"', 'kiểu + prompt',
       'Hai việc trong một dòng. <code>tristate</code> là <b>kiểu</b>: ký hiệu này nhận được ba giá trị ' +
       '<code>y</code>, <code>m</code>, <code>n</code>. Chuỗi trong ngoặc kép là <b>prompt</b> — dòng chữ ' +
       'bạn nhìn thấy trong <code>menuconfig</code>. <b>Không có prompt thì không hiện ra menu</b>, và đó ' +
       'là một quy tắc quan trọng chứ không phải chi tiết vụn.'],
      ['depends on ARM_AMBA', 'điều kiện',
       'Chỉ khi <code>CONFIG_ARM_AMBA</code> được bật thì mục này mới <b>hiện ra</b> và mới bật được. ' +
       'Trên một cấu hình x86, <code>ARM_AMBA</code> tắt, nên mục này biến mất hoàn toàn khỏi ' +
       '<code>menuconfig</code> — không phải bị làm mờ, mà là không tồn tại trên màn hình.'],
      ['select SERIAL_CORE', 'kéo theo',
       'Chiều ngược lại của <code>depends on</code>: nếu ký hiệu này được bật, ' +
       '<code>CONFIG_SERIAL_CORE</code> <b>bị ép bật theo</b>, bất kể bạn muốn hay không. ' +
       '<code>select</code> là mệnh lệnh, không phải đề nghị — Thực hành bước 5 sẽ chứng minh bạn không ' +
       'thể tắt nó.'],
      ['help', 'văn bản trợ giúp',
       'Nội dung hiện khi bạn nhấn <kbd>?</kbd> trong <code>menuconfig</code>. Câu cuối — ' +
       '<i>“If unsure, say N”</i> — là quy ước chung của cả kernel: khi không chắc, chọn <code>N</code>.']
    ]},

    { t: 'p', x:
      'Kiểu của ký hiệu quyết định nó nhận giá trị gì. Có năm kiểu, nhưng hai kiểu đầu chiếm gần như ' +
      'toàn bộ:' },

    { t: 'table',
      head: ['Kiểu', 'Nhận giá trị', 'Số dòng trong cây 6.18.45', 'Dùng cho'],
      rows: [
        ['<code>bool</code>', '<code>y</code> hoặc <code>n</code>', '8 813',
         'Tính năng không thể tách rời kernel: hỗ trợ SMP, thuật toán lập lịch, định dạng file thực thi'],
        ['<code>tristate</code>', '<code>y</code>, <code>m</code> hoặc <code>n</code>', '11 646',
         'Thứ có thể tách ra thành module nạp sau: hầu hết driver và hệ thống file'],
        ['<code>string</code>', 'một chuỗi', '—',
         'Ví dụ <code>CONFIG_CC_VERSION_TEXT="gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0"</code>'],
        ['<code>int</code>', 'một số thập phân', '—',
         'Ví dụ <code>CONFIG_GCC_VERSION=150200</code>, <code>CONFIG_LOG_BUF_SHIFT=17</code>'],
        ['<code>hex</code>', 'một số hex', '—', 'Địa chỉ và mặt nạ bit, ví dụ <code>CONFIG_ARCH_MMAP_RND_BITS=18</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Mẹo nhớ: tristate = "có thể tháo rời"', x:
      '<p>Câu hỏi “ký hiệu này nên là <code>bool</code> hay <code>tristate</code>?” luôn quy về một câu ' +
      'hỏi vật lý: <b>thứ này có thể nạp vào kernel <i>sau khi</i> kernel đã chạy được không?</b></p>' +
      '<p>Driver cho một con chip cắm ngoài — nạp sau được, nên <code>tristate</code>. Còn bộ lập lịch ' +
      'thì không: kernel không thể khởi động rồi mới nạp bộ lập lịch vào, nên <code>bool</code>. ' +
      'Đây là <b>nguyên lý</b>, đáng nhớ; còn ký hiệu cụ thể nào thuộc kiểu nào thì luôn tra được bằng ' +
      '<kbd>/</kbd> trong <code>menuconfig</code>, không cần thuộc lòng.</p>' },

    { t: 'p', x:
      'Còn một loại mục nữa mà bạn sẽ gặp ngay ở màn hình đầu tiên: ký hiệu <b>không có prompt</b>. ' +
      'Ký hiệu bị <code>select</code> ở trên là một ví dụ — hãy xem chính nó, ở dòng 705 cùng file:' },

    { t: 'code', where: 'file', name: 'drivers/tty/serial/Kconfig — dòng 705', lang: 'text', nocopy: true, code:
      'config SERIAL_CORE\n' +
      '\ttristate' },

    { t: 'cal', kind: 'info', title: 'Hai dòng, không prompt, không help — và đó là chủ ý', x:
      '<p><code>SERIAL_CORE</code> là phần lõi dùng chung của mọi driver serial. Nó <b>không có prompt</b>, ' +
      'nên bạn sẽ không bao giờ tìm thấy nó trong menu để bật tay. Cách duy nhất nó được bật là bị ' +
      'ký hiệu khác <code>select</code> — và trong riêng file này có <b>72 dòng</b> ' +
      '<code>select SERIAL_CORE</code>, mỗi dòng thuộc một driver serial khác nhau.</p>' +
      '<p>Đó là cách kernel diễn đạt “thư viện nội bộ”: bật driver nào thì lõi tự có, không bật driver ' +
      'nào thì lõi không bị biên dịch vô ích. Người mới thường mất cả buổi tìm một ký hiệu trong ' +
      '<code>menuconfig</code> mà không thấy — lý do gần như luôn là một trong hai: ký hiệu không có ' +
      'prompt, hoặc <code>depends on</code> của nó chưa đúng.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       3. Bốn trạng thái của một ký hiệu trong .config
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Bốn trạng thái của một ký hiệu trong <code>.config</code>' },

    { t: 'p', x:
      'Chạy <code>make ARCH=arm64 defconfig</code> (Thực hành bước 1) sinh ra một file <code>.config</code> ' +
      'dài <b>11 727 dòng</b> ở gốc cây source. Nhìn qua thì nó chỉ là danh sách <code>KHOÁ=giá trị</code>. ' +
      'Nhưng một ký hiệu có thể ở <b>bốn</b> trạng thái khác nhau, và trạng thái thứ tư là thứ hay bị bỏ sót ' +
      'nhất vì nó <i>không hiện ra dưới dạng dòng nào cả</i>.' },

    { t: 'table',
      head: ['Trạng thái', 'Trông như thế nào trong <code>.config</code>', 'Nghĩa là', 'Số dòng thực đo'],
      rows: [
        ['<b>Built-in</b>', '<code>CONFIG_EXT4_FS=y</code>',
         'Biên dịch <b>vào thẳng</b> <code>vmlinux</code>. Có mặt ngay từ giây đầu kernel chạy.', '<b>3 273</b>'],
        ['<b>Module</b>', '<code>CONFIG_BTRFS_FS=m</code>',
         'Biên dịch thành một file <code>.ko</code> rời, chỉ vào kernel khi bạn <code>insmod</code>/<code>modprobe</code>.',
         '<b>1 273</b>'],
        ['<b>Tắt tường minh</b>', '<code># CONFIG_XFS_FS is not set</code>',
         'Ký hiệu <i>có tồn tại</i>, <i>bật được</i>, nhưng đã được quyết định là không bật. Ghi lại dưới dạng ' +
         'chú thích để lần cấu hình sau còn biết là đã hỏi rồi.', '<b>4 950</b>'],
        ['<b>Vắng mặt hoàn toàn</b>', '<i>không có dòng nào</i>',
         'Ký hiệu tồn tại trong file Kconfig nhưng <code>depends on</code> của nó <b>không thể thoả</b> trên ' +
         'kiến trúc/cấu hình này. <code>conf</code> thậm chí không hỏi.', '—']
      ]},

    { t: 'p', x:
      'Toàn bộ 11 727 dòng phân rã đúng như sau, không thừa không thiếu — bạn sẽ tự đếm lại ở Thực hành ' +
      'bước 1: <b>544</b> dòng trống + <b>6 520</b> dòng chú thích (trong đó 4 950 là dòng ' +
      '<code>is not set</code>) + <b>4 663</b> dòng có giá trị = 11 727. Và 4 663 dòng có giá trị chia ra: ' +
      '3 273 <code>=y</code>, 1 273 <code>=m</code>, 24 chuỗi, 91 số thập phân, 2 số hex.' },

    { t: 'cal', kind: 'warn', title: 'Trạng thái thứ tư là nguyên nhân của rất nhiều giờ mất công', x:
      '<p>Khi bạn <code>grep CONFIG_X_Y_Z .config</code> và không thấy gì, có <b>hai</b> khả năng hoàn ' +
      'toàn khác nhau, và chúng đòi hai cách xử lý ngược nhau:</p>' +
      '<ul>' +
      '<li>Ký hiệu <b>bật được nhưng đang tắt</b> → phải có dòng <code># CONFIG_X_Y_Z is not set</code> ' +
      '(dạng chú thích). ' +
      'Nếu <code>grep</code> của bạn chỉ tìm <code>^CONFIG_X_Y_Z=</code> thì bạn đã bỏ sót dòng này. ' +
      'Cách xử lý: bật lên là xong.</li>' +
      '<li>Ký hiệu <b>vắng mặt hoàn toàn</b> → điều kiện <code>depends on</code> chưa thoả. ' +
      'Bật thẳng nó sẽ <b>không có tác dụng</b> — Thực hành bước 4 và bảng “Lỗi thường gặp” cho thấy ' +
      'nó bị <i>lặng lẽ vứt đi</i>. Cách xử lý: đi tìm và bật cái mà nó phụ thuộc, trước.</li>' +
      '</ul>' +
      '<p>Nên phản xạ đúng khi tra một ký hiệu là <code>grep CONFIG_X_Y_Z .config</code> — không neo ' +
      '<code>^</code>, không neo <code>=</code> — để nhìn thấy cả dòng chú thích.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       4. y và m khác nhau ở chỗ nào — nhìn từ phía trình biên dịch
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: '<code>y</code> và <code>m</code> khác nhau ở chỗ nào, thật sự' },

    { t: 'p', x:
      'Định nghĩa sách vở thì ai cũng thuộc: <code>y</code> là vào thẳng kernel, <code>m</code> là thành ' +
      'module rời. Nhưng định nghĩa đó không giải thích được vì sao <code>CONFIG_SERIAL_AMBA_PL011_CONSOLE</code> ' +
      'lại đòi <code>depends on SERIAL_AMBA_PL011=y</code> chứ không chịu <code>=m</code>, và cũng không ' +
      'giải thích được vì sao rất nhiều đoạn mã kernel viết <code>IS_ENABLED(CONFIG_X)</code> thay vì ' +
      '<code>#ifdef CONFIG_X</code>. Câu trả lời nằm ở chỗ mà <b>trình biên dịch</b> nhìn thấy — file ' +
      '<code>include/generated/autoconf.h</code>, sinh ra tự động từ <code>.config</code>:' },

    { t: 'table',
      head: ['Trong <code>.config</code>', 'Trong <code>autoconf.h</code>, thứ gcc thật sự đọc', 'Hệ quả với <code>#ifdef CONFIG_X</code>'],
      rows: [
        ['<code>CONFIG_X=y</code>', '<code>#define CONFIG_X 1</code>', 'Đúng'],
        ['<code>CONFIG_X=m</code>', '<code>#define CONFIG_X_MODULE 1</code> — <b>và không có</b> <code>CONFIG_X</code>',
         '<b>Sai</b> — đây là cái bẫy'],
        ['<code># CONFIG_X is not set</code>', 'không có dòng nào', 'Sai'],
        ['vắng mặt hoàn toàn', 'không có dòng nào', 'Sai']
      ]},

    { t: 'p', x:
      'Hàng thứ hai là toàn bộ vấn đề. Khi một tính năng được chọn là <code>m</code>, ký hiệu ' +
      '<code>CONFIG_X</code> <b>không hề tồn tại</b> với trình biên dịch; chỉ có ' +
      '<code>CONFIG_X_MODULE</code>. Bạn sẽ tự kiểm chứng bằng chính <code>autoconf.h</code> ở Thực hành ' +
      'bước 3. Vì thế kernel có bốn macro chuyên trị, khai báo ở ' +
      '<code>include/linux/kconfig.h</code>:' },

    { t: 'code', where: 'file', name: 'include/linux/kconfig.h — dòng 50, 57, 65, 73', lang: 'c', nocopy: true, code:
      '#define IS_BUILTIN(option) __is_defined(option)\n' +
      '#define IS_MODULE(option) __is_defined(option##_MODULE)\n' +
      '#define IS_REACHABLE(option) __or(IS_BUILTIN(option), \\\n' +
      '\t\t\t\t__and(IS_MODULE(option), __is_defined(MODULE)))\n' +
      '#define IS_ENABLED(option) __or(IS_BUILTIN(option), IS_MODULE(option))' },

    { t: 'table',
      head: ['Macro', 'Đúng khi', 'Dùng khi bạn muốn hỏi'],
      rows: [
        ['<code>IS_BUILTIN(CONFIG_X)</code>', 'chỉ <code>=y</code>', '“Tính năng này có mặt ngay lúc boot không?”'],
        ['<code>IS_MODULE(CONFIG_X)</code>', 'chỉ <code>=m</code>', '“Tính năng này có phải module rời không?”'],
        ['<code>IS_ENABLED(CONFIG_X)</code>', '<code>=y</code> <b>hoặc</b> <code>=m</code>',
         '“Tính năng này có được bật, kiểu nào cũng được?” — <b>đây là cái bạn muốn 90 % số lần</b>'],
        ['<code>IS_REACHABLE(CONFIG_X)</code>', '<code>=y</code>, hoặc <code>=m</code> khi mã đang gọi cũng là module',
         '“Từ chỗ tôi đứng, tôi có <i>gọi được</i> vào nó không?”']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao console driver bắt buộc phải là y', x:
      '<p>Giờ dòng <code>depends on SERIAL_AMBA_PL011=y</code> ở <b>Bài 38</b> mới có nghĩa. Console là ' +
      'thứ in ra <i>những dòng đầu tiên</i> của kernel — trước khi có rootfs, trước khi có tiến trình ' +
      'người dùng, nên trước khi bất kỳ module nào được nạp. Một console nằm trong file <code>.ko</code> ' +
      'là một console câm ở đúng lúc bạn cần nó nhất: lúc kernel treo trước khi mount được rootfs.</p>' +
      '<p>Vì thế Kconfig không viết <code>depends on SERIAL_AMBA_PL011</code> (đúng với cả ' +
      '<code>m</code>) mà viết hẳn <code>=y</code>. Đây là <b>nguyên lý chung</b> đáng nhớ: ' +
      '<b>bất cứ thứ gì cần thiết để tới được thời điểm nạp module thì bản thân nó không thể là module</b> ' +
      '— console, driver của ổ đĩa chứa rootfs, hệ thống file của rootfs. Nguyên lý này sẽ quay lại ' +
      'nguyên vẹn ở <b>Chặng 09</b> khi bạn dựng rootfs, và ở <b>Chặng 10</b> khi bạn viết module.</p>' },

    { t: 'p', x:
      'Ba lựa chọn <code>y</code> / <code>m</code> / <code>n</code> khác nhau ở bốn mặt cùng lúc. Sơ đồ ' +
      'dưới gom cả bốn mặt vào một chỗ để đối chiếu:' },

    { t: 'fig',
      cap: 'y, m và n khác nhau không chỉ ở "có hay không", mà ở cả tên macro mà gcc nhìn thấy — đó là lý do ' +
           'phải dùng IS_ENABLED() thay cho #ifdef.',
      svg:
        '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Bảng so sánh ba lựa chọn y, m và n của một ký hiệu tristate trên bốn tiêu chí">' +

        '<text class="d-ts" x="10" y="20">Cùng một ký hiệu tristate, ba lựa chọn</text>' +

        '<rect class="d-box-g" x="10" y="30" width="228" height="228" rx="6"/>' +
        '<text class="d-t" x="26" y="52">y — built-in</text>' +
        '<text class="d-ts" x="26" y="78">Nằm trong:</text>' +
        '<text class="d-tm" x="26" y="95">vmlinux</text>' +
        '<text class="d-ts" x="26" y="121">gcc nhìn thấy:</text>' +
        '<text class="d-tm" x="26" y="138">#define CONFIG_X 1</text>' +
        '<text class="d-ts" x="26" y="164">Có mặt lúc:</text>' +
        '<text class="d-ts" x="26" y="181">ngay giây đầu kernel chạy</text>' +
        '<text class="d-ts" x="26" y="207">Đổi ý phải:</text>' +
        '<text class="d-ts" x="26" y="224">build lại kernel, boot lại</text>' +
        '<text class="d-ts" x="26" y="248">3 273 ký hiệu trong defconfig</text>' +

        '<rect class="d-box-a" x="246" y="30" width="228" height="228" rx="6"/>' +
        '<text class="d-t" x="262" y="52">m — module</text>' +
        '<text class="d-ts" x="262" y="78">Nằm trong:</text>' +
        '<text class="d-tm" x="262" y="95">một file .ko rời</text>' +
        '<text class="d-ts" x="262" y="121">gcc nhìn thấy:</text>' +
        '<text class="d-tm" x="262" y="138">#define CONFIG_X_MODULE 1</text>' +
        '<text class="d-ts" x="262" y="155">(không có CONFIG_X)</text>' +
        '<text class="d-ts" x="262" y="181">chỉ khi insmod / modprobe</text>' +
        '<text class="d-ts" x="262" y="207">Đổi ý phải:</text>' +
        '<text class="d-ts" x="262" y="224">rmmod rồi insmod — không boot lại</text>' +
        '<text class="d-ts" x="262" y="248">1 273 ký hiệu trong defconfig</text>' +

        '<rect class="d-box" x="482" y="30" width="228" height="228" rx="6"/>' +
        '<text class="d-t" x="498" y="52">n — tắt</text>' +
        '<text class="d-ts" x="498" y="78">Nằm trong:</text>' +
        '<text class="d-ts" x="498" y="95">không đâu cả</text>' +
        '<text class="d-ts" x="498" y="121">gcc nhìn thấy:</text>' +
        '<text class="d-ts" x="498" y="138">không gì cả</text>' +
        '<text class="d-ts" x="498" y="164">Trong .config:</text>' +
        '<text class="d-tm" x="498" y="181"># CONFIG_X is not set</text>' +
        '<text class="d-ts" x="498" y="207">Đổi ý phải:</text>' +
        '<text class="d-ts" x="498" y="224">cấu hình lại + build lại</text>' +
        '<text class="d-ts" x="498" y="248">4 950 ký hiệu trong defconfig</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Con số cho thấy đây không phải chuyện lý thuyết', x:
      '<p>Trong cây 6.18.45, macro <code>IS_ENABLED(</code> xuất hiện <b>9 334 lần</b> ở <b>3 587 file</b>. ' +
      'Nó tồn tại chính xác vì <code>#ifdef CONFIG_X</code> âm thầm sai khi <code>X=m</code> — một loại lỗi ' +
      'không có thông báo, không có cảnh báo build, chỉ có “tính năng không chạy” khi người dùng chọn ' +
      'module. Bạn sẽ tự nhìn thấy bằng chứng ở Thực hành bước 3.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       5. Từ .config tới file .o
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Từ <code>.config</code> tới file <code>.o</code>: ba file sinh ra' },

    { t: 'p', x:
      'Bản thân <code>.config</code> không được Makefile nào đọc trực tiếp, và không được gcc đọc bao ' +
      'giờ. Nó là <b>đầu vào</b> của một bước dịch nữa, tên là <code>syncconfig</code>, chạy tự động ở đầu ' +
      'mỗi lần <code>make</code>. Bước này sinh ra ba file, và mỗi file phục vụ một khách hàng khác nhau:' },

    { t: 'table',
      head: ['File sinh ra', 'Kích thước thực đo', 'Ai đọc', 'Để làm gì'],
      rows: [
        ['<code>include/config/auto.conf</code>', '118 292 byte', '<b>make</b> (Kbuild)',
         'Được <code>include</code> vào Makefile gốc, biến mỗi ký hiệu thành một biến make — đó chính là ' +
         'nguồn của <code>$(CONFIG_SERIAL_AMBA_PL011)</code> trong <code>obj-$(...)</code>'],
        ['<code>include/generated/autoconf.h</code>', '164 560 byte', '<b>gcc</b>',
         '<b>4 663</b> dòng <code>#define</code>, được ép nạp vào <i>mọi</i> file <code>.c</code> của kernel'],
        ['<code>include/config/auto.conf.cmd</code>', '55 963 byte', '<b>make</b>',
         'Bảng phụ thuộc: file <code>.c</code> nào phải biên dịch lại khi ký hiệu nào đổi giá trị']
      ]},

    { t: 'p', x:
      'Mối nối giữa <code>auto.conf</code> và Makefile nằm ngay trong Makefile gốc của kernel, dòng 798 — ' +
      'một dòng <code>include</code> duy nhất là đủ để 4 663 ký hiệu trở thành biến make:' },

    { t: 'code', where: 'file', name: 'Makefile — dòng 798', lang: 'make', nocopy: true, code:
      'include $(objtree)/include/config/auto.conf' },

    { t: 'cal', kind: 'why', title: 'Đây là mảnh ghép còn thiếu của Bài 38', x:
      '<p><b>Bài 38</b> kết thúc ở chỗ: dòng <code>obj-$(CONFIG_SERIAL_AMBA_PL011) += amba-pl011.o</code> ' +
      'quyết định file có được biên dịch hay không, nhưng biến <code>CONFIG_SERIAL_AMBA_PL011</code> ' +
      '“ở đâu ra” thì chưa trả lời được. Giờ thì trả lời được, và chuỗi đó chỉ có bốn mắt xích:</p>' +
      '<ul>' +
      '<li>Bạn chọn <code>y</code> trong <code>menuconfig</code></li>' +
      '<li><code>conf</code> ghi <code>CONFIG_SERIAL_AMBA_PL011=y</code> vào <code>.config</code></li>' +
      '<li><code>syncconfig</code> chép nó sang <code>include/config/auto.conf</code></li>' +
      '<li>Makefile gốc <code>include</code> file đó, nên <code>$(CONFIG_SERIAL_AMBA_PL011)</code> ' +
      'giãn ra thành <code>y</code>, và <code>obj-y += amba-pl011.o</code> đưa file vào bản build</li>' +
      '</ul>' +
      '<p>Nếu bạn chọn <code>m</code> thì mắt xích cuối thành <code>obj-m</code> — cùng file nguồn, ' +
      'khác đích đến. Nếu ký hiệu vắng mặt thì biến rỗng, dòng thành <code>obj-</code>, và như ' +
      '<b>Bài 38</b> đã chỉ ra, make <b>không báo lỗi</b>: file chỉ đơn giản không bao giờ được biên dịch.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       6. Các cửa vào: bộ target cấu hình
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Các cửa vào: bộ target cấu hình' },

    { t: 'p', x:
      'Kernel không có một cách cấu hình mà có hơn hai chục cách, vì có hơn hai chục tình huống. ' +
      'Danh sách đầy đủ luôn nằm trong tầm tay, không cần thuộc lòng:' },

    { t: 'code', where: 'wsl', code: 'make ARCH=arm64 help' },

    { t: 'code', where: 'out', nocopy: true,
      name: 'trích phần “Configuration targets” — kernel 6.18.45',
      notes: ['Đây là 24 dòng đầu của một danh sách dài hơn nhiều. Nhớ vị trí của lệnh này ' +
             '(<code>make ARCH=... help</code>) thì hữu ích hơn nhớ tên từng target.'],
      code:
      'Configuration targets:\n' +
      '  config\t  - Update current config utilising a line-oriented program\n' +
      '  nconfig         - Update current config utilising a ncurses menu based program\n' +
      '  menuconfig\t  - Update current config utilising a menu based program\n' +
      '  xconfig\t  - Update current config utilising a Qt based front-end\n' +
      '  gconfig\t  - Update current config utilising a GTK+ based front-end\n' +
      '  oldconfig\t  - Update current config utilising a provided .config as base\n' +
      '  localmodconfig  - Update current config disabling modules not loaded\n' +
      '                    except those preserved by LMC_KEEP environment variable\n' +
      '  localyesconfig  - Update current config converting local mods to core\n' +
      '                    except those preserved by LMC_KEEP environment variable\n' +
      '  defconfig\t  - New config with default from ARCH supplied defconfig\n' +
      '  savedefconfig   - Save current config as ./defconfig (minimal config)\n' +
      '  allnoconfig\t  - New config where all options are answered with no\n' +
      '  allyesconfig\t  - New config where all options are accepted with yes\n' +
      '  allmodconfig\t  - New config selecting modules when possible\n' +
      '  alldefconfig    - New config with all symbols set to default\n' +
      '  randconfig\t  - New config with random answer to all options\n' +
      '  yes2modconfig\t  - Change answers from yes to mod if possible\n' +
      '  mod2yesconfig\t  - Change answers from mod to yes if possible\n' +
      '  mod2noconfig\t  - Change answers from mod to no if possible\n' +
      '  listnewconfig   - List new options\n' +
      '  helpnewconfig   - List new options and help text\n' +
      '  olddefconfig\t  - Same as oldconfig but sets new symbols to their\n' +
      '                    default value without prompting\n' +
      '  tinyconfig\t  - Configure the tiniest possible kernel\n' +
      '  testconfig\t  - Run Kconfig unit tests (requires python3 and pytest)' },

    { t: 'p', x:
      'Danh sách trên trả lời câu “có những gì”, nhưng không trả lời câu quan trọng hơn: ' +
      '<b>khi nào dùng cái nào</b>. Bảng dưới là sáu target bạn thật sự dùng trong công việc hằng ngày, ' +
      'xếp theo tình huống:' },

    { t: 'table',
      head: ['Tình huống bạn đang ở', 'Target', 'Nó làm gì'],
      rows: [
        ['Cây source sạch, chưa có <code>.config</code> nào', '<code>defconfig</code>',
         'Chép <code>arch/arm64/configs/defconfig</code> (1 824 dòng) rồi giãn nó ra thành <code>.config</code> đầy đủ 11 727 dòng'],
        ['Đã có <code>.config</code>, muốn sửa vài lựa chọn bằng tay', '<code>menuconfig</code>',
         'Giao diện ncurses có menu, trợ giúp <kbd>?</kbd> và tìm kiếm <kbd>/</kbd>'],
        ['Sửa một ký hiệu trong script, không có bàn phím người', '<code>scripts/config</code>',
         'Không phải target make mà là một script shell; sửa thẳng file rồi phải chạy <code>olddefconfig</code> để hợp thức hoá'],
        ['Vừa nâng kernel lên bản mới, mang <code>.config</code> cũ sang', '<code>olddefconfig</code>',
         'Giữ nguyên mọi lựa chọn cũ còn hợp lệ, mọi ký hiệu <b>mới</b> lấy giá trị mặc định, <b>không hỏi gì</b>'],
        ['Cũng tình huống đó, nhưng muốn biết có gì mới', '<code>listnewconfig</code>',
         'Chỉ <b>in ra</b> danh sách ký hiệu mới rồi dừng — không sửa <code>.config</code>'],
        ['Muốn lưu cấu hình vào git', '<code>savedefconfig</code>',
         'Rút 11 727 dòng còn <b>1 755 dòng</b> tối thiểu, ghi ra <code>./defconfig</code>']
      ]},

    { t: 'cal', kind: 'warn', title: '<code>oldconfig</code> và <code>olddefconfig</code> khác nhau đúng một chữ — và một chữ đó rất đắt', x:
      '<p>Cả hai làm cùng một việc: cập nhật một <code>.config</code> cũ cho khớp cây source hiện tại. ' +
      'Khác biệt duy nhất là <b>ai trả lời các ký hiệu mới</b>.</p>' +
      '<ul>' +
      '<li><code>oldconfig</code> <b>hỏi bạn từng cái một</b>, ngay trên terminal, không thể quay lại. ' +
      'Với một bản nâng kernel lớn thì đó có thể là hàng trăm câu hỏi.</li>' +
      '<li><code>olddefconfig</code> <b>tự trả lời</b> bằng giá trị mặc định của Kconfig và im lặng.</li>' +
      '</ul>' +
      '<p>Trong script tự động thì <code>olddefconfig</code> là lựa chọn duy nhất đúng — ' +
      '<code>oldconfig</code> sẽ treo chờ bàn phím. Nhưng “im lặng” cũng có giá của nó: một tính năng ' +
      'quan trọng có thể bị đặt mặc định <code>n</code> mà bạn không hề biết. Cách làm an toàn là chạy ' +
      '<code>listnewconfig</code> <b>trước</b> để đọc danh sách, rồi mới chạy <code>olddefconfig</code>. ' +
      'Thực hành bước 6 làm đúng quy trình đó trên một tình huống thật.</p>' },

    { t: 'h3', x: 'Đọc màn hình <code>menuconfig</code>' },

    { t: 'p', x:
      '<code>menuconfig</code> chỉ là một lớp vỏ ncurses bọc quanh cùng một trình thông dịch ' +
      '<code>conf</code>. Điều đáng học ở nó không phải cách bấm phím mà là <b>bộ ký hiệu đánh dấu</b> ở ' +
      'đầu mỗi dòng: chúng nói cho bạn biết một lựa chọn đang ở trạng thái nào <i>và</i> bạn có quyền đổi ' +
      'nó hay không. Chính màn hình đầu tiên đã in sẵn phần chú giải:' },

    { t: 'code', where: 'out', nocopy: true,
      name: 'màn hình đầu tiên của make ARCH=arm64 menuconfig',
      notes: ['Đây là <b>nội dung chữ</b> của một lần chạy thật, đã lược bỏ khung vẽ và màu của ncurses vì ' +
             'chúng không sao chép được sang trang này. Trên terminal của bạn nội dung này nằm trong một ' +
             'khung kép có tiêu đề; danh sách mục có thể dài hơn hoặc ngắn hơn tuỳ chiều cao cửa sổ — ' +
             'bản chụp này lấy ở cửa sổ 110 cột.'],
      code:
      'Linux/arm64 6.18.45 Kernel Configuration\n' +
      '\n' +
      '  Arrow keys navigate the menu.  <Enter> selects submenus ---> (or empty submenus ----).\n' +
      '  Highlighted letters are hotkeys.  Pressing <Y> includes, <N> excludes, <M> modularizes\n' +
      '  features.  Press <Esc><Esc> to exit, <?> for Help, </> for Search.\n' +
      '  Legend: [*] built-in  [ ] excluded  <M> module  < > module capable\n' +
      '\n' +
      '        General setup  --->\n' +
      '        Platform selection  --->\n' +
      '        Kernel Features  --->\n' +
      '        Boot options  --->\n' +
      '        Power management options  --->\n' +
      '        CPU Power Management  --->\n' +
      '    [*] ACPI (Advanced Configuration and Power Interface) Support  --->\n' +
      '    [*] Virtualization  --->\n' +
      '        General architecture-dependent options  --->\n' +
      '    [*] Enable loadable module support  --->\n' +
      '    -*- Enable the block layer  --->\n' +
      '        Executable file formats  --->\n' +
      '        Memory Management options  --->\n' +
      '    [*] Networking support  --->\n' +
      '        Device Drivers  --->\n' +
      '        File systems  --->\n' +
      '        Security options  --->\n' +
      '    -*- Cryptographic API  --->\n' +
      '        Library routines  --->\n' +
      '        Kernel hacking  --->\n' +
      '\n' +
      '        <Select>    < Exit >    < Help >    < Save >    < Load >' },

    { t: 'p', x:
      'Phần chú giải in sẵn liệt kê bốn ký hiệu, nhưng trên màn hình có <b>năm</b>. Cái thứ năm — ' +
      '<code>-*-</code>, thấy ở <i>Enable the block layer</i> và <i>Cryptographic API</i> — không nằm ' +
      'trong chú giải, và nó chính là cái hay làm người mới bối rối nhất:' },

    { t: 'table',
      head: ['Ký hiệu', 'Nghĩa', 'Bạn bấm <kbd>y</kbd>/<kbd>n</kbd> được không?'],
      rows: [
        ['<code>[*]</code>', 'Ký hiệu <code>bool</code>, đang bật (<code>=y</code>)', 'Được'],
        ['<code>[ ]</code>', 'Ký hiệu <code>bool</code>, đang tắt', 'Được'],
        ['<code>&lt;*&gt;</code> <code>&lt;M&gt;</code> <code>&lt; &gt;</code>',
         'Ký hiệu <code>tristate</code>, lần lượt đang là <code>y</code> / <code>m</code> / <code>n</code>',
         'Được — <kbd>y</kbd>, <kbd>m</kbd> hoặc <kbd>n</kbd>'],
        ['<code>-*-</code>', 'Đang bật <b>nhưng bạn không có quyền đổi</b> — vì bị ký hiệu khác ' +
         '<code>select</code> lên <code>y</code>, hoặc vì prompt của nó không hiện trong cấu hình hiện tại',
         '<b>Không.</b> Bấm <kbd>n</kbd> sẽ không có gì xảy ra'],
        ['<code>{M}</code>', 'Bị ký hiệu khác <code>select</code> lên mức <code>m</code>',
         'Nửa vời: <b>không hạ xuống <code>n</code> được</b>, nhưng nâng lên <code>y</code> thì được']
      ]},

    { t: 'p', x:
      'Dấu <code>-*-</code> ở <i>Enable the block layer</i> có nguồn gốc rất cụ thể, đọc được ngay trong ' +
      'file Kconfig của nó:' },

    { t: 'code', where: 'file', name: 'block/Kconfig — dòng 5', lang: 'text', nocopy: true, code:
      'menuconfig BLOCK\n' +
      '       bool "Enable the block layer" if EXPERT\n' +
      '       default y\n' +
      '       select FS_IOMAP\n' +
      '       select SBITMAP' },

    { t: 'cal', kind: 'info', title: 'Mệnh đề <code>if EXPERT</code> giải thích dấu <code>-*-</code>', x:
      '<p>Chú ý: <code>if EXPERT</code> gắn vào <b>prompt</b>, không gắn vào ký hiệu. Nghĩa là ' +
      '<code>BLOCK</code> vẫn tồn tại và vẫn <code>default y</code>, nhưng <b>prompt của nó chỉ hiện khi ' +
      '<code>CONFIG_EXPERT</code> bật</b>. Với cấu hình mặc định, <code>EXPERT</code> tắt, nên bạn thấy ' +
      'mục đó nhưng không đổi được — đúng như dấu <code>-*-</code> báo.</p>' +
      '<p>Đây là cách kernel tự bảo vệ khỏi những lựa chọn có thể phá hỏng hệ thống trong tay người ' +
      'chưa quen: không giấu chúng đi, mà khoá lại sau một ký hiệu tên thẳng thừng là “EXPERT”. ' +
      '<code>Cryptographic API</code> hiện <code>-*-</code> vì lý do khác — nó bị hàng loạt ký hiệu ' +
      'khác <code>select</code>.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       7. Mang một cấu hình sang kernel phiên bản khác
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Mang một cấu hình sang kernel phiên bản khác' },

    { t: 'p', x:
      'Đây là công việc thật sự của kỹ sư embedded, lặp lại mỗi lần nâng kernel: bạn có một cấu hình đã ' +
      'chạy tốt cho board của mình, và một cây source phiên bản mới hơn. Câu hỏi đầu tiên nghe rất tầm ' +
      'thường nhưng lại là chỗ hầu hết người mới làm sai: <b>lưu file nào vào git?</b>' },

    { t: 'table',
      head: ['', '<code>.config</code>', '<code>./defconfig</code> (do <code>savedefconfig</code> sinh)'],
      rows: [
        ['Số dòng thực đo', '11 727', '<b>1 755</b>'],
        ['Kích thước', '314 649 byte', '<b>42 448 byte</b> — nhỏ hơn <b>7,4 lần</b>'],
        ['Chứa gì', 'Mọi ký hiệu, kể cả 4 950 dòng <code>is not set</code> và mọi giá trị bằng mặc định',
         'Chỉ những lựa chọn <b>khác mặc định</b> — phần “bạn đã quyết định gì”'],
        ['Khi kernel lên phiên bản mới', 'Đầy ký hiệu đã bị xoá và thiếu ký hiệu mới; ' +
         '<code>diff</code> giữa hai phiên bản không đọc nổi',
         'Vẫn dùng được gần như nguyên vẹn; <code>diff</code> ngắn và đọc được'],
        ['Nên đưa vào git?', '<b>Không</b>', '<b>Có</b> — đây là thứ mọi board trong <code>arch/arm64/configs/</code> lưu']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao cấu hình tối thiểu lại “bền” hơn qua các phiên bản', x:
      '<p><code>.config</code> ghi lại <b>kết quả</b>; <code>defconfig</code> ghi lại <b>quyết định</b>. ' +
      'Khi cây source đổi, kết quả cũ trở nên vô nghĩa nhưng quyết định thì vẫn còn giá trị.</p>' +
      '<p>Ví dụ cụ thể: <code>.config</code> chứa dòng <code>CONFIG_GCC_VERSION=150200</code>, đo từ gcc ' +
      'trên <i>máy bạn</i> lúc <i>đó</i>. Đưa dòng đó vào git là đưa một sự thật đã hết hạn vào lịch sử. ' +
      '<code>savedefconfig</code> loại nó ra, vì nó không phải quyết định của ai cả — nó là thứ ' +
      '<code>conf</code> tự đo lại được mỗi lần chạy.</p>' +
      '<p>Đây là lý do <code>arch/arm64/configs/defconfig</code> chỉ có 1 824 dòng mà mô tả được một ' +
      'kernel 11 727 dòng cấu hình. Toàn bộ <code>arch/*/configs/</code> của kernel hoạt động theo đúng ' +
      'nguyên tắc này, và board của bạn nên theo.</p>' },

    { t: 'p', x:
      'Quy trình đầy đủ khi nâng kernel gồm bốn bước, và thứ tự của chúng có lý do. Bạn sẽ chạy đúng quy ' +
      'trình này ở Thực hành bước 6:' },

    { t: 'fig',
      cap: 'Quy trình nâng kernel. Bước listnewconfig là bước duy nhất không sửa gì — và cũng là bước ' +
           'duy nhất cho bạn cơ hội phát hiện một tính năng sắp bị tắt mặc định.',
      svg:
        '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Sơ đồ bốn bước mang một cấu hình kernel cũ sang cây source phiên bản mới">' +

        '<rect class="d-box-a" x="10" y="14" width="200" height="44" rx="6"/>' +
        '<text class="d-t" x="26" y="34">defconfig của board</text>' +
        '<text class="d-ts" x="26" y="51">1 755 dòng, nằm trong git</text>' +

        '<line class="d-line" x1="210" y1="36" x2="250" y2="36"/>' +
        '<path class="d-arrow" d="M 254 36 l -10 -5 l 0 10 z"/>' +

        '<rect class="d-box" x="254" y="14" width="200" height="44" rx="6"/>' +
        '<text class="d-t" x="270" y="34">cây source mới</text>' +
        '<text class="d-ts" x="270" y="51">cp defconfig .config</text>' +

        '<text class="d-ts" x="480" y="40">bước 0 — chuẩn bị</text>' +

        '<line class="d-line" x1="354" y1="58" x2="354" y2="74"/>' +
        '<path class="d-arrow" d="M 354 78 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-p" x="10" y="78" width="444" height="44" rx="6"/>' +
        '<text class="d-t" x="26" y="98">make ARCH=arm64 listnewconfig</text>' +
        '<text class="d-ts" x="26" y="115">chỉ IN RA ký hiệu mới — không sửa file nào</text>' +
        '<text class="d-ts" x="480" y="98">bước 1 — đọc trước</text>' +
        '<text class="d-ts" x="480" y="115">bỏ qua bước này là mù</text>' +

        '<line class="d-line" x1="354" y1="122" x2="354" y2="138"/>' +
        '<path class="d-arrow" d="M 354 142 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box" x="10" y="142" width="444" height="44" rx="6"/>' +
        '<text class="d-t" x="26" y="162">make ARCH=arm64 olddefconfig</text>' +
        '<text class="d-ts" x="26" y="179">ký hiệu mới nhận giá trị mặc định, im lặng</text>' +
        '<text class="d-ts" x="480" y="162">bước 2 — hợp thức hoá</text>' +
        '<text class="d-ts" x="480" y="179">(hoặc menuconfig nếu cần sửa)</text>' +

        '<line class="d-line" x1="354" y1="186" x2="354" y2="202"/>' +
        '<path class="d-arrow" d="M 354 206 l -5 -10 l 10 0 z"/>' +

        '<rect class="d-box-g" x="10" y="206" width="444" height="44" rx="6"/>' +
        '<text class="d-t" x="26" y="226">make ARCH=arm64 savedefconfig</text>' +
        '<text class="d-ts" x="26" y="243">rút gọn lại còn ./defconfig để commit</text>' +
        '<text class="d-ts" x="480" y="226">bước 3 — cất đi</text>' +
        '<text class="d-ts" x="480" y="243">commit ./defconfig, không commit .config</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: cấu hình một kernel ARM64 từ đầu' },

    { t: 'p', x:
      'Toàn bộ phần này chạy trong cây source bạn đã giải nén ở <b>Bài 38</b>, tại ' +
      '<code>~/bai38/linux-6.18.45</code>. Không có bước nào build kernel — cấu hình và biên dịch là hai ' +
      'việc tách rời, và bài này chỉ làm việc thứ nhất. Việc thứ hai là <b>Bài 40</b>.' },

    { t: 'cal', kind: 'warn', title: 'Luôn có <code>ARCH=arm64</code> trong mọi lệnh', x:
      '<p>Máy bạn là x86_64. Nếu quên <code>ARCH=arm64</code>, Kbuild <b>không báo lỗi</b> — nó lặng lẽ ' +
      'cấu hình một kernel x86 và bạn có thể mất hàng giờ mới nhận ra. Bảng “Lỗi thường gặp” cho thấy ' +
      'chính xác triệu chứng. Cách phòng: gõ <code>ARCH=arm64</code> thành thói quen, ngay sau chữ ' +
      '<code>make</code>, mọi lần, kể cả với <code>make help</code>.</p>' },

    { t: 'steps', items: [

      /* ---------------------------------------------------------------- */
      { title: 'Sinh <code>.config</code> đầu tiên và đếm nó',
        blocks: [

          { t: 'p', x:
            'Cây source vừa giải nén <b>không có</b> <code>.config</code> — bạn có thể tự kiểm bằng ' +
            '<code>ls -a</code>. Target <code>defconfig</code> tạo nó ra, bằng cách lấy file cấu hình tối ' +
            'thiểu mà cộng đồng ARM64 duy trì sẵn (<code>arch/arm64/configs/defconfig</code>) rồi giãn ' +
            'nó thành một cấu hình đầy đủ. Dùng <code>time</code> để có luôn con số so sánh với những ' +
            'lệnh nặng hơn ở Bài 40.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'time make ARCH=arm64 defconfig' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Ba con số thời gian sẽ khác trên máy bạn. Mười ba dòng <code>HOSTCC</code>/' +
                   '<code>LEX</code>/<code>YACC</code>/<code>HOSTLD</code> chỉ xuất hiện ở <b>lần chạy ' +
                   'đầu tiên</b>; chạy lại lần thứ hai, chúng biến mất và dòng cuối đổi thành ' +
                   '<code># No change to .config</code>.'],
            code:
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
            '*** Default configuration is based on \'defconfig\'\n' +
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '\n' +
            'real\t0m5.964s\n' +
            'user\t0m3.369s\n' +
            'sys\t0m0.987s' },

          { t: 'cal', kind: 'why', title: 'Mười ba dòng đầu là bằng chứng cho cả bài lý thuyết', x:
            '<p>Trước khi cấu hình được bất cứ thứ gì, kernel phải <b>tự biên dịch lấy công cụ cấu hình ' +
            'của chính nó</b>: <code>scripts/kconfig/conf</code>. Chú ý hai dòng <code>LEX</code> và ' +
            '<code>YACC</code> — đó là bộ sinh trình phân tích cú pháp. Chúng ở đó vì Kconfig ' +
            '<b>là một ngôn ngữ thật</b>, có từ vựng và ngữ pháp riêng, cần trình biên dịch riêng, ' +
            'chứ không phải một định dạng file <code>khoá=giá trị</code>.</p>' +
            '<p><code>HOSTCC</code> nghĩa là “biên dịch cho <i>máy chủ</i>” — <code>conf</code> chạy trên ' +
            'x86_64 của bạn, không phải trên ARM64. Đó là phân biệt <i>host</i> / <i>target</i> mà bạn đã ' +
            'gặp ở <b>Chặng 04</b>, giờ xuất hiện lại ngay trong hệ thống build của kernel.</p>' +
            '<p>Còn dòng <code>*** Default configuration is based on \'defconfig\'</code> nói cho bạn ' +
            'biết nó lấy khuôn từ đâu: file <code>arch/arm64/configs/defconfig</code>. Đổi ' +
            '<code>ARCH=</code> là đổi luôn file khuôn — đó là lý do quên <code>ARCH=arm64</code> lại ' +
            'nguy hiểm đến thế.</p>' },

          { t: 'p', x:
            'So sánh kích thước của khuôn và của kết quả. Đây là con số quan trọng nhất của bước này:' },

          { t: 'code', where: 'wsl', code: 'wc -l arch/arm64/configs/defconfig .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  1824 arch/arm64/configs/defconfig\n' +
            ' 11727 .config\n' +
            ' 13551 total' },

          { t: 'cal', kind: 'info', title: '1 824 dòng vào, 11 727 dòng ra', x:
            '<p><code>conf</code> đã <b>tính thêm 9 903 dòng</b> mà không ai gõ. Chúng đến từ ba nguồn: ' +
            'giá trị <code>default</code> khai báo trong các file Kconfig, các ký hiệu bị ' +
            '<code>select</code> kéo theo, và 4 950 dòng <code># … is not set</code> ghi lại những gì đã ' +
            'được cân nhắc rồi bỏ.</p>' +
            '<p>Tỉ lệ 1 : 6,4 này chính là toàn bộ lý do <code>savedefconfig</code> tồn tại, và lý do bạn ' +
            'commit file 1 824 dòng chứ không commit file 11 727 dòng.</p>' },

          { t: 'p', x:
            'Giờ nhìn vào đầu file. Mười hai dòng đầu đã cho thấy ba trong bốn trạng thái và cả ba kiểu ' +
            'giá trị không phải <code>y</code>/<code>m</code>:' },

          { t: 'code', where: 'wsl', code: 'head -12 .config' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Dòng <code>CONFIG_CC_VERSION_TEXT</code> và <code>CONFIG_GCC_VERSION</code> ' +
                   '<b>sẽ khác trên máy bạn</b> — chúng là phiên bản gcc thật của máy đang chạy, không ' +
                   'phải lựa chọn của ai. Các dòng còn lại thì giống nhau.'],
            code:
            '#\n' +
            '# Automatically generated file; DO NOT EDIT.\n' +
            '# Linux/arm64 6.18.45 Kernel Configuration\n' +
            '#\n' +
            'CONFIG_CC_VERSION_TEXT="gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0"\n' +
            'CONFIG_CC_IS_GCC=y\n' +
            'CONFIG_GCC_VERSION=150200\n' +
            'CONFIG_CLANG_VERSION=0\n' +
            'CONFIG_AS_IS_GNU=y\n' +
            'CONFIG_AS_VERSION=24600\n' +
            'CONFIG_LD_IS_BFD=y\n' +
            'CONFIG_LD_VERSION=24600' },

          { t: 'cal', kind: 'info', title: 'Đọc kỹ dòng 2 và dòng 3', x:
            '<p>Dòng 2, <code>Automatically generated file; DO NOT EDIT.</code>, là lời cảnh báo mà bài ' +
            'này đã giải thích lý do: file là <b>kết quả tính toán</b>, sửa tay thì lần chạy ' +
            '<code>conf</code> tiếp theo sẽ tính lại và có thể ghi đè.</p>' +
            '<p>Dòng 3, <code>Linux/arm64 6.18.45</code>, là <b>cách kiểm tra nhanh nhất</b> xem bạn có ' +
            'quên <code>ARCH=arm64</code> hay không. Nếu ở đó ghi <code>Linux/x86</code> thì mọi thứ bạn ' +
            'làm tiếp theo đều sai kiến trúc. Hãy tập phản xạ <code>head -3 .config</code> mỗi khi nghi ngờ ' +
            '— rẻ hơn nhiều so với phát hiện ra sau khi build xong.</p>' +
            '<p>Còn <code>CONFIG_CLANG_VERSION=0</code> minh hoạ đúng kiểu <code>int</code> trong bảng ở ' +
            'phần lý thuyết: giá trị <code>0</code> ở đây nghĩa là “không dùng clang”, chứ không phải ' +
            '“tắt”. Ký hiệu kiểu <code>int</code> không có khái niệm bật/tắt.</p>' },

          { t: 'p', x:
            'Cuối cùng, đếm cả file để tự kiểm lại bảng bốn trạng thái ở phần lý thuyết. Bảy dòng ' +
            '<code>printf</code> dưới đây chỉ gói các lệnh <code>grep -c</code> lại cho dễ đọc — ' +
            'kỹ thuật <code>$(…)</code> lồng lệnh bạn đã dùng từ <b>Bài 10</b>:' },

          { t: 'code', where: 'wsl', code:
            'printf \'total lines     : %s\\n\' "$(wc -l < .config)"\n' +
            'printf \'blank lines     : %s\\n\' "$(grep -c \'^$\' .config)"\n' +
            'printf \'comment lines   : %s\\n\' "$(grep -c \'^#\' .config)"\n' +
            'printf \'  is not set    : %s\\n\' "$(grep -cE \'^# CONFIG_[A-Za-z0-9_]+ is not set$\' .config)"\n' +
            'printf \'value lines     : %s\\n\' "$(grep -cE \'^CONFIG_[A-Za-z0-9_]+=\' .config)"\n' +
            'printf \'  ... =y        : %s\\n\' "$(grep -cE \'^CONFIG_[A-Za-z0-9_]+=y$\' .config)"\n' +
            'printf \'  ... =m        : %s\\n\' "$(grep -cE \'^CONFIG_[A-Za-z0-9_]+=m$\' .config)"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'total lines     : 11727\n' +
            'blank lines     : 544\n' +
            'comment lines   : 6520\n' +
            '  is not set    : 4950\n' +
            'value lines     : 4663\n' +
            '  ... =y        : 3273\n' +
            '  ... =m        : 1273' },

          { t: 'cmdx', title: 'Vì sao mẫu tìm kiếm phải viết chặt như vậy',
            cmd: 'grep -cE \'^CONFIG_[A-Za-z0-9_]+=y$\' .config',
            rows: [
              ['<code>-c</code>', 'Đếm số dòng khớp thay vì in ra chúng.'],
              ['<code>-E</code>', 'Bật biểu thức chính quy mở rộng, để dùng được <code>+</code> mà không phải viết <code>\\+</code>.'],
              ['<code>^</code>', 'Neo đầu dòng. Thiếu nó thì các dòng <code># CONFIG_… is not set</code> cũng lọt vào.'],
              ['<code>[A-Za-z0-9_]+</code>', 'Tên ký hiệu. <b>Phải có cả chữ thường</b>: trong cây này có 5 ký hiệu chứa chữ thường. Viết <code>[A-Z0-9_]</code> là bỏ sót đúng 5 dòng, và tổng sẽ không khớp.'],
              ['<code>=y$</code>', 'Neo cuối dòng. Thiếu <code>$</code> thì <code>CONFIG_X="only"</code> cũng khớp.']
            ]},

          { t: 'cal', kind: 'why', title: 'Các con số phải cộng lại đúng — và chúng đúng', x:
            '<p>544 + 6 520 + 4 663 = <b>11 727</b>. Mỗi dòng của <code>.config</code> thuộc đúng một ' +
            'trong ba loại: trống, chú thích, hoặc có giá trị. Trong 6 520 dòng chú thích thì 4 950 là ' +
            'các dòng <code>is not set</code>, 1 570 dòng còn lại là tiêu đề nhóm kiểu ' +
            '<code># Networking options</code>.</p>' +
            '<p>Thói quen <b>đối chiếu tổng</b> này đáng giữ suốt cả khoá. Ở <b>Bài 38</b> nó đã cứu bạn ' +
            'một lần: chênh lệch 85 giữa <code>find</code> và <code>git ls-files</code> hoá ra là số ' +
            'liên kết tượng trưng, không phải lỗi. Khi các con số <i>không</i> cộng lại đúng, gần như luôn ' +
            'là mẫu tìm kiếm của bạn sai chứ không phải dữ liệu sai.</p>' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Bốn trạng thái, đọc trên bốn dòng gần nhau',
        blocks: [

          { t: 'p', x:
            'Bảng bốn trạng thái ở phần lý thuyết có một điểm may mắn: cả bốn đều xuất hiện trong cùng ' +
            'một vùng của <code>.config</code>, phần hệ thống file. Hãy xem ba trạng thái đầu trước. ' +
            'Tuỳ chọn <code>-n</code> in kèm số dòng, còn <code>\\b</code> là “biên của từ”, để ' +
            '<code>CONFIG_EXT4_FS</code> không kéo theo <code>CONFIG_EXT4_FS_POSIX_ACL</code>:' },

          { t: 'code', where: 'wsl', code:
            'grep -n \'CONFIG_EXT4_FS\\b\' .config | head -3\n' +
            'grep -n \'CONFIG_XFS_FS\\b\' .config | head -3\n' +
            'grep -n \'CONFIG_BTRFS_FS\\b\' .config | head -3' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Số dòng có thể lệch vài đơn vị nếu phiên bản kernel của bạn khác 6.18.45, nhưng ba ' +
                   'giá trị <code>=y</code> / <code>is not set</code> / <code>=m</code> thì không đổi.'],
            code:
            '10640:CONFIG_EXT4_FS=y\n' +
            '10649:# CONFIG_XFS_FS is not set\n' +
            '10652:CONFIG_BTRFS_FS=m' },

          { t: 'cal', kind: 'info', title: 'Ba dòng này là ba quyết định thiết kế khác nhau', x:
            '<ul>' +
            '<li><code>CONFIG_EXT4_FS=y</code> — ext4 nằm <b>trong</b> <code>vmlinux</code>. Lý do rất ' +
            'thực tế: rootfs thường là ext4, mà kernel phải mount được rootfs <i>trước</i> khi nạp được ' +
            'module nào. Đúng nguyên lý đã nêu ở phần lý thuyết.</li>' +
            '<li><code># CONFIG_XFS_FS is not set</code> — XFS <b>có thể</b> bật, nhưng cấu hình mặc ' +
            'định chọn không. Dòng chú thích này không thừa: nó là bằng chứng rằng ' +
            '<code>conf</code> đã xét tới XFS và câu trả lời là “không”.</li>' +
            '<li><code>CONFIG_BTRFS_FS=m</code> — Btrfs thành một file <code>.ko</code> rời. Ai cần thì ' +
            '<code>modprobe btrfs</code>, ai không cần thì không tốn một byte nào trong ' +
            '<code>vmlinux</code>. Đây chính là lý do <code>tristate</code> tồn tại.</li>' +
            '</ul>' },

          { t: 'p', x:
            'Còn trạng thái thứ tư — vắng mặt hoàn toàn — thì phải tìm ở một ký hiệu của kiến trúc khác. ' +
            '<code>X86_LOCAL_APIC</code> là bộ điều khiển ngắt của x86:' },

          { t: 'code', where: 'wsl', code:
            'grep -n \'CONFIG_X86_LOCAL_APIC\' .config\n' +
            'echo "exit = $?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'exit = 1' },

          { t: 'p', x:
            'Không một dòng nào, kể cả dòng <code>is not set</code>. Đây <b>không</b> giống trường hợp ' +
            'XFS ở trên. Lý do nằm trong file Kconfig của x86:' },

          { t: 'code', where: 'wsl', code: 'grep -n -A3 \'^config X86_LOCAL_APIC$\' arch/x86/Kconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1108:config X86_LOCAL_APIC\n' +
            '1109-\tdef_bool y\n' +
            '1110-\tdepends on X86_64 || SMP || X86_UP_APIC || PCI_MSI\n' +
            '1111-\tselect IRQ_DOMAIN_HIERARCHY' },

          { t: 'cal', kind: 'why', title: 'Vì sao <code>conf</code> thậm chí không ghi một dòng chú thích', x:
            '<p>Điều kiện <code>depends on X86_64 || SMP || X86_UP_APIC || PCI_MSI</code> có bốn vế. Trên ' +
            'cấu hình <code>ARCH=arm64</code>, cả bốn đều <b>không thể</b> đúng — không có ký hiệu nào ' +
            'trong số đó tồn tại. Với <code>conf</code>, ký hiệu này không phải “tắt” mà là ' +
            '<b>không tồn tại</b> trong không gian cấu hình hiện tại, nên không có gì để ghi lại.</p>' +
            '<p>Chú ý thêm <code>def_bool y</code> ở dòng 1109: đó là cách viết gộp của ' +
            '<code>bool</code> + <code>default y</code>, <b>không kèm prompt</b>. Nghĩa là ngay cả trên ' +
            'một cấu hình x86, bạn cũng không tìm thấy nó trong <code>menuconfig</code> để tắt — nó tự ' +
            'bật khi điều kiện thoả. Đúng kiểu ký hiệu “không prompt” mà phần lý thuyết đã cảnh báo.</p>' +
            '<p><b>Hệ quả thực dụng:</b> nếu bạn <code>grep</code> một ký hiệu và không thấy <i>gì cả</i>, ' +
            'đừng đi tìm cách bật nó. Hãy đi tìm <code>depends on</code> của nó trước — bước 4 và bảng ' +
            '“Lỗi thường gặp” sẽ cho thấy bật thẳng nó thì chuyện gì xảy ra.</p>' },

          { t: 'p', x:
            'Để thấy chiều ngược lại, hãy kiểm ký hiệu mà driver UART của bạn phụ thuộc — ' +
            '<code>ARM_AMBA</code>, thứ có trên arm64 và làm cho <code>SERIAL_AMBA_PL011</code> hiện ra:' },

          { t: 'code', where: 'wsl', code:
            'grep -n \'^CONFIG_ARM_AMBA=\\|^# CONFIG_ARM_AMBA is not set\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1690:CONFIG_ARM_AMBA=y' },

          { t: 'cal', kind: 'info', title: 'Đây là mắt xích làm cho driver UART của bạn tồn tại', x:
            '<p><code>CONFIG_ARM_AMBA=y</code> ở dòng 1690 là lý do mà <code>SERIAL_AMBA_PL011</code> ' +
            '<i>có mặt</i> trong <code>.config</code> này (bạn sẽ thấy nó ở dòng 3726 tại bước 4), thay ' +
            'vì vắng mặt như <code>X86_LOCAL_APIC</code>. Đúng một dòng <code>depends on ARM_AMBA</code> ' +
            'trong <code>drivers/tty/serial/Kconfig</code> quyết định chuyện đó.</p>' +
            '<p>Nếu bạn chạy lại toàn bộ bài này với <code>ARCH=x86_64</code>, hai vai sẽ đổi chỗ cho ' +
            'nhau: <code>X86_LOCAL_APIC</code> xuất hiện, còn <code>SERIAL_AMBA_PL011</code> biến mất ' +
            'hoàn toàn. Cùng một cây source, cùng 22 125 ký hiệu — chỉ khác giá trị của ' +
            '<code>ARCH=</code>.</p>' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: 'Chứng minh <code>y</code> khác <code>m</code> bằng chính file gcc đọc',
        blocks: [

          { t: 'p', x:
            'Bước này biến bảng lý thuyết ở mục 4 thành bằng chứng nhìn thấy được. Trước hết phải sinh ' +
            'ra ba file trung gian. Bình thường chúng được tạo tự động ở đầu mỗi lần <code>make</code>, ' +
            'nhưng gọi thẳng <code>syncconfig</code> cho phép bạn quan sát riêng bước đó:' },

          { t: 'code', where: 'wsl', code: 'make ARCH=arm64 syncconfig' },

          { t: 'cal', kind: 'info', title: 'Lệnh này không in ra gì — và đó là kết quả đúng', x:
            '<p>Không có dòng nào, kể cả ở lần chạy đầu tiên khi ba file chưa tồn tại (đã kiểm bằng cách ' +
            'xoá hẳn <code>include/config/</code> và <code>include/generated/</code> rồi chạy lại). ' +
            '<code>syncconfig</code> thuộc loại lệnh “im lặng khi thành công”, giống ' +
            '<code>cp</code> hay <code>mv</code>. Muốn biết nó có làm gì không thì phải nhìn <b>file nó ' +
            'tạo ra</b>, đó chính là lệnh tiếp theo.</p>' },

          { t: 'code', where: 'wsl', code:
            'ls -l include/config/auto.conf include/generated/autoconf.h\n' +
            'grep -c \'^#define\' include/generated/autoconf.h' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Tên người dùng, ngày giờ và ba con số kích thước có thể khác trên máy bạn; ' +
                   'riêng số <b>4663</b> thì không, vì nó được suy ra hoàn toàn từ <code>.config</code>.'],
            code:
            '-rw-r--r-- 1 shinarus shinarus 118292 Aug 24 21:26 include/config/auto.conf\n' +
            '-rw-r--r-- 1 shinarus shinarus 164560 Aug 24 21:26 include/generated/autoconf.h\n' +
            '4663' },

          { t: 'cal', kind: 'why', title: 'Con số 4 663 xuất hiện lần thứ hai — và đó là điểm mấu chốt', x:
            '<p>Ở bước 1 bạn đếm được <b>4 663</b> dòng có giá trị trong <code>.config</code>. Giờ ' +
            '<code>autoconf.h</code> có đúng <b>4 663</b> dòng <code>#define</code>. Không phải trùng ' +
            'hợp: mỗi ký hiệu có giá trị sinh ra đúng một <code>#define</code>, không hơn không kém ' +
            '(đã đối chiếu từng ký hiệu một, hai tập trùng khít).</p>' +
            '<p>Nhưng <b>tên</b> của <code>#define</code> thì không phải lúc nào cũng bằng tên ký hiệu. ' +
            'Đó chính là chỗ <code>y</code> và <code>m</code> tách nhau ra, và là thứ hai lệnh tiếp theo ' +
            'sẽ phơi bày.</p>' },

          { t: 'p', x:
            'Lấy hai ký hiệu bạn đã biết trạng thái từ bước 2: <code>SERIAL_AMBA_PL011</code> là ' +
            '<code>=y</code>, <code>BTRFS_FS</code> là <code>=m</code>. Xem gcc nhìn thấy chúng thế nào:' },

          { t: 'code', where: 'wsl', code:
            'grep -n \'^#define CONFIG_SERIAL_AMBA_PL011\' include/generated/autoconf.h\n' +
            'grep -n \'^#define CONFIG_BTRFS_FS\' include/generated/autoconf.h' },

          { t: 'code', where: 'out', nocopy: true, code:
            '140:#define CONFIG_SERIAL_AMBA_PL011_CONSOLE 1\n' +
            '952:#define CONFIG_SERIAL_AMBA_PL011 1\n' +
            '918:#define CONFIG_BTRFS_FS_MODULE 1\n' +
            '3045:#define CONFIG_BTRFS_FS_POSIX_ACL 1' },

          { t: 'cal', kind: 'warn', title: 'Đọc kỹ dòng 918: <code>CONFIG_BTRFS_FS_MODULE</code>, không phải <code>CONFIG_BTRFS_FS</code>', x:
            '<p>Ký hiệu <code>=y</code> ở dòng 952 cho ra <code>#define CONFIG_SERIAL_AMBA_PL011 1</code> ' +
            '— đúng tên, không thêm gì. Ký hiệu <code>=m</code> ở dòng 918 cho ra một cái tên ' +
            '<b>hoàn toàn khác</b>: <code>CONFIG_BTRFS_FS_MODULE</code>.</p>' +
            '<p>Dòng 3045, <code>CONFIG_BTRFS_FS_POSIX_ACL</code>, là một ký hiệu <i>khác</i> (kiểu ' +
            '<code>bool</code>, đang <code>=y</code>) chỉ tình cờ có tên bắt đầu giống — nó lọt vào kết ' +
            'quả vì mẫu tìm kiếm không neo cuối dòng. Đừng nhầm nó với <code>BTRFS_FS</code>.</p>' },

          { t: 'p', x:
            'Câu hỏi quyết định: vậy có tồn tại một <code>#define CONFIG_BTRFS_FS</code> trơn không? ' +
            'Hỏi thẳng bằng một mẫu neo cả hai đầu:' },

          { t: 'code', where: 'wsl', code:
            'grep -c \'^#define CONFIG_BTRFS_FS 1$\' include/generated/autoconf.h' },

          { t: 'code', where: 'out', nocopy: true, code: '0' },

          { t: 'cal', kind: 'why', title: 'Số <code>0</code> này là toàn bộ lý do <code>IS_ENABLED()</code> tồn tại', x:
            '<p>Btrfs <b>đang được bật</b> — nó sẽ được biên dịch, sẽ có file <code>.ko</code>, sẽ dùng ' +
            'được. Nhưng với trình biên dịch, ký hiệu <code>CONFIG_BTRFS_FS</code> <b>không tồn tại</b>. ' +
            'Nghĩa là một đoạn mã viết thế này:</p>' +
            '<p><code>#ifdef CONFIG_BTRFS_FS</code> … <code>#endif</code></p>' +
            '<p>sẽ <b>bị bỏ qua hoàn toàn</b> khi người dùng chọn <code>m</code>, dù họ đã bật tính năng. ' +
            'Không có cảnh báo, không có lỗi build — chỉ có một tính năng lặng lẽ không chạy. Đây là ' +
            'loại lỗi tốn hàng giờ vì mã trông hoàn toàn hợp lý.</p>' +
            '<p>Viết <code>IS_ENABLED(CONFIG_BTRFS_FS)</code> thì đúng trong cả hai trường hợp, vì macro ' +
            'đó kiểm cả <code>CONFIG_BTRFS_FS</code> lẫn <code>CONFIG_BTRFS_FS_MODULE</code>. ' +
            '<b>Quy tắc để nhớ:</b> với ký hiệu <code>tristate</code>, đừng bao giờ dùng ' +
            '<code>#ifdef</code>; dùng <code>IS_ENABLED()</code>. Với ký hiệu <code>bool</code> thì hai ' +
            'cách tương đương, nên dùng <code>IS_ENABLED()</code> luôn cho khỏi phải nhớ ký hiệu nào ' +
            'thuộc kiểu nào.</p>' },

          { t: 'p', x:
            'Cuối cùng, xem phía make. File <code>auto.conf</code> giữ nguyên chữ <code>y</code> và ' +
            '<code>m</code>, vì Kbuild cần phân biệt <code>obj-y</code> với <code>obj-m</code>:' },

          { t: 'code', where: 'wsl', code:
            'grep -n \'^CONFIG_BTRFS_FS=\\|^CONFIG_SERIAL_AMBA_PL011=\' include/config/auto.conf' },

          { t: 'code', where: 'out', nocopy: true, code:
            '918:CONFIG_BTRFS_FS=m\n' +
            '952:CONFIG_SERIAL_AMBA_PL011=y' },

          { t: 'cal', kind: 'info', title: 'Hai khách hàng, hai định dạng, cùng một nguồn', x:
            '<p>So sánh với kết quả ba lệnh trước: cùng số dòng 918 và 952, nhưng ' +
            '<code>auto.conf</code> ghi <code>CONFIG_BTRFS_FS=m</code> còn <code>autoconf.h</code> ghi ' +
            '<code>#define CONFIG_BTRFS_FS_MODULE 1</code>. Hai file, hai cách diễn đạt cùng một sự thật, ' +
            'phục vụ hai chương trình khác nhau.</p>' +
            '<p>Make cần <code>y</code>/<code>m</code> nguyên vẹn để <code>obj-$(CONFIG_BTRFS_FS)</code> ' +
            'giãn thành <code>obj-m</code> — đúng cơ chế bạn đã thấy ở <b>Bài 38</b>. Còn gcc thì không ' +
            'có khái niệm “module”, nó chỉ biết một tên đã <code>#define</code> hay chưa, nên phải mã hoá ' +
            'trạng thái <code>m</code> vào <i>tên</i> của macro.</p>' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: '<code>menuconfig</code>, tìm kiếm bằng <kbd>/</kbd>, và cái bẫy <code>y → m → y</code>',
        blocks: [

          { t: 'p', x:
            'Giờ mở giao diện cấu hình. Lệnh này <b>tương tác</b>, nên không có output để chép lại — bạn ' +
            'phải tự chạy và tự nhìn:' },

          { t: 'code', where: 'wsl', code: 'make ARCH=arm64 menuconfig' },

          { t: 'p', x:
            'Màn hình đầu tiên là thứ đã in ở phần lý thuyết. Hãy làm đúng bốn việc sau, theo thứ tự:' },

          { t: 'list', ordered: true, items: [
            'Đọc dòng <code>Legend:</code> ở đầu màn hình, rồi tìm trên danh sách hai mục có dấu <code>-*-</code> — chúng là <i>Enable the block layer</i> và <i>Cryptographic API</i>. Thử di tới một trong hai và bấm <kbd>n</kbd>: <b>không có gì xảy ra</b>, đúng như bảng ký hiệu đánh dấu đã báo.',
            'Bấm <kbd>/</kbd> để mở ô tìm kiếm, gõ <code>SERIAL_AMBA_PL011</code> rồi <kbd>Enter</kbd>.',
            'Đọc kỹ bảng kết quả (in ngay dưới đây), rồi bấm <kbd>Esc</kbd> <kbd>Esc</kbd> để quay ra.',
            'Bấm <kbd>Esc</kbd> <kbd>Esc</kbd> lần nữa để thoát. Khi nó hỏi có lưu không, chọn <b>No</b> — bước này chỉ để xem, và <code>.config</code> phải giữ nguyên cho các lệnh sau.'
          ]},

          { t: 'code', where: 'out', nocopy: true,
            name: 'bảng Search Results sau khi tìm SERIAL_AMBA_PL011',
            notes: ['Đây là <b>nội dung chữ</b> của một lần chạy thật, đã lược khung vẽ và màu của ncurses. ' +
                   'Trên máy bạn nó nằm trong một hộp cuộn được; nội dung thì giống hệt.'],
            code:
            'Symbol: SERIAL_AMBA_PL011 [=y]\n' +
            'Type  : tristate\n' +
            'Defined at drivers/tty/serial/Kconfig:48\n' +
            '  Prompt: ARM AMBA PL011 serial port support\n' +
            '  Depends on: TTY [=y] && HAS_IOMEM [=y] && ARM_AMBA [=y]\n' +
            '  Location:\n' +
            '    -> Device Drivers\n' +
            '      -> Character devices\n' +
            '        -> Enable TTY (TTY [=y])\n' +
            '          -> Serial drivers\n' +
            '(1)         -> ARM AMBA PL011 serial port support (SERIAL_AMBA_PL011 [=y])\n' +
            '  Selects: SERIAL_CORE [=y]\n' +
            '\n' +
            'Symbol: SERIAL_AMBA_PL011_CONSOLE [=y]\n' +
            'Type  : bool\n' +
            'Defined at drivers/tty/serial/Kconfig:59\n' +
            '  Prompt: Support for console on AMBA serial port\n' +
            '  Depends on: TTY [=y] && HAS_IOMEM [=y] && SERIAL_AMBA_PL011 [=y]=y [=y]\n' +
            '  Location:\n' +
            '    -> Device Drivers\n' +
            '      -> Character devices\n' +
            '        -> Enable TTY (TTY [=y])\n' +
            '          -> Serial drivers\n' +
            '            -> ARM AMBA PL011 serial port support (SERIAL_AMBA_PL011 [=y])\n' +
            '(2)           -> Support for console on AMBA serial port (SERIAL_AMBA_PL011_CONSOLE [=y])\n' +
            '  Selects: SERIAL_CORE_CONSOLE [=y] && SERIAL_EARLYCON [=y]' },

          { t: 'cal', kind: 'tip', title: '<kbd>/</kbd> là phím đáng giá nhất trong <code>menuconfig</code>', x:
            '<p>Bảng này trả lời trong một lần bấm phím bốn câu hỏi mà nếu tự đi tìm sẽ mất rất lâu:</p>' +
            '<ul>' +
            '<li><b>Nó ở đâu trong menu?</b> — phần <code>Location:</code> vẽ đúng đường đi ' +
            '<i>Device Drivers → Character devices → Enable TTY → Serial drivers</i>. Không có nó thì bạn ' +
            'phải mò qua hàng chục menu con.</li>' +
            '<li><b>Nó khai báo ở đâu trong source?</b> — <code>Defined at ' +
            'drivers/tty/serial/Kconfig:48</code>, đúng file và đúng dòng bạn đã đọc ở phần lý thuyết. ' +
            'Đây là con đường thứ năm để định hướng trong cây source, bổ sung cho bốn con đường ở ' +
            '<b>Bài 38</b>.</li>' +
            '<li><b>Vì sao tôi không bật được nó?</b> — dòng <code>Depends on:</code> liệt kê ' +
            '<i>toàn bộ</i> điều kiện, kèm giá trị hiện tại của từng vế trong ngoặc <code>[=y]</code>. ' +
            'Vế nào ghi <code>[=n]</code> chính là thủ phạm.</li>' +
            '<li><b>Bật nó thì kéo theo gì?</b> — dòng <code>Selects:</code>.</li>' +
            '</ul>' },

          { t: 'cal', kind: 'info', title: 'Hai chi tiết trong bảng đáng dừng lại đọc kỹ', x:
            '<p><b>Thứ nhất</b>, dòng <code>Depends on: TTY [=y] &amp;&amp; HAS_IOMEM [=y] &amp;&amp; ' +
            'ARM_AMBA [=y]</code> có <b>ba</b> vế, trong khi mục Kconfig ở phần lý thuyết chỉ viết một ' +
            'dòng <code>depends on ARM_AMBA</code>. Hai vế kia — <code>TTY</code> và ' +
            '<code>HAS_IOMEM</code> — đến từ các khối <code>menu</code> và <code>if</code> <b>bao ngoài</b> ' +
            'trong cùng file. Điều kiện thật của một ký hiệu là điều kiện của nó <i>cộng</i> điều kiện ' +
            'của mọi khối bao quanh nó. Đây là lý do rất nên tra bằng <kbd>/</kbd> thay vì chỉ đọc mấy ' +
            'dòng Kconfig quanh chỗ khai báo.</p>' +
            '<p><b>Thứ hai</b>, chuỗi kỳ quặc <code>SERIAL_AMBA_PL011 [=y]=y [=y]</code> ở ký hiệu thứ ' +
            'hai không phải lỗi hiển thị vô nghĩa. Điều kiện gốc là <code>depends on ' +
            'SERIAL_AMBA_PL011=y</code>; <code>menuconfig</code> chèn giá trị hiện tại vào sau mỗi tên ' +
            'ký hiệu, nên bạn đọc là “<code>SERIAL_AMBA_PL011</code> (hiện <code>=y</code>) phải bằng ' +
            '<code>y</code>, và cả biểu thức hiện đúng”. Chính dòng này là dòng sắp gây ra chuyện ở phần ' +
            'còn lại của bước.</p>' },

          { t: 'p', x:
            'Bây giờ tới phần quan trọng nhất của cả bài. Bạn sẽ đổi <code>SERIAL_AMBA_PL011</code> từ ' +
            '<code>y</code> sang <code>m</code> rồi đổi ngược lại <code>y</code> — một thao tác trông ' +
            'hoàn toàn vô hại — và chứng minh rằng <code>.config</code> <b>không</b> trở về như cũ. ' +
            'Để làm tự động, dùng <code>scripts/config</code> thay cho giao diện: nó sửa thẳng file, kết ' +
            'quả giống hệt việc bạn bấm phím trong <code>menuconfig</code>.' },

          { t: 'p', x:
            'Trước hết, chụp lại trạng thái ban đầu để còn đối chiếu:' },

          { t: 'code', where: 'wsl', code:
            'cp .config .config.backup\n' +
            'grep -n \'CONFIG_SERIAL_AMBA_PL011\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3726:CONFIG_SERIAL_AMBA_PL011=y\n' +
            '3727:CONFIG_SERIAL_AMBA_PL011_CONSOLE=y' },

          { t: 'p', x:
            'Hai dòng, hai ký hiệu, cả hai <code>=y</code> — đúng như bảng Search Results báo. Giờ hạ ' +
            'driver xuống mức module:' },

          { t: 'code', where: 'wsl', code:
            './scripts/config --module SERIAL_AMBA_PL011\n' +
            'make ARCH=arm64 olddefconfig\n' +
            'grep -n \'CONFIG_SERIAL_AMBA_PL011\' .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '3726:CONFIG_SERIAL_AMBA_PL011=m' },

          { t: 'cmdx', title: 'Ba lệnh, ba vai trò',
            cmd: './scripts/config --module SERIAL_AMBA_PL011',
            rows: [
              ['<code>./scripts/config</code>',
               'Một script shell nằm sẵn trong cây source, <b>không</b> phải target của make. Nó sửa thẳng dòng tương ứng trong <code>.config</code> — nhanh, dùng được trong script tự động, nhưng <b>không hiểu gì về ràng buộc</b>.'],
              ['<code>--module</code>',
               'Đặt ký hiệu thành <code>m</code>. Hai anh em của nó là <code>--enable</code> (<code>y</code>) và <code>--disable</code> (<code>n</code>).'],
              ['<code>SERIAL_AMBA_PL011</code>',
               'Tên ký hiệu, viết <b>không kèm</b> tiền tố <code>CONFIG_</code> — script tự thêm vào. Viết cả <code>CONFIG_SERIAL_AMBA_PL011</code> cũng chạy đúng: dòng 61–62 của script cắt bỏ tiền tố thừa. Nhưng hãy quen viết dạng ngắn, vì đó là dạng mà <code>menuconfig</code> và tài liệu kernel dùng.'],
              ['<code>make ARCH=arm64 olddefconfig</code>',
               'Bắt buộc phải chạy sau đó. Đây là bước <b>hợp thức hoá</b>: <code>conf</code> đọc lại toàn bộ ràng buộc và sửa mọi hệ quả của thay đổi bạn vừa làm bằng tay.']
            ]},

          { t: 'cal', kind: 'warn', title: 'Dòng 3727 vừa biến mất — <code>grep</code> chỉ còn trả về một dòng', x:
            '<p>Trước đó có hai dòng, giờ chỉ còn một. <code>CONFIG_SERIAL_AMBA_PL011_CONSOLE</code> ' +
            '<b>không</b> chuyển thành <code># … is not set</code>; nó rơi thẳng vào trạng thái thứ tư — ' +
            'vắng mặt hoàn toàn, đúng như <code>X86_LOCAL_APIC</code> ở bước 2.</p>' +
            '<p>Lý do đọc được ngay trong bảng Search Results: điều kiện của nó là <code>depends on ' +
            'SERIAL_AMBA_PL011=y</code>, chứ không phải <code>depends on SERIAL_AMBA_PL011</code>. ' +
            'Giá trị <code>m</code> không thoả <code>=y</code>, nên với <code>conf</code>, ký hiệu console ' +
            'không còn tồn tại và không có gì để ghi lại. Đây chính là cơ chế đã được giải thích ở mục ' +
            '“vì sao console phải là <code>y</code>”, giờ xảy ra ngay trước mắt bạn.</p>' },

          { t: 'p', x:
            'Đến đây bạn “đổi ý” và muốn quay lại như cũ. Việc tự nhiên nhất: bật lại thành <code>y</code>.' },

          { t: 'code', where: 'wsl', code:
            './scripts/config --enable SERIAL_AMBA_PL011\n' +
            'make ARCH=arm64 olddefconfig\n' +
            'grep -n \'CONFIG_SERIAL_AMBA_PL011\' .config' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Trước khi đọc tiếp: hãy tự đọc lại dòng 3727 và so với hai dòng ở đầu bước.'],
            code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '3726:CONFIG_SERIAL_AMBA_PL011=y\n' +
            '3727:# CONFIG_SERIAL_AMBA_PL011_CONSOLE is not set' },

          { t: 'p', x:
            'Dòng 3726 đúng như mong đợi: driver đã về lại <code>y</code>. Nhưng dòng 3727 <b>không</b> ' +
            'phải <code>CONFIG_SERIAL_AMBA_PL011_CONSOLE=y</code> như lúc đầu bước — nó là một dòng ' +
            '<code>is not set</code>. Ký hiệu console đã quay lại, nhưng quay lại ở trạng thái <b>tắt</b>.' },

          { t: 'p', x:
            'Đừng tin mắt mình, hãy hỏi <code>diff</code>. So sánh với bản chụp lúc đầu bước:' },

          { t: 'code', where: 'wsl', code: 'diff .config.backup .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3727c3727\n' +
            '< CONFIG_SERIAL_AMBA_PL011_CONSOLE=y\n' +
            '---\n' +
            '> # CONFIG_SERIAL_AMBA_PL011_CONSOLE is not set' },

          { t: 'cal', kind: 'danger', title: 'Đây là cái bẫy đắt nhất của cấu hình kernel', x:
            '<p>Bạn đưa <code>SERIAL_AMBA_PL011</code> đi một vòng <code>y → m → y</code> và trả nó về ' +
            'đúng giá trị ban đầu. Nhưng <code>.config</code> <b>không</b> trở về trạng thái ban đầu: ' +
            'console driver giờ đang <b>tắt</b>.</p>' +
            '<p>Cơ chế thì hoàn toàn logic, và chỉ có hai bước:</p>' +
            '<ul>' +
            '<li>Khi driver xuống <code>m</code>, ký hiệu console <b>biến mất</b> — cùng với nó là ' +
            '<i>lựa chọn</i> mà ai đó đã đưa ra cho nó. Không có chỗ nào lưu lại.</li>' +
            '<li>Khi driver lên lại <code>y</code>, ký hiệu console <b>xuất hiện trở lại</b> và ' +
            '<code>olddefconfig</code> phải trả lời cho nó. Nó trả lời bằng ' +
            '<b>giá trị mặc định của Kconfig</b> — chứ không phải giá trị cũ, thứ đã không còn tồn tại.</li>' +
            '</ul>' +
            '<p><b>Hậu quả thực tế của đúng một dòng này:</b> kernel vẫn build thành công, vẫn có driver ' +
            'UART, nhưng <b>không in ra một dòng boot log nào</b>. Ở <b>Bài 40</b> bạn boot kernel này ' +
            'trong QEMU; nếu vấp phải nó, triệu chứng sẽ là một màn hình đen câm lặng — loại lỗi tệ nhất, ' +
            'vì không có thông báo nào để mà tra.</p>' +
            '<p><b>Quy tắc rút ra, đáng nhớ suốt nghề:</b> <code>.config</code> không có “Undo”. ' +
            'Trước mọi thay đổi cấu hình, hãy <code>cp .config .config.backup</code>, và sau mọi thay đổi ' +
            'hãy <code>diff</code> — <i>toàn bộ</i> file, không chỉ ký hiệu bạn vừa động vào. Thay đổi một ' +
            'ký hiệu thường kéo theo những ký hiệu bạn không nghĩ tới.</p>' },

          { t: 'p', x:
            'Khôi phục lại bản gốc trước khi sang bước sau:' },

          { t: 'code', where: 'wsl', code:
            'cp .config.backup .config\n' +
            'diff -q .config.backup .config && echo "restored"' },

          { t: 'code', where: 'out', nocopy: true, code: 'restored' },

          { t: 'cal', kind: 'tip', title: 'Vì sao chép xong vẫn phải <code>diff -q</code>', x:
            '<p><code>cp</code> im lặng khi thành công và cũng gần như im lặng khi thất bại một phần ' +
            '(đầy đĩa chẳng hạn). <code>diff -q</code> chỉ in ra khi <b>khác</b>, nên câu ' +
            '<code>&amp;&amp; echo "restored"</code> chỉ chạy nếu hai file giống hệt nhau. Một dòng ' +
            '<code>restored</code> ở đây là bằng chứng, không phải lời hứa — thói quen này sẽ rất có giá ' +
            'ở <b>Bài 40</b>, khi một <code>.config</code> sai kéo theo cả chục phút build vô ích.</p>' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: '<code>select</code> không phải là đề nghị',
        blocks: [

          { t: 'p', x:
            'Phần lý thuyết nói <code>select</code> là mệnh lệnh chứ không phải đề nghị. Bước này chứng ' +
            'minh điều đó bằng cách <b>cố tình</b> tắt một ký hiệu đang bị 72 driver khác ' +
            '<code>select</code>, rồi xem điều gì xảy ra. Trước hết, trạng thái hiện tại:' },

          { t: 'code', where: 'wsl', code:
            'cp .config .config.backup\n' +
            'grep -n \'CONFIG_SERIAL_CORE\\b\' .config | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3751:CONFIG_SERIAL_CORE=y' },

          { t: 'p', x:
            'Nhớ lại từ phần lý thuyết: <code>SERIAL_CORE</code> chỉ có hai dòng khai báo và ' +
            '<b>không có prompt</b>, nên bạn sẽ không tìm thấy nó trong <code>menuconfig</code> để tắt. ' +
            'Nhưng <code>scripts/config</code> sửa thẳng file, nó không quan tâm tới prompt:' },

          { t: 'code', where: 'wsl', code:
            './scripts/config --disable SERIAL_CORE\n' +
            'grep -n \'CONFIG_SERIAL_CORE\\b\' .config | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3751:# CONFIG_SERIAL_CORE is not set' },

          { t: 'cal', kind: 'info', title: 'Việc sửa file đã thành công — nhưng file mới chỉ là file', x:
            '<p>Dòng 3751 giờ là <code># CONFIG_SERIAL_CORE is not set</code>. <code>scripts/config</code> ' +
            'làm đúng việc nó hứa: sửa một dòng văn bản. Nó <b>không</b> kiểm tra xem thay đổi đó có hợp ' +
            'lệ theo 41 640 ràng buộc của Kconfig hay không — đó không phải việc của nó.</p>' +
            '<p>Đây chính là lý do mọi lần dùng <code>scripts/config</code> đều phải theo sau bằng một ' +
            'lần <code>olddefconfig</code>. Lệnh tiếp theo là bước hợp thức hoá đó.</p>' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 olddefconfig\n' +
            'grep -n \'CONFIG_SERIAL_CORE\\b\' .config | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '3751:CONFIG_SERIAL_CORE=y' },

          { t: 'cal', kind: 'why', title: 'Thay đổi của bạn bị huỷ, và không có lấy một dòng cảnh báo', x:
            '<p><code>=y</code> trở lại, y như chưa có gì xảy ra. <code>conf</code> đọc lại toàn bộ ' +
            'ràng buộc, thấy có ký hiệu đang bật <code>select SERIAL_CORE</code>, và ép nó bật lại. ' +
            'Nó thậm chí không thông báo — với <code>conf</code>, đây không phải xung đột cần báo mà chỉ ' +
            'là kết quả tính toán đúng.</p>' +
            '<p><b>Cách duy nhất</b> để tắt được <code>SERIAL_CORE</code> là tắt <i>tất cả</i> những gì ' +
            '<code>select</code> nó. Đếm thử xem con số đó lớn cỡ nào:</p>' },

          { t: 'code', where: 'wsl', code:
            'grep -c \'select SERIAL_CORE$\' drivers/tty/serial/Kconfig' },

          { t: 'code', where: 'out', nocopy: true, code: '72' },

          { t: 'cal', kind: 'tip', title: 'Nghĩ theo chiều mũi tên, đừng nghĩ theo chiều bạn muốn', x:
            '<p>72 driver serial trong riêng file này <code>select SERIAL_CORE</code>. Muốn tắt lõi thì ' +
            'phải tắt cả 72 — nghĩa là không dùng serial nữa. Nói cách khác, câu hỏi “làm sao tắt ' +
            '<code>SERIAL_CORE</code>” là <b>câu hỏi sai</b>.</p>' +
            '<p>Mẹo tư duy, dùng được cho mọi ký hiệu bị ép bật: <b>đừng hỏi “làm sao tắt X”, hãy hỏi ' +
            '“ai đang bật X”</b>. Và câu trả lời luôn tra được — bấm <kbd>/</kbd> trong ' +
            '<code>menuconfig</code>, tìm ký hiệu đó, đọc dòng <code>Selected by:</code>. Không cần nhớ ' +
            'ký hiệu nào bị ai select; chỉ cần nhớ <i>có chỗ để tra</i>.</p>' +
            '<p>Cặp <code>depends on</code> / <code>select</code> vì thế là hai chiều của cùng một mũi ' +
            'tên: <code>A depends on B</code> nghĩa là <i>B phải có trước</i>; <code>A select B</code> ' +
            'nghĩa là <i>A tự lo cho B</i>. Cái đầu chặn bạn lại, cái sau kéo bạn đi.</p>' },

          { t: 'p', x: 'Khôi phục trước khi sang bước cuối:' },

          { t: 'code', where: 'wsl', code:
            'cp .config.backup .config\n' +
            'diff -q .config.backup .config && echo "restored"' },

          { t: 'code', where: 'out', nocopy: true, code: 'restored' }
        ]},

      /* ---------------------------------------------------------------- */
      { title: '<code>savedefconfig</code> và một lần nâng kernel giả lập',
        blocks: [

          { t: 'p', x:
            'Bước cuối làm đúng quy trình bốn bước ở sơ đồ phần lý thuyết. Bắt đầu bằng việc rút gọn ' +
            'cấu hình hiện tại thành dạng tối thiểu:' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 savedefconfig\n' +
            'wc -l .config defconfig\n' +
            'ls -l .config defconfig' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Tên người dùng và ngày giờ sẽ khác trên máy bạn; bốn con số còn lại thì không.'],
            code:
            ' 11727 .config\n' +
            '  1755 defconfig\n' +
            ' 13482 total\n' +
            '-rw-r--r-- 1 shinarus shinarus 314649 Aug 24 21:23 .config\n' +
            '-rw-r--r-- 1 shinarus shinarus  42448 Aug 24 21:23 defconfig' },

          { t: 'cal', kind: 'info', title: '11 727 dòng còn 1 755 — và không mất thông tin nào', x:
            '<p>314 649 byte xuống 42 448 byte, nhỏ hơn <b>7,4 lần</b>. Toàn bộ phần bị bỏ đi là những ' +
            'dòng <code>conf</code> tự tính lại được: giá trị mặc định, ký hiệu bị <code>select</code> ' +
            'kéo theo, và 4 950 dòng <code>is not set</code>. Cái còn lại đúng bằng “những gì đã được ' +
            'quyết định khác mặc định”.</p>' +
            '<p>Chú ý file mới nằm ở <b>gốc cây source</b> và tên là <code>defconfig</code> trơn — ' +
            '<b>không</b> phải <code>arch/arm64/configs/defconfig</code>. File gốc của cộng đồng vẫn ' +
            'nguyên vẹn (1 824 dòng). Muốn thay nó thì phải tự chép đè, và đó là chủ ý của thiết kế: ' +
            'không lệnh nào được ghi đè file trong <code>arch/</code> sau lưng bạn.</p>' },

          { t: 'p', x:
            'File này trông thế nào? So đầu file với <code>head -12 .config</code> ở bước 1:' },

          { t: 'code', where: 'wsl', code: 'head -12 defconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            'CONFIG_SYSVIPC=y\n' +
            'CONFIG_POSIX_MQUEUE=y\n' +
            'CONFIG_AUDIT=y\n' +
            'CONFIG_NO_HZ_IDLE=y\n' +
            'CONFIG_HIGH_RES_TIMERS=y\n' +
            'CONFIG_BPF_SYSCALL=y\n' +
            'CONFIG_BPF_JIT=y\n' +
            'CONFIG_PREEMPT=y\n' +
            'CONFIG_IRQ_TIME_ACCOUNTING=y\n' +
            'CONFIG_BSD_PROCESS_ACCT=y\n' +
            'CONFIG_BSD_PROCESS_ACCT_V3=y\n' +
            'CONFIG_TASKSTATS=y' },

          { t: 'cal', kind: 'why', title: 'Bốn dòng tiêu đề và bốn dòng <code>CC_VERSION</code> đã biến mất', x:
            '<p>Đầu <code>.config</code> là <code># Automatically generated file</code>, ' +
            '<code>CONFIG_CC_VERSION_TEXT="gcc …"</code>, <code>CONFIG_GCC_VERSION=150200</code>… ' +
            'Đầu <code>defconfig</code> không có dòng nào trong số đó — nó bắt đầu thẳng bằng ' +
            '<code>CONFIG_SYSVIPC=y</code>, một <b>lựa chọn</b> thật sự của con người.</p>' +
            '<p>Đó chính là khác biệt “kết quả” và “quyết định” mà phần lý thuyết đã nói, giờ nhìn thấy ' +
            'được. Phiên bản gcc không phải quyết định của ai — <code>conf</code> đo lại nó mỗi lần chạy, ' +
            'nên đưa vào git là vô nghĩa và còn gây <code>diff</code> giả mỗi khi ai đó nâng gcc.</p>' },

          { t: 'p', x:
            'Nhưng “nhỏ hơn 7,4 lần” chỉ có giá trị nếu nó vẫn tái tạo được đầy đủ. Hãy kiểm chứng vòng ' +
            'khứ hồi: dùng chính <code>defconfig</code> vừa sinh làm <code>.config</code>, giãn lại, rồi ' +
            'so với bản gốc từng byte:' },

          { t: 'code', where: 'wsl', code:
            'cp .config .config.backup\n' +
            'cp defconfig .config\n' +
            'make ARCH=arm64 olddefconfig\n' +
            'wc -l .config\n' +
            'diff -q .config .config.backup && echo "ROUND TRIP OK"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '11727 .config\n' +
            'ROUND TRIP OK' },

          { t: 'cal', kind: 'why', title: '1 755 dòng giãn lại đúng 11 727 dòng, không sai một byte', x:
            '<p><code>diff -q</code> im lặng nghĩa là hai file <b>giống hệt nhau</b>, và dòng ' +
            '<code>ROUND TRIP OK</code> chỉ in ra nhờ điều đó. Vậy 9 972 dòng bị <code>savedefconfig</code> ' +
            'vứt đi thật sự là dư thừa: <code>conf</code> tính lại được toàn bộ.</p>' +
            '<p>Đây là bằng chứng cho việc bạn <b>có thể yên tâm</b> chỉ commit <code>defconfig</code>. ' +
            'Không phải “gần đủ” hay “đủ dùng” — mà là đủ chính xác tới từng byte, trên cùng một phiên ' +
            'bản kernel. Ở phiên bản khác thì kết quả sẽ khác một chút, và phần còn lại của bước này ' +
            'cho thấy khác ở chỗ nào.</p>' },

          { t: 'p', x:
            'Phần cuối: giả lập một lần nâng kernel. Trong đời thật, cây source mới có thêm ký hiệu mà ' +
            '<code>.config</code> cũ chưa từng biết. Ta dựng lại đúng tình huống đó bằng cách xoá một ' +
            'dòng ra khỏi <code>.config</code> — với <code>conf</code>, ký hiệu vắng mặt <i>là</i> ký ' +
            'hiệu mới:' },

          { t: 'code', where: 'wsl', code:
            'grep -v \'^CONFIG_BTRFS_FS=m$\' .config.backup > .config\n' +
            'make ARCH=arm64 listnewconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            'CONFIG_BTRFS_FS=n' },

          { t: 'cmdx', title: 'Dựng lại tình huống “kernel có ký hiệu mới”',
            cmd: 'grep -v \'^CONFIG_BTRFS_FS=m$\' .config.backup > .config',
            rows: [
              ['<code>-v</code>', '“Đảo ngược”: in ra mọi dòng <b>không</b> khớp, tức là chép cả file trừ đúng một dòng.'],
              ['<code>^CONFIG_BTRFS_FS=m$</code>', 'Neo cả hai đầu để không lỡ tay xoá nhầm <code>CONFIG_BTRFS_FS_POSIX_ACL=y</code> — đúng cái bẫy tên-bắt-đầu-giống-nhau ở bước 3.'],
              ['<code>&gt; .config</code>', 'Ghi kết quả đè lên <code>.config</code>. Bản gốc vẫn an toàn trong <code>.config.backup</code>.']
            ]},

          { t: 'cal', kind: 'info', title: '<code>listnewconfig</code> in đúng một dòng và không sửa gì cả', x:
            '<p>Kết quả <code>CONFIG_BTRFS_FS=n</code> nói hai điều cùng lúc: có <b>đúng một</b> ký hiệu ' +
            'mới, và giá trị mặc định của nó sẽ là <code>n</code>. Định dạng là dạng dòng của ' +
            '<code>.config</code> chứ không phải câu văn, nên đọc bằng script được.</p>' +
            '<p>Quan trọng hơn: sau lệnh này <code>.config</code> <b>vẫn nguyên</b> — ký hiệu vẫn đang ' +
            'vắng mặt. <code>listnewconfig</code> là lệnh <i>chỉ đọc</i>, và đó là toàn bộ giá trị của ' +
            'nó. Với một bản nâng kernel thật, danh sách này có thể dài hàng trăm dòng và nó là cơ hội ' +
            '<b>duy nhất</b> để bạn nhìn thấy “Btrfs sắp bị tắt” trước khi nó bị tắt thật.</p>' },

          { t: 'p', x:
            'Giờ mới cho <code>olddefconfig</code> trả lời, và xem nó trả lời thế nào:' },

          { t: 'code', where: 'wsl', code:
            'make ARCH=arm64 olddefconfig\n' +
            'grep -n \'CONFIG_BTRFS_FS\\b\' .config | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# configuration written to .config\n' +
            '#\n' +
            '10650:# CONFIG_BTRFS_FS is not set' },

          { t: 'cal', kind: 'warn', title: 'Btrfs vừa bị tắt, và không có một lời cảnh báo nào', x:
            '<p>Ở bước 2 dòng đó là <code>CONFIG_BTRFS_FS=m</code>. Giờ nó là ' +
            '<code># CONFIG_BTRFS_FS is not set</code>. <code>olddefconfig</code> đã làm <b>đúng</b> ' +
            'nhiệm vụ: ký hiệu mới → lấy mặc định → mặc định của <code>BTRFS_FS</code> là <code>n</code> ' +
            '→ tắt. Nó im lặng vì im lặng là điều bạn yêu cầu khi gõ tên target đó.</p>' +
            '<p>Đây chính xác là chuyện xảy ra trong đời thật khi một tính năng được <b>đổi tên ký ' +
            'hiệu</b> giữa hai phiên bản kernel: ký hiệu cũ biến mất, ký hiệu mới xuất hiện với mặc định ' +
            '<code>n</code>, và bản build mới lặng lẽ thiếu tính năng. Nếu bạn chạy ' +
            '<code>listnewconfig</code> trước, bạn đã thấy nó. Nếu không, bạn sẽ phát hiện ra lúc thiết ' +
            'bị không hoạt động.</p>' },

          { t: 'p', x:
            'Đối chiếu lần cuối: chạy lại <code>olddefconfig</code> khi <b>không</b> còn gì mới. Đây là ' +
            'output bạn nên quen mắt, vì nó nghĩa là “không có gì phải làm”:' },

          { t: 'code', where: 'wsl', code: 'make ARCH=arm64 olddefconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# No change to .config\n' +
            '#' },

          { t: 'cal', kind: 'tip', title: 'Phân biệt hai câu trả lời của <code>conf</code>', x:
            '<p><code># configuration written to .config</code> nghĩa là <b>có gì đó đã đổi</b> — nếu bạn ' +
            'không cố ý đổi gì thì đây là lúc chạy <code>diff</code>. Còn ' +
            '<code># No change to .config</code> nghĩa là cấu hình đã ổn định, không ràng buộc nào bị vi ' +
            'phạm, không ký hiệu nào mới.</p>' +
            '<p>Một mẹo dùng được ngay: sau khi sửa cấu hình xong, chạy <code>olddefconfig</code> ' +
            '<b>hai lần</b>. Lần thứ hai <i>phải</i> in <code>No change</code>. Nếu nó vẫn nói ' +
            '<code>configuration written</code>, cấu hình của bạn còn đang dao động và có gì đó chưa ' +
            'hội tụ.</p>' },

          { t: 'p', x:
            'Dọn dẹp: trả <code>.config</code> về bản gốc và xoá các file tạm. <b>Giữ lại cây source</b> ' +
            'và <code>.config</code> — <b>Bài 40</b> sẽ build đúng cấu hình này.' },

          { t: 'code', where: 'wsl', code:
            'cp .config.backup .config\n' +
            'rm -f defconfig .config.backup .config.old\n' +
            'ls -l .config' },

          { t: 'code', where: 'out', nocopy: true,
            notes: ['Kích thước 314 649 byte phải khớp với con số ở bước 6; nếu lệch, bạn đang giữ một ' +
                   '<code>.config</code> khác với bản mà Bài 40 giả định.'],
            code:
            '-rw-r--r-- 1 shinarus shinarus 314649 Aug 24 21:23 .config' },

          { t: 'cal', kind: 'info', title: 'Vì sao phải xoá <code>.config.old</code>', x:
            '<p><code>.config.old</code> không phải file bạn tạo — <code>conf</code> tự sinh nó mỗi lần ' +
            'ghi đè <code>.config</code>, để giữ lại bản trước đó. Nó vô hại, nhưng để lại thì lần sau ' +
            'bạn dễ nhầm nó với bản sao lưu <i>của mình</i>, mà nội dung thì đã bị ghi đè nhiều lần trong ' +
            'bước 4 và 6.</p>' +
            '<p>Nguyên tắc chung, dùng được cho cả khoá: <b>bản sao lưu do bạn đặt tên mới là bản sao ' +
            'lưu</b>. File do công cụ tự sinh chỉ là sản phẩm phụ, và tin vào nó là cách nhanh nhất để ' +
            'mất một cấu hình đã chạy được.</p>' }
        ]}

    ]},

    /* ══════════════════════════════════════════════════════════════════
       Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Cả sáu dòng dưới đây đều gặp thật khi kiểm chứng bài này. Chú ý một điều đáng sợ: <b>bốn trong ' +
      'sáu lỗi không có thông báo nào</b> — chúng chỉ hiện ra ở giá trị trong <code>.config</code>, hoặc ' +
      'muộn hơn nữa, ở lúc kernel không boot. Đó là lý do cột “Cách xử lý” của chúng đều bắt đầu bằng ' +
      'một lệnh <i>kiểm tra</i>.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>*** Default configuration is based on \'x86_64_defconfig\'</code>, và dòng 3 của ' +
         '<code>.config</code> ghi <code># Linux/x86 6.18.45 Kernel Configuration</code>',
         'Quên <code>ARCH=arm64</code>. Kbuild mặc định lấy kiến trúc của <b>máy chủ</b> — x86_64 — và ' +
         '<b>không coi đó là lỗi</b>.',
         'Kiểm bằng <code>head -3 .config</code>. Nếu sai: <code>rm .config .config.old</code> rồi chạy ' +
         'lại <b>có</b> <code>ARCH=arm64</code>. Đừng cố sửa file — cả 11 727 dòng đều sai kiến trúc.'],

        ['<code>* Unable to find the ncurses package.</code><br>' +
         '<code>* Install ncurses (ncurses-devel or libncurses-dev</code><br>' +
         '<code>* depending on your distribution).</code>',
         'Thiếu thư viện phát triển ncurses. <code>menuconfig</code> phải tự biên dịch giao diện ' +
         '<code>mconf</code> trước khi chạy, và nó cần header của ncurses.',
         '<code>sudo apt install libncurses-dev pkg-config</code>. Nếu đã cài mà vẫn báo, thường là ' +
         'thiếu <code>pkg-config</code> — chính thông báo đó nói tiếp ở dòng dưới.'],

        ['<b>Không có thông báo nào.</b> Bạn chạy <code>./scripts/config --enable X</code>, ' +
         '<code>grep</code> thấy dòng <code>CONFIG_X=y</code>, nhưng sau <code>make olddefconfig</code> ' +
         'thì dòng đó <b>biến mất hoàn toàn</b>',
         '<code>depends on</code> của <code>X</code> không thoả trên cấu hình hiện tại. Với ' +
         '<code>conf</code>, ký hiệu không tồn tại nên không có gì để ghi. Đã dựng lại được bằng ' +
         '<code>./scripts/config --enable X86_LOCAL_APIC</code> trên cấu hình arm64.',
         'Bấm <kbd>/</kbd> trong <code>menuconfig</code>, tìm <code>X</code>, đọc dòng ' +
         '<code>Depends on:</code> — vế nào ghi <code>[=n]</code> là thủ phạm. Bật vế đó trước, rồi mới ' +
         'bật <code>X</code>.'],

        ['<b>Không có thông báo nào.</b> Bạn đưa một ký hiệu đi vòng <code>y → m → y</code> và tin rằng ' +
         'đã trở về như cũ',
         'Khi ký hiệu xuống <code>m</code>, mọi ký hiệu có <code>depends on … =y</code> bị <b>xoá khỏi</b> ' +
         '<code>.config</code> cùng với lựa chọn của chúng. Lên lại <code>y</code> thì chúng quay lại ở ' +
         '<b>mặc định</b>, không phải giá trị cũ.',
         '<code>cp .config .config.backup</code> <b>trước</b> mọi thay đổi, và ' +
         '<code>diff .config.backup .config</code> <b>sau</b> mọi thay đổi — soi cả file chứ không chỉ ' +
         'ký hiệu vừa sửa.'],

        ['<b>Không có thông báo nào.</b> Sau khi nâng kernel, một tính năng đang dùng bỗng nhiên biến ' +
         'thành <code># CONFIG_X is not set</code>',
         '<code>olddefconfig</code> gán mặc định cho mọi ký hiệu mới, trong im lặng. Ký hiệu bị đổi tên ' +
         'giữa hai phiên bản trông y hệt một ký hiệu mới.',
         'Chạy <code>make ARCH=arm64 listnewconfig</code> <b>trước</b> — nó chỉ in ra, không sửa gì. ' +
         'Muốn đọc cả phần trợ giúp thì dùng <code>helpnewconfig</code>. Chỉ chạy ' +
         '<code>olddefconfig</code> sau khi đã đọc danh sách.'],

        ['<b>Không có thông báo nào.</b> Chạy <code>savedefconfig</code> xong, <code>git status</code> ' +
         'không thấy <code>arch/arm64/configs/defconfig</code> thay đổi',
         'Đó là hành vi đúng: <code>savedefconfig</code> ghi ra <code>./defconfig</code> ở <b>gốc cây</b>, ' +
         'không đụng vào <code>arch/</code>. Đã kiểm bằng <code>md5sum</code>: file gốc nguyên vẹn.',
         'Chép tay: <code>cp defconfig arch/arm64/configs/myboard_defconfig</code>. Sau đó dùng được ' +
         'bằng <code>make ARCH=arm64 myboard_defconfig</code> — đúng cách mọi board thật lưu cấu hình.']
      ]},

    /* ══════════════════════════════════════════════════════════════════
       Tóm tắt
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Tóm tắt', items: [
      '<b>Kconfig là một ngôn ngữ, không phải một định dạng file.</b> Cây 6.18.45 có <b>1 880</b> file Kconfig khai báo <b>22 125</b> ký hiệu, ràng buộc nhau bằng <b>19 717</b> dòng <code>depends on</code> và <b>21 923</b> dòng <code>select</code>. Hai dòng <code>LEX</code>/<code>YACC</code> ở lần <code>make defconfig</code> đầu tiên là bằng chứng: kernel phải biên dịch một trình phân tích cú pháp cho nó.',
      '<b>Một mục Kconfig có sáu phần:</b> tên ký hiệu, kiểu (<code>bool</code> / <code>tristate</code> / <code>string</code> / <code>int</code> / <code>hex</code>), <code>prompt</code>, <code>depends on</code>, <code>select</code>, <code>help</code>. <b>Không có prompt thì không hiện trong <code>menuconfig</code></b> — như <code>SERIAL_CORE</code>, ký hiệu chỉ bật được qua <code>select</code> từ 72 driver khác.',
      '<b><code>defconfig</code> 1 824 dòng giãn thành <code>.config</code> 11 727 dòng</b>: 544 dòng trống + 6 520 chú thích (trong đó <b>4 950</b> dòng <code>is not set</code>) + <b>4 663</b> dòng có giá trị, chia ra <b>3 273</b> <code>=y</code> và <b>1 273</b> <code>=m</code>.',
      '<b>Một ký hiệu có bốn trạng thái, không phải ba.</b> Trạng thái thứ tư — <b>vắng mặt hoàn toàn</b>, như <code>CONFIG_X86_LOCAL_APIC</code> trên arm64 — nghĩa là <code>depends on</code> không thoả, và bật thẳng nó thì <code>olddefconfig</code> <b>lặng lẽ vứt đi</b>.',
      '<b><code>y</code> và <code>m</code> khác nhau ở <i>tên macro</i>, không chỉ ở nơi lưu.</b> <code>=y</code> → <code>#define CONFIG_X 1</code>; <code>=m</code> → <code>#define CONFIG_X_MODULE 1</code> và <b>không</b> có <code>CONFIG_X</code>. Vì thế <code>#ifdef CONFIG_X</code> âm thầm sai với ký hiệu <code>tristate</code> — dùng <code>IS_ENABLED()</code>, macro xuất hiện <b>9 334 lần</b> trong cây.',
      '<b><code>.config</code> không được ai đọc trực tiếp.</b> <code>syncconfig</code> dịch nó thành <code>include/config/auto.conf</code> (make đọc, qua dòng <code>include</code> ở <code>Makefile:798</code>) và <code>include/generated/autoconf.h</code> (<b>4 663</b> dòng <code>#define</code>, gcc đọc). Đó là mắt xích còn thiếu của <code>obj-$(CONFIG_X)</code> ở <b>Bài 38</b>.',
      '<b><code>.config</code> không có Undo.</b> Vòng <code>y → m → y</code> làm <code>SERIAL_AMBA_PL011_CONSOLE</code> mất lựa chọn và quay lại ở mặc định <code>n</code> — một kernel build được nhưng không in ra dòng boot log nào. Luôn <code>cp</code> trước, <code>diff</code> sau.',
      '<b>Commit <code>defconfig</code>, không commit <code>.config</code>.</b> <code>savedefconfig</code> rút 11 727 dòng còn <b>1 755</b> (nhỏ hơn <b>7,4 lần</b>) và vòng khứ hồi <b>không sai một byte</b>. Khi nâng kernel: <code>listnewconfig</code> để đọc → <code>olddefconfig</code> để hợp thức hoá → <code>savedefconfig</code> để cất đi.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Bạn đã có <code>.config</code> 11 727 dòng cho ARM64. <b>Bài 40 — Build kernel ARM64 và boot</b> ' +
      'sẽ đem chính file đó cho <code>aarch64-linux-gnu-gcc</code> từ <b>Chặng 04</b>, biên dịch ra ' +
      '<code>Image</code> và <b>1 273 module</b> <code>.ko</code> — đúng con số bạn vừa đếm ' +
      '<code>=m</code> ở bước 1 — rồi boot nó trong QEMU như ở <b>Bài 32</b>.</p>' +
      '<p>Và bạn sẽ thấy hai con số của bài này biến thành thời gian thật: lần build đầu tiên biên dịch ' +
      'đúng những file mà <code>obj-y</code> và <code>obj-m</code> chọn ra từ <code>auto.conf</code>. ' +
      'Nếu <code>CONFIG_SERIAL_AMBA_PL011_CONSOLE</code> của bạn đang là <code>is not set</code> vì đã ' +
      'vấp phải cái bẫy ở bước 4, kernel sẽ boot xong mà màn hình QEMU vẫn trống trơn. Hãy kiểm lại ' +
      'ngay bây giờ bằng <code>grep -n CONFIG_SERIAL_AMBA_PL011_CONSOLE .config</code> — phải là ' +
      '<code>=y</code>.</p>' },

    { t: 'hr' }
  ],

  quiz: [
    { q: 'Bạn đổi <code>CONFIG_SERIAL_AMBA_PL011</code> từ <code>y</code> sang <code>m</code>, chạy <code>olddefconfig</code>, rồi đổi lại thành <code>y</code> và chạy <code>olddefconfig</code> lần nữa. So với ban đầu, <code>.config</code> giờ thế nào?',
      opts: [
        'Giống hệt ban đầu, vì ký hiệu đã trở về đúng giá trị cũ',
        '<code>CONFIG_SERIAL_AMBA_PL011_CONSOLE</code> đổi từ <code>=y</code> thành <code># … is not set</code>',
        'Cả hai ký hiệu đều thành <code>=m</code>, vì <code>olddefconfig</code> giữ giá trị gần nhất',
        '<code>olddefconfig</code> báo lỗi vì phát hiện xung đột phụ thuộc'
      ],
      a: 1,
      why: 'Ký hiệu console có <code>depends on SERIAL_AMBA_PL011=y</code>. Khi driver xuống ' +
           '<code>m</code>, điều kiện không thoả nên ký hiệu console <b>bị xoá khỏi</b> ' +
           '<code>.config</code> — cùng với nó là lựa chọn <code>y</code> mà không chỗ nào lưu lại. ' +
           'Khi driver lên lại <code>y</code>, ký hiệu xuất hiện trở lại và <code>olddefconfig</code> ' +
           'trả lời cho nó bằng <b>mặc định của Kconfig</b>, tức <code>n</code>. Hệ quả thực tế: kernel ' +
           'build được nhưng không in ra dòng boot log nào. Đây là lý do quy tắc ' +
           '<code>cp</code>-trước-<code>diff</code>-sau không phải chuyện cẩn thận thừa.' },

    { q: '<code>.config</code> có <code>CONFIG_BTRFS_FS=m</code>. Trong một file <code>.c</code> của kernel, đoạn <code>#ifdef CONFIG_BTRFS_FS</code> … <code>#endif</code> sẽ ra sao?',
      opts: [
        'Được biên dịch, vì tính năng đang bật',
        'Bị bỏ qua hoàn toàn, vì <code>autoconf.h</code> chỉ định nghĩa <code>CONFIG_BTRFS_FS_MODULE</code>',
        'Build dừng lại với cảnh báo “symbol is a module”',
        'Được biên dịch nhưng chỉ khi module đã được nạp lúc chạy'
      ],
      a: 1,
      why: 'Đã kiểm trực tiếp trên <code>include/generated/autoconf.h</code>: có dòng ' +
           '<code>#define CONFIG_BTRFS_FS_MODULE 1</code>, còn số dòng ' +
           '<code>#define CONFIG_BTRFS_FS 1</code> là <b>0</b>. Với trình biên dịch, ' +
           '<code>CONFIG_BTRFS_FS</code> không tồn tại, nên khối <code>#ifdef</code> bị loại bỏ — ' +
           '<b>không cảnh báo, không lỗi build</b>, chỉ có một tính năng lặng lẽ không chạy. Cách viết ' +
           'đúng là <code>IS_ENABLED(CONFIG_BTRFS_FS)</code>, macro kiểm cả hai tên; nó xuất hiện 9 334 ' +
           'lần trong cây chính vì lý do này. Lưu ý “bỏ qua lúc biên dịch” khác hẳn “chưa nạp lúc chạy”: ' +
           'đoạn mã đó không hề tồn tại trong file <code>.o</code>.' },

    { q: 'Bạn chạy <code>./scripts/config --disable SERIAL_CORE</code> và <code>grep</code> xác nhận dòng đã thành <code># CONFIG_SERIAL_CORE is not set</code>. Sau <code>make ARCH=arm64 olddefconfig</code>, nó lại là <code>=y</code>. Vì sao?',
      opts: [
        '<code>scripts/config</code> đã ghi hỏng file nên <code>conf</code> phải khôi phục từ <code>.config.old</code>',
        'Có ký hiệu khác đang bật <code>select SERIAL_CORE</code>, và <code>select</code> ép bật bất kể lựa chọn của bạn',
        '<code>SERIAL_CORE</code> là <code>def_bool y</code> nên không bao giờ tắt được trên bất kỳ cấu hình nào',
        '<code>olddefconfig</code> luôn khôi phục mọi ký hiệu <code>tristate</code> về giá trị mặc định'
      ],
      a: 1,
      why: 'Riêng <code>drivers/tty/serial/Kconfig</code> có <b>72</b> dòng ' +
           '<code>select SERIAL_CORE</code>. Chỉ cần <i>một</i> driver trong số đó đang bật là ' +
           '<code>SERIAL_CORE</code> bị ép lên <code>y</code>. <code>conf</code> không coi đây là xung ' +
           'đột nên không in cảnh báo nào. Muốn tắt nó thì phải tắt hết những gì select nó — nghĩa là ' +
           'câu hỏi “làm sao tắt <code>SERIAL_CORE</code>” là câu hỏi sai. Phản xạ đúng: bấm <kbd>/</kbd> ' +
           'trong <code>menuconfig</code> và đọc dòng <code>Selected by:</code> để biết <b>ai</b> đang ' +
           'bật nó.' },

    { q: 'Một đồng nghiệp báo: cấu hình xong, build xong, nhưng kernel không boot trên board ARM64. Bạn mở <code>.config</code> của họ, dòng 3 ghi <code># Linux/x86 6.18.45 Kernel Configuration</code>. Chẩn đoán?',
      opts: [
        'Họ dùng sai phiên bản cross-compiler; chỉ cần build lại với <code>CROSS_COMPILE=</code> đúng',
        'Họ quên <code>ARCH=arm64</code>, nên toàn bộ 11 727 dòng cấu hình là của kiến trúc x86 — phải xoá <code>.config</code> và cấu hình lại',
        'Dòng 3 chỉ là chú thích do <code>conf</code> sinh, không ảnh hưởng gì tới bản build',
        'Thiếu <code>CONFIG_ARM64=y</code>; thêm dòng đó vào <code>.config</code> là xong'
      ],
      a: 1,
      why: 'Không có <code>ARCH=</code>, Kbuild lấy kiến trúc của <b>máy chủ</b> và lấy khuôn từ ' +
           '<code>arch/x86/configs/x86_64_defconfig</code> — <b>không hề báo lỗi</b>. Dòng 3 của ' +
           '<code>.config</code> là cách kiểm nhanh nhất, và <code>head -3 .config</code> nên thành phản ' +
           'xạ. Đáp án cuối sai vì thêm tay <code>CONFIG_ARM64=y</code> không sửa được gì: lần ' +
           '<code>olddefconfig</code> tiếp theo sẽ vứt nó đi (ký hiệu không tồn tại trong không gian cấu ' +
           'hình x86), và 11 726 dòng còn lại vẫn là x86. Cấu hình sai kiến trúc phải bỏ, không sửa.' },

    { q: 'Board của bạn đã chạy ổn định. Bạn muốn lưu cấu hình vào git để đồng nghiệp tái tạo được và để nâng kernel sau này. Nên commit file nào?',
      opts: [
        '<code>.config</code>, vì nó đầy đủ nhất — 11 727 dòng, không thiếu ký hiệu nào',
        'File <code>./defconfig</code> do <code>savedefconfig</code> sinh ra, 1 755 dòng',
        'Cả hai, để có bản đầy đủ lẫn bản rút gọn',
        '<code>include/config/auto.conf</code>, vì đó mới là file hệ thống build thật sự đọc'
      ],
      a: 1,
      why: '<code>savedefconfig</code> giữ lại đúng những gì <b>khác mặc định</b> — phần “quyết định” — ' +
           'và bỏ đi phần “kết quả” mà <code>conf</code> tự tính lại được. Vòng khứ hồi đã được kiểm: ' +
           '1 755 dòng giãn lại thành đúng 11 727 dòng, <code>diff</code> sạch. <code>.config</code> ' +
           'không nên commit vì nó chứa cả sự thật đã hết hạn như ' +
           '<code>CONFIG_CC_VERSION_TEXT="gcc …"</code> — đo từ máy bạn lúc đó — và vì sang phiên bản ' +
           'kernel khác nó đầy ký hiệu đã bị xoá. <code>auto.conf</code> thì càng không: nó là file sinh ' +
           'ra, tái tạo được từ <code>.config</code> trong vài giây.' },

    { q: 'Trong <code>menuconfig</code>, mục <i>Enable the block layer</i> hiện dấu <code>-*-</code> và bấm <kbd>n</kbd> không có tác dụng. Điều đó nghĩa là gì?',
      opts: [
        'Ký hiệu đang bật nhưng bạn không có quyền đổi — vì bị <code>select</code>, hoặc vì prompt của nó bị khoá sau một điều kiện chưa thoả',
        'Ký hiệu bị hỏng trong file Kconfig và cần chạy lại <code>make defconfig</code>',
        'Ký hiệu đang ở mức module nên phải bấm <kbd>m</kbd> trước rồi mới bấm <kbd>n</kbd> được',
        'Terminal của bạn quá nhỏ nên lxdialog không nhận phím'
      ],
      a: 0,
      why: '<code>-*-</code> nghĩa là “đang bật và bạn không đổi được”. Với <code>BLOCK</code>, ' +
           '<code>block/Kconfig</code> viết <code>bool "Enable the block layer" if EXPERT</code> — ' +
           'mệnh đề <code>if</code> gắn vào <b>prompt</b> chứ không gắn vào ký hiệu, nên ký hiệu vẫn ' +
           '<code>default y</code> nhưng prompt chỉ hiện khi <code>CONFIG_EXPERT</code> bật. ' +
           '<i>Cryptographic API</i> cũng hiện <code>-*-</code> nhưng vì lý do khác: nó bị nhiều ký hiệu ' +
           '<code>select</code>. Phân biệt với <code>{M}</code>: dấu đó nghĩa là bị select lên mức ' +
           '<code>m</code>, không hạ xuống <code>n</code> được nhưng vẫn nâng lên <code>y</code> được.' }
  ]
});

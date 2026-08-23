/* ============================================================
   BÀI 5 — Hệ thống file Linux (FHS)
   Chặng 01 · Linux căn bản
   ============================================================ */
Lesson.register({
  id: 'bai-05',
  title: 'Hệ thống file Linux (FHS)',
  minutes: 45,
  practice: 'Thực hành 25 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Windows có ổ C, ổ D. Linux không có ổ nào cả — chỉ có <b>một cây duy nhất</b> bắt đầu từ ' +
    '<code>/</code>, và mọi thứ khác được ghép vào cây đó. Bài này giải thích cây ấy được sắp xếp ' +
    'theo luật nào, rồi dẫn bạn tới hai thư mục quan trọng bậc nhất với nghề nhúng: ' +
    '<code>/proc</code> và <code>/sys</code>. Chúng <b>không nằm trên đĩa</b>. Bạn sẽ đọc tên CPU, ' +
    'địa chỉ MAC và dung lượng ổ cứng của máy mình chỉ bằng <code>cat</code> — và hiểu vì sao mọi ' +
    'driver bạn viết ở Chặng 10 rồi cũng sẽ xuất hiện ở đó dưới dạng file.',

  goals: [
    'Giải thích được câu "mọi thứ là file" và nêu được các loại file khác nhau trong Linux',
    'Nêu đúng vai trò của <code>/bin /etc /dev /proc /sys /lib /usr /var /tmp /boot</code>',
    'Phân biệt đường dẫn tuyệt đối và tương đối, dùng thành thạo <code>.</code> <code>..</code> <code>~</code> <code>-</code>',
    'Giải thích được vì sao <code>/proc</code> và <code>/sys</code> chiếm 0 byte đĩa nhưng vẫn đọc ra dữ liệu',
    'Đọc được thông tin phần cứng của máy mình qua <code>/proc</code> và <code>/sys</code>',
    'Chỉ ra được thư mục nào bắt buộc phải có trên một rootfs nhúng tối thiểu'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. MỌI THỨ LÀ FILE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Mọi thứ là file — câu này nghĩa là gì' },

    { t: 'p', x:
      'Đây là câu khẩu hiệu bạn sẽ nghe suốt đời làm Linux, và nó thường bị hiểu hời hợt. ' +
      'Nghĩa chính xác của nó là: <b>rất nhiều thứ không phải dữ liệu vẫn được truy cập bằng đúng bộ ' +
      'thao tác dành cho file</b> — <code>open</code>, <code>read</code>, <code>write</code>, ' +
      '<code>close</code>.' },

    { t: 'p', x:
      'Bàn phím, ổ cứng, cổng UART, một tiến trình đang chạy, thậm chí bộ sinh số ngẫu nhiên của ' +
      'kernel — tất cả đều xuất hiện dưới dạng một đường dẫn mà bạn có thể <code>cat</code>. ' +
      'Nhờ vậy bạn chỉ cần học <b>một</b> bộ lệnh thay vì một bộ cho mỗi loại thiết bị.' },

    { t: 'table',
      head: ['Ký tự đầu ở <code>ls -l</code>', 'Loại', 'Ví dụ trên máy bạn'],
      rows: [
        ['<code>-</code>', 'File thường', '<code>/etc/hostname</code>'],
        ['<code>d</code>', 'Thư mục <i>(directory)</i>', '<code>/etc</code>'],
        ['<code>l</code>', 'Liên kết mềm <i>(symlink)</i>', '<code>/bin -&gt; usr/bin</code>'],
        ['<code>c</code>', '<b>Thiết bị ký tự</b> — đọc/ghi từng byte', '<code>/dev/null</code>, <code>/dev/kvm</code>, cổng UART'],
        ['<code>b</code>', '<b>Thiết bị khối</b> — đọc/ghi từng khối', '<code>/dev/sda</code> — ổ đĩa'],
        ['<code>p</code>', 'Ống có tên <i>(FIFO)</i>', 'Sẽ tự tạo ở Bài 23'],
        ['<code>s</code>', 'Socket', '<code>/run/…</code> — Bài 24']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao dân nhúng sống bằng chữ c và chữ b', x:
      '<p>Hai loại <b>thiết bị ký tự</b> và <b>thiết bị khối</b> chính là mặt tiền của driver. ' +
      'Khi bạn viết driver ở Chặng 10, sản phẩm cuối cùng người dùng nhìn thấy là một file trong ' +
      '<code>/dev</code>.</p>' +
      '<p>Chương trình ứng dụng bật LED bằng cách <code>write()</code> vào một file. Nó không cần biết ' +
      'gì về thanh ghi phần cứng — đó là việc của driver. Toàn bộ Bài 52 xoay quanh việc tạo ra ' +
      'một file như thế.</p>' },

    /* ══════════════════════════════════════════════
       2. CÂY THƯ MỤC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một cây duy nhất, không có ổ đĩa' },

    { t: 'p', x:
      'Trên Windows, mỗi ổ đĩa là một cây riêng: <code>C:\\</code>, <code>D:\\</code>. Trên Linux chỉ ' +
      'có <b>một</b> gốc là <code>/</code>, và mọi thiết bị lưu trữ khác được <b>gắn</b> (mount) vào ' +
      'một thư mục nào đó trong cây đó. Cắm USB vào, nó xuất hiện ở <code>/media/…</code> chứ không ' +
      'phải "ổ E".' },

    { t: 'p', x:
      'Cách sắp xếp cây này không tuỳ hứng — nó theo một chuẩn tên là <b>FHS</b> ' +
      '(Filesystem Hierarchy Standard). Nhờ FHS, bạn biết chắc file cấu hình nằm trong ' +
      '<code>/etc</code> dù đang ngồi trước Ubuntu, Buildroot hay một board lạ hoắc.' },

    { t: 'fig',
      cap: 'Cây thư mục gốc trên chính máy bạn. Bốn ô viền nhấn mạnh là bốn thư mục quyết định với nghề nhúng — và hai trong số đó không hề tồn tại trên đĩa.',
      svg:
      '<svg viewBox="0 0 720 372" width="720" role="img" aria-label="Sơ đồ cây thư mục gốc của Linux theo chuẩn FHS">' +
        '<rect class="d-box-p" x="20" y="14" width="86" height="34" rx="8" stroke-width="2"/>' +
        '<text class="d-t" x="63" y="36" text-anchor="middle">/</text>' +

        '<path class="d-line" d="M63 48 V352" stroke-width="1"/>' +

        /* hàng 1 */
        '<path class="d-line" d="M63 72 H104" stroke-width="1"/>' +
        '<rect class="d-box" x="108" y="56" width="120" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-tm" x="120" y="76">/bin  /sbin</text>' +
        '<text class="d-ts" x="240" y="76">Chương trình thực thi — nay chỉ là liên kết tới /usr</text>' +

        '<path class="d-line" d="M63 110 H104" stroke-width="1"/>' +
        '<rect class="d-box" x="108" y="94" width="120" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-tm" x="120" y="114">/etc</text>' +
        '<text class="d-ts" x="240" y="114">Toàn bộ cấu hình hệ thống, dạng văn bản thuần</text>' +

        '<path class="d-line" d="M63 148 H104" stroke-width="1"/>' +
        '<rect class="d-box-a" x="108" y="132" width="120" height="32" rx="6" stroke-width="2"/>' +
        '<text class="d-tm" x="120" y="152">/dev</text>' +
        '<text class="d-ts" x="240" y="152">Mọi thiết bị hiện ra ở đây dưới dạng file</text>' +

        '<path class="d-line" d="M63 186 H104" stroke-width="1"/>' +
        '<rect class="d-box-a" x="108" y="170" width="120" height="32" rx="6" stroke-width="2"/>' +
        '<text class="d-tm" x="120" y="190">/proc</text>' +
        '<text class="d-ts" x="240" y="190">Tiến trình và trạng thái kernel — 0 byte trên đĩa</text>' +

        '<path class="d-line" d="M63 224 H104" stroke-width="1"/>' +
        '<rect class="d-box-a" x="108" y="208" width="120" height="32" rx="6" stroke-width="2"/>' +
        '<text class="d-tm" x="120" y="228">/sys</text>' +
        '<text class="d-ts" x="240" y="228">Cây thiết bị của kernel — 0 byte trên đĩa</text>' +

        '<path class="d-line" d="M63 262 H104" stroke-width="1"/>' +
        '<rect class="d-box" x="108" y="246" width="120" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-tm" x="120" y="266">/usr  /lib</text>' +
        '<text class="d-ts" x="240" y="266">Chương trình và thư viện chia sẻ — phần to nhất</text>' +

        '<path class="d-line" d="M63 300 H104" stroke-width="1"/>' +
        '<rect class="d-box" x="108" y="284" width="120" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-tm" x="120" y="304">/var  /tmp  /run</text>' +
        '<text class="d-ts" x="240" y="304">Dữ liệu thay đổi khi chạy: log, khoá, file tạm</text>' +

        '<path class="d-line" d="M63 338 H104" stroke-width="1"/>' +
        '<rect class="d-box-w" x="108" y="322" width="120" height="32" rx="6" stroke-width="1.5"/>' +
        '<text class="d-tm" x="120" y="342">/boot</text>' +
        '<text class="d-ts" x="240" y="342">Kernel và bootloader — TRỐNG RỖNG trên WSL2</text>' +
      '</svg>' },

    { t: 'table',
      head: ['Thư mục', 'Chứa gì', 'Vì sao dân nhúng quan tâm'],
      rows: [
        ['<code>/bin</code>', 'Lệnh cơ bản: <code>ls</code>, <code>cat</code>, <code>cp</code>',
         'Trên thiết bị nhúng, toàn bộ thư mục này thường chỉ là <b>một</b> file BusyBox với hàng trăm liên kết trỏ vào (Bài 47)'],
        ['<code>/sbin</code>', 'Lệnh quản trị: <code>mount</code>, <code>ip</code>, <code>init</code>',
         '<code>s</code> là <i>system</i>, không phải <i>super</i> — chỉ là quy ước, không phải cơ chế bảo mật'],
        ['<code>/etc</code>', 'Cấu hình, <b>toàn bộ là văn bản thuần</b>',
         'Không có registry nhị phân như Windows. Sửa được bằng vim qua cáp UART, so sánh được bằng <code>diff</code>, quản lý được bằng Git'],
        ['<code>/dev</code>', 'File thiết bị',
         '<b>Cửa vào phần cứng.</b> Driver của bạn xuất hiện ở đây (Bài 52)'],
        ['<code>/proc</code>', 'Tiến trình và trạng thái kernel',
         'Công cụ chẩn đoán số một. Bài 20 sẽ mổ xẻ <code>/proc/&lt;pid&gt;</code>'],
        ['<code>/sys</code>', 'Cây thiết bị, bus và driver',
         'Nơi bạn xuất thuộc tính driver ra cho userspace (Bài 53)'],
        ['<code>/lib</code>', 'Thư viện chia sẻ và <b>module kernel</b>',
         '<code>/lib/modules/&lt;phiên bản&gt;/</code> là nơi các file <code>.ko</code> của bạn nằm (Bài 50)'],
        ['<code>/usr</code>', 'Phần lớn phần mềm đã cài',
         'Trên hệ nhúng, đây là thư mục cần cắt gọt đầu tiên khi thiếu flash'],
        ['<code>/var</code>', 'Dữ liệu biến đổi: log, hàng đợi, cache',
         'Thường phải cho ghi được trong khi phần còn lại chỉ đọc — Bài 68'],
        ['<code>/tmp</code>', 'File tạm, xoá khi khởi động lại',
         'Trên thiết bị nhúng thường là RAM disk để tránh mòn flash'],
        ['<code>/run</code>', 'Trạng thái lúc chạy: file PID, socket',
         'Luôn nằm trong RAM, luôn rỗng sau khi bật máy'],
        ['<code>/boot</code>', 'Kernel, initramfs, cấu hình bootloader',
         '<b>Trống trên WSL2</b> — bằng chứng WSL2 không có bootloader, như bạn đã thấy ở Bài 1'],
        ['<code>/opt</code>', 'Phần mềm bên thứ ba, đóng gói riêng',
         'Nơi hay đặt phần mềm ứng dụng của chính công ty bạn trên board']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao /bin lại là một liên kết', x:
      '<p>Ở phần thực hành bạn sẽ thấy <code>/bin -&gt; usr/bin</code>, <code>/lib -&gt; usr/lib</code>, ' +
      '<code>/sbin -&gt; usr/sbin</code>. Đây là kết quả của cuộc dọn dẹp mang tên <b>usr-merge</b>.</p>' +
      '<p>Ngày xưa <code>/bin</code> chứa lệnh tối cần thiết để khởi động, còn <code>/usr</code> có thể ' +
      'nằm trên một đĩa khác gắn vào sau. Từ khi initramfs làm thay việc đó, sự chia đôi này chỉ còn ' +
      'gây rắc rối, nên các bản phân phối gộp lại và để liên kết ở chỗ cũ cho tương thích.</p>' +
      '<p>Đáng chú ý với bạn: nhiều hệ nhúng <b>vẫn giữ</b> cách chia cũ. Đừng ngạc nhiên khi thấy hai kiểu.</p>' },

    /* ══════════════════════════════════════════════
       3. ĐƯỜNG DẪN
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đường dẫn tuyệt đối và tương đối' },

    { t: 'p', x:
      'Một đường dẫn bắt đầu bằng <code>/</code> là <b>tuyệt đối</b>: nó chỉ đúng một chỗ, bất kể bạn ' +
      'đang đứng ở đâu. Mọi đường dẫn khác là <b>tương đối</b>, tính từ thư mục hiện tại.' },

    { t: 'table',
      head: ['Ký hiệu', 'Nghĩa', 'Ví dụ'],
      rows: [
        ['<code>/</code>', 'Gốc của cây, hoặc dấu ngăn giữa các cấp', '<code>/usr/bin/gcc</code>'],
        ['<code>.</code>', 'Thư mục hiện tại', '<code>./hello.sh</code> — chạy script ở ngay đây'],
        ['<code>..</code>', 'Thư mục cha', '<code>cd ../..</code> — lùi hai cấp'],
        ['<code>~</code>', 'Thư mục nhà của bạn', '<code>~/embedded</code> ≡ <code>/home/shinarus/embedded</code>'],
        ['<code>-</code>', 'Thư mục <b>vừa rời khỏi</b>', '<code>cd -</code> — nhảy qua nhảy lại hai chỗ'],
        ['Không có tiền tố', 'Tương đối, tính từ chỗ đang đứng', '<code>cd docs</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Vì sao phải viết ./hello.sh mà không phải hello.sh', x:
      '<p>Nhớ lại Bài 4: bash tìm lệnh trong <code>$PATH</code>, và <b>thư mục hiện tại không nằm trong ' +
      '<code>$PATH</code></b>. Gõ trống không <code>hello.sh</code> sẽ nhận ' +
      '<code>command not found</code> dù file nằm ngay trước mắt.</p>' +
      '<p>Đây <b>không phải</b> thiếu sót — đó là một quyết định bảo mật cố ý. Nếu thư mục hiện tại nằm ' +
      'trong <code>$PATH</code>, kẻ tấn công chỉ cần đặt một file tên <code>ls</code> vào thư mục dùng ' +
      'chung và chờ ai đó gõ <code>ls</code> ở đó.</p>' +
      '<p>Viết <code>./hello.sh</code> là nói rõ "chạy file ở đúng chỗ này", không liên quan gì đến ' +
      '<code>$PATH</code>.</p>' },

    { t: 'cal', kind: 'tip', title: 'Quy tắc dùng trong script', x:
      '<p>Trong <b>script</b> và <b>đơn vị dịch vụ khởi động</b>, hãy luôn dùng đường dẫn tuyệt đối. ' +
      'Script khởi động của thiết bị chạy trong một thư mục mà bạn không kiểm soát — thường là ' +
      '<code>/</code>. Một đường dẫn tương đối trong đó là quả bom hẹn giờ.</p>' +
      '<p>Gõ tay thì ngược lại: đường dẫn tương đối nhanh hơn nhiều.</p>' },

    /* ══════════════════════════════════════════════
       4. /PROC VÀ /SYS
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '/proc và /sys — hai thư mục không nằm trên đĩa' },

    { t: 'p', x:
      'Đây là phần quan trọng nhất của bài, và cũng là phần khiến người mới bối rối nhất. ' +
      '<code>/proc</code> và <code>/sys</code> trông y hệt thư mục bình thường: có file, ' +
      '<code>cat</code> ra nội dung, <code>ls</code> ra danh sách. Nhưng chúng chiếm ' +
      '<b>đúng 0 byte</b> trên ổ cứng.' },

    { t: 'p', x:
      'Nội dung của chúng được kernel <b>tạo ra ngay lúc bạn đọc</b>. Không có gì được lưu sẵn. ' +
      'Khi bạn <code>cat /proc/uptime</code>, kernel nhìn vào đồng hồ nội bộ và sinh ra chuỗi ký tự ' +
      'ngay tại thời điểm đó — hai lần đọc liên tiếp cho hai kết quả khác nhau.' },

    { t: 'fig',
      cap: 'Cùng một lời gọi read(), hai đường đi hoàn toàn khác nhau. Đây là lý do /proc chiếm 0 byte đĩa mà vẫn trả về dữ liệu, và vì sao ls -l luôn báo kích thước 0.',
      svg:
      '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="So sánh đường đi của read trên file thường và trên file trong proc">' +
        '<rect class="d-box-p" x="230" y="12" width="260" height="36" rx="8" stroke-width="2"/>' +
        '<text class="d-t" x="360" y="35" text-anchor="middle">Chương trình gọi read()</text>' +

        '<path class="d-line" d="M300 48 V72" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M295 72 l5 8 5 -8 z"/>' +
        '<path class="d-line" d="M420 48 V72" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M415 72 l5 8 5 -8 z"/>' +

        /* trái: file thường */
        '<rect class="d-box-g" x="24" y="80" width="320" height="164" rx="10" stroke-width="2"/>' +
        '<text class="d-t" x="184" y="104" text-anchor="middle">/etc/hostname — file thật</text>' +

        '<rect class="d-box" x="52" y="116" width="264" height="30" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="184" y="136" text-anchor="middle">Trình điều khiển ext4</text>' +

        '<path class="d-line" d="M184 146 V162" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M179 162 l5 8 5 -8 z"/>' +

        '<rect class="d-box" x="52" y="170" width="264" height="30" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="184" y="190" text-anchor="middle">Đọc khối dữ liệu từ ổ đĩa</text>' +

        '<text class="d-ts" x="184" y="224" text-anchor="middle">Dữ liệu có sẵn từ trước, tồn tại sau khi tắt máy</text>' +

        /* phải: proc */
        '<rect class="d-box-a" x="376" y="80" width="320" height="164" rx="10" stroke-width="2"/>' +
        '<text class="d-t" x="536" y="104" text-anchor="middle">/proc/uptime — file giả</text>' +

        '<rect class="d-box" x="404" y="116" width="264" height="30" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t" x="536" y="136" text-anchor="middle">Hàm xử lý của procfs</text>' +

        '<path class="d-line" d="M536 146 V162" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M531 162 l5 8 5 -8 z"/>' +

        '<rect class="d-box-p" x="404" y="170" width="264" height="30" rx="6" stroke-width="2"/>' +
        '<text class="d-t" x="536" y="190" text-anchor="middle">Kernel sinh chuỗi ngay lúc này</text>' +

        '<text class="d-ts" x="536" y="224" text-anchor="middle">Không chạm đĩa. Đọc hai lần ra hai kết quả khác nhau</text>' +
      '</svg>' },

    { t: 'table',
      head: ['', '<code>/proc</code>', '<code>/sys</code>'],
      rows: [
        ['Kiểu hệ thống file', '<code>proc</code>', '<code>sysfs</code>'],
        ['Ra đời', 'Từ rất sớm, kế thừa từ Unix', 'Năm 2002, cùng mô hình driver hiện đại'],
        ['Nội dung chính', '<b>Tiến trình</b> và thông tin kernel chung', '<b>Thiết bị, bus, driver</b> và thuộc tính của chúng'],
        ['Tổ chức', 'Khá lộn xộn, tích tụ theo lịch sử', 'Chặt chẽ: một thư mục là một đối tượng, một file là một thuộc tính'],
        ['Kích thước mỗi file', 'Tuỳ ý, thường nhiều dòng', '<b>Một giá trị mỗi file</b> là quy tắc'],
        ['Ví dụ', '<code>/proc/cpuinfo</code>, <code>/proc/1234/status</code>', '<code>/sys/class/net/eth0/address</code>'],
        ['Ghi vào được không', 'Một số, ví dụ <code>/proc/sys/…</code>', 'Nhiều thuộc tính cho ghi — đây là cách điều khiển driver'],
        ['Bạn sẽ tự tạo ở bài', 'Bài 53', 'Bài 53 và Bài 56']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao đây là kiến thức cốt lõi của nghề, không phải mẹo vặt', x:
      '<p>Trên một board không màn hình, không mạng, chỉ có một cáp UART, <code>/proc</code> và ' +
      '<code>/sys</code> là <b>toàn bộ dụng cụ chẩn đoán</b> của bạn. Kernel có nhận ra con chip I2C ' +
      'không? Xem <code>/sys/bus/i2c/devices/</code>. Driver nào đang giữ thiết bị? ' +
      'Xem <code>/sys/class/…/driver</code>. Tiến trình nào ăn hết RAM? Xem ' +
      '<code>/proc/&lt;pid&gt;/status</code>.</p>' +
      '<p>Quan trọng hơn: khi bạn viết driver, bạn <b>tự tạo ra</b> các file này. Một thuộc tính sysfs ' +
      'là cách chuẩn để chương trình ứng dụng điều khiển phần cứng mà không cần biết gì về thanh ghi. ' +
      'Nói cách khác, hôm nay bạn học đọc, tới Chặng 10 bạn học viết.</p>' },

    { t: 'terms', items: [
      ['procfs', '/proc',
       'Hệ thống file ảo trình bày <b>tiến trình</b> và thông tin kernel. Mỗi tiến trình có một thư mục ' +
       'mang tên PID của nó.'],
      ['sysfs', '/sys',
       'Hệ thống file ảo trình bày <b>mô hình thiết bị</b> của kernel: bus nào có thiết bị nào, ' +
       'driver nào đang phục vụ, thuộc tính ra sao.'],
      ['devtmpfs', '/dev',
       'Hệ thống file trong RAM do kernel tự điền các file thiết bị vào. Trước khi có nó, người ta phải ' +
       'tạo tay từng file bằng <code>mknod</code> — bạn sẽ làm đúng việc đó ở Bài 46.'],
      ['tmpfs', '/tmp, /run',
       'Hệ thống file nằm hoàn toàn trong RAM. Nhanh, và mất sạch khi tắt máy — chính điều bạn muốn ' +
       'cho file tạm trên thiết bị dùng flash.']
    ]},

    /* ══════════════════════════════════════════════
       5. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: đọc phần cứng của máy bạn bằng cat' },

    { t: 'p', x:
      'Toàn bộ phần này chạy trong <b>WSL</b> và <b>không sửa gì</b> — chỉ đọc. Vài con số sẽ khác trên ' +
      'máy bạn (địa chỉ MAC, dung lượng đĩa, thời gian chạy); điều đó bình thường. Cái phải giống là ' +
      '<b>hình dạng</b> của kết quả.' },

    { t: 'steps', items: [

      { title: 'Nhìn toàn cảnh gốc và phát hiện các liên kết',
        blocks: [
          { t: 'code', where: 'wsl', code: 'ls /' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bin   boot  dev  etc  home  init  lib  lib64  lost+found  media  mnt\n' +
            'opt   proc  root  run  sbin  snap  srv  sys  tmp  usr  var' },

          { t: 'p', x:
            'Bây giờ xem cùng danh sách đó ở dạng chi tiết. Hãy chú ý <b>ký tự đầu tiên</b> của mỗi dòng:' },
          { t: 'code', where: 'wsl', code: 'ls -l /' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'lrwxrwxrwx   1 root root       7 Apr 20 15:46 bin -> usr/bin\n' +
            'drwxr-xr-x   2 root root    4096 Apr 20 15:46 boot\n' +
            'drwxr-xr-x  15 root root    3840 Aug  1 15:44 dev\n' +
            'drwxr-xr-x  94 root root    4096 Aug  1 15:44 etc\n' +
            'drwxr-xr-x   3 root root    4096 Jul 31 21:35 home\n' +
            'lrwxrwxrwx   1 root root       7 Apr 20 15:46 lib -> usr/lib\n' +
            'lrwxrwxrwx   1 root root       9 Apr 20 15:46 lib64 -> usr/lib64\n' +
            'dr-xr-xr-x 252 root root       0 Aug  1 15:44 proc\n' +
            'lrwxrwxrwx   1 root root       8 Apr 20 15:46 sbin -> usr/sbin\n' +
            'dr-xr-xr-x  13 root root       0 Aug  1 15:43 sys\n' +
            'drwxr-xr-x  14 root root    4096 Jul 31 22:04 usr' },

          { t: 'cal', kind: 'info', title: 'Ba điều đọc được ngay từ kết quả này', x:
            '<p><b>Một.</b> <code>bin</code>, <code>lib</code>, <code>lib64</code>, <code>sbin</code> bắt ' +
            'đầu bằng chữ <code>l</code> và có mũi tên — chúng là liên kết mềm trỏ vào <code>/usr</code>. ' +
            'Đó là usr-merge đã nói ở trên.</p>' +
            '<p><b>Hai.</b> <code>proc</code> và <code>sys</code> có kích thước <b>0</b>, trong khi mọi ' +
            'thư mục thật đều là 4096. Đây là dấu hiệu đầu tiên cho thấy chúng không nằm trên đĩa.</p>' +
            '<p><b>Ba.</b> Cột số ngay sau phần quyền là số liên kết. <code>proc</code> có <b>252</b> — ' +
            'con số này đổi theo hoạt động của tiến trình/luồng trên máy, và sẽ được lần lại chính xác ' +
            'ngay bên dưới.</p>' },

          { t: 'p', x: 'Và kiểm chứng lại lời khẳng định từ Bài 1:' },
          { t: 'code', where: 'wsl', code: 'ls -la /boot' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 8\n' +
            'drwxr-xr-x  2 root root 4096 Apr 20 15:46 .\n' +
            'drwxr-xr-x 19 root root 4096 Aug  1 15:44 ..' },

          { t: 'cal', kind: 'why', x:
            '<p>Chỉ có <code>.</code> và <code>..</code>, tức là <b>rỗng hoàn toàn</b>. Trên một máy ' +
            'Linux bình thường, đây là nơi chứa kernel (<code>vmlinuz</code>), initramfs và cấu hình ' +
            'GRUB.</p>' +
            '<p>Trống rỗng vì Windows nạp thẳng kernel vào bộ nhớ máy ảo — không có bootloader nào ' +
            'cần đọc file từ đây. Từ Chặng 05, thư mục tương ứng trên máy ảo QEMU của bạn sẽ ' +
            '<b>không</b> trống, vì lúc đó chính bạn là người đặt kernel vào đó.</p>' }
        ]},

      { title: 'Đi lại trong cây bằng đường dẫn tuyệt đối và tương đối',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai05/a/b/c\n' +
            'cd ~/embedded/bai05/a/b/c\n' +
            'pwd' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/home/shinarus/embedded/bai05/a/b/c' },

          { t: 'cal', kind: 'info', x:
            '<p>Bạn gõ <code>~/embedded/bai05/a/b/c</code>, nhưng <code>pwd</code> in ra ' +
            '<code>/home/shinarus/embedded/bai05/a/b/c</code> — không còn dấu vết của ký tự ' +
            '<code>~</code>. Đúng như bảng ký hiệu ở trên đã nói: <code>~</code> được bash thay bằng ' +
            'đường dẫn tuyệt đối tới thư mục nhà <b>trước khi</b> <code>cd</code> hay <code>mkdir</code> ' +
            'nhìn thấy đối số. <code>pwd</code> không bao giờ trả lời bằng một đường dẫn chứa ' +
            '<code>~</code>, vì bản thân kernel không biết ký hiệu đó nghĩa là gì — với nó chỉ tồn tại ' +
            'đường dẫn tuyệt đối.</p>' },

          { t: 'p', x: 'Lùi hai cấp bằng đường dẫn tương đối, rồi về nhà, rồi quay lại chỗ cũ:' },
          { t: 'code', where: 'wsl', code:
            'cd ../..\n' +
            'pwd\n' +
            'cd ~\n' +
            'pwd\n' +
            'cd -\n' +
            'pwd' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/home/shinarus/embedded/bai05/a\n' +
            '/home/shinarus\n' +
            '/home/shinarus/embedded/bai05/a\n' +
            '/home/shinarus/embedded/bai05/a' },

          { t: 'cmdx', cmd: 'cd -',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['cd', 'Đổi thư mục làm việc. Là builtin — Bài 4 đã giải thích vì sao nó buộc phải thế.', ''],
              ['-', 'Ký hiệu đặc biệt nghĩa là "thư mục vừa rời khỏi", bash lưu trong biến <code>$OLDPWD</code>.',
               'Nhảy qua nhảy lại giữa hai thư mục xa nhau, ví dụ giữa cây mã nguồn kernel và thư mục build.'],
              ['pwd', '<i>print working directory</i> — in đường dẫn tuyệt đối của chỗ đang đứng.',
               '<b>Lệnh đầu tiên nên gõ</b> mỗi khi một lệnh báo "không tìm thấy file". Nguyên nhân thường là bạn đang đứng nhầm chỗ.']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao có 4 dòng kết quả cho 3 lần gọi pwd', x:
            '<p>Dòng 1 và dòng 2 đến từ hai lệnh <code>pwd</code> tường minh, sau <code>cd ../..</code> ' +
            'và <code>cd ~</code>. Nhưng dòng 3 không phải kết quả của <code>pwd</code> — nó đến từ ' +
            'chính <code>cd -</code>. Theo trang hướng dẫn của bash: <b>khi tham số đầu tiên của ' +
            '<code>cd</code> là <code>-</code>, bản thân <code>cd</code> tự in đường dẫn tuyệt đối của ' +
            'thư mục mới ra màn hình</b>, y hệt như vừa gọi thêm một lệnh <code>pwd</code>.</p>' +
            '<p>Dòng 4 mới thật sự là kết quả của lệnh <code>pwd</code> tường minh cuối cùng, và nó ' +
            'trùng khớp tuyệt đối với dòng 3 (<code>.../bai05/a</code>) — bằng chứng rằng ' +
            '<code>cd -</code> đã đưa bạn quay lại đúng thư mục lưu trong <code>$OLDPWD</code>, không ' +
            'lệch một ký tự.</p>' }
        ]},

      { title: 'Đọc thông tin máy bạn từ /proc',
        blocks: [
          { t: 'p', x: 'CPU nào đang chạy, và có mấy nhân:' },
          { t: 'code', where: 'wsl', code:
            'grep \'model name\' /proc/cpuinfo | head -1\n' +
            'grep -c ^processor /proc/cpuinfo' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'model name\t: 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz\n' +
            '6' },

          { t: 'cmdx', cmd: 'grep \'model name\' /proc/cpuinfo | head -1',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['grep \'model name\'', 'Lọc ra mọi dòng chứa cụm đó.',
               '<code>/proc/cpuinfo</code> lặp lại một khối đầy đủ — gồm cả dòng <code>model name</code> ' +
               '— <b>cho mỗi nhân logic</b>, nên với máy 6 nhân thì lệnh này một mình sẽ in ra 6 dòng giống hệt nhau.'],
              ['| head -1', 'Chỉ giữ lại dòng đầu tiên trong ống dẫn đó.',
               'Sáu nhân của bạn cùng một model CPU, nên chỉ cần xem một dòng là đủ; trên chip lai ' +
               '(nhân hiệu năng khác nhân tiết kiệm điện) hai dòng đầu có thể khác nhau.'],
              ['grep -c ^processor', 'Đếm số dòng khớp thay vì in chúng ra.',
               '<code>-c</code> là <i>count</i> — trả về một con số duy nhất, không phải danh sách.'],
              ['^processor', 'Regex neo vào <b>đầu dòng</b>: chỉ khớp dòng bắt đầu đúng bằng chữ <code>processor</code>.',
               'Mỗi khối trong <code>/proc/cpuinfo</code> mở đầu bằng đúng một dòng <code>processor\\t: N</code>, nên đếm dòng này tương đương đếm số nhân logic.']
            ]},

          { t: 'cal', kind: 'info', x:
            '<p>Con số <b>6</b> khớp đúng với <code>nr_cpus=6</code> mà bạn thấy trong ' +
            '<code>/proc/cmdline</code> ở Bài 1 — số nhân do file <code>.wslconfig</code> quy định, ' +
            'không phải số nhân vật lý của máy.</p>' +
            '<p>Con số này sẽ được dùng trực tiếp ở Chặng 07: <code>make -j6</code> để build kernel bằng ' +
            'sáu tiến trình song song.</p>' },

          { t: 'p', x: 'Bộ nhớ, phiên bản kernel, và tham số kernel được truyền lúc khởi động:' },
          { t: 'code', where: 'wsl', code:
            'head -3 /proc/meminfo\n' +
            'cat /proc/version\n' +
            'cat /proc/cmdline' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'MemTotal:        5036152 kB\n' +
            'MemFree:         3572016 kB\n' +
            'MemAvailable:    4469136 kB\n' +
            '\n' +
            'Linux version 6.18.33.2-microsoft-standard-WSL2 (root@f1bbfb02316b) (gcc (GCC) 13.2.0,\n' +
            'GNU ld (GNU Binutils) 2.41) #1 SMP PREEMPT_DYNAMIC Thu Jun 18 21:54:43 UTC 2026\n' +
            '\n' +
            'initrd=\\initrd.img WSL_ROOT_INIT=1 panic=-1 nr_cpus=6 hv_utils.timesync_implicit=1\n' +
            'console=hvc0 debug pty.legacy_count=0 WSL_ENABLE_CRASH_DUMP=1' },

          { t: 'cal', kind: 'info', x:
            '<p><code>MemTotal</code> báo <b>5 036 152 kB</b>, tức xấp xỉ 4.8 GiB — đúng khớp giới hạn ' +
            'RAM mà cùng một file <code>.wslconfig</code> vừa nêu ở trên quy định cho máy ảo WSL2, ' +
            'chứ không phải RAM vật lý của máy Windows.</p>' +
            '<p><code>MemFree</code> (<b>3 572 016 kB</b>) chỉ tính phần RAM hoàn toàn chưa ai đụng ' +
            'tới. <code>MemAvailable</code> (<b>4 469 136 kB</b>) lớn hơn hẳn vì tài liệu kernel định ' +
            'nghĩa nó là "ước lượng lượng RAM có thể dùng để khởi động thêm ứng dụng mới mà không phải ' +
            'swap", cộng thêm cả phần bộ nhớ đang giữ làm cache trang nhưng thu hồi lại được ngay khi ' +
            'cần. Khi lo máy sắp hết RAM, con số cần nhìn là <code>MemAvailable</code>, không phải ' +
            '<code>MemFree</code>.</p>' },

          { t: 'cal', kind: 'tip', title: 'Ba file này bạn sẽ dùng cả đời', x:
            '<p><code>/proc/version</code> cho biết kernel nào, build bằng trình biên dịch nào. ' +
            'Câu hỏi đầu tiên khi một board cư xử lạ.</p>' +
            '<p><code>/proc/cmdline</code> cho biết bootloader đã truyền tham số gì cho kernel. ' +
            'Ở Chặng 06 bạn sẽ tự viết chuỗi này trong biến <code>bootargs</code> của U-Boot, và ' +
            'ở Bài 41 sẽ mổ xẻ từng tham số. Chú ý <code>console=hvc0</code> — nó nói kernel in log ' +
            'ra đâu; trên board thật giá trị này thường là <code>ttyS0</code> hoặc <code>ttyAMA0</code>.</p>' },

          { t: 'p', x:
            'Giờ đến bằng chứng quyết định. Chạy hai lần liên tiếp, cách nhau vài giây:' },
          { t: 'code', where: 'wsl', code:
            'cat /proc/uptime\n' +
            'sleep 3\n' +
            'cat /proc/uptime' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '4.03 15.41\n' +
            '7.04 33.41' },

          { t: 'cal', kind: 'why', title: 'Không có file nào bị ghi lại giữa hai lần đọc', x:
            '<p>Số thứ nhất là số giây kể từ lúc khởi động, số thứ hai là tổng thời gian nhàn rỗi cộng ' +
            'trên cả sáu nhân. Không chương trình nào cập nhật file này — <b>kernel sinh ra nội dung ' +
            'ngay tại thời điểm bạn đọc</b>.</p>' +
            '<p>Nếu đây là một file thật trên đĩa, phải có ai đó ghi vào nó vài lần mỗi giây, và ổ SSD ' +
            'của bạn sẽ mòn vì một con số vô nghĩa.</p>' +
            '<p>Hai lần đọc chứng minh điều đó bằng số: cột đầu tăng <b>7.04 − 4.03 = 3.01 giây</b>, ' +
            'khớp với đúng 3 giây của <code>sleep 3</code> (phần dư 0.01s là thời gian gõ và xử lý ' +
            'lệnh). Cột thứ hai tăng <b>33.41 − 15.41 = 18.00 giây</b> — chia cho 6, đúng số nhân đã ' +
            'đếm ở trên, ra <b>3.00 giây</b> khớp tuyệt đối với thời gian <code>sleep</code>. Đây không ' +
            'phải trùng hợp: hàm <code>uptime_proc_show()</code> trong kernel (<code>fs/proc/uptime.c</code>) ' +
            'lặp qua <code>for_each_possible_cpu()</code> và <b>cộng dồn</b> thời gian nhàn rỗi của từng ' +
            'nhân vào một tổng duy nhất, nên trong 3 giây rảnh, cả 6 nhân cùng rảnh thì tổng phải tăng đúng 18.</p>' },

          { t: 'p', x: 'Bằng chứng cuối cùng, bằng ba lệnh:' },
          { t: 'code', where: 'wsl', code:
            'ls -l /proc/cpuinfo\n' +
            'wc -c < /proc/cpuinfo\n' +
            'du -sh /proc 2>/dev/null\n' +
            'df -h /proc /sys' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '-r--r--r-- 1 root root 0 Aug  1 15:48 /proc/cpuinfo\n' +
            '9294\n' +
            '0\t/proc\n' +
            'Filesystem      Size  Used Avail Use% Mounted on\n' +
            'proc               0     0     0    - /proc\n' +
            'sysfs              0     0     0    - /sys' },

          { t: 'cal', kind: 'info', title: 'Nghịch lý: 0 byte nhưng đọc ra 9294 byte', x:
            '<p><code>ls -l</code> hỏi <b>siêu dữ liệu</b>: "file này dài bao nhiêu?". Kernel trả lời ' +
            '<b>0</b>, vì thật sự không có byte nào được lưu ở đâu cả.</p>' +
            '<p><code>wc -c</code> thì <b>đọc thật</b> từ đầu tới cuối và đếm được <b>9294</b> byte. ' +
            'Nội dung ấy được sinh ra trong lúc đọc rồi biến mất.</p>' +
            '<p><code>df</code> nói thẳng: hệ thống file <code>proc</code> có dung lượng 0. Đây chính là ' +
            'lý do một rootfs nhúng vẫn phải có thư mục <code>/proc</code> rỗng — nó không tốn flash, ' +
            'chỉ là một điểm để kernel gắn procfs vào lúc khởi động.</p>' },

          { t: 'p', x: 'Xem chúng được gắn vào như thế nào:' },
          { t: 'code', where: 'wsl', code:
            'mount | grep -E \'^(proc|sysfs|none on /dev) \'' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'none on /dev type devtmpfs (rw,nosuid,relatime,size=2512316k,mode=755)\n' +
            'sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,noatime)\n' +
            'proc on /proc type proc (rw,nosuid,nodev,noexec,noatime)' },

          { t: 'cmdx', cmd: 'mount | grep -E \'^(proc|sysfs|none on /dev) \'',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['grep -E', 'Bật <b>regex mở rộng</b> (extended regular expressions).',
               'Không có <code>-E</code>, dấu <code>|</code> và cặp ngoặc <code>()</code> bên dưới chỉ là ' +
               'ký tự thường, phải viết <code>\\|</code> và <code>\\(\\)</code> mới có tác dụng đặc biệt.'],
              ['^(proc|sysfs|none on /dev)', 'Neo vào đầu dòng, khớp một trong ba cụm cách nhau bởi <code>|</code> (hoặc).',
               'Ba cụm này là chữ đầu ba dòng cần lọc; mount còn in ra vài chục dòng khác (cgroup, tmpfs, overlay…) mà bài chưa cần tới.'],
              [') ', 'Dấu cách đóng ngay sau ngoặc.',
               'Chặn nhầm những dòng vô tình cùng bắt đầu bằng <code>proc</code>, ví dụ nếu có mount thứ hai tên <code>procfoo</code>.']
            ]},

          { t: 'cal', kind: 'tip', title: 'Ba dòng này bạn sẽ tự gõ lại ở Bài 46', x:
            '<p>Khi dựng rootfs bằng tay, chính bạn phải gắn ba thứ này, nếu không hệ thống sẽ chạy ' +
            'nhưng gần như mọi công cụ chẩn đoán đều mù:</p>' +
            '<p><code>mount -t proc none /proc</code><br>' +
            '<code>mount -t sysfs none /sys</code><br>' +
            '<code>mount -t devtmpfs none /dev</code></p>' +
            '<p>Cột "Filesystem" ghi <code>none</code> vì không có thiết bị lưu trữ nào cả — nguồn dữ liệu ' +
            'là chính kernel.</p>' }
        ]},

      { title: 'Đọc thuộc tính thiết bị từ /sys',
        blocks: [
          { t: 'p', x:
            '<code>/sys</code> có quy tắc rất chặt: <b>một thư mục là một thiết bị, một file là một ' +
            'thuộc tính, một thuộc tính là một giá trị</b>. Xem card mạng:' },
          { t: 'code', where: 'wsl', code:
            'ls /sys/class/net\n' +
            'cat /sys/class/net/eth0/address\n' +
            'cat /sys/class/net/eth0/mtu\n' +
            'cat /sys/class/net/eth0/operstate' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'eth0  lo\n' +
            '00:15:5d:eb:62:9c\n' +
            '1500\n' +
            'up' },

          { t: 'cal', kind: 'info', x:
            '<p>Địa chỉ MAC trên máy bạn sẽ khác — WSL sinh mới mỗi lần khởi động lại. Cái cần chú ý là ' +
            '<b>hình dạng</b>: mỗi file trả về đúng một giá trị, không tiêu đề, không định dạng, ' +
            'không rườm rà.</p>' +
            '<p>Thiết kế này là cố ý: script và chương trình C đọc nó không cần phân tích cú pháp gì cả. ' +
            'Khi bạn tạo thuộc tính sysfs cho driver của mình ở Bài 53, hãy giữ đúng quy tắc này.</p>' },

          { t: 'p', x: 'Bây giờ tính dung lượng ổ đĩa mà không dùng lệnh chuyên dụng nào:' },
          { t: 'code', where: 'wsl', code:
            'cat /sys/block/sda/size\n' +
            'cat /sys/block/sda/queue/logical_block_size\n' +
            'echo $(( 730960 * 512 / 1024 / 1024 ))' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '730960\n' +
            '512\n' +
            '356' },

          { t: 'cmdx', cmd: 'echo $(( 730960 * 512 / 1024 / 1024 ))',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['$(( … ))', 'Cú pháp tính toán số nguyên của bash. Kết quả được thay vào chỗ đó.',
               'Chỉ làm việc với số nguyên — bash không có số thực. Bài 13 sẽ dùng nhiều.'],
              ['730960', 'Giá trị đọc từ <code>size</code>: số <b>sector</b> chứ không phải byte.', ''],
              ['× 512', 'Nhân với kích thước một sector, lấy từ <code>logical_block_size</code>.',
               '<b>Đừng đoán là 512.</b> Ổ đĩa hiện đại và bộ nhớ flash thường dùng 4096 — đó là lý do phải đọc file thứ hai thay vì viết cứng con số.'],
              ['÷ 1024 ÷ 1024', 'Byte sang KiB sang MiB.', 'Kết quả <b>356 MB</b> — đúng bằng phân vùng swap của WSL.']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao bài này bắt bạn tính tay thay vì dùng lsblk', x:
            '<p>Vì trên board thật, rất có thể <b>không có</b> <code>lsblk</code>. Rootfs nhúng tối giản ' +
            'chỉ có BusyBox và vài chục lệnh.</p>' +
            '<p>Nhưng <code>/sys</code> thì <b>luôn</b> có, vì nó do kernel tạo ra chứ không phải do ' +
            'gói phần mềm nào cài vào. Kỹ năng đọc thẳng <code>/sys</code> là kỹ năng không bao giờ mất tác dụng.</p>' }
        ]},

      { title: 'Nhìn vào /dev và hiểu cặp số major–minor',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'ls -l /dev/null /dev/zero /dev/sda /dev/hvc0 /dev/kvm' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'crw------- 1 root tty  229,   0 Aug  1 15:48 /dev/hvc0\n' +
            'crw-rw---- 1 root kvm   10, 232 Aug  1 15:48 /dev/kvm\n' +
            'crw-rw-rw- 1 root root   1,   3 Aug  1 15:48 /dev/null\n' +
            'brw-rw---- 1 root disk   8,   0 Aug  1 15:48 /dev/sda\n' +
            'crw-rw-rw- 1 root root   1,   5 Aug  1 15:48 /dev/zero' },

          { t: 'cal', kind: 'info', title: 'Chỗ đáng lẽ là kích thước, giờ là hai con số', x:
            '<p>Với file thường, cột đó là số byte. Với file thiết bị, nó là cặp ' +
            '<b>major, minor</b>.</p>' +
            '<p><b>Major</b> nói kernel biết <i>driver nào</i> phụ trách. Số <code>1</code> là driver ' +
            'bộ nhớ, <code>8</code> là driver đĩa SCSI, <code>229</code> là console ảo của Hyper-V.</p>' +
            '<p><b>Minor</b> nói driver đó biết <i>thiết bị nào trong số các thiết bị nó quản lý</i>. ' +
            'Cùng major 1: minor 3 là <code>/dev/null</code>, minor 5 là <code>/dev/zero</code> — ' +
            'cùng một driver, hai hành vi khác nhau.</p>' +
            '<p>Ở Bài 52 bạn sẽ <b>đăng ký một major cho driver của mình</b> và tạo file thiết bị tương ' +
            'ứng. Cặp số này chính là sợi dây nối giữa một đường dẫn trong <code>/dev</code> và mã C ' +
            'bạn viết trong kernel.</p>' },

          { t: 'p', x: 'Thử hai thiết bị nổi tiếng nhất:' },
          { t: 'code', where: 'wsl', code:
            'echo "this line disappears" > /dev/null\n' +
            'echo $?\n' +
            'head -c 8 /dev/zero | od -An -tx1' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '0\n' +
            ' 00 00 00 00 00 00 00 00' },

          { t: 'cmdx', cmd: 'od -An -tx1',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['od', '<i>octal dump</i> — in nội dung nhị phân ra dạng người đọc được, không đoán là văn bản như <code>cat</code>.', ''],
              ['-An', '<code>-A n</code>: bỏ cột địa chỉ (offset) ở đầu mỗi dòng.',
               'Không có nó, mỗi dòng sẽ bắt đầu bằng một số thứ tự byte — thừa với 8 byte cần xem ở đây.'],
              ['-tx1', '<code>-t x1</code>: định dạng mỗi đơn vị là <b>hệ mười sáu (x)</b>, mỗi đơn vị dài <b>1 byte</b>.',
               'Kết quả 8 nhóm <code>00</code> chính là 8 byte đầu tiên mà <code>/dev/zero</code> sinh ra — luôn luôn là số 0, đúng như tên gọi.']
            ]},

          { t: 'cal', kind: 'tip', x:
            '<p><code>/dev/null</code> nuốt mọi thứ ghi vào và báo thành công — đó là lý do ' +
            '<code>2>/dev/null</code> ở Bài 4 làm thông báo lỗi biến mất. <code>/dev/zero</code> thì ' +
            'sinh ra vô hạn byte 0, dùng để tạo file rỗng có kích thước định trước, ví dụ khi làm ' +
            'ảnh đĩa cho QEMU ở Chặng 09.</p>' +
            '<p>Cả hai đều không phải phần cứng. Chúng là <b>thiết bị ảo</b> — bằng chứng rằng "file ' +
            'thiết bị" thật ra chỉ là một cửa vào mã kernel, chứ không nhất thiết phải có mạch điện ' +
            'ở phía sau.</p>' }
        ]},

      { title: 'Soi một tiến trình đang sống qua /proc/<PID>',
        blocks: [
          { t: 'p', x:
            'Mỗi thư mục mang tên số trong <code>/proc</code> là một tiến trình. Hãy tạo một tiến trình ' +
            'rồi mổ nó ra khi nó còn đang chạy:' },
          { t: 'code', where: 'wsl', code:
            'sleep 25 &\n' +
            'ls -l /proc/$!/exe\n' +
            'tr \'\\0\' \' \' < /proc/$!/cmdline; echo\n' +
            'grep -E \'^(Name|State|VmRSS)\' /proc/$!/status' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'lrwxrwxrwx 1 shinarus shinarus 0 /proc/443/exe -> /usr/lib/cargo/bin/coreutils/sleep\n' +
            'sleep 25 \n' +
            'Name:\tsleep\n' +
            'State:\tS (sleeping)\n' +
            'VmRSS:\t    7952 kB' },

          { t: 'cmdx', cmd: 'tr \'\\0\' \' \' < /proc/$!/cmdline',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['$!', 'Biến đặc biệt của bash: PID của lệnh nền vừa chạy.',
               'Cùng họ với <code>$$</code> (PID của shell) và <code>$?</code> (mã thoát) ở Bài 4.'],
              ['/proc/&lt;pid&gt;/cmdline', 'Dòng lệnh đã tạo ra tiến trình này.',
               'Các đối số ngăn nhau bằng <b>byte 0</b> chứ không phải dấu cách — đúng như cách kernel nhận chúng.'],
              ['tr \'\\0\' \' \'', 'Đổi mọi byte 0 thành dấu cách để mắt người đọc được.',
               'Không có <code>tr</code> thì màn hình chỉ hiện <code>sleep25</code> dính liền.'],
              ['/proc/&lt;pid&gt;/exe', 'Liên kết trỏ tới <b>file thực thi thật</b> đang chạy.',
               'Ở đây nó tố cáo <code>sleep</code> cũng là uutils, y như <code>ls</code> ở Bài 4.'],
              ['VmRSS', 'Bộ nhớ vật lý tiến trình đang thật sự chiếm.',
               'Con số đầu tiên cần nhìn khi thiết bị hết RAM.']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao đây là công cụ gỡ lỗi mạnh nhất bạn có', x:
            '<p>Với một tiến trình treo trên board mà bạn không có debugger, ' +
            '<code>/proc/&lt;pid&gt;/</code> vẫn trả lời được: nó đang ở trạng thái gì ' +
            '(<code>status</code>), đang mở những file nào (<code>fd/</code>), bản đồ bộ nhớ ra sao ' +
            '(<code>maps</code>), môi trường thế nào (<code>environ</code>).</p>' +
            '<p>Không cần cài thêm gì cả — mọi thứ có sẵn trong kernel. Bài 20 sẽ khai thác cạn thư mục ' +
            'này, và Bài 9 sẽ giải thích trạng thái <code>S (sleeping)</code> nghĩa là gì.</p>' },

          { t: 'p', x: 'Đếm xem máy bạn đang chạy bao nhiêu tiến trình:' },
          { t: 'code', where: 'wsl', code:
            'ls /proc | grep -c \'^[0-9]\'' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '56' },

          { t: 'cal', kind: 'info', x:
            '<p><b>56 không phải là lý do trực tiếp của con số 252 ở trên</b> — kiểm tra thật trên máy ' +
            'cho thấy chênh lệch còn lớn hơn thế. Đếm luôn cả các luồng (không chỉ tiến trình) bằng ' +
            '<code>ps -eLf | wc -l</code> ra khoảng 78 dòng, và cột thứ hai của ' +
            '<code>cat /proc/loadavg</code> (số lượng "tác vụ" kernel đang biết) còn cao hơn nữa, tới ' +
            'vài trăm — vẫn không khớp phép cộng <b>2 + số tiến trình</b> hay đổi ngay khi bạn tự chạy ' +
            'thêm vài tiến trình mới rồi đo lại. Số liên kết của <code>/proc</code> là một con số nội bộ ' +
            'do kernel gán cho toàn hệ thống (kể cả các luồng/tiến trình kernel không hiện trong ' +
            '<code>ls /proc</code>), không phải phép đếm thư mục con theo đúng nghĩa như một thư mục ' +
            'thật — nên đừng cố cộng trừ nó cho khớp. Điều chắc chắn duy nhất: con số <b>56</b> ở đây ' +
            'là tổng tiến trình đang chạy mà bạn <i>nhìn thấy được</i> qua <code>/proc</code>, và một ' +
            'thiết bị nhúng tối giản thường chỉ có <b>dưới 15</b> — bạn sẽ tự đếm lại con số đó ở Bài 49 ' +
            'và thấy khác biệt rất rõ.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       6. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: cd: docs: No such file or directory</code>',
         'Đường dẫn tương đối nhưng bạn đang đứng ở thư mục khác',
         '<code>pwd</code> để biết mình ở đâu, rồi <code>ls</code> xem có gì'],
        ['<code>hello.sh: command not found</code> dù file nằm ngay đó',
         'Thư mục hiện tại không nằm trong <code>$PATH</code> — cố ý vì lý do bảo mật',
         'Viết <code>./hello.sh</code>'],
        ['<code>du: cannot read directory \'/proc/1/fd\': Permission denied</code>',
         'Bạn đang đọc thư mục của tiến trình thuộc user khác',
         'Bình thường. Thêm <code>2>/dev/null</code> để bỏ qua, hoặc dùng <code>sudo</code>'],
        ['<code>ls -l</code> báo file trong <code>/proc</code> có kích thước 0',
         'Đúng như vậy — nội dung được sinh lúc đọc, không lưu ở đâu cả',
         'Dùng <code>wc -c</code> nếu cần biết độ dài thật'],
        ['<code>bash: /sys/class/net/eth0/mtu: Permission denied</code>',
         'Thuộc tính sysfs cho ghi nhưng chỉ root mới được',
         'Thêm <code>sudo</code>. Nhưng hãy hiểu rõ trước khi ghi — Bài 8 nói về quyền'],
        ['<code>cat: /proc/1/environ: Permission denied</code>',
         'Tiến trình 1 (systemd) thuộc về root',
         'Chỉ đọc được tiến trình của chính bạn, trừ khi dùng <code>sudo</code>'],
        ['Sửa file trong <code>/proc</code> xong khởi động lại thì mất',
         '<code>/proc</code> không nằm trên đĩa, mọi thay đổi chỉ sống trong RAM',
         'Muốn lâu dài thì ghi vào <code>/etc/sysctl.conf</code> — Bài 12']
      ]},

    /* ══════════════════════════════════════════════
       7. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Linux chỉ có <b>một cây</b> bắt đầu từ <code>/</code>. Thiết bị lưu trữ được <b>gắn</b> vào cây ' +
      'đó, không có khái niệm ổ C, ổ D.',
      'Cách sắp xếp cây theo chuẩn <b>FHS</b> — nhờ đó bạn đoán được vị trí file trên một board lạ.',
      'Ký tự đầu ở <code>ls -l</code> cho biết loại: <code>-</code> file · <code>d</code> thư mục · ' +
      '<code>l</code> liên kết · <b><code>c</code> thiết bị ký tự</b> · <b><code>b</code> thiết bị khối</b>.',
      '<code>/bin /sbin /lib</code> nay chỉ là <b>liên kết</b> vào <code>/usr</code> — kết quả của usr-merge.',
      '<code>/boot</code> <b>trống rỗng</b> trên WSL2, vì không có bootloader nào cần đọc file ở đó.',
      '<code>/proc</code> và <code>/sys</code> chiếm <b>0 byte đĩa</b>; nội dung do kernel sinh ra ' +
      'ngay lúc đọc. <code>ls -l</code> báo 0 nhưng <code>wc -c</code> đếm được <b>9294</b> byte.',
      '<code>/proc</code> là về <b>tiến trình và kernel</b>; <code>/sys</code> là về ' +
      '<b>thiết bị và driver</b>, mỗi file đúng một giá trị.',
      'File thiết bị mang cặp <b>major–minor</b> thay cho kích thước: major chọn driver, ' +
      'minor chọn thiết bị cụ thể.',
      'Đường dẫn tuyệt đối bắt đầu bằng <code>/</code>. Trong script dùng tuyệt đối, gõ tay dùng ' +
      'tương đối. Phải viết <code>./file</code> vì thư mục hiện tại không nằm trong <code>$PATH</code>.',
      'Rootfs nhúng bắt buộc có các thư mục rỗng <code>/proc</code>, <code>/sys</code>, ' +
      '<code>/dev</code> để kernel gắn vào lúc khởi động — Bài 46.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Bạn đã có <b>bản đồ</b> và biết <b>đọc</b>. <b>Bài 6 — Điều hướng, thao tác và xem file</b> ' +
      'cho bạn khả năng <b>thay đổi</b>: <code>cp mv rm mkdir ln</code>, xem file bằng ' +
      '<code>cat less head tail</code>, và ký tự đại diện <code>*</code> để làm việc với hàng trăm file ' +
      'cùng lúc.</p>' +
      '<p>Bài đó cũng làm rõ một cặp khái niệm bạn vừa chạm tới: <b>liên kết cứng</b> và ' +
      '<b>liên kết mềm</b>. Bạn sẽ tự tay chứng minh vì sao <code>/bin -&gt; usr/bin</code> phải là ' +
      'liên kết mềm chứ không thể là liên kết cứng, và vì sao BusyBox dùng đúng thủ thuật đó để nhét ' +
      'ba trăm lệnh vào một file duy nhất.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: '<code>ls -l /proc/cpuinfo</code> báo kích thước <b>0</b>, nhưng <code>wc -c &lt; /proc/cpuinfo</code> đếm được <b>9294</b> byte. Vì sao?',
      opts: [
        'Vì <code>ls</code> bị lỗi khi đọc thư mục ảo',
        'Vì file nén lại nên kích thước hiển thị bằng 0',
        'Vì nội dung không được lưu ở đâu cả — kernel sinh ra ngay lúc bạn đọc, nên siêu dữ liệu về độ dài không tồn tại',
        'Vì cần quyền root mới thấy đúng kích thước'
      ],
      a: 2,
      why: '<code>ls -l</code> chỉ hỏi siêu dữ liệu, và với procfs thì không có byte nào nằm sẵn để mà đo. ' +
           '<code>wc -c</code> thì đọc thật từ đầu tới cuối, buộc kernel sinh nội dung và đếm được ' +
           '9294 byte. Đó cũng là lý do <code>df</code> báo hệ thống file <code>proc</code> có dung ' +
           'lượng 0 và <code>du -sh /proc</code> ra 0.'
    },
    {
      q: 'Bạn cần biết một board có nhận ra card mạng không, nhưng board chỉ có BusyBox, không có <code>ip</code>, không có <code>lsblk</code>. Làm thế nào?',
      opts: [
        'Không có cách nào, phải cài thêm công cụ',
        'Đọc thẳng <code>/sys/class/net/</code> — sysfs luôn có vì do kernel tạo ra, không phụ thuộc gói phần mềm nào',
        'Khởi động lại board và đọc log',
        'Dùng <code>/etc/network/interfaces</code>'
      ],
      a: 1,
      why: 'Các lệnh như <code>ip</code> hay <code>lsblk</code> là <b>gói phần mềm</b> có thể bị cắt khỏi ' +
           'rootfs nhúng để tiết kiệm flash. Còn <code>/sys</code> do chính kernel dựng lên, luôn có mặt ' +
           'khi sysfs được gắn. <code>ls /sys/class/net</code> liệt kê mọi giao diện mạng kernel biết, ' +
           'và <code>cat …/operstate</code> cho biết nó đang lên hay xuống.'
    },
    {
      q: 'Trong <code>ls -l /dev/null</code>, hai số <code>1, 3</code> ở chỗ đáng lẽ là kích thước nghĩa là gì?',
      opts: [
        'Số khối và số inode',
        'Kích thước tính bằng KB và số liên kết',
        'Major và minor: major chọn driver phụ trách, minor chọn thiết bị cụ thể trong số driver đó quản lý',
        'Phiên bản driver'
      ],
      a: 2,
      why: 'File thiết bị không có nội dung nên không có kích thước; chỗ đó dùng cho cặp major–minor. ' +
           '<code>/dev/null</code> là 1,3 và <code>/dev/zero</code> là 1,5 — <b>cùng major</b> nghĩa là ' +
           'cùng một driver bộ nhớ của kernel phục vụ, minor phân biệt hai hành vi. Ở Bài 52 bạn sẽ tự ' +
           'đăng ký một major cho driver của mình.'
    },
    {
      q: 'Vì sao gõ <code>hello.sh</code> báo <code>command not found</code> dù file nằm ngay trong thư mục hiện tại?',
      opts: [
        'Vì file thiếu quyền thực thi',
        'Vì thư mục hiện tại cố ý không nằm trong <code>$PATH</code> — phải viết <code>./hello.sh</code>',
        'Vì tên file phải kết thúc bằng <code>.sh</code>',
        'Vì bash chỉ chạy được file nhị phân'
      ],
      a: 1,
      why: 'Bash tìm lệnh theo <code>$PATH</code>, và thư mục hiện tại bị loại ra một cách cố ý: nếu có ' +
           'nó, kẻ tấn công chỉ cần đặt một file tên <code>ls</code> vào thư mục dùng chung rồi chờ. ' +
           'Viết <code>./hello.sh</code> là chỉ đích danh đường dẫn, không đụng tới <code>$PATH</code>. ' +
           'Nếu thiếu quyền thực thi thì thông báo sẽ là <code>Permission denied</code> với mã 126 ' +
           '(Bài 4), không phải <code>command not found</code>.'
    },
    {
      q: 'Khi dựng rootfs nhúng bằng tay ở Chặng 09, vì sao vẫn phải tạo thư mục <code>/proc</code> dù nó không chứa gì?',
      opts: [
        'Để lưu thông tin tiến trình vào flash',
        'Vì FHS bắt buộc, không có lý do kỹ thuật',
        'Vì nó là <b>điểm gắn</b>: kernel cần một thư mục có sẵn để gắn procfs vào lúc khởi động — thư mục rỗng không tốn flash',
        'Để chứa file cấu hình kernel'
      ],
      a: 2,
      why: 'Một thư mục rỗng chỉ tốn một mục trong bảng thư mục, gần như không tốn flash. Nhưng nếu ' +
           'không có nó, lệnh <code>mount -t proc none /proc</code> lúc khởi động sẽ thất bại, và mọi ' +
           'công cụ dựa vào <code>/proc</code> — kể cả <code>ps</code> — sẽ mù. Ba điểm gắn tối thiểu ' +
           'là <code>/proc</code>, <code>/sys</code> và <code>/dev</code>.'
    },
    {
      q: 'Bạn chạy <code>cat /proc/uptime</code> hai lần cách nhau ba giây và nhận hai kết quả khác nhau. Điều này chứng minh gì?',
      opts: [
        'Có một tiến trình nền đang cập nhật file đó',
        'File bị hỏng',
        'Nội dung được kernel sinh ra tại thời điểm đọc, không phải dữ liệu lưu sẵn trên đĩa',
        'Bộ đệm của hệ thống file đang hoạt động'
      ],
      a: 2,
      why: 'Không có tiến trình nào ghi vào <code>/proc/uptime</code> — nếu có, ổ SSD sẽ mòn vì một con ' +
           'số vô nghĩa. Mỗi lời gọi <code>read()</code> kích hoạt một hàm trong kernel, hàm đó nhìn ' +
           'đồng hồ nội bộ và sinh chuỗi ký tự ngay lúc đó. Đây là khác biệt cốt lõi giữa hệ thống file ' +
           'ảo và hệ thống file trên đĩa.'
    }
  ]
});

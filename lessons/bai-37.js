/* Bài 37 — Kiến trúc kernel
   Chặng 07 — Linux Kernel
   Mở đầu chặng: nhân là gì (và không là gì), monolithic + module, sáu phân hệ,
   đường đi của một syscall nhìn từ phía nhân, vDSO, và cách mổ xẻ nhân đang chạy
   bằng /proc và /sys. */

Lesson.register({
  id: 'bai-37',
  title: 'Kiến trúc kernel',
  minutes: 55,
  practice: 'Thực hành 30 phút',
  level: 'Trung cấp',

  intro:
    'Suốt <b>Chặng 05</b> và <b>Chặng 06</b> bạn đối xử với kernel như một <b>hộp đen</b>: một file ' +
    '<code>Image</code> 30 MB, nạp vào <code>0x40400000</code>, nhảy tới, rồi log tuôn ra. Bạn biết ' +
    'cách <i>đưa</i> nó vào RAM nhưng chưa biết bên trong nó có gì. <b>Bài 19</b> thì ngược lại — bạn ' +
    'đã nhìn syscall rất kỹ, nhưng chỉ từ <b>phía user space</b>: gọi <code>write()</code>, nhận về một ' +
    'con số, còn chuyện gì xảy ra ở giữa thì bỏ ngỏ. Bài này lấp đúng khoảng trống đó. Và bạn không cần ' +
    'chờ build xong kernel mới học được: <b>ngay lúc này máy bạn đang chạy một nhân Linux thật</b>, và nó ' +
    'công khai gần như toàn bộ cấu trúc bên trong của mình qua <code>/proc</code> và <code>/sys</code>. ' +
    'Bốn mươi phút nữa bạn sẽ đọc được bảng ký hiệu <b>hơn 211 nghìn dòng</b> của nó, lần theo đường đi của một ' +
    '<code>write()</code> qua năm lớp hàm, và <b>đo</b> được cái giá của việc bước qua ranh giới user/kernel.',

  goals: [
    'Giải thích được vì sao nhân <b>không phải</b> một tiến trình, và ba con đường duy nhất khiến mã của nhân được chạy',
    'Phân biệt monolithic · microkernel · hybrid, và nói được vì sao một <code>.ko</code> của Linux <b>không</b> làm cho Linux thành microkernel',
    'Kể tên sáu phân hệ của nhân, câu hỏi mà mỗi phân hệ trả lời, và cửa sổ quan sát chúng từ user space',
    'Lần theo một <code>write()</code> bên trong nhân qua năm lớp, từ điểm vào kiến trúc tới hàm riêng của ext4',
    'Đo được vDSO nhanh hơn syscall thật bao nhiêu lần, và giải thích cơ chế đứng sau con số đó',
    'Nhìn tỉ lệ <code>user</code>/<code>sys</code> của <code>time</code> mà suy ra chương trình đang tốn thời gian ở phía nào của ranh giới'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Nhân không phải là một tiến trình
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Nhân không phải là một tiến trình đang chạy' },

    { t: 'p', x:
      'Câu hỏi đầu tiên, và hầu hết người mới trả lời sai: <b>nhân Linux có PID bằng bao nhiêu?</b> ' +
      'Ở <b>Bài 9</b> bạn đã liệt kê tiến trình bằng <code>ps -e</code> và thấy PID 1 là ' +
      '<code>systemd</code>. Vậy nhân ở đâu trong danh sách đó?' },

    { t: 'p', x:
      'Nó <b>không ở đâu cả</b>. Nhân không có PID vì nhân không phải một tiến trình. Nó không được ' +
      'lập lịch, không có vùng nhớ riêng theo nghĩa của một tiến trình, không nằm chờ tới lượt. ' +
      'Nhân là <b>mã đặc quyền được chạy nhờ thời gian của người khác</b>.' },

    { t: 'cal', kind: 'why', title: 'Câu để thuộc lòng: nhân không chạy — nhân được gọi', x:
      '<p>Mọi hiểu lầm về kiến trúc nhân đều bắt nguồn từ hình dung sai rằng nhân là một chương trình ' +
      'đang quay vòng ở đâu đó, chờ yêu cầu. Không phải. Mã của nhân <b>chỉ có đúng ba con đường</b> ' +
      'để được thực thi:</p>' +
      '<ul>' +
      '<li><b>Bạn gọi nó</b> — một syscall. CPU đang chạy tiến trình của bạn, gặp lệnh ' +
      '<code>svc</code> (ARM64) hoặc <code>syscall</code> (x86-64), chuyển sang chế độ đặc quyền và ' +
      'nhảy vào nhân. <b>Vẫn là tiến trình của bạn</b>, chỉ đổi chế độ. Đây gọi là ' +
      '<i>process context</i> (ngữ cảnh tiến trình).</li>' +
      '<li><b>Phần cứng gọi nó</b> — một ngắt. Card mạng nhận xong gói tin thì kéo chân IRQ, CPU bỏ ' +
      'dở bất cứ việc gì đang làm để chạy trình xử lý ngắt. Nạn nhân là tiến trình nào đang chạy ' +
      'lúc đó, hoàn toàn ngẫu nhiên. Đây là <i>interrupt context</i>.</li>' +
      '<li><b>Nó tự hẹn giờ gọi chính mình</b> — kernel thread. Đây là ngoại lệ duy nhất: một số việc ' +
      'nền (dọn bộ nhớ, ghi dữ liệu bẩn xuống đĩa) được đóng gói thành luồng có PID thật, được lập ' +
      'lịch như tiến trình thường, nhưng chạy hoàn toàn trong không gian nhân.</li>' +
      '</ul>' +
      '<p>Hệ quả trực tiếp, và bạn sẽ <b>đo</b> nó ở phần thực hành: khi <code>time</code> báo ' +
      '<code>sys 0m0.224s</code>, đó là <b>0,224 giây mà nhân đã tiêu bằng thời gian CPU của tiến ' +
      'trình bạn</b>. Nhân không có ngân sách riêng để mà tiêu.</p>' },

    { t: 'p', x:
      'Bạn có thể nhìn thấy nhóm thứ ba ngay: những dòng <code>ps</code> có tên đặt trong dấu ngoặc ' +
      'vuông — <code>[kthreadd]</code>, <code>[kworker/0:1]</code>, <code>[ksoftirqd/0]</code> — là ' +
      'kernel thread. Dấu ngoặc vuông nghĩa là <b>tiến trình này không có dòng lệnh</b>, vì nó không ' +
      'đến từ một file thực thi nào cả; nó là một hàm C bên trong nhân được cho một PID.' },

    { t: 'cal', kind: 'info', title: 'Vì sao chi tiết này đáng nhớ hơn nó có vẻ', x:
      'Khi debug một hệ thống nhúng bị treo, câu hỏi đầu tiên luôn là "<b>ai đang giữ CPU?</b>". ' +
      'Nếu bạn hình dung nhân là một tiến trình, bạn sẽ đi tìm nó trong <code>top</code> và không ' +
      'thấy gì, rồi kết luận sai. Nếu bạn nhớ ba con đường trên, bạn sẽ hỏi đúng ba câu: có tiến ' +
      'trình nào kẹt trong syscall không (<code>ps</code> cột <code>STAT</code> = <code>D</code>), ' +
      'có ngắt nào bắn liên tục không (<code>/proc/interrupts</code>), có kernel thread nào ăn CPU ' +
      'không (<code>[kworker]</code> trong <code>top</code>). Ba câu đó giải quyết phần lớn ca treo.' },

    /* ══════════════════════════════════════════════════════════════════
       2. Monolithic, microkernel, và lựa chọn của Linux
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Monolithic, microkernel, và lựa chọn của Linux' },

    { t: 'p', x:
      'Đã có mã đặc quyền thì câu hỏi thiết kế lớn nhất là: <b>bao nhiêu mã được hưởng đặc quyền đó?</b> ' +
      'Trình điều khiển ổ cứng có cần chạy ở chế độ đặc quyền không? Còn hệ thống file? Còn ngăn xếp ' +
      'mạng? Hai câu trả lời đối lập nhau sinh ra hai trường phái, và Linux nằm hẳn về một phía.' },

    { t: 'table',
      head: ['', 'Monolithic', 'Microkernel'],
      rows: [
        ['<b>Ai ở trong chế độ đặc quyền</b>',
         'Lập lịch, quản lý bộ nhớ, hệ thống file, mạng, <b>mọi driver</b> — tất cả cùng một không gian địa chỉ',
         'Chỉ lập lịch, quản lý bộ nhớ cơ bản và truyền thông điệp. Driver và hệ thống file là <b>tiến trình user space</b>'],
        ['<b>Driver gọi hệ thống file tốn gì</b>',
         'Một lời gọi hàm C thường — vài nanô giây',
         'Một lượt trao đổi thông điệp qua nhân — hàng trăm nanô giây, có thể kèm chuyển ngữ cảnh'],
        ['<b>Một driver lỗi thì sao</b>',
         '<b>Kernel panic.</b> Nó ghi đè được lên bất cứ đâu trong nhân',
         'Tiến trình driver chết, hệ thống khởi động lại riêng nó. Phần còn lại sống sót'],
        ['<b>Kích thước mã đặc quyền</b>',
         'Hàng triệu dòng',
         'Thường vài nghìn tới vài chục nghìn dòng — đủ nhỏ để <b>chứng minh đúng bằng toán học</b>'],
        ['<b>Ví dụ</b>',
         '<b>Linux</b>, các BSD',
         'QNX, seL4, MINIX 3, L4'],
        ['<b>Ngành nào chuộng</b>',
         'Máy chủ, điện thoại, phần lớn thiết bị nhúng',
         'Ô tô, hàng không, y tế — nơi cần chứng nhận an toàn']
      ]},

    { t: 'p', x:
      'Linux chọn monolithic, và chọn từ 1991 khi Linus tranh luận công khai với Andrew Tanenbaum ' +
      '(tác giả MINIX) về đúng chủ đề này. Lý do rất thực dụng: <b>hiệu năng</b>. Trong một nhân ' +
      'monolithic, khi ext4 cần đọc một khối đĩa, nó gọi thẳng hàm của lớp block — một lệnh ' +
      '<code>bl</code>/<code>call</code>. Trong microkernel, nó phải đóng gói một thông điệp, gọi ' +
      'nhân, nhân đánh thức tiến trình driver, chép dữ liệu, rồi đi ngược lại. Ở <b>Bài 19</b> bạn đã ' +
      'đo được một lần vượt ranh giới tốn khoảng <b>120–150 ns</b>; microkernel bắt mọi tương tác ' +
      'giữa các phân hệ trả cái giá đó.' },

    { t: 'h3', x: 'Module không biến Linux thành microkernel' },

    { t: 'p', x:
      'Đây là hiểu lầm phổ biến nhất về kiến trúc Linux, và nó phải bị dập tắt ngay bây giờ vì cả ' +
      '<b>Chặng 10</b> xây trên nó. Linux cho phép nạp thêm mã vào nhân lúc đang chạy dưới dạng file ' +
      '<code>.ko</code> (kernel object). Nghe như driver được tách rời — nhưng không phải.' },

    { t: 'cal', kind: 'warn', title: 'Một .ko được nạp vào là một phần của nhân, không hơn không kém', x:
      '<p>Sau khi <code>insmod</code> thành công, mã trong <code>.ko</code>:</p>' +
      '<ul>' +
      '<li>chạy ở <b>đúng mức đặc quyền</b> như phần còn lại của nhân;</li>' +
      '<li>nằm trong <b>đúng không gian địa chỉ</b> đó — nó ghi đè được lên bất kỳ biến nào của nhân;</li>' +
      '<li>gọi hàm của nhân bằng <b>lời gọi hàm C thường</b>, không qua thông điệp nào cả;</li>' +
      '<li>nếu nó dereference một con trỏ NULL, <b>cả máy panic</b>, không phải riêng nó chết.</li>' +
      '</ul>' +
      '<p><b>Module là một quyết định về đóng gói, không phải về cách ly.</b> Nó trả lời câu hỏi ' +
      '"mã này nằm trong file nào và nạp lúc nào", chứ không trả lời câu hỏi "mã này được phép làm gì". ' +
      'Cách nhớ: nạp một module giống như <b>hàn thêm một mảnh thép vào khung xe đang chạy</b>, không ' +
      'giống như cắm thêm một thiết bị USB.</p>' },

    { t: 'p', x:
      'Vậy module để làm gì? Để một bản Linux dùng chung — như bản Ubuntu trên máy bạn — không phải ' +
      'nhét sẵn driver của mọi card mạng trên đời vào file kernel. Ở phần thực hành bạn sẽ thấy con số ' +
      'chính xác: nhân đang chạy có <b>961</b> file <code>.ko</code> nằm sẵn trên đĩa, chiếm ' +
      '<b>157 MB</b>, nhưng chỉ <b>15</b> module thực sự được nạp.' },

    { t: 'cal', kind: 'tip', title: 'Trong nhúng, cán cân lật ngược', x:
      'Thiết bị nhúng biết chính xác phần cứng của mình — nó không cần driver cho card đồ hoạ AMD. ' +
      'Vì vậy cấu hình nhúng điển hình biên dịch <b>mọi thứ cần thiết vào thẳng kernel</b> ' +
      '(<code>=y</code>) và thường tắt hẳn <code>CONFIG_MODULES</code>. Đổi lại: một file duy nhất để ' +
      'nạp, không cần thư mục <code>/lib/modules</code>, không cần <code>modprobe</code>, không có ' +
      'nguy cơ boot lên mà thiếu module, và ảnh hệ thống nhỏ hơn. Bạn sẽ tự tay bật/tắt các công tắc ' +
      'này ở <b>Bài 39</b>.' },

    { t: 'fig',
      cap: 'Cùng một driver, hai kiến trúc. Bên trái mọi thứ chung một không gian địa chỉ nên gọi nhau ' +
           'bằng lời gọi hàm; bên phải mỗi phân hệ là một tiến trình nên mọi tương tác đều phải đi vòng ' +
           'qua nhân. Nhanh và mong manh, đổi lấy chậm và bền.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="So sánh kiến trúc monolithic và microkernel: bên trái driver và hệ thống file nằm trong nhân, bên phải chúng là tiến trình user space">' +
        '<text class="d-t" x="18" y="20">Monolithic — Linux</text>' +
        '<rect class="d-box" x="18" y="30" width="320" height="52" rx="6"/>' +
        '<text class="d-ts" x="32" y="52">User space</text>' +
        '<text class="d-tm" x="32" y="70">bash · nginx · chương trình của bạn</text>' +
        '<line class="d-line" x1="18" y1="94" x2="338" y2="94"/>' +
        '<text class="d-ts" x="140" y="108">ranh giới đặc quyền</text>' +
        '<rect class="d-box-p" x="18" y="116" width="320" height="150" rx="6"/>' +
        '<text class="d-t" x="32" y="138">Kernel space — một không gian địa chỉ</text>' +
        '<rect class="d-box-a" x="32" y="150" width="88" height="34" rx="4"/>' +
        '<text class="d-tm" x="44" y="171">scheduler</text>' +
        '<rect class="d-box-a" x="128" y="150" width="88" height="34" rx="4"/>' +
        '<text class="d-tm" x="152" y="171">VFS + ext4</text>' +
        '<rect class="d-box-a" x="224" y="150" width="100" height="34" rx="4"/>' +
        '<text class="d-tm" x="244" y="171">TCP/IP</text>' +
        '<rect class="d-box-a" x="32" y="196" width="88" height="34" rx="4"/>' +
        '<text class="d-tm" x="52" y="217">driver</text>' +
        '<rect class="d-box-a" x="128" y="196" width="196" height="34" rx="4"/>' +
        '<text class="d-tm" x="150" y="217">quản lý bộ nhớ + lớp block</text>' +
        '<text class="d-ts" x="32" y="252">gọi nhau bằng lời gọi hàm C — vài ns</text>' +
        '<text class="d-t" x="382" y="20">Microkernel — QNX, seL4</text>' +
        '<rect class="d-box" x="382" y="30" width="320" height="90" rx="6"/>' +
        '<text class="d-ts" x="396" y="50">User space</text>' +
        '<rect class="d-box-w" x="396" y="58" width="86" height="30" rx="4"/>' +
        '<text class="d-tm" x="412" y="77">driver</text>' +
        '<rect class="d-box-w" x="490" y="58" width="86" height="30" rx="4"/>' +
        '<text class="d-tm" x="508" y="77">ext4</text>' +
        '<rect class="d-box-w" x="584" y="58" width="104" height="30" rx="4"/>' +
        '<text class="d-tm" x="602" y="77">TCP/IP</text>' +
        '<text class="d-tm" x="396" y="108">bash · chương trình của bạn</text>' +
        '<line class="d-line" x1="382" y1="132" x2="702" y2="132"/>' +
        '<text class="d-ts" x="500" y="146">ranh giới đặc quyền</text>' +
        '<rect class="d-box-p" x="382" y="154" width="320" height="60" rx="6"/>' +
        '<text class="d-t" x="396" y="178">Microkernel</text>' +
        '<text class="d-tm" x="396" y="198">lập lịch · bộ nhớ · truyền thông điệp</text>' +
        '<path class="d-arrow" d="M 440 122 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 440 148 l 5 10 l -10 0 z"/>' +
        '<path class="d-arrow" d="M 534 122 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 534 148 l 5 10 l -10 0 z"/>' +
        '<text class="d-ts" x="382" y="238">mọi tương tác giữa hai khối vàng phải đi qua nhân:</text>' +
        '<text class="d-ts" x="382" y="256">đóng gói thông điệp → nhân → đánh thức tiến trình kia</text>' +
        '<text class="d-ts" x="382" y="274">→ hàng trăm ns, nhưng một driver chết không kéo cả máy chết</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       3. Sáu phân hệ
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Sáu phân hệ và cách chúng xếp chồng' },

    { t: 'p', x:
      '"Monolithic" nghe như một khối bê tông không có đường nối. Thực tế ngược lại: bên trong nhân ' +
      'được chia thành các <b>phân hệ</b> (subsystem) rất rõ ràng, mỗi phân hệ có một nhóm bảo trì ' +
      'riêng, một danh sách thư riêng, một thư mục riêng trong source. Chúng chung không gian địa chỉ ' +
      'nhưng <b>không</b> chung trách nhiệm.' },

    { t: 'p', x:
      'Cách nhớ sáu phân hệ chắc nhất không phải học thuộc tên, mà là gắn mỗi phân hệ với <b>một câu ' +
      'hỏi duy nhất mà nó trả lời</b>. Khi gặp một triệu chứng lạ, bạn dịch triệu chứng đó thành câu ' +
      'hỏi rồi biết ngay phải đi tìm ở đâu.' },

    { t: 'table',
      head: ['Phân hệ', 'Câu hỏi nó trả lời', 'Thư mục source', 'Cửa sổ quan sát'],
      rows: [
        ['<b>Scheduler</b><br><i>bộ lập lịch</i>',
         'Trong các tiến trình sẵn sàng chạy, <b>đứa nào được CPU tiếp theo</b>, và trong bao lâu?',
         '<code>kernel/sched/</code>',
         '<code>/proc/self/sched</code>, <code>chrt</code>, <code>/proc/loadavg</code>'],
        ['<b>Memory management</b><br><i>quản lý bộ nhớ</i>',
         'Địa chỉ ảo này ứng với khung trang vật lý nào? Còn trang trống không? Trang nào bỏ được?',
         '<code>mm/</code>',
         '<code>/proc/meminfo</code>, <code>/proc/self/maps</code>, <code>/proc/buddyinfo</code>'],
        ['<b>VFS</b><br><i>lớp file ảo</i>',
         'Cái tên <code>/home/a.txt</code> ứng với đối tượng nào, và <b>hệ thống file nào</b> phải xử lý nó?',
         '<code>fs/</code>',
         '<code>/proc/filesystems</code>, <code>/proc/mounts</code>'],
        ['<b>Network stack</b><br><i>ngăn xếp mạng</i>',
         'Gói tin này thuộc socket nào, đi ra cổng nào, theo giao thức nào?',
         '<code>net/</code>',
         '<code>/proc/net/protocols</code>, <code>ss</code>, <code>ip</code>'],
        ['<b>Driver model</b><br><i>mô hình thiết bị</i>',
         'Thiết bị vừa xuất hiện này là gì, và <b>driver nào</b> phải nhận nó?',
         '<code>drivers/</code>',
         '<code>/sys/bus/</code>, <code>/sys/class/</code>, <code>/sys/devices/</code>'],
        ['<b>Arch layer</b><br><i>lớp kiến trúc</i>',
         'Trên <i>CPU cụ thể này</i>, chuyển ngữ cảnh / bật MMU / vào ra nhân được làm bằng lệnh nào?',
         '<code>arch/arm64/</code>, <code>arch/x86/</code>…',
         '<code>/proc/cpuinfo</code>, <code>/proc/interrupts</code>']
      ]},

    { t: 'cal', kind: 'info', title: 'Lớp arch là thứ khiến Chặng 07 có nghĩa với người làm nhúng', x:
      'Năm phân hệ đầu gần như <b>giống hệt nhau</b> trên mọi kiến trúc — <code>vfs_write</code> trên ' +
      'ARM64 và trên x86-64 là <i>cùng một file mã nguồn</i>. Chỉ có <code>arch/</code> là viết riêng ' +
      'cho từng CPU. Đó chính là lý do <code>make</code> của kernel bắt bạn khai báo ' +
      '<code>ARCH=arm64</code> ở <b>Bài 40</b>: bạn đang chọn xem thư mục <code>arch/</code> nào được ' +
      'biên dịch vào. Cũng là lý do vì sao port Linux sang một CPU mới là công việc <b>lớn nhưng hữu ' +
      'hạn</b> — bạn viết lại một thư mục, không viết lại cả nhân.' },

    { t: 'terms', items: [
      ['Subsystem', 'phân hệ',
       'Một nhóm chức năng có ranh giới rõ trong nhân, có maintainer và thư mục riêng. Chung không gian địa chỉ với các phân hệ khác nhưng có giao diện nội bộ được định nghĩa hẳn hoi'],
      ['Kernel space', 'không gian nhân',
       'Chế độ thực thi đặc quyền (EL1 trên ARM64, ring 0 trên x86-64) cộng với vùng địa chỉ ảo chỉ truy cập được ở chế độ đó'],
      ['User space', 'không gian người dùng',
       'Chế độ không đặc quyền (EL0, ring 3). Mọi chương trình bạn viết từ <b>Bài 14</b> tới giờ đều chạy ở đây, kể cả khi chạy dưới quyền root'],
      ['Process context', 'ngữ cảnh tiến trình',
       'Nhân đang chạy <i>thay mặt</i> một tiến trình cụ thể — biết <code>current</code> là ai, được phép ngủ chờ'],
      ['Interrupt context', 'ngữ cảnh ngắt',
       'Nhân đang xử lý một sự kiện phần cứng, không thuộc về tiến trình nào. <b>Không được phép ngủ</b> — đây là quy tắc bị vi phạm nhiều nhất khi viết driver, xem <b>Chặng 10</b>'],
      ['Kernel module', '<code>.ko</code>',
       'Mã nhân đóng gói thành file rời, nạp được lúc chạy. Cùng đặc quyền, cùng không gian địa chỉ — chỉ khác về thời điểm nạp']
    ]},

    { t: 'fig',
      cap: 'Kiến trúc nhân Linux nhìn theo tầng. Mọi mũi tên đi xuống đều là lời gọi hàm C thường; ' +
           'chỉ có một đường kẻ duy nhất trong hình phải trả giá chuyển chế độ CPU — ranh giới syscall.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ tầng của nhân Linux: user space, giao diện syscall, sáu phân hệ, lớp arch và phần cứng">' +
        '<rect class="d-box" x="20" y="14" width="680" height="44" rx="6"/>' +
        '<text class="d-t" x="34" y="34">User space</text>' +
        '<text class="d-tm" x="34" y="50">bash · nginx · chương trình C của bạn · thư viện glibc</text>' +
        '<rect class="d-box-g" x="20" y="70" width="680" height="34" rx="6"/>' +
        '<text class="d-t" x="34" y="84">vDSO — mã của nhân chạy ở chế độ user, KHÔNG vượt ranh giới</text>' +
        '<text class="d-tm" x="34" y="98">clock_gettime · getcpu · time</text>' +
        '<line class="d-line" x1="20" y1="118" x2="700" y2="118"/>' +
        '<text class="d-ts" x="20" y="133">RANH GIỚI ĐẶC QUYỀN — chỗ duy nhất CPU phải đổi chế độ (EL0 → EL1)</text>' +
        '<rect class="d-box-p" x="20" y="142" width="680" height="34" rx="6"/>' +
        '<text class="d-t" x="34" y="163">Giao diện syscall — 942 điểm vào, đánh số cố định</text>' +
        '<rect class="d-box-a" x="20" y="188" width="106" height="52" rx="6"/>' +
        '<text class="d-t" x="34" y="208">Scheduler</text>' +
        '<text class="d-tm" x="34" y="226">kernel/sched</text>' +
        '<rect class="d-box-a" x="134" y="188" width="106" height="52" rx="6"/>' +
        '<text class="d-t" x="148" y="208">Bộ nhớ</text>' +
        '<text class="d-tm" x="148" y="226">mm/</text>' +
        '<rect class="d-box-a" x="248" y="188" width="106" height="52" rx="6"/>' +
        '<text class="d-t" x="262" y="208">VFS</text>' +
        '<text class="d-tm" x="262" y="226">fs/</text>' +
        '<rect class="d-box-a" x="362" y="188" width="106" height="52" rx="6"/>' +
        '<text class="d-t" x="376" y="208">Mạng</text>' +
        '<text class="d-tm" x="376" y="226">net/</text>' +
        '<rect class="d-box-a" x="476" y="188" width="224" height="52" rx="6"/>' +
        '<text class="d-t" x="490" y="208">Driver model + driver</text>' +
        '<text class="d-tm" x="490" y="226">drivers/</text>' +
        '<rect class="d-box-p" x="20" y="252" width="680" height="34" rx="6"/>' +
        '<text class="d-t" x="34" y="273">Lớp kiến trúc — arch/arm64 hoặc arch/x86 (viết riêng cho từng CPU)</text>' +
        '<rect class="d-box" x="20" y="296" width="680" height="26" rx="6"/>' +
        '<text class="d-t" x="34" y="314">Phần cứng — CPU · MMU · bộ điều khiển ngắt · UART · eMMC</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       4. Một syscall nhìn từ phía nhân
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Một syscall nhìn từ phía nhân' },

    { t: 'p', x:
      'Ở <b>Bài 19</b> câu chuyện dừng lại ở đúng chỗ này: bạn đặt số hiệu syscall vào một thanh ghi, ' +
      'chạy một lệnh máy, và "nhân làm việc gì đó". Giờ mở nắp ra. Lấy ví dụ quen nhất — ' +
      '<code>write(fd, buf, 1)</code> lên một file ext4.' },

    { t: 'p', x:
      'Đường đi bên trong nhân có <b>năm lớp</b>, và điều đáng nhớ là <b>mỗi lớp tồn tại để lớp trên ' +
      'nó không phải biết một điều gì đó</b>. Đây không phải kiến trúc trang trí; nó là lý do một câu ' +
      'lệnh <code>cp</code> duy nhất chạy được trên ext4, tmpfs, NFS và cả một file trong ' +
      '<code>/proc</code>.' },

    { t: 'table',
      head: ['#', 'Lớp', 'Tên hàm (x86-64)', 'Nó giấu điều gì cho lớp trên'],
      rows: [
        ['1', 'Điểm vào kiến trúc', '<code>entry_SYSCALL_64</code>',
         'Cách CPU này chuyển chế độ, cất thanh ghi, đổi sang ngăn xếp nhân. Viết bằng assembly, nằm trong <code>arch/</code>'],
        ['2', 'Bộ điều phối', '<code>do_syscall_64</code> → <code>sys_call_table</code>',
         'Việc số hiệu <code>1</code> nghĩa là <code>write</code>. Một mảng con trỏ hàm, tra bảng chứ không phải <code>switch</code>'],
        ['3', 'Lớp bọc ABI', '<code>__x64_sys_write</code>',
         'Việc tham số nằm ở thanh ghi nào, và việc con trỏ từ user space <b>không được tin</b>'],
        ['4', 'Lớp trung lập', '<code>ksys_write</code> → <code>vfs_write</code>',
         '<b>File này thuộc hệ thống file nào.</b> Đây là trái tim của VFS — nó chỉ thấy một <code>struct file</code>'],
        ['5', 'Lớp cụ thể', '<code>ext4_file_write_iter</code>',
         'Không giấu gì nữa — đây là nơi biết inode, extent, journal, và cuối cùng là khối đĩa']
      ]},

    { t: 'cal', kind: 'why', title: 'Lớp 4 sang lớp 5 không phải một lời gọi hàm bình thường', x:
      '<p>Đây là chi tiết kỹ thuật quan trọng nhất của cả bài, vì nó là <b>cách C làm đa hình</b> và ' +
      'nó lặp lại ở mọi phân hệ của nhân.</p>' +
      '<p><code>vfs_write</code> <b>không</b> chứa dòng nào gọi <code>ext4_file_write_iter</code>. Nếu ' +
      'có, thì mỗi lần thêm một hệ thống file mới lại phải sửa <code>vfs_write</code>. Thay vào đó, ' +
      'mỗi <code>struct file</code> mang theo một con trỏ tới một <b>bảng con trỏ hàm</b> tên là ' +
      '<code>struct file_operations</code>, và <code>vfs_write</code> chỉ viết đại ý:</p>' +
      '<p><code>file->f_op->write_iter(...)</code></p>' +
      '<p>Khi bạn <code>open()</code> một file trên ext4, VFS gắn bảng của ext4 vào. Mở một file trên ' +
      'tmpfs thì gắn bảng của tmpfs. Mở <code>/proc/uptime</code> thì gắn bảng của procfs. ' +
      '<b>Cùng một dòng mã ở lớp 4, ba đích đến khác nhau ở lớp 5.</b> Ở phần thực hành bạn sẽ tìm ' +
      'thấy đủ ba cái tên đó trong bảng ký hiệu của nhân đang chạy.</p>' +
      '<p>Cách nhớ: <code>f_op</code> chính là <i>bảng phương thức ảo</i> của C++, viết tay bằng C. ' +
      'Toàn bộ khả năng mở rộng của Linux — thêm hệ thống file, thêm loại thiết bị, thêm giao thức ' +
      'mạng — đều dựa trên đúng thủ thuật này.</p>' },

    { t: 'p', x:
      'Máy bạn chạy x86-64 nên các tên trên có tiền tố <code>__x64_</code>. Trên ARM64 — kiến trúc ' +
      'đích của cả khoá học này — hai lớp đầu đổi tên vì chúng thuộc <code>arch/</code>, còn ba lớp ' +
      'dưới <b>giữ nguyên từng ký tự</b>:' },

    { t: 'table',
      head: ['Lớp', 'x86-64 (máy bạn)', 'ARM64 (đích của khoá học)'],
      rows: [
        ['1 — điểm vào', '<code>entry_SYSCALL_64</code>', '<code>el0_svc</code>'],
        ['2 — điều phối', '<code>do_syscall_64</code>', '<code>invoke_syscall</code>'],
        ['3 — lớp bọc', '<code>__x64_sys_write</code>', '<code>__arm64_sys_write</code>'],
        ['4 — trung lập', '<code>ksys_write</code> → <code>vfs_write</code>', '<b>giống hệt</b>'],
        ['5 — cụ thể', '<code>ext4_file_write_iter</code>', '<b>giống hệt</b>']
      ]},

    { t: 'cal', kind: 'info', title: 'Đừng học thuộc bảng này', x:
      'Tên hàm là thứ <b>tra được</b>, không phải thứ phải nhớ. Ngay ở phần thực hành bạn sẽ có công ' +
      'cụ tự tra trên máy đang chạy (<code>grep</code> trong <code>/proc/kallsyms</code>), và ở ' +
      '<b>Bài 38</b> bạn sẽ tra thẳng trong source. Thứ đáng nhớ là <b>quy luật đặt tên</b>: ' +
      '<code>__&lt;kiến_trúc&gt;_sys_&lt;tên&gt;</code> là lớp bọc, <code>ksys_</code> và ' +
      '<code>vfs_</code> là lớp trung lập, tiền tố tên hệ thống file là lớp cụ thể. Biết quy luật thì ' +
      'nhìn một dòng trong call trace lúc kernel panic là đoán ngay được nó ở tầng nào.' },

    { t: 'fig',
      cap: 'Một write() 1 byte đi qua năm lớp. Chỉ mũi tên đầu tiên tốn chi phí đổi chế độ CPU; bốn ' +
           'mũi tên sau là lời gọi hàm thường. Mũi tên số 4 là mũi tên duy nhất đi qua một bảng con trỏ hàm.',
      svg:
        '<svg viewBox="0 0 720 340" width="720" role="img" aria-label="Đường đi của lời gọi write từ user space qua năm lớp trong nhân xuống tới ext4 và lớp block">' +
        '<rect class="d-box" x="150" y="10" width="420" height="40" rx="6"/>' +
        '<text class="d-t" x="164" y="28">User space</text>' +
        '<text class="d-tm" x="164" y="44">write(fd, "x", 1)  →  glibc  →  lệnh syscall</text>' +
        '<line class="d-line" x1="20" y1="64" x2="700" y2="64"/>' +
        '<text class="d-ts" x="20" y="79">ranh giới đặc quyền — khoảng 150 ns, đo ở Bài 19</text>' +
        '<path class="d-arrow" d="M 360 60 l -6 -12 l 12 0 z"/>' +
        '<rect class="d-box-p" x="150" y="88" width="420" height="34" rx="6"/>' +
        '<text class="d-tm" x="164" y="109">1  entry_SYSCALL_64        (assembly, arch/x86)</text>' +
        '<rect class="d-box-p" x="150" y="128" width="420" height="34" rx="6"/>' +
        '<text class="d-tm" x="164" y="149">2  do_syscall_64  →  sys_call_table[1]</text>' +
        '<rect class="d-box-p" x="150" y="168" width="420" height="34" rx="6"/>' +
        '<text class="d-tm" x="164" y="189">3  __x64_sys_write         (lớp bọc ABI)</text>' +
        '<rect class="d-box-a" x="150" y="208" width="420" height="34" rx="6"/>' +
        '<text class="d-tm" x="164" y="229">4  ksys_write  →  vfs_write     (trung lập)</text>' +
        '<text class="d-ts" x="580" y="229">file->f_op->write_iter</text>' +
        '<path class="d-arrow" d="M 200 252 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 360 252 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 520 252 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-g" x="150" y="258" width="130" height="34" rx="6"/>' +
        '<text class="d-tm" x="160" y="279">ext4_file_...</text>' +
        '<rect class="d-box-g" x="300" y="258" width="130" height="34" rx="6"/>' +
        '<text class="d-tm" x="310" y="279">shmem_file_...</text>' +
        '<rect class="d-box-g" x="450" y="258" width="130" height="34" rx="6"/>' +
        '<text class="d-tm" x="460" y="279">proc_reg_...</text>' +
        '<text class="d-ts" x="150" y="308">5  lớp cụ thể — cùng một dòng mã ở lớp 4, ba đích đến khác nhau</text>' +
        '<text class="d-ts" x="150" y="326">ext4 → lớp block → driver → đĩa · tmpfs → thẳng trang nhớ · procfs → sinh chuỗi tại chỗ</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       5. vDSO
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'vDSO — khi nhân trả lời mà bạn không phải bước qua ranh giới' },

    { t: 'p', x:
      'Ranh giới user/kernel là một bức tường bảo vệ, và bức tường nào cũng có phí qua cổng. ' +
      '<b>Bài 19</b> đã đo phí đó: khoảng <b>120–150 ns</b> mỗi lượt. Với <code>write()</code> ghi ' +
      'xuống đĩa thì 150 ns chẳng là gì. Nhưng có một nhóm syscall làm việc gần như bằng không: ' +
      '<code>clock_gettime()</code> chỉ <b>đọc một biến</b> mà nhân đã cập nhật sẵn. Trả 150 ns phí ' +
      'cổng để đọc một biến là quá đắt — và những chương trình đo thời gian gọi nó hàng triệu lần.' },

    { t: 'p', x:
      'Giải pháp của Linux gọn đến bất ngờ: <b>nhân ánh xạ một mẩu mã của chính nó vào không gian ' +
      'địa chỉ của mọi tiến trình, ở chế độ user</b>. Mẩu đó tên là <b>vDSO</b> (virtual dynamic ' +
      'shared object). Kèm theo là một trang dữ liệu chỉ đọc, <code>[vvar]</code>, mà nhân ghi vào ' +
      'còn tiến trình chỉ đọc. Khi bạn gọi <code>clock_gettime()</code>, glibc nhảy vào mã vDSO, mã ' +
      'đó đọc <code>[vvar]</code> rồi trả lời ngay — <b>không có lệnh <code>syscall</code> nào được ' +
      'thực thi, CPU không đổi chế độ một lần nào</b>.' },

    { t: 'cal', kind: 'tip', title: 'Cách nhớ: vDSO là tờ thông báo dán ngoài cổng', x:
      'Bức tường vẫn nguyên, lính gác vẫn đó. Nhưng với vài thông tin công khai và thay đổi liên tục ' +
      '(mấy giờ rồi, bạn đang ở CPU nào), nhân dán sẵn một tờ thông báo <b>ở phía ngoài cổng</b> và ' +
      'tự cập nhật nó. Bạn đọc tờ giấy, không cần xin phép vào. Tờ giấy chỉ đọc, nên chẳng có gì để ' +
      'lạm dụng.' },

    { t: 'p', x:
      'Có hai bằng chứng bạn kiểm được ngay, và cả hai đều nằm trong phần thực hành. Thứ nhất, ' +
      '<code>ldd</code> trên bất kỳ chương trình động nào cũng liệt kê <code>linux-vdso.so.1</code> ' +
      '<b>không kèm đường dẫn</b> — vì nó không phải file trên đĩa, nó do nhân sinh ra. Thứ hai, và ' +
      'đây mới là bằng chứng đanh thép: chạy một chương trình gọi <code>clock_gettime()</code> một ' +
      'triệu lần dưới <code>strace</code>, bạn sẽ thấy <b>strace không đếm được lần nào</b>, vì ' +
      '<code>strace</code> chỉ nhìn thấy thứ vượt qua ranh giới.' },

    { t: 'cal', kind: 'info', title: 'Vì sao người làm nhúng phải quan tâm', x:
      'Trên x86-64 của bạn, tỉ lệ đo được là khoảng <b>8 lần</b>. Trên một Cortex-A7 chạy 500 MHz — ' +
      'loại CPU rất phổ biến trong thiết bị nhúng giá rẻ — chi phí tuyệt đối của một syscall lớn hơn ' +
      'nhiều lần, nên vDSO càng đáng giá. Ngược lại, nếu bạn port Linux sang một kiến trúc mà vDSO ' +
      'chưa được hiện thực, mọi vòng lặp đo thời gian trong ứng dụng của bạn sẽ chậm đi một bậc mà ' +
      'không ai hiểu vì sao. Đây là loại kiến thức chỉ có ích khi bạn <b>đã biết trước</b> nó tồn tại.' },

    /* ══════════════════════════════════════════════════════════════════
       6. Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: mổ xẻ nhân đang chạy máy bạn' },

    { t: 'p', x:
      'Sáu bước dưới đây <b>không cần build gì cả</b>. Chúng đọc chính nhân đang giữ máy bạn chạy ' +
      'ngay lúc này. Đây là điều may mắn của người học Linux: đối tượng nghiên cứu luôn có sẵn, đang ' +
      'chạy, và tự mô tả bản thân.' },

    { t: 'cal', kind: 'warn', title: 'Nhân trên WSL2 là x86-64, không phải ARM64', x:
      'Bài này cố ý mổ xẻ nhân của WSL2 vì đó là nhân duy nhất bạn <b>quan sát trực tiếp</b> được — ' +
      'kernel ARM64 trong QEMU ở <b>Bài 32</b> chỉ boot lên rồi bạn đọc log, không có ' +
      '<code>/proc/config.gz</code> để soi. Mọi con số dưới đây do đó thuộc về nhân ' +
      '<code>6.18.33.2-microsoft-standard-WSL2</code>. Cấu trúc thì giống hệt trên ARM64; chỉ tên hàm ' +
      'trong <code>arch/</code> và con số cụ thể là khác. Từ <b>Bài 38</b> trở đi bạn sẽ làm việc ' +
      'thẳng trên ARM64.' },

    { t: 'steps', items: [

      /* ── BƯỚC 1 ─────────────────────────────────────────────── */
      { title: 'Kiểm kê: nhân này đã được cấu hình như thế nào',
        blocks: [

          { t: 'p', x:
            'Mọi tính năng của nhân đều là một công tắc có ba vị trí: <code>y</code> (biên dịch thẳng ' +
            'vào file kernel), <code>m</code> (biên dịch thành một <code>.ko</code> rời), hoặc tắt hẳn. ' +
            'Nhiều bản phân phối nhét luôn bản sao cấu hình vào chính nhân, đọc được qua ' +
            '<code>/proc/config.gz</code>. Bắt đầu bằng việc đếm ba nhóm đó.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai37 && cd ~/bai37\n' +
            'zcat /proc/config.gz | wc -l\n' +
            'zcat /proc/config.gz | grep -c \'=y$\'\n' +
            'zcat /proc/config.gz | grep -c \'=m$\'\n' +
            'zcat /proc/config.gz | grep -c \'is not set$\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '8757\n' +
            '2176\n' +
            '980\n' +
            '3620' },

          { t: 'cmdx', cmd: 'zcat /proc/config.gz | grep -c \'=y$\'', title: 'Từng mảnh của câu lệnh',
            rows: [
              ['<code>/proc/config.gz</code>', 'Bản sao <b>nén gzip</b> của file <code>.config</code> đã dùng để build nhân này', 'Chỉ tồn tại nếu nhân bật <code>CONFIG_IKCONFIG_PROC</code>. Nhiều kernel nhúng tắt nó đi để tiết kiệm vài chục KB'],
              ['<code>zcat</code>', 'Giải nén ra màn hình mà không tạo file tạm', 'Bằng <code>gunzip -c</code>. Đọc file nén mà không phải giải nén ra đĩa trước'],
              ['<code>grep -c</code>', 'Đếm số dòng khớp thay vì in chúng ra', 'Nhanh hơn và gọn hơn <code>grep … | wc -l</code>'],
              ['<code>\'=y$\'</code>', 'Dòng kết thúc bằng đúng <code>=y</code>', '<code>$</code> neo vào cuối dòng. Thiếu nó thì <code>CONFIG_X=y</code> và <code>CONFIG_X=yes_something</code> đều khớp']
            ]},

          { t: 'cal', kind: 'info', title: 'Đọc bốn con số này', x:
            '<p><b>2 176</b> tính năng được hàn thẳng vào file kernel. <b>980</b> tính năng thành module ' +
            'rời. <b>3 620</b> bị tắt. Tổng ba nhóm là 6 776, còn lại trong 8 757 dòng là chú thích và ' +
            'dòng trống.</p>' +
            '<p>Tỉ lệ <code>m</code> cao như vậy là dấu hiệu điển hình của một nhân <b>đa dụng</b>: nó ' +
            'không biết sẽ chạy trên máy nào nên chuẩn bị sẵn driver cho mọi thứ, dưới dạng module để ' +
            'khỏi phình file kernel. Một cấu hình nhúng chuẩn có <code>=m</code> gần bằng <b>0</b>.</p>' },

          { t: 'p', x:
            'Giờ nhìn hệ quả của tỉ lệ đó trên đĩa và trong RAM.' },

          { t: 'code', where: 'wsl', code:
            'find /lib/modules/$(uname -r)/kernel -name \'*.ko*\' | wc -l\n' +
            'du -sh /lib/modules/$(uname -r)/kernel\n' +
            'wc -l < /lib/modules/$(uname -r)/modules.builtin\n' +
            'grep -c . /proc/modules\n' +
            'lsmod | head -6' },

          { t: 'code', where: 'out', nocopy: true, code:
            '961\n' +
            '157M\t/lib/modules/6.18.33.2-microsoft-standard-WSL2/kernel\n' +
            '349\n' +
            '15\n' +
            'Module                  Size  Used by\n' +
            'intel_rapl_msr         16384  0\n' +
            'intel_rapl_common      40960  1 intel_rapl_msr\n' +
            'kvm_intel             368640  0\n' +
            'kvm                  1003520  1 kvm_intel\n' +
            'irqbypass              16384  1 kvm' },

          { t: 'cal', kind: 'why', title: 'Bốn con số kể trọn câu chuyện monolithic + module', x:
            '<p><b>961</b> file <code>.ko</code> nằm sẵn trên đĩa, chiếm <b>157 MB</b> — nhiều gấp năm ' +
            'lần bản thân file kernel. <b>349</b> "module" khác thì đã bị hàn thẳng vào kernel lúc build ' +
            '(danh sách <code>modules.builtin</code> ghi lại tên chúng để <code>modprobe</code> biết mà ' +
            'không báo lỗi). Và <b>chỉ 15</b> module thực sự đang nằm trong RAM.</p>' +
            '<p>Con số 15 đó chính là toàn bộ lợi ích của cơ chế module: máy bạn không có card đồ hoạ ' +
            'AMD nên <code>amdgpu.ko</code> (<b>22,9 MB</b>, module lớn nhất trong tủ) không bao giờ được ' +
            'nạp. Trên một thiết bị nhúng, danh sách phần cứng là cố định, nên "cái tủ 157 MB" là chi ' +
            'phí thuần tuý — và đó là lý do cấu hình nhúng chọn <code>=y</code> rồi tắt hẳn ' +
            '<code>CONFIG_MODULES</code>.</p>' +
            '<p>Cột <code>Used by</code> của <code>lsmod</code> là một thứ đáng nhìn kỹ: ' +
            '<code>kvm_intel</code> phụ thuộc <code>kvm</code>, nên <code>kvm</code> có số đếm <b>1</b>. ' +
            'Không thể gỡ <code>kvm</code> khi <code>kvm_intel</code> còn nạp. Đây là ' +
            '<b>đếm tham chiếu</b>, và ở <b>Chặng 10</b> bạn sẽ tự tay làm hỏng nó trong module của mình.</p>' }
        ]},

      /* ── BƯỚC 2 ─────────────────────────────────────────────── */
      { title: 'Bảng ký hiệu, và đường đi của một write()',
        blocks: [

          { t: 'p', x:
            'Nhân công khai <b>toàn bộ bảng ký hiệu</b> của nó qua <code>/proc/kallsyms</code> — tên ' +
            'của mọi hàm và mọi biến toàn cục, kể cả những thứ không hề được export. Đây là cửa sổ ' +
            'trực tiếp nhất để nhìn vào cấu trúc bên trong.' },

          { t: 'code', where: 'wsl', code:
            'wc -l < /proc/kallsyms\n' +
            'awk \'$2=="T" || $2=="t"\' /proc/kallsyms | wc -l\n' +
            'grep -c \'__x64_sys_\' /proc/kallsyms\n' +
            'head -3 /proc/kallsyms' },

          { t: 'code', where: 'out', nocopy: true, code:
            '211171\n' +
            '167197\n' +
            '942\n' +
            '0000000000000000 T srso_alias_untrain_ret\n' +
            '0000000000000000 T _stext\n' +
            '0000000000000000 T _text' },

          { t: 'cmdx', cmd: 'awk \'$2=="T" || $2=="t"\' /proc/kallsyms', title: 'Cột thứ hai là loại ký hiệu',
            rows: [
              ['<code>T</code>', 'Hàm, <b>được export</b> ra cho module dùng', 'Chữ hoa = tầm nhìn toàn cục'],
              ['<code>t</code>', 'Hàm, chỉ dùng nội bộ trong file đó', 'Chữ thường = <code>static</code> trong mã nguồn'],
              ['<code>D</code> / <code>d</code>', 'Biến toàn cục đã được khởi tạo', '<code>sys_call_table</code> nằm ở nhóm này'],
              ['<code>B</code> / <code>b</code>', 'Biến toàn cục chưa khởi tạo — vùng <code>.bss</code>', 'Cùng ý nghĩa với <code>.bss</code> bạn đã gặp ở <b>Bài 18</b>'],
              ['<code>R</code> / <code>r</code>', 'Dữ liệu chỉ đọc', 'Hằng số, chuỗi thông báo lỗi']
            ]},

          { t: 'cal', kind: 'tip', title: 'Con số của bạn sẽ lệch một vài đơn vị — và đó là đúng', x:
            'Đọc <code>/proc/kallsyms</code> tám lần liên tiếp trong cùng một phiên WSL cho <b>đúng ' +
            'cùng một con số</b>, không sai một dòng. Nhưng qua một lần khởi động lại, con số dịch đi ' +
            'một hai đơn vị, vì bảng ký hiệu <b>bao gồm cả ký hiệu của module đang nạp và của các ' +
            'chương trình BPF đang chạy</b> — mà tập đó không giống hệt nhau giữa hai lần boot. Đây là ' +
            'một tính chất của bảng ký hiệu, không phải sai số đo. Cái đáng nhớ là <b>bậc độ lớn</b>: ' +
            'hai trăm nghìn ký hiệu trong <i>một</i> chương trình.' },

          { t: 'cal', kind: 'warn', title: 'Vì sao mọi địa chỉ đều là 0?', x:
            '<p>Không phải nhân bị lỗi. Đó là <code>kptr_restrict</code>, một biện pháp bảo mật: ' +
            '<code>cat /proc/sys/kernel/kptr_restrict</code> trả về <b>1</b>, nghĩa là "che địa chỉ ' +
            'nhân với người dùng thường". Chỉ <code>root</code> mới thấy giá trị thật.</p>' +
            '<p>Lý do là <b>KASLR</b>: nhân được nạp vào một địa chỉ ngẫu nhiên mỗi lần boot để kẻ tấn ' +
            'công không đoán được nơi đặt hàm mục tiêu. Nếu bất kỳ ai cũng đọc được ' +
            '<code>/proc/kallsyms</code> với địa chỉ thật, toàn bộ ngẫu nhiên hoá đó vô nghĩa. ' +
            '<b>Tên ký hiệu vẫn công khai</b> — và đó chính là thứ bài này cần.</p>' },

          { t: 'p', x:
            'Giờ tới phần hay nhất: lần theo đúng năm lớp của phần lý thuyết, bằng cách hỏi nhân đang ' +
            'chạy xem nó có những hàm đó không.' },

          { t: 'code', where: 'wsl', code:
            'for s in entry_SYSCALL_64 do_syscall_64 x64_sys_call \\\n' +
            '         __x64_sys_write ksys_write vfs_write ext4_file_write_iter\n' +
            'do\n' +
            '    printf \'%-24s %s\\n\' "$s" "$(grep -cE " [Tt] $s\\$" /proc/kallsyms)"\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'entry_SYSCALL_64         1\n' +
            'do_syscall_64            1\n' +
            'x64_sys_call             1\n' +
            '__x64_sys_write          1\n' +
            'ksys_write               1\n' +
            'vfs_write                1\n' +
            'ext4_file_write_iter     1' },

          { t: 'cmdx', cmd: 'grep -cE " [Tt] $s\\$" /proc/kallsyms', title: 'Vì sao mẫu tìm phải viết chặt như vậy',
            rows: [
              ['khoảng trắng đầu', 'Buộc phải khớp ranh giới cột', 'Không có nó, <code>vfs_write</code> khớp luôn cả <code>vfs_writev</code> ở cột khác'],
              ['<code>[Tt]</code>', 'Chỉ nhận ký hiệu là <b>mã</b>', 'Loại bỏ biến trùng tên'],
              ['<code>\\$</code>', 'Neo cuối dòng, có escape vì đang trong nháy kép', 'Đây là thứ phân biệt <code>vfs_write</code> với <code>vfs_writev</code> — thiếu nó thì đếm ra 2'],
              ['<code>-cE</code>', 'Đếm, dùng regex mở rộng', '<code>-E</code> cần cho <code>[Tt]</code> hoạt động đúng ở mọi bản grep']
            ]},

          { t: 'cal', kind: 'why', title: 'Bảy chữ "1" đó chứng minh điều gì', x:
            '<p>Chúng chứng minh rằng năm lớp trong sơ đồ lý thuyết <b>không phải mô hình sư phạm</b> — ' +
            'chúng là bảy hàm C có thật, đang nằm trong bộ nhớ máy bạn ngay lúc này, xếp đúng thứ tự đó.</p>' +
            '<p>Và <b>942</b> hàm <code>__x64_sys_*</code> ở lệnh trước chính là chiều rộng của cửa: ' +
            'toàn bộ những gì user space có thể yêu cầu nhân làm, không hơn một cái. Mọi chương trình ' +
            'từng chạy trên Linux — từ <code>ls</code> tới trình duyệt — đều chỉ dùng 942 cánh cửa đó. ' +
            '<b>Đó là toàn bộ bề mặt tiếp xúc giữa hai thế giới.</b></p>' }
        ]},

      /* ── BƯỚC 3 ─────────────────────────────────────────────── */
      { title: 'VFS: một giao diện, ba hệ thống file',
        blocks: [

          { t: 'p', x:
            'Lớp 4 giấu cho lớp trên biết file thuộc hệ thống file nào. Bước này chứng minh điều đó ' +
            'bằng cách đọc ba file <b>trên ba hệ thống file khác hẳn nhau</b> và xem chương trình ' +
            '<code>cat</code> có phải làm gì khác đi không.' },

          { t: 'code', where: 'wsl', code:
            'echo "hello from ext4" > ~/bai37/real.txt\n' +
            'echo "hello from tmpfs" > /dev/shm/bai37.txt\n' +
            'for f in ~/bai37/real.txt /dev/shm/bai37.txt /proc/uptime\n' +
            'do\n' +
            '    echo "### $f   (fs = $(stat -f -c %T "$f"))"\n' +
            '    strace -e trace=openat,read,close cat "$f" 2>&1 | grep -A 2 "openat(AT_FDCWD, \\"$f\\""\n' +
            '    echo\n' +
            'done' },

          { t: 'code', where: 'out', nocopy: true, code:
            '### /home/shinarus/bai37/real.txt   (fs = ext2/ext3)\n' +
            'openat(AT_FDCWD, "/home/shinarus/bai37/real.txt", O_RDONLY|O_CLOEXEC) = 3\n' +
            'hello from ext4\n' +
            'close(3)                                = 0\n' +
            '\n' +
            '### /dev/shm/bai37.txt   (fs = tmpfs)\n' +
            'openat(AT_FDCWD, "/dev/shm/bai37.txt", O_RDONLY|O_CLOEXEC) = 3\n' +
            'hello from tmpfs\n' +
            'close(3)                                = 0\n' +
            '\n' +
            '### /proc/uptime   (fs = proc)\n' +
            'openat(AT_FDCWD, "/proc/uptime", O_RDONLY|O_CLOEXEC) = 3\n' +
            '359.74 1942.67\n' +
            'close(3)                                = 0' },

          { t: 'cal', kind: 'warn', title: '<code>stat -f</code> nói "ext2/ext3" nhưng đó là ext4', x:
            'Bản <code>stat</code> trên máy bạn (coreutils viết bằng Rust, xem <b>Bài 4</b>) gộp chung ' +
            'ba đời ext vào một tên vì chúng chia sẻ mã nhận dạng. Muốn tên chính xác thì hỏi bảng mount ' +
            'thay vì hỏi mã nhận dạng: <code>df -T ~</code> trả về đúng <code>ext4</code>. Đây là một ví ' +
            'dụ tốt cho thói quen <b>kiểm chứng chéo</b> — hai công cụ, hai đường lấy dữ liệu.' },

          { t: 'cal', kind: 'why', title: 'Ba hệ thống file hoàn toàn khác nhau, ba dòng syscall giống hệt nhau', x:
            '<p>Nhìn kỹ ba khối output: <code>openat</code> → dữ liệu → <code>close</code>. Không một ' +
            'khác biệt nào. Nhưng bên dưới, ba thứ hoàn toàn khác nhau vừa xảy ra:</p>' +
            '<ul>' +
            '<li><b>ext4</b> — đọc inode, tra extent, đọc một khối 4 KB từ đĩa (hoặc từ page cache);</li>' +
            '<li><b>tmpfs</b> — không có đĩa nào cả, dữ liệu vốn đã là những trang nhớ trong RAM;</li>' +
            '<li><b>procfs</b> — <b>không có dữ liệu nào tồn tại trước lúc bạn đọc</b>. Chuỗi ' +
            '<code>359.74 1942.67</code> được một hàm C <i>sinh ra tại chỗ</i> đúng vào khoảnh khắc ' +
            '<code>read()</code> chạy.</li>' +
            '</ul>' +
            '<p><b>Đó chính là giá trị của VFS.</b> Chương trình <code>cat</code> — viết từ trước khi ' +
            'tmpfs ra đời — chạy đúng trên cả ba, vì nó chưa bao giờ biết mình đang nói chuyện với ai.</p>' },

          { t: 'p', x:
            'Bằng chứng cuối, và nó là bằng chứng thuyết phục nhất cho việc procfs sinh dữ liệu tại chỗ:' },

          { t: 'code', where: 'wsl', code:
            'ls -l /proc/uptime /proc/kallsyms\n' +
            'cat /proc/uptime\n' +
            'sleep 1\n' +
            'cat /proc/uptime' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-r--r--r-- 1 root root 0 Aug 18 22:04 /proc/kallsyms\n' +
            '-r--r--r-- 1 root root 0 Aug 18 22:04 /proc/uptime\n' +
            '321.67 1714.66\n' +
            '322.67 1720.69' },

          { t: 'cal', kind: 'info', title: 'Một file "0 byte" trả về hơn hai trăm nghìn dòng', x:
            '<p><code>/proc/kallsyms</code> có kích thước <b>0</b> nhưng đọc ra hơn hai trăm nghìn dòng. ' +
            'Không mâu thuẫn: <b>kích thước là một thuộc tính mà hệ thống file tự khai</b>, và procfs ' +
            'khai 0 vì nó thành thật — nó chưa biết sẽ sinh ra bao nhiêu byte cho tới lúc bạn đọc.</p>' +
            '<p>Hệ quả thực dụng bạn phải nhớ: <b>đừng bao giờ tin <code>st_size</code> của một file ' +
            'trong <code>/proc</code> hay <code>/sys</code></b>. Cấp phát bộ đệm theo con số đó là ' +
            'cấp phát 0 byte. Đọc cho tới khi <code>read()</code> trả về 0, đúng như bạn đã làm khi viết ' +
            'lại <code>cp</code> ở <b>Bài 19</b>.</p>' +
            '<p>Và hai lần <code>cat</code> cách nhau một giây cho hai giá trị khác nhau — file này ' +
            'không có nội dung, nó có một <b>hàm sinh nội dung</b>.</p>' }
        ]},

      /* ── BƯỚC 4 ─────────────────────────────────────────────── */
      { title: 'Driver model: tam giác bus – device – driver',
        blocks: [

          { t: 'p', x:
            'Phân hệ cuối cùng đáng nhìn tận mắt là mô hình thiết bị, vì nó là thứ bạn sẽ sống cùng ' +
            'suốt <b>Chặng 08</b> và <b>Chặng 10</b>. Nhân không quản lý thiết bị bằng một danh sách ' +
            'phẳng; nó dựng một cấu trúc ba đỉnh và phơi toàn bộ ra <code>/sys</code>.' },

          { t: 'code', where: 'wsl', code:
            'ls -1 /sys/bus | wc -l\n' +
            'ls -1 /sys/class | wc -l\n' +
            'ls -1 /sys/bus/virtio' },

          { t: 'code', where: 'out', nocopy: true, code:
            '34\n' +
            '69\n' +
            'devices\n' +
            'drivers\n' +
            'drivers_autoprobe\n' +
            'drivers_probe\n' +
            'uevent' },

          { t: 'p', x:
            'Mọi thư mục bus đều có đúng hình dạng đó: một danh sách <b>thiết bị</b> đang cắm và một ' +
            'danh sách <b>driver</b> đang sẵn sàng. Việc của nhân là ghép cặp chúng. Xem cặp đã ghép:' },

          { t: 'code', where: 'wsl', code:
            'for d in /sys/bus/virtio/devices/*\n' +
            'do\n' +
            '    printf \'%-9s modalias=%-28s driver=%s\\n\' \\\n' +
            '        "$(basename "$d")" "$(cat "$d"/modalias)" \\\n' +
            '        "$(basename "$(readlink -f "$d"/driver)")"\n' +
            'done\n' +
            'cat /sys/bus/virtio/devices/virtio0/uevent' },

          { t: 'code', where: 'out', nocopy: true, code:
            'virtio0   modalias=virtio:d00000003v00001AF4    driver=virtio_console\n' +
            'virtio1   modalias=virtio:d0000001Av00001AF4    driver=virtiofs\n' +
            'DRIVER=virtio_console\n' +
            'MODALIAS=virtio:d00000003v00001AF4' },

          { t: 'cmdx', cmd: 'virtio:d00000003v00001AF4', title: 'Đọc một modalias',
            rows: [
              ['<code>virtio:</code>', 'Tên bus', 'Quyết định phần còn lại của chuỗi được diễn giải thế nào — mỗi bus có định dạng riêng'],
              ['<code>d00000003</code>', '<b>Device ID</b> = 3 = thiết bị console', 'Đây là thứ nói "tôi là loại thiết bị gì". Số 3 do đặc tả virtio quy định'],
              ['<code>v00001AF4</code>', '<b>Vendor ID</b> = <code>0x1AF4</code> = Red Hat/Qumranet', 'Nhà sản xuất. <code>0x1AF4</code> là mã dành riêng cho thiết bị ảo virtio'],
              ['<code>driver=</code>', 'Kết quả ghép cặp, do nhân điền vào', 'Nếu không driver nào nhận, symlink này <b>không tồn tại</b> — triệu chứng kinh điển của "thiết bị có nhưng không hoạt động"']
            ]},

          { t: 'cal', kind: 'why', title: 'modalias là sợi dây nối phần cứng với file .ko', x:
            '<p>Đây là cơ chế bạn phải hiểu trước khi bước vào <b>Chặng 10</b>, vì nó trả lời câu hỏi ' +
            '"làm sao Linux biết phải nạp module nào".</p>' +
            '<ol>' +
            '<li>Thiết bị xuất hiện trên bus. Bus đọc được ID của nó và sinh ra chuỗi ' +
            '<code>modalias</code>.</li>' +
            '<li>Nhân bắn một sự kiện <b>uevent</b> lên user space, mang theo chuỗi đó.</li>' +
            '<li><code>udev</code> nhận sự kiện, tra chuỗi trong bảng ' +
            '<code>/lib/modules/…/modules.alias</code>, tìm ra tên module.</li>' +
            '<li><code>modprobe</code> nạp module. Module đăng ký driver. Nhân ghép cặp và gọi hàm ' +
            '<code>probe()</code> của driver.</li>' +
            '</ol>' +
            '<p>Cả chuỗi đó là lý do bạn cắm USB vào máy Ubuntu thì nó chạy ngay. Cách nhớ: ' +
            '<b>modalias là số CMND của thiết bị, còn <code>modules.alias</code> là quyển danh bạ</b> ' +
            'tra từ số CMND ra tên module.</p>' +
            '<p>Trên thiết bị nhúng, bước 1 thường <b>không tồn tại</b>: bus I2C hay SPI không có cách ' +
            'nào tự khai báo thiết bị nào đang cắm. Đó chính xác là vì sao Device Tree tồn tại, và vì ' +
            'sao <b>Chặng 08</b> nằm ngay sau chặng này.</p>' }
        ]},

      /* ── BƯỚC 5 ─────────────────────────────────────────────── */
      { title: 'Đo vDSO: khi nhân trả lời mà không đổi chế độ CPU',
        blocks: [

          { t: 'p', x:
            'Chương trình dưới đây gọi <code>clock_gettime()</code> một triệu lần theo hai đường: ' +
            'đường thông thường (glibc tự chọn vDSO) và đường ép buộc qua syscall thật. Cùng một công ' +
            'việc, cùng một kết quả, chỉ khác con đường.' },

          { t: 'code', where: 'file', name: '~/bai37/vdso.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <time.h>\n' +
            '#include <unistd.h>\n' +
            '#include <sys/syscall.h>\n' +
            '\n' +
            '#define N 1000000\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    struct timespec t1, t2, tmp;\n' +
            '    double a, b;\n' +
            '\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
            '    for (int i = 0; i < N; i++)\n' +
            '        clock_gettime(CLOCK_MONOTONIC, &tmp);\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t2);\n' +
            '    a = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);\n' +
            '\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
            '    for (int i = 0; i < N; i++)\n' +
            '        syscall(SYS_clock_gettime, CLOCK_MONOTONIC, &tmp);\n' +
            '    clock_gettime(CLOCK_MONOTONIC, &t2);\n' +
            '    b = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);\n' +
            '\n' +
            '    printf("vdso    : %8.1f ns/call\\n", a / N);\n' +
            '    printf("syscall : %8.1f ns/call\\n", b / N);\n' +
            '    printf("ratio   : %8.1fx\\n", b / a);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'cmdx', cmd: 'syscall(SYS_clock_gettime, CLOCK_MONOTONIC, &tmp);',
            title: 'Vì sao phải gọi bằng số hiệu thay vì gọi hàm',
            rows: [
              ['<code>clock_gettime(...)</code>', 'Đường bình thường — glibc <b>tự động</b> nhảy vào vDSO', 'Bạn không điều khiển được; glibc quyết định'],
              ['<code>syscall(SYS_…)</code>', 'Ép đi qua lệnh máy <code>syscall</code>, bỏ qua vDSO', 'Cùng thủ thuật bạn đã dùng ở <b>Bài 19</b> để tránh bộ nhớ đệm của <code>getpid()</code>'],
              ['<code>CLOCK_MONOTONIC</code>', 'Đồng hồ chỉ tăng, không bị NTP kéo lùi', 'Bắt buộc cho mọi phép đo khoảng thời gian'],
              ['<code>N</code> = 1 000 000', 'Đủ lớn để nhiễu bị chia nhỏ', 'Với chi phí cỡ 10–150 ns, một triệu lần cho tổng cỡ 0,02–0,15 s — đo được tin cậy']
            ]},

          { t: 'code', where: 'wsl', code:
            'cd ~/bai37\n' +
            'gcc -Wall -O2 -o vdso vdso.c\n' +
            './vdso\n' +
            './vdso\n' +
            './vdso' },

          { t: 'code', where: 'out', nocopy: true, code:
            'vdso    :     20.1 ns/call\n' +
            'syscall :    172.2 ns/call\n' +
            'ratio   :      8.6x\n' +
            'vdso    :     19.4 ns/call\n' +
            'syscall :    151.7 ns/call\n' +
            'ratio   :      7.8x\n' +
            'vdso    :     16.5 ns/call\n' +
            'syscall :    137.4 ns/call\n' +
            'ratio   :      8.3x' },

          { t: 'cal', kind: 'info', title: 'Chạy ba lần, tỉ lệ ổn định 7,8–8,6 lần', x:
            'Giá trị tuyệt đối dao động vì WSL2 chia CPU với Windows — đúng như đã cảnh báo ở ' +
            '<b>Bài 19</b>. Nhưng <b>tỉ lệ</b> thì bám rất chặt quanh <b>8×</b>, vì cả tử số lẫn mẫu ' +
            'số cùng chịu chung một loại nhiễu. Khi báo cáo một phép đo hiệu năng, hãy báo cáo tỉ lệ ' +
            'chứ đừng báo cáo con số tuyệt đối — đó là thói quen phân biệt người đo cẩn thận với người ' +
            'đo bừa.' },

          { t: 'p', x:
            'Giờ là bằng chứng quyết định. Chương trình gọi <code>clock_gettime</code> <b>hai triệu ' +
            'lần</b>. Hỏi <code>strace</code> xem nó đếm được bao nhiêu.' },

          { t: 'code', where: 'wsl', code:
            'strace -c -e trace=clock_gettime ./vdso\n' +
            'ldd ./vdso\n' +
            'grep -E \'vdso|vvar\' /proc/self/maps' },

          { t: 'code', where: 'out', nocopy: true, code:
            'vdso    :     15.3 ns/call\n' +
            'syscall :  98126.8 ns/call\n' +
            'ratio   :   6394.4x\n' +
            '% time     seconds  usecs/call     calls    errors syscall\n' +
            '------ ----------- ----------- --------- --------- ----------------\n' +
            '100.00   18.231013          18   1000000           clock_gettime\n' +
            '------ ----------- ----------- --------- --------- ----------------\n' +
            '100.00   18.231013          18   1000000           total\n' +
            '\tlinux-vdso.so.1 (0x000071d6dd16e000)\n' +
            '\tlibc.so.6 => /usr/lib/x86_64-linux-gnu/libc.so.6 (0x000071d6dce00000)\n' +
            '\t/lib64/ld-linux-x86-64.so.2 (0x000071d6dd170000)\n' +
            '7dbfe1748000-7dbfe174c000 r--p 00000000 00:00 0                          [vvar]\n' +
            '7dbfe174c000-7dbfe174e000 r--p 00000000 00:00 0                          [vvar_vclock]\n' +
            '7dbfe174e000-7dbfe1750000 r-xp 00000000 00:00 0                          [vdso]' },

          { t: 'cal', kind: 'why', title: 'Ba bằng chứng trong một output, đọc kỹ từng cái', x:
            '<p><b>1. <code>strace</code> đếm đúng 1 000 000, không phải 2 000 000.</b> Chương trình gọi ' +
            'hai triệu lần. Một nửa <b>hoàn toàn vô hình</b> với <code>strace</code>, vì ' +
            '<code>strace</code> làm việc bằng cách chặn ở ranh giới nhân, và nửa vDSO chưa từng đi tới ' +
            'ranh giới đó. Đây là chứng minh trực tiếp nhất có thể có.</p>' +
            '<p><b>2. <code>ldd</code> in <code>linux-vdso.so.1</code> mà không có đường dẫn.</b> Mọi ' +
            'thư viện khác đều có đường dẫn tới file thật trên đĩa. <code>linux-vdso.so.1</code> ' +
            'không — vì <b>không có file nào cả</b>. Thử <code>find / -name \'linux-vdso*\'</code> thì ' +
            'sẽ không ra gì. Nhân dựng nó trong bộ nhớ lúc nạp chương trình.</p>' +
            '<p><b>3. Ba dòng cuối là chính nó, trong bản đồ bộ nhớ của tiến trình.</b> ' +
            '<code>[vdso]</code> có cờ <code>r-xp</code> — đọc được và <b>thực thi được</b>, đó là mã. ' +
            '<code>[vvar]</code> có cờ <code>r--p</code> — chỉ đọc, đó là dữ liệu nhân ghi vào cho bạn ' +
            'đọc. Cả hai không có tên file ở cột cuối, đúng như dự đoán.</p>' +
            '<p>Còn con số <b>6394,4×</b>? Đó là <code>strace</code> tự làm hỏng phép đo của chính nó: ' +
            'mỗi syscall bị chặn hai lần bằng <code>ptrace</code>, đẩy 150 ns lên <b>98 microgiây</b> — ' +
            'chậm hơn <b>650 lần</b>. Ghi nhớ điều này: <b><code>strace</code> để đếm và để xem, không ' +
            'bao giờ để đo thời gian.</b></p>' }
        ]},

      /* ── BƯỚC 6 ─────────────────────────────────────────────── */
      { title: 'Đọc tỉ lệ user/sys: chương trình đang tốn thời gian ở phía nào',
        blocks: [

          { t: 'p', x:
            'Bước cuối khép lại vòng tròn với ý ở đầu bài — nhân tiêu thời gian CPU <b>của tiến trình ' +
            'bạn</b>. Hai chương trình dưới đây chạy xấp xỉ cùng một khoảng thời gian nhưng ở hai phía ' +
            'khác nhau của ranh giới.' },

          { t: 'code', where: 'file', name: '~/bai37/spin.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '\n' +
            '#define N 200000000L\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    volatile double total = 0;\n' +
            '\n' +
            '    for (long i = 1; i < N; i++)\n' +
            '        total += 1.0 / i;\n' +
            '    printf("%f\\n", total);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'file', name: '~/bai37/chatty.c', lang: 'c', code:
            '#include <fcntl.h>\n' +
            '#include <unistd.h>\n' +
            '\n' +
            '#define N 2000000\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    int fd = open("/dev/null", O_WRONLY);\n' +
            '    long done = 0;\n' +
            '\n' +
            '    for (int i = 0; i < N; i++)\n' +
            '        done += write(fd, "x", 1);\n' +
            '    close(fd);\n' +
            '    return done == N ? 0 : 1;\n' +
            '}' },

          { t: 'cmdx', cmd: 'done += write(fd, "x", 1);', title: 'Ba chi tiết cố ý trong hai chương trình',
            rows: [
              ['<code>volatile double</code>', 'Cấm <code>-O2</code> xoá vòng lặp trong <code>spin.c</code>', 'Không có nó, trình biên dịch thấy <code>total</code> vô dụng và cả vòng lặp biến mất — bạn đo được 0 giây'],
              ['<code>done +=</code>', 'Dùng giá trị trả về của <code>write</code>', 'Bỏ qua giá trị này thì <code>-Wall</code> cảnh báo <code>warn_unused_result</code>. Một cảnh báo là một lỗi'],
              ['<code>/dev/null</code>', 'Đích ghi rẻ nhất có thể', 'Ghi ra file thật sẽ đo thêm cả lớp block và đĩa — ta chỉ muốn đo <b>chi phí vượt ranh giới</b>']
            ]},

          { t: 'code', where: 'wsl', code:
            'cd ~/bai37\n' +
            'gcc -Wall -O2 -o spin spin.c\n' +
            'gcc -Wall -O2 -o chatty chatty.c\n' +
            'time ./spin > /dev/null\n' +
            'time ./chatty' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m0.560s\n' +
            'user\t0m0.556s\n' +
            'sys\t0m0.004s\n' +
            '\n' +
            'real\t0m0.288s\n' +
            'user\t0m0.064s\n' +
            'sys\t0m0.224s' },

          { t: 'table',
            head: ['Chương trình', 'user', 'sys', 'Tỉ lệ sys', 'Nghĩa là'],
            rows: [
              ['<code>spin</code> — 200 triệu phép chia', '0,556 s', '0,004 s', '<b>0,7 %</b>',
               'Gần như không hề gọi nhân. Muốn nhanh hơn thì phải tối ưu <b>mã của bạn</b>'],
              ['<code>chatty</code> — 2 triệu <code>write()</code>', '0,064 s', '0,224 s', '<b>78 %</b>',
               'Phần lớn thời gian nằm trong nhân. Muốn nhanh hơn thì phải <b>gọi nhân ít lần hơn</b>']
            ]},

          { t: 'cal', kind: 'why', title: 'Đây là công cụ chẩn đoán rẻ nhất mà bạn có', x:
            '<p>Trước khi cài <code>perf</code>, trước khi dựng bất kỳ profiler nào, hãy chạy ' +
            '<code>time</code> và nhìn tỉ lệ <code>sys</code>/<code>real</code>. Nó chia mọi bài toán ' +
            'hiệu năng làm hai nửa, và <b>hai nửa đó cần hai cách chữa hoàn toàn khác nhau</b>:</p>' +
            '<ul>' +
            '<li><code>sys</code> thấp, <code>user</code> cao → nút cổ chai nằm trong mã của bạn. ' +
            'Thuật toán, cấu trúc dữ liệu, cờ tối ưu.</li>' +
            '<li><code>sys</code> cao → nút cổ chai nằm ở <b>số lần bạn gọi nhân</b>. Cách chữa là gộp ' +
            'nhiều việc nhỏ thành ít việc lớn — đúng bài học stdio đệm ở <b>Bài 19</b>, nơi 200 000 lần ' +
            'ghi rút xuống còn 559 lần.</li>' +
            '<li>cả hai đều thấp mà <code>real</code> cao → tiến trình đang <b>chờ</b>, không phải đang ' +
            'chạy. Chờ đĩa, chờ mạng, chờ khoá. Cách chữa lại khác hẳn hai trường hợp trên.</li>' +
            '</ul>' +
            '<p>Và <code>0,224 s</code> ở cột <code>sys</code> của <code>chatty</code> chính là câu mở ' +
            'đầu bài này, đo được thành số: <b>nhân đã tiêu 0,224 giây bằng ngân sách CPU của tiến trình ' +
            '<code>chatty</code></b>, vì nhân không có ngân sách nào khác.</p>' },

          { t: 'p', x:
            'Dọn dẹp. Thư mục <code>~/bai37</code> không được bài nào sau này dùng lại, xoá được ngay:' },

          { t: 'code', where: 'wsl', code:
            'rm -f /dev/shm/bai37.txt\n' +
            'rm -rf ~/bai37' }
        ]}

    ]},

    /* ══════════════════════════════════════════════════════════════════
       7. Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>gzip: /proc/config.gz: No such file or directory</code>',
         'Nhân này được build <b>không bật</b> <code>CONFIG_IKCONFIG_PROC</code>, nên nó không mang theo bản sao cấu hình. Rất phổ biến trên kernel nhúng — bật nó tốn vài chục KB',
         'Tìm cấu hình ở chỗ khác: <code>/boot/config-$(uname -r)</code> trên máy để bàn, hoặc file <code>.config</code> trong cây source đã build. Nếu không có cái nào thì <b>không có cách nào khôi phục</b> cấu hình từ một file kernel — đó là lý do <b>Bài 39</b> dạy bạn lưu <code>defconfig</code> vào Git'],
        ['<code>gzip: /proc/uptime: not in gzip format</code>',
         'Bạn dùng <code>zcat</code> lên một file <code>/proc</code> thường. Chỉ <code>config.gz</code> là dữ liệu nén; tất cả các file <code>/proc</code> khác đều là văn bản thuần',
         'Dùng <code>cat</code>. Quy tắc: chỉ đúng <b>một</b> file trong <code>/proc</code> có đuôi <code>.gz</code>'],
        ['<code>grep -cE \' [Tt] vfs_write\' /proc/kallsyms</code> trả về <b>2</b> thay vì 1',
         'Thiếu neo cuối dòng <code>$</code>, nên mẫu khớp luôn cả <code>vfs_writev</code>',
         'Luôn viết <code>\' [Tt] vfs_write$\'</code>. Trong nháy kép phải escape thành <code>\\$</code>. Đây là lỗi làm sai lệch mọi phép đếm ký hiệu — kiểm bằng cách bỏ <code>-c</code> ra để <b>nhìn</b> dòng nào khớp'],
        ['<code>find: \'/lib/modules/…/lost+found\': Permission denied</code>',
         'Bạn quét cả <code>/lib/modules/$(uname -r)</code> thay vì chỉ thư mục con <code>kernel/</code>. Thư mục <code>lost+found</code> chỉ <code>root</code> vào được',
         'Quét <code>/lib/modules/$(uname -r)/kernel</code> như trong bài. Con số vẫn đúng vì mọi file <code>.ko</code> đều nằm dưới đó — thêm <code>2&gt;/dev/null</code> chỉ che thông báo chứ không sửa nguyên nhân'],
        ['<code>cat: /sys/kernel/tracing/available_tracers: Permission denied</code>',
         'Cửa sổ ftrace chỉ mở cho <code>root</code> (<code>drwx------</code>). Máy này <b>không có <code>sudo</code> dùng được</b>',
         'Không cần thiết cho bài này. Mọi cửa sổ mà bài dùng — <code>/proc/kallsyms</code>, <code>/proc/config.gz</code>, <code>/sys/bus</code> — đều đọc được với quyền thường. ftrace sẽ quay lại ở <b>Chặng 10</b>'],
        ['Mọi địa chỉ trong <code>/proc/kallsyms</code> đều là <code>0000000000000000</code>',
         '<b>Không phải lỗi.</b> <code>kptr_restrict</code> = 1 che địa chỉ nhân với người dùng thường, để KASLR còn có ý nghĩa',
         'Bỏ qua — bài này chỉ cần <b>tên</b> ký hiệu, và tên vẫn hiện đầy đủ. Đừng đi tìm cách tắt <code>kptr_restrict</code>: nó là lớp phòng thủ thật, không phải phiền toái'],
        ['<code>warning: ignoring return value of \'write\' declared with attribute \'warn_unused_result\'</code>',
         'Bạn gõ <code>write(fd, "x", 1);</code> mà bỏ giá trị trả về. glibc đánh dấu <code>write</code> là <b>bắt buộc phải kiểm tra</b>, vì một <code>write</code> ngắn hoặc lỗi mà bỏ qua là mất dữ liệu âm thầm',
         'Dùng giá trị đó, như <code>chatty.c</code> làm với <code>done += write(...)</code>. <b>Đừng</b> ép kiểu <code>(void)</code> cho qua — ở đây nó còn tiện làm luôn phép kiểm tra cuối chương trình'],
        ['<code>stat -f</code> báo <code>ext2/ext3</code> cho một phân vùng ext4',
         'Ba đời ext dùng chung mã nhận dạng hệ thống file, và bản coreutils viết bằng Rust trên máy này gộp chúng vào một tên',
         'Hỏi bảng mount thay vì hỏi mã nhận dạng: <code>df -T ~</code> hoặc <code>findmnt -no FSTYPE ~</code> đều trả về đúng <code>ext4</code>'],
        ['<code>ratio : 6394.4x</code> khi chạy <code>vdso</code> dưới <code>strace</code>',
         '<b>Không phải lỗi, nhưng là một phép đo vô giá trị.</b> <code>strace</code> chặn mỗi syscall hai lần bằng <code>ptrace</code>, đẩy 150 ns lên 98 µs',
         'Không bao giờ đo thời gian dưới <code>strace</code>. Dùng nó để <b>đếm</b> và để <b>xem</b>; đo thì chạy chương trình trần']
      ]},

    /* ══════════════════════════════════════════════════════════════════
       8. Ghi nhớ
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Ghi nhớ', items: [
      'Nhân <b>không chạy — nhân được gọi</b>. Đúng ba con đường: syscall (bạn gọi), ngắt (phần cứng ' +
      'gọi), kernel thread (nhân tự hẹn). Nhân không có PID và không có ngân sách CPU riêng.',

      'Linux là <b>monolithic</b>: lập lịch, bộ nhớ, hệ thống file, mạng và <b>mọi driver</b> chung một ' +
      'không gian địa chỉ, gọi nhau bằng lời gọi hàm C. Nhanh, và một driver lỗi thì cả máy panic.',

      'Một <code>.ko</code> nạp vào là <b>một phần của nhân</b>, cùng đặc quyền, cùng không gian địa ' +
      'chỉ. <b>Module là quyết định đóng gói, không phải cách ly.</b> Nó không biến Linux thành microkernel.',

      'Nhân đang chạy có <b>2 176</b> tính năng <code>=y</code>, <b>980</b> tính năng <code>=m</code>, ' +
      '<b>961</b> file <code>.ko</code> nằm sẵn (<b>157 MB</b>) nhưng chỉ <b>15</b> module thực sự nạp. ' +
      'Cấu hình nhúng lật ngược tỉ lệ này: gần như tất cả <code>=y</code>, và thường tắt hẳn ' +
      '<code>CONFIG_MODULES</code>.',

      'Sáu phân hệ, mỗi phân hệ một câu hỏi: <b>scheduler</b> (ai được CPU tiếp), <b>mm</b> (trang nào ' +
      'ở đâu), <b>VFS</b> (tên này thuộc hệ thống file nào), <b>net</b> (gói này của socket nào), ' +
      '<b>driver model</b> (thiết bị này ai nhận), <b>arch</b> (trên CPU này làm bằng lệnh gì). Chỉ ' +
      '<code>arch/</code> là viết riêng cho từng kiến trúc.',

      'Một <code>write()</code> đi qua <b>năm lớp</b>: <code>entry_SYSCALL_64</code> → ' +
      '<code>do_syscall_64</code> → <code>__x64_sys_write</code> → <code>vfs_write</code> → ' +
      '<code>ext4_file_write_iter</code>. Bảy hàm này có thật trong nhân máy bạn, đếm được bằng ' +
      '<code>grep</code> trong <code>/proc/kallsyms</code>.',

      'Lớp 4 sang lớp 5 đi qua <b>bảng con trỏ hàm</b> <code>file->f_op->write_iter</code> — đa hình ' +
      'viết tay bằng C. Đó là lý do <code>cat</code> chạy đúng trên ext4, tmpfs và <code>/proc</code> ' +
      'với <b>ba dòng syscall giống hệt nhau</b>.',

      'File trong <code>/proc</code> có <code>st_size</code> = <b>0</b> nhưng đọc ra hàng nghìn dòng: ' +
      'nội dung được <b>sinh ra lúc bạn đọc</b>. Không bao giờ cấp phát bộ đệm theo kích thước của một ' +
      'file <code>/proc</code> hay <code>/sys</code>.',

      '<b>vDSO</b> là mã của nhân chạy ở chế độ user. <code>clock_gettime()</code> qua vDSO nhanh hơn ' +
      'syscall thật <b>8 lần</b> (19 ns so với 159 ns), và <code>strace</code> <b>không nhìn thấy nó</b> ' +
      '— bằng chứng trực tiếp rằng nó chưa từng vượt ranh giới.',

      'Tỉ lệ <code>sys</code>/<code>real</code> của <code>time</code> là công cụ chẩn đoán rẻ nhất bạn ' +
      'có: <code>spin</code> tốn <b>0,7 %</b> ở nhân (sửa mã của bạn), <code>chatty</code> tốn ' +
      '<b>78 %</b> (gọi nhân ít lần hơn), cả hai thấp mà <code>real</code> cao nghĩa là đang <b>chờ</b>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      'Bài này bạn đọc kiến trúc nhân qua <b>cửa sổ</b> — <code>/proc</code> và <code>/sys</code> chỉ ' +
      'cho thấy những gì nhân chịu công khai. <b>Bài 38</b> mở thẳng cánh cửa: tải source kernel từ ' +
      'kernel.org và tìm đường trong đó. Bảy cái tên hàm bạn vừa <code>grep</code> ra từ ' +
      '<code>/proc/kallsyms</code> sẽ trở thành bảy dòng mã C có số dòng cụ thể, trong ' +
      '<code>arch/</code>, <code>fs/</code> và <code>fs/ext4/</code> — kể cả phiên bản ARM64 ' +
      '(<code>el0_svc</code>, <code>__arm64_sys_write</code>) mà máy x86-64 của bạn không có. ' +
      'Thử thách của Bài 38 không phải là đọc code, mà là <b>định hướng</b>: cây source có khoảng ' +
      '<b>ba mươi triệu dòng</b>, và mở nó ra bằng trình soạn thảo là cách chắc chắn nhất để lạc.' },

  ],

  quiz: [
    { q: 'Nhân Linux có PID bằng bao nhiêu?',
      opts: [
        'PID 0',
        'PID 1',
        'Nhân không có PID, vì nó không phải một tiến trình',
        'Mỗi CPU một PID riêng'
      ],
      a: 2,
      why: 'Nhân là mã đặc quyền được thực thi nhờ thời gian CPU của thứ khác — của tiến trình gọi ' +
           'syscall, của tiến trình xui xẻo bị ngắt cắt ngang, hoặc của một kernel thread. PID 0 là ' +
           'tiến trình idle và PID 1 là init/systemd, cả hai đều không phải "nhân". Hệ quả đo được: ' +
           'cột sys của time là thời gian nhân đã tiêu bằng ngân sách CPU của chính tiến trình bạn.' },

    { q: 'Vì sao việc Linux nạp được driver dưới dạng file <code>.ko</code> <b>không</b> làm cho Linux trở thành microkernel?',
      opts: [
        'Vì <code>.ko</code> phải được ký số trước khi nạp',
        'Vì mã trong <code>.ko</code> chạy cùng đặc quyền, cùng không gian địa chỉ, và gọi hàm nhân trực tiếp',
        'Vì chỉ driver mới được đóng thành <code>.ko</code>, hệ thống file thì không',
        'Vì <code>.ko</code> được nạp lúc boot chứ không phải lúc đang chạy'
      ],
      a: 1,
      why: 'Microkernel định nghĩa bằng <b>cách ly</b>: driver là tiến trình user space riêng, nói ' +
           'chuyện qua thông điệp, chết một mình. Module chỉ định nghĩa <b>thời điểm và cách đóng gói</b>: ' +
           'sau insmod, mã đó ghi đè được lên bất kỳ biến nào của nhân và một con trỏ NULL trong nó làm ' +
           'panic cả máy. Ranh giới đặc quyền không hề dịch chuyển.' },

    { q: 'Bạn đọc <code>/proc/kallsyms</code> và thấy mọi địa chỉ đều là <code>0000000000000000</code>. Nguyên nhân đúng nhất là gì?',
      opts: [
        'Nhân chưa được relocate, phải chờ boot xong',
        'File bị hỏng, cần mount lại <code>/proc</code>',
        '<code>kptr_restrict</code> đang che địa chỉ nhân với người dùng không phải root, để KASLR còn ý nghĩa',
        'Kernel này được build không có thông tin debug'
      ],
      a: 2,
      why: 'Nhân được nạp vào địa chỉ ngẫu nhiên mỗi lần boot (KASLR) để kẻ tấn công không đoán được ' +
           'vị trí hàm mục tiêu. Nếu người dùng thường đọc được địa chỉ thật qua /proc/kallsyms thì ' +
           'toàn bộ ngẫu nhiên hoá đó vô ích, nên kptr_restrict=1 thay chúng bằng số 0. Tên ký hiệu ' +
           'vẫn hiện đầy đủ — và tên mới là thứ có ích khi đọc kiến trúc.' },

    { q: 'Ba lệnh <code>cat</code> lên một file ext4, một file tmpfs và <code>/proc/uptime</code> cho ra ba dòng syscall giống hệt nhau. Điều gì làm được chuyện đó?',
      opts: [
        '<code>cat</code> tự nhận dạng hệ thống file rồi chọn cách đọc phù hợp',
        'Cả ba file đều được nhân sao chép vào tmpfs trước khi đọc',
        '<code>vfs_write</code>/<code>vfs_read</code> gọi qua bảng con trỏ hàm <code>f_op</code> được gắn vào <code>struct file</code> lúc <code>open()</code>',
        'Ba hệ thống file này dùng chung mã đọc của ext4'
      ],
      a: 2,
      why: 'Đây là đa hình viết tay bằng C. Lớp VFS không hề chứa dòng nào gọi tên ext4; nó chỉ viết ' +
           'file->f_op->read_iter(...). Lúc open(), VFS gắn bảng của hệ thống file tương ứng vào, nên ' +
           'cùng một dòng mã dẫn tới ext4_file_read_iter, shmem_file_read_iter hay proc_reg_read_iter. ' +
           'Chính cơ chế này khiến thêm một hệ thống file mới không phải sửa một dòng nào trong fs/read_write.c.' },

    { q: 'Bạn chạy một chương trình gọi <code>clock_gettime()</code> hai triệu lần dưới <code>strace -c</code>, nhưng strace chỉ đếm được một triệu. Kết luận nào đúng?',
      opts: [
        'strace bỏ sót do quá tải, cần tăng bộ đệm',
        'Một triệu lời gọi đã được phục vụ bởi vDSO nên chưa bao giờ vượt qua ranh giới nhân',
        'glibc gộp hai lời gọi liên tiếp thành một syscall',
        'Nhân đã lưu kết quả vào bộ nhớ đệm nên chỉ cần gọi một nửa số lần'
      ],
      a: 1,
      why: 'strace làm việc bằng cách chặn ở đúng ranh giới user/kernel. Thứ nó không đếm được là thứ ' +
           'chưa từng đi tới đó. Nhân ánh xạ một mẩu mã của mình (vDSO) vào không gian tiến trình ở chế ' +
           'độ user; mẩu đó đọc trang dữ liệu [vvar] rồi trả lời ngay, không có lệnh syscall nào chạy. ' +
           'Đây là bằng chứng trực tiếp nhất cho sự tồn tại của vDSO, và cũng là lý do vDSO nhanh hơn 8 lần.' },

    { q: 'Một chương trình chạy 4 giây, <code>time</code> báo <code>user 0m0.2s</code> và <code>sys 0m3.6s</code>. Hướng tối ưu hợp lý nhất là gì?',
      opts: [
        'Đổi thuật toán và bật cờ tối ưu cao hơn cho trình biên dịch',
        'Giảm <b>số lần</b> gọi vào nhân — gộp nhiều thao tác nhỏ thành ít thao tác lớn',
        'Tăng độ ưu tiên bằng <code>nice -n -20</code>',
        'Chuyển sang một nhân microkernel để giảm chi phí syscall'
      ],
      a: 1,
      why: '90 % thời gian nằm ở cột sys, nghĩa là CPU đang chạy mã nhân thay mặt chương trình — hầu ' +
           'như luôn do gọi syscall quá nhiều lần. Tối ưu mã user space (đáp án A) chỉ động tới 0,2 s. ' +
           'Đổi độ ưu tiên không giảm khối lượng công việc. Còn microkernel thì làm mỗi lần vượt ranh ' +
           'giới <b>đắt hơn</b>, không rẻ hơn. Cách chữa đúng là ít lần vượt biên hơn, mỗi lần làm nhiều ' +
           'việc hơn — đúng bài học đệm stdio ở Bài 19.' }
  ]
});

/* Bài 42 — Vì sao Device Tree ra đời
   Chặng 08 — Device Tree
   Bài mở đầu Chặng 08. Vấn đề "board file" trước 2011: mô tả phần cứng viết bằng C nằm
   trong cây nguồn kernel; vì sao phần cứng nhúng không tự dò được; cuộc dọn dẹp arm-soc và
   việc tách mô tả phần cứng thành dữ liệu; ARM chọn Device Tree còn x86 chọn ACPI. Thực
   hành đọc dấu vết cuộc chuyển đổi ngay trong cây nguồn 6.18.45 của Bài 38, rồi chứng minh
   bằng bốn lần boot QEMU rằng cùng MỘT file Image mô tả được nhiều cấu hình phần cứng khác
   nhau. Mọi số liệu đo trên kernel 6.18.45 do Bài 40 build, ARCH=arm64, QEMU virt. */

Lesson.register({
  id: 'bai-42',
  title: 'Vì sao Device Tree ra đời',
  minutes: 45,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Suốt bốn bài vừa rồi bạn đã gõ <code>-M virt</code> hàng chục lần mà chưa một lần nào ' +
    'phải nói cho kernel biết bo mạch ảo đó có bao nhiêu RAM, UART nằm ở địa chỉ nào, hay ' +
    'bộ điều khiển ngắt thuộc loại gì. Kernel <b>tự biết</b> — và đó chính là điều cần được ' +
    'giải thích. Nó không đoán, không dò, và cũng không có dòng mã C nào trong ' +
    '<code>Image</code> viết riêng cho máy ảo <code>virt</code>. Nó <i>được đưa cho</i> một ' +
    'tệp dữ liệu mô tả toàn bộ phần cứng, ngay tại thời điểm boot. Tệp đó tên là ' +
    '<b>Device Tree</b>, và Chặng 08 dành trọn bốn bài cho nó.<br><br>' +
    'Bài này chưa dạy bạn viết một dòng Device Tree nào — đó là việc của Bài 43. Bài này trả ' +
    'lời câu hỏi đứng trước mọi cú pháp: <b>vì sao thứ này phải tồn tại?</b> Câu trả lời là ' +
    'một câu chuyện kỹ thuật có thật, có ngày tháng, có người nổi giận, và có hậu quả còn ' +
    'nguyên trong cây nguồn kernel trên máy bạn ngay lúc này. Bạn sẽ tự tay đếm những mảnh ' +
    'sót lại của thế giới cũ trong <code>~/bai38/linux-6.18.45</code>, đọc một "board file" ' +
    'thật viết năm 2006, rồi nhìn thứ đã thay thế nó.<br><br>' +
    'Cuối bài, bạn boot cùng <b>một</b> file <code>Image</code> bốn lần: hai lần với hai cấu ' +
    'hình phần cứng khác hẳn nhau, hai lần còn lại để bắt quả tang kernel tự tra Device Tree ' +
    'tìm lấy cổng nối tiếp khi bạn cố tình không nói cho nó biết. Không build lại, không sửa ' +
    'một byte nào trong kernel. Đó là toàn bộ ý tưởng của Device Tree, gói trong bốn dòng lệnh.',

  goals: [
    'Giải thích được vì sao phần cứng trên bo mạch nhúng <b>không tự khai báo</b> được, ' +
      'trong khi thiết bị PCI hay USB trên máy bàn thì có — và vì sao đó là gốc rễ của toàn ' +
      'bộ vấn đề.',
    'Mô tả được thế giới "board file" trước 2011: mỗi bo mạch một file C trong cây nguồn ' +
      'kernel, và bốn hệ quả cụ thể mà cách làm đó gây ra.',
    'Chỉ ra được dấu vết còn sót của cuộc chuyển đổi ngay trong cây nguồn 6.18.45: đếm được ' +
      'số board file còn lại, đọc được một file thật, và nhận ra file đã thay thế chúng.',
    'Phân biệt được ba khái niệm hay bị gộp làm một: <b>DTS</b> (mã nguồn), <b>DTB</b> ' +
      '(nhị phân), và <b>binding</b> (tài liệu quy ước) — cùng vì sao tiền tố trong kernel ' +
      'lại là <code>of_</code> chứ không phải <code>dt_</code>.',
    'Nêu được vì sao ARM chọn Device Tree còn x86 chọn ACPI, và kiểm chứng cả hai bằng ' +
      '<code>/sys/firmware</code> trên hai máy khác kiến trúc.',
    'Chứng minh bằng thực nghiệm rằng cùng một <code>Image</code> phục vụ được nhiều cấu ' +
      'hình phần cứng khác nhau, và rằng Device Tree cung cấp cho kernel cả những thứ mà ' +
      'dòng lệnh không hề nhắc tới.'
  ],

  blocks: [

    /* ============================================================
       1. THẾ GIỚI TRƯỚC 2011
       ============================================================ */
    { t: 'h2', x: 'Thế giới trước 2011: mỗi bo mạch một file C' },

    { t: 'p', x:
      'Hãy đặt mình vào vị trí của một kỹ sư kernel năm 2008. Bạn có một bo mạch ARM mới. ' +
      'Nó có một UART tại địa chỉ <code>0x4806a000</code>, một bộ điều khiển đèn LED nối ' +
      'vào chân GPIO số 55, một chip nhớ NAND 64 MiB, và một nút bấm nối vào ngắt số 12. ' +
      'Kernel Linux <b>không có cách nào biết được những điều đó</b>. Vậy bạn làm gì? Bạn ' +
      'viết chúng ra — bằng C — thành một file đặt trong chính cây nguồn kernel, tên là ' +
      '<code>arch/arm/mach-&lt;dòng-chip&gt;/board-&lt;tên-bo-mạch&gt;.c</code>. File đó gọi ' +
      'là <b>board file</b>.' },

    { t: 'p', x:
      'Đây không phải chuyện lịch sử xa xôi: <b>20 file như vậy vẫn còn trong cây nguồn ' +
      '6.18.45 trên máy bạn</b>, và trong phần Thực hành bạn sẽ mở một cái ra đọc. Chúng là ' +
      'những mẫu vật cuối cùng của một thời đại — hầu hết đồng loại của chúng đã bị xoá.' },

    { t: 'fig',
      cap: 'Cùng một mục tiêu, hai chỗ đặt thông tin. Bên trái, "bo mạch này có gì" là mã C ' +
           'biên dịch cứng vào kernel — thêm một bo mạch là thêm một file nguồn. Bên phải, ' +
           'nó là một tệp dữ liệu tách rời, nạp lúc boot — kernel không cần biết trước bo ' +
           'mạch nào sẽ chạy nó.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="So sánh hai cách mô tả phần cứng: bên trái board file viết bằng C nằm trong cây nguồn kernel tạo ra một vmlinux cho một bo mạch, bên phải Device Tree là dữ liệu tách rời cho phép một Image chạy nhiều bo mạch">' +
        '<text class="d-t" x="18" y="18">TRƯỚC 2011 — mô tả phần cứng là MÃ</text>' +
        '<rect class="d-box" x="18" y="28" width="330" height="126" rx="6"/>' +
        '<text class="d-ts" x="30" y="46">Cây nguồn kernel</text>' +
        '<rect class="d-box-w" x="30" y="54" width="148" height="26" rx="4"/>' +
        '<text class="d-tm" x="40" y="71">board-osk.c</text>' +
        '<rect class="d-box-w" x="186" y="54" width="148" height="26" rx="4"/>' +
        '<text class="d-tm" x="196" y="71">board-sx1.c</text>' +
        '<rect class="d-box-w" x="30" y="86" width="148" height="26" rx="4"/>' +
        '<text class="d-tm" x="40" y="103">board-n8x0.c</text>' +
        '<rect class="d-box-w" x="186" y="86" width="148" height="26" rx="4"/>' +
        '<text class="d-ts" x="196" y="103">… vài trăm file nữa</text>' +
        '<rect class="d-box-a" x="30" y="118" width="304" height="26" rx="4"/>' +
        '<text class="d-tm" x="40" y="135">driver pl011 · driver i2c · driver mtd</text>' +
        '<line class="d-line" x1="183" y1="154" x2="183" y2="184"/>' +
        '<path class="d-arrow" d="M 183 192 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-w" x="18" y="196" width="330" height="54" rx="6"/>' +
        '<text class="d-t" x="30" y="216">MỘT vmlinux cho MỘT bo mạch</text>' +
        '<text class="d-ts" x="30" y="236">thêm bo mạch = thêm file .c = biên dịch lại kernel</text>' +
        '<text class="d-ts" x="18" y="272">6.18.45 còn sót 20 file board-*.c — 4 220 dòng</text>' +
        '<text class="d-t" x="372" y="18">TỪ 2011 — mô tả phần cứng là DỮ LIỆU</text>' +
        '<rect class="d-box" x="372" y="28" width="330" height="126" rx="6"/>' +
        '<text class="d-ts" x="384" y="46">Cây nguồn kernel — chỉ còn mã dùng chung</text>' +
        '<rect class="d-box-g" x="384" y="54" width="148" height="26" rx="4"/>' +
        '<text class="d-tm" x="394" y="71">drivers/of/</text>' +
        '<rect class="d-box-g" x="540" y="54" width="148" height="26" rx="4"/>' +
        '<text class="d-tm" x="550" y="71">driver pl011</text>' +
        '<text class="d-ts" x="384" y="98">Tệp dữ liệu, nằm NGOÀI kernel:</text>' +
        '<rect class="d-box-a" x="384" y="106" width="96" height="26" rx="4"/>' +
        '<text class="d-tm" x="394" y="123">bo-A.dtb</text>' +
        '<rect class="d-box-a" x="488" y="106" width="96" height="26" rx="4"/>' +
        '<text class="d-tm" x="498" y="123">bo-B.dtb</text>' +
        '<rect class="d-box-a" x="592" y="106" width="96" height="26" rx="4"/>' +
        '<text class="d-tm" x="602" y="123">bo-C.dtb</text>' +
        '<line class="d-line" x1="537" y1="154" x2="537" y2="184"/>' +
        '<path class="d-arrow" d="M 537 192 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-g" x="372" y="196" width="330" height="54" rx="6"/>' +
        '<text class="d-t" x="384" y="216">MỘT Image cho NHIỀU bo mạch</text>' +
        '<text class="d-ts" x="384" y="236">chọn bo mạch = chọn file .dtb lúc boot</text>' +
        '<text class="d-ts" x="372" y="272">6.18.45 có 2 738 file .dts/.dtsi cho ARM — 780 994 dòng</text>' +
        '</svg>' },

    { t: 'p', x:
      'Một board file không chứa driver. Driver cho chip UART PL011 chỉ có <b>một bản duy ' +
      'nhất</b> trong toàn kernel, dùng chung cho mọi bo mạch — điều đó vốn đã đúng và vẫn ' +
      'đúng. Cái mà board file chứa là <b>những con số riêng của bo mạch này</b>: địa chỉ ' +
      'nào, ngắt số mấy, chân GPIO nào, xung nhịp bao nhiêu. Nó là chất keo nối driver dùng ' +
      'chung với phần cứng cụ thể.' },

    { t: 'h3', x: 'Vì sao không để kernel tự dò ra?' },

    { t: 'p', x:
      'Đây là câu hỏi đầu tiên mọi người mới đều hỏi, và câu trả lời là điểm mấu chốt của cả ' +
      'Chặng 08. Trên máy bàn của bạn, cắm một card mạng PCIe vào là Linux nhận ra ngay — ' +
      'không ai phải khai báo gì. Vậy vì sao bo mạch nhúng không làm được như thế? Vì hai ' +
      'loại bus này khác nhau về bản chất:' },

    { t: 'table',
      head: ['', 'Bus tự khai báo (PCI, PCIe, USB)', 'Thiết bị gắn thẳng vào SoC (MMIO)'],
      rows: [
        ['Ví dụ',
         'card mạng PCIe, chuột USB, ổ NVMe',
         'UART, I2C, SPI, GPIO, bộ đếm thời gian, bộ điều khiển ngắt'],
        ['Có mạch trả lời khi bị hỏi?',
         '<b>Có.</b> Bus định nghĩa một không gian cấu hình; máy chủ đọc được vendor ID + ' +
           'device ID từ chính thiết bị',
         '<b>Không.</b> Không có kênh nào để hỏi. Thanh ghi nằm ở một địa chỉ vật lý cố ' +
           'định, và chỉ có thế'],
        ['Nếu đọc nhầm địa chỉ?',
         'Không xảy ra — địa chỉ do bus cấp phát lúc liệt kê',
         'Đọc vào một vùng nhớ không ai quản lý. Trên ARM64 thường là ' +
           '<code>synchronous external abort</code> và máy chết ngay — bạn đã thấy đúng lỗi ' +
           'này ở Bài 36'],
        ['Kernel biết được bằng cách nào?',
         'Tự liệt kê lúc khởi động (<i>enumeration</i>)',
         '<b>Phải có người nói cho nó.</b> Trước 2011: bằng mã C. Từ 2011: bằng Device Tree']
      ] },

    { t: 'cal', kind: 'why', title: 'Câu này đáng nhớ hơn mọi cú pháp bạn sắp học',
      x: '<b>Device Tree tồn tại chỉ vì một lý do: phần lớn phần cứng trên một SoC nhúng ' +
         'không có cách nào tự giới thiệu bản thân.</b> Nó câm. Bạn muốn kernel dùng được ' +
         'nó thì phải có ai đó viết ra "cái gì ở đâu". Toàn bộ tranh luận từ 2011 tới nay ' +
         'không phải về <i>có cần mô tả hay không</i> — điều đó là bắt buộc — mà là về ' +
         '<b>mô tả đó nên nằm ở đâu</b>: bên trong kernel dưới dạng mã, hay bên ngoài ' +
         'kernel dưới dạng dữ liệu. Nếu bạn chỉ nhớ một câu từ bài này, hãy nhớ câu này.' },

    { t: 'h3', x: 'Bốn hệ quả của việc để mô tả phần cứng nằm trong mã kernel' },

    { t: 'p', x:
      'Cách làm bằng board file chạy được, và chạy được suốt gần mười năm. Vấn đề không phải ' +
      'nó sai, mà là nó <b>không co giãn được</b>. Mỗi hệ quả dưới đây đều nhỏ khi có mười ' +
      'bo mạch, và thành thảm hoạ khi có một nghìn:' },

    { t: 'list', ordered: true, items: [
      '<b>Muốn hỗ trợ một bo mạch mới thì phải sửa kernel.</b> Không phải cấu hình lại, mà ' +
        'thêm mã nguồn mới vào một dự án có hàng nghìn người đóng góp, rồi chờ nó được nhận ' +
        'vào bản phát hành. Một nhà sản xuất bo mạch nhỏ không có cách nào ra sản phẩm mà ' +
        'không phải bảo trì một nhánh kernel riêng.',
      '<b>Một kernel chỉ chạy được một bo mạch.</b> Board file được biên dịch cứng vào ' +
        '<code>vmlinux</code>, nên bản dựng cho bo mạch A không boot nổi trên bo mạch B dù ' +
        'hai bo cùng dùng đúng một con chip. Các bản phân phối như Debian hay Fedora không ' +
        'thể phát hành <i>một</i> kernel ARM — điều mà họ vẫn làm được với x86 từ thập niên 90.',
      '<b>Cùng một thông tin bị chép đi chép lại.</b> Hai mươi bo mạch dùng chung một SoC ' +
        'thì hai mươi board file cùng khai lại địa chỉ UART giống hệt nhau. Sửa một chỗ sai ' +
        'nghĩa là sửa hai mươi chỗ, và luôn sót.',
      '<b>Cây nguồn phình ra không kiểm soát nổi.</b> Đây là hệ quả giết chết cách làm cũ. ' +
        'Thư mục <code>arch/arm/</code> trở thành nơi đổ hàng trăm nghìn dòng mã mà không ' +
        'người bảo trì nào đọc hết được, và mọi kỳ phát hành lại xung đột với nhau.'
    ] },

    { t: 'cal', kind: 'info', title: 'Con số vẫn còn đọc được hôm nay',
      x: 'Ngay cả sau mười lăm năm dọn dẹp, <code>arch/arm/mach-*</code> trong 6.18.45 vẫn ' +
         'còn <b>474</b> file <code>.c</code> với <b>108 675</b> dòng, trải trên <b>55</b> ' +
         'thư mục dòng chip. Hãy hình dung con số đó khi <i>chưa</i> ai dọn, và khi mỗi bo ' +
         'mạch còn góp thêm một file riêng. Để so sánh: toàn bộ hạ tầng Device Tree của ' +
         'kernel — <code>drivers/of/</code>, thứ phục vụ <b>mọi</b> bo mạch trên đời — chỉ ' +
         'có <b>22</b> file <code>.c</code> và <b>18 236</b> dòng. Bạn sẽ tự đếm lại cả hai ' +
         'con số này ở bước 1 phần Thực hành.' },

    /* ============================================================
       2. CUỘC DỌN DẸP 2011
       ============================================================ */
    { t: 'h2', x: 'Năm 2011: giọt nước tràn ly' },

    { t: 'p', x:
      'Đầu năm 2011, mỗi kỳ mở cửa hợp nhất (<i>merge window</i>) của kernel lại mang về ' +
      'một đợt mã ARM khổng lồ, phần lớn là board file, và các nhánh đó liên tục xung đột ' +
      'với nhau. Ngày <b>17/3/2011</b>, trong một luồng thư trên danh sách thư ' +
      '<i>Linux Kernel Mailing List</i>, Linus Torvalds công khai từ chối tiếp tục nhận theo ' +
      'kiểu đó. Câu mở đầu của ông — <i>"Gaah. Guys, this whole ARM thing is a f*cking pain ' +
      'in the ass"</i> — được trích lại nhiều đến mức trở thành cột mốc quen thuộc của giới ' +
      'kernel ARM.' },

    { t: 'cal', kind: 'info', title: 'Đây là lịch sử, không phải thứ bạn kiểm chứng được bằng lệnh',
      x: 'Khác với mọi con số khác trong bài này, mốc thời gian và câu trích trên không đo ' +
         'được trên máy bạn — chúng nằm trong kho lưu trữ thư điện tử công khai của LKML. ' +
         'Cây nguồn 6.18.45 bạn tải về ở Bài 38 là một bản <i>tarball</i> không kèm lịch sử ' +
         'Git, còn bản sao Git ở <code>~/bai38/linux</code> là bản <b>nông</b> ' +
         '(<i>shallow clone</i>, chỉ 1 commit) — nên <code>git log</code> ở đó không đào lại ' +
         'được năm 2011. Muốn tự kiểm chứng, bạn cần một bản sao đầy đủ ' +
         '(<code>git clone</code> không có <code>--depth</code>, khoảng 5 GB và rất lâu) rồi ' +
         'chạy <code>git log --diff-filter=D -- "arch/arm/mach-*/board-*.c"</code>. Bài này ' +
         'không bắt bạn làm việc đó; nhưng bạn <i>sẽ</i> tự đếm được kết quả của cuộc dọn ' +
         'dẹp ngay trong cây nguồn hiện tại.' },

    { t: 'p', x:
      'Điều quan trọng không phải câu chửi, mà là những gì xảy ra sau đó. Cộng đồng ARM lập ' +
      'ra một nhánh bảo trì chung mang tên <b><code>arm-soc</code></b> để mọi thay đổi ARM đi ' +
      'qua một cửa duy nhất, và đồng thời chấp nhận một hướng kỹ thuật đã có sẵn ở kiến trúc ' +
      'khác: <b>Device Tree</b>.' },

    { t: 'cal', kind: 'tip', title: 'Device Tree không phải phát minh của ARM',
      x: 'Nó có trước, và tên gọi trong kernel để lộ điều đó. Device Tree đến từ chuẩn ' +
         '<b>Open Firmware (IEEE 1275)</b>, dùng trên máy Sun và Apple PowerPC từ thập niên ' +
         '90. Kiến trúc <code>powerpc</code> trong Linux đã dùng nó từ trước; hôm nay trong ' +
         'cây 6.18.45 vẫn còn <b>171</b> file <code>.dts</code> dưới ' +
         '<code>arch/powerpc/boot/dts</code>. ARM chỉ là kiến trúc <i>mượn lại</i> một giải ' +
         'pháp đã được chứng minh. Đó là lý do mọi hàm liên quan trong kernel mang tiền tố ' +
         '<code>of_</code> — <b>o</b>pen <b>f</b>irmware — chứ không phải <code>dt_</code>: ' +
         '<code>of_property_read_u32()</code>, <code>of_match_table</code>, ' +
         '<code>of_platform_populate()</code>. Bạn sẽ gõ những cái tên này rất nhiều ở ' +
         'Chặng 10; giờ chỉ cần biết <code>of_</code> nghĩa là "liên quan tới Device Tree".' },

    { t: 'p', x:
      'Kernel tự khai điều đó trong chính phần trợ giúp Kconfig của mình. Ở Bài 39 bạn đã ' +
      'học đọc <code>Kconfig</code>; đây là mục bật hạ tầng Device Tree, và nó gọi thẳng ' +
      'tên cả hai:' },

    { t: 'code', where: 'file', name: 'drivers/of/Kconfig — dòng 11', nocopy: true, code:
      'menuconfig OF\n' +
      '\tbool "Device Tree and Open Firmware support"' },

    { t: 'h3', x: 'Mục tiêu thật sự: một kernel, nhiều bo mạch' },

    { t: 'p', x:
      'Đích đến của cuộc dọn dẹp không phải là "cú pháp đẹp hơn", mà là một khả năng rất cụ ' +
      'thể mà x86 đã có từ lâu còn ARM thì chưa: <b>một file kernel duy nhất boot được trên ' +
      'nhiều bo mạch khác nhau</b>. Kernel gọi khả năng đó là ' +
      '<code>CONFIG_ARCH_MULTIPLATFORM</code>, và phần trợ giúp của nó nói đúng một câu:' },

    { t: 'code', where: 'file', name: 'arch/arm/Kconfig — dòng 338', nocopy: true, code:
      'config ARCH_MULTIPLATFORM\n' +
      '\tbool "Require kernel to be portable to multiple machines" if EXPERT\n' +
      '\tdepends on MMU && !(ARCH_FOOTBRIDGE || ARCH_RPC || ARCH_SA1100)\n' +
      '\tdefault y\n' +
      '\thelp\n' +
      '\t  In general, all Arm machines can be supported in a single\n' +
      '\t  kernel image, covering either Armv4/v5 or Armv6/v7.' },

    { t: 'cal', kind: 'why', title: 'Vì sao dòng "default y" này là bằng chứng cuộc chuyển đổi đã thắng',
      x: 'Năm 2011 câu <i>"all Arm machines can be supported in a single kernel image"</i> ' +
         'là một tham vọng. Hôm nay nó là <b>mặc định</b> — <code>default y</code> — và ' +
         'dòng <code>depends on</code> ngay trên nó liệt kê hết ngoại lệ: đúng ba dòng chip ' +
         'cổ (<code>FOOTBRIDGE</code>, <code>RPC</code>, <code>SA1100</code>), tất cả đều ' +
         'thuộc thập niên 90. Nói cách khác: trong kernel hiện đại, <i>không</i> hỗ trợ ' +
         'nhiều bo mạch bằng một ảnh kernel mới là trường hợp bất thường phải xin phép. ' +
         'Kiến trúc <b><code>arm64</code> thì thậm chí không bao giờ biết tới thế giới cũ</b>: ' +
         'nó ra đời năm 2012, sau cuộc chuyển đổi, nên cây nguồn có <b>0</b> file ' +
         '<code>board-*.c</code> và <b>0</b> thư mục <code>mach-*</code>. Đó chính là lý do ' +
         'suốt Chặng 05 tới Chặng 07 bạn chưa bao giờ phải nghe tới board file: bạn học ' +
         'ARM64 ngay từ đầu.' },

    /* ============================================================
       3. Ý TƯỞNG CỐT LÕI
       ============================================================ */
    { t: 'h2', x: 'Ý tưởng cốt lõi: mô tả phần cứng là dữ liệu, không phải mã' },

    { t: 'p', x:
      'Toàn bộ Device Tree gói gọn trong một phép đổi chỗ. Thông tin "bo mạch này có gì" ' +
      'không biến mất — nó vẫn phải tồn tại, vẫn phải chính xác tới từng địa chỉ. Chỉ có ' +
      '<b>chỗ đặt</b> và <b>dạng tồn tại</b> của nó thay đổi: từ mã C biên dịch cứng vào ' +
      'kernel, thành một tệp dữ liệu riêng biệt được trao cho kernel lúc boot.' },

    { t: 'table',
      head: ['', 'Board file (mã)', 'Device Tree (dữ liệu)'],
      rows: [
        ['Viết bằng', 'C', 'DTS — một ngôn ngữ mô tả, không có lệnh, không có vòng lặp'],
        ['Biên dịch bằng', '<code>gcc</code>, thành một phần của <code>vmlinux</code>',
         '<code>dtc</code>, thành file <code>.dtb</code> <b>riêng</b>'],
        ['Nằm ở đâu lúc chạy', 'Bên trong ảnh kernel',
         'Trong bộ nhớ, do bootloader nạp và trao cho kernel'],
        ['Ai đọc nó', 'Chính nó chạy — nó <i>là</i> mã khởi tạo',
         'Hạ tầng <code>drivers/of/</code> phân tích, rồi khớp với driver'],
        ['Đổi mô tả phần cứng', 'Sửa C, biên dịch lại kernel',
         'Sửa <code>.dts</code>, dịch lại <b>một file nhỏ</b>, kernel giữ nguyên'],
        ['Một bản dựng phục vụ', 'Một bo mạch', 'Bao nhiêu bo mạch cũng được']
      ] },

    { t: 'fig',
      cap: 'Đường đi của một mô tả phần cứng, từ lúc bạn gõ tới lúc kernel dùng. Ba mảnh trái ' +
           'xảy ra trên máy build; hai mảnh phải xảy ra trên bo mạch, mỗi lần boot. Điểm cần ' +
           'nhớ: sau khi dtc chạy xong, kernel và mô tả phần cứng là hai file hoàn toàn tách rời.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ đường đi của Device Tree: file dts và dtsi được dtc biên dịch thành dtb, bootloader nạp dtb vào RAM và trao địa chỉ cho kernel, kernel dùng drivers of để phân tích và khớp driver">' +
        '<text class="d-ts" x="18" y="16">TRÊN MÁY BUILD — một lần, lúc biên dịch</text>' +
        '<rect class="d-box" x="18" y="24" width="150" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="44">Mã nguồn</text>' +
        '<text class="d-tm" x="30" y="62">virt.dts</text>' +
        '<text class="d-tm" x="30" y="76">skeleton.dtsi</text>' +
        '<line class="d-line" x1="168" y1="53" x2="204" y2="53"/>' +
        '<path class="d-arrow" d="M 212 53 l -10 -5 l 0 10 z"/>' +
        '<rect class="d-box-p" x="214" y="24" width="120" height="58" rx="6"/>' +
        '<text class="d-t" x="226" y="48">Trình dịch</text>' +
        '<text class="d-tm" x="226" y="68">dtc</text>' +
        '<line class="d-line" x1="334" y1="53" x2="370" y2="53"/>' +
        '<path class="d-arrow" d="M 378 53 l -10 -5 l 0 10 z"/>' +
        '<rect class="d-box-a" x="380" y="24" width="150" height="58" rx="6"/>' +
        '<text class="d-t" x="392" y="44">Nhị phân</text>' +
        '<text class="d-tm" x="392" y="62">virt.dtb — 1 048 576 B</text>' +
        '<text class="d-ts" x="392" y="76">còn gọi là FDT</text>' +
        '<line class="d-line" x1="455" y1="82" x2="455" y2="106"/>' +
        '<path class="d-arrow" d="M 455 114 l -5 -10 l 10 0 z"/>' +
        '<text class="d-ts" x="18" y="136">TRÊN BO MẠCH — mỗi lần boot</text>' +
        '<rect class="d-box" x="380" y="118" width="150" height="52" rx="6"/>' +
        '<text class="d-t" x="392" y="138">Bootloader</text>' +
        '<text class="d-ts" x="392" y="156">nạp .dtb vào RAM</text>' +
        '<line class="d-line" x1="380" y1="144" x2="344" y2="144"/>' +
        '<path class="d-arrow" d="M 336 144 l 10 -5 l 0 10 z"/>' +
        '<rect class="d-box-g" x="166" y="118" width="170" height="52" rx="6"/>' +
        '<text class="d-t" x="178" y="138">Kernel nhận địa chỉ</text>' +
        '<text class="d-tm" x="178" y="156">x0 = địa chỉ DTB</text>' +
        '<line class="d-line" x1="251" y1="170" x2="251" y2="192"/>' +
        '<path class="d-arrow" d="M 251 200 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-g" x="18" y="202" width="684" height="40" rx="6"/>' +
        '<text class="d-t" x="30" y="220">drivers/of/ phân tích cây, tạo thiết bị, khớp với driver qua chuỗi compatible</text>' +
        '<text class="d-ts" x="30" y="236">22 file .c · 18 236 dòng · phục vụ mọi bo mạch ARM, ARM64, PowerPC, RISC-V</text>' +
        '</svg>' },

    { t: 'cal', kind: 'info', title: 'Bạn đã nhìn thấy mũi tên "x0 = địa chỉ DTB" rồi',
      x: 'Ở <b>Bài 33</b> bạn đã dùng GDB nhìn vào thanh ghi <code>x0</code> ngay tại thời ' +
         'điểm kernel bắt đầu chạy, thấy nó trỏ tới <code>0x48200000</code>, và đọc ra bốn ' +
         'byte đầu <code>0xedfe0dd0</code> — chính là số nhận dạng <code>d00dfeed</code> ' +
         'viết ngược theo thứ tự little-endian. Lúc đó bạn chỉ biết "đây là DTB". Bây giờ ' +
         'bạn biết nó là gì: <b>toàn bộ mô tả phần cứng của bo mạch, đang được trao tay</b>. ' +
         'Bài 33 cũng đã chứng minh hậu quả khi phá vỡ giao kèo này: đặt ' +
         '<code>x0 = 0</code> rồi cho chạy tiếp thì kernel chết <b>im lặng tuyệt đối</b>, ' +
         'không một dòng log. Không có mô tả phần cứng thì kernel không đi nổi một bước.' },

    { t: 'terms',
      items: [
        ['Device Tree', 'DT', 'Cây mô tả phần cứng của một bo mạch. Là <i>khái niệm</i>, không phải một định dạng file cụ thể.'],
        ['Device Tree Source', '.dts', 'File văn bản bạn viết và đọc được. Mỗi bo mạch thường có một file <code>.dts</code>. Cú pháp là nội dung Bài 43.'],
        ['DT Source Include', '.dtsi', 'Phần dùng chung được nhiều <code>.dts</code> <code>#include</code> — thường mô tả cả một dòng SoC, để hai mươi bo mạch cùng chip không phải chép lại nhau.'],
        ['Device Tree Blob', '.dtb', 'Bản nhị phân do <code>dtc</code> sinh ra từ <code>.dts</code>. Đây là thứ thật sự được nạp vào RAM lúc boot.'],
        ['Flattened Device Tree', 'FDT', 'Tên gọi khác của đúng cái <code>.dtb</code> đó, dùng nhiều trong mã U-Boot và kernel (<code>libfdt</code>, <code>fdt_blob</code>, <code>/sys/firmware/fdt</code>). Gặp chữ nào cũng là một thứ.'],
        ['Device Tree Compiler', 'dtc', 'Trình dịch <code>.dts</code> → <code>.dtb</code>. Đã có sẵn trên máy bạn qua gói <code>device-tree-compiler</code>; Bài 45 sẽ dùng nó theo cả hai chiều.'],
        ['Binding', '—', 'Tài liệu quy ước: với một loại thiết bị, được phép và bắt buộc khai những thuộc tính nào. Sống trong <code>Documentation/devicetree/bindings/</code> — <b>6 009</b> file trong cây 6.18.45. Nội dung Bài 44.'],
        ['Open Firmware', 'OF', 'Chuẩn IEEE 1275 mà Device Tree kế thừa. Là lý do mọi API trong kernel mang tiền tố <code>of_</code>.']
      ] },

    { t: 'cal', kind: 'warn', title: 'Ba chữ hay bị dùng lẫn — phân biệt ngay từ bây giờ',
      x: 'Người ta nói "sửa device tree" khi ý là sửa <b>.dts</b>; nói "nạp device tree" khi ' +
         'ý là nạp <b>.dtb</b>; và nói "device tree của thiết bị này" khi ý là <b>binding</b> ' +
         'của nó. Ba thứ khác nhau: <b>.dts là thứ bạn viết, .dtb là thứ máy đọc, binding là ' +
         'thứ quy định bạn được viết gì.</b> Đây là chỗ gây nhầm nhiều nhất khi đọc tài liệu ' +
         'và hỏi trên diễn đàn — nhớ ba vế đó và bạn sẽ luôn hiểu đúng người ta đang nói về ' +
         'cái nào.' },

    /* ============================================================
       4. ARM vs x86
       ============================================================ */
    { t: 'h2', x: 'ARM chọn Device Tree, x86 chọn ACPI' },

    { t: 'p', x:
      'Máy tính x86 của bạn cũng có phần cứng không tự khai báo — cũng có bộ đếm thời gian, ' +
      'cũng có bộ điều khiển ngắt, cũng có nút nguồn. Vậy vì sao nó không cần Device Tree? ' +
      'Vì nó có một cơ chế khác giải quyết đúng bài toán đó, ra đời sớm hơn và đi theo một ' +
      'triết lý khác: <b>ACPI</b> — <i>Advanced Configuration and Power Interface</i>. ' +
      'Firmware của máy (BIOS ngày xưa, UEFI ngày nay) đặt sẵn trong RAM một bộ bảng mô tả ' +
      'phần cứng, và hệ điều hành đọc các bảng đó.' },

    { t: 'p', x:
      'Khác biệt then chốt không nằm ở định dạng mà ở <b>bản chất nội dung</b>. Device Tree ' +
      'chỉ chứa dữ liệu tĩnh — không có lệnh nào để thực thi. ACPI thì chứa cả ' +
      '<b>mã máy ảo</b>: bảng DSDT là một chương trình viết bằng ngôn ngữ AML mà kernel phải ' +
      '<i>chạy</i> bằng một trình thông dịch nằm ngay trong nhân. Nhà sản xuất bo mạch chủ ' +
      'không chỉ khai báo "có cái quạt ở đây", họ còn giao cho hệ điều hành cả đoạn mã điều ' +
      'khiển cái quạt đó.' },

    { t: 'table',
      head: ['', 'Device Tree', 'ACPI'],
      rows: [
        ['Ngự trị ở', 'ARM, ARM64 nhúng, RISC-V, PowerPC', 'x86 để bàn/laptop/máy chủ, và ARM64 máy chủ'],
        ['Nội dung', 'Dữ liệu thuần — cây node và thuộc tính', 'Bảng dữ liệu <b>và</b> mã AML mà OS phải thông dịch'],
        ['Ai giữ nó', 'File <code>.dtb</code>, thường do bootloader nạp — bạn thay được',
         'Nằm trong firmware của bo mạch chủ — bạn thường không thay được'],
        ['Ai chịu trách nhiệm khi sai', 'Người viết <code>.dts</code>, thường là chính kỹ sư Linux',
         'Nhà sản xuất firmware. Kernel phải viết mã lách lỗi cho từng hãng'],
        ['Quản lý năng lượng', 'Mô tả từng thành phần; driver tự lo',
         'Firmware cung cấp sẵn phương thức; đây là lý do ACPI ra đời'],
        ['Số lượng nền tảng', 'Hàng nghìn SoC khác nhau, mỗi hãng một kiểu',
         'Vài kiến trúc nền rất giống nhau, tuân theo chuẩn PC chung']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao hai thế giới lại chọn khác nhau',
      x: 'Không phải vì bên nào giỏi hơn, mà vì <b>hình dạng thị trường khác nhau</b>. Máy ' +
         'PC x86 có một chuẩn nền chung do một nhóm nhỏ nhà sản xuất giữ, nên đặt mô tả ' +
         '(kèm cả mã) vào firmware là hợp lý: một Windows duy nhất phải chạy trên mọi máy ' +
         'mà Microsoft chưa từng thấy. Thế giới ARM nhúng thì ngược lại: hàng nghìn SoC, ' +
         'phần lớn bo mạch <b>không có firmware nào đáng gọi là firmware</b> ngoài chính ' +
         'U-Boot mà bạn đã tự dịch ở Bài 34 — và người viết mô tả phần cứng thường chính là ' +
         'người viết driver. Với họ, một tệp dữ liệu nằm cạnh kernel, sửa được, đọc được ' +
         'bằng mắt thường, hơn hẳn một chương trình AML nhúng trong ROM.' },

    { t: 'cal', kind: 'warn', title: 'Đừng học thuộc "ARM thì DT, x86 thì ACPI"',
      x: 'Đó là quy tắc ngón tay cái, không phải luật. <b>Máy chủ ARM64 dùng ACPI</b> — ' +
         'chuẩn SBBR của Arm yêu cầu như vậy, chính vì máy chủ cần đúng cái tính chất mà PC ' +
         'cần: một bản Linux cài được lên máy chưa từng thấy. Kernel Linux hỗ trợ ' +
         '<b>cả hai</b> trên ARM64 cùng lúc và chọn theo thứ firmware nó nhận được lúc boot. ' +
         'Cách nhớ đúng: <b>quyết định nằm ở nền tảng, không nằm ở kiến trúc CPU</b>. Bo ' +
         'mạch nhúng → Device Tree. Máy để chạy hệ điều hành cài sẵn từ đĩa → ACPI.' },

    { t: 'p', x:
      'Điều dễ chịu là bạn không phải tin lời ai: cả hai cơ chế đều để lại dấu vết nhìn thấy ' +
      'được trong <code>/sys/firmware</code>, và bạn có sẵn <b>hai</b> máy khác kiến trúc để ' +
      'so — WSL x86-64 và máy ảo ARM64 của QEMU. Bước 4 phần Thực hành làm đúng việc đó.' },

    /* ============================================================
       5. THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: đọc dấu vết cuộc chuyển đổi, rồi nhìn Device Tree làm việc' },

    { t: 'p', x:
      'Phần này chia hai nửa. Nửa đầu (bước 1–3) chỉ đọc file trong cây nguồn ' +
      '<code>~/bai38/linux-6.18.45</code> mà Bài 38 đã tải và Bài 40 đã build — không biên ' +
      'dịch gì, chạy trong vài giây. Nửa sau (bước 4–6) boot lại chính ' +
      '<code>Image</code> của Bài 40 bốn lần, mỗi lần khoảng 30 giây. Bạn không cần build ' +
      'lại bất cứ thứ gì.' },

    { t: 'cal', kind: 'danger', title: 'Tuyệt đối không chạy make mrproper trong cây này',
      x: 'Cây <code>~/bai38/linux-6.18.45</code> đang giữ <code>Image</code>, ' +
         '<code>vmlinux</code> và toàn bộ kết quả build của Bài 40 — <b>4,6 GB</b> và gần 40 ' +
         'phút biên dịch. Chặng 08, 09 và 10 đều dùng lại nó. Bài này chỉ <i>đọc</i>; không ' +
         'có bước nào cần dọn cây, và <code>make mrproper</code> sẽ xoá mất kết quả đó.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Đếm những gì còn sót lại của thế giới cũ',
        blocks: [

          { t: 'p', x:
            'Bắt đầu bằng câu hỏi đơn giản nhất: trong cây nguồn ARM 32-bit hôm nay còn bao ' +
            'nhiêu thư mục dòng chip, và còn bao nhiêu board file? Vào cây nguồn rồi đếm:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'ls -d arch/arm/mach-* | wc -l\n' +
            'find arch/arm -name \'board-*.c\' | wc -l\n' +
            'find arch/arm -name \'board-*.c\' -exec cat {} + | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '55\n' +
            '20\n' +
            '4220' },

          { t: 'cmdx', cmd: 'find arch/arm -name \'board-*.c\' -exec cat {} + | wc -l',
            title: 'Vì sao lại là <code>-exec … +</code> chứ không phải <code>| xargs cat</code>',
            rows: [
              ['<code>-name &#39;board-*.c&#39;</code>',
               'Lọc theo tên file. Dấu nháy đơn là bắt buộc — nếu không, shell sẽ tự khai triển <code>*</code> theo thư mục hiện tại trước khi <code>find</code> kịp nhìn thấy.'],
              ['<code>-exec cat {} +</code>',
               '<code>{}</code> là chỗ điền tên file; dấu <code>+</code> ở cuối nghĩa là gom <b>nhiều</b> file vào một lần gọi <code>cat</code> thay vì gọi lại cho từng file.',
               'Nếu dùng <code>\\;</code> thay cho <code>+</code>, <code>cat</code> bị gọi 20 lần — kết quả <code>wc -l</code> vẫn đúng nhưng chậm hơn nhiều lần trên cây lớn.'],
              ['<code>| wc -l</code>',
               'Đếm dòng của dòng chảy gộp. Vì <code>cat</code> không in tên file, đây là tổng số dòng thật của cả 20 file.']
            ] },

          { t: 'cal', kind: 'info', title: 'Ba con số này nói gì',
            x: '<b>55</b> thư mục <code>mach-*</code> nghĩa là ARM 32-bit vẫn hỗ trợ 55 dòng ' +
               'chip khác nhau — cuộc dọn dẹp không hề làm mất hỗ trợ phần cứng. Nhưng chỉ ' +
               'còn <b>20</b> board file với <b>4 220</b> dòng, trung bình <b>211</b> dòng ' +
               'mỗi file. Đối chiếu với <b>108 675</b> dòng của toàn bộ ' +
               '<code>arch/arm/mach-*</code>: board file giờ chiếm chưa tới <b>4%</b> mã ' +
               'nền tảng ARM. Phần còn lại là mã dùng chung cho cả dòng chip — thứ ' +
               '<i>không</i> thể chuyển thành dữ liệu được.' },

          { t: 'p', x:
            'Chúng còn sót ở đâu? Đếm theo thư mục để thấy chúng dồn cục chứ không rải đều:' },

          { t: 'code', where: 'wsl', code:
            'find arch/arm -name \'board-*.c\' -printf \'%h\\n\' | sort | uniq -c | sort -rn' },

          { t: 'code', where: 'out', nocopy: true, code:
            '      6 arch/arm/mach-omap1\n' +
            '      4 arch/arm/mach-orion5x\n' +
            '      2 arch/arm/mach-omap2\n' +
            '      1 arch/arm/mach-tegra\n' +
            '      1 arch/arm/mach-stm32\n' +
            '      1 arch/arm/mach-sti\n' +
            '      1 arch/arm/mach-mvebu\n' +
            '      1 arch/arm/mach-lpc18xx\n' +
            '      1 arch/arm/mach-gemini\n' +
            '      1 arch/arm/mach-clps711x\n' +
            '      1 arch/arm/mach-artpec' },

          { t: 'cmdx', cmd: 'find … -printf \'%h\\n\' | sort | uniq -c | sort -rn',
            title: 'Bộ ba đếm tần suất — mẫu bạn sẽ dùng lại rất nhiều',
            rows: [
              ['<code>-printf &#39;%h\\n&#39;</code>',
               'In <b>thư mục chứa</b> file thay vì đường dẫn đầy đủ. <code>%h</code> = <i>head</i>, phần trước dấu <code>/</code> cuối cùng.'],
              ['<code>sort</code>',
               'Bắt buộc phải có trước <code>uniq</code>: <code>uniq</code> chỉ gộp được các dòng giống nhau <b>nằm liền kề</b>, nó không tự tìm khắp file.'],
              ['<code>uniq -c</code>', 'Gộp dòng trùng và in số lần lặp ở đầu mỗi dòng.'],
              ['<code>sort -rn</code>',
               'Sắp lại theo con số đó, <code>-n</code> = so sánh kiểu số (nếu không, <code>10</code> đứng trước <code>9</code>), <code>-r</code> = giảm dần.']
            ] },

          { t: 'cal', kind: 'why', title: 'Vì sao chúng dồn vào omap1 và orion5x',
            x: 'Sáu trong hai mươi file nằm ở <code>mach-omap1</code> — dòng chip OMAP đời ' +
               'đầu của Texas Instruments, phần cứng của những năm 2003–2006 như máy điện ' +
               'thoại truyền hình Amstrad E3 hay Nokia 770. <b>Chúng còn sót vì không còn ai ' +
               'có phần cứng để kiểm thử bản chuyển đổi.</b> Chuyển một board file sang ' +
               'Device Tree không khó về kỹ thuật; cái khó là chứng minh bản mới vẫn chạy ' +
               'trên bo mạch thật, mà bo mạch thật thì đã thành đồ cổ. Đây là bài học rất ' +
               'thực tế về phần mềm nhúng: <b>mã sống lâu hơn phần cứng, và mã không kiểm ' +
               'thử được thì không xoá được.</b>' },

          { t: 'p', x:
            'Bây giờ đối chiếu với ARM64 — kiến trúc bạn đã dùng suốt từ Chặng 04:' },

          { t: 'code', where: 'wsl', code:
            'find arch/arm64 -name \'board-*.c\' | wc -l\n' +
            'ls -d arch/arm64/mach-* 2>/dev/null | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0\n' +
            '0' },

          { t: 'cal', kind: 'info', title: 'Hai số 0 này là kết luận của cả phần lý thuyết',
            x: 'Kiến trúc <code>arm64</code> được đưa vào Linux năm 2012, <b>sau</b> cuộc ' +
               'chuyển đổi. Nó chưa từng có board file, chưa từng có thư mục ' +
               '<code>mach-*</code>, và không có gì để dọn. Mọi bo mạch ARM64 trên đời — ' +
               'từ máy ảo <code>virt</code> bạn đang chạy tới điện thoại trong túi bạn — ' +
               'đều được mô tả bằng Device Tree hoặc ACPI, không có lựa chọn thứ ba. Đó ' +
               'cũng là lý do suốt Chặng 05 đến Chặng 07 bạn chưa một lần phải nghe tới khái ' +
               'niệm board file: bạn học kiến trúc sinh ra sau cuộc chiến.' }
        ] },

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Mở một board file thật ra đọc',
        blocks: [

          { t: 'p', x:
            'Số liệu thì trừu tượng; hãy nhìn tận mắt một file. Chọn cái lớn nhất còn lại — ' +
            'bo mạch điện thoại truyền hình Amstrad E3, mã nội bộ "Delta". Đọc phần đầu file ' +
            'để biết nó là gì và ai viết:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'1,9p\' arch/arm/mach-omap1/board-ams-delta.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '// SPDX-License-Identifier: GPL-2.0-only\n' +
            '/*\n' +
            ' * linux/arch/arm/mach-omap1/board-ams-delta.c\n' +
            ' *\n' +
            ' * Modified from board-generic.c\n' +
            ' *\n' +
            ' * Board specific inits for the Amstrad E3 (codename Delta) videophone\n' +
            ' *\n' +
            ' * Copyright (C) 2006 Jonathan McDowell <noodles@earth.li>' },

          { t: 'cal', kind: 'info', title: 'Một dòng chú thích tóm tắt cả thời đại',
            x: '<i>"Board specific inits"</i> — mã khởi tạo <b>riêng cho bo mạch này</b>, ' +
               'nằm trong cây nguồn kernel, mang bản quyền của một cá nhân từ năm ' +
               '<b>2006</b>. Đó chính xác là mô hình mà Device Tree ra đời để thay thế: mỗi ' +
               'bo mạch một tác giả, một file, một mảnh mã phải sống chung trong cùng một ' +
               'kho nguồn với tất cả những bo mạch khác trên thế giới.' },

          { t: 'p', x:
            'Bây giờ đo xem một file như vậy to đến đâu, và nó khai báo bao nhiêu thiết bị:' },

          { t: 'code', where: 'wsl', code:
            'wc -l arch/arm/mach-omap1/board-ams-delta.c\n' +
            'grep -c platform_device arch/arm/mach-omap1/board-ams-delta.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '851 arch/arm/mach-omap1/board-ams-delta.c\n' +
            '18' },

          { t: 'cal', kind: 'info', title: '851 dòng cho một bo mạch',
            x: '<code>platform_device</code> là cấu trúc mà kernel dùng để đại diện cho một ' +
               'thiết bị gắn thẳng vào SoC — đúng loại thiết bị "câm" trong bảng so sánh ở ' +
               'đầu bài. Xuất hiện <b>18</b> lần trong một file, nghĩa là chỉ riêng bo mạch ' +
               'này đã tự tay dựng lên chừng ấy thiết bị bằng mã C. Nhân con số này với vài ' +
               'trăm bo mạch và bạn có được bức tranh năm 2010. Chuỗi ' +
               '<code>platform_device</code> chưa cần hiểu sâu lúc này — <b>Bài 54</b> sẽ mổ ' +
               'xẻ nó cùng <code>platform_driver</code> và hàm <code>probe()</code>.' },

          { t: 'p', x:
            'Cuối cùng, phần đáng nhìn nhất: một khối mô tả phần cứng thật. Đây là cách bo ' +
            'mạch khai báo vùng thanh ghi của một mạch chốt GPIO:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'168,182p\' arch/arm/mach-omap1/board-ams-delta.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            'static struct resource latch1_resources[] = {\n' +
            '\t[0] = {\n' +
            '\t\t.name\t= "dat",\n' +
            '\t\t.start\t= LATCH1_PHYS,\n' +
            '\t\t.end\t= LATCH1_PHYS + (LATCH1_NGPIO - 1) / 8,\n' +
            '\t\t.flags\t= IORESOURCE_MEM,\n' +
            '\t},\n' +
            '};\n' +
            '\n' +
            '#define LATCH1_LABEL\t"latch1"\n' +
            '\n' +
            'static const struct property_entry latch1_gpio_props[] = {\n' +
            '\tPROPERTY_ENTRY_STRING("label", LATCH1_LABEL),\n' +
            '\tPROPERTY_ENTRY_U32("ngpios", LATCH1_NGPIO),\n' +
            '\t{ }' },

          { t: 'cal', kind: 'why', title: 'Đọc kỹ khối này — đây là toàn bộ luận điểm của bài',
            x: 'Hãy để ý <b>không có một câu lệnh nào</b> trong đoạn C này. Không vòng lặp, ' +
               'không điều kiện, không lời gọi hàm. Nó chỉ là một bảng giá trị: địa chỉ bắt ' +
               'đầu (<code>.start</code>), địa chỉ kết thúc (<code>.end</code>), loại tài ' +
               'nguyên (<code>IORESOURCE_MEM</code> — vùng nhớ ánh xạ thanh ghi), rồi một ' +
               'cái nhãn và một con số. <b>Đây đã là dữ liệu rồi</b> — chỉ có điều nó bị ' +
               'viết bằng C, nên phải biên dịch bằng <code>gcc</code> và bị nhốt vĩnh viễn ' +
               'bên trong <code>vmlinux</code>.<br><br>' +
               'Device Tree không phát minh ra ý tưởng "mô tả phần cứng bằng bảng giá trị". ' +
               'Ý tưởng đó đã có sẵn ngay đây. Device Tree chỉ làm một việc: <b>lấy đúng ' +
               'bảng giá trị này ra khỏi mã nguồn C</b>. Ở bước sau bạn sẽ thấy chính ba ' +
               'thông tin đó — địa chỉ, kích thước, nhãn — được viết lại bằng DTS.' }
        ] },

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Cùng một mạch UART: viết bằng C và viết bằng DTS',
        blocks: [

          { t: 'p', x:
            'Ở bước 2 bạn thấy mô tả phần cứng viết bằng C. Bây giờ nhìn cùng loại thông tin ' +
            'đó viết bằng Device Tree, và nhìn phần còn lại của board file sau khi mô tả bị ' +
            'rút đi. Bắt đầu bằng file đã thay thế cho toàn bộ họ OMAP2/3/4 — tên nó nói hết:' },

          { t: 'code', where: 'wsl', code:
            'wc -l arch/arm/mach-omap2/board-generic.c\n' +
            'grep -c DT_MACHINE_START arch/arm/mach-omap2/board-generic.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '378 arch/arm/mach-omap2/board-generic.c\n' +
            '15' },

          { t: 'cal', kind: 'info', title: 'Một file, mười lăm dòng chip',
            x: 'Chỉ <b>378</b> dòng, nhưng chứa <b>15</b> khối ' +
               '<code>DT_MACHINE_START</code> — mỗi khối phục vụ cả một họ SoC ' +
               '(OMAP3, OMAP4, AM33xx, DRA7…). Đối chiếu với <b>851</b> dòng của một bo mạch ' +
               'duy nhất ở bước 2. Tên file cũng đã đổi từ <code>board-&lt;tên bo&gt;.c</code> ' +
               'thành <code>board-generic.c</code>: không còn "bo mạch" nào trong tên nữa.' },

          { t: 'p', x:
            'Mở khối dành cho OMAP3 ra xem cái gì còn lại trong mã C sau cuộc dọn dẹp:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'129,145p\' arch/arm/mach-omap2/board-generic.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '/* Generic omap3 boards, most boards can use these */\n' +
            'static const char *const omap3_boards_compat[] __initconst = {\n' +
            '\t"ti,omap3430",\n' +
            '\t"ti,omap3",\n' +
            '\tNULL,\n' +
            '};\n' +
            '\n' +
            'DT_MACHINE_START(OMAP3_DT, "Generic OMAP3 (Flattened Device Tree)")\n' +
            '\t.reserve\t= omap_reserve,\n' +
            '\t.map_io\t\t= omap3_map_io,\n' +
            '\t.init_early\t= omap3430_init_early,\n' +
            '\t.init_machine\t= omap_generic_init,\n' +
            '\t.init_late\t= omap3_init_late,\n' +
            '\t.init_time\t= omap_init_time_of,\n' +
            '\t.dt_compat\t= omap3_boards_compat,\n' +
            '\t.restart\t= omap3xxx_restart,\n' +
            'MACHINE_END' },

          { t: 'cal', kind: 'why', title: 'Đây là hình dạng cuối cùng của một "board file"',
            x: 'Không còn một địa chỉ thanh ghi nào, không còn một ' +
               '<code>platform_device</code> nào. Chỉ còn <b>hai thứ</b>:<br><br>' +
               '<b>1. Một danh sách chuỗi nhận dạng</b> — <code>omap3_boards_compat</code> ' +
               'chứa <code>"ti,omap3430"</code> và <code>"ti,omap3"</code>. Lúc boot, kernel ' +
               'đọc thuộc tính <code>compatible</code> ở gốc Device Tree và so với danh sách ' +
               'này; trùng thì khối này được chọn. Đó chính là <code>.dt_compat</code> ở dòng ' +
               'áp chót. <b>Device Tree quyết định, mã C chỉ chờ được gọi tên.</b><br><br>' +
               '<b>2. Một nhúm con trỏ hàm</b> — <code>.map_io</code>, ' +
               '<code>.init_early</code>, <code>.restart</code>… Đây là những việc ' +
               '<i>thật sự</i> cần mã: ánh xạ vùng thanh ghi sớm, bật xung nhịp theo trình tự ' +
               'riêng của hãng, khởi động lại chip. Không mô tả nào biểu diễn được một trình ' +
               'tự thao tác — nên chúng ở lại C, đúng chỗ của chúng.<br><br>' +
               'Đó là ranh giới mà cuộc chuyển đổi 2011 vạch ra và bạn nên nhớ suốt cả chặng: ' +
               '<b>"có cái gì, ở đâu" là dữ liệu; "làm thế nào" là mã.</b>' },

          { t: 'p', x:
            'Vậy phần "có cái gì, ở đâu" đi đâu? Sang một file <code>.dts</code>. Mở một cổng ' +
            'nối tiếp PL011 thật — đúng loại UART mà máy ảo <code>virt</code> của bạn đang ' +
            'dùng để in ra màn hình — trên bo mạch ARM RealView PB1176:' },

          { t: 'code', where: 'wsl', code:
            'sed -n \'384,391p\' arch/arm/boot/dts/arm/arm-realview-pb1176.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '\t\tpb1176_serial0: serial@1010c000 {\n' +
            '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
            '\t\t\treg = <0x1010c000 0x1000>;\n' +
            '\t\t\tinterrupt-parent = <&intc_dc1176>;\n' +
            '\t\t\tinterrupts = <0 18 IRQ_TYPE_LEVEL_HIGH>;\n' +
            '\t\t\tclocks = <&uartclk>, <&pclk>;\n' +
            '\t\t\tclock-names = "uartclk", "apb_pclk";\n' +
            '\t\t};' },

          { t: 'p', x:
            'Tám dòng. Bài 43 sẽ dạy kỹ cú pháp, nhưng bạn đọc hiểu ngay được phần lớn, và ' +
            'nên đối chiếu ngay với <code>latch1_resources[]</code> ở bước 2:' },

          { t: 'table',
            head: ['Dòng DTS', 'Nói gì', 'Trong board file C tương ứng là'],
            rows: [
              ['<code>serial@1010c000</code>',
               'Tên node, kèm địa chỉ để phân biệt với các UART khác cùng bo',
               'Tên biến C do người viết tự đặt'],
              ['<code>compatible = "arm,pl011"</code>',
               '<b>Dòng quan trọng nhất.</b> "Tôi là một PL011" — kernel dùng chuỗi này để tìm driver',
               'Lời gọi <code>platform_device_register()</code> với tên driver viết cứng'],
              ['<code>reg = &lt;0x1010c000 0x1000&gt;</code>',
               'Vùng thanh ghi: bắt đầu ở <code>0x1010c000</code>, dài <code>0x1000</code> byte',
               '<code>.start</code> và <code>.end</code> của <code>struct resource</code>'],
              ['<code>interrupts = &lt;0 18 …&gt;</code>', 'Dùng đường ngắt số 18',
               'Một <code>struct resource</code> nữa với <code>IORESOURCE_IRQ</code>'],
              ['<code>clocks = &lt;&amp;uartclk&gt;, …</code>',
               'Lấy xung nhịp từ hai nguồn khác đã khai báo nơi khác trong cây',
               'Mã C gọi tay hàm bật xung nhịp theo đúng thứ tự']
            ] },

          { t: 'cal', kind: 'info', title: 'Hai điều mà bảng trên chưa nói hết',
            x: 'Thứ nhất, <code>&amp;uartclk</code> là một <b>tham chiếu tới node khác</b> ' +
               'trong cùng cây. Board file C không có khái niệm này — muốn nối hai thiết bị ' +
               'với nhau, người viết phải gọi hàm theo đúng thứ tự và tự bảo đảm cái được ' +
               'tham chiếu đã sẵn sàng. Device Tree biến quan hệ đó thành <i>dữ liệu</i>, và ' +
               'kernel tự sắp thứ tự khởi tạo.<br><br>' +
               'Thứ hai, <code>compatible</code> có <b>hai</b> giá trị chứ không phải một: ' +
               '<code>"arm,pl011"</code> rồi <code>"arm,primecell"</code>. Đó là danh sách ' +
               'ưu tiên giảm dần — "hãy tìm driver PL011; không có thì driver PrimeCell chung ' +
               'cũng tạm chạy được". Cơ chế này là lý do một <code>.dtb</code> viết năm nay ' +
               'vẫn boot được bằng kernel năm sau.' },

          { t: 'p', x:
            'Cuối cùng, xem chuỗi <code>"arm,pl011"</code> đó có sức nặng đến đâu — bao nhiêu ' +
            'file mô tả bo mạch trong cây đang dùng lại chính nó, và ai ở phía kernel nhận nó:' },

          { t: 'code', where: 'wsl', code:
            'grep -rl \'arm,pl011\' arch/arm/boot/dts arch/arm64/boot/dts | wc -l\n' +
            'grep -n \'OF_EARLYCON_DECLARE\' drivers/tty/serial/amba-pl011.c' },

          { t: 'code', where: 'out', nocopy: true, code:
            '175\n' +
            '2733:OF_EARLYCON_DECLARE(pl011, "arm,pl011", pl011_early_console_setup);\n' +
            '2735:OF_EARLYCON_DECLARE(pl011, "arm,sbsa-uart", pl011_early_console_setup);' },

          { t: 'cmdx', cmd: 'grep -rl \'arm,pl011\' arch/arm/boot/dts arch/arm64/boot/dts | wc -l',
            title: 'Vì sao <code>-l</code> chứ không phải <code>-c</code>',
            rows: [
              ['<code>-r</code>', 'Đi đệ quy xuống mọi thư mục con — cây dts có hàng chục tầng theo hãng.'],
              ['<code>-l</code>',
               'In <b>tên file</b> có ít nhất một dòng khớp, mỗi file một dòng, rồi bỏ qua phần còn lại của file.',
               'Nếu dùng <code>-c</code> thì đếm số <i>dòng</i> khớp; một file khai báo bốn UART sẽ bị tính bốn lần. Ở đây câu hỏi là "bao nhiêu bo mạch", nên phải đếm file.'],
              ['hai đường dẫn cuối',
               'Giới hạn trong dts của ARM và ARM64. Nếu quét cả <code>arch/</code> bạn sẽ nhặt thêm RISC-V và một vài kiến trúc khác, con số sẽ khác.']
            ] },

          { t: 'cal', kind: 'why', title: '175 bo mạch, một chuỗi, một driver',
            x: '<b>175</b> file mô tả phần cứng nhắc tới <code>arm,pl011</code>. Không file ' +
               'nào trong số đó chứa mã. Ở đầu bên kia, ' +
               '<code>drivers/tty/serial/amba-pl011.c</code> khai báo <b>một lần</b> rằng nó ' +
               'nhận chuỗi đó. Ghép hai đầu lại là toàn bộ mô hình Device Tree: ' +
               '<b>dữ liệu nhân bản theo số bo mạch, mã thì không nhân bản</b>. Trong mô hình ' +
               'board file, mỗi bo mạch trong 175 bo đó cần một đoạn C riêng để dựng cùng một ' +
               'con UART.<br><br>' +
               'Dòng <code>OF_EARLYCON_DECLARE</code> còn đáng chú ý hơn: <code>OF</code> là ' +
               '<i>Open Firmware</i>, tổ tiên của Device Tree, và ' +
               '<code>early console</code> là console dùng ở thời điểm sớm nhất của quá trình ' +
               'boot. Nghĩa là ngay cả trước khi hệ thống driver kịp khởi động, kernel đã tra ' +
               'Device Tree để biết cổng nối tiếp nằm ở đâu. Bước 6 sẽ bắt quả tang nó làm ' +
               'việc đó.' },

          { t: 'p', x:
            'Để khép lại nửa lý thuyết, đo quy mô hai bên cán cân hôm nay:' },

          { t: 'code', where: 'wsl', code:
            'find arch/arm/boot/dts arch/arm64/boot/dts \\( -name \'*.dts\' -o -name \'*.dtsi\' \\) | wc -l\n' +
            'find Documentation/devicetree/bindings -name \'*.yaml\' | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '5322\n' +
            '5182' },

          { t: 'cmdx', cmd: 'find … \\( -name \'*.dts\' -o -name \'*.dtsi\' \\) | wc -l',
            title: 'Vì sao phải có cặp ngoặc, và vì sao phải thoát nó',
            rows: [
              ['<code>-o</code>', 'Toán tử HOẶC của <code>find</code>. Không có nó, hai điều kiện <code>-name</code> sẽ là VÀ và không file nào khớp được cả hai.'],
              ['<code>\\( … \\)</code>',
               'Gom hai điều kiện thành một nhóm. Cần thiết khi bạn thêm một điều kiện thứ ba như <code>-type f</code> — nếu không nhóm lại, nó chỉ áp cho vế cuối.',
               'Dấu <code>\\</code> là để <b>shell</b> đừng nuốt mất dấu ngoặc: trong shell, <code>(</code> mở một subshell. Viết <code>\'(\'</code> cũng được, hiệu quả như nhau.'],
              ['<code>*.dtsi</code>',
               'Phần dùng chung được chèn vào nhiều <code>.dts</code> — <i>include</i>. Một SoC thường có một <code>.dtsi</code> mô tả toàn bộ chip, còn mỗi bo mạch chỉ thêm phần khác biệt.']
            ] },

          { t: 'cal', kind: 'info', title: 'Cán cân hôm nay',
            x: '<b>5 322</b> file mô tả phần cứng và <b>5 182</b> tài liệu binding, đứng cạnh ' +
               '<b>22</b> file mã của <code>drivers/of</code>. Cuộc chuyển đổi không làm mã ' +
               'ít đi — nó <b>đổi loại</b>: từ mã C phải biên dịch và kiểm thử, sang dữ liệu ' +
               'mà con người đọc được và công cụ kiểm tra được. Con số <b>5 182</b> chính là ' +
               'nội dung của Bài 44: mỗi binding là một hợp đồng quy định node kiểu này phải ' +
               'có những thuộc tính nào.' }
        ] },

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Hỏi thẳng kernel: mày biết phần cứng này từ đâu?',
        blocks: [

          { t: 'p', x:
            'Từ đây trở đi bạn không đọc file nữa mà chạy thật. Dựng một initramfs thăm dò ' +
            'riêng cho bài này — chép từ Bài 32 rồi ghi đè <code>init</code>, để initramfs của ' +
            'Bài 32 và Bài 41 còn nguyên:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai42 && cd ~/bai42\n' +
            'cp -a ~/bai32/initramfs ~/bai42/initramfs\n' +
            'ls -1 ~/bai42/initramfs' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bin\n' +
            'dev\n' +
            'init\n' +
            'proc\n' +
            'sys' },

          { t: 'p', x:
            'Đúng bộ khung tối thiểu Bài 32 đã dựng: một BusyBox trong <code>bin</code>, ba ' +
            'thư mục trống làm điểm gắn, và <code>init</code>. Ghi đè <code>init</code> bằng ' +
            'bản thăm dò dưới đây — nó không làm gì ngoài việc in ra tám thứ rồi tắt máy:' },

          { t: 'code', where: 'file', name: '~/bai42/initramfs/init', lang: 'bash', code:
            '#!/bin/sh\n' +
            '/bin/busybox --install -s /bin\n' +
            'mount -t proc     none /proc\n' +
            'mount -t sysfs    none /sys\n' +
            'mount -t devtmpfs none /dev\n' +
            'echo\n' +
            'echo "=== firmware interfaces ==="\n' +
            'ls /sys/firmware\n' +
            'echo "=== model ==="\n' +
            'cat /proc/device-tree/model; echo\n' +
            'echo "=== cpu count ==="\n' +
            'grep -c ^processor /proc/cpuinfo\n' +
            'echo "=== memory ==="\n' +
            'grep MemTotal /proc/meminfo\n' +
            'echo "=== dtb size ==="\n' +
            'wc -c /sys/firmware/fdt\n' +
            'echo "=== stdout-path ==="\n' +
            'cat /proc/device-tree/chosen/stdout-path; echo\n' +
            'echo "=== consoles ==="\n' +
            'cat /proc/consoles\n' +
            'echo "=== cmdline ==="\n' +
            'cat /proc/cmdline\n' +
            'poweroff -f' },

          { t: 'cmdx', cmd: 'init', title: 'Vì sao đúng tám câu hỏi này',
            rows: [
              ['<code>ls /sys/firmware</code>',
               'Kernel bày ra ở đây <b>cơ chế mô tả phần cứng</b> nó đã dùng. Bước 6 sẽ chạy đúng lệnh này trên WSL x86-64 để so.'],
              ['<code>cat /proc/device-tree/model</code>',
               'Đọc thuộc tính <code>model</code> ở gốc Device Tree — tên bo mạch, do người viết <code>.dts</code> đặt.',
               'Dấu <code>; echo</code> theo sau là bắt buộc: chuỗi trong DT kết thúc bằng byte NUL chứ không phải xuống dòng, nên không có <code>echo</code> thì dòng sau dính liền.'],
              ['<code>grep -c ^processor /proc/cpuinfo</code>',
               'Đếm số CPU kernel <b>thực sự</b> đưa vào hoạt động. Số này đến từ các node <code>cpu@N</code> trong Device Tree.',
               '<code>-c</code> đếm dòng khớp; <code>^processor</code> neo vào đầu dòng để không đếm nhầm chữ "processor" nằm giữa dòng khác.'],
              ['<code>grep MemTotal /proc/meminfo</code>',
               'Dung lượng RAM kernel nhìn thấy — đến từ node <code>memory@…</code> trong Device Tree.'],
              ['<code>wc -c /sys/firmware/fdt</code>',
               '<code>/sys/firmware/fdt</code> là <b>bản sao nguyên khối .dtb</b> mà kernel nhận lúc boot. <code>-c</code> đếm byte, nên đây là kích thước thật của khối dữ liệu đó.'],
              ['<code>cat …/chosen/stdout-path</code>',
               'Node <code>chosen</code> là nơi bootloader nhắn tin cho kernel; <code>stdout-path</code> chỉ ra cổng dùng làm console. Bước 6 dựa hoàn toàn vào nó.'],
              ['<code>cat /proc/consoles</code>',
               'Danh sách console kernel đang thực sự dùng — để đối chiếu với <code>stdout-path</code> ở trên.'],
              ['<code>poweroff -f</code>',
               'Tắt máy ảo ngay, thay cho <code>exec /bin/sh</code> của Bài 41.',
               'Bài này boot bốn lần và bạn không cần gõ gì bên trong, nên để nó tự tắt sẽ nhanh hơn và tránh phải nhớ tổ hợp thoát QEMU.']
            ] },

          { t: 'p', x: 'Đóng gói lại thành kho cpio nén, đúng câu lệnh Bài 32 và Bài 41:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai42\n' +
            '( cd initramfs && find . -print0 | cpio --null --create --format=newc | gzip -9 ) > initramfs.cpio.gz\n' +
            'ls -l initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3872 blocks\n' +
            '-rw-r--r-- 1 shinarus shinarus 1030749 Aug 29 16:59 initramfs.cpio.gz',
            notes: [
              'Tên người dùng, ngày giờ và <b>kích thước</b> sẽ khác trên máy bạn — kích thước phụ thuộc phiên bản BusyBox. Điều cần đúng là nó xấp xỉ <b>1 MB</b>.',
              '<code>3872 blocks</code> do <code>cpio</code> in ra stderr, không phải lỗi.'
            ] },

          { t: 'p', x:
            'Boot mốc chuẩn. Chú ý: <code>Image</code> dùng ở đây là <b>chính bản Bài 40 đã ' +
            'build</b>, không sửa một byte nào — cả bốn lần boot của bài này đều dùng đúng file ' +
            'đó, và đó là điều làm cho thí nghiệm có ý nghĩa:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -smp 2 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai42/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0"' },

          { t: 'p', x:
            'Log boot chạy qua rồi máy tự tắt. Phần bạn cần nằm ở cuối, ngay sau dòng ' +
            '<code>Run /init as init process</code>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Lần boot 1 — mốc chuẩn', code:
            '=== firmware interfaces ===\n' +
            'devicetree  fdt\n' +
            '=== model ===\n' +
            'linux,dummy-virt\n' +
            '=== cpu count ===\n' +
            '2\n' +
            '=== memory ===\n' +
            'MemTotal:         474836 kB\n' +
            '=== dtb size ===\n' +
            '1048576 /sys/firmware/fdt\n' +
            '=== stdout-path ===\n' +
            '/pl011@9000000\n' +
            '=== consoles ===\n' +
            'ttyAMA0              -W- (EC Np a)  204:64\n' +
            '=== cmdline ===\n' +
            'console=ttyAMA0',
            notes: [
              '<code>MemTotal</code> sẽ lệch vài KB giữa các lần boot ngay cả khi bạn không đổi gì — KASLR đặt kernel ở địa chỉ ngẫu nhiên mỗi lần nên phần bộ nhớ bị chiếm hơi khác. Ba chữ số đầu mới là con số đáng đọc.',
              'Số <code>204:64</code> ở dòng console là cặp major:minor của thiết bị, cố định cho ttyAMA0 — không phải giá trị ngẫu nhiên.'
            ] },

          { t: 'cal', kind: 'info', title: 'Đọc từng dòng — mỗi dòng là một mắt xích',
            x: '<code>devicetree  fdt</code>: thư mục <code>/sys/firmware</code> chỉ có đúng ' +
               'hai mục, <b>cả hai đều là Device Tree</b>. Không có <code>acpi</code>. Máy này ' +
               'biết phần cứng của nó qua một con đường duy nhất.<br><br>' +
               '<code>linux,dummy-virt</code>: tên bo mạch. Nó nằm trong ' +
               '<code>Image</code>? Không — nó là một chuỗi trong khối <code>.dtb</code> mà ' +
               'QEMU tự sinh ra rồi nạp vào RAM. Chính chuỗi này cũng xuất hiện ở đầu log ' +
               'boot dưới dạng <code>Machine model: linux,dummy-virt</code>.<br><br>' +
               '<code>2</code> và <code>474836 kB</code>: khớp với <code>-smp 2 -m 512</code> ' +
               'bạn gõ ở dòng lệnh QEMU. Kernel không đọc dòng lệnh QEMU — nó đọc Device ' +
               'Tree mà QEMU sinh ra <i>từ</i> dòng lệnh đó. Bước 5 chứng minh điều này.' +
               '<br><br>' +
               '<code>1048576</code>: đúng <b>1 MiB</b>. Đây không phải kích thước thật của ' +
               'dữ liệu mà là vùng QEMU dành sẵn cho <code>.dtb</code> — một khối tròn trịa để ' +
               'phần mô tả có chỗ phình ra khi bạn thêm thiết bị vào dòng lệnh.<br><br>' +
               '<code>/pl011@9000000</code>: đường dẫn tới node UART trong cây, và ' +
               '<code>ttyAMA0</code> ở dòng dưới là cái tên kernel đặt cho <i>chính</i> cổng ' +
               'đó sau khi driver nhận. Hai dòng này khớp nhau, và bước 6 sẽ cắt ' +
               '<code>console=</code> đi để xem dòng trên có tự nuôi được dòng dưới không.' },

          { t: 'cal', kind: 'why', title: 'Vì sao <code>/proc/device-tree</code> lại tồn tại',
            x: 'Bạn vừa <code>cat</code> một thuộc tính Device Tree như thể nó là file thường. ' +
               'Đó là vì kernel <b>trải cây ra thành thư mục</b>: mỗi node thành một thư mục, ' +
               'mỗi thuộc tính thành một file chứa đúng các byte thô của giá trị. Nhờ vậy bạn ' +
               'soi được toàn bộ mô tả phần cứng bằng <code>ls</code> và <code>cat</code>, ' +
               'không cần công cụ đặc biệt nào.<br><br>' +
               'Bài này cố tình chỉ chạm vào hai thuộc tính. <b>Bài 45</b> sẽ đi hết cây, ' +
               'giải thích vì sao nhiều file trong đó <code>cat</code> ra rác (chúng chứa số ' +
               '32-bit nhị phân chứ không phải chữ), và dạy cách dịch ngược ' +
               '<code>.dtb</code> đang chạy trở lại thành <code>.dts</code> đọc được.' }
        ] },

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Cùng một Image, hai cỗ máy khác nhau',
        blocks: [

          { t: 'p', x:
            'Đây là thí nghiệm quyết định của cả bài. Nếu mô tả phần cứng thật sự nằm ngoài ' +
            'kernel, thì đổi phần cứng mà <b>không</b> đụng vào <code>Image</code> phải cho ra ' +
            'một máy khác. Đổi hai tham số QEMU: gấp đôi RAM, gấp đôi số CPU. Mọi thứ còn lại ' +
            'giữ nguyên từng ký tự:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 1024 -smp 4 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai42/initramfs.cpio.gz \\\n' +
            '  -append "console=ttyAMA0"' },

          { t: 'code', where: 'out', nocopy: true, name: 'Lần boot 2 — cùng Image, phần cứng khác', code:
            '=== firmware interfaces ===\n' +
            'devicetree  fdt\n' +
            '=== model ===\n' +
            'linux,dummy-virt\n' +
            '=== cpu count ===\n' +
            '4\n' +
            '=== memory ===\n' +
            'MemTotal:         988424 kB\n' +
            '=== dtb size ===\n' +
            '1048576 /sys/firmware/fdt\n' +
            '=== stdout-path ===\n' +
            '/pl011@9000000\n' +
            '=== consoles ===\n' +
            'ttyAMA0              -W- (EC Np a)  204:64\n' +
            '=== cmdline ===\n' +
            'console=ttyAMA0' },

          { t: 'table',
            head: ['Dòng', 'Boot 1 (<code>-m 512 -smp 2</code>)', 'Boot 2 (<code>-m 1024 -smp 4</code>)', 'Đến từ đâu'],
            rows: [
              ['cpu count', '<code>2</code>', '<code>4</code>', 'Số node <code>cpu@N</code> trong Device Tree'],
              ['MemTotal', '<code>474836 kB</code>', '<code>988424 kB</code>', 'Node <code>memory@40000000</code>'],
              ['model', '<code>linux,dummy-virt</code>', '<code>linux,dummy-virt</code>', 'Thuộc tính <code>model</code> ở node gốc'],
              ['dtb size', '<code>1048576</code>', '<code>1048576</code>', 'Vùng QEMU dành sẵn, không đổi'],
              ['<code>Image</code>', '41 089 536 byte', '41 089 536 byte', '<b>Cùng một file, không dịch lại</b>']
            ] },

          { t: 'cal', kind: 'why', title: 'Đây chính là điều board file không làm được',
            x: 'Hai cỗ máy khác nhau — một máy hai nhân 512 MB, một máy bốn nhân 1 GB — khởi ' +
               'động từ <b>cùng một file nhị phân, không dịch lại, không sửa một byte</b>. ' +
               'Kernel biết được sự khác biệt vì phần mô tả đến <i>từ bên ngoài</i> nó, lúc ' +
               'chạy.<br><br>' +
               'Trong mô hình board file, số CPU và dung lượng RAM là hằng số biên dịch trong ' +
               'C. Muốn máy thứ hai, bạn phải sửa file C, chạy lại <code>make</code>, chờ, và ' +
               'giữ <b>hai</b> file <code>Image</code> khác nhau. Đó là toàn bộ khoảng cách ' +
               'giữa hai thời đại, và bạn vừa đo nó bằng hai lần gõ phím.<br><br>' +
               'Hãy nhớ lại Bài 40: dịch lại kernel này mất gần <b>40 phút</b>. Nhân con số đó ' +
               'với số bo mạch một công ty phải hỗ trợ và bạn hiểu vì sao ' +
               '<code>ARCH_MULTIPLATFORM</code> đáng để cả cộng đồng dọn dẹp suốt nhiều năm.' },

          { t: 'cal', kind: 'tip', title: 'Cách tự kiểm chứng "không sửa một byte"',
            x: 'Nếu bạn muốn chắc chắn <code>Image</code> không hề bị đụng tới giữa hai lần ' +
               'boot, chạy <code>md5sum ~/bai38/linux-6.18.45/arch/arm64/boot/Image</code> ' +
               'trước và sau. Hai chuỗi băm phải giống hệt nhau. Đây là thói quen tốt nói ' +
               'chung: khi một thí nghiệm dựa vào "cùng một file", hãy để máy khẳng định điều ' +
               'đó thay vì tin trí nhớ của mình.' }
        ] },

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Kernel tự tìm lấy cổng nối tiếp — và x86 làm việc đó bằng cách khác',
        blocks: [

          { t: 'p', x:
            'Bài 41 để lại cho chặng này một câu hỏi treo: nếu bạn <b>không</b> đưa ' +
            '<code>console=</code> vào dòng lệnh nhân thì màn hình có im lặng không? Trả lời ' +
            'bằng cách bỏ hẳn <code>-append</code>:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -smp 2 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai42/initramfs.cpio.gz' },

          { t: 'code', where: 'out', nocopy: true, name: 'Lần boot 3 — không có dòng lệnh nhân', code:
            '=== stdout-path ===\n' +
            '/pl011@9000000\n' +
            '=== consoles ===\n' +
            'ttyAMA0              -W- (EC Np a)  204:64\n' +
            'tty0                 -WU (E   p  )    4:1\n' +
            '=== cmdline ===\n' +
            '\n' +
            '[    1.490527] Flash device refused suspend due to active operation (state 20)\n' +
            '[    1.493314] reboot: Power down' },

          { t: 'cal', kind: 'why', title: 'Dòng <code>=== cmdline ===</code> trống, mà bạn vẫn đọc được nó',
            x: 'Nghịch lý đó chính là câu trả lời. <code>/proc/cmdline</code> <b>rỗng</b> — ' +
               'không ai bảo kernel dùng console nào — vậy mà toàn bộ log vẫn hiện ra trước ' +
               'mắt bạn, kể cả chính dòng báo rằng nó rỗng.<br><br>' +
               'Kernel tìm được đường ra nhờ <code>/chosen/stdout-path</code> trong Device ' +
               'Tree: QEMU đã ghi sẵn <code>/pl011@9000000</code> vào đó. Không có ' +
               '<code>console=</code>, kernel đọc thuộc tính này và dùng nó làm console mặc ' +
               'định. <b>Bootloader nói cho kernel biết phải nói chuyện qua đâu — bằng dữ ' +
               'liệu, không phải bằng tham số.</b><br><br>' +
               'Để ý thêm dòng <code>tty0</code> mới xuất hiện: khi không bị ' +
               '<code>console=</code> chỉ định cứng, kernel bật thêm console mặc định của nó. ' +
               'Ở boot 1 và boot 2 chỉ có mình <code>ttyAMA0</code> vì bạn đã nói rõ.' },

          { t: 'p', x:
            'Còn một tầng sâu hơn nữa. <code>stdout-path</code> chỉ dùng được sau khi hệ thống ' +
            'driver đã chạy. Trước đó thì sao? Bật <code>earlycon</code> — <b>không kèm tham ' +
            'số nào cả</b>, cố tình không nói cho kernel biết cổng nằm ở đâu:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 \\\n' +
            '  -M virt -cpu cortex-a57 -m 512 -smp 2 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai42/initramfs.cpio.gz \\\n' +
            '  -append "earlycon"' },

          { t: 'p', x:
            'Lần này phần thú vị nằm ở <b>đầu</b> log, tại mốc thời gian <code>0.000000</code>:' },

          { t: 'code', where: 'out', nocopy: true, name: 'Lần boot 4 — tám dòng đầu tiên', code:
            '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]\n' +
            '[    0.000000] Linux version 6.18.45-embedded (shinarus@Shinarus) (aarch64-linux-gnu-gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0, GNU ld (GNU Binutils for Ubuntu) 2.46) #4 SMP PREEMPT Thu Aug 27 22:31:32 +07 2026\n' +
            '[    0.000000] KASLR enabled\n' +
            '[    0.000000] random: crng init done\n' +
            '[    0.000000] Machine model: linux,dummy-virt\n' +
            '[    0.000000] efi: UEFI not found.\n' +
            '[    0.000000] earlycon: pl11 at MMIO 0x0000000009000000 (options \'\')\n' +
            '[    0.000000] printk: legacy bootconsole [pl11] enabled',
            notes: [
              'Chuỗi <code>-embedded</code>, tên máy <code>shinarus@Shinarus</code>, số bản dựng <code>#4</code> và ngày giờ sẽ khác trên máy bạn — chúng đến từ <code>CONFIG_LOCALVERSION</code> và số lần bạn đã liên kết lại kernel ở Bài 40. Phiên bản <code>6.18.45</code> thì phải giống.'
            ] },

          { t: 'cal', kind: 'why', title: 'Kernel tự tìm ra địa chỉ <code>0x9000000</code>',
            x: 'Bạn gõ đúng một chữ <code>earlycon</code>, không kèm địa chỉ, không kèm tên ' +
               'driver. Vậy mà ở mốc <code>0.000000</code> — trước cả khi hệ thống thiết bị ' +
               'khởi động — kernel đã in ra <b>đúng địa chỉ vật lý ' +
               '<code>0x0000000009000000</code></b> của con UART.<br><br>' +
               'Nó lấy ở đâu ra? Từ hai mảnh bạn đã nhìn thấy ở bước 3 ghép lại: ' +
               '<code>/chosen/stdout-path</code> trỏ tới node <code>pl011@9000000</code>; node ' +
               'đó có <code>compatible = "arm,pl011"</code>; và ' +
               '<code>drivers/tty/serial/amba-pl011.c</code> đã đăng ký chuỗi đó bằng ' +
               '<code>OF_EARLYCON_DECLARE</code>. Kernel dò khối <code>.dtb</code> thô trong ' +
               'RAM, khớp chuỗi, đọc <code>reg</code>, và có console — <b>trước khi bất kỳ ' +
               'driver nào chạy</b>. Đó là lý do Device Tree phải là <i>dữ liệu</i>: ở thời ' +
               'điểm này kernel còn chưa đủ hạ tầng để chạy bất cứ thứ gì phức tạp hơn một ' +
               'vòng lặp tìm chuỗi.' },

          { t: 'cal', kind: 'warn', title: 'Vì sao là <code>pl11</code> chứ không phải <code>pl011</code>',
            x: 'Không phải lỗi đánh máy, cũng không phải lỗi của bạn. Hàm ' +
               '<code>earlycon_init()</code> trong ' +
               '<code>drivers/tty/serial/earlycon.c</code> tách tên console thành ' +
               '<i>tên + số thứ tự</i> bằng cách quét ngược các chữ số ở cuối chuỗi. Với ' +
               '<code>"pl011"</code> nó cắt ra tên <code>"pl"</code> và chỉ số ' +
               '<code>11</code>, rồi in lại thành <code>pl11</code>. Dòng ' +
               '<code>bootconsole [pl11]</code> ở ngay dưới cũng vậy. Đây là hành vi đã biết ' +
               'của kernel, vô hại — nhưng nếu bạn <code>grep</code> log tìm chữ ' +
               '<code>pl011</code> thì sẽ trượt mất hai dòng quan trọng nhất.' },

          { t: 'p', x:
            'Cuối cùng, chạy đúng lệnh đầu tiên của <code>init</code> — nhưng lần này trên ' +
            'WSL, tức trên một máy <b>x86-64 thật</b>, không phải máy ảo ARM64:' },

          { t: 'code', where: 'wsl', code:
            'uname -m\n' +
            'ls /sys/firmware\n' +
            'ls /sys/firmware/acpi/tables\n' +
            'ls /proc/device-tree' },

          { t: 'code', where: 'out', nocopy: true, code:
            'x86_64\n' +
            'acpi  memmap\n' +
            'APIC  DSDT  FACP  FACS  OEM0  SRAT  data  dynamic\n' +
            'ls: cannot access \'/proc/device-tree\': No such file or directory',
            notes: [
              'Danh sách bảng ACPI sẽ khác trên máy bạn — nó do firmware của máy quyết định, và WSL2 là máy ảo Hyper-V nên bộ bảng của nó gọn hơn một laptop thật nhiều. <code>APIC</code>, <code>DSDT</code> và <code>FACP</code> thì gần như chắc chắn có mặt.'
            ] },

          { t: 'cal', kind: 'info', title: 'Hai máy, hai câu trả lời đối xứng nhau',
            x: 'Máy ảo ARM64: <code>/sys/firmware</code> chứa ' +
               '<code>devicetree  fdt</code>, không có <code>acpi</code>.<br>' +
               'Máy x86-64: <code>/sys/firmware</code> chứa <code>acpi  memmap</code>, và ' +
               '<code>/proc/device-tree</code> <b>không tồn tại</b>.<br><br>' +
               'Cùng một kernel Linux, cùng một lệnh, hai cơ chế mô tả phần cứng hoàn toàn ' +
               'khác nhau. Trong đó <code>DSDT</code> là bảng chứa mã AML đã nói ở phần lý ' +
               'thuyết — nó không phải dữ liệu thuần mà là một chương trình kernel phải thông ' +
               'dịch. Đó là khác biệt triết lý giữa hai thế giới, và bạn vừa nhìn thấy nó ' +
               'bằng hai lệnh <code>ls</code>.' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp — nếu bạn cần chỗ trống',
            x: 'Thư mục <code>~/bai42</code> chỉ nặng khoảng <b>5 MB</b> và không bài nào sau ' +
               'này phụ thuộc vào nó, nên xoá lúc nào cũng được bằng ' +
               '<code>rm -rf ~/bai42</code>. Ngược lại, ' +
               '<code>~/bai38/linux-6.18.45</code> (4,6 GB) và <code>~/bai40</code> thì ' +
               '<b>phải giữ</b>: cả Chặng 08, 09 và 10 đều dùng lại chúng.' }
        ] }
    ] },

    /* ============================================================
       6. LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>cp: cannot stat \'/home/…/bai32/initramfs\'</code>',
         'Bạn chưa làm Bài 32, hoặc đã xoá thư mục đó.',
         'Quay lại Bài 32 dựng lại initramfs BusyBox. Bài này không dựng lại từ đầu vì đó là nội dung của Chặng 09.'],
        ['<code>=== model ===</code> rồi dòng sau dính liền vào <code>linux,dummy-virt</code>',
         'Chuỗi trong Device Tree kết thúc bằng byte NUL, không phải ký tự xuống dòng. <code>cat</code> in đúng những byte có trong file.',
         'Thêm <code>; echo</code> sau lệnh <code>cat</code> như trong <code>init</code> của bước 4. Đây là hành vi bình thường, không phải hỏng dữ liệu.'],
        ['<code>grep: boot.log: binary file matches</code>',
         'Bạn lưu log QEMU ra file rồi <code>grep</code>. Log có chứa byte NUL (từ các chuỗi Device Tree mà <code>init</code> in ra) nên <code>grep</code> coi cả file là nhị phân.',
         'Dùng <code>grep -a</code> để ép coi là văn bản, hoặc lọc trước bằng <code>tr -d \'\\000\' &lt; boot.log</code>.'],
        ['<code>grep pl011 boot.log</code> không ra dòng earlycon nào',
         'Kernel in tên console là <code>pl11</code>, không phải <code>pl011</code> — xem callout ở bước 6.',
         'Tìm bằng <code>grep -a earlycon</code> hoặc <code>grep -a bootconsole</code> thay vì tìm theo tên driver.'],
        ['<code>sed -n \'129,145p\'</code> in ra đoạn mã khác hẳn trong bài',
         'Bạn dùng phiên bản kernel khác 6.18.45. Số dòng thay đổi theo từng bản.',
         'Đừng bám vào số dòng: tìm bằng nội dung — <code>grep -n DT_MACHINE_START arch/arm/mach-omap2/board-generic.c</code> rồi lấy số dòng thật.'],
        ['<code>find … -name \'*.dts\' -o -name \'*.dtsi\'</code> ra con số lớn bất thường',
         'Bạn quét cả <code>arch/</code> chứ không chỉ <code>arch/arm</code> và <code>arch/arm64</code>, nên nhặt thêm dts của RISC-V, MIPS, PowerPC.',
         'Chỉ định rõ hai thư mục như trong bước 3. Con số của bài là <b>5 322</b> cho riêng ARM và ARM64.'],
        ['Máy ảo không tự tắt, treo ở dòng <code>reboot: Power down</code>',
         '<code>poweroff -f</code> yêu cầu nhân có <code>CONFIG_PM</code> và QEMU hỗ trợ tắt nguồn — với <code>-M virt</code> thì có, nhưng nếu bạn đổi máy ảo thì chưa chắc.',
         'Thoát tay bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd>, đúng như Bài 30 đã dạy.'],
        ['Màn hình im lặng hoàn toàn khi bỏ <code>-append</code>',
         'Bạn bỏ luôn cả <code>-nographic</code>. Không có nó, QEMU mở cửa sổ đồ hoạ và không nối cổng nối tiếp vào terminal.',
         '<code>-nographic</code> là bắt buộc trong mọi lệnh của bài này. <code>/chosen/stdout-path</code> chỉ giúp được khi cổng đó thật sự nối tới chỗ bạn đang nhìn.']
      ] },

    /* ============================================================
       7. TÓM TẮT
       ============================================================ */
    { t: 'recap', items: [
      'Trước 2011, mỗi bo mạch ARM cần một <b>board file</b> C riêng trong cây nguồn kernel — mô tả phần cứng bị biên dịch cứng vào <code>vmlinux</code>, nên mỗi bo mạch là một <code>Image</code> khác.',
      'Phần cứng SoC <b>không tự khai báo</b>: một thanh ghi UART ở <code>0x9000000</code> không có cách nào tự nói với kernel rằng nó tồn tại, khác hẳn thiết bị PCI hay USB. Đó là lý do duy nhất Device Tree phải tồn tại.',
      'Device Tree tách mô tả ra thành <b>dữ liệu</b>: <code>.dts</code> do <code>dtc</code> dịch thành <code>.dtb</code>, bootloader nạp vào RAM rồi trao địa chỉ cho kernel qua thanh ghi <code>x0</code> — đúng thanh ghi bạn đã nghịch ở Bài 33.',
      'Ranh giới rất rõ: <b>"có cái gì, ở đâu" là dữ liệu; "làm thế nào" là mã</b>. Board file hôm nay chỉ còn <code>DT_MACHINE_START</code> với một danh sách <code>compatible</code> và vài con trỏ hàm.',
      'Số đo trên cây 6.18.45: <b>55</b> thư mục <code>mach-*</code> nhưng chỉ còn <b>20</b> board file / <b>4 220</b> dòng (dưới <b>4%</b> mã nền tảng ARM); <code>arm64</code> có <b>0</b> board file vì nó sinh ra sau cuộc chuyển đổi.',
      'Cán cân mới: <b>5 322</b> file <code>.dts</code>/<code>.dtsi</code> và <b>5 182</b> binding, đứng cạnh chỉ <b>22</b> file mã trong <code>drivers/of</code>. <b>175</b> bo mạch dùng chung một chuỗi <code>arm,pl011</code> và một driver duy nhất.',
      'Bạn đã boot <b>cùng một <code>Image</code></b> bốn lần và nhận về hai cỗ máy khác nhau (2 nhân / 474 MB và 4 nhân / 988 MB) — bằng chứng trực tiếp rằng mô tả phần cứng nằm ngoài kernel.',
      'Không cần <code>console=</code> kernel vẫn nói được, nhờ <code>/chosen/stdout-path</code>; và chỉ với chữ <code>earlycon</code> trơ trọi nó đã tự tìm ra <code>0x0000000009000000</code> từ <code>compatible</code> khớp với <code>OF_EARLYCON_DECLARE</code>.',
      '<b>ARM dùng Device Tree, x86 dùng ACPI</b> — nhưng đó là quy tắc theo <i>nền tảng</i> chứ không theo kiến trúc CPU: máy chủ ARM64 vẫn dùng ACPI. Khác biệt cốt lõi: DT là dữ liệu thuần, ACPI chứa cả mã AML mà kernel phải thông dịch.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<b>Bài 43 — Cú pháp DTS</b>. Bài này bạn mới chỉ <i>nhìn</i> tám dòng DTS của con ' +
         'PL011 và đoán nghĩa qua bảng đối chiếu. Bài 43 sẽ dạy bạn <i>viết</i> chúng: node ' +
         'và thuộc tính, vì sao <code>serial@1010c000</code> phải mang địa chỉ trong tên, ' +
         '<code>#address-cells</code> và <code>#size-cells</code> quyết định đọc ' +
         '<code>reg</code> ra sao, phandle và cái dấu <code>&amp;</code> trong ' +
         '<code>&amp;uartclk</code>, cùng cách <code>.dtsi</code> được chèn và ghi đè. Bạn sẽ ' +
         'tự tay gọi <code>dtc</code> — trình dịch đứng giữa <code>.dts</code> và ' +
         '<code>.dtb</code> trong sơ đồ ở đầu bài này — rồi dịch xuôi và dịch ngược một khối ' +
         '<code>.dtb</code> để thấy hai chiều khớp nhau.' }
  ],

  /* ============================================================
     QUIZ
     ============================================================ */
  quiz: [
    {
      q: 'Vì sao kernel không thể tự dò ra một con UART gắn thẳng vào SoC, trong khi nó dò được card mạng PCI?',
      opts: [
        'Vì UART chạy chậm hơn nên không kịp trả lời khi kernel hỏi',
        'Vì thiết bị PCI có thanh ghi nhận dạng và một giao thức liệt kê chuẩn, còn thanh ghi UART chỉ là một vùng nhớ câm lặng — không có cách nào hỏi nó là ai',
        'Vì driver UART được biên dịch thành module còn driver PCI thì nằm sẵn trong kernel',
        'Vì UART chỉ hoạt động sau khi Device Tree được nạp'
      ],
      a: 1,
      why: 'Bus có khả năng liệt kê (PCI, USB) định nghĩa sẵn một cách để hỏi "có ai ở đây không, anh là ai". ' +
           'Thiết bị MMIO trên SoC thì không: nếu kernel không được cho biết trước địa chỉ, việc "thử đọc xem có gì ở đó" ' +
           'là nguy hiểm — chạm vào một địa chỉ không có thiết bị nào thường gây treo bus. Đây là nguyên nhân gốc rễ ' +
           'khiến Device Tree phải tồn tại, không phải chuyện tốc độ hay cách biên dịch driver.'
    },
    {
      q: 'Sau cuộc chuyển đổi, phần nào của board file cũ vẫn ở lại trong mã C và vì sao?',
      opts: [
        'Địa chỉ các thanh ghi, vì kernel cần chúng ở dạng hằng số biên dịch',
        'Danh sách thiết bị, vì Device Tree không biểu diễn được nhiều thiết bị cùng loại',
        'Các con trỏ hàm như <code>.map_io</code>, <code>.init_early</code>, <code>.restart</code> — vì chúng mô tả một trình tự thao tác, thứ mà dữ liệu không biểu diễn được',
        'Không còn gì cả, board file đã bị xoá sạch khỏi cây nguồn'
      ],
      a: 2,
      why: 'Ranh giới là "có cái gì, ở đâu" (dữ liệu) so với "làm thế nào" (mã). Khối <code>DT_MACHINE_START</code> ' +
           'ở bước 3 không còn một địa chỉ nào, nhưng vẫn giữ các con trỏ hàm cho những việc cần trình tự riêng của ' +
           'từng dòng chip. Đáp án cuối cũng sai: cây 6.18.45 vẫn còn 20 board file, chủ yếu vì không còn phần cứng ' +
           'thật để kiểm thử bản chuyển đổi.'
    },
    {
      q: 'Bạn boot cùng một file <code>Image</code> hai lần, chỉ đổi <code>-m 512</code> thành <code>-m 1024</code>, và <code>MemTotal</code> thay đổi theo. Điều này chứng minh gì?',
      opts: [
        'QEMU đã tự sửa file <code>Image</code> trước khi nạp',
        'Kernel dò tìm dung lượng RAM bằng cách ghi thử vào từng vùng nhớ lúc khởi động',
        'Dung lượng RAM được kernel đọc từ Device Tree lúc chạy, nên nó nằm ngoài file nhị phân kernel',
        'Kernel đọc dung lượng RAM từ dòng lệnh nhân <code>console=ttyAMA0</code>'
      ],
      a: 2,
      why: 'File <code>Image</code> không đổi một byte (bạn có thể tự khẳng định bằng <code>md5sum</code> trước và sau). ' +
           'Cái đổi là khối <code>.dtb</code> mà QEMU sinh ra từ tham số dòng lệnh của nó, trong đó có node ' +
           '<code>memory@40000000</code>. Trong mô hình board file, dung lượng RAM là hằng số biên dịch — muốn máy ' +
           'thứ hai phải dịch lại kernel.'
    },
    {
      q: 'Bạn boot một bo mạch ARM64 và <b>không</b> truyền <code>console=</code> nào, nhưng log kernel vẫn hiện đầy đủ trên cổng nối tiếp. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Kernel luôn in ra mọi cổng nối tiếp nó tìm thấy',
        'Bootloader đã ghi <code>/chosen/stdout-path</code> vào Device Tree, và kernel dùng nó làm console mặc định',
        'Tham số <code>console=</code> đã được biên dịch cứng vào <code>Image</code> nên không cần truyền',
        'BusyBox trong initramfs tự chuyển hướng đầu ra sang cổng nối tiếp'
      ],
      a: 1,
      why: 'Đây đúng là boot 3 ở bước 6: <code>/proc/cmdline</code> rỗng mà log vẫn hiện. ' +
           '<code>/chosen</code> là nơi bootloader nhắn tin cho kernel, và <code>stdout-path</code> chỉ đích danh node ' +
           'cổng nối tiếp. Đáp án 3 <i>có thể</i> đúng trên một cấu hình khác — <code>CONFIG_CMDLINE</code> — nhưng ' +
           'khi đó <code>/proc/cmdline</code> sẽ hiện nội dung đó chứ không rỗng, nên nó không phải nguyên nhân ở đây.'
    },
    {
      q: 'Khẳng định nào sau đây về ACPI và Device Tree là <b>sai</b>?',
      opts: [
        'ACPI chứa cả mã AML mà kernel phải thông dịch, còn Device Tree chỉ chứa dữ liệu tĩnh',
        'Trên máy x86-64 chạy Linux, <code>/proc/device-tree</code> thường không tồn tại',
        'Mọi máy dùng CPU kiến trúc ARM64 đều dùng Device Tree, vì ACPI là cơ chế riêng của x86',
        'Bảng <code>DSDT</code> xuất hiện trong <code>/sys/firmware/acpi/tables</code> là bảng chứa mã AML'
      ],
      a: 2,
      why: 'Máy chủ ARM64 dùng ACPI — chuẩn SBBR của Arm yêu cầu như vậy, và kernel Linux hỗ trợ cả hai cơ chế trên ' +
           'ARM64 rồi chọn theo firmware nhận được lúc boot. Cách nhớ đúng: quyết định nằm ở <b>nền tảng</b> (bo mạch ' +
           'nhúng hay máy cài hệ điều hành từ đĩa), không nằm ở kiến trúc CPU. Ba khẳng định còn lại đều đúng và bạn ' +
           'đã tự kiểm chứng hai trong số đó ở bước 6.'
    },
    {
      q: 'Bạn boot với <code>-append "earlycon"</code> rồi lưu log ra file và chạy <code>grep pl011 boot.log</code>, nhưng không ra dòng earlycon nào dù màn hình rõ ràng có in. Nguyên nhân?',
      opts: [
        'Log bị cắt trước khi ghi ra file',
        'Kernel in tên console là <code>pl11</code> vì <code>earlycon_init()</code> cắt các chữ số cuối chuỗi thành chỉ số — và <code>grep</code> còn có thể coi file là nhị phân do byte NUL trong log',
        '<code>earlycon</code> không ghi vào bộ đệm log nên không xuất hiện trong file',
        'Phải dùng <code>dmesg</code> mới thấy được dòng earlycon'
      ],
      a: 1,
      why: 'Hai cái bẫy chồng lên nhau, và cả hai đều gặp thật khi soạn bài này. Thứ nhất, ' +
           '<code>earlycon_init()</code> quét ngược chữ số ở cuối <code>"pl011"</code> nên in ra ' +
           '<code>pl11</code>. Thứ hai, log QEMU chứa byte NUL từ các chuỗi Device Tree, khiến <code>grep</code> ' +
           'báo <code>binary file matches</code> thay vì in dòng. Cách chắc chắn: ' +
           '<code>grep -a earlycon boot.log</code>.'
    }
  ]
});

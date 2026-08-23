/* ═══════════════════════════════════════════════════════════════
   BÀI 14 — C cho embedded — ôn tập trọng tâm
   Chặng 02 · C và công cụ build
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-14',
  title: 'C cho embedded — ôn tập trọng tâm',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Bạn vừa kết thúc mười bài về Linux và một bài về Bash. Từ đây trở đi, mọi thứ bạn ' +
    'chạm vào — U-Boot, kernel, driver — đều được viết bằng <b>C</b>. Bài này không dạy lại ' +
    'C từ đầu; nó nhặt ra <b>bảy chỗ mà C nhúng khác C trên máy tính để bàn</b>, và đó đúng ' +
    'là bảy chỗ mà người mới hay trả giá: kiểu dữ liệu có kích thước thay đổi theo kiến ' +
    'trúc, thứ tự byte, đệm trong <code>struct</code>, thao tác bit, <code>volatile</code>, ' +
    '<code>static</code>, và căn lề. Bạn sẽ tự tay chứng minh từng điểm bằng trình biên ' +
    'dịch, kể cả việc bắt <code>gcc</code> <b>từ chối biên dịch</b> để chỉ ra một giả định ' +
    'sai. Kết thúc bài, bạn đọc được mã nguồn kernel mà không thấy nó là ngoại ngữ.',

  goals: [
    'Giải thích vì sao mã nhúng dùng <code>uint32_t</code> chứ không dùng <code>int</code> hay <code>long</code>',
    'Chứng minh máy của bạn là little-endian và nói được khi nào điều đó gây lỗi',
    'Tính được kích thước thật của một <code>struct</code> và sắp xếp lại trường để tiết kiệm bộ nhớ',
    'Viết bốn macro <code>BIT/SET/CLEAR/TEST</code> để thao tác thanh ghi phần cứng',
    'Chỉ ra trong mã assembly bằng chứng cho thấy <code>volatile</code> đã thay đổi kết quả biên dịch',
    'Phân biệt ba nghĩa khác nhau của từ khoá <code>static</code> và kiểm chứng bằng <code>nm</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VÌ SAO VẪN LÀ C
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao nhúng vẫn là địa bàn của C' },

    { t: 'p', x:
      'Kernel Linux có khoảng <b>ba mươi triệu dòng</b> mã, và phần áp đảo là C. U-Boot là ' +
      'C. Mọi driver bạn sẽ viết ở Chặng 10 là C. Điều đó không phải vì cộng đồng bảo thủ, ' +
      'mà vì C có một tính chất mà rất ít ngôn ngữ khác có: <b>bạn nhìn một dòng C và đoán ' +
      'được nó sinh ra bao nhiêu lệnh máy</b>.' },

    { t: 'table',
      head: ['Yêu cầu của môi trường nhúng', 'C đáp ứng thế nào'],
      rows: [
        ['Chạy được khi <b>chưa có</b> hệ điều hành', 'Không cần runtime. Một hàm C có thể là lệnh đầu tiên CPU chạy sau khi bật nguồn'],
        ['Không được cấp phát bộ nhớ ngầm', 'C không bao giờ tự cấp phát sau lưng bạn. Không có bộ thu gom rác, không có tạm thời ẩn'],
        ['Đọc/ghi được đúng một địa chỉ vật lý', 'Ép kiểu con trỏ: <code>*(volatile uint32_t *)0x40020000</code> là hợp lệ và trực tiếp'],
        ['Kích thước mã dự đoán được', 'Gần như ánh xạ một–một sang assembly. Bạn sẽ thấy tận mắt ở phần thực hành'],
        ['Trình biên dịch có sẵn cho <b>mọi</b> vi xử lý', 'GCC hỗ trợ hàng chục kiến trúc; một chip mới ra đời thì cổng GCC ra trước tiên']
      ]},

    { t: 'cal', kind: 'why', title: 'Điều C không cho bạn — và vì sao bài này tồn tại', x:
      '<p>Cái giá của "gần với phần cứng" là <b>C không giấu phần cứng đi</b>. Trong Python, ' +
      'một số nguyên là một số nguyên. Trong C, <code>int</code> là "số nguyên có kích thước ' +
      'tuỳ trình biên dịch quyết định" — và trên chip 8 bit nó có thể là 2 byte, trên máy này ' +
      'là 4 byte.</p>' +
      '<p>Mã chạy hoàn hảo trên laptop rồi hỏng khó hiểu trên thiết bị hầu như luôn rơi vào ' +
      'một trong bảy cái bẫy của bài này. Chúng không khó, chỉ là <b>chưa ai chỉ ra</b>. ' +
      'Hôm nay bạn gặp cả bảy trong hoàn cảnh an toàn, để lần sau gặp trên thiết bị thật thì ' +
      'nhận ra ngay.</p>' },

    /* ══════════════════════════════════════════════
       2. KIỂU DỮ LIỆU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Kiểu dữ liệu: bỏ int đi, dùng uint32_t' },

    { t: 'p', x:
      'Chuẩn C <b>không</b> quy định <code>int</code> phải rộng bao nhiêu. Nó chỉ quy định ' +
      'các mức tối thiểu và thứ tự <code>char ≤ short ≤ int ≤ long ≤ long long</code>. Mọi ' +
      'con số cụ thể là do <b>ABI</b> của kiến trúc quyết định. Đây là bảng đo thật trên máy ' +
      'này, bạn sẽ chạy lại ở bước 1:' },

    { t: 'table',
      head: ['Kiểu', 'x86_64 (máy này)', 'ARM64', 'ARM 32-bit', 'Rút ra'],
      rows: [
        ['<code>char</code>', '1', '1', '1', 'Luôn 1 — đây là định nghĩa của byte trong C'],
        ['<code>short</code>', '2', '2', '2', 'Thực tế luôn 2'],
        ['<code>int</code>', '4', '4', '4', 'Thường 4, <b>nhưng 2 trên vi điều khiển 8/16 bit</b>'],
        ['<code>long</code>', '<b>8</b>', '<b>8</b>', '<b>4</b>', '<b>Thay đổi.</b> Đây là cái bẫy số một'],
        ['<code>long long</code>', '8', '8', '8', 'Thực tế luôn 8'],
        ['<code>void *</code>', '<b>8</b>', '<b>8</b>', '<b>4</b>', '<b>Thay đổi</b> theo độ rộng địa chỉ'],
        ['<code>uint32_t</code>', '4', '4', '4', '<b>Không bao giờ thay đổi.</b> Đó là điểm mấu chốt']
      ]},

    { t: 'cal', kind: 'danger', title: 'Cái bẫy long: viết đúng trên máy này, hỏng trên thiết bị', x:
      '<p>Hai mô hình dữ liệu phổ biến nhất khác nhau đúng ở <code>long</code>:</p>' +
      '<p><b>LP64</b> (Linux 64-bit, cả x86_64 lẫn ARM64): <code>long</code> = 8, con trỏ = 8.<br>' +
      '<b>ILP32</b> (ARM 32-bit — Raspberry Pi chạy hệ 32 bit, hầu hết chip công nghiệp): ' +
      '<code>long</code> = 4, con trỏ = 4.</p>' +
      '<p>Nghĩa là <code>long moc_thoi_gian;</code> chứa được năm 2100 trên máy bạn nhưng ' +
      '<b>tràn vào năm 2038</b> trên thiết bị. Ở bước 2 bạn sẽ bắt <code>gcc</code> nói thẳng ' +
      'điều này ra bằng <code>_Static_assert</code> — nó sẽ <b>từ chối biên dịch</b> cho ARM ' +
      '32-bit đúng như mong đợi.</p>' },

    { t: 'terms', items: [
      ['ABI', 'Application Binary Interface', 'Bản hợp đồng giữa trình biên dịch và hệ điều hành: kiểu nào rộng bao nhiêu, tham số truyền qua thanh ghi nào, ngăn xếp lớn lên chiều nào. <b>Cùng một mã C, khác ABI, ra khác file nhị phân</b>'],
      ['LP64', '', '<b>L</b>ong và <b>P</b>ointer là <b>64</b> bit, <code>int</code> vẫn 32. Mô hình của mọi bản Linux 64-bit'],
      ['ILP32', '', '<b>I</b>nt, <b>L</b>ong, <b>P</b>ointer đều <b>32</b> bit. Mô hình của ARM 32-bit'],
      ['<code>stdint.h</code>', '', 'Header chuẩn khai báo các kiểu có kích thước cố định: <code>int8_t</code> … <code>uint64_t</code>. <b>Dòng include đầu tiên của mọi file C nhúng</b>'],
      ['<code>size_t</code>', '', 'Kiểu không dấu đủ rộng để chứa kích thước lớn nhất có thể của một đối tượng. Trả về bởi <code>sizeof</code>, in bằng <code>%zu</code>'],
      ['<code>uintptr_t</code>', '', 'Kiểu nguyên đủ rộng để chứa một con trỏ. Dùng khi cần làm toán trên địa chỉ — <b>đừng dùng <code>int</code></b>'],
      ['<code>_Alignof</code>', '', 'Toán tử trả về yêu cầu căn lề của một kiểu. Có từ C11, viết được <code>alignof</code> nếu include <code>stdalign.h</code>']
    ]},

    { t: 'cal', kind: 'tip', title: 'Quy tắc chọn kiểu, dùng được ngay hôm nay', x:
      '<p><b>Nói chuyện với phần cứng</b> — thanh ghi, gói tin, cấu trúc ghi ra flash: bắt ' +
      'buộc <code>uint8_t</code> / <code>uint16_t</code> / <code>uint32_t</code>. Kích thước ' +
      'là một phần của đặc tả, không phải chi tiết cài đặt.</p>' +
      '<p><b>Chỉ số vòng lặp, biến đếm nội bộ</b>: <code>int</code> vẫn ổn và thường sinh mã ' +
      'nhanh nhất vì khớp với độ rộng thanh ghi tự nhiên.</p>' +
      '<p><b>Kích thước và độ dài</b>: <code>size_t</code>.<br>' +
      '<b>Địa chỉ đem ra tính toán</b>: <code>uintptr_t</code>.<br>' +
      '<b>Không bao giờ</b>: <code>long</code> để lưu dữ liệu — nó vừa mơ hồ vừa không có ưu ' +
      'điểm nào.</p>' },

    /* ══════════════════════════════════════════════
       3. ENDIANNESS
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thứ tự byte: little-endian và big-endian' },

    { t: 'p', x:
      'Một <code>uint32_t</code> chiếm bốn byte trong bộ nhớ. Câu hỏi là: <b>byte nào nằm ở ' +
      'địa chỉ thấp nhất?</b> Không có câu trả lời phổ quát — mỗi kiến trúc tự chọn, và lựa ' +
      'chọn đó gọi là <b>endianness</b>.' },

    { t: 'fig',
      cap: 'Cùng một giá trị 0x12345678, hai cách xếp trong bộ nhớ. Chỉ khi dữ liệu rời khỏi máy — qua mạng, qua file, qua bus — sự khác biệt mới trở thành lỗi.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="So sánh cách xếp byte của giá trị 0x12345678 trong little-endian và big-endian">' +
        '<rect class="d-box-p" x="20" y="16" width="680" height="30" rx="4"/>' +
        '<text class="d-tm" x="34" y="36">uint32_t x = 0x12345678;   /* MSB = 12, LSB = 78 */</text>' +

        '<text class="d-t" x="20" y="80">LITTLE-ENDIAN  (x86, ARM mac dinh, RISC-V)</text>' +
        '<rect class="d-box-g" x="20" y="92" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-g" x="180" y="92" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-g" x="340" y="92" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-g" x="500" y="92" width="150" height="40" rx="4"/>' +
        '<text class="d-tm" x="95" y="117" text-anchor="middle">78</text>' +
        '<text class="d-tm" x="255" y="117" text-anchor="middle">56</text>' +
        '<text class="d-tm" x="415" y="117" text-anchor="middle">34</text>' +
        '<text class="d-tm" x="575" y="117" text-anchor="middle">12</text>' +
        '<text class="d-ts" x="95" y="148" text-anchor="middle">dia chi +0</text>' +
        '<text class="d-ts" x="255" y="148" text-anchor="middle">+1</text>' +
        '<text class="d-ts" x="415" y="148" text-anchor="middle">+2</text>' +
        '<text class="d-ts" x="575" y="148" text-anchor="middle">+3</text>' +
        '<text class="d-ts" x="660" y="117">byte nho</text>' +
        '<text class="d-ts" x="660" y="132">nhat truoc</text>' +

        '<text class="d-t" x="20" y="180">BIG-ENDIAN  (mang, MIPS cu, mot so DSP)</text>' +
        '<rect class="d-box-w" x="20" y="192" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-w" x="180" y="192" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-w" x="340" y="192" width="150" height="40" rx="4"/>' +
        '<rect class="d-box-w" x="500" y="192" width="150" height="40" rx="4"/>' +
        '<text class="d-tm" x="95" y="217" text-anchor="middle">12</text>' +
        '<text class="d-tm" x="255" y="217" text-anchor="middle">34</text>' +
        '<text class="d-tm" x="415" y="217" text-anchor="middle">56</text>' +
        '<text class="d-tm" x="575" y="217" text-anchor="middle">78</text>' +
        '<text class="d-ts" x="660" y="217">nhu ta doc</text>' +
        '</svg>' },

    { t: 'p', x:
      'Bên trong một máy, endianness <b>không bao giờ</b> gây lỗi: CPU ghi ra sao thì đọc lại ' +
      'y như vậy. Nó chỉ trở thành vấn đề đúng ba lúc — và cả ba đều là công việc hằng ngày ' +
      'của kỹ sư nhúng.' },

    { t: 'table',
      head: ['Khi nào endianness trở thành lỗi', 'Ví dụ cụ thể bạn sẽ gặp'],
      rows: [
        ['Dữ liệu đi qua <b>mạng</b>', 'Mọi giao thức Internet quy định big-endian, gọi là <i>network byte order</i>. Quên đổi thì cổng 80 thành cổng 20480'],
        ['Dữ liệu đi qua <b>file hoặc flash</b>', 'Ảnh kernel, bảng phân vùng, <b>Device Tree Blob</b> ở Chặng 08 — DTB <b>luôn</b> big-endian bất kể chip là gì'],
        ['Dữ liệu đi qua <b>bus phần cứng</b>', 'Cảm biến I2C/SPI thường trả về big-endian, còn CPU ARM của bạn là little-endian']
      ]},

    { t: 'cal', kind: 'info', title: 'ARM có thể chạy cả hai chiều, nhưng thực tế chỉ chạy một', x:
      '<p>ARM là kiến trúc <i>bi-endian</i> — có một bit trong thanh ghi hệ thống chọn chiều. ' +
      'Trên thực tế <b>gần như 100% thiết bị ARM chạy Linux đều là little-endian</b>, vì hệ ' +
      'sinh thái phần mềm đã ngả hẳn về phía đó.</p>' +
      '<p>Đừng vì thế mà cho rằng endianness là chuyện quá khứ. Bạn sẽ gặp nó rất sớm: ở ' +
      '<b>Chặng 08</b>, mọi số trong file <code>.dtb</code> đều big-endian, nên mã kernel đọc ' +
      'Device Tree phải gọi <code>be32_to_cpu()</code> ở từng bước. Khi bạn thấy hàm đó, hãy ' +
      'nhớ lại hình vẽ ở trên.</p>' },

    { t: 'cal', kind: 'tip', title: 'Cách hỏi endianness mà không cần chạy chương trình', x:
      '<p>GCC định nghĩa sẵn macro <code>__BYTE_ORDER__</code>. Bạn sẽ in nó ra ở bước 1 và ' +
      'thấy nó bằng <code>__ORDER_LITTLE_ENDIAN__</code>, tức <b>1234</b>.</p>' +
      '<p>Vì đây là macro tiền xử lý, nó được quyết định <b>lúc biên dịch</b> chứ không phải ' +
      'lúc chạy — đúng thứ ta cần khi biên dịch chéo, vì lúc đó chương trình không chạy trên ' +
      'máy build. Đây cũng là lần đầu bạn thấy giá trị thật của giai đoạn tiền xử lý, thứ ' +
      '<b>Bài 15</b> sẽ mổ xẻ tường tận.</p>' },

    /* ══════════════════════════════════════════════
       4. CON TRỎ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Con trỏ: chỉ là một số, nhưng là một số có kiểu' },

    { t: 'p', x:
      'Con trỏ làm người mới sợ vì nó được dạy như một khái niệm trừu tượng. Hãy bỏ hết đi và ' +
      'giữ lại đúng một câu: <b>con trỏ là một biến chứa địa chỉ</b>. Trên máy này nó rộng ' +
      '8 byte, đúng bằng <code>long</code>. Cái làm nó khác một số nguyên bình thường là ' +
      '<b>kiểu</b> đi kèm — và kiểu đó quyết định hai việc.' },

    { t: 'table',
      head: ['Cú pháp', 'Đọc thành lời', 'Kết quả trên máy này'],
      rows: [
        ['<code>int x = 5;</code>', 'ô nhớ tên <code>x</code> chứa số 5', '4 byte trên ngăn xếp'],
        ['<code>&amp;x</code>', '<b>địa chỉ của</b> <code>x</code>', 'Một số 8 byte, ví dụ <code>0x7ffd…</code>'],
        ['<code>int *p = &amp;x;</code>', '<code>p</code> chứa địa chỉ của <code>x</code>', '<code>p</code> chiếm 8 byte, nội dung là địa chỉ'],
        ['<code>*p</code>', '<b>giá trị tại</b> địa chỉ <code>p</code> đang giữ', '5'],
        ['<code>*p = 9;</code>', 'ghi 9 vào ô nhớ mà <code>p</code> trỏ tới', '<code>x</code> trở thành 9'],
        ['<code>p + 1</code>', 'nhảy tới <b>phần tử kế tiếp</b>, không phải byte kế tiếp', 'Địa chỉ tăng <b>4</b>, vì <code>sizeof(int)</code> = 4']
      ]},

    { t: 'fig',
      cap: 'Phép cộng con trỏ tính theo kích thước kiểu, không theo byte. Cùng địa chỉ 0x1000, cộng 1 vào con trỏ uint8_t ra 0x1001, cộng vào con trỏ uint32_t ra 0x1004.',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Sơ đồ phép cộng con trỏ theo kích thước kiểu dữ liệu">' +
        '<rect class="d-box" x="20" y="20" width="60" height="40" rx="4"/>' +
        '<rect class="d-box" x="80" y="20" width="60" height="40" rx="4"/>' +
        '<rect class="d-box" x="140" y="20" width="60" height="40" rx="4"/>' +
        '<rect class="d-box" x="200" y="20" width="60" height="40" rx="4"/>' +
        '<rect class="d-box" x="260" y="20" width="60" height="40" rx="4"/>' +
        '<text class="d-ts" x="50" y="76" text-anchor="middle">0x1000</text>' +
        '<text class="d-ts" x="110" y="76" text-anchor="middle">0x1001</text>' +
        '<text class="d-ts" x="170" y="76" text-anchor="middle">0x1002</text>' +
        '<text class="d-ts" x="230" y="76" text-anchor="middle">0x1003</text>' +
        '<text class="d-ts" x="290" y="76" text-anchor="middle">0x1004</text>' +
        '<text class="d-ts" x="340" y="45">bo nho, moi o = 1 byte</text>' +

        '<rect class="d-box-g" x="20" y="104" width="200" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="126">uint8_t *p8 = 0x1000;</text>' +
        '<line class="d-line" x1="230" y1="121" x2="288" y2="121"/>' +
        '<path class="d-arrow" d="M288 121 l-8 -4 v8 z"/>' +
        '<text class="d-tm" x="300" y="126">p8 + 1  ==  0x1001</text>' +
        '<text class="d-ts" x="500" y="126">buoc 1 byte</text>' +

        '<rect class="d-box-a" x="20" y="150" width="200" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="172">uint32_t *p32 = 0x1000;</text>' +
        '<line class="d-line" x1="230" y1="167" x2="288" y2="167"/>' +
        '<path class="d-arrow" d="M288 167 l-8 -4 v8 z"/>' +
        '<text class="d-tm" x="300" y="172">p32 + 1  ==  0x1004</text>' +
        '<text class="d-ts" x="500" y="172">buoc 4 byte</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao truyền con trỏ chứ không truyền giá trị', x:
      '<p>C truyền tham số <b>bằng bản sao</b>, luôn luôn. Hàm <code>swap(int a, int b)</code> ' +
      'đổi chỗ hai <i>bản sao</i> rồi trả về, còn hai biến gốc không suy suyển — bạn sẽ thấy ' +
      'đúng điều đó ở bước 3.</p>' +
      '<p>Muốn hàm sửa được biến của người gọi, cách duy nhất là đưa cho nó <b>địa chỉ</b>. ' +
      'Đây không phải mẹo, đây là <b>cơ chế duy nhất</b> C có để trả về nhiều giá trị — và vì ' +
      'thế mọi API kernel đều theo mẫu này: hàm trả về mã lỗi, còn kết quả thật ghi vào con ' +
      'trỏ mà bạn truyền vào.</p>' +
      '<p>Lý do thứ hai quan trọng không kém với nhúng: truyền một <code>struct</code> 200 ' +
      'byte bằng giá trị là <b>chép 200 byte</b> mỗi lần gọi. Truyền con trỏ là chép 8 byte. ' +
      'Trên vi xử lý 200 MHz với 64 KB RAM, khác biệt đó là thật.</p>' },

    { t: 'cal', kind: 'warn', title: 'Mảng không phải con trỏ, dù nó rất giống', x:
      '<p><code>arr[2]</code> và <code>*(arr + 2)</code> cho cùng kết quả, nên nhiều người ' +
      'kết luận mảng <i>là</i> con trỏ. Không phải. Bạn sẽ đo được ở bước 3: ' +
      '<code>sizeof(arr)</code> = <b>20</b> với mảng 5 phần tử <code>int</code>, còn ' +
      '<code>sizeof(&amp;arr[0])</code> = <b>8</b>.</p>' +
      '<p>Mảng là một khối 20 byte có thật; nó chỉ <b>tự chuyển thành</b> con trỏ tới phần tử ' +
      'đầu khi bị dùng trong biểu thức. Hệ quả thực tế cắn người ta nhiều nhất: khi bạn ' +
      'truyền mảng vào hàm, tham số bên trong hàm <b>đã là con trỏ</b>, nên ' +
      '<code>sizeof</code> bên trong hàm trả về 8 chứ không phải 20. Muốn hàm biết độ dài, ' +
      'phải truyền độ dài kèm theo — đó là lý do mọi hàm kernel đều có tham số ' +
      '<code>len</code> hoặc <code>count</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. STRUCT VÀ CĂN LỀ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'struct, căn lề và byte đệm' },

    { t: 'p', x:
      'Đây là nơi trực giác đánh lừa mạnh nhất. Một <code>struct</code> gồm ' +
      '<code>uint8_t</code> + <code>uint32_t</code> + <code>uint8_t</code> có tổng ' +
      '1 + 4 + 1 = <b>6</b> byte dữ liệu, nhưng <code>sizeof</code> trả về <b>12</b>. Sáu ' +
      'byte kia là <b>đệm</b> (padding) do trình biên dịch chèn vào, và nó có lý do rất chính ' +
      'đáng.' },

    { t: 'fig',
      cap: 'Chỉ đổi thứ tự khai báo, không đổi một trường nào: 12 byte xuống 8. Với mảng 1000 phần tử, đó là 4000 byte RAM tiết kiệm được miễn phí.',
      svg:
        '<svg viewBox="0 0 720 320" width="720" role="img" aria-label="So sánh ba cách khai báo struct: xấu 12 byte, tốt 8 byte, packed 6 byte">' +
        '<text class="d-t" x="20" y="22">struct bad_layout { uint8_t a; uint32_t b; uint8_t c; }   ->  sizeof = 12</text>' +
        '<rect class="d-box-g" x="20" y="34" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="45" y="57" text-anchor="middle">a</text>' +
        '<rect class="d-box-w" x="70" y="34" width="150" height="36" rx="3"/>' +
        '<text class="d-ts" x="145" y="57" text-anchor="middle">3 byte dem — bo phi</text>' +
        '<rect class="d-box-a" x="220" y="34" width="200" height="36" rx="3"/>' +
        '<text class="d-tm" x="320" y="57" text-anchor="middle">b  (4 byte)</text>' +
        '<rect class="d-box-g" x="420" y="34" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="445" y="57" text-anchor="middle">c</text>' +
        '<rect class="d-box-w" x="470" y="34" width="150" height="36" rx="3"/>' +
        '<text class="d-ts" x="545" y="57" text-anchor="middle">3 byte dem — bo phi</text>' +
        '<text class="d-ts" x="20" y="88">offset:  a=0        b=4                   c=8</text>' +

        '<text class="d-t" x="20" y="128">struct good_layout { uint32_t b; uint8_t a; uint8_t c; }   ->  sizeof = 8</text>' +
        '<rect class="d-box-a" x="20" y="140" width="200" height="36" rx="3"/>' +
        '<text class="d-tm" x="120" y="163" text-anchor="middle">b  (4 byte)</text>' +
        '<rect class="d-box-g" x="220" y="140" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="245" y="163" text-anchor="middle">a</text>' +
        '<rect class="d-box-g" x="270" y="140" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="295" y="163" text-anchor="middle">c</text>' +
        '<rect class="d-box-w" x="320" y="140" width="100" height="36" rx="3"/>' +
        '<text class="d-ts" x="370" y="163" text-anchor="middle">2 byte dem</text>' +
        '<text class="d-ts" x="20" y="194">offset:  b=0                   a=4  c=5</text>' +

        '<text class="d-t" x="20" y="234">struct __attribute__((packed)) packed_layout { … }   ->  sizeof = 6</text>' +
        '<rect class="d-box-g" x="20" y="246" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="45" y="269" text-anchor="middle">a</text>' +
        '<rect class="d-box-a" x="70" y="246" width="200" height="36" rx="3"/>' +
        '<text class="d-tm" x="170" y="269" text-anchor="middle">b  (4 byte, LECH)</text>' +
        '<rect class="d-box-g" x="270" y="246" width="50" height="36" rx="3"/>' +
        '<text class="d-tm" x="295" y="269" text-anchor="middle">c</text>' +
        '<text class="d-ts" x="330" y="269">khong con byte thua — nhung truy cap b co the cham</text>' +
        '<text class="d-ts" x="20" y="300">offset:  a=0  b=1                   c=5</text>' +
        '</svg>' },

    { t: 'p', x:
      'Quy tắc trình biên dịch áp dụng chỉ gồm ba dòng, và bạn tính nhẩm được:' },

    { t: 'list', ordered: true, items: [
      'Mỗi trường phải nằm ở <b>offset chia hết cho căn lề của kiểu nó</b>. ' +
      '<code>uint32_t</code> cần offset chia hết cho 4, <code>uint64_t</code> cần chia hết cho 8.',
      'Nếu offset hiện tại không thoả, chèn <b>byte đệm</b> cho tới khi thoả.',
      '<b>Tổng kích thước</b> phải chia hết cho căn lề lớn nhất trong struct — nên thường có ' +
      'đệm ở cuối, để phần tử kế tiếp của một mảng cũng nằm đúng chỗ.'
    ]},

    { t: 'table',
      head: ['Kiểu', 'Kích thước', 'Căn lề trên máy này', 'Nghĩa là'],
      rows: [
        ['<code>uint8_t</code>', '1', '1', 'Đặt ở đâu cũng được'],
        ['<code>uint16_t</code>', '2', '2', 'Offset phải chẵn'],
        ['<code>uint32_t</code>', '4', '4', 'Offset phải chia hết cho 4'],
        ['<code>uint64_t</code>', '8', '8', 'Offset phải chia hết cho 8'],
        ['<code>void *</code>', '8', '8', 'Như <code>uint64_t</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao phần cứng đòi căn lề', x:
      '<p>CPU không đọc bộ nhớ từng byte một. Nó đọc theo <b>từ</b> — thường 4 hoặc 8 byte, ' +
      'và luôn từ một địa chỉ là bội số của kích thước từ. Một <code>uint32_t</code> nằm ở ' +
      'offset 4 lấy về trong <b>một</b> chu kỳ. Cũng biến đó nằm ở offset 1 thì vắt qua ranh ' +
      'giới hai từ: CPU phải đọc <b>hai</b> lần rồi ghép lại.</p>' +
      '<p>Trên x86 việc ghép đó được phần cứng làm ngầm, bạn chỉ mất tốc độ. Trên ' +
      '<b>nhiều chip ARM và hầu hết chip nhúng nhỏ, CPU không ghép giúp</b> — nó phát sinh ' +
      'ngoại lệ và chương trình chết với <code>SIGBUS</code>. Đây chính là lỗi kinh điển ' +
      '"chạy tốt trên laptop, đụng vào là chết trên board".</p>' +
      '<p>Trình biên dịch chèn đệm để chuyện đó <b>không bao giờ</b> xảy ra. Đệm không phải ' +
      'lãng phí do cẩu thả, nó là cái giá của tính đúng đắn.</p>' },

    { t: 'cal', kind: 'danger', title: 'packed: dùng đúng chỗ thì cần, dùng sai chỗ thì hỏng', x:
      '<p><code>__attribute__((packed))</code> ra lệnh cho GCC bỏ hết đệm. Nghe thì hay, ' +
      'nhưng nó tạo ra đúng tình huống lệch mà mục trên vừa cảnh báo.</p>' +
      '<p><b>Đúng chỗ:</b> struct mô tả một định dạng do người khác quy định — header gói tin ' +
      'mạng, cấu trúc trên đĩa, gói dữ liệu từ cảm biến. Ở đó bố cục byte là <i>đặc tả</i>, ' +
      'bạn không có quyền thêm bớt.</p>' +
      '<p><b>Sai chỗ:</b> dùng packed cho struct nội bộ chỉ để "tiết kiệm RAM". Bạn đổi vài ' +
      'byte lấy nguy cơ <code>SIGBUS</code> trên ARM và mã chậm hơn ở mọi lần truy cập. ' +
      '<b>Hãy sắp lại thứ tự trường trước</b> — như hình trên, từ 12 xuống 8 mà không mất gì.</p>' +
      '<p>Quy tắc vàng của kernel: <b>khai báo trường từ lớn tới nhỏ</b>. Làm vậy thì phần lớn ' +
      'đệm tự biến mất.</p>' },

    /* ══════════════════════════════════════════════
       6. UNION VÀ BITFIELD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'union và bitfield: một vùng nhớ, nhiều cách nhìn' },

    { t: 'p', x:
      'Trong <code>struct</code>, các trường nằm <b>cạnh nhau</b>. Trong <code>union</code>, ' +
      'chúng nằm <b>chồng lên nhau</b> — cùng bắt đầu ở offset 0, và kích thước union bằng ' +
      'kích thước trường lớn nhất. Nghe như một cách tiết kiệm bộ nhớ, nhưng công dụng thật ' +
      'của nó trong nhúng là khác: <b>nhìn cùng một vùng nhớ theo nhiều cách</b>.' },

    { t: 'table',
      head: ['', '<code>struct</code>', '<code>union</code>'],
      rows: [
        ['Bố cục', 'Các trường xếp nối tiếp', 'Các trường <b>đè lên nhau</b> từ offset 0'],
        ['Kích thước', 'Tổng các trường + đệm', 'Bằng trường <b>lớn nhất</b>'],
        ['Ghi vào một trường', 'Không ảnh hưởng trường khác', '<b>Ghi đè</b> lên các trường khác'],
        ['Dùng để', 'Gom dữ liệu liên quan thành một khối', 'Diễn giải lại cùng một khối bit theo cách khác']
      ]},

    { t: 'p', x:
      'Ghép <code>union</code> với <b>bitfield</b> — cú pháp <code>uint32_t enable : 1;</code> ' +
      'nghĩa là "trường này chỉ chiếm 1 bit" — ta được mẫu thiết kế mà mọi driver đều dùng: ' +
      'một thanh ghi phần cứng vừa đọc được như số nguyên 32 bit, vừa đọc được theo từng ' +
      'trường có tên.' },

    { t: 'fig',
      cap: 'Một union thanh ghi cho ba cách nhìn vào đúng bốn byte đó. Ghi vào fields.speed là ghi vào các bit 4–7 của raw, không cần dịch bit bằng tay.',
      svg:
        '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="Sơ đồ union thanh ghi với ba cách nhìn: nguyên, mảng byte và bitfield">' +
        '<rect class="d-box-p" x="20" y="16" width="680" height="30" rx="4"/>' +
        '<text class="d-tm" x="34" y="36">union hwreg r;   sizeof(r) == 4   /* ca ba cach nhin dung chung 4 byte nay */</text>' +

        '<text class="d-t" x="20" y="78">cach 1 — r.raw</text>' +
        '<rect class="d-box-a" x="220" y="60" width="480" height="30" rx="3"/>' +
        '<text class="d-tm" x="460" y="80" text-anchor="middle">0x000000A5   (mot uint32_t)</text>' +

        '<text class="d-t" x="20" y="120">cach 2 — r.byte[]</text>' +
        '<rect class="d-box-g" x="220" y="102" width="120" height="30" rx="3"/>' +
        '<rect class="d-box-g" x="340" y="102" width="120" height="30" rx="3"/>' +
        '<rect class="d-box-g" x="460" y="102" width="120" height="30" rx="3"/>' +
        '<rect class="d-box-g" x="580" y="102" width="120" height="30" rx="3"/>' +
        '<text class="d-tm" x="280" y="122" text-anchor="middle">A5</text>' +
        '<text class="d-tm" x="400" y="122" text-anchor="middle">00</text>' +
        '<text class="d-tm" x="520" y="122" text-anchor="middle">00</text>' +
        '<text class="d-tm" x="640" y="122" text-anchor="middle">00</text>' +

        '<text class="d-t" x="20" y="164">cach 3 — r.fields</text>' +
        '<rect class="d-box-w" x="220" y="146" width="60" height="30" rx="3"/>' +
        '<rect class="d-box-w" x="280" y="146" width="90" height="30" rx="3"/>' +
        '<rect class="d-box-w" x="370" y="146" width="110" height="30" rx="3"/>' +
        '<rect class="d-box" x="480" y="146" width="220" height="30" rx="3"/>' +
        '<text class="d-ts" x="250" y="166" text-anchor="middle">enable</text>' +
        '<text class="d-ts" x="325" y="166" text-anchor="middle">mode</text>' +
        '<text class="d-ts" x="425" y="166" text-anchor="middle">speed</text>' +
        '<text class="d-ts" x="590" y="166" text-anchor="middle">reserved (24 bit)</text>' +
        '<text class="d-ts" x="250" y="192" text-anchor="middle">1 bit</text>' +
        '<text class="d-ts" x="325" y="192" text-anchor="middle">3 bit</text>' +
        '<text class="d-ts" x="425" y="192" text-anchor="middle">4 bit</text>' +

        '<rect class="d-box-w" x="20" y="214" width="680" height="34" rx="4"/>' +
        '<text class="d-t" x="34" y="236">0xA5 = 1010 0101 -> enable=1, mode=2, speed=10. Dat speed=0xF thi raw thanh 0x000000F5.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'warn', title: 'Bitfield tiện nhưng không di động — hãy biết trước', x:
      '<p>Chuẩn C <b>không</b> quy định bitfield được xếp từ bit thấp lên hay từ bit cao ' +
      'xuống. GCC trên máy little-endian xếp từ bit 0 lên, nên bạn sẽ thấy ' +
      '<code>enable</code> = bit 0. Trên trình biên dịch khác hoặc máy big-endian, thứ tự có thể ' +
      'ngược lại.</p>' +
      '<p>Vì thế kernel Linux <b>tránh dùng bitfield cho thanh ghi phần cứng</b> và dùng ' +
      'macro dịch bit — đúng những macro bạn viết ở mục sau. Bitfield vẫn rất đáng dùng cho ' +
      'cấu trúc <i>nội bộ</i> của chương trình, nơi bạn kiểm soát cả hai đầu.</p>' +
      '<p>Bài học: <b>tiện lợi và di động là hai thứ phải cân nhắc, không phải hai thứ luôn ' +
      'đi cùng nhau.</b></p>' },

    /* ══════════════════════════════════════════════
       7. THAO TÁC BIT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thao tác bit: ngôn ngữ của thanh ghi' },

    { t: 'p', x:
      'Điều khiển phần cứng gần như luôn quy về một việc: <b>bật, tắt, đảo hoặc đọc một bit ' +
      'trong một thanh ghi 32 bit</b>, mà không được đụng tới 31 bit còn lại. Bốn macro sau ' +
      'giải quyết trọn vẹn, và bạn sẽ gặp lại chúng — gần như nguyên văn — trong mã kernel.' },

    { t: 'code', where: 'file', name: 'bit.c — bốn macro cần thuộc lòng', code:
      '#define BIT(n)          (1U << (n))\n' +
      '#define SET(reg, n)     ((reg) |=  BIT(n))    /* set   bit n, keep the other bits unchanged */\n' +
      '#define CLEAR(reg, n)   ((reg) &= ~BIT(n))    /* clear bit n */\n' +
      '#define TOGGLE(reg, n)  ((reg) ^=  BIT(n))    /* toggle bit n */\n' +
      '#define TEST(reg, n)    (((reg) >> (n)) & 1U) /* read  bit n, returns 0 or 1 */' },

    { t: 'cmdx', cmd: 'Vì sao mỗi macro lại viết như vậy', title: 'Đọc từng toán tử',
      rows: [
        ['<code>1U &lt;&lt; n</code>', 'Tạo một số chỉ có <b>đúng bit thứ n</b> bằng 1', 'Chữ <code>U</code> là bắt buộc: <code>1 &lt;&lt; 31</code> với <code>int</code> có dấu là <b>hành vi không xác định</b>'],
        ['<code>|=</code> (OR)', 'Bật bit mà không đụng bit khác', '<code>x | 0</code> giữ nguyên <code>x</code>, <code>x | 1</code> luôn ra 1'],
        ['<code>&amp;= ~</code> (AND NOT)', 'Tắt bit mà không đụng bit khác', '<code>~BIT(n)</code> là số toàn 1 <b>trừ</b> bit n. AND với nó chỉ xoá đúng bit đó'],
        ['<code>^=</code> (XOR)', 'Đảo bit', '<code>x ^ 1</code> lật <code>x</code>, <code>x ^ 0</code> giữ nguyên'],
        ['<code>&gt;&gt; n &amp; 1U</code>', 'Kéo bit n về vị trí 0 rồi giữ lại mình nó', 'Trả về <b>0 hoặc 1</b>, không phải <code>0</code> hoặc <code>BIT(n)</code>'],
        ['Ngoặc quanh mọi tham số', 'Chống lỗi thứ tự phép toán', '<code>BIT(a+1)</code> mà không có ngoặc sẽ thành <code>1U &lt;&lt; a + 1</code> — sai hoàn toàn']
      ]},

    { t: 'p', x:
      'Muốn đọc hoặc ghi một <b>trường nhiều bit</b> thay vì một bit, dùng thêm mặt nạ ' +
      '(mask). Ví dụ trích 4 bit bắt đầu từ vị trí 12:' },

    { t: 'code', where: 'file', name: 'trích và ghi một trường nhiều bit', code:
      'uint32_t field = (reg >> 12) & 0xF;       /* read the 4-bit field at position 12 */\n' +
      '\n' +
      'reg &= ~(0xFU << 12);                     /* step 1: clear the old field   */\n' +
      'reg |=  ((value & 0xFU) << 12);           /* step 2: write in the new value */' },

    { t: 'cal', kind: 'tip', title: 'Luôn xoá trước, ghi sau — hai bước, không phải một', x:
      '<p>Người mới hay viết thẳng <code>reg |= (value &lt;&lt; 12)</code> và bỏ qua bước ' +
      'xoá. Nó chạy đúng khi trường đang bằng 0 — tức là <b>lần đầu tiên</b> — rồi sai từ lần ' +
      'thứ hai trở đi, vì phép OR chỉ bật thêm bit chứ không tắt bit nào.</p>' +
      '<p>Đây là loại lỗi tệ nhất trong nghề: nó không sai ngay, nó sai <i>về sau</i>, khi bạn ' +
      'đã tin rằng đoạn mã đó đúng. Hãy tập phản xạ <b>xoá rồi mới ghi</b>, kể cả khi biết ' +
      'chắc trường đang bằng 0.</p>' },

    { t: 'cal', kind: 'info', title: 'Kernel gọi những macro này bằng tên khác', x:
      '<p>Bạn sẽ gặp <code>BIT(n)</code> nguyên văn trong <code>include/linux/bits.h</code>, ' +
      'và các anh em của nó: <code>GENMASK(h, l)</code> tạo mặt nạ từ bit <code>l</code> tới ' +
      'bit <code>h</code>, <code>FIELD_GET</code> và <code>FIELD_PREP</code> làm đúng cặp ' +
      'đọc/ghi trường ở trên.</p>' +
      '<p>Bạn tự viết chúng hôm nay không phải để dùng mãi, mà để khi mở mã kernel ở ' +
      '<b>Chặng 07</b> và thấy <code>GENMASK(15, 12)</code>, bạn biết ngay nó là gì thay vì ' +
      'phải tra cứu.</p>' },

    /* ══════════════════════════════════════════════
       8. VOLATILE VÀ STATIC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'volatile: từ khoá cứu bạn khỏi chính trình biên dịch' },

    { t: 'p', x:
      'Trình biên dịch được phép giả định một điều rất hợp lý trên máy tính thông thường: ' +
      '<b>nếu chương trình không ghi vào một biến, giá trị biến đó không đổi</b>. Nhờ giả ' +
      'định này nó tối ưu rất mạnh — đọc biến một lần rồi giữ trong thanh ghi CPU thay vì ' +
      'đọc lại mỗi vòng lặp.' },

    { t: 'p', x:
      'Trong nhúng, giả định đó <b>sai</b>. Một thanh ghi trạng thái đổi giá trị vì phần cứng ' +
      'đổi nó, chứ không phải vì mã của bạn. Một biến cờ đổi vì trình xử lý ngắt vừa chạy. ' +
      'Trình biên dịch không biết những chuyện đó, và kết quả là nó tối ưu mất đoạn mã của ' +
      'bạn. Đây là mã thật cùng với assembly thật mà <code>gcc -O2</code> sinh ra, bạn sẽ ' +
      'tạo lại ở bước 5:' },

    { t: 'table',
      head: ['Mã C', 'Assembly <code>gcc -O2</code> sinh ra', 'Nghĩa là'],
      rows: [
        ['<code>while (*co == 0) n++;</code><br>(<code>co</code> là <code>uint32_t *</code>)',
         '<code>movl (%rdi), %eax</code><br><code>testl %eax, %eax</code><br><code>jne .L2</code><br><code>.L3: jmp .L3</code>',
         '<b>Đọc cờ đúng một lần</b>, rồi nếu bằng 0 thì nhảy vào vòng lặp rỗng <code>jmp</code> chính nó — <b>treo vĩnh viễn</b>'],
        ['<code>while (*co == 0) n++;</code><br>(<code>co</code> là <code>volatile uint32_t *</code>)',
         '<code>.L7:</code><br><code>movl (%rdi), %edx</code><br><code>addl $1, %eax</code><br><code>testl %edx, %edx</code><br><code>je .L7</code>',
         '<b>Đọc lại cờ mỗi vòng lặp</b> — đúng ý bạn. Chỉ khác một từ khoá']
      ]},

    { t: 'cal', kind: 'danger', title: 'Đây là lỗi khó tìm nhất trong nghề nhúng', x:
      '<p>Chú ý hai đặc điểm làm nó nguy hiểm:</p>' +
      '<p><b>Nó không xuất hiện khi build gỡ lỗi.</b> Với <code>-O0</code>, GCC không giữ ' +
      'biến trong thanh ghi nên mã chạy đúng. Bật <code>-O2</code> cho bản phát hành thì ' +
      'thiết bị treo. "Chỉ hỏng ở bản release" gần như luôn là thiếu ' +
      '<code>volatile</code>.</p>' +
      '<p><b>Trình biên dịch không hề sai.</b> Nó tuân thủ chuẩn C tuyệt đối. Người sai là ' +
      'người viết mã, vì đã không nói cho nó biết rằng vùng nhớ này có thể đổi từ bên ngoài.</p>' +
      '<p>Ba chỗ <b>bắt buộc</b> có <code>volatile</code>: con trỏ tới thanh ghi phần cứng; ' +
      'biến chia sẻ với trình xử lý ngắt; biến chia sẻ giữa hai lõi CPU. Ngoài ba chỗ đó, ' +
      'thêm <code>volatile</code> chỉ làm chậm chương trình vô ích.</p>' },

    { t: 'cal', kind: 'warn', title: 'volatile không phải công cụ đồng bộ đa luồng', x:
      '<p>Một hiểu nhầm rất phổ biến: dùng <code>volatile</code> để bảo vệ biến chia sẻ giữa ' +
      'các luồng. Nó <b>không</b> làm được việc đó. <code>volatile</code> chỉ đảm bảo "đọc ' +
      'lại từ bộ nhớ mỗi lần"; nó <b>không</b> đảm bảo thao tác là nguyên tử, cũng không dựng ' +
      'rào cản bộ nhớ cho CPU.</p>' +
      '<p><code>reg++</code> trên biến <code>volatile</code> vẫn là ba lệnh máy đọc–cộng–ghi, ' +
      'và hai luồng vẫn giẫm lên nhau. Muốn đúng, cần <code>atomic_t</code>, ' +
      '<code>spinlock</code> hoặc <code>mutex</code> — <b>Bài 22</b> sẽ làm việc đó tử tế.</p>' },

    { t: 'h2', x: 'static: một từ khoá, ba nghĩa hoàn toàn khác nhau' },

    { t: 'p', x:
      'Đây là từ khoá được đặt tên tệ nhất của C. Nghĩa của nó phụ thuộc vào <b>chỗ bạn đặt ' +
      'nó</b>, và ba nghĩa gần như không liên quan gì tới nhau.' },

    { t: 'table',
      head: ['Đặt ở đâu', 'Nghĩa là gì', 'Vì sao dùng'],
      rows: [
        ['Biến <b>ngoài</b> mọi hàm<br><code>static int call_count;</code>',
         'Chỉ file <code>.c</code> này thấy được. File khác không thể <code>extern</code> tới',
         '<b>Che giấu trạng thái nội bộ.</b> Không có nó, mọi biến toàn cục của mọi file đều nằm chung một không gian tên'],
        ['<b>Hàm</b><br><code>static void write_log(void)</code>',
         'Hàm nội bộ, không xuất ra ngoài file',
         'Giữ giao diện của module gọn. Trình biên dịch cũng dễ nội tuyến (inline) hơn'],
        ['Biến <b>bên trong</b> hàm<br><code>static int private_count = 100;</code>',
         '<b>Sống suốt đời chương trình</b>, không mất khi hàm kết thúc. Chỉ khởi tạo một lần',
         'Giữ trạng thái giữa các lần gọi mà không cần biến toàn cục']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao kernel dùng static ở gần như mọi nơi', x:
      '<p>Kernel Linux là <b>một</b> chương trình duy nhất được liên kết từ hàng chục nghìn ' +
      'file <code>.c</code>. Nếu mỗi file khai báo một biến toàn cục tên <code>count</code>, ' +
      'trình liên kết sẽ gặp hàng nghìn ký hiệu trùng tên và từ chối làm việc.</p>' +
      '<p><code>static</code> giải quyết bằng cách nhốt ký hiệu trong file. Vì thế quy tắc ' +
      'kernel là: <b>mọi thứ đều <code>static</code>, trừ khi có lý do rõ ràng để xuất ra</b>. ' +
      'Bạn sẽ viết đúng như vậy từ Chặng 10, khi mọi hàm trong module driver đều bắt đầu bằng ' +
      '<code>static</code>.</p>' +
      '<p>Ở bước 6 bạn sẽ <b>nhìn thấy</b> sự khác biệt này bằng <code>nm</code>: ký hiệu chữ ' +
      'hoa <code>T</code>/<code>B</code> là toàn cục, chữ thường <code>t</code>/<code>b</code> ' +
      'là cục bộ. Rồi bạn sẽ cố tình <code>extern</code> tới một biến <code>static</code> và ' +
      'nhận về lỗi liên kết — bằng chứng cứng rằng nó thật sự bị che.</p>' },

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: bắt trình biên dịch nói ra sự thật' },

    { t: 'p', x:
      'Sáu bước. Mỗi bước lấy một mục lý thuyết ở trên và biến nó thành một con số bạn tự đo ' +
      'được. <b>Bước 2 là bước quan trọng nhất</b>: ở đó bạn sẽ cố tình làm cho ' +
      '<code>gcc</code> từ chối biên dịch, và lời từ chối đó chính là bài học.' },

    { t: 'cal', kind: 'info', title: 'Trước khi bắt đầu', x:
      '<p>Mọi lệnh chạy trong <b>WSL</b>. Bạn cần ba trình biên dịch, cả ba đã có sẵn trên máy ' +
      'này: <code>gcc</code> (cho x86_64), <code>aarch64-linux-gnu-gcc</code> (ARM 64-bit) và ' +
      '<code>arm-linux-gnueabihf-gcc</code> (ARM 32-bit).</p>' +
      '<p>Kiểm tra nhanh bằng <code>gcc --version</code>. Máy viết tài liệu này dùng GCC ' +
      '<b>15.2.0</b>; bản của bạn khác vài số cũng không sao, kết quả không đổi.</p>' +
      '<p>Tạo sẵn thư mục làm việc — nhớ đặt trong <code>$HOME</code> chứ không phải ' +
      '<code>/mnt/c</code>, vì lý do bạn đã đo ở <b>Bài 3</b>: ghi file ở đó chậm hơn ' +
      '<b>52 lần</b>.</p>' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/bai14 && cd ~/bai14\n' +
      'pwd' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Bước 1 — Đo kích thước kiểu và thứ tự byte', blocks: [
        { t: 'p', x:
          'Đừng tin bảng ở phần lý thuyết. Hãy tự hỏi trình biên dịch. Tạo file đầu tiên bằng ' +
          '<b>here-doc</b> — đúng kỹ thuật bạn đã học ở <b>Bài 13</b>.' },

        { t: 'code', where: 'wsl', name: 'tạo types.c', code:
          'cat > types.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("char        %2zu byte\\n", sizeof(char));\n' +
          '    printf("short       %2zu byte\\n", sizeof(short));\n' +
          '    printf("int         %2zu byte\\n", sizeof(int));\n' +
          '    printf("long        %2zu byte\\n", sizeof(long));\n' +
          '    printf("long long   %2zu byte\\n", sizeof(long long));\n' +
          '    printf("void *      %2zu byte\\n", sizeof(void *));\n' +
          '    printf("size_t      %2zu byte\\n", sizeof(size_t));\n' +
          '    printf("---\\n");\n' +
          '    printf("int8_t      %2zu byte\\n", sizeof(int8_t));\n' +
          '    printf("uint16_t    %2zu byte\\n", sizeof(uint16_t));\n' +
          '    printf("uint32_t    %2zu byte\\n", sizeof(uint32_t));\n' +
          '    printf("uint64_t    %2zu byte\\n", sizeof(uint64_t));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall -Wextra -o types types.c\n' +
          './types' },

        { t: 'code', where: 'out', nocopy: true, code:
          'char         1 byte\n' +
          'short        2 byte\n' +
          'int          4 byte\n' +
          'long         8 byte\n' +
          'long long    8 byte\n' +
          'void *       8 byte\n' +
          'size_t       8 byte\n' +
          '---\n' +
          'int8_t       1 byte\n' +
          'uint16_t     2 byte\n' +
          'uint32_t     4 byte\n' +
          'uint64_t     8 byte' },

        { t: 'cmdx', cmd: 'gcc -Wall -Wextra -o types types.c', title: 'Hai cờ nên gõ ở mọi lần biên dịch',
          rows: [
            ['<code>-Wall</code>', 'Bật nhóm cảnh báo <b>thường gặp và gần như luôn là lỗi thật</b>', 'Tên gợi ý "all" nhưng thực ra chưa phải tất cả'],
            ['<code>-Wextra</code>', 'Bật thêm một nhóm nữa, trong đó có cảnh báo về tham số không dùng và so sánh có dấu / không dấu', 'Cặp <code>-Wall -Wextra</code> là mặc định của mọi dự án nghiêm túc'],
            ['<code>-o types</code>', 'Đặt tên file kết quả', 'Không có nó thì GCC đặt tên <code>a.out</code>, di sản từ năm 1970'],
            ['<code>%zu</code>', 'Định dạng in dành riêng cho <code>size_t</code>', 'Dùng <code>%d</code> ở đây là sai và <code>-Wall</code> sẽ mắng bạn']
          ]},

        { t: 'cal', kind: 'info', title: 'Đối chiếu số đo với bảng lý thuyết', x:
          '<p>Hai con số đáng chú ý nhất trong bảy dòng đầu: <code>long</code> ra <b>8</b> byte ' +
          'và <code>void *</code> cũng ra <b>8</b> byte. Đó chính xác là chữ ký của mô hình ' +
          '<b>LP64</b> mà mục "Cái bẫy long" ở trên đã cảnh báo — máy viết tài liệu này là ' +
          'x86_64 nên rơi đúng vào trường hợp đó. Nếu bạn biên dịch lại đúng file này bằng ' +
          '<code>arm-linux-gnueabihf-gcc</code>, hai con số <b>8</b> đó sẽ tụt xuống <b>4</b> — ' +
          'đó là điều bạn sẽ ép <code>gcc</code> tự xác nhận ở bước 2.</p>' +
          '<p>Bốn dòng cuối — <code>int8_t</code> đến <code>uint64_t</code> — không đổi dù chạy ' +
          'trên kiến trúc nào, đúng như bảng lý thuyết đã nói. Đây là bằng chứng đầu tiên cho ' +
          'lý do bạn nên dùng <code>uint32_t</code> thay vì <code>long</code> khi mô tả một ' +
          'thanh ghi phần cứng: nó không có gì để "tụt xuống" cả.</p>' },

        { t: 'p', x:
          'Giờ tới thứ tự byte — ta lấy giá trị <code>0x12345678</code> vì bốn byte của nó khác ' +
          'nhau hết, nên nhìn là biết ngay chiều xếp.' },

        { t: 'code', where: 'wsl', name: 'tạo endian.c', code:
          'cat > endian.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    uint32_t x = 0x12345678;\n' +
          '    unsigned char *p = (unsigned char *)&x;\n' +
          '\n' +
          '    printf("value    : 0x%08X\\n", x);\n' +
          '    printf("byte 0..3: %02X %02X %02X %02X\\n", p[0], p[1], p[2], p[3]);\n' +
          '\n' +
          '    if (p[0] == 0x78)\n' +
          '        printf("result   : little-endian\\n");\n' +
          '    else\n' +
          '        printf("result   : big-endian\\n");\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -o endian endian.c && ./endian' },

        { t: 'code', where: 'out', nocopy: true, code:
          'value    : 0x12345678\n' +
          'byte 0..3: 78 56 34 12\n' +
          'result   : little-endian' },

        { t: 'cal', kind: 'info', title: 'Bốn byte in ra đúng như hình vẽ đã dự đoán', x:
          '<p>Dòng <code>byte 0..3: 78 56 34 12</code> là đúng thứ tự đã vẽ ở hình trên: byte ' +
          'có trọng số thấp nhất, <code>78</code>, nằm ở địa chỉ <code>+0</code> — tức ' +
          '<code>p[0]</code>. Chương trình không đoán, nó <b>đo trực tiếp</b>: điều kiện ' +
          '<code>if (p[0] == 0x78)</code> đúng nên in ra <code>little-endian</code>, khớp với ' +
          'ô "LITTLE-ENDIAN" của hình vẽ chứ không phải ô "BIG-ENDIAN".</p>' +
          '<p>Nếu máy này là big-endian, ba dòng trên sẽ đổi thành ' +
          '<code>byte 0..3: 12 34 56 78</code> và <code>result: big-endian</code> — đúng thứ tự ' +
          'ở nửa dưới của hình. Đây là lần đầu bạn tự tay đo được thứ tự byte thay vì đọc nó ' +
          'trong bảng.</p>' },

        { t: 'cal', kind: 'why', title: 'Vì sao ép kiểu sang unsigned char * là hợp lệ', x:
          '<p>Chuẩn C nói rằng ép con trỏ kiểu này sang kiểu khác rồi đọc thường là ' +
          '<b>hành vi không xác định</b> — trừ đúng một ngoại lệ: ép sang ' +
          '<code>char *</code> hoặc <code>unsigned char *</code> thì <b>luôn</b> hợp lệ, và ' +
          'bạn được quyền nhìn từng byte của bất kỳ đối tượng nào.</p>' +
          '<p>Đây là cửa hậu chính thức mà chuẩn C mở ra để bạn kiểm tra biểu diễn nhị phân ' +
          'của dữ liệu. Bạn sẽ dùng lại nó rất nhiều: in nội dung một gói tin, so sánh hai ' +
          'cấu trúc theo byte, đổ hex một vùng nhớ.</p>' },

        { t: 'p', x:
          'Câu hỏi cuối cùng của bước này: có cách nào biết endianness mà <b>không cần chạy ' +
          'chương trình</b> không? Có — hỏi thẳng bộ tiền xử lý.' },

        { t: 'code', where: 'wsl', code:
          'echo | gcc -dM -E - | grep -E \'__BYTE_ORDER__|__ORDER_LITTLE|__ORDER_BIG\'\n' +
          'lscpu | grep -i \'byte order\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '#define __ORDER_LITTLE_ENDIAN__ 1234\n' +
          '#define __FLOAT_WORD_ORDER__ __ORDER_LITTLE_ENDIAN__\n' +
          '#define __ORDER_BIG_ENDIAN__ 4321\n' +
          '#define __BYTE_ORDER__ __ORDER_LITTLE_ENDIAN__\n' +
          'Byte Order:                              Little Endian' },

        { t: 'cal', kind: 'info', title: 'Hai bằng chứng độc lập, cùng một câu trả lời', x:
          '<p>Nhìn kỹ dòng thứ tư: <code>__BYTE_ORDER__</code> được định nghĩa <b>bằng chính ' +
          'tên</b> <code>__ORDER_LITTLE_ENDIAN__</code>, không phải bằng số <code>1234</code> ' +
          'trực tiếp — số <code>1234</code> chỉ xuất hiện ở dòng định nghĩa của ' +
          '<code>__ORDER_LITTLE_ENDIAN__</code> phía trên. Tài liệu tiền xử lý của GCC dạy đúng ' +
          'cách dùng cặp macro này để kiểm tra thứ tự byte: viết ' +
          '<code>#if __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__</code>, so theo <b>tên</b> chứ ' +
          'không so theo số — mã đọc được, và không ai cần nhớ 1234 nghĩa là gì.</p>' +
          '<p>Dòng cuối, <code>lscpu</code>, hỏi thẳng nhân Linux chứ không hỏi trình biên dịch, ' +
          'và trả lời <b>Little Endian</b> — cùng kết luận với chương trình <code>endian.c</code> ' +
          'bạn vừa chạy. Ba cách hỏi hoàn toàn khác nhau — chạy thử, hỏi tiền xử lý, hỏi nhân — ' +
          'cho đúng một câu trả lời.</p>' },

        { t: 'cmdx', cmd: 'echo | gcc -dM -E -', title: 'Một lệnh rất đáng nhớ',
          rows: [
            ['<code>echo |</code>', 'Đưa một dòng trống vào đầu vào chuẩn', 'GCC cần <i>một cái gì đó</i> để xử lý, nội dung không quan trọng'],
            ['<code>-E</code>', 'Chỉ chạy <b>giai đoạn tiền xử lý</b> rồi dừng', 'Đây là giai đoạn 1 trong 4 giai đoạn mà <b>Bài 15</b> sẽ mổ xẻ'],
            ['<code>-dM</code>', 'Thay vì in mã nguồn, in <b>mọi macro đang được định nghĩa</b>', 'Trên máy này ra hơn 400 dòng — đó là toàn bộ những gì GCC "biết sẵn" về kiến trúc đích'],
            ['<code>-</code> cuối cùng', 'Đọc mã nguồn từ đầu vào chuẩn thay vì từ file', 'Quy ước chung của rất nhiều lệnh Unix — đầu vào chuẩn là khái niệm bạn đã học ở Bài 10']
          ]},

        { t: 'cal', kind: 'tip', title: 'Mẹo dùng được ngay từ Chặng 04', x:
          '<p>Thay <code>gcc</code> bằng <code>aarch64-linux-gnu-gcc</code> trong lệnh trên, ' +
          'bạn sẽ thấy danh sách macro <b>khác hẳn</b> — vì đó là tập macro mô tả ARM64 chứ ' +
          'không phải x86_64. Đây là cách nhanh nhất để trả lời câu hỏi "trình biên dịch chéo ' +
          'này thật sự đang nhắm vào cái gì".</p>' +
          '<p>Thử ngay: <code>aarch64-linux-gnu-gcc -dM -E - &lt; /dev/null | grep -c \'\'</code> ' +
          'để đếm số macro, rồi <code>| grep -i aarch64</code> để xem các macro đặc trưng.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Bước 2 — Bắt gcc từ chối biên dịch, và cảm ơn nó vì điều đó', blocks: [
        { t: 'p', x:
          'Bảng lý thuyết nói <code>long</code> là 4 byte trên ARM 32-bit. Thay vì tin, ta viết ' +
          'một file <b>khẳng định điều ngược lại</b> rồi đưa cho ba trình biên dịch. Trình nào ' +
          'thấy khẳng định sai sẽ từ chối làm việc.' },

        { t: 'code', where: 'wsl', name: 'tạo sizes.c', code:
          'cat > sizes.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '\n' +
          '_Static_assert(sizeof(long) == 8,     "long is NOT 8 bytes on this architecture");\n' +
          '_Static_assert(sizeof(void *) == 8,   "pointer is NOT 8 bytes on this architecture");\n' +
          '_Static_assert(sizeof(uint32_t) == 4, "uint32_t is not 4 bytes");\n' +
          '\n' +
          'int main(void) { return 0; }\n' +
          'EOF' },

        { t: 'code', where: 'wsl', code:
          'gcc -c sizes.c -o /dev/null && echo "x86_64: all three assertions hold"\n' +
          'aarch64-linux-gnu-gcc -c sizes.c -o /dev/null && echo "aarch64: all three assertions hold"\n' +
          'arm-linux-gnueabihf-gcc -c sizes.c -o /dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'x86_64: all three assertions hold\n' +
          'aarch64: all three assertions hold\n' +
          'sizes.c:3:1: error: static assertion failed: "long is NOT 8 bytes on this architecture"\n' +
          '    3 | _Static_assert(sizeof(long) == 8,     "long is NOT 8 bytes on this architecture");\n' +
          '      | ^~~~~~~~~~~~~~\n' +
          'sizes.c:4:1: error: static assertion failed: "pointer is NOT 8 bytes on this architecture"\n' +
          '    4 | _Static_assert(sizeof(void *) == 8,   "pointer is NOT 8 bytes on this architecture");\n' +
          '      | ^~~~~~~~~~~~~~' },

        { t: 'cal', kind: 'info', title: 'Đọc kỹ kết quả — nó nói ba điều cùng lúc', x:
          '<p><b>Một:</b> hai lỗi, không phải ba. Khẳng định về <code>uint32_t</code> ' +
          '<b>không</b> báo lỗi trên bất kỳ kiến trúc nào. Đó là toàn bộ luận điểm của mục ' +
          '"bỏ <code>int</code> đi", giờ đã thành bằng chứng.</p>' +
          '<p><b>Hai:</b> x86_64 và ARM64 hoàn toàn im lặng — cả hai đều là LP64. Nếu bạn chỉ ' +
          'thử trên hai kiến trúc này, bạn sẽ không bao giờ phát hiện ra vấn đề.</p>' +
          '<p><b>Ba:</b> lỗi xảy ra <b>lúc biên dịch</b>, không phải lúc chạy. Không cần ' +
          'board, không cần QEMU, không cần chạy thử. Trình biên dịch biết ABI của kiến trúc ' +
          'đích và trả lời ngay.</p>' },

        { t: 'p', x:
          'Đảo ngược khẳng định để xác nhận ARM 32-bit thật sự dùng ILP32:' },

        { t: 'code', where: 'wsl', code:
          'cat > sizes2.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '_Static_assert(sizeof(long) == 4, "long is 4 bytes");\n' +
          '_Static_assert(sizeof(void *) == 4, "pointer is 4 bytes");\n' +
          '_Static_assert(sizeof(uint32_t) == 4, "uint32_t is always 4 bytes");\n' +
          'int main(void) { return 0; }\n' +
          'EOF\n' +
          'arm-linux-gnueabihf-gcc -c sizes2.c -o /dev/null && echo "armhf: long=4, pointer=4, uint32_t=4"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'armhf: long=4, pointer=4, uint32_t=4' },

        { t: 'cmdx', cmd: '_Static_assert(condition, "message")', title: 'Một công cụ bạn nên dùng nhiều hơn bạn nghĩ',
          rows: [
            ['Chạy lúc nào', '<b>Lúc biên dịch</b>, không sinh ra một lệnh máy nào', 'Khác hoàn toàn <code>assert()</code> của <code>&lt;assert.h&gt;</code> vốn chạy lúc thực thi'],
            ['Điều kiện phải là', 'Biểu thức hằng — <code>sizeof</code>, <code>_Alignof</code>, số học trên hằng', 'Không dùng được với biến'],
            ['Giá nó phải trả', '<b>Bằng không.</b> Không tốn byte nào trong file kết quả', 'Vì thế dùng thoải mái kể cả trên chip có 32 KB flash'],
            ['Tên gọi khác', '<code>static_assert</code> nếu include <code>&lt;assert.h&gt;</code>; từ C23 thì dùng thẳng được', 'Kernel có <code>BUILD_BUG_ON()</code> làm đúng việc này']
          ]},

        { t: 'cal', kind: 'tip', title: 'Thói quen đáng tập: khẳng định bố cục struct', x:
          '<p>Khi bạn viết một <code>struct</code> mô tả gói tin hoặc cấu trúc trên flash, hãy ' +
          'đặt ngay dưới nó:</p>' +
          '<p><code>_Static_assert(sizeof(struct packet) == 16, "packet layout has ' +
          'changed");</code></p>' +
          '<p>Ngày nào đó có người thêm một trường vào giữa, bản build sẽ <b>gãy ngay lập ' +
          'tức</b> kèm thông báo rõ ràng — thay vì thiết bị ngoài hiện trường bắt đầu gửi dữ ' +
          'liệu rác và không ai hiểu vì sao. Đây là một trong những dòng mã có tỉ lệ ' +
          'lợi ích trên công sức cao nhất mà bạn có thể viết.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Bước 3 — Con trỏ: chứng minh ba điều gây tranh cãi', blocks: [
        { t: 'p', x:
          'Ba câu hỏi mà người mới hay trả lời sai: hàm có sửa được biến của người gọi không, ' +
          '<code>p + 1</code> nhảy bao nhiêu byte, và mảng có phải con trỏ không. Một chương ' +
          'trình trả lời cả ba.' },

        { t: 'code', where: 'wsl', name: 'tạo control_flow.c', code:
          'cat > control_flow.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'static void swap_wrong(int a, int b) { int t = a; a = b; b = t; }\n' +
          'static void swap_right(int *a, int *b) { int t = *a; *a = *b; *b = t; }\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    int x = 1, y = 2;\n' +
          '\n' +
          '    swap_wrong(x, y);\n' +
          '    printf("after swap_wrong: x=%d y=%d\\n", x, y);\n' +
          '    swap_right(&x, &y);\n' +
          '    printf("after swap_right: x=%d y=%d\\n", x, y);\n' +
          '\n' +
          '    uint8_t  *p8  = (uint8_t  *)0x1000;\n' +
          '    uint32_t *p32 = (uint32_t *)0x1000;\n' +
          '    printf("p8  = %p   p8  + 1 = %p\\n", (void *)p8,  (void *)(p8  + 1));\n' +
          '    printf("p32 = %p   p32 + 1 = %p\\n", (void *)p32, (void *)(p32 + 1));\n' +
          '\n' +
          '    int arr[5] = { 10, 20, 30, 40, 50 };\n' +
          '    printf("arr[2] = %d, *(arr + 2) = %d\\n", arr[2], *(arr + 2));\n' +
          '    printf("sizeof(arr) = %zu, sizeof(&arr[0]) = %zu\\n",\n' +
          '           sizeof(arr), sizeof(&arr[0]));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o control_flow control_flow.c && ./control_flow' },

        { t: 'code', where: 'out', nocopy: true, code:
          'after swap_wrong: x=1 y=2\n' +
          'after swap_right: x=2 y=1\n' +
          'p8  = 0x1000   p8  + 1 = 0x1001\n' +
          'p32 = 0x1000   p32 + 1 = 0x1004\n' +
          'arr[2] = 30, *(arr + 2) = 30\n' +
          'sizeof(arr) = 20, sizeof(&arr[0]) = 8' },

        { t: 'cal', kind: 'info', title: 'Đọc sáu dòng kết quả', x:
          '<p><b>Dòng 1:</b> <code>swap_wrong</code> chạy xong mà <code>x</code> và ' +
          '<code>y</code> không đổi. Hàm đã đổi chỗ hai bản sao rồi vứt đi. Đây là ' +
          '<i>truyền theo giá trị</i>, và C <b>chỉ có</b> cơ chế này.</p>' +
          '<p><b>Dòng 2:</b> truyền địa chỉ thì sửa được. Không có phép màu — hàm vẫn nhận bản ' +
          'sao, nhưng là bản sao của <i>địa chỉ</i>, mà địa chỉ thì trỏ về đúng ô nhớ gốc.</p>' +
          '<p><b>Dòng 3–4:</b> cùng xuất phát từ <code>0x1000</code>, cộng 1 ra ' +
          '<code>0x1001</code> và <code>0x1004</code>. Trình biên dịch nhân ngầm với ' +
          '<code>sizeof</code> của kiểu.</p>' +
          '<p><b>Dòng 5–6:</b> <code>arr[2]</code> và <code>*(arr + 2)</code> bằng nhau — ' +
          'nhưng <code>sizeof</code> ra <b>20</b> và <b>8</b>. Mảng và con trỏ là hai thứ khác ' +
          'nhau, chỉ giống nhau ở một số ngữ cảnh.</p>' },

        { t: 'cal', kind: 'why', title: 'Vì sao %p phải kèm ép kiểu (void *)', x:
          '<p><code>%p</code> theo chuẩn C nhận <b>đúng một kiểu</b>: <code>void *</code>. Đưa ' +
          'thẳng <code>uint8_t *</code> vào là hành vi không xác định — trên thực tế nó chạy ' +
          'được ở mọi máy hiện đại, nhưng <code>-Wall</code> vẫn sẽ cảnh báo, và cảnh báo đó ' +
          'đúng.</p>' +
          '<p>Điểm rút ra không nằm ở <code>%p</code>. Nó nằm ở chỗ: trong C, <b>"chạy được" ' +
          'không đồng nghĩa với "đúng"</b>. Rất nhiều mã nhúng chạy êm nhiều năm rồi hỏng khi ' +
          'đổi trình biên dịch, vì nó dựa vào hành vi không xác định mà tình cờ được ưu ái. ' +
          'Hãy để <code>-Wall -Wextra</code> nói cho bạn biết trước.</p>' }
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Bước 4 — Đếm byte đệm và tiết kiệm 4000 byte bằng cách đổi thứ tự', blocks: [
        { t: 'p', x:
          'Ba <code>struct</code> chứa <b>đúng</b> ba trường như nhau, chỉ khác thứ tự khai ' +
          'báo và một thuộc tính. <code>offsetof</code> cho ta biết mỗi trường thật sự nằm ở ' +
          'byte thứ mấy.' },

        { t: 'code', where: 'wsl', name: 'tạo alignment.c', code:
          'cat > alignment.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <stddef.h>\n' +
          '\n' +
          'struct bad_layout {\n' +
          '    uint8_t  a;\n' +
          '    uint32_t b;\n' +
          '    uint8_t  c;\n' +
          '};\n' +
          '\n' +
          'struct good_layout {\n' +
          '    uint32_t b;\n' +
          '    uint8_t  a;\n' +
          '    uint8_t  c;\n' +
          '};\n' +
          '\n' +
          'struct __attribute__((packed)) packed_layout {\n' +
          '    uint8_t  a;\n' +
          '    uint32_t b;\n' +
          '    uint8_t  c;\n' +
          '};\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("struct bad_layout    : sizeof=%2zu  align=%zu  offset a=%zu b=%zu c=%zu\\n",\n' +
          '           sizeof(struct bad_layout), _Alignof(struct bad_layout),\n' +
          '           offsetof(struct bad_layout, a), offsetof(struct bad_layout, b), offsetof(struct bad_layout, c));\n' +
          '    printf("struct good_layout   : sizeof=%2zu  align=%zu  offset b=%zu a=%zu c=%zu\\n",\n' +
          '           sizeof(struct good_layout), _Alignof(struct good_layout),\n' +
          '           offsetof(struct good_layout, b), offsetof(struct good_layout, a), offsetof(struct good_layout, c));\n' +
          '    printf("struct packed_layout : sizeof=%2zu  align=%zu  offset a=%zu b=%zu c=%zu\\n",\n' +
          '           sizeof(struct packed_layout), _Alignof(struct packed_layout),\n' +
          '           offsetof(struct packed_layout, a), offsetof(struct packed_layout, b), offsetof(struct packed_layout, c));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o alignment alignment.c && ./alignment' },

        { t: 'code', where: 'out', nocopy: true, code:
          'struct bad_layout    : sizeof=12  align=4  offset a=0 b=4 c=8\n' +
          'struct good_layout   : sizeof= 8  align=4  offset b=0 a=4 c=5\n' +
          'struct packed_layout : sizeof= 6  align=1  offset a=0 b=1 c=5' },

        { t: 'cmdx', cmd: 'Đọc ba dòng kết quả', title: 'Từng con số nói gì',
          rows: [
            ['<code>bad_layout</code>: <code>a=0 b=4 c=8</code>, size 12', '<code>a</code> chiếm byte 0, rồi <b>3 byte đệm</b> để <code>b</code> rơi vào offset 4', 'Sau <code>c</code> ở offset 8 lại thêm <b>3 byte đệm</b> cho tổng chia hết cho 4. Đệm 6/12 = <b>50% lãng phí</b>'],
            ['<code>good_layout</code>: <code>b=0 a=4 c=5</code>, size 8', 'Trường lớn nhất khai báo trước nên <b>không cần đệm giữa</b>', 'Chỉ còn 2 byte đệm cuối. Cùng dữ liệu, <b>ít hơn 4 byte</b>'],
            ['<code>packed_layout</code>: <code>a=0 b=1 c=5</code>, size 6', '<code>packed</code> bỏ hết đệm — 6 byte đúng bằng tổng dữ liệu', '<b>Nhưng</b> <code>b</code> nằm ở offset 1, không chia hết cho 4: truy cập lệch'],
            ['Cột <code>align</code>', 'Yêu cầu căn lề của cả struct', '<code>bad_layout</code> và <code>good_layout</code> cần địa chỉ chia hết cho 4; <code>packed_layout</code> đặt ở đâu cũng được, đó chính là điều nguy hiểm']
          ]},

        { t: 'p', x:
          'Bốn byte nghe không đáng gì. Hãy nhân lên với số phần tử của một mảng thật:' },

        { t: 'code', where: 'wsl', code:
          'cat > array_savings.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          'struct bad_layout { uint8_t a; uint32_t b; uint8_t c; };\n' +
          'struct good_layout { uint32_t b; uint8_t a; uint8_t c; };\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("1000 x struct bad_layout  = %zu byte\\n", sizeof(struct bad_layout) * 1000);\n' +
          '    printf("1000 x struct good_layout = %zu byte\\n", sizeof(struct good_layout) * 1000);\n' +
          '    printf("savings                   = %zu byte\\n",\n' +
          '           sizeof(struct bad_layout) * 1000 - sizeof(struct good_layout) * 1000);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -o array_savings array_savings.c && ./array_savings' },

        { t: 'code', where: 'out', nocopy: true, code:
          '1000 x struct bad_layout  = 12000 byte\n' +
          '1000 x struct good_layout = 8000 byte\n' +
          'savings                   = 4000 byte' },

        { t: 'cal', kind: 'why', title: '4000 byte đổi lấy việc đổi chỗ hai dòng khai báo', x:
          '<p>Trên máy này, 4 KB là không đáng kể. Trên một vi điều khiển có <b>64 KB RAM</b> — ' +
          'cấu hình rất bình thường trong công nghiệp — đó là <b>6% toàn bộ bộ nhớ</b>, đổi lấy ' +
          'công sức bằng không.</p>' +
          '<p>Và tiết kiệm RAM mới là phần nhỏ. Struct nhỏ hơn nghĩa là nhiều phần tử vừa hơn ' +
          'trong một dòng cache, nghĩa là vòng lặp duyệt mảng chạy nhanh hơn. Đây là lý do ' +
          'thật sự khiến các lập trình viên kernel để tâm tới bố cục struct.</p>' +
          '<p><b>Quy tắc mang theo suốt đời:</b> khai báo trường từ <b>lớn tới nhỏ</b>. Con ' +
          'trỏ và <code>uint64_t</code> trước, rồi <code>uint32_t</code>, rồi ' +
          '<code>uint16_t</code>, cuối cùng là <code>uint8_t</code> và <code>bool</code>. Đơn ' +
          'giản vậy thôi, và nó xử lý gần hết mọi trường hợp.</p>' },

        { t: 'cal', kind: 'warn', title: 'Đừng đảo thứ tự struct do người khác định nghĩa', x:
          '<p>Quy tắc trên chỉ áp dụng cho struct <b>của bạn</b>. Nếu struct mô tả một định ' +
          'dạng bên ngoài — header gói tin, cấu trúc trên đĩa, thanh ghi phần cứng — thì thứ ' +
          'tự trường là <b>đặc tả</b>, đổi là hỏng.</p>' +
          '<p>Cách phân biệt rất đơn giản: hỏi "nếu tôi đổi thứ tự, có ai ở đầu bên kia đọc ' +
          'sai không?". Có thì đừng đụng vào, và hãy đặt một <code>_Static_assert</code> ở ' +
          'dưới để chặn người khác đụng vào.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Bước 5 — Điều khiển thanh ghi: macro bit và union', blocks: [
        { t: 'p', x:
          'Chưa có phần cứng thật, nhưng ta mô phỏng được hoàn hảo: một biến ' +
          '<code>uint32_t</code> đóng vai thanh ghi, và ta in nó ra dạng nhị phân sau mỗi thao ' +
          'tác để <b>nhìn thấy</b> từng bit đổi.' },

        { t: 'code', where: 'wsl', name: 'tạo bit.c', code:
          'cat > bit.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          '#define BIT(n)          (1U << (n))\n' +
          '#define SET(reg, n)     ((reg) |=  BIT(n))\n' +
          '#define CLEAR(reg, n)   ((reg) &= ~BIT(n))\n' +
          '#define TOGGLE(reg, n)  ((reg) ^=  BIT(n))\n' +
          '#define TEST(reg, n)    (((reg) >> (n)) & 1U)\n' +
          '\n' +
          'static void print_binary(const char *label, uint32_t v)\n' +
          '{\n' +
          '    printf("%-10s 0x%08X  ", label, v);\n' +
          '    for (int i = 31; i >= 0; i--) {\n' +
          '        putchar(((v >> i) & 1U) ? \'1\' : \'0\');\n' +
          '        if (i % 8 == 0 && i)\n' +
          '            putchar(\' \');\n' +
          '    }\n' +
          '    putchar(\'\\n\');\n' +
          '}\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    uint32_t reg = 0;\n' +
          '\n' +
          '    print_binary("initial", reg);\n' +
          '    SET(reg, 3);     print_binary("set bit3", reg);\n' +
          '    SET(reg, 12);    print_binary("set bit12", reg);\n' +
          '    TOGGLE(reg, 3);  print_binary("toggle bit3", reg);\n' +
          '    CLEAR(reg, 12);  print_binary("clear bit12", reg);\n' +
          '\n' +
          '    reg = 0x0000FF00;\n' +
          '    print_binary("new reg", reg);\n' +
          '    printf("bit 8  = %u\\n", TEST(reg, 8));\n' +
          '    printf("bit 7  = %u\\n", TEST(reg, 7));\n' +
          '\n' +
          '    reg = 0xABCD1234;\n' +
          '    uint32_t field = (reg >> 12) & 0xF;\n' +
          '    printf("4-bit field at position 12 of 0x%08X = 0x%X\\n", reg, field);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o bit bit.c && ./bit' },

        { t: 'code', where: 'out', nocopy: true, code:
          'initial    0x00000000  00000000 00000000 00000000 00000000\n' +
          'set bit3   0x00000008  00000000 00000000 00000000 00001000\n' +
          'set bit12  0x00001008  00000000 00000000 00010000 00001000\n' +
          'toggle bit3 0x00001000  00000000 00000000 00010000 00000000\n' +
          'clear bit12 0x00000000  00000000 00000000 00000000 00000000\n' +
          'new reg    0x0000FF00  00000000 00000000 11111111 00000000\n' +
          'bit 8  = 1\n' +
          'bit 7  = 0\n' +
          '4-bit field at position 12 of 0xABCD1234 = 0x1' },

        { t: 'cal', kind: 'info', title: 'Đối chiếu cột hex với cột nhị phân', x:
          '<p>Dòng <code>set bit12</code> cho <code>0x00001008</code>. Kiểm lại: bit 12 và ' +
          'bit 3 cùng bật, <code>2^12 + 2^3 = 4096 + 8 = 4104 = 0x1008</code>. Đúng.</p>' +
          '<p><b>Điểm quan trọng nhất:</b> ở dòng <code>set bit12</code>, bit 3 <b>vẫn còn</b>. ' +
          'Phép <code>|=</code> chỉ thêm chứ không xoá. Đó chính là tính chất mà điều khiển ' +
          'thanh ghi cần: bật chân GPIO số 12 mà không được đụng tới 31 chân kia, vì chúng ' +
          'đang điều khiển những thứ khác trên board.</p>' +
          '<p>Dòng cuối: <code>0xABCD1234</code>, mỗi chữ số hex là <b>4 bit</b>, nên trường ' +
          '4 bit tại vị trí 12 chính là chữ số hex thứ tư từ phải sang — số <code>1</code>. ' +
          'Đây là lý do dân nhúng đọc hex nhanh hơn đọc thập phân: <b>ranh giới hex trùng ' +
          'ranh giới bit</b>.</p>' },

        { t: 'p', x:
          'Bây giờ là <code>union</code>: cũng bốn byte đó, nhưng nhìn theo ba cách.' },

        { t: 'code', where: 'wsl', name: 'tạo union_demo.c', code:
          'cat > union_demo.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'union hwreg {\n' +
          '    uint32_t raw;\n' +
          '    uint8_t  byte[4];\n' +
          '    struct {\n' +
          '        uint32_t enable   : 1;\n' +
          '        uint32_t mode     : 3;\n' +
          '        uint32_t speed    : 4;\n' +
          '        uint32_t reserved : 24;\n' +
          '    } fields;\n' +
          '};\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    union hwreg r;\n' +
          '\n' +
          '    printf("sizeof(union) = %zu byte\\n", sizeof(r));\n' +
          '\n' +
          '    r.raw = 0x000000A5;\n' +
          '    printf("raw     = 0x%08X\\n", r.raw);\n' +
          '    printf("byte[]  = %02X %02X %02X %02X\\n", r.byte[0], r.byte[1], r.byte[2], r.byte[3]);\n' +
          '    printf("enable  = %u\\n", r.fields.enable);\n' +
          '    printf("mode    = %u\\n", r.fields.mode);\n' +
          '    printf("speed   = %u\\n", r.fields.speed);\n' +
          '\n' +
          '    r.fields.speed = 0xF;\n' +
          '    printf("after setting speed=0xF -> raw = 0x%08X\\n", r.raw);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o union_demo union_demo.c && ./union_demo' },

        { t: 'code', where: 'out', nocopy: true, code:
          'sizeof(union) = 4 byte\n' +
          'raw     = 0x000000A5\n' +
          'byte[]  = A5 00 00 00\n' +
          'enable  = 1\n' +
          'mode    = 2\n' +
          'speed   = 10\n' +
          'after setting speed=0xF -> raw = 0x000000F5' },

        { t: 'cal', kind: 'info', title: 'Kiểm lại bằng tay để tin vào kết quả', x:
          '<p><code>0xA5</code> = <code>1010 0101</code> ở dạng nhị phân. Đọc từ bit 0 lên:</p>' +
          '<p><code>enable</code> = bit 0 = <b>1</b>. ✓<br>' +
          '<code>mode</code> = bit 1–3 = <code>010</code> = <b>2</b>. ✓<br>' +
          '<code>speed</code> = bit 4–7 = <code>1010</code> = <b>10</b>. ✓</p>' +
          '<p>Ghi <code>speed = 0xF</code> tức là đặt bit 4–7 thành <code>1111</code>, biến ' +
          'nửa cao của byte thấp từ <code>A</code> thành <code>F</code>: <code>0xA5</code> → ' +
          '<code>0xF5</code>. ✓</p>' +
          '<p><code>byte[] = A5 00 00 00</code> là <b>bằng chứng thứ hai</b> cho tính ' +
          'little-endian: byte có trọng số thấp nhất nằm ở địa chỉ thấp nhất. Nếu máy là ' +
          'big-endian, dòng này sẽ là <code>00 00 00 A5</code>.</p>' },

        { t: 'cal', kind: 'tip', title: 'Một câu đáng nhớ về union', x:
          '<p><code>struct</code> trả lời câu hỏi "<b>và</b>" — đối tượng này có a <i>và</i> b ' +
          '<i>và</i> c.<br>' +
          '<code>union</code> trả lời câu hỏi "<b>hoặc</b>" — vùng nhớ này chứa a <i>hoặc</i> ' +
          'b <i>hoặc</i> c, tuỳ ngữ cảnh.</p>' +
          '<p>Hệ quả: <code>union</code> <b>không nhớ</b> nó đang chứa cái gì. Trách nhiệm đó ' +
          'là của bạn, và đó chính là chỗ nó nguy hiểm. Mẫu an toàn là bọc nó trong một ' +
          '<code>struct</code> có thêm một trường <code>type</code> để ghi lại đang dùng nhánh ' +
          'nào — kernel gọi mẫu này là <i>tagged union</i>.</p>' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Bước 6 — volatile trong assembly, và static dưới kính hiển vi nm', blocks: [
        { t: 'p', x:
          'Đây là bước thuyết phục nhất của cả bài. Ta viết <b>hai hàm giống hệt nhau</b>, chỉ ' +
          'khác một từ khoá, rồi bảo GCC in ra assembly để so sánh.' },

        { t: 'code', where: 'wsl', name: 'tạo volatile_demo.c', code:
          'cat > volatile_demo.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'int wait_flag_plain(uint32_t *flag)\n' +
          '{\n' +
          '    int n = 0;\n' +
          '    while (*flag == 0)\n' +
          '        n++;\n' +
          '    return n;\n' +
          '}\n' +
          '\n' +
          'int wait_flag_volatile(volatile uint32_t *flag)\n' +
          '{\n' +
          '    int n = 0;\n' +
          '    while (*flag == 0)\n' +
          '        n++;\n' +
          '    return n;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -O2 -S -o volatile_demo.s volatile_demo.c\n' +
          'sed -n \'/^wait_flag_plain:/,/\\.size\\twait_flag_plain/p\' volatile_demo.s | grep -v \'\\.cfi\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'wait_flag_plain:\n' +
          '.LFB0:\n' +
          '\tendbr64\n' +
          '\tmovl\t(%rdi), %eax\n' +
          '\ttestl\t%eax, %eax\n' +
          '\tjne\t.L2\n' +
          '.L3:\n' +
          '\tjmp\t.L3\n' +
          '\t.p2align 4,,10\n' +
          '\t.p2align 3\n' +
          '.L2:\n' +
          '\txorl\t%eax, %eax\n' +
          '\tret' },

        { t: 'p', x:
          'Đọc bốn dòng giữa: <code>movl (%rdi), %eax</code> đọc cờ <b>một lần duy nhất</b>; ' +
          'nếu khác 0 thì nhảy tới <code>.L2</code> và trả về 0; nếu bằng 0 thì rơi vào ' +
          '<code>.L3: jmp .L3</code> — <b>một vòng lặp nhảy vào chính nó, không bao giờ đọc ' +
          'lại bộ nhớ</b>. Trên thiết bị thật, đó là một cái treo máy vĩnh viễn. Giờ xem hàm ' +
          'kia:' },

        { t: 'code', where: 'wsl', code:
          'sed -n \'/^wait_flag_volatile:/,/\\.size\\twait_flag_volatile/p\' volatile_demo.s | grep -v \'\\.cfi\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'wait_flag_volatile:\n' +
          '.LFB1:\n' +
          '\tendbr64\n' +
          '\tmovl\t(%rdi), %eax\n' +
          '\ttestl\t%eax, %eax\n' +
          '\tjne\t.L8\n' +
          '\t.p2align 4\n' +
          '\t.p2align 4\n' +
          '\t.p2align 3\n' +
          '.L7:\n' +
          '\tmovl\t(%rdi), %edx\n' +
          '\taddl\t$1, %eax\n' +
          '\ttestl\t%edx, %edx\n' +
          '\tje\t.L7\n' +
          '\tret' },

        { t: 'cmdx', cmd: 'So sánh hai đoạn assembly', title: 'Khác biệt nằm ở đúng một lệnh',
          rows: [
            ['<code>.L3: jmp .L3</code>', 'Bản <b>không</b> volatile: vòng lặp rỗng, <b>không có lệnh đọc bộ nhớ</b> nào bên trong', 'GCC đã kết luận "cờ không đổi được" nên nâng phép đọc ra ngoài vòng lặp'],
            ['<code>.L7: movl (%rdi), %edx</code>', 'Bản <b>có</b> volatile: <b>lệnh đọc nằm ngay trong vòng lặp</b>', 'Mỗi vòng đều nạp lại từ bộ nhớ — đúng ý người viết'],
            ['<code>addl $1, %eax</code>', 'Chỉ bản volatile mới thật sự đếm <code>n++</code>', 'Bản kia biết mình không bao giờ thoát nên bỏ luôn biến đếm'],
            ['<code>-S</code>', 'Bảo GCC dừng sau <b>giai đoạn biên dịch</b>, xuất ra file <code>.s</code>', 'Giai đoạn 2 trong 4 giai đoạn — <b>Bài 15</b> sẽ đi hết cả bốn'],
            ['<code>-O2</code>', 'Bật tối ưu mức 2', '<b>Bắt buộc phải có.</b> Với <code>-O0</code> hai hàm sinh ra assembly gần như giống nhau và bài học biến mất']
          ]},

        { t: 'cal', kind: 'danger', title: 'Hãy tự thử: bỏ -O2 đi', x:
          '<p>Chạy lại <code>gcc -O0 -S -o volatile_demo0.s volatile_demo.c</code> rồi so sánh. Bạn sẽ thấy ' +
          '<b>cả hai</b> hàm đều đọc lại bộ nhớ mỗi vòng lặp, tức là bản thiếu ' +
          '<code>volatile</code> <i>vẫn chạy đúng</i>.</p>' +
          '<p>Đó chính xác là lý do lỗi này giết người: bạn phát triển và gỡ lỗi với ' +
          '<code>-O0</code>, mọi thứ hoàn hảo. Đến lúc build bản phát hành với ' +
          '<code>-O2</code>, thiết bị treo. Và vì bản phát hành khó gắn trình gỡ lỗi vào hơn ' +
          'nhiều, bạn sẽ mất rất nhiều ngày.</p>' +
          '<p><b>Bài học rộng hơn:</b> mức tối ưu là một phần của môi trường chạy. "Chạy được ' +
          'ở <code>-O0</code>" không chứng minh mã đúng.</p>' },

        { t: 'p', x:
          'Phần cuối: <code>static</code>. Ta viết hai file, dùng cả ba nghĩa của từ khoá này, ' +
          'rồi soi ký hiệu bằng <code>nm</code>.' },

        { t: 'code', where: 'wsl', name: 'tạo counter.c và main.c', code:
          'mkdir -p st && cd st\n' +
          'cat > counter.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'static int call_count = 0;   /* visible only in this file */\n' +
          'int total = 0;               /* visible to the whole program */\n' +
          '\n' +
          'static void write_log(void)  /* internal function */\n' +
          '{\n' +
          '    printf("  [log] call #%d\\n", call_count);\n' +
          '}\n' +
          '\n' +
          'int count_calls(void)\n' +
          '{\n' +
          '    static int private_count = 100;  /* lives for the program\'s lifetime */\n' +
          '    call_count++;\n' +
          '    total++;\n' +
          '    private_count++;\n' +
          '    write_log();\n' +
          '    return private_count;\n' +
          '}\n' +
          'EOF\n' +
          'cat > main.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'extern int total;\n' +
          'int count_calls(void);\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("count_calls -> %d\\n", count_calls());\n' +
          '    printf("count_calls -> %d\\n", count_calls());\n' +
          '    printf("count_calls -> %d\\n", count_calls());\n' +
          '    printf("total = %d\\n", total);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -c counter.c\n' +
          'gcc -Wall -Wextra -c main.c\n' +
          'gcc -o counter counter.o main.o\n' +
          './counter' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  [log] call #1\n' +
          'count_calls -> 101\n' +
          '  [log] call #2\n' +
          'count_calls -> 102\n' +
          '  [log] call #3\n' +
          'count_calls -> 103\n' +
          'total = 3' },

        { t: 'p', x:
          'Biến <code>private_count</code> đi từ 101 lên 103 qua ba lần gọi — nó <b>không</b> bị đặt ' +
          'lại về 100. Dòng <code>static int private_count = 100;</code> chỉ chạy <b>một lần duy ' +
          'nhất</b>, trước khi <code>main</code> bắt đầu. Giờ soi bảng ký hiệu:' },

        { t: 'code', where: 'wsl', code: 'nm counter.o' },

        { t: 'code', where: 'out', nocopy: true, code:
          '0000000000000004 b call_count\n' +
          '0000000000000027 T count_calls\n' +
          '                 U printf\n' +
          '0000000000000000 d private_count.0\n' +
          '0000000000000000 B total\n' +
          '0000000000000000 t write_log' },

        { t: 'cmdx', cmd: 'nm counter.o', title: 'Sáu dòng, và chữ hoa/chữ thường nói tất cả',
          rows: [
            ['<code>b call_count</code>', '<b>b</b>ss — biến khởi tạo bằng 0, <b>cục bộ</b>', 'Vùng <code>.bss</code> không chiếm chỗ trong file, chỉ được cấp lúc nạp'],
            ['<code>T count_calls</code>', '<b>T</b>ext — mã chương trình, <b>chữ hoa = toàn cục</b>', 'File khác liên kết tới được. Đây là hàm duy nhất được xuất ra'],
            ['<code>U printf</code>', '<b>U</b>ndefined — cần, nhưng chưa có', 'Trình liên kết phải tìm nó ở nơi khác. <b>Bài 17 và 18</b> sẽ đi sâu vào đúng chữ U này'],
            ['<code>d private_count.0</code>', '<b>d</b>ata — biến có giá trị khởi tạo khác 0, cục bộ', 'Chú ý cái đuôi <code>.0</code>: GCC đổi tên để tránh trùng với biến cùng tên ở hàm khác'],
            ['<code>B total</code>', 'Cũng ở <code>.bss</code>, nhưng <b>toàn cục</b>', 'Đúng một chữ cái khác nhau, mà là toàn bộ khác biệt về khả năng nhìn thấy'],
            ['<code>t write_log</code>', 'Cũng là mã, nhưng <b>chữ thường = cục bộ</b>', 'Vì có <code>static</code>. Trình liên kết không cho ai bên ngoài dùng']
          ]},

        { t: 'p', x:
          'Cuối cùng, bằng chứng cứng rằng <code>static</code> thật sự che được biến: hãy thử ' +
          '<code>extern</code> tới nó từ một file khác.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/bai14\n' +
          'cat > scope_test.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          'extern int call_count;\n' +
          'int count_calls(void);\n' +
          'int main(void) { count_calls(); printf("%d\\n", call_count); return 0; }\n' +
          'EOF\n' +
          'gcc -o scope_test scope_test.c st/counter.c' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/x86_64-linux-gnu-ld.bfd: /tmp/ccOppQF2.o: warning: relocation against `call_count\' in read-only section `.text\'\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: /tmp/ccOppQF2.o: in function `main\':\n' +
          'scope_test.c:(.text+0xf): undefined reference to `call_count\'\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: warning: creating DT_TEXTREL in a PIE\n' +
          'collect2: error: ld returned 1 exit status' },

        { t: 'cal', kind: 'why', title: 'undefined reference — lỗi bạn sẽ gặp cả nghìn lần', x:
          '<p>Chú ý ba điều trong thông báo này.</p>' +
          '<p><b>Một:</b> lỗi đến từ <code>ld</code>, <b>không phải</b> từ <code>gcc</code>. ' +
          'Việc biên dịch đã thành công hoàn toàn — <code>scope_test.c</code> tự nó không có gì sai. ' +
          'Chỉ tới bước liên kết, khi hai file gặp nhau, vấn đề mới lộ ra.</p>' +
          '<p><b>Hai:</b> <code>undefined reference to \'call_count\'</code> nghĩa là "có người ' +
          'cần ký hiệu này mà không ai cung cấp". Biến <code>call_count</code> <i>có tồn tại</i> ' +
          'trong <code>counter.o</code> — <code>nm</code> vừa cho bạn thấy — nhưng nó mang chữ ' +
          'thường <code>b</code>, nên trình liên kết coi như nó không tồn tại đối với thế giới ' +
          'bên ngoài.</p>' +
          '<p><b>Ba:</b> đây là <b>tính năng</b>, không phải trở ngại. <code>static</code> cho ' +
          'phép bạn thay đổi mọi thứ bên trong file mà chắc chắn không ai khác bị ảnh hưởng — ' +
          'nền tảng để 30 triệu dòng mã kernel còn bảo trì được. <b>Bài 15</b> sẽ giải thích ' +
          'trọn vẹn cơ chế liên kết đứng sau lỗi này.</p>' },

        { t: 'p', x: 'Dọn dẹp khi đã xong:' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai14' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>fatal error: stdint.h: No such file or directory</code>',
         'Gõ nhầm tên header, hoặc dùng <code>gcc -ffreestanding -nostdinc</code>',
         'Kiểm tra chính tả. Với build freestanding thật sự, dùng <code>&lt;stdint.h&gt;</code> của chính GCC bằng cách bỏ <code>-nostdinc</code>'],
        ['<code>error: static assertion failed: …</code>',
         '<b>Không phải lỗi.</b> Đây là kết quả mong đợi ở bước 2 — khẳng định của bạn sai trên kiến trúc đích',
         'Đọc thông báo, sửa <b>giả định</b> chứ không phải sửa khẳng định. Đó là toàn bộ giá trị của <code>_Static_assert</code>'],
        ['<code>warning: format \'%d\' expects argument of type \'int\', but argument 2 has type \'long unsigned int\'</code>',
         'Dùng <code>%d</code> để in <code>sizeof</code>',
         'Đổi sang <code>%zu</code>. Cảnh báo này rất hay bị bỏ qua, nhưng trên kiến trúc 32-bit nó thành lỗi thật'],
        ['<code>undefined reference to \'ten_bien\'</code>',
         'Ký hiệu là <code>static</code> nên không xuất ra; hoặc quên đưa file <code>.o</code> vào lệnh liên kết',
         'Chạy <code>nm file.o</code>: chữ thường là cục bộ, chữ <code>U</code> là đang thiếu. Bỏ <code>static</code> nếu thật sự cần chia sẻ'],
        ['<code>cannot find -lgcc</code> khi chạy <code>gcc -m32</code>',
         'Máy này <b>không cài</b> gói <code>gcc-multilib</code> nên không build được x86 32-bit',
         'Không cần sửa. Dùng <code>arm-linux-gnueabihf-gcc</code> để minh hoạ ILP32 — đó là kiến trúc bạn thật sự quan tâm'],
        ['<code>Segmentation fault</code> ngay khi chạy',
         'Giải tham chiếu con trỏ chưa khởi tạo hoặc bằng <code>NULL</code>',
         'Biên dịch lại với <code>-g -fsanitize=address</code> rồi chạy — nó chỉ đúng dòng gây lỗi'],
        ['Chương trình chạy đúng ở <code>-O0</code>, treo ở <code>-O2</code>',
         'Gần như chắc chắn thiếu <code>volatile</code> trên biến bị phần cứng hoặc ngắt thay đổi',
         'Rà mọi vòng lặp chờ cờ và mọi con trỏ tới thanh ghi. Kiểm chứng bằng <code>gcc -O2 -S</code> như bước 6'],
        ['<code>Bus error</code> trên board ARM (không thấy trên x86)',
         'Truy cập dữ liệu lệch — thường do <code>packed</code> hoặc ép kiểu con trỏ sang địa chỉ chưa căn lề',
         'Dùng <code>memcpy</code> để đọc/ghi trường lệch, hoặc bỏ <code>packed</code> và sắp lại thứ tự trường']
      ]},

    /* ══════════════════════════════════════════════
       11. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      '<code>int</code> và <code>long</code> <b>không có kích thước cố định</b>. Trên máy này ' +
      '<code>long</code> là <b>8</b> byte, trên ARM 32-bit là <b>4</b> — bạn đã bắt ' +
      '<code>gcc</code> tự nói ra bằng <code>_Static_assert</code>. Dữ liệu chạm tới phần ' +
      'cứng thì luôn dùng <code>uint8_t/uint16_t/uint32_t</code>.',

      'Máy này là <b>little-endian</b>: <code>0x12345678</code> nằm trong bộ nhớ theo thứ tự ' +
      '<code>78 56 34 12</code>. Endianness chỉ gây lỗi khi dữ liệu <b>rời khỏi máy</b> — qua ' +
      'mạng, qua file, qua bus. File <code>.dtb</code> ở Chặng 08 luôn là big-endian.',

      'Con trỏ là một biến chứa địa chỉ, rộng <b>8</b> byte ở đây. <code>p + 1</code> nhảy ' +
      '<code>sizeof(*p)</code> byte chứ không phải 1 byte. Mảng <b>không phải</b> con trỏ: ' +
      '<code>sizeof(arr)</code> = <b>20</b> còn <code>sizeof(&amp;arr[0])</code> = <b>8</b>.',

      'Trình biên dịch chèn <b>byte đệm</b> để mọi trường nằm ở offset chia hết cho căn lề của ' +
      'nó. Cùng ba trường: khai báo xấu ra <b>12</b> byte, sắp lại còn <b>8</b>, ' +
      '<code>packed</code> còn <b>6</b>. Với mảng 1000 phần tử, việc đổi thứ tự khai báo tiết ' +
      'kiệm <b>4000</b> byte. Quy tắc: <b>khai báo trường từ lớn tới nhỏ</b>.',

      '<code>packed</code> chỉ dùng cho struct mô tả định dạng bên ngoài. Dùng cho struct nội ' +
      'bộ là đổi vài byte lấy nguy cơ <code>SIGBUS</code> trên ARM.',

      'Bốn macro <code>BIT / |= / &amp;= ~ / ^=</code> là toàn bộ ngôn ngữ điều khiển thanh ' +
      'ghi. Ghi một trường nhiều bit luôn là <b>hai bước: xoá trước, ghi sau</b>. Kernel gọi ' +
      'chúng là <code>BIT()</code>, <code>GENMASK()</code>, <code>FIELD_PREP()</code>.',

      '<code>volatile</code> buộc trình biên dịch <b>đọc lại bộ nhớ mỗi lần</b>. Không có nó, ' +
      '<code>gcc -O2</code> biến vòng lặp chờ cờ thành <code>.L3: jmp .L3</code> — treo vĩnh ' +
      'viễn. Lỗi này <b>chỉ xuất hiện ở bản tối ưu</b>, và nó không phải công cụ đồng bộ đa ' +
      'luồng.',

      '<code>static</code> có <b>ba</b> nghĩa: biến toàn cục cục bộ theo file, hàm cục bộ theo ' +
      'file, và biến trong hàm sống suốt đời chương trình. <code>nm</code> phân biệt bằng ' +
      'chữ hoa/thường: <code>T</code> toàn cục, <code>t</code> cục bộ.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 15 — Bốn giai đoạn biên dịch.</b> Hôm nay bạn gõ ' +
      '<code>gcc -o types types.c</code> và một file thực thi xuất hiện. Bài sau sẽ chứng minh ' +
      'rằng lệnh đó thật ra là <b>bốn chương trình khác nhau chạy nối tiếp</b>, và bạn sẽ ' +
      'dừng lại sau từng chương trình để xem sản phẩm trung gian: file <code>.i</code> sau ' +
      'tiền xử lý (bạn sẽ đo xem 27 dòng mã của mình phình lên bao nhiêu nghìn dòng sau khi ' +
      '<code>#include &lt;stdio.h&gt;</code>), file <code>.s</code> assembly, file ' +
      '<code>.o</code> mã máy, rồi file thực thi cuối cùng.</p>' +
      '<p>Bạn đã dùng trước hai trong bốn giai đoạn ở bài này: <code>-E</code> để in macro và ' +
      '<code>-S</code> để xem <code>volatile</code> đổi assembly. Bài 15 ghép chúng thành một ' +
      'bức tranh trọn vẹn — và trả lời dứt điểm câu hỏi <code>undefined reference</code> mà ' +
      'bạn vừa gặp ở bước 6 thật sự đến từ đâu.</p>' }

  ],

  quiz: [
    {
      q: 'Bạn viết <code>long moc_thoi_gian;</code> để lưu số giây từ 1970. Mã chạy hoàn hảo ' +
         'trên máy phát triển x86_64, nhưng khi nạp lên một board ARM 32-bit thì giá trị sai ' +
         'sau một ngưỡng nào đó. Nguyên nhân là gì?',
      opts: [
        'ARM là big-endian nên byte bị đảo ngược khi lưu',
        'Máy phát triển dùng LP64 nên <code>long</code> rộng 8 byte, board dùng ILP32 nên <code>long</code> chỉ rộng 4 byte và bị tràn',
        'Board ARM không có đơn vị dấu chấm động nên phép tính thời gian bị làm tròn',
        'Cần thêm <code>volatile</code> vì thời gian là giá trị thay đổi từ bên ngoài'
      ],
      a: 1,
      why: 'Bạn đã kiểm chứng đúng điều này ở bước 2: cùng một file <code>sizes.c</code>, ' +
           '<code>gcc</code> và <code>aarch64-linux-gnu-gcc</code> chấp nhận ' +
           '<code>sizeof(long) == 8</code>, còn <code>arm-linux-gnueabihf-gcc</code> ' +
           '<b>từ chối biên dịch</b>. Với 4 byte có dấu, số giây tràn vào năm 2038. Cách sửa là ' +
           'dùng kiểu có kích thước cố định — <code>int64_t</code> — chứ không phải ' +
           '<code>long</code>. ARM mặc định little-endian nên đáp án đầu sai; ' +
           '<code>volatile</code> không liên quan gì tới kích thước kiểu.'
    },
    {
      q: 'Cho <code>struct { uint8_t a; uint32_t b; uint8_t c; };</code> trên máy này. ' +
         '<code>sizeof</code> trả về bao nhiêu, và vì sao?',
      opts: [
        '6 — bằng đúng tổng 1 + 4 + 1',
        '8 — trình biên dịch làm tròn lên bội số của 8',
        '12 — 3 byte đệm sau <code>a</code> để <code>b</code> rơi vào offset 4, và 3 byte đệm cuối để tổng chia hết cho 4',
        '16 — mỗi trường được cấp một ô 4 byte riêng'
      ],
      a: 2,
      why: 'Bạn đã đo được <code>sizeof=12  offset a=0 b=4 c=8</code> ở bước 4. Hai quy tắc ' +
           'phối hợp: mỗi trường phải nằm ở offset chia hết cho căn lề của nó (<code>b</code> ' +
           'cần bội số của 4, nên phải đệm 3 byte sau <code>a</code>), và tổng kích thước phải ' +
           'chia hết cho căn lề lớn nhất (nên đệm thêm 3 byte sau <code>c</code>). Đổi thứ tự ' +
           'thành <code>b, a, c</code> cho ra <b>8</b> byte với cùng dữ liệu — bạn đã đo được ' +
           'điều đó.'
    },
    {
      q: 'Firmware của bạn chạy đúng suốt quá trình phát triển. Khi build bản phát hành với ' +
         '<code>-O2</code>, thiết bị treo cứng ở đoạn chờ cảm biến báo "dữ liệu đã sẵn sàng". ' +
         'Đâu là chẩn đoán khả dĩ nhất?',
      opts: [
        'Con trỏ tới cờ trạng thái thiếu <code>volatile</code>, nên GCC nâng phép đọc ra ngoài vòng lặp và biến nó thành vòng lặp rỗng',
        '<code>-O2</code> sắp xếp lại các trường trong struct làm địa chỉ thanh ghi bị lệch',
        'Cảm biến chậm hơn dự kiến, cần tăng thời gian chờ',
        'Cần thêm <code>static</code> cho biến cờ để nó không bị đặt lại mỗi vòng'
      ],
      a: 0,
      why: 'Đây là chữ ký kinh điển của việc thiếu <code>volatile</code>: <b>chỉ hỏng ở bản ' +
           'tối ưu</b>. Bạn đã nhìn thấy bằng chứng trong assembly ở bước 6 — bản không có ' +
           '<code>volatile</code> sinh ra <code>.L3: jmp .L3</code>, một vòng lặp không chứa ' +
           'lệnh đọc bộ nhớ nào, nên cờ có đổi cũng vô ích. Bản có <code>volatile</code> giữ ' +
           '<code>movl (%rdi), %edx</code> <i>bên trong</i> vòng lặp. GCC <b>không bao giờ</b> ' +
           'sắp xếp lại trường của struct, nên đáp án hai sai về nguyên tắc. ' +
           '<code>static</code> liên quan tới tuổi thọ và phạm vi, không liên quan tới việc ' +
           'đọc lại bộ nhớ.'
    },
    {
      q: 'Bạn muốn ghi giá trị 5 vào trường 4 bit nằm tại vị trí bit 12 của thanh ghi ' +
         '<code>reg</code>, giữ nguyên mọi bit khác. Cách nào đúng?',
      opts: [
        '<code>reg |= (5U &lt;&lt; 12);</code>',
        '<code>reg = (5U &lt;&lt; 12);</code>',
        '<code>reg &amp;= ~(0xFU &lt;&lt; 12); reg |= ((5U &amp; 0xFU) &lt;&lt; 12);</code>',
        '<code>reg ^= (5U &lt;&lt; 12);</code>'
      ],
      a: 2,
      why: 'Ghi một trường luôn là <b>hai bước: xoá rồi mới ghi</b>. Đáp án đầu chỉ ' +
           '<i>thêm</i> bit — nó đúng khi trường đang bằng 0 và sai từ lần thứ hai trở đi, ' +
           'loại lỗi tệ nhất vì nó không sai ngay. Đáp án hai phá huỷ toàn bộ 28 bit còn lại, ' +
           'mà những bit đó đang điều khiển thứ khác trên board. Đáp án cuối <i>đảo</i> bit ' +
           'nên kết quả phụ thuộc giá trị cũ. Chỉ phương án ba xoá đúng 4 bit của trường bằng ' +
           '<code>&amp;= ~(0xFU &lt;&lt; 12)</code> rồi đặt giá trị mới vào.'
    },
    {
      q: 'Trong <code>nm counter.o</code> bạn thấy <code>0000000000000000 t write_log</code> và ' +
         '<code>0000000000000027 T count_calls</code>. Chữ <code>t</code> thường và <code>T</code> ' +
         'hoa khác nhau chỗ nào?',
      opts: [
        '<code>T</code> là hàm đã được tối ưu, <code>t</code> là hàm chưa tối ưu',
        'Cả hai đều nằm trong section <code>.text</code>; chữ hoa nghĩa là ký hiệu <b>toàn cục</b> — file khác liên kết tới được, chữ thường nghĩa là <b>cục bộ</b> vì có <code>static</code>',
        '<code>t</code> là hàm tĩnh nên nằm trong <code>.data</code>, <code>T</code> nằm trong <code>.text</code>',
        '<code>T</code> nghĩa là hàm được xuất ra file thực thi, <code>t</code> nghĩa là hàm bị loại bỏ khi liên kết'
      ],
      a: 1,
      why: 'Chữ cái cho biết <b>section</b> (<code>T</code>/<code>t</code> = text, ' +
           '<code>B</code>/<code>b</code> = bss, <code>D</code>/<code>d</code> = data), còn ' +
           'hoa hay thường cho biết <b>khả năng nhìn thấy</b>. Bạn đã chứng minh sự khác biệt ' +
           'này là thật: khi <code>extern int call_count;</code> từ file khác, trình liên kết trả ' +
           'về <code>undefined reference to \'call_count\'</code> mặc dù <code>nm</code> rõ ràng ' +
           'liệt kê biến đó trong <code>counter.o</code>. Hàm <code>static</code> vẫn nằm trong ' +
           '<code>.text</code> và vẫn có mặt trong file thực thi, chỉ là không ai bên ngoài ' +
           'gọi tới được.'
    },
    {
      q: 'Mã của bạn đọc header gói tin bằng <code>uint32_t len = *(uint32_t *)(buf + 3);</code>. ' +
         'Trên PC nó chạy; trên board ARM chương trình chết với <code>Bus error</code>. Cách ' +
         'sửa <b>đúng và di động</b> nhất là gì?',
      opts: [
        'Thêm <code>volatile</code> vào ép kiểu: <code>*(volatile uint32_t *)(buf + 3)</code>',
        'Đánh dấu struct header là <code>__attribute__((packed))</code> rồi ép kiểu <code>buf</code> sang con trỏ struct đó',
        'Dùng <code>memcpy(&amp;len, buf + 3, sizeof(len));</code>',
        'Đổi <code>uint32_t</code> thành <code>unsigned long</code> để khớp độ rộng thanh ghi của board'
      ],
      a: 2,
      why: '<code>buf + 3</code> gần như chắc chắn không chia hết cho 4, nên phép đọc bị lệch. ' +
           'x86 xử lý ngầm giúp bạn nên lỗi không lộ ra; nhiều chip ARM thì phát sinh ngoại lệ ' +
           '— đúng bẫy mà mục "vì sao phần cứng đòi căn lề" đã cảnh báo. <code>memcpy</code> ' +
           'chép theo byte nên <b>không có yêu cầu căn lề nào</b>, và với kích thước hằng số ' +
           'thì trình biên dịch tối ưu nó thành lệnh nạp hiệu quả nhất mà kiến trúc cho phép — ' +
           'không mất tốc độ. <code>volatile</code> không liên quan tới căn lề. ' +
           '<code>packed</code> giúp trình biên dịch <i>sinh</i> mã an toàn nhưng vẫn chậm hơn ' +
           'và không sửa được ép kiểu thô ở trên. Đáp án cuối làm mọi thứ tệ hơn: ' +
           '<code>unsigned long</code> lại là kiểu có kích thước thay đổi.'
    }
  ]
});

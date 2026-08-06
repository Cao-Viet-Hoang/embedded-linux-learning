/* ═══════════════════════════════════════════════════════════════
   BÀI 15 — Bốn giai đoạn biên dịch
   Chặng 02 · C và công cụ build
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-15',
  title: 'Bốn giai đoạn biên dịch',
  minutes: 50,
  practice: 'Thực hành 30 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 14 bạn gõ <code>gcc -o types types.c</code> hàng chục lần và một file thực thi ' +
    'xuất hiện. Bài này chứng minh rằng lệnh đó không phải một chương trình, mà là ' +
    '<b>bốn chương trình chạy nối tiếp</b>, mỗi cái nhận sản phẩm của cái trước. Bạn sẽ ' +
    'dừng lại sau từng giai đoạn để cầm sản phẩm trung gian lên xem: một file 11 dòng phình ' +
    'thành <b>849 dòng</b> sau tiền xử lý, rồi co lại còn <b>57 dòng</b> assembly, rồi thành ' +
    '<b>1 632 byte</b> mã máy, cuối cùng thành <b>15 952 byte</b> file chạy được. Hiểu bốn ' +
    'giai đoạn này là điều kiện bắt buộc để đọc được thông báo lỗi — vì mỗi giai đoạn báo ' +
    'lỗi bằng một giọng khác nhau, và biết lỗi đến từ giai đoạn nào là đã giải quyết được ' +
    'nửa vấn đề.',

  goals: [
    'Gọi tên bốn giai đoạn và nói được đầu vào, đầu ra của từng giai đoạn',
    'Dừng <code>gcc</code> lại sau mỗi giai đoạn bằng <code>-E</code>, <code>-S</code>, <code>-c</code> và đọc file trung gian',
    'Giải thích vì sao <code>#include &lt;stdio.h&gt;</code> làm file nguồn phình lên 77 lần',
    'Chỉ ra ba cái bẫy của macro và viết macro không dính bẫy',
    'Phân biệt <b>khai báo</b> với <b>định nghĩa</b>, và đọc được ký hiệu <code>U</code> trong <code>nm</code>',
    'Chẩn đoán đúng giai đoạn gây lỗi khi chỉ nhìn vào thông báo lỗi'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. TOÀN CẢNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một lệnh gcc thật ra là bốn chương trình' },

    { t: 'p', x:
      '<code>gcc</code> không phải trình biên dịch. Nó là một <b>người điều phối</b> — tiếng ' +
      'Anh gọi là <i>driver</i> — chỉ làm mỗi việc gọi lần lượt bốn chương trình khác và ' +
      'chuyển file giữa chúng. Bạn sẽ tự nhìn thấy tên thật của chúng ở bước 1 bằng cờ ' +
      '<code>-v</code>.' },

    { t: 'fig',
      cap: 'Bốn giai đoạn, bốn chương trình, bốn định dạng file. Ba cờ -E, -S, -c cho phép bạn dừng lại ở bất kỳ ranh giới nào — đó là cách gỡ lỗi build hiệu quả nhất.',
      svg:
        '<svg viewBox="0 0 720 400" width="720" role="img" aria-label="Sơ đồ bốn giai đoạn biên dịch từ file .c tới file thực thi">' +
        '<rect class="d-box-p" x="20" y="16" width="130" height="46" rx="6"/>' +
        '<text class="d-tm" x="85" y="38" text-anchor="middle">hello.c</text>' +
        '<text class="d-ts" x="85" y="54" text-anchor="middle">11 dong · 193 B</text>' +

        '<line class="d-line" x1="150" y1="39" x2="216" y2="39"/>' +
        '<path class="d-arrow" d="M216 39 l-8 -4 v8 z"/>' +
        '<rect class="d-box-a" x="222" y="16" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="312" y="36" text-anchor="middle">1. TIEN XU LY</text>' +
        '<text class="d-tm" x="312" y="53" text-anchor="middle">cc1 (che do -E)</text>' +
        '<text class="d-ts" x="412" y="30">xu ly moi dong bat dau</text>' +
        '<text class="d-ts" x="412" y="46">bang dau thang #</text>' +

        '<line class="d-line" x1="312" y1="62" x2="312" y2="84"/>' +
        '<path class="d-arrow" d="M312 84 l-4 -8 h8 z"/>' +
        '<rect class="d-box-p" x="222" y="90" width="180" height="46" rx="6"/>' +
        '<text class="d-tm" x="312" y="112" text-anchor="middle">hello.i</text>' +
        '<text class="d-ts" x="312" y="128" text-anchor="middle">849 dong · 21 500 B</text>' +
        '<text class="d-ts" x="412" y="118">van la C, nhung khong</text>' +
        '<text class="d-ts" x="412" y="104">con mot dau # nao</text>' +

        '<line class="d-line" x1="222" y1="113" x2="156" y2="113"/>' +
        '<path class="d-arrow" d="M156 113 l8 -4 v8 z"/>' +
        '<rect class="d-box-a" x="20" y="90" width="130" height="46" rx="6"/>' +
        '<text class="d-t" x="85" y="110" text-anchor="middle">2. BIEN DICH</text>' +
        '<text class="d-tm" x="85" y="127" text-anchor="middle">cc1</text>' +

        '<line class="d-line" x1="85" y1="136" x2="85" y2="158"/>' +
        '<path class="d-arrow" d="M85 158 l-4 -8 h8 z"/>' +
        '<rect class="d-box-p" x="20" y="164" width="180" height="46" rx="6"/>' +
        '<text class="d-tm" x="110" y="186" text-anchor="middle">hello.s</text>' +
        '<text class="d-ts" x="110" y="202" text-anchor="middle">57 dong · 869 B</text>' +
        '<text class="d-ts" x="212" y="192">assembly — van la van ban doc duoc</text>' +

        '<line class="d-line" x1="200" y1="187" x2="266" y2="187"/>' +
        '<path class="d-arrow" d="M266 187 l-8 -4 v8 z"/>' +
        '<rect class="d-box-a" x="272" y="164" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="362" y="184" text-anchor="middle">3. HOP DICH</text>' +
        '<text class="d-tm" x="362" y="201" text-anchor="middle">as</text>' +

        '<line class="d-line" x1="362" y1="210" x2="362" y2="232"/>' +
        '<path class="d-arrow" d="M362 232 l-4 -8 h8 z"/>' +
        '<rect class="d-box-p" x="272" y="238" width="180" height="46" rx="6"/>' +
        '<text class="d-tm" x="362" y="260" text-anchor="middle">hello.o</text>' +
        '<text class="d-ts" x="362" y="276" text-anchor="middle">1 632 B nhi phan</text>' +
        '<text class="d-ts" x="462" y="252">ma may that su, nhung</text>' +
        '<text class="d-ts" x="462" y="268">printf van con thieu</text>' +

        '<line class="d-line" x1="272" y1="261" x2="206" y2="261"/>' +
        '<path class="d-arrow" d="M206 261 l8 -4 v8 z"/>' +
        '<rect class="d-box-a" x="20" y="238" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="110" y="258" text-anchor="middle">4. LIEN KET</text>' +
        '<text class="d-tm" x="110" y="275" text-anchor="middle">collect2 -> ld</text>' +

        '<line class="d-line" x1="110" y1="284" x2="110" y2="306"/>' +
        '<path class="d-arrow" d="M110 306 l-4 -8 h8 z"/>' +
        '<rect class="d-box-g" x="20" y="312" width="180" height="46" rx="6"/>' +
        '<text class="d-tm" x="110" y="334" text-anchor="middle">hello</text>' +
        '<text class="d-ts" x="110" y="350" text-anchor="middle">15 952 B — chay duoc</text>' +

        '<rect class="d-box-w" x="222" y="312" width="478" height="46" rx="4"/>' +
        '<text class="d-t" x="238" y="332">Dung sau giai doan 1: gcc -E     Dung sau giai doan 2: gcc -S</text>' +
        '<text class="d-t" x="238" y="350">Dung sau giai doan 3: gcc -c     Giu lai tat ca: gcc -save-temps</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Giai đoạn', 'Chương trình', 'Vào', 'Ra', 'Câu hỏi nó trả lời'],
      rows: [
        ['1. Tiền xử lý', '<code>cc1 -E</code>', '<code>.c</code>', '<code>.i</code>', '"Mã nguồn <b>đầy đủ</b> trông thế nào sau khi ghép hết header và thay hết macro?"'],
        ['2. Biên dịch', '<code>cc1</code>', '<code>.i</code>', '<code>.s</code>', '"Đoạn C này tương ứng với những lệnh assembly nào?"'],
        ['3. Hợp dịch', '<code>as</code>', '<code>.s</code>', '<code>.o</code>', '"Mỗi lệnh assembly được mã hoá thành byte nào?"'],
        ['4. Liên kết', '<code>ld</code> (qua <code>collect2</code>)', '<code>.o</code> + thư viện', 'file thực thi', '"Hàm <code>printf</code> nằm ở đâu, và địa chỉ cuối cùng của mọi thứ là bao nhiêu?"']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao tách làm bốn thay vì làm một mạch', x:
      '<p><b>Lý do 1 — biên dịch riêng từng file.</b> Kernel có hàng chục nghìn file ' +
      '<code>.c</code>. Sửa một file thì chỉ file đó cần chạy lại ba giai đoạn đầu; ba giai ' +
      'đoạn ấy hoàn toàn không biết gì về các file khác. Chỉ giai đoạn 4 mới cần nhìn thấy ' +
      'toàn bộ. Đây chính là điều làm cho <code>make</code> ở <b>Bài 16</b> có ý nghĩa: nó ' +
      'tồn tại để không phải chạy lại giai đoạn 1–3 cho những file không đổi.</p>' +
      '<p><b>Lý do 2 — mỗi giai đoạn là một công cụ độc lập, thay được.</b> Bạn có thể viết ' +
      'assembly bằng tay rồi đưa thẳng cho <code>as</code>. Bạn có thể dùng trình biên dịch ' +
      'khác nhưng vẫn dùng <code>ld</code> của GNU. Kernel làm cả hai việc đó.</p>' +
      '<p><b>Lý do 3 — quan trọng nhất với bạn lúc này:</b> mỗi giai đoạn báo lỗi bằng một ' +
      'giọng riêng. <code>undefined reference</code> <b>luôn</b> là giai đoạn 4. ' +
      '<code>No such file or directory</code> với một header <b>luôn</b> là giai đoạn 1. Biết ' +
      'lỗi ở giai đoạn nào là đã khoanh vùng xong một nửa.</p>' },

    /* ══════════════════════════════════════════════
       2. GIAI ĐOẠN 1
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Giai đoạn 1 — Tiền xử lý: một công cụ thay thế văn bản' },

    { t: 'p', x:
      'Bộ tiền xử lý <b>không hiểu C</b>. Nó không biết hàm là gì, biến là gì. Nó chỉ làm ba ' +
      'việc trên văn bản thuần: chép nội dung file khác vào, thay chuỗi này bằng chuỗi kia, ' +
      'và cắt bỏ những khối mã bị vô hiệu hoá. Hiểu đúng chỗ này giải thích được gần hết các ' +
      'lỗi macro kỳ quặc.' },

    { t: 'table',
      head: ['Chỉ dẫn', 'Nó làm gì', 'Ghi chú thực dụng'],
      rows: [
        ['<code>#include &lt;file.h&gt;</code>', 'Chép <b>nguyên văn</b> nội dung file vào đúng vị trí dòng này', 'Ngoặc nhọn = tìm trong đường dẫn hệ thống'],
        ['<code>#include "file.h"</code>', 'Như trên', 'Nháy kép = tìm <b>cạnh file nguồn trước</b>, rồi mới tới đường dẫn hệ thống'],
        ['<code>#define NAME gia_tri</code>', 'Thay mọi chỗ xuất hiện <code>NAME</code> bằng <code>gia_tri</code>', 'Thay <b>văn bản</b>, không phải gán giá trị'],
        ['<code>#define HAM(x) …</code>', 'Macro có tham số — thay kèm ghép chuỗi', '<b>Nguồn của ba cái bẫy ở dưới</b>'],
        ['<code>#ifdef</code> / <code>#if</code> / <code>#endif</code>', 'Giữ hoặc <b>xoá hẳn</b> một khối mã', 'Mã bị xoá không tới được giai đoạn 2 — nên lỗi cú pháp trong đó cũng không bị phát hiện'],
        ['<code>#undef NAME</code>', 'Huỷ một định nghĩa macro', 'Hiếm dùng, nhưng cứu bạn khi hai header đặt trùng tên'],
        ['<code>#error "…"</code>', 'Ép dừng ngay với thông báo của bạn', 'Rất hữu ích để chặn cấu hình sai từ sớm']
      ]},

    { t: 'cal', kind: 'info', title: 'Con số làm nhiều người giật mình', x:
      '<p>File <code>hello.c</code> của bạn có <b>11 dòng, 193 byte</b>. Sau giai đoạn 1 nó ' +
      'thành <b>849 dòng, 21 500 byte</b> — dài gấp <b>77 lần</b>, nặng gấp <b>111 lần</b>.</p>' +
      '<p>Toàn bộ phần phình ra đến từ đúng một dòng: <code>#include &lt;stdio.h&gt;</code>. ' +
      'Header đó kéo theo <b>32 header khác</b> — bạn sẽ đếm được bằng <code>gcc -H</code> ở ' +
      'bước 3.</p>' +
      '<p>Đây là lý do trực tiếp khiến biên dịch C chậm, và cũng là lý do mà mọi hướng dẫn ' +
      'đều bảo <b>chỉ <code>#include</code> những gì thật sự cần</b>. Trong kernel, một header ' +
      'thừa nhân với hai mươi nghìn file <code>.c</code> là hàng phút build.</p>' },

    { t: 'cal', kind: 'danger', title: 'Ba cái bẫy của macro — bạn sẽ gặp cả ba ở bước 2', x:
      '<p><b>Bẫy 1 — thiếu ngoặc quanh tham số.</b> ' +
      '<code>#define SQUARE(x) x * x</code> rồi gọi <code>SQUARE(2 + 3)</code> cho ra ' +
      '<b>11</b>, không phải 25. Vì sau khi thay văn bản nó là <code>2 + 3 * 2 + 3</code>.</p>' +
      '<p><b>Bẫy 2 — thiếu ngoặc quanh toàn bộ biểu thức.</b> ' +
      '<code>#define INCR(x) x + 1</code> rồi viết <code>10 * INCR(2)</code> cho ra ' +
      '<b>21</b>, không phải 30. Vì nó thành <code>10 * 2 + 1</code>.</p>' +
      '<p><b>Bẫy 3 — tham số bị tính nhiều lần.</b> ' +
      '<code>#define GREATER(a,b) ((a) &gt; (b) ? (a) : (b))</code> đã ngoặc đầy đủ, nhưng ' +
      '<code>GREATER(i++, j)</code> làm <code>i++</code> chạy <b>hai lần</b>: ' +
      '<code>i</code> nhảy từ 5 lên <b>7</b>.</p>' +
      '<p>Bẫy 1 và 2 chữa được bằng <b>ngoặc mọi tham số và ngoặc cả biểu thức</b>. Bẫy 3 thì ' +
      '<b>không có cách chữa trong C thuần</b> — chỉ tránh được bằng cách không truyền biểu ' +
      'thức có tác dụng phụ vào macro, hoặc dùng hàm <code>static inline</code> thay macro.</p>' },

    { t: 'cal', kind: 'tip', title: 'Khi macro cư xử lạ, đừng đoán — hãy nhìn', x:
      '<p><code>gcc -E file.c | tail -20</code> in ra <b>chính xác</b> đoạn mã mà trình biên ' +
      'dịch thật sự nhìn thấy. Mọi macro đã được thay xong. Bạn sẽ thấy ' +
      '<code>2 + 3 * 2 + 3</code> nằm trần trụi ở đó, và câu hỏi "vì sao ra 11" tự trả lời ' +
      'trong hai giây.</p>' +
      '<p>Đây là kỹ thuật gỡ lỗi hiệu quả nhất của cả bài, và nó sẽ còn quý hơn nữa ở ' +
      '<b>Chặng 07</b>, khi bạn đọc mã kernel — nơi một dòng có thể là ba tầng macro lồng ' +
      'nhau. <code>gcc -E</code> bóc hết ba tầng ra cho bạn.</p>' },

    /* ══════════════════════════════════════════════
       3. HEADER
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Header, header guard và quy tắc một định nghĩa' },

    { t: 'p', x:
      'Vì <code>#include</code> chỉ là "chép nội dung vào", nên nếu một header bị chép vào ' +
      'hai lần thì mọi thứ trong nó xuất hiện hai lần. Với khai báo hàm thì vô hại; với ' +
      '<b>định nghĩa</b> hàm hoặc biến thì đó là lỗi. Và trong một dự án thật, việc một header ' +
      'bị kéo vào nhiều lần là chuyện <b>bình thường</b>, không phải bất cẩn.' },

    { t: 'fig',
      cap: 'A.h và B.h đều cần common.h. Không có header guard, nội dung common.h vào file .i hai lần. Guard biến lần thứ hai thành một khối rỗng.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ header guard chặn việc chép nội dung header hai lần">' +
        '<rect class="d-box-p" x="280" y="16" width="160" height="40" rx="6"/>' +
        '<text class="d-tm" x="360" y="41" text-anchor="middle">main.c</text>' +

        '<line class="d-line" x1="330" y1="56" x2="200" y2="88"/>' +
        '<path class="d-arrow" d="M200 88 l2 -9 l6 5 z"/>' +
        '<line class="d-line" x1="390" y1="56" x2="520" y2="88"/>' +
        '<path class="d-arrow" d="M520 88 l-8 -4 l2 9 z"/>' +

        '<rect class="d-box-a" x="120" y="94" width="160" height="40" rx="6"/>' +
        '<text class="d-tm" x="200" y="119" text-anchor="middle">A.h</text>' +
        '<rect class="d-box-a" x="440" y="94" width="160" height="40" rx="6"/>' +
        '<text class="d-tm" x="520" y="119" text-anchor="middle">B.h</text>' +

        '<line class="d-line" x1="220" y1="134" x2="330" y2="172"/>' +
        '<path class="d-arrow" d="M330 172 l-9 -1 l3 8 z"/>' +
        '<line class="d-line" x1="500" y1="134" x2="390" y2="172"/>' +
        '<path class="d-arrow" d="M390 172 l6 -7 l3 8 z"/>' +

        '<rect class="d-box-g" x="280" y="178" width="160" height="40" rx="6"/>' +
        '<text class="d-tm" x="360" y="203" text-anchor="middle">common.h</text>' +
        '<text class="d-ts" x="452" y="196">bi yeu cau HAI lan</text>' +
        '<text class="d-ts" x="452" y="212">tu hai duong khac nhau</text>' +

        '<rect class="d-box-w" x="20" y="238" width="330" height="50" rx="4"/>' +
        '<text class="d-t" x="34" y="258">KHONG guard: noi dung vao file .i hai lan</text>' +
        '<text class="d-ts" x="34" y="276">-> error: redefinition of ‘twice’</text>' +

        '<rect class="d-box-g" x="370" y="238" width="330" height="50" rx="4"/>' +
        '<text class="d-t" x="384" y="258">CO guard: lan hai thay macro da dinh nghia</text>' +
        '<text class="d-ts" x="384" y="276">-> bo qua ca file, khong sinh ra dong nao</text>' +
        '</svg>' },

    { t: 'code', where: 'file', name: 'util.h — mẫu header guard chuẩn', code:
      '#ifndef UTIL_H             /* if UTIL_H is NOT yet defined then... */\n' +
      '#define UTIL_H             /* ...define it now, then process what follows */\n' +
      '\n' +
      'static inline int twice(int x) { return x * 2; }\n' +
      '\n' +
      '#endif /* UTIL_H */    /* second include jumps straight here */' },

    { t: 'cal', kind: 'why', title: 'Cơ chế rất đơn giản, và bạn nên tự nghĩ ra được', x:
      '<p>Lần <code>#include</code> đầu tiên: <code>UTIL_H</code> chưa tồn tại, nên ' +
      '<code>#ifndef</code> đúng, bộ tiền xử lý định nghĩa <code>UTIL_H</code> rồi chép ' +
      'phần thân vào.</p>' +
      '<p>Lần thứ hai: <code>UTIL_H</code> <b>đã</b> tồn tại, <code>#ifndef</code> sai, ' +
      'toàn bộ khối tới <code>#endif</code> bị xoá. Header vẫn được <i>đọc</i>, nhưng không ' +
      'sinh ra dòng nào.</p>' +
      '<p>Không có phép màu — chỉ là điều kiện tiền xử lý cộng với một cái cờ. Quy tắc đặt ' +
      'tên: dùng <b>tên file viết hoa, thay dấu chấm bằng gạch dưới</b>. Trùng tên guard giữa ' +
      'hai header khác nhau là một lỗi rất khó tìm, vì header thứ hai sẽ <i>im lặng biến ' +
      'mất</i>.</p>' },

    { t: 'cal', kind: 'tip', title: '#pragma once — ngắn hơn, nhưng chưa chuẩn', x:
      '<p>Nhiều dự án hiện đại thay ba dòng guard bằng một dòng ' +
      '<code>#pragma once</code> ở đầu header. Nó gọn hơn và không thể trùng tên.</p>' +
      '<p>Nhưng nó <b>không nằm trong chuẩn C</b> — nó là phần mở rộng, dù GCC, Clang và MSVC ' +
      'đều hỗ trợ. Kernel Linux vẫn dùng <code>#ifndef</code> truyền thống, nên đó là kiểu ' +
      'bạn sẽ đọc suốt từ Chặng 07 trở đi. Trong dự án của riêng bạn, chọn kiểu nào cũng ' +
      'được — miễn là <b>chọn một kiểu và dùng nhất quán</b>.</p>' },

    /* ══════════════════════════════════════════════
       4. GIAI ĐOẠN 2 VÀ 3
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Giai đoạn 2 và 3 — từ C xuống assembly rồi xuống byte' },

    { t: 'p', x:
      'Giai đoạn 2 là phần "trình biên dịch" theo nghĩa hẹp: phân tích cú pháp, kiểm tra kiểu, ' +
      'tối ưu, rồi sinh assembly. <b>Mọi cảnh báo và lỗi cú pháp bạn từng thấy đều đến từ ' +
      'đây.</b> Kết quả là một file văn bản đọc được — đây là toàn bộ phần thân hàm ' +
      '<code>main</code> mà bạn sẽ tạo ra ở bước 4:' },

    { t: 'code', where: 'file', name: 'hello.s — trích phần quan trọng', nocopy: true, code:
      '\t.section\t.rodata\n' +
      '.LC0:\n' +
      '\t.string\t"Embedded Linux"\n' +
      '.LC1:\n' +
      '\t.string\t"Hello %s\\n"\n' +
      '.LC2:\n' +
      '\t.string\t"SQUARE(7) = %d\\n"\n' +
      '\t.text\n' +
      '\t.globl\tmain\n' +
      'main:\n' +
      '\tleaq\t.LC0(%rip), %rdx\n' +
      '\tleaq\t.LC1(%rip), %rax\n' +
      '\tmovq\t%rdx, %rsi\n' +
      '\tmovq\t%rax, %rdi\n' +
      '\tcall\tprintf@PLT\n' +
      '\tleaq\t.LC2(%rip), %rax\n' +
      '\tmovl\t$49, %esi\n' +
      '\tcall\tprintf@PLT\n' +
      '\tmovl\t$0, %eax\n' +
      '\tret' },

    { t: 'cmdx', cmd: 'Đọc hello.s mà không cần biết assembly', title: 'Năm chi tiết đáng chú ý',
      rows: [
        ['<code>.section .rodata</code>', 'Vùng <b>chỉ đọc</b>. Ba chuỗi ký tự của bạn nằm ở đây', 'Ghi vào vùng này lúc chạy sẽ gây <code>Segmentation fault</code> — đó là lý do sửa chuỗi hằng làm chương trình chết'],
        ['<code>.globl main</code>', 'Xuất ký hiệu <code>main</code> ra ngoài', 'Chính là chữ <code>T</code> hoa mà <code>nm</code> hiện ở Bài 14'],
        ['<code>movl $49, %esi</code>', '<b>Số 49 đã có sẵn trong mã máy</b>', '<code>SQUARE(7)</code> là <code>((7) * (7))</code> — toàn hằng số, nên trình biên dịch tính luôn lúc build. Chương trình lúc chạy <b>không nhân gì cả</b>'],
        ['<code>call printf@PLT</code>', 'Gọi <code>printf</code>, nhưng qua một bảng trung gian', '<code>PLT</code> = Procedure Linkage Table. Vì <code>printf</code> nằm trong thư viện động, địa chỉ thật chỉ biết lúc chạy — <b>Bài 17</b> sẽ mổ xẻ'],
        ['<code>.LC0</code>, <code>.LFB0</code>', 'Nhãn cục bộ do trình biên dịch tự đặt', 'Dấu chấm đầu tên là quy ước "đây là nhãn nội bộ, không xuất ra"']
      ]},

    { t: 'cal', kind: 'info', title: 'Giai đoạn 3 là giai đoạn nhàm chán nhất — và đó là điều tốt', x:
      '<p><code>as</code> nhận file văn bản <code>.s</code> và dịch từng dòng thành byte mã ' +
      'máy. Nó gần như <b>không suy nghĩ gì</b>: một lệnh assembly ứng với một lệnh máy, ' +
      'ánh xạ tra bảng.</p>' +
      '<p>Vì thế lỗi ở giai đoạn 3 cực hiếm — nếu gặp, gần như luôn là do bạn viết assembly ' +
      'nội tuyến bằng tay hoặc dùng lệnh mà CPU đích không có.</p>' +
      '<p>Kết quả là file <b>ELF relocatable</b> 1 632 byte. Chữ <i>relocatable</i> — "có thể ' +
      'dời chỗ" — là điểm mấu chốt: các địa chỉ trong đó <b>chưa phải địa chỉ thật</b>, chúng ' +
      'còn phải chờ giai đoạn 4 quyết định. Bạn sẽ thấy tận mắt: mọi section trong ' +
      '<code>hello.o</code> đều có <code>Address = 0000000000000000</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. GIAI ĐOẠN 4
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu' },

    { t: 'p', x:
      'Đây là giai đoạn sinh ra nhiều câu hỏi nhất, vì nó là giai đoạn duy nhất nhìn thấy ' +
      '<b>toàn bộ chương trình</b>. Mọi thứ nó làm xoay quanh một khái niệm: <b>ký hiệu</b> ' +
      '(symbol) — tên của một hàm hoặc một biến toàn cục. Và mọi rắc rối xoay quanh một phân ' +
      'biệt: <b>khai báo</b> khác <b>định nghĩa</b>.' },

    { t: 'table',
      head: ['', 'Khai báo (declaration)', 'Định nghĩa (definition)'],
      rows: [
        ['Trông thế nào', '<code>int add(int a, int b);</code>', '<code>int add(int a, int b) { return a + b; }</code>'],
        ['Nói gì với trình biên dịch', '"Có một hàm tên như vậy, kiểu như vậy. Cứ gọi đi"', '"Đây là mã thật của hàm đó"'],
        ['Đặt ở đâu', 'Trong file <code>.h</code>', 'Trong file <code>.c</code>'],
        ['Được phép lặp lại', '<b>Có</b> — bao nhiêu lần cũng được', '<b>Không</b> — đúng một lần trong cả chương trình'],
        ['Sinh ra byte trong <code>.o</code>', 'Không', 'Có'],
        ['<code>nm</code> hiện ra sao', '<code>U</code> — undefined, đang cần', '<code>T</code> — text, đang cung cấp'],
        ['Thiếu nó thì lỗi gì', '<code>implicit declaration of function</code> (giai đoạn 2)', '<code>undefined reference</code> (giai đoạn 4)']
      ]},

    { t: 'fig',
      cap: 'Trình liên kết ghép chữ U của file này với chữ T của file kia. Mỗi chữ U không tìm được nhà cung cấp trở thành một dòng undefined reference.',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="Sơ đồ trình liên kết ghép ký hiệu undefined với ký hiệu định nghĩa">' +
        '<rect class="d-box-p" x="20" y="16" width="200" height="120" rx="6"/>' +
        '<text class="d-tm" x="120" y="38" text-anchor="middle">main.o</text>' +
        '<text class="d-tm" x="34" y="62">T main</text>' +
        '<text class="d-ts" x="120" y="62">cung cap</text>' +
        '<text class="d-tm" x="34" y="84">U add</text>' +
        '<text class="d-ts" x="120" y="84">dang can</text>' +
        '<text class="d-tm" x="34" y="106">U sub</text>' +
        '<text class="d-ts" x="120" y="106">dang can</text>' +
        '<text class="d-tm" x="34" y="128">U printf</text>' +
        '<text class="d-ts" x="120" y="128">dang can</text>' +

        '<rect class="d-box-a" x="270" y="16" width="180" height="70" rx="6"/>' +
        '<text class="d-tm" x="360" y="38" text-anchor="middle">ops.o</text>' +
        '<text class="d-tm" x="284" y="62">T add</text>' +
        '<text class="d-ts" x="380" y="62">cung cap</text>' +

        '<rect class="d-box-g" x="270" y="106" width="180" height="70" rx="6"/>' +
        '<text class="d-tm" x="360" y="128" text-anchor="middle">libc.so.6</text>' +
        '<text class="d-tm" x="284" y="152">T printf</text>' +
        '<text class="d-ts" x="390" y="152">cung cap</text>' +

        '<line class="d-line" x1="140" y1="78" x2="264" y2="60"/>' +
        '<path class="d-arrow" d="M264 60 l-9 -1 l2 8 z"/>' +
        '<line class="d-line" x1="150" y1="124" x2="264" y2="140"/>' +
        '<path class="d-arrow" d="M264 140 l-8 -4 l0 8 z"/>' +

        '<line class="d-line" x1="120" y1="100" x2="200" y2="204"/>' +
        '<path class="d-arrow" d="M200 204 l-1 -9 l-6 4 z"/>' +
        '<rect class="d-box-w" x="150" y="210" width="550" height="64" rx="4"/>' +
        '<text class="d-t" x="166" y="232">U sub khong tim duoc ai cung cap</text>' +
        '<text class="d-tm" x="166" y="252">main.c:(.text+0x3a): undefined reference to `sub\'</text>' +
        '<text class="d-ts" x="166" y="268">-> loi cua ld, KHONG phai loi cua gcc. Bien dich da thanh cong hoan toan.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao main.c biên dịch trót lọt dù hàm sub() chưa hề tồn tại', x:
      '<p>Đây là câu hỏi làm người mới bối rối nhất, và câu trả lời rất gọn: ' +
      '<b>giai đoạn 2 chỉ nhìn thấy đúng một file</b>.</p>' +
      '<p>Khi biên dịch <code>main.c</code>, trình biên dịch thấy khai báo ' +
      '<code>int sub(int, int);</code> trong header. Thế là đủ để nó biết cách gọi: truyền hai ' +
      '<code>int</code>, nhận về một <code>int</code>. Nó sinh ra lệnh <code>call sub</code> ' +
      'với địa chỉ để trống, ghi vào bảng ký hiệu chữ <code>U</code>, rồi <b>coi như xong ' +
      'việc</b>. Nó không có cách nào biết — và cũng không cần biết — file nào sẽ cung cấp ' +
      '<code>sub</code>.</p>' +
      '<p>Chỉ tới giai đoạn 4, khi <code>ld</code> có trong tay <i>mọi</i> file ' +
      '<code>.o</code>, nó mới đối chiếu được và phát hiện không ai cung cấp. Đó là lý do ' +
      '<code>undefined reference</code> <b>luôn luôn</b> là lỗi liên kết, không bao giờ là ' +
      'lỗi biên dịch.</p>' +
      '<p><b>Hệ quả thực dụng:</b> khi gặp lỗi này, đừng đi sửa mã C. Hãy hỏi ba câu: file ' +
      '<code>.o</code> chứa định nghĩa đã được đưa vào lệnh liên kết chưa? Có quên ' +
      '<code>-l</code> tên thư viện không? Ký hiệu đó có bị <code>static</code> che đi không?</p>' },

    { t: 'terms', items: [
      ['Ký hiệu', 'symbol', 'Tên của một hàm hoặc biến toàn cục, kèm địa chỉ của nó. Trình liên kết chỉ làm việc với ký hiệu, nó không hề biết C là gì'],
      ['<code>U</code>', 'undefined', 'File này <b>cần</b> ký hiệu đó nhưng không có. Phải tìm ở nơi khác'],
      ['<code>T</code> / <code>t</code>', 'text', 'File này <b>cung cấp</b> ký hiệu đó. Hoa = toàn cục, thường = cục bộ'],
      ['Relocation', '', 'Việc điền địa chỉ thật vào chỗ để trống. Section <code>.rela.text</code> trong <code>.o</code> chính là danh sách các chỗ cần điền'],
      ['<code>collect2</code>', '', 'Lớp bọc quanh <code>ld</code> mà GCC gọi. Vì thế thông báo lỗi thường có cả hai tên'],
      ['One Definition Rule', 'ODR', 'Mỗi ký hiệu toàn cục được định nghĩa <b>đúng một lần</b> trong cả chương trình. Vi phạm là <code>multiple definition</code>'],
      ['<code>@PLT</code>', 'Procedure Linkage Table', 'Bảng trung gian cho lời gọi tới thư viện động, vì địa chỉ thật chỉ biết lúc nạp chương trình']
    ]},

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: dừng lại sau từng giai đoạn' },

    { t: 'p', x:
      'Sáu bước. Bạn sẽ chạy đúng một chương trình <code>hello.c</code> qua bốn giai đoạn, ' +
      'từng giai đoạn một, cầm từng file trung gian lên xem. Rồi bạn sẽ <b>cố tình gây ra ba ' +
      'loại lỗi khác nhau</b> để thấy mỗi giai đoạn kêu bằng một giọng riêng.' },

    { t: 'code', where: 'wsl', code:
      'mkdir -p ~/bai15 && cd ~/bai15\n' +
      'gcc --version | head -1' },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Bước 1 — Xem gcc thật sự gọi những chương trình nào', blocks: [
        { t: 'p', x:
          'Trước khi chia nhỏ, hãy chứng minh luận điểm mở đầu: một lệnh <code>gcc</code> gọi ' +
          'ra nhiều chương trình. Cờ <code>-v</code> bắt nó kể lại mọi việc nó làm.' },

        { t: 'code', where: 'wsl', name: 'tạo hello.c', code:
          'cat > hello.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          '#define NAME     "Embedded Linux"\n' +
          '#define SQUARE(x) ((x) * (x))\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("Hello %s\\n", NAME);\n' +
          '    printf("SQUARE(7) = %d\\n", SQUARE(7));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'wc -l hello.c' },

        { t: 'code', where: 'out', nocopy: true, code: '11 hello.c' },

        { t: 'code', where: 'wsl', code:
          'gcc -v hello.c -o hello 2>&1 | grep -oE \'(cc1|linux-gnu-as|collect2)\' | sort -u' },

        { t: 'code', where: 'out', nocopy: true, code:
          'cc1\n' +
          'collect2\n' +
          'linux-gnu-as' },

        { t: 'cmdx', cmd: 'gcc -v hello.c -o hello', title: 'Ba cái tên vừa hiện ra là ai',
          rows: [
            ['<code>/usr/libexec/gcc/…/cc1</code>', '<b>Trình biên dịch C thật sự.</b> Nó làm cả giai đoạn 1 và 2', 'Đây mới là "GCC". Cái bạn gõ hằng ngày chỉ là người điều phối'],
            ['<code>/usr/bin/x86_64-linux-gnu-as</code>', '<b>Trình hợp dịch</b> — giai đoạn 3', 'Thuộc bộ <code>binutils</code>, cùng nhà với <code>nm</code>, <code>readelf</code>, <code>objdump</code>'],
            ['<code>/usr/libexec/gcc/…/collect2</code>', 'Lớp bọc gọi <b>trình liên kết</b> <code>ld</code> — giai đoạn 4', 'Vì thế thông báo lỗi liên kết thường nhắc cả <code>ld.bfd</code> lẫn <code>collect2</code>'],
            ['<code>-v</code>', 'In ra mọi lệnh con kèm toàn bộ tham số', 'Rất dài, nhưng là công cụ số một khi cần biết "vì sao nó tìm header ở đó"']
          ]},

        { t: 'cal', kind: 'info', title: 'Vì sao tên có tiền tố x86_64-linux-gnu-', x:
          '<p><code>x86_64-linux-gnu</code> là <b>bộ ba đích</b> (target triplet): kiến trúc ' +
          'CPU – hệ điều hành – ABI. Nó nói rằng công cụ này sinh mã cho x86 64-bit, chạy ' +
          'Linux, dùng thư viện GNU.</p>' +
          '<p>Ở <b>Chặng 04</b> bạn sẽ gặp lại đúng quy ước này với ' +
          '<code>aarch64-linux-gnu-gcc</code> và <code>arm-linux-gnueabihf-gcc</code> mà bạn ' +
          'đã dùng ở Bài 14. Toàn bộ khái niệm "biên dịch chéo" gói gọn trong việc đổi bộ ba ' +
          'đó — không có gì huyền bí hơn.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Bước 2 — Giai đoạn 1: 11 dòng phình thành 849 dòng', blocks: [
        { t: 'p', x:
          'Cờ <code>-E</code> bảo <code>gcc</code> chạy xong tiền xử lý rồi <b>dừng lại</b>, ' +
          'in kết quả ra. Đây là mã nguồn mà trình biên dịch thật sự nhìn thấy.' },

        { t: 'code', where: 'wsl', code:
          'gcc -E hello.c -o hello.i\n' +
          'wc -l hello.c hello.i\n' +
          'stat -c \'%s %n\' hello.c hello.i' },

        { t: 'code', where: 'out', nocopy: true, code:
          '   11 hello.c\n' +
          '  849 hello.i\n' +
          '  860 total\n' +
          '193 hello.c\n' +
          '21500 hello.i' },

        { t: 'cal', kind: 'info', title: 'Ba con số cần ghi lại', x:
          '<p><b>11 → 849 dòng</b>, tức gấp <b>77 lần</b>.<br>' +
          '<b>193 → 21 500 byte</b>, tức gấp <b>111 lần</b>.<br>' +
          'Toàn bộ do <b>một</b> dòng <code>#include &lt;stdio.h&gt;</code>.</p>' +
          '<p>Con số của bạn có thể lệch chút ít nếu phiên bản glibc khác — điều cần khớp là ' +
          '<i>bậc độ lớn</i>: hàng chục lần, không phải vài phần trăm.</p>' },

        { t: 'p', x:
          'Giờ xem <b>phần cuối</b> file <code>.i</code> — đó chính là mã của bạn, sau khi mọi ' +
          'macro đã bị thay:' },

        { t: 'code', where: 'wsl', code: 'tail -8 hello.i' },

        { t: 'code', where: 'out', nocopy: true, code:
          'int main(void)\n' +
          '{\n' +
          '    printf("Hello %s\\n", "Embedded Linux");\n' +
          '    printf("SQUARE(7) = %d\\n", ((7) * (7)));\n' +
          '    return 0;\n' +
          '}' },

        { t: 'cal', kind: 'why', title: 'Ba điều đọc được từ sáu dòng này', x:
          '<p><b>Một:</b> <code>NAME</code> đã biến mất, thay bằng ' +
          '<code>"Embedded Linux"</code>. Sau giai đoạn 1, <b>không còn macro nào tồn tại</b>. ' +
          'Trình biên dịch chưa từng nghe tới cái tên <code>NAME</code> — đây là lý do trình gỡ ' +
          'lỗi không cho bạn xem giá trị của macro.</p>' +
          '<p><b>Hai:</b> <code>SQUARE(7)</code> thành <code>((7) * (7))</code> — <b>phép nhân ' +
          'vẫn còn đó</b>. Bộ tiền xử lý chỉ thay văn bản, nó không biết tính toán.</p>' +
          '<p><b>Ba:</b> ở bước 4 bạn sẽ thấy assembly chứa <code>movl $49, %esi</code>. Vậy ' +
          'phép nhân biến mất ở <b>giai đoạn 2</b>, khi trình biên dịch nhận ra cả hai toán ' +
          'hạng đều là hằng và tự tính ra 49. Ranh giới trách nhiệm giữa hai giai đoạn hiện ra ' +
          'rất rõ ở đây.</p>' },

        { t: 'p', x:
          'Còn 843 dòng kia là gì? Phần lớn là dòng đánh dấu bắt đầu bằng <code>#</code> — ' +
          'không phải chỉ dẫn tiền xử lý nữa, mà là <b>bản đồ nguồn</b>.' },

        { t: 'code', where: 'wsl', code:
          'grep -c \'^#\' hello.i\n' +
          'grep -m3 \'^# 1\' hello.i' },

        { t: 'code', where: 'out', nocopy: true, code:
          '117\n' +
          '# 1 "/usr/include/stdc-predef.h" 1 3 4\n' +
          '# 1 "hello.c"\n' +
          '# 1 "/usr/include/stdio.h" 1 3 4' },

        { t: 'cal', kind: 'tip', title: 'Những dòng # đó là lý do lỗi chỉ đúng file và dòng', x:
          '<p>Dạng <code># 12 "/usr/include/stdio.h"</code> nghĩa là "các dòng tiếp theo vốn ' +
          'đến từ dòng 12 của file <code>stdio.h</code>".</p>' +
          '<p>Nhờ vậy, khi giai đoạn 2 phát hiện lỗi ở dòng 700 của file <code>.i</code>, nó ' +
          'tra bản đồ và báo cho bạn <code>hello.c:9</code> — vị trí trong file <b>bạn thật ' +
          'sự viết</b>. Không có cơ chế này, mọi thông báo lỗi sẽ trỏ vào một file trung gian ' +
          'mà bạn chưa từng thấy.</p>' +
          '<p>Đây cũng là lý do <code>gcc -E</code> là công cụ gỡ lỗi tốt: bạn có thể lần theo ' +
          'các dòng <code>#</code> để biết một khai báo lạ đến từ header nào.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Bước 3 — Ba cái bẫy macro, nhìn tận mắt', blocks: [
        { t: 'p', x:
          'Lý thuyết đã cảnh báo ba cái bẫy. Giờ ta cho cả ba nổ cùng lúc rồi dùng ' +
          '<code>gcc -E</code> để xem vì sao.' },

        { t: 'code', where: 'wsl', name: 'tạo macro.c', code:
          'cat > macro.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          '#define SQUARE_BAD(x)  x * x\n' +
          '#define SQUARE_GOOD(x)  ((x) * (x))\n' +
          '\n' +
          '#define INCR_BAD(x)   x + 1\n' +
          '#define INCR_GOOD(x)   ((x) + 1)\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("SQUARE_BAD(2 + 3) = %d\\n", SQUARE_BAD(2 + 3));\n' +
          '    printf("SQUARE_GOOD(2 + 3) = %d\\n", SQUARE_GOOD(2 + 3));\n' +
          '    printf("10 * INCR_BAD(2)  = %d\\n", 10 * INCR_BAD(2));\n' +
          '    printf("10 * INCR_GOOD(2)  = %d\\n", 10 * INCR_GOOD(2));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -o macro macro.c && ./macro' },

        { t: 'code', where: 'out', nocopy: true, code:
          'SQUARE_BAD(2 + 3) = 11\n' +
          'SQUARE_GOOD(2 + 3) = 25\n' +
          '10 * INCR_BAD(2)  = 21\n' +
          '10 * INCR_GOOD(2)  = 30' },

        { t: 'p', x:
          'Hai kết quả sai lệch hoàn toàn, mà trình biên dịch <b>không hề cảnh báo</b> — với ' +
          'nó thì mã hoàn toàn hợp lệ. Hỏi giai đoạn 1 xem chuyện gì đã xảy ra:' },

        { t: 'code', where: 'wsl', code: 'gcc -E macro.c | tail -8' },

        { t: 'code', where: 'out', nocopy: true, code:
          'int main(void)\n' +
          '{\n' +
          '    printf("SQUARE_BAD(2 + 3) = %d\\n", 2 + 3 * 2 + 3);\n' +
          '    printf("SQUARE_GOOD(2 + 3) = %d\\n", ((2 + 3) * (2 + 3)));\n' +
          '    printf("10 * INCR_BAD(2)  = %d\\n", 10 * 2 + 1);\n' +
          '    printf("10 * INCR_GOOD(2)  = %d\\n", 10 * ((2) + 1));\n' +
          '    return 0;\n' +
          '}' },

        { t: 'cmdx', cmd: 'Đối chiếu bốn dòng', title: 'Ngoặc đặt sai chỗ, kết quả sai hẳn',
          rows: [
            ['<code>2 + 3 * 2 + 3</code>', 'Nhân ưu tiên hơn cộng: <code>2 + 6 + 3</code> = <b>11</b>', 'Tham số <code>2 + 3</code> bị xé đôi vì không có ngoặc bảo vệ'],
            ['<code>((2 + 3) * (2 + 3))</code>', '<code>5 * 5</code> = <b>25</b>', 'Ngoặc quanh <b>tham số</b> giữ nó nguyên khối'],
            ['<code>10 * 2 + 1</code>', '<code>20 + 1</code> = <b>21</b>', 'Ngoặc quanh tham số cũng không cứu được — thiếu ngoặc quanh <b>cả biểu thức</b>'],
            ['<code>10 * ((2) + 1)</code>', '<code>10 * 3</code> = <b>30</b>', 'Đủ cả hai lớp ngoặc mới đúng trong mọi ngữ cảnh']
          ]},

        { t: 'p', x:
          'Bẫy thứ ba tinh vi hơn: macro có ngoặc <b>đầy đủ</b> mà vẫn sai.' },

        { t: 'code', where: 'wsl', code:
          'cat > greater.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#define GREATER(a, b) ((a) > (b) ? (a) : (b))\n' +
          'int main(void)\n' +
          '{\n' +
          '    int i = 5, j = 3;\n' +
          '    int k = GREATER(i++, j);\n' +
          '    printf("i = %d (expected 6), k = %d\\n", i, k);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -o greater greater.c && ./greater' },

        { t: 'code', where: 'out', nocopy: true, code:
          'i = 7 (expected 6), k = 6' },

        { t: 'cal', kind: 'danger', title: 'i tăng hai lần — và không có dấu hiệu cảnh báo nào', x:
          '<p>Thay văn bản biến <code>GREATER(i++, j)</code> thành ' +
          '<code>((i++) &gt; (j) ? (i++) : (j))</code>. Chữ <code>i++</code> xuất hiện ' +
          '<b>hai lần</b>, và cả hai đều chạy: một lần khi so sánh, một lần khi trả về giá ' +
          'trị. Nên <code>i</code> nhảy từ 5 lên <b>7</b>.</p>' +
          '<p>Đây là lỗi nguy hiểm nhất trong ba bẫy vì <b>ngoặc đã đầy đủ</b> — không có chỗ ' +
          'nào để "sửa cho đúng". Nếu <code>i++</code> là một lời gọi ' +
          '<code>read_sensor()</code>, bạn vừa đọc cảm biến hai lần và vứt đi một kết quả.</p>' +
          '<p><b>Hai cách phòng:</b> không bao giờ truyền biểu thức có tác dụng phụ vào macro; ' +
          'và tốt hơn nữa — dùng <code>static inline</code> thay macro. Hàm ' +
          '<code>static inline</code> tính mỗi tham số đúng một lần, vẫn nhanh y hệt vì trình ' +
          'biên dịch nội tuyến nó, lại còn kiểm tra được kiểu. Kernel Linux đã chuyển phần lớn ' +
          'macro sang <code>static inline</code> đúng vì lý do này.</p>' },

        { t: 'p', x:
          'Cuối cùng, đếm xem một dòng <code>#include</code> kéo theo bao nhiêu file:' },

        { t: 'code', where: 'wsl', code:
          'gcc -H -E hello.c -o /dev/null 2>&1 | head -6\n' +
          'echo \'--- tong so header:\'\n' +
          'gcc -H -E hello.c -o /dev/null 2>&1 | grep -c \'^\\.\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '. /usr/include/stdio.h\n' +
          '.. /usr/include/x86_64-linux-gnu/bits/libc-header-start.h\n' +
          '... /usr/include/features.h\n' +
          '.... /usr/include/features-time64.h\n' +
          '..... /usr/include/x86_64-linux-gnu/bits/wordsize.h\n' +
          '..... /usr/include/x86_64-linux-gnu/bits/timesize.h\n' +
          '--- tong so header:\n' +
          '32' },

        { t: 'cal', kind: 'info', title: 'Số dấu chấm chính là độ sâu lồng nhau', x:
          '<p>Một chấm = header bạn tự viết <code>#include</code>. Năm chấm = header được kéo ' +
          'vào bởi header được kéo vào bởi… bốn tầng. Tổng cộng <b>32 file</b> cho một chương ' +
          'trình 11 dòng.</p>' +
          '<p>Chú ý <code>bits/wordsize.h</code> xuất hiện <b>sáu lần</b> trong danh sách — sáu ' +
          'header khác nhau cùng cần nó. Nhưng nội dung của nó chỉ vào file <code>.i</code> ' +
          '<b>một lần</b>, nhờ header guard. Không có guard, bạn sẽ có sáu bản sao và một ' +
          'tràng lỗi <code>redefinition</code>.</p>' +
          '<p>Đây chính là bằng chứng thực tế cho hình vẽ ở mục header guard: chuyện một header ' +
          'bị yêu cầu nhiều lần không phải trường hợp hiếm, nó là <b>mặc định</b>.</p>' }
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Bước 4 — Giai đoạn 2, 3 và 4: chạy tay từng bước một', blocks: [
        { t: 'p', x:
          'Bây giờ đi hết chặng đường còn lại, nhưng gọi <b>từng</b> giai đoạn một. Chú ý đầu ' +
          'vào của mỗi lệnh là đầu ra của lệnh trước.' },

        { t: 'code', where: 'wsl', code:
          'gcc -S hello.i -o hello.s     # giai doan 2: .i -> .s\n' +
          'gcc -c hello.s -o hello.o     # giai doan 3: .s -> .o\n' +
          'gcc    hello.o -o hello       # giai doan 4: .o -> file chay duoc\n' +
          './hello' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Hello Embedded Linux\n' +
          'SQUARE(7) = 49' },

        { t: 'p', x:
          'Bốn giai đoạn, bốn lệnh riêng, kết quả y hệt như gõ một lệnh <code>gcc</code> duy ' +
          'nhất. Giờ so kích thước qua từng chặng:' },

        { t: 'code', where: 'wsl', code:
          'for f in hello.c hello.i hello.s hello.o hello; do\n' +
          '  printf "%-10s %8s byte\\n" "$f" "$(stat -c%s "$f")"\n' +
          'done\n' +
          'wc -l hello.c hello.i hello.s' },

        { t: 'code', where: 'out', nocopy: true, code:
          'hello.c         193 byte\n' +
          'hello.i       21500 byte\n' +
          'hello.s         869 byte\n' +
          'hello.o        1632 byte\n' +
          'hello         15952 byte\n' +
          '   11 hello.c\n' +
          '  849 hello.i\n' +
          '   57 hello.s\n' +
          '  917 total' },

        { t: 'cal', kind: 'why', title: 'Đường cong kích thước kể trọn câu chuyện', x:
          '<p><b>193 → 21 500:</b> phình 111 lần. Tiền xử lý chép cả một thư viện header vào.</p>' +
          '<p><b>21 500 → 869:</b> co lại 25 lần. Vì <b>hầu hết nội dung header là khai báo, ' +
          'không sinh ra mã</b>. Trình biên dịch dùng chúng để kiểm tra kiểu rồi bỏ đi. Đây là ' +
          'điều quan trọng nhất trong bốn con số này.</p>' +
          '<p><b>869 → 1 632:</b> gần gấp đôi. File <code>.o</code> ngoài mã máy còn mang bảng ' +
          'ký hiệu, bảng relocation và thông tin section.</p>' +
          '<p><b>1 632 → 15 952:</b> gấp gần 10. Trình liên kết thêm mã khởi động ' +
          '(<code>_start</code>, thứ thật sự chạy trước <code>main</code>), bảng liên kết động, ' +
          'và tên của trình thông dịch động. Con số <b>15 952</b> này chính là con số bạn đã ' +
          'gặp ở <b>Bài 3</b> và <b>Bài 13</b> — giờ bạn biết nó gồm những gì.</p>' },

        { t: 'p', x:
          'Xem assembly do giai đoạn 2 sinh ra — 57 dòng, và bạn đọc được phần lớn:' },

        { t: 'code', where: 'wsl', code:
          'grep -A4 \'\\.LC0:\' hello.s\n' +
          'grep -E \'movl|call|globl\' hello.s' },

        { t: 'code', where: 'out', nocopy: true, code:
          '.LC0:\n' +
          '\t.string\t"Embedded Linux"\n' +
          '.LC1:\n' +
          '\t.string\t"Hello %s\\n"\n' +
          '.LC2:\n' +
          '\t.globl\tmain\n' +
          '\tmovl\t$0, %eax\n' +
          '\tcall\tprintf@PLT\n' +
          '\tmovl\t$49, %esi\n' +
          '\tmovl\t$0, %eax\n' +
          '\tcall\tprintf@PLT\n' +
          '\tmovl\t$0, %eax' },

        { t: 'cal', kind: 'info', title: 'movl $49 — bằng chứng trình biên dịch đã tính hộ bạn', x:
          '<p>Trong mã C bạn viết <code>SQUARE(7)</code>; trong file <code>.i</code> nó là ' +
          '<code>((7) * (7))</code>; trong assembly nó là hằng số <b>49</b>. Phép nhân đã ' +
          '<b>hoàn toàn biến mất</b> khỏi chương trình.</p>' +
          '<p>Kỹ thuật này gọi là <i>constant folding</i> — gấp hằng số. Nó chạy kể cả ở ' +
          '<code>-O0</code>. Ý nghĩa thực tế với nhúng rất lớn: bạn được phép viết ' +
          '<code>#define FREQ_HZ (16 * 1000 * 1000)</code> cho dễ đọc mà <b>không tốn một chu ' +
          'kỳ CPU nào</b> lúc chạy — phép nhân đã xong từ lúc build.</p>' },

        { t: 'p', x:
          'Cuối cùng, soi file <code>.o</code>: nó chứa gì và nó còn thiếu gì.' },

        { t: 'code', where: 'wsl', code:
          'file hello.o\n' +
          'nm hello.o\n' +
          'readelf -S hello.o | grep -E \'\\.text|\\.rodata|\\.symtab\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'hello.o: ELF 64-bit LSB relocatable, x86-64, version 1 (SYSV), not stripped\n' +
          '0000000000000000 T main\n' +
          '                 U printf\n' +
          '  [ 1] .text             PROGBITS         0000000000000000  00000040\n' +
          '  [ 5] .rodata           PROGBITS         0000000000000000  00000086\n' +
          '  [11] .symtab           SYMTAB           0000000000000000  00000130' },

        { t: 'cmdx', cmd: 'Ba dòng này nói gì về hello.o', title: 'Đọc một file .o',
          rows: [
            ['<code>relocatable</code>', '"Có thể dời chỗ" — <b>chưa phải chương trình chạy được</b>', 'Đối lập với <code>executable</code> mà bạn sẽ thấy ở file <code>hello</code>'],
            ['<code>T main</code>', 'File này <b>cung cấp</b> hàm <code>main</code>', 'Chữ hoa = toàn cục, xuất ra cho trình liên kết dùng'],
            ['<code>U printf</code>', 'File này <b>cần</b> <code>printf</code> mà không có', 'Cả chương trình mới chỉ đi được 3/4 chặng đường. Giai đoạn 4 sẽ nối nó với <code>libc</code>'],
            ['<code>Address 0000000000000000</code>', '<b>Mọi</b> section đều ở địa chỉ 0', 'Đúng nghĩa "relocatable": địa chỉ thật do trình liên kết quyết định, chưa phải bây giờ']
          ]},

        { t: 'cal', kind: 'tip', title: '-save-temps: một cờ thay cho ba lệnh', x:
          '<p>Thay vì gọi tay từng giai đoạn, <code>gcc -save-temps -o hello hello.c</code> ' +
          'chạy trọn bốn giai đoạn nhưng <b>giữ lại</b> mọi file trung gian. Thử ngay:</p>' +
          '<p><code>rm -f hello.i hello.s hello.o &amp;&amp; gcc -save-temps -o hello ' +
          'hello.c &amp;&amp; ls hello.*</code></p>' +
          '<p>Bạn sẽ thấy đủ <code>hello.i</code>, <code>hello.s</code>, <code>hello.o</code> ' +
          'với kích thước y hệt bảng trên. Đây là cờ đáng nhớ nhất bài này: khi một build lớn ' +
          'hỏng một cách khó hiểu, <code>-save-temps</code> cho bạn xem đúng thứ trình biên ' +
          'dịch đã thấy.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Bước 5 — Khai báo, định nghĩa và undefined reference', blocks: [
        { t: 'p', x:
          'Bước này dựng một dự án hai file — cấu trúc của <b>mọi</b> dự án C thật — rồi cố ' +
          'tình để thiếu một định nghĩa để xem trình liên kết phản ứng thế nào.' },

        { t: 'code', where: 'wsl', name: 'tạo dự án hai file', code:
          'mkdir -p link && cd link\n' +
          'cat > ops.h <<\'EOF\'\n' +
          '#ifndef OPS_H\n' +
          '#define OPS_H\n' +
          '\n' +
          'int add(int a, int b);   /* declaration -- no body yet */\n' +
          'int sub(int a, int b);   /* declaration -- INTENTIONALLY left undefined */\n' +
          '\n' +
          '#endif\n' +
          'EOF\n' +
          'cat > ops.c <<\'EOF\'\n' +
          '#include "ops.h"\n' +
          'int add(int a, int b) { return a + b; }\n' +
          'EOF\n' +
          'cat > main.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include "ops.h"\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("add(2,3) = %d\\n", add(2, 3));\n' +
          '    printf("sub(9,4)  = %d\\n", sub(9, 4));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF' },

        { t: 'p', x:
          'Trước hết chạy <b>ba giai đoạn đầu</b> trên từng file. Chú ý: <code>sub()</code> ' +
          'không tồn tại ở đâu cả, nhưng hãy đoán xem điều gì xảy ra.' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall -c ops.c && echo "ops.o OK"\n' +
          'gcc -Wall -c main.c && echo "main.o OK"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'ops.o OK\n' +
          'main.o OK' },

        { t: 'cal', kind: 'why', title: 'Cả hai thành công — kể cả file gọi một hàm không tồn tại', x:
          '<p>Đây là chỗ then chốt của cả bài. <code>main.c</code> gọi <code>sub()</code>, mà ' +
          '<code>sub()</code> chưa được viết ở bất kỳ đâu. Vậy mà biên dịch <b>thành công ' +
          'hoàn toàn</b>, không một cảnh báo, kể cả với <code>-Wall</code>.</p>' +
          '<p>Vì trình biên dịch chỉ nhìn <b>một file duy nhất</b>. Nó thấy khai báo trong ' +
          '<code>ops.h</code>, thế là đủ để biết cách gọi. Nó sinh lệnh gọi với địa chỉ để ' +
          'trống rồi ghi vào bảng ký hiệu rằng "tôi đang cần <code>sub</code>".</p>' +
          '<p><b>Đây chính là điều làm cho biên dịch riêng lẻ khả thi</b> — và cũng là điều ' +
          'làm cho <code>make</code> ở Bài 16 có tác dụng.</p>' },

        { t: 'code', where: 'wsl', code:
          'nm main.o\n' +
          'echo \'---\'\n' +
          'nm ops.o' },

        { t: 'code', where: 'out', nocopy: true, code:
          '                 U add\n' +
          '0000000000000000 T main\n' +
          '                 U printf\n' +
          '                 U sub\n' +
          '---\n' +
          '0000000000000000 T add' },

        { t: 'p', x:
          '<code>main.o</code> có <b>ba</b> chữ <code>U</code> và <b>một</b> chữ ' +
          '<code>T</code>; <code>ops.o</code> có một chữ <code>T</code>. Ghép lại: ' +
          '<code>add</code> có nhà cung cấp, <code>printf</code> sẽ tìm trong ' +
          '<code>libc</code>, còn <code>sub</code> thì không ai có. Chạy giai đoạn 4:' },

        { t: 'code', where: 'wsl', code: 'gcc -o program main.o ops.o' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/x86_64-linux-gnu-ld.bfd: main.o: in function `main\':\n' +
          'main.c:(.text+0x3a): undefined reference to `sub\'\n' +
          'collect2: error: ld returned 1 exit status' },

        { t: 'cal', kind: 'info', title: 'Đọc thông báo lỗi này cho kỹ — bạn sẽ gặp nó suốt đời', x:
          '<p><code>ld.bfd</code> ở đầu dòng: <b>trình liên kết</b> báo lỗi, không phải trình ' +
          'biên dịch. Chỉ riêng chi tiết này đã cho bạn biết lỗi ở <b>giai đoạn 4</b>.</p>' +
          '<p><code>main.o: in function \'main\'</code>: ai đang cần.<br>' +
          '<code>main.c:(.text+0x3a)</code>: cần ở byte thứ <code>0x3a</code> trong section ' +
          '<code>.text</code>.<br>' +
          '<code>undefined reference to \'sub\'</code>: cần cái gì.</p>' +
          '<p>Ba câu hỏi cần tự đặt khi gặp lỗi này: (1) tôi đã <b>viết</b> hàm đó chưa? ' +
          '(2) file <code>.o</code> chứa nó có nằm trong lệnh liên kết không? (3) nó có bị ' +
          '<code>static</code> che không? Ở đây là trường hợp (1).</p>' },

        { t: 'code', where: 'wsl', name: 'bổ sung định nghĩa còn thiếu', code:
          'cat >> ops.c <<\'EOF\'\n' +
          'int sub(int a, int b) { return a - b; }\n' +
          'EOF\n' +
          'gcc -Wall -c ops.c\n' +
          'nm ops.o\n' +
          'gcc -o program main.o ops.o && ./program' },

        { t: 'code', where: 'out', nocopy: true, code:
          '0000000000000000 T add\n' +
          '0000000000000018 T sub\n' +
          'add(2,3) = 5\n' +
          'sub(9,4)  = 5' },

        { t: 'p', x:
          'Chữ <code>U</code> đã tìm được chữ <code>T</code> tương ứng. Giờ thử lỗi ngược lại: ' +
          '<b>hai</b> nơi cùng định nghĩa một hàm.' },

        { t: 'code', where: 'wsl', code:
          'echo \'int add(int a, int b) { return a + b; }\' > dup.c\n' +
          'gcc -c dup.c\n' +
          'gcc -o conflict main.o ops.o dup.o' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/x86_64-linux-gnu-ld.bfd: dup.o: in function `add\':\n' +
          'dup.c:(.text+0x0): multiple definition of `add\'; ops.o:ops.c:(.text+0x0): first defined here\n' +
          'collect2: error: ld returned 1 exit status' },

        { t: 'cal', kind: 'why', title: 'Hai lỗi đối xứng, cùng một nguyên tắc', x:
          '<p><code>undefined reference</code> = <b>không</b> nhà cung cấp nào.<br>' +
          '<code>multiple definition</code> = <b>nhiều hơn một</b> nhà cung cấp.</p>' +
          '<p>Cả hai đều là hệ quả của <b>quy tắc một định nghĩa</b>: mỗi ký hiệu toàn cục ' +
          'được định nghĩa đúng một lần trong cả chương trình. Trình liên kết không có cách ' +
          'nào chọn giữa hai bản, nên nó từ chối.</p>' +
          '<p><b>Nguyên nhân số một trong thực tế:</b> đặt định nghĩa hàm hoặc biến vào file ' +
          '<code>.h</code> rồi include từ nhiều file <code>.c</code>. Header guard ' +
          '<b>không</b> cứu được — nó chỉ chặn include lặp trong <i>cùng một</i> file, còn đây ' +
          'là ba file khác nhau, mỗi file một bản sao.</p>' +
          '<p><b>Quy tắc để không bao giờ gặp lại:</b> header chỉ chứa <b>khai báo</b>. Định ' +
          'nghĩa luôn nằm trong <code>.c</code>. Ngoại lệ duy nhất là hàm ' +
          '<code>static inline</code> — vì <code>static</code> làm mỗi file có bản riêng, ' +
          'không đụng nhau.</p>' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Bước 6 — Header guard: chứng minh nó thật sự cần thiết', blocks: [
        { t: 'p', x:
          'Bước cuối, ngắn. Ta viết một header <b>không</b> có guard, include hai lần, và xem ' +
          'điều gì xảy ra.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/bai15\n' +
          'cat > util.h <<\'EOF\'\n' +
          'static inline int twice(int x) { return x * 2; }\n' +
          'EOF\n' +
          'cat > e1.c <<\'EOF\'\n' +
          '#include "util.h"\n' +
          '#include "util.h"\n' +
          'int main(void) { return twice(2); }\n' +
          'EOF\n' +
          'gcc -c e1.c -o /dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'In file included from e1.c:2:\n' +
          'util.h:1:19: error: redefinition of \u2018twice\u2019\n' +
          '    1 | static inline int twice(int x) { return x * 2; }\n' +
          '      |                   ^~~~~\n' +
          'In file included from e1.c:1:\n' +
          'util.h:1:19: note: previous definition of \u2018twice\u2019 with type \u2018int(int)\u2019' },

        { t: 'p', x:
          'Chú ý hai dòng <code>In file included from e1.c:2</code> và ' +
          '<code>e1.c:1</code> — trình biên dịch chỉ đích danh <b>hai đường include khác ' +
          'nhau</b> dẫn tới cùng một định nghĩa. Thêm guard vào rồi thử lại:' },

        { t: 'code', where: 'wsl', code:
          'cat > util.h <<\'EOF\'\n' +
          '#ifndef UTIL_H\n' +
          '#define UTIL_H\n' +
          '\n' +
          'static inline int twice(int x) { return x * 2; }\n' +
          '\n' +
          '#endif /* UTIL_H */\n' +
          'EOF\n' +
          'gcc -c e1.c -o /dev/null && echo "OK - compile succeeded"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'OK - compile succeeded' },

        { t: 'cal', kind: 'warn', title: 'Vì sao ví dụ này dùng hàm chứ không dùng struct', x:
          '<p>Nếu bạn thử với <code>struct diem { int x; int y; };</code> thay vì một hàm, ' +
          'GCC 15 sẽ <b>không</b> báo lỗi. Lý do: bản GCC này mặc định dùng chuẩn ' +
          '<b>C23</b> — kiểm tra bằng ' +
          '<code>gcc -dM -E - &lt; /dev/null | grep __STDC_VERSION__</code>, nó cho ' +
          '<code>202311L</code> — và C23 cho phép khai báo lại một <code>struct</code> y hệt ' +
          'trong cùng một đơn vị dịch.</p>' +
          '<p>Định nghĩa <b>hàm</b> thì không bao giờ được phép lặp, ở mọi phiên bản chuẩn. ' +
          'Vì thế ví dụ trên chắc chắn nổ, còn ví dụ với struct thì tuỳ chuẩn.</p>' +
          '<p><b>Đừng rút ra kết luận sai</b> rằng "C23 nên không cần guard nữa". Header thật ' +
          'chứa cả <code>typedef</code>, <code>enum</code>, hàm <code>static inline</code>, ' +
          'biến — và mã của bạn sẽ được biên dịch bằng những trình biên dịch khác, chuẩn khác. ' +
          '<b>Luôn đặt guard.</b> Nó tốn ba dòng và không bao giờ có hại.</p>' },

        { t: 'p', x: 'Dọn dẹp:' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai15' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       7. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Cột đầu là thông báo bạn thấy. Nhưng điều đáng học nhất ở bảng này là cột giữa: ' +
      '<b>mỗi thông báo tự tố cáo giai đoạn nào đã sinh ra nó</b>. Nhận ra giai đoạn là đã ' +
      'thu hẹp phạm vi tìm kiếm được ba phần tư.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>fatal error: xyz.h: No such file or directory</code>',
         '<b>Giai đoạn 1.</b> Bộ tiền xử lý không tìm thấy header trong các thư mục nó biết',
         'Header của bạn thì dùng <code>"xyz.h"</code> (nháy kép) chứ không phải <code>&lt;xyz.h&gt;</code>. Header của thư viện thì cài gói <code>-dev</code> hoặc thêm <code>-I/duong/dan</code>'],

        ['<code>error: redefinition of ‘f’</code><br><code>note: previous definition…</code>',
         '<b>Giai đoạn 2.</b> Một định nghĩa vào cùng file hai lần — gần như luôn do header thiếu guard',
         'Thêm <code>#ifndef/#define/#endif</code> vào header. Đọc hai dòng <code>In file included from…</code> để biết hai đường include nào đã dẫn tới nó'],

        ['<code>warning: implicit declaration of function ‘f’</code>',
         '<b>Giai đoạn 2.</b> Bạn gọi một hàm mà chưa có khai báo nào',
         'Thiếu <code>#include</code>. Đừng bỏ qua: sau đó bạn sẽ ăn tiếp một <code>undefined reference</code> ở giai đoạn 4. Luôn bật <code>-Wall</code>'],

        ['<code>undefined reference to ‘sub’</code><br><code>collect2: error: ld returned 1</code>',
         '<b>Giai đoạn 4.</b> Có chữ <code>U</code> mà không có chữ <code>T</code> nào khớp',
         'Kiểm tra ba việc: hàm đã được <b>viết</b> chưa; file <code>.o</code> chứa nó có <b>trong lệnh liên kết</b> không; nó có bị <code>static</code> che không. Dùng <code>nm *.o | grep tên_hàm</code>'],

        ['<code>undefined reference to ‘sqrt’</code> dù đã <code>#include &lt;math.h&gt;</code>',
         '<b>Giai đoạn 4.</b> Header cho <b>khai báo</b>, thư viện cho <b>định nghĩa</b> — bạn mới có cái thứ nhất',
         'Thêm <code>-lm</code> vào <b>cuối</b> lệnh. Đây là ví dụ rõ nhất cho ranh giới khai báo/định nghĩa. Bài 17 sẽ nói kỹ về <code>-l</code>'],

        ['<code>multiple definition of ‘add’; …first defined here</code>',
         '<b>Giai đoạn 4.</b> Hai file <code>.o</code> cùng cung cấp một ký hiệu',
         'Gần như luôn do đặt <b>định nghĩa</b> trong file <code>.h</code>. Chuyển thân hàm sang <code>.c</code>, chỉ để lại khai báo trong header'],

        ['Kết quả tính toán sai mà không có cảnh báo nào',
         '<b>Giai đoạn 1.</b> Macro thiếu ngoặc, hoặc tham số có tác dụng phụ bị tính hai lần',
         'Chạy <code>gcc -E file.c | tail -30</code> và đọc mã sau khi thay. Bọc ngoặc quanh <b>từng tham số và cả biểu thức</b>, hoặc đổi sang <code>static inline</code>'],

        ['<code>undefined reference to ‘main’</code>',
         '<b>Giai đoạn 4.</b> Bạn liên kết mà quên file chứa <code>main</code>, hoặc gõ nhầm <code>Main</code>/<code>int main()</code> thành thứ khác',
         'Ký hiệu <code>main</code> do mã khởi động <code>_start</code> gọi. Kiểm tra <code>nm *.o | grep \' T main\'</code>'],

        ['<code>gcc: fatal error: no input files</code>',
         'Bạn viết <code>-o</code> ngay trước tên file nguồn, nên <code>gcc</code> hiểu file đó là <b>đầu ra</b>',
         'Dạng đúng: <code>gcc -o tên_ra tên_vào.c</code>. Cẩn thận — nếu gõ ngược, <code>gcc</code> sẽ <b>ghi đè mã nguồn của bạn</b>'],

        ['File <code>.i</code> hoặc <code>.s</code> không xuất hiện sau <code>-save-temps</code>',
         'Tên file trung gian lấy theo tham số <code>-o</code>, không theo tên file nguồn',
         '<code>gcc -save-temps -o abc hello.c</code> sinh ra <code>abc.i</code>, <code>abc.s</code>. Muốn có <code>hello.i</code> thì dùng <code>-o hello</code>']
      ]},

    /* ══════════════════════════════════════════════
       8. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 15', items: [
      'Một lệnh <b>gcc</b> gọi ra bốn chương trình nối tiếp: <b>cc1</b> (tiền xử lý + biên dịch), <b>as</b> (hợp dịch), <b>collect2/ld</b> (liên kết). Xem tận mắt bằng <code>gcc -v</code>.',
      'Bốn cờ để dừng lại giữa chừng: <code>-E</code> sau giai đoạn 1, <code>-S</code> sau giai đoạn 2, <code>-c</code> sau giai đoạn 3, không cờ gì thì chạy hết cả bốn. <code>-save-temps</code> chạy hết nhưng <b>giữ lại</b> mọi file trung gian.',
      'Đường cong kích thước của <code>hello.c</code>: <b>193 → 21 500 → 869 → 1 632 → 15 952</b> byte. Phình <b>111 lần</b> ở giai đoạn 1 rồi co <b>25 lần</b> ở giai đoạn 2 — vì hầu hết nội dung header là <b>khai báo, không sinh mã</b>.',
      'Bộ tiền xử lý <b>chỉ thay văn bản</b>. Nó không biết C, không biết toán, không kiểm tra kiểu. Đó là nguồn gốc của cả ba cái bẫy macro: thiếu ngoặc quanh tham số (<b>11</b> thay vì 25), thiếu ngoặc quanh biểu thức (<b>21</b> thay vì 30), và tham số có tác dụng phụ bị tính <b>hai lần</b>.',
      '<b>Khai báo</b> nói "cái này tồn tại ở đâu đó" — đủ để giai đoạn 2 chạy xong. <b>Định nghĩa</b> mới tạo ra mã thật — cần đến ở giai đoạn 4. Chính khoảng cách này cho phép biên dịch từng file riêng lẻ, và là nền tảng của <code>make</code>.',
      '<code>nm</code> đọc bảng ký hiệu: <b>T</b> = file này <b>cung cấp</b>, <b>U</b> = file này <b>cần</b>. Trình liên kết chỉ làm một việc — ghép mọi <b>U</b> với đúng một <b>T</b>.',
      'Hai lỗi liên kết đối xứng nhau: <code>undefined reference</code> = <b>không</b> nhà cung cấp; <code>multiple definition</code> = <b>nhiều hơn một</b>. Cả hai đều là quy tắc một định nghĩa.',
      '<b>Header guard</b> chặn include lặp trong <i>cùng một</i> file — <code>bits/wordsize.h</code> được yêu cầu <b>6 lần</b> trong <code>hello.c</code> mà chỉ vào <code>.i</code> một lần. Guard <b>không</b> chống được lỗi <code>multiple definition</code> giữa các file khác nhau; chỉ có "header chỉ chứa khai báo" mới chống được.'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Ở bước 5 bạn đã gõ tay hai lệnh <code>gcc -c</code> rồi một lệnh liên kết. Với hai ' +
      'file thì còn chịu được. Nhưng kernel Linux có <b>hàng chục nghìn</b> file ' +
      '<code>.c</code> — và mỗi lần bạn sửa <b>một</b> dòng, bạn chỉ muốn biên dịch lại đúng ' +
      '<b>một</b> file đó.</p>' +
      '<p><b>Bài 16 — Make và Makefile</b> giải bài toán ấy. Bạn sẽ viết Makefile cho chính ' +
      'thư mục <code>link/</code> vừa làm, sửa một dòng trong <code>ops.c</code> và <b>đo</b> ' +
      'xem <code>make</code> chỉ biên dịch lại bao nhiêu file. Bạn cũng sẽ thấy vì sao ' +
      '<code>make</code> so <b>thời gian sửa file</b> chứ không so nội dung — và điều đó gây ' +
      'ra loại lỗi build khó chịu nào.</p>' }

  ],

  /* ══════════════════════════════════════════════
     9. QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'File <code>hello.c</code> có 11 dòng, sau <code>gcc -E</code> thành 849 dòng, nhưng file assembly <code>hello.s</code> chỉ có 57 dòng. Vì sao 849 dòng lại co lại còn 57?',
      opts: [
        'Trình biên dịch đã tối ưu và xoá bớt mã thừa',
        'Phần lớn 849 dòng đó là khai báo và dòng đánh dấu, không sinh ra mã máy nào',
        'Assembly cô đọng hơn C nên cần ít dòng hơn',
        'File .s chỉ chứa hàm main, các hàm khác nằm ở file .s riêng'
      ],
      a: 1,
      why: 'Header chủ yếu chứa <b>khai báo</b> (nguyên mẫu hàm, typedef, struct) và các dòng đánh dấu <code>#</code>. Trình biên dịch dùng khai báo để kiểm tra kiểu rồi bỏ đi — chỉ <b>định nghĩa</b> mới sinh ra mã. Đây chính là lý do khai báo và định nghĩa phải tách nhau, và cũng là lý do <code>#include</code> một header nặng không làm chương trình của bạn to lên.'
    },
    {
      q: '<code>gcc -Wall -c main.c</code> chạy thành công, không một cảnh báo, dù <code>main.c</code> gọi hàm <code>sub()</code> chưa được viết ở bất kỳ đâu. Vì sao đây là hành vi đúng?',
      opts: [
        'Vì -Wall không kiểm tra hàm, phải dùng -Wextra mới thấy',
        'Vì gcc giả định hàm nằm trong thư viện chuẩn',
        'Vì trình biên dịch chỉ nhìn một file; khai báo trong header đã đủ để sinh lệnh gọi, còn việc tìm thân hàm là việc của trình liên kết',
        'Vì -c bỏ qua mọi kiểm tra, phải liên kết mới kiểm tra được'
      ],
      a: 2,
      why: 'Trình biên dịch làm việc trên <b>một đơn vị dịch</b> tại một thời điểm. Khai báo <code>int sub(int, int);</code> cho nó biết đủ để sinh lệnh <code>call</code> với địa chỉ để trống, rồi ghi <code>U sub</code> vào bảng ký hiệu. Chỉ giai đoạn 4 mới nhìn thấy toàn bộ chương trình và phát hiện thiếu. Chính sự "thiển cận có chủ ý" này cho phép biên dịch riêng lẻ — nền tảng của mọi hệ thống build.'
    },
    {
      q: '<code>#define INCR(x) (x) + 1</code>. Kết quả của <code>10 * INCR(2)</code> là bao nhiêu và vì sao?',
      opts: [
        '30 — vì tham số đã được bọc ngoặc',
        '21 — vì sau khi thay văn bản, biểu thức là 10 * (2) + 1',
        '30 — vì bộ tiền xử lý tính giá trị trước rồi mới thay',
        'Lỗi biên dịch — macro thiếu ngoặc ngoài'
      ],
      a: 1,
      why: 'Bộ tiền xử lý <b>chỉ thay văn bản</b>, không có khái niệm ưu tiên phép toán. <code>INCR(2)</code> trở thành đúng chuỗi ký tự <code>(2) + 1</code>, nên cả biểu thức là <code>10 * (2) + 1</code> = <b>21</b>. Ngoặc quanh tham số không cứu được; phải có ngoặc quanh <b>cả thân macro</b>: <code>#define INCR(x) ((x) + 1)</code>. Và không có cảnh báo nào — mã hoàn toàn hợp lệ với trình biên dịch.'
    },
    {
      q: 'Bạn thấy: <code>/usr/bin/x86_64-linux-gnu-ld.bfd: main.o: undefined reference to ‘read_sensor’</code>. Nguyên nhân nào <b>không</b> thể là thủ phạm?',
      opts: [
        'Bạn quên đưa file sensor.o vào lệnh liên kết',
        'Hàm được định nghĩa là static nên chỉ nhìn thấy trong file của nó',
        'Bạn quên #include "sensor.h" trong main.c',
        'Hàm mới chỉ có khai báo trong header, chưa ai viết thân hàm'
      ],
      a: 2,
      why: 'Thiếu <code>#include</code> gây lỗi hoặc cảnh báo ở <b>giai đoạn 2</b> (<code>implicit declaration</code> — hoặc lỗi thẳng với chuẩn C mới), tức bạn sẽ không đi được tới giai đoạn 4 với thông báo này. Ba nguyên nhân còn lại đều đúng: chúng đều tạo ra một chữ <b>U</b> mà không có chữ <b>T</b> nào khớp. Hãy tập thói quen đọc tên chương trình báo lỗi — thấy <code>ld</code> là biết ngay lỗi thuộc giai đoạn 4.'
    },
    {
      q: 'Header <code>util.h</code> của bạn có header guard đầy đủ. Vậy mà khi liên kết bạn vẫn nhận <code>multiple definition of ‘init’</code>. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Guard bị viết sai tên macro nên không có tác dụng',
        'Header chứa định nghĩa hàm chứ không chỉ khai báo, và được include từ nhiều file .c khác nhau',
        'Bạn quên #endif ở cuối header',
        'Trình liên kết cần cờ -fno-common để gộp các định nghĩa trùng'
      ],
      a: 1,
      why: 'Header guard chỉ chặn include lặp <b>trong cùng một đơn vị dịch</b>. Nếu <code>a.c</code> và <code>b.c</code> cùng include header chứa <b>định nghĩa</b>, mỗi file được một bản sao hợp lệ — guard không hề biết tới file kia. Kết quả là hai chữ <b>T</b> cùng tên ở giai đoạn 4. Quy tắc: header chỉ chứa <b>khai báo</b>; ngoại lệ duy nhất là <code>static inline</code>, vì <code>static</code> giữ ký hiệu ở phạm vi từng file.'
    },
    {
      q: 'Trong <code>hello.c</code> bạn viết <code>SQUARE(7)</code>; file <code>.i</code> cho thấy <code>((7) * (7))</code>; nhưng assembly lại là <code>movl $49, %esi</code>. Phép nhân biến mất ở giai đoạn nào?',
      opts: [
        'Giai đoạn 1 — bộ tiền xử lý đã tính sẵn',
        'Giai đoạn 2 — trình biên dịch gấp hằng số',
        'Giai đoạn 3 — trình hợp dịch rút gọn lệnh',
        'Giai đoạn 4 — trình liên kết tối ưu lúc ghép mã'
      ],
      a: 1,
      why: 'Chuỗi ba bằng chứng chỉ thẳng vào giai đoạn 2: file <code>.i</code> (đầu ra giai đoạn 1) vẫn còn dấu <code>*</code>, còn file <code>.s</code> (đầu ra giai đoạn 2) đã là hằng <b>49</b>. Kỹ thuật này gọi là <i>constant folding</i> và chạy kể cả ở <code>-O0</code>. Với nhúng nó rất có giá trị: <code>#define FREQ_HZ (16 * 1000 * 1000)</code> viết cho dễ đọc mà không tốn chu kỳ CPU nào lúc chạy.'
    }
  ]
});
